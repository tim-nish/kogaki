#!/usr/bin/env bash
# check-brief-differentiation — the `differentiation` judgment state
# (kogaki#1206): decided before any reader-path unit composes, one entry per
# unit, so the three Candidates differ BY ASSIGNMENT rather than by chance.
# SINCE kogaki#1216 the same state also authors the Brief's one READER START
# — a cold read from the Persona and the Thesis, never from a Move — and lists
# the Moves the first Leg may bind (`leg1_survivors`, exclusion not ranking),
# and this member covers that half too.
#
# WHAT THIS COVERS. `validateDifferentiationRecord` (src/brief.mjs), the pure
# validator the `differentiation` state calls on the record before writing it
# -- every refusal the schema declares (wrong version, a `reader_start`
# absent or not in `dimension: value` lines, a `leg1_survivors` absent, empty
# or naming an id outside `moves_you_may_bind`, an `opening_move` that is not
# a survivor, wrong entry count, a duplicate `unit_number`, a duplicate
# `dimension`, a `dimension` outside the closed set, an `opening_move` outside
# `moves_you_may_bind`, a `journey_placement` present on a Brief with no
# Journey material or outside its own closed set, a blank `reader_experience`)
# and the passing shape, both with and without Journey material. And
# `assembleSelection`'s own differentiation check (src/assemble.mjs): a
# Candidate whose first Leg does not bind its assigned unit's `opening_move`
# is refused naming the unit, a matching Candidate is not, an entry naming no
# candidate's unit is not checked against it, and passing no
# `differentiation` argument at all skips the check entirely (a run predating
# this state, or a fixture exercising assembly on its own).
#
# THE kogaki#1216 HALF: `readerPersona` reads the two-field reader file the
# workflow's `compose_path` row names and refuses a file missing a field by
# name; `survivorSentence` renders the count; and, by absence, the verbatim
# first-Leg binding (`reader_start_binds_first_leg`) is gone from both
# src/compose.mjs and src/leg-schema.json's `path_rules`, replaced by the
# judgment-class `first_leg_binds_a_survivor`.
#
# THE kogaki#1225 HALF (owner decision 2026-09-29, REVERSED by kogaki#1231's
# marked-Leg derivation on 2026-09-30 — this half's own fixtures now mark a
# Leg `reaches_target` rather than relying on it being last): `readerFieldValues`
# refuses a Candidate carrying the retired `reader_target` or
# `opening_question` field by name, derives Reader target from the MARKED
# Leg's `reader_state_after` line for line, and derives no Opening question at
# all; src/candidate-schema.json records both fields as retired and declares
# neither; the Brief skeleton `composeBrief` writes carries no `Opening
# question` heading and `SLOT_CAPTIONS` names none; and the gate evidence
# (`candidateEvidence`) reads Reader target off the same marked Leg.
#
# WHAT THIS DOES NOT COVER, stated rather than left to look covered: the
# reader-path unit's own prompt splice (`differentiationBlockFor`, spliced
# above `JUDGE_INPUT_MARKER` in `src/brief.mjs`'s `compose_path` handler) is
# an internal closure, not exported, and a live per-unit prompt is not a
# fixture this member constructs; the free-text hint's removal from
# `src/brief-workflow.json`'s `reader_path_unit.judgment_point` is asserted
# by absence below, on the same convention `check-brief-reader-path-job.sh`
# states for what it does not exercise either. Whether a Reader start is a
# GOOD cold read of the Persona, and whether a Move's `before` CONTRADICTS
# it, are judgments and are linted nowhere (Every MUST is judgment).
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { validateDifferentiationRecord, composeBrief } from "./src/brief.mjs";
import { assembleSelection, readerFieldValues, survivorSentence, candidateEvidence, READER_FIELDS, SLOT_CAPTIONS } from "./src/assemble.mjs";
import { readerPersona, validateLegs } from "./src/compose.mjs";

const fails = [];

const MOVES = [{ id: "move-a" }, { id: "move-b" }, { id: "move-c" }, { id: "move-d" }];
const READER_START = "knowledge: can read code and has used a CI system\nquestion: holds: none\ntrust: the default a peer's post gets";
const SURVIVORS = ["move-a", "move-b", "move-c"];

