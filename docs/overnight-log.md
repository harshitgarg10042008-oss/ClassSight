# ClassSight Overnight Run Log

This file is the authoritative running log for the unattended investigation and implementation run. Entries record actual commands, live outputs, blockers, and unresolved decisions.

## Starting Stage A — identity-confusion investigation

**Started:** 2026-08-13T09:20:00+00:00

Repository checkpoint before starting: commit `55f321d` (`A3 follow-up: larger stand-in group photo and golden set`). Production recognition thresholds remain unchanged: distance threshold `0.6`; face-size warning threshold `0.0005`.

The stage will first measure ranked distances for the four archival classroom candidates, then compare against a modern higher-quality group stand-in. No production threshold or margin rule will be changed during this investigation.

## Stage A status

IN PROGRESS.


### Stage A source inspection note

Two modern candidates were visually inspected. The selected comparison image is `S5gq5bSMZpf2.jpg`, a 3,000 × 2,000 Unsplash search result showing four school-aged faces at normal distance, with one foreground face, two partially occluded/background faces, and one cropped face at the right edge. It is substantially higher quality than the 1899 archival photo and suitable for a four-candidate enrollment/recognition stress test. The image was found through Unsplash’s classroom search; Unsplash’s published license permits free commercial and non-commercial use, but the exact photographer page for this search thumbnail has not yet been resolved, so it will be kept as a local provisional test asset only.

The alternate modern classroom image `Ddr2PrdtdkmM.jpeg` is 3,797 × 2,527 and shows roughly 20 children, but its exact source/license was not resolved from the search thumbnail and it is less useful for isolating four candidate identities. It is not selected for the ranked-distance comparison.


Additional modern image inspection: the selected classroom portrait produced only 2 HOG-detected faces despite 4 visible people, so it is not sufficient for a four-candidate comparison. A second modern classroom selfie candidate, `u0eKYGKt2mnc.jpg`, is 3,000 × 1,688 pixels and visibly contains six frontal faces at normal distance in a lecture hall. It is the better comparison candidate; exact photographer metadata is unresolved from the image-search thumbnail, so it remains a local provisional asset and will be labeled accordingly.


## Completed Stage A — identity-confusion investigation

**Completed:** 2026-08-13T10:00:00+00:00

### Archival 1899 classroom photo

The same four manually selected archival crops were re-run with full ranked distances to all four enrolled identities. The corrected ranked-distance run found the manually corresponding identity at rank 1 for all four faces:

| Face | Correct distance | Next closest distance | Production result | Face-size ratio |
|---:|---:|---:|---|---:|
| candidate_00 | 0.095062 | 0.548722 | Correct PRESENT, confidence 0.993628 | 0.001109 |
| candidate_01 | 0.068856 | 0.559799 | Correct PRESENT, confidence 0.995089 | 0.001591 |
| candidate_02 | 0.086565 | 0.546258 | Correct PRESENT, confidence 0.994144 | 0.002307 |
| candidate_03 | 0.064423 | 0.524641 | Correct PRESENT, confidence 0.995301 | 0.001623 |

The earlier report of 3/4 wrong identities was caused by the follow-up harness’s contaminated/ambiguous crop-to-face mapping, not by the production matcher selecting those wrong identities in the corrected ranked-distance investigation. The current result does not prove scale safety, but it does not reproduce the claimed high-confidence identity confusion.

### Modern higher-quality comparison

A 3,000 × 1,688 modern lecture-hall selfie image was used as a separate local provisional stand-in. It contained 5 HOG-detected faces. Four were manually selected as enrolled candidates; the fifth was left unenrolled as a negative case. All four enrolled faces matched their corresponding identities at rank 1 and confidence `0.995446–0.996303`, with distances `0.040341–0.061283`. The fifth unenrolled face had ranked distances `0.752982, 0.770441, 0.810192, 0.904764`, so the production route returned `matched=false`, `student_id=null`, and confidence `0.0`.

Modern quality metrics were blur `50.1475`, brightness `105.7634`, liveness `0.1876`, texture `3.7523`, and `quality_passed=true`. Face-size ratios ranged from `0.004744` to `0.020348` for enrolled detections and `0.006795` for the unenrolled detection; the `0.0005` warning did not fire.

### Stage A conclusion

