// compose/render — rendering the Leg record, the Move ids and the Move
// contract reader
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg's shape;
//       the Leg-Move instantiation contract; the judgment rule;
//       the Move library; the constraints that survive
//
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseYaml } from "../yaml.mjs";

// ---- rendering (SQ1: fenced blocks; this function IS the recorded
// serialization, exercised by the check's fixture) ----
// THE LEG↔MOVE INSTANTIATION CONTRACT (kogaki#747; owner rulings
// 2026-09-01). A Leg INSTANTIATES a Move: its reader_state_after is the
// instance form of the Move's `after`; its derived before-state (kogaki#1325)
// instantiates nothing. MECHANICAL — does the id resolve? Refused here.
// JUDGED — does the Leg fit the Move's contract (src/specialization-
// schema.json)? An LLM judgment in a typed record this file VALIDATES AND
// NEVER COMPOSES — never a lint (the judgment rule clause 3, and
// the constraints that survive).

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
  const retired = [];
  for (const n of names) {
    if (n.endsWith(MOVE_RECORD_EXT)) { ids.add(n.slice(0, -MOVE_RECORD_EXT.length)); continue; }
    if (!n.endsWith(".md") || n === "INDEX.md") continue; // INDEX is the regenerated view, never a record
    retired.push(n);
  }
  // A `.md` MOVE IS REFUSED BY NAME, NEVER SKIPPED (kogaki#1413). Skipping it
  // would turn a Leg bound to it into "resolves to no record", a true refusal
  // for a false reason, and reading it would need the hand-written scalar
  // parser this record format retired.
  if (retired.length) return { error: retiredMoveFormRefusal(movesDir, retired.sort()) };
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
        + `(${movesDir}/${id}${MOVE_RECORD_EXT} does not exist) — a Leg INSTANTIATES a Move, so a Move that is not there `
        + `leaves the Leg with no reader-state transition type to be the instance of (the Leg-Move instantiation contract). `
        + `Bind an admitted Move, or admit this one to the library first — the library grows by an `
        + `admission act, never by a Brief naming an id (the Move library)` };
    }
  }
  return { ok: true, checked: legs.length, store_size: store.ids.size };
}

// ---------------------------------------------------------------------------
// THE MOVE CONTRACT READER (kogaki#1125). It RENDERS a Move's `before` and
// `after` into a judge's input and returns them verbatim; it compares
// nothing and no validator consults it. The specialization judgment stays
// with the judge inside each compose job unit (kogaki#1307). It closes
// kogaki#1125: `compose_path` invented Move ids and the judge was asked
// about Move records it was never handed. THE REMEDY IS GENERATIONAL: the
// composer is handed the admitted set, so a dangling id is not composable.
//
// consulted: coding::lesson/constrain-generation-not-post-hoc-detection@b31d159e45b64065d0deb0944d975ac9a472c1f8c22c872784c66325740e9fe9

// THE MOVE RECORD IS A `.yaml` FILE, READ BY THE BRIEF'S YAML READER (kogaki#1413).
// `before` and `after` are maps keyed by dimension, one sentence per changed
// dimension, and the hand-written scalar parser that read the `.md` form could
// not read a map, so it is gone rather than widened: one reader, `parseYaml`,
// reads the Brief and the Move. Two retired forms are refused by name rather
// than read -- a `<id>.md` record, and a state written as one joined line.
export const MOVE_RECORD_EXT = ".yaml";
// The five reader dimensions, in passages/FORMAT.md's order.
export const MOVE_STATE_DIMENSIONS = ["knowledge", "question", "expectation", "orientation", "trust"];

export function isPlainMap(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }

function retiredMoveFormRefusal(movesDir, files) {
  return `the Move library at ${movesDir} holds ${files.length} Move record(s) in the retired \`.md\` form (${files.join(", ")}) — `
    + `a Move record is a \`.yaml\` file read by the Brief's YAML reader, carrying \`before\` and \`after\` as maps keyed by `
    + `dimension (kogaki#1413), and a \`.md\` Move is refused by name rather than read. Regenerate the record from its Extraction `
    + `(kogaki#1415 regenerates the committed Leg Moves)`;
}

