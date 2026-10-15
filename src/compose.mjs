#!/usr/bin/env node
// compose — the Leg-record runtime over the Brief's settled materials
// (SPEC-draft-pipeline, the Leg's shape, the claims rule, the settled
// structure section and the obligations ledger;
// kogaki#489, story 1.73).
//
// Machine-side blocks 1-2 of the Reader Path artifact's five: path
// composition → Move binding.
// THIS RUNTIME RECORDS; IT NEVER JUDGES AND NEVER COMPOSES. The composing
// producer is the sitting that authors the Leg records toward the adopted
// Thesis; this runtime validates their SHAPE (the Leg's shape's fields — a schema
// question), fills the Brief's typed unfilled slots (the settled structure section sequence,
// strand_coverage; the obligations ledger), and takes the Strand placement count AFTER
// composition, in placements, disclosing an unplaced selected Strand rather
// than dropping it (the read-not-invented rule's completeness rider;
// the obligations ledger). Every MUST of the
// composition design is JUDGMENT-CLASS and is judged at path review (the judgment rule,
// story 1.74) — nothing here is a lint over a judgment: a missing field is
// refused, a weak rationale is not.
//
// THE CLAIMS ARE RECORDED FOR REVIEW, NOT VERDICT-ED (story 1.73 SQ2): a
// Leg carries typed claims (the claims rule) and, where a proposition is
// not explicit in the material, the `entailed` flag WITH its entailment
// reasoning — recorded here so path review and the human gate can judge
// them. No grounds-test verdict is produced anywhere in this file.
//
// A CLAIM IS ONE PROPOSITION DERIVED FROM A STRAND, AND NOTHING ELSE (kogaki#1095).
// The type set was three — `strand`, `leg_effect`, `reader_assumption` — and
// the Leg Packet renders every claim under one instruction: these are what
// this Leg may ASSERT. A `leg_effect` claim is inherited reader state and a
// `reader_assumption` claim is a presupposed premise; neither is an
// assertion, so a passage that realizes its Leg correctly never states them
// and the Blind Reader never recovers them. `claims-unused` failed on 8 of 8
// Legs of the first full review run against premise-type claims alone — a
// comparison whose declared side carries a category its reverse side cannot
// produce measures nothing. Inherited state was already carried twice, by
// `reader_state_before` and by the computed `already knows` ledger; the
// premise claims were a third copy. THIS FILE IS THE CARRIER: the type set
// and the claim line serialization both live here, which is what makes a
// non-Strand claim UNWRITABLE rather than discouraged. Removing the brief
// skill and the pipeline spec from the tree leaves the refusal standing.
//
// MOVE BINDING CHANGES THE TYPE OF NOTHING (the Leg and the Move it binds): `move` is REQUIRED on every
// Leg (the Leg's shape v18, kogaki#642 — the Move is a Leg's State component, and this
// file is the carrier the spec names for it), and the binding is still a
// recorded field, never a generator: this runtime reads the rationale
// before it reads the move name only in the trivial sense that it validates
// rationale presence; the order invariant itself is invisible in the
// artifact and is carried by the grounds test, judged at review.
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
//   the Leg and the Move it binds
//       SPEC-draft-pipeline
//   the Leg's shape
//       SPEC-draft-pipeline
//   the Bridge Leg
//       SPEC-draft-pipeline
//   the Leg-Move instantiation contract
//       SPEC-draft-pipeline
//   the owner gate over a passing specialization record
//       SPEC-draft-pipeline
//   the reader-knowledge ledger
//       SPEC-draft-pipeline
//   the Move exemplar predicate — RETIRED
//       SPEC-draft-pipeline
//   the Section grouping
//       SPEC-draft-pipeline
//   the figure decision
//       SPEC-draft-pipeline
//   the Reader Path artifact's five
//       SPEC-draft-pipeline
//   the claims rule
//       SPEC-draft-pipeline
//   the grounds test
//       SPEC-draft-pipeline
//   the judgment rule
//       SPEC-draft-pipeline
//   the settled structure section
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
//   the constraints that survive
//       SPEC-draft-pipeline
//   payload and answer capture
//       SPEC-gate-carrier
//
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { laneDir } from "./runs.mjs";
import { stringifyYaml, parseYaml } from "./yaml.mjs";
import { relFromRepo } from "./workflow/run-record.mjs";

function fail(msg) {
  process.stderr.write(`compose: ${msg}\n`);
  process.exit(1);
}

// ---- per-block Brief snapshots (kogaki#523) ----
// Machine-local debugging trace with the run's lifetime, NEVER owner state:
// each command that lands a block in the Brief snapshots the FULL document
// into the run workspace (runs/brief/<slug>/snapshots/, kogaki#750) before and
// after its landing write, so a later sitting can inspect what a block
// changed and trace a defect backward. FULL snapshots rather than per-block
// diffs: a diff is derivable from two adjacent snapshots, while
// reconstructing a document from diffs needs a base that would itself be a
// snapshot. The helper lives HERE because this module is the shared import
// of both surviving write sites (brief.mjs mint, assemble.mjs
// adopt-candidate — the `fill` CLI was retired at the durable home and the entry point v17 and its composer
// `fillBrief` writes nothing itself).
//
// A snapshot failure WARNS AND CONTINUES — the trace never gates the write
// it traces. Returns the sequence number used, so a `before` call's seq can
// be handed to its paired `after`; on failure it returns the seq it was
// given (null when none), still harmlessly.
export function snapshotBrief(briefPath, stage, phase, content, seq = null) {
  try {
    const slug = basename(dirname(resolve(briefPath)));
    const dir = join(laneDir("brief"), slug, "snapshots");
    mkdirSync(dir, { recursive: true });
    if (seq === null) {
      let max = 0;
      for (const f of readdirSync(dir)) {
        const m = /^([0-9]{3})-/.exec(f);
        if (m) max = Math.max(max, Number(m[1]));
      }
      seq = max + 1;
    }
    writeFileSync(join(dir, `${String(seq).padStart(3, "0")}-${stage}-${phase}.yaml`), content);
    return seq;
  } catch (e) {
    process.stderr.write(`compose: Brief snapshot ${stage}/${phase} skipped `
      + `(${e && e.message ? e.message : e}) — the trace never blocks the write it traces (kogaki#523)\n`);
    return seq;
  }
}

// ---- THE LEG SCHEMA IS A FILE, AND THIS IS ITS READER (kogaki#1108). ------
//
// `src/leg-schema.json` carries every Leg field with its description, and it
// is read TWICE: the Brief workflow table's path-composition state renders it
// into the judge's prompt, and this file reads its field set to validate what
// comes back. That is the whole of the change — before it, the only Harness
// text carrying what a field MEANS was a refusal string, seen only when shape
// had already failed, and the shape the Model composed against was prose in
// `.claude/skills/brief/SKILL.md`.
//
// THE FIELD SET IS READ; THE PREDICATES ARE NOT. A description in that file is
// text for the Model and is never matched against a value — which is the
// judgment rule holding, one layer down: the schema declares that `rationale`
// is required and what it is for, and whether a given rationale is any good
// stays judged at path review. So what this reader takes from the file is
// exactly the REQUIRED/OPTIONAL partition and the claim rules, and the
// type-shaped assertions below stay written here, beside the refusal text they
// produce.
//
// WHY READ IT AT ALL RATHER THAN KEEPING THE LIST HERE. Two carriers of one
// field set drift, and the drift is invisible: a field added to the prompt and
// not to the validator is composed and silently ignored, and a field added to
// the validator and not to the prompt is refused after the Model was never
// told about it. The prompt and the refusal cannot disagree when there is one
// file.
let LEG_SCHEMA = null;
export function legschema() {
  if (LEG_SCHEMA) return LEG_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "leg-schema.json");
  LEG_SCHEMA = JSON.parse(readFileSync(p, "utf8"));
  return LEG_SCHEMA;
}

// The required field set, read from the schema. A field whose `required` is
// true is one a Leg record without it is not a Leg record.
export function requiredLegFields() {
  return Object.entries(legschema().fields)
    .filter(([, d]) => d && d.required === true)
    .map(([name]) => name);
}

// The claim type vocabulary and the retired types, read from the same file
// rather than held as two constants here (kogaki#1095 put them in this module;
// kogaki#1108 moves the CARRIER to the schema and leaves the refusals here).
function claimTypes() {
  return new Set(legschema().claim.types);
}
function retiredClaimTypes() {
  return new Map(Object.entries(legschema().claim.retired_types || {}));
}
// The Journey use vocabulary, read from the schema for the reason the claim
// types are (kogaki#1111): the schema is rendered into the composition prompt
// and read back here, so the set the composer is shown and the set the refusal
// enforces are one file and cannot disagree.
function journeyUses() {
  return new Map(Object.entries(legschema().journey.uses));
}
const SLOT = "*(awaiting composition)*";

// ---- THE RULES OVER THE WHOLE PATH, READ FROM THE SCHEMA (kogaki#1147) ----
//
// The field descriptions above are rendered into the composition prompt and
// the field SET is read back here. The rules over the whole path had neither
// half: `validateLegs` and `sectionGroupingRefusal` enforced the Section
// grouping, the `depends_on` ordering, the uniqueness of an id and the claim
// cardinality, and no text a composer reads before composing stated any of
// them. Two /brief runs on 2026-09-18 died at `compose_path` on the Section
// grouping's rule 4 having satisfied every field-level rule they were shown:
// the rule can be met by chance on a first attempt, and otherwise is learned
// from a refusal that has already spent one of three attempts.
//
// SO THE REFUSAL TEXT IS THE SCHEMA'S. `path_rules` in src/leg-schema.json
// carries each rule with the `name` the refusal says first and the `rule` as
// the validator checks it; every refusal below embeds that text verbatim and
// adds only what is specific to the path in hand — which Leg, which Strand,
// which Section. The prompt and the refusal are one text for the reason the
// field set already is: two carriers agree until one is edited.
//
// A MISSING ENTRY THROWS, and loudly, on the shape `legFieldPresent` already
// uses one field over: a rule the validator raises and the schema does not
// carry is exactly the drift this arrangement removes, arriving from the
// inside, and a silent fallback to hardcoded wording is what would hide it.
export function pathRules() {
  return legschema().path_rules || {};
}
export function pathRule(key) {
  const r = pathRules()[key];
  if (!r || typeof r.name !== "string" || r.name === "" || typeof r.rule !== "string" || r.rule === "") {
    throw new Error(`src/leg-schema.json carries no \`path_rules.${key}\` with a name and a rule, and `
      + "src/compose.mjs raises a refusal under that key. The schema is rendered into the composition "
      + "prompt and the refusals read their text back from it, so a rule enforced here and absent there "
      + "is a rule the composing party is never shown (kogaki#1147).");
  }
  return r;
}
// The one composer of a path-level refusal: the rule's name, then the rule as
// the schema states it, then what this path did. Nothing here rewords the
// rule — a refusal that paraphrased would be the second carrier again.
function pathRefusal(key, at, specific) {
  const r = pathRule(key);
  return `${at ? `${at}: ` : ""}${r.name} — ${r.rule}${specific ? ` ${specific}` : ""}`;
}


// `claims` is a required field whose refusal is written out below rather than
// generated from the schema's declared type, because it names what a claim
// is. This set only routes which refusal speaks. `move` is no longer listed:
// it is optional in the schema, and the exactly-one-of `move`/`no_move_fits`
// refusal below speaks for it (kogaki#1276).
// `waypoints` is listed for the reason `claims` is: its refusal names what a
// waypoint is and which one failed, which the generic sentence cannot
// (kogaki#1311).
const BESPOKE_LEG_REFUSALS = new Set(["claims", "waypoints"]);

// The generic presence predicate for a required field, selected by the type
// the schema declares. An unknown type is a LOUD failure rather than a silent
// pass: a field added to the schema with a type nothing here understands would
// otherwise be rendered into the judge's prompt and validated by nobody, which
// is the two-carrier drift this whole arrangement removes — arriving from the
// inside.
function legFieldPresent(decl, v) {
  switch (decl.type) {
    case "string":
      return typeof v === "string" && v !== "";
    case "array of string":
      return Array.isArray(v) && v.length >= (decl.min_length || 0);
    case "array of claim":
      return Array.isArray(v) && v.length >= (decl.min_length || 0);
    case "array of journey":
      return Array.isArray(v) && v.length >= (decl.min_length || 0);
    case "array of waypoint":
      return Array.isArray(v) && v.length >= (decl.min_length || 0);
    default:
      return null;
  }
}

// ---- the Journey a Leg draws on (kogaki#1111) ----
//
// A Journey is MATERIAL, not an assertion: it carries an ADDRESS and a USE,
// and no text. The shape is validated here and the parse-back in
// `src/draft.mjs` imports THIS function rather than re-expressing it — the
// arrangement `introduces`, `opens_section` and `figure_roles` already have,
// for the reason those three state: a writer and a reader disagreeing about
// what a value is fails silently at exactly the field whose value reaches the
// model's entire input.
//
// TWO HALVES, SPLIT WHERE THE BRIEF DOCUMENT DOES. What is checkable from the
// Leg alone lives here: the shape, the closed use set, and that the Journey's
// Strand is one this Leg actually carries in `materials`. Whether that
// Strand's SERVED RECORD carries Journey material needs the Brief's own
// `strands` list and so is checked in `fillBrief`, beside the existing
// `<L-id>.journey` check that reads the same `briefJourneyStrands` list.
// The same split `figureRefusal` and `resolveFigureForms` already run under.
//
// PURE, and exported for that second reader.
export function journeysRefusal(journeys, materials, at) {
  if (journeys === undefined) return null;
  if (!Array.isArray(journeys)) {
    return `${at}: journeys, when present, is an array of Journey references — each naming the Strand whose Journey this Leg draws on and what it uses it for (src/leg-schema.json, \`journey\`)`;
  }
  const uses = journeyUses();
  // The Strand ids this Leg carries, with a `.journey` suffix stripped: a
  // composer may name the Strand bare, or as the `<L-id>.journey` form, and
  // both are the Leg carrying that Strand. Neither spelling decides
  // placement — since kogaki#1131 the coverage count reads THIS field.
  const carried = new Set((Array.isArray(materials) ? materials : [])
    .map((m) => String(m).replace(/\.journey$/, "")));
  for (const [i, j] of journeys.entries()) {
    const nth = `journey ${i + 1}`;
    if (!j || typeof j !== "object" || Array.isArray(j)) {
      return `${at}: ${nth} is not a Journey reference — each entry names a \`strand\` and a \`use\` (src/leg-schema.json, \`journey\`)`;
    }
    if (typeof j.strand !== "string" || j.strand === "") {
      return `${at}: ${nth} names no strand — a Journey reference addresses the Strand whose Journey this Leg draws on, as a LessonDisplayID (L<n>)`;
    }
    if (typeof j.use !== "string" || j.use === "") {
      return `${at}: ${nth} (strand ${j.strand}) names no use — a Journey is material the Leg EDITS, and the use is what the Leg edits it for: ${[...uses.keys()].join(", ")}`;
    }
    if (!uses.has(j.use)) {
      // NAMES THE SET AND WHAT EACH MEMBER MEANS, not just the set. The use
      // is the composer's one decision on this field, and a bare list of
      // three words is the refusal that sends them back to the schema to
      // find out which one they wanted.
      return `${at}: ${nth} (strand ${j.strand}) declares use ${JSON.stringify(j.use)} — the set is closed (src/leg-schema.json, \`journey.uses\`): `
        + [...uses.entries()].map(([k, v]) => `${k} — ${v}`).join("; ");
    }
    if (!carried.has(j.strand)) {
      return `${at}: ${nth} draws on ${j.strand}'s Journey, but this Leg does not carry ${j.strand} in \`materials\` (${(materials || []).join(", ") || "none"}) — a Leg edits material it stands on, so the Journey's Strand is one of the Leg's own materials`;
    }
  }
  return null;
}

// `budget` — OPTIONAL, the word bound this Leg's realized prose may spend.
// Shape only: a limit the writer sees, never a target the runtime judges the
// passage against.
export function budgetRefusal(budget, at) {
  if (budget === undefined) return null;
  if (typeof budget !== "number" || !Number.isInteger(budget) || budget <= 0) {
    return `${at}: budget, when present, is a positive whole number of words — it reads ${JSON.stringify(budget)}`;
  }
  return null;
}

// ---- the route a Leg takes its reader along (kogaki#1311) ----
//
// `waypoints` is the Leg's specialization of its Move's `technique`, written
// at composition so that nothing after the Candidate has to open the Move.
// SHAPE ONLY, and the count is not shape: whether the waypoints specialize
// the `technique` and survive its `breaks` is the Move-fit judgment's, and
// how many there are is the composer's (owner decision 2026-10-09).
//
// `claimStrands` is the Strand ids this Leg's claims name. Every refusal
// names the Leg and, where one is at fault, the waypoint by its position.
// PURE, and exported for the realization entry in `src/draft.mjs`, which
// re-runs it over a Brief's parsed Legs rather than re-expressing it.
export function waypointsRefusal(waypoints, claimStrands, at) {
  const def = "a waypoint is a point its paragraph makes, carrying a `point` "
    + "(the proposition the paragraph makes, in the article's subject, one sentence — never an effect on "
    + "the reader) and `serves` (the claims it serves, by the Strand id each names) — src/leg-schema.json, "
    + "`waypoint` (kogaki#1326)";
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return `${at}: carries no waypoints — every Leg carries an ordered, non-empty \`waypoints\` list, its `
      + `specialization of its Move's technique, written at composition because no stage after the Candidate `
      + `reads the Move (kogaki#1311). ${def}`;
  }
  const strands = new Set(claimStrands);
  const served = new Set();
  for (const [i, w] of waypoints.entries()) {
    const nth = `waypoint ${i + 1}`;
    if (!w || typeof w !== "object" || Array.isArray(w)) {
      return `${at}: ${nth} is not a waypoint — ${def}`;
    }
    // THE EFFECT FORM IS RETIRED BY NAME (kogaki#1326, owner decision
    // 2026-10-10): a waypoint saying what a step does to the reader was a
    // stage direction the writer narrated, so a Leg still carrying it is
    // refused rather than read as a waypoint with no point.
    if (Object.hasOwn(w, "effect")) {
      return `${at}: ${nth} carries \`effect\`, which is retired — a waypoint states the point its `
        + `paragraph makes, not an effect on the reader (kogaki#1326). ${def}`;
    }
    // THE BOUND PARAGRAPH MOVE IS RETIRED FROM THE WAYPOINT BY NAME (kogaki#1375, owner
    // decision 2026-10-14): Move information is used up to Paragraph Waypoint generation
    // and nowhere after it, so a Leg Waypoint carries `point` and `serves` only. The
    // ParagraphPlan stage binds a paragraph Move per Leg Waypoint and keeps which one in
    // its own run directory; a Brief whose waypoint still carries either field is refused
    // here, at every read, the way `effect` is.
    for (const k of RETIRED_WAYPOINT_MOVE_FIELDS) {
      if (Object.hasOwn(w, k)) {
        return `${at}: ${nth} carries \`${k}\`, which is retired — a Leg Waypoint carries \`point\` and \`serves\` `
          + `only, and no Move information reaches the Brief: the paragraph Move is bound by /paragraph-plan, `
          + `after the Brief, and stays in that stage's run directory (kogaki#1375). ${def}`;
      }
    }
    if (typeof w.point !== "string" || w.point.trim() === "") {
      return `${at}: ${nth} has an empty point — ${def}`;
    }
    if (!Array.isArray(w.serves) || w.serves.length === 0
      || w.serves.some((x) => typeof x !== "string" || x.trim() === "")) {
      return `${at}: ${nth} has an empty serves — every waypoint serves at least one claim of this Leg, `
        + `named by its Strand id; a step no claim of this Leg supports is the signal to pull in a Journey, `
        + `bind another Move, or report no_move_fits. ${def}`;
    }
    for (const x of w.serves) {
      if (!strands.has(x)) {
        return `${at}: ${nth} serves ${JSON.stringify(x)}, and this Leg carries no claim for that Strand `
          + `(its claims name ${[...strands].join(", ") || "none"}) — a waypoint serves a claim of its own Leg`;
      }
      served.add(x);
    }
  }
  const unserved = [...strands].filter((x) => !served.has(x));
  if (unserved.length) {
    return `${at}: its claim for ${unserved.map((x) => JSON.stringify(x)).join(", ")} is served by no waypoint `
      + `— every claim of a Leg is served by at least one of its waypoints, or the route the prose follows `
      + `never reaches it (kogaki#1311)`;
  }
  return null;
}

