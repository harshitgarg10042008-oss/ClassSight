# ClassSight Final Windup

## Overall Status

|| Definition of Done Item | Status | Evidence |
||---|---|---|
|| Local demo-fixes == origin/demo-fixes (0 ahead, 0 behind) | PASS | `git rev-list --left-right --count origin/demo-fixes...demo-fixes` = "0 0" |
|| main contains everything in demo-fixes, local main == origin/main | IN PROGRESS | Not yet merged |
|| demo-fixes and main point to same commit | NOT VERIFIED | Not yet merged |
|| git status --porcelain EMPTY on both branches | PASS | `git status --porcelain` = empty on demo-fixes |
|| Old branches archived by tags, deleted locally and remotely | NOT VERIFIED | Not yet executed |
|| Only main and demo-fixes remain | NOT VERIFIED | Not yet executed |
|| Tag v0.1.0 exists locally and on remote | PASS | v0.1.0 exists (from previous run) |
|| Baseline suite green on main | NOT VERIFIED | Not yet run on main |
|| Baseline suite green from fresh clone | NOT VERIFIED | Not yet executed |
|| Mess deleted from repo | NOT VERIFIED | Not yet executed |
|| Docs honest about verified/unverified | NOT VERIFIED | Not yet executed |

## Phase Status

|| Phase | Status | Evidence |
||---|---|---|
|| W0 Safety | DONE | Bundle and zip from previous run exist, archive tags exist |
|| W1 Sync demo-fixes and empty working tree | DONE | demo-fixes 0/0 against origin, clean tree |
|| W2 Docs | NOT VERIFIED | Not yet executed |
|| W3 Delete the mess | NOT VERIFIED | Not yet executed |
|| W4 Merge into main | NOT VERIFIED | Not yet executed |
|| W5 Remove old branches | NOT VERIFIED | Not yet executed |
|| W6 Optional tidy-up | NOT VERIFIED | Not yet executed |
|| W7 Final proof | NOT VERIFIED | Not yet executed |

## Verification (Working Copy - demo-fixes)

|| Gate | Result |
||---|---|
|| Docker Compose rebuild and startup | PASS |
|| Backend health | PASS (HTTP 200) |
|| Face-service health | PASS (HTTP 200) |
|| Face-service tests | PASS (17) |
|| Maven tests | PASS (24) |
|| API smoke tests | PASS (3) |
|| Browser smoke test | PASS (1) |
|| Frontend typecheck and production build | PASS |

Schema fix applied: Changed `day_of_week` from SMALLINT to INTEGER in V7 migration to match Hibernate's default Java int mapping.

## Safety and repository state

- Working branch: `demo-fixes`
- Current commit: `839267e` (fix: change timetable day_of_week from SMALLINT to INTEGER)
- Previous release tag: `v0.1.0` (from previous windup run)
- Safety bundle: `C:\Users\vishe\OneDrive\Desktop\Goal\classsight-windup-20261106-142959.bundle` (from previous run)
- Safety ZIP: `C:\Users\vishe\OneDrive\Desktop\Goal\classsight-windup-20261106-142959.zip` (from previous run)
- Archive tags exist from previous run

## Git State

```
demo-fixes  839267e fix: change timetable day_of_week from SMALLINT to INTEGER
main        0c6e52d merge: integrate completed ClassSight windup
origin/demo-fixes 839267e fix: change timetable day_of_week from SMALLINT to INTEGER
origin/main       0c6e52d merge: integrate completed ClassSight windup
```

demo-fixes is 1 commit ahead of main.

## Next Steps

Continue with W2 (Docs), W3 (Delete mess), W4 (Merge into main), W5 (Remove old branches), W6 (Optional tidy-up), W7 (Final proof).
