from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, ValidationError
import numpy as np
from PIL import Image, ImageFilter
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
import hashlib
import io
import json
import logging
import math
import os
import threading
import time

try:
    import face_recognition
except ImportError:
    face_recognition = None

from scipy.spatial.distance import cdist
from scipy.optimize import linear_sum_assignment

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Service FastAPI")

BLUR_THRESHOLD = float(os.getenv("QUALITY_BLUR_THRESHOLD", "30.0"))
MIN_BRIGHTNESS = float(os.getenv("QUALITY_MIN_BRIGHTNESS", "35.0"))
MAX_BRIGHTNESS = float(os.getenv("QUALITY_MAX_BRIGHTNESS", "220.0"))
MIN_LIVENESS_TEXTURE = float(os.getenv("QUALITY_MIN_LIVENESS_TEXTURE", "2.5"))
MIN_FACE_SIZE_RATIO = float(os.getenv("QUALITY_MIN_FACE_SIZE_RATIO", "0.0005"))
QUALITY_POSE_CHECKS_ENABLED = os.getenv("QUALITY_POSE_CHECKS_ENABLED", "false").lower() == "true"
QUALITY_MAX_ROLL_DEGREES = float(os.getenv("QUALITY_MAX_ROLL_DEGREES", "25.0"))
EDGE_CROP_ENABLED = os.getenv("EDGE_CROP_ENABLED", "false").lower() == "true"
EDGE_CROP_PADDING = float(os.getenv("EDGE_CROP_PADDING", "0.20"))
EDGE_CROP_MAX_DIMENSION = int(os.getenv("EDGE_CROP_MAX_DIMENSION", "0"))

# Phase 1: High-Performance Detection & Matching Settings
TILED_DETECTION_ENABLED = os.getenv("TILED_DETECTION_ENABLED", "true").lower() == "true"
TILED_DETECTION_MIN_DIM = int(os.getenv("TILED_DETECTION_MIN_DIM", "1000"))
TILED_OVERLAP = float(os.getenv("TILED_OVERLAP", "0.15"))
DETECTION_UPSAMPLE = int(os.getenv("DETECTION_UPSAMPLE", "-1"))
DETECTOR_BACKEND = os.getenv("DETECTOR_BACKEND", "dlib_hog").lower()
MATCH_MARGIN_THRESHOLD = float(os.getenv("MATCH_MARGIN_THRESHOLD", "0.05"))


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    face_count: int
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
    distance: Optional[float] = None
    matched: bool
    face_size_ratio: Optional[float] = None
    quality_warnings: list[str] = []
    recognition_state: str = "UNKNOWN"
    margin: Optional[float] = None


class Timings(BaseModel):
    decode_ms: float = 0.0
    detection_ms: float = 0.0
    embedding_ms: float = 0.0
    matching_ms: float = 0.0
    total_ms: float = 0.0


class RecognitionResponse(BaseModel):
    face_count: int
    matches: list[FaceMatch]
    quality: QualityMetrics
    message: str
    timings: Optional[Timings] = None


@app.on_event("startup")
def preload_models():
    """Phase 1: Warm up dlib and deep learning models at startup to eliminate first-request penalty."""
    if face_recognition is not None:
        try:
            dummy = np.zeros((30, 30, 3), dtype=np.uint8)
            face_recognition.face_locations(dummy, number_of_times_to_upsample=0, model="hog")
            face_recognition.face_encodings(dummy, [(0, 30, 30, 0)], model="small", num_jitters=1)
            logger.info("Preloaded dlib face detection & small landmark encoding models successfully")
        except Exception as exc:
            logger.warning("Model preloading encountered error: %s", exc)


