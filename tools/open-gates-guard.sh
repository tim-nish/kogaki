#!/usr/bin/env bash
# NO CHECK WRITES INTO A LIVE DIRECTORY THE EXECUTOR MINTS INTO (kogaki#1028
# item 5; widened to the gate-declaration sidecar at kogaki#1153).
#
# Sourced — never executed — by any check that starts the Terrain executor.
#
# THERE ARE TWO SUCH DIRECTORIES, AND THE SECOND JOINED BY THE SAME ROUTE.
# `emitGateDeclaration` writes an open-gate pointer AND, since kogaki#1153, a
# gate-declaration sidecar at `~/.claude/gate-declarations/<session_id>.json`.
# Both are keyed by the session, both default to the owner's live directory
# when nothing redirects them, and both are read by a hook that gates a live
# session — so a suite that starts the executor can write a `mechanical`
# declaration into the invoking session's own primary carrier, satisfying a
# gate check whose whole subject is that the SESSION declares.
#
# THE GUARD IS WIDENED RATHER THAN DUPLICATED, and that is the point: a rule
# rebuilt once per place it has just failed grows the list of covered places
# while the gap stays open. One function, called by every check that starts
# the executor, is the carrier both directories reach through.
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

  # THE SIDECAR HALF (kogaki#1153), refused on exactly the two spellings the
  # pointer half is: unset, and the live directory named explicitly.
  local live_decl="${HOME}/.claude/gate-declarations"
  if [[ -z "${GATE_DECLARATION_SIDECAR_DIR:-}" ]]; then
    echo "REFUSED: GATE_DECLARATION_SIDECAR_DIR is not set, and this check starts the Terrain executor (kogaki#1153)." >&2
    echo "  Without it the executor writes a gate-declaration sidecar into ${live_decl}," >&2
    echo "  the directory .claude/hooks/lint-gate-declaration.py reads as its PRIMARY carrier —" >&2
    echo "  so the suite would declare a gate on behalf of the session that ran it." >&2
    echo "  Recovery: run the suite through tools/run-registered-checks.sh, which supplies a" >&2
    echo "  per-run directory, or export GATE_DECLARATION_SIDECAR_DIR=\"\$(mktemp -d)\" before this check." >&2
    return 1
  fi
  if [[ "$(cd "${GATE_DECLARATION_SIDECAR_DIR}" 2>/dev/null && pwd -P || echo "${GATE_DECLARATION_SIDECAR_DIR}")" == "$(cd "${live_decl}" 2>/dev/null && pwd -P || echo "${live_decl}")" ]]; then
    echo "REFUSED: GATE_DECLARATION_SIDECAR_DIR points at the LIVE sidecar directory ${live_decl} (kogaki#1153)." >&2
    echo "  Setting it to the default satisfies the letter of the guard and defeats it." >&2
    echo "  Recovery: export GATE_DECLARATION_SIDECAR_DIR=\"\$(mktemp -d)\"." >&2
    return 1
  fi
  return 0
}
