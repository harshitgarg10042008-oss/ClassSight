# ClassSight Phase 1 Demo Walkthrough

## Scope and environment

This walkthrough records a live run on 2026-08-13 using the repository’s Docker Compose stack and real JPEG files. The available recognition set is intentionally small: two enrolled students, Barack Obama and Joe Biden, using separate reference photographs. The group photograph is a real cross-photo conference-room image, not a crop of either reference image. The A3 evidence separately documents that these are provisional stand-ins rather than the requested 30+ person back-of-room classroom set.

The Docker sandbox could not reliably attach the Postgres container to the user-defined bridge network. The stack therefore uses the documented host-network fallback, with services communicating through `127.0.0.1`. This is explicit in `docker-compose.yml`; a normal Docker host can remove `network_mode: host` and restore service-name URLs.

## Live steps and evidence

| Step | Live evidence |
|---|---|
| Compose startup | `docker compose up -d` started all three services. Postgres and FastAPI became healthy; Spring became healthy after startup. |
| Spring health | `GET http://127.0.0.1:8080/health` returned `{"service":"backend-spring","status":"UP"}` with HTTP 200. |
| FastAPI health | `GET http://127.0.0.1:8000/health` returned `{"status":"UP","service":"face-service-fastapi"}` with HTTP 200. |
| Postgres | `pg_isready` reported `127.0.0.1:5432 - accepting connections`; a direct SQL query succeeded. |
| Persistence | A real 2,050,577-byte classroom JPEG retained SHA-256 `c6864d38f2ab5258e0a3ced670dcb53cb93d25756b846c9bc520ed3088bac052` and the user count remained `2` across `docker compose restart`. |
| Admin setup | Live ADMIN calls created room 1, camera 1, subject 1, class section 1, assignment 1, and students `LIVE-OBAMA` and `LIVE-BIDEN`. |
| Enrollment | Both `/students/{rollNumber}/enroll` calls returned HTTP 200 with `embeddingSize: 128`; Postgres showed both embeddings present. |
| Capture | The real `obama_biden_group_2010.jpg` capture returned HTTP 200 and created session 1 in `REVIEW_REQUIRED`. The stored file was a valid 4,096 × 2,731 JPEG of 7,075,824 bytes. |
| Recognition | Barack Obama was PRESENT with confidence `0.9164`; Joe Biden was REVIEW with confidence `0.2601`, face-size ratio `0.000716`, and warning `Low-confidence or unmatched face`. Quality passed with blur `119.4734`, brightness `121.3959`, and liveness `0.2605`. |
| Review photo | `GET /api/attendance-sessions/1/review/photo` returned HTTP 200, `image/jpeg`, 7,075,824 bytes. The downloaded file hash matched the persisted capture hash exactly. |
| Review finalization | The first deliberately incorrect payload returned HTTP 400 with the actual contract error. The corrected payload used `decision: ABSENT`; submission returned HTTP 200, `FINALIZED`, and `unresolvedReviewCount: 0`. Postgres showed Obama PRESENT and Biden ABSENT, with Biden reviewed by teacher user 2. |
| Analytics | ADMIN `GET /api/analytics/attendance?subjectId=1&classSectionId=1` returned HTTP 200 and reported one finalized session, Obama 100.00%, Biden 0.00%, and Biden as a defaulter under the 75% threshold. |
| PDF | ADMIN PDF download returned HTTP 200, `application/pdf`, 1,373 bytes. `pdfinfo` identified a valid one-page PDF, OpenPDF 1.3.39, A4 page size, PDF version 1.5. |

## Recognition limitation

The A3 golden-set result is not a clean pass. On the thumbnail-based production-path run, the manually verified Obama face matched at distance `0.468574` and display confidence `0.788225`. The manually verified Biden face was correctly ranked as Biden but had distance `0.669362`, so it was routed to review at the unchanged `0.6` distance threshold with display confidence `0.333229`. The first regression row therefore records 50.00% expected-present accuracy, one false negative, and zero false positives. This is an honest review-queue result, not a threshold-adjustment claim.

## Reproduction

Start the stack with `docker compose up --build`, use the ADMIN setup endpoints to create a room, camera, subject, class section, assignment, and students, enroll separate reference photos, then submit the group photo to `/capture`. The exact endpoint payloads and regression commands are documented in the repository’s `golden-set/README.md` and A3 outputs.
