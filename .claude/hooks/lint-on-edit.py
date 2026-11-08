#!/usr/bin/env python3
"""PostToolUse on Edit|Write: an edited src/**/*.mjs file is cruised against
the lane rule at once, so a new crossing edge reaches the session in the same
turn (kogaki#1746), and an edited src/ or checks/ .mjs file is linted with
ESLint, so a new finding does too (kogaki#1747). The rules are
`.dependency-cruiser.cjs` and `eslint.config.mjs`; this hook runs each over
the one file with its baseline and exits 2 with the findings on stderr. Any
other path returns 0 without running anything."""
import json
import pathlib
import subprocess
import sys

CONFIG = ".dependency-cruiser.cjs"
BASELINE = ".dependency-cruiser-known-violations.json"
SUPPRESSIONS = "eslint-suppressions.json"


def run(root, tool, args):
    binary = root / "node_modules" / ".bin" / tool
    if not binary.exists():
        return "lint-on-edit: %s is absent; run `npm ci` in %s\n" % (
            binary, root)
    ran = subprocess.run([str(binary), *args], cwd=root, capture_output=True,
                         text=True)
    return "" if ran.returncode == 0 else ran.stdout + ran.stderr


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
    if not rel.startswith(("src/", "checks/")):
        return 0
    found = run(root, "eslint", ["--max-warnings", "0",
                                 "--suppressions-location", SUPPRESSIONS,
                                 rel])
    if rel.startswith("src/"):
        found += run(root, "depcruise",
                     [rel, "--config", CONFIG, "--ignore-known", BASELINE,
                      "--output-type", "err"])
    if not found:
        return 0
    print(found, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
