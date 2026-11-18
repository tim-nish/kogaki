#!/usr/bin/env bash
# check-prompt-files -- every file under prompts/ parses with the six marks, is named, repeats no line of src/, and the saved cases render byte-identical; the cases are checks/prompt-files-cases.mjs, their count held to `case_floor` both ways (kogaki#1855).
set -u
cd "$(dirname "$0")/.."

OUT=$(node checks/prompt-files-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the prompt-file cases did not run clean"; exit 1; }
FLOOR=$(node -e 'console.log(require("./checks/registry.json").checks.find((m) => m.id === "prompt-files").admission.case_floor)') || { echo "FAIL: could not read case_floor for prompt-files from checks/registry.json"; exit 1; }
N=$(sed -n 's/^prompt-files: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output -- an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR -- cases were LOST"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR -- cases were ADDED and the floor was not advanced. Set case_floor to $N for 'prompt-files' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: check-prompt-files ran ${N} case(s) clean, exactly at its floor of ${FLOOR}"
