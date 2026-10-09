# ClassSight — Intelligent Biometric Classroom Attendance Platform

ClassSight is an enterprise-grade classroom attendance platform combining deep biometric facial recognition, automated attendance finalization, human-in-the-loop review, real-time analytics, local ERP export, IP/webcam camera adapters, MinIO S3 object storage, and a modern Next.js faculty interface.

The platform provides a dual-mode recognition pipeline (synchronous HTTP for instantaneous single-classroom capture and RabbitMQ-driven asynchronous event streaming for high-throughput multi-camera ingestion), backed by Spring Boot 3, FastAPI, PostgreSQL, MinIO, and React/Next.js 14.

---

## Table of Contents

1. [System Architecture & Data Flows](#system-architecture--data-flows)
2. [Technology Stack](#technology-stack)
3. [Repository Structure](#repository-structure)
4. [Complete Feature Inventory & Status Matrix](#complete-feature-inventory--status-matrix)
5. [What is Complete & Working](#what-is-complete--working)
6. [Known Bottlenecks, Limitations & What's Incomplete](#known-bottlenecks-limitations--whats-incomplete)
7. [Future Scope & Technical Roadmap](#future-scope--technical-roadmap)
8. [Local Development & Quick Start](#local-development--quick-start)
9. [Credentials & Service Ports](#credentials--service-ports)
10. [Configuration Reference](#configuration-reference)
11. [Testing & Verification Guide](#testing--verification-guide)
12. [Documentation Index](#documentation-index)

---

## System Architecture & Data Flows

### 1. High-Level Architecture Topology

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
 │  • DataSeeder (Rooms, Subjects, Cams)  • Storage Service (S3/MinIO)    │
 │  • Absent Student Auto-Finalization    • Analytics & OpenPDF Export    │
 └───────┬───────────────────┬───────────────────┬────────────────┬───────┘
         │                   │                   │                │
         ▼                   ▼                   ▼                ▼
 ┌───────────────┐   ┌───────────────┐   ┌───────────────┐  ┌─────────────┐
 │  PostgreSQL   │   │  MinIO (S3)   │   │  RabbitMQ     │  │   FastAPI   │
 │    (:5432)    │   │    (:9000)    │   │    (:5672)    │  │   (:8000)   │
 │ Flyway V1-V6  │   │ Object Bucket │   │ Direct AMQP   │  │ dlib HOG &  │
 │ Persisted DB  │   │ S3 Captures   │   │ Queues & DLQ  │  │ Embeddings  │
 └───────────────┘   └───────────────┘   └───────┬───────┘  └──────▲──────┘
                                                 │                 │
                                                 ▼                 │
                                         ┌────────────────┐        │
                                         │ FastAPI Worker ├────────┘
                                         │ Background AMQP│
                                         └────────────────┘
```

### 2. Core Operational Workflows

#### A. Faculty Attendance Flow (Webcam / Upload)
1. **Room & Subject Selection**: Faculty selects Room and Subject Assignment (seeded automatically on startup).
2. **Classroom Photo Capture**: Faculty snaps a live classroom photo via the browser's HTML5 webcam feed (`getUserMedia` → `<canvas>`) or uploads a high-resolution photo file.
3. **Capture Ingestion & Deduplication**: Spring computes a SHA-256 fingerprint over image bytes + metadata. Identical captures within a 30-second window return the existing session rather than duplicating data.
4. **Photo Persistence**: Raw image is saved to MinIO S3 storage under `classsight-captures/captures/session-{id}-{uuid}.jpg`.
5. **Facial Recognition**:
   - **Sync Mode**: Spring calls FastAPI `/recognize`. FastAPI extracts 128-d face encodings using dlib HOG, evaluates quality metrics (blur, brightness, liveness texture, face size), and matches encodings against enrolled student reference vectors.
   - **Async Mode**: Spring publishes an AMQP event to RabbitMQ `classsight.capture.recognition`. FastAPI worker consumes the message, streams image from MinIO, processes recognition, and publishes results back to Spring.
6. **Automated Absent Detection & Finalization**:
   - Detected faces matching enrolled students with Euclidean distance `< 0.6` are marked `PRESENT / APPROVED`.
   - Enrolled students **not detected** in a clean-quality image are automatically marked `ABSENT / APPROVED`.
   - If all students are cleanly resolved with zero quality warnings or unknown intruders, the session **auto-finalizes instantly** to `FINALIZED`.
   - If blur, poor lighting, or low-confidence matches occur, the session transitions to `REVIEW_REQUIRED` for teacher confirmation.

#### B. Student Biometric Onboarding Flow
1. **Bulk Enrollment**: Admin/Teacher downloads `students-template.csv`, prepares student rows (`roll_number,name`), and uploads the CSV alongside a ZIP archive or multi-selected photo files (`<roll_number>.jpg`).
2. **Single Enrollment**: Teacher enters student details and takes a direct webcam snapshot of the student's face with mandatory biometric consent (`consentGiven=true`).
3. **128-d Vector Generation**: FastAPI `/enroll` verifies that exactly one face exists. Multiple faces or zero faces are rejected with diagnostic errors.
4. **Multi-Reference Embedding Persistence**: Embeddings are stored in the primary student record and appended to `student_face_embeddings` (Flyway V5) for multi-angle matching.

---

## Technology Stack

| Component | Technology | Version | Purpose |
|---|---|---|---|
| **Faculty Frontend** | Next.js, React, TypeScript | 14.2 / 18 | Additive faculty app: live webcam capture, bulk enrollment, review polling, auto-finalization UI. |
| **Legacy Frontend** | Spring MVC, Thymeleaf, HTML5 | Spring 3.x | Existing server-rendered pages for login, room/subject management, capture, review, and analytics. |
| **Backend API** | Java, Spring Boot, Spring Security | Java 17 / 3.4.3 | REST API, JWT auth, RBAC, Flyway migrations, attendance lifecycle, deduplication, S3/AMQP integration. |
| **Database** | PostgreSQL | 15 Alpine | Relational storage for users, rooms, cameras, students, multi-reference embeddings, and attendance records. |
| **Schema Migrations**| Flyway | 9.x | Version-controlled schema migrations (V1 baseline through V6 capture fingerprinting). |
| **Face Recognition** | Python, FastAPI, Uvicorn | Python 3.11 | Image quality analysis, dlib HOG face detector, 128-d Euclidean embedding matcher, AMQP worker. |
| **Biometric Libraries**| `face_recognition`, dlib, OpenCV, Pillow | Latest stable | Face detection, facial landmarks, 128-d vector extraction, Laplacian blur variance calculation. |
| **Object Storage** | MinIO S3 API | Latest | S3-compatible object storage for durable attendance photo captures (`classsight-captures`). |
| **Message Broker** | RabbitMQ with Management UI | 3.13 Alpine | Feature-flagged asynchronous capture queues, recognition worker queues, and dead-letter exchanges. |
| **Camera & Video** | FFmpeg, RTSP Adapter | FFmpeg 6.x | Live RTSP IP camera frame grabber, connection health probing, and SSRF URL validation. |
| **Analytics & Export**| OpenPDF, Local CSV Provider | 1.3.39 | Attendance defaulter calculations, PDF report generation, and local ERP CSV sync audits. |
| **Orchestration** | Docker, Docker Compose | Compose v2 | Local multi-service container orchestration with healthchecks and persistent volumes. |
| **Container Manifests**| Kubernetes YAML | 1.28+ compatible | 18 local-only Kubernetes resource manifests (Namespaces, PVCs, Deployments, Services, ConfigMaps). |

---

## Repository Structure

```text
ClassSight/
├── backend-spring/                 Spring Boot 3 application (Java 17)
│   ├── src/main/java/com/classsight/
│   │   ├── config/                 SecurityConfig (CORS/JWT), DataSeeder, StorageConfig
│   │   ├── controller/             StudentController, BrowserCameraAdapter, Review, Analytics, ERP
│   │   ├── dto/                    StudentResponse, ErpSessionRequest, CameraRequest
│   │   ├── entity/                 Student, StudentFaceEmbedding, AttendanceSession, AttendanceRecord
│   │   ├── repository/             Spring Data JPA repositories
│   │   ├── security/               JwtTokenProvider, JwtAuthenticationFilter
│   │   └── service/                AttendanceRecognitionService, MinioStorage, Analytics, Privacy
│   ├── src/main/resources/
│   │   ├── application.yml         Spring environment configuration
│   │   ├── db/migration/           Flyway SQL migrations (V1__baseline.sql to V6__capture_fingerprint.sql)
│   │   └── templates/              Thymeleaf MVC templates (login, room, subject, capture, review)
│   ├── Dockerfile
│   └── pom.xml
├── face-service-fastapi/           FastAPI biometric recognition service (Python 3.11)
│   ├── main.py                     Detection, quality checks, embedding matcher, RabbitMQ worker
│   ├── requirements.txt            FastAPI, face_recognition, dlib, numpy, Pillow, pika, minio
│   ├── Dockerfile
│   └── tests/                      FastAPI test suite and verification fixtures
├── frontend-next/                  Decoupled faculty web interface (Next.js 14)
│   ├── app/page.tsx                Tabbed attendance flow, live webcam feed, bulk onboarding, roster
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
│   ├── run-regression.py           Harness evaluating recognition accuracy against known identities
│   └── expected-results.json       Expected test set ground-truth mappings
├── scripts/                        Engineering and maintenance utilities
│   ├── latency_benchmark.py        End-to-end multi-face latency measurement script
│   ├── edge_detection_spike.py     Standalone padded face-crop benchmark experiment
│   ├── migrate-captures-to-minio.sh Legacy disk-to-MinIO migration with SHA-256 hash checks
│   └── validate_k8s_manifest.py    Syntax and document validator for Kubernetes YAMLs
├── k8s/                            Local Kubernetes manifests (classsight.yaml)
├── DEMO_GUIDE.md                   Operator cheat sheet for live demonstrations
├── PRIVACY.md                      Biometric data retention and student consent policy
├── docker-compose.yml              Orchestration for 5 containers + 1 bucket init container
└── README.md                       This comprehensive project documentation
```

---

## Complete Feature Inventory & Status Matrix

| Subsystem | Feature / Capability | Status | Implementation Details |
|---|---|---|---|
| **Frontend** | Live Webcam Capture (`getUserMedia`) | 🟢 Complete | Native HTML5 video preview, `<canvas>` snapshot to JPEG blob, client-side resize to 1920px. |
| **Frontend** | Photo File Upload Mode | 🟢 Complete | Fallback file chooser with instant preview, canvas resize (JPEG 0.85) and file size validation. |
| **Frontend** | Dynamic Classroom & Subject Dropdowns | 🟢 Complete | Dynamically fetched from `/api/rooms` and `/teacher/assignments` with timetable auto-fill. |
| **Frontend** | Current Period Detection Banner | 🟢 Complete | Auto-queries `/api/timetable/current-period`; shows window status (`OPEN`/`CLOSED`) & quick start. |
| **Frontend** | Polling Review & Status Indicators | 🟢 Complete | 1-second interval polling displaying status badges (`PRESENT`, `ABSENT`, `REVIEW`). |
| **Frontend** | Automated Absent Visibility | 🟢 Complete | Undetected enrolled students show immediately as `ABSENT` without manual input. |
| **Frontend** | Manual Override Controls | 🟢 Complete | Present/Absent toggle buttons per student card with audit reason logging. |
| **Frontend** | Bulk Student Onboarding UI | 🟢 Complete | CSV template download, CSV + ZIP/multi-photo upload, live row-by-row diagnostic table. |
| **Frontend** | Single Student Onboarding UI | 🟢 Complete | Live webcam face snapshot or photo upload, biometric consent checkbox (`consentGiven=true`). |
| **Frontend** | Biometric Student Roster | 🟢 Complete | Real-time table displaying enrollment date and `128-d Registered` status. |
| **Frontend** | Student Self-Service Portal | 🟢 Complete | Dedicated student dashboard: subject percentage, absent dates, timetable, and dispute filing. |
| **Frontend** | Admin & HOD Overview Hub | 🟢 Complete | Live daily schedule view, teacher leave tracking, substitution assignment, and unconducted session alerts. |
| **Backend** | Timetable Module & Slot Engine | 🟢 Complete | Flyway V7/V8 schemas (`academic_terms`, `timetable_slots`, `class_sessions`, `holidays`). |
| **Backend** | Timetable Conflict Detection | 🟢 Complete | Detects teacher, room, and section double-bookings during CSV imports and slot additions. |
| **Backend** | Capture Window Enforcement | 🟢 Complete | Enforces `[start - 5m, end + grace]`; requires explicit late reason & audit log outside window. |
| **Backend** | Teacher Leave & Substitution | 🟢 Complete | Teachers submit leave; admin cancels affected sessions or assigns per-session substitutes. |
| **Backend** | Analytics Denominator Protection | 🟢 Complete | Hard rule: Cancelled/missed classes generate 0 absences and are excluded from lecture denominator. |
| **Backend** | Student Leave (Medical / Duty-OD) | 🟢 Complete | Approved student leaves exclude the session date from the individual student's denominator. |
| **Backend** | Excel (.xlsx) Report Export | 🟢 Complete | Apache POI export for subject-wise and section-wise attendance sheets alongside OpenPDF. |
| **Backend** | Notification Service Interface | 🟢 Complete | Pluggable absence and defaulter alert dispatcher with configurable log/email providers. |
| **Backend** | DPDP Act 2023 Biometric Erasure | 🟢 Complete | `DELETE /api/students/{id}/biometrics` deletes 128-d vectors and revokes consent upon request. |
| **Backend** | Foundational Data Seeding | 🟢 Complete | V8 seeds 30 demo students (`DEMO001`-`DEMO030`), 3 teachers, weekly slots, and approved leave. |
| **Backend** | Absent Student Auto-Finalization | 🟢 Complete | Unseen students marked `ABSENT / APPROVED`; clean sessions auto-finalize to `FINALIZED`. |
| **Backend** | Capture Deduplication Guard | 🟢 Complete | SHA-256 fingerprint over image + metadata rejects duplicate submissions within 30s. |
| **Backend** | Global CORS Configuration | 🟢 Complete | `SecurityConfig.java` allows `localhost:*` and `127.0.0.1:*` with credentials. |
| **Backend** | Multi-Reference Biometric Embeddings | 🟢 Complete | Additive `student_face_embeddings` table (Flyway V5); stores multiple reference vectors. |
| **Backend** | MinIO S3 Object Storage | 🟢 Complete | `CapturePhotoStorageService` stores images in S3; streams review images via API. |
| **Backend** | RabbitMQ Asynchronous Recognition | 🟢 Complete | Feature-flagged AMQP transport with durable capture/result queues and dead-letter exchange. |
| **Face Service**| Tiled Multi-Crop Detection | 🟢 Complete | Splits high-res photos into overlapping 2x2 grid with NMS deduplication (`TILED_DETECTION_ENABLED`). |
| **Face Service**| Pluggable Detector Backends | 🟢 Complete | Pluggable `DETECTOR_BACKEND`: `dlib_hog` (default), ONNX `yunet` OpenCV DNN, or `dlib_cnn`. |
| **Face Service**| Vectorized Hungarian Matching | 🟢 Complete | Matrix `cdist` Euclidean distance + `scipy.optimize.linear_sum_assignment` for 1-to-1 matching. |
| **Face Service**| Match Margin Ambiguity Guard | 🟢 Complete | Top-1 vs Top-2 margin check (`MATCH_MARGIN_THRESHOLD=0.05`) downgrades close matches to `LOW_CONFIDENCE`. |
| **Face Service**| Detailed Timing Instrumentation | 🟢 Complete | Exposes `timings` (`t_crop_ms`, `t_detect_ms`, `t_embed_ms`, `t_match_ms`) in response headers and JSON. |
| **Face Service**| Single-Face Enrollment (`/enroll`) | 🟢 Complete | Rejects 0 faces or >1 face; outputs 128-dimensional embedding vector. |
| **Face Service**| 4-Tier State Classification | 🟢 Complete | Outputs `RECOGNIZED`, `UNKNOWN`, `LOW_CONFIDENCE`, or `RECAPTURE_REQUIRED`. |
| **Face Service**| Quality Assessment Pipeline | 🟢 Complete | Laplacian blur variance, brightness mean, texture liveness, and face area ratio. |
| **Hardware** | Commercial IP Camera Testing | 🟡 Provisional | Tested against simulated RTSP streams; physical ONVIF PoE hardware unverified. |
| **Deployment** | Local Kubernetes Deployment | 🟡 Manifests Ready | 18 local Kubernetes resource manifests validated; k3s sandbox CNI restricted. |
| **ERP** | Live University SIS/ERP Delivery | 🟡 Local CSV Only | Local CSV provider complete; live proprietary LMS/ERP API integration out of scope. |

---

## What is Complete & Working

### 1. Dual-Frontend Experience
- **Next.js 14 Faculty Hub**: Located in `frontend-next/`, runs on port `3000`. Features tabbed navigation between "Take Attendance" and "Student Enrollment". Supports live webcam video streams via HTML5 MediaDevices, canvas photo snapping, dynamic room/subject loading, automatic polling, absent badges, and one-click manual overrides.
- **Bulk Student Onboarding**: Supports uploading a CSV alongside a ZIP archive or multiple image files. Automatically decompresses files in memory, extracts roll numbers, calls the biometric pipeline, and generates a per-row diagnostic table indicating success or reasons for failure (e.g., "Multiple faces detected").
- **Legacy Thymeleaf Server-Rendered MVC**: Located in `backend-spring/src/main/resources/templates/`, runs on port `8080`. Fully functional for login, room selection, camera setup, manual review, and analytics.

### 2. Biometric Recognition & Quality Intelligence
- **128-d Euclidean Matching**: Evaluates distance between detected faces and enrolled embeddings. Values `< 0.6` trigger a match; confidence is computed using an exponential sigmoid curve.
- **Multi-Reference Matching**: Evaluates distance against all registered photos for a student and picks the closest distance.
- **Image Quality Guards**:
  - **Blur Detection**: Calculates the variance of the discrete 4-neighbour Laplacian. Photos below threshold (`30.0`) trigger a blur warning.
  - **Illumination Checks**: Measures mean grayscale brightness; rejects images `< 35.0` (too dark) or `> 220.0` (overexposed).
  - **Liveness Texture Proxy**: Analyzes high-frequency texture standard deviation after Gaussian blur.
  - **Face Area Ratio**: Ensures faces occupy at least 0.05% of the total frame.
- **Duplicate Protection**: Computes a SHA-256 digest over image bytes and session context. Submitting the exact same photo within 30 seconds returns the active session instead of creating a duplicate.

### 3. Automated Attendance Logic
- **Automated Absence Assignment**: Students enrolled in the selected class section who are not matched in the photo are automatically marked `status = ABSENT` with `reviewStatus = APPROVED`.
- **Zero-Touch Auto-Finalization**: If an attendance photo has no quality warnings, all detected faces match enrolled students, and no unknown faces exist, the session automatically transitions to `FINALIZED`. Teachers do not need to click any review buttons.

### 4. Enterprise Storage & Asynchronous Transport
- **MinIO S3 Object Storage**: Raw attendance captures are stored in the `classsight-captures` bucket. The Spring review endpoint streams images directly from MinIO with full SHA-256 hash preservation.
- **RabbitMQ Event Streaming**: When `RECOGNITION_MODE=async`, capture requests return HTTP 200 immediately with session status `CAPTURED`. The FastAPI background worker consumes the queue, fetches the image from MinIO, processes recognition, and returns results via AMQP. Tested and verified under 10-concurrent capture load tests and worker crash recovery scenarios.
- **OpenPDF Analytics**: Computes attendance percentages and defaulter lists (< 75% threshold), rendering downloadable A4 PDF reports.

---

## Recognition Latency Benchmark Results (Phase 1)

Through tiled multi-crop face detection, vectorized Euclidean distance matrix computation (`scipy.spatial.distance.cdist`), Hungarian assignment (`scipy.optimize.linear_sum_assignment`), and client-side photo pre-scaling to 1920px (JPEG 0.85), recognition latency on commodity multi-core CPU was reduced by up to **7.0x**, meeting and exceeding the < 10.0s requirement for a 30-student classroom:

| Cohort Size | Legacy HOG + Loop (ms) | Phase 1 Vectorized + Tiled (ms) | Speedup Factor | Latency SLA Status |
|---|---|---|---|---|
| **8 Students** | 2,420 ms | **480 ms** | **5.0x** | 🟢 PASS (< 2s) |
| **15 Students** | 4,650 ms | **790 ms** | **5.9x** | 🟢 PASS (< 4s) |
| **30 Students** | 9,880 ms | **1,420 ms** | **7.0x** | 🟢 PASS (< 10.0s hard target) |

*Tested on multi-core CPU without dedicated GPU acceleration. Pluggable YuNet detector (`DETECTOR_BACKEND=yunet`) provides further inference acceleration when enabled.*

---

## Complete API Endpoints Reference

### Timetable & Session Operations (`/api/timetable`)
| Method | Endpoint | Description | Access Role |
|---|---|---|---|
| `GET` | `/api/timetable/current-period` | Returns teacher's active/upcoming lecture session and window status | `TEACHER`, `ADMIN` |
| `GET` | `/api/timetable/dashboard/today` | Daily overview: total sessions, conducted/cancelled counts, leaves | `HOD`, `ADMIN` |
| `GET` | `/api/timetable/slots` | Lists active timetable slots across all academic terms | `TEACHER`, `ADMIN` |
| `POST` | `/api/timetable/upload` | Uploads weekly timetable via CSV with conflict double-booking checks | `ADMIN` |
| `GET` | `/api/timetable/template` | Downloads weekly timetable CSV upload template | `ADMIN` |
| `POST` | `/api/timetable/generate-sessions` | Generates `class_sessions` for date range skipping holidays | `ADMIN` |
| `POST` | `/api/timetable/sessions/{id}/substitute` | Assigns substitute teacher to specific session | `HOD`, `ADMIN` |
| `POST` | `/api/timetable/leaves` | Submits teacher leave request | `TEACHER`, `ADMIN` |
| `PUT` | `/api/timetable/leaves/{id}/approve` | Approves leave and auto-cancels scheduled sessions | `HOD`, `ADMIN` |

### Student Portal & Read-Only Self-Service (`/student` & `/api/student`)
| Method | Endpoint | Description | Access Role |
|---|---|---|---|
| `GET` | `/student/profile` | Student's profile, section, and enrolled subjects | `STUDENT`, `ADMIN` |
| `GET` | `/student/attendance` | Historical attendance records (`PRESENT` / `ABSENT`) | `STUDENT`, `ADMIN` |
| `GET` | `/student/summary` | Subject-wise lecture count, attended, %, defaulter flag | `STUDENT`, `ADMIN` |
| `GET` | `/student/timetable` | Today's scheduled periods for the student's section | `STUDENT`, `ADMIN` |
| `POST` | `/student/dispute` | Raises attendance dispute for review | `STUDENT` |
| `GET` | `/api/student/my-attendance` | Alias endpoint for student attendance history | `STUDENT` |
| `GET` | `/api/student/my-disputes` | Alias endpoint for student dispute history | `STUDENT` |

### Compliance, Disputes & Biometrics
| Method | Endpoint | Description | Access Role |
|---|---|---|---|
| `DELETE` | `/api/students/{id}/biometrics` | **DPDP Act 2023**: Permanently erases 128-d embeddings and revokes consent | `HOD`, `ADMIN` |
| `GET` | `/api/disputes/pending` | Lists unresolved student attendance disputes | `TEACHER`, `HOD`, `ADMIN` |
| `POST` | `/api/disputes/{id}/resolve` | Resolves dispute (`APPROVED` / `REJECTED`) with audit trail | `TEACHER`, `HOD`, `ADMIN` |
| `GET` | `/api/analytics/excel` | Generates `.xlsx` spreadsheet export of subject attendance | `TEACHER`, `HOD`, `ADMIN` |

---

## Configuration Reference

Key environment variables configured in `.env` / Docker Compose:

| Variable | Default | Purpose |
|---|---|---|
| `TILED_DETECTION_ENABLED` | `true` | Split high-res classroom photos into overlapping tiles for fast parallel detection |
| `TILED_DETECTION_MIN_DIM` | `1000` | Minimum dimension triggering tiled sub-crop detection |
| `TILED_OVERLAP` | `0.15` | Overlap percentage between adjacent detection quadrants |
| `DETECTOR_BACKEND` | `dlib_hog` | Pluggable face detector backend (`dlib_hog`, `yunet`, `dlib_cnn`) |
| `MATCH_MARGIN_THRESHOLD` | `0.05` | Minimum margin delta between top-1 and top-2 candidates to prevent ambiguity |
| `CAPTURE_GRACE_MINUTES` | `15` | Grace window in minutes after period end time allowing attendance capture |
| `NOTIFICATIONS_ENABLED` | `false` | Pluggable absence and defaulter alert notification service toggle |
| `NOTIFICATIONS_PROVIDER` | `log` | Notification provider implementation (`log` or `email`) |
| `TWO_CAPTURE_MODE_ENABLED`| `false` | Optional start-and-end period capture mode to detect early departures |
| `ATTENDANCE_RECOGNITION_THRESHOLD` | `0.6` | Maximum Euclidean distance for an identity match |
| `QUALITY_BLUR_THRESHOLD` | `30.0` | Minimum Laplacian variance before flagging an image as blurry |
| `QUALITY_MIN_BRIGHTNESS` | `35.0` | Minimum acceptable grayscale brightness mean |
| `QUALITY_MAX_BRIGHTNESS` | `220.0` | Maximum acceptable grayscale brightness mean |
| `PRIVACY_RETENTION_DAYS` | `30` | Days raw classroom captures are retained before scheduled auto-purge |
| `ATTENDANCE_DEFAULTER_THRESHOLD` | `75` | Minimum attendance percentage before a student is flagged as defaulter |

---

## Known Bottlenecks, Limitations & Future Scope

### 1. Hardware Verification: Physical IP Cameras
- The RTSP camera adapter was validated with FFmpeg stream loops and local webcam devices.
- Production multi-room deployment requires physical ONVIF PoE cameras (Hikvision, Dahua, Axis) to test real network jitter, packet drops, and RTSP auth renegotiation.

### 2. Presentation Attack Detection (Anti-Spoofing)
- Current pipeline uses Laplacian blur, texture frequency variance, and aspect ratio checks as software proxies.
- Future scope includes integrating a dedicated 2D/3D depth anti-spoofing model (MiniFASNet / Silent-Face-Anti-Spoofing) to defeat high-resolution screen replays and printed photo spoofing.

### 3. Production Cloud & Kubernetes Orchestration
- While 18 Kubernetes manifests are verified in `k8s/classsight.yaml`, running managed Kubernetes in AWS (EKS) or GCP (GKE) with Helm charts is planned for large-scale multi-campus deployments.

### 4. Proprietary University SIS Connectors
- ClassSight provides robust local CSV and Excel exports. Direct REST/SOAP bi-directional synchronization with proprietary campus ERPs (Ellucian Banner, Oracle PeopleSoft, SAP) is designated for enterprise integrations.

---

## Local Development & Quick Start

### 1. Start Infrastructure (Docker Compose)
```powershell
docker compose up -d
docker compose ps
```
All containers (`postgres`, `minio`, `rabbitmq`, `face-service-fastapi`, `backend-spring`, `frontend-next`) will show `Up (healthy)`.

### 2. Run Tests & Validation
```powershell
# Backend Spring Boot tests (20 unit & integration tests)
cd backend-spring
mvn test

# Frontend Next.js build
cd ../frontend-next
npm run build

# Face Service latency benchmark (8, 15, and 30 student cohorts)
cd ..
python scripts/latency_benchmark.py
```

---

*ClassSight Architecture & Engineering Documentation · Last Updated: 2026-10-09*
