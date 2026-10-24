// compose/leg-schema — the per-block Brief snapshots, the Leg schema reader, the rules
// over the whole path, the Journey, the route and the shape validation
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg's shape; the Bridge Leg;
//       the reader-knowledge ledger; the Section grouping;
//       the figure decision; the claims rule; the judgment rule;
//       the Move library; the constraints that survive
//
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { laneDir } from "../runs.mjs";
import { figureClaimRefusal, figureRefusal } from "./figure.mjs";
import {
  obligationLedgerRefusal, introducedTermInReaderStart,
  introducesRefusal, opensSectionIntroducedTermRefusal, opensSectionRefusal,
  parseIntroducesEntry, reactivateRefusal, reactivateSemanticRefusal,
  readerTargetLegRefusal, readerTargetNamesRefusal, sectionGroupingRefusal,
} from "./sections.mjs";
import { definedTermBeforeIntroductionRefusal } from "./defined-terms.mjs";

export function fail(msg) {
  process.stderr.write(`compose: ${msg}\n`);
  process.exit(1);
}

// ---- per-block Brief snapshots (kogaki#523) ----
// Machine-local debugging trace, NEVER owner state: each command that lands
// a block snapshots the FULL Brief into runs/brief/<slug>/snapshots/
// (kogaki#750) before and after its write; a diff is derivable from two
// snapshots. The two write sites are brief.mjs mint and assemble.mjs
// adopt-candidate. A snapshot failure WARNS AND CONTINUES; the returned seq
// pairs a `before` call with its `after`.
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
// `src/leg-schema.json` is read twice: rendered into the path-composition
// prompt, and read here for the field set this file validates, so the prompt
// and the refusal cannot disagree. THE FIELD SET IS READ; THE PREDICATES ARE
// NOT: a description is text for the Model and is never matched against a
// value. This reader takes the REQUIRED/OPTIONAL partition and the claim
// rules; the type-shaped assertions stay here, beside their refusal text.
let LEG_SCHEMA = null;
export function legschema() {
  if (LEG_SCHEMA) return LEG_SCHEMA;
  const p = join(dirname(fileURLToPath(import.meta.url)), "..", "leg-schema.json");
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
export function journeyUses() {
  return new Map(Object.entries(legschema().journey.uses));
}
const SLOT = "*(awaiting composition)*";

// ---- THE RULES OVER THE WHOLE PATH, READ FROM THE SCHEMA (kogaki#1147) ----
//
// `path_rules` in src/leg-schema.json carries each rule with the `name` the
// refusal says first and the `rule` as the validator checks it; every
// refusal below embeds that text verbatim and adds only which Leg, Strand
// or Section. Before this, no text a composer read stated the path rules
// and two /brief runs on 2026-09-18 died on the Section grouping's rule 4.
// A MISSING ENTRY THROWS: a silent fallback to hardcoded wording would hide
// exactly the drift this arrangement removes.
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
export function pathRefusal(key, at, specific) {
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
// A Journey is MATERIAL with an ADDRESS and a USE, and no text. What the Leg
// alone can show is checked here: the shape, the closed use set, and that
// the Journey's Strand is in this Leg's `materials`. Whether the Strand's
// served record carries Journey material needs the Brief's `strands` list
// and is checked in `fillBrief`. PURE; `src/draft.mjs` imports this rather
// than re-expressing it.
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
// `waypoints` specializes the Leg's Move `segments` at composition, so
// nothing after the Candidate opens the Move. SHAPE ONLY: fit to `segments`
// and `breaks` is the Move-fit judgment's, the count the composer's (owner
// decision 2026-10-09). `claimStrands` is the Strand ids the Leg's claims
// name. `ordinals` numbers a filtered list as its reader does (kogaki#1448);
// `claimText` maps Strand ids to propositions and turns on the read-alone
// rule and the method-verb rule, for Leg Waypoints at composition only
// (kogaki#1449, kogaki#1554). PURE, re-run by
// `src/draft.mjs` over a parsed Brief.
export function waypointsRefusal(waypoints, claimStrands, at, ordinals = null, claimText = null) {
  const def = "a waypoint is a point its paragraph makes, carrying a `point` "
    + "(the proposition the paragraph makes, in the article's subject, one sentence — never an effect on "
    + "the reader) and `serves` (the claims it serves, by the Strand id each names) — src/leg-schema.json, "
    + "`waypoint` (kogaki#1326)";
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return `${at}: carries no waypoints — every Leg carries an ordered, non-empty \`waypoints\` list, its `
      + `specialization of its Move's segments, written at composition because no stage after the Candidate `
      + `reads the Move (kogaki#1311). ${def}`;
  }
  const strands = new Set(claimStrands);
  const served = new Set();
  for (const [i, w] of waypoints.entries()) {
    const nth = `waypoint ${ordinals ? ordinals[i] : i + 1}`;
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
    // THE JOIN IS A PARAGRAPHPLAN OUTPUT, NEVER A BRIEF FIELD (kogaki#1411): it is written by
    // /paragraph-plan into its own file beside the Brief, so a Brief whose waypoint carries
    // one is refused here, at every read, the way `move` and `segments` are.
    if (Object.hasOwn(w, "join")) {
      return `${at}: ${nth} carries \`join\` — a join is written by /paragraph-plan into the ParagraphPlan file, `
        + `beside the Brief, and never on a Brief's Leg Waypoint: the relations layer between Leg Waypoints is `
        + `retired (kogaki#1215, kogaki#1411). ${def}`;
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
    if (claimText) {
      const bad = readAloneRefusal(w.point, w.serves.map((x) => claimText[x] || "").join(" "));
      if (bad) return `${at}: ${nth}'s point ${bad}`;
      const method = methodWordRefusal(w.point, `${at}: ${nth}'s point carries`);
      if (method) return method;
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

// A LEG WAYPOINT'S POINT IS READ ALONE (kogaki#1449, owner decision 2026-10-19): the
// ParagraphPlan stage reads each Leg Waypoint by itself, and a context-dependent expression
// in it is relied on as a fact. This is the mechanical half of the rule the `reader_path_unit`
// row states: a point opening with a demonstrative or "it", or carrying "this <noun>" or
// "these <noun>" whose noun is in no Claim the waypoint serves, is refused naming the word.
// The rest of the rule — a bare definite noun, a term outside the Claim's material — is the
// composer's to keep, stated in the row and never linted here.
export const READ_ALONE_OPENERS = ["this", "that", "these", "those", "it"];
function readAloneRefusal(point, claims) {
  const ground = "a Leg Waypoint is read alone by the ParagraphPlan stage, so its point names what it "
    + "refers to in full and reaches to no other Leg Waypoint (kogaki#1449)";
  const first = (point.trim().match(/^[A-Za-z]+/) || [""])[0];
  if (READ_ALONE_OPENERS.includes(first.toLowerCase())) {
    return `opens with ${JSON.stringify(first)} — ${ground}`;
  }
  const text = claims.toLowerCase();
  for (const m of point.matchAll(/\b(this|these)\s+([A-Za-z][A-Za-z'-]*)/gi)) {
    if (!text.includes(m[2].toLowerCase())) {
      return `carries ${JSON.stringify(m[0])}, and ${JSON.stringify(m[2])} is in no Claim it serves — ${ground}`;
    }
  }
  return null;
}

// A METHOD VERB NAMES HOW A PARAGRAPH TREATS ITS MATTER, NOT WHAT IT SAYS (kogaki#1554, owner
// decision 2026-10-24). The list is closed: a word is added or removed by a later Issue. A
// word matches a verb on its stem, so `explains`, `explained` and `explaining` are `explain`.
// `at` ends on the verb that places the word, such as "carries" or "opens on".
export const METHOD_VERBS = ["explain", "ground", "justify", "support", "illustrate", "reinterpret", "restate", "reread"];
const METHOD_VERB_FORMS = METHOD_VERBS.map((v) => [v, v.endsWith("y")
  ? new RegExp(`^${v.slice(0, -1)}(?:y|ies|ied|ying)$`)
  : v.endsWith("e") ? new RegExp(`^${v.slice(0, -1)}(?:e|es|ed|ing)$`) : new RegExp(`^${v}(?:s|ed|ing)?$`)]);
export function methodWordRefusal(text, at) {
  for (const word of text.match(/[A-Za-z]+/g) || []) {
    const hit = METHOD_VERB_FORMS.find(([, re]) => re.test(word.toLowerCase()));
    if (hit) {
      return `${at} ${JSON.stringify(word)}, a form of the method verb ${JSON.stringify(hit[0])}, which names how `
        + `a paragraph treats its matter rather than what it says (kogaki#1554)`;
    }
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

// `reader_start` and `reader_state_after` (and the derived
// `reader_state_before`, kogaki#1325) are a STANCE/STATE in the Move
// library's dimensions (kogaki#1176): one `dimension: value` LINE per
// dimension, drawn from READER_STATE_DIMENSIONS — the shape the composition
// prompt shows, not a Move record's YAML map (kogaki#1413). A semicolon
// inside a line is prose (kogaki#1211); only the line's LEADING token is
// checked. Returns an error string or null; presence is another check's.
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
export function validateLegs(legs, readerStart, obligations = [], definedTerms = [], slotOf = null) {
  if (!Array.isArray(legs) || legs.length === 0) {
    return { error: pathRefusal("path_is_non_empty", null, "This answer carries no Leg at all.") };
  }
  // READER START IS SHAPE-CHECKED HERE AND BOUND NOWHERE (kogaki#1216).
  // `readerStart` is OPTIONAL: a bare shape check is not asked to invent one.
  // Reader start is a cold read authored from the Persona and the Thesis
  // (src/differentiation-schema.json), never from a Move; the retired
  // `reader_start_binds_first_leg` forced it backwards from the first Move.
  // THE FIRST LEG'S BEFORE-STATE IS READER START BY CONSTRUCTION (kogaki#1325,
  // owner decision 2026-10-10): `deriveReaderStatesBefore` writes every
  // before-state, and a Leg that carries one is refused by name in the loop.
  if (typeof readerStart === "string" && readerStart !== "") {
    const shapeErr = readerStateShapeRefusal(readerStart, "reader_start", "reader_start");
    if (shapeErr) return { error: shapeErr };
  }
  const schema = legschema();
  // A TERM THE PATH INTRODUCES IS ONE THE READER DOES NOT HOLD ON ARRIVAL
  // (owner decision 2026-09-29, kogaki#1225): a Reader start line carrying a
  // term some Leg lists under `introduces:` is refused — the one deterministic
  // refusal in Reader start's content. Whole-word, case-insensitive, over the
  // term before the anchor separator. Runs before the per-Leg loop so the
  // first offending Leg is named; a malformed entry is `introducesRefusal`'s.
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
      return { error: `${at}: carries neither move nor no_move_fits — a Leg binds a Move library entry by id (the Move is the State component of a Leg), or says in one sentence what its claims need that no Move's segments provide (kogaki#1276)` };
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
    // never Journey material or Obligation rows — the shape check refuses a
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
      const bad = waypointsRefusal(s.waypoints, s.claims.map((g) => g.strand), at, null,
        Object.fromEntries(s.claims.map((g) => [g.strand, g.proposition])));
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
  // THE OBLIGATIONS (kogaki#1529, kogaki#1232 before it), run for the same
  // reason the Section grouping and the Reader target Leg do: every rule is a
  // statement about the whole ledger against the whole path, not about one
  // Leg or one row alone.
  const ledger = obligationLedgerRefusal(legs, obligations, slotOf);
  if (ledger) return { error: ledger };
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