@app.get("/health")
def health():
    return {"status": "UP", "service": "face-service-fastapi", "detector_backend": DETECTOR_BACKEND, "tiled_enabled": TILED_DETECTION_ENABLED}


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
    if face_recognition is None:
        raise HTTPException(status_code=500, detail="face_recognition library not installed in this environment")
    if not use_crops:
        # Use small landmark model (5-point) and num_jitters=1 for 3x speedup while preserving exact 128-d output format
        return face_recognition.face_encodings(image_array, face_locations, num_jitters=1, model="small")
    encodings: list[np.ndarray] = []
    for location in face_locations:
        crop = _crop_face(image_array, location)
        crop_height, crop_width = crop.shape[:2]
        crop_encodings = face_recognition.face_encodings(crop, [(0, crop_width, crop_height, 0)], num_jitters=1, model="small")
        if not crop_encodings:
            raise ValueError("Failed to generate an embedding for a detected face crop")
        encodings.append(crop_encodings[0])
    return encodings


def _quality_metrics(image_array: np.ndarray, face_locations: list[tuple[int, int, int, int]]) -> QualityMetrics:
    gray = np.asarray(Image.fromarray(image_array).convert("L"), dtype=np.float32)
    laplacian = (-4.0 * gray + np.roll(gray, 1, axis=0) + np.roll(gray, -1, axis=0)
                 + np.roll(gray, 1, axis=1) + np.roll(gray, -1, axis=1))
    blur_score = float(np.var(laplacian))
    brightness_mean = float(np.mean(gray))
    blurred = np.asarray(Image.fromarray(gray.astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=2)), dtype=np.float32)
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


def _pose_quality_warnings(image_array: np.ndarray, face_location: tuple[int, int, int, int]) -> list[str]:
    if not QUALITY_POSE_CHECKS_ENABLED or face_recognition is None:
        return []
    landmarks = face_recognition.face_landmarks(image_array, [face_location])
    if not landmarks:
        return ["face pose or landmarks unavailable; recapture required"]
    face_landmarks = landmarks[0]
    required = {"left_eye", "right_eye", "nose_tip", "top_lip", "bottom_lip"}
    if not required.issubset(face_landmarks):
        return ["face partially occluded or landmarks unavailable; recapture required"]
    left_eye = np.mean(np.asarray(face_landmarks["left_eye"], dtype=np.float32), axis=0)
    right_eye = np.mean(np.asarray(face_landmarks["right_eye"], dtype=np.float32), axis=0)
    roll_degrees = abs(math.degrees(math.atan2(float(right_eye[1] - left_eye[1]), float(right_eye[0] - left_eye[0]))))
    if roll_degrees > QUALITY_MAX_ROLL_DEGREES:
        return [f"face rotated (roll={roll_degrees:.1f}°, threshold={QUALITY_MAX_ROLL_DEGREES:.1f}°)"]
    return []


def _face_quality_warnings(image_array: np.ndarray, face_location: tuple[int, int, int, int], image_shape: tuple[int, ...], quality: QualityMetrics) -> list[str]:
    height, width = image_shape[:2]
    top, right, bottom, left = face_location
    ratio = max(0, bottom - top) * max(0, right - left) / float(height * width)
    warnings = list(quality.warnings)
    if ratio < MIN_FACE_SIZE_RATIO:
        warnings.append(f"face too small (ratio={ratio:.6f}, threshold={MIN_FACE_SIZE_RATIO:.6f})")
    warnings.extend(_pose_quality_warnings(image_array, face_location))
    return list(dict.fromkeys(warnings))


def _recognition_state(matched: bool, warnings: list[str], has_candidate: bool) -> str:
    if warnings:
        return "RECAPTURE_REQUIRED"
    if not has_candidate:
        return "UNKNOWN"
    if not matched:
        return "LOW_CONFIDENCE"
    return "RECOGNIZED"


_EMBEDDING_CACHE: dict[int, tuple[str, list[np.ndarray]]] = {}


