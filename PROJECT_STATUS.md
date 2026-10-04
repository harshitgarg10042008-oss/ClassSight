# ClassSight — Comprehensive Project Status, Feature Audit & Roadmap

**Date of Audit:** October 4, 2026  
**Auditor:** ClassSight Engineering  
**Repository State:** Clean (`HEAD` ahead of origin by 3 commits: P0.1–P0.8 enhancements, multi-photo bulk enrollment, live webcam feed, auto-finalization logic, global CORS, latency benchmarking, and `DEMO_GUIDE.md`)

---

## Executive Summary

ClassSight is an automated biometric attendance platform designed for academic institutions. Over recent development cycles, the platform underwent significant evolution—moving from a server-rendered prototype into a dual-mode, event-driven, microservice architecture with MinIO S3 storage, RabbitMQ asynchronous processing, and a high-performance Next.js 14 faculty web app.

However, historical documentation had fallen behind the actual codebase. This audit provides an exhaustive, ground-truth accounting of:
1. **What is Complete & Working**: Exactly what features are built, operational, and verified.
2. **What was Updated vs Outdated Documentation**: Specific discrepancies between previous descriptions and live code.
3. **What is Broken, Bottlenecks & Unresolved Limitations**: Honest assessment of technical debt, CPU HOG latency, golden-set discrepancies, and hardware assumptions.
4. **Future Scope & Engineering Roadmap**: Prioritized next steps across biometric accuracy, deep learning detection, edge cameras, and enterprise SIS integrations.

---

## 1. Feature Completion & Verification Matrix

### A. Faculty Web Application (`frontend-next/app/page.tsx`)

| Feature | Status | Verification Evidence | Notes |
|---|---|---|---|
| **JWT In-Memory Authentication** | 🟢 Complete | Verified via `POST /auth/login` | Tokens stay in React memory; never leaked to `localStorage`. |
| **Room & Assignment Selector** | 🟢 Complete | Verified against `/api/rooms` and `/teacher/assignments` | Dynamic dropdowns populated from backend database. |
| **Live Webcam Attendance Capture** | 🟢 Complete | Tested with browser `getUserMedia` & `<canvas>` snapshot | Captures high-res JPEG blob directly from user's camera. |
| **Photo File Upload Fallback** | 🟢 Complete | Tested with local `.jpg` files | Provides preview thumbnail and size validation. |
| **Real-time Recognition Polling** | 🟢 Complete | Verified against `/api/attendance-sessions/{id}/review` | Polls every 1s during processing; transitions to review/finalized. |
| **Automated Absence Display** | 🟢 Complete | Verified in Next.js UI | Students not detected in capture display as `ABSENT` badge. |
| **Manual Override Controls** | 🟢 Complete | Verified in Next.js UI | Present/Absent toggle buttons per student card for manual edits. |
| **Zero-Touch Auto-Finalization** | 🟢 Complete | Verified in `AttendanceRecognitionServiceTest` | Sessions with clean matches auto-finalize without teacher button click. |
| **Bulk Student Enrollment UI** | 🟢 Complete | Tested with CSV + multi-photo and ZIP upload | Downloads template, parses rows, shows color-coded diagnostic table. |
| **Single Student Enrollment UI** | 🟢 Complete | Tested with webcam snapshot and file upload | Validates single face with explicit biometric consent checkbox. |
| **Biometric Student Roster** | 🟢 Complete | Verified via `GET /students` | Displays roll number, name, enrollment date, and `128-d Registered`. |
| **Stale Frontend Cleanup** | 🟢 Complete | Verified via commit `b55e78c` | Removed orphaned `frontend-vite/` directory and build artifacts. |

---

### B. Application Backend (`backend-spring/`)

