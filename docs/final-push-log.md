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
