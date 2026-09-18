"""
ClassSight face-service-fastapi — Recognition pipeline implementation.

Architecture matches Alniemi & Mahmood (2023), "Class Attendance System Based on
Face Recognition", Revue d'Intelligence Artificielle 37(5):1245-1253.
DOI: 10.18280/ria.370517

Published accuracy (130 students, 3900 images):
  Single-face detection 99.5%  |  Single-face recognition 98.9%
  Multi-face detection 98.8%   |  Multi-face recognition  97.5%

Pipeline (paper-matched):
  1. Detection   → OpenCV Haar Cascade, scaleFactor=1.2   (§2.1)
  2. Embedding   → FaceNet pretrained, 160×160 → 128-d    (§2.2)
  3. Matching    → Manhattan (L1) distance                (§2.3)
  4. Threshold   → configurable; uncertain → review queue (§2.5)

ACCURACY CAVEAT (paper §4 / Table 5):
  The published 97.5% figure is from a close-range mobile camera (12 MP,
  f/1.6, 26 mm).  Accuracy degrades with camera-to-student distance.
  Do NOT claim 97.5% for wide-angle CCTV feeds — that is a harder
  condition not covered by this paper's evaluation.
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import logging
import os
import threading
import time
from typing import Optional

import cv2
import numpy as np
import pika
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from keras_facenet import FaceNet
from minio import Minio
from PIL import Image, ImageFilter
from pydantic import BaseModel, Field, ValidationError

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(title="ClassSight Face Service — Haar Cascade + FaceNet + Manhattan")

# ---------------------------------------------------------------------------
# Configuration (all tunable via environment variables)
# ---------------------------------------------------------------------------

# --- Image quality gates ---
BLUR_THRESHOLD = float(os.getenv("QUALITY_BLUR_THRESHOLD", "30.0"))
MIN_BRIGHTNESS = float(os.getenv("QUALITY_MIN_BRIGHTNESS", "35.0"))
MAX_BRIGHTNESS = float(os.getenv("QUALITY_MAX_BRIGHTNESS", "220.0"))
MIN_LIVENESS_TEXTURE = float(os.getenv("QUALITY_MIN_LIVENESS_TEXTURE", "2.5"))
MIN_FACE_SIZE_RATIO = float(os.getenv("QUALITY_MIN_FACE_SIZE_RATIO", "0.0005"))
QUALITY_POSE_CHECKS_ENABLED = os.getenv("QUALITY_POSE_CHECKS_ENABLED", "false").lower() == "true"
QUALITY_MAX_ROLL_DEGREES = float(os.getenv("QUALITY_MAX_ROLL_DEGREES", "25.0"))

# --- Haar Cascade detector (paper §2.1) ---
# scaleFactor=1.2 matches the paper's multi-scale search-box zoom factor.
HAAR_SCALE_FACTOR = float(os.getenv("HAAR_SCALE_FACTOR", "1.2"))
HAAR_MIN_NEIGHBORS = int(os.getenv("HAAR_MIN_NEIGHBORS", "5"))
_haar_min_size_raw = os.getenv("HAAR_MIN_SIZE", "30,30").split(",")
HAAR_MIN_SIZE = (int(_haar_min_size_raw[0]), int(_haar_min_size_raw[1]))

# --- Manhattan (L1) distance threshold (paper §2.3) ---
# FaceNet 128-d L1 distances on unit-normalised vectors range roughly 0–20.
# Empirically: HIGH confidence < 8, MEDIUM 8–10, LOW 10–threshold, UNKNOWN > threshold.
# Tune this after building the full 30-image enrollment set per student.
MANHATTAN_DISTANCE_THRESHOLD = float(os.getenv("MANHATTAN_DISTANCE_THRESHOLD", "10.0"))
CONFIDENCE_HIGH_BOUND = float(os.getenv("CONFIDENCE_HIGH_BOUND", "8.0"))   # < this → HIGH
CONFIDENCE_MEDIUM_BOUND = float(os.getenv("CONFIDENCE_MEDIUM_BOUND", "10.0"))  # < this → MEDIUM (else LOW)

# --- Video enrollment ---
ENROLL_VIDEO_FRAME_INTERVAL = int(os.getenv("ENROLL_VIDEO_FRAME_INTERVAL", "5"))   # sample every Nth frame
ENROLL_VIDEO_MAX_FRAMES = int(os.getenv("ENROLL_VIDEO_MAX_FRAMES", "30"))           # paper used 30 images/student


# ---------------------------------------------------------------------------
# Model loading (at startup; one instance shared across all requests)
# ---------------------------------------------------------------------------

_facenet: Optional[FaceNet] = None
_haar_cascade: Optional[cv2.CascadeClassifier] = None


@app.on_event("startup")
def load_models() -> None:
    global _facenet, _haar_cascade
    logger.info("Loading FaceNet pretrained model (paper §2.2)…")
    _facenet = FaceNet()
    logger.info("FaceNet loaded (128-d Inception-ResNet, triplet-loss pretrained)")

    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    _haar_cascade = cv2.CascadeClassifier(cascade_path)
    if _haar_cascade.empty():
        raise RuntimeError(f"Haar Cascade XML not found at {cascade_path}")
    logger.info(
        "Haar Cascade loaded — scaleFactor=%.1f, minNeighbors=%d, minSize=%s (paper §2.1)",
        HAAR_SCALE_FACTOR, HAAR_MIN_NEIGHBORS, HAAR_MIN_SIZE,
    )
    logger.info(
        "Manhattan threshold=%.1f, HIGH<%.1f, MEDIUM<%.1f (paper §2.3)",
        MANHATTAN_DISTANCE_THRESHOLD, CONFIDENCE_HIGH_BOUND, CONFIDENCE_MEDIUM_BOUND,
    )


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class EmbeddingResponse(BaseModel):
    embedding: list[float]
    face_count: int
    message: str


class MultiEmbeddingResponse(BaseModel):
    """Returned by /enroll-video: one embedding per extracted frame."""
    embeddings: list[list[float]]
    frame_count: int
    faces_found: int
    message: str


class EnrolledStudent(BaseModel):
    student_id: int
    roll_number: Optional[str] = None
    embedding: list[float] = Field(default_factory=list)
    embeddings: list[list[float]] = Field(default_factory=list)


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
    # Manhattan (L1) distance — the paper's reported metric.
    manhattan_distance: Optional[float] = None
    # Kept as alias so existing Spring callers still get a "distance" field.
    distance: Optional[float] = None
    # Derived label: HIGH / MEDIUM / LOW / UNKNOWN
    confidence_label: str = "UNKNOWN"
    matched: bool
    face_size_ratio: Optional[float] = None
    quality_warnings: list[str] = []
    recognition_state: str = "UNKNOWN"
    # How many frames (in multi-frame mode) confirmed this match.
    frame_confirmations: int = 1


class RecognitionResponse(BaseModel):
    face_count: int
    matches: list[FaceMatch]
    quality: QualityMetrics
    message: str


class StreamRecognitionResponse(BaseModel):
    """Aggregated result from /recognize-stream (multi-frame, de-duplicated)."""
    frames_processed: int
    face_detections_total: int
    matches: list[FaceMatch]   # one entry per unique student found across all frames
    message: str


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "UP", "service": "face-service-fastapi"}


# ---------------------------------------------------------------------------
# Internal helpers — image loading
# ---------------------------------------------------------------------------

def _load_rgb_image(image_bytes: bytes) -> np.ndarray:
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        return np.array(pil_image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc


# ---------------------------------------------------------------------------
# Internal helpers — Haar Cascade face detection (paper §2.1)
# ---------------------------------------------------------------------------

def _detect_faces(image_array: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detect faces using Haar Cascade (haarcascade_frontalface_default.xml).

    Paper §2.1: scaleFactor=1.2 controls the multi-scale search-box zoom.
    Returns locations as (top, right, bottom, left) — same convention used
    throughout the rest of this module.
    """
    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    detections = _haar_cascade.detectMultiScale(
        gray,
        scaleFactor=HAAR_SCALE_FACTOR,   # 1.2 — matches paper
        minNeighbors=HAAR_MIN_NEIGHBORS,
        minSize=HAAR_MIN_SIZE,
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if not isinstance(detections, np.ndarray) or len(detections) == 0:
        return []
    # cv2 returns (x, y, w, h); convert to (top, right, bottom, left)
    locations: list[tuple[int, int, int, int]] = []
    for x, y, w, h in detections:
        locations.append((int(y), int(x + w), int(y + h), int(x)))
    return locations


# ---------------------------------------------------------------------------
# Internal helpers — FaceNet embedding (paper §2.2)
# ---------------------------------------------------------------------------

def _embed_face_crop(image_array: np.ndarray, location: tuple[int, int, int, int]) -> np.ndarray:
    """
    Crop the detected face region and produce a 128-d FaceNet embedding.

    Paper §2.2: input must be resized to 160×160×3 before passing to FaceNet.
    The FaceNet model is pretrained (Inception-ResNet, triplet loss); we do not
    fine-tune it.
    """
    top, right, bottom, left = location
    # Guard against degenerate crops
    if bottom <= top or right <= left:
        raise ValueError("Degenerate face bounding box")
    crop = image_array[max(0, top):max(0, bottom), max(0, left):max(0, right)]
    if crop.size == 0:
        raise ValueError("Empty face crop")
    # Resize to 160×160 — FaceNet's required input (paper §2.2)
    crop_160 = cv2.resize(crop, (160, 160), interpolation=cv2.INTER_LINEAR)
    # keras-facenet expects uint8 (H, W, 3); embeddings() accepts a list
    emb = _facenet.embeddings([crop_160])   # shape (1, 128)
    return emb[0]                           # shape (128,)


def _embed_crop_direct(crop_160: np.ndarray) -> np.ndarray:
    """Embed a pre-cropped and pre-resized 160×160 uint8 array."""
    emb = _facenet.embeddings([crop_160])
    return emb[0]


# ---------------------------------------------------------------------------
# Internal helpers — Manhattan (L1) distance matching (paper §2.3)
# ---------------------------------------------------------------------------

def _manhattan(a: np.ndarray, b: np.ndarray) -> float:
    """
    L1 (Manhattan) distance: D = Σ|aᵢ - bᵢ| for i = 1..128.

    Paper §2.3 uses Manhattan distance exclusively.  Do NOT substitute
    Euclidean / cosine — the accuracy numbers are only valid for L1.
    """
    return float(np.sum(np.abs(a.astype(np.float64) - b.astype(np.float64))))


def _confidence_label(distance: float) -> str:
    """Derive a human-readable confidence label from a Manhattan distance."""
    if distance < CONFIDENCE_HIGH_BOUND:
        return "HIGH"
    if distance < CONFIDENCE_MEDIUM_BOUND:
        return "MEDIUM"
    return "LOW"


def _confidence_score_from_manhattan(distance: float, threshold: float) -> float:
    """
    Map Manhattan distance to a [0,1] confidence score (sigmoid-like).
    Kept for backward compatibility with the Spring confidence_score field.
    """
    slope = threshold * 0.1 if threshold > 0 else 1.0
    score = 1.0 / (1.0 + np.exp((distance - threshold) / slope))
    return round(float(max(0.0, min(1.0, score))), 6)


# ---------------------------------------------------------------------------
# Internal helpers — embedding cache (avoids re-normalising on every call)
# ---------------------------------------------------------------------------

_EMBEDDING_CACHE: dict[int, tuple[str, list[np.ndarray]]] = {}


def _student_embeddings(student: EnrolledStudent) -> list[np.ndarray]:
    """Return all stored embeddings for a student as numpy arrays (cached)."""
    raw_embeddings = list(student.embeddings)
    if student.embedding:
        raw_embeddings.append(student.embedding)
    valid = [e for e in raw_embeddings if len(e) == 128]
    fingerprint = hashlib.sha256(json.dumps(valid, separators=(",", ":")).encode()).hexdigest()
    cached = _EMBEDDING_CACHE.get(student.student_id)
    if cached and cached[0] == fingerprint:
        return cached[1]
    arrays = [np.asarray(e, dtype=np.float64) for e in valid]
    _EMBEDDING_CACHE[student.student_id] = (fingerprint, arrays)
    return arrays


def _best_manhattan_distance(student: EnrolledStudent, live_embedding: np.ndarray) -> float:
    """Return the smallest Manhattan distance between live_embedding and any of the student's stored embeddings."""
    embeddings = _student_embeddings(student)
    if not embeddings:
        return float("inf")
    return min(_manhattan(live_embedding, stored) for stored in embeddings)


# ---------------------------------------------------------------------------
# Internal helpers — image quality metrics (unchanged from previous version)
# ---------------------------------------------------------------------------

def _quality_metrics(image_array: np.ndarray, face_locations: list[tuple[int, int, int, int]]) -> QualityMetrics:
    gray = np.asarray(Image.fromarray(image_array).convert("L"), dtype=np.float32)
    laplacian = (-4.0 * gray
                 + np.roll(gray, 1, axis=0) + np.roll(gray, -1, axis=0)
                 + np.roll(gray, 1, axis=1) + np.roll(gray, -1, axis=1))
    blur_score = float(np.var(laplacian))
    brightness_mean = float(np.mean(gray))
    blurred = np.asarray(
        Image.fromarray(gray.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=2)),
        dtype=np.float32,
    )
    texture_score = float(np.std(gray - blurred))
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


