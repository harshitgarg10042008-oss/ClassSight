# Recognition Upgrade Report

Date: 2026-11-06  
Branch: `demo-fixes`  
Accuracy disclaimer: every LFW result below is simulated on LFW and is **not classroom accuracy**.

## 1. Final test results — primary pre-review result

These are the raw recognition tiers before faculty review. They are the
primary honest result for the demo: REVIEW remains an absent candidate and
UNKNOWN is not accepted.

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

Final parameters: `DETECTOR=mtcnn`, `T_auto=7.75`, `M=1.5`, and `T_review=9.4924`. The raw test command was:

```text
python runtime-check/calibrate.py --detector mtcnn --split test --t_auto 7.75 --m 1.5 --t_review 9.4924
```

### After-review results

Ground-truth faculty corrections would be an **oracle upper bound**, not an
observed end-user result. No after-review oracle table was measured in this
run, so no after-review accuracy is reported.

## 2. Calibration results and sweep

The calibration run selected `(T_auto=7.75, M=1.5)` subject to outsider AUTO <=1% and wrong-identity AUTO = 0. The selected calibration result was class AUTO 92.67% and outsider AUTO 0.95%. The full sweep is [sweep_mtcnn.csv](./sweep_mtcnn.csv); the embedding cache is [emb_cache_mtcnn.npz](./emb_cache_mtcnn.npz).

| Calibration metric | Result |
|---|---:|
| Genuine pairs, n=260 | mean 5.79 |
| Impostor pairs, n=2500 | mean 12.55 |
| EER | 0.39% at 9.34 |
| Class AUTO | 92.67% |
| Outsider AUTO | 0.95% |
| Wrong-identity AUTO | 0.00% |

## 3. Detector decision

Calibration-half benchmark results:

| Detector | Mean detection at 60/80/120 px | False positives/image | Median image latency |
|---|---:|---:|---:|
| Haar | 45.00% | 0.00 | 44.5 ms |
| YuNet | 99.00% | 0.00 | 134.4 ms |
| MTCNN | 100.00% | 0.00 | 313.3 ms |

MTCNN was selected by the fixed rule (highest mean rate, FP <=0.1, latency <=1500 ms). Haar and YuNet remain selectable via `DETECTOR`. The ONNX YuNet model is copied by the face-service image.

## 4. Code changes and rollback

* `0e121ed` — baseline scripts, split manifest, and Haar calibration.
* `a22adb3` — tiered AUTO/REVIEW/UNKNOWN decision and backend mapping.
* `8e75c47` — detector plumbing and MTCNN selection.
* `31eb3eb` — MTCNN recalibration, API verification, and face-service tests.
* `a2efb98` — Hungarian assignment, current environment defaults, stale documentation cleanup, and this report.

Rollback to the pre-upgrade tag `before-recognition-upgrade` (or select the previous commit), and set:

```text
DETECTOR=haar
MANHATTAN_THRESHOLD=15.0
MANHATTAN_AUTO_ACCEPT=15.0
MATCH_MARGIN=0.0
ATTENDANCE_RECOGNITION_THRESHOLD=15.0
```

Existing embeddings must be re-enrolled after changing detector/crop behavior. One non-`RTC_` student was found during the detector switch: `TEST001`, Test Student; it was not deleted or modified.

## 5. Auto-finalize audit

No attendance session can reach `FINALIZED` from recognition alone in the current single-shot path. [AttendanceRecognitionService.java](../backend-spring/src/main/java/com/classsight/service/AttendanceRecognitionService.java) sets `requiresReview = true` for `ATTENDANCE` sessions before choosing the status (around lines 247–251), so a faculty review call is required. The review endpoint performs the final transition in `AttendanceReviewService.java` around lines 160–170. The AUTO tier therefore does not make that path easier to reach; it only produces approved candidate records for review.

Multi-shot `finalise` can set `FINALIZED` when the accumulator is non-empty and contains no `REVIEW` or `PENDING` records (around lines 166–175 of `MultiShotSessionService.java`). This is an explicit multi-shot finalise operation, not an automatic single-shot recognition transition; AUTO records make that condition easier to satisfy.

## 6. Verification and cleanup

* Face-service tests: **17 passed**, 4 deprecation warnings.
* Python syntax compilation and `docker compose config`: passed.
* Prior live RTC verification covered three enrolled students, one removed student, and an outsider; the outsider was not AUTO-present. Cleanup verified zero remaining `RTC_` students and sections while preserving seed `TEST001` and `TEST-SEC-A`.
* Maven tests and the four root E2E scripts were **not re-run in this continuation** because Docker Desktop's Linux engine was unavailable. Existing recorded results are retained in `step6_results.json`: Maven PASS; enroll PASS; multishot PASS; pipeline verification PASS; attendance-session FAIL because its class section had no enrolled students; spring-enroll NOT VERIFIED because it lacked JWT authentication.

## 7. Not verified and remaining risks

* Native 512-d cosine versus projected 128-d L1 comparison was not run.
* A fresh Docker rebuild and live health endpoint check were not possible with the Docker daemon unavailable.
* LFW is not a classroom dataset; small-face and camera-domain performance can differ materially.
* CPU MTCNN latency remains the main scale risk for 30-face captures.
* Detector changes require re-enrollment because crop geometry changes the stored embeddings.
