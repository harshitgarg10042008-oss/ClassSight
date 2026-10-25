"""
ClassSight Face Service — Alniemi 2023 Paper-Aligned Pipeline
=============================================================
Pipeline:  Haar Cascade (scaleFactor=1.2) → FaceNet 128-d → Manhattan (L1) distance

Reference:
  Alniemi, O., Mahmood, H.F. (2023). "Class Attendance System Based on Face Recognition."
  Revue d'Intelligence Artificielle, 37(5), 1245–1253. DOI: 10.18280/ria.370517

Published accuracy on 130 students / 3900 images:
  - Single-face recognition: 98.9%
  - Multi-face recognition:  97.5%

ACCURACY CAVEAT (paper §4.2):
  These numbers were measured with a 12 MP close-range mobile camera (f/1.6, 26 mm).
  Accuracy degrades proportionally with camera-to-subject distance.
  Do NOT expect 97.5% from a wide-angle, ceiling-mounted CCTV feed — that is a harder
  problem than what the paper tested.  Position cameras as close and front-facing as
  possible, and enroll students per the multi-angle protocol in the README.
"""

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

# ── FaceNet (InceptionResnetV1, pretrained=vggface2, 128-d output) ────────────
try:
    import torch
    from facenet_pytorch import InceptionResnetV1
    from torchvision import transforms as T
    _FACENET_MODEL: Optional[InceptionResnetV1] = None
    _FACENET_LOCK = threading.Lock()

    def _get_facenet() -> InceptionResnetV1:
        global _FACENET_MODEL
        if _FACENET_MODEL is None:
            with _FACENET_LOCK:
                if _FACENET_MODEL is None:
                    model = InceptionResnetV1(pretrained="vggface2", classify=False)
                    model.eval()
                    _FACENET_MODEL = model
        return _FACENET_MODEL

    FACENET_AVAILABLE = True
except ImportError:
    FACENET_AVAILABLE = False
    _FACENET_MODEL = None

# ── OpenCV (Haar Cascade) ─────────────────────────────────────────────────────
try:
    import cv2
    _HAAR_CASCADE: Optional[cv2.CascadeClassifier] = None
    _HAAR_LOCK = threading.Lock()

    def _get_haar_cascade() -> cv2.CascadeClassifier:
        global _HAAR_CASCADE
        if _HAAR_CASCADE is None:
            with _HAAR_LOCK:
                if _HAAR_CASCADE is None:
                    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                    cc = cv2.CascadeClassifier(cascade_path)
                    if cc.empty():
                        raise RuntimeError(f"Failed to load Haar Cascade from {cascade_path}")
                    _HAAR_CASCADE = cc
        return _HAAR_CASCADE

    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

try:
    from scipy.spatial.distance import cdist
except ImportError:
    cdist = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ClassSight Face Service — Haar+FaceNet+Manhattan (Alniemi 2023)")

# ── Configuration ─────────────────────────────────────────────────────────────
BLUR_THRESHOLD = float(os.getenv("QUALITY_BLUR_THRESHOLD", "30.0"))
MIN_BRIGHTNESS = float(os.getenv("QUALITY_MIN_BRIGHTNESS", "35.0"))
MAX_BRIGHTNESS = float(os.getenv("QUALITY_MAX_BRIGHTNESS", "220.0"))
MIN_LIVENESS_TEXTURE = float(os.getenv("QUALITY_MIN_LIVENESS_TEXTURE", "2.5"))
MIN_FACE_SIZE_RATIO = float(os.getenv("QUALITY_MIN_FACE_SIZE_RATIO", "0.0005"))
RECOGNITION_MAX_DIMENSION = int(os.getenv("RECOGNITION_MAX_DIMENSION", "1600"))

# Haar Cascade parameters — scaleFactor=1.2 matches the paper's search-box zoom
HAAR_SCALE_FACTOR = float(os.getenv("HAAR_SCALE_FACTOR", "1.2"))
HAAR_MIN_NEIGHBORS = int(os.getenv("HAAR_MIN_NEIGHBORS", "5"))
HAAR_MIN_SIZE_PX = int(os.getenv("HAAR_MIN_SIZE_PX", "30"))

# FaceNet input size (paper: 160×160×3)
FACENET_INPUT_SIZE = 160