// THE TWO WAYPOINT FIELDS #1359 ADDED AND #1375 RETIRED, refused by name in
// `waypointsRefusal` above. Exported for the checks that build the refused case.
export const RETIRED_WAYPOINT_MOVE_FIELDS = ["move", "segments"];

// THE FIVE DIMENSIONS A STANCE OR A STATE IS WRITTEN IN
// (specs/move-extraction-contract.md; SPEC-draft-pipeline §"The three reader
// fields, and the block that authors them", kogaki#1176). Nothing in src/
// declares this set structurally — src/leg-schema.json and
// src/candidate-schema.json both name it only in a field's `description`
// prose — so it is read here, once, as the closed set the shape predicate
// below checks against.
export const READER_STATE_DIMENSIONS = ["knowledge", "question", "expectation", "orientation", "trust"];

// `reader_start` and `reader_state_after` (and so the derived
// `reader_state_before`, kogaki#1325) are a
// STANCE/STATE in the Move library's own dimensions, not a knowledge
// sentence (kogaki#1176 repair): one `dimension: value` LINE per dimension,
// each line's dimension drawn from READER_STATE_DIMENSIONS. This is NOT the
// Move library's own `before`/`after` shape verbatim -- moves/*.md folds
// its dimensions into one YAML paragraph, separated by `. `, and a value
// there is free to carry a semicolon or any other punctuation mid-sentence
// (kogaki#1211). The shape here is the one the composition prompt shows --
// `src/candidate-schema.json` and `src/leg-schema.json`'s field
// descriptions -- one line per dimension, so a semicolon inside a
// dimension's own sentence is ordinary prose and never a segment split. A
// dimension's own value may carry further colons (a `question:` line
// reading `holds: none`, for instance) -- only the line's LEADING token is
// checked against the dimension set. Returns an error string or null;
// presence is a different check's job, so an empty or non-string value is
// not this function's refusal.
export function readerStateShapeRefusal(value, at, fieldName) {
  if (typeof value !== "string" || value === "") return null;
  for (const line of value.split("\n")) {
    if (line === "") continue;
    const m = /^([a-z]+):\s*\S/.exec(line);
    if (!m || !READER_STATE_DIMENSIONS.includes(m[1])) {
      return `${at}: ${fieldName} is not written as \`dimension: value\` lines over the Move `
        + `library's dimension set (${READER_STATE_DIMENSIONS.join(", ")}) — it is a STANCE/STATE in `
        + "those dimensions, not a knowledge sentence (SPEC-draft-pipeline §\"The three reader fields, "
        + `and the block that authors them\", kogaki#1176). Received: ${JSON.stringify(value)}`;
    }
  }
  return null;
}

// ONE DIMENSION'S LINE, read off a line-per-dimension reader state. Returns
// the value after `<dim>:` on the line whose LEADING token is `dim`, or null
// where no line carries it. A later colon inside the value is the value's own
// (`question: holds: none` reads as `holds: none`), which is the same
// leading-token rule `readerStateShapeRefusal` checks by.
export function readerStateDimensionLine(value, dim) {
  if (typeof value !== "string") return null;
  for (const line of value.split("\n")) {
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (m && m[1] === dim) return m[2].trim();
  }
  return null;
}

// NO OPENING QUESTION IS READ OFF THE FIRST LEG ANY MORE (owner decision
// 2026-09-29, kogaki#1225). `openingQuestionOf` stood here: it read the first
// Leg's after-state `question:` line and the Brief rendered it under an
// `Opening question` heading. The first Leg already carries a before-state
// and an after-state, so a heading repeating its after-state question was a
// second Question inside Leg 1, rendered three times over. The heading, the
// Packet's fixed-points line and the first-Leg `question:` requirement are
// gone together; the Leg marked `reaches_target`'s `reader_state_after` is
// what the Brief now derives (Reader target, kogaki#1231, src/assemble.mjs
// `targetLegAfterState`) -- superseding kogaki#1225's last-Leg derivation.

// ---- shape validation (the Leg's shape — the fields, not the markup) ----
// THE FIELD SET IS THE SCHEMA'S (kogaki#1108); the refusals are this file's.
// Returns { error } or { legs }. Pure over its argument; exported for the check.
export function validateLegs(legs, readerStart, obligations = [], definedTerms = []) {
  if (!Array.isArray(legs) || legs.length === 0) {
    return { error: pathRefusal("path_is_non_empty", null, "This answer carries no Leg at all.") };
  }
  // READER START IS SHAPE-CHECKED HERE AND BOUND NOWHERE (kogaki#1216).
  // `readerStart` is OPTIONAL because the two call sites hold it at different
  // points (the Candidate's Harness-set `reader_start` at compose_path, the
  // same value again at fillBrief), and a caller with none to hand — a bare
  // shape check — is not asked to invent one.
  //
  // WHAT STOOD HERE, and why it is gone (owner decision 2026-09-28,
  // kogaki#1216). `reader_start_binds_first_leg` refused a path whose first
  // Leg's `reader_state_before` was not Reader start VERBATIM. Together with
  // the specialization rule — the first Leg's before-state must specialize
  // its Move's `before` — that forced Reader start to be written BACKWARDS
  // from the Move the first Leg binds: the Brief's Reader start was the
  // bound Move's `before` with the article's nouns substituted, a reader who
  // had already read the article several times. Reader start is now a cold
  // read authored from the Persona and the Thesis at the `differentiation`
  // state (src/differentiation-schema.json), never from any Move.
  //
  // AND THE FIRST LEG'S BEFORE-STATE IS READER START AGAIN, BY CONSTRUCTION
  // (kogaki#1325, owner decision 2026-10-10). Between #1216 and #1325 the
  // first Leg's composed `reader_state_before` was judged a "consistent
  // specialization" of Reader start, and on 2026-10-09 that judgment let the
  // Thesis move from Reader start's `question` line into `knowledge`. Now no
  // Leg composes a before-state: `deriveReaderStatesBefore` below writes it,
  // and a Leg that carries one is refused by name in the loop.
  if (typeof readerStart === "string" && readerStart !== "") {
    const shapeErr = readerStateShapeRefusal(readerStart, "reader_start", "reader_start");
    if (shapeErr) return { error: shapeErr };
  }
  const schema = legschema();
  // A TERM THE PATH INTRODUCES IS ONE THE READER DOES NOT HOLD ON ARRIVAL
  // (owner decision 2026-09-29, kogaki#1225). Reader start is the state of a
  // reader who has seen the Thesis read as a title and nothing else, so a
  // Reader start line carrying a term some Leg lists under `introduces:` has
  // written the article into the reader before it starts. This is the one
  // deterministic refusal in Reader start's content: whether the reader
  // "already knows" a term is judgment, but a Leg's own `introduces:` entry
  // is the composer's declaration that they do not, and a declaration can
  // be read. Whole-word, case-insensitive, over the term before the anchor
  // separator; a term one character long still matches as a whole word.
  // Runs before the per-Leg loop so the first offending Leg is named even
  // when a later Leg's shape would refuse first, and skips an entry whose
  // shape is bad -- `introducesRefusal` below names that by itself.
  if (typeof readerStart === "string" && readerStart !== "" && Array.isArray(legs)) {
    for (const [i, s] of legs.entries()) {
      if (!s || typeof s !== "object" || !Array.isArray(s.introduces)) continue;
      const at = `leg ${i + 1}${s.leg_id ? ` (${s.leg_id})` : ""}`;
      for (const raw of s.introduces) {
        const e = parseIntroducesEntry(raw);
        if (e.error) continue;
        if (introducedTermInReaderStart(e.term, readerStart)) {
          return { error: `${at}: reader_start contains "${e.term}", a term this Leg lists under introduces — `
            + "a term the path introduces is by definition one the reader does not hold on arrival (kogaki#1225). "
            + "Reader start is a reader who has seen the Thesis as a title and nothing else: remove the term from "
            + "Reader start, or from this Leg's introduces if the reader really does arrive holding it" };
        }
      }
    }
  }
  const seen = new Set();
  for (const [i, s] of legs.entries()) {
    const at = `leg ${i + 1}${s && s.leg_id ? ` (${s.leg_id})` : ""}`;
    // `relations` IS A RETIRED FIELD, refused BY NAME ahead of every other
    // check (kogaki#1215; the precedent is `retiredClaimTypes`, refused ahead
    // of the closed-set message). The schema no longer advertises it, so a
    // composer should never write it — but a Leg that did would otherwise have
    // its marking silently dropped, which is the failure the draft side's
    // by-name refusal of a `relation:` line exists against.
    // `reader_state_before` IS DERIVED, NEVER COMPOSED (kogaki#1325), and is
    // refused BY NAME for the reason `relations` below is: a value the
    // composer wrote would otherwise be silently replaced by the derivation,
    // and a composer whose state was replaced never learns it wrote one.
    if (s && typeof s === "object" && Object.prototype.hasOwnProperty.call(s, "reader_state_before")) {
      return { error: `${at}: carries \`reader_state_before\` — a Leg's before-state is not composed (kogaki#1325): `
        + "it is the previous Leg's reader_state_after, or the Brief's Reader start for the first Leg, derived by "
        + "the Harness. Remove the field; write only reader_state_after, which the next Leg begins from." };
    }
    if (s && typeof s === "object" && Object.prototype.hasOwnProperty.call(s, "relations")) {
      return { error: `${at}: \`relations\` is a retired field — the relations layer is retired (kogaki#1215): `
        + "a Leg's claims and introduces are flat lists with no item subordinate to another, and a whole "
        + "category's realization is stated once in the Packet template, never marked per item. Remove the field." };
    }
    const errs = [];
    for (const name of requiredLegFields()) {
      if (BESPOKE_LEG_REFUSALS.has(name)) continue;
      const decl = schema.fields[name];
      const ok = legFieldPresent(decl, s[name]);
      if (ok === null) {
        return { error: `${at}: src/leg-schema.json declares the required field ${JSON.stringify(name)} `
          + `with type ${JSON.stringify(decl.type)}, which this validator has no presence predicate for. `
          + `The schema is rendered into the composition prompt and read back here, so a field the prompt `
          + `asks for and the validator cannot check is exactly the drift one carrier exists to prevent — `
          + `add the predicate in src/compose.mjs beside this refusal` };
      }
      if (!ok) {
        errs.push(`${at}: ${name}${decl.min_length ? ` (non-empty ${decl.type})` : ""} is required by the Leg's shape `
          + `— a Leg record without it is not a Leg record. ${decl.description}`);
      }
    }
    if (errs.length) return { error: errs[0] };
    // A KNOWLEDGE-ONLY reader_state_after IS THE DEFECT THIS ISSUE
    // CLOSES (kogaki#1176 repair): presence is checked above by
    // `requiredLegFields`; the SHAPE — `dimension: value` lines over the
    // Move library's dimension set — is checked here, so a bare sentence is
    // refused naming the rule rather than accepted as a non-empty string.
    // The before-state needs no check of its own: it is an earlier after-state
    // or Reader start, each shape-checked where it is written (kogaki#1325).
    {
      const shapeErr = readerStateShapeRefusal(s.reader_state_after, at, "reader_state_after");
      if (shapeErr) return { error: shapeErr };
    }
    if (seen.has(s.leg_id)) {
      return { error: pathRefusal("leg_id_unique", at, `An earlier Leg already carries the id ${JSON.stringify(s.leg_id)} — this is a duplicate leg_id, and the repair is to rename one of the two, never to merge them.`) };
    }
    // the Leg's shape v18 (kogaki#642) — `Leg = Input + State`, and the Move IS the
    // State, so a Move-less Leg is not a Leg. This is the seat the spec
    // names as the carrier: the requirement binds at composition, which is
    // what makes such a Leg unwritable rather than discouraged. the constraints that survive's
    // no-mandatory-Moves rider is superseded there by name.
    // EXACTLY ONE OF `move` AND `no_move_fits` (kogaki#1276). A Leg no Move
    // in the library fits says so in one sentence rather than naming the
    // nearest Move; the reader-path unit then refuses its Candidate with that
    // sentence (`validateReaderPathUnit`, src/brief.mjs).
    const hasMove = typeof s.move === "string" && s.move !== "";
    const hasNoFit = typeof s.no_move_fits === "string" && s.no_move_fits.trim() !== "";
    if (hasMove && hasNoFit) {
      return { error: `${at}: carries both move and no_move_fits — a Leg either binds a Move by id or says in one sentence that no Move fits it, never both (kogaki#1276)` };
    }
    if (!hasMove && !hasNoFit) {
      return { error: `${at}: carries neither move nor no_move_fits — a Leg binds a Move library entry by id (the Move is the State component of a Leg), or says in one sentence what its claims need that no Move's technique provides (kogaki#1276)` };
    }
    for (const d of s.depends_on) {
      if (!seen.has(d)) {
        return { error: pathRefusal("depends_on_ordering", at, `Its depends_on names "${d}", which is not an EARLIER Leg of this path: either move the Leg that carries that id ahead of this one, or drop the dependency.`) };
      }
    }
    // the Bridge Leg's `bridges` — optional, and when present it names the ADJACENT
    // PAIR this Leg was inserted between. Validated here because the
    // selection gate's disclosure is computed from it: an unvalidated marking
    // renders `between :` or `between true:` at an owner surface.
    if (s.bridges !== undefined) {
      if (!Array.isArray(s.bridges) || s.bridges.length !== 2 || s.bridges.some((b) => typeof b !== "string" || b === "")) {
        return { error: `${at}: bridges, when present, names the two adjacent legs this Leg was inserted between (the Bridge Leg) — an array of exactly two leg ids` };
      }
    }
    // the reader-knowledge ledger's `introduces` (kogaki#751) — OPTIONAL, and validated here for
    // the same reason `bridges` is: the accumulation the Packet derives from
    // it is rendered at an owner-facing surface, so an unvalidated entry
    // renders as a blank term or as `undefined` in a reader-knowledge ledger.
    // SHAPE ONLY. Whether a term is genuinely introduced HERE, whether the
    // anchor explains it, and whether the Leg's claims already carry it are
    // judgments — the judgment rule clause 3 stands and nothing below reads meaning.
    if (s.introduces !== undefined) {
      const bad = introducesRefusal(s.introduces, at);
      if (bad) return { error: bad };
    }
    // `re-activate` (kogaki#1237, owner decision 2026-09-30) — OPTIONAL, and validated for the
    // same reason `introduces` is: it reaches the Leg Packet, an owner-facing
    // surface, so an unvalidated entry would render a Leg speaking of material
    // it was never shown to have a claim to. The candidate population is
    // closed: only the `depends_on` Legs' `introduces` entries and `claims`,
    // never Journey material or Closure rows — the shape check refuses a
    // malformed entry, the semantic check refuses one whose Leg, term or
    // Strand does not exist where named.
    if (s["re-activate"] !== undefined) {
      const bad = reactivateRefusal(s["re-activate"], at);
      if (bad) return { error: bad };
      const badSemantic = reactivateSemanticRefusal(s["re-activate"], s.depends_on, legs, at);
      if (badSemantic) return { error: badSemantic };
    }
    // the Section grouping's `opens_section` (kogaki#822) — shape only here; the four grouping
    // rules are a property of the whole path and run after this loop.
    if (s.opens_section !== undefined) {
      const bad = opensSectionRefusal(s.opens_section, at);
      if (bad) return { error: bad };
    }
    if (!Array.isArray(s.claims) || s.claims.length === 0) {
      return { error: `${at}: claims are required — specific propositions, each one proposition derived from a Strand (the claims rule)` };
    }
    {
      const types = claimTypes();
      const retired = retiredClaimTypes();
      // ONE CLAIM PER STRAND, PER LEG (kogaki#1108). The rule and its ground
      // are the schema's (`claim.one_per_strand`, and the paragraph above it);
      // this is the refusal that makes a second claim for one Strand
      // UNWRITABLE rather than discouraged. It names the Leg and the Strand,
      // because those are the two facts the composer needs to repair it: which
      // Leg to look at, and which of its materials is carrying two claims
      // where the path admits one.
      //
      // KEYED PER LEG AND RESET AT EACH ONE. A Strand serving several Legs
      // carries a DIFFERENT claim in each — that is the sequence, not a
      // duplication — so the scope of this set is one Leg and never the path.
      const byStrand = new Map();
      for (const g of s.claims) {
        // The retired types are refused BY NAME and ahead of the closed-set
        // message (kogaki#1095): a Brief written under the old grammar is the
        // caller this arm exists for, and "not in the set" would tell it that
        // its content is wrong rather than that its content has a home.
        if (retired.has(g.type)) {
          return { error: `${at}: claim type ${JSON.stringify(g.type)} is no longer a claim — a claim is one proposition derived from a Strand, and nothing else (the claims rule). What this claim carried is ${retired.get(g.type)}` };
        }
        if (!types.has(g.type)) {
          return { error: `${at}: claim type ${JSON.stringify(g.type)} — the claims rule's list is closed: ${[...types].join(", ")}` };
        }
        if (typeof g.proposition !== "string" || g.proposition === "") {
          return { error: `${at}: a claim is a specific PROPOSITION, stated (the claims rule) — an untyped pointer is not a claim` };
        }
        if (typeof g.strand !== "string" || g.strand === "") {
          return { error: `${at}: a strand claim names its Strand (L<n>)` };
        }
        if (schema.claim.one_per_strand === true && byStrand.has(g.strand)) {
          return { error: pathRefusal("one_claim_per_strand", at,
            `Two claims here name strand ${JSON.stringify(g.strand)} (src/leg-schema.json, \`claim.one_per_strand\`): `
            + `the first reads ${JSON.stringify(byStrand.get(g.strand))}; the second reads ${JSON.stringify(g.proposition)}.`) };
        }
        byStrand.set(g.strand, g.proposition);
      }
    }
    // the route (kogaki#1311) — REQUIRED, and checked after the claims loop
    // because `serves` addresses the claims by Strand, so its address space
    // does not exist until the claims are known to be well formed.
    {
      const bad = waypointsRefusal(s.waypoints, s.claims.map((g) => g.strand), at);
      if (bad) return { error: bad };
    }
    // the figure decision's `figure:`/`figure_roles` (kogaki#877) — OPTIONAL, and validated
    // here for the reason `bridges` and `introduces` are: the count and the
    // Leg ids reach the SELECTION GATE's label, so an unvalidated declaration
    // renders a binding an owner reads as decided. Placed AFTER the claims
    // loop on purpose — a role binds to one of this Leg's claims, so the
    // address space does not exist until they are known to be well formed.
    {
      const bad = figureRefusal(s.figure, s.figure_roles, at);
      if (bad) return { error: bad };
      const badClaim = figureClaimRefusal(s.figure_roles, s.claims.length, at);
      if (badClaim) return { error: badClaim };
    }
    // the Journey a Leg draws on (kogaki#1111) — OPTIONAL, and validated here for the
    // reason `bridges`, `introduces` and `figure` are: the declaration reaches
    // the Leg Packet, which is the model's ENTIRE input, so an unvalidated
    // entry renders a use the realizer reads as instruction. Placed after the
    // claims loop because its refusal quotes `materials`, and a Leg whose
    // earlier fields are malformed should report that first.
    {
      const bad = journeysRefusal(s.journeys, s.materials, at);
      if (bad) return { error: bad };
    }
    // `budget` — OPTIONAL, validated here for the reason `bridges`, `introduces`,
    // `figure` and `journeys` are: it reaches the Leg Packet, the model's
    // ENTIRE input, so an unvalidated budget renders as a limit the writer
    // cannot read.
    {
      const bad = budgetRefusal(s.budget, at);
      if (bad) return { error: bad };
    }
    // A proposition not explicit in the material is flagged `entailed` WITH
    // its reasoning, exposed at the human gate (the claims rule). The flag is the
    // composer's judgment; the runtime refuses only a flag with no reasoning
    // to expose — an entailed leg whose reasoning is absent has nothing for
    // the gate to judge.
    if (s.entailed === true && (typeof s.entailment_reasoning !== "string" || s.entailment_reasoning === "")) {
      return { error: `${at}: flagged entailed with no entailment_reasoning — entailment is interpretation, judged rather than silently trusted (the claims rule)` };
    }
    seen.add(s.leg_id);
  }
  // the Section grouping's grouping rules (kogaki#822) run over the WHOLE path, after every
  // Leg is known to be well formed — each rule is a statement about a Leg's
  // relation to its neighbours, so none of them is decidable inside the loop.
  const grouping = sectionGroupingRefusal(legs);
  if (grouping) return { error: grouping };
  // NO INTRODUCED TERM IN ANY HEADING (kogaki#1327), run beside the Section
  // grouping for the same reason: a statement about a Leg's `opens_section`
  // against every OTHER Leg's `introduces`, decidable only once the whole
  // path is known.
  const heading = opensSectionIntroducedTermRefusal(legs);
  if (heading) return { error: heading };
  // A DEFINED TERM BEFORE ITS INTRODUCING LEG (kogaki#1331, owner decision
  // 2026-10-10), run beside the heading rule for the same reason: which Leg
  // introduces a term is known only once the whole path is.
  const defined = definedTermBeforeIntroductionRefusal(legs, definedTerms);
  if (defined) return { error: defined };
  // CLOSURE (kogaki#1232, owner decision 2026-09-30), run for the same reason
  // the Section grouping and the Reader target Leg do: both rules below are
  // statements about the whole ledger against the whole path, not about one
  // Leg or one row alone.
  const closure = closureLedgerRefusal(legs, obligations);
  if (closure) return { error: closure };
  // AT MOST ONE `nearest` ACROSS THE WHOLE PATH (kogaki#1251 item 2,
  // kogaki#1260), run here for the same reason CLOSURE does: a statement
  // about every Leg's introduces entries together, not about one Leg alone.
  const nearest = introducesNearestRefusal(legs);
  if (nearest) return { error: nearest };
  // THE READER TARGET LEG (kogaki#1231), run last: it names a Leg by
  // POSITION relative to every other Leg, so it is decidable only once every
  // Leg above is known to be well formed — the same reason the Section
  // grouping runs after the per-Leg loop rather than inside it.
  const target = readerTargetLegRefusal(legs, obligations);
  if (target) return { error: target };
  // THE REACHING LEG'S `names` (kogaki#1251 item 4, kogaki#1260), run right
  // after: it is a further statement about that same Leg, decidable only
  // once `readerTargetLegRefusal` has confirmed which Leg that is.
  const names = readerTargetNamesRefusal(legs);
  if (names) return { error: names };
  return { legs: deriveReaderStatesBefore(legs, readerStart) };
}

