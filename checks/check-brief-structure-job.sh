#!/usr/bin/env bash
# check-brief-structure-job — the structure read as a Detached Job, one unit
# per reading (kogaki#1833), and the Thesis question ordered by agreement.
# The cases are checks/fixtures/brief-structure-job/check.mjs.
set -u
cd "$(dirname "$0")/.."

# FIXTURE ISOLATION, as checks/check-brief-path-review-job.sh: the Thesis gate the
# run reaches opens under a fixture session id and scratch directories, never in
# the session running this check.
live_gates="${KOGAKI_OPEN_GATES:-$HOME/.claude/kogaki-open-gates}"
iso="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-structjob-iso-XXXXXX")"
trap 'rm -rf "$iso"' EXIT
export KOGAKI_OPEN_GATES="$iso/open-gates"
export GATE_DECLARATION_SIDECAR_DIR="$iso/gate-declarations"
export CLAUDE_CODE_SESSION_ID="check-brief-structure-job-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node checks/fixtures/brief-structure-job/check.mjs
rc=$?
if grep -rls "$CLAUDE_CODE_SESSION_ID" "$live_gates" >/dev/null 2>&1; then
  echo "FAIL a gate pointer naming the fixture session reached $live_gates"
  rc=1
fi
exit $rc
