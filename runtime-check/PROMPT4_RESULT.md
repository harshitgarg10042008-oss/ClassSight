# Prompt 4 Result

## 1. Overall status

Branch: `demo-fixes`. Overall: **PARTIAL / DEMO-READY FOR VERIFIED PATHS**. Docker, health checks, backend tests, face-service tests, root harnesses, RTC API scenarios, reset idempotency, and a Playwright login smoke test passed. Full 30-face enrollment/capture, 30-face latency, three-seed absent composites, and the complete browser workflow remain NOT VERIFIED.

## 2. Phase table

| Phase | Result | Evidence |
|---|---|---|
| P0 Re-verify | PASS with NOT VERIFIED items | `logs/p0-health.log`, `logs/p0-pytest.log`, `logs/p0-maven-pass.log`, `logs/p0-api-scenarios.log` |
| P1 Group-photo enrollment | IMPLEMENTED; live 30-face check NOT VERIFIED | Existing Quick Class Enrollment in `frontend-next/app/page.tsx` |
| P2 Retake/review | PASS for API scenarios | `logs/p0-api-scenarios.log` |
| P3 Reset/start | PASS | `scripts/demo.py`, `DEMO_RUNBOOK.md`, `logs/p3-reset-1.log`, `logs/p3-reset-2.log` |
| P4 Browser E2E | PASS for login/dashboard smoke; full workflow NOT VERIFIED | `logs/p4-browser-smoke.log`, `SCREENSHOTS.md` |
| P5 Wrap-up | IN_PROGRESS at report generation | `PROMPT4_PROGRESS.md` |

## 3. Verified numbers

All public-photo numbers are **simulated on LFW, NOT classroom accuracy**.

* Detector: `mtcnn`; `T_auto=7.75`, `M=1.5`, `T_review=9.4924`.
* Test class AUTO: 88.00%, Wilson 95% CI 80.19%–93.00%.
* Test outsider AUTO: 0.00%, Wilson 95% CI 0.00%–3.70%.
* Wrong-identity AUTO: 0/6000, 0.00%.
* Face-service tests: 17 passed, 4 warnings.
* Maven tests: 24 passed, 0 failures, 0 errors, 0 skipped.
* Root scripts: enrollment PASS; corrected attendance PASS; multishot PASS; pipeline PASS; authenticated Spring enrollment PASS.
* RTC API: all 3 present PASS; one removed is `ABSENT_CANDIDATE` PASS; outsider is UNKNOWN and never AUTO-present PASS.
* Auto-finalize: single-shot attendance remains `REVIEW_REQUIRED` until faculty review. Multi-shot explicit finalise can finalize clean accumulators.
* 30-face composite results for three seeds: **NOT VERIFIED**; the existing script stopped on invalid room/camera/assignment.
* 30-face MTCNN latency median/p95 and stage breakdown: **NOT VERIFIED**; the existing script failed before embedding.

## 4. UI checks

| Check | Result |
|---|---|
| Quick Class Enrollment camera path | NOT VERIFIED end-to-end; existing flow is present |
| No nameless/TEST001 roster rows | NOT VERIFIED in browser |
| No-face friendly banner and clear-on-next-action | NOT VERIFIED; backend exact banner: `No face found. Move closer and face the camera.` |
| Consent checkbox next to label | NOT VERIFIED in browser; existing Quick Class flow requires consent |
| Black-frame luminance/std-dev | NOT VERIFIED |
| Browser console errors | PASS in login/dashboard smoke: 0 |
| Screenshots | 2 files; manifest: `runtime-check/SCREENSHOTS.md` |

The smoke browser used fake media permission flags. Real webcam behavior is NOT VERIFIED.

## 5. Reset, re-enrollment, and start

`REENROL_LIST.md` contains 1 preserved non-RTC_ student: TEST001 / Test Student. No real student was changed. `scripts/demo.py reset` creates an ignored PostgreSQL dump, archives RTC_/DEMO_ records, and was run twice; the second run deleted nothing. Start with:

```text
python scripts/demo.py up
```

Demo login: `teacher` / `teacher123`; frontend: `http://localhost:3000`.

## 6. Open / NOT VERIFIED

* Full 30-face Quick Class Enrollment API check.
* Three-seed 30-face retake with exactly five absent.
* Full Playwright fake-webcam flow through enrollment, capture, review, finalize, and retake.
* Black-frame metrics and real webcam behavior.
* 30-face latency budget measurement.
* Native 512-d cosine comparison.
* Exact production re-enrollment of TEST001.

