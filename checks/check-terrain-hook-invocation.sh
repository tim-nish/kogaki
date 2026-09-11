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
  # THE STUB THE STAGED RECORD'S RESOLVED JUDGE BINARY POINTS AT (kogaki#1079,
  # PR #1080 round 1). It is a real file that really answers `--version`, so the
  # record below names something that exists rather than a plausible path; no
  # case here reaches a judgment state, so it is never spawned for a judgment.
  judge_stub="$hooktmp/judge-stub"
  printf '#!/bin/sh\n[ "$1" = --version ] && { echo "terrain-fixture judge stub 0"; exit 0; }\necho "the fixture judge stub was asked to judge; no case in this file reaches a judgment state" >&2\nexit 1\n' > "$judge_stub"
  chmod +x "$judge_stub"

  stage_run() {                      # $1 dir, $2 the capture row's tool_use_id
    python3 - "$1" "$2" "$CAPSUF" "$REPO/checks/fixtures/survey/lone-tag-member.json" "$judge_stub" <<'PY'
import hashlib, json, os, sys, uuid
d, tuid, suffix, survey_record, judge_stub = sys.argv[1:6]
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
               # `survey` IS ALREADY COMPLETE, AND THE RECORD IT MINTS IS
               # SUPPLIED (kogaki#1079). A record staged with `completed: []`
               # resumes at the table's FIRST state, which is `survey` -- and
               # `survey` reads the policy seam. So this case reached its own
               # subject only on a machine with the gateway up, and was RED in
               # CI on the one member the licence adds. This file's members are
               # seam-free by construction, so the state that needs the seam is
               # staged as done. `survey_record` is supplied WITH it because
               # completing the state alone is not enough: `needSurvey` reads
               # this field and every state after the gate goes through it, so
               # `completed: ["survey"]` on its own moves the failure to a crash
               # on the absent record. The path is the committed fixture, a
               # truthful survey record this repository already keeps, rather
               # than a shell re-implementation of the executor's own schema.
               "completed": ["survey"], "survey_record": survey_record,
               # AND THE START ACT'S OTHER PRODUCT, for the same reason
               # (kogaki#1079, PR #1080 round 1). `ensureJudgeBinary` runs on
               # EVERY act, before the survey and before an outstanding wait is
               # re-entered, and it resolves the table's `judge.command` --
               # `"claude"` -- over PATH, refusing where no candidate answers
               # `--version`. A CI runner carries no such binary, so the
               # executor refused before it reached the gate and this case read
               # `completed=[survey]` with the record unmoved: kogaki#1079's own
               # defect on a second axis, arriving with kogaki#1076/#1078. A
               # record that already carries the field is never re-resolved, so
               # staging it is what makes the trio depend on NOTHING outside
               # this repository -- neither the policy seam nor a judge install.
               # `stubbed` is true because it is one, and the path is a real
               # file this block writes; no case here reaches a judgment state,
               # so the stub answers `--version` and nothing else.
               "judge_binary": {"command": "claude", "path": judge_stub,
                                "version": "terrain-fixture judge stub 0",
                                "stubbed": True},
               "waits_reached": [], "conditional_entered": [],
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
  # over the staged survey because the free text the capture row carries is no
  # tag in that survey's vocabulary. That refusal is expected and its NAME is
  # the assertion -- an executor that advanced the gate and then died INSIDE
  # it, or that stopped for a reason about the capture, is a different outcome
  # and this case tells them apart.
  #
  # THE ASSERTION IS POSITIVE (kogaki#1079, carrying PR #1077 round 2's
  # `class:vacuous-assertion` finding). Its previous form -- `[ -z "$b_out" ]`
  # OR the gate's name is absent -- passed on SILENCE while the comment above
  # said a name was being asserted, so a hook that relayed nothing at all
  # scored a pass here. What binds it is the refusal this case says it expects,
  # grepped for by name, conjoined with the gate's own name being absent.
  if printf '%s' "$b_out" | grep -q 'no candidate carries the served tag' \
     && ! printf '%s' "$b_out" | grep -qE 'TAG_SELECTION|terrain-tag-selection'; then pass; else
    bad "the executor did not stop where this case says it stops — past the gate under test, at \`compose_input\`'s refusal over the staged survey. Either it stopped AT the gate (the row was read and the advance still did not clear TAG_SELECTION) or it said nothing at all: ${b_out:-(silent)}"
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

  # ---- kogaki#1081. THE GATE THE ADVANCE OPENS REACHES THE SESSION.
  #
  # A PostToolUse hook reaches the model through exactly one channel -- the JSON
  # `hookSpecificOutput.additionalContext` field of its own stdout -- and the
  # advance hook wrote nothing on it. kogaki#1057 delivered the TAG gate's
  # payload on the start act's stdout, which the skill expansion hands over
  # before any tool exists to deny; every LATER gate is opened by this hook
  # instead, and its subprocess's stdout is captured and dropped. On 2026-09-10
  # the ID-selection gate opened with its call written and the session had no
  # admissible act that could fetch the bytes: the run recorded
  # `gate-unrendered` and was recovered by hand from outside the session.
  #
  # THE EXECUTOR IS STUBBED HERE, AND THAT IS THE POINT. What is under test is
  # what the hook does with the state an advance LEAVES BEHIND -- a pointer and
  # a written call, or neither -- so the two cases differ in exactly that state
  # and in nothing else. Driving the real executor to a second gate would need a
  # judged run and would put this case back on the machine-local dependencies
  # kogaki#1079 spent two rounds removing from the trio above.
  #
  # THE STUB REPO IS A REAL TREE, because `repo_root()` resolves from the hook
  # file's own location and the executor path is composed from it. So the hook
  # is COPIED beside a stub `src/terrain.mjs`: the copy is the shipped file, and
  # a fixture that re-implemented the hook would assert nothing about it.
  # ---- THE STAGED TIMESTAMPS ARE COMPUTED, NEVER WRITTEN (kogaki#1092).
  #
  # Every pointer below was staged with one fixed instant until this issue, and
  # `advance-terrain.py` drops a pointer whose `opened_at` is older than
  # `POINTER_TTL`. So this file passed on the day it was written and went red
  # twelve hours later, on every machine and in CI, with nothing in it moved:
  # master's own run at d4a4349 was green at 2026-09-10T23:12Z and returned
  # `failure` on re-run the next day at the same head, with no commit between.
  # A fixture that pins one side of a comparison to a literal while the other
  # side reads `now()` is asserting the calendar.
  #
  # THE OFFSETS ARE DERIVED FROM THE TTL, not chosen beside it. An offset of
  # "eleven hours" written here against a TTL of twelve is the same
  # two-declarations-of-one-fact shape at a smaller scale, and it is what makes
  # the next change to that constant silently re-arm the bomb. So the constant
  # is READ from the hook that declares it, by loading that hook as a module.
  ttl_s=$(python3 - "$REPO/$ADVANCE" <<'TTLPY' 2>/dev/null
import importlib.util, sys
spec = importlib.util.spec_from_file_location("advance_terrain_ttl", sys.argv[1])
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
print(int(mod.POINTER_TTL.total_seconds()))
TTLPY
) || ttl_s=""
  case "$ttl_s" in ''|*[!0-9]*)
    bad "the pointer TTL could not be read from $ADVANCE, so no staged timestamp below can be derived and every delivery case would assert the calendar instead — CANNOT-DETERMINE, never a pass"
    exit 1 ;;
  esac
  # Three instants, named for what they MEAN to the reader under test rather
  # than for their arithmetic: two comfortably inside the window, ordered so the
  # ordering case can oppose them to filename order, and one past it.
  stage_at() {                         # stage_at <seconds before now>
    python3 -c 'import sys,datetime as d;print((d.datetime.now(d.timezone.utc)-d.timedelta(seconds=int(sys.argv[1]))).isoformat().replace("+00:00","Z"))' "$1"
  }
  FIXTURE_OPENED_LIVE=$(stage_at "$((ttl_s / 4))")
  FIXTURE_OPENED_LIVE_OLDER=$(stage_at "$((ttl_s / 2))")
  FIXTURE_OPENED_EXPIRED=$(stage_at "$((ttl_s + 3600))")
  export FIXTURE_OPENED_LIVE FIXTURE_OPENED_LIVE_OLDER FIXTURE_OPENED_EXPIRED

  stub_repo="$hooktmp/stub-repo"
  mkdir -p "$stub_repo/.claude/hooks" "$stub_repo/src" "$stub_repo/rundir"
  cp "$ADVANCE" "$stub_repo/.claude/hooks/advance-terrain.py"
  # The capture row is this hook's precondition (the trio above), so the staged
  # run carries one naming the payload's own id -- otherwise the stub is never
  # spawned and both cases would pass on the narrowing rather than on the emit.
  python3 - "$stub_repo/rundir/terrain$CAPSUF" <<'PY'
