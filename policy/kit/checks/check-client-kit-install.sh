#!/usr/bin/env bash
# Runs the client kit's own install test as a registered check, so the kit's
# guarantees fire in CI rather than only when someone remembers to run them.
# The kit test is cwd-independent (it resolves its own directory). kogaki#9,
# story 1.4.
#
# THIS MEMBER HOLDS ONE ASSERTION OF ITS OWN, and that is a change of shape
# recorded rather than slipped in (kogaki#285). It previously declared itself
# "a thin invoker and holds no assertions of its own — the assertions belong to
# the kit and stay there", and that sentence was correct until an assertion
# existed that the kit's own test STRUCTURALLY CANNOT make.
#
# Why the kit's test cannot make it: `policy/kit/test/install-test.sh` installs
# from the kit into a fresh `mktemp -d` and asserts over the RESULT. The
# installed skill there is a byte-for-byte `cp` of the source by construction,
# so every assertion about it passes identically whether or not THIS
# repository's committed installed copy has drifted. The test is blind to the
# only file that can drift.
#
# The alternative siting was considered and is worse: putting the comparison
# inside the kit's test would make a PORTABLE KIT TEST assert about its host
# consumer's tree, which breaks exactly when the kit separates into its own
# repository — this member's own removal signal.
set -euo pipefail
# REPO ROOT, RESOLVED BY GIT RATHER THAN BY DEPTH (kogaki#724). This check is
# kit-held and a consumer may vendor the kit at a path of its own choosing, so
# a `dirname "$0"/..` hop would bind the file to one layout. `--show-toplevel`
# is depth-independent and is the only resolution that survives relocation.
cd "$(git rev-parse --show-toplevel)" || {
  echo "FAIL: not inside a git repository — this check resolves the repo root with git"
  exit 1
}

# --- The kit source and this repository's installed copy are byte-identical.
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
SOURCE=policy/kit/skills/consult-first.md
INSTALLED=.claude/skills/consult-first/SKILL.md
if ! cmp -s "$SOURCE" "$INSTALLED"; then
  echo "FAIL: the consult-first kit SOURCE and INSTALLED COPY have diverged."
  echo
  echo "  source (AUTHORITATIVE):  $SOURCE"
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
fi
echo "ok: the consult-first kit source and this repository's installed copy are byte-identical"

exec bash policy/kit/test/install-test.sh
