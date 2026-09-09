#!/usr/bin/env bash
# check-review-draft-retired-vocabulary — ReviewDraft's retired vocabulary, as data.
#
# THE CRITERION HAD NO CARRIER (kogaki#1018 acceptance 1). The kogaki#1013 chain
# rebuilt ReviewDraft around Reverse Outlining and CLOSED its vocabulary to four
# terms — Reverse Outlining, Reverse Outline, Forward Artifact, Round Trip —
# retiring `Recovery`/`recovered`, `Regenerate` and `shape` by name in that
# issue's own body. The acceptance that removed them was written as a grep, and a
# grep run once in a sitting is a census re-made by hand: it says the tree was
# clean on the day, and says nothing about the day after. This member is the
# same list as DATA, which is the instrument checks/check-terrain-retired-
# vocabulary.sh already is for the #683 chain's vocabulary.
#
#   "An extraction, promotion, or generalization criterion is one-sided — it
#   measures what must NOT remain, so it is satisfied most cheaply by removing
#   behaviour, and checked alone it rewards the loss it exists to prevent; the
#   completeness criterion must be stated in the same act."
#   consulted: product-lab@258bc881718ef2c179a4038bce8138d2f7a66317 LESSONS.md:83
#
# SO THIS HALF IS THE ONE-SIDED HALF, AND IT IS NAMED AS SUCH. What must not
# remain is below. What must SURVIVE is not this file's to hold — it is the
# runtime's own cases, and kogaki#1018's PR body enumerates them with the case
# that fails if each stops holding. A reader who finds only this member has found
# half the criterion, and this paragraph is where they are told so.
#
# THE NON-MEMBER FALLBACK IS CHOSEN, NOT INHERITED. A matcher over declared
# instances bounds what it recognises and leaves everything else
# admit-by-default; because it visibly works on what it matches, the enumeration
# reads as coverage. What this member does NOT cover, stated rather than left to
# be discovered:
#
#   L1. A FOURTH TERM IS ADMITTED UNTIL SOMEONE ADDS IT. The class is open and no
#       closed-list grep is complete against it. What changes is the COST — one
#       line here, versus a hand census — and that the three known terms cannot
#       come back silently.
#   L2. THE ROOTS ARE THE ACCEPTANCE'S THREE AND NO MORE. `checks/`, `specs/` and
#       `src/packet-template.md` each still carry the English words legitimately,
#       and widening the roots would make this member re-judge prose it has no
#       ruling about. The three roots are where kogaki#1013 closed the
#       vocabulary; anywhere else is outside this member by choice.
#   L3. THIS FILE IS NOT SCANNED. A check cannot police the data list it carries;
#       the terms below would match themselves. It is not in the roots either, so
#       the exclusion is structural rather than a skip — stated because a later
#       edit that widened the roots would need it.
#   L4. IT READS TEXT. A term inside a string, an identifier, or generated output
#       is indistinguishable from one in prose.
#
# THE ALLOW CONDITION IS AN ANCHORED MARKER, NEVER PROSE THIS CHECK RE-JUDGES. A
# legitimate occurrence — dated provenance, an explicit replacement statement, a
# must-not-appear tripwire — carries `retired-vocab-ok` leading its block: on the
# hit's own line, or on one of the ten lines above it. Sniffing for words like
# "replaces" would make the check re-judge English, and a survivor in a paragraph
# that happens to contain "replaced" would pass. NO SITE CARRIES ONE at this
# admission, and that is the intended steady state: the vocabulary left whole
# rather than being quoted back as provenance.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fails=()

# THE LIST IS THE DATA. One term per line; a fourth term is one line.
# Case-insensitive, matched as fixed strings. `regenerat` is a stem so that
# `regenerate`, `regenerated` and `regeneration` are one entry rather than three.
TERMS=(
  "recover"
  "regenerat"
  "shape"
)

# The acceptance's own three roots (kogaki#1018), and L2 says why no more.
ROOTS=(.claude/skills/review-draft src/review-draft.mjs src/review-items.json)

# roots_missing <tree> — prints every declared ROOT that resolves to no tracked
# file in <tree>. `git grep` accepts a pathspec member matching no tracked file
# WITHOUT error, so a root that stops resolving is silently dropped and every
# term goes unsearched there while the ok line reads unchanged. The failure is
# silent and PARTIAL, which is the shape kogaki#765 measured on the terrain
# member after a file move.
roots_missing() {
  local tree="$1" r
  for r in "${ROOTS[@]}"; do
    if [ -z "$(cd "$tree" && git ls-files -- "$r" 2>/dev/null | head -1)" ]; then
      printf '%s\n' "$r"
    fi
  done
}

# scan <tree> — prints "file:line" for every unmarked survivor.
scan() {
  local tree="$1" term f l hit
  for term in "${TERMS[@]}"; do
    while IFS= read -r hit; do
      [ -n "$hit" ] || continue
      f="${hit%%:*}"; hit="${hit#*:}"; l="${hit%%:*}"
      # THE MARKER LEADS ITS BLOCK: it exempts hits on its own line and on the
      # ten lines FOLLOWING it. Asymmetric and forward-looking on purpose — a
      # symmetric window tight enough to be safe cannot reach every hit in a
      # multi-line comment, so the marker ends up inside the sentence it
      # annotates.
      if sed -n "$(( l > 10 ? l - 10 : 1 )),${l}p" "$tree/$f" 2>/dev/null \
           | grep -qF "retired-vocab-ok"; then continue; fi
      printf '%s:%s\n' "$f" "$l"
    done < <(cd "$tree" && git grep -inF -- "$term" -- "${ROOTS[@]}" 2>/dev/null || true)
  done
}

