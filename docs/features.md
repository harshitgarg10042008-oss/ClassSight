# ClassSight Feature Registry

> Auto-documented from `frontend-next/config/features.ts` and verified in Prompt 11 test pass (v0.4.0).  
> Build level: **WIRED** (real backend API), **UI-PREVIEW** (sample data with honesty banner), **COMING-SOON** (not built).  
> Statuses: **PASS** (ran, green, evidence) / **FAIL** (ran, red) / **NOT VERIFIED** (not run) / **NOT BUILT**.

---

## Core Features (FT01–FT20)

| ID | Feature | Plan | Level | Verification Suite | Status | Evidence |
|---|---|---|---|---|---|---|
| FT01 | Live camera capture | Essential | WIRED | Playwright e2e + Route Sweep (`/app?tab=capture`) | PASS | `.work/logs/qa_results.json`, `.work/screenshots/app-360-light.png` |
| FT02 | Group-photo enrolment (Quick Class) | Essential | WIRED | Spring Maven + Route Sweep (`/app/enrollment`) | PASS | `.work/logs/qa_results.json` |
| FT03 | Faculty review (approve / mark absent / unknown) | Essential | WIRED | Spring Maven + Route Sweep (`/app/review`) | PASS | `.work/logs/qa_results.json`, `.work/screenshots/review-1280-light.png` |
| FT04 | Class, room and camera management | Essential | WIRED | Spring Maven (`ClassControllerTest`) + Route Sweep (`/app/classes`) | PASS | `.work/logs/qa_results.json` |
| FT05 | Absent list and CSV export | Essential | WIRED | Spring Maven + Route Sweep (`/app/sessions`) | PASS | `.work/logs/qa_results.json` |
| FT06 | Consent and deletion | Essential | UI-PREVIEW | Route sweep & depth audit (`/privacy`) | PASS | `.work/logs/qa_results.json` |
| FT07 | Multi-shot capture (merge results) | Pro | WIRED | Spring Maven (`AttendanceSessionAccumulatorTest`) | PASS | Maven test log |
| FT08 | Analytics and attendance alerts | Pro | WIRED | Route sweep & depth audit (`/app/analytics`) | PASS | `.work/logs/qa_results.json`, `.work/screenshots/analytics-1280-light.png` |
| FT09 | Email and SMS notifications | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/notifications`) | PASS | `.work/logs/qa_results.json` |
| FT10 | Late and early-leaving detection | Pro | UI-PREVIEW | Route sweep & depth audit (`/app/sessions`) | PASS | `.work/logs/qa_results.json` |
| FT11 | Roles and permissions matrix | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/users-roles`) | PASS | `.work/logs/qa_results.json` |
| FT12 | Audit log | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/audit-log`) | PASS | `.work/logs/qa_results.json` |
| FT13 | Data retention controls | Pro | UI-PREVIEW | Route sweep & depth audit (`/admin/security`) | PASS | `.work/logs/qa_results.json` |
| FT14 | ERP and LMS integrations | Advanced | UI-PREVIEW | Route sweep & crawler (`/integrations`) | PASS | `.work/logs/qa_results.json` |
| FT15 | Multi-campus and SSO | Advanced | UI-PREVIEW | Route sweep & depth audit (`/owner/tenants`) | PASS | `.work/logs/qa_results.json` |
| FT16 | Private-cloud deployment option | Advanced | UI-PREVIEW | Route sweep & depth audit (`/owner/system-health`) | PASS | `.work/logs/qa_results.json` |
| FT17 | Liveness checks | Advanced | UI-PREVIEW | Route sweep (`/features/FT01`) | PASS | `.work/logs/qa_results.json` |
| FT18 | Custom thresholds and reports | Advanced | UI-PREVIEW | Route sweep & depth audit (`/app/reports`) | PASS | `.work/logs/qa_results.json` |
| FT19 | Student and parent portal | Advanced | UI-PREVIEW | Route sweep & depth audit (`/portal/*`, 9 routes) | PASS | `.work/logs/qa_results.json` |
| FT20 | Priority support SLA | Advanced | UI-PREVIEW | Route sweep & crawler (`/contact`) | PASS | `.work/logs/qa_results.json` |

---

## Signature Features (D01–D24)

| ID | Feature | Plan | Level | Verification Suite | Status | Evidence |
|---|---|---|---|---|---|---|
| D01 | Explain-this-match (confidence gauge, quality score, rejection reason) | Essential | WIRED | Route sweep + Review flow | PASS | `.work/logs/qa_results.json` |
| D02 | Capture Coach (pre-capture checklist) | Essential | UI-PREVIEW | Route sweep (`/app?tab=capture`) | PASS | `.work/logs/qa_results.json` |
| D03 | Retake uncertain students only | Pro | UI-PREVIEW | Route sweep (`/app/review`) | PASS | `.work/logs/qa_results.json` |
| D04 | Keyboard speed review (A/X/Z/arrows/?) | Essential | WIRED | `tests/e2e` browser smoke | PASS | Smoke test execution |
| D05 | Seat-map view with absentee heat | Pro | UI-PREVIEW | Route sweep (`/app/classes`) | PASS | `.work/logs/qa_results.json` |
| D06 | Manual roll-call fallback | Essential | UI-PREVIEW | Route sweep (`/app/today`) | PASS | `.work/logs/qa_results.json` |
| D07 | Phone-as-camera QR pairing | Pro | COMING-SOON | Not implemented | NOT BUILT | Planned for mobile pairing milestone |
| D08 | Camera health monitor | Pro | UI-PREVIEW | Route sweep (`/app/cameras`) | PASS | `.work/logs/qa_results.json` |
| D09 | Eligibility calculator ("how many classes can I miss?") | Advanced | UI-PREVIEW | Route sweep (`/portal/eligibility`) | PASS | `.work/logs/qa_results.json` |
| D10 | Risk radar (students trending toward threshold) | Pro | UI-PREVIEW | Route sweep (`/app/risk`) | PASS | `.work/logs/qa_results.json` |
| D11 | Pattern insights + weekly summary | Pro | UI-PREVIEW | Route sweep (`/app/analytics`) | PASS | `.work/logs/qa_results.json` |
| D12 | Late/early-leaving timeline | Pro | UI-PREVIEW | Route sweep (`/app/sessions`) | PASS | `.work/logs/qa_results.json` |
| D13 | Class health score | Pro | UI-PREVIEW | Route sweep (`/app/classes`) | PASS | `.work/logs/qa_results.json` |
| D14 | Message templates (email/SMS/WhatsApp) | Pro | UI-PREVIEW | Route sweep (`/admin/notifications`) | PASS | `.work/logs/qa_results.json` |
| D15 | Leave and condonation workflow | Advanced | UI-PREVIEW | Route sweep (`/app/leave`) | PASS | `.work/logs/qa_results.json` |
| D16 | "I was present" dispute flow | Advanced | UI-PREVIEW | Route sweep (`/app/disputes`) | PASS | `.work/logs/qa_results.json` |
| D17 | Timetable-driven session start | Pro | UI-PREVIEW | Route sweep (`/app/timetable`) | PASS | `.work/logs/qa_results.json` |
| D18 | Bulk correction with reason code | Pro | UI-PREVIEW | Route sweep (`/admin/overview`) | PASS | `.work/logs/qa_results.json` |
| D19 | Consent ledger and guardian tracker | Essential | UI-PREVIEW | Route sweep (`/admin/consent-ledger`) | PASS | `.work/logs/qa_results.json` |
| D20 | Privacy receipt per student | Essential | UI-PREVIEW | Route sweep (`/portal/privacy-receipt`) | PASS | `.work/logs/qa_results.json` |
| D21 | Evidence-based accuracy report | Advanced | UI-PREVIEW | Route sweep (`/admin/security`) | PASS | `.work/logs/qa_results.json` |
| D22 | Public trust centre + retention timeline | Essential / Pro | UI-PREVIEW | Route sweep & contrast check (`/trust`) | PASS | `.work/logs/qa_results.json` |
| D23 | Command palette (Ctrl+K) | Essential | UI-PREVIEW | Automated keyboard check (`Ctrl+K`) | PASS | `.work/logs/qa_results.json` |
| D24 | Onboarding checklist + sandbox | Essential | UI-PREVIEW | Route sweep (`/onboarding`) | PASS | `.work/logs/qa_results.json` |

---

## Mandatory Honesty Disclosures

The following phrases are strictly enforced across UI components and documentation:

1. **Face storage:** "Face embeddings are not yet encrypted at rest."
2. **Auto-commit:** "Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action."
3. **Accuracy figures:** "Simulated on LFW, NOT classroom accuracy."
4. **Consent and legal:** "Designed to support consent workflows; legal text needs lawyer review."
5. **Minor students:** "Guardian consent is required for minors."
6. **Preview forms:** "Demo mode, nothing was sent."
