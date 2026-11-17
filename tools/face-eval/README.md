# ClassSight Face-Eval Harness

> **PURPOSE**: This is an **offline evaluation harness only**. It measures the accuracy, fairness, and threshold behaviour of face-recognition models. It does **NOT** modify any production code, database, or running service.

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Running the Harness](#running-the-harness)
4. [Configuration](#configuration)
5. [Dataset Conditions](#dataset-conditions)
6. [Recognizers & Detectors](#recognizers--detectors)
7. [Consent & Privacy Checklist for Real Data](#consent--privacy-checklist-for-real-data)
8. [Important Caveats](#important-caveats)
9. [Output Files](#output-files)

---

## Overview

The ClassSight Face-Eval harness runs a reproducible, auditable benchmark across multiple face-recognition back-ends (R0–R5) and multiple datasets (LFW, CALFW, CPLFW, and optional real consented data). It computes:

- Equal Error Rate (EER) and bootstrap confidence intervals
- TAR @ FAR=1% and FAR=0.1%
- Rank-1 Accuracy (closed-set identification)
- Open-set FAR with Wilson confidence intervals
- Per-condition performance breakdowns
- Latency statistics (median, p95)
- Tier distribution (AUTO / REVIEW / UNKNOWN) under production thresholds

The harness is completely independent of `face-service-fastapi/`. It imports **no production modules** — it re-implements or wraps the same underlying models in read-only adapter classes.

---

## Installation

```powershell
# 1. Create a dedicated virtual environment (keep eval deps isolated)
python -m venv .work/eval-venv

# 2. Activate it
.work\eval-venv\Scripts\Activate.ps1

# 3. Install evaluation dependencies
pip install -r tools/face-eval/requirements-eval.txt
```

> **Note**: PyTorch download can be large (~1 GB). If you are on a metered connection, consider pre-downloading the wheels.

---

## Running the Harness

```powershell
# Full evaluation (all phases, all recognizers, all enabled datasets)
python -m face_eval --config tools/face-eval/config.yaml

# Only specific recognizers
python -m face_eval --config tools/face-eval/config.yaml --recognizer R0,R1

# Only specific datasets
python -m face_eval --config tools/face-eval/config.yaml --dataset lfw

# Only specific phases
python -m face_eval --config tools/face-eval/config.yaml --phase inventory,calibrate

# Verify data structure before running
python -m face_eval verify-data --config tools/face-eval/config.yaml

# Run unit tests for the harness itself
cd tools/face-eval
python -m pytest tests/ -v
```

Results are written to `.work/eval-results/` (gitignored).

---

## Configuration

The main configuration file is `tools/face-eval/config.yaml`. Key parameters:

| Parameter | Default | Meaning |
|---|---|---|
| `random_seed` | 42 | Global RNG seed |
| `calibration_split_seed` | 42 | Seed for calibration/test split |
| `calibration_fraction` | 0.3 | Fraction of pairs used for threshold calibration |

Edit `config.yaml` to enable/disable recognizers and datasets, adjust thresholds, or change paths.

---

## Dataset Conditions

Each image in the evaluation is tagged with one or more of the following **condition labels**. These labels appear in per-condition breakdowns in the output reports.

| Condition | Description |
|---|---|
| `normal` | Frontal, well-lit, unoccluded |
| `beard` | Subject has a beard or heavy facial hair |
| `no_beard` | Subject has no beard |
| `glasses` | Subject is wearing glasses |
| `no_glasses` | Subject is not wearing glasses |
| `low_light` | Low-light or dim environment |
| `far` | Camera is far from the subject (small face in frame) |
| `angled` | Non-frontal pose (yaw/pitch) |
| `mask` | Subject is wearing a face mask |
| `other` | Any other condition not covered above |

> ⚠️ **IMPORTANT — beard/no_beard proxy is NOT a real beard test.**
>
> The synthetic `beard` condition is simulated by occluding the lower portion of the face image (a black rectangle). This is a **lower-face-occlusion proxy** — it does **not** represent an actual bearded face. It measures sensitivity to lower-face occlusion only. Any results reported under "beard" conditions must be labelled as *"lower-face-occlusion proxy — NOT a real beard recognition test"* in all reports and presentations.

---

## Recognizers & Detectors

See `config.yaml` for the full list. Summary:

| ID | Name | Notes |
|---|---|---|
| R0 | FaceNet-128d-seed42-L1 | Baseline — exact current pipeline |
| R1 | FaceNet-512d-cosine | FaceNet without projection, cosine distance |
| R2 | FaceNet-512d-L1 | FaceNet without projection, L1 distance |
| R3 | InsightFace-buffalo_l-cosine | ArcFace; research/non-commercial weights |
| R4 | AdaFace | Attempt only — may not be available |
| R5 | ONNX-SFace | OpenCV SFace |

| ID | Name |
|---|---|
| D0 | MTCNN (baseline, matches production) |
| D1 | YuNet |
| D2 | SCRFD/RetinaFace (InsightFace) |

---

## Consent & Privacy Checklist for Real Data

**Before adding ANY real person's images to `eval_data/real/`**, every item on this checklist MUST be completed and documented:

- [ ] **Written consent obtained** — each individual has signed a written consent form specifying that their images will be used for internal face-recognition accuracy evaluation only.
- [ ] **Purpose stated explicitly** — consent form names "ClassSight face-recognition evaluation" as the sole purpose. No secondary uses permitted without fresh consent.
- [ ] **Retention limit agreed** — a data-retention period is specified in the consent form. Images MUST be deleted by that date.
- [ ] **Local storage only** — `eval_data/` is listed in `.gitignore` and MUST NEVER be committed to any repository (local, remote, or fork).
- [ ] **No cloud sync** — the working directory containing `eval_data/` MUST NOT be inside a folder synced by OneDrive, Google Drive, Dropbox, or any other cloud service.
- [ ] **Access control** — `eval_data/` is accessible only to named individuals who have a legitimate need.
- [ ] **Data minimisation** — only the minimum number of images necessary for evaluation are collected.
- [ ] **Right to withdraw** — participants know they can withdraw consent at any time, upon which all their images are deleted immediately.
- [ ] **Ethical review** — if required by your institution or jurisdiction, ethical review / IRB approval has been obtained.
- [ ] **GDPR / FERPA / PDPA compliance** — applicable data-protection regulations for your jurisdiction have been verified with a legal/compliance representative.

> 🔴 **NEVER** commit images to this repository. The `.gitignore` rules block `eval_data/` but a force-add can bypass them. Double-check before every commit.

---

## Important Caveats

1. **Threshold discrepancies**: The config records discrepancies between values in the production code and those in the original evaluation specification. See `config.yaml` comments.
2. **Licence review**: FaceNet weights (vggface2) and InsightFace buffalo_l weights are marked for research/non-commercial use. Commercial deployment requires independent legal review.
3. **LFW licence**: LFW images are for non-commercial research only.
4. **CALFW / CPLFW**: Marked NOT VERIFIED in config — download and licence status have not been confirmed.

---

## Output Files

All outputs are written to `.work/eval-results/` (gitignored):

```
.work/eval-results/
  summary.json          # Top-level metrics for all recognizers × datasets
  per_condition.csv     # Per-condition breakdown table
  calibration.json      # Calibrated thresholds per recognizer
  latency.json          # Latency statistics
  FINAL_RECOGNITION_EVAL.md   # Human-readable final report
```
