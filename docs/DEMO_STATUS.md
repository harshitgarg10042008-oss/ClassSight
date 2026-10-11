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

## Step 1 - Seeded-teacher flow

Status: **DONE**

Verified in the running browser app with `teacher/teacher123`:

1. Selected the seeded Room 101 and CS201 / TEST-SEC-A assignment.
2. Uploaded the repository fixture classroom image.
3. Recognition returned `REVIEW_REQUIRED`.
4. Manually corrected the low-confidence student to **Present**.
5. Finalized the session successfully as `FINALIZED`.

The first large upload returned HTTP 500 because the face service process
exited during dlib processing. A server-side image-dimension cap was added and
the same flow then completed successfully.

## Step 2 - Quick Class Enrollment

Status: **IN PROGRESS**

Implemented and verified:

- Teacher Enrollment now opens on a Quick Class Enrollment screen.
- A class photo is sent through the authenticated backend proxy to the face
  service.
- Detected faces are numbered `Demo-01`, `Demo-02`, and so on, with an image
  overlay, quality warnings, and per-face removal.
- A mandatory consent checkbox gates the demo-face enrollment action.
- The reviewed crops can be enrolled as demo students through the existing
  consented single-enrollment endpoint.
- Face-service processing is capped at 1024px on the longest image dimension
  for stable dlib operation. A direct detection run measured 674ms for the
  repository four-face fixture; this is a measured fixture result, not a
  30-face benchmark.

Still pending for Step 2: assignment-specific section linkage, duplicate
matching/merge warnings, MinIO thumbnail persistence, multi-photo batching,
and editable names/roll numbers from the quick-enrollment grid.

## Pending steps

- Steps 3-7: results, measured speed, demo helpers, automated scenario, and
  clean-start final audit.

## Final audit

Status: **DONE WITH LIMITATIONS**

- `docker compose down` followed by `docker compose up -d --build` completed.
- All six application/infrastructure containers reported healthy.
- Backend tests passed in the Maven container.
- Frontend `npm run typecheck` and production build passed.
- Direct face detection passed on the four-face repository fixture. Two
  measured runs were 674ms and 775ms total; these are not 30-face benchmarks.
- The original seeded-teacher capture/review/finalize flow was rechecked.

Not completed in this pass: a fully automated API demo scenario, duplicate
merge warnings, MinIO-backed quick-enrollment thumbnails, assignment-specific
quick-enrollment linkage, and a measured 30-face before/after benchmark.
Those items remain explicitly unclaimed rather than being represented as
finished.
