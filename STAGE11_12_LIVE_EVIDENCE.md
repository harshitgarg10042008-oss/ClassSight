# Stage 11/12 Live Verification Evidence

Date: 2026-08-13 (sandbox time)

## Face-size edge-case checks

A real 3,840 x 2,560 classroom photograph (`face-service-fastapi/tests/fixtures/classroom_wide_distant_faces.jpg`, 2,050,577 bytes) was submitted to `POST /capture` with the authenticated owning-teacher session. The endpoint returned HTTP 200 and created session 7 in `REVIEW_REQUIRED`. Persisted quality metrics were blur_score 945.25, brightness_mean 138.20, liveness_score 0.3764, and `quality_passed=true`. The only records had no persisted face-size ratio for the unmatched detection; the Obama record had ratio 0.010482, which is above 0.0005, and the Biden record was `No enrolled face match`.

A second real 959 x 752 public-domain auditorium photograph (`face-service-fastapi/tests/fixtures/auditorium_tiny_faces.jpg`, 158,096 bytes) was submitted live. The endpoint returned HTTP 200 and created session 8 in `REVIEW_REQUIRED`. Persisted quality metrics were blur_score 4978.45, brightness_mean 97.77, liveness_score 1.0000, and `quality_passed=true`. A direct call to `/recognize` with the same image returned HTTP 200 with `face_count: 0`, `matches: []`, and no quality warnings. The two session records were `No enrolled face match` with null face-size ratios. Therefore the 0.0005 warning was not triggered: the tiny-face image did not produce a detectable face, so there is no honest evidence that a detected face below the threshold is handled in the live stack. The threshold is likely below the practical operating range for this detector; the implementation should retain the current threshold or be recalibrated only after a detector-supported small-face fixture is available, rather than claiming this edge case passed.

## ADMIN analytics and PDF checks

Authenticated live as seeded ADMIN (`admin` / `admin123`), receiving HTTP 200 and role `ADMIN`. Using subjectId=1 and classSectionId=1:

- `GET /api/analytics/attendance` returned HTTP 200, `Content-Type: application/json`, 547 bytes. The body reported `finalizedSessionCount: 2`, `defaulterThreshold: 75.0`, Barack Obama at 100.00% (2/2), Joe Biden at 0.00% (0/2), and Joe Biden in the defaulter list.
- `GET /api/analytics/attendance/report.pdf` returned HTTP 200, `Content-Type: application/pdf`, 1,375 bytes. `file` identified a PDF document version 1.5 with one page; `pdfinfo` reported Producer OpenPDF 1.3.39, A4 page size, and the file began with `%PDF-1.5`.

These results demonstrate successful ADMIN authorization for both analytics JSON and PDF report generation.
