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
// THE SET IS OVERRIDABLE, and the override is what makes a CAP testable
// (kogaki#1068). Every group this default composes holds two members, and the
// `tight` cap is 5 -- so no record over this survey can breach it, and the four
// live breaches of 2026-09-09 had no fixture that could reproduce them. The
// override is read from the environment rather than by writing a second stub,
// because a second stub is a second served surface free to drift from this one.
const LESSONS = process.env.KOGAKI_FIXTURE_LESSONS
  ? JSON.parse(process.env.KOGAKI_FIXTURE_LESSONS)
  : [
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
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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

  # ---- THE SUBDIVIDING STUB (kogaki#1067). Every other J2 stub in this file
  # answers `{"judged": true, "subgroups": []}`, which is the cheapest conformant
  # record and exercises the ENVELOPE alone: `readSubdivisionEntry` checks
  # `judged` and that `subgroups` is an array, and nothing inside the entries. So
  # no fixture ever carried a SubGroup through `subgroupPlacement`, and the
  # renderer read a key — `sg.subgroup` — that the record example the judge is
  # bound to never writes. Both kogaki#1062 acceptances stayed green while every
  # live run stalled before `cotag_groups`.
  #
  # THE RECORD IS DERIVED FROM THE EXAMPLE, NEVER HAND-WRITTEN. It reads
  # `src/workflow.json`'s own `J2_subdivision.record_example` — the same object
  # the executor puts in front of the live judge — and fills its placeholders.
  # A hand-written record here would be a THIRD carrier of the shape, free to
  # drift from the example exactly as the reader did; filled from the example,
  # the example and the reader cannot disagree again without this fixture going
  # red. A placeholder the value table does not know is a hard exit naming the
  # key, so a key ADDED to the example fails here rather than being filled with
  # something invented.
  #
  # ONE SUBGROUP HOLDING THE WHOLE PARENT, which is what makes this fixture legal
  # over the tree's own two-member groups: `min_subgroup_members` is 3, and
  # report-format.json's `_why_min` exempts "a SubGroup holding the WHOLE parent
  # group" for the reason it states — M refuses a splinter, and a SubGroup that
  # divided nothing produced none. The label is `tight` rather than the residual
  # `other`, because a lone `other` SubGroup below the split threshold is exactly
  # what the display SUPPRESSES, and a suppressed split renders no SubGroup line
  # at all — the fixture would then assert nothing about the renderer.
  cat > "$root/judge-subdivides" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
const fs = require("node:fs");
const path = require("node:path");
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));

// The values, keyed by the EXAMPLE'S OWN KEY NAMES. Every placeholder the
// example carries must resolve here; nothing else is filled.
const VALUES = {
  name: (g) => `${g.name} — one fixture SubGroup`,
  claim: () => "In common: one fixture SubGroupClaim over this group's members.",
  coherence: () => "tight",
  coherence_why: () => "A fixture reason: the stub placed this group's whole membership together.",
};

function fill(node, g, key) {
  if (Array.isArray(node)) {
    // `members` is the one array whose CONTENT comes from the ask rather than
    // from the example: the example's entry is a placeholder describing where
    // the ids are drawn from, and the ids are this group's own.
    if (key === "members") return g.members.slice();
    return node.map((v) => fill(v, g, key));
  }
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fill(v, g, k)]));
  }
  if (typeof node === "string" && /^<.*>$/.test(node.trim())) {
    if (!VALUES[key]) {
      process.stderr.write(`the record example carries a placeholder under \`${key}\` that this stub `
        + "has no value for — the example and this fixture have drifted (kogaki#1067)\n");
      process.exit(6);
    }
    return VALUES[key](g);
  }
  return node;
}

let record;
if (input.kind === "composition-input" && /J1_claims/.test(prompt)) {
  record = {
    composition_pin: input.composition_pin,
    claims: Object.fromEntries(input.groups.map((g) => [g.name, `In common: a fixture claim over ${g.members.length} member(s).`])),
  };
} else if (input.kind === "composition-input") {
  const table = JSON.parse(fs.readFileSync(path.join(__dirname, "src", "workflow.json"), "utf8"));
  const row = table.states.find((s) => s.id === "J2_subdivision");
  const template = ((row || {}).record_example || {})["$per-group"];
  if (!template) {
    process.stderr.write("J2_subdivision carries no `$per-group` record_example for this stub to fill "
      + "— the state's shape is bound by prose again (kogaki#1067)\n");
    process.exit(5);
  }
  record = Object.fromEntries(input.groups.map((g) => [g.name, fill(template, g)]));
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
  process.stderr.write("the subdividing stub does not know this state\n");
  process.exit(4);
}
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE

  cat > "$root/judge-nonconformant" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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
  # answered conformantly. At J2 exactly ONE group -- whichever call claims the
  # target file, the claim being exclusive (kogaki#1073) -- is refused once --
  # by returning the live 2026-09-09 shape, the entry wrapped in an envelope
  # carrying a `kind` key -- and answered conformantly on its second call. Every
  # other group is answered conformantly on its FIRST call, which is what makes
  # the property under test observable: a group that passed is not re-asked, so
  # the refusal must land against that one group alone.
  cat > "$root/judge-group-repairs" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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
// THE TARGET IS CLAIMED EXCLUSIVELY, NOT READ-THEN-WRITTEN (kogaki#1073). The
// per-group calls now run CONCURRENTLY under the table's cap, so two stubs reach
// this line at the same instant; a read-then-write would let both find the file
// empty and both name themselves the target, and the case would then see two
// groups refused where it asserts exactly one. `linkSync` fails when the name
// already exists, so exactly one call wins and every other reads the winner's
// fully written file rather than a file mid-write.
function claimTarget(targetFile, name) {
  const tmp = `${targetFile}.${process.pid}`;
  fs.writeFileSync(tmp, name);
  try { fs.linkSync(tmp, targetFile); } catch { /* another call claimed it first */ }
  fs.unlinkSync(tmp);
  return fs.readFileSync(targetFile, "utf8").trim();
}
// THE GROUP OF WHICHEVER J2 CALL CLAIMS THE TARGET, then fixed. The stub sees one
// group per call and cannot know the whole set, so the target is whichever group
// claims it; that is enough, because the property under test is that the OTHER
// groups are not re-asked, and their identity does not matter.
const target = claimTarget(targetFile, g.name);
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
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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
// THE TARGET IS CLAIMED EXCLUSIVELY, NOT READ-THEN-WRITTEN (kogaki#1073). The
// per-group calls now run CONCURRENTLY under the table's cap, so two stubs reach
// this line at the same instant; a read-then-write would let both find the file
// empty and both name themselves the target, and the case would then see two
// groups refused where it asserts exactly one. `linkSync` fails when the name
// already exists, so exactly one call wins and every other reads the winner's
// fully written file rather than a file mid-write.
function claimTarget(targetFile, name) {
  const tmp = `${targetFile}.${process.pid}`;
  fs.writeFileSync(tmp, name);
  try { fs.linkSync(tmp, targetFile); } catch { /* another call claimed it first */ }
  fs.unlinkSync(tmp);
  return fs.readFileSync(targetFile, "utf8").trim();
}
const target = claimTarget(targetFile, g.name);
const record = g.name === target
  // THE WITHDRAWN PRE-V9 BARE ARRAY, which `readSubdivisionEntry` refuses by
  // name -- the shipped refusal, composed nowhere here.
  ? { [g.name]: [] }
  : { [g.name]: { judged: true, subgroups: [] } };
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE
  # ---- THE SubGroup RULE STUBS (kogaki#1068). Both answer J1 conformantly and
  # subdivide at J2 from the state's own `record_example`, so the SHAPE is the
  # example's and only the PARTITION is the fixture's -- the same discipline
  # `judge-subdivides` takes, for the same reason: a hand-written record here
  # would be a further carrier of the shape, free to drift from the example.
  #
  # THEY ARE SPENT AGAINST THE WIDE TREE, whose selected tag composes one group
  # of six members and one of two. Six is what makes the `tight` cap of 5 a rule
  # a record can actually breach; every other tree in this file composes groups
  # of two, under which no cap can fire.
  cat > "$root/judge-subgroup-lib.js" <<'LIB'
// The SubGroup shape, FILLED FROM `src/workflow.json`'s own record example and
// never written out here. `members` is the one field the fixture supplies: the
// example's entry is a placeholder naming where the ids come from, and which ids
// go in which SubGroup is exactly what these cases vary.
const fs = require("node:fs");
const path = require("node:path");
function template(root) {
  const table = JSON.parse(fs.readFileSync(path.join(root, "src", "workflow.json"), "utf8"));
  const row = table.states.find((s) => s.id === "J2_subdivision");
  const t = ((row || {}).record_example || {})["$per-group"];
  if (!t) {
    process.stderr.write("J2_subdivision carries no `$per-group` record_example for this stub to fill\n");
    process.exit(5);
  }
  return t;
}
function subgroup(root, name, members, coherence) {
  const VALUES = {
    name: () => name,
    claim: () => "In common: one fixture SubGroupClaim over these members.",
    coherence: () => coherence,
    coherence_why: () => "A fixture reason: the stub placed these members together.",
  };
  const fill = (node, key) => {
    if (Array.isArray(node)) {
      if (key === "members") return members.slice();
      return node.map((v) => fill(v, key));
    }
    if (node && typeof node === "object") {
      return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, fill(v, k)]));
    }
    if (typeof node === "string" && /^<.*>$/.test(node.trim())) {
      if (!VALUES[key]) {
        process.stderr.write(`the record example carries a placeholder under \`${key}\` that this stub `
          + "has no value for -- the example and this fixture have drifted (kogaki#1068)\n");
        process.exit(6);
      }
      return VALUES[key]();
    }
    return node;
  };
  return fill(template(root).subgroups[0], null);
}
function j1(input) {
  return {
    composition_pin: input.composition_pin,
    claims: Object.fromEntries(input.groups.map((g) => [g.name, `In common: a fixture claim over ${g.members.length} member(s).`])),
  };
}
module.exports = { subgroup, j1 };
LIB

  # ---- ACCEPTANCE 1. OVER THE CAP ONCE, THEN CONFORMANT. The wide group's first
  # record puts all six members in ONE `tight` SubGroup, which is over the cap of
  # 5; its second splits them into two of three, which is not. The property is
  # that the breach is a refusal INSIDE the re-ask window -- before this issue it
  # was a `cotag_groups` failure, raised after every group's call was spent, with
  # no route back to the judge.
  cat > "$root/judge-cap-repairs" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
