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

# ---- THE SEAM STUB. Five Lessons over three tags, so the selected tag yields
# TWO co-tag groups of two members each — each above nothing and below
# `min_subgroup_members`, which is what makes a judged-EMPTY subdivision the
# conformant answer for both.
#
# TWO GROUPS RATHER THAN ONE, AND THAT IS LOAD-BEARING (kogaki#1062). The survey
# composed a single co-tag group until this issue, and one group cannot
# discriminate "one judge call per composed group" from "one judge call over all
# of them": both make exactly one call. The per-group assertions below count
# calls and compare each call's input against the group it names, so the fixture
# has to compose more than one group for either observation to mean anything.
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
  // The second co-tag group (kogaki#1062). Two members, like the first, so both
  // sit below `min_subgroup_members` and judged-EMPTY stays conformant for each.
  { slug: "a-derivation-with-no-measurement", tags: ["fixture", "derived"] },
  { slug: "a-bound-that-straddles-its-work", tags: ["fixture", "derived"] },
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
const path = require("node:path");
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
  // J2_subdivision. Judged EMPTY: each of the fixture's groups is below the split
  // threshold, so "no split" is the conformant answer rather than an evasion.
  //
  // KEYED OFF `input.groups` AND NOT OFF A FIXED NAME, which is what makes this
  // stub answer the per-group ask (kogaki#1062) without being rewritten for it:
  // the scoped input carries exactly the one group the call is about, so the same
  // expression yields the one-key record that ask demands and the whole map the
  // whole-input ask demanded.
  //
  // EVERY J2 CALL IS LOGGED, one line per call naming the group it was asked
  // about and how many groups its input carried. The call COUNT is the property
  // acceptance 1 is about and no run record carries it per call, so the stub --
  // which is the only party that sees each invocation -- is what records it.
  const log = path.join(__dirname, "j2-calls");
  fs.appendFileSync(log, JSON.stringify({
    judging_group: input.judging_group === undefined ? null : input.judging_group,
    groups: input.groups.map((g) => g.name),
    material: (input.material || []).map((m) => m.id),
    pin_groups: Object.keys((input.composition_pin || {}).groups || {}),
  }) + "\n");
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
  # ---- THE REPAIR STUB (kogaki#1059, fixture 1). Attempt one returns THE LIVE
  # 2026-09-09 SHAPE -- the `composition_pin` as the pin STRING and `claims` as an
  # array of `{group, claim}` -- which satisfies the state's `input_shape`
  # SENTENCE and is refused by its validator. Attempt two returns the conformant
  # record. Wrong-then-right rather than wrong-always is the whole point: it is
  # the only stub that can show the bound REPAIRING rather than repeating.
  cat > "$root/judge-repairs" <<'JUDGE'
#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
const isJ1 = /`J1_claims` judgment point/.test(prompt);
// THE PROMPTS ARE KEPT, because the property under test is a property OF THE
// PROMPT: that attempt two is a different ask from attempt one. A stub that only
// answered differently would leave that unasserted.
let seen = 0;
if (isJ1) {
  const counter = path.join(__dirname, "repair-calls");
  try { seen = Number(fs.readFileSync(counter, "utf8").trim()) || 0; } catch { seen = 0; }
  fs.writeFileSync(counter, String(seen + 1));
  fs.writeFileSync(path.join(__dirname, `repair-prompt-${seen + 1}.txt`), prompt);
}
let record;
if (isJ1 && seen === 0) {
  record = {
    composition_pin: input.composition_pin.pin,
    claims: input.groups.map((g) => ({ group: g.name, claim: "A fixture claim in the array form." })),
  };
} else if (isJ1) {
  record = {
    composition_pin: input.composition_pin,
    claims: Object.fromEntries(input.groups.map((g) => [g.name, `In common: a fixture claim over ${g.members.length} member(s).`])),
  };
} else {
  record = Object.fromEntries(input.groups.map((g) => [g.name, { judged: true, subgroups: [] }]));
}
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE

  # ---- THE SAME WRONG SHAPE, EVERY TIME (kogaki#1059, fixture 2). The other half
  # of the pair: a shape mistake the judge never repairs still spends the bound
  # and fails carrying the refusal. `judge-nonconformant` above returns the
  # withdrawn BARE MAP; this returns the shape the live run actually returned, and
  # the two refuse at different clauses of the same reader.
  cat > "$root/judge-wrong-shape" <<'JUDGE'
