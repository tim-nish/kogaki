#!/usr/bin/env bash
# The review trigger's event-adapter contract (kogaki#65 defect 4).
#
# WHAT THIS CATCHES, NAMED RATHER THAN GENERAL. The hook converts one tool
# event into sweep invocations. It used to extract the PR number with
# `re.search(r"/pull/(\d+)", ...)` — FIRST MATCH ONLY — so a single Bash call
# creating two pull requests fired the sweep once, for the first, and the
# second was never reviewed. That happened: PRs #63 and #64 were created in
# one invocation, `~/.kogaki/review-trigger.log` holds `--pr 62` and `--pr 63`
# and no `--pr 64` line at any position, and #64 reached the presence gate
# unreviewed.
#
# WHY IT IS A CHECK AND NOT A COMMENT. The defect was invisible for exactly as
# long as its contract lived in prose, and the same repository has now filed
# that shape twice in one week (kogaki#54's swallowed degrade line, and this).
# A hook fires on every Bash call, so the fixture cannot run inside it without
# paying latency on every tool use — it runs behind `--self-test` and this
# check is what invokes it. A test nothing invokes is the orphan-guard shape
# kogaki#6 was filed to end.
#
# WHAT IT DOES NOT VERIFY, STATED RATHER THAN LEFT TO LOOK COVERED: that the
# hook is REGISTERED in .claude/settings.json, that the harness actually fires
# it, and that the sweep it spawns does anything useful. Those are the
# occasions rather than the logic, and no fixture over a pure function can
# reach them — the presence gate remains the backstop that does.
set -euo pipefail
cd "$(dirname "$0")/.."

HOOK=".claude/hooks/review-trigger.py"

if [[ ! -f "$HOOK" ]]; then
  echo "FAIL: $HOOK does not exist — the trigger this check covers is absent,"
  echo "  which is a stronger failure than a fixture mismatch, not a skip."
  exit 1
fi

# The extraction must be reachable and exercised. A regression that inlined it
# back into main() would make the self-test pass over dead code, so assert the
# call site too — the fixture proves the FUNCTION, this proves it is the one
# main() uses.
grep -q 'prs = pr_numbers(data.get("tool_response"))' "$HOOK" || {
  echo "FAIL: main() does not extract PR numbers through pr_numbers()."
  echo "  The fixture below would then be exercising a function nothing calls."
  exit 1
}

# The stdin closure is the other half of the same issue (defect 2): the
# spawned sessions' prompts were contaminated by an inherited descriptor.
grep -q 'stdin=subprocess.DEVNULL' "$HOOK" || {
  echo "FAIL: the hook's Popen does not close stdin (kogaki#65 defect 2)."
  echo "  An inherited descriptor is what carried this repository's own driver"
  echo "  source into the spawned reviewers' prompts."
  exit 1
}

python3 "$HOOK" --self-test
echo "ok: review trigger fires once per created PR, and closes stdin"
