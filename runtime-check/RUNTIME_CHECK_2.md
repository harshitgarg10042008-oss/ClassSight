# ClassSight Runtime Verification Report (Phase 2 Comprehensive Audit)

**Date:** 2026-10-26  
**Auditor:** Automated Runtime Verification Subsystem  
**Mode:** READ-ONLY Verification & Benchmarking  
**Branch:** `demo-fixes` (Base commit: `0887478` tagged `pre-demo-backup`)  
**Environment:** Windows 11 Host, Docker Desktop (6 containers: `frontend-next`, `backend-spring`, `face-service-fastapi`, `postgres`, `minio`, `rabbitmq`)

---

## 1. Executive Summary Table

| Category | Item / Test | Status | Measured Result / Evidence |
| :--- | :--- | :---: | :--- |
| **Backend Core** | Maven Unit & Integration Tests | **PASS** | 22 tests across 5 test classes executed via JDK 17 container (`AttendanceReviewControllerTest`, `AttendanceAnalyticsServiceTest`, `AttendanceRecognitionServiceTest`, `AttendanceReviewServiceTest`, `TimetableServiceTest`). BUILD SUCCESS, Exit Code 0. |
| **Backend Core** | Finalize Route Architecture | **PASS** | `POST /api/attendance-sessions/{id}/review` exists and functions correctly (`AttendanceReviewController.java:61`). Frontend calls this route (`page.tsx:336`, `lib/api.ts:210`). The prior 500 error was due to an external test script requesting nonexistent `/finalize` route. |
| **Face Service** | Pytest Test Suite | **PARTIAL** | 8 passed, 1 failed, 2 collection errors. Failure: `test_rejection_reason_explains_weak_and_unknown_faces` expected outdated message string. Errors: `_vectorized_hungarian_matching` not exported; `face_recognition` module not installed in container. |
| **E2E Scripts** | `test_enroll.py` | **PASS** | Zero faces = HTTP 400, multi faces = HTTP 400, single face = HTTP 200 (154 ms). |
| **E2E Scripts** | `test_multishot_e2e.py` | **PASS** | Multi-shot frame intake, session state management, and finalization endpoints pass. |
| **E2E Scripts** | `test_pipeline_verification.py`| **PASS** | All 8 assertions verified: detector=haar_cascade, embedder=facenet_vggface2_128d, distance=manhattan_L1, scale_factor=1.2, threshold=15.0, FaceNet & CV2 available. |
| **E2E Scripts** | `test_attendance_session.py` | **FAIL** | Expected `REVIEW_REQUIRED`, got `FAILED` because test class section `TEST-SEC-A` contained 0 enrolled students in default seed. |
| **E2E Scripts** | `test_spring_enroll.py` | **NOT VERIFIED** | Returns HTTP 403 Forbidden; script does not supply a teacher/admin JWT bearer token. |
| **Web UI (Playwright)** | Frontend Load & Rendering | **PASS** | HTTP 200, title `"ClassSight Faculty Flow"`, page interactive in 1,206 ms. |
| **Web UI (Playwright)** | Authentication Flow | **PASS** | Login card present with username/password, signs in as `teacher`, redirects to main dashboard. |
| **Web UI (Playwright)** | Faculty Dashboard Elements | **PASS** | Class/Room dropdowns present (heading: `"Select Class & Room"`), capture button present, sidebar navigation functional. |
| **Web UI (Playwright)** | Browser Console Errors | **PASS** | **0 JavaScript console errors** observed during full faculty navigation flow. |
| **Web UI (Playwright)** | Hardware Camera Preview | **NOT VERIFIED** | Headless automated browser environment lacks physical webcam hardware. |
| **Architecture** | Embedding Dimensionality | **PASS** | FaceNet 512-d features deterministically projected to **128-d** via QR-orthonormal matrix (seed=42), followed by L2 normalization (L2 norm = 1.000000). Stored as `double precision[128]`. |
| **Architecture** | Live Recognition Matching | **PASS** | Uses greedy nearest-neighbor matching by minimum Manhattan distance (`face-service-fastapi/main.py:541-558`), NOT Hungarian algorithm. |
| **Architecture** | Threshold Calibration | **FAIL** | Production threshold is **15.0** (`MANHATTAN_THRESHOLD`). Obama vs Biden distance = 10.84 < 15.0 (would accept impostor). Benchmark Equal Error Rate (EER) threshold is **9.5622**; threshold 15.0 yields FAR = **99.08%** *(Simulated on LFW)*. |
| **Live API Plumbing**| Multi-Student Session Capture | **PASS** | Successfully created class `RTC_SEC_A`, enrolled 3 real LFW identities, executed `POST /capture` (session 58, 312 ms) -> `REVIEW_REQUIRED`, finalized via `POST .../review` to `FINALIZED`. |
| **Live API Plumbing**| Absent Student Detection | **PASS** | Evaluated 2-of-3 students present (session 59, 234 ms). Missing student flagged `ABSENT_CANDIDATE`, finalized to `ABSENT`. |
| **Scale & Limits** | Small Face Detection (<70 px) | **FAIL** | Haar Cascade detects **0% of faces at 40 px and 60 px**, and only **36% at 80 px** *(Simulated on LFW)*. |
| **Data Cleanup** | Database State Integrity | **PASS** | All transient test records, sessions (58-65), embeddings, enrollments, and sections cleanly removed. Baselines `TEST001` and `TEST-SEC-A` preserved intact. |

