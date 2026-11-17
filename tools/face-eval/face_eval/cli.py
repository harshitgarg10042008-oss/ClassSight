"""face_eval/cli.py

Command-line interface for the ClassSight face-eval harness.

Usage examples
--------------
# Full run
python -m face_eval --config tools/face-eval/config.yaml

# Only specific recognizers
python -m face_eval --config tools/face-eval/config.yaml --recognizer R0,R1

# Only specific datasets
python -m face_eval --config tools/face-eval/config.yaml --dataset lfw

# Verify data layout
python -m face_eval verify-data --config tools/face-eval/config.yaml
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import yaml


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_config(config_path: str | Path) -> dict:
    p = Path(config_path)
    if not p.exists():
        print(f"[face_eval] ERROR: config file not found: {p}", file=sys.stderr)
        sys.exit(1)
    with p.open() as fh:
        cfg = yaml.safe_load(fh)
    return cfg


def _parse_csv(value: str, all_sentinel: str = "all") -> list[str] | None:
    """Return None for 'all', otherwise a list of stripped tokens."""
    if value.strip().lower() == all_sentinel:
        return None
    return [t.strip() for t in value.split(",") if t.strip()]


# ---------------------------------------------------------------------------
# Sub-command implementations (stubs — phases are wired in runner.py)
# ---------------------------------------------------------------------------

def _cmd_run(args: argparse.Namespace) -> None:
    config = _load_config(args.config)

    seed = args.seed if args.seed is not None else config.get("random_seed", 42)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    recognizers = _parse_csv(args.recognizer)   # None == all
    datasets    = _parse_csv(args.dataset)       # None == all
    phases      = _parse_csv(args.phase)         # None == all

    print("face_eval harness starting")
    print(f"  config     : {args.config}")
    print(f"  output_dir : {output_dir}")
    print(f"  seed       : {seed}")
    print(f"  recognizers: {recognizers or 'all'}")
    print(f"  datasets   : {datasets or 'all'}")
    print(f"  phases     : {phases or 'all'}")

    # Import runner lazily so the CLI itself is importable without heavy deps.
    try:
        from face_eval.runner import run_evaluation
        run_evaluation(config=config, output_dir=output_dir, seed=seed,
                       recognizer_filter=recognizers,
                       dataset_filter=datasets,
                       phase_filter=phases)
    except ImportError as exc:
        print(f"[face_eval] WARNING: runner import failed — {exc}", file=sys.stderr)
        print("[face_eval] Stub mode: harness skeleton only. Install requirements-eval.txt.")

    print("face_eval harness done.")


def _cmd_verify_data(args: argparse.Namespace) -> None:
    config = _load_config(args.config)
    print("face_eval verify-data starting")

    real_cfg = config.get("datasets", {}).get("real", {})
    real_path = Path(real_cfg.get("path", "eval_data/real"))

    try:
        from face_eval.datasets.validate_real_data import validate_and_report
        validate_and_report(real_path)
    except ImportError as exc:
        print(f"[face_eval] WARNING: validate_real_data import failed — {exc}", file=sys.stderr)

    print("face_eval verify-data done.")


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="face_eval",
        description="ClassSight face-recognition evaluation harness.",
    )
    sub = parser.add_subparsers(dest="command")

    # --- run (default) ---
    run_p = sub.add_parser("run", help="Run the evaluation (default command).")
    run_p.add_argument("--config", default="tools/face-eval/config.yaml",
                       help="Path to config.yaml")
    run_p.add_argument("--output-dir", default=".work/eval-results",
                       help="Directory to write results into")
    run_p.add_argument("--seed", type=int, default=None,
                       help="Override random seed (default: from config)")
    run_p.add_argument("--recognizer", default="all",
                       help="Comma-separated recognizer IDs (R0,R1,...) or 'all'")
    run_p.add_argument("--dataset", default="all",
                       help="Comma-separated dataset keys or 'all'")
    run_p.add_argument("--phase", default="all",
                       help="Comma-separated phases: inventory,calibrate,evaluate,report or 'all'")

    # --- verify-data ---
    vd_p = sub.add_parser("verify-data", help="Verify real data directory structure.")
    vd_p.add_argument("--config", default="tools/face-eval/config.yaml",
                      help="Path to config.yaml")

    return parser


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def main(argv: list[str] | None = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)

    # Default to 'run' if no subcommand supplied.
    if args.command is None or args.command == "run":
        # Re-parse with defaults for run sub-command if needed.
        if args.command is None:
            # Inject 'run' and re-parse so we get the right defaults.
            args = parser.parse_args(["run"] + (argv or sys.argv[1:]))
        _cmd_run(args)
    elif args.command == "verify-data":
        _cmd_verify_data(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
