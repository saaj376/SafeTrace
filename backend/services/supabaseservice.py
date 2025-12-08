# backend/services/supabaseservice.py

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import os

# Lazy import to avoid dependency conflicts at startup
supabase = None
create_client = None
Client = None

def _import_supabase():
    global supabase, create_client, Client
    if supabase is None:
        try:
            from supabase import create_client as _create_client, Client as _Client
            create_client = _create_client
            Client = _Client
        except ImportError as e:
            print(f"Warning: Supabase import failed: {e}. SOS features will be unavailable.")

# --- CONFIGURATION (Load from environment variables) ---
# NOTE: Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your backend/.env file
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

# Global Supabase client instance
supabase_client: Optional[Any] = None

# --- INITIALIZATION ---

def initialize_supabase_client():
    """
    Initializes the Supabase client connection. This should be called 
    once during the FastAPI application startup (main.py).
    """
    global supabase_client
    _import_supabase()
    
    if create_client is None:
        print("CRITICAL WARNING: Supabase library not available. SOS and Guardian features will fail.")
        return
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print("CRITICAL WARNING: Supabase credentials not found in environment variables. SOS and Guardian features will fail.")
        return
    
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"Error initializing Supabase client: {e}")
        supabase_client = None


# --- CORE SOS SYSTEM FUNCTIONS ---

async def create_sos_session(user_id: str, current_location: Dict[str, float]) -> Optional[str]:
    """
    Creates a new SOS session record in the database and returns the unique token.
    
    Returns: The unique token for the Guardian Dashboard, or None on failure.
    """
    if not supabase_client: return None
    
    # Generate a simple unique token (You should use a more secure method like UUID in production)
    unique_token = os.urandom(8).hex()

    data = {
        "user_id": user_id,
        "token": unique_token,
        "is_active": True,
        "start_time": datetime.now().isoformat(),
        "latest_lat": current_location["lat"],
        "latest_lon": current_location["lon"],
        # Add guardian email/phone details here if available
    }

    try:
        response = supabase_client.table("sos_sessions").insert(data).execute()
        # Ensure data was inserted successfully
        if response.data:
            return unique_token
    except Exception as e:
        print(f"Error creating SOS session: {e}")
    return None


async def update_live_location(token: str, lat: float, lon: float, is_stationary: bool = False) -> bool:
    """
    Updates the live location for an active SOS session identified by the token.
    """
    if not supabase_client: return False
    
    data = {
        "latest_lat": lat,
        "latest_lon": lon,
        "last_ping": datetime.now().isoformat(),
        "is_stationary": is_stationary
    }

    try:
        # Update the record where the token matches and the session is active
        response = supabase_client.table("sos_sessions").update(data).eq("token", token).eq("is_active", True).execute()
        return len(response.data) > 0 # Returns True if a record was updated
    except Exception as e:
        print(f"Error updating live location: {e}")
        return False


async def get_live_location(token: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the current location and status for the Guardian Dashboard.
    """
    if not supabase_client: return None
    
    try:
        # Select necessary fields for the dashboard
        response = supabase_client.table("sos_sessions").select("latest_lat, latest_lon, last_ping, is_stationary, is_active").eq("token", token).single().execute()
        
        # Check if the session is active and exists
        if response.data and response.data.get("is_active"):
            return response.data
            
    except Exception as e:
        # A 404 error usually means the token wasn't found or the session is inactive
        return None
        
    return None


async def deactivate_sos_session(token: str) -> bool:
    """
    Sets the session to inactive when the user cancels the SOS.
    """
    if not supabase_client: return False
    
    data = {"is_active": False, "end_time": datetime.now().isoformat()}

    try:
        response = supabase_client.table("sos_sessions").update(data).eq("token", token).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error deactivating SOS session: {e}")
        return False


# --- INTEGRATION POINT: SHADOWROUTE PERSISTENCE ---

async def upsert_shadow_scores(scores: Dict[int, float]):
    """
    Synchronizes in-memory ShadowRoute scores to the database (for multi-server setup).
    """
    if not supabase_client: return

    sync_data = [
        {
            'segment_id': seg_id,
            'shadow_score': score,
            'last_update': datetime.now().isoformat(),
        }
        for seg_id, score in scores.items()
    ]
    
    try:
        # The 'shadow_scores' table must exist in Supabase and have a unique constraint on 'segment_id'
        supabase_client.table('shadow_scores').upsert(sync_data, on_conflict=['segment_id']).execute()
    except Exception as e:
        print(f"ShadowRoute Sync Error: {e}")
        
        
# --- UPDATE main.py for Initialization ---

# Remember to update your main.py startup event to call initialize_supabase_client()
# from .services.supabaseservice import initialize_supabase_client
# @app.on_event("startup")
# async def startup_event():
#     # ... existing data loading
#     initialize_supabase_client()
#     # ... start other trackers