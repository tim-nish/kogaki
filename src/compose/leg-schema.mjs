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
import { opensSectionRefusal, readerTargetLegRefusal, sectionGroupingRefusal } from "./sections.mjs";

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
    process.stderr.write(
      `compose: Brief snapshot ${stage}/${phase} skipped ` +
        `(${e && e.message ? e.message : e}) — the trace never blocks the write it traces (kogaki#523)\n`,
    );
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
    throw new Error(
      `src/leg-schema.json carries no \`path_rules.${key}\` with a name and a rule, and ` +
        "src/compose.mjs raises a refusal under that key. The schema is rendered into the composition " +
        "prompt and the refusals read their text back from it, so a rule enforced here and absent there " +
        "is a rule the composing party is never shown (kogaki#1147).",
    );
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

// ---- `journeys`, a key the schema no longer declares (kogaki#1768, kogaki#1818) ----
//
// src/leg-schema.json carries no `journey` since kogaki#1768, so an answer carrying `journeys`
// is refused naming the key rather than read against the schema.
export function journeysRefusal(journeys, materials, at) {
  if (journeys === undefined) return null;
  return `${at} carries \`journeys\`, a key src/leg-schema.json no longer declares (kogaki#1768, kogaki#1818): a Leg draws on no Journey`;
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
// `waypoints` are the points the Leg's paragraphs make, composed from the Strands'
// RelationalStructure (kogaki#1768). SHAPE ONLY: whether a point is grounded in the
// relations it carries is the GROUNDED judgment's, the count the composer's. `claimStrands` is the Strand ids the Leg's claims
// name. `ordinals` numbers a filtered list as its reader does (kogaki#1448);
// `claimText` maps Strand ids to propositions and turns on the read-alone
// rule and the method-verb rule, for Brief Waypoints at composition only
// (kogaki#1449, kogaki#1554). `paragraph` marks a Waypoint list, which
// carries no `case` (kogaki#1732). PURE, re-run by `src/draft.mjs` over a parsed Brief.
export function waypointsRefusal(
  waypoints,
  claimStrands,
  at,
  ordinals = null,
  claimText = null,
  { paragraph = false } = {},
) {
  const def =
    "a waypoint is a point its paragraph makes, carrying a `point` " +
    "(the proposition the paragraph makes, in the article's subject, one sentence — never an effect on " +
    "the reader)" +
    (paragraph ? " and " : ", ") +
    "`serves` (the claims it serves, by the Strand id each names)" +
    (paragraph ? "" : " and `case` (`own` or `apart`: whose case the paragraph tells, kogaki#1732)") +
    " — src/leg-schema.json, `waypoint` (kogaki#1326)";
  if (!Array.isArray(waypoints) || waypoints.length === 0) {
    return (
      `${at}: carries no waypoints — every Leg carries an ordered, non-empty \`waypoints\` list, the points ` +
      `its paragraphs make, in order (kogaki#1311, kogaki#1768). ${def}`
    );
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
      return (
        `${at}: ${nth} carries \`effect\`, which is retired — a waypoint states the point its ` +
        `paragraph makes, not an effect on the reader (kogaki#1326). ${def}`
      );
    }
    // THE BOUND PARAGRAPH MOVE IS RETIRED FROM THE WAYPOINT BY NAME (kogaki#1375, owner
    // decision 2026-10-14): Move information is used up to Waypoint generation
    // and nowhere after it, so a Brief Waypoint carries `point`, `serves` and `case` only. The
    // ParagraphPlan stage binds a paragraph Move per Brief Waypoint and keeps which one in
    // its own run directory; a Brief whose waypoint still carries either field is refused
    // here, at every read, the way `effect` is.
    for (const k of RETIRED_WAYPOINT_MOVE_FIELDS) {
      if (Object.hasOwn(w, k)) {
        return (
          `${at}: ${nth} carries \`${k}\`, which is retired — a Brief Waypoint carries \`point\`, \`serves\` ` +
          `and \`case\` (and \`carries\` where the Brief carries a \`structure\`) only, and no Move information reaches the Brief: the paragraph Move is bound by /paragraph-plan, ` +
          `after the Brief, and stays in that stage's run directory (kogaki#1375). ${def}`
        );
      }
    }
    // THE JOIN IS A PARAGRAPHPLAN OUTPUT, NEVER A BRIEF FIELD (kogaki#1411): it is written by
    // /paragraph-plan into its own file beside the Brief, so a Brief whose waypoint carries
    // one is refused here, at every read, the way `move` and `segments` are.
    if (Object.hasOwn(w, "join")) {
      return (
        `${at}: ${nth} carries \`join\` — a join is written by /paragraph-plan into the ParagraphPlan file, ` +
        `beside the Brief, and never on a Brief's Brief Waypoint: the relations layer between Brief Waypoints is ` +
        `retired (kogaki#1215, kogaki#1411). ${def}`
      );
    }
    if (typeof w.point !== "string" || w.point.trim() === "") {
      return `${at}: ${nth} has an empty point — ${def}`;
    }
    // A BRIEF WAYPOINT RECORDS WHOSE CASE ITS PARAGRAPH TELLS (kogaki#1732, owner ruling 2026-11-07).
    if (!paragraph && !WAYPOINT_CASES.includes(w.case)) {
      return `${at}: ${nth} carries ${Object.hasOwn(w, "case") ? `case ${JSON.stringify(w.case)}` : "no `case`"} — ${CASE_DEF}`;
    }
    if (
      !Array.isArray(w.serves) ||
      w.serves.length === 0 ||
      w.serves.some((x) => typeof x !== "string" || x.trim() === "")
    ) {
      return (
        `${at}: ${nth} has an empty serves — every waypoint serves at least one claim of this Leg, ` +
        `named by its Strand id. ${def}`
      );
    }
    for (const x of w.serves) {
      if (!strands.has(x)) {
        return (
          `${at}: ${nth} serves ${JSON.stringify(x)}, and this Leg carries no claim for that Strand ` +
          `(its claims name ${[...strands].join(", ") || "none"}) — a waypoint serves a claim of its own Leg`
        );
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
  if (!paragraph && waypoints[waypoints.length - 1].case === "apart") {
    return (
      `${at}: waypoint ${ordinals ? ordinals[waypoints.length - 1] : waypoints.length} is \`apart\` and ends the Leg — ` +
      `the Brief Waypoint after an \`apart\` one carries its structure onto the subject, so a case apart is never ` +
      `the last of its Leg (kogaki#1732)`
    );
  }
  const unserved = [...strands].filter((x) => !served.has(x));
  if (unserved.length) {
    return (
      `${at}: its claim for ${unserved.map((x) => JSON.stringify(x)).join(", ")} is served by no waypoint ` +
      `— every claim of a Leg is served by at least one of its waypoints, or the route the prose follows ` +
      `never reaches it (kogaki#1311)`
    );
  }
  return null;
}

// A BRIEF WAYPOINT'S POINT IS READ ALONE (kogaki#1449, owner decision 2026-10-19): the
// ParagraphPlan stage reads each Brief Waypoint by itself, and a context-dependent expression
// in it is relied on as a fact. This is the mechanical half of the rule the `reader_path_unit`
// row states: a point opening with a demonstrative or "it", or carrying "this <noun>" or
// "these <noun>" whose noun is in no Claim the waypoint serves, is refused naming the word.
// The rest of the rule — a bare definite noun, a term outside the Claim's material — is the
// composer's to keep, stated in the row and never linted here.
export const READ_ALONE_OPENERS = ["this", "that", "these", "those", "it"];
function readAloneRefusal(point, claims) {
  const ground =
    "a Brief Waypoint is read alone by the ParagraphPlan stage, so its point names what it " +
    "refers to in full and reaches to no other Brief Waypoint (kogaki#1449)";
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
export const METHOD_VERBS = [
  "explain",
  "ground",
  "justify",
  "support",
  "illustrate",
  "reinterpret",
  "restate",
  "reread",
];
const METHOD_VERB_FORMS = METHOD_VERBS.map((v) => [
  v,
  v.endsWith("y")
    ? new RegExp(`^${v.slice(0, -1)}(?:y|ies|ied|ying)$`)
    : v.endsWith("e")
      ? new RegExp(`^${v.slice(0, -1)}(?:e|es|ed|ing)$`)
      : new RegExp(`^${v}(?:s|ed|ing)?$`),
]);
export function methodWordRefusal(text, at) {
  for (const word of text.match(/[A-Za-z]+/g) || []) {
    const hit = METHOD_VERB_FORMS.find(([, re]) => re.test(word.toLowerCase()));
    if (hit) {
      return (
        `${at} ${JSON.stringify(word)}, a form of the method verb ${JSON.stringify(hit[0])}, which names how ` +
        `a paragraph treats its matter rather than what it says (kogaki#1554)`
      );
    }
  }
  return null;
}

// THE TWO VALUES OF A BRIEF WAYPOINT'S `case` (kogaki#1732), and the sentence a refusal names
// them in; the meaning is src/leg-schema.json's, `waypoint.fields.case`.
export const WAYPOINT_CASES = ["own", "apart"];
const CASE_DEF =
  "every Brief Waypoint carries `case`, `own` (its paragraph tells the proposition's own case, in the " +
  "subject's domain) or `apart` (its paragraph tells a case apart from the proposition's domain, in material the " +
  "reader already holds) — src/leg-schema.json, `waypoint` (kogaki#1732)";

// THE TWO WAYPOINT FIELDS #1359 ADDED AND #1375 RETIRED, refused by name in
// `waypointsRefusal` above. Exported for the checks that build the refused case.
export const RETIRED_WAYPOINT_MOVE_FIELDS = ["move", "segments"];

// THE FIVE DIMENSIONS A PARAGRAPH'S READER STATE IS WRITTEN IN. The Leg's reader states are
// retired (kogaki#1699); the ParagraphPlan's paragraph `reader_state_after` keeps this shape
// until the ParagraphPlan's Issue, and these three names are its readers'.
export const READER_STATE_DIMENSIONS = ["knowledge", "question", "expectation", "orientation", "trust"];

// One `dimension: value` line per dimension, drawn from READER_STATE_DIMENSIONS; only a line's
// LEADING token is checked. Returns an error string or null; presence is another check's.
export function readerStateShapeRefusal(value, at, fieldName) {
  if (typeof value !== "string" || value === "") return null;
  for (const line of value.split("\n")) {
    if (line === "") continue;
    const m = /^([a-z]+):\s*\S/.exec(line);
    if (!m || !READER_STATE_DIMENSIONS.includes(m[1])) {
      return (
        `${at}: ${fieldName} is not written as \`dimension: value\` lines over the dimension set ` +
        `(${READER_STATE_DIMENSIONS.join(", ")}). Received: ${JSON.stringify(value)}`
      );
    }
  }
  return null;
}

// ONE DIMENSION'S LINE, read off a line-per-dimension reader state, or null where no line carries it.
export function readerStateDimensionLine(value, dim) {
  if (typeof value !== "string") return null;
  for (const line of value.split("\n")) {
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (m && m[1] === dim) return m[2].trim();
  }
  return null;
}

// The Leg fields retired with the reader states (kogaki#1699).
export const RETIRED_LEG_STATE_FIELDS = Object.freeze(["reader_state_after", "reader_state_before"]);

// THE LEG FIELDS RETIRED WITH THE LEG MOVE (kogaki#1768, owner decision 2026-11-10): a Leg binds no Move, so every
// field written for a Leg Move's binding, and every field whose composer was the Leg Move, is refused by name.
export const RETIRED_LEG_MOVE_FIELDS = Object.freeze([
  "move",
  "no_move_fits",
  "materials",
  "purpose",
  "rationale",
  "depends_on",
  "re-activate",
  "introduces",
  "journeys",
  "entailed",
  "entailment_reasoning",
  "bridges",
  "names",
  "budget",
  "figure",
  "figure_roles",
]);
const RETIRED_LEG_MOVE_REASON =
  "a Leg binds no Move (kogaki#1768): its Waypoints are composed from the Strands' " +
  "RelationalStructure and the paragraph Move is bound once, per Brief Waypoint, by /paragraph-plan";

// THE LEG OF A BRIEF THAT CARRIES A `structure` (kogaki#1775): it names in `relation` the relation or higher-order
// relation it serves and says it in `text`, and carries no `waypoints`, which only the ParagraphPlan writes. A Leg of a
// Brief that carries none is refused carrying `relation`, `text` or a waypoint's `carries`. Returns an error string or null.
function legStructureRefusal(s, at, structure) {
  if (!structure) {
    for (const f of ["relation", "text"]) {
      if (Object.hasOwn(s, f))
        return `${at}: carries \`${f}\`, and the Brief carries no \`structure\` for it to name — a Leg names its relation only in a Brief /brief composed from a structure (kogaki#1775)`;
    }
    const w = (Array.isArray(s.waypoints) ? s.waypoints : []).findIndex(
      (x) => x && typeof x === "object" && Object.hasOwn(x, "carries"),
    );
    if (w >= 0)
      return `${at}: waypoint ${w + 1} carries \`carries\`, and the Brief carries no \`structure\` for it to name (kogaki#1775)`;
    return null;
  }
  if (Object.hasOwn(s, "waypoints")) {
    return `${at}: carries \`waypoints\` — the Brief ends at Legs: a Leg of a Brief that carries a \`structure\` carries no Waypoint, and only the ParagraphPlan writes them (kogaki#1775). Remove the field.`;
  }
  const ids = new Set([
    ...(structure.relations || []).map((r) => r.id),
    ...(structure.higher_order || []).map((h) => h.id),
  ]);
  if (typeof s.relation !== "string" || !ids.has(s.relation)) {
    return `${at}: ${Object.hasOwn(s, "relation") ? `its \`relation\` ${JSON.stringify(s.relation)} names no relation or higher-order relation of the Brief's \`structure\`` : "carries no `relation`"} — each Leg names the relation it serves (kogaki#1775)`;
  }
  if (typeof s.text !== "string" || s.text.trim() === "") {
    return `${at}: carries no \`text\` — a Leg says its relation's \`holds\`, its Roles named (kogaki#1775)`;
  }
  return null;
}

// A RECORDED READER PATH AS ITS READERS AFTER ADOPTION READ IT (kogaki#1768): `/paragraph-plan` and `draft.mjs resolve`
// read a Leg's `relation` and its waypoints' `carries` against a `structure` that is present. Their reading of the Leg
// that carries no waypoints is kogaki#1777's. Returns an error string or null.
function structureRefusal(s, at, structure) {
  const ids = structure
    ? new Set([...(structure.relations || []).map((r) => r.id), ...(structure.higher_order || []).map((h) => h.id)])
    : null;
  if (!structure) {
    if (Object.hasOwn(s, "relation"))
      return `${at}: carries \`relation\`, and the Brief carries no \`structure\` for it to name — a Leg names its relation only in a Brief /brief composed from a structure (kogaki#1768)`;
  } else if (typeof s.relation !== "string" || !ids.has(s.relation)) {
    return `${at}: ${Object.hasOwn(s, "relation") ? `its \`relation\` ${JSON.stringify(s.relation)} names no relation or higher-order relation of the Brief's \`structure\`` : "carries no `relation`"} — each Leg names the relation it serves (kogaki#1768)`;
  }
  for (const [i, w] of (Array.isArray(s.waypoints) ? s.waypoints : []).entries()) {
    const nth = `waypoint ${i + 1}`;
    if (!w || typeof w !== "object") continue;
    if (!structure) {
      if (Object.hasOwn(w, "carries"))
        return `${at}: ${nth} carries \`carries\`, and the Brief carries no \`structure\` for it to name (kogaki#1768)`;
      continue;
    }
    if (!Array.isArray(w.carries) || w.carries.length === 0)
      return `${at}: ${nth} carries no \`carries\` — a waypoint of a Leg names the relation ids of the Brief's \`structure\` its point states (kogaki#1768)`;
    const stray = w.carries.find((x) => !ids.has(x));
    if (stray !== undefined)
      return `${at}: ${nth} carries ${JSON.stringify(stray)}, which is no relation's or higher-order relation's id in the Brief's \`structure\` (kogaki#1768)`;
  }
  return null;
}

// THE SAME BINDING OVER A RECORDED READER PATH (kogaki#1768): the readers after adoption
// (`/paragraph-plan`, `draft.mjs resolve`) check `carries` and `relation` only against a
// `structure` that is present. Returns the first refusal, naming the Leg, or null.
export function briefStructureRefusal(legs, structure, at = "the Brief") {
  for (const [i, s] of (Array.isArray(legs) ? legs : []).entries()) {
    if (!s || typeof s !== "object") continue;
    const bad = structureRefusal(s, `${at}, leg ${s.leg_id ?? i + 1}`, structure || null);
    if (bad) return bad;
  }
  return null;
}

// ---- shape validation (the Leg's shape — the fields, not the markup) ----
// THE FIELD SET IS THE SCHEMA'S (kogaki#1108); the refusals are this file's. `opts.structure` is the Brief's
// RelationalStructure where it carries one (kogaki#1768); a legacy array second argument names no structure.
// Returns { error } or { legs }. Pure over its argument; exported for the check.
export function validateLegs(legs, opts = {}) {
  const structure = opts && !Array.isArray(opts) && opts.structure ? opts.structure : null;
  if (!Array.isArray(legs) || legs.length === 0) {
    return { error: pathRefusal("path_is_non_empty", null, "This answer carries no Leg at all.") };
  }
  const schema = legschema();
  const seen = new Set();
  for (const [i, s] of legs.entries()) {
    const at = `leg ${i + 1}${s && s.leg_id ? ` (${s.leg_id})` : ""}`;
    if (!s || typeof s !== "object" || Array.isArray(s)) return { error: `${at}: is not a Leg record` };
    // THE READER STATES ARE RETIRED (kogaki#1699) and refused BY NAME: a dropped field never tells its composer.
    for (const f of RETIRED_LEG_STATE_FIELDS) {
      if (Object.hasOwn(s, f)) {
        return {
          error: `${at}: carries \`${f}\` — the Leg's reader states are retired (kogaki#1699). Remove the field.`,
        };
      }
    }
    if (Object.hasOwn(s, "relations")) {
      return {
        error: `${at}: \`relations\` is a retired field — the relations layer is retired (kogaki#1215). Remove the field.`,
      };
    }
    const retired = RETIRED_LEG_MOVE_FIELDS.find((f) => Object.hasOwn(s, f));
    if (retired !== undefined)
      return {
        error: `${at}: carries \`${retired}\`, which is retired — ${RETIRED_LEG_MOVE_REASON}. Remove the field.`,
      };
    for (const name of requiredLegFields()) {
      if (BESPOKE_LEG_REFUSALS.has(name)) continue;
      const decl = schema.fields[name];
      const ok = legFieldPresent(decl, s[name]);
      if (ok === null) {
        return {
          error:
            `${at}: src/leg-schema.json declares the required field ${JSON.stringify(name)} ` +
            `with type ${JSON.stringify(decl.type)}, which this validator has no presence predicate for — ` +
            "add the predicate in src/compose/leg-schema.mjs beside this refusal",
        };
      }
      if (!ok) {
        return {
          error: `${at}: ${name} is required by the Leg's shape — a Leg record without it is not a Leg record. ${decl.description}`,
        };
      }
    }
    if (seen.has(s.leg_id)) {
      return {
        error: pathRefusal(
          "leg_id_unique",
          at,
          `An earlier Leg already carries the id ${JSON.stringify(s.leg_id)} — this is a duplicate leg_id, and the repair is to rename one of the two, never to merge them.`,
        ),
      };
    }
    // the Section grouping's `opens_section` (kogaki#822) — shape only here; the grouping rules run after this loop.
    if (s.opens_section !== undefined) {
      const bad = opensSectionRefusal(s.opens_section, at);
      if (bad) return { error: bad };
    }
    if (!Array.isArray(s.claims) || s.claims.length === 0) {
      return {
        error: `${at}: claims are required — specific propositions, each one proposition derived from a Strand (the claims rule)`,
      };
    }
    {
      const types = claimTypes();
      const retiredTypes = retiredClaimTypes();
      // ONE CLAIM PER STRAND, PER LEG (kogaki#1108), keyed per Leg and reset at each one.
      const byStrand = new Map();
      for (const g of s.claims) {
        if (retiredTypes.has(g.type)) {
          return {
            error: `${at}: claim type ${JSON.stringify(g.type)} is no longer a claim — a claim is one proposition derived from a Strand, and nothing else (the claims rule). What this claim carried is ${retiredTypes.get(g.type)}`,
          };
        }
        if (!types.has(g.type)) {
          return {
            error: `${at}: claim type ${JSON.stringify(g.type)} — the claims rule's list is closed: ${[...types].join(", ")}`,
          };
        }
        if (typeof g.proposition !== "string" || g.proposition === "") {
          return {
            error: `${at}: a claim is a specific PROPOSITION, stated (the claims rule) — an untyped pointer is not a claim`,
          };
        }
        if (typeof g.strand !== "string" || g.strand === "") {
          return { error: `${at}: a strand claim names its Strand (L<n>)` };
        }
        if (schema.claim.one_per_strand === true && byStrand.has(g.strand)) {
          return {
            error: pathRefusal(
              "one_claim_per_strand",
              at,
              `Two claims here name strand ${JSON.stringify(g.strand)} (src/leg-schema.json, \`claim.one_per_strand\`): ` +
                `the first reads ${JSON.stringify(byStrand.get(g.strand))}; the second reads ${JSON.stringify(g.proposition)}.`,
            ),
          };
        }
        byStrand.set(g.strand, g.proposition);
      }
    }
    // THE LEG'S RELATION AND TEXT, OR ITS LEGACY ROUTE (kogaki#1311, kogaki#1775) — checked after the claims loop because
    // a waypoint's `serves` addresses the claims by Strand.
    {
      const bad =
        legStructureRefusal(s, at, structure) ||
        (structure
          ? null
          : waypointsRefusal(
              s.waypoints,
              s.claims.map((g) => g.strand),
              at,
              null,
              Object.fromEntries(s.claims.map((g) => [g.strand, g.proposition])),
            ));
      if (bad) return { error: bad };
    }
    seen.add(s.leg_id);
  }
  // the Section grouping's grouping rules (kogaki#822) run over the WHOLE path, after every Leg is well formed.
  // `opts.sections === false` is a reader that asks no `leg_sections` Call -- the Leg-Planning Trial -- and so
  // holds no Section grouping (kogaki#1775).
  const grouping = opts && opts.sections === false ? null : sectionGroupingRefusal(legs);
  if (grouping) return { error: grouping };
  // THE READER TARGET LEG (kogaki#1231), run last: it names a Leg by POSITION relative to every other Leg.
  const target = readerTargetLegRefusal(legs);
  if (target) return { error: target };
  return { legs };
}