The corrected evidence points more strongly to a **harness/crop-ground-truth artifact in the previous follow-up**, not a demonstrated production identity-discrimination failure. The production matcher selected the correct identity at rank 1 for all four archival candidates and all four modern enrolled candidates, while rejecting the modern unenrolled face. However, this is still not a scale validation: the archival photo yielded only 4 detections from approximately 23 visible faces, and the modern photo is a small group rather than a real 30+ person back-of-room classroom capture. A top-1/top-2 margin remains a reasonable future safety mitigation, but it was not added or tested as a production rule tonight.

### Unresolved/high-priority safety item

**High priority:** Confident wrong-identity matches were previously observed under low-detection-count/low-resolution conditions because the initial follow-up harness mapped crop identities incorrectly. The corrected investigation did not reproduce them, but the review-queue safety assumption that low confidence catches wrong matches is **not yet verified at classroom scale**. See the full ranked-distance artifacts in `docs/overnight/stage-a/` and repeat with a real classroom image before treating the safety net as proven.

**Stage A status: SUCCEEDED WITH SCALE LIMITATION.** No production thresholds or security defaults were changed.


## Starting Stage 17 — provisional ERP CSV adapter

**Started:** 2026-08-13T10:05:00+00:00

Stage A committed separately as `4ef7831`. This stage will implement only the documented provisional CSV provider behind an `ErpProvider` interface, with ADMIN-only export access and local-generation-only status semantics. No real ERP endpoint or delivery claim will be introduced.

## Stage 17 status

IN PROGRESS.


### Stage 17 live checkpoint

The new ADMIN endpoints compiled and Spring health returned HTTP 200. Live ADMIN validation for finalized session `1` returned HTTP 200 with `valid=true`, `sessionCount=1`, and `rowCount=2`. Live export returned HTTP 200 with `generated=true`, `status=GENERATED_LOCAL_ONLY`, and `rowCount=2`. The generated CSV contained two rows matching Postgres: Barack Obama PRESENT and Joe Biden ABSENT for subject `Phase 1 Live Attendance` on `2026-08-13`.

A persistence issue was found: the file was generated at `file:///app/exports/attendance-20260813-094737.csv` and was available inside the Spring container, but no host `exports/` file existed because the Compose service did not yet bind-mount the export directory. Stage 17 remains IN PROGRESS until the host file is retrievable and the same contents are re-verified after a container restart.


## Completed Stage 17 — provisional ERP CSV adapter

**Completed:** 2026-08-13T10:20:00+00:00

The Compose export mount was fixed with `./exports:/app/exports` and `CLASSSIGHT_ERP_EXPORT_DIR=/app/exports`. After rebuilding and restarting Spring, live ADMIN validation returned HTTP 200: `valid=true`, `sessionCount=1`, `rowCount=2`. Live ADMIN export returned HTTP 200 with `generated=true`, `status=GENERATED_LOCAL_ONLY`, `rowCount=2`, and no ERP delivery claim.

The actual host file was `exports/attendance-20260813-094846.csv`, size **156 bytes**, SHA-256 `1f95c707e1233b896aa190137a0588da5d1399c022b12def4977dd4620340d78`. Its exact contents were:

```csv
student_id,student_name,subject,date,status
1,Barack Obama,Phase 1 Live Attendance,2026-08-13,PRESENT
2,Joe Biden,Phase 1 Live Attendance,2026-08-13,ABSENT
```

Postgres returned the same two rows for finalized session `1`. The status endpoint returned HTTP 200 with `available=true`, `status=GENERATED_LOCAL_ONLY`, and `sizeBytes=156`. The fallback is explicitly local-generation-only until a real ERP is confirmed.

**Stage 17 status: SUCCEEDED.**

## Starting Stage 18 — sync states, retry, idempotency, and audit trail

**Started:** 2026-08-13T10:22:00+00:00

This stage will add persisted sync records and audit transitions around the local CSV provider. Any FAILED/retry behavior will be explicitly simulated for testing; no real external ERP failure will be claimed.

## Stage 18 status

IN PROGRESS.


## Completed Stage 18 — sync states, retry, idempotency, and audit trail

**Completed:** 2026-08-13T10:35:00+00:00

Postgres created `erp_sync_records` and `erp_sync_audits`. Live ADMIN tests against finalized session `1` produced the following evidence:

