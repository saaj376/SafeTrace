# backend/generate_safe_graph.py

import osmnx as ox
import networkx as nx
import os
import pickle # <-- IMPORTED PYTHON'S STANDARD PICKLE MODULE
import pandas as pd 

# ----------------------------------------------------------------
# CONFIGURATION
# ----------------------------------------------------------------
CITY_NAME = "Chennai, Tamil Nadu, India"
# Define output path: up one level (to backend), then into data folder
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'safe_graph.gpickle')

# ----------------------------------------------------------------
# CORE GENERATION FUNCTION
# ----------------------------------------------------------------

def create_and_save_safe_graph():
    """
    Downloads the OSM street network, calculates base weights, and saves the graph
    using a robust try/except block for saving.
    """
    # 1. Ensure the data directory exists
    if not os.path.exists(OUTPUT_DIR):
        print(f"Creating data directory: {OUTPUT_DIR}")
        os.makedirs(OUTPUT_DIR)
        
    print(f"1. Downloading road network for: {CITY_NAME}...")
    
    try:
        G = ox.graph_from_place(CITY_NAME, network_type="drive")
    except Exception as e:
        print(f"ERROR: Failed to download graph for {CITY_NAME}.")
        print(f"Details: {e}")
        return

    # 2. Add base weights needed for all calculations
    print("2. Calculating base edge speeds and travel times...")
    G = ox.add_edge_speeds(G) 
    G = ox.add_edge_travel_times(G) 

    # 3. Assign the initial 'safety_weight'
    print("3. Assigning initial 'safety_weight' based on travel time.")
    for u, v, k, data in G.edges(keys=True, data=True):
        data['safety_weight'] = data.get('travel_time', 60) 

    # 4. Save the Graph using robust method
    print(f"4. Saving the graph to {OUTPUT_FILE}...")
    
    try:
        # --- PRIMARY METHOD ---
        print("Attempting to save using nx.write_gpickle...")
        nx.write_gpickle(G, OUTPUT_FILE)
        
    except AttributeError as e:
        # --- FALLBACK METHOD ---
        print(f"Warning: nx.write_gpickle failed ({e}). Falling back to standard Python pickle serialization.")
        
        # Use Python's standard pickle module to save the graph object
        with open(OUTPUT_FILE, 'wb') as f:
            pickle.dump(G, f)
            
    except Exception as e:
        # Catch any other saving error
        print(f"CRITICAL ERROR SAVING GRAPH: {e}")
        return
            
    print("Graph generation complete! The safety routing graph is ready.")

if __name__ == "__main__":
    create_and_save_safe_graph()