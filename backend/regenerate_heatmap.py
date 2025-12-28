import json

SCORES_FILE = "segment_scores.json"
SEGMENTS_FILE = "segments.json"

print("Loading segments...")
with open(SEGMENTS_FILE) as f:
    SEGMENTS = json.load(f)

print("Loading scores...")
with open(SCORES_FILE) as f:
    SCORES = json.load(f)

def score_to_color(score):
    if score is None:
        return "#666666"
    if score >= 0.8:
        return "#00ff00"
    if score >= 0.5:
        return "#ffaa00"
    return "#ff0066"

features = []
for seg in SEGMENTS:
    seg_id = seg["segment_id"]
    coords = seg["coordinates"]
    
    score_entry = SCORES.get(str(seg_id))
    score_value = score_entry["score"] if score_entry else None
    
    color = score_to_color(score_value)
    
    feature = {
        "type": "Feature",
        "properties": {
            "segment_id": seg_id,
            "score": score_value,
            "color": color
        },
        "geometry": {
            "type": "LineString",
            "coordinates": coords
        }
    }
    features.append(feature)

geojson_output = {
    "type": "FeatureCollection",
    "features": features
}

print("Writing heatmap...")
with open("safety_heatmap.geojson", "w") as f:
    json.dump(geojson_output, f)

green = sum(1 for f in features if f["properties"]["score"] and f["properties"]["score"] >= 0.8)
orange = sum(1 for f in features if f["properties"]["score"] and 0.5 <= f["properties"]["score"] < 0.8)
red = sum(1 for f in features if f["properties"]["score"] and f["properties"]["score"] < 0.5)
grey = sum(1 for f in features if f["properties"]["score"] is None)

print(f"Regenerated heatmap with {len(features)} segments")
print(f"Green (safe): {green}")
print(f"Orange (moderate): {orange}")
print(f"Red (unsafe): {red}")
print(f"Grey (unrated): {grey}")
