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
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { validateSteps, fillBrief, selectedStrands, placements, renderStep,
         journeyBearingStrands, journeyPlacements, replaceSlot } from "./src/compose.mjs";
import { resolveMoveIds, validateSpecialization, loadMoveIds,
         introducesRefusal, parseIntroducesEntry, readerKnowledgeLedger, introducerOf,
         moveExcerpt, isExemplar, renderExcerptBlock } from "./src/compose.mjs";
import { assembleSelection, adoptCandidate, denyInternalVocabulary, EVIDENCE_LABELS, REVIEW_LABELS, READER_FIELDS, candidateEvidence, findInternalVocabulary } from "./src/assemble.mjs";
import { REVIEW_AREAS } from "./src/review.mjs";

const SURVEY = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const fails = [];
let exemplarLine = "the Move library was not read";
const dir = mkdtempSync(join(tmpdir(), "brief-compose-"));
const theses = join(dir, "theses");
const run = (argv) => spawnSync(process.execPath, argv, { encoding: "utf8" });

// Mint a real Brief through the v9 flow (L2 has a journey; L1 does not).
const rs = join(dir, "run.json");
run(["src/brief.mjs", "enter", "--survey", SURVEY, "--ids", "L2,L1", "--run-state", rs]);
run(["src/brief.mjs", "adopt", "--run-state", rs, "--thesis", "thesis-1"]);
run(["src/brief.mjs", "mint", "--run-state", rs, "--slug", "compose-case", "--theses-dir", theses]);
const briefPath = join(theses, "compose-case", "brief.md");

// §4.12's FIXTURE MOVE LIBRARY (kogaki#747). The composed paths below bind
// invented Move ids, which is correct for a shape fixture and is exactly why
// the instantiation contract needs its own store to resolve against: pointing
// these cases at the repository's real `moves/` would either force the fixture
// to adopt library ids it does not mean, or make the check fail on a library
// edit it has nothing to do with. `--moves-dir` exists for this.
//
// The records hold ONLY an id line. That is not laziness: `loadMoveIds` reads
// the store as a set of ids and nothing else (§4.12's mechanical half is a
// membership test), so a fixture carrying `requires`/`effect` would suggest
// the resolver reads them.
const MOVES = join(dir, "moves");
mkdirSync(MOVES, { recursive: true });
for (const id of ["state-claim-in-working-form", "worked-example", "generalize-from-the-seen-case"]) {
  writeFileSync(join(MOVES, `${id}.md`), `id: ${id}\nstatus: observed\n`);
}
// A CONFORMING specialization record for a Candidate — composed HERE, by the
// check, standing in for the judging sitting. The runtime under test composes
// none, which is the property (c) below asserts by removing this.
const spec = (cand, over = {}) => ({
  version: "1",
  candidate_id: cand.candidate_id,
  verdicts: cand.steps.map((st) => ({
    step_id: st.step_id, move: st.move, verdict: "consistent",
    why: `the before-state and after-state read as instance forms of ${st.move}'s contract`,
  })),
  ...over,
});
const inst = (cand, over = {}) => ({ movesDir: MOVES, specialization: spec(cand, over) });