// THE BEFORE-STATE, DERIVED (kogaki#1325, owner decision 2026-10-10). Each
// Leg begins where the previous Leg left the reader — its `reader_state_after`,
// verbatim — and the first Leg begins at the Brief's Reader start. Nothing
// else may stand there: a before-state holding content no earlier text stated
// is the defect this derivation makes unwritable. Pure: returns copies, so a
// Candidate record keeps the shape the composer wrote and the derivation is
// re-run wherever a reader needs the state (the Move-fit input, path review,
// the Brief's Legs). `readerStart` absent leaves the first Leg's state absent
// rather than inventing one.
export function deriveReaderStatesBefore(legs, readerStart) {
  const first = typeof readerStart === "string" && readerStart !== "" ? readerStart : undefined;
  return legs.map((s, i) => {
    const before = i === 0 ? first : legs[i - 1].reader_state_after;
    const out = {};
    for (const [k, v] of Object.entries(s)) {
      out[k] = v;
      if (k === "purpose" && before !== undefined) out.reader_state_before = before;
    }
    if (before !== undefined && !("reader_state_before" in out)) out.reader_state_before = before;
    return out;
  });
}

// WHAT THE READER SAW AT THE TITLE ENTERS `question` ONLY (kogaki#1325). Reader
// start is a reader who has seen the Thesis read as a title and nothing else;
// a `knowledge:` line carrying the Thesis says the reader already holds the
// claim the article exists to establish — the 2026-10-09 run's "holds the
// sentence as a slogan". The Thesis may appear in `question` as the reader's
// reaction to the wording. Matched case-insensitively over the Thesis with its
// closing punctuation and runs of whitespace normalized, so a restated
// paraphrase is the differentiation judge's to avoid and never linted here.
// Returns an error string or null; an absent Thesis or Reader start is not
// this function's refusal.
export function readerStartThesisRefusal(readerStart, thesis) {
  if (typeof thesis !== "string" || typeof readerStart !== "string") return null;
  const norm = (t) => t.toLowerCase().replace(/\s+/g, " ").trim().replace(/[.!?。]+$/, "").trim();
  const t = norm(thesis);
  if (t === "") return null;
  const knowledge = readerStateDimensionLine(readerStart, "knowledge");
  if (knowledge === null || !norm(knowledge).includes(t)) return null;
  return `reader_start: its knowledge line contains the Thesis (${JSON.stringify(thesis.trim())}) — Reader start is `
    + "a reader who has seen the Thesis read as a title and nothing else, so the Thesis may appear in the `question` "
    + "line, as the reader's reaction to the wording, and never in `knowledge`: no text has stated it yet (kogaki#1325)";
}

// ---- the figure decision's `figure:` — the Brief's figure decision (kogaki#877) ----
//
// A Leg MAY declare that a figure carries something its prose leaves hard to
// hold. THE DEFAULT IS NONE: a Leg without `figure:` has no figure and
// nothing asks about it — the hub's 2026-08-01 D8 disclosure-never-slot
// ruling carried as a field that may simply be absent, which is also what
// makes every Brief composed before this field compose unchanged.
//
// THREE CONDITIONS, AND ONLY TWO OF THEM ARE MECHANICAL. The Leg's Move must
// carry a `figure`; every role of that form must bind to one of THIS
// Leg's claims. The third — that the figure carries something — is the
// composer's one judgment and is stated in the `figure:` line itself. Nothing
// here reads that line for meaning, on the judgment rule's rule: a missing field is
// refused, a weak one is not.
//
// THE HALVES SPLIT WHERE THE MOVE LIBRARY DOES, which is the split `move`
// itself already has. `figureRefusal` and the claim-binding check below are
// PURE and run inside `validateLegs`; whether the Move carries a form at all
// needs the library and runs in `resolveFigureForms`, beside `resolveMoveIds`
// at adoption. Both are "at composition" in the sense the Section grouping means — the Brief
// is being authored and the refusal can still be fixed.

// `g<n>` addresses the Leg's own claim lines IN ORDER, 1-based. A role bound
// to a claim of another Leg is unreachable by construction rather than
// refused by a rule: the address space is this Leg's claims and has no
// syntax for anyone else's.
const CLAIM_ADDRESS = /^g([1-9][0-9]*)$/;

let FIGURE_KINDS = null;
export function figureKinds() {
  if (FIGURE_KINDS) return FIGURE_KINDS;
  const p = join(dirname(fileURLToPath(import.meta.url)), "figure-kinds.json");
  // REFUSED RATHER THAN DEFAULTED TO EMPTY, the arrangement
  // src/disclosure-fields.json already has: an empty kind set would make every
  // form check vacuous while reading exactly like a corpus that declares no
  // forms, which is the degrades-to-zero shape this lane refuses elsewhere.
  FIGURE_KINDS = JSON.parse(readFileSync(p, "utf8"));
  return FIGURE_KINDS;
}

// The SERIALIZED form of `figure_roles`, and its reader. One round trip, two
// functions that cannot disagree about what an entry is — the arrangement
// `introduces` and `opens_section` already have, for the reason they have it:
// a writer and a reader disagreeing about a value fails silently at exactly
// the field whose value reaches the rendered figure.
export function renderFigureRoles(roles) {
  return Object.entries(roles).map(([r, g]) => `${r}=${g}`).join(", ");
}
// The READER of that form. Its consumer today is the round-trip assertion in
// checks/check-brief-compose.sh — a writer whose output nothing can parse is a
// format nobody has verified — and kogaki#878, which owns the `src/draft.mjs`
// read-back, is the next one. It is here rather than there because the writer
// is here: one grammar, two ends, never two definitions that agree until one is
// edited.
export function parseFigureRoles(text) {
  const out = {};
  for (const part of String(text).split(",")) {
    const t = part.trim();
    if (t === "") continue;
    const eq = t.indexOf("=");
    if (eq === -1) return { error: `"${t}" is not a role binding — the form is role=g<n>` };
    const role = t.slice(0, eq).trim();
    const addr = t.slice(eq + 1).trim();
    if (role === "" || addr === "") return { error: `"${t}" is not a role binding — the form is role=g<n>` };
    if (Object.prototype.hasOwnProperty.call(out, role)) return { error: `role "${role}" is bound twice` };
    out[role] = addr;
  }
  return { roles: out };
}

// THE GRAMMAR HALF. Pure over the two values, so the composition side and the
// Brief read-back side share ONE definition of what a declaration is.
export function figureRefusal(figure, figure_roles, at) {
  const has = figure !== undefined && figure !== null;
  const hasRoles = figure_roles !== undefined && figure_roles !== null;
  if (!has && !hasRoles) return null;
  // THE TWO TRAVEL TOGETHER. A `figure:` with no bindings declares a figure
  // nothing can be rendered from, and bindings with no `figure:` carry no
  // statement of what the figure is for — the composer's one judgment. Either
  // alone is a half-declaration, and a half-declaration reaching #878 would be
  // a record with no form or a form with no reason.
  if (has && !hasRoles) {
    return `${at}: figure: is declared with no figure_roles — every role of the Move's figure binds to one of this Leg's claims (the figure decision), and a figure with no bindings names nothing to render`;
  }
  if (!has && hasRoles) {
    return `${at}: figure_roles are declared with no figure: — the figure: line is the composer's statement of what the figure lets the reader hold, and bindings without it record a form nobody said carries anything (the figure decision)`;
  }
  if (typeof figure !== "string" || figure.trim() === "") {
    return `${at}: figure:, when present, is one line — what the figure lets the reader hold that the prose alone leaves hard to hold (the figure decision)`;
  }
  if (typeof figure_roles !== "object" || Array.isArray(figure_roles)) {
    return `${at}: figure_roles is a flat mapping of the Move figure's roles to this Leg's claims, role=g<n> (the figure decision)`;
  }
  const entries = Object.entries(figure_roles);
  if (entries.length === 0) {
    return `${at}: figure_roles is empty — every role of the Move's figure binds to one of this Leg's claims (the figure decision)`;
  }
  for (const [role, addr] of entries) {
    if (role === "kind") {
      // `kind` is the selector in the Move's own block and can never be a role
      // there (src/figure-kinds.json). Refusing it here too keeps the two
      // vocabularies from disagreeing about what a role name may be.
      return `${at}: figure_roles binds "kind", which is the form's selector and never a role (src/figure-kinds.json)`;
    }
    if (typeof addr !== "string" || !CLAIM_ADDRESS.test(addr)) {
      return `${at}: figure_roles binds role "${role}" to ${JSON.stringify(addr)} — a binding addresses one of this Leg's own claims as g<n>, numbered from 1 in the order they are declared (the figure decision)`;
    }
  }
  return null;
}

// THE CLAIM-BINDING HALF, separated because it needs the Leg's claims and
// the read-back side has only the serialized block.
export function figureClaimRefusal(figure_roles, claimCount, at) {
  if (figure_roles === undefined || figure_roles === null) return null;
  for (const [role, addr] of Object.entries(figure_roles)) {
    const m = CLAIM_ADDRESS.exec(String(addr));
    if (!m) continue; // grammar is figureRefusal's; this half assumes it passed
    const n = Number(m[1]);
    if (n > claimCount) {
      return `${at}: figure_roles binds role "${role}" to ${addr}, and this Leg declares ${claimCount} claim(s) — a role binds to a claim of THIS Leg (the figure decision), so an address past the end names a claim that is not there`;
    }
  }
  return null;
}

// The Move's `figure` block, read from the record and NOTHING ELSE READ
// WITH IT. `loadMoveIds` states why the library is read as ids alone — a
// reader that parsed `before`/`after` would be one edit away from comparing
// them, which is the lint the judgment rule forbids. That reasoning bounds this reader
// rather than licensing it: `figure` is a SCHEMA OF ROLES carrying no
// words a reader sees (src/figure-kinds.json), so reading it compares nothing
// about the Move's prose, and this function extracts that block only.
export function figureOf(moveId, movesDir = "moves") {
  let text;
  try { text = readFileSync(join(movesDir, `${moveId}.md`), "utf8"); }
  catch (e) {
    return { error: `move "${moveId}" cannot be read from ${movesDir} (${e.message})` };
  }
  const lines = text.split("\n");
  const start = lines.findIndex((l) => /^figure:[ \t]*$/.test(l));
  if (start === -1) return { form: null };
  const form = {};
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === "") continue;
    // The block ends at the first line that is not indented — the Move record
    // is a flat mapping with one nested block, so dedent IS the terminator.
    if (!/^[ \t]/.test(l)) break;
    const m = l.match(/^[ \t]+([A-Za-z0-9_]+):[ \t]*(.*)$/);
    if (!m) continue;
    form[m[1]] = m[2].trim();
  }
  return { form };
}

// THE MOVE-DEPENDENT HALF. Refuse the FIRST figure-carrying Leg whose Move
// declares no form, or whose bindings are not exactly that form's roles —
// naming the Leg, the Move and the role, which is the refusal shape this
// runtime uses everywhere.
export function resolveFigureForms(legs, movesDir = "moves") {
  const kinds = figureKinds().kinds || {};
  for (const s of legs) {
    if (s.figure === undefined || s.figure === null) continue;
    const at = `leg ${s.leg_id}`;
    const r = figureOf(s.move, movesDir);
    if (r.error) return { error: `${at}: ${r.error}` };
    if (!r.form) {
      return { error: `${at}: figure: is declared, and move "${s.move}" carries no figure — a figure is the INSTANCE of its Move's form (the figure decision), so a Move with no form leaves the declaration with nothing to be an instance of. Give the Move a form under its own issue (src/figure-kinds.json names the closed kind set), or drop the figure: from this Leg` };
    }
    const kind = r.form.kind;
    if (!kind || !Object.prototype.hasOwnProperty.call(kinds, kind)) {
      return { error: `${at}: move "${s.move}" declares figure kind ${JSON.stringify(kind ?? null)}, which is outside the closed set (${Object.keys(kinds).sort().join(", ")}) — the Move library is what admits a kind, and ingestion refuses this record` };
    }
    const want = new Set(kinds[kind].roles || []);
    const have = new Set(Object.keys(s.figure_roles || {}));
    const missing = [...want].filter((x) => !have.has(x)).sort();
    const extra = [...have].filter((x) => !want.has(x)).sort();
    if (missing.length) {
      return { error: `${at}: figure_roles leaves ${missing.map((x) => `"${x}"`).join(", ")} unbound — every role of move "${s.move}"'s ${kind} form binds to one of this Leg's claims (the figure decision). The form's roles are ${[...want].sort().join(", ")}` };
    }
    if (extra.length) {
      return { error: `${at}: figure_roles binds ${extra.map((x) => `"${x}"`).join(", ")}, which is not a role of move "${s.move}"'s ${kind} form — the form's roles are ${[...want].sort().join(", ")} (src/figure-kinds.json)` };
    }
  }
  return { ok: true, figures: legs.filter((s) => s.figure !== undefined && s.figure !== null).length };
}

// The figure-carrying Legs of a path, in path order. ONE derivation, so the
// Candidate label's count and the set it names cannot disagree.
export function figureLegs(legs) {
  return (legs || []).filter((s) => s && s.figure !== undefined && s.figure !== null);
}

// The gate's disclosure clause (the Candidate gate). THE SOFT WARNING HAS NO TARGET AND
// REFUSES NOTHING — topics/articles.md 2026-08-01 D11 — so above three it says
// so and the Candidate stays selectable. An empty set renders the explicit
// none rather than nothing: a Candidate that declares no figure and a clause
// that was never composed are the same silence to a reader and different
// silences to a check.
export const FIGURE_SOFT_WARNING_AT = 3;
export function figureClause(legs) {
  const figs = figureLegs(legs);
  if (figs.length === 0) return "no Leg carries a figure";
  const which = figs.map((s) => s.leg_id).join(", ");
  const head = `${figs.length} Leg(s) carry a figure — ${which}`;
  return figs.length > FIGURE_SOFT_WARNING_AT
    ? `${head}; above ${FIGURE_SOFT_WARNING_AT} figures a reader is being asked to hold more diagrams than prose, which is worth a second look — nothing here refuses it`
    : head;
}

// ---- rendering (SQ1: fenced blocks; the Leg's shape fixes the fields, not the markup;
// this function IS the recorded serialization, exercised by the check's
// fixture) ----
// ---------------------------------------------------------------------------
// THE LEG↔MOVE INSTANTIATION CONTRACT (the Leg-Move instantiation contract, kogaki#747; owner rulings
// 2026-09-01). A Leg INSTANTIATES a Move: `move` names a record in the Move
// library, and the Leg's reader_state_after is the instance form of that
// Move's `after`, specialized to this reader and these Strands. Its
// before-state is DERIVED (kogaki#1325) and instantiates nothing: what is
// asked of the Move's `before` is whether it requires anything that derived
// state does not hold. The relationship has two halves and they are carried
// by DIFFERENT machinery on purpose:
//
//   MECHANICAL — does the id resolve? A set membership test over the store.
//                Refused here.
//   JUDGED     — does the Leg fit the Move's contract (src/specialization-
//                schema.json)? An LLM judgment, recorded in a typed
//                record this file VALIDATES AND NEVER COMPOSES.
//
// Why the second is not a lint, restated because the temptation is real:
// the judgment rule clause 3 holds that no MUST of the composition design becomes a lint
// "even where deterministic processing is possible", and the constraints that survive's rider keeps
// before/after matching judgment-class. Nothing below renders a verdict on
// a specialization; the mechanism owns the record's SHAPE and the refusal.

// The Move library, read as a SET OF IDS and nothing more. Reading only the
// ids is deliberate: resolving the id is this half's whole job, and a reader
// that parsed `before`/`after` would be one edit away from comparing them,
// which is the lint the judgment rule forbids.
export function loadMoveIds(movesDir = "moves") {
  let names;
  try { names = readdirSync(movesDir); }
  catch (e) {
    // A STORE THAT CANNOT BE READ IS NOT AN EMPTY STORE. Returning an empty
    // set here would turn an unreadable directory into "every move id is
    // dangling", and a caller would render a refusal naming the Legs rather
    // than the missing store — a true refusal for a false reason.
    return { error: `the Move library at ${movesDir} cannot be read (${e.message}) — `
      + `a Leg binds a Move by id (the Leg's shape v18) and the ids resolve against this store (the Leg-Move instantiation contract); `
      + `pass --moves-dir if the library is not at the default path` };
  }
  const ids = new Set();
  for (const n of names) {
    if (!n.endsWith(".md")) continue;
    const id = n.slice(0, -3);
    if (id === "INDEX") continue; // the regenerated view, never a record (the Move file interiora)
    ids.add(id);
  }
  if (ids.size === 0) {
    return { error: `the Move library at ${movesDir} holds no Move records — `
      + `every Leg's move id would dangle, which is a store problem and not a composition one (the Leg-Move instantiation contract)` };
  }
  return { ids };
}

