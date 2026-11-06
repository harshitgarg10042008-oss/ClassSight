# ClassSight frontend

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
