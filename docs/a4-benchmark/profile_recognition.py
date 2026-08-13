import io
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "face-service-fastapi"))

import face_recognition
import numpy as np
from PIL import Image

from main import _confidence_from_distance, _face_quality_warnings, _load_rgb_image, _quality_metrics

IMAGE = ROOT / "docs/overnight/stage-a/source/modern_classroom_selfie.jpg"
PROFILE_MAX_DIM = int(os.getenv("PROFILE_MAX_DIM", "0"))


def resize_for_profile(image_array):
    if PROFILE_MAX_DIM <= 0:
        return image_array
    height, width = image_array.shape[:2]
    max_dim = max(height, width)
    if max_dim <= PROFILE_MAX_DIM:
        return image_array
    scale = PROFILE_MAX_DIM / float(max_dim)
    return np.asarray(Image.fromarray(image_array).resize(
        (max(1, round(width * scale)), max(1, round(height * scale))),
        Image.Resampling.LANCZOS,
    ))


def timed(fn):
    start = time.perf_counter()
    value = fn()
    return value, (time.perf_counter() - start) * 1000.0


def main():
    phases = {}
    raw_bytes, ms = timed(lambda: IMAGE.read_bytes())
    phases["file_read_ms"] = ms
    def reencode():
        with Image.open(io.BytesIO(raw_bytes)).convert("RGB") as pil_image:
            output = io.BytesIO()
            pil_image.save(output, format="JPEG", quality=95)
            return output.getvalue()
    request_bytes, ms = timed(reencode)
    phases["jpeg_reencode_ms"] = ms
    image, ms = timed(lambda: resize_for_profile(_load_rgb_image(request_bytes)))
    phases["image_decode_and_resize_ms"] = ms
    locations, ms = timed(lambda: face_recognition.face_locations(image, model="hog"))
    phases["hog_detection_ms"] = ms
    quality, ms = timed(lambda: _quality_metrics(image, locations))
    phases["quality_liveness_full_image_ms"] = ms
    encodings, ms = timed(lambda: face_recognition.face_encodings(image, locations))
    phases["batch_face_encodings_ms"] = ms

    per_face_times = []
    per_face_encodings = []
    for loc in locations:
        encoding, face_ms = timed(lambda loc=loc: face_recognition.face_encodings(image, [loc])[0])
        per_face_encodings.append(encoding)
        per_face_times.append(face_ms)
    phases["per_face_encoding_ms"] = per_face_times
    phases["per_face_encoding_sum_ms"] = sum(per_face_times)

    enrolled = np.asarray([np.asarray(encodings[0], dtype=np.float64)]) if encodings else np.empty((0, 128))
    distance_times = []
    distances = []
    quality_warning_times = []
    for index, encoding in enumerate(encodings):
        distances_for_face, distance_ms = timed(lambda encoding=encoding: face_recognition.face_distance(enrolled, encoding))
        distance_times.append(distance_ms)
        distances.append(float(distances_for_face[0]) if len(distances_for_face) else None)
        _, warning_ms = timed(lambda index=index: _face_quality_warnings(locations[index], image.shape, quality))
        quality_warning_times.append(warning_ms)
    phases["distance_comparison_ms"] = distance_times
    phases["distance_comparison_sum_ms"] = sum(distance_times)
    phases["per_face_quality_warning_ms"] = quality_warning_times
    phases["per_face_quality_warning_sum_ms"] = sum(quality_warning_times)
    _, serialization_ms = timed(lambda: json.dumps({
        "face_count": len(locations),
        "matches": [{"face_index": i, "distance": distances[i], "confidence": _confidence_from_distance(distances[i])} for i in range(len(distances))],
        "quality": quality.model_dump(),
    }))
    phases["serialization_ms"] = serialization_ms
    phases["sum_measured_ms"] = sum(v if isinstance(v, (int, float)) else sum(v) for v in phases.values())
    result = {
        "image": str(IMAGE),
        "width": int(image.shape[1]),
        "height": int(image.shape[0]),
        "face_count": len(locations),
        "phases": phases,
        "distances": distances,
        "quality": quality.model_dump(),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