// THE MECHANICAL HALF. Refuse the FIRST Leg whose move id resolves to no
// record, naming the Leg and the id — the refusal shape ruling 1 names.
// `legs` here are Leg RECORDS (composition side) or the parsed leg blocks
// of an existing Brief (draft side); both carry `leg_id` and `move`, which
// is the whole of what this reads, so one function serves both occasions
// rather than two that can disagree about what dangling means.
export function resolveMoveIds(legs, movesDir = "moves") {
  const store = loadMoveIds(movesDir);
  if (store.error) return store;
  for (const s of legs) {
    const id = s.move;
    if (typeof id !== "string" || id === "") {
      // Shape, not resolution — validateLegs owns this on the composition
      // side. Reached on the draft side, where the input is a parsed document.
      return { error: `leg ${s.leg_id}: no move is bound — a Leg binds a Move library entry by id (the Leg's shape v18), `
        + `because the Move is the State component of a Leg` };
    }
    if (!store.ids.has(id)) {
      return { error: `leg ${s.leg_id}: move "${id}" resolves to no record in the Move library `
        + `(${movesDir}/${id}.md does not exist) — a Leg INSTANTIATES a Move, so a Move that is not there `
        + `leaves the Leg with no reader-state transition type to be the instance of (the Leg-Move instantiation contract). `
        + `Bind an admitted Move, or admit this one to the library first — the library grows by an `
        + `admission act, never by a Brief naming an id (the Move library)` };
    }
  }
  return { ok: true, checked: legs.length, store_size: store.ids.size };
}

// ---------------------------------------------------------------------------
// THE MOVE CONTRACT READER (kogaki#1125).
//
// `loadMoveIds` above states why IT reads ids alone, and that statement bounds
// this reader rather than being contradicted by it. The clause it names is
// "one edit away from COMPARING them" — and comparing is exactly what nothing
// here does. This reader RENDERS `before` and `after` into a judge's input
// and returns them to its caller verbatim; it matches no string against any
// other, computes no verdict, and is never consulted by a validator that
// decides whether a Leg's reader states hold. The specialization judgment
// stays where the judgment rule sites it: with the judge, inside each compose
// job unit (kogaki#1307), over a record whose SHAPE this file owns.
//
// WHAT IT IS FOR, and the defect it closes (kogaki#1125). Two states were
// asked about Move contracts they were never handed. `compose_path` composed
// the `move` field with the field's NAME and no set of legal values, and
// invented six ids that read like Moves; the specialization judge was asked to
// judge each Leg's states as specializations of "the before and after its
// bound Move declares" with no Move record in its input at all. A judge asked
// about a record it was never given answers from nothing — which is what the
// honest first attempt said, and what the re-ask then pressured into a
// well-formed pass.
//
// THE PRIMARY REMEDY IS GENERATIONAL, and the ordering is deliberate: the
// composer is handed the admitted set so a dangling id is not composable,
// rather than only being caught afterwards by one more check.
//
// consulted: coding::lesson/constrain-generation-not-post-hoc-detection@b31d159e45b64065d0deb0944d975ac9a472c1f8c22c872784c66325740e9fe9

// One top-level scalar of a Move record. The record is a flat mapping whose
// values are folded (`>-`) or literal (`|`) blocks, or plain inline scalars;
// `figureOf` above reads the one NESTED block by the same dedent rule, and
// this reads the flat ones. Returns null where the field is absent, which the
// callers refuse by name rather than papering over with an empty string.
function moveScalarField(text, name) {
  const lines = text.split("\n");
  const head = new RegExp(`^${name}:[ \\t]*(.*)$`);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const marker = m[1].trim();
    if (marker !== "" && !/^[>|][-+]?$/.test(marker)) {
      // An inline scalar, quoted or bare. EMPTY IS ABSENT ON THIS ARM TOO, and
      // the symmetry is the point rather than tidiness (PR #1127 round 1): the
      // block arm below reports an empty block as absent, so `before: ""` on
      // this arm would be the one authoring form that yields a present-but-blank
      // contract — and a judge handed a blank to compare against is the shape
      // this whole reader exists to end, arriving one spelling over.
      const inline = marker.replace(/^(['"])([\s\S]*)\1$/, "$2").trim();
      return inline === "" ? null : inline;
    }
    // A block scalar: every following INDENTED line, to the first that is not.
    // Folded (`>`) joins on a space, literal (`|`) keeps the newlines — the
    // distinction is the block marker's, read rather than assumed, so a Move
    // written either way renders as its author wrote it.
    const folded = marker === "" || marker.startsWith(">");
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j];
      if (l.trim() === "") { body.push(""); continue; }
      if (!/^[ \t]/.test(l)) break;
      body.push(l.trim());
    }
    while (body.length && body[body.length - 1] === "") body.pop();
    const joined = folded ? body.join(" ").replace(/\s+/g, " ") : body.join("\n");
    return joined.trim() === "" ? null : joined.trim();
  }
  return null;
}

// THE QUESTION-CHAIN JUDGE INPUT IS RETIRED (kogaki#1325). `questionChainPairs`
// stood here: one entry per adjacent Leg pair, Leg N's `reader_state_after`
// question line beside Leg N+1's `reader_state_before` question line, for
// `review_path` to judge whether the two named the same question
// (kogaki#1283, narrowed to the Leg lines by kogaki#1324). With the
// before-state derived from the previous after-state, the two lines are one
// line, and a judgment over a line and itself buys nothing. The Move's `after`
// question against the state is the Move-fit judge's after-state comparison.

// THE DISCHARGE JUDGE INPUT (kogaki#1283). One entry per Closure row carrying
// `discharged_by` -- the row's own text against the discharging Leg's claim
// lines (each claim's `proposition`), for `review_path` to judge whether
// every part the row owes has an answer among them.
export function dischargeRows(legs, obligations = []) {
  const byId = new Map(legs.map((l) => [l.leg_id, l]));
  return (Array.isArray(obligations) ? obligations : [])
    .filter((o) => o && o.discharged_by !== undefined)
    .map((o) => {
      const leg = byId.get(o.discharged_by);
      return {
        row: o.text,
        introduced_by: o.introduced_by,
        discharging_leg: o.discharged_by,
        claims: leg && Array.isArray(leg.claims) ? leg.claims.map((cl) => cl.proposition) : [],
      };
    });
}

// ---- THE ADAPTER (kogaki#1349): Move field -> role, declared by the library ----
//
// `moves/ROLES.json` is the one carrier of which Move field feeds which
// reader (specs/spec-draft-pipeline/SPEC.md field-roles table). This reader
// resolves it WITH NO FALLBACK: a Move library with no declaration is a
// library this adapter cannot read at all, never one it reads against a
// built-in default — a fallback is exactly what would make the rename
// fixture in Acceptance unobservable (owner decision 2026-10-12). Every role
// still emits under its CURRENT output key, so the compose and judge inputs
// stay byte-identical to what they were before the declaration existed.
export function moveRoles(movesDir = "moves") {
  const p = join(movesDir, "ROLES.json");
  let text;
  try { text = readFileSync(p, "utf8"); }
  catch (e) {
    return { error: `the Move library at ${movesDir} carries no ROLES.json (${e.message}) — a Move library is `
      + `its records AND its field-to-role declaration, and this adapter reads the declaration with no fallback `
      + `to any built-in mapping (kogaki#1349)` };
  }
  let decl;
  try { decl = JSON.parse(text); }
  catch (e) {
    return { error: `${p} does not parse as JSON (${e.message})` };
  }
  if (!decl || typeof decl.required !== "object" || decl.required === null
    || typeof decl.optional !== "object" || decl.optional === null) {
    return { error: `${p} declares no \`required\` and \`optional\` role-to-field mapping (kogaki#1349)` };
  }
  return { roles: decl };
}

// The required roles, mapped to the compose/judge output key each has always
// emitted under (kogaki#1349: "each role emitting under its current output
// key so compose and judge inputs stay byte-identical").
const REQUIRED_ROLE_OUTPUT_KEYS = [["state-before", "before"], ["state-after", "after"]];
// The optional roles this reader has a use for. A role this library's
// declaration leaves null is carried on the output as null, exactly as
// `segments` already was before this adapter existed (kogaki#1320).
const OPTIONAL_ROLE_OUTPUT_KEYS = [["specialized-by-the-Leg", "technique"], ["tests", "breaks"], ["segments", "segments"]];

export function moveContract(moveId, movesDir = "moves") {
  let text;
  try { text = readFileSync(join(movesDir, `${moveId}.md`), "utf8"); }
  catch (e) {
    return { error: `move "${moveId}" cannot be read from ${movesDir} (${e.message})` };
  }
  const rolesResult = moveRoles(movesDir);
  if (rolesResult.error) return rolesResult;
  const { required, optional } = rolesResult.roles;
  const out = { id: moveId };
  const missing = [];
  for (const [role, outKey] of REQUIRED_ROLE_OUTPUT_KEYS) {
    const field = required[role];
    if (typeof field !== "string" || field === "") {
      return { error: `${movesDir}/ROLES.json names no field for the required role "${role}" — every schema maps `
        + `identity, state-before and state-after (specs/spec-draft-pipeline/SPEC.md field-roles table)` };
    }
    const v = moveScalarField(text, field);
    if (v === null) missing.push(field);
    else out[outKey] = v;
  }
  if (missing.length) {
    // A STORE FAULT, NAMED AS ONE. A Move whose contract is half-written
    // cannot be judged against, and reporting it as a composition problem
    // would send the reader to the Brief rather than to the library.
    return { error: `move "${moveId}" declares no ${missing.join(" and no ")} (${movesDir}/${moveId}.md) — `
      + `the composer reads a Move by its required roles' fields and the specialization judgment compares each Leg against them (kogaki#1276), `
      + `so a record missing one leaves both with nothing to read. Repair the Move record under its own issue.` };
  }
  for (const [role, outKey] of OPTIONAL_ROLE_OUTPUT_KEYS) {
    const field = optional[role];
    if (typeof field !== "string" || field === "") {
      out[outKey] = null; // the declaration leaves this role unmapped
      continue;
    }
    const v = moveScalarField(text, field);
    if (v === null && (role === "specialized-by-the-Leg" || role === "tests")) {
      // Mapped AND absent from the record is a half-written contract, same
      // as a missing required field — the declaration says this library's
      // Moves carry the role, so a record that does not is the fault.
      return { error: `move "${moveId}" declares no ${field} (${movesDir}/${moveId}.md) — `
        + `the composer reads a Move by its required roles' fields and the specialization judgment compares each Leg against them (kogaki#1276), `
        + `so a record missing one leaves both with nothing to read. Repair the Move record under its own issue.` };
    }
    // `segments` IS OPTIONAL EVEN WHEN MAPPED (kogaki#1320): the 21 Moves
    // ingested before the field existed carry none, and the composer and the
    // fit judge fall back to `technique` where it is absent rather than
    // refusing.
    out[outKey] = v;
  }
  return out;
}

// THE AUDIENCE FILE (kogaki#1370, owner decision 2026-10-13): one
// owner-authored file under `audiences/` holding two keys -- `persona`, who
// is read to, and `register`, how they are addressed. `audienceSection`
// returns the indented lines under a top-level key, dedented, so the flat
// scalar reader below reads the `persona` map's two fields exactly as it
// reads a Move record's.
export function audienceSection(text, name) {
  const lines = text.split("\n");
  const head = new RegExp(`^${name}:[ \\t]*$`);
  const at = lines.findIndex((l) => head.test(l));
  if (at < 0) return null;
  const body = [];
  for (let j = at + 1; j < lines.length; j++) {
    const l = lines[j];
    if (l.trim() !== "" && !/^[ \t]/.test(l)) break;
    body.push(l);
  }
  const indents = body.filter((l) => l.trim() !== "").map((l) => l.match(/^[ \t]*/)[0].length);
  if (!indents.length) return null;
  const cut = Math.min(...indents);
  return body.map((l) => l.slice(Math.min(cut, l.match(/^[ \t]*/)[0].length))).join("\n");
}

// THE PERSONA, the Audience file's `persona` key (kogaki#1216, owner-approved
// design 2026-09-28; moved under the Audience by kogaki#1370). TWO fields and
// nothing more: `reader` — who they are
// by what they do and in which genre they are reading (kogaki#1225 dropped
// why they opened it: a purpose is not observable at the title, and it is
// what steered Reader start toward a reader who had already lived the
// article's problem) — and `prior_knowledge` — what can be used without
// explanation, and what cannot. Nothing about attitude, trust or the reader's
// question: those are Reader start dimensions, and holding them here would
// duplicate it. The
// map is flat `key: value` like a Move record, so the same scalar reader
// serves both; a missing field is a store fault named by field, exactly as a
// half-written Move contract is. The Persona is an INPUT to authoring Reader
// start and is never copied into the Brief.
// `reader` IS REQUIRED; `prior_knowledge` IS NOT (kogaki#1281, owner decision
// 2026-10-06). The Persona may be empty or very general ("Student", "Office
// Worker"), and a Persona that grants no prior knowledge is a real Persona
// rather than a half-written one -- `personaPriorKnowledgeLine` below is what
// turns its absence into a stated absence rather than a refusal.
export const READER_PERSONA_FIELDS = ["reader"];
export const READER_PERSONA_OPTIONAL_FIELDS = ["prior_knowledge"];
export function readerPersona(path) {
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) {
    return { error: `the Audience file ${path} cannot be read (${e.message}) — the Brief workflow table names it, and `
      + "Reader start is authored from its `persona` and the Thesis (kogaki#1216)" };
  }
  const out = { id: moveScalarField(text, "id") };
  const persona = audienceSection(text, "persona") ?? "";
  const missing = [];
  for (const f of READER_PERSONA_FIELDS) {
    const v = moveScalarField(persona, f);
    if (v === null) missing.push(`persona.${f}`);
    else out[f] = v;
  }
  for (const f of READER_PERSONA_OPTIONAL_FIELDS) {
    out[f] = moveScalarField(persona, f); // null is a stated absence, read by personaPriorKnowledgeLine
  }
  if (missing.length) {
    return { error: `the Audience file ${path} declares no ${missing.join(" and no ")} — the Persona names `
      + `at least ${READER_PERSONA_FIELDS.join(" and ")} (kogaki#1216), and Reader start cannot be authored from half of it. `
      + "Repair the Audience file under its own issue." };
  }
  return out;
}

// THE STATED ABSENCE (kogaki#1281): an absent or empty `prior_knowledge`
// refuses nothing. Its one reader is Reader start's authoring at the
// `differentiation` state, which carries the Persona's `prior_knowledge` line
// OR this sentence -- never `undefined`, and never a refusal. It grants a
// claim no word (kogaki#1331, owner decision 2026-10-10).
export const PERSONA_PRIOR_KNOWLEDGE_ABSENT =
  "(the Persona declares no prior_knowledge)";
export function personaPriorKnowledgeLine(persona) {
  const v = persona && persona.prior_knowledge;
  return (typeof v === "string" && v.trim() !== "") ? v : PERSONA_PRIOR_KNOWLEDGE_ABSENT;
}

// THE AUDIENCE'S `register` (kogaki#1251 item 1, kogaki#1261, kogaki#1370):
// the Write block's reader-dependent rules, rendered into the Leg Packet's
// `{{register}}` slot as the file writes them. Read separately from
// `readerPersona` because its one reader is the Packet, not Reader start's
// authoring, and an Audience without the register still serves Reader start. A
// missing register refuses by name: the Packet is the writer's entire input, and
// a Write block with no register is a hole the writer fills by invention.
export function readerProse(path) {
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) {
    return { error: `the Audience file ${path} cannot be read (${e.message}) — the Packet's register is its \`register\` key (kogaki#1261, kogaki#1370)` };
  }
  const register = moveScalarField(text, "register");
  if (register === null) {
    return { error: `the Audience file ${path} declares no \`register\` — the Packet's Write block renders the Audience's register from it (kogaki#1261, kogaki#1370). `
      + "Repair the Audience file under its own issue." };
  }
  return { register };
}

// THE WHOLE ADMITTED SET, for the composing state's input. Ordered by id so
// two runs over one library render byte-identical inputs — a judge input that
// reordered with the filesystem would make two asks look different when
// nothing about the library had changed.
export function loadMoveContracts(movesDir = "moves") {
  const store = loadMoveIds(movesDir);
  if (store.error) return store;
  const moves = [];
  for (const id of [...store.ids].sort()) {
    const c = moveContract(id, movesDir);
    if (c.error) return { error: c.error };
    moves.push(c);
  }
  return { moves };
}

// THE CONTRACTS OF THE MOVES A PATH ACTUALLY BINDS, one per Leg and in the
// path's own order. `resolveMoveIds` is called FIRST and its refusal is
// returned unchanged: a dangling id is a resolution fault with a refusal of
// its own, and discovering it here would give it a second, worse wording.
export function moveContractsForLegs(legs, movesDir = "moves") {
  const resolved = resolveMoveIds(legs, movesDir);
  if (resolved.error) return resolved;
  const out = [];
  for (const s of legs) {
    const c = moveContract(s.move, movesDir);
    if (c.error) return { error: `leg ${s.leg_id}: ${c.error}` };
    // THE LEG'S WAYPOINTS RIDE BESIDE THE MOVE'S `technique` AND `breaks`
    // (kogaki#1311): the fit judgment judges the waypoints against those two,
    // so the input sets them side by side rather than leaving the judge to
    // find them in the Leg array. `segments` RIDES BESIDE THEM TOO
    // (kogaki#1320), null where the Move carries none, so the fit judge
    // compares the waypoints' order against `segments` and falls back to
    // `technique` only where that read is null.
    out.push({ leg_id: s.leg_id, move: s.move, before: c.before, after: c.after, technique: c.technique, breaks: c.breaks,
      segments: c.segments, waypoints: s.waypoints });
  }
  return { contracts: out };
}

// THE JUDGED HALF's carrier contract, read from the schema rather than
// restated here — the same single-carrier arrangement record-schema.json and
// gate-schema.json use, so the vocabulary is amended in one place.
let SPECIALIZATION_SCHEMA = null;
export function specializationSchema() {
  if (SPECIALIZATION_SCHEMA) return SPECIALIZATION_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "specialization-schema.json");
  SPECIALIZATION_SCHEMA = JSON.parse(readFileSync(p, "utf8"));
  return SPECIALIZATION_SCHEMA;
}

// The gate carrier's two artifacts, read rather than restated — the same
// single-carrier arrangement `specializationSchema` above uses. the owner gate over a passing specialization record's gate
// is declared in the registry like every other gate this repository raises,
// and the capture's filename suffix is a JOIN KEY the check resolves by, so a
// second copy of either would let a rename pass silently.
let GATE_SCHEMA = null;
export function gateSchema() {
  if (GATE_SCHEMA) return GATE_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "gate-schema.json");
  GATE_SCHEMA = JSON.parse(readFileSync(p, "utf8"));
  return GATE_SCHEMA;
}
let GATE_REGISTRY = null;
export function gateRegistry() {
  if (GATE_REGISTRY) return GATE_REGISTRY;
  const p = join(dirname(fileURLToPath(import.meta.url)), "gate-registry.json");
  GATE_REGISTRY = JSON.parse(readFileSync(p, "utf8"));
  return GATE_REGISTRY;
}