// A state, `before` or `after`: a non-empty map whose keys are reader dimensions
// and whose values are one-line sentences. Returns a refusal sentence or null.
export function moveStateRefusal(value, field, at) {
  if (typeof value === "string") {
    return `${at}: \`${field}\` is one joined line, not a map keyed by dimension — a Move's state is one \`<dimension>: <sentence>\` `
      + `entry per changed dimension (kogaki#1413), and a joined-line state is refused by name rather than split`;
  }
  if (!isPlainMap(value) || !Object.keys(value).length) {
    return `${at}: \`${field}\` is not a map keyed by dimension — one entry per changed dimension, over ${MOVE_STATE_DIMENSIONS.join(", ")} (kogaki#1413)`;
  }
  for (const [k, v] of Object.entries(value)) {
    if (!MOVE_STATE_DIMENSIONS.includes(k)) {
      return `${at}: \`${field}\` carries \`${k}\`, which is not a reader dimension — the dimensions are ${MOVE_STATE_DIMENSIONS.join(", ")}`;
    }
    if (typeof v !== "string" || v.trim() === "" || /[\r\n]/.test(v)) {
      return `${at}: \`${field}.${k}\` is not one non-empty sentence on one line`;
    }
  }
  return null;
}

// A state map rendered for a prompt: one `<dimension>: <sentence>` line per
// entry, in the dimensions' order -- the shape the binding contract and the
// ParagraphPlan judge read (kogaki#1413).
export function moveStateLines(state) {
  return MOVE_STATE_DIMENSIONS.filter((d) => Object.prototype.hasOwnProperty.call(state, d))
    .map((d) => `${d}: ${String(state[d]).trim()}`).join("\n");
}

// One Move record, parsed. Returns `{ record, path }` or `{ error }`: a `.md`
// record refused by name, an unreadable or malformed file, a record that is
// not a map, or one whose `id` is not its file's stem.
export function readMoveRecord(moveId, movesDir = "moves") {
  const path = join(movesDir, `${moveId}${MOVE_RECORD_EXT}`);
  const retiredPath = join(movesDir, `${moveId}.md`);
  if (!existsSync(path) && existsSync(retiredPath)) {
    return { error: `move "${moveId}" is a \`.md\` record (${retiredPath}) — ` + retiredMoveFormRefusal(movesDir, [`${moveId}.md`]) };
  }
  let text;
  try { text = readFileSync(path, "utf8"); }
  catch (e) {
    return { error: `move "${moveId}" cannot be read from ${movesDir} (${e.message})` };
  }
  let record;
  try { record = parseYaml(text, path); }
  catch (e) { return { error: `move "${moveId}" is not a readable YAML record (${e.message})` }; }
  if (!isPlainMap(record)) return { error: `move "${moveId}" (${path}) is not a map of fields` };
  if (record.id !== moveId) {
    return { error: `move "${moveId}" (${path}) carries id ${JSON.stringify(record.id ?? null)} — a Move's id is its file's stem` };
  }
  return { record, path };
}

// THE QUESTION-CHAIN JUDGE INPUT IS RETIRED (kogaki#1325). `questionChainPairs`
// stood here: one entry per adjacent Leg pair, Leg N's `reader_state_after`
// question line beside Leg N+1's `reader_state_before` question line, for
// `review_path` to judge whether the two named the same question
// (kogaki#1283, narrowed to the Leg lines by kogaki#1324). With the
// before-state derived from the previous after-state, the two lines are one
// line, and a judgment over a line and itself buys nothing. The Move's `after`
// question against the state is the Move-fit judge's after-state comparison.

// THE DISCHARGE JUDGE INPUT (kogaki#1283, kogaki#1529, kogaki#1612). One entry per Obligation
// record and Leg that closes any of its items -- the items closed there, joined in order
// (kogaki#1568), against that Leg's Waypoint points and claim lines (each claim's
// `proposition`), for `review_path` to judge whether the Leg explains every item it closes.
// Closing is planning, never prose: what closes an item is the closing Leg's Waypoints, so the
// judge is handed those and no sentence.
export function dischargeRows(legs, obligations = []) {
  const byId = new Map(legs.map((l) => [l.leg_id, l]));
  const rows = [];
  for (const o of Array.isArray(obligations) ? obligations : []) {
    if (!o || !Array.isArray(o.items)) continue;
    const closers = [...new Set(o.items.map((e) => e && e.closed_by).filter((id) => typeof id === "string"))];
    for (const id of closers) {
      const item = o.items.filter((e) => e.closed_by === id).map((e) => e.item.trim());
      const leg = byId.get(id);
      rows.push({
        row: item.join(", "),
        item,
        opened_by: o.opened_by,
        closed_by: id,
        closing_leg: {
          leg_id: id,
          points: leg && Array.isArray(leg.waypoints) ? leg.waypoints.map((w) => w.point) : [],
          claims: leg && Array.isArray(leg.claims) ? leg.claims.map((cl) => cl.proposition) : [],
        },
      });
    }
  }
  return rows;
}
