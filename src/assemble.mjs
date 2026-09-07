#!/usr/bin/env node
// assemble — Candidate assembly and the Candidate-selection gate's payload,
// on the existing rails (SPEC-draft-pipeline, the Candidate gate; kogaki#491, story 1.75).
//
// Machine-side block 3 plus the closing human gate (the Reader Path artifact and its five blocks's blocks 3 and 5).
// the Candidate gate RULES THE CARRIERS: Candidates ride the specs/spec-proposal-contract
// record shape (Where/Why, effect-stating label, machine options plus an
// UNCONDITIONAL free-text channel, the premise's negation first-class) and
// the specs/spec-gate-carrier selector affordance — REGISTERING NO NEW GATE
// AND NO NEW CHECK. The payload this file emits is machine-local run state
// (never a tree *.proposal.json — an owner-facing record class this spec
// deliberately does not add); the skill raises it through AskUserQuestion.
//
// Two commands:
//   assemble — takes the REVIEWED Candidates (src/review.mjs attach
//     output: each Candidate already carrying its per-Candidate reasoning,
//     which is what makes an unreviewed Candidate unpresentable) plus the
//     Brief, requires 2-3 Candidates DIFFERING IN READER EXPERIENCE, and
//     emits the selection payload: each option carrying as its gate
//     EVIDENCE the composition-time reasoning — step validity, transition
//     continuity, Thesis closure, the obligations ledger's state, and the
//     Strand placement count. Reasoning composed and RECORDED for the run,
//     never an automated verdict (the Candidate gate). THE OWNER-FACING HALF OF THAT PAYLOAD
//     IS ITS `rendering`, and since kogaki#859 that rendering is EMPTY: the
//     owner reads the reader-experience labels and nothing else, the internal
//     keys stay in `evidence` as the record and are shown to nobody — with a
//     deny tripwire still refusing any rendering that carries spec-internal
//     vocabulary, because the rendering being empty today is a fact about
//     today's producer and not a property of the shape.
//   adopt-candidate — the owner's recorded answer: the adopted Candidate's
//     Reader Path lands in the Brief's sequence (through the same the Step's shape
//     fill the composition runtime owns), and thesis_closure and tradeoffs
//     fill from its reasoning (the settled structure section).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the read-not-invented rule
//       SPEC-draft-pipeline
//   the Step's shape
//       SPEC-draft-pipeline
//   the Bridge Step and the revise pass
//       SPEC-draft-pipeline
//   the Step-Move instantiation contract
//       SPEC-draft-pipeline
//   the owner gate over a passing specialization record
//       SPEC-draft-pipeline
//   the figure decision
//       SPEC-draft-pipeline
//   the Reader Path artifact and its five blocks
//       SPEC-draft-pipeline
//   the grounding rule
//       SPEC-draft-pipeline
//   the judgment rule
//       SPEC-draft-pipeline
//   the settled structure section
//       SPEC-draft-pipeline
//   the prose-at-the-surface rule
//       SPEC-draft-pipeline
//   the obligations ledger
//       SPEC-draft-pipeline
//   the durable home and the entry point
//       SPEC-draft-pipeline
//   the Candidate gate
//       SPEC-draft-pipeline
//   journey register as a Candidate axis
//       SPEC-draft-pipeline
//   the Move library
//       SPEC-draft-pipeline
//
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { fillBrief, replaceSlot, selectedStrands, placements,
  resolveMoveIds, validateSpecialization, specializationDigest, validateRatification, specializationSchema, gateSchema, gateRegistry,
  resolveFigureForms, figureClause, figureSteps,
  ownerGateDigest, validateOwnerAnswer,
         journeyBearingStrands, journeyPlacements, snapshotBrief } from "./compose.mjs";
import { REVIEW_AREAS } from "./review.mjs";
import { disclosureFieldsPresent, disclosureSurface, validateDisclosureTable } from "./disclosure.mjs";
import { laneDir } from "./runs.mjs";

function fail(msg) {
  process.stderr.write(`assemble: ${msg}\n`);
  process.exit(1);
}

// The composition-time reasoning each Candidate owes the gate, beside the
// review areas the attach already guaranteed. The three levels are the judgment rule's
// — observed, never scored — and the composer records them per Candidate.
// EXPORTED (kogaki#859) so the guard SPEC the Candidate gate claims can derive this table's
// key set rather than restate it: EVIDENCE_LABELS covers exactly these three
// plus whatever `candidateEvidence` derives, and a literal copy in the check
// would be a second declaration that drifts the first time either moves.
export const REASONING_FIELDS = ["step_validity", "transition_continuity", "thesis_closure"];

// THE OWNER READS THE GATE, NOT THE SPEC (kogaki#520). Every evidence item
// keeps its internal key in the payload — that is the record, and the record
// is machine-local — and renders under exactly ONE plain-register label. The
// key name has no rendering path at all: `rendering` below is the whole
// owner-facing surface, and it carries labels and prose, never key names.
// One label per key, in the order the owner reads them.
// The three the settled structure section fields whose authoring block is PATH COMPOSITION (v12,
// kogaki#521). Each pairs its record key with the Brief slot heading it
// lands in; src/brief.mjs's FIELDS table owns those headings, and this is
// the join to them. ONE declaration: the evidence, the rendering, the
// adoption fill and the adoption refusal all read this list, so a fourth
// reader field is added here and nowhere else.
export const READER_FIELDS = [
  ["reader_start", "Reader start"],
  ["reader_target", "Reader target"],
  ["opening_question", "Opening question"],
];

// THESE TWO TABLES OUTLIVE BOTH THE RENDERING AND THE RECORD THAT USED THEM,
// and that is a decision rather than an oversight (kogaki#859). Their sole
// rendering path closed when `rendering` went empty, which makes them look like
// dead code —
// but the ruling that closed it is explicitly reversible one item at a time:
// "if a later run shows one evidence item is needed to decide, that item is
// added by its own ruling, never the list restored". These tables are what
// such a ruling re-points at, and they still name the questions the evidence
// answers, which is what a reader of the record needs. Retiring them would
// make the cheap reversal an expensive one, to save nothing an execution pays
// for. What is NOT retained is any claim that they reach the owner.
export const EVIDENCE_LABELS = [
  ["reader_start", "Where does this path assume the reader is standing?"],
  ["reader_target", "Where does this path leave the reader?"],
  ["opening_question", "What question does this path open with?"],
  ["step_validity", "Does each step stand on the material it cites?"],
  ["transition_continuity", "Does each step leave the reader where the next one starts?"],
  ["thesis_closure", "Does the path close the claim?"],
  ["obligations_ledger", "What does this path still owe the reader?"],
  ["placement_count", "How much of the settled material does this path use?"],
  ["journey_coverage", "How much of the selected Journey material does this path use?"],
  ["bridges", "Which gaps did this path bridge, and on what reasoning?"],
];

// The path-review reasoning rides the same gate and is read by the same
// owner, so it renders under plain labels on the same rule. The areas are
// src/review.mjs's REVIEW_AREAS; the labels are theirs here because this
// file owns the gate's rendering.
export const REVIEW_LABELS = {
  grounds_test: "Does each step's reason survive without its Move name?",
  entailment: "What does the path claim follows from what, and does it?",
  prohibitions: "Does anything here go beyond what the material says?",
  semantic_economy: "Is the wording the composer's own, or mechanized?",
  arc_integrity: "Does the story still hold together in this order?",
  evaluation_levels: "What was observed about the path as a whole?",
};

// Spec-internal vocabulary, refused wherever it would reach the owner —
// modelled on src/review.mjs's verdict-shaped-key refusal, and a DENY for
// the same reason: a layer that rewrote the leak would let the leak keep
// being written, and the next term of art would arrive unlabelled. Two
// shapes are refused, both mechanical, neither a judgment about prose:
//   * an internal identifier — `thesis_closure` and every snake_case
//     sibling: the payload's own keys, the record's field names, anything
//     shaped like a name only this codebase uses;
//   * a section reference — the literal specimen `\u00a76.1` and kin (written
//     escaped here so the sweep of kogaki#902 does not read this SPECIMEN as
//     one of its own references): a pointer into a spec the owner does not
//     hold. What the constant below matches is a section NUMBER, never a
//     descriptive name.
// This judges no composition MUST (the judgment rule clause 3 stands): it reads the
// REGISTER of the gate's rendering, never whether the reasoning is good.
const INTERNAL_IDENTIFIER = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/;
// The same pattern, global, so the predicate can walk PAST an exempted token
// instead of stopping at the first match (kogaki#934). Derived from the source
// above rather than retyped: two literals would be one edit away from disagreeing,
// and the disagreement would show up as a leak the walker skipped.
const INTERNAL_IDENTIFIER_ALL = new RegExp(INTERNAL_IDENTIFIER.source, "g");
const SECTION_REFERENCE = /§\s*\d/;

