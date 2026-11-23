#!/usr/bin/env bash
# check-analogy -- a Brief's Bases in analogy.yaml (kogaki#1957): the `propose` verb of src/analogy.mjs over a stub,
# the `check` verb of src/brief-files.mjs reading the file, and a plan not made stale by it. The cases are
# checks/analogy-cases.mjs, with no model call; this member compares their count with its `case_floor` in both
# directions (kogaki#661, kogaki#970).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/analogy-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the analogy cases did not run clean"; exit 1; }
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'analogy'))
") || { echo "FAIL: could not read case_floor for analogy from checks/registry.json"; exit 1; }
N=$(sed -n 's/^analogy: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced (kogaki#970). Set case_floor to $N for 'analogy' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: check-analogy ran ${N} case(s) clean, exactly at its floor of ${FLOOR}"
