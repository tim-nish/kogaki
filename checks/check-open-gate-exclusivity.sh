#!/usr/bin/env bash
# WHILE A TERRAIN GATE IS OPEN, ONE ACT IS ADMISSIBLE (kogaki#1028).
#
# WHAT THIS CHECKS THAT NOTHING ELSE CAN. `.claude/hooks/gate-open-terrain-
# gate.py` is a harness hook: it is reached by a PreToolUse, Stop or
# UserPromptSubmit payload and by nothing this repository can call. No runtime
# self-test drives it, because the runtime is on the other side of the seam —
# `src/terrain.mjs` writes the pointer and the payload it expects, and never sees
# a decision made about either. So the decisions are exercised here, over
# payloads shaped like the harness's own.
#
# THE REMOVAL TEST IS ACCEPTANCE ITEM 6 AND IT IS EXECUTED, NOT ASSERTED. Cases
# 1 to 4 run with `.claude/skills/terrain/SKILL.md` and `specs/spec-terrain/`
# moved aside, because every act they cover is a hook's: if a case needs the
# skill file present, the guarantee was living in prose that a session could
# decline to read, which is the defect this issue closes.
#
# WHAT IT DOES NOT CLAIM. It does not prove the HARNESS routes MCP tools and
# `ListAgents` into a `matcher: "*"` PreToolUse hook. That is a property of Claude
# Code, observable only by being denied in a live session, and the residue is
# stated in the pull request rather than dressed up as a passing case here. What
# it does prove is the half this repository owns: given such a payload, the hook
# denies — and the committed registration asks for every tool by using `"*"`,
# where the user-level registration that let `mcp__tsurezure__*` and `ListAgents`
# through on 2026-09-09 named eight tools by hand.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

