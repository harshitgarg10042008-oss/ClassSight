# ClassSight Feature Registry

> Auto-documented from `frontend-next/config/features.ts` and verified in Prompt 10 test pass.  
> Build level: **WIRED** (real backend API), **UI-PREVIEW** (sample data with honesty banner), **COMING-SOON** (not built).  
> Statuses: **PASS** (ran, green, evidence) / **FAIL** (ran, red) / **NOT VERIFIED** (not run) / **NOT BUILT**.

---

## Core Features (FT01–FT20)

| ID | Feature | Plan | Level | Verification Suite | Status | Evidence |
|---|---|---|---|---|---|---|
| FT01 | Live camera capture | Essential | WIRED | Playwright e2e (`v3_full.py`) | PASS | `.work/v3/04-capture.png` |
| FT02 | Group-photo enrolment (Quick Class) | Essential | WIRED | Spring Maven + Playwright e2e | PASS | `.work/logs/v2-maven.log`, `.work/v3/03-quick-class.png` |
| FT03 | Faculty review (approve / mark absent / unknown) | Essential | WIRED | Spring Maven + Playwright e2e | PASS | `.work/logs/v2-maven.log`, `.work/v3/06-review.png` |
| FT04 | Class, room and camera management | Essential | WIRED | Spring Maven (`ClassControllerTest`) | PASS | `.work/logs/v2-maven.log` |
| FT05 | Absent list and CSV export | Essential | WIRED | Spring Maven + Playwright e2e finalize | PASS | `.work/v3/07-finalized.png` |
| FT06 | Consent and deletion | Essential | UI-PREVIEW | Route sweep & depth audit (`/privacy`) | PASS | `.work/logs/v4-sweep.log` |
| FT07 | Multi-shot capture (merge results) | Pro | WIRED | Spring Maven (`AttendanceSessionAccumulatorTest`) | PASS | `.work/logs/v2-maven.log` |
| FT08 | Analytics and attendance alerts | Pro | WIRED | Route sweep & depth audit (`/app/analytics`) | PASS | `.work/logs/v5-audit.log` |
| FT09 | Email and SMS notifications | Pro | UI-PREVIEW | Playwright UX (`v4_ux.py` bell count & persist) | PASS | `.work/logs/v4-ux.log` |
| FT10 | Late and early-leaving detection | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/sessions`) | PASS | `.work/logs/v5-audit.log` |
| FT11 | Roles and permissions matrix | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/users-roles`) | PASS | `.work/logs/v5-audit.log` |
| FT12 | Audit log | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/audit-log`) | PASS | `.work/logs/v5-audit.log` |
| FT13 | Data retention controls | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/security`) | PASS | `.work/logs/v5-audit.log` |
| FT14 | ERP and LMS integrations | Advanced | UI-PREVIEW | Route sweep & crawler (`/integrations`) | PASS | `.work/logs/v4-crawler.log` |
| FT15 | Multi-campus and SSO | Advanced | UI-PREVIEW | Route sweep & depth audit (`/owner/tenants`) | PASS | `.work/logs/v5-audit.log` |
| FT16 | Private-cloud deployment option | Advanced | UI-PREVIEW | Route sweep & depth audit (`/owner/system-health`) | PASS | `.work/logs/v5-audit.log` |
| FT17 | Liveness checks | Advanced | UI-PREVIEW | Route sweep (`/features/FT01`) | PASS | `.work/logs/v4-sweep.log` |
| FT18 | Custom thresholds and reports | Advanced | UI-PREVIEW | Playwright UX (`v4_ux.py` LockedFeature) | PASS | `.work/logs/v4-ux.log` |
| FT19 | Student and parent portal | Advanced | UI-PREVIEW | Route sweep & depth audit (`/portal/*`, 9 routes) | PASS | `.work/logs/v5-audit.log` |
| FT20 | Priority support SLA | Advanced | UI-PREVIEW | Route sweep & crawler (`/contact`) | PASS | `.work/logs/v4-crawler.log` |

---

## Signature Features (D01–D24)

