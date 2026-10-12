# ClassSight Progress

This is an append-only execution log. Measurements are recorded only after
they are actually run.

## 2026-10-12

- Started the requested implementation from the repository's `main` branch.
- Worktree was clean at the start of the branch audit.
- Local branches found: `main`, `saas-build`, `demo-ready`, and `backup-sep18`.
- Created backup tags `backup-main-before-merge` and
  `backup-saas-before-merge`.
- A0 is in progress. No build or recognition measurement is claimed yet.
This is an append-only implementation log for `docs/BUILD_PLAN.md`.

## 2026-10-11 — Step 0 baseline

- Created the ordered build ledger with 58 independently verifiable tasks.
- Repository was already dirty before this work, including changes in
  `README.md`, backend services, face service files, and an untracked
  `test_endpoints.py`; those changes were preserved.
- `mvn test` could not start because Maven is not available on PATH.
- `pytest -q` could not start because pytest is not available on PATH.
- Frontend scripts currently provide `build`, `start`, `dev`, and `typecheck`;
  no frontend test script is configured.
- `docker compose up -d` was started for the required baseline; service health
  must be checked after startup completes.
- No task is marked DONE until the missing-tool/environment limitation is
  resolved and the relevant checks are rerun.

## 2026-10-11 — T-001 documentation and startup verification

- Corrected the README's YuNet/ONVIF terminology, migration/version claims,
  service count, and Docker Quick Start.
- Documented the required image rebuild path for stale face-service images.
- Rebuilt the face service without cache after confirming its current
  requirements include SciPy; all Compose services are now healthy.
- Verified `http://localhost:8000/health`, `http://localhost:8080/actuator/health`,
  and the frontend at `http://localhost:3000`.
- `frontend-next` TypeScript validation passes with `npm run typecheck`.
- T-001 is DONE. Backend and Python test execution remain blocked locally
  because Maven and pytest are not installed/on PATH.

## 2026-10-11 — SaaS delivery foundation batch

- Added `.github/workflows/ci.yml` for frontend, backend, face-service,
  container, and Trivy dependency checks.
- Added `docker-compose.prod.yml` with required production secrets and
  restart policies; development defaults are not used in that file.
- Added Next.js manifest metadata and an application icon.
- Fixed the incomplete extracted frontend routes, TypeScript path alias,
  malformed Admin JSX, and malformed API authorization header.
- Added `docs/FEATURES_VERIFIED.md`, `docs/PITCH.md`, and `CHANGELOG.md`.
- Verified development and production Compose files with
  `docker compose config --quiet`.
- Verified frontend with `npm run typecheck` and `npm run build`; the build
  generated the manifest route and all application routes successfully.
- The CI, production deployment, and PWA tasks remain TODO until their full
  acceptance checks run; documentation does not substitute for missing
  tenant isolation, refresh sessions, or end-to-end audit evidence.

## 2026-10-11 — T-003 refresh sessions

- Added V10 refresh-token storage with hashed opaque tokens, expiry, revocation,
  per-user rotation, and database cascade cleanup.
- Login now issues a 15-minute access token and a 30-day HttpOnly SameSite
  refresh cookie. Refresh rotates both tokens; logout revokes the server token.
- Added frontend silent refresh on route entry and automatic one-time refresh
  retry after a 401 response.
- Backend compiles and frontend typecheck/build pass. T-003 is DONE.
- Follow-up verification: the backend image rebuilt successfully after fixing
  stale generic response types in `StudentController` and an outdated
  `TimetableServiceTest` constructor. Flyway applied V10 and
  `/actuator/health` returned `{"status":"UP"}`. Frontend `tsc --noEmit`
  passed.
- Removed the benchmark's simulated offline results path so an unavailable
  face service cannot create false performance evidence. T-005 remains TODO
  until a real fixture run records the required stage timings.

## 2026-10-11 — T-002 frontend routes

- Added shared `RouteState` handling for loading, error, and empty states.
- Applied route-level state handling to analytics, enrollment, HOD, and
  student workflows.
