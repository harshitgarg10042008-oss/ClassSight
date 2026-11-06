# Validation

All public-photo figures below are **simulated on LFW, NOT classroom accuracy**.

| Metric | Verified value |
|---|---:|
| Detector | MTCNN |
| `T_auto` / `M` / `T_review` | 7.75 / 1.5 / 9.4924 |
| EER | 1.69% |
| Genuine pair mean | 5.87 |
| Impostor pair mean | 12.55 |
| Class AUTO | 88.00% (Wilson 95% CI 80.19%-93.00%) |
| Class REVIEW | 11.00% (6.25%-18.63%) |
| Class UNKNOWN | 1.00% (0.18%-5.45%) |
| Outsider AUTO | 0/100 (0.00%-3.70%) |
| Wrong-identity AUTO | 0/6000 (0.00%-0.06%); identities are reused across rosters |
| Detector benchmark | Haar 45%, YuNet 99%, MTCNN 100% at 60/80/120 px; median 44.5/134.4/313.3 ms |
| 30-face service latency | Median 2235 ms, p95 3092 ms, embedding 1885 ms, 12-core CPU |

The latency figure is service-only, not the full capture-to-attendance-result path.

## Test counts

The verified source baseline has 17 face-service pytest tests, 24 Maven tests, 3 API smoke tests, and 1 browser smoke test. The complete 30-face enrollment/retake matrix and full browser workflow remain not verified.

## Not verified

Real webcam behavior, real classroom accuracy, native 512-d cosine comparison, the 3x3 group-photo matrix, and fresh-clone proof.
