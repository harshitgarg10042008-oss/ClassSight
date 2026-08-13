#!/usr/bin/env python3
from __future__ import annotations

import io
import json
import sys
import time
from pathlib import Path

import face_recognition
from fastapi.testclient import TestClient
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SERVICE = ROOT / "face-service-fastapi"
REFERENCE = SERVICE / "tests/fixtures/obama_reference.jpg"
GROUP = ROOT / "docs/overnight/stage-a/source/modern_classroom_selfie.jpg"
GROUP_FALLBACK = SERVICE / "tests/fixtures/obama_biden_group_2010.jpg"
if not GROUP.exists():
    GROUP = GROUP_FALLBACK
sys.path.insert(0, str(SERVICE))
from main import app  # noqa: E402


def timed_embedding(path: Path, repeats: int = 3) -> dict:
    image = face_recognition.load_image_file(path)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise RuntimeError(f"{path}: expected exactly one face, found {len(locations)}")
    timings = []
    embedding = None
    for _ in range(repeats):
        started = time.perf_counter()
        embedding = face_recognition.face_encodings(image, locations)[0]
        timings.append((time.perf_counter() - started) * 1000.0)
    return {
        "path": str(path.relative_to(ROOT)),
        "image_shape": list(image.shape),
        "faces_detected": len(locations),
        "embedding_dimension": len(embedding),
        "runs": repeats,
        "timings_ms": [round(value, 2) for value in timings],
        "mean_ms": round(sum(timings) / len(timings), 2),
        "min_ms": round(min(timings), 2),
        "max_ms": round(max(timings), 2),
    }


def main() -> None:
    reference = face_recognition.load_image_file(REFERENCE)
    ref_locations = face_recognition.face_locations(reference, model="hog")
    ref_embedding = face_recognition.face_encodings(reference, ref_locations)[0]
    enrolled = [{"student_id": 101, "roll_number": "OBAMA", "embedding": ref_embedding.tolist()}]

    raw = GROUP.read_bytes()
    with Image.open(io.BytesIO(raw)).convert("RGB") as image:
        request_buffer = io.BytesIO()
        image.save(request_buffer, format="JPEG", quality=95)
        request_bytes = request_buffer.getvalue()

    timings = []
    responses = []
    with TestClient(app) as client:
        for _ in range(3):
            started = time.perf_counter()
            response = client.post(
                "/recognize",
                files={"image": (GROUP.name, request_bytes, "image/jpeg")},
                data={"enrolled_students": json.dumps(enrolled), "distance_threshold": "0.6"},
            )
            elapsed = (time.perf_counter() - started) * 1000.0
            if response.status_code != 200:
                raise RuntimeError(f"recognition failed: HTTP {response.status_code}: {response.text}")
            timings.append(elapsed)
            body = response.json()
            responses.append({
                "face_count": body.get("face_count"),
                "matches": body.get("matches"),
                "quality": body.get("quality"),
            })

    report = {
        "benchmark": "A4 CPU-first face embedding and group recognition",
        "runtime": "CPU-only local FastAPI TestClient path",
        "single_face_embedding": timed_embedding(REFERENCE),
        "group_photo": {
            "path": str(GROUP.relative_to(ROOT)),
            "request_bytes": len(request_bytes),
            "runs": len(timings),
            "timings_ms": [round(value, 2) for value in timings],
            "mean_ms": round(sum(timings) / len(timings), 2),
            "min_ms": round(min(timings), 2),
            "max_ms": round(max(timings), 2),
            "responses": responses,
        },
        "recommendation": "Use the measured end-to-end latency as the baseline. A real 30+ face back-of-room image is still required before selecting downscaling or a lighter detector; this benchmark does not change production thresholds.",
    }
    output = Path(__file__).with_name("benchmark-results.json")
    output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
