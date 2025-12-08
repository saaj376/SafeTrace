# backend/routes/routingservice.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Tuple

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

# --- 2. FASTAPI ROUTER SETUP ---

# This router will handle all endpoints prefixed with /route
router = APIRouter(
    prefix="/route",
    tags=["Routing"]
)

@router.post("/{mode}", response_model=RouteResponse)
async def calculate_route(mode: str, request: RouteRequest):
    """
    Calculates the safest route between two points based on the specified mode 
    by calling the routing engine.
    """
    
    valid_modes = ['safe', 'balanced', 'stealth', 'escort']
    if mode not in valid_modes:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid routing mode '{mode}'. Must be one of: {', '.join(valid_modes)}"
        )

    # 1. Call the core routing logic from the engine
    print(f"[ROUTE API] Calculating {mode} route from ({request.start_lat}, {request.start_lon}) to ({request.end_lat}, {request.end_lon})")
    
    route_coords_list = get_safety_route(
        start_lat=request.start_lat,
        start_lon=request.start_lon,
        end_lat=request.end_lat,
        end_lon=request.end_lon,
        mode=mode
    )

    if not route_coords_list:
        # This handles cases where snapping fails or no path is found
        print(f"[ROUTE API] Failed to calculate route - no path found or snapping failed")
        raise HTTPException(
            status_code=404, 
            detail="Could not calculate a route between the specified points. Please ensure coordinates are within the map area."
        )
    
    print(f"[ROUTE API] Successfully calculated route with {len(route_coords_list)} waypoints")

    # 2. Convert the list of Python tuples [(lat, lon), ...] into Pydantic models for the JSON response
    response_coords = [Coordinate(lat=lat, lon=lon) for lat, lon in route_coords_list]
    
    # 3. Calculate accurate distance using Haversine formula
    import math
    
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
    
    # Calculate total distance by summing distances between consecutive points
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