def _face_size_ratio(image_array: np.ndarray, location: tuple[int, int, int, int]) -> float:
    h, w = image_array.shape[:2]
    top, right, bottom, left = location
    return round(max(0, bottom - top) * max(0, right - left) / float(h * w), 6)


def _recognition_state(matched: bool, warnings: list[str], has_candidate: bool) -> str:
    if warnings:
        return "RECAPTURE_REQUIRED"
    if not has_candidate:
        return "UNKNOWN"
    if not matched:
        return "LOW_CONFIDENCE"
    return "RECOGNIZED"


# ---------------------------------------------------------------------------
# /enroll — single image enrollment (backward-compatible)
# ---------------------------------------------------------------------------

@app.post("/enroll", response_model=EmbeddingResponse)
async def enroll(image: UploadFile = File(...)):
    """
    Enroll a student from a single image.

    NOTE (paper §2.4): A single image is NOT sufficient to reach the paper's
    97.5% accuracy.  The paper used 30 images/student across 5 head angles and
    3 lighting conditions.  Use /enroll-video for the full enrollment protocol.
    """
    try:
        image_array = _load_rgb_image(await image.read())
        face_locations = _detect_faces(image_array)
        face_count = len(face_locations)
        if face_count == 0:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        if face_count > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Multiple faces detected ({face_count}). Please provide an image with exactly one face.",
            )
        embedding = _embed_face_crop(image_array, face_locations[0])
        return EmbeddingResponse(
            embedding=embedding.tolist(),
            face_count=face_count,
            message="Face embedding generated successfully (single-image enrollment; see /enroll-video for multi-angle protocol)",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing enrollment")
        raise HTTPException(status_code=500, detail="Internal error during enrollment") from exc


# ---------------------------------------------------------------------------
# /enroll-frame — accept one pre-cropped frame, return its embedding
# ---------------------------------------------------------------------------

@app.post("/enroll-frame", response_model=EmbeddingResponse)
async def enroll_frame(image: UploadFile = File(...)):
    """
    Identical to /enroll but intended for batch-enrollment loops.
    Spring calls this once per extracted frame when building a multi-angle
    enrollment set.
    """
    return await enroll(image)


# ---------------------------------------------------------------------------
# /enroll-video — video-based multi-angle enrollment (paper §2.4)
# ---------------------------------------------------------------------------

@app.post("/enroll-video", response_model=MultiEmbeddingResponse)
async def enroll_video(video: UploadFile = File(...)):
    """
    Accept a short video clip and extract up to ENROLL_VIDEO_MAX_FRAMES face
    embeddings sampled every ENROLL_VIDEO_FRAME_INTERVAL frames.

    Paper §2.4 protocol:
      - 5 head positions: front, 45° left, 45° right, 90° left, 90° right
      - 3 lighting conditions: bright, medium, low
      - ~30 images per student

    The faculty/admin should record a ~10-second clip of the student slowly
    turning their head left and right under varying lighting.  This endpoint
    extracts the frames and returns all embeddings for storage in
    student_face_embeddings (one DB row per embedding).
    """
    try:
        video_bytes = await video.read()
        # Write to a temp buffer that OpenCV can read
        import tempfile, os as _os
        suffix = ".mp4"
        fname = video.filename or "upload.mp4"
        if "." in fname:
            suffix = "." + fname.rsplit(".", 1)[-1]
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name
        try:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                raise HTTPException(status_code=400, detail="Could not open video file")
            all_embeddings: list[list[float]] = []
            frame_idx = 0
            faces_found = 0
            while len(all_embeddings) < ENROLL_VIDEO_MAX_FRAMES:
                ret, bgr_frame = cap.read()
                if not ret:
                    break
                frame_idx += 1
                if frame_idx % ENROLL_VIDEO_FRAME_INTERVAL != 0:
                    continue
                rgb_frame = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)
                locs = _detect_faces(rgb_frame)
                if len(locs) != 1:
                    continue  # skip frames with 0 or >1 face
                faces_found += 1
                try:
                    emb = _embed_face_crop(rgb_frame, locs[0])
                    all_embeddings.append(emb.tolist())
                except ValueError:
                    continue
            cap.release()
        finally:
            _os.unlink(tmp_path)

        if not all_embeddings:
            raise HTTPException(
                status_code=400,
                detail="No usable single-face frames found in video. "
                       "Ensure the student's face is clearly visible and unobstructed.",
            )
        return MultiEmbeddingResponse(
            embeddings=all_embeddings,
            frame_count=frame_idx,
            faces_found=faces_found,
            message=(
                f"Extracted {len(all_embeddings)} embeddings from {frame_idx} frames "
                f"({faces_found} single-face frames found). "
                f"Paper target: ≥30 embeddings/student across 5 angles × 3 lighting conditions."
            ),
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing enrollment video")
        raise HTTPException(status_code=500, detail="Internal error during video enrollment") from exc


# ---------------------------------------------------------------------------
# /recognize — single-frame recognition (existing API, updated pipeline)
# ---------------------------------------------------------------------------

@app.post("/recognize", response_model=RecognitionResponse)
async def recognize(
    image: UploadFile = File(...),
    enrolled_students: str = Form(...),
    distance_threshold: float = Form(MANHATTAN_DISTANCE_THRESHOLD, ge=0.0, le=200.0),
    edge_crop: bool = Form(False),  # kept for API compatibility; not used in Haar+FaceNet pipeline
):
    """
    Recognize faces in a single image against a list of enrolled students.

    Detection: Haar Cascade (scaleFactor=1.2)            — paper §2.1
    Embedding: FaceNet pretrained (160×160 → 128-d)      — paper §2.2
    Matching:  Manhattan (L1) distance                   — paper §2.3
    Threshold: configurable (default MANHATTAN_DISTANCE_THRESHOLD)
    """
    try:
        try:
            payload = json.loads(enrolled_students)
            students = [EnrolledStudent.model_validate(item) for item in payload]
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid enrolled_students payload: {exc}") from exc

        image_array = _load_rgb_image(await image.read())
        face_locations = _detect_faces(image_array)
        quality = _quality_metrics(image_array, face_locations)

        valid_students = [s for s in students if _student_embeddings(s)]
        matches: list[FaceMatch] = []
        claimed_ids: set[int] = set()

        for face_index, location in enumerate(face_locations):
            ratio = _face_size_ratio(image_array, location)
            try:
                live_emb = _embed_face_crop(image_array, location)
            except ValueError as exc:
                logger.warning("Could not embed face %d: %s", face_index, exc)
                matches.append(FaceMatch(
                    face_index=face_index,
                    matched=False,
                    confidence_score=0.0,
                    face_size_ratio=ratio,
                    quality_warnings=list(quality.warnings),
                    recognition_state="RECAPTURE_REQUIRED",
                    confidence_label="UNKNOWN",
                ))
                continue

            if not valid_students:
                matches.append(FaceMatch(
                    face_index=face_index,
                    matched=False,
                    confidence_score=0.0,
                    face_size_ratio=ratio,
                    quality_warnings=list(quality.warnings),
                    recognition_state=_recognition_state(False, [], False),
                    confidence_label="UNKNOWN",
                ))
                continue

            # Manhattan distance to every student's best stored embedding (paper §2.3)
            distances = [_best_manhattan_distance(s, live_emb) for s in valid_students]
            ranked = sorted(range(len(distances)), key=lambda i: distances[i])

            # Pick the closest student not already claimed by another face in this frame
            candidate_idx = next((i for i in ranked if valid_students[i].student_id not in claimed_ids), None)
            if candidate_idx is None:
                matches.append(FaceMatch(
                    face_index=face_index,
                    matched=False,
                    confidence_score=0.0,
                    face_size_ratio=ratio,
                    quality_warnings=list(quality.warnings),
                    recognition_state=_recognition_state(False, [], False),
                    confidence_label="UNKNOWN",
                ))
                continue

            candidate = valid_students[candidate_idx]
            dist = distances[candidate_idx]
            matched = dist < distance_threshold
            label = _confidence_label(dist) if matched else "LOW"
            if matched:
                claimed_ids.add(candidate.student_id)

            matches.append(FaceMatch(
                face_index=face_index,
                student_id=candidate.student_id,
                roll_number=candidate.roll_number,
                confidence_score=_confidence_score_from_manhattan(dist, distance_threshold),
                manhattan_distance=round(dist, 6),
                distance=round(dist, 6),          # backward-compat alias
                confidence_label=label,
                matched=matched,
                face_size_ratio=ratio,
                quality_warnings=list(quality.warnings),
                recognition_state=_recognition_state(matched, list(quality.warnings), True),
            ))

        logger.info(
            "Recognized %d face(s) against %d enrolled student(s); threshold=%.2f; quality_passed=%s",
            len(matches), len(valid_students), distance_threshold, quality.quality_passed,
        )
        return RecognitionResponse(
            face_count=len(face_locations),
            matches=matches,
            quality=quality,
            message=f"Frame recognized via Haar Cascade + FaceNet + Manhattan distance (threshold={distance_threshold:.2f})",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing recognition")
        raise HTTPException(status_code=500, detail="Internal error during recognition") from exc


# ---------------------------------------------------------------------------
# /recognize-stream — multi-frame session recognition with de-duplication
# (paper §2.5)
# ---------------------------------------------------------------------------

class StreamRecognizeRequest(BaseModel):
    """
    JSON body for /recognize-stream.
    frames: list of base64-encoded JPEG/PNG images.
    enrolled_students: same schema as /recognize.
    distance_threshold: Manhattan L1 threshold.
    """
    frames: list[str]  # base64-encoded image bytes
    enrolled_students: list[EnrolledStudent]
    distance_threshold: float = MANHATTAN_DISTANCE_THRESHOLD


@app.post("/recognize-stream", response_model=StreamRecognitionResponse)
async def recognize_stream(request: StreamRecognizeRequest):
    """
    Multi-frame recognition with session-level de-duplication.

    Paper §2.5: The system captures multiple frames over the course of a
    lecture.  A student missed in an early frame may be caught in a later
    one.  This endpoint:
      1. Runs Haar Cascade + FaceNet + Manhattan on each frame independently.
      2. Accumulates confirmed student IDs across all frames.
      3. De-duplicates: one attendance record per student per session.
      4. Returns the best match per student (lowest Manhattan distance seen).

    ACCURACY CAVEAT: Close-range captures (browser webcam, mobile camera)
    match the paper's tested conditions best.  Wide-angle CCTV feeds at
    distance will yield lower accuracy; see module docstring.
    """
    valid_students = [s for s in request.enrolled_students if _student_embeddings(s)]
    threshold = request.distance_threshold

    # Accumulate: student_id → best (lowest) distance seen across all frames
    best_match_per_student: dict[int, dict] = {}
    total_face_detections = 0

    for frame_b64 in request.frames:
        try:
            image_bytes = base64.b64decode(frame_b64)
            image_array = _load_rgb_image(image_bytes)
        except Exception as exc:
            logger.warning("Skipping undecodable frame: %s", exc)
            continue

        face_locations = _detect_faces(image_array)
        total_face_detections += len(face_locations)
        claimed_in_frame: set[int] = set()

        for location in face_locations:
            try:
                live_emb = _embed_face_crop(image_array, location)
            except ValueError:
                continue

            if not valid_students:
                continue

            distances = [_best_manhattan_distance(s, live_emb) for s in valid_students]
            ranked = sorted(range(len(distances)), key=lambda i: distances[i])
            candidate_idx = next((i for i in ranked if valid_students[i].student_id not in claimed_in_frame), None)
            if candidate_idx is None:
                continue

            candidate = valid_students[candidate_idx]
            dist = distances[candidate_idx]
            if dist >= threshold:
                continue   # below confidence gate; not a confirmed match

            claimed_in_frame.add(candidate.student_id)
            sid = candidate.student_id
            # De-duplicate: keep the best (lowest) distance observation per student
            if sid not in best_match_per_student or dist < best_match_per_student[sid]["dist"]:
                best_match_per_student[sid] = {
                    "dist": dist,
                    "candidate": candidate,
                    "confirmations": best_match_per_student.get(sid, {}).get("confirmations", 0) + 1,
                }
            else:
                best_match_per_student[sid]["confirmations"] += 1

    # Build final per-student FaceMatch list
    aggregated: list[FaceMatch] = []
    for face_idx, (sid, info) in enumerate(best_match_per_student.items()):
        dist = info["dist"]
        candidate = info["candidate"]
        aggregated.append(FaceMatch(
            face_index=face_idx,
            student_id=candidate.student_id,
            roll_number=candidate.roll_number,
            confidence_score=_confidence_score_from_manhattan(dist, threshold),
            manhattan_distance=round(dist, 6),
            distance=round(dist, 6),
            confidence_label=_confidence_label(dist),
            matched=True,
            recognition_state="RECOGNIZED",
            frame_confirmations=info["confirmations"],
        ))

    logger.info(
        "Stream recognition: %d frames, %d face detections, %d unique students matched (threshold=%.2f)",
        len(request.frames), total_face_detections, len(aggregated), threshold,
    )
    return StreamRecognitionResponse(
        frames_processed=len(request.frames),
        face_detections_total=total_face_detections,
        matches=aggregated,
        message=(
            f"Multi-frame recognition complete: {len(aggregated)} unique student(s) identified "
            f"across {len(request.frames)} frame(s). De-duplicated per paper §2.5."
        ),
    )


# ---------------------------------------------------------------------------
# RabbitMQ async worker (unchanged architecture; updated to use new pipeline)
# ---------------------------------------------------------------------------

def _recognize_message(
    image_bytes: bytes,
    students_payload: list[dict],
    distance_threshold: float,
    edge_crop: bool = False,
) -> dict:
    image_array = _load_rgb_image(image_bytes)
    face_locations = _detect_faces(image_array)
    quality = _quality_metrics(image_array, face_locations)
    valid_students = [
        EnrolledStudent.model_validate(item) for item in students_payload
        if _student_embeddings(EnrolledStudent.model_validate(item))
    ]
    matches: list[FaceMatch] = []
    claimed_ids: set[int] = set()

    for face_index, location in enumerate(face_locations):
        ratio = _face_size_ratio(image_array, location)
        try:
            live_emb = _embed_face_crop(image_array, location)
        except ValueError:
            matches.append(FaceMatch(
                face_index=face_index, matched=False, confidence_score=0.0,
                face_size_ratio=ratio, quality_warnings=list(quality.warnings),
                recognition_state="RECAPTURE_REQUIRED", confidence_label="UNKNOWN",
            ))
            continue

        if not valid_students:
            matches.append(FaceMatch(
                face_index=face_index, matched=False, confidence_score=0.0,
                face_size_ratio=ratio, quality_warnings=list(quality.warnings),
                recognition_state=_recognition_state(False, [], False), confidence_label="UNKNOWN",
            ))
            continue

        distances = [_best_manhattan_distance(s, live_emb) for s in valid_students]
        ranked = sorted(range(len(distances)), key=lambda i: distances[i])
        candidate_idx = next((i for i in ranked if valid_students[i].student_id not in claimed_ids), None)
        if candidate_idx is None:
            matches.append(FaceMatch(
                face_index=face_index, matched=False, confidence_score=0.0,
                face_size_ratio=ratio, quality_warnings=list(quality.warnings),
                recognition_state=_recognition_state(False, [], False), confidence_label="UNKNOWN",
            ))
            continue

        candidate = valid_students[candidate_idx]
        dist = distances[candidate_idx]
        matched = dist < distance_threshold
        label = _confidence_label(dist) if matched else "LOW"
        if matched:
            claimed_ids.add(candidate.student_id)
        matches.append(FaceMatch(
            face_index=face_index,
            student_id=candidate.student_id,
            roll_number=candidate.roll_number,
            confidence_score=_confidence_score_from_manhattan(dist, distance_threshold),
            manhattan_distance=round(dist, 6),
            distance=round(dist, 6),
            confidence_label=label,
            matched=matched,
            face_size_ratio=ratio,
            quality_warnings=list(quality.warnings),
            recognition_state=_recognition_state(matched, list(quality.warnings), True),
        ))

    return RecognitionResponse(
        face_count=len(face_locations),
        matches=matches,
        quality=quality,
        message=f"RabbitMQ: Haar Cascade + FaceNet + Manhattan (threshold={distance_threshold:.2f})",
    ).model_dump()


def _rabbit_worker() -> None:
    host = os.getenv("RABBITMQ_HOST", "127.0.0.1")
    port = int(os.getenv("RABBITMQ_PORT", "5672"))
    user = os.getenv("RABBITMQ_USER", "classsight")
    password = os.getenv("RABBITMQ_PASSWORD", "classsight_rabbit_password")
    minio_endpoint = os.getenv("MINIO_ENDPOINT", "127.0.0.1:9000").replace("http://", "").replace("https://", "")
    minio_secure = os.getenv("MINIO_ENDPOINT", "").startswith("https://")
    minio_client = Minio(
        minio_endpoint,
        access_key=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        secret_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
        secure=minio_secure,
    )
    exchange = "classsight.capture.exchange"
    result_exchange = "classsight.recognition.exchange"

    while True:
        try:
            credentials = pika.PlainCredentials(user, password)
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=host, port=port, credentials=credentials, heartbeat=30)
            )
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
                        minio_client.get_object(
                            os.getenv("MINIO_BUCKET", "classsight-captures"), message["objectKey"]
                        ).read(),
                        message.get("enrolledStudents", []),
                        float(message.get("distanceThreshold", MANHATTAN_DISTANCE_THRESHOLD)),
                        bool(message.get("edgeCrop", False)),
                    )
                    ch.basic_publish(
                        exchange=result_exchange,
                        routing_key="recognition.result",
                        body=json.dumps({"sessionId": message["sessionId"], "recognition": response}).encode("utf-8"),
                        properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                except Exception:
                    logger.exception("RabbitMQ recognition worker failed; message will be retried")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue="classsight.capture.recognition", on_message_callback=handle)
            logger.info("RabbitMQ recognition worker connected")
            channel.start_consuming()
        except Exception:
            logger.exception("RabbitMQ worker connection failed; retrying in 5 s")
            time.sleep(5)


@app.on_event("startup")
def start_optional_rabbit_worker():
    if os.getenv("RABBITMQ_WORKER_ENABLED", "false").lower() == "true":
        threading.Thread(target=_rabbit_worker, name="rabbitmq-recognition-worker", daemon=True).start()
        logger.info("RabbitMQ recognition worker enabled")