HOOK=".claude/hooks/gate-open-terrain-gate.py"
FAILED=0
pass() { echo "  ok: $1"; }
bad() { echo "  FAIL: $1"; FAILED=1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
GATES="$WORK/gates"; mkdir -p "$GATES"
RUN="$WORK/run"; mkdir -p "$RUN"
SESSION="session-under-test"
INSTANCE="11111111-2222-3333-4444-555555555555"

cat >"$RUN/terrain-tag-selection.run-declaration.json" <<'JSON'
{ "id": "terrain-tag-selection", "question": "Which tag does the survey open on?",
  "options": [{"id": "other-method", "label": "Use a method other than co-tags"}],
  "free_text_offered": true, "gate_instance_id": "11111111-2222-3333-4444-555555555555" }
JSON
cat >"$RUN/terrain-tag-selection.gate-call.json" <<'JSON'
{
  "questions": [
    {
      "question": "tag  count\nagents  4\n\nWhich tag does the survey open on?",
      "header": "selection",
      "multiSelect": false,
      "options": [
        { "label": "Use a method other than co-tags", "description": "other-method" },
        { "label": "Answer in your own words instead", "description": "free text" }
      ]
    }
  ]
}
JSON
cat >"$RUN/run-record.json" <<'JSON'
{ "completed": [], "awaiting": "TAG_SELECTION" }
JSON

open_pointer() {
  cat >"$GATES/$INSTANCE.json" <<JSON
{ "gate_instance_id": "$INSTANCE", "gate_id": "terrain-tag-selection",
  "question": "Which tag does the survey open on?",
  "declaration_path": "$RUN/terrain-tag-selection.run-declaration.json",
  "capture_path": "$RUN/terrain.gate-capture.json",
  "gate_call_path": "$RUN/terrain-tag-selection.gate-call.json",
  "gate_call_unavailable": null,
  "session_id": "${1:-$SESSION}",
  "opened_at": "2999-01-01T00:00:00.000Z" }
JSON
}

# Feed a payload to the hook and print its stdout. `KOGAKI_OPEN_GATES` is the
# whole of the environment it reads.
fire() { KOGAKI_OPEN_GATES="$GATES" python3 "$HOOK" 2>/dev/null; }

pre() {  # $1 = tool name, $2 = tool_input JSON
  printf '%s' "{\"hook_event_name\":\"PreToolUse\",\"session_id\":\"$SESSION\",\"tool_name\":\"$1\",\"tool_input\":$2}" | fire
}

decision() { python3 -c '
import json,sys
raw=sys.stdin.read().strip()
if not raw: print("allow"); raise SystemExit
d=json.loads(raw)
print(d.get("hookSpecificOutput",{}).get("permissionDecision") or d.get("decision") or "allow")
'; }

EXACT="$(cat "$RUN/terrain-tag-selection.gate-call.json")"

echo "== the open-gate pointer is the interval, and one act is admissible (kogaki#1028)"

# ---------------------------------------------------------------- acceptance 1
open_pointer
[[ "$(pre AskUserQuestion "$EXACT" | decision)" == "allow" ]] \
  && pass "the exact payload is admitted" \
  || bad "the exact payload was not admitted — the gate has no admissible act and the run is wedged"

# The table missing, paraphrased, reordered; an option pre-selected. Each is a
# byte difference in the one field the owner reads, and each must deny.
MISSING="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));d["questions"][0]["question"]="Which tag does the survey open on?";print(json.dumps(d))' "$RUN/terrain-tag-selection.gate-call.json")"
PARAPHRASED="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));d["questions"][0]["question"]=d["questions"][0]["question"].replace("agents  4","agents: 4 strands");print(json.dumps(d))' "$RUN/terrain-tag-selection.gate-call.json")"
REORDERED="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));d["questions"][0]["options"].reverse();print(json.dumps(d))' "$RUN/terrain-tag-selection.gate-call.json")"
PRESELECTED="$(python3 -c 'import json,sys;d=json.load(open(sys.argv[1]));d["questions"][0]["options"][0]["selected"]=True;print(json.dumps(d))' "$RUN/terrain-tag-selection.gate-call.json")"
for pair in "table missing:$MISSING" "table paraphrased:$PARAPHRASED" "options reordered:$REORDERED" "an option pre-selected:$PRESELECTED"; do
  what="${pair%%:*}"; body="${pair#*:}"
  [[ "$(pre AskUserQuestion "$body" | decision)" == "deny" ]] \
    && pass "$what — denied" \
    || bad "$what was ADMITTED; the payload comparison is not byte-equality and the owner can be shown something the executor did not write"
done

# The tool matrix. `mcp__tsurezure__lessons_index` and `ListAgents` are the two
# the 2026-09-09 session actually reached for.
# ListAgents is unrolled rather than looped so its case text is a LITERAL in this
# file: `check-registry-conformance.sh` resolves the registry's `efficacy` cite
# by finding it here, and a case string composed at runtime resolves to nothing.
[[ "$(pre ListAgents '{}' | decision)" == "deny" ]] \
  && pass "ListAgents — denied while the gate is open" \
  || bad "ListAgents was ADMITTED while a gate was open — this is the 2026-09-09 event, unrefused"

for t in mcp__tsurezure__lessons_index Bash Write; do
  [[ "$(pre "$t" '{}' | decision)" == "deny" ]] \
    && pass "$t — denied while the gate is open" \
    || bad "$t was ADMITTED while a gate was open — this is the 2026-09-09 event, unrefused"
done

# ---------------------------------------------------------------- acceptance 2
stop_payload() { printf '%s' "{\"hook_event_name\":\"Stop\",\"session_id\":\"$SESSION\",\"stop_hook_active\":${1:-false}}" | fire; }
rm -f "$RUN/terrain.gate-capture.json"
[[ "$(stop_payload false | decision)" == "block" ]] \
  && pass "Stop blocks while the pointer is open and no capture row exists" \
  || bad "Stop did not block — the turn can end with the gate unrendered, which is the event"

cat >"$RUN/terrain.gate-capture.json" <<JSON
{ "rows": [ { "gate_instance_id": "$INSTANCE", "gate_id": "terrain-tag-selection" } ] }
JSON
[[ "$(stop_payload false | decision)" == "allow" ]] \
  && pass "Stop allows once a capture row exists" \
  || bad "Stop still blocks with the answer captured — the turn can never end"

rm -f "$RUN/terrain.gate-capture.json"
stop_payload true >/dev/null
if python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
f=d.get("failure") or {}
raise SystemExit(0 if f.get("cause")=="gate-unrendered" and "8" in str(f.get("note","")) else 1)
' "$RUN/run-record.json"; then
  pass "stop_hook_active records gate-unrendered on the run record, with the block bound stated"
else
  bad "stop_hook_active left no gate-unrendered record — a run that ended past the harness's override is indistinguishable from one that was answered"
fi

# ---------------------------------------------------------------- acceptance 3
ups() { printf '%s' "{\"hook_event_name\":\"UserPromptSubmit\",\"session_id\":\"$1\",\"prompt\":\"agents\"}" | fire; }
[[ "$(ups "$SESSION" | decision)" == "block" ]] \
  && pass "UserPromptSubmit blocks while the pointer is open" \
  || bad "a typed prompt was admitted at an open gate — typed text is never an answer"
rm -f "$GATES/$INSTANCE.json"
[[ "$(ups "$SESSION" | decision)" == "allow" ]] \
  && pass "UserPromptSubmit admits with no pointer open" \
  || bad "prompts are blocked with no gate open — every session on the machine is frozen"

# ---------------------------------------------------------------- acceptance 4
CAPTURE=".claude/hooks/write-gate-capture.py"
capture_payload() { printf '%s' "{\"session_id\":\"$1\",\"tool_name\":\"AskUserQuestion\",\"tool_use_id\":\"toolu_x\",\"tool_response\":{\"answers\":{\"Which tag does the survey open on?\":\"Use a method other than co-tags\"}}}" \
  | KOGAKI_OPEN_GATES="$GATES" python3 "$CAPTURE" 2>/dev/null; }

rm -f "$RUN/terrain.gate-capture.json"
open_pointer "another-session"
capture_payload "$SESSION"
[[ ! -f "$RUN/terrain.gate-capture.json" ]] \
  && pass "a capture under a foreign session id writes no row" \
  || bad "a row was written across sessions — one session's answer landed in another's capture"

rm -f "$GATES"/*.json
open_pointer
cp "$GATES/$INSTANCE.json" "$GATES/aaaa-second.json"
python3 - "$GATES/aaaa-second.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d["gate_instance_id"]="99999999-0000-0000-0000-000000000000"
json.dump(d,open(p,"w"))
PY
rm -f "$RUN/terrain.gate-capture.json"
capture_payload "$SESSION"
[[ ! -f "$RUN/terrain.gate-capture.json" ]] \
  && pass "two pointers for one question write no row" \
  || bad "the ambiguity arm chose between two outstanding gates — the misattribution the nonce exists to prevent"

# ---------------------------------------------------------------- acceptance 5
OUT="$(env -u KOGAKI_OPEN_GATES bash checks/check-terrain-runtime.sh 2>&1)"; RC=$?
if [[ $RC -ne 0 ]] && grep -q "KOGAKI_OPEN_GATES is not set" <<<"$OUT" && ! grep -q "terrain self-test:" <<<"$OUT"; then
  pass "a check that starts the executor refuses without KOGAKI_OPEN_GATES, BEFORE the executor starts"
else
  bad "check-terrain-runtime.sh ran the executor with no KOGAKI_OPEN_GATES — pointers land in the owner's live directory (858 of them did)"
fi

# ---------------------------------------------------------------- acceptance 6
# THE REMOVAL TEST, EXECUTED. Cases 1 to 4 above are re-run with the skill file
# and the Terrain spec moved aside. Only the hook, the pointer and the payload
# remain; if a case needs the prose, the guarantee is not a hook's.
HID="$WORK/hidden"; mkdir -p "$HID"
REMOVAL_PATHS=(.claude/skills/terrain/SKILL.md specs/spec-terrain)
# RESTORE HAS A BACKSTOP, BECAUSE THE FIRST CUT LOST A TRACKED FILE. A run killed
# between the move and the restore — which happened once while this member was
# being written — left `.claude/skills/terrain/SKILL.md` absent from the working
# tree, and the trap that was supposed to prevent it never ran. Moving a tracked
# file aside is only safe where git is the second copy, so git is asked
# explicitly for anything still missing rather than assumed to be consulted later
# by someone who notices.
restore() {
  for f in "$HID"/*; do [[ -e "$f" ]] || continue; mv "$f" "$(basename "$f" | tr _ /)"; done
  for p in "${REMOVAL_PATHS[@]}"; do
    [[ -e "$p" ]] || git checkout -- "$p" 2>/dev/null || true
  done
}
trap 'restore; rm -rf "$WORK"' EXIT
# And armed BEFORE the moves happen, so an interrupt between them is covered too.
trap 'restore; rm -rf "$WORK"; exit 130' INT TERM HUP

moved=0
for p in "${REMOVAL_PATHS[@]}"; do
  if [[ -e "$p" ]]; then mv "$p" "$HID/$(echo "$p" | tr / _)"; moved=$((moved+1)); fi
done

rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"
open_pointer
removal_ok=1
[[ "$(pre AskUserQuestion "$EXACT" | decision)" == "allow" ]] || removal_ok=0
[[ "$(pre ListAgents '{}' | decision)" == "deny" ]] || removal_ok=0
[[ "$(stop_payload false | decision)" == "block" ]] || removal_ok=0
[[ "$(ups "$SESSION" | decision)" == "block" ]] || removal_ok=0
restore
if [[ $removal_ok -eq 1 && $moved -gt 0 ]]; then
  pass "Removal Test: the admit/deny/block decisions hold with the skill file and the Spec absent ($moved artifact(s) moved aside)"
elif [[ $moved -eq 0 ]]; then
  bad "Removal Test could not run: neither the skill file nor the Terrain spec was present to move aside"
else
  bad "Removal Test: a decision changed with the prose absent — the guarantee is not carried by the hook"
fi

# ------------------------------------------------- item 6: the registration
if python3 - <<'PY'
import json, sys
try:
    s = json.load(open(".claude/settings.json"))
except Exception as exc:
    print(f"settings.json is unreadable: {exc}"); sys.exit(1)
hooks = s.get("hooks") or {}
want = {"PreToolUse", "PostToolUse", "Stop", "UserPromptSubmit"}
missing = sorted(want - set(hooks))
if missing:
    print("committed settings.json registers no " + ", ".join(missing)); sys.exit(1)
blob = json.dumps(hooks)
for f in ("gate-open-terrain-gate.py", "write-gate-capture.py", "gate-terrain-executor.py", "advance-terrain.py"):
    if f not in blob:
        print(f"committed settings.json does not register {f}"); sys.exit(1)
# The matcher must ask for EVERY tool. The user-level registration that let
# `mcp__tsurezure__*` and `ListAgents` through on 2026-09-09 named eight tools.
for entry in hooks["PreToolUse"]:
    if "gate-open-terrain-gate.py" in json.dumps(entry):
        if entry.get("matcher") != "*":
            print(f"the exclusivity hook's PreToolUse matcher is {entry.get('matcher')!r}, not '*' — a named list is what let ListAgents through"); sys.exit(1)
sys.exit(0)
PY
then
  pass "the hooks are registered in the committed .claude/settings.json, and the exclusivity matcher asks for every tool"
else
  bad "the committed registration is incomplete — a rendered gate could not advance a run, which is the state write-gate-capture.py was in on 2026-09-09"
fi

if [[ $FAILED -eq 0 ]]; then
  echo "catch: open-gate exclusivity — the gate interval admits one act, ends on an answer, and survives the prose being deleted"
  exit 0
fi
echo "FAIL: checks/check-open-gate-exclusivity.sh"
exit 1