// THE LEAK PREDICATE, exported so a second owner surface reuses it rather
// than re-deriving the same two regexes (kogaki#526). The gate payload was the
// first surface to need it; the MINTED BRIEF is the second, and it is a tracked
// document the owner reads directly. One predicate, two callers.
export function findInternalVocabulary(text, exempt) {
  if (typeof text !== "string") return null;
  // THE ADMISSIBLE-OVERRIDE SET (kogaki#934, owner selection 2026-09-06). The
  // identifier pattern's premise is that a snake_case token is a name only this
  // codebase uses. That premise is FALSE for a `step_id`, which the composer
  // authors in the Brief — and the figure decision MANDATES rendering those ids into the
  // Candidate label, so the figure clause is a sanctioned producer of the very
  // state this guard refuses. Without the override the guard refuses its own
  // mandated caller and `assembleSelection` returns no payload at all: the whole
  // selection gate collapses, on every option, because of one Step's name.
  //
  // `exempt` is a Set of tokens the CALLER supplies, and the caller supplies
  // only tokens the rendering's own data produced. It is not a widening of the
  // pattern and not a list of blessed words: nothing here is exempt by spelling,
  // only by provenance. A term of art the composer did not author is caught
  // exactly as before, in the same label, which is what keeps the wire armed.
  const skip = exempt instanceof Set ? exempt : null;
  for (const m of text.matchAll(INTERNAL_IDENTIFIER_ALL)) {
    if (skip && skip.has(m[0])) continue;
    return { kind: "an internal identifier", token: m[0] };
  }
  const sec = text.match(SECTION_REFERENCE);
  if (sec) return { kind: "a section reference", token: sec[0] };
  return null;
}

// THE MINTED BRIEF'S SLOT CAPTIONS (kogaki#526), sited HERE beside the gate's
// label tables so every owner-facing label in this lane has ONE home. They are
// keyed by the document heading `composeBrief` already writes.
//
// WHY NOT EVIDENCE_LABELS VERBATIM. kogaki#526 asks for "the same label table
// the gate rendering established rather than a second one", and the tables share
// only four of eight keys — and where they overlap the REGISTER differs: the gate
// asks the owner a question about a Candidate ("Does the path close the claim?")
// while the document captions a slot awaiting composition. Reusing the question
// text as a caption would put a question where a description belongs. What is
// genuinely shared, and what the issue is protecting, is the VOCABULARY and the
// GUARD: no internal key, no section reference, one predicate refusing both.
export const SLOT_CAPTIONS = new Map([
  ["Reader start", "Where the reader stands before the article."],
  ["Reader target", "Where the article leaves them."],
  ["Opening question", "The question the opening puts to the reader standing there."],
  // THE RATIFIED NAME (kogaki#574). This heading read "Sequence" while the
  // artifact it holds has a settled name: the adopted Candidate's Reader Path,
  // which the selection gate's own effect wording says becomes this section. The
  // served line names it and says why — "Reader Path names the ARTIFACT only …
  // Reader Path beats 'step sequence' for third-party legibility and clears the
  // established-terms rule as plain descriptive English"
  // (product-lab@8906f207 topics/articles.md:40). A heading is the composer's own
  // text, which the vocabulary guard and the prose-surface contract already
  // govern, so the owner surface takes the ratified name.
  //
  // THE RECORD FIELD STAYS `sequence`. This is a RENDERING correction and not a
  // schema rename: the settled structure section's field keeps its name, the fill still writes through it,
  // and nothing machine-facing moves. The two halves are exactly the prose-at-the-surface rule's split.
  ["Reader Path", "The ordered steps the article walks."],
  ["Strand coverage", "Per settled Strand: which steps use it, and the part it plays in the claim. The count is taken after composition, never declared ahead of it."],
  ["Unresolved obligations", "What each step still owes the reader, entered with the step that settles it."],
  ["Thesis closure", "How the path closes the claim, and which steps establish it."],
  ["Tradeoffs", "What adopting this path gave up."],
  // THE POST-HOC DISCLOSURE SURFACE (kogaki#866, ratified at the Bridge Step and the revise pass/journey register as a Candidate axis by
  // kogaki#864). the Bridge Step and the revise pass approves a Bridge Step by disclosing it after the fact
  // rather than by asking; that disclosure rode the selection gate's evidence
  // rendering until kogaki#859 emptied it, and this slot is where it lands
  // instead. journey register as a Candidate axis's journey coverage rides the same slot on its OWN ground —
  // the owner ruled the two are different questions (one an approval, one a
  // report) and then ruled both onto one surface, so the mechanism is shared
  // and the grounds are not. A later ruling may move one without the other.
  //
  // THE HEADING IS THE BRIDGE HALF'S and the caption carries both, which is a
  // rendering choice inside the ratified decision rather than a second
  // decision: the heading is the owner's own words at the gate, and the prose-at-the-surface rule
  // governs the caption as prose.
  ["What this path bridged", "What the composer inserted to carry the reader across a gap and on what reasoning, and how much of the selected journey material the path used."],
]);

// Pure; exported for the check. Returns { error } naming what leaked and
// where, or {} when the rendering is clean.
export function denyInternalVocabulary(payload, exemptByOption) {
  // THE OVERRIDE SET IS PER-OPTION AND REACHES ONE SURFACE (kogaki#934). The
  // second argument is a Map from option id to the Set of tokens that option's
  // own data put in its label — today, the step ids the figure decision's figure clause
  // renders. Two scopings are deliberate and both are the narrow one:
  //   * PER-OPTION, so Candidate A's step ids do not license the same token
  //     appearing in Candidate B's label, where nothing produced it.
  //   * OPTION LABELS ONLY. The ask's where/why/label and the free-text prompt
  //     are composed by this file, not by the author, so no token there is ever
  //     exempt; and `o.rendering` is walked with no override for the same
  //     reason. A leak that moves into a field the predicate stopped walking is
  //     exactly the failure a tripwire exists to make impossible (kogaki#568),
  //     and an override that widened past the one surface its producer writes
  //     would be that failure wearing an allowlist.
  // Omitting the argument keeps the pre-#934 behaviour exactly, which is what
  // every other caller of this function relies on.
  const overrides = exemptByOption instanceof Map ? exemptByOption : null;
  const surfaces = [
    ["the ask's where", payload.where],
    ["the ask's why", payload.why],
    ["the ask's label", payload.label],
    ["the free-text prompt", payload.free_text?.prompt],
  ];
  for (const o of payload.options || []) {
    surfaces.push([`option ${o.id}'s label`, o.label, overrides?.get(o.id)]);
    // THE PREDICATE WALKS WHATEVER THE OWNER READS (kogaki#568). The rendering
    // was a list of {label, text} pairs and is now a list of prose paragraphs;
    // this loop follows the shape rather than assuming one, because a leak that
    // escaped by moving into a field the predicate stopped walking is exactly
    // the failure a tripwire exists to make impossible. Both shapes are read so
    // the deny does not depend on the reshaping having reached every producer.
    for (const [i, item] of (o.rendering || []).entries()) {
      if (typeof item === "string") {
        surfaces.push([`the evidence paragraph ${i + 1} on option ${o.id}`, item]);
        continue;
      }
      surfaces.push([`option ${o.id}'s evidence label "${item.label}"`, item.label]);
      surfaces.push([`the evidence under "${item.label}" on option ${o.id}`, item.text]);
    }
  }
  for (const [where, text, exempt] of surfaces) {
    const leak = findInternalVocabulary(text, exempt);
    if (leak) {
      return { error: `gate rendering leaks spec-internal vocabulary: ${leak.kind} `
        + `${JSON.stringify(leak.token)} in ${where}. The owner reads this rendering and `
        + `holds none of this codebase's names — internal keys stay in the payload's record `
        + `and have no rendering path (kogaki#520). This REFUSES rather than rewrites: a `
        + `rewrite layer would let the leak keep being written` };
    }
  }
  return {};
}

