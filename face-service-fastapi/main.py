from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, ValidationError
import face_recognition
import numpy as np
from PIL import Image
import io
import json
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Service FastAPI")


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    face_count: int
    message: str


class EnrolledStudent(BaseModel):
    student_id: int
    roll_number: Optional[str] = None
    embedding: list[float] = Field(min_length=1)


class FaceMatch(BaseModel):
    face_index: int
    student_id: Optional[int] = None
    roll_number: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    distance: Optional[float] = None
    matched: bool


class RecognitionResponse(BaseModel):
    face_count: int
    matches: list[FaceMatch]
    message: str


@app.get("/health")
def health():
    return {"status": "UP", "service": "face-service-fastapi"}


def _load_rgb_image(image_bytes: bytes) -> np.ndarray:
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        return np.array(pil_image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc


def _confidence_from_distance(distance: float, boundary: float = 0.6) -> float:
    """Return display confidence without reusing the distance cutoff numerically.

    The face_recognition/dlib convention is a distance comparison. This smooth
    sigmoid is only for display: the configured distance boundary maps to 0.5,
    so match decisions never compare this score against that same boundary.
    """
    slope = 0.1
    confidence = 1.0 / (1.0 + np.exp((float(distance) - boundary) / slope))
    return round(float(max(0.0, min(1.0, confidence))), 6)


@app.post("/enroll", response_model=EmbeddingResponse)
async def enroll(image: UploadFile = File(...)):
    try:
        image_array = _load_rgb_image(await image.read())
        face_locations = face_recognition.face_locations(image_array, model="hog")
        face_count = len(face_locations)

        if face_count == 0:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        if face_count > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Multiple faces detected ({face_count}). Please provide an image with exactly one face.",
            )

        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        if not face_encodings:
            raise HTTPException(status_code=400, detail="Failed to generate face embedding")

        return EmbeddingResponse(
            embedding=face_encodings[0].tolist(),
            face_count=face_count,
            message="Face embedding generated successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing enrollment")
        raise HTTPException(status_code=500, detail=f"Internal error during enrollment: {exc}") from exc


@app.post("/recognize", response_model=RecognitionResponse)
async def recognize(
    image: UploadFile = File(...),
    enrolled_students: str = Form(...),
    distance_threshold: float = Form(0.6, ge=0.0, le=2.0),
):
    """Detect every face and return its closest enrolled-student candidate.

    The Spring backend supplies only the active students in the session's
    ClassSection, keeping class membership and attendance persistence there.
    A candidate is returned even when its confidence is low so the caller can
    apply its configured review threshold and preserve an auditable result.
    """
    try:
        try:
            payload = json.loads(enrolled_students)
            students = [EnrolledStudent.model_validate(item) for item in payload]
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid enrolled_students payload: {exc}") from exc

        image_array = _load_rgb_image(await image.read())
        face_locations = face_recognition.face_locations(image_array, model="hog")
        face_encodings = face_recognition.face_encodings(image_array, face_locations)

        if len(face_encodings) != len(face_locations):
            raise HTTPException(status_code=422, detail="Failed to generate embeddings for all detected faces")

        valid_students = [student for student in students if len(student.embedding) == 128]
        matches: list[FaceMatch] = []
        claimed_student_ids: set[int] = set()

        for face_index, face_encoding in enumerate(face_encodings):
            if not valid_students:
                matches.append(FaceMatch(face_index=face_index, matched=False, confidence_score=0.0))
                continue

            distances = face_recognition.face_distance(
                np.asarray([student.embedding for student in valid_students], dtype=np.float64),
                face_encoding,
            )
            ranked_indexes = np.argsort(distances)
            candidate_index = next(
                (int(index) for index in ranked_indexes if valid_students[int(index)].student_id not in claimed_student_ids),
                None,
            )

            if candidate_index is None:
                matches.append(FaceMatch(face_index=face_index, matched=False, confidence_score=0.0))
                continue

            candidate = valid_students[candidate_index]
            distance = float(distances[candidate_index])
            matched = distance < distance_threshold
            if matched:
                claimed_student_ids.add(candidate.student_id)
            matches.append(
                FaceMatch(
                    face_index=face_index,
                    student_id=candidate.student_id,
                    roll_number=candidate.roll_number,
                    confidence_score=_confidence_from_distance(distance, distance_threshold),
                    distance=round(distance, 6),
                    matched=matched,
                )
            )

        logger.info("Recognized %d face(s) against %d enrolled student(s)", len(matches), len(valid_students))
        return RecognitionResponse(
            face_count=len(face_locations),
            matches=matches,
            message="Group photo recognized successfully",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing group recognition")
        raise HTTPException(status_code=500, detail=f"Internal error during recognition: {exc}") from exc