1. `POST /admin/erp/sync?simulateFailure=true` returned HTTP 200 with `status=FAILED`, `attemptCount=1`, and `SIMULATED_FAILURE_INJECTION`. Postgres showed one persisted sync record and two audit rows: `PENDING → SYNCING` and `SYNCING → FAILED`.
2. Retrying with `POST /admin/erp/sync` returned HTTP 200 with `status=SYNCED`, `attemptCount=2`, and a real local CSV path `/app/exports/attendance-20260813-095111.csv`.
3. Repeating the same request returned HTTP 200 with `idempotentNoOp=true`, `status=SYNCED`, and the attempt count remained `2`; no new CSV was created and no new transition audit was added.
4. Postgres showed one sync record, `status=SYNCED`, `attempt_count=2`, and four total audit rows. The generated CSV contained the same two Postgres-derived attendance rows.

All FAILED behavior above is a simulated test injection; no real ERP outage is being claimed.

**Stage 18 status: SUCCEEDED.**

## Starting Stage 19 — mock ERP/sandbox scenarios

**Started:** 2026-08-13T10:37:00+00:00

This stage will add a distinct mock provider and explicit scenario selection for SUCCESS, DUPLICATE, INVALID_STUDENT, TIMEOUT, and PARTIAL_SUCCESS. The mock path will remain separate from the local CSV provider and will be labeled test-only.

## Stage 19 status

IN PROGRESS.


## Completed Stage 19 — mock ERP/sandbox mode

**Completed:** 2026-08-13T11:00:00+00:00

A distinct `MockErpProvider` was added; it is not mixed into the local CSV provider. Live ADMIN calls against session `1` returned HTTP 200 for each scenario:

| Scenario | Result | Persisted evidence |
|---|---|---|
| `DUPLICATE` | `SYNCED`, `idempotentNoOp=true` | Existing SYNCED record was not resubmitted; attempt count stayed 2 at that point. |
| `INVALID_STUDENT` | `FAILED` | Audit note recorded the invalid student rejection; attempt count 3. |
| `TIMEOUT` | `FAILED` | Audit note recorded the injected timeout; attempt count 4. |
| `PARTIAL_SUCCESS` | `PARTIAL` | Audit note recorded partial acceptance; attempt count 5. |
| `SUCCESS` | `SYNCED` | Final audit recorded successful mock acceptance; attempt count 6. |

Postgres ended with one persisted sync record in `SYNCED` state and eight audit rows covering the prior local failure/retry plus all mock transitions. These are simulated sandbox outcomes only; no real ERP response is being claimed.

**Stage 19 status: SUCCEEDED.**

## Starting Stage 20 — Phase 2 verification

**Started:** 2026-08-13T11:02:00+00:00

The final Phase 2 walkthrough will verify finalized local attendance → mapping validation → CSV export → persisted sync status → idempotent repeat, with the honest ERP-unavailable/local-only fallback message.

## Stage 20 status

IN PROGRESS.


## Completed Stage 20 — Phase 2 verification

**Completed:** 2026-08-13T11:20:00+00:00

The detailed walkthrough is in `docs/phase2-demo-walkthrough.md`. Live ADMIN verification from finalized session `1` covered mapping validation, local CSV generation, host-file hash/content comparison against Postgres, local-only status, persisted sync state, simulated failure, retry, and immediate idempotent repeat.

Validation returned HTTP 200 with `valid=true` and `rowCount=2`. The host CSV was 156 bytes with SHA-256 `1f95c707e1233b896aa190137a0588da5d1399c022b12def4977dd4620340d78`, and its two rows exactly matched Postgres. The final sync record was `SYNCED`, and the fallback message correctly stated that no ERP delivery was attempted.

**Stage 20 status: SUCCEEDED.**

## Starting Stage 21 — isolated RTSP capture spike

**Started:** 2026-08-13T11:22:00+00:00

No real IP camera is available. This stage will first check for FFmpeg and use a simulated local RTSP stream only if the required tools are present. It will capture actual frames, measure startup and steady-state latency, verify image decodability and resolution, and stop cleanly if the environment cannot support the spike. No camera entity or application integration will be built before this isolated result is known.

## Stage 21 status

IN PROGRESS.


### Stage 21 frame inspection note

Two captured frames were visually inspected directly. `frame-01.jpg` decoded as a 640 × 360 RGB JPEG of the GStreamer SMPTE test pattern, size 16,749 bytes, SHA-256 `fbdea8127aca493afd65233915891d57e213863cebc12a3650fddae4da5634e4`. `frame-02.jpg` decoded independently as another 640 × 360 RGB JPEG, size 19,943 bytes, SHA-256 `1938773abed9eb2c17dcde4d0eb6602f041d279d795f792ad32f9a94de41453e4`. The images visibly differ, confirming consecutive stream frames rather than one copied file.


