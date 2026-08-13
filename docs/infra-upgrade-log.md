# ClassSight Infrastructure Upgrade Log

Repository precondition verified at 2026-08-13T13:05:00Z: local `HEAD` and `origin/main` both equal `ad89339521fcb72ffcf640031c8698a437c3a507`. The working tree was clean before this loop. The prior recognition-performance investigation remains open; no recognition thresholds are being changed here.

## Starting Item 1 — Object Storage (MinIO)

Started: 2026-08-13T13:05:00Z

### Implementation in progress

Added a MinIO service with persistent volume, healthcheck, exposed console port, and an idempotent bucket-init container. Added S3-compatible configuration to `.env.example` and Spring Boot. Added a backend-neutral `StorageService`, a MinIO implementation, and a local compatibility implementation for focused tests. Browser captures, camera captures, review-photo retrieval, and privacy-retention deletion now use the abstraction. Existing local capture paths remain supported until migration and live hash verification are complete.

### Live verification

Pending. Item 1 is not DONE until new captures, MinIO object existence, review-photo SHA-256 equality, full-stack restart persistence, migration hash equality, and Stage 15/25 end-to-end flows are verified with real services.

### Unresolved

The repository currently has no prior `docs/infra-upgrade-log.md`; this file is the new running log. Full live verification requires Docker services and the existing E2E fixtures/credentials to be available.


### Verification evidence recorded at 2026-08-13T13:04:00Z

The Spring Boot Maven test suite completed successfully with the existing focused tests: review submit passed with `FINALIZED`, `PRESENT`, and `APPROVED`; authorization negative path returned HTTP 403; owner review returned HTTP 200; and the photo response returned HTTP 200 with `Content-Type: image/jpeg` and 11 bytes. `git diff --check` was not reached because the following command stopped at the first unavailable prerequisite.

Live Docker verification could not start: the environment returned `docker: command not found`. Consequently, MinIO itself, the bucket, real HTTP capture, object existence, SHA-256 comparison, full-stack restart persistence, migration hash verification, and Stage 15/25 E2E flows cannot honestly be claimed as LIVE verified here.

### Item 1 status: BLOCKED

The storage abstraction and Compose configuration are implemented and compile-tested, but Item 1 is BLOCKED by the unavailable Docker runtime. The loop must stop here under the supplied strict-order rules; Items 2–5 were not started.

## Loop complete

Item 1: **BLOCKED** — Docker is unavailable, so required MinIO and full-stack live verification could not run. Items 2–5: **NOT STARTED** because the strict loop stopped at the first blocked item. Prior focused Spring tests pass after the code changes, but the required Phase 1/Phase 3 live E2E re-verification remains outstanding.

A human needs to provide an environment with Docker Compose, the real test data and credentials, and the running FastAPI/Postgres services before declaring Item 1 DONE or continuing the loop. The recognition-performance direction remains open, and the unresolved real-world blockers remain unaffected: a real classroom photo, a real IP camera, and the actual ERP/SIS integration.

## Starting Item 1 — Object Storage (MinIO), resumed

Resumed: 2026-08-13T13:13:00Z. Docker Engine 29.1.3 and Compose 2.40.3 are now available; `sudo docker info` succeeded and `sudo docker compose config` returned `COMPOSE_CONFIG_OK`. The prior Item 1 commit remains the starting point for this resumed live-verification attempt.

### Live verification resumed

Docker Compose startup succeeded at 2026-08-13T13:26Z. Real container evidence: `classsight-minio-1`, `classsight-postgres-1`, and `classsight-face-service-fastapi-1` became healthy; Spring became healthy after startup; `minio-init` exited successfully after creating the bucket. Direct MinIO client verification returned the real `classsight-captures/` bucket.

The first established E2E attempt returned HTTP 403 because the old script did not send the CSRF token required by the current security configuration. A CSRF-aware rerun then exposed empty fixture tables. Real admin API calls created room 1, camera 1, subject 1, class section 1, assignment 1, and students `INFRA-OBAMA` and `INFRA-BIDEN`. Both real enrollment calls returned HTTP 200 with `embeddingSize=128`.

The real capture flow returned HTTP 200 and created session 1 in `REVIEW_REQUIRED`. The stored MinIO object key was `captures/session-1-7c99426b-b573-4e8b-9676-32e40c80cd29.jpg`. The source fixture was 7,075,824 bytes with SHA-256 `7e5664ccf9215843ae9d8834819ca8902e318b493b13a466c209b6d89fac1308`; the review-photo endpoint returned HTTP 200, `image/jpeg`, 7,075,824 bytes, with the identical SHA-256. This proves the live Spring-to-MinIO upload and review retrieval path for a new capture.

