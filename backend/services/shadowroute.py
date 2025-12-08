# backend/services/shadowroute.py

import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import threading
import os

# Import configuration settings
try:
    # Use relative import for settings defined in your config.py
    from ..config import ROLLING_WINDOW_MINUTES, SYNC_INTERVAL_SECONDS
    # from .supabaseservice import supabase_client # Placeholder: Uncomment when implemented
except ImportError:
    # Fallback/Mock config for standalone testing
    ROLLING_WINDOW_MINUTES = 30
    SYNC_INTERVAL_SECONDS = 60
    # supabase_client = None


# Global data stores
# Tracks when each segment was last visited: {segment_id: [timestamp_1, timestamp_2, ...]}
SEGMENT_VISITS: Dict[int, List[datetime]] = defaultdict(list)

# Stores the final calculated, normalized popularity score {segment_id: score (0.0 - 1.0)}
CURRENT_SHADOW_SCORES: Dict[int, float] = {}


# --- BACKGROUND THREAD LOGIC ---

def clean_old_visits():
    """
    Periodically cleans timestamps older than the rolling window (30 minutes) 
    from memory to keep the data relevant and fresh.
    """
    cutoff_time = datetime.now() - timedelta(minutes=ROLLING_WINDOW_MINUTES)
    
    # Safely iterate and modify the dictionary
    for segment_id in list(SEGMENT_VISITS.keys()):
        # Filter out timestamps older than the cutoff time
        SEGMENT_VISITS[segment_id] = [
            t for t in SEGMENT_VISITS[segment_id] if t > cutoff_time
        ]
        
        # If the segment is no longer active, remove it from memory
        if not SEGMENT_VISITS[segment_id]:
            del SEGMENT_VISITS[segment_id]


def calculate_and_sync_scores():
    """
    Calculates the normalized ShadowRoute score (popularity) and syncs it.
    This runs periodically in a background thread.
    """
    global CURRENT_SHADOW_SCORES
    
    clean_old_visits() # Step 1: Remove old data points

    # 1. Count current active visits per segment
    segment_counts = {
        seg_id: len(timestamps) 
        for seg_id, timestamps in SEGMENT_VISITS.items()
    }
    
    if not segment_counts:
        CURRENT_SHADOW_SCORES = {}
        return

    # 2. Normalize counts: Scale the busiest segment to 1.0
    max_count = max(segment_counts.values())
    
    new_scores = {
        seg_id: round(count / max_count, 4) # Round for cleaner floats
        for seg_id, count in segment_counts.items()
    }

    CURRENT_SHADOW_SCORES = new_scores
    
    # 3. Synchronization (Placeholder for Supabase/External DB)
    # This step is critical if you plan to run SafeTrace X across multiple servers/instances.
    # if supabase_client:
    #     sync_scores_to_db(new_scores)
    #     pass


def shadow_route_sync_loop():
    """Background loop to run the calculation and sync periodically."""
    while True:
        # Wait for the defined sync interval
        time.sleep(SYNC_INTERVAL_SECONDS)
        calculate_and_sync_scores()
        

def start_shadow_route_tracker():
    """Initializes and starts the background sync thread."""
    # Run an initial calculation to populate scores immediately
    calculate_and_sync_scores() 
    
    # Start the background thread (daemon=True means it exits when main program exits)
    sync_thread = threading.Thread(target=shadow_route_sync_loop, daemon=True)
    sync_thread.start()
    print("ShadowRoute Tracker started in the background.")


# --- PUBLIC FUNCTIONS (Used by other services) ---

def record_segment_visit(segment_id: int):
    """
    Called by the geolocation tracking logic whenever a user's location 
    is snapped to a road segment.
    """
    # Append the current timestamp to the list for that segment
    SEGMENT_VISITS[segment_id].append(datetime.now())


def get_shadow_score(segment_id: int) -> float:
    """
    Retrieves the current normalized popularity score for a segment.
    Score ranges from 0.0 (quiet) to 1.0 (max busy).
    """
    # Returns 0.0 if the segment has no recent visits
    return CURRENT_SHADOW_SCORES.get(segment_id, 0.0)