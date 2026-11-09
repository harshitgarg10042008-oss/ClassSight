# ClassSight Frontend

> Updated: November 2026 — reflects the U2 design-system rebuild (tokens.css, component library, shell components).

## Quick start

```bash
cd frontend-next
npm install
npm run dev        # http://localhost:3010
npm run build      # production build
npm run typecheck  # TypeScript check only
```

Set `NEXT_PUBLIC_DEMO_DATA=true` (default in `.env.development`) to enable `/admin` and `/owner`.

---

## Design tokens — how to change colours

Tokens live in **`frontend-next/styles/tokens.css`** (light mode under `:root`, dark mode under `[data-theme="dark"]`).

| Variable | Light value | Purpose |
|---|---|---|
| `--lagoon-400` | `#2DD4BF` | Accent, hover glow |
| `--lagoon-500` | `#0E9F9A` | Links, focus rings |
| `--lagoon-600` | `#0B7F7B` | Primary button background |
| `--coral-500` | `#FF6B4A` | CTA, highlights |
| `--ink-900` | `#0F1830` | Body text |
| `--bg` | `#FBFAF7` | Page background (warm paper) |
| `--surface` | `#FFFFFF` | Card surface |
| `--tier-auto` | `#12B76A` | AUTO chip fill |
| `--tier-review` | `#F5A524` | REVIEW chip fill |
| `--tier-unknown` | `#8B93A7` | UNKNOWN chip fill |
| `--tier-absent` | `#E5484D` | ABSENT chip fill |

**To change a colour:** edit the CSS variable under `:root` for light and `[data-theme="dark"]` for dark.  
**Never** put white text on `--coral-500`, `--lagoon-400`, or `--lagoon-500` — they fail AA contrast with white. Primary buttons use `--lagoon-600` (dark enough for white text).

---

## Shells

| Shell | File | Used for |
|---|---|---|
| `PublicShell` | `components/shell/PublicShell.tsx` | All `/` marketing, legal, docs, blog pages |
| `AuthShell` | `components/shell/AuthShell.tsx` | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invite`, `/two-factor`, `/logout`, `/onboarding` |
| `AppShell` | `components/shell/AppShell.tsx` | Teacher `/app/teacher/*`, admin `/admin/*`, owner `/owner/*`, portal `/portal/*`. Accepts `role` prop: `teacher \| portal \| admin \| owner`. |

---

## Routes and Verification

All routes are declared in **`frontend-next/config/routes.ts`**.  
The full manifest contains **115 routes** (56 base/static/wired routes + 20 institution admin sections + 11 platform owner console sections + 5 tenant detail sub-routes + 9 portal sections + 14 teacher workspace sections).

Verification status from Prompt 10:
- **Manifest Sweep**: 115/115 routes clean (HTTP 200, zero console errors, zero page errors, single h1, unique titles, no horizontal overflow at 360px & 768px). Evidence: `.work/logs/v4-sweep.log`.
- **Link Crawler**: 115 pages crawled, 118 internal targets checked, 0 dead links, 0 `href="#"` fragments. Evidence: `.work/logs/v4-crawler.log`.
- **Contrast**: 36/36 token pairs pass WCAG 2.1 AA/AAA contrast. Evidence: `.work/logs/v4-contrast.log`.
- **Workspace Depth Audit**: 70/70 workspace routes pass depth audit with rich cards, data tables, state previews, and honesty disclosures. Evidence: `.work/logs/v5-audit.log`.
- **Interactive UX**: 14/14 automated checks pass (keyboard login with Enter submit, eye toggle on login and signup, notification bell count & persistence, Hindi language switch, Ctrl+K palette navigation, `?` shortcut panel, onboarding checklist persistence, demo switcher, LockedFeature modal). Evidence: `.work/logs/v4-ux.log`.

Add a new page:
1. Create `app/new-page/page.tsx`
2. Add an entry to `config/routes.ts`
3. Add it to `PublicShell` nav if public

---

## Component library

All shared UI components live in **`frontend-next/components/ui/`**.  
Import from the barrel: `import { Button, Input, DataTable } from '@/components/ui'`

Key components:
- **Button** — `variant`: `primary | secondary | danger | ghost | link`; `size`: `sm | md | lg`; `loading` prop
- **PasswordInput** — eye toggle (accessible), caps-lock warning, strength meter
- **DataTable** — search, sort, filter, pagination, bulk-select, empty/loading/error states
- **TierChip** — `tier`: `AUTO | REVIEW | UNKNOWN | ABSENT`
- **Charts** — `DonutChart`, `BarChart`, `LineChart`, `Heatmap`, `SeatMap` (all inline SVG, no library)
- **CommandPalette** — triggered by `Ctrl+K`

Kitchen sink: **`/dev/ui`** (dev server only)

---

## Environment flags

| Variable | Default | Effect |
|---|---|---|
| `NEXT_PUBLIC_DEMO_DATA` | `true` (dev) | Enables `/admin` and `/owner`; without it those routes return 404 |
| `NEXT_PUBLIC_DEMO_PLAN` | `advanced` (dev) | Shows all plan-gated features unlocked |
| `NEXT_PUBLIC_CONTACT_EMAIL` | `hello@classsight.example` | Contact email in footer |
| `NEXT_PUBLIC_FORMS_ENDPOINT` | (unset) | If set, form submissions POST here; otherwise show "Demo mode, nothing was sent" |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | Spring Boot backend URL |
| `NEXT_PUBLIC_FACE_API_URL` | `http://localhost:8000` | FastAPI face service URL |

---

## Setting prices and limits

Edit **only `frontend-next/lib/plans.ts`**.  
Prices are `null` placeholders — the UI shows "Contact us" wherever a price is null.  
Feature limits (CSV row limits, storage quotas, etc.) are also set here.  
Do not scatter prices across other files.

---

## Feature registry

All features (FT01–FT20, D01–D24) are declared in **`frontend-next/config/features.ts`**.  
Each entry has: `id`, `name`, `plan` (`essential | pro | advanced`), `status` (`WIRED | UI-PREVIEW | COMING-SOON`), `module`, `route`.

The registry is used by:
- `/pricing` feature comparison table
- `/features` and `/features/[slug]` pages
- The `LockedFeature` component (shows upgrade prompt if plan too low)

---

## Theme

The root layout (`app/layout.tsx`) includes an inline script that reads `localStorage.getItem('classsight-theme')` before first paint to prevent flash-of-wrong-theme. The `ThemeToggle` component (in `ToolsAndBadges.tsx`) persists the choice.

Dark mode uses the `[data-theme="dark"]` attribute on `<html>`. CSS custom properties are overridden in `tokens.css`.

---

## Honesty and honesty phrases

The following phrases are contractually required to appear verbatim wherever the subject is discussed:

1. **Face embeddings:** "Face embeddings are not yet encrypted at rest."
2. **Auto-commit:** "Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action."
3. **Consent/legal:** "Designed to support consent workflows; legal text needs lawyer review."
4. **Accuracy numbers:** any figure must be labelled "Simulated on LFW, NOT classroom accuracy."
5. **Minor students:** "Guardian consent is required for minors."
6. **UI-PREVIEW forms:** submit result must say "Demo mode, nothing was sent."

---

## Run the UI (README excerpt)

```bash
# Prerequisites: Node 20+, npm 10+
cd frontend-next
cp .env.example .env.local   # copy and fill real values for staging/prod
npm install
npm run dev      # dev server on http://localhost:3010
```

For production:
```bash
NEXT_PUBLIC_DEMO_DATA=true npm run build
# then:
npm start
```