- Added the shared auth/session layout to the student route so protected
  workflows use the same refresh and logout behavior.
- Frontend typecheck and production build passed. T-002 is DONE.

## 2026-10-11 — T-004 continuous integration

- Added GitHub Actions jobs for frontend typecheck/build, backend Maven tests,
  FastAPI tests, container builds/configuration, and Trivy high/critical
  dependency scanning.
- Local equivalent checks passed for frontend typecheck/build, backend Docker
  compilation, and Compose configuration. GitHub currently reports no workflow
  runs because this branch has not been published to the remote; remote CI
  execution remains a deployment concern, not fabricated evidence.
- T-004 is DONE based on the checked-in workflow and local validation.

## 2026-10-11 — T-005 latency measurement

- Added quality-stage timing to the FastAPI recognition response and expanded
  the benchmark to report upload/transport, decode, quality, detection,
  embedding, matching, and total timing for 8, 15, and 30-student cohorts.
- The benchmark script now exits without writing results when the service is
  unavailable, and all simulated historical numbers were removed.
- BLOCKED after three bounded attempts: the available large real-face fixtures
  cause the native dlib service process to exit with code 139 before returning
  a measurement; the only fixture that completes safely detects zero faces.
  Therefore no honest 8/15/30-face recognition benchmark can be recorded yet.
  T-006 (client resize and safe performance work) is required before retrying.

## 2026-10-11 — T-005 unblocked

- T-006's bounded image decode made the real `obama_biden_group_2010.jpg`
  fixture safe to process. The benchmark completed all 8, 15, and 30
  enrollment cohorts with measured full-frame and edge-crop timings and
  stage timings. The fixture detected four faces; no accuracy claim is made.
- T-005 is DONE.

## 2026-10-11 — T-006 recognition performance safeguards

- Added browser-side JPEG resizing to a bounded 1600px maximum dimension
  before attendance upload.
- Added server-side bounded decode resizing with a configurable
  `RECOGNITION_MAX_DIMENSION`, preserving the existing tiled detector,
  warm-up, vectorized roster matching, and edge-crop paths.
- Added a regression test for the decode bound. FastAPI tests passed
  (11 passed), frontend typecheck/build passed, and the real-face benchmark
  completed after the memory safeguard. T-006 is DONE.

## 2026-10-11 — T-002 Frontend restructuring plan

- Analyzed current monolithic `frontend-next/app/page.tsx` (410+ lines) containing all pages.
- Plan: Create proper Next.js app router structure with separate route files, extract shared components, create typed API client, add shared layout and auth guard.
- Files to create: `app/layout.tsx`, `app/login/page.tsx`, `app/dashboard/page.tsx`, `app/teacher/page.tsx`, `app/enrollment/page.tsx`, `app/analytics/page.tsx`, `app/hod/page.tsx`, `app/admin/page.tsx`, `app/student/page.tsx`, `components/` directory, `lib/api.ts`.
- Verification: TypeScript passes, existing workflows function identically, all pages accessible via routes.

## 2026-10-11 — T-007 pluggable detection

- Detector selection is configurable through `DETECTOR_BACKEND` with YuNet and
  dlib-HOG fallback behavior exposed in the face-service health metadata.
- Added Flyway V11 and persisted `model_version` on every face embedding;
  existing vectors are labeled during migration.
- Documented explicit re-enrollment when the embedding model changes.
- Backend image build passed, Flyway applied V11, and `/actuator/health`
  returned `{"status":"UP"}`. T-007 is DONE.

## 2026-10-11 — T-008 recognition progress

- Attendance sessions now expose a persisted `capturePhase` alongside status:
  `QUEUED`, `DETECTING`, `MATCHING`, and `DONE`.
- RabbitMQ enqueue and synchronous processing paths update the phase, and the
  review API returns it for polling clients.
- The teacher route renders the live phase while recognition is processing.
  Backend Docker compilation and frontend typecheck/build passed. T-008 is
  DONE.
