#!/usr/bin/env node
// assemble — Candidate assembly and the Candidate-selection gate's payload (kogaki#491, story 1.75;
// governing spec SPEC-draft-pipeline, the Candidate gate). Candidates ride the
// specs/spec-proposal-contract record shape and the specs/spec-gate-carrier selector,
// registering no new gate and no new check; the payload is machine-local run state.
// Two commands:
//   assemble — the REVIEWED Candidates (src/review.mjs attach) plus the Brief, 1-3 Candidates
//     differing in reader experience, into the selection payload; its `rendering` is the
//     owner-facing half (kogaki#859), and the vocabulary deny still guards it.
//   adopt-candidate — the owner's recorded answer: the adopted Reader Path and the Brief
//     record's remaining slots fill from the Candidate (one YAML record since kogaki#1328).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
// THE NAMES THIS FILE USES, each naming SPEC-draft-pipeline: the read-not-invented rule; the
// Leg's shape; the Bridge Leg; the Leg-Move instantiation contract; the owner gate over a
// passing specialization record; the figure decision; the Reader Path artifact and its five
// blocks; the claims rule; the judgment rule; the settled structure section; the durable home and the entry point; the Candidate gate; journey register as a
// Candidate axis; the Move library.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fillBrief, fillSlot, briefStrandIds, placements,
  ownerGateDigest, validateOwnerAnswer,
  briefJourneyStrands, journeyPlacements, snapshotBrief, readBriefRecord, briefRecordText } from "./compose.mjs";
import { REVIEW_AREAS } from "./review.mjs";
import { disclosureFieldsPresent, disclosureSurface, validateDisclosureTable } from "./disclosure.mjs";

function fail(msg) {
  process.stderr.write(`assemble: ${msg}\n`);
  process.exit(1);
}

// The composition-time reasoning each Candidate owes the gate, beside the
// review areas the attach already guaranteed. The two levels are the judgment rule's
// — observed, never scored — and the composer records them per Candidate.
// `transition_continuity` RETIRED (kogaki#1247, owner decision 2026-10-04):
// an internal variable the gate never read, refused by name below rather
// than restated under any key.
// EXPORTED (kogaki#859) so the guard SPEC the Candidate gate claims can derive this table's
// key set rather than restate it: EVIDENCE_LABELS covers exactly these two
// plus whatever `candidateEvidence` derives, and a literal copy in the check
// would be a second declaration that drifts the first time either moves.
export const REASONING_FIELDS = ["leg_validity"];

// The owner reads the gate, not the spec (kogaki#520): every evidence key renders under one
// plain-register label and never by its key name.
// THE CANDIDATE SCHEMA, read from `src/candidate-schema.json` once.
export const CANDIDATE_SCHEMA_PATH = join(dirname(fileURLToPath(import.meta.url)), "candidate-schema.json");
let CANDIDATE_SCHEMA = null;
export function candidateSchema() {
  if (!CANDIDATE_SCHEMA) CANDIDATE_SCHEMA = JSON.parse(readFileSync(CANDIDATE_SCHEMA_PATH, "utf8"));
  return CANDIDATE_SCHEMA;
}
// A Candidate carries no reader value (kogaki#1699): the Brief's Reader start heading renders the
// Persona's prior-knowledge line and its Reader target heading the Thesis. A Candidate carrying a
// retired reader field is refused BY NAME with the message declared here.
export const RETIRED_READER_FIELDS = new Map([
  ["reader_target", "`reader_target` is a retired field (kogaki#1225, kogaki#1699) — the Reader target heading "
    + "renders the Thesis, which the Leg marked `reaches_target` attains; remove the field"],
  ["reader_start", "`reader_start` is a retired field (kogaki#1699) — the first Leg's entry condition is the "
    + "Persona's prior-knowledge line, which the Reader start heading renders; remove the field"],
  ["obligations", "`obligations` is a retired field (kogaki#1699) — the Obligations ledger is retired: what a Leg "
    + "takes up and leaves is its Move's `takes` and `leaves`, judged across the path; remove the field"],
  ["characteristic", "`characteristic` is a retired field (kogaki#1768) — one structure gives one Reader Path, so no "
    + "name tells it from a sibling; the Candidate gate renders its Legs; remove the field"],
  ["reader_experience", "`reader_experience` is a retired field (kogaki#1768) — one structure gives one Reader Path, "
    + "so no experience tells it from a sibling; the Candidate gate renders its Legs; remove the field"],
  ["opening_question", "`opening_question` is a retired field (kogaki#1216; its heading is removed by kogaki#1225) — "
    + "no Opening question is rendered, and no field authors one"],
]);

// The refusal for a Candidate carrying a retired field, or null. One
// predicate for the gate evidence, the adoption fill and the composition
// validator, so the three cannot disagree on which fields are retired.
export function retiredReaderFieldRefusal(c) {
  for (const [key, why] of RETIRED_READER_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(c || {}, key)) return `candidate ${c.candidate_id}: ${why}`;
  }
  return null;
}

