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
//     automated verdict (§6). THE OWNER-FACING HALF OF THAT PAYLOAD IS ITS
//     `rendering` (kogaki#520): each evidence item under one plain label,
//     the internal keys kept in `evidence` as the record and shown to
//     nobody — with a deny tripwire refusing any rendering that carries
//     spec-internal vocabulary anyway.
//   adopt-candidate — the owner's recorded answer: the adopted Candidate's
//     Reader Path lands in the Brief's sequence (through the same §4.1
//     fill the composition runtime owns), and thesis_closure and tradeoffs
//     fill from its reasoning (§5.1).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { fillBrief, replaceSlot, selectedStrands, placements,
         journeyBearingStrands, journeyPlacements, snapshotBrief } from "./compose.mjs";
import { REVIEW_AREAS } from "./review.mjs";

function fail(msg) {
  process.stderr.write(`assemble: ${msg}\n`);
  process.exit(1);
}

// The composition-time reasoning each Candidate owes the gate, beside the
// review areas the attach already guaranteed. The three levels are §4.6's
// — observed, never scored — and the composer records them per Candidate.
const REASONING_FIELDS = ["step_validity", "transition_continuity", "thesis_closure"];

// THE OWNER READS THE GATE, NOT THE SPEC (kogaki#520). Every evidence item
// keeps its internal key in the payload — that is the record, and the record
// is machine-local — and renders under exactly ONE plain-register label. The
// key name has no rendering path at all: `rendering` below is the whole
// owner-facing surface, and it carries labels and prose, never key names.
// One label per key, in the order the owner reads them.
// The three §5.1 fields whose authoring block is PATH COMPOSITION (v12,
// kogaki#521). Each pairs its record key with the Brief slot heading it
// lands in; brief/brief.mjs's FIELDS table owns those headings, and this is
// the join to them. ONE declaration: the evidence, the rendering, the
// adoption fill and the adoption refusal all read this list, so a fourth
// reader field is added here and nowhere else.
export const READER_FIELDS = [
  ["reader_start", "Reader start"],
  ["reader_target", "Reader target"],
  ["opening_question", "Opening question"],
];

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
// brief/review.mjs's REVIEW_AREAS; the labels are theirs here because this
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
// modelled on brief/review.mjs's verdict-shaped-key refusal, and a DENY for
// the same reason: a layer that rewrote the leak would let the leak keep
// being written, and the next term of art would arrive unlabelled. Two
// shapes are refused, both mechanical, neither a judgment about prose:
//   * an internal identifier — `thesis_closure` and every snake_case
//     sibling: the payload's own keys, the record's field names, anything
//     shaped like a name only this codebase uses;
//   * a section reference — `§6.1` and kin: a pointer into a spec the owner
//     does not hold.
// This judges no composition MUST (§4.6 clause 3 stands): it reads the
// REGISTER of the gate's rendering, never whether the reasoning is good.
const INTERNAL_IDENTIFIER = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/;
const SECTION_REFERENCE = /§\s*\d/;

// THE LEAK PREDICATE, exported so a second owner surface reuses it rather
// than re-deriving the same two regexes (kogaki#526). The gate payload was the
// first surface to need it; the MINTED BRIEF is the second, and it is a tracked
// document the owner reads directly. One predicate, two callers.
export function findInternalVocabulary(text) {
  if (typeof text !== "string") return null;
  const id = text.match(INTERNAL_IDENTIFIER);
  if (id) return { kind: "an internal identifier", token: id[0] };
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
  // schema rename: §5.1's field keeps its name, the fill still writes through it,
  // and nothing machine-facing moves. The two halves are exactly §5.1.3's split.
  ["Reader Path", "The ordered steps the article walks."],
  ["Strand coverage", "Per settled Strand: which steps use it, and the part it plays in the claim. The count is taken after composition, never declared ahead of it."],
  ["Unresolved obligations", "What each step still owes the reader, entered with the step that settles it."],
  ["Thesis closure", "How the path closes the claim, and which steps establish it."],
  ["Tradeoffs", "What adopting this path gave up."],
]);