// VALIDATE, NEVER COMPOSE. Every branch below is a refusal or a pass; none
// writes a verdict, fills a default, or infers one from a Leg's fields. A
// record that is absent is refused by the CALLER (the occasion is mandatory,
// the Leg-Move instantiation contract), because "no record" is a fact about the act rather than about the
// record's shape.
export function validateSpecialization(record, legs, candidateId, { refuseFailing = true } = {}) {
  const sch = specializationSchema();
  const at = "the specialization record";
  for (const k of sch.record.required) {
    if (record?.[k] === undefined) {
      return { error: `${at}: ${k} is required (the Leg-Move instantiation contract) — the record is the judgment's carrier, and a carrier missing a required field records nothing` };
    }
  }
  if (String(record.version) !== sch.record.version_must_be) {
    return { error: `${at}: version ${JSON.stringify(record.version)} — this runtime reads version ${sch.record.version_must_be} (src/specialization-schema.json)` };
  }
  if (record.candidate_id !== candidateId) {
    return { error: `${at}: judges candidate ${JSON.stringify(record.candidate_id)} but ${JSON.stringify(candidateId)} is being adopted — `
      + `a record composed against one Candidate cannot certify another (the Leg-Move instantiation contract). Judge the Candidate you are adopting.` };
  }
  if (!Array.isArray(record.verdicts)) {
    return { error: `${at}: verdicts is an array, one entry per Leg of the adopted path (the Leg-Move instantiation contract)` };
  }
  const vocab = new Set(sch.vocabulary.values);
  const passing = new Set(sch.vocabulary.passing);
  const byLeg = new Map();
  for (const v of record.verdicts) {
    for (const k of sch.verdict.required) {
      if (typeof v?.[k] !== "string" || v[k] === "") {
        return { error: `${at}: a verdict is missing ${k} — the Leg-Move instantiation contract's verdict names the Leg, the Move it instantiates, the verdict, and one sentence of why` };
      }
    }
    if (byLeg.has(v.leg_id)) {
      return { error: `${at}: two verdicts for leg ${v.leg_id} — one per Leg, exactly (the Leg-Move instantiation contract)` };
    }
    byLeg.set(v.leg_id, v);
  }
  // A verdict for a Leg outside the adopted path means the record was
  // composed against a different path than the one being adopted.
  for (const v of record.verdicts) {
    if (!legs.some((s) => s.leg_id === v.leg_id)) {
      return { error: `${at}: verdict for leg ${v.leg_id}, which is not in the adopted path `
        + `(${legs.map((s) => s.leg_id).join(", ")}) — the record judges the path being adopted and no other (the Leg-Move instantiation contract)` };
    }
  }
  // ONE PER LEG, EXACTLY — the other direction, and it is the FIRST branch of
  // the loop below rather than a pass of its own. That siting is deliberate:
  // as a separate preceding loop it was a completeness check that the per-Leg
  // loop then silently DEPENDED on, so removing it did not make this function
  // refuse — it made it throw on `v.move` several lines later. One guard, in
  // the loop that needs the value, keeps the function total: every path out of
  // it is a refusal or a pass, and there is no ordering between two guards for
  // a later edit to break.
  for (const s of legs) {
    const v = byLeg.get(s.leg_id);
    if (v === undefined) {
      return { error: `${at}: leg ${s.leg_id} carries no verdict — the specialization judgment is per Leg and cannot be skipped for one (the Leg-Move instantiation contract)` };
    }
    if (v.move !== s.move) {
      return { error: `${at}: leg ${s.leg_id}'s verdict judges move "${v.move}" but the Leg binds "${s.move}" — `
        + `the judgment is about THIS Leg instantiating THIS Move, so a record naming another one certifies nothing (the Leg-Move instantiation contract)` };
    }
    if (!vocab.has(v.verdict)) {
      return { error: `${at}: leg ${s.leg_id}: verdict ${JSON.stringify(v.verdict)} — the Leg-Move instantiation contract's vocabulary is closed: `
        + `${sch.vocabulary.values.join(" | ")}` };
    }
    if (v.why.trim().split(/\s+/).length < sch.verdict.why_min_words) {
      return { error: `${at}: leg ${s.leg_id}: why is ${v.why.trim().split(/\s+/).length} word(s) — `
        + `the record carries one sentence of why, which is what a reader of a refusal is handed (the Leg-Move instantiation contract)` };
    }
  }
  if (!refuseFailing) return { ok: true, judged: legs.length };
  // THE REFUSAL, deterministic and in the path's own order: the FIRST Leg
  // that does not pass, named, with its own sentence quoted back rather than
  // paraphrased.
  for (const s of legs) {
    const v = byLeg.get(s.leg_id);
    if (!passing.has(v.verdict)) {
      const why = v.verdict === "cannot-determine"
        ? `the judgment could not be reached against that Move's contract`
        : `the instantiated reader states contradict that Move's before/after`;
      return { error: `leg ${s.leg_id}: ${v.verdict} — ${why}. The judging sitting wrote: `
        + `"${v.why.trim()}" — a Leg whose instantiation does not hold is not adopted into a Brief (the Leg-Move instantiation contract). `
        + `Nothing was written.` };
    }
  }
  return { ok: true, judged: legs.length };
}

// EVERY LEG WHOSE VERDICT DOES NOT PASS, in path order, each with the judge's
// own sentence (kogaki#1276). Read over a record `validateSpecialization`
// already admitted, so every Leg carries exactly one verdict.
export function specializationFailures(record, legs) {
  const passing = new Set(specializationSchema().vocabulary.passing);
  const byLeg = new Map((record.verdicts || []).map((v) => [v.leg_id, v]));
  return legs
    .map((s) => byLeg.get(s.leg_id))
    .filter((v) => v && !passing.has(v.verdict))
    .map((v) => ({ leg_id: v.leg_id, move: v.move, verdict: v.verdict, why: v.why.trim() }));
}

// ---------------------------------------------------------------------------
// THE OWNER RATIFICATION GATE (the owner gate over a passing specialization record, kogaki#893; owner selection
// 2026-09-05).
//
// Everything above is the record's SHAPE and the refusal, and none of it
// reaches the thing that actually unlocks the write: a record whose every
// verdict reads `consistent`. That verdict is the composing sitting's own,
// and a shape-valid record of judgment-free `consistent` verdicts adopted a
// Candidate with no refusal — the right act with the guard silently
// disabled.
//
// WHAT THIS IS NOT. It renders no verdict on a specialization, reads no
// Move's `before`/`after`, and compares nothing to anything. the judgment rule clause 3
// and the constraints that survive are untouched: the record is carried to the owner AS GATE EVIDENCE,
// which is exactly what the constraints that survive already says happens to before/after matching,
// and the owner approves a result, which is where the judgment rule clause 2 already sites
// the human gate. The declined arm — a string-match anchor over the Move
// contract — is the one that owed those sections an amendment.

// THE DIGEST THE DISCLOSURE SENTENCE NAMES. Over the verdicts AS JUDGED, in
// the adopted path's order rather than the record's, so a record whose
// verdicts are merely reordered digests identically and a record whose
// judgment changed does not.
//
// IT BINDS NO CAPTURE ANY MORE (kogaki#1108). It was the key a ratification
// capture was bound to, on the two-axis rule `src/specialization-schema.json`
// stated: the owner ratified THIS Candidate and THIS record, and any edit to
// any verdict invalidated the capture. With the ratification gate removed
// there is no capture to bind, and what the digest is for is naming the record
// in adoption's closing summary — so two adoptions of the same path under
// different judgments are still distinguishable in the record of what was
// disclosed.
export function specializationDigest(record, legs) {
  const byLeg = new Map((record.verdicts || []).map((v) => [v.leg_id, v]));
  const rows = legs.map((s) => {
    const v = byLeg.get(s.leg_id) || {};
    return [v.leg_id, v.move, v.verdict, typeof v.why === "string" ? v.why.trim() : v.why];
  });
  const canonical = JSON.stringify([String(record.version), record.candidate_id, rows]);
  return createHash(specializationSchema().disclosure.digest.algorithm).update(canonical).digest("hex");
}

// `validateRatification` IS DELETED, NOT DEPRECATED (kogaki#1108). It read a
// ratification capture and refused on every axis that could let one certify
// something it did not judge. With `brief-specialization-ratification` gone
// from the gate registry there is no such capture and no gate to take one at,
// so a surviving validator would be a reader for a document nothing writes --
// and, kept "for compatibility", the route by which the removed gate comes
// back one caller at a time. A leftover import fails at load.
//
// ---------------------------------------------------------------------------
// THE OWNER-ANSWER CAPTURE (kogaki#891, owner selection 2026-09-05).
//
// the owner gate over a passing specialization record's ratification gate above is ONE gate. These two functions are the
// same discipline made reusable for the two gates that carry the owner's own
// DECISION rather than their ratification of a machine record: the
// thesis-determination gate (the durable home and the entry point) and the Candidate-selection gate (the Candidate gate).
// Both answers used to reach the runtime as arguments the model composed —
// `adopt --thesis`, `adopt-candidate --candidate` — with no evidence field of
// any kind, so the Harness's most consequential write in this pipeline was
// authorised by the model's account of what the owner chose.
//
// WHY A DIGEST OVER THE OPTION SET, and not over the answer. A capture
// certifies an answer GIVEN A SET OF OPTIONS: the same option id offered
// beside different alternatives is a different question. Binding to the
// offered set is what stops a capture taken at one rendering certifying a
// choice at another — the one-axis analogue of the owner gate over a passing specialization record's two-axis binding,
// and the axis that matters here because the answer IS the option id rather
// than a ratification of something the id points at.
//
// THE FREE-TEXT CHANNEL RIDES THE CAPTURE, which is acceptance item 3 of
// kogaki#891. A free-form Thesis is the owner's own words, so it is exactly
// the value that must not arrive as a model-composed argument; it reaches the
// run state through `answer.free_text` on a captured row or it does not reach
// it at all.
export function ownerGateDigest(gateId, optionIds) {
  const canonical = JSON.stringify([gateId, [...optionIds]]);
  return createHash(gateSchema().capture.digest_algorithm || "sha256").update(canonical).digest("hex");
}

// Reads the one row for THIS gate and refuses on every axis that could let a
// capture certify an answer it does not record. Absence is refused by the
// CALLER, for the reason the owner gate over a passing specialization record already states: "no answer" is a fact about
// an act that did not happen, not about a capture's shape.
export function validateOwnerAnswer(capture, gateId, digest) {
  const at = `the ${gateId} capture`;
  const rows = capture?.rows;
  if (!Array.isArray(rows)) {
    return { error: `${at}: rows is an array of captured gate answers (SPEC-gate-carrier, payload and answer capture) — this document carries none, so it records no owner act` };
  }
  const mine = rows.filter((r) => r?.gate_id === gateId);
  if (mine.length === 0) {
    return { error: `${at}: no row for gate ${gateId} — the document carries ${rows.length} row(s) and none of them is this gate's, so nothing here records the owner's answer` };
  }
  // THE LAST ROW, for the reason validateRatification states: a gate can be
  // re-raised, and the answer that governs is the one the owner gave last.
  const row = mine[mine.length - 1];
  const ev = row.evidence;
  if (ev?.tool !== "AskUserQuestion") {
    return { error: `${at}: evidence.tool is ${JSON.stringify(ev?.tool)} — this is an OWNER act at the question UI, and SPEC-gate-carrier binds this repository's gate medium to AskUserQuestion. A row recording any other tool records a session's own act` };
  }
  if (typeof ev.tool_use_id !== "string" || ev.tool_use_id === "") {
    return { error: `${at}: evidence.tool_use_id is missing — it is the one field tying this row to a question the harness actually asked, and without it the row is indistinguishable from one a session composed` };
  }
  const bound = row.answers_over;
  if (bound?.option_set_digest === undefined) {
    return { error: `${at}: answers_over.option_set_digest is required — a capture that does not name WHICH OPTION SET it answered certifies whatever it is presented beside` };
  }
  if (bound.option_set_digest !== digest) {
    return { error: `${at}: answers the option set digesting ${JSON.stringify(bound.option_set_digest)}, but the options now offered digest ${JSON.stringify(digest)} — the option set CHANGED after the gate was raised, so the owner chose among alternatives other than these. Re-raise the gate. Nothing was written.` };
  }
  const answer = row.payload?.answer;
  if (answer === undefined || typeof answer !== "object") {
    return { error: `${at}: the row carries no payload.answer — the capture records that a question was asked and not what was answered` };
  }
  const option = answer.option;
  const freeText = answer.free_text;
  const hasOption = typeof option === "string" && option !== "";
  const hasFreeText = typeof freeText === "string" && freeText.trim() !== "";
  if (!hasOption && !hasFreeText) {
    return { error: `${at}: the answer carries neither an option nor free text — an empty answer is not an answer` };
  }
  return { ok: true, option: hasOption ? option : undefined,
    free_text: hasFreeText ? freeText : undefined,
    slug: typeof answer.slug === "string" && answer.slug !== "" ? answer.slug : undefined,
    tool_use_id: ev.tool_use_id, stop_id: row.stop_id };
}

// ---------------------------------------------------------------------------
// THE MOVE EXEMPLAR PREDICATE — RETIRED (SPEC-draft-pipeline, kogaki#1175).
//
// This section used to make a Move record's `excerpt` field the Packet's
// exemplar: a record whose `excerpt` carried text served as what a later
// writer imitates, rendered by `moveExcerpt`/`isExemplar`/`renderExcerptBlock`,
// which stood here. `excerpt` is retired with the rest of the eight-field
// schema; `evidence`, the field a reader might reach for in its place, does
// NOT inherit the role (owner ruling 7, kogaki#1173, 2026-09-23) — it is
// optional, typically empty, and read by nothing downstream (the schema's
// role table). The Leg Packet's Move block is `technique`, `question`,
// `draws_on`, `breaks`; none of the four is source text a writer imitates
// verbatim.

// ---------------------------------------------------------------------------
// THE READER-KNOWLEDGE LEDGER (the reader-knowledge ledger, kogaki#751; owner ruling 2026-09-01).
//
// A Leg may declare `introduces` — the terms or concepts it puts in front of
// the reader for the first time, each bare or carrying a one-line meaning
// anchor where the Leg's own claims do not supply it. The harness then
// DERIVES what a reader already knows at Leg N as the union of Legs 1..N-1's
// entries.
//
// ACCUMULATION IS ALWAYS COMPUTED, NEVER STORED. `reader_already_knows` is not
// a field, is not written into a Brief, and is not carried in a run record —
// it is a function of the path, recomputed wherever it is needed. A stored
// copy would be a second answer to a question the path already answers, and it
// would go stale the moment a Leg moved.
//
// What the field buys, stated because it is the whole point: an unintroduced
// term becomes ADDRESSABLE. Responsibility traces to the first Leg carrying
// the term, or to the Brief when no Leg does — which is a fact about the path
// rather than a judgment about the prose.

// The entry grammar, in one place because two readers consume it: the
// composition side validates records, and `draft.mjs parseBrief` parses the
// serialized form back. A `term` alone, or `term — anchor`, on one line.
const INTRODUCES_SEP = "—";

// AN ENTRY IS A STRING (the Brief's own serialized form, round-tripped by
// `draft.mjs`) OR AN `introduces_item` OBJECT (the Candidate's own composed
// form, src/leg-schema.json `introduces_item`; kogaki#1263, kogaki#1260): a
// Candidate composes `{term, kind, source, nearest, differs}` directly as
// JSON, and that object is what `kind`-the-closed-set and `nearest`'s
// path-level dedup (item 2 below) are read from. THE BRIEF CARRIES THE ITEM
// AS ITS FIELDS (kogaki#1261; a map in the Brief record since kogaki#1328):
// `legRecord` writes an `introduces_item` as the map it was, and a JSON line
// written before that still parses back here to the object it was, so the
// Packet can render the term's kind and authority line from the Brief alone.
export function parseIntroducesEntry(raw) {
  if (typeof raw === "string" && /^\s*\{[\s\S]*\}\s*$/.test(raw)) {
    let obj;
    try { obj = JSON.parse(raw); } catch { obj = null; }
    if (obj && typeof obj === "object" && !Array.isArray(obj)) return parseIntroducesEntry(obj);
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const term = typeof raw.term === "string" ? raw.term.trim() : "";
    if (term === "") return { error: "an introduces_item with no term" };
    if (raw.kind !== "coined" && raw.kind !== "established") {
      return { error: `"${term}" declares kind ${JSON.stringify(raw.kind ?? null)} — introduces_item's kind is closed to coined, established (src/leg-schema.json, \`introduces_item\`)` };
    }
    if (raw.kind === "established" && (typeof raw.source !== "string" || raw.source === "")) {
      return { error: `"${term}" declares kind "established" with no source — an established term names where it comes from (src/leg-schema.json, \`introduces_item\`)` };
    }
    if (raw.kind === "coined" && (typeof raw.meaning !== "string" || raw.meaning === "")) {
      return { error: `"${term}" declares kind "coined" with no meaning — a coined term names its own meaning, since nothing outside this Leg can supply it (src/leg-schema.json, \`introduces_item\`)` };
    }
    if (raw.differs !== undefined && (typeof raw.nearest !== "string" || raw.nearest === "")) {
      return { error: `"${term}" carries differs with no nearest — differs names how the term differs FROM nearest, so it names nothing without it (src/leg-schema.json, \`introduces_item\`)` };
    }
    return { term, anchor: null, kind: raw.kind, source: raw.source, meaning: raw.meaning, nearest: raw.nearest, differs: raw.differs };
  }
  const line = String(raw).trim();
  if (line === "") return { error: "an empty entry" };
  const i = line.indexOf(INTRODUCES_SEP);
  if (i === -1) return { term: line, anchor: null };
  const term = line.slice(0, i).trim();
  const anchor = line.slice(i + INTRODUCES_SEP.length).trim();
  if (term === "") return { error: `an entry with no term before the ${INTRODUCES_SEP}` };
  if (anchor === "") return { error: `"${term}" carries a ${INTRODUCES_SEP} with no meaning anchor after it — write the term bare, or anchor it` };
  return { term, anchor };
}

// THE WHOLE-WORD, CASE-INSENSITIVE MATCH ITSELF, shared by every mechanical
// introduced-term refusal (Reader start, kogaki#1225; a Section heading,
// kogaki#1327). The boundary is "not adjacent to a letter or digit" rather
// than `\b`, so a term ending in punctuation or a non-ASCII letter still
// bounds on both sides, and a one-character term matches only standing alone.
function wholeWordMatch(term, text) {
  const t = String(term).trim().toLowerCase();
  if (t === "") return false;
  const haystack = String(text).toLowerCase();
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(t, from);
    if (i === -1) return false;
    const before = i === 0 ? "" : haystack[i - 1];
    const after = haystack[i + t.length] ?? "";
    const wordish = (c) => c !== "" && /[\p{L}\p{N}_]/u.test(c);
    if (!wordish(before) && !wordish(after)) return true;
    from = i + 1;
  }
}

// THE MATCH READS EACH LINE'S CONTENT, NEVER ITS DIMENSION LABEL (PR #1228
// round 1): a Reader start is `dimension: value` lines, so matching the whole
// string let a Leg introducing "trust" or "question" refuse every Reader
// start on the label alone. The `<dimension>:` prefix is stripped per line
// the way `readerStateDimensionLine` reads it, and the values are searched.
export function introducedTermInReaderStart(term, readerStart) {
  const text = String(readerStart).split("\n")
    .map((line) => line.replace(/^\s*[a-z]+:\s*/i, ""))
    .join("\n");
  return wholeWordMatch(term, text);
}

// the Section grouping's `opens_section` (kogaki#822) — OPTIONAL, and shape-validated here for
// the reason `introduces` is: the title reaches an owner-facing heading, so an
// unvalidated value renders as a blank or as `undefined` above a Section.
export function opensSectionRefusal(value, at) {
  if (typeof value !== "string" || value.trim() === "") {
    return `${at}: opens_section, when present, states the Section's destination — a non-empty string (the Section grouping). Its PRESENCE marks the opening and its VALUE carries the destination, which is why an empty one has no meaning rather than meaning "opens with no destination"`;
  }
  return null;
}

// NO INTRODUCED TERM IN ANY HEADING (owner decision 2026-10-10, kogaki#1327).
// A Section heading states where the Section leaves the reader, in everyday
// words, and carries no term — whole-word, case-insensitive — that ANY Leg
// of the path lists under `introduces`, not just a term introduced within
// that Section: "I want readers to be able to skip directly to any Section
// and still understand its heading." Collected once over the whole path
// (a term introduced on a LATER Leg still refuses an earlier heading) and
// then checked against every `opens_section`, for the same reason
// `sectionGroupingRefusal` runs after the per-Leg loop rather than inside it.
export function opensSectionIntroducedTermRefusal(legs) {
  const terms = [];
  for (const s of legs) {
    if (!s || typeof s !== "object" || !Array.isArray(s.introduces)) continue;
    for (const raw of s.introduces) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue;
      terms.push({ term: e.term, leg_id: s.leg_id });
    }
  }
  for (const [i, s] of legs.entries()) {
    if (!s || typeof s !== "object" || typeof s.opens_section !== "string" || s.opens_section === "") continue;
    const at = `leg ${i + 1}${s.leg_id ? ` (${s.leg_id})` : ""}`;
    for (const { term, leg_id } of terms) {
      if (wholeWordMatch(term, s.opens_section)) {
        return pathRefusal("opens_section_no_introduced_term", at,
          `Its opens_section ${JSON.stringify(s.opens_section)} contains "${term}", a term leg ${JSON.stringify(leg_id)} lists under introduces.`);
      }
    }
  }
  return null;
}

