# backend/services/routingengine.py

import networkx as nx
import osmnx as ox
from typing import Optional, List, Tuple
from datetime import datetime

# Import necessary services
from .riskscoreservice import get_graph, get_node_coords
from .threatfusionengine import calculate_final_edge_weight 
# NOTE: The 'threatfusionengine' is what applies the ShadowRoute and precomputed risk logic.

# --- 1. COORDINATE SNAPPING ---

def snap_coordinates_to_node(lat: float, lon: float) -> Optional[int]:
    """
    Finds the closest road intersection (node) in the loaded graph 
    to the given latitude (y) and longitude (x).
    
    Returns: The OSM node ID, or None if the graph is not loaded or snapping fails.
    """
    G = get_graph()
    if G is None:
        print("ERROR: Graph not loaded. Cannot snap coordinates.")
        return None
        
    try:
        # osmnx.nearest_nodes efficiently finds the closest node ID.
        # It expects X (longitude) first, then Y (latitude).
        nearest_node = ox.nearest_nodes(G, X=lon, Y=lat)
        return nearest_node
    except Exception as e:
        print(f"Error snapping coordinates ({lat}, {lon}): {e}")
        return None

# --- 2. CORE ROUTING FUNCTION ---

def get_safety_route(
    start_lat: float, 
    start_lon: float, 
    end_lat: float, 
    end_lon: float, 
    mode: str
) -> Optional[List[Tuple[float, float]]]:
    """
    Calculates the safest route between two coordinates based on the chosen mode.
    Uses different weighting strategies per mode for varied routes.
    
    Returns: A list of (latitude, longitude) tuples representing the path geometry.
    """
    current_time = datetime.now()
    
    # 1. Snap coordinates
    start_node = snap_coordinates_to_node(start_lat, start_lon)
    end_node = snap_coordinates_to_node(end_lat, end_lon)
    
    if start_node is None or end_node is None:
        print("Routing failed: Start or end coordinates could not be snapped to the map.")
        return None

    G = get_graph()
    if G is None: return None
    
    # 2. Create weighted graph based on mode
    print(f"[ROUTING] Finding {mode} route with mode-specific weights...")
    G_weighted = G.copy()
    
    # Apply mode-specific weights to each edge
    for u, v, k, data in G_weighted.edges(keys=True, data=True):
        base_time = data.get('travel_time', 60)
        highway_type = data.get('highway', 'residential')
        
        if mode == 'safe':
            # Safe mode: Strongly prefer quiet residential roads, avoid main roads
            if highway_type in ['motorway', 'trunk']:
                weight = base_time * 10.0  # Avoid major highways
            elif highway_type in ['primary']:
                weight = base_time * 5.0
            elif highway_type in ['secondary']:
                weight = base_time * 2.0
            elif highway_type in ['tertiary', 'unclassified']:
                weight = base_time * 1.2
            else:
                # Residential and service roads - preferred
                weight = base_time * 0.7
                
        elif mode == 'balanced':
            # Balanced mode: Just use travel time (no penalty/bonus)
            weight = base_time
            
        elif mode == 'stealth':
            # Stealth mode: Extremely avoid busy roads, prefer tiny side streets
            if highway_type in ['motorway', 'trunk']:
                weight = base_time * 20.0  # Extremely avoid
            elif highway_type in ['primary']:
                weight = base_time * 10.0
            elif highway_type in ['secondary']:
                weight = base_time * 4.0
            elif highway_type in ['tertiary', 'unclassified']:
                weight = base_time * 1.5
            else:
                # Service roads and residential get big bonus
                weight = base_time * 0.5
                
        elif mode == 'escort':
            # Escort mode: Prefer main roads for safety in crowds and visibility
            if highway_type in ['motorway', 'trunk', 'primary']:
                # Prefer major roads
                weight = base_time * 0.5
            elif highway_type in ['secondary']:
                weight = base_time * 0.8
            elif highway_type in ['tertiary', 'unclassified']:
                weight = base_time * 1.5
            else:
                # Penalize small roads
                weight = base_time * 3.0
        else:
            weight = base_time
        
        # Ensure minimum weight
        data['weight'] = max(0.1, weight)
    
    # 3. Find the shortest path using mode-specific weights
    try:
        route_nodes = nx.shortest_path(
            G_weighted, 
            source=start_node, 
            target=end_node, 
            weight='weight'
        )
    except nx.NetworkXNoPath:
        print("Routing failed: No path found between the two snapped nodes.")
        return None
    except Exception as e:
        print(f"Routing failed due to NetworkX error: {e}")
        return None

    # 4. Convert node IDs back to coordinates
    route_coords = []
    for node_id in route_nodes:
        coords = get_node_coords(node_id)
        if coords:
            route_coords.append(coords) # coords is stored as (lat, lon)
    
    print(f"[ROUTING] Route calculated: {len(route_nodes)} nodes, {len(route_coords)} coordinates in {mode} mode")
            
    return route_coords