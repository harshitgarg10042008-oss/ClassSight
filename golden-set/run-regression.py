#!/usr/bin/env python3
"""Manual Stage 13 regression runner for real golden-set photos."""
from __future__ import annotations

import csv
import io
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import face_recognition
from fastapi.testclient import TestClient
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT / "face-service-fastapi"
FIXTURES = SERVICE / "tests" / "fixtures"
EXPECTED = Path(__file__).with_name("expected-results.json")
LOG = Path(__file__).with_name("accuracy-log.csv")
THRESHOLD = 0.6
sys.path.insert(0, str(SERVICE))
from main import app  # noqa: E402

REFERENCES = {
    101: ("Obama", FIXTURES / "obama_reference.jpg"),
    102: ("Biden", FIXTURES / "biden_reference.jpg"),
}


def embedding(path: Path):
    image = face_recognition.load_image_file(path)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise RuntimeError(f"Reference {path.name} has {len(locations)} faces; expected exactly one")
    return face_recognition.face_encodings(image, locations)[0]


def main() -> int:
    enrolled = [
        {"student_id": sid, "roll_number": name.upper(), "embedding": embedding(path).tolist()}
        for sid, (name, path) in REFERENCES.items()
    ]
    expected = json.loads(EXPECTED.read_text(encoding="utf-8"))
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    results = []
    with TestClient(app) as client:
        for filename, spec in expected.items():
            path = Path(__file__).with_name(filename)
            raw = path.read_bytes()
            with Image.open(io.BytesIO(raw)).convert("RGB") as pil:
                pil.thumbnail((800, 800))
                buf = io.BytesIO()
                pil.save(buf, format="JPEG", quality=95)
                request_bytes = buf.getvalue()
            response = client.post(
                "/recognize",
                files={"image": (filename, request_bytes, "image/jpeg")},
                data={"enrolled_students": json.dumps(enrolled), "distance_threshold": str(THRESHOLD)},
            )
            if response.status_code != 200:
                raise RuntimeError(f"{filename}: HTTP {response.status_code}: {response.text}")
            body = response.json()
            predicted = []
            details = []
            for match in body.get("matches", []):
                sid = match.get("student_id")
                name = next((n for candidate_id, (n, _) in REFERENCES.items() if candidate_id == sid), None)
                details.append({"face_index": match.get("face_index"), "predicted": name, "matched": match.get("matched"), "confidence": match.get("confidence_score"), "distance": match.get("distance")})
                if name and match.get("matched"):
                    predicted.append(name)
            expected_present = sorted(spec["expected_present"])
            predicted_unique = sorted(set(predicted))
            false_negatives = sorted(set(expected_present) - set(predicted_unique))
            false_positives = sorted(set(predicted_unique) - set(expected_present))
            results.append({"filename": filename, "expected_present": expected_present, "predicted_present": predicted_unique, "false_negatives": false_negatives, "false_positives": false_positives, "faces_detected": body.get("face_count", 0), "details": details, "pass": not false_negatives and not false_positives})
    total_expected = sum(len(row["expected_present"]) for row in results)
    total_correct = sum(len(row["expected_present"]) - len(row["false_negatives"]) for row in results)
    false_positive_count = sum(len(row["false_positives"]) for row in results)
    false_negative_count = sum(len(row["false_negatives"]) for row in results)
    accuracy = round(100.0 * total_correct / total_expected, 2) if total_expected else 0.0
    row = {"date": datetime.now(timezone.utc).isoformat(), "git_commit": commit, "threshold": THRESHOLD, "overall_accuracy_pct": accuracy, "false_positive_count": false_positive_count, "false_negative_count": false_negative_count}
    exists = LOG.exists()
    with LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=row.keys())
        if not exists:
            writer.writeheader()
        writer.writerow(row)
    report = {"summary": row, "photos": results}
    print(json.dumps(report, indent=2))
    return 0 if false_positive_count == 0 and false_negative_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
