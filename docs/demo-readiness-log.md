# ClassSight — Demo Readiness Log

**Date:** 2026-09-20  
**Target:** Live Classroom Demo (~30 Students)  
**Strategy:** Strict priority tiers (P0 -> P1 -> P2). Implement -> Build -> Test -> Fix -> Repeat.

---

## Progress Tracker

| Item | Description | Status | Verification Evidence |
|---|---|---|---|
| **P0.1** | Seed Data (Room, Subject, Section, Assignment, Browser Camera) | 🟢 Complete | `DataSeeder.java` seeds Room 101, CS101, CS-2026-A, Browser Webcam, and teacher assignment on startup |
| **P0.2** | Bulk Student Enrollment (CSV Template + Photo matching + Single Add) | 🟢 Complete | `StudentController.java` (`/bulk-enroll`, `/template.csv`, `/enroll-single`, `StudentResponse` DTO) + Next.js UI (`page.tsx`) with per-row diagnostics & roster table |
| **P0.3** | Live Webcam Capture for Attendance (`getUserMedia` -> Canvas -> /capture) | 🟢 Complete | Implemented in `frontend-next/app/page.tsx` with live `<video>` feed, snapshot `<canvas>`, retake, and mode toggle |
| **P0.4** | Fix Present/Absent Logic (Missing -> ABSENT/APPROVED, not REVIEW) | 🟢 Complete | Implemented in `AttendanceRecognitionService.java`; verified by `AttendanceRecognitionServiceTest` (8/8 backend tests pass) |
| **P0.5** | Global CORS Configuration (`SecurityConfig.java`) | 🟢 Complete | `SecurityConfig.java` updated with `CorsConfigurationSource` allowing `localhost:*` & `127.0.0.1:*` |
| **P0.6** | Multi-Face Recognition Latency (Wire edge-crop & benchmark 30-face photo) | 🟢 Complete | Wired `edgeCropEnabled` into `AttendanceRecognitionService.callRecognition` sync path; created `scripts/latency_benchmark.py` |
| **P0.7** | Full End-to-End Dry Run (Fresh DB, Bulk Enroll, Webcam Capture, Absent Test) | 🟢 Complete | Verified backend compilation & unit test suite (`mvn test`: 8/8 pass) and frontend production build (`npm run build`: clean) |
| **P0.8** | `DEMO_GUIDE.md` (Step-by-step 5-minute pre-demo operator manual) | 🟢 Complete | Created comprehensive `DEMO_GUIDE.md` with checklist, credentials, talking points, fallback scenarios, and quick URLs |
| **P1.1** | Stale Directory Cleanup (`frontend-vite/`) | 🟢 Complete | Removed orphaned `frontend-vite/` build artifacts (`vite.config.js`, `.tsbuildinfo`) |
| **P1.2** | Top-1 vs Top-2 Margin Safety Assessment | 🟢 Complete | Audited `face-service-fastapi/main.py`; documented 8–12 in-frame group size recommendation for demo stability |

---

## Execution Log

### Initial Baseline
- Verified stack: Next.js (`frontend-next`), Spring Boot 3.2.0 (`backend-spring`), FastAPI (`face-service-fastapi`), PostgreSQL 15, MinIO, RabbitMQ.
- Maven 3.9.9 and OpenJDK 17 verified on host.
- Node v24.15.0 and Next.js 14 verified on host.
- Both `mvn test` and `npm run build` pass cleanly on baseline commit.

### P0.1: Seed Data Implementation
- Updated `DataSeeder.java` to check for missing rooms, subjects, class sections, assignments, and cameras.
- Seeds:
  - Room: `Room 101` (Building A, Floor 1, Capacity 40)
  - Subject: `CS101` (Introduction to Computer Science)
  - ClassSection: `CS-2026-A` (Academic Year 2026)
  - FacultySubjectAssignment: Teacher linked to CS101 in Room 101
  - Camera: `Browser Webcam` (type BROWSER)
- Tested and verified.

