#!/usr/bin/env bash
# check-runs-retention — the run-intermediate home and its in-band bound
# (kogaki#750, owner rulings 2026-09-01).
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN — the arrangement the
# registered siblings check-terrain-runtime.sh and check-draft-runtime.sh use,
# for the reason those state: the cases are functions of the module's own
# resolvers and pruner and belong beside them, in `src/runs.mjs --self-test`.
# Seam-free: every case builds its lane tree under its own scratch root, so the
# pass reaches no gateway, no network, and — the property that matters in THIS
# module — never this repository's own `runs/` directory.
#
# WHAT THE PASS ASSERTS (the count is `case_floor` in the registry and is not
# restated here — kogaki#661): the resolvers are pure and create nothing; the
# lane set is closed and an unlisted lane refuses by name; an entry name is one
# path segment; keep-last's arithmetic, including the issue's own acceptance
# case that the K+1th run's start removes exactly the oldest; that re-entering
# an existing entry prunes nothing, which is what makes overwrite-in-place safe
# for a lane keyed on a slug; that a lane never prunes another lane, asserted
# on the other lane's TREE and not only on the return value; that
# `runs/terrain/reports/` is exempt, with the control that the exemption is per
# lane rather than a blanket on the name; the containment guard, reached
# directly because production names come from readdir and cannot express an
# escape; that the bound's carrier fails loudly on a missing lane, a zero and a
# non-integer; that the SHIPPED src/runs.json answers for all three lanes; and
# that `enterRun` prunes before it creates.
#
# WHY THIS MEMBER EXISTS RATHER THAN A WIDENING OF A LANE'S OWN MEMBER: the
# bound is cross-lane and the module is shared by three runtimes, so folding it
# into any one of them would put two contracts behind one removal signal — the
# split check-terrain-runtime.sh's own record argues for, arriving from the
# other direction. Each lane's own member carries the one thing that IS
# lane-local: that its default destination is that lane's directory.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== run-intermediate retention (kogaki#750)"

OUT=$(node src/runs.mjs --self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "runs self-test:" <<<"$OUT"; then
  echo "FAIL: the retention fixture pass did not run clean — the cases live with the module and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'runs-retention'))
") || { echo "FAIL: could not read case_floor for runs-retention from checks/registry.json"; exit 1; }
N=$(sed -n 's/^runs self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi

# THE TRACKED SURFACE, which no fixture can assert from inside the module: the
# README is the directory's statement of purpose, layout and lifetime, and it
# is the ONE tracked path under runs/. A relocation whose destination carries
# no explanation is the hidden-directory defect at a new address.
if ! git ls-files --error-unmatch runs/README.md >/dev/null 2>&1; then
  echo "FAIL: runs/README.md is not tracked — the directory's purpose, layout and lifetime have no carrier"
  exit 1
fi
STRAY=$(git ls-files runs/ | grep -v '^runs/README.md$' || true)
if [[ -n "$STRAY" ]]; then
  echo "FAIL: run intermediates are tracked, which they must never be:"
  printf '  %s\n' $STRAY
  exit 1
fi
if ! git check-ignore -q runs/terrain/anything; then
  echo "FAIL: runs/ content is not ignored — the next run would offer machine state to a commit"
  exit 1
fi

echo "ok: retention fixture pass ran ${N} case(s) clean at or above its floor of ${FLOOR}; runs/README.md is the one tracked path and lane content is ignored"
exit 0
