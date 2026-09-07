#!/usr/bin/env bash
# Is this change licensed by a named issue? (specs/SPEC.md §4, responsibility
# clause.) The predicate the `license-assertion` CI job runs — extracted from
# the workflow so it can be exercised by cases rather than only by pushing.
#
# THE PREDICATE, in the order it is evaluated:
#
#   1. On a `push` whose changed paths are ALL under `policy/emissions/` and
#      ALL of status A or M, and there is at least one such path: LICENSED,
#      with no issue named.
#   2. Otherwise: licensed iff `#<digits>` occurs in the message.
#
# WHY ARM 1 EXISTS (kogaki#905). CLAUDE.md states the emission duty as
# unconditional and as ONE act with producing the learning: a sitting that
# produces a durable learning writes its staging candidate in the same sitting,
# unasked. The commit that lands it names no issue because there is none — an
# emission is a by-product of whatever the sitting was doing, not a deliverable
# an issue licensed. Arm 2 alone therefore refuses a commit the project
# requires, and the default branch goes red on a duty being discharged
# correctly.
#
# WHY THE EXEMPTION READS A STATUS AND NOT ONLY A PATH (kogaki#977). The
# rationale above argues the CREATION case and reaches no further: writing an
# emission is a by-product, so it names no issue. Removing one is not a
# by-product of anything — it is a deliberate act on a staging candidate, and
# it is exactly the shape a licence is for. A path list without statuses cannot
# tell the two apart, so a push that deleted every file under
# `policy/emissions/` and named no issue claimed an exemption argued only for
# the opposite direction. The exempt statuses are therefore A and M, and every
# other status — D, R, C, T — falls through to arm 2, where a removal is
# licensed the way ordinary work is.
#
# WHY THE INPUT FORMAT IS `--name-status` AND A BARE PATH IS REFUSED. Admitting
# both forms would leave a line with no status to be read as something, and the
# only safe reading is "not exempt" — at which point the bare form buys nothing
# and costs a second format whose blind spot is the very one this arm closes. A
# statusless line is counted as foreign, so a caller that passes the old
# `--name-only` output gets a fail-closed refusal naming the format, never a
# silent exemption.
#
# WHY IT IS KEYED ON PATHS AND NOT ON THE MESSAGE. Owner selection on kogaki#905,
# 2026-09-07, against the served position:
#
#   "A duty triggered by recognising vocabulary inherits every cost and every
#    blind spot of the term list it silently depends on, while a duty triggered
#    by an act needs no enumeration, fires whatever words are present, and stays
#    affordable exactly when the act is rare; so when writing a rule, check
#    whether its trigger names something the agent does or something it must
#    recognise."
#   consulted: product-lab@32852644ba503e9fa904280f386c61f3de32e667 LESSONS.md:18
#
# The declined alternative was a standing carrier issue every emission names.
# That trigger is a number an author types, so it is claimed by writing the
# right words; this one is claimed only by actually confining the commit to
# `policy/emissions/`, which is the act the exemption is for. The status read
# above is the same principle one level in: A and M name what the author DID to
# the file, not what they called it.
#
# WHY THE EXEMPTION IS "ALL PATHS" AND NOT "ANY PATH". A commit that touches an
# emission AND a source file is an ordinary change carrying an emission along,
# and it owes its licence. `any` would make the exemption claimable by adding an
# emission file to any commit, which is arm 2's defect in a new place.
#
# WHY AN EMPTY PATH SET IS NOT EXEMPT. "Every path matches" is vacuously true of
# no paths, so an empty set would be exempted by an accident of quantifier
# rather than by a decision. It is also what a merge commit reads as under
# `git diff-tree` without `-m`, and a merge is exactly the change that must
# carry a licence. Empty falls through to arm 2, which is fail-closed.
#
# WHAT THIS DOES NOT VERIFY, stated rather than left to look covered: that the
# issue named in arm 2 is open, is real, or licenses THIS change. Arm 2 matches
# `#<digits>` anywhere in the message, so a number in ordinary prose satisfies
# it — a known weakness of the gate, unchanged here because narrowing it is a
# different decision from kogaki#905's and would turn commits red that pass
# today. `specs/spec-implementation-license/SPEC.md`'s actor-level deny is the
# layer that checks the issue itself; this is the CI tripwire beneath it.
set -euo pipefail