const step1 = {
  // §4.1 v18 (kogaki#642): every Step binds a Move — the State component.
  step_id: "s1", move: "state-claim-in-working-form", materials: ["L2", "thesis"],
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
  // move is REQUIRED on every Step — §4.1 v18 (kogaki#642), which supersedes
  // §7.5's no-mandatory-Moves rider by name. The assertion is INVERTED rather
  // than removed: the case it covers is the same one, and deleting it would
  // leave the new requirement with no exercised trial. The refusal must name
  // the field, so a later loosening cannot pass by refusing for another reason.
  const noMove = validateSteps([step1, { ...step2, move: undefined }]);
  if (!noMove.error || !/move/.test(noMove.error)) fails.push("(a) a step without a Move was accepted — the Move is a Step's State component and §4.1 v18 requires one");
  const emptyMove = validateSteps([{ ...step1, move: "" }]);
  if (!emptyMove.error || !/move/.test(emptyMove.error)) fails.push("(a) an empty-string Move was accepted — a binding is to a library entry by id, never the empty id");

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
  // THE RATIFIED HEADING, AND THE ASSERTION FOLLOWS IT (kogaki#574). This read
  // `## Sequence`, the heading kogaki#574 retires — so after the rename it tested
  // for a string the composer can no longer emit and could never fail. RE-POINTED
  // rather than deleted: same property, read at the heading that now carries it.
  if (/## Reader Path\n\n\*\(awaiting composition\)\*/.test(doc1)) fails.push("(b) the Reader Path slot survived the fill");
  // AND THE OWNER SURFACE CARRIES THE RATIFIED NAME while the RECORD FIELD does
  // not move — the two halves of §5.1.3's split, asserted together because the
  // issue's constraint is exactly that pairing. Renaming the field too would pass
  // the first of these and fail the second.
  if (!/^## Reader Path$/m.test(doc1)) fails.push("(b) the filled Brief does not render its structure section as Reader Path (kogaki#574)");
  if (/^## Sequence$/m.test(doc1)) fails.push("(b) the retired Sequence heading still reaches the owner (kogaki#574)");
  const refill = fillBrief(doc1, input);
  if (!refill.error) fails.push("(b) an already-filled Reader Path was overwritten — composition resumes by judgment, not by overwrite");
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

  // Boundary 1 (Check/CI infrastructure) — both prescribed shards surveyed
  // this sitting before (d) was rewritten:
  //   "A rule written in a shared document only affects the projects whose
  //   authors go and look it up."
  //   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/claude-code-ops.md:29
  //   "Write down each path and which passing run covers it; a path with no
  //   named run is untested no matter how healthy the overall suite looks."
  //   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:173
  // The second is why the guard was MOVED to (g) and said to be moved, rather
  // than deleted with the route it happened to sit on.
  //
  // (d) THE `fill` CLI ROUTE IS RETIRED (§5.3 v17, kogaki#551), and it refuses
  // with the route that replaces it.
  //
  // WHAT THIS CASE USED TO ASSERT, AND WHERE THAT COVERAGE WENT. It was the
  // dual-producer guard on `fill`: the command's on-disk document had to equal
  // the exported composer's. The property is unchanged and still guarded — on
  // the write path that survives — by (g), which asserts exactly that for
  // `adopt-candidate`. So the guard MOVED with the route rather than being
  // dropped with it; a retirement that silently took a guard with it is the
  // failure this comment exists to prevent.
  //
  // The retirement is asserted rather than assumed, because a removed
  // subcommand and a subcommand that still works are indistinguishable to a
  // suite that stops calling it.
  const r1 = run(["src/compose.mjs", "fill", "--brief", briefPath, "--path", join(dir, "nonexistent.json")]);
  if (r1.status === 0) fails.push("(d) `fill` still succeeds — the ungated route §6's selection gate exists to replace is still reachable");
  const r1err = `${r1.stderr || ""}${r1.stdout || ""}`;
  if (!/no longer exists/.test(r1err)) fails.push(`(d) \`fill\` does not name itself retired: ${r1err.trim().slice(0, 120)}`);
  // A refusal that does not name the replacement sends the caller looking.
  if (!/adopt-candidate/.test(r1err)) fails.push("(d) the retirement refusal does not name the route that replaces it");
  // The COMPOSER is untouched: what retired is the CLI entry point, never the
  // composition. NO ASSERTION IS WRITTEN FOR THAT HERE, and the omission is
  // deliberate — a `typeof fillBrief !== "function"` line was written, run as a
  // mutation, and found UNREACHABLE: `src/assemble.mjs` imports `fillBrief`,
  // so un-exporting it fails this suite at MODULE LOAD with a SyntaxError,
  // before any case executes. The import is the carrier; a line that can never
  // fire would have claimed the coverage the import already supplies.
  // (c) above exercises `fillBrief` directly, which is the positive half.
  // ---- story 1.75 (kogaki#491): Candidate assembly and the selection
  // gate's payload, cases added to THIS member because §6 registers no new
  // check — the surface is the same composition pipeline's plumbing. ----
  // The fixture reasoning is itself in plain register: an area name pasted
  // into its own prose would leak at the gate, which (j) refuses.
  const mkReview = () => Object.fromEntries(REVIEW_AREAS.map((a) => [a, `reasoning for the ${a.replace(/_/g, " ")} area`]));
  // The three reader fields are authored at PATH COMPOSITION, per Candidate
  // (§5.1 v12, kogaki#521), so the fixture carries them per Candidate and
  // they DIFFER between cand-1 and cand-2 — (l) asserts that difference
  // survives to the gate, which is what makes them a real axis rather than a
  // constant repeated twice.
  const mkCand = (id, exp, steps) => ({
    candidate_id: id, reader_experience: exp, steps,
    reader_start: `${id}: the reader treats the case as one team's habit`,
    reader_target: `${id}: the reader treats it as a property of the shape`,
    opening_question: `${id}: why did the same fix land twice?`,
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
    { ...step2, step_id: "t2", move: "generalize-from-the-seen-case", materials: ["L2"], depends_on: ["t1"],
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

  // A BLANK OPTION LABEL IS UNPRODUCIBLE (kogaki#578). Since the label IS the
  // reader-experience prose, the presence guard is what keeps every option
  // visible — and it refused only the empty string while the dedup key beside
  // it folded. A whitespace-only experience therefore passed and rendered as an
  // option the owner cannot see. Sited HERE, beside its twin, because the
  // property is case (e)'s: what assembly refuses about a reader experience.
  {
    const blank = assembleSelection({ candidates: [candA, { ...JSON.parse(JSON.stringify(candB)), reader_experience: "   \t  " }] }, doc0);
    if (!blank.error || !/cannot be blank/.test(blank.error)) {
      fails.push("(e) a whitespace-only reader experience was accepted — the option label IS that prose, so it renders blank and the owner is asked to choose between a visible option and an invisible one (kogaki#578)");
    }
  }
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
  // THE SHARED EFFECT IS CARRIED, not merely absent from the labels. Dropping
  // the prefix without stating the effect anywhere would satisfy every
  // no-repetition assertion below and leave the owner not knowing what
  // answering does — the failure proposal-contract §2.2 exists to prevent, and
  // the reason the two halves are asserted together rather than one of them.
  if (!/Reader Path/.test(pay.label || "") || !/Brief's sequence/.test(pay.label || "")) {
    fails.push("(e) the gate's own label does not state what adopting an option does — the effect states ONCE, and once is not zero (kogaki#568, proposal-contract §2.2)");
  }
  if (pay.free_text?.accepted !== true) fails.push("(e) the free-text channel is not unconditionally accepted");
  if (!/does not discharge/.test(pay.free_text?.prompt || "")) fails.push("(e) the free-text prompt does not state that it leaves the negation undischarged");
  for (const o of (pay.options || []).filter((x) => !x.negates_premise)) {
    for (const f of ["step_validity", "transition_continuity", "thesis_closure", "obligations_ledger", "placement_count"]) {
      if (typeof o.evidence?.[f] !== "string") fails.push(`(e) option ${o.id} carries no ${f} evidence — the five composition-time items ride each Candidate (§6)`);
    }
    // THE EFFECT STATES ONCE, AND NO OPTION REPEATS IT (kogaki#568). This line
    // used to require every option label to match `Adopt … becomes the Brief's
    // sequence` — a string match on a clause IDENTICAL on every option, so what
    // it actually asserted was the repetition rather than the effect. What is
    // asserted now is the property that replaced it: the shared effect rides
    // the payload's own label (above), and an option label carries only what
    // distinguishes it.
    if (/becomes the Brief's sequence/.test(o.label || "")) {
      fails.push(`(e) option ${o.id}'s label repeats the shared effect clause — the effect states once, at question level (kogaki#568)`);
    }
    if (String(o.label || "").trim().split(/\s+/).length < 2) {
      fails.push(`(e) option ${o.id}'s label is not prose — proposal-contract §2.2's floor refuses a one-word label`);
    }
    if (String(o.label || "").trim().toLowerCase() === String(pay.label || "").trim().toLowerCase()) {
      fails.push(`(e) option ${o.id}'s label is identical to the gate's own — §2.2's floor refuses a record label that restates an option's`);
    }
    if (new RegExp("^\\s*Adopt\\s+" + o.id + "\\b").test(o.label || "")) {
      fails.push(`(e) option ${o.id}'s label opens with the record id — the id resolves the answer and is not what distinguishes an option (kogaki#568)`);
    }
    if (typeof o.evidence?.review !== "object") fails.push(`(e) option ${o.id} does not carry the path-review reasoning`);
  }
  // candB places only L1+L2 across two steps; candA the same — per-candidate
  // placement counts must come from each Candidate's OWN steps.
  const oneStrand = assembleSelection({ candidates: [mkCand("cand-5", "only the claim, no case", [step1]), candB] }, doc0);
  const opt5 = (oneStrand.payload?.options || []).find((o) => o.id === "cand-5");
  if (!opt5 || !/1 of 2/.test(opt5.evidence.placement_count)) fails.push("(e) a Candidate placing one of two Strands does not carry '1 of 2' — the count is per Candidate, from its own steps");

  // (f) ADOPTION: the adopted Candidate's Reader Path lands in the Brief's
  // sequence; thesis_closure and tradeoffs fill from its reasoning (§5.1).
  const ad = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", inst(candB));
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
  const p1 = spawnSync(process.execPath, ["src/assemble.mjs", "assemble", "--reviewed", rvf, "--brief", briefPath, "--out", ouf], { encoding: "utf8" });
  if (p1.status !== 0) fails.push(`(g) assemble exited ${p1.status}: ${(p1.stderr || "").trim()}`);
  else if (JSON.stringify(JSON.parse(readFileSync(ouf, "utf8"))) !== JSON.stringify(pay)) fails.push("(g) the command's payload differs from the exported function's — two producers");
  if (!/never a verdict/.test(p1.stdout || "")) fails.push("(g) assemble does not state the no-verdict property in its own output");
  const spf = join(dir, "specialization.json");
  writeFileSync(spf, JSON.stringify(spec(candB)));
  const p2 = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", "--brief", bp2, "--reviewed", rvf, "--candidate", "cand-2", "--specialization", spf, "--moves-dir", MOVES], { encoding: "utf8" });
  if (p2.status !== 0) fails.push(`(g) adopt-candidate exited ${p2.status}: ${(p2.stderr || "").trim()}`);
  else if (readFileSync(bp2, "utf8") !== doc3) fails.push("(g) the command's adopted document differs from the exported function's — two producers");


  // (k) THE STEP↔MOVE INSTANTIATION CONTRACT (§4.12, kogaki#747), both halves
  // at the one occasion that can make them unskippable — adoption is the only
  // write that lands a sequence in an existing Brief.
  //
  // THE MECHANICAL HALF — the move id resolves, or the adoption refuses.
  {
    const dangler = { ...candB, steps: [{ ...candB.steps[0], move: "no_such_move" }, candB.steps[1]] };
    const d = adoptCandidate(doc0, { candidates: [candA, dangler] }, "cand-2", inst(dangler));
    if (!d.error) fails.push("(k) a Step binding a move id that resolves to no record was ADOPTED — the dangling id rides the Brief to Packet time");
    else {
      if (!/t1/.test(d.error)) fails.push("(k) the dangling-move refusal does not name the STEP (ruling 1: the refusal names the Step and the id)");
      if (!/no_such_move/.test(d.error)) fails.push("(k) the dangling-move refusal does not name the ID");
      if (d.doc) fails.push("(k) the dangling-move refusal still produced a document");
    }
    // AN UNREADABLE STORE IS NOT AN EMPTY STORE. Without this branch every id
    // reads as dangling and the refusal names the Steps for a fault that is
    // the store's — a true refusal for a false reason, and the composer is
    // sent to re-bind Moves that were never wrong.
    const noStore = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2",
      { movesDir: join(dir, "absent-library"), specialization: spec(candB) });
    if (!noStore.error) fails.push("(k) an unreadable Move library was treated as a library");
    else {
      if (!/cannot be read/.test(noStore.error)) fails.push("(k) an unreadable Move library refuses as if the ids dangled — the refusal blames the composition for a store fault");
      if (/t1/.test(noStore.error)) fails.push("(k) the unreadable-store refusal names a Step, sending the composer to re-bind Moves that are not the problem");
    }
    const emptyStore = loadMoveIds(theses);
    if (!emptyStore.error || !/no Move records/.test(emptyStore.error)) fails.push("(k) a readable directory holding no Move records was accepted as a library");
  }

  // THE JUDGED HALF — a typed record the harness VALIDATES and NEVER COMPOSES.
  {
    // NO SKIP. The absence of a record is refused at the act, not defaulted:
    // this single assertion is what makes the occasion mandatory, and it is
    // also the direct evidence that no verdict is composed here — if adoption
    // could supply one, this call would succeed.
    const bare = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES });
    if (!bare.error) fails.push("(k) adoption ACCEPTED a path with no specialization record — the judgment occasion is skippable, or the runtime composed a verdict of its own");
    else {
      // DISCRIMINATED, because two guards carry this and only one is the
      // property. Removing the act-level check leaves `validateSpecialization`
      // to refuse an undefined record on its SHAPE ("version is required"),
      // which is a refusal for the wrong reason: it reports a malformed record
      // where none was composed, and it would keep passing a mutation that
      // deleted the mandatory occasion outright. Asserted against the act's
      // own wording, so the no-skip property has an exercised trial of its own.
      if (!/no specialization record/.test(bare.error)) fails.push("(k) the absent record refuses on the record's SHAPE rather than on the ACT — the mandatory occasion is asserted by nothing, and deleting it would not fail this check");
      if (!/judgment/i.test(bare.error)) fails.push("(k) the no-record refusal does not say the missing thing is a JUDGMENT");
      if (!/--specialization/.test(bare.error)) fails.push("(k) the no-record refusal does not name the input that discharges it");
      if (bare.doc) fails.push("(k) the no-record refusal still produced a document");
    }
    // THE VOCABULARY IS READ FROM THE CARRIER, never restated in three
    // places. If this check enumerated the values itself, amending
    // src/specialization-schema.json would silently stop being an amendment.
    const sch = JSON.parse(readFileSync("src/specialization-schema.json", "utf8"));
    if (!sch.vocabulary.closed) fails.push("(k) the specialization vocabulary is not declared closed");
    if (JSON.stringify(sch.vocabulary.passing) !== JSON.stringify(["consistent"]))
      fails.push("(k) more than one verdict value passes — a non-answer that passes is a skip with a record attached");
    for (const v of sch.vocabulary.values) {
      const rec = spec(candB);
      rec.verdicts[0].verdict = v;
      const r = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: rec });
      const shouldPass = sch.vocabulary.passing.includes(v);
      if (shouldPass && r.error) fails.push(`(k) the passing verdict ${v} was refused: ${r.error}`);
      if (!shouldPass) {
        if (!r.error) fails.push(`(k) the verdict ${v} was ADOPTED — only ${sch.vocabulary.passing.join(", ")} passes`);
        else {
          if (!r.error.includes("t1")) fails.push(`(k) the ${v} refusal does not NAME the failing Step`);
          if (!r.error.includes(rec.verdicts[0].why)) fails.push(`(k) the ${v} refusal does not QUOTE the sentence the judging sitting wrote — it paraphrases a judgment it did not make`);
          if (!r.error.includes(v)) fails.push(`(k) the ${v} refusal does not say WHICH verdict it refuses on — contradicts and cannot-determine need different repairs`);
          if (r.doc) fails.push(`(k) the ${v} refusal still produced a document`);
        }
      }
    }
    const outside = spec(candB); outside.verdicts[0].verdict = "probably-fine";
    const o = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: outside });
    if (!o.error || !/closed/.test(o.error)) fails.push("(k) a verdict outside the closed vocabulary was accepted");
    // ONE PER STEP, EXACTLY, IN BOTH DIRECTIONS — a short list is the skip
    // this occasion exists to prevent, one Step at a time; a long one means
    // the record judges a path other than the one being adopted.
    const short = spec(candB); short.verdicts = [short.verdicts[0]];
    const sh = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: short });
    if (!sh.error || !/t2/.test(sh.error)) fails.push("(k) a record judging only some Steps was accepted — the occasion is skippable one Step at a time");
    const long = spec(candB); long.verdicts.push({ step_id: "t9", move: "worked-example", verdict: "consistent", why: "a step that is not in this path at all" });
    const lo = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: long });
    if (!lo.error || !/t9/.test(lo.error)) fails.push("(k) a record carrying a verdict for a Step outside the adopted path was accepted");
    const dup = spec(candB); dup.verdicts.push({ ...dup.verdicts[0] });
    const du = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: dup });
    if (!du.error || !/two verdicts/.test(du.error)) fails.push("(k) two verdicts for one Step were accepted — the second can disagree with the first");
    // THE RECORD IS BOUND TO WHAT IT JUDGES, on both axes. Without the
    // candidate binding a sitting judges the Candidate it likes and adopts the
    // one it wants; without the move binding the verdict certifies a
    // relationship that is not the one in the Step.
    const wrongCand = spec(candB); wrongCand.candidate_id = "cand-1";
    const wc = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: wrongCand });
    if (!wc.error || !/cand-1/.test(wc.error)) fails.push("(k) a record judging ANOTHER Candidate certified this one");
    const wrongMove = spec(candB); wrongMove.verdicts[0].move = "worked-example";
    const wm = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: wrongMove });
    if (!wm.error || !/worked-example/.test(wm.error)) fails.push("(k) a verdict naming a Move the Step does not bind certified the Step");
    // A one-word `why` is not the sentence a refusal hands back.
    const thin = spec(candB); thin.verdicts[0].why = "fine";
    const th = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: thin });
    if (!th.error || !/why is/.test(th.error)) fails.push("(k) a one-word why was accepted as the sentence a refusal quotes");
    const ver = spec(candB); ver.version = "2";
    const vr = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: ver });
    if (!vr.error || !/version/.test(vr.error)) fails.push("(k) a record written to another version of the carrier was read anyway");
    // DETERMINISTIC, AND IN THE PATH'S OWN ORDER: with both Steps failing, the
    // refusal names the FIRST. A refusal that named an arbitrary one would
    // send two sittings to two different repairs for one record.
    const both = spec(candB);
    both.verdicts[0].verdict = "contradicts"; both.verdicts[1].verdict = "contradicts";
    const bo = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: both });
    if (!bo.error || !/step t1:/.test(bo.error)) fails.push("(k) with two failing Steps the refusal does not name the FIRST in path order");
  }


  // (m) §4.13 — THE READER-KNOWLEDGE LEDGER, and §4.13.1's exemplar predicate
  // (kogaki#751). Both are SHAPE and DERIVATION only: whether a term is really
  // introduced here, whether its anchor explains it, and whether an excerpt is
  // the right passage are judgments (§4.6 clause 3), and nothing below reads
  // meaning.
  {
    // THE FIELD IS OPTIONAL, and that is asserted first: every existing Step
    // carries no `introduces`, so a requirement would have refused the whole
    // suite above rather than adding a field to it.
    if (validateSteps([step1, step2]).error) fails.push("(m) introduces was made REQUIRED — every Step composed before §4.13 carries none");
    const ok = validateSteps([{ ...step1, introduces: ["opacity — what a state conceals about its capabilities", "deterrence"] }]);
    if (ok.error) fails.push(`(m) a conforming introduces was refused: ${ok.error}`);

    // THE ENTRY GRAMMAR, both forms, and each refusal naming the STEP.
    const bare = parseIntroducesEntry("deterrence");
    if (bare.term !== "deterrence" || bare.anchor !== null) fails.push("(m) a bare term did not parse as a term with no anchor");
    const anchored = parseIntroducesEntry("opacity — what a state conceals");
    if (anchored.term !== "opacity" || anchored.anchor !== "what a state conceals") fails.push("(m) an anchored entry did not split into term and anchor");
    // A term may CONTAIN a comma, and its anchor almost always does — the
    // reason the serialization is one line per entry rather than a joined
    // list. Asserted so a later edit cannot "simplify" it back to a join.
    const commas = parseIntroducesEntry("the security dilemma — where one state's defences, however defensive, read as threats");
    if (commas.term !== "the security dilemma" || !commas.anchor.includes(",")) fails.push("(m) an anchor carrying commas did not survive the entry grammar — a comma-joined field could not round-trip");

    for (const [label, value, needle] of [
      ["a non-array", "deterrence", "array of entries"],
      ["a non-string entry", [42], "non-string entry"],
      ["an empty entry", [""], "empty entry"],
      ["a dangling separator", ["opacity — "], "no meaning anchor"],
      ["an anchor with no term", ["— what a state conceals"], "no term"],
      ["a duplicate term", ["opacity", "Opacity"], "twice"],
    ]) {
      const r = validateSteps([{ ...step1, introduces: value }]);
      if (!r.error) fails.push(`(m) ${label} was accepted as an introduces value`);
      else {
        if (!r.error.includes(needle)) fails.push(`(m) the refusal for ${label} does not say why — expected it to name ${JSON.stringify(needle)}`);
        if (!/s1/.test(r.error)) fails.push(`(m) the refusal for ${label} does not NAME the Step (acceptance: a malformed entry refuses naming the Step)`);
      }
    }

    // THE DERIVATION — the union of 1..N-1, snapshot taken BEFORE the Step's
    // own entries, so a Step never already knows what it introduces.
    const path = [
      { step_id: "p1", introduces: ["opacity — what a state conceals"] },
      { step_id: "p2", introduces: ["deterrence"] },
      { step_id: "p3" },
    ];
    const led = readerKnowledgeLedger(path);
    if (led.length !== 3) fails.push("(m) the ledger does not carry one row per Step");
    if (led[0].reader_already_knows.length !== 0) fails.push("(m) the first Step arrives already knowing something — the snapshot is taken after its own entries");
    if (led[1].reader_already_knows.map((k) => k.term).join() !== "opacity") fails.push("(m) step 2 does not know exactly what step 1 introduced");
    if (led[2].reader_already_knows.map((k) => k.term).sort().join() !== "deterrence,opacity") fails.push("(m) the accumulation is not the UNION of every earlier Step");
    if (led[1].reader_already_knows[0].anchor !== "what a state conceals") fails.push("(m) the anchor does not travel with the term into the ledger");
    if (led[1].reader_already_knows[0].introduced_by !== "p1") fails.push("(m) the ledger does not carry WHICH Step introduced the term — the addressability the field exists for");

    // A PATH THAT INTRODUCES NOTHING RENDERS AN EMPTY LEDGER, NOT AN ERROR
    // (acceptance). This is the case every Brief in the tree is in today.
    const none = readerKnowledgeLedger([{ step_id: "n1" }, { step_id: "n2" }]);
    if (none.length !== 2) fails.push("(m) a path with no introduces produced no ledger rows");
    if (none.some((r) => r.reader_already_knows.length !== 0)) fails.push("(m) a path introducing nothing derived a non-empty ledger");

    // FIRST INTRODUCER WINS, and responsibility for an UNINTRODUCED term is
    // the Brief's — a null that is the point of the function, not an error.
    // THREE Steps, not two, and the third is what makes the assertion below
    // possible: a re-declaration folds in AFTER its own row's snapshot, so on
    // a two-Step path the only row that could show the difference does not
    // exist and a last-introducer-wins mutation passes silently. Found by
    // running exactly that mutation.
    const twice = [{ step_id: "t1", introduces: ["x"] }, { step_id: "t2", introduces: ["x"] }, { step_id: "t3" }];
    if (introducerOf("x", twice) !== "t1") fails.push("(m) responsibility for a twice-declared term does not trace to the FIRST Step");
    if (introducerOf("X", twice) !== "t1") fails.push("(m) introducer lookup is case-sensitive — the same term in two casings is one term everywhere else");
    if (introducerOf("unheard-of", twice) !== null) fails.push("(m) an unintroduced term does not trace to the Brief — the null case is the ledger's answer, never an error");
    const twiceLed = readerKnowledgeLedger(twice);
    if (twiceLed[2].reader_already_knows.length !== 1) fails.push("(m) a term declared by two Steps appears twice in the ledger — it is one term the reader met once");
    if (twiceLed[2].reader_already_knows[0].introduced_by !== "t1") fails.push("(m) a re-declaration MOVED responsibility instead of leaving it at the first Step — a later question about the term would resolve to the wrong Step");

    // THE ROUND TRIP. renderStep writes one line per entry and parseBrief
    // reads them back; the two are asserted TOGETHER because a writer and a
    // reader that disagree fail silently at exactly this field.
    const rendered = renderStep({ ...step1, introduces: ["opacity — what a state conceals, in practice", "deterrence"] });
    const lines = rendered.split("\n").filter((l) => l.startsWith("introduces:"));
    if (lines.length !== 2) fails.push(`(m) renderStep wrote ${lines.length} introduces line(s) for two entries — a joined field cannot be parsed back`);
    if (!lines[0].includes("opacity — what a state conceals, in practice")) fails.push("(m) the entry did not survive serialization intact");

    // §4.13.1 — THE EXEMPLAR PREDICATE, over the `excerpt` field (owner ruling
    // 2026-09-02: the excerpt is the author's own account of the reader
    // movement, never a verbatim quotation, and the field the records already
    // carried under the name `sources` WAS that account). A record whose
    // excerpt carries text is an exemplar; an empty one is not, and the block
    // STATES the absence rather than substituting anything.
    const acct = `Observed in "An Article." The passage first establishes X,\n  then shows the reader that Y follows.`;
    if (!isExemplar(acct)) fails.push("(m) a record carrying an author's account of the reader movement was refused as an exemplar — the excerpt is that account, not a quotation");
    if (moveExcerpt(acct).excerpt !== `Observed in "An Article." The passage first establishes X,\nthen shows the reader that Y follows.`) fails.push("(m) the excerpt did not read back as authored, with the folded scalar's margin removed and nothing else touched");
    // A VERBATIM-LOOKING excerpt is neither required nor privileged: the old
    // `Excerpt:` marker is plain text now, and a record carrying it is an
    // exemplar because it carries an account, not because of the marker.
    const marked = `Excerpt: "the passage, verbatim"`;
    if (!isExemplar(marked)) fails.push("(m) a record whose excerpt happens to contain the retired marker was refused — the marker is text, and the predicate reads presence of an account only");
    if (moveExcerpt(marked).excerpt !== marked) fails.push("(m) the retired marker was PARSED rather than read as text — a quotation is not a privileged form of excerpt");
    // AN EMPTY EXCERPT is the one absence: it claims a field and supplies no
    // account, so the block says so and names the repairing act.
    for (const [label, empty] of [["an empty string", ""], ["whitespace only", "  \n  "], ["a non-string", undefined]]) {
      const r = moveExcerpt(empty);
      if (r.excerpt !== null) fails.push(`(m) ${label} was admitted as an exemplar`);
      if (!/empty/.test(r.absence || "")) fails.push(`(m) the absence for ${label} does not say the excerpt is empty`);
    }
    const block = renderExcerptBlock("some_move", "");
    if (!/NONE/.test(block)) fails.push("(m) the Packet's excerpt block does not STATE the absence");
    if (!/some_move/.test(block)) fails.push("(m) the stated absence does not name the Move it is about");
    if (!/move-extraction-contract/.test(block)) fails.push("(m) the stated absence does not name the act that repairs it");
    const full = renderExcerptBlock("some_move", acct);
    if (!/^exemplar \(some_move\):\n/.test(full) || !/then shows the reader/.test(full)) fails.push("(m) the Packet's excerpt block does not render the author's account under the Move's name");

    // THE LIBRARY AS IT STANDS, read rather than asserted. Every record
    // carries an excerpt today (the rename at kogaki#751 made the field's
    // content what it always was), and the count is still DISCLOSED rather
    // than asserted, for the reason below.
    const store = loadMoveIds("moves");
    if (store.error) fails.push(`(m) the repository's Move library could not be read: ${store.error}`);
    else {
      let exemplars = 0;
      for (const id of store.ids) {
        const txt = readFileSync(`moves/${id}.md`, "utf8");
        const src = (txt.split(/^excerpt:[ \t]*>-?[ \t]*$/m)[1] || "");
        if (isExemplar(src)) exemplars++;
        if (/^sources:/m.test(txt)) fails.push(`(m) moves/${id}.md carries a \`sources\` field — the field is \`excerpt\` (kogaki#751, 2026-09-02), and a surviving \`sources\` beside it is the design error the rename exists to remove`);
      }
      // DISCLOSED, NEVER ASSERTED. The first form of this line failed when
      // the count moved off zero — which is to say it went red exactly when
      // the re-extraction this predicate exists to enable was performed. A
      // check anti-correlated with its own need "is worse than no check,
      // because its silence reads as a clean result"
      // (product-lab topics/archive/claude-code-ops.md:24). The count is
      // rendered instead, so a reader sees the library's state move without
      // the suite obstructing the move.
      exemplarLine = `${exemplars} of ${store.ids.size} Move record(s) carry an excerpt and can serve as exemplars`;
    }
  }

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

  // (j) PLAIN-REGISTER RENDERING and its deny tripwire (kogaki#520, reshaped
  // at kogaki#568): the owner reads `rendering` — one PROSE PARAGRAPH per
  // evidence item, its plain question first and the record's own prose after — and the internal keys stay in `evidence`,
  // which nothing shows. The tripwire REFUSES a rendering that carries
  // spec-internal vocabulary anyway, naming what leaked; it never rewrites.
  const INTERNAL = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/;
  const plain = assembleSelection({ candidates: [candA, candB] }, doc0);
  if (plain.error) fails.push(`(j) a plain-register Candidate set was refused: ${plain.error}`);
  for (const o of (plain.payload?.options || []).filter((x) => !x.negates_premise)) {
    const rend = o.rendering;
    // Derived from EVIDENCE_LABELS rather than a literal: the count moved
    // from 6 to 9 when v12 added the three reader fields, and a literal here
    // would have to be found and edited every time the evidence set grows,
    // which is the edit a reader is most likely to make wrongly.
    if (!Array.isArray(rend) || rend.length !== EVIDENCE_LABELS.length + REVIEW_AREAS.length) {
      fails.push(`(j) option ${o.id} carries no rendering of the expected size — one prose paragraph per evidence item and per review area`);
      continue;
    }
    // EACH ENTRY IS ONE PROSE PARAGRAPH (kogaki#568). The entries were
    // {label, text} pairs, which display as a field list however plain the
    // labels read — kogaki#520 fixed the WORDS and left the SHAPE, and §5.1.3
    // (v20, kogaki#566) governs the shape too. The label/text assertions are
    // RE-POINTED rather than deleted: same properties, read off the paragraph.
    for (const item of rend) {
      if (typeof item !== "string" || item.trim() === "") {
        fails.push(`(j) option ${o.id} has a rendering entry that is not a non-empty prose paragraph — the owner-facing half is prose, never a field (§5.1.3)`);
        continue;
      }
      if (INTERNAL.test(item)) fails.push(`(j) option ${o.id}'s rendering reads an internal key: ${item.slice(0, 60)}`);
    }
    // NOTHING IS DROPPED IN THE RESHAPING: every plain question that had a
    // label still opens a paragraph, and each opens exactly one. This is the
    // distinctness assertion the label-set test used to carry, re-pointed —
    // two items collapsing into one paragraph is the loss a count alone would
    // miss, because the count is asserted against the same source lists above.
    const questions = [...EVIDENCE_LABELS.map(([, l]) => l), ...REVIEW_AREAS.map((a) => REVIEW_LABELS[a])];
    for (const q of questions) {
      const carriers = rend.filter((r) => typeof r === "string" && r.startsWith(q));
      if (carriers.length !== 1) {
        fails.push(`(j) option ${o.id} opens ${carriers.length} paragraph(s) with ${JSON.stringify(q)} — every item reaches the owner, exactly once`);
      }
    }
    // Located BY ITS QUESTION rather than by index: this assertion read rend[2]
    // until v12 prepended three reader items and silently moved it to five.
    // A positional probe over a growing list tests whichever item happens to
    // sit there, which is not the assertion anyone wrote.
    const tcLabel = EVIDENCE_LABELS.find(([k]) => k === "thesis_closure")[1];
    const tc = rend.find((r) => typeof r === "string" && r.startsWith(tcLabel));
    if (!tc) fails.push(`(j) the Thesis-closure item does not open a paragraph with its plain question`);
    // the rendering is the RECORD's own prose, not a second source
    else if (tc !== `${tcLabel} ${o.evidence.thesis_closure}`) fails.push(`(j) option ${o.id}'s rendering restates the evidence instead of carrying it`);
    // the internal keys survive IN THE RECORD
    for (const k of ["reader_start", "reader_target", "opening_question", "step_validity", "transition_continuity", "thesis_closure", "obligations_ledger", "placement_count", "journey_coverage"]) {
      if (typeof o.evidence?.[k] !== "string") fails.push(`(j) the record lost internal key ${k} — the keys stay in the payload, only the rendering changes`);
    }
  }
  // ---- (l) THE THREE READER FIELDS (§5.1 v12, kogaki#521, story 1.77):
  // authored at PATH COMPOSITION per Candidate, riding the EXISTING gate,
  // landing at adoption, and REFUSING by name when unauthored. ----
  {
    // AC1 — the axis is real: cand-1 and cand-2 carry DIFFERENT values, and
    // the difference survives to the gate. A per-Brief fill would make these
    // identical, which is the direct evidence that the fill pass was the
    // wrong site.
    const rp = assembleSelection({ candidates: [candA, candB] }, doc0);
    if (rp.error) fails.push(`(l) a Candidate set carrying the reader fields was refused: ${rp.error}`);
    const opts = (rp.payload?.options || []).filter((x) => !x.negates_premise);
    for (const [key] of READER_FIELDS) {
      const seen = opts.map((o) => o.evidence?.[key]);
      if (seen.some((v) => typeof v !== "string" || v === "")) {
        fails.push(`(l) an option carries no ${key} — path composition writes it per Candidate`);
      } else if (new Set(seen).size !== seen.length) {
        fails.push(`(l) two Candidates read IDENTICALLY on ${key} — the reader axis is not per-Candidate`);
      }
    }
    // AC2 — they ride the EXISTING gate: same payload id, no second payload.
    if (rp.payload?.id !== "brief-candidate-selection-payload") {
      fails.push("(l) the reader fields did not ride the existing Candidate-selection payload — §5.1.1 owes no new gate");
    }
    // AC3 — each renders under a plain label carrying the record's own prose.
    // (j)'s loop already refuses an internal key in any label; this asserts
    // the three are PRESENT and carry the record rather than a restatement.
    for (const o of opts) {
      for (const [key] of READER_FIELDS) {
        // RE-POINTED AT THE PARAGRAPH SHAPE (kogaki#568), not relaxed: the same
        // two properties — the item is PRESENT under its plain question, and it
        // CARRIES the record rather than restating it — read off a paragraph
        // instead of a {label, text} pair.
        const label = EVIDENCE_LABELS.find(([k]) => k === key)[1];
        const item = (o.rendering || []).find((r) => typeof r === "string" && r.startsWith(label));
        if (!item) fails.push(`(l) option ${o.id} does not open a paragraph with ${key}'s plain question`);
        else if (item !== `${label} ${o.evidence[key]}`) fails.push(`(l) option ${o.id}'s ${key} rendering restates the record instead of carrying it`);
      }
    }
    // AC4 — adoption lands all three, from the ADOPTED Candidate.
    const adr = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", inst(candB));
    if (adr.error) fails.push(`(l) adopting a complete Candidate was refused: ${adr.error}`);
    else {
      for (const [key, heading] of READER_FIELDS) {
        const body = (adr.doc.split(`## ${heading}`)[1] || "").split("\n## ")[0];
        if (!body.includes(candB[key])) fails.push(`(l) ${heading} did not fill from the adopted Candidate`);
        if (body.includes(candA[key])) fails.push(`(l) ${heading} carries the DECLINED Candidate's value`);
        if (body.includes("(awaiting composition)")) fails.push(`(l) ${heading} is still a typed unfilled slot after adoption`);
      }
    }
    // AC5 — an unauthored field REFUSES at adoption, NAMING it, writing
    // nothing; and the refusal is distinguishable from the unoffered-Candidate
    // refusal, so a caller is never sent to re-answer the wrong gate.
    for (const [key, heading] of READER_FIELDS) {
      const maimed = { ...candB }; delete maimed[key];
      const bad = adoptCandidate(doc0, { candidates: [candA, maimed] }, "cand-2");
      if (!bad.error) fails.push(`(l) adoption ACCEPTED a Candidate with no ${key} — the composing act did not run and nothing refused`);
      else {
        if (!bad.error.includes(heading)) fails.push(`(l) the refusal for a missing ${key} does not NAME the field`);
        if (bad.doc) fails.push(`(l) the refusal for a missing ${key} still produced a document`);
        if (/is not in the reviewed set/.test(bad.error)) fails.push(`(l) the unauthored-field refusal is worded as the unoffered-Candidate refusal — two different problems, one message`);
      }
      // an EMPTY STRING is the same absence as a missing key.
      // PASSES A CONFORMING INSTANTIATION (PR #774 round 1): without it these
      // three calls refuse on §4.12's absent-record guard before the
      // reader-field guard is reached, and since they assert only that SOME
      // error came back, deleting the empty-string-is-absence guard would
      // leave them green. The sibling missing-key cases keep their
      // discrimination on their own — they assert the heading is NAMED — so
      // only this direction had lost it. Same two-guards-one-property class
      // this change's own mutation pass found twice; found a third time here,
      // by the reviewer, in a case this change did not write but did disarm.
      const empty = adoptCandidate(doc0, { candidates: [candA, { ...candB, [key]: "" }] }, "cand-2", inst(candB));
      if (!empty.error) fails.push(`(l) adoption ACCEPTED an empty ${key} — an empty value is an unauthored one`);
      else if (!empty.error.includes(heading)) fails.push(`(l) the empty-${key} refusal does not NAME the field — it refused for some other reason, so this case would stay green with the empty-value guard deleted`);
    }
    // AC5b — the refusal names ALL unauthored fields, not merely the first:
    // a caller told about one field at a time re-runs composition per field.
    const none = { ...candB };
    for (const [key] of READER_FIELDS) delete none[key];
    const allBad = adoptCandidate(doc0, { candidates: [candA, none] }, "cand-2");
    for (const [, heading] of READER_FIELDS) {
      if (!allBad.error?.includes(heading)) fails.push(`(l) a Candidate missing all three does not name ${heading} in its refusal`);
    }
  }

  // no owner-facing string in the whole payload carries an internal key or a
  // section reference — the ask's own fields included
  const ownerFacing = [plain.payload?.where, plain.payload?.why, plain.payload?.label,
    plain.payload?.free_text?.prompt,
    // THE ENTRIES THEMSELVES, never their retired fields (PR #576 round 1). This
    // read `[r.label, r.text]`, and after kogaki#568 every entry is a string —
    // both were `undefined`, the loop below skipped them, and the SECTION-
    // REFERENCE half of this independent belt went vacuous while the pass line
    // still claimed it. The internal-key half survived at the per-item loop
    // above, which is exactly what made the loss invisible. Flattening the
    // entries covers both shapes: a string rides as itself, a pair contributes
    // its two fields.
    ...(plain.payload?.options || []).flatMap((o) => [o.label,
      ...(o.rendering || []).flatMap((r) => (typeof r === "string" ? [r] : [r?.label, r?.text]))])];
  for (const t of ownerFacing) {
    if (typeof t === "string" && INTERNAL.test(t)) fails.push(`(j) an owner-facing string carries an internal key: ${JSON.stringify(t)}`);
    if (typeof t === "string" && /§\s*\d/.test(t)) fails.push(`(j) an owner-facing string carries a section reference: ${JSON.stringify(t)}`);
  }
  // TWO CANDIDATES DIFFERING ONLY IN CASE ARE ONE CANDIDATE (PR #576 round 1).
  // REPORTED UNDER (e), NOT (j) (PR #576 round 2): the property is assembly's
  // refusal about a reader experience, whose twin sits in (e)'s block; the code
  // is here only because candA/candB/doc0 are in scope. Scope-driven siting is
  // fine; a failure string a reader greps by case is not.
  // Since kogaki#568 the option LABEL is the reader experience, so this
  // refusal is what keeps two labels distinguishable — and the retired
  // `Adopt <id> — …` prefix used to carry that by the id whatever the prose
  // did. An exact-string key admitted two experiences differing only in case
  // or surrounding space, which is two labels an owner cannot tell apart.
  {
    const cased = { ...JSON.parse(JSON.stringify(candB)), candidate_id: "cand-3",
      reader_experience: `  ${String(candA.reader_experience).toUpperCase()}  ` };
    const r = assembleSelection({ candidates: [candA, cased] }, doc0);
    if (!r.error || !/SAME reader experience/.test(r.error)) {
      fails.push("(e) two Candidates whose reader experience differs only in case were accepted — two option labels the owner cannot tell apart (PR #576 round 1; sited in (j)'s block for its fixtures, reported under (e) because the property is assembly's refusal about a reader experience — its twin is above)");
    }
  }

  // THE TRIPWIRE FIRES, and names what leaked
  const leakCand = JSON.parse(JSON.stringify(candB));
  leakCand.reasoning.thesis_closure = "the final step discharges thesis_closure for the reader";
  const leaked = assembleSelection({ candidates: [candA, leakCand] }, doc0);
  if (!leaked.error) fails.push("(j) a rendering carrying an internal key was presented to the owner — the tripwire did not fire");
  else {
    if (!/thesis_closure/.test(leaked.error)) fails.push("(j) the tripwire refused without NAMING what leaked");
    if (leaked.payload) fails.push("(j) the tripwire produced a payload anyway — a deny, never a rewrite layer");
  }
  const secCand = JSON.parse(JSON.stringify(candB));
  secCand.reasoning.step_validity = "each step's grounds were traced, as §4.4 requires";
  const secLeak = assembleSelection({ candidates: [candA, secCand] }, doc0);
  if (!secLeak.error || !/section reference/.test(secLeak.error)) fails.push("(j) a section reference reached the owner-facing rendering — the tripwire did not fire");
  // the deny reads the RENDERING, not the record: it is not a lint on any
  // composition MUST (§4.6 clause 3 stands) — a clean rendering passes with
  // the internal keys still present in the record, asserted above.
  const denyClean = denyInternalVocabulary(plain.payload || {});
  if (denyClean.error) fails.push(`(j) the tripwire refused a clean rendering: ${denyClean.error}`);

} finally {
  rmSync(dir, { recursive: true, force: true });
}

