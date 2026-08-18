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
import { validateSteps, fillBrief, selectedStrands, placements, renderStep,
         journeyBearingStrands, journeyPlacements } from "./brief/compose.mjs";
import { assembleSelection, adoptCandidate } from "./brief/assemble.mjs";
import { REVIEW_AREAS } from "./brief/review.mjs";

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
  // ---- story 1.75 (kogaki#491): Candidate assembly and the selection
  // gate's payload, cases added to THIS member because §6 registers no new
  // check — the surface is the same composition pipeline's plumbing. ----
  const mkReview = () => Object.fromEntries(REVIEW_AREAS.map((a) => [a, `reasoning for ${a}`]));
  const mkCand = (id, exp, steps) => ({
    candidate_id: id, reader_experience: exp, steps,
    review: mkReview(),
    reasoning: {
      step_validity: `${id}: each step's grounds were traced`,
      transition_continuity: `${id}: each after-state feeds the next before-state`,
      thesis_closure: `${id}: the claim is established by the final step`,
    },
    coverage: { L2: { role_in_thesis: "states the claim" }, L1: { role_in_thesis: "carries the case" } },
    obligations: [{ text: "the case's generality is asserted", introduced_by: steps[steps.length - 1].step_id }],
  });
  const candA = mkCand("cand-1", "claim first, then the case", [step1, step2]);
  const candB = mkCand("cand-2", "the case first, claim emerging from it", [
    { ...step1, step_id: "t1", materials: ["L1"], grounds: [{ type: "strand", strand: "L1", proposition: "the bravo lesson records the concrete case" }] },
    { ...step2, step_id: "t2", move: undefined, materials: ["L2"], depends_on: ["t1"],
      grounds: [{ type: "step_effect", step: "t1", proposition: "t1 leaves the case seen, which the claim generalizes" }], entailed: undefined, entailment_reasoning: undefined },
  ]);
  candB.obligations = [{ text: "the claim's scope beyond the case", introduced_by: "t2" }];

  // (e) ASSEMBLY: 2-3 Candidates differing in reader experience; the count
  // and the difference are the contract; the payload rides the record shape
  // with per-Candidate evidence and the first-class negation.
  const one = assembleSelection({ candidates: [candA] }, doc0);
  if (!one.error || !/1 Candidate/.test(one.error)) fails.push("(e) a single Candidate was presented — a default in disguise (§6: two to three)");
  const four = assembleSelection({ candidates: [candA, candB, mkCand("cand-3", "x3", [step1]), mkCand("cand-4", "x4", [step1])] }, doc0);
  if (!four.error || !/4 Candidate/.test(four.error)) fails.push("(e) four Candidates were presented — the selector overruns");
  const same = assembleSelection({ candidates: [candA, { ...candB, reader_experience: candA.reader_experience }] }, doc0);
  if (!same.error || !/SAME reader experience/.test(same.error)) fails.push("(e) two Candidates with one reader experience were presented as two (§6: differing in reader experience)");
  const noReas = JSON.parse(JSON.stringify(candB)); delete noReas.reasoning.thesis_closure;
  const nr = assembleSelection({ candidates: [candA, noReas] }, doc0);
  if (!nr.error || !/thesis_closure/.test(nr.error)) fails.push("(e) a Candidate without its composition-time reasoning was presentable — the evidence is the contract (§6)");
  const noRev = JSON.parse(JSON.stringify(candB)); delete noRev.review.grounds_test;
  const nv = assembleSelection({ candidates: [candA, noRev] }, doc0);
  if (!nv.error || !/unreviewed/.test(nv.error)) fails.push("(e) an unreviewed Candidate was presentable at the selection gate");
  const ok = assembleSelection({ candidates: [candA, candB] }, doc0);
  if (ok.error) fails.push(`(e) a conforming Candidate set was refused: ${ok.error}`);
  const pay = ok.payload || {};
  for (const f of ["where", "why", "label", "options", "free_text"]) if (!(f in pay)) fails.push(`(e) the payload lacks record field ${JSON.stringify(f)} — Candidates ride the proposal-contract shape (§6)`);
  const negOpt = (pay.options || []).find((o) => o.negates_premise === true);
  if (!negOpt) fails.push("(e) no option flagged negates_premise — the premise's negation is first-class (§6)");
  else if (!/Thesis or the selected set/.test(negOpt.label)) fails.push("(e) the negation option does not state the premise it negates");
  if (pay.free_text?.accepted !== true) fails.push("(e) the free-text channel is not unconditionally accepted");
  if (!/does not discharge/.test(pay.free_text?.prompt || "")) fails.push("(e) the free-text prompt does not state that it leaves the negation undischarged");
  for (const o of (pay.options || []).filter((x) => !x.negates_premise)) {
    for (const f of ["step_validity", "transition_continuity", "thesis_closure", "obligations_ledger", "placement_count"]) {
      if (typeof o.evidence?.[f] !== "string") fails.push(`(e) option ${o.id} carries no ${f} evidence — the five composition-time items ride each Candidate (§6)`);
    }
    if (!/Adopt .+ becomes the Brief's sequence/.test(o.label)) fails.push(`(e) option ${o.id}'s label does not state its effect (proposal-contract §2.2)`);
    if (typeof o.evidence?.review !== "object") fails.push(`(e) option ${o.id} does not carry the path-review reasoning`);
  }
  // candB places only L1+L2 across two steps; candA the same — per-candidate
  // placement counts must come from each Candidate's OWN steps.
  const oneStrand = assembleSelection({ candidates: [mkCand("cand-5", "only the claim, no case", [step1]), candB] }, doc0);
  const opt5 = (oneStrand.payload?.options || []).find((o) => o.id === "cand-5");
  if (!opt5 || !/1 of 2/.test(opt5.evidence.placement_count)) fails.push("(e) a Candidate placing one of two Strands does not carry '1 of 2' — the count is per Candidate, from its own steps");

  // (f) ADOPTION: the adopted Candidate's Reader Path lands in the Brief's
  // sequence; thesis_closure and tradeoffs fill from its reasoning (§5.1).
  const ad = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2");
  if (ad.error) fails.push(`(f) adopting a reviewed Candidate was refused: ${ad.error}`);
  const doc3 = ad.doc || "";
  if (!/```step\nstep_id: t1/.test(doc3)) fails.push("(f) the adopted Candidate's Reader Path did not land in the Brief's sequence");
  if (/```step\nstep_id: s1/.test(doc3)) fails.push("(f) a DECLINED Candidate's steps landed in the Brief");
  if (!/## Thesis closure\n\ncand-2: the claim is established by the final step/.test(doc3)) fails.push("(f) thesis_closure did not fill from the adopted Candidate's reasoning");
  if (!/established_by_steps: t1, t2/.test(doc3)) fails.push("(f) thesis_closure does not carry established_by_steps");
  if (/## Tradeoffs\n\n\*\(awaiting composition\)\*/.test(doc3)) fails.push("(f) tradeoffs is still an unfilled slot after adoption");
  const noSuch = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-9");
  if (!noSuch.error || !/not in the reviewed set/.test(noSuch.error)) fails.push("(f) adopting a Candidate the gate never offered was accepted");

  // (g) COMMAND PATHS agree with the exported functions.
  const rvf = join(dir, "reviewed.json"); const ouf = join(dir, "payload.json");
  writeFileSync(rvf, JSON.stringify({ candidates: [candA, candB] }));
  const bp2 = join(dir, "brief-adopt.md"); writeFileSync(bp2, doc0);
  const p1 = spawnSync(process.execPath, ["brief/assemble.mjs", "assemble", "--reviewed", rvf, "--brief", briefPath, "--out", ouf], { encoding: "utf8" });
  if (p1.status !== 0) fails.push(`(g) assemble exited ${p1.status}: ${(p1.stderr || "").trim()}`);
  else if (JSON.stringify(JSON.parse(readFileSync(ouf, "utf8"))) !== JSON.stringify(pay)) fails.push("(g) the command's payload differs from the exported function's — two producers");
  if (!/never a verdict/.test(p1.stdout || "")) fails.push("(g) assemble does not state the no-verdict property in its own output");
  const p2 = spawnSync(process.execPath, ["brief/assemble.mjs", "adopt-candidate", "--brief", bp2, "--reviewed", rvf, "--candidate", "cand-2"], { encoding: "utf8" });
  if (p2.status !== 0) fails.push(`(g) adopt-candidate exited ${p2.status}: ${(p2.stderr || "").trim()}`);
  else if (readFileSync(bp2, "utf8") !== doc3) fails.push("(g) the command's adopted document differs from the exported function's — two producers");

  // (h) JOURNEY COVERAGE (§6.1 MUST 1, kogaki#501): journey material is a
  // DISTINCT material (§4.1's "which Journeys"), carried as `<L-id>.journey`,
  // PLACED OR ITS OMISSION DISCLOSED — derived from the composed steps, never
  // declared. The fixture's L2 carries a Journey and L1 does not, which is
  // what makes the two refusals below separable.
  if (JSON.stringify(journeyBearingStrands(doc0)) !== JSON.stringify(["L2"]))
    fails.push(`(h) journey-bearing members misread: got ${JSON.stringify(journeyBearingStrands(doc0))}, expected ["L2"] (L2 carries a journey cite, L1 does not)`);

  // placed: a step carrying L2.journey
  const jstep = { ...JSON.parse(JSON.stringify(step1)), materials: ["L2", "L2.journey", "thesis"] };
  const jfill = fillBrief(doc0, { steps: [jstep, step2] });
  if (jfill.error) fails.push(`(h) a path placing journey material was refused: ${jfill.error}`);
  else {
    if (!/\*\*L2\*\* journey — placed by: s1/.test(jfill.doc)) fails.push("(h) placed journey material is not disclosed as placed");
    if (!/Journey placement count[^\n]*1 of 1/.test(jfill.doc)) fails.push("(h) the journey placement count is not 1 of 1 when the only Journey-bearing Strand is placed");
  }

  // omitted: no step carries L2.journey — DISCLOSES, never refuses
  const ofill = fillBrief(doc0, { steps: [step1, step2] });
  if (ofill.error) fails.push(`(h) a path omitting journey material was REFUSED — §6.1 is place-or-disclose, never place-or-fail: ${ofill.error}`);
  else {
    if (!/\*\*L2\*\* journey — \*\*OMITTED, disclosed\*\*/.test(ofill.doc)) fails.push("(h) omitted journey material is not disclosed — it dropped silently, which is the defect §6.1 MUST 1 names");
    if (!/Journey placement count[^\n]*0 of 1/.test(ofill.doc)) fails.push("(h) the journey placement count is not 0 of 1 when the Journey-bearing Strand is unplaced");
  }

  // a Strand whose served record carries NO journey refuses BY NAME
  const bad1 = fillBrief(doc0, { steps: [{ ...JSON.parse(JSON.stringify(step1)), materials: ["L1.journey"] }, step2] });
  if (!bad1.error || !/carries none/.test(bad1.error)) fails.push("(h) claiming Journey material for a Strand that has none was accepted — unsupported completion (§4.4)");
  // a Journey outside the closed set refuses as a Brief fetch
  const bad2 = fillBrief(doc0, { steps: [{ ...JSON.parse(JSON.stringify(step1)), materials: ["L9.journey"] }, step2] });
  if (!bad2.error || !/closed set/.test(bad2.error)) fails.push("(h) a Journey naming a Strand outside the closed set was accepted — a Brief fetch (§5.3)");

  // VACUOUS, never violated: journeyPlacements over an empty Journey set
  if (journeyPlacements([step1, step2], []).size !== 0) fails.push("(h) journeyPlacements over no Journey-bearing member is not empty");

  // (i) PER-CANDIDATE journey coverage rides the gate payload as EVIDENCE
  // (§6.1: register is an axis Candidates differ on, so the figure is per
  // Candidate and never averaged across the Brief).
  const jcandA = { ...JSON.parse(JSON.stringify(candA)), steps: [jstep] };
  const jpay = assembleSelection({ candidates: [jcandA, candB] }, doc0);
  if (jpay.error) fails.push(`(i) assembly refused a Candidate placing journey material: ${jpay.error}`);
  else {
    const o = jpay.payload.options.find((x) => x.id === jcandA.candidate_id);
    const o2 = jpay.payload.options.find((x) => x.id === candB.candidate_id);
    if (!/1 of 1 Journey-bearing/.test(o?.evidence?.journey_coverage || "")) fails.push("(i) the placing Candidate's journey_coverage is absent or wrong");
    if (!/OMITTED and disclosed: L2/.test(o2?.evidence?.journey_coverage || "")) fails.push("(i) the omitting Candidate's journey_coverage does not disclose the omission — two Candidates differing on this axis read identically");
    if (/verdict|pass|score/i.test(o?.evidence?.journey_coverage || "")) fails.push("(i) journey_coverage reads as a verdict — §6.1 registers no check and §4.6 keeps every MUST un-linted");
  }

} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL brief compose (SPEC-draft-pipeline §§4.1/4.4/5.1-5.2, story 1.73):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief compose: 9/9 cases — (a) §4.1 Step shape refused per missing field, the "
  + "closed §4.4 ground types, entailed-without-reasoning refused, depends_on earlier-only, "
  + "Move optional both ways; (b) the fill lands sequence, strand_coverage (used_by_steps "
  + "derived from the steps, role_in_thesis carried) and the §5.2 ledger with introduced_by/"
  + "discharged_by, an undischarged entry rendering as UNDISCHARGED, and a filled Sequence "
  + "refusing overwrite; (c) the placement count runs AFTER composition counted in placements "
  + "— a declared cover is not believed, an unplaced Strand DISCLOSES and never refuses, a "
  + "foreign L-id refuses as a Brief fetch; (d) the command path is byte-equal to the "
  + "exported fill; (e) Candidate assembly refuses one or four Candidates and a duplicated "
  + "reader experience, and the payload rides the proposal-contract shape — where/why, "
  + "effect-stating labels, the first-class none-of-these flagged negates_premise, an "
  + "unconditional free-text channel that states it does not discharge the negation, and "
  + "per-Candidate evidence carrying step validity, transition continuity, Thesis closure, "
  + "the ledger's state and the placement count from each Candidate's OWN steps; (f) the "
  + "adopted Candidate's Reader Path lands in the Brief's sequence with thesis_closure and "
  + "tradeoffs filled from its reasoning, a declined Candidate lands nowhere, and an "
  + "unoffered Candidate refuses; (g) both assemble and adopt-candidate command paths are "
  + "byte-equal to the exported functions; (h) JOURNEY COVERAGE (§6.1 MUST 1) — journey "
  + "material is a distinct material carried as `<L-id>.journey`, its placement DERIVED from "
  + "the composed steps, placed rendering as placed and omitted rendering as OMITTED-disclosed "
  + "rather than refusing, a Journey claimed for a Strand whose record carries none refused BY "
  + "NAME as unsupported completion, a Journey outside the closed set refused as a Brief fetch, "
  + "and the no-Journey case vacuous rather than violated; (i) per-Candidate journey_coverage "
  + "rides the gate payload as EVIDENCE, so two Candidates differing on the journey axis do not "
  + "read identically, and it carries no verdict token. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, stories 1.73 + 1.75 + kogaki#501): TEN "
  + "mutations, each "
  + "run once and restored surgically — story 1.73's three: dropping the rationale "
  + "requirement from validateSteps failed (a)'s field refusal; counting placements from the "
  + "DECLARED coverage instead of the steps failed (c)'s 1-of-2 assertion; dropping the "
  + "UNPLACED disclosure branch failed (c)'s disclosure assertion. Story 1.75's three: "
  + "dropping the 2-3 count guard failed (e)'s single-Candidate refusal; dropping the "
  + "negation option failed (e)'s negates_premise assertion; skipping the thesis_closure "
  + "fill at adoption failed (f). kogaki#501's four: dropping the OMITTED-disclosed branch "
  + "failed (h)'s disclosure assertion; matching a BARE L-id instead of `<L-id>.journey` — "
  + "the declined \"placing the Strand places its Journey\" option — failed (h)'s 0-of-1 "
  + "assertion, which is the direct evidence that option would have made MUST 1 "
  + "unfalsifiable; dropping the carries-none refusal failed (h)'s unsupported-completion "
  + "case; and computing journey coverage from something other than THIS Candidate's steps "
  + "failed (i). NOT COVERED, stated rather than implied: every composition "
  + "MUST is judgment-class (§4.6) — grounds-test soundness, entailment quality, "
  + "Move-binding order, and whether the surfaced evidence is ADEQUATE evidence — judged at "
  + "path review (story 1.74) and the human gate, never here; this member exercises record "
  + "shape, fill and gate-payload plumbing only, and the selection gate itself is raised by "
  + "the sitting through AskUserQuestion, a relay property no check can run.");
JS
