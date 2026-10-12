# ClassSight Decisions

## 2026-10-12 — Execution and branch consolidation

- Follow the supplied phased plan in Tier A, Tier B, Tier C, then the final
  audit.
- Preserve existing demo behavior and use new Flyway migrations for schema
  changes; do not edit historical migrations.
- Treat `saas-build` as a candidate for consolidation because it contains
  additional recognition instrumentation, frontend flows, tests, and planning
  records. Its build and tests must be checked before accepting it.
- Keep the two pre-consolidation backup tags permanently.
- Report measured performance and face-size results only; synthetic results
  will be labeled as synthetic.
