#!/usr/bin/env bash
# check-brief-compose — the Step-record runtime's shape, fill, and
# count-after-composition properties (SPEC-draft-pipeline §§4.1, 4.4,
# 5.1-5.2; kogaki#489, story 1.73).
#
# Seam-free: the Brief under test is MINTED through the real §5.3 v9 flow
# (enter → adopt → mint) against the committed terrain survey fixture, in a
# temporary directory; the composed path is authored inline below — the
# check IS the fixture that records the Step serialization (story 1.73 SQ1).
#
# WHAT THIS DOES NOT COVER, stated rather than left to look covered: every
# MUST of the composition design is JUDGMENT-CLASS (§4.6) — whether a
# rationale stands on its grounds, whether an entailment is sound, whether a
# Move was bound after the reasoning — and NOTHING here judges any of it.
# This member exercises the record's SHAPE and the fill's PLUMBING only; the
# judge is the path-review agent (story 1.74), and its human gate.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { validateSteps, fillBrief, selectedStrands, placements, renderStep } from "./brief/compose.mjs";

const SURVEY = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const fails = [];
const dir = mkdtempSync(join(tmpdir(), "brief-compose-"));
const briefs = join(dir, "briefs");
const run = (argv) => spawnSync(process.execPath, argv, { encoding: "utf8" });

// Mint a real Brief through the v9 flow (L2 has a journey; L1 does not).
const rs = join(dir, "run.json");
run(["brief/brief.mjs", "enter", "--survey", SURVEY, "--ids", "L2,L1", "--run-state", rs]);
run(["brief/brief.mjs", "adopt", "--run-state", rs, "--thesis", "thesis-1"]);
run(["brief/brief.mjs", "mint", "--run-state", rs, "--slug", "compose-case", "--briefs-dir", briefs]);
const briefPath = join(briefs, "compose-case", "brief.md");

const step1 = {
  step_id: "s1", materials: ["L2", "thesis"],
  purpose: "give the reader the claim in working form",
  reader_state_before: "the reader has no stake in the claim",
  reader_state_after: "the reader can state the claim and its cost",
  depends_on: [],
  rationale: "the settled material states the claim directly, so the article opens on it",
  grounds: [{ type: "strand", strand: "L2", proposition: "the alpha lesson states the claim in its own words" }],
};
const step2 = {
  step_id: "s2", move: "worked-example", materials: ["L1"],
  purpose: "show the claim doing work on a concrete case",
  reader_state_before: "the reader can state the claim and its cost",
  reader_state_after: "the reader has seen the claim discriminate a real case",
  depends_on: ["s1"],
  rationale: "the bravo material carries the concrete case, and the case only reads after the claim is stated",
  grounds: [
    { type: "step_effect", step: "s1", proposition: "s1 leaves the claim stated, which the case presupposes" },
    { type: "strand", strand: "L1", proposition: "the bravo lesson records the concrete case" },
  ],
  entailed: true,
  entailment_reasoning: "the case's link to the claim is not stated in the material; it follows from the shared subject, and the gate judges that reading",
};