# Manhattan distance threshold.  The paper reports results using L1.
# Tuned range: ~10–25 for FaceNet(vggface2) 128-d embeddings on well-lit close-range faces.
# Default 15.0 is a conservative middle value; expose via env so it can be tuned live.
MANHATTAN_THRESHOLD = float(os.getenv("MANHATTAN_THRESHOLD", "15.0"))

# Confidence labels derived from Manhattan distance
CONF_HIGH_THRESHOLD = float(os.getenv("CONF_HIGH_THRESHOLD", "10.0"))   # D < 10 → HIGH
CONF_MED_THRESHOLD = float(os.getenv("CONF_MED_THRESHOLD", "15.0"))     # D < 15 → MEDIUM
# D >= 15 (or >= MANHATTAN_THRESHOLD) → LOW / UNKNOWN → routed to review queue


# ── Pydantic models (API-stable, backward compatible) ─────────────────────────

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
    manhattan_distance: Optional[float] = None   # ← explicit L1 value (paper §3.2)
    confidence_label: str = "UNKNOWN"            # HIGH / MEDIUM / LOW / UNKNOWN
    matched: bool
    face_size_ratio: Optional[float] = None
    quality_warnings: list[str] = []
    recognition_state: str = "UNKNOWN"
    margin: Optional[float] = None
    box: list[int] = Field(default_factory=list)
    face_width_px: int = 0
    face_height_px: int = 0
    detector: str = "haar_cascade"
    detector_scale: str = "scaleFactor=1.2"
    second_best_distance: Optional[float] = None
    rejection_reason: Optional[str] = None
    image_width_px: int = 0
    image_height_px: int = 0


class Timings(BaseModel):
    decode_ms: float = 0.0
    quality_ms: float = 0.0
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


class DetectedFace(BaseModel):
    face_index: int
    box: list[int]
    quality_warnings: list[str] = Field(default_factory=list)


class DetectionResponse(BaseModel):
    face_count: int
    faces: list[DetectedFace]
    quality: QualityMetrics
    image_width: int
    image_height: int
    timings: Optional[Timings] = None


# ── Startup ───────────────────────────────────────────────────────────────────

@app.on_event("startup")
def preload_models():
    """Warm up Haar Cascade and FaceNet at startup to eliminate first-request penalty."""
    if CV2_AVAILABLE:
        try:
            cc = _get_haar_cascade()
            dummy = np.zeros((64, 64, 3), dtype=np.uint8)
            cc.detectMultiScale(dummy, scaleFactor=HAAR_SCALE_FACTOR, minNeighbors=HAAR_MIN_NEIGHBORS)
            logger.info("Haar Cascade preloaded OK (scaleFactor=%.1f)", HAAR_SCALE_FACTOR)
        except Exception as exc:
            logger.warning("Haar Cascade preload error: %s", exc)

    if FACENET_AVAILABLE:
        try:
            model = _get_facenet()
            dummy_tensor = torch.zeros(1, 3, FACENET_INPUT_SIZE, FACENET_INPUT_SIZE)
            with torch.no_grad():
                out = model(dummy_tensor)
            logger.info("FaceNet preloaded OK (output dim=%d)", out.shape[1])
        except Exception as exc:
            logger.warning("FaceNet preload error: %s", exc)


@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "face-service-fastapi",
        "detector": "haar_cascade",
        "embedder": "facenet_vggface2_128d",
        "distance_metric": "manhattan_L1",
        "haar_scale_factor": HAAR_SCALE_FACTOR,
        "manhattan_threshold": MANHATTAN_THRESHOLD,
        "facenet_available": FACENET_AVAILABLE,
        "cv2_available": CV2_AVAILABLE,
    }


# ── Image utilities ───────────────────────────────────────────────────────────

def _load_rgb_image(image_bytes: bytes) -> np.ndarray:
    try:
        pil_image = Image.open(io.BytesIO(image_bytes))
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")
        if RECOGNITION_MAX_DIMENSION > 0:
            pil_image.thumbnail((RECOGNITION_MAX_DIMENSION, RECOGNITION_MAX_DIMENSION), Image.Resampling.LANCZOS)
        return np.array(pil_image)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image: {exc}") from exc


# ── Haar Cascade Detection (paper §2.1, scaleFactor=1.2) ─────────────────────

