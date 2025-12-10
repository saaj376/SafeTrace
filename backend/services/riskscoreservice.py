# backend/services/riskscoreservice.py

import pandas as pd
import networkx as nx
import os
from typing import Optional, Dict, Any, Tuple
from datetime import datetime

# Import configuration paths
# NOTE: The '..' navigates up one directory (to /backend) and then into /data
try:
    from ..config import HOURLY_RISK_PATH, SAFE_GRAPH_PATH
except ImportError:
    # Fallback paths for local testing if run outside the FastAPI context
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    HOURLY_RISK_PATH = os.path.join(BASE_DIR, '..', 'data', 'hourly_risk_data.csv')
    SAFE_GRAPH_PATH = os.path.join(BASE_DIR, '..', 'data', 'safe_graph.gpickle')


# Global variables to store the loaded data in memory
RISK_DATA: Optional[pd.DataFrame] = None
G: Optional[nx.MultiDiGraph] = None
# Map to quickly get coordinates for any node (intersection)
NODE_TO_COORDS: Dict[int, Any] = {}
# Segment ID counter and mapping
SEGMENT_ID_COUNTER = 0
EDGE_TO_SEGMENT_ID: Dict[Tuple[int, int, int], int] = {}
SEGMENT_SCORES: Dict[int, Dict[str, Any]] = {}


def load_risk_and_graph_data():
    """
    Loads the precomputed risk data CSV and the NetworkX graph into global memory.
    This function must be called once during the FastAPI startup event.
    """
    global RISK_DATA, G, NODE_TO_COORDS, SEGMENT_ID_COUNTER, EDGE_TO_SEGMENT_ID, SEGMENT_SCORES
    
    print("--- Loading Precomputed Data ---")
    
    # 1. Load Hourly Risk Data (CSV)
    try:
        RISK_DATA = pd.read_csv(HOURLY_RISK_PATH)
        print(f"Loaded risk data: {len(RISK_DATA)} records.")
    except FileNotFoundError:
        print(f"ERROR: Hourly risk data not found at {HOURLY_RISK_PATH}. Risk calculation will use defaults.")
        RISK_DATA = None
        
    # 2. Load the Safe Graph (Gpickle)
    try:
        # We assume the graph was saved successfully by generate_safe_graph.py
        # Handle both old and new networkx API
        try:
            graph_obj = nx.read_gpickle(SAFE_GRAPH_PATH)
        except AttributeError:
            # For newer networkx versions, use the pickle module directly
            import pickle
            with open(SAFE_GRAPH_PATH, 'rb') as f:
                graph_obj = pickle.load(f)
        
        print(f"Loaded Safe Graph: {graph_obj.number_of_nodes()} nodes, {graph_obj.number_of_edges()} edges.")
        
        # 3. Create the Node ID -> Coordinates Map for quick reference
        for node, data in graph_obj.nodes(data=True):
            # OSMnx uses 'y' for latitude and 'x' for longitude
            NODE_TO_COORDS[node] = (data['y'], data['x'])
        
        # 4. Assign segment IDs to each edge
        SEGMENT_ID_COUNTER = 0
        for u, v, k in graph_obj.edges(keys=True):
            SEGMENT_ID_COUNTER += 1
            EDGE_TO_SEGMENT_ID[(u, v, k)] = SEGMENT_ID_COUNTER
            # Initialize segment score (default 0.5 = neutral)
            SEGMENT_SCORES[SEGMENT_ID_COUNTER] = {
                'segment_id': SEGMENT_ID_COUNTER,
                'score': 0.5,
                'confidence': 0.1,
                'num_feedback': 0,
                'u': u,
                'v': v,
                'k': k
            }
            # Add segment_id to edge data
            graph_obj[u][v][k]['segment_id'] = SEGMENT_ID_COUNTER
        
        print(f"Assigned {SEGMENT_ID_COUNTER} unique segment IDs to edges.")
        
        # 5. Assign to global variable
        G = graph_obj
            
    except Exception as e:
        print(f"ERROR: Graph file could not be loaded: {e}")
        G = None


def get_precomputed_risk_score(node_id: int, current_time: datetime) -> float:
    """
    Retrieves the precomputed risk score (0.0 to 10.0) for a road intersection (node)
    at the given hour of the day.
    """
    if RISK_DATA is None:
        # If data failed to load, return a default elevated risk (to be safe)
        return 2.0 

    # Extract the current hour (0-23)
    current_hour = current_time.hour
    
    # Efficiently query the DataFrame using boolean indexing (Pandas)
    match = RISK_DATA[
        (RISK_DATA['node_id'] == node_id) & 
        (RISK_DATA['hour'] == current_hour)
    ]

    if not match.empty:
        # Return the first matching risk score
        return match['precomputed_risk'].iloc[0]
    else:
        # Fallback for nodes/hours not covered in the precomputed data
        return 1.0 


def get_graph() -> Optional[nx.MultiDiGraph]:
    """Returns the loaded NetworkX graph object."""
    return G

def get_node_coords(node_id: int) -> Optional[Tuple[float, float]]:
    """Returns (lat, lon) tuple for a given node ID."""
    return NODE_TO_COORDS.get(node_id)


def get_segment_id(u: int, v: int, k: int = 0) -> Optional[int]:
    """Returns the segment ID for a given edge."""
    return EDGE_TO_SEGMENT_ID.get((u, v, k))


def get_segment_score(segment_id: int) -> Dict[str, Any]:
    """Returns the score data for a given segment ID."""
    return SEGMENT_SCORES.get(segment_id, {
        'segment_id': segment_id,
        'score': 0.5,
        'confidence': 0.1,
        'num_feedback': 0
    })


def update_segment_score(segment_id: int, new_rating: float, tags: list = None):
    """
    Updates the segment score based on new feedback.
    new_rating: 1-5 rating from user
    tags: Optional list of tags affecting the score
    """
    if segment_id not in SEGMENT_SCORES:
        return
    
    segment = SEGMENT_SCORES[segment_id]
    
    # Convert rating (1-5) to score (0-1)
    # 5 stars = 1.0 (safest), 1 star = 0.0 (least safe)
    normalized_rating = (new_rating - 1) / 4
    
    # Update using weighted average with existing score
    current_score = segment['score']
    current_feedback = segment['num_feedback']
    
    # Weighted average: give more weight to new feedback initially
    weight_factor = min(current_feedback + 1, 10)  # Cap at 10
    new_score = (current_score * current_feedback + normalized_rating) / (current_feedback + 1)
    
    segment['score'] = new_score
    segment['num_feedback'] += 1
    segment['confidence'] = min(0.1 + (segment['num_feedback'] * 0.05), 0.9)
    
    # Update graph edge data
    if G and 'u' in segment and 'v' in segment and 'k' in segment:
        u, v, k = segment['u'], segment['v'], segment['k']
        if G.has_edge(u, v, k):
            G[u][v][k]['safety_score'] = new_score
    
    print(f"Updated segment {segment_id}: score={new_score:.3f}, feedback_count={segment['num_feedback']}")


def get_node_coords(node_id: int) -> Optional[Tuple[float, float]]:
    """Returns the (lat, lon) coordinates for a given node ID."""
    return NODE_TO_COORDS.get(node_id)