# Known limitations

- The 30-face API enrollment and double-submit test is not verified.
- The 3 face-size x 3 seed retake matrix is not verified.
- The full browser enrollment/capture/review/finalize flow is not verified.
- E7 near-duplicate flag, E8 detected-count warning, E9 replace/archive flow, E10 retry guard, E12 group source-photo storage, and R1-R5 beyond the existing UI are not covered by automated end-to-end proof.
- Real webcam behavior and real classroom accuracy are not verified.
- Native 512-d cosine comparison is not part of the current pipeline.
- Embeddings are stored unencrypted.
- Consent timestamp and the 30-day purge job are not verified.
- No request rate limiting or automated backup verification is provided.
- Next.js 14.2.12 has known vulnerabilities and is intentionally not upgraded in this release.
- The multi-shot finalise path can finalize a clean accumulator by explicit faculty action; single-capture attendance requires the review call.
- RTSP vendor compatibility, ONVIF discovery, network outage recovery, and production ERP integration are not verified.
## Frontend Prompt 8 limitations

- Admin and owner panels are static demo surfaces until role-aware APIs are wired.
- Legal pages are draft templates with placeholders and require legal review.
- Prices and plan limits remain unset; null prices render as "Contact us".
- Notifications, retention controls, SSO, liveness, and external ERP integrations are not complete product workflows.
- Face embeddings are currently not encrypted at rest.
- The frontend does not provide dark mode.
