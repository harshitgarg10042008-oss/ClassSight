#!/usr/bin/env python3
"""Measurement-only A3 spike using the current FastAPI /recognize route."""
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

REPO = Path(__file__).resolve().parents[2]
SERVICE = REPO / "face-service-fastapi"
FIXTURES = SERVICE / "tests" / "fixtures"
OUT = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE))
from main import app  # noqa: E402

THRESHOLD = 0.6
REFERENCES = {
    101: ("Obama", FIXTURES / "obama_reference.jpg"),
    102: ("Biden", FIXTURES / "biden_reference.jpg"),
}
PHOTOS = [
    ("obama_biden_group_2010", FIXTURES / "obama_biden_group_2010.jpg", {0: "Obama", 1: "Biden"}),
]


def reference_embedding(path: Path):
    image = face_recognition.load_image_file(path)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise RuntimeError(f"{path.name}: expected exactly one reference face; found {len(locations)}")
    return face_recognition.face_encodings(image, locations)[0]


def main() -> None:
    enrolled = []
    for student_id, (name, path) in REFERENCES.items():
        enrolled.append({"student_id": student_id, "roll_number": name.upper(), "embedding": reference_embedding(path).tolist()})

    photo_outputs: list[dict[str, Any]] = []
    with TestClient(app) as client:
        for name, path, annotations in PHOTOS:
            raw = path.read_bytes()
            with Image.open(io.BytesIO(raw)).convert("RGB") as pil:
                pil.thumbnail((800, 800))
                request_buffer = io.BytesIO()
                pil.save(request_buffer, format="JPEG", quality=95)
                request_bytes = request_buffer.getvalue()
            started = time.perf_counter()
            response = client.post(
                "/recognize",
                files={"image": (path.name, request_bytes, "image/jpeg")},
                data={"enrolled_students": json.dumps(enrolled), "distance_threshold": str(THRESHOLD)},
            )
            elapsed_ms = round((time.perf_counter() - started) * 1000.0, 2)
            if response.status_code != 200:
                raise RuntimeError(f"{path.name}: HTTP {response.status_code}: {response.text}")
            body = response.json()
            rows = []
            for match in body.get("matches", []):
                face_index = int(match["face_index"])
                annotated = annotations.get(face_index)
                predicted_id = match.get("student_id")
                predicted_name = next((n for sid, (n, _) in REFERENCES.items() if sid == predicted_id), None)
                rows.append({
                    "face_index": face_index,
                    "human_annotated_identity": annotated,
                    "predicted_student": predicted_name,
                    "predicted_student_id": predicted_id,
                    "matched": bool(match.get("matched")),
                    "confidence_score": match.get("confidence_score"),
                    "distance": match.get("distance"),
                    "face_size_ratio": match.get("face_size_ratio"),
                    "quality_warnings": match.get("quality_warnings", []),
                })
            known = [r for r in rows if r["human_annotated_identity"]]
            correct = sum(r["matched"] and r["predicted_student"] == r["human_annotated_identity"] for r in known)
            incorrect = sum(r["matched"] and r["predicted_student"] != r["human_annotated_identity"] for r in known)
            unknown_false_present = sum(r["matched"] for r in rows if not r["human_annotated_identity"])
            correct_conf = [float(r["confidence_score"]) for r in known if r["matched"] and r["predicted_student"] == r["human_annotated_identity"]]
            photo_outputs.append({
                "filename": path.name,
                "source_type": "provisional stand-in; not the requested 30+ back-of-room classroom set",
                "faces_detected": body.get("face_count", 0),
                "faces_matched_correctly": correct,
                "faces_matched_incorrectly": incorrect,
                "faces_undetected": None,
                "human_annotated_enrolled_faces": len(known),
                "unknown_faces_with_false_present": unknown_false_present,
                "avg_confidence_for_correct_matches": round(sum(correct_conf) / len(correct_conf), 6) if correct_conf else None,
                "detection_recognition_time_ms": elapsed_ms,
                "quality": body.get("quality", {}),
                "rows": rows,
            })

    output = {
        "threshold": THRESHOLD,
        "references": {str(sid): {"name": name, "file": str(path.relative_to(REPO))} for sid, (name, path) in REFERENCES.items()},
        "ground_truth_note": "Only face 0=Obama and face 1=Biden in the conference-room group were human-annotated by visual inspection. Other faces are not treated as known identities. The two wide classroom/auditorium fixtures were verified separately through live /capture in STAGE11_12_LIVE_EVIDENCE.md because local HOG processing of those large images exceeded the sandbox CPU window.",
        "photos": photo_outputs,
    }
    (OUT / "a3-results.json").write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    with (OUT / "a3-results.csv").open("w", newline="", encoding="utf-8") as handle:
        fields = ["filename", "face_index", "human_annotated_identity", "predicted_student", "predicted_student_id", "matched", "confidence_score", "distance", "face_size_ratio", "quality_warnings"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for photo in photo_outputs:
            for row in photo["rows"]:
                writer.writerow({"filename": photo["filename"], **{k: json.dumps(row[k]) if isinstance(row[k], list) else row[k] for k in fields[1:]}})
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
