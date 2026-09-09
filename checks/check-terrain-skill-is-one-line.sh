#!/usr/bin/env bash
# The Terrain skill file carries NOTHING BUT ITS FRONTMATTER AND ITS START LINE
# (kogaki#1032, under kogaki#1025).
#
# WHAT THIS CARRIES. The Harness owns the Terrain workflow and executes its
# Acts, and ownership is determined by which component executes each Act. A
# skill file that addresses the session — how to invoke the executor, what to
# render, what to compose, what never to do — hands those Acts back to the
# model whatever the surrounding prose claims. So the file is reduced to the
# frontmatter the harness needs to find it and the one `!` line that starts the
# run, and this member holds it there.
#
# THE NAMED DEFECT, and it is measured rather than feared. Across kogaki#17
# through #890 the workflow was specified as Harness-controlled and every
# implementation satisfied the words while leaving every Act that mattered to
# the model. The skill file was 158 lines of conduct at the head this member
# was admitted on. Across every retained session transcript the tag question
# was passed to the question UI zero times, and on 2026-09-09 two runs showed
# no table and no question at all. Prose telling the model to do the right
# thing had been the whole mechanism, and it had been failing silently for a
# month.
#
#   "A rule is enforced only at the layer where it can be broken — a
#   prohibition needs a mechanical gate at the tool boundary because prose is
#   advisory to a system whose job is to satisfy instructions."
#
#   consulted: product-lab@4a58f2a3a895ffa358115db2ad38cb95a56b5523 LESSONS.md:209
#
# THE PREDICATE IS OVER THE FILE'S SHAPE, NEVER OVER ITS MEANING. It does not
# read what a line says and does not judge whether a sentence addresses the
# session — that would be a matcher over English, which this suite declines by
# standing rule. It partitions the file into three regions by position and
# asserts the third is exactly one line beginning `!`. A file that grows a
# sentence fails whatever the sentence says, which is the point: the class of
# defect is "conduct came back", and conduct has no closed vocabulary.
#
# DECLARED LIMITS, stated here beside the predicate:
#   L1. IT DOES NOT ASSERT THE START LINE WORKS. That the command in it starts
#       a run is the runtime's own contract and its self-test's; this member
#       asserts only that exactly one such line is present and that nothing
#       else is.
#   L2. IT DOES NOT READ THE FRONTMATTER'S CONTENT. `name` and `description`
#       are the harness's schema, not this rule's, and a member asserting them
#       here would be a second copy of a contract this repository does not own.
#   L3. NO BLANK LINE IS ADMITTED after the frontmatter, and that is chosen
#       rather than inherited. A blank line is a line, and the acceptance this
#       member was admitted under says "any line other than frontmatter and the
#       `!` start line". Admitting blanks would need a rule about how many,
#       which is the kind of tolerance a conduct paragraph re-enters through.
#   L4. IT COVERS ONE FILE. The ownership rule is general and this member is
#       not: the Terrain skill is where the defect was measured, and a member
#       widened to every skill in the tree would be asserting a rule no issue
#       has ruled for the others.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKILL=".claude/skills/terrain/SKILL.md"
fails=()

