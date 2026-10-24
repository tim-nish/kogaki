// compose/moves — the Move adapter, the Move record and its contract
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Move library
//
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { figureKinds } from "./figure.mjs";
import {
  isPlainMap, moveStateLines, moveStateRefusal, readMoveRecord,
} from "./render.mjs";
import { oneLine } from "./record.mjs";

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
// `technique` is not among them (kogaki#1412): `segments` is the Move's whole
// structure, so the Adapter exposes it and never a prose restatement of it.
// `obligation` is absent by default (kogaki#1557): a record without it carries
// no key at all on the contract, rather than a null.
const OPTIONAL_ROLE_OUTPUT_KEYS = [["tests", "breaks"], ["segments", "segments"], ["obligation", "obligation"]];

export function moveContract(moveId, movesDir = "moves") {
  const read = readMoveRecord(moveId, movesDir);
  if (read.error) return { error: read.error };
  return moveRecordContract(read.record, moveId, read.path, movesDir);
}

// THE ONE VALIDATOR OF A MOVE RECORD (kogaki#1418). `moveContract` reads a
// saved record and hands it here; the ingest (`tools/move_ingest.py`) hands
// each candidate here through `src/move-validate.mjs` before its screen and
// before its write. Two validators of one contract that cannot see each
// other drift (kogaki#1416 was one such drift), so the ingest carries no
// type check of its own and relays this function's refusal word for word.
// A candidate has no file yet, so its `path` names where it came from.
export function validateMoveRecord(record, movesDir = "moves", path = "candidate") {
  if (!isPlainMap(record)) return { error: `the Move record (${path}) is not a map of fields` };
  const id = record.id;
  if (typeof id !== "string" || id.trim() === "") {
    return { error: `the Move record (${path}) carries no \`id\` — a Move's id names its file` };
  }
  return moveRecordContract(record, id, path, movesDir);
}

// THE RETIRED MOVE FIELDS, each refused BY NAME rather than carried
// (kogaki#1412, kogaki#1247, kogaki#1280, kogaki#1324). A field
// `moves/ROLES.json` names nowhere is otherwise carried and read by nothing;
// these five were once read, so a record still carrying one is a record
// written against a retired schema, refused rather than silently carried.
export const RETIRED_MOVE_FIELDS = {
  technique: "a Move's structure is its `segments` and its summary for a person is `description` (kogaki#1412)",
  order: "the Segments' own order is the Move's order (kogaki#1247)",
  presupposes: "no reader reads what a Move presupposes (kogaki#1247)",
  draws_on: "no composer, judge or Packet reads it (kogaki#1280)",
  question: "the Move's `after` carries its question (kogaki#1324)",
};

// THE FIELDS A MOVE MAY CARRY BESIDE THE ONES `moves/ROLES.json` MAPS
// (kogaki#1418): `description`, human-facing (kogaki#1412), and `evidence`,
// read by nothing. An Extraction is untrusted input, so any other field is
// refused by name rather than carried into the library: a record names only
// what some reader, or the person reading the library, has a use for.
export const MOVE_CARRIED_FIELDS = ["description", "evidence"];

// `description` is human-facing and maps no role (kogaki#1412): no prompt
// renders it, and nothing reads it beyond its presence and this bound, which
// `src/proof-sheet/extract.mjs`'s `DESCRIPTION_MAX` asks the Extractor to keep.
export const MOVE_DESCRIPTION_MAX = 200;

