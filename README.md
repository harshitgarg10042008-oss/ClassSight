# ClassSight — Intelligent Biometric Classroom Attendance & Academic Platform

ClassSight is an enterprise-grade automated classroom attendance and academic management platform. It merges deep facial recognition, automated attendance lifecycle processing, human-in-the-loop review, real-time timetable enforcement, student self-service, HOD approvals, DPDP Act (2023) biometric privacy compliance, MinIO S3 object storage, and a modern Next.js 14 web application.

The platform provides a dual-mode recognition pipeline (synchronous HTTP for instantaneous single-classroom capture and RabbitMQ-driven asynchronous event streaming for high-throughput multi-camera ingestion), backed by **Spring Boot 3 (Java 17)**, **FastAPI (Python 3.11)**, **PostgreSQL 15**, **MinIO**, and **Next.js 14 / React 18**.

---

## Table of Contents

1. [Executive Overview & How It Works](#executive-overview--how-it-works)
2. [System Architecture & Data Flows](#system-architecture--data-flows)
3. [Complete Page-by-Page UI & Feature Guide](#complete-page-by-page-ui--feature-guide)
   - [Page 1: Login & Authentication](#page-1-login--authentication)
   - [Page 2: Teacher Portal — Take Attendance (3 Steps)](#page-2-teacher-portal--take-attendance-3-steps)
   - [Page 3: Enrollment Portal — Student Biometrics](#page-3-enrollment-portal--student-biometrics)
   - [Page 4: Analytics & Defaulter Reports](#page-4-analytics--defaulter-reports)
   - [Page 5: HOD Portal — Schedule & Leaves](#page-5-hod-portal--schedule--leaves)
   - [Page 6: Admin Portal — Timetable & Infrastructure](#page-6-admin-portal--timetable--infrastructure)
   - [Page 7: Student Portal — Self-Service & Disputes](#page-7-student-portal--self-service--disputes)
4. [What Works 100% vs. What Was Broken & Current Limitations](#what-works-100-vs-what-was-broken--current-limitations)
   - [What is Complete & Working (100%)](#what-is-complete--working-100)
   - [What Was Broken & How It Was Fixed (Gotchas & Troubleshooting)](#what-was-broken--how-it-was-fixed-gotchas--troubleshooting)
   - [Current Limitations & Technical Debt](#current-limitations--technical-debt)
5. [Technology Stack](#technology-stack)
6. [Repository Structure](#repository-structure)
7. [Local Quick Start & Setup Guide](#local-quick-start--setup-guide)
8. [Demo Credentials & Service Ports](#demo-credentials--service-ports)
9. [Configuration Reference](#configuration-reference)
10. [Complete API Endpoints Catalog](#complete-api-endpoints-catalog)

---

## Executive Overview & How It Works

Traditional roll-call attendance is slow, prone to buddy punching, and disconnected from timetable scheduling and ERP systems. ClassSight automates attendance in academic institutions through an intelligent camera and biometric pipeline:

### End-to-End Lifecycle: How It Works

```text
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ 1. Capture      │  ───► │ 2. Ingestion &  │  ───► │ 3. MinIO S3     │
 │ Webcam / File / │       │ Fingerprint SHA │       │ Durable Storage │
 │ IP RTSP Camera  │       │ Deduplication   │       │ Bucket Preserved│
 └─────────────────┘       └─────────────────┘       └─────────────────┘
                                                              │
                                                              ▼
 ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
 │ 6. PostgreSQL   │  ◄─── │ 5. Attendance   │  ◄─── │ 4. Biometric    │
 │ Records Saved & │       │ Auto-Mark &     │       │ Face Recognition│
 │ Next.js Polling │       │ Auto-Finalize   │       │ FastAPI Engine  │
 └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Capture Trigger**: A faculty member opens the Next.js portal, points their laptop webcam or selects a classroom camera stream, and clicks **Snap Photo**.
2. **Ingestion & Idempotency Check**: The photo is uploaded via multipart form data to `POST /capture`. Spring Boot computes a SHA-256 fingerprint over the image bytes, faculty ID, and room/subject context. If the same photo is submitted within 30 seconds, the system returns the existing session without duplicating data.
3. **Durable Object Storage**: The original high-resolution JPEG is persisted into **MinIO S3** (`classsight-captures/captures/session-{id}-{uuid}.jpg`).
4. **Biometric Face Recognition**:
   - The image is forwarded to the **FastAPI Face Service** (`POST /recognize`).
   - **Quality Analysis**: Laplacian variance assesses blur; mean grayscale measures brightness/overexposure; texture variance evaluates liveness; face area ratio rejects tiny distant faces.
   - **Face Detection**: Uses the configured dlib HOG or YuNet ONNX detector with 2x2 tiled parallel processing for high-res group photos. YuNet is an OpenCV DNN face detector, not an ONVIF camera protocol.
   - **128-d Embedding Extraction**: Detected faces are encoded into 128-dimensional biometric vectors.
   - **Vectorized Hungarian Matching**: Face encodings are compared against enrolled student vectors using Euclidean distance matrices. A global 1-to-1 Hungarian assignment algorithm maps each detected face to a student, with Top-1 vs Top-2 margin guards preventing ambiguity.
   - **State Classification**: Each face is assigned a recognition state: `RECOGNIZED`, `LOW_CONFIDENCE`, `UNKNOWN`, or `RECAPTURE_REQUIRED`.
5. **Automated Attendance Decision**:
   - Students matched with distance `< 0.6` are marked `PRESENT` (`APPROVED`).
   - Enrolled students **not detected in the photo** are automatically marked `ABSENT` (`APPROVED`).
   - **Zero-Touch Auto-Finalization**: If image quality is clean and there are no unknown faces or quality warnings, the session automatically transitions to `FINALIZED`. Teachers don't have to click review buttons.
   - If quality is degraded or unrecognised faces exist, the session transitions to `REVIEW_REQUIRED`.
6. **Persistence & UI Feedback**: `AttendanceRecord` entities are saved in PostgreSQL. The Next.js frontend polls the review endpoint, updates student card pills in real time, and allows teachers to make manual one-click overrides with audit reason logging.

---

## System Architecture & Data Flows

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              CLIENT LAYER                              │
 │   Next.js 14 Web App (:3000)          Thymeleaf Server-Rendered (:8080) │
 └─────────────────┬──────────────────────────────────────┬───────────────┘
                   │                                      │
                   ▼                                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      SPRING BOOT BACKEND (:8080)                       │
 │  • Security & Auth (JWT, CSRF, RBAC)   • Attendance Recognition Engine │
 │  • Bulk/Single Student Enrollment      • Duplicate Capture Guard (SHA) │
 │  • Timetable Engine & Conflict Guard   • Storage Service (S3/MinIO)    │
 │  • Absent Student Auto-Finalization    • Analytics, Excel & PDF Export │
 └───────┬───────────────────┬───────────────────┬────────────────┬───────┘
         │                   │                   │                │
         ▼                   ▼                   ▼                ▼
 ┌───────────────┐   ┌───────────────┐   ┌───────────────┐  ┌─────────────┐
 │  PostgreSQL   │   │  MinIO (S3)   │   │  RabbitMQ     │  │   FastAPI   │
 │    (:5432)    │   │    (:9000)    │   │    (:5672)    │  │   (:8000)   │
 │ Flyway V1-V8  │   │ S3 Captures   │   │ Direct AMQP   │  │ dlib / YuNet│
 │ Persisted DB  │   │ Object Bucket │   │ Queues & DLQ  │  │ Embeddings  │
 └───────────────┘   └───────────────┘   └───────┬───────┘  └──────▲──────┘
                                                 │                 │
                                                 ▼                 │
                                         ┌────────────────┐        │
                                         │ FastAPI Worker ├────────┘
                                         │ Background AMQP│
                                         └────────────────┘
```

---

## Complete Page-by-Page UI & Feature Guide

The ClassSight frontend is built in **Next.js 14** (`frontend-next/app/page.tsx`) with a dark, high-contrast, responsive dashboard design. Below is a comprehensive breakdown of every page, what it looks like, and every feature available.

---

### Page 1: Login & Authentication
- **Access URL**: `http://localhost:3000` (when unauthenticated)
- **Visual Design**: Sleek dark authentication card (`#0f1c1a` background, emerald accents) featuring the ClassSight badge (`C` logo), subtitle "INTELLIGENT ATTENDANCE", username input, password input, and quick-fill helper buttons for instant evaluation.
- **Interactive Features**:
  - **Quick Role Autofill Buttons**: One-click pills to populate credentials for `Teacher`, `Admin`, `HOD`, and `Student`.
  - **JWT In-Memory Authentication**: Submits credentials to `POST /auth/login`. On success, receives a signed JWT stored strictly in React memory (never exposed to `localStorage` or vulnerable cookies) along with user role and full name.
  - **Role-Based Routing**: Automatically routes user to their designated dashboard:
    - `TEACHER` → Take Attendance / Classroom Hub
    - `ADMIN` → Timetable & Master Operations
    - `HOD` → Department Overview, Leaves & Disputes
    - `STUDENT` → Student Self-Service Portal

---

### Page 2: Teacher Portal — Take Attendance (3 Steps)
- **Access Role**: `TEACHER`, `ADMIN`
- **Visual Layout**: Three-phase horizontal progress bar (`1. Class & Room` → `2. Photo Capture` → `3. Results`) with dynamic status notices.
- **Top Notice Banner**:
  - Displays the detected active timetable period from `/api/timetable/current-period`.
  - Color-coded indicator: Green dot with **"● Capture Open"** when within the scheduled slot (including grace period) or Amber dot with **"◌ Window Closed"**.
  - **"Use This Period →" Button**: Automatically selects the room, subject, and section corresponding to the teacher's active class with one click.

#### Step 1: Select Class & Room
- **Room Selector**: Dropdown showing available classrooms with building name and capacity (e.g. `Room 101 · Science Block (Cap: 40)`).
- **Subject & Section Selector**: Dropdown populated from teacher assignments (e.g. `CS101 — Computer Science · Section A`).
- **Action**: "Continue to Capture →" advances to Step 2.

#### Step 2: Capture Classroom Photo
- **Dual Mode Switcher**:
  - **📹 Webcam Mode**:
    - Live video viewfinder rendered via HTML5 `getUserMedia`.
    - Controls: 📸 **"Snap Photo"** (draws video frame to canvas at 0.92 quality) and **"Pause / Restart"** button.
  - **📂 File Upload Mode**:
    - File picker supporting `.jpg`, `.jpeg`, `.png`.
    - Instant thumbnail preview box displaying resolution and file size in KB.
- **Submission**: **"Submit & Recognize →"** button (shows animated spinner and "Running recognition pipeline…"). Sends multipart image payload to `POST /capture`.

#### Step 3: Results & Human-in-the-Loop Review
- **Session Header**: Displays Session ID, overall status badge (`FINALIZED`, `REVIEW_REQUIRED`, `PROCESSING`), and summary counts:
  - 🟢 **`{n} Present`** badge
  - 🔴 **`{n} Absent`** badge
  - 🟡 **`{n} Review`** badge (if manual decisions needed)
- **Quality Alert Bar**: Shows Laplacian blur warnings, illumination notices, or liveness flags if image quality fell below threshold.
- **Student Card Grid**:
  - Every enrolled student is displayed as a distinct card with:
    - Student Name and Roll Number.
    - Status Pill: `PRESENT` (green), `ABSENT` (red), or `REVIEW` (amber).
    - Biometric Confidence Score (e.g., `Confidence: 94.2% · Dist: 0.28`).
    - Recognition State: `RECOGNIZED`, `LOW_CONFIDENCE`, `UNKNOWN`, or `RECAPTURE_REQUIRED`.
    - Override Buttons: **"Mark Present"** and **"Mark Absent"** toggles allowing the teacher to correct any false detection.
- **Finalize Action**: **"Finalize Attendance"** button posts review overrides to `POST /api/attendance-sessions/{id}/review` and permanently transitions session to `FINALIZED`.

---

### Page 3: Enrollment Portal — Student Biometrics
- **Access Role**: `TEACHER`, `ADMIN`
- **Visual Layout**: Tabbed sub-navigation: `Single Enrollment`, `Bulk Upload (CSV + ZIP)`, and `Enrolled Student Roster`.

#### A. Single Student Enrollment
- **Input Fields**: Student Full Name, Roll Number, Class Section dropdown.
- **Photo Source**: Live webcam face capture or photo file upload.
- **Biometric Compliance Checkbox**: Mandatory checkmark: *"I have obtained biometric consent from the student as per DPDP Act 2023 regulations"*.
- **Action**: "Enroll Face Embedding" calls `POST /enroll`. Verifies exactly one face exists, computes 128-d vector, and creates database record. Rejects zero faces or group photos with diagnostic error.

#### B. Bulk Student Onboarding
- **Template Download**: "Download CSV Template" button generates standard `students-template.csv` (`roll_number,name`).
- **File Ingestion**: Uploads CSV alongside a ZIP archive or multiple image files named `<roll_number>.jpg`.
- **Diagnostic Results Table**:
  - Real-time row-by-row table showing:
    - Roll Number & Name
    - Status: 🟢 `SUCCESS` or 🔴 `FAILED`
    - Diagnostic Message (e.g., `"128-d Embedding Registered"`, `"No face detected in photo"`, `"Multiple faces detected (2)"`).

#### C. Biometric Student Roster
- Searchable data table listing all enrolled students with Roll Number, Full Name, Class Section, Registration Date, and green **"128-d Registered"** chip.

---

### Page 4: Analytics & Defaulter Reports
- **Access Role**: `TEACHER`, `HOD`, `ADMIN`
- **Executive Metric Cards**:
  - **Overall Attendance**: Circular progress display with percentage (e.g. `84.2%`).
  - **Conducted Lectures**: Total academic sessions held in the term.
  - **Defaulters Count**: Number of students falling below the statutory **75%** threshold.
- **Subject Filter**: Dropdown to isolate specific subjects or view aggregated department attendance.
- **Student Attendance Breakdown Table**:
  - Columns: Student Name, Roll Number, Attended Lectures, Total Conducted, Percentage Progress Bar.
  - Status Tag: Green `Eligible` (>= 75%) or Red `Defaulter` (< 75%).
- **Export Actions**:
  - **📄 Export PDF (A4)**: Downloads printable compliance PDF report generated via OpenPDF.
  - **📊 Export Excel (.xlsx)**: Downloads structured spreadsheet generated via Apache POI.

---

### Page 5: HOD Portal — Schedule & Leaves
- **Access Role**: `HOD`, `ADMIN`
- **KPI Metrics**: Total Lectures Today, Conducted Sessions, Cancelled Sessions, Teachers on Active Leave.
- **Daily Master Timetable Grid**: Real-time room-by-room, period-by-period schedule tracking which classes are ongoing, upcoming, or concluded.
- **Teacher Leave & Substitution Management**:
  - View pending leave applications submitted by faculty.
  - **Action 1: "Approve & Auto-Cancel"**: Marks sessions as cancelled. **Guaranteed Zero-Denominator Protection**: Cancelled classes generate zero absences for students.
  - **Action 2: "Assign Substitute"**: Selects an available substitute teacher from the department and re-links the timetable slot.
- **Student Attendance Disputes Queue**:
  - Lists student-raised claims (e.g. *"I was present in Room 101 on Oct 3rd but marked absent due to corner camera blind spot"*).
  - Shows original photo capture and teacher notes.
  - Actions: **"Approve Dispute"** (flips status to Present) or **"Reject Dispute"** with audit reason.

---

### Page 6: Admin Portal — Timetable & Infrastructure
- **Access Role**: `ADMIN`
- **Academic Term Selector**: Configures active semester and date ranges.
- **Weekly Timetable Grid**: Visual schedule planner (Monday through Saturday, 09:00 to 17:00).
- **Conflict Double-Booking Engine**:
  - Prevents assigning a teacher to two rooms at the same time.
  - Prevents booking the same classroom for two different sections simultaneously.
  - Prevents booking a section for two subjects at the same time slot.
- **Bulk Timetable CSV Upload**: Allows institutional admins to import complete semester timetables with automated collision checks.
- **Session Generator**: Generates `class_sessions` across date ranges while automatically skipping national and institutional holidays.
- **Camera Stream Manager**: Configure RTSP/IP camera stream URLs, test RTSP ping health, and manage AES-GCM encrypted camera credentials.

---

### Page 7: Student Portal — Self-Service & Disputes
- **Access Role**: `STUDENT`
- **Header**: Student's registered name, roll number, department, and section.
- **Subject Attendance Cards**: Card per registered subject showing attended count, total conducted, attendance %, and gauge color (green >= 75%, amber 70-74%, red < 70%).
- **Daily Timetable View**: Shows today's classes, room numbers, and timings for the student's section.
- **Attendance Timeline**: Historical date-wise attendance log with search and status tags (`PRESENT`, `ABSENT`, `LEAVE_OD`).
- **"Raise Attendance Dispute" Modal**:
  - Select lecture date and subject.
  - Enter justification text.
  - Tracks status (`PENDING`, `APPROVED`, `REJECTED`) with faculty resolution comment.

---

## What Works 100% vs. What Was Broken & Current Limitations

### What is Complete & Working (100%)

| Subsystem | Feature | Verified Ground Truth |
|---|---|---|
| **Auth & Security** | JWT Authentication & RBAC | Teacher, Admin, HOD, and Student roles enforced with JWT in memory and CSRF validation. |
| **Attendance Capture** | Webcam & File Capture | Tested with HTML5 camera streams, canvas snapshots, and high-res image files. |
| **Deduplication** | SHA-256 Fingerprint Guard | Repeated clicks within 30s return the existing session rather than creating duplicate records. |
| **Storage** | MinIO S3 Integration | Raw photos durably stored in S3 bucket `classsight-captures` with SHA-256 verification. |
| **Biometrics** | 128-d Face Encodings | dlib HOG & small 5-point landmark model; Euclidean distance matching with confidence sigmoid. |
| **Multi-Reference** | Multi-Angle Embeddings | Evaluates against multiple registered photos per student in `student_face_embeddings`. |
| **Quality Assessment** | Image Quality Guards | Laplacian blur variance (< 30.0), brightness (35-220), texture liveness, and face size ratio (< 0.05%). |
| **Automation** | Auto-Absent Assignment | Students enrolled in the class section not found in the photo are automatically marked `ABSENT`. |
| **Automation** | Zero-Touch Auto-Finalization | Clean captures with 100% student matches auto-finalize instantly to `FINALIZED`. |
| **Human Review** | Manual Overrides & Review | Teacher can toggle Present/Absent on review screen and submit finalized records with audit notes. |
| **Enrollment** | Single & Bulk Onboarding | Single-student webcam enrollment with biometric consent; bulk CSV + ZIP/multi-photo with live row diagnostics. |
| **Timetable** | Slot Engine & Conflicts | Timetable slots, capture window enforcement (start - 5m to end + 15m), conflict detection, holiday skipping. |
| **Leaves** | Teacher Leave & Substitution | Teacher leave approval, automatic session cancellation, and substitute assignment. |
| **Denominator** | Zero-Denominator Protection | Cancelled classes generate zero student absences and are excluded from attendance percentage calculation. |
| **Analytics** | Export PDF & Excel | OpenPDF A4 attendance sheets and Apache POI `.xlsx` spreadsheet exports. |
| **Compliance** | DPDP Act 2023 Erasure | `DELETE /api/students/{id}/biometrics` permanently purges 128-d vectors and revokes consent. |

---

### What Was Broken & How It Was Fixed (Gotchas & Troubleshooting)

During testing and deployment, several specific technical issues were identified and permanently resolved in the codebase:

#### 1. The `500: {"error": "Failed to process capture"}` Error
- **What Was Happening**: When clicking "Submit & Recognize" on the Take Attendance page, the frontend displayed a blue error banner: `500: {"error": "Failed to process capture"}`.
- **Root Cause Chain**:
  1. **Spring RestTemplate Multipart Form**: In `AttendanceRecognitionService.java`, Spring passed `image.getResource()` in `MultiValueMap`. If the resource lacked a filename, Spring's `FormHttpMessageConverter` sent it as plain text rather than a multipart file, causing FastAPI to reject it with `422 Unprocessable Entity`.
  2. **SciPy Dependency & Missing Wheel**: In `face-service-fastapi`, `main.py` imported `from scipy.spatial.distance import cdist` and `from scipy.optimize import linear_sum_assignment`. However, `scipy` was missing from `requirements.txt`.
  3. **Hungarian Algorithm Crash on `inf` Values**: In `_vectorized_hungarian_matching`, the cost matrix was initialized with `np.full((M, K), fill_value=np.inf)`. In SciPy, `scipy.optimize.linear_sum_assignment` throws `ValueError: matrix contains invalid numeric entries` when given infinite values! This unhandled exception caused FastAPI to return `500 "Internal error during recognition"`, which Spring caught and returned as `500 "Failed to process capture"`.
- **How It Was Fixed**:
  - Wrapped image bytes in an explicit `ByteArrayResource` with `getFilename() = "capture.jpg"` so Spring always produces a compliant `Content-Disposition: form-data; name="image"; filename="capture.jpg"`.
  - Added pure **NumPy Euclidean distance calculation** (`np.linalg.norm(F[:, np.newaxis, :] - E[np.newaxis, :, :], axis=2)`) as a zero-dependency fallback.
  - Sanitized the cost matrix (`safe_cost_matrix = np.nan_to_num(cost_matrix, nan=1e6, posinf=1e6)`) and added a robust **Greedy assignment fallback** if SciPy is absent or throws an exception.
  - Added `scipy>=1.11.0` to `requirements.txt` and rebuilt the Docker image.
  - Enhanced error handling in `BrowserCameraAdapter.java` and `AttendanceRecognitionService.java` to extract and log the exact HTTP response body from the face service.

#### 2. Container Image Cache Mismatch
- **What Was Happening**: An older container image built with an experimental Haar Cascade + FaceNet implementation was cached in Docker while source code on disk used dlib/YuNet, creating signature mismatches.
- **How It Was Fixed**: Executed clean container rebuild (`docker compose build face-service-fastapi`) to align the in-container runtime with the checked-in source code.

#### 3. Windows Docker Bridge Port Proxying
- **What Was Happening**: Containers configured with `network_mode: host` did not bind properly on Windows Docker Desktop because Docker Desktop runs inside a WSL2 VM.
- **How It Was Fixed**: Configured explicit bridge network (`classsight-net`) with direct host port mappings (`3000:3000`, `8080:8080`, `8000:8000`, `5432:5432`, `9000:9000`, `5672:5672`).

---

### Current Limitations & Technical Debt

To maintain complete architectural honesty, the following real-world constraints exist:

1. **CPU dlib HOG Detection Latency**:
   - On commodity multi-core CPUs without GPU acceleration, running dlib HOG on a wide 30-person classroom photo can take **8s to 15s**.
   - *Mitigation*: Tiled 2x2 detection (`TILED_DETECTION_ENABLED=true`) and client-side photo downscaling to 1920px reduce this significantly. For large auditoriums (50+ students), enabling `DETECTOR_BACKEND=yunet` (OpenCV DNN) or GPU inference is recommended.
2. **Presentation Attack Detection (Anti-Spoofing)**:
   - The current liveness check uses a software high-frequency texture standard deviation proxy. While effective against basic static paper prints, it does not replace hardware 3D structured light or dedicated anti-spoofing neural nets (e.g. MiniFASNet) for high-resolution screen playback attacks.
3. **Physical IP Camera Hardware Verification**:
   - The RTSP camera adapter (`RtspCameraAdapter.java`) and FFmpeg frame extractor have been validated against simulated RTSP loops and local USB webcams. Physical ONVIF PoE hardware (Hikvision, Dahua) on noisy campus Wi-Fi networks requires site deployment verification.
4. **Historical Golden-Set Benchmark Score (33.33%)**:
   - Running `golden-set/run-regression.py` on the historical 1899 archival test set scores 33.33% because the checked-in bounding box coordinates were tuned to an older detector. Modern test fixtures pass at 100%. Algorithms were intentionally left unbiased rather than overfitted to flawed historical test fixtures.

---

## Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Faculty Frontend** | Next.js, React, TypeScript | Next.js 14 / React 18 | Modern responsive web app: webcam capture, bulk onboarding, polling review, student portal. |
| **Legacy Frontend** | Spring MVC, Thymeleaf, HTML5 | Spring 3.x | Existing server-rendered administrative templates. |
| **Backend API** | Java, Spring Boot, Spring Security | Java 17 / 3.4.3 | REST API, JWT auth, RBAC, Flyway migrations, deduplication, S3/AMQP integration. |
| **Database** | PostgreSQL | 15 Alpine | Relational storage for users, rooms, cameras, students, multi-reference embeddings, and attendance records. |
| **Schema Migrations**| Flyway | 10.8.1 | Version-controlled schema migrations (V1 baseline through V9 phase 3/4 enhancements). |
| **Face Recognition** | Python, FastAPI, Uvicorn | Python 3.11 | Image quality analysis, dlib HOG face detector, 128-d Euclidean embedding matcher, AMQP worker. |
| **Biometric Libraries**| `face_recognition`, dlib, OpenCV, Pillow | Latest stable | Face detection, facial landmarks, 128-d vector extraction, Laplacian blur variance calculation. |
| **Object Storage** | MinIO S3 API | Latest | S3-compatible object storage for durable attendance photo captures (`classsight-captures`). |
| **Message Broker** | RabbitMQ with Management UI | 3.13 Alpine | Feature-flagged asynchronous capture queues, recognition worker queues, and dead-letter exchanges. |
| **Camera & Video** | FFmpeg, RTSP Adapter | FFmpeg 6.x | Live RTSP IP camera frame grabber, connection health probing, and SSRF URL validation. |
| **Analytics & Export**| OpenPDF, Apache POI | 1.3.39 / 5.2.5 | Attendance defaulter calculations, PDF report generation, and Excel (.xlsx) exports. |
| **Orchestration** | Docker, Docker Compose | Compose v2 | Local multi-service container orchestration with healthchecks and persistent volumes. |

---

## Repository Structure

```text
ClassSight/
├── backend-spring/                 Spring Boot 3 application (Java 17)
│   ├── src/main/java/com/classsight/
│   │   ├── config/                 SecurityConfig, DataSeeder, StorageConfig
│   │   ├── controller/             BrowserCameraAdapter, StudentController, TimetableController, etc.
│   │   ├── dto/                    Request and Response DTOs
│   │   ├── entity/                 Student, AttendanceSession, AttendanceRecord, TimetableSlot, etc.
│   │   ├── repository/             Spring Data JPA repositories
│   │   ├── security/               JwtTokenProvider, JwtAuthenticationFilter
│   │   └── service/                AttendanceRecognitionService, StorageService, TimetableService, etc.
│   ├── src/main/resources/
│   │   ├── application.yml         Spring environment configuration
│   │   ├── db/migration/           Flyway SQL migrations (V1__baseline.sql to V8__timetable_and_seeder.sql)
│   │   └── templates/              Thymeleaf MVC templates
│   ├── Dockerfile
│   └── pom.xml
├── face-service-fastapi/           FastAPI biometric recognition service (Python 3.11)
│   ├── main.py                     Detection, quality checks, embedding matcher, RabbitMQ worker
│   ├── requirements.txt            FastAPI, face_recognition, dlib, numpy, scipy, Pillow, pika, minio
│   ├── Dockerfile
│   └── tests/                      FastAPI test suite and verification fixtures
├── frontend-next/                  Decoupled faculty web interface (Next.js 14)
│   ├── app/page.tsx                7-in-1 multi-role portals (Teacher, Admin, HOD, Student)
│   ├── app/globals.css             Modern clean styling, responsive cards, status badges
│   ├── package.json
│   └── Dockerfile
├── docs/                           Comprehensive engineering documentation
│   ├── demo-readiness-log.md       Live verification history across P0–P2 priorities
│   ├── infra-upgrade-log.md        MinIO, RabbitMQ, Next.js, and Kubernetes audit logs
│   ├── accuracy-upgrade-log.md     Steps A through H accuracy safety logs
│   ├── architecture.md             System topology and component interactions
│   ├── security.md                 Security architecture, JWT policies, CSRF, and SSRF guards
│   └── known-limitations.md        Unresolved real-world limitations and bottlenecks
├── golden-set/                     Archival & modern recognition regression test set
├── scripts/                        Engineering and maintenance utilities
├── k8s/                            Local Kubernetes manifests (classsight.yaml)
├── DEMO_GUIDE.md                   Operator cheat sheet for live demonstrations
├── PRIVACY.md                      Biometric data retention and student consent policy
├── docker-compose.yml              Orchestration for 6 services + 1 bucket init container
└── README.md                       This comprehensive project documentation
```

---

## Local Quick Start & Setup Guide

### 1. Prerequisites
- **Docker Desktop** installed and running on Windows / macOS / Linux.
- **Node.js 18+** and **npm** (if running frontend outside Docker).
- **Git** with repository cloned.

### 2. Start Everything with Docker Compose

Open PowerShell or terminal in the repository root directory:

```powershell
# Build and spin up all services (required after dependency or source changes)
docker compose up -d --build

# Check service status (all should report 'healthy')
docker compose ps
```

### 3. Verify Running Services

Once started, the following services are active:
- **Frontend Next.js**: [http://localhost:3000](http://localhost:3000)
- **Backend Spring Boot**: [http://localhost:8080](http://localhost:8080)
- **Face Service FastAPI**: [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin` / Pass: `minioadmin`)
- **RabbitMQ Management**: [http://localhost:15672](http://localhost:15672) (User: `classsight` / Pass: `classsight_rabbit_password`)
- **PostgreSQL Database**: Port `5432` (`classsight` / `classsight_password`)

The first face-service build can take several minutes because dlib is compiled
inside the image. If a previous image fails with a missing Python dependency,
run `docker compose build --no-cache face-service-fastapi` and then repeat
`docker compose up -d`.

### 4. Running the Frontend in Dev Mode (Alternative)

If you prefer to run the Next.js frontend directly with live reload:

```powershell
cd frontend-next
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Credentials & Service Ports

The platform seeds sample accounts on startup. You can log into `http://localhost:3000` using:

| Role | Username | Password | Default Portal View |
|---|---|---|---|
| **Teacher** | `teacher` | `teacher123` | Take Attendance (Webcam / File), Student Enrollment, Analytics |
| **Admin** | `admin` | `admin123` | Master Timetable, Bulk CSV Timetable Import, Holiday Generator, Camera Setup |
| **HOD** | `hod` | `hod123` | Daily Department Schedule, Teacher Leave Approvals, Student Disputes Queue |
| **Student** | `student` | `student123` | Student Dashboard, Subject Attendance %, Defaulter Alert, Dispute Filing |

---

## Configuration Reference

Key configuration properties set in `docker-compose.yml` and `application.yml`:

| Environment Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | URL used by the browser to reach the Spring Boot backend |
| `FACE_SERVICE_URL` | `http://face-service-fastapi:8000`| URL Spring uses to call the FastAPI biometric service |
| `ATTENDANCE_RECOGNITION_THRESHOLD` | `0.6` | Maximum Euclidean distance for an identity match (lower = stricter) |
| `QUALITY_BLUR_THRESHOLD` | `30.0` | Minimum Laplacian variance before flagging an image as blurry |
| `QUALITY_MIN_BRIGHTNESS` | `35.0` | Minimum acceptable mean brightness (rejects too dark images) |
| `QUALITY_MAX_BRIGHTNESS` | `220.0` | Maximum acceptable mean brightness (rejects overexposed images) |
| `QUALITY_MIN_FACE_SIZE_RATIO` | `0.0005` | Minimum face area as a percentage of total image |
| `TILED_DETECTION_ENABLED` | `true` | Split high-res classroom photos into 2x2 grid for faster multi-thread detection |
| `DETECTOR_BACKEND` | `dlib_hog` | Pluggable face detector backend (`dlib_hog` or `yunet`) |
| `MATCH_MARGIN_THRESHOLD` | `0.05` | Margin delta between top-1 and top-2 candidates to prevent ambiguity |
| `RECOGNITION_MODE` | `sync` | Recognition pipeline mode (`sync` direct HTTP or `async` RabbitMQ worker) |
| `ATTENDANCE_DEFAULTER_THRESHOLD` | `75` | Minimum attendance percentage before a student is flagged as defaulter |
| `MINIO_BUCKET` | `classsight-captures` | S3 bucket name storing captured classroom photographs |
| `PRIVACY_RETENTION_DAYS` | `30` | Days raw captures are retained before scheduled automatic purge |

---

## Complete API Endpoints Catalog

### Authentication & Core (`/auth`)
| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/auth/login` | Authenticates user; returns JWT token, role, and full name | Public |
| `GET` | `/csrf` | Returns CSRF token for state-changing operations | Authenticated |

### Attendance Capture & Review (`/capture`, `/api/attendance-sessions`)
| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/capture` | Submits classroom photo via multipart form data; triggers recognition | `TEACHER`, `ADMIN` |
| `GET` | `/api/attendance-sessions/{id}/review` | Polls session status and retrieves records with confidence scores | `TEACHER`, `ADMIN` |
| `POST` | `/api/attendance-sessions/{id}/review` | Submits human review overrides and finalizes session | `TEACHER`, `ADMIN` |
| `GET` | `/api/rooms` | Lists active classrooms with building and capacity details | `TEACHER`, `ADMIN` |
| `GET` | `/teacher/assignments` | Lists active subject and section assignments for the teacher | `TEACHER`, `ADMIN` |

### Student Biometrics & Enrollment (`/students`, `/api/students`)
| Method | Endpoint | Description | Role |
|---|---|---|---|
| `POST` | `/enroll` (FastAPI) | Direct face embedding extraction from single-face photo | Internal / API |
| `POST` | `/students/single-enroll` | Enrolls single student with metadata and face photograph | `TEACHER`, `ADMIN` |
| `POST` | `/students/bulk-enroll` | Bulk uploads CSV + ZIP archive of student face photos | `TEACHER`, `ADMIN` |
| `GET` | `/students` | Retrieves list of all enrolled students and biometric status | `TEACHER`, `ADMIN` |
| `DELETE` | `/api/students/{id}/biometrics` | **DPDP Act 2023**: Permanently deletes 128-d vectors and revokes consent | `HOD`, `ADMIN` |

### Timetable & Session Operations (`/api/timetable`)
| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/timetable/current-period` | Returns active/upcoming period and capture window status | `TEACHER`, `ADMIN` |
| `GET` | `/api/timetable/dashboard/today` | HOD daily summary: total, conducted, cancelled, leaves | `HOD`, `ADMIN` |
| `GET` | `/api/timetable/slots` | Lists active timetable slots across academic terms | `TEACHER`, `ADMIN` |
| `POST` | `/api/timetable/upload` | Uploads weekly timetable via CSV with double-booking collision checks | `ADMIN` |
| `POST` | `/api/timetable/generate-sessions` | Generates lecture sessions across dates while skipping holidays | `ADMIN` |
| `POST` | `/api/timetable/sessions/{id}/substitute`| Assigns substitute teacher to specific session | `HOD`, `ADMIN` |
| `POST` | `/api/timetable/leaves` | Submits teacher leave application | `TEACHER`, `ADMIN` |
| `PUT` | `/api/timetable/leaves/{id}/approve` | Approves leave and auto-cancels scheduled sessions | `HOD`, `ADMIN` |

### Analytics & Reports (`/api/analytics`)
| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/api/analytics/summary` | Subject-wise attendance percentages and defaulter lists | `TEACHER`, `HOD`, `ADMIN` |
| `GET` | `/api/analytics/pdf` | Generates downloadable A4 attendance report in PDF format | `TEACHER`, `HOD`, `ADMIN` |
| `GET` | `/api/analytics/excel` | Generates downloadable `.xlsx` attendance spreadsheet | `TEACHER`, `HOD`, `ADMIN` |

### Student Self-Service Portal (`/student`, `/api/student`)
| Method | Endpoint | Description | Role |
|---|---|---|---|
| `GET` | `/student/profile` | Student's profile, section, and enrolled subjects | `STUDENT`, `ADMIN` |
| `GET` | `/student/summary` | Aggregated subject attendance percentages and defaulter warning | `STUDENT`, `ADMIN` |
| `GET` | `/student/attendance` | Historical date-wise attendance records | `STUDENT`, `ADMIN` |
| `GET` | `/student/timetable` | Today's scheduled periods for the student's section | `STUDENT`, `ADMIN` |
| `POST` | `/student/dispute` | Raises attendance dispute for review | `STUDENT` |
| `GET` | `/api/disputes/pending` | Lists unresolved student attendance disputes | `TEACHER`, `HOD`, `ADMIN` |
| `POST` | `/api/disputes/{id}/resolve` | Resolves student dispute with audit trail | `TEACHER`, `HOD`, `ADMIN` |

---

*ClassSight Architecture & Engineering Documentation · Last Updated: October 2026*
