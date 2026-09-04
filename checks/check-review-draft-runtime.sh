#!/usr/bin/env bash
# The ReviewDraft runtime's fixture pass (kogaki#869 tracking, kogaki#870 this
# artifact).
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN — the same arrangement
# check-draft-runtime.sh and check-terrain-runtime.sh use, and for the same
# reason: the cases live with the runtime they cover, in
# `src/review-draft.mjs --self-test`, because they are functions of the
# runtime's own refusal surfaces and drive it end to end in a temp directory.
# Seam-free by construction: no gateway, no network, no home-directory write,
# and no read of this repository's own `theses/` or `runs/`.
#
# WHAT THE PASS ASSERTS (kogaki#870's ACs, enumerated in the runtime):
# `open` succeeds on a well-formed Draft and refuses BY NAME on each of the
# four ways its inputs can be wrong — no line range (the kogaki#868
# precondition), no Packet named, a Packet absent, and a Packet whose sha
# differs from the trace's, which means the Draft was not produced from it;
# the recovery input carries the Step's prose and nothing from the Packet;
# `recover` refuses a Step whose input it did not render; `compare` refuses
# while any Step or Section entry is missing and names BOTH kinds; `close`
# writes `theses/<slug>/review.md` with its three lists, one per Draft,
# overwritten on re-run, and every residue line carries an EMPTY `classified:`
# field the tool never fills.
#
# AND ONE STRUCTURAL CASE, which is the mechanical half of the owner's
# 2026-09-04 ruling: the Harness imports ONLY node builtins and ./runs.mjs. It
# is an ALLOWLIST (PR #882 round 1, finding 5) — the first form named the
# modules it refused, so an unanticipated reader would have passed it while
# breaking the ruling it exists to mechanize. The ruling says a need for a
# Brief, Move or Strand is a PACKET GAP filed against src/packet-template.md;
# a case whose non-member fallback is REFUSE is what makes that a property
# rather than a promise.
#
# WHAT THE PASS DOES NOT EVIDENCE, stated rather than left to be assumed. The
# issue's AC1 names a live drive against `theses/some-safety-properties-cannot-
# checked/draft.md` and its six Packets. That Draft is UNTRACKED working
# material and its Packets live under the gitignored `runs/`, so the drive is
# not reproducible from the tree and this member — seam-free, and it never reads
# `theses/` or `runs/` — does not attempt it. AC1's reproducible evidence is the
# fixture Draft, built in `emit`'s own shape. The live drive was performed once
# at authoring and is reported as an observation, never as coverage.
#
# NOT CARRIED HERE, stated rather than implied: the recovered record's schema
# (kogaki#871), the item classes and the three-valued verdict (kogaki#872), the
# cold reader's pairing (kogaki#873), and the correction path with its bounded
# second pass (kogaki#874). Those entry points are DECLARED by this runtime and
# refuse by naming their issue; the pass asserts the refusal, never the
# behaviour that has not been built.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== ReviewDraft runtime fixture pass (kogaki#870)"