function baseEntries() {
  return [
    { unit_number: 1, dimension: "knowledge", opening_move: "move-a", reader_experience: "e1" },
    { unit_number: 2, dimension: "question", opening_move: "move-b", reader_experience: "e2" },
    { unit_number: 3, dimension: "expectation", opening_move: "move-c", reader_experience: "e3" },
  ];
}
function baseRecord(over = {}) {
  return { version: "1", reader_start: READER_START, leg1_survivors: SURVIVORS.slice(), entries: baseEntries(), ...over };
}

function check(record, ctx, want, label) {
  const r = validateDifferentiationRecord(record, ctx);
  const gotOk = !r.error;
  if (gotOk !== want) {
    fails.push(`(${label}) validateDifferentiationRecord(${JSON.stringify(record)}) ${gotOk ? "passed" : `refused (${r.error})`}, wanted ${want ? "pass" : "refusal"}`);
  }
  return r;
}

// (a) A CONFORMING RECORD PASSES, with no Journey material.
check(baseRecord(), { units: 3, moves: MOVES, journeyBearing: false }, true, "a");

// (a2) A CONFORMING RECORD CARRYING journey_placement PASSES when the Brief
// carries Journey material.
{
  const entries = baseEntries();
  entries[0].journey_placement = "opening";
  check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: true }, true, "a2");
}

// (b) WRONG version IS REFUSED.
{
  const r = check(baseRecord({ version: "2" }), { units: 3, moves: MOVES, journeyBearing: false }, false, "b");
  if (!/version/.test(r.error || "")) fails.push(`(b) refusal did not name \`version\`: ${r.error}`);
}

// (c) entries COUNT MISMATCH IS REFUSED, naming the count.
{
  const entries = baseEntries().slice(0, 2);
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "c");
  if (!/entries/.test(r.error || "")) fails.push(`(c) refusal did not name \`entries\`: ${r.error}`);
}

// (d) A DUPLICATE unit_number IS REFUSED, naming the entry.
{
  const entries = baseEntries();
  entries[1].unit_number = 1;
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "d");
  if (!/unit_number/.test(r.error || "")) fails.push(`(d) refusal did not name \`unit_number\`: ${r.error}`);
}

// (e) A dimension OUTSIDE THE CLOSED SET IS REFUSED.
{
  const entries = baseEntries();
  entries[0].dimension = "vibes";
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "e");
  if (!/dimension/.test(r.error || "")) fails.push(`(e) refusal did not name \`dimension\`: ${r.error}`);
}

// (f) TWO UNITS SHARING ONE dimension ARE REFUSED -- "differentiated by
// luck, not by assignment" is this record's whole point.
{
  const entries = baseEntries();
  entries[1].dimension = entries[0].dimension;
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "f");
  if (!/luck/.test(r.error || "")) fails.push(`(f) refusal did not name the luck/assignment distinction: ${r.error}`);
}

// (g) AN opening_move OUTSIDE moves_you_may_bind IS REFUSED.
{
  const entries = baseEntries();
  entries[0].opening_move = "no-such-move";
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "g");
  if (!/opening_move/.test(r.error || "")) fails.push(`(g) refusal did not name \`opening_move\`: ${r.error}`);
}

// (h) journey_placement PRESENT ON A BRIEF WITH NO JOURNEY MATERIAL AT ALL
// IS REFUSED, whatever value it carries.
{
  const entries = baseEntries();
  entries[0].journey_placement = "opening";
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "h");
  if (!/journey_placement/.test(r.error || "")) fails.push(`(h) refusal did not name \`journey_placement\`: ${r.error}`);
}

// (i) journey_placement OUTSIDE ITS OWN CLOSED SET IS REFUSED, on a Brief
// that does carry Journey material.
{
  const entries = baseEntries();
  entries[0].journey_placement = "middle";
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: true }, false, "i");
  if (!/journey_placement/.test(r.error || "")) fails.push(`(i) refusal did not name \`journey_placement\`: ${r.error}`);
}

// (j) A BLANK reader_experience IS REFUSED.
{
  const entries = baseEntries();
  entries[0].reader_experience = "   ";
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "j");
  if (!/reader_experience/.test(r.error || "")) fails.push(`(j) refusal did not name \`reader_experience\`: ${r.error}`);
}

// ---- kogaki#1216: READER START AND THE FIRST-LEG SURVIVORS

