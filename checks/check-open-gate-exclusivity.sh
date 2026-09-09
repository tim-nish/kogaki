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

# ------------------------------------------------------------- kogaki#1051
# THE PROMPT THAT OPENED THE GATE. The harness runs the terrain skill's `!`
# line before it runs UserPromptSubmit on the prompt that invoked the skill, so
# the start act's gate is already open when that prompt is judged. Before the
# `skill-expansion` mark the arm above refused it, no model turn ever ran, and
# the two sessions of 2026-09-09 13:01 UTC were recovered by moving the
# pointers out of the live directory by hand.
# MARKING RESTORES THE UNTURNED STATE, BOTH HALVES OF IT (PR #1054 round 1).
# The first cut set `opened_by` and left `turn_seen_at` where it stood, so a
# pointer re-marked after a tool call was still not `unturned` — and the
# beside-an-unmarked-one case below then had NO unturned pointer in its
# outstanding set, where its whole subject is one. `any` and `all` block alike
# over that set, so the case went green against the widening it names.
mark_skill_expansion() {
  python3 - "$GATES/$INSTANCE.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
d["opened_by"]="skill-expansion"; d.pop("turn_seen_at",None)
json.dump(d,open(p,"w"))
PY
}

rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"
open_pointer
mark_skill_expansion
[[ "$(ups "$SESSION" | decision)" == "allow" ]] \
  && pass "a pointer opened by skill expansion admits the prompt that opened it — the start act's own invocation is not refused by the gate it just opened" \
  || bad "the prompt that opened the gate was refused — this is the 2026-09-09 13:01 event, and the run is reachable only from outside the session"

# One PreToolUse event is the first evidence a turn ran, and it spends the mark.
pre Bash '{"command":"ls"}' >/dev/null
if python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
raise SystemExit(0 if d.get("turn_seen_at") and d.get("opened_by")=="skill-expansion" else 1)
' "$GATES/$INSTANCE.json"; then
  pass "the first tool call stamps turn_seen_at and leaves opened_by intact — the mark is spent without losing which executor opened the gate"
else
  bad "the first tool call left the pointer unstamped, or erased opened_by — the mark either never expires or takes the provenance with it"
fi
[[ "$(ups "$SESSION" | decision)" == "block" ]] \
  && pass "the same pointer refuses a typed prompt once a turn has run — the admission is bounded to the prompt that opened the gate" \
  || bad "a typed prompt was admitted after a turn had run — typed text is an answer again, which is the whole class this arm closes"

# A TURN THAT CALLS NO TOOL SPENDS THE MARK TOO, and Stop is the only event that
# sees it (PR #1054 round 1, carried to kogaki#1055). PreToolUse never fires for
# a turn emitting text alone, so before this the Stop arm blocked and wrote
# nothing: the pointer stayed `unturned` and kept admitting typed prompts for the
# session until POINTER_TTL reaped it, while the run was recorded
# `gate-unrendered` beside a pointer still claiming no turn had run. The case
# fires Stop as the FIRST event after the mark, so a pass cannot be borrowed from
# the tool-call stamp above.
rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"
open_pointer
mark_skill_expansion
stop_payload false >/dev/null
if python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
raise SystemExit(0 if d.get("turn_seen_at") and d.get("opened_by")=="skill-expansion" else 1)
' "$GATES/$INSTANCE.json"; then
  pass "a turn ending at Stop with no tool call stamps turn_seen_at and leaves opened_by intact — the mark has an evidence source for every turn shape"
else
  bad "a text-only turn left the pointer unstamped — the mark never expires for that session, and typed prompts stay admitted until POINTER_TTL reaps the pointer"
fi
[[ "$(ups "$SESSION" | decision)" == "block" ]] \
  && pass "the same pointer refuses a typed prompt after a text-only turn — the admission is bounded by the turn, not by whether it happened to call a tool" \
  || bad "a typed prompt was admitted after a text-only turn had run — the bound the arm above establishes is escapable by not calling a tool"

# A marked pointer beside an unmarked one refuses: the session was already
# asked to render that other gate, and typed text is not an answer to it.
cp "$GATES/$INSTANCE.json" "$GATES/bbbb-unmarked.json"
python3 - "$GATES/bbbb-unmarked.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p))
d["gate_instance_id"]="88888888-0000-0000-0000-000000000000"; d.pop("opened_by",None); d.pop("turn_seen_at",None)
json.dump(d,open(p,"w"))
PY
mark_skill_expansion
[[ "$(ups "$SESSION" | decision)" == "block" ]] \
  && pass "a skill-expansion pointer beside an unmarked one refuses — the admission needs every outstanding gate to be one no turn has run for" \
  || bad "an unmarked gate was admitted past because a marked one sat beside it"
