#!/usr/bin/env bash
# The /draft runtime's fixture pass (SPEC-draft-command v1, kogaki#573;
# story 1.80, kogaki#587).
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN — the same arrangement
# check-owner-surface-pins.sh and check-client-kit-install.sh use, and for
# the same reason: the cases live with the runtime they cover, in
# `draft/draft.mjs --self-test`, because they are functions of the runtime's
# own refusal surfaces and drive it end to end in a temp directory. Seam-free
# by construction: no gateway, no network, no home-directory write.
#
# WHAT THE PASS ASSERTS (story 1.80's ACs, enumerated in the runtime):
# a template Brief refuses by field name; a foreign Strand refuses by name
# with the closed set quoted, at material and in section prose alike; the
# Reader Path is realized in its recorded order however sections arrive;
# emit refuses short of completion naming the owed steps; the CanonicalDraft
# lands under its fixed human name with the record half in frontmatter,
# `generated_by` immutable across overwrites; the trace renders no visible
# structure in the body; and the owner tree gains exactly the artifact while
# snapshots stay machine-local in the run workspace.
#
# NOT CARRIED HERE, stated rather than implied: cite RESOLUTION — that is the
# citation resolve check (story 1.81), the sole mechanical instrument on
# grounding (§6) — and every judgment about the prose itself, which §6 puts
# on the Step or the judgment realizing it, never on this harness.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== draft runtime fixture pass (kogaki#587)"

OUT=$(node draft/draft.mjs --self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "draft self-test:" <<<"$OUT"; then
  echo "FAIL: the runtime's fixture pass did not run clean — the cases live with the runtime and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
# checks/registry.json is the one source: a number transcribed into this file
# would be the unbound-prose defect the floor exists to close, in a second
# place. The EXTRACTION is this member's own, per the note's rule — the four
# delegating members print their counts in three grammars, and imposing one
# grammar on four runtimes would be a spec decision about check plumbing paid
# for by edits to three unrelated files.
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'draft-runtime'))
") || { echo "FAIL: could not read case_floor for draft-runtime from checks/registry.json"; exit 1; }
N=$(sed -n 's/^draft self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
echo "ok: draft runtime fixture pass ran ${N} case(s) clean, at or above its declared floor of ${FLOOR}"

exit 0