// The obligations ledger's state and the placement count are PER-CANDIDATE
// composition-time values: at assembly the Brief is pre-adoption (its
// sequence and ledger are still typed unfilled slots — only the adopted
// Candidate's path ever lands, the settled structure section), so each Candidate's evidence is
// computed MECHANICALLY from its own steps and obligations against the
// Brief's closed Strand set. The count is taken after that Candidate's
// composition, counted in placements (the obligations ledger's rider, applied per Candidate).
export function candidateEvidence(c, strandIds, journeyIds = []) {
  const place = placements(c.steps, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  // journey register as a Candidate axis MUST 1, applied PER CANDIDATE: journey register is an axis of
  // Candidate differentiation, so the place-or-disclose rider is evidence
  // each Candidate owes the gate separately — two Candidates over the same
  // Strand set may place different journey material, and a per-Brief figure
  // would average exactly the difference the owner is selecting on.
  const jplace = journeyPlacements(c.steps, journeyIds);
  const jplaced = journeyIds.filter((id) => jplace.get(id).length > 0);
  const obligations = c.obligations || [];
  const undischarged = obligations.filter((o) => o.discharged_by === undefined).length;
  // The three reader fields are authored at PATH COMPOSITION, per Candidate
  // (the settled structure section v12), so they are this Candidate's own and ride its evidence — two
  // Candidates differing on the reader axis must not read identically at the
  // gate, which is the same reason journey_coverage is per-Candidate above.
  // An ABSENCE DISCLOSES HERE and REFUSES AT ADOPTION: disclosing lets the
  // owner see which Candidate is incomplete before choosing it, and keeping
  // the refusal at adoption is what stops that refusal becoming unreachable.
  // The disclosure carries no record key — this text has a rendering path.
  // BRIDGE DISCLOSURE (the Bridge Step and the revise pass v16, kogaki#524). Approval is POST-HOC: no
  // per-Bridge question, so the one gate that exists must carry what was
  // inserted and why. Computed from THIS Candidate's own steps — two Candidates
  // that bridged differently must not read identically, the same reason
  // journey_coverage is per-Candidate.
  //
  // A Bridge Step is an ordinary the Step's shape Step, so it is recognised by the
  // insertion contract rather than by a type: `bridges` names the pair it sits
  // between. Its reasoning is whichever flag it already carries — entailment
  // reasoning, or a declared reader ASSUMPTION — the grounding rule token is
  // `reader_assumption`, and the grounding rule's list is closed, so no other spelling ever
  // reaches here (kogaki#546 round 1 finding 1: `assumption` was dead code).
  const bridges = (c.steps || []).filter((st) => st && Array.isArray(st.bridges) && st.bridges.length > 0);
  const bridgeLine = bridges.length === 0
    ? "no gaps were bridged — the path's transitions stand on the material as composed"
    : bridges.map((st) => {
        const between = st.bridges.join(" → ");
        const why = st.entailment_reasoning
          || (st.grounds || []).filter((g) => g && g.type === "reader_assumption").map((g) => g.proposition).join("; ")
          || "NO REASONING CARRIED — abnormal: a bridge owes its entailment reasoning or a declared assumption";
        return `between ${between}: ${why}`;
      }).join(" | ");

  const reader = {};
  for (const [key] of READER_FIELDS) {
    const v = c[key];
    reader[key] = (typeof v === "string" && v !== "")
      ? v
      : "not stated by this path — adopting it will refuse, because the composing act did not run";
  }
  return {
    ...reader,
    bridges: bridges.length === 0
      ? bridgeLine
      : `${bridges.length} bridge(s) inserted — ${bridgeLine}`,
    obligations_ledger: obligations.length === 0
      ? "the ledger is empty — a statement, not an omission"
      : `${obligations.length} entr${obligations.length === 1 ? "y" : "ies"}, ${undischarged} UNDISCHARGED — disclosed here, never a refusal`,
    placement_count: `${placed.length} of ${strandIds.length} selected Strand(s) placed, counted in placements after this Candidate's composition${placed.length < strandIds.length ? " — the unplaced disclose at adoption" : ""}`,
    journey_coverage: journeyIds.length === 0
      ? "no selected Strand carries Journey material — nothing to place for this Brief, and nothing missing"
      : `${jplaced.length} of ${journeyIds.length} Journey-bearing Strand(s) placed by this Candidate`
        + `${jplaced.length < journeyIds.length ? ` — OMITTED and disclosed: ${journeyIds.filter((id) => jplace.get(id).length === 0).join(", ")}` : ""}`,
  };
}

// DECISION-GRADE DISCLOSURE, composed for the gate (kogaki#909, owner ruling
// 2026-09-06). One paragraph per declared decision-grade field the Candidate
// actually carries, and an empty array where it carries none — so a Candidate
// that owed nothing renders exactly what kogaki#859 left it.
//
// THE HARNESS'S OWN WORDS ARE RENDERED, NEVER RE-DESCRIBED. `revise_residue`
// is written by `src/review.mjs` from the attach ledger, and its `statement` is
// the Harness's sentence about its own arithmetic (the Bridge Step and the revise pass). Re-writing it here
// would be a second derivation of one fact, and the two would agree until one
// was edited. Where a field carries no readable statement the paragraph says
// so rather than rendering an empty line: an absent disclosure and a blank one
// are different readings, and only the second is a defect.
//
// Pure; exported for the check.
export function decisionGradeRendering(c, table) {
  const out = [];
  // DERIVED FROM THE TABLE, NEVER ENUMERATED HERE. This loop names no field,
  // which is the property that makes field N+1 free: a `decision` entry added
  // to src/disclosure-fields.json renders without an edit to this function. An
  // enumeration would put the table and the renderer in the two-carriers shape,
  // agreeing until one of them was edited — and the guard in
  // `assembleSelection` below is the tripwire on exactly that regression.
  for (const field of disclosureFieldsPresent(c, "decision", table)) {
    const entry = c[field];
    const statement = entry && typeof entry.statement === "string" && entry.statement.trim() !== ""
      ? entry.statement.trim()
      : null;
    out.push(statement
      || `This path carries disclosure the composer recorded and did not put in words. `
         + `It is in the run's record; nothing here states what it says.`);
  }
  return out;
}

// Pure; exported for the check. Returns { error } or { payload }.
export function assembleSelection(reviewed, doc) {
  // THE TABLE IS CHECKED BEFORE IT IS TRUSTED (kogaki#909). A malformed
  // disclosure table would make every surface obligation below vacuous while
  // reading exactly like a Candidate set that owed none — the degrades-to-zero
  // shape the Bridge Step and the revise pass's damaged-ledger clause refuses one field over, arriving by a
  // different door.
  const table = validateDisclosureTable();
  if (table.error) return { error: `the disclosure table is malformed: ${table.error}` };
  const cands = reviewed?.candidates;
  if (!Array.isArray(cands)) return { error: "input is the attach output: { candidates: [...] } (src/review.mjs)" };
  // 2-3 CANDIDATES PER ARTICLE (the Candidate gate): the count is the contract, refused
  // naming what arrived — one Candidate is a default in disguise, four is
  // the selector affordance overrun.
  if (cands.length < 2 || cands.length > 3) {
    return { error: `${cands.length} Candidate(s) — the Candidate gate presents two to three per article, differing in reader experience; a single Candidate is a default in disguise and four overruns the selector` };
  }
  const seenExp = new Map();
  for (const c of cands) {
    if (typeof c.candidate_id !== "string" || c.candidate_id === "") return { error: "every Candidate carries a candidate_id" };
    // FOLDED BEFORE THE TEST, the same way the dedup key three lines down folds
    // (kogaki#578). This refused only the empty string while the key beside it
    // compared trimmed-and-lowercased — so a WHITESPACE-ONLY experience passed
    // here, and since kogaki#568 made the option label the raw prose it then
    // rendered as a BLANK OPTION LABEL: the owner asked to choose between a
    // visible option and an invisible one.
    //
    // THE RETIRED PREFIX IS WHY TWO GUARDS CARRY THIS. `Adopt <id> — its Reader
    // Path becomes …` made every label non-blank whatever the prose did, and
    // removing it moved that property onto these two. PR #576 round 1 normalised
    // one of them and left the other, which is the same defect one field over.
    if (typeof c.reader_experience !== "string" || c.reader_experience.trim() === "") {
      return { error: `candidate ${c.candidate_id}: reader_experience is required and cannot be blank — Candidates DIFFER IN READER EXPERIENCE (the Candidate gate), the difference must be stated to be selectable, and since the label IS this prose a whitespace-only value renders as an option the owner cannot see` };
    }
    // NORMALISED, because this refusal is now what keeps two OPTION LABELS
    // distinguishable (kogaki#568 made the label the reader experience, and
    // PR #576 round 1 found the claim overstated). An exact-string key passes
    // two experiences differing only in case or surrounding whitespace, and
    // the retired `Adopt <id> — …` prefix used to make every label distinct by
    // the id whatever the prose did. The key is folded the same way the
    // proposal contract's own floor compares labels — trimmed and lowercased —
    // so the refusal matches the condition it is offered as proof of.
    const expKey = String(c.reader_experience).trim().toLowerCase();
    if (seenExp.has(expKey)) {
      return { error: `candidates ${seenExp.get(expKey)} and ${c.candidate_id} state the SAME reader experience — Candidates differ in reader experience (the Candidate gate), or they are one Candidate presented twice` };
    }
    seenExp.set(expKey, c.candidate_id);
    if (!Array.isArray(c.steps) || c.steps.length === 0) return { error: `candidate ${c.candidate_id}: no steps — a Candidate is an ordered sequence of Steps (the Reader Path artifact and its five blocks)` };
    // The attach guaranteed the review areas; assembly re-checks presence
    // because an unreviewed Candidate is unpresentable at this gate.
    for (const a of REVIEW_AREAS) {
      if (typeof c.review?.[a] !== "string" || c.review[a] === "") {
        return { error: `candidate ${c.candidate_id}: review area ${JSON.stringify(a)} absent — an unreviewed Candidate cannot be presented (the judgment rule; run src/review.mjs attach first)` };
      }
    }
    for (const f of REASONING_FIELDS) {
      if (typeof c.reasoning?.[f] !== "string" || c.reasoning[f] === "") {
        return { error: `candidate ${c.candidate_id}: composition-time reasoning ${JSON.stringify(f)} absent — each Candidate carries step validity, transition continuity and Thesis closure as its gate evidence (the Candidate gate)` };
      }
    }
  }
  const strandIds = selectedStrands(doc);
  if (strandIds.length === 0) {
    return { error: "the Brief carries no Strands section — not a minted Brief (assembly runs over the Brief whose closed set the Candidates composed from)" };
  }
  const journeyIds = journeyBearingStrands(doc);
  // `candidateEvidence` IS NO LONGER CALLED HERE, and that follows from the
  // ruling rather than being tidying beside it: computing a value the payload
  // does not carry is precisely "an entry with no reader". It stays EXPORTED
  // and stays exercised by `checks/check-brief-compose.sh`, because journey register as a Candidate axis's
  // journey-coverage disclosure and the Bridge Step and the revise pass's bridge disclosure are specified
  // behaviours whose display this ruling removed and whose future is an open
  // decision — deleting the derivation would settle that decision by making
  // one arm unbuildable, which is not this issue's to do.
  const options = cands.map((c) => ({
    id: c.candidate_id,
    // THE EFFECT STATES ONCE, AT QUESTION LEVEL (kogaki#568). Every option's
    // label used to open `Adopt <id> — its Reader Path becomes the Brief's
    // sequence; the reader's experience: …`, and the whole of that prefix is
    // IDENTICAL on every option. Repeating a shared clause N times buries the
    // one thing the options differ by, which is the reader experience the Candidate gate says
    // they differ by.
    //
    // THE PROPOSAL CONTRACT'S "the label states an effect" IS SATISFIED RATHER
    // THAN WAIVED. Its purpose is
    // that the owner knows what answering does; the payload's own `label`
    // carries that for the whole gate, once. Its MECHANICAL floor — a label
    // present, not a bare act token, not an option index, not identical to
    // another option's label, more than one word — is unaffected: a reader
    // experience is prose, and `assembleSelection` refuses a blank one and
    // refuses two Candidates stating the same one — both on a folded value, so
    // each refusal matches the condition it is offered against rather than
    // passing a label an owner cannot read or two they cannot tell apart. What
    // this does NOT prove is that rule's floor, which binds the RECORD's label and
    // not each option's; the floor is unaffected either way and the proof
    // offered here is about the owner surface (PR #576 round 2).
    //
    // THE ID STAYS THE RECORD ID. It is `id` above, where the owner's answer is
    // resolved; it is not the label's opening, because a token nobody chose
    // between is not what distinguishes an option.
    // the figure decision's FIGURE CLAUSE (kogaki#877). One clause appended to the label the
    // owner already reads: how many Steps carry a figure and which, with the
    // hub's soft warning above three (topics/articles.md 2026-08-01 D11 —
    // warning, no target; nothing refuses).
    //
    // WHY THE LABEL AND NOT src/disclosure-fields.json's RENDERING. That table
    // grades CANDIDATE-level fields the Harness writes onto a Candidate, and
    // reads `c[field]`; `figure` is a STEP field, so an entry there would be
    // permanently absent and the obligation permanently vacuous. The table's
    // own note anticipated this field and says it "gets graded at its own
    // filing BY THE SAME TEST" — that test is which SURFACE the evidence is
    // owed at, and it grades `decision`: the figure set is a property of the
    // Candidate the owner is choosing between, so it is owed at the selection
    // gate. The label IS that surface. The grade and the seat agree; only the
    // rendering mechanism differs, because the evidence is per-Step and the
    // table's is per-Candidate (kogaki#909, kogaki#877 acceptance 3).
    label: `${c.reader_experience} — ${figureClause(c.steps)}`,
    // NO EVIDENCE FIELD (kogaki#859, owner ruling 2026-09-04). The option is its
    // id and its label; the gate's whole option set is those, the negation and
    // free text. The first half of this ruling emptied the RENDERING and kept
    // this object as the record; the amendment removed the object too, on a
    // general position the ruling states rather than a preference about this
    // payload: "the run record holds what a later act reads … an entry with no
    // reader is unnecessary data and is refused, not tolerated."
    //
    // NOTHING IS LOST, and that is checkable rather than asserted: every field
    // this object held was COPIED from inputs that survive untouched — the
    // reasoning and review from `reviewed.json`, the rest derived on demand by
    // `candidateEvidence` below, which is still exported and still exercised.
    // The ruling is explicit that it does not touch those inputs, only what the
    // payload copies out of them, so a later act that needs the reasoning reads
    // it where it was composed instead of from a second copy nobody read.
    // THE RENDERING IS EMPTY (kogaki#859, owner ruling 2026-09-04). It carried
    // one paragraph per evidence item and per review area — sixteen per
    // Candidate, measured at ~6,400-7,090 characters each, about 20,000 above a
    // question whose three labels total under 900. The first run to measure
    // whether the owner read it found they did not, and decided on the labels
    // alone. What is removed is the RENDERING PATH **and the record copy**: the
    // amendment to the ruling took the `evidence` object too, on the general
    // position that "the run record holds what a later act reads". Nothing is
    // lost, because every field this payload held was COPIED from inputs that
    // survive untouched — the reasoning and review in `reviewed.json`, the rest
    // derived on demand by `candidateEvidence` — so a later ruling that one item
    // is needed to decide adds that item back here, reading it where it is
    // composed. THIS COMMENT PREVIOUSLY SAID THE OBJECT WAS UNCHANGED AND STILL
    // WRITTEN TO THE RUN RECORD, fifteen lines below the comment that removes
    // it (kogaki#859, PR #863 round 2, carried finding 1).
    //
    // WHY EMPTY RATHER THAN SHORTER. The declined alternative was a one-line
    // disclosure saying the reasoning exists and is recorded elsewhere — the
    // disclose-the-count discipline, applied to material leaving a view. It
    // does not bind: the record was never an owner surface, so nothing is being
    // truncated from a view the owner had, and a line they did not ask for is
    // the same defect one size down. The governing position is the one this
    // gate failed: a mechanism is not correct merely because it behaves
    // according to its own internal rules, and this gate was conformant to the Candidate gate
    // and unreadable (product-lab@315feac6 topics/archive/articles.md:29).
    //
    // THE KEY STAYS, holding an empty array rather than being deleted. The
    // tripwire below walks `o.rendering` and every consumer reads it; a key
    // that vanishes and one that is empty are the same silence to a reader and
    // different silences to a check, and only the second lets a later run tell
    // "nothing is rendered" from "nothing renders it".
    // THE RENDERING IS NO LONGER UNCONDITIONALLY EMPTY, and the change is ONE
    // ITEM rather than the list restored (kogaki#909, owner ruling 2026-09-06).
    // kogaki#859's own reversal clause is the licence — "if a later run shows
    // one evidence item is needed to decide, that item is added by its own
    // ruling, never the list restored" — and the item is decision-grade
    // disclosure evidence, which `src/disclosure-fields.json` names and this
    // line renders.
    //
    // WHAT DISTINGUISHES IT FROM THE SIXTEEN PARAGRAPHS #859 REMOVED. Those
    // were the composition-time REASONING, copied wholesale, about 20,000
    // characters above a question whose labels total under 900 — and the first
    // run to measure whether the owner read them found they did not. This is
    // bounded to the Harness's own one-sentence statement about its own
    // arithmetic, on at most three Candidates, and only when the arithmetic
    // actually fired. A Candidate that spent no revise round renders nothing,
    // so the empty case stays exactly what #859 left it.
    rendering: decisionGradeRendering(c),
  }));
  // THE OBLIGATION IS GENERATED BY THE EVIDENCE, NEVER BY A CALLER
  // REMEMBERING TO LOOK (kogaki#909, acceptance item 3). A Candidate carrying
  // a declared decision-grade field whose rendering did not emit it is
  // REFUSED here, at the composition site, rather than reported by a later
  // audit over a payload that already exists. That is why field N+1 cannot
  // repeat the class: adding a `decision` entry to the table without giving
  // `decisionGradeRendering` a case fails THIS assertion, and no new check
  // member is owed for it.
  //
  // ITS BOUND IS STATED WHERE IT BINDS. This refuses a DECLARED field that
  // reached no surface; it cannot see a key nobody declared, and pretending
  // otherwise would be a guard whose blind spot is its own failure mode.
  //
  // THE COMPARISON IS AGAINST WHAT IS OWED, NEVER AGAINST ZERO (PR #931 round 1,
  // finding 3). Testing `rendering.length === 0` catches only a TOTAL
  // regression: a renderer that went back to enumerating one known field would
  // emit one paragraph for a Candidate carrying two declared decision-grade
  // fields, pass an emptiness test, and deliver nothing for the second — the
  // partial case, which is the one a real regression takes. Counting owed
  // against rendered closes that at no cost, and it is the property the comment
  // above already claimed.
  for (const [i, c] of cands.entries()) {
    const owed = disclosureFieldsPresent(c, "decision");
    const rendered = (options[i].rendering || []).length;
    if (owed.length !== rendered) {
      return { error: `candidate ${c.candidate_id} carries ${owed.length} declared `
        + `decision-grade disclosure field(s) — ${owed.join(", ")}, which reach the owner at `
        + `${disclosureSurface(owed[0]) || "no declared surface"} — and this gate composed `
        + `${rendered} rendering(s) for them. Evidence that bears on the choice is owed BEFORE `
        + `the choice, because the owner acts on what they see and not on what the record holds `
        + `(the Bridge Step and the revise pass, the Candidate gate). Either render it here or regrade the field in `
        + `src/disclosure-fields.json under its own issue` };
    }
  }
  options.push({
    id: "none-of-these",
    // THE PREMISE'S NEGATION IS FIRST-CLASS (the Candidate gate; the proposal contract's
    // "a proposal carries Where and Why"):
    // the composing premise is that the Thesis and the selected set support
    // a structure; its negation is its own option, and the free-text
    // channel does not discharge it.
    label: "None of these — the Thesis or the selected set is what should change; no Reader Path lands in the Brief",
    negates_premise: true,
  });
  const payload = {
    id: "brief-candidate-selection-payload",
    kind: "proposal",
    where: "the Brief's sequence — which composed Reader Path the article follows",
    why: "the machine's premise, rendered: the adopted Thesis and the settled Strand set support a composed structure — the Candidates below differ in reader experience and each carries the reasoning it was composed with as evidence",
    label: "Adopting a Candidate writes its Reader Path into the Brief's sequence and fills the Brief's closing sections — how the path closes the claim, and what it traded away — from its reasoning",
    options,
    // THE PROMPT SAYS WHAT THE RUNTIME DOES, and until kogaki#950 it said the
    // opposite. SPEC-draft-pipeline v35 rules free text at this gate a COMMENT:
    // it decides nothing, adoption writes no Reader Path, and the owner is
    // returned here. The refusal below (`answered … in their own words`) builds
    // exactly that — but an owner reads THIS prompt BEFORE they answer and the
    // refusal only after, so the surface that shapes the answer was promising
    // the one thing the runtime would refuse to do.
    //
    // THE COPY NAMES THE ARMS, which is what makes it more than a corrected
    // negation. `consulted: product-lab@5b0d040b02de3917432d455dc578ae0a06d8ff7b LESSONS.md:24`
    // — "An approval gate executes the arm it captured — an owner-gated act
    // gates the decision, not the keystrokes." Free text captures no arm, so a
    // prompt that only withdraws the promise leaves the owner holding a channel
    // with no stated way forward; naming the two arms that DO decide is the
    // half that returns them to a decision. Wording is the owner's, selected
    // 2026-09-06 against two alternatives (acceptance item 2).
    free_text: { accepted: true, prompt: "Or say in your own words what should happen instead — free text here is a COMMENT: it adopts no Reader Path and nothing is written. Only selecting a Candidate or answering none-of-these decides, and a comment on its own returns you to this gate." },
  };
  // THE TRIPWIRE, LAST: the rendering the owner will read is checked for
  // spec-internal vocabulary before it can be presented. It does not stand
  // in for the plain labels above — it is what catches the NEXT term of art
  // that finds a rendering path (kogaki#520).
  // THE OVERRIDE SET, BUILT FROM THE CLAUSE'S OWN INPUT (kogaki#934). Each
  // Candidate's entry holds exactly the step ids `figureClause` rendered into
  // that Candidate's label — `figureSteps` is the same selector the clause
  // calls, so the exempted set cannot drift from the rendered one by being
  // derived twice. A Candidate with no figure contributes an empty Set and
  // exempts nothing.
  const exemptByOption = new Map(
    cands.map((c) => [c.candidate_id, new Set(figureSteps(c.steps).map((st) => st.step_id))]),
  );
  const leak = denyInternalVocabulary(payload, exemptByOption);
  if (leak.error) return leak;
  return { payload };
}

// THE OPTION SET THE CANDIDATE GATE OFFERED (kogaki#891), derived from the same
// composer the gate itself is raised from. A capture binds to the option set
// it answered — the same candidate id offered beside different alternatives is
// a different question — so both the gate executor and adoption must compute
// the set the SAME way, which is why neither of them enumerates it and both
// call this.
export function selectionOptionIds(reviewed, doc) {
  const r = assembleSelection(reviewed, doc);
  if (r.error) return { error: r.error };
  return { ids: r.payload.options.map((o) => o.id), options: r.payload.options, payload: r.payload };
}

// The adopted Candidate's Reader Path lands in the Brief (the settled structure section): sequence
// through the Step's shape fill, thesis_closure and tradeoffs from its reasoning.
export function adoptCandidate(doc, reviewed, candidateId, instantiation = {}) {
  const cands = reviewed?.candidates || [];
  const c = cands.find((x) => x.candidate_id === candidateId);
  if (!c) {
    return { error: `candidate ${JSON.stringify(candidateId)} is not in the reviewed set `
      + `(${cands.map((x) => x.candidate_id).join(", ") || "empty"}) — the owner adopts from what the gate offered` };
  }
  // the settled structure section v12: an adopted Candidate carrying no value for one of the three
  // reader fields REFUSES, naming the field, BEFORE anything is written.
  // This is not the grounding rule's `unsupported completion` and does not borrow that
  // term: nothing here was invented from outside the material — the value is
  // absent because the composing act did not run. The refusal is named
  // distinctly from the not-in-the-reviewed-set refusal above so a caller is
  // never sent to re-answer a gate that is not the problem, and it fills no
  // default: a default would be this file inventing reader state, which is
  // exactly what the read-not-invented rule refuses.
  const unauthored = READER_FIELDS
    .filter(([key]) => typeof c[key] !== "string" || c[key] === "")
    .map(([, heading]) => heading);
  if (unauthored.length) {
    return { error: `candidate ${candidateId}: ${unauthored.join(", ")} `
      + `${unauthored.length === 1 ? "is" : "are"} unauthored — path composition writes `
      + `${unauthored.length === 1 ? "it" : "them"} per Candidate, and adoption fills no default. `
      + `Compose the path again; nothing was written to the Brief.` };
  }
  // SELECTED HALF — the Candidate gate Candidate-selection gate (kogaki#891). Sited HERE,
  // above every JUDGMENT clause, because this one binds the SUBJECT'S IDENTITY:
  // the argument it checks is `candidateId` itself. Judging a specialization
  // record about Candidate A, and asking an owner to ratify it, is wasted
  // work and a misleading refusal when the owner chose B — every downstream
  // clause would pass on A and the run would refuse at the very end naming
  // the wrong thing. It sits BELOW the two clauses that establish the
  // Candidate is a Candidate at all (in the reviewed set; its reader fields
  // authored), because a malformed Candidate was never offerable and its own
  // refusal names the repair; selection is the first clause about the OWNER.
  //
  // WHAT THE ORDER DOES NOT DISTURB. the owner gate over a passing specialization record's stated property is that a
  // `contradicts` or `cannot-determine` record refuses ABOVE the ratification
  // gate, so a failing record never reaches an owner. That ordering is
  // between the judged and ratified halves and is untouched: this clause
  // sits above BOTH, and a run whose selection is absent never reaches either,
  // which is the same discipline one step earlier.
  //
  // The absence is refused HERE rather than inside the validator, for the
  // reason the owner gate over a passing specialization record already states: "not selected" is a fact about an act that
  // did not happen, not about a capture's shape.
  if (instantiation.selection === undefined) {
    return { error: `candidate ${candidateId}: which Reader Path the Brief follows is the OWNER'S choice at the Candidate gate `
      + `Candidate-selection gate, and until kogaki#891 it reached this runtime as \`--candidate\` — an argument the `
      + `model composed from the question-UI answer, carrying no evidence of any kind. Raise the gate with `
      + `\`assemble.mjs gate-candidate --declare\`, record the owner's click with \`gate-candidate --capture\`, and pass `
      + `--selection <capture>. Nothing was written.` };
  }
  const offered = selectionOptionIds(reviewed, doc);
  if (offered.error) return { error: `the Candidate gate selection gate cannot be recomposed, so the captured answer cannot be judged against what was offered: ${offered.error}` };
  const selDigest = ownerGateDigest("brief-candidate-selection", offered.ids);
  const chose = validateOwnerAnswer(instantiation.selection, "brief-candidate-selection", selDigest);
  if (chose.error) return { error: `candidate ${candidateId}: ${chose.error}` };
  if (chose.option === "none-of-these") {
    return { error: `candidate ${candidateId}: the owner answered "none-of-these" at the Candidate gate Candidate-selection gate — `
      + `the Thesis or the selected set is what should change, and NO Reader Path lands in the Brief. `
      + `Nothing was written.` };
  }
  // FREE TEXT IS NOT A SELECTION (kogaki#914, owner ruling 2026-09-06).
  //
  // The gate offers a free-text channel and `gate-candidate --capture`
  // accepts one, so this answer is REACHABLE and had no branch: it fell
  // through to the match below, where `chose.option` is `undefined` and
  // `JSON.stringify(undefined)` interpolates as the bare word `undefined`,
  // telling an owner who typed their own words that they had selected a
  // candidate named `undefined`. A refusal naming a state the owner never
  // produced sends them to repair the wrong thing.
  //
  // WHY REFUSED RATHER THAN ADOPTED, which is the fork kogaki#914 acceptance
  // item 2 left open and the owner closed. A Candidate is a COMPOSED object —
  // an ordered sequence of Steps, each binding a Move library record, plus the
  // reasoning that fills thesis_closure and tradeoffs — so free text is not a
  // Candidate the runtime has, and adopting one would mean the runtime
  // resolving prose into a Reader Path. That is exactly the judgment layer
  // kogaki#891 removed from this seam. The sibling gate one section over
  // reaches the same disposition on the same ground: a write unlocked by
  // arbitrary prose is unlocked by anything (the owner gate over a passing specialization record, validateRatification).
  //
  // The thesis gate ADMITS free text (`adopted_via: free-form`) and is not the
  // precedent, because there the answer IS the value: a Thesis is prose, and a
  // free-form one is the owner's own words reaching the run state verbatim.
  //
  // Sited with the negation above and above every judgment clause, per the Candidate gate's
  // own ordering rule: judging a specialization record about a path nobody
  // chose is wasted work ending in a refusal that names the wrong thing.
  //
  // An answer carrying BOTH an option and free text is a selection with a
  // comment beside it, so this arm reads the option's absence and not the free
  // text's presence.
  if (chose.option === undefined) {
    return { error: `candidate ${candidateId}: the owner answered the Candidate gate Candidate-selection gate in their own `
      + `words rather than selecting a Reader Path — ${JSON.stringify(chose.free_text)}. Free text at this gate `
      + `is a COMMENT, not a selection: a Candidate is a composed sequence of Steps with Move bindings, so there `
      + `is no Reader Path here to adopt and the runtime composes none. If the composed set is wrong, answer `
      + `"none-of-these" — that negation is first-class and routes to its own refusal. Otherwise re-raise the `
      + `gate and select a Candidate. Nothing was written.` };
  }

  // THE MATCH, which is acceptance item 1 of kogaki#891 in one line: the
  // argument is refused when it does not equal the recorded answer.
  if (chose.option !== candidateId) {
    return { error: `the owner selected candidate ${JSON.stringify(chose.option)} at the Candidate gate, but `
      + `${JSON.stringify(candidateId)} is being adopted — an owner who chose one Reader Path did not choose another. `
      + `Nothing was written.` };
  }

  // THE STEP↔MOVE INSTANTIATION CONTRACT (the Step-Move instantiation contract, kogaki#747), BOTH HALVES,
  // BEFORE ANYTHING IS WRITTEN. Adoption is the one surviving write that
  // lands a sequence in an existing Brief, so it is the one occasion at which
  // the contract can be made unskippable: a path reaches a Brief through here
  // or it does not reach one at all. That is why the seat is here and not at
  // path review — review's output is reasoning for a human gate and is
  // refused any verdict-shaped field by key (src/review.mjs), so a verdict
  // recorded there would be unattachable by construction.
  //
  // MECHANICAL HALF — every move id resolves to a Move library record.
  const resolved = resolveMoveIds(c.steps, instantiation.movesDir);
  if (resolved.error) {
    return { error: `candidate ${candidateId}: ${resolved.error} Nothing was written to the Brief.` };
  }
  // the figure decision's MOVE-DEPENDENT HALF (kogaki#877), at the same unskippable seat and
  // immediately after it: whether each figure-carrying Step's Move declares a
  // form, and whether the bindings are exactly that form's roles, is decidable
  // only with the library open — which is what this occasion already has. The
  // grammar and the ground addressing were refused at `validateSteps`.
  const figured = resolveFigureForms(c.steps, instantiation.movesDir);
  if (figured.error) {
    return { error: `candidate ${candidateId}: ${figured.error} Nothing was written to the Brief.` };
  }
  // JUDGED HALF — the specialization record is REQUIRED, and its absence is
  // refused HERE rather than inside the validator: "no record" is a fact
  // about the act that did not happen, not about a record's shape. This is
  // the no-skip half of the occasion; the validator owns everything else.
  if (instantiation.specialization === undefined) {
    return { error: `candidate ${candidateId}: no specialization record — whether each Step's `
      + `reader_state_before/after are consistent specializations of its Move's requires/effect is a `
      + `JUDGMENT, and it is a mandatory occasion at Brief composition (the Step-Move instantiation contract, kogaki#747). Adoption `
      + `composes no verdict of its own and fills no default. Judge the path, record the verdicts `
      + `(src/specialization-schema.json), and pass --specialization <path>. Nothing was written.` };
  }
  const judged = validateSpecialization(instantiation.specialization, c.steps, candidateId);
  if (judged.error) {
    return { error: `candidate ${candidateId}: ${judged.error}` };
  }
  // RATIFIED HALF — the owner gate (the owner gate over a passing specialization record, kogaki#893). Sited HERE, after
  // the judged half and before anything is written, and the order is the
  // whole of acceptance item 2: a `contradicts` or `cannot-determine` record
  // refuses ABOVE, unchanged, with the same message in the same path order,
  // and never reaches this line. An owner is asked to ratify a record that
  // already passes and nothing else — carrying a failing record to a gate
  // would ask them to approve a refusal.
  //
  // A PASSING RECORD IS NO LONGER THE SOLE UNLOCK, which is the property.
  // The verdict is the composing sitting's, so a record of shape-valid
  // `consistent` verdicts with no judgment behind them used to reach the
  // write with nothing beside it.
  //
  // The absence is refused HERE rather than inside the validator, for the
  // same reason the record's absence is: "not ratified" is a fact about an
  // act that did not happen, not about a capture's shape.
  const digest = specializationDigest(instantiation.specialization, c.steps);
  if (instantiation.ratification === undefined) {
    return { error: `candidate ${candidateId}: the specialization record passes, and a PASSING RECORD IS NOT THE SOLE UNLOCK `
      + `(the owner gate over a passing specialization record, kogaki#893). Every verdict here is the composing sitting's own, so the record is rendered to the owner and `
      + `RATIFIED before the path is written into the Brief. Raise the ${specializationSchema().ratification.gate_id} gate with `
      + `\`assemble.mjs ratify-specialization\`, record the owner's answer, and pass --ratification <capture>. `
      + `The record being ratified digests ${digest}. Nothing was written.`,
      // THE REFUSAL CARRIES ITS SUBJECT. `ratify-specialization --declare`
      // reaches this same branch deliberately — the gate is declared over a
      // record that has ALREADY passed every clause above, so the one act
      // that establishes "passing" is the one that composes the gate. These
      // two fields are what it needs, returned rather than recomputed by a
      // second reader that could disagree with this one about what passed.
      digest,
      rendering: c.steps.map((st) => {
        const v = instantiation.specialization.verdicts.find((x) => x.step_id === st.step_id);
        return { step_id: st.step_id, move: st.move, verdict: v.verdict, why: v.why.trim() };
      }) };
  }
  const ratified = validateRatification(instantiation.ratification, candidateId, digest);
  if (ratified.error) {
    return { error: `candidate ${candidateId}: ${ratified.error}` };
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
  out = r.doc;
  // THE POST-HOC DISCLOSURE FILLS HERE (kogaki#866). The scope is the ADOPTED
  // Candidate, and that is the property the move buys rather than a limit on
  // it: the retired gate rendering carried bridges for every Candidate,
  // including the ones nobody chose, while approval is only ever about what
  // was adopted. `candidateEvidence` regains the caller kogaki#863 removed and
  // deliberately kept it exported against — the retention is spent as intended.
  //
  // THE JOURNEY HALF IS VACUOUS, NEVER ABSENT, on a Brief with no Journey
  // material (journey register as a Candidate axis as ratified): the slot renders, the bridge half fills, and
  // the journey sentence states that there was none. An empty disclosure and a
  // missing one are different readings, which is the whole reason this slot
  // exists.
  //
  // A BRIEF MINTED BEFORE THIS SLOT EXISTED CANNOT BE ADOPTED INTO, and that is
  // stated rather than left to be discovered: `replaceSlot` refuses a section
  // it cannot find, naming it. No migration is built, because the live
  // population is EMPTY — both Briefs in the tree at this head are already
  // fully adopted (no unfilled slot remains in either), so neither is ever
  // adopted into again. A migration for nobody is the cost this note replaces;
  // if a pre-slot Brief does turn up mid-flight, the refusal names the section
  // and re-minting is the route.
  {
    const ev = candidateEvidence(c, selectedStrands(doc), journeyBearingStrands(doc));
    r = replaceSlot(out, "What this path bridged", `${ev.bridges}\n\n${ev.journey_coverage}`);
    if (r.error) return r;
    out = r.doc;
  }
  // The three land from THIS Candidate, beside thesis_closure and tradeoffs
  // (the settled structure section v12). A declined Candidate's values land nowhere, because only the
  // adopted Candidate reaches this function at all.
  for (const [key, heading] of READER_FIELDS) {
    r = replaceSlot(out, heading, c[key]);
    if (r.error) return r;
    out = r.doc;
  }
  return { doc: out, placed: filled.placed, total: filled.total, checked: resolved.checked, judged: judged.judged,
    ratified_by: ratified.tool_use_id, record_digest: digest, selected_by: chose.tool_use_id };
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
    "assemble needs --reviewed <json> — src/review.mjs attach's output"), "utf8"));
  const doc = readFileSync(argString(args, "brief",
    "assemble needs --brief <theses/<slug>/brief.md> — the composed Brief whose ledger state and placement count are part of the evidence"), "utf8");
  const out = argString(args, "out",
    "assemble needs --out <path> — the machine-local file the selection payload rides in (never a tree *.proposal.json — the Candidate gate registers no new record class)");
  const r = assembleSelection(reviewed, doc);
  if (r.error) fail(r.error);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify(r.payload, null, 2) + "\n");
  console.log(`selection payload: ${r.payload.options.length - 1} Candidate(s) plus the first-class negation, each option carrying its id and its reader-experience label and nothing else — never a verdict, and the composition-time reasoning stays in the reviewed Candidates it was composed from rather than being copied here (the Candidate gate, kogaki#859). Written: ${out}`);
}

