# backend/routes/sosservice.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional

# Import the core database interaction functions
from services.supabaseservice import (
    create_sos_session, 
    update_live_location, 
    get_live_location, 
    deactivate_sos_session
)

# --- 1. PYDANTIC MODELS (Data Validation) ---

# Schema for activating the SOS session
class SOSActivateRequest(BaseModel):
    user_id: str = Field(..., description="Unique ID of the user activating SOS.")
    current_lat: float = Field(..., description="Initial latitude of the user.")
    current_lon: float = Field(..., description="Initial longitude of the user.")
    # Add fields for Guardian contact details (email/phone) if you plan to use them.

# Schema for the periodic location updates from the frontend (user being tracked)
class LocationUpdateRequest(BaseModel):
    token: str = Field(..., description="Unique session token for the active SOS.")
    lat: float = Field(..., description="Current latitude of the user.")
    lon: float = Field(..., description="Current longitude of the user.")
    is_stationary: Optional[bool] = Field(False, description="True if the user has stopped moving.")

# Schema for deactivating the session
class SOSDeactivateRequest(BaseModel):
    token: str = Field(..., description="Unique session token to end.")

# --- 2. FASTAPI ROUTER SETUP ---

router = APIRouter(
    prefix="/sos",
    tags=["Emergency SOS"]
)

@router.post("/activate", response_model=Dict[str, str])
async def activate_sos(request: SOSActivateRequest):
    """
    Initiates a new SOS session in the database and returns the unique token 
    that should be shared with guardians.
    """
    current_location = {"lat": request.current_lat, "lon": request.current_lon}
    
    token = await create_sos_session(request.user_id, current_location)
    
    if not token:
        raise HTTPException(status_code=500, detail="Failed to create SOS session in database.")
    
    # Return the token and the unique Guardian Dashboard URL
    return {
        "status": "active",
        "token": token,
        "guardian_url": f"/guardian/{token}" # Frontend React Router path
    }


@router.post("/location-update")
async def update_location(request: LocationUpdateRequest):
    """
    Receives the periodic real-time location ping from the user's device (frontend).
    """
    success = await update_live_location(
        token=request.token, 
        lat=request.lat, 
        lon=request.lon, 
        is_stationary=request.is_stationary
    )
    
    if not success:
        # This typically means the token is invalid or the session is inactive
        raise HTTPException(status_code=404, detail="Active SOS session not found for this token.")

    return {"status": "ok", "message": "Location updated."}


@router.get("/status/{token}")
async def get_guardian_status(token: str):
    """
    Endpoint for the Guardian Dashboard to fetch the user's latest location 
    and session status (long-polling or WebSocket replacement).
    """
    location_data = await get_live_location(token)
    
    if not location_data:
        # This covers cases where the token is invalid or the session is deactivated
        raise HTTPException(status_code=404, detail="User not tracked or session expired.")
    
    return {
        "status": "live",
        "timestamp": location_data.get("last_ping"),
        "location": {
            "lat": location_data.get("latest_lat"),
            "lon": location_data.get("latest_lon")
        },
        "is_stationary": location_data.get("is_stationary", False)
    }


@router.post("/deactivate")
async def deactivate_sos(request: SOSDeactivateRequest):
    """
    Called by the user's device when the emergency situation is over.
    """
    success = await deactivate_sos_session(request.token)
    
    if not success:
        # Should only fail if the token was already inactive or incorrect
        raise HTTPException(status_code=404, detail="SOS session not found or already deactivated.")

    return {"status": "inactive", "message": "SOS session successfully closed."}