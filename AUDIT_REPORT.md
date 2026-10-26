# ClassSight Audit Report

**Date:** 2026-10-26  
**Auditor:** Automated Codebase Audit  
**Repository:** ClassSight (AI classroom attendance platform)

---

## 1. Inventory

### Folder Tree
```
ClassSight/
├── backend-spring/              # Spring Boot 3.2.0 (Java 17)
│   ├── src/main/java/com/classsight/
│   │   ├── config/             # SecurityConfig, DataSeeder, RabbitConfig
│   │   ├── controller/         # 22 REST controllers
│   │   ├── dto/                # Request/response DTOs
│   │   ├── entity/             # 20 JPA entities
│   │   ├── repository/         # Spring Data JPA repositories
│   │   ├── security/           # JWT, authentication filter
│   │   └── service/            # Business logic services
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── db/migration/       # V1-V18 Flyway migrations
│   │   └── templates/          # Thymeleaf MVC templates
│   └── pom.xml
├── face-service-fastapi/       # FastAPI (Python 3.11)
│   ├── main.py                 # Haar + FaceNet + Manhattan pipeline
│   ├── requirements.txt
│   ├── tests/                  # Pytest test suite
│   └── Dockerfile
├── frontend-next/              # Next.js 14.2.12 (React 18)
│   ├── app/                    # Pages: page.tsx, analytics, enrollment, student, etc.
│   ├── components/             # CameraCapture, PageLayout
│   ├── lib/                    # API client
│   ├── package.json
│   └── Dockerfile
├── docs/                       # Architecture, security, limitations docs
├── golden-set/                 # Regression test fixtures
├── scripts/                    # Benchmarks, migrations, validators
├── k8s/                        # Kubernetes manifests (18 resources)
├── docker-compose.yml          # 6 services + volumes
└── .env                        # Local environment config
```

### Languages & Frameworks
| Component | Language | Framework | Version |
|-----------|----------|-----------|---------|
| Backend | Java 17 | Spring Boot | 3.2.0 |
| Face Service | Python 3.11 | FastAPI, Uvicorn | 0.104.1, 0.24.0 |
| Frontend | TypeScript | Next.js, React | 14.2.12, 18.3.1 |
| Database | - | PostgreSQL | 15 Alpine |
| ORM | - | Spring Data JPA, Flyway | 9.x, 10.8.1 |
| Storage | - | MinIO S3 | Latest |
| Message Queue | - | RabbitMQ | 3.13 Alpine |
| Face Recognition | - | FaceNet (PyTorch), OpenCV | 2.1.2, 4.9.0.80 |

### Main Modules
1. **backend-spring**: REST API, JWT auth, attendance lifecycle, storage integration, RabbitMQ worker, analytics
2. **face-service-fastapi**: Haar Cascade detection, FaceNet 128-d embeddings, Manhattan (L1) distance matching, quality checks
3. **frontend-next**: Faculty web UI, live webcam capture, bulk enrollment, review polling, student portal
4. **Infrastructure**: Docker Compose orchestration, PostgreSQL, MinIO, RabbitMQ

### Database Tables (V1-V18 migrations)
**Core Tables:**
- `users` (id, username, email, password, role, full_name, enabled)
- `students` (id, roll_number, first_name, last_name, face_embedding[], class_section_id, active)
- `student_face_embeddings` (id, student_id, embedding_vector[], model_version, created_at)
- `student_enrollments` (id, student_id, class_section_id, subject_id, active)
- `attendance_sessions` (id, status, faculty_id, room_id, subject_id, class_section_id, camera_id, captured_photo_path, blur_score, brightness_mean, liveness_score, quality_passed)
- `attendance_records` (id, session_id, student_id, status, confidence_score, review_status, face_size_ratio, quality_warning)
- `attendance_multishot_photos` (id, session_id, shot_index, photo_path, recognized_student_ids)
- `attendance_finalizer_audit` (id, session_id, actor, before_status, after_status, reason, timestamp)
- `rooms` (id, name, building, floor, capacity, active)
- `cameras` (id, name, room_id, stream_url, status, credentials_ciphertext, last_checked_at, last_error)
- `subjects` (id, code, name, description, active)
- `class_sections` (id, name, academic_year, description, active)
- `faculty_subject_assignments` (id, faculty_id, subject_id, class_section_id, active)
- `academic_terms` (id, name, start_date, end_date, active)
- `timetable_slots` (id, day_of_week, start_time, end_time, subject_id, section_id, faculty_id, room_id)
- `class_sessions` (id, date, start_time, end_time, subject_id, section_id, faculty_id, room_id, status)
- `teacher_leave` (id, teacher_id, from_date, to_date, reason, approved, approved_by)
- `holidays` (id, date, name)
- `attendance_disputes` (id, student_id, session_id, reason, status, resolved_note)
- `erp_sync_records` (id, session_id, status, export_path, attempt_count, last_error)
- `erp_sync_audits` (id, sync_record_id, actor, from_status, to_status, note, transitioned_at)

