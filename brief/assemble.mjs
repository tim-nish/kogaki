#!/usr/bin/env node
// assemble — Candidate assembly and the Candidate-selection gate's payload,
// on the existing rails (SPEC-draft-pipeline §6; kogaki#491, story 1.75).
//
// Machine-side block 3 plus the closing human gate (§4.3's blocks 3 and 5).
// §6 RULES THE CARRIERS: Candidates ride the specs/spec-proposal-contract
// record shape (Where/Why, effect-stating label, machine options plus an
// UNCONDITIONAL free-text channel, the premise's negation first-class) and
// the specs/spec-gate-carrier selector affordance — REGISTERING NO NEW GATE
// AND NO NEW CHECK. The payload this file emits is machine-local run state
// (never a tree *.proposal.json — an owner-facing record class this spec
// deliberately does not add); the skill raises it through AskUserQuestion.
//
// Two commands:
//   assemble — takes the REVIEWED Candidates (brief/review.mjs attach
//     output: each Candidate already carrying its per-Candidate reasoning,
//     which is what makes an unreviewed Candidate unpresentable) plus the
//     Brief, requires 2-3 Candidates DIFFERING IN READER EXPERIENCE, and
//     emits the selection payload: each option carrying as its gate
//     EVIDENCE the composition-time reasoning — step validity, transition
//     continuity, Thesis closure, the obligations ledger's state, and the
//     Strand placement count. Reasoning surfaced for the owner, never an
//     automated verdict (§6).
//   adopt-candidate — the owner's recorded answer: the adopted Candidate's
//     Reader Path lands in the Brief's sequence (through the same §4.1
//     fill the composition runtime owns), and thesis_closure and tradeoffs
//     fill from its reasoning (§5.1).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fillBrief, replaceSlot, selectedStrands, placements } from "./compose.mjs";
import { REVIEW_AREAS } from "./review.mjs";

function fail(msg) {
  process.stderr.write(`assemble: ${msg}\n`);
  process.exit(1);
}

// The composition-time reasoning each Candidate owes the gate, beside the
// review areas the attach already guaranteed. The three levels are §4.6's
// — observed, never scored — and the composer records them per Candidate.
const REASONING_FIELDS = ["step_validity", "transition_continuity", "thesis_closure"];

