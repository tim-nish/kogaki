#!/usr/bin/env bash
# check-grant-derivation — the reviewer's executable grant is derived over THE
# TREE THE ROUND RUNS IN (specs/SPEC.md §4 clause 4; kogaki#412, story 1.64).
#
# WHY THIS IS A REGISTERED CHECK AND NOT ANOTHER FIXTURE INSIDE THE SWEEP.
# `tools/review-sweep.sh` carries its own fixture pass for this property, and
# that pass NEVER RUNS IN CI — the suite runs only registered checks (founding
# spec §4), and the sweep is not one. So the guard existed and could not fire
# where it mattered: PR #413 shipped a derivation over the wrong tree with the
# in-sweep fixtures green, and the defect was found by a human reading the
# diff. kogaki#288 already ruled against guards sited where they cannot run;
# this is that ruling applied to this property.
#
# IT ADDS AN ARM, IT DOES NOT RELOCATE ONE (story 1.64 AC4). The in-sweep
# fixtures stay exactly where they are: they run on every sweep invocation and
# catch a regression at the moment someone is using the tool, which is earlier
# than a push. Trading one for the other would be moving coverage and calling
# it adding.
#
# THE PROPERTY IS ASKED OF THE ONE DEFINITION, never re-implemented here.
# `tools/review-sweep.sh --print-grant <ref>` prints the grant a round at that
# ref would receive. A check that rebuilt the derivation would be a second
# definition of the same property, free to agree with the first while both
# were wrong — the divergence `lib/disposition.py` exists to prevent one axis
# over. That mode resolves no substrate and makes no network call, which is
# what lets it run pre-push.
set -uo pipefail
cd "$(dirname "$0")/.."

SWEEP="tools/review-sweep.sh"
fail=0
note() { printf '  %s\n' "$1"; }
bad() { printf 'FAIL grant-derivation: %s\n' "$1"; fail=1; }

if [ ! -x "$SWEEP" ]; then
  bad "$SWEEP is missing or not executable — the property cannot be asked of
  its owner, and a check that cannot ask is not a check that passed"
  exit 1
fi

# --- 1. the grant follows the REF and not the working tree -------------------
# THE COUNTERFACTUAL, and the reason this file is admissible: it CONSTRUCTS the
# defect kogaki#412 was reopened over — a derivation that reads the checkout
# doing the reviewing instead of the head under review — and asserts refusal.
# A scratch repository is used rather than this one so the two trees can be
# made to disagree on purpose.
# ONE CLEANUP ROOT, ONE TRAP — the site list stops existing (kogaki#446
# successor). This file had FIVE `trap ... EXIT` registrations, each naming the
# temporaries bound so far, and `trap` replaces the handler wholesale — so a
# new temporary owed an edit at every later site and an omission at any one of
# them leaked. Round 1 named one omission, round 2 named the next, and a
# property check written while fixing THAT found a third. Repairing them one at
# a time leaves the count unchanged:
#
#   "a per-reader fix repairs one reader and leaves the count unchanged ... where
#    the readers share a projection the obligation belongs in the projection"
#   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:57
#
# Every scratch is now a child of one root, cleaned by one handler registered
# before anything is created. A future case adds a directory and owes no trap
# edit, so the omission this repairs is not merely fixed but unreachable.
TMPROOT="$(mktemp -d)"
trap 'rm -rf "$TMPROOT"' EXIT
mk() { d="$TMPROOT/$1"; mkdir -p "$d"; printf '%s' "$d"; }
scratch="$(mk one)"
mkdir -p "$scratch/tools"
cp "$SWEEP" "$scratch/tools/review-sweep.sh"
chmod +x "$scratch/tools/review-sweep.sh"
(
  cd "$scratch" || exit 1
  git init -q . && git config user.email f@x && git config user.name f
  printf '#!/bin/sh\n' > tools/only-at-the-head.sh
  git add -A && git commit -qm head
) >/dev/null 2>&1

head_sha="$(git -C "$scratch" rev-parse HEAD 2>/dev/null)"
# The reviewing checkout does NOT hold the tool; only the committed head does.
rm -f "$scratch/tools/only-at-the-head.sh"

if [ -z "$head_sha" ]; then
  bad "could not build the scratch repository, so the counterfactual never
  ran — an unbuildable fixture is not a passing one"