# ---- (a) NO CARRIER STATES THE RETIRED VOCABULARY.
survivors="$(scan "$root" | sort -u || true)"
if [ -n "$survivors" ]; then
  while IFS= read -r s; do
    fails+=("(a) ReviewDraft's retired vocabulary is stated at $s — kogaki#1013 closed the vocabulary to Reverse Outlining, Reverse Outline, Forward Artifact and Round Trip, and \`recover\`, \`regenerat\` and \`shape\` left it. If this occurrence is dated provenance, an explicit replacement statement, or a must-not-appear tripwire, mark it \`retired-vocab-ok\` at the site.")
  done <<< "$survivors"
fi

# ---- (b) THE CHECK DISCRIMINATES — asserted, never assumed.
# A fixture stating the retired vocabulary must turn this red, and the same
# fixture carrying the marker must not. Without both directions a check that
# matched nothing at all would read identically to a clean tree.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
( cd "$tmp" && git init -q . && git config user.email c@e && git config user.name c )
# EVERY declared root carries a tracked file, so the mutant tree is a faithful
# model of a well-formed repository and can serve as (c)'s control arm. git
# tracks no empty directory, so a root created with mkdir alone would be
# unresolvable and (c) would fire on its own fixture.
mkdir -p "$tmp/.claude/skills/review-draft" "$tmp/src"
printf -- '- no retired vocabulary here.\n' > "$tmp/.claude/skills/review-draft/SKILL.md"
printf '{ "items": [] }\n' > "$tmp/src/review-items.json"
printf '// clean.\n' > "$tmp/src/review-draft.mjs"
( cd "$tmp" && git add -A >/dev/null 2>&1 )
printf '// the reviewer files one blind recovery and the harness reads its shape.\n' \
  > "$tmp/src/review-draft.mjs"
( cd "$tmp" && git add -A >/dev/null 2>&1 )
planted="$(scan "$tmp" || true)"
if ! grep -q "src/review-draft.mjs" <<< "$planted"; then
  fails+=("(b) THE CHECK DOES NOT DISCRIMINATE: a planted line stating the retired vocabulary was not reported. Every (a) pass is therefore unevidenced — a check that matches nothing reads exactly like a clean tree.")
fi
printf '// retired-vocab-ok — `recovery` and `shape` are GONE from this vocabulary.\n' \
  > "$tmp/src/review-draft.mjs"
( cd "$tmp" && git add -A >/dev/null 2>&1 )
marked="$(scan "$tmp" || true)"
if grep -q "src/review-draft.mjs" <<< "$marked"; then
  fails+=("(b) THE MARKER DOES NOT EXEMPT: a planted line carrying \`retired-vocab-ok\` was still reported, so every legitimate provenance and tripwire site would fail and the check would be unusable.")
fi

# ---- (c) EVERY DECLARED ROOT RESOLVES.
# (a)'s pass means "no survivor was found in the roots that were searched". This
# asserts the second half: that the roots searched are the roots declared.
missing_roots="$(roots_missing "$root" || true)"
if [ -n "$missing_roots" ]; then
  while IFS= read -r r; do
    [ -n "$r" ] || continue
    fails+=("(c) the declared scan root \`$r\` resolves to no tracked file, so every term in (a) was searched in a tree that does not contain it and (a)'s pass is unevidenced for that root. Repoint ROOTS at the carrier's current location, or drop the root deliberately — never leave it declared and empty.")
  done <<< "$missing_roots"
fi

# (c) IS ASSERTED IN BOTH DIRECTIONS ON EVERY RUN, for the reason (b) gives about
# itself: an arm that only ever confirms the healthy state cannot be told from
# one that stopped working.
if [ -n "$(roots_missing "$tmp" || true)" ]; then
  fails+=("(c) THE ROOT GUARD MISFIRES: the mutant tree populates every declared root and roots_missing still reported one, so the guard cannot distinguish a moved carrier from a well-formed tree.")
fi
absent_root="a-root-no-tree-carries-$$"
ROOTS+=("$absent_root")
guard_fired="$(roots_missing "$tmp" || true)"
unset 'ROOTS[-1]'
if ! grep -qF "$absent_root" <<< "$guard_fired"; then
  fails+=("(c) THE ROOT GUARD DOES NOT FIRE: a declared root that no tree carries was not reported, so the negative direction above is unevidenced and a root silently dropped from the scan would read exactly like a clean one.")
fi

if [ ${#fails[@]} -gt 0 ]; then
  printf 'FAIL check-review-draft-retired-vocabulary\n'
  printf '  - %s\n' "${fails[@]}"
  exit 1
fi
printf 'ok: check-review-draft-retired-vocabulary — %d terms over %d roots (%s), all resolving; no carrier states them; discrimination and the root guard asserted both ways\n' "${#TERMS[@]}" "${#ROOTS[@]}" "${ROOTS[*]}"
