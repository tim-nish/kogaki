#!/usr/bin/env bash
# check-terrain-retired-vocabulary — the retired subdivision vocabulary, as data.
#
# THE CENSUS THAT WAS RE-MADE BY HAND FIVE TIMES (kogaki#708). The #683 chain
# retired the conjunctive leaf condition and replaced it with the coherence
# label. Five consecutive review rounds (#705 r1, #705 r2, #706 r2, #707 r1)
# then re-found the same class — the retired vocabulary stated as current —
# each time under a noun the previous sweep's grep did not contain: `leaf
# verdict`, `conjunct`, `tighter than`, `leaf split`, `leaf reason`. Every one
# of those censuses was a judgment re-made from scratch, and the lane had no
# instrument that enumerates a vocabulary class. This member is that
# instrument: the list is DATA, so a sixth noun is one line here rather than a
# sixth hand-made sweep.
#
# WHAT THIS IS RELATIVE TO — it is a TRIPWIRE beside a generator removal, not a
# substitute for one. The served position rules that a recurring class is
# constrained at what the pipeline can PRODUCE rather than detected after the
# fact, and its tell is a suite growing one member per incident. The
# produce-side fix is kogaki#685's re-cut to current-contract-only, which
# landed at ee4f581 and removed the corpus that regenerated the vocabulary.
# Measured at this admission: `specs/spec-terrain/SPEC.md` now contains the
# word "leaf" ZERO times, so the SPEC half of this check is already vacuous,
# exactly as #708 predicted. What remains is the two carriers the re-cut does
# not reach — `terrain/` and `checks/` — where five sites still stated the
# frame as current and were renamed in the same act.
#
#   "A ported mechanism can carry its DATA SHAPE across intact while the RULE
#   that gave it meaning is left behind, and the surviving shape is what makes
#   the loss invisible … both pass any review that asserts the field, the
#   parse, or the outcome name exists."
#   consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 LESSONS.md:35
#
# THE NON-MEMBER FALLBACK IS CHOSEN, NOT INHERITED, and this paragraph is that
# choice. A matcher over declared instances bounds what it recognises and
# leaves everything else admit-by-default; because it visibly works on what it
# matches, the enumeration reads as coverage. So what this member does NOT
# cover is stated rather than left to be discovered:
#
#   "the decisive question is not 'does it catch what it names?' but 'what
#   happens to what it does not name?', and that fallback must be chosen
#   rather than inherited from the matcher."
#   consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 LESSONS.md:41
#
#   L1. A SIXTH NOUN IS ADMITTED UNTIL SOMEONE ADDS IT. That is the standing
#       condition, not a defect of this cut: the class is open, and no grep
#       over a closed list can be complete against it. What changes is the
#       COST — one line here, versus a hand census — and the fact that the
#       five known nouns can no longer come back silently.
#   L2. `which conjunct` IS DELIBERATELY NOT A TERM. #708 lists it, and it is
#       excluded because the retired mechanism's conjuncts are
#       `composes_honestly` and `tighter_than_parent`, both listed here by
#       name, so the phrase adds no coverage — while §13 uses "which conjunct"
#       in an unrelated reachability sense, which would force an allow marker
#       into spec prose that is not about this vocabulary at all.
#   L3. THIS FILE IS NOT SCANNED. A check cannot police the data list it
#       carries; the terms below would match themselves. A survivor written
#       into this file is invisible to it.
#   L4. `checks/registry.json` IS NOT SCANNED, for L3's reason one level out:
#       this member's OWN admission record has to quote the vocabulary it
#       guards, and so may any other check's. It was found passing there by
#       ACCIDENTAL ADJACENCY at this admission — three of its lines carry
#       terms and were exempted only because the contract prose nearby happens
#       to quote the marker token — which is a guard passing for the wrong
#       reason, so the exclusion is stated rather than left to luck. The SAME
#       exclusion is owed by the registry's `removal_instrument` probe, which
#       PR #715 round 1 found unreachable without it.
#   L5. THE TEN-LINE FORWARD WINDOW EXEMPTS BY PROXIMITY, NOT BY REFERENCE. A
#       marker leading one block also covers a hit in the next ten lines even
#       when it was never written about it. L4 fixes the one instance that was
#       actually biting; this is the residual general case, named rather than
#       left for a reader to find. It is the price of an anchor that does not
#       re-judge prose, and it is bounded: ten lines, forward only.
#   L6. IT READS TEXT. A term inside a string, a variable name, or generated
#       output is indistinguishable from one in prose.
#
# THE ALLOW CONDITION IS AN ANCHORED MARKER, NEVER PROSE THIS CHECK RE-JUDGES.
# A legitimate occurrence — dated provenance, an explicit replacement
# statement, a must-not-appear tripwire assertion — carries `retired-vocab-ok`
# leading its block: on the hit's own line, or on one of the ten lines above
# it (the marker exempts its own line and the ten lines following it — the
# asymmetric forward window L5 names). Sniffing for words like
# "replaces" or "before" would make the check re-judge English, and a survivor
# in a paragraph that happens to contain "replaced" would pass.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
self="check-terrain-retired-vocabulary.sh"
skip_registry="checks/registry.json"
fails=()