// EACH SECTION'S HEADING BESIDE ITS LAST AFTER-STATE (owner decision
// 2026-10-10, kogaki#1327): one entry per Leg that opens a Section, the
// heading it carries and the `reader_state_after` of the LAST Leg of that
// Section — the destination SPEC-draft-pipeline §"The Thesis is the title,
// and a heading states a destination" rule 2 says the heading states, read
// here rather than left for the fit judge to walk the path and find the
// Section's end itself. A path opening no Section (shape rule 3's refusal
// handles that case) returns no entries.
export function sectionHeadingsWithLastAfterState(legs) {
  const opens = legs.map((s, i) => (typeof s.opens_section === "string" && s.opens_section !== "" ? i : -1)).filter((i) => i >= 0);
  return opens.map((i, k) => {
    const end = k + 1 < opens.length ? opens[k + 1] : legs.length;
    return { leg_id: legs[i].leg_id, heading: legs[i].opens_section, after_state: legs[end - 1].reader_state_after };
  });
}

// the Section grouping's four grouping rules, validated over the WHOLE path rather than per
// Leg, because every one of them is a statement about a Leg's relation to its
// NEIGHBOURS. Returns the first refusal or null.
//
// THE RULE TEXT IS THE SCHEMA'S (kogaki#1147). Each refusal below is composed
// by `pathRefusal` from `path_rules` in src/leg-schema.json — the same file
// the executor renders into the composition prompt — so the composing party
// is shown these rules before it composes rather than meeting one in a refusal
// that has already spent an attempt. Rule 1 is stated there too, marked
// `judgment`, beside the three that are checked.
//
// WHICH RULES ARE MECHANICAL, stated because the answer is not uniform and a
// reader owes an account of the ones that are not:
//
//   rule 1  the POSITIVE case (a Leg opens when it changes the reader's
//           question). Its `purpose` half is judgment — the judgment rule clause 3 keeps
//           every MUST un-linted — and its violation is exactly rule 2's
//           refusal, so nothing separate is checked here.
//   rule 2  MECHANICAL and checked: a Leg whose `depends_on` is exactly the
//           immediately preceding Leg AND whose `materials` overlap that
//           Leg's is DEVELOPING it, so it continues and may not open.
//   rule 3  MECHANICAL and checked: the first Leg always opens.
//   rule 4  SPLIT (the Section grouping). The Leg-count clause is checked here — two
//           consecutive Sections holding exactly one Leg each refuse with the
//           request-to-merge. The prose-length clause measures realized prose,
//           which no Brief contains, and is a named deferred slot in the Section grouping.
export function sectionGroupingRefusal(legs) {
  const at = (i) => `leg ${i + 1} (${legs[i].leg_id})`;

  // rule 3 — the first Leg always opens.
  if (legs[0].opens_section === undefined) {
    return pathRefusal("section_rule_3", at(0), "This path opens none: give the first Leg an opens_section carrying that Section's title.");
  }

  // rule 2 — a Leg that develops its predecessor continues, so it may not open.
  for (let i = 1; i < legs.length; i++) {
    const s = legs[i], prev = legs[i - 1];
    if (s.opens_section === undefined) continue;
    const dependsOnlyOnPrev = s.depends_on.length === 1 && s.depends_on[0] === prev.leg_id;
    const overlaps = s.materials.some((m) => prev.materials.includes(m));
    if (dependsOnlyOnPrev && overlaps) {
      return pathRefusal("section_rule_2", at(i),
        `This Leg DEVELOPS ${prev.leg_id} — its depends_on is exactly that Leg, and its materials overlap it — so it continues that Section. Remove its opens_section, or change what the Leg stands on if the reader's question really does change here.`);
    }
  }

  // rule 4, Leg-count clause — two consecutive one-Leg Sections.
  const opens = legs.map((s, i) => (s.opens_section === undefined ? -1 : i)).filter((i) => i >= 0);
  for (let k = 0; k + 2 < opens.length + 1; k++) {
    const start = opens[k];
    const next = k + 1 < opens.length ? opens[k + 1] : legs.length;
    const after = k + 2 < opens.length ? opens[k + 2] : legs.length;
    if (next - start === 1 && after - next === 1) {
      return pathRefusal("section_rule_4", at(start),
        `The Section this Leg opens and the one opening at ${legs[next].leg_id} each hold exactly one Leg: merge the two, or give one of them a second Leg.`);
    }
  }
  return null;
}

// THE INDEX OF THE LEG MARKED `reaches_target`, or -1 where none carries it
// (kogaki#1231). Exported so src/assemble.mjs derives the Brief's Reader
// target and the Thesis row's `established_by_legs` from the SAME Leg
// `validateLegs` ratified, rather than a second search that could disagree
// with it. Not itself a refusal: a caller with zero or several marked Legs
// gets -1 or the FIRST marked index respectively, and `readerTargetLegRefusal`
// is what makes a path with anything but exactly one unwritable.
export function targetLegIndex(legs) {
  if (!Array.isArray(legs)) return -1;
  return legs.findIndex((s) => s && s.reaches_target === true);
}

// CLOSURE, THE TWO PATH RULES (kogaki#1232, owner decision 2026-09-30): a
// Question a Leg will not close is set aside IN THAT LEG, "in a way that
// releases the question without interfering with the Thesis"; needing more
// than one set aside is read as the ReaderPath itself being unsuitable; and
// at most one non-Thesis Question is open at any given time. `obligations` is
// the Candidate's own ledger (src/candidate-schema.json) -- the Thesis row is
// out of scope by name (the issue's "Not in scope") and never reaches this
// function. Rows are read defensively: a row whose `introduced_by` or closing
// leg is not a shape `validateLegs` can resolve is skipped here rather than
// refused, because that shape refusal is `fillBrief`'s own (obligation N: ...)
// and this function's job is the two rules above it, not a second reading of
// the same field. Returns a string to refuse with, or null.
export function closureLedgerRefusal(legs, obligations = []) {
  const at = (i) => `leg ${i + 1} (${legs[i].leg_id})`;
  const list = Array.isArray(obligations) ? obligations : [];
  const legIds = legs.map((s) => s.leg_id);
  const index = new Map(legIds.map((id, i) => [id, i]));

  // RULE (a): a path with more than one `conceded_by` row is refused, naming
  // the rows.
  const conceded = list.filter((o) => o && typeof o === "object" && o.conceded_by !== undefined);
  if (conceded.length > 1) {
    return pathRefusal("closure_one_conceded_row", null,
      `${conceded.length} Closure rows end conceded_by: ${conceded.map((o) => JSON.stringify(o.text)).join(", ")}.`);
  }
  // A CONCEDED ROW CARRIES THREE FURTHER FIELDS, required only there
  // (src/candidate-schema.json, `obligations.entry_required_when_conceded`;
  // kogaki#1263): `open`, `why_not_here` and `reader_keeps` — a concession is
  // not silence, so the row says what stays unresolved, why this Leg is not
  // the one to close it, and what the reader is left holding in its place.
  // Refused naming the row and the missing field(s) (kogaki#1251 item 3,
  // kogaki#1260).
  for (const o of conceded) {
    const missing = ["open", "why_not_here", "reader_keeps"]
      .filter((k) => typeof o[k] !== "string" || o[k] === "");
    if (missing.length) {
      return pathRefusal("closure_one_conceded_row", null,
        `The conceded Closure row ${JSON.stringify(o.text)} carries no ${missing.join(", ")} — `
        + "a conceded row ends conceded_by AND carries open, why_not_here and reader_keeps.");
    }
  }

  // RULE (b): a row is open on every Leg from its `introduced_by` Leg up to,
  // and NOT INCLUDING, the Leg that closes it -- a row raised and conceded in
  // one Leg (the same `leg_id` on both ends) is open on no Leg, by the range
  // being empty. A Leg on which more than one row is open is refused, naming
  // the Leg and the rows.
  const openPerLeg = new Map();
  for (const o of list) {
    if (!o || typeof o !== "object" || typeof o.text !== "string") continue;
    const closingLeg = o.discharged_by !== undefined ? o.discharged_by : o.conceded_by;
    if (typeof o.introduced_by !== "string" || typeof closingLeg !== "string") continue;
    if (!index.has(o.introduced_by) || !index.has(closingLeg)) continue;
    for (let i = index.get(o.introduced_by); i < index.get(closingLeg); i++) {
      const id = legIds[i];
      if (!openPerLeg.has(id)) openPerLeg.set(id, []);
      openPerLeg.get(id).push(o.text);
    }
  }
  for (const [i, s] of legs.entries()) {
    const rows = openPerLeg.get(s.leg_id);
    if (rows && rows.length > 1) {
      return pathRefusal("closure_one_row_open_per_leg", at(i),
        `${rows.length} Closure rows are open here: ${rows.map((t) => JSON.stringify(t)).join(", ")}.`);
    }
  }
  return null;
}

// THE READER TARGET LEG (kogaki#1231, owner decision 2026-09-30, reversing
// kogaki#1225's last-Leg derivation): exactly one Leg is marked
// `reaches_target`, never the first, and every Leg after it is a CLOSING
// Leg — held to the three rules this function raises. Run after every Leg
// is known to be well formed, for the reason `sectionGroupingRefusal` runs
// there: this is a statement about a Leg's position relative to the whole
// path, not about one Leg alone. `obligations` is the Candidate's own
// ledger (src/candidate-schema.json), OPTIONAL for the same reason
// `readerStart` is — a bare shape check over legs alone hands none, and an
// absent ledger is read as empty rather than invented. Returns a string to
// refuse with, or null.
export function readerTargetLegRefusal(legs, obligations = []) {
  const at = (i) => `leg ${i + 1} (${legs[i].leg_id})`;
  const marked = legs.map((s, i) => (s && s.reaches_target === true ? i : -1)).filter((i) => i >= 0);
  if (marked.length !== 1) {
    return pathRefusal("reaches_target_marked", null,
      marked.length === 0
        ? "No Leg of this path carries `reaches_target: true`."
        : `${marked.length} Legs carry it: ${marked.map((i) => at(i)).join(", ")}.`);
  }
  const targetIdx = marked[0];
  if (targetIdx === 0) {
    return pathRefusal("reaches_target_marked", at(0), "The first Leg carries it, leaving no Leg free to reach the target from anywhere.");
  }
  const targetLeg = legs[targetIdx];
  const obligationList = Array.isArray(obligations) ? obligations : [];
  for (let i = targetIdx + 1; i < legs.length; i++) {
    const s = legs[i];
    if (Array.isArray(s.introduces) && s.introduces.length > 0) {
      return pathRefusal("closing_leg_introduces_nothing", at(i),
        `This closing Leg (after ${targetLeg.leg_id}, which reaches the Reader target) still carries introduces: ${JSON.stringify(s.introduces)}.`);
    }
    const raised = obligationList.find((o) => o && o.introduced_by === s.leg_id);
    if (raised) {
      return pathRefusal("closing_leg_introduces_nothing", at(i),
        `This closing Leg (after ${targetLeg.leg_id}) is named introduced_by on a Closure row: ${JSON.stringify(raised.text)}.`);
    }
    for (const dim of ["orientation", "knowledge"]) {
      const wantLine = readerStateDimensionLine(targetLeg.reader_state_after, dim);
      const gotLine = readerStateDimensionLine(s.reader_state_after, dim);
      if (gotLine !== wantLine) {
        return pathRefusal("closing_leg_state_fixed", at(i),
          `Its ${dim} line reads ${JSON.stringify(gotLine)}; the target Leg ${targetLeg.leg_id}'s reads ${JSON.stringify(wantLine)}.`);
      }
    }
  }
  return null;
}

// THE REACHING LEG'S `names` IS A SUBSET OF THE UNION OF EVERY LEG'S
// `introduces` (kogaki#1251 item 4, kogaki#1260): `names` is present, and
// means something, only on the Leg marked `reaches_target` (src/leg-schema.json,
// `names`) — the terms the path's own `introduces` entries have put in the
// reader's hands by the time the Reader target is reached. A name this path
// never introduces anywhere is refused naming the term; absence of `names`
// itself is a different check's job (required_when is not enforced here, to
// leave a path composed before this field unaffected). Run after every Leg is
// known to be well formed, the same reason `readerTargetLegRefusal` does.
export function readerTargetNamesRefusal(legs) {
  const idx = targetLegIndex(legs);
  if (idx === -1) return null; // readerTargetLegRefusal names a missing or ambiguous mark
  const targetLeg = legs[idx];
  if (!Array.isArray(targetLeg.names)) return null;
  const introduced = new Set();
  for (const s of legs) {
    if (!s || typeof s !== "object" || !Array.isArray(s.introduces)) continue;
    for (const raw of s.introduces) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue; // introducesRefusal names this
      introduced.add(e.term);
    }
  }
  for (const name of targetLeg.names) {
    if (!introduced.has(name)) {
      return `leg ${idx + 1} (${targetLeg.leg_id}): names carries ${JSON.stringify(name)}, but no Leg of this path introduces it — `
        + "names is the union of every Leg's introduces entries, by the time the Reader target is reached (src/leg-schema.json, `names`)";
    }
  }
  return null;
}

// Shape refusal over a whole `introduces` value. Returns a string to refuse
// with, or null. `at` is the caller's own way of naming the Leg, so one
// grammar serves the record side and the document side without either
// inventing wording the other does not use.
export function introducesRefusal(value, at) {
  if (!Array.isArray(value)) {
    return `${at}: introduces, when present, is an array of entries — a term the Leg puts in front of the reader for the first time, bare or with a one-line meaning anchor (the reader-knowledge ledger)`;
  }
  const seen = new Set();
  for (const raw of value) {
    const isItem = raw && typeof raw === "object" && !Array.isArray(raw);
    if (typeof raw !== "string" && !isItem) {
      return `${at}: introduces carries an entry that is neither a string nor an introduces_item object — each entry is one line, "term" or "term ${INTRODUCES_SEP} anchor", or a Candidate's own \`{term, kind, ...}\` object (src/leg-schema.json, \`introduces_item\`)`;
    }
    const e = parseIntroducesEntry(raw);
    if (e.error) return `${at}: introduces carries ${e.error} (the reader-knowledge ledger)`;
    const key = e.term.toLowerCase();
    if (seen.has(key)) {
      return `${at}: introduces names "${e.term}" twice — a term is introduced once, and a Leg claiming it twice makes the ledger's own count wrong (the reader-knowledge ledger)`;
    }
    seen.add(key);
  }
  return null;
}

// AT MOST ONE introduces_item ACROSS THE WHOLE PATH MAY NAME `nearest`
// (kogaki#1251 item 2, kogaki#1260): `nearest` is a coined term's near
// existing neighbour, offered so a reader can place the coinage against what
// they already have a name for. Two such comparisons in one path leave the
// reader holding two near-neighbour claims with nothing to decide between
// them, so a second is refused rather than rendered — naming both terms and
// both `nearest` values, so the composer can see which one to keep. Run over
// the WHOLE path rather than per Leg, the same reason the Section grouping
// and Closure are: this is a statement about the path, not about one Leg.
export function introducesNearestRefusal(legs) {
  const found = [];
  for (const s of legs) {
    if (!s || typeof s !== "object" || !Array.isArray(s.introduces)) continue;
    for (const raw of s.introduces) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue; // introducesRefusal names this
      if (typeof e.nearest === "string" && e.nearest !== "") {
        found.push({ leg_id: s.leg_id, term: e.term, nearest: e.nearest });
      }
    }
  }
  if (found.length > 1) {
    return `This Brief carries ${found.length} introduces items naming \`nearest\`: `
      + found.map((f) => `${JSON.stringify(f.term)} (leg ${f.leg_id}) nearest ${JSON.stringify(f.nearest)}`).join(" and ")
      + " — at most one coined term may be compared to a nearest existing term across the whole path (src/leg-schema.json, `introduces_item.nearest`).";
  }
  return null;
}

// The re-activate grammar (kogaki#1237, widened to a third form by kogaki#1263
// and kogaki#1260; the claim form's `as` sentence required by kogaki#1282), in
// one place for the same reason `introduces`'s is: the composition side
// validates records and `draft.mjs parseLegBlockBody` parses the serialized
// form back. One line, "<leg_id> term <exact introduces term>",
// "<leg_id> claim <strand id> as <one plain sentence>" or
// "<leg_id> journey <strand id>". THE `as` SENTENCE IS A PLAIN RESTATEMENT
// WRITTEN AT BRIEF TIME, NEVER THE CLAIM'S OWN PROPOSITION RENDERED VERBATIM
// (kogaki#1282, owner decision 2026-10-06) — a re-activated claim crosses as
// this sentence, not as the whole proposition the Leg it depends on asserted.
export function parseReactivateEntry(raw) {
  const line = String(raw).trim();
  if (line === "") return { error: "an empty entry" };
  const m = line.match(/^(\S+)\s+(term|claim|journey)\s+(.+)$/s);
  if (!m) {
    return { error: `"${line}" — a re-activate entry is "<leg_id> term <exact introduces term>", "<leg_id> claim <strand id> as <one plain sentence>" or "<leg_id> journey <strand id>"` };
  }
  const [, leg_id, kind, rest] = m;
  if (kind === "claim") {
    const am = rest.match(/^(\S+)\s+as\s+(.+)$/s);
    if (!am) {
      return { error: `"${line}" — a re-activate claim entry is "<leg_id> claim <strand id> as <one plain sentence>", and the as sentence is required` };
    }
    const [, strand, asSentence] = am;
    const value = strand.trim();
    const as = asSentence.trim();
    if (value === "") return { error: `"${line}" names no strand after claim` };
    if (as === "") return { error: `"${line}" carries an as with no sentence after it — a re-activated claim crosses as a plain restatement, not as its proposition` };
    return { leg_id, kind, value, as };
  }
  const value = rest.trim();
  if (value === "") {
    return { error: `"${line}" names no ${kind === "term" ? "term" : "strand"} after ${kind}` };
  }
  return { leg_id, kind, value };
}

// Shape refusal over a whole `re-activate` value — mirrors `introducesRefusal`.
export function reactivateRefusal(value, at) {
  if (!Array.isArray(value)) {
    return `${at}: re-activate, when present, is an array of entries — one reference per line, "<leg_id> term <exact introduces term>", "<leg_id> claim <strand id> as <one plain sentence>" or "<leg_id> journey <strand id>" (re-activate)`;
  }
  for (const raw of value) {
    if (typeof raw !== "string") {
      return `${at}: re-activate carries a non-string entry — each entry is one line, "<leg_id> term <...>", "<leg_id> claim <strand id> as <one plain sentence>" or "<leg_id> journey <strand id>" (re-activate)`;
    }
    const e = parseReactivateEntry(raw);
    if (e.error) return `${at}: re-activate carries ${e.error} (re-activate)`;
  }
  return null;
}

// Semantic refusal over a whole `re-activate` value: THE CANDIDATE POPULATION
// IS CLOSED (kogaki#1237, owner decision 2026-09-30, widened by kogaki#1263
// and kogaki#1260) — everything explicitly represented in the Legs named in
// `depends_on`, specifically their `introduces` lines (exact strings), their
// `claims` (addressed by Strand) and, since the third form, their `journeys`
// (addressed by Strand). Closure rows are never candidates. Refuses naming
// the entry: which Leg, which reference, and why it does not resolve.
export function reactivateSemanticRefusal(value, dependsOn, legs, at) {
  if (!Array.isArray(value)) return null; // reactivateRefusal names this
  const deps = new Set(dependsOn || []);
  const byId = new Map((legs || []).map((l) => [l.leg_id, l]));
  for (const raw of value) {
    const e = parseReactivateEntry(raw);
    if (e.error) continue; // reactivateRefusal names this
    if (!deps.has(e.leg_id)) {
      return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" is not in this Leg's depends_on — a Leg may re-activate only material from a Leg it depends on`;
    }
    const target = byId.get(e.leg_id);
    if (!target) {
      return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but no Leg in this path carries the id "${e.leg_id}"`;
    }
    if (e.kind === "term") {
      const found = (target.introduces || []).some((intro) => {
        const p = parseIntroducesEntry(intro);
        return !p.error && p.term === e.value;
      });
      if (!found) {
        return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" does not introduce "${e.value}" — a re-activated term must match, verbatim, an entry in that Leg's introduces`;
      }
    } else if (e.kind === "claim") {
      const found = (target.claims || []).some((g) => g.strand === e.value);
      if (!found) {
        return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" carries no claim for strand "${e.value}"`;
      }
    } else {
      const found = (target.journeys || []).some((j) => j && j.strand === e.value);
      if (!found) {
        return `${at}: re-activate names ${JSON.stringify(raw.trim())}, but "${e.leg_id}" carries no journey for strand "${e.value}" — a re-activated journey must match a Strand that Leg names in its journeys`;
      }
    }
  }
  return null;
}