else
  # THE EXIT CODE IS CHECKED HERE TOO, matching case 2b and the live arm
  # (PR #445 round 1, finding 1). This scratch has `tools/` and NO `checks/`,
  # so it is exactly the shape that made an honest empty checks/ half report
  # itself as a resolution failure. Discarding the exit code is what hid it:
  # the case passed on a derivation whose exit code was lying.
  # UNBOUND BY ANY MUTANT TODAY, AND THAT IS STATED RATHER THAN LEFT (kogaki
  # #448 round 1, finding 4). Refolding these streams is a mutation that
  # SURVIVES: every `sys.stderr.write` in the sweep sits on an exit-2 path, so
  # no zero-exit run produces stderr for the `*review-sweep*` arm below to
  # match, and the condition the separation defends against cannot be
  # constructed from outside. It is defensive against a future zero-exit
  # stderr writer. REOPEN when one appears — at that moment this becomes
  # bindable and owes its mutant.
  #
  # STDOUT AND STDERR ARE CAPTURED SEPARATELY (kogaki#446, finding 3). Folding
  # them gave the exit-code arm its diagnosis but left `at_ref` — which is
  # afterwards content-matched against *review-sweep* — able to satisfy that
  # pattern from any stderr text naming the script it just invoked. A false
  # red, never a false green, and the diagnosis would have been wrong.
  at_ref_err="$TMPROOT/at_ref.err"
  at_ref="$(cd "$scratch" && ./tools/review-sweep.sh --print-grant "$head_sha" 2>"$at_ref_err")"; at_ref_rc=$?
  if [ "$at_ref_rc" -ne 0 ]; then
    bad "a RESOLVABLE ref with no checks/ exited $at_ref_rc — an absent path in
  a tree that resolves is an empty half, not a resolution failure, and
  reporting it as one inverts the distinction --print-grant exists to draw:
  $(cat "$at_ref_err")"
  fi
  at_tree="$(cd "$scratch" && ./tools/review-sweep.sh --print-grant 2>/dev/null)"
  case "$at_ref" in
    *"Bash(bash tools/only-at-the-head.sh:*)"*) : ;;
    *) bad "the grant does not follow the ref: a tool present AT THE HEAD under
  review and absent from the reviewing checkout was not granted, so the round
  reviewing a PR that adds a tool cannot run it (got: ${at_ref:-<empty>})" ;;
  esac
  case "$at_tree" in
    *only-at-the-head*) bad "the fixture's own control is broken — the working
  tree was supposed to hold no grantable tool" ;;
  esac
  # The spawner is excluded at that same ref, by capability. The scratch copy
  # is named review-sweep.sh, so this alone does not separate capability from
  # filename — case 2 does that.
  case "$at_ref" in
    *review-sweep*) bad "the spawner is granted at the head under review — a
  round able to run it can spawn rounds, and §4 clause 3's two-round cap stops
  bounding anything" ;;
  esac
fi

# --- 2. the exclusion is by capability, so a RENAMED spawner is excluded -----
scratch2="$(mk two)"
# (This site once re-registered the EXIT trap and had to restate the whole
# temporary list. It no longer does: the single root at :63 owns cleanup, so
# there is no site list to maintain here — PR #449 round 1, finding 3, where
# this comment still instructed a later editor to maintain the list the same
# commit had abolished.)
mkdir -p "$scratch2/tools"
cp "$SWEEP" "$scratch2/tools/review-sweep.sh"
chmod +x "$scratch2/tools/review-sweep.sh"
# A spawner under a name nothing in the sweep mentions, carrying the marker.
sed -n 's/^SPAWNER_MARK = "\(.*\)"$/\1/p' "$SWEEP" | head -1 > "$scratch2/.mark"
mark="$(cat "$scratch2/.mark")"
if [ -z "$mark" ]; then
  bad "SPAWNER_MARK could not be read from $SWEEP — the capability rule has no
  declared marker, so the exclusion has silently fallen back to a name list"
else
  printf '#!/bin/sh\n# %s\n' "$mark" > "$scratch2/tools/a-second-spawner.sh"
  printf '#!/bin/sh\n' > "$scratch2/tools/ordinary.sh"
  g2="$(cd "$scratch2" && ./tools/review-sweep.sh --print-grant 2>/dev/null)"
  case "$g2" in
    *a-second-spawner*) bad "a RENAMED spawner is granted — the exclusion is
  keyed on the filename rather than the capability, so spawner N+1 is granted
  by default (got: $g2)" ;;
  esac
  case "$g2" in
    *"Bash(bash tools/ordinary.sh:*)"*) : ;;
    *) bad "the capability exclusion is over-broad — an ordinary tool beside a
  spawner was dropped too (got: ${g2:-<empty>})" ;;
  esac