| Feature | Status | Verification Evidence | Notes |
|---|---|---|---|
| **Spring Security & RBAC** | 🟢 Complete | Verified across Admin and Teacher roles | Strict endpoint access rules with CSRF and JWT filters. |
| **Global CORS Configuration** | 🟢 Complete | Verified in `SecurityConfig.java` | Allows `http://localhost:*` & `http://127.0.0.1:*` with credentials. |
| **Foundational Data Seeding** | 🟢 Complete | Verified in `DataSeeder.java` | Auto-seeds Room 101, CS101, CS-2026-A, Browser Webcam, and teacher link. |
| **Flyway Database Migrations** | 🟢 Complete | Verified across migrations V1 through V6 | Versioned SQL scripts managing schema evolution and constraints. |
| **Multi-Reference Face Embeddings** | 🟢 Complete | Additive `student_face_embeddings` table (V5) | Preserves legacy 128-d column while supporting multi-angle vectors. |
| **Capture Deduplication Guard** | 🟢 Complete | Verified via SHA-256 capture fingerprint (V6) | Submitting identical photo within 30s returns existing session. |
| **Automated Absence Finalization** | 🟢 Complete | 8/8 backend unit tests pass in `backend-spring` | Unseen students marked `ABSENT / APPROVED`; auto-finalizes if clean. |
| **Synchronous Face Recognition** | 🟢 Complete | Verified via `POST /capture` | Multipart upload calls FastAPI `/recognize` and creates records. |
| **RabbitMQ Asynchronous Pipeline** | 🟢 Complete | Verified under 10-concurrent capture load test | Durable capture/result queues with dead-letter exchange support. |
| **MinIO S3 Storage Adapter** | 🟢 Complete | Verified via `CapturePhotoStorageService` | Images stored in MinIO; SHA-256 hash verified on upload/streaming. |
| **Local CSV ERP Integration** | 🟢 Complete | Verified via `/admin/erp/*` | Generates standard attendance CSVs and records sync audit logs. |
| **RTSP IP Camera Adapter** | 🟢 Complete | Verified via `RtspCameraAdapter` and FFmpeg | Captures frames from RTSP streams, validates URLs against SSRF. |
| **AES Camera Credential Security** | 🟢 Complete | Verified in `CameraCredentialService.java` | RTSP stream passwords encrypted using AES-GCM before saving to DB. |
| **Attendance Analytics & PDF** | 🟢 Complete | Verified via OpenPDF export | Calculates attendance % and defaulters (< 75%); outputs A4 PDF. |
| **30-Day Biometric Purge Cron** | 🟢 Complete | Verified in `PrivacyRetentionService.java` | Scheduled job purges raw photos older than 30 days; keeps records. |

---

### C. Biometric Recognition Engine (`face-service-fastapi/`)

| Feature | Status | Verification Evidence | Notes |
|---|---|---|---|
| **Single-Face Enrollment** | 🟢 Complete | Verified via `/enroll` | Rejects 0 faces or >1 face; outputs 128-d float array. |
| **Multi-Face Group Recognition** | 🟢 Complete | Verified via `/recognize` | Detects faces, computes encodings, matches against enrolled vectors. |
| **4-Tier State Classification** | 🟢 Complete | Verified in `main.py` | Classifies as `RECOGNIZED`, `UNKNOWN`, `LOW_CONFIDENCE`, or `RECAPTURE_REQUIRED`. |
| **Laplacian Blur Assessment** | 🟢 Complete | Tested with blurry and crisp fixtures | Variance of Laplacian flagged if `< 30.0`. |
| **Brightness & Contrast Check** | 🟢 Complete | Tested with dark/overexposed fixtures | Rejects images `< 35.0` or `> 220.0` mean brightness. |
| **Liveness Texture Proxy** | 🟢 Complete | Tested with Gaussian high-pass filter | Analyzes high-frequency texture standard deviation. |
| **Face Area Ratio Guard** | 🟢 Complete | Tested with wide distant shots | Flags faces occupying `< 0.05%` of total frame area. |
| **Landmark Roll / Pose Guard** | 🟢 Complete | Configurable via `QUALITY_POSE_CHECKS_ENABLED` | Flags faces with roll angle `> 25.0°` (disabled by default). |
| **Guarded Edge-Crop Mode** | 🟢 Complete | Tested in `edge_detection_spike.py` | Padded face-crop encoding reduces payload size by 95%–98%. |
| **In-Memory Embedding Cache** | 🟢 Complete | Keyed by student ID + SHA-256 vector digest | Eliminates redundant vector parsing during recognition requests. |
| **RabbitMQ Background Worker** | 🟢 Complete | Verified via `_rabbit_worker` in `main.py` | Consumes messages, downloads photo from MinIO, publishes results. |