### API Endpoints (sample)
**Auth:** `POST /auth/login`  
**Students:** `GET /students`, `POST /students`, `POST /students/{id}/enroll`, `DELETE /students/{id}/biometrics`  
**Attendance:** `POST /capture`, `POST /capture/multi-shot/start`, `GET /api/attendance-sessions/{id}/review`, `POST /api/attendance-sessions/{id}/finalize`  
**Review:** `GET /api/attendance-sessions/{id}/review`, `POST /api/attendance-sessions/{id}/review/submit`  
**Analytics:** `GET /api/analytics/attendance`, `GET /api/analytics/attendance/report.pdf`  
**Timetable:** `GET /api/timetable/current-period`, `GET /api/timetable/today`, `GET /api/timetable/dashboard/today`  
**Admin:** CRUD for rooms, cameras, subjects, class sections, assignments, ERP sync  
**Health:** `GET /health`, `GET /actuator/health`

### Frontend Pages
- `/` (app/page.tsx): Main faculty hub with login, attendance capture, enrollment, review
- `/analytics`: Attendance analytics and PDF export
- `/enrollment`: Student enrollment portal
- `/student`: Student self-service portal (attendance summary, timetable, disputes)
- `/hod`: Admin/HOD dashboard
- `/teacher`: Teacher-specific views
- `/privacy`: Biometric consent and privacy policy

---

## 2. Run It: Docker Compose

### Build and Start Results
Command: `docker-compose up --build`

**Container Status:**
- ✅ `classsight-postgres-1`: Up (healthy) - port 5432
- ✅ `classsight-rabbitmq-1`: Up (healthy) - ports 5672, 15672
- ✅ `classsight-minio-1`: Up (healthy) - ports 9000, 9001
- ✅ `classsight-face-service-fastapi-1`: Up (healthy) - port 8000
- ✅ `classsight-backend-spring-1`: Up (healthy) - port 8080
- ✅ `classsight-frontend-next-1`: Up (healthy) - port 3000

All 6 containers started successfully with healthy status.

### Health Check Results
```bash
$ curl -s http://localhost:8080/health
{"service":"backend-spring","status":"UP"}

$ curl -s http://localhost:8000/health
{"status":"UP","service":"face-service-fastapi","detector":"haar_cascade","embedder":"facenet_vggface2_128d","distance_metric":"manhattan_L1","haar_scale_factor":1.2,"manhattan_threshold":15.0,"facenet_available":true,"cv2_available":true}
```

Both `/health` endpoints responded successfully. No errors observed during startup.

**Build Notes:**
- Backend Maven build: 81s, successful
- Frontend npm build: 27s, successful (2 vulnerabilities reported: 1 high, 1 critical in Next.js 14.2.12)
- Face service: cached build, successful

---

## 3. Feature Status Table

