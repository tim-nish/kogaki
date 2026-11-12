// move-extraction-playground/leg-sheet/move-blocks — a bound Move's record, description, constraints, states and
// breaks, its source, the review block and the library line. Cut from src/move-extraction-playground/leg-sheet.mjs
// along its headed sections (kogaki#1800); the design and its rulings are stated at the entry's
// header and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { join } from "node:path";
import { parseYaml } from "../../yaml.mjs";
import { MOVE_RECORD_EXT } from "../../compose.mjs";
import { esc, read } from "./frame.mjs";

// Original paragraph n's point: its Leg's `text` in the Brief (kogaki#1784).
export function legPoint(r, n) {
  const legs = (r.briefRecord && r.briefRecord.reader_path) || [];
  const id = (r.legIds || [])[n - 1];
  const leg = id ? legs.find((l) => l && l.leg_id === id) : null;
  return (leg && leg.text) || "(no point in the Brief)";
}

// A Move's record, read from the plan's moves directory or, for the run's own Moves withheld
// from it (kogaki#1521), the ingest's; null where none is readable.
function moveRecord(r, move) {
  const dirs = [join(r.runDir, "moves"), r.stage("ingest").moves_dir].filter(Boolean);
  const mt = move
    ? (dirs.map((d) => read(join(d, `${move}${MOVE_RECORD_EXT}`))).find((t) => t !== null) ?? null)
    : null;
  if (!mt) return null;
  try {
    return parseYaml(mt) || null;
  } catch {
    return null;
  }
}

// A bound Move's `description` as one plain paragraph (kogaki#1517); nothing where no Move is
// bound or its record carries none.
export function moveDescription(r, move) {
  const rec = moveRecord(r, move);
  const d = rec && typeof rec.description === "string" ? rec.description.trim() : "";
  return d ? `<p>${esc(d)}</p>` : "";
}

// A bound Move's `takes`, then its `leaves`, one line per entry as `<kind>: <what>` (kogaki#1701);
// nothing where no Move is bound or its record carries no entry.
export function moveConstraintLines(r, move) {
  const rec = move ? moveRecord(r, move) : null;
  const line = (field) =>
    (rec && Array.isArray(rec[field]) ? rec[field] : [])
      .map((x) => `<p class="${field}">${esc(`${x && x.kind}: ${x && x.what}`)}</p>`)
      .join("");
  return line("takes") + line("leaves");
}

// A bound Move's `takes` and `leaves` (kogaki#1698), one row per list, each entry `kind: what` in
// order, read from the run's moves directory. The Move's `before` and `after` are retired (kogaki#1699).
export function constraintEntriesHtml(list) {
  const xs = Array.isArray(list) ? list : [];
  return xs.length
    ? `<ol>${xs.map((x) => `<li>${esc(`${x && x.kind}: ${x && x.what}`)}</li>`).join("")}</ol>`
    : `<span class="muted">(none)</span>`;
}
function stateRows(rec) {
  return ["takes", "leaves"]
    .map((k) => `<tr><td>${k}</td><td colspan="2">${constraintEntriesHtml(rec[k])}</td></tr>`)
    .join("");
}
const STATES_HEAD = `<thead><tr><th>list</th><th colspan="2">entries</th></tr></thead>`;
export function moveStates(r, move) {
  const rec = moveRecord(r, move);
  if (!rec) return `<p class="muted">(the Move file is not readable)</p>`;
  return `<table>${STATES_HEAD}<tbody>${stateRows(rec)}</tbody></table>`;
}

// A paragraph's Move under its Segments table on the Extraction card, open on load (kogaki#1534):
// the takes / leaves rows, then one row listing the Move's `breaks` in order; nothing where the
// paragraph has no Move.
export function moveStatesBreaks(r, move) {
  if (!move) return "";
  const rec = moveRecord(r, move);
  if (!rec) return `<p class="muted">(the Move file is not readable)</p>`;
  const breaks = Array.isArray(rec.breaks) ? rec.breaks : [];
  return (
    `<table class="move-states"><caption>takes / leaves / breaks</caption>${STATES_HEAD}<tbody>${stateRows(rec)}` +
    `<tr class="breaks"><td>breaks</td><td colspan="2">${
      breaks.length
        ? `<ol>${breaks.map((b) => `<li>${esc(String(b))}</li>`).join("")}</ol>`
        : `<span class="muted">(none)</span>`
    }</td></tr>` +
    `</tbody></table>`
  );
}

// A paragraph's Move's `breaks` under its Segments table on the review block (kogaki#1637): an
// ordered list in the record's order; nothing where the paragraph has no Move.
export function moveBreaks(r, move) {
  if (!move) return "";
  const rec = moveRecord(r, move);
  if (!rec) return `<p class="muted">(the Move file is not readable)</p>`;
  const breaks = Array.isArray(rec.breaks) ? rec.breaks : [];
  return `<div class="move-breaks"><p class="caption">Breaks</p>${
    breaks.length
      ? `<ol>${breaks.map((b) => `<li>${esc(String(b))}</li>`).join("")}</ol>`
      : `<p class="muted">(none)</p>`
  }</div>`;
}

// WHERE A BOUND MOVE CAME FROM (kogaki#1521): `library` or `this run`, read from the run record's
// `library.ids`; null for a run with no library, where every Move is the run's own.
export function moveSource(run, move) {
  const ids = run && run.library && run.library.ids;
  if (!ids || !move) return null;
  return (ids.library || []).includes(move) ? "library" : (ids.run || []).includes(move) ? "this run" : null;
}
export function sourceBadge(run, move) {
  const src = moveSource(run, move);
  return src ? ` <span class="badge source">${esc(src)}</span>` : "";
}

// THE LIBRARY LINE (kogaki#1521): the library the plan bound from and whether the run's own
// Moves were withheld, read from the run record's own `library`.
export function libraryLine(run) {
  const l = run && run.library;
  if (!l) return "Moves from this run only";
  const n = (xs) => (Array.isArray(xs) ? xs.length : "?");
  return l.withhold_own
    ? `Moves from the library ${l.dir} (${n(l.ids && l.ids.library)}); this run's own withheld`
    : `Moves from the library ${l.dir} (${n(l.ids && l.ids.library)}) beside this run's own (${n(l.ids && l.ids.run)})`;
}