---

## 2. Top Demo Blockers (Ranked by Severity)

1. **Threshold 15.0 Allows Massive False Acceptances (FAR = 99.08%)**
   - **Severity:** CRITICAL (Severity 10)
   - **Location:** `face-service-fastapi/main.py:112`, `docker-compose.yml:122` (`MANHATTAN_THRESHOLD=15.0`)
   - **Evidence:** On standard LFW pairs, impostor distance mean is 12.61 (p01 = 9.37). Obama vs. Biden distance is 10.84. At threshold 15.0, almost any human face matches an enrolled student (FAR = 99.08%).
   - **Remediation:** Calibrate `MANHATTAN_THRESHOLD` to **9.37** (for 1% FAR) or **9.56** (EER threshold).

2. **Haar Cascade Blind to Distant Classroom Faces (<70 px)**
   - **Severity:** HIGH (Severity 9)
   - **Location:** `face-service-fastapi/main.py:100` (`HAAR_SCALE_FACTOR=1.2`, `minNeighbors=5`)
   - **Evidence:** Measured detection rate on 100 LFW faces across sizes: 40 px = **0%**, 60 px = **0%**, 80 px = **36%**, 120 px = **93%**, 160 px = **99%**. In a classroom composite with 50 px faces, **0/30 (0%)** faces were detected; at 70-110 px, only **17/30 (56.7%)** faces were detected.
   - **Remediation:** Students seated beyond row 3 in standard lecture halls will be marked absent. Use RetinaFace or MTCNN, or implement tiled high-resolution image pyramids.

3. **`test_attendance_session.py` Fails Out-of-the-Box**
   - **Severity:** MEDIUM-HIGH (Severity 8)
   - **Location:** `test_attendance_session.py:119`, Database Seed Data
   - **Evidence:** The script expects session status `REVIEW_REQUIRED`, but backend sets status to `FAILED`. When a class section has zero active enrolled students, `AttendanceRecognitionService.java:134` aborts session processing immediately with `FAILED`.
   - **Remediation:** Ensure seed migrations enroll at least one student into `TEST-SEC-A` (section ID 1).

4. **Pytest Suite Incompatibilities in `face-service-fastapi`**
   - **Severity:** MEDIUM (Severity 7)
   - **Location:** `face-service-fastapi/tests/`
   - **Evidence:** 1 test fails due to rejection string drift (`test_rejection_reason_explains_weak_and_unknown_faces`). 2 tests crash during collection: `test_hungarian_matching.py` attempts to import `_vectorized_hungarian_matching` which does not exist in `main.py`, and `test_recognize_group_photo.py` requires uninstalled `face_recognition` library.
   - **Remediation:** Align test assertions with current rejection messages, remove deprecated Hungarian matching imports (greedy matching is in use), and align test requirements.

