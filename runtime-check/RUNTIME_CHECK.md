# ClassSight Runtime Verification Report

**Date:** 2026-10-26  
**Auditor:** Automated Runtime Verification  
**Mode:** READ-ONLY (no code changes)

---

## 1. Summary Table

| Part | Item | PASS/FAIL/NOT VERIFIED | Evidence |
|------|------|------------------------|----------|
| **A** | Backend Maven tests | NOT VERIFIED | Maven not available locally; container has only app.jar, no mvnw |
| **A** | Face service pytest | NOT VERIFIED | pytest not installed in container; Dockerfile doesn't copy tests/ |
| **A** | test_enroll.py | PASS | All 3 tests passed (zero faces: 400, multi faces: 400, single face: 200, 513ms) |
| **A** | test_attendance_session.py | FAIL | Expected REVIEW_REQUIRED, got FAILED (session status mismatch) |
| **A** | test_multishot_e2e.py | PASS | All multi-shot endpoints passed; session ID 55 created, 0 records (no enrolled students in test class) |
| **A** | test_pipeline_verification.py | PASS | All pipeline components verified: detector=haar_cascade, embedder=facenet_vggface2_128d, distance=manhattan_L1, threshold=15.0 |
| **B** | Embedding size | PASS | 128-d (measured via /enroll endpoint) |
| **B** | L2 normalization | PASS | L2 norm = 1.000000 (normalized before storage) |
| **B** | Detector | PASS | haar_cascade (from /health endpoint) |
| **B** | Input size | PASS | 160x160x3 (FACENET_INPUT_SIZE = 160 in main.py:107) |
| **B** | Stored size (DB) | PASS | students.face_embedding: 128, student_face_embeddings.embedding: 128 (verified via DB query) |
| **B** | Distance computation | PASS | main.py:425: `np.sum(np.abs(a.astype(np.float64) - b.astype(np.float64)))` |
| **B** | Threshold application | PASS | main.py:576: `matched = d1 < distance_threshold` |
| **B** | Threshold value | PASS | 15.0 (MANHATTAN_THRESHOLD env var wins; application.yml's 0.6 is unused by face service) |
| **B** | Threshold sanity check | FAIL | Same-person distance: 0.0, Different-person (Obama vs Biden): 10.84, Threshold: 15.0. Does NOT separate them (10.84 < 15.0 would incorrectly accept different person as match) |
| **C** | Login | PASS | HTTP 200, 204ms |
| **C** | Get cameras | PASS | HTTP 200, 57ms |
| **C** | Get rooms | PASS | HTTP 200, 33ms |
| **C** | Get assignments | PASS | HTTP 200, 40ms |
| **C** | Capture group photo | PASS | HTTP 200, 346ms, but sessionStatus=FAILED (no recognition occurred) |
| **C** | Review session | PASS | HTTP 200, 65ms, 0 records (no students enrolled in test class) |
| **C** | Finalize session | FAIL | HTTP 500, "No static resource api/attendance-sessions/56/finalize" |
| **C** | Capture second photo | PASS | HTTP 200, 179ms, sessionStatus=FAILED |
| **C** | Review session 2 | PASS | HTTP 200, 36ms, 0 records |
| **C** | Finalize session 2 | FAIL | HTTP 500, "No static resource api/attendance-sessions/57/finalize" |
| **C** | Check roster | PASS | HTTP 200, 0 students (no students in active class) |
| **D** | Roster TEST001/blank names | NOT REPRODUCED | GET /students returns 0 students for teacher; DB has TEST001 but marked inactive/archived (V14 migration) |
| **D** | No-face to enrollment | PASS | HTTP 400, {"detail":"No face detected in the image"} |
| **D** | No-face to capture | PARTIAL | HTTP 400, {"error":"An image file is required"} (wrong error message, should be "No face detected") |
| **D** | Headless browser (Playwright) | NOT VERIFIED | Playwright not installed; camera preview requires hardware |
| **D** | Quick Class Enrollment | NOT VERIFIED | Requires frontend interaction; API-only check not possible |
| **D** | Seeded/fake recognition results | NOT REPRODUCED | No students with faceRegistered=True found; demo students have no embeddings |

---

## 2. Demo Blockers (Ranked by Severity)

| Rank | Severity | Issue | File/Endpoint | Exact Error |
|------|----------|-------|---------------|-------------|
| 1 | 10 | **Recognition pipeline broken in live capture** | BrowserCameraAdapter.java:84 | Sessions created with status=FAILED, no attendance records generated; dummy images (no faces) should still create session with 0 records, but recognition service not called or fails silently |
| 2 | 9 | **Finalize endpoint not reachable** | POST /api/attendance-sessions/{id}/finalize | HTTP 500: "No static resource api/attendance-sessions/56/finalize" - Spring routing configuration broken |
| 3 | 8 | **Threshold does not separate different people** | face-service-fastapi/main.py:112, 576 | Obama vs Biden Manhattan distance = 10.84 < threshold 15.0, would incorrectly accept as same person |
| 4 | 7 | **No enrolled students in active class** | DB query | GET /students returns 0 students; all demo students (DEMO001-DEMO030) not enrolled in active class section |
| 5 | 6 | **Backend tests not executable** | backend-spring/ | Maven not available locally; container lacks mvnw; cannot verify backend logic |
| 6 | 5 | **Face service tests not executable** | face-service-fastapi/ | pytest not installed in container; Dockerfile doesn't copy tests/ directory |
| 7 | 4 | **test_attendance_session.py fails** | test_attendance_session.py:119 | Expected REVIEW_REQUIRED, got FAILED - recognition not completing correctly |
| 8 | 3 | **No-face capture error message misleading** | POST /capture | Returns "An image file is required" instead of "No face detected" |
| 9 | 2 | **Quick Class Enrollment not verifiable** | frontend-next/app/page.tsx:832 | Requires manual frontend interaction; no API-only test path |
| 10 | 1 | **Playwright not installed** | N/A | Cannot verify frontend console errors or camera preview without hardware |

---

## 3. Numbers We Can Truthfully Quote

### Measured via Runtime Execution

**Recognition Pipeline (from /health endpoint):**
- Detector: `haar_cascade`
- Embedder: `facenet_vggface2_128d`
- Distance metric: `manhattan_L1`
- Haar scale factor: `1.2`
- Manhattan threshold: `15.0`
- FaceNet available: `True`
- OpenCV available: `True`

**Embedding Characteristics (measured on obama_reference.jpg):**
- Embedding size: **128 dimensions**
- L2 norm: **1.000000** (normalized)
- First 5 values: `[-0.03538, -0.01168, -0.08893, 0.05318, 0.00690]`
- Enrollment time: **525ms**

**Database Storage (verified via psql):**
- `students.face_embedding` array length: **128**
- `student_face_embeddings.embedding` array length: **128**
- Model version: `facenet-vggface2-128d-v1`
- TEST001 record: 5 multi-reference embeddings, 1 legacy embedding (all 128-d)

**Distance Measurements (golden-set):**
- Same-person distance (Obama vs Obama): **0.000000**
- Different-person distance (Obama vs Biden): **10.841973**
- Configured threshold: **15.0**
- **Critical finding**: Different-person distance (10.84) < threshold (15.0), so threshold does NOT separate them

**API Response Times (measured):**
- Login: **204ms**
- Get rooms: **33ms**
- Get assignments: **40ms**
- Get cameras: **57ms**
- Capture photo: **346ms** (group), **179ms** (single)
- Review session: **65ms** (session 1), **36ms** (session 2)
- Check roster: **75ms**

**E2E Test Results:**
- test_enroll.py: **PASS** (513ms for single face enrollment)
- test_multishot_e2e.py: **PASS** (multi-shot session created, 0 records)
- test_pipeline_verification.py: **PASS** (all 8 checks passed)
- test_attendance_session.py: **FAIL** (status mismatch: expected REVIEW_REQUIRED, got FAILED)

**Historical Attendance Records (from DB):**
- TEST001 has 7 historical records with status PRESENT/ABSENT/REVIEW
- Confidence scores range: 0.3659 to 0.9987
- All records have valid student_id and session_id foreign keys

---

## 4. Could Not Verify

| Item | Reason |
|------|--------|
| Backend Maven unit tests | Maven not installed locally; Docker container has only app.jar (built with `mvn package -DskipTests`), no Maven wrapper; cannot execute tests without rebuilding image with test dependencies |
| Face service pytest tests | pytest not installed in container; Dockerfile only copies main.py and requirements.txt, does not copy tests/ directory; would require rebuilding image with test dependencies |
| Full faculty flow with real student enrollment | Sessions created with status=FAILED; finalize endpoint returns 500; cannot complete end-to-end flow without fixing routing/recognition issues |
| Student enrollment with real photos and recognition | Capture endpoint creates FAILED sessions; recognition not completing; cannot verify enrollment → capture → review → finalize flow |
| Absent student detection in second session | Sessions never reach FINALIZED state; finalize endpoint broken; cannot verify if removed student marked ABSENT |
| Recognition-call time vs face count | Sessions fail before recognition completes; cannot measure actual recognition latency |
| Frontend camera preview | Playwright not installed; requires physical webcam or fake-media-stream flag; cannot verify black-screen bug or preview functionality |
| Quick Class Enrollment creating real students | Requires frontend interaction; no API-only endpoint; cannot verify without manual browser testing |
| Seeded demo student enrollment status | GET /students returns 0 students for teacher; demo students (DEMO001-DEMO030) exist in DB but not enrolled in active class section |
| Golden-set regression accuracy | Golden-set recognition on obama_biden_group_2010.jpg returned HTTP 422 (0 faces detected); Haar Cascade failing on this image; cannot compute accuracy |
| RTSP/IP camera integration | No physical RTSP camera available; simulated streams not tested; cannot verify real-world camera adapter |
| Multi-tenant functionality | Not implemented; single-tenant architecture; cannot verify isolation between institutions |
| Data retention (30-day purge) | Cron job exists but not verified at runtime; would require waiting 30 days or manual trigger |
| Embedding encryption at rest | Not implemented; embeddings stored as plain double precision arrays; cannot verify encryption |

---

## Additional Notes

### Critical Path Blockers for Demo

The most severe blocker (#1) is that the recognition pipeline is broken in live capture. Sessions are created with status=FAILED and no attendance records are generated. This prevents any demo of the core attendance feature. The issue appears to be in the BrowserCameraAdapter or the downstream recognition service call.

The second blocker (#2) is that the finalize endpoint is not reachable (HTTP 500 with "No static resource" error), which means even if recognition worked, sessions could not be finalized.

The third blocker (#3) is a configuration issue: the Manhattan threshold of 15.0 does not separate different people (Obama vs Biden distance is 10.84). This could cause false positives in a real demo if faces are similar.

### Environment Notes

- All 6 Docker containers started successfully and are healthy
- Health endpoints respond correctly on ports 8080 and 8000
- Next.js frontend accessible on port 3000
- PostgreSQL, MinIO, RabbitMQ all operational
- No Maven or pytest installed locally or in containers
- Playwright not installed for headless browser testing

### Test Image Limitations

- Golden-set obama_biden_group_2010.jpg: Haar Cascade detected 0 faces (HTTP 422 from /recognize)
- Individual reference images (obama_reference.jpg, biden_reference.jpg): Work for enrollment, but group photo detection fails
- Dummy generated images (640x480 blue/green): Used for capture tests, but have no faces, leading to FAILED sessions

---

**End of Runtime Verification Report**
