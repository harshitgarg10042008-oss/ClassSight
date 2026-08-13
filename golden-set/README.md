# Stage 13 Golden Set

This folder contains real photos and hand-verified expected identities for manually runnable regression checks. The current set is provisional because the available source is not a 30+ person back-of-room classroom photo. Do not treat the current accuracy number as a production benchmark.

Run the regression from the repository root with:

```bash
python3 golden-set/run-regression.py
```

The script uses the current `face-service-fastapi/main.py` `/recognize` route and appends one row to `golden-set/accuracy-log.csv` per run. Re-run it after changing the recognition model, distance threshold, enrollment images, or quality/liveness logic. To add a photo, copy it into this folder and add a matching entry to `expected-results.json`; expected identities must be verified visually and must not be generated from the recognition output.