| ID | Feature | Plan | Level | Verification Suite | Status | Evidence |
|---|---|---|---|---|---|---|
| D01 | Explain-this-match (confidence gauge, quality score, rejection reason) | Essential | WIRED | Playwright e2e review step | PASS | `.work/v3/06-review.png` |
| D02 | Capture Coach (pre-capture checklist) | Essential | UI-PREVIEW | Playwright e2e capture step | PASS | `.work/v3/03-quick-class.png` |
| D03 | Retake uncertain students only | Pro | UI-PREVIEW | Playwright e2e review step | PASS | `.work/v3/06-review.png` |
| D04 | Keyboard speed review (A/X/Z/arrows/?) | Essential | WIRED | `tests/e2e` browser smoke | PASS | `.work/logs/v2-browser-smoke.log` |
| D05 | Seat-map view with absentee heat | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/classes`) | PASS | `.work/logs/v5-audit.log` |
| D06 | Manual roll-call fallback | Essential | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/today`) | PASS | `.work/logs/v5-audit.log` |
| D07 | Phone-as-camera QR pairing | Pro | COMING-SOON | Not implemented | NOT BUILT | Planned for mobile pairing milestone |
| D08 | Camera health monitor | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/cameras`) | PASS | `.work/logs/v5-audit.log` |
| D09 | Eligibility calculator ("how many classes can I miss?") | Advanced | UI-PREVIEW | Route sweep & depth audit (`/portal/eligibility`) | PASS | `.work/logs/v5-audit.log` |
| D10 | Risk radar (students trending toward threshold) | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/risk`) | PASS | `.work/logs/v5-audit.log` |
| D11 | Pattern insights + weekly summary | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/analytics`) | PASS | `.work/logs/v5-audit.log` |
| D12 | Late/early-leaving timeline | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/sessions`) | PASS | `.work/logs/v5-audit.log` |
| D13 | Class health score | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/classes`) | PASS | `.work/logs/v5-audit.log` |
| D14 | Message templates (email/SMS/WhatsApp) | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/notifications`) | PASS | `.work/logs/v5-audit.log` |
| D15 | Leave and condonation workflow | Advanced | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/leave`) | PASS | `.work/logs/v5-audit.log` |
| D16 | "I was present" dispute flow | Advanced | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/disputes`) | PASS | `.work/logs/v5-audit.log` |
| D17 | Timetable-driven session start | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/teacher/timetable`) | PASS | `.work/logs/v5-audit.log` |
| D18 | Bulk correction with reason code | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/overview`) | PASS | `.work/logs/v5-audit.log` |
| D19 | Consent ledger and guardian tracker | Essential | UI-PREVIEW | Route sweep & depth audit (`/admin/consent-ledger`) | PASS | `.work/logs/v5-audit.log` |
| D20 | Privacy receipt per student | Essential | UI-PREVIEW | Route sweep & depth audit (`/portal/privacy-receipt`) | PASS | `.work/logs/v5-audit.log` |
| D21 | Evidence-based accuracy report | Advanced | UI-PREVIEW | Route sweep & depth audit (`/admin/security`) | PASS | `.work/logs/v5-audit.log` |
| D22 | Public trust centre + retention timeline | Essential / Pro | UI-PREVIEW | Route sweep, contrast & shots (`/trust`) | PASS | `.work/logs/v4-contrast.log` |
| D23 | Command palette (Ctrl+K) | Essential | UI-PREVIEW | Playwright UX (`v4_ux.py` palette open/filter/nav) | PASS | `.work/logs/v4-ux.log` |
| D24 | Onboarding checklist + sandbox | Essential | UI-PREVIEW | Playwright UX (`v4_ux.py` tick & persistence) | PASS | `.work/logs/v4-ux.log` |

---

## Mandatory Honesty Disclosures

The following phrases are strictly enforced across UI components and documentation:

1. **Face storage:** "Face embeddings are not yet encrypted at rest."
2. **Auto-commit:** "Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action."
3. **Accuracy figures:** "Simulated on LFW, NOT classroom accuracy."
4. **Consent and legal:** "Designed to support consent workflows; legal text needs lawyer review."
5. **Minor students:** "Guardian consent is required for minors."
6. **Preview forms:** "Demo mode, nothing was sent."
