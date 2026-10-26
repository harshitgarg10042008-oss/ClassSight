## Task 1: Finalize Route Investigation - COMPLETED

**Status:** PASS - No code fix needed

**Summary:**
- Backend has `POST /api/attendance-sessions/{sessionId}/review` (AttendanceReviewController.java:61)
- Frontend correctly calls this endpoint (page.tsx:336)
- Test script error was calling non-existent `/finalize` endpoint
- HTTP 500 was due to Spring's handling of unmatched method on valid controller path

---

## Task 2: Real-Face Plumbing Through API

**Status:** Starting - Fetching LFW dataset