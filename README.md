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
| **Frontend** | Live Webcam Capture (`getUserMedia`) | 🟢 Complete | Native HTML5 video preview, `<canvas>` snapshot to JPEG blob, retake support. |
| **Frontend** | Photo File Upload Mode | 🟢 Complete | Fallback file chooser with instant preview and file size validation. |
| **Frontend** | Dynamic Classroom & Subject Dropdowns | 🟢 Complete | Dynamically fetched from `/api/rooms` and `/teacher/assignments`. |
| **Frontend** | Polling Review & Status Indicators | 🟢 Complete | 1-second interval polling displaying status badges (`PRESENT`, `ABSENT`, `REVIEW`). |
| **Frontend** | Automated Absent Visibility | 🟢 Complete | Undetected enrolled students show immediately as `ABSENT` without manual input. |
| **Frontend** | Manual Override Controls | 🟢 Complete | Present/Absent toggle buttons per student card for ambiguous detections. |
| **Frontend** | Bulk Student Onboarding UI | 🟢 Complete | CSV template download, CSV + ZIP/multi-photo upload, live row-by-row diagnostic table. |
| **Frontend** | Single Student Onboarding UI | 🟢 Complete | Live webcam face snapshot or photo upload, biometric consent checkbox. |
| **Frontend** | Biometric Student Roster | 🟢 Complete | Real-time table displaying enrollment date and `128-d Registered` status. |
| **Backend** | Foundational Data Seeding | 🟢 Complete | `DataSeeder.java` seeds Room 101, CS101, CS-2026-A, Browser Webcam, and teacher assignment. |
| **Backend** | Absent Student Auto-Finalization | 🟢 Complete | Unseen students marked `ABSENT / APPROVED`; clean sessions auto-finalize to `FINALIZED`. |
| **Backend** | Capture Deduplication Guard | 🟢 Complete | SHA-256 fingerprint over image + metadata rejects duplicate submissions within 30s. |
| **Backend** | Global CORS Configuration | 🟢 Complete | `SecurityConfig.java` allows `localhost:*` and `127.0.0.1:*` with credentials. |
| **Backend** | Multi-Reference Biometric Embeddings | 🟢 Complete | Additive `student_face_embeddings` table (Flyway V5); stores multiple reference vectors. |
| **Backend** | MinIO S3 Object Storage | 🟢 Complete | `CapturePhotoStorageService` stores images in S3; streams review images via API. |
| **Backend** | RabbitMQ Asynchronous Recognition | 🟢 Complete | Feature-flagged AMQP transport with durable capture/result queues and dead-letter exchange. |
| **Backend** | Local CSV ERP Integration | 🟢 Complete | `/admin/erp/*` validates attendance, exports standard CSVs, and records sync audits. |
| **Backend** | RTSP IP Camera Adapter & Probing | 🟢 Complete | FFmpeg frame grabber, SSRF URL validator, AES-GCM credential encryption. |
| **Backend** | Analytics & Attendance PDF Export | 🟢 Complete | Defaulter percentage calculations and downloadable A4 PDF reports via OpenPDF. |
| **Backend** | 30-Day Biometric Retention Cleanup | 🟢 Complete | Scheduled cron job purges expired raw captures while preserving attendance records. |
| **Face Service**| Single-Face Enrollment (`/enroll`) | 🟢 Complete | Rejects 0 faces or >1 face; outputs 128-dimensional embedding vector. |
| **Face Service**| Multi-Face Recognition (`/recognize`) | 🟢 Complete | Detects multiple faces, matches against enrolled students, returns confidence scores. |
| **Face Service**| 4-Tier State Classification | 🟢 Complete | Outputs `RECOGNIZED`, `UNKNOWN`, `LOW_CONFIDENCE`, or `RECAPTURE_REQUIRED`. |
| **Face Service**| Quality Assessment Pipeline | 🟢 Complete | Computes Laplacian blur score, brightness mean, texture liveness, and face area ratio. |
| **Face Service**| Landmark Roll / Pose Check | 🟢 Complete | Optional dlib facial landmark check flagging faces rotated > 25°. |
| **Face Service**| Guarded Edge-Crop Face Mode | 🟢 Complete | Padded crop encoding (`EDGE_CROP_ENABLED`) reduces bandwidth by >95%. |
| **Face Service**| In-Memory Embedding Cache | 🟢 Complete | Caches parsed vectors by student ID and SHA-256 fingerprint to avoid re-parsing. |
| **Face Service**| RabbitMQ Worker | 🟢 Complete | Consumes AMQP messages, downloads photo from MinIO, publishes recognition results. |
| **Performance** | Multi-Face Server-Side Latency | 🟡 Known Bottleneck | CPU-bound dlib HOG takes ~15–20s for 8–12 faces; needs GPU or lighter detector. |
| **Accuracy** | Golden-Set Baseline Discrepancy | 🟡 Unreconciled | Checked-in harness measures 33.33% on archival test due to bounding box crop artifacts. |
| **Hardware** | Commercial IP Camera Testing | 🟡 Provisional | Tested against simulated RTSP streams; physical IP cameras (ONVIF/PoE) unverified. |
| **Deployment** | Local Kubernetes Deployment | 🔴 Blocked in Sandbox | Manifests are valid (18 docs), but k3s/k3d blocked by Docker sandbox CNI/iptables. |
| **ERP** | Live University SIS/ERP Delivery | 🔴 Provisional Only | Local CSV export implemented; no vendor-specific API (Banner, PeopleSoft, Canvas). |

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

