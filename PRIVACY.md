# ClassSight Privacy & DPDP Act 2023 Compliance Documentation

ClassSight processes biometric facial data strictly for automated classroom attendance verification in compliance with India's **Digital Personal Data Protection (DPDP) Act, 2023**.

---

## 1. Notice and Explicit Consent
- **Opt-in Requirement**: Biometric enrollment requires explicit consent (`consentGiven=true`).
- **Audit Tracking**: Every consent event records:
  - `consentedAt`: Precise timestamp of consent.
  - `consentedBy`: Authenticated user ID (administrator or authorized enrollment officer).
- **Informed Choice**: Students not consenting to biometric facial recognition remain eligible for standard manual attendance marking through faculty override without penalty.

---

## 2. Purpose Limitation
- **Single Purpose**: Face photographs and derived 128-dimensional embedding vectors are used exclusively for matching classroom faces against enrolled section rosters during active lecture periods.
- **No Secondary Use or Sharing**: Biometric embeddings are never transmitted to external third parties or public cloud endpoints. All facial extraction and Euclidean vector distance evaluations occur entirely within the institution's private local network perimeter (`face-service-fastapi`).

---

## 3. Right to Erasure & Deletion on Request
- **Biometric Erasure Endpoint**:
  ```http
  DELETE /api/students/{studentId}/biometrics
  ```
  - **Permissions**: Restricted to `ADMIN` or `HOD` roles (or verified student requests).
  - **Action**: Immediately sets `face_embedding = NULL`, purges all historical multi-crop references in `student_face_embeddings`, clears consent timestamps, and logs an immutable audit entry.
  - **Retention Override**: Historical attendance status records (`PRESENT` / `ABSENT`) are preserved for academic grading integrity, while all underlying biometric identifiers are permanently scrubbed.

---

## 4. Data Minimization & Storage Limitation
- **Ephemeral Raw Images**: Attendance photos captured by classroom webcams/cameras are retained for a configurable retention window (`PRIVACY_RETENTION_DAYS`, default: 30 days) to facilitate dispute resolution, after which a scheduled retention cleanup job automatically purges raw image files from MinIO / object storage.
- **Derived Vectors**: Only compact 128-dimensional mathematical representations (float vectors) are retained in PostgreSQL for active students.

---

## 5. Security Safeguards & Access Logging
- **Role-Based Access Control**:
  - `STUDENT`: Read-only access to their own attendance percentage, subject summaries, and dispute submission.
  - `TEACHER`: Attendance capture, review, and single-session overrides.
  - `HOD` / `ADMIN`: Department-level oversight, timetable configuration, leave approvals, and biometric deletion.
- **Audit Trails**: All manual attendance status modifications and dispute resolutions are tracked in `attendance_override_audit` with `changed_by_user_id`, `old_value`, `new_value`, `reason`, and timestamp.
- **Network Boundaries**: Service communication between Spring Boot, FastAPI, MinIO, RabbitMQ, and PostgreSQL is isolated inside the private Docker network bridge.
