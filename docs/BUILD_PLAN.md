# ClassSight SaaS Build Plan

Status values are `TODO`, `IN PROGRESS`, `DONE`, and `BLOCKED`. A task is only
marked `DONE` when its acceptance checks have been run and recorded in
`docs/PROGRESS.md`.

## Phase 0 — Foundations

- [x] **T-001 — Fixing documentation and startup instructions** — DONE  
  Acceptance: README ports, dependencies, YuNet description, environment
  variables, and Quick Start match the repository; a clean startup path is
  documented and verified.
- [x] **T-002 — Splitting the frontend into routes and shared components** — DONE  
  Acceptance: existing workflows remain reachable through typed API calls;
  route-level loading, error, empty, and auth-guard states are tested.
- [x] **T-003 — Persisting refresh sessions securely** — DONE  
  Acceptance: reload silently refreshes a short-lived access token; logout
  invalidates the refresh session and clears the secure httpOnly cookie.
- [x] **T-004 — Adding continuous integration** — DONE  
  Acceptance: CI runs backend, face service, frontend type/build checks,
  Docker builds, and dependency vulnerability scanning.

## Phase 1 — Speed and accuracy

- [x] **T-005 — Measuring recognition latency** — DONE  
  Acceptance: the benchmark measures 8, 15, and 30 faces with upload, decode,
  quality, detection, embedding, matching, and total timings; results are
  reproducible and printed as a before/after table.
- [x] **T-006 — Reducing recognition latency** — DONE  
  Acceptance: client resize, warm-up, tiled detection, roster matching, and
  safe parallelism are implemented; benchmark results are recorded honestly.
- [ ] **T-007 — Making face detection pluggable** — TODO  
  Acceptance: detector selection is environment-configurable; model versions
  are persisted and migration/re-enrollment behavior is documented.
- [ ] **T-008 — Streaming recognition progress** — TODO  
  Acceptance: async captures expose queued, detecting, matching, and done
  states; the UI renders progress and resolved faces without blocking.
- [ ] **T-009 — Building recognition evaluation tooling** — TODO  
  Acceptance: labelled evaluation reports accuracy, FAR, and FRR; the golden
  set is consented/synthetic and the report contains measured values only.

## Phase 2 — Public site, accounts, and legal

- [ ] **T-010 — Adding the public landing page** — TODO  
  Acceptance: public home content, feature summary, privacy promise, Login,
  and Register actions are accessible without authentication.
- [ ] **T-011 — Adding teacher registration approval** — TODO  
  Acceptance: registration validates institutional fields and consent, starts
  pending, and Admin/HOD can approve/reject with a persisted reason.
- [ ] **T-012 — Adding email verification and password recovery** — TODO  
  Acceptance: verification, forgot/reset, change-password, and first-login
  password change work with configurable SMTP and a dev mail catcher.
- [ ] **T-013 — Hardening login behavior** — TODO  
  Acceptance: rate limiting and cooldown lockout are enforced; demo quick-fill
  credentials appear only when `DEMO_MODE=true`.
- [ ] **T-014 — Publishing legal and help pages** — TODO  
  Acceptance: privacy, terms, biometric consent, cookie, help, contact,
  about, 404, and error pages exist with institution-review disclaimers.
- [ ] **T-015 — Managing users as Admin** — TODO  
  Acceptance: Admin can list, invite, deactivate, reset passwords, and change
  roles with authorization and audit coverage.

## Phase 3 — Quick Class Enrollment

- [ ] **T-016 — Implementing quick class photo enrollment** — TODO  
  Acceptance: a photo detects faces, displays numbered boxes/thumbnails,
  permits deletion, and creates labelled students in a selected section.
- [ ] **T-017 — Recording enrollment consent** — TODO  
  Acceptance: enrollment cannot proceed without the mandatory consent
  confirmation and the consent text/version/timestamp are stored.