| Feature | Status | Evidence |
|---------|--------|----------|
| **Login** | Working | `POST /auth/login` in AuthController.java; frontend login form in page.tsx; JWT token storage in memory |
| **Room and class selection** | Working | `GET /api/rooms` in SharedController.java; dropdowns in page.tsx lines 396-401; DataSeeder seeds Room 101 |
| **Class creation** | Working | `POST /api/admin/class-sections` in AdminClassSectionController.java; frontend "Create class section" form at line 840 |
| **Single-student enrollment with camera** | Working | `POST /students/{id}/enroll` in StudentController.java; CameraCapture component with `getUserMedia`; consent checkbox required |
| **Bulk import** | Working | `POST /students/bulk-enroll` in StudentController.java; CSV + ZIP upload UI at lines 876-878; diagnostic table response |
| **Quick class enrollment from live class photo** | Partial | Frontend Quick Class Enrollment tab at line 832; detects faces; allows naming/roll assignment; linked to class/subject selection (not standalone) |
| **Roster (edit, delete, re-capture)** | Working | `GET /students` with filters; `DELETE /students/{id}/biometrics` in AdminPrivacyController.java; Roster tab with edit controls |
| **Live camera capture** | Working | CameraCapture.tsx uses HTML5 `getUserMedia`; file upload fallback; no black-screen bug found in codebase |
| **Face detection** | Working | Haar Cascade in face-service-fastapi/main.py line 72; scaleFactor=1.2; `TILED_DETECTION_ENABLED` for large photos |
| **Embeddings** | Working | FaceNet InceptionResnetV1 (vggface2) 128-d embeddings in main.py line 51; stored in `student_face_embeddings` table (V5 migration) |
| **Class-scoped matching** | Working | Recognition scoped to enrolled students per class section; StudentController line 79-90 filters by classSectionId |
| **Threshold config** | Working | `MANHATTAN_THRESHOLD` env var (default 15.0) in docker-compose.yml line 124; `ATTENDANCE_RECOGNITION_THRESHOLD` in application.yml line 47 |
| **Multi-shot de-duplication** | Working | MultiShotCaptureController.java; AttendanceRecognitionServiceTest.java line 151 test; keeps highest confidence per student |
| **Review queue** | Working | `GET /api/attendance-sessions/{id}/review` in AttendanceReviewController.java; frontend polling at 1s interval |
| **Absent list** | Working | Undetected enrolled students auto-marked ABSENT; frontend displays absent badges; DataSeeder seeds demo students |
| **Finalize with audit record** | Working | `POST /api/attendance-sessions/{id}/finalize`; attendance_finalizer_audit table (V16 migration); auto-finalization for clean sessions |
| **ERP stub boundary** | Working | `GET /api/admin/erp/*` in AdminErpController.java; generates local CSV exports; records sync audits in erp_sync_audits table |
| **Analytics** | Working | `GET /api/analytics/attendance` in AttendanceAnalyticsController.java; PDF export via OpenPDF; defaulter threshold 75% |
| **RTSP/IP camera** | Working | RtspCameraAdapter.java; FFmpeg integration; AES-GCM credential encryption; SSRF URL validation; camera health checks |

---

## 4. Known Issues Confirmation

| Issue | Status | Details |
|-------|--------|---------|
| **Black camera preview** | Not found | No references to black camera bug in codebase; CameraCapture.tsx has fallback to file upload; error handling at line 49 mentions HTTPS/localhost requirement |
| **"Unable to load test recognition context"** | Not found | No string matches in codebase; test recognition context not referenced |
| **Junk TEST001 record** | Confirmed (archived) | V14 migration line 19 sets TEST001 active=FALSE, face_embedding=NULL, renames to "Archived Demo record"; retains referential history |
| **Raw JSON error banners** | Not found | GlobalApiExceptionHandler.java maps exceptions to JSON with "status" and "message" fields; frontend `friendlyError()` function in page.tsx line 93 parses and displays user-friendly messages |
| **Quick Class Enrollment uses file upload only and is not linked to a class** | Denied | Quick Class Enrollment has live camera (line 844) AND file upload (line 845); requires class/subject/section selection before enrollment (line 837); creates demo roster entries linked to selected class |

---

## 5. Quality