const fs = require("node:fs");
const path = require("node:path");
const lib = require(path.join(__dirname, "judge-subgroup-lib.js"));
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
if (/`J1_claims` judgment point/.test(prompt)) {
  process.stdout.write(JSON.stringify({ result: JSON.stringify(lib.j1(input)) }) + "\n");
  process.exit(0);
}
const g = input.groups[0];
const slug = g.name.replace(/[^a-zA-Z0-9]+/g, "-");
// EVERY PROMPT IS KEPT, because acceptance 3 is a property OF THE PROMPT: the
// limits the record is judged against have to be IN the ask.
const seenFile = path.join(__dirname, `cap-seen-${slug}`);
let seen = 0;
try { seen = Number(fs.readFileSync(seenFile, "utf8").trim()) || 0; } catch { seen = 0; }
fs.writeFileSync(seenFile, String(seen + 1));
fs.writeFileSync(path.join(__dirname, `cap-prompt-${slug}-${seen + 1}.txt`), prompt);
let subgroups;
if (g.members.length <= 2) {
  // The small group: one SubGroup holding the whole parent, which the minimum
  // exempts by name and no cap binds at this size.
  subgroups = [lib.subgroup(__dirname, `${g.name} — whole`, g.members, "tight")];
} else if (seen === 0) {
  // OVER THE CAP: all six at `tight`, the shape four of eleven live groups
  // returned on 2026-09-09.
  fs.writeFileSync(path.join(__dirname, "cap-target"), g.name);
  subgroups = [lib.subgroup(__dirname, `${g.name} — all of it`, g.members, "tight")];
} else {
  const half = Math.ceil(g.members.length / 2);
  subgroups = [
    lib.subgroup(__dirname, `${g.name} — first`, g.members.slice(0, half), "tight"),
    lib.subgroup(__dirname, `${g.name} — second`, g.members.slice(half), "tight"),
  ];
}
process.stdout.write(JSON.stringify({ result: JSON.stringify({
  [g.name]: { judged: true, subgroups },
}) }) + "\n");
JUDGE

  # ---- ACCEPTANCE 2. A MEMBER LEFT UNPLACED, ON EVERY CALL. The wide group's
  # record places five of its six members and never the sixth, so the bound is
  # spent and the state fails naming the group and the member it left.
  cat > "$root/judge-unplaced" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
