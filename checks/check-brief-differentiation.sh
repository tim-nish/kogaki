#!/usr/bin/env bash
# check-brief-differentiation — the `differentiation` judgment state
# (kogaki#1206): decided before any reader-path unit composes, one entry per
# unit, so the three Candidates differ BY ASSIGNMENT rather than by chance.
#
# WHAT THIS COVERS. `validateDifferentiationRecord` (src/brief.mjs), the pure
# validator the `differentiation` state calls on the record before writing it
# -- every refusal the schema declares (wrong version, wrong entry count, a
# duplicate `unit_number`, a duplicate `dimension`, a `dimension` outside the
# closed set, an `opening_move` outside `moves_you_may_bind`, a
# `journey_placement` present on a Brief with no Journey material or outside
# its own closed set, a blank `reader_experience`) and the passing shape, both
# with and without Journey material. And `assembleSelection`'s own
# differentiation check (src/assemble.mjs): a Candidate whose first Leg does
# not bind its assigned unit's `opening_move` is refused naming the unit, a
# matching Candidate is not, an entry naming no candidate's unit is not
# checked against it, and passing no `differentiation` argument at all skips
# the check entirely (a run predating this state, or a fixture exercising
# assembly on its own).
#
# WHAT THIS DOES NOT COVER, stated rather than left to look covered: the
# reader-path unit's own prompt splice (`differentiationBlockFor`, spliced
# above `JUDGE_INPUT_MARKER` in `src/brief.mjs`'s `compose_path` handler) is
# an internal closure, not exported, and a live per-unit prompt is not a
# fixture this member constructs; the free-text hint's removal from
# `src/brief-workflow.json`'s `reader_path_unit.judgment_point` is asserted
# by absence below, on the same convention `check-brief-reader-path-job.sh`
# states for what it does not exercise either.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync } from "node:fs";
import { validateDifferentiationRecord } from "./src/brief.mjs";
import { assembleSelection } from "./src/assemble.mjs";

const fails = [];

const MOVES = [{ id: "move-a" }, { id: "move-b" }, { id: "move-c" }];

function baseEntries() {
  return [
    { unit_number: 1, dimension: "knowledge", opening_move: "move-a", reader_experience: "e1" },
    { unit_number: 2, dimension: "question", opening_move: "move-b", reader_experience: "e2" },
    { unit_number: 3, dimension: "expectation", opening_move: "move-c", reader_experience: "e3" },
  ];
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
check({ version: "1", entries: baseEntries() }, { units: 3, moves: MOVES, journeyBearing: false }, true, "a");

// (a2) A CONFORMING RECORD CARRYING journey_placement PASSES when the Brief
// carries Journey material.
{
  const entries = baseEntries();
  entries[0].journey_placement = "opening";
  check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: true }, true, "a2");
}

// (b) WRONG version IS REFUSED.
{
  const r = check({ version: "2", entries: baseEntries() }, { units: 3, moves: MOVES, journeyBearing: false }, false, "b");
  if (!/version/.test(r.error || "")) fails.push(`(b) refusal did not name \`version\`: ${r.error}`);
}

// (c) entries COUNT MISMATCH IS REFUSED, naming the count.
{
  const entries = baseEntries().slice(0, 2);
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: false }, false, "c");
  if (!/entries/.test(r.error || "")) fails.push(`(c) refusal did not name \`entries\`: ${r.error}`);
}

// (d) A DUPLICATE unit_number IS REFUSED, naming the entry.
{
  const entries = baseEntries();
  entries[1].unit_number = 1;
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: false }, false, "d");
  if (!/unit_number/.test(r.error || "")) fails.push(`(d) refusal did not name \`unit_number\`: ${r.error}`);
}

// (e) A dimension OUTSIDE THE CLOSED SET IS REFUSED.
{
  const entries = baseEntries();
  entries[0].dimension = "vibes";
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: false }, false, "e");
  if (!/dimension/.test(r.error || "")) fails.push(`(e) refusal did not name \`dimension\`: ${r.error}`);
}

// (f) TWO UNITS SHARING ONE dimension ARE REFUSED -- "differentiated by
// luck, not by assignment" is this record's whole point.
{
  const entries = baseEntries();
  entries[1].dimension = entries[0].dimension;
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: false }, false, "f");
  if (!/luck/.test(r.error || "")) fails.push(`(f) refusal did not name the luck/assignment distinction: ${r.error}`);
}

// (g) AN opening_move OUTSIDE moves_you_may_bind IS REFUSED.
{
  const entries = baseEntries();
  entries[0].opening_move = "no-such-move";
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: false }, false, "g");
  if (!/opening_move/.test(r.error || "")) fails.push(`(g) refusal did not name \`opening_move\`: ${r.error}`);
}

// (h) journey_placement PRESENT ON A BRIEF WITH NO JOURNEY MATERIAL AT ALL
// IS REFUSED, whatever value it carries.
{
  const entries = baseEntries();
  entries[0].journey_placement = "opening";
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: false }, false, "h");
  if (!/journey_placement/.test(r.error || "")) fails.push(`(h) refusal did not name \`journey_placement\`: ${r.error}`);
}

// (i) journey_placement OUTSIDE ITS OWN CLOSED SET IS REFUSED, on a Brief
// that does carry Journey material.
{
  const entries = baseEntries();
  entries[0].journey_placement = "middle";
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: true }, false, "i");
  if (!/journey_placement/.test(r.error || "")) fails.push(`(i) refusal did not name \`journey_placement\`: ${r.error}`);
}

// (j) A BLANK reader_experience IS REFUSED.
{
  const entries = baseEntries();
  entries[0].reader_experience = "   ";
  const r = check({ version: "1", entries }, { units: 3, moves: MOVES, journeyBearing: false }, false, "j");
  if (!/reader_experience/.test(r.error || "")) fails.push(`(j) refusal did not name \`reader_experience\`: ${r.error}`);
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
console.log("ok: check-brief-differentiation — validateDifferentiationRecord's nine refusals and its passing shape, assembleSelection's opening-Move check (refused, not-refused, unmatched-unit, and no-argument), and the retired free-text hint's absence");
JS
