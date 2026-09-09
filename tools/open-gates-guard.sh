#!/usr/bin/env bash
# NO CHECK WRITES INTO THE LIVE OPEN-GATE DIRECTORY (kogaki#1028 item 5).
#
# Sourced — never executed — by any check that starts the Terrain executor.
#
# WHAT WENT WRONG. `~/.claude/kogaki-open-gates/` held 858 pointers on
# 2026-09-09, every one of them for the tag gate. They were not abandoned owner
# runs: they were the check suite, which starts the executor to drive its cases
# and inherits the executor's default pointer directory when nothing redirects
# it. Each raising minted a pointer in the owner's live directory. That
# directory is now load-bearing — `.claude/hooks/gate-open-terrain-gate.py`
# denies every tool call while a pointer for the session is open — so a suite
# writing into it is a suite that can freeze the session that ran it.
#
# WHY A REFUSAL RATHER THAN A DEFAULT. Defaulting the variable here would make
# the check pass while the next check to start the executor, written by someone
# who never read this file, wrote into the live directory again. The refusal is
# what makes the requirement visible at the moment it is not met. The runner
# (`tools/run-registered-checks.sh`) provides a per-run temporary directory, so
# the suite is unaffected and only a check run BY HAND without one refuses —
# which is the case that was writing the pointers.
#
# IT REFUSES ON THE LIVE DIRECTORY TOO. Setting the variable to the default path
# satisfies the letter and defeats the point, so that spelling is named and
# refused.

kogaki_open_gates_guard() {
  local live="${HOME}/.claude/kogaki-open-gates"
  if [[ -z "${KOGAKI_OPEN_GATES:-}" ]]; then
    echo "REFUSED: KOGAKI_OPEN_GATES is not set, and this check starts the Terrain executor (kogaki#1028)." >&2
    echo "  Without it the executor mints open-gate pointers in ${live}, the directory" >&2
    echo "  .claude/hooks/gate-open-terrain-gate.py gates a live session on — 858 of them were" >&2
    echo "  minted this way before this guard existed." >&2
    echo "  Recovery: run the suite through tools/run-registered-checks.sh, which supplies a" >&2
    echo "  per-run directory, or export KOGAKI_OPEN_GATES=\"\$(mktemp -d)\" before this check." >&2
    return 1
  fi
  if [[ "$(cd "${KOGAKI_OPEN_GATES}" 2>/dev/null && pwd -P || echo "${KOGAKI_OPEN_GATES}")" == "$(cd "${live}" 2>/dev/null && pwd -P || echo "${live}")" ]]; then
    echo "REFUSED: KOGAKI_OPEN_GATES points at the LIVE open-gate directory ${live} (kogaki#1028)." >&2
    echo "  Setting it to the default satisfies the letter of the guard and defeats it." >&2
    echo "  Recovery: export KOGAKI_OPEN_GATES=\"\$(mktemp -d)\"." >&2
    return 1
  fi
  return 0
}
