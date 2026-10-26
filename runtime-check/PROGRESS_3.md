# Recognition Upgrade Progress (Phase 3)

Status: In Progress
Current Step: Step 3
Next Command: python runtime-check/bench_detect.py --detector haar --split calibration

## Key Numbers (Step 1 Baseline - Haar on CALIBRATION)
- Genuine pairs: n=260, mean=5.79, std=1.54, min=2.93, p05=3.48, p50=5.59, p95=8.58, p99=9.11, max=9.98
- Impostor pairs: n=2500, mean=12.55, std=1.12, min=8.39, p01=9.74, p05=10.58, p50=12.58, p95=14.34, max=15.89
- EER: 0.39% at threshold 9.34
- Threshold at FAR 1% (T_review): 9.7400 (TAR 99.62%)
- Threshold at FAR 0.1%: 8.9847 (TAR 98.08%)
- Threshold 15.0: FAR 99.36%, TAR 100.00%
- Haar single face detection: 40 px: 0%, 60 px: 0%, 80 px: 39% (box 38.5 px), 120 px: 96% (box 51.6 px), 160 px: 98% (box 64.8 px)
- Haar composites: 50 px: 0/30 (0%), 70-110 px: 18/30 (60%), 140 px: 29/30 (96.7%)
- False positives: 0.0000 per image
- Detector latency: 35.7 ms median

## Key Numbers (Step 2 Tiered Decision - Haar)
- Calibrated thresholds: T_auto=8.0, M=0.5, T_review=9.74 (sweep saved in runtime-check/sweep_haar.csv)
- CALIBRATION performance (used to choose):
  - Class probes: AUTO 86.48%, REVIEW 12.72%, UNKNOWN 0.80%, Wrong AUTO 0.00%
  - Outsider probes: AUTO 0.47% (<= 1% constraint satisfied), REVIEW 27.20%, UNKNOWN 72.33%
- TEST performance (simulated on LFW, NOT classroom accuracy, n=100 distinct probe identities):
  - Class probes: AUTO 94.00% (95% CI: [87.52%, 97.22%]), REVIEW 5.00% (95% CI: [2.15%, 11.18%]), UNKNOWN 2.00% (95% CI: [0.55%, 7.00%]), Wrong AUTO 0.00% (0/6000)
  - Outsider probes: AUTO 2.00% (95% CI: [0.55%, 7.00%]), REVIEW 27.00% (95% CI: [19.27%, 36.43%]), UNKNOWN 72.00% (95% CI: [62.51%, 79.86%])
- Auto-finalize check:
  - AttendanceSessionController:167 (transition to FINALIZED returns 409 Conflict)
  - AttendanceRecognitionService:247 (single-shot ATTENDANCE forces requiresReview=true; single-shot TEST can auto-finalize if clean)
  - MultiShotSessionService:173-175 (if all records in accumulator are PRESENT, session reaches FINALIZED without faculty review)
  - Impact: AUTO tier produces PRESENT / APPROVED records, enabling clean multi-shot sessions to auto-finalize.
- API Verification with RTC_ data: PASS (all 3 present -> PRESENT/RECOGNIZED; 1 removed -> ABSENT_CANDIDATE/REVIEW; outsider added -> UNKNOWN/REVIEW, session REVIEW_REQUIRED, never auto-present).

## Checklist

- [x] Step 1: Scripts and baseline
  - [x] 1.1 Start stack and confirm /health endpoints (face-service :8000 UP, backend-spring :8080 UP)
  - [x] 1.2 Create 50/50 identity split manifest (CALIBRATION vs TEST) with seed 42 (840 cal / 840 test)
  - [x] 1.3 Create calibrate.py and bench_detect.py
  - [x] 1.4 Smoke-run on Haar setup and verify baseline numbers
- [x] Step 2: Tiered decision on current detector
  - [x] 2.1 Compute pair statistics and run 1:N 30-student roster simulation (200 rosters) on CALIBRATION
  - [x] 2.2 Grid sweep (T_auto, M) with rule: class AUTO max, outsider AUTO <= 1%, wrong AUTO = 0
  - [x] 2.3 Edge case handling for < 2 enrolled students (null in JSON, Infinity backend) + unit tests
  - [x] 2.4 Evaluate chosen (T_auto, M, T_review) on TEST with Wilson 95% CIs
  - [x] 2.5 Implement env vars (MANHATTAN_THRESHOLD, MANHATTAN_AUTO_ACCEPT, MATCH_MARGIN) in face-service
  - [x] 2.6 Map tiers to backend statuses and update docker-compose.yml, .env.example, health, tests
  - [x] 2.7 Auto-finalize check report in RECOGNITION_UPGRADE.md
  - [x] 2.8 Verify through API with RTC_ data (all 3 present, 1 removed, outsider added)
- [ ] Step 3: Detector benchmark and switch
  - [ ] 3.1 Implement DETECTOR env var (haar, yunet, mtcnn) and download/integrate YuNet
  - [ ] 3.2 Benchmark on CALIBRATION: size sweep (40/60/80/120/160 px), composites (50, 70-110, 140 px), false positives (50 face-free), latency
  - [ ] 3.3 Apply decision rule and select best detector
  - [ ] 3.4 Check existing real student embeddings and set default in docker-compose.yml
- [ ] Step 4: Recalibrate with chosen detector
  - [ ] 4.1 Re-run calibration sweep on chosen detector
  - [ ] 4.2 Update T_auto / M / T_review
  - [ ] 4.3 Re-verify Step 2 API scenarios
- [ ] Step 5: One-to-one assignment and face-service tests
  - [ ] 5.1 Test double-assignment and implement Hungarian matching if needed
  - [ ] 5.2 Fix face-service tests (Hungarian test, rejection reason test, group photo test)
  - [ ] 5.3 Run pytest in container/venv
- [ ] Step 6: Before/after benchmark and test hygiene
  - [ ] 6.1 Re-run full benchmark on TEST with Wilson 95% CIs
  - [ ] 6.2 Compute informational 512-d cosine vs 128-d L1 metrics
  - [ ] 6.3 Run Maven tests and 4 root E2E scripts, fix test harnesses
- [ ] Step 7: Cleanup and report
  - [ ] 7.1 Delete RTC_ data from DB
  - [ ] 7.2 Grep & fix documentation contradictions in README and docs/
  - [ ] 7.3 Write and print runtime-check/RECOGNITION_UPGRADE.md
