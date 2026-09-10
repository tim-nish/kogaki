#!/usr/bin/env bash
# The Terrain executor's invocation boundary (kogaki#1027).
#
# WHAT THIS CHECKS THAT NOTHING ELSE CAN. `src/terrain.mjs self-test` drives the
# executor end to end — the payload refusal, the attribution on every
# transition, the deleted flags refused by name, the start act's own executor
# kind — so the RUNTIME's half is covered there, beside the code it belongs to.
# What that pass cannot reach is the other half of the same instrument, which
# does not live in the runtime at all:
#
#   1. THE DENY. The start act attributes its own transitions to the skill
#      expansion with no hook payload behind them, so the field is only worth
#      reading because a model cannot type `terrain.mjs start` in Bash and mint
#      a start-attributed record at will. The prohibition is a Python
#      PreToolUse hook; a JavaScript fixture pass cannot exercise it.
#   2. THE REMOVAL TEST (acceptance item 4). The claim is that the executor's
#      behaviour is carried by the executor and the hooks rather than by the
#      prose around them — so the same run, performed with the skill file
#      reduced to its one `!` line and `specs/spec-terrain/` absent from the
#      tree, must produce byte-equal artifacts. That is a claim about the TREE,
#      and no pass running inside the tree can make it.
#
# ITS REGISTRATION IS NOT ASSERTED, on `check-gate-capture-hook.sh`'s own
# ground: hook wiring is machine-local and never committed, so a check
# asserting it would fail on every fresh clone and would be asserting a fact
# about a machine rather than about this repository.
#
# THEIR ORDER IN `.claude/settings.json` IS (kogaki#1075), and the two are not
# the same claim. Whether a machine LOADED that file is machine-local and stays
# unasserted; what the file SAYS is tracked in this repository and reads the
# same on every clone. It became worth asserting when the capture row stopped
# being a convenience for the advance hook and became its precondition: run the
# two the other way round and every first advance is a silent no-op.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO=$PWD

fail=0
cases=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }
pass() { cases=$((cases + 1)); }

DENY=.claude/hooks/gate-terrain-executor.py
ADVANCE=.claude/hooks/advance-terrain.py
SKILL=.claude/skills/terrain/SKILL.md

# ---- INSTALLABILITY. The facts a reader would otherwise take on trust.
for f in "$DENY" "$ADVANCE"; do
  if [ ! -f "$f" ]; then
    bad "$f is missing — the executor's invocation boundary has no carrier"
    continue
  fi
  if python3 -c "import ast,sys;ast.parse(open('$f').read())" 2>/dev/null; then
    pass
  else
    bad "$f does not parse as Python — a hook that cannot load enforces nothing, and PreToolUse load failures are silent to the model"
  fi
done

# ---- THE SKILL FILE CARRIES EXACTLY ONE `!` LINE (acceptance item 1's shape).
# More than one and the harness runs an act nobody declared; none and the run is
# started by whatever the model decides to type, which is the defect.
bangs=$(grep -c '^!' "$SKILL" 2>/dev/null || echo 0)
if [ "$bangs" = "1" ]; then pass; else
  bad "$SKILL carries $bangs '!' line(s); exactly one is owed, running the start act"
fi
# THE FORM IS THE HARNESS'S, NOT OURS: a skill line executes at invocation only
# as `!` immediately followed by a backtick-quoted command (Claude Code skills
# documentation, "Inject dynamic context"). `!node …` and `! node …` are plain
# text and never ran -- which is how every Terrain run before 2026-09-09 was
# started by whatever the model typed.
# The Bash pattern is pre-allowed in the frontmatter, because an un-allowed
# pattern aborts the invocation instead of prompting; the line is load-bearing
# for the start act and is asserted with it.
if grep -q '^allowed-tools: Bash(node src/terrain.mjs start)$' "$SKILL" 2>/dev/null; then pass; else
  bad "$SKILL does not pre-allow \`Bash(node src/terrain.mjs start)\` in its frontmatter — without it the harness aborts the skill invocation instead of running the start act"