import json, sys
with open(sys.argv[1], "w") as f:
    json.dump({"rows": [{"stop_id": "stop-fixture", "gate_id": "terrain-id-selection",
                         "gate_instance_id": "fixture-answered",
                         "evidence": {"tool": "AskUserQuestion",
                                      "tool_use_id": "toolu_the_gates_own_question"}}]}, f)
PY
  # THE RAISING STUB. It writes what `emitGateDeclaration` writes at a gate: the
  # byte-fixed call, and the open-gate pointer naming this run's capture.
  cat > "$stub_repo/src/terrain.mjs" <<'JS'
// ESM, because the executor is `.mjs` and node loads it as a module: `require`
// is not defined there, and a stub that used it would fail before writing
// anything -- which reads exactly like a hook that emitted nothing.
import fs from "node:fs";
import path from "node:path";
const dir = process.env.KOGAKI_RUN_DIR, gd = process.env.KOGAKI_OPEN_GATES;
const gate = "terrain-id-selection", instance = "fixture-raising";
const call = { questions: [{ question: "Which Strand ids?", header: "selection",
  multiSelect: true, options: [{ label: "L2", description: "the first" },
                               { label: "L5", description: "the second" }] }] };
const callPath = path.join(dir, gate + ".gate-call.json");
fs.writeFileSync(callPath, JSON.stringify(call, null, 2) + "\n");
fs.mkdirSync(gd, { recursive: true });
fs.writeFileSync(path.join(gd, instance + ".json"), JSON.stringify({
  gate_instance_id: instance, gate_id: gate, question: "Which Strand ids?",
  declaration_path: path.resolve(path.join(dir, gate + ".gate-declaration.json")),
  capture_path: path.resolve(path.join(dir, "terrain" + process.env.FIXTURE_CAPSUF)),
  gate_call_path: path.resolve(callPath), gate_call_unavailable: null,
  session_id: null, opened_by: "hook",
  // Derived, never literal (kogaki#1092): a pointer older than POINTER_TTL
  // is dropped by the reader under test, so a fixed instant would make this
  // case expire on the calendar rather than on anything it asserts.
  opened_at: process.env.FIXTURE_OPENED_LIVE,
}, null, 2) + "\n");
JS
  fire_stub() {                      # stdout only -- stderr is the channel that dies
    printf '{"tool_name":"AskUserQuestion","hook_event_name":"PostToolUse","session_id":"s","tool_use_id":"toolu_the_gates_own_question","tool_response":{"answers":{"Which tag?":"a-tag"}}}' \
      | KOGAKI_RUN_DIR="$stub_repo/rundir" \
        KOGAKI_OPEN_GATES="$hooktmp/stub-gates" \
        FIXTURE_CAPSUF="$CAPSUF" \
        python3 "$stub_repo/.claude/hooks/advance-terrain.py" 2>/dev/null
  }

  # (d) THE PAYLOAD ARRIVES, AND IT IS THE FILE'S. Parsed out of the fenced
  # block and compared against the written call after canonicalisation, which is
  # the same comparison `gate-open-terrain-gate.py` makes against a sent payload.
  # Equality is asserted on the CONTENT, not on the bytes of the fence, so a
  # trailing newline the block strips is not a failure and a reordered key is.
  # THE VERDICT IS A FILE, NOT A SECOND HEREDOC. Two stdin redirections on one
  # command do not compose -- the last wins -- so a `<<PY ... <<<"$out"` pair
  # feeds the hook's output in as the SCRIPT and reads nothing at all.
  cat > "$hooktmp/verdict.py" <<'PY'