event=""
message=""
paths_file=""

die() { echo "assert-licensed: $*" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --event)      [[ $# -ge 2 ]] || die "--event needs a value";      event="$2";      shift 2 ;;
    --message)    [[ $# -ge 2 ]] || die "--message needs a value";    message="$2";    shift 2 ;;
    --paths-file) [[ $# -ge 2 ]] || die "--paths-file needs a value"; paths_file="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,76p' "$0" | sed 's/^# \?//'
      exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

[[ -n "$event" ]] || die "--event is required (push | pull_request)"

# Arm 1 — the emission exemption. Only on `push`: a pull request carries its
# licence in its title and body, which arm 2 already reads, and exempting a PR
# would remove the licence from a surface a human reviews.
if [[ "$event" == "push" && -n "$paths_file" ]]; then
  # `-e` and not `-f`, so a process substitution reaches the predicate
  # (kogaki#977). `--paths-file <(git diff-tree ...)` is how a person checks by
  # hand what the gate will do before pushing, and `-f` is false for a fifo, so
  # the obvious invocation died at exit 2 with the gate itself never consulted.
  # The read below is single-pass, which is all a fifo affords.
  [[ -e "$paths_file" ]] || die "--paths-file does not exist: $paths_file"
  [[ -r "$paths_file" ]] || die "--paths-file is not readable: $paths_file"

  n_paths=0
  n_foreign=0
  first_foreign=""
  first_foreign_why=""
  note_foreign() {
    n_foreign=$((n_foreign + 1))
    if [[ -z "$first_foreign_why" ]]; then
      first_foreign="$1"
      first_foreign_why="$2"
    fi
  }

  # Lines are `<status>\t<path>` — `git diff-tree --name-status`. A rename or
  # copy carries a second path after a second tab; its status is not exempt, so
  # the trailing field is never needed and is not split out.
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    n_paths=$((n_paths + 1))

    status="${line%%$'\t'*}"
    path="${line#*$'\t'}"

    if [[ "$status" == "$line" ]]; then
      note_foreign "$line" "carries no status field — the caller passed --name-only output where --name-status is required"
      continue
    fi
    if [[ "$path" != policy/emissions/* ]]; then
      note_foreign "$path" "is outside policy/emissions/"
      continue
    fi
    if [[ "$status" != "A" && "$status" != "M" ]]; then
      note_foreign "$path" "is status $status — the exemption covers A and M only, because it argues the writing of an emission and not its removal"
      continue
    fi
  done < "$paths_file"

  if (( n_paths > 0 && n_foreign == 0 )); then
    echo "ok: emission — all $n_paths changed path(s) are added or modified under policy/emissions/, which names no licensing issue by construction (kogaki#905)"
    exit 0
  fi
fi

# Arm 2 — unchanged from the gate's original form.
if printf '%s' "$message" | grep -qE '#[0-9]+'; then
  if [[ "$event" == "pull_request" ]]; then
    where="PR title/body/commits"
  else
    where="the pushed head commit"
  fi
  printf 'ok: licensing issue named — gate checked: #N present in %s\n' "$where"
  exit 0
fi

echo "FAIL: no licensing issue named (#N) in title, body, or commits."
echo "A change without a license is refused — deny, never warn; the"
echo "work re-routes to an issue (specs/SPEC.md §4, responsibility clause)."
if [[ "$event" == "push" && -n "$first_foreign_why" ]]; then
  echo
  echo "The emission exemption (kogaki#905, narrowed by kogaki#977) does not apply:"
  echo "  $first_foreign $first_foreign_why"
  echo "A commit carrying an emission alongside other work owes its licence, and so"
  echo "does one that removes an emission rather than writing it."
fi
exit 1