- [ ] **T-018 — Supporting multi-photo enrollment and deduplication** — TODO  
  Acceptance: multiple batches/reference photos are supported and duplicate
  candidates offer merge or skip without data loss.
- [ ] **T-019 — Showing student thumbnails throughout the product** — TODO  
  Acceptance: roster, review, results, and absent views show the stored
  thumbnail and fallback state.
- [ ] **T-020 — Completing student identity later** — TODO  
  Acceptance: a teacher can attach a real name and roll number to a demo
  label with validation and audit history.
- [ ] **T-021 — Enforcing enrollment quality gates** — TODO  
  Acceptance: blur, brightness, size, and tilt failures produce a clear
  per-face warning or rejection reason.
- [ ] **T-022 — Adding demo reset and guided demo tools** — TODO  
  Acceptance: Demo mode reset purges only demo data and the guided script
  covers enrollment, capture, correction, and results.
- [ ] **T-023 — Improving the attendance result screen** — TODO  
  Acceptance: results show absent thumbnails/labels, totals, unknowns, and
  measured processing time.

## Phase 4 — Academic management

- [ ] **T-024 — Completing academic CRUD** — TODO  
  Acceptance: departments, programs, sections, subjects, rooms, teachers,
  students, terms, and holidays have validated API/UI CRUD and soft delete.
- [ ] **T-025 — Managing student mappings and lifecycle** — TODO  
  Acceptance: section/subject mapping, batches/electives, promotion, transfer,
  deactivation, deletion, and re-enrollment are supported and audited.
- [ ] **T-026 — Adding bulk CSV import** — TODO  
  Acceptance: valid rows import transactionally and invalid rows return a
  downloadable per-row error report.
- [ ] **T-027 — Adding teacher assignment and workload views** — TODO  
  Acceptance: assignments have duplicate/conflict validation and workload is
  visible to authorized users.
- [ ] **T-028 — Improving timetable editing** — TODO  
  Acceptance: slots can be dragged, moved, and conflict-highlighted without
  permitting invalid overlaps.

## Phase 5 — Attendance depth

- [ ] **T-029 — Detecting missed classes** — TODO  
  Acceptance: scheduled classes without capture appear in an admin list and
  generate teacher reminders.
- [ ] **T-030 — Supporting two-capture attendance** — TODO  
  Acceptance: start/end captures classify late arrivals and early leavers
  while preserving the existing single-capture path.
- [ ] **T-031 — Completing leave and condonation workflows** — TODO  
  Acceptance: leave types, approval, condonation, and percentage calculations
  are covered by role-aware tests.
- [ ] **T-032 — Polishing disputes and audit logs** — TODO  
  Acceptance: edit lock windows, complete who/what/when/why logs, filters,
  and export are available.
- [ ] **T-033 — Adding pluggable liveness checks** — TODO  
  Acceptance: the configured liveness stage flags suspicious faces, has a
  documented fallback, and makes no unsupported anti-spoof claims.
- [ ] **T-034 — Supporting multiple cameras and degraded mode** — TODO  
  Acceptance: camera health is visible; manual attendance remains available
  with a clear banner and failed recognition can be queued for retry.

## Phase 6 — SaaS multi-tenancy

- [ ] **T-035 — Adding tenant isolation** — TODO  
  Acceptance: business tables have tenant ownership via new migrations and
  automated tests prove cross-tenant reads/updates/deletes are impossible.
- [ ] **T-036 — Adding institution onboarding** — TODO  
  Acceptance: an institution can self-sign up, create its first admin, import
  core data, and complete a test capture.
- [ ] **T-037 — Adding the super-admin console** — TODO  
  Acceptance: authorized super-admins can inspect, suspend, and restore
  tenants without tenant users gaining those privileges.
- [ ] **T-038 — Adding plans, limits, and billing abstraction** — TODO  
  Acceptance: student/capture limits and feature flags are metered per tenant;
  billing uses a stub provider with no real keys.
- [ ] **T-039 — Adding per-tenant settings** — TODO  
  Acceptance: recognition, quality, retention, defaulter, grace, and branding
  settings are validated and applied only within their tenant.
