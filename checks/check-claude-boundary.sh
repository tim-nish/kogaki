#!/usr/bin/env bash
# The `.claude` tracking boundary (kogaki#618, consequence 3 of kogaki#615).
#
# WHAT THIS CATCHES, AND WHY A CHECK RATHER THAN THE GITIGNORE ALONE. The
# default-deny block in `.gitignore` is the generator fix: it removes the way a
# private harness path ordinarily re-enters tracking. It does not close the
# class, because `git add -f` bypasses gitignore entirely, and an agent under
# instruction to land a file will reach for `-f`. So the ignore rules remove
# the generator and this check catches the bypass — the enumerated layer
# beneath a construction constraint, which is where an enumerated instrument
# belongs (`constrain-generation-not-post-hoc-detection`).
#
# THE ASSERTION IS A SUBSET RELATION, not a file list: every path in
# `git ls-files '.claude/*'` must carry a `!` re-include line in `.gitignore`.
# A list would need editing on every legitimate admission and would drift; the
# relation holds for admissions nobody has made yet. Adding a path to the
# allowlist is the deliberate act that admits it, and the allowlist is where
# its public-need argument is written — so this check asserts that no path is
# tracked whose admission was never argued.
#
# IT CANNOT LEAK A PRIVATE FILENAME, stated because a boundary guard that
# printed one would be the defect it exists to prevent. Both sides of the
# comparison are already public by construction: a tracked path is in the tree,
# and the allowlist is in `.gitignore`. A path that is neither is never read.
#
# WHAT IT DOES NOT VERIFY, stated rather than left to look covered: that a
# re-include's public-need argument is TRUE, or that the path still has the
# reader its comment names. Both are judgment and stay with review — the same
# split `authenticate-facts-mechanically-gate-judgments` draws. A stale
# argument passes here and is caught by a reader, which is the correct trade:
# a guard nobody can predict is the guard an operator routes around.
set -euo pipefail
cd "$(dirname "$0")/.."

tracked="$(git ls-files '.claude/*' || true)"

if [[ -z "$tracked" ]]; then
  # An empty tracked set satisfies the subset relation vacuously, and says so:
  # "0 tracked paths" and "the check did not run" are different readings, and
  # only a stated zero distinguishes them.
  echo "ok: the .claude boundary holds — 0 tracked paths, so the subset relation is satisfied vacuously"
  exit 0
fi

violations=()
while IFS= read -r path; do
  [[ -z "$path" ]] && continue
  # The allowlist line is `!<path>` anchored whole, ignoring leading spaces and
  # trailing whitespace. Anchored so a re-include of a DIRECTORY (`!.claude/`)
  # cannot stand in for one of a file — the argument is owed per admitted path.
  if ! grep -qE "^[[:space:]]*!${path//./\\.}[[:space:]]*$" .gitignore; then
    violations+=("$path")
  fi
done <<< "$tracked"

if (( ${#violations[@]} )); then
  echo "FAIL: ${#violations[@]} tracked .claude path(s) carry no re-include in .gitignore."
  echo
  for v in "${violations[@]}"; do echo "  $v"; done
  echo
  echo "Every tracked path under .claude/ is an admission, and the allowlist is"
  echo "where its public-need argument is written (kogaki#615). A path reaching"
  echo "the index without one arrived through \`git add -f\`, which bypasses the"
  echo "ignore rules — the bypass this check exists to catch."
  echo
  echo "Repair, whichever is true:"
  echo "  - the path IS needed publicly -> add \`!<path>\` to .gitignore with the"
  echo "    reader or contract that makes it public, per the criterion there"
  echo "    (a path stays tracked when this repository's own verification"
  echo "    cannot run without it);"
  echo "  - it is not -> \`git rm --cached <path>\`; the file stays on disk."
  exit 1
fi

count=$(wc -l <<< "$tracked")
echo "ok: the .claude boundary holds — all $count tracked path(s) carry a re-include in .gitignore"
