#!/usr/bin/env bash
# The Terrain judgment states are the EXECUTOR'S OWN model calls (kogaki#1030).
#
# WHAT THIS CHECKS THAT NOTHING ELSE CAN. `src/terrain.mjs self-test` drives
# composers and readers over inputs it constructs itself, so it can assert what
# a judgment state REFUSES. What it cannot reach is the property this issue is
# about, which is a property of a WHOLE HOOK-DRIVEN SPAN rather than of any one
# function: that one synthesized PostToolUse payload for the tag answer carries
# the run from `compose_input` through both judgments to a finished
# `reports/CoTagGroups.md` and the `ID_SELECTION` declaration, in ONE invocation,
# with no stop in between. Before kogaki#1030 that span was impossible — the
# judgment states demanded a `--claims` file and kogaki#1027 had deleted every
# route by which one could arrive — so the run stopped at `J1_claims` and the
# co-tag file did not exist when the ID question was asked.
#
# THE JUDGE IS STUBBED, AND THAT IS THE POINT (acceptance 1 and 2). The pinned
# model is reached through `KOGAKI_JUDGE_CLI`, which replaces the BINARY and
# nothing else: the argv, the parse, the retry bound and every refusal below are
# the shipped ones, so these cases exercise the shipped code rather than a second
# path written for them.
#
# THE SEAM IS STUBBED TOO, on `check-terrain-runtime.sh`'s own recipe: a scratch
# REPO with `src/` copied whole and a stub `policy/kit/bin/gateway-query.mjs`, so
# nothing here reaches a gateway or a network.
set -uo pipefail
cd "$(dirname "$0")/.."
REPO=$PWD

fail=0
cases=0
note() { printf '%s\n' "$*"; }
bad() { printf 'FAIL — %s\n' "$*"; fail=1; }
pass() { cases=$((cases + 1)); }

SCRATCH=$(mktemp -d) || { echo "FAIL — no temp directory; CANNOT-DETERMINE, never a pass"; exit 1; }
trap 'rm -rf "$SCRATCH"' EXIT