// (p) A reader_start ABSENT OR BLANK IS REFUSED, naming the field.
{
  const r1 = check(baseRecord({ reader_start: undefined }), { units: 3, moves: MOVES, journeyBearing: false }, false, "p");
  if (!/reader_start/.test(r1.error || "")) fails.push(`(p) refusal did not name \`reader_start\`: ${r1.error}`);
  const r2 = check(baseRecord({ reader_start: "   " }), { units: 3, moves: MOVES, journeyBearing: false }, false, "p2");
  if (!/reader_start/.test(r2.error || "")) fails.push(`(p2) refusal did not name \`reader_start\`: ${r2.error}`);
}

// (q) A reader_start NOT IN `dimension: value` LINES IS REFUSED by the shape
// predicate -- a knowledge sentence is not a stance (kogaki#1176).
{
  const r = check(baseRecord({ reader_start: "the reader knows nothing yet" }), { units: 3, moves: MOVES, journeyBearing: false }, false, "q");
  if (!/dimension: value/.test(r.error || "")) fails.push(`(q) refusal did not name the line shape: ${r.error}`);
}

// (r) A leg1_survivors ABSENT OR EMPTY IS REFUSED -- an empty list names a
// library with no Move able to open from this Reader start.
{
  const r1 = check(baseRecord({ leg1_survivors: undefined }), { units: 3, moves: MOVES, journeyBearing: false }, false, "r");
  if (!/leg1_survivors/.test(r1.error || "")) fails.push(`(r) refusal did not name \`leg1_survivors\`: ${r1.error}`);
  const r2 = check(baseRecord({ leg1_survivors: [] }), { units: 3, moves: MOVES, journeyBearing: false }, false, "r2");
  if (!/leg1_survivors/.test(r2.error || "")) fails.push(`(r2) refusal did not name \`leg1_survivors\`: ${r2.error}`);
}

// (s) A SURVIVOR OUTSIDE moves_you_may_bind IS REFUSED, naming the id.
{
  const r = check(baseRecord({ leg1_survivors: ["move-a", "ghost-move", "move-c"] }), { units: 3, moves: MOVES, journeyBearing: false }, false, "s");
  if (!/ghost-move/.test(r.error || "")) fails.push(`(s) refusal did not name the unresolved survivor: ${r.error}`);
}

// (t) AN opening_move THAT RESOLVES IN THE LIBRARY BUT IS NOT A SURVIVOR IS
// REFUSED -- exclusion is where the first Leg's Move set is decided.
{
  const entries = baseEntries();
  entries[2].opening_move = "move-d";
  const r = check(baseRecord({ entries }), { units: 3, moves: MOVES, journeyBearing: false }, false, "t");
  if (!/leg1_survivors/.test(r.error || "") || !/unit 3/.test(r.error || "")) fails.push(`(t) refusal did not name the survivor list and the unit: ${r.error}`);
}