function cmdAdopt(args) {
  const briefPath = argString(args, "brief", "adopt-candidate needs --brief <theses/<slug>/brief.md>");
  const reviewed = JSON.parse(readFileSync(argString(args, "reviewed",
    "adopt-candidate needs --reviewed <json> — the reviewed Candidates the gate offered"), "utf8"));
  // `--candidate` NAMES the Candidate being adopted; it no longer CARRIES the
  // owner's answer (kogaki#891). The answer is read from --selection, and this
  // argument is refused when the two disagree — a selector the model composes
  // is admissible exactly because the evidence beside it is not.
  const id = argString(args, "candidate",
    "adopt-candidate needs --candidate <id> — which Candidate is being adopted. It is checked AGAINST the "
    + "owner's recorded answer at the Candidate gate selection gate (--selection) and never stands in for it.");
  const doc = readFileSync(briefPath, "utf8");
  // the Step-Move instantiation contract's two halves reach the runtime as CALLER-SUPPLIED INPUTS, never as
  // something this command derives: the moves directory is a path (default
  // `moves`, overridable so the checks can point at a fixture library), and
  // the specialization record is read from disk and parsed, never composed.
  // `--specialization` has no default and no implicit empty value — an
  // omitted flag reaches `adoptCandidate` as `undefined` and is refused
  // there, which is what makes the occasion unskippable.
  const instantiation = { movesDir: typeof args["moves-dir"] === "string" && args["moves-dir"] !== "" ? args["moves-dir"] : undefined };
  if (typeof args.specialization === "string" && args.specialization !== "") {
    try { instantiation.specialization = JSON.parse(readFileSync(args.specialization, "utf8")); }
    catch (e) { fail(`the specialization record at ${args.specialization} cannot be read (${e.message}) — the Step-Move instantiation contract's judgment record is an input to adoption, so an unreadable one is not an absent one and is not treated as one`); }
  }
  // the owner gate over a passing specialization record's ratification capture, read the same way and for the same
  // reason: an omitted flag reaches `adoptCandidate` as `undefined` and is
  // refused there, which is what makes the gate unskippable, while an
  // unreadable file is a fault rather than an absence.
  // the Candidate gate's selection capture, read the same way and for the same reason: an
  // omitted flag reaches `adoptCandidate` as `undefined` and is refused there,
  // which is what makes the gate unskippable, while an unreadable file is a
  // fault rather than an absence.
  if (typeof args.selection === "string" && args.selection !== "") {
    try { instantiation.selection = JSON.parse(readFileSync(args.selection, "utf8")); }
    catch (e) { fail(`the selection capture at ${args.selection} cannot be read (${e.message}) — the Candidate gate's owner answer is an input to adoption, so an unreadable one is not an absent one and is not treated as one`); }
  }
  if (typeof args.ratification === "string" && args.ratification !== "") {
    try { instantiation.ratification = JSON.parse(readFileSync(args.ratification, "utf8")); }
    catch (e) { fail(`the ratification capture at ${args.ratification} cannot be read (${e.message}) — the owner gate over a passing specialization record's owner answer is an input to adoption, so an unreadable one is not an absent one and is not treated as one`); }
  }
  const r = adoptCandidate(doc, reviewed, id, instantiation);
  if (r.error) fail(r.error);
  // Per-block snapshots (kogaki#523): adoption is the ONE surviving write
  // that lands blocks in an existing Brief — the sequence (through the same
  // fillBrief the retired `fill` CLI called, the durable home and the entry point v17) and the closure
  // fields land in this single write, so its before/after pair traces both.
  // Machine-local trace; a failure warns and never blocks the write.
  const snapSeq = snapshotBrief(briefPath, "adopt-candidate", "before", doc);
  writeFileSync(briefPath, r.doc);
  snapshotBrief(briefPath, "adopt-candidate", "after", r.doc, snapSeq);
  console.log(`instantiation contract (the Step-Move instantiation contract): ${r.checked} move id(s) resolved against the Move library, ${r.judged} Step specialization verdict(s) read from the record — judged by the composing sitting, validated here, composed here never`);
  console.log(`candidate selection (the Candidate gate): ${id} was the owner's own answer at the brief-candidate-selection gate (AskUserQuestion ${r.selected_by}) — read from the capture, never carried by --candidate (kogaki#891)`);
  console.log(`specialization ratification (the owner gate over a passing specialization record): the record digesting ${r.record_digest} was rendered at the ${specializationSchema().ratification.gate_id} gate and ratified by the owner (AskUserQuestion ${r.ratified_by}) — a passing record is not the sole unlock`);
  console.log(`adopted ${id} — its Reader Path is the Brief's sequence; thesis_closure and tradeoffs filled from its reasoning; Strand placement ${r.placed} of ${r.total}. READ THIS ONE (owner document): ${briefPath}`);
}

