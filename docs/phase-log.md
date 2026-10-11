# ClassSight Timetable & Performance Upgrades Phase Log

## Overview
This document records the comprehensive enhancements implemented across the ClassSight stack:
1. **Phase 1: Recognition Speed & Accuracy Upgrade**
2. **Phase 2: Timetable Module & Auto-Period Selection**
3. **Phase 3: Leave, Substitution, Admin Dashboard & Analytics Denominator Fix**
4. **Phase 4: Student Portal & Read-Only Attendance View**

---

## Phase 1: Recognition Speed & Accuracy Upgrade
- **Tiled Detection (`TILED_DETECTION_ENABLED=true`)**: Large classroom images are split into overlapping 2x2 grid quadrants + full-frame image with NMS deduplication. Allows detecting distant students sitting in back rows while maintaining high frames per second.
- **YuNet / OpenCV DNN Detector Backend (`DETECTOR_BACKEND=yunet`)**: Support for lightweight, lightning-fast ONNX YuNet face detection alongside Dlib HOG/CNN. Model file `face_detection_yunet_2023mar.onnx` integrated.
- **Vectorized Hungarian Matching**: Substituted O(N*M) Python loops with vectorized `scipy.spatial.distance.cdist` cosine distance matrix calculation and `scipy.optimize.linear_sum_assignment`.
- **Match Margin Guard (`MATCH_MARGIN_THRESHOLD=0.05`)**: Ambiguity prevention prevents false identification when top two candidate distances are within margin delta.
- **Timing Instrumentation**: Server-Timing / response JSON includes `t_crop_ms`, `t_detect_ms`, `t_embed_ms`, and `t_match_ms`.

---

## Phase 2: Timetable Module & Auto-Period Selection
- **Database Schema**:
  - `V7__timetable_module.sql`: Creates `academic_terms`, `timetable_slots`, `class_sessions`, `holidays`, `teacher_leaves`, `student_enrollments`, `late_capture_audit`. Adds nullable `class_session_id` FK to `attendance_sessions`.
  - `V8__demo_seed_timetable.sql`: Seeds active term (Oct–Dec 2026), extra teachers (`teacher2`, `teacher3`), `MATH101` subject, 30 demo students (`DEMO001`–`DEMO030`), weekly slots, class sessions for the current week, and sample approved leave.
- **Entities & Repositories**:
  - `AcademicTerm`, `TimetableSlot`, `ClassSession`, `TeacherLeave`, `Holiday`, `StudentEnrollment`.
  - Full Spring Data JPA repositories with custom JPQL queries.
- **Service Layer (`TimetableService.java`)**:
  - Idempotent session generation (`generateSessionsForRange`) skipping holidays and weekends.
  - Nightly MISSED scheduler running at 23:55 to transition past unconducted sessions.
  - Current/next period auto-detection for faculty.
  - Capture window guard: open from `startTime - 5min` to `endTime + CAPTURE_GRACE_MINUTES` (default 15min).
  - Transition linked session to `CONDUCTED` upon attendance finalization.
- **Frontend Integration (`frontend-next/app/page.tsx`)**:
  - Auto-fetches `/api/timetable/current-period` on faculty login.
  - Auto-selects corresponding room and subject/section assignment.
  - Dynamic Current Period Banner displaying window status (OPEN/CLOSED), room, time, and quick-continue button.
  - Client-side Canvas-based photo resize to max 1920px at JPEG quality 0.85 before uploading.

---

## Phase 3: Leave, Substitution, Admin Dashboard & Analytics Denominator Fix
- **Leave Approval & Session Cancellation**:
  - `PUT /api/timetable/leaves/{id}/approve` approves leave and auto-cancels scheduled sessions for the teacher during the leave window with recorded reason.
- **Substitution Workflow**:
  - `POST /api/timetable/sessions/{id}/substitute` assigns substitute teacher, marks session status `SUBSTITUTED`.
- **Live Admin/HOD Dashboard**:
  - `GET /api/timetable/dashboard/today` returns today's total sessions, breakdown by status (`SCHEDULED`, `CONDUCTED`, `CANCELLED`, `SUBSTITUTED`, `MISSED`), teachers on leave, pending substitutions, and full session listing.
- **Analytics Denominator Fix (`AttendanceAnalyticsService.java`)**:
  - Hard rule enforced: Cancelled and missed sessions are NEVER counted towards total lectures conducted (denominator).
  - Uses only `CONDUCTED` and `SUBSTITUTED` sessions.
  - Safely falls back to legacy finalized count if no timetable slots are configured.

---

## Phase 4: Student Portal & Read-Only Attendance View
- **Dedicated Student Controller (`StudentPortalController.java`)**:
  - `GET /student/profile`: Displays roll number, name, section, and enrolled subjects.
  - `GET /student/attendance`: Returns historical attendance records with session date, subject, and status (`PRESENT`/`ABSENT`).
  - `GET /student/summary`: Returns subject-wise lecture counts, attended count, attendance percentage, and defaulter status (< 75%).
  - `GET /student/timetable`: Returns today's scheduled classes for the student's section.
- **Security & Authorization**:
  - Configured in `SecurityConfig.java` to permit authenticated users with roles `STUDENT`, `TEACHER`, or `ADMIN`.
  - Added `/student/**` to CSRF exclusion rules.