#!/usr/bin/env node
const fs = require("node:fs");
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
process.stdout.write(JSON.stringify({ result: JSON.stringify({
  composition_pin: input.composition_pin.pin,
  claims: input.groups.map((g) => ({ group: g.name, claim: "A fixture claim in the array form." })),
}) }) + "\n");
JUDGE
  # ---- THE PER-GROUP REPAIR STUB (kogaki#1062, acceptance 1's second half). J1 is
  # answered conformantly. At J2 the group whose name sorts LAST is refused once --
  # by returning the live 2026-09-09 shape, the entry wrapped in an envelope
  # carrying a `kind` key -- and answered conformantly on its second call. Every
  # other group is answered conformantly on its FIRST call, which is what makes
  # the property under test observable: a group that passed is not re-asked, so
  # the refusal must land against that one group alone.
  cat > "$root/judge-group-repairs" <<'JUDGE'
#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
if (/`J1_claims` judgment point/.test(prompt)) {
  process.stdout.write(JSON.stringify({ result: JSON.stringify({
    composition_pin: input.composition_pin,
    claims: Object.fromEntries(input.groups.map((g) => [g.name, `In common: a fixture claim over ${g.members.length} member(s).`])),
  }) }) + "\n");
  process.exit(0);
}
// J2. THE TARGET IS WRITTEN DOWN BY THE FIRST CALL AND READ BACK BY THE REST, so
// the assertions can name it without retyping the group naming the executor mints.
const g = input.groups[0];
const targetFile = path.join(__dirname, "group-repair-target");
const seenFile = path.join(__dirname, `group-repair-seen-${g.name.replace(/[^a-zA-Z0-9]+/g, "-")}`);
let target;
try { target = fs.readFileSync(targetFile, "utf8").trim(); } catch { target = ""; }
if (!target) {
  // THE GROUP OF THE FIRST J2 CALL, then fixed. The stub sees one group per call
  // and cannot know the whole set, so the target is whichever group is asked
  // about first; that is enough, because the property under test is that the
  // OTHER groups are not re-asked, and their identity does not matter.
  target = g.name;
  fs.writeFileSync(targetFile, target);
}
let seen = 0;
try { seen = Number(fs.readFileSync(seenFile, "utf8").trim()) || 0; } catch { seen = 0; }
fs.writeFileSync(seenFile, String(seen + 1));
fs.writeFileSync(path.join(__dirname, `group-repair-prompt-${g.name.replace(/[^a-zA-Z0-9]+/g, "-")}-${seen + 1}.txt`), prompt);
let record;
if (g.name === target && seen === 0) {
  // THE LIVE 2026-09-09 SHAPE: the entry wrapped in an envelope carrying a `kind`
  // key, which is what the run's one in-bound attempt actually returned.
  record = { kind: "subdivision", [g.name]: { judged: true, subgroups: [] } };
} else {
  record = { [g.name]: { judged: true, subgroups: [] } };
}
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE

  # ---- THE PER-GROUP UNREPAIRABLE STUB (kogaki#1062, acceptance 2). One group is
  # answered with the wrong shape on EVERY call; the rest are conformant. The state
  # must fail after that group's declared bound, and the failure must name the
  # group -- a refusal naming only the state would leave an operator with eleven
  # groups and no way to tell which one spent the bound.
  cat > "$root/judge-group-wrong-shape" <<'JUDGE'
