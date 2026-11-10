# Changelog

All notable changes to the ClassSight project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.4.0] - 2026-11-10

### Added
- **Unified Interior AppShell**: Single shared interior shell architecture with grouped collapsible sidebar (Workspace, Classes, Insights, Requests, Account), dynamic breadcrumbs, responsive topbar, and plan-lock indicators via `LockedFeature`.
- **Top Bar System**: Integrated global search and `Ctrl+K` command palette, persisted sun/moon theme toggle, bilingual English/Hindi switch, unread notification counter with dropdown preview, quick attendance trigger button, user profile menu with role badge, and development environment indicator.
- **Dedicated SVG Icon System**: Hand-crafted theme-aware inline SVG icons in `frontend-next/components/ui/Icons.tsx` replacing all previous emoji iconography and empty-state graphics.
- **Full Interior Views**: 17 complete `/app/*` routes covering:
  - Today's agenda (`/app/today`) with live timetable slot execution and manual roll-call fallback.
  - Class management & detail (`/app/classes`, `/app/classes/[id]`) with roster, enrolment shortcuts, and attendance trends.
  - Student directory & profile (`/app/students`, `/app/students/[id]`) with timeline and biometric consent status.
  - Session history & inspector (`/app/sessions`, `/app/sessions/[id]`) with AUTO/REVIEW/UNKNOWN distributions, absentee list, and review deep links.
  - Review queue (`/app/review`) with single-key faculty approvals.
  - Analytics & Reports (`/app/analytics`, `/app/reports`) with real inline SVG charts (present/absent donut, weekly trend line, student attendance bars, hourly heatmap).
  - Risk radar (`/app/risk`), Leave requests (`/app/leave`), Disputes (`/app/disputes`), Timetable (`/app/timetable`), Camera health (`/app/cameras`), Notifications (`/app/notifications`), Settings (`/app/settings`), and Help center (`/app/help`).

### Fixed
- **Tab Bar Overflow Bug**: Fixed the stray vertical scrollbar on the Overview / Subject Detail tab bar; implemented horizontal-only scrolling on compact mobile viewports (<480px) with hidden scrollbar chrome, full ARIA `role="tablist"` / `role="tab"` semantics, and keyboard arrow navigation.
- **Mobile Viewport Overflow**: Resolved horizontal overflow at 360px and 768px viewports by introducing responsive topbar collapse, clipping background ambient glows, and enforcing `overflow-x: clip`.
- **Color Contrast & Accessibility**: Resolved token contrast deficits to achieve 0 WCAG 2.1 AA/AAA failures across 86 light and dark interior views.
- **Heading Hierarchy**: Eliminated duplicate `<h1>` tags across dashboard and workspace pages to ensure single `h1` per route.

### Changed
- **Safe Repository Cleanup**: Archived unreferenced one-off scratch files and historical development logs; preserved all active test suites, evaluation tools, and operational documentation. Full repository backup bundle and archive secured outside repository tree prior to cleanup.

---

## [v0.3.0] - 2026-10-12
- Completed UI v2 overhaul and multi-shot capture integration.

## [v0.2.0] - 2026-08-13
- Spring Boot backend and FastAPI face service integration.

## [v0.1.0] - 2026-06-01
- Initial prototype release.

