import json
import sys
from pathlib import Path

import face_recognition

sys.path.insert(0, str(Path(__file__).parents[1]))
from fastapi.testclient import TestClient

from main import app


PHOTO = Path(__file__).parent / "fixtures" / "classroom_group.jpg"


def test_recognize_classroom_group_photo():
    image = face_recognition.load_image_file(PHOTO)
    locations = face_recognition.face_locations(image, model="hog")
    encodings = face_recognition.face_encodings(image, locations)

    assert len(locations) >= 5, f"Expected a group photo, detected {len(locations)} face(s)"
    assert len(encodings) == len(locations)

    enrolled = [
        {
            "student_id": index + 1,
            "roll_number": f"GROUP-{index + 1:02d}",
            "embedding": encoding.tolist(),
        }
        for index, encoding in enumerate(encodings)
    ]

    with TestClient(app) as client:
        with PHOTO.open("rb") as photo:
            response = client.post(
                "/recognize",
                files={"image": (PHOTO.name, photo, "image/jpeg")},
                data={"enrolled_students": json.dumps(enrolled)},
            )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["face_count"] == len(locations)
    assert len(body["matches"]) == len(locations)
    assert all(match["matched"] for match in body["matches"])
    assert len({match["student_id"] for match in body["matches"]}) == len(locations)
    assert min(match["confidence_score"] for match in body["matches"]) >= 0.99
