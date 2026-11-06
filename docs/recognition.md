# Recognition

The current pipeline uses the configured MTCNN detector and FaceNet embedding service, then Manhattan (L1) distance matching with Hungarian one-to-one assignment. The tiered decision uses `MANHATTAN_AUTO_ACCEPT=7.75`, `MATCH_MARGIN=1.5`, and `MANHATTAN_THRESHOLD=9.4924`; ambiguous candidates remain REVIEW and distant candidates remain UNKNOWN.

Recognition figures based on public LFW images are simulated on LFW, NOT classroom accuracy.
