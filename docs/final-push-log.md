# ClassSight Final Push Log

This log records the remaining backfill and Phase 4 hardening work from the combined roadmap. Each item records actual implementation, live evidence, unresolved limitations, and its Git checkpoint.

## Checkpoint

**Started:** 2026-08-13
**Base commit:** `9cfbe57` (`Document post-run verification and clean capture mount`)

The three non-buildable real-world inputs remain explicitly out of scope: a real 30+ person classroom image, a real IP camera/RTSP source, and identification of the college's actual ERP/SIS contract.

## Starting Item #2 — multi-face rejection in /enroll
**Started:** 2026-08-13T10:40:00Z

The live test uses the real repository image `golden-set/obama_biden_group_2010.jpg` for the multi-face case and the real one-face image `golden-set/largegroup-1899/refs/candidate_00.jpg` as the control.

## Completed Item #2 — multi-face rejection in /enroll
**Completed:** 2026-08-13T10:41:00Z

The multi-face request was sent to `POST /students/LIVE-OBAMA/enroll` as an authenticated multipart upload. It returned HTTP **400** with:

```json
{"enrollmentTimeMs":5975,"message":"Multiple faces detected (12). Please provide an image with exactly one face.","status":"error"}
```

The genuine single-face control request returned HTTP **200**:

```json
{"studentId":1,"rollNumber":"LIVE-OBAMA","enrollmentTimeMs":206,"embeddingSize":128,"message":"Student enrolled successfully","status":"success"}
```

Postgres confirmed `LIVE-OBAMA` has an embedding after the control test. The multi-face request did not silently choose one face. The endpoint's existing FastAPI guard rejects `face_count > 1` before the Spring controller saves an embedding.

**Item #2 status: SUCCEEDED.**
**Git checkpoint:** this log entry is committed in the Item #2 verification commit.

## Starting Item #3 — CRUD update/delete for Room, Camera, Subject, Assignment
**Started:** 2026-08-13T10:43:00Z

The existing admin PUT handlers were exercised and DELETE handlers were added for all four entities. Delete behavior is dependency-aware: rooms return a conflict while cameras reference them, and subjects return a conflict while assignments reference them.

## Completed Item #3 — CRUD update/delete for Room, Camera, Subject, Assignment
**Completed:** 2026-08-13T10:46:00Z

Live admin evidence used temporary records and was followed by cleanup. Room create/update returned HTTP **200** and persisted the changed name, building, floor, and capacity. Camera create/update returned HTTP **200** and persisted changed name, status, and stream URL. Deleting the temporary room while its camera existed returned HTTP **409** with `Room cannot be deleted while cameras reference it`. After deleting the camera, deleting the room returned HTTP **204**.

Subject create/update returned HTTP **200** and persisted the changed code, name, and description. A temporary assignment create/update returned HTTP **200** and persisted `active=false`. Deleting the subject while the assignment existed returned HTTP **409** with `Subject cannot be deleted while assignments reference it`. After deleting the assignment, subject deletion returned HTTP **204**.

A teacher attempting `PUT /admin/rooms/1` received HTTP **403**. A teacher attempting `DELETE /admin/cameras/1` received HTTP **403**. Postgres cleanup queries returned zero rows for the temporary room, camera, subject, and assignment IDs.

The implementation adds `DELETE /admin/rooms/{id}`, `/admin/cameras/{id}`, `/admin/subjects/{id}`, and `/admin/assignments/{id}`. Room and subject dependency checks return explicit 409 responses instead of leaking persistence exceptions.

**Item #3 status: SUCCEEDED.**
**Git checkpoint:** this implementation and evidence are committed in the Item #3 commit.

## Starting Item #4 — Flyway migrations
**Started:** 2026-08-13T10:47:00Z

The current database schema was exported from the live Postgres instance. Flyway was added, Hibernate schema ownership was changed from `ddl-auto: update` to `ddl-auto: validate`, and baseline/status-constraint migrations were created.

## Completed Item #4 — Flyway migrations
**Completed:** 2026-08-13T11:15:00Z

Added `V1__baseline.sql` containing the verified current schema and `V2__status_constraints.sql` documenting the camera and attendance-session status checks. The first fresh-volume attempt exposed a real portability issue: `pg_dump` emitted `\\restrict`/psql meta-commands that JDBC cannot execute. Those lines were removed, the artifact was rebuilt, and the fresh test was repeated successfully.

Existing populated database evidence: the Flyway-enabled Spring jar started healthy; Postgres contained **2 students** and **3 attendance sessions**, and `flyway_schema_history` contained a successful baseline row plus successful V2 status-constraint migration.

Fresh-volume evidence: a new temporary Postgres 15 database started with no application tables. The Flyway-enabled application logged `Successfully validated 2 migrations`, `Successfully applied 2 migrations to schema public, now at version v2`, and started on port 18080. The fresh database then contained **12 public tables** and successful history rows for versions `1` and `2`. No Hibernate-generated schema was required.

The Maven/package build succeeded. A Docker runtime-layer rebuild encountered a network stall while reinstalling Alpine FFmpeg, so the live migration verification used the already FFmpeg-capable Spring container with the newly built jar; this is an infrastructure-build limitation, not a Flyway migration failure. A full clean-clone image rebuild should be repeated when the Alpine mirror is responsive.

**Item #4 status: SUCCEEDED WITH DOCKER BUILD LIMITATION.**

## Starting Item #5 — Map.of nullable-field audit
**Started:** 2026-08-13T11:16:00Z

All production `Map.of` call sites were searched. The concrete nullable-message risk was in `ReviewExceptionHandler`, where `exception.getMessage()` could be null and cause a secondary `NullPointerException` while constructing the error response.

## Completed Item #5 — Map.of nullable-field audit
**Completed:** 2026-08-13T11:19:00Z

`ReviewExceptionHandler` now builds error bodies with a null-tolerant `LinkedHashMap` and uses the exception class name when the exception message is null. The other inspected `Map.of` responses either use constants, validated non-null fields, or concatenate into a guaranteed non-null string. Camera probe/adapter failure paths were also reviewed; their failure messages are now expected to be non-null for normal error construction, while the review advice is protected independently.

The focused live build test passed: `AttendanceReviewControllerTest` ran **4 tests, 0 failures, 0 errors**. The new regression covers an `IllegalArgumentException` with a null message and confirms HTTP 400 JSON with `error=BAD_REQUEST` and `message=IllegalArgumentException`. Existing 403 and photo tests also remained green.

**Item #5 status: SUCCEEDED.**
