#!/usr/bin/env bash
# check-mapping-playground-move -- the short Trial's Brief-Leg route (kogaki#1830): a Leg of an adopted Brief and a named
# Move, read into a move structure, paired with the Leg and shown per Segment. The cases are
# checks/mapping-playground-move-cases.mjs, driven with one fake model binary as the short Trial's check drives its own;
# this member compares their count with its `case_floor` in both directions (kogaki#661, kogaki#970).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/mapping-playground-move-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the Brief-Leg route's cases did not run clean"; exit 1; }
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'mapping-playground-move'))
") || { echo "FAIL: could not read case_floor for mapping-playground-move from checks/registry.json"; exit 1; }
N=$(sed -n 's/^mapping-playground-move: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced (kogaki#970). Set case_floor to $N for 'mapping-playground-move' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: check-mapping-playground-move ran ${N} case(s) clean, exactly at its floor of ${FLOOR}"
