# ClassSight Build Plan

Status values: `TODO`, `IN PROGRESS`, `DONE`, and `BLOCKED`. A task is
`DONE` only after its acceptance checks are run and recorded in
[`PROGRESS.md`](./PROGRESS.md).

## Tier A — Demo

- [ ] **A0 — Consolidating branches** — TODO
  - Branches and worktree are audited.
  - Backup tags for `main` and the saas branch exist.
  - The selected consolidation builds and passes the baseline tests.
- [ ] **A1 — Establishing a clean baseline** — TODO
  - All services build from Docker Compose.
  - Backend and face-service tests pass.
  - Health checks and existing demo flows are verified.
- [ ] **A2 — Improving small-face recognition** — TODO
  - Per-face diagnostics and annotated captures are available.
  - Camera resolution, enrollment coverage, and weak-face review are visible.
  - Synthetic 40/60/80/120 px measurements are recorded honestly.
- [ ] **A3 — Adding quick class enrollment** — TODO
  - A class photo can be uploaded or captured.
  - Detected faces can be reviewed, removed, and enrolled in a linked demo section.
  - Consent and retention rules remain enforced.
- [ ] **A4 — Adding test recognition** — TODO
  - Test recognition reports every enrolled student and every detected face.
  - Manual corrections and unknown-face assignment persist as test data only.
  - Test sessions never affect real attendance or analytics.
- [ ] **A5 — Completing results and review** — TODO
  - Results show thumbnails, labels, status, and confidence.
  - Absent students and diagnostics are clearly exposed.
  - Manual override and finalization continue to work.
- [ ] **A6 — Measuring recognition speed** — TODO
  - Recognition returns upload/decode/quality/detection/embedding/matching/total timings.
  - A measured 30-face benchmark is recorded before and after safe optimizations.
  - Recall is not reduced by an optimization.
- [ ] **A7 — Providing demo helpers** — TODO
  - Demo reset removes only demo data and captures.
  - The demo guide and scenario script work with synthetic or consented images.
  - The core attendance scenario asserts the expected absences.
- [ ] **A8 — Passing the Tier A gate** — TODO
  - A fresh Compose rebuild succeeds.
  - The full relevant test suite and demo scenario pass.
  - README and verification records contain measured results.

## Tier B — Public Pages and Accounts

- [ ] **B1 — Adding public pages and teacher registration** — TODO
  - Home, registration, legal, help, contact, about, error, and 404 pages exist.
  - Registration approval and rejection with a reason are enforced.
  - DPDP/privacy language is marked for institutional legal review.
- [ ] **B2 — Hardening authentication flows** — TODO
  - Refresh survives a browser reload through an httpOnly cookie.
  - Password reset, first-login change, rate limiting, and lockout work.
  - Demo credentials are gated by `DEMO_MODE`.
- [ ] **B3 — Adding administration** — TODO
  - Admins can manage users, roles, activation, and password reset.
  - Pending registrations are visible and actionable.
  - Unauthorized users cannot access admin operations.

## Tier C — Product Gaps and Quality

- [ ] **C1 — Adding management screens** — TODO
- [ ] **C2 — Adding missed-class reminders** — TODO
- [ ] **C3 — Adding leave and substitution handling** — TODO
- [ ] **C4 — Adding audit-log viewing and export** — TODO
- [ ] **C5 — Adding optional two-capture attendance** — TODO
- [ ] **C6 — Adding pluggable anti-spoofing** — TODO
- [ ] **C7 — Adding graceful manual degraded mode** — TODO
- [ ] **C8 — Adding provider-based notifications** — TODO
- [ ] **C9 — Adding attendance dashboards** — TODO
- [ ] **C10 — Applying security hardening** — TODO
- [ ] **C11 — Adding consent and data-rights workflows** — TODO
- [ ] **C12 — Adding reliability, metrics, and backup tooling** — TODO
- [ ] **C13 — Expanding trustworthy automated tests** — TODO
- [ ] **C14 — Evaluating optional multi-tenant SaaS features** — TODO

## Final audit

- [ ] **F1 — Running a fresh-clone audit** — TODO
  - Compose, tests, demo scenario, benchmark, and small-face test are rerun.
  - `README.md`, `DEMO_GUIDE.md`, and `FEATURES_VERIFIED.md` are current.
  - Branches and backup tags are confirmed intact.
