# backend/services/proactivemonitoringservice.py

import networkx as nx
import numpy as np
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime
import osmnx as ox
from math import radians, cos, sin, asin, sqrt

# Import necessary services
from config import MODE_RISK_MULTIPLIERS
from .riskscoreservice import get_graph, get_precomputed_risk_score
from .threatfusionengine import calculate_final_edge_weight
from .routingengine import snap_coordinates_to_node # Need the snapping function here too

# --- CONFIGURATION ---
# How far ahead (in nodes/steps) to check for sudden risk spikes
HAZARD_CHECK_AHEAD_STEPS = 5 
# Maximum deviation distance (in meters) allowed before triggering an alert
MAX_DEVIATION_METERS = 50 
# Default risk score threshold for triggering a 'spike' alert (e.g., above 7.0)
RISK_SPIKE_THRESHOLD = 7.0 


# --- UTILITY FUNCTIONS ---

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in meters between two points 
    on the earth (specified in decimal degrees).
    """
    # Convert decimal degrees to radians
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    return c * r


# --- CORE MONITORING FUNCTIONS ---

def get_node_coords(node_id: int) -> Optional[Tuple[float, float]]:
    """
    Get the latitude and longitude coordinates for a given node ID.
    Returns (lat, lon) or None if the node doesn't exist.
    """
    G = get_graph()
    if G is None or node_id not in G.nodes:
        return None
    
    node_data = G.nodes[node_id]
    return (node_data.get('y'), node_data.get('x'))


def get_current_planned_route(start_lat: float, start_lon: float, mode: str) -> Optional[List[int]]:
    """
    Simulates getting the remaining planned route. In a real application, 
    this would be passed from the frontend or stored in a session.
    For now, we re-run the routing engine to get the full node path.
    """
    # NOTE: This function needs the full planned route nodes from the engine.
    # Since the full engine function returns coordinates, we would ideally need a function
    # that returns the list of node IDs (route_nodes) as well.
    
    # For simplicity, we just snap the current location and assume the route is known
    # (This function should be modified when integrating full session tracking)
    current_node = snap_coordinates_to_node(start_lat, start_lon)
    
    # Returning a list of mock node IDs ahead of the current node
    if current_node:
        return [current_node + i for i in range(1, HAZARD_CHECK_AHEAD_STEPS + 5)]
    return None


def check_for_hazard_ahead(
    current_lat: float, 
    current_lon: float, 
    planned_route_nodes: List[int],
    mode: str
) -> Optional[Dict[str, Any]]:
    """
    Checks the next few steps of the planned route for a sudden spike in real-time risk.
    """
    G = get_graph()
    if G is None or not planned_route_nodes:
        return None
        
    current_time = datetime.now()
    
    # Check the next N nodes
    nodes_to_check = planned_route_nodes[:HAZARD_CHECK_AHEAD_STEPS]

    for node_id in nodes_to_check:
        
        # We need the risk for the *edge* leading into this node. 
        # Since the graph is MultiDiGraph, checking the outgoing edges from the node
        # is a good proxy for the risk of the surrounding segments.
        
        # Get the node coordinates to check against (y=lat, x=lon)
        node_coords = get_node_coords(node_id) 
        if not node_coords: continue

        # Check the *maximum potential risk* if the user were to step onto a new segment
        max_risk_for_node = 0.0
        
        # Iterate over all outgoing edges from the node_id
        for u, v, k, data in G.out_edges(node_id, keys=True, data=True):
            base_time = data.get('travel_time', 60)
            
            # Calculate the full dynamic weight (which includes the risk score)
            final_weight = calculate_final_edge_weight(
                node_id, base_time, mode, current_time
            )
            # Since the final_weight is scaled, we estimate the risk component back
            # The 'risk_cost' in the Threat Fusion is proportional to the final_weight
            
            # Simple check: just use the precomputed score for simplicity
            precomputed_risk = get_precomputed_risk_score(node_id, current_time)
            max_risk_for_node = max(max_risk_for_node, precomputed_risk)


        if max_risk_for_node >= RISK_SPIKE_THRESHOLD:
            # Hazard detected!
            return {
                "alert_type": "HAZARD_AHEAD",
                "message": f"High-risk zone detected ahead near coordinates ({node_coords[0]:.4f}, {node_coords[1]:.4f}). Score: {max_risk_for_node:.1f}",
                "location_lat": node_coords[0],
                "location_lon": node_coords[1],
            }

    return None # No immediate hazards found


def check_for_deviation_alert(
    current_lat: float, 
    current_lon: float, 
    planned_route_coords: List[Tuple[float, float]]
) -> Optional[Dict[str, Any]]:
    """
    Checks if the current location is too far from any point on the planned route.
    Uses Haversine distance for calculation.
    """
    if not planned_route_coords:
        return None

    # The deviation check is primarily a frontend concern, but the backend can verify
    # Use osmnx distance calculation for accuracy, but Haversine is simpler for checking max distance.
    
    min_distance_meters = float('inf')
    current_point = (current_lat, current_lon)
    
    # We must iterate over all points in the planned route and find the minimum distance
    for route_lat, route_lon in planned_route_coords:
        # Calculate Haversine distance in meters
        distance = haversine_distance(
            current_lat, current_lon, route_lat, route_lon
        )
        min_distance_meters = min(min_distance_meters, distance)
        
        # Optimization: if a close point is found, we don't need to check further
        if min_distance_meters < MAX_DEVIATION_METERS:
            break
            
    if min_distance_meters > MAX_DEVIATION_METERS:
        # Deviation detected
        return {
            "alert_type": "DEVIATION_ALERT",
            "message": f"Warning: You have deviated {min_distance_meters:.0f}m from the planned route. Check your path.",
            "deviation_meters": min_distance_meters,
        }

    return None # No deviation detected