// THE DERIVATION. For each Leg in path order, what the reader already knows
// arriving at it: the union of every EARLIER Leg's entries, first-introducer
// kept. Pure over the path — no store, no file, no I/O.
//
// FIRST INTRODUCER WINS, and that is the addressability property rather than a
// tie-break: where two Legs declare the same term, the reader met it at the
// earlier one, so that is the Leg a later question about the term resolves
// to. The second declaration is not an error — a composer may legitimately
// re-state a term — and it is not silently dropped either: it simply does not
// move the responsibility.
export function readerKnowledgeLedger(legs) {
  const known = new Map(); // term (lowercased) -> { term, anchor, introduced_by }
  const rows = [];
  for (const s of legs) {
    // The snapshot is taken BEFORE this Leg's own entries are folded in: a
    // Leg does not already know what it is itself introducing.
    rows.push({
      leg_id: s.leg_id,
      reader_already_knows: [...known.values()].map((v) => ({ ...v })),
    });
    for (const raw of s.introduces || []) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue; // validated upstream; a bad entry never reaches here
      const key = e.term.toLowerCase();
      if (!known.has(key)) {
        known.set(key, { term: e.term, anchor: e.anchor, introduced_by: s.leg_id });
      }
    }
  }
  return rows;
}

// Where responsibility for a term lies: the FIRST Leg that introduces it, or
// `null` — meaning the Brief itself — when no Leg does. The null case is the
// point of the function and not an error path: an article may legitimately
// rely on a term its path never introduces, and the ledger's job is to say
// SO, addressably, rather than to refuse.
export function introducerOf(term, legs) {
  const key = String(term).trim().toLowerCase();
  for (const s of legs) {
    for (const raw of s.introduces || []) {
      const e = parseIntroducesEntry(raw);
      if (!e.error && e.term.toLowerCase() === key) return s.leg_id;
    }
  }
  return null;
}

// ---- THE BRIEF'S DEFINED TERMS (kogaki#1331, owner decision 2026-10-10) ----
//
// The words this article gives a meaning to. The mint writes the list once —
// every noun of the Thesis and of each Strand's claim, classified `defined`
// (used in a sense this article gives it) or `ordinary` (the sense the reader
// already holds) — and composition is its one consumer: a `defined` term may
// not appear in a claim's proposition, a waypoint's point or an opens_section
// before the Leg whose `introduces` carries it. The list lives in the Brief
// and ends there; nothing below reaches the Packet. Which terms the composer
// calls `ordinary` is its judgment and is not checked; the shape of each
// entry, and that it occurs in the text it was read from, is.
export const DEFINED_TERM_CLASSES = ["defined", "ordinary"];

// The entries' shape: an array of `{ term, class }`, the term non-empty and
// in the form an introduces entry's term takes, the class one of the two,
// no term twice, and each term occurring whole-word in the Thesis or in one
// of the Strand claims it was read from. Returns the refusal, or null.
export function definedTermsRefusal(entries, { thesis = "", claims = [] } = {}) {
  if (!Array.isArray(entries)) {
    return `defined_terms is a list of { term, class } entries; received ${JSON.stringify(entries ?? null)} (kogaki#1331)`;
  }
  const seen = new Set();
  for (const [i, e] of entries.entries()) {
    const at = `defined_terms entry ${i + 1}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) return `${at} is not a { term, class } map`;
    const extra = Object.keys(e).filter((k) => k !== "term" && k !== "class");
    if (extra.length) return `${at} carries ${extra.map((k) => `\`${k}\``).join(", ")} — an entry is its term and its class, no prose`;
    if (typeof e.term !== "string" || e.term.trim() === "") return `${at} carries no term`;
    const term = e.term.trim();
    if (!DEFINED_TERM_CLASSES.includes(e.class)) {
      return `${at} ("${term}") carries the class ${JSON.stringify(e.class ?? null)} — every entry carries exactly one of ${DEFINED_TERM_CLASSES.join(", ")}`;
    }
    const key = term.toLowerCase();
    if (seen.has(key)) return `${at} lists "${term}" a second time — one entry per term`;
    seen.add(key);
    if (!wholeWordMatch(term, thesis) && !claims.some((c) => wholeWordMatch(term, c))) {
      return `${at} lists "${term}", which occurs whole-word in neither the Thesis nor any Strand's claim — `
        + "the list is read from those texts, so a term in neither was not read from them";
    }
  }
  return null;
}

// The terms a Brief record classifies `defined`. A Brief minted before the
// field existed carries none, which defines nothing.
export function definedTermsOf(record) {
  const list = Array.isArray(record?.defined_terms) ? record.defined_terms : [];
  return list.filter((e) => e && e.class === "defined" && typeof e.term === "string" && e.term.trim() !== "")
    .map((e) => e.term.trim());
}

// A `defined` term in a claim's proposition, a waypoint's point or an
// opens_section of any Leg BEFORE the Leg whose introduces carries it —
// whole-word and case-insensitive — refuses, naming the Leg, the field and
// the term. Within the introducing Leg itself the use is the introduction. A
// defined term no Leg introduces is before every Leg. The Thesis is the
// title and is not a Leg field, so it is never read here.
export function definedTermBeforeIntroductionRefusal(legs, definedTerms = []) {
  if (!Array.isArray(legs) || !Array.isArray(definedTerms) || definedTerms.length === 0) return null;
  const introducedAt = (term) => {
    const key = String(term).trim().toLowerCase();
    for (const [i, s] of legs.entries()) {
      for (const raw of (s && Array.isArray(s.introduces) ? s.introduces : [])) {
        const e = parseIntroducesEntry(raw);
        if (!e.error && e.term.toLowerCase() === key) return i;
      }
    }
    return legs.length;
  };
  for (const term of definedTerms) {
    const intro = introducedAt(term);
    for (const [i, s] of legs.entries()) {
      if (i >= intro) break;
      if (!s || typeof s !== "object") continue;
      const at = `leg ${i + 1}${s.leg_id ? ` (${s.leg_id})` : ""}`;
      const fields = [
        ...(Array.isArray(s.claims) ? s.claims : []).map((g, j) => [`claims[${j}].proposition`, g && g.proposition]),
        ...(Array.isArray(s.waypoints) ? s.waypoints : []).map((w, j) => [`waypoints[${j}].point`, w && w.point]),
        ["opens_section", s.opens_section],
      ];
      for (const [field, text] of fields) {
        if (typeof text !== "string" || !wholeWordMatch(term, text)) continue;
        const where = intro < legs.length
          ? `leg ${intro + 1}${legs[intro].leg_id ? ` (${legs[intro].leg_id})` : ""} is the first to introduce it`
          : "no Leg introduces it";
        return `${at}: ${field} uses "${term}", a term the Brief defines, and ${where} — a defined term reaches `
          + "the reader only after the Leg whose introduces carries it (kogaki#1331). Add an introduces entry for it "
          + "on this Leg or an earlier one, or reword";
      }
    }
  }
  return null;
}

// ---- THE BRIEF IS ONE YAML RECORD (kogaki#1328, owner decision 2026-10-10) ----
//
// `theses/<slug>/brief.yaml` is the Brief: the owner reads it, and every
// command after adoption reads it, through `parseBriefRecord` below and the
// small readers beside it. Nothing reads the Brief back from a rendering any
// more. What the Draft, the review and the Packet take from it was structured
// data a moment before it was written — the Candidate record, the mint's
// header and Strand cites — and it stays structured in the file: waypoints as
// a list, each reader state as a five-key map, claims as a list of maps.
//
// THE SHAPE IS DECLARED IN `src/candidate-schema.json`, under `brief_record`,
// beside the Candidate record most of it is copied from, and this file reads
// its key set from there (`briefRecordKeys`) so the declaration and the
// refusal cannot disagree.
//
// EACH READER STATE IS WRITTEN ONCE PER BOUNDARY. `reader_start` is the state
// before the first Leg; each Leg carries only its `reader_state_after`; a
// Leg's before-state is the previous after-state (`deriveReaderStatesBefore`,
// kogaki#1325), derived on read rather than written twice. `reader_target`
// names the Leg marked `reaches_target`, whose after-state it is.
export const BRIEF_RECORD_FILE = "brief.yaml";
const RECORD_WIDTH = 120;

let CANDIDATE_SCHEMA_FILE = null;
function candidateSchemaBlock() {
  if (!CANDIDATE_SCHEMA_FILE) {
    const p = join(dirname(fileURLToPath(import.meta.url)), "candidate-schema.json");
    CANDIDATE_SCHEMA_FILE = JSON.parse(readFileSync(p, "utf8"));
  }
  const b = CANDIDATE_SCHEMA_FILE.brief_record;
  if (!b || typeof b.keys !== "object") {
    throw new Error("src/candidate-schema.json declares no `brief_record.keys` — the Brief record's shape is declared there (kogaki#1328), and a reader with no declaration has no key set to refuse against");
  }
  return b;
}
export function briefRecordDeclaration() { return candidateSchemaBlock(); }
// The record's top-level keys, in the order the file writes them, and the
// subset that is a slot awaiting composition at mint.
export function briefRecordKeys() { return Object.keys(candidateSchemaBlock().keys); }
export function briefSlotKeys() {
  const keys = candidateSchemaBlock().keys;
  return Object.keys(keys).filter((k) => keys[k].filled_at === "adoption");
}

// A reader state's line form — one `dimension: value` line per dimension, the
// form the Candidate carries and every in-memory reader reads — to the
// record's five-key map, and back. The map is keyed by READER_STATE_DIMENSIONS
// in that order; a dimension the state does not carry is absent.
export function readerStateMap(value) {
  if (value === null || value === undefined) return null;
  const out = {};
  for (const dim of READER_STATE_DIMENSIONS) {
    const v = readerStateDimensionLine(value, dim);
    if (v !== null) out[dim] = v;
  }
  return out;
}
export function readerStateText(map) {
  if (!map || typeof map !== "object") return undefined;
  return READER_STATE_DIMENSIONS.filter((d) => typeof map[d] === "string").map((d) => `${d}: ${map[d]}`).join("\n");
}

// One Leg as the record carries it: its fields in the schema's order, the
// before-state left out (derived on read), the reader state as a map, an
// `introduces` object with its fields in the schema's own order.
const INTRODUCES_KEYS = ["term", "kind", "source", "meaning", "nearest", "differs"];
export function legRecord(s) {
  const out = { leg_id: s.leg_id };
  if (s.move) out.move = s.move;
  out.materials = [...s.materials];
  out.purpose = s.purpose;
  out.reader_state_after = readerStateMap(s.reader_state_after);
  out.depends_on = [...(s.depends_on || [])];
  out.rationale = s.rationale;
  out.claims = (s.claims || []).map((g) => ({ strand: g.strand, proposition: g.proposition }));
  // A LEG WAYPOINT IS `point` AND `serves`, AND NOTHING ELSE (kogaki#1375): no Move
  // information reaches the Brief; the paragraph Move is the ParagraphPlan stage's.
  out.waypoints = (s.waypoints || []).map((w) => ({ serves: [...w.serves], point: String(w.point).replace(/\s*\n\s*/g, " ").trim() }));
  if ((s.journeys || []).length) {
    out.journeys = s.journeys.map((j) => {
      const gloss = journeyUses().get(j.use);
      return gloss ? { strand: j.strand, use: j.use, meaning: gloss } : { strand: j.strand, use: j.use };
    });
  }
  if ((s.introduces || []).length) {
    out.introduces = s.introduces.map((e) => {
      if (!e || typeof e !== "object" || Array.isArray(e)) return e;
      const p = parseIntroducesEntry(e);
      const src = p.error ? e : p;
      return Object.fromEntries(INTRODUCES_KEYS.filter((k) => src[k] !== undefined && src[k] !== null).map((k) => [k, src[k]]));
    });
  }
  if ((s["re-activate"] || []).length) out["re-activate"] = [...s["re-activate"]];
  if (s.budget !== undefined && s.budget !== null) out.budget = s.budget;
  if (s.opens_section !== undefined) out.opens_section = s.opens_section;
  if (s.reaches_target === true) out.reaches_target = true;
  if (Array.isArray(s.names)) out.names = [...s.names];
  if (s.bridges) out.bridges = [...s.bridges];
  if (s.figure !== undefined && s.figure !== null) {
    out.figure = s.figure;
    out.figure_roles = { ...s.figure_roles };
  }
  if (s.entailed === true) {
    out.entailed = true;
    out.entailment_reasoning = s.entailment_reasoning;
  }
  return out;
}

// The record's Legs back to the in-memory shape every reader of a Leg reads:
// the reader states in their line form, each before-state derived from the
// state before it.
export function briefLegs(record) {
  const path = Array.isArray(record?.reader_path) ? record.reader_path : [];
  const legs = path.map((r) => {
    const s = { ...r };
    s.reader_state_after = readerStateText(r.reader_state_after);
    if (Array.isArray(r.journeys)) s.journeys = r.journeys.map((j) => ({ strand: j.strand, use: j.use }));
    if (r.figure_roles && typeof r.figure_roles === "object") s.figure_roles = { ...r.figure_roles };
    s.materials = Array.isArray(r.materials) ? r.materials.map(String) : [];
    s.depends_on = Array.isArray(r.depends_on) ? r.depends_on.map(String) : [];
    s.claims = Array.isArray(r.claims) ? r.claims : [];
    s.waypoints = Array.isArray(r.waypoints) ? r.waypoints : [];
    return s;
  });
  return deriveReaderStatesBefore(legs, readerStateText(record?.reader_start));
}

// ---------------------------------------------------------------------------
// THE PARAGRAPHPLAN FILE (kogaki#1375) — its one writer and its one reader, here in shared
// code because two commands touch it: /paragraph-plan writes it and /draft reads it, and a
// command module never imports another command's (kogaki#1302).
export const PARAGRAPH_PLAN_FILE = "paragraph-plan.yaml";
export const sha256 = (s) => createHash("sha256").update(s).digest("hex");

export function paragraphPlanPathFor(briefPath) {
  return join(dirname(resolve(briefPath)), PARAGRAPH_PLAN_FILE);
}

// ---------------------------------------------------------------------------
// THE PARAGRAPHPLAN FILE — its one writer and its one reader.
//
// One YAML record: `version`, `brief` (the path and the content hash of the Brief it
// was made from), and `legs`, one per Leg of the Brief's Reader Path in order, each
// carrying one entry per Leg Waypoint in order with that Leg Waypoint's Paragraph
// Waypoints. A Paragraph Waypoint is `point` and `serves`, and nothing else.

const PLAN_HEADER = [
  "The paragraph plan for one article: under every Leg Waypoint of the Brief named below, the Paragraph Waypoints",
  "-- the points its one paragraph makes, in order, each with the Claims it serves. A Leg Waypoint is one paragraph,",
  "and a Paragraph Waypoint is one Segment of the Move bound to it. /paragraph-plan writes it from the Brief; /draft",
  "reads it beside the Brief and refuses it when the Brief has changed since. It holds nothing of a Move.",
].join(" ");

export function paragraphPlanRecord({ briefPath, briefText, legs }) {
  return {
    version: "1",
    brief: { path: relFromRepo(resolve(briefPath)), sha256: sha256(briefText) },
    legs: legs.map((l) => ({
      leg_id: l.leg_id,
      waypoints: l.waypoints.map((pws, i) => ({
        waypoint: i + 1,
        paragraph_waypoints: pws.map((p) => ({ point: String(p.point).replace(/\s*\n\s*/g, " ").trim(), serves: [...p.serves] })),
      })),
    })),
  };
}

export function paragraphPlanRecordText(record) {
  return stringifyYaml(record, { width: 120, header: PLAN_HEADER });
}

const PLAN_KEYS = ["version", "brief", "legs"];
const PLAN_BRIEF_KEYS = ["path", "sha256"];
const PLAN_LEG_KEYS = ["leg_id", "waypoints"];
const PLAN_WAYPOINT_KEYS = ["waypoint", "paragraph_waypoints"];
const PARAGRAPH_WAYPOINT_KEYS = ["point", "serves"];

export function undeclaredKey(obj, allowed) {
  return Object.keys(obj).find((k) => !allowed.includes(k));
}

// THE READ /draft MAKES (kogaki#1375). `briefPath` and `briefText` are the Brief /draft
// was handed, `legs` its parsed Legs. Returns `{ path, waypoints }` — `waypoints` a Map
// from leg_id to one array of Paragraph Waypoints per Leg Waypoint — or `{ error }`,
// naming both files where the two disagree. OPENS NO MOVE FILE: the record carries none.
export function readParagraphPlanBeside(briefPath, briefText, legs) {
  const path = paragraphPlanPathFor(briefPath);
  const rel = relFromRepo(path);
  const briefRel = relFromRepo(resolve(briefPath));
  if (!existsSync(path)) {
    return { error: `the Brief at ${briefRel} has no ParagraphPlan file beside it (${rel}) — /draft renders each Leg `
      + `Waypoint's Paragraph Waypoints from that file, and /paragraph-plan writes it from the adopted Brief: run `
      + `\`node src/paragraph-plan.mjs start --brief ${briefRel}\` first (kogaki#1375)` };
  }
  let record;
  try { record = parseYaml(readFileSync(path, "utf8"), rel); }
  catch (e) { return { error: `the ParagraphPlan file ${rel} is not a YAML record this reader can read: ${e.message}` }; }
  const r = paragraphPlanShapeRefusal(record, rel, legs);
  if (r) return { error: r };
  const want = sha256(briefText);
  if (record.brief.sha256 !== want) {
    return { error: `the ParagraphPlan file ${rel} was made from a different Brief: it names ${record.brief.path} at `
      + `sha256 ${record.brief.sha256}, and the Brief at ${briefRel} is sha256 ${want} — the Brief has changed since `
      + `the plan was made, so run /paragraph-plan on this Brief again (kogaki#1375)` };
  }
  const waypoints = new Map(record.legs.map((l) => [l.leg_id, l.waypoints.map((w) => w.paragraph_waypoints)]));
  return { path, waypoints };
}