fi

# --- 2b. AN UNRESOLVABLE REF IS AN ERROR, NOT AN EMPTY GRANT -----------------
# CONSTRUCTED rather than waited for (PR #441 round 1, finding 1). In an
# ordinary run `HEAD` resolves, so the failure branch never fires and a
# regression in it leaves no trace — the same "guard whose condition never
# arises" shape this file exists to refuse. So the condition is built here.
bogus="$(./tools/review-sweep.sh --print-grant refs/kogaki/no-such-ref 2>&1)"; bogus_rc=$?
if [ "$bogus_rc" -eq 0 ]; then
  bad "an unresolvable ref printed an empty grant and exited 0, so a consumer
  cannot tell it from a tree holding no grantable tool — a resolution failure
  reported as coverage, which is how a check passes on nothing"
fi
case "$bogus" in
  *"could not be read"*) : ;;
  *) bad "an unresolvable ref exited non-zero but said nothing about why;
  the diagnosis is what makes the exit code actionable (got: ${bogus:-<empty>})" ;;
esac

# --- 2c. THE checks/ HALF FOLLOWS THE REF TOO (kogaki#442) -------------------
# The acceptance criterion of kogaki#442, asserted the same way its tools/
# sibling is: a check present AT THE HEAD UNDER REVIEW and absent from the
# reviewing checkout must be granted, or the round reviewing a PR that adds a
# registered check cannot run that check's own evidence.
#
# THE REGISTRY IS READ AT THE REF, and this case is what holds that: the
# scratch head registers the new check, and the reviewing checkout's registry
# never mentions it. A derivation reading the registry from the checkout finds
# no entry and grants nothing, so this case fails — which is the fork kogaki#442
# named being decided by an assertion rather than by a comment.
c442="$(mk c442)"
mkdir -p "$c442/tools" "$c442/checks"
cp "$SWEEP" "$c442/tools/review-sweep.sh"
chmod +x "$c442/tools/review-sweep.sh"
(
  cd "$c442" || exit 1
  git init -q . && git config user.email f@x && git config user.name f
  printf '#!/bin/sh\nexit 0\n' > checks/check-added-by-the-pr.sh
  printf '{"note":[],"checks":[{"id":"added","file":"check-added-by-the-pr.sh"}]}\n' > checks/registry.json
  git add -A && git commit -qm head
) >/dev/null 2>&1
c442_head="$(git -C "$c442" rev-parse HEAD 2>/dev/null)"
# A SECOND COMMIT REMOVES IT, so the scratch's HEAD differs from the ref under
# review. Without this, HEAD and the ref name the same tree and a derivation
# reading `HEAD:checks/registry.json` instead of `<ref>:...` passes — the
# mutation survived exactly that in the case's first version.
(
  cd "$c442" || exit 1
  rm -f checks/check-added-by-the-pr.sh
  printf '{"note":[],"checks":[]}\n' > checks/registry.json
  git add -A && git commit -qm "remove it"
) >/dev/null 2>&1
if [ -z "$c442_head" ]; then
  bad "could not build the checks/ scratch repository, so kogaki#442's
  acceptance case never ran — an unbuildable fixture is not a passing one"
else
  at_ref442="$(cd "$c442" && ./tools/review-sweep.sh --print-grant "$c442_head" 2>/dev/null)"
  at_tree442="$(cd "$c442" && ./tools/review-sweep.sh --print-grant 2>/dev/null)"
  case "$at_ref442" in
    *"Bash(bash checks/check-added-by-the-pr.sh:*)"*) : ;;
    *) bad "a registered check present AT THE HEAD under review is not granted,
  so the round reviewing a PR that adds a check cannot run that check's own
  evidence — kogaki#411's failure one directory over (got: ${at_ref442:-<empty>})" ;;
  esac
  case "$at_tree442" in
    *added-by-the-pr*) bad "the checks/ control is broken: the reviewing
  checkout was supposed to register no check" ;;
  esac
fi