- [ ] **T-040 — Adding API keys and webhooks** — TODO  
  Acceptance: scoped API keys, signed outbound webhook events, and OpenAPI
  documentation are available.
- [ ] **T-041 — Adding tenant export and deletion** — TODO  
  Acceptance: export is complete and tenant deletion purges relational and
  object data with an auditable confirmation.

## Phase 7 — Analytics, notifications, and access

- [ ] **T-042 — Adding role-specific analytics dashboards** — TODO  
  Acceptance: department, teacher, subject, and student dashboards include
  trends, heatmaps, and early-warning lists.
- [ ] **T-043 — Adding scheduled reports** — TODO  
  Acceptance: PDF and Excel reports can be scheduled and delivered through a
  provider abstraction.
- [ ] **T-044 — Adding notification templates and inbox** — TODO  
  Acceptance: absence, defaulter, leave, dispute, and missed-class events
  render templated email/in-app notifications; SMS/WhatsApp remain stubs.
- [ ] **T-045 — Making the portals installable and responsive** — TODO  
  Acceptance: teacher/student portals support mobile capture, PWA install,
  and accessible dark/light themes.

## Phase 8 — Security and privacy

- [ ] **T-046 — Completing the consent ledger and data rights** — TODO  
  Acceptance: consent withdrawal, view/export, correction, biometric erase,
  and approval flow are available and logged.
- [ ] **T-047 — Adding retention and embedding expiry** — TODO  
  Acceptance: a scheduled, tenant-configurable job purges eligible photos and
  optional embeddings with an auditable result.
- [ ] **T-048 — Encrypting embeddings at rest** — TODO  
  Acceptance: AES-GCM encryption uses an environment key, supports rotation,
  and logs every biometric read without logging biometric contents.
- [ ] **T-049 — Hardening transport and uploads** — TODO  
  Acceptance: HTTPS proxy, security headers, strict CORS/CSRF, upload type and
  size validation, and env-only secrets are verified.
- [ ] **T-050 — Adding governance and disaster recovery docs/tools** — TODO  
  Acceptance: grievance and breach registers, DPIA, PostgreSQL/MinIO backup,
  and a tested restore procedure exist.

## Phase 9 — Reliability and quality

- [ ] **T-051 — Adding observability and idempotent retries** — TODO  
  Acceptance: request IDs, structured logs, readiness/liveness, Prometheus
  metrics, capture retries, and dead-letter handling are verified.
- [ ] **T-052 — Completing the test pyramid** — TODO  
  Acceptance: unit/integration/Playwright flows cover core roles and a
  10-concurrent-capture load/failure test is reproducible.
- [ ] **T-053 — Repairing the golden-set regression test** — TODO  
  Acceptance: the archival test is retired or corrected and the trusted suite
  is green with its data provenance documented.

## Phase 10 — Productization

- [ ] **T-054 — Seeding and resetting a clean demo tenant** — TODO  
  Acceptance: one command creates 30 synthetic students, teachers, timetable,
  leave data, and safely resets only demo records.
- [ ] **T-055 — Adding onboarding and public documentation** — TODO  
  Acceptance: in-app tour/checklist and admin, teacher, student, privacy,
  security, API, and FAQ documentation are published.
- [ ] **T-056 — Preparing production deployment artifacts** — TODO  
  Acceptance: production Docker Compose, refreshed Kubernetes manifests,
  documented `.env.example`, changelog, and version tag are consistent.
- [ ] **T-057 — Writing an honest product pitch** — TODO  
  Acceptance: `docs/PITCH.md` explains positioning, limitations, and pilot
  plan without invented customers, revenue, or market claims.

## Final audit

- [ ] **T-058 — Running the fresh-clone final audit** — TODO  
  Acceptance: clean startup, complete automated suite, demo scenario,
  benchmark/evaluation, security checklist, and verified-feature inventory
  are run and recorded with no fabricated results.
