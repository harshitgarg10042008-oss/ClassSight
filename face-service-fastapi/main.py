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
EDGE_CROP_ENABLED = os.getenv("EDGE_CROP_ENABLED", "false").lower() == "true"
EDGE_CROP_PADDING = float(os.getenv("EDGE_CROP_PADDING", "0.20"))
EDGE_CROP_MAX_DIMENSION = int(os.getenv("EDGE_CROP_MAX_DIMENSION", "0"))


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


def _crop_face(image_array: np.ndarray, location: tuple[int, int, int, int], padding: float = EDGE_CROP_PADDING) -> np.ndarray:
    height, width = image_array.shape[:2]
    top, right, bottom, left = location
    face_height = max(1, bottom - top)
    face_width = max(1, right - left)
    pad_y = int(face_height * max(0.0, padding))
    pad_x = int(face_width * max(0.0, padding))
    crop_top = max(0, top - pad_y)
    crop_right = min(width, right + pad_x)
    crop_bottom = min(height, bottom + pad_y)
    crop_left = max(0, left - pad_x)
    crop = image_array[crop_top:crop_bottom, crop_left:crop_right]
    if crop.size == 0:
        raise ValueError("Face crop was empty")
    if EDGE_CROP_MAX_DIMENSION > 0:
        pil_crop = Image.fromarray(crop)
        pil_crop.thumbnail((EDGE_CROP_MAX_DIMENSION, EDGE_CROP_MAX_DIMENSION), Image.Resampling.LANCZOS)
        crop = np.asarray(pil_crop)
    return np.ascontiguousarray(crop)


def _encode_detected_faces(image_array: np.ndarray, face_locations: list[tuple[int, int, int, int]], use_crops: bool) -> list[np.ndarray]:
    if not use_crops:
        return face_recognition.face_encodings(image_array, face_locations)
    encodings: list[np.ndarray] = []
    for location in face_locations:
        crop = _crop_face(image_array, location)
        crop_height, crop_width = crop.shape[:2]
        crop_encodings = face_recognition.face_encodings(crop, [(0, crop_width, crop_height, 0)])
        if not crop_encodings:
            # A tight/distant crop can defeat a second detector pass. Returning a
            # controlled error lets the caller preserve review/recapture semantics.
            raise ValueError("Failed to generate an embedding for a detected face crop")
        encodings.append(crop_encodings[0])
    return encodings


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
    edge_crop: bool = Form(EDGE_CROP_ENABLED),
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
        face_encodings = _encode_detected_faces(image_array, face_locations, edge_crop)
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
        logger.info("Recognized %d face(s) against %d enrolled student(s); quality_passed=%s; edge_crop=%s", len(matches), len(valid_students), quality.quality_passed, edge_crop)
        mode = "edge-cropped" if edge_crop else "full-frame"
        return RecognitionResponse(face_count=len(face_locations), matches=matches, quality=quality, message=f"Group photo recognized successfully ({mode} encoding)")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing group recognition")
        raise HTTPException(status_code=500, detail="Internal error during recognition") from exc


# Optional RabbitMQ worker. The HTTP endpoints above remain the default path.
import threading
import time
import pika
from minio import Minio


def _recognize_message(image_bytes: bytes, students_payload: list[dict], distance_threshold: float, edge_crop: bool = EDGE_CROP_ENABLED) -> dict:
    image_array = _load_rgb_image(image_bytes)
    face_locations = face_recognition.face_locations(image_array, model="hog")
    quality = _quality_metrics(image_array, face_locations)
    face_encodings = _encode_detected_faces(image_array, face_locations, edge_crop)
    if len(face_encodings) != len(face_locations):
        raise ValueError("Failed to generate embeddings for all detected faces")
    valid_students = [EnrolledStudent.model_validate(item) for item in students_payload if len(item.get("embedding", [])) == 128]
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
        matches.append(FaceMatch(face_index=face_index, student_id=candidate.student_id, roll_number=candidate.roll_number,
                                 confidence_score=_confidence_from_distance(distance, distance_threshold), distance=round(distance, 6),
                                 matched=matched, face_size_ratio=face_size_ratio, quality_warnings=face_warning_list))
    mode = "edge-cropped" if edge_crop else "full-frame"
    return RecognitionResponse(face_count=len(face_locations), matches=matches, quality=quality, message=f"Group photo recognized successfully ({mode} encoding)").model_dump()


def _rabbit_worker() -> None:
    host = os.getenv("RABBITMQ_HOST", "127.0.0.1")
    port = int(os.getenv("RABBITMQ_PORT", "5672"))
    user = os.getenv("RABBITMQ_USER", "classsight")
    password = os.getenv("RABBITMQ_PASSWORD", "classsight_rabbit_password")
    minio_endpoint = os.getenv("MINIO_ENDPOINT", "127.0.0.1:9000").replace("http://", "").replace("https://", "")
    minio_secure = os.getenv("MINIO_ENDPOINT", "").startswith("https://")
    minio_client = Minio(minio_endpoint, access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
                         secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"), secure=minio_secure)
    exchange = "classsight.capture.exchange"
    result_exchange = "classsight.recognition.exchange"
    while True:
        try:
            credentials = pika.PlainCredentials(user, password)
            connection = pika.BlockingConnection(pika.ConnectionParameters(host=host, port=port, credentials=credentials, heartbeat=30))
            channel = connection.channel()
            channel.exchange_declare(exchange=exchange, exchange_type="direct", durable=True)
            channel.exchange_declare(exchange=result_exchange, exchange_type="direct", durable=True)
            channel.queue_declare(queue="classsight.capture.recognition", durable=True)
            channel.queue_bind(queue="classsight.capture.recognition", exchange=exchange, routing_key="capture.request")
            channel.queue_declare(queue="classsight.recognition.result", durable=True)
            channel.queue_bind(queue="classsight.recognition.result", exchange=result_exchange, routing_key="recognition.result")
            def handle(ch, method, properties, body):
                try:
                    message = json.loads(body.decode("utf-8"))
                    response = _recognize_message(
                        minio_client.get_object(os.getenv("MINIO_BUCKET", "classsight-captures"), message["objectKey"]).read(),
                        message.get("enrolledStudents", []), float(message.get("distanceThreshold", 0.6)), bool(message.get("edgeCrop", EDGE_CROP_ENABLED)))
                    ch.basic_publish(exchange=result_exchange, routing_key="recognition.result",
                                     body=json.dumps({"sessionId": message["sessionId"], "recognition": response}).encode("utf-8"),
                                     properties=pika.BasicProperties(content_type="application/json", delivery_mode=2))
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception:
                    logger.exception("RabbitMQ recognition worker failed; message will be retried")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue="classsight.capture.recognition", on_message_callback=handle)
            logger.info("RabbitMQ recognition worker connected")
            channel.start_consuming()
        except Exception:
            logger.exception("RabbitMQ worker connection failed; retrying")
            time.sleep(5)


@app.on_event("startup")
def start_optional_rabbit_worker():
    if os.getenv("RABBITMQ_WORKER_ENABLED", "false").lower() == "true":
        threading.Thread(target=_rabbit_worker, name="rabbitmq-recognition-worker", daemon=True).start()
        logger.info("RabbitMQ recognition worker enabled")