// RETIRED REASONING FIELDS (kogaki#1247): a key inside `reasoning` the
// composer no longer authors and the gate no longer reads, refused BY NAME
// the same way a retired top-level Candidate field is -- one map, read by
// both per-unit classification (`validateReaderPathUnit`) and assembly's
// cross-Candidate pass (`assembleSelection`), so the two cannot disagree on
// which reasoning keys are retired.
export const RETIRED_REASONING_FIELDS = new Map([
  ["transition_continuity", "`reasoning.transition_continuity` is a retired field (kogaki#1247) — it was an "
    + "internal variable the gate never read; the Candidate's reasoning now carries only `leg_validity`, "
    + "and transition continuity is not restated under any key"],
  // THE THESIS ROW IS DERIVED (kogaki#1328, owner decision 2026-10-10): it is
  // rendered from each Strand's `coverage.role_in_thesis` and handed to the
  // Leg marked `reaches_target`, so a free-text account of how the path
  // closes the Thesis has no reader — the 2026-10-09 Brief carried one as a
  // single line of 1934 characters, repeating the coverage beside it.
  ["thesis_closure", "`reasoning.thesis_closure` is a retired field (kogaki#1328) — the Brief's Thesis row of "
    + "Closure is derived from each Strand's `coverage.role_in_thesis` and handed to the Leg marked "
    + "`reaches_target`; say what each Strand does in the Thesis under `coverage` and remove the field"],
]);

// The refusal for a Candidate whose `reasoning` object carries a retired
// key, or null.
export function retiredReasoningFieldRefusal(c) {
  const reasoning = c && c.reasoning;
  if (!reasoning || typeof reasoning !== "object") return null;
  for (const [key, why] of RETIRED_REASONING_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(reasoning, key)) return `candidate ${c.candidate_id}: ${why}`;
  }
  return null;
}

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
  ["leg_validity", "Does each leg stand on the material it cites?"],
  ["placement_count", "How much of the settled material does this path use?"],
  ["journey_coverage", "How much of the selected Journey material does this path use?"],
  ["bridges", "Which gaps did this path bridge, and on what reasoning?"],
];

// The path-review reasoning rides the same gate and is read by the same
// owner, so it renders under plain labels on the same rule. The areas are
// src/review.mjs's REVIEW_AREAS; the labels are theirs here because this
// file owns the gate's rendering.
export const REVIEW_LABELS = {
  rationale_stands: "Does each leg's reason survive without its Move name?",
  entailment: "What does the path claim follows from what, and does it?",
  prohibitions: "Does anything here go beyond what the material says?",
  semantic_economy: "Is the wording the composer's own, or mechanized?",
  arc_integrity: "Does the story still hold together in this order?",
  evaluation_levels: "What was observed about the path as a whole?",
};

// Spec-internal vocabulary, refused wherever it would reach the owner — a DENY, modelled on
// src/review.mjs's verdict-shaped-key refusal. Two mechanical shapes are refused:
//   * an internal identifier — `thesis_closure` and every snake_case sibling;
//   * a section reference — the literal specimen `\u00a76.1` and kin (written escaped here so
//     the sweep of kogaki#902 does not read this SPECIMEN as one of its own references).
// It reads the REGISTER of the gate's rendering, never whether the reasoning is good.
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
  // THE ADMISSIBLE-OVERRIDE SET (kogaki#934, owner selection 2026-09-06). The figure decision
  // mandates rendering composer-authored `leg_id`s into the Candidate label, so without an
  // override this guard refuses its own mandated caller and the selection gate collapses.
  // `exempt` is a Set the CALLER supplies from the rendering's own data: exempt by provenance,
  // never by spelling, so a term of art the composer did not author is still caught.
  const skip = exempt instanceof Set ? exempt : null;
  for (const m of text.matchAll(INTERNAL_IDENTIFIER_ALL)) {
    if (skip && skip.has(m[0])) continue;
    return { kind: "an internal identifier", token: m[0] };
  }
  const sec = text.match(SECTION_REFERENCE);
  if (sec) return { kind: "a section reference", token: sec[0] };
  return null;
}

// THE MINTED BRIEF'S SLOT CAPTIONS (kogaki#526) LIVE IN THE RECORD'S
// DECLARATION since kogaki#1328: `src/candidate-schema.json`'s `brief_record`
// carries one `caption` per key, written above the key as a comment for the
// owner who reads the file. `composeBrief` still holds them to the same
// vocabulary guard (`findInternalVocabulary` above), because a caption is
// this composer's own text and the owner reads it.