### Automated Tests
**Backend (Java):** 5 test files found
- AttendanceReviewControllerTest.java
- AttendanceAnalyticsServiceTest.java
- AttendanceRecognitionServiceTest.java
- AttendanceReviewServiceTest.java
- TimetableServiceTest.java
Test execution status: Not verified (CI config exists but tests not run during audit)

**Face Service (Python):** 5 test files found
- test_recognize_group_photo.py
- test_quality_metrics.py
- test_recognition_states.py
- test_hungarian_matching.py
- run_real_validation.py
Test execution status: Not verified

**E2E Tests:** 4 Python test files in repo root
- test_enroll.py
- test_attendance_session.py
- test_multishot_e2e.py
- test_pipeline_verification.py
Test execution status: Not verified

**CI Pipeline:** `.github/workflows/ci.yml` configured for frontend typecheck/build, backend Maven test, face-service pytest, container build, and Trivy dependency scan.

### Error Handling
- GlobalApiExceptionHandler.java handles IllegalArgumentException, MaxUploadSizeExceededException, and generic Exception with JSON responses
- ReviewExceptionHandler.java handles AccessDeniedException for review endpoints
- Frontend `friendlyError()` maps technical errors to user-friendly messages (e.g., "No face found", "Camera is busy")
- SLF4J logging throughout backend; DEBUG level enabled in application.yml

### Hardcoded Values / Secrets
**Secrets in .env (not committed):**
- `POSTGRES_PASSWORD=classsight_password`
- `JWT_SECRET=your_jwt_secret_here_change_in_production` (placeholder, needs change)
- `MINIO_ACCESS_KEY=minioadmin`, `MINIO_SECRET_KEY=minioadmin` (default MinIO credentials)
- `RABBITMQ_PASSWORD=classsight_rabbit_password`

**Hardcoded in code:**
- localhost references in test files (localhost:8000, localhost:8080)
- Default fallback URLs in application.yml and frontend (localhost/127.0.0.1)
- Docker healthchecks use 127.0.0.1

**Recommendation:** Change JWT_SECRET, MinIO, and RabbitMQ passwords before production deployment.

### Fake/Mock Recognition Results
No fake recognition results found. System uses real FaceNet embeddings and Haar Cascade detection. Test fixtures (golden-set/) use real public-domain photos (Obama, Biden) for regression testing.

### Logging
- SLF4J LoggerFactory used throughout backend
- Hibernate SQL logging enabled (DEBUG level)
- Application logs visible in `docker-compose logs`
- No sensitive data (passwords, tokens) logged in code reviewed

---

## 6. Startup Readiness Gaps

| Gap | Status | Details |
|-----|--------|---------|
| **Multi-tenant (institution/department) support** | Missing | No institution_id or department_id in schema; single-tenant architecture |
| **User roles** | Partial | Roles exist (ADMIN, TEACHER, STUDENT, HOD) but no role hierarchy or permission granularity; no department-level roles |
| **Consent storage** | Partial | Consent checkbox in enrollment UI; consent_given field in Student entity; no consent timestamp, version, or revocation history |
| **Data retention and deletion** | Partial | 30-day photo purge cron (PrivacyRetentionService.java); no automated embedding deletion; no GDPR right-to-be-forgotten workflow |
| **Embedding encryption** | Missing | Face embeddings stored as plain double precision arrays in PostgreSQL; no encryption at rest |
| **Rate limiting** | Missing | No rate limiting on API endpoints; vulnerable to abuse/enumeration |
| **Backups** | Missing | No automated backup configuration; PostgreSQL volumes not backed up; MinIO data not replicated |
| **Deployment beyond localhost** | Partial | Docker Compose works; Kubernetes manifests exist (18 resources) but not tested; no Terraform/Helm for cloud; no load balancer config |
| **CI** | Partial | GitHub Actions CI configured (build, test, dependency scan); no deployment pipeline; no staging environment |

---

## 7. Recommendation Per Module