# THE LIST IS THE DATA (kogaki#708). One term per line; a sixth noun is one
# line. Case-insensitive, matched as fixed strings.
TERMS=(
  "leaf verdict"
  "leaf condition"
  "leaf_condition"
  "leaf split"
  "leaf reason"
  "leaf_reason"
  "composes_honestly"
  "composes honestly"
  "tighter_than_parent"
  "tighter than parent"
  "NOT a leaf"
)

ROOTS=(specs/spec-terrain src checks .claude/skills/terrain)

# roots_missing <tree> — prints every declared ROOT that resolves to no tracked
# file in <tree>.
#
# THE ROOTS FALLBACK IS CHOSEN TOO (kogaki#765). The paragraph at the head of
# this file chooses the non-member fallback for the TERM list and left the ROOT
# list inheriting one. `git grep` accepts a pathspec whose member matches no
# tracked file WITHOUT error — exit 0, empty stderr, results from the surviving
# members only — so a root that stops resolving is silently dropped and every
# term goes unsearched THERE while the check reports the same ok line it reports
# on a clean tree.
#
# MEASURED, not reasoned (2026-09-02). kogaki#765 moved `terrain/` to `src/`,
# one of the four roots below. The pre-repair check run against the post-move
# tree printed `ok: … 11 terms, no operative carrier states them as current`
# while `src/` carried FOUR live hits it never looked at.
#
# The earlier draft of this comment said git grep fails on the WHOLE pathspec
# when one member is bad, and that the move would silence every term for every
# root at once. That is FALSE — it was written from plausibility and not from a
# run, which is the defect this member exists to catch, one level up. The true
# mechanism is narrower and worse: the loss is silent and PARTIAL, so the check
# keeps working on its surviving roots and nothing about its output changes.
#
# WHY (b) COULD NOT CATCH THIS, which is the whole argument for (c). The
# discrimination arm plants its specimen into its OWN throwaway tree, so it
# asserts that the scanner works and never that the scanner is aimed at the
# repository. On the post-move tree (b) passed. An arm admitted because "this
# member's failure mode is silence" was itself silent about this failure.
#
#   "A system that periodically hunts for problems fails silently, because
#   'found nothing' and 'never ran' look identical from outside … make the fact
#   that it ran visible — not just what it found."
#   consulted: product-lab@82b8908197ff6f9251448e94a09abd90f7699757 gloss/lessons/testing.md:149
#
# So a declared root resolving to nothing FAILS here rather than passing
# quietly, and the ok line names what was actually scanned.
roots_missing() {
  local tree="$1" r
  for r in "${ROOTS[@]}"; do
    if [ -z "$(cd "$tree" && git ls-files -- "$r" 2>/dev/null | head -1)" ]; then
      printf '%s\n' "$r"
    fi
  done
}

# scan <tree> — prints "file:line:text" for every unmarked survivor.
scan() {
  local tree="$1" term f l hit
  for term in "${TERMS[@]}"; do
    while IFS= read -r hit; do
      [ -n "$hit" ] || continue
      f="${hit%%:*}"; hit="${hit#*:}"; l="${hit%%:*}"
      case "$f" in *"$self") continue;; esac
      [ "$f" = "$skip_registry" ] && continue
      # THE MARKER LEADS ITS BLOCK: it exempts hits on its own line and on the
      # ten lines FOLLOWING it. Asymmetric and forward-looking on purpose — a
      # symmetric window tight enough to be safe cannot reach every hit in a
      # multi-line comment, so the marker ends up inside the sentence it
      # annotates. Leading the block keeps prose intact and keeps the span
      # bounded and declared.
      if sed -n "$(( l > 10 ? l - 10 : 1 )),${l}p" "$tree/$f" 2>/dev/null \
           | grep -qF "retired-vocab-ok"; then continue; fi
      printf '%s:%s\n' "$f" "$l"
    done < <(cd "$tree" && git grep -inF -- "$term" -- "${ROOTS[@]}" 2>/dev/null || true)
  done
}

# ---- (a) NO OPERATIVE CARRIER STATES THE RETIRED VOCABULARY AS CURRENT.
survivors="$(scan "$root" | sort -u || true)"
if [ -n "$survivors" ]; then
  while IFS= read -r s; do
    fails+=("(a) the retired subdivision vocabulary is stated as current at $s — the coherence label replaced the conjunctive leaf condition at kogaki#683. If this occurrence is dated provenance, an explicit replacement statement, or a must-not-appear tripwire, mark it \`retired-vocab-ok\` at the site.")
  done <<< "$survivors"