// The record's shape against the Brief's Legs: every key declared, one entry per Leg and
// per Leg Waypoint in order, and every Paragraph Waypoint shaped as a Leg Waypoint is —
// `waypointsRefusal`, the Leg Waypoints' own rule, over the parent's Claims — and
// carrying `point` and `serves` alone. A key outside those is refused by name: the file
// holds no Move id, no Segment and no Move field.
export function paragraphPlanShapeRefusal(record, rel, legs) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return `the ParagraphPlan file ${rel} is not a YAML map`;
  const k0 = undeclaredKey(record, PLAN_KEYS);
  if (k0) return `the ParagraphPlan file ${rel} carries \`${k0}\`, which a ParagraphPlan record does not declare (kogaki#1375)`;
  if (String(record.version) !== "1") return `the ParagraphPlan file ${rel} carries version ${JSON.stringify(record.version)}, not "1"`;
  const b = record.brief;
  if (!b || typeof b !== "object" || Array.isArray(b) || typeof b.path !== "string" || typeof b.sha256 !== "string") {
    return `the ParagraphPlan file ${rel} names no Brief — \`brief\` carries the \`path\` and the \`sha256\` of the Brief it was made from`;
  }
  const kb = undeclaredKey(b, PLAN_BRIEF_KEYS);
  if (kb) return `the ParagraphPlan file ${rel} carries \`brief.${kb}\`, which a ParagraphPlan record does not declare`;
  if (!Array.isArray(record.legs) || record.legs.length !== legs.length
    || record.legs.some((l, i) => !l || l.leg_id !== legs[i].leg_id)) {
    return `the ParagraphPlan file ${rel} carries the Legs ${JSON.stringify((record.legs || []).map((l) => l && l.leg_id))}, `
      + `and the Brief's Reader Path is ${JSON.stringify(legs.map((l) => l.leg_id))} — one entry per Leg, in order`;
  }
  for (const [i, l] of record.legs.entries()) {
    const leg = legs[i];
    const at = `the ParagraphPlan file ${rel}, leg ${leg.leg_id}`;
    const kl = undeclaredKey(l, PLAN_LEG_KEYS);
    if (kl) return `${at} carries \`${kl}\`, which a ParagraphPlan record does not declare`;
    if (!Array.isArray(l.waypoints) || l.waypoints.length !== leg.waypoints.length) {
      return `${at} carries ${Array.isArray(l.waypoints) ? l.waypoints.length : "no"} Leg Waypoint entr(ies) for the Leg's `
        + `${leg.waypoints.length} Leg Waypoint(s) — one per Leg Waypoint, in order`;
    }
    for (const [j, w] of l.waypoints.entries()) {
      const atW = `${at}, Waypoint ${j + 1}`;
      if (!w || typeof w !== "object" || Array.isArray(w)) return `${atW} is not a map`;
      const kw = undeclaredKey(w, PLAN_WAYPOINT_KEYS);
      if (kw) return `${atW} carries \`${kw}\`, which a ParagraphPlan record does not declare — the file holds no Move id, `
        + "no Segment and no Move field (kogaki#1375)";
      if (w.waypoint !== j + 1) return `${atW} is numbered ${JSON.stringify(w.waypoint)} — entries are one per Leg Waypoint, in order`;
      const bad = paragraphWaypointsRefusal(w.paragraph_waypoints, leg.waypoints[j].serves, atW);
      if (bad) return bad;
    }
  }
  return null;
}

// ONE LEG WAYPOINT'S PARAGRAPH WAYPOINTS, by the Leg Waypoints' own rule (the count is
// not fixed, and every Claim the parent serves is served by at least one of them) and
// with `point` and `serves` as their only keys.
export function paragraphWaypointsRefusal(pws, parentServes, at) {
  if (Array.isArray(pws)) {
    for (const [i, p] of pws.entries()) {
      if (p && typeof p === "object" && !Array.isArray(p)) {
        const k = undeclaredKey(p, PARAGRAPH_WAYPOINT_KEYS);
        if (k) {
          return `${at}: Paragraph Waypoint ${i + 1} carries \`${k}\` — a Paragraph Waypoint carries \`point\` and \`serves\` `
            + "only, and nothing of a Move reaches past Paragraph Waypoint generation (kogaki#1375)";
        }
      }
    }
  }
  return waypointsRefusal(pws, parentServes, `${at}'s Paragraph Waypoints`);
}

// The Strand ids of the closed set, in the order the mint wrote them; and the
// Journey-bearing members — the Strands whose served record carries a
// Journey cite. Read from the record for the reason they always were read
// from the Brief: the Brief is the closed set's carrier, and a second source
// would be a Brief fetch.
export function briefStrandIds(record) {
  return (Array.isArray(record?.strands) ? record.strands : []).map((s) => s.id);
}
export function briefJourneyStrands(record) {
  return (Array.isArray(record?.strands) ? record.strands : [])
    .filter((s) => typeof s.journey_cite === "string" && s.journey_cite !== "").map((s) => s.id);
}

// The record's text: its keys in the declared order, a caption above each
// as a comment for the owner who reads the file, every line within
// RECORD_WIDTH. A comment is never read back.
export function briefRecordText(record) {
  const decl = candidateSchemaBlock();
  const ordered = {};
  for (const k of Object.keys(decl.keys)) if (k in record) ordered[k] = record[k];
  for (const k of Object.keys(record)) if (!(k in ordered)) ordered[k] = record[k];
  const comments = new Map(Object.entries(decl.keys)
    .filter(([, d]) => typeof d.caption === "string").map(([k, d]) => [k, d.caption]));
  return stringifyYaml(ordered, { width: RECORD_WIDTH, comments, header: decl.header });
}

// The record read from its text, or a refusal naming what is wrong. A key the
// declaration does not name is refused rather than read, and a required key
// absent is refused by name; a slot key present as `null` is a slot awaiting
// composition, which is a template rather than a malformed record, and the
// caller decides what that costs.
export function parseBriefRecord(text, path = "<brief>") {
  let record;
  try { record = parseYaml(text, path); }
  catch (e) { return { error: `the Brief at ${path} is not a YAML record this reader can read: ${e.message}` }; }
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { error: `the Brief at ${path} is not a YAML map — the Brief record is one map of named keys (kogaki#1328)` };
  }
  const decl = candidateSchemaBlock().keys;
  for (const k of Object.keys(record)) {
    if (!Object.prototype.hasOwnProperty.call(decl, k)) {
      return { error: `the Brief at ${path} carries the key \`${k}\`, which the Brief record does not declare `
        + `(src/candidate-schema.json, \`brief_record\`) — a key nobody reads is refused rather than carried` };
    }
  }
  for (const [k, d] of Object.entries(decl)) {
    if (d.required === true && !(k in record)) {
      return { error: `the Brief at ${path} carries no \`${k}\` — ${d.description}` };
    }
  }
  if (!Array.isArray(record.strands) || record.strands.length === 0) {
    return { error: `the Brief at ${path} settles no Strands — \`strands\` is the closed set the mint wrote` };
  }
  return { record };
}
export function readBriefRecord(path) {
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { return { error: `the Brief at ${path} cannot be read (${e.message})` }; }
  const r = parseBriefRecord(text, path);
  return r.error ? r : { record: r.record, text };
}
// The slot keys still awaiting composition, in the declared order.
export function unfilledSlots(record) {
  return briefSlotKeys().filter((k) => record[k] === null || record[k] === undefined);
}

// Fills one slot of the record; a slot already filled refuses, because
// composition resumes by judgment, never by overwrite.
export function fillSlot(record, key, value) {
  if (!briefSlotKeys().includes(key)) {
    return { error: `\`${key}\` is not a slot of the Brief record (src/candidate-schema.json, \`brief_record\`)` };
  }
  if (record[key] !== null && record[key] !== undefined) {
    return { error: `the Brief's \`${key}\` is already filled — composition resumes by judgment, not by overwrite, `
      + "or this is not a minted Brief (the durable home and the entry point)" };
  }
  return { record: { ...record, [key]: value } };
}

// THE THESIS ROW OF CLOSURE IS DERIVED (kogaki#1328). It was the Candidate's
// free-text `reasoning.thesis_closure`, written into the Brief whole — one
// line of 1934 characters in the 2026-10-09 Brief, carrying what the Strand
// coverage already carried per Strand. It is now rendered from that coverage
// — each placed Strand's `role_in_thesis` — and handed to the one Leg marked
// `reaches_target`, the Leg whose after-state is the Reader target. Null where
// the record carries no such Leg or no stated role.
export function thesisClosureRow(record) {
  const roles = (Array.isArray(record?.strand_coverage) ? record.strand_coverage : [])
    .filter((c) => typeof c.role_in_thesis === "string" && c.role_in_thesis.trim() !== "")
    .map((c) => c.role_in_thesis.trim());
  if (!roles.length || typeof record.thesis !== "string") return null;
  return `The Thesis — ${record.thesis.trim()} — is established by the end of this Leg, with each piece of `
    + `the material doing its part: ${roles.join(" ")}`;
}
export function thesisClosureLeg(record) {
  const marked = (Array.isArray(record?.reader_path) ? record.reader_path : []).filter((s) => s.reaches_target === true);
  return marked.length === 1 ? marked[0].leg_id : null;
}

// THE LEG PACKET'S OWN CLOSURE ROWS (Closure, kogaki#1151). A Leg is handed
// only the rows it is a party to — where it is `introduced_by`,
// `discharged_by` or `conceded_by` — as their text; the derived Thesis row is
// handed to the Leg marked `reaches_target`. Read from the record's `closure`
// list, which adoption wrote from the Candidate's obligations ledger.
export const CONCEDED_ROW_FIELDS = ["open", "why_not_here", "reader_keeps"];
export function closureRowsOf(record, legId) {
  const rows = [];
  if (thesisClosureLeg(record) === legId) {
    const t = thesisClosureRow(record);
    if (t) rows.push({ text: t });
  }
  for (const o of Array.isArray(record?.closure) ? record.closure : []) {
    if (o.introduced_by === legId || o.discharged_by === legId || o.conceded_by === legId) rows.push(o);
  }
  return rows;
}

// The placement count, taken AFTER composition and COUNTED IN PLACEMENTS
// (the obligations ledger; the read-not-invented
// rule's completeness rider): a placement is a leg whose materials
// carry the Strand. Derived from the composed legs themselves, never from
// a declaration — a composer that cannot omit in principle can still omit
// in fact, and a declared cover would hide exactly that.
export function placements(legs, strandIds) {
  const used = new Map(strandIds.map((id) => [id, []]));
  for (const s of legs) {
    for (const m of s.materials) {
      if (used.has(m)) used.get(m).push(s.leg_id);
    }
  }
  return used;
}

// Journey placement — journey register as a Candidate axis, MUST 1, the completeness rider's half: a
// Journey is a DISTINCT material (the Leg's shape — "which Strands, which Journeys").
// Derived from the composed legs for the same reason placements() is, and the
// reason is load-bearing here rather than inherited: a Strand can be placed
// while the journey material it carries is dropped, so a per-Strand count
// cannot see this omission at all and a declared cover would hide it by
// construction.
//
// COUNTED FROM `journeys`, AND THIS REVERSES kogaki#1111 (kogaki#1131). That
// Issue moved a Leg's Journey use into the `journeys` field and left this
// count reading a `<L-id>.journey` token in `materials`, on the stated ground
// that "coverage accounting is unchanged by this field". Two readers of one
// fact, and they disagreed on the first Brief written to `done`: every Leg of
// the adopted Candidate carried a `journeys` entry and named its Strand bare,
// so the Brief rendered a `journey:` line for four of five Legs and disclosed
// all five as OMITTED in the same document. A disclosure that reports omission
// over material the path placed is a FALSE disclosure, and the Brief carrying
// it is handed to /draft as a settled input.
//
// So the field `journeysRefusal` validates and `legRecord` writes is the
// record of Journey use, and the count is taken from it. A spelling convention
// beside that field is a second source that can disagree with the first, which
// is the defect rather than a redundancy. `<L-id>.journey` in `materials` stays
// LEGAL and stays CHECKED in `fillBrief` — it names the Strand, and the schema
// admits either spelling — but it no longer places anything on its own: a Leg
// places a Journey by declaring what it uses it FOR.
export function journeyPlacements(legs, journeyIds) {
  const used = new Map(journeyIds.map((id) => [id, []]));
  for (const s of legs) {
    for (const j of s.journeys || []) {
      if (j && used.has(j.strand)) used.get(j.strand).push(s.leg_id);
    }
  }
  return used;
}

// ---- the fill: reader_path, strand_coverage, journey_coverage, closure ----
// Pure over the record; exported for the check. Returns `{ record, placed,
// total }` or `{ error }`.
export function fillBrief(record, { legs, coverage = {}, obligations = [], unused = {}, readerStart }) {
  const v = validateLegs(legs, readerStart, obligations, definedTermsOf(record));
  if (v.error) return { error: v.error };
  legs = v.legs;
  const strandIds = briefStrandIds(record);
  if (strandIds.length === 0) return { error: "the Brief carries no Strands — not a minted Brief" };
  // materials may reference only the closed set's Strands (plus the Thesis,
  // reader assumptions, earlier legs' conclusions, constructed material —
  // the Leg's shape's many-to-many list; only L<n> tokens are checkable against the
  // closed set, and a foreign L<n> is a Brief fetch by the durable home and the entry point invariant).
  const journeyIds = briefJourneyStrands(record);
  for (const s of legs) {
    for (const m of s.materials) {
      if (/^L[0-9]+$/.test(m) && !strandIds.includes(m)) {
        return { error: `leg ${s.leg_id}: material ${m} is outside the Brief's closed Strand set `
          + `(${strandIds.join(", ")}) — growing the set routes back through Terrain, never a Brief fetch (the durable home and the entry point)` };
      }
      // A Journey material (the Leg's shape) is checkable twice: against the closed set,
      // and against that Strand ACTUALLY carrying Journey material. The second
      // check is what stops a composer inventing journey material for a Strand
      // whose served record has none — unsupported completion (the claims rule), in the
      // one place the bare-L<n> check cannot see.
      const j = /^(L[0-9]+)\.journey$/.exec(m);
      if (j) {
        if (!strandIds.includes(j[1])) {
          return { error: `leg ${s.leg_id}: material ${m} names a Strand outside the Brief's closed set `
            + `(${strandIds.join(", ")}) — never a Brief fetch (the durable home and the entry point)` };
        }
        if (!journeyIds.includes(j[1])) {
          return { error: `leg ${s.leg_id}: material ${m} claims Journey material for ${j[1]}, whose served `
            + `record carries none (the Brief records no journey cite for it) — a Journey the material does not `
            + `have is unsupported completion (the claims rule), never a composition choice` };
        }
      }
    }
    // THE SERVED-RECORD HALF OF the Journey a Leg draws on (kogaki#1111). `journeysRefusal`
    // checks the shape, the closed use set and that the Leg carries the
    // Strand; whether that Strand's SERVED record carries Journey material is
    // a fact about the Brief, and this is the one place holding both.
    for (const j of s.journeys || []) {
      if (!journeyIds.includes(j.strand)) {
        return { error: `leg ${s.leg_id}: journey draws on ${j.strand}'s Journey, whose served record carries none `
          + `(the Brief records no journey cite for it) — a Journey the material does not have is unsupported `
          + `completion (the claims rule), never a composition choice` };
      }
    }
    for (const g of s.claims) {
      if (!strandIds.includes(g.strand)) {
        return { error: `leg ${s.leg_id}: strand claim ${g.strand} is outside the closed set (${strandIds.join(", ")})` };
      }
    }
  }

  // Strand coverage: used_by_legs DERIVED from the composed legs; an
  // unplaced selected Strand DISCLOSES rather than silently drops (the obligations ledger).
  const place = placements(legs, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  const strandCoverage = strandIds.map((id) => (place.get(id).length > 0
    ? { strand: id, used_by_legs: place.get(id), role_in_thesis: coverage[id]?.role_in_thesis ?? null }
    : { strand: id, unplaced: unused[id] ?? "left unused (the claims rule's third move — omit the Leg, revise the path, or leave the Strand unused; never invention)" }));
  // journey register as a Candidate axis MUST 1 — journey material is PLACED OR ITS OMISSION IS DISCLOSED,
  // per Journey-bearing member. An empty list where the selected set carries
  // no Journey material: vacuous rather than violated.
  const jplace = journeyPlacements(legs, journeyIds);
  const journeyCoverage = journeyIds.map((id) => (jplace.get(id).length > 0
    ? { strand: id, placed_by: jplace.get(id) }
    : { strand: id, omitted: unused[`${id}.journey`] ?? "the Journey material is left unplaced (the claims rule's third move — omit the Leg, revise the path, or leave the material unused; never invention)" }));

  // CLOSURE (kogaki#1151). An obligation is a promise the prose makes to the
  // reader that a later passage must keep. EVERY ROW ENDS IN ONE OF TWO
  // TERMINAL STATES — `discharged_by` or `conceded_by` — and a row carrying
  // neither, or both, is refused by name. The Thesis row is not a row of this
  // list: it is derived (`thesisClosureRow`, kogaki#1328).
  const legIds = new Set(legs.map((s) => s.leg_id));
  const closure = [];
  for (const [i, o] of obligations.entries()) {
    if (typeof o.text !== "string" || o.text === "" || typeof o.introduced_by !== "string") {
      return { error: `obligation ${i + 1}: each Closure row carries its text and introduced_by (the obligation definition)` };
    }
    if (!legIds.has(o.introduced_by)) {
      return { error: `obligation ${i + 1}: introduced_by "${o.introduced_by}" is not a leg in this sequence` };
    }
    if (o.discharged_by !== undefined && !legIds.has(o.discharged_by)) {
      return { error: `obligation ${i + 1}: discharged_by "${o.discharged_by}" is not a leg in this sequence` };
    }
    if (o.conceded_by !== undefined && !legIds.has(o.conceded_by)) {
      return { error: `obligation ${i + 1}: conceded_by "${o.conceded_by}" is not a leg in this sequence` };
    }
    const hasDischarged = o.discharged_by !== undefined;
    const hasConceded = o.conceded_by !== undefined;
    if (hasDischarged === hasConceded) {
      return { error: `obligation ${i + 1} (${JSON.stringify(o.text)}, introduced_by ${o.introduced_by}): `
        + `every Closure row ends discharged_by or conceded_by, naming the Leg — this row carries `
        + `${hasDischarged ? "BOTH" : "NEITHER"}` };
    }
    const row = { text: o.text, introduced_by: o.introduced_by };
    if (hasDischarged) row.discharged_by = o.discharged_by;
    else {
      row.conceded_by = o.conceded_by;
      // A CONCEDED ROW'S THREE FIELDS (kogaki#1263, kogaki#1261): what stays
      // open, why this article does not close it, and what the reader keeps.
      for (const k of CONCEDED_ROW_FIELDS) {
        if (typeof o[k] === "string" && o[k] !== "") row[k] = o[k];
      }
    }
    closure.push(row);
  }

  let out = record;
  for (const [key, value] of [
    ["reader_path", legs.map(legRecord)],
    ["strand_coverage", strandCoverage],
    ["journey_coverage", journeyCoverage],
    ["closure", closure],
  ]) {
    const r = fillSlot(out, key, value);
    if (r.error) return r;
    out = r.record;
  }
  return { record: out, placed: placed.length, total: strandIds.length };
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

// `cmdFill` IS GONE with its route (kogaki#551, PR #557 round 1). The first
// cut left the function defined and uncalled — a retired route whose body
// survives reads as a route that could be switched back on, which is the
// demotion-not-a-retirement shape this change exists to end. `fillBrief`,
// the composer it called, is exported and untouched.


const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    // `fill` IS RETIRED (the durable home and the entry point v17, kogaki#551). It wrote a Brief's sequence
    // from one composed path, bypassing assembly and the Candidate gate's Candidate-selection
    // gate — so its output was a path nobody chose and nobody could decline,
    // and the Candidate gate's premise-negation option ("none of these — the Thesis or the
    // settled set is what should change") was unreachable on that route.
    //
    // It is REMOVED rather than left demoted, because a demotion is not a
    // retirement: "the constrain half landed and the retire half never ran …
    // the growth curve does not stop when the diagnosis is corrected; it stops
    // when something removes members"
    // (product-lab@8906f20 topics/knowledge-architecture.md:174).
    //
    // `fillBrief` — the composer this subcommand called — is UNTOUCHED and
    // still exported: it is how `adopt-candidate` and the checks fill a
    // sequence. What is retired is the ungated CLI entry point, never the
    // composition itself.
    case "fill":
      fail("`fill` no longer exists — a Brief's sequence is filled by adopting "
        + "a Candidate at the selection gate (SPEC-draft-pipeline, the Candidate gate; retired "
        + "at the durable home and the entry point v17, kogaki#551). Run `assemble.mjs assemble` to build the "
        + "selection payload, raise the gate, then `assemble.mjs "
        + "adopt-candidate --brief <path> --reviewed <json> --candidate <id>`.");
      break;
    default: fail("usage: compose.mjs — no subcommand; `fillBrief` is exported for the composition path, and the retired `fill` subcommand is replaced by assemble.mjs adopt-candidate (the Candidate gate, kogaki#551)");
  }
}
