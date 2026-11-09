# FINAL_FRONTEND.md — ClassSight SaaS Frontend Build Report
> Generated: 2026-11-09 | Prompt 9 (ui2 build series)

---

## Overall Status: **ALL GATES PASS ✅**

- TypeScript typecheck: **PASS** (0 errors)
- Production build: **PASS** (exit 0, 50+ routes compiled)
- Contrast audit: **36/36 PASS** (0 failures)
- Route sweep: **PASS — 165 checks, 0 failures, all 200**
- Keyboard auth test: **PASS** (`test_auth_keyboard.py`)
- Existing backend tests: **NOT VERIFIED** (Docker/services not running in this session — no frontend code touched)

---

## Phase Table

| Phase | Description | Status | Commit |
|---|---|---|---|
| U0 | Route & UI Audit | **PASS** | `6acfc01` |
| U1 | Design System & Kitchen Sink | **PASS** | `2e38b59` |
| U2 | Public Site & Marketing Pages | **PASS** | `73c8d42` |
| U3 | Auth & Onboarding | **PASS** | `555c5a9` |
| U4 | Teacher App & Portal | **PASS** | `066b25a`, `fe5acd1` |
| U5 | Institution Admin (/admin) | **PASS** | `066b25a` (WorkspacePage + 20 adminSections, DEMO_DATA guard) |
| U6 | Platform Owner (/owner) | **PASS** | `066b25a` (WorkspacePage + 11 ownerSections, DEMO_DATA guard) |
| U7 | Notifications | **PASS** | `066b25a` (NotificationCentre + NotificationPreferencesAndTemplates) |
| U8 | Signature Features D01-D24 | **PASS** | `fe5acd1` (D01+D04 WIRED; D02 UI-PREVIEW; all others in workspace sections) |
| U9 | System & Quality Pages | **PASS** | Pre-existing (not-found, error, forbidden, maintenance, offline, upgrade-required) |
| U10 | QA & Verification | **PASS** | Build + 36/36 contrast + 165/165 sweep + keyboard test |
| U11 | Docs & Release | **PASS** | `fe5acd1` (docs/frontend.md, docs/features.md, README "Run the UI") |

---

## Routes Table (165 checks — all PASS 200)

| Route | Area | Kind | H1 | Overflow |
|---|---|---|---|---|
| `/` | Public | STATIC | 1 | No |
| `/features` | Public | STATIC | 1 | No |
| `/features/[slug]` | Public | DYNAMIC | 1 | No |
| `/how-it-works` | Public | STATIC | 1 | No |
| `/pricing` | Public | STATIC | 1 | No |
| `/solutions` | Public | STATIC | 1 | No |
| `/solutions/colleges` | Public | DYNAMIC | 1 | No |
| `/solutions/schools` | Public | DYNAMIC | 1 | No |
| `/solutions/coaching` | Public | DYNAMIC | 1 | No |
| `/security` | Public | STATIC | 1 | No |
| `/trust` | Public | STATIC | 1 | No |
| `/integrations` | Public | STATIC | 1 | No |
| `/about` | Public | STATIC | 1 | No |
| `/contact` | Public | STATIC | 1 | No |
| `/book-demo` | Public | STATIC | 1 | No |
| `/faq` | Public | STATIC | 1 | No |
| `/docs` | Public | STATIC | 1 | No |
| `/changelog` | Public | STATIC | 1 | No |
| `/resources` | Public | STATIC | 1 | No |
| `/accessibility` | Public | STATIC | 1 | No |
| `/status` | Public | STATIC | 1 | No |
| `/sitemap` | Public | STATIC | 1 | No |
| `/privacy` | Legal | STATIC | 1 | No |
| `/terms` | Legal | STATIC | 1 | No |
| `/cookies` | Legal | STATIC | 1 | No |
| `/dpa` | Legal | STATIC | 1 | No |
| `/refund` | Legal | STATIC | 1 | No |
| `/acceptable-use` | Legal | STATIC | 1 | No |
| `/student-data-notice` | Legal | STATIC | 1 | No |
| `/login` | Auth | WIRED | 1 | No |
| `/signup` | Auth | UI-PREVIEW | 1 | No |
| `/forgot-password` | Auth | UI-PREVIEW | 1 | No |
| `/reset-password` | Auth | UI-PREVIEW | 1 | No |
| `/verify-email` | Auth | UI-PREVIEW | 1 | No |
| `/two-factor` | Auth | UI-PREVIEW | 1 | No |
| `/logout` | Auth | STATIC | 1 | No |
| `/onboarding` | App | UI-PREVIEW | 1 | No |
| `/notifications` | App | UI-PREVIEW | 1 | No |
| `/portal` | Portal | UI-PREVIEW | 1 | No |
| `/admin` | Admin | UI-PREVIEW | 1 | No |
| `/owner` | Owner | UI-PREVIEW | 1 | No |
| `/maintenance` | System | STATIC | 1 | No |
| `/offline` | System | STATIC | 1 | No |
| `/upgrade-required` | System | STATIC | 1 | No |
| _(+ all 55 routes × 3 viewports = 165 checks)_ | | | | |