const fs = require("node:fs");
const path = require("node:path");
const lib = require(path.join(__dirname, "judge-subgroup-lib.js"));
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
if (/`J1_claims` judgment point/.test(prompt)) {
  process.stdout.write(JSON.stringify({ result: JSON.stringify(lib.j1(input)) }) + "\n");
  process.exit(0);
}
const g = input.groups[0];
let subgroups;
if (g.members.length <= 2) {
  subgroups = [lib.subgroup(__dirname, `${g.name} — whole`, g.members, "tight")];
} else {
  const kept = g.members.slice(0, g.members.length - 1);
  // THE LEFT MEMBER IS WRITTEN DOWN, so the assertion names it without retyping
  // an id the survey stub mints.
  fs.writeFileSync(path.join(__dirname, "unplaced-target"),
    JSON.stringify({ group: g.name, member: g.members[g.members.length - 1] }));
  subgroups = [lib.subgroup(__dirname, `${g.name} — most of it`, kept, "tight")];
}
process.stdout.write(JSON.stringify({ result: JSON.stringify({
  [g.name]: { judged: true, subgroups },
}) }) + "\n");
JUDGE

  # ---- THE WHOLE-SPAN SUBDIVIDING STUB (kogaki#1085). Conformant at every
  # judgment point the span reaches AND returning REAL SubGroups at J2, which no
  # other stub in this file does: `judge-conformant` answers judged-EMPTY, so a
  # run driven by it prints no SubGroup id and cannot enter one, and
  # `judge-cap-repairs` returns SubGroups but knows no state past J2. The defect
  # this fixture covers lives BETWEEN those two — a display that prints SubGroup
  # ids and a next state that cannot resolve them — so it needs one stub that
  # reaches both.
  cat > "$root/judge-span-subgroups" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076).
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
const fs = require("node:fs");
const path = require("node:path");
const lib = require(path.join(__dirname, "judge-subgroup-lib.js"));
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
let record;
if (input.kind === "composition-input" && /J1_claims/.test(prompt)) {
  record = lib.j1(input);
} else if (input.kind === "composition-input") {
  // J2_subdivision, per group. A group above the minimum is SPLIT IN HALF, which
  // is what puts SubGroup ids on the display; one at or below it becomes a single
  // SubGroup holding the whole parent, which the minimum exempts by name.
  const g = input.groups[0];
  const subgroups = g.members.length <= 2
    ? [lib.subgroup(__dirname, `${g.name} — whole`, g.members, "tight")]
    : (() => {
        const half = Math.ceil(g.members.length / 2);
        return [lib.subgroup(__dirname, `${g.name} — first`, g.members.slice(0, half), "tight"),
                lib.subgroup(__dirname, `${g.name} — second`, g.members.slice(half), "tight")];
      })();
  record = { [g.name]: { judged: true, subgroups } };
} else if (input.state === "thesis_candidates") {
  // THE ASK'S OWN STRAND SET IS WHAT IS COMPOSED OVER, never a wider one: the
  // state refuses a candidate naming a Strand outside `strands_you_may_use`, so
  // a stub reaching past it would be refused rather than green.
  const strands = input.strands_you_may_use;
  record = Array.from({ length: input.candidates_required }, (_, i) => ({
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
  process.stderr.write("the span stub does not know this state\n");
  process.exit(4);
}
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE

  chmod +x "$root/judge-conformant" "$root/judge-nonconformant" "$root/judge-garbage" \
           "$root/judge-repairs" "$root/judge-wrong-shape" \
           "$root/judge-group-repairs" "$root/judge-group-wrong-shape" \
           "$root/judge-subdivides" "$root/judge-cap-repairs" "$root/judge-unplaced" \
           "$root/judge-span-subgroups"
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
  if ! (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-conformant" node src/terrain.mjs start --run-dir "$D" >"$root/start.out" 2>&1); then
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
  # reaches the terminal. It used to end at the STRAND_SELECTION declaration;
  # kogaki#1087 deleted that wait, so `full_report` is the last state before
  # `done` and the span's end is what this case now reads.
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
  # AND ITS IDENTITY CARRIES THE BINARY (kogaki#1076 item 3). The judge pin named
  # the model, the effort and the survey revision, so two reports with equal pins
  # could have been produced by different executables and the identity they
  # collide on could not tell them apart.
  if python3 - "$D" <<'PY'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1])
rec = json.load(open(d / "run-record.json"))
want = (rec.get("judge_binary") or {}).get("version")
if not want:
    print("the run record carries no resolved binary version", file=sys.stderr); sys.exit(1)
seen = 0
for f in sorted(d.glob("*.json")):
    try:
        doc = json.load(open(f))
    except Exception:
        continue
    identity = doc.get("identity") if isinstance(doc, dict) else None
    if not isinstance(identity, dict) or "judge_pin" not in identity:
        continue
    seen += 1
    pin = identity["judge_pin"]
    if not isinstance(pin, dict):
        print(f"{f.name}: judge_pin is {pin!r}", file=sys.stderr); sys.exit(1)
    if pin.get("binary_version") != want:
        print(f"{f.name}: judge_pin.binary_version is {pin.get('binary_version')!r}, not {want!r}",
              file=sys.stderr); sys.exit(1)
if not seen:
    print("no report record carrying an identity was written", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the Full Report's identity does not pin the resolved binary's version (kogaki#1076 item 3)"
  fi
  # THE SPAN ENDS AT THE TERMINAL, AND NO THIRD QUESTION IS OWED (kogaki#1087).
  # Read as a CONJUNCTION rather than as `done: true` alone: a table that grew a
  # fourth wait back would leave `awaiting` naming it, and one that kept a stub
  # would leave a declaration owed over a state nothing reads.
  if python3 - "$D" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
if not rec.get("done"):
    print("the run did not reach the terminal after the ID answer", file=sys.stderr); sys.exit(1)
if rec.get("awaiting") is not None:
    print("the run is still awaiting", rec.get("awaiting"), file=sys.stderr); sys.exit(1)
unwritten = [g for g in rec["gate_declarations_owed"] if not g.get("declaration")]
if unwritten:
    print("declarations owed and unwritten:", unwritten, file=sys.stderr); sys.exit(1)
if "STRAND_SELECTION" in rec["completed"] or "STRAND_SELECTION" in rec["waits_reached"]:
    print("the deleted STRAND_SELECTION wait was reached", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the ID answer does not carry the run to its terminal with no further question owed (kogaki#1087)"
  fi

  # AND THE LEDGER NAMES BOTH OWNER ARTIFACTS (kogaki#1087 acceptance 5). The
  # live run of 2026-09-10 completed `full_report`, wrote reports/FullReport.md,
  # and recorded only the co-tag file -- the write outcome is OBSERVED from a
  # return value the report path had stopped returning. Asserted over the RECORD
  # rather than over the filesystem, because the file existing is what made the
  # loss invisible.
  if python3 - "$D" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
by_state = {a["state"]: a for a in rec.get("artifacts_written") or []}
for state in ("cotag_groups", "full_report"):
    if state not in by_state:
        print("artifacts_written names no write for", state, ":", rec.get("artifacts_written"),
              file=sys.stderr); sys.exit(1)
    if not by_state[state].get("path"):
        print(state, "is recorded with no path:", by_state[state], file=sys.stderr); sys.exit(1)
if not by_state["full_report"]["path"].endswith("FullReport.md"):
    print("full_report recorded", by_state["full_report"]["path"], file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the run record's artifacts_written does not name the Full Report beside the co-tag file (kogaki#1087 acceptance 5)"
  fi

  # AND THE ID QUESTION CARRIED THE GROUPING (kogaki#1087 acceptance 4). The
  # declaration holds the written artifact's BYTES, and the byte-fixed gate call
  # puts them above the question line -- so the owner answers over the grouping
  # rather than over a path they may or may not have opened.
  if python3 - "$D" <<'PY'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1])
decl = json.load(open(d / "terrain-id-selection.run-declaration.json"))
listing = decl.get("groups_listing")
if "groups_artifact" in decl:
    print("the declaration still carries the retired groups_artifact pointer", file=sys.stderr); sys.exit(1)
if not isinstance(listing, str) or not listing.strip():
    print("the declaration carries no groups_listing", file=sys.stderr); sys.exit(1)
if listing.lstrip().startswith("none"):
    print("the grouping was absent at the gate:", listing[:120], file=sys.stderr); sys.exit(1)
call = json.load(open(d / "terrain-id-selection.gate-call.json"))
q = call["questions"][0]["question"]
if not q.startswith(listing):
    print("the gate call does not open with the grouping", file=sys.stderr); sys.exit(1)
if "read in full" not in q:
    print("the question is not the owner-vocabulary wording:", q[-200:], file=sys.stderr); sys.exit(1)
labels = [o["label"] for o in call["questions"][0]["options"]]
if not any(l.lower().startswith("none of these") for l in labels):
    print("the decline arm is not reworded:", labels, file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the ID gate's call does not carry the composed grouping above an owner-vocabulary question (kogaki#1087 acceptance 4)"
  fi

  # --- ACCEPTANCE 2. The non-conformant stub: the run fails after the declared
  # retry count, and the failure names the refusal.
  local D2="$root/run-bad"
  mkdir -p "$D2"
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-nonconformant" node src/terrain.mjs start --run-dir "$D2" >/dev/null 2>&1)
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
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-garbage" node src/terrain.mjs start --run-dir "$D3" >/dev/null 2>&1)
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
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-repairs" node src/terrain.mjs start --run-dir "$D5" >/dev/null 2>&1)
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
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-wrong-shape" node src/terrain.mjs start --run-dir "$D6" >/dev/null 2>&1)
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
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-group-repairs" node src/terrain.mjs start --run-dir "$D7" >/dev/null 2>&1)
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
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-group-wrong-shape" node src/terrain.mjs start --run-dir "$D8" >/dev/null 2>&1)
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

  # --- kogaki#1067 ACCEPTANCE 1. A NON-EMPTY SUBDIVISION REACHES THE DISPLAY.
  # The stub returns the `record_example` FILLED for every composed group, so one
  # tag answer carries the run through `J2_subdivision` into `cotag_groups` with a
  # real SubGroup in hand and writes the co-tag display with it rendered.
  #
  # WHAT NO OTHER CASE HERE CAN REACH. Every span above answers J2 with
  # `subgroups: []`, which is conformant and exercises the envelope alone — so the
  # placement, the coherence read, the SubGroupID derivation and the SubGroup lines
  # of the display were all unreached, and `subgroupPlacement` read `sg.subgroup`
  # and took the whole entry as the verdicts object against an example writing
  # `name` and a nested `verdicts` (kogaki#1067). The assertion is on the WRITTEN
  # DISPLAY rather than on the record, because the record is what was already
  # green while the display did not exist.
  #
  # THE CO-TAG FILE IS REWRITTEN BY THIS RUN, which is why the case sits last: the
  # spans above assert that `reports/CoTagGroups.md` EXISTS, and this one asserts
  # what a subdividing run puts in it.
  local D9="$root/run-subdivides"
  mkdir -p "$D9"
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-subdivides" node src/terrain.mjs start --run-dir "$D9" >/dev/null 2>&1)
  local qsd psd
  qsd=$(declared_question "$D9" TAG_SELECTION "$root") || {
    bad "$label: the subdividing run wrote no TAG_SELECTION declaration"
    return
  }
  psd=$(payload "toolu_fixture_subdivides" "$qsd" "fixture")
  capture "$root" "$D9" "$psd" subdivides
  printf '%s' "$psd" | (cd "$root" && KOGAKI_RUN_DIR="$D9" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-subdivides" \
      python3 .claude/hooks/advance-terrain.py >"$root/advsubdiv.out" 2>&1)

  if python3 - "$D9" "$root" <<'PY'
import json, sys, pathlib
run, root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
rec = json.load(open(run / "run-record.json"))
by = {t["state"]: t for t in rec.get("transitions", [])}
for s in ("J2_subdivision", "cotag_groups"):
    if s not in by:
        print("the subdividing span never reached", s, file=sys.stderr); sys.exit(1)
# THE JUDGE'S OWN SUBGROUP, read from the assembled record rather than retyped:
# the name the fixture asserts on the display is the one the stub composed.
entry = json.load(open(run / "terrain-judge-J2_subdivision.json"))
record = entry.get("record") if isinstance(entry, dict) and "record" in entry else entry
groups = [g for g in record.values() if isinstance(g, dict) and g.get("subgroups")]
if not groups:
    print("the assembled J2 record carries no SubGroup — the stub's filled example did not survive "
          "the state's own reader", file=sys.stderr); sys.exit(1)
names = [sg["name"] for g in groups for sg in g["subgroups"]]
display = (root / "reports" / "CoTagGroups.md").read_text(encoding="utf-8")
missing = [n for n in names if n not in display]
if missing:
    print("the co-tag display names no such SubGroup:", missing, file=sys.stderr); sys.exit(1)
# The SubGroupID and the coherence line are the two things a SubGroup adds to the
# display; a run that printed the name inside the group heading alone would pass
# on the name check and have rendered no SubGroup at all.
import re
if not re.search(r'^G\d+-1 — ', display, re.M):
    print("the display carries no `G<n>-1` SubGroup line", file=sys.stderr); sys.exit(1)
if "coherence: tight — " not in display:
    print("the display carries no coherence line for the rendered SubGroup", file=sys.stderr)
    sys.exit(1)
PY
  then pass; else
    bad "$label: a judge returning the filled J2_subdivision record_example did not carry the run through cotag_groups into a co-tag display rendering that SubGroup (kogaki#1067). The advance said: $(tail -4 "$root/advsubdiv.out" | tr '\n' ' ')"
  fi
}


# ---- THE SubGroup RULES BIND WHERE THE RE-ASK IS (kogaki#1068).
#
# WHAT THIS REACHES THAT NOTHING ELSE DOES. The rules -- the per-label member
# caps, `min_subgroup_members`, the residual bound and the cover -- lived in
# `subgroupPlacement` and `judgeSubgroup`, which only the two RENDER states call.
# `J2_subdivision`, the state holding the bounded per-group re-ask, checked the
# ENVELOPE alone. So a record breaching a rule passed J2, spent every group's
# call, and failed the run at `cotag_groups` with a refusal the judge never saw;
# on the parked 2026-09-09 live run nine of eleven groups breached one. Every
# case above composes groups of two members, under which no cap can fire and no
# member can be left over -- so no fixture in this file could construct the
# defect until this tree.
#
# THE WIDE SURVEY, and it is the whole reason for a third tree: one co-tag group
# of six members, over which the `tight` cap of 5 binds and a five-member
# placement leaves exactly one member over, beside one group of two so a refusal
# naming a group names something.
WIDE_LESSONS='[
  {"slug":"a-wide-one","tags":["fixture","wide"]},
  {"slug":"a-wide-two","tags":["fixture","wide"]},
  {"slug":"a-wide-three","tags":["fixture","wide"]},
  {"slug":"a-wide-four","tags":["fixture","wide"]},
  {"slug":"a-wide-five","tags":["fixture","wide"]},
  {"slug":"a-wide-six","tags":["fixture","wide"]},
  {"slug":"a-narrow-one","tags":["fixture","narrow"]},
  {"slug":"a-narrow-two","tags":["fixture","narrow"]}
]'

drive_limits() {                     # drive_limits <label> <tree>
  local label=$1 root=$2
  mkdir -p "$root/open-gates"
  export KOGAKI_OPEN_GATES="$root/open-gates"
  export CLAUDE_CODE_SESSION_ID="fixture-session"
  # THE SURVEY THE STUB SERVES, for this tree alone. Exported rather than written
  # into a second gateway stub, so the served shape stays one file.
  export KOGAKI_FIXTURE_LESSONS="$WIDE_LESSONS"
  local declared_j2
  declared_j2=$(python3 -c "
import json
t = json.load(open('src/workflow.json'))
print([s for s in t['states'] if s['id'] == 'J2_subdivision'][0]['retries'])")

  # --- ACCEPTANCE 1. A record over the `tight` cap is refused INSIDE the re-ask
  # window, and a conformant second answer advances the run: exactly one refusal
  # against that group, and the refusal text names the cap.
  local D1="$root/run-cap"
  mkdir -p "$D1"
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-cap-repairs" node src/terrain.mjs start --run-dir "$D1" >/dev/null 2>&1)
  local q1 p1
  q1=$(declared_question "$D1" TAG_SELECTION "$root") || {
    bad "$label: the cap run wrote no TAG_SELECTION declaration"
    return
  }
  p1=$(payload "toolu_fixture_cap" "$q1" "fixture")
  capture "$root" "$D1" "$p1" cap
  printf '%s' "$p1" | (cd "$root" && KOGAKI_RUN_DIR="$D1" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-cap-repairs" \
      python3 .claude/hooks/advance-terrain.py >"$root/advcap.out" 2>&1)

  if python3 - "$D1" "$root/cap-target" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
tgt = pathlib.Path(sys.argv[2])
if not tgt.exists():
    print("the over-cap stub never reached the wide group at J2", file=sys.stderr); sys.exit(1)
target = tgt.read_text().strip()
if "J2_subdivision" not in (rec.get("judgments") or {}):
    print("the state did not advance past J2_subdivision", file=sys.stderr); sys.exit(1)
r = (rec.get("judgment_refusals") or {}).get("J2_subdivision")
if not r or not r.get("repaired"):
    print("expected a repaired judgment_refusals entry for J2_subdivision; got", r,
          file=sys.stderr); sys.exit(1)
hit = (r.get("groups") or {}).get(target)
if not hit or hit.get("attempts") != 2 or len(hit.get("refusals") or []) != 1:
    print("expected exactly one refusal against the over-cap group; got", hit,
          file=sys.stderr); sys.exit(1)
# THE REFUSAL NAMES THE CAP, and the number is read from the carrier rather than
# retyped here -- a case asserting a literal 5 would go green against a
# report-format.json an owner had edited.
cap = json.load(open("src/report-format.json"))["limits"]["subgroup_member_cap"]["tight"]
text = hit["refusals"][0]
if f"over the cap of {cap}" not in text:
    print("the refusal does not name the tight cap the carrier declares:", text,
          file=sys.stderr); sys.exit(1)
if "limits.subgroup_member_cap.tight" not in text:
    print("the refusal does not name the carrier the cap was read from:", text,
          file=sys.stderr); sys.exit(1)
# AND IT WAS RAISED AT J2, NOT AT cotag_groups: the run reached the render state
# and wrote its display, which the pre-repair order could never do.
by = {t["state"]: t for t in rec.get("transitions", [])}
if "cotag_groups" not in by:
    print("the run never reached cotag_groups", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: a judge returning an over-cap SubGroup once and conforming next did not advance with exactly one refusal, naming the cap, recorded against that group (kogaki#1068 acceptance 1). The advance said: $(tail -4 "$root/advcap.out" | tr '\n' ' ')"
  fi

  # --- ACCEPTANCE 3. THE ASK STATES THE LIMITS, and the numbers in the prompt are
  # the file's. Asserted on ask ONE: limits that appeared only on a re-ask would
  # leave the first attempt spent on a rule the judge was never told.
  if python3 - "$root" <<'PY'
import json, sys, pathlib, re
root = pathlib.Path(sys.argv[1])
target = (root / "cap-target").read_text().strip()
slug = re.sub(r"[^a-zA-Z0-9]+", "-", target)
p1 = root / f"cap-prompt-{slug}-1.txt"
if not p1.exists():
    print("no first ask was kept for the wide group", file=sys.stderr); sys.exit(1)
text = p1.read_text()
body = text.split("----- INPUT (JSON) -----", 1)[1]
inp = json.loads(body)
limits = inp.get("limits")
if not limits:
    print("the per-group ask carries no `limits` block", file=sys.stderr); sys.exit(1)
declared = json.load(open("src/report-format.json"))["limits"]
caps = {k: v for k, v in declared["subgroup_member_cap"].items() if not k.startswith("_")}
if limits.get("subgroup_member_cap") != caps:
    print("the ask's caps are not report-format.json's:", limits.get("subgroup_member_cap"),
          "vs", caps, file=sys.stderr); sys.exit(1)
if limits.get("min_subgroup_members") != declared["min_subgroup_members"]:
    print("the ask's minimum is not the file's", file=sys.stderr); sys.exit(1)
if limits.get("max_residual_members") != declared["max_residual_members"]:
    print("the ask's residual bound is not the file's", file=sys.stderr); sys.exit(1)
# AND THE COVER RULE IS STATED, which is the one limit that is not a number.
if "every_member_must_be_placed" not in limits:
    print("the ask does not state that every member must be placed", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the per-group ask does not carry the limits its record is judged against, equal to report-format.json's own numbers (kogaki#1068 acceptance 3)"
  fi

  # --- ACCEPTANCE 2. A member left unplaced on EVERY call fails the state after
  # the declared bound, naming the group and the member -- and writes no assembled
  # record, so nothing downstream reads a judgment that was never completed.
  local D2="$root/run-unplaced"
  mkdir -p "$D2"
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-unplaced" node src/terrain.mjs start --run-dir "$D2" >/dev/null 2>&1)
  local q2 p2
  q2=$(declared_question "$D2" TAG_SELECTION "$root") || {
    bad "$label: the unplaced run wrote no TAG_SELECTION declaration"
    return
  }
  p2=$(payload "toolu_fixture_unplaced" "$q2" "fixture")
  capture "$root" "$D2" "$p2" unplaced
  printf '%s' "$p2" | (cd "$root" && KOGAKI_RUN_DIR="$D2" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-unplaced" \
      python3 .claude/hooks/advance-terrain.py >"$root/advunplaced.out" 2>&1)

  local unplaced_group unplaced_member
  unplaced_group=$(python3 -c "
import json,sys
try: print(json.load(open('$root/unplaced-target'))['group'])
except Exception: sys.exit(1)" 2>/dev/null || echo "")
  unplaced_member=$(python3 -c "
import json,sys
try: print(json.load(open('$root/unplaced-target'))['member'])
except Exception: sys.exit(1)" 2>/dev/null || echo "")
  if [ -z "$unplaced_group" ]; then
    bad "$label: the unplaced stub was never reached at J2_subdivision"
  elif grep -qF "group \"$unplaced_group\" was refused on all $((declared_j2 + 1)) attempt(s)" "$root/advunplaced.out"; then
    pass
  else
    bad "$label: the failure does not name the group that spent its bound over the $declared_j2 re-ask(s) the table declares (kogaki#1068 acceptance 2). It said: $(tail -4 "$root/advunplaced.out" | tr '\n' ' ')"
  fi
  if grep -qF "$unplaced_member" "$root/advunplaced.out" \
     && grep -q "SUBDIVISION_COVER_INCOMPLETE" "$root/advunplaced.out"; then pass; else
    bad "$label: the exhausted failure does not carry the cover refusal naming the member left unplaced -- an operator is told a group failed and never which member it left"
  fi
  if [ ! -f "$D2/terrain-judge-J2_subdivision.json" ]; then pass; else
    bad "$label: the state failed on the cover rule and wrote an assembled subdivision record anyway (kogaki#1068 acceptance 2)"
  fi
  unset KOGAKI_FIXTURE_LESSONS
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

# ---- THE RECORD EXAMPLE'S LABEL ENUMERATION IS A COPY, SO IT OWES A MISMATCH
# CHECK (PR #1065 round 1). `record_example` exists so a record shape stops being
# carried by prose — and the first one written for `J2_subdivision` arrived
# carrying a THREE-label set while `COHERENCE_LABELS` holds four, `loose` having
# joined at kogaki#738. A judge that follows the shape it is handed could then
# never emit `loose`, so every borderline SubGroup landed as `related` or in the
# residual: the example was a fourth hand-written carrier of the set, drifting on
# arrival exactly as the row's own `input_shape` sentence already had.
#
# THE COPY IS KEPT AND SUBORDINATED rather than removed. Filling it from the
# constant would need a third `record_example` directive, which is added by ruling
# and not by spelling; a copy with a declared mismatch check is the shape that is
# already ratified for this situation. Both the example and the row's prose are
# checked, because two carriers of one set is what produced the defect.
if python3 - <<'PY'
import json, re, sys
labels = re.search(r'COHERENCE_LABELS = Object\.freeze\(\[([^\]]*)\]\)',
                   open("src/terrain.mjs", encoding="utf-8").read())
if not labels:
    print("src/terrain.mjs declares no COHERENCE_LABELS — the set this checks against is gone",
          file=sys.stderr); sys.exit(1)
declared = re.findall(r'"([a-z]+)"', labels.group(1))
table = json.load(open("src/workflow.json"))
row = [s for s in table["states"] if s["id"] == "J2_subdivision"][0]
ex = row.get("record_example")
if not ex:
    print("J2_subdivision declares no record_example — its shape is carried by prose again",
          file=sys.stderr); sys.exit(1)
found = json.dumps(ex)
verdicts = ex["$per-group"]["subgroups"][0]["verdicts"]["coherence"]
in_example = re.findall(r'[a-z]+', verdicts)
if in_example != declared:
    print(f"the record example offers {in_example} and COHERENCE_LABELS is {declared} — a judge "
          "following the shape it is handed cannot emit a label the example omits",
          file=sys.stderr); sys.exit(1)
# AND THE ROW'S OWN PROSE, which is the carrier that drifted first.
for field in ("input_shape", "refusal"):
    text = row.get(field) or ""
    for retired in ("forced",):
        if re.search(rf'\b{retired}\b', text):
            print(f"the row's {field} still names the retired label {retired!r} (kogaki#738)",
                  file=sys.stderr); sys.exit(1)
if "closed set " + " | ".join(declared) not in row["input_shape"]:
    print("the row's input_shape does not name the closed set COHERENCE_LABELS declares",
          file=sys.stderr); sys.exit(1)
PY
then pass; else
  bad "J2_subdivision's record_example or its input_shape does not agree with src/terrain.mjs's COHERENCE_LABELS — the example is a copy of that set and a copy without a mismatch check is how it arrived wrong (PR #1065 round 1)"
fi


# ---- THE `limits` TABLE KEY IS RESOLVED FOR EVERY JUDGMENT STATE, AND THE SUM
# REFUSAL HAS ONE CARRIER (PR #1070 round 1). Both are asserted STRUCTURALLY
# rather than by driving a run, and the reason is each finding's own: the first
# is about a state the table does not currently declare -- a `limits` key without
# `per_group` -- so there is nothing in this repository to drive, and a fixture
# adding such a state to the shipped table would be asserting a table nobody
# ships. The second is about how many places one refusal is written, which is a
# property of the source and of no run.
if python3 - <<'PY'
import json, re, sys
src = open("src/terrain.mjs", encoding="utf-8").read()

# (1) EVERY DECLARED `limits` NAMES A KNOWN BLOCK. The key's own field_semantics
# row claims an unknown name is refused BY NAME; that refusal lives in
# `judgeLimits`, and this is what keeps the shipped table on the admitted side of
# it without waiting for a judge call to find out.
m = re.search(r'const JUDGE_LIMIT_BLOCKS = Object\.freeze\(\{(.*?)\n\}\);', src, re.S)
if not m:
    print("src/terrain.mjs declares no JUDGE_LIMIT_BLOCKS -- the set this checks against is gone",
          file=sys.stderr); sys.exit(1)
known = re.findall(r'^  ([a-z_]+):', m.group(1), re.M)
if not known:
    print("JUDGE_LIMIT_BLOCKS names no block", file=sys.stderr); sys.exit(1)
table = json.load(open("src/workflow.json"))
for row in table["states"]:
    if row.get("limits") is None:
        continue
    if row["limits"] not in known:
        print(f"{row['id']} declares limits {row['limits']!r}, which JUDGE_LIMIT_BLOCKS does not carry "
              f"({known}) -- `judgeLimits` refuses it at the first judge call", file=sys.stderr)
        sys.exit(1)
if "limits" not in (table.get("field_semantics") or {}):
    print("the table declares `limits` on a state with no field_semantics row for it",
          file=sys.stderr); sys.exit(1)

# (2) IT IS RESOLVED BEFORE THE PER-GROUP BRANCH, not inside it. Resolved inside,
# the refusal above is unreachable for a state declaring the key without
# `per_group` and the block silently never reaches the ask -- which is exactly the
# two properties the field_semantics row claims. Keyed on ORDER in `invokeJudge`,
# because that is the fact that makes the refusal a property of DECLARING the key.
body = re.search(r'function invokeJudge\(table, st, inputPath, dir, validate, rec\) \{(.*?)\n\}\n',
                 src, re.S)
if not body:
    print("invokeJudge not found under its expected signature", file=sys.stderr); sys.exit(1)
b = body.group(1)
if "judgeLimits(st)" not in b:
    print("invokeJudge does not resolve `limits` at all, so a state declaring an unknown block "
          "never reaches its refusal", file=sys.stderr); sys.exit(1)
if b.index("judgeLimits(st)") > b.index("st.per_group === true"):
    print("invokeJudge resolves `limits` after the per_group branch, so a state declaring the key "
          "without per_group never reaches the unknown-block refusal", file=sys.stderr); sys.exit(1)

# (3) THE SUM REFUSAL IS WRITTEN ONCE. A second copy is what PR #1070 round 1
# found on its first day, two wordings citing two different grounds -- the drift
# the SubGroup limits' single carrier exists to prevent, rebuilt beside it.
sites = src.count("SUBGROUP_MEMBERS_DO_NOT_SUM —")
if sites != 1:
    print(f"SUBGROUP_MEMBERS_DO_NOT_SUM is raised at {sites} sites; one refusal owes one carrier",
          file=sys.stderr); sys.exit(1)
place = re.search(r'export function subgroupPlacement\(parent, classification, block\) \{(.*?)\n\}\n',
                  src, re.S)
if not place or "SUBGROUP_MEMBERS_DO_NOT_SUM" not in place.group(1):
    print("the one site is not inside `subgroupPlacement`, so the callers that never carried the "
          "check still do not", file=sys.stderr); sys.exit(1)
PY
then pass; else
  bad "the workflow table's \`limits\` key or the SUBGROUP_MEMBERS_DO_NOT_SUM refusal does not hold the carrier properties their own declarations claim (PR #1070 round 1)"
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

# ---- kogaki#1068. The SubGroup rules, over a survey wide enough for them to bind.
build_tree "$SCRATCH/wide"
drive_limits "the wide tree" "$SCRATCH/wide"

# ---- kogaki#1085. A SubGroup ID THE DISPLAY PRINTED IS AN ID THE NEXT STATE
# RESOLVES.
#
# WHAT THIS REACHES THAT NOTHING ABOVE DOES. `cotag_groups` renders SubGroup ids
# from the J2 record the executor itself wrote and named on the run record;
# `thesis_candidates` and `neighborhood_input` resolved an entered id through
# `--subdivisions` alone, and a hook-driven run supplies no argv at all since
# kogaki#1027 deleted `--input`, `--at` and `--enter`. So every Group id on the
# display resolved and every SubGroup id on the SAME display did not, and the
# refusal named an id the run had just printed. Each half was internally
# consistent, which is why no case above could see it: the ID span there answers
# `G1`, a Group, and every J2 record above this tree is judged-EMPTY, which
# prints no SubGroup id to enter at all.
#
# THE ANSWER IS COMPUTED FROM THE RUN'S OWN RECORDS, never a literal. A `G2-1`
# typed here would be an assertion about the fixture survey's sort order rather
# than about resolution, and would go green against a display offering nothing.
drive_subgroup_ids() {               # drive_subgroup_ids <label> <tree>
  local label=$1 root=$2
  mkdir -p "$root/open-gates"
  export KOGAKI_OPEN_GATES="$root/open-gates"
  export CLAUDE_CODE_SESSION_ID="fixture-session"
  export KOGAKI_FIXTURE_LESSONS="$WIDE_LESSONS"
  local D="$root/run-subids"
  mkdir -p "$D"
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-span-subgroups" node src/terrain.mjs start --run-dir "$D" >/dev/null 2>&1)
  local q1 p1
  q1=$(declared_question "$D" TAG_SELECTION "$root") || {
    bad "$label: the SubGroup-id run wrote no TAG_SELECTION declaration"
    unset KOGAKI_FIXTURE_LESSONS
    return
  }
  p1=$(payload "toolu_fixture_subids_tag" "$q1" "fixture")
  capture "$root" "$D" "$p1" subids-tag
  printf '%s' "$p1" | (cd "$root" && KOGAKI_RUN_DIR="$D" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-span-subgroups" \
      python3 .claude/hooks/advance-terrain.py >"$root/advsubids1.out" 2>&1)

  # THE ID TO ENTER, AND THE MEMBERS IT MUST NARROW TO, both read from the
  # records this run wrote: the composed input for the group order the ids are
  # minted over, and the J2 record for the SubGroups the display placed under it.
  if python3 - "$D" "$root" <<'PY'
import json, pathlib, sys
d, root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
rec = json.load(open(d / "run-record.json"))
def under(p):
    p = pathlib.Path(p)
    return p if p.is_absolute() else root / p
inp = json.load(open(under(rec["composition_input"])))
sub = json.load(open(under((rec.get("judgments") or {})["J2_subdivision"])))
for i, g in enumerate(inp["groups"]):
    entry = sub.get(g["name"]) or {}
    sgs = entry.get("subgroups") or []
    # A group the fixture SPLIT: more than one SubGroup under it, so the id names
    # a subset and the assertion below can tell narrowing from a whole-group
    # pass-through.
    if len(sgs) > 1:
        (root / "subid-target").write_text(f"G{i + 1}-1\n")
        (root / "subid-members").write_text(json.dumps(sorted(sgs[0]["members"])) + "\n")
        (root / "subid-parent").write_text(json.dumps(sorted(g["members"])) + "\n")
        sys.exit(0)
print("no composed group was subdivided into more than one SubGroup — the fixture "
      "cannot offer a SubGroup id to enter", file=sys.stderr)
sys.exit(1)
PY
  then pass; else
    bad "$label: the tag-answer span left no subdivided group, so there is no SubGroup id on the display to enter. The advance said: $(tail -3 "$root/advsubids1.out" | tr '\n' ' ')"
    unset KOGAKI_FIXTURE_LESSONS
    return
  fi
  local target
  target=$(cat "$root/subid-target")

  # AND THE DISPLAY PRINTED IT. The defect is a disagreement between the state
  # that PRINTS an id and the states that RESOLVE it, so the printing half is
  # asserted rather than assumed.
  if grep -qF "$target" "$root/reports/CoTagGroups.md"; then pass; else
    bad "$label: the co-tag display does not print $target — the id this case enters is not one the owner could have read off it"
  fi

  local q2 p2
  q2=$(declared_question "$D" ID_SELECTION "$root") || {
    bad "$label: no ID_SELECTION question to answer"
    unset KOGAKI_FIXTURE_LESSONS
    return
  }
  p2=$(payload "toolu_fixture_subids" "$q2" "$target")
  capture "$root" "$D" "$p2" subids
  printf '%s' "$p2" | (cd "$root" && KOGAKI_RUN_DIR="$D" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-span-subgroups" \
      python3 .claude/hooks/advance-terrain.py >"$root/advsubids2.out" 2>&1)

  if python3 - "$D" "$root" <<'PY'
import json, pathlib, sys
d, root = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
rec = json.load(open(d / "run-record.json"))
if "thesis_candidates" not in (rec.get("judgments") or {}):
    print("the run did not reach thesis_candidates:", sorted((rec.get("judgments") or {})),
          file=sys.stderr); sys.exit(1)
inp_path = d / "terrain-judge-input-thesis_candidates.json"
if not inp_path.exists():
    print("no thesis-candidate judge input was written", file=sys.stderr); sys.exit(1)
inp = json.load(open(inp_path))
sp = pathlib.Path(rec["survey_record"])
survey = json.load(open(sp if sp.is_absolute() else root / sp))
by_id = {c["id"]: c.get("display_id") for c in survey["candidates"]}
want = [by_id[m] for m in json.loads((root / "subid-members").read_text())]
parent = [by_id[m] for m in json.loads((root / "subid-parent").read_text())]
got = sorted(inp["strands_you_may_use"])
if got != sorted(want):
    print("the composed input names", got, "and the entered SubGroup holds", sorted(want),
          file=sys.stderr); sys.exit(1)
# THE NARROWING IS THE HALF THAT DISCRIMINATES: a resolver handing back the whole
# parent Group would compose a perfectly valid input over a wider set.
if len(parent) <= len(want):
    print("the fixture's SubGroup is not narrower than its parent, so this case cannot "
          "tell resolution from a whole-group pass-through", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: a hook-driven run entering the SubGroup id $target did not reach thesis_candidates composing over that SubGroup's members alone (kogaki#1085). The advance said: $(tail -4 "$root/advsubids2.out" | tr '\n' ' ')"
  fi

  # AND THE REFUSAL THE DEFECT RAISED IS GONE BY NAME. Without this the case
  # would go green on a run that refused for some other reason and happened to
  # leave the records above behind.
  if ! grep -q "resolve to no Group or SubGroup" "$root/advsubids2.out"; then pass; else
    bad "$label: the advance refused the id the display had just printed — the state that renders the ids and the state that resolves them are reading different carriers (kogaki#1085): $(tail -3 "$root/advsubids2.out" | tr '\n' ' ')"
  fi
  unset KOGAKI_FIXTURE_LESSONS
}

build_tree "$SCRATCH/subids"
drive_subgroup_ids "the SubGroup-id tree" "$SCRATCH/subids"

# ---- THE PER-GROUP RECORDS ON DISK ARE READ, AND THE CALLS RUN CONCURRENTLY
# (kogaki#1073, acceptance 1).
#
# WHAT THIS REACHES THAT NOTHING ABOVE DOES. Every case above drives a per-group
# state over a run directory that starts EMPTY, so no fixture could see what the
# loop does with a record it already wrote — and on 2026-09-10 that was the whole
# defect: an advance killed at `ADVANCE_TIMEOUT_S` after eight of eleven groups,
# and a retry that started again at group one. The property is a property of a
# SECOND advance over a directory holding the first one's work, so it needs a
# tree wide enough for the numbers the Issue names and a run directory primed
# with real records rather than hand-written ones.
#
# THE PRIMING RECORDS ARE A REAL RUN'S OUTPUT, never composed here. A fixture
# that hand-wrote the eight records would be asserting that the loop agrees with
# the fixture; these are copied from a completed run over the same survey, so
# they are exactly the bytes the shipped writer produced.
ELEVEN_LESSONS=$(python3 - <<'PY'
import json
out = []
for i in range(1, 12):
    tag = f"g{i:02d}"
    out.append({"slug": f"a-lesson-{tag}-one", "tags": ["fixture", tag]})
    out.append({"slug": f"a-lesson-{tag}-two", "tags": ["fixture", tag]})
print(json.dumps(out))
PY
)

# THE SLEEPING STUB (acceptance 4(c)). Conformant, and slow by a fixed amount, so
# the WALL TIME of a per-group state is the quantity under test. The sleep blocks
# the child for the whole span whatever its event loop is doing, which a timer
# would not.
build_pool_stubs() {                 # build_pool_stubs <dir>
  local root=$1
  cat > "$root/judge-slow" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
const fs = require("node:fs");
const path = require("node:path");
const MARKER = "----- INPUT (JSON) -----";
const prompt = fs.readFileSync(0, "utf8");
const at = prompt.indexOf(MARKER);
if (at < 0) { process.stderr.write("no input marker in the prompt\n"); process.exit(3); }
const input = JSON.parse(prompt.slice(at + MARKER.length));
const SLEEP_MS = Number(process.env.KOGAKI_FIXTURE_SLEEP_MS || 1200);
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, SLEEP_MS);
let record;
if (/`J1_claims` judgment point/.test(prompt)) {
  record = {
    composition_pin: input.composition_pin,
    claims: Object.fromEntries(input.groups.map((g) => [g.name, `In common: a fixture claim over ${g.members.length} member(s).`])),
  };
} else {
  fs.appendFileSync(path.join(__dirname, "slow-calls"), JSON.stringify({
    group: input.judging_group, at: Date.now(),
  }) + "\n");
  record = Object.fromEntries(input.groups.map((g) => [g.name, { judged: true, subgroups: [] }]));
}
process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\n");
JUDGE
  # THE STUB THAT NEVER ANSWERS FOR ONE GROUP (acceptance 4(d)). Whichever call
  # claims the target hangs past any bound the case allows; every other group is
  # answered at once. The advance is then KILLED from outside, which is the live
  # shape — `ADVANCE_TIMEOUT_S` sends a signal, and a signal runs no exit path —
  # so the only thing that can have written the run record is the checkpoint.
  cat > "$root/judge-one-hangs" <<'JUDGE'
#!/usr/bin/env node
// THE `--version` PROBE THE START ACT RUNS (kogaki#1076). The run's binary is
// resolved by RUNNING each candidate, because existence and the execute bit do
// not tell a working install from a shim whose own `exec` fails -- so a stub
// that could not answer this would be a stub the shipped path refuses. It
// answers FIRST, before any stdin read: the probe closes stdin, and a stub that
// blocked for a prompt would hang the start act.
if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\n"); process.exit(0); }
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
const targetFile = path.join(__dirname, "hang-target");
const tmp = `${targetFile}.${process.pid}`;
fs.writeFileSync(tmp, g.name);
try { fs.linkSync(tmp, targetFile); } catch { /* another call claimed it first */ }
fs.unlinkSync(tmp);
if (fs.readFileSync(targetFile, "utf8").trim() === g.name) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 600000);
  process.exit(7);
}
process.stdout.write(JSON.stringify({ result: JSON.stringify({
  [g.name]: { judged: true, subgroups: [] },
}) }) + "\n");
JUDGE
  chmod +x "$root/judge-slow" "$root/judge-one-hangs"
}

# ONE ADVANCE OVER A SURVEY THE CALLER CHOOSES, whose per-group records are what
# the reuse cases are primed from and whose call log is the count they are
# compared against.
drive_wide() {                       # drive_wide <label> <tree> <run-dir> <stub> <outfile>
  local label=$1 root=$2 D=$3 stub=$4 outfile=$5
  mkdir -p "$D" "$root/open-gates"
  export KOGAKI_OPEN_GATES="$root/open-gates"
  export CLAUDE_CODE_SESSION_ID="fixture-session"
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/$stub" node src/terrain.mjs start --run-dir "$D" >/dev/null 2>&1)
  local q p
  q=$(declared_question "$D" TAG_SELECTION "$root") || { bad "$label: no TAG_SELECTION declaration for $(basename "$D")"; return 1; }
  p=$(payload "toolu_fixture_$(basename "$D")" "$q" "fixture")
  capture "$root" "$D" "$p" "$(basename "$D")"
  printf '%s' "$p" | (cd "$root" && KOGAKI_RUN_DIR="$D" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/$stub" \
      python3 .claude/hooks/advance-terrain.py >"$outfile" 2>&1)
  return 0
}

drive_reuse() {                      # drive_reuse <label> <tree>
  local label=$1 root=$2
  build_pool_stubs "$root"
  export KOGAKI_FIXTURE_LESSONS="$ELEVEN_LESSONS"

  # --- THE GOLD ADVANCE. Eleven groups, eleven calls, a completed span.
  local G="$root/run-gold"
  rm -f "$root/j2-calls"
  drive_wide "$label" "$root" "$G" judge-conformant "$root/adv-gold.out" || return
  local gold_calls
  gold_calls=$(wc -l < "$root/j2-calls" 2>/dev/null | tr -d ' ')
  if [ "$gold_calls" = "11" ] && [ -f "$root/reports/CoTagGroups.md" ]; then pass; else
    bad "$label: the wide survey did not compose eleven groups judged in eleven calls (saw ${gold_calls:-0}) — the reuse cases below are primed from this run and cannot mean anything without it. The advance said: $(tail -3 "$root/adv-gold.out" | tr '\n' ' ')"
    return
  fi

  # --- 4(a). EIGHT VALID RECORDS ON DISK AND THREE MISSING MAKES EXACTLY THREE
  # CALLS. The primed directory is a fresh run whose per-group records are the
  # gold run's own, less three.
  local A="$root/run-reuse"
  mkdir -p "$A"
  local copied=0 f
  for f in "$G"/terrain-judge-J2_subdivision-*.json; do
    [ -e "$f" ] || continue
    if [ "$copied" -lt 8 ]; then cp "$f" "$A/"; copied=$((copied + 1)); fi
  done
  if [ "$copied" = "8" ]; then pass; else
    bad "$label: the gold run left $copied per-group records, so the eight-of-eleven priming could not be built"
    return
  fi
  rm -f "$root/j2-calls" "$root/reports/CoTagGroups.md"
  drive_wide "$label" "$root" "$A" judge-conformant "$root/adv-reuse.out" || return
  local reuse_calls
  reuse_calls=$(wc -l < "$root/j2-calls" 2>/dev/null | tr -d ' ')
  if [ "$reuse_calls" = "3" ]; then pass; else
    bad "$label: a run directory holding eight valid per-group records and three missing ones made ${reuse_calls:-0} J2 call(s), not 3 — the loop does not read the records it wrote (kogaki#1073 defect 1). The advance said: $(tail -3 "$root/adv-reuse.out" | tr '\n' ' ')"
  fi
  # AND THE RUN STILL FINISHED, so reuse is not a shortcut that leaves the state
  # half-judged: the assembled record covers all eleven groups.
  if [ -f "$root/reports/CoTagGroups.md" ] && python3 - "$A" "$root" <<'PY'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1])
rec = json.load(open(d / "run-record.json"))
jc = (rec.get("judge_calls") or {}).get("J2_subdivision") or {}
if jc.get("calls") != 3 or jc.get("groups_declared") != 11 or jc.get("reused_records") != 8:
    print("the run record's judge_calls says", jc, file=sys.stderr); sys.exit(1)
p = pathlib.Path(rec["judgments"]["J2_subdivision"])
if not p.is_absolute():
    p = pathlib.Path(sys.argv[2]) / p
sub = json.load(open(p))
if len(sub) != 11:
    print(f"the assembled record covers {len(sub)} group(s), not 11", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: the reusing advance did not finish with an eleven-group record whose run record names three calls over eight reused records (kogaki#1073)"
  fi

  # --- 4(b). A PER-GROUP FILE THAT FAILS VALIDATION IS CALLED AGAIN. Primed with
  # all eleven, one of them replaced by the live 2026-09-09 shape — the entry
  # wrapped in an envelope carrying a `kind` key, which `J2_subdivision`'s own
  # one-key refusal rejects. Exactly one call, and it is for that group.
  local B="$root/run-invalid"
  mkdir -p "$B"
  cp "$G"/terrain-judge-J2_subdivision-*.json "$B/"
  local victim
  victim=$(ls "$B"/terrain-judge-J2_subdivision-*.json | sort | head -1)
  python3 - "$victim" "$root/invalid-group" <<'PY'
import json, sys
rec = json.load(open(sys.argv[1]))
name = list(rec)[0]
json.dump({"kind": "subdivision", name: rec[name]}, open(sys.argv[1], "w"))
open(sys.argv[2], "w").write(name)
PY
  rm -f "$root/j2-calls" "$root/reports/CoTagGroups.md"
  drive_wide "$label" "$root" "$B" judge-conformant "$root/adv-invalid.out" || return
  if python3 - "$root/j2-calls" "$root/invalid-group" <<'PY'
import json, sys, pathlib
lines = [json.loads(l) for l in pathlib.Path(sys.argv[1]).read_text().splitlines() if l.strip()]
want = pathlib.Path(sys.argv[2]).read_text().strip()
if len(lines) != 1:
    print(f"{len(lines)} call(s) were made, not 1:", [l["judging_group"] for l in lines],
          file=sys.stderr); sys.exit(1)
if lines[0]["judging_group"] != want:
    print(f"the one call was for {lines[0]['judging_group']!r}, not the invalid group {want!r}",
          file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: a per-group record that fails validation was not the one and only group re-asked — a record on disk is taken without being validated (kogaki#1073). The advance said: $(tail -3 "$root/adv-invalid.out" | tr '\n' ' ')"
  fi

  # --- 4(c). ELEVEN GROUPS UNDER A CAP OF FOUR FINISH IN ABOUT THREE CALL
  # LENGTHS. Asserted against the SEQUENTIAL floor rather than against a target:
  # the claim is that the SUM is no longer what the advance is measured against,
  # and eleven sequential sleeps could not fit under the bound this case sets.
  local cap
  cap=$(python3 -c "
import json
print((json.load(open('src/workflow.json')).get('judge') or {}).get('concurrency'))")
  if [ "$cap" = "4" ]; then pass; else
    bad "$label: the workflow table declares concurrency=$cap; this case is written against the declared 4 and would assert nothing at another width"
  fi
  local C="$root/run-slow" sleep_ms=1200 t0 t1 elapsed_ms
  rm -f "$root/slow-calls" "$root/reports/CoTagGroups.md"
  t0=$(python3 -c 'import time; print(int(time.time() * 1000))')
  KOGAKI_FIXTURE_SLEEP_MS=$sleep_ms drive_wide "$label" "$root" "$C" judge-slow "$root/adv-slow.out" || return
  t1=$(python3 -c 'import time; print(int(time.time() * 1000))')
  elapsed_ms=$((t1 - t0))
  # THE FLOOR AND THE CEILING ARE BOTH STATED. Sequential is 11 sleeps at J2 plus
  # one at J1 = 12; concurrent at a cap of 4 is ceil(11/4) = 3 plus J1 = 4. The
  # ceiling is 8 sleeps, comfortably above the concurrent figure and comfortably
  # below the sequential one, so neither process startup nor a loaded machine
  # decides the case.
  local slow_calls
  slow_calls=$(wc -l < "$root/slow-calls" 2>/dev/null | tr -d ' ')
  if [ "$slow_calls" = "11" ] && [ "$elapsed_ms" -lt "$((sleep_ms * 8))" ]; then pass; else
    bad "$label: eleven judge calls of ${sleep_ms}ms each (${slow_calls:-0} logged) took ${elapsed_ms}ms, which is the sequential sum rather than about three call-lengths — the per-group calls do not run concurrently under the table's cap (kogaki#1073 defect 2). The advance said: $(tail -3 "$root/adv-slow.out" | tr '\n' ' ')"
  fi

  # --- 4(d). A RUN RECORD WRITTEN AFTER THE SECOND OF THREE GROUPS NAMES THE
  # TWO. The advance is KILLED, not failed: `ADVANCE_TIMEOUT_S` sends a signal
  # and a signal runs no exit path, so `persistPendingRun` cannot be what wrote
  # the record and the checkpoint is the only remaining writer.
  local THREE
  THREE=$(python3 - <<'PY'
import json
out = []
for tag in ("h01", "h02", "h03"):
    out.append({"slug": f"a-lesson-{tag}-one", "tags": ["fixture", tag]})
    out.append({"slug": f"a-lesson-{tag}-two", "tags": ["fixture", tag]})
print(json.dumps(out))
PY
)
  export KOGAKI_FIXTURE_LESSONS="$THREE"
  local E="$root/run-killed"
  mkdir -p "$E" "$root/open-gates"
  rm -f "$root/hang-target"
  export KOGAKI_OPEN_GATES="$root/open-gates"
  export CLAUDE_CODE_SESSION_ID="fixture-session"
  (cd "$root" && KOGAKI_JUDGE_CLI="$root/judge-one-hangs" node src/terrain.mjs start --run-dir "$E" >/dev/null 2>&1)
  local qk pk
  qk=$(declared_question "$E" TAG_SELECTION "$root") || { bad "$label: the killed run wrote no TAG_SELECTION declaration"; return; }
  pk=$(payload "toolu_fixture_killed" "$qk" "fixture")
  capture "$root" "$E" "$pk" killed
  printf '%s' "$pk" | (cd "$root" && KOGAKI_RUN_DIR="$E" KOGAKI_OPEN_GATES="$root/open-gates" \
      KOGAKI_JUDGE_CLI="$root/judge-one-hangs" \
      python3 .claude/hooks/advance-terrain.py >"$root/adv-killed.out" 2>&1) &
  local adv_pid=$! waited=0
  # WAITED ON THE ARTIFACT, never on a fixed nap alone: the two groups that
  # answer are quick, and the case is about what is on disk when the signal
  # arrives rather than about how long it took to get there.
  while [ "$waited" -lt 300 ]; do
    if python3 - "$E" <<'PY'
import json, sys, pathlib
try:
    rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
except Exception:
    sys.exit(1)
g = (rec.get("judge_group_records") or {}).get("J2_subdivision") or {}
sys.exit(0 if len(g) >= 2 else 1)
PY
    then break; fi
    waited=$((waited + 1))
    python3 -c 'import time; time.sleep(0.1)'
  done
  pkill -KILL -P "$adv_pid" 2>/dev/null
  kill -KILL "$adv_pid" 2>/dev/null
  wait "$adv_pid" 2>/dev/null
  pkill -KILL -f judge-one-hangs 2>/dev/null
  if python3 - "$E" "$root/hang-target" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
named = (rec.get("judge_group_records") or {}).get("J2_subdivision") or {}
if len(named) != 2:
    print(f"the record of the killed advance names {len(named)} finished group(s), not 2:",
          sorted(named), file=sys.stderr); sys.exit(1)
hung = pathlib.Path(sys.argv[2]).read_text().strip()
if hung in named:
    print(f"the record names {hung!r}, the group that never answered", file=sys.stderr); sys.exit(1)
# AND THE STATES THAT COMPLETED BEFORE THE JUDGMENT ARE NAMED TOO, which is the
# other half of item 3: the killed advance of 2026-09-10 had completed
# `compose_input` and `J1_claims` and its record named neither.
for s in ("compose_input", "J1_claims"):
    if s not in rec.get("completed", []):
        print(f"the record does not name completed state {s!r}: {rec.get('completed')}",
              file=sys.stderr); sys.exit(1)
if rec.get("awaiting") is not None:
    print(f"the record still reads awaiting {rec['awaiting']!r} — the owner answered that gate",
          file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label: a KILLED advance left a run record that does not name the two groups it finished, the states it completed, or that its gate was answered (kogaki#1073 defect 3). The advance said: $(tail -3 "$root/adv-killed.out" | tr '\n' ' ')"
  fi
  unset KOGAKI_FIXTURE_LESSONS KOGAKI_FIXTURE_SLEEP_MS
}

build_tree "$SCRATCH/reuse"
drive_reuse "the reuse tree" "$SCRATCH/reuse"

# ---- THE JUDGE BINARY IS THE RUN'S, NOT THE FIRING SESSION'S (kogaki#1076).
#
# WHAT THESE THREE CASES REACH THAT NOTHING ELSE DOES. Every case above stubs
# the binary through `KOGAKI_JUDGE_CLI`, which hands the executor a path — so
# none of them exercises RESOLUTION at all, and the defect was entirely in
# resolution: the table's `judge.command` is the bare word `claude`, the
# executor handed that word to the spawn, and the binary a judgment ran was
# whatever the FIRING session's `PATH` offered first. On 2026-09-10 an advance
# fired from a second session resolved a Windows npm shim under `/mnt/c` whose
# own `exec` failed, and three calls exited 127 in a tree where the same judge
# had run clean an hour before.
#
# THE SHIM IS THE FIXTURE'S CENTREPIECE, and it is built to be indistinguishable
# from a working install by every cheap test: it EXISTS, it is EXECUTABLE, and it
# fails only when it is RUN. A resolution that stopped at the first existing file
# on `PATH` would choose it, which is the defect with one more step in it.
judge_path_tree() {                  # judge_path_tree <dir>
  local root=$1
  mkdir -p "$root/path-shim" "$root/path-good" "$root/path-node"
  # `node` and `python3` reachable under a PATH this fixture controls: the start
  # act and the advance hook are both run through them, so a literally emptied
  # PATH would remove the act under test rather than the judge under it.
  ln -s "$(command -v node)" "$root/path-node/node"
  ln -s "$(command -v python3)" "$root/path-node/python3"
  # THE SHIM, verbatim in shape: a script whose `exec` target is not there, which
  # is exit 127 and the stderr the live run recorded.
  cat > "$root/path-shim/claude" <<'SHIM'
#!/bin/sh
exec "$0.exe" "$@"
SHIM
  # THE WORKING INSTALL, BEHIND IT ON PATH. It is the conformant stub under
  # another name, so a run that resolves it judges exactly as every case above.
  cp "$root/judge-conformant" "$root/path-good/claude"
  chmod +x "$root/path-shim/claude" "$root/path-good/claude"
}

drive_binary() {                     # drive_binary <label> <tree>
  local label=$1 root=$2
  judge_path_tree "$root"
  export KOGAKI_OPEN_GATES="$root/open-gates"
  export CLAUDE_CODE_SESSION_ID="fixture-session"
  mkdir -p "$root/open-gates" "$root/open-gates-a" "$root/open-gates-b"

  # --- FIXTURE (a). The shim AHEAD of a working install: the start act records
  # the working one, because it RAN each candidate rather than trusting that a
  # file that exists is a binary that works.
  local A="$root/run-a"
  mkdir -p "$A"
  (cd "$root" && env -u KOGAKI_JUDGE_CLI KOGAKI_OPEN_GATES="$root/open-gates-a" PATH="$root/path-shim:$root/path-good:$root/path-node" node src/terrain.mjs start --run-dir "$A" \
      >"$root/start-a.out" 2>&1)
  if python3 - "$A" "$root/path-good/claude" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
b = rec.get("judge_binary")
if not b:
    print("the run record carries no judge_binary at all", file=sys.stderr); sys.exit(1)
if b.get("path") != sys.argv[2]:
    print(f"resolved {b.get('path')!r}, not the working install {sys.argv[2]!r}", file=sys.stderr); sys.exit(1)
if b.get("command") != "claude":
    print(f"the record does not name the command it resolved: {b.get('command')!r}", file=sys.stderr); sys.exit(1)
if not b.get("version"):
    print("the record carries no version — the `--version` verification is what "
          "discriminates the working install from the shim, so its answer is owed",
          file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label (a): with a failing shim ahead of a working install on PATH, the start act did not record the working install's absolute path and version (kogaki#1076 item 1). The start act said: $(tail -3 "$root/start-a.out" | tr '\n' ' ')"
  fi

  # --- FIXTURE (b). ONLY the shim: the start refuses, BEFORE the survey, and
  # names the shim. "The judge could not be run" over a bare word tells an
  # operator nothing they can act on; the shim's own path is the whole diagnosis.
  local B="$root/run-b"
  mkdir -p "$B"
  if (cd "$root" && env -u KOGAKI_JUDGE_CLI KOGAKI_OPEN_GATES="$root/open-gates-b" PATH="$root/path-shim:$root/path-node" node src/terrain.mjs start --run-dir "$B" \
        >"$root/start-b.out" 2>&1); then
    bad "$label (b): with only a failing shim on PATH the start act SUCCEEDED — a run whose judge binary cannot be run must refuse before the survey (kogaki#1076 item 1)"
  else
    pass
  fi
  if grep -qF "$root/path-shim/claude" "$root/start-b.out"; then pass; else
    bad "$label (b): the refusal does not name the shim it rejected, so an operator is told a bare word failed and not which file: $(tail -3 "$root/start-b.out" | tr '\n' ' ')"
  fi
  if [ ! -f "$B/run-record.json" ] && [ ! -f "$root/reports/CoTagGroups.md" ]; then pass; else
    bad "$label (b): the refused start left a run record or a rendering behind — it must refuse BEFORE the survey, leaving nothing that reads as a run that began"
  fi

  # --- FIXTURE (c). The run STARTS with a working binary and the ADVANCE is
  # fired from a session whose PATH resolves the shim first — the live shape of
  # 2026-09-10. The judgment still runs, because the call executes the path the
  # run recorded rather than the word the table declares.
  local C="$root/run-c"
  mkdir -p "$C"
  (cd "$root" && env -u KOGAKI_JUDGE_CLI PATH="$root/path-good:$root/path-node" node src/terrain.mjs start --run-dir "$C" \
      >"$root/start-c.out" 2>&1)
  local q
  q=$(declared_question "$C" TAG_SELECTION "$root") || {
    bad "$label (c): the start act wrote no TAG_SELECTION declaration, so there is no question to answer: $(tail -3 "$root/start-c.out" | tr '\n' ' ')"
    return
  }
  local pc
  pc=$(payload "toolu_fixture_binary" "$q" "fixture")
  capture "$root" "$C" "$pc" tag
  printf '%s' "$pc" | (cd "$root" && env -u KOGAKI_JUDGE_CLI PATH="$root/path-shim:$PATH" \
      KOGAKI_RUN_DIR="$C" KOGAKI_OPEN_GATES="$root/open-gates" python3 .claude/hooks/advance-terrain.py \
      >"$root/adv-c.out" 2>&1)
  if python3 - "$C" "$root/path-good/claude" <<'PY'
import json, sys, pathlib
d = pathlib.Path(sys.argv[1])
rec = json.load(open(d / "run-record.json"))
j = rec.get("judgments") or {}
for st in ("J1_claims", "J2_subdivision"):
    if st not in j:
        print(f"the advance did not judge {st}: {sorted(j)}", file=sys.stderr); sys.exit(1)
# AND IT RAN THE RECORDED PATH, which is the property under test rather than the
# fact that a judgment happened: the invocation record names the command it spawned.
inv = rec.get("judge_calls") or {}
if not inv:
    print("the advance recorded no judge call", file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label (c): an advance fired from a session whose PATH resolves a failing shim did not complete its judgments through the run's recorded binary (kogaki#1076 item 2). The advance said: $(tail -5 "$root/adv-c.out" | tr '\n' ' ')"
  fi
  # THE RECORD SAYS WHAT PRODUCED IT (kogaki#1076 item 3). Two runs with equal
  # model and effort had run different executables and no durable carrier said
  # so: the Harness's own invocation record lives in the process that made the
  # calls, so the run record was the only thing a later reader had and it named
  # counts alone.
  if python3 - "$C" <<'PY'
import json, sys, pathlib
rec = json.load(open(pathlib.Path(sys.argv[1], "run-record.json")))
b = rec.get("judge_binary") or {}
want_path, want_version = b.get("path"), b.get("version")
if not want_path or not want_version:
    print("the run record carries no resolved binary to compare against", file=sys.stderr); sys.exit(1)
calls = rec.get("judge_calls") or {}
if not calls:
    print("the advance recorded no judge call", file=sys.stderr); sys.exit(1)
for state, row in sorted(calls.items()):
    if row.get("command") != want_path:
        print(f"{state} recorded command {row.get('command')!r}, not the run's binary {want_path!r}",
              file=sys.stderr); sys.exit(1)
    if row.get("binary_version") != want_version:
        print(f"{state} recorded binary_version {row.get('binary_version')!r}, not {want_version!r}",
              file=sys.stderr); sys.exit(1)
PY
  then pass; else
    bad "$label (c): the run record's judge_calls rows do not name the resolved binary and its version, so a record cannot say what produced its judgments (kogaki#1076 item 3)"
  fi
}

build_tree "$SCRATCH/binary"
drive_binary "the binary-resolution tree" "$SCRATCH/binary"

# AND THE SAME THREE WITH THE SPEC AND THE SKILL PROSE ABSENT (kogaki#1076
# acceptance 3). The resolution is the runtime's, so a tree carrying only the
# runtime and the hooks must reach the same three verdicts -- a fixture that
# passed only where the prose stood would be asserting the prose.
build_tree "$SCRATCH/binary-red" --reduced
drive_binary "the reduced binary-resolution tree" "$SCRATCH/binary-red"

if [ "$fail" -eq 0 ]; then
  note "ok: $cases case(s) pass — one payload for the tag answer carries compose_input, both judgments and the CoTagGroups write in a single invocation and stops at ID_SELECTION; one payload for the ID answer reaches FullReport.md and the terminal with no third question owed, its record naming BOTH owner artifacts, and the ID gate's own call carrying the composed grouping above an owner-vocabulary question (kogaki#1087); a non-conformant judge record fails after the table's declared re-asks carrying the state's own refusal; a judge that returns the live wrong shape once repairs on attempt two, whose ask carries attempt one's refusal verbatim beside a record example filled from the run's own composed input, while one that never repairs still fails at the bound (kogaki#1059); and all of it holds with specs/ absent (kogaki#1030); a run directory holding eight valid per-group records and three missing ones makes exactly three calls, an invalid one is the only group re-asked, eleven calls under the table's cap of four cost about three call-lengths rather than eleven, and an advance KILLED mid-judgment leaves a record naming the groups and the states it finished (kogaki#1073); and the judge binary is resolved ONCE by the session that starts the run -- a failing shim ahead of a working install on PATH resolves to the working one, a PATH offering only the shim refuses before the survey and names it, and an advance fired from a session whose PATH resolves the shim first still judges through the recorded path and pins its version (kogaki#1076); and a hook-driven run that enters a SubGroup ID THE DISPLAY PRINTED reaches thesis_candidates composing over that SubGroup's members alone, rather than refusing an id it had just offered (kogaki#1085)"
  note "not asserted here: that the PINNED MODEL is reachable. The judge binary is stubbed through KOGAKI_JUDGE_CLI, so these cases bind the executor's call, parse, retry and refusal — never the model's answer, which is not this repository's to assert."
fi
exit "$fail"