fi

# ---- (b) THE CHECK DISCRIMINATES — asserted, never assumed (kogaki#708 item 3).
# A fixture stating the old contract as current must turn this red, and the
# same fixture carrying the marker must not. Without both directions a check
# that matched nothing at all would read identically to a clean tree.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/src" "$tmp/specs/spec-terrain" "$tmp/checks" "$tmp/.claude/skills/terrain"
( cd "$tmp" && git init -q . && git config user.email c@e && git config user.name c )
# EVERY declared root carries a tracked file, so the mutant tree is a faithful
# model of a well-formed repository and can serve as (c)'s control arm. git
# tracks no empty directory, so mkdir alone would leave three of the four roots
# unresolvable and (c) would fire on its own fixture.
for r in "${ROOTS[@]}"; do
  mkdir -p "$tmp/$r"
  printf '// root placeholder — no retired vocabulary here.\n' > "$tmp/$r/.root-present"
done
printf '// the group is a leaf when composes_honestly and tighter_than_parent hold.\n' \
  > "$tmp/src/planted.mjs"
( cd "$tmp" && git add -A >/dev/null 2>&1 )
planted="$(scan "$tmp" || true)"
if ! grep -q "src/planted.mjs" <<< "$planted"; then
  fails+=("(b) THE CHECK DOES NOT DISCRIMINATE: a planted line stating the retired condition as current was not reported. Every (a) pass is therefore unevidenced — a check that matches nothing reads exactly like a clean tree.")
fi
printf '// composes_honestly and tighter_than_parent are GONE. retired-vocab-ok\n' \
  > "$tmp/src/planted.mjs"
( cd "$tmp" && git add -A >/dev/null 2>&1 )
marked="$(scan "$tmp" || true)"
if grep -q "src/planted.mjs" <<< "$marked"; then
  fails+=("(b) THE MARKER DOES NOT EXEMPT: a planted line carrying \`retired-vocab-ok\` was still reported, so every legitimate provenance and tripwire site would fail and the check would be unusable.")
fi

# ---- (c) EVERY DECLARED ROOT RESOLVES (kogaki#765).
# (a)'s pass means "no survivor was found in the roots that were searched". This
# asserts the second half: that the roots searched are the roots declared. An
# empty root is a FAIL and never a quiet pass — see roots_missing above.
missing_roots="$(roots_missing "$root" || true)"
if [ -n "$missing_roots" ]; then
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    fails+=("(c) the declared scan root \`$r\` resolves to no tracked file, so every term in (a) was searched in a tree that does not contain it and (a)'s pass is unevidenced for that root. Repoint ROOTS at the carrier's current location, or drop the root deliberately — never leave it declared and empty.")
  done <<< "$missing_roots"
fi

# (c) IS ASSERTED IN BOTH DIRECTIONS ON EVERY RUN, for the reason (b) already
# gives about itself: an arm that only ever confirms the healthy state cannot be
# told from one that stopped working. #765's acceptance asks for the positive
# direction as a standing case rather than a mutation someone ran once and
# described in a PR body, and a description is not executable by the next run.
#
# NEGATIVE direction — the guard does not fire on a well-formed tree. The mutant
# tree carries a tracked file under every declared root, so roots_missing must
# come back empty. A guard that fired here would be unusable.
if [ -n "$(roots_missing "$tmp" || true)" ]; then
  fails+=("(c) THE ROOT GUARD MISFIRES: the mutant tree populates every declared root and roots_missing still reported one, so the guard cannot distinguish a moved carrier from a well-formed tree.")
fi

# POSITIVE direction — the guard DOES fire on a root that resolves to nothing.
# Asserted by removing one root from a tree that is otherwise well-formed, which
# is the exact shape kogaki#765 produced by moving `terrain/` to `src/`. Without
# this, roots_missing could be edited to always return empty and every arm above
# would still pass.
absent_root="a-root-no-tree-carries-$$"
ROOTS+=("$absent_root")
guard_fired="$(roots_missing "$tmp" || true)"
unset 'ROOTS[-1]'
if ! grep -qF "$absent_root" <<< "$guard_fired"; then
  fails+=("(c) THE ROOT GUARD DOES NOT FIRE: a declared root that no tree carries was not reported, so the negative direction above is unevidenced and a root silently dropped from the scan would read exactly like a clean one — the failure this arm exists to make loud.")
fi

if [ ${#fails[@]} -gt 0 ]; then
  printf 'FAIL check-terrain-retired-vocabulary\n'
  printf '  - %s\n' "${fails[@]}"
  exit 1
fi
printf 'ok: check-terrain-retired-vocabulary — %d terms over %d roots (%s), all resolving; no operative carrier states them as current; discrimination and the root guard asserted both ways\n' "${#TERMS[@]}" "${#ROOTS[@]}" "${ROOTS[*]}"