#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
if (/`J1_claims` judgment point/.test(prompt)) {
  process.stdout.write(JSON.stringify({ result: JSON.stringify({
    composition_pin: input.composition_pin,
    claims: Object.fromEntries(input.groups.map((g) => [g.name, `In common: a fixture claim over ${g.members.length} member(s).`])),
  }) }) + "\n");
  process.exit(0);
}
const g = input.groups[0];
const targetFile = path.join(__dirname, "group-wrong-target");
let target;
try { target = fs.readFileSync(targetFile, "utf8").trim(); } catch { target = ""; }
if (!target) { target = g.name; fs.writeFileSync(targetFile, target); }
const record = g.name === target
  // THE WITHDRAWN PRE-V9 BARE ARRAY, which `readSubdivisionEntry` refuses by
  // name -- the shipped refusal, composed nowhere here.
  ? { [g.name]: [] }
  : { [g.name]: { judged: true, subgroups: [] } };
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE
  chmod +x "$root/judge-conformant" "$root/judge-nonconformant" "$root/judge-garbage" \
           "$root/judge-repairs" "$root/judge-wrong-shape" \
           "$root/judge-group-repairs" "$root/judge-group-wrong-shape"
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

  # --- kogaki#1062 ACCEPTANCE 1, FIRST HALF. ONE J2 CALL PER COMPOSED GROUP, and
  # each call carries THAT GROUP'S MATERIAL ALONE. The stub logged every J2
  # invocation it received; the composed input names the groups. Both sides are
  # read independently — the count from the calls the stub saw, the expected set
  # from the input the executor composed — because a count derived from the same
  # object it is compared against cannot fail.
  #
  # THE MATERIAL NARROWING IS THE HALF THAT MATTERS FOR THE BOUND. One call per
  # group that still shipped all eleven groups' untruncated Gloss bodies would
  # make the same measurement worse, not better: it would pay the whole-input cost
  # eleven times.
  if python3 - "$root/j2-calls" "$D" "$root" <<'PY'
import json, sys, pathlib
calls = [json.loads(l) for l in pathlib.Path(sys.argv[1]).read_text().splitlines() if l.strip()]
rec = json.load(open(pathlib.Path(sys.argv[2], "run-record.json")))
ci = pathlib.Path(rec["composition_input"])
inp = json.load(open(ci if ci.is_absolute() else pathlib.Path(sys.argv[3]) / ci))
groups = {g["name"]: set(g["members"]) for g in inp["groups"]}
if len(groups) < 2:
    print("the fixture survey composes", len(groups), "group(s); one group cannot discriminate "
          "one-call-per-group from one-call-over-all", file=sys.stderr); sys.exit(1)
if len(calls) != len(groups):
    print(f"expected {len(groups)} J2 call(s), one per composed group; the stub saw {len(calls)}: "
          f"{[c['judging_group'] for c in calls]}", file=sys.stderr); sys.exit(1)
if sorted(c["judging_group"] or "" for c in calls) != sorted(groups):
    print("the calls do not name each composed group exactly once:",
          [c["judging_group"] for c in calls], "vs", sorted(groups), file=sys.stderr); sys.exit(1)
