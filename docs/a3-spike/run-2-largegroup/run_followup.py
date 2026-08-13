#!/usr/bin/env python3
"""A3 follow-up against the licensed classroom stand-in.

Ground truth is manual: candidate 0..3 are four visible classroom faces selected
from the source image and saved as reference crops. The production /recognize
route still determines detection, distances, confidence, and match decisions.
"""
from __future__ import annotations

import csv
import io
import json
import sys
import time
from pathlib import Path
from typing import Any

import face_recognition
from fastapi.testclient import TestClient
from PIL import Image

RUN = Path(__file__).resolve().parent
REPO = RUN.parents[2]
SERVICE = REPO / "face-service-fastapi"
SOURCE = RUN / "source" / "classroom_1899_original.jpg"
CROPS = RUN / "candidate-crops"
THRESHOLD = 0.6
sys.path.insert(0, str(SERVICE))
from main import app  # noqa: E402


def embedding(path: Path) -> list[float]:
    image = face_recognition.load_image_file(path)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise RuntimeError(f"{path.name}: expected one face, found {len(locations)}")
    return face_recognition.face_encodings(image, locations)[0].tolist()


def main() -> None:
    refs = []
    for index in range(4):
        path = CROPS / f"candidate_{index:02d}.jpg"
        refs.append({
            "student_id": 200 + index,
            "roll_number": f"CLASS1899-CANDIDATE-{index}",
            "embedding": embedding(path),
        })

    raw = SOURCE.read_bytes()
    with Image.open(io.BytesIO(raw)).convert("RGB") as image:
        request_buffer = io.BytesIO()
        image.save(request_buffer, format="JPEG", quality=95)
        request_bytes = request_buffer.getvalue()

    started = time.perf_counter()
    with TestClient(app) as client:
        response = client.post(
            "/recognize",
            files={"image": (SOURCE.name, request_bytes, "image/jpeg")},
            data={"enrolled_students": json.dumps(refs), "distance_threshold": str(THRESHOLD)},
        )
    elapsed_ms = round((time.perf_counter() - started) * 1000.0, 2)
    if response.status_code != 200:
        raise RuntimeError(f"HTTP {response.status_code}: {response.text}")
    body: dict[str, Any] = response.json()

    rows = []
    for match in body.get("matches", []):
        index = int(match["face_index"])
        predicted_id = match.get("student_id")
        predicted_index = (int(predicted_id) - 200) if isinstance(predicted_id, int) and 200 <= predicted_id < 204 else None
        rows.append({
            "face_index": index,
            "human_annotated_identity": f"candidate_{index:02d}" if index < 4 else None,
            "predicted_candidate": f"candidate_{predicted_index:02d}" if predicted_index is not None else None,
            "predicted_student_id": predicted_id,
            "matched": bool(match.get("matched")),
            "confidence_score": match.get("confidence_score"),
            "distance": match.get("distance"),
            "face_size_ratio": match.get("face_size_ratio"),
            "quality_warnings": match.get("quality_warnings", []),
        })

    known = [row for row in rows if row["human_annotated_identity"]]
    correct = sum(row["matched"] and row["predicted_candidate"] == row["human_annotated_identity"] for row in known)
    incorrect = sum(row["matched"] and row["predicted_candidate"] != row["human_annotated_identity"] for row in known)
    below_threshold = sum(not row["matched"] for row in known)
    face_ratios = [row["face_size_ratio"] for row in rows if row["face_size_ratio"] is not None]

    result = {
        "run": "A3 follow-up large-group stand-in",
        "source_file": str(SOURCE.relative_to(REPO)),
        "source_url": "https://commons.wikimedia.org/wiki/File:Grade_school_children_posed_in_classroom,_with_teacher_standing_in_back_of_room,_Washington,_D.C._LCCN96525653.jpg",
        "license_note": "Wikimedia Commons displays public-domain/no-known-restrictions information for this 1899 Library of Congress photograph.",
        "production_distance_threshold": THRESHOLD,
        "manual_visual_ground_truth": {
            "visible_faces_approximate": 23,
            "note": "Manual visual count is approximate: roughly 22 children plus one teacher are visibly represented; four detector-found frontal faces were selected as candidate_00..candidate_03 for the enrolled subset.",
            "enrolled_subset": [f"candidate_{index:02d}" for index in range(4)],
        },
        "faces_detected": body.get("face_count", 0),
        "faces_undetected_approximate": max(0, 23 - int(body.get("face_count", 0))),
        "faces_matched_correctly": correct,
        "faces_matched_incorrectly": incorrect,
        "enrolled_faces_below_match_threshold": below_threshold,
        "face_size_warning_threshold": 0.0005,
        "face_size_warning_fired": any(float(value) < 0.0005 for value in face_ratios),
        "face_size_ratios_detected": face_ratios,
        "detection_recognition_time_ms": elapsed_ms,
        "quality": body.get("quality", {}),
        "rows": rows,
    }

    (RUN / "followup-results.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    with (RUN / "followup-results.csv").open("w", newline="", encoding="utf-8") as handle:
        fields = ["face_index", "human_annotated_identity", "predicted_candidate", "predicted_student_id", "matched", "confidence_score", "distance", "face_size_ratio", "quality_warnings"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({key: json.dumps(row[key]) if isinstance(row[key], list) else row[key] for key in fields})
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
