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
    
    # Check if coordinates are within the graph bounds
    nodes = list(G.nodes(data=True))
    if not nodes:
        print("ERROR: Graph has no nodes")
        return None
    
    lats = [data['y'] for _, data in nodes]
    lons = [data['x'] for _, data in nodes]
    lat_min, lat_max = min(lats), max(lats)
    lon_min, lon_max = min(lons), max(lons)
    
    print(f"[SNAP] Snapping ({lat}, {lon}) to graph bounds: lat [{lat_min:.4f}, {lat_max:.4f}], lon [{lon_min:.4f}, {lon_max:.4f}]")
    
    # Auto-adjust coordinates that are slightly outside bounds
    adjusted = False
    original_lat, original_lon = lat, lon
    
    if lat < lat_min:
        lat = lat_min
        adjusted = True
    elif lat > lat_max:
        lat = lat_max
        adjusted = True
        
    if lon < lon_min:
        lon = lon_min
        adjusted = True
    elif lon > lon_max:
        lon = lon_max
        adjusted = True
    
    if adjusted:
        print(f"[SNAP] Adjusted coordinates from ({original_lat}, {original_lon}) to ({lat}, {lon}) to fit within map bounds")
        
    try:
        # osmnx.nearest_nodes efficiently finds the closest node ID.
        # It expects X (longitude) first, then Y (latitude).
        nearest_node = ox.nearest_nodes(G, X=lon, Y=lat)
        print(f"[SNAP] Successfully snapped ({lat}, {lon}) to node {nearest_node}")
        return nearest_node
    except Exception as e:
        print(f"[SNAP] Error snapping coordinates ({lat}, {lon}): {e}")
        import traceback
        print(f"[SNAP] Traceback: {traceback.format_exc()}")
        return None

# --- 2. CORE ROUTING FUNCTION ---

def get_safety_route(
    start_lat: float, 
    start_lon: float, 
    end_lat: float, 
    end_lon: float, 
    mode: str
) -> Optional[Tuple[List[Tuple[float, float]], List[int]]]:
    """
    Calculates the safest route between two coordinates based on the chosen mode.
    Uses different weighting strategies per mode for varied routes.
    
    Returns: A tuple of (route_coords, segment_ids) where:
        - route_coords: List of (latitude, longitude) tuples representing the path geometry
        - segment_ids: List of segment IDs used in this route
    """
    current_time = datetime.now()
    
    # 1. Snap coordinates
    print(f"[ROUTING] Attempting to snap start coordinates: ({start_lat}, {start_lon})")
    start_node = snap_coordinates_to_node(start_lat, start_lon)
    
    print(f"[ROUTING] Attempting to snap end coordinates: ({end_lat}, {end_lon})")
    end_node = snap_coordinates_to_node(end_lat, end_lon)
    
    if start_node is None:
        print(f"[ROUTING] ERROR: Start coordinates ({start_lat}, {start_lon}) could not be snapped to the Chennai road network.")
        return None
    
    if end_node is None:
        print(f"[ROUTING] ERROR: End coordinates ({end_lat}, {end_lon}) could not be snapped to the Chennai road network.")
        return None
    
    print(f"[ROUTING] Successfully snapped: start_node={start_node}, end_node={end_node}")

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

    # 4. Convert node IDs back to coordinates and collect segment IDs
    from .riskscoreservice import get_segment_id
    
    route_coords = []
    segment_ids = []
    
    for node_id in route_nodes:
        coords = get_node_coords(node_id)
        if coords:
            route_coords.append(coords) # coords is stored as (lat, lon)
    
    # Get segment IDs for each edge in the route
    for i in range(len(route_nodes) - 1):
        u = route_nodes[i]
        v = route_nodes[i + 1]
        
        # Find the edge key (k) that exists
        if G.has_edge(u, v):
            # Get the first edge key (usually 0)
            k = list(G[u][v].keys())[0]
            seg_id = get_segment_id(u, v, k)
            if seg_id:
                segment_ids.append(seg_id)
    
    print(f"[ROUTING] Route calculated: {len(route_nodes)} nodes, {len(route_coords)} coordinates, {len(segment_ids)} segments in {mode} mode")
            
    return (route_coords, segment_ids)