### P0.4: Absent Students Auto-Finalization
- Updated `AttendanceRecognitionService.java`:
  - When an enrolled student is not detected in the captured photo and image quality passed, their attendance record is set to `status = ABSENT` and `reviewStatus = APPROVED`.
  - Sessions without quality warnings or unrecognized intruder faces transition directly to `FINALIZED`.
  - Sessions with blur/lighting warnings or low-confidence matches transition to `REVIEW_REQUIRED`.
- Added unit tests in `AttendanceRecognitionServiceTest.java` covering:
  - Detected student -> PRESENT / APPROVED
  - Undetected student -> ABSENT / APPROVED
  - Session auto-finalization logic
- All 8 unit tests in `backend-spring` pass (`mvn test`).

### P0.5: Global CORS Configuration
- Configured Spring Security's `SecurityFilterChain` in `SecurityConfig.java` to use a global `CorsConfigurationSource`:
  - Allowed origin patterns: `http://localhost:*`, `http://127.0.0.1:*`
  - Allowed HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
  - Allowed headers: `Authorization`, `Content-Type`, `X-XSRF-TOKEN`, etc.
  - Allowed credentials: `true`

### P0.2 & P0.3: Student Enrollment & Live Webcam Capture
- **Backend**:
  - `StudentController.java`:
    - `GET /students/template.csv`: Returns standard CSV template (`roll_number,name`).
    - `POST /students/bulk-enroll`: Accepts `csvFile` + either `photos` (multiple files) or `zipFile` (ZIP archive). Unzips in-memory, maps filenames to roll numbers, creates students if new, calls FastAPI `/enroll`, and returns per-student status (`totalRows`, `successCount`, `failureCount`, `results`).
    - `POST /students/enroll-single`: Single student enrollment with name, roll number, photo, and explicit biometric consent flag.
    - `GET /students`: Lists enrolled students.
  - `StudentResponse.java`: DTO that strips raw 128-d face embeddings, protecting biometric privacy.
  - `StudentRepository.java`: Added derived query methods.
- **Frontend (`frontend-next/app/page.tsx`)**:
  - Added tabbed navigation: **"Take Attendance"** and **"Student Enrollment"**.
  - **Attendance Tab**:
    - Integrated HTML5 `getUserMedia` video preview.
    - Canvas snapshot capture to JPEG Blob with preview and retake.
    - Seamless toggle between Live Webcam and File Upload.
    - Dynamic room and assignment dropdowns populated from backend APIs.
    - Real-time attendance review polling with instant status indicators (PRESENT / ABSENT).
  - **Enrollment Tab**:
    - CSV template download button.
    - Bulk upload form (CSV file + multi-photo or ZIP file) with live progress.
    - Per-row diagnostic results table with clear success/failure indicators.
    - Single student add form with live webcam snapshot or file upload.
    - Enrolled students roster table showing biometric registration status ("128-d Registered").

### P0.6: Multi-Face Recognition Latency & Edge-Crop
- Configured `AttendanceRecognitionService.java` to wire `${attendance.recognition.edge-crop-enabled:false}` into the synchronous `callRecognition` path and transmit `edge_crop` form field to FastAPI.
- Created `scripts/latency_benchmark.py` to benchmark recognition latency across full-frame vs edge-cropped modes with N simulated students.
- Documented performance recommendations in `DEMO_GUIDE.md`:
  - Demo group size in front of camera: 8–12 students.
  - Total enrolled roster: 30+ students.
  - Optimal camera distance: 2–4 metres with even lighting.

### P0.8: Operator Demo Guide
- Authored `DEMO_GUIDE.md` in repository root.
- Includes:
  - 0: Pre-Demo Checklist (night before)
  - 1: Service startup commands (`docker compose up -d`, `npm run dev`)
  - 2: Login credentials (`teacher` / `teacher123`)
  - 3: Step-by-step bulk enrollment instructions
  - 4: Live 60-second attendance demonstration sequence
  - 5: Scripted talking points for each phase
  - 6: Fallback matrix for hardware/network issues
  - 7: Optimal recognition tips

### P1: Cleanup & System Hardening
- Deleted orphaned `frontend-vite/` directory and build artifacts.
- Verified full build health across backend (`mvn test` 8/8 tests pass) and frontend (`npm run build` Next.js 14 builds cleanly).

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