// (k) A COMPOSED BODY IS WRITTEN LITERALLY (kogaki#539). `replaceSlot` is the
// shared writer for every filled slot, and it used to pass its body to
// `String.prototype.replace` as a REPLACEMENT STRING — where `$&`, `` $` ``,
// `$'` and `$<name>` are substitution patterns rather than text. A composed
// `reader_start` of `costs $& twice` reached the owner's Brief as
// `costs ## Reader start`, silently: nothing refused, warned, or recorded that
// a substitution had happened.
//
// EVERY SHAPE, not a sample. The old form corrupted `$&`, `` $` `` and `$'`
// while leaving `$1` and `$<name>` alone — `$1` only because this regex has no
// capture groups, which is a property of the pattern and not a guarantee. A
// case exercising one shape would have passed against the defect.
{
  const doc = "## Reader start\n\n*(awaiting composition)*\n";
  const bodies = [
    ["plain", "plain text with no dollar"],
    ["whole-match", "costs $& twice"],
    ["prefix", "$` before"],
    ["suffix", "tail $' here"],
    ["group", "group $1 here"],
    ["named", "named $<x> here"],
  ];
  for (const [what, body] of bodies) {
    const r = replaceSlot(doc, "Reader start", body);
    if (r.error) { fails.push(`(k) filling a slot with a ${what} body was refused: ${r.error}`); continue; }
    const written = (r.doc || "").split("\n")[2];
    if (written !== body) {
      fails.push(`(k) a ${what} body was REINTERPRETED on its way into the Brief: wrote ${JSON.stringify(written)} for ${JSON.stringify(body)} — the writer takes substitution patterns (kogaki#539)`);
    }
  }
  // The fix is the REPLACER FUNCTION rather than an escape of `$` in the body,
  // because an escape is a denial list over a syntax that grew once already
  // (`$<name>`). WHAT THE NEXT ASSERTION ESTABLISHES, precisely: that the
  // replacer-function form is present. It does NOT establish that no escaping
  // happens anywhere — an implementation could use the function form AND escape
  // the body, and this would pass. The behavioural cases above are what carry
  // the property; this reads the shape so that a body-escaping implementation
  // covering only today's patterns cannot satisfy them by accident.
  const src = readFileSync("src/compose.mjs", "utf8");
  if (!/doc\.replace\(re, \(\) =>/.test(src)) {
    fails.push("(k) replaceSlot does not use a replacer function — a replacement string reinterprets the body, and escaping enumerates patterns instead of removing the possibility");
  }
}

// Boundary 1 (Check/CI infrastructure) — surveyed before writing these cases.
// The two headlines that ground them, quoted at their pins:
//
//   "To catch such a problem you need a measurement that does not absorb it —
//   a stated limit that gets checked, or a deliberately weak tester whose
//   failure is the signal."
//   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:29
//
//   "Write down each path and which passing run covers it; a path with no
//   named run is untested no matter how healthy the overall suite looks."
//   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:173
//
// The first names round 1's finding 2 exactly: case (l) absorbed a dead branch
// and read as clean. The second is why the paths are enumerated below with the
// run that covers each, rather than counted.
//
// PATHS AND THEIR COVERING RUNS
//   no bridge ............... (l) case "none"
//   entailment reasoning .... (l) case "entailment reasoning"
//   declared assumption ..... (l) case "declared assumption" — the §4.4 TOKEN
//   neither flag ............ (l) case "no reasoning"
//   per-Candidate ........... (l) the a !== b comparison
//   plain label ............. (l) the EVIDENCE_LABELS lookup
//   field admission ......... (l2), four refused shapes
//   serialization ........... (l3)
//
// (l) BRIDGE DISCLOSURE RIDES THE EXISTING GATE (§4.11 v16, kogaki#524).
// Approval is POST-HOC — no per-Bridge question — so the one gate that exists
// must carry what was inserted and why, per Candidate.
//
// EVERY fixture here is admitted by validateSteps FIRST. Round 1 of PR #546
// found why: the declared-assumption case was built with `type: "assumption"`,
// which §4.4's closed list refuses, so the assertion passed over a Step shape
// the runtime cannot admit and the branch it claimed to cover was dead
// (kogaki#209 — a fixture whose only demonstrated failure mode is the code's
// total absence).
{
  const S = (id, extra = {}) => ({
    step_id: id, move: "m", materials: ["L1"], purpose: "p", reader_state_before: "b",
    reader_state_after: "a", depends_on: [], rationale: "r",
    grounds: [{ type: "strand", strand: "L1", proposition: "the strand says so" }],
    ...extra,
  });
  const admit = (steps, what) => {
    const v = validateSteps(steps);
    if (v.error) fails.push(`(l) the ${what} fixture is not an admissible path — it would assert over a shape the runtime refuses: ${v.error}`);
    return steps;
  };
  const cases = [
    ["none", [S("s1")], /no gaps were bridged/],
    ["entailment reasoning",
      [S("s1"), S("b1", { bridges: ["s1", "s2"], entailed: true, entailment_reasoning: "the case generalises" }), S("s2")],
      /between s1 → s2: the case generalises/],
    // The §4.4 TOKEN, not a plausible synonym — this is finding 1's fixture.
    ["declared assumption",
      [S("a"), S("c"), S("b", { bridges: ["a", "c"], grounds: [{ type: "reader_assumption", proposition: "readers have shipped software" }] })],
      /readers have shipped software/],
    // A bridge carrying NEITHER flag is abnormal and must SAY so rather than
    // render an empty reason — §4.4 gives every Step those flags, so a bridge
    // without one is a composition fault the gate is owed.
    ["no reasoning", [S("a"), S("c"), S("b", { bridges: ["a", "c"] })], /NO REASONING CARRIED/],
  ];
  for (const [what, steps, want] of cases) {
    admit(steps, what);
    const ev = candidateEvidence({ steps, obligations: [] }, [], []);
    if (typeof ev.bridges !== "string" || !want.test(ev.bridges)) {
      fails.push(`(l) the ${what} case does not render its bridge disclosure: ${JSON.stringify(ev.bridges)}`);
    }
  }
  // PER CANDIDATE, not per Brief: two Candidates bridging differently must not
  // read identically, the same property journey_coverage already has.
  const a = candidateEvidence({ steps: cases[1][1], obligations: [] }, [], []).bridges;
  const b = candidateEvidence({ steps: cases[0][1], obligations: [] }, [], []).bridges;
  if (a === b) fails.push("(l) a bridged Candidate and an unbridged one read identically — the disclosure is not per-Candidate");
  // It rides the EXISTING gate: a plain label, no new gate row. The SHARED
  // predicate (kogaki#526), not a re-derived regex: one definition, every
  // owner surface.
  const lbl = EVIDENCE_LABELS.find(([k]) => k === "bridges");
  if (!lbl) fails.push("(l) `bridges` has no plain label — it would reach the owner under its internal key (kogaki#520)");
  else if (findInternalVocabulary(lbl[1])) fails.push(`(l) the bridge label reads an internal key: ${lbl[1]}`);

  // (l2) THE FIELD IS ADMITTED AND BOUNDED (#546 round 1, finding 3). §4.11
  // recognises a Bridge Step by this field, so §4.1 admits it and validateSteps
  // bounds it — an unvalidated marking renders `between :` at an owner surface.
  for (const [bad, what] of [[[], "empty"], [["only-one"], "single"], [true, "non-array"], [["a", "c", "d"], "three-id"]]) {
    if (!validateSteps([S("a"), S("c"), S("b", { bridges: bad })]).error) {
      fails.push(`(l2) a ${what} bridges value is admitted — the gate would disclose a pair that was never named`);
    }
  }
  // (l3) IT SURVIVES SERIALIZATION (#546 round 1, finding 4). Post-hoc
  // disclosure is the WHOLE approval shape, so a Brief re-read from its
  // recorded form must still say what was bridged.
  if (!/^bridges: a, c$/m.test(renderStep(S("b", { bridges: ["a", "c"] })))) {
    fails.push("(l3) renderStep drops `bridges` — a Brief re-read from its recorded form discloses no bridge at all");
  }
}

if (fails.length) {
  console.log("FAIL brief compose (SPEC-draft-pipeline §§4.1/4.4/5.1-5.2, story 1.73):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`brief compose: library state — ${exemplarLine} (§4.13.1, disclosed and never asserted: a count that failed when it MOVED would go red exactly when a record is authored or retired)`);
console.log("brief compose: 13/13 cases — (a) §4.1 Step shape refused per missing field, the "
  + "closed §4.4 ground types, entailed-without-reasoning refused, depends_on earlier-only, "
  + "a Move REQUIRED on every Step (§4.1 v18, kogaki#642 — the rider it supersedes read the other way); (b) the fill lands sequence, strand_coverage (used_by_steps "
  + "derived from the steps, role_in_thesis carried) and the §5.2 ledger with introduced_by/"
  + "discharged_by, an undischarged entry rendering as UNDISCHARGED, the structure section rendering "
  + "under its RATIFIED name Reader Path while the \u00a75.1 record field stays `sequence` (kogaki#574), "
  + "and a filled Reader Path "
  + "refusing overwrite; (c) the placement count runs AFTER composition counted in placements "
  + "— a declared cover is not believed, an unplaced Strand DISCLOSES and never refuses, a "
  + "foreign L-id refuses as a Brief fetch; (d) the retired `fill` CLI route refuses and names its replacement, with its dual-producer guard MOVED to (g) rather than dropped and the composer still "
  + "exported; (e) Candidate assembly refuses one or four Candidates, a duplicated reader experience "
  + "and a BLANK one (kogaki#578 \u2014 the option label IS that prose, so a whitespace-only value renders "
  + "as an option the owner cannot see), and the payload rides the proposal-contract shape — where/why, "
  + "effect-stating labels, the first-class none-of-these flagged negates_premise, an "
  + "unconditional free-text channel that states it does not discharge the negation, and "
  + "per-Candidate evidence carrying step validity, transition continuity, Thesis closure, "
  + "the ledger's state and the placement count from each Candidate's OWN steps; (f) the "
  + "adopted Candidate's Reader Path lands in the Brief's sequence with thesis_closure and "
  + "tradeoffs filled from its reasoning, a declined Candidate lands nowhere, and an "
  + "unoffered Candidate refuses; (g) both assemble and adopt-candidate command paths are "
  + "byte-equal to the exported functions; (k) THE STEP↔MOVE INSTANTIATION CONTRACT (§4.12, kogaki#747) at adoption, the "
  + "one write that lands a sequence in an existing Brief — MECHANICALLY, a move id resolving to no "
  + "Move library record refuses NAMING the Step and the id and writes nothing, an unreadable library "
  + "refuses as a STORE fault rather than blaming the composition, and a readable directory holding no "
  + "records is not a library; AS JUDGMENT, the specialization record is REQUIRED (its absence refuses at "
  + "the act, which is the same assertion that proves no verdict is composed here), one verdict per Step "
  + "exactly in both directions, bound to the adopted Candidate AND to the Move each Step binds, its "
  + "vocabulary READ FROM src/specialization-schema.json rather than restated, every non-passing value "
  + "refusing with the Step named and the judging sitting's own sentence QUOTED, and the refusal "
  + "deterministic in path order. Whether a specialization HOLDS is judged by the composing sitting and "
  + "never here: this member asserts the record's shape, its binding and the refusal, and composes no "
  + "verdict of its own — §4.6 clause 3 stands; (m) §4.13 THE READER-KNOWLEDGE LEDGER and §4.13.1's exemplar predicate "
  + "(kogaki#751) — `introduces` is OPTIONAL (asserted first: every Step composed before it carries none), "
  + "its entry grammar takes a bare term or `term — anchor` with an anchor free to contain commas (which is "
  + "why serialization is one LINE per entry and could not be a joined field), and six malformed shapes each "
  + "refuse NAMING the Step; the ledger DERIVES reader_already_knows as the union of Steps 1..N-1 with the "
  + "snapshot taken before a Step's own entries, carrying each term's anchor and its introducing Step, and a "
  + "path introducing nothing renders an EMPTY ledger rather than an error; responsibility traces to the FIRST "
  + "Step declaring a term and to the BRIEF (null) when none does, a re-declaration moving nothing; the "
  + "render/parse round trip is asserted at both ends. §4.13.1 (as amended 2026-09-02 — the field is `excerpt` and holds the author's account of the reader movement, never a verbatim quotation): a record carrying an account is an exemplar, the retired `Excerpt:` marker is read as plain text and confers nothing, an EMPTY excerpt is the one absence and is reported as such rather than as a short exemplar, the Packet's block STATES the absence naming the Move and the repairing act while SUBSTITUTING nothing, and a `sources` field surviving in any library record FAILS this member by name. Accumulation is computed and never stored. The "
  + "library's own exemplar count is DISCLOSED and never asserted — a count that failed when it moved would go "
  + "red exactly when the re-extraction is performed; (h) JOURNEY COVERAGE (§6.1 MUST 1) — journey "
  + "material is a distinct material carried as `<L-id>.journey`, its placement DERIVED from "
  + "the composed steps, placed rendering as placed and omitted rendering as OMITTED-disclosed "
  + "rather than refusing, a Journey claimed for a Strand whose record carries none refused BY "
  + "NAME as unsupported completion, a Journey outside the closed set refused as a Brief fetch, "
  + "and the no-Journey case vacuous rather than violated; (i) per-Candidate journey_coverage "
  + "rides the gate payload as EVIDENCE, so two Candidates differing on the journey axis do not "
  + "read identically, and it carries no verdict token; (j) PLAIN-REGISTER RENDERING "
  + "(kogaki#520) — every evidence item and every review area renders under one distinct plain "
  + "label carrying the record's own prose, no owner-facing string in the payload holds an "
  + "internal key or a section reference, the internal keys SURVIVE in `evidence` as the "
  + "record, and the deny tripwire refuses a rendering that carries either shape anyway, "
  + "NAMING what leaked and producing no payload — a deny, never a rewrite layer. The "
  + "tripwire reads REGISTER, never a composition MUST (§4.6 clause 3 stands). "
  + "MUTATION EVIDENCE (assert-by-breaking-once, stories 1.73 + 1.75 + 1.77 + kogaki#501 + kogaki#520 + kogaki#551 + kogaki#568 + kogaki#574 + kogaki#578 + kogaki#642): THIRTY-ONE "
  + "mutations. RE-DERIVED, not incremented: the enumeration below sums 3 + 3 + 6 + 4 + 3 + 2 = 21 for the "
  + "original groups, plus kogaki#568's four, plus PR #576 round 1's two, plus kogaki#574's two, plus kogaki#578's one, plus kogaki#642's one = 31. "
  + "kogaki#642's one, against the requirement that a Move is a Step's State component: restoring the optional test in "
  + "validateSteps — the v17 shape, `move` checked only when present — fails (a)'s a-step-without-a-Move assertion. The "
  + "assertion it fails is the INVERSION of the one that stood here, not a new sibling beside it: v17's (a) asserted that a "
  + "Move-less Step is ACCEPTED, so leaving it would have contradicted the amendment and deleting it would have left the "
  + "new requirement with no exercised trial. Recorded because an inverted assertion and a deleted one read identically at "
  + "a later head; and the re-derivation is written HERE, in the file, which is the correction the two preceding heads' "
  + "drift already earned. "
  + "THE PREVIOUS HEAD INCREMENTED AND LEFT THIS SENTENCE STANDING (PR #581 round 1): the headline moved "
  + "while the arithmetic under it still read \u002221, plus this head's six\u0022, which totals 27 and "
  + "named a head contributing two. That is exactly the drift this paragraph installs against, one "
  + "revision after kogaki#559 made re-counting the maintenance mode \u2014 recorded rather than quietly "
  + "corrected, because a maintenance note that has itself drifted is evidence about the mode and not "
  + "only about the number. "
  + "AND IT HAPPENED AGAIN AT THE NEXT HEAD (PR #584 round 1): the headline moved to THIRTY while this "
  + "sentence still summed to twenty-nine, kogaki#578's one enumerated below and never added. The failure "
  + "mode is NOT the one named above \u2014 the re-derivation WAS performed, and reached the commit message "
  + "and the pull request body rather than the file. Re-counting somewhere the next reader does not look "
  + "is indistinguishable, at the file, from not re-counting at all. Two occurrences in consecutive heads, "
  + "both under the paragraph installed against them, which is evidence about the mode and not about "
  + "either number. "
  + "kogaki#578's one, against the guard that keeps every option VISIBLE: restoring the exact "
  + "emptiness test \u2014 the shipped defect \u2014 fails (e)'s blank-label assertion. Driven end to end as "
  + "well as asserted, because the consequence is the whole finding: with the exact test the payload's "
  + "second option label came out as three spaces, an option the owner is asked to choose and cannot see. "
  + "The retired `Adopt <id>` prefix is why TWO guards carry this property, and PR #576 round 1 "
  + "normalised one and left the other. "
  + "kogaki#574's two, both against the RENDERING/RECORD split the rename is: reverting the caption "
  + "table fails (b)'s renders-as-Reader-Path assertion, and renaming the RECORD field alongside the "
  + "heading \u2014 the non-change the issue names explicitly \u2014 fails the fill outright, which is the "
  + "direct evidence that the two halves are asserted separately rather than by one string test. A "
  + "VACUOUS ASSERTION WAS FOUND AND RE-POINTED IN THE SAME ACT, and it is recorded because this suite "
  + "family has now met the class four times: (b)'s slot-survived test read `## Sequence`, the heading "
  + "this head retires, so after the rename it tested for a string the composer can no longer emit. Its "
  + "sibling in check-brief-entry was a LITERAL ENUMERATION of the same headings and went red on correct "
  + "output; it now derives from SLOT_CAPTIONS, because a copy of a table is a second declaration that "
  + "drifts the first time the table moves. "
  + "kogaki#568's four, all against the selection screen's shape: restoring the shared effect prefix on every "
  + "option label fails (e)'s no-repetition assertion AND its opens-with-the-record-id assertion; dropping the "
  + "effect from the payload label too fails (e)'s states-ONCE assertion, which is the half that stops "
  + "\u0022no repetition\u0022 being satisfied by stating it nowhere; slicing one evidence item out of the rendering "
  + "fails (j)'s count assertion, taken against EVIDENCE_LABELS and REVIEW_AREAS rather than a literal; and "
  + "making the leak predicate skip the paragraphs \u2014 the shape the reshaping introduced \u2014 fails BOTH of "
  + "(j)'s tripwire cases, the direct evidence that a leak cannot escape by moving into a surface the predicate "
  + "stopped walking. TWO MORE FROM PR #576 ROUND 1, which found a re-pointing this head MISSED: the "
  + "independent belt at (j) still read the retired `r.label`/`r.text` off entries that are now strings, so "
  + "its SECTION-REFERENCE arm went vacuous while the pass line kept claiming it \u2014 the internal-key arm survived at the per-item loop, which is what made the loss invisible. Discriminating it needed the predicate "
  + "NEUTERED as well as a leak planted, because the runtime tripwire shadows the belt on the happy path: "
  + "with both, the shipped read fired the assertion 0 times and the repaired read 12. And normalising the "
  + "reader-experience key to trimmed-and-lowercased is asserted by two Candidates whose experiences differ "
  + "only in case, which the exact-string key admitted \u2014 two option labels an owner cannot tell apart, a "
  + "new indistinguishability the retired `Adopt <id>` prefix used to prevent by carrying the id. "
  + "RE-POINTED, NOT RELAXED, stated because a re-pointed assertion and a deleted one read "
  + "identically to a later reader: (j)'s label/text-pair assertions and (l)'s three reader-field assertions now "
  + "read the same two properties \u2014 present under its plain question, and CARRYING the record rather than "
  + "restating it \u2014 off a paragraph instead of a pair; the label-distinctness test is re-pointed as one "
  + "paragraph per plain question, because two items collapsing into one is a loss the count alone would miss. "
  + "THE ORIGINAL TWENTY-ONE "
  + "mutations, COUNTED at kogaki#559 rather than incremented. The count was "
  + "taken by reading the enumeration below, and it is recorded here so the "
  + "next reader re-counts rather than re-increments: an unchecked number "
  + "\"will sit there looking prudent while every later reader inherits the "
  + "false premise\" (gloss/lessons/testing.md:71@8906f20). That it drifted "
  + "TWICE by the same act is the load-bearing part — \"if you fix a problem "
  + "the same way three times and it keeps coming back, the repetition is "
  + "telling you the explanation is wrong\" "
  + "(gloss/lessons/testing.md:161@8906f20) — so what changed is the "
  + "MAINTENANCE MODE, not the number. The arithmetic: 1.73's three + "
  + "1.75's three + 1.77's six + kogaki#501's four + kogaki#520's three + "
  + "kogaki#551's two. The prior header read THIRTEEN and then FIFTEEN, and both "
  + "were wrong the same way — story 1.77's SIX are enumerated below and were "
  + "never added to either the tally or the attribution list, so an increment "
  + "carried the undercount forward. A tally maintained by adding to it drifts "
  + "silently from the enumeration it summarises; this one was re-counted from "
  + "the text. kogaki#551's two, both against the retirement: restoring the `fill` route "
  + "failed (d)'s retirement assertion, and refusing without naming the replacement failed "
  + "(d)'s replacement assertion. A THIRD was run and its assertion WITHDRAWN rather than "
  + "kept: un-exporting `fillBrief` fails this suite at MODULE LOAD, because src/assemble.mjs "
  + "imports it, so a `typeof fillBrief` line could never fire and would have claimed coverage "
  + "the import already supplies — recorded because a dropped mutation and an invented one read "
  + "identically. Then the earlier "
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
  + "failed (i). kogaki#520's three: dropping the per-option `rendering` "
  + "failed (j)'s label assertions; neutering the deny to return clean failed (j)'s two "
  + "tripwire cases; and rendering each item under its KEY instead of its plain label was "
  + "refused BY THE TRIPWIRE ITSELF, failing (e) — the direct evidence that the generator fix "
  + "and the tripwire are two guards and not one. "
  + "Story 1.77's six, each against \u00a75.1 v12's reader fields: composing the three ONCE "
  + "for the whole set \u2014 the DECLINED fill-pass site \u2014 failed (l)'s identical-reading "
  + "assertion on every field, which is the direct evidence that the fill pass would have "
  + "made the reader axis unselectable; dropping the three from the gate payload failed "
  + "(l)'s carries-no-field assertion; skipping the adoption fill failed (l)'s "
  + "did-not-fill AND still-a-slot assertions; neutering the refusal to return clean "
  + "failed (l)'s ACCEPTED assertion; refusing without naming the field failed (l)'s "
  + "by-name assertion, which is what keeps a caller from being sent to re-answer a gate "
  + "that is not the problem; and treating an empty string as authored failed (l)'s "
  + "empty-value assertion. NOT COVERED, stated rather than implied: every composition "
  + "MUST is judgment-class (§4.6) — grounds-test soundness, entailment quality, "
  + "Move-binding order, and whether the surfaced evidence is ADEQUATE evidence — judged at "
  + "path review (story 1.74) and the human gate, never here; this member exercises record "
  + "shape, fill and gate-payload plumbing only, and the selection gate itself is raised by "
  + "the sitting through AskUserQuestion, a relay property no check can run.");
JS