import json, re, sys
written_path = sys.argv[1]
raw = sys.stdin.read()
try:
    doc = json.loads(raw)
except Exception as exc:
    print(f"the hook's stdout does not parse as hook JSON ({exc}): {raw[:200]!r}"); raise SystemExit
hso = doc.get("hookSpecificOutput")
if not isinstance(hso, dict):
    print(f"the hook's stdout carries no hookSpecificOutput object: {raw[:200]!r}"); raise SystemExit
if hso.get("hookEventName") != "PostToolUse":
    print(f"hookEventName is {hso.get('hookEventName')!r}, not 'PostToolUse' — the harness reads the field by that name"); raise SystemExit
ctx = hso.get("additionalContext")
if not isinstance(ctx, str) or not ctx:
    print("additionalContext is absent or empty — the gate's payload reached the session on no channel at all"); raise SystemExit
for field, what in (("terrain-id-selection", "the gate id"),
                    ("fixture-raising", "the instance id")):
    if field not in ctx:
        print(f"{what} is not beside the payload; a block naming no raising cannot be told from a stale one"); raise SystemExit
m = re.search(r"```json\n(.*?)\n```", ctx, re.S)
if not m:
    print("additionalContext carries no fenced json block — the payload was named and not printed, which is kogaki#1057's shape"); raise SystemExit