fi
if grep -q '^!`node src/terrain.mjs start`$' "$SKILL" 2>/dev/null; then pass; else
  bad "$SKILL's '!' line is not \`!\\\`node src/terrain.mjs start\\\`\` (backtick-quoted, no space) — any other form is plain text the harness never executes"
fi

# ---- ACCEPTANCE 3. THE DENY FIRES, AND ADMITS `--status`.
# Driven over synthesized PreToolUse payloads, which is the shape the dispatcher
# hands it in a real call.
deny_verdict() {
  python3 "$DENY" <<PY 2>/dev/null
{"tool_name": "Bash", "tool_input": {"command": $(python3 -c "import json,sys;print(json.dumps(sys.argv[1]))" "$1")}}
PY
}
assert_denied() {
  local label=$1 cmd=$2 out
  out=$(deny_verdict "$cmd")
  if printf '%s' "$out" | grep -q '"permissionDecision": "deny"'; then pass; else
    bad "the deny does not fire on $label: \`$cmd\` — a model-typed route into the executor makes the start attribution unfalsifiable"
  fi
}
assert_admitted() {
  local label=$1 cmd=$2 out
  out=$(deny_verdict "$cmd")
  if [ -z "$out" ]; then pass; else
    bad "the deny fires on $label: \`$cmd\` — $ADMITTED_NOTE"
  fi
}
ADMITTED_NOTE="--status is read-only and is the one route by which a stuck run can be inspected"

assert_denied "the run verb"          "node src/terrain.mjs run --run-dir /tmp/x"
assert_denied "the start verb"        "node src/terrain.mjs start"
assert_denied "an absolute path"      "node $REPO/src/terrain.mjs run"
assert_denied "a chained command"     "cd /tmp && node ./src/terrain.mjs report --all-groups"
assert_denied "a bare invocation"     "node src/terrain.mjs"
assert_admitted "the status verb"     "node src/terrain.mjs run --run-dir /tmp/x --status"
assert_admitted "an unrelated command" "node src/draft.mjs run"
# `--status-key` must not admit: a flag that merely STARTS with the admitted one
# is not the admitted one, and this is the shape a prefix match gets wrong.
assert_denied "a flag resembling --status" "node src/terrain.mjs run --status-key in_review"
# `start --status` must not admit: the flag rode through on the wrong verb and
# the start act opened a workspace before it read the flag (PR #1040 round 1).
assert_denied "a status flag on the start verb" "node src/terrain.mjs start --status"

# THE ADMISSION IS PER SEGMENT, NOT PER COMMAND (PR #1034 round 1, finding 2).
# A whole-string read admits every segment on one segment's `--status`, so an
# inspection command chained to a start act rides through and mints a
# skill-expansion-attributed record from Bash — the one route the executor's
# self-declared kind is only trustworthy because it is closed.
assert_denied "a status read chained to a start"   "node src/terrain.mjs run --status; node src/terrain.mjs start"
assert_denied "a status read &&-chained to a run"  "node src/terrain.mjs run --status && node src/terrain.mjs run"
assert_denied "a start piped from a status read"   "node src/terrain.mjs run --status | node src/terrain.mjs start"
# ...and the inspection route survives the split: two status reads in one
# command are still two status reads.
assert_admitted "two chained status reads" "node src/terrain.mjs run --status; node src/terrain.mjs run --run-dir /tmp/y --status"

