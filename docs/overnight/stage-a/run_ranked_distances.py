#!/usr/bin/env python3
from __future__ import annotations

import io
import json
import sys
import time
from pathlib import Path

import face_recognition
import numpy as np
from fastapi.testclient import TestClient
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SERVICE = ROOT / "face-service-fastapi"
ARCHIVAL = ROOT / "docs/a3-spike/run-2-largegroup/source/classroom_1899_original.jpg"
ARCHIVAL_CROPS = ROOT / "docs/a3-spike/run-2-largegroup/candidate-crops"
MODERN = ROOT / "docs/overnight/stage-a/source/modern_classroom_selfie.jpg"
MODERN_CROPS = ROOT / "docs/overnight/stage-a/modern-crops"
THRESHOLD = 0.6
sys.path.insert(0, str(SERVICE))
from main import app  # noqa: E402


def load_embedding(path: Path) -> np.ndarray:
    image = face_recognition.load_image_file(path)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise RuntimeError(f"{path}: expected one face, found {len(locations)}")
    return face_recognition.face_encodings(image, locations)[0]


def image_bytes(path: Path) -> bytes:
    return path.read_bytes()


def run_case(label: str, photo: Path, crop_dir: Path, enrolled_count: int) -> dict:
    references = []
    for index in range(enrolled_count):
        references.append({
            "student_id": 500 + index,
            "name": f"candidate_{index:02d}",
            "path": crop_dir / f"candidate_{index:02d}.jpg",
            "embedding": load_embedding(crop_dir / f"candidate_{index:02d}.jpg"),
        })
    known_matrix = np.asarray([item["embedding"] for item in references], dtype=np.float64)
    image = face_recognition.load_image_file(photo)
    locations = face_recognition.face_locations(image, model="hog")
    encodings = face_recognition.face_encodings(image, locations)
    if len(encodings) != len(locations):
        raise RuntimeError(f"{label}: encoding count did not match detection count")

    enrolled_payload = [
        {"student_id": item["student_id"], "roll_number": item["name"].upper(), "embedding": item["embedding"].tolist()}
        for item in references
    ]
    started = time.perf_counter()
    with TestClient(app) as client:
        response = client.post(
            "/recognize",
            files={"image": (photo.name, image_bytes(photo), "image/jpeg")},
            data={"enrolled_students": json.dumps(enrolled_payload), "distance_threshold": str(THRESHOLD)},
        )
    endpoint_ms = round((time.perf_counter() - started) * 1000.0, 2)
    if response.status_code != 200:
        raise RuntimeError(f"{label}: HTTP {response.status_code}: {response.text}")
    endpoint_body = response.json()
    endpoint_by_face = {int(row["face_index"]): row for row in endpoint_body.get("matches", [])}

    faces = []
    for face_index, encoding in enumerate(encodings):
        distances = face_recognition.face_distance(known_matrix, encoding)
        ranked = sorted(
            [{"identity": item["name"], "student_id": item["student_id"], "distance": round(float(distances[idx]), 6)} for idx, item in enumerate(references)],
            key=lambda row: row["distance"],
        )
        face_top, face_right, face_bottom, face_left = locations[face_index]
        ratio = round((face_bottom - face_top) * (face_right - face_left) / float(image.shape[0] * image.shape[1]), 6)
        endpoint_row = endpoint_by_face.get(face_index, {})
        faces.append({
            "face_index": face_index,
            "human_annotated_identity": f"candidate_{face_index:02d}" if face_index < enrolled_count else None,
            "face_size_ratio": ratio,
            "ranked_distances": ranked,
            "correct_identity_rank": next((rank + 1 for rank, row in enumerate(ranked) if row["identity"] == f"candidate_{face_index:02d}"), None) if face_index < enrolled_count else None,
            "correct_identity_distance": next((row["distance"] for row in ranked if row["identity"] == f"candidate_{face_index:02d}"), None) if face_index < enrolled_count else None,
            "production_winner": next((row["identity"] for row in ranked if row["student_id"] == endpoint_row.get("student_id")), None),
            "production_distance": endpoint_row.get("distance"),
            "production_confidence": endpoint_row.get("confidence_score"),
            "production_matched": endpoint_row.get("matched"),
            "production_quality_warnings": endpoint_row.get("quality_warnings", []),
        })
    return {
        "label": label,
        "photo": str(photo.relative_to(ROOT)),
        "faces_detected": endpoint_body.get("face_count", len(locations)),
        "enrolled_count": enrolled_count,
        "unseen_detected_faces": max(0, len(locations) - enrolled_count),
        "endpoint_time_ms": endpoint_ms,
        "quality": endpoint_body.get("quality", {}),
        "faces": faces,
    }


def main() -> None:
    result = {
        "threshold": THRESHOLD,
        "note": "Investigation-only ranked distances. Production thresholds and matching code were not changed.",
        "cases": [
            run_case("archival_1899", ARCHIVAL, ARCHIVAL_CROPS, 4),
            run_case("modern_classroom_selfie", MODERN, MODERN_CROPS, 4),
        ],
    }
    output = Path(__file__).with_name("ranked-distance-results.json")
    output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
