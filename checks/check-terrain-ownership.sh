#!/usr/bin/env bash
# The Harness-ownership defect class, owned by two checks (kogaki#1031).
#
# THE ONE QUESTION THE OWNERSHIP RULE ASKS IS "WHO EXECUTED THE ACT". Across
# kogaki#17 to #890 every implementation satisfied the words "Harness-
# controlled" while the model drove the workflow: it typed the start command,
# pasted the listing, chose to call the question UI, chose to re-enter. A test
# that asks for a table, or a question, fails on a symptom; this one fails on
# the architecture, in milliseconds, with no integration matrix.
#
#   1. EXECUTOR ATTRIBUTION. Every transition a run record carries names what
#      executed it -- a hook event with its `hook_event_name`, `session_id` and
#      `tool_use_id`, or the harness's skill expansion for the start act -- and
#      the executor refuses to write a transition that has none. Two fixtures:
#      the executor invoked with no hook payload on stdin refuses before any
#      write; the committed golden record (the first live run in which the
#      harness executed every transition, 2026-09-09) carries attribution on
#      every transition. The 2026-09-09 runs before that fix would have failed
#      here on their first transition, because `survey` was executed by a
#      model-typed Bash command with no payload behind it.
#   2. THE EXECUTOR-INVOCATION DENY. Attribution read from stdin is forgeable if
#      the model can run the executor through Bash with a fabricated payload,
#      so the PreToolUse hook that refuses `terrain.mjs run` is driven here over
#      a synthesized Bash payload. Without it the first check is a guard after a
#      model-constructed input, the shape the 2026-09-04 control-input
#      direction forbids.
#
# EACH FIXTURE CARRIES ITS OWN COUNTERFACTUAL (acceptance 2): the golden record
# with one `advanced_by` removed fails; a Bash payload naming `--status`, the
# one read-only verb, is admitted. Nothing else is registered under kogaki#1031:
# the Removal Test and the live run are acceptance and close conditions on the
# implementing issues, and would be the first thing removed for being slow.
set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
cases=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }
pass() { cases=$((cases + 1)); }

DENY=.claude/hooks/gate-terrain-executor.py
GOLD=checks/fixtures/terrain-ownership/golden-run-record.json
started=$(date +%s%N)

# ---- 1a. NO PAYLOAD, NO TRANSITION. The executor is handed an empty stdin and
# a fresh workspace; it must refuse before writing anything into it.
tmp=$(mktemp -d) || { bad "no temp directory — CANNOT-DETERMINE, never a pass"; exit 1; }
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/rd"
out=$(KOGAKI_OPEN_GATES="$tmp/gates" node src/terrain.mjs run --run-dir "$tmp/rd" </dev/null 2>&1); rc=$?
# Pinned to the attribution refusal's own words: any other refusal — an
# unreadable table, an unusable gates directory — is the wrong refusal here.
if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "no hook payload carrying hook_event_name, session_id and tool_use_id was readable on stdin"; then pass; else
  bad "the executor advanced with no hook payload on stdin (rc=$rc): $(printf '%s' "$out" | tail -2 | tr '\n' ' ') — a transition nobody executed is exactly the record the attribution field exists to make impossible"
fi
if [ -z "$(ls -A "$tmp/rd" 2>/dev/null)" ]; then pass; else
  bad "the refused advance still wrote into the workspace: $(ls "$tmp/rd" | tr '\n' ' ')"
fi

# ---- 1b. THE GOLDEN RECORD IS ATTRIBUTED ON EVERY TRANSITION.
attributed() {  # attributed <record path>  -> exit 0 when every transition is attributed
  python3 - "$1" <<'PY'
import json, sys
rec = json.load(open(sys.argv[1]))
ts = rec.get("transitions") or []
if not ts:
    print("no transitions"); sys.exit(1)
for t in ts:
    by = t.get("advanced_by") or {}
    kind = by.get("executor")
    if kind == "hook":
        missing = [k for k in ("hook_event_name", "session_id", "tool_use_id") if not by.get(k)]
        if missing:
            print(f"{t.get('state')}: hook transition missing {missing}"); sys.exit(1)
    elif kind == "skill-expansion":
        if t.get("state") != "survey":
            print(f"{t.get('state')}: skill-expansion may execute only the start act"); sys.exit(1)
    else:
        print(f"{t.get('state')}: executor is {kind!r}, neither a hook event nor the skill expansion"); sys.exit(1)
sys.exit(0)
PY
}
if [ -f "$GOLD" ]; then pass; else bad "$GOLD is missing — the golden record is the fixture, and a check with no fixture asserts nothing"; fi
if msg=$(attributed "$GOLD"); then pass; else
  bad "the golden run record has an unattributed transition: $msg"
fi
# The counterfactual: one attribution removed, and the same reader refuses.
python3 - "$GOLD" "$tmp/mutant.json" <<'PY'
import json, sys
rec = json.load(open(sys.argv[1]))
rec["transitions"][-1].pop("advanced_by", None)
json.dump(rec, open(sys.argv[2], "w"))
PY
if attributed "$tmp/mutant.json" >/dev/null; then
  bad "the golden record with one advanced_by removed still passes — the attribution reader asserts nothing"
else pass; fi

# ---- 2. THE EXECUTOR-INVOCATION DENY, over the payload shape the dispatcher
# hands the hook. `run` is refused; `--status`, the one read-only verb, rides.
verdict() {  # stdout AND stderr, so a hook that crashes on a payload cannot read as an admit
  python3 "$DENY" <<PY 2>&1
{"tool_name": "Bash", "tool_input": {"command": $(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$1")}}
PY
}
if verdict "node src/terrain.mjs run --run-dir /tmp/x" | grep -q '"permissionDecision": "deny"'; then pass; else
  bad "a Bash payload naming \`terrain.mjs run\` was not denied — a model can run the executor with a fabricated payload, and the attribution above is then a guard after a model-constructed input"
fi
admitted=$(verdict "node src/terrain.mjs run --status --run-dir /tmp/x"); admitted_rc=$?
if [ "$admitted_rc" -eq 0 ] && [ -z "$admitted" ]; then pass; else
  bad "a Bash payload naming \`terrain.mjs run --status\` was not admitted cleanly (rc=$admitted_rc, output: ${admitted:-none}) — the one read-only route into a stuck run is closed, or the hook fails on it"
fi

# ---- THE BOUND (acceptance 1): under one second on this machine run alone
# (639 ms measured at kogaki#1031). The self-check fails at two seconds rather
# than one because the suite runs eight members in contention and a bound at
# the standalone figure would fail on load rather than on growth; a test that
# becomes slow is a test the owner deletes, and this line is where that shows.
elapsed_ms=$(( ($(date +%s%N) - started) / 1000000 ))
if [ "$elapsed_ms" -lt 2000 ]; then pass; else
  bad "the check took ${elapsed_ms}ms against its bound of 2000ms (measured 639 ms alone; the suite runs eight members in contention) — kogaki#1031's own removal condition"
fi

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass in ${elapsed_ms}ms — the executor refuses a transition with no hook payload, the golden record is attributed on every transition and its mutant is refused, and the Bash route into the executor is denied with --status admitted (kogaki#1031)"
fi
exit "$fail"
