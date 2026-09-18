# ClassSight Migration Log

## Step A: validation and gated wiring

- 2026-09-18: Confirmed Java 17 and Maven 3.x are available at `C:\Users\vishe\tools\apache-maven`; the initial `mvn` check failed only because Maven was not on `PATH`.
- 2026-09-18: Spring Boot package compiled successfully before migration wiring.
- 2026-09-18: The YuNet and SFace ONNX files are not present in the repository or workspace, so a Java SFace golden-set run cannot initialize yet. No accuracy comparison or threshold decision is claimed until those assets are supplied.
- 2026-09-18: Wired the existing `CLASSSIGHT_PHASE1_ENABLED` gate into single-photo enrollment and attendance. The default remains the legacy HTTP path; enabled mode requires SFace enrollment embeddings and does not write legacy FaceNet columns.
- 2026-09-18: Replaced the active RabbitMQ async call with Spring `@Async` recognition over the filesystem capture path. Failures now persist `FAILED`; the review endpoint remains pollable while work is in progress.
- 2026-09-18: Added and built the React/Vite frontend with login, selection, browser camera/file capture, review polling, confidence/state/quality display, and explicit finalization decisions.
- 2026-09-18: Replaced `docker-compose.yml` with the three-service active stack: PostgreSQL, Spring Boot, and Vite frontend. `docker compose config` passed. Legacy FastAPI/MinIO/RabbitMQ source is retained because Step A comparison authorization is not yet satisfied.
- 2026-09-18: RTSP capture remains implemented and can be exercised with the repository's simulated local RTSP server; physical camera validation is outstanding. The ERP boundary remains the decoupled `ErpProvider` interface and only local CSV/mock validation is available; live ERP validation is outstanding.
- 2026-09-18: Final executable checks passed: `npm run build` for Vite, `mvn test` with 7 tests, and `docker compose config`. No physical camera, live ERP, or SFace golden comparison was claimed.
