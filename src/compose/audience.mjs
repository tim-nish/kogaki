// compose/audience — the audience record, the Persona and the language
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   none: this file names no spec content beyond its Issue pointers
//
import { readFileSync } from "node:fs";
import { parseYaml } from "../yaml.mjs";
import { isPlainMap, loadMoveIds, resolveMoveIds } from "./render.mjs";
import { moveContract } from "./moves.mjs";

// THE AUDIENCE FILE (kogaki#1370, owner decision 2026-10-13): one
// owner-authored file under `audiences/` holding two keys -- `persona`, who
// is read to, and `register`, how they are addressed. It is read by the same
// YAML reader as the Brief and the Move (kogaki#1413). Returns the parsed map,
// or `{ error }`.
export function audienceRecord(path) {
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) { return { error: `the Audience file ${path} cannot be read (${e.message})` }; }
  let record;
  try { record = parseYaml(text, path); }
  catch (e) { return { error: `the Audience file ${path} is not a readable YAML record (${e.message})` }; }
  if (!isPlainMap(record)) return { error: `the Audience file ${path} is not a map of keys` };
  return { record };
}

// One scalar of an Audience map, trimmed; null where absent or empty.
function audienceScalar(map, key) {
  const v = isPlainMap(map) ? map[key] : undefined;
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

// THE PERSONA, the Audience file's `persona` key (kogaki#1216; under the
// Audience since kogaki#1370). `reader` — who they are by what they do and
// in which genre they read, with no purpose clause (kogaki#1225) — and
// `prior_knowledge` — what can be used without explanation. Attitude, trust
// and the reader's question are Reader start dimensions, not Persona fields.
// Read by the shared YAML reader (kogaki#1413); a missing field is a store
// fault named by field. An INPUT to Reader start, never copied into the Brief.
// `reader` IS REQUIRED; `prior_knowledge` IS NOT (kogaki#1281, owner decision
// 2026-10-06): `personaPriorKnowledgeLine` turns its absence into a stated
// absence rather than a refusal.
export const READER_PERSONA_FIELDS = ["reader"];
export const READER_PERSONA_OPTIONAL_FIELDS = ["prior_knowledge"];
export function readerPersona(path) {
  const a = audienceRecord(path);
  if (a.error) {
    return { error: `${a.error} — the Brief workflow table names it, and `
      + "Reader start is authored from its `persona` and the Thesis (kogaki#1216)" };
  }
  const out = { id: audienceScalar(a.record, "id") };
  const persona = a.record.persona;
  const missing = [];
  for (const f of READER_PERSONA_FIELDS) {
    const v = audienceScalar(persona, f);
    if (v === null) missing.push(`persona.${f}`);
    else out[f] = v;
  }
  for (const f of READER_PERSONA_OPTIONAL_FIELDS) {
    out[f] = audienceScalar(persona, f); // null is a stated absence, read by personaPriorKnowledgeLine
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
  const a = audienceRecord(path);
  if (a.error) {
    return { error: `${a.error} — the Packet's register is its \`register\` key (kogaki#1261, kogaki#1370)` };
  }
  const register = audienceScalar(a.record, "register");
  if (register === null) {
    return { error: `the Audience file ${path} declares no \`register\` — the Packet's Write block renders the Audience's register from it (kogaki#1261, kogaki#1370). `
      + "Repair the Audience file under its own issue." };
  }
  return { register };
}

// THE AUDIENCE'S `language` (kogaki#1417): the one language the article is
// written in, declared once on the Audience so that no stage infers it from
// the terms an earlier stage happened to write. Its readers are the two Brief
// composers, which are told it in their input, and the Packet, which renders
// it as one line of the Write block. A missing key refuses by name: a composer
// handed no language answers in whichever one its input leans toward.
export function audienceLanguage(path) {
  const a = audienceRecord(path);
  if (a.error) {
    return { error: `${a.error} — the article's language is its \`language\` key (kogaki#1417)` };
  }
  const language = audienceScalar(a.record, "language");
  if (language === null || /\n/.test(language)) {
    return { error: `the Audience file ${path} declares no one-line \`language\` — the Brief composers write in it and the Packet's Write block renders it (kogaki#1417). `
      + "Repair the Audience file under its own issue." };
  }
  return { language };
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
    // THE LEG'S WAYPOINTS RIDE BESIDE THE MOVE'S `segments` AND `breaks`
    // (kogaki#1311, kogaki#1320): the fit judgment judges the waypoints
    // against those two, so the input sets them side by side rather than
    // leaving the judge to find them in the Leg array. `segments` is the
    // Move's whole structure and is never null here (kogaki#1412).
    out.push({ leg_id: s.leg_id, move: s.move, before: c.before, after: c.after, segments: c.segments, breaks: c.breaks,
      waypoints: s.waypoints });
  }
  return { contracts: out };
}
