# ClassSight

## Positioning

ClassSight is a timetable-aware, substitution-aware attendance platform for
institutions that need faster classroom capture without treating biometric
recognition as an invisible black box.

## What makes it different

- Attendance is evaluated against the scheduled class and section roster.
- Teacher leave and substitutions are part of the attendance workflow.
- Recognition results can require human review instead of silently forcing a
  match.
- Consent, retention, quality warnings, and manual corrections are explicit.

## Pilot plan

1. Configure one institution, one department, and a small synthetic or
   consented pilot cohort.
2. Validate timetable capture, manual fallback, review, correction, and
   reporting with staff.
3. Measure recognition quality, latency, false accepts, false rejects, and
   operational failure rates using the institution's approved evaluation set.
4. Obtain legal, privacy, and safeguarding approval before production use.

## Limitations

Face recognition can fail because of lighting, pose, distance, occlusion, model
limitations, or unsuitable enrollment images. The current liveness signal is
not a guarantee against sophisticated presentation attacks. Institutions must
provide a clear non-biometric attendance fallback and must obtain appropriate
consent and legal review.

This document makes no claims about customers, revenue, market share, or
accuracy that have not been measured and approved.
