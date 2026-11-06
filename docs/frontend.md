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

The route source is `frontend-next/config/routes.ts`. Local Docker enables the static admin and owner demo pages by default; they return 404 when `NEXT_PUBLIC_DEMO_DATA=false`.

The existing root route remains the wired faculty workspace so the current login and capture flow stays compatible with the repository's e2e smoke test. The public startup site is available at `/home`, with pricing at `/pricing`. `/admin` and `/owner` are static demo surfaces and return 404 unless `NEXT_PUBLIC_DEMO_DATA=true`.

The plan registry lives in `frontend-next/lib/plans.ts`, `features.ts`, and `entitlements.ts`. Prices are intentionally `null` until an owner sets them. Plans are cumulative: Pro includes Essential and Advanced includes Pro.

For local demo panels:

```powershell
$env:NEXT_PUBLIC_DEMO_DATA="true"
Set-Location frontend-next
npm run dev
```

Docker build arguments are also supported. Changing either demo variable requires `docker compose build frontend-next`.

The capture, enrollment, review, analytics, privacy, and terms pages use the existing wired or documented surfaces. Marketing copy does not claim classroom accuracy or legal compliance; the legal pages remain draft templates.

Plan configuration is in `lib/plans.ts`, `lib/features.ts`, and `lib/entitlements.ts`; prices remain null until an owner sets them. Demo records are in `lib/demo-data.ts`. Replace demo sections with authenticated API calls while retaining the same page templates and explicit loading/error states.