// ---------------------------------------------------------------------------
// THE RATIFICATION GATE'S EXECUTOR (the owner gate over a passing specialization record, kogaki#893).
//
// ONE ACT, TWO MODES, AND NO ENTRY POINT THAT CAN MINT STATE OUT OF BAND.
// `--declare` composes the run declaration and renders the record; `--capture`
// records the owner's answer against THAT declaration. Both recompute the
// subject from the same inputs adoption reads, through the same
// `adoptCandidate` call, so a capture cannot be written for a record that
// would not itself pass — the declare mode reaches its subject only through
// the branch that fires after every clause of the Step-Move instantiation contract has passed. This is the
// property kogaki#625 item 1 established on the Terrain side by removing
// `gate` and `capture` as entry points: an answer is admitted only at the
// wait that declared it. Here the wait is the adoption refusal itself.
function ratificationDir(briefPath) {
  return join(laneDir("brief"), basename(dirname(resolve(briefPath))));
}

function cmdRatify(args) {
  const briefPath = argString(args, "brief", "ratify-specialization needs --brief <theses/<slug>/brief.md>");
  const reviewed = JSON.parse(readFileSync(argString(args, "reviewed",
    "ratify-specialization needs --reviewed <json> — the reviewed Candidates the selection gate offered"), "utf8"));
  const id = argString(args, "candidate", "ratify-specialization needs --candidate <id>");
  const doc = readFileSync(briefPath, "utf8");
  const instantiation = { movesDir: typeof args["moves-dir"] === "string" && args["moves-dir"] !== "" ? args["moves-dir"] : undefined };
  const specPath = argString(args, "specialization",
    "ratify-specialization needs --specialization <json> — the record being ratified IS the gate's evidence, so there is no gate without one");
  try { instantiation.specialization = JSON.parse(readFileSync(specPath, "utf8")); }
  catch (e) { fail(`the specialization record at ${specPath} cannot be read (${e.message})`); }
  // the Candidate gate's SELECTION CAPTURE IS AN INPUT HERE TOO (kogaki#891), because the
  // subject below is established by the SAME `adoptCandidate` call adoption
  // makes — and that call now refuses a Candidate the owner did not select.
  // The ratification gate sits AFTER the selection gate in the Candidate gate's flow, so a
  // ratification raised without one would ask an owner to ratify a record
  // about a Reader Path nobody chose. The runtime manufactures no stand-in:
  // there is no synthetic selection and no bypass.
  const selPath = argString(args, "selection",
    "ratify-specialization needs --selection <capture> — the owner's answer at the Candidate gate Candidate-selection gate. "
    + "The record being ratified describes the Candidate they chose, so the gate after it is raised only once that answer exists (kogaki#891).");
  try { instantiation.selection = JSON.parse(readFileSync(selPath, "utf8")); }
  catch (e) { fail(`the selection capture at ${selPath} cannot be read (${e.message}) — the Candidate gate's owner answer is an input to the ratification gate, so an unreadable one is not an absent one and is not treated as one`); }

  // THE SUBJECT, established by the same act that would adopt it. A record
  // that does not pass never reaches a gate: asking an owner to ratify a
  // `contradicts` verdict would ask them to approve a refusal, and acceptance
  // item 2's "the refusing arms are unchanged" is exactly this ordering.
  const probe = adoptCandidate(doc, reviewed, id, instantiation);
  if (probe.digest === undefined) {
    fail(probe.error
      ? `${probe.error}\n\nNo gate is raised: the record does not pass, so there is nothing to ratify. Repair the record, not the gate.`
      : `candidate ${id}: the record was adopted without a gate — the ratification requirement is not in force, which is the defect kogaki#893 exists to close`);
  }
  const sch = specializationSchema().ratification;
  const dir = ratificationDir(briefPath);
  mkdirSync(dir, { recursive: true });
  const declPath = join(dir, `${sch.gate_id}${gateSchema().capture.run_declaration_suffix}`);
  const capPath = join(dir, `${sch.gate_id}${gateSchema().capture.suffix}`);
  const binding = { candidate_id: id, record_digest: probe.digest };

  if (args.capture) {
    // THE CAPTURE, admitted only against a declaration this act wrote, and
    // only for the record that declaration was raised over. Without the
    // declaration there is no gate; with a different record the binding below
    // no longer matches and `validateRatification` refuses at adoption.
    let decl;
    try { decl = JSON.parse(readFileSync(declPath, "utf8")); }
    catch { fail(`no declaration at ${declPath} — an answer is admitted at the wait that declared it, so run --declare and raise the gate first (the owner gate over a passing specialization record)`); }
    if (decl.ratifies?.record_digest !== probe.digest) {
      fail(`the declaration at ${declPath} was raised over a record digesting ${JSON.stringify(decl.ratifies?.record_digest)}, `
        + `but the record on disk now digests ${JSON.stringify(probe.digest)} — the record changed after the gate was raised, `
        + `so this answer would ratify verdicts the owner was never shown. Re-run --declare and re-raise the gate (the owner gate over a passing specialization record).`);
    }
    const toolUseId = argString(args, "tool-use-id",
      "--capture needs --tool-use-id <id> — the AskUserQuestion tool_use_id, the one field tying the row to a question the harness actually asked");
    const option = argString(args, "option",
      `--capture needs --option <${sch.affirmative_option}|${sch.declining_option}>`);
    if (!decl.options.some((o) => o.id === option)) {
      fail(`answer option ${JSON.stringify(option)} was not offered by the declaration`);
    }
    const row = {
      stop_id: `stop-${Date.now()}`,
      gate_id: sch.gate_id,
      evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
      payload: {
        options_offered: decl.options.map((o) => o.id),
        free_text_offered: true,
        answer: { option },
      },
      [sch.capture_binding_key]: binding,
    };
    const capture = existsSync(capPath) ? JSON.parse(readFileSync(capPath, "utf8")) : { rows: [] };
    capture.rows.push(row);
    writeFileSync(capPath, JSON.stringify(capture, null, 2) + "\n");
    console.log(`captured: ${option} at ${sch.gate_id}, bound to candidate ${id} and record digest ${probe.digest}`);
    console.log(option === sch.affirmative_option
      ? `pass --ratification ${capPath} to adopt-candidate. Written: ${capPath}`
      : `the record is NOT ratified — adoption will refuse, naming this answer, and nothing is written to the Brief. Written: ${capPath}`);
    return;
  }

  const registered = (gateRegistry().gates || []).find((g) => g.id === sch.gate_id);
  if (!registered) fail(`${sch.gate_id} is not declared in src/gate-registry.json — an unregistered gate is the uncovered-by-default shape`);
  const declaration = {
    ...registered,
    declared_at: new Date().toISOString(),
    run_declaration: true,
    ratifies: binding,
    // THE RECORD, byte-for-byte as `validateSpecialization` read it. The
    // session renders THIS above the question rather than composing or
    // retyping it — a gate whose evidence is retyped is a gate over the
    // retyping.
    record_rendering: probe.rendering,
  };
  delete declaration.dynamic_options;
  writeFileSync(declPath, JSON.stringify(declaration, null, 2) + "\n");
  console.log(`${sch.gate_id} — the Step-Move instantiation contract specialization record for candidate ${id}, digest ${probe.digest}.`);
  console.log(`Render every row below on screen, then ask the declaration's question through AskUserQuestion.\n`);
  for (const r of probe.rendering) {
    console.log(`  ${r.step_id}  instantiates ${r.move}  —  ${r.verdict}`);
    console.log(`      "${r.why}"`);
  }
  console.log(`\nThen: assemble.mjs ratify-specialization --capture --tool-use-id <id> --option <${sch.affirmative_option}|${sch.declining_option}> (same --brief/--reviewed/--candidate/--specialization)`);
  console.log(`declaration: ${declPath}`);
}

