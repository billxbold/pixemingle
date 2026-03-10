import requests
import base64
import json
import time
import os

API_KEY = os.environ.get("PIXELLAB_API_KEY", "")
BASE_URL = "https://api.pixellab.ai/v1"

# Load reference image as base64
ref_path = "E:/pixemingle/art-tests/sf-golden-hour/soma_coffee.png"
with open(ref_path, "rb") as f:
    ref_b64 = base64.b64encode(f.read()).decode()

print(f"Reference image loaded: {len(ref_b64)} chars base64")

# Furniture definitions: (name, description, width, height, fraction)
furniture = [
    ("chair_v2", "Simple wooden chair with blue cushion, cafe interior, warm golden light", 48, 48, 0.7),
    ("table_v2", "Wooden cafe table for two, warm brown, golden hour lighting", 96, 48, 0.6),
    ("sofa_v2", "Modern teal booth seat with orange cushion back, cafe seating", 144, 48, 0.5),
    ("plant_v2", "Large indoor tropical plant in terracotta pot, cafe corner", 48, 96, 0.5),
    ("bookshelf_v2", "Small wooden wall shelf with books, warm brown wood", 48, 96, 0.5),
    ("counter_v2", "Wooden cafe counter bar with warm wood top, coffee bar", 144, 48, 0.5),
    ("pendant_v2", "Warm orange hanging pendant lamp, industrial cafe ceiling", 48, 48, 0.6),
    ("lamp_v2", "Standing floor lamp with warm shade, minimalist", 48, 96, 0.5),
]

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

jobs = {}

# Generate in batches of 4 to avoid 429 errors
for batch_start in range(0, len(furniture), 4):
    batch = furniture[batch_start:batch_start+4]
    
    for name, desc, w, h, frac in batch:
        payload = {
            "description": desc,
            "image_size": {"width": w, "height": h},
            "view": "low top-down",
            "outline": "single color outline",
            "shading": "medium shading",
            "detail": "high detail",
            "background_image": {"base64": ref_b64},
            "inpainting": {"type": "oval", "fraction": frac}
        }
        
        try:
            resp = requests.post(f"{BASE_URL}/generate-map-object", headers=headers, json=payload, timeout=30)
            if resp.status_code == 200:
                data = resp.json()
                obj_id = data.get("object_id", "")
                jobs[name] = {"object_id": obj_id, "status": "queued", "size": f"{w}x{h}"}
                print(f"  Queued: {name} ({w}x{h}) -> {obj_id}")
            else:
                print(f"  FAILED: {name} -> {resp.status_code}: {resp.text[:200]}")
                jobs[name] = {"error": resp.status_code, "msg": resp.text[:200]}
        except Exception as e:
            print(f"  ERROR: {name} -> {e}")
            jobs[name] = {"error": str(e)}
    
    if batch_start + 4 < len(furniture):
        print(f"\n  Waiting 10s before next batch...")
        time.sleep(10)

# Save job IDs
with open("E:/pixemingle/art-tests/sf-golden-hour/styled_v2_jobs.json", "w") as f:
    json.dump(jobs, f, indent=2)

print(f"\nAll jobs submitted. Saved to styled_v2_jobs.json")
print(json.dumps(jobs, indent=2))