---

## Feature Registry

| ID | Feature | Plan | Status |
|---|---|---|---|
| FT01 | Live camera capture | Essential | WIRED |
| FT02 | Group-photo enrolment | Essential | WIRED |
| FT03 | Faculty review | Essential | WIRED |
| FT04 | Class/room/camera management | Essential | WIRED |
| FT05 | Absent list + CSV | Essential | WIRED |
| FT06 | Consent and deletion | Essential | UI-PREVIEW |
| FT07 | Multi-shot capture | Pro | WIRED |
| FT08 | Analytics and alerts | Pro | WIRED |
| FT09 | Email/SMS notifications | Pro | UI-PREVIEW |
| FT10 | Late/early leaving | Pro | UI-PREVIEW |
| FT11 | Roles and permissions | Pro | UI-PREVIEW |
| FT12 | Audit log | Pro | UI-PREVIEW |
| FT13 | Retention controls | Pro | UI-PREVIEW |
| FT14 | ERP/LMS integrations | Advanced | UI-PREVIEW |
| FT15 | Multi-campus + SSO | Advanced | UI-PREVIEW |
| FT16 | Private-cloud deployment | Advanced | UI-PREVIEW |
| FT17 | Liveness checks | Advanced | UI-PREVIEW |
| FT18 | Custom thresholds/reports | Advanced | UI-PREVIEW |
| FT19 | Student/parent portal | Advanced | UI-PREVIEW |
| FT20 | Priority support | Advanced | UI-PREVIEW |
| D01 | Explain-this-match (confidence gauge, diagnostics) | Essential | WIRED (live API data) |
| D02 | Capture Coach checklist | Essential | UI-PREVIEW |
| D03 | Retake uncertain students | Pro | UI-PREVIEW |
| D04 | Keyboard speed review (A/X/Z/arrows/?) | Essential | WIRED |
| D05 | Seat-map view | Pro | UI-PREVIEW |
| D06 | Manual roll-call fallback | Essential | UI-PREVIEW |
| D07 | Phone-as-camera QR pairing | Pro | COMING-SOON |
| D08 | Camera health monitor | Pro | UI-PREVIEW |
| D09 | Eligibility calculator | Advanced | UI-PREVIEW |
| D10 | Risk radar | Pro | UI-PREVIEW |
| D11 | Pattern insights | Pro | UI-PREVIEW |
| D12 | Late/early timeline | Pro | UI-PREVIEW |
| D13 | Class health score | Pro | UI-PREVIEW |
| D14 | Message templates | Pro | UI-PREVIEW |
| D15 | Leave and condonation workflow | Advanced | UI-PREVIEW |
| D16 | "I was present" dispute | Advanced | UI-PREVIEW |
| D17 | Timetable-driven sessions | Pro | UI-PREVIEW |
| D18 | Bulk correction | Pro | UI-PREVIEW |
| D19 | Consent ledger | Essential | UI-PREVIEW |
| D20 | Privacy receipt | Essential | UI-PREVIEW |
| D21 | Evidence-based accuracy report | Advanced | UI-PREVIEW |
| D22 | Trust centre + retention | Essential/Pro | UI-PREVIEW |
| D23 | Command palette (Ctrl+K) | Essential | UI-PREVIEW |
| D24 | Onboarding + sample sandbox | Essential | UI-PREVIEW |

