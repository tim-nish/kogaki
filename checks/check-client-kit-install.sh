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
cd "$(dirname "$0")/.."

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
# RE-SCOPED under kogaki#615 (owner untrack ruling 2026-08-22): the installed
# copy is a machine-local INSTALL ARTIFACT and no longer tracked, so its
# absence is the expected state of a fresh clone rather than the divergence
# this check guards. The absence is STATED, never a silent skip — the
# comparison ran over 0 pairs and says so. Where the install IS present, the
# byte-equality assertion below runs unchanged, which is the only state in
# which a divergence can exist at all.
#
# Why an absence and not a re-include: the allowlist's public-need criterion
# (.gitignore) admits a path when this repository's own verification cannot run
# without it. Here it can — an absent install has nothing to diverge from, so
# the property is vacuous rather than unverifiable. That is the line dividing
# this check from check-brief-entry and check-terrain-composition, whose
# assertions have no meaning without their file and whose paths are therefore
# re-included.
if [[ ! -f "$INSTALLED" ]]; then
  echo "client-kit-install: $INSTALLED is not installed in this working copy —"
  echo "  a machine-local install artifact (kogaki#615). The source/installed"
  echo "  byte-equality assertion compared 0 pairs here; an absent install"
  echo "  cannot diverge. This is a stated absence, not a pass over a"
  echo "  comparison that ran."
  exit 0
fi
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
