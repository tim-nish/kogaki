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
#
# THE INSTRUMENT REPORTS ITSELF BEFORE IT REPORTS ITS SUBJECT (PR #1043 round 1,
# finding 4). The first cut discarded stderr and the exit status and read empty
# stdout as `allow`, so a hook that had crashed — or, as actually happened, one
# that was never committed and was not in the tree at all — was indistinguishable
# from one that deliberately admitted. That run produced thirteen FAIL lines
# blaming the payload comparison and the 2026-09-09 event, and not one of them
# said the file was missing. A broken instrument must say it is broken.
fire() {
  local out rc
  out="$(KOGAKI_OPEN_GATES="$GATES" python3 "$HOOK" 2>"$WORK/hook.err")"; rc=$?
  if [[ $rc -ne 0 ]]; then
    echo "{\"decision\":\"hook-error\"}"
    echo "  (hook exited $rc: $(head -c 300 "$WORK/hook.err"))" >&2
    return 0
  fi
  printf '%s' "$out"
}

if [[ ! -f "$HOOK" ]]; then
  echo "  FAIL: $HOOK is not in the tree — every case below would report the SUBJECT admitting when the instrument has no subject at all"
  echo "FAIL: checks/check-open-gate-exclusivity.sh"
  exit 1
fi
if ! python3 -c "import ast,sys; ast.parse(open(sys.argv[1]).read())" "$HOOK" 2>/dev/null; then
  echo "  FAIL: $HOOK does not parse — see above"
  echo "FAIL: checks/check-open-gate-exclusivity.sh"
  exit 1
fi

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

