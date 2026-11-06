# Recognition Upgrade Progress (Phase 3)

Status: In Progress
Current Step: Step 7
Next Command: git diff --check; git status --short

## Key Numbers (Step 1 Baseline - Haar on CALIBRATION)
- Genuine pairs: n=260, mean=5.79, std=1.54, min=2.93, p05=3.48, p50=5.59, p95=8.58, p99=9.11, max=9.98
- Impostor pairs: n=2500, mean=12.55, std=1.12, min=8.39, p01=9.74, p05=10.58, p50=12.58, p95=14.34, max=15.89
- EER: 0.39% at threshold 9.34
- Threshold at FAR 1% (T_review): 9.7400 (TAR 99.62%)
- Threshold at FAR 0.1%: 8.9847 (TAR 98.08%)
- Detector latency: 35.7 ms median (Haar)

## Key Numbers (Step 2 Tiered Decision - Haar)
- Calibrated thresholds: T_auto=8.0, M=0.5, T_review=9.74
- CALIBRATION: Class AUTO 86.48%, Outsider AUTO 0.47% (<=1% constraint satisfied)
- TEST (simulated on LFW, NOT classroom accuracy): Class AUTO 94.00%, Wrong AUTO 0.00%
- API Verification with RTC_ data: PASS

## Key Numbers (Step 3 Detector Benchmark)
- Decision rule: highest mean detection rate (60/80/120px), subject to FP<=0.1/image and latency<=1500ms

| Detector | Mean rate (60/80/120px) | FP/image | Latency (median) | PASS |
|----------|------------------------|----------|------------------|------|
| Haar     | 45.00%                 | 0.00     | 44.5 ms          | YES  |
| YuNet    | 99.00%                 | 0.00     | 134.4 ms         | YES  |
| MTCNN    | 100.00%                | 0.00     | 313.3 ms         | YES  |

- SELECTED: MTCNN (highest mean detection rate, all constraints pass)
- Real students needing re-enrollment: 1 (Test Student / TEST001, enrolled under Haar)
- Updated: docker-compose.yml DETECTOR default -> mtcnn; .env DETECTOR=mtcnn

## Checklist

- [x] Step 1: Scripts and baseline
  - [x] 1.1 Start stack and confirm /health endpoints
  - [x] 1.2 Create 50/50 identity split manifest (seed 42, 840 cal / 840 test)
  - [x] 1.3 Create calibrate.py and bench_detect.py
  - [x] 1.4 Smoke-run on Haar setup and verify baseline numbers
- [x] Step 2: Tiered decision on current detector
  - [x] 2.1 Compute pair statistics and run 1:N 30-student roster simulation on CALIBRATION
  - [x] 2.2 Grid sweep (T_auto, M) with rule: class AUTO max, outsider AUTO <= 1%, wrong AUTO = 0
  - [x] 2.3 Edge case handling for < 2 enrolled students + unit tests
  - [x] 2.4 Evaluate chosen (T_auto, M, T_review) on TEST with Wilson 95% CIs
  - [x] 2.5 Implement env vars (MANHATTAN_THRESHOLD, MANHATTAN_AUTO_ACCEPT, MATCH_MARGIN)
  - [x] 2.6 Map tiers to backend statuses and update docker-compose.yml, .env.example
  - [x] 2.7 Auto-finalize check report
  - [x] 2.8 Verify through API with RTC_ data (all 3 present, 1 removed, outsider added)
- [x] Step 3: Detector benchmark and switch
  - [x] 3.1 Implement DETECTOR env var (haar, yunet, mtcnn) and integrate YuNet + MTCNN
  - [x] 3.2 Benchmark on CALIBRATION: size sweep, composites, false positives, latency
  - [x] 3.3 Apply decision rule -> MTCNN selected (100% mean rate, all constraints pass)
  - [x] 3.4 1 real student found (Test Student/TEST001); DETECTOR=mtcnn set in docker-compose+.env
- [x] Step 4: Recalibrate with chosen detector (MTCNN)
  - [x] 4.1 Re-run calibration sweep on MTCNN detector
  - [x] 4.2 Updated thresholds: T_auto=7.75, M=1.5, T_review=9.4924 (Class AUTO 92.67%, Outsider AUTO 0.95%)
  - [x] 4.3 Re-verified Step 2 API scenarios: PASS (MTCNN detector, new thresholds)
- [x] Step 5: One-to-one assignment and face-service tests
  - [x] 5.1 Hungarian _manhattan_matching with globally optimal one-to-one assignment verified
  - [x] 5.2 Face-service tests all pass: 17/17 PASSED
  - [x] 5.3 pytest: 17 passed, 4 warnings, 0 failures
- [ ] Step 6: Before/after benchmark and test hygiene
  - [x] 6.1 Re-run full benchmark on TEST with Wilson 95% CIs
  - [ ] 6.2 Compute informational 512-d cosine vs 128-d L1 metrics
  - [ ] 6.3 Run Maven tests and 4 root E2E scripts, fix test harnesses (Docker daemon unavailable in this run)
- [ ] Step 7: Cleanup and report
  - [x] 7.1 Delete RTC_ data from DB (verified by prior runtime cleanup: zero RTC_ students/sections remain)
  - [x] 7.2 Grep & fix documentation contradictions in README and docs/
  - [x] 7.3 Write runtime-check/RECOGNITION_UPGRADE.md
