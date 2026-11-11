#!/usr/bin/env python3
# THE ON-DEMAND COVERAGE DIGEST (kogaki#1793): which lines of src/ the
# registered suite executes, read at a retention sitting beside the catch
# digest. A report, never a check: unregistered, it decides and denies nothing.
#
# Usage: tools/digest-coverage.py [--only <id>]
import json
import os
import pathlib
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone

ROOT = pathlib.Path(subprocess.run(
    ["git", "-C", str(pathlib.Path(__file__).resolve().parent),
     "rev-parse", "--show-toplevel"],
    check=True, capture_output=True, text=True).stdout.strip())
# Ignored in .gitignore and removed on exit, so the tree is unchanged.
WORK = ROOT / ".coverage"


def parse_args(argv):
    only = None
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--only" and i + 1 < len(argv):
            only = argv[i + 1]
            i += 2
        elif arg.startswith("--only="):
            only = arg.split("=", 1)[1]
            i += 1
        else:
            sys.exit(f"digest-coverage.py: unrecognised argument: {arg}\n"
                     "usage: tools/digest-coverage.py [--only <id>]")
    if only == "":
        sys.exit("digest-coverage.py: --only needs an <id>")
    return only


def registered_ids():
    registry = json.loads((ROOT / "checks/registry.json").read_text())
    return [entry["id"] for entry in registry["checks"]]


def run_suite(only):
    c8 = ROOT / "node_modules/.bin/c8"
    if not c8.exists():
        sys.exit("digest-coverage.py: node_modules/.bin/c8 is absent — run "
                 "`npm ci` first")
    cmd = [str(c8), "--all", "--src", "src", "--include", "src/**/*.mjs",
           "--reporter", "json-summary",
           "--reports-dir", str(WORK / "report"),
           "--temp-directory", str(WORK / "tmp"),
           "bash", "tools/run-registered-checks.sh"]
    if only:
        cmd += ["--only", only]
    env = dict(os.environ, CHECKS_FORCE="1")
    suite_lines = []
    started = time.monotonic()
    # The suite's own output goes to stderr, so stdout carries the report only.
    proc = subprocess.Popen(cmd, cwd=ROOT, env=env, stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT, text=True)
    for line in proc.stdout:
        sys.stderr.write(line)
        if line.startswith("suite:"):
            suite_lines.append(line.rstrip("\n"))
    returncode = proc.wait()
    return returncode, suite_lines, time.monotonic() - started


def pct(metric):
    value = metric.get("pct")
    return value if isinstance(value, (int, float)) else 0.0


def render(only, members, returncode, suite_lines, elapsed):
    summary_path = WORK / "report/coverage-summary.json"
    if not summary_path.exists():
        sys.exit("digest-coverage.py: c8 wrote no coverage summary "
                 f"(suite exit {returncode})")
    summary = json.loads(summary_path.read_text())
    rows = []
    for path, metrics in summary.items():
        if path == "total":
            continue
        rel = os.path.relpath(path, ROOT)
        rows.append((pct(metrics["lines"]), pct(metrics["branches"]),
                     pct(metrics["functions"]), rel))
    rows.sort(key=lambda row: (row[0], row[3]))
    head = subprocess.run(["git", "rev-parse", "--short=12", "HEAD"], cwd=ROOT,
                          check=True, capture_output=True, text=True).stdout
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    scope = (f"one member, --only {only}" if only
             else f"the whole registered suite, {len(members)} member(s)")
    print(f"coverage digest — rendered {now}")
    print(f"window: head {head.strip()}; {scope}; CHECKS_FORCE=1; "
          f"{len(rows)} .mjs file(s) under src/; measured in "
          f"{round(elapsed)} s. An executed line is only known to have run; "
          f"an unexecuted one is known to be untested.")
    print()
    print(f"{'lines':>7} {'branches':>9} {'functions':>10}  file")
    for lines, branches, functions, rel in rows:
        print(f"{lines:>6.1f}% {branches:>8.1f}% {functions:>9.1f}%  {rel}")
    total = summary.get("total", {})
    if total:
        print(f"{pct(total['lines']):>6.1f}% {pct(total['branches']):>8.1f}% "
              f"{pct(total['functions']):>9.1f}%  (all of src/)")
    print()
    zero = [row[3] for row in rows if row[0] == 0]
    print(f"files at 0% of lines ({len(zero)}):")
    for rel in zero:
        print(f"  {rel}")
    if not zero:
        print("  none")
    print()
    for line in suite_lines:
        print(line)
    if not suite_lines:
        print("suite: no `suite:` line printed")
    print(f"suite exit {returncode}")


def main():
    only = parse_args(sys.argv[1:])
    members = registered_ids()
    if only and only not in members:
        sys.exit(f"digest-coverage.py: no registered check has id {only!r}")
    shutil.rmtree(WORK, ignore_errors=True)
    try:
        returncode, suite_lines, elapsed = run_suite(only)
        render(only, members, returncode, suite_lines, elapsed)
    finally:
        shutil.rmtree(WORK, ignore_errors=True)


if __name__ == "__main__":
    main()