# ------------------------------------ PR #1043 round 3, carried by kogaki#1047
# Finding 3: PreToolUse applies the has_capture filter the other two events do.
rm -f "$GATES"/*.json
open_pointer
cat >"$RUN/terrain.gate-capture.json" <<JSON
{ "rows": [ { "gate_instance_id": "$INSTANCE", "gate_id": "terrain-tag-selection" } ] }
JSON
[[ "$(pre Bash '{"command":"ls"}' | decision)" == "allow" ]] \
  && pass "a pointer whose capture row exists gates nothing — PreToolUse filters on has_capture as Stop and UserPromptSubmit do" \
  || bad "a captured pointer still denied every tool — the session stays frozen until the file is removed from outside it"
rm -f "$RUN/terrain.gate-capture.json"

# Finding 4: the two pointer readers share one expiry.
rm -f "$GATES"/*.json
open_pointer
python3 - "$GATES/$INSTANCE.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d["opened_at"]="2000-01-01T00:00:00.000Z"; json.dump(d,open(p,"w"))
PY
[[ "$(pre Bash '{"command":"ls"}' | decision)" == "allow" ]] \
  && pass "a pointer past the capture hook's TTL gates nothing" \
  || bad "an expired pointer still denied every tool — the deny hook reads a TTL the capture hook honours and it does not"

# Finding 2: the composed free-text row has a reader on the capture side.
rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"
open_pointer
printf '%s' "{\"session_id\":\"$SESSION\",\"tool_name\":\"AskUserQuestion\",\"tool_use_id\":\"toolu_row\",\"tool_response\":{\"answers\":{\"Which tag does the survey open on?\":\"Answer in your own words instead\"}}}" \
  | KOGAKI_OPEN_GATES="$GATES" python3 "$CAPTURE" 2>/dev/null
if python3 - "$RUN/terrain.gate-capture.json" <<'PY'
import json,sys
rows=json.load(open(sys.argv[1])).get("rows") or []
a=rows[-1]["payload"]["answer"] if rows else {}
sys.exit(0 if a.get("label_unresolved") and a.get("free_text_row_selected") and "free_text" not in a else 1)
PY
then pass "clicking the composed free-text row is recorded as unresolved, never as the owner's own words"
else bad "the free-text row's label was recorded as the answer — a sentence about answering lands where a value goes"
fi
rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"

# The copied constants AGREE, compared rather than trusted (PR #1048 round 1,
# finding 3): the free-text row label the composer writes and the one the
# capture hook reads; the pointer TTL the capture hook reaps at and the one the
# exclusivity hook skips at. A wording change on one side alone fails here.
if python3 - <<'PY'
import re, sys
def one(path, pattern):
    m = re.search(pattern, open(path, encoding="utf-8").read(), re.M)
    if not m: print(f"{path}: {pattern!r} not found"); sys.exit(1)
    return m.group(1)
composer = one("src/terrain.mjs", r'^const GATE_CALL_FREE_TEXT_LABEL = "([^"]+)";')
reader = one(".claude/hooks/write-gate-capture.py", r'^FREE_TEXT_ROW_LABEL = "([^"]+)"')
if composer != reader:
    print(f"free-text row label: composer {composer!r} != capture reader {reader!r}"); sys.exit(1)
ttl_cap = one(".claude/hooks/write-gate-capture.py", r'^POINTER_TTL = timedelta\(hours=(\d+)\)')
ttl_gate = one(".claude/hooks/gate-open-terrain-gate.py", r'^POINTER_TTL = timedelta\(hours=(\d+)\)')
if ttl_cap != ttl_gate:
    print(f"pointer TTL: capture {ttl_cap}h != exclusivity {ttl_gate}h"); sys.exit(1)
PY
then pass "the free-text row label and the pointer TTL agree across their copies"
else bad "a copied constant diverged — the composer and a hook now disagree about the row label or the TTL"
fi

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
# THE PROSE IS ABSENT BY CONSTRUCTION, NOT BY BEING MOVED (PR #1043 round 1,
# blocking finding 3). The first cut moved `.claude/skills/terrain/SKILL.md` and
# `specs/spec-terrain` out of the shared working tree and put them back — and
# `tools/run-registered-checks.sh` runs members CONCURRENTLY in that tree, where
# three siblings read exactly those paths. Any of them scheduled inside the
# removal window fails for a reason that is not a defect, so the suite's verdict
# becomes nondeterministic; and the `git checkout --` backstop that was supposed
# to make the move safe would discard uncommitted work under those paths instead.
# It also lost a tracked file once, when a run was killed mid-window.
#
# So nothing is moved. The hook is COPIED into a directory that contains the hook
# and nothing else — no skill file, no spec, no repository around it — and the
# four decisions are driven there. That is a stronger reading of acceptance item
# 6 than the move was: the move proved the decisions survive the prose being
# deleted, and this proves they never needed anything but the hook.
REMOVAL_DIR="$WORK/removal"; mkdir -p "$REMOVAL_DIR"
cp "$HOOK" "$REMOVAL_DIR/hook.py"
[[ -e .claude/skills/terrain/SKILL.md || -e specs/spec-terrain ]] && prose_exists=1 || prose_exists=0

rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"
open_pointer
removal_ok=1
HOOK_SAVED="$HOOK"; HOOK="$REMOVAL_DIR/hook.py"
[[ "$(pre AskUserQuestion "$EXACT" | decision)" == "allow" ]] || removal_ok=0
[[ "$(pre ListAgents '{}' | decision)" == "deny" ]] || removal_ok=0
[[ "$(stop_payload false | decision)" == "block" ]] || removal_ok=0
[[ "$(ups "$SESSION" | decision)" == "block" ]] || removal_ok=0
HOOK="$HOOK_SAVED"
if [[ $removal_ok -eq 1 && $prose_exists -eq 1 ]]; then
  pass "Removal Test: the admit/deny/block decisions hold for a copy of the hook alone, with no skill file, no Spec and no repository around it"
elif [[ $prose_exists -eq 0 ]]; then
  bad "Removal Test is vacuous: neither the skill file nor the Terrain spec is present in the tree, so their absence proves nothing"
else
  bad "Removal Test: a decision changed away from the repository — the guarantee is not carried by the hook alone"
fi

# ------------------------------------------------- item 6: the registration
# The assertion is about the COMMIT, never the checkout (kogaki#1052). The
# review lane builds its worktree without `.claude/settings.json` on purpose,
# so a file read from the tree made this case fail on every round with
# "settings.json is unreadable" -- a check defect reported as cannot-determine.
# So the settings are read with `git show HEAD:` and the hook files' existence
# with `git ls-files`, and both hold in any worktree carrying the commit.
# The predicate is a file so it can be run twice: once over the committed
# settings, once over a listing that omits a hook the registration names (PR
# #1043 round 3, finding 1 -- a registration that names a file nobody proves
# exists is green for a gitignored hook, which is how round 1's finding 1
# arose).
cat >"$WORK/registration.py" <<'PY'
import json, sys
# argv[1]: the committed settings.json, materialized from the commit.
# argv[2]: a listing of the hook paths TRACKED in that commit, one per line,
#          as `git ls-files .claude/hooks` renders them. The counterfactual
#          run passes the same listing with one entry removed.
try:
    s = json.load(open(sys.argv[1]))
except Exception as exc:
    print(f"settings.json is unreadable: {exc}"); sys.exit(1)
try:
    tracked = {line.strip().rsplit("/", 1)[-1]
               for line in open(sys.argv[2]) if line.strip()}
except Exception as exc:
    print(f"the tracked-hook listing is unreadable: {exc}"); sys.exit(1)
hooks = s.get("hooks") or {}
want = {"PreToolUse", "PostToolUse", "Stop", "UserPromptSubmit"}
missing = sorted(want - set(hooks))
if missing:
    print("committed settings.json registers no " + ", ".join(missing)); sys.exit(1)
blob = json.dumps(hooks)
for f in ("gate-open-terrain-gate.py", "write-gate-capture.py", "gate-terrain-executor.py", "advance-terrain.py"):
    if f not in blob:
        print(f"committed settings.json does not register {f}"); sys.exit(1)
    if f not in tracked:
        print(f"settings.json registers {f}, which does not exist in the commit -- it is untracked"); sys.exit(1)
# The matcher must ask for EVERY tool. The user-level registration that let
# `mcp__tsurezure__*` and `ListAgents` through on 2026-09-09 named eight tools.
for entry in hooks["PreToolUse"]:
    if "gate-open-terrain-gate.py" in json.dumps(entry):
        if entry.get("matcher") != "*":
            print(f"the exclusivity hook's PreToolUse matcher is {entry.get('matcher')!r}, not '*' — a named list is what let ListAgents through"); sys.exit(1)
sys.exit(0)
PY
# Both inputs come from the commit, so the case holds where the working tree
# omits either one -- which is exactly the review lane's worktree.
if ! git show HEAD:.claude/settings.json >"$WORK/settings-committed.json" 2>"$WORK/settings-committed.err"; then
  bad "the committed .claude/settings.json could not be read from HEAD: $(cat "$WORK/settings-committed.err")"
  : >"$WORK/settings-committed.json"
fi
git ls-files .claude/hooks >"$WORK/hooks-tracked" 2>/dev/null || : >"$WORK/hooks-tracked"
if python3 "$WORK/registration.py" "$WORK/settings-committed.json" "$WORK/hooks-tracked"; then
  pass "the hooks are registered in the committed .claude/settings.json, every registered hook file is tracked in the same commit, and the exclusivity matcher asks for every tool"
else
  bad "the committed registration is incomplete — a rendered gate could not advance a run, which is the state write-gate-capture.py was in on 2026-09-09"
fi
# The registration is left as committed; the COMMIT is what lacks a file.
grep -v '/advance-terrain\.py$' "$WORK/hooks-tracked" >"$WORK/hooks-tracked-missing"
if OUT="$(python3 "$WORK/registration.py" "$WORK/settings-committed.json" "$WORK/hooks-tracked-missing" 2>&1)"; then
  bad "a registration naming a hook file that is not in the commit passed — the case asserts names, not existence"
elif grep -q "does not exist" <<<"$OUT"; then
  pass "a registration naming a hook file that is not in the commit is refused by name"
else
  bad "a registration naming a missing hook file was refused for another reason: $OUT"
fi

if [[ $FAILED -eq 0 ]]; then
  echo "catch: open-gate exclusivity — the gate interval admits one act, ends on an answer, and survives the prose being deleted"
  exit 0
fi
echo "FAIL: checks/check-open-gate-exclusivity.sh"
exit 1
