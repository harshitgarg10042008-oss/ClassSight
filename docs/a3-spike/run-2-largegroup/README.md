# A3 Follow-up: Larger Classroom Stand-In

## Source and license

The stand-in is the public-domain/no-known-restrictions 1899 Library of Congress classroom photograph documented on Wikimedia Commons:

- Commons source page: https://commons.wikimedia.org/wiki/File:Grade_school_children_posed_in_classroom,_with_teacher_standing_in_back_of_room,_Washington,_D.C._LCCN96525653.jpg
- Library of Congress catalog: https://www.loc.gov/pictures/item/96525653/
- High-resolution source: https://upload.wikimedia.org/wikipedia/commons/e/ea/Grade_school_children_posed_in_classroom%2C_with_teacher_standing_in_back_of_room%2C_Washington%2C_D.C._LCCN96525653.jpg
- Source dimensions: 1,536 × 1,085 pixels; 216,467 bytes.

It is a useful licensed stand-in but is **not** the requested real 30+ person back-of-room phone capture. It is a posed historical classroom photograph, and its image quality and subject distance are not representative of the final deployment target.

## Manual ground truth

Visual inspection found approximately **23 visible faces**: roughly 22 children and one teacher. Four frontal, detector-found faces were manually selected as the enrolled subset and saved under `candidate-crops/`. All other visible people were intentionally treated as strangers or undetected faces. The pipeline output was not used to define this ground truth.

## Live production-path result

The follow-up harness called the existing FastAPI `/recognize` route with the unchanged distance threshold `0.6` and the full-resolution image. The detector found **4 faces**, leaving approximately **19 visible faces undetected**. This is the main A3 finding: the problem is primarily detection at this image scale and composition, not the confidence threshold.

| Face | Manual identity | Predicted identity | Matched at distance < 0.6 | Distance | Confidence | Face-size ratio |
|---:|---|---|---:|---:|---:|---:|
| 0 | candidate_00 | candidate_01 | Yes | 0.068034 | 0.995129 | 0.001591 |
| 1 | candidate_01 | candidate_02 | Yes | 0.052625 | 0.995822 | 0.002307 |
| 2 | candidate_02 | candidate_00 | Yes | 0.108604 | 0.992710 | 0.001109 |
| 3 | candidate_03 | candidate_03 | Yes | 0.056023 | 0.995678 | 0.001623 |

Only **1 of 4 enrolled faces was identified correctly**. All four were close enough to the enrolled set to pass the unchanged `0.6` distance threshold, but three were identity confusions among visually similar low-resolution faces. The face-size warning threshold `0.0005` did **not** fire. Detected ratios ranged from `0.001109` to `0.002307`, all above the warning boundary.

Quality diagnostics were `quality_passed=true`, blur score `64.2031`, brightness mean `93.7845`, liveness score `0.3174`, and liveness texture score `6.349`. The quality gate therefore did not prevent this result; detection and identity ambiguity are the material limitations.

## Regression result

The expanded golden-set run retained the original Obama/Biden entry and appended a separate larger-stand-in entry. The corrected append-only row records:

- Combined identity accuracy: **33.33%** across six manually expected enrolled faces.
- False negatives: **1**, from the original Biden cross-photo case.
- False positives: **0**.
- Larger-stand-in identity mismatches: **3** of 4 detected enrolled faces.
- Larger-stand-in detector recall against the approximate visual count: **4 / 23 ≈ 17.39%**.

The regression exits non-zero because the expected identity checks expose real failures. This is intentional and is not being rounded into a pass.

## Decision

Production thresholds were not changed. This single provisional image is insufficient to move the `0.6` distance cutoff or the `0.0005` face-size threshold. The same measurements must be repeated with the requested real 30+ person classroom photograph taken from the actual phone/laptop position before final threshold or review-queue decisions are made.