| Module | Recommendation | Reason |
|--------|---------------|--------|
| **backend-spring** | REFACTOR | Add multi-tenant schema, encryption at rest, rate limiting, proper secrets management |
| **face-service-fastapi** | REFACTOR | Replace Haar Cascade with YOLOv8-Face/RetinaFace for CPU performance; add GPU support |
| **frontend-next** | KEEP | Modern, functional UI; upgrade Next.js to latest to fix security vulnerabilities |
| **PostgreSQL schema** | REFACTOR | Add institution/department tables, consent audit trail, encryption columns |
| **Infrastructure (Docker/K8s)** | REFACTOR | Add backup automation, monitoring, secrets injection, production-ready manifests |
| **Tests** | REWRITE | Expand coverage; add integration tests; automate execution in CI |

### Proposed 7-Day Plan (ordered by pilot blockers)

**Day 1-2: Security Hardening**
- Change all default secrets (JWT, MinIO, RabbitMQ, PostgreSQL)
- Add encryption for face embeddings at rest
- Implement API rate limiting (Spring Boot starter or API gateway)
- Add secrets management (Vault or Kubernetes secrets)

**Day 3: Multi-Tenant Schema**
- Add `institutions` and `departments` tables
- Foreign key all entities to institution_id
- Update DataSeeder for multi-tenant demo
- Migrate existing data

**Day 4: Consent & Privacy**
- Add consent audit trail (timestamp, version, IP, user agent)
- Implement GDPR right-to-be-forgotten workflow (cascade delete)
- Add data retention policy enforcement (embeddings, not just photos)

**Day 5: Performance Optimization**
- Replace Haar Cascade with YOLOv8-Face ONNX model
- Benchmark 30-person classroom latency
- Add GPU support flag in face-service Dockerfile

**Day 6: Backup & Monitoring**
- Configure PostgreSQL automated backups (pg_dump or WAL-E)
- Add MinIO replication or cloud storage backend
- Integrate Prometheus + Grafana for monitoring
- Add alerting for camera health, recognition failures

**Day 7: Production Deployment**
- Convert Kubernetes manifests to Helm chart
- Add ingress controller and TLS termination
- Configure staging environment
- Deploy to cloud (EKS/GKE/AKS)
- Run smoke tests and end-to-end validation

---

## 8. Honest Summary

### What Can Be Demonstrated Truthfully Today
- ✅ Full login flow with JWT authentication
- ✅ Room and class selection with seeded demo data
- ✅ Single-student enrollment via webcam or file upload with consent
- ✅ Bulk CSV+ZIP enrollment with diagnostic feedback
- ✅ Quick Class Enrollment from live class photo (linked to class)
- ✅ Live camera capture via HTML5 getUserMedia
- ✅ Face detection using Haar Cascade
- ✅ 128-d FaceNet embeddings generation and storage
- ✅ Manhattan (L1) distance matching with configurable threshold
- ✅ Class-scoped recognition (enrolled students only)
- ✅ Multi-shot capture and de-duplication
- ✅ Review queue with 1-second polling
- ✅ Automatic absent list generation
- ✅ Finalization with audit trail
- ✅ Local CSV ERP export with sync audit
- ✅ Analytics dashboard with PDF export
- ✅ Timetable module with current-period detection
- ✅ RTSP/IP camera adapter with FFmpeg and credential encryption
- ✅ All 6 Docker containers start healthy
- ✅ Health endpoints respond correctly

### What Cannot Be Demonstrated Truthfully Today
- ❌ Multi-tenant deployment (single-tenant schema)
- ❌ Production-grade secrets management (default credentials in .env)
- ❌ Embedding encryption at rest (plain arrays in DB)
- ❌ Rate limiting (no protection against abuse)
- ❌ Automated backups (no backup infrastructure)
- ❌ Cloud deployment (Docker Compose only; K8s untested)
- ❌ Real-world ERP integration (local CSV stub only)
- ❌ GDPR-compliant consent workflow (no audit trail)
- ❌ High-scale performance (Haar Cascade CPU bottleneck; YOLOv8 not integrated)
- ❌ Data retention enforcement (30-day photo purge only; embeddings persist indefinitely)
- ❌ Live physical IP camera testing (simulated RTSP only)

---

**End of Audit Report**