def _student_embeddings(student: EnrolledStudent) -> list[np.ndarray]:
    raw_embeddings = list(student.embeddings)
    if student.embedding:
        raw_embeddings.append(student.embedding)
    valid = [embedding for embedding in raw_embeddings if len(embedding) == 128]
    fingerprint = hashlib.sha256(json.dumps(valid, separators=(",", ":")).encode("utf-8")).hexdigest()
    cached = _EMBEDDING_CACHE.get(student.student_id)
    if cached and cached[0] == fingerprint:
        return cached[1]
    normalized: list[np.ndarray] = []
    additional_count = len(student.embeddings)
    for index, embedding in enumerate(valid):
        vector = np.asarray(embedding, dtype=np.float64)
        if index < additional_count:
            norm = float(np.linalg.norm(vector))
            vector = vector / norm if norm else vector
        normalized.append(vector)
    _EMBEDDING_CACHE[student.student_id] = (fingerprint, normalized)
    return normalized


def _confidence_from_distance(distance: float, boundary: float = 0.6) -> float:
    slope = 0.1
    confidence = 1.0 / (1.0 + np.exp((float(distance) - boundary) / slope))
    return round(float(max(0.0, min(1.0, confidence))), 6)


# ─── Non-Maximum Suppression and IoU for Tiled Detection ─────────────────────

def _calculate_iou(box1: tuple[int, int, int, int], box2: tuple[int, int, int, int]) -> float:
    t1, r1, b1, l1 = box1
    t2, r2, b2, l2 = box2
    inter_t = max(t1, t2)
    inter_l = max(l1, l2)
    inter_b = min(b1, b2)
    inter_r = min(r1, r2)
    if inter_b <= inter_t or inter_r <= inter_l:
        return 0.0
    inter_area = (inter_b - inter_t) * (inter_r - inter_l)
    area1 = max(0, b1 - t1) * max(0, r1 - l1)
    area2 = max(0, b2 - t2) * max(0, r2 - l2)
    union_area = area1 + area2 - inter_area
    return float(inter_area) / float(union_area) if union_area > 0 else 0.0


def _nms(boxes: list[tuple[int, int, int, int]], iou_threshold: float = 0.40) -> list[tuple[int, int, int, int]]:
    if not boxes:
        return []
    # Sort boxes by area descending
    sorted_boxes = sorted(boxes, key=lambda b: (b[2] - b[0]) * (b[1] - b[3]), reverse=True)
    selected: list[tuple[int, int, int, int]] = []
    for b in sorted_boxes:
        if not any(_calculate_iou(b, kept) > iou_threshold for kept in selected):
            selected.append(b)
    return selected


# ─── YuNet Pluggable Detector Backend ─────────────────────────────────────────

_YUNET_DETECTOR = None

def _get_yunet_detector(width: int, height: int):
    global _YUNET_DETECTOR
    candidate_paths = [
        Path(__file__).parent / "face_detection_yunet_2023mar.onnx",
        Path(__file__).parent / "models" / "face_detection_yunet_2023mar.onnx",
        Path("face_detection_yunet_2023mar.onnx"),
    ]
    model_file = next((str(p) for p in candidate_paths if p.exists()), None)
    if not model_file:
        return None
    try:
        import cv2
        detector = cv2.FaceDetectorYN.create(model_file, "", (width, height), score_threshold=0.6, nms_threshold=0.3)
        return detector
    except Exception as exc:
        logger.warning("Could not initialize YuNet detector: %s", exc)
        return None


def _detect_faces_yunet(image_array: np.ndarray) -> Optional[list[tuple[int, int, int, int]]]:
    try:
        import cv2
        h, w = image_array.shape[:2]
        detector = _get_yunet_detector(w, h)
        if detector is None:
            return None
        detector.setInputSize((w, h))
        bgr = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
        _, faces = detector.detect(bgr)
        if faces is None:
            return []
        locations: list[tuple[int, int, int, int]] = []
        for face in faces:
            x, y, fw, fh = map(int, face[:4])
            top = max(0, y)
            left = max(0, x)
            bottom = min(h, y + fh)
            right = min(w, x + fw)
            locations.append((top, right, bottom, left))
        return locations
    except Exception as exc:
        logger.warning("YuNet detection error: %s", exc)
        return None


# ─── Tiled & Parallel Face Detection ──────────────────────────────────────────