// Pure; exported for the check. Returns { error } naming what leaked and
// where, or {} when the rendering is clean.
export function denyInternalVocabulary(payload, exemptByOption) {
  // THE OVERRIDE SET IS PER-OPTION AND REACHES ONE SURFACE (kogaki#934): a Map from option id
  // to the tokens that option's own data put in its label (the figure clause's leg ids).
  // Per-option, so A's leg ids do not license B's label; option labels only, because the ask's
  // where/why/label, the free-text prompt and `o.rendering` are this file's text (kogaki#568).
  // Omitting the argument keeps the pre-#934 behaviour every other caller relies on.
  const overrides = exemptByOption instanceof Map ? exemptByOption : null;
  const surfaces = [
    ["the ask's where", payload.where],
    ["the ask's why", payload.why],
    ["the ask's label", payload.label],
    ["the free-text prompt", payload.free_text?.prompt],
  ];
  for (const o of payload.options || []) {
    // NO OVERRIDE ON THE LABEL (kogaki#1126). The exemption exists for the leg
    // ids the FIGURE CLAUSE renders, and kogaki#934 put it on the label because
    // that is where the clause was. The clause is now in the description, so a
    // label override licenses a token in a field nothing puts one in — the
    // widening kogaki#934's own comment refuses, left behind by the move rather
    // than introduced deliberately. The label is `<n>. <characteristic>`, which
    // the composing party writes and which no Harness clause injects ids into,
    // so it is walked with no exemption at all.
    surfaces.push([`option ${o.id}'s label`, o.label]);
    // THE DESCRIPTION IS WALKED, AND THE OVERRIDE TRAVELS WITH THE CLAUSE THAT
    // NEEDED IT (kogaki#1126). The figure clause renders this Candidate's own
    // leg ids, and kogaki#934 exempted them where they were: the label. They
    // are now in the description, so the exemption is here — the same
    // per-option Set, at the seat the producer actually writes to. Widening it
    // to both surfaces at once would license a token in a field nothing put it
    // in, which is the allowlist-shaped failure kogaki#934's own comment
    // refuses; and leaving the description unwalked would be the other half of
    // that failure, a leak escaping into a field the predicate stopped reading.
    surfaces.push([`option ${o.id}'s description`, o.description, overrides?.get(o.id)]);
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

// ---- THE TWO LEDGER FIELDS, READ FROM ONE DECLARATION (kogaki#1129).
// `coverage` and `unused` are declared in `src/candidate-schema.json`, the file
// the judge is shown; this enforces that declaration from `compose_path`'s validator inside
// the re-ask window, and lives here so the two readers share one function.
// IT REFUSES A SHAPE AND NEVER A JUDGMENT: an OPEN item stays a disclosure here, and only the
// key names are a declared format.
// Pure; returns a refusal string or null. `strandIds` is the Brief's closed set where the
// caller holds it, and the checks needing it are skipped where it is empty.
export function candidateLedgerRefusal(c, strandIds = []) {
  const where = `candidate ${c?.candidate_id}`;
  if (c?.coverage !== undefined) {
    if (!c.coverage || typeof c.coverage !== "object" || Array.isArray(c.coverage)) {
      return `${where}: \`coverage\` is an OBJECT keyed by selected Strand id, each value carrying `
        + `\`role_in_thesis\` (src/candidate-schema.json, \`coverage\`). Received `
        + `${Array.isArray(c.coverage) ? "an array" : JSON.stringify(typeof c.coverage)}`;
    }
    for (const [id, v] of Object.entries(c.coverage)) {
      if (strandIds.length > 0 && !strandIds.includes(id)) {
        return `${where}: \`coverage\` carries the key ${JSON.stringify(id)}, which is outside the `
          + `Brief's closed Strand set (${strandIds.join(", ")}) — the set closed at mint and a Brief `
          + `never fetches`;
      }
      if (!v || typeof v !== "object" || Array.isArray(v) || typeof v.role_in_thesis !== "string"
          || v.role_in_thesis.trim() === "") {
        return `${where}: \`coverage.${id}\` carries no non-blank \`role_in_thesis\` — that key is what `
          + `the Brief's Strand coverage section renders beside the Strand's derived placement, so a `
          + `role stated under any other key renders as "(not stated by the composer)". The value `
          + `carries ${JSON.stringify(v && typeof v === "object" ? Object.keys(v) : v)} `
          + `(src/candidate-schema.json, \`coverage\`)`;
      }
    }
  }
  if (c?.unused !== undefined) {
    if (!c.unused || typeof c.unused !== "object" || Array.isArray(c.unused)) {
      return `${where}: \`unused\` is an OBJECT keyed by \`L<n>\` or \`L<n>.journey\`, each value the `
        + `disclosure text for material this path leaves unplaced — an array carries no key to look a `
        + `disclosure up under, so every unplaced Strand would render the Harness's default sentence `
        + `and the composer's reason would be lost (src/candidate-schema.json, \`unused\`). Received `
        + `${Array.isArray(c.unused) ? "an array" : JSON.stringify(typeof c.unused)}`;
    }
    for (const [key, text] of Object.entries(c.unused)) {
      const strand = /^(L[0-9]+)(\.journey)?$/.exec(key);
      if (!strand) {
        return `${where}: \`unused\` carries the key ${JSON.stringify(key)} — the keys are a selected `
          + `Strand id (\`L2\`) or that Strand's Journey material (\`L2.journey\`), and a key in neither `
          + `form is looked up by nothing`;
      }
      if (strandIds.length > 0 && !strandIds.includes(strand[1])) {
        return `${where}: \`unused\` carries the key ${JSON.stringify(key)}, which names a Strand `
          + `outside the Brief's closed set (${strandIds.join(", ")})`;
      }
      if (typeof text !== "string" || text.trim() === "") {
        return `${where}: \`unused.${key}\` carries no disclosure text — the value is why this path `
          + `leaves the material unplaced, which is the claims rule's third move said out loud`;
      }
    }
  }
  return null;
}

// The placement count is a PER-CANDIDATE composition-time value: at assembly the Brief is
// pre-adoption, so each Candidate's evidence is computed MECHANICALLY from its own legs against
// the Brief's closed Strand set, counted in placements after that Candidate's composition.
export function candidateEvidence(c, strandIds, journeyIds = []) {
  const place = placements(c.legs, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  // journey register as a Candidate axis MUST 1, applied PER CANDIDATE: journey register is an axis of
  // Candidate differentiation, so the place-or-disclose rider is evidence
  // each Candidate owes the gate separately — two Candidates over the same
  // Strand set may place different journey material, and a per-Brief figure
  // would average exactly the difference the owner is selecting on.
  const jplace = journeyPlacements(c.legs, journeyIds);
  const jplaced = journeyIds.filter((id) => jplace.get(id).length > 0);
  // BRIDGE DISCLOSURE (the Bridge Leg v16, kogaki#524). Approval is post-hoc, so the one gate
  // carries what was inserted and why, from THIS Candidate's own legs. A Bridge Leg is
  // recognised by `bridges` naming the pair it sits between; its reasoning is its entailment
  // reasoning.
  const bridges = (c.legs || []).filter((st) => st && Array.isArray(st.bridges) && st.bridges.length > 0);
  const bridgeLine = bridges.length === 0
    ? "no gaps were bridged — the path's transitions stand on the material as composed"
    : bridges.map((st) => {
        const between = st.bridges.join(" → ");
        const why = st.entailment_reasoning
          || "NO REASONING CARRIED — abnormal: a bridge owes its entailment reasoning";
        return `between ${between}: ${why}`;
      }).join(" | ");

  return {
    bridges: bridges.length === 0
      ? bridgeLine
      : `${bridges.length} bridge(s) inserted — ${bridgeLine}`,
    placement_count: `${placed.length} of ${strandIds.length} selected Strand(s) placed, counted in placements after this Candidate's composition${placed.length < strandIds.length ? " — the unplaced disclose at adoption" : ""}`,
    journey_coverage: journeyIds.length === 0
      ? "no selected Strand carries Journey material — nothing to place for this Brief, and nothing missing"
      : `${jplaced.length} of ${journeyIds.length} Journey-bearing Strand(s) placed by this Candidate`
        + `${jplaced.length < journeyIds.length ? ` — OMITTED and disclosed: ${journeyIds.filter((id) => jplace.get(id).length === 0).join(", ")}` : ""}`,
  };
}

// DECISION-GRADE DISCLOSURE, composed for the gate (kogaki#909, owner ruling 2026-09-06): one
// paragraph per declared decision-grade field the Candidate carries, rendering the field's own
// `statement` and never a re-description. No field is decision-grade at present (kogaki#1307
// removed `revise_residue`), so this renders nothing; the table-driven loop reaches a field
// declared later with no edit here; a Candidate that owed nothing renders what kogaki#859 left
// it. A field with no readable statement says so, never a blank.
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
export function assembleSelection(reviewed, record) {
  // THE TABLE IS CHECKED BEFORE IT IS TRUSTED (kogaki#909). A malformed
  // disclosure table would make every surface obligation below vacuous while
  // reading exactly like a Candidate set that owed none — the degrades-to-zero
  // shape a damaged table would otherwise take, arriving by a different door.
  const table = validateDisclosureTable();
  if (table.error) return { error: `the disclosure table is malformed: ${table.error}` };
  const all = reviewed?.candidates;
  if (!Array.isArray(all)) return { error: "input is the attach output: { candidates: [...] } (src/review.mjs)" };
  const cands = all;
  // ONE READER PATH PER ARTICLE (kogaki#1768): one structure gives one Reader
  // Path, so the Candidate gate offers it beside the premise's negation.
  if (cands.length !== 1) {
    return { error: `${cands.length} Candidate(s) — one structure gives one Reader Path, and the Candidate gate offers that one beside the premise's negation (kogaki#1768)` };
  }
  for (const c of cands) {
    if (typeof c.candidate_id !== "string" || c.candidate_id === "") return { error: "every Candidate carries a candidate_id" };
    const retiredReader = retiredReaderFieldRefusal(c);
    if (retiredReader) return { error: retiredReader };
    if (!Array.isArray(c.legs) || c.legs.length === 0) return { error: `candidate ${c.candidate_id}: no legs — a Candidate is an ordered sequence of Legs (the Reader Path artifact and its five blocks)` };
    for (const a of REVIEW_AREAS) {
      if (typeof c.review?.[a] !== "string" || c.review[a] === "") {
        return { error: `candidate ${c.candidate_id}: review area ${JSON.stringify(a)} absent — an unreviewed Candidate cannot be presented (the judgment rule; run src/review.mjs attach first)` };
      }
    }
    for (const f of REASONING_FIELDS) {
      if (typeof c.reasoning?.[f] !== "string" || c.reasoning[f] === "") {
        return { error: `candidate ${c.candidate_id}: composition-time reasoning ${JSON.stringify(f)} absent — each Candidate carries leg validity and Thesis closure as its gate evidence (the Candidate gate)` };
      }
    }
    const retiredReasoning = retiredReasoningFieldRefusal(c);
    if (retiredReasoning) return { error: retiredReasoning };
  }
  const strandIds = briefStrandIds(record);
  if (strandIds.length === 0) {
    return { error: "the Brief carries no Strands — not a minted Brief (assembly runs over the Brief whose closed set the Candidates composed from)" };
  }
  // `candidateEvidence` IS NO LONGER CALLED HERE, and that follows from the
  // ruling rather than being tidying beside it: computing a value the payload
  // does not carry is precisely "an entry with no reader". It stays EXPORTED
  // and stays exercised by `checks/check-brief-compose.sh`, because journey register as a Candidate axis's
  // journey-coverage disclosure and the Bridge Leg's bridge disclosure are specified
  // behaviours whose display this ruling removed and whose future is an open
  // decision — deleting the derivation would settle that decision by making
  // one arm unbuildable, which is not this issue's to do.
  // THE OPTION IS THE HARNESS'S (kogaki#1768): the Reader Path's Legs are the
  // reading above the question (`readerPathReading`), never the option, so the
  // option names the act and counts what it adopts (kogaki#1775).
  const options = cands.map((c) => {
    return {
      id: c.candidate_id,
      label: "Follow this Reader Path",
      description: `${c.legs.length} Leg${c.legs.length === 1 ? "" : "s"}, one per relation the Thesis reaches`,
      rendering: decisionGradeRendering(c),
    };
  });
  // THE OBLIGATION IS GENERATED BY THE EVIDENCE, NEVER BY A CALLER REMEMBERING TO LOOK
  // (kogaki#909, acceptance item 3): a declared decision-grade field its rendering did not emit
  // is REFUSED here, so a `decision` entry added without a `decisionGradeRendering` case fails
  // this assertion. It cannot see a key nobody declared.
  // THE COMPARISON IS AGAINST WHAT IS OWED, NEVER AGAINST ZERO (PR #931 round 1, finding 3),
  // so a partial regression is caught as well as a total one.
  for (const [i, c] of cands.entries()) {
    const owed = disclosureFieldsPresent(c, "decision");
    const rendered = (options[i].rendering || []).length;
    if (owed.length !== rendered) {
      return { error: `candidate ${c.candidate_id} carries ${owed.length} declared `
        + `decision-grade disclosure field(s) — ${owed.join(", ")}, which reach the owner at `
        + `${disclosureSurface(owed[0]) || "no declared surface"} — and this gate composed `
        + `${rendered} rendering(s) for them. Evidence that bears on the choice is owed BEFORE `
        + `the choice, because the owner acts on what they see and not on what the record holds `
        + `(the Candidate gate). Either render it here or regrade the field in `
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
    label: "None of these",
    // THE NEGATION CARRIES ITS OWN DESCRIPTION (kogaki#1126). It is an option of
    // this gate like any other, so the same rule reaches it: its id is a join
    // key and never content. Split at the same seam as the Candidates — the
    // label names the answer, the description says what answering it does — so
    // the owner reads one shape down the column rather than three short labels
    // and one long one.
    description: "The Thesis or the selected set is what should change; no Reader Path lands in the Brief.",
    negates_premise: true,
  });
  const payload = {
    id: "brief-candidate-selection-payload",
    kind: "proposal",
    where: "the Brief's sequence — which composed Reader Path the article follows",
    why: "the machine's premise, rendered: the adopted Thesis and its structure support one derived Reader Path — the Legs above, one per relation the Thesis reaches, each saying what its relation holds",
    label: "Adopting the Reader Path writes it into the Brief's sequence and fills the Brief's closing sections — which Strands it uses, and which the Thesis leaves",
    options,
    // THE PROMPT SAYS WHAT THE RUNTIME DOES (kogaki#950): SPEC-draft-pipeline v35 rules free
    // text at this gate a COMMENT, and the owner reads this prompt before the refusal below.
    // THE COPY NAMES THE ARMS that do decide. `consulted: product-lab@5b0d040b02de3917432d455dc578ae0a06d8ff7b LESSONS.md:24`
    // — "An approval gate executes the arm it captured — an owner-gated act gates the decision,
    // not the keystrokes." Wording is the owner's, selected 2026-09-06 (acceptance item 2).
    free_text: { accepted: true, prompt: "Or say in your own words what should happen instead — free text here is a COMMENT: it adopts no Reader Path and nothing is written. Only selecting a Candidate or answering none-of-these decides, and a comment on its own returns you to this gate." },
  };
  // THE TRIPWIRE, LAST: the rendering the owner will read is checked for
  // spec-internal vocabulary before it can be presented. It does not stand
  // in for the plain labels above — it is what catches the NEXT term of art
  // that finds a rendering path (kogaki#520).
  // No override set (kogaki#1768): the option's label and description are the
  // Harness's own words, and carry no Leg id.
  const leak = denyInternalVocabulary(payload);
  if (leak.error) return leak;
  return { payload };
}

// THE OPTION SET THE CANDIDATE GATE OFFERED (kogaki#891), derived from the same
// composer the gate itself is raised from. A capture binds to the option set
// it answered — the same candidate id offered beside different alternatives is
// a different question — so both the gate executor and adoption must compute
// the set the SAME way, which is why neither of them enumerates it and both
// call this.
export function selectionOptionIds(reviewed, record) {
  const r = assembleSelection(reviewed, record);
  if (r.error) return { error: r.error };
  return { ids: r.payload.options.map((o) => o.id), options: r.payload.options, payload: r.payload };
}

// The adopted Candidate's Reader Path lands in the Brief (the settled structure section): sequence
// through the Leg's shape fill, and tradeoffs from its reasoning; the Thesis row of Closure is derived (kogaki#1328).
export function adoptCandidate(record, reviewed, candidateId, instantiation = {}) {
  const cands = reviewed?.candidates || [];
  const c = cands.find((x) => x.candidate_id === candidateId);
  if (!c) {
    return { error: `candidate ${JSON.stringify(candidateId)} is not in the reviewed set `
      + `(${cands.map((x) => x.candidate_id).join(", ") || "empty"}) — the owner adopts from what the gate offered` };
  }
  // A RETIRED READER FIELD IS REFUSED BEFORE ANYTHING IS WRITTEN (kogaki#1225, kogaki#1699).
  const retiredReader = retiredReaderFieldRefusal(c);
  if (retiredReader) return { error: `${retiredReader}. Nothing was written to the Brief.` };
  // A RETIRED REASONING KEY IS REFUSED AT ADOPTION TOO (kogaki#1328), by the
  // same map composition and assembly read: `reasoning.thesis_closure` would
  // otherwise be carried to the write in silence, and the Brief's Thesis row
  // is derived rather than written from it.
  const retiredReasoning = retiredReasoningFieldRefusal(c);
  if (retiredReasoning) return { error: `${retiredReasoning}. Nothing was written to the Brief.` };
  // SELECTED HALF — the Candidate-selection gate (kogaki#891). Sited HERE, above every JUDGMENT
  // clause, because it binds the subject's identity: judging a record about Candidate A when the
  // owner chose B is wasted work ending in a refusal naming the wrong thing. It sits BELOW the
  // two clauses establishing the Candidate is a Candidate at all; selection is the first about
  // the OWNER. The absence is refused here, not in the validator: "not selected" is a
  // fact about an act that did not happen, not about a capture's shape.
  if (instantiation.selection === undefined) {
    return { error: `candidate ${candidateId}: which Reader Path the Brief follows is the OWNER'S choice at the Candidate gate `
      + `Candidate-selection gate, and until kogaki#891 it reached this runtime as \`--candidate\` — an argument the `
      + `model composed from the question-UI answer, carrying no evidence of any kind. Raise the gate with `
      + `\`assemble.mjs gate-candidate --declare\`, record the owner's click with \`gate-candidate --capture\`, and pass `
      + `--selection <capture>. Nothing was written.` };
  }
  const offered = selectionOptionIds(reviewed, record);
  if (offered.error) return { error: `the Candidate gate selection gate cannot be recomposed, so the captured answer cannot be judged against what was offered: ${offered.error}` };
  const selDigest = ownerGateDigest("brief-candidate-selection", offered.ids);
  const chose = validateOwnerAnswer(instantiation.selection, "brief-candidate-selection", selDigest);
  if (chose.error) return { error: `candidate ${candidateId}: ${chose.error}` };
  if (chose.option === "none-of-these") {
    return { error: `candidate ${candidateId}: the owner answered "none-of-these" at the Candidate gate Candidate-selection gate — `
      + `the Thesis or the selected set is what should change, and NO Reader Path lands in the Brief. `
      + `Nothing was written.` };
  }
  // FREE TEXT IS NOT A SELECTION (kogaki#914, owner ruling 2026-09-06). The free-text answer is
  // reachable, and without this arm it fell through to a refusal naming a candidate `undefined`.
  // Refused rather than adopted (kogaki#914 acceptance item 2): a Candidate is a composed
  // sequence of Legs with Move bindings, and resolving prose into one is the judgment layer
  // kogaki#891 removed; the sibling gate that reached the same disposition is gone at
  // kogaki#1108. The thesis gate admits free text because there the answer IS the value.
  // Sited with the negation, above every judgment clause. An answer carrying BOTH an option and
  // free text is a selection with a comment, so this reads the option's absence.
  if (chose.option === undefined) {
    return { error: `candidate ${candidateId}: the owner answered the Candidate gate Candidate-selection gate in their own `
      + `words rather than selecting a Reader Path — ${JSON.stringify(chose.free_text)}. Free text at this gate `
      + `is a COMMENT, not a selection: a Candidate is a composed sequence of Legs, so there `
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

  const filled = fillBrief(record, {
    legs: c.legs,
    coverage: c.coverage || {},
    // THE RENDERINGS RECORD (kogaki#1494), written beside the Reader Path
    // composed under it; `null` where the run carries none.
    renderings: instantiation.renderings === undefined ? null : instantiation.renderings,
  });
  if (filled.error) return filled;
  let out = filled.record;
  // WHAT ADOPTING THE PATH GAVE UP, AND WHAT IT BRIDGED (kogaki#1768): the
  // Strands the Thesis does not reach, read from the mint's `not_carried`
  // entries; and no bridge, since every Leg says a relation the claims state
  // and the apex is the one connection no claim states (kogaki#1775).
  const left = (out.strand_coverage || []).filter((e) => typeof e.not_carried === "string").map((e) => e.strand);
  let r = fillSlot(out, "tradeoffs", { gave_up: left.length
    ? `The Thesis does not reach ${left.join(", ")}; the article leaves ${left.length === 1 ? "that Strand" : "those Strands"} out.`
    : "Nothing: the Thesis reaches every settled Strand." });
  if (r.error) return r;
  out = r.record;
  r = fillSlot(out, "bridged", { bridges: "No gap was bridged: every Leg says a relation the claims state, and the Thesis is the one connection no claim states." });
  if (r.error) return r;
  out = r.record;
  const structure = record.structure || null;
  const reach = structure && Array.isArray(structure.reach) ? structure.reach : [];
  return { record: out, placed: filled.placed, total: filled.total, selected_by: chose.tool_use_id,
    reach: reach.length, unreached: left };
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

// EXPORTED AT kogaki#1108 so the Brief workflow table's `assemble_candidates`
// state binds THIS case rather than a second caller of `assembleSelection`. The
// state is the table's row; the case is the work; one function is what keeps the
// two from drifting.
export function cmdAssemble(args) {
  const reviewed = JSON.parse(readFileSync(argString(args, "reviewed",
    "assemble needs --reviewed <json> — src/review.mjs attach's output"), "utf8"));
  const brief = readBriefRecord(argString(args, "brief",
    "assemble needs --brief <theses/<slug>/brief.yaml> — the composed Brief whose ledger state and placement count are part of the evidence"));
  if (brief.error) fail(brief.error);
  const out = argString(args, "out",
    "assemble needs --out <path> — the machine-local file the selection payload rides in (never a tree *.proposal.json — the Candidate gate registers no new record class)");
  if (args.differentiation !== undefined) {
    fail("--differentiation is retired (kogaki#1768): the `differentiation` state and its record are gone, and no Leg binds a Move to check an opening against. Nothing was written.");
  }
  const r = assembleSelection(reviewed, brief.record);
  if (r.error) fail(r.error);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify(r.payload, null, 2) + "\n");
  console.log(`selection payload: ${r.payload.options.length - 1} Candidate(s) plus the first-class negation, each option carrying its id and the Harness's own label and nothing else — never a verdict, and the composition-time reasoning stays in the reviewed Candidates it was composed from rather than being copied here (the Candidate gate, kogaki#859). Written: ${out}`);
}

// EXPORTED AT kogaki#1108 under the name its dispatcher case carries, for the
// `adopt_candidate` state. `cmdAdopt` locally, `cmdAdoptCandidate` to an
// importer: the bare name is ambiguous across the two runtimes that both have
// an adopt, and a state binding reads better naming the subcommand.
export function cmdAdoptCandidate(args) {
  const briefPath = argString(args, "brief", "adopt-candidate needs --brief <theses/<slug>/brief.yaml>");
  const reviewed = JSON.parse(readFileSync(argString(args, "reviewed",
    "adopt-candidate needs --reviewed <json> — the reviewed Candidates the gate offered"), "utf8"));
  // `--candidate` NAMES the Candidate being adopted; it no longer CARRIES the
  // owner's answer (kogaki#891). The answer is read from --selection, and this
  // argument is refused when the two disagree — a selector the model composes
  // is admissible exactly because the evidence beside it is not.
  const id = argString(args, "candidate",
    "adopt-candidate needs --candidate <id> — which Candidate is being adopted. It is checked AGAINST the "
    + "owner's recorded answer at the Candidate gate selection gate (--selection) and never stands in for it.");
  const brief = readBriefRecord(briefPath);
  if (brief.error) fail(brief.error);
  // THE SPECIALIZATION RECORD IS RETIRED (kogaki#1768): no Leg binds a Move, so
  // no Leg's Move fit is judged at the Brief, and a caller still passing the
  // record is told so rather than ignored.
  if (args.specialization !== undefined) {
    fail("--specialization is retired (kogaki#1768): no Leg binds a Move, so the Brief judges no Leg's Move fit; the paragraph Move is ParagraphPlan's. Nothing was written.");
  }
  const instantiation = {};
  // the Candidate gate's selection capture, read the same way and for the same reason: an
  // omitted flag reaches `adoptCandidate` as `undefined` and is refused there,
  // which is what makes the gate unskippable, while an unreadable file is a
  // fault rather than an absence.
  if (typeof args.selection === "string" && args.selection !== "") {
    try { instantiation.selection = JSON.parse(readFileSync(args.selection, "utf8")); }
    catch (e) { fail(`the selection capture at ${args.selection} cannot be read (${e.message}) — the Candidate gate's owner answer is an input to adoption, so an unreadable one is not an absent one and is not treated as one`); }
  }
  // THE RENDERINGS RECORD (kogaki#1494): the `compose_path` state's judged
  // record, read whole; its `renderings` list is what adoption writes into the
  // Brief and refuses an `introduces` entry against. Absent, the run predates
  // it and nothing is written.
  if (typeof args.renderings === "string" && args.renderings !== "") {
    let r;
    try { r = JSON.parse(readFileSync(args.renderings, "utf8")); }
    catch (e) { fail(`the renderings record at ${args.renderings} cannot be read (${e.message}) — an unreadable record is not an absent one and is not treated as one (kogaki#1494)`); }
    instantiation.renderings = r && r.renderings;
  }
  // `--ratification` IS REFUSED BY NAME (kogaki#1108), never ignored. The
  // specialization-ratification gate is gone and the record is disclosure; a
  // silently accepted flag would let a caller believe an owner act is still
  // being read, and a silently IGNORED one is a caller getting a different act
  // than it asked for.
  if (args.ratification !== undefined) {
    fail(`--ratification is REMOVED (kogaki#1108). The brief-specialization-ratification gate is gone from `
      + `src/gate-registry.json: the specialization record stays a typed judgment the executor validates, and it is `
      + `DISCLOSURE rather than a write unlock — one sentence in the closing summary below. A passing record is the `
      + `unlock again, and the reason the gate stood over it (the Model owning the composition) is what the Brief `
      + `workflow table removes. There is no replacement flag and no capture to pass.`);
  }
  const r = adoptCandidate(brief.record, reviewed, id, instantiation);
  if (r.error) fail(r.error);
  // Per-block snapshots (kogaki#523): adoption is the ONE surviving write
  // that lands blocks in an existing Brief — the sequence (through the same
  // fillBrief the retired `fill` CLI called, the durable home and the entry point v17) and the closure
  // fields land in this single write, so its before/after pair traces both.
  // Machine-local trace; a failure warns and never blocks the write.
  const text = briefRecordText(r.record);
  const snapSeq = snapshotBrief(briefPath, "adopt-candidate", "before", brief.text);
  writeFileSync(briefPath, text);
  snapshotBrief(briefPath, "adopt-candidate", "after", text, snapSeq);
  console.log(`candidate selection (the Candidate gate): ${id} was the owner's own answer at the brief-candidate-selection gate (AskUserQuestion ${r.selected_by}) — read from the capture, never carried by --candidate (kogaki#891)`);
  // ONE SENTENCE, ON EVERY ADOPTION (kogaki#1768, kogaki#1775): the structure's
  // reach — one Leg per relation and higher-order relation the Thesis reaches —
  // and the Strands the Thesis leaves.
  console.log(`structure: one Leg for each of the ${r.reach} relation(s) and higher-order relation(s) the Thesis reaches; `
    + `${r.unreached.length ? `Strands not carried: ${r.unreached.join(", ")}` : "every Strand is carried"}.`);
  console.log(`adopted ${id} — its Reader Path is the Brief's; its Strand coverage and tradeoffs are filled from it; Strand placement ${r.placed} of ${r.total}. READ THIS ONE (owner document): ${briefPath}`);
}

// ---------------------------------------------------------------------------
// `ratify-specialization` IS DELETED, AND LEAVES NO STUB (kogaki#1108): its gate is gone from
// `src/gate-registry.json` and the record is disclosure. A deprecated entry point is an entry
// point (kogaki#1027 item 5), so a leftover invocation fails as an unknown subcommand. Its
// workspace helper went with it at kogaki#1108.

// ---------------------------------------------------------------------------
// `gate-candidate` IS DELETED, AND IT LEAVES NO STUB (kogaki#1108). Under the Brief workflow
// table (`src/brief-workflow.json`) the executor composes the declaration at the
// `CANDIDATE_SELECTION` wait, `.claude/hooks/write-gate-capture.py` records the click, and
// `.claude/hooks/advance-brief.py` re-enters the executor (SPEC-terrain, "A removed entry
// point is DELETED, and leaves no stub"). A leftover invocation fails as an unknown subcommand.
// `selectionOptionIds` survives, still exported: the option composer, the GATE_WORK composer
// and adoption share one computation of the option set. `briefGateDir` went with it;
// `src/review.mjs`'s attach ledger is now the run workspace's only writer.

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "assemble": cmdAssemble(args); break;
    case "adopt-candidate": cmdAdoptCandidate(args); break;
    default: fail("usage: assemble.mjs assemble --reviewed <json> --brief <path> --out <path>\n  | adopt-candidate --brief <path> --reviewed <json> --candidate <id> --selection <capture> [--renderings <json>]");
  }
}