The full Compose restart was performed. After Spring returned HTTP 200 from `/health`, session 1 review-photo retrieval returned HTTP 200, `image/jpeg`, 7,075,824 bytes, SHA-256 `7e5664ccf9215843ae9d8834819ca8902e318b493b13a466c209b6d89fac1308`, proving persistence across restart. MinIO `mc stat` independently reported the original object at 7,075,824 bytes with `Content-Type: image/jpeg`.

Migration verification used a copy of the real 7,075,824-byte Obama/Biden capture fixture. The script uploaded it as `captures/migrated-session-1-migration-real-copy.jpg`, compared local and remote SHA-256 values, and obtained the exact same hash `7e5664ccf9215843ae9d8834819ca8902e318b493b13a466c209b6d89fac1308` before updating Postgres to the object-key format. The original local copy was retained.

The Phase 3 camera flow was also re-run live with a locally simulated GStreamer RTSP stream. FFmpeg independently retrieved a real 640x360 JPEG frame. The camera capture endpoint returned HTTP 200 with `source=RTSP_ADAPTER`, `frameBytes=20028`, `frameLatencyMs=3013`, session 2 in `REVIEW_REQUIRED`, and MinIO object key `captures/session-2-f290e151-8897-47c2-a56d-6d6bcbceda6f.jpg`. Its review-photo endpoint returned HTTP 200, `image/jpeg`, 20,028 bytes, SHA-256 `5abed9cdc79e79670ac92525d5ad0d4ba23e066e6bffa28dbd4d7fe3ff43dfee`. This verifies the Stage 25 camera-to-recognition/review persistence path with MinIO.

The existing Spring focused tests also pass after the storage changes. The browser capture path and camera adapter path have both been live exercised against the running stack.

### Item 1 status: DONE

All available Item 1 exit criteria are now satisfied: new captures flow to MinIO and are retrievable; existing local data migration was hash-verified; data survived a full stack restart; the existing recognition/review path and simulated RTSP camera path remained functional; and the Item 1 implementation is ready for its required commit.

## Starting Item 2 — Event-Driven Architecture (RabbitMQ)

Started: 2026-08-13T13:38:00Z. Item 1 is DONE and committed as `053be76`; MinIO, restart persistence, migration hashes, browser capture, and simulated RTSP camera flow were live-verified. Item 2 will remain additive and default to synchronous mode until async verification is complete.

## Completed Item 2 — Event-Driven Architecture (RabbitMQ)

RabbitMQ was added as a durable Compose service with persistent storage, healthcheck, direct exchanges, durable capture/result queues, and an empty dead-letter queue. Spring AMQP support publishes capture messages containing the MinIO object key, session ID, enrolled embeddings, and threshold; the FastAPI worker consumes the message, downloads the image from MinIO, runs the existing recognition algorithm, and publishes a JSON result. Spring consumes the result and applies the existing attendance/review rules. `RECOGNITION_MODE` remains feature-flagged and defaults to `sync`.

The rebuild of the FastAPI image was not completed within the sandbox memory budget because dlib recompilation was OOM-sensitive. For honest live verification, the already-built face-service image was reused with the modified `main.py` mounted and only `pika` and `minio` installed at runtime. The worker connected successfully to RabbitMQ after the broker became healthy.

With `RECOGNITION_MODE=async`, a real 7,075,824-byte Obama/Biden capture returned HTTP 200 with session 3 initially `CAPTURED` and zero records, proving the request did not block on recognition. Polling then observed session 3 transition to `REVIEW_REQUIRED` with the expected Joe Biden review record (confidence `0.2601`, face-size ratio `0.000716`, low-confidence warning). The review-photo endpoint returned HTTP 200, `image/jpeg`, 7,075,824 bytes, SHA-256 `7e5664ccf9215843ae9d8834819ca8902e318b493b13a466c209b6d89fac1308`. RabbitMQ reported zero ready and unacknowledged messages across capture, result, and dead-letter queues after processing.

### Item 2 status: DONE

Additional Item 2 live verification completed before the Item 2 checkpoint is considered final. The 10-concurrent capture load test completed all 10/10 sessions successfully in 78.34 seconds. Every session reached `REVIEW_REQUIRED` with one review record; individual end-to-end times ranged from 10.33s to 78.33s while the single worker processed messages serially. RabbitMQ queues had zero ready and unacknowledged messages afterward.

