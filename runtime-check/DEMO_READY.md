# ClassSight Demo Readiness

Status: **Ready for the verified faculty workflow; partial for the full college demo protocol.**

Verified:

* Docker Compose build/start and both health endpoints.
* 17 face-service tests and 24 Maven tests.
* Enrollment, attendance, multishot, pipeline, and authenticated Spring harnesses.
* RTC all-present, absent-candidate, and outsider-not-AUTO scenarios.
* Idempotent demo reset with ignored PostgreSQL backup.
* Playwright login/dashboard smoke with fake media flags and 0 console errors.

Not verified:

* Full 30-face enrollment/capture and three-seed retake.
* 30-face latency budget and stage breakdown.
* Full Playwright faculty workflow and real webcam behavior.
* Black-frame metrics and TEST001 re-enrollment.

Start:

```text
python scripts/demo.py up
```

Commit: `dd92f86` before this report-only commit. Use [DEMO_RUNBOOK.md](../DEMO_RUNBOOK.md) for the live steps.
