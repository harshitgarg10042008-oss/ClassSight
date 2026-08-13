import io
import json
import sys
from pathlib import Path

import face_recognition
import numpy as np
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
THRESHOLD = 0.60


def load_resized(path: Path, max_size: int = 800) -> np.ndarray:
    image = Image.open(path).convert("RGB")
    image.thumbnail((max_size, max_size))
    return np.asarray(image)


def reference_encoding(path: Path) -> np.ndarray:
    image = load_resized(path)
    locations = face_recognition.face_locations(image, model="hog")
    assert len(locations) == 1, f"{path.name}: expected one reference face, found {len(locations)}"
    return face_recognition.face_encodings(image, locations)[0]


def test_recognize_cross_photo_group_with_unenrolled_person():
    references = {student_id: reference_encoding(path) for student_id, (_, path) in REFERENCE_FILES.items()}
    group_image = load_resized(GROUP)
    group_locations = face_recognition.face_locations(group_image, model="hog")
    group_encodings = face_recognition.face_encodings(group_image, group_locations)
    assert len(group_encodings) == len(group_locations)
    assert len(group_encodings) >= 2, f"Expected enrolled and unenrolled faces, detected {len(group_encodings)}"

    enrolled = [
        {
            "student_id": student_id,
            "roll_number": name.upper(),
            "embedding": embedding.tolist(),
        }
        for student_id, (name, _) in REFERENCE_FILES.items()
        for embedding in [references[student_id]]
    ]

    group_buffer = io.BytesIO()
    Image.fromarray(group_image).save(group_buffer, format="JPEG", quality=95)
    with TestClient(app) as client:
        response = client.post(
            "/recognize",
            files={"image": (GROUP.name, group_buffer.getvalue(), "image/jpeg")},
            data={"enrolled_students": json.dumps(enrolled)},
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["face_count"] == len(group_encodings)
    assert len(body["matches"]) == len(group_encodings)

    rows = []
    for face_index, (encoding, match) in enumerate(zip(group_encodings, body["matches"])):
        distances = {
            student_id: float(face_recognition.face_distance([reference], encoding)[0])
            for student_id, reference in references.items()
        }
        expected_id, expected_distance = min(distances.items(), key=lambda item: item[1])
        expected_name = REFERENCE_FILES[expected_id][0] if expected_distance < THRESHOLD else "UNENROLLED/UNKNOWN"
        predicted_id = match.get("student_id")
        predicted_name = REFERENCE_FILES.get(predicted_id, ("NONE", None))[0] if predicted_id else "NONE"
        confidence = float(match["confidence_score"])
        distance = float(match["distance"])
        present = predicted_id is not None and bool(match["matched"]) and distance < THRESHOLD
        row = {
            "face_index": face_index,
            "expected": expected_name,
            "expected_distance": round(expected_distance, 6),
            "reference_distances": {REFERENCE_FILES[sid][0]: round(distance, 6) for sid, distance in distances.items()},
            "predicted": predicted_name,
            "confidence": confidence,
            "endpoint_distance": distance,
            "matched": bool(match["matched"]),
            "present_candidate": present,
        }
        rows.append(row)
        print(json.dumps(row, sort_keys=True))

    enrolled_rows = [row for row in rows if row["expected"] in {name for name, _ in REFERENCE_FILES.values()}]
    correct_enrolled = [
        row for row in enrolled_rows
        if row["predicted"] == row["expected"] and row["present_candidate"]
    ]
    unenrolled_rows = [row for row in rows if row["expected"] == "UNENROLLED/UNKNOWN"]
    false_present = [row for row in unenrolled_rows if row["present_candidate"]]

    print("FULL_RECOGNITION_OUTPUT=" + json.dumps(body, indent=2, sort_keys=True))
    print(f"SUMMARY correct_enrolled={len(correct_enrolled)}/{len(REFERENCE_FILES)}")
    print(f"SUMMARY unenrolled_faces={len(unenrolled_rows)} false_present={len(false_present)}")

    # These assertions are intentionally strict: the test must fail rather than
    # calling a distance-ineligible candidate or an unenrolled face PRESENT.
    assert len(correct_enrolled) == len(REFERENCE_FILES), (
        f"Cross-photo matching missed enrolled students; rows={rows}"
    )
    assert not false_present, f"Unenrolled face received a PRESENT candidate: {false_present}"
