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
## 2026-10-11

1. The existing worktree changes are preserved. The SaaS build must integrate
   with them and must not reset or overwrite unrelated user work.
2. The supplied task catalog is tracked in ordered, independently verifiable
   tasks. A task is not considered complete based on code inspection alone;
   its acceptance checks and limitations are recorded in `docs/PROGRESS.md`.
3. No real credentials, student photographs, or biometric data will be added
   while implementing the plan. Demo data remains synthetic or explicitly
   consented.
4. Existing Flyway migrations remain immutable. Schema changes use new
   migrations only.
5. Face embeddings carry an explicit model-version label. Changing the
   embedding model requires a new version and explicit re-enrollment; existing
   vectors are not silently interpreted as the new model.
6. Missing local validation tools are an environment blocker, not a passing
   result. Tool installation will only be considered when needed for a
   dependency-aware validation step.