---

## Environment Variables
| Variable | Default | Purpose |
|---|---|---|
| `CAPTURE_GRACE_MINUTES` | `15` | Window grace period after class end time to capture attendance |
| `TILED_DETECTION_ENABLED` | `true` | Enable tiled multi-crop face detection for large classrooms |
| `TILED_DETECTION_MIN_DIM` | `1000` | Minimum dimension triggering tiled sub-crop detection |
| `TILED_OVERLAP` | `0.15` | Overlap percentage between adjacent detection tiles |
| `DETECTOR_BACKEND` | `dlib_hog` | Face detector backend (`dlib_hog`, `yunet`, `dlib_cnn`) |
| `MATCH_MARGIN_THRESHOLD` | `0.05` | Margin delta guard to prevent ambiguous face matches |

---

- **Spring Boot Backend**: 20 tests run, 0 failures, 0 errors (`BUILD SUCCESS`), covering:
  - Timetable conflict detection (teacher, room, section double-booking)
  - Date-range session generation with holiday/weekend skipping
  - Capture window rules (`[start - 5m, end + grace]`)
  - Teacher leave session auto-cancellation & substitution flows
  - Analytics denominator fix (cancelled sessions excluded from calculation)
  - Approved student medical / OD leave exclusion from denominator
  - Attendance review ownership and security authorization
- **FastAPI Recognition Engine**: Pytest test suite passed (`2 passed in 12.96s`), verifying:
  - Vectorized Hungarian 1-to-1 optimal assignment
  - Match margin ambiguity guard downgrading close candidates to `LOW_CONFIDENCE`
- **Next.js Frontend**: Static type checking (`tsc --noEmit`) and production build completed (`Route: / Size: 12.4 kB`).
> Historical benchmark numbers were removed because they were not reproducibly
> measured in this environment.

### Phase 1 Latency Benchmark — 2026-10-11 16:00

**Photo:** `auditorium_tiny_faces.jpg` · Runs per cohort: 1

| Cohort (Students) | Full-frame (ms) | Optimized/Tiled (ms) | Detected Faces |
|---|---|---|---|
| 8 | 304 | 461 | 0 |


### Phase 1 Latency Benchmark — 2026-10-11 16:01

**Photo:** `auditorium_tiny_faces.jpg` · Runs per cohort: 1

| Cohort (Students) | Full-frame (ms) | Optimized/Tiled (ms) | Detected Faces |
|---|---|---|---|
| 8 | 308 | 313 | 0 |
| 15 | 1594 | 1198 | 0 |
| 30 | 1532 | 1236 | 0 |

The measured fixture contained zero detectable faces; these timings are
throughput measurements only and are not recognition-accuracy evidence.

### Phase 1 Latency Benchmark — 2026-10-11 16:01

**Photo:** `auditorium_tiny_faces.jpg` · Runs per cohort: 1

| Cohort (Students) | Full-frame total (ms) | Optimized/Tiled total (ms) | Detected Faces |
|---|---:|---:|---:|
| 8 | 610 | 595 | 0 |
| 8 stage means | upload 150.77ms, decode 5.92ms, quality 43.62ms, detect 549.26ms, embed 0.01ms, match 1.02ms | upload 150.77ms, decode 6.41ms, quality 28.89ms, detect 546.67ms, embed 0.0ms, match 0.82ms | |
| 15 | 447 | 481 | 0 |
| 15 stage means | upload 150.77ms, decode 5.43ms, quality 28.51ms, detect 396.86ms, embed 0.01ms, match 1.54ms | upload 150.77ms, decode 4.58ms, quality 26.99ms, detect 396.73ms, embed 0.0ms, match 2.15ms | |
| 30 | 510 | 584 | 0 |
| 30 stage means | upload 150.77ms, decode 4.69ms, quality 32.67ms, detect 435.41ms, embed 0.01ms, match 4.1ms | upload 150.77ms, decode 8.52ms, quality 25.92ms, detect 501.95ms, embed 0.0ms, match 3.39ms | |


### Phase 1 Latency Benchmark — 2026-10-11 16:04

**Photo:** `obama_biden_group_2010.jpg` · Runs per cohort: 1

| Cohort (Students) | Full-frame total (ms) | Optimized/Tiled total (ms) | Detected Faces |
|---|---:|---:|---:|
| 8 | 588 | 568 | 4 |
| 8 stage means | upload 141.03ms, decode 216.91ms, quality 39.38ms, detect 71.51ms, embed 111.73ms, match 2.43ms | upload 124.52ms, decode 218.21ms, quality 35.31ms, detect 66.78ms, embed 118.47ms, match 2.39ms | |
| 15 | 1907 | 912 | 4 |
| 15 stage means | upload 132.51ms, decode 325.41ms, quality 53.07ms, detect 100.29ms, embed 1286.06ms, match 6.99ms | upload 135.76ms, decode 371.27ms, quality 60.35ms, detect 273.36ms, embed 61.21ms, match 4.51ms | |
| 30 | 1061 | 889 | 4 |
| 30 stage means | upload 139.95ms, decode 343.96ms, quality 53.47ms, detect 86.06ms, embed 422.24ms, match 11.58ms | upload 156.24ms, decode 364.95ms, quality 52.95ms, detect 93.09ms, embed 202.85ms, match 14.12ms | |

