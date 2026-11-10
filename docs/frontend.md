# ClassSight Frontend

> Updated: November 2026 — reflects App Interior Redesign (Prompt 11 / v0.4.0), unified AppShell, SVG icon system, ARIA tab navigation, and 137-route QA sweep.

## Quick start

```bash
cd frontend-next
npm install
npm run dev        # http://localhost:3010
npm run build      # production build (generates 66/66 static pages)
npm run typecheck  # TypeScript check only (npx tsc --noEmit)
npm run test:plans # Verify plan registry
npm run test:owner-config # Verify owner config sync
```

Set `NEXT_PUBLIC_DEMO_DATA=true` (default in `.env.development`) to enable `/admin` and `/owner`.

---

## Design tokens — how to change colours

Tokens live in **`frontend-next/styles/tokens.css`** (light mode under `:root`, dark mode under `[data-theme="dark"]`).

| Variable | Light value | Dark value | Purpose |
|---|---|---|---|
| `--lagoon-400` | `#2DD4BF` | `#2DD4BF` | Accent, hover glow |
| `--lagoon-500` | `#0E9F9A` | `#14B8A6` | Links, focus rings |
| `--lagoon-600` | `#0B7F7B` | `#0D9488` | Primary button background |
| `--coral-500` | `#FF6B4A` | `#FF6B4A` | CTA, highlights |
| `--ink-900` | `#0F1830` | `#F1F5F9` | High-contrast body text |
| `--bg` | `#FBFAF7` | `#0B1120` | Page background |
| `--surface` | `#FFFFFF` | `#131C31` | Card surface |
| `--tier-auto` | `#12B76A` | `#34D399` | AUTO chip fill |
| `--tier-review` | `#F5A524` | `#FBBF24` | REVIEW chip fill |
| `--tier-unknown` | `#8B93A7` | `#94A3B8` | UNKNOWN chip fill |
| `--tier-absent` | `#E5484D` | `#F87171` | ABSENT chip fill |

**To change a colour:** edit the CSS variable under `:root` for light and `[data-theme="dark"]` for dark.  
**Never** put white text on low-contrast accents — primary buttons use `--lagoon-600` (meets WCAG 2.1 AA with white text).

---

## Interior Shell Architecture (`AppShell`)

The entire interior application is wrapped in a single unified shell: **`components/shell/AppShell.tsx`**.

### 1. Grouped Navigation Sidebar
- **Workspace**: Dashboard (`/app`), Today (`/app/today`), Take Attendance (`/app?tab=capture`), Review Queue (`/app/review`), Sessions (`/app/sessions`).
- **Classes**: Classes (`/app/classes`), Enrollment (`/app/enrollment`), Students (`/app/students`), Timetable (`/app/timetable`), Cameras (`/app/cameras`).
- **Insights**: Analytics (`/app/analytics`), Reports (`/app/reports`), Risk Radar (`/app/risk`).
- **Requests**: Leave (`/app/leave`), Disputes (`/app/disputes`).
- **Account**: Notifications (`/app/notifications`), Settings (`/app/settings`), Help (`/app/help`).
- Collapsible sidebar, active route detection, mobile drawer, and plan lock icons via `LockedFeature`.

### 2. Top Bar Utilities
- **Breadcrumbs**: Dynamic hierarchical path navigation (`AppBreadcrumbs`).
- **Global Search / Command Palette**: Press `Ctrl+K` or click search to open `CommandPalette` with instant route search and actions.
- **Theme Toggle**: Sun/moon button persists preference in `localStorage` under `classsight-theme` and updates `data-theme` attribute on `<html>`.
- **Language Switch**: English / Hindi toggle with partial translation indicators.
- **Notification Bell**: Unread count badge with dropdown preview and mark-as-read controls.
- **Quick Action**: "Take attendance" action button.
- **Profile Menu**: User avatar pill with role badge, dropdown menu (Profile, Settings, Appearance, Keyboard shortcuts, Help, Sign out).
- **Developer Hint**: Live environment badge visible only when `NODE_ENV=development`.

### 3. SVG Icon System
All emoji icons and emoji empty states have been replaced with dedicated, scalable, theme-aware inline SVG icons in **`components/ui/Icons.tsx`**.

### 4. TabNav Accessibility & Overflow Fix
The tab navigation (`TabNav.tsx`) uses `role="tablist"`, `role="tab"`, `aria-selected`, and supports full keyboard arrow navigation (`ArrowRight`, `ArrowLeft`, `Home`, `End`). Horizontal scrollbar chrome is hidden and stray vertical scrollbars have been eliminated with `overflow-y: hidden; overflow-x: auto;`.

---

## Routes and Verification

All routes are declared in **`frontend-next/config/routes.ts`**.  
The complete application manifest contains **137 routes** (including the public showcase, marketing, legal, onboarding, auth, and the full `/app/*`, `/admin/*`, `/owner/*`, `/portal/*` interior routes).

### Verification Summary (v0.4.0)
- **Manifest Sweep**: 137/137 routes swept (HTTP 200 OK, zero console errors, zero page runtime errors, exactly one `h1`, unique document titles, main landmark present, no horizontal overflow at 360px and 768px viewports). Evidence: `.work/logs/qa_results.json`.
- **Color Contrast**: 86/86 views checked in both light and dark themes (0 failures across all text nodes and buttons). Evidence: `.work/logs/qa_results.json`.
- **Keyboard Navigation**: Automated tests verified `Ctrl+K` palette trigger and `Escape` dismiss, theme toggle keypress, profile menu toggle, and tab arrow-key switching.
- **Test Suites**:
  - `face-service-fastapi` pytest: 17/17 PASS
  - `backend-spring` Maven test suite: 24/24 PASS
  - `tests/api` API smoke suite: 3/3 PASS
  - `tests/e2e` browser smoke: 1/1 PASS

---

## Honesty and Honesty Disclosures

The following verbatim phrases are enforced across all interior and public views:
1. **Face embeddings:** "Face embeddings are not yet encrypted at rest."
2. **Auto-commit rule:** "Single-capture attendance cannot be committed without the faculty review call; multi-shot finalise can finalise a clean accumulator by explicit faculty action."
3. **Consent workflows:** "Designed to support consent workflows; legal text needs lawyer review."
4. **Accuracy figures:** "Simulated on LFW, NOT classroom accuracy."
5. **Minors:** "Guardian consent is required for minors."
6. **UI-PREVIEW forms:** Submit confirmation banner states: "Demo mode, nothing was sent."
