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


def load_risk_and_graph_data():
    """
    Loads the precomputed risk data CSV and the NetworkX graph into global memory.
    This function must be called once during the FastAPI startup event.
    """
    global RISK_DATA, G, NODE_TO_COORDS
    
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
            G = nx.read_gpickle(SAFE_GRAPH_PATH)
        except AttributeError:
            # For newer networkx versions, use the pickle module directly
            import pickle
            with open(SAFE_GRAPH_PATH, 'rb') as f:
                G = pickle.load(f)
        
        print(f"Loaded Safe Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges.")
        
        # 3. Create the Node ID -> Coordinates Map for quick reference
        for node, data in G.nodes(data=True):
            # OSMnx uses 'y' for latitude and 'x' for longitude
            NODE_TO_COORDS[node] = (data['y'], data['x'])
            
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
    """Returns the (lat, lon) coordinates for a given node ID."""
    return NODE_TO_COORDS.get(node_id)