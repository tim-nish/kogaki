#!/usr/bin/env bash
# check-document-plan -- the DocumentPlans under document-plans/ (kogaki#1976): the `create` verb of
# src/document-plan.mjs over RS files of the cases' own, its refusals, the reader, the `check` verb and the relation
# list. The cases are checks/document-plan-cases.mjs, with no model call; this member compares their count with its
# `case_floor` in both directions (kogaki#661, kogaki#970).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/document-plan-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the document-plan cases did not run clean"; exit 1; }
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'document-plan'))
") || { echo "FAIL: could not read case_floor for document-plan from checks/registry.json"; exit 1; }
N=$(sed -n 's/^document-plan: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced (kogaki#970). Set case_floor to $N for 'document-plan' in checks/registry.json, in this commit"
  exit 1
fi
FILES=$(node src/document-plan.mjs check 2>&1) || { printf '%s\n' "$FILES"; echo "FAIL: a file under document-plans/ is refused"; exit 1; }
[[ -n "$FILES" ]] && printf '%s\n' "$FILES"
echo "ok: check-document-plan ran ${N} case(s) clean, exactly at its floor of ${FLOOR}, and every file under document-plans/ reads"