try:
    sent = json.loads(m.group(1))
except Exception as exc:
    print(f"the fenced block does not parse as JSON ({exc})"); raise SystemExit
with open(written_path, encoding="utf-8") as f:
    written = json.load(f)
if json.dumps(sent, sort_keys=True) != json.dumps(written, sort_keys=True):
    print("the fenced payload is not the written call — a paraphrased payload is refused at the equality check, so delivering one is the same wedge by another route"); raise SystemExit
print("ok")
PY
  d_out=$(fire_stub)
  d_verdict=$(printf '%s' "$d_out" | python3 "$hooktmp/verdict.py" "$stub_repo/rundir/terrain-id-selection.gate-call.json")
  if [ "$d_verdict" = "ok" ]; then pass; else
    bad "the advance hook did not deliver the open gate's payload to the session: ${d_verdict:-(the verdict script produced nothing)}"
  fi

  # (e) AND AN ADVANCE THAT STOPS AT NO GATE SAYS NOTHING. Without this case a
  # hook that emitted a block unconditionally would pass (d) — and a block on
  # every AskUserQuestion in the session is the noise the two narrowings above
  # exist to keep off the common path.
  cat > "$stub_repo/src/terrain.mjs" <<'JS'
// An advance that reached a non-gate wait, or `done`: no call written, no
// pointer, nothing outstanding.
JS
  rm -rf "$hooktmp/stub-gates"
  e_out=$(fire_stub)
  if [ -z "$e_out" ] || ! printf '%s' "$e_out" | grep -q 'additionalContext'; then pass; else
    bad "the advance hook emitted additionalContext for an advance that opened no gate: $e_out"
  fi

  # (f) A POINTER THE HARNESS HAS ALREADY ANSWERED IS NOT A GATE (PR #1082 round
  # 1). `write-gate-capture.py` normally unlinks the pointer the moment it writes
  # the row, but it has a named arm where the write succeeds and the unlink
  # fails. After such a miss an advance reaching `done` leaves the ANSWERED
  # pointer as the only match, and a reader with no `has_capture` filter would
  # announce a gate for a question already answered -- while
  # `gate-open-terrain-gate.py`, which applies that filter, denies nothing and
  # lets the re-ask through. Three readers, one rule.
  cat > "$stub_repo/src/terrain.mjs" <<'JS'
// An advance that reached `done`: it opens nothing. The only pointer left is
// the one the capture hook wrote a row for and could not unlink.
JS
  rm -rf "$hooktmp/stub-gates"; mkdir -p "$hooktmp/stub-gates"
  python3 - "$hooktmp/stub-gates/fixture-answered.json" "$stub_repo/rundir" "$CAPSUF" <<'PY'
