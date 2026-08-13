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

DEFAULT_REFERENCES = {
    101: ("Obama", FIXTURES / "obama_reference.jpg"),
    102: ("Biden", FIXTURES / "biden_reference.jpg"),
}


def embedding(path: Path):
    image = face_recognition.load_image_file(path)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise RuntimeError(f"Reference {path.name} has {len(locations)} faces; expected exactly one")
    return face_recognition.face_encodings(image, locations)[0]


def references_for_spec(spec: dict):
    raw = spec.get("references")
    if not raw:
        return DEFAULT_REFERENCES
    resolved = {}
    for item in raw:
        resolved[int(item["student_id"])] = (item["name"], ROOT / item["path"])
    return resolved


def main() -> int:
    expected = json.loads(EXPECTED.read_text(encoding="utf-8"))
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    results = []

    with TestClient(app) as client:
        for filename, spec in expected.items():
            references = references_for_spec(spec)
            enrolled = [
                {"student_id": sid, "roll_number": name.upper(), "embedding": embedding(path).tolist()}
                for sid, (name, path) in references.items()
            ]
            path = Path(__file__).parent / filename
            raw = path.read_bytes()
            with Image.open(io.BytesIO(raw)).convert("RGB") as pil:
                resize_max = spec.get("resize_max", 800)
                if resize_max:
                    pil.thumbnail((resize_max, resize_max))
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
            name_by_id = {sid: name for sid, (name, _) in references.items()}
            expected_by_face = {int(k): v for k, v in spec.get("expected_by_face", {}).items()}
            details = []
            predicted = []
            correct_identity_count = 0
            identity_mismatch_count = 0
            false_positive_count = 0
            for match in body.get("matches", []):
                face_index = int(match.get("face_index"))
                sid = match.get("student_id")
                predicted_name = name_by_id.get(sid)
                expected_name = expected_by_face.get(face_index)
                matched = bool(match.get("matched"))
                correct_identity = bool(matched and expected_name and predicted_name == expected_name)
                if correct_identity:
                    correct_identity_count += 1
                elif expected_name and matched:
                    identity_mismatch_count += 1
                elif matched and expected_by_face and not expected_name:
                    false_positive_count += 1
                if predicted_name and matched:
                    predicted.append(predicted_name)
                details.append({
                    "face_index": face_index,
                    "expected_identity": expected_name,
                    "predicted": predicted_name,
                    "matched": matched,
                    "identity_correct": correct_identity,
                    "confidence": match.get("confidence_score"),
                    "distance": match.get("distance"),
                    "face_size_ratio": match.get("face_size_ratio"),
                    "quality_warnings": match.get("quality_warnings", []),
                })

            expected_present = sorted(spec.get("expected_present", list(expected_by_face.values())))
            predicted_unique = sorted(set(predicted))
            false_negatives = sorted(set(expected_present) - set(predicted_unique))
            false_positives = sorted(set(predicted_unique) - set(expected_present))
            expected_identity_count = len(expected_by_face) or len(expected_present)
            correct_for_accuracy = correct_identity_count if expected_by_face else expected_identity_count - len(false_negatives)
            results.append({
                "filename": filename,
                "expected_present": expected_present,
                "predicted_present": predicted_unique,
                "false_negatives": false_negatives,
                "false_positives": false_positives,
                "faces_detected": body.get("face_count", 0),
                "expected_identity_count": expected_identity_count,
                "correct_identity_count": correct_for_accuracy,
                "identity_mismatch_count": identity_mismatch_count,
                "false_positive_count": false_positive_count + len(false_positives),
                "details": details,
                "quality": body.get("quality", {}),
                "pass": not false_negatives and not false_positives and identity_mismatch_count == 0 and false_positive_count == 0,
            })

    total_expected = sum(row["expected_identity_count"] for row in results)
    total_correct = sum(row["correct_identity_count"] for row in results)
    false_positive_count = sum(row["false_positive_count"] for row in results)
    false_negative_count = sum(len(row["false_negatives"]) for row in results)
    identity_mismatch_count = sum(row["identity_mismatch_count"] for row in results)
    accuracy = round(100.0 * total_correct / total_expected, 2) if total_expected else 0.0
    row = {
        "date": datetime.now(timezone.utc).isoformat(),
        "git_commit": commit,
        "threshold": THRESHOLD,
        "overall_accuracy_pct": accuracy,
        "false_positive_count": false_positive_count,
        "false_negative_count": false_negative_count,
        "identity_mismatch_count": identity_mismatch_count,
    }
    exists = LOG.exists()
    with LOG.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=row.keys())
        if not exists:
            writer.writeheader()
        writer.writerow(row)
    report = {"summary": row, "photos": results}
    print(json.dumps(report, indent=2))
    return 0 if false_positive_count == 0 and false_negative_count == 0 and identity_mismatch_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
