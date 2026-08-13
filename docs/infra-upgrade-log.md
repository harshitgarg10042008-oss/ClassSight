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
