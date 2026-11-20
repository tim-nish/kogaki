#!/usr/bin/env node
// The Leg sheet — one card per artifact, in pipeline order, built from the run directory
// alone (kogaki#1401, owner decision 2026-10-16).
//
// WHAT IT SHOWS. A run-conditions line (the Audience, the settings, the model command and
// the run directory, each with its path and content hash — the Audience's text and the
// settings' values open from the line), then the paragraph tables (below), then three cards in
// pipeline order, stacked: Extraction, Move, Run record (kogaki#1487, kogaki#1885). Every card has
// the same four parts, in the same order: Output (the artifact file, folded on every card
// (kogaki#1559), a table of one row per paragraph for a per-paragraph artifact), Inputs (folded, a
// list of links to the cards this stage read, no content repeated), Prompt (folded, the recorded
// stdin as its instruction half and its input half) and Calls (folded, Rounds and refusals, then
// every recorded call's stdin and stdout). Nothing is rendered twice: a card that needs another's
// content links to it instead -- except the paragraph tables, which repeat the Segments tables
// because they are the review surface and the cards are the trace (kogaki#1487).
//
// A RUN OF SEVERAL LEGS (kogaki#1532): one block per Leg, in order, each with its own paragraph
// tables and per-Leg cards (Extraction, Move), above one Run record card.
//
// THE MOVE'S TAKES AND LEAVES UNDER ITS DESCRIPTION (kogaki#1701): in the Segments part, each
// paragraph's Move description is followed by its Move's `takes` and then its `leaves`, one line per
// entry as `<kind>: <what>`, in the record's order.
//
// AN UNBOUND CONTENT CLAUSE CARRIES ITS REASON (kogaki#1614): in a Segments table, a Segment the
// kept record's `content_bound` judges unbound shows that verdict's `why` beside its content
// clause; a bound one shows nothing. Each Segments heading ends in a `copy table` button copying
// its table as tab-separated text.
//
// EVERY PATH IS REPOSITORY-ROOT-RELATIVE (kogaki#1400, owner decision 2026-10-16), including
// the run directory itself, printed once in the card header. Every card carries one badge,
// `production` or `Move-Extraction Playground substitute` (`SHEET_CELL_BADGE`).
//
// EVERY CARD IS ADMITTED BY A ROW OF THE PROVENANCE MAP. The map's "Cells of the Leg card"
// table has one row per card this file draws (`SHEET_CELLS`). A map missing a row refuses the
// sheet, naming the rows it lacks — a card nobody can trace is not drawn; the row's label is
// the check, not something the card displays.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The paragraph unit
//       passages/FORMAT.md
//
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import {
  PROVENANCE_SECTION,
  SHEET_CELLS,
  contentHash,
  legView,
  provenanceRows,
  readRun,
} from "./leg-sheet/run-data.mjs";
import { ANCHOR_SCRIPT, COPY_SCRIPT, esc, pipelineDiagram, read } from "./leg-sheet/frame.mjs";
import { extractionCard, moveCard, reviewBlock, runConditionsLine, runRecordCard } from "./leg-sheet/stage-cards.mjs";
export {
  PROVENANCE_SECTION,
  SHEET_CELLS,
  contentHash,
  legView,
  provenanceRows,
  readRun,
} from "./leg-sheet/run-data.mjs";
export { FOLD_LEGEND, SHEET_CELL_BADGE, SHEET_TITLES } from "./leg-sheet/frame.mjs";
export { EDITED_BADGE, segmentsTable } from "./leg-sheet/stage-cards.mjs";
export { constraintEntriesHtml, moveConstraintLines } from "./leg-sheet/move-blocks.mjs";
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs";

const CSS = `:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#d9d6cf;--accent:#8a3b12;--off:#fbe3d6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}}
:root[data-theme="dark"]{--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}
body{background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif;margin:0 auto;max-width:1400px;padding:16px}
.takes,.leaves{color:var(--accent);font-size:13px}
.card{border-top:2px solid var(--line);padding-top:12px;margin-bottom:40px}.meta,.muted,.prov{color:var(--muted);font-size:12px;font-weight:normal}
.run-conditions{border:1px solid var(--line);border-radius:4px;padding:8px;margin:10px 0}.run-conditions ul{margin:4px 0;padding-left:18px}
.pair{width:100%;border-collapse:collapse;margin-bottom:16px}.pair td,.pair th{border:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
.pair td{width:33%;white-space:pre-wrap}.pair td.pws{white-space:normal}.copy-table{margin-left:8px;font-size:11px}
.review{border:2px solid var(--line);border-radius:6px;padding:8px;margin:10px 0}.review>h3{font-size:16px;margin:10px 0 4px}.review h4{font-size:14px;margin:10px 0 4px}
.pcard{border:1px solid var(--line);border-radius:6px;padding:8px;margin:10px 0}.pcard>h3{font-size:16px;margin:4px 0}
details.part{margin:6px 0;padding:4px 8px;border:1px solid var(--line);border-radius:4px}details.part>summary{font-weight:bold;cursor:pointer}
details.sub{margin:4px 0 4px 8px}
.move-breaks .caption{margin:6px 0 2px;font-weight:bold;font-size:13px}.move-states{margin:6px 0}.move-states caption{text-align:left;font-weight:bold;font-size:13px}details.states{margin:4px 0}details.states>summary{cursor:pointer;color:var(--muted)}
details.prow{margin:4px 0;padding:4px 8px;border:1px solid var(--line);border-radius:4px}details.prow>summary{font-weight:bold;cursor:pointer}
details.prow.off{background:var(--off)}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:color-mix(in srgb,var(--line) 25%,transparent);padding:6px;max-height:480px;overflow:auto}
table{border-collapse:collapse;font-size:13px}td,th{border:1px solid var(--line);padding:3px 6px;vertical-align:top}.stop{color:var(--accent)}
.badge{display:inline-block;font-size:11px;border-radius:3px;padding:1px 6px;margin-left:4px;border:1px solid var(--line)}
.unbound{color:var(--accent);font-size:12px}.badge.copied,.badge.edited,.badge.source{color:var(--accent)}.badge.production{color:var(--muted)}.badge.substitute{color:var(--accent);border-color:var(--accent)}
.pcard.substitute{border-left:4px solid var(--accent)}
.diagram{margin-bottom:16px}.diagram .mermaid{max-height:220px}
.legend{list-style:none;display:flex;gap:14px;flex-wrap:wrap;margin:4px 0;padding:0;font-size:12px;color:var(--muted)}
.legend li{display:flex;align-items:center;gap:4px}
.swatch{display:inline-block;width:11px;height:11px;border-radius:2px;border:1px solid var(--line)}
.swatch.ownerInput{background:#e9e4d8}.swatch.modelWritten{background:#dce8df}.swatch.mechanical{background:#dbe3ef}
.anchors{margin:4px 0 0;font-size:12px}
.leg-block{border:2px solid var(--line);border-radius:6px;padding:8px;margin:16px 0}.leg-block>h3{font-size:17px;margin:4px 0}
.badge.derived{color:var(--accent)}.derived{margin:6px 0}.derived caption{text-align:left;font-weight:bold;font-size:13px}`;