for c in calls:
    name = c["judging_group"]
    if c["groups"] != [name]:
        print(f"the call for {name!r} carried groups {c['groups']} — the ask must carry that group "
              "alone", file=sys.stderr); sys.exit(1)
    if set(c["material"]) != groups[name]:
        print(f"the call for {name!r} carried material {sorted(c['material'])} and that group's "
              f"members are {sorted(groups[name])} — the narrowing is what puts one call inside the "
              "per-call bound", file=sys.stderr); sys.exit(1)
    if c["pin_groups"] != [name]:
        print(f"the call for {name!r} carried a composition_pin naming {c['pin_groups']} — a pin "
              "still naming every group licenses members this ask never handed over",
              file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: J2_subdivision did not make one judge call per composed group, each carrying that group's members alone (kogaki#1062). The stub's call log: $(tr '\n' ' ' < "$root/j2-calls" 2>/dev/null | head -c 400)"
  fi
  # AND THE INVOCATION RECORD SAYS SO. The call count is the figure the advance
  # bound is derived from, so a reader checking that derivation must be able to
  # read what the run actually spent rather than recount it from a stub log that
  # exists only in this fixture.
  if python3 - "$D" "$root" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
ci = pathlib.Path(rec["composition_input"])
inp = json.load(open(ci if ci.is_absolute() else pathlib.Path(sys.argv[2]) / ci))
row = (rec.get("judge_calls") or {}).get("J2_subdivision")
if not row:
    print("the run record carries no judge_calls row for J2_subdivision", file=sys.stderr); sys.exit(1)
if row.get("per_group") is not True or row.get("calls") != len(inp["groups"]):
    print("expected per_group=true and calls =", len(inp["groups"]), "; got", row, file=sys.stderr); sys.exit(1)
if sorted(row.get("groups") or []) != sorted(g["name"] for g in inp["groups"]):
    print("the row does not name every composed group:", row.get("groups"), file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the J2_subdivision invocation record does not name the per-group call count — the figure the advance bound is derived from is not readable from the run (kogaki#1062)"
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

  local declared declared_j2
  declared=$(python3 -c "
import json,sys
t=json.load(open('$root/src/workflow.json'))
print([s for s in t['states'] if s['id']=='J1_claims'][0]['retries'])")
  # J2's OWN bound, read separately. `retries` is declared PER STATE precisely
  # because the states differ in what a re-ask can repair, so a per-group
  # assertion reading J1's count would be green on a table that moved J2's.
  declared_j2=$(python3 -c "
import json,sys
t=json.load(open('$root/src/workflow.json'))
print([s for s in t['states'] if s['id']=='J2_subdivision'][0]['retries'])")
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

  # --- kogaki#1059 FIXTURE 1. THE BOUND REPAIRS RATHER THAN REPEATS. The judge
  # returns the live 2026-09-09 shape first and the conformant record second; the
  # run advances on attempt two, and the record carries the one refusal it
  # absorbed. The discriminator against the pre-fix behaviour is not the advance
  # alone -- a stub that repaired itself would advance even under a byte-identical
  # re-ask -- it is that ATTEMPT TWO'S PROMPT CARRIES ATTEMPT ONE'S REFUSAL.
  local D5="$root/run-repair"
  mkdir -p "$D5"
  (cd "$root" && node src/terrain.mjs start --run-dir "$D5" >/dev/null 2>&1)
  local qr pr
  qr=$(declared_question "$D5" TAG_SELECTION "$root") || {
    bad "$label: the repair run wrote no TAG_SELECTION declaration"
    return
  }
  pr=$(payload "toolu_fixture_repair" "$qr" "fixture")
  capture "$root" "$D5" "$pr" repair
  printf '%s' "$pr" | (cd "$root" && KOGAKI_RUN_DIR="$D5" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-repairs" \
      python3 .claude/hooks/advance-terrain.py >"$root/advrepair.out" 2>&1)

  if python3 - "$D5" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
r = (rec.get("judgment_refusals") or {}).get("J1_claims")
if not r:
    print("the record carries no judgment_refusals entry for J1_claims", file=sys.stderr); sys.exit(1)
if r.get("attempts") != 2 or not r.get("repaired") or len(r.get("refusals") or []) != 1:
    print("expected attempts=2, repaired=true and one refusal; got", r, file=sys.stderr); sys.exit(1)
if "composition_pin" not in (r["refusals"][0] or ""):
    print("the recorded refusal is not the shape refusal:", r["refusals"][0], file=sys.stderr); sys.exit(1)
if "J1_claims" not in (rec.get("judgments") or {}):
    print("the state did not advance", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: a judge that returned the live wrong shape once and the conformant record next did not advance on attempt two with ONE refusal on the record (kogaki#1059). The advance said: $(tail -3 "$root/advrepair.out" | tr '\n' ' ')"
  fi

  # THE FIRST ASK ALREADY CARRIED THE LITERAL SHAPE, filled from this run's own
  # composed input: the pin OBJECT with its `groups` map, and the composed group
  # names as the keys of `claims`. Asserted on prompt ONE, because an example that
  # only appeared on the re-ask would leave the first attempt spent on prose.
  if python3 - "$root/repair-prompt-1.txt" "$D5" "$root" <<'PY'
import json, sys, pathlib
prompt = pathlib.Path(sys.argv[1]).read_text()
rec = json.load(open(pathlib.Path(sys.argv[2], "run-record.json")))
ci = pathlib.Path(rec["composition_input"])
inp = json.load(open(ci if ci.is_absolute() else pathlib.Path(sys.argv[3]) / ci))
head = prompt.split("----- INPUT (JSON) -----")[0]
if '"composition_pin"' not in head or '"groups"' not in head:
    print("the ask carries no filled composition_pin object", file=sys.stderr); sys.exit(1)
for g in inp["groups"]:
    if f'"{g["name"]}"' not in head:
        print("the example does not name the composed group", g["name"], file=sys.stderr); sys.exit(1)
if inp["composition_pin"]["pin"] not in head:
    print("the example does not carry the run's own pin", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the FIRST ask carried no filled record example built from this run's composed input — the judge is told its record shape in prose alone, which is the defect kogaki#1059 closes"
  fi

  # AND ATTEMPT TWO IS A DIFFERENT ASK. Before kogaki#1059 the prompt was composed
  # once outside the retry loop, so attempt N+1 was byte-identical to attempt N:
  # the declared bound could not repair a shape mistake, it reproduced one
  # deterministic refusal three times.
  if python3 - "$root/repair-prompt-1.txt" "$root/repair-prompt-2.txt" "$D5" <<'PY'
import json, sys, pathlib
p1 = pathlib.Path(sys.argv[1]).read_text()
p2 = pathlib.Path(sys.argv[2]).read_text()
if p1 == p2:
    print("attempt two is byte-identical to attempt one", file=sys.stderr); sys.exit(1)
if "----- YOUR PREVIOUS ANSWER WAS REFUSED -----" not in p2:
    print("attempt two carries no refusal marker", file=sys.stderr); sys.exit(1)
rec = json.load(open(pathlib.Path(sys.argv[3], "run-record.json")))
refusal = rec["judgment_refusals"]["J1_claims"]["refusals"][0]
if refusal not in p2:
    print("attempt two does not carry attempt one's refusal VERBATIM", file=sys.stderr); sys.exit(1)
# And the refusal rides BEFORE the input marker, whose own contract is that
# everything after it is the input file verbatim.
if p2.index("----- YOUR PREVIOUS ANSWER WAS REFUSED -----") > p2.index("----- INPUT (JSON) -----"):
    print("the refusal was appended past the input marker", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: attempt two's prompt does not carry attempt one's refusal verbatim ahead of the input marker — the retry is a repetition rather than a repair loop (kogaki#1059)"
  fi

  # --- kogaki#1059 FIXTURE 2. THE SAME WRONG SHAPE EVERY TIME still fails after
  # the declared bound, carrying the refusal. The repair loop must not turn an
  # unrepairable answer into a run that never ends.
  local D6="$root/run-wrong-shape"
  mkdir -p "$D6"
  (cd "$root" && node src/terrain.mjs start --run-dir "$D6" >/dev/null 2>&1)
  local qw pw
  qw=$(declared_question "$D6" TAG_SELECTION "$root") || {
    bad "$label: the wrong-shape run wrote no TAG_SELECTION declaration"
    return
  }
  pw=$(payload "toolu_fixture_wrong_shape" "$qw" "fixture")
  capture "$root" "$D6" "$pw" wrong-shape
  printf '%s' "$pw" | (cd "$root" && KOGAKI_RUN_DIR="$D6" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-wrong-shape" \
      python3 .claude/hooks/advance-terrain.py >"$root/advwrong.out" 2>&1)
  if grep -q "on all $((declared + 1)) attempt(s)" "$root/advwrong.out"; then pass; else
    bad "$label: a judge returning the live wrong shape every time did not fail after the $declared re-ask(s) the table declares. It said: $(tail -3 "$root/advwrong.out" | tr '\n' ' ')"
  fi
  if grep -q "no usable .composition_pin. object" "$root/advwrong.out"; then pass; else
    bad "$label: the exhausted failure does not name the shape refusal it spent its attempts on"
  fi
  if python3 - "$D6" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
r = (rec.get("judgment_refusals") or {}).get("J1_claims")
if not r or r.get("repaired") is not False:
    print("expected an unrepaired judgment_refusals entry; got", r, file=sys.stderr); sys.exit(1)
if len(r.get("refusals") or []) != r.get("attempts"):
    print("the record does not carry one refusal per spent attempt:", r, file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the exhausted run's record does not carry every refusal the bound absorbed, marked unrepaired"
  fi

  # --- kogaki#1062 ACCEPTANCE 1, SECOND HALF. A stub that refuses ONE group's
  # record on its first call and conforms on its second advances the run, with
  # exactly one refusal recorded against THAT group and none against the others.
  # The discriminator against a whole-record retry is the untouched group: under
  # the old shape one bad entry re-asked the entire record, so every group's
  # judgment was recomputed and no per-group count existed to be wrong.
  local D7="$root/run-group-repair"
  mkdir -p "$D7"
  (cd "$root" && node src/terrain.mjs start --run-dir "$D7" >/dev/null 2>&1)
  local qgr pgr
  qgr=$(declared_question "$D7" TAG_SELECTION "$root") || {
    bad "$label: the per-group repair run wrote no TAG_SELECTION declaration"
    return
  }
  pgr=$(payload "toolu_fixture_group_repair" "$qgr" "fixture")
  capture "$root" "$D7" "$pgr" group-repair
  printf '%s' "$pgr" | (cd "$root" && KOGAKI_RUN_DIR="$D7" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-group-repairs" \
      python3 .claude/hooks/advance-terrain.py >"$root/advgrouprepair.out" 2>&1)

  if python3 - "$D7" "$root/group-repair-target" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
target = pathlib.Path(sys.argv[2]).read_text().strip()
if "J2_subdivision" not in (rec.get("judgments") or {}):
    print("the state did not advance", file=sys.stderr); sys.exit(1)
r = (rec.get("judgment_refusals") or {}).get("J2_subdivision")
if not r:
    print("the record carries no judgment_refusals entry for J2_subdivision", file=sys.stderr); sys.exit(1)
if not r.get("repaired"):
    print("the entry is not marked repaired:", r, file=sys.stderr); sys.exit(1)
groups = r.get("groups") or {}
if target not in groups:
    print("the per-group breakdown does not name the refused group", target, "; it names",
          sorted(groups), file=sys.stderr); sys.exit(1)
hit = groups[target]
if hit.get("attempts") != 2 or len(hit.get("refusals") or []) != 1 or not hit.get("repaired"):
    print("expected the refused group at attempts=2 with one refusal, repaired; got", hit,
          file=sys.stderr); sys.exit(1)
others = {k: v for k, v in groups.items() if k != target}
if not others:
    print("only one group was judged; the fixture cannot show that a passing group is not re-asked",
          file=sys.stderr); sys.exit(1)
for name, v in others.items():
    if v.get("attempts") != 1 or (v.get("refusals") or []):
        print(f"group {name!r} was re-asked although its own record was never refused: {v}",
              file=sys.stderr); sys.exit(1)
# AND THE FLAT LIST NAMES THE GROUP, so an operator reading `refusals` can tell
# which of eleven groups each refusal is about.
if len(r.get("refusals") or []) != 1 or target not in r["refusals"][0]:
    print("the flat refusal list does not carry exactly the one refusal, naming its group:",
          r.get("refusals"), file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: a judge that refused ONE group once and conformed next did not advance with exactly one refusal recorded against that group and none against the others (kogaki#1062). The advance said: $(tail -3 "$root/advgrouprepair.out" | tr '\n' ' ')"
  fi
  # AND THAT GROUP'S SECOND ASK CARRIED ITS OWN PRIOR REFUSAL — kogaki#1060's
  # per-attempt feedback applied PER GROUP, which is what makes the re-ask a
  # repair rather than a repetition at the per-group scale.
  if python3 - "$root" "$D7" <<'PY'
import json, sys, pathlib, glob
root = pathlib.Path(sys.argv[1])
import re
target = (root / "group-repair-target").read_text().strip()
slug = re.sub(r"[^a-zA-Z0-9]+", "-", target)
p2 = root / f"group-repair-prompt-{slug}-2.txt"
if not p2.exists():
    print("no second ask was made for the refused group:", p2.name, file=sys.stderr); sys.exit(1)
p1 = root / f"group-repair-prompt-{slug}-1.txt"
t1, t2 = p1.read_text(), p2.read_text()
if t1 == t2:
    print("the second ask is byte-identical to the first", file=sys.stderr); sys.exit(1)
if "----- YOUR PREVIOUS ANSWER WAS REFUSED -----" not in t2:
    print("the second ask carries no refusal marker", file=sys.stderr); sys.exit(1)
rec = json.load(open(pathlib.Path(sys.argv[2], "run-record.json")))
refusal = rec["judgment_refusals"]["J2_subdivision"]["groups"][target]["refusals"][0]
if refusal not in t2:
    print("the second ask does not carry the first's refusal VERBATIM", file=sys.stderr); sys.exit(1)
if t2.index("----- YOUR PREVIOUS ANSWER WAS REFUSED -----") > t2.index("----- INPUT (JSON) -----"):
    print("the refusal was appended past the input marker", file=sys.stderr); sys.exit(1)
# AND EVERY OTHER GROUP WAS ASKED EXACTLY ONCE.
for f in root.glob("group-repair-prompt-*-2.txt"):
    if f.name != p2.name:
        print("a group that was never refused was asked twice:", f.name, file=sys.stderr); sys.exit(1)
# THE FIRST ASK ALREADY CARRIED THE LITERAL RECORD SHAPE, keyed by this group and
# filled from the run's own composed input — the `record_example` this issue adds
# (item 5). Asserted on ask ONE, because an example that appeared only on the
# re-ask would leave the first attempt spent on prose, which is the defect
# kogaki#1059 closed for J1_claims and this state still carried.
head = t1.split("----- INPUT (JSON) -----")[0]
if f'"{target}"' not in head:
    print("the first ask carries no filled example keyed by this group", file=sys.stderr); sys.exit(1)
for token in ('"judged": true', '"subgroups"', '"coherence"', '"coherence_why"'):
    if token not in head:
        print("the filled example does not carry", token, file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the refused group's second ask did not carry its own prior refusal beside a filled record example keyed by that group (kogaki#1062 items 2 and 5)"
  fi

  # --- kogaki#1062 ACCEPTANCE 2. A stub that always returns the wrong shape for
  # ONE group fails the state after the declared bound, and the failure NAMES the
  # group and its refusal. A refusal naming only the state leaves an operator with
  # eleven groups and no way to tell which one spent the bound.
  local D8="$root/run-group-wrong"
  mkdir -p "$D8"
  (cd "$root" && node src/terrain.mjs start --run-dir "$D8" >/dev/null 2>&1)
  local qgw pgw
  qgw=$(declared_question "$D8" TAG_SELECTION "$root") || {
    bad "$label: the per-group wrong-shape run wrote no TAG_SELECTION declaration"
    return
  }
  pgw=$(payload "toolu_fixture_group_wrong" "$qgw" "fixture")
  capture "$root" "$D8" "$pgw" group-wrong
  printf '%s' "$pgw" | (cd "$root" && KOGAKI_RUN_DIR="$D8" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-group-wrong-shape" \
      python3 .claude/hooks/advance-terrain.py >"$root/advgroupwrong.out" 2>&1)

  local wrong_target
  wrong_target=$(cat "$root/group-wrong-target" 2>/dev/null || echo "")
  if [ -z "$wrong_target" ]; then
    bad "$label: the per-group wrong-shape stub was never reached at J2_subdivision"
  elif grep -qF "group \"$wrong_target\" was refused on all $((declared_j2 + 1)) attempt(s)" "$root/advgroupwrong.out"; then
    pass
  else
    bad "$label: the failure does not name the group that spent its bound, nor the $declared_j2 re-ask(s) the table declares (kogaki#1062). It said: $(tail -4 "$root/advgroupwrong.out" | tr '\n' ' ')"
  fi
  if grep -q "withdrawn pre-v9 form" "$root/advgroupwrong.out"; then pass; else
    bad "$label: the exhausted per-group failure does not carry the state's own refusal text — an operator is told a group failed and never why"
  fi
  if python3 - "$D8" "$root/group-wrong-target" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
target = pathlib.Path(sys.argv[2]).read_text().strip()
r = (rec.get("judgment_refusals") or {}).get("J2_subdivision")
if not r or r.get("repaired") is not False:
    print("expected an unrepaired judgment_refusals entry for J2_subdivision; got", r,
          file=sys.stderr); sys.exit(1)
hit = (r.get("groups") or {}).get(target)
if not hit or hit.get("repaired") is not False:
    print("the per-group breakdown does not mark the refused group unrepaired:", r.get("groups"),
          file=sys.stderr); sys.exit(1)
if len(hit.get("refusals") or []) != hit.get("attempts"):
    print("the group's record does not carry one refusal per spent attempt:", hit,
          file=sys.stderr); sys.exit(1)
if "judged_before" not in r:
    print("the record does not say which groups were judged before the failure", file=sys.stderr)
    sys.exit(1)
if target in (r.get("judged_before") or []):
    print("the failed group is listed among those judged before it", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the exhausted per-group run's record does not mark the failing group unrepaired beside the groups judged before it (kogaki#1062)"
  fi
  # AND IT WROTE NO ASSEMBLED RECORD. A state that failed on one group and still
  # left a partial per-group record behind would let the rest of the run read a
  # judgment that was never completed.
  if [ ! -f "$D8/terrain-judge-J2_subdivision.json" ]; then pass; else
    bad "$label: the failed per-group state wrote an assembled subdivision record anyway"
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
  note "ok: $cases case(s) pass — one payload for the tag answer carries compose_input, both judgments and the CoTagGroups write in a single invocation and stops at ID_SELECTION; one payload for the ID answer reaches FullReport.md and STRAND_SELECTION; a non-conformant judge record fails after the table's declared re-asks carrying the state's own refusal; a judge that returns the live wrong shape once repairs on attempt two, whose ask carries attempt one's refusal verbatim beside a record example filled from the run's own composed input, while one that never repairs still fails at the bound (kogaki#1059); and all of it holds with specs/ absent (kogaki#1030)"
  note "not asserted here: that the PINNED MODEL is reachable. The judge binary is stubbed through KOGAKI_JUDGE_CLI, so these cases bind the executor's call, parse, retry and refusal — never the model's answer, which is not this repository's to assert."
fi
exit "$fail"