function moveRecordContract(record, moveId, path, movesDir) {
  const rolesResult = moveRoles(movesDir);
  if (rolesResult.error) return rolesResult;
  const { required, optional } = rolesResult.roles;
  const out = { id: moveId };
  const missing = [];
  const at = `move "${moveId}" (${path})`;
  for (const [role, outKey] of REQUIRED_ROLE_OUTPUT_KEYS) {
    const field = required[role];
    if (typeof field !== "string" || field === "") {
      return { error: `${movesDir}/ROLES.json names no field for the required role "${role}" — every schema maps `
        + `identity, state-before and state-after (specs/spec-draft-pipeline/SPEC.md field-roles table)` };
    }
    const v = record[field];
    if (v === undefined || v === null) { missing.push(field); continue; }
    // A STATE IS A MAP KEYED BY DIMENSION (kogaki#1413), rendered here one
    // line per dimension: that is the text the binding contract and the judge
    // read, so the map's shape is checked at the one place it is rendered.
    const bad = moveStateRefusal(v, field, at);
    if (bad) return { error: bad };
    out[outKey] = moveStateLines(v);
  }
  if (missing.length) {
    // A STORE FAULT, NAMED AS ONE. A Move whose contract is half-written
    // cannot be judged against, and reporting it as a composition problem
    // would send the reader to the Brief rather than to the library.
    return { error: `move "${moveId}" declares no ${missing.join(" and no ")} (${path}) — `
      + `the composer reads a Move by its required roles' fields and the specialization judgment compares each Leg against them (kogaki#1276), `
      + `so a record missing one leaves both with nothing to read. Repair the Move record under its own issue.` };
  }
  for (const [role, outKey] of OPTIONAL_ROLE_OUTPUT_KEYS) {
    const field = optional[role];
    if (typeof field !== "string" || field === "") {
      out[outKey] = null; // the declaration leaves this role unmapped
      continue;
    }
    const v = record[field];
    const absent = v === undefined || v === null || (typeof v === "string" && v.trim() === "")
      || (Array.isArray(v) && !v.length);
    if (absent && role === "segments") {
      // `segments` IS REQUIRED WHERE MAPPED (kogaki#1412, owner decision
      // 2026-10-17): a Move without its Segments is refused by name at every
      // read, never repaired -- no Segment is derived for an old Move, and
      // nothing falls back to a prose restatement of the structure.
      return { error: `move "${moveId}" carries no ${field} (${path}) — a Move's \`${field}\` is its ordered structure, `
        + `which the composer, the Move-fit judgment and the ParagraphPlan stage each read, and a Move without it is refused, `
        + `not repaired (kogaki#1412). Regenerate the Move from its Extraction under its own issue.` };
    }
    if (absent && role === "tests") {
      // Mapped AND absent from the record is a half-written contract, same
      // as a missing required field — the declaration says this library's
      // Moves carry the role, so a record that does not is the fault.
      return { error: `move "${moveId}" declares no ${field} (${path}) — `
        + `the composer reads a Move by its required roles' fields and the specialization judgment compares each Leg against them (kogaki#1276), `
        + `so a record missing one leaves both with nothing to read. Repair the Move record under its own issue.` };
    }
    if (absent && role === "obligation") continue;
    const bad = role === "obligation" ? obligationRefusal(v, record[required["state-after"]], field, at)
      : optionalRoleRefusal(role, field, v, at);
    if (bad) return { error: bad };
    out[outKey] = v;
  }
  const retired = Object.keys(record).filter((k) => Object.prototype.hasOwnProperty.call(RETIRED_MOVE_FIELDS, k)).sort();
  if (retired.length) {
    return { error: `${at} carries the retired ${retired.map((k) => `\`${k}\``).join(", ")} — `
      + retired.map((k) => RETIRED_MOVE_FIELDS[k]).join("; ") };
  }
  const named = new Set([...Object.values(required), ...Object.values(optional)].filter((f) => typeof f === "string" && f !== ""));
  const unnamed = Object.keys(record).filter((k) => !named.has(k) && !MOVE_CARRIED_FIELDS.includes(k)
    && !Object.prototype.hasOwnProperty.call(RETIRED_MOVE_FIELDS, k)).sort();
  if (unnamed.length) {
    return { error: `${at} carries ${unnamed.map((k) => `\`${k}\``).join(", ")}, which the library's ROLES.json maps to no role — `
      + `a Move carries the fields its declaration maps plus ${MOVE_CARRIED_FIELDS.map((k) => `\`${k}\``).join(" and ")}, and an unnamed field is refused, not carried into the library (kogaki#1418)` };
  }
  const description = descriptionRefusal(record.description, at);
  if (description) return { error: description };
  const figure = figureBlockRefusal(record.figure, at);
  if (figure) return { error: figure };
  if (out.obligation) out.deferred_slots = [obligationSlot(out.obligation)];
  return out;
}

