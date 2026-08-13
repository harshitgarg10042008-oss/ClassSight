# ClassSight

ClassSight is a classroom attendance platform that combines face recognition, attendance review, analytics, local ERP export, camera capture, object storage, and an additive faculty web interface. The current repository contains a Spring Boot API and server-rendered application, a FastAPI recognition service, a Next.js faculty flow, PostgreSQL persistence, MinIO object storage, and RabbitMQ-based asynchronous recognition.

> **Local development note:** the current Docker Compose file intentionally uses host networking. Docker Desktop must be running in Linux-container mode, and the required host ports must be available. The production default remains synchronous recognition; RabbitMQ asynchronous recognition is feature-flagged.

## Technology stack

| Layer | Technology | Role |
|---|---|---|
| Faculty frontend | Next.js 14, React 18, TypeScript, CSS | Additive room-selection, assignment-selection, capture, polling review, and finalization flow on port `3000`. |
| Existing frontend | Spring Boot MVC, Thymeleaf, server-rendered pages | Existing login, room, subject, capture, review, analytics, and administrative pages. These pages remain in place. |
| Application backend | Java 17, Spring Boot 3.x, Spring Security, Spring Data JPA | Authentication, authorization, attendance sessions, review decisions, analytics, ERP export, camera management, retention, and REST APIs. |
| Database | PostgreSQL 15 | Users, rooms, cameras, students, embeddings, classes, assignments, attendance sessions, records, audit data, and ERP sync state. |
| Database migrations | Flyway | Versioned schema migrations and Hibernate schema validation. |
| Recognition service | Python 3.11, FastAPI, Uvicorn | Image validation, quality/liveness checks, face detection, dlib/`face_recognition` embeddings, recognition, and RabbitMQ worker processing. |
| Recognition libraries | `face_recognition`, dlib, OpenCV/Pillow-compatible image tooling | Face detection, embedding generation, crop processing, and image validation. |
| Object storage | MinIO, S3-compatible API, AWS SDK for Java | Durable captured-photo storage in the `classsight-captures` bucket. |
| Messaging | RabbitMQ 3.13 with management UI, Spring AMQP, Pika | Feature-flagged asynchronous capture-recognition transport with durable capture, result, and dead-letter queues. |
| Media/camera support | FFmpeg, RTSP camera adapter | Camera-frame extraction and browser/RTSP capture support. |
| ERP integration | Local CSV provider | Provisional local export and persisted sync workflow; no real ERP vendor delivery is configured. |
| Packaging and runtime | Docker, Docker Compose | Local orchestration of the backend, recognition service, database, MinIO, RabbitMQ, and Next.js frontend. |
| Testing and analysis | Maven, pytest, Python scripts, golden-set regression, benchmark scripts | Unit tests, API tests, recognition regressions, performance measurement, migration verification, and the edge-detection spike. |
| Local Kubernetes assets | Kubernetes YAML manifests, k3s/k3d-compatible layout | Local-only deployment attempt; cloud deployment is not included. |

## Current architecture

The normal synchronous flow is:

```text
Browser / Thymeleaf / Next.js
          |
          v
Spring Boot API :8080
     |       |        \
     |       |         \-- PostgreSQL :5432
     |       \------------ MinIO S3 API :9000
     \-------------------- FastAPI recognition :8000
```

When asynchronous recognition is enabled, Spring stores the capture in MinIO and publishes a message to RabbitMQ. The FastAPI worker retrieves the MinIO object, runs the existing recognition algorithm, publishes the result, and Spring applies the existing attendance and review business rules.

```text
Spring Boot -> RabbitMQ capture queue -> FastAPI worker -> RabbitMQ result queue -> Spring Boot
                         |                                      |
                         +------------ MinIO object ------------+
```

## Repository structure

```text
ClassSight/
├── backend-spring/                 Spring Boot API, MVC pages, security, JPA, Flyway
│   ├── src/main/java/              Controllers, services, entities, repositories, configuration
│   ├── src/main/resources/         application.yml and migration resources
│   ├── Dockerfile
│   └── pom.xml
├── face-service-fastapi/           FastAPI recognition and RabbitMQ worker
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
├── frontend-next/                  Additive Next.js faculty flow
│   ├── app/page.tsx                Login, selection, capture, polling review, finalization
│   ├── app/globals.css             Frontend styling
│   ├── package.json
│   └── Dockerfile
├── golden-set/                     Real recognition regression photos and regression runner
├── scripts/                        Migration, edge-spike, and Kubernetes validation utilities
├── k8s/                            Local-only Kubernetes manifests
├── docs/                           Architecture, security, walkthroughs, benchmarks, and upgrade evidence
├── data/captures/                  Local bind-mounted legacy/intermediate capture area
├── exports/                        Local ERP CSV output directory
├── docker-compose.yml              Local multi-service orchestration
├── .env.example                    Local environment template
├── PRIVACY.md                      Privacy and retention policy
└── README.md                       This document
```

