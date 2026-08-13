
## Starting Step A — Repository and baseline audit

- Timestamp: 2026-08-13
- Status: Audit started. Existing infrastructure upgrade work, recognition pipeline, golden-set baseline, and security/privacy checks will be inspected before any implementation changes.

## Completed Step A — Repository and baseline audit

The repository was clean at the inherited checkpoint `e706031` before this log was started. The infrastructure loop commits are present in history, including MinIO, RabbitMQ, Next.js, edge spike, and Kubernetes work. The existing FastAPI service already contains blur, brightness, liveness-texture, and minimum-face-size quality signals; the existing Spring services already implement synchronous recognition, feature-flagged RabbitMQ recognition, MinIO-backed captures, and review/finalization rules. The Next.js faculty flow is present and already polls the existing review endpoint.

The previously measured performance bottleneck remains full-resolution dlib HOG detection. The documented A4 profile measured approximately 98,942.91 ms for detection and 102,575.24 ms for the profiled request, against an approximately 100,040.47 ms six-face benchmark. The previously tested 1,200-pixel and 2,000-pixel detector downscaling experiments are rejected and must not be reintroduced because they regressed the golden-set identities.

The unchanged golden-set harness was executed inside the existing face-service image after adding only disposable test-runtime packages (`httpx`, `pika`, `minio`, and Git) to that container. Its current result at `e706031` is 33.33% overall under the checked-in `expected-results.json`: one false negative and three identity mismatches. This does not meet the user-supplied stated historical baseline of 4/4 archival plus 4/4+1 modern rank-1 identities. The checked-in historical `golden-set/accuracy-log.csv` contains 50.0% and 33.33% rows, while `docs/final-push-log.md` describes a corrected investigation baseline separately. This discrepancy is recorded as an unresolved baseline/harness issue; no recognition change will be accepted until the regression methodology and expected mapping are reconciled or the change is proven not to worsen the actual current result.

The current face service does not yet persist or cache enrolled embeddings independently of the request payload, does not expose explicit Recognized/Unknown/Low Confidence/Recapture Required states, does not perform rotation or occlusion checks, and does not integrate crop-first recognition into the production `/recognize` route. Existing RabbitMQ processing is present and must be extended rather than duplicated. The current Next.js page shows generic review records and processing messages but does not yet expose per-face quality/state details or a manual review control for unknown faces.

Live Docker services were available with `sudo docker`, but the host Python environment lacks `face_recognition`, and the checked-in face-service image lacks some test-only packages. The baseline was therefore run in a disposable container environment. No production code was changed in Step A.

Step A stopping point: audit complete; implementation proceeds only with the accuracy safety net active. Unresolved items are the golden-set baseline discrepancy, real 30+ person classroom validation, real IP camera validation, and real ERP identification, all of which remain external or separately scoped.

## Starting Step B — Guarded edge face detection and cropping

- Timestamp: 2026-08-13
- The existing standalone edge spike will be extended into a reusable FastAPI path behind an explicit opt-in flag. The accuracy-safe default remains the current full-frame path until the golden-set comparison proves crop behavior equivalent.

## Completed Step B — Guarded edge face detection and cropping

The FastAPI service now has a reusable padded crop encoder controlled by `EDGE_CROP_ENABLED`, `EDGE_CROP_PADDING`, and `EDGE_CROP_MAX_DIMENSION`. The `/recognize` endpoint accepts an explicit `edge_crop` form field, and the existing RabbitMQ message path accepts `edgeCrop`; no second queue or parallel messaging system was created. The default remains full-frame encoding, preserving compatibility for existing Spring and RabbitMQ callers.

The crop implementation detects faces once on the full image, extracts a padded contiguous crop for each detected box, and generates the embedding from the crop using the original detected box as a known crop location. The response message records whether full-frame or edge-cropped encoding was used.

Validation evidence: Python syntax compilation passed; the unchanged default golden regression returned the same current result as Step A, 33.33% with one false negative and three identity mismatches. A disposable edge-crop golden harness completed both fixtures at HTTP 200 and returned the same aggregate 33.33% result, preserving the known Obama match and the existing archival identity mapping behavior. The crop path therefore did not regress the measured current baseline, but it also did not improve the golden-set accuracy. The documented historical 4/4 plus 4/4+1 baseline remains unreconciled with the checked-in harness and is not claimed as achieved.

Decision: accept the crop path only as an explicit opt-in capability; do not enable it globally or claim a performance win. The current implementation still performs full-resolution HOG detection on the incoming classroom image, so it reduces downstream crop payload needs for edge clients but does not solve the approximately 100-second server-side HOG bottleneck. Real 30+ person classroom validation remains outstanding.

## Starting Step C — Quality checks and confidence states

- Timestamp: 2026-08-13
- Existing Stage 11 blur, brightness, liveness-texture, and minimum-face-size checks will be extended in place. The existing 0.6 distance threshold remains the matching boundary unless an explicit configuration refinement is added and documented.


## Completed Step C — Quality checks and confidence states

The existing FastAPI quality checks were extended rather than rebuilt. Pose checks are available behind `QUALITY_POSE_CHECKS_ENABLED`, with configurable `QUALITY_MAX_ROLL_DEGREES`; missing landmarks or excessive roll produce a recapture warning. The default remains disabled so existing golden behavior is preserved until representative pose fixtures are available.

Recognition responses now distinguish `RECOGNIZED`, `UNKNOWN`, `LOW_CONFIDENCE`, and `RECAPTURE_REQUIRED`. The existing distance threshold remains 0.6 and continues to determine the `matched` boolean; the new state is a refinement and does not silently redefine the threshold. Spring persists the state through Flyway V4, keeps existing PRESENT/ABSENT/REVIEW behavior, and exposes `recognitionState` in the review response.

Validation evidence: six focused FastAPI tests passed; the Spring Boot package compiled successfully with Java 17; the unchanged golden regression returned the same 33.33% current result as Step A and Step B, with one false negative and three identity mismatches. No accuracy regression was introduced relative to the measured current baseline. The historical baseline discrepancy remains unresolved and is not being concealed.

Step C stopping point: state and quality extensions are committed with safe defaults. Rotation/occlusion checks are opt-in pending representative validation, and no threshold was changed.
