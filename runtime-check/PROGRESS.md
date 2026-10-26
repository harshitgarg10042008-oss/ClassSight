# ClassSight Runtime Verification Progress

**Branch:** demo-fixes  
**Pre-demo backup tag:** pre-demo-backup (commit `0887478`)  
**Session started:** 2026-10-26  

## Checklist

| Step | Status | Key Results / Summary |
|------|--------|-----------------------|
| Step 1: Finalize route | DONE | PASS - No code fix needed. Backend route: `POST /api/attendance-sessions/{sessionId}/review` (`AttendanceReviewController.java:61`, requires ADMIN/HOD/TEACHER and session ownership). Frontend calls `POST /api/attendance-sessions/${sessionId}/review` (`app/page.tsx:336`, `lib/api.ts:210`). The test error was (a) test script calling non-existent `/finalize`. Missing route returned 500 because Spring Boot 3 dispatched to `ResourceHttpRequestHandler` which threw `NoResourceFoundException`. |
| Step 2: Facts our report will quote | DONE | 1. 128-d reduction: `face-service-fastapi/main.py:311-342` projects 512-d FaceNet features to 128-d via fixed deterministic orthonormal matrix (seed=42 QR) followed by L2 normalization.<br>2. Matching around line 576: `matched = d1 < distance_threshold`. Margin is computed but does not gate match. Live recognition uses greedy nearest-neighbor by minimum distance (`main.py:541-558`), NOT Hungarian.<br>3. Haar on Obama-Biden group photo: 4096x2731 resized to 1600x1067. ScaleFactor=1.2, minNeighbors=5, minSize=(30, 30), no tiled detection. Service `/detect-faces` detects 7 faces with production params (10 with 1.1 / minNeighbors 3). Previous audit saw 0 because `test_threshold_check.py` called `/recognize` without `enrolled_students` form data, getting HTTP 422.<br>4. Root scripts creating/touching TEST001/DB: `test_spring_enroll.py` (`POST /students/TEST001/enroll`), `test_multishot_e2e.py` (`POST /students/1/enroll-frame`, `POST /capture/multi-shot/start`), `test_attendance_session.py` (`POST /capture`). |
| Step 3: Real-face plumbing through the API | DONE | PASS - All steps succeeded:<br>- Created section `RTC_SEC_A` (ID 2), assignment ID 2 (108ms).<br>- Enrolled 3 LFW identities: `RTC_STU_01` (Tom Coverdale), `RTC_STU_02` (Abid Hamid), `RTC_STU_03` (Reggie Miller) via `POST /students/enroll-single` with consent=true.<br>- Confirmed `GET /students?classSectionId=2` returns 3 students.<br>- Session 1 (3 faces side-by-side): `POST /capture` created session 58 with `REVIEW_REQUIRED` (312ms). Finalized via `POST /api/attendance-sessions/58/review` (status=FINALIZED, finalized_by=2).<br>- Session 2 (2 of 3 faces, removed `RTC_STU_03`): `POST /capture` created session 59 (234ms). Removed student recognized as `ABSENT_CANDIDATE`. Finalized to `ABSENT` (status=FINALIZED, finalized_by=2).<br>- Condition for FAILED: `resolveEnrolledStudents` returning 0 active students (`AttendanceRecognitionService.java:134`). |
| Step 4a: Threshold calibration | TODO | Evaluate genuine/impostor pairs on LFW embeddings. |
| Step 4b: Class simulation | TODO | 30 class + 30 outsiders evaluation. |
| Step 4c: Group photo composite | TODO | Composite grids with jitter, evaluate detection & recognition. |
| Step 4d: Detector vs face size | TODO | Single faces at widths 40, 60, 80, 120, 160. |
| Step 4e: Latency | TODO | Latency vs face count (1, 5, 10, 20, 30). |
| Step 5: Browser (Playwright) | TODO | Playwright + Chromium with fake webcam. |
| Step 6: Tests | TODO | Maven tests + face-service pytest + 4 root E2E scripts. |
| Step 7: Cleanup | TODO | Remove RTC_ prefixed data. |

## Next Command

Execute Step 4a: `python runtime-check/step4a_threshold_calibration.py`
