#!/usr/bin/env python3
"""Run the legacy FaceNet and Java SFace pipelines on the same golden images.

Prerequisites:
  - legacy FastAPI service at LEGACY_URL (default http://127.0.0.1:8000)
  - Spring Boot with --spring.profiles.active=golden-comparison at NEW_URL
  - YuNet and SFace ONNX files in the configured Spring model directory
  - Python 3.10+ and requests

The script writes a complete JSON report and exits non-zero when prerequisites are
missing or either pipeline returns an error. It never turns missing evidence into
an accuracy pass.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
GOLDEN = ROOT / "golden-set"
EXPECTED = GOLDEN / "expected-results.json"
LEGACY_FIXTURES = ROOT / "face-service-fastapi" / "tests" / "fixtures"
DEFAULT_REFERENCES = {
    "Obama": LEGACY_FIXTURES / "obama_reference.jpg",
    "Biden": LEGACY_FIXTURES / "biden_reference.jpg",
}


def reference_specs(spec: dict[str, Any]) -> list[tuple[str, Path, int]]:
    raw = spec.get("references")
    if raw:
        return [(str(item["name"]), ROOT / str(item["path"]), int(item["student_id"])) for item in raw]
    return [(name, path, index + 1) for index, (name, path) in enumerate(DEFAULT_REFERENCES.items())]


def expected_for_face(spec: dict[str, Any]) -> dict[int, str]:
    return {int(key): str(value) for key, value in spec.get("expected_by_face", {}).items()}


def legacy_enroll(session: requests.Session, base_url: str, path: Path) -> list[float]:
    with path.open("rb") as handle:
        response = session.post(f"{base_url}/enroll", files={"image": (path.name, handle, "image/jpeg")}, timeout=180)
    response.raise_for_status()
    return response.json()["embedding"]


def run_legacy(session: requests.Session, base_url: str, image_path: Path, references: list[tuple[str, Path, int]]) -> dict[str, Any]:
    enrolled = [{"student_id": student_id, "roll_number": name, "embedding": legacy_enroll(session, base_url, path)}
                for name, path, student_id in references]
    with image_path.open("rb") as handle:
        response = session.post(
            f"{base_url}/recognize",
            files={"image": (image_path.name, handle, "image/jpeg")},
            data={"enrolled_students": json.dumps(enrolled), "distance_threshold": "0.6"},
            timeout=300,
        )
    response.raise_for_status()
    return response.json()


def run_sface(session: requests.Session, base_url: str, image_path: Path, references: list[tuple[str, Path, int]]) -> dict[str, Any]:
    handles = [path.open("rb") for _, path, _ in references]
    try:
        files: list[tuple[str, tuple[str, Any, str]]] = [("references", (path.name, handle, "image/jpeg"))
                                                         for (_, path, _), handle in zip(references, handles)]
        data = [("referenceIds", str(student_id)) for _, _, student_id in references]
        with image_path.open("rb") as image_handle:
            files.append(("image", (image_path.name, image_handle, "image/jpeg")))
            response = session.post(f"{base_url}/internal/golden/recognize", files=files, data=data, timeout=300)
        response.raise_for_status()
        return response.json()
    finally:
        for handle in handles:
            handle.close()


def summarize_matches(body: dict[str, Any], name_by_id: dict[int, str], expected: dict[int, str]) -> dict[str, Any]:
    details = []
    correct = 0
    matched = 0
    for raw in body.get("matches", []):
        face_index = int(raw.get("face_index", -1))
        student_id = raw.get("student_id")
        predicted = name_by_id.get(int(student_id)) if student_id is not None else None
        is_matched = bool(raw.get("matched"))
        if is_matched:
            matched += 1
        identity_correct = bool(is_matched and expected.get(face_index) == predicted)
        if identity_correct:
            correct += 1
        details.append({
            "face_index": face_index,
            "expected": expected.get(face_index),
            "predicted": predicted,
            "matched": is_matched,
            "confidence": raw.get("confidence_score"),
            "cosine_similarity": raw.get("cosine_similarity"),
            "distance": raw.get("distance"),
            "identity_correct": identity_correct,
        })
    return {"matched_faces": matched, "correct_faces": correct, "details": details}


def threshold_table(photos: list[dict[str, Any]]) -> list[dict[str, Any]]:
    scores = sorted({0.0, 1.0, *[
        float(detail["cosine_similarity"])
        for photo in photos
        for detail in photo["new"]["details"]
        if detail["cosine_similarity"] is not None
    ]}, reverse=True)
    table = []
    for threshold in scores:
        true_positives = false_positives = false_negatives = 0
        for photo in photos:
            for detail in photo["new"]["details"]:
                expected = detail["expected"]
                predicted = detail["predicted"]
                accepted = detail["cosine_similarity"] is not None and detail["cosine_similarity"] >= threshold
                if expected and accepted and predicted == expected:
                    true_positives += 1
                elif accepted:
                    false_positives += 1
                elif expected:
                    false_negatives += 1
        total_expected = true_positives + false_negatives
        table.append({
            "threshold": threshold,
            "true_positives": true_positives,
            "false_positives": false_positives,
            "false_negatives": false_negatives,
            "match_rate_pct": round(100 * true_positives / total_expected, 2) if total_expected else 0.0,
        })
    return table


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-url", default=os.getenv("LEGACY_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--new-url", default=os.getenv("NEW_URL", "http://127.0.0.1:8080"))
    parser.add_argument("--output", type=Path, default=ROOT / "docs" / "golden-comparison.json")
    args = parser.parse_args()

    expected_specs = json.loads(EXPECTED.read_text(encoding="utf-8"))
    legacy = requests.Session()
    new = requests.Session()
    legacy_url = args.legacy_url.rstrip("/")
    new_url = args.new_url.rstrip("/")
    try:
        legacy.get(f"{legacy_url}/health", timeout=10).raise_for_status()
        new.get(f"{new_url}/actuator/health", timeout=10).raise_for_status()
    except requests.RequestException as exc:
        print(f"comparison prerequisites unavailable: {exc}", file=sys.stderr)
        return 2

    report: dict[str, Any] = {"legacy_url": legacy.base_url, "new_url": new.base_url, "photos": []}
    for relative_name, spec in expected_specs.items():
        image_path = GOLDEN / relative_name
        references = reference_specs(spec)
        names = {student_id: name for name, _, student_id in references}
        expected = expected_for_face(spec)
        old_body = run_legacy(legacy, legacy_url, image_path, references)
        new_body = run_sface(new, new_url, image_path, references)
        old_summary = summarize_matches(old_body, names, expected)
        new_summary = summarize_matches(new_body, names, expected)
        report["photos"].append({
            "image": relative_name,
            "expected": expected,
            "old": old_summary,
            "new": new_summary,
            "agree": old_summary["details"] == new_summary["details"],
            "manual_assessment": "Compare each disagreement with the expected-results visual notes before accepting a threshold.",
        })

    new_scores = [detail["cosine_similarity"] for photo in report["photos"] for detail in photo["new"]["details"]
                  if detail["cosine_similarity"] is not None]
    sweep = threshold_table(report["photos"])
    report["summary"] = {
        "images": len(report["photos"]),
        "disagreements": sum(not photo["agree"] for photo in report["photos"]),
        "old_matched_faces": sum(photo["old"]["matched_faces"] for photo in report["photos"]),
        "new_matched_faces": sum(photo["new"]["matched_faces"] for photo in report["photos"]),
        "old_correct_faces": sum(photo["old"]["correct_faces"] for photo in report["photos"]),
        "new_correct_faces": sum(photo["new"]["correct_faces"] for photo in report["photos"]),
        "new_confidence_scores": new_scores,
        "threshold_sweep": sweep,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