# THE ANCHOR IS THE INVOCATION SHAPE, NOT THE BARE FILENAME (kogaki#1063).
#
# The first cut matched `\bterrain\.mjs\b` anywhere in a segment, so the one act
# that MUST name the executor's path and has no route around it -- an Issue
# declaring its own file footprint -- was refused as though it were an
# invocation, while kogaki#997 refuses the routing that omits the footprint. No
# Issue whose work is in this executor could be truthfully admitted at all
# (kogaki#1062, the live case). These cases each fail a hook that lacks the
# command-position clause.
#
# NAMING IS NOT RUNNING. A path in DATA position passes.
assert_admitted "an Issue's footprint cell" \
  "issue-sync admit-issue verdict 1062 --plan-cell 'act=implement-issue;files=src/terrain.mjs'"
assert_admitted "a footprint cell of several paths" \
  "issue-sync admit-issue verdict 1062 --plan-cell 'files=src/terrain.mjs,src/workflow.json'"
assert_admitted "a grep pattern over the executor" 'grep -n "judgePrompt" src/terrain.mjs'
assert_admitted "a comment mentioning the executor" "echo hi # src/terrain.mjs run is denied"
assert_admitted "the file read as data" "wc -l src/terrain.mjs"

# ...AND RUNNING IS STILL RUNNING, in every reachable spelling. The multi-
# spelling property the first matcher was written for is preserved: the anchor
# moved from the filename alone to a path in command position, which every one
# of these still satisfies.
assert_denied "a relative path"            "node src/terrain.mjs start"
assert_denied "a dot-slash path"           "node ./src/terrain.mjs run"
assert_denied "an absolute path (literal)" "node /abs/path/terrain.mjs run"
assert_denied "a worktree path"            "node /tmp/wt1063/src/terrain.mjs start"
# Direct execution carries no interpreter token at all: the path IS the command.
assert_denied "direct execution"           "./src/terrain.mjs run"
assert_denied "direct execution, absolute" "/abs/path/terrain.mjs start"
# The command position survives what stands in front of it.
assert_denied "an interpreter behind sudo" "sudo node src/terrain.mjs start"
assert_denied "a leading env assignment"   "NODE_ENV=x node src/terrain.mjs start"
assert_denied "an exec'd direct run"       "exec ./src/terrain.mjs run"
assert_denied "a quoted -c payload"        'bash -c "node src/terrain.mjs start"'
assert_denied "a -c payload, no interpreter" "sh -c 'src/terrain.mjs run'"
# A version-suffixed interpreter is covered by shape, not by enumeration.
assert_denied "a version-suffixed node"    "node20 src/terrain.mjs start"
# The PR #1040 round 1 finding, re-asserted at the new anchor.
assert_admitted "the status verb at the new anchor" "node src/terrain.mjs run --status"
assert_denied "a status flag on the start verb, at the new anchor" "node src/terrain.mjs start --status"

# AN OPTION BETWEEN THE INTERPRETER AND THE PATH (PR #1064 round 1, blocking).
# A walk back over a fixed prefix set stopped on `--no-warnings`, so the segment
# read as data and rode through -- UNDER-refusal on the ordinary Bash route,
# which is the one direction this hook declares it never errs in. An option
# belongs to whatever precedes it, and so does the token an option takes.
assert_denied "an interpreter flag before the path"  "node --no-warnings src/terrain.mjs start"
assert_denied "a source-maps flag before the path"   "node --enable-source-maps src/terrain.mjs start"
assert_denied "an option that takes an argument"     "node -r foo src/terrain.mjs run"
# ...and the option rule must not swallow the command itself: a grep whose
# pattern follows a flag is still a grep.
assert_admitted "a flagged grep over the executor"   'grep -n "judgePrompt" src/terrain.mjs'
assert_admitted "a flagged read of the executor"     "head -100 src/terrain.mjs"

# THE RUNNERS A DIRECT EXECUTION IS REACHED THROUGH (PR #1064 round 1). With no
# interpreter token the path must be first-after-transparent, so a runner that
# is not a member admits an execution the bare-literal matcher denied.
assert_denied "a timeout-wrapped direct run" "timeout 300 ./src/terrain.mjs start"
assert_denied "an xargs-wrapped direct run"  "xargs ./src/terrain.mjs start"
assert_denied "a setsid-wrapped direct run"  "setsid ./src/terrain.mjs run"
assert_denied "a stdbuf-wrapped direct run"  "stdbuf -o0 ./src/terrain.mjs start"

