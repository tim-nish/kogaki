#!/usr/bin/env bash
# THE ONE DEFINITION OF "RUN THE SUITE" (kogaki#724).
#
# Two consumers need it — CI's registry-driven job and the review lane's
# declared mechanism in `.claude/review-lane.json` — and until this file
# existed they each carried their own. CI's was registry-driven; the lane's
# was the glob `checks/check-*.sh`. Moving four checks into the kit made the
# two disagree: CI ran 20 members and the lane ran 16, reporting green while
# executing neither the seam gate nor the kit's own install test. The lane is
# where a reviewer's mechanism grounding comes from, so the disagreement was
# invisible exactly where it mattered most.
#
# WHY REGISTRY-DRIVEN AND NOT A WIDER GLOB. A glob over two directories fixes
# today's split and leaves the next directory admit-by-default — the
# enumeration whose load-bearing half is its non-member fallback. The registry
# is already the ratified source of what the suite IS: the suite runs only
# REGISTERED checks, and an unregistered file is dead code that
# check-registry-conformance refuses. Reading it here means a member is
# covered by being registered rather than by living somewhere a pattern
# happens to reach.
#
# NOT ITSELF A REGISTERED CHECK, and sited outside `checks/` for that reason:
# every file in that directory must be a registry member or it is dead code,
# and a runner is not a check. `tools/` is where this repository's
# non-registered executables already live.
set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

exec python3 - "$@" <<'PY'
import json, pathlib, subprocess, sys

registry = json.loads(pathlib.Path("checks/registry.json").read_text())
entries = registry["checks"]
if not entries:
    print("ok: no registered checks (registry empty)")
    sys.exit(0)

failed = []
for entry in entries:
    # A `file` carrying a separator is REPO-ROOT-RELATIVE; a bare name
    # resolves under checks/ as it always has (kogaki#724).
    path = (pathlib.Path(entry["file"]) if "/" in entry["file"]
            else pathlib.Path("checks") / entry["file"])
    print(f"== {entry['id']} ({path})", flush=True)
    result = subprocess.run(["bash", str(path)])
    # The catch ledger's primary capture (kogaki#113): one line per check per
    # exercised run, in the run log — assembled on demand, never a stored
    # second ledger (owner decision 2026-08-06). A "fail" is a catch: the
    # check found what it guards against. Flushed per line so a cancelled run
    # does not lose the catches already made.
    print(f"catch: {entry['id']} outcome="
          f"{'pass' if result.returncode == 0 else 'fail'}", flush=True)
    if result.returncode != 0:
        failed.append(entry["id"])

if failed:
    print(f"FAIL: {len(failed)} of {len(entries)} registered check(s) failed: "
          + ", ".join(failed))
    sys.exit(1)
print(f"ok: {len(entries)} registered check(s) pass")
PY
