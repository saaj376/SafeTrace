# backend/generate_risk_data.py

import pandas as pd
import numpy as np
import os
import random

# --- CONFIGURATION ---
# The number of unique nodes (road intersections) to simulate risk data for.
NUM_NODES = 10000 
# Define output path based on the structure (up one level to backend, then into data)
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
OUTPUT_FILE = os.path.join(OUTPUT_DIR, 'hourly_risk_data.csv')

# --- DATA GENERATION LOGIC ---

def create_and_save_risk_data():
    """
    Generates simulated hourly risk scores (0.0 to 10.0) for a set of nodes 
    and saves them to a CSV file.
    """
    # 1. Ensure the data directory exists
    if not os.path.exists(OUTPUT_DIR):
        print(f"Creating directory: {OUTPUT_DIR}")
        os.makedirs(OUTPUT_DIR)
        
    # Generate 10,000 unique simulated Node IDs (large numbers mimic OSM IDs)
    # NOTE: These IDs should ideally match the node IDs in your safe_graph.gpickle
    node_ids = np.arange(1000000, 1000000 + NUM_NODES) 
    all_data = []

    print("1. Generating 24 hours of simulated risk data...")

    # Iterate through all 24 hours of the day
    for hour in range(24):
        # Generate a random base risk score (0-3) for all nodes
        base_risk = np.random.uniform(0, 3, size=NUM_NODES)
        
        # Apply a simple time-of-day penalty (simulating higher risk at night)
        # Night hours (10 PM to 5 AM) receive a higher risk multiplier
        if 22 <= hour or hour <= 5: 
            night_multiplier = np.random.uniform(1.5, 2.5, size=NUM_NODES)
            risk_score = np.clip(base_risk * night_multiplier, 0, 10) # Clip at max 10
        else:
            # Daytime risk
            risk_score = np.clip(base_risk, 0, 10)

        # Create a DataFrame for this specific hour
        hour_data = pd.DataFrame({
            'node_id': node_ids,
            'hour': hour,
            # Round risk score to 3 decimal places
            'precomputed_risk': risk_score.round(3) 
        })
        all_data.append(hour_data)

    # 2. Concatenate all 24 DataFrames into one large file
    final_df = pd.concat(all_data, ignore_index=True)

    print(f"2. Generated a total of {len(final_df)} records.")
    print(f"3. Saving data to {OUTPUT_FILE}...")
    
    # 3. Save to CSV
    final_df.to_csv(OUTPUT_FILE, index=False)
    
    print("Risk data generation complete! The hourly risk file is ready.")

if __name__ == "__main__":
    create_and_save_risk_data()