# THE ADMISSION READS THE ANCHOR'S OWN ARGUMENTS (PR #1064 round 1). The verb
# read searched the raw segment for the filename, so a data mention standing
# EARLIER in the segment supplied the verb for a LATER invocation: the deny
# fired on the anchor and the admission then let it through on someone else's
# `run`.
assert_denied "a data mention supplying the verb" \
  "NOTE=terrain.mjs run node src/terrain.mjs start --status"
# ...and the mirror: a data mention must not hide an invocation behind it.
assert_denied "an invocation after a data mention" \
  "echo src/terrain.mjs run --status node src/terrain.mjs start"

# THE HOOK'S CHILD BOUND FIRES BEFORE THE HARNESS'S OWN (PR #1034 round 1,
# finding 3). A bound set AT the default can never fire first, which is a
# declared bound that does nothing; the relay message it exists to make
# reachable is only reachable below it.
if python3 -c 'import re,sys; src=open(".claude/hooks/advance-terrain.py",encoding="utf-8").read(); m=re.search(r"^ADVANCE_TIMEOUT_S = (\d+)$", src, re.M); sys.exit(0 if m and int(m.group(1)) < 600 else 1)'; then
  pass
else
  bad "advance-terrain.py's ADVANCE_TIMEOUT_S is not below the harness's 600s hook default — a child bound at or above it cannot fire first, so the timeout relay it exists for is unreachable"
fi

# THE ADVANCE HOOK SPENDS NOTHING ON A QUESTION THAT IS NOT A TERRAIN GATE
# (PR #1034 round 1, finding 1). With no open run there is nothing to advance,
# and the first cut spawned the executor anyway — minting a workspace and
# pruning the lane on every unrelated question answered in this repository.
if [ -e runs/terrain/open-run ]; then
  note "skipped: a Terrain run is open in this tree, so the no-open-run precondition cannot be staged here"
else
  noise=$(printf '%s' '{"tool_name":"AskUserQuestion","tool_use_id":"toolu_x","tool_response":{"answers":{"q":"a"}}}' | python3 .claude/hooks/advance-terrain.py 2>&1)
  if [ -z "$noise" ] && [ ! -e runs/terrain/open-run ]; then pass; else
    bad "advance-terrain.py acted on a question with no open Terrain run: ${noise:-(silent, but a workspace pointer appeared)}"
  fi
fi

# ---- kogaki#1075. THE ADVANCE IS KEYED TO THE OPEN RUN'S OWN CAPTURE ROW.
#
# The precondition used to be "an open-run pointer exists", and the trigger
# "any AskUserQuestion carrying answers". Neither names the run's gate, so
# while a run stayed open every question in every session rooted at this tree
# advanced it. On 2026-09-10 a `/ship-cycle` cleanup question in another
# session walked a parked run through two states and three failed judgments,
# attributed to a `tool_use_id` that answered the cleanup plan.
#
# THE THREE CASES ARE THE DISCRIMINATION, not one of them alone: a hook that
# advanced nothing would pass (a) and (c) and fail (b), and the first cut
# passes (b) and fails the other two.
#
# STAGED AGAINST A REAL RUN DIRECTORY, with `KOGAKI_OPEN_RUN` naming a pointer
# of this pass's own — the seam-free half of what `src/terrain.mjs self-test`
# covers on the executor's side, run here because the HOOK is Python and that
# pass is JavaScript.
CAPSUF=$(python3 -c 'import json;print(json.load(open("src/gate-schema.json"))["capture"]["suffix"])')
# The constant the hook copies, compared rather than trusted — the discipline
# `check-gate-capture-hook.sh` applies to the option-set digest, for the same
# reason: two spellings of one schema key in two languages.
if grep -q "^CAPTURE_SUFFIX = \"$CAPSUF\"$" "$ADVANCE"; then pass; else
  bad "$ADVANCE's CAPTURE_SUFFIX does not equal src/gate-schema.json's capture.suffix ($CAPSUF) — the hook would look for the capture under a name nothing writes, and every advance would silently stop"