rm -f "$GATES"/*.json

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
# argv[2]: a listing of the hook paths the COMMIT carries, one per line, as
#          `git ls-tree -r --name-only HEAD .claude/hooks` renders them -- the
#          same revision argv[1] is read from, so the two inputs cannot
#          disagree about which tree is being asserted. The counterfactual run
#          passes the same listing with one entry removed.
try:
    s = json.load(open(sys.argv[1]))
except Exception as exc:
    print(f"settings.json is unreadable: {exc}"); sys.exit(1)
try:
    tracked = {line.strip().rsplit("/", 1)[-1]
               for line in open(sys.argv[2]) if line.strip()}
except Exception as exc:
    print(f"the committed-hook listing is unreadable: {exc}"); sys.exit(1)
if not tracked:
    print("the committed-hook listing is empty -- nothing was read to assert against"); sys.exit(1)
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
# The SAME revision the settings came from -- `git ls-files` would read the
# INDEX, and a hook `git add`ed but not committed would then satisfy a message
# that says "in the commit" (round 1, finding 1).
git ls-tree -r --name-only HEAD .claude/hooks >"$WORK/hooks-tracked" 2>/dev/null || : >"$WORK/hooks-tracked"
if python3 "$WORK/registration.py" "$WORK/settings-committed.json" "$WORK/hooks-tracked"; then
  pass "the hooks are registered in the committed .claude/settings.json, every registered hook file is carried by the same commit, and the exclusivity matcher asks for every tool"
else
  bad "the committed registration is incomplete — a rendered gate could not advance a run, which is the state write-gate-capture.py was in on 2026-09-09"
fi
# The registration is left as committed; the COMMIT is what lacks a file. The
# entry must be PRESENT before it is removed, or the counterfactual would grep
# its token off an empty listing and prove nothing (round 1, finding 2).
if ! grep -q '/advance-terrain\.py$' "$WORK/hooks-tracked"; then
  bad "the counterfactual cannot run: advance-terrain.py is not in the committed-hook listing, so removing it removes nothing"
fi
grep -v '/advance-terrain\.py$' "$WORK/hooks-tracked" >"$WORK/hooks-tracked-missing"
if OUT="$(python3 "$WORK/registration.py" "$WORK/settings-committed.json" "$WORK/hooks-tracked-missing" 2>&1)"; then
  bad "a registration naming a hook file that is not in the commit passed — the case asserts names, not existence"
elif grep -q "does not exist" <<<"$OUT"; then
  pass "a registration naming a hook file that is not in the commit is refused by name"
else
  bad "a registration naming a missing hook file was refused for another reason: $OUT"
fi

# -------------------------------------------- kogaki#1029 acceptance 2
# THE TABLE IS SEVENTEEN ROWS, AND ONE MISSING ROW IS THE DIFFERENCE THAT MUST
# DENY. The acceptance-1 cases above prove byte-equality over a ONE-ROW table:
# "table missing" removes the whole field and "table paraphrased" rewrites the
# only row in it. Neither is the size kogaki#1029 names. At the current pin the
# survey renders seventeen tags, and the payload that matters is one identical
# to the executor's in every byte except that a single row of the seventeen is
# gone -- the owner reads sixteen tags, chooses among them, and nothing anywhere
# says a tag was withheld. A comparison that turned on a prefix, on a length, or
# on the first and last lines alone would admit exactly that payload while
# passing every case above it.
#
# THE PAYLOAD BELOW IS THIS FILE'S OWN, AND IS NOT `renderTagDisplay`'s OUTPUT
# (PR #1061 round 1, finding 1). The composer emits a display headline, indented
# rows and a navigation hint; the fixture here emits a plain header and
# seventeen unindented rows, because what is under test is the hook's byte
# comparison over a table of that SIZE, not the survey's own rendering. That
# a seventeen-tag survey renders seventeen rows into the question is acceptance
# 2's FIRST clause, and it is asserted in the terrain runtime self-test where
# the composer lives -- not here, over a payload this file wrote itself.
#
# SO THE ROW IS REMOVED AT THREE POSITIONS, NOT ONE. First, middle and last are
# what a prefix comparison, a suffix comparison and a header-plus-tail
# comparison respectively fail to tell apart, and a single removal at any one of
# them leaves the other two untested. The three share one fixture, so a case
# that passes because the payload was malformed rather than because the row was
# missing is not available.
#
# THE THREE ARE UNROLLED, NOT LOOPED (PR #1061 round 1, finding 3). This file
# already unrolls the `ListAgents` case for the reason stated at it: a case
# string composed at runtime is not in the file, and `check-registry-
# conformance.sh` resolves a registry `efficacy` cite by finding the literal
# here. Nothing cites these three today; following the convention now is what
# keeps citing one later a registry edit rather than a rewrite of this section.
rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"

CALL17="$RUN/terrain-tag-selection-17.gate-call.json"
python3 - "$CALL17" <<'PY17'
import json, sys

# Seventeen tags plus the header, which is the shape the Issue pins. The counts
# are the fixture's own and are never read from a survey -- this case is about
# the payload comparison, not about what a survey computes.
TAGS = [("agents", 4), ("altitude", 3), ("boundary", 9), ("carrier", 12),
        ("consultation", 6), ("degradation", 2), ("emission", 5), ("gate", 14),
        ("harness", 7), ("isolation", 3), ("ledger", 4), ("licence", 8),
        ("pin", 11), ("receipt", 6), ("removal", 2), ("seam", 10),
        ("vitality", 5)]
assert len(TAGS) == 17, len(TAGS)

listing = "\n".join(["tag           count"]
                    + [f"{t:<14}{c}" for t, c in TAGS])
json.dump({"questions": [{
    "question": listing + "\n\nWhich tag does the survey open on?",
    "header": "selection",
    "multiSelect": False,
    "options": [
        {"label": "Use a method other than co-tags", "description": "other-method"},
        {"label": "Answer in your own words instead", "description": "free text"},
    ],
}]}, open(sys.argv[1], "w"), indent=2)
PY17

cat >"$GATES/$INSTANCE.json" <<JSON
{ "gate_instance_id": "$INSTANCE", "gate_id": "terrain-tag-selection",
  "question": "Which tag does the survey open on?",
  "declaration_path": "$RUN/terrain-tag-selection.run-declaration.json",
  "capture_path": "$RUN/terrain.gate-capture.json",
  "gate_call_path": "$CALL17",
  "gate_call_unavailable": null,
  "session_id": "$SESSION",
  "opened_at": "2999-01-01T00:00:00.000Z" }
JSON

EXACT17="$(cat "$CALL17")"
if [[ "$(python3 -c '
import json,sys
q=json.load(open(sys.argv[1]))["questions"][0]["question"]
print(len(q.split("\n\n")[0].splitlines()))' "$CALL17")" == "18" ]]; then
  pass "the fixture payload carries all 17 rows and their header"
else
  bad "the 17-row fixture is not 17 rows plus a header — every removal case below would be measured against the wrong table"
fi

[[ "$(pre AskUserQuestion "$EXACT17" | decision)" == "allow" ]] \
  && pass "the exact 17-row payload is admitted" \
  || bad "the exact 17-row payload was not admitted — a survey at the current pin has no admissible act and the run is wedged"

# `row` is the 1-based index into the seventeen data rows; the header is line 0
# of the listing and is never the row removed.
drop_row() { python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
q=d["questions"][0]["question"]
listing,tail=q.split("\n\n",1)
lines=listing.splitlines()
del lines[int(sys.argv[2])]
d["questions"][0]["question"]="\n".join(lines)+"\n\n"+tail
print(json.dumps(d))' "$CALL17" "$1"; }

[[ "$(pre AskUserQuestion "$(drop_row 1)" | decision)" == "deny" ]] \
  && pass "17-row table with the first row removed — denied" \
  || bad "a 17-row table with the first row removed was ADMITTED; the owner can be shown sixteen of seventeen tags and choose among them with nothing saying one was withheld"
[[ "$(pre AskUserQuestion "$(drop_row 9)" | decision)" == "deny" ]] \
  && pass "17-row table with a middle row removed — denied" \
  || bad "a 17-row table with a middle row removed was ADMITTED; the owner can be shown sixteen of seventeen tags and choose among them with nothing saying one was withheld"
[[ "$(pre AskUserQuestion "$(drop_row 17)" | decision)" == "deny" ]] \
  && pass "17-row table with the last row removed — denied" \
  || bad "a 17-row table with the last row removed was ADMITTED; the owner can be shown sixteen of seventeen tags and choose among them with nothing saying one was withheld"
rm -f "$GATES"/*.json "$RUN/terrain.gate-capture.json"

if [[ $FAILED -eq 0 ]]; then
  echo "catch: open-gate exclusivity — the gate interval admits one act, ends on an answer, and survives the prose being deleted"
  exit 0
fi
echo "FAIL: checks/check-open-gate-exclusivity.sh"
exit 1