5. **`test_spring_enroll.py` Fails with HTTP 403 Forbidden**
   - **Severity:** MEDIUM (Severity 6)
   - **Location:** `test_spring_enroll.py:27`
   - **Evidence:** Directly invokes `POST /students/TEST001/enroll` without acquiring or passing a Bearer JWT token from `/auth/login`.
   - **Remediation:** Update test script to authenticate as `teacher` or `admin` and attach `Authorization: Bearer <token>`.

6. **Webcam Preview Untestable in Headless CI/CD**
   - **Severity:** LOW-MEDIUM (Severity 5)
   - **Location:** `frontend-next/app/page.tsx`, Playwright testing
   - **Evidence:** Playwright headless Chromium cannot open genuine DirectShow/V4L2 webcams without dedicated virtual media feeds (`--use-fake-ui-for-media-stream`). While all DOM buttons and selectors render properly, real camera video feed requires manual inspection on hardware.
   - **Remediation:** Use synthetic video stream devices in automated browser test scripts.

7. **CPU-Bound Recognition Latency Scales Linearly with Face Count**
   - **Severity:** LOW-MEDIUM (Severity 4)
   - **Location:** `face-service-fastapi/main.py` (InceptionResnetV1 on CPU)
   - **Evidence:** Measured latency: 1 face = **145.9 ms**, 5 faces = **516.8 ms**, 10 faces = **1,321.1 ms**, 30 faces = **2,235.2 ms** (p95 = **3,091.7 ms**). On a class of 60 students on CPU, capture round-trip will exceed 4-5 seconds.
   - **Remediation:** Enable batched tensor inference through PyTorch or utilize CUDA execution.

---

## 3. Truthful Numbers & Benchmark Metrics

All numbers below were directly measured from runtime execution in the live environment.

### A. Embedding & Pipeline Architecture (Measured)
- **FaceNet Backbone:** InceptionResnetV1 (`vggface2`)
- **Raw Feature Vector:** 512 dimensions (float32)
- **Dimensionality Reduction:** 128 dimensions via fixed random orthonormal projection matrix (QR decomposition, seed=42)
- **Normalization:** L2 Unit Normalization (measured L2 norm = **1.000000**)
- **Storage Type:** PostgreSQL array `double precision[128]`
- **Distance Metric:** Manhattan $L_1$ distance: $\sum |a_i - b_i|$ (calculated in `np.float64`)
- **Matching Algorithm:** Live endpoint uses greedy nearest-neighbor matching by minimum Manhattan distance (`face-service-fastapi/main.py:541-558`). Hungarian algorithm is NOT used.

### B. Threshold Calibration Metrics *(Simulated on LFW, NOT classroom accuracy)*
Evaluated across **558 genuine matching pairs** and **2,500 impostor non-matching pairs** using the live face service embedder:
- **Genuine Pair Distances:**
  - Minimum: **1.9765**
  - Mean: **6.0331** (Std: 1.5927)
  - 1st Percentile ($p_{01}$): **3.3066**
  - 5th Percentile ($p_{05}$): **3.7294**
  - Median ($p_{50}$): **5.8521**
  - 95th Percentile ($p_{95}$): **8.9932**
  - 99th Percentile ($p_{99}$): **10.2410**
  - Maximum: **12.3124**
- **Impostor Pair Distances:**
  - Minimum: **6.1263**
  - Mean: **12.6053** (Std: 1.1643)
  - 1st Percentile ($p_{01}$): **9.3736**
  - 5th Percentile ($p_{05}$): **10.5650**
  - Median ($p_{50}$): **12.6907**
  - 95th Percentile ($p_{95}$): **14.3285**
  - 99th Percentile ($p_{99}$): **14.9746**
  - Maximum: **15.6515**
- **Golden Reference Check:**
  - Obama vs. Obama (Self): **0.0000**
  - Obama vs. Biden (Different): **10.8420**