import json, os, sys
out, dir_, suffix = sys.argv[1:4]
with open(out, "w") as f:
    json.dump({"gate_instance_id": "fixture-answered",
               "gate_id": "terrain-id-selection", "question": "Which tag?",
               "declaration_path": os.path.join(dir_, "d.json"),
               "capture_path": os.path.realpath(os.path.join(dir_, "terrain" + suffix)),
               "gate_call_path": None,
               "gate_call_unavailable": "this pointer is already answered",
               "session_id": None, "opened_by": "hook",
               # Live (kogaki#1092), so what keeps this pointer out of the
               # delivery is the ANSWERED filter this case is about. Staged
               # past the TTL it would pass for the wrong reason.
               "opened_at": os.environ["FIXTURE_OPENED_LIVE"]}, f)
PY
  f_out=$(fire_stub)
  if [ -z "$f_out" ] || ! printf '%s' "$f_out" | grep -q 'additionalContext'; then pass; else
    bad "the advance hook announced a gate whose answer the capture already holds — the open-gate hook filters that pointer out, so the session is handed a re-ask nothing denies: $f_out"
  fi

  # (f2) AND A POINTER PAST THE TTL IS NOT A GATE EITHER (kogaki#1092). The
  # expiry arm had no case at all before this issue, which is how a fixture came
  # to depend on it by accident: every pointer in this file aged out of the
  # window and four cases went red for a reason none of them was written to
  # assert. Asserted here, the derived timestamps above have a stated meaning
  # rather than merely working -- and this is the ONE pointer deliberately
  # staged outside the window, which is what makes it legible as a choice
  # instead of indistinguishable from a stale literal.
  #
  # The stub is (f)'s: an advance that opens nothing, so the staged pointer is
  # the only candidate. It is `fixture-stale` and the capture holds a row for
  # `fixture-answered`, so the ANSWERED filter does not reach it and expiry is
  # the only thing that can keep it off the channel.
  rm -rf "$hooktmp/stub-gates"; mkdir -p "$hooktmp/stub-gates"
  python3 - "$hooktmp/stub-gates/fixture-stale.json" "$stub_repo/rundir" "$CAPSUF" <<'PY'
import json, os, sys
out, dir_, suffix = sys.argv[1:4]
with open(out, "w") as f:
    json.dump({"gate_instance_id": "fixture-stale",
               "gate_id": "terrain-id-selection", "question": "Which tag?",
               "declaration_path": os.path.join(dir_, "d.json"),
               "capture_path": os.path.realpath(os.path.join(dir_, "terrain" + suffix)),
               "gate_call_path": None,
               "gate_call_unavailable": "this pointer is past the TTL",
               "session_id": None, "opened_by": "hook",
               # The odd one out, and derived from the same constant the live
               # ones are: one TTL plus an hour ago.
               "opened_at": os.environ["FIXTURE_OPENED_EXPIRED"]}, f)
PY
  f2_out=$(fire_stub)
  if [ -z "$f2_out" ] || ! printf '%s' "$f2_out" | grep -q 'additionalContext'; then pass; else
    bad "the advance hook announced a gate whose pointer is past POINTER_TTL — write-gate-capture.py reaps at that bound and gate-open-terrain-gate.py filters on it, so delivering one hands the session a payload no sibling reader still holds a gate for: $f2_out"
  fi

  # (g) WHERE TWO POINTERS NAME ONE RUN, THE ONE DELIVERED IS THE ONE THE
  # OPEN-GATE HOOK WILL COMPARE AGAINST (PR #1082 round 1). `pre_tool_use` takes
  # `outstanding[0]` of `sorted(dir.glob("*.json"))` -- instance-nonce FILENAME
  # order. A reader keyed on `opened_at` instead can pick the other file, and a
  # session sending the delivered bytes byte-for-byte is then DENIED for sending
  # "not the question the Harness wrote", with no admissible act left. So the
  # two pointers here are staged with filename order and `opened_at` order
  # OPPOSED: `0000…` is the older, `zzzz…` the newer. A newest-wins reader
  # delivers `zzzz`'s gate and fails this case.
  rm -rf "$hooktmp/stub-gates"; mkdir -p "$hooktmp/stub-gates"
  # Both live and derived (kogaki#1092); what this case needs of them is
  # their relative order, opposed to filename order, never their value.
  for pair in "0000-first:$FIXTURE_OPENED_LIVE_OLDER" "zzzz-second:$FIXTURE_OPENED_LIVE"; do
    python3 - "$hooktmp/stub-gates/${pair%%:*}.json" "${pair%%:*}" "${pair#*:}" \
             "$stub_repo/rundir" "$CAPSUF" <<'PY'
