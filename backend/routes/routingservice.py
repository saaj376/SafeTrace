# backend/routes/routingservice.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Tuple
import math
import traceback

# Import the core routing function from the services layer
from services.routingengine import get_safety_route

# --- 1. PYDANTIC MODELS (Data Validation) ---

# Define the structure for the request body coming from the frontend
class RouteRequest(BaseModel):
    """Schema for the route request body."""
    start_lat: float = Field(..., description="Starting latitude.")
    start_lon: float = Field(..., description="Starting longitude.")
    end_lat: float = Field(..., description="Ending latitude.")
    end_lon: float = Field(..., description="Ending longitude.")

# Define the structure for a single coordinate in the route response
class Coordinate(BaseModel):
    """Schema for a latitude/longitude pair."""
    lat: float
    lon: float

# Define the structure for the final response sent back to the frontend
class RouteResponse(BaseModel):
    """Schema for the final route data returned to the client."""
    route_coords: List[Coordinate] = Field(..., description="List of (lat, lon) pairs defining the path geometry.")
    distance_approx_km: float = Field(..., description="Approximate total route distance in km.")
    mode_used: str = Field(..., description="The routing mode used (e.g., 'safe', 'balanced').")
    # You can add more metrics here, like total risk score or estimated time

# --- 2. HELPER FUNCTIONS ---

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points on Earth (in km)"""
    # Convert decimal degrees to radians
    lat1_rad, lon1_rad, lat2_rad, lon2_rad = map(math.radians, [lat1, lon1, lat2, lon2])
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r

# --- 3. FASTAPI ROUTER SETUP ---

# This router will handle all endpoints prefixed with /route
router = APIRouter(
    prefix="/route",
    tags=["Routing"]
)

@router.get("/health")
async def routing_health():
    """
    Health check endpoint to verify routing service dependencies are loaded.
    """
    from services.riskscoreservice import get_graph
    
    graph = get_graph()
    
    # Get graph bounds
    bounds = None
    if graph and graph.number_of_nodes() > 0:
        nodes = list(graph.nodes(data=True))
        lats = [data['y'] for _, data in nodes]
        lons = [data['x'] for _, data in nodes]
        bounds = {
            "lat_min": min(lats),
            "lat_max": max(lats),
            "lon_min": min(lons),
            "lon_max": max(lons),
            "center_lat": (min(lats) + max(lats)) / 2,
            "center_lon": (min(lons) + max(lons)) / 2
        }
    
    return {
        "status": "healthy",
        "graph_loaded": graph is not None,
        "graph_nodes": graph.number_of_nodes() if graph else 0,
        "graph_edges": graph.number_of_edges() if graph else 0,
        "supported_modes": ['safe', 'balanced', 'stealth', 'escort'],
        "coverage_area": "Chennai, Tamil Nadu, India",
        "bounds": bounds
    }

@router.get("/check-coordinates")
async def check_coordinates(lat: float, lon: float):
    """
    Check if coordinates are within the map coverage area.
    """
    from services.riskscoreservice import get_graph
    
    graph = get_graph()
    if not graph or graph.number_of_nodes() == 0:
        raise HTTPException(status_code=503, detail="Graph not loaded")
    
    nodes = list(graph.nodes(data=True))
    lats = [data['y'] for _, data in nodes]
    lons = [data['x'] for _, data in nodes]
    lat_min, lat_max = min(lats), max(lats)
    lon_min, lon_max = min(lons), max(lons)
    
    tolerance = 0.01
    in_bounds = (lat_min - tolerance <= lat <= lat_max + tolerance and 
                 lon_min - tolerance <= lon <= lon_max + tolerance)
    
    return {
        "in_bounds": in_bounds,
        "coordinates": {"lat": lat, "lon": lon},
        "bounds": {
            "lat_min": lat_min,
            "lat_max": lat_max,
            "lon_min": lon_min,
            "lon_max": lon_max
        }
    }


@router.post("/{mode}", response_model=RouteResponse)
async def calculate_route(mode: str, request: RouteRequest):
    """
    Calculates the safest route between two points based on the specified mode 
    by calling the routing engine.
    
    Supported modes:
    - 'safe': Prioritizes safety, avoids high-risk areas even if longer
    - 'balanced': Balances safety and distance
    - 'stealth': Minimizes visibility (avoids busy areas)
    - 'escort': Similar to safe but optimized for group travel
    """
    
    valid_modes = ['safe', 'balanced', 'stealth', 'escort']
    if mode not in valid_modes:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid routing mode '{mode}'. Must be one of: {', '.join(valid_modes)}"
        )

    # Validate coordinates are within reasonable bounds
    if not (-90 <= request.start_lat <= 90 and -180 <= request.start_lon <= 180):
        raise HTTPException(
            status_code=400,
            detail="Invalid start coordinates. Latitude must be between -90 and 90, longitude between -180 and 180."
        )
    
    if not (-90 <= request.end_lat <= 90 and -180 <= request.end_lon <= 180):
        raise HTTPException(
            status_code=400,
            detail="Invalid end coordinates. Latitude must be between -90 and 90, longitude between -180 and 180."
        )

    # 1. Call the core routing logic from the engine
    print(f"[ROUTE API] Calculating {mode} route from ({request.start_lat}, {request.start_lon}) to ({request.end_lat}, {request.end_lon})")
    
    try:
        route_coords_list = get_safety_route(
            start_lat=request.start_lat,
            start_lon=request.start_lon,
            end_lat=request.end_lat,
            end_lon=request.end_lon,
            mode=mode
        )
    except Exception as e:
        print(f"[ROUTE API] Exception during route calculation: {str(e)}")
        print(f"[ROUTE API] Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during route calculation: {str(e)}"
        )

    if not route_coords_list:
        # This handles cases where snapping fails or no path is found
        print(f"[ROUTE API] Failed to calculate route - no path found or snapping failed")
        raise HTTPException(
            status_code=404, 
            detail="Could not calculate a route between the specified points. Please ensure both start and end locations are within Chennai, Tamil Nadu, India (approximate bounds: lat 12.85-13.23, lon 80.14-80.33). The coordinates you provided may be outside the available map data."
        )
    
    print(f"[ROUTE API] Successfully calculated route with {len(route_coords_list)} waypoints")

    # 2. Convert the list of Python tuples [(lat, lon), ...] into Pydantic models for the JSON response
    response_coords = [Coordinate(lat=lat, lon=lon) for lat, lon in route_coords_list]
    
    # 3. Calculate total distance using Haversine formula
    total_distance_km = 0.0
    for i in range(len(route_coords_list) - 1):
        lat1, lon1 = route_coords_list[i]
        lat2, lon2 = route_coords_list[i + 1]
        total_distance_km += haversine_distance(lat1, lon1, lat2, lon2)
    
    print(f"[ROUTE API] Calculated distance: {total_distance_km:.2f} km for {mode} mode")
    
    return RouteResponse(
        route_coords=response_coords,
        distance_approx_km=round(total_distance_km, 2), 
        mode_used=mode
    )