// The obligations ledger's state and the placement count are PER-CANDIDATE
// composition-time values: at assembly the Brief is pre-adoption (its
// sequence and ledger are still typed unfilled slots — only the adopted
// Candidate's path ever lands, §5.1), so each Candidate's evidence is
// computed MECHANICALLY from its own steps and obligations against the
// Brief's closed Strand set. The count is taken after that Candidate's
// composition, counted in placements (§5.2's rider, applied per Candidate).
export function candidateEvidence(c, strandIds) {
  const place = placements(c.steps, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  const obligations = c.obligations || [];
  const undischarged = obligations.filter((o) => o.discharged_by === undefined).length;
  return {
    obligations_ledger: obligations.length === 0
      ? "the ledger is empty — a statement, not an omission"
      : `${obligations.length} entr${obligations.length === 1 ? "y" : "ies"}, ${undischarged} UNDISCHARGED (disclosed, never refused — §5.2)`,
    placement_count: `${placed.length} of ${strandIds.length} selected Strand(s) placed, counted in placements after this Candidate's composition${placed.length < strandIds.length ? " — the unplaced disclose at adoption" : ""}`,
  };
}

// Pure; exported for the check. Returns { error } or { payload }.
export function assembleSelection(reviewed, doc) {
  const cands = reviewed?.candidates;
  if (!Array.isArray(cands)) return { error: "input is the attach output: { candidates: [...] } (brief/review.mjs)" };
  // 2-3 CANDIDATES PER ARTICLE (§6): the count is the contract, refused
  // naming what arrived — one Candidate is a default in disguise, four is
  // the selector affordance overrun.
  if (cands.length < 2 || cands.length > 3) {
    return { error: `${cands.length} Candidate(s) — §6 presents two to three per article, differing in reader experience; a single Candidate is a default in disguise and four overruns the selector` };
  }
  const seenExp = new Map();
  for (const c of cands) {
    if (typeof c.candidate_id !== "string" || c.candidate_id === "") return { error: "every Candidate carries a candidate_id" };
    if (typeof c.reader_experience !== "string" || c.reader_experience === "") {
      return { error: `candidate ${c.candidate_id}: reader_experience is required — Candidates DIFFER IN READER EXPERIENCE (§6), and the difference must be stated to be selectable` };
    }
    if (seenExp.has(c.reader_experience)) {
      return { error: `candidates ${seenExp.get(c.reader_experience)} and ${c.candidate_id} state the SAME reader experience — Candidates differ in reader experience (§6), or they are one Candidate presented twice` };
    }
    seenExp.set(c.reader_experience, c.candidate_id);
    if (!Array.isArray(c.steps) || c.steps.length === 0) return { error: `candidate ${c.candidate_id}: no steps — a Candidate is an ordered sequence of Steps (§4.3)` };
    // The attach guaranteed the review areas; assembly re-checks presence
    // because an unreviewed Candidate is unpresentable at this gate.
    for (const a of REVIEW_AREAS) {
      if (typeof c.review?.[a] !== "string" || c.review[a] === "") {
        return { error: `candidate ${c.candidate_id}: review area ${JSON.stringify(a)} absent — an unreviewed Candidate cannot be presented (§4.6; run brief/review.mjs attach first)` };
      }
    }
    for (const f of REASONING_FIELDS) {
      if (typeof c.reasoning?.[f] !== "string" || c.reasoning[f] === "") {
        return { error: `candidate ${c.candidate_id}: composition-time reasoning ${JSON.stringify(f)} absent — each Candidate carries step validity, transition continuity and Thesis closure as its gate evidence (§6)` };
      }
    }
  }
  const strandIds = selectedStrands(doc);
  if (strandIds.length === 0) {
    return { error: "the Brief carries no Strands section — not a minted Brief (assembly runs over the Brief whose closed set the Candidates composed from)" };
  }
  const options = cands.map((c) => { const ev = candidateEvidence(c, strandIds); return ({
    id: c.candidate_id,
    // THE LABEL STATES AN EFFECT (proposal-contract §2.2): what happens if
    // this option is taken, in the reader-experience terms the Candidates
    // differ by.
    label: `Adopt ${c.candidate_id} — its Reader Path becomes the Brief's sequence; the reader's experience: ${c.reader_experience}`,
    // THE EVIDENCE AT THE GATE (§6): composition-time reasoning, surfaced
    // for the owner — never an automated verdict.
    evidence: {
      step_validity: c.reasoning.step_validity,
      transition_continuity: c.reasoning.transition_continuity,
      thesis_closure: c.reasoning.thesis_closure,
      obligations_ledger: ev.obligations_ledger,
      placement_count: ev.placement_count,
      review: c.review,
    },
  }); });
  options.push({
    id: "none-of-these",
    // THE PREMISE'S NEGATION IS FIRST-CLASS (§6; proposal-contract §2.1):
    // the composing premise is that the Thesis and the selected set support
    // a structure; its negation is its own option, and the free-text
    // channel does not discharge it.
    label: "None of these — the Thesis or the selected set is what should change; no Reader Path lands in the Brief",
    negates_premise: true,
  });
  return { payload: {
    id: "brief-candidate-selection-payload",
    kind: "proposal",
    where: "the Brief's sequence — which composed Reader Path the article follows",
    why: "the machine's premise, rendered: the adopted Thesis and the settled Strand set support a composed structure — the Candidates below differ in reader experience and each carries its composition-time reasoning as evidence (§6)",
    label: "Adopting a Candidate writes its Reader Path into the Brief's sequence and fills thesis_closure and tradeoffs from its reasoning",
    options,
    free_text: { accepted: true, prompt: "Or say in your own words what should happen instead — a free-text answer is recorded as your ruling, and it does not discharge the none-of-these option." },
  } };
}

// The adopted Candidate's Reader Path lands in the Brief (§5.1): sequence
// through the §4.1 fill, thesis_closure and tradeoffs from its reasoning.
export function adoptCandidate(doc, reviewed, candidateId) {
  const cands = reviewed?.candidates || [];
  const c = cands.find((x) => x.candidate_id === candidateId);
  if (!c) {
    return { error: `candidate ${JSON.stringify(candidateId)} is not in the reviewed set `
      + `(${cands.map((x) => x.candidate_id).join(", ") || "empty"}) — the owner adopts from what the gate offered` };
  }
  const filled = fillBrief(doc, {
    steps: c.steps,
    coverage: c.coverage || {},
    obligations: c.obligations || [],
    unused: c.unused || {},
  });
  if (filled.error) return filled;
  let out = filled.doc;
  const established = c.steps.map((s) => s.step_id).join(", ");
  let r = replaceSlot(out, "Thesis closure",
    `${c.reasoning.thesis_closure}\n\n*established_by_steps: ${established}*`);
  if (r.error) return r;
  out = r.doc;
  r = replaceSlot(out, "Tradeoffs",
    typeof c.tradeoffs === "string" && c.tradeoffs !== ""
      ? c.tradeoffs
      : `adopted over its siblings on reader experience: ${c.reader_experience}. The declined Candidates' experiences are recorded in the run's gate payload.`);
  if (r.error) return r;
  return { doc: r.doc, placed: filled.placed, total: filled.total };
}

function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

function cmdAssemble(args) {
  const reviewed = JSON.parse(readFileSync(argString(args, "reviewed",
    "assemble needs --reviewed <json> — brief/review.mjs attach's output"), "utf8"));
  const doc = readFileSync(argString(args, "brief",
    "assemble needs --brief <briefs/<slug>/brief.md> — the composed Brief whose ledger state and placement count are part of the evidence"), "utf8");
  const out = argString(args, "out",
    "assemble needs --out <path> — the machine-local file the selection payload rides in (never a tree *.proposal.json — §6 registers no new record class)");
  const r = assembleSelection(reviewed, doc);
  if (r.error) fail(r.error);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify(r.payload, null, 2) + "\n");
  console.log(`selection payload: ${r.payload.options.length - 1} Candidate(s) plus the first-class negation, each Candidate carrying its composition-time reasoning as evidence — surfaced for the owner, never a verdict (§6). Written: ${out}`);
}

function cmdAdopt(args) {
  const briefPath = argString(args, "brief", "adopt-candidate needs --brief <briefs/<slug>/brief.md>");
  const reviewed = JSON.parse(readFileSync(argString(args, "reviewed",
    "adopt-candidate needs --reviewed <json> — the reviewed Candidates the gate offered"), "utf8"));
  const id = argString(args, "candidate",
    "adopt-candidate needs --candidate <id> — the owner's recorded answer at the selection gate. "
    + "With no owner answer nothing lands in the Brief.");
  const doc = readFileSync(briefPath, "utf8");
  const r = adoptCandidate(doc, reviewed, id);
  if (r.error) fail(r.error);
  writeFileSync(briefPath, r.doc);
  console.log(`adopted ${id} — its Reader Path is the Brief's sequence; thesis_closure and tradeoffs filled from its reasoning; Strand placement ${r.placed} of ${r.total}. READ THIS ONE (owner document): ${briefPath}`);
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "assemble": cmdAssemble(args); break;
    case "adopt-candidate": cmdAdopt(args); break;
    default: fail("usage: assemble.mjs assemble --reviewed <json> --brief <path> --out <path> | adopt-candidate --brief <path> --reviewed <json> --candidate <id>");
  }
}
