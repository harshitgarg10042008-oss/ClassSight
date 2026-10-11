# ClassSight Demo Status

Last updated: 2026-10-11

## Scope

This document tracks the focused teacher-demo readiness work on `main`. The
earlier SaaS roadmap is out of scope for this effort. Login behavior is
unchanged.

## Step 0 - Baseline

Status: **DONE**

The Docker Compose stack was rebuilt and started successfully on `main`.

| Service | Result |
| --- | --- |
| PostgreSQL | Healthy |
| RabbitMQ | Healthy |
| MinIO | Healthy |
| FastAPI face service | Healthy |
| Spring Boot backend | Healthy; `/actuator/health` returned `{"status":"UP"}` |
| Next.js frontend | Healthy on `http://localhost:3000` |

### Baseline checks

- Backend tests: **passed** in a Maven 3.9 / Temurin 17 container.
- Frontend TypeScript check: **passed** after removing stale generated `.next`
  output from an earlier branch.
- Frontend production build: **passed**.
- Face-service test suite: no test files are present on `main`; no result is
  claimed. The runtime image was rebuilt and its health endpoint is healthy.

### Fixes required to reach a healthy baseline

- Added the missing `scipy==1.11.4` runtime dependency used by the face-service
  matching implementation.
- Parameterized the finalized attendance-session enum in the student portal
  repository query.
- Replaced unsupported fully-qualified enum literals in class-session JPQL
  queries with the repository's persisted enum values.
- Marked the full dependency constructors of timetable, recognition, and
  analytics services with `@Autowired`; Spring otherwise selected no usable
  constructor and the backend exited during startup.

## Pending steps

- Step 1: verify the seeded-teacher flow end to end.
- Step 2: implement Quick Class Enrollment.
- Steps 3-7: results, measured speed, demo helpers, automated scenario, and
  clean-start final audit.