- **Operating Curves:**
  - **Equal Error Rate (EER):** **1.44%** at threshold **9.5622**
  - **Operating Point @ FAR = 1.0%:** Threshold = **9.3734**, True Accept Rate (TAR) = **98.03%**
  - **Operating Point @ FAR = 0.1%:** Threshold = **7.6582**, True Accept Rate (TAR) = **82.97%**
  - **Production Default (15.0):** FAR = **99.08%**, TAR = **100.0%** (Virtually zero impostor rejection)

### C. Class Simulation Performance *(Simulated on LFW, NOT classroom accuracy)*
Tested with 30 enrolled students in section 2, probed with 30 class member test images and 30 outside impostor images:
- **At Current Threshold 15.0:**
  - Rank-1 Recognition: **100.0% (30/30)**
  - Wrong Identity Matches: **0.0% (0/30)**
  - Outsider False Accept Rate: **100.0% (30/30 falsely accepted)**
- **At Calibrated EER Threshold (9.5622):**
  - Rank-1 Recognition: **100.0% (30/30)**
  - Wrong Identity Matches: **0.0% (0/30)**
  - Outsider False Accept Rate: **26.67% (8/30)**
  - Outsider Rejection (Marked Unknown): **73.33% (22/30)**
- **At FAR = 1% Threshold (9.3734):**
  - Rank-1 Recognition: **100.0% (30/30)**
  - Wrong Identity Matches: **0.0% (0/30)**
  - Outsider False Accept Rate: **23.33% (7/30)**
  - Outsider Rejection (Marked Unknown): **76.67% (23/30)**
- **At FAR = 0.1% Strict Threshold (7.6582):**
  - Rank-1 Recognition: **86.67% (26/30)**
  - Class Unknowns (False Rejection): **13.33% (4/30)**
  - Outsider False Accept Rate: **0.0% (0/30)**
  - Outsider Rejection (Marked Unknown): **100.0% (30/30)**

### D. Detector Scaling vs. Face Resolution *(Simulated on LFW, NOT classroom accuracy)*
Evaluated on 100 distinct LFW faces centered on $1920 \times 1080$ background using Haar Cascade (`scaleFactor=1.2`, `minNeighbors=5`, `minSize=30`):
- **40 px width:** 0 / 100 detected (**0.0% detection rate**, avg latency 138.9 ms)
- **60 px width:** 0 / 100 detected (**0.0% detection rate**, avg latency 152.9 ms)
- **80 px width:** 36 / 100 detected (**36.0% detection rate**, avg box 38.4 px, avg latency 151.8 ms)
- **120 px width:** 93 / 100 detected (**93.0% detection rate**, avg box 52.1 px, avg latency 128.8 ms)
- **160 px width:** 99 / 100 detected (**99.0% detection rate**, avg box 64.5 px, avg latency 128.7 ms)

### E. Group Photo Classroom Grid *(Simulated on LFW, NOT classroom accuracy)*
Full $1920 \times 1080$ simulated classroom scenes evaluated through live `POST /capture` endpoint:
- **50 px faces:** **0 / 30 detected (0.0%)**, capture latency 337.5 ms. All students marked absent.
- **70–110 px faces (variable rows):** **17 / 30 detected (56.67%)**, all 17 correctly recognized, 0 wrong identity matches, capture latency 1,013.2 ms. Removed 5 students test: all 5 absent candidates confirmed absent.
- **140 px faces (large/close):** **29 / 30 detected (96.67%)**, all 29 correctly recognized, 0 wrong identity matches, capture latency 2,907.6 ms. Removed 5 students test: all 5 absent candidates confirmed absent.

### F. Latency Benchmarks (Hardware: Intel Core i7 12-core CPU, No GPU)
Measured over 5 repeats per face count on `POST /recognize` against a 30-student roster:
- **1 face:** Median = **145.88 ms** (p95 = **155.11 ms**)
  *(Breakdown: Decode 47.2 ms, Quality 36.3 ms, Detection 12.3 ms, Embedding 41.1 ms, Matching 7.2 ms)*