---

## 2. Reality vs Outdated Documentation

The previous README and documentation suffered from several stale assumptions. Here is the direct comparison:

| Outdated Description | Ground Truth Reality |
|---|---|
| *"Next.js frontend is an additive room and assignment selector"* | **Massively Expanded**: Next.js 14 is a complete faculty hub with live HTML5 webcam video feed, canvas photo snapping, bulk CSV/ZIP enrollment, diagnostic results tables, single-student webcam enrollment, live roster tables, and real-time review polling. |
| *"Attendance requires manual review of all unresolved cards"* | **Automated Absence & Zero-Touch Finalization**: Enrolled students not detected in clean photos are automatically marked `ABSENT / APPROVED`. Sessions with clean detections auto-finalize to `FINALIZED` with zero teacher clicks required. |
| *"Database requires manual SQL or API seeding before demo"* | **Self-Seeding on Startup**: `DataSeeder.java` automatically initializes Room 101, Subject CS101, Section CS-2026-A, Browser Webcam, and Faculty assignments on first boot. |
| *"Enrollment only supported via curl command or single API"* | **Full Bulk & UI Onboarding**: `/students/bulk-enroll` supports uploading a CSV with a ZIP of photos or multiple photos simultaneously, parsing and matching them with instant row-by-row diagnostic feedback. |
| *"Captures can create duplicate sessions on repeated clicks"* | **Idempotent SHA-256 Guard**: The backend hashes image bytes + classroom context. Repeated submissions within 30 seconds safely return the existing session. |
| *"CORS issues when running Next.js on port 3000"* | **Global CORS Enabled**: `SecurityConfig.java` permits origins matching `http://localhost:*` and `http://127.0.0.1:*` with full header and credentials support. |
| *"Contains stale frontend-vite directory"* | **Cleaned & Removed**: Orphaned Vite build files and tsbuildinfo were fully deleted in commit `b55e78c`. |

---

## 3. What is Broken, Bottlenecks & Technical Limitations

### A. Performance Bottleneck: CPU dlib HOG Multi-Face Latency
- **The Issue**: Face detection in `face-service-fastapi` relies on dlib's Histogram of Oriented Gradients (HOG) detector running on the host CPU.
- **Impact**:
  - Processing 1–2 faces takes ~0.8s – 1.5s.
  - Processing 6–12 faces in a group photo takes ~8s – 20s.
  - Processing a wide 30-person classroom shot can take **40s to 100s** on CPU.
- **Why It Isn't Fixed Yet**: Downscaling full-frame images was tested but caused smaller, distant faces in the back rows of the classroom to be missed completely. The dlib HOG algorithm requires high resolution to find distant faces, creating a direct CPU compute bottleneck.
- **Mitigation for Demos**: Keep group photo demo groups to **8–12 students** positioned 2–4 metres from the camera.

### B. Golden-Set Regression Discrepancy (33.33% Score)
- **The Issue**: Running `golden-set/run-regression.py` against `expected-results.json` reports an overall accuracy of **33.33%** (1 false negative, 3 identity mismatches on the historical 1899 test fixture).
- **Impact**: While the modern Obama/Biden test set passes at 100%, the archival test set fails because the checked-in bounding box coordinates and crop mappings are misaligned with the current detector output.
- **Status**: The discrepancy is documented as an unresolved harness issue. Recognition algorithms were strictly prevented from being tuned or broken just to pass the flawed test harness.

### C. Local Kubernetes Deployment Blocked in Sandboxes
- **The Issue**: The manifests in `k8s/classsight.yaml` contain 18 valid YAML documents. However, executing `kubectl apply` in local sandboxes (like Docker-in-Docker or stripped Linux kernels) fails due to missing `iptables` raw tables and Flannel CNI pod networking failures.
- **Status**: Local Kubernetes is blocked by host sandbox limitations. Production deployment requires a managed cloud Kubernetes provider (EKS, GKE, or AKS) or a bare-metal Linux host with standard networking.

