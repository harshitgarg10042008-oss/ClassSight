"""face_eval/datasets/validate_real_data.py

CLI validator script for onboarding real consented benchmark data.
Usage:
  python tools/face-eval/face_eval/datasets/validate_real_data.py <path>
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path
from collections import Counter

from face_eval.datasets.real_dataset import VALID_CONDITIONS


def validate_and_report(data_path: str | Path, min_people: int = 10, min_sessions: int = 2) -> bool:
    """Validate structure of real consented data folder and print report."""
    root = Path(data_path)
    print("=" * 60)
    print(f"Validating Real Dataset at: {root.resolve()}")
    print("=" * 60)

    if not root.exists():
        print(f"❌ Root directory not found: {root}")
        return False

    people = [p for p in root.iterdir() if p.is_dir()]
    print(f"Total person directories found: {len(people)}")

    condition_counts = Counter()
    qualified_people = 0
    total_images = 0
    invalid_conditions = set()

    for p in people:
        sessions = [s for s in p.iterdir() if s.is_dir()]
        sessions_with_images = 0

        for s in sessions:
            conds = [c for c in s.iterdir() if c.is_dir()]
            session_has_img = False

            for c in conds:
                c_name = c.name.lower()
                imgs = list(c.glob("*.jpg")) + list(c.glob("*.jpeg")) + list(c.glob("*.png"))
                if imgs:
                    session_has_img = True
                    total_images += len(imgs)
                    if c_name in VALID_CONDITIONS:
                        condition_counts[c_name] += len(imgs)
                    else:
                        invalid_conditions.add(c.name)
            if session_has_img:
                sessions_with_images += 1

        if sessions_with_images >= min_sessions:
            qualified_people += 1

    print(f"People with >= {min_sessions} sessions: {qualified_people}/{len(people)} (required: >={min_people})")
    print(f"Total valid images found: {total_images}")
    print("\nImage counts per condition:")
    for cond in sorted(VALID_CONDITIONS):
        print(f"  - {cond:12s}: {condition_counts[cond]}")

    if invalid_conditions:
        print(f"\n⚠️  Unrecognised condition directories found: {sorted(invalid_conditions)}")
        print(f"   Allowed conditions: {sorted(VALID_CONDITIONS)}")

    passed = (qualified_people >= min_people)
    print("=" * 60)
    if passed:
        print("✅ Real data meets all validation requirements.")
    else:
        print("❌ Real data DOES NOT meet requirements (insufficient consented people/sessions).")
    print("=" * 60)
    return passed


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate real consented face data layout.")
    parser.add_argument("path", nargs="?", default="eval_data/real", help="Path to real data directory")
    parser.add_argument("--min-people", type=int, default=10, help="Minimum qualified people (default: 10)")
    parser.add_argument("--min-sessions", type=int, default=2, help="Minimum sessions per person (default: 2)")
    args = parser.parse_args()

    ok = validate_and_report(args.path, min_people=args.min_people, min_sessions=args.min_sessions)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
