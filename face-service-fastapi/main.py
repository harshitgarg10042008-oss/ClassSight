from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, ValidationError
import face_recognition
import numpy as np
from PIL import Image, ImageFilter
import io
import json
import logging
import os
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Service FastAPI")

BLUR_THRESHOLD = float(os.getenv("QUALITY_BLUR_THRESHOLD", "30.0"))
MIN_BRIGHTNESS = float(os.getenv("QUALITY_MIN_BRIGHTNESS", "35.0"))
MAX_BRIGHTNESS = float(os.getenv("QUALITY_MAX_BRIGHTNESS", "220.0"))
MIN_LIVENESS_TEXTURE = float(os.getenv("QUALITY_MIN_LIVENESS_TEXTURE", "2.5"))
MIN_FACE_SIZE_RATIO = float(os.getenv("QUALITY_MIN_FACE_SIZE_RATIO", "0.0005"))


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    face_count: int
    message: str


class EnrolledStudent(BaseModel):
    student_id: int
    roll_number: Optional[str] = None
    embedding: list[float] = Field(min_length=1)


class QualityMetrics(BaseModel):
    blur_score: float
    brightness_mean: float
    liveness_score: float
    liveness_texture_score: float
    quality_passed: bool
    warnings: list[str] = Field(default_factory=list)


class FaceMatch(BaseModel):
    face_index: int
    student_id: Optional[int] = None
    roll_number: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0)
    distance: Optional[float] = None
    matched: bool
    face_size_ratio: Optional[float] = None
    quality_warnings: list[str] = []


class RecognitionResponse(BaseModel):
    face_count: int
    matches: list[FaceMatch]
    quality: QualityMetrics
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


def _quality_metrics(image_array: np.ndarray, face_locations: list[tuple[int, int, int, int]]) -> QualityMetrics:
    gray = np.asarray(Image.fromarray(image_array).convert("L"), dtype=np.float32)
    # Discrete 4-neighbour Laplacian: variance is the requested blur signal.
    laplacian = (-4.0 * gray + np.roll(gray, 1, axis=0) + np.roll(gray, -1, axis=0)
                 + np.roll(gray, 1, axis=1) + np.roll(gray, -1, axis=1))
    blur_score = float(np.var(laplacian))
    brightness_mean = float(np.mean(gray))
    blurred = np.asarray(Image.fromarray(gray.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=2)), dtype=np.float32)
    texture_score = float(np.std(gray - blurred))
    # Lightweight liveness proxy only: high-frequency texture is less consistent
    # with a flat recapture. This is not presentation-attack detection.
    liveness_score = float(max(0.0, min(1.0, texture_score / 20.0)))

    warnings: list[str] = []
    if blur_score < BLUR_THRESHOLD:
        warnings.append(f"image blurry (blur_score={blur_score:.2f}, threshold={BLUR_THRESHOLD:.2f})")
    if brightness_mean < MIN_BRIGHTNESS:
        warnings.append(f"image too dark (brightness={brightness_mean:.2f})")
    elif brightness_mean > MAX_BRIGHTNESS:
        warnings.append(f"image overexposed (brightness={brightness_mean:.2f})")
    if texture_score < MIN_LIVENESS_TEXTURE:
        warnings.append(f"weak liveness texture signal (texture={texture_score:.2f})")
    for top, right, bottom, left in face_locations:
        ratio = max(0, bottom - top) * max(0, right - left) / float(gray.shape[0] * gray.shape[1])
        if ratio < MIN_FACE_SIZE_RATIO:
            warnings.append(f"face too small (ratio={ratio:.6f}, threshold={MIN_FACE_SIZE_RATIO:.6f})")
    return QualityMetrics(
        blur_score=round(blur_score, 4),
        brightness_mean=round(brightness_mean, 4),
        liveness_score=round(liveness_score, 4),
        liveness_texture_score=round(texture_score, 4),
        quality_passed=not warnings,
        warnings=warnings,
    )