# verdict <tree> — prints nothing and returns 0 where <tree>'s skill file is
# frontmatter plus exactly one leading-`!` line; otherwise prints one reason
# per offending region and returns 1.
verdict() {
  local tree="$1"
  local f="$tree/$SKILL"
  local n i line rest
  local closed=0 bad=0
  local L=()
  if [ ! -f "$f" ]; then printf 'the skill file is absent at %s\n' "$SKILL"; return 1; fi
  mapfile -t L < "$f"
  n=${#L[@]}
  if [ "$n" -lt 3 ] || [ "${L[0]}" != "---" ]; then
    printf 'the file does not open with a `---` frontmatter fence\n'; return 1
  fi
  # region 1 and 2: the frontmatter, from line 1 to its closing fence.
  for (( i=1; i<n; i++ )); do
    if [ "${L[$i]}" = "---" ]; then closed=$i; break; fi
  done
  if [ "$closed" -eq 0 ]; then
    printf 'the frontmatter fence is never closed\n'; return 1
  fi
  # region 3: everything after the closing fence must be exactly the start line.
  rest=$(( n - closed - 1 ))
  if [ "$rest" -ne 1 ]; then
    printf 'the file carries %d line(s) after the frontmatter; exactly one is admitted, and it is the `!` start line\n' "$rest"
    bad=1
  else
    line="${L[$(( closed + 1 ))]}"
    case "$line" in
      '!'*) ;;
      *) printf 'the one line after the frontmatter is not a `!` start line: %s\n' "$line"; bad=1;;
    esac
  fi
  return "$bad"
}

# ---- (a) THE SHIPPED FILE CONFORMS.
while IFS= read -r why; do
  [ -n "$why" ] || continue
  fails+=("(a) $SKILL carries conduct again — $why. The Harness owns this workflow and executes its Acts; a sentence addressed to the session is an Act handed back to the model. Put the content where the component that executes it lives.")
done < <(verdict "$root" || true)

# ---- (b) THE CHECK DISCRIMINATES — asserted, never assumed. A check that
# accepted everything would read exactly like a clean tree here, because this
# member's failure mode is silence: nothing else in the suite looks at this
# file at all.
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/$(dirname "$SKILL")"

plant() { printf '%s' "$1" > "$tmp/$SKILL"; }

# b1 — the conforming shape passes.
plant '---
name: terrain
description: d
---
!node src/terrain.mjs run
'
if ! verdict "$tmp" >/dev/null 2>&1; then
  fails+=("(b1) THE CHECK REFUSES A CONFORMING FILE: frontmatter plus one \`!\` line was rejected, so arm (a) passing says nothing about the tree.")
fi

# b2 — one sentence of conduct fails. This is the founding case: it is the
# shape the file held for a month while every surface claimed the Harness ran.
plant '---
name: terrain
description: d
---
!node src/terrain.mjs run

You never retype the runtime output into your reply.
'
if verdict "$tmp" >/dev/null 2>&1; then
  fails+=("(b2) THE CHECK ADMITS CONDUCT: a file carrying a sentence addressed to the session passed, which is the exact defect this member exists to catch.")
fi

# b3 — a blank line alone fails, per L3. Kept separate from b2 so the
# no-tolerance decision is asserted rather than implied by the sentence case.
plant '---
name: terrain
description: d
---
!node src/terrain.mjs run

'
if verdict "$tmp" >/dev/null 2>&1; then
  fails+=("(b3) THE CHECK ADMITS A TRAILING BLANK LINE: L3 declares no tolerance, and an unasserted tolerance is where a paragraph comes back one line at a time.")
fi

# b4 — a start line that is not a start line fails.
plant '---
name: terrain
description: d
---
node src/terrain.mjs run
'
if verdict "$tmp" >/dev/null 2>&1; then
  fails+=("(b4) THE CHECK ADMITS A NON-START LINE: a line that does not begin \`!\` is not run by the harness at invocation, so the Act it names is nobody's.")
fi

# b5 — an absent file fails rather than passing vacuously.
rm -f "$tmp/$SKILL"
if verdict "$tmp" >/dev/null 2>&1; then
  fails+=("(b5) THE CHECK PASSES ON AN ABSENT FILE: a deleted skill and a conforming one would be indistinguishable.")
fi

if [ ${#fails[@]} -gt 0 ]; then
  printf 'FAIL check-terrain-skill-is-one-line\n'
  printf '  - %s\n' "${fails[@]}"
  exit 1
fi
printf 'ok: check-terrain-skill-is-one-line — %s is frontmatter plus one `!` start line; discrimination asserted in five directions\n' "$SKILL"
