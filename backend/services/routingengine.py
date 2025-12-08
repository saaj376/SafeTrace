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
    
    # 2. Create a copy of the graph to modify weights without impacting the original
    G_weighted = G.copy()
    
    # 3. Dynamically Update Edge Weights (The core of Threat Fusion)
    print(f"Applying Threat Fusion Engine weights for mode: {mode}")
    for u, v, k, data in G_weighted.edges(keys=True, data=True):
        
        # Base weight is travel time
        base_time = data.get('travel_time', 60)
        
        # Call the engine to get the final cost for this road segment
        final_weight = calculate_final_edge_weight(
            u, base_time, mode, current_time
        )
        
        # Set the weight attribute that Dijkstra's algorithm will minimize
        data['safety_weight'] = final_weight

    # 4. Find the shortest path using the custom 'safety_weight'
    try:
        # NetworkX shortest_path function uses Dijkstra's algorithm by default
        route_nodes = nx.shortest_path(
            G_weighted, 
            source=start_node, 
            target=end_node, 
            weight='safety_weight'
        )
    except nx.NetworkXNoPath:
        print("Routing failed: No path found between the two snapped nodes.")
        return None
    except Exception as e:
        print(f"Routing failed due to NetworkX error: {e}")
        return None

    # 5. Convert node IDs back to coordinates
    route_coords = []
    for node_id in route_nodes:
        coords = get_node_coords(node_id)
        if coords:
            route_coords.append(coords) # coords is stored as (lat, lon)
    
    print(f"[ROUTING] Route calculated: {len(route_nodes)} nodes, {len(route_coords)} coordinates")
            
    return route_coords