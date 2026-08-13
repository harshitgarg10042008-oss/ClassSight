# ClassSight

ClassSight is a classroom attendance system composed of a Spring Boot application, a FastAPI face-recognition service, and PostgreSQL. It supports individual enrollment, group-photo recognition, persisted attendance sessions, teacher review, analytics/PDF reporting, local ERP CSV export, and browser or RTSP-simulated capture.

## Verified Docker setup

Prerequisites are Docker Engine with Compose support. From the repository root, copy the environment template and start the stack:

```bash
cp .env.example .env
docker compose up --build -d
curl http://localhost:8080/health
curl http://localhost:8000/health
```

The expected health responses are JSON objects with `status` equal to `UP`. The Spring service uses port 8080, the face service uses port 8000, and PostgreSQL uses port 5432. The Spring image includes FFmpeg for camera-frame capture. The repository contains `data/captures/.gitkeep` and `data/erp-exports/.gitkeep` so bind-mounted storage paths exist in clean clones.

The backend now uses Flyway migrations with Hibernate validation. Fresh databases receive `V1__baseline.sql`, `V2__status_constraints.sql`, and `V3__enrollment_consent.sql`; existing development databases are baselined without deleting their data. The live verification used PostgreSQL 15 and confirmed preservation of prior students and attendance sessions.

## Authentication and protected flows

Seeded development credentials are `admin/admin123` and `teacher/teacher123`; change them before any deployment. Login uses `usernameOrEmail`:

```bash
curl -sS -X POST http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"usernameOrEmail":"admin","password":"admin123"}'
```

State-changing requests require CSRF protection. Obtain a token from authenticated `GET /csrf`, then send its value in the `X-XSRF-TOKEN` header together with the cookie jar. Enrollment and capture require ADMIN or TEACHER. Administrative CRUD, retention, ERP, and camera-management endpoints require ADMIN.

## Enrollment and recognition

Enrollment requires a real single-face image and explicit consent:

```bash
curl -X POST http://localhost:8080/students/{rollNumber}/enroll \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-XSRF-TOKEN: $CSRF_TOKEN" \
  -F 'photo=@/path/to/student_photo.jpg;type=image/jpeg' \
  -F 'consentGiven=true'
```

The service rejects missing, non-image, oversized, undecodable, zero-face, and multi-face enrollment images. It persists `consent_given`, `consented_at`, and `consented_by` with the student embedding. Group recognition uses a separate image and returns distances, calibrated display confidence, match status, face-size ratio, and quality warnings. Recognition follows the dlib distance boundary: a face is matched only when `distance < 0.6` by default.

## Testing

The backend can be compiled and tested in the Maven builder image:

```bash
docker run --rm -v "$PWD/backend-spring:/app" -w /app \
  maven:3.9-eclipse-temurin-17 mvn -B test
```

The FastAPI service can be tested locally after installing its requirements:

```bash
cd face-service-fastapi
pip install -r requirements.txt
pytest -q
```

The real golden-set regression and A4 benchmark are run from the repository root:

```bash
python3 golden-set/run-regression.py
python3 docs/a4-benchmark/benchmark_cpu.py
```

The A4 benchmark measured **244.22 ms mean** for one CPU face embedding and **100,040.47 ms mean** for a six-face group-photo detection plus recognition call on the current environment. This is a performance baseline, not a 30-person classroom validation; the six-face call supports considering downscaling, a lighter detector, batching, or GPU inference before deployment at classroom scale.

## Privacy and security

Raw capture retention is configurable with `PRIVACY_RETENTION_DAYS` and defaults to 30 days. The scheduled job deletes expired raw files while preserving attendance sessions, embeddings, and decisions. Admins can trigger a controlled verification run with `POST /admin/privacy/retention/run`. See [PRIVACY.md](PRIVACY.md) and [docs/security.md](docs/security.md).

Camera URLs are limited to RTSP and reject local, private, link-local, multicast, and cloud-metadata destinations. The system has AES-GCM credential encryption but does not yet provide automated key-versioned credential rotation; the manual re-encryption limitation is documented.

## Documentation

See [docs/camera-deployment.md](docs/camera-deployment.md) for real RTSP deployment guidance, [docs/erp-mapping.md](docs/erp-mapping.md) for the provisional ERP adapter boundary, [docs/architecture.md](docs/architecture.md) for the component diagram, [docs/known-limitations.md](docs/known-limitations.md) for unresolved real-world limitations, and [docs/final-push-log.md](docs/final-push-log.md) for live verification evidence.