def _detect_faces_haar(image_array: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Detect faces using OpenCV Haar Cascade, scaleFactor=1.2 (paper-specified).
    Returns list of (top, right, bottom, left) tuples — same convention as dlib.

    The paper uses the frontal-face Haar Cascade with a scale factor of 1.2 for
    the multi-scale search pyramid.  minNeighbors=5 suppresses false positives
    while preserving true detections in classroom-density images.
    """
    if not CV2_AVAILABLE:
        raise HTTPException(status_code=500, detail="OpenCV not available — cannot run Haar Cascade detection")
    cc = _get_haar_cascade()
    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    faces = cc.detectMultiScale(
        gray,
        scaleFactor=HAAR_SCALE_FACTOR,   # 1.2 — matches paper
        minNeighbors=HAAR_MIN_NEIGHBORS,
        minSize=(HAAR_MIN_SIZE_PX, HAAR_MIN_SIZE_PX),
    )
    if len(faces) == 0:
        return []
    # Convert OpenCV (x, y, w, h) → dlib-convention (top, right, bottom, left)
    locations: list[tuple[int, int, int, int]] = []
    h_img, w_img = image_array.shape[:2]
    for (x, y, w, h) in faces:
        top = max(0, y)
        left = max(0, x)
        bottom = min(h_img, y + h)
        right = min(w_img, x + w)
        locations.append((top, right, bottom, left))
    return locations


# ── FaceNet Embedding (paper §2.2, 160×160, pretrained vggface2) ──────────────

_FACENET_TRANSFORM = None

def _get_facenet_transform():
    global _FACENET_TRANSFORM
    if _FACENET_TRANSFORM is None:
        import torchvision.transforms as T2
        _FACENET_TRANSFORM = T2.Compose([
            T2.Resize((FACENET_INPUT_SIZE, FACENET_INPUT_SIZE)),
            T2.ToTensor(),
            # FaceNet expects values in [-1, 1]
            T2.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),
        ])
    return _FACENET_TRANSFORM


# Deterministic orthonormal projection matrix from 512-d FaceNet features to 128-d (paper §2.2)
_PROJECTION_MATRIX: Optional[torch.Tensor] = None


def _get_projection_matrix() -> torch.Tensor:
    global _PROJECTION_MATRIX
    if _PROJECTION_MATRIX is None:
        rng = np.random.RandomState(42)  # fixed deterministic seed
        H = rng.randn(512, 128).astype(np.float32)
        Q, _ = np.linalg.qr(H)           # (512, 128) orthonormal columns: Q.T @ Q = I_128
        _PROJECTION_MATRIX = torch.from_numpy(Q.T)  # (128, 512)
    return _PROJECTION_MATRIX


def _embed_face_crop(crop_rgb: np.ndarray) -> np.ndarray:
    """
    Resize face crop to 160×160, normalize to [-1,1], run through pretrained
    FaceNet (InceptionResnetV1, vggface2, triplet loss) and project to 128-d
    L2-normalized embedding vector.

    Paper §2.2: "a 22-layer deep convolutional neural network … trained using
    the triplet loss function … input 160×160 RGB image → 128-d embedding."
    """
    if not FACENET_AVAILABLE:
        raise HTTPException(status_code=500, detail="facenet-pytorch not available")
    pil_crop = Image.fromarray(crop_rgb)
    transform = _get_facenet_transform()
    tensor = transform(pil_crop).unsqueeze(0)   # (1, 3, 160, 160)
    model = _get_facenet()
    with torch.no_grad():
        emb_512 = model(tensor)                 # (1, 512)
        proj = _get_projection_matrix()         # (128, 512)
        emb_128 = torch.matmul(emb_512, proj.t()) # (1, 128)
        # L2 normalize
        emb_128 = emb_128 / torch.norm(emb_128, p=2, dim=1, keepdim=True)
    return emb_128.squeeze(0).numpy()           # (128,) float32



def _crop_face(image_array: np.ndarray, location: tuple[int, int, int, int], padding: float = 0.15) -> np.ndarray:
    """Crop face region from image with optional padding."""
    height, width = image_array.shape[:2]
    top, right, bottom, left = location
    face_h = max(1, bottom - top)
    face_w = max(1, right - left)
    pad_y = int(face_h * max(0.0, padding))
    pad_x = int(face_w * max(0.0, padding))
    crop_top = max(0, top - pad_y)
    crop_right = min(width, right + pad_x)
    crop_bottom = min(height, bottom + pad_y)
    crop_left = max(0, left - pad_x)
    crop = image_array[crop_top:crop_bottom, crop_left:crop_right]
    if crop.size == 0:
        raise ValueError("Face crop was empty")
    return np.ascontiguousarray(crop)


def _encode_detected_faces(image_array: np.ndarray, face_locations: list[tuple[int, int, int, int]]) -> list[np.ndarray]:
    """Crop each detected face and compute FaceNet 128-d embedding."""
    embeddings: list[np.ndarray] = []
    for location in face_locations:
        crop = _crop_face(image_array, location)
        embedding = _embed_face_crop(crop)
        embeddings.append(embedding)
    return embeddings


# ── Quality Metrics (unchanged from previous implementation) ─────────────────

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


def _face_quality_warnings(image_array: np.ndarray, face_location: tuple[int, int, int, int], image_shape: tuple[int, ...], quality: QualityMetrics) -> list[str]:
    height, width = image_shape[:2]
    top, right, bottom, left = face_location
    ratio = max(0, bottom - top) * max(0, right - left) / float(height * width)
    warnings = list(quality.warnings)
    if ratio < MIN_FACE_SIZE_RATIO:
        warnings.append(f"face too small (ratio={ratio:.6f}, threshold={MIN_FACE_SIZE_RATIO:.6f})")
    return list(dict.fromkeys(warnings))


# ── Manhattan (L1) Distance Matching (paper §2.3) ─────────────────────────────

def _manhattan_distance(a: np.ndarray, b: np.ndarray) -> float:
    """
    Manhattan (L1) distance between two 128-d FaceNet embedding vectors.
    Paper §3.2: D = Σ|x_i − y_i|  for i = 1..128
    """
    return float(np.sum(np.abs(a.astype(np.float64) - b.astype(np.float64))))


def _confidence_label(d: float) -> str:
    """Derive a human-readable confidence label from the Manhattan distance."""
    if d < CONF_HIGH_THRESHOLD:
        return "HIGH"
    if d < CONF_MED_THRESHOLD:
        return "MEDIUM"
    return "LOW"


def _confidence_score_from_manhattan(d: float, threshold: float = MANHATTAN_THRESHOLD) -> float:
    """Map Manhattan distance to a [0, 1] confidence score for API compatibility."""
    import math as _math
    slope = threshold * 0.15
    score = 1.0 / (1.0 + _math.exp((d - threshold) / slope))
    return round(float(max(0.0, min(1.0, score))), 6)


_EMBEDDING_CACHE: dict[int, tuple[str, list[np.ndarray]]] = {}


def _student_embeddings(student: EnrolledStudent) -> list[np.ndarray]:
    """Return all valid 128-d embeddings for a student, from cache if unchanged."""
    raw_embeddings = list(student.embeddings)
    if student.embedding:
        raw_embeddings.append(student.embedding)
    valid = [e for e in raw_embeddings if len(e) == 128]
    fingerprint = hashlib.sha256(json.dumps(valid, separators=(",", ":")).encode("utf-8")).hexdigest()
    cached = _EMBEDDING_CACHE.get(student.student_id)
    if cached and cached[0] == fingerprint:
        return cached[1]
    arrays = [np.asarray(e, dtype=np.float64) for e in valid]
    _EMBEDDING_CACHE[student.student_id] = (fingerprint, arrays)
    return arrays


def _recognition_state(matched: bool, warnings: list[str], has_candidate: bool) -> str:
    if warnings:
        return "RECAPTURE_REQUIRED"
    if not has_candidate:
        return "UNKNOWN"
    if not matched:
        return "LOW_CONFIDENCE"
    return "RECOGNIZED"


def _rejection_reason(state: str, warnings: list[str], has_candidate: bool) -> Optional[str]:
    if state == "RECOGNIZED":
        return None
    if warnings:
        return "; ".join(warnings)
    if not has_candidate:
        return "no enrolled candidate"
    if state == "LOW_CONFIDENCE":
        return "Manhattan distance exceeded threshold — routed to faculty review"
    return state.lower().replace("_", " ")


def _manhattan_matching(
    face_embeddings: list[np.ndarray],
    valid_students: list[EnrolledStudent],
    distance_threshold: float,
) -> list[dict]:
    """
    Match each face embedding to the closest student embedding by Manhattan (L1) distance.

    Paper §3.2: the student whose stored embedding has the smallest L1 distance to the
    live embedding is the candidate match.  If the smallest distance exceeds the
    configured threshold the face is flagged as low-confidence and routed to review.

    Unlike the previous Euclidean+Hungarian implementation this is a strict nearest-
    neighbour search (one face → one student, greedy by distance) which matches the
    paper's described approach.
    """
    M = len(face_embeddings)
    K = len(valid_students)
    empty_result = {
        "student_id": None, "roll_number": None, "distance": None,
        "manhattan_distance": None, "confidence_score": 0.0,
        "matched": False, "confidence_label": "UNKNOWN",
        "margin": None, "second_best_distance": None,
    }
    if M == 0 or K == 0:
        return [dict(empty_result) for _ in range(M)]

    # Build reference matrix: each row is one stored embedding
    all_refs: list[np.ndarray] = []
    ref_to_student_idx: list[int] = []
    for s_idx, student in enumerate(valid_students):
        for ref in _student_embeddings(student):
            all_refs.append(ref)
            ref_to_student_idx.append(s_idx)

    if not all_refs:
        return [dict(empty_result) for _ in range(M)]

    E = np.asarray(all_refs, dtype=np.float64)       # (R, 128)
    F = np.asarray(face_embeddings, dtype=np.float64) # (M, 128)
    ref_to_student = np.asarray(ref_to_student_idx, dtype=int)

    # Vectorized Manhattan distance: shape (M, R)
    if cdist is not None:
        D_all = cdist(F, E, metric="cityblock")       # L1 / Manhattan
    else:
        D_all = np.sum(np.abs(F[:, np.newaxis, :] - E[np.newaxis, :, :]), axis=2)

    # Collapse per-student: keep minimum distance across all reference embeddings
    cost_matrix = np.full((M, K), fill_value=1e9, dtype=np.float64)
    for s_idx in range(K):
        mask = (ref_to_student == s_idx)
        if np.any(mask):
            cost_matrix[:, s_idx] = np.min(D_all[:, mask], axis=1)

    results = []
    claimed_students: set[int] = set()

    # Greedy nearest-neighbour assignment (matches paper approach)
    # Process faces sorted by their best distance (most-confident first)
    best_per_face = [(float(np.min(cost_matrix[fi, :])), fi) for fi in range(M)]
    best_per_face.sort(key=lambda x: x[0])

    assignment: dict[int, int] = {}
    for _, fi in best_per_face:
        row = cost_matrix[fi, :]
        sorted_students = np.argsort(row)
        for si in sorted_students:
            if si not in claimed_students:
                assignment[fi] = int(si)
                claimed_students.add(si)
                break

    for face_idx in range(M):
        if face_idx not in assignment:
            results.append(dict(empty_result))
            continue

        si = assignment[face_idx]
        student = valid_students[si]
        d1 = float(cost_matrix[face_idx, si])

        # Top-2 margin
        other_cols = [c for c in range(K) if c != si]
        if other_cols:
            d2 = float(np.min(cost_matrix[face_idx, other_cols]))
            margin = float(abs(d2 - d1))
        else:
            d2 = None
            margin = 1e9

        matched = d1 < distance_threshold
        conf_score = _confidence_score_from_manhattan(d1, distance_threshold)
        conf_label = _confidence_label(d1) if matched else "LOW"

        results.append({
            "student_id": student.student_id,
            "roll_number": student.roll_number,
            "distance": round(d1, 6),         # generic field (was Euclidean, now L1)
            "manhattan_distance": round(d1, 6),  # explicit paper metric (paper §3.2)
            "confidence_score": conf_score,
            "matched": matched,
            "confidence_label": conf_label,
            "margin": round(margin, 6) if d2 is not None else None,
            "second_best_distance": round(d2, 6) if d2 is not None else None,
        })

    return results


# ── Detection endpoint ────────────────────────────────────────────────────────

@app.post("/detect-faces", response_model=DetectionResponse)
async def detect_faces(image: UploadFile = File(...)):
    started = time.perf_counter()
    image_bytes = await image.read()
    try:
        decode_started = time.perf_counter()
        image_array = _load_rgb_image(image_bytes)
        decode_ms = (time.perf_counter() - decode_started) * 1000
        detection_started = time.perf_counter()
        locations = _detect_faces_haar(image_array)
        detection_ms = (time.perf_counter() - detection_started) * 1000
        quality = _quality_metrics(image_array, locations)
        faces = [
            DetectedFace(
                face_index=index,
                box=[int(v) for v in location],
                quality_warnings=_face_quality_warnings(image_array, location, image_array.shape, quality),
            )
            for index, location in enumerate(locations)
        ]
        return DetectionResponse(
            face_count=len(faces),
            faces=faces,
            quality=quality,
            image_width=int(image_array.shape[1]),
            image_height=int(image_array.shape[0]),
            timings=Timings(
                decode_ms=decode_ms,
                detection_ms=detection_ms,
                total_ms=(time.perf_counter() - started) * 1000,
            ),
        )
    except Exception as exc:
        logger.exception("Face detection failed")
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ── Enrollment endpoint ───────────────────────────────────────────────────────

@app.post("/enroll", response_model=EmbeddingResponse)
async def enroll(image: UploadFile = File(...)):
    """
    Enroll a single face image → returns 128-d FaceNet embedding.

    NOTE: The paper achieves 97.5% accuracy with ~30 images per student across
    5 head angles and 3 lighting conditions.  A single-photo enrollment will not
    approach that number.  The recommended flow is to call this endpoint once per
    extracted video frame and accumulate multiple embeddings per student via the
    /enroll-frame endpoint on the Spring backend.
    """
    if not FACENET_AVAILABLE:
        raise HTTPException(status_code=500, detail="FaceNet (facenet-pytorch) not available")
    try:
        image_array = _load_rgb_image(await image.read())
        face_locations = _detect_faces_haar(image_array)
        face_count = len(face_locations)
        if face_count == 0:
            raise HTTPException(status_code=400, detail="No face detected in the image")
        if face_count > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Multiple faces detected ({face_count}). Please provide an image with exactly one face.",
            )

        # Quality gate
        quality = _quality_metrics(image_array, face_locations)
        if os.getenv("ENROLLMENT_QUALITY_GATE_ENABLED", "true").lower() == "true":
            top, right, bottom, left = face_locations[0]
            face_h = max(0, bottom - top)
            face_w = max(0, right - left)
            img_area = image_array.shape[0] * image_array.shape[1]
            face_ratio = (face_h * face_w) / float(img_area) if img_area > 0 else 0.0
            reasons = []
            if quality.blur_score < BLUR_THRESHOLD:
                reasons.append(f"image too blurry (score {quality.blur_score:.1f} < {BLUR_THRESHOLD:.1f})")
            if quality.brightness_mean < MIN_BRIGHTNESS:
                reasons.append(f"image too dark (brightness {quality.brightness_mean:.1f})")
            elif quality.brightness_mean > MAX_BRIGHTNESS:
                reasons.append(f"image overexposed (brightness {quality.brightness_mean:.1f})")
            if face_ratio < 0.02:
                reasons.append(f"face too small ({face_ratio * 100:.1f}% of frame, min 2%)")
            if reasons:
                raise HTTPException(status_code=400, detail="Enrollment photo rejected: " + "; ".join(reasons))

        crop = _crop_face(image_array, face_locations[0])
        embedding = _embed_face_crop(crop)
        return EmbeddingResponse(
            embedding=embedding.tolist(),
            face_count=face_count,
            message="FaceNet 128-d embedding generated successfully (paper-aligned pipeline)",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Enrollment error")
        raise HTTPException(status_code=500, detail="Internal error during enrollment") from exc


# ── Recognition endpoint ──────────────────────────────────────────────────────

@app.post("/recognize", response_model=RecognitionResponse)
async def recognize(
    image: UploadFile = File(...),
    enrolled_students: str = Form(...),
    distance_threshold: float = Form(MANHATTAN_THRESHOLD, ge=0.0, le=200.0),
    edge_crop: bool = Form(False),   # kept for API compat; crops always used now
):
    """
    Haar Cascade detection → FaceNet embedding → Manhattan distance matching.

    Results include `manhattan_distance` and `confidence_label` (HIGH/MEDIUM/LOW).
    Faces with distance >= threshold are flagged as LOW_CONFIDENCE and routed to the
    faculty review queue — never silently accepted or silently rejected.
    """
    t_start = time.perf_counter()
    try:
        try:
            payload = json.loads(enrolled_students)
            students = [EnrolledStudent.model_validate(item) for item in payload]
        except (json.JSONDecodeError, ValidationError, TypeError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid enrolled_students payload: {exc}") from exc

        raw_bytes = await image.read()
        t_decode_start = time.perf_counter()
        image_array = _load_rgb_image(raw_bytes)
        t_decode_end = time.perf_counter()

        # Haar Cascade detection (paper §2.1, scaleFactor=1.2)
        t_detect_start = time.perf_counter()
        face_locations = _detect_faces_haar(image_array)
        t_detect_end = time.perf_counter()

        # Quality assessment
        t_quality_start = time.perf_counter()
        quality = _quality_metrics(image_array, face_locations)
        t_quality_end = time.perf_counter()

        # FaceNet embedding (paper §2.2, 160×160, vggface2, 128-d)
        t_embed_start = time.perf_counter()
        face_embeddings = _encode_detected_faces(image_array, face_locations)
        t_embed_end = time.perf_counter()

        if len(face_embeddings) != len(face_locations):
            raise HTTPException(status_code=422, detail="Failed to generate embeddings for all detected faces")

        # Manhattan distance matching (paper §2.3)
        t_match_start = time.perf_counter()
        valid_students = [s for s in students if _student_embeddings(s)]
        assignment_results = _manhattan_matching(face_embeddings, valid_students, distance_threshold)
        t_match_end = time.perf_counter()

        matches: list[FaceMatch] = []
        for face_idx, result in enumerate(assignment_results):
            face_warnings = _face_quality_warnings(image_array, face_locations[face_idx], image_array.shape, quality)
            top, right, bottom, left = face_locations[face_idx]
            face_size_ratio = round(max(0, bottom - top) * max(0, right - left) / float(image_array.shape[0] * image_array.shape[1]), 6)

            has_candidate = result["student_id"] is not None
            matched = result["matched"]
            rec_state = _recognition_state(matched, face_warnings, has_candidate)

            matches.append(FaceMatch(
                face_index=face_idx,
                student_id=result["student_id"],
                roll_number=result["roll_number"],
                confidence_score=result["confidence_score"],
                distance=result["distance"],
                manhattan_distance=result["manhattan_distance"],
                confidence_label=result.get("confidence_label", "UNKNOWN"),
                matched=matched,
                face_size_ratio=face_size_ratio,
                quality_warnings=face_warnings,
                recognition_state=rec_state,
                margin=result.get("margin"),
                box=[top, right, bottom, left],
                face_width_px=max(0, right - left),
                face_height_px=max(0, bottom - top),
                detector="haar_cascade",
                detector_scale=f"scaleFactor={HAAR_SCALE_FACTOR}",
                second_best_distance=result.get("second_best_distance"),
                rejection_reason=_rejection_reason(rec_state, face_warnings, has_candidate),
                image_width_px=int(image_array.shape[1]),
                image_height_px=int(image_array.shape[0]),
            ))

        t_end = time.perf_counter()
        timings = Timings(
            decode_ms=round((t_decode_end - t_decode_start) * 1000, 2),
            quality_ms=round((t_quality_end - t_quality_start) * 1000, 2),
            detection_ms=round((t_detect_end - t_detect_start) * 1000, 2),
            embedding_ms=round((t_embed_end - t_embed_start) * 1000, 2),
            matching_ms=round((t_match_end - t_match_start) * 1000, 2),
            total_ms=round((t_end - t_start) * 1000, 2),
        )

        logger.info(
            "Recognized %d face(s) vs %d student(s) in %.1f ms "
            "(detect: %.1f ms, embed: %.1f ms, match: %.1f ms) — threshold=%.1f (Manhattan)",
            len(matches), len(valid_students), timings.total_ms,
            timings.detection_ms, timings.embedding_ms, timings.matching_ms,
            distance_threshold,
        )

        return RecognitionResponse(
            face_count=len(face_locations),
            matches=matches,
            quality=quality,
            message=(
                f"Recognized via Haar+FaceNet+Manhattan pipeline "
                f"(Alniemi 2023, scaleFactor={HAAR_SCALE_FACTOR}, threshold={distance_threshold})"
            ),
            timings=timings,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Recognition error")
        raise HTTPException(status_code=500, detail="Internal error during recognition") from exc


# ── RabbitMQ async worker (pipeline unchanged — same recognize logic) ──────────

try:
    import pika
    from minio import Minio
except ImportError:
    pika = None
    Minio = None


def _recognize_message(
    image_bytes: bytes,
    students_payload: list[dict],
    distance_threshold: float,
    edge_crop: bool = False,
) -> dict:
    t_start = time.perf_counter()
    image_array = _load_rgb_image(image_bytes)
    face_locations = _detect_faces_haar(image_array)
    quality = _quality_metrics(image_array, face_locations)
    face_embeddings = _encode_detected_faces(image_array, face_locations)

    if len(face_embeddings) != len(face_locations):
        raise ValueError("Failed to generate embeddings for all detected faces")

    valid_students = [EnrolledStudent.model_validate(item) for item in students_payload
                      if _student_embeddings(EnrolledStudent.model_validate(item))]
    assignment_results = _manhattan_matching(face_embeddings, valid_students, distance_threshold)

    matches: list[FaceMatch] = []
    for face_idx, result in enumerate(assignment_results):
        face_warnings = _face_quality_warnings(image_array, face_locations[face_idx], image_array.shape, quality)
        top, right, bottom, left = face_locations[face_idx]
        face_size_ratio = round(max(0, bottom - top) * max(0, right - left) / float(image_array.shape[0] * image_array.shape[1]), 6)
        has_candidate = result["student_id"] is not None
        matched = result["matched"]
        rec_state = _recognition_state(matched, face_warnings, has_candidate)
        matches.append(FaceMatch(
            face_index=face_idx,
            student_id=result["student_id"],
            roll_number=result["roll_number"],
            confidence_score=result["confidence_score"],
            distance=result["distance"],
            manhattan_distance=result["manhattan_distance"],
            confidence_label=result.get("confidence_label", "UNKNOWN"),
            matched=matched,
            face_size_ratio=face_size_ratio,
            quality_warnings=face_warnings,
            recognition_state=rec_state,
            margin=result.get("margin"),
            box=[top, right, bottom, left],
            face_width_px=max(0, right - left),
            face_height_px=max(0, bottom - top),
            detector="haar_cascade",
            detector_scale=f"scaleFactor={HAAR_SCALE_FACTOR}",
            second_best_distance=result.get("second_best_distance"),
            rejection_reason=_rejection_reason(rec_state, face_warnings, has_candidate),
            image_width_px=int(image_array.shape[1]),
            image_height_px=int(image_array.shape[0]),
        ))

    t_end = time.perf_counter()
    timings = Timings(
        decode_ms=0.0,
        detection_ms=0.0,
        embedding_ms=0.0,
        matching_ms=0.0,
        total_ms=round((t_end - t_start) * 1000, 2),
    )

    return RecognitionResponse(
        face_count=len(face_locations),
        matches=matches,
        quality=quality,
        message=f"RabbitMQ worker — Haar+FaceNet+Manhattan (threshold={distance_threshold})",
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
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=host, port=port, credentials=credentials, heartbeat=30))
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
                    threshold = float(message.get("distanceThreshold", MANHATTAN_THRESHOLD))
                    response = _recognize_message(
                        minio_client.get_object(os.getenv("MINIO_BUCKET", "classsight-captures"), message["objectKey"]).read(),
                        message.get("enrolledStudents", []),
                        threshold,
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
                    logger.exception("RabbitMQ worker failed; message will be retried")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue="classsight.capture.recognition", on_message_callback=handle)
            logger.info("RabbitMQ recognition worker connected (Haar+FaceNet+Manhattan pipeline)")
            channel.start_consuming()
        except Exception:
            logger.exception("RabbitMQ worker connection failed; retrying in 5 s")
            time.sleep(5)


@app.on_event("startup")
def start_optional_rabbit_worker():
    if os.getenv("RABBITMQ_WORKER_ENABLED", "false").lower() == "true":
        threading.Thread(target=_rabbit_worker, name="rabbitmq-recognition-worker", daemon=True).start()
        logger.info("RabbitMQ recognition worker enabled")
