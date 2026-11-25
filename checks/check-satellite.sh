#!/usr/bin/env bash
# check-satellite -- the structures read from Decisions or Lessons by themselves in satellites.yaml (kogaki#1963): the
# `add` verb of src/satellite.mjs over a stub and a file of served Units, the `check` verb of src/brief-files.mjs
# reading the file, and the Brief's files untouched by it. The cases are checks/satellite-cases.mjs, with no model call;
# this member compares their count with its `case_floor` in both directions (kogaki#661, kogaki#970).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/satellite-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the satellite cases did not run clean"; exit 1; }
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'satellite'))
") || { echo "FAIL: could not read case_floor for satellite from checks/registry.json"; exit 1; }
N=$(sed -n 's/^satellite: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced (kogaki#970). Set case_floor to $N for 'satellite' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: check-satellite ran ${N} case(s) clean, exactly at its floor of ${FLOOR}"
