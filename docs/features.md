# ClassSight Feature Registry

> This file is auto-documented from `frontend-next/config/features.ts`.  
> Status: **WIRED** = real backend API; **UI-PREVIEW** = sample data, nothing sent; **COMING-SOON** = not built.

---

## Core Features (FT01–FT20)

| ID | Feature | Plan | Status | Route |
|---|---|---|---|---|
| FT01 | Live camera capture | Essential | WIRED | `/app` |
| FT02 | Group-photo enrolment (Quick Class) | Essential | WIRED | `/app/enrollment` |
| FT03 | Faculty review (approve / mark absent / unknown) | Essential | WIRED | `/app` |
| FT04 | Class, room and camera management | Essential | WIRED | `/app` |
| FT05 | Absent list and CSV export | Essential | WIRED | `/app` |
| FT06 | Consent and deletion | Essential | UI-PREVIEW | `/privacy` |
| FT07 | Multi-shot capture (merge results) | Pro | WIRED | `/app` |
| FT08 | Analytics and attendance alerts | Pro | WIRED | `/app/analytics` |
| FT09 | Email and SMS notifications | Pro | UI-PREVIEW | `/notifications` |
| FT10 | Late and early-leaving detection | Pro | UI-PREVIEW | `/app/late` |
| FT11 | Roles and permissions matrix | Pro | UI-PREVIEW | `/admin/roles` |
| FT12 | Audit log | Pro | UI-PREVIEW | `/admin/audit` |
| FT13 | Data retention controls | Pro | UI-PREVIEW | `/admin/retention` |
| FT14 | ERP and LMS integrations | Advanced | UI-PREVIEW | `/integrations` |
| FT15 | Multi-campus and SSO | Advanced | UI-PREVIEW | `/admin/campuses` |
| FT16 | Private-cloud deployment option | Advanced | UI-PREVIEW | `/owner/health` |
| FT17 | Liveness checks | Advanced | UI-PREVIEW | `/app/capture` |
| FT18 | Custom thresholds and reports | Advanced | UI-PREVIEW | `/app/reports` |
| FT19 | Student and parent portal | Advanced | UI-PREVIEW | `/portal` |
| FT20 | Priority support SLA | Advanced | UI-PREVIEW | `/contact` |

> **WIRED status**: FT01, FT02, FT03, FT04, FT05, FT07, FT08, and FT16 (private-cloud is a deployment choice, not a feature) have real backend calls via `ApiClient` or direct `authFetch`. All others are UI-PREVIEW.

---

## Signature Features (D01–D24)

| ID | Feature | Plan | Status | Location |
|---|---|---|---|---|
| D01 | Explain-this-match (confidence gauge, quality score, rejection reason) | Essential | WIRED (uses live diagnostics data) | `/app` review section — click "Explain this result" |
| D02 | Capture Coach (pre-capture checklist) | Essential | UI-PREVIEW | `/app` capture section — "Show Capture Coach checklist" |
| D03 | Retake uncertain students only (merge results) | Pro | UI-PREVIEW | `/app/retake` |
| D04 | Keyboard speed review (A/X/Z/arrows/?) | Essential | WIRED | `/app` review — press `?` to see shortcuts |
| D05 | Seat-map view with absentee heat | Pro | UI-PREVIEW | Teacher → Classes section |
| D06 | Manual roll-call fallback | Essential | UI-PREVIEW | Teacher → Today section |
| D07 | Phone-as-camera QR pairing | Pro | COMING-SOON | — |
| D08 | Camera health monitor | Pro | UI-PREVIEW | Teacher → Cameras section |
| D09 | Eligibility calculator ("how many classes can I miss?") | Advanced | UI-PREVIEW | `/portal/eligibility` |
| D10 | Risk radar (students trending toward threshold) | Pro | UI-PREVIEW | Teacher → Risk · Admin → Risk |
| D11 | Pattern insights + plain-language weekly summary | Pro | UI-PREVIEW | Teacher → Analytics |
| D12 | Late/early-leaving timeline (first seen, last seen) | Pro | UI-PREVIEW | Teacher → Sessions |
| D13 | Class health score | Pro | UI-PREVIEW | Teacher → Classes |
| D14 | Message templates (email/SMS/WhatsApp preview) | Pro | UI-PREVIEW | Admin → Notifications section |
| D15 | Leave and condonation workflow with document upload | Advanced | UI-PREVIEW | `/portal/leave` · Teacher → Leave |
| D16 | "I was present" dispute flow | Advanced | UI-PREVIEW | `/portal/disputes` · Teacher → Disputes |
| D17 | Timetable-driven session start (auto-open window) | Pro | UI-PREVIEW | Teacher → Timetable |
| D18 | Bulk correction with mandatory reason code | Pro | UI-PREVIEW | Admin → Attendance section |
| D19 | Consent ledger and guardian-consent tracker | Essential | UI-PREVIEW | Admin → Consent section |
| D20 | Privacy receipt per student + erasure request | Essential | UI-PREVIEW | `/portal/privacy-receipt` |
| D21 | Evidence-based accuracy report with confidence intervals | Advanced | UI-PREVIEW | Admin → Accuracy section |
| D22 | Trust centre (public) + retention timeline | Essential / Pro | UI-PREVIEW | `/trust` · Admin → Retention |
| D23 | Command palette (Ctrl+K) | Essential | UI-PREVIEW | Available in all workspace shells |
| D24 | Onboarding checklist + sample-class sandbox | Essential | UI-PREVIEW | `/onboarding` · Landing demo |

---

## Honesty Requirements

Anywhere these features appear in UI copy:

- **Face storage:** "Face embeddings are not yet encrypted at rest."
- **Auto-commit:** "Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action."
- **Accuracy numbers:** "Simulated on LFW, NOT classroom accuracy."
- **Consent:** "Designed to support consent workflows; legal text needs lawyer review."
- **Minor students:** "Guardian consent is required for minors."
- **Demo forms:** "Demo mode, nothing was sent."
