#!/usr/bin/env python
import sys
try:
    print("Testing imports...")
    from services.riskscoreservice import load_risk_and_graph_data
    print("✓ riskscoreservice")
    from services.routingengine import get_safety_route
    print("✓ routingengine")
    from routes.routingservice import router
    print("✓ routingservice")
    from main import app
    print("✓ main")
    print("\n✓ All imports successful!")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
