from services.routingengine import get_safety_route
from services.riskscoreservice import load_risk_and_graph_data
import math

load_risk_and_graph_data()

# Test coordinates in Chennai
start_lat, start_lon = 13.0342, 80.2206
end_lat, end_lon = 13.0881, 80.2707

modes = ['safe', 'balanced', 'stealth', 'escort']
results = {}

for mode in modes:
    print(f"\n{'='*50}")
    print(f"Testing {mode.upper()} mode")
    print(f"{'='*50}")
    
    route = get_safety_route(start_lat, start_lon, end_lat, end_lon, mode)
    
    if route:
        # Calculate distance
        def haversine(lat1, lon1, lat2, lon2):
            R = 6371
            lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
            dlat, dlon = lat2-lat1, lon2-lon1
            a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
            c = 2*math.asin(math.sqrt(a))
            return R*c
        
        total_dist = 0
        for i in range(len(route)-1):
            total_dist += haversine(route[i][0], route[i][1], route[i+1][0], route[i+1][1])
        
        results[mode] = {
            'waypoints': len(route),
            'distance': total_dist,
            'first': route[0],
            'last': route[-1],
            'middle': route[len(route)//2] if len(route) > 1 else route[0]
        }
        
        print(f"Waypoints: {len(route)}")
        print(f"Distance: {total_dist:.2f} km")
        print(f"Start: ({route[0][0]:.6f}, {route[0][1]:.6f})")
        print(f"Middle: ({route[len(route)//2][0]:.6f}, {route[len(route)//2][1]:.6f})")
        print(f"End: ({route[-1][0]:.6f}, {route[-1][1]:.6f})")
    else:
        print("Route calculation failed!")

print(f"\n{'='*50}")
print("SUMMARY")
print(f"{'='*50}")
for mode, data in results.items():
    print(f"{mode:10} - {data['waypoints']:3} waypoints, {data['distance']:6.2f} km")

# Check if routes are different
print(f"\n{'='*50}")
print("Are routes different?")
print(f"{'='*50}")
if len(results) > 1:
    first_mode = list(results.keys())[0]
    for mode in list(results.keys())[1:]:
        if results[first_mode]['middle'] != results[mode]['middle']:
            print(f"✓ {first_mode} and {mode} use DIFFERENT routes")
        else:
            print(f"✗ {first_mode} and {mode} use the SAME route")
