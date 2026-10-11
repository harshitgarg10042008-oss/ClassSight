# Verified Features

This inventory records only checks actually run in this repository. An
unchecked item is not a product claim.

| Feature | Verification | Status |
|---|---|---|
| Docker Compose configuration | `docker compose config --quiet` | Verified |
| Backend health | `GET /actuator/health` | Verified locally |
| Face service health | `GET /health` | Verified locally |
| Frontend availability | `GET http://localhost:3000` | Verified locally |
| Frontend TypeScript | `npm run typecheck` | Verified |
| Backend container compilation | `docker compose build backend-spring` | Verified |
| Face-service image dependency alignment | No-cache image build and health check | Verified |
| Secure refresh sessions | No implementation/evidence found | Not verified |
| Tenant isolation | No tenant schema/test found | Not verified |
| Full automated test suite | Maven/pytest unavailable directly in the local environment | Blocked |
| Fresh-clone final audit | Not run from a fresh clone | Not verified |

Measured recognition accuracy and latency must be added from a real benchmark
run; simulated fallback values are not audit evidence.
