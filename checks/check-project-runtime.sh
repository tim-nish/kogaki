#!/usr/bin/env bash
# The /project runtime's fixture pass (kogaki#1149).
#
# A THIN INVOKER, HOLDING NO ASSERTIONS OF ITS OWN — the arrangement
# check-draft-runtime.sh and check-review-draft-runtime.sh both use, and for
# the same reason: the cases are functions of the runtime's own refusal
# surfaces and belong beside it, in `src/project.mjs --self-test`, driving it
# end to end under a temp directory. Seam-free by construction: no gateway, no
# network, no home-directory write, and `--workspace` keeps it off this
# repository's own `runs/project/`.
#
# WHAT THE PASS ASSERTS (kogaki#1149's acceptance items, enumerated in the
# runtime): a valid fixture's `run` writes an Article whose frontmatter carries
# exactly the profile's keys with `published: false` and a byte-identical
# body; `run` refuses on `draft.md`, on a reviewed Draft with no `review.md`
# beside it, on a `projection.md` missing a required field, over a tag count
# or tag shape, or over a title's cap, naming the field each time and
# inventing no value; `verify` passes on a fresh Article and refuses after a
# one-byte edit; one profile carries a reversible converter, proven on its own
# fixture; a re-run over a moved Draft overwrites the Article and says so; and
# `propose` renders its schema with nothing piped in, records a valid reply,
# and refuses a reply missing a field or over a cap.
#
# NOT CARRIED HERE, stated rather than implied: any judgment about a Title's
# or Description's WORDING — the Harness owns only that they exist and fit,
# never their content (owner amendment 2026-09-18).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

echo "== project runtime fixture pass (kogaki#1149)"

OUT=$(node src/project.mjs --self-test 2>&1); RC=$?
printf '%s\n' "$OUT"
if [[ $RC -ne 0 ]] || ! grep -q "project self-test:" <<<"$OUT"; then
  echo "FAIL: the runtime's fixture pass did not run clean — the cases live with the runtime and this member only invokes them"
  exit 1
fi

# THE FLOOR IS READ FROM THE REGISTRY, never hardcoded here (kogaki#661).
FLOOR=$(python3 -c "
import json
d = json.load(open('checks/registry.json'))
print(next(m['admission']['case_floor'] for m in d['checks'] if m['id'] == 'project-runtime'))
") || { echo "FAIL: could not read case_floor for project-runtime from checks/registry.json"; exit 1; }
N=$(sed -n 's/^project self-test: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
if [[ -z "$N" ]]; then
  echo "FAIL: no case count readable from the pass's output — an unreadable floor is not a pass"
  exit 1
fi
if (( N < FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were LOST rather than broken, and this member would otherwise report their absence as evidence (kogaki#661)"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the fixture pass reported $N case(s) against a declared case_floor of $FLOOR — cases were ADDED and the floor was not advanced in the same act, so the ratchet is $((N - FLOOR)) behind and cannot see a case deleted inside that gap (kogaki#970). Set case_floor to $N for 'project-runtime' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: project runtime fixture pass ran ${N} case(s) clean, exactly at its declared floor of ${FLOOR}"

# --- THE SKILL NAMES ONLY PATHS AND SUBCOMMANDS THE HARNESS HAS (kogaki#812
# widened to /project by kogaki#1149), the same assertion check-draft-
# runtime.sh carries for its own skill and check-brief-entry.sh for its own.
SKILL=".claude/skills/project/SKILL.md"
if [[ ! -f "$SKILL" ]]; then
  echo "FAIL: $SKILL is missing — it is tracked (kogaki#1149, on kogaki#812's public-need criterion) and this member asserts against it, so its absence is a defect rather than a skip"
  exit 1
fi

NAMED_PATHS=$(grep -oE '[A-Za-z0-9_./-]*project\.mjs' "$SKILL" | sort -u)
BAD_PATH=0
while read -r pth; do
  [[ -z "$pth" ]] && continue
  if [[ ! -f "$pth" ]]; then
    echo "FAIL: $SKILL names '$pth', which does not exist — a skill naming a removed entry point is the kogaki#765 rename-sweep miss, and this member is what makes it loud"
    BAD_PATH=1
  fi
done < <(printf '%s\n' "$NAMED_PATHS")
(( BAD_PATH == 0 )) || exit 1

if [[ -z "$NAMED_PATHS" ]]; then
  echo "FAIL: $SKILL names no '<path>/project.mjs' at all, so the path arm asserted nothing — a check that passes vacuously on an empty subject is the fixture-too-small class this member's own preamble already names"
  exit 1
fi

# Every subcommand the skill invokes must be one the Harness dispatches.
DISPATCHED=$(grep -oE '^ *case "[a-z]+":' src/project.mjs | sed 's/.*"\([a-z]*\)".*/\1/' | sort -u)
NAMED_CMDS=$(grep -oE 'project\.mjs +[a-z]+' "$SKILL" | awk '{print $2}' | sort -u)
BAD_CMD=0
while read -r sub; do
  [[ -z "$sub" ]] && continue
  if ! grep -qx "$sub" <<<"$DISPATCHED"; then
    echo "FAIL: $SKILL invokes 'project.mjs $sub', which the Harness does not dispatch (it has: $(tr '\n' ' ' <<<"$DISPATCHED"))"
    BAD_CMD=1
  fi
done < <(printf '%s\n' "$NAMED_CMDS")
(( BAD_CMD == 0 )) || exit 1

# MUTUAL COVERAGE, the same both-directions rule check-draft-runtime.sh states
# (kogaki#815 round 1, finding 2): every subcommand the Harness dispatches
# must also be named by the skill, so a re-spelling that silently empties one
# side fails on the subcommand it hid rather than passing vacuously.
MISSING_CMD=0
while read -r sub; do
  [[ -z "$sub" ]] && continue
  if ! grep -qx "$sub" <<<"$NAMED_CMDS"; then
    echo "FAIL: the Harness dispatches 'project.mjs $sub' and $SKILL does not name it -- either the skill has drifted behind the entry points it exists to name, or its invocation form changed and this arm can no longer read it"
    MISSING_CMD=1
  fi
done <<<"$DISPATCHED"
(( MISSING_CMD == 0 )) || exit 1

echo "ok: the project skill names every subcommand the Harness dispatches, and only paths and subcommands that exist"

exit 0
