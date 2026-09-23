#!/usr/bin/env bash
# The Move-schema derivation carrier's fixture pass (kogaki#1173).
#
# A THIN INVOKER over `python3 tools/derive_schema.py --self-test`, on the
# arrangement check-move-ingest.sh already uses: the cases construct their
# own Corpus fixtures and a stub model command in a temporary directory, and
# the pass reaches no network and no real model.
#
# WHAT THE PASS ASSERTS is not restated here (kogaki#661) — the count is
# `case_floor` in the registry and the pass prints its own. By property: the
# minimum-Corpus-size refusal, naming the count found; the `## Passage` and
# Figure-`positions:` stripping, both directions (present before stripping,
# absent after); the assembled prompt and the model's own output each
# checked for a leaked stripped line; the response-marker split; every
# owner-facing bound `passages/DERIVATION.md` states (at most ten questions,
# at most twelve lines each, two or three options, exactly one option marked
# Recommended); and one full run end to end over a stub model command that
# answers on stdin regardless of its argv.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== move-schema derivation fixture pass (kogaki#1173)"

OUT=$(python3 tools/derive_schema.py --self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "derive_schema self-test:" <<<"$OUT"; then
  echo "FAIL: the derivation fixture pass did not run clean — the cases live with the module and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'derive-schema'))
") || { echo "FAIL: could not read case_floor for derive-schema from checks/registry.json"; exit 1; }
N=$(sed -n 's/^derive_schema self-test: \([0-9][0-9]*\) checks, .*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced in the same act, so the ratchet is $((N - FLOOR)) behind and cannot see a case deleted inside that gap (kogaki#970). Set case_floor to $N for 'derive-schema' in checks/registry.json, in this commit"
  exit 1
fi

# THE INSTRUCTION FILE ITSELF EXISTS AND CARRIES ITS OWN BOUNDS. The pass
# above exercises the CODE against fixture text; this asserts the shipped
# `passages/DERIVATION.md` states the same minimum corpus size, the same
# question bound, and the same Recommended marker the code enforces — so an
# edit to one that drifts from the other is caught rather than silently
# leaving the model reading one number and the code checking another.
if [[ ! -f passages/DERIVATION.md ]]; then
  echo "FAIL: passages/DERIVATION.md does not exist"
  exit 1
fi
if ! grep -q "10 Analyses" passages/DERIVATION.md; then
  echo "FAIL: passages/DERIVATION.md does not state the minimum Corpus size of 10 Analyses tools/derive_schema.py enforces"
  exit 1
fi
if ! grep -q "at most ten" passages/DERIVATION.md; then
  echo "FAIL: passages/DERIVATION.md does not state the ten-question bound tools/derive_schema.py enforces"
  exit 1
fi
if ! grep -q "at most \*\*twelve lines\*\*" passages/DERIVATION.md; then
  echo "FAIL: passages/DERIVATION.md does not state the twelve-line question bound tools/derive_schema.py enforces"
  exit 1
fi
if ! grep -q "(Recommended)" passages/DERIVATION.md; then
  echo "FAIL: passages/DERIVATION.md does not carry the Recommended marker tools/derive_schema.py checks for"
  exit 1
fi

echo "ok: derivation fixture pass ran ${N} case(s) clean, exactly at its floor of ${FLOOR}; passages/DERIVATION.md states the bounds the code enforces"
exit 0