import json, os, sys
out, instance, opened, dir_, suffix = sys.argv[1:6]
call = os.path.join(dir_, instance + ".gate-call.json")
with open(call, "w") as f:
    json.dump({"questions": [{"question": instance, "header": "sel",
                              "multiSelect": False,
                              "options": [{"label": "a", "description": "b"}]}]}, f, indent=2)
with open(out, "w") as f:
    json.dump({"gate_instance_id": instance, "gate_id": "terrain-id-selection",
               "question": instance,
               "declaration_path": os.path.join(dir_, "d.json"),
               "capture_path": os.path.realpath(os.path.join(dir_, "terrain" + suffix)),
               "gate_call_path": os.path.realpath(call),
               "gate_call_unavailable": None, "session_id": None,
               "opened_by": "hook", "opened_at": opened}, f)
PY
  done
  g_out=$(fire_stub)
  if printf '%s' "$g_out" | grep -q '0000-first' \
     && ! printf '%s' "$g_out" | grep -q 'zzzz-second'; then pass; else
    bad "with two pointers naming one run the hook did not deliver the one \`gate-open-terrain-gate.py\` compares against (filename-first, \`0000-first\`) — a session sending these bytes byte-for-byte would be denied for sending the wrong question, which is this file's own wedge arriving through its repair: ${g_out:-(silent)}"
  fi

  # (h) AND THE DELIVERY SURVIVES AN EXECUTOR THAT COULD NOT BE SPAWNED AT ALL
  # (PR #1082 round 1). The first cut read the pointer on the two `returncode`
  # arms and returned above it on the timeout and generic-exception arms — so an
  # advance killed AFTER `emitGateDeclaration` wrote the call and the pointer
  # left exactly the state this file exists to deliver, undelivered, with its
  # only note on the stderr kogaki#1081 is about. The timeout arm cannot be
  # driven in a check that must finish (`ADVANCE_TIMEOUT_S` is 480s); the
  # generic arm is the same `finally` and is one `PATH` away — with no `node`,
  # `subprocess.run` raises before the executor exists.
  # THE INTERPRETER IS NAMED ABSOLUTELY, because `PATH` is what this case takes
  # away and `python3` on a developer machine is often a shim that re-resolves
  # itself through it (pyenv's is a `#!/usr/bin/env bash` script). Emptying PATH
  # around a shim kills the HOOK instead of the executor, which reads as the
  # silence this case is asserting against.
  mkdir -p "$hooktmp/empty-path"
  real_python=$(python3 -c 'import sys; print(sys.executable)')
  h_out=$(printf '{"tool_name":"AskUserQuestion","hook_event_name":"PostToolUse","session_id":"s","tool_use_id":"toolu_the_gates_own_question","tool_response":{"answers":{"Which tag?":"a-tag"}}}' \
    | env PATH="$hooktmp/empty-path" \
          KOGAKI_RUN_DIR="$stub_repo/rundir" \
          KOGAKI_OPEN_GATES="$hooktmp/stub-gates" \
          FIXTURE_CAPSUF="$CAPSUF" \
          "$real_python" "$stub_repo/.claude/hooks/advance-terrain.py" 2>/dev/null)
  if printf '%s' "$h_out" | grep -q 'additionalContext'; then pass; else
    bad "an advance that never spawned left its open gate undelivered — the pointer read must stand on a path every post-spawn exit passes through, not be repeated on the arms someone remembered: ${h_out:-(silent)}"
  fi

  # ---- kogaki#1085. A REFUSAL RAISED INSIDE AN ADVANCE REACHES THE SESSION.
  #
  # kogaki#1081 opened `additionalContext` for gate payloads and left refusals
  # where they were: `note()`, which writes to stderr, which a PostToolUse hook
  # reaches nobody through. So an advance that ENDED a run ended it silently --
  # on 2026-09-10 the session that answered the ID gate saw a completed wait, no
  # judge input, and a run record naming one state fewer than it expected, with
  # the executor's reason on a stream nothing reads. The two cases below are the
  # refusal alone and the refusal beside an open gate, because the delivery point
  # is one `finally` and either can be outstanding at it.
  #
  # THE STUB EXITS NON-ZERO, WHICH IS THE WHOLE PRECONDITION. What is under test
  # is the hook's relay, not the executor's reasons: a fixture driving a real
  # refusal would be asserting the executor's message and would carry every
  # dependency of a judged run to do it.
  cat > "$stub_repo/src/terrain.mjs" <<'JS'