# ---- THE SEAM STUB. Three Lessons over two tags, so the selected tag yields one
# co-tag group with two members — above nothing and below the SubGroup threshold,
# which is what makes a judged-EMPTY subdivision the conformant answer.
build_tree() {                      # build_tree <dir> [--reduced]
  local root=$1 reduced=${2:-}
  mkdir -p "$root/policy/kit/bin"
  cp -R "$REPO/src" "$root/src"
  mkdir -p "$root/.claude/hooks" "$root/.claude/skills/terrain"
  cp "$REPO"/.claude/hooks/*.py "$root/.claude/hooks/"
  if [ "$reduced" = "--reduced" ]; then
    # THE REMOVAL TEST'S TREE (acceptance 4): the runtime and the hooks, the
    # skill file reduced to its one `!` line, and `specs/` absent entirely.
    printf '!`node src/terrain.mjs start`\n' > "$root/.claude/skills/terrain/SKILL.md"
  else
    cp "$REPO/.claude/skills/terrain/SKILL.md" "$root/.claude/skills/terrain/SKILL.md"
  fi
  cat > "$root/policy/kit/bin/gateway-query.mjs" <<'STUB'
// The served surface, fixed. `--tool` selects the shape; `--args` is ignored
// beyond its tag, because a fixture that varied with the query would be
// asserting the stub rather than the runtime.
const argv = process.argv.slice(2);
const tool = argv[argv.indexOf("--tool") + 1];
const PIN = "product-lab@f1x7ure";
const LESSONS = [
  { slug: "one-thing-per-act", tags: ["fixture", "shared"] },
  { slug: "a-bound-that-cannot-fire", tags: ["fixture", "shared"] },
  { slug: "an-unrelated-lesson", tags: ["other"] },
];
if (tool === "element_survey") {
  process.stdout.write(JSON.stringify({
    tool, pin: PIN,
    lines: LESSONS.map((l, i) => ({
      cite: `views/lessons/fixture.md:${i + 1}@f1x7ure`,
      text: JSON.stringify({ kind: "lesson", slug: l.slug, tags: l.tags }),
    })),
  }) + "\n");
} else if (tool === "gloss_index") {
  const L = [];
  let n = 0;
  for (const l of LESSONS) {
    L.push({ cite: `views/lessons/fixture.md:${++n}@f1x7ure`, text: `## ${l.slug}` });
    L.push({ cite: `views/lessons/fixture.md:${++n}@f1x7ure`, text: "" });
    L.push({ cite: `views/lessons/fixture.md:${++n}@f1x7ure`, text: `The gloss body for ${l.slug}.` });
    L.push({ cite: `views/lessons/fixture.md:${++n}@f1x7ure`, text: "" });
    L.push({ cite: `views/lessons/fixture.md:${++n}@f1x7ure`, text: `Source: \`coding::lesson/${l.slug}\` · tags: ${l.tags.join(", ")}` });
    L.push({ cite: `views/lessons/fixture.md:${++n}@f1x7ure`, text: "" });
  }
  process.stdout.write(JSON.stringify({ tool, pin: PIN, lines: L }) + "\n");
} else {
  process.stdout.write(JSON.stringify({ miss: true, tool, pin: PIN, lines: [] }) + "\n");
}
STUB

  # ---- THE JUDGE STUBS. Both read the prompt on stdin and answer through the
  # CLI's `--output-format json` envelope, which is what the shipped parse reads.
  cat > "$root/judge-conformant" <<'JUDGE'
#!/usr/bin/env node
// A FIXED CONFORMANT RECORD (acceptance 1), composed over the input the executor
// handed it — fixed in SHAPE, which is what "conformant" means here; a record
// with hard-coded group names would be refused by the very subset check the
// state exists to run, and would therefore test nothing.
const fs = require("node:fs");
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
const state = /`([A-Za-z0-9_]+)` judgment point/.exec(prompt);
let record;
if (input.kind === "composition-input" && /J1_claims/.test(prompt)) {
  record = {
    composition_pin: input.composition_pin,
    claims: Object.fromEntries(input.groups.map((g) => [g.name, `In common: a fixture claim over ${g.members.length} member(s).`])),
  };
} else if (input.kind === "composition-input") {
  // J2_subdivision. Judged EMPTY: the fixture's one group is below the split
  // threshold, so "no split" is the conformant answer rather than an evasion.
  record = Object.fromEntries(input.groups.map((g) => [g.name, { judged: true, subgroups: [] }]));
} else if (input.state === "thesis_candidates") {
  const strands = input.strands_you_may_use;
  const n = input.candidates_required;
  record = Array.from({ length: n }, (_, i) => ({
    claim: `A fixture Thesis candidate, number ${i + 1}.`,
    strands: strands.slice(0, 2),
  }));
} else if (input.state === "J3_neighborhood") {
  const tc = (input.thesis_candidates_a_target_may_name[0] || {}).id;
  record = Object.fromEntries((input.candidates_you_must_judge || []).map((c) => [c.slug, {
    level: "useful",
    claim: `A fixture neighborhood claim for ${c.slug}.`,
    target: { candidate: tc, role: "supporting material" },
  }]));
} else {
  process.stderr.write(`the stub does not know state ${state ? state[1] : "?"}\n`);
  process.exit(4);
}
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE

  cat > "$root/judge-nonconformant" <<'JUDGE'
#!/usr/bin/env node
// A RECORD THE STATE'S OWN REFUSALS REJECT (acceptance 2), on EVERY attempt —
// a stub that repaired itself on the second call would show the retry happening
// and hide what happens when it runs out.
const fs = require("node:fs");
fs.readFileSync(0, "utf8");
// The withdrawn pre-v10 bare map: no `composition_pin`, which `readClaimsRecord`
// refuses by name. The refusal is the shipped one; nothing here composes it.
process.stdout.write(JSON.stringify({ result: JSON.stringify({ "some-group": "a claim" }) }) + "\n");
JUDGE
  cat > "$root/judge-garbage" <<'JUDGE'
#!/usr/bin/env node
// A RESPONSE THAT IS NOT JSON (PR #1044 round 1, finding 3). Before the retry
// window was widened this arm reached `fail()` outside it and ended the run on
// the FIRST occurrence, so `retries` bounded only the conformance arm — while the
// licence makes no such distinction, and this is among the arms a re-ask is
// likeliest to repair.
const fs = require("node:fs");
fs.readFileSync(0, "utf8");
process.stdout.write("I think the answer is probably fine.\n");
JUDGE
  chmod +x "$root/judge-conformant" "$root/judge-nonconformant" "$root/judge-garbage"
}

# ---- THE SYNTHESIZED PAYLOAD. One PostToolUse event for an AskUserQuestion the
# owner answered, in the shape the harness hands the hook.
payload() {                          # payload <tool_use_id> <question> <answer>
  python3 - "$1" "$2" "$3" <<'PY'
import json, sys
tuid, q, a = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({
    "hook_event_name": "PostToolUse",
    "session_id": "fixture-session",
    "tool_name": "AskUserQuestion",
    "tool_use_id": tuid,
    "tool_input": {"questions": [{"question": q, "options": [{"label": a}]}]},
    "tool_response": {"answers": {q: a}},
}))
PY
}

# The question text the gate declaration carries, read from the declaration the
# executor wrote — never retyped, for the reason the capture hook keys on it.
declared_question() {                # declared_question <run-dir> <state> <tree>
  python3 - "$1" "$2" "$3" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
owed = [g for g in rec["gate_declarations_owed"] if g["state"] == sys.argv[2]]
if not owed or not owed[0].get("declaration"):
    sys.exit(1)
# THE PATH IS RECORDED REPO-RELATIVE and is read back the same way the executor
# reads it — resolved against the tree root, absolute paths left alone.
p = pathlib.Path(owed[0]["declaration"])
p = p if p.is_absolute() else pathlib.Path(sys.argv[3], p)
decl = json.load(open(p))
# THE QUESTION AS SENT (PR #1048 round 1, finding 1): the composed call's text
# where one was written beside the declaration, else the declaration's own.
call = p.with_name(f"{decl['id']}.gate-call.json")
if call.exists():
    print(json.load(open(call))["questions"][0]["question"])
else:
    print(decl["question"])
PY
}

# THE CAPTURE HOOK'S STDERR IS KEPT (PR #1044 round 1). `write-gate-capture.py`
# is written so that "every failure path returns 0 and says so on stderr" —
# PostToolUse cannot deny a call that already happened — so discarding it throws
# away the ONE diagnostic that separates its arms. With it silenced, this check's
# own failure text then pointed a reader at "the hook is not installed on this
# machine", which cannot be the cause here: the check invokes the hook by path
# and never through a machine-local registration. A check that silences its
# subject's only diagnostic and then guesses is worse than one that says nothing.
capture() {                          # capture <tree> <run-dir> <payload> <label>
  local root=$1 dir=$2 body=$3 what=$4 err
  err=$(printf '%s' "$body" | (cd "$root" && KOGAKI_RUN_DIR="$dir" KOGAKI_OPEN_GATES="$root/open-gates" \
        python3 .claude/hooks/write-gate-capture.py 2>&1 >/dev/null))
  if [ -n "$err" ]; then
    note "  write-gate-capture ($what): $err"
  fi
}

# ---- THE SPAN, driven once per tree (this one, and the reduced one).
# Acceptance 1, 2 and 3 are asserted inside; acceptance 4 is the second call.
# THE CAPTURE'S POINTER DIRECTORY IS PER TREE, AND THAT IS LOAD-BEARING
# (PR #1044 round 1, blocking). `write-gate-capture.py` keys its open-gate
# pointers on the gate QUESTION, and its documented ambiguity arm writes NO row
# when two live pointers carry the same one. The registered runner executes
# members in parallel (8 jobs by default) and `check-terrain-hook-invocation.sh`
# also opens `TAG_SELECTION` runs over the same fixture survey — so two members
# of one suite contended for one gate class through the shared machine-local
# directory, the capture silently wrote nothing, and every span assertion here
# failed with `missing transitions`. Serially, both passed; that is exactly the
# shape a green sequential run cannot see.
#
# `src/terrain.mjs` already sets a per-tree `KOGAKI_OPEN_GATES` for its own
# fixtures and says why: several of them "deliberately leave a gate unanswered
# and every one of them asks the same question over the same survey". This is
# the same fact one layer out, so it is the same instrument.
capture_env() {                      # capture_env <tree>
  printf 'KOGAKI_OPEN_GATES=%s' "$1/open-gates"
}

drive() {                            # drive <label> <tree>
  local label=$1 root=$2
  local D="$root/run"
  mkdir -p "$D" "$root/open-gates"
  # EXPORTED FOR THE WHOLE SPAN, not only for the capture. The START ACT is what
  # WRITES the open-gate pointer, so a start run outside this directory leaves the
  # pointer in the shared one and the capture then finds nothing to key on — which
  # is the same silent no-row this variable exists to prevent, arriving from the
  # other end. Re-assigned per call, so the two trees never share.
  export KOGAKI_OPEN_GATES="$root/open-gates"
  # THE SESSION JOIN (kogaki#1028, carried by #1047). The pointer the start act
  # writes carries the session the executor was started in, and the capture
  # writes a row only for a payload from that same session. The fixture's
  # payloads name `fixture-session`, so the start act must be told the same.
  export CLAUDE_CODE_SESSION_ID="fixture-session"

  # --- The start act: opens the run and stops at TAG_SELECTION.
  if ! (cd "$root" && node src/terrain.mjs start --run-dir "$D" >"$root/start.out" 2>&1); then
    bad "$label: the start act failed: $(tail -3 "$root/start.out" | tr '\n' ' ')"
    return
  fi
  pass
  local q
  q=$(declared_question "$D" TAG_SELECTION "$root") || {
    bad "$label: the start act wrote no TAG_SELECTION declaration, so there is no question to answer"
    return
  }

  # --- ACCEPTANCE 1. ONE payload, and the co-tag file exists at the end of it.
  local p1
  p1=$(payload "toolu_fixture_tag" "$q" "fixture")
  capture "$root" "$D" "$p1" tag
  # THIS SPAN RESOLVES THE RUN THE WAY THE LIVE HOOK DOES (kogaki#1045): through
  # the open-run pointer, with no `KOGAKI_RUN_DIR` and no `--run-dir`. On the
  # 2026-09-09 live run that route reached `compose_input`, whose handler
  # re-resolved its directory through `runDir`'s default branch and minted a
  # second, timestamp-named workspace in the lane. The two spans below keep the
  # env route; this one is the fixture for the pointer route.
  printf '%s\n' "$D" >"$root/open-run"
  printf '%s' "$p1" | (cd "$root" && env -u KOGAKI_RUN_DIR KOGAKI_OPEN_RUN="$root/open-run" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-conformant" \
      python3 .claude/hooks/advance-terrain.py >"$root/adv1.out" 2>&1)

  # ONE WORKSPACE (kogaki#1045). The lane under this tree holds no directory the
  # advance minted, and the composition input the record names is inside $D.
  if [ -z "$(ls -d "$root"/runs/terrain/terrain-* 2>/dev/null)" ] \
     && python3 - "$D" <<'PY'
import json, sys, pathlib, os
d = pathlib.Path(sys.argv[1]).resolve()
rec = json.load(open(d / "run-record.json"))
ci = rec.get("composition_input") or ""
p = pathlib.Path(ci)
if not p.is_absolute():
    p = (pathlib.Path(os.getcwd()) / p)
sys.exit(0 if ci and p.resolve().parent == d else 1)
PY
  then pass; else
    bad "$label: the advance minted a second workspace in the lane, or the composition input landed outside the run directory — compose_input re-resolved its directory through runDir's default branch (kogaki#1045). Lane: $(ls "$root"/runs/terrain 2>/dev/null | tr '\n' ' ')"
  fi

  if [ -f "$root/reports/CoTagGroups.md" ]; then pass; else
    bad "$label: one payload for the tag answer did not produce reports/CoTagGroups.md — the co-tag file is not complete before the ID question (kogaki#1030 item 2). The advance said: $(tail -3 "$root/adv1.out" | tr '\n' ' ')"
  fi
  if python3 - "$D" ID_SELECTION <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
owed = [g for g in rec["gate_declarations_owed"] if g["state"] == sys.argv[2]]
sys.exit(0 if rec.get("awaiting") == sys.argv[2] and owed and owed[0].get("declaration") else 1)
PY
  then pass; else
    bad "$label: the run is not awaiting ID_SELECTION with its declaration WRITTEN after the tag answer — the span stopped short of the ID question"
  fi
  # EVERY TRANSITION IN THE SPAN NAMES THE PAYLOAD, which is the attribution half
  # of acceptance 1: a state advanced by something other than this hook event
  # would carry another id, or none.
  if python3 - "$D" toolu_fixture_tag <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
span = ["compose_input", "J1_claims", "J2_subdivision", "cotag_groups"]
by = {t["state"]: t for t in rec.get("transitions", [])}
missing = [s for s in span if s not in by]
if missing:
    print("missing transitions:", missing, file=sys.stderr); sys.exit(1)
wrong = [s for s in span if (by[s].get("advanced_by") or {}).get("tool_use_id") != sys.argv[2]]
if wrong:
    print("not attributed to the payload:", wrong, file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: not every transition of the tag-answer span is attributed to that payload's tool_use_id — the span is what one hook event executed, and the record must say so"
  fi
  # THE JUDGMENTS WERE THE EXECUTOR'S OWN CALLS, and the provenance says so.
  if python3 - "$D" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
j = rec.get("judgments") or {}
sys.exit(0 if "J1_claims" in j and "J2_subdivision" in j else 1)
PY
  then pass; else
    bad "$label: the run record names no J1_claims/J2_subdivision judgment — the executor did not invoke the judge, or did not record which record it validated"
  fi

  # --- ACCEPTANCE 3. One payload for the ID answer produces the Full Report and
  # the STRAND_SELECTION declaration.
  local q2 p2
  q2=$(declared_question "$D" ID_SELECTION "$root") || {
    bad "$label: no ID_SELECTION question to answer"
    return
  }
  p2=$(payload "toolu_fixture_ids" "$q2" "G1")
  capture "$root" "$D" "$p2" ids
  printf '%s' "$p2" | (cd "$root" && KOGAKI_RUN_DIR="$D" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-conformant" \
      python3 .claude/hooks/advance-terrain.py >"$root/adv2.out" 2>&1)

  if [ -f "$root/reports/FullReport.md" ]; then pass; else
    bad "$label: one payload for the ID answer did not produce reports/FullReport.md (kogaki#1030 item 3). The advance said: $(tail -3 "$root/adv2.out" | tr '\n' ' ')"
  fi
  if python3 - "$D" STRAND_SELECTION <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
owed = [g for g in rec["gate_declarations_owed"] if g["state"] == sys.argv[2]]
sys.exit(0 if rec.get("awaiting") == sys.argv[2] and owed and owed[0].get("declaration") else 1)
PY
  then pass; else
    bad "$label: the run is not awaiting STRAND_SELECTION with its declaration written after the ID answer"
  fi

  # --- ACCEPTANCE 2. The non-conformant stub: the run fails after the declared
  # retry count, and the failure names the refusal.
  local D2="$root/run-bad"
  mkdir -p "$D2"
  (cd "$root" && node src/terrain.mjs start --run-dir "$D2" >/dev/null 2>&1)
  local qb pb
  qb=$(declared_question "$D2" TAG_SELECTION "$root") || {
    bad "$label: the second run wrote no TAG_SELECTION declaration"
    return
  }
  pb=$(payload "toolu_fixture_bad" "$qb" "fixture")
  capture "$root" "$D2" "$pb" nonconformant
  printf '%s' "$pb" | (cd "$root" && KOGAKI_RUN_DIR="$D2" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-nonconformant" \
      python3 .claude/hooks/advance-terrain.py >"$root/advbad.out" 2>&1)

  local declared
  declared=$(python3 -c "
import json,sys
t=json.load(open('$root/src/workflow.json'))
print([s for s in t['states'] if s['id']=='J1_claims'][0]['retries'])")
  if grep -q "on all $((declared + 1)) attempt(s)" "$root/advbad.out"; then pass; else
    bad "$label: the run did not fail after the $declared re-ask(s) the table declares for J1_claims. It said: $(tail -4 "$root/advbad.out" | tr '\n' ' ')"
  fi
  # THE REFUSAL TEXT RIDES THE FAILURE, which is the half that tells an operator
  # why the judge's record was rejected rather than merely that it was.
  if grep -q "the withdrawn pre-v10 form" "$root/advbad.out"; then pass; else
    bad "$label: the failure does not carry the state's own refusal text — an operator is told the judge failed and never why"
  fi
  # AND THE RUN RECORD NAMES IT (PR #1044 round 1, D1's partial-discharge note).
  # Acceptance 2 reads "the run fails after the declared retry count and THE
  # RECORD names the refusal"; stderr and the persisted record are different
  # carriers, and only the second is still there when a reader comes back to the
  # run. `fail()` persists the pending record (kogaki#808), so the entry is
  # written before the refusal rather than after it.
  if python3 - "$D2" J1_claims <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
r = (rec.get("judgment_refusals") or {}).get(sys.argv[2])
sys.exit(0 if r and r.get("refusal") and r.get("attempts") else 1)
PY
  then pass; else
    bad "$label: the run record carries no judgment_refusals entry for J1_claims — the refusal reached stderr and not the record, and acceptance 2 names the record"
  fi

  # AND IT LEFT NO CO-TAG FILE. A run that failed at J1 and still wrote the
  # display would be the defect this issue closes, arriving from the other side.
  if [ ! -f "$root/reports-bad/CoTagGroups.md" ]; then pass; else
    bad "$label: the failed run wrote a co-tag display anyway"
  fi

  # --- THE WIDENED RETRY WINDOW (PR #1044 round 1, finding 3). A response that is
  # not JSON is a REFUSAL like any other, so it is re-asked to the same bound and
  # the run then fails carrying the parse refusal. The discriminator against the
  # pre-fix behaviour is the ATTEMPT COUNT: before the window was widened this
  # exited on the first call.
  local D3="$root/run-garbage"
  mkdir -p "$D3"
  (cd "$root" && node src/terrain.mjs start --run-dir "$D3" >/dev/null 2>&1)
  local qg pg
  qg=$(declared_question "$D3" TAG_SELECTION "$root") || {
    bad "$label: the third run wrote no TAG_SELECTION declaration"
    return
  }
  pg=$(payload "toolu_fixture_garbage" "$qg" "fixture")
  capture "$root" "$D3" "$pg" garbage
  printf '%s' "$pg" | (cd "$root" && KOGAKI_RUN_DIR="$D3" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-garbage" \
      python3 .claude/hooks/advance-terrain.py >"$root/advgarbage.out" 2>&1)
  if grep -q "on all $((declared + 1)) attempt(s)" "$root/advgarbage.out"; then pass; else
    bad "$label: an unparseable judge response was not re-asked to the table's bound — the retry window covers the conformance arm alone, which is narrower than the licence describes. It said: $(tail -3 "$root/advgarbage.out" | tr '\n' ' ')"
  fi
  if grep -q "is not JSON" "$root/advgarbage.out"; then pass; else
    bad "$label: the failure does not name the parse refusal it exhausted its attempts on"
  fi
}


# ---- THE PER-CALL BOUND IS DECLARED IN THE TABLE, AND ITS ABSENCE REFUSES
# (PR #1044 round 1, finding 4). A judgment call runs inside a PostToolUse hook
# that kills the whole advance at its own timeout, and a span can now make several
# calls; an unbounded child can exhaust that budget mid-span and leave exactly the
# half-finished record the hook's bound exists to relay. Asserted as a CARRIER
# rather than by driving a slow judge: a case that waited out a real timeout would
# add its own bound to the suite's runtime to prove that a bound exists.
if python3 -c "
import json, sys
t = json.load(open('src/workflow.json'))
b = (t.get('judge') or {}).get('timeout_s')
sys.exit(0 if isinstance(b, (int, float)) and b > 0 else 1)"; then pass; else
  bad "src/workflow.json's judge block declares no positive numeric timeout_s — the per-call bound is a property of the workflow and a table that can omit it silently does not have one"
fi

build_tree "$SCRATCH/gold"
drive "this tree" "$SCRATCH/gold"

# ---- ACCEPTANCE 4. THE REMOVAL TEST: the same three fixtures, in a tree holding
# the runtime and the hooks with `specs/` absent and the skill file reduced to
# its one `!` line. Its ground is the same as `check-terrain-hook-invocation.sh`'s
# — the claim is that the behaviour is carried by the code and the hooks rather
# than by the prose around them, and no pass running inside the full tree can
# make it.
build_tree "$SCRATCH/red" --reduced
if [ -e "$SCRATCH/red/specs" ]; then
  bad "the reduced tree carries specs/ — the removal test asserts the runtime works with the spec absent, so a copy of it defeats the test"
else
  pass
fi
drive "the reduced tree" "$SCRATCH/red"

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass — one payload for the tag answer carries compose_input, both judgments and the CoTagGroups write in a single invocation and stops at ID_SELECTION; one payload for the ID answer reaches FullReport.md and STRAND_SELECTION; a non-conformant judge record fails after the table's declared re-asks carrying the state's own refusal; and all of it holds with specs/ absent (kogaki#1030)"
  note "not asserted here: that the PINNED MODEL is reachable. The judge binary is stubbed through KOGAKI_JUDGE_CLI, so these cases bind the executor's call, parse, retry and refusal — never the model's answer, which is not this repository's to assert."
fi
exit "$fail"