// Pure; exported for the check. Returns { error } naming what leaked and
// where, or {} when the rendering is clean.
export function denyInternalVocabulary(payload) {
  const surfaces = [
    ["the ask's where", payload.where],
    ["the ask's why", payload.why],
    ["the ask's label", payload.label],
    ["the free-text prompt", payload.free_text?.prompt],
  ];
  for (const o of payload.options || []) {
    surfaces.push([`option ${o.id}'s label`, o.label]);
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
  for (const [where, text] of surfaces) {
    const leak = findInternalVocabulary(text);
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
// Candidate's path ever lands, §5.1), so each Candidate's evidence is
// computed MECHANICALLY from its own steps and obligations against the
// Brief's closed Strand set. The count is taken after that Candidate's
// composition, counted in placements (§5.2's rider, applied per Candidate).
export function candidateEvidence(c, strandIds, journeyIds = []) {
  const place = placements(c.steps, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  // §6.1 MUST 1, applied PER CANDIDATE: journey register is an axis of
  // Candidate differentiation, so the place-or-disclose rider is evidence
  // each Candidate owes the gate separately — two Candidates over the same
  // Strand set may place different journey material, and a per-Brief figure
  // would average exactly the difference the owner is selecting on.
  const jplace = journeyPlacements(c.steps, journeyIds);
  const jplaced = journeyIds.filter((id) => jplace.get(id).length > 0);
  const obligations = c.obligations || [];
  const undischarged = obligations.filter((o) => o.discharged_by === undefined).length;
  // The three reader fields are authored at PATH COMPOSITION, per Candidate
  // (§5.1 v12), so they are this Candidate's own and ride its evidence — two
  // Candidates differing on the reader axis must not read identically at the
  // gate, which is the same reason journey_coverage is per-Candidate above.
  // An ABSENCE DISCLOSES HERE and REFUSES AT ADOPTION: disclosing lets the
  // owner see which Candidate is incomplete before choosing it, and keeping
  // the refusal at adoption is what stops that refusal becoming unreachable.
  // The disclosure carries no record key — this text has a rendering path.
  // BRIDGE DISCLOSURE (§4.11 v16, kogaki#524). Approval is POST-HOC: no
  // per-Bridge question, so the one gate that exists must carry what was
  // inserted and why. Computed from THIS Candidate's own steps — two Candidates
  // that bridged differently must not read identically, the same reason
  // journey_coverage is per-Candidate.
  //
  // A Bridge Step is an ordinary §4.1 Step, so it is recognised by the
  // insertion contract rather than by a type: `bridges` names the pair it sits
  // between. Its reasoning is whichever flag it already carries — entailment
  // reasoning, or a declared reader ASSUMPTION — the §4.4 token is
  // `reader_assumption`, and §4.4's list is closed, so no other spelling ever
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
      return { error: `candidate ${c.candidate_id}: reader_experience is required and cannot be blank — Candidates DIFFER IN READER EXPERIENCE (§6), the difference must be stated to be selectable, and since the label IS this prose a whitespace-only value renders as an option the owner cannot see` };
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
      return { error: `candidates ${seenExp.get(expKey)} and ${c.candidate_id} state the SAME reader experience — Candidates differ in reader experience (§6), or they are one Candidate presented twice` };
    }
    seenExp.set(expKey, c.candidate_id);
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
  const journeyIds = journeyBearingStrands(doc);
  const options = cands.map((c) => { const ev = candidateEvidence(c, strandIds, journeyIds); return ({
    id: c.candidate_id,
    // THE EFFECT STATES ONCE, AT QUESTION LEVEL (kogaki#568). Every option's
    // label used to open `Adopt <id> — its Reader Path becomes the Brief's
    // sequence; the reader's experience: …`, and the whole of that prefix is
    // IDENTICAL on every option. Repeating a shared clause N times buries the
    // one thing the options differ by, which is the reader experience §6 says
    // they differ by.
    //
    // PROPOSAL-CONTRACT §2.2 IS SATISFIED RATHER THAN WAIVED. Its purpose is
    // that the owner knows what answering does; the payload's own `label`
    // carries that for the whole gate, once. Its MECHANICAL floor — a label
    // present, not a bare act token, not an option index, not identical to
    // another option's label, more than one word — is unaffected: a reader
    // experience is prose, and `assembleSelection` refuses a blank one and
    // refuses two Candidates stating the same one — both on a folded value, so
    // each refusal matches the condition it is offered against rather than
    // passing a label an owner cannot read or two they cannot tell apart. What
    // this does NOT prove is §2.2's floor, which binds the RECORD's label and
    // not each option's; the floor is unaffected either way and the proof
    // offered here is about the owner surface (PR #576 round 2).
    //
    // THE ID STAYS THE RECORD ID. It is `id` above, where the owner's answer is
    // resolved; it is not the label's opening, because a token nobody chose
    // between is not what distinguishes an option.
    label: c.reader_experience,
    // THE EVIDENCE AT THE GATE (§6): composition-time reasoning, surfaced
    // for the owner — never an automated verdict. THIS OBJECT IS THE RECORD,
    // not the rendering: it keeps the internal keys, it stays in the
    // machine-local payload, and nothing shows it to the owner (kogaki#520).
    evidence: {
      reader_start: ev.reader_start,
      reader_target: ev.reader_target,
      opening_question: ev.opening_question,
      step_validity: c.reasoning.step_validity,
      transition_continuity: c.reasoning.transition_continuity,
      thesis_closure: c.reasoning.thesis_closure,
      obligations_ledger: ev.obligations_ledger,
      placement_count: ev.placement_count,
      journey_coverage: ev.journey_coverage,
      bridges: ev.bridges,
      review: c.review,
    },
    // THE RENDERING (kogaki#520, reshaped at kogaki#568): the same evidence, in
    // the same order, and this is still the ONLY surface the gate shows. What
    // changed is the SHAPE, not the content. kogaki#520 got the words right —
    // plain questions instead of key names — and left a label/text pair per
    // item, which displays as a field list however plain the labels read. The
    // §5.1.3 contract (v20, kogaki#566) governs the shape too, and names this
    // issue as the §6 half's carrier.
    //
    // EACH ITEM IS ONE PARAGRAPH: its plain question followed by its own prose.
    // Nothing is dropped and nothing is reordered — the question that used to
    // be a label is now the paragraph's first sentence, which is where a reader
    // meets it anyway. The count still comes from EVIDENCE_LABELS and
    // REVIEW_AREAS rather than a literal, so an added evidence item reaches the
    // owner without a second edit here.
    rendering: [
      ...EVIDENCE_LABELS.map(([key, label]) => `${label} ${key in ev ? ev[key] : c.reasoning[key]}`),
      ...REVIEW_AREAS.map((area) => `${REVIEW_LABELS[area]} ${c.review[area]}`),
    ],
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
  const payload = {
    id: "brief-candidate-selection-payload",
    kind: "proposal",
    where: "the Brief's sequence — which composed Reader Path the article follows",
    why: "the machine's premise, rendered: the adopted Thesis and the settled Strand set support a composed structure — the Candidates below differ in reader experience and each carries the reasoning it was composed with as evidence",
    label: "Adopting a Candidate writes its Reader Path into the Brief's sequence and fills the Brief's closing sections — how the path closes the claim, and what it traded away — from its reasoning",
    options,
    free_text: { accepted: true, prompt: "Or say in your own words what should happen instead — a free-text answer is recorded as your ruling, and it does not discharge the none-of-these option." },
  };
  // THE TRIPWIRE, LAST: the rendering the owner will read is checked for
  // spec-internal vocabulary before it can be presented. It does not stand
  // in for the plain labels above — it is what catches the NEXT term of art
  // that finds a rendering path (kogaki#520).
  const leak = denyInternalVocabulary(payload);
  if (leak.error) return leak;
  return { payload };
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
  // §5.1 v12: an adopted Candidate carrying no value for one of the three
  // reader fields REFUSES, naming the field, BEFORE anything is written.
  // This is not §4.4's `unsupported completion` and does not borrow that
  // term: nothing here was invented from outside the material — the value is
  // absent because the composing act did not run. The refusal is named
  // distinctly from the not-in-the-reviewed-set refusal above so a caller is
  // never sent to re-answer a gate that is not the problem, and it fills no
  // default: a default would be this file inventing reader state, which is
  // exactly what §3's read-not-invented rule refuses.
  const unauthored = READER_FIELDS
    .filter(([key]) => typeof c[key] !== "string" || c[key] === "")
    .map(([, heading]) => heading);
  if (unauthored.length) {
    return { error: `candidate ${candidateId}: ${unauthored.join(", ")} `
      + `${unauthored.length === 1 ? "is" : "are"} unauthored — path composition writes `
      + `${unauthored.length === 1 ? "it" : "them"} per Candidate, and adoption fills no default. `
      + `Compose the path again; nothing was written to the Brief.` };
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
  // The three land from THIS Candidate, beside thesis_closure and tradeoffs
  // (§5.1 v12). A declined Candidate's values land nowhere, because only the
  // adopted Candidate reaches this function at all.
  for (const [key, heading] of READER_FIELDS) {
    r = replaceSlot(out, heading, c[key]);
    if (r.error) return r;
    out = r.doc;
  }
  return { doc: out, placed: filled.placed, total: filled.total };
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
  // Per-block snapshots (kogaki#523): adoption is the ONE surviving write
  // that lands blocks in an existing Brief — the sequence (through the same
  // fillBrief the retired `fill` CLI called, §5.3 v17) and the closure
  // fields land in this single write, so its before/after pair traces both.
  // Machine-local trace; a failure warns and never blocks the write.
  const snapSeq = snapshotBrief(briefPath, "adopt-candidate", "before", doc);
  writeFileSync(briefPath, r.doc);
  snapshotBrief(briefPath, "adopt-candidate", "after", r.doc, snapSeq);
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