# --- 2d. THREE OUTCOMES STAY THREE (kogaki#446, findings 1 and 2) ------------
# Every repair in this chain collapsed one pair of conditions and rebuilt the
# collapse in the other direction, so both survivors are asserted here rather
# than left to the next round to find:
#
#   registry UNPARSEABLE at a resolvable ref -> non-zero, and says so
#   a TREE-ISH ref                           -> derives, same as tool_grants
#
# Written because the fix for each SURVIVED its own mutation until this case
# existed: behaviour changed, nothing bound it.
q446="$(mk q446)"
mkdir -p "$q446/tools" "$q446/checks"
cp "$SWEEP" "$q446/tools/review-sweep.sh"
chmod +x "$q446/tools/review-sweep.sh"
(
  cd "$q446" || exit 1
  git init -q . && git config user.email f@x && git config user.name f
  printf '#!/bin/sh\n' > tools/ordinary.sh
  printf '{"note":[],"checks":[' > checks/registry.json     # deliberately truncated
  git add -A && git commit -qm broken
) >/dev/null 2>&1
q446_head="$(git -C "$q446" rev-parse HEAD 2>/dev/null)"
if [ -z "$q446_head" ]; then
  bad "could not build the unparseable-registry scratch, so kogaki#446's cases
  never ran"
else
  q_err="$TMPROOT/q.err"
  (cd "$q446" && ./tools/review-sweep.sh --print-grant "$q446_head" >/dev/null 2>"$q_err"); q_rc=$?
  if [ "$q_rc" -eq 0 ]; then
    bad "an UNPARSEABLE registry at a resolvable ref exited 0 — a head whose
  registry is present and broken registers an unknown number of checks, not
  zero, so reporting it as an empty half denies the round every checks/ member
  with nothing on stderr and nothing in the exit code. It said: $(cat "$q_err")"
  fi
  # AND THE DIAGNOSIS NAMES THE PARSE, not ref resolution (finding 2's repair).
  case "$(cat "$q_err")" in
    *"would not parse"*) : ;;
    *) bad "the unparseable-registry diagnosis does not name the parse — an
  operator meeting this red is pointed at ref resolution when the repair is a
  JSON fix: $(cat "$q_err")" ;;
  esac
  # AND THE SAME FAULT IN THE REF-LESS MODE (PR #448 round 2). The parse arm
  # used to be guarded by `_ref`, so this exact break was silent on the path
  # this very file uses as its control at three sites. Asserted here because
  # the fix without it is the unbound repair this chain keeps producing.
  q_nr_err="$TMPROOT/q_nr.err"
  (cd "$q446" && ./tools/review-sweep.sh --print-grant >/dev/null 2>"$q_nr_err"); q_nr=$?
  # THE DIAGNOSIS IS ASSERTED ON THIS ARM TOO (PR #449 round 1, finding 1).
  # Its ref-ful sibling asserts its text; this one checked only the exit code,
  # so it passed while the message said "at None" — naming a ref on the one
  # path that has none, in the arm added to make that path reachable.
  # EXHAUSTIVE, matching its sibling (kogaki#450). The known-regression arm
  # alone let an EMPTY or reworded diagnosis fall through silently — the arm
  # two blocks above has always had a `*)` and this one did not, so the
  # asymmetry ran along the axis the bug was on.
  # CAPTURED FIRST, THEN DEFAULTED (PR #451 round 1, finding 3). `cat` on an
  # empty file exits 0 and prints nothing, so an `|| echo` fallback is inert on
  # exactly the empty-diagnosis case this arm was widened for.
  q_nr_msg="$(cat "$q_nr_err" 2>/dev/null)"
  case "$q_nr_msg" in
    *"in the working tree"*) : ;;
    *) bad "the ref-less parse diagnosis does not name the working tree — it
  reports a ref on the path that has none, or says nothing at all:
  ${q_nr_msg:-<empty>}" ;;
  esac
  if [ "$q_nr" -eq 0 ]; then
    bad "an UNPARSEABLE registry in the WORKING TREE exited 0 — the ref-less
  mode is what this file uses as its own control, so a broken registry there
  makes every control silently tools/-only while reporting success"
  fi
fi

# A TREE-ISH REF derives THE checks/ HALF, and the half matters: `tool_grants`
# never passes through that gate, so asserting a `tools/` member here would
# pass with the gate at its narrowest. The first version of this case did
# exactly that and the mutation SURVIVED. A separate scratch is used because
# the one above deliberately holds a broken registry.
q446b="$(mk q446b)"
mkdir -p "$q446b/tools" "$q446b/checks"
cp "$SWEEP" "$q446b/tools/review-sweep.sh"
chmod +x "$q446b/tools/review-sweep.sh"
(
  cd "$q446b" || exit 1
  git init -q . && git config user.email f@x && git config user.name f
  printf '#!/bin/sh\nexit 0\n' > checks/check-treeish.sh
  printf '{"note":[],"checks":[{"id":"t","file":"check-treeish.sh"}]}\n' > checks/registry.json
  git add -A && git commit -qm valid
) >/dev/null 2>&1
q446b_tree="$(git -C "$q446b" rev-parse "HEAD^{tree}" 2>/dev/null)"
if [ -z "$q446b_tree" ]; then
  bad "could not build the tree-ish scratch, so the ref-gate case never ran"