- **5 faces:** Median = **516.81 ms** (p95 = **525.33 ms**)
  *(Breakdown: Decode 68.4 ms, Quality 45.5 ms, Detection 34.8 ms, Embedding 309.7 ms, Matching 10.1 ms)*
- **10 faces:** Median = **1,321.14 ms** (p95 = **2,828.26 ms**)
  *(Breakdown: Decode 68.8 ms, Quality 46.2 ms, Detection 48.6 ms, Embedding 642.7 ms, Matching 9.4 ms)*
- **20 faces:** Median = **2,215.20 ms** (p95 = **3,543.94 ms**)
  *(Breakdown: Decode 65.2 ms, Quality 42.3 ms, Detection 65.7 ms, Embedding 1,202.7 ms, Matching 9.6 ms)*
- **30 faces:** Median = **2,235.21 ms** (p95 = **3,091.70 ms**)
  *(Breakdown: Decode 109.5 ms, Quality 64.7 ms, Detection 124.5 ms, Embedding 1,884.6 ms, Matching 8.9 ms)*

### G. Service & API Measured Response Times
- Teacher Authentication (`POST /auth/login`): **89.9 ms**
- Get Room Options (`GET /rooms`): **33.0 ms**
- Get Faculty Assignments (`GET /faculty-assignments`): **40.0 ms**
- Create Class Section (`POST /students/classes`): **108.0 ms**
- Single Face Enrollment (`POST /students/enroll-single`): **154.0 ms**
- Session Review Fetch (`GET /api/attendance-sessions/{id}/review`): **36.0 ms**
- Session Finalize Review (`POST /api/attendance-sessions/{id}/review`): **130.0 ms**

---

## 4. Items Not Verified & Scoping Limitations

| Item / Feature | Status | Engineering Reason |
| :--- | :---: | :--- |
| **Physical RTSP / IP Camera Feeds** | Not Verified | No physical IP camera hardware exists on the host subnet. Simulated with synthetic JPEG uploads and browser adapter endpoints. |
| **Direct Hardware Webcam Preview** | Not Verified | Verified via Playwright headless Chromium; hardware video display surface not verifiable without a physical webcam device attached to the test runner. |
| **Multi-Tenant Institutional Isolation** | Not Verified | The codebase operates as a single-tenant institutional database schema. Cross-tenant data leak tests do not apply. |
| **30-Day Automated Data Purge Cron** | Not Verified | Database cleanup job exists in scheduled task configuration, but validating retention requires simulated time-travel clock alterations. |
| **`test_spring_enroll.py` Execution** | Not Verified | Script lacks standard authorization token generation required by the secure Spring backend. |

---

## 5. Architectural Clarifications from Previous Audit

1. **The Finalize Route (`POST /api/attendance-sessions/{id}/finalize` vs `/review`):**
   - The backend route has always been `POST /api/attendance-sessions/{id}/review` (`AttendanceReviewController.java:61`).
   - The Next.js frontend calls the exact same `/review` endpoint (`app/page.tsx:336`).
   - The previous test script reported a broken backend route because it incorrectly attempted to access a non-existent `/finalize` route, which Spring Boot dispatched to `ResourceHttpRequestHandler` resulting in an HTTP 500 `NoResourceFoundException`. No backend code modification was required.

2. **Matching Strategy (Greedy vs. Hungarian):**
   - `face-service-fastapi/main.py:541-558` implements a greedy minimum-distance assignment loop.
   - Hungarian matching (`scipy.optimize.linear_sum_assignment`) is not executed during live session capture.

3. **Haar Cascade Detection on Group Photos:**
   - Previous tests reported 0 detections on `obama_biden_group_2010.jpg` because the script called `/recognize` without passing `enrolled_students` form data, triggering an HTTP 422 Unprocessable Entity error rather than a detector failure.
   - Under standard parameters (`scaleFactor=1.2`, `minNeighbors=5`), Haar Cascade detects **7 faces** on that group image.