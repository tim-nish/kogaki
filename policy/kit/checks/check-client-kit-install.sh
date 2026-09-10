#!/usr/bin/env bash
# Runs the client kit's own install test as a registered check, so the kit's
# guarantees fire in CI rather than only when someone remembers to run them.
# The kit test is cwd-independent (it resolves its own directory). kogaki#9,
# story 1.4.
#
# THIS MEMBER HOLDS ASSERTIONS OF ITS OWN, and that is a change of shape
# recorded rather than slipped in (kogaki#285). It previously declared itself
# "a thin invoker and holds no assertions of its own — the assertions belong to
# the kit and stay there", and that sentence was correct until an assertion
# existed that the kit's own test STRUCTURALLY CANNOT make.
#
# Why the kit's test cannot make them: `policy/kit/test/install-test.sh`
# installs from the kit into a fresh `mktemp -d` and asserts over the RESULT.
# The installed skill there is a byte-for-byte `cp` of the source by
# construction, so every assertion about it passes identically whether or not
# THIS repository's installed copy has drifted, and the temp repo is not a git
# repository at all, so nothing there can observe what this tree TRACKS.
#
# The alternative siting was considered and is worse: putting the comparison
# inside the kit's test would make a PORTABLE KIT TEST assert about its host
# consumer's tree, which breaks exactly when the kit separates into its own
# repository — this member's own removal signal.
set -euo pipefail
# REPO ROOT, RESOLVED BY GIT RATHER THAN BY DEPTH (kogaki#724). This check is
# kit-held, so a `dirname "$0"/..` hop would bind it to one directory depth
# and break the moment the kit sits anywhere but one level below the root.
#
# ANCHORED AT THE SCRIPT, NOT THE CALLER. A bare `git rev-parse
# --show-toplevel` resolves from the CWD, which would trade a depth
# assumption for a worse one: invoked from inside another repository it
# would resolve THAT repository's root and check the wrong tree. `git -C
# "$(dirname "$0")"` keeps the script-relative anchor the old hop had, while
# dropping the fixed depth — the property being repaired, and nothing wider.
#
# WHAT THIS DOES NOT BUY, stated because the narrower claim is the true one:
# kit material below is still addressed at the conventional `policy/kit/`
# path, so this makes the check depth-independent and NOT free of the kit's
# own location convention.
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" || {
  echo "FAIL: cannot resolve the repository root from this script's location"
  exit 1
}

# --- The installed copy is NOT TRACKED, and where it exists it has not drifted.
#
# `policy/kit/install.sh` copies the source over the installed copy, so the
# SOURCE IS AUTHORITATIVE and the installed copy is derived. A divergence is
# therefore not a merge conflict waiting to happen; it is a pending silent
# DELETION of whichever side is not the source, at the next install.
#
# Observed: PR #279 edited the installed copy only. Every registered check
# passed, the pair sat divergent on master for a day, and the repair was by
# hand (PR #284). The next `install.sh` run would have deleted that PR's
# `--disposition` documentation and restored a sentence it had made false.
#
# TWO ASSERTIONS, AND THE FIRST IS THE ONE THAT CLOSES THAT ROUTE (kogaki#725).
# The byte-equality assertion alone was a detector for a divergence the tree
# ADMITTED: a tracked derived file can be edited on a branch and committed, and
# the check's whole job was to notice. Untracking the copy makes that
# commit unreachable instead — there is no committed copy left to diverge — so
# the load-bearing assertion is now that the file is untracked, and byte
# equality is what remains observable on a machine where an install has run.
#
# THE SECOND ASSERTION IS CONDITIONAL, AND SAYS SO RATHER THAN PASSING
# VACUOUSLY. A fresh clone carries no installed copy until `install.sh` runs, so
# in CI the comparison has no second operand. An `ok:` line there would report a
# comparison that never happened, which is precisely the shape kogaki#285 was
# filed over — a passing check blind to the only file that can drift. The
# `inapplicable:` line names the absence and what would make it applicable.
SOURCE=policy/kit/skills/consult-first.md
INSTALLED=.claude/skills/consult-first/SKILL.md

if git ls-files --error-unmatch "$INSTALLED" >/dev/null 2>&1; then
  echo "FAIL: the consult-first INSTALLED COPY is tracked."
  echo
  echo "  source (AUTHORITATIVE):   $SOURCE"
  echo "  installed copy (DERIVED): $INSTALLED  <- tracked, and must not be"
  echo
  echo "The installed copy is written by \`policy/kit/install.sh\` step 4c on every"
  echo "run. Committed, it is an undeclared duplicate of a centrally-managed"
  echo "artifact: the two drift, and the divergence is attributed to this"
  echo "repository's environment rather than to the stale copy. Repair:"
  echo
  echo "  git rm --cached $INSTALLED"
  echo
  echo "and confirm .gitignore carries the path (step 4c adds it)."
  exit 1
fi

if [ ! -e "$INSTALLED" ]; then
  echo "inapplicable: no installed copy at $INSTALLED, so source-vs-copy equality has"
  echo "              no second operand. This is the ordinary state of a fresh clone —"
  echo "              the copy arrives with \`policy/kit/install.sh\`, and the assertion"
  echo "              above (that it is never tracked) held and is what CI can observe."
elif ! cmp -s "$SOURCE" "$INSTALLED"; then
  echo "FAIL: the consult-first kit SOURCE and this machine's INSTALLED COPY have diverged."
  echo
  echo "  source (AUTHORITATIVE):   $SOURCE"
  echo "  installed copy (DERIVED): $INSTALLED"
  echo
  echo "\`policy/kit/install.sh\` copies source -> installed copy, so the next"
  echo "install SILENTLY OVERWRITES the installed copy. Repair the SOURCE if the"
  echo "change is wanted, then re-run the installer; repairing only the copy"
  echo "loses the edit at the next install."
  echo
  echo "diff (source -> installed copy):"
  diff -u "$SOURCE" "$INSTALLED" || true
  exit 1
else
  echo "ok: the consult-first kit source and this machine's installed copy are byte-identical"
fi
echo "ok: the consult-first installed copy is not tracked (the install is its only delivery)"

exec bash policy/kit/test/install-test.sh
