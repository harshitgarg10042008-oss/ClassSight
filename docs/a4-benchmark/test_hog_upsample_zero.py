import io
import json
import time
from pathlib import Path

import face_recognition
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
CASES = [
    ROOT / "docs/overnight/stage-a/source/modern_classroom_selfie.jpg",
    ROOT / "golden-set/obama_biden_group_2010.jpg",
    ROOT / "golden-set/largegroup-1899/classroom_1899.jpg",
]


def request_image(path, max_size=None):
    with Image.open(path).convert("RGB") as pil:
        if max_size:
            pil.thumbnail((max_size, max_size))
        buf = io.BytesIO()
        pil.save(buf, format="JPEG", quality=95)
        return face_recognition.load_image_file(io.BytesIO(buf.getvalue()))


rows = []
for path in CASES:
    image = request_image(path, 800 if "golden-set" in str(path) and "largegroup" not in str(path) else None)
    started = time.perf_counter()
    locations = face_recognition.face_locations(image, model="hog", number_of_times_to_upsample=0)
    detection_ms = (time.perf_counter() - started) * 1000.0
    started = time.perf_counter()
    encodings = face_recognition.face_encodings(image, locations)
    encoding_ms = (time.perf_counter() - started) * 1000.0
    rows.append({"path": str(path.relative_to(ROOT)), "shape": list(image.shape), "faces": len(locations), "detection_ms": round(detection_ms, 2), "encoding_ms": round(encoding_ms, 2)})
print(json.dumps(rows, indent=2))