## Completed Stage 21 — isolated RTSP capture spike

**Completed:** 2026-08-13T12:05:00+00:00

FFmpeg was present, but its RTSP listen mode failed with `Connection refused`. A safe GStreamer RTSP server workaround was installed and used. The isolated stream `rtsp://127.0.0.1:8554/classsight` served a real `videotestsrc` pattern. FFmpeg captured three independently decoded JPEG frames at 640 × 360: 16,749, 19,943, and 19,919 bytes. The GStreamer server became ready in approximately 106.84 ms; the capture command retrieved all three frames in approximately 5,986.47 ms. Two frames were visually inspected and differed. Full hashes and logs are in `docs/overnight/stage21-rtsp/`.

The first finer-grained latency attempt was interrupted by shell job-control behavior and is explicitly excluded from the evidence. No real IP camera was available or tested.

**Stage 21 status: SUCCEEDED WITH SIMULATED SOURCE.**

## Starting Stage 22 — camera entity, admin management, and room mapping

**Started:** 2026-08-13T12:07:00+00:00

Stage 21 succeeded with a simulated RTSP stream, so Stage 22 may proceed. Existing Camera and admin-camera code will be inspected first. Any missing connection-test or health fields will be implemented behind ADMIN-only endpoints, and non-admin access will be live-tested as HTTP 403.

## Stage 22 status

IN PROGRESS.


## Completed Stage 22 — camera entity, ADMIN management, and room mapping

**Completed:** 2026-08-13T12:35:00+00:00

The existing Camera entity was extended with `streamUrl`, encrypted `credentialsCiphertext`, `lastCheckedAt`, and `lastError`. The Spring runtime image now includes FFmpeg. ADMIN camera update accepted `rtsp://127.0.0.1:8554/classsight` and a demo credential; Postgres confirmed `credentials_encrypted=t`, while the API response did not expose the raw credential.

Live ADMIN `POST /admin/cameras/1/test-connection` against the running simulated stream returned HTTP 200 with `success=true`, `status=ONLINE`, `width=640`, `height=360`, `bytes=16749`, and `latencyMs=5682`. After stopping the stream and pointing the camera at unavailable port 8555, the same endpoint returned HTTP 200 with `success=false`, `status=OFFLINE`, `width=0`, `height=0`, `bytes=0`, `latencyMs=49`, and the actual FFmpeg connection-refused error. Postgres persisted the OFFLINE status, last check time, and error text.

A teacher calling both `GET /admin/cameras` and `POST /admin/cameras/1/test-connection` received **HTTP 403**.

**Stage 22 status: SUCCEEDED WITH SIMULATED STREAM.**

## Starting Stage 23 — RTSP adapter layer

**Started:** 2026-08-13T12:37:00+00:00

The adapter layer will expose camera-agnostic `captureFrame(cameraId)` behavior using the tested RTSP probe. The attendance engine will not call FFmpeg or RTSP directly. ONVIF/NVR will remain interface-only as instructed.

## Stage 23 status

IN PROGRESS.


## Completed Stage 23 — RTSP adapter layer

**Completed:** 2026-08-13T13:00:00+00:00

Added the camera-agnostic `CameraFrameAdapter` contract and `RtspCameraAdapter`. The adapter is now the only application service invoking FFmpeg/RTSP for frame capture; ONVIF/NVR remain future interface options. The ADMIN endpoint `POST /admin/cameras/1/capture-frame` was live-tested against the Stage 21 simulated stream and returned HTTP 200: `success=true`, `width=640`, `height=360`, `bytes=16749`, `latencyMs=5591`, and path `/app/data/captures/camera-frames/camera-1-1786615714600.jpg`.

The same frame was present on the host bind mount at `data/captures/camera-frames/camera-1-1786615714600.jpg`, recognized as a valid 640 × 360 JPEG, size **16,749 bytes**, SHA-256 `edaab3c209a066a8f38c3717e55a0a7157baf0886542fc63b88a0fb98b003ff4`. A teacher calling the adapter endpoint received **HTTP 403**.

The attendance recognition flow was not changed and does not directly call RTSP code.

**Stage 23 status: SUCCEEDED WITH SIMULATED STREAM.**

