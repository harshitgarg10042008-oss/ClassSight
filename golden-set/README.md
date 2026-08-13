# Stage 13 Golden Set

This folder contains real photos and hand-verified expected identities for manually runnable regression checks. The set remains provisional because even the new larger entry is not the requested real 30+ person back-of-room classroom photo.

Run the regression from the repository root with:

```bash
python3 golden-set/run-regression.py
```

The script uses the current `face-service-fastapi/main.py` `/recognize` route and appends one row to `golden-set/accuracy-log.csv` per run. It preserves the original Obama/Biden cross-photo entry and the separate `largegroup-1899/classroom_1899.jpg` entry. The larger entry uses four manually selected reference crops and an `expected_by_face` map so identity swaps are reported rather than hidden by set-level counts.

Expected identities must be verified visually and must not be generated from recognition output. A non-zero regression exit is an honest failure signal; it must not be converted into a pass by changing the expected identities or thresholds. Do not treat the current accuracy number as a production benchmark. Re-measure after the requested real 30+ person back-of-room classroom image is available.