def _face_quality_warnings(face_location: tuple[int, int, int, int], image_shape: tuple[int, ...], quality: QualityMetrics) -> list[str]:
    height, width = image_shape[:2]
    top, right, bottom, left = face_location
    ratio = max(0, bottom - top) * max(0, right - left) / float(height * width)
    warnings = list(quality.warnings)
    if ratio < MIN_FACE_SIZE_RATIO:
        warnings.append(f"face too small (ratio={ratio:.6f}, threshold={MIN_FACE_SIZE_RATIO:.6f})")
    return list(dict.fromkeys(warnings))


def _confidence_from_distance(distance: float, boundary: float = 0.6) -> float:
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
            raise HTTPException(status_code=400, detail=f"Multiple faces detected ({face_count}). Please provide an image with exactly one face.")
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        if not face_encodings:
            raise HTTPException(status_code=400, detail="Failed to generate face embedding")
        return EmbeddingResponse(embedding=face_encodings[0].tolist(), face_count=face_count, message="Face embedding generated successfully")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing enrollment")
        raise HTTPException(status_code=500, detail="Internal error during enrollment") from exc


@app.post("/recognize", response_model=RecognitionResponse)
async def recognize(
    image: UploadFile = File(...),
    enrolled_students: str = Form(...),
    distance_threshold: float = Form(0.6, ge=0.0, le=2.0),
):
    try:
        try:
            payload = json.loads(enrolled_students)
            students = [EnrolledStudent.model_validate(item) for item in payload]
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid enrolled_students payload: {exc}") from exc

        image_array = _load_rgb_image(await image.read())
        face_locations = face_recognition.face_locations(image_array, model="hog")
        quality = _quality_metrics(image_array, face_locations)
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        if len(face_encodings) != len(face_locations):
            raise HTTPException(status_code=422, detail="Failed to generate embeddings for all detected faces")

        valid_students = [student for student in students if len(student.embedding) == 128]
        matches: list[FaceMatch] = []
        claimed_student_ids: set[int] = set()
        for face_index, face_encoding in enumerate(face_encodings):
            face_warning_list = _face_quality_warnings(face_locations[face_index], image_array.shape, quality)
            top, right, bottom, left = face_locations[face_index]
            face_size_ratio = round(max(0, bottom - top) * max(0, right - left) / float(image_array.shape[0] * image_array.shape[1]), 6)
            if not valid_students:
                matches.append(FaceMatch(face_index=face_index, matched=False, confidence_score=0.0, face_size_ratio=face_size_ratio, quality_warnings=face_warning_list))
                continue
            distances = face_recognition.face_distance(np.asarray([student.embedding for student in valid_students], dtype=np.float64), face_encoding)
            ranked_indexes = np.argsort(distances)
            candidate_index = next((int(index) for index in ranked_indexes if valid_students[int(index)].student_id not in claimed_student_ids), None)
            if candidate_index is None:
                matches.append(FaceMatch(face_index=face_index, matched=False, confidence_score=0.0, face_size_ratio=face_size_ratio, quality_warnings=face_warning_list))
                continue
            candidate = valid_students[candidate_index]
            distance = float(distances[candidate_index])
            matched = distance < distance_threshold
            if matched:
                claimed_student_ids.add(candidate.student_id)
            matches.append(FaceMatch(
                face_index=face_index,
                student_id=candidate.student_id,
                roll_number=candidate.roll_number,
                confidence_score=_confidence_from_distance(distance, distance_threshold),
                distance=round(distance, 6),
                matched=matched,
                face_size_ratio=face_size_ratio,
                quality_warnings=face_warning_list,
            ))
        logger.info("Recognized %d face(s) against %d enrolled student(s); quality_passed=%s", len(matches), len(valid_students), quality.quality_passed)
        return RecognitionResponse(face_count=len(face_locations), matches=matches, quality=quality, message="Group photo recognized successfully")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing group recognition")
        raise HTTPException(status_code=500, detail="Internal error during recognition") from exc