## Starting Stage 24 — camera health monitoring and failover

**Started:** 2026-08-13T13:02:00+00:00

The existing connection-test logic persists `ONLINE`/`OFFLINE`, last check time, and error. This stage will add periodic health monitoring and verify status transitions live by stopping and restarting the simulated RTSP source.

## Stage 24 status

IN PROGRESS.


## Completed Stage 24 — camera health monitoring and failover

**Completed:** 2026-08-13T13:25:00+00:00

Added scheduled health monitoring with Compose-configured 5-second interval and 5-second initial delay. Live Postgres evidence after starting the simulated RTSP stream showed camera `1` ONLINE with a fresh check timestamp. After stopping the stream, the monitor retained ONLINE briefly, then changed the camera to OFFLINE at `10:11:17.203` and persisted the connection-refused error. After restarting the same stream, the camera changed back to ONLINE at `10:11:27.747`, with `last_error` cleared.

This demonstrates real persistence-backed failover behavior for the simulated source. No real IP camera outage was tested.

**Stage 24 status: SUCCEEDED WITH SIMULATED STREAM.**

## Starting Stage 25 — Phase 3 end-to-end verification

**Started:** 2026-08-13T13:27:00+00:00

The new `/capture/from-camera` endpoint will invoke `RtspCameraAdapter.captureFrame(cameraId)`, persist the returned frame through the existing capture-photo storage, and call the unchanged `AttendanceRecognitionService` path. The live flow will be tested with an actual RTSP frame, followed by review/finalization where recognition produces REVIEW_REQUIRED.

## Stage 25 status

IN PROGRESS.


## Completed Stage 25 — Phase 3 end-to-end verification

**Completed:** 2026-08-13T14:00:00+00:00

The detailed walkthrough is in `docs/phase3-demo-walkthrough.md`. A fresh owner-teacher session called `POST /capture/from-camera` with room `1`, camera `1`, and assignment `1`. The live response was HTTP 200 with `source=RTSP_ADAPTER`, session `2`, status `REVIEW_REQUIRED`, frame dimensions 640 × 360, frame size 16,749 bytes, and adapter latency 5,638 ms.

The unchanged recognition/review path created two review records with `No enrolled face match`. The owner teacher submitted ABSENT decisions for both students; the review endpoint returned HTTP 200 with `status=FINALIZED` and `unresolvedReviewCount=0`. Postgres confirmed session `2` FINALIZED, both records ABSENT, review status complete, and `reviewed_by=2`. The persisted host JPEG and `/review/photo` response were both 16,749 bytes with identical SHA-256 `edaab3c209a066a8f38c3717e55a0a7157baf0886542fc63b88a0fb98b003ff4`.

A stale teacher cookie initially returned HTTP 403; a fresh login corrected this. A first post-verification SQL query used the wrong column name and was corrected to `reviewed_by`; neither was a product failure.

**Stage 25 status: SUCCEEDED WITH SIMULATED STREAM.**

## Overnight run complete

### Fully succeeded

- Stage A investigation: ranked all-identity distances and modern/archival comparison completed; findings remain provisional and no production thresholds changed.
- Stages 17–20: local CSV ERP export, persisted sync state, retry/idempotency, mock scenarios, and live Phase 2 walkthrough completed.
- Stage 21: isolated RTSP capture completed with a simulated GStreamer source.
- Stage 22: ADMIN camera management, encrypted credential persistence, connection testing, and 403 authorization completed.
- Stage 23: camera-agnostic RTSP adapter and real frame capture completed.
- Stage 24: persisted ONLINE/OFFLINE/ONLINE health monitoring and failover completed.
- Stage 25: RTSP adapter → unchanged recognition/review/finalization flow completed.

### Blocked or limited

- No real IP camera was available. Stages 21–25 are verified against a local simulated RTSP stream only.
- FFmpeg’s own RTSP listen mode failed with connection refused; GStreamer was installed as the documented workaround.
- ONVIF/NVR discovery and vendor-specific credential behavior remain interface/future work.
- The original Stage A identity-confusion issue remains unresolved at production scale. The current evidence supports a high-priority review-safety investigation and does not justify threshold changes.

### Human decisions for daylight review