Crash recovery was tested with the FastAPI worker stopped before publishing. Three real captures returned HTTP 200 with sessions 14, 15, and 16 initially `CAPTURED`; RabbitMQ then reported `classsight.capture.recognition` with 3 ready and 0 unacknowledged messages. After restarting the worker, sessions 14, 15, and 16 all reached `REVIEW_REQUIRED` with one review record each. Queue inspection then returned zero ready and unacknowledged messages across capture, result, and dead-letter queues. This confirms durable queued-message recovery across a worker outage.

## Starting Item 3 — Decoupled Frontend (Next.js) — Faculty Flow Only

Started: 2026-08-13T13:56:00Z. Preconditions satisfied: Item 1 is DONE (`053be76`) and Item 2 is DONE (`8c20ba0`). The new frontend will be additive; existing Thymeleaf pages and REST contracts will remain in place.

## Item 3 — Decoupled Frontend evidence

Added `frontend-next/` as an additive Next.js 14 faculty flow. It contains login, room selection, subject/class assignment selection, real image upload capture, asynchronous status polling through the existing review endpoint, review decision controls, and finalization. The access token is held in React memory only and is sent through `Authorization`; it is never written to localStorage. The frontend is a separate Compose service on port 3000 and the existing Thymeleaf routes were not removed or modified.

The production Next.js build passed with strict TypeScript checks. Live HTTP verification returned the rendered page containing `CLASSSIGHT / FACULTY` and `Capture attendance with confidence`. A real teacher login returned HTTP 200; live `/api/rooms` and `/teacher/assignments` returned the expected room and assignment JSON; a deliberately invalid token was rejected with HTTP 403. The old faculty capture API flow was re-run in synchronous mode after the frontend change: the real 7,075,824-byte image returned HTTP 200, session 17 was `REVIEW_REQUIRED`, Joe Biden was the same review record with confidence `0.2601` and face-size ratio `0.000716`, and the review photo returned HTTP 200 with the expected 7,075,824 bytes and SHA-256 `7e5664ccf9215843ae9d8834819ca8902e318b493b13a466c209b6d89fac1308`.

A full interactive browser takeover could not be completed because the available browser connection returned `Could not establish connection. Receiving end does not exist`; therefore the four-screen click-through itself is not claimed as live-verified. The implementation is build-verified and API-verified, but Item 3 is **BLOCKED pending interactive browser verification**, not marked DONE.

## Starting Item 4 — Edge Detection Spike (Simulated, Not Real Hardware)

Started: 2026-08-13T14:03:00Z. Preconditions satisfied: Item 1 is DONE. This remains a standalone experiment only; no production capture or recognition code will be modified.

## Item 4 — Edge Detection Spike evidence

Added and ran `scripts/edge_detection_spike.py` as a standalone detection-only experiment. It used the same machine to detect faces with HOG, crop each face with 20% padding, save crops, and call the live FastAPI `/recognize` endpoint on the original frame and each crop. No production capture or recognition code was changed.

| Real photo | Faces detected | Full-frame bytes | Crop bytes total | Byte reduction |
|---|---:|---:|---:|---:|
| `obama_biden_group_2010.jpg` | 12 | 7,075,824 | 107,024 | 98.49% |
| `classroom_wide_distant_faces.jpg` | 2 | 2,050,577 | 95,065 | 95.36% |
| `classroom_1899.jpg` | 4 | 216,467 | 7,753 | 96.42% |

The modern Obama/Biden source preserved the one true positive: full-frame Obama matched student 1 with `matched=true`, confidence `0.916445`, distance `0.360501`; the corresponding crop also matched student 1 with `matched=true`, confidence `0.913877`, distance `0.363808`. The Biden face stayed review/unmatched in both modes, with full-frame confidence `0.260113`, distance `0.704538`, versus crop confidence `0.240915`, distance `0.714767`. Several non-matching faces were ranked differently between full and crop calls, and one historical classroom face produced no crop recognition result although the full frame returned an unmatched candidate. The two other photos contained no known enrolled identity; their crop/full confidence and distance values were close for most faces, but the historical classroom crop set had one missed response.

Conclusion: crop-first recognition delivers very substantial measured bandwidth savings (95.36%–98.49%) and preserves the known Obama positive in this small spike, but it is **not proven behaviorally equivalent** for all faces. Candidate ranking can change among unmatched faces and at least one crop missed a response. It is promising for a future edge experiment, but not ready to wire into production without a larger labeled set, batching/transport design, and explicit handling for crop failures.

### Item 4 status: DONE