OUT=$(node src/review-draft.mjs --self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "review-draft self-test:" <<<"$OUT"; then
  echo "FAIL: the runtime's fixture pass did not run clean — the cases live with the runtime and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
# checks/registry.json is the one source: a number transcribed into this file
# would be the unbound-prose defect the floor exists to close, in a second
# place. The EXTRACTION is this member's own, per the registry note's rule.
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'review-draft-runtime'))
") || { echo "FAIL: could not read case_floor for review-draft-runtime from checks/registry.json"; exit 1; }
N=$(sed -n 's/^review-draft self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
echo "ok: ReviewDraft runtime fixture pass ran ${N} case(s) clean, at or above its declared floor of ${FLOOR}"

# --- THE SKILL NAMES ONLY PATHS AND SUBCOMMANDS THE HARNESS HAS (kogaki#812).
#
# This is the assertion that earns the review-draft skill its place in
# `.gitignore`'s tracked set, on the criterion that block states for `brief`,
# `terrain` and `draft`: a check asserts against the skill, and the assertion
# does not exist without its file.
#
# SCOPE, stated so the pass is not read as more: it checks that every path and
# every subcommand the skill NAMES exists. It cannot check that the skill says
# the right thing — what makes the flow ordering hold is that it lives in the
# Harness, not that this file is now checked.
SKILL=".claude/skills/review-draft/SKILL.md"
if [[ ! -f "$SKILL" ]]; then
  echo "FAIL: $SKILL is missing — it is tracked and this member asserts against it, so its absence is a defect rather than a skip"
  exit 1
fi

BAD=0

# Every `<path>/review-draft.mjs` the skill names must resolve.
while read -r pth; do
  [[ -z "$pth" ]] && continue
  if [[ ! -f "$pth" ]]; then
    echo "FAIL: $SKILL names \`$pth\`, which does not exist"
    BAD=1
  fi
done < <(grep -oE '[A-Za-z0-9_./-]*review-draft\.mjs' "$SKILL" | sort -u)

# Every subcommand the skill names must be one the Harness dispatches. The
# Harness's own usage is the source: a list transcribed into this check would
# be the same unbound prose one layer over.
USAGE=$(node src/review-draft.mjs 2>&1)
while read -r sub; do
  [[ -z "$sub" ]] && continue
  if ! grep -qE "review-draft\.mjs $sub( |$)" <<<"$USAGE"; then
    echo "FAIL: $SKILL names the subcommand \`$sub\`, which the Harness's own usage does not list"
    BAD=1
  fi
done < <(grep -oE 'review-draft\.mjs [a-z-]+' "$SKILL" | awk '{print $2}' | sort -u)

# And the converse, which is the half a rename sweep misses: a subcommand the
# Harness has and the skill never names is an entry point nobody is told about.
while read -r sub; do
  [[ -z "$sub" ]] && continue
  if ! grep -qE "review-draft\.mjs $sub( |$)" "$SKILL"; then
    echo "FAIL: the Harness dispatches \`$sub\`, which $SKILL does not name"
    BAD=1
  fi
done < <(grep -oE 'review-draft\.mjs [a-z-]+' <<<"$USAGE" | awk '{print $2}' | sort -u)

if (( BAD )); then exit 1; fi
echo "ok: $SKILL names only paths and subcommands the Harness has, and names all of them"

# --- THE REVIEW LANE IS REGISTERED WHEREVER A LANE MUST BE (kogaki#750).
#
# `runs.mjs` refuses a lane outside its closed set and `keepLast` refuses when
# ANY lane carries no positive bound, so a lane added to one and not the other
# is a runtime that refuses its own workspace. The condition never arises while
# both edits land together, which is exactly when its absence leaves no trace.
# ASKED OF THE MODULE, never matched as text (PR #882 round 1, finding 4). The
# first form grepped for the literal `"terrain", "brief", "draft", "review"`,
# which goes red on a reordering or a reformat that changes nothing, and for a
# bare `"review"` in src/runs.json, which does not check the key sits under
# `lanes` carrying a positive bound. Both are the contract-tested-against-its-
# own-text shape: green about the document, silent about the behaviour.
if ! node --input-type=module -e '
  import { LANES, keepLast } from "./src/runs.mjs";
  if (!LANES.includes("review")) {
    console.error("LANES does not carry the review lane");
    process.exit(1);
  }
  const k = keepLast("review");
  if (!Number.isInteger(k) || k < 1) {
    console.error(`keepLast("review") returned ${k}`);
    process.exit(1);
  }
'; then
  echo "FAIL: the review lane is not registered in BOTH src/runs.mjs's LANES and src/runs.json's bounds — keepLast checks every lane, so one carrier without the other is a runtime that refuses its own workspace"
  exit 1
fi
echo "ok: the review lane is registered in both LANES and src/runs.json, asked of the module rather than matched as text"

echo "PASS: ReviewDraft runtime"
