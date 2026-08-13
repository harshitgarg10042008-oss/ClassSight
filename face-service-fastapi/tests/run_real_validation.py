import json
import sys
from pathlib import Path

import face_recognition
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).parents[1]))
from main import app

FIXTURES = Path(__file__).parent / "fixtures"
REFERENCE_FILES = {
    101: ("Obama", FIXTURES / "obama_reference.jpg"),
    102: ("Biden", FIXTURES / "biden_reference.jpg"),
}
GROUP = FIXTURES / "obama_biden_group_2010.jpg"
THRESHOLD = 0.6


def one_face_encoding(path: Path):
    portrait = Image.open(path).convert("RGB")
    portrait.thumbnail((800, 800))
    image = __import__("numpy").asarray(portrait)
    locations = face_recognition.face_locations(image, model="hog")
    if len(locations) != 1:
        raise AssertionError(f"{path.name}: expected exactly one face, found {len(locations)}")
    return face_recognition.face_encodings(image, locations)[0]


def main():
    reference_encodings = {student_id: one_face_encoding(path) for student_id, (_, path) in REFERENCE_FILES.items()}
    # The source is a 4096px public-domain image. Downscale only for CPU runtime;
    # it remains the same distinct group photograph, not a crop or enrollment image.
    group_pil = Image.open(GROUP).convert("RGB")
    group_pil.thumbnail((800, 800))
    group_buffer = __import__("io").BytesIO()
    group_pil.save(group_buffer, format="JPEG", quality=95)
    group_bytes = group_buffer.getvalue()
    group_image = face_recognition.load_image_file(__import__("io").BytesIO(group_bytes))
    group_locations = face_recognition.face_locations(group_image, model="hog")
    group_encodings = face_recognition.face_encodings(group_image, group_locations)
    enrolled = [
        {
            "student_id": student_id,
            "roll_number": name.upper(),
            "embedding": encoding.tolist(),
        }
        for student_id, (name, _) in REFERENCE_FILES.items()
        for encoding in [reference_encodings[student_id]]
    ]

    with TestClient(app) as client:
        response = client.post(
            "/recognize",
            files={"image": (GROUP.name, group_bytes, "image/jpeg")},
            data={
                "enrolled_students": json.dumps(enrolled),
                "distance_threshold": str(THRESHOLD),
            },
        )
    if response.status_code != 200:
        raise AssertionError(f"recognize failed: {response.status_code} {response.text}")

    body = response.json()
    print(f"group_photo={GROUP.name}")
    print(f"reference_photos={', '.join(path.name for _, path in REFERENCE_FILES.values())}")
    print(f"face_count={body['face_count']}")
    print(f"distance_threshold={THRESHOLD:.2f}")
    print("confidence_note=display-only sigmoid; distance threshold remains the match decision")
    print("face_index | expected_identity_by_reference_distance | expected_distance | predicted_student | endpoint_confidence | endpoint_distance | outcome")

    rows = []
    for index, (encoding, match) in enumerate(zip(group_encodings, body["matches"])):
        distances = {
            student_id: float(face_recognition.face_distance([reference], encoding)[0])
            for student_id, reference in reference_encodings.items()
        }
        expected_id, expected_distance = min(distances.items(), key=lambda item: item[1])
        expected_identity = REFERENCE_FILES[expected_id][0] if expected_distance < 0.6 else "UNENROLLED/UNKNOWN"
        predicted_id = match.get("student_id")
        predicted_name = REFERENCE_FILES.get(predicted_id, ("NONE", None))[0] if predicted_id else "NONE"
        confidence = float(match["confidence_score"])
        endpoint_distance = float(match["distance"])
        matched = bool(match["matched"]) and endpoint_distance < THRESHOLD
        outcome = "PRESENT_CANDIDATE" if predicted_id and matched else "REVIEW_OR_NO_MATCH"
        row = {
            "face_index": index,
            "expected_identity_by_reference_distance": expected_identity,
            "expected_distance": round(expected_distance, 6),
            "reference_distances": {REFERENCE_FILES[sid][0]: round(distance, 6) for sid, distance in distances.items()},
            "predicted_student": predicted_name,
            "predicted_student_id": predicted_id,
            "endpoint_confidence": confidence,
            "endpoint_distance": endpoint_distance,
            "matched": matched,
            "outcome": outcome,
        }
        rows.append(row)
        print(
            f"{index:10d} | {expected_identity:42s} | {expected_distance:16.6f} | "
            f"{predicted_name:17s} | {confidence:18.6f} | {endpoint_distance:16.6f} | {outcome}"
        )

    print("\nfull_json=")
    print(json.dumps({"response": body, "analysis": rows}, indent=2))

    enrolled_correct = [
        row for row in rows
        if row["expected_identity_by_reference_distance"] in {name for name, _ in REFERENCE_FILES.values()}
        and row["predicted_student"] == row["expected_identity_by_reference_distance"]
        and row["matched"]
    ]
    false_present = [
        row for row in rows
        if row["expected_identity_by_reference_distance"] == "UNENROLLED/UNKNOWN"
        and row["matched"]
    ]
    print(f"\ncorrect_enrolled_matches={len(enrolled_correct)}/{len(REFERENCE_FILES)}")
    print(f"false_present_candidates_for_unenrolled_faces={len(false_present)}")
    print("validation_interpretation=" + ("PASS" if len(enrolled_correct) == len(REFERENCE_FILES) and not false_present else "FAIL_OR_REVIEW_REQUIRED"))


if __name__ == "__main__":
    main()
