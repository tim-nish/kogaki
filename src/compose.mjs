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
//   the Bridge Leg and the revise pass
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
    writeFileSync(join(dir, `${String(seq).padStart(3, "0")}-${stage}-${phase}.md`), content);
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
// the relations layer's closed set (kogaki#1174), read from the schema for the same reason
// the claim types and Journey uses are: the schema is rendered into the
// composition prompt and read back here, so the set the composer is shown and
// the set the refusal enforces are one file and cannot disagree.
function relationTypes() {
  return new Map(Object.entries(legschema().relation.types));
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


// The two required fields whose refusal is written out below rather than
// generated from the schema's declared type. Both say something the generic
// "is required" sentence cannot: `move` names WHY a Move-less Leg is not a
// Leg, and `claims` names what a claim is. They are still required fields
// of the schema and still enumerated from it — this set only routes which
// refusal speaks.
const BESPOKE_LEG_REFUSALS = new Set(["move", "claims"]);

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
// Strands section and so is checked in `fillBrief`, beside the existing
// `<L-id>.journey` check that reads the same `journeyBearingStrands` list.
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

// ---- the relations layer (kogaki#1174) ----
//
// A Leg MAY declare `relations`: which of its own claims and `introduces`
// entries are SATELLITES, and of which NUCLEUS. Every item this field does
// not name is a nucleus by default — the field marks subordination and
// nothing else, so a Leg declaring none renders exactly as it did before
// this field existed.
//
// THE ADDRESS GRAMMAR IS TYPED BY KIND. `g<n>` addresses this Leg's nth
// declared claim (the address `figure_roles` already uses); `i<n>` addresses
// its nth declared `introduces` entry, both 1-based in declaration order.
const RELATION_ADDRESS = /^([gi])([1-9][0-9]*)$/;

// The address's kind ("g" or "i") and 1-based index, or `null` for a string
// that is not one of this Leg's own addresses.
function parseRelationAddress(addr) {
  const m = RELATION_ADDRESS.exec(String(addr ?? ""));
  return m ? { kind: m[1], index: Number(m[2]) } : null;
}

// PURE over one Leg's own claims and introduces, and exported for the second
// reader — `src/draft.mjs`'s parse-back — the same arrangement `journeysRefusal`
// and `introducesRefusal` already have: a writer and a reader disagreeing about
// what a relation is fails silently at exactly the field that decides how the
// Packet's tree renders.
export function relationsRefusal(relations, claims, introduces, at) {
  if (relations === undefined) return null;
  if (!Array.isArray(relations)) {
    return `${at}: relations, when present, is an array of satellite markings — each naming the item being subordinated, the nucleus it is a satellite of, and the relation between them (the relations layer)`;
  }
  const types = relationTypes();
  const nClaims = (claims || []).length;
  const nIntro = (introduces || []).length;
  const bound = (kind) => (kind === "g" ? nClaims : nIntro);
  const kindName = (kind) => (kind === "g" ? "claim" : "introduces entry");
  const namedItems = new Set();
  const namedNuclei = new Set();
  for (const [i, r] of relations.entries()) {
    const nth = `relations[${i}]`;
    if (!r || typeof r !== "object" || Array.isArray(r)) {
      return `${at}: ${nth} is not a relation entry — each names \`item\`, \`nucleus\` and \`relation\` (the relations layer, \`relation\`)`;
    }
    if (typeof r.relation !== "string" || r.relation === "") {
      return `${at}: ${nth} names no relation — the type this satellite bears to its nucleus, from the closed set: ${[...types.keys()].join(", ")}`;
    }
    if (!types.has(r.relation)) {
      return `${at}: ${nth} declares relation ${JSON.stringify(r.relation)} — the relations layer's set is closed: `
        + [...types.entries()].map(([k, v]) => `${k} — ${v}`).join("; ");
    }
    const item = parseRelationAddress(r.item);
    if (!item) {
      return `${at}: ${nth} names no nucleus for a satellite that resolves — \`item\` must address one of this Leg's own claims or introduces entries, \`g<n>\` or \`i<n>\` (the relations layer)`;
    }
    const nucleus = parseRelationAddress(r.nucleus);
    if (!nucleus) {
      return `${at}: ${nth} (item ${r.item}) names no nucleus — a satellite that names no nucleus is refused: \`nucleus\` must address one of this Leg's own claims or introduces entries, \`g<n>\` or \`i<n>\` (the relations layer)`;
    }
    if (item.index > bound(item.kind)) {
      return `${at}: ${nth} names item ${r.item}, and this Leg declares only ${bound(item.kind)} ${kindName(item.kind)}${bound(item.kind) === 1 ? "" : "s"} — the address points past them`;
    }
    if (nucleus.index > bound(nucleus.kind)) {
      return `${at}: ${nth} (item ${r.item}) names nucleus ${r.nucleus}, and this Leg declares only ${bound(nucleus.kind)} ${kindName(nucleus.kind)}${bound(nucleus.kind) === 1 ? "" : "s"} — the address points past them`;
    }
    if (item.kind !== nucleus.kind) {
      return `${at}: ${nth} makes ${r.item} a satellite of ${r.nucleus} — a satellite and its nucleus are items of the SAME KIND (both claims or both introduces entries), because the two render in separate Packet blocks`;
    }
    if (r.item === r.nucleus) {
      return `${at}: ${nth} names ${r.item} a satellite of itself — a satellite subordinates to a DIFFERENT item`;
    }
    if (namedItems.has(r.item)) {
      return `${at}: relations names ${r.item} as a satellite twice — one entry per item, naming one nucleus`;
    }
    namedItems.add(r.item);
    namedNuclei.add(r.nucleus);
  }
  // A TREE IS TWO LEVELS, NEVER A CHAIN — checked after every entry is known
  // to be well formed, because it is a fact about the WHOLE set: an item
  // named as a nucleus above may not itself be named as a satellite below.
  for (const n of namedNuclei) {
    if (namedItems.has(n)) {
      return `${at}: relations names ${n} as a nucleus and also as a satellite — a tree is two levels, never a chain; a nucleus is not itself a satellite of anything`;
    }
  }
  return null;
}

// the relations layer's `budget` — OPTIONAL, the word bound this Leg's realized
// prose may spend. Shape only: a limit the writer sees, never a target the
// runtime judges the passage against.
export function budgetRefusal(budget, at) {
  if (budget === undefined) return null;
  if (typeof budget !== "number" || !Number.isInteger(budget) || budget <= 0) {
    return `${at}: budget, when present, is a positive whole number of words (the relations layer) — it reads ${JSON.stringify(budget)}`;
  }
  return null;
}

// ---- shape validation (the Leg's shape — the fields, not the markup) ----
// THE FIELD SET IS THE SCHEMA'S (kogaki#1108); the refusals are this file's.
// Returns { error } or { legs }. Pure over its argument; exported for the check.
export function validateLegs(legs, readerStart) {
  if (!Array.isArray(legs) || legs.length === 0) {
    return { error: pathRefusal("path_is_non_empty", null, "This answer carries no Leg at all.") };
  }
  // Reader start binds the first Leg (Closure, kogaki#1151): `readerStart` is
  // OPTIONAL because the two call sites hold it at different points (the
  // Candidate's own `reader_start` at compose_path, the same value again at
  // fillBrief), and a caller with none to hand — a bare shape check — is not
  // asked to invent one.
  //
  // READER START IS A STANCE IN THE MOVE LIBRARY'S OWN DIMENSIONS, NOT A
  // KNOWLEDGE STATE (SPEC-draft-pipeline §"The three reader fields, and the
  // block that authors them", kogaki#1176): both sides of
  // this comparison are `dimension: value` lines in the same shape a Move's
  // `before` is written in, so a first Leg's Move may specialize any
  // dimension Reader start states — including a `question:` line reading
  // `holds: none` — and is no longer forced onto a Move whose `before` reads
  // as an in-subject understanding. The comparison below is unchanged by
  // that redefinition: both sides were already opaque strings, and the check
  // is a verbatim match, never a per-dimension one.
  if (typeof readerStart === "string" && readerStart !== "" && legs[0].reader_state_before !== readerStart) {
    return { error: pathRefusal("reader_start_binds_first_leg", `leg 1 (${legs[0].leg_id ?? "?"})`,
      `Its reader_state_before reads ${JSON.stringify(legs[0].reader_state_before)}; `
      + `the Brief's Reader start reads ${JSON.stringify(readerStart)}.`) };
  }
  const schema = legschema();
  const seen = new Set();
  for (const [i, s] of legs.entries()) {
    const at = `leg ${i + 1}${s && s.leg_id ? ` (${s.leg_id})` : ""}`;
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
    if (seen.has(s.leg_id)) {
      return { error: pathRefusal("leg_id_unique", at, `An earlier Leg already carries the id ${JSON.stringify(s.leg_id)} — this is a duplicate leg_id, and the repair is to rename one of the two, never to merge them.`) };
    }
    // the Leg's shape v18 (kogaki#642) — `Leg = Input + State`, and the Move IS the
    // State, so a Move-less Leg is not a Leg. This is the seat the spec
    // names as the carrier: the requirement binds at composition, which is
    // what makes such a Leg unwritable rather than discouraged. the constraints that survive's
    // no-mandatory-Moves rider is superseded there by name.
    if (typeof s.move !== "string" || s.move === "") {
      return { error: `${at}: move is required by the Leg's shape — a Leg binds a Move library entry by id (the Move library), because the Move is the State component of a Leg and a Leg without one has no defined reader-state transition type` };
    }
    for (const d of s.depends_on) {
      if (!seen.has(d)) {
        return { error: pathRefusal("depends_on_ordering", at, `Its depends_on names "${d}", which is not an EARLIER Leg of this path: either move the Leg that carries that id ahead of this one, or drop the dependency.`) };
      }
    }
    // the Bridge Leg and the revise pass's `bridges` — optional, and when present it names the ADJACENT
    // PAIR this Leg was inserted between. Validated here because the
    // selection gate's disclosure is computed from it: an unvalidated marking
    // renders `between :` or `between true:` at an owner surface.
    if (s.bridges !== undefined) {
      if (!Array.isArray(s.bridges) || s.bridges.length !== 2 || s.bridges.some((b) => typeof b !== "string" || b === "")) {
        return { error: `${at}: bridges, when present, names the two adjacent legs this Leg was inserted between (the Bridge Leg and the revise pass) — an array of exactly two leg ids` };
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
    // the relations layer's `relations`/`budget` (kogaki#1174) — OPTIONAL, validated here for the
    // reason `bridges`, `introduces`, `figure` and `journeys` are: both reach
    // the Leg Packet, the model's ENTIRE input, so an unvalidated satellite or
    // budget renders as a tree the model cannot resolve or a limit it cannot
    // read. Placed after the claims loop because a relation's address space is
    // this Leg's own claims and introduces entries, so it does not exist until
    // both are known to be well formed.
    {
      const bad = relationsRefusal(s.relations, s.claims, s.introduces, at);
      if (bad) return { error: bad };
    }
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
  return { legs };
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
// library, and the Leg's reader_state_before/after are the instance forms of
// that Move's `before`/`after`, specialized to this reader and these
// Strands. The relationship has two halves and they are carried by DIFFERENT
// machinery on purpose:
//
//   MECHANICAL — does the id resolve? A set membership test over the store.
//                Refused here.
//   JUDGED     — are the instantiated states consistent specializations of
//                the Move's contract? An LLM judgment, recorded in a typed
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
// stays where the judgment rule sites it: with the judge, at
// `judge_specialization`, over a record whose SHAPE this file owns.
//
// WHAT IT IS FOR, and the defect it closes (kogaki#1125). Two states were
// asked about Move contracts they were never handed. `compose_path` composed
// the `move` field with the field's NAME and no set of legal values, and
// invented six ids that read like Moves; `judge_specialization` was asked to
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

// ONE Move's contract, by id. The two fields are the ones the specialization
// judgment is a comparison AGAINST — `src/brief-workflow.json`'s
// `judge_specialization` names them in its own judgment_point — so the pair is
// named here rather than the whole record being handed over: a reader given
// `breaks` too would be a reader that had quietly widened what the verdict
// is about.
export function moveContract(moveId, movesDir = "moves") {
  let text;
  try { text = readFileSync(join(movesDir, `${moveId}.md`), "utf8"); }
  catch (e) {
    return { error: `move "${moveId}" cannot be read from ${movesDir} (${e.message})` };
  }
  const before = moveScalarField(text, "before");
  const after = moveScalarField(text, "after");
  const missing = [before === null ? "before" : null, after === null ? "after" : null].filter(Boolean);
  if (missing.length) {
    // A STORE FAULT, NAMED AS ONE. A Move whose contract is half-written
    // cannot be judged against, and reporting it as a composition problem
    // would send the reader to the Brief rather than to the library.
    return { error: `move "${moveId}" declares no ${missing.join(" and no ")} (${movesDir}/${moveId}.md) — `
      + `the specialization judgment is a comparison against a Move's before and after (the Leg-Move instantiation contract), `
      + `so a record missing one leaves the judgment nothing to be a comparison against. Repair the Move record under its own issue.` };
  }
  return { id: moveId, before, after };
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
    out.push({ leg_id: s.leg_id, move: s.move, before: c.before, after: c.after });
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
export function validateSpecialization(record, legs, candidateId) {
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

export function parseIntroducesEntry(raw) {
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

// the Section grouping's `opens_section` (kogaki#822) — OPTIONAL, and shape-validated here for
// the reason `introduces` is: the title reaches an owner-facing heading, so an
// unvalidated value renders as a blank or as `undefined` above a Section.
export function opensSectionRefusal(value, at) {
  if (typeof value !== "string" || value.trim() === "") {
    return `${at}: opens_section, when present, is the Section's title — a non-empty string (the Section grouping). Its PRESENCE marks the opening and its VALUE carries the title, which is why an empty one has no meaning rather than meaning "opens with no title"`;
  }
  return null;
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
    if (typeof raw !== "string") {
      return `${at}: introduces carries a non-string entry — each entry is one line, "term" or "term ${INTRODUCES_SEP} anchor" (the reader-knowledge ledger)`;
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

export function renderLeg(s) {
  const L = [];
  L.push("```leg");
  L.push(`leg_id: ${s.leg_id}`);
  if (s.move) L.push(`move: ${s.move}`);
  L.push(`materials: ${s.materials.join(", ")}`);
  L.push(`purpose: ${s.purpose}`);
  L.push(`reader_state_before: ${s.reader_state_before}`);
  L.push(`reader_state_after: ${s.reader_state_after}`);
  L.push(`depends_on: ${s.depends_on.join(", ") || "(none)"}`);
  L.push(`rationale: ${s.rationale}`);
  for (const g of s.claims) {
    // ONE FORM, and no other (kogaki#1095): `claim (strand L<n>): <proposition>`.
    // The type is written out rather than dropped because `src/draft.mjs`'s
    // `material --strand` reader and the figure `g<n>` addressing both read
    // this line as it stands, and this issue moves neither.
    L.push(`claim (strand ${g.strand}): ${g.proposition}`);
  }
  // the Journey a Leg draws on (kogaki#1111): ONE LINE PER ENTRY, `journey: <L-id> — <use>`.
  // One line rather than a joined field for the reason `introduces` states,
  // and written only when declared, so a Brief composed before this field is
  // byte-identical.
  for (const j of s.journeys || []) L.push(`journey: ${j.strand} — ${j.use}`);
  // the reader-knowledge ledger (kogaki#751): one LINE per entry, never a comma-joined list. A term
  // may legitimately contain a comma, and its anchor almost always does, so a
  // joined field could not be parsed back — the serialization and
  // `parseBrief`'s reader are one round trip and this is the half that makes
  // it possible.
  for (const e of s.introduces || []) L.push(`introduces: ${e}`);
  // the relations layer (kogaki#1174): one LINE per satellite marking, `relation: <item> of <nucleus> (<type>)`,
  // for the reason `journey` and `introduces` are one line per entry —
  // written only when declared, so a Brief composed before this field is
  // byte-identical.
  for (const r of s.relations || []) L.push(`relation: ${r.item} of ${r.nucleus} (${r.relation})`);
  if (s.budget !== undefined && s.budget !== null) L.push(`budget: ${s.budget}`);
  if (s.opens_section !== undefined) L.push(`opens_section: ${s.opens_section}`);
  if (s.bridges) L.push(`bridges: ${s.bridges.join(", ")}`);
  // the figure decision (kogaki#877). Written only when declared, so a Brief composed before
  // this field is byte-identical.
  if (s.figure !== undefined && s.figure !== null) {
    L.push(`figure: ${s.figure}`);
    L.push(`figure_roles: ${renderFigureRoles(s.figure_roles)}`);
  }
  if (s.entailed === true) {
    L.push(`entailed: true`);
    L.push(`entailment_reasoning: ${s.entailment_reasoning}`);
  }
  L.push("```");
  return L.join("\n");
}

// The selected Strands are read from the Brief's own Strands section —
// the closed set the mint wrote (the durable home and the entry point's closed-set invariant: composition
// may use exactly this set).
export function selectedStrands(doc) {
  return [...doc.matchAll(/^### (L[0-9]+) — /gm)].map((m) => m[1]);
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

// The JOURNEY-BEARING members of the closed set, read from the Brief's own
// Strands section: the mint renders a `- journey cite:` line under exactly
// those Strands whose served record carried Journey material (brief.mjs).
// Read from the document for the same reason selectedStrands is — the Brief
// is the closed set's carrier, and a second source would be a Brief fetch.
export function journeyBearingStrands(doc) {
  const out = [];
  const secs = [...doc.matchAll(/^### (L[0-9]+) — [^\n]*\n([\s\S]*?)(?=^### |^## )/gm)];
  for (const m of secs) {
    if (/^- journey cite:/m.test(m[2])) out.push(m[1]);
  }
  return out;
}

// THE LEG PACKET'S OWN CLOSURE ROWS (Closure, kogaki#1151). A Leg is handed
// only the rows it is a party to — where it is `introduced_by`, `discharged_by`
// or `conceded_by` — as their PROSE TEXT, in the same "already knows / introduce
// here" shape the reader-knowledge ledger already renders; the Thesis row is handed to its
// `established_by_legs`. Read from the Brief's OWN rendered "## Closure"
// section rather than recomputed from a Candidate record — fillBrief already
// wrote the one true rendering, and a second derivation here could disagree
// with it.
export function closureRowsForLeg(doc, legId) {
  const rows = [];
  // THE SECTION IS SLICED, NEVER MATCHED BY ONE `m`-FLAGGED REGEX (PR #1152
  // round 1, finding 2). The first cut read
  // `/^## Closure\n\n([\s\S]*?)(?:\n## |$)/m`, where `m` makes `$` match at
  // every LINE end — so the lazy group stopped at the first one and the capture
  // was ALWAYS empty. The function therefore returned `[]` for every Leg and
  // every Packet rendered the stated absence, with nothing in the tree reading
  // the rows-present branch to notice. A slice has no such ambiguity: one
  // heading in, the next `## ` heading or end of document out.
  const at = doc.indexOf("## Closure\n\n");
  if (at === -1) return rows;
  const body = doc.slice(at + "## Closure\n\n".length);
  const end = body.indexOf("\n## ");
  const section = end === -1 ? body : body.slice(0, end);
  const thesisM = /### Thesis\n\n([\s\S]*?)\n\n### Legs/m.exec(section);
  if (thesisM) {
    const t = thesisM[1].trim();
    const em = /^([\s\S]*?)\s+—\s+established_by_legs:\s*(.*)$/m.exec(t);
    if (em) {
      const legs = em[2].split(",").map((s) => s.trim()).filter(Boolean);
      if (legs.includes(legId)) rows.push(em[1].trim());
    }
  }
  for (const line of section.split("\n")) {
    const rm = /^- (.*) — introduced_by: (\S+?);\s*(?:discharged_by|conceded_by):\s*(\S+)$/.exec(line);
    if (!rm) continue;
    const [, text, introducedBy, closingLeg] = rm;
    if (legId === introducedBy || legId === closingLeg) rows.push(text);
  }
  return rows;
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
// So the field `journeysRefusal` validates and `renderLeg` renders is the
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

// Exported for the adoption writer (story 1.75): thesis_closure and
// tradeoffs fill through the same one slot-replacer, so a filled field
// refuses overwrite everywhere for the same reason.
export function replaceSlot(doc, heading, body) {
  const re = new RegExp(`## ${heading}\\n\\n\\*\\(awaiting composition\\)\\*`);
  if (!re.test(doc)) {
    return { error: `the Brief's "${heading}" section is not a typed unfilled slot — `
      + `either it was already filled (composition resumes by judgment, not by overwrite) `
      + `or this is not a minted Brief (the durable home and the entry point)` };
  }
  // A REPLACER FUNCTION, NEVER A REPLACEMENT STRING (kogaki#539). `String
  // .prototype.replace` reads `$&`, `` $` ``, `$'` and `$<name>` in its second
  // argument as SUBSTITUTION PATTERNS, so a composed body containing any of
  // them was expanded instead of written: `costs $& twice` reached the Brief as
  // `costs ## Reader start`. A function form takes no patterns at all.
  //
  // NOT AN ESCAPE OF `$` IN THE BODY, deliberately. Escaping is a denial list
  // over a syntax that can grow — `$<name>` was added to the language after the
  // others — and it leaves the next pattern unhandled. The function removes the
  // possibility rather than enumerating what to catch.
  //
  // `$1` survived the old form only because this regex has no capture groups,
  // which is a property of the pattern rather than a guarantee, and is exactly
  // the kind of incidental safety that stops holding when the pattern changes.
  return { doc: doc.replace(re, () => `## ${heading}\n\n${body}`) };
}

// ---- the fill: sequence, strand_coverage, Closure ----
// Pure over strings; exported for the check.
export function fillBrief(doc, { legs, coverage = {}, obligations = [], unused = {}, readerStart, thesisClosure = null }) {
  const v = validateLegs(legs, readerStart);
  if (v.error) return { error: v.error };
  const strandIds = selectedStrands(doc);
  if (strandIds.length === 0) return { error: "the Brief carries no Strands section — not a minted Brief" };
  // materials may reference only the closed set's Strands (plus the Thesis,
  // reader assumptions, earlier legs' conclusions, constructed material —
  // the Leg's shape's many-to-many list; only L<n> tokens are checkable against the
  // closed set, and a foreign L<n> is a Brief fetch by the durable home and the entry point invariant).
  const journeyIds = journeyBearingStrands(doc);
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
            + `record carries none (the Brief renders no journey cite for it) — a Journey the material does not `
            + `have is unsupported completion (the claims rule), never a composition choice` };
        }
      }
    }
    // THE SERVED-RECORD HALF OF the Journey a Leg draws on (kogaki#1111). `journeysRefusal`
    // checks the shape, the closed use set and that the Leg carries the
    // Strand; whether that Strand's SERVED record carries Journey material is
    // a fact about the Brief, and this is the one place holding both. Same
    // ground as the `<L-id>.journey` check above: a Journey the material does
    // not have is unsupported completion, never a composition choice.
    for (const j of s.journeys || []) {
      if (!journeyIds.includes(j.strand)) {
        return { error: `leg ${s.leg_id}: journey draws on ${j.strand}'s Journey, whose served record carries none `
          + `(the Brief renders no journey cite for it) — a Journey the material does not have is unsupported `
          + `completion (the claims rule), never a composition choice` };
      }
    }
    for (const g of s.claims) {
      if (!strandIds.includes(g.strand)) {
        return { error: `leg ${s.leg_id}: strand claim ${g.strand} is outside the closed set (${strandIds.join(", ")})` };
      }
    }
  }

  let out = doc;
  const seq = legs.map(renderLeg).join("\n\n");
  // The owner-facing heading is the ratified name (kogaki#574); the settled structure section record
  // field this fills is still `sequence`, and only the rendering moved.
  let r = replaceSlot(out, "Reader Path", seq);
  if (r.error) return r;
  out = r.doc;

  // Strand coverage: used_by_legs DERIVED from the composed legs; an
  // unplaced selected Strand DISCLOSES rather than silently drops (the obligations ledger).
  const place = placements(legs, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  const covL = [];
  for (const id of strandIds) {
    const uses = place.get(id);
    if (uses.length > 0) {
      covL.push(`- **${id}** — used_by_legs: ${uses.join(", ")}; role_in_thesis: ${coverage[id]?.role_in_thesis ?? "(not stated by the composer)"}`);
    } else {
      covL.push(`- **${id}** — **UNPLACED, disclosed**: ${unused[id] ?? "left unused (the claims rule's third move — omit the Leg, revise the path, or leave the Strand unused; never invention)"}`);
    }
  }
  covL.push("");
  covL.push(`*Strand placement count, taken AFTER composition, counted in placements: ${placed.length} of ${strandIds.length} selected Strand(s) placed.*`);
  // journey register as a Candidate axis MUST 1 — journey material is PLACED OR ITS OMISSION IS DISCLOSED,
  // per Journey-bearing member. Vacuous rather than violated where the
  // selected set carries no Journey material (journey register as a Candidate axis's contingency), and the
  // empty case renders its own line rather than being omitted.
  covL.push("");
  if (journeyIds.length === 0) {
    covL.push("*Journey coverage: no selected Strand carries Journey material — journey register as a Candidate axis's MUSTs are vacuous here, not unmet.*");
  } else {
    const jplace = journeyPlacements(legs, journeyIds);
    const jplaced = journeyIds.filter((id) => jplace.get(id).length > 0);
    covL.push("*Journey coverage (journey register as a Candidate axis MUST 1 — placed, or the omission disclosed):*");
    for (const id of journeyIds) {
      const uses = jplace.get(id);
      if (uses.length > 0) {
        covL.push(`- **${id}** journey — placed by: ${uses.join(", ")}`);
      } else {
        covL.push(`- **${id}** journey — **OMITTED, disclosed**: ${unused[`${id}.journey`] ?? "the Journey material is left unplaced (the claims rule's third move — omit the Leg, revise the path, or leave the material unused; never invention)"}`);
      }
    }
    covL.push(`*Journey placement count, taken AFTER composition: ${jplaced.length} of ${journeyIds.length} Journey-bearing Strand(s) placed.*`);
  }
  r = replaceSlot(out, "Strand coverage", covL.join("\n"));
  if (r.error) return r;
  out = r.doc;

  // CLOSURE (kogaki#1151, superseding the obligations ledger's own "Unresolved
  // obligations" rendering). An obligation is a promise the prose makes to the
  // reader that a later passage must keep: a question raised, an analogy
  // introduced, a limitation conceded. EVERY ROW NOW ENDS IN ONE OF TWO
  // TERMINAL STATES — `discharged_by` (the promise is kept there) or
  // `conceded_by` (the prose there tells the reader it is left open) —
  // "unresolved" is no longer a state the ledger can hold, and a row carrying
  // neither, or both, is refused by name.
  const legIds = new Set(legs.map((s) => s.leg_id));
  const oblL = [];
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
    oblL.push(hasDischarged
      ? `- ${o.text} — introduced_by: ${o.introduced_by}; discharged_by: ${o.discharged_by}`
      : `- ${o.text} — introduced_by: ${o.introduced_by}; conceded_by: ${o.conceded_by}`);
  }
  if (oblL.length === 0) oblL.push("*(no obligations entered by the composer — an empty ledger is a statement, not an omission)*");
  // THE THESIS ROW, at the same slot and the same write, because both levels
  // of Closure fill from the same act — the adopted Candidate — and a Brief
  // slot filled twice is refused by `replaceSlot`. `thesisClosure` is optional
  // so a caller exercising the fill's plumbing alone (the check) is not made
  // to invent a Thesis; production has exactly one caller, `adoptCandidate`,
  // which always carries it.
  const thesisLine = thesisClosure
    ? `${thesisClosure.explanation} — established_by_legs: ${(thesisClosure.established_by_legs || []).join(", ")}`
    : "*(awaiting adoption)*";
  const closureL = [
    "An obligation is a promise the prose makes to the reader that a later "
    + "passage must keep: a question raised, an analogy introduced, a "
    + "limitation conceded.",
    "",
    "### Thesis",
    "",
    thesisLine,
    "",
    "### Legs",
    "",
    ...oblL,
  ];
  r = replaceSlot(out, "Closure", closureL.join("\n"));
  if (r.error) return r;
  return { doc: r.doc, placed: placed.length, total: strandIds.length };
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