// An advance the executor refused: nothing written, nothing opened, a reason on
// stderr and a non-zero exit -- the shape of every `fail()` in the executor.
process.stderr.write("terrain: report --ids names G1-3, which resolve to no Group or "
  + "SubGroup on this display.\n");
process.exit(1);
JS
  cat > "$hooktmp/refusal-verdict.py" <<'REFPY'
import json, sys
raw = sys.stdin.read()
want = sys.argv[1:]
try:
    ctx = json.loads(raw)["hookSpecificOutput"]["additionalContext"]
except Exception as exc:                                          # noqa: BLE001
    print(f"the hook emitted no additionalContext ({exc}): {raw[:200]!r}"); raise SystemExit
missing = [w for w in want if w not in ctx]
if missing:
    print(f"the block is missing {missing}: {ctx[:300]!r}"); raise SystemExit
print("ok")
REFPY
  rm -rf "$hooktmp/stub-gates"
  i_out=$(fire_stub)
  i_verdict=$(printf '%s' "$i_out" | python3 "$hooktmp/refusal-verdict.py" "resolve to no Group or SubGroup")
  if [ "$i_verdict" = "ok" ]; then pass; else
    bad "an advance whose executor exited non-zero delivered its refusal on stderr alone — the session that answered the gate is left with a completed wait and no reason (kogaki#1085): ${i_verdict:-(the verdict script produced nothing)}"
  fi

  # AND IT RIDES BESIDE AN OPEN GATE RATHER THAN REPLACING IT. A refusal raised
  # after a gate was opened leaves both outstanding, and a delivery carrying one
  # of them would trade this issue's silence for kogaki#1081's.
  cat > "$stub_repo/src/terrain.mjs" <<'JS'
// A gate opened, and then a refusal: the pointer and the call are written, the
// reason goes to stderr, and the exit is non-zero.
import fs from "node:fs";
import path from "node:path";
const dir = process.env.KOGAKI_RUN_DIR, gd = process.env.KOGAKI_OPEN_GATES;
const gate = "terrain-id-selection", instance = "fixture-raising";
const call = { questions: [{ question: "Which Strand ids?", header: "selection",
  multiSelect: true, options: [{ label: "L2", description: "the first" },
                               { label: "L5", description: "the second" }] }] };