---

## Design Decisions

1. **No Tailwind** — pure CSS custom properties; zero build complexity; smaller bundle.
2. **System font stack only** — no CDN fonts; zero external runtime network calls.
3. **Inline SVG charts** — no Chart.js or Recharts; all charts in `components/ui/Charts.tsx`.
4. **WorkspacePage shared renderer** — teacher/admin/owner/portal sections all driven by data objects in `lib/workspace-*.ts`.
5. **Plan model** — Essential / Pro / Advanced (cumulative). All prices `null` → "Contact us" in `lib/plans.ts`.
6. **Demo guard** — `/admin` and `/owner` call `notFound()` unless `NEXT_PUBLIC_DEMO_DATA=true`.
7. **D01 wired** — confidence gauge reads from live `diagnostics[]` and `confidenceScore` returned by review API.
8. **D04 wired** — keyboard handler hooks into actual `decisions` state in the WIRED review component.
9. **Remember-me** — username only in localStorage; never password or token.
10. **Theme flash** — inline `<script>` before `<body>` reads localStorage before first paint.

---

## Test Results

| Test | Result | Numbers |
|---|---|---|
| TypeScript typecheck | **PASS** | 0 errors |
| Production build | **PASS** | 50+ routes, exit 0 |
| Contrast audit | **PASS** | 36/36 pairs ≥ 4.5:1 (or 3:1 for large) |
| Route sweep | **PASS** | 165/165 checks, all HTTP 200, h1=1, no overflow |
| Keyboard auth test | **PASS** | Tab nav, eye toggle Space/Enter, checkbox, Enter submit |
| Spring Boot / Maven tests | NOT VERIFIED | Docker not started (no frontend code changed) |
| face-service pytest | NOT VERIFIED | Docker not started |
| Browser smoke tests | NOT VERIFIED | Docker not started |

---

## Screenshots List (`.work/screens/`)

35+ screenshots at 360px, 768px, 1280px. Key files:
- `home_desktop_1280px.png` — landing page
- `login_desktop_1280px.png` — login with PasswordInput
- `admin_desktop_1280px.png` — admin workspace
- `dev_ui_light.png`, `dev_ui_dark.png` — kitchen sink

**Visual inspection: NOT VERIFIED** — cannot open images in this environment. All automated checks (contrast, sweep, build, typecheck) PASS.

---

## Known Issues & NOT VERIFIED

| Item | Reason |
|---|---|
| Docker integration tests | Services not started |
| Spring Boot Maven tests | Services not started |
| face-service pytest | Services not started |
| Visual screenshot review | Cannot open images |
| D05 Seat-map drag-to-arrange | Requires backend seat assignment API (not built) |
| D07 Phone QR pairing | Backend not built — COMING-SOON |
| D15 Document upload (Leave) | FileDrop shown; no upload endpoint |
| Liveness (FT17) | No liveness model available |
| Multi-campus SSO (FT15) | Infrastructure not configured |

---

## Environment Flags

| Variable | Dev Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_DEMO_DATA` | `true` | Enables /admin, /owner |
| `NEXT_PUBLIC_DEMO_PLAN` | `advanced` | Shows all features unlocked |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hello@classsight.example` | Footer email |
| `NEXT_PUBLIC_FORMS_ENDPOINT` | (unset) | Form POST endpoint; demo mode if unset |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Spring Boot backend |

---

## Git State

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD commit | `fe5acd1` |
| Status | Ahead of origin/main by 2 (pushed below) |
| Tags | `before-ui-v2` preserved; `v0.3.0` tagged after PASS |

---

## Honesty Phrases — All Verified Present

- ✅ "Face embeddings are not yet encrypted at rest."
- ✅ "Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action."
- ✅ "Designed to support consent workflows; legal text needs lawyer review."
- ✅ "Simulated on LFW, NOT classroom accuracy."
- ✅ "Guardian consent is required for minors."
- ✅ "Demo mode, nothing was sent." (all UI-PREVIEW form submissions)
- ✅ No invented prices — all show "Contact us"
- ✅ No invented testimonials, logos, statistics, or customer claims
