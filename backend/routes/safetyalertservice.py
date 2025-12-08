# backend/routes/safetyalertsservice.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Tuple, Optional, Dict, Any

# Import the core logic from the services layer
from services.proactivemonitoringservice import check_for_hazard_ahead, check_for_deviation_alert
from services.routingengine import get_safety_route # To potentially recalculate the route

# --- 1. PYDANTIC MODELS (Data Validation) ---

# Define the structure for the request body from the frontend monitoring loop
class MonitoringRequest(BaseModel):
    """Schema for the periodic monitoring request."""
    user_id: str = Field(..., description="ID of the user being tracked.")
    current_lat: float = Field(..., description="User's current latitude.")
    current_lon: float = Field(..., description="User's current longitude.")
    planned_route_coords: List[Tuple[float, float]] = Field(..., description="Remaining planned route coordinates.")
    planned_route_nodes: List[int] = Field(..., description="Remaining planned route nodes (used for hazard checking).")
    mode_used: str = Field(..., description="The current routing mode ('safe', 'stealth', etc.).")

# Define the structure for an alert response (can be null if no alert)
class AlertResponse(BaseModel):
    """Schema for the alert data sent back to the client."""
    alert_type: Optional[str] = Field(None, description="e.g., 'HAZARD_AHEAD', 'DEVIATION_ALERT'.")
    message: Optional[str] = Field(None, description="User-friendly notification message.")
    action_required: bool = Field(False, description="True if the user should be prompted to reroute.")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional data (e.g., coordinates of the hazard).")

class RouteRequest(BaseModel):
    """Schema for reroute requests."""
    current_lat: float = Field(..., description="User's current latitude.")
    current_lon: float = Field(..., description="User's current longitude.")
    planned_route_coords: List[Tuple[float, float]] = Field(..., description="Original planned route coordinates.")
    mode_used: str = Field(..., description="The current routing mode ('safe', 'stealth', etc.).")

# --- 2. FASTAPI ROUTER SETUP ---

# This router handles endpoints prefixed with /alerts
router = APIRouter(
    prefix="/alerts",
    tags=["Safety Alerts"]
)

@router.post("/check-status", response_model=AlertResponse)
async def check_user_safety_status(request: MonitoringRequest):
    """
    Receives current user state and checks for immediate hazards or route deviations.
    """
    
    # 1. Check for immediate hazard ahead on the planned route
    hazard_alert = check_for_hazard_ahead(
        current_lat=request.current_lat,
        current_lon=request.current_lon,
        planned_route_nodes=request.planned_route_nodes,
        mode=request.mode_used
    )
    
    if hazard_alert:
        # A hazard is always a high-priority alert
        return AlertResponse(
            alert_type=hazard_alert["alert_type"],
            message=hazard_alert["message"],
            action_required=True,
            details=hazard_alert
        )

    # 2. Check for route deviation
    deviation_alert = check_for_deviation_alert(
        current_lat=request.current_lat,
        current_lon=request.current_lon,
        planned_route_coords=request.planned_route_coords
    )

    if deviation_alert:
        # Deviation alert requires action (re-calculation prompt)
        return AlertResponse(
            alert_type=deviation_alert["alert_type"],
            message=deviation_alert["message"],
            action_required=True,
            details=deviation_alert
        )
        
    # 3. If no issues, return a null/safe response
    return AlertResponse(
        alert_type=None,
        message="Route is safe and on track.",
        action_required=False
    )


@router.post("/reroute", response_model=Dict[str, Any])
async def trigger_reroute(request: RouteRequest):
    """
    A separate endpoint to trigger a route recalculation if the user accepts the alert.
    Uses the routing service logic.
    """
    try:
        # NOTE: This endpoint assumes the frontend sends the *new* destination coords if needed, 
        # but here we'll simulate a call back to the main routing engine.
        new_route_coords = get_safety_route(
            start_lat=request.current_lat,
            start_lon=request.current_lon,
            end_lat=request.planned_route_coords[-1][0], # Use the original destination
            end_lon=request.planned_route_coords[-1][1],
            mode=request.mode_used
        )
        
        if not new_route_coords:
             raise HTTPException(status_code=404, detail="Could not find a new safe path.")
        
        # Format the route coordinates for the response
        formatted_coords = [{"lat": lat, "lon": lon} for lat, lon in new_route_coords]
        
        return {
            "status": "success",
            "message": "New safe route calculated.",
            "new_route_coords": formatted_coords
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Reroute failed: {e}")