#!/usr/bin/env bash
# The Brief executor's invocation boundary and the Brief gate's interval
# (kogaki#1116 acceptance item 5, kogaki#1314, kogaki#1740), held in the
# Brief's own check since kogaki#1741: the Terrain check carries Terrain's
# cases, this one the Brief's, and both drive the one lane-neutral deny
# (`.claude/hooks/gate-executor-invocation.py`) and open-gate hook
# (`.claude/hooks/gate-open-gate.py`) through checks/fixtures/executor-deny/.
#
# Hook wiring is machine-local and is not asserted; what the tracked
# `.claude/settings.json` SAYS is, because it reads the same on every clone.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO=$PWD

# `python3` IS RESOLVED ONCE, TO THE INTERPRETER ITSELF (kogaki#1425).
PY=$(python3 -c 'import sys; print(sys.executable)')

fail=0
cases=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }
pass() { cases=$((cases + 1)); }

DENY=.claude/hooks/gate-executor-invocation.py
OPEN_GATE=.claude/hooks/gate-open-gate.py
ADVANCE=.claude/hooks/advance-brief.py

# ---- INSTALLABILITY.
for f in "$DENY" "$OPEN_GATE" "$ADVANCE"; do
  if [ ! -f "$f" ]; then
    bad "$f is missing — the Brief's invocation boundary or gate interval has no carrier"
    continue
  fi
  if "$PY" -c "import ast,sys;ast.parse(open('$f').read())" 2>/dev/null; then
    pass
  else
    bad "$f does not parse as Python — a hook that cannot load enforces nothing"
  fi
done

# ---- THE REGISTRATIONS NAME THE LANE-NEUTRAL HOOKS (kogaki#1741). The open-gate
# hook at PreToolUse `*` and at Stop, the deny at PreToolUse `Bash`, read from
# the tracked settings file.
if "$PY" - <<'PYREG'
import json, sys
hooks = json.load(open(".claude/settings.json", encoding="utf-8"))["hooks"]
def named(event, matcher, name):
    return any(m.get("matcher") == matcher and any(name in h.get("command", "") for h in m.get("hooks", []))
               for m in hooks.get(event, []))
ok = (named("PreToolUse", "*", "/.claude/hooks/gate-open-gate.py")
      and named("Stop", "*", "/.claude/hooks/gate-open-gate.py")
      and named("PreToolUse", "Bash", "/.claude/hooks/gate-executor-invocation.py"))
sys.exit(0 if ok else 1)
PYREG
then pass; else
  bad ".claude/settings.json does not register gate-open-gate.py at PreToolUse * and Stop and gate-executor-invocation.py at PreToolUse Bash — a Brief gate's interval or its executor's deny has no registration (kogaki#1741)"
fi

# ---- THE DENY FIRES ON THE BRIEF EXECUTOR, AND ADMITS ITS STATUS VERBS.
. checks/fixtures/executor-deny/driver.sh

