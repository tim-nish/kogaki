#!/usr/bin/env python3
"""PostToolUse on Edit|Write: an edited src/**/*.mjs file is cruised against
the lane rule at once, so a new crossing edge reaches the session in the same
turn (kogaki#1746), and an edited src/ or checks/ .mjs file is linted with
ESLint, so a new finding does too (kogaki#1747), an edited src/ .mjs file is
type-checked against its `tsc-baseline.json` row (kogaki#1791), and an edited
.sh or .py file is measured against the heredoc bound (kogaki#1790). The rules
are `.dependency-cruiser.cjs`, `eslint.config.mjs`, `jsconfig.json` and
`checks/check-heredoc-bound.py`; this hook runs each over the one file with
its baseline and exits 2 with the findings on stderr. Every registered member
whose tier is `fast` and whose `covers` holds the edited path runs too, and a
failing one exits 2 with its output (kogaki#1794). Any other path returns 0
without running anything."""
import json
import pathlib
import subprocess
import sys

CONFIG = ".dependency-cruiser.cjs"
BASELINE = ".dependency-cruiser-known-violations.json"
SUPPRESSIONS = "eslint-suppressions.json"
HEREDOC_BOUND = "checks/check-heredoc-bound.py"
TYPES = "checks/check-types.py"
REGISTRY = "checks/registry.json"
INTERPRETERS = {".sh": "bash", ".mjs": "node", ".py": sys.executable}


def run(root, tool, args):
    binary = root / "node_modules" / ".bin" / tool
    if not binary.exists():
        return "lint-on-edit: %s is absent; run `npm ci` in %s\n" % (
            binary, root)
    ran = subprocess.run([str(binary), *args], cwd=root, capture_output=True,
                         text=True)
    return "" if ran.returncode == 0 else ran.stdout + ran.stderr


def types(root, rel):
    if not (root / TYPES).is_file():
        return ""
    ran = subprocess.run([sys.executable, str(root / TYPES), "--file", rel],
                         cwd=root, capture_output=True, text=True)
    return "" if ran.returncode == 0 else ran.stdout + ran.stderr


def heredoc_bound(edited):
    root = next((p for p in edited.parents if (p / HEREDOC_BOUND).is_file()),
                None)
    if root is None:
        return 0
    ran = subprocess.run([sys.executable, str(root / HEREDOC_BOUND), "--file",
                          edited.relative_to(root).as_posix()], cwd=root,
                         capture_output=True, text=True)
    if ran.returncode == 0:
        return 0
    print(ran.stdout + ran.stderr, file=sys.stderr)
    return 2


def fast_members(edited):
    root = next((p for p in edited.parents if (p / REGISTRY).is_file()), None)
    if root is None:
        return 0
    rel = edited.relative_to(root).as_posix()
    try:
        entries = json.loads((root / REGISTRY).read_text())["checks"]
    except (OSError, ValueError, KeyError):
        return 0
    status = 0
    for entry in entries:
        if (entry.get("admission") or {}).get("tier") != "fast":
            continue
        covers = [c.rstrip("/") for c in entry.get("covers") or []]
        if not any(rel == c or rel.startswith(c + "/") for c in covers):
            continue
        member = root / entry["file"]
        interpreter = INTERPRETERS.get(member.suffix)
        if interpreter is None or not member.is_file():
            continue
        ran = subprocess.run([interpreter, str(member)], cwd=root,
                             capture_output=True, text=True)
        if ran.returncode != 0:
            print("lint-on-edit: fast member %s failed on %s\n%s" % (
                entry["id"], rel, ran.stdout + ran.stderr), file=sys.stderr)
            status = 2
    return status


def main():
    try:
        payload = json.load(sys.stdin)
    except ValueError:
        return 0
    path = (payload.get("tool_input") or {}).get("file_path") or ""
    status = fast_members(pathlib.Path(path).resolve()) if path else 0
    if path.endswith((".sh", ".py")):
        return max(status, heredoc_bound(pathlib.Path(path).resolve()))
    if not path.endswith(".mjs"):
        return status
    edited = pathlib.Path(path).resolve()
    root = next((p for p in edited.parents if (p / CONFIG).is_file()), None)
    if root is None:
        return status
    rel = edited.relative_to(root).as_posix()
    if not rel.startswith(("src/", "checks/")):
        return status
    found = run(root, "eslint", ["--max-warnings", "0",
                                 "--suppressions-location", SUPPRESSIONS,
                                 rel])
    if rel.startswith("src/"):
        found += run(root, "depcruise",
                     [rel, "--config", CONFIG, "--ignore-known", BASELINE,
                      "--output-type", "err"])
        found += types(root, rel)
    if not found:
        return status
    print(found, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
