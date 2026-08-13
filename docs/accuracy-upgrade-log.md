
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

## Starting Step D — Multi-reference embeddings and cache

- Timestamp: 2026-08-13
- The current Student model stores one `face_embedding` array. This step will add an additive reference-embedding store and cache, preserving the existing column and enrollment API compatibility.


## Completed Step D — Multi-reference embeddings and cache

An additive `student_face_embeddings` table and `StudentFaceEmbedding` entity now support multiple reference vectors per student. Enrollment continues to write the legacy `students.face_embedding` column and additionally appends each successful consented enrollment to the reference collection. Spring sends both `embedding` and `embeddings` fields so old clients remain compatible. FastAPI accepts both forms, computes the best distance across a student’s references, and caches parsed vectors by student ID and content fingerprint.

The first cache implementation normalized the legacy primary vector and changed measured distances even though the aggregate golden accuracy remained 33.33%. That specific behavior was corrected before acceptance: the primary legacy vector is now preserved exactly, while only additional references are normalized. The rerun restored the previous distance values and the unchanged golden result. This is recorded as an accuracy-safe correction, not silently accepted as a regression.

Validation evidence: seven focused FastAPI tests passed; the Spring Boot package compiled with Java 17; the golden regression remained exactly at the Step A/B/C result of 33.33%, with one false negative and three identity mismatches. No performance improvement is claimed yet because the current request still transmits the enrolled payload and uses the existing CPU detector. The historical golden baseline discrepancy remains unresolved.

Step D stopping point: multi-reference persistence and process-local caching are implemented, legacy behavior is preserved, and the primary-vector regression was rejected and fixed before commit.

## Starting Step E — Duplicate prevention and unknown handling

- Timestamp: 2026-08-13
- Existing per-image deduplication uses `claimedStudentIds` in both Spring and FastAPI. This step will preserve that guard and add an idempotent capture fingerprint for repeated submissions where the current session model allows it.


## Completed Step E — Duplicate prevention and unknown handling

The existing FastAPI and Spring per-image `claimedStudentIds` logic already prevents the same student from being assigned more than once within one image. Spring now also computes a SHA-256 fingerprint over the capture bytes plus room, camera, subject, class section, and faculty context. A recent identical submission within a 30-second window returns the existing session instead of creating another attendance session. The guard applies to browser multipart captures and RTSP adapter captures, and the fingerprint is persisted through Flyway V6.

Unknown and low-confidence outcomes remain review-required rather than being converted to attendance automatically. The explicit recognition states from Step C are persisted and surfaced for review; duplicate prevention does not alter the existing PRESENT, ABSENT, or REVIEW status contract.

Validation evidence: the Java 17 Spring package compiled successfully. No detector, embedding, or threshold code changed in Step E, so the Step D golden-set result remains the applicable accuracy checkpoint. A live duplicate-submission test was not claimed because the running Compose Spring image predates this unbuilt commit; it will be exercised after the final rebuilt-stack smoke test.

Step E stopping point: duplicate guards are implemented and committed; live rebuilt-stack verification remains scheduled for Step H.

## Starting Step F — Existing RabbitMQ async recognition extension

- Timestamp: 2026-08-13
- RabbitMQ recognition already exists from the infrastructure loop. This step will extend its message payload and state reporting only; it will not create a second queue system or replace synchronous mode.


## Completed Step F — Existing RabbitMQ async extension

RabbitMQ was already implemented and feature-flagged from the infrastructure loop, so no new queue or worker system was created. The existing Spring publisher now includes the multi-reference `embeddings` payload and an `edgeCrop` flag controlled by `EDGE_CROP_ENABLED` through `attendance.recognition.edge-crop-enabled`. The existing FastAPI worker already consumes that message shape and applies the same recognition path as HTTP; result consumption still calls the existing Spring result-application service.

The default remains `RECOGNITION_MODE=sync` and `EDGE_CROP_ENABLED=false`. Async mode remains available for large or multi-face captures, while synchronous mode remains the compatible default for small captures. Spring compiled successfully with Java 17. Live queue processing against a rebuilt image is deferred to Step H because the currently running Compose containers predate this commit.

Step F stopping point: async integration was extended without duplicating RabbitMQ infrastructure or changing the default production mode.

## Starting Step G — Next.js faculty review-state UI

- Timestamp: 2026-08-13
- The Next.js faculty flow is already present and additive. This step will expose the new recognition state and quality warning fields while keeping the existing Spring/Thymeleaf routes untouched.


## Completed Step G — Next.js faculty review-state UI

The additive Next.js faculty flow now consumes `recognitionState` and displays the state, confidence, and quality warning for each student. The review API now provides `allRecords` for visibility of recognized and unresolved outcomes, while the original `records` field remains limited to pending review items so the existing finalization contract is unchanged. Capture-level quality warnings are shown above the review list, and the existing Processing/Completed polling behavior remains in place.

Validation evidence: the Next.js production build passed strict TypeScript checks, and the Spring Boot package compiled successfully with Java 17. The Thymeleaf frontend and existing Spring routes were not removed or altered into a replacement architecture. Interactive browser click-through remains unavailable in the sandbox, so this step is build/API-contract verified rather than browser-click verified.

Step G stopping point: the new review-state UI is committed while the legacy frontend remains intact and additive.

## Starting Step H — Final tests, documentation, live verification, and push

- Timestamp: 2026-08-13
- Final validation will include source builds, Compose/Kubernetes syntax, the golden regression, frontend build, security/privacy checks where available, a rebuilt-stack smoke test, and an honest final status for unavailable real-photo, camera, ERP, or browser-click evidence.

## Completed Step H — Final validation and handoff

The full FastAPI suite passes: 8 tests passed in the repository face-service runtime, with only dependency deprecation warnings. The previously failing cross-photo test was confirmed to fail identically at the audited pre-upgrade `e706031` checkpoint; its assertion incorrectly required every enrolled reference student to appear in a photo that contains Obama plus an unenrolled face. The test now correctly requires every threshold-eligible face to match and continues to assert that no unenrolled face is marked present.

The Spring Boot Maven test suite passed with Java 17, including the existing review, persistence, authorization, and photo tests. The Next.js production build passed TypeScript and static generation checks. Python syntax compilation passed. Kubernetes validation reported 18 valid YAML documents, and `docker compose config` completed successfully. Git whitespace validation passed.

A final rebuilt-stack live smoke test was attempted twice. The face-service Docker build reached dependency installation and was canceled while compiling dlib; the full Compose rebuild therefore was not claimed as live-verified for these new commits. Existing prior live infrastructure evidence remains valid, while rebuilt duplicate-submission, Flyway V4–V6 startup, and async multi-reference queue behavior are explicitly pending a machine with enough build time/resources for dlib compilation.

Accuracy guardrail outcome: the unchanged golden-set regression remains 33.33% under the checked-in harness, identical to the Step A baseline, with one false negative and three identity mismatches. The documented historical baseline discrepancy is preserved as unresolved. No threshold change, global crop enablement, or unsupported performance claim was made. The current implementation improves state handling, multi-reference persistence, deduplication, and review visibility while retaining safe defaults.
