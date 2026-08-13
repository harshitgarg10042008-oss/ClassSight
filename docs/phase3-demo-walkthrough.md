# Phase 3 Demo Walkthrough — RTSP Camera Attendance

## Scope

This walkthrough verifies the camera-sourced attendance flow. The simulated RTSP stream is used only because no real IP camera is available. The attendance recognition and review logic is the same path used by browser capture; only the frame source changes to `RtspCameraAdapter`.

## Live source

The GStreamer test stream ran at `rtsp://127.0.0.1:8554/classsight` and produced a 640 × 360 JPEG test-pattern frame. The adapter reported `frameBytes=16749` and `frameLatencyMs=5638`.

## Capture through the adapter

A fresh authenticated owner-teacher session was used after the earlier stale cookie returned HTTP 403. The request was:

```http
POST /capture/from-camera
Content-Type: application/json
Cookie: jwt=<fresh teacher session>

{"roomId":1,"cameraId":1,"assignmentId":1}
```

The live response was **HTTP 200**:

```json
{
  "status":"success",
  "source":"RTSP_ADAPTER",
  "sessionId":2,
  "sessionStatus":"REVIEW_REQUIRED",
  "attendanceRecordCount":2,
  "frameWidth":640,
  "frameHeight":360,
  "frameBytes":16749,
  "frameLatencyMs":5638
}
```

The adapter wrote the frame to the capture storage path, and the normal capture-photo storage copied it to:

`/app/data/captures/session-2-998379a0-0c00-483c-8475-36a21df76597.jpg`

The host copy was a valid 640 × 360 JPEG of **16,749 bytes**, SHA-256 `edaab3c209a066a8f38c3717e55a0a7157baf0886542fc63b88a0fb98b003ff4`.

## Recognition and review

The unchanged recognition path processed the frame and returned `REVIEW_REQUIRED`. Both enrolled students were routed to review with `No enrolled face match`; no attendance was silently marked PRESENT from the test pattern. The review API returned HTTP 200 and showed the persisted photo URL and quality metrics: brightness mean `117.6763`, blur score `7082.9028`, liveness score `1.0`, and `qualityPassed=true`.

The owner teacher submitted:

```json
{"decisions":[{"studentId":1,"decision":"ABSENT"},{"studentId":2,"decision":"ABSENT"}]}
```

The review endpoint returned **HTTP 200**:

```json
{"sessionId":2,"unresolvedReviewCount":0,"status":"FINALIZED"}
```

Postgres then reported session `2` as `FINALIZED`, with student `1` ABSENT and student `2` ABSENT. Both records had `review_status=1` and `reviewed_by=2`, the owner teacher.

After finalization, the review API returned HTTP 200 with `records:[]` and `status:"FINALIZED"`. The review-photo endpoint returned HTTP 200, a valid JPEG of **16,749 bytes**, and the exact same SHA-256 as the persisted host photo.

## Authorization

A teacher request to the ADMIN-only camera adapter endpoint returned **HTTP 403**. The earlier stale-cookie 403 on `/capture/from-camera` was corrected by authenticating a fresh owner-teacher session; it was an expired-session setup issue, not an application authorization failure.

## Phase 3 conclusion

**Phase 3 is verified end-to-end with the simulated RTSP pipeline:** adapter capture → persisted photo → unchanged recognition/review path → owner decision → finalized Postgres records. A real IP camera, ONVIF discovery, and vendor/NVR behavior remain untested and are not claimed.