## Known Bottlenecks, Limitations & What's Incomplete

### 1. Multi-Face Recognition Latency on CPU (Major Bottleneck)
- **Current Behavior**: The FastAPI service uses the dlib HOG (Histogram of Oriented Gradients) face detector running on the host CPU.
- **Measured Latency**:
  - Single face: ~500ms – 1.2s.
  - 6 to 12 faces in a group photo: ~8s – 20s.
  - 30-person classroom wide shot: ~40s – 100s in constrained environments.
- **Root Cause**: HOG sliding window scanning at native image resolutions (e.g. 7MB / 4K photos) is single-threaded and computationally heavy. Downscaling the image was tested in previous spikes but caused small/distant faces to be missed.
- **Recommendation for Live Demos**: Keep group photo demo groups to **8–12 students** positioned 2–4 metres from the camera.

### 2. Golden-Set Baseline Discrepancy
- The repository contains an archival regression test harness (`golden-set/run-regression.py`). Under `expected-results.json`, it currently scores **33.33%** due to historical crop-to-face ground-truth artifacts. While the modern Obama/Biden reference matches cleanly at 100%, the archival 1899 test suite requires bounding box realignment before it can serve as a production accuracy benchmark.

### 3. Local Kubernetes Runtime in Constrained Sandboxes
- The manifests in `k8s/classsight.yaml` contain 18 syntactically valid Kubernetes documents (Deployments, Services, ConfigMaps, Secrets, PVCs for all 6 tiers).
- However, local deployment via `k3d` or `k3s` fails inside Docker-in-Docker or environments lacking the Linux kernel `iptables` raw table and Flannel CNI networking. This is a local runtime constraint; cloud Kubernetes (EKS/GKE) is not yet configured.

### 4. Hardware Verification: Real IP Cameras vs Simulated RTSP
- The RTSP camera adapter was validated using local GStreamer and FFmpeg video feeds.
- Real campus deployments require testing with physical commercial cameras (Hikvision, Dahua, Axis) to validate ONVIF auto-discovery, camera authentication, H.264/H.265 stream decoding over Wi-Fi, packet loss, and power-over-ethernet (PoE) outages.

### 5. Provisional ERP vs Enterprise SIS
- The ERP integration (`/admin/erp/*`) generates standard CSV files in `/app/exports`.
- It does **not** deliver attendance data to a live university student information system (e.g. Ellucian Banner, Oracle PeopleSoft, Canvas LMS, SAP).

---

## Future Scope & Technical Roadmap

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         FUTURE ROADMAP PHASES                          │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Phase 1: Biometric Speed & Deep Learning Engine                        │
 │   • Replace dlib HOG with YOLOv8-Face / RetinaFace (ONNX Runtime)      │
 │   • Migrate 128-d dlib embeddings to ArcFace / InsightFace (512-d)     │
 │   • GPU acceleration via CUDA in Docker runtime (< 2s for 40 faces)    │
 │   • Top-1 vs Top-2 confidence margin safety checks                     │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Phase 2: Campus Hardware & Edge Camera Pipeline                        │
 │   • Physical ONVIF camera discovery and PTZ camera support             │
 │   • Raspberry Pi / Jetson edge capture node running edge-crop pipeline │
 │   • Continuous ambient attendance: passive background frame sampling    │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Phase 3: Student Self-Service & Anti-Spoofing PWA                      │
 │   • Dedicated Student Mobile Web App for self-onboarding photo upload  │
 │   • Neural network presentation attack detection (anti-spoofing)       │
 │   • Student attendance dashboard and dispute submission workflow       │
 ├────────────────────────────────────────────────────────────────────────┤
 │ Phase 4: Production Cloud & LMS/ERP Connectors                         │
 │   • LTI 1.3 standard integration for Canvas, Blackboard, and Moodle    │
 │   • Cloud deployment on AWS (EKS, RDS Aurora, S3, Managed RabbitMQ)    │
 │   • Automated key rotation for encrypted camera credentials            │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## Local Development & Quick Start

