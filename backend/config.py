# backend/config.py
import os

# Get the base directory of the config file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ----------------------------------------------------------------
# 1. FILE PATH CONFIGURATION (Used by riskscoreservice.py)
# ----------------------------------------------------------------
# The data folder is located adjacent to main.py
DATA_DIR = os.path.join(BASE_DIR, 'data') 

# Paths to the precomputed files
SAFE_GRAPH_PATH = os.path.join(DATA_DIR, 'safe_graph.gpickle')
HOURLY_RISK_PATH = os.path.join(DATA_DIR, 'hourly_risk_data.csv')

# ----------------------------------------------------------------
# 2. SHADOWROUTE CONFIGURATION (Used by shadowroute.py)
# ----------------------------------------------------------------
# Time window for considering a visit "recent" (for crowd intelligence)
ROLLING_WINDOW_MINUTES = 30
# How often the background thread recalculates and syncs scores (in seconds)
SYNC_INTERVAL_SECONDS = 60 

# ----------------------------------------------------------------
# 3. ROUTING WEIGHTS (Used by routingengine.py and threatfusionengine.py)
# ----------------------------------------------------------------
# Defines how much weight the risk component adds relative to travel time.
# Higher value = pathfinding prioritizes safety more heavily over speed/time.
MODE_RISK_MULTIPLIERS = {
    'safe': 0.8,      # Heavily penalize risk
    'balanced': 0.5,  # Moderate balance
    'stealth': 0.2,   # Minimize risk/crowds but prioritize speed/isolation
    'escort': 1.0     # Maximum safety priority
}

# ----------------------------------------------------------------
# 4. PROACTIVE MONITORING CONFIGURATION (Used by proactivemonitoringservice.py)
# ----------------------------------------------------------------
# Number of nodes ahead to check for sudden risk spikes
HAZARD_CHECK_AHEAD_STEPS = 5 
# Maximum deviation distance (in meters) allowed before triggering an alert
MAX_DEVIATION_METERS = 50 
# Default risk score threshold (0-10) for triggering a 'spike' alert
RISK_SPIKE_THRESHOLD = 7.0