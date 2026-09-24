#!/usr/bin/env bash
# check-brief-compose — the Leg-record runtime's shape, fill, and
# count-after-composition properties (SPEC-draft-pipeline §§4.1, 4.4,
# 5.1-5.2; kogaki#489, story 1.73).
#
# Seam-free: the Brief under test is MINTED through the real §5.3 v9 flow
# (enter → adopt → mint) against the committed terrain survey fixture, in a
# temporary directory; the composed path is authored inline below — the
# check IS the fixture that records the Leg serialization (story 1.73 SQ1).
#
# WHAT THIS DOES NOT COVER, stated rather than left to look covered: every
# MUST of the composition design is JUDGMENT-CLASS (§4.6) — whether a
# rationale stands on its grounds, whether an entailment is sound, whether a
# Move was bound after the reasoning — and NOTHING here judges any of it.
# This member exercises the record's SHAPE and the fill's PLUMBING only; the
# judge is the path-review agent (story 1.74), and its human gate.
#
# ONE SHAPE, STATED ONCE FOR THE WHOLE FILE (kogaki#951): an assertion that
# binds only the ABSENCE of one message binds a PROXY, not the property. Where
# a case drives an act that refuses, assert WHICH refusal landed and read the
# EXIT STATUS beside it — a negative-only assertion goes green the day some
# earlier clause refuses first, reporting an arm exercised that was never
# reached. The same shape is recorded case-locally by the AC4 and AC5 notes of
# (r) THE POST-HOC DISCLOSURE SLOT (kogaki#866) — the CASE LETTERS ARE REUSED
# in this file, so that case is named rather than pointed at by letter: a
# second (r) and a second (l) exist, and a bare letter resolves to two places.
# This note is what makes the next one recognisable before it is written.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync,
         cpSync, copyFileSync } from "node:fs";
import { join, sep, resolve as resolvePath, dirname as dirnameOf } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { validateLegs, fillBrief, selectedStrands, placements, renderLeg,
         journeyBearingStrands, journeyPlacements, replaceSlot, ownerGateDigest,
         closureRowsForLeg } from "./src/compose.mjs";
import * as compose from "./src/compose.mjs";
// THE ROUND TRIP'S OTHER END (kogaki#1111). `parseLegBlockBody` is the Brief
// parser's one reader of a leg block, and the Journey line's writer is
// `renderLeg` above — asserting the pair here is what keeps a writer and a
// reader from disagreeing about a value that reaches the Leg Packet.
import { parseLegBlockBody, renderPacket, splitPacketTemplate, parseBrief,
         sectionsOf, sectionOfLeg } from "./src/draft.mjs";
import { moveContract, loadMoveContracts, moveContractsForLegs } from "./src/compose.mjs";
import { resolveMoveIds, validateSpecialization, loadMoveIds, specializationDigest, specializationSchema,
         introducesRefusal, parseIntroducesEntry, readerKnowledgeLedger, introducerOf,
         figureRefusal, figureClaimRefusal, resolveFigureForms, figureOf,
         figureClause, figureLegs, renderFigureRoles, parseFigureRoles, figureKinds } from "./src/compose.mjs";
import { composeThesisCandidates } from "./src/brief.mjs";
import { NO_HEADLINE, NO_SHARD_NAME, composeGateCall } from "./src/terrain.mjs";
import { assembleSelection, adoptCandidate, selectionOptionIds, denyInternalVocabulary, EVIDENCE_LABELS, REVIEW_LABELS, REASONING_FIELDS, READER_FIELDS, candidateEvidence, candidateLedgerRefusal, findInternalVocabulary, SLOT_CAPTIONS, decisionGradeRendering, characteristicMaxLength, CANDIDATE_SCHEMA_PATH } from "./src/assemble.mjs";
import { validateDisclosureTable, disclosureSurface, disclosureFieldsPresent } from "./src/disclosure.mjs";
import { REVIEW_AREAS } from "./src/review.mjs";
import { snapshotBrief } from "./src/compose.mjs";
import { laneDir } from "./src/runs.mjs";

// The repository root as THIS check resolves it — the check `cd`s to it above,
// so cwd is the honest reading and it is named once rather than at each use.
const REPO_ROOT = resolvePath(".");

// THE GATE-FILE SUFFIXES ARE DERIVED, not written out (kogaki#959). This member
// read one of `src/gate-schema.json`'s two capture join keys and hardcoded the
// other at seven sites — the join-key-as-a-literal class kogaki#837 records,
// which kogaki#956 half-repaired at the sibling key. Derived here, a suffix
// change fails naming its actual cause at every site rather than at none.
//
// ONE DEFINITION SITE, chosen at the owner gate of 2026-09-06 over seven inline
// derivations, on the ground the whole member is a single module scope so the
// helper costs no plumbing.
//
// THE TWO KEYS ARE NOW SYMMETRIC, and the asymmetry kogaki#959 recorded here is
// what kogaki#961 repaired — the note is rewritten rather than deleted, because
// a reader meeting the two issues in order otherwise finds a defect described
// and no record of its repair. What kogaki#959 found by a mutation probe:
// `capture.glob` had READERS and no WRITER, so this member enforced a declared
// name every producer hardcoded, and moving the field turned the readers red
// while nothing about the product changed.
//
// THE FORM WAS THE CAUSE, which is the part worth carrying forward. A producer
// composes a filename by CONCATENATION, so a bare suffix is honourable and a
// glob is not: `run_declaration_suffix` was honoured at every writer for as
// long as `capture.glob` was honoured at none, one line apart in
// `src/brief.mjs`. So kogaki#961 reshaped the declared key to the form a
// producer can use — `capture.suffix` — and every producer now derives from it
// (`src/brief.mjs`, `src/assemble.mjs` x2, `src/terrain.mjs` x2), with the
// scanners composing `"*" + suffix` where they need a pattern
// (`check-gate-carrier.sh`). The leading-`*` strip this helper used to perform
// is GONE: it was the plumbing that made the field unhonourable, not a
// convenience this member happened to own.
const GATE_SCHEMA = JSON.parse(readFileSync("src/gate-schema.json", "utf8"));
const CAPTURE_SUFFIX = GATE_SCHEMA.capture.suffix;
const DECLARATION_SUFFIX = GATE_SCHEMA.capture.run_declaration_suffix;
const capturePath = (d, stem) => join(d, `${stem}${CAPTURE_SUFFIX}`);
const declarationPath = (d, stem) => join(d, `${stem}${DECLARATION_SUFFIX}`);

// THE CAPTURE'S WRITER IS THE HARNESS (kogaki#1108), so this fixture writes the
// row the harness writes rather than driving a command that used to.
//
// WHY THIS IS NOW THE HONEST SHAPE, and it reverses a note this file used to
// carry. Until this issue the Brief's two gates were raised by `brief.mjs
// gate-thesis` and `assemble.mjs gate-candidate`, each a declare-then-capture
// executor a SESSION drove — so a hand-written capture here would have tested
// `validateOwnerAnswer` twice and the executor never, which is what the old
// note said. Both commands are DELETED: the executor composes the declaration
// at its wait and `.claude/hooks/write-gate-capture.py` writes the row from the
// harness's own payload. There is no command left to drive, and a fixture that
// invented one would be exercising a route the runtime does not have.
//
// THE ROW'S SHAPE IS `src/gate-schema.json`'s, and the digest is computed by
// the same `ownerGateDigest` the hook and the readers call — a second
// implementation here would let the fixture agree with itself while disagreeing
// with the runtime.
//
// AND THE END-TO-END PATH IS ASSERTED ELSEWHERE, not dropped: case (n) drives a
// whole run through the real hooks, with this fixture's hand-written row nowhere
// in it.
const writeCapture = (path, gateId, optionIds, answer, toolUseId) => {
  const doc = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : { rows: [] };
  doc.rows.push({
    stop_id: `stop-${toolUseId}`,
    gate_id: gateId,
    gate_instance_id: toolUseId,
    evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
    payload: { options_offered: optionIds, free_text_offered: true, answer },
    [GATE_SCHEMA.capture.owner_answer_binding_key]: {
      option_set_digest: ownerGateDigest(gateId, optionIds),
    },
  });
  writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
  return path;
};

// The option ids `enter` composed onto a run state, in the order the gate
// offers them — which is the order the digest is taken over.
const thesisOptionIds = (runStatePath) =>
  JSON.parse(readFileSync(runStatePath, "utf8")).gate.options.map((o) => o.id);

// RE-HOMED at kogaki#770. This survey record is the input the Brief mint reads
// through the real §5.3 flow, and it lived under checks/fixtures/terrain/
// because Terrain's own members were its other readers. Those members are gone,
// so the path named an owner that no longer exists — and the issue's update
// surface asserted the whole directory was "read only by the four (verified by
// grep)", which was FALSE of exactly this line. Kept, moved, and named for what
// it is: a survey record, read here.
const SURVEY = "checks/fixtures/survey/lone-tag-member.json";

// THE SERVED ENUMERATION THE MINT RESOLVES AGAINST (kogaki#1116). Since that
// issue a Brief is started with SERVED LESSON ADDRESSES on its command line and
// resolves them against the Package's own enumeration, so the fixture the mint
// needs is a recorded `element_survey` response rather than a survey record.
// It is handed over through `KOGAKI_ELEMENTS_PAYLOAD`, and the resolver REFUSES
// an unreadable recording rather than falling through to the live seam, so the
// RESOLUTION a case asserts over can never silently become an assertion about
// whatever the substrate served today.
//
// WHAT THAT DOES NOT COVER, stated rather than left to read as total (PR #1117
// round 1, nit). It stages `resolveStrandAddresses` and that function only.
// `cmdEnter` then calls `resolveHeadlines`, which fans out to the live gateway
// over the tag union of whatever members the recording named — so the start act
// these cases drive DOES touch the seam, and the member's seam-freedom is a
// property of what it ASSERTS rather than of what it executes. No case here
// reads a headline, which is why an unreachable gateway degrades them rather
// than flaking them; a case that did read one would owe its own recording.
//
// SURVEY IS NOT DELETED BESIDE IT: the reduced-tree case (n) still copies it, and
// the two files carry the same five members deliberately, so the Brief minted
// here is the Brief that was minted before the argument form changed.
const ELEMENTS = "checks/fixtures/elements/brief-compose.json";
const ELEMENTS_ENV = { ...process.env, KOGAKI_ELEMENTS_PAYLOAD: resolvePath(ELEMENTS) };
// The two settled Strands, in the order the cases below expect them. THE ORDER
// IS NOW THE ARGUMENT ORDER, and it is what mints the within-document ids: the
// first address takes L1. `bravo` leads and `alpha` — the member carrying a
// Journey — follows, so alpha is L2 exactly as it was when the ids were read off
// a survey record, and every case downstream that names L2's Journey is
// exercised against the same member it always was.
const SETTLED = ["coding::lesson/bravo", "coding::lesson/alpha"];

// ---- THE REMOVAL TEST'S JUDGE (case (n), kogaki#1108). It answers the three
// `judgment` states of `src/brief-workflow.json` and nothing else, through the
// CLI's `--output-format json` envelope the shipped parse reads.
//
// IT COMPOSES OVER ITS INPUT AND NEVER OVER A FIXED NAME. The Strand ids, the
// Candidate ids and the Leg ids all come from the input the executor handed
// it, so a record here cannot pass a validation it only satisfies because both
// sides were written by the same hand. A hard-coded Strand would be refused by
// the closed-set check `compose_path` runs, which is the check that would then
// be testing the stub.
//
// IT COMPOSES `move` FROM THE INPUT'S OWN LIBRARY (kogaki#1125), which is the
// same rule one field over and was the one field breaking it: the stub carried
// a hard-coded pair of real library ids, because before #1125 the ask carried
// no Move library to compose from. Reading `moves_you_may_bind` makes the
// field LOAD-BEARING for the whole (n) span — a runtime that stops sending it
// fails the stub at exit 5 and the span never reaches a Brief — which is what
// case (ab) below then reads at the artifact.
//
// A FACTORY, so the two refusal cases can vary ONE answer each against a stub
// that is otherwise the conformant one. Two hand-written stubs would differ in
// more than the property under test, and a case would pass or fail on the
// difference nobody meant.
const judgeStub = ({ danglingMove = null, specVerdict = null, undeclaredLedger = false, sectionOnEveryLeg = false } = {}) => [
  "#!/usr/bin/env node",
  // The `--version` probe the start act runs to resolve its binary. It answers
  // FIRST, before any stdin read: the probe closes stdin, and a stub that
  // blocked for a prompt would hang the start act.
  'if (process.argv.includes("--version")) { process.stdout.write("fixture-judge 0.0.0\\n"); process.exit(0); }',
  'const fs = require("node:fs");',
  'const MARKER = "----- INPUT (JSON) -----";',
  'const prompt = fs.readFileSync(0, "utf8");',
  'const at = prompt.indexOf(MARKER);',
  'if (at < 0) { process.stderr.write("no input marker in the prompt\\n"); process.exit(3); }',
  'const input = JSON.parse(prompt.slice(at + MARKER.length));',
  // THE PROMPT ITSELF, WHERE A CASE ASKS FOR IT (kogaki#1147). A case about
  // what the composing party was SHOWN cannot read the shipped prompt from
  // anywhere else: `judgePrompt` is internal to the executor, and the only
  // party the bytes reach is the judge. Written per state, so a case names
  // the ask it means. Off unless the variable is set, so no existing case
  // pays for it.
  'if (process.env.KOGAKI_FIXTURE_PROMPT_LOG) { fs.writeFileSync(process.env.KOGAKI_FIXTURE_PROMPT_LOG + "." + input.state, prompt); }',
  // ONE LINE PER ASK, WHERE A CASE ASKS FOR IT. The count of attempts a state
  // spent is not on the run record when the state REFUSES — `judge_calls` is
  // written on the passing arm alone — so a case about a bound that was NOT
  // spent has to count at the party that was asked. Off unless the variable is
  // set, so no existing case pays for it.
  'if (process.env.KOGAKI_FIXTURE_CALL_LOG) { fs.appendFileSync(process.env.KOGAKI_FIXTURE_CALL_LOG, input.state + "\\n"); }',
  'const AREAS = ["rationale_stands", "entailment", "prohibitions", "semantic_economy", "arc_integrity", "evaluation_levels"];',
  'let record;',
  'if (input.state === "compose_path") {',
  '  const S = input.strands_you_may_use;',
  // THE LIBRARY, READ OR REFUSED. An absent or empty `moves_you_may_bind` exits
  // non-zero rather than falling back to an id this stub knows: a fallback is
  // exactly what makes a missing input invisible, which is the defect #1125 is.
  '  const LIB = input.moves_you_may_bind;',
  '  if (!Array.isArray(LIB) || LIB.length === 0) {',
  '    process.stderr.write("compose_path carried no moves_you_may_bind\\n"); process.exit(5);',
  '  }',
  '  for (const m of LIB) {',
  '    if (!m || typeof m.id !== "string" || typeof m.before !== "string" || typeof m.after !== "string") {',
  '      process.stderr.write("a moves_you_may_bind entry carries no id/before/after\\n"); process.exit(6);',
  '    }',
  '  }',
  '  const MOVES = ' + (danglingMove === null
    ? 'LIB.map((m) => m.id).slice(0, 2)'
    : JSON.stringify([danglingMove])) + ';',
  '  const SECTION_ON_EVERY_LEG = ' + JSON.stringify(sectionOnEveryLeg) + ';',
  '  const legsFor = (order) => order.map((m, i) => Object.assign({',
  '    leg_id: "x" + (i + 1),',
  '    move: MOVES[i % MOVES.length],',
  '    materials: [m],',
  '    purpose: "carry the reader one move further on the strength of " + m,',
  '    reader_state_before: i === 0 ? "knowledge: the reader has no stake in the claim"',
  '      : "knowledge: the reader can state the claim in working form",',
  '    reader_state_after: i === 0 ? "knowledge: the reader can state the claim in working form"',
  '      : "knowledge: the reader has seen the claim discriminate a real case",',
  '    depends_on: i === 0 ? [] : ["x" + i],',
  '    rationale: "this leg sits here because the state it needs is the one the leg before it leaves",',
  '    claims: [{ type: "strand", strand: m, proposition: "the strand " + m + " supports exactly this claim at this point" }],',
  '  }, (i === 0 || SECTION_ON_EVERY_LEG) ? { opens_section: "The claim, in working form " + (i + 1) } : {}));',
  '  const mk = (id, exp, order) => {',
  '    const READER_START = "knowledge: " + id + " the reader treats the case as one team\'s habit";',
  // Reader start binds the first Leg (kogaki#1151): the fixture's first Leg
  // must arrive from the SAME reader_state_before as this Candidate's own
  // reader_start, or `validateLegs` refuses every candidate this factory
  // produces.
  '    const legs = legsFor(order).map((s, i) => i === 0 ? { ...s, reader_state_before: READER_START } : s);',
  '    return {',
  '      candidate_id: id,',
  '      characteristic: "Path " + id,',
  '      reader_experience: exp,',
  '      reader_start: READER_START,',
  '      reader_target: id + ": the reader treats it as a property of the shape",',
  '      opening_question: id + ": why did the same repair land twice?",',
  '      legs: legs,',
  '      reasoning: {',
  '        leg_validity: id + ": each leg\'s claims were traced to the strand they name",',
  '        transition_continuity: id + ": each after-state is the next leg\'s before-state",',
  '        thesis_closure: id + ": the final leg establishes the adopted claim",',
  '      },',
  '      coverage: Object.fromEntries(S.map((m) => [m, { role_in_thesis: "carries one claim of the path" }])),',
  // THE LEDGER, CONFORMANT OR UNDER THE KEY NAMES THE OBSERVED RUN CHOSE
  // (kogaki#1129). `raised_at` / `owed` / `settled_at` is what a composition
  // wrote when the three fields were named in one prose sentence and declared
  // nowhere — read by nothing, scored as wholly undischarged at the owner's
  // gate, and refused at the Brief's final write. Varied through the factory so
  // case (ai) differs from the conformant span in this one answer.
  '      obligations: ' + (undeclaredLedger
    ? '[{ raised_at: legs[0].leg_id, owed: "the case\'s generality is asserted", settled_at: legs[legs.length - 1].leg_id }]'
    // CLOSURE (kogaki#1151): every row ends discharged_by or conceded_by, so
    // the conformant stub's one obligation discharges at the same Leg it is
    // introduced_by — there is no later Leg to discharge it at.
    : '[{ text: "the case\'s generality is asserted", introduced_by: legs[legs.length - 1].leg_id, discharged_by: legs[legs.length - 1].leg_id }]') + ',',
  '    };',
  '  };',
  '  record = { candidates: [',
  '    mk("cand-a", "claim first, then the case", S),',
  '    mk("cand-b", "the case first, claim emerging from it", S.slice().reverse()),',
  '  ] };',
  '} else if (input.state === "review_path") {',
  '  record = Object.fromEntries(input.candidates_you_must_review.map((c) => [c.candidate_id,',
  '    Object.fromEntries(AREAS.map((a) => [a, "reasoning for the " + a.replace(/_/g, " ") + " area of " + c.candidate_id]))]));',
  '} else if (input.state === "judge_specialization") {',
  '  record = {',
  '    version: "1",',
  '    candidate_id: input.candidate_id,',
  '    verdicts: input.legs_you_must_judge.map((st) => ({',
  '      leg_id: st.leg_id, move: st.move, verdict: ' + JSON.stringify(specVerdict || "consistent") + ',',
  '      why: "the before-state and after-state read as instance forms of the move contract",',
  '    })),',
  '  };',
  '} else {',
  '  process.stderr.write("the stub does not know state " + input.state + "\\n");',
  '  process.exit(4);',
  '}',
  'process.stdout.write(JSON.stringify({ result: JSON.stringify(record) }) + "\\n");',
  "",
].join("\n");

// The conformant stub, named as the constant every existing case already uses.
const JUDGE_STUB = judgeStub();

const fails = [];

// THE CASE COUNT IS THE SET OF CASES THAT RAN, never a constant beside them
// (kogaki#972). What stood here was `const CASE_COUNT = 28`, and kogaki#970's
// two-directional arm compared it against the registry's `case_floor` — two
// DECLARATIONS in this repository, neither of which is the thing the floor is
// defined over. The arm forced the floor to follow the constant; it could not
// see a case ACTUALLY LOST, because nothing counted the cases. The seven
// sibling members already parse a count out of a spawned pass's own output;
// this member IS its own pass, so the equivalent producer-side reading is a
// registration each case performs when it runs.
//
// A REUSED ID IS REFUSED BY NAME, and that is the half a bare `Set` would get
// wrong. This file's own case LETTERS are reused — the header says so, and a
// second (k), (l) and (r) exist — so two cases sharing one registration id
// would collapse into one count, and deleting either would leave the count
// unchanged: the very blindness this instrument replaces, rebuilt inside it.
// The registration ids therefore disambiguate where the letter cannot
// (`k-instantiation` / `k-composed-body`, `l-reader-fields` / `l-bridge`,
// `r-posthoc` / `r-plain-labels`), and a duplicate is a failure rather than a
// silent absorption.
//
// A FACTORY rather than a bare set, so that (count) below can exercise the
// instrument on its OWN instances. A probe against the live registry would
// have to register into the number it is checking.
const newCaseRegistry = () => {
  const seen = new Set();
  const duplicates = [];
  return {
    ran(id) { if (seen.has(id)) duplicates.push(id); seen.add(id); },
    get size() { return seen.size; },
    get duplicates() { return duplicates.slice(); },
  };
};
const CASES = newCaseRegistry();
const ranCase = (id) => CASES.ran(id);
let exemplarLine = "the Move library was not read";
const dir = mkdtempSync(join(tmpdir(), "brief-compose-"));
const theses = join(dir, "theses");
const run = (argv, env = ELEMENTS_ENV) => spawnSync(process.execPath, argv, { encoding: "utf8", env });

// Mint a real Brief through the v9 flow (L2 has a journey; L1 does not).
const rs = join(dir, "run.json");
run(["src/brief.mjs", "enter", ...SETTLED, "--run-state", rs]);
// THE OWNER'S ANSWER IS CAPTURED, NEVER PASSED (kogaki#891, kogaki#1108): the
// executor composes the declaration at its `THESIS_ADOPTION` wait, the harness
// writes the row, and `adopt` reads it. `--thesis` no longer exists, and
// neither does the `gate-thesis` command that used to write this row.
const thesisCap = writeCapture(join(dir, "thesis-capture.json"), "brief-thesis-adoption",
  thesisOptionIds(rs), { option: "thesis-1" }, "toolu_fixture_thesis");
run(["src/brief.mjs", "adopt", "--run-state", rs, "--capture", thesisCap]);
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
// membership test), so a fixture carrying `before`/`after` would suggest
// the resolver reads them.
const MOVES = join(dir, "moves");
mkdirSync(MOVES, { recursive: true });
for (const id of ["state-claim-in-working-form", "worked-example", "generalize-from-the-seen-case"]) {
  writeFileSync(join(MOVES, `${id}.md`), `id: ${id}\n`);
}
// §4.16 (kogaki#877): ONE fixture Move carrying a `figure`, so the
// adoption seat's figure half can be exercised against this library. The three
// above deliberately carry none — a figure on any of them is the formless case.
// A TWO-ROLE KIND, and the count is load-bearing since kogaki#1108: a Leg
// carries one claim per Strand and every role of the form binds to one of
// this Leg's claims, so an N-role form costs N Strands. The Brief this
// library is exercised against closes over two, which is what selects `chain`
// here. See the note at `figLegOf` in (x).
writeFileSync(join(MOVES, "chain-form-move.md"),
  "id: chain-form-move\nfigure:\n  kind: chain\n"
  + "  stages: the ordered stages\n  bottlenecks: where each stage held\n");
// (v)'s own `axis`-kind fixture, for kogaki#1175's figure-decision cases, is
// minted in that case's own directory rather than here — this outer `MOVES`
// dir is torn down by the try/finally above before (v) runs, and a fixture
// written into it here would be read from a directory already gone.
// A CONFORMING specialization record for a Candidate — composed HERE, by the
// check, standing in for the judging sitting. The runtime under test composes
// none, which is the property (c) below asserts by removing this.
const spec = (cand, over = {}) => ({
  version: "1",
  candidate_id: cand.candidate_id,
  verdicts: cand.legs.map((st) => ({
    leg_id: st.leg_id, move: st.move, verdict: "consistent",
    why: `the before-state and after-state read as instance forms of ${st.move}'s contract`,
  })),
  ...over,
});
// THE RATIFICATION CAPTURE FIXTURE IS GONE (kogaki#1108), with the gate it was
// for. `brief-specialization-ratification` is out of src/gate-registry.json and
// the specialization record is DISCLOSURE rather than a write unlock, so there
// is no capture to compose here and nothing for one to bind to. Case (s) below
// asserts the removal in both directions rather than merely not exercising it.
//
// The digest survives and is still READ FROM THE RUNTIME rather than recomputed
// here — a second implementation of it in the check would pass while disagreeing
// with the one adoption uses — but what it now names is the record in adoption's
// closing summary.
// §6's SELECTION CAPTURE (kogaki#891) — the owner's own answer at the
// Candidate-selection gate, bound to the option set it was offered against.
// Composed the way the runtime composes it, from `selectionOptionIds`, so a
// fixture cannot pass a digest the runtime would not compute.
const SEL_GATE = "brief-candidate-selection";
const sel = (candId, reviewed, doc, over = {}) => {
  const offered = selectionOptionIds(reviewed, doc);
  if (offered.error) throw new Error(`fixture selection set is unpresentable: ${offered.error}`);
  return { rows: [{
    stop_id: "stop-fixture-sel",
    gate_id: SEL_GATE,
    evidence: { tool: "AskUserQuestion", tool_use_id: "toolu_fixture_sel" },
    payload: { options_offered: offered.ids, free_text_offered: true, answer: { option: candId } },
    answers_over: { option_set_digest: ownerGateDigest(SEL_GATE, offered.ids) },
    ...over,
  }] };
};
const inst = (cand, over = {}, reviewed = null, doc = null) => {
  const record = spec(cand, over);
  if (!reviewed) throw new Error("inst() needs the reviewed set the §6 gate offered — the selection capture binds to it (kogaki#891)");
  const rv = reviewed;
  const dc = doc || readFileSync(briefPath, "utf8");
  return { movesDir: MOVES, specialization: record,
    selection: sel(cand.candidate_id, rv, dc) };
};

const leg1 = {
  // §4.1 v18 (kogaki#642): every Leg binds a Move — the State component.
  // §4.15 rule 3 (kogaki#822): the FIRST Leg always opens a Section, so every
  // path fixture in this member starts from a Leg that declares one. Added at
  // the shared record rather than per block, because rule 3 binds every path
  // and a per-block copy would drift the moment one block gains a case.
  leg_id: "s1", move: "state-claim-in-working-form", materials: ["L2", "thesis"],
  opens_section: "The claim, in working form",
  purpose: "give the reader the claim in working form",
  reader_state_before: "knowledge: the reader has no stake in the claim",
  reader_state_after: "knowledge: the reader can state the claim and its cost",
  depends_on: [],
  rationale: "the settled material states the claim directly, so the article opens on it",
  claims: [{ type: "strand", strand: "L2", proposition: "the alpha lesson states the claim in its own words" }],
};
const leg2 = {
  leg_id: "s2", move: "worked-example", materials: ["L1"],
  purpose: "show the claim doing work on a concrete case",
  reader_state_before: "knowledge: the reader can state the claim and its cost",
  reader_state_after: "knowledge: the reader has seen the claim discriminate a real case",
  depends_on: ["s1"],
  rationale: "the bravo material carries the concrete case, and the case only reads after the claim is stated",
  claims: [
    // A claim is one claim derived from a Strand (kogaki#1095). This slot
    // carried a `leg_effect` claim; what it was standing for — that s1 left
    // the claim stated — is `reader_state_before`'s and the ledger's, and
    // composition now refuses it here.
    //
    // AND IT CARRIES EXACTLY ONE (kogaki#1108). It carried two, both on L1 —
    // which is the drift the one-claim-per-Strand rule removes, and this
    // fixture was one of the places it had already reached. A claim is the ONE
    // proposition this Leg asserts on behalf of one Strand; the second was the
    // same claim said again at a different grain.
    { type: "strand", strand: "L1", proposition: "the bravo lesson records the concrete case the claim turned on" },
  ],
  entailed: true,
  entailment_reasoning: "the case's link to the claim is not stated in the material; it follows from the shared subject, and the gate judges that reading",
};

try {
  // (a) SHAPE (§4.1/§4.4): a conforming path validates; each broken record
  // is refused NAMING the missing field — a schema refusal, never a judgment.
  ranCase("a");
  if (validateLegs([leg1, leg2]).error) fails.push(`(a) a conforming path was refused: ${validateLegs([leg1, leg2]).error}`);
  const drop = (s, k) => { const c = JSON.parse(JSON.stringify(s)); delete c[k]; return c; };
  for (const k of ["leg_id", "materials", "purpose", "reader_state_before", "reader_state_after", "depends_on", "rationale", "claims"]) {
    const r = validateLegs([drop(leg1, k)]);
    if (!r.error || !r.error.includes(k)) fails.push(`(a) dropping ${k} was not refused naming the field`);
  }
  const noReason = JSON.parse(JSON.stringify(leg2)); delete noReason.entailment_reasoning;
  const rE = validateLegs([leg1, noReason]);
  if (!rE.error || !/entailment_reasoning/.test(rE.error)) fails.push("(a) entailed:true with no reasoning was not refused — entailment is judged, never silently trusted (§4.4)");
  const badDep = validateLegs([{ ...leg1, depends_on: ["s9"] }]);
  if (!badDep.error || !/EARLIER/.test(badDep.error)) fails.push("(a) a depends_on naming a non-earlier leg was accepted");
  const badClaim = validateLegs([{ ...leg1, claims: [{ type: "vibes", proposition: "x" }] }]);
  if (!badClaim.error || !/closed/.test(badClaim.error)) fails.push("(a) a claim type outside §4.4's closed list was accepted");
  // A CLAIM IS ONE CLAIM DERIVED FROM A STRAND (kogaki#1095). The two retired
  // types are asserted BY NAME and separately from the closed-set case above:
  // a Brief written under the old grammar is the caller this arm exists for,
  // and the refusal owes it WHERE the content it was carrying now belongs.
  // Asserting only that they are refused would bind a proxy — the closed-set
  // message already refuses them, and this file's stated shape is that a case
  // asserts WHICH refusal landed.
  for (const [type, extra, where] of [
    ["leg_effect", { leg: "s1" }, /reader_state_before/],
    ["reader_assumption", {}, /Reader start/],
  ]) {
    const r = validateLegs([leg1, { ...leg2, claims: [{ type, proposition: "p", ...extra }] }]);
    if (!r.error) {
      fails.push(`(a) a ${type} claim was ACCEPTED — a claim is one claim derived from a Strand (kogaki#1095), and this file is the seat that makes the other kinds unwritable`);
    } else if (!r.error.includes(type) || !where.test(r.error)) {
      fails.push(`(a) a ${type} claim was refused without naming the type and where its content now belongs: ${r.error}`);
    }
  }
  // THE REFUSAL IS THE VALIDATOR'S, NOT A DOCUMENT'S (kogaki#1095 acceptance 6).
  // A REMOVAL TEST rather than an inspection of imports: `src/compose.mjs` and
  // its one repository import are copied ALONE into a temporary directory with
  // no `.claude/skills/brief/SKILL.md`, no `specs/spec-draft-pipeline/SPEC.md`
  // and no repository around them, and the refusal is driven there. An
  // assertion that the module names neither path would bind a proxy — the two
  // documents could still be load-bearing through any reader the module
  // reaches — and the whole point of moving the type set into the validator is
  // that deleting the prose changes nothing.
  {
    const cell = mkdtempSync(join(tmpdir(), "kogaki-claim-removal-"));
    try {
      mkdirSync(join(cell, "src"));
      // `leg-schema.json` JOINS THE CELL (kogaki#1108) and that is not a
      // weakening of the removal test. The cell carries the RUNTIME and
      // withholds the PROSE: what it proves is that the two documents are not
      // load-bearing, and a schema file the validator reads its field set and
      // its ground rules from is runtime by the same standard `runs.mjs` is.
      // The distinction is which component executes the rule — the schema is
      // read by `validateLegs`, while SKILL.md and the pipeline spec are read
      // by a session.
      for (const f of ["compose.mjs", "runs.mjs", "leg-schema.json"]) {
        writeFileSync(join(cell, "src", f), readFileSync(join(REPO_ROOT, "src", f), "utf8"));
      }
      for (const doc of [".claude/skills/brief/SKILL.md", "specs/spec-draft-pipeline/SPEC.md"]) {
        if (existsSync(join(cell, doc))) fails.push(`(a) the removal cell carries ${doc} — the test would prove nothing`);
      }
      const alone = await import(`file://${join(cell, "src", "compose.mjs")}`);
      const r = alone.validateLegs([leg1, { ...leg2, claims: [{ type: "leg_effect", leg: "s1", proposition: "p" }] }]);
      // BOUND TO THE RETIRED-TYPE MESSAGE, not to the type NAME: the closed-set
      // refusal quotes the offending type too, so `includes("leg_effect")`
      // goes green against the wrong arm — the proxy this case's own comment
      // warns about, found by driving the arm out and watching nothing fire.
      if (!r.error || !r.error.includes("leg_effect") || !/reader_state_before/.test(r.error)) {
        fails.push(`(a) with the brief skill and the pipeline spec absent, a leg_effect claim was not refused by name with where its content now belongs — the refusal is a document's rather than the validator's: ${r.error || "ACCEPTED"}`);
      }
      // ITEM 6'S REFUSAL STANDS IN THE CELL TOO (kogaki#1108 acceptance 8).
      // The one-claim-per-Strand rule is the claim definition's mechanical
      // half, and the Issue requires it to survive the removal of both
      // documents — so it is driven HERE rather than only in (a) above, where
      // the whole repository is present and a prose carrier could not be told
      // apart from the validator.
      {
        const twice = alone.validateLegs([leg1, { ...leg2,
          claims: [{ type: "strand", proposition: "first", strand: "L2" },
                    { type: "strand", proposition: "second", strand: "L2" }] }]);
        if (!twice.error || !/L2/.test(twice.error) || !/one_per_strand|ONE proposition/.test(twice.error)) {
          fails.push(`(a) with the brief skill and the pipeline spec absent, two claims naming one Strand were not refused naming that Strand — the one-per-Strand rule is a document's rather than the validator's: ${twice.error || "ACCEPTED"}`);
        }
        if (twice.error && !twice.error.includes(leg2.leg_id)) {
          fails.push(`(a) the one-claim-per-Strand refusal does not name the Leg: ${twice.error}`);
        }
      }
      // THE JOURNEY REFUSALS STAND IN THE CELL TOO (kogaki#1111 acceptance 5).
      // The use set and the materials rule are the schema's and the
      // validator's; the Issue requires them to survive the removal of the
      // brief skill and the pipeline spec, so they are driven HERE rather than
      // only where the whole repository is present and a prose carrier could
      // not be told apart from the validator.
      {
        const badUse = alone.validateLegs([{ ...leg1,
          journeys: [{ strand: "L2", use: "decorate" }] }, leg2]);
        if (!badUse.error || !/decorate/.test(badUse.error) || !/illustrate/.test(badUse.error)) {
          fails.push(`(a) with the brief skill and the pipeline spec absent, a Journey use outside the closed set was not refused quoting the use and naming the set — the use set is a document's rather than the schema's: ${badUse.error || "ACCEPTED"}`);
        }
        const notCarried = alone.validateLegs([{ ...leg1,
          journeys: [{ strand: "L1", use: "illustrate" }] }, leg2]);
        if (!notCarried.error || !/L1/.test(notCarried.error) || !/materials/.test(notCarried.error)) {
          fails.push(`(a) with the two documents absent, a Journey drawing on a Strand the Leg does not carry was not refused naming that Strand and \`materials\`: ${notCarried.error || "ACCEPTED"}`);
        }
        // THE CONTROL: a conforming Journey rides through the cell, so the two
        // refusals above are the arms firing rather than the field being
        // rejected outright.
        const good = alone.validateLegs([{ ...leg1,
          journeys: [{ strand: "L2", use: "illustrate" }] }, leg2]);
        if (good.error) {
          fails.push(`(a) the removal cell refuses a CONFORMING Journey reference, so its Journey refusals above prove nothing: ${good.error}`);
        }
      }
      const ok = alone.validateLegs([leg1, leg2]);
      if (ok.error) fails.push(`(a) the removal cell refuses a CONFORMING path, so its refusal above proves nothing: ${ok.error}`);
    } finally {
      rmSync(cell, { recursive: true, force: true });
    }
  }
  // AND THE SERIALIZATION CARRIES ONE FORM (kogaki#1095): `claim (strand
  // L<n>): <proposition>`, which is what `src/draft.mjs material --strand` and
  // the figure `g<n>` addressing read. Asserted at the writer rather than
  // inferred from a round trip, because the writer is the half this issue moved.
  {
    const line = renderLeg(leg1).split("\n").filter((l) => l.startsWith("claim "));
    if (line.length !== 1 || line[0] !== "claim (strand L2): the alpha lesson states the claim in its own words") {
      fails.push(`(a) the claim line is not serialized as \`claim (strand L<n>): <proposition>\`: ${JSON.stringify(line)}`);
    }
  }
  // ---- (a) THE JOURNEY A LEG DRAWS ON (kogaki#1111) ----
  //
  // A Journey is MATERIAL THE LEG EDITS, never an assertion it must recover.
  // The field carries an ADDRESS and a USE and no text, and these cases bind
  // the three facts that makes checkable: the use set is the SCHEMA's and is
  // closed, the Journey's Strand is one the Leg carries, and a Journey
  // claimed for a Strand whose served record has none is refused at the fill
  // where the Brief's own Strands section is in hand.
  {
    const schema = JSON.parse(readFileSync(join(REPO_ROOT, "src", "leg-schema.json"), "utf8"));
    // ACCEPTANCE 1's SCHEMA HALF. Asserted against the file rather than
    // against a constant here, because the whole arrangement is that the
    // composer's prompt and the validator's refusal read ONE file.
    if (!schema.fields.journeys) {
      fails.push("(a) src/leg-schema.json declares no `journeys` field — the composer is rendered this file verbatim, so a field it does not carry is a field nobody is asked for");
    }
    const uses = Object.keys(schema.journey?.uses || {});
    if (JSON.stringify(uses) !== JSON.stringify(["illustrate", "motivate", "contrast"])) {
      fails.push(`(a) the schema's closed Journey use set is ${JSON.stringify(uses)}, not the three the Issue settles`);
    }
    // THE VALIDATOR READS THE SET FROM THE SCHEMA, and that is asserted by
    // MOVING the schema rather than by reading the source: a validator holding
    // its own copy would pass every case above and still drift.
    {
      const cell = mkdtempSync(join(tmpdir(), "kogaki-journey-uses-"));
      try {
        mkdirSync(join(cell, "src"));
        for (const f of ["compose.mjs", "runs.mjs"]) {
          writeFileSync(join(cell, "src", f), readFileSync(join(REPO_ROOT, "src", f), "utf8"));
        }
        const moved = JSON.parse(readFileSync(join(REPO_ROOT, "src", "leg-schema.json"), "utf8"));
        moved.journey.uses = { transcribe: "to transcribe the case verbatim" };
        writeFileSync(join(cell, "src", "leg-schema.json"), JSON.stringify(moved, null, 2));
        const alone = await import(`file://${join(cell, "src", "compose.mjs")}`);
        const r = alone.validateLegs([{ ...leg1, journeys: [{ strand: "L2", use: "illustrate" }] }, leg2]);
        if (!r.error || !/transcribe/.test(r.error)) {
          fails.push(`(a) the validator does not read the Journey use set from src/leg-schema.json — a use the moved schema retired was accepted, or refused without naming the moved set: ${r.error || "ACCEPTED"}`);
        }
        const ok2 = alone.validateLegs([{ ...leg1, journeys: [{ strand: "L2", use: "transcribe" }] }, leg2]);
        if (ok2.error) fails.push(`(a) the moved schema's own use was refused, so the case above proves nothing: ${ok2.error}`);
      } finally {
        rmSync(cell, { recursive: true, force: true });
      }
    }
    // THE SHAPE REFUSALS, each asserted by WHICH refusal landed.
    for (const [journeys, where, what] of [
      [[{ strand: "L2" }], /names no use/, "a Journey with no use"],
      [[{ use: "illustrate" }], /names no strand/, "a Journey with no strand"],
      [[{ strand: "L2", use: "gesture" }], /gesture/, "a use outside the closed set"],
      [[{ strand: "L1", use: "illustrate" }], /materials/, "a Journey whose Strand the Leg does not carry"],
      ["L2", /array of Journey references/, "a journeys value that is not an array"],
    ]) {
      const r = validateLegs([{ ...leg1, journeys }, leg2]);
      if (!r.error) fails.push(`(a) ${what} was ACCEPTED`);
      else if (!where.test(r.error)) fails.push(`(a) ${what} was refused for another reason: ${r.error}`);
    }
    // A LEG MAY NAME ITS STRAND IN EITHER FORM. `<L-id>.journey` is what the
    // coverage accounting counts, and this Issue changes that accounting not
    // at all — so a Leg carrying the suffixed form carries the Strand.
    for (const materials of [["L2", "thesis"], ["L2.journey", "thesis"], ["L2", "L2.journey"]]) {
      const r = validateLegs([{ ...leg1, materials, journeys: [{ strand: "L2", use: "contrast" }] }, leg2]);
      if (r.error) fails.push(`(a) a conforming Journey was refused against materials ${JSON.stringify(materials)}: ${r.error}`);
    }
    // NOTHING BOUNDS THE COUNT (kogaki#1111's 2026-09-13 amendment): two
    // Journeys with the same use is a path-review judgment, never a shape
    // refusal, and this asserts the schema grew no number.
    {
      const r = validateLegs([{ ...leg1, materials: ["L2", "L3", "thesis"],
        journeys: [{ strand: "L2", use: "illustrate" }, { strand: "L3", use: "illustrate" }] }, leg2]);
      if (r.error) fails.push(`(a) two Journeys of one Leg were refused — no clause of this Issue bounds the count: ${r.error}`);
    }
    // THE SERIALIZATION IS ONE LINE PER ENTRY, and a Leg declaring none is
    // BYTE-IDENTICAL to what it was before this field existed.
    {
      const lines = renderLeg({ ...leg1, journeys: [{ strand: "L2", use: "motivate" }] })
        .split("\n").filter((l) => l.startsWith("journey:"));
      if (lines.length !== 1 || lines[0] !== "journey: L2 — motivate") {
        fails.push(`(a) the journey line is not serialized as \`journey: <L-id> — <use>\`: ${JSON.stringify(lines)}`);
      }
      if (renderLeg(leg1).includes("journey:")) {
        fails.push("(a) a Leg declaring no Journey serializes a journey line — a Brief composed before this field is not byte-identical");
      }
    }
    // AND THE ROUND TRIP HOLDS, through the Brief parser's own reader rather
    // than a second one: the writer is `renderLeg` and the reader is
    // `src/draft.mjs`'s `parseLegBlockBody`, sharing ONE grammar.
    {
      const body = renderLeg({ ...leg1, journeys: [{ strand: "L2", use: "contrast" }] })
        .replace(/^```leg\n/, "").replace(/\n```$/, "");
      const back = parseLegBlockBody(body, "round-trip.md");
      if (back.refusal) fails.push(`(a) the serialized Journey line does not parse back: ${back.refusal}`);
      else if (JSON.stringify(back.leg.journeys) !== JSON.stringify([{ strand: "L2", use: "contrast" }])) {
        fails.push(`(a) the Journey round trip lost or changed the declaration: ${JSON.stringify(back.leg.journeys)}`);
      }
    }
  }

  // move is REQUIRED on every Leg — §4.1 v18 (kogaki#642), which supersedes
  // §7.5's no-mandatory-Moves rider by name. The assertion is INVERTED rather
  // than removed: the case it covers is the same one, and deleting it would
  // leave the new requirement with no exercised trial. The refusal must name
  // the field, so a later loosening cannot pass by refusing for another reason.
  const noMove = validateLegs([leg1, { ...leg2, move: undefined }]);
  if (!noMove.error || !/move/.test(noMove.error)) fails.push("(a) a leg without a Move was accepted — the Move is a Leg's State component and §4.1 v18 requires one");
  const emptyMove = validateLegs([{ ...leg1, move: "" }]);
  if (!emptyMove.error || !/move/.test(emptyMove.error)) fails.push("(a) an empty-string Move was accepted — a binding is to a library entry by id, never the empty id");

  // (b) FILL (§5.1/§5.2): sequence, strand_coverage and Closure land in
  // the minted document; every Closure row carries introduced_by AND EXACTLY
  // ONE of discharged_by/conceded_by — "unresolved" is no longer a state the
  // ledger can hold (kogaki#1151).
  ranCase("b");
  const doc0 = readFileSync(briefPath, "utf8");
  const input = {
    legs: [leg1, leg2],
    coverage: { L2: { role_in_thesis: "states the claim" }, L1: { role_in_thesis: "carries the case" } },
    obligations: [
      { text: "the cost conceded in s1 must be weighed", introduced_by: "s1", discharged_by: "s2" },
      { text: "the case's generality is asserted, not shown", introduced_by: "s2", conceded_by: "s2" },
    ],
    readerStart: leg1.reader_state_before,
    thesisClosure: { explanation: "the working-form claim is discriminated by the case", established_by_legs: ["s1", "s2"] },
  };
  const f1 = fillBrief(doc0, input);
  if (f1.error) fails.push(`(b) a conforming fill was refused: ${f1.error}`);
  const doc1 = f1.doc || "";
  if (!/```leg\nleg_id: s1/.test(doc1)) fails.push("(b) the sequence slot does not carry the serialized Leg records");
  if (!/move: worked-example/.test(doc1)) fails.push("(b) the Move binding is absent from the serialized Leg");
  if (!/entailment_reasoning: /.test(doc1)) fails.push("(b) the entailed Leg's reasoning is not exposed on the record for the gate (§4.4)");
  if (!/\*\*L2\*\* — used_by_legs: s1;/.test(doc1)) fails.push("(b) strand_coverage does not carry used_by_legs derived from the composed legs");
  if (!/role_in_thesis: states the claim/.test(doc1)) fails.push("(b) strand_coverage does not carry role_in_thesis");
  if (!/introduced_by: s1; discharged_by: s2/.test(doc1)) fails.push("(b) a Closure row does not carry introduced_by/discharged_by (§5.2)");
  if (!/introduced_by: s2; conceded_by: s2/.test(doc1)) fails.push("(b) a Closure row does not carry introduced_by/conceded_by (§5.2)");
  if (!/### Thesis\n\nthe working-form claim is discriminated by the case — established_by_legs: s1, s2/.test(doc1)) fails.push("(b) the Thesis row does not render its explanation and established_by_legs");
  if (!/^## Closure$/m.test(doc1)) fails.push("(b) the filled Brief does not render Closure as one section (kogaki#1151)");
  if (/Unresolved obligations/.test(doc1)) fails.push("(b) the retired \"Unresolved obligations\" heading still reaches the owner (kogaki#1151)");
  // NEITHER TERMINAL STATE IS REFUSED, NAMING THE ROW.
  const neitherObl = fillBrief(doc0, { ...input, obligations: [{ text: "x", introduced_by: "s1" }] });
  if (!neitherObl.error || !/NEITHER/.test(neitherObl.error)) fails.push(`(b) a Closure row carrying neither discharged_by nor conceded_by was accepted: ${JSON.stringify(neitherObl)}`);
  // BOTH TERMINAL STATES IS REFUSED, NAMING THE ROW — an ambiguous close.
  const bothObl = fillBrief(doc0, { ...input, obligations: [{ text: "x", introduced_by: "s1", discharged_by: "s2", conceded_by: "s2" }] });
  if (!bothObl.error || !/BOTH/.test(bothObl.error)) fails.push(`(b) a Closure row carrying BOTH discharged_by and conceded_by was accepted: ${JSON.stringify(bothObl)}`);
  // READER START BINDS THE FIRST LEG, refused NAMING BOTH values.
  const wrongStart = fillBrief(doc0, { ...input, readerStart: "knowledge: the reader stands somewhere this path never starts" });
  if (!wrongStart.error || !/Reader start/.test(wrongStart.error)) fails.push(`(b) a first Leg disagreeing with the Brief's Reader start was accepted: ${JSON.stringify(wrongStart)}`);
  if (validateLegs([leg1, leg2], leg1.reader_state_before).error) fails.push("(b) validateLegs refused a first Leg that DOES agree with the given Reader start");
  // ACCEPTANCE 7's COMPOSITION HALF (kogaki#1151; PR #1152 round 1, finding 2).
  // The refusal half above is the easy half. This is the other one: a Brief
  // whose rows are ALL TERMINAL composes and PACKETS identically on two runs.
  //
  // WHY IT IS HERE AND NOT IN THE ReviewDraft PASS. `closureRowsForLeg` is the
  // one reader between `fillBrief`'s writer and the Leg Packet, and every
  // other fixture in the tree hands it a Leg that is party to nothing — so the
  // rows-present branch of its Brief-section regex, its Thesis-row split on
  // `established_by_legs` and its row regex had never been executed by
  // anything, while the suite was green. Asserted over the SAME `doc1` the
  // refusals above are asserted over, so the writer and this reader cannot
  // drift apart with both halves still passing.
  {
    // THE ROWS-PRESENT BRANCH, per Leg and as PROSE. The Thesis row reaches
    // its establishing Legs stripped of its `established_by_legs:` tail; a
    // Leg row reaches the Leg that introduced it and the Leg that closed it.
    const s1 = closureRowsForLeg(doc1, "s1");
    const s2 = closureRowsForLeg(doc1, "s2");
    const THESIS = "the working-form claim is discriminated by the case";
    const R1 = "the cost conceded in s1 must be weighed";
    const R2 = "the case's generality is asserted, not shown";
    if (!s1.includes(THESIS)) fails.push(`(b) the Thesis row did not reach s1, one of its established_by_legs: ${JSON.stringify(s1)}`);
    if (!s2.includes(THESIS)) fails.push(`(b) the Thesis row did not reach s2, one of its established_by_legs: ${JSON.stringify(s2)}`);
    if (s1.some((r) => /established_by_legs/.test(r))) fails.push(`(b) the Thesis row reached a Leg carrying its established_by_legs tail rather than its prose alone: ${JSON.stringify(s1)}`);
    // introduced_by: s1, discharged_by: s2 — a party to it at BOTH ends.
    if (!s1.includes(R1)) fails.push(`(b) the row s1 introduces did not reach s1: ${JSON.stringify(s1)}`);
    if (!s2.includes(R1)) fails.push(`(b) the row s2 discharges did not reach s2: ${JSON.stringify(s2)}`);
    // introduced_by: s2, conceded_by: s2 — a party to it at neither end is s1.
    if (!s2.includes(R2)) fails.push(`(b) the row s2 introduces and concedes did not reach s2: ${JSON.stringify(s2)}`);
    if (s1.includes(R2)) fails.push(`(b) a row s1 is party to NEITHER end of reached s1 — the reader is handing a Leg rows that are not its own: ${JSON.stringify(s1)}`);
    // AND THE EMPTY BRANCH IS STILL THE EMPTY BRANCH, asserted beside the
    // rows-present one rather than trusted: a reader that returned every row
    // would pass every assertion above.
    const none = closureRowsForLeg(doc1, "s-not-in-this-path");
    if (none.length !== 0) fails.push(`(b) a Leg party to no Closure row was handed rows: ${JSON.stringify(none)}`);
    // A DOCUMENT WITH NO CLOSURE SECTION AT ALL renders empty rather than
    // throwing — the pre-Closure Brief generation is still readable.
    if (closureRowsForLeg(doc0, "s1").length !== 0) fails.push("(b) closureRowsForLeg invented rows for a document carrying no Closure section");

    // IDENTICAL ON TWO RUNS, at BOTH layers acceptance 7 names — the composed
    // document and the Packet. Run two composes the SAME input again from the
    // SAME pristine doc0, so a non-determinism in `fillBrief` (an iteration
    // order, a clock, a Set) fails here rather than downstream in a Draft
    // nobody can diff.
    const f2 = fillBrief(doc0, input);
    if (f2.error) fails.push(`(b) the second compose of a conforming input was refused: ${f2.error}`);
    const doc2 = f2.doc || "";
    if (doc2 !== doc1) fails.push("(b) two composes of one input did not produce byte-identical Briefs (acceptance 7)");
    if (JSON.stringify(closureRowsForLeg(doc2, "s1")) !== JSON.stringify(s1)) fails.push("(b) the Closure rows read from the second compose differ from the first");

    // THE PACKET, through `renderPacket` rather than a second filler. The
    // ReviewDraft pass fills the template itself by design (its closed-input
    // allowlist forbids importing `src/draft.mjs`), which is exactly why the
    // rows-present render has no home there and belongs here.
    const packetOf = (doc, legId) => {
      // THE THREE ARTICLE-LEVEL SLOTS A PACKET READS are filled here rather
      // than left as the mint wrote them: `fillBrief`'s subject is the path,
      // so a Brief it has filled still carries `Reader start`, `Reader target`
      // and `Opening question` as typed unfilled slots, and `renderPacket`
      // refuses on any of them. Filling them is fixture setup for THIS case's
      // subject, which is the Closure block; nothing below asserts over them.
      // `parseBrief` refuses a document carrying ANY typed unfilled slot, and
      // `fillBrief`'s subject is the PATH — so a Brief it has filled still
      // carries the article-level sections the mint wrote as slots. They are
      // filled here with a stated fixture value, per heading, because this
      // case's subject is the Closure block and nothing below asserts over
      // them; a blanket string replace would also rewrite prose that merely
      // quoted the slot token.
      let d = doc;
      for (const h of [...d.matchAll(/^## (.+)\n\n\*\(awaiting composition\)\*/gm)].map((m) => m[1])) {
        const r = replaceSlot(d, h, `fixture value for ${h} — not this case's subject`);
        if (r.doc) d = r.doc; else return { error: `the fixture could not fill "${h}": ${r.error}` };
      }
      const brief = parseBrief(d, briefPath);
      if (brief.refusals.length) return { error: brief.refusals[0] };
      const leg = brief.legs.find((s) => s.leg_id === legId);
      if (!leg) return { error: `the composed Brief carries no leg ${legId}` };
      const split = splitPacketTemplate(readFileSync(join("src", "packet-template.md"), "utf8"));
      if (split.error) return { error: split.error };
      // THE MOVE RECORD IS SYNTHESIZED, not read from the fixture library.
      // That library holds ONLY an `id` line by design (§4.12's mechanical half
      // is a membership test), and `renderPacket` refuses by NAME on a Move
      // missing any rendered field — so reading it would make this case fail on
      // the Move contract rather than on its own subject. The record below
      // carries exactly the fields `MOVE_FIELDS_RENDERED` names, and nothing
      // asserted here reads any of them.
      const moveText = [`id: ${leg.move}`,
        "technique: a fixture technique, not this case's subject",
        "question: a fixture question, not this case's subject",
        "draws_on: a fixture foothold, not this case's subject",
        "breaks: a fixture break, not this case's subject", ""].join("\n");
      const row = readerKnowledgeLedger(brief.legs).find((r) => r.leg_id === legId);
      return renderPacket({ template: split.packet, brief, leg, moveText, priorSections: [],
        ledgerRow: row, section: sectionOfLeg(brief.legs).get(legId), sections: sectionsOf(brief.legs) });
    };
    const p1 = packetOf(doc1, "s2");
    if (p1.error) fails.push(`(b) a Packet could not be rendered from the composed Brief: ${p1.error}`);
    else {
      const text = p1.packet || p1.text || String(p1.out || "");
      // THE BLOCK IS PRESENT AND CARRIES THE ROWS AS PROSE — the property
      // acceptance 3 names, observed on a Leg that HAS rows.
      if (!/## This Leg's Closure/.test(text)) fails.push("(b) the rendered Packet carries no Closure block");
      if (!text.includes(`- ${R1}`)) fails.push(`(b) the Packet for s2 does not carry the row it discharges as prose`);
      if (!text.includes(`- ${R2}`)) fails.push(`(b) the Packet for s2 does not carry the row it concedes as prose`);
      if (!text.includes(`- ${THESIS}`)) fails.push("(b) the Packet for an establishing Leg does not carry the Thesis row");
      if (/This Leg carries no Closure row/.test(text)) fails.push("(b) a Leg WITH Closure rows rendered the stated absence — the empty branch is being taken where rows exist");
      // IDENTICAL ON TWO RUNS at the Packet layer too.
      const p2 = packetOf(doc2, "s2");
      const text2 = p2.error ? `error: ${p2.error}` : (p2.packet || p2.text || String(p2.out || ""));
      if (text2 !== text) fails.push("(b) two Packet renders of one composed Brief are not byte-identical (acceptance 7)");
    }
  }

  const startMismatch = validateLegs([leg1, leg2], "knowledge: a value leg1 never states");
  if (!startMismatch.error || !/reader_state_before/.test(startMismatch.error) || !/Reader start/.test(startMismatch.error)) {
    fails.push(`(b) validateLegs did not refuse naming both the Leg's reader_state_before and the Brief's Reader start: ${JSON.stringify(startMismatch)}`);
  }
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
  if (!badObl.error) fails.push("(b) a ledger entry introduced_by a non-leg was accepted");

  // (c) COUNT AFTER COMPOSITION (§5.2; §3's completeness rider): the count
  // is taken from the composed legs' PLACEMENTS, never from a declaration;
  // an unplaced selected Strand DISCLOSES and the fill still succeeds — a
  // disclosure, never a refusal.
  ranCase("c");
  const only2 = {
    legs: [leg1],
    // the declaration CLAIMS L1 is covered; the count must not believe it
    coverage: { L1: { role_in_thesis: "claimed but never placed" }, L2: { role_in_thesis: "states the claim" } },
  };
  const f2 = fillBrief(doc0, only2);
  if (f2.error) fails.push(`(c) a path leaving a Strand unused was refused — the three §4.4 moves include leaving it unused: ${f2.error}`);
  const doc2 = f2.doc || "";
  if (!/\*\*L1\*\* — \*\*UNPLACED, disclosed\*\*/.test(doc2)) fails.push("(c) the unplaced selected Strand does not disclose — a composer that cannot omit in principle can still omit in fact");
  if (!/placement count, taken AFTER composition, counted in placements: 1 of 2/.test(doc2)) fails.push("(c) the placement count is not 1 of 2 counted in placements from the legs themselves");
  if (f2.placed !== 1 || f2.total !== 2) fails.push(`(c) fill reported ${f2.placed}/${f2.total}, not 1/2`);
  // closed set: a foreign L-id in materials is a Brief fetch (§5.3).
  const foreign = fillBrief(doc0, { legs: [{ ...leg1, materials: ["L7"] }] });
  if (!foreign.error || !/closed Strand set/.test(foreign.error)) fails.push("(c) a material outside the closed set was accepted — growing the set routes through Terrain, never a Brief fetch");

  // THE JOURNEY'S SERVED-RECORD HALF (kogaki#1111 acceptance 1), which lives
  // at the FILL because it is a fact about the Brief rather than about the
  // Leg: L2 carries a journey cite in the minted fixture and L1 does not, so
  // a Journey claimed for L1 is a Journey the material does not have.
  {
    const noServed = fillBrief(doc0, { legs: [leg1,
      { ...leg2, journeys: [{ strand: "L1", use: "illustrate" }] }] });
    if (!noServed.error) {
      fails.push("(c) a Journey claimed for a Strand whose served record carries none was ACCEPTED — inventing Journey material for a Strand that has none is unsupported completion, in the one place the shape check cannot see it");
    } else if (!/L1/.test(noServed.error) || !/journey cite/.test(noServed.error)) {
      fails.push(`(c) the no-served-Journey refusal does not name the Strand and what the Brief renders for it: ${noServed.error}`);
    }
    // THE CONTROL: L2 DOES carry one, so the refusal above is the served-record
    // arm firing rather than the field being rejected at the fill outright.
    const served = fillBrief(doc0, { legs: [{ ...leg1, journeys: [{ strand: "L2", use: "illustrate" }] }, leg2] });
    if (served.error) fails.push(`(c) a Journey on the Strand that DOES carry served Journey material was refused, so the case above proves nothing: ${served.error}`);
    // AND THE COVERAGE ACCOUNTING MOVES WITH THE FIELD — THIS ASSERTION IS
    // REVERSED (kogaki#1131). It read the other way: kogaki#1111 declared
    // `journeys` and left the count on a `<L-id>.journey` token in `materials`,
    // and this case asserted that declaring the field moved the count NOT AT
    // ALL. That is exactly the two-reader split the first completed Brief was
    // caught in — four `journey:` lines rendered and five Strands disclosed as
    // OMITTED in one document — so the clause is reversed rather than deleted,
    // and the reversal is asserted here beside the retention it replaces.
    const before = fillBrief(doc0, { legs: [leg1, leg2] });
    if (!before.error && !served.error) {
      const line = (t) => (t.match(/^\*Journey placement count[^\n]*$/m) || [""])[0];
      if (!/0 of 1/.test(line(before.doc))) {
        fails.push(`(c) the path declaring no Journey does not read 0 of 1, so the comparison below proves nothing: ${line(before.doc)}`);
      }
      if (!/1 of 1/.test(line(served.doc))) {
        fails.push(`(c) declaring a Journey did NOT move the placement count — the count still reads a spelling in \`materials\` beside the field \`journeysRefusal\` validates and \`renderLeg\` renders, which is the second source that disagreed with the first (kogaki#1131): ${line(served.doc)}`);
      }
    }
  }

  // ACCEPTANCE 3: THE REVERSE OUTLINE COMPARES NO JOURNEY FIELD. A Journey is
  // material the Leg EDITS, so a reader cannot recover it and must not be
  // asked to — the Round Trip table gains no row, and the `claims` accounting
  // is unchanged. Asserted as an ABSENCE over the table's own data, which is the
  // only form this property has: there is no refusal to drive.
  //
  // THE SECOND HALF READS `claims` RATHER THAN `claims-unused` (kogaki#1132).
  // The row this clause named was the best-effort mechanical one, and it was
  // folded into the preserved `claims` row when that item became a per-declared
  // recovery question. What kogaki#1111 leaves unchanged is the same property
  // it always was: the claims accounting reads the Packet's claims block against
  // the Reverse Outline's claim lines, and a Journey enters neither side.
  {
    const items = JSON.parse(readFileSync(join(REPO_ROOT, "src", "review-items.json"), "utf8")).items;
    const jrows = items.filter((it) => /journey/i.test(JSON.stringify(it)));
    if (jrows.length) {
      fails.push(`(c) src/review-items.json carries ${jrows.length} row(s) mentioning a Journey (${jrows.map((r) => r.id).join(", ")}) — a Journey asserts nothing, so the Reverse Outline has no Journey field to compare and the Blind Reader would be asked to recover material rather than a claim`);
    }
    const claimsRow = items.find((it) => it.id === "claims");
    if (!claimsRow || claimsRow.field !== "claims" || claimsRow.declared_block !== "claims") {
      fails.push(`(c) the claims row moved — kogaki#1111 leaves the claims accounting unchanged: ${JSON.stringify(claimsRow)}`);
    }
    if (items.some((it) => it.id === "claims-unused")) {
      fails.push("(c) a `claims-unused` row is back in src/review-items.json — kogaki#1132 folded it into the preserved `claims` row, and a second row reading the same two sides is the split that let a lost claim go unnamed to the correction");
    }
  }

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
  ranCase("d");
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
  const mkCand = (id, exp, rawLegs) => {
    const readerStart = `knowledge: ${id} the reader treats the case as one team's habit`;
    // READER START BINDS THE FIRST LEG (kogaki#1151): candA and candB must
    // still differ on `reader_start` (case l-reader-fields' whole point), so
    // the override lands on THIS Candidate's own first Leg rather than
    // sharing one literal across every mkCand() caller.
    const legs = rawLegs.map((s, i) => i === 0 ? { ...s, reader_state_before: readerStart } : s);
    return {
      // `characteristic` IS DERIVED FROM THE ID, which keeps every fixture set
      // distinct at the label without a second argument to thread through every
      // call site (kogaki#1126). Cases that need a SPECIFIC characteristic --
      // the bound, the fold, the rendered shape -- override it on the built
      // object, where what is being asserted is visible beside the assertion.
      candidate_id: id, characteristic: `Path ${id}`, reader_experience: exp, legs,
      reader_start: readerStart,
      reader_target: `${id}: the reader treats it as a property of the shape`,
      opening_question: `${id}: why did the same fix land twice?`,
      review: mkReview(),
      reasoning: {
        leg_validity: `${id}: each leg's claims were traced`,
        transition_continuity: `${id}: each after-state feeds the next before-state`,
        thesis_closure: `${id}: the claim is established by the final leg`,
      },
      coverage: { L2: { role_in_thesis: "states the claim" }, L1: { role_in_thesis: "carries the case" } },
      // CLOSURE (kogaki#1151): every row ends discharged_by or conceded_by.
      obligations: [{ text: "the case's generality is asserted", introduced_by: legs[legs.length - 1].leg_id, discharged_by: legs[legs.length - 1].leg_id }],
    };
  };
  const candA = mkCand("cand-1", "claim first, then the case", [leg1, leg2]);
  const candB = mkCand("cand-2", "the case first, claim emerging from it", [
    { ...leg1, leg_id: "t1", materials: ["L1"], claims: [{ type: "strand", strand: "L1", proposition: "the bravo lesson records the concrete case" }] },
    { ...leg2, leg_id: "t2", move: "generalize-from-the-seen-case", materials: ["L2"], depends_on: ["t1"],
      claims: [{ type: "strand", strand: "L2", proposition: "the alpha lesson states the claim the case generalizes to" }], entailed: undefined, entailment_reasoning: undefined },
  ]);
  candB.obligations = [{ text: "the claim's scope beyond the case", introduced_by: "t2", discharged_by: "t2" }];

  // (e) ASSEMBLY: 2-3 Candidates differing in reader experience; the count
  // and the difference are the contract; the payload rides the record shape
  // with per-Candidate evidence and the first-class negation.
  ranCase("e");
  const one = assembleSelection({ candidates: [candA] }, doc0);
  if (!one.error || !/1 Candidate/.test(one.error)) fails.push("(e) a single Candidate was presented — a default in disguise (§6: two to three)");
  const four = assembleSelection({ candidates: [candA, candB, mkCand("cand-3", "x3", [leg1]), mkCand("cand-4", "x4", [leg1])] }, doc0);
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
  const noRev = JSON.parse(JSON.stringify(candB)); delete noRev.review.rationale_stands;
  const nv = assembleSelection({ candidates: [candA, noRev] }, doc0);
  if (!nv.error || !/unreviewed/.test(nv.error)) fails.push("(e) an unreviewed Candidate was presentable at the selection gate");
  const ok = assembleSelection({ candidates: [candA, candB] }, doc0);
  if (ok.error) fails.push(`(e) a conforming Candidate set was refused: ${ok.error}`);
  const pay = ok.payload || {};
  for (const f of ["where", "why", "label", "options", "free_text"]) if (!(f in pay)) fails.push(`(e) the payload lacks record field ${JSON.stringify(f)} — Candidates ride the proposal-contract shape (§6)`);
  // (w1) §4.16's FIGURE CLAUSE REACHES THE OPTION LABEL (kogaki#877,
  // acceptance 3). ASSERTED AT THE ACT AND NOT AT THE COMPOSER: (w) below
  // proves `figureClause` computes the count, the set and the warning, and a
  // mutation that dropped the clause from the label survived every one of those
  // assertions — the composer was green while the surface the acceptance names
  // rendered nothing. `installed`, `current` and `fires` are not `acts`, and
  // the label is the act.
  ranCase("w1");
  {
    const figLeg = (st, n) => ({ ...st, figure: `what figure ${n} lets the reader hold`,
                                  figure_roles: { endpoint_a: "g1" } });
    // THE CLAUSE IS READ WHERE IT IS NOW RENDERED (kogaki#1126): the option's
    // DESCRIPTION. The property this case asserts is unchanged -- the figure
    // count, the set and the soft warning reach the owner at the selection gate
    // -- and only the seat moved, because the label now carries the path's
    // short name. Reading the label would make every assertion below vacuous,
    // which is the shape the case's own comment above warns about.
    const label = (cand) => ((assembleSelection({ candidates: [cand, candB] }, doc0).payload || {}).options || [])
      .find((o) => o.id === cand.candidate_id)?.description || "";
    const none = label(candA);
    if (!/no Leg carries a figure/.test(none)) {
      fails.push(`(w1) a Candidate declaring no figure does not disclose that at the gate — an absent clause and a clause reading none are the same silence to a reader: ${none}`);
    }
    const twoFig = label({ ...candA, candidate_id: "cand-fig2",
      legs: candA.legs.map((st, i) => figLeg(st, i + 1)) });
    if (!/2 Leg\(s\) carry a figure/.test(twoFig)) {
      fails.push(`(w1) the figure count does not reach the option description (acceptance 3, kogaki#1126): ${twoFig}`);
    }
    if (/second look/.test(twoFig)) {
      fails.push(`(w1) two figures warn at the gate — the soft warning is ABOVE three: ${twoFig}`);
    }
    // FOUR figure-carrying Legs WARN IN THE LABEL, and the Candidate stays
    // SELECTABLE — the warning has no target and refuses nothing (D11).
    const fourLegs = ["f1", "f2", "f3", "f4"].map((id, i) =>
      figLeg({ ...candA.legs[0], leg_id: id, depends_on: [], opens_section: i === 0 ? "Opening" : undefined }, i + 1));
    const fourCand = { ...candA, candidate_id: "cand-fig4", legs: fourLegs,
      obligations: [{ text: "the case's generality is asserted", introduced_by: "f4" }] };
    const fourAsm = assembleSelection({ candidates: [fourCand, candB] }, doc0);
    if (fourAsm.error) {
      fails.push(`(w1) a Candidate with four figures was REFUSED — the warning has no target and refuses nothing (D11): ${fourAsm.error}`);
    } else {
      const l4 = (fourAsm.payload.options || []).find((o) => o.id === "cand-fig4")?.description || "";
      if (!/4 Leg\(s\) carry a figure/.test(l4) || !/second look/.test(l4)) {
        fails.push(`(w1) four figure-carrying Legs do not show the warning IN THE DESCRIPTION (acceptance 3, kogaki#1126): ${l4}`);
      }
    }
  }
  // (w2) THE FIGURE CLAUSE'S LEG IDS ARE ADMISSIBLE, AND ONLY THEY ARE
  // (kogaki#934). §4.16 mandates rendering leg ids into the option label and
  // the label is walked by the spec-internal-vocabulary tripwire, whose
  // identifier pattern matches ANY snake_case token — so a figure on a Leg
  // whose id is snake_case made `assembleSelection` return the leak error and
  // produce NO PAYLOAD AT ALL: the whole gate refused, on every option, because
  // of one Leg's name. Every fixture in (w) and (w1) uses `s1`/`f1`-style ids,
  // which is exactly the id shape that cannot trip the wire, so the case was
  // green over the only shape that was safe. Asserted in BOTH directions, per
  // acceptance items 2 and 3: the mandated caller passes, and the wire stays
  // armed over everything the caller did not produce.
  ranCase("w2");
  {
    const snakeLegs = [
      { ...leg1, leg_id: "open_the_claim",
        figure: "what the opening figure lets the reader hold",
        figure_roles: { endpoint_a: "g1" } },
      { ...leg2, leg_id: "close_the_case", depends_on: ["open_the_claim"],
        claims: [{ type: "strand", strand: "L1", proposition: "the bravo lesson records the case that closes the claim" }] },
    ];
    const snakeCand = { ...candA, candidate_id: "cand-snake", legs: snakeLegs,
      obligations: [{ text: "the case's generality is asserted", introduced_by: "close_the_case" }] };
    // DIRECTION 1 — the mandated caller assembles, and the whole option set is
    // present. Asserting only that the label renders would miss the defect's
    // actual shape: the refusal returned no payload, so EVERY option vanished.
    const snakeAsm = assembleSelection({ candidates: [snakeCand, candB] }, doc0);
    if (snakeAsm.error) {
      fails.push(`(w2) a Candidate carrying a figure on a snake_case leg_id was REFUSED — §4.16 mandates rendering the id into the label, so the tripwire is refusing its own mandated caller: ${snakeAsm.error}`);
    } else {
      const ids = (snakeAsm.payload.options || []).map((o) => o.id);
      for (const want of ["cand-snake", "cand-2", "none-of-these"]) {
        if (!ids.includes(want)) fails.push(`(w2) option ${want} is missing from the gate a snake_case leg_id assembled — the refusal took the whole option set, not one label`);
      }
      const ls = (snakeAsm.payload.options || []).find((o) => o.id === "cand-snake")?.description || "";
      if (!/open_the_claim/.test(ls)) {
        fails.push(`(w2) the figure-carrying Leg's id does not reach the description — the repair is an override on the wire, not a removal of the disclosure §4.16 sites here, and kogaki#1126 moved the clause to the seat the override must now cover: ${ls}`);
      }
    }
    // DIRECTION 2 — THE WIRE IS STILL ARMED IN THAT SAME LABEL. A term of art
    // the Candidate did not author is caught exactly as before. Without this the
    // repair is indistinguishable from disarming the wire (acceptance item 3).
    const leaky = { ...snakeCand, candidate_id: "cand-snake-leak",
      reader_experience: "claim first, and the thesis_closure is what carries it" };
    const leakAsm = assembleSelection({ candidates: [leaky, candB] }, doc0);
    if (!leakAsm.error || !/thesis_closure/.test(leakAsm.error || "")) {
      fails.push("(w2) a genuine spec-internal term in the SAME label a leg id was exempted from was NOT caught — the override disarmed the wire instead of narrowing it");
    }
    // THE OVERRIDE IS PER-OPTION. cand-snake's ids license nothing in another
    // Candidate's label, where nothing produced them — an override scoped to the
    // payload rather than to its producer would be an allowlist by spelling.
    const borrower = { ...candB, candidate_id: "cand-borrow",
      reader_experience: "the case first, reached by open_the_claim" };
    const borrowAsm = assembleSelection({ candidates: [snakeCand, borrower] }, doc0);
    if (!borrowAsm.error || !/open_the_claim/.test(borrowAsm.error || "")) {
      fails.push("(w2) one Candidate's leg id was exempt in ANOTHER Candidate's label — the override is scoped to the option whose own data produced the token");
    }
    // AND IT REACHES ONE SURFACE. `o.rendering` and the ask's own fields are
    // composed by the code, not by the author, so no token there is ever exempt:
    // a leak that escaped by moving into a field the predicate stopped walking is
    // the failure a tripwire exists to make impossible (kogaki#568).
    const bare = denyInternalVocabulary({
      where: "w", why: "y", label: "l", free_text: { prompt: "p" },
      options: [{ id: "cand-snake", label: "clean", rendering: ["the open_the_claim paragraph"] }],
    }, new Map([["cand-snake", new Set(["open_the_claim"])]]));
    if (!bare.error || !/open_the_claim/.test(bare.error || "")) {
      fails.push("(w2) an exempted token was skipped in a surface OTHER than the option label — the override reaches the label its producer writes and nothing else");
    }
  }
  // (ao) THE CANDIDATE OPTION'S FORMAT IS THE HARNESS'S, AND THE ID IS NEVER
  // CONTENT (kogaki#1126, acceptance items 2 and 4).
  //
  // WHAT WAS MEASURED, at the Candidate gate of
  // runs/brief/brief-2026-09-15T22-53-48-359Z: three options whose label held
  // the whole reader experience plus the figure clause, and whose DESCRIPTION
  // column read `A`, `B`, `C` — the record ids, shown because `composeGateCall`
  // falls back to an option's id where it carries no description. Two halves of
  // that rendering were right — a short characteristic, then its explanation —
  // and both were the composing Model's habit inside one free-prose field.
  //
  // SO WHAT IS PINNED HERE IS THE SHAPE, NOT THE PROSE. The label is
  // `<position>. <characteristic>` composed by `assembleSelection` from a
  // declared field; the description is the explanation with the Harness's own
  // figure clause; and no option's description is its id. A Model that writes
  // its characteristic as a paragraph changes the CONTENT of the label and
  // cannot change its shape, which is the whole of what a Harness-enforced
  // format buys — so a mutation that put the two back in one field, or that
  // restored the id fallback, is red here rather than on the owner's screen.
  ranCase("ao-candidate-option-format");
  {
    const fmt = assembleSelection({ candidates: [candA, candB] }, doc0);
    if (fmt.error) fails.push(`(ao) the two-Candidate fixture is unpresentable: ${fmt.error}`);
    else {
      const opts = (fmt.payload.options || []).filter((o) => !o.negates_premise);
      // THE POSITION IS THE POSITION, checked against the rendered ORDER rather
      // than against a candidate id or an index this assertion computes its own
      // way. `<n>` numbering from 1 is what lets an owner say "the third one".
      opts.forEach((o, i) => {
        const cand = [candA, candB].find((c) => c.candidate_id === o.id);
        const want = `${i + 1}. ${cand.characteristic}`;
        if (o.label !== want) {
          fails.push(`(ao) option ${o.id}'s label is ${JSON.stringify(o.label)} and the declared format is `
            + `\`<n>. <characteristic>\` — wanted ${JSON.stringify(want)} (kogaki#1126)`);
        }
        if (!String(o.description || "").startsWith(cand.reader_experience)) {
          fails.push(`(ao) option ${o.id}'s description does not open with its reader_experience — the `
            + `explanation is the description's own field and the Harness appends only the figure `
            + `clause: ${JSON.stringify(String(o.description || "").slice(0, 80))}`);
        }
      });
      // THE ID IS NOT CONTENT, ON EVERY OPTION INCLUDING THE NEGATION. Asserted
      // over the whole set rather than over the Candidates alone: the defect is
      // a FALLBACK, so the option that is easiest to leave without a description
      // is exactly the one a repair scoped to Candidates would miss.
      for (const o of (fmt.payload.options || [])) {
        if (typeof o.description !== "string" || o.description.trim() === "") {
          fails.push(`(ao) option ${o.id} carries no description — an option without one renders its id, `
            + "which is the join key the owner's answer resolves through and never content");
        } else if (o.description.trim() === o.id) {
          fails.push(`(ao) option ${o.id}'s description IS its id — the A/B/C column kogaki#1126 closes`);
        }
        if (o.label.trim() === o.id) fails.push(`(ao) option ${o.id}'s label IS its id`);
      }
    }
    // THE THREE REFUSALS THE SCHEMA DECLARES. Each is asserted on its own
    // mutation of a fixture that otherwise passes, so a refusal that stopped
    // firing cannot hide behind one that still does.
    const blankChar = assembleSelection(
      { candidates: [candA, { ...JSON.parse(JSON.stringify(candB)), characteristic: "  \t " }] }, doc0);
    if (!blankChar.error || !/characteristic is required and cannot be blank/.test(blankChar.error)) {
      fails.push("(ao) a whitespace-only characteristic was accepted — the label is composed from it, so the option renders as a bare number");
    }
    const bound = characteristicMaxLength();
    const overLong = assembleSelection(
      { candidates: [candA, { ...JSON.parse(JSON.stringify(candB)), characteristic: "x".repeat(bound + 1) }] }, doc0);
    if (!overLong.error || !new RegExp(`bounds it at ${bound}`).test(overLong.error)) {
      fails.push(`(ao) a characteristic of ${bound + 1} characters was accepted against a declared bound of ${bound}`);
    }
    // AND THE BOUND IS THE SCHEMA'S, READ RATHER THAN TYPED TWICE. This is the
    // property the schema file exists for — the text the judge composes against
    // and the text the refusal enforces are one file — and without this line
    // the pair could drift to two numbers with every assertion above still
    // green, because each of them reads the same side.
    const declaredBound = JSON.parse(readFileSync(CANDIDATE_SCHEMA_PATH, "utf8"))?.fields?.characteristic?.max_length;
    if (declaredBound !== bound) {
      fails.push(`(ao) the refusal binds at ${bound} and src/candidate-schema.json declares ${JSON.stringify(declaredBound)} — the prompt and the refusal are two numbers`);
    }
    const sameChar = assembleSelection(
      { candidates: [candA, { ...JSON.parse(JSON.stringify(candB)), characteristic: candA.characteristic }] }, doc0);
    if (!sameChar.error || !/SAME characteristic/.test(sameChar.error)) {
      fails.push("(ao) two Candidates with one characteristic were presented as two — they render as two options the owner cannot tell apart at the label");
    }
    // THE OBLIGATION IS DECLARED AT THE GATE AND ENFORCED BY THE COMPOSER. The
    // registry row is what makes an undescribed option `unavailable` rather than
    // a silent id, and a row nothing reads is a declaration wearing a check.
    const reg = JSON.parse(readFileSync("src/gate-registry.json", "utf8"));
    const gate = (reg.gates || []).find((g) => g.id === "brief-candidate-selection");
    if (gate?.option_descriptions_required !== true) {
      fails.push("(ao) brief-candidate-selection does not declare `option_descriptions_required` — without the row the composer falls back to the id and nothing goes red");
    } else {
      const stripped = JSON.parse(JSON.stringify(gate));
      for (const o of stripped.options) delete o.description;
      const refused = composeGateCall(stripped);
      if (!refused.unavailable || !/carry no description/.test(refused.unavailable)) {
        fails.push(`(ao) the composer admitted a declared-descriptions gate whose option carries none — the id fallback is still reachable: ${JSON.stringify(refused.unavailable || "admitted")}`);
      }
      const live = composeGateCall(gate);
      if (!live.tool_input) {
        fails.push(`(ao) the live registry row composes no call: ${live.unavailable || live.over_bound || live.refused}`);
      } else {
        const ids = new Set((gate.options || []).map((o) => o.id));
        for (const o of live.tool_input.questions[0].options) {
          if (ids.has(String(o.description).trim())) {
            fails.push(`(ao) the composed call shows an option id in the description column: ${JSON.stringify(o.description)}`);
          }
        }
      }
    }
  }
  const negOpt = (pay.options || []).find((o) => o.negates_premise === true);
  if (!negOpt) fails.push("(e) no option flagged negates_premise — the premise's negation is first-class (§6)");
  // READ OVER BOTH SEATS (kogaki#1126). The negation's label is now the answer
  // ("None of these") and its description is what answering it does, split at
  // the same seam as every Candidate option so the owner reads one shape down
  // the column. The PROPERTY is untouched -- the premise it negates is stated
  // where the owner reads it -- so the assertion reads the option rather than
  // one of its fields, which is also what keeps it from going red the next time
  // the split moves.
  else if (!/Thesis or the selected set/.test(`${negOpt.label} ${negOpt.description || ""}`)) {
    fails.push("(e) the negation option does not state the premise it negates");
  }
  // THE SHARED EFFECT IS CARRIED, not merely absent from the labels. Dropping
  // the prefix without stating the effect anywhere would satisfy every
  // no-repetition assertion below and leave the owner not knowing what
  // answering does — the failure proposal-contract §2.2 exists to prevent, and
  // the reason the two halves are asserted together rather than one of them.
  if (!/Reader Path/.test(pay.label || "") || !/Brief's sequence/.test(pay.label || "")) {
    fails.push("(e) the gate's own label does not state what adopting an option does — the effect states ONCE, and once is not zero (kogaki#568, proposal-contract §2.2)");
  }
  if (pay.free_text?.accepted !== true) fails.push("(e) the free-text channel is not unconditionally accepted");
  // THE ASSERTION BINDS THE PROPERTY, NOT THE PHRASE (kogaki#950). This read
  // `/does not discharge/` and so bound one sentence's wording rather than what
  // §6 rules: the free-text channel does not stand in for the first-class
  // negation. When the prompt was reworded to carry v35's comment reading, the
  // property was stated MORE strongly — only the two typed arms decide, so free
  // text discharges neither — and the phrase-shaped test went red on copy that
  // satisfied it. That is the proxy-binding shape this repository records at
  // length; the fix is the binding, and the accepted form is either the
  // explicit disclaimer or a statement that the arms are what decide.
  const negUndischarged = /does not discharge/.test(pay.free_text?.prompt || "")
    || (/none-of-these/.test(pay.free_text?.prompt || "") && /\bdecides\b|\bdecide\b/.test(pay.free_text?.prompt || ""));
  if (!negUndischarged) fails.push("(e) the free-text prompt does not state that it leaves the negation undischarged — say so outright, or say that selecting a Candidate or answering none-of-these is what decides");
  // THE OPTION CARRIES ITS ID AND ITS LABEL AND NOTHING ELSE (§6 as amended,
  // kogaki#859 owner ruling 2026-09-04). This assertion REQUIRED the five
  // composition-time items on every option until that ruling; it is INVERTED
  // here rather than deleted, on the ruling's own general position — "the run
  // record holds what a later act reads … an entry with no reader is
  // unnecessary data and is refused, not tolerated". What replaces it is the
  // same property one layer down: the items are still DERIVED per Candidate,
  // asserted directly against `candidateEvidence` below and at (i), so the
  // computation keeps its evidence while the payload stops copying it out.
  for (const o of (pay.options || []).filter((x) => !x.negates_premise)) {
    if ("evidence" in o) fails.push(`(e) option ${o.id} carries an evidence object — the payload copies no reasoning out of the reviewed Candidates (§6, kogaki#859)`);
    // `description` JOINS THE ALLOWED SET, AND THE SET IS STILL CLOSED
    // (kogaki#1126). kogaki#859's ruling is about the payload copying REASONING
    // out of the reviewed Candidates, and it is untouched: the evidence object
    // stays refused one line up. What this admits is the second half of the
    // option the owner reads -- the explanation beside the path's name -- which
    // is composed by `assembleSelection` from a declared field rather than
    // copied from anything. The list stays an allowlist, so key N+1 is refused
    // by default exactly as before.
    const extra = Object.keys(o).filter((k) => !["id", "label", "description", "rendering"].includes(k));
    if (extra.length) fails.push(`(e) option ${o.id} carries ${JSON.stringify(extra)} — the option is its id, its label and its description, with the bounded rendering key and nothing else (kogaki#859, kogaki#1126)`);
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
  }
  // candB places only L1+L2 across two legs; candA the same — per-candidate
  // placement counts must come from each Candidate's OWN legs.
  const oneStrand = assembleSelection({ candidates: [mkCand("cand-5", "only the claim, no case", [leg1]), candB] }, doc0);
  // RE-POINTED AT THE DERIVATION (kogaki#859): the count no longer rides the
  // payload, so it is read where it is computed. The property is unchanged and
  // is the one that mattered — per Candidate, from its OWN legs — and the
  // assembly call is kept beside it so a Candidate placing one of two Strands
  // is still driven through the payload path rather than only through the
  // function.
  if (!(oneStrand.payload?.options || []).some((o) => o.id === "cand-5")) fails.push("(e) a one-Strand Candidate did not reach the gate at all");
  const ev5 = candidateEvidence(mkCand("cand-5", "only the claim, no case", [leg1]), ["L1", "L2"], []);
  if (!/1 of 2/.test(ev5.placement_count || "")) fails.push("(e) a Candidate placing one of two Strands does not derive '1 of 2' — the count is per Candidate, from its own legs");

  // (f) ADOPTION: the adopted Candidate's Reader Path lands in the Brief's
  // sequence; Closure's Thesis row and tradeoffs fill from its reasoning (§5.1/§5.2).
  ranCase("f");
  const ad = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", inst(candB, {}, { candidates: [candA, candB] }));
  if (ad.error) fails.push(`(f) adopting a reviewed Candidate was refused: ${ad.error}`);
  const doc3 = ad.doc || "";
  if (!/```leg\nleg_id: t1/.test(doc3)) fails.push("(f) the adopted Candidate's Reader Path did not land in the Brief's sequence");
  if (/```leg\nleg_id: s1/.test(doc3)) fails.push("(f) a DECLINED Candidate's legs landed in the Brief");
  if (!/### Thesis\n\ncand-2: the claim is established by the final leg/.test(doc3)) fails.push("(f) the Closure Thesis row did not fill from the adopted Candidate's reasoning");
  if (!/established_by_legs: t1, t2/.test(doc3)) fails.push("(f) the Closure Thesis row does not carry established_by_legs");
  if (!/introduced_by: t2; discharged_by: t2/.test(doc3)) fails.push("(f) the Closure Leg row does not carry the adopted Candidate's obligations");
  if (/## Tradeoffs\n\n\*\(awaiting composition\)\*/.test(doc3)) fails.push("(f) tradeoffs is still an unfilled slot after adoption");
  const noSuch = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-9");
  if (!noSuch.error || !/not in the reviewed set/.test(noSuch.error)) fails.push("(f) adopting a Candidate the gate never offered was accepted");

  // (r) THE POST-HOC DISCLOSURE SLOT (kogaki#866, ratified at §4.11/§6.1 by
  // kogaki#864). §4.11 approves a Bridge by disclosing it after the fact; that
  // disclosure rode the gate's evidence rendering until kogaki#859 emptied it,
  // and the ruling moved it here. What this asserts is the ACT — the slot is
  // present and unfilled before adoption, adoption fills it, and it carries the
  // ADOPTED Candidate's values — because a slot that renders and never fills is
  // the fires-but-does-not-act shape this whole decision was raised against.
  ranCase("r-posthoc");
  {
    // AC1 — present and UNFILLED before adoption. Asserted apart from the fill,
    // so a slot that was never minted and one that was minted-and-filled cannot
    // both pass the same test.
    if (!/## What this path bridged/.test(doc0)) {
      fails.push("(r) the minted Brief carries no disclosure slot — §4.11's post-hoc approval has no surface (kogaki#864)");
    } else if (!/## What this path bridged\n\n\*\(awaiting composition\)\*/.test(doc0)) {
      fails.push("(r) the disclosure slot is not an unfilled slot at mint — every composition field is typed-unfilled until its act (§5.3)");
    }
    // AC2 — adoption fills it, and with the BRIDGE half of a path that bridged.
    // Built from candB's OWN legs rather than re-composed: the fixture under
    // test is the disclosure, not leg validity, and re-composing a path here
    // put a `depends_on` out of order and failed for a reason unrelated to
    // anything (r) asserts.
    const bcand = JSON.parse(JSON.stringify(candB));
    bcand.legs[1].bridges = ["t1", "t2"];
    const bad = adoptCandidate(doc0, { candidates: [candA, bcand] }, "cand-2", inst(bcand, {}, { candidates: [candA, bcand] }));
    if (bad.error) fails.push(`(r) adopting a Candidate that bridged was refused: ${bad.error}`);
    else {
      const bdoc = bad.doc || "";
      if (/## What this path bridged\n\n\*\(awaiting composition\)\*/.test(bdoc)) {
        fails.push("(r) the disclosure slot is still unfilled after adoption — it renders and never acts, which is the defect kogaki#864 was raised on");
      }
      if (!/bridge\(s\) inserted/.test(bdoc)) fails.push("(r) the filled slot does not state what was bridged");
      // AC4 — the journey half rides the SAME slot, vacuous rather than absent.
      //
      // BOUND TO THE FIGURE, NOT TO THE WORD, and this is a repair recorded
      // rather than a first draft: the assertion read `/[Jj]ourney/` over the
      // slot's segment and passed while the journey half was DELETED from the
      // fill, because the slot's own CAPTION contains the word "journey". It
      // matched the caption this commit wrote, which is the assertion-binds-a-
      // proxy shape — and the proxy here was introduced by the very change
      // under test. It now asserts the value `candidateEvidence` derives, which
      // no caption can supply.
      const seg = (bdoc.split("## What this path bridged")[1] || "").split("\n## ")[0];
      const want = candidateEvidence(bcand, selectedStrands(doc0), journeyBearingStrands(doc0)).journey_coverage;
      if (!seg.includes(want)) {
        fails.push(`(r) the journey half is absent from the slot — §6.1 rides §4.11's slot, and an empty disclosure is not a missing one; wanted ${JSON.stringify(want.slice(0, 60))}`);
      }
    }
    // AC3 — a path that bridged NOTHING fills without erroring and without
    // claiming a bridge. The vacuous case is the one a fill written for the
    // happy path silently gets wrong.
    const nbd = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", inst(candB, {}, { candidates: [candA, candB] }));
    if (nbd.error) fails.push(`(r) adopting a Candidate that bridged nothing was refused: ${nbd.error}`);
    else {
      const ndoc = nbd.doc || "";
      if (/## What this path bridged\n\n\*\(awaiting composition\)\*/.test(ndoc)) fails.push("(r) an unbridged path left the slot unfilled — vacuous is not absent");
      if (/[1-9]\d* bridge\(s\) inserted/.test(ndoc)) fails.push("(r) an unbridged path claims a bridge");
    }
    // AC5 — THE VALUES ARE THE ADOPTED CANDIDATE'S, and ONLY `candidateId`
    // VARIES. The first draft adopted from two DIFFERENT sets — candB out of
    // [candA, candB] and the bridging one out of [candA, bcand] — so a fill
    // derived from the whole reviewed set would have produced two different
    // segments and passed. That binds "the fill depends on something", not
    // "the fill is the adopted Candidate's": the assertion-binds-a-proxy shape
    // AC4 above already records, found again one case over.
    //
    // ONE set, both Candidates in it under distinct ids, one bridging and one
    // not, and the only thing that changes between the two calls is which id is
    // adopted. A set-derived fill now yields the SAME segment twice and fails.
    const b2 = JSON.parse(JSON.stringify(candB));
    b2.candidate_id = "cand-3";
    // The clone takes candB's characteristic too, and the set below presents
    // all three at once, so the label-distinctness refusal (kogaki#1126) applies
    // exactly as the experience one already did.
    b2.characteristic = "The gap, named where it is met";
    b2.reader_experience = "the case first, with the gap named where the reader meets it";
    b2.legs[1].bridges = ["t1", "t2"];
    const oneSet = { candidates: [candA, candB, b2] };
    const segOf = (d) => ((d || "").split("## What this path bridged")[1] || "").split("\n## ")[0];
    const plainAd = adoptCandidate(doc0, oneSet, "cand-2", inst(candB, {}, oneSet));
    const bridgeAd = adoptCandidate(doc0, oneSet, "cand-3", inst(b2, {}, oneSet));
    if (plainAd.error) fails.push(`(r) adopting the unbridged Candidate from the shared set was refused: ${plainAd.error}`);
    else if (bridgeAd.error) fails.push(`(r) adopting the bridging Candidate from the shared set was refused: ${bridgeAd.error}`);
    else if (segOf(plainAd.doc) === segOf(bridgeAd.doc)) {
      fails.push("(r) two Candidates from ONE set disclose identically when only the adopted id differs — the slot carries the SET's values, not the ADOPTED Candidate's");
    }
    // #866 item 4's last clause, asserted rather than left to hold by accident:
    // the Brief-side vocabulary tripwire reaches the new caption. It is true
    // today only because `composeBrief` throws at mint and every case above
    // mints doc0 — a refactor moving the caption off the guarded set would lose
    // the coverage with nothing going red.
    if (findInternalVocabulary(SLOT_CAPTIONS.get("What this path bridged") || "")) {
      fails.push("(r) the disclosure slot's caption carries spec-internal vocabulary — the owner reads this heading and holds none of this codebase's names");
    }
  }

  // (g) COMMAND PATHS agree with the exported functions.
  ranCase("g");
  const rvf = join(dir, "reviewed.json"); const ouf = join(dir, "payload.json");
  writeFileSync(rvf, JSON.stringify({ candidates: [candA, candB] }));
  const bp2 = join(dir, "brief-adopt.md"); writeFileSync(bp2, doc0);
  const p1 = spawnSync(process.execPath, ["src/assemble.mjs", "assemble", "--reviewed", rvf, "--brief", briefPath, "--out", ouf], { encoding: "utf8" });
  if (p1.status !== 0) fails.push(`(g) assemble exited ${p1.status}: ${(p1.stderr || "").trim()}`);
  else if (JSON.stringify(JSON.parse(readFileSync(ouf, "utf8"))) !== JSON.stringify(pay)) fails.push("(g) the command's payload differs from the exported function's — two producers");
  if (!/never a verdict/.test(p1.stdout || "")) fails.push("(g) assemble does not state the no-verdict property in its own output");
  const spf = join(dir, "specialization.json");
  writeFileSync(spf, JSON.stringify(spec(candB)));
  // §6's GATE, THROUGH THE REAL TWO-LEG FLOW (kogaki#891) — the same
  // declare-then-capture discipline §4.12.3 established, driven through the
  // command path so the executor is exercised rather than a hand-written
  // capture testing `validateOwnerAnswer` twice and the executor never.
  ranCase("g6");
  // §6's GATE, AS THE TABLE RAISES IT (kogaki#1108). `assemble.mjs
  // gate-candidate` is DELETED: under `src/brief-workflow.json` the executor
  // composes this gate's declaration at its `CANDIDATE_SELECTION` wait from
  // `selectionOptionIds`, and `.claude/hooks/write-gate-capture.py` writes the
  // row. So the OPTION SET and the FREE-TEXT PROMPT are asserted on the payload
  // the composer produces — which is the object the executor's GATE_WORK reads
  // and the harness renders from — and the ANSWERS are written in the harness's
  // own row shape.
  //
  // WHAT MOVED AND WHAT DID NOT. The assertions below are the ones this case
  // has always made; only their SOURCE moved, from a command's stdout to the
  // composed payload. That is not a weakening: the declaration the executor
  // emits is `{...registered, options: [...dynamic, ...standing]}`, so the
  // payload's options ARE the rendered options, and a paraphrase between the
  // two is impossible rather than merely refused.
  const selOffered = selectionOptionIds({ candidates: [candA, candB] }, doc0);
  if (selOffered.error) fails.push(`(g6) the selection option set could not be composed: ${selOffered.error}`);
  else {
    // THE CANDIDATES REACH THE SCREEN, for the reason §4.12.3's own arm gives:
    // a gate that renders no options is a gate over nothing.
    for (const id of ["cand-1", "cand-2", "none-of-these"]) {
      if (!selOffered.ids.includes(id)) fails.push(`(g6) the composed option set does not carry option ${id} — the owner would choose among options they were never shown`);
    }
    // THE STANDING NEGATION IS LAST, which is what makes the digest the gate
    // composer takes and the digest adoption re-derives one number: the
    // executor merges the registry's standing option AFTER the run's own, and
    // this composer emits them in that same order.
    if (selOffered.ids[selOffered.ids.length - 1] !== "none-of-these") {
      fails.push("(g6) the premise negation is not the last option — the executor appends the registry's standing option after the run's own, so a different order here digests differently from what the harness captures against");
    }
  }
  // THE PROMPT THE OWNER READS BEFORE ANSWERING CARRIES WHAT THE RUNTIME DOES
  // (kogaki#950). The free-text refusal below is bound at length, and it is
  // read AFTER the answer; this prompt is read BEFORE it, so a prompt promising
  // adoption delivers the repaired refusal to an owner who was told it would
  // not happen.
  //
  // POSITIVE, NOT ONLY NEGATIVE, for the reason this file states once for
  // itself: asserting only the absence of "recorded as your ruling" passes on a
  // prompt that deleted the sentence, leaving the channel with no stated
  // reading at all. So the three properties v35 rules are each anchored — free
  // text adopts nothing, the two arms that DO decide are named, and the owner
  // is told they come back here — and the false promise is refused beside them.
  const freePrompt = ((selOffered.payload || {}).free_text || {}).prompt || "";
  if (!freePrompt) fails.push("(g6) the composed payload carries no free-text prompt — the channel is offered with nothing said about what it does");
  else {
    if (/recorded as your ruling|as your ruling|is your ruling/i.test(freePrompt)) {
      fails.push(`(g6) the \u00a76 free-text prompt still tells the owner their words are recorded as a ruling, which SPEC-draft-pipeline v35 rules they are not — adoption refuses free text and writes no Reader Path: ${JSON.stringify(freePrompt)}`);
    }
    if (!/adopts no Reader Path|adopts nothing|is a COMMENT|is a comment/.test(freePrompt)) {
      fails.push(`(g6) the \u00a76 free-text prompt does not say free text adopts nothing — an owner reads it before answering and the refusal only after: ${JSON.stringify(freePrompt)}`);
    }
    if (!/none-of-these/.test(freePrompt) || !/Candidate/.test(freePrompt)) {
      fails.push(`(g6) the \u00a76 free-text prompt does not name both arms that decide (a Candidate, or none-of-these) — a gate executes the arm it captured, and free text captures none: ${JSON.stringify(freePrompt)}`);
    }
    if (!/returns you to this gate|returns you here|back to this gate/.test(freePrompt)) {
      fails.push(`(g6) the \u00a76 free-text prompt does not say a comment on its own returns the owner to this gate: ${JSON.stringify(freePrompt)}`);
    }
  }
  // AND THE DELETED SUBCOMMAND IS GONE RATHER THAN DEPRECATED. A leftover
  // invocation fails as an unknown subcommand; a stub that accepted it would be
  // the route by which the session-driven gate comes back one caller at a time.
  const gcGone = spawnSync(process.execPath, ["src/assemble.mjs", "gate-candidate", "--declare", "--brief", bp2, "--reviewed", rvf], { encoding: "utf8" });
  if (gcGone.status === 0) fails.push("(g6) `gate-candidate` still runs — the session-driven gate has a live executor (kogaki#1108)");
  else if (!/usage/.test(gcGone.stderr || "")) fails.push("(g6) `gate-candidate` refuses with something other than the unknown-subcommand usage line — a stub rather than a deletion");

  const selIds = (selOffered.ids || []);
  const selCapPath = join(dir, "selection-capture.json");
  // THE NEGATION REFUSES, and adoption names the answer rather than a shape.
  writeCapture(selCapPath, "brief-candidate-selection", selIds, { option: "none-of-these" }, "toolu_sel_no");
  const declined = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", "--brief", bp2,
    "--reviewed", rvf, "--candidate", "cand-2", "--specialization", spf, "--moves-dir", MOVES,
    "--selection", selCapPath], { encoding: "utf8" });
  if (declined.status === 0) fails.push("(g6) adoption proceeded after the owner answered none-of-these at the §6 gate");
  else if (!/none-of-these/.test(declined.stderr || "")) fails.push("(g6) the none-of-these refusal does not name the answer the owner gave");
  // FREE TEXT IS NOT A SELECTION (kogaki#914). The gate offers a free-text
  // channel and the harness records what the owner typed, so this is a
  // REACHABLE answer and not a synthetic one. Before #914 adoption had no
  // branch for it: the answer fell through to the id match, where the absent
  // option interpolated as the bare word `undefined` and the refusal named a
  // state the owner never produced.
  writeCapture(selCapPath, "brief-candidate-selection", selIds,
    { free_text: "the second one but start with the objection" }, "toolu_sel_free");
  const freeAdopt = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", "--brief", bp2,
    "--reviewed", rvf, "--candidate", "cand-2", "--specialization", spf, "--moves-dir", MOVES,
    "--selection", selCapPath], { encoding: "utf8" });
  if (freeAdopt.status === 0) fails.push("(g6) a free-text answer adopted a Candidate — prose is not a composed Reader Path, and the runtime composes none");
  else {
    const err = freeAdopt.stderr || "";
    // THE REFUSAL NAMES WHAT THE OWNER DID. This is the whole defect: an owner
    // who typed their own words is told what they actually did, not that they
    // selected a candidate named `undefined`.
    if (/candidate undefined/.test(err)) fails.push("(g6) the free-text refusal still interpolates `undefined` for the answer the capture carried");
    if (!/in their own words/.test(err)) fails.push("(g6) the free-text refusal does not say the owner answered in their own words");
    if (!err.includes("the second one but start with the objection")) fails.push("(g6) the free-text refusal does not quote the owner's own words back");
    // AND IT ROUTES. A refusal that names the answer but no way forward leaves
    // the owner at the same gate with the same two moves undiscovered.
    if (!/none-of-these/.test(err)) fails.push("(g6) the free-text refusal does not route to the first-class negation");
  }

  // THE ADMITTING HALF, bound rather than merely stated (PR #949 round 1).
  // The arm above reads the OPTION'S ABSENCE, never the free text's presence,
  // so an answer carrying both is a selection with a comment beside it and
  // adopts normally. That property was asserted in the SPEC and in the code
  // comment and exercised by nothing: every capture here carried exactly one
  // channel, so an arm rewritten as `chose.free_text !== undefined` would
  // have passed the whole block. This case is what makes the refusal's SCOPE
  // checkable, not only its existence.
  writeCapture(selCapPath, "brief-candidate-selection", selIds,
    { option: "cand-2", free_text: "this one, though the second beat still drags" }, "toolu_sel_both");
  // ITS OWN COPY OF THE BRIEF (kogaki#1108). This call now SUCCEEDS — see the
  // anchor note below — and adoption fills the Brief's slots, so running it
  // against `bp2` would leave the (g) adoption downstream with nothing to fill
  // and refuse for a reason that has nothing to do with what either case
  // asserts. A separate copy is what keeps the two independent; before #1108
  // the call stopped at the ratification barrier and wrote nothing, which is
  // why one file served both.
  const bpBoth = join(dir, "brief-adopt-both.md"); writeFileSync(bpBoth, doc0);
  const bothAdopt = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", "--brief", bpBoth,
    "--reviewed", rvf, "--candidate", "cand-2", "--specialization", spf, "--moves-dir", MOVES,
    "--selection", selCapPath], { encoding: "utf8" });
  // IT GETS PAST THE SELECTION CLAUSE AND ADOPTS (kogaki#1108). This case used
  // to anchor POSITIVELY on the ratification barrier — the call passes no
  // ratification, and before #1108 that was the next refusal — which is what
  // made the free-text arm's SCOPE checkable rather than only its existence.
  // With `brief-specialization-ratification` removed there is no barrier left
  // to anchor on, so the anchor moves to the OTHER side of the same fact: the
  // adoption SUCCEEDS.
  //
  // THAT IS A STRONGER ANCHOR, NOT A WEAKER ONE, and the reason is worth
  // stating because the case's own comment warns about exactly this shape. The
  // old anchor was "some refusal below the selection clause fired"; any clause
  // between the two would have satisfied it. A success satisfies nothing but
  // the selection clause having ADMITTED the answer, which is the property
  // under test.
  const bothErr = bothAdopt.stderr || "";
  if (bothAdopt.status !== 0) {
    fails.push(`(g6) adoption of an option-plus-comment selection was REFUSED, so the §6 selection arm read the free text's presence rather than the option's absence, or something below it refused: ${bothErr.trim().split("\n")[0]}`);
  }
  if (/in their own words/.test(bothErr)) fails.push("(g6) a selection carrying a comment beside it was refused as free text — the arm reads the free text's presence rather than the option's absence");

  writeCapture(selCapPath, "brief-candidate-selection", selIds, { option: "cand-2" }, "toolu_sel_yes");
  // THE ARGUMENT IS CHECKED AGAINST THE ANSWER — acceptance item 1 of #891.
  const mismatch = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", "--brief", bp2,
    "--reviewed", rvf, "--candidate", "cand-1", "--specialization", spf, "--moves-dir", MOVES,
    "--selection", selCapPath], { encoding: "utf8" });
  if (mismatch.status === 0) fails.push("(g6) adopting a Candidate the owner did not select was accepted — --candidate stood in for the answer");
  else if (!/did not choose another/.test(mismatch.stderr || "")) fails.push("(g6) the mismatch refusal does not say the owner chose a different Candidate");
  // AND A CAPTURE BOUND TO A DIFFERENT OPTION SET IS REFUSED. The same
  // candidate id offered beside different alternatives is a different
  // question, and this is the axis that says so.
  {
    const stalePath = join(dir, "selection-capture-stale.json");
    const staleDoc = JSON.parse(readFileSync(selCapPath, "utf8"));
    staleDoc.rows[staleDoc.rows.length - 1].answers_over.option_set_digest = "0".repeat(64);
    writeFileSync(stalePath, JSON.stringify(staleDoc));
    const staleAdopt = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", "--brief", bp2,
      "--reviewed", rvf, "--candidate", "cand-2", "--specialization", spf, "--moves-dir", MOVES,
      "--selection", stalePath], { encoding: "utf8" });
    if (staleAdopt.status === 0) fails.push("(g6) a selection capture bound to a different option set adopted anyway — the owner chose among alternatives other than these");
  }
  const adoptArgv = ["--brief", bp2, "--reviewed", rvf, "--candidate", "cand-2", "--specialization", spf, "--moves-dir", MOVES, "--selection", selCapPath];
  // ADOPTION WRITES WITH NO THIRD GATE (kogaki#1108). This block drove the
  // `ratify-specialization` executor's two modes — `--declare` composing the
  // run declaration over a record that had already passed, `--capture`
  // admitting an answer against THAT declaration — and only then adopted.
  // The gate is gone from src/gate-registry.json, the subcommand is deleted,
  // and what remains is the command path this case was always anchoring: the
  // Candidate the owner selected adopts, and the command's document equals the
  // exported function's.
  const p2 = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", ...adoptArgv], { encoding: "utf8" });
  if (p2.status !== 0) fails.push(`(g) adopt-candidate exited ${p2.status}: ${(p2.stderr || "").trim()}`);
  else if (readFileSync(bp2, "utf8") !== doc3) fails.push("(g) the command's adopted document differs from the exported function's — two producers");
  // THE DISCLOSURE SENTENCE REACHES THE SCREEN. It is what replaced the gate,
  // so a silent adoption would mean the record went from being ratified to
  // being invisible — which is the outcome this Issue's decision does not
  // license. Bound to the digest the runtime computed, never to a recomputed
  // one, and to the claim it must carry.
  if (p2.status === 0) {
    const out = p2.stdout || "";
    const digest = specializationDigest(spec(candB), candB.legs);
    if (!out.includes(digest)) fails.push("(g) the closing summary does not name the specialization record's digest — the record adopted unnamed");
    if (!/never a write unlock/.test(out)) fails.push("(g) the closing summary does not say the record is disclosure rather than a write unlock (kogaki#1108)");
    if (!/consistent/.test(out)) fails.push("(g) the closing summary carries no verdict tally — a disclosure that says a record exists and not what it judged");
  }
  // AND THE DELETED SUBCOMMAND IS GONE RATHER THAN DEPRECATED. A leftover
  // invocation fails as an unknown subcommand; a stub that accepted it would be
  // the route by which the removed gate comes back one caller at a time.
  const pGone = spawnSync(process.execPath, ["src/assemble.mjs", "ratify-specialization", ...adoptArgv], { encoding: "utf8" });
  if (pGone.status === 0) fails.push("(g) `ratify-specialization` still runs — the removed gate has a live executor (kogaki#1108)");
  else if (!/usage/.test(pGone.stderr || "")) fails.push("(g) `ratify-specialization` refuses with something other than the unknown-subcommand usage line — a stub rather than a deletion");
  // AND `--ratification` IS REFUSED BY NAME at adoption rather than ignored: a
  // silently accepted flag lets a caller believe an owner act is still read.
  const pFlag = spawnSync(process.execPath, ["src/assemble.mjs", "adopt-candidate", ...adoptArgv, "--ratification", "/dev/null"], { encoding: "utf8" });
  if (pFlag.status === 0) fails.push("(g) adopt-candidate ACCEPTED --ratification — a removed input that is silently taken is a caller getting a different act than it asked for");
  else if (!/REMOVED/.test(pFlag.stderr || "")) fails.push("(g) --ratification is refused without naming it as removed");


  // (k) THE LEG↔MOVE INSTANTIATION CONTRACT (§4.12, kogaki#747), both halves
  // at the one occasion that can make them unskippable — adoption is the only
  // write that lands a sequence in an existing Brief.
  //
  // THE MECHANICAL HALF — the move id resolves, or the adoption refuses.
  // (ah) A MOVE CONTRACT IS PRESENT OR ABSENT, IN EVERY AUTHORING FORM
  // (PR #1127 round 1). `moveContract` reads two flat scalars, and a Move record
  // may write either as a folded block or inline. The block arm reported an
  // empty block as absent from the start; the inline arm did not, so
  // `before: ""` was the one spelling that produced a present-but-BLANK
  // contract and sent the judge a blank to compare against — the shape
  // kogaki#1125 exists to end, arriving one authoring form over.
  //
  // EXERCISED AGAINST RECORDS THIS CASE WRITES, not against `moves/`. No record
  // in the library is authored this way today, which is exactly why the suite
  // was green about it: a latent asymmetry is only reachable from a store that
  // has one.
  ranCase("ah-empty-contract-is-absent");
  {
    const EMPTY = join(dir, "moves-empty-forms");
    mkdirSync(EMPTY, { recursive: true });
    // The control, FIRST: without it every refusal below could be a reader that
    // refuses everything.
    writeFileSync(join(EMPTY, "inline-filled.md"),
      "id: inline-filled\nbefore: the reader holds the claim loosely\n"
      + "after: the reader holds the claim in working form\n");
    const okInline = moveContract("inline-filled", EMPTY);
    if (okInline.error) {
      fails.push(`(ah) an inline-scalar Move contract was REFUSED: ${okInline.error}`);
    } else if (okInline.before !== "the reader holds the claim loosely") {
      fails.push(`(ah) an inline-scalar before was read as ${JSON.stringify(okInline.before)} — the contract reaches the judge as something other than what the record says`);
    }
    for (const [name, body, why] of [
      ["inline-empty", 'id: inline-empty\nbefore: ""\nafter: the reader is further on\n',
        "an inline empty string"],
      ["block-empty", "id: block-empty\nbefore: >-\nafter: the reader is further on\n",
        "an empty folded block"],
    ]) {
      writeFileSync(join(EMPTY, `${name}.md`), body);
      const r = moveContract(name, EMPTY);
      if (!r.error) {
        fails.push(`(ah) a Move whose before is ${why} was read as CARRYING a contract (${JSON.stringify(r.before)}) — the judge is handed a blank to compare its verdict against, which is indistinguishable at the ask from a contract that says nothing`);
      } else if (!/declares no before/.test(r.error)) {
        fails.push(`(ah) the ${why} refusal does not name the missing field: ${r.error}`);
      }
    }
  }

  ranCase("k-instantiation");
  {
    const dangler = { ...candB, legs: [{ ...candB.legs[0], move: "no_such_move" }, candB.legs[1]] };
    const d = adoptCandidate(doc0, { candidates: [candA, dangler] }, "cand-2", inst(dangler, {}, { candidates: [candA, dangler] }));
    if (!d.error) fails.push("(k) a Leg binding a move id that resolves to no record was ADOPTED — the dangling id rides the Brief to Packet time");
    else {
      if (!/t1/.test(d.error)) fails.push("(k) the dangling-move refusal does not name the LEG (ruling 1: the refusal names the Leg and the id)");
      if (!/no_such_move/.test(d.error)) fails.push("(k) the dangling-move refusal does not name the ID");
      if (d.doc) fails.push("(k) the dangling-move refusal still produced a document");
    }
    // AN UNREADABLE STORE IS NOT AN EMPTY STORE. Without this branch every id
    // reads as dangling and the refusal names the Legs for a fault that is
    // the store's — a true refusal for a false reason, and the composer is
    // sent to re-bind Moves that were never wrong.
    const noStore = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2",
      { movesDir: join(dir, "absent-library"), specialization: spec(candB),
        selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!noStore.error) fails.push("(k) an unreadable Move library was treated as a library");
    else {
      if (!/cannot be read/.test(noStore.error)) fails.push("(k) an unreadable Move library refuses as if the ids dangled — the refusal blames the composition for a store fault");
      if (/t1/.test(noStore.error)) fails.push("(k) the unreadable-store refusal names a Leg, sending the composer to re-bind Moves that are not the problem");
    }
    // (x) §4.16's FIGURE HALF AT THE SAME SEAT (kogaki#877). ASSERTED AT THE
    // ACT, for the reason (w1) records: a mutation that skipped the figure
    // check inside `adoptCandidate` survived every direct call to
    // `resolveFigureForms`, because those assert the FUNCTION and this asserts
    // that adoption runs it. The grammar and the claim addressing are
    // `validateLegs`'s and are asserted in (v); what can only be decided with
    // the library open is decided here, and only here can it be made
    // unskippable.
    ranCase("x");
    // AN N-ROLE FORM NOW COSTS N STRANDS (kogaki#1108), and that is a
    // consequence of the claim rule rather than a fixture convenience. Every
    // role of a Move's `figure` binds to one of THIS Leg's claims, and a
    // Leg carries at most one claim per Strand — so a figure is composable
    // only by a Leg drawing on as many Strands as its kind declares roles.
    //
    // WHICH IS WHY THIS FIXTURE'S FORM IS A `chain` AND NOT AN `axis`. The
    // Brief under test closes over two Strands, and an `axis` declares three
    // roles: the three-claim Leg this block used to compose is now
    // uncomposable HERE, and the refusal it meets is the closed-Strand-set one
    // rather than anything this case is about. The kind is incidental to what
    // (x) asserts — form resolution at the adoption seat, an unbound role, and
    // a formless Move — so the fixture takes a two-role kind and the
    // assertions below name that kind's roles. The three-role case is asserted
    // in (v), where `validateLegs` is pure and no Brief bounds the Strands.
    const figLegOf = (st, over = {}) => ({
      ...st, move: "chain-form-move", materials: ["L1", "L2"],
      claims: [
        { type: "strand", strand: "L1", proposition: "the ordered stages the case ran through" },
        { type: "strand", strand: "L2", proposition: "the bottleneck that held at each stage" },
      ],
      figure: "the stages and where each one held",
      figure_roles: { stages: "g1", bottlenecks: "g2" },
      ...over,
    });
    const figCand = (over) => {
      const c = { ...candB, candidate_id: "cand-2",
        legs: [figLegOf(candB.legs[0], over), candB.legs[1]] };
      return c;
    };
    // A fully bound figure ADOPTS — the control, without which every refusal
    // below could be passing for an unrelated reason.
    const okFig = figCand({});
    const adOk = adoptCandidate(doc0, { candidates: [candA, okFig] }, "cand-2",
      inst(okFig, {}, { candidates: [candA, okFig] }));
    if (adOk.error) fails.push(`(x) a fully bound figure was REFUSED at adoption: ${adOk.error}`);
    // An unbound role refuses AT ADOPTION, naming the role, and writes nothing.
    const missingRole = figCand({ figure_roles: { stages: "g1" } });
    const adMiss = adoptCandidate(doc0, { candidates: [candA, missingRole] }, "cand-2",
      inst(missingRole, {}, { candidates: [candA, missingRole] }));
    if (!adMiss.error) fails.push("(x) adoption ACCEPTED a figure leaving a role of its Move's form unbound — the record rides the Brief to kogaki#878 with an element nothing binds");
    else {
      if (!/bottlenecks/.test(adMiss.error)) fails.push(`(x) the unbound-role refusal does not name the ROLE: ${adMiss.error}`);
      if (adMiss.doc) fails.push("(x) the unbound-role refusal still produced a document");
    }
    // A figure on a Move with NO form refuses AT ADOPTION, naming the Move.
    const formlessCand = figCand({ move: "worked-example" });
    const adForm = adoptCandidate(doc0, { candidates: [candA, formlessCand] }, "cand-2",
      inst(formlessCand, {}, { candidates: [candA, formlessCand] }));
    if (!adForm.error || !/worked-example/.test(adForm.error)) {
      fails.push(`(x) adoption ACCEPTED a figure on a Move with no figure, or refused without naming the Move: ${JSON.stringify(adForm.error || null)}`);
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
    const bare = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
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
      // THE REFUSING ARMS ARE THE RECORD'S OWN, and that survives the gate's
      // removal unchanged (kogaki#1108). This loop used to supply a conforming
      // ratification for every value, passing and not, to assert that a
      // non-passing record refuses on its VERDICT rather than on the missing
      // owner act. With the gate gone there is nothing above these arms at all,
      // so the assertion is the same and the fixture is smaller: a passing
      // record adopts, and every other value refuses naming its Leg, its
      // sentence and its verdict.
      const r = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2",
        { movesDir: MOVES, specialization: rec, selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
      const shouldPass = sch.vocabulary.passing.includes(v);
      if (shouldPass && r.error) fails.push(`(k) the passing verdict ${v} was refused: ${r.error}`);
      if (!shouldPass) {
        if (!r.error) fails.push(`(k) the verdict ${v} was ADOPTED — only ${sch.vocabulary.passing.join(", ")} passes`);
        else {
          if (!r.error.includes("t1")) fails.push(`(k) the ${v} refusal does not NAME the failing Leg`);
          if (!r.error.includes(rec.verdicts[0].why)) fails.push(`(k) the ${v} refusal does not QUOTE the sentence the judging sitting wrote — it paraphrases a judgment it did not make`);
          if (!r.error.includes(v)) fails.push(`(k) the ${v} refusal does not say WHICH verdict it refuses on — contradicts and cannot-determine need different repairs`);
          if (r.doc) fails.push(`(k) the ${v} refusal still produced a document`);
        }
      }
    }
    const outside = spec(candB); outside.verdicts[0].verdict = "probably-fine";
    const o = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: outside , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!o.error || !/closed/.test(o.error)) fails.push("(k) a verdict outside the closed vocabulary was accepted");
    // ONE PER LEG, EXACTLY, IN BOTH DIRECTIONS — a short list is the skip
    // this occasion exists to prevent, one Leg at a time; a long one means
    // the record judges a path other than the one being adopted.
    const short = spec(candB); short.verdicts = [short.verdicts[0]];
    const sh = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: short , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!sh.error || !/t2/.test(sh.error)) fails.push("(k) a record judging only some Legs was accepted — the occasion is skippable one Leg at a time");
    const long = spec(candB); long.verdicts.push({ leg_id: "t9", move: "worked-example", verdict: "consistent", why: "a leg that is not in this path at all" });
    const lo = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: long , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!lo.error || !/t9/.test(lo.error)) fails.push("(k) a record carrying a verdict for a Leg outside the adopted path was accepted");
    const dup = spec(candB); dup.verdicts.push({ ...dup.verdicts[0] });
    const du = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: dup , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!du.error || !/two verdicts/.test(du.error)) fails.push("(k) two verdicts for one Leg were accepted — the second can disagree with the first");
    // THE RECORD IS BOUND TO WHAT IT JUDGES, on both axes. Without the
    // candidate binding a sitting judges the Candidate it likes and adopts the
    // one it wants; without the move binding the verdict certifies a
    // relationship that is not the one in the Leg.
    const wrongCand = spec(candB); wrongCand.candidate_id = "cand-1";
    const wc = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: wrongCand , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!wc.error || !/cand-1/.test(wc.error)) fails.push("(k) a record judging ANOTHER Candidate certified this one");
    const wrongMove = spec(candB); wrongMove.verdicts[0].move = "worked-example";
    const wm = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: wrongMove , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!wm.error || !/worked-example/.test(wm.error)) fails.push("(k) a verdict naming a Move the Leg does not bind certified the Leg");
    // A one-word `why` is not the sentence a refusal hands back.
    const thin = spec(candB); thin.verdicts[0].why = "fine";
    const th = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: thin , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!th.error || !/why is/.test(th.error)) fails.push("(k) a one-word why was accepted as the sentence a refusal quotes");
    const ver = spec(candB); ver.version = "2";
    const vr = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: ver , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!vr.error || !/version/.test(vr.error)) fails.push("(k) a record written to another version of the carrier was read anyway");
    // DETERMINISTIC, AND IN THE PATH'S OWN ORDER: with both Legs failing, the
    // refusal names the FIRST. A refusal that named an arbitrary one would
    // send two sittings to two different repairs for one record.
    const both = spec(candB);
    both.verdicts[0].verdict = "contradicts"; both.verdicts[1].verdict = "contradicts";
    const bo = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", { movesDir: MOVES, specialization: both , selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!bo.error || !/leg t1:/.test(bo.error)) fails.push("(k) with two failing Legs the refusal does not name the FIRST in path order");
  }


  // (s) THE SPECIALIZATION RECORD IS DISCLOSURE, AND ITS GATE IS GONE
  // (kogaki#1108, owner decision 2026-09-12). This case was the owner
  // ratification gate's (kogaki#893): a shape-valid, judgment-free record of
  // all-`consistent` verdicts had to be REFUSED until the owner ratified it.
  //
  // WHY IT IS INVERTED RATHER THAN DELETED. The gate's ground was real — every
  // verdict in the record is the composing sitting's own — so its removal is a
  // decision with a cost, and a case that simply stopped existing would leave
  // nothing asserting that the removal is the state the tree is in. A deleted
  // case and a silently re-added gate read identically. So the same fixture
  // runs and the assertions point the other way: the record still gates on its
  // VERDICTS, the gate is absent from the registry, and the write is disclosed
  // rather than approved.
  //
  // WHAT THE REMOVAL RESTS ON, stated because it is not "the gate was
  // unnecessary": it was a human gate over a MODEL verdict, and it existed
  // because a passing model verdict was otherwise the only unlock. kogaki#1108
  // moves the composition onto a Harness-owned table whose judgment states
  // render declared schemas and validate what comes back, which is what
  // removes the condition the gate was covering for.
  ranCase("s");
  {
    // THE SAME FIXTURE THE GATE WAS FOUND BY — every verdict `consistent`,
    // every `why` a shape-valid sentence. It now ADOPTS, which is the state
    // this Issue decided for, and the case says so in the direction that a
    // re-added gate would fail.
    const judgmentFree = spec(candB);
    const shapeOnly = validateSpecialization(judgmentFree, candB.legs, "cand-2");
    if (shapeOnly.error) fails.push("(s) the judgment-free fixture does not even pass the record's shape clauses — it would be refused for the wrong reason, and this case would assert nothing");
    const adopted = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2",
      { movesDir: MOVES, specialization: judgmentFree, selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (adopted.error) {
      fails.push(`(s) a shape-valid all-consistent record with no ratification was REFUSED — a passing record is the unlock again since kogaki#1108, and this refusal is the removed gate or something standing where it stood: ${adopted.error}`);
    } else {
      if (!adopted.doc) fails.push("(s) the adoption produced no document");
      // THE DISCLOSURE IS ON THE RETURN, not only in a console line, because
      // the sentence the command prints is composed FROM these and a reader of
      // the exported function must be able to compose it too.
      if (adopted.record_digest !== specializationDigest(judgmentFree, candB.legs)) {
        fails.push("(s) adoption does not return the digest of the record it validated — the disclosure sentence would name a record other than the one that passed");
      }
      const tally = adopted.specialization_tally;
      if (!tally || tally.consistent !== candB.legs.length || Object.keys(tally).length !== 1) {
        fails.push(`(s) adoption does not return a verdict tally over the record it validated: ${JSON.stringify(tally)}`);
      }
    }
    // THE REFUSING ARMS ARE UNTOUCHED, and this is the half that must not have
    // moved with the gate. A `contradicts` verdict refused ABOVE the gate
    // before and refuses with nothing above it now — same message, same path
    // order. Without this the case would say only that a guard was deleted.
    const contra = JSON.parse(JSON.stringify(judgmentFree));
    contra.verdicts[0].verdict = "contradicts";
    const cr = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2",
      { movesDir: MOVES, specialization: contra, selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!cr.error) fails.push("(s) a `contradicts` verdict ADOPTED — removing the ratification gate removed the record's own refusals with it");
    else {
      if (!/t1/.test(cr.error)) fails.push("(s) the contradicts refusal no longer names the failing Leg");
      if (cr.doc) fails.push("(s) the contradicts refusal still produced a document");
    }
    // AND A MISSING RECORD IS STILL A REFUSAL. The occasion stays mandatory;
    // what stopped being mandatory is the owner act ON a passing record.
    const noRec = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2",
      { movesDir: MOVES, selection: sel("cand-2", { candidates: [candA, candB] }, doc0) });
    if (!noRec.error || !/specialization record/.test(noRec.error)) fails.push("(s) adoption with NO specialization record was accepted — the judgment occasion is no longer mandatory");
    // THE GATE IS ABSENT FROM THE REGISTRY, asserted rather than assumed. The
    // registry is the enumeration a gate-coverage claim is a fraction OF, so a
    // gate nothing raises but the registry still declares would be counted as
    // covered by a question that is never asked.
    const gates = JSON.parse(readFileSync("src/gate-registry.json", "utf8")).gates;
    if (gates.some((g) => g.id === "brief-specialization-ratification")) {
      fails.push("(s) brief-specialization-ratification is still declared in src/gate-registry.json — the registry would report a gate nothing raises as covered");
    }
    // EXACTLY TWO BRIEF GATES REMAIN, and they are named. A bound stated as a
    // count alone would be satisfied by any two.
    const briefGates = gates.filter((g) => g.id.startsWith("brief-")).map((g) => g.id).sort();
    if (briefGates.join(",") !== "brief-candidate-selection,brief-thesis-adoption") {
      fails.push(`(s) the Brief's declared gates are ${JSON.stringify(briefGates)} — kogaki#1108 declares exactly two, thesis adoption and Candidate selection`);
    }
    // AND THE SCHEMA CARRIES NO RATIFICATION BLOCK. It is the other carrier of
    // the gate: `gate_id`, the two option ids and the capture binding key all
    // lived there, and a block left behind is a second place the gate can be
    // read as live from.
    const sch2 = specializationSchema();
    if (sch2.ratification !== undefined) fails.push("(s) src/specialization-schema.json still carries a `ratification` block — the removed gate has a second carrier");
    if (!sch2.disclosure || sch2.disclosure.summary.is_a_write_unlock !== false) {
      fails.push("(s) the schema does not declare the record as disclosure that is not a write unlock");
    }
    // THE DIGEST'S OWN SHAPE, both directions. It binds no capture any more,
    // but it names the record in the disclosure sentence — so a digest that
    // moved on a reorder would name two records for one judgment, and one that
    // held across a re-judgment would name one record for two.
    const reordered = JSON.parse(JSON.stringify(judgmentFree));
    reordered.verdicts.reverse();
    if (specializationDigest(reordered, candB.legs) !== specializationDigest(judgmentFree, candB.legs)) fails.push("(s) reordering the record's verdicts changed the digest — the disclosure would name two records for one judgment");
    const rejudged = JSON.parse(JSON.stringify(judgmentFree));
    rejudged.verdicts[0].verdict = "cannot-determine";
    if (specializationDigest(rejudged, candB.legs) === specializationDigest(judgmentFree, candB.legs)) fails.push("(s) changing a VERDICT left the digest unchanged — the disclosure would name one record for two judgments");
  }

  // (m) §4.13 — THE READER-KNOWLEDGE LEDGER, and §4.13.1's exemplar predicate,
  // RETIRED (kogaki#1175). The ledger is SHAPE and DERIVATION only: whether a
  // term is really introduced here and whether its anchor explains it are
  // judgments (§4.6 clause 3), and nothing below reads meaning. The exemplar
  // predicate that used to stand beside it is gone with `excerpt`.
  ranCase("m");
  {
    // THE FIELD IS OPTIONAL, and that is asserted first: every existing Leg
    // carries no `introduces`, so a requirement would have refused the whole
    // suite above rather than adding a field to it.
    if (validateLegs([leg1, leg2]).error) fails.push("(m) introduces was made REQUIRED — every Leg composed before §4.13 carries none");
    const ok = validateLegs([{ ...leg1, introduces: ["opacity — what a state conceals about its capabilities", "deterrence"] }]);
    if (ok.error) fails.push(`(m) a conforming introduces was refused: ${ok.error}`);

    // THE ENTRY GRAMMAR, both forms, and each refusal naming the LEG.
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
      const r = validateLegs([{ ...leg1, introduces: value }]);
      if (!r.error) fails.push(`(m) ${label} was accepted as an introduces value`);
      else {
        if (!r.error.includes(needle)) fails.push(`(m) the refusal for ${label} does not say why — expected it to name ${JSON.stringify(needle)}`);
        if (!/s1/.test(r.error)) fails.push(`(m) the refusal for ${label} does not NAME the Leg (acceptance: a malformed entry refuses naming the Leg)`);
      }
    }

    // THE DERIVATION — the union of 1..N-1, snapshot taken BEFORE the Leg's
    // own entries, so a Leg never already knows what it introduces.
    const path = [
      { leg_id: "p1", introduces: ["opacity — what a state conceals"] },
      { leg_id: "p2", introduces: ["deterrence"] },
      { leg_id: "p3" },
    ];
    const led = readerKnowledgeLedger(path);
    if (led.length !== 3) fails.push("(m) the ledger does not carry one row per Leg");
    if (led[0].reader_already_knows.length !== 0) fails.push("(m) the first Leg arrives already knowing something — the snapshot is taken after its own entries");
    if (led[1].reader_already_knows.map((k) => k.term).join() !== "opacity") fails.push("(m) leg 2 does not know exactly what leg 1 introduced");
    if (led[2].reader_already_knows.map((k) => k.term).sort().join() !== "deterrence,opacity") fails.push("(m) the accumulation is not the UNION of every earlier Leg");
    if (led[1].reader_already_knows[0].anchor !== "what a state conceals") fails.push("(m) the anchor does not travel with the term into the ledger");
    if (led[1].reader_already_knows[0].introduced_by !== "p1") fails.push("(m) the ledger does not carry WHICH Leg introduced the term — the addressability the field exists for");

    // A PATH THAT INTRODUCES NOTHING RENDERS AN EMPTY LEDGER, NOT AN ERROR
    // (acceptance). This is the case every Brief in the tree is in today.
    const none = readerKnowledgeLedger([{ leg_id: "n1" }, { leg_id: "n2" }]);
    if (none.length !== 2) fails.push("(m) a path with no introduces produced no ledger rows");
    if (none.some((r) => r.reader_already_knows.length !== 0)) fails.push("(m) a path introducing nothing derived a non-empty ledger");

    // FIRST INTRODUCER WINS, and responsibility for an UNINTRODUCED term is
    // the Brief's — a null that is the point of the function, not an error.
    // THREE Legs, not two, and the third is what makes the assertion below
    // possible: a re-declaration folds in AFTER its own row's snapshot, so on
    // a two-Leg path the only row that could show the difference does not
    // exist and a last-introducer-wins mutation passes silently. Found by
    // running exactly that mutation.
    const twice = [{ leg_id: "t1", introduces: ["x"] }, { leg_id: "t2", introduces: ["x"] }, { leg_id: "t3" }];
    if (introducerOf("x", twice) !== "t1") fails.push("(m) responsibility for a twice-declared term does not trace to the FIRST Leg");
    if (introducerOf("X", twice) !== "t1") fails.push("(m) introducer lookup is case-sensitive — the same term in two casings is one term everywhere else");
    if (introducerOf("unheard-of", twice) !== null) fails.push("(m) an unintroduced term does not trace to the Brief — the null case is the ledger's answer, never an error");
    const twiceLed = readerKnowledgeLedger(twice);
    if (twiceLed[2].reader_already_knows.length !== 1) fails.push("(m) a term declared by two Legs appears twice in the ledger — it is one term the reader met once");
    if (twiceLed[2].reader_already_knows[0].introduced_by !== "t1") fails.push("(m) a re-declaration MOVED responsibility instead of leaving it at the first Leg — a later question about the term would resolve to the wrong Leg");

    // THE ROUND TRIP. renderLeg writes one line per entry and parseBrief
    // reads them back; the two are asserted TOGETHER because a writer and a
    // reader that disagree fail silently at exactly this field.
    const rendered = renderLeg({ ...leg1, introduces: ["opacity — what a state conceals, in practice", "deterrence"] });
    const lines = rendered.split("\n").filter((l) => l.startsWith("introduces:"));
    if (lines.length !== 2) fails.push(`(m) renderLeg wrote ${lines.length} introduces line(s) for two entries — a joined field cannot be parsed back`);
    if (!lines[0].includes("opacity — what a state conceals, in practice")) fails.push("(m) the entry did not survive serialization intact");

    // §4.13.1 — THE EXEMPLAR PREDICATE IS RETIRED (kogaki#1175). `excerpt` is
    // gone with the rest of the eight-field schema, `moveExcerpt`/`isExemplar`/
    // `renderExcerptBlock` stood here and are gone with it, and `evidence` —
    // the field a reader might reach for in `excerpt`'s place — does NOT
    // inherit the role (owner ruling 7, kogaki#1173, 2026-09-23): it is
    // optional, typically empty, and read by nothing downstream. Asserted
    // rather than left silent, on the same ground the retirement itself
    // states: a reader who remembers "exemplar" should find why it is gone.
    if (typeof compose.moveExcerpt === "function" || typeof compose.isExemplar === "function"
      || typeof compose.renderExcerptBlock === "function") {
      fails.push("(m) the retired Move exemplar predicate (moveExcerpt/isExemplar/renderExcerptBlock) is still exported from src/compose.mjs — §4.13.1 retires it in full");
    }

    // THE LIBRARY AS IT STANDS, read rather than asserted. Every record
    // carries the rebuilt §4.2 schema; none carries `excerpt`, `sources` or
    // `status`, which the eight-field schema retired along with the field.
    const store = loadMoveIds("moves");
    if (store.error) fails.push(`(m) the repository's Move library could not be read: ${store.error}`);
    else {
      for (const id of store.ids) {
        const txt = readFileSync(`moves/${id}.md`, "utf8");
        for (const retired of ["excerpt", "sources", "status", "requires", "effect", "constraints", "failure_modes", "intent", "visual_form"]) {
          if (new RegExp(`^${retired}:`, "m").test(txt)) {
            fails.push(`(m) moves/${id}.md carries a \`${retired}\` field — the eight-field schema retired it (kogaki#1175)`);
          }
        }
      }
      exemplarLine = `${store.ids.size} Move record(s) in the library, none carrying the retired exemplar field`;
    }
  }

  // (n) THE REMOVAL TEST — A HOOK-DRIVEN BRIEF RUN REACHES A FILLED BRIEF WITH
  // NEITHER PROSE CARRIER IN THE TREE (kogaki#1108, acceptance 7 and 8).
  //
  // WHAT THIS REPLACES, AND WHY THE REPLACEMENT IS NOT A LOSS. What stood here
  // was the arc table: thirteen regexes over `.claude/skills/brief/SKILL.md`,
  // asserting that its prose named every stage of the flow. That case existed
  // because the rule "/brief completes the Brief" had exactly ONE carrier and
  // it was prose — the 2026-08-18 dogfood run stopped at the mint with every
  // composition field an unfilled slot, and nothing but the owner noticed. The
  // skill is one `!` line now and the arc is `src/brief-workflow.json`: the
  // executor advances it from hook payloads, and a stage cannot be skipped by a
  // sitting that did not read about it, because no sitting reads anything. So
  // the property the arc table approximated — the flow RUNS to a filled Brief —
  // is asserted here by running it, which is the assertion the table was a
  // proxy for.
  //
  // AND THE PROXY COULD NOT HAVE BEEN KEPT. Every row of it named a file that
  // no longer carries the arc; kept, it would have failed for the reason the
  // issue exists. Kept and REWRITTEN against the table it would have been a
  // second transcription of `src/brief-workflow.json`, green whenever the table
  // said what the table said. `checks/check-entry-point-accounting.sh` already
  // binds the table to the dispatcher; this case binds it to a finished Brief.
  //
  // THE TREE IS REDUCED, AND THE REDUCTION IS THE TEST (acceptance 7). The
  // scratch repository holds the runtime, the hooks, the Move library and a
  // skill file that is ONE `!` line — and no `specs/` at all. A run that
  // completes there completes without the spec draft pipeline document and
  // without any prose instruction, which is the whole claim.
  //
  // THE JUDGE IS STUBBED, ON `check-terrain-judge-invocation.sh`'s OWN RECIPE.
  // `KOGAKI_JUDGE_CLI` replaces the BINARY and nothing else, so the argv, the
  // prompt composition, the parse, the retry bound and every refusal below are
  // the shipped ones. What the stub supplies is the Model's field values, which
  // is exactly the freedom this issue confines it to.
  //
  // THE OWNER'S TWO ANSWERS GO THROUGH THE REAL HOOKS. `write-gate-capture.py`
  // writes the row from a synthesized PostToolUse payload, and
  // `advance-brief.py` delivers the same payload to the executor. Neither is
  // reimplemented here: a fixture that wrote its own capture row would be
  // asserting `writeCapture` — which the rest of this file already does, at the
  // seats where the row is CONSUMED — and would never exercise the narrowing
  // the advance hook performs before it spawns anything.
  ranCase("n");
  {
    const REPO = process.cwd();
    const rt = mkdtempSync(join(tmpdir(), "brief-removal-"));
    try {
      cpSync(join(REPO, "src"), join(rt, "src"), { recursive: true });
      cpSync(join(REPO, "moves"), join(rt, "moves"), { recursive: true });
      mkdirSync(join(rt, ".claude", "hooks"), { recursive: true });
      for (const f of readdirSync(join(REPO, ".claude", "hooks"))) {
        if (f.endsWith(".py")) copyFileSync(join(REPO, ".claude", "hooks", f), join(rt, ".claude", "hooks", f));
      }
      mkdirSync(join(rt, ".claude", "skills", "brief"), { recursive: true });
      writeFileSync(join(rt, ".claude", "skills", "brief", "SKILL.md"), "!`node src/brief.mjs start`\n");
      mkdirSync(join(rt, "fixtures"), { recursive: true });
      copyFileSync(SURVEY, join(rt, "fixtures", "survey.json"));
      // THE RECORDED ENUMERATION TRAVELS INTO THE REDUCED TREE TOO (kogaki#1116).
      // Case (n) asserts the start act runs with neither the skill file, the
      // Spec, nor a repository around it; a start that reached the live seam
      // would be asserting about a substrate instead, and would fail in CI where
      // the gateway is absent.
      copyFileSync(ELEMENTS, join(rt, "fixtures", "elements.json"));

      // THE ABSENCE IS ASSERTED, NOT ASSUMED. A tree that quietly gained a
      // `specs/` — through a copy widened later, or through a runtime that
      // writes one — would make every assertion below pass for the wrong
      // reason, and the Removal Test would be a plain smoke test wearing its
      // name.
      if (existsSync(join(rt, "specs"))) {
        fails.push("(n) the reduced tree carries a `specs/` directory — the Removal Test is about a run with the spec OUT of the tree, and a tree that has one tests nothing about its absence");
      }
      const skillText = readFileSync(join(rt, ".claude", "skills", "brief", "SKILL.md"), "utf8");
      if (skillText.split("\n").filter((l) => l.trim() !== "").length !== 1) {
        fails.push("(n) the reduced tree's skill file is not one line — the Removal Test runs against the skill at its start line and nothing else");
      }

      const judge = join(rt, "judge-conformant");
      writeFileSync(judge, JUDGE_STUB, { mode: 0o755 });

      const D = join(rt, "run");
      const gates = join(rt, "open-gates");
      const openRun = join(rt, "open-run");
      mkdirSync(D, { recursive: true });
      mkdirSync(gates, { recursive: true });
      // THE POINTER ROUTE, WHICH IS THE LIVE ONE. `advance-brief.py` resolves
      // the run the way the executor does — the lane's open-run pointer — and
      // `KOGAKI_BRIEF_OPEN_RUN` relocates that pointer per tree so two fixtures
      // never contend for one. Pinning the run DIRECTORY by environment instead
      // would satisfy the hook and leave the executor resolving nothing, which
      // is the disagreement between two readers of run identity that this
      // variable exists to prevent.
      writeFileSync(openRun, D + "\n");
      const baseEnv = {
        ...process.env,
        KOGAKI_OPEN_GATES: gates,
        CLAUDE_CODE_SESSION_ID: "fixture-session",
        KOGAKI_JUDGE_CLI: judge,
        CLAUDE_PROJECT_DIR: rt,
        KOGAKI_BRIEF_OPEN_RUN: openRun,
      };
      // TERRAIN'S OWN PIN IS LEFT STANDING, AND THAT IS AN ASSERTION (PR #1109
      // round 1). This read `delete baseEnv.KOGAKI_RUN_DIR`, which is the
      // workaround that stood where this arm belongs: `cmdRun` read
      // `KOGAKI_RUN_DIR` literally while `runDir` read
      // `process.env[flow().runDirEnv]`, so a Brief advance under an inherited
      // Terrain pin took the pinned arm, found no `KOGAKI_BRIEF_RUN_DIR`, and
      // minted a fresh Brief workspace per advance — abandoning the open run.
      // Pointing the variable at a directory that is NOT this run's is what
      // makes the span fail if the pin is ever read by name again.
      const decoy = join(rt, "not-this-runs-workspace");
      mkdirSync(decoy, { recursive: true });
      baseEnv.KOGAKI_RUN_DIR = decoy;
      delete baseEnv.KOGAKI_OPEN_RUN;
      const inTree = (argv, env = {}, input = undefined) =>
        spawnSync(process.execPath, argv, { cwd: rt, encoding: "utf8", input, env: { ...baseEnv, ...env } });
      const hook = (name, body, env = {}) =>
        spawnSync("python3", [join(rt, ".claude", "hooks", name)],
          { cwd: rt, encoding: "utf8", input: body, env: { ...baseEnv, ...env } });

      // The question the declaration carries, read from the declaration the
      // executor wrote — never retyped, because the capture hook keys on it.
      const declaredQuestion = (stateId) => {
        let rec;
        try { rec = JSON.parse(readFileSync(join(D, "run-record.json"), "utf8")); } catch { return null; }
        const owed = (rec.gate_declarations_owed || []).find((g) => g.state === stateId && g.declaration);
        if (!owed) return null;
        const dp = resolvePath(rt, owed.declaration);
        let decl;
        try { decl = JSON.parse(readFileSync(dp, "utf8")); } catch { return null; }
        const callPath = join(dirnameOf(dp), `${decl.id}.gate-call.json`);
        if (existsSync(callPath)) {
          try { return JSON.parse(readFileSync(callPath, "utf8")).questions[0].question; } catch { /* fall through */ }
        }
        return decl.question;
      };
      // SCREEN PROSE IS A TABLE ROW, AND THIS IS WHAT MAKES THE ROW LOAD-BEARING
      // (owner decision 2026-09-12; PR #1109 round 1). Each `wait` declares
      // `renders_above_question` — the `GATE_CALL_READING_KEYS` key whose value
      // `composeGateCall` puts inside the question text, or the empty string
      // for a gate that renders nothing. Bound here against the call the
      // executor ACTUALLY composed, in both directions: a row naming a reading
      // the declaration does not carry is red, and so is a call that carries
      // one where the row declares none. Without this the declaration would be
      // decoration and the emptiness would hold only because the session has no
      // prose channel left, which is the reading the decision rules out.
      const assertRendering = (stateId) => {
        const table = JSON.parse(readFileSync(join(rt, "src", "brief-workflow.json"), "utf8"));
        const st = (table.states || []).find((x) => x.id === stateId);
        if (!st || typeof st.renders_above_question !== "string") {
          fails.push(`(n) ${stateId} declares no \`renders_above_question\` — the owner decision rules that screen prose is a table row, and an undeclared rendering is the skill sentence it replaces`);
          return;
        }
        const rec = JSON.parse(readFileSync(join(D, "run-record.json"), "utf8"));
        const owed = (rec.gate_declarations_owed || []).find((g) => g.state === stateId && g.declaration);
        if (!owed) return;
        const dp = resolvePath(rt, owed.declaration);
        const decl = JSON.parse(readFileSync(dp, "utf8"));
        const callPath = join(dirnameOf(dp), `${decl.id}.gate-call.json`);
        if (!existsSync(callPath)) {
          fails.push(`(n) ${stateId} composed no gate call beside its declaration — there is no payload to compare the declared rendering against`);
          return;
        }
        const asked = JSON.parse(readFileSync(callPath, "utf8")).questions[0].question;
        const key = st.renders_above_question;
        if (key === "") {
          if (asked !== decl.question) {
            fails.push(`(n) ${stateId} declares that NOTHING renders above its question and the composed call carries a reading anyway — the table row and the bytes the owner is shown disagree`);
          }
          return;
        }
        const reading = decl[key];
        if (typeof reading !== "string" || reading === "") {
          fails.push(`(n) ${stateId} declares that \`${key}\` renders above its question and the declaration carries no such reading — the row names a carrier that is not there`);
          return;
        }
        if (!asked.startsWith(reading)) {
          fails.push(`(n) ${stateId}'s composed gate call does not open with its declared reading — screen prose is a table row only while the row and the rendering agree`);
        }
      };

      const payloadFor = (toolUseId, question, answer) => JSON.stringify({
        hook_event_name: "PostToolUse",
        session_id: "fixture-session",
        tool_name: "AskUserQuestion",
        tool_use_id: toolUseId,
        tool_input: { questions: [{ question, options: [{ label: answer }] }] },
        tool_response: { answers: { [question]: answer } },
      });

      // ---- THE START ACT. The skill's one line, with the two entry facts on
      // argv: the fixture path, unchanged since kogaki#1108 gave `enter` its
      // Terrain handoff and left `--survey`/`--ids` winning where they are given.
      const start = inTree(["src/brief.mjs", "start", "--run-dir", D,
        ...SETTLED,
        "--slug", "removal-test", "--moves-dir", "moves"],
        { KOGAKI_ELEMENTS_PAYLOAD: join(rt, "fixtures", "elements.json") });
      if (start.status !== 0) {
        fails.push(`(n) the start act failed in the reduced tree: ${(start.stderr || start.stdout || "").trim().slice(0, 400)}`);
      } else {
        const q1 = declaredQuestion("THESIS_ADOPTION");
        if (!q1) {
          fails.push("(n) the start act raised no THESIS_ADOPTION declaration — the run stopped before the first owner question, so there is nothing to answer and no span to drive");
        } else {
          assertRendering("THESIS_ADOPTION");
          const p1 = payloadFor("toolu_removal_thesis", q1, "thesis-1");
          const c1 = hook("write-gate-capture.py", p1, { KOGAKI_RUN_DIR: D });
          const a1 = hook("advance-brief.py", p1);
          const q2 = declaredQuestion("CANDIDATE_SELECTION");
          if (!q2) {
            fails.push("(n) one payload for the thesis answer did not carry the run to the Candidate-selection gate — the span from `adopt_thesis` through the mint, path composition, path review and assembly is what ONE hook event must execute (kogaki#1108 acceptance 2). "
              + `capture: ${(c1.stderr || "").trim().slice(0, 200)} advance: ${(a1.stderr || "").trim().slice(0, 400)}`);
          } else {
            // THE ANSWER IS THE FIRST OFFERED CANDIDATE, read from the
            // declaration rather than guessed, because the ids are the composing
            // judge's and this case does not get to know them in advance.
            assertRendering("CANDIDATE_SELECTION");
            const decl2 = JSON.parse(readFileSync(
              resolvePath(rt, JSON.parse(readFileSync(join(D, "run-record.json"), "utf8"))
                .gate_declarations_owed.find((g) => g.state === "CANDIDATE_SELECTION").declaration), "utf8"));
            const chosen = (decl2.options.find((o) => o.id !== "none-of-these") || {}).id;
            if (!chosen) {
              fails.push("(n) the Candidate-selection declaration offers nothing but the negation — there is no Candidate to adopt, so the span cannot finish");
            } else {
              const p2 = payloadFor("toolu_removal_selection", q2, chosen);
              const c2 = hook("write-gate-capture.py", p2, { KOGAKI_RUN_DIR: D });
              const a2 = hook("advance-brief.py", p2);
              // THE PATH IS THE RUN RECORD'S, NOT THIS CASE'S GUESS. A
              // `write` state records what it wrote; reading the record is how
              // a later act finds the artifact, and a hard-coded path here
              // would pass or fail on where the mint happens to put things
              // rather than on whether the span produced a Brief.
              const recNow = JSON.parse(readFileSync(join(D, "run-record.json"), "utf8"));
              const minted = (recNow.artifacts_written || []).find((w) => w.state === "mint");
              const brief = minted ? resolvePath(rt, minted.path) : join(rt, "theses", "removal-test", "brief.md");
              if (!minted) {
                fails.push(`(n) the run record names no artifact written by the \`mint\` state — the Brief the span was supposed to fill was never recorded as written. advance: ${(a2.stderr || "").trim().slice(0, 400)}`);
              }
              if (!existsSync(brief)) {
                fails.push(`(n) no Brief exists at ${brief} after both answers — the run did not reach the mint. capture: ${(c2.stderr || "").trim().slice(0, 200)} advance: ${(a2.stderr || "").trim().slice(0, 400)}`);
              } else {
                const filled = readFileSync(brief, "utf8");
                // FILLED, NOT MERELY PRESENT. The 2026-08-18 specimen the retired
                // arc table was written for produced a Brief file with every
                // composition field an unfilled slot, so the file's existence is
                // exactly the evidence that specimen would also have supplied.
                if (/_TBD_|_unfilled_|<!-- unfilled/.test(filled)) {
                  fails.push("(n) the Brief the span produced still carries unfilled slots — the mint writes a shell and adoption fills it, and a shell is the 2026-08-18 specimen this case exists to refuse");
                }
                if (!filled.includes(chosen)) {
                  fails.push(`(n) the Brief does not name the Candidate the owner selected (${chosen}) — the adopted path is what adoption writes, and a Brief that does not carry it was filled from something else`);
                }
                for (const [heading, why] of [
                  ["## Reader Path", "the adopted path itself"],
                  ["Reader start", "a per-Candidate reader field, authored at path composition"],
                ]) {
                  if (!filled.includes(heading)) {
                    fails.push(`(n) the filled Brief carries no ${JSON.stringify(heading)} — ${why} is missing from a Brief the run reported as complete`);
                  }
                }
                const rec = JSON.parse(readFileSync(join(D, "run-record.json"), "utf8"));
                if (rec.done !== true || rec.awaiting) {
                  fails.push(`(n) the run record is not at its terminal (done=${JSON.stringify(rec.done)}, awaiting=${JSON.stringify(rec.awaiting)}) — the span reached a filled Brief without reaching the table's terminal state, so one of the two is lying`);
                }
                // AND EVERY JUDGMENT WAS THE EXECUTOR'S OWN (acceptance 2). Three
                // judgment states, three records on the run record. A span that
                // filled the Brief with fewer would have had one of them supplied
                // from outside the run, which is the act this issue removes.
                for (const st of ["compose_path", "review_path", "judge_specialization"]) {
                  if (!(rec.judgments || {})[st]) {
                    fails.push(`(n) the run record carries no judgment for ${st} — the executor invokes the judge itself at every \`judgment\` state, and a filled Brief with a missing record means that state was satisfied by something other than a judged one`);
                  }
                }

                // ---- (af) THE COMPOSING ASK CARRIES THE MOVE LIBRARY
                // (kogaki#1125). Read at the ARTIFACT the executor wrote, not
                // at the function that composed it: the defect was a field
                // missing from the input on disk, and `compose_path`'s input
                // object is what the judge actually met.
                //
                // The set is bound to `loadMoveIds`' reading of the same
                // library rather than to a count: a case asserting "at least
                // one Move" would stay green on a runtime that sent one.
                ranCase("af-compose-library");
                {
                  const ip = join(D, "brief-judge-input-compose_path.json");
                  if (!existsSync(ip)) {
                    fails.push("(af) the run wrote no compose_path judge input — there is no ask to read the library out of");
                  } else {
                    const input = JSON.parse(readFileSync(ip, "utf8"));
                    const lib = input.moves_you_may_bind;
                    if (!Array.isArray(lib) || lib.length === 0) {
                      fails.push("(af) the compose_path ask carries no `moves_you_may_bind` — the composer meets a required `move` field with the field's NAME and no set of legal values, which is what produced six invented ids");
                    } else {
                      const store = loadMoveIds(join(rt, "moves"));
                      const want = store.error ? null : [...store.ids].sort().join(",");
                      const got = lib.map((m) => m.id).sort().join(",");
                      if (want !== null && want !== got) {
                        fails.push(`(af) the compose_path ask carries a Move set that is not the library's (${got}) — the composer is told the ids it may bind, so a set that is not the admitted set is a different closed world from the one adoption resolves against`);
                      }
                      // THE CONTRACT, NOT ONLY THE ID. An id list makes the
                      // field fillable; the before/after pair is what makes
                      // it decidable, and it is the same pair the
                      // specialization judgment is a comparison against.
                      for (const m of lib) {
                        if (typeof m.before !== "string" || m.before.trim() === ""
                          || typeof m.after !== "string" || m.after.trim() === "") {
                          fails.push(`(af) the Move ${JSON.stringify(m.id)} reaches the composer without its before/after — a Leg BINDS the Move whose contract its reader states specialize, so an id alone leaves the binding undecidable`);
                          break;
                        }
                      }
                      // VERBATIM FROM THE RECORD, asserted against the file
                      // rather than against a shape: a reader that reformatted
                      // the prose would be handing the judge a paraphrase of
                      // the contract it is judging against.
                      const one = lib[0];
                      const text = readFileSync(join(rt, "moves", `${one.id}.md`), "utf8");
                      for (const [field, value] of [["before", one.before], ["after", one.after]]) {
                        const head = value.split(" ").slice(0, 4).join(" ");
                        if (head && !text.replace(/\s+/g, " ").includes(head)) {
                          fails.push(`(af) ${one.id}'s ${field} in the ask does not appear in moves/${one.id}.md — the contract reaches the judge as a paraphrase rather than as the record`);
                        }
                      }
                    }
                  }
                }

                // ---- (ag) THE SPECIALIZATION ASK CARRIES THE CONTRACT IT
                // JUDGES AGAINST (kogaki#1125). The state's judgment_point asks
                // whether each Leg's states are specializations of "the
                // before and after its bound Move declares", and its input
                // carried `{ state, candidate_id, legs_you_must_judge }` and
                // nothing else — so the judge was asked about a record it was
                // never given, answered `cannot-determine`, and was re-asked
                // into a well-formed pass.
                //
                // ONE ENTRY PER LEG, bound to the Legs the ask itself
                // carries. A case counting against a constant would go green
                // the day the path length changed.
                ranCase("ag-specialization-contracts");
                {
                  const ip = join(D, "brief-judge-input-judge_specialization.json");
                  if (!existsSync(ip)) {
                    fails.push("(ag) the run wrote no judge_specialization input — there is no ask to read the Move contracts out of");
                  } else {
                    const input = JSON.parse(readFileSync(ip, "utf8"));
                    const legs = input.legs_you_must_judge || [];
                    const contracts = input.move_contracts;
                    if (!Array.isArray(contracts)) {
                      fails.push("(ag) the judge_specialization ask carries no `move_contracts` — the verdict is a comparison against a Move's before and after, and the judge is handed neither");
                    } else if (contracts.length !== legs.length) {
                      fails.push(`(ag) the ask carries ${contracts.length} Move contract(s) for ${legs.length} Leg(s) — the judgment is per Leg, so a Leg whose contract is absent is a verdict with nothing behind it`);
                    } else {
                      for (const st of legs) {
                        const c = contracts.find((x) => x.leg_id === st.leg_id);
                        if (!c) {
                          fails.push(`(ag) leg ${st.leg_id} is judged with no Move contract in the ask`);
                          break;
                        }
                        if (c.move !== st.move) {
                          fails.push(`(ag) leg ${st.leg_id} binds ${JSON.stringify(st.move)} and the ask carries the contract of ${JSON.stringify(c.move)} — a judgment against another Move's contract certifies nothing`);
                          break;
                        }
                        const want = moveContract(c.move, join(rt, "moves"));
                        if (want.error) {
                          fails.push(`(ag) the fixture cannot read ${c.move}'s record to bind the ask against: ${want.error}`);
                          break;
                        }
                        if (c.before !== want.before || c.after !== want.after) {
                          fails.push(`(ag) ${c.move}'s contract in the ask is not the record's — the judge compares against what it is handed, so a reworded contract moves the verdict without moving the Move`);
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      // ---- A SECOND SPAN IN THE SAME TREE, for the two refusals kogaki#1125
      // adds. The tree, the hooks and the fixtures are (n)'s; only the run
      // workspace, the open-run pointer and ONE judge answer differ, so a case
      // that goes red is red about that answer and not about the scaffolding.
      const spanIn = (name, stub, extraEnv = {}) => {
        const D2 = join(rt, `run-${name}`);
        const openRun2 = join(rt, `open-run-${name}`);
        const judge2 = join(rt, `judge-${name}`);
        // ITS OWN OPEN-GATES DIRECTORY, AND THAT IS LOAD-BEARING RATHER THAN
        // TIDY. `write-gate-capture.py` resolves a click by the QUESTION TEXT,
        // and these spans raise the same gates over the same fixture as (n)
        // above — so a shared directory leaves two pointers carrying one
        // question, the capture refuses to choose between them and writes
        // nothing, and the advance then finds no answer and exits 0 in silence.
        // A case reading that silence would report the refusal it was looking
        // for as absent, which is a false finding rather than a flake.
        const gates2 = join(rt, `open-gates-${name}`);
        mkdirSync(D2, { recursive: true });
        mkdirSync(gates2, { recursive: true });
        // THE SLUG IS THE ADOPTED THESIS'S, NOT THIS CALL'S `--slug`, so every
        // span over one fixture mints at the same path and `mint` refuses the
        // second — it creates and never overwrites. The spans here are
        // sequential and each is the only reader of what it minted, so the
        // previous one's output is cleared rather than the fixture being given
        // three theses that differ only in a name nothing reads.
        rmSync(join(rt, "theses"), { recursive: true, force: true });
        writeFileSync(openRun2, D2 + "\n");
        writeFileSync(judge2, stub, { mode: 0o755 });
        const calls2 = join(rt, `judge-calls-${name}.log`);
        writeFileSync(calls2, "");
        const env2 = { KOGAKI_JUDGE_CLI: judge2, KOGAKI_BRIEF_OPEN_RUN: openRun2, KOGAKI_OPEN_GATES: gates2,
          KOGAKI_FIXTURE_CALL_LOG: calls2, ...extraEnv };
        // Asks of one state, counted at the party that was asked.
        const asks = (stateId) => readFileSync(calls2, "utf8").split("\n").filter((l) => l === stateId).length;
        const started = inTree(["src/brief.mjs", "start", "--run-dir", D2,
          ...SETTLED, "--slug", `refusal-${name}`, "--moves-dir", "moves"],
          { ...env2, KOGAKI_ELEMENTS_PAYLOAD: join(rt, "fixtures", "elements.json") });
        // THE QUESTION IS THE COMPOSED CALL'S, NEVER THE DECLARATION'S.
        // `composeGateCall` renders the state's declared reading ABOVE the
        // question, so the bytes the owner is shown — and the bytes
        // `write-gate-capture.py` matches a pointer on — are the call's. Keying
        // on `declaration.question` writes no capture row, the advance then
        // finds none and exits 0 in silence, and a case reading that silence
        // reports a refusal as absent. This is `declaredQuestion` above,
        // narrowed to this span's own run directory.
        const declOf = (stateId) => {
          let rec;
          try { rec = JSON.parse(readFileSync(join(D2, "run-record.json"), "utf8")); } catch { return null; }
          const owed = (rec.gate_declarations_owed || []).find((g) => g.state === stateId && g.declaration);
          if (!owed) return null;
          const dp = resolvePath(rt, owed.declaration);
          const decl = JSON.parse(readFileSync(dp, "utf8"));
          const callPath = join(dirnameOf(dp), `${decl.id}.gate-call.json`);
          if (existsSync(callPath)) {
            try { decl.question = JSON.parse(readFileSync(callPath, "utf8")).questions[0].question; }
            catch { /* the declaration's own question is the fallback */ }
          }
          return decl;
        };
        const answer = (id, stateId, pick) => {
          const decl = declOf(stateId);
          if (!decl) return null;
          const body = payloadFor(id, decl.question, pick(decl));
          hook("write-gate-capture.py", body, { ...env2, KOGAKI_RUN_DIR: D2 });
          return hook("advance-brief.py", body, env2);
        };
        const record = () => {
          try { return JSON.parse(readFileSync(join(D2, "run-record.json"), "utf8")); } catch { return {}; }
        };
        return { D2, started, declOf, answer, record, env2, asks };
      };

      // ---- (ad) A DANGLING MOVE ID IS REFUSED AT `compose_path`, BY NAME
      // (kogaki#1125). Case (k) above asserts the same resolution at ADOPTION,
      // which is where it used to happen first — five states and an owner gate
      // downstream. Both are kept: (k) is the write's own guard and (ad) is the
      // guard inside the re-ask window, and a runtime that resolved at only one
      // of the two would leave the other case red.
      //
      // ASSERTED AT THE SPAN, not against `resolveMoveIds`. A mutation deleting
      // the call from `compose_path`'s validator survives every direct call to
      // that function — the shape (x) above records one case over — so what is
      // asserted here is that the STATE runs it.
      ranCase("ad-compose-dangling");
      {
        const sp = spanIn("dangling", judgeStub({ danglingMove: "no_such_move_kogaki_1125" }));
        if (sp.started.status !== 0) {
          fails.push(`(ad) the start act failed before the span could compose: ${(sp.started.stderr || "").trim().slice(0, 300)}`);
        } else {
          const a = sp.answer("toolu_1125_dangling", "THESIS_ADOPTION", () => "thesis-1");
          if (!a) {
            fails.push("(ad) the start act raised no THESIS_ADOPTION declaration — the span never reached path composition");
          } else {
            const said = `${a.stderr || ""}${a.stdout || ""}`;
            if (!/no_such_move_kogaki_1125/.test(said)) {
              fails.push(`(ad) a Leg binding an id absent from the Move library was NOT refused at compose_path naming the id — it rides the composition through review, assembly and the owner's gate to the adoption write. advance said: ${said.trim().slice(0, 400)}`);
            }
            if (!/\bx1\b/.test(said)) {
              fails.push("(ad) the compose_path dangling-move refusal does not name the LEG — the composer is told an id is wrong and not which Leg binds it");
            }
            // THE GATE WAS NEVER REACHED, which is the whole of what raising
            // the refusal EARLIER buys. A refusal that fired after the owner
            // had already chosen a path would be the state of affairs this
            // case exists to end.
            if (sp.declOf("CANDIDATE_SELECTION")) {
              fails.push("(ad) the run reached the Candidate-selection gate with a dangling Move id in every Candidate — the owner is asked to choose between paths none of which can be adopted");
            }
            // AND THE WINDOW WAS SPENT, which is the CONTRAST (ae) is read
            // against. A dangling id is repairable from this input — the ask
            // carries the admitted set — so the table's `retries: 2` buys
            // three asks and the refusal is a `JudgmentRefusal`. (ae)'s
            // verdict is not repairable from its input and buys one. Without
            // this assertion the pair would be two cases about refusing, and
            // the distinction the two classes exist for would be untested.
            // THE COUNT IS DERIVED FROM THE TABLE, NEVER TRANSCRIBED (PR #1127
            // round 1). `retries` is a property of the workflow and is held in
            // `src/brief-workflow.json` — src/terrain.mjs says so at the field
            // it reads there — so a literal here would fail this case naming
            // the table's OLD value as if it were current the day the row
            // changes. (ae)'s `1` is not the same shape: ONE ask is the
            // property under test, not a copy of a declared number.
            const table1125 = JSON.parse(readFileSync(join(rt, "src", "brief-workflow.json"), "utf8"));
            const composeSt = (table1125.states || []).find((x) => x.id === "compose_path");
            const licensed = Number.isInteger(composeSt && composeSt.retries) ? composeSt.retries + 1 : null;
            const spent = sp.asks("compose_path");
            if (licensed === null) {
              fails.push("(ad) compose_path declares no integer `retries` in the workflow table — the window this case is about has no declared size, so the count below would be asserted against nothing");
            } else if (spent !== licensed) {
              fails.push(`(ad) compose_path was asked ${spent} time(s) for a dangling Move id and the table licenses ${licensed} — a dangling id is repairable from an ask that carries the admitted set, which is exactly what that window is for; one ask here would mean the refusal is being treated as terminal`);
            }
            const rec = sp.record();
            if (rec.done === true) {
              fails.push("(ad) the run record reports done after a dangling Move id — the composition was accepted");
            }
          }
        }
      }

      // ---- (ae) `cannot-determine` IS TERMINAL, NOT RE-ASKABLE (kogaki#1125).
      //
      // The observed run: attempt 1 answered `cannot-determine` on B1 saying
      // the Moves library carried no such id, `validateSpecialization` refused
      // it, the refusal-repair window re-asked, and attempt 2 returned
      // `consistent` for all six Legs with each `why` describing a contract
      // that does not exist. The run record called that a repair.
      //
      // TWO ASSERTIONS, AND THE SECOND IS THE ONE THAT BINDS THE PROPERTY. That
      // the run stops is necessary but not sufficient: it also stopped before,
      // three attempts later, on whatever the third answer was. What is new is
      // that ONE attempt was spent and `refusals_repaired` counts none — a
      // verdict not reached from this input is not reached from the same input
      // on a second ask, so the bound is not spent pressuring the judge.
      ranCase("ae-cannot-determine-terminal");
      {
        const sp = spanIn("undecided", judgeStub({ specVerdict: "cannot-determine" }));
        if (sp.started.status !== 0) {
          fails.push(`(ae) the start act failed before the span could judge: ${(sp.started.stderr || "").trim().slice(0, 300)}`);
        } else {
          const a1 = sp.answer("toolu_1125_undecided_thesis", "THESIS_ADOPTION", () => "thesis-1");
          if (!a1) {
            fails.push("(ae) the start act raised no THESIS_ADOPTION declaration");
          } else {
            const a2 = sp.answer("toolu_1125_undecided_select", "CANDIDATE_SELECTION",
              (d) => (d.options.find((o) => o.id !== "none-of-these") || {}).id);
            if (!a2) {
              fails.push("(ae) the span did not reach the Candidate-selection gate, so `judge_specialization` never ran");
            } else {
              const said = `${a2.stderr || ""}${a2.stdout || ""}`;
              if (!/cannot-determine/.test(said)) {
                fails.push(`(ae) a cannot-determine verdict did not stop the run naming the verdict. advance said: ${said.trim().slice(0, 400)}`);
              }
              if (!/\bx1\b/.test(said)) {
                fails.push("(ae) the cannot-determine refusal does not name the LEG whose judgment was not reached");
              }
              // THE BOUND WAS NOT SPENT, COUNTED AT THE JUDGE. `judge_calls`
              // is written on the PASSING arm alone, so a refusing state
              // records no attempt count and the run record cannot answer
              // this; the stub's own log can. ONE ask, against the table's
              // `retries: 2` — three is what the window would have spent.
              const spent = sp.asks("judge_specialization");
              if (spent !== 1) {
                fails.push(`(ae) judge_specialization was asked ${spent} time(s) for a cannot-determine verdict — the re-ask meets the same input, so every ask past the first buys a better-formed answer to a question that was not answerable, which is how attempt 2 came to return six consistent verdicts over contracts that do not exist`);
              }
              const rec = sp.record();
              if ((rec.judge_calls || {}).judge_specialization) {
                fails.push("(ae) the run record carries a judge_specialization call record for a state that refused — `judge_calls` is the passing arm's own record, and a refusal that writes one would report a spent-and-repaired round where none was");
              }
              if (rec.done === true) {
                fails.push("(ae) the run record reports done after a cannot-determine verdict — the Candidate was adopted on a judgment that was not reached");
              }
            }
          }
        }
      }

      // ---- (al) A CANDIDATE OPENING A SECTION ON TWO ADJACENT SINGLE LEGS IS
      // REFUSED AT `compose_path`, AND THE PROMPT CARRIED THE RULE (kogaki#1147).
      //
      // THE OBSERVED RUN. Two /brief runs on 2026-09-18 over the six-Lesson
      // `some-safety-properties-cannot-checked` set died here: the one attempt
      // of each that finished inside the per-call bound was refused by rule 4 —
      // two adjacent Sections holding exactly one Leg each — and the other
      // attempts timed out, so the licensed re-asks were spent before the
      // repair could land. The composing party had never been shown the rule.
      //
      // TWO ASSERTIONS, AND THE SECOND IS THE ONE THIS ISSUE ADDS. That the
      // refusal fires and names both Legs is case (q)'s property, driven here
      // through the STATE rather than through a direct call — the shape (ad)
      // records, one rule over. That the PROMPT the judge was handed contains
      // the rule text is the defect itself: the refusal was already there, and
      // what was missing was the text in front of the party composing against
      // it. The prompt is read from the stub, because the executor's own
      // composer is internal and the judge is the only party those bytes reach.
      ranCase("al-compose-section-rule-4");
      {
        const promptLog = join(rt, "prompt-rule4");
        const sp = spanIn("rule4", judgeStub({ sectionOnEveryLeg: true }),
          { KOGAKI_FIXTURE_PROMPT_LOG: promptLog });
        if (sp.started.status !== 0) {
          fails.push(`(al) the start act failed before the span could compose: ${(sp.started.stderr || "").trim().slice(0, 300)}`);
        } else {
          const a = sp.answer("toolu_1147_rule4", "THESIS_ADOPTION", () => "thesis-1");
          if (!a) {
            fails.push("(al) the start act raised no THESIS_ADOPTION declaration — the span never reached path composition");
          } else {
            const said = `${a.stderr || ""}${a.stdout || ""}`;
            const rule4 = (JSON.parse(readFileSync(join(rt, "src", "leg-schema.json"), "utf8")).path_rules || {}).section_rule_4;
            if (!rule4) {
              fails.push("(al) the tree's src/leg-schema.json declares no `path_rules.section_rule_4` — there is no rule text for either half of this case to be about");
            } else {
              if (!said.includes(rule4.name)) {
                fails.push(`(al) a Candidate opening a Section on two adjacent single Legs was not refused at compose_path naming the rule — it rides the composition to the owner's gate. advance said: ${said.trim().slice(0, 400)}`);
              }
              // BOTH LEGS, because the repair is a MERGE and a merge needs two
              // names: told only where the first Section opens, a composer
              // cannot tell which pair it is being asked to join.
              if (!/\bx1\b/.test(said) || !/\bx2\b/.test(said)) {
                fails.push(`(al) the rule 4 refusal does not name BOTH Legs — the request is to merge two Sections, and one name leaves the other end of the merge to be guessed. advance said: ${said.trim().slice(0, 400)}`);
              }
              // THE PROMPT CARRIED THE RULE. This is the whole of kogaki#1147:
              // the refusal was already correct, and the party it was raised
              // against had never been shown the rule it broke.
              const promptPath = `${promptLog}.compose_path`;
              if (!existsSync(promptPath)) {
                fails.push("(al) the judge recorded no `compose_path` prompt — the state was never asked, so the span refused before the ask and this case's second half is about nothing");
              } else {
                const shown = readFileSync(promptPath, "utf8");
                if (!shown.includes(rule4.rule)) {
                  fails.push("(al) the rendered `compose_path` prompt does not contain rule 4's text — the validator refuses a rule the composing party was never told, which it can then satisfy only by chance on a first attempt and learn only from a refusal that has already cost an attempt");
                }
                if (!shown.includes(rule4.name)) {
                  fails.push("(al) the rendered `compose_path` prompt does not name rule 4 — a refused composer searching the prompt for the words the refusal handed it finds nothing");
                }
              }
            }
            // THE GATE WAS NEVER REACHED, the property (ad) and (ai) assert one
            // refusal over: a grouping refusal that fired after the owner had
            // chosen is a path adopted and then refused at the write.
            if (sp.declOf("CANDIDATE_SELECTION")) {
              fails.push("(al) the run reached the Candidate-selection gate with a rule-4 grouping in every Candidate — the owner is asked to choose between paths none of which can be adopted");
            }
            const rec = sp.record();
            if (rec.done === true) {
              fails.push("(al) the run record reports done after a rule-4 grouping — the composition was accepted");
            }
          }
        }
      }

      // ---- (ai) THE THREE LEDGER FIELDS ARE REFUSED AT `compose_path`, BY
      // FIELD NAME (kogaki#1129). `obligations`, `coverage` and `unused` were
      // named in this state's `input_shape` sentence and declared nowhere, so
      // the composing Model chose their key names: the observed run wrote
      // `raised_at` / `owed` / `settled_at`, which `src/compose.mjs` refused at
      // the Brief's FINAL WRITE — after two owner gates and three judge calls,
      // outside every re-ask window — and which `candidateEvidence` had already
      // scored as four undischarged obligations at the gate the owner answered.
      //
      // DRIVEN THROUGH THE SPAN, for the reason (ad) is: a direct call to
      // `candidateLedgerRefusal` survives a mutation that deletes the call from
      // `compose_path`'s validator, and the property under test is that the
      // STATE runs it.
      ranCase("ai-compose-ledger-keys");
      {
        const sp = spanIn("ledger", judgeStub({ undeclaredLedger: true }));
        if (sp.started.status !== 0) {
          fails.push(`(ai) the start act failed before the span could compose: ${(sp.started.stderr || "").trim().slice(0, 300)}`);
        } else {
          const a = sp.answer("toolu_1129_ledger", "THESIS_ADOPTION", () => "thesis-1");
          if (!a) {
            fails.push("(ai) the start act raised no THESIS_ADOPTION declaration — the span never reached path composition");
          } else {
            const said = `${a.stderr || ""}${a.stdout || ""}`;
            // BY FIELD NAME, which is the whole of what a declaration buys the
            // composer: told an obligation entry is wrong and not WHICH KEY it
            // owes, a re-ask is a guess at the same sentence.
            if (!/introduced_by|\btext\b/.test(said)) {
              fails.push(`(ai) an obligations ledger written as raised_at/owed/settled_at was NOT refused at compose_path naming the field it owes — it rides the composition through review, assembly and the owner's gate to the write that refuses it. advance said: ${said.trim().slice(0, 400)}`);
            }
            if (!/obligation 1\b/.test(said)) {
              fails.push(`(ai) the compose_path ledger refusal does not name the ENTRY — a ledger with several entries leaves the composer re-reading all of them. advance said: ${said.trim().slice(0, 400)}`);
            }
            // THE GATE WAS NEVER REACHED. A refusal that fired after the owner
            // had chosen a path is the state of affairs this case exists to
            // end, and it is the state of affairs the observed run was in.
            if (sp.declOf("CANDIDATE_SELECTION")) {
              fails.push("(ai) the run reached the Candidate-selection gate with an unreadable obligations ledger in every Candidate — the owner is shown an undischarged count over entries nothing could read, and the adoption write then refuses");
            }
            // AND THE WINDOW WAS SPENT. A ledger under the wrong key names is
            // repairable from THIS input — the ask carries the declaration the
            // schema file states — so the table's own `retries` is what the
            // refusal is worth, the same contrast (ad) is read against.
            const table1129 = JSON.parse(readFileSync(join(rt, "src", "brief-workflow.json"), "utf8"));
            const composeSt1129 = (table1129.states || []).find((x) => x.id === "compose_path");
            const licensed1129 = Number.isInteger(composeSt1129 && composeSt1129.retries) ? composeSt1129.retries + 1 : null;
            const spent1129 = sp.asks("compose_path");
            if (licensed1129 === null) {
              fails.push("(ai) compose_path declares no integer `retries` in the workflow table — the window this case is about has no declared size");
            } else if (spent1129 !== licensed1129) {
              fails.push(`(ai) compose_path was asked ${spent1129} time(s) for a ledger under undeclared key names and the table licenses ${licensed1129} — the declaration rides in the ask, so this is exactly the class the window is for`);
            }
            const rec = sp.record();
            if (rec.done === true) {
              fails.push("(ai) the run record reports done after an unreadable obligations ledger — the composition was accepted");
            }
          }
        }
      }
    } finally {
      rmSync(rt, { recursive: true, force: true });
    }
  }

  // (o) THE ROUND-TRIP CONCESSION IS REFUSED WHEN ABSENT (kogaki#752),
  // RESTORED after kogaki#770 destroyed its only carrier.
  //
  // The refusal lived in check-brief-entry.sh cases (b)/(b3). That member was
  // removed under the 2026-09-02 retention rule and its arc table was re-homed
  // here — the ARC TABLE ONLY. The removal took the assertion round 1 had
  // named and left everything else the member was discharging, which is the
  // completeness half of an extraction stated nowhere in that act: a removal
  // owes an INVENTORY of the obligations the departing carrier held, not a
  // repair of the one finding that prompted it.
  //
  // THE RULE WAS LIVE THROUGHOUT. `composeThesisCandidates` emits a concession
  // per candidate and src/gate-registry.json requires each option to state one,
  // so between kogaki#770 and this restoration a candidate with no concession
  // would have reached the owner's gate with nothing objecting. Carrier-less
  // BY OMISSION is the defect — a stated policy is admissible stated, measured,
  // or deliberately carrier-less with a reopen trigger, and this was none of
  // the three (product-lab@f8794c64 topics/knowledge-architecture.md:345).
  //
  // ITS NORMATIVE HOME IS THE DESIGN RECORD, not a spec section: the ground
  // for the round trip lives at specs/spec-brief-draft-design/DESIGN.md, and
  // this case is the mechanical half that document cannot be.
  ranCase("o");
  {
    const strands = [
      { id: "L1", display_id: "L1", slug: "alpha", claim: "the alpha claim, stated plainly" },
      { id: "L2", display_id: "L2", slug: "bravo", claim: "the bravo claim, stated plainly" },
    ];
    // BOTH BRANCHES (PR #781 round 1). `composeThesisCandidates` splits on
    // `strands.length === 1`, and the one-Strand branch builds its candidates
    // through a POSITIONAL helper `one(id, claim, extra, concession)` — so
    // dropping the fourth argument at either push site leaves a multi-Strand
    // fixture green while `enter` renders `<thesis> undefined` to the owner.
    // The recorded mutation attacks the shared constructor and cannot see it.
    // Fourth time this suite family has met the fixture-too-small class; the
    // fix is a case that enters the branch, not a stronger assertion.
    const oneStrand = [{ id: "L1", display_id: "L1", slug: "alpha", claim: "the lone claim, stated plainly" }];
    const cands = [...composeThesisCandidates(strands), ...composeThesisCandidates(oneStrand)];
    if (!Array.isArray(cands) || cands.length < 4) {
      fails.push(`(o) the composer produced ${cands.length} candidate(s) across both branches — the concession assertion cannot reach the one-Strand branch`);
    } else {
      for (const c of cands) {
        if (!(c.concession || "").trim()) {
          fails.push(`(o) candidate ${c.id} carries no round-trip concession — the original claim must be recoverable from the plain version, with anything lost restored or EXPLICITLY CONCEDED; a concession is part of the output and never a silent omission (specs/spec-brief-draft-design/DESIGN.md)`);
        }
      }
      // THE GATE'S OWN LABEL CARRIES IT, which is the property that makes the
      // concession reach the owner rather than merely exist on the record.
      const labelled = cands.every((c) => (c.thesis || "").includes(c.claim));
      if (!labelled) fails.push("(o) a candidate's thesis does not open with its own claim — the mint would record text the owner never read");
    }
  }

  // (p) THE BRIEF LANE'S SNAPSHOT DESTINATION (kogaki#750). `snapshotBrief` is
  // the one write in this lane whose home was `~/.kogaki/brief-runs/<slug>/`,
  // and every other case here drives paths that never changed — so without this
  // the member is green about a lane still writing to the retired directory.
  //
  // DRIVEN, not asserted against the expression: the destination is computed
  // inside `snapshotBrief` from the Brief path, so the only honest way to learn
  // where it lands is to land one. It writes and creates; it does not PRUNE, so
  // this case cannot evict a real workspace. The fixture slug is its own, and
  // the whole entry is removed afterwards.
  ranCase("p");
  {
    const slug = `brief-compose-lane-case-${process.pid}`;
    const briefDir = join(dir, slug);
    mkdirSync(briefDir, { recursive: true });
    const bp = join(briefDir, "brief.md");
    writeFileSync(bp, "# fixture\n");
    const laneEntry = join(laneDir("brief"), slug);
    try {
      const seq = snapshotBrief(bp, "mint", "before", "the assembled state");
      const landed = join(laneEntry, "snapshots");
      if (!existsSync(landed)) {
        fails.push(`(p) the Brief snapshot did not land under the brief lane — expected ${landed}`);
      } else if (readdirSync(landed).length === 0) {
        fails.push("(p) the brief lane's snapshot directory exists but holds nothing — the trace warns and continues, so an empty directory is a silent skip");
      }
      if (seq === null) fails.push("(p) snapshotBrief returned no sequence number, which is how a paired after-call loses its before");
      // The CONTROL that this is about a MOVE and not about any path that
      // happens to exist: the destination resolves under the repository's runs/
      // directory and under no home directory.
      if (!laneEntry.startsWith(join(REPO_ROOT, "runs") + sep)) {
        fails.push(`(p) the brief lane resolves outside the repository's runs/ directory: ${laneEntry}`);
      }
      if (laneEntry.includes(`${sep}.kogaki${sep}`)) {
        fails.push(`(p) the brief lane still resolves under a home directory: ${laneEntry}`);
      }
    } finally {
      rmSync(laneEntry, { recursive: true, force: true });
    }
  }

  // (h) JOURNEY COVERAGE (§6.1 MUST 1, kogaki#501): journey material is a
  // DISTINCT material (§4.1's "which Journeys"), PLACED OR ITS OMISSION
  // DISCLOSED — derived from the composed legs, never declared. The fixture's
  // L2 carries a Journey and L1 does not, which is what makes the two refusals
  // below separable.
  //
  // PLACEMENT IS COUNTED FROM `journeys`, AND THAT REVERSES kogaki#1111
  // (kogaki#1131). It was counted from a `<L-id>.journey` token in
  // `materials`, beside a `journeys` field that rendered the Leg's own
  // `journey:` line — two readers of one fact, which disagreed on the first
  // Brief written to `done`: every Leg of the adopted Candidate named its
  // Strand bare and declared `journeys`, so the Brief rendered four `journey:`
  // lines and disclosed all five Strands as OMITTED in the same document. The
  // fixtures below therefore place through `journeys` and name the Strand
  // BARE, which is the shape that read as omitted.
  ranCase("h");
  if (JSON.stringify(journeyBearingStrands(doc0)) !== JSON.stringify(["L2"]))
    fails.push(`(h) journey-bearing members misread: got ${JSON.stringify(journeyBearingStrands(doc0))}, expected ["L2"] (L2 carries a journey cite, L1 does not)`);

  // placed: a leg declaring a `journeys` entry on L2, naming L2 BARE
  const jleg = { ...JSON.parse(JSON.stringify(leg1)), materials: ["L2", "thesis"],
    journeys: [{ strand: "L2", use: "illustrate" }] };
  const jfill = fillBrief(doc0, { legs: [jleg, leg2] });
  if (jfill.error) fails.push(`(h) a path placing journey material was refused: ${jfill.error}`);
  else {
    if (!/\*\*L2\*\* journey — placed by: s1/.test(jfill.doc)) fails.push("(h) placed journey material is not disclosed as placed");
    if (!/Journey placement count[^\n]*1 of 1/.test(jfill.doc)) fails.push("(h) the journey placement count is not 1 of 1 when the only Journey-bearing Strand is placed");
    // THE TWO READERS OF ONE FACT AGREE, asserted on ONE document (kogaki#1131
    // AC2): the Leg rendered a `journey:` line and the coverage section must
    // not disclose the same Strand as omitted. This is the contradiction the
    // Issue was filed on, stated as an assertion over the rendered Brief.
    if (/journey: L2/.test(jfill.doc) && /\*\*L2\*\* journey — \*\*OMITTED/.test(jfill.doc)) {
      fails.push("(h) one Brief renders a `journey: L2` line and discloses L2's Journey as OMITTED — the placement count and the Legs' own journey lines read different fields, which is a FALSE disclosure handed to /draft (kogaki#1131)");
    }
  }

  // THE REVERSED HALF, asserted by name (kogaki#1131): a `<L-id>.journey` token
  // with NO `journeys` entry no longer places. The token stays LEGAL — it names
  // the Strand, and it is still checked against the closed set and the served
  // record by the two refusals below — but a Leg places a Journey by declaring
  // what it uses it FOR, and nothing else. Asserted rather than left implied:
  // the count moving field is the whole change, and an untested reversal reads
  // exactly like an untested retention.
  const tokfill = fillBrief(doc0, { legs: [{ ...JSON.parse(JSON.stringify(leg1)), materials: ["L2", "L2.journey", "thesis"] }, leg2] });
  if (tokfill.error) fails.push(`(h) a path naming L2.journey in materials was refused: ${tokfill.error} — the token stays legal, only its counting was withdrawn`);
  else if (!/Journey placement count[^\n]*0 of 1/.test(tokfill.doc)) {
    fails.push("(h) a bare `L2.journey` token in materials still places the Journey — the count did not move to `journeys`, so the second source kogaki#1131 removed is back and can disagree with the Leg's own journey line");
  }

  // omitted: no leg declares a journey — DISCLOSES, never refuses
  const ofill = fillBrief(doc0, { legs: [leg1, leg2] });
  if (ofill.error) fails.push(`(h) a path omitting journey material was REFUSED — §6.1 is place-or-disclose, never place-or-fail: ${ofill.error}`);
  else {
    if (!/\*\*L2\*\* journey — \*\*OMITTED, disclosed\*\*/.test(ofill.doc)) fails.push("(h) omitted journey material is not disclosed — it dropped silently, which is the defect §6.1 MUST 1 names");
    if (!/Journey placement count[^\n]*0 of 1/.test(ofill.doc)) fails.push("(h) the journey placement count is not 0 of 1 when the Journey-bearing Strand is unplaced");
  }

  // a Strand whose served record carries NO journey refuses BY NAME
  const bad1 = fillBrief(doc0, { legs: [{ ...JSON.parse(JSON.stringify(leg1)), materials: ["L1.journey"] }, leg2] });
  if (!bad1.error || !/carries none/.test(bad1.error)) fails.push("(h) claiming Journey material for a Strand that has none was accepted — unsupported completion (§4.4)");
  // a Journey outside the closed set refuses as a Brief fetch
  const bad2 = fillBrief(doc0, { legs: [{ ...JSON.parse(JSON.stringify(leg1)), materials: ["L9.journey"] }, leg2] });
  if (!bad2.error || !/closed set/.test(bad2.error)) fails.push("(h) a Journey naming a Strand outside the closed set was accepted — a Brief fetch (§5.3)");

  // VACUOUS, never violated: journeyPlacements over an empty Journey set
  if (journeyPlacements([leg1, leg2], []).size !== 0) fails.push("(h) journeyPlacements over no Journey-bearing member is not empty");

  // (h2) THE COUNT IS PER-STRAND OVER A SET LARGER THAN ONE (kogaki#1131 AC3).
  // (h) runs over a Brief with exactly ONE Journey-bearing Strand, where `N of
  // N` and `1 of 1` are the same string and a counter that returned the size of
  // its own key set would pass. The defect this Issue was filed on was `0 of 5`,
  // so the fixture that closes it needs a set it can be wrong about: a Brief
  // carrying TWO Journey-bearing Strands, one Candidate placing both through
  // `journeys` and one placing neither.
  //
  // THE SECOND CITE IS INSERTED INTO THE MINTED DOCUMENT rather than minted
  // from a second fixture Strand, because `journeyBearingStrands` reads the
  // document and nothing else — the insert is the whole of what the fixture
  // needs, and it is proved to have landed before anything is asserted over it.
  ranCase("h2");
  {
    const docJ2 = doc0.replace(/^(### L1 — [^\n]*\n)/m,
      "$1- journey cite: `gloss/ELEMENTS.jsonl slug=bravo kind=journey @0000000000000000000000000000000000000000`\n");
    const j2 = journeyBearingStrands(docJ2);
    if (JSON.stringify(j2) !== JSON.stringify(["L1", "L2"])) {
      fails.push(`(h2) the two-Journey fixture did not land: journey-bearing members read ${JSON.stringify(j2)}, expected ["L1", "L2"] — every assertion below would be vacuous`);
    } else {
      const bothLegs = [
        { ...JSON.parse(JSON.stringify(leg1)), materials: ["L2", "thesis"], journeys: [{ strand: "L2", use: "contrast" }] },
        { ...JSON.parse(JSON.stringify(leg2)), journeys: [{ strand: "L1", use: "illustrate" }] },
      ];
      const both = fillBrief(docJ2, { legs: bothLegs });
      if (both.error) fails.push(`(h2) a path placing every Journey-bearing Strand was refused: ${both.error}`);
      else {
        if (!/Journey placement count[^\n]*2 of 2/.test(both.doc)) fails.push("(h2) a Candidate placing both Journey-bearing Strands does not render 2 of 2");
        if (/journey — \*\*OMITTED/.test(both.doc)) fails.push("(h2) a Candidate placing every Journey-bearing Strand still discloses an OMISSION — the disclosure reports omission over material the path placed, which is the false disclosure kogaki#1131 was filed on");
        if (!/\*\*L1\*\* journey — placed by: s2/.test(both.doc) || !/\*\*L2\*\* journey — placed by: s1/.test(both.doc)) {
          fails.push("(h2) the per-Strand placed-by lines do not name the Legs that placed each Journey — the count and the lines read different fields");
        }
      }
      const none = fillBrief(docJ2, { legs: [leg1, leg2] });
      if (none.error) fails.push(`(h2) a path placing NO journey material was REFUSED — §6.1 is place-or-disclose: ${none.error}`);
      else {
        if (!/Journey placement count[^\n]*0 of 2/.test(none.doc)) fails.push("(h2) a Candidate placing no Journey material does not render 0 of 2");
        for (const id of ["L1", "L2"]) {
          if (!new RegExp(`\\*\\*${id}\\*\\* journey — \\*\\*OMITTED, disclosed\\*\\*`).test(none.doc)) {
            fails.push(`(h2) ${id}'s unplaced Journey is not disclosed — it dropped silently, which is the defect §6.1 MUST 1 names`);
          }
        }
      }
      // AC2: the THIRD rendering — the gate's journey axis — reads the same
      // field as the two above. Two Candidates placing different Journey
      // material must not read identically here; that is the property the
      // figure exists to expose, and it was flat across every Candidate on the
      // Brief kogaki#1131 was filed on.
      const sids = selectedStrands(docJ2);
      const eBoth = candidateEvidence({ ...JSON.parse(JSON.stringify(candA)), legs: bothLegs }, sids, j2);
      const eNone = candidateEvidence({ ...JSON.parse(JSON.stringify(candA)), legs: [leg1, leg2] }, sids, j2);
      if (!/2 of 2 Journey-bearing/.test(eBoth.journey_coverage || "")) fails.push(`(h2) the gate's journey axis disagrees with the Brief's own count for the placing Candidate: ${eBoth.journey_coverage}`);
      if (/OMITTED/.test(eBoth.journey_coverage || "")) fails.push(`(h2) the gate's journey axis discloses an omission the path did not make: ${eBoth.journey_coverage}`);
      if (!/0 of 2 Journey-bearing/.test(eNone.journey_coverage || "") || !/OMITTED and disclosed: L1, L2/.test(eNone.journey_coverage || "")) {
        fails.push(`(h2) the omitting Candidate's journey axis does not disclose both Strands: ${eNone.journey_coverage}`);
      }
      if (eBoth.journey_coverage === eNone.journey_coverage) {
        fails.push("(h2) two Candidates placing different Journey material read IDENTICALLY at the gate — the journey axis of Candidate differentiation carries no difference, which is what kogaki#1131 observed across every Candidate of the first completed Brief");
      }
    }
  }

  // (i) PER-CANDIDATE journey coverage (§6.1: register is an axis Candidates
  // differ on, so the figure is per Candidate and never averaged across the
  // Brief).
  //
  // RE-POINTED FROM THE PAYLOAD TO THE DERIVATION (kogaki#859). It read
  // `option.evidence.journey_coverage`, and the amended ruling removed that
  // object from the payload — so the read would have thrown, and the tempting
  // repair, deleting the case, would have retired §6.1's only mechanical
  // evidence at the moment its DISPLAY was withdrawn. Display and computation
  // are different questions and only the first was ruled on. The per-Candidate
  // property is asserted where it is now computed, and the assembly call is
  // KEPT beside it as the control that a journey-placing Candidate still
  // reaches the gate at all.
  ranCase("i");
  const jcandA = { ...JSON.parse(JSON.stringify(candA)), legs: [jleg] };
  const jpay = assembleSelection({ candidates: [jcandA, candB] }, doc0);
  if (jpay.error) fails.push(`(i) assembly refused a Candidate placing journey material: ${jpay.error}`);
  else if (!jpay.payload.options.some((x) => x.id === jcandA.candidate_id)) {
    fails.push("(i) a Candidate placing journey material did not reach the gate");
  }
  {
    const jids = journeyBearingStrands(doc0);
    const e1 = candidateEvidence(jcandA, selectedStrands(doc0), jids);
    const e2 = candidateEvidence(candB, selectedStrands(doc0), jids);
    if (!/1 of 1 Journey-bearing/.test(e1.journey_coverage || "")) fails.push("(i) the placing Candidate's journey_coverage is absent or wrong");
    if (!/OMITTED and disclosed: L2/.test(e2.journey_coverage || "")) fails.push("(i) the omitting Candidate's journey_coverage does not disclose the omission — two Candidates differing on this axis read identically");
    if (/verdict|pass|score/i.test(e1.journey_coverage || "")) fails.push("(i) journey_coverage reads as a verdict — §6.1 registers no check and §4.6 keeps every MUST un-linted");
  }

  // (j) THE RENDERING IS BOUND TO THE LABELS (kogaki#520, reshaped at
  // kogaki#568, REDUCED at kogaki#859). This assertion used to require one
  // prose paragraph per evidence item and per review area — sixteen per
  // Candidate, ~20,000 characters above a question whose labels total under
  // 900. The owner ruling of 2026-09-04 closed that rendering path: the gate
  // shows the reader-experience labels and nothing else, and the composed
  // reasoning stays in `evidence` as the run's record.
  //
  // WHAT THIS CATCHES, stated because an assertion that cannot name its defect
  // is asserting the absence of output: the rendering re-acquiring per-item
  // paragraphs. That is not hypothetical — it is the exact shape this check
  // required one commit ago, so the failure mode is a revert, a merge, or a
  // producer added later that composes the old list. `length === 0` is the
  // property, not a proxy for it, and no partial restoration passes it.
  //
  // THE RECORD ASSERTIONS SURVIVE UNCHANGED and are the other half: a
  // reduction that also dropped the evidence would satisfy an emptiness test
  // while losing what the ruling explicitly kept.
  ranCase("j");
  const INTERNAL = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/;
  const plain = assembleSelection({ candidates: [candA, candB] }, doc0);
  if (plain.error) fails.push(`(j) a plain-register Candidate set was refused: ${plain.error}`);
  for (const o of (plain.payload?.options || []).filter((x) => !x.negates_premise)) {
    const rend = o.rendering;
    // THE KEY IS PRESENT AND EMPTY — the two are asserted apart. A vanished
    // key and an empty one are the same silence to a reader and different
    // silences here, and only the second lets a later run tell "nothing is
    // rendered" from "nothing renders it".
    if (!Array.isArray(rend)) {
      fails.push(`(j) option ${o.id} carries no rendering key — the key stays and holds the empty list, so the bound is readable rather than merely unwritten (kogaki#859)`);
    } else if (rend.length !== 0) {
      // SCOPED BY kogaki#909, and the scope is stated rather than left to a
      // reader who finds an emptiness assertion beside a rendering case. #859's
      // emptiness is the rule for a Candidate owing NO decision-grade
      // disclosure, which is what `candA`/`candB` are — neither carries a
      // declared decision-grade field. A Candidate that DOES carry one renders
      // it, by #859's own one-item-at-a-time reversal clause, and that is (u)'s
      // subject. Asserting emptiness unconditionally here would make this case
      // and (u) contradict each other, with the suite green on whichever ran
      // first.
      fails.push(`(j) option ${o.id} renders ${rend.length} entr(y/ies) above the question, and this Candidate owes no decision-grade disclosure — the gate is bound to its labels, and the composition-time reasoning stays in the record (kogaki#859): ${JSON.stringify(String(rend[0]).slice(0, 80))}`);
    }
    // THE LABEL IS NOW THE WHOLE OWNER SURFACE, so the plain-register floor
    // moves onto it. It was covered transitively while the paragraphs carried
    // the same rule; with them gone, an unasserted label is the one thing the
    // owner actually reads.
    if (typeof o.label !== "string" || o.label.trim() === "") {
      fails.push(`(j) option ${o.id} carries no label — the label is the whole of what the owner reads at this gate`);
    } else if (INTERNAL.test(o.label)) {
      fails.push(`(j) option ${o.id}'s label reads an internal key: ${o.label.slice(0, 60)}`);
    }
    // AND THE PAYLOAD CARRIES NO RECORD EITHER (kogaki#859 as amended). The
    // first half of this ruling emptied the rendering and KEPT the evidence
    // object; three assertions stood here requiring that retention. The
    // amendment removed the object, so they are INVERTED — and the inversion is
    // recorded rather than performed silently, because this is the second time
    // in one head that these assertions changed direction, which is exactly the
    // history a later reader cannot reconstruct from the code.
    if ("evidence" in o) fails.push(`(j) option ${o.id} carries an evidence object — the payload copies no reasoning out of the reviewed Candidates (§6, kogaki#859)`);
  }
  // ---- (u) THE DISCLOSURE-CLASS TABLE AND ITS ONE TEST (kogaki#909, owner
  // ruling 2026-09-06). §4.11 and §6 decide the CLASS rather than a third
  // field: Candidate-level disclosure evidence that BEARS ON THE CHOICE is
  // decision-grade and reaches the selection gate, because a pending human
  // verdict's carrier is the render layer; evidence that is a post-hoc report
  // or approval rides the minted Brief's slot, because nothing is owed about a
  // path not taken. `src/disclosure-fields.json` is that decision's carrier.
  //
  // WHAT THIS CASE IS FOR. The defect was a DECLARED piece of evidence with no
  // owner surface, found one field at a time — the bridge disclosure, then the
  // revise residue, with #877's `figure:` queued to be the third. So the
  // assertions bind the property that makes a fourth impossible: the table is
  // well formed in BOTH directions, every declared grade is reached by a real
  // producer, and the gate's rendering is DERIVED from the table rather than
  // enumerating the fields it knows about. ----
  ranCase("u");
  {
    // AC1 — the live table validates. This is the control: every refusal below
    // is only evidence if the unmutated table passes.
    const live = validateDisclosureTable();
    if (live.error) fails.push(`(u) the live disclosure table is malformed: ${live.error}`);

    // AC2 — BOTH DIRECTIONS, because they fail differently. A field naming an
    // unknown grade is evidence that reaches nowhere; a grade no field claims
    // is a surface nothing arrives at, which reads as coverage while
    // delivering nothing. Each malformation is refused BY NAME, so a repairer
    // learns which entry is wrong rather than that something is.
    const bad = [
      ["no grades", { grades: {}, fields: { a: { grade: "decision", why: "w" } } }, /declares no grades/],
      ["no fields", { grades: { decision: "selection-gate" }, fields: {} }, /declares no fields/],
      ["a grade naming no surface", { grades: { decision: "" }, fields: { a: { grade: "decision", why: "w" } } }, /names no surface/],
      ["a field naming an unknown grade", { grades: { decision: "selection-gate" }, fields: { a: { grade: "post-hoc", why: "w" } } }, /which the table does not declare/],
      ["a field with no ground for its grade", { grades: { decision: "selection-gate" }, fields: { a: { grade: "decision", why: "  " } } }, /states no reason for its grade/],
      ["a bare field name", { grades: { decision: "selection-gate" }, fields: { a: null } }, /carries no entry/],
      ["a grade no field claims", { grades: { decision: "selection-gate", "post-hoc": "brief-slot" }, fields: { a: { grade: "decision", why: "w" } } }, /claimed by no field/],
    ];
    for (const [what, table, wanted] of bad) {
      const r = validateDisclosureTable(table);
      if (!r.error) fails.push(`(u) a disclosure table with ${what} was ADMITTED — a malformed table makes every surface obligation vacuous while reading exactly like a Candidate set that owed none`);
      else if (!wanted.test(r.error)) fails.push(`(u) a disclosure table with ${what} was refused, but not by name: ${r.error}`);
    }

    // AC3 — EVERY DECLARED GRADE HAS A LIVE PRODUCER. A grade is the mapping
    // from evidence to the place the owner reads it, so a grade whose surface
    // no code reaches is the original defect wearing a declaration.
    if (disclosureSurface("revise_residue") !== "selection-gate") {
      fails.push("(u) `revise_residue` does not resolve to the selection gate — the owner ruling of 2026-09-06 grades it decision-class because it bears on the choice being made");
    }
    if (disclosureSurface("bridges") !== "brief-slot") {
      fails.push("(u) `bridges` does not resolve to the Brief slot — §4.11's approval is post-hoc and about what was ADOPTED (kogaki#864)");
    }
    if (!SLOT_CAPTIONS.has("What this path bridged")) {
      fails.push("(u) the brief-slot surface names no slot in SLOT_CAPTIONS — the post-hoc grade would deliver to a heading the Brief does not carry");
    }
    if (disclosureSurface("not-a-declared-field") !== null) {
      fails.push("(u) an undeclared field resolved to a surface — the table's answer for a key nobody declared is null, and a guard that invented one would be claiming a reach it does not have");
    }

    // AC4 — DERIVED, NEVER ENUMERATED. This is the property that makes field
    // N+1 free, and it is asserted with a SYNTHETIC table carrying a field the
    // renderer has never heard of: if `decisionGradeRendering` named its
    // fields, this third one would render as nothing and the table and the
    // renderer would be two carriers of one rule.
    const synth = {
      grades: { decision: "selection-gate", "post-hoc": "brief-slot" },
      fields: {
        revise_residue: { grade: "decision", why: "w" },
        bridges: { grade: "post-hoc", why: "w" },
        third_field_the_renderer_never_heard_of: { grade: "decision", why: "w" },
      },
    };
    const synthCand = {
      revise_residue: { statement: "this path spent its one revise round and what the revise did not repair stands" },
      bridges: ["s1", "s2"],
      third_field_the_renderer_never_heard_of: { statement: "a later field, declared and never coded for" },
    };
    const derived = decisionGradeRendering(synthCand, synth);
    if (derived.length !== 2) {
      fails.push(`(u) the gate rendering produced ${derived.length} paragraph(s) for a table declaring TWO decision-grade fields — it is enumerating the fields it knows rather than deriving them, so a field added to the table would reach the owner nowhere`);
    }
    if (!derived.some((t) => /a later field, declared and never coded for/.test(t))) {
      fails.push("(u) a decision-grade field added to the table alone did not render — field N+1 must fail no new assertion and need no new code, or the class repeats one field at a time");
    }
    // THE PARTIAL REGRESSION, NOT ONLY THE TOTAL ONE (PR #931 round 1, finding
    // 3). A renderer that went back to enumerating ONE known field would emit
    // one paragraph here and pass any emptiness test, delivering nothing for
    // the second declared field. So the assertion is the EQUALITY the
    // composition-site guard now enforces — owed against rendered — evaluated
    // on the synthetic table, which is the only place two decision-grade fields
    // can be constructed while the live table declares one.
    const owedSynth = disclosureFieldsPresent(synthCand, "decision", synth);
    if (derived.length !== owedSynth.length) {
      fails.push(`(u) the rendering produced ${derived.length} paragraph(s) for ${owedSynth.length} owed decision-grade field(s) — a PARTIAL enumeration passes an emptiness test while one field reaches the owner nowhere, which is the regression an emptiness test cannot see`);
    }
    // AND THE POST-HOC FIELD DOES NOT LEAK ONTO THE GATE. `bridges` is present
    // on the same Candidate; grading it post-hoc means the gate must NOT carry
    // it, which is the half that keeps this from being a restoration of the
    // list kogaki#859 removed.
    if (derived.some((t) => /s1|s2/.test(t))) {
      fails.push("(u) a post-hoc field rendered at the gate — the grade decides the surface, and a post-hoc field reaching the gate is the 2026-09-04 reduction being undone by the back door");
    }

    // AC5 — END TO END, through the real payload. A Candidate at the revise
    // bound reaches the owner with the Harness's own sentence; a Candidate
    // below the bound renders nothing, so #859's empty case is intact.
    const residue = {
      attaches: 2,
      bound: "one revise round per Candidate",
      statement: "this path spent its one revise round; anything the revise did not repair stands, and it cannot be reviewed again with different reasoning",
    };
    const withResidue = JSON.parse(JSON.stringify(candA));
    withResidue.revise_residue = residue;
    const pay = assembleSelection({ candidates: [withResidue, candB] }, doc0);
    if (pay.error) {
      fails.push(`(u) a Candidate carrying decision-grade disclosure was refused at assembly: ${pay.error}`);
    } else {
      const opt = (pay.payload.options || []).find((o) => o.id === "cand-1");
      const other = (pay.payload.options || []).find((o) => o.id === "cand-2");
      if (!opt || !Array.isArray(opt.rendering) || opt.rendering.length !== 1) {
        fails.push(`(u) the Candidate at the revise bound rendered ${opt ? (opt.rendering || []).length : "no"} paragraph(s) at the gate — evidence that bears on the choice is owed BEFORE the choice, because the owner acts on what they see and not on what the record holds`);
      } else if (!opt.rendering[0].includes("spent its one revise round")) {
        fails.push(`(u) the rendered paragraph is not the Harness's own statement — re-describing it here would be a second derivation of one fact, and the two would agree until one was edited: ${JSON.stringify(opt.rendering[0].slice(0, 80))}`);
      }
      if (!other || !Array.isArray(other.rendering) || other.rendering.length !== 0) {
        fails.push("(u) a Candidate owing no decision-grade disclosure rendered something — kogaki#859's empty case is the rule and this ruling reverses ONE ITEM, never the list");
      }
      // THE RENDERING IS AN OWNER SURFACE, so the shared tripwire binds it.
      // A statement that decayed into an internal key would reach the owner
      // through a path #859 had closed and this ruling reopened by one item.
      const leak = denyInternalVocabulary(pay.payload);
      if (leak.error) fails.push(`(u) the decision-grade rendering leaks internal vocabulary: ${leak.error}`);
    }
    // AND A CANDIDATE CARRYING A RESIDUE WITH NO WORDS still discloses: an
    // absent disclosure and a blank one are different readings, and only the
    // second is a defect.
    const mute = JSON.parse(JSON.stringify(candA));
    mute.revise_residue = { attaches: 2 };
    const mpay = assembleSelection({ candidates: [mute, candB] }, doc0);
    if (mpay.error) {
      fails.push(`(u) a Candidate whose residue carried no statement was refused: ${mpay.error}`);
    } else {
      const mo = (mpay.payload.options || []).find((o) => o.id === "cand-1");
      if (!mo || (mo.rendering || []).length !== 1) {
        fails.push("(u) a residue carrying no readable statement rendered nothing — a blank disclosure and an absent one are different readings, and the gate must not turn the first into the second");
      }
    }
  }

  // ---- (l) THE THREE READER FIELDS (§5.1 v12, kogaki#521, story 1.77):
  // authored at PATH COMPOSITION per Candidate, riding the EXISTING gate,
  // landing at adoption, and REFUSING by name when unauthored. ----
  ranCase("l-reader-fields");
  {
    // AC1 — the axis is real: cand-1 and cand-2 carry DIFFERENT values.
    // RE-POINTED FROM THE GATE TO THE DERIVATION (kogaki#859 as amended): the
    // clause "and the difference survives to the gate" is DROPPED because the
    // gate no longer carries these fields at all, and re-pointed prose that
    // quietly kept an untrue clause would be worse than the loss. What is
    // asserted is what story 1.77 was actually protecting — that composing the
    // three ONCE for the whole set, the declined fill-pass site, is detectable:
    // two Candidates must not read identically. That property is per-Candidate
    // composition and is independent of where the values are displayed.
    const rp = assembleSelection({ candidates: [candA, candB] }, doc0);
    if (rp.error) fails.push(`(l) a Candidate set carrying the reader fields was refused: ${rp.error}`);
    const sids = selectedStrands(doc0), jids = journeyBearingStrands(doc0);
    const evs = [candA, candB].map((c) => candidateEvidence(c, sids, jids));
    for (const [key] of READER_FIELDS) {
      const seen = evs.map((e) => e[key]);
      if (seen.some((v) => typeof v !== "string" || v === "")) {
        fails.push(`(l) a Candidate derives no ${key} — path composition writes it per Candidate`);
      } else if (new Set(seen).size !== seen.length) {
        fails.push(`(l) two Candidates read IDENTICALLY on ${key} — the reader axis is not per-Candidate`);
      }
    }
    // AC2 — they ride the EXISTING gate: same payload id, no second payload.
    if (rp.payload?.id !== "brief-candidate-selection-payload") {
      fails.push("(l) the reader fields did not ride the existing Candidate-selection payload — §5.1.1 owes no new gate");
    }
    // AC3 — each of the three is PRESENT and per-Candidate in the record.
    // RE-POINTED AT THE RECORD (kogaki#859), and the re-point is a NARROWING
    // that is stated rather than hidden: this assertion had two halves, that
    // the field is present and that its rendering CARRIES the record rather
    // than restating it. The second half had the rendering as its subject and
    // dies with it — there is no second copy left to diverge from the first.
    // What survives is the half §5.1 v12 was actually about: the field is
    // authored per Candidate and reaches the payload.
    //
    // ITS PLAIN LABEL IS STILL ASSERTED, one level over, because the table
    // outlives the rendering (see EVIDENCE_LABELS in src/assemble.mjs): a
    // label that decayed into an internal key while unrendered is exactly what
    // the ruling's own one-item-at-a-time reversal would render.
    for (const [key] of READER_FIELDS) {
      // AUTHORED PER CANDIDATE, asserted at the DERIVATION (kogaki#859 as
      // amended). §5.1 v12's property is that the three are the Candidate's
      // own; it was read off the payload, which no longer carries them, so it
      // is read where they are composed. The refusal at adoption — the half
      // §5.1 v12 actually gates on — is unchanged and asserted at AC5 below.
      for (const c of [candA, candB]) {
        const e = candidateEvidence(c, selectedStrands(doc0), journeyBearingStrands(doc0));
        if (typeof e[key] !== "string" || e[key].trim() === "") {
          fails.push(`(l) ${c.candidate_id} derives no ${key} — the three reader fields are authored per Candidate (§5.1 v12)`);
        }
      }
      const entry = EVIDENCE_LABELS.find(([k]) => k === key);
      if (!entry) fails.push(`(l) ${key} has no plain label — the table is what a later ruling restoring one item reads (kogaki#859)`);
      else if (findInternalVocabulary(entry[1])) fails.push(`(l) ${key}'s plain label reads an internal key: ${entry[1]}`);
    }
    // AC4 — adoption lands all three, from the ADOPTED Candidate.
    const adr = adoptCandidate(doc0, { candidates: [candA, candB] }, "cand-2", inst(candB, {}, { candidates: [candA, candB] }));
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
      const empty = adoptCandidate(doc0, { candidates: [candA, { ...candB, [key]: "" }] }, "cand-2", inst(candB, {}, { candidates: [candA, candB] }));
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

  // THE TRIPWIRE FIRES, and names what leaked.
  //
  // RE-POINTED AT THE LABEL (kogaki#859), and this is a repair rather than a
  // relocation of convenience. These two cases injected their leak into
  // `reasoning.thesis_closure` and `reasoning.leg_validity`, which reached the
  // owner only by way of the rendering. With the rendering empty that injection
  // reaches no owner surface at all, so the tripwire correctly would NOT fire
  // and both assertions would have started failing — or, worse, been deleted as
  // obsolete. Neither is right: the property they assert is live, and it is the
  // one the tripwire exists for. What died was the PROXY they bound it through.
  //
  // The owner surface is now the option label, which is the Candidate's
  // reader_experience, so that is where the leak is injected. Everything else
  // is unchanged: the deny still names what leaked, and still refuses rather
  // than rewrites.
  const leakCand = JSON.parse(JSON.stringify(candB));
  leakCand.reader_experience = "Opens where the reader stands, then discharges thesis_closure for them";
  const leaked = assembleSelection({ candidates: [candA, leakCand] }, doc0);
  if (!leaked.error) fails.push("(j) a label carrying an internal key was presented to the owner — the tripwire did not fire");
  else {
    if (!/thesis_closure/.test(leaked.error)) fails.push("(j) the tripwire refused without NAMING what leaked");
    if (leaked.payload) fails.push("(j) the tripwire produced a payload anyway — a deny, never a rewrite layer");
  }
  const secCand = JSON.parse(JSON.stringify(candB));
  secCand.reader_experience = "Opens on the industry default, then traces each leg's claims as §4.4 requires";
  const secLeak = assembleSelection({ candidates: [candA, secCand] }, doc0);
  if (!secLeak.error || !/section reference/.test(secLeak.error)) fails.push("(j) a section reference reached the owner-facing label — the tripwire did not fire");
  // THE DENY READS THE OWNER SURFACE, NOT THE RECORD, and the reduction makes
  // that sharper rather than vacuous: a Candidate whose RECORD is full of
  // internal keys — which every Candidate's is, asserted above — now passes,
  // because none of it is rendered. It is not a lint on any composition MUST
  // (§4.6 clause 3 stands).
  const denyClean = denyInternalVocabulary(plain.payload || {});
  if (denyClean.error) fails.push(`(j) the tripwire refused a clean payload: ${denyClean.error}`);
  // AND THE RECORD IS NOT A LEAK PATH: candB's reasoning carries internal keys
  // by construction, and its payload is clean. This is the assertion that would
  // catch the rendering coming back by a side door — a producer that re-attached
  // the reasoning would fail here even if it skipped the `rendering` key.
  {
    const recCand = JSON.parse(JSON.stringify(candB));
    recCand.reasoning.thesis_closure = "the final leg discharges thesis_closure for the reader";
    const rec = assembleSelection({ candidates: [candA, recCand] }, doc0);
    if (rec.error) fails.push(`(j) an internal key in the RECORD was refused — the deny reads the owner surface, and the record is not one (kogaki#859): ${rec.error}`);
  }

  // (t) THE THESIS-DETERMINATION GATE'S ANSWER IS CAPTURED, NEVER ARGUED
  // (kogaki#891). Driven through the command path, because the property under
  // test is that a CHANNEL is gone: exercising the exported reader would test
  // the validator and never the removal.
  ranCase("t");
  {
    const mk = (name) => {
      const rsx = join(dir, name);
      run(["src/brief.mjs", "enter", ...SETTLED, "--run-state", rsx]);
      return rsx;
    };
    // ITEM 1 — the removed channel refuses LOUDLY rather than being ignored.
    const rsA = mk("t-a.json");
    const viaArg = run(["src/brief.mjs", "adopt", "--run-state", rsA, "--thesis", "thesis-1"]);
    if (viaArg.status === 0) fails.push("(t) `adopt --thesis` still adopts — the owner's answer is still a model-composed argument (kogaki#891)");
    else if (!/kogaki#891/.test(viaArg.stderr || "")) fails.push("(t) the `--thesis` refusal does not name why the channel is gone");
    // ITEM 1 — with no capture at all, adoption refuses and names the act that
    // produces one. The act it names moved at kogaki#1108: it is the harness's
    // own capture hook, not a `gate-thesis` a session runs.
    const noCap = run(["src/brief.mjs", "adopt", "--run-state", rsA]);
    if (noCap.status === 0) fails.push("(t) adoption proceeded with no captured answer at all");
    else if (!/write-gate-capture\.py/.test(noCap.stderr || "")) fails.push("(t) the no-capture refusal does not name the act that records the owner's answer");
    // AND IT NAMES NO DELETED COMMAND. A refusal routing the reader to
    // `gate-thesis` sends them to an unknown subcommand, which is worse than
    // saying nothing: the reader concludes the runtime is broken rather than
    // that the route changed.
    if (/gate-thesis/.test(noCap.stderr || "")) fails.push("(t) the no-capture refusal still routes to `gate-thesis`, which is DELETED (kogaki#1108)");
    // THE DELETED COMMAND IS GONE RATHER THAN DEPRECATED.
    const gtGone = run(["src/brief.mjs", "gate-thesis", "--declare", "--run-state", rsA]);
    if (gtGone.status === 0) fails.push("(t) `gate-thesis` still runs — the session-driven thesis gate has a live executor (kogaki#1108)");
    else if (!/usage/.test(gtGone.stderr || "")) fails.push("(t) `gate-thesis` refuses with something other than the unknown-subcommand usage line — a stub rather than a deletion");
    // ITEM 2 — no declaration for this run state, no adoption. The gate is
    // stripped from a freshly entered run state, which is the only way to
    // reach a state that was never rendered.
    const rsB = mk("t-b.json");
    const stB = JSON.parse(readFileSync(rsB, "utf8")); delete stB.gate;
    writeFileSync(rsB, JSON.stringify(stB));
    const noDecl = run(["src/brief.mjs", "adopt", "--run-state", rsB, "--capture", join(dir, "nothing.json")]);
    if (noDecl.status === 0) fails.push("(t) adoption proceeded over a run state carrying no gate declaration (acceptance item 2)");
    else if (!/no thesis-determination gate declaration/.test(noDecl.stderr || "")) fails.push("(t) the no-declaration refusal does not say the gate was never rendered");
    // ITEM 3 — free-form Thesis text reaches the run state through the
    // captured answer and through nothing else.
    const rsD = mk("t-d.json");
    const OWN = "the owner's own sentence, typed at the gate";
    const capD = writeCapture(join(dir, "t-d-capture.json"), "brief-thesis-adoption",
      thesisOptionIds(rsD), { free_text: OWN }, "toolu_free");
    const adFree = run(["src/brief.mjs", "adopt", "--run-state", rsD, "--capture", capD]);
    if (adFree.status !== 0) fails.push(`(t) adopting a free-form Thesis from the capture was refused: ${(adFree.stderr || "").trim()}`);
    else {
      const stD = JSON.parse(readFileSync(rsD, "utf8"));
      if (stD.adopted_thesis !== OWN) fails.push("(t) the free-form Thesis did not reach the run state verbatim from the captured answer");
      if (stD.adopted_via !== "free-form") fails.push("(t) a free-text answer was recorded as an adopted candidate");
      if (stD.adopted_by?.tool_use_id !== "toolu_free") fails.push("(t) the run state does not carry the tool_use_id of the question the harness asked");
    }
    // THE CAPTURE BINDS TO THE OPTION SET IT ANSWERED. A capture taken at one
    // rendering must not certify a choice at another.
    const rsE = mk("t-e.json");
    const capEGood = writeCapture(join(dir, "t-e-capture-good.json"), "brief-thesis-adoption",
      thesisOptionIds(rsE), { option: "thesis-1" }, "toolu_e");
    const capE = JSON.parse(readFileSync(capEGood, "utf8"));
    capE.rows[capE.rows.length - 1].answers_over.option_set_digest = "0".repeat(64);
    const capEPath = join(dir, "t-e-capture.json");
    writeFileSync(capEPath, JSON.stringify(capE));
    const stale = run(["src/brief.mjs", "adopt", "--run-state", rsE, "--capture", capEPath]);
    if (stale.status === 0) fails.push("(t) a capture bound to a different option set adopted anyway — the owner chose among alternatives other than these");
    // AND THE EVIDENCE AXES ARE REFUSED. A row recording a session's own act
    // is not an owner answer.
    const capF = JSON.parse(readFileSync(capEGood, "utf8"));
    capF.rows[capF.rows.length - 1].evidence = { tool: "Bash", tool_use_id: "t" };
    const capFPath = join(dir, "t-f-capture.json");
    writeFileSync(capFPath, JSON.stringify(capF));
    const wrongTool = run(["src/brief.mjs", "adopt", "--run-state", rsE, "--capture", capFPath]);
    if (wrongTool.status === 0) fails.push("(t) a capture whose evidence names a tool other than AskUserQuestion was accepted as an owner act");
  }

} finally {
  rmSync(dir, { recursive: true, force: true });
  // THE LANE ENTRIES THIS CHECK CREATES ARE REMOVED (kogaki#750). The Briefs
  // minted above are real, so `snapshotBrief` writes real workspaces under
  // `runs/brief/`, keyed on each Brief's own directory name — and NOTHING
  // prunes them, because pruning is a lane's first act and this check never
  // takes it (it drives `--run-state`). Left alone, every suite run would add
  // an entry forever, which is the unbounded accumulation the whole change
  // exists to end, re-created by the check that asserts it ended.
  //
  // THE SWEEP IS BY SHAPE, NOT BY THIS RUN'S TWO NAMES (PR #783 round 1). The
  // first form removed exactly `compose-case` and this run's temp basename and
  // then failed if any entry of either shape survived — so the only way it
  // could fire was an entry left by an EARLIER crashed or interrupted run, and
  // it would then go red on every run afterwards until somebody deleted the
  // directory by hand. A check that reports another run's litter as this run's
  // failure is a fallback worded as a finding. Sweeping the shape clears the
  // stale one; the assertion below is the post-condition that the sweep worked.
  const laneEntries = () => (existsSync(laneDir("brief"))
    ? readdirSync(laneDir("brief")).filter((e) => e === "compose-case" || e.startsWith("brief-compose-"))
    : []);
  for (const slug of laneEntries()) {
    rmSync(join(laneDir("brief"), slug), { recursive: true, force: true });
  }
  const leftovers = laneEntries();
  if (leftovers.length) {
    fails.push(`the brief lane still holds ${leftovers.length} entr(y|ies) of this member's shape after its own sweep: ${leftovers.join(", ")} — a check that accumulates run state is the defect kogaki#750 removed`);
  }
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
ranCase("k-composed-body");
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
// EVERY fixture here is admitted by validateLegs FIRST. Round 1 of PR #546
// found why: the declared-assumption case was built with `type: "assumption"`,
// which §4.4's closed list refuses, so the assertion passed over a Leg shape
// the runtime cannot admit and the branch it claimed to cover was dead
// (kogaki#209 — a fixture whose only demonstrated failure mode is the code's
// total absence).
ranCase("l-bridge");
{
  const S = (id, extra = {}) => ({
    leg_id: id, move: "m", materials: ["L1"], purpose: "p", reader_state_before: "knowledge: b",
    reader_state_after: "knowledge: a", depends_on: [], rationale: "r",
    claims: [{ type: "strand", strand: "L1", proposition: "the strand says so" }],
    ...extra,
  });
  // §4.15 rule 3 (kogaki#822): every path's first Leg opens a Section. Applied
  // HERE rather than at each fixture's first element, so a case added later
  // inherits it — this block's cases differ in their bridges, never in their
  // grouping, and a per-case copy is what drifts.
  const admit = (legs, what) => {
    if (legs[0].opens_section === undefined) legs[0] = { ...legs[0], opens_section: "Opening" };
    const v = validateLegs(legs);
    if (v.error) fails.push(`(l) the ${what} fixture is not an admissible path — it would assert over a shape the runtime refuses: ${v.error}`);
    return legs;
  };
  const cases = [
    ["none", [S("s1")], /no gaps were bridged/],
    ["entailment reasoning",
      [S("s1"), S("b1", { bridges: ["s1", "s2"], entailed: true, entailment_reasoning: "the case generalises" }), S("s2")],
      /between s1 → s2: the case generalises/],
    // THE SECOND SOURCE IS GONE (kogaki#1095), and the case that exercised it
    // is REMOVED rather than reworded. It drove a bridge whose only reasoning
    // was a `reader_assumption` claim; a claim is now one claim derived from
    // a Strand, so no such Leg composes at all — the arm is unreachable, not
    // renamed, and the refusal that makes it unreachable is asserted in (a).
    // The premise itself did not vanish from the gate: it belongs to the
    // Brief's Reader start, which this same payload renders from READER_FIELDS.
    // A bridge carrying no entailment reasoning is abnormal and must SAY so
    // rather than render an empty reason — a bridge without one is a
    // composition fault the gate is owed, and it is now the ONLY other arm.
    ["no reasoning", [S("a"), S("c"), S("b", { bridges: ["a", "c"] })], /NO REASONING CARRIED/],
  ];
  for (const [what, legs, want] of cases) {
    admit(legs, what);
    const ev = candidateEvidence({ legs, obligations: [] }, [], []);
    if (typeof ev.bridges !== "string" || !want.test(ev.bridges)) {
      fails.push(`(l) the ${what} case does not render its bridge disclosure: ${JSON.stringify(ev.bridges)}`);
    }
  }
  // PER CANDIDATE, not per Brief: two Candidates bridging differently must not
  // read identically, the same property journey_coverage already has.
  const a = candidateEvidence({ legs: cases[1][1], obligations: [] }, [], []).bridges;
  const b = candidateEvidence({ legs: cases[0][1], obligations: [] }, [], []).bridges;
  if (a === b) fails.push("(l) a bridged Candidate and an unbridged one read identically — the disclosure is not per-Candidate");
  // It rides the EXISTING gate: a plain label, no new gate row. The SHARED
  // predicate (kogaki#526), not a re-derived regex: one definition, every
  // owner surface. SCOPED SINCE kogaki#859: the label no longer reaches the
  // owner, because nothing in this table does — what is asserted is that the
  // table stays fit to be rendered, since the ruling's own reversal restores
  // one item at a time from exactly here. A label left to decay while
  // unrendered is what makes that reversal expensive.
  const lbl = EVIDENCE_LABELS.find(([k]) => k === "bridges");
  if (!lbl) fails.push("(l) `bridges` has no plain label — a restoring ruling would have only its internal key to render (kogaki#520, kogaki#859)");
  else if (findInternalVocabulary(lbl[1])) fails.push(`(l) the bridge label reads an internal key: ${lbl[1]}`);

  // (l2) THE FIELD IS ADMITTED AND BOUNDED (#546 round 1, finding 3). §4.11
  // recognises a Bridge Leg by this field, so §4.1 admits it and validateLegs
  // bounds it — an unvalidated marking renders `between :` at an owner surface.
  ranCase("l2");
  for (const [bad, what] of [[[], "empty"], [["only-one"], "single"], [true, "non-array"], [["a", "c", "d"], "three-id"]]) {
    if (!validateLegs([S("a"), S("c"), S("b", { bridges: bad })]).error) {
      fails.push(`(l2) a ${what} bridges value is admitted — the gate would disclose a pair that was never named`);
    }
  }
  // (l3) IT SURVIVES SERIALIZATION (#546 round 1, finding 4). Post-hoc
  // disclosure is the WHOLE approval shape, so a Brief re-read from its
  // recorded form must still say what was bridged.
  ranCase("l3");
  if (!/^bridges: a, c$/m.test(renderLeg(S("b", { bridges: ["a", "c"] })))) {
    fails.push("(l3) renderLeg drops `bridges` — a Brief re-read from its recorded form discloses no bridge at all");
  }
}

// (aj) THE UNDISCHARGED COUNT IS SCORED ONLY OVER ENTRIES THAT CAN BE READ,
// and the ledger's declared key set is refused by field name (kogaki#1129).
//
// TWO HALVES, AND THE SECOND IS WHY THE FIRST IS NOT VACUOUS. `candidateEvidence`
// counted `o.discharged_by === undefined`, and an entry written under other key
// names answers that test exactly as a genuinely undischarged entry does — so a
// Candidate whose every obligation named the Leg that settles it rendered "4
// entries, 4 UNDISCHARGED — disclosed here, never a refusal" at the gate the
// owner answered. The disclosure was wrong and nothing marked it: a guard that
// scores a record it cannot read reports a confident number.
//
// THE OWING IS STILL NEVER A REFUSAL. What refuses is UNREADABILITY; the
// undischarged count itself stays a disclosure, which is why the contrast arm
// below asserts a non-zero count renders rather than refusing.
//
// THE COVERAGE AND `unused` ARMS ARE ASSERTED AGAINST `candidateLedgerRefusal`
// DIRECTLY, and that is honest only because (ai) above binds the STATE to that
// function through the span: a direct call alone would survive a mutation that
// deletes the call site, which is the shape this file records at (x).
ranCase("aj-ledger-shape");
{
  const OS = [{ leg_id: "s1", materials: [], claims: [] }, { leg_id: "s2", materials: [], claims: [] }];
  const cand = (obligations, extra = {}) => ({ candidate_id: "cand-o", legs: OS, obligations, ...extra });

  // ARM 1 — every entry discharged renders `0 UNDISCHARGED` at the gate.
  const allSettled = candidateEvidence(cand([
    { text: "the generality is asserted", introduced_by: "s1", discharged_by: "s2" },
    { text: "the counter-case is owed", introduced_by: "s1", discharged_by: "s2" },
  ]), [], []);
  if (allSettled.error) {
    fails.push(`(aj) a conformant ledger with every entry discharged was refused: ${allSettled.error}`);
  } else if (!/2 entries, 0 UNDISCHARGED/.test(allSettled.obligations_ledger || "")) {
    fails.push(`(aj) a ledger whose every entry names the Leg that settles it does not render 0 UNDISCHARGED at the gate: ${JSON.stringify(allSettled.obligations_ledger)}`);
  }

  // ARM 2 — THE CONTRAST. An undischarged entry still DISCLOSES and never
  // refuses; without this arm, a scorer that refused every ledger would pass
  // arm 1 by never reaching a count at all.
  const oneOwing = candidateEvidence(cand([
    { text: "the generality is asserted", introduced_by: "s1", discharged_by: "s2" },
    { text: "the counter-case is owed", introduced_by: "s1" },
  ]), [], []);
  if (oneOwing.error) {
    fails.push(`(aj) an UNDISCHARGED obligation was refused: ${oneOwing.error} — an undischarged obligation is a disclosure and never a refusal; only the key names became a declared format`);
  } else if (!/2 entries, 1 UNDISCHARGED/.test(oneOwing.obligations_ledger || "")) {
    fails.push(`(aj) an undischarged entry is not counted at the gate: ${JSON.stringify(oneOwing.obligations_ledger)}`);
  }

  // ARM 2b — THE SPLIT (kogaki#1151; PR #1152 round 1, finding 4). The
  // UNDISCHARGED count is zero for every Candidate that came through
  // composition, so the line owes the owner how the rows END. Asserted on a
  // ledger carrying one of each, so a renderer that printed the same number
  // twice fails here.
  const bothEnds = candidateEvidence(cand([
    { text: "the generality is asserted", introduced_by: "s1", discharged_by: "s2" },
    { text: "the counter-case is left open", introduced_by: "s1", conceded_by: "s2" },
  ]), [], []);
  if (bothEnds.error) {
    fails.push(`(aj) a ledger carrying one discharged and one conceded row was refused: ${bothEnds.error}`);
  } else if (!/2 entries, 0 UNDISCHARGED \(1 discharged, 1 conceded\)/.test(bothEnds.obligations_ledger || "")) {
    fails.push(`(aj) the gate line does not render how the rows END, discharged apart from conceded: ${JSON.stringify(bothEnds.obligations_ledger)}`);
  }

  // ARM 3 — the observed run's own record: the entry cannot be read, so it is
  // REFUSED naming the entry rather than scored.
  const unreadable = candidateEvidence(cand([
    { raised_at: "s1", owed: "the generality is asserted", settled_at: "s2" },
  ]), [], []);
  if (!unreadable.error) {
    fails.push(`(aj) an obligation entry carrying raised_at/owed/settled_at was SCORED rather than refused: ${JSON.stringify(unreadable.obligations_ledger)} — every entry named the Leg that settles it and the gate told the owner all of them were undischarged`);
  } else {
    if (!/obligation 1\b/.test(unreadable.error)) {
      fails.push(`(aj) the unreadable-entry refusal does not name the ENTRY: ${unreadable.error}`);
    }
    if (!/introduced_by|\btext\b/.test(unreadable.error)) {
      fails.push(`(aj) the unreadable-entry refusal does not name the field the entry owes: ${unreadable.error}`);
    }
  }

  // ARM 4 — the two remaining declared fields, by name. `coverage` keyed by
  // selected Strand id with `role_in_thesis` per value; `unused` an OBJECT and
  // never an array, because an array carries no key to look a disclosure up
  // under and every unplaced Strand then renders the Harness's default sentence.
  const okLedger = [{ text: "the generality is asserted", introduced_by: "s1", discharged_by: "s2" }];
  const conformant = candidateLedgerRefusal(cand(okLedger, {
    coverage: { L1: { role_in_thesis: "carries the opening claim" } },
    unused: { "L2.journey": "the journey material sits outside this path's arc" },
  }), ["L1", "L2"]);
  if (conformant !== null) {
    fails.push(`(aj) a conformant Candidate was refused by the ledger validator: ${conformant} — the validator would refuse every composition, and the refusals below would prove nothing`);
  }
  const roleKey = candidateLedgerRefusal(cand(okLedger, { coverage: { L1: { role: "carries the opening claim" } } }), ["L1", "L2"]);
  if (!/role_in_thesis/.test(roleKey || "")) {
    fails.push(`(aj) a coverage value carrying \`role\` rather than \`role_in_thesis\` was admitted — the Brief's Strand coverage section then renders "(not stated by the composer)" of a role the composer stated: ${roleKey}`);
  }
  const unusedArray = candidateLedgerRefusal(cand(okLedger, { unused: [] }), ["L1", "L2"]);
  if (!/\bunused\b/.test(unusedArray || "")) {
    fails.push(`(aj) an \`unused\` written as an array was admitted — the disclosures read as if nothing was left unplaced: ${unusedArray}`);
  }
  const danglingLeg = candidateLedgerRefusal(cand([{ text: "owed", introduced_by: "s1", discharged_by: "s9" }]), ["L1", "L2"]);
  if (!/s9/.test(danglingLeg || "")) {
    fails.push(`(aj) a \`discharged_by\` naming no Leg of the Candidate was admitted — the ledger renders a settlement by a Leg the path does not carry: ${danglingLeg}`);
  }

  // ARM 5 — THE DECLARATION AND THE VALIDATOR ARE ONE TEXT, which is the
  // property `src/candidate-schema.json` exists for: the judge is shown that
  // file and the refusal enforces its field set, so a field the validator binds
  // and the schema never declares would be enforced against a composer that was
  // never told (kogaki#1126's own ground, one field set over).
  const schema1129 = JSON.parse(readFileSync(CANDIDATE_SCHEMA_PATH, "utf8"));
  for (const f of ["obligations", "coverage", "unused"]) {
    if (!schema1129.fields || !schema1129.fields[f]) {
      fails.push(`(aj) src/candidate-schema.json declares no \`${f}\` — the validator refuses a shape the composing Model is never shown, which is the prose-only sentence wearing a declaration`);
    }
  }
  const shapeSentence = ((JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).states || [])
    .find((x) => x.id === "compose_path") || {}).input_shape || "";
  for (const f of ["obligations", "coverage", "unused"]) {
    if (shapeSentence.includes("`" + f + "`")) {
      fails.push(`(aj) \`compose_path\`'s input_shape still names \`${f}\` — the sentence DESCRIBES and the schema BINDS, so a key carried by both is the two-carriers shape the schema file exists to remove: they agree until one is edited, and the edit that matters is the one that adds a field`);
    }
  }
}

// (q) §4.15 THE SECTION — `opens_section` AND THE GROUPING RULES (kogaki#822).
// The four rules are validated at COMPOSITION and not at `brief.mjs mint`,
// because mint writes a Brief shell and no Leg exists there for a rule to
// read — §4.15 records that correction and this block is its exercised half.
// Rules 2, 3 and rule 4's Leg-count clause are mechanical; rule 1 is the
// POSITIVE case whose negation rule 2 refuses, and rule 4's prose-length
// clause is §4.15's named deferred slot, so neither is asserted here.
ranCase("q");
{
  const Q = (id, extra = {}) => ({
    leg_id: id, move: "m1", materials: ["L1"], purpose: "p",
    reader_state_before: "knowledge: a", reader_state_after: "knowledge: b", depends_on: [],
    rationale: "r", claims: [{ type: "strand", strand: "L1", proposition: "q" }],
    ...extra,
  });
  const err = (legs) => validateLegs(legs).error || "";

  // The field is OPTIONAL — asserted FIRST, because every case composed before
  // this issue carries none and a required field would fail all of them.
  const noneAnywhere = err([Q("s1"), Q("s2")]);
  if (!/rule 3/.test(noneAnywhere)) {
    fails.push(`(q) a path opening NO Section is admitted or refused by the wrong rule — §4.15 rule 3 says the first Leg always opens: ${noneAnywhere}`);
  }
  // ACCEPTANCE 4 both ways: the refusal names the RULE and the LEG.
  if (!/the Section grouping rule 3/.test(noneAnywhere) || !/\(s1\)/.test(noneAnywhere)) {
    fails.push(`(q) rule 3's refusal does not name both the rule and the Leg — a refusal naming neither sends a composer to re-read the whole path: ${noneAnywhere}`);
  }

  // Rule 2 — a Leg DEVELOPING its predecessor continues, so it may not open.
  const everyLegOpens = err([Q("s1", { opens_section: "A" }), Q("s2", { opens_section: "B", depends_on: ["s1"] })]);
  if (!/the Section grouping rule 2/.test(everyLegOpens) || !/\(s2\)/.test(everyLegOpens)) {
    fails.push(`(q) a Leg that develops its predecessor may still open a Section — the Section grouping rule 2's refusal is what stops a heading on every Leg: ${everyLegOpens}`);
  }

  // Rule 4's Leg-count clause — two consecutive one-Leg Sections MERGE.
  const threeSingles = err([Q("s1", { opens_section: "A" }), Q("s2", { opens_section: "B", materials: ["L2"] }), Q("s3", { opens_section: "C", materials: ["L3"] })]);
  if (!/the Section grouping rule 4/.test(threeSingles)) {
    fails.push(`(q) three independent Legs each opening their own Section are admitted — rule 4's Leg-count clause refuses two consecutive one-Leg Sections: ${threeSingles}`);
  }

  // A CORRECTLY GROUPED path mints clean — the control. Without it every
  // assertion above is satisfied by a validator that refuses everything.
  const grouped = err([Q("s1", { opens_section: "A" }), Q("s2", { depends_on: ["s1"] }), Q("s3", { opens_section: "B", materials: ["L2"], depends_on: ["s2"] })]);
  if (grouped) {
    fails.push(`(q) a correctly grouped path is REFUSED — s1 opens, s2 continues it, s3 opens a second Section: ${grouped}`);
  }

  // Shape: presence marks the opening, value carries the title, so a blank
  // value has no meaning rather than meaning "opens untitled".
  for (const [bad, what] of [["", "empty"], ["   ", "whitespace-only"], [true, "non-string"]]) {
    if (!err([Q("s1", { opens_section: bad })])) {
      fails.push(`(q) a ${what} opens_section is admitted — it would render as a blank heading above a Section`);
    }
  }

  // IT SURVIVES SERIALIZATION. A Brief re-read from its recorded form must
  // still declare its Sections, or the renderer (kogaki#823) has nothing to read.
  if (!/^opens_section: A Section Title$/m.test(renderLeg(Q("s1", { opens_section: "A Section Title" })))) {
    fails.push("(q) renderLeg drops `opens_section` — a Brief re-read from its recorded form declares no Section at all");
  }
}

// (ak) EVERY WHOLE-PATH REFUSAL NAMES A RULE THE SCHEMA CARRIES (kogaki#1147).
//
// THE DEFECT. `src/leg-schema.json` is rendered into `compose_path`'s prompt
// verbatim and the validator reads its field set back, so a FIELD rule cannot
// be enforced against a composer that was never shown it. The rules over the
// WHOLE PATH had no such carrier: `validateLegs` and `sectionGroupingRefusal`
// raised the Section grouping, the `depends_on` ordering, the uniqueness of an
// id and the claim cardinality out of wording written in the validator alone.
// Two /brief runs on 2026-09-18 died at `compose_path` on rule 4 having
// satisfied every rule they were shown — the rule was satisfiable by chance on
// a first attempt and learnable only from a refusal that had already spent one
// of three attempts.
//
// THE PREDICATE IS DERIVED FROM THE VALIDATOR'S OWN SOURCE, never from a list
// here. The refusal keys are read out of `sectionGroupingRefusal`'s body and
// out of `validateLegs`'s, so a fourth path rule added to either function is
// covered the day it is written: it must declare an entry in `path_rules`, and
// it must be exercised by a fixture below. A literal key list would be a second
// transcription, green whenever it said what it said.
//
// AND THE REFUSAL MUST EMBED THE SCHEMA'S OWN TEXT, which is the half that
// makes "the prompt and the refusal read one text" a property rather than a
// promise: each fixture's refusal is searched for the `rule` string verbatim,
// and for the `name` the entry declares. A refusal that reworded the rule would
// be the two-carrier drift this file exists to remove, arriving as a paraphrase
// nobody could see.
ranCase("ak-path-rules-carried");
{
  const schemaText = readFileSync(join(REPO_ROOT, "src", "leg-schema.json"), "utf8");
  const schema1147 = JSON.parse(schemaText);
  const rules = schema1147.path_rules;
  const composeSrc = readFileSync(join(REPO_ROOT, "src", "compose.mjs"), "utf8");

  const P = (id, extra = {}) => ({
    leg_id: id, move: "m1", materials: ["L1"], purpose: "p",
    reader_state_before: "knowledge: a", reader_state_after: "knowledge: b", depends_on: [],
    rationale: "r", claims: [{ type: "strand", strand: "L1", proposition: "q" }],
    ...extra,
  });
  // One fixture per CHECKED rule: the path that raises it, and nothing else
  // about it. `validateLegs` returns the FIRST refusal, so each fixture is
  // well formed in every respect but the one it is about.
  const FIXTURES = {
    path_is_non_empty: [],
    leg_id_unique: [P("s1", { opens_section: "A" }), P("s1", { materials: ["L2"], depends_on: [] })],
    depends_on_ordering: [P("s1", { opens_section: "A" }), P("s2", { depends_on: ["s3"], materials: ["L2"] })],
    one_claim_per_strand: [P("s1", { opens_section: "A", claims: [
      { type: "strand", strand: "L1", proposition: "the first" },
      { type: "strand", strand: "L1", proposition: "the second" }] })],
    section_rule_2: [P("s1", { opens_section: "A" }), P("s2", { opens_section: "B", depends_on: ["s1"] })],
    section_rule_3: [P("s1"), P("s2", { depends_on: ["s1"] })],
    section_rule_4: [P("s1", { opens_section: "A" }), P("s2", { opens_section: "B", materials: ["L2"] }),
      P("s3", { opens_section: "C", materials: ["L3"] })],
    // A SECOND ARGUMENT, not a legs array (kogaki#1151): this rule only
    // fires against a `readerStart`, which `validateLegs(fixture)` alone
    // never supplies — so this one entry is read specially below.
    reader_start_binds_first_leg: { legs: [P("s1", { opens_section: "A" })], readerStart: "knowledge: a value this Leg's reader_state_before never states" },
  };

  if (!rules || typeof rules !== "object") {
    fails.push("(ak) src/leg-schema.json declares no `path_rules` — the rules over the whole path are enforced in src/compose.mjs and stated nowhere the composing Model reads, which is exactly the field-level defect kogaki#1108 closed, one scope out");
  } else {
    // RULE 1 IS STATED AS THE JUDGMENT IT IS. It is the positive case rule 2's
    // refusal covers; nothing checks it, and a composer shown three of four
    // rules is left to infer that the fourth does not exist.
    const r1 = rules.section_rule_1;
    if (!r1 || r1.class !== "judgment" || typeof r1.rule !== "string" || r1.rule === "") {
      fails.push("(ak) the Section grouping's rule 1 is absent from `path_rules` or is not marked `judgment` — it is the rule that says WHEN a Leg opens, and a composer shown only the three that refuse is being told what not to do and never what to do");
    }

    // THE KEYS ARE THE VALIDATOR'S OWN. Read from the two functions' bodies, so
    // a rule added to either is covered here the day it is raised.
    const bodyOf = (name) => {
      const at = composeSrc.indexOf(`export function ${name}(`);
      if (at < 0) return null;
      const end = composeSrc.indexOf("\nexport function ", at + 1);
      return composeSrc.slice(at, end < 0 ? composeSrc.length : end);
    };
    const raisedIn = (name) => {
      const body = bodyOf(name);
      if (body === null) return null;
      return [...body.matchAll(/pathRefusal\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
    };
    const grouping = raisedIn("sectionGroupingRefusal");
    const wholePath = raisedIn("validateLegs");
    if (grouping === null || wholePath === null) {
      fails.push("(ak) `sectionGroupingRefusal` or `validateLegs` is not an exported function of src/compose.mjs under that name — the derivation reads their bodies, and a renamed function silently empties it");
    } else {
      // THE DERIVATION REFUSES ITS OWN EMPTY RESULT. A list that silently
      // empties reports every rule as carried, which is the shape case (y)
      // records one carrier over.
      if (grouping.length === 0) {
        fails.push("(ak) no `pathRefusal(...)` call was found in `sectionGroupingRefusal` — either the Section rules are composed from wording written in the validator again, or the derivation has stopped matching and is reporting silence as coverage");
      }
      // NO REFUSAL IS COMPOSED IN THE VALIDATOR. Every path-level refusal the
      // grouping function raises goes through `pathRefusal`, so its text is the
      // schema's; a bare template literal here would be text the prompt does
      // not carry, which is the defect in its original form.
      const groupingBody = bodyOf("sectionGroupingRefusal") || "";
      if (/return\s+`/.test(groupingBody)) {
        fails.push("(ak) `sectionGroupingRefusal` returns a refusal composed in place — a rule worded in the validator is a rule the prompt does not carry, and the composer meets it only after it has cost an attempt");
      }
      for (const key of [...new Set([...grouping, ...wholePath])]) {
        const entry = rules[key];
        if (!entry || typeof entry.name !== "string" || typeof entry.rule !== "string") {
          fails.push(`(ak) src/compose.mjs raises \`${key}\` and src/leg-schema.json declares no such \`path_rules\` entry with a name and a rule — the refusal enforces a rule the composing Model is never shown`);
          continue;
        }
        if (!schemaText.includes(entry.rule) || !schemaText.includes(entry.name)) {
          fails.push(`(ak) the schema FILE does not contain \`${key}\`'s own name or rule text — the entry is assembled at read time rather than written in the file the executor renders verbatim`);
        }
        const fixture = FIXTURES[key];
        if (fixture === undefined) {
          fails.push(`(ak) \`${key}\` is raised by src/compose.mjs and no fixture here exercises it — the rule's text is asserted against nothing, so a refusal that stopped naming it would go unobserved`);
          continue;
        }
        const got = key === "reader_start_binds_first_leg"
          ? validateLegs(fixture.legs, fixture.readerStart).error || ""
          : validateLegs(fixture).error || "";
        if (!got) {
          fails.push(`(ak) the fixture for \`${key}\` is ACCEPTED — the case would assert the rule's text against a refusal that never fires`);
          continue;
        }
        if (!got.includes(entry.name)) {
          fails.push(`(ak) the refusal for \`${key}\` does not name the rule the schema declares (${entry.name}) — a refused composer cannot find in the prompt the rule it was just told it broke: ${got}`);
        }
        if (!got.includes(entry.rule)) {
          fails.push(`(ak) the refusal for \`${key}\` does not carry the schema's own rule text — the prompt and the refusal are two wordings of one rule, which agree until one is edited: ${got}`);
        }
      }
      // EVERY CHECKED ENTRY IS RAISED, the other direction. A rule declared in
      // the schema that nothing enforces tells a composer it is bound by
      // something no refusal will ever mention.
      const raised = new Set([...grouping, ...wholePath]);
      for (const [key, entry] of Object.entries(rules)) {
        if (key === "note" || !entry || entry.class !== "checked") continue;
        if (!raised.has(key)) {
          fails.push(`(ak) \`path_rules.${key}\` is declared \`checked\` and no refusal in src/compose.mjs raises it — a rule the prompt states and nothing enforces is the inverse drift, and a composer has no way to tell the two apart`);
        }
      }
    }
  }
}

// (r) THE PLAIN-LABEL TABLES STAY FIT TO USE (kogaki#859, PR #863 round 2,
// carried finding 2). SPEC-draft-pipeline §6 says the derivation and the
// plain-label tables "are retained for exactly this" — the one-item-at-a-time
// reversal — "and `checks/check-brief-compose.sh` asserts both stay fit to
// use". THAT ASSERTION DID NOT EXIST. `REVIEW_LABELS` was asserted NOWHERE,
// leaving an unused import as the only trace of the (j) loop that consumed it,
// and `EVIDENCE_LABELS` was asserted for four of its ten keys — the three
// READER_FIELDS at (l) and `bridges` at (l). A contract carried in prose whose
// only test is that the prose still says it is green about the document and
// silent about the tables.
//
// THE BINDING IS DERIVED, NEVER RESTATED. A literal key list here would be a
// second declaration that drifts the first time either table moves — the
// defect this suite family has now met five times. So the expected key set is
// COMPUTED from the live producers: EVIDENCE_LABELS covers exactly
// REASONING_FIELDS (composed into `reviewed.json`) plus whatever
// `candidateEvidence` actually returns, and REVIEW_LABELS covers exactly
// REVIEW_AREAS. Both directions are asserted, because they fail differently:
// a key with no label is an item a restoring ruling could not render, and a
// label with no key is the decayed table the retention argument rests on.
ranCase("r-plain-labels");
{
  // The KEY SET is what is under test and it does not vary with the path's
  // content, so an empty path is the honest input: it derives every key the
  // function can produce without a fixture whose shape could supply the answer.
  const ev = candidateEvidence({ legs: [], obligations: [] }, [], []);
  const expected = new Set([...REASONING_FIELDS, ...Object.keys(ev)]);
  const labelled = new Map(EVIDENCE_LABELS);

  if (labelled.size !== EVIDENCE_LABELS.length) {
    fails.push("(r) EVIDENCE_LABELS carries a duplicate key — the later entry silently wins and one item's label is unreachable");
  }
  for (const key of expected) {
    if (!labelled.has(key)) {
      fails.push(`(r) \`${key}\` reaches the gate's evidence and has NO plain label — a ruling restoring that one item would have only its internal key to render (SPEC §6)`);
    }
  }
  for (const [key] of EVIDENCE_LABELS) {
    if (!expected.has(key)) {
      fails.push(`(r) EVIDENCE_LABELS labels \`${key}\`, which neither REASONING_FIELDS nor candidateEvidence produces — the table has decayed away from what it would render`);
    }
  }
  // REVIEW_LABELS against its own producer. This is the half that was carried
  // by nothing at all: the table's only reader was the deleted (j) loop.
  const areas = new Set(REVIEW_AREAS);
  for (const a of areas) {
    if (typeof REVIEW_LABELS[a] !== "string") {
      fails.push(`(r) review area \`${a}\` has no plain label in REVIEW_LABELS — the table cannot render the area it is retained for`);
    }
  }
  for (const k of Object.keys(REVIEW_LABELS)) {
    if (!areas.has(k)) {
      fails.push(`(r) REVIEW_LABELS labels \`${k}\`, which is not a REVIEW_AREAS member — the table has drifted from the areas it renders`);
    }
  }
  // FIT TO USE IS NOT ONLY PRESENCE. A label that decayed into an internal key
  // or a section reference while unrendered is exactly what the reversal would
  // put in front of the owner, and the leak predicate is the SHARED one
  // (kogaki#526) rather than a re-derived regex.
  for (const [key, label] of EVIDENCE_LABELS) {
    if (typeof label !== "string" || label.trim() === "") {
      fails.push(`(r) \`${key}\` has a blank plain label — a restored item would render as nothing`);
    } else {
      const leak = findInternalVocabulary(label);
      if (leak) fails.push(`(r) \`${key}\`'s plain label reads ${leak.kind}: ${leak.token}`);
    }
  }
  for (const [key, label] of Object.entries(REVIEW_LABELS)) {
    if (typeof label !== "string" || label.trim() === "") {
      fails.push(`(r) review area \`${key}\` has a blank plain label — a restored area would render as nothing`);
    } else {
      const leak = findInternalVocabulary(label);
      if (leak) fails.push(`(r) review area \`${key}\`'s plain label reads ${leak.kind}: ${leak.token}`);
    }
  }
}

console.log(`brief compose: library state — ${exemplarLine} (§4.13.1, the exemplar predicate is retired; the count is disclosed rather than compared against a stored expectation)`);
// kogaki#822 acceptance 5, and kogaki#661's defect: the count below is a CLAIM,
// and a claim compared against nothing reports a silently lost case as a green
// pass. The floor lives in checks/registry.json and the count lives here, so
// deleting a case and lowering this number fails against the floor — and
// lowering the floor to match is itself caught by check-registry-conformance.
// (v) §4.16 THE BRIEF'S FIGURE DECISION — `figure:` AND `figure_roles`
// (kogaki#877). The field is OPTIONAL and its default is NONE, which is
// asserted FIRST for the reason (q) states: every Leg composed before this
// issue carries none, and a required field would fail all of them.
//
// THE TWO MECHANICAL CONDITIONS ARE ASSERTED WHERE EACH ONE LIVES. The grammar
// and the claim addressing are pure and refuse at `validateLegs`; whether the
// Move declares a form at all needs the library and refuses at
// `resolveFigureForms`. Asserted against the FIXTURE library (the `MOVES`
// dir this file already maintains, carrying `chain-form-move`) rather than
// the real one: kogaki#1175 retired every one of the shipped 22 Moves,
// `introduce_paired_conceptual_axis` among them, so a real-library assertion
// would now be exercising a store this issue emptied rather than the one a
// composer binds to. An `axis`-kind fixture stands beside `chain-form-move`
// for this case alone.
//
// THE THIRD CONDITION IS NOT ASSERTED, and that is stated rather than left to
// be read as an omission: whether the figure CARRIES something is the
// composer's one judgment, stated in the `figure:` line, and §4.6 forbids a
// lint over a judgment — a missing field is refused, a weak one is not.
ranCase("v");
{
  // A FIXTURE LIBRARY OF ITS OWN, MINTED HERE (kogaki#1175). This case's
  // `MOVES` records used to live in the outer `MOVES` dir, which the
  // try/finally above already tore down by the time this case runs — the
  // outer dir's finally is the check's global cleanup, not a per-case scope,
  // so a fixture written into it and read after it is read from a directory
  // that no longer exists. A directory of its own, minted and removed only by
  // this case, is what keeps that ordering from mattering here.
  const MOVES_V = mkdtempSync(join(tmpdir(), "brief-compose-v-"));
  writeFileSync(join(MOVES_V, "axis-form-move.md"),
    "id: axis-form-move\nfigure:\n  kind: axis\n"
    + "  endpoint_a: the state the reader starts in\n  endpoint_b: the state the reader ends in\n"
    + "  criterion: what the two are being compared on\n");
  writeFileSync(join(MOVES_V, "state-claim-in-working-form.md"), "id: state-claim-in-working-form\n");
  const F = (id, extra = {}) => ({
    // THREE ROLES, THREE STRANDS (kogaki#1108) — see the note at `figLegOf`
    // in (x). The addressing this block asserts is `g<n>` over the Leg's own
    // claims and is unchanged; what changed is that three claims now require
    // three Strands to hang on.
    leg_id: id, move: "axis-form-move", materials: ["L1", "L2", "L3"], purpose: "p",
    reader_state_before: "knowledge: a", reader_state_after: "knowledge: b", depends_on: [],
    rationale: "r",
    claims: [
      { type: "strand", strand: "L1", proposition: "the defensive wall is the first endpoint" },
      { type: "strand", strand: "L2", proposition: "the offensive artillery is the other" },
      { type: "strand", strand: "L3", proposition: "the material names function as what the two are read against" },
    ],
    ...extra,
  });
  const AXIS = { figure: "the two endpoints on the one axis, which the prose leaves the reader assembling",
                 figure_roles: { endpoint_a: "g1", endpoint_b: "g2", criterion: "g3" } };
  const err = (legs) => validateLegs(legs).error || "";
  const open = (s) => ({ ...s, opens_section: "Opening" });

  // OPTIONAL, asserted first.
  if (err([open(F("s1"))])) {
    fails.push(`(v) a path declaring NO figure is refused — the field is optional and its default is none (§4.16): ${err([open(F("s1"))])}`);
  }
  // ACCEPTANCE 1, positive half: all three roles bound passes composition,
  // BOTH halves — the pure one and the Move-dependent one against the
  // fixture library.
  const goodPath = [open(F("s1", AXIS))];
  if (err(goodPath)) {
    fails.push(`(v) a fully bound axis figure is refused at validateLegs: ${err(goodPath)}`);
  }
  const goodForm = resolveFigureForms(goodPath, MOVES_V);
  if (goodForm.error) {
    fails.push(`(v) a fully bound axis figure is refused against the fixture Move library: ${goodForm.error}`);
  } else if (goodForm.figures !== 1) {
    fails.push(`(v) the form resolution counted ${goodForm.figures} figure-carrying Leg(s), not 1`);
  }
  // ACCEPTANCE 1, negative half: `criterion` unbound is REFUSED NAMING THE
  // ROLE. This is the Move-dependent half — the grammar cannot know a role is
  // missing, only the form can.
  const noCriterion = resolveFigureForms(
    [open(F("s1", { ...AXIS, figure_roles: { endpoint_a: "g1", endpoint_b: "g2" } }))], MOVES_V);
  if (!noCriterion.error || !/criterion/.test(noCriterion.error)) {
    fails.push(`(v) an unbound \`criterion\` is admitted or refused WITHOUT naming the role — a refusal that does not name it sends a composer to re-read the whole form: ${JSON.stringify(noCriterion)}`);
  }
  // A role the form does not have is refused too — the other direction, for
  // the reason (r) asserts both directions of the label tables: a check
  // asserted one way is green about the half somebody happened to write.
  const extraRole = resolveFigureForms(
    [open(F("s1", { ...AXIS, figure_roles: { ...AXIS.figure_roles, stages: "g1" } }))], MOVES_V);
  if (!extraRole.error || !/stages/.test(extraRole.error)) {
    fails.push(`(v) a role outside the form is admitted — the record would carry an element no kind declares: ${JSON.stringify(extraRole)}`);
  }
  // ACCEPTANCE 2: a Move with NO form is refused NAMING THE MOVE.
  //
  // THE FIXTURE'S MOVE MUST BE READABLE AND FORMLESS, AND BOTH HALVES ARE
  // ASSERTED. Written first against a Move id that did not exist, this case
  // passed for the wrong reason — `resolveFigureForms` refused it as
  // UNREADABLE and the refusal happened to name the id, so the assertion was
  // green while the formless branch it claims to cover was dead. That is the
  // binds-a-proxy shape, and it survived a mutation that made a formless Move
  // pass. A STORE THAT CANNOT BE READ IS NOT AN EMPTY STORE (`loadMoveIds`
  // states the same distinction one function over), so the two readings are
  // separated here rather than collapsed.
  const formless = "state-claim-in-working-form";
  const formlessRead = figureOf(formless, MOVES_V);
  if (formlessRead.error) {
    fails.push(`(v) the fixture's formless Move ${formless} cannot be READ (${formlessRead.error}) — the acceptance-2 case would assert over an unreadable store rather than over a Move with no form`);
  } else if (formlessRead.form) {
    fails.push(`(v) the fixture's formless Move ${formless} now declares a figure — the acceptance-2 case asserts over a shape that no longer exists`);
  }
  const noForm = resolveFigureForms([open(F("s1", { ...AXIS, move: formless }))], MOVES_V);
  if (!noForm.error || !new RegExp(formless).test(noForm.error) || !/no figure/.test(noForm.error)) {
    fails.push(`(v) a figure on a Move with no figure is admitted, or refused without naming the Move and the reason: ${JSON.stringify(noForm)}`);
  }
  // AND AN UNREADABLE MOVE IS A DIFFERENT REFUSAL. This is the direct evidence
  // that the case above covers the formless branch: a missing record refuses
  // as a STORE fault, so the two cannot be satisfied by one code path.
  const missing = resolveFigureForms([open(F("s1", { ...AXIS, move: "no-such-move-record" }))], MOVES_V);
  if (!missing.error || !/cannot be read/.test(missing.error)) {
    fails.push(`(v) a figure on a Move whose record is missing does not refuse as a store fault — a true refusal for a false reason: ${JSON.stringify(missing)}`);
  }
  // THE GRAMMAR HALF, refused at validateLegs and never reaching the library.
  const halves = [
    ["figure with no roles", { figure: "x" }, /figure_roles/],
    ["roles with no figure", { figure_roles: { endpoint_a: "g1" } }, /figure:/],
    ["blank figure", { figure: "   ", figure_roles: { endpoint_a: "g1" } }, /one line/],
    ["a role bound to the selector", { figure: "x", figure_roles: { kind: "g1" } }, /selector/],
    ["a non-address binding", { figure: "x", figure_roles: { endpoint_a: "the first claim" } }, /g<n>/],
  ];
  for (const [what, extra, want] of halves) {
    const e = err([open(F("s1", extra))]);
    if (!want.test(e)) fails.push(`(v) ${what} is admitted or refused by the wrong rule: ${e || "(admitted)"}`);
  }
  // THE CLAIM ADDRESS IS THIS LEG'S. An address past the end names a claim
  // that is not there — which is what makes "a role bound to a claim of
  // another Leg" unreachable rather than separately refused: the address
  // space is this Leg's claims and has no syntax for anyone else's.
  const pastEnd = err([open(F("s1", { ...AXIS, figure_roles: { ...AXIS.figure_roles, criterion: "g9" } }))]);
  if (!/g9/.test(pastEnd) || !/3 claim/.test(pastEnd)) {
    fails.push(`(v) a binding past this Leg's claim count is admitted or refused without naming both the address and the count: ${pastEnd || "(admitted)"}`);
  }
  // IT SURVIVES SERIALIZATION, and a Leg WITHOUT one writes no line — which
  // is acceptance 4's mechanism: a Brief composed before this field renders
  // byte-identically.
  const rendered = renderLeg(F("s1", AXIS));
  if (!/^figure: /m.test(rendered) || !/^figure_roles: /m.test(rendered)) {
    fails.push("(v) renderLeg drops `figure` — a Brief re-read from its recorded form declares no figure at all, and kogaki#878 would have nothing to realize");
  }
  if (/figure/.test(renderLeg(F("s1")))) {
    fails.push("(v) renderLeg writes a figure line for a Leg that declares none — every Brief composed before §4.16 would change bytes");
  }
  // THE ROUND TRIP IS ONE GRAMMAR, asserted at both ends. A writer and a
  // reader disagreeing about a value fails silently at exactly the field
  // whose value reaches the rendered figure.
  const back = parseFigureRoles(renderFigureRoles(AXIS.figure_roles));
  if (back.error || JSON.stringify(back.roles) !== JSON.stringify(AXIS.figure_roles)) {
    fails.push(`(v) figure_roles does not round-trip: ${JSON.stringify(back)}`);
  }
  if (!parseFigureRoles("endpoint_a").error) {
    fails.push("(v) a role binding with no `=` parses — the reader would admit a line the writer never produces");
  }
  // THE KIND SET IS THE MOVE LIBRARY'S, read and not restated. A form naming a
  // kind outside src/figure-kinds.json is refused, which is what keeps this
  // runtime and `tools/move_ingest.py` from disagreeing about what a kind is.
  if (!Object.prototype.hasOwnProperty.call(figureKinds().kinds || {}, "axis")) {
    fails.push("(v) src/figure-kinds.json declares no `axis` kind — the acceptance-1 fixture asserts over a kind the closed set no longer holds");
  }
  rmSync(MOVES_V, { recursive: true, force: true });
}

// (w) §4.16's DISCLOSURE AT THE CANDIDATE GATE (kogaki#877, acceptance 3).
// The clause reaches the label because THE LABEL IS THE SELECTION GATE, which
// is the surface `src/disclosure-fields.json` grades decision-class evidence
// to. That table is not extended here and the reason is asserted, not asserted
// away: it grades CANDIDATE-level fields and reads `c[field]`, and `figure` is
// a LEG field — an entry there would be permanently absent and its obligation
// permanently vacuous, which is the degrades-to-zero shape (u) already refuses.
//
// THE WARNING HAS NO TARGET AND REFUSES NOTHING (topics/articles.md 2026-08-01
// D11), so the above-three case is asserted to WARN and to stay SELECTABLE.
ranCase("w");
{
  const G = (id, extra = {}) => ({
    leg_id: id, move: "m", materials: ["L1"], purpose: "p",
    reader_state_before: "a", reader_state_after: "b", depends_on: [],
    rationale: "r", claims: [{ type: "strand", strand: "L1", proposition: "g" }],
    ...extra,
  });
  const FIG = { figure: "what the figure holds", figure_roles: { endpoint_a: "g1" } };
  const clause = (n) => figureClause(Array.from({ length: 4 }, (_, i) => G(`s${i + 1}`, i < n ? FIG : {})));

  // An empty set renders the explicit none. An absent clause and a clause
  // reading none are the same silence to a reader and different silences to a
  // check, and only the second lets a later run tell "no figure" from "nothing
  // composes the clause".
  if (!/no Leg carries a figure/.test(clause(0))) {
    fails.push(`(w) a Candidate with no figure renders no explicit none: ${clause(0)}`);
  }
  // TWO: the count and WHICH, and NO warning.
  const two = clause(2);
  if (!/2 Leg\(s\) carry a figure/.test(two) || !/s1, s2/.test(two)) {
    fails.push(`(w) the clause does not disclose the count and the Legs it names: ${two}`);
  }
  if (/second look/.test(two)) {
    fails.push(`(w) two figures warn — the soft warning is ABOVE three (acceptance 3): ${two}`);
  }
  // FOUR: warns.
  const four = clause(4);
  if (!/4 Leg\(s\) carry a figure/.test(four) || !/second look/.test(four)) {
    fails.push(`(w) four figure-carrying Legs do not show the warning in the clause (acceptance 3): ${four}`);
  }
  if (!/nothing here refuses it/.test(four)) {
    fails.push(`(w) the warning does not state that it refuses nothing — D11's warning has no target: ${four}`);
  }
  // THE CLAUSE REACHES THE LABEL, which is the acceptance's own wording. The
  // Candidate stays SELECTABLE above three: warning, never refusal.
  const four2 = clause(3 + 1);
  if (four2 !== four) fails.push("(w) figureClause is not a function of the path alone");
  // ONE DERIVATION for the count and the set — `figureLegs` — so the label's
  // number and the Legs it names cannot disagree.
  const path = [G("s1", FIG), G("s2"), G("s3", FIG)];
  if (figureLegs(path).map((s) => s.leg_id).join(",") !== "s1,s3") {
    fails.push("(w) figureLegs does not return the figure-carrying Legs in path order");
  }
}

// (y) THE AUTHORING CARRIER ENUMERATES EVERY §4.1 OPTIONAL LEG FIELD THAT HAS
// ITS OWN SUBSECTION (kogaki#935; the carrier MOVED at kogaki#1108).
//
// THE CARRIER IS `src/leg-schema.json`, NOT THE SKILL. Until kogaki#1108 the
// one act that authored Legs was a sitting reading leg 7 of
// `.claude/skills/brief/SKILL.md`, and this case read that leg. The skill is
// one `!` line now; the act that authors Legs is the executor's `compose_path`
// judgment state, and the text it puts in front of the composing Model is
// `src/leg-schema.json` rendered verbatim into the prompt. So the carrier this
// case reads moved with the act — the defect is unchanged (a field validated,
// serialized and disclosed while nothing ever tells the composer to write it),
// and what changed is which file is the one place the composer is told.
//
// AND THE COMPARATOR GOT STRICTER BY MOVING, not weaker. The skill was prose,
// so coverage was a word-bounded regex over a slice; the schema is a field
// TABLE, so coverage is membership in `fields`, and a field named only in the
// schema's own prose is NOT covered. That is the scoping the step-7 slice was
// approximating, now exact. §4.16 landed with no authoring carrier at
// all: the field could be validated by `validateLegs`, resolved by
// `resolveFigureForms`, serialized by `renderLeg` and disclosed at the
// Candidate gate while NEVER BEING AUTHORED by the one act that authors Legs,
// and every check stayed green in that state because the default is none and
// none is legitimate. §4.15's `opens_section` had the same gap, and case (n)
// already records the shape for `introduces` — "the field simply stops being
// authored, silently, with every check green". Three instances is what makes
// this a carrier rather than a one-line edit.
//
// THE ENUMERATION IS DERIVED, NEVER TRANSCRIBED. The field list is read from
// §4.1's own bullets in the spec, so field N+1 is covered by this assertion the
// day it is written there — which is the whole difference between catching the
// fourth instance and filing it. A hard-coded list here would be a fifth copy of
// the very enumeration that drifted.
//
// THE COMPARATOR IS SCOPED AND WORD-BOUND (PR #941 round 1). It reads leg 7
// of the skill — the one leg that authors Legs — and not the whole file, so a
// field named only in the revise-pass prose 140 lines below is NOT covered; and
// it matches a field name at word boundaries, so `figure` is not covered by
// `figure_roles` standing alone. Both are asserted below through the same
// comparator. And the derivation is checked by a LENGTH FLOOR, never by a
// transcribed list of names: a list here would be the fifth copy of the
// enumeration, and it would go red on a legitimate spec edit that retires a
// field, diagnosing a correct change as a derivation bug.
//
// WHAT IT DOES NOT PROVE, stated rather than implied: that the skill says the
// RIGHT thing about a field. A mention is mechanically checkable and adequacy is
// not — this refuses the silence, which is the defect the class was found by,
// and never grades the prose (§4.6: a missing field is refused, a weak one is
// not).
ranCase("y");
{
  const specPath = "specs/spec-draft-pipeline/SPEC.md";
  const schemaPath = "src/leg-schema.json";
  let spec = "", schema = null;
  try { spec = readFileSync(specPath, "utf8"); } catch { fails.push(`(y) ${specPath} is unreadable — the field list cannot be derived, and an underivable list is not a pass`); }
  try { schema = JSON.parse(readFileSync(schemaPath, "utf8")); } catch (e) { fails.push(`(y) ${schemaPath} is unreadable or is not JSON (${e.message}) — the authoring carrier cannot be read, and an unreadable carrier is not a pass`); }
  if (spec && schema) {
    // §4.1 ONLY, AND THE SLICE IS THE CARRIER (kogaki#942, from PR #941 round 2).
    // The bullets are read from a heading-to-next-heading slice of §4.1, taken
    // the way `leg7Of` slices the skill and refused the same way when the
    // heading cannot be found. The form this replaces read EVERY line of the
    // spec: §9's open-trigger bullets are the same shape and already carry a
    // subsection pointer (`- **\`bridge-approval-shape\`** (§4.11)`), so a
    // wording that added `optional` to one of them entered it in the list and the
    // member went red saying "§4.1 declares `bridge-approval-shape` as an
    // optional Leg field" — a false statement about §4.1 diagnosing an
    // unrelated §9 edit as step-7 drift.
    const section41Of = (specText) => {
      const m = /^### 4\.1 [\s\S]*?(?=^#{1,4} )/m.exec(specText);
      return m ? m[0] : null;
    };
    // TWO PREDICATES OVER ONE BULLET, SEPARATE ON PURPOSE. A bullet is
    // OPTIONAL-SHAPED if it carries either tell — the word `optional` or a
    // §4.NN pointer — and it is DERIVED only if it carries both plus a
    // backticked name. An optional-shaped bullet that yields no name is a live
    // bullet the derivation stopped matching, which is exactly the silent drop
    // the length floor let through (kogaki#942, finding 2): the floor stood at 4
    // while the live derivation yields 5, so a §4.1 bullet reworded until
    // `bridges` or `opens_section` stopped matching left four names, cleared the
    // floor, and the field was reported covered by a check whose whole subject
    // is a field going unmentioned. A floor AT the derived count is not the
    // repair — it goes red on a legitimate retirement, the false red round 1
    // objected to. Naming the unmatched bullet separates the two: a bullet's
    // disappearance is a spec edit and may move the count freely; a bullet's
    // silent non-match is refused by name.
    // A pair travelling together (`figure`/`figure_roles`) is one bullet naming
    // both, so every backticked name on the line is collected.
    // THE REQUIRED MARKER IS A THIRD SIGNAL, AND IT OVERRIDES BOTH TELLS
    // (kogaki#966, from PR #965 round 1). `looksOptional` admits a bullet on
    // EITHER tell, so a REQUIRED §4.1 bullet that gains a `§4.NN` cross-
    // reference is named as one that "declares an optional Leg field and the
    // derivation did not match it" — a false statement about that bullet, and
    // structurally the §9 false red kogaki#942 removed. The form is already
    // live one line up (`- **\`move\`** — a binding to a Move library entry
    // (§7). **Required.**`) and survives only because that pointer is §7.
    // Requiring BOTH tells instead is refused: it re-admits the one-tell-lost
    // drop kogaki#942 finding 2 exists to refuse, so the `opens_section`
    // mutation would go green again. Reading the spec's own `**Required.**`
    // marker separates the two — a bullet the spec MARKS required is not
    // optional-shaped whatever else it carries, while a bullet that merely
    // LOST `optional` carries no such marker and is still named. The escape is
    // therefore an explicit spec assertion rather than a silent drift, which is
    // the only difference this case has ever been about.
    // THE MARKER GUARDS `looksOptional` AND NOT `namesOn`, deliberately. Guarding
    // the name collector too would mint a fresh silent drop — a live optional
    // bullet that gains `**Required.**` would leave the coverage list AND go
    // unnamed, the exact shape this case refuses. Guarded on one side only, that
    // same edit keeps the field in the coverage list and merely stops it being
    // reported as unmatched, so nothing falls out of the list unobserved.
    const isBullet = (line) => /^- /.test(line);
    // ANCHORED AT THE END OF THE LINE (PR #968 round 1). Matching `**Required.**`
    // ANYWHERE would exempt a CONDITIONALLY-required optional bullet — the shape
    // `- **`figure_roles`** — optional; §4.16. **Required.** when `figure` is
    // declared.` — so that bullet losing `optional` would go unnamed, which is
    // the kogaki#942 finding-2 drop this narrowing was built around, one shape
    // in. An unconditional marker is the LAST thing the bullet says; a
    // conditional one is followed by its condition, and the anchor is what tells
    // the two apart. No such bullet is live in §4.1 today, which is why the
    // anchor is asserted rather than left to the live spec to demonstrate.
    const marksRequired = (line) => /\*\*Required\.\*\*\s*$/.test(line);
    const looksOptional = (line) =>
      !marksRequired(line) && (/\boptional\b/.test(line) || /§\s*4\.\d+/.test(line));
    const namesOn = (line) => {
      if (!/^- \*\*`/.test(line)) return [];
      if (!/\boptional\b/.test(line)) return [];
      if (!/§\s*4\.\d+/.test(line)) return [];
      return [...line.matchAll(/\*\*`([a-z_]+)`\*\*/g)].map((m) => m[1]);
    };
    const optionalFields = (specText) => {
      const slice = section41Of(specText);
      if (slice === null) return null;
      const out = [];
      for (const line of slice.split("\n")) out.push(...namesOn(line));
      return out;
    };
    const unmatchedOptionalBullets = (specText) => {
      const slice = section41Of(specText);
      if (slice === null) return null;
      return slice
        .split("\n")
        .filter((line) => isBullet(line) && looksOptional(line) && namesOn(line).length === 0);
    };
    // ONE COMPARATOR, run over the real pair AND over synthetic input below, so
    // the negative direction exercises the code the positive one runs and not a
    // restatement of it. The carrier side is a SET OF FIELD KEYS, so coverage is
    // membership rather than a regex over prose: `figure` cannot be covered by
    // `figure_roles`, and a name occurring only in the schema's notes is not
    // covered at all.
    const uncovered = (specText, keys) =>
      (optionalFields(specText) || []).filter((f) => !(keys || []).includes(f));
    // THE `fields` TABLE ONLY. A schema carrying no `fields` object is refused
    // rather than read whole, because "read the whole file" is exactly the
    // weakening the step-7 slice existed to refuse and the reason this carrier
    // is a table rather than prose.
    const schemaFieldKeys = (doc) => {
      const f = doc && doc.fields;
      if (!f || typeof f !== "object" || Array.isArray(f)) return null;
      return Object.keys(f);
    };

    const optional = optionalFields(spec);
    if (optional === null) {
      fails.push(`(y) §4.1's heading was not found in ${specPath} — the optional-field list is read from a §4.1 slice, and an unlocatable section is not a pass`);
    }
    for (const line of unmatchedOptionalBullets(spec) || []) {
      fails.push(`(y) a §4.1 bullet declares an optional Leg field and the derivation did not match it: ${line.trim()} — a RETIRED bullet is a spec edit and may move the count, but a bullet that silently stops matching drops its field out of the coverage list with this member green`);
    }
    const fieldKeys = schemaFieldKeys(schema);
    if (fieldKeys === null) fails.push(`(y) ${schemaPath} carries no \`fields\` object — the coverage test is scoped to the table the composer is shown, and an unlocatable table is not a pass`);
    for (const field of uncovered(spec, fieldKeys || [])) {
      fails.push(`(y) §4.1 declares \`${field}\` as an optional Leg field with its own subsection, and ${schemaPath} declares no such field — the field can be validated, serialized and disclosed while the text the composing Model is shown never mentions it, with every check green because the default is none (kogaki#935)`);
    }
    // THE NEGATIVE DIRECTION, run through the SAME comparator. A test that only
    // ever looks for fields that are present cannot tell "all covered" from
    // "nothing derived" — one regex edit and it is vacuous forever.
    const synth41 = (body) => `### 4.1 The Leg\n${body}### 4.2 The next section\n`;
    const synthSpec = synth41("- **`frobnicate`** — optional; §4.99.\n");
    if (uncovered(synthSpec, ["leg_id", "claims"]).length !== 1) {
      fails.push("(y) a §4.1 optional field absent from the authoring carrier was NOT reported — the coverage test is vacuous");
    }
    if (uncovered(synthSpec, ["leg_id", "frobnicate"]).length !== 0) {
      fails.push("(y) a field the carrier DOES declare was reported uncovered — the comparator refuses the covered case");
    }
    // EXACT, NOT PREFIX: a name that is a prefix of another name is not covered
    // by the longer one — `figure` by `figure_roles` is the live instance, and
    // the reason the old prose comparator had to be word-bound by hand.
    if (uncovered(synth41("- **`figure`** — optional; §4.16.\n"), ["figure_roles"]).length !== 1) {
      fails.push("(y) `figure` was reported covered by `figure_roles` alone — the comparator matches a key by prefix, and the field kogaki#935 was filed for can vanish from the table with the case green");
    }
    // SCOPED TO `fields`: a name occurring in the schema's own prose is not a
    // declared field, and a schema with no `fields` object is refused.
    const synthSchema = (field, note) => ({ note: [`prose mentioning ${note}`], fields: { [field]: { required: false } } });
    if (uncovered(synthSpec, schemaFieldKeys(synthSchema("leg_id", "frobnicate")) || []).length !== 1) {
      fails.push("(y) a field named only in the schema's PROSE was reported covered — the scoping to the `fields` table is not applied, and prose is exactly the carrier kogaki#1108 moved away from");
    }
    if (uncovered(synthSpec, schemaFieldKeys(synthSchema("frobnicate", "nothing")) || []).length !== 0) {
      fails.push("(y) a field declared IN the `fields` table was reported uncovered — the table reader does not reach its own keys");
    }
    if (schemaFieldKeys({ note: ["no fields object at all"] }) !== null) {
      fails.push("(y) a schema carrying no `fields` object was not refused — an unlocatable table reads as an empty key set, which reports every field as uncovered rather than naming the real fault");
    }
    // AND THE DERIVATION IS SELECTIVE. A REQUIRED §4.1 bullet carries no
    // `optional` and no subsection pointer, so it must not enter the list:
    // sweeping every bullet in would make the assertion pass or fail for
    // reasons that have nothing to do with the drift it names.
    if (optionalFields(synth41("- **`purpose`** — what the Leg does to the reader.\n")).length !== 0) {
      fails.push("(y) a REQUIRED §4.1 field entered the optional list — the derivation reads the bullet's form, not merely its backticks");
    }
    // SLICED, both directions. A matching bullet OUTSIDE §4.1 yields nothing —
    // this is the §9 false-red the whole-spec read produced — and one inside it
    // still yields its field.
    if (optionalFields("### 4.1 The Leg\n\n### 9. Open triggers\n- **`frobnicate`** — optional; §4.11.\n").length !== 0) {
      fails.push("(y) a bullet OUTSIDE §4.1 entered the optional-field list — the derivation reads past §4.1's own section, so a §9 open-trigger bullet reworded to carry `optional` is reported as a §4.1 Leg field");
    }
    if (optionalFields(synthSpec).length !== 1) {
      fails.push("(y) a bullet INSIDE §4.1 was not derived — the §4.1 slice does not reach its own bullets");
    }
    if (optionalFields("- **`frobnicate`** — optional; §4.99.\n") !== null) {
      fails.push("(y) a spec carrying no §4.1 heading was not refused — an unlocatable section reads as an empty field list, which reports every field as covered");
    }
    // PER-BULLET PRESENCE, both directions. An optional-shaped §4.1 bullet the
    // derivation does not match is named; a fully-matched one, and a REQUIRED
    // one, are not.
    if (unmatchedOptionalBullets(synth41("- **`frobnicate`** — §4.99.\n")).length !== 1) {
      fails.push("(y) a §4.1 bullet that reads as an optional-field declaration and yields no field was NOT named — the derivation can stop matching a live bullet with this member green, which is the drop the length floor let through");
    }
    if (unmatchedOptionalBullets(synthSpec).length !== 0) {
      fails.push("(y) a fully-matched §4.1 optional bullet was reported unmatched — the presence assertion refuses the covered case");
    }
    if (unmatchedOptionalBullets(synth41("- **`purpose`** — what the Leg does to the reader.\n")).length !== 0) {
      fails.push("(y) a REQUIRED §4.1 bullet was named as an unmatched optional one — the presence assertion reads the bullet's form, not merely its bullet marker");
    }
    // THE ONE-TELL-PRESENT-ON-A-REQUIRED-BULLET DIRECTION (kogaki#966). The
    // assertion above exercises the BOTH-ABSENT case: `purpose` carries neither
    // tell, so it passes under a predicate that reads no marker at all. This is
    // the live `move` bullet with its §7 pointer moved into §4's range — one
    // tell present, explicitly marked required — and nothing before kogaki#966
    // reached it.
    if (unmatchedOptionalBullets(synth41("- **`move`** — a binding to a Move library entry (§4.99). **Required.**\n")).length !== 0) {
      fails.push("(y) a REQUIRED §4.1 bullet carrying a §4.NN pointer was named as an unmatched optional one — the optional-shaped predicate admits on EITHER tell, so a required bullet that gains a cross-reference is reported as a bullet the derivation stopped matching, which is a false statement about that bullet (kogaki#966)");
    }
    // AND THE MARKER DOES NOT BUY A LOST TELL BACK. A bullet that merely stopped
    // carrying `optional` marks nothing required, so it is still named — the
    // drop kogaki#942 finding 2 refuses, asserted here against the narrowed
    // predicate rather than left to the assertion written before it.
    if (unmatchedOptionalBullets(synth41("- **`opens_section`** — §4.15.\n")).length !== 1) {
      fails.push("(y) a §4.1 bullet that LOST `optional` and marks nothing required was not named — narrowing the optional-shaped predicate by the required marker re-admitted the silent drop it was narrowed around (kogaki#966)");
    }
    // AND THE MARKER IS NOT A GENERAL ESCAPE FROM THE COVERAGE LIST. A live
    // optional bullet that gains `**Required.**` stays derived, so the field
    // cannot leave the comparator's reach unobserved — the one-sided guard
    // above, asserted rather than described.
    // AND A CONDITIONAL MARKER IS NOT AN UNCONDITIONAL ONE (PR #968 round 1). A
    // bullet whose `**Required.**` is followed by the condition it holds under
    // stays optional-shaped, so losing `optional` still names it.
    if (unmatchedOptionalBullets(synth41("- **`figure_roles`** — §4.16. **Required.** when `figure` is declared.\n")).length !== 1) {
      fails.push("(y) a CONDITIONALLY-required §4.1 bullet that LOST `optional` was not named — the required marker is matched anywhere on the line rather than as the last thing the bullet says, so a bullet required only under a condition is exempted outright and its silent drop goes unreported (PR #968 round 1)");
    }
    if (optionalFields(synth41("- **`frobnicate`** — optional; §4.99. **Required.**\n")).length !== 1) {
      fails.push("(y) a §4.1 bullet carrying BOTH optional tells left the derived field list because it also marks required — the required marker guards the optional-shaped predicate only, and guarding the name collector with it mints a fresh silent drop (kogaki#966)");
    }
  }
}

// (z) THE RUN-DECLARATION FILE IS NOT THE BARRIER, AND ITS REMOVAL IS
// ADMISSIBLE (§5.3/§6 v36, kogaki#915).
//
// v32's acceptance item 2 read "`adopt` refuses when no declaration for this
// run state was rendered", and what `cmdAdopt` checks is `state.gate`. The
// owner's ruling is that the WORDING was wrong rather than the barrier: the
// declaration for a run IS `state.gate`, and the `*.run-declaration.json` file
// is composed from it by the same actor the barrier guards against, so a check
// on the file refuses nothing a forged capture could not also forge.
//
// THIS CASE IS THE STATED ADMISSIBILITY, NOT AN ABSENCE OF ONE. Item 2 of
// kogaki#915 asks that the barrier which results be EXERCISED either way, and
// an untested admissible case and an untested refusal read identically to a
// later reader — which is the same class of defect as the wording this
// amendment repairs. So the removal is performed and the adoption is asserted
// to SUCCEED.
ranCase("z");
{
  const zdir = mkdtempSync(join(tmpdir(), "brief-decl-"));
  // THE CASE REMOVES ITS OWN TEMPORARY DIRECTORY ON EVERY PATH IT CAN
  // REACH (kogaki#956). The member's own body does this for `dir` in the
  // `finally` at the top level; this case is written after that block and so
  // owns its cleanup itself. Left undone, every suite run leaves a
  // `brief-decl-*` directory holding two run states and a capture behind —
  // the accumulating-run-state defect kogaki#750 removed, at a new site.
  try {
    const zrs = join(zdir, "run.json");
    run(["src/brief.mjs", "enter", ...SETTLED, "--run-state", zrs]);
    // THE DECLARATION FILE IS THE EXECUTOR'S NOW (kogaki#1108), and this case
    // is about what happens when it is GONE. `gate-thesis --declare` used to
    // write it beside the run state; the executor writes it into its own run
    // workspace at the `THESIS_ADOPTION` wait. Either way the file is a DERIVED
    // artifact and the barrier adoption actually reads is `state.gate` plus the
    // capture — which is what §5.3 v36 rules, and what this case exercises by
    // performing the removal rather than by asserting an absence.
    //
    // THE FILE IS PLANTED AND REMOVED HERE rather than produced by a command,
    // because no command produces it any more and a case that drove one would
    // be exercising a route the runtime does not have. What is under test is
    // adoption's own reading, and adoption never opens this file at all — which
    // is precisely the claim.
    const zdeclPath = declarationPath(zdir, "run.brief-thesis-adoption");
    writeFileSync(zdeclPath, JSON.stringify({
      id: "brief-thesis-adoption", run_declaration: true,
      note: "planted by (z): the derived artifact whose removal this case is about",
    }, null, 2) + "\n");
    const zcapPath = writeCapture(join(zdir, "z-capture.json"), "brief-thesis-adoption",
      thesisOptionIds(zrs), { option: "thesis-1" }, "toolu_fixture_decl_removed");
    // THE PRECONDITION IS ASSERTED, not assumed. If the plant above stopped
    // landing, the removal below would remove nothing and the case would pass
    // while exercising the empty set.
    if (!existsSync(zdeclPath)) {
      fails.push(`(z) no run declaration exists at ${zdeclPath} — the file whose removal this case is about does not exist, so the removal below is vacuous`);
    } else {
      // NOW REMOVE THE DECLARATION and adopt. This is the case the acceptance
      // item names, and under the owner's arm it SUCCEEDS.
      rmSync(zdeclPath);
      const zadopt = run(["src/brief.mjs", "adopt", "--run-state", zrs, "--capture", zcapPath]);
      if (zadopt.status !== 0) {
        fails.push(`(z) adoption against a run state whose declaration FILE was removed was refused — §5.3 v36 states it is admissible, because the file is a derived artifact and the barrier is \`state.gate\` plus the capture: ${(zadopt.stderr || zadopt.stdout || "").trim().slice(0, 200)}`);
      }
      // AND THE BARRIER THAT DOES BIND IS ASSERTED BY (t), NOT HERE. Without
      // one somewhere, the admissibility above is satisfied by an `adopt` that
      // checks nothing at all — which is the reading kogaki#915 rules out rather
      // than installs. (t) already asserts the `state.gate` refusal and names it,
      // so an assertion here would be a second answer to one question.
      //
      // CHECKED RATHER THAN ASSERTED: dropping cmdAdopt's `state.gate` barrier
      // was run as a mutation and failed (t), not this case. A version of this
      // block that adopted against a hand-written gate-less run state was WRITTEN
      // and WITHDRAWN — under that mutation the runtime throws on `state.gate.
      // gate_id` and exits non-zero, so the assertion passed for a reason that is
      // not the refusal it names. Recorded because a withdrawn assertion and one
      // that was never considered read identically to a later reader.
    }
  } finally {
    rmSync(zdir, { recursive: true, force: true });
  }
}

// (aa) A FULLY-UNRESOLVED SET STILL COMPOSES DISTINGUISHABLE CANDIDATES
// (kogaki#1106). On 2026-09-11 two `/brief` runs over two unrelated settled
// sets composed every candidate as the same string, so the thesis-determination
// gate had nothing to choose between and could not be raised.
//
// THE CAUSE WAS A FLAG THIS LANE WAS NOT READING, not the marker text.
// `resolveHeadlines` stamps a marker into `headline` and reports the miss in
// `found`; the composer branched on `e.headline` being truthy, which it is on
// every miss — so the member-naming branch added for exactly this case at
// PR #534 round 1 was unreachable from the one caller that matters. That is the
// same shape as the two defects PR #693 found one seam over: a branch that
// never ran and a branch that ran correctly are one silence to the suite.
//
// SEAM-FREE AND DRIVEN THROUGH THE COMPOSER'S OWN ARGUMENT, because the
// headlines map is exactly what `enter` passes: a case reaching a gateway
// would assert the seam, and the seam answered correctly throughout.
ranCase("aa");
{
  const strands = [
    { id: "L1", display_id: "L1", slug: "alpha", family: "lesson", tags: ["agents"], claim: "the alpha claim" },
    { id: "L2", display_id: "L2", slug: "bravo", family: "lesson", tags: ["agents"], claim: "the bravo claim" },
    { id: "L3", display_id: "L3", slug: "charlie", family: "lesson", tags: ["agents"], claim: "the charlie claim" },
  ];
  const missed = new Map(strands.map((s2) => [s2.slug, { headline: NO_HEADLINE, cite: null, found: false }]));
  const cands = composeThesisCandidates(strands, missed);
  const claims = cands.map((c) => c.claim);
  if (new Set(claims).size !== claims.length) {
    fails.push(`(aa) ${claims.length} candidates over a fully-unresolved set carry ${new Set(claims).size} distinct claim(s) — the gate is offered one option several times at the moment the owner most needs to see that something is wrong`);
  }
  // AND EACH ONE NAMES ITS OWN MEMBER, which is what makes them distinguishable
  // as a READING rather than merely as strings.
  for (const s2 of strands) {
    if (!claims.some((c) => c.includes(s2.display_id))) {
      fails.push(`(aa) no candidate names ${s2.display_id} — a set whose renderings are all missing must still say WHICH member is missing material`);
    }
  }
  // THE ADDRESS FAULT REACHES THE OWNER SURFACE, not only the seam state
  // (kogaki#1106 acceptance 2 and 3). With the seam reporting an address fault
  // the candidates must carry the address marker: rendering the read-and-empty
  // one here is what sent two runs and a six-day-old emission candidate looking
  // for missing MATERIAL instead of for a missing NAME.
  const faulted = composeThesisCandidates(strands, missed,
    { seam: "address-fault", namespaces: ["lessons"], unaddressable: new Set(["agents"]) });
  if (!faulted.every((c) => c.claim.includes(NO_SHARD_NAME))) {
    fails.push("(aa) an address fault composed candidates carrying the read-and-empty marker — a shard that was READ and carried nothing is a different fault from one the served enumeration never named, and only one of them is repaired by fixing an address");
  }
  if (faulted.some((c) => c.claim.includes(NO_HEADLINE))) {
    fails.push("(aa) an address fault still rendered NO_HEADLINE somewhere in the candidate set — the marker asserts a read that never happened");
  }
}


// ---- (ab) THE START ACT TAKES ITS STRAND SET ON THE COMMAND LINE, AND READS
// NO TERRAIN RUN (kogaki#1116, acceptance item 7).
//
// WHAT THIS EXISTS TO REFUSE. Between kogaki#1108 and this issue, `enter` read
// the settled set off the TERRAIN lane's open run record. Nothing in this
// member noticed, because every case here drove `enter` with explicit flags and
// the Terrain read was the fallback beneath them — so the lane coupling was
// exercised by nothing, and the day Terrain's own run wedged before its ID gate
// every Brief start refused and no check went red. The pair below binds the two
// halves of the replacement AT THE START ACT, which is the surface the owner
// reaches.
//
// THE ABSENCE IS STAGED, NEVER ASSUMED. Both cases run with the Terrain lane
// pointed at an EMPTY directory of their own through `KOGAKI_RUN_DIR` and
// `KOGAKI_OPEN_RUN`, so "no Terrain lane present" is a fact about this case's
// environment rather than about whatever the developer's machine happens to
// hold. A case that merely ran on a clean machine would pass for the wrong
// reason and would go red on a machine mid-Terrain-run.
ranCase("ab");
{
  const adir = mkdtempSync(join(tmpdir(), "brief-entry-"));
  try {
    const noTerrain = join(adir, "no-terrain-lane");
    mkdirSync(noTerrain, { recursive: true });
    // THE OPEN-GATE STORE IS ISOLATED, AND THAT IS A PRECONDITION RATHER THAN
    // TIDINESS. The start act OPENS a gate, and the open-gate pointer is what
    // `gate-open-terrain-gate.py` reads to refuse every act of the session
    // holding it. A case that started the executor against the live store
    // therefore wedges whatever session runs the suite — every tool denied
    // until the pointer is answered — and this case then deletes the payload
    // the refusal demands be echoed back, so the wedge has no exit at all. It
    // happened once, on the run that wrote this case.
    const gates = join(adir, "open-gates");
    mkdirSync(gates, { recursive: true });
    // THE JUDGE BINARY IS STUBBED, ON CASE (n)'S OWN RECIPE, AND IT IS NOT
    // OPTIONAL HERE. The start act resolves the table's `judge.command` over
    // PATH and REFUSES where no candidate answers `--version` (kogaki#1076) —
    // before any state runs, so it refuses ahead of the entry these cases are
    // about. On a developer machine `claude` is on PATH and the act rides
    // through; in CI it is not, and every arm below then reads the SAME
    // judge-resolution refusal: the run-record arm fails honestly, and the three
    // refusal arms fail while APPEARING to be about their own subject, since
    // each greps a refusal that is simply the wrong one. That is the shape
    // kogaki#1116's own findings warn about, arriving in the case written for
    // them, and it went red in CI at the first push.
    //
    // NOTHING HERE REACHES A JUDGMENT STATE — these cases stop at the first
    // wait — so the stub only has to answer the `--version` probe. It replaces
    // the BINARY and nothing else, so the argv, the resolution and every
    // refusal are the shipped ones.
    // ONE EXECUTABLE FILE, NEVER AN INTERPRETER PLUS A SCRIPT. `KOGAKI_JUDGE_CLI`
    // replaces the BINARY, and the resolver resolves it as one command — a
    // two-token value resolves to nothing and refuses with the same message an
    // absent `claude` gives, which is the first thing tried here and is worth
    // the line it costs a later reader.
    const judge = join(adir, "judge-stub");
    writeFileSync(judge, JUDGE_STUB, { mode: 0o755 });
    const env = {
      ...ELEMENTS_ENV,
      KOGAKI_JUDGE_CLI: judge,
      KOGAKI_BRIEF_RUN_DIR: join(adir, "brief-run"),
      KOGAKI_RUN_DIR: noTerrain,
      KOGAKI_OPEN_RUN: join(noTerrain, "no-such-pointer"),
      KOGAKI_OPEN_GATES: gates,
    };
    delete env.KOGAKI_BRIEF_OPEN_RUN;

    // ---- (ac) THE THESIS GATE'S PROVENANCE SENTENCE NAMES THE ENTERED
    // ADDRESSES, AND NAMES NOTHING UNDEFINED (kogaki#1121).
    //
    // WHAT THIS EXISTS TO REFUSE. kogaki#1116 changed the settled set's record
    // form to `{ addresses, via }`; the thesis gate's composer went on reading
    // `set.ids` and `set.survey`, the two fields that rename removed, and the
    // sentence the owner is shown read "Composed over the settled Strand set
    // undefined, from undefined, entered supplied on the command line." It is
    // on disk at `runs/brief/brief-2026-09-15T20-40-49-205Z`. Every case in
    // this member stayed green, because the only assertion on the provenance
    // was (ab)'s against `state.gate.where` — the Brief run STATE's own line,
    // composed elsewhere — and nothing read the bytes the gate call carries.
    //
    // IT RIDES (ab1)'S START rather than paying for a second one: the act
    // below is exactly "the thesis gate composed over two served addresses",
    // and a case of its own driving its own start would buy a second copy of
    // the same twelve seconds. It registers separately because what it asserts
    // is separately deletable.
    //
    // THE ASSERTION IS ON THE COMPOSED CALL, not on the declaration. The
    // sentence is a `GATE_CALL_READING_KEYS` reading, so it exists as owner-
    // visible bytes only after `composeGateCall` folds it into the question
    // text — which is the surface the open-gate hook compares and the one the
    // defect was visible on. Bound in BOTH directions: the addresses must be
    // named, and `undefined` must appear nowhere, because a composer reading
    // one live field and one dead one renders half a sentence correctly and
    // would pass a positive-only assertion.
    ranCase("ac");

    // (ab1) TWO SERVED ADDRESSES REACH THE THESIS GATE.
    const started = run(["src/brief.mjs", "start", ...SETTLED], env);
    const rec = (() => {
      try { return JSON.parse(readFileSync(join(env.KOGAKI_BRIEF_RUN_DIR, "run-record.json"), "utf8")); }
      catch { return null; }
    })();
    if (started.status !== 0 || !rec) {
      fails.push(`(ab) a start with two served addresses and NO Terrain lane did not reach a run record — the two lanes are independent since kogaki#1116, so a Terrain lane that does not exist must not reach this act at all: ${(started.stderr || started.stdout || "").trim().slice(0, 400)}`);
    } else {
      const owed = (rec.gate_declarations_owed || []).map((g) => g.state);
      if (!owed.includes("THESIS_ADOPTION")) {
        fails.push(`(ab) the start act stopped before the thesis gate with no Terrain lane present — states declared: ${owed.join(", ") || "none"}. Reaching the first owner question is what makes the set command-line-supplied rather than Terrain-supplied`);
      }
      // THE PROVENANCE BLOCK IS PART OF THE CASE (acceptance item 4), because
      // it is the whole reason opportunistic resolution is acceptable: the
      // owner reads the ADDRESSES before answering, so a mis-resolution is
      // catchable at the one moment nothing is written yet.
      const settled = rec.settled_set || {};
      if (!Array.isArray(settled.addresses) || settled.addresses.join(",") !== SETTLED.join(",")) {
        fails.push(`(ab) the run record does not carry the addresses the run was started with: ${JSON.stringify(settled.addresses)} — the provenance the gate renders is read from here`);
      }
      if (!String(settled.via || "").includes("command line")) {
        fails.push(`(ab) the settled set is not marked as supplied on the command line (via: ${JSON.stringify(settled.via)}) — an unmarked set reads as one some other lane settled`);
      }
      const state = (() => {
        try { return JSON.parse(readFileSync(rec.brief_run_state, "utf8")); } catch { return null; }
      })();
      if (!state) {
        fails.push("(ab) the start act wrote no Brief run state, so the resolved set cannot be read");
      } else {
        if (!state.gate.where.includes(SETTLED[0]) || !state.gate.where.includes(SETTLED[1])) {
          fails.push(`(ab) the thesis gate's provenance line does not render the addresses: ${state.gate.where}`);
        }
        // THE CITE IS THE SERVED ADDRESS AT ITS CONTENT HASH, AND CARRIES NO
        // COMMIT (acceptance item 6). Asserted in BOTH directions: the positive
        // alone would pass on a cite that carried the address AND a commit pin
        // beside it, which is exactly the shape a half-migration leaves.
        for (const s of state.strands) {
          if (!s.cite.startsWith(`${s.address}@`)) {
            fails.push(`(ab) ${s.display_id}'s cite is not the served address at its content hash: ${s.cite}`);
          }
          if (/@[0-9a-f]{7,40}$/.test(s.cite) && !/@[0-9a-f]{64}$/.test(s.cite)) {
            fails.push(`(ab) ${s.display_id}'s cite carries something other than a content hash: ${s.cite} — the commit pin is deprecated (kogaki#1116)`);
          }
        }
        if (state.pin !== undefined) {
          fails.push("(ab) the Brief run state still carries a `pin` — nothing in Brief reads the response pin since kogaki#1116, and a field nothing reads is a field a later reader will");
        }
      }
      // (ac) THE BYTES THE OWNER IS SHOWN.
      const asked = (() => {
        const owedGate = (rec.gate_declarations_owed || [])
          .find((g) => g.state === "THESIS_ADOPTION" && g.declaration);
        if (!owedGate) return null;
        const dp = resolvePath(process.cwd(), owedGate.declaration);
        let decl;
        try { decl = JSON.parse(readFileSync(dp, "utf8")); } catch { return null; }
        const callPath = join(dirnameOf(dp), `${decl.id}.gate-call.json`);
        if (!existsSync(callPath)) return null;
        try { return JSON.parse(readFileSync(callPath, "utf8")).questions[0].question; }
        catch { return null; }
      })();
      if (!asked) {
        fails.push("(ac) the start act composed no thesis gate CALL — the provenance sentence exists as owner-visible bytes only inside the composed question, so there is nothing to read");
      } else {
        for (const a of SETTLED) {
          if (!asked.includes(a)) {
            fails.push(`(ac) the composed thesis-gate question does not name ${a} — the owner is asked to adopt a Thesis composed over a set the question does not state: ${asked.slice(0, 300)}`);
          }
        }
        if (asked.includes("undefined")) {
          fails.push(`(ac) the composed thesis-gate question renders \`undefined\` — the provenance sentence is reading a field the settled-set record does not carry (kogaki#1116 renamed it to \`{ addresses, via }\`): ${asked.slice(0, 300)}`);
        }
      }
    }

    // (ab2) A FULL REPORT COORDINATE IS REFUSED BY NAME, and the refusal names
    // the MODEL's resolution. Bound to the refusal's own sentence rather than
    // to the token, because the token appears in every other refusal this path
    // can raise — an assertion on `L15` alone goes green against the
    // address-not-served arm, which is the proxy shape this file refuses.
    const l15 = run(["src/brief.mjs", "start", "L15"], {
      ...env, KOGAKI_BRIEF_RUN_DIR: join(adir, "brief-run-l15"),
    });
    const said = `${l15.stderr || ""}${l15.stdout || ""}`;
    if (l15.status === 0) {
      fails.push("(ab) a start with `L15` was ACCEPTED — an L id is not a Strand identity: Terrain mints it by position at survey time, so the same token names a different Lesson after a pin advance");
    }
    if (!said.includes("L15")) {
      fails.push(`(ab) the refusal does not name the token it refused: ${said.trim().slice(0, 300)}`);
    }
    if (!/MODEL resolves|Model resolves/.test(said)) {
      fails.push(`(ab) the refusal does not say that the MODEL resolves a report coordinate into served addresses before the skill is invoked — a refusal that names no repair sends the owner back to Terrain, which is the coupling this issue removes: ${said.trim().slice(0, 300)}`);
    }
    // THE DISCRIMINATION: a served address is admitted by the same act, so the
    // refusal above is a refusal of the TOKEN and not of everything.
    if (run(["src/brief.mjs", "start", SETTLED[0]], {
      ...env, KOGAKI_BRIEF_RUN_DIR: join(adir, "brief-run-one"),
    }).status !== 0) {
      fails.push("(ab) the same act refused a SERVED address too, so the L-token refusal above proves nothing about which inputs are admitted");
    }
    // AND A START WITH NO ARGUMENT AT ALL REFUSES (acceptance item 1), which is
    // the state every `/brief` invocation was in before this issue: the skill
    // line carried no `$ARGUMENTS`, so nothing the owner typed reached here.
    const bare = run(["src/brief.mjs", "start"], {
      ...env, KOGAKI_BRIEF_RUN_DIR: join(adir, "brief-run-bare"),
    });
    const bareSaid = `${bare.stderr || ""}${bare.stdout || ""}`;
    if (bare.status === 0) {
      fails.push("(ab) a start with NO argument was accepted — with no Strand set there is nothing to compose from, and the run must say so rather than reach for one");
    }
    if (!bareSaid.includes("coding::lesson/")) {
      fails.push(`(ab) the no-argument refusal does not name the argument form: ${bareSaid.trim().slice(0, 300)}`);
    }
  } finally {
    rmSync(adir, { recursive: true, force: true });
  }
}

// (count) THE COUNT THIS MEMBER REPORTS IS THE SET OF CASES THAT RAN
// (kogaki#972). Placed LAST on purpose: `CASES.duplicates` is only complete
// once every case above has registered, so an assertion sited earlier would
// pass over a file it had not finished reading.
//
// THE INSTRUMENT IS BOUND BY THIS CASE, which is the acceptance item and not a
// courtesy: an instrument whose own arithmetic nothing exercises is exactly
// the unmeasured declaration it replaces, one level up.
//
// MUTATIONS RECORDED (this suite's convention). Two were run against the tree
// at this head, and both are quoted by their observed output rather than by
// what they were expected to do.
//
//   (1) `ranCase("z")` DELETED, the case body left intact:
//       `(floor) this member reports 34 case(s) against a declared case_floor
//       of 35 — cases were LOST rather than broken`.
//       That is the defect kogaki#972 names, and under the constant this
//       replaces the same edit went green — a case removed from the file
//       moved no number, because no number was reading the file.
//
//   (2) `ranCase("l-bridge")` CHANGED to `ranCase("l-reader-fields")`, so two
//       cases share one registration id:
//       `(count) case id(s) registered twice in this member: l-reader-fields`,
//       and `(floor) ... reports 34 case(s) against a declared case_floor of
//       35`.
//       Both arms fire, and that pairing is the point: the collapse is named
//       HERE by its own cause rather than reaching the reader only as an
//       unexplained count one lower.
ranCase("count");
{
  const probe = newCaseRegistry();
  if (probe.size !== 0) fails.push(`(count) a fresh case registry reports ${probe.size} rather than 0 — a count that starts non-empty is not a count of what ran`);
  probe.ran("one");
  probe.ran("two");
  if (probe.size !== 2) fails.push(`(count) two distinct registrations counted ${probe.size} — the registry does not count what it is given`);
  // THE DELETION THIS INSTRUMENT EXISTS TO SEE, asserted rather than assumed:
  // a registry missing one case reports a LOWER number than one holding it,
  // which is the whole mechanism by which a deleted case reaches the floor.
  const short = newCaseRegistry();
  short.ran("one");
  if (!(short.size < probe.size)) fails.push(`(count) a registry missing one case reports ${short.size} against ${probe.size} — a deleted case does not lower the count, so the floor comparison below cannot see the loss it is declared for`);
  // A REUSED ID IS REFUSED BY NAME rather than silently absorbed.
  probe.ran("two");
  if (probe.size !== 2) fails.push(`(count) a repeated id changed the size to ${probe.size} — a registry that counts repeats counts cases that did not run`);
  if (!probe.duplicates.includes("two")) fails.push("(count) a repeated case id was absorbed silently — two cases sharing one id count as ONE, so deleting either leaves the count unchanged, which is the blindness this instrument replaces rebuilt inside it");
  if (CASES.duplicates.length) fails.push(`(count) case id(s) registered twice in this member: ${CASES.duplicates.join(", ")} — this file REUSES its case letters (a second (k), (l) and (r) exist), so the registration id must disambiguate where the letter cannot`);
}

// THE FLOOR, now compared against a MEASUREMENT on one side (kogaki#972). The
// comparison itself is unchanged and stays where kogaki#970 put it, over the
// declaration in `validate_floor_exceeds_arm`, so no member is exempted by a
// list; what changed is that the left-hand side is produced by the pass rather
// than declared beside it.
const CASE_COUNT = CASES.size;
{
  const reg = JSON.parse(readFileSync("checks/registry.json", "utf8"));
  const floor = (reg.checks.find((m) => m.id === "brief-compose") || {}).admission?.case_floor;
  if (typeof floor !== "number") {
    fails.push("(floor) checks/registry.json declares no case_floor for brief-compose — an unreadable floor is not a pass (kogaki#661)");
  } else if (CASE_COUNT < floor) {
    fails.push(`(floor) this member reports ${CASE_COUNT} case(s) against a declared case_floor of ${floor} — cases were LOST rather than broken, and the pass line would otherwise report their absence as evidence (kogaki#661)`);
  // THE UPWARD ARM (kogaki#970). Below the floor is cases LOST; above it is
  // cases ADDED with the floor left behind, and until this arm existed the two
  // were the same silence. THE NOTE THAT STOOD HERE IS SUPERSEDED RATHER THAN
  // DELETED (kogaki#972): it said the drift on this member is `between two
  // numbers in this repository — which makes the arm cheaper, not less owed`,
  // and that was the defect kogaki#972 was filed on. Only ONE side is a
  // declaration now; the other is the size of the set the cases registered
  // into as they ran, so this arm reads a measurement against a floor.
  } else if (CASE_COUNT > floor) {
    fails.push(`(floor) this member reports ${CASE_COUNT} case(s) against a declared case_floor of ${floor} — cases were ADDED and the floor was not advanced in the same act, so the ratchet is ${CASE_COUNT - floor} behind and cannot see a case deleted inside that gap (kogaki#970). Set case_floor to ${CASE_COUNT} for \`brief-compose\` in checks/registry.json, in this commit`);
  }
}
if (fails.length) {
  console.log("FAIL brief compose (SPEC-draft-pipeline §§4.1/4.4/5.1-5.2, story 1.73):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief compose: " + CASE_COUNT + "/" + CASE_COUNT + " cases — "
  + "(count) THE COUNT IN THIS LINE IS MEASURED, NOT DECLARED (kogaki#972): it is the size of the set each case registers into as it runs, so deleting a case lowers it and the floor arm below sees the loss. What stood here was a hand-maintained `CASE_COUNT = 28` compared against a `case_floor` of 28 — two declarations in this repository agreeing with each other, neither of them the cases. The gap that made the defect concrete: 35 cases register today, so SEVEN existed that the constant never counted, and a deletion inside that gap was invisible in both directions at once. A REUSED REGISTRATION ID is refused BY NAME rather than absorbed, because this file reuses its case LETTERS — a second (k), (l) and (r) exist — and two cases sharing one id would count as one, rebuilding the blindness inside the repair; the ids therefore disambiguate where the letter cannot. NOT COVERED, and the instrument has TWO blind sides which are recorded together because either one alone reads as the whole limit. (1) It counts cases that RAN and judges nothing any of them asserts, so a case emptied of its assertions still registers — the floor sees DELETION and not evisceration, the half kogaki#661 admitted the field for and the half it did not. (2) A case ADDED with no `ranCase(...)` site is invisible to the registry: the count does not rise, the floor stays equal, and this member goes green — which is exactly the condition kogaki#972 discovered, seven uncounted cases against a declared 28, and nothing here prevents its recurrence at case 36. The count is honest about what it counts and silent about what never registered; "
  + "(z) THE RUN-DECLARATION FILE IS NOT THE BARRIER, AND ITS REMOVAL IS ADMISSIBLE (\u00a75.3/\u00a76 v36, kogaki#915): "
  + "v32's acceptance item 2 said `adopt` refuses when no declaration for this run state was rendered, and what "
  + "`cmdAdopt` checks is `state.gate`. The owner ruled the WORDING was wrong rather than the barrier — the file is "
  + "composed FROM `state.gate` by the same actor the barrier guards against, so a check on it refuses nothing a forged "
  + "capture could not also forge. This case performs the removal and asserts adoption SUCCEEDS, because an untested "
  + "admissible case and an untested refusal read identically to a later reader. The precondition is asserted rather "
  + "than assumed (the declaration is written, at that name) so the removal cannot be vacuous, and the barrier that DOES "
  + "hold is asserted in the negative direction at the wait: `--capture` with no declaration ever written must refuse, "
  + "which is what makes \u00a75.3's `established transitively` a tested claim rather than a stated one. The `state.gate` "
  + "refusal itself is (t)'s and is NOT re-asserted here; dropping it was run as a mutation and failed (t), not this "
  + "case. NOT COVERED, stated rather than implied: `check-gate-carrier` legitimately answers the OPPOSITE about the "
  + "same run — with no sibling declaration a capture falls back to the registry (SPEC-gate-carrier \u00a74.1), so for this "
  + "`dynamic_options` gate a removed file leaves that member red while adoption is green. The two ask different "
  + "questions and neither is this member's to reconcile; \u00a75.3 v36 states why; "
  + "(y) THE AUTHORING CARRIER ENUMERATES EVERY §4.1 OPTIONAL LEG FIELD WITH ITS OWN SUBSECTION (kogaki#935; the carrier MOVED to `src/leg-schema.json` at kogaki#1108, and the comparator got STRICTER by moving — the skill was prose, so coverage was a word-bounded regex over a leg-7 slice; the schema is a field TABLE, so coverage is membership in `fields` and a name occurring only in the schema's own notes is NOT covered, which is the scoping the slice was approximating): §4.16 landed with no authoring carrier — the field was validated, resolved, serialized and disclosed at the gate while nothing ever told the composing party to write it, and every check stayed green because the default is none and none is legitimate. §4.15's `opens_section` had the same gap and case (n) records it for `introduces`, which is what makes three instances a carrier rather than an edit. The enumeration is DERIVED from §4.1's own bullets, never transcribed, so field N+1 is covered the day it is written there; the derivation refuses its own empty result, because a list that silently empties reports every field as covered. What it does NOT prove, stated rather than implied: that the skill says the RIGHT thing about a field — a mention is mechanically checkable and adequacy is not, so this refuses the silence and never grades the prose (§4.6). THE OPTIONAL-SHAPED PREDICATE READS A THIRD SIGNAL (kogaki#966): it admitted a bullet on EITHER tell, so a REQUIRED §4.1 bullet that gains a §4.NN cross-reference was named as one the derivation stopped matching — live one line up as `move`, which survives today only because its pointer is §7. The spec's own `**Required.**` marker overrides both tells, so a bullet the spec MARKS required is not optional-shaped while a bullet that merely LOST `optional` carries no marker and is still named. The marker is read ANCHORED AT THE END OF THE LINE (PR #968 round 1): matched anywhere it would exempt a CONDITIONALLY-required optional bullet, whose `**Required.**` is followed by the condition it holds under, and that bullet losing `optional` would then go unnamed — the kogaki#942 drop one shape in, minted by the narrowing built around it. An unconditional marker is the LAST thing the bullet says, which is what the anchor reads; requiring both tells instead was refused because it re-admits exactly the silent drop kogaki#942 finding 2 exists to refuse. The marker guards that predicate and NOT the name collector, deliberately: guarding both would let a live optional bullet leave the coverage list unobserved by gaining the marker, a fresh drop minted by the repair for the drop; (v)(w)(w1)(w2)(x) §4.16's FIGURE DECISION (kogaki#877, kogaki#934): `figure:` plus `figure_roles` is an OPTIONAL Leg field whose default is none — asserted FIRST, which is also the mechanism by which every Brief composed before it composes unchanged, since `renderLeg` writes neither line for a Leg that declares none. Its two MECHANICAL conditions are asserted where each one lives: the grammar and the claim addressing refuse at `validateLegs` (either half declared alone, a blank line, the form's `kind` selector bound as a role, a non-address binding, and an address past this Leg's claim count — which is what makes a binding to ANOTHER Leg\'s claim unreachable rather than separately refused), and whether the Move declares a form at all refuses at `resolveFigureForms` against the REAL shipped library, with an unbound role and a role outside the form refused in BOTH directions and a formless Move separated from an UNREADABLE one, because a store that cannot be read is not an empty store. The THIRD condition is deliberately not asserted: whether the figure carries something is the composer\'s one judgment, stated in the `figure:` line, and §4.6 forbids a lint over a judgment. The gate DISCLOSURE — the count, the Legs it names, and the soft warning ABOVE three that refuses nothing (D11) — is asserted at the clause composer AND at the option label the owner actually reads, and the Move check is asserted AT THE ADOPTION SEAT, because a mutation dropping the clause from the label and one skipping the check inside `adoptCandidate` each survived every direct call to the function: the composer was green while the act rendered nothing. The clause lands on the LABEL rather than in `src/disclosure-fields.json`\'s rendering because that table grades CANDIDATE-level fields and reads `c[field]`, and `figure` is a LEG field — an entry there would be permanently absent and its obligation permanently vacuous; the grade and the seat agree, since the label IS the selection gate that grade names. (w2) THE CLAUSE'S LEG IDS ARE ADMISSIBLE AND ONLY THEY ARE (kogaki#934): the label the clause writes is walked by the spec-internal-vocabulary tripwire, whose identifier pattern matches ANY snake_case token, so a figure on a Leg whose id is snake_case made the gate return NO PAYLOAD AT ALL — every option refused because of one Leg's name, and every fixture in (w) and (w1) uses `s1`/`f1`-style ids, which is exactly the id shape that cannot trip the wire. The repair is an admissible-override set computed from `figureLegs`, the clause's OWN selector, so the exempted tokens cannot drift from the rendered ones by being derived twice; it is asserted in BOTH directions and in BOTH scopings — the mandated caller assembles with the whole option set present and its id in the label, a genuine term of art in that SAME label still refuses, one Candidate's ids are NOT exempt in another Candidate's label, and no surface but the option label consults the override, because nothing here is exempt by spelling and everything by provenance; (u) the DISCLOSURE-CLASS table and its one test (kogaki#909, owner ruling 2026-09-06): `src/disclosure-fields.json` grades each Candidate-level disclosure field by whether it BEARS ON THE CHOICE — decision-grade reaches the selection gate because a pending human verdict's carrier is the render layer, post-hoc rides the minted Brief's slot because nothing is owed about a path not taken. Seven malformations of the table are refused BY NAME in both directions (a grade naming no surface, a field naming an unknown grade, a grade no field claims, a field with no ground for its grade, and the two empty cases), every declared grade is shown to have a live producer, an undeclared key resolves to null rather than to an invented surface, and the gate rendering is proved DERIVED rather than enumerated by a SYNTHETIC table whose third decision-grade field renders with no code naming it — which is the property that makes field N+1 cost no check member. End to end: a Candidate at the revise bound reaches the owner carrying the Harness's own sentence about its own arithmetic, a Candidate below the bound renders nothing so kogaki#859's empty case is intact, a post-hoc field does NOT leak onto the gate, a residue with no words still discloses rather than rendering blank, and the shared vocabulary tripwire binds the new paragraph. NOT COVERED, stated rather than implied: a field NOBODY DECLARED is outside this table's reach — no reading of it bears on a key that was never entered — so what is closed is the defect the class was found by, a DECLARED piece of evidence with no surface, and not the wider claim that every possible field is surfaced; (q) §4.15's Section grouping (kogaki#822): opens_section is OPTIONAL (asserted first), rule 3 refuses a path opening none, rule 2 refuses a Leg that develops its predecessor from opening, rule 4's LEG-COUNT clause refuses two consecutive one-Leg Sections, a correctly grouped path is admitted as the control, three malformed values are refused, and the field survives renderLeg. Validated at COMPOSITION, not at `brief.mjs mint` — mint writes a shell and no Leg exists there; rule 1 is the positive case rule 2's refusal covers, and rule 4's prose-length clause is §4.15's named deferred slot, so neither is asserted; (a) §4.1 Leg shape refused per missing field, the "
  + "closed §4.4 claim types, entailed-without-reasoning refused, depends_on earlier-only, "
  + "a Move REQUIRED on every Leg (§4.1 v18, kogaki#642 — the rider it supersedes read the other way); (b) the fill lands sequence, strand_coverage (used_by_legs "
  + "derived from the legs, role_in_thesis carried) and the §5.2 ledger with introduced_by/"
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
  + "unconditional free-text channel whose prompt carries what SPEC-draft-pipeline v35 rules \u2014 "
  + "free text is a COMMENT that adopts nothing, the two arms that DO decide are named, and a "
  + "comment on its own returns the owner to the gate, which is HOW it leaves the negation "
  + "undischarged. REWRITTEN AT kogaki#950 RATHER THAN APPENDED TO: this clause said (e) asserts a "
  + "channel `that states it does not discharge the negation`, which described the literal phrase "
  + "(e) matched rather than the property \u00a76 rules, and (e) now accepts either the explicit "
  + "disclaimer or a statement that the typed arms decide. An admission record that contradicts its "
  + "member is not recording what is carried (kogaki#145) \u2014 the class this very string literal "
  + "has been repaired for twice, and the reason the repair rides the same diff. And NO "
  + "EVIDENCE OBJECT — the option carries its id, its label and the bounded rendering and nothing "
  + "else, which is what (e) now asserts rather than the retention it once did. THIS CLAUSE READ "
  + "`and per-Candidate evidence carrying leg validity, transition continuity, Thesis closure, the "
  + "ledger's state and the placement count from each Candidate's OWN legs` — the exact shape "
  + "kogaki#859's amendment REMOVED, left standing in the same string literal whose (i) and (j) halves "
  + "were rewritten and beside the registry contract that was rewritten on precisely this ground. It is "
  + "the FOURTH surface of carried finding 1's own class and was found by PR #887 round 1, inside the "
  + "diff that repairs the other three — which is the finding worth keeping: repairing a self-description "
  + "class one named surface at a time leaves the surfaces nobody enumerated, and the enumeration came "
  + "from the round rather than from the head. The per-Candidate properties are asserted where they are "
  + "COMPOSED, at (e), (i) and (l) against candidateEvidence; (f) the "
  + "adopted Candidate's Reader Path lands in the Brief's sequence with thesis_closure and "
  + "tradeoffs filled from its reasoning, a declined Candidate lands nowhere, and an "
  + "unoffered Candidate refuses; (g) both assemble and adopt-candidate command paths are "
  + "byte-equal to the exported functions, AND §4.12.3's gate driven THROUGH ITS REAL TWO-LEG FLOW (kogaki#893) — "
  + "`ratify-specialization` composing the run declaration over a record that has already passed and RENDERING every verdict's Move and judging sentence to the screen the owner reads, "
  + "then `--capture` admitting an answer against THAT declaration: the declining answer is recorded and refuses NAMING itself while writing nothing, and the affirmative one appended after it adopts, "
  + "since the last row is the answer that governs and an owner may change their mind. Hand-writing a capture file here would have tested validateRatification twice and the executor never; "
  + "(k) THE LEG↔MOVE INSTANTIATION CONTRACT (§4.12, kogaki#747) at adoption, the "
  + "one write that lands a sequence in an existing Brief — MECHANICALLY, a move id resolving to no "
  + "Move library record refuses NAMING the Leg and the id and writes nothing, an unreadable library "
  + "refuses as a STORE fault rather than blaming the composition, and a readable directory holding no "
  + "records is not a library; AS JUDGMENT, the specialization record is REQUIRED (its absence refuses at "
  + "the act, which is the same assertion that proves no verdict is composed here), one verdict per Leg "
  + "exactly in both directions, bound to the adopted Candidate AND to the Move each Leg binds, its "
  + "vocabulary READ FROM src/specialization-schema.json rather than restated, every non-passing value "
  + "refusing with the Leg named and the judging sitting's own sentence QUOTED, and the refusal "
  + "deterministic in path order. Whether a specialization HOLDS is judged by the composing sitting and "
  + "never here: this member asserts the record's shape, its binding and the refusal, and composes no "
  + "verdict of its own — §4.6 clause 3 stands. "
  + "EVERY VALUE IN THAT VOCABULARY LOOP IS NOW DRIVEN WITH A CONFORMING RATIFICATION IN HAND (kogaki#893) — the ordering assertion carried inside the loop rather than beside it: "
  + "a non-passing record refuses on its VERDICT even when the owner has ratified, because the refusing arms sit ABOVE the gate and are unchanged by it; "
  + "(s) §4.12.3 THE OWNER RATIFICATION GATE (kogaki#893) — the case opens on THE ISSUE'S OWN TEST, a shape-valid JUDGMENT-FREE all-`consistent` record, asserted first to pass every §4.12 clause "
  + "so that its refusal is about the gate and not about its shape, then refused at adoption. Before this head it adopted with no refusal: the right act with the guard silently disabled. "
  + "The refusal is DISCRIMINATED — it must say the record PASSES, name the gate and name the input, or a sitting is sent to repair verdicts that are correct — and it carries the digest and one rendering row per Leg, "
  + "because `ratify-specialization --declare` reaches that same branch to compose the gate and a refusal that dropped them would leave the executor recomputing what passed. "
  + "The gate is DECLARED in src/gate-registry.json with both options and a first-class premise negation: every option is generated on the premise that the `consistent` verdicts hold, which is EXACTLY what is being asked about. "
  + "Then every axis by which a capture could certify something it did not judge — a medium other than the question UI, a missing tool_use_id, a free-text answer (a write unlocked by arbitrary prose is unlocked by anything), "
  + "the decline refusing BY NAME (an owner who said no and an owner never asked are different facts), a capture bound to another Candidate, a capture naming what it ratifies nowhere, "
  + "and the record EDITED AFTER ratification, which is the axis the Candidate binding cannot cover: same Candidate, same shape, a verdict's own sentence rewritten. "
  + "The digest is asserted in BOTH directions, since a binding key wrong in either is worse than none — reordering the record's verdicts must NOT change it (the runtime reads them in path order) and rejudging one MUST. "
  + "NOTHING HERE JUDGES A SPECIALIZATION, reads a Move's before/after, or compares anything to anything: the record is carried to the owner as GATE EVIDENCE, which is what §7.5 already says happens to before/after matching, "
  + "and the owner approves a result, where §4.6 clause 2 already sites the human gate. The declined arm of the issue's acceptance item 1 — a string-match anchor over the Move contract — is the one that owed those sections an amendment; "
  + "(m) §4.13 THE READER-KNOWLEDGE LEDGER and §4.13.1's exemplar predicate, RETIRED (kogaki#1175) "
  + "(kogaki#751) — `introduces` is OPTIONAL (asserted first: every Leg composed before it carries none), "
  + "its entry grammar takes a bare term or `term — anchor` with an anchor free to contain commas (which is "
  + "why serialization is one LINE per entry and could not be a joined field), and six malformed shapes each "
  + "refuse NAMING the Leg; the ledger DERIVES reader_already_knows as the union of Legs 1..N-1 with the "
  + "snapshot taken before a Leg's own entries, carrying each term's anchor and its introducing Leg, and a "
  + "path introducing nothing renders an EMPTY ledger rather than an error; responsibility traces to the FIRST "
  + "Leg declaring a term and to the BRIEF (null) when none does, a re-declaration moving nothing; the "
  + "render/parse round trip is asserted at both ends. §4.13.1: `excerpt` is retired with the rest of the eight-field "
  + "schema, `evidence` does NOT inherit the exemplar role (owner ruling 7, kogaki#1173) — it is optional, typically "
  + "empty and read by nothing downstream — and `moveExcerpt`/`isExemplar`/`renderExcerptBlock` are asserted GONE from "
  + "src/compose.mjs's exports, never merely unused. No record under moves/ carries `excerpt`, `sources`, `status` or "
  + "any other retired eight-field-schema key; the "
  + "library's own record count is DISCLOSED, never a stored expectation compared against; (n) THE REMOVAL TEST — A HOOK-DRIVEN BRIEF RUN REACHES A FILLED BRIEF "
  + "WITH NEITHER PROSE CARRIER IN THE TREE (kogaki#1108 acceptance 7 and 8). This case WAS the arc table: thirteen regexes over "
  + "`.claude/skills/brief/SKILL.md`, re-homed here from the retired brief-entry member at kogaki#770, asserting that the skill's "
  + "prose named every stage of the flow. The skill is one `!` line now and the arc is `src/brief-workflow.json`, so every row of "
  + "that table named a file that no longer carries the arc — kept it would fail for the reason the issue exists, and rewritten "
  + "against the table it would be a second transcription of the table, green whenever the table agreed with itself. What the table "
  + "was a proxy for is asserted here by RUNNING the flow: a scratch repository holding the runtime, the hooks, the Move library and "
  + "a one-line skill, with NO `specs/` at all; the judge stubbed at the BINARY through `KOGAKI_JUDGE_CLI` so the argv, the prompt "
  + "composition, the parse and every refusal are the shipped ones; and the owner's two answers driven through the REAL "
  + "`write-gate-capture.py` and `advance-brief.py` from synthesized PostToolUse payloads, so the advance hook's own narrowing is "
  + "exercised rather than bypassed. ONE payload carries the run from the thesis answer through the mint, path composition, path "
  + "review and assembly to the Candidate-selection gate, and a second carries it to a FILLED Brief — filled, not merely present, "
  + "since the 2026-08-18 specimen the arc table was written for produced a Brief whose every composition field was an unfilled slot. "
  + "The Brief's path is read from the run record's own `artifacts_written` rather than guessed, the terminal state is asserted "
  + "beside it, and all three judgment records are asserted present, because a filled Brief with a missing judgment record means "
  + "that state was satisfied by something other than a judged one. The absence of `specs/` and the one-line skill are ASSERTED and "
  + "not assumed: a tree that quietly regained either would make every assertion above pass for the wrong reason. "
  + "TWO ARMS WERE ADDED AT PR #1109 ROUND 1. Terrain's own `KOGAKI_RUN_DIR` is left STANDING in the span's environment, "
  + "pointed at a directory that is not this run's, where a `delete` had stood as the workaround: `cmdRun` read that "
  + "variable by name while `runDir` read `process.env[flow().runDirEnv]`, so a Brief advance under an inherited Terrain "
  + "pin minted a fresh workspace per advance and abandoned the open run \u2014 the mutation is caught here. And each `wait` "
  + "state's `renders_above_question` row is bound to the gate call the executor actually composed, in both directions: "
  + "a row naming a reading the declaration does not carry is red, and so is a call carrying one where the row declares "
  + "none \u2014 which is what makes the owner decision's \"screen prose is a table row\" a carrier rather than decoration, "
  + "and what keeps CANDIDATE_SELECTION's emptiness a RULING rather than the accident of a session with no prose channel; "
  + "(o) THE ROUND-TRIP CONCESSION refused when absent (kogaki#752) — RESTORED after kogaki#770 removed its "
  + "only carrier with the arc table alone: the composer emits a concession per Thesis candidate and the gate "
  + "registry requires each option to state one, so the rule was live and carried by nothing in between. "
  + "Carrier-less BY OMISSION is the defect. Its normative home is the design record, and this is the "
  + "mechanical half that document cannot be; "
  + "(p) THE BRIEF LANE'S SNAPSHOT DESTINATION (kogaki#750) — `snapshotBrief` lands under "
  + "`runs/brief/<slug>/snapshots/` in the working tree, DRIVEN rather than read off the "
  + "expression, because the destination is computed inside the function from the Brief path. "
  + "The case is here because every other case in this member drives a path the move did not "
  + "touch, so without it the member would be green about a lane still writing to the retired "
  + "home directory — the completeness half of a relocation, whose contamination half (nothing "
  + "under ~/.kogaki) is satisfied most cheaply by writing nowhere at all. It asserts the "
  + "sequence number comes back, since a paired after-call loses its before without one, and it "
  + "carries two controls: the destination resolves under the repository's runs/ directory, and "
  + "under no home directory. It creates and never PRUNES, so it cannot evict a live workspace; "
  + "the fixture entry is its own and is removed, as are the lane entries the minted Briefs "
  + "leave behind — nothing prunes those, since pruning is a lane's first act and this member "
  + "never takes it, so an uncleaned member would re-create the unbounded accumulation it "
  + "asserts is over. (h) JOURNEY COVERAGE (§6.1 MUST 1) — journey "
  + "material is a distinct material, its placement DERIVED from "
  + "the composed legs, placed rendering as placed and omitted rendering as OMITTED-disclosed "
  + "rather than refusing, a Journey claimed for a Strand whose record carries none refused BY "
  + "NAME as unsupported completion, a Journey outside the closed set refused as a Brief fetch, "
  + "and the no-Journey case vacuous rather than violated. THE COUNT MOVED FIELD AT kogaki#1131, "
  + "REVERSING kogaki#1111: it is taken from the Leg's `journeys` entries and no longer from a "
  + "`<L-id>.journey` token in `materials`. #1111 declared `journeys`, had `journeysRefusal` validate "
  + "it and `renderLeg` render it, and left the count on the token — two readers of one fact, which "
  + "disagreed on the first Brief written to `done`: four `journey:` lines rendered and all five Strands "
  + "disclosed as OMITTED in the same document, a FALSE disclosure handed to /draft as a settled input. "
  + "The fixtures place through `journeys` naming the Strand BARE, which is the shape that read as "
  + "omitted; the two readers of ONE document are asserted to agree; and the reversed half is asserted "
  + "by name — a `<L-id>.journey` token alone no longer places, while staying legal and still checked "
  + "against the closed set and the served record, since an untested reversal reads exactly like an "
  + "untested retention. (h2) THE COUNT IS PER-STRAND OVER A SET LARGER THAN ONE (kogaki#1131) — (h) "
  + "runs over a Brief with exactly ONE Journey-bearing Strand, where `N of N` and `1 of 1` are the same "
  + "string and a counter returning the size of its own key set would pass; the defect was `0 of 5`. A "
  + "second journey cite is inserted into the minted document and PROVED to have landed before anything "
  + "is asserted over it, then a Candidate placing both renders 2 of 2 with no OMITTED line and per-Strand "
  + "placed-by lines naming the right Legs, a Candidate placing neither renders 0 of 2 with both disclosed, "
  + "and the THIRD rendering — `journey_coverage` at the Candidate gate — agrees with both and DIFFERS "
  + "between the two, which is the differentiation property that figure exists to carry and which was flat "
  + "across every Candidate of the Brief this was filed on. NOT COVERED, stated rather than implied: whether "
  + "a declared `use` serves the Move is judgment (§4.6) and nothing here grades it; (i) per-Candidate journey_coverage, "
  + "RE-POINTED FROM THE PAYLOAD TO THE DERIVATION at kogaki#859 — the amended ruling removed the evidence "
  + "object this case used to read, and display and computation are different questions with only the first "
  + "ruled on, so the per-Candidate property is asserted where it is now COMPUTED while the assembly call is "
  + "kept beside it as the control that a journey-placing Candidate still reaches the gate at all. Two "
  + "Candidates differing on the journey axis do not read identically, and it carries no verdict token. THIS "
  + "CLAUSE PREVIOUSLY READ `rides the gate payload as EVIDENCE`: the (j) half of this same string literal "
  + "was rewritten at kogaki#859 and the (i) half was not, so the pass line kept asserting a retention the "
  + "head had removed (PR #863 round 2, carried finding 1); (r) THE PLAIN-LABEL TABLES STAY FIT TO USE (PR "
  + "#863 round 2, carried finding 2) — the carrier SPEC §6 CLAIMED AND DID NOT HAVE. EVIDENCE_LABELS covers "
  + "exactly REASONING_FIELDS plus the keys `candidateEvidence` actually derives, and REVIEW_LABELS exactly "
  + "REVIEW_AREAS — both directions, since a key with no label is an item a restoring ruling could not render "
  + "and a label with no key is the decayed table the retention argument rests on. Every label is non-blank "
  + "and free of internal vocabulary by the SHARED predicate (kogaki#526), never a re-derived regex. The key "
  + "sets are DERIVED from the live producers and never restated: a literal list here would be the "
  + "second-declaration drift this member has now met five times. Before this case REVIEW_LABELS was asserted "
  + "NOWHERE — its only reader was the (j) loop the reduction deleted, leaving an unused import as the sole "
  + "trace — and EVIDENCE_LABELS for four of its ten keys; (j) THE RENDERING IS BOUND TO THE "
  + "LABELS (kogaki#520, REDUCED at kogaki#859) — the `rendering` key is PRESENT and EMPTY, "
  + "the two asserted apart so a vanished key and a bounded one are distinguishable; the "
  + "option label, which is now the whole of what the owner reads, is non-empty and free of "
  + "internal keys; the option carries NO evidence object and no key beyond id, label and the "
  + "bounded rendering, per the amended ruling that a run record holds what a later act reads; "
  + "the composition-time reasoning is asserted where it is COMPOSED instead, at (e), (i) and "
  + "(l) against candidateEvidence, so removing the copy costs the derivation none of its "
  + "evidence; no owner-facing string in the payload holds an internal key or a section "
  + "reference; the deny tripwire refuses a LABEL carrying either shape, NAMING what leaked and "
  + "producing no payload — a deny, never a rewrite layer — while a Candidate whose REASONING "
  + "is full of internal keys passes, which is the assertion that catches the evidence "
  + "returning by a side door. The tripwire reads REGISTER, never a composition MUST (§4.6 "
  + "clause 3 stands). "
  + "MUTATION EVIDENCE (assert-by-breaking-once, stories 1.73 + 1.75 + 1.77 + kogaki#501 + kogaki#520 + kogaki#551 + kogaki#568 + kogaki#574 + kogaki#578 + kogaki#642 + kogaki#859 + PR #863 round 2 + kogaki#893 + kogaki#877 + kogaki#934 + kogaki#935 + kogaki#942 + kogaki#966 + PR #968 round 1 + kogaki#972 + kogaki#1121 + kogaki#1125 + PR #1127 round 1): SIXTY-FIVE "
  + "mutations. RE-DERIVED, not incremented — this paragraph's own standing rule, and the one it has twice failed: the enumeration below sums 3 + 3 + 6 + 4 + 3 + 2 = 21 for the "
  + "original groups, plus kogaki#568's four, plus PR #576 round 1's two, plus kogaki#574's two, plus kogaki#578's one, plus kogaki#642's one, plus kogaki#859's three, plus PR #863 round 2's three, plus kogaki#893's three, plus kogaki#934's three, plus kogaki#935's three, plus kogaki#942's five, plus kogaki#966's three, plus PR #968 round 1's one, plus kogaki#972's two, plus kogaki#1121's one, plus kogaki#1125's five, plus PR #1127 round 1's two = 65. "
  + "THE UNIT OF THE COUNT IS A TRIAL TAKEN, NEVER A DISTINCT PHYSICAL MUTATION (kogaki#889), and it is declared because leaving it implicit has now produced a finding: two heads may apply the SAME EDIT against DIFFERENT assertions, and that is two trials rather than one counted twice — kogaki#520 deleted the per-option `rendering` against (j)'s LABEL assertions and kogaki#859 deleted it against (j)'s KEY-PRESENT one, at two heads, and both runs happened. Read as physical mutations the enumeration double-counts; read as trials it does not, and the second reading is the one kogaki#568's own ground already commits this paragraph to — \u0022the tally counts both, because the historical evidence was real when it was taken\u0022. A SUPERSEDED ENTRY THEREFORE STAYS COUNTED, and what it owes is the past-tense marking below rather than removal, since a deleted mutation and a superseded one read identically to a later reader. Owner decision at the kogaki#889 gate, recorded rather than re-derived per sitting. "
  + "KOGAKI#1121'S ONE, against case (ac), and it is the PRE-REPAIR CODE RESTORED VERBATIM rather than an invented break — the thesis gate's provenance sentence reading `set.ids` and `set.survey`, the two fields kogaki#1116's rename removed. It fails (ac) THREE TIMES IN ONE RUN, once per address not named and once on the rendered `undefined`, which is the direct evidence that the both-directions binding is doing work: the sentence still read correctly from `set.via`, so a case asserting only that the provenance line exists, or only that it mentions the entry route, would have been green against the exact bytes the owner was shown on 2026-09-15. The trial is cheap to re-run and worth naming as such: the mutant is in the repository's history, not in this paragraph's imagination. "
  + "KOGAKI#972'S TWO, the first trials this paragraph has recorded against the COUNT ITSELF rather than against a case's assertions. Deleting `ranCase(\"z\")` while leaving case (z)'s body intact fails (floor) at 34 against a declared 35, naming cases LOST — and the same edit under the `const CASE_COUNT = 28` this replaces went GREEN, which is the whole of kogaki#972: a case removed from the file moved no number, because no number was reading the file. Changing `ranCase(\"l-bridge\")` to `ranCase(\"l-reader-fields\")`, so two cases share one registration id, fails (count) BY NAME on the duplicate and (floor) beside it at 34 — the pairing is the point, since a collapse reported only as a count one lower would send a reader looking for a deleted case that is still there. THE TRIALS ARE THE INSTRUMENT'S, NOT A CASE'S, and that is why they are counted here: what they break is the arithmetic every other case's deletion would be read through. "
  + "KOGAKI#942'S FIVE, all against case (y) again, and all five are about the DERIVATION rather than the comparator kogaki#935's three attacked — which is the split the issue found: the skill side was scoped at PR #941 round 1 and the spec side was not. "
  + "Returning the whole spec from the section reader, rather than a §4.1 heading-to-next-heading slice, is the load-bearing one: it fails (y) by NAMING §9's own bullets, which is the false red the finding predicted arriving as evidence rather than as argument — a §9 open-trigger bullet reported as a §4.1 optional Leg field. "
  + "Returning the empty string instead of null for an unfound §4.1 fails (y)'s refusal assertion, the direct evidence that an unlocatable section is refused rather than read as an empty field list — an empty list reports every field covered, which is the vacuity the whole case exists to refuse. "
  + "Forcing the optional-shaped predicate false fails (y)'s per-bullet presence assertion, and dropping the `optional` guard from the name collector fails the same one from the other side: the two predicates over a bullet are kept apart precisely so a bullet the derivation stopped matching can be named, and each mutation disarms one of them. "
  + "Rewording §4.1's live `opens_section` bullet so it stops matching fails (y) BY NAME against the real spec, which is kogaki#942's second finding exactly — under the retired length floor of 4 the derivation dropped from five names to four, cleared the floor, and reported the field covered in silence. "
  + "KOGAKI#966'S THREE, all against case (y) again, and all three are about the THIRD SIGNAL rather than about the two tells kogaki#942 settled — the split the issue found: `looksOptional` admitted on EITHER tell, so a REQUIRED §4.1 bullet gaining a §4.NN cross-reference was named as one the derivation stopped matching, a false statement about that bullet and structurally the §9 false red kogaki#942 removed. "
  + "Dropping the `**Required.**` guard — the pre-#966 predicate restored verbatim — fails (y)'s required-with-a-pointer assertion and nothing else, which is the direct evidence that the new assertion binds the marker and not some incidental property of the fixture. "
  + "Requiring BOTH tells instead of reading the marker — the alternative kogaki#942 declined and this repair does not re-open — fails (y) TWICE, at the lost-`optional` assertion written here AND at kogaki#942's own yields-no-field one, which is the direct evidence that the narrowing did not buy the false negative back: the two assertions are the two halves of that trade and a repair passing only one of them would be the drop under a new name. "
  + "Guarding the NAME COLLECTOR with the same marker, rather than the optional-shaped predicate alone, fails (y)'s both-tells-and-required assertion — the direct evidence for the one-sided guard, since a live optional bullet that gained `**Required.**` would otherwise leave the coverage list AND go unnamed, which is a fresh silent drop minted by the repair for the drop. "
  + "PR #968 ROUND 1'S ONE, against case (y) once more and against kogaki#966's own repair rather than the predicate it repaired — which is the finding: the marker guard matched `**Required.**` ANYWHERE on the line, so a CONDITIONALLY-required optional bullet (`- **`figure_roles`** — optional; §4.16. **Required.** when `figure` is declared.`) was exempted outright, and that bullet losing `optional` would go unnamed. The kogaki#942 finding-2 drop, one shape in, minted by the narrowing that was built around it. "
  + "Unanchoring the marker — the round-1 form restored verbatim — fails (y)'s conditional-marker assertion and nothing else, which is the direct evidence that the end-of-line anchor is what separates an unconditional marker from a condition's antecedent, and not an incidental property of the fixture. NO SUCH BULLET IS LIVE in §4.1 today, so this is asserted against a synthetic shape rather than demonstrated by the real spec, stated rather than implied. "
  + "Control: unmutated, the member exits 0. AND A SECOND, MUTATED CONTROL, counted as a control rather than as a trial because its passing condition is silence: RETIRING §4.1's `bridges` bullet outright produces zero findings, which is the direct evidence that the presence assertion did not buy the false red a floor at the derived count would have — a bullet that disappears is a spec edit and may move the count, a bullet that silently stops matching may not. "
  + "KOGAKI#935'S THREE, all against case (y), and all three are about the case being ABLE TO FAIL rather than about the repair — which is the point: the defect (y) names is a check that stayed green while a field went unauthored, so a vacuous (y) would reproduce it one layer up. "
  + "Restoring the pre-#935 authoring skill is the load-bearing one: it fails (y) four times over, once each for `bridges`, `opens_section`, `figure` and `figure_roles` (`bridges` joined at PR #941 round 1, when the comparator was scoped to leg 7 and the field's only mention was the revise-pass prose below it), which is the direct evidence that the case reads the real carrier and not a fixture. "
  + "Neutering the comparator to report every field covered fails (y)'s synthetic-absent assertion and nothing else — the direct evidence that the negative direction runs through the SAME comparator the positive one does, since a restated negative would have passed this. "
  + "Sweeping every backticked §4.1 bullet into the list, rather than only the bullets carrying `optional` and a subsection pointer, fails (y)'s required-field assertion AND six of its coverage assertions, which shows the derivation reads the bullet's FORM and is not a grep for backticks. "
  + "Control: unmutated, the member exits 0, so the refusals discriminate rather than refusing everything. "
  + "KOGAKI#934'S THREE, all against case (w2) and all at the head that has the repair — which is stated because the pre-#934 head is not a control here: at that head the mutation IS the defect, so a run there fails (w2) for the reason the issue was filed rather than for the reason a mutation is taken. "
  + "Dropping the override set at the call site (`denyInternalVocabulary(payload)`) is the load-bearing one: it restores the pre-#934 behaviour exactly and fails (w2)'s first direction — the mandated caller is refused again, and the assertion catches it at the OPTION SET rather than at the label, because the refusal took every option and not one rendering. "
  + "Widening the override past the option label — one flattened Set consulted for every surface — fails TWO of (w2)'s assertions at once, the per-option scoping and the per-surface one, which is the direct evidence that the two scopings are asserted apart rather than by one test standing in for both. "
  + "Blanking the option label before the walk fails (w2)'s second direction, the genuine term of art in the same label, which is the assertion that separates narrowing the wire from disarming it (acceptance item 3). "
  + "Control: unmutated, the member exits 0, so the three refusals discriminate rather than refusing everything. "
  + "KOGAKI#893'S THREE, all against §4.12.3's owner ratification gate — the first is the load-bearing one because it restores the PRE-#893 HEAD exactly: "
  + "deleting the act-level ratification requirement from adoptCandidate leaves `validateRatification` to refuse an undefined capture on its SHAPE (`rows is an array`), "
  + "which is a refusal for the wrong reason — it reports a malformed capture where no gate was raised, and it would keep passing a mutation that deleted the mandatory occasion outright. "
  + "It fails FOUR of (s)'s assertions: the refusal no longer says the record PASSES, no longer names the gate, no longer names the input, and no longer carries the digest the executor composes the gate from. "
  + "This is the same discrimination (k) already makes for the RECORD's absence, applied one layer out to the gate's, and it is why the absence is refused at the act rather than inside the validator. "
  + "Dropping the digest comparison from the binding fails (s)'s edited-after-ratification assertion and nothing else — the direct evidence that the two binding axes are asserted apart, "
  + "since the Candidate axis cannot see a record rewritten under the same Candidate. And treating any answer as affirmative fails (s)'s declined-ratification assertion AND both of (g)'s decline assertions "
  + "at the command path, which is the direct evidence that the owner's no is binding at the exported function and through the executor rather than at one of them. "
  + "Control: unmutated, the member exits 0 at 19 cases, so the three refusals discriminate rather than refusing everything. "
  + "PR #863 ROUND 2's THREE, all against case (r) — the carrier SPEC §6 claimed and did not have. Deleting a "
  + "REVIEW_AREAS member's entry from REVIEW_LABELS fails (r)'s has-no-plain-label assertion, and it is the "
  + "load-bearing one: that table was asserted NOWHERE before this case, so this mutation could not have failed "
  + "this member at the previous head however it was applied. Decaying a label back into its own internal key "
  + "fails (r)'s leak assertion through the shared predicate. Adding a label for a key neither REASONING_FIELDS "
  + "nor candidateEvidence produces fails (r)'s no-label-without-a-key assertion — the direction that catches a "
  + "table drifting away from what it would render, which mere presence-checking cannot see. Control: unmutated, "
  + "the member exits 0 at 19 cases, so the three refusals discriminate rather than refusing everything. "
  + "kogaki#859's three, all against the reduction of the gate to its id and its label — and the first is an "
  + "INVERSION, recorded as such because an inverted assertion and a deleted one read identically at a later "
  + "head: restoring the sixteen evidence-and-review paragraphs — the shape this member REQUIRED one commit "
  + "ago — fails (j)'s emptiness assertion naming the count it found. Deleting the "
  + "`rendering` key outright fails (j)'s key-present assertion rather than passing its emptiness one, which "
  + "is the direct evidence that present-and-empty is asserted apart from absent. And restoring the `evidence` "
  + "object to the option fails (e)'s no-extra-key assertion AND (j)'s no-evidence one, which is the direct "
  + "evidence that the amendment's half is guarded at two sites and not only where the first half landed. "
  + "THE SECOND AND THIRD OF THESE ARE DOUBLE INVERSIONS WITHIN ONE HEAD, and saying so is the point: this "
  + "member first REQUIRED the evidence object, then — under the first half of the ruling — asserted its "
  + "RETENTION in three new places, then under the amendment asserts its ABSENCE. A reader who cannot see "
  + "that the direction changed twice cannot tell a considered inversion from a mistake, and the second "
  + "change was made only because a review round read the issue's comments and this head had not. "
  + "kogaki#642's one, against the requirement that a Move is a Leg's State component: restoring the optional test in "
  + "validateLegs — the v17 shape, `move` checked only when present — fails (a)'s a-leg-without-a-Move assertion. The "
  + "assertion it fails is the INVERSION of the one that stood here, not a new sibling beside it: v17's (a) asserted that a "
  + "Move-less Leg is ACCEPTED, so leaving it would have contradicted the amendment and deleting it would have left the "
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
  + "kogaki#568's four, all against the selection question's shape: restoring the shared effect prefix on every "
  + "option label fails (e)'s no-repetition assertion AND its opens-with-the-record-id assertion; dropping the "
  + "effect from the payload label too fails (e)'s states-ONCE assertion, which is the half that stops "
  + "\u0022no repetition\u0022 being satisfied by stating it nowhere; slicing one evidence item out of the "
  + "rendering failed (j)'s count assertion, taken against EVIDENCE_LABELS and REVIEW_AREAS rather than a literal; and "
  + "making the leak predicate skip the paragraphs \u2014 the shape the reshaping introduced \u2014 failed BOTH of "
  + "(j)'s tripwire cases, the direct evidence that a leak cannot escape by moving into a surface the predicate "
  + "stopped walking. THE LAST TWO ARE SUPERSEDED BY kogaki#859 AND KEPT IN THE PAST TENSE RATHER THAN REWRITTEN: "
  + "the count assertion they broke no longer exists, and the tripwire no longer walks paragraphs because there are "
  + "none, so neither mutation would fail this member at today's head. They are NOT re-described against today's "
  + "assertions \u2014 that would claim a run at kogaki#568 that never happened, and a mutation record whose entries "
  + "are edited to stay green is exactly the artifact bound by belief this discipline exists to refuse. Their "
  + "successors are enumerated under kogaki#859 above, and the tally counts both, because the historical evidence "
  + "was real when it was taken. TWO MORE FROM PR #576 ROUND 1, which found a re-pointing this head MISSED: the "
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
  + "kogaki#859 RE-POINTS THAT RE-POINTING, and one of its moves is a NARROWING stated rather than hidden. "
  + "(j)'s two tripwire cases injected their leak into `reasoning.thesis_closure` and `reasoning.leg_validity`, "
  + "which reached the owner only by way of the rendering; with the rendering empty that injection reaches no "
  + "owner surface, so both cases would have gone RED against correct code. The property is live and the PROXY "
  + "died, so the leak is now injected into the option label, which is the owner surface that remains \u2014 and "
  + "a third case asserts the same leak in the RECORD passes, which is the belt the first two no longer supply. "
  + "The NARROWING is at (l): its three reader-field assertions carried two properties, present-per-Candidate and "
  + "carrying-the-record-rather-than-restating-it, and the second had the rendering as its subject. It is DROPPED, "
  + "not re-pointed, because there is no second copy left to diverge from the record \u2014 recorded because a "
  + "dropped assertion and a re-pointed one read identically at a later head, which is this paragraph's own rule "
  + "turned on the head that wrote it. What replaced it is an assertion that the plain-label table stays fit to "
  + "RENDER, since kogaki#859's ruling restores one item at a time from exactly that table. "
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
  + "requirement from validateLegs failed (a)'s field refusal; counting placements from the "
  + "DECLARED coverage instead of the legs failed (c)'s 1-of-2 assertion; dropping the "
  + "UNPLACED disclosure branch failed (c)'s disclosure assertion. Story 1.75's three: "
  + "dropping the 2-3 count guard failed (e)'s single-Candidate refusal; dropping the "
  + "negation option failed (e)'s negates_premise assertion; skipping the thesis_closure "
  + "fill at adoption failed (f). kogaki#501's four: dropping the OMITTED-disclosed branch "
  + "failed (h)'s disclosure assertion; matching a BARE L-id instead of the declared Journey — "
  + "the declined \"placing the Strand places its Journey\" option — failed (h)'s 0-of-1 "
  + "assertion, which is the direct evidence that option would have made MUST 1 "
  + "unfalsifiable; dropping the carries-none refusal failed (h)'s unsupported-completion "
  + "case; and computing journey coverage from something other than THIS Candidate's legs "
  + "failed (i). THE FIRST OF THOSE FOUR WAS RE-RUN AT kogaki#1131 against the moved counter, "
  + "because its wording named the field the count no longer reads and a mutation record that "
  + "describes retired code is not evidence about the head: counting a bare `materials` L-id "
  + "fails (c)'s 0-of-1 precondition, (h)'s token assertion and disclosure, and (h2)'s 0-of-2; "
  + "and REVERTING the counter to the `<L-id>.journey` token — the state kogaki#1111 left, and "
  + "the one this Issue reverses — fails (h)'s one-Brief contradiction assertion by name. "
  + "kogaki#1131's two mutations are those, and they are recorded here rather than as a fifth "
  + "bullet above because they re-run #501's own. kogaki#520's three: dropping the per-option `rendering` "
  + "failed (j)'s label assertions; neutering the deny to return clean failed (j)'s two "
  + "tripwire cases; and rendering each item under its KEY instead of its plain label was "
  + "refused BY THE TRIPWIRE ITSELF, failing (e) — the direct evidence that the generator fix "
  + "and the tripwire are two guards and not one. "
  + "THE FIRST AND THIRD OF THESE ARE SUPERSEDED BY kogaki#859 AND CANNOT BE RE-RUN AT THIS HEAD, KEPT IN THE PAST TENSE RATHER THAN REWRITTEN OR DELETED (kogaki#889). The first's assertions are gone: (j)'s LABEL assertions no longer exist, so deleting the `rendering` key at today's head fails (j)'s KEY-PRESENT assertion instead — the SAME EDIT, a DIFFERENT trial, enumerated as kogaki#859's second and counted there as well as here under the trial unit declared above. The third's SITE is gone: the per-item rendering it mutated is what kogaki#859's reduction deleted, and restoring it is now itself enumerated as kogaki#859's FIRST mutation. They are NOT re-described against today's assertions — that would claim a run at kogaki#520 that never happened, which is the artifact bound by belief this discipline refuses — and they are NOT deleted, because a deleted mutation and a superseded one read identically to a later reader. "
  + "Story 1.77's six, each against \u00a75.1 v12's reader fields: composing the three ONCE "
  + "for the whole set \u2014 the DECLINED fill-pass site \u2014 failed (l)'s identical-reading "
  + "assertion on every field, which is the direct evidence that the fill pass would have "
  + "made the reader axis unselectable; dropping the three from the gate payload failed "
  + "(l)'s carries-no-field assertion — SUPERSEDED BY kogaki#859 AND KEPT IN THE PAST TENSE RATHER THAN REWRITTEN (kogaki#889), because the gate payload it names no longer carries the three: the live site is `candidateEvidence`'s reader spread, so this edit would not fail this member at today's head. Not re-described against that site, which would claim a run at story 1.77 that never happened; not deleted, because a forgotten mutation and a superseded one read identically. Its trial was real when it was taken and it stays counted; skipping the adoption fill failed (l)'s "
  + "did-not-fill AND still-a-slot assertions; neutering the refusal to return clean "
  + "failed (l)'s ACCEPTED assertion; refusing without naming the field failed (l)'s "
  + "by-name assertion, which is what keeps a caller from being sent to re-answer a gate "
  + "that is not the problem; and treating an empty string as authored failed (l)'s "
  + "empty-value assertion. "
  + "kogaki#1125's FIVE, against the Move material in the two judge asks and the two refusals it makes "
  + "reachable. ENUMERATED AS OBSERVED, and two of the five did NOT land on the case they were written for, "
  + "which is recorded rather than tidied: deleting `moves_you_may_bind` from the compose ask failed (n), (ad), "
  + "(ae) and the case-floor arm and NOT (af) — the stub refuses an ask it cannot compose from, so the span dies "
  + "before (af) runs and the case never registers — so a second, narrower mutation was run for (af) alone, "
  + "sending a TRUNCATED library that is well-shaped and non-empty, which passed the stub and failed (ab)'s "
  + "set-equality assertion by itself; that pair is why (af) binds the SET against `loadMoveIds`' own reading "
  + "rather than asserting the field is present. Deleting `move_contracts` from the specialization ask failed "
  + "(ag) alone. Removing the `resolveMoveIds` call from `compose_path`'s validator failed all four of (ad)'s "
  + "assertions including the reached-the-Candidate-gate one — the pre-kogaki#1125 shape, reproduced, and the "
  + "direct evidence that asserting `resolveMoveIds` as a FUNCTION would not have caught it. Routing "
  + "`cannot-determine` through `refuseJudgment` instead of `refuseTerminally` failed (ae)'s ONE-ASK assertion "
  + "at three asks and LEFT ITS STOPS-THE-RUN ASSERTIONS GREEN, which is the direct evidence that \"the run "
  + "stopped\" is not the property and that a case asserting only the stop would have passed on the defect. "
  + "PR #1127 round 1's TWO, against the two arms that round's findings added. Reporting an inline empty scalar "
  + "as PRESENT — the pre-#1127 shape, where `requires: \"\"` yielded a blank contract while an empty BLOCK "
  + "read as absent — failed (ah)'s inline branch by name, with its block branch and its filled control green "
  + "beside it, so the case binds the asymmetry rather than the reader. And transcribing (ad)'s derived ask "
  + "count back to a literal `3` while the table declared `retries: 1` failed (ad) at a head where the runtime "
  + "was CORRECT — the false red finding 3 named, reproduced; the derived form under the same table edit passes, "
  + "which is the control that makes the pair evidence rather than one observation. "
  + "NOT COVERED, stated rather than implied: every composition "
  + "MUST is judgment-class (§4.6) — grounds-test soundness, entailment quality, "
  + "Move-binding order, and whether the surfaced evidence is ADEQUATE evidence — judged at "
  + "path review (story 1.74) and the human gate, never here; this member exercises record "
  + "shape, fill and gate-payload plumbing only, and the selection gate itself is raised by "
  + "the sitting through AskUserQuestion, a relay property no check can run.");
JS