### Prerequisites
- **Operating System**: Windows (PowerShell), Linux, or macOS.
- **Docker Desktop**: Running in Linux Container mode with at least 8 GB RAM allocated.
- **Node.js**: v18+ (tested on Node v24) and **Java 17** (for host development).

### 1. Start the Backend Infrastructure (Docker)
```powershell
# Copy environment configuration
Copy-Item .env.example .env

# Start database, object storage, queue, recognition service, and backend
docker compose up -d

# Verify all services are healthy (wait ~60-90 seconds)
docker compose ps
```
All 5 containers (`postgres`, `minio`, `rabbitmq`, `face-service-fastapi`, `backend-spring`) will show `Up (healthy)`.

### 2. Start the Next.js Faculty Frontend
```powershell
cd frontend-next
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Credentials & Service Ports

| Service | Port / URL | Credentials / Roles | Notes |
|---|---|---|---|
| **Next.js Faculty App** | [http://localhost:3000](http://localhost:3000) | `teacher` / `teacher123` | Main interactive attendance & enrollment UI |
| **Spring Boot API** | [http://localhost:8080](http://localhost:8080) | `admin` / `admin123` | REST API, Thymeleaf pages, and management |
| **Spring Health Check** | `http://localhost:8080/health` | Public | Returns `{"status":"UP"}` |
| **FastAPI Face Engine** | `http://localhost:8000/health` | Public | Returns `{"status":"UP"}` |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | `minioadmin` / `minioadmin` | Object storage inspection (`classsight-captures`) |
| **RabbitMQ Console** | [http://localhost:15672](http://localhost:15672) | `classsight` / `classsight_rabbit_password` | AMQP queue monitoring and dead-letter checks |
| **PostgreSQL Database** | `localhost:5432` | `classsight` / `classsight_password` | Database: `classsight` |

---

## Configuration Reference

Key variables configured in `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `RECOGNITION_MODE` | `sync` | `sync` uses direct HTTP; `async` enables RabbitMQ event queues. |
| `RABBITMQ_WORKER_ENABLED` | `false` | Enables the FastAPI background AMQP worker when set to `true`. |
| `EDGE_CROP_ENABLED` | `false` | Enables padded face-crop encoding to minimize recognition bandwidth. |
| `ATTENDANCE_RECOGNITION_THRESHOLD` | `0.6` | Maximum Euclidean distance for an identity match. |
| `QUALITY_BLUR_THRESHOLD` | `30.0` | Minimum Laplacian variance before flagging an image as blurry. |
| `QUALITY_MIN_BRIGHTNESS` | `35.0` | Minimum acceptable grayscale brightness mean. |
| `QUALITY_MAX_BRIGHTNESS` | `220.0` | Maximum acceptable grayscale brightness mean. |
| `PRIVACY_RETENTION_DAYS` | `30` | Number of days raw classroom photos are retained before auto-purge. |
| `ATTENDANCE_DEFAULTER_THRESHOLD` | `75` | Minimum attendance percentage before a student is flagged as defaulter. |

---

## Testing & Verification Guide

### 1. Build Verification
```powershell
# Frontend production build
cd frontend-next
npm run build

# Kubernetes manifest syntax validation
python scripts/validate_k8s_manifest.py
```

### 2. Multi-Face Latency Benchmark
To measure end-to-end recognition speed across full-frame vs edge-cropped modes:
```powershell
python scripts/latency_benchmark.py --students 30
```

### 3. Golden-Set Biometric Regression
```powershell
python golden-set/run-regression.py
```

---

## Documentation Index

- **[DEMO_GUIDE.md](DEMO_GUIDE.md)**: 5-minute pre-demo checklist and operator cheat sheet for live presentations.
- **[docs/demo-readiness-log.md](docs/demo-readiness-log.md)**: Detailed execution log covering P0 through P2 milestone implementations.
- **[docs/infra-upgrade-log.md](docs/infra-upgrade-log.md)**: Architecture audit logs for MinIO, RabbitMQ, Next.js, and Kubernetes upgrades.
- **[docs/accuracy-upgrade-log.md](docs/accuracy-upgrade-log.md)**: Step A through Step H biometric accuracy investigation.
- **[docs/security.md](docs/security.md)**: Authentication architecture, JWT token lifecycle, CSRF tokens, and SSRF camera guards.
- **[docs/known-limitations.md](docs/known-limitations.md)**: Unresolved production limitations and hardware considerations.
- **[PRIVACY.md](PRIVACY.md)**: Data retention, consent enforcement, and privacy policy compliance.

---

*ClassSight Architecture & Engineering Documentation · Last Updated: 2026-10-04*