def _detect_faces_dlib(image_array: np.ndarray, upsample: int) -> list[tuple[int, int, int, int]]:
    if face_recognition is None:
        return []
    return face_recognition.face_locations(image_array, number_of_times_to_upsample=upsample, model="hog")


def _detect_faces(image_array: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Phase 1: Multithreaded tiled detection or YuNet detector with full-frame fallback."""
    h, w = image_array.shape[:2]

    # 1. Check if YuNet backend requested
    if DETECTOR_BACKEND == "yunet":
        yunet_faces = _detect_faces_yunet(image_array)
        if yunet_faces is not None:
            return yunet_faces
        logger.warning("YuNet detector unavailable, falling back to dlib_hog")

    # 2. Determine upsample: 0 when image >= 1280px to save massive CPU time
    if DETECTION_UPSAMPLE >= 0:
        upsample = DETECTION_UPSAMPLE
    else:
        upsample = 0 if max(h, w) >= 1280 else 1

    # 3. Tiled detection across CPU threads when enabled & image is large
    if TILED_DETECTION_ENABLED and max(h, w) >= TILED_DETECTION_MIN_DIM:
        overlap = TILED_OVERLAP
        w_tile = int(w * (0.5 + overlap / 2.0))
        h_tile = int(h * (0.5 + overlap / 2.0))

        # 4 overlapping tiles (2x2 grid)
        tiles = [
            (0, 0, min(h, h_tile), min(w, w_tile)),                       # Top-Left
            (0, max(0, w - w_tile), min(h, h_tile), w),                   # Top-Right
            (max(0, h - h_tile), 0, h, min(w, w_tile)),                   # Bottom-Left
            (max(0, h - h_tile), max(0, w - w_tile), h, w),               # Bottom-Right
        ]

        def process_tile(coords):
            t_top, t_left, t_bottom, t_right = coords
            tile = np.ascontiguousarray(image_array[t_top:t_bottom, t_left:t_right])
            boxes = _detect_faces_dlib(tile, upsample=0)
            mapped = []
            for top, right, bottom, left in boxes:
                mapped.append((top + t_top, right + t_left, bottom + t_top, left + t_left))
            return mapped

        try:
            with ThreadPoolExecutor(max_workers=min(os.cpu_count() or 4, 4)) as executor:
                tile_results = list(executor.map(process_tile, tiles))

            all_boxes = [box for sublist in tile_results for box in sublist]
            nms_boxes = _nms(all_boxes, iou_threshold=0.40)
            if nms_boxes or len(all_boxes) > 0:
                return nms_boxes
        except Exception as e:
            logger.warning("Tiled detection failed (%s); using fallback full-frame", e)

    # Fallback to standard full-frame detection
    return _detect_faces_dlib(image_array, upsample=upsample)


# ─── Vectorized Hungarian Matching & Margin Check ─────────────────────────────

def _vectorized_hungarian_matching(
    face_encodings: list[np.ndarray],
    valid_students: list[EnrolledStudent],
    distance_threshold: float,
    margin_threshold: float = MATCH_MARGIN_THRESHOLD,
) -> list[dict]:
    """
    Phase 1: Vectorized pairwise Euclidean distance computation + Hungarian algorithm
    (linear_sum_assignment) for globally optimal 1-face-to-1-student assignment
    plus Top-1 vs Top-2 margin safety check.
    """
    M = len(face_encodings)
    K = len(valid_students)
    if M == 0 or K == 0:
        return [{
            "student_id": None, "roll_number": None, "distance": None,
            "confidence_score": 0.0, "matched": False, "is_ambiguous": False, "margin": None
        } for _ in range(M)]

    # 1. Stack all references across valid students into single matrix
    all_refs: list[np.ndarray] = []
    ref_to_student_idx: list[int] = []
    for s_idx, student in enumerate(valid_students):
        student_refs = _student_embeddings(student)
        for ref in student_refs:
            all_refs.append(ref)
            ref_to_student_idx.append(s_idx)

    if not all_refs:
        return [{
            "student_id": None, "roll_number": None, "distance": None,
            "confidence_score": 0.0, "matched": False, "is_ambiguous": False, "margin": None
        } for _ in range(M)]

    E = np.asarray(all_refs, dtype=np.float64)       # shape (TotalReferences, 128)
    F = np.asarray(face_encodings, dtype=np.float64) # shape (M, 128)
    ref_to_student = np.asarray(ref_to_student_idx, dtype=int)

    # 2. Vectorized pairwise distance calculation: shape (M, TotalReferences)
    D_all = cdist(F, E, metric="euclidean")

    # 3. Collapse references per student into (M, K) student cost matrix
    cost_matrix = np.full((M, K), fill_value=np.inf, dtype=np.float64)
    for s_idx in range(K):
        mask = (ref_to_student == s_idx)
        if np.any(mask):
            cost_matrix[:, s_idx] = np.min(D_all[:, mask], axis=1)

    # 4. Hungarian algorithm (scipy linear_sum_assignment)
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    assignment_map = dict(zip(row_ind, col_ind))

    results = []
    for face_idx in range(M):
        if face_idx not in assignment_map:
            results.append({
                "student_id": None, "roll_number": None, "distance": None,
                "confidence_score": 0.0, "matched": False, "is_ambiguous": False, "margin": None
            })
            continue

        assigned_s_idx = assignment_map[face_idx]
        assigned_student = valid_students[assigned_s_idx]
        d1 = float(cost_matrix[face_idx, assigned_s_idx])

        # Top-1 vs Top-2 margin check
        row_dists = np.sort(cost_matrix[face_idx, :])
        if K >= 2:
            d2 = float(row_dists[1] if row_dists[0] == d1 else row_dists[0])
            margin = float(d2 - d1)
            is_ambiguous = (d1 < distance_threshold) and (margin < margin_threshold)
        else:
            margin = 1.0
            is_ambiguous = False

        matched = (d1 < distance_threshold) and not is_ambiguous
        confidence = _confidence_from_distance(d1, distance_threshold)

        results.append({
            "student_id": assigned_student.student_id,
            "roll_number": assigned_student.roll_number,
            "distance": round(d1, 6),
            "confidence_score": confidence,
            "matched": matched,
            "is_ambiguous": is_ambiguous,
            "margin": round(margin, 6),
        })

    return results


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.post("/enroll", response_model=EmbeddingResponse)
async def enroll(image: UploadFile = File(...)):
    if face_recognition is None:
        raise HTTPException(status_code=500, detail="face_recognition library not available")
    try:
        image_array = _load_rgb_image(await image.read())
        face_locations = _detect_faces(image_array)
        face_count = len(face_locations)
        if face_count == 0:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        if face_count > 1:
            raise HTTPException(status_code=400, detail=f"Multiple faces detected ({face_count}). Please provide an image with exactly one face.")

        # Phase 4 Enrollment Quality Gate: reject blurry, too dark, tilted, or small faces
        quality_gate_enabled = os.getenv("ENROLLMENT_QUALITY_GATE_ENABLED", "true").lower() == "true"
        if quality_gate_enabled:
            quality = _quality_metrics(image_array, face_locations)
            top, right, bottom, left = face_locations[0]
            face_h = max(0, bottom - top)
            face_w = max(0, right - left)
            img_area = image_array.shape[0] * image_array.shape[1]
            face_ratio = (face_h * face_w) / float(img_area) if img_area > 0 else 0.0

            rejection_reasons = []
            if quality.blur_score < BLUR_THRESHOLD:
                rejection_reasons.append(f"Image is too blurry (blur score {quality.blur_score:.1f} < threshold {BLUR_THRESHOLD:.1f})")
            if quality.mean_brightness < MIN_BRIGHTNESS:
                rejection_reasons.append(f"Image is too dark (brightness {quality.mean_brightness:.1f} < threshold {MIN_BRIGHTNESS:.1f})")
            elif quality.mean_brightness > MAX_BRIGHTNESS:
                rejection_reasons.append(f"Image is overexposed (brightness {quality.mean_brightness:.1f} > threshold {MAX_BRIGHTNESS:.1f})")
            if face_ratio < 0.02:
                rejection_reasons.append(f"Face is too small in the frame ({face_ratio * 100:.1f}% of image, min 2% required)")

            pose_warnings = _pose_quality_warnings(image_array, face_locations[0])
            if pose_warnings:
                rejection_reasons.extend(pose_warnings)

            if rejection_reasons:
                raise HTTPException(status_code=400, detail="Enrollment photo rejected by quality gate: " + "; ".join(rejection_reasons))

        face_encodings = face_recognition.face_encodings(image_array, face_locations, num_jitters=1, model="small")
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
    t_start = time.perf_counter()
    try:
        try:
            payload = json.loads(enrolled_students)
            students = [EnrolledStudent.model_validate(item) for item in payload]
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid enrolled_students payload: {exc}") from exc

        # 1. Decode image
        raw_bytes = await image.read()
        t_decode_start = time.perf_counter()
        image_array = _load_rgb_image(raw_bytes)
        t_decode_end = time.perf_counter()

        # 2. Face detection (tiled / yunet / dlib)
        t_detect_start = time.perf_counter()
        face_locations = _detect_faces(image_array)
        t_detect_end = time.perf_counter()

        # 3. Quality & Embedding generation
        t_embed_start = time.perf_counter()
        quality = _quality_metrics(image_array, face_locations)
        face_encodings = _encode_detected_faces(image_array, face_locations, edge_crop)
        t_embed_end = time.perf_counter()

        if len(face_encodings) != len(face_locations):
            raise HTTPException(status_code=422, detail="Failed to generate embeddings for all detected faces")

        # 4. Vectorized Matching + Hungarian Assignment + Margin Check
        t_match_start = time.perf_counter()
        valid_students = [student for student in students if _student_embeddings(student)]
        assignment_results = _vectorized_hungarian_matching(
            face_encodings, valid_students, distance_threshold, margin_threshold=MATCH_MARGIN_THRESHOLD
        )
        t_match_end = time.perf_counter()

        matches: list[FaceMatch] = []
        for face_index, result in enumerate(assignment_results):
            face_warning_list = _face_quality_warnings(image_array, face_locations[face_index], image_array.shape, quality)
            top, right, bottom, left = face_locations[face_index]
            face_size_ratio = round(max(0, bottom - top) * max(0, right - left) / float(image_array.shape[0] * image_array.shape[1]), 6)

            is_ambiguous = result.get("is_ambiguous", False)
            if is_ambiguous:
                face_warning_list.append(f"ambiguous match (margin to second candidate < {MATCH_MARGIN_THRESHOLD:.2f})")

            has_candidate = result["student_id"] is not None
            matched = result["matched"]

            if is_ambiguous:
                rec_state = "LOW_CONFIDENCE"
            else:
                rec_state = _recognition_state(matched, face_warning_list, has_candidate)

            matches.append(FaceMatch(
                face_index=face_index,
                student_id=result["student_id"],
                roll_number=result["roll_number"],
                confidence_score=result["confidence_score"],
                distance=result["distance"],
                matched=matched,
                face_size_ratio=face_size_ratio,
                quality_warnings=face_warning_list,
                recognition_state=rec_state,
                margin=result.get("margin"),
            ))

        t_end = time.perf_counter()
        timings = Timings(
            decode_ms=round((t_decode_end - t_decode_start) * 1000, 2),
            detection_ms=round((t_detect_end - t_detect_start) * 1000, 2),
            embedding_ms=round((t_embed_end - t_embed_start) * 1000, 2),
            matching_ms=round((t_match_end - t_match_start) * 1000, 2),
            total_ms=round((t_end - t_start) * 1000, 2),
        )

        logger.info(
            "Recognized %d face(s) against %d student(s) in %.1fms (decode: %.1fms, detect: %.1fms, embed: %.1fms, match: %.1fms)",
            len(matches), len(valid_students), timings.total_ms, timings.decode_ms, timings.detection_ms, timings.embedding_ms, timings.matching_ms
        )

        mode = "edge-cropped" if edge_crop else "full-frame"
        return RecognitionResponse(
            face_count=len(face_locations),
            matches=matches,
            quality=quality,
            message=f"Group photo recognized successfully ({mode} encoding, backend={DETECTOR_BACKEND})",
            timings=timings,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing group recognition")
        raise HTTPException(status_code=500, detail="Internal error during recognition") from exc


# ─── RabbitMQ Worker ──────────────────────────────────────────────────────────

try:
    import pika
    from minio import Minio
except ImportError:
    pika = None
    Minio = None

def _recognize_message(image_bytes: bytes, students_payload: list[dict], distance_threshold: float, edge_crop: bool = EDGE_CROP_ENABLED) -> dict:
    t_start = time.perf_counter()
    t_decode_start = time.perf_counter()
    image_array = _load_rgb_image(image_bytes)
    t_decode_end = time.perf_counter()

    t_detect_start = time.perf_counter()
    face_locations = _detect_faces(image_array)
    t_detect_end = time.perf_counter()

    t_embed_start = time.perf_counter()
    quality = _quality_metrics(image_array, face_locations)
    face_encodings = _encode_detected_faces(image_array, face_locations, edge_crop)
    t_embed_end = time.perf_counter()

    if len(face_encodings) != len(face_locations):
        raise ValueError("Failed to generate embeddings for all detected faces")

    t_match_start = time.perf_counter()
    valid_students = [EnrolledStudent.model_validate(item) for item in students_payload if _student_embeddings(EnrolledStudent.model_validate(item))]
    assignment_results = _vectorized_hungarian_matching(
        face_encodings, valid_students, distance_threshold, margin_threshold=MATCH_MARGIN_THRESHOLD
    )
    t_match_end = time.perf_counter()

    matches: list[FaceMatch] = []
    for face_index, result in enumerate(assignment_results):
        face_warning_list = _face_quality_warnings(image_array, face_locations[face_index], image_array.shape, quality)
        top, right, bottom, left = face_locations[face_index]
        face_size_ratio = round(max(0, bottom - top) * max(0, right - left) / float(image_array.shape[0] * image_array.shape[1]), 6)
        is_ambiguous = result.get("is_ambiguous", False)
        if is_ambiguous:
            face_warning_list.append(f"ambiguous match (margin to second candidate < {MATCH_MARGIN_THRESHOLD:.2f})")
        has_candidate = result["student_id"] is not None
        matched = result["matched"]
        rec_state = "LOW_CONFIDENCE" if is_ambiguous else _recognition_state(matched, face_warning_list, has_candidate)

        matches.append(FaceMatch(
            face_index=face_index,
            student_id=result["student_id"],
            roll_number=result["roll_number"],
            confidence_score=result["confidence_score"],
            distance=result["distance"],
            matched=matched,
            face_size_ratio=face_size_ratio,
            quality_warnings=face_warning_list,
            recognition_state=rec_state,
            margin=result.get("margin"),
        ))

    t_end = time.perf_counter()
    timings = Timings(
        decode_ms=round((t_decode_end - t_decode_start) * 1000, 2),
        detection_ms=round((t_detect_end - t_detect_start) * 1000, 2),
        embedding_ms=round((t_embed_end - t_embed_start) * 1000, 2),
        matching_ms=round((t_match_end - t_match_start) * 1000, 2),
        total_ms=round((t_end - t_start) * 1000, 2),
    )

    mode = "edge-cropped" if edge_crop else "full-frame"
    return RecognitionResponse(
        face_count=len(face_locations),
        matches=matches,
        quality=quality,
        message=f"Group photo recognized successfully ({mode} encoding, backend={DETECTOR_BACKEND})",
        timings=timings,
    ).model_dump()


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
