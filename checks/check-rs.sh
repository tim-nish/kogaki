#!/usr/bin/env bash
# check-rs -- the RS files under rs/ (kogaki#1970): the `create` verb of src/rs.mjs over a stub and a file of served
# Units, the `check` verb reading the files it writes and files edited by hand, and the `check` verb over rs/. The
# cases are checks/rs-cases.mjs, with no model call; this member compares their count with its `case_floor` in both
# directions (kogaki#661, kogaki#970).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/rs-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the rs cases did not run clean"; exit 1; }
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'rs'))
") || { echo "FAIL: could not read case_floor for rs from checks/registry.json"; exit 1; }
N=$(sed -n 's/^rs: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced (kogaki#970). Set case_floor to $N for 'rs' in checks/registry.json, in this commit"
  exit 1
fi
FILES=$(node src/rs.mjs check 2>&1) || { printf '%s\n' "$FILES"; echo "FAIL: a file under rs/ is refused"; exit 1; }
[[ -n "$FILES" ]] && printf '%s\n' "$FILES"
echo "ok: check-rs ran ${N} case(s) clean, exactly at its floor of ${FLOOR}, and every file under rs/ reads"
