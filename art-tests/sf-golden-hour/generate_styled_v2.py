import requests
import base64
import json
import time
import os

API_KEY = os.environ.get("PIXELLAB_API_KEY", "")
BASE_URL = "https://api.pixellab.ai/v2"

# Load reference image
with open("E:/pixemingle/art-tests/sf-golden-hour/soma_coffee.png", "rb") as f:
    ref_b64 = base64.b64encode(f.read()).decode()
print(f"Reference loaded ({len(ref_b64)} chars)")

# Furniture: (name, desc, w, h, fraction)
furniture = [
    ("chair", "Simple wooden chair with blue cushion seat, cafe interior", 48, 48, 0.7),
    ("table", "Wooden cafe table for two, warm brown wood top, single pedestal", 96, 48, 0.6),
    ("sofa", "Modern teal booth seat with orange cushion back, cafe bench seating", 144, 48, 0.5),
    ("plant", "Large indoor tropical plant in terracotta pot", 48, 96, 0.5),
    ("bookshelf", "Small wooden wall shelf with colorful books", 48, 96, 0.5),
    ("counter", "Wooden cafe counter bar top, coffee bar with items on top", 144, 48, 0.5),
    ("pendant", "Warm orange hanging pendant ceiling lamp, industrial cafe", 48, 48, 0.6),
    ("lamp", "Standing floor lamp with warm fabric shade", 48, 96, 0.5),
]

headers = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}"
}

jobs = {}

# Batch 1: first 4
for name, desc, w, h, frac in furniture[:4]:
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
        resp = requests.post(f"{BASE_URL}/map-objects", headers=headers, json=payload, timeout=30)
        data = resp.json()
        if resp.status_code == 200:
            obj_id = data.get("object_id", "")
            jobs[name] = {"object_id": obj_id, "size": f"{w}x{h}"}
            print(f"  OK: {name} ({w}x{h}) -> {obj_id}")
        else:
            print(f"  FAIL: {name} -> {resp.status_code}: {json.dumps(data)[:200]}")
            jobs[name] = {"error": resp.status_code}
    except Exception as e:
        print(f"  ERR: {name} -> {e}")
        jobs[name] = {"error": str(e)}

print("\nWaiting 15s before batch 2...")
time.sleep(15)

# Batch 2: last 4
for name, desc, w, h, frac in furniture[4:]:
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
        resp = requests.post(f"{BASE_URL}/map-objects", headers=headers, json=payload, timeout=30)
        data = resp.json()
        if resp.status_code == 200:
            obj_id = data.get("object_id", "")
            jobs[name] = {"object_id": obj_id, "size": f"{w}x{h}"}
            print(f"  OK: {name} ({w}x{h}) -> {obj_id}")
        else:
            print(f"  FAIL: {name} -> {resp.status_code}: {json.dumps(data)[:200]}")
            jobs[name] = {"error": resp.status_code}
    except Exception as e:
        print(f"  ERR: {name} -> {e}")
        jobs[name] = {"error": str(e)}

with open("E:/pixemingle/art-tests/sf-golden-hour/styled_v2_jobs.json", "w") as f:
    json.dump(jobs, f, indent=2)

print(f"\nDone. {sum(1 for v in jobs.values() if 'object_id' in v)}/{len(jobs)} queued")
print(json.dumps(jobs, indent=2))