fi

hooktmp=$(mktemp -d) || bad "no temp directory for the advance-keying cases — CANNOT-DETERMINE, never a pass"
if [ -n "${hooktmp:-}" ] && [ -d "$hooktmp" ]; then
  # A run record awaiting the shipped table's gate, with the declaration and
  # the capture row a real raising leaves behind. Composed by python3 so the
  # option-set digest is the one the executor recomputes rather than a literal
  # that would rot the first time the canonical form moved.
  stage_run() {                      # $1 dir, $2 the capture row's tool_use_id
    python3 - "$1" "$2" "$CAPSUF" <<'PY'
import hashlib, json, os, sys, uuid
d, tuid, suffix = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(d, exist_ok=True)
gate_id, instance = "terrain-tag-selection", str(uuid.uuid4())
options = [{"id": "other-method", "label": "Some other method entirely"}]
decl = {"id": gate_id, "gate_instance_id": instance, "options": options,
        "question": "Which tag?"}
decl_path = os.path.join(d, f"{gate_id}.gate-declaration.json")
with open(decl_path, "w") as f: json.dump(decl, f)
# THE TABLE VERSION IS READ, NEVER A LITERAL (PR #1077 round 1). The executor
# hard-refuses a resume across a table version change, so a hardcoded 16 turns
# this case red at the next bump with a message blaming the keying -- while (a)
# and (c) keep passing vacuously, because they assert that nothing happened.
# The digest two lines down is computed for the same reason, one line earlier.
with open("src/workflow.json", encoding="utf-8") as f:
    table_version = json.load(f)["version"]
with open(os.path.join(d, "run-record.json"), "w") as f:
    json.dump({"workflow": {"path": "src/workflow.json", "version": table_version},
               "completed": [], "waits_reached": [], "conditional_entered": [],
               "conditional_skipped": [], "awaiting": "TAG_SELECTION",
               "owner_input": {}, "artifacts_written": [], "judgments": {},
               "gate_declarations_owed": [{"state": "TAG_SELECTION",
                                           "declaration": decl_path}],
               "transitions": [], "done": False}, f)
if tuid:
    canonical = json.dumps([gate_id, [o["id"] for o in options]], separators=(",", ":"))
    with open(os.path.join(d, f"terrain{suffix}"), "w") as f:
        json.dump({"rows": [{
            "stop_id": f"stop-{instance}", "gate_id": gate_id,
            "gate_instance_id": instance,
            "evidence": {"tool": "AskUserQuestion", "tool_use_id": tuid},
            "answers_over": {"option_set_digest":
                             hashlib.sha256(canonical.encode()).hexdigest()},
            "payload": {"options_offered": [o["id"] for o in options],
                        "free_text_offered": True,
                        "answer": {"free_text": "a-tag"}},
        }]}, f)
PY
  }
  fire_advance() {                   # $1 run dir, $2 payload tool_use_id, $3 session
    local d=$1 tuid=$2 sid=$3 ptr
    ptr="$hooktmp/pointer-$(basename "$d")"
    printf '%s\n' "$d" > "$ptr"
    # THE PAYLOAD IS THE HARNESS'S SHAPE, all three fields: the executor reads
    # `hook_event_name`, `session_id` and `tool_use_id` and refuses a payload
    # missing any of them, so a fixture that sent two would be testing that
    # refusal rather than the keying.
    printf '{"tool_name":"AskUserQuestion","hook_event_name":"PostToolUse","session_id":"%s","tool_use_id":"%s","tool_response":{"answers":{"Which tag?":"a-tag"}}}' \
      "$sid" "$tuid" \
      | KOGAKI_OPEN_RUN="$ptr" KOGAKI_OPEN_GATES="$hooktmp/gates" python3 "$ADVANCE" 2>&1
  }

  # (a) A QUESTION THAT PRODUCED NO CAPTURE ROW LEAVES THE RECORD UNCHANGED.
  # This is the live defect: the run is open, the pointer is there, and the
  # question belongs to somebody else.
  a_dir="$hooktmp/no-row"; stage_run "$a_dir" ""
  a_before=$(md5sum < "$a_dir/run-record.json")
  a_out=$(fire_advance "$a_dir" "toolu_another_sessions_cleanup_plan" "some-other-session")
  a_after=$(md5sum < "$a_dir/run-record.json")
  if [ "$a_before" = "$a_after" ]; then pass; else
    bad "a question with no capture row advanced the open run — this is kogaki#1075's defect: the record moved on an answer given to something else${a_out:+ ($a_out)}"
  fi
  # ...and it says nothing, because an unrelated question is answered in this
  # repository every day and a note on each is noise on the common path.
  if [ -z "$a_out" ]; then pass; else
    bad "the advance hook spoke on an ordinary non-gate question: $a_out"
  fi

  # (b) THE SAME PAYLOAD, AFTER THE CAPTURE ROW EXISTS, ADVANCES. Without this
  # case a hook that advanced nothing at all would pass the pass.
  b_dir="$hooktmp/with-row"; stage_run "$b_dir" "toolu_the_gates_own_question"
  b_before=$(md5sum < "$b_dir/run-record.json")
  b_out=$(fire_advance "$b_dir" "toolu_the_gates_own_question" "some-session")
  b_after=$(md5sum < "$b_dir/run-record.json")
  b_rec=$(python3 -c 'import json,sys;print(",".join(json.load(open(sys.argv[1]))["completed"]))' "$b_dir/run-record.json" 2>/dev/null)
  if [ "$b_before" != "$b_after" ] && printf '%s' "$b_rec" | grep -q 'TAG_SELECTION'; then pass; else
    bad "the payload whose id the capture row carries did NOT advance the run — the keying refuses the one question it exists to admit. completed=[$b_rec] ${b_out:-(silent)}"
  fi
  # ...AND WHERE THE RUN THEN STOPPED IS NAMED, NOT LEFT INVISIBLE (PR #1077
  # round 1). The advance hook relays a non-zero executor exit on stderr, so
  # `$b_out` is this case's reading of that exit. It is NOT asserted empty: the
  # hook takes no `--workflow`, so this fires against the SHIPPED table and the
  # run walks on past the state under test into `compose_input`, which refuses
  # over a staged record carrying no survey. That refusal is expected and its
  # NAME is the assertion -- an executor that advanced the gate and then died
  # INSIDE it, or that stopped for a reason about the capture, is a different
  # outcome and this case now tells them apart instead of passing on both.
  if [ -z "$b_out" ] || ! printf '%s' "$b_out" | grep -qE 'TAG_SELECTION|terrain-tag-selection'; then pass; else
    bad "the executor stopped AT the gate under test rather than past it — the row was read and the advance still did not clear TAG_SELECTION: $b_out"
  fi

  # (c) A PAYLOAD FROM ANOTHER SESSION, WITH AN IDENTICAL ANSWER, DOES NOT
  # ADVANCE. The answer text is the same and the question text is the same:
  # what differs is the id, which is the only field that identifies the act.
  c_dir="$hooktmp/other-session"; stage_run "$c_dir" "toolu_the_gates_own_question"
  c_before=$(md5sum < "$c_dir/run-record.json")
  c_out=$(fire_advance "$c_dir" "toolu_a_different_question_same_words" "a-different-session")
  c_after=$(md5sum < "$c_dir/run-record.json")
  if [ "$c_before" = "$c_after" ]; then pass; else
    bad "an identical answer from another session's question advanced the run — matching on the answer's CONTENT is exactly what the tool_use_id exists to replace${c_out:+ ($c_out)}"
  fi

  rm -rf "$hooktmp"