try {
  // (a) SHAPE (§4.1/§4.4): a conforming path validates; each broken record
  // is refused NAMING the missing field — a schema refusal, never a judgment.
  if (validateSteps([step1, step2]).error) fails.push(`(a) a conforming path was refused: ${validateSteps([step1, step2]).error}`);
  const drop = (s, k) => { const c = JSON.parse(JSON.stringify(s)); delete c[k]; return c; };
  for (const k of ["step_id", "materials", "purpose", "reader_state_before", "reader_state_after", "depends_on", "rationale", "grounds"]) {
    const r = validateSteps([drop(step1, k)]);
    if (!r.error || !r.error.includes(k)) fails.push(`(a) dropping ${k} was not refused naming the field`);
  }
  const noReason = JSON.parse(JSON.stringify(step2)); delete noReason.entailment_reasoning;
  const rE = validateSteps([step1, noReason]);
  if (!rE.error || !/entailment_reasoning/.test(rE.error)) fails.push("(a) entailed:true with no reasoning was not refused — entailment is judged, never silently trusted (§4.4)");
  const badDep = validateSteps([{ ...step1, depends_on: ["s9"] }]);
  if (!badDep.error || !/EARLIER/.test(badDep.error)) fails.push("(a) a depends_on naming a non-earlier step was accepted");
  const badGround = validateSteps([{ ...step1, grounds: [{ type: "vibes", proposition: "x" }] }]);
  if (!badGround.error || !/closed/.test(badGround.error)) fails.push("(a) a ground type outside §4.4's closed list was accepted");
  // move is OPTIONAL both ways: absent on s1 (accepted above), present on s2.
  if (validateSteps([step1, { ...step2, move: undefined }]).error) fails.push("(a) a step without a Move was refused — a step need not bind a Move (§4.1/§7.5)");

  // (b) FILL (§5.1/§5.2): sequence, strand_coverage and the ledger land in
  // the minted document; the ledger entries carry introduced_by /
  // discharged_by and an undischarged entry RENDERS as undischarged.
  const doc0 = readFileSync(briefPath, "utf8");
  const input = {
    steps: [step1, step2],
    coverage: { L2: { role_in_thesis: "states the claim" }, L1: { role_in_thesis: "carries the case" } },
    obligations: [
      { text: "the cost conceded in s1 must be weighed", introduced_by: "s1", discharged_by: "s2" },
      { text: "the case's generality is asserted, not shown", introduced_by: "s2" },
    ],
  };
  const f1 = fillBrief(doc0, input);
  if (f1.error) fails.push(`(b) a conforming fill was refused: ${f1.error}`);
  const doc1 = f1.doc || "";
  if (!/```step\nstep_id: s1/.test(doc1)) fails.push("(b) the sequence slot does not carry the serialized Step records");
  if (!/move: worked-example/.test(doc1)) fails.push("(b) the Move binding is absent from the serialized Step");
  if (!/entailment_reasoning: /.test(doc1)) fails.push("(b) the entailed Step's reasoning is not exposed on the record for the gate (§4.4)");
  if (!/\*\*L2\*\* — used_by_steps: s1;/.test(doc1)) fails.push("(b) strand_coverage does not carry used_by_steps derived from the composed steps");
  if (!/role_in_thesis: states the claim/.test(doc1)) fails.push("(b) strand_coverage does not carry role_in_thesis");
  if (!/introduced_by: s1; discharged_by: s2/.test(doc1)) fails.push("(b) a ledger entry does not carry introduced_by/discharged_by (§5.2)");
  if (!/\*\*UNDISCHARGED\*\*/.test(doc1)) fails.push("(b) an undischarged obligation does not render as undischarged — the disclosure is the contract (§5.2)");
  if (/## Sequence\n\n\*\(awaiting composition\)\*/.test(doc1)) fails.push("(b) the Sequence slot survived the fill");
  const refill = fillBrief(doc1, input);
  if (!refill.error) fails.push("(b) an already-filled Sequence was overwritten — composition resumes by judgment, not by overwrite");
  const badObl = fillBrief(doc0, { ...input, obligations: [{ text: "x", introduced_by: "s9" }] });
  if (!badObl.error) fails.push("(b) a ledger entry introduced_by a non-step was accepted");

  // (c) COUNT AFTER COMPOSITION (§5.2; §3's completeness rider): the count
  // is taken from the composed steps' PLACEMENTS, never from a declaration;
  // an unplaced selected Strand DISCLOSES and the fill still succeeds — a
  // disclosure, never a refusal.
  const only2 = {
    steps: [step1],
    // the declaration CLAIMS L1 is covered; the count must not believe it
    coverage: { L1: { role_in_thesis: "claimed but never placed" }, L2: { role_in_thesis: "states the claim" } },
  };
  const f2 = fillBrief(doc0, only2);
  if (f2.error) fails.push(`(c) a path leaving a Strand unused was refused — the three §4.4 moves include leaving it unused: ${f2.error}`);
  const doc2 = f2.doc || "";
  if (!/\*\*L1\*\* — \*\*UNPLACED, disclosed\*\*/.test(doc2)) fails.push("(c) the unplaced selected Strand does not disclose — a composer that cannot omit in principle can still omit in fact");
  if (!/placement count, taken AFTER composition, counted in placements: 1 of 2/.test(doc2)) fails.push("(c) the placement count is not 1 of 2 counted in placements from the steps themselves");
  if (f2.placed !== 1 || f2.total !== 2) fails.push(`(c) fill reported ${f2.placed}/${f2.total}, not 1/2`);
  // closed set: a foreign L-id in materials is a Brief fetch (§5.3).
  const foreign = fillBrief(doc0, { steps: [{ ...step1, materials: ["L7"] }] });
  if (!foreign.error || !/closed Strand set/.test(foreign.error)) fails.push("(c) a material outside the closed set was accepted — growing the set routes through Terrain, never a Brief fetch");

  // (d) COMMAND PATH agrees with the exported fill (dual-producer guard),
  // and the disclosure survives to the document on disk.
  const pj = join(dir, "path.json");
  writeFileSync(pj, JSON.stringify(only2));
  const r1 = run(["brief/compose.mjs", "fill", "--brief", briefPath, "--path", pj]);
  if (r1.status !== 0) fails.push(`(d) fill exited ${r1.status}: ${(r1.stderr || "").trim()}`);
  if (!/DISCLOSED/.test(r1.stdout || "")) fails.push("(d) the command did not disclose the unplaced Strand in its own output");
  if (readFileSync(briefPath, "utf8") !== doc2) fails.push("(d) the command's document differs from the exported fill's — two producers");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL brief compose (SPEC-draft-pipeline §§4.1/4.4/5.1-5.2, story 1.73):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief compose: 4/4 cases — (a) §4.1 Step shape refused per missing field, the "
  + "closed §4.4 ground types, entailed-without-reasoning refused, depends_on earlier-only, "
  + "Move optional both ways; (b) the fill lands sequence, strand_coverage (used_by_steps "
  + "derived from the steps, role_in_thesis carried) and the §5.2 ledger with introduced_by/"
  + "discharged_by, an undischarged entry rendering as UNDISCHARGED, and a filled Sequence "
  + "refusing overwrite; (c) the placement count runs AFTER composition counted in placements "
  + "— a declared cover is not believed, an unplaced Strand DISCLOSES and never refuses, a "
  + "foreign L-id refuses as a Brief fetch; (d) the command path is byte-equal to the "
  + "exported fill. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.73): THREE mutations, each run once "
  + "and restored surgically — dropping the rationale requirement from validateSteps failed "
  + "(a)'s field refusal; counting placements from the DECLARED coverage instead of the steps "
  + "failed (c)'s 1-of-2 assertion; dropping the UNPLACED disclosure branch failed (c)'s "
  + "disclosure assertion. NOT COVERED, stated rather than implied: every composition MUST is "
  + "judgment-class (§4.6) — grounds-test soundness, entailment quality, Move-binding order — "
  + "judged at path review (story 1.74) and its human gate, never here; this member exercises "
  + "record shape and fill plumbing only.");
JS
