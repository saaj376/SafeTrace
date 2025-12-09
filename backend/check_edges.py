from services.riskscoreservice import load_risk_and_graph_data, get_graph

load_risk_and_graph_data()
G = get_graph()

# Check what attributes exist
print("Sample edges and their attributes:")
count = 0
for u, v, k, data in G.edges(keys=True, data=True):
    print(f"\nEdge {u}-{v}-{k}:")
    for key, val in list(data.items())[:10]:
        if isinstance(val, (int, float, bool)):
            print(f"  {key}: {val}")
        else:
            print(f"  {key}: {str(val)[:40]}...")
    count += 1
    if count >= 2:
        break

# Check what attributes appear most frequently
print("\n\nMost common attributes across all edges:")
all_attrs = set()
for u, v, k, data in G.edges(keys=True, data=True):
    all_attrs.update(data.keys())

for attr in sorted(all_attrs)[:20]:
    print(f"  - {attr}")
