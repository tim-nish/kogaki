#!/usr/bin/env bash
# check-brief-files -- an adopted Brief as three files (kogaki#1955): brief.yaml, structure.yaml and reader-path.yaml,
# read through one reader that gives each Leg its relation's `holds`, with the `check` and `split` verbs of
# src/brief-files.mjs, and the BriefPlanPlayground written by adoption (kogaki#1967). The cases are
# checks/brief-files-cases.mjs, with no model call; this member compares their count with its `case_floor` in both
# directions (kogaki#661, kogaki#970).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/brief-files-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the Brief files' cases did not run clean"; exit 1; }
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'brief-files'))
") || { echo "FAIL: could not read case_floor for brief-files from checks/registry.json"; exit 1; }
N=$(sed -n 's/^brief-files: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced (kogaki#970). Set case_floor to $N for 'brief-files' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: check-brief-files ran ${N} case(s) clean, exactly at its floor of ${FLOOR}"