// THE DEFERRED SLOT A MOVE RAISES (kogaki#1558, SPEC-draft-pipeline "Obligations" rule 2):
// one slot, read from the authored `obligation` field and nothing else, for the composer to
// fill as one Obligation row and the Move-fit judge to hold the Leg's rows against. A Move
// carrying no `obligation` raises none and its contract carries no key.
function obligationSlot(o) {
  const items = Array.isArray(o.item) ? o.item : [o.item];
  return { kind: o.kind, count: o.kind === "term" ? items.length : 1, line: items.map((x) => x.trim()).join(", ") };
}

// THE OBLIGATION A MOVE RAISES BY ITS STRUCTURE (kogaki#1557, owner decision 2026-10-24):
// authored, absent by default, naming no scale. `item` is one line for a `question` and a
// list of one or more terms for a `term`, in the order the Move names them. A promise the
// reader was not led to anticipate is refused: some content word of `item` -- any word but the
// grammar words below -- appears in the `after` state's question, expectation or knowledge line.
export const OBLIGATION_KINDS = Object.freeze(["question", "term"]);
const OBLIGATION_KEYS = ["kind", "item"];
const ANTICIPATING_DIMENSIONS = ["question", "expectation", "knowledge"];
const GRAMMAR_WORDS = new Set(["a", "an", "the", "and", "or", "of", "to", "in", "on", "at", "by", "for", "with", "as",
  "is", "are", "be", "was", "it", "its", "this", "that", "what", "which", "who", "how", "why", "does", "do"]);
export const contentWords = (s) => (String(s).toLowerCase().match(/[\p{L}\p{N}_]+/gu) || []).filter((w) => !GRAMMAR_WORDS.has(w));
function obligationRefusal(v, after, field, at) {
  const oneLine = (s) => typeof s === "string" && s.trim() !== "" && !/[\r\n]/.test(s);
  const kinds = OBLIGATION_KINDS.map((k) => `\`${k}\``).join(", ");
  if (!isPlainMap(v)) return `${at}: \`${field}\` is not a map of \`kind\` and \`item\` (kogaki#1557)`;
  const extra = Object.keys(v).find((k) => !OBLIGATION_KEYS.includes(k));
  if (extra) return `${at}: \`${field}\` carries \`${extra}\` — it carries \`kind\` and \`item\` only (kogaki#1557)`;
  if (!OBLIGATION_KINDS.includes(v.kind)) {
    return `${at}: \`${field}\` names kind ${JSON.stringify(v.kind ?? null)}; the closed set is ${kinds} (kogaki#1557)`;
  }
  if (v.kind === "question" && !oneLine(v.item)) {
    return `${at}: \`${field}\` of kind \`question\` carries an \`item\` that is not one non-empty line (kogaki#1557)`;
  }
  if (v.kind === "term" && (!Array.isArray(v.item) || !v.item.length || !v.item.every(oneLine))) {
    return `${at}: \`${field}\` of kind \`term\` carries an \`item\` that is not a list of one or more one-line terms (kogaki#1557)`;
  }
  const lines = isPlainMap(after) ? ANTICIPATING_DIMENSIONS.map((d) => after[d]).filter((s) => typeof s === "string") : [];
  const said = new Set(lines.flatMap(contentWords));
  const words = (Array.isArray(v.item) ? v.item : [v.item]).flatMap(contentWords);
  if (!words.some((w) => said.has(w))) {
    return `${at}: \`${field}\` names an \`item\` no word of which appears in the \`after\` question, expectation or knowledge line — `
      + `a promise the reader was not led to anticipate (kogaki#1557)`;
  }
  return null;
}

// `description`: present, one line, at most MOVE_DESCRIPTION_MAX characters
// (kogaki#1412). Nothing about its wording is read.
function descriptionRefusal(v, at) {
  if (typeof v !== "string" || v.trim() === "" || /[\r\n]/.test(v.trim())) {
    return `${at} carries no \`description\` — one or two sentences on one line, at most ${MOVE_DESCRIPTION_MAX} characters, `
      + `copied from the Extraction (kogaki#1412)`;
  }
  const n = v.trim().length;
  return n > MOVE_DESCRIPTION_MAX ? `${at}: \`description\` is ${n} characters — at most ${MOVE_DESCRIPTION_MAX} (kogaki#1412)` : null;
}