// ---------------------------------------------------------------------------
// THE CANDIDATE-SELECTION GATE'S EXECUTOR (kogaki#891).
//
// The same one-act-two-modes shape the owner gate over a passing specialization record's executor established, and for the
// same reason: an answer is admitted only at the wait that declared it. Both
// modes recompose the option set through `selectionOptionIds` — the same
// composer adoption reads — so a capture cannot be written for a set that
// would not itself be offered, and the digest the capture binds to is
// computed once, in one place, by both writers and the reader.
function cmdGateCandidate(args) {
  const briefPath = argString(args, "brief", "gate-candidate needs --brief <theses/<slug>/brief.md>");
  const reviewed = JSON.parse(readFileSync(argString(args, "reviewed",
    "gate-candidate needs --reviewed <json> — the reviewed Candidates the gate offers"), "utf8"));
  const doc = readFileSync(briefPath, "utf8");
  const offered = selectionOptionIds(reviewed, doc);
  if (offered.error) fail(`${offered.error}\n\nNo gate is raised: the Candidates cannot be presented, so there is nothing to choose between. Repair the Candidates, not the gate.`);
  const gateId = "brief-candidate-selection";
  const digest = ownerGateDigest(gateId, offered.ids);
  const dir = ratificationDir(briefPath);
  mkdirSync(dir, { recursive: true });
  const declPath = join(dir, `${gateId}${gateSchema().capture.run_declaration_suffix}`);
  const capPath = join(dir, `${gateId}${gateSchema().capture.suffix}`);

  if (args.capture) {
    let decl;
    try { decl = JSON.parse(readFileSync(declPath, "utf8")); }
    catch { fail(`no declaration at ${declPath} — an answer is admitted at the wait that declared it, so run --declare and raise the gate first (the Candidate gate; kogaki#891).`); }
    if (decl.answers_over?.option_set_digest !== digest) {
      fail(`the declaration at ${declPath} was raised over an option set digesting ${JSON.stringify(decl.answers_over?.option_set_digest)}, `
        + `but the Candidates now offer one digesting ${JSON.stringify(digest)} — the Candidates changed after the gate was raised, `
        + `so this answer would adopt a Reader Path the owner was never shown. Re-run --declare and re-raise the gate.`);
    }
    const toolUseId = argString(args, "tool-use-id",
      "--capture needs --tool-use-id <id> — the AskUserQuestion tool_use_id, the one field tying the row to a question the harness actually asked");
    const option = typeof args.option === "string" && args.option !== "" ? args.option : undefined;
    const freeText = typeof args["free-text"] === "string" && args["free-text"].trim() !== "" ? args["free-text"] : undefined;
    if (option === undefined && freeText === undefined) {
      fail(`--capture needs --option <id> or --free-text <the owner's own words>. Options offered: ${offered.ids.join(", ")}.`);
    }
    if (option !== undefined && !offered.ids.includes(option)) {
      fail(`answer option ${JSON.stringify(option)} was not offered by the declaration — offered: ${offered.ids.join(", ")}.`);
    }
    const answer = {};
    if (option !== undefined) answer.option = option;
    if (freeText !== undefined) answer.free_text = freeText;
    const row = {
      stop_id: `stop-${Date.now()}`,
      gate_id: gateId,
      evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
      payload: { options_offered: offered.ids, free_text_offered: true, answer },
      [gateSchema().capture.owner_answer_binding_key]: { option_set_digest: digest },
    };
    const capture = existsSync(capPath) ? JSON.parse(readFileSync(capPath, "utf8")) : { rows: [] };
    capture.rows.push(row);
    writeFileSync(capPath, JSON.stringify(capture, null, 2) + "\n");
    console.log(`captured at ${gateId}: ${JSON.stringify(answer)}`);
    console.log(option === "none-of-these" || option === undefined
      ? `no Reader Path is adopted on this answer — adoption will refuse, naming it, and nothing is written to the Brief. Written: ${capPath}`
      : `pass --selection ${capPath} --candidate ${option} to adopt-candidate. Written: ${capPath}`);
    return;
  }

  const registered = (gateRegistry().gates || []).find((g) => g.id === gateId);
  if (!registered) fail(`${gateId} is not declared in src/gate-registry.json — an unregistered gate is the uncovered-by-default shape`);
  const declaration = {
    ...registered,
    declared_at: new Date().toISOString(),
    run_declaration: true,
    // THE OPTIONS AS OFFERED, from the payload the gate is raised from — the
    // options-equality comparison target SPEC-gate-carrier, the Step's shape names.
    options: offered.options,
    question: registered.question,
    label: offered.payload.label,
    where: offered.payload.where,
    why: offered.payload.why,
    free_text: offered.payload.free_text,
    answers_over: { option_set_digest: digest },
  };
  delete declaration.dynamic_options;
  writeFileSync(declPath, JSON.stringify(declaration, null, 2) + "\n");
  console.log(`${gateId} — ${offered.ids.length - 1} Candidate(s) plus the first-class negation, digest ${digest}.`);
  console.log(`Render every option below on screen, then ask the declaration's question through AskUserQuestion.\n`);
  for (const o of offered.options) console.log(`  ${o.id}\n      ${o.label}`);
  console.log(`\n  (free text) ${offered.payload.free_text?.prompt || ""}`);
  console.log(`\nThen: assemble.mjs gate-candidate --capture --brief ${briefPath} --reviewed <json> --tool-use-id <id> [--option <id>] [--free-text <words>]`);
  console.log(`declaration: ${declPath}`);
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "assemble": cmdAssemble(args); break;
    case "adopt-candidate": cmdAdopt(args); break;
    case "gate-candidate": cmdGateCandidate(args); break;
    case "ratify-specialization": cmdRatify(args); break;
    default: fail("usage: assemble.mjs assemble --reviewed <json> --brief <path> --out <path>\n  | gate-candidate [--capture --tool-use-id <id> [--option <id>] [--free-text <words>]] --brief <path> --reviewed <json>\n  | ratify-specialization [--capture --tool-use-id <id> --option <id>] --brief <path> --reviewed <json> --candidate <id> --specialization <json> --selection <capture> [--moves-dir <dir>]\n  | adopt-candidate --brief <path> --reviewed <json> --candidate <id> --specialization <json> --selection <capture> --ratification <capture> [--moves-dir <dir>]");
  }
}
