# Known limitations

The current face recognition implementation uses the dlib HOG detector and CPU embeddings. The A4 benchmark measured approximately 100 seconds for a six-face group recognition request in the current environment, so the implementation should not be treated as ready for a 30-person classroom without performance work.

The RTSP verification used a local GStreamer-generated stream. It proves the adapter, health state, persistence, and failover flow, but does not prove compatibility with a real vendor camera, ONVIF discovery, camera authentication, NAT/firewall behavior, packet loss, or camera outage recovery on a real network.

The ERP integration remains a local CSV provider because the college’s real ERP/SIS and import contract are not known. The CSV is a provisional interchange format and must not be represented as a completed production ERP integration.

Privacy retention and enrollment consent are implemented. A dedicated student-facing enrollment screen with a visible checkbox is not present; the enrollment API requires `consentGiven=true` and persists the authenticated actor, timestamp, and decision. The privacy notice is a draft implementation document and requires institutional/legal review.

Camera credentials are encrypted with AES-GCM, but automated key-versioned rotation and re-encryption are not implemented. A controlled manual re-encryption procedure is documented in `docs/security.md`.

The benchmark and live checks used seeded development data and local services. Production deployment still requires secret rotation, TLS termination, restrictive network policy around port 8000, database backups, centralized audit-log retention, monitoring, and institutional approval of biometric processing.
