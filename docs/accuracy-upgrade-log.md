
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