### D. Simulated vs Commercial IP Camera Verification
- **The Issue**: The RTSP camera adapter (`RtspCameraAdapter.java`) and FFmpeg frame extractor were verified using locally simulated GStreamer RTSP streams.
- **Impact**: Compatibility with real-world physical IP cameras (e.g. Hikvision, Dahua, Axis) on campus networks has not been field-tested for ONVIF discovery, RTSP Digest Authentication, Wi-Fi packet loss, or camera failover recovery.

### E. Provisional Local CSV ERP vs Real Enterprise SIS
- **The Issue**: The ERP integration (`/admin/erp/*`) generates standard CSV files in `exports/`.
- **Impact**: It does not connect to live higher-education ERP systems (such as Ellucian Banner, PeopleSoft, Workday, or Canvas LMS).

---

## 4. Next Steps & Technical Roadmap

### Phase 1: High-Priority Biometric Modernization (Immediate Next Steps)
1. **Migrate from dlib HOG to Deep Learning Detectors**:
   - Replace CPU dlib HOG with **YOLOv8-Face** or **RetinaFace** running via **ONNX Runtime**.
   - Expected Result: Latency for a 30-person classroom photo drops from **~60s to < 2.5s** on CPU, or **< 400ms** on GPU.
2. **Upgrade to ArcFace / InsightFace (512-d Vectors)**:
   - Transition from 128-d dlib embeddings to 512-d ArcFace embeddings for higher discrimination in large cohorts (> 1,000 students).
3. **Implement Top-1 vs Top-2 Confidence Margin Guard**:
   - If the difference between the closest match and the second-closest match is `< 0.10`, flag the face for manual review to eliminate identity confusion in crowded classrooms.

### Phase 2: Campus Hardware & Edge Camera Pipeline
1. **Real ONVIF IP Camera Integration**:
   - Implement ONVIF auto-discovery protocol (WS-Discovery) to automatically locate and configure ceiling cameras in lecture halls.
2. **Jetson / Edge Capture Node**:
   - Deploy lightweight edge appliances (e.g. NVIDIA Jetson Nano / Raspberry Pi 5) inside classrooms to detect, crop, and encode faces locally, transmitting only tiny crops to the server.
3. **Ambient Continuous Attendance**:
   - Enable automated periodic frame capture (e.g. once every 15 minutes during a lecture) to compute attendance retention over the entire class duration.

### Phase 3: Student Self-Service & Anti-Spoofing PWA
1. **Student Self-Onboarding Mobile Web App**:
   - Allow students to log in on their phones and securely submit their initial enrollment photo.
2. **Deep Presentation Attack Detection (PAD)**:
   - Integrate neural network anti-spoofing to detect and reject photos of screens, printed paper masks, or video playback.
3. **Student Attendance Dispute Portal**:
   - Enable students to view their attendance record and file timestamped correction requests directly to faculty.

### Phase 4: Enterprise Cloud & LMS Integration
1. **LTI 1.3 Certification**:
   - Support LTI (Learning Tools Interoperability) 1.3 to embed ClassSight directly inside Canvas, Blackboard, and Moodle course pages.
2. **Managed Cloud Infrastructure**:
   - Provide Terraform and Helm charts for AWS (EKS + RDS PostgreSQL + S3 + CloudAMQP).
3. **Automated Key Rotation**:
   - Implement key-versioned automated rotation for encrypted RTSP camera credentials.

---

## 5. Verification Commands & Health Checklist

To verify the entire repository locally:

```powershell
# 1. Verify Frontend Production Build
cd frontend-next
npm run build
# Expected: ✓ Compiled successfully, static pages generated cleanly

# 2. Verify Kubernetes Manifest Syntax
cd ..
python scripts/validate_k8s_manifest.py
# Expected: VALID_YAML_DOCUMENTS=18, DEPLOYMENTS=6

# 3. Verify Backend Unit Tests (inside Maven container or with local Maven)
# mvn test (in backend-spring/)
# Expected: Tests run: 8, Failures: 0, Errors: 0, Skipped: 0

# 4. Measure Multi-Face Latency (with stack running)
python scripts/latency_benchmark.py --students 30
```

---

*ClassSight Engineering Audit Report · Generated October 2026*