function card(r, { provenance, mapHash, idx = 0 }) {
  return (
    `<section class="card"><h2>${esc(r.run.passage || "Leg")} <span class="meta">${esc(relFromRepo(r.runDir, REPO))}</span></h2>` +
    (r.run.stopped ? `<p class="stop">The run stopped at ${esc(r.run.stopped)}</p>` : "") +
    `<p class="muted">Provenance map: ${esc(provenance)} · sha ${mapHash}</p>` +
    runConditionsLine(r) +
    reviewBlock(r, idx) +
    extractionCard(r, idx) +
    moveCard(r, idx) +
    runRecordCard(r, idx) +
    `</section>`
  );
}

// A RUN OF SEVERAL LEGS (see the header).
function legsCard(r, { provenance, mapHash, idx = 0 }) {
  const blocks = r.run.legs.map((l, k) => {
    const v = legView(r, k);
    const vidx = `${idx}-${k + 1}`;
    return (
      `<section class="leg-block" id="leg-${vidx}"><h3>Leg ${k + 1} of ${r.run.legs.length}` +
      ` <span class="meta">${esc(relFromRepo(join(r.runDir, l.copy), REPO))}</span></h3>` +
      reviewBlock(v, vidx) +
      extractionCard(v, vidx) +
      moveCard(v, vidx) +
      `</section>`
    );
  });
  return (
    `<section class="card"><h2>${esc(r.run.passage || "Legs")} <span class="meta">${esc(relFromRepo(r.runDir, REPO))}</span></h2>` +
    (r.run.stopped ? `<p class="stop">The run stopped at ${esc(r.run.stopped)}</p>` : "") +
    `<p class="muted">Provenance map: ${esc(provenance)} · sha ${mapHash}</p>` +
    runConditionsLine(r) +
    blocks.join("") +
    runRecordCard(r, idx) +
    `</section>`
  );
}

// BUILD THE SHEET. Returns `{ written }` or `{ error }`.
export function buildSheet({ runs, provenance, out }) {
  const mapText = read(provenance);
  if (mapText === null) return { error: `the provenance map at ${provenance} cannot be read` };
  const rows = provenanceRows(mapText);
  const missing = Object.values(SHEET_CELLS).filter((n) => !rows.has(n));
  if (missing.length) {
    return {
      error: `the provenance map at ${provenance} has no "${PROVENANCE_SECTION}" row for ${missing.map((m) => `"${m}"`).join(", ")} — a cell nobody can trace is not drawn`,
    };
  }
  const mapHash = contentHash(mapText);
  const cards = runs.map((d, idx) => {
    const r = readRun(resolve(d));
    return (r.run.legs && r.run.legs.length > 1 ? legsCard : card)(r, { provenance, mapHash, idx });
  });
  const mermaidScript = `<script type="module">import mermaid from "${MERMAID_CDN}"; mermaid.initialize({ startOnLoad: true });</script>`;
  writeFileSync(
    out,
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>Leg Move-Extraction Playground</title><style>${CSS}</style>${mermaidScript}</head><body><h1>Leg Move-Extraction Playground</h1>` +
      pipelineDiagram(0) +
      `<p class="muted">One card per Leg run. Provenance map: ${esc(provenance)} · sha ${contentHash(mapText)}</p>${cards.join("")}${ANCHOR_SCRIPT}${COPY_SCRIPT}</body></html>\n`,
  );
  return { written: out };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const runs = [];
  let provenance = null;
  let out = null;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--run") runs.push(argv[++i]);
    else if (argv[i] === "--provenance") provenance = argv[++i];
    else if (argv[i] === "--out") out = argv[++i];
  }
  if (argv[0] !== "build" || !runs.length || !provenance || !out) {
    process.stderr.write(
      "leg-sheet: usage: node src/move-extraction-playground/leg-sheet.mjs build --run <Leg run directory> [--run <another>] --provenance <the provenance map> --out <sheet.html>\n",
    );
    process.exit(1);
  }
  const r = buildSheet({ runs, provenance, out });
  if (r.error) {
    process.stderr.write(`leg-sheet: ${r.error}\n`);
    process.exit(1);
  }
  console.log(`sheet written: ${r.written}`);
}
