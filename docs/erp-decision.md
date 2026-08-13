# ERP/SIS Decision Record

## Status: Open — no confirmed ERP target yet

The college’s actual ERP/SIS vendor has not been identified in the available project requirements, and no authoritative API documentation, credentials, sample export, or import specification has been provided. This stage is therefore a decision record only; no ERP adapter should be built against an invented target.

## Required information before Stage 17

The project owner must confirm the ERP/SIS name and vendor, whether it exposes a usable REST or SOAP API, and whether credentials and documentation can be obtained. If no API exists, the owner must provide the exact import format expected by the ERP, including columns, encoding, delimiter, date format, and any required identifiers. A real sample export or import template is preferred.

## Provisional fallback

Until a real target is confirmed, the only provisional interchange format is a generic CSV or Excel export with these columns:

| Column | Meaning |
|---|---|
| `student_id` | ClassSight student identifier or institutional identifier once mapped |
| `student_name` | Student display name |
| `subject` | Subject or course identifier/name |
| `date` | Attendance date |
| `status` | PRESENT or ABSENT |

This format is explicitly provisional and must not be treated as the ERP’s actual import contract. Once the ERP is identified, Stage 17 should map `validateMappings`, `submitAttendance`, and `getSubmissionStatus` to the real API operations or to the exact file-generation and submission workflow required by that system.
