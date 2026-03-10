import requests, base64, json, time, os

API_KEY = os.environ.get("PIXELLAB_API_KEY", "")

with open("E:/pixemingle/art-tests/sf-golden-hour/soma_coffee.png", "rb") as f:
    ref_b64 = base64.b64encode(f.read()).decode()

headers = {"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"}

# Test both views side by side: "high top-down" (flatter) vs "side" (front-facing)
furniture = [
    # high top-down versions
    ("chair_flat", "Simple wooden cafe chair with blue cushion seat", 48, 48, 0.7, "high top-down"),
    ("table_flat", "Small round wooden cafe table, warm brown wood", 48, 48, 0.7, "high top-down"),
    ("sofa_flat", "Modern teal couch sofa with orange cushions", 96, 48, 0.5, "high top-down"),
    # side view versions  
    ("chair_side", "Simple wooden cafe chair with blue cushion seat", 48, 48, 0.7, "side"),
    ("table_side", "Small round wooden cafe table, warm brown wood", 48, 48, 0.7, "side"),
    ("sofa_side", "Modern teal couch sofa with orange cushions", 96, 48, 0.5, "side"),
]

jobs = {}
for name, desc, w, h, frac, view in furniture[:3]:
    resp = requests.post(f"https://api.pixellab.ai/v2/map-objects", headers=headers, json={
        "description": desc,
        "image_size": {"width": w, "height": h},
        "view": view,
        "outline": "single color outline",
        "shading": "medium shading",
        "detail": "high detail",
        "background_image": {"base64": ref_b64},
        "inpainting": {"type": "oval", "fraction": frac}
    }, timeout=30)
    data = resp.json()
    if resp.status_code == 200:
        jobs[name] = data.get("object_id", "")
        print(f"  OK: {name} ({view}) -> {jobs[name]}")
    else:
        print(f"  FAIL: {name} -> {resp.status_code}")

time.sleep(10)

for name, desc, w, h, frac, view in furniture[3:]:
    resp = requests.post(f"https://api.pixellab.ai/v2/map-objects", headers=headers, json={
        "description": desc,
        "image_size": {"width": w, "height": h},
        "view": view,
        "outline": "single color outline",
        "shading": "medium shading",
        "detail": "high detail",
        "background_image": {"base64": ref_b64},
        "inpainting": {"type": "oval", "fraction": frac}
    }, timeout=30)
    data = resp.json()
    if resp.status_code == 200:
        jobs[name] = data.get("object_id", "")
        print(f"  OK: {name} ({view}) -> {jobs[name]}")
    else:
        print(f"  FAIL: {name} -> {resp.status_code}")

with open("E:/pixemingle/art-tests/sf-golden-hour/flat_jobs.json", "w") as f:
    json.dump(jobs, f, indent=2)
print(f"\n{len(jobs)} jobs queued")
