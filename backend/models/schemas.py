# backend/models/schemas.py

from pydantic import BaseModel, Field
from typing import List, Tuple, Optional, Dict, Any

# =================================================================
# I. ROUTING SERVICE SCHEMAS (Used by routingservice.py)
# =================================================================

class RouteRequest(BaseModel):
    """Schema for the route calculation request (from frontend)."""
    start_lat: float = Field(..., description="Starting latitude.")
    start_lon: float = Field(..., description="Starting longitude.")
    end_lat: float = Field(..., description="Ending latitude.")
    end_lon: float = Field(..., description="Ending longitude.")

class Coordinate(BaseModel):
    """Schema for a single latitude/longitude pair in the response."""
    lat: float
    lon: float

class SegmentInfo(BaseModel):
    """Schema for segment information in a route."""
    segment_id: int
    score: float
    num_feedback: int

class RouteResponse(BaseModel):
    """Schema for the final route data returned to the frontend."""
    route_coords: List[Coordinate] = Field(..., description="List of (lat, lon) pairs defining the path geometry.")
    distance_approx_km: float = Field(..., description="Approximate total route distance in km.")
    mode_used: str = Field(..., description="The routing mode used (e.g., 'safe', 'balanced').")
    segments: Optional[List[SegmentInfo]] = Field(None, description="List of segments in the route with their IDs and scores.")
    # You could add 'total_risk_score' here if calculated


# =================================================================
# II. SOS SERVICE SCHEMAS (Used by sosservice.py)
# =================================================================

class SOSActivateRequest(BaseModel):
    """Schema for initiating a new SOS session."""
    user_id: str = Field(..., description="Unique ID of the user activating SOS.")
    current_lat: float = Field(..., description="Initial latitude of the user.")
    current_lon: float = Field(..., description="Initial longitude of the user.")

class LocationUpdateRequest(BaseModel):
    """Schema for the periodic real-time location ping."""
    token: str = Field(..., description="Unique session token for the active SOS.")
    lat: float = Field(..., description="Current latitude of the user.")
    lon: float = Field(..., description="Current longitude of the user.")
    is_stationary: Optional[bool] = Field(False, description="True if the user has stopped moving.")

class SOSDeactivateRequest(BaseModel):
    """Schema for ending an SOS session."""
    token: str = Field(..., description="Unique session token to end.")


# =================================================================
# III. FEEDBACK/REVIEW SCHEMAS
# =================================================================

class SegmentFeedback(BaseModel):
    """Schema for individual segment feedback."""
    segment_id: int
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 (worst) to 5 (best)")

class RouteFeedbackRequest(BaseModel):
    """Schema for route review/feedback submission."""
    overall_rating: int = Field(..., ge=1, le=5, description="Overall route rating from 1-5")
    segment_feedback: List[SegmentFeedback] = Field(default=[], description="List of segments with specific ratings")
    route_mode: str = Field(..., description="The mode used for this route")

class FeedbackResponse(BaseModel):
    """Response after submitting feedback."""
    success: bool
    message: str
    updated_segments: int


# Original remaining schemas...
# =================================================================
# III. SAFETY ALERT SCHEMAS (Used by safetyalertsservice.py)
# =================================================================

class MonitoringRequest(BaseModel):
    """Schema for the periodic safety monitoring check from the frontend."""
    user_id: str = Field(..., description="ID of the user being tracked.")
    current_lat: float = Field(..., description="User's current latitude.")
    current_lon: float = Field(..., description="User's current longitude.")
    # The frontend needs to send the planned route back for the deviation check
    planned_route_coords: List[Tuple[float, float]] = Field(..., description="Remaining planned route coordinates.")
    planned_route_nodes: List[int] = Field(..., description="Remaining planned route nodes (for hazard checking).")
    mode_used: str = Field(..., description="The current routing mode.")

class AlertResponse(BaseModel):
    """Schema for the alert data sent back to the client (or null)."""
    alert_type: Optional[str] = Field(None, description="e.g., 'HAZARD_AHEAD', 'DEVIATION_ALERT'.")
    message: Optional[str] = Field(None, description="User-friendly notification message.")
    action_required: bool = Field(False, description="True if the user should be prompted to reroute.")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional data (e.g., coordinates of the hazard).")