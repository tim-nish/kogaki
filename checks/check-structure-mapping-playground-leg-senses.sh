#!/usr/bin/env bash
# check-structure-mapping-playground-leg-senses -- a Leg's Senses (kogaki#1849): a Leg's Arguments and CentralClaim read
# five times for every Sense that holds between each pair, counted into Edge candidates, joined, compared with a Move's
# Edges file, and shown on a sheet. The cases are checks/structure-mapping-playground-leg-senses-cases.mjs, driven with
# one fake model binary as the Playground's other checks drive theirs; this member compares their count with its
# `case_floor` in both directions (kogaki#661, kogaki#970).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/structure-mapping-playground-leg-senses-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the Leg's Senses cases did not run clean"; exit 1; }
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'structure-mapping-playground-leg-senses'))
") || { echo "FAIL: could not read case_floor for structure-mapping-playground-leg-senses from checks/registry.json"; exit 1; }
N=$(sed -n 's/^structure-mapping-playground-leg-senses: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced (kogaki#970). Set case_floor to $N for 'structure-mapping-playground-leg-senses' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: check-structure-mapping-playground-leg-senses ran ${N} case(s) clean, exactly at its floor of ${FLOOR}"
