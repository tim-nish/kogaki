#!/usr/bin/env bash
# The citation resolve check over every CanonicalDraft in the tree
# (SPEC-draft-command v1 §6, kogaki#573; story 1.81, kogaki#588).
#
# THE SOLE MECHANICAL INSTRUMENT ON GROUNDING — §6's words, and the judge's
# output quotes the guarantee split (specs/SPEC.md:424-430) so a reader learns
# the boundary from the instrument. The cases live with the judge in
# `draft/cite-check.mjs --self-test` (seam-free: every verdict constructed
# over injected served lines); this wrapper runs that pass, then the LIVE
# pass over each `briefs/*/draft.md` the tree holds.
#
# THE SEAM IS AN ENHANCER, NEVER A DEPENDENCY: with the gateway unreachable
# the live pass prints CANNOT-DETERMINE per draft — the trial did not run,
# which is neither a pass nor a failure — and this member stays green. A
# refusal fires only when the trial RAN and a cite resolved nowhere or
# elsewhere. An empty draft population renders its explicit zero.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== CanonicalDraft citation resolution (kogaki#588)"

FAIL=0
OUT=$(node draft/cite-check.mjs --self-test 2>&1) || FAIL=1
printf '%s\n' "$OUT"
grep -q "cite-check self-test:" <<<"$OUT" || {
  echo "FAIL: the judge's fixture pass did not run — the cases live with the judge and this member only invokes them"
  FAIL=1
}

shopt -s nullglob
DRAFTS=(briefs/*/draft.md)
if [[ ${#DRAFTS[@]} -eq 0 ]]; then
  echo "0 CanonicalDraft(s) in the tree — an explicit zero, not a pass over nothing"
else
  for d in "${DRAFTS[@]}"; do
    node draft/cite-check.mjs --draft "$d" || FAIL=1
  done
fi
exit $FAIL