fi

# ---- kogaki#1075 ITEM 3. THE TWO HOOKS' ORDER, ASSERTED.
#
# The capture hook writes the row the advance hook now reads as its
# precondition, so a registration running them the other way round would make
# every first advance a silent no-op — the failure mode with no error in it.
#
# ASSERTED HERE DESPITE THIS FILE'S HEADER, and the distinction is the point:
# the header declines to assert that a hook is registered ON THIS MACHINE,
# because that wiring is machine-local. `.claude/settings.json` is TRACKED in
# this repository, so its contents are a fact about the repository, and their
# ORDER is a claim this pass can make on any clone. What is still not asserted
# is that any machine loaded it.
# THE ASSERTION IS ABOUT THE COMMIT, NEVER THE CHECKOUT (kogaki#1052, applied
# here at PR #1077 round 1). The review lane builds its worktree WITHOUT
# `.claude/settings.json` on purpose, so a read from the working tree fails on
# every round -- a check defect arriving as a finding, which is what
# `check-open-gate-exclusivity.sh` already ruled on for the sibling case and
# repaired with `git show HEAD:`. It is also what this block's own ground asks
# for: the claim is what the TRACKED file says, not what a checkout holds.
settings_committed=$(mktemp) || settings_committed=""
if [ -z "$settings_committed" ] || ! git show HEAD:.claude/settings.json >"$settings_committed" 2>/dev/null; then
  bad ".claude/settings.json could not be read from HEAD — the order the advance's precondition depends on has no carrier in this commit"