## Appendix A — RECOGNITION_UPGRADE.md

The complete prior report is copied below.

# Recognition Upgrade Report

Date: 2026-11-06
Branch: `demo-fixes`
Accuracy disclaimer: every LFW result below is simulated on LFW and is **not classroom accuracy**.

## 1. Final test results

The identity split is [split_manifest.json](./split_manifest.json), generated with seed 42. Identities, rather than images, were split 50/50. Genuine pairs are capped at 10 per identity. The final MTCNN test run used 200 random 30-student rosters and 100 distinct class and outsider probe identities.

| Test metric | Result | 95% Wilson CI |
|---|---:|---:|
| Genuine pair distance, n=303 | mean 5.87 | not a proportion |
| Impostor pair distance, n=2500 | mean 12.55 | not a proportion |
| EER | 1.69% | not computed as a proportion CI |
| Class AUTO, n=100 identities | 88.00% | 80.19%–93.00% |
| Class REVIEW, n=100 identities | 11.00% | 6.25%–18.63% |
| Class UNKNOWN, n=100 identities | 1.00% | 0.18%–5.45% |
| Wrong-identity AUTO, 0/6000 assignments | 0.00% | 0.00%–0.06% |
| Outsider AUTO, n=100 identities | 0.00% | 0.00%–3.70% |
| Outsider REVIEW, n=100 identities | 18.00% | 11.70%–26.67% |
| Outsider UNKNOWN, n=100 identities | 82.00% | 73.33%–88.30% |

Final parameters: `DETECTOR=mtcnn`, `T_auto=7.75`, `M=1.5`, and `T_review=9.4924`.

## 2. Calibration results and sweep

The calibration run selected `(T_auto=7.75, M=1.5)` subject to outsider AUTO <=1% and wrong-identity AUTO = 0. The selected calibration result was class AUTO 92.67% and outsider AUTO 0.95%. The full sweep is [sweep_mtcnn.csv](./sweep_mtcnn.csv); the embedding cache is [emb_cache_mtcnn.npz](./emb_cache_mtcnn.npz).

## 3. Detector decision

Calibration-half benchmark results:

| Detector | Mean detection at 60/80/120 px | False positives/image | Median image latency |
|---|---:|---:|---:|
| Haar | 45.00% | 0.00 | 44.5 ms |
| YuNet | 99.00% | 0.00 | 134.4 ms |
| MTCNN | 100.00% | 0.00 | 313.3 ms |

MTCNN was selected by the fixed rule. Haar and YuNet remain selectable via `DETECTOR`.

## 4. Code changes and rollback

* `0e121ed` — baseline scripts, split manifest, and Haar calibration.
* `a22adb3` — tiered AUTO/REVIEW/UNKNOWN decision and backend mapping.
* `8e75c47` — detector plumbing and MTCNN selection.
* `31eb3eb` — MTCNN recalibration, API verification, and face-service tests.
* `a2efb98` — Hungarian assignment and documentation.

Rollback to `before-recognition-upgrade` and set:

```text
DETECTOR=haar
MANHATTAN_THRESHOLD=15.0
MANHATTAN_AUTO_ACCEPT=15.0
MATCH_MARGIN=0.0
ATTENDANCE_RECOGNITION_THRESHOLD=15.0
```

One non-RTC_ student was found during the detector switch: `TEST001`, Test Student; it was not deleted or modified.

## 5. Auto-finalize audit

No attendance session can reach `FINALIZED` from recognition alone in the current single-shot path. `AttendanceRecognitionService` sets `requiresReview = true` for `ATTENDANCE` sessions before choosing the status, so a faculty review call is required. Multi-shot `finalise` can set `FINALIZED` when the accumulator contains no `REVIEW` or `PENDING` records.

## 6. Verification and cleanup

Face-service tests passed 17 tests. Python syntax compilation and `docker compose config` passed. Prior live RTC verification covered three enrolled students, one removed student, and an outsider; the outsider was not AUTO-present. Cleanup verified zero remaining `RTC_` students and sections while preserving seed `TEST001` and `TEST-SEC-A`.

## 7. Not verified and remaining risks

Native 512-d cosine versus projected 128-d L1 comparison was not run. LFW is not a classroom dataset; small-face and camera-domain performance can differ materially. CPU MTCNN latency remains the main scale risk for 30-face captures. Detector changes require re-enrollment because crop geometry changes the stored embeddings.

## Appendix B — ClassSight_Working_Rules.md

not found