// The optional `figure` block (the Move visual form, kogaki#876): a map naming one
// `kind` from src/figure-kinds.json's closed set and mapping exactly that
// kind's roles, each to a non-empty line. It judges no wording. Absence is
// not a finding.
function figureBlockRefusal(block, at) {
  if (block === undefined || block === null) return null;
  if (!isPlainMap(block)) return `${at}: \`figure\` is not a block of \`kind:\` plus one line per role`;
  const kinds = figureKinds().kinds || {};
  const names = Object.keys(kinds).sort().map((k) => `\`${k}\``).join(", ");
  const kind = block.kind;
  if (kind === undefined || kind === null || String(kind).trim() === "") {
    return `${at}: \`figure\` names no \`kind\`; the closed set is ${names}`;
  }
  if (!Object.prototype.hasOwnProperty.call(kinds, kind)) {
    return `${at}: \`figure\` names unknown kind \`${kind}\`; the closed set is ${names}`;
  }
  const want = new Set(kinds[kind].roles || []);
  const have = new Set(Object.keys(block).filter((k) => k !== "kind"));
  const missing = [...want].filter((r) => !have.has(r)).sort();
  const extra = [...have].filter((r) => !want.has(r)).sort();
  if (missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`unmapped ${missing.map((r) => `\`${r}\``).join(", ")}`);
    if (extra.length) parts.push(`not a role of \`${kind}\`: ${extra.map((r) => `\`${r}\``).join(", ")}`);
    return `${at}: \`figure\` does not map exactly kind \`${kind}\`'s roles — ${parts.join("; ")}`;
  }
  const blank = [...want].filter((r) => block[r] === null || block[r] === undefined || String(block[r]).trim() === "").sort();
  if (blank.length) {
    return `${at}: \`figure\` maps ${blank.map((r) => `\`${r}\``).join(", ")} to nothing; a role carries one line in the Move's own vocabulary`;
  }
  return null;
}

// The shapes moves/ROLES.json's `shapes` states for the list-valued roles,
// read back at the Adapter (kogaki#1414, carried in YAML by kogaki#1413):
// `breaks` a list of one-line prose tests, `segments` a list of maps carrying
// `operation` (`does` until kogaki#1510), on every Segment after the first `relation`, and,
// where the Extraction filled one, `manner` (kogaki#1510).
export const SEGMENT_FIELDS = Object.freeze(["operation", "relation", "manner"]);
function optionalRoleRefusal(role, field, v, at) {
  const oneLine = (s) => typeof s === "string" && s.trim() !== "" && !/[\r\n]/.test(s);
  if (role === "tests") {
    if (!Array.isArray(v)) return `${at}: \`${field}\` is not a list of prose tests — one entry per test (kogaki#1414, kogaki#1413)`;
    const i = v.findIndex((x) => !oneLine(x));
    return i < 0 ? null : `${at}: \`${field}\` test ${i + 1} is not one non-empty line`;
  }
  if (role === "segments") {
    if (!Array.isArray(v)) return `${at}: \`${field}\` is not a list of Segments — one map per Segment carrying \`operation\`, \`relation\` and \`manner\` (kogaki#1414, kogaki#1413, kogaki#1510)`;
    for (const [i, s] of v.entries()) {
      const atS = `${at}: \`${field}\` Segment ${i + 1}`;
      if (!isPlainMap(s)) return `${atS} is not a map`;
      const extra = Object.keys(s).find((k) => !SEGMENT_FIELDS.includes(k));
      if (extra) return `${atS} carries \`${extra}\` — a Segment carries ${SEGMENT_FIELDS.map((k) => `\`${k}\``).join(", ")} only`;
      if (!oneLine(s.operation)) return `${atS} carries no one-line \`operation\``;
      if (s.manner !== undefined && !oneLine(s.manner)) return `${atS} carries a \`manner\` that is not one non-empty line — a Segment with no manner leaves the key out`;
      if (i === 0 && s.relation !== undefined) return `${atS} carries a \`relation\` — a Move carries no relation to what precedes it (kogaki#1411)`;
      if (i > 0 && !oneLine(s.relation)) return `${atS} carries no one-line \`relation\` to the Segment before it`;
    }
  }
  return null;
}
