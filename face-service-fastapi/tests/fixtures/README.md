# Cross-photo recognition fixtures

These fixtures deliberately use different photographs for enrollment and recognition. The reference images are individual portraits, while the group image is a separate candid photograph taken at a different time and angle. The group photograph includes Barack Obama and Joe Biden, who are enrolled in the test, plus additional people who are not enrolled.

| Fixture | Role | Source |
|---|---|---|
| `obama_reference.jpg` | Individual enrollment reference for student 101 | [Official portrait of Barack Obama](https://commons.wikimedia.org/wiki/File:Official_portrait_of_Barack_Obama.jpg) |
| `biden_reference.jpg` | Individual enrollment reference for student 102 | [Joe Biden official portrait](https://commons.wikimedia.org/wiki/File:Joe_Biden_official_portrait.jpg) |
| `obama_biden_group_2010.jpg` | Distinct group-photo recognition input | [Barack Obama and Joe Biden speak to a bipartisan group of governors, 2010](https://commons.wikimedia.org/wiki/File:Barack_Obama_and_Joe_Biden_speak_to_a_bipartisan_group_of_governors,_2010.jpg) |

The test does not expect near-1.0 confidence. Match decisions use raw `face_recognition` distance with `distance < 0.60`; the endpoint’s `confidence_score` is a display-only sigmoid where distance `0.60` maps to confidence `0.50`, so the same numeric cutoff is never reused for confidence. The test fails if an enrolled person is not correctly matched as PRESENT or if an unenrolled face receives a PRESENT candidate.