# ---- kogaki#1314. THE STATUS AND AWAIT VERBS ARE ADMITTED ONLY AS THE WHOLE
# COMMAND, SPELLED EXACTLY. Once a gate is open the executor's stdout is the
# only channel its bytes have, and a loop polling `job await` through
# `grep -q "still running"` and `tail -1` was admitted on its body segment and
# dropped a Candidate question's bytes. Acceptance 1: each spelling is admitted
# when it is the whole command.
AWAIT="node src/brief.mjs run --status --job await --run-dir /x"
assert_admitted "the Brief await verb, whole"  "$AWAIT"
assert_admitted "the Brief job-status verb, whole" "node src/brief.mjs run --status --job status"
assert_admitted "the bare Brief status verb, whole" "node src/brief.mjs run --status"
# Acceptance 2: the await invocation is denied wherever it is not the whole
# command, and every deny reason carries the exact admitted spelling, so the
# retry is a copy and not a composition.
SPELLING="node src/brief.mjs run --status --job await --run-dir <dir>"
for probe in "inside a command substitution|out=\$($AWAIT)" \
             "inside an echoed substitution|echo \$($AWAIT)" \
             "after a loop keyword|for i in 1 2; do $AWAIT; done" \
             "before a pipe|$AWAIT | tail -1" \
             "followed by a second command|$AWAIT; echo done" \
             "with a trailing 2>&1|$AWAIT 2>&1"; do
  label=${probe%%|*}; cmd=${probe#*|}
  assert_denied "the await verb $label" "$cmd"
  out=$(deny_verdict "$cmd")
  if printf '%s' "$out" | grep -qF -- "$SPELLING"; then pass; else
    bad "the deny on the await verb $label does not carry the exact admitted spelling \`$SPELLING\` — a retry would have to be composed rather than copied (kogaki#1314)"
  fi
done
# The issue's own specimen, verbatim in shape.
assert_denied "the polling loop the Issue records" \
  'for i in $(seq 1 18); do out=$(node src/brief.mjs run --status --job await --run-dir /x 2>&1); echo "$out" | grep -q "still running" || { echo "$out" | tail -250; break; }; echo "$out" | tail -1; done'
# The grammar is closed: an unknown `--job` verb, a stray word and a repeated
# flag are each not that one invocation.
assert_denied "an unknown job verb"      "node src/brief.mjs run --status --job start"
assert_denied "a stray trailing word"    "node src/brief.mjs run --status extra"
assert_denied "a repeated run-dir"       "node src/brief.mjs run --status --run-dir /a --run-dir /b"

# THE SECOND EXECUTOR (kogaki#1116, acceptance item 5). `src/brief.mjs` is a
# lane executor on the same terms: a Brief run is STARTED by the brief skill's
# own `!` line and ADVANCED inside `advance-brief.py`, and it runs the shared
# executor (`src/workflow/executor.mjs`) under its own flow binding. A model-typed `node src/brief.mjs start`
# mints a start-act-attributed record from Bash, which is exactly the
# route the self-declared executor kind is only trustworthy because it is
# closed — so the prohibition reaches it, through the same hook rather than a
# second copy of the rule.
assert_denied "the Brief start verb"      "node src/brief.mjs start coding::lesson/alpha"
assert_denied "the Brief run verb"        "node src/brief.mjs run"
assert_denied "a bare Brief invocation"   "node src/brief.mjs"
assert_denied "a Brief enter"             "node src/brief.mjs enter coding::lesson/alpha"
assert_denied "a Brief start behind sudo" "sudo node src/brief.mjs start"
assert_denied "a direct Brief execution"  "./src/brief.mjs start"
# The admitted verb is the same one, and it is the same narrowing: an inspection
# route that was denied would leave a stuck Brief run unreadable by the one
# party able to unstick it.
assert_admitted "the Brief status verb"   "node src/brief.mjs run --status"
assert_denied "a status flag on the Brief start verb" "node src/brief.mjs start --status"
# NAMING IS STILL NOT RUNNING, asserted for the second executor rather than
# inherited: the command-position anchor is what lets an Issue whose work is in
# this runtime declare its own footprint, and that property is per-path.
assert_admitted "a Brief footprint cell" \
  "issue-sync admit-issue verdict 1116 --plan-cell 'act=implement-issue;files=src/brief.mjs'"
assert_admitted "a grep over the Brief runtime" 'grep -n "entryInputs" src/brief.mjs'

# THE REASON NAMES THE BRIEF LANE. The deny covers more than one executor, and
# the lanes differ in exactly the facts the refusal sends the reader to: which
# skill starts the run and which PostToolUse hook advances it.
out=$(deny_verdict "node src/brief.mjs start")
if printf '%s' "$out" | grep -q "advance-brief.py"; then pass; else
  bad "the deny on \`node src/brief.mjs start\` does not name advance-brief.py — the advance hook is a per-lane fact the reader is sent to"
fi
if printf '%s' "$out" | grep -qi "the brief skill"; then pass; else
  bad "the deny on \`node src/brief.mjs start\` does not name the brief skill as the route that starts a run"
fi

# THE BRIEF ADVANCE HOOK'S CHILD BOUND FIRES BEFORE THE HARNESS'S OWN (kogaki#1300):
# the Brief table's judge.advance_timeout_s sits below the 600s hook default, and
# advance-brief.py reads its bound from that table.
if "$PY" -c 'import importlib.util,json,sys
want=json.load(open("src/brief-workflow.json",encoding="utf-8"))["judge"].get("advance_timeout_s")
spec=importlib.util.spec_from_file_location("h_brief",".claude/hooks/advance-brief.py"); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
sys.exit(0 if isinstance(want,(int,float)) and 0 < want < 600 and m.advance_timeout_s(".") == want else 1)'; then
  pass
else
  bad "src/brief-workflow.json's judge.advance_timeout_s is absent or not below 600s, or advance-brief.py does not read its bound from it (kogaki#1300)"
fi

# THE BRIEF ADVANCE HOOK'S CAPTURE SUFFIX IS THE SCHEMA'S (kogaki#1108). The
# hook copies `src/gate-schema.json`'s `capture.suffix` because a hook is one
# file with no module to import; a copy that drifted would look for the capture
# under a name nothing writes, and every Brief advance would be a silent no-op.
CAPSUF=$("$PY" -c 'import json;print(json.load(open("src/gate-schema.json"))["capture"]["suffix"])')
if grep -q "^CAPTURE_SUFFIX = \"$CAPSUF\"$" "$ADVANCE"; then pass; else
  bad "$ADVANCE's CAPTURE_SUFFIX does not equal src/gate-schema.json's capture.suffix ($CAPSUF)"
fi

# ---- A BRIEF RUN SPAWNS NO TERRAIN PROCESS (kogaki#1741). The Detached Job's
# supervisor is the shared entry point, and no code the Brief flow loads spells
# a path to Terrain's entry point as a string it could spawn.
if grep -qF 'join(REPO, "src", "workflow", "job-supervise.mjs")' src/workflow/detached-job.mjs; then pass; else
  bad "src/workflow/detached-job.mjs does not spawn src/workflow/job-supervise.mjs — a Brief compose job's supervisor is not the shared entry point (kogaki#1741)"
fi
if git grep -q -E '"(src/)?terrain\.mjs"|"src", "terrain\.mjs"' -- src/workflow src/brief src/brief.mjs; then
  bad "code the Brief flow loads spells a path to src/terrain.mjs: $(git grep -n -E '"(src/)?terrain\.mjs"|"src", "terrain\.mjs"' -- src/workflow src/brief src/brief.mjs | head -3)"
else
  pass
fi

# ---- THE BRIEF GATE'S INTERVAL (kogaki#1740), held by the lane-neutral open-gate hook.
hooktmp=$(mktemp -d) || bad "no temp directory for the open-gate cases — CANNOT-DETERMINE, never a pass"
trap 'rm -rf "$hooktmp"' EXIT
# AN ANSWERED RAISING RE-ASKED BY HAND IS DENIED (kogaki#1740). The capture
# hook writes no row for a second answer and no advance reads one, so the open-
# gate hook denies a question byte-equal to a gate call whose raising already has
# a row, naming that row's tool_use_id; a fresh raising of the same call is not.
answered_dir="$hooktmp/answered-run"
mkdir -p "$answered_dir" "$hooktmp/answered-gates"
answered_case() {
  local row_instance=$1 sent=$2
  "$PY" - "$answered_dir" "$row_instance" <<'PYCASE'
import json, sys
from pathlib import Path
d, row_instance = Path(sys.argv[1]), sys.argv[2]
call = {"questions": [{"question": "A Brief step stopped.", "header": "retry", "multiSelect": False,
        "options": [{"label": "Retry the step", "description": "r"}, {"label": "End this Brief", "description": "a"}]}]}
(d / "brief-state-retry.gate-call.json").write_text(json.dumps(call, indent=2) + "\n")
(d / "brief-state-retry.run-declaration.json").write_text(json.dumps({"id": "brief-state-retry", "gate_instance_id": "inst-answered"}) + "\n")
(d / "brief.gate-capture.json").write_text(json.dumps({"rows": [{"gate_instance_id": row_instance,
    "evidence": {"tool": "AskUserQuestion", "tool_use_id": "toolu_earlier_answer"}}]}) + "\n")
PYCASE
  "$PY" -c 'import json,sys; c=json.load(open(sys.argv[1])); c["questions"][0]["question"] += sys.argv[2]; print(json.dumps({"hook_event_name": "PreToolUse", "session_id": "s-answered", "tool_name": "AskUserQuestion", "tool_input": c}))' \
    "$answered_dir/brief-state-retry.gate-call.json" "$sent" \
    | KOGAKI_BRIEF_RUN_DIR="$answered_dir" KOGAKI_OPEN_GATES="$hooktmp/answered-gates" \
      "$PY" "$REPO/.claude/hooks/gate-open-gate.py" PreToolUse 2>/dev/null
}
answered_out=$(answered_case inst-answered "")
if printf '%s' "$answered_out" | grep -q '"permissionDecision": "deny"' && printf '%s' "$answered_out" | grep -q 'toolu_earlier_answer'; then pass; else
  bad "a question byte-equal to an answered gate call was not denied naming the earlier tool_use_id (kogaki#1740): ${answered_out:-(silent)}"
fi
fresh_out=$(answered_case inst-older "")
if [ -z "$fresh_out" ]; then pass; else
  bad "a gate call whose current raising has no capture row was denied as answered (kogaki#1740): $fresh_out"
fi
other_out=$(answered_case inst-answered " (a different question)")
if [ -z "$other_out" ]; then pass; else
  bad "a question differing from the answered gate call was denied as a re-ask (kogaki#1740): $other_out"
fi
# A second run whose raising of the same bytes is live, opened in another
# session, is admitted: the answered run elsewhere denies nothing (PR #1743 round 1).
live_dir="$hooktmp/answered-live-run"
mkdir -p "$live_dir"
answered_case inst-answered "" >/dev/null
cp "$answered_dir/brief-state-retry.gate-call.json" "$live_dir/"
"$PY" - "$live_dir" "$hooktmp/answered-gates" <<'PYLIVE'
import json, sys
from datetime import datetime, timezone
from pathlib import Path
d, gates = Path(sys.argv[1]), Path(sys.argv[2])
(gates / "inst-live.json").write_text(json.dumps({"gate_instance_id": "inst-live", "gate_id": "brief-state-retry",
    "gate_call_path": str(d / "brief-state-retry.gate-call.json"), "capture_path": str(d / "brief.gate-capture.json"),
    "session_id": "s-other", "opened_at": datetime.now(timezone.utc).isoformat()}) + "\n")
PYLIVE
live_out=$("$PY" -c 'import json,sys; print(json.dumps({"hook_event_name": "PreToolUse", "session_id": "s-answered", "tool_name": "AskUserQuestion", "tool_input": json.load(open(sys.argv[1]))}))' "$live_dir/brief-state-retry.gate-call.json" \
  | KOGAKI_BRIEF_RUN_DIR="$answered_dir" KOGAKI_OPEN_GATES="$hooktmp/answered-gates" \
    "$PY" "$REPO/.claude/hooks/gate-open-gate.py" PreToolUse 2>/dev/null)
rm -f "$hooktmp/answered-gates/inst-live.json"
if [ -z "$live_out" ]; then pass; else
  bad "a live raising in another session was denied because another run's identical call was answered (kogaki#1740, PR #1743 round 1): $live_out"
fi

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass — the Brief executor's Bash route denied by gate-executor-invocation.py with its whole-command status and await verbs admitted, the reason naming the Brief lane, the Brief advance bound below the hook default, and a Brief gate's interval held by gate-open-gate.py (kogaki#1116, kogaki#1314, kogaki#1740, kogaki#1741)"
fi
exit "$fail"
