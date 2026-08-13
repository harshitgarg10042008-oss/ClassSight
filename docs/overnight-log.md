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
