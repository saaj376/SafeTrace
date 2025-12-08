# backend/services/threatfusionengine.py

from datetime import datetime
from typing import Any
from .riskscoreservice import get_precomputed_risk_score
from .shadowroute import get_shadow_score
from config import MODE_RISK_MULTIPLIERS

# --- CONFIGURATION & PLACEHOLDERS ---

def get_current_environmental_penalty(current_time: datetime) -> float:
    """
    Simulates fetching real-time environmental factors (Weather, Darkness).
    In a fully deployed system, this would query an external weather API.
    
    Returns: A penalty value (0.0 = clear, 3.0 = severe rain/fog/darkness).
    """
    current_hour = current_time.hour
    penalty = 0.0
    
    # 1. Darkness Penalty (High during deep night)
    if 23 <= current_hour or current_hour <= 4:
        penalty += 1.5 # Significant penalty for low visibility/isolation
    
    # 2. Weather Penalty (Placeholder for Open-Meteo data)
    # Assume 1.0 penalty if simulated "heavy rain" occurs during this time
    # if current_time.minute < 30 and current_time.hour % 2 == 0:
    #    penalty += 1.0 
        
    return penalty


# --- THREAT FUSION CORE FUNCTION ---

def calculate_final_edge_weight(
    node_id: int, 
    base_time: float, 
    mode: str, 
    current_time: datetime
) -> float:
    """
    The main Threat Fusion logic. Combines all risk inputs to determine 
    the dynamic safety cost for a road segment (edge starting at node_id).
    
    Args:
        node_id: The OSM ID of the node (start point of the edge).
        base_time: The inherent travel time (seconds) of the segment.
        mode: The user's chosen routing mode ('safe', 'stealth', etc.).
        current_time: The current datetime for time-of-day lookups.

    Returns:
        The final cost (safety_weight) that the routing algorithm will minimize.
    """
    
    # --- 1. GATHER BASE COMPONENTS ---
    
    # Get the user-defined risk sensitivity for the chosen mode (e.g., 0.8 for 'safe')
    risk_sensitivity = MODE_RISK_MULTIPLIERS.get(mode, 0.5)
    
    # Precomputed risk (ML model + time-of-day history)
    precomputed_risk = get_precomputed_risk_score(node_id, current_time) # Value 0-10
    
    # Environmental risk (Darkness, weather visibility)
    environmental_penalty = get_current_environmental_penalty(current_time)
    
    # Real-time crowd data (ShadowRoute)
    shadow_score = get_shadow_score(node_id) # Value 0.0 (quiet) to 1.0 (busy)

    # --- 2. FUSION: CALCULATE TOTAL RISK COST ---
    
    # A. Core Risk Cost: Sum of historical/environmental risk
    total_base_risk = precomputed_risk + environmental_penalty
    
    # B. Crowd Penalty/Bonus (ShadowRoute): This is mode-dependent
    crowd_adjustment = 0.0
    
    if mode == 'stealth':
        # Stealth mode highly penalizes visibility (busy roads)
        # Higher shadow_score = higher penalty (we want to AVOID it)
        crowd_adjustment = shadow_score * 75
        
    elif mode == 'safe' or mode == 'escort':
        # Safe modes slightly reward activity (safety in numbers)
        # Higher shadow_score = negative penalty (a small bonus)
        crowd_adjustment = shadow_score * -15
        
    # C. Apply overall risk sensitivity multiplier
    # This converts the risk score into a time penalty
    risk_time_penalty = (total_base_risk * 10) * risk_sensitivity 
    
    # --- 3. FINAL WEIGHT CALCULATION ---
    
    # Final Weight = [Inherent Travel Time] + [Risk Penalty] + [Crowd Adjustment]
    final_weight = base_time + risk_time_penalty + crowd_adjustment
    
    # Ensure the final weight is a positive value (minimum 1.0 second cost)
    return max(1.0, final_weight)