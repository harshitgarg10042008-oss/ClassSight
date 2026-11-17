"""tools/face-eval/run.py

CLI entry point for the face-eval harness.
Can be run directly via:
    python tools/face-eval/run.py [args]
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add tools/face-eval to sys.path so face_eval package is importable
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from face_eval.cli import main

if __name__ == "__main__":
    main()