// (u) NO OPENING QUESTION IS RENDERED (kogaki#1225): the rendered reader
// field table names two headings, the Brief skeleton carries no `Opening
// question` heading, and no slot caption names one.
{
  const headings = READER_FIELDS.map(([, h]) => h);
  if (headings.join("|") !== "Reader start|Reader target") fails.push(`(u) READER_FIELDS renders ${JSON.stringify(headings)}, not Reader start and Reader target alone`);
  if (SLOT_CAPTIONS.has("Opening question")) fails.push("(u) SLOT_CAPTIONS still captions an `Opening question` slot");
  const skeleton = composeBrief({ slug: "fixture", strands: [], thesis: "The fixture claim." });
  const text = typeof skeleton === "string" ? skeleton : (skeleton && (skeleton.doc || skeleton.text)) || JSON.stringify(skeleton);
  if (/^## Opening question/m.test(text)) fails.push("(u) the composed Brief skeleton still carries an `## Opening question` heading");
  if (!/^## Reader target/m.test(text)) fails.push("(u) the composed Brief skeleton lost its `## Reader target` heading");
}

// (v) THE VERBATIM FIRST-LEG BINDING IS GONE, asserted by absence in both
// carriers, and its judgment-class replacement is declared.
{
  const compose = readFileSync("src/compose.mjs", "utf8");
  const legSchema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  if (/pathRefusal\("reader_start_binds_first_leg"/.test(compose)) fails.push("(v) src/compose.mjs still raises the retired `reader_start_binds_first_leg` refusal");
  if (legSchema.path_rules && legSchema.path_rules.reader_start_binds_first_leg) fails.push("(v) src/leg-schema.json still declares `reader_start_binds_first_leg` as a path rule");
  const rule = legSchema.path_rules && legSchema.path_rules.first_leg_binds_a_survivor;
  if (!rule || rule.class !== "judgment") fails.push("(v) src/leg-schema.json declares no judgment-class `first_leg_binds_a_survivor` path rule");
  // A first Leg whose before-state differs from Reader start is NOT refused
  // on that ground: the only Reader start refusal left is its own shape.
  const shapeOnly = validateLegs([{ leg_id: "s1" }], "knowledge sentence with no dimension");
  if (!shapeOnly.error || !/dimension: value/.test(shapeOnly.error)) fails.push(`(v) a malformed Reader start was not refused by the shape predicate: ${JSON.stringify(shapeOnly)}`);
  const differs = validateLegs([{ leg_id: "s1", reader_state_before: "knowledge: something else" }], "knowledge: x");
  if (differs.error && /reader_start_binds_first_leg|Reader start reads/.test(differs.error)) fails.push(`(v) a first Leg whose before-state differs from Reader start was refused on the retired verbatim ground: ${differs.error}`);
}

// (w) THE PERSONA IS READ FROM THE FILE THE WORKFLOW NAMES, two fields
// exactly, and a file missing one refuses naming the field.
{
  const workflow = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const row = (workflow.states || []).find((s) => s.id === "compose_path");
  if (!row || typeof row.reader_file !== "string") fails.push("(w) src/brief-workflow.json's compose_path row names no `reader_file`");
  else {
    const persona = readerPersona(row.reader_file);
    if (persona.error) fails.push(`(w) the named reader file did not read: ${persona.error}`);
    else if (typeof persona.reader !== "string" || typeof persona.prior_knowledge !== "string") fails.push(`(w) the reader file lacks a field: ${JSON.stringify(persona)}`);
  }
  const dir = mkdtempSync(join(tmpdir(), "reader-"));
  const half = join(dir, "half.md");
  writeFileSync(half, "id: half\nreader: >-\n  someone reading something\n");
  const r = readerPersona(half);
  if (!r.error || !/prior_knowledge/.test(r.error)) fails.push(`(w) a reader file missing prior_knowledge was not refused naming it: ${JSON.stringify(r)}`);
  const missing = readerPersona(join(dir, "absent.md"));
  if (!missing.error) fails.push("(w) an absent reader file was not refused");
}

// (x) THE RENDERED READER VALUES (kogaki#1225, reversed by kogaki#1231):
// both retired fields are refused by name, Reader target is the after-state
// of the Leg marked `reaches_target` line for line, no Opening question is
// derived, a path whose marked Leg states no after-state (or carries none or
// several such Legs) is refused naming the derivation, and the survivor
// sentence carries the count.
{
  const LAST_AFTER = "knowledge: knows the claim\nquestion: holds: none\ntrust: raised";
  const c = {
    candidate_id: "c1", reader_start: READER_START,
    legs: [
      { leg_id: "s1", reader_state_after: "knowledge: one claim\nquestion: what was ever asked to say no?" },
      { leg_id: "s2", reaches_target: true, reader_state_after: LAST_AFTER },
    ],
    leg1_survivor_count: 3,
  };
  const ok = readerFieldValues(c);
  if (!ok.values || ok.values.reader_target !== LAST_AFTER) fails.push(`(x) readerFieldValues did not derive Reader target from the marked Leg's after-state line for line: ${JSON.stringify(ok)}`);
  if (ok.values && Object.prototype.hasOwnProperty.call(ok.values, "opening_question")) fails.push(`(x) readerFieldValues still derives an opening_question value: ${JSON.stringify(ok)}`);
  if (ok.values && Object.keys(ok.values).sort().join(",") !== "reader_start,reader_target") fails.push(`(x) readerFieldValues renders keys other than the two headings: ${JSON.stringify(ok)}`);
  const retiredQ = readerFieldValues({ ...c, opening_question: "authored apart" });
  if (!retiredQ.error || !/opening_question/.test(retiredQ.error)) fails.push(`(x) a Candidate carrying opening_question was not refused by name: ${JSON.stringify(retiredQ)}`);
  const retiredT = readerFieldValues({ ...c, reader_target: "knowledge: authored apart" });
  if (!retiredT.error || !/reader_target/.test(retiredT.error)) fails.push(`(x) a Candidate carrying reader_target was not refused by name: ${JSON.stringify(retiredT)}`);
  const noLast = readerFieldValues({ ...c, legs: [c.legs[0], { leg_id: "s2", reaches_target: true }] });
  if (!noLast.error || !/Reader target/.test(noLast.error) || !/marked/.test(noLast.error)) fails.push(`(x) a path whose marked Leg states no after-state was not refused naming the derivation: ${JSON.stringify(noLast)}`);
  const noLegs = readerFieldValues({ ...c, legs: [] });
  if (!noLegs.error) fails.push("(x) a Candidate with no Legs was not refused");
  if (!/3 Moves/.test(survivorSentence(c) || "")) fails.push(`(x) survivorSentence did not carry the count: ${survivorSentence(c)}`);
  if (!/names the library/.test(survivorSentence({ leg1_survivor_count: 1 }) || "")) fails.push("(x) a count of one did not name the library");
  // The defensive gate-evidence path degrades PER FIELD (PR #1222 round 1): a
  // Candidate whose marked Leg states no after-state still renders the Reader
  // start the Harness set on it, and a complete one reads Reader target off
  // the same marked Leg the adoption fill does.
  const evLegs = (legs) => legs.map((l) => ({ ...l, materials: [] }));
  const whole = candidateEvidence({ ...c, legs: evLegs(c.legs) }, []);
  if (whole.error || whole.reader_start !== READER_START || whole.reader_target !== LAST_AFTER || Object.prototype.hasOwnProperty.call(whole, "opening_question")) {
    fails.push(`(x) candidateEvidence did not read Reader target off the marked Leg: ${JSON.stringify(whole)}`);
  }
  const partial = candidateEvidence({ ...c, legs: evLegs([c.legs[0], { leg_id: "s2", reaches_target: true }]) }, []);
  if (partial.error || partial.reader_start !== READER_START || !/not stated/.test(partial.reader_target || "")) {
    fails.push(`(x) candidateEvidence did not degrade per field: ${JSON.stringify(partial)}`);
  }
  const carried = candidateEvidence({ ...c, legs: evLegs(c.legs), reader_target: "knowledge: authored apart" }, []);
  if (carried.error || !/reader_target/.test(carried.reader_target || "") || !/retired/.test(carried.reader_target || "")) {
    fails.push(`(x) candidateEvidence did not disclose a carried retired field: ${JSON.stringify(carried)}`);
  }
  // Both retired fields carried at once: the disclosure names BOTH, so it
  // names the field the adoption refusal names (PR #1227 round 1).
  const both = candidateEvidence({ ...c, legs: evLegs(c.legs), reader_target: "knowledge: authored apart", opening_question: "why?" }, []);
  if (both.error || !/reader_target/.test(both.reader_target || "") || !/opening_question/.test(both.reader_target || "")) {
    fails.push(`(x) candidateEvidence carrying both retired fields did not name both: ${JSON.stringify(both)}`);
  }
  if (survivorSentence({}) !== null) fails.push("(x) a Candidate with no count did not render null");
  const schema = JSON.parse(readFileSync("src/candidate-schema.json", "utf8"));
  for (const f of ["opening_question", "reader_target"]) {
    if (schema.fields[f]) fails.push(`(x) src/candidate-schema.json still declares \`${f}\` as a field`);
    if (!schema.retired_fields || !schema.retired_fields[f]) fails.push(`(x) src/candidate-schema.json does not record \`${f}\` as retired`);
  }
}

// ---- ASSEMBLY'S OWN OPENING-MOVE CHECK (src/assemble.mjs)

function candidate(id, unit, move, exp, chr) {
  return {
    candidate_id: id,
    differentiation_unit: unit,
    reader_experience: exp,
    characteristic: chr,
    legs: [{ move }],
    review: { rationale_stands: "x", entailment: "x", prohibitions: "x", semantic_economy: "x", arc_integrity: "x", evaluation_levels: "x" },
    reasoning: { leg_validity: "x", transition_continuity: "x", thesis_closure: "x" },
  };
}

// (k) A CANDIDATE WHOSE FIRST LEG DOES NOT BIND ITS ASSIGNED opening_move IS
// REFUSED, naming the unit -- the acceptance's own wording.
{
  const cands = [
    candidate("c1", 1, "move-a", "exp one", "one"),
    candidate("c2", 2, "wrong-move", "exp two", "two"),
  ];
  const differentiation = { entries: [{ unit_number: 1, opening_move: "move-a" }, { unit_number: 2, opening_move: "move-b" }] };
  const r = assembleSelection({ candidates: cands }, "", differentiation);
  if (!r.error || !/unit 2/.test(r.error) || !/opening Move/.test(r.error)) {
    fails.push(`(k) a Candidate whose first Leg did not bind its assigned opening Move was not refused naming the unit: ${JSON.stringify(r)}`);
  }
}

// (l) A CANDIDATE WHOSE FIRST LEG DOES BIND ITS ASSIGNED opening_move IS NOT
// REFUSED BY THE DIFFERENTIATION CHECK (whatever a later, unrelated field
// check does past it -- this member asserts only that the differentiation
// clause itself stays silent).
{
  const cands = [
    candidate("c1", 1, "move-a", "exp one", "one"),
    candidate("c2", 2, "move-b", "exp two", "two"),
  ];
  const differentiation = { entries: [{ unit_number: 1, opening_move: "move-a" }, { unit_number: 2, opening_move: "move-b" }] };
  const r = assembleSelection({ candidates: cands }, "", differentiation);
  if (r.error && /opening Move/.test(r.error)) {
    fails.push(`(l) a Candidate whose first Leg DID bind its assigned opening Move was refused by the differentiation check: ${r.error}`);
  }
}

// (m) AN ENTRY NAMING NO CANDIDATE'S UNIT IS NOT CHECKED AGAINST IT -- a
// candidate whose `differentiation_unit` resolves to no entry is not this
// check's business (it is `differentiation`'s own count refusal that
// guarantees an entry per unit at the real call site, never this one).
{
  const cands = [
    candidate("c1", 1, "move-a", "exp one", "one"),
    candidate("c2", 99, "whatever-move", "exp two", "two"),
  ];
  const differentiation = { entries: [{ unit_number: 1, opening_move: "move-a" }] };
  const r = assembleSelection({ candidates: cands }, "", differentiation);
  if (r.error && /opening Move/.test(r.error)) {
    fails.push(`(m) a candidate whose unit resolves to no differentiation entry was refused by the differentiation check: ${r.error}`);
  }
}

// (n) PASSING NO differentiation ARGUMENT AT ALL SKIPS THE CHECK ENTIRELY --
// a run predating this state, or a fixture exercising assembly on its own.
{
  const cands = [
    candidate("c1", 1, "move-a", "exp one", "one"),
    candidate("c2", 2, "move-mismatched", "exp two", "two"),
  ];
  const r = assembleSelection({ candidates: cands }, "");
  if (r.error && /opening Move/.test(r.error)) {
    fails.push(`(n) no \`differentiation\` argument was passed, yet the opening-Move check still fired: ${r.error}`);
  }
}

// ---- THE FREE-TEXT HINT IS GONE (kogaki#1206 acceptance 2), asserted by
// absence in the two workflow rows this member reads text from rather than
// invoking the runtime -- `src/brief-workflow.json`'s `reader_path_unit` row
// is where the sentence lived before this issue.
{
  const workflow = readFileSync("src/brief-workflow.json", "utf8");
  if (workflow.includes("choose a reader experience unlikely to be the one they choose")) {
    fails.push("(o) src/brief-workflow.json still carries the retired free-text hint sentence, beside the differentiation assignment that replaced it");
  }
  if (!workflow.includes("\"id\": \"differentiation\"")) {
    fails.push("(o) src/brief-workflow.json declares no `differentiation` state");
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-differentiation");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-differentiation — validateDifferentiationRecord's fifteen refusals and its passing shape, the Reader start / first-Leg survivor half (kogaki#1216: the persona reader, the survivor sentence, the retired verbatim binding's absence), the kogaki#1225 reader values (no Opening question heading, caption or derived value; Reader target derived from the Leg marked reaches_target's after-state line for line (kogaki#1231); `reader_target` and `opening_question` refused by name and recorded retired in the schema; the gate evidence reading the same marked Leg), assembleSelection's opening-Move check (refused, not-refused, unmatched-unit, and no-argument), and the retired free-text hint's absence");
JS
