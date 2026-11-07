# ClassSight frontend

## Route map

| Route | Layout | Mode | Backend needed |
|---|---|---|---|
| `/` | MarketingLayout | STATIC | No |
| `/pricing` | MarketingLayout | STATIC | No |
| `/privacy`, `/terms` | Legal draft | STATIC | No |
| `/app` and `/app/*` | AppShell/PageLayout | WIRED | Yes |
| `/admin/*` | AdminShell foundation | STATIC demo | Later role/API wiring |
| `/owner/*` | OwnerShell foundation | STATIC demo | Later owner API wiring |
| `/features`, `/how-it-works`, `/security`, `/trust` | Public product pages | STATIC | No |
| `/contact`, `/book-demo`, `/faq`, `/docs`, `/status`, `/accessibility` | Public support pages | UI-PREVIEW | Optional forms adapter |
| `/login` | AuthShell | WIRED | Yes |
| `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invite`, `/two-factor` | AuthShell | UI-PREVIEW | No |

The route source is `frontend-next/config/routes.ts`. Local Docker enables the static admin and owner demo pages by default; they return 404 when `NEXT_PUBLIC_DEMO_DATA=false`.

The existing root route remains the wired faculty workspace so the current login and capture flow stays compatible with the repository's e2e smoke test. The public startup site is available at `/home`, with pricing at `/pricing`. `/admin` and `/owner` are static demo surfaces and return 404 unless `NEXT_PUBLIC_DEMO_DATA=true`.

The plan registry lives in `frontend-next/lib/plans.ts`, `features.ts`, and `entitlements.ts`. Prices are intentionally `null` until an owner sets them. Plans are cumulative: Pro includes Essential and Advanced includes Pro.

The public visual system is defined in `app/globals.css` and uses the Lagoon + Coral on Ink palette. The root layout applies a persisted light/dark theme before first paint. Reusable controls live under `components/ui`; `PasswordInput` provides the keyboard-operable show/hide control used by auth surfaces.

Forms use `lib/forms.ts`. Without `NEXT_PUBLIC_FORMS_ENDPOINT`, submissions end in the explicit message “Demo mode, nothing was sent.” No external fonts, analytics, or runtime CDNs are used.

For local demo panels:

```powershell
$env:NEXT_PUBLIC_DEMO_DATA="true"
Set-Location frontend-next
npm run dev
```

Docker build arguments are also supported. Changing either demo variable requires `docker compose build frontend-next`.

The capture, enrollment, review, analytics, privacy, and terms pages use the existing wired or documented surfaces. Marketing copy does not claim classroom accuracy or legal compliance; the legal pages remain draft templates.

Run the frontend route sweep against a local server with `npm run ui-route-sweep`. It checks HTTP 200, one `h1`, one `title`, and a main landmark for the representative route manifest.

Plan configuration is in `lib/plans.ts`, `lib/features.ts`, and `lib/entitlements.ts`; prices remain null until an owner sets them. Demo records are in `lib/demo-data.ts`. Replace demo sections with authenticated API calls while retaining the same page templates and explicit loading/error states.