## Requirements

Install the following before starting the stack:

| Requirement | Recommended version |
|---|---|
| Docker Desktop | Current release with Linux containers and Compose v2 |
| Git | Current release |
| RAM | At least 8 GB recommended for the dlib-based FastAPI image build |

Docker Desktop is the only required runtime for the normal local start. Java, Maven, Python, and Node.js are provided inside the service images for the Compose path.

## Start locally

### Windows PowerShell

From inside the cloned repository, with Docker Desktop running:

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
curl.exe http://127.0.0.1:8080/health
```

Do not type the PowerShell prompt itself. Use `curl.exe`, not `curl`, to avoid PowerShell alias behavior.

### Linux or macOS

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
curl -fsS http://127.0.0.1:8080/health && echo
```

The first build may take several minutes because the FastAPI image installs dlib and other recognition dependencies.

## Local services and URLs

| Service | URL/port | Purpose |
|---|---|---|
| Next.js faculty frontend | [http://localhost:3000](http://localhost:3000) | New additive faculty flow. |
| Spring Boot application | [http://localhost:8080/login](http://localhost:8080/login) | Existing Thymeleaf application and REST API. |
| Spring health | `http://localhost:8080/health` | Backend readiness check. |
| FastAPI health | `http://localhost:8000/health` | Recognition-service readiness check. |
| PostgreSQL | `localhost:5432` | Application database. |
| RabbitMQ AMQP | `localhost:5672` | Asynchronous recognition transport. |
| RabbitMQ management | [http://localhost:15672](http://localhost:15672) | Queue inspection. |
| MinIO S3 API | `http://localhost:9000` | Captured-photo object storage. |
| MinIO console | [http://localhost:9001](http://localhost:9001) | Bucket/object inspection. |

Check all Compose services with:

```bash
docker compose ps
docker compose logs --tail=100 backend-spring
docker compose logs --tail=100 face-service-fastapi
docker compose logs --tail=100 frontend-next
```

## Local credentials

The seeded development credentials are:

| Account | Username | Password | Role |
|---|---|---|---|
| Administrator | `admin` | `admin123` | Administrative CRUD, ERP, retention, and camera operations. |
| Faculty | `teacher` | `teacher123` | Faculty capture, enrollment, review, and attendance operations. |
| MinIO | `minioadmin` | `minioadmin` | Local object-storage console/API access. |
| RabbitMQ | `classsight` | `classsight_rabbit_password` | Local AMQP and management access. |

Change all example credentials and the JWT secret before any non-local deployment.

## Configuration

Copy `.env.example` to `.env` and adjust values only when needed. The most important settings are:

| Variable | Default | Meaning |
|---|---|---|
| `RECOGNITION_MODE` | `sync` | `sync` preserves the existing blocking recognition flow; `async` uses RabbitMQ. |
| `RABBITMQ_WORKER_ENABLED` | `false` | Enables the FastAPI RabbitMQ worker when set to `true`. |
| `ATTENDANCE_CAPTURE_STORAGE_BACKEND` | `minio` | Selects the object-storage-backed capture implementation. |
| `MINIO_BUCKET` | `classsight-captures` | MinIO bucket for captured photos. |
| `ATTENDANCE_RECOGNITION_THRESHOLD` | `0.6` | Existing recognition threshold; infrastructure work does not change it. |
| `QUALITY_BLUR_THRESHOLD` | `30.0` | Image-quality blur threshold. |
| `QUALITY_MIN_BRIGHTNESS` | `35.0` | Minimum accepted image brightness. |
| `QUALITY_MAX_BRIGHTNESS` | `220.0` | Maximum accepted image brightness. |

## Authentication and API security

Login uses the `usernameOrEmail` field:

```bash
curl -sS -X POST http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"admin","password":"admin123"}'
```

State-changing requests require CSRF protection. Authenticated clients must obtain `GET /csrf`, retain the returned cookie, and send the token value as `X-XSRF-TOKEN`. Enrollment and capture require an authenticated administrator or teacher. Administrative CRUD, ERP, retention, and camera-management endpoints require an administrator.

## Main application flows

### Faculty flow

The Next.js faculty flow supports login, room selection, subject/class assignment selection, real image upload, review polling, review decisions, and finalization. The existing Thymeleaf pages remain available and are not replaced.

### Enrollment

Enrollment requires a real single-face image and explicit consent:

```bash
curl -X POST http://localhost:8080/students/{rollNumber}/enroll \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
  -F 'photo=@/path/to/student_photo.jpg;type=image/jpeg' \
  -F 'consentGiven=true'
```

The service rejects missing, non-image, oversized, undecodable, zero-face, and multi-face enrollment images.

### Recognition and review

A captured photo is stored in MinIO under an object key. The review endpoint streams the photo from MinIO and preserves the original content type and response behavior:

```text
GET /api/attendance-sessions/{sessionId}/review
GET /api/attendance-sessions/{sessionId}/review/photo
POST /api/attendance-sessions/{sessionId}/review
```

### ERP export

The ERP integration is intentionally a provisional local CSV provider. It validates and exports finalized attendance locally but does not deliver to a real ERP vendor:

```text
POST /admin/erp/validate
POST /admin/erp/export
POST /admin/erp/sync
GET  /admin/erp/status?fileName=...
```

### Camera capture

Browser capture and RTSP camera capture are supported. Camera URLs are validated and reject local, private, link-local, multicast, and cloud-metadata destinations. See [docs/camera-deployment.md](docs/camera-deployment.md) before configuring a real camera.

## Synchronous and asynchronous recognition

Synchronous recognition is the default:

```bash
# .env
RECOGNITION_MODE=sync
RABBITMQ_WORKER_ENABLED=false
```

To enable the additive RabbitMQ path locally:

```bash
# .env
RECOGNITION_MODE=async
RABBITMQ_WORKER_ENABLED=true
```

Then recreate the services:

```bash
docker compose up -d --build face-service-fastapi backend-spring
docker compose logs -f face-service-fastapi backend-spring
```

Inspect durable queues:

```bash
docker exec classsight-rabbitmq-1 rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

Return to the normal mode with:

```bash
# .env
RECOGNITION_MODE=sync
RABBITMQ_WORKER_ENABLED=false

docker compose up -d backend-spring face-service-fastapi
```

## Testing and verification

Run Spring tests in the Maven builder image:

```bash
docker run --rm -v "$PWD/backend-spring:/app" -w /app --network host \
  maven:3.9-eclipse-temurin-17 mvn -B test
```

Run FastAPI tests in the built service image:

```bash
docker run --rm -v "$PWD/face-service-fastapi:/app" -w /app --network host \
  classsight-face-service-fastapi:latest pytest -q
```

Run the golden-set regression and CPU benchmark from the repository root:

```bash
python3 golden-set/run-regression.py
python3 docs/a4-benchmark/benchmark_cpu.py
```

The standalone edge-detection spike requires the recognition dependencies and enrolled embeddings. Run it with the complete container-based command in [docs/local-startup-runbook.md](docs/local-startup-runbook.md), rather than invoking the script on a bare host. It detects and crops faces locally, compares the live recognition endpoint on full frames versus individual crops, writes measurements to `docs/edge-spike/results.json`, and does not modify production capture flow.

Validate the Kubernetes manifest syntax:

```bash
python3 scripts/validate_k8s_manifest.py
```

The Kubernetes assets are local-only. They are not a cloud deployment configuration.

## Storage and migration

MinIO is started with a persistent named volume and an automatic bucket-init container. Legacy local captures can be migrated with the hash-verifying script:

```bash
bash scripts/migrate-captures-to-minio.sh
```

The migration script updates database object keys only after verifying the uploaded object hash. Original local files should be retained until migration verification is complete.

## Data and privacy

PostgreSQL schema changes are managed by Flyway migrations. Raw capture retention is configurable and defaults to 30 days. The scheduled retention process removes expired raw captures while preserving attendance sessions, embeddings, and decisions. See [PRIVACY.md](PRIVACY.md), [docs/security.md](docs/security.md), and [docs/known-limitations.md](docs/known-limitations.md).

## Stop and reset the local stack

Stop the stack while preserving named volumes:

```bash
docker compose down
```

Start it again later:

```bash
docker compose up -d
```

Remove containers and all named volumes, including local Postgres, MinIO, and RabbitMQ data, only when you intentionally want a complete reset:

```bash
docker compose down -v
```

## Known limitations

The current project still has several deliberate limitations. The recognition-performance investigation identified a major multi-face latency bottleneck, but no final production optimization direction has been selected. The edge-detection spike shows substantial bandwidth savings but does not prove crop recognition is behaviorally equivalent for every face. Item 3’s implementation is build- and API-verified but still needs an interactive browser click-through. Item 5 contains local Kubernetes manifests, but a working local cluster runtime is required for live deployment and scaling verification. Real classroom-photo coverage, a real IP camera, and a real ERP vendor contract remain unresolved.

## Documentation index

| Document | Purpose |
|---|---|
| [PRIVACY.md](PRIVACY.md) | Privacy and retention policy. |
| [docs/architecture.md](docs/architecture.md) | Component architecture and system boundaries. |
| [docs/security.md](docs/security.md) | Authentication, authorization, CSRF, and security behavior. |
| [docs/camera-deployment.md](docs/camera-deployment.md) | RTSP camera deployment guidance. |
| [docs/erp-mapping.md](docs/erp-mapping.md) | Provisional ERP adapter boundary. |
| [docs/known-limitations.md](docs/known-limitations.md) | Unresolved production limitations. |
| [docs/infra-upgrade-log.md](docs/infra-upgrade-log.md) | Evidence and status for the five infrastructure upgrades. |
| [k8s/classsight.yaml](k8s/classsight.yaml) | Local-only Kubernetes manifests. |
