#!/usr/bin/env python3
"""PostToolUse on Edit|Write: an edited src/**/*.mjs file is cruised against
the lane rule at once, so a new crossing edge reaches the session in the same
turn (kogaki#1746). The rule is `.dependency-cruiser.cjs`; this hook runs it
over the one file, with the known-violations baseline, and exits 2 with the
violation on stderr. Any other path returns 0 without running anything."""
import json
import pathlib
import subprocess
import sys

CONFIG = ".dependency-cruiser.cjs"
BASELINE = ".dependency-cruiser-known-violations.json"


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return 0
    path = (payload.get("tool_input") or {}).get("file_path") or ""
    if not path.endswith(".mjs"):
        return 0
    edited = pathlib.Path(path).resolve()
    root = next((p for p in edited.parents if (p / CONFIG).is_file()), None)
    if root is None:
        return 0
    rel = edited.relative_to(root).as_posix()
    if not rel.startswith("src/"):
        return 0
    depcruise = root / "node_modules" / ".bin" / "depcruise"
    if not depcruise.exists():
        print("lint-on-edit: %s is absent; run `npm ci` in %s"
              % (depcruise, root), file=sys.stderr)
        return 2
    ran = subprocess.run(
        [str(depcruise), rel, "--config", CONFIG, "--ignore-known", BASELINE,
         "--output-type", "err"],
        cwd=root, capture_output=True, text=True)
    if ran.returncode == 0:
        return 0
    print(ran.stdout + ran.stderr, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