const callPath = path.join(dir, gate + ".gate-call.json");
fs.writeFileSync(callPath, JSON.stringify(call, null, 2) + "\n");
fs.mkdirSync(gd, { recursive: true });
fs.writeFileSync(path.join(gd, instance + ".json"), JSON.stringify({
  gate_instance_id: instance, gate_id: gate, question: "Which Strand ids?",
  declaration_path: path.resolve(path.join(dir, gate + ".gate-declaration.json")),
  capture_path: path.resolve(path.join(dir, "terrain" + process.env.FIXTURE_CAPSUF)),
  gate_call_path: path.resolve(callPath), gate_call_unavailable: null,
  session_id: null, opened_by: "hook",
  // Derived, never literal (kogaki#1092): a pointer older than POINTER_TTL
  // is dropped by the reader under test, so a fixed instant would make this
  // case expire on the calendar rather than on anything it asserts.
  opened_at: process.env.FIXTURE_OPENED_LIVE,
}, null, 2) + "\n");
process.stderr.write("terrain: the state after this gate refused\n");
process.exit(1);
JS
  rm -rf "$hooktmp/stub-gates"
  j_out=$(fire_stub)
  j_verdict=$(printf '%s' "$j_out" | python3 "$hooktmp/refusal-verdict.py" \
    "the state after this gate refused" "fixture-raising" '```json')
  if [ "$j_verdict" = "ok" ]; then pass; else
    bad "an advance that opened a gate AND then refused did not deliver both — one of the two readings the session needs was dropped (kogaki#1085): ${j_verdict:-(the verdict script produced nothing)}"
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

# ---- AND NO SITE REINTRODUCES AN ABSOLUTE ONE (kogaki#1092). The three sites
# above were not the population to fix one at a time -- a fourth is one edit
# away, and the failure it causes arrives twelve hours later, in CI, on a diff
# that did not touch this file. So the absence is made decidable here rather
# than left to review.
#
# THE RULE IS NARROW ON PURPOSE: an ISO-8601 instant on a line this file
# EXECUTES OR STAGES. Prose is exempt -- a comment is where the dates grounding
# this reasoning belong, and this block's own ground is written above one -- so
# the exemption is keyed on the line being a comment in either of the two
# languages staged here, shell and JS. It reads the tracked file rather than
# `$0`, which this script's own `cd` makes unresolvable.
absolute_instants=$(python3 - "$REPO/checks/$(basename "$0")" <<'PY'
import re, sys
pat = re.compile(r"\d{4}-\d\d-\d\dT\d\d:\d\d")
with open(sys.argv[1], encoding="utf-8") as f:
    hits = [f"{n}: {line.strip()[:90]}" for n, line in enumerate(f, 1)
            if not line.lstrip().startswith(("#", "//")) and pat.search(line)]
print(" | ".join(hits))
PY
)
if [ -z "$absolute_instants" ]; then pass; else
  bad "a staged timestamp in this file is written as an absolute instant. The reader under test compares opened_at against now() and drops anything older than POINTER_TTL, so a literal passes on the day it is written and fails every day after — derive it from the TTL the way the sites above do: $absolute_instants"
fi

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass — the executor's Bash route denied with --status admitted, the skill file's single start line, and the removal test's byte-equal artifacts with the spec absent and the deny still firing (kogaki#1027)"
  note "also asserted: the advance is keyed to the open run's OWN capture row — a question that wrote none leaves the record untouched and says nothing, the question that wrote one advances it, and an identical answer from another session's question does not (kogaki#1075); and .claude/settings.json registers write-gate-capture.py before advance-terrain.py, which that keying depends on; and that a gate the advance OPENS reaches the session on the one channel a PostToolUse hook has — its stdout's additionalContext, carrying the written call byte-for-byte with the gate and instance ids beside it, and carrying nothing where the advance opened no gate (kogaki#1081); and that an executor REFUSAL rides that same channel, alone where no gate is open and beside the gate payload where one is, so an advance that ends a run no longer ends it silently (kogaki#1085); and that a pointer past POINTER_TTL is delivered on no channel, which is the one arm these cases had come to depend on without asserting (kogaki#1092)."
  note "also asserted: that no line this file executes or stages carries an absolute instant. Every staged opened_at is computed from this run's clock at an offset derived from POINTER_TTL, read from .claude/hooks/advance-terrain.py — so the cases above assert the hook's expiry arm rather than the date the fixture was written on, and a reintroduced literal reddens here instead of twelve hours later in CI (kogaki#1092)."
  note "not asserted here: that either hook is LOADED on this machine. That wiring is machine-local and never committed, so asserting it would fail on every fresh clone and would be a claim about a machine rather than about this repository — which is why the order above is read from the tracked file rather than from a live registration."
fi
exit "$fail"