else
  qb_out="$(cd "$q446b" && ./tools/review-sweep.sh --print-grant "$q446b_tree" 2>/dev/null)"; qb_rc=$?
  case "$qb_out" in
    *"Bash(bash checks/check-treeish.sh:*)"*) : ;;
    *) bad "a TREE-ISH ref did not derive the checks/ half (exit $qb_rc) — the
  ref gate is narrower than the derivation it guards, so the two halves
  disagree about whether one ref is readable, and a consumer is told a ref
  that resolved 'could not be read' (got: ${qb_out:-<empty>})" ;;
  esac
fi

# --- 3. every member is the GRANTED SHAPE ------------------------------------
# `bash ` is not decoration: a member emitted without it names a different,
# ungranted command, and the round dies on a denial that reads as a missing
# tool rather than as a malformed grant.
# THE LIVE ARM MUST BE ABLE TO FAIL (PR #441 round 1, finding 1). It used to
# swallow stderr and read an empty result as "vacuous today" — so a ref that
# would not resolve was reported as coverage. `--print-grant` now exits 2 in
# that case, and this arm FAILS on it rather than announcing vacuity.
live="$(./tools/review-sweep.sh --print-grant HEAD 2>&1)"; live_rc=$?
if [ "$live_rc" -ne 0 ]; then
  bad "the live arm could not resolve HEAD, so it asserted nothing — and
  before PR #441 round 1 this passed as 'vacuous today', reporting a
  resolution failure as coverage: $live"
  live=""
fi
if [ -n "$live" ]; then
  # `set -f` because every member contains a literal `*` and word-splitting
  # would otherwise let pathname expansion rewrite them (finding 4). Nothing
  # in this tree matches such a word today; this makes that independent of
  # what lands in the root later.
  set -f
  IFS=','
  for m in $live; do
    # BOTH HALVES, since kogaki#442 moved the `checks/` derivation onto the
    # round's own tree too. The shape is the same in both — the `bash ` prefix
    # is what makes the member name a granted command — and accepting only
    # `tools/` here would have made this check reject the very widening §4
    # clause 4 asks for.
    case "$m" in
      "Bash(bash tools/"*":*)") : ;;
      "Bash(bash checks/"*":*)") : ;;
      *) bad "grant member is not the granted shape: '$m' — expected
  Bash(bash tools/<name>:*) or Bash(bash checks/<name>:*)" ;;
    esac
  done
  unset IFS
  set +f
  granted_n="$(printf '%s' "$live" | tr ',' '\n' | grep -c .)"
else
  granted_n=0
fi

# --- 4. this repository's own head, stated whether or not it has input -------
# THE SCOPE IS DECLARED ON EVERY RUN, pass included. This member asserts the
# DERIVATION's behaviour over trees it constructs; the live count below is a
# reading of this repository today and is NOT what the pass rests on. A member
# that announced its limit only when it fired would be silent in exactly the
# state that misleads.
if [ "$fail" -eq 0 ]; then
  echo "ok: the reviewer's executable grant is DERIVED OVER THE TREE THE ROUND"
  echo "  RUNS IN — BOTH HALVES, tools/ and checks/ (kogaki#412, kogaki#442) —"
  echo "  asked of tools/review-sweep.sh --print-grant rather than"
  echo "  re-implemented here; the spawner is excluded BY CAPABILITY so a"
  echo "  renamed one is excluded too; every member carries the granted"
  echo "  Bash(bash <tools|checks>/<name>:*) shape."
  note "scope: this asserts the DERIVATION over constructed trees. It does not"
  note "  assert that spawn() passes the result to --allowedTools — that is the"
  note "  sweep's own fixture, which runs on every invocation and not in CI."
  note "live at HEAD: ${granted_n} member(s) granted across both halves$([ "$granted_n" -eq 0 ] && echo ' — vacuous today, and says so rather than reading as coverage')"
  exit 0
fi
exit 1