else
  order=$(python3 - "$settings_committed" <<'PY'
import json, sys
doc = json.load(open(sys.argv[1], encoding="utf-8"))
text = json.dumps(doc.get("hooks", {}).get("PostToolUse", []))
cap, adv = text.find("write-gate-capture.py"), text.find("advance-terrain.py")
print("missing" if cap < 0 or adv < 0 else ("ok" if cap < adv else "reversed"))
PY
)
  if [ "$order" = "ok" ]; then pass; else
    bad "the committed .claude/settings.json registers the PostToolUse hooks in the order '$order' — write-gate-capture.py must run BEFORE advance-terrain.py, because since kogaki#1075 the row it writes is the advance's precondition and a reversed order makes every first advance a silent no-op"
  fi
  rm -f "$settings_committed"
fi

# ---- ACCEPTANCE 4. THE REMOVAL TEST.
# The same start act, run once in this tree and once in a tree holding only the
# runtime and the hooks — the skill file reduced to its `!` line, and
# `specs/spec-terrain/` absent entirely. Byte-equal artifacts are the claim.
#
# TIMESTAMPS AND ABSOLUTE PATHS ARE NORMALISED, and that is not a weakening of
# "byte-equal": a wall clock and a temp directory differ between any two runs of
# anything, so comparing them would assert that the test harness is
# deterministic rather than that the runtime is prose-independent.
tmp=$(mktemp -d) || { bad "no temp directory — the removal test could not run, which is CANNOT-DETERMINE and never a pass"; }
if [ -n "${tmp:-}" ] && [ -d "$tmp" ]; then
  trap 'rm -rf "$tmp"' EXIT

  cat > "$tmp/table.json" <<'JSON'
{"version": 1, "states": [
  {"id": "a", "kind": "compute"},
  {"id": "W", "kind": "wait", "owner_supplies": "something"},
  {"id": "done", "kind": "terminal"}
]}
JSON

  normalise() {
    python3 - "$1" <<'PY'
import json, re, sys
rec = json.load(open(sys.argv[1]))
rec["workflow"]["path"] = "<table>"
for t in rec.get("transitions", []):
    t["at"] = "<at>"
print(json.dumps(rec, indent=2, sort_keys=True))
PY
  }

  # The golden run, in this tree.
  mkdir -p "$tmp/gold"
  if node src/terrain.mjs start --run-dir "$tmp/gold" --workflow "$tmp/table.json" >/dev/null 2>"$tmp/gold.err"; then
    pass
  else
    bad "the golden start act failed in this tree: $(head -1 "$tmp/gold.err")"
  fi

  # The reduced tree: the runtime and the hooks, and nothing else this lane
  # writes prose into.
  mkdir -p "$tmp/red/src" "$tmp/red/.claude/hooks" "$tmp/red/.claude/skills/terrain"
  cp -r src/. "$tmp/red/src/"
  cp .claude/hooks/*.py "$tmp/red/.claude/hooks/"
  printf '!`node src/terrain.mjs start`\n' > "$tmp/red/.claude/skills/terrain/SKILL.md"
  if [ -e "$tmp/red/specs" ]; then
    bad "the reduced tree carries specs/ — the removal test asserts the runtime works with the spec absent, so a copy of it defeats the test"
  else
    pass
  fi

  mkdir -p "$tmp/redrun"
  if node "$tmp/red/src/terrain.mjs" start --run-dir "$tmp/redrun" --workflow "$tmp/table.json" >/dev/null 2>"$tmp/red.err"; then
    pass
  else
    bad "the start act failed with the spec absent and the skill file reduced to its '!' line: $(head -2 "$tmp/red.err" | tr '\n' ' ')"
  fi

  if [ -f "$tmp/gold/run-record.json" ] && [ -f "$tmp/redrun/run-record.json" ]; then
    if diff -u <(normalise "$tmp/gold/run-record.json") <(normalise "$tmp/redrun/run-record.json") > "$tmp/diff" 2>&1; then
      pass
    else
      bad "the reduced tree's artifacts are NOT byte-equal to the golden run's — something the executor does is carried by the prose rather than by the code:
$(head -30 "$tmp/diff")"
    fi
  else
    bad "one of the two runs wrote no run record, so byte-equality could not be established — CANNOT-DETERMINE, never a pass"
  fi

  # THE DENY RIDES THE REMOVAL TEST (owner constraint, 2026-09-09). The
  # self-declared start attribution is only trustworthy because the Bash route
  # is denied, so a reduced tree in which the deny no longer fires has not
  # reproduced the golden run's guarantees however equal its artifacts are.
  redout=$(python3 "$tmp/red/.claude/hooks/gate-terrain-executor.py" <<'PY' 2>/dev/null
{"tool_name": "Bash", "tool_input": {"command": "node src/terrain.mjs start"}}
PY
)
  if printf '%s' "$redout" | grep -q '"permissionDecision": "deny"'; then pass; else
    bad "the deny does not fire in the reduced tree — the start act's self-declared executor kind is unguarded there, so the artifacts being equal proves less than it appears to"
  fi
fi

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass — the executor's Bash route denied with --status admitted, the skill file's single start line, and the removal test's byte-equal artifacts with the spec absent and the deny still firing (kogaki#1027)"
  note "also asserted: the advance is keyed to the open run's OWN capture row — a question that wrote none leaves the record untouched and says nothing, the question that wrote one advances it, and an identical answer from another session's question does not (kogaki#1075); and .claude/settings.json registers write-gate-capture.py before advance-terrain.py, which that keying depends on."
  note "not asserted here: that either hook is LOADED on this machine. That wiring is machine-local and never committed, so asserting it would fail on every fresh clone and would be a claim about a machine rather than about this repository — which is why the order above is read from the tracked file rather than from a live registration."
fi
exit "$fail"
