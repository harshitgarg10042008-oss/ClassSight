# ClassSight Real Face Data Schema & Protocol

This document describes the directory schema, file naming conventions, and ethical consent requirements for storing real evaluation face images in `eval_data/real/`.

---

## Directory Hierarchy

All real consented data must follow this strict hierarchy:

```
eval_data/real/
├── <person_id>/
│   ├── <session_id>/
│   │   ├── <condition>/
│   │   │   ├── <image_id>.jpg
│   │   │   ├── <image_id>.png
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── ...
```

### Definitions:

1. **`<person_id>`**:
   - Unique anonymous identifier for the individual, e.g. `p001`, `student_42`.
   - **DO NOT** use real names, roll numbers, or student ID numbers.

2. **`<session_id>`**:
   - Unique identifier for the capture session, e.g. `session_01`, `session_02`.
   - Minimum requirement: **At least 2 separate sessions** per person to evaluate temporal stability and appearance variation.

3. **`<condition>`**:
   - Must strictly match one of the allowed controlled vocabulary tags:
     - `normal`: Frontal, well-lit, unobstructed face.
     - `beard`: Subject with natural facial hair / beard.
     - `no_beard`: Subject without facial hair / clean shaven.
     - `glasses`: Subject wearing corrective glasses or sunglasses.
     - `no_glasses`: Subject without glasses.
     - `low_light`: Dim or underexposed environment.
     - `far`: High camera distance (small face crop).
     - `angled`: Non-frontal pose (>20 degrees yaw or pitch).
     - `mask`: Subject wearing medical face mask.
     - `other`: Any other specific environmental variant.

4. **Minimum Dataset Size**:
   - At least **10 distinct people**, each having at least **2 sessions** with valid images.

---

## ⚠️ Important Distinction on "Beard" Conditions

> **CRITICAL**:
> Real data in `eval_data/real/<person_id>/<session_id>/beard/` must consist of **real human subjects with facial hair**.
> In contrast, synthetic degradation experiments using `lower_face_occlusion_beard_proxy` are purely **lower-face black occlusions**.
> A synthetic occlusion proxy is **NOT** a real beard test and must never be conflated with genuine beard variation.

---

## Consent and Privacy Checklist

Before storing any real face image in `eval_data/real/`, you must verify and sign off on the following checklist:

- [ ] **1. Written Consent**: Every participant has signed an explicit written informed consent form.
- [ ] **2. Explicit Purpose**: The consent explicitly mentions internal face recognition accuracy evaluation for ClassSight.
- [ ] **3. No Secondary Use**: Data is strictly prohibited from being used for model training, public benchmarking, or commercial marketing without renewed consent.
- [ ] **4. Defined Retention Period**: A fixed deletion date is established (e.g. 6 months from collection).
- [ ] **5. Local Storage Only**: The data lives exclusively on authorized evaluation workstations.
- [ ] **6. Never Committed to Git**: `eval_data/` is strictly listed in `.gitignore`. No images may ever enter git history.
- [ ] **7. Excluded from Cloud Sync**: Directory must not be located in folders synced with OneDrive, iCloud, Google Drive, or Dropbox.
- [ ] **8. Right of Revocation**: Participants may request image deletion at any time, immediately removing all corresponding directories.
- [ ] **9. Anonymization**: Filenames and folder identifiers must contain no personally identifiable information (PII).

---

## Validation Script

You can validate any directory containing real face images against this schema before using it in the harness:

```powershell
python tools/face-eval/face_eval/datasets/validate_real_data.py eval_data/real
```
