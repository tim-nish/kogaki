#!/usr/bin/env bash
# The citation resolve check over every CanonicalDraft in the tree
# (SPEC-draft-command v1 §6, kogaki#573; story 1.81, kogaki#588).
#
# THE SOLE MECHANICAL INSTRUMENT ON GROUNDING — §6's words, and the judge's
# output quotes the guarantee split (specs/SPEC.md:424-430) so a reader learns
# the boundary from the instrument. The cases live with the judge in
# `src/cite-check.mjs --self-test` (seam-free: every verdict constructed
# over injected served lines); this wrapper runs that pass, then the LIVE
# pass over each `theses/*/draft.md` the tree holds.
#
# THE SEAM IS AN ENHANCER, NEVER A DEPENDENCY: with the gateway unreachable
# the live pass prints CANNOT-DETERMINE per draft — the trial did not run,
# which is neither a pass nor a failure — and this member stays green. A
# refusal fires only when the trial RAN and a cite was malformed (the
# retired positional form included, SPEC-draft-command v2, kogaki#600) or
# its declared (slug, kind) identity resolved nowhere. An empty draft
# population renders its explicit zero.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== CanonicalDraft citation resolution (kogaki#588)"

FAIL=0
OUT=$(node src/cite-check.mjs --self-test 2>&1) || FAIL=1
printf '%s\n' "$OUT"
grep -q "cite-check self-test:" <<<"$OUT" || {
  echo "FAIL: the judge's fixture pass did not run — the cases live with the judge and this member only invokes them"
  FAIL=1
}


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
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'draft-cites'))
") || { echo "FAIL: could not read case_floor for draft-cites from checks/registry.json"; exit 1; }
N=$(sed -n 's/^cite-check self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
echo "ok: cite-check fixture pass ran ${N} case(s) clean, at or above its declared floor of ${FLOOR}"

# THE RENAME SWEEP STATES WHAT IT SCANNED (kogaki#766). The acceptance this
# discharges is a CLASS — "no `briefs/` path literal survives in code, checks,
# gate prose or spec pins" — and a sweep that reports a clean result without
# naming its scanned set is indistinguishable from one that ran nowhere. The
# rename itself is what can invalidate the sweep's own roots, which is why the
# denominator is printed rather than assumed.
#
#   "A system that periodically hunts for problems fails silently, because
#   'found nothing' and 'never ran' look identical from outside … make the fact
#   that it ran visible — not just what it found."
#   consulted: product-lab@82b8908197ff6f9251448e94a09abd90f7699757 gloss/lessons/testing.md:149
#
# TWO SITES ARE EXEMPT BY PATH AND BY REASON, never by a pattern that would also
# admit a live one: both are HISTORICAL RECORDS in spec-draft-pipeline, and
# rewriting either would make it false about the run it describes — the 2026-08-07
# corpus query and its recorded result, and the dogfooded Brief named at the path
# it had when the observation was made. An exemption list that grew by pattern
# would silently admit the next real literal.
SWEEP_ROOTS=(src checks specs gates .claude/skills tools)
SWEEP_EXEMPT_FILE="specs/spec-draft-pipeline/SPEC.md"
# THE PATTERN IS THE PATH LITERAL, AND THIS FILE EXCLUDES ITSELF. The criterion
# names a `briefs/` PATH literal, so the slash is part of what is forbidden — a
# bare-word match would also fire on prose ABOUT the rename. And this check's own
# failure message necessarily contains the token it hunts, so without the self
# exclusion the sweep reports itself: use-vs-mention, the same defect
# `check-boundary-receipts.sh` names and that `check-terrain-retired-vocabulary.sh`
# handles with the same `$self` skip.
SWEEP_SELF="checks/check-draft-cites.sh"
sweep_hits="$(git grep -n -- 'briefs/' -- "${SWEEP_ROOTS[@]}" 2>/dev/null \
  | grep -v "^${SWEEP_EXEMPT_FILE}:" | grep -v "^${SWEEP_SELF}:" || true)"
sweep_scanned=0
for r in "${SWEEP_ROOTS[@]}"; do
  n="$(git ls-files -- "$r" 2>/dev/null | wc -l | tr -d ' ')"
  if [[ "$n" -eq 0 ]]; then
    echo "FAIL: rename sweep root '$r' resolves to no tracked file — the sweep below would report clean for a root it never scanned"
    FAIL=1
  fi
  sweep_scanned=$(( sweep_scanned + n ))
done
if [[ -n "$sweep_hits" ]]; then
  echo "FAIL: a briefs-path literal survives the kogaki#766 rename outside the exempt sites:"
  echo "$sweep_hits" | sed 's/^/  - /'
  FAIL=1
else
  echo "rename sweep (kogaki#766): 0 surviving briefs-path literal over ${sweep_scanned} tracked file(s) in ${SWEEP_ROOTS[*]}; ${SWEEP_EXEMPT_FILE} exempt as historical record, ${SWEEP_SELF} exempt as the sweep itself"
fi

shopt -s nullglob
DRAFTS=(theses/*/draft.md)
if [[ ${#DRAFTS[@]} -eq 0 ]]; then
  echo "0 CanonicalDraft(s) in the tree — an explicit zero, not a pass over nothing"
else
  for d in "${DRAFTS[@]}"; do
    node src/cite-check.mjs --draft "$d" || FAIL=1
  done
fi
exit $FAIL
