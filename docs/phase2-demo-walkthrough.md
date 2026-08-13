# Phase 2 Demo Walkthrough — ERP Export and Sync

## Scope and honest provider status

This walkthrough exercises the provisional local CSV provider and the persisted sync workflow. No real ERP vendor or remote delivery endpoint has been confirmed, so the correct user-facing fallback is **ERP unavailable; attendance finalized locally; CSV generated locally**.

## Live environment

The unified Compose stack was rebuilt with Java 17 and restarted. Spring health returned HTTP 200 with `{"service":"backend-spring","status":"UP"}`. Postgres and FastAPI were healthy through Compose readiness checks.

## Finalized source session

The live ADMIN flow used attendance session `1`. Postgres reported:

| Session ID | Status | Subject | Started at |
|---:|---|---|---|
| 1 | FINALIZED | Phase 1 Live Attendance | 2026-08-13 |

Postgres attendance records were:

| Student ID | Student | Subject | Date | Status |
|---:|---|---|---|---|
| 1 | Barack Obama | Phase 1 Live Attendance | 2026-08-13 | PRESENT |
| 2 | Joe Biden | Phase 1 Live Attendance | 2026-08-13 | ABSENT |

## Validate → export → status

`POST /admin/erp/validate` as ADMIN returned **HTTP 200**:

```json
{"valid":true,"errors":[],"sessionCount":1,"rowCount":2}
```

`POST /admin/erp/export` returned **HTTP 200**:

```json
{"generated":true,"status":"GENERATED_LOCAL_ONLY","message":"CSV generated locally; no ERP delivery was attempted","rowCount":2}
```

The actual host file was `exports/attendance-20260813-094846.csv`, with size **156 bytes** and SHA-256 `1f95c707e1233b896aa190137a0588da5d1399c022b12def4977dd4620340d78`.

Its contents exactly matched Postgres:

```csv
student_id,student_name,subject,date,status
1,Barack Obama,Phase 1 Live Attendance,2026-08-13,PRESENT
2,Joe Biden,Phase 1 Live Attendance,2026-08-13,ABSENT
```

`GET /admin/erp/status?fileName=attendance-20260813-094846.csv` returned **HTTP 200** with `available=true`, `status=GENERATED_LOCAL_ONLY`, and `sizeBytes=156`.

## Sync and idempotency

The persisted sync flow was also exercised live:

| Operation | HTTP | Result |
|---|---:|---|
| Failure injection | 200 | `FAILED`, attempt 1, `SIMULATED_FAILURE_INJECTION` |
| Retry | 200 | `SYNCED`, attempt 2, local export path returned |
| Immediate repeat | 200 | `SYNCED`, `idempotentNoOp=true`, attempt count remained 2 |

Postgres showed one `erp_sync_records` row in `SYNCED` state and four audit rows for `PENDING → SYNCING → FAILED → SYNCING → SYNCED`. The immediate repeat created no duplicate export and no new transition audit.

## Phase 2 conclusion

**Phase 2 is verified live for the provisional local provider.** Attendance remains finalized locally, the generated CSV is available on the host, sync state is persisted in Postgres, and repeat export is restart-safe and idempotent. A real ERP adapter remains intentionally unimplemented until a vendor/API/import contract is confirmed.