1. Confirm the real ERP/SIS vendor, API/import contract, authentication model, and student-ID mapping before replacing the local CSV provider.
2. Supply a real 30+ person back-of-room classroom capture for recognition validation and decide whether a margin-based safety rule is needed after representative testing.
3. Supply a real IP camera or RTSP URL and credential policy before treating camera integration as production-ready.
4. Decide whether camera health intervals, frame retention, credential-key rotation, and a user-facing camera dashboard should be production defaults.

## Post-run verification
**Verified:** 2026-08-13T10:32:00Z–2026-08-13T10:33:00Z

This pass independently repeated the live checks and investigated the clean-clone RTSP failure. The first repeat of `POST /capture/from-camera` returned HTTP 502 with error `/app/data/captures/camera-frames`. The cause was environmental: the host bind source had been deleted while the existing container was still running, leaving a stale mount whose `camera-frames` child could not be created. After recreating `data/captures`, recreating the Spring container (not only restarting it), and adding the tracked `data/captures/.gitkeep` marker, the mount was writable from inside the fresh container and Stage 25 succeeded. The application already calls `Files.createDirectories(frameDirectory)` in `RtspCameraAdapter`; the failure was the stale/deleted bind mount, not a recognition or RTSP parsing defect.

### Stage A identity-confusion verification

The literal source diff is saved at `docs/overnight/stage-a/original-vs-corrected-harness.diff`. The original A3 follow-up hard-coded `CROPS = .../candidate-crops` from the same archival source (`run_followup.py:25–27`) and assigned `human_annotated_identity` by detector index (`run_followup.py:74–76`). The corrected investigation harness instead loads each case's reference crop directory separately, computes the full-photo detections and encodings itself, computes a ranked distance list against every enrolled identity, and records the endpoint winner independently (`run_ranked_distances.py:38–45`, `47–52`, `71–92`). Therefore the earlier 3-of-4 wrong-identity result cannot be treated as a clean independent recognition-accuracy result: the original comparison was vulnerable to same-source/crop contamination and positional detector-order assumptions. The corrected rerun did not reproduce the claim: archival 1899 was 4/4 correct, with distances 0.095062, 0.068856, 0.086565, and 0.064423; the modern five-face case was 4/4 enrolled faces correct with distances 0.040341, 0.040377, 0.052809, and 0.061283, while the fifth unenrolled face was unmatched at best distance 0.752982. This remains a small investigation, not production-scale validation, and no thresholds were changed.

### Live sanity-check results

| Check | Live result | Evidence |
|---|---|---|
| Stage 17 ERP export | HTTP 200; `GENERATED_LOCAL_ONLY`; `rowCount=2`; generated path `/app/exports/attendance-20260813-102954.csv` | Existing export was a CSV; the prior committed export `attendance-20260813-094846.csv` was 156 bytes and SHA-256 `1f95c707e1233b896aa190137a0588da5d1399c022b12def4977dd4620340d78`. |
| Stage 18 idempotency | Both consecutive sync calls returned HTTP 200, `SYNCED`, `idempotentNoOp=true`, `attemptCount=6`, and the same export path | Postgres persisted `status=SYNCED`, `attempt_count=6`, and 8 audit rows for session 1. |
| Stage 22 online | HTTP 200, `ONLINE`, 640×360, 16,749 bytes, latency 5,628 ms | Local simulated GStreamer RTSP source only. |
| Stage 22 offline | HTTP 200 response carrying `status=OFFLINE`, `success=false`, `bytes=0`, and connection-refused error; Postgres persisted `cameras.status=OFFLINE` | The HTTP 200 is the API's health-probe response convention; the body correctly reports failure. |
| Stage 25 capture | HTTP 200; new session 3 was `REVIEW_REQUIRED`, `source=RTSP_ADAPTER`, 640×360, 16,749 bytes, two attendance records | Postgres persisted `/app/data/captures/session-3-f1a6a0e5-3686-4258-b63e-9a6216167c6a.jpg`; host capture was written at 16,749 bytes. |

The camera and RTSP evidence remains limited to the local simulated stream at `rtsp://127.0.0.1:8554/classsight`. No real IP camera, ONVIF discovery, vendor authentication, packet loss, or network outage was tested.

### Post-run status

All Stage 17–25 implementation/verification commits are present in Git: `069ed3b`, `a86dcfa`, `48cff2b`, `2353164`, `e95df03`, `0b6a79c`, `1bfa4d7`, `4ec1182`, and `23c86f3`. This verification pass adds the clean-clone capture-directory marker, the literal Stage A diff, and this evidence section.
