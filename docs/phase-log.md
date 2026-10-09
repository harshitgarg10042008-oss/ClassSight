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
- **Benchmark Latency**:
  - 8 faces: 480 ms (5.0x speedup)
  - 15 faces: 790 ms (5.9x speedup)
  - 30 faces: 1,420 ms (7.0x speedup, meeting the < 10.0s hard target)
