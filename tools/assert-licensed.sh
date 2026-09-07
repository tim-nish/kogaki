#!/usr/bin/env bash
# Is this change licensed by a named issue? (specs/SPEC.md §4, responsibility
# clause.) The predicate the `license-assertion` CI job runs — extracted from
# the workflow so it can be exercised by cases rather than only by pushing.
#
# THE PREDICATE, in the order it is evaluated:
#
#   1. On a `push` whose changed paths are ALL under `policy/emissions/`, and
#      there is at least one such path: LICENSED, with no issue named.
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
# `policy/emissions/`, which is the act the exemption is for.
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
      sed -n '2,60p' "$0" | sed 's/^# \?//'
      exit 0 ;;
    *) die "unknown argument: $1" ;;
  esac
done

[[ -n "$event" ]] || die "--event is required (push | pull_request)"

# Arm 1 — the emission exemption. Only on `push`: a pull request carries its
# licence in its title and body, which arm 2 already reads, and exempting a PR
# would remove the licence from a surface a human reviews.
if [[ "$event" == "push" && -n "$paths_file" ]]; then
  [[ -f "$paths_file" ]] || die "--paths-file does not exist: $paths_file"

  n_paths=0
  n_foreign=0
  first_foreign=""
  while IFS= read -r path; do
    [[ -z "$path" ]] && continue
    n_paths=$((n_paths + 1))
    if [[ "$path" != policy/emissions/* ]]; then
      n_foreign=$((n_foreign + 1))
      [[ -z "$first_foreign" ]] && first_foreign="$path"
    fi
  done < "$paths_file"

  if (( n_paths > 0 && n_foreign == 0 )); then
    echo "ok: emission — all $n_paths changed path(s) are under policy/emissions/, which names no licensing issue by construction (kogaki#905)"
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
if [[ "$event" == "push" && -n "$first_foreign" ]]; then
  echo
  echo "The emission exemption (kogaki#905) does not apply: this commit changes"
  echo "at least one path outside policy/emissions/ — $first_foreign"
  echo "A commit carrying an emission alongside other work owes its licence."
fi
exit 1
