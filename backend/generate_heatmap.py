import json
import random

segments = json.load(open('segments.json'))

def score_to_color(score):
    if score >= 0.8:
        return '#00ff00'  # Green (safe)
    if score >= 0.5:
        return '#ffaa00'  # Orange (moderate)
    return '#ff0066'  # Red (unsafe)

features = []
for seg in segments:
    # Randomly assign a safety score between 0 and 1
    score = round(random.uniform(0, 1), 2)
    color = score_to_color(score)
    
    feature = {
        'type': 'Feature',
        'properties': {
            'segment_id': seg['segment_id'],
            'score': score,
            'color': color
        },
        'geometry': {
            'type': 'LineString',
            'coordinates': seg['coordinates']
        }
    }
    features.append(feature)

geojson_data = {
    'type': 'FeatureCollection',
    'features': features
}

json.dump(geojson_data, open('safety_heatmap.geojson', 'w'), indent=2)

green_count = sum(1 for f in features if f["properties"]["score"] >= 0.8)
orange_count = sum(1 for f in features if 0.5 <= f["properties"]["score"] < 0.8)
red_count = sum(1 for f in features if f["properties"]["score"] < 0.5)

print(f'Generated safety_heatmap.geojson with {len(features)} randomly scored segments')
print(f'Green (safe >=0.8): {green_count}')
print(f'Orange (moderate 0.5-0.8): {orange_count}')
print(f'Red (unsafe <0.5): {red_count}')
