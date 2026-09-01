#!/usr/bin/env bash
# THE ON-DEMAND CATCH DIGEST (kogaki#20).
#
# Retention runs on a catch record over exercised runs (product-lab
# topics/claude-code-ops.md, 2026-08-04): never-fired members are review
# candidates, never auto-deletions, and removal stays a judgment. This tool
# renders the evidence that judgment reads — per registered check, over the
# runs the primary capture can still reach.
#
# THE PRIMARY CAPTURE IS THE RUN LOG, NEVER A STORED SECOND LEDGER (owner
# decision 2026-08-06, kogaki#113 scope 3). So this digest ASSEMBLES on
# demand from the `checks` workflow's Actions logs — the `catch: <id>
# outcome=<pass|fail> [ms=<n>]` lines the runner prints — and stores nothing.
# Disclosed limits, restated in the rendered header so no figure travels
# without its denominator:
#   - the window is bounded by Actions log retention and by --runs;
#   - local suite runs are not captured (the log is CI's);
#   - `exercised` means the suite executed the check, not that the check's
#     guarded surface was touched in that revision — the finer denominator
#     kogaki#20 names is not captured by the current runner, and saying so
#     beats implying it;
#   - runs predating the `ms=` field count toward exercise but not cost.
#
# ZERO FIRES IS RENDERED AS AMBIGUOUS: a working deterrent and an extinct
# defect class are indistinguishable in the count, so the digest states the
# ambiguity instead of letting a reader resolve it silently.
#
# NOT ITSELF A REGISTERED CHECK, and sited in tools/ for the same reason as
# the runner: it renders evidence for a judgment; it decides nothing and
# denies nothing.
#
# Usage: tools/digest-check-catches.sh [--runs N]   (default N=50)
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

exec python3 - "$@" <<'PY'
import json, pathlib, re, subprocess, sys
from datetime import datetime, timezone

runs_limit = 50
args = sys.argv[1:]
if args and args[0] == "--runs":
    runs_limit = int(args[1])

registry = json.loads(pathlib.Path("checks/registry.json").read_text())
entries = registry["checks"]

listing = json.loads(subprocess.run(
    ["gh", "run", "list", "--workflow", "checks",
     "--limit", str(runs_limit), "--json",
     "databaseId,createdAt,headSha,status,conclusion,event"],
    check=True, capture_output=True, text=True).stdout)
completed = [r for r in listing if r["status"] == "completed"]

# One fetch per run, grepped for catch lines. Actions prefixes every line
# with job/step/timestamp; match the catch grammar anywhere in the line.
catch_re = re.compile(
    r"catch: (?P<id>[a-z0-9-]+) outcome=(?P<outcome>pass|fail)"
    r"(?: ms=(?P<ms>\d+))?")
stats = {}  # id -> dict(executed, fires, timed, total_ms)
runs_with_catches = 0
for run in completed:
    log = subprocess.run(
        ["gh", "run", "view", str(run["databaseId"]), "--log"],
        capture_output=True, text=True)
    if log.returncode != 0:
        continue  # expired or unreadable log: outside the window, not a fire
    seen = False
    for m in catch_re.finditer(log.stdout):
        seen = True
        s = stats.setdefault(m["id"], dict(executed=0, fires=0,
                                           timed=0, total_ms=0))
        s["executed"] += 1
        if m["outcome"] == "fail":
            s["fires"] += 1
        if m["ms"] is not None:
            s["timed"] += 1
            s["total_ms"] += int(m["ms"])
    if seen:
        runs_with_catches += 1

now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
print(f"catch digest — rendered {now}")
print(f"window: {len(completed)} completed run(s) of workflow 'checks' "
      f"(--runs {runs_limit}); {runs_with_catches} still hold readable logs "
      f"with catch lines. Bounded by Actions log retention; local runs not "
      f"captured; 'executed' = the suite ran the check, not that its guarded "
      f"surface was touched.")
print()

for entry in entries:
    a = entry["admission"]
    s = stats.get(entry["id"], dict(executed=0, fires=0, timed=0, total_ms=0))
    inst_kind = str(a.get("removal_instrument", "")).split(":", 1)[0] or "?"
    line = (f"{entry['id']}: executed {s['executed']}, fired {s['fires']}")
    if s["timed"]:
        line += (f"; measured {s['total_ms']} ms over {s['timed']} timed "
                 f"run(s), mean {round(s['total_ms']/s['timed'])} ms")
    else:
        line += "; no timed runs in window"
    line += (f" (declared runtime_ms {a.get('runtime_ms', '?')}, "
             f"tier {a.get('tier', '?')}, instrument {inst_kind})")
    print(line)
    if s["executed"] and s["fires"] == 0:
        print("  zero fires over the executed runs — AMBIGUOUS: deterrent "
              "working vs defect class extinct; review candidate, never an "
              "auto-deletion.")
    if s["executed"] == 0:
        print("  no executed runs in the readable window — no retention "
              "evidence either way; the denominator is absent, not zero.")
print()
print("supersession status is the conformance check's removal-candidate / "
      "removal-instruments rows (checks/check-registry-conformance.sh), "
      "rendered on every suite run; this digest does not duplicate them.")
PY
