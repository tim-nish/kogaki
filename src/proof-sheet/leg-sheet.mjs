#!/usr/bin/env node
// The Leg sheet — one card per artifact, in pipeline order, built from the run directory
// alone (kogaki#1401, owner decision 2026-10-16).
//
// WHAT IT SHOWS. A run-conditions line (the Audience, the settings, the model command and
// the run directory, each with its path and content hash — the Audience's text and the
// settings' values open from the line), then the original-beside-written comparison table,
// then the three paragraph tables (below), then seven cards in pipeline order, stacked: Extraction, Move,
// Brief, ParagraphPlan, Packet, Draft, Run record (kogaki#1487). Every card has the same four
// parts, in the same order: Output (the artifact file, folded on every card (kogaki#1559): the
// owner reads the View blocks and opens a card only when a link or a problem sends them there — a
// table of one row per paragraph for a per-paragraph artifact), Inputs (folded, a list of links to the cards this stage read, no
// content repeated), Prompt (folded, the recorded stdin as its instruction half and its input
// half — a stage with two calls shows one prompt per call, titled by what it produced) and
// Calls (folded, attempts and refusals, then every recorded call's stdin and stdout). The
// ParagraphPlan card has a fifth part, Attempts, between Output and Inputs (kogaki#1437). Nothing
// is rendered twice: a card that needs another's content links to it instead -- except the
// paragraph tables, which repeat the Segments tables, the refused attempts and the bindings
// because they are the review surface and the cards are the trace (kogaki#1487).
//
// A REUSED RUN (kogaki#1512): a stage copied from an earlier run carries a second badge naming
// that run, and a Segment row of a copied Extraction the owner edited carries "edited by owner",
// both read from `run.json` alone.
//
// A RUN WITH A LIBRARY (kogaki#1521): each paragraph heading names the Move bound at its Leg
// Waypoint and each Bindings row its bound Move, each badged `library` or `this run` from the run
// record's `library.ids`; the run header names the library and whether the run's own Moves were
// withheld, or reads "Moves from this run only".
//
// A RUN OF SEVERAL LEGS (kogaki#1532): one block per Leg, in order, each with its own comparison
// table, paragraph tables and per-Leg cards (Extraction, Move, ParagraphPlan, Packet, Draft), under
// one Brief card and above one Run record card. The Brief card lists the derived cross-Leg fields,
// each marked `derived`, from the composer's `brief.json`.
//
// THE MOVE'S OBLIGATION UNDER ITS DESCRIPTION (kogaki#1582, moved by kogaki#1591): in the Segments
// part, each paragraph's Move description is followed by the `obligation` items its Move carries,
// numbered on one line. The sheet is the library view, not the Plan, so a Move field may appear.
//
// THE PARAGRAPH WAYPOINTS BETWEEN THE TWO PARAGRAPHS (kogaki#1591): the comparison table's middle
// column lists the Leg Waypoint's Paragraph Waypoints from the plan file, item k against Segment k.
// Each Segments heading ends in a `copy table` button copying its table as tab-separated text.
//
// EVERY PATH IS REPOSITORY-ROOT-RELATIVE (kogaki#1400, owner decision 2026-10-16), including
// the run directory itself, printed once in the card header. Every card carries one badge,
// `production` or `Proof Sheet substitute` (`SHEET_CELL_BADGE`).
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
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { parseYaml } from "../yaml.mjs";
import { settingValue, JUDGE_INPUT_MARKER } from "../workflow/judge.mjs";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { legParagraphs, EXTRACTION_TABLE, extractionMarkdown } from "./extract.mjs";
import { MOVE_RECORD_EXT } from "../compose.mjs";

export const PROVENANCE_SECTION = "## Cells of the Leg card";
// The provenance map's row for each card, by the name the map's first column carries. These
// are the gate's keys, one distinct row per card, and are never displayed (kogaki#1400).
export const SHEET_CELLS = {
  extraction: "Extraction",
  move: "Move",
  brief: "Brief",
  paragraphPlan: "ParagraphPlan",
  packet: "Packet",
  draft: "Draft",
  runRecord: "Run record",
};

// What each card is titled on the sheet: the pipeline's nouns and nothing else (kogaki#1400,
// #1401), in pipeline order.
export const SHEET_TITLES = {
  extraction: "Extraction",
  move: "Move",
  brief: "Brief",
  paragraphPlan: "ParagraphPlan",
  packet: "Packet",
  draft: "Draft",
  runRecord: "Run record",
};

// Every card carries one badge, production or Proof Sheet substitute (kogaki#1400, carried
// onto the seven cards by #1401). A substitute's note, where it has one, goes in the badge's
// title attribute.
export const SHEET_CELL_BADGE = {
  extraction: { type: "substitute" },
  move: { type: "production", note: "production code, written into this run's own library" },
  brief: { type: "substitute", note: "production rows with declared substitutions" },
  paragraphPlan: { type: "production" },
  packet: { type: "production" },
  draft: { type: "production" },
  runRecord: { type: "production" },
};

export function contentHash(text) {
  return text === null || text === undefined ? "none" : createHash("sha256").update(String(text)).digest("hex").slice(0, 12);
}

// The map's Leg card table: cell name -> the row, as written.
export function provenanceRows(mapText) {
  const lines = String(mapText).split("\n");
  const at = lines.findIndex((l) => l.startsWith(PROVENANCE_SECTION));
  const rows = new Map();
  if (at < 0) return rows;
  for (const l of lines.slice(at + 1)) {
    if (l.startsWith("## ")) break;
    if (!l.startsWith("|") || /^\|[\s|:-]+\|$/.test(l.trim())) continue;
    const cols = l.split("|").slice(1, -1).map((c) => c.trim());
    if (cols[0] && cols[0] !== "cell") rows.set(cols[0].replace(/\*/g, ""), l.trim());
  }
  return rows;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const read = (p) => { try { return readFileSync(p, "utf8"); } catch { return null; } };
const readJson = (p) => { const t = read(p); if (t === null) return null; try { return JSON.parse(t); } catch { return null; } };
const readCalls = (p) => (read(p) || "").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const pre = (t) => `<pre>${esc(t)}</pre>`;
const json = (o) => JSON.stringify(o, null, 2);

// THE CARD'S DATA, read from one run directory and nothing else.
export function readRun(runDir) {
  const run = readJson(join(runDir, "run.json")) || { stages: [] };
  const stage = (n) => run.stages.find((s) => s.stage === n) || { stage: n, state: "not run" };
  const legText = read(join(runDir, "leg.md")) || "";
  const ex = stage("extract");
  const brief = stage("brief");
  const draft = stage("draft");
  const briefPath = join(runDir, "brief", "brief.yaml");
  const briefText = read(briefPath);
  let briefRecord = null;
  try { briefRecord = briefText ? parseYaml(briefText, briefPath) : null; } catch { briefRecord = null; }
  const ingest = readJson(join(runDir, "ingest", "ingest.json"));
  const jobDir = join(runDir, "paragraph-plan", "job");
  const ws = draft.workspace || join(runDir, "draft", run.passage || "");
  const legId = (draft.leg_ids ? null : draft.leg_id) || (briefRecord && briefRecord.reader_path && briefRecord.reader_path[0] && briefRecord.reader_path[0].leg_id) || null;
  return {
    runDir, run, stage, legText, paragraphs: legParagraphs(legText),
    extractorRun: ex.extractor_run || null, extractions: ex.extractions || [],
    extractCalls: readCalls(join(runDir, "extract", "calls.jsonl")),
    ingest, briefPath, briefText, briefRecord, legBriefRun: brief.leg_brief_run || null,
    briefCalls: readCalls(join(runDir, "brief", "calls.jsonl")),
    jobDir, planCalls: readCalls(join(runDir, "paragraph-plan", "calls.jsonl")),
    planPath: join(runDir, "brief", "paragraph-plan.yaml"),
    ws, legId, draftCalls: readCalls(join(runDir, "draft", "calls.jsonl")),
  };
}

// ONE LEG OF SEVERAL (kogaki#1532): the run's data narrowed to Leg `k` — its text, paragraphs,
// Extractions and ingest entries, its leg id from the Brief, its plan calls and its Writer calls.
// `offset` is the count of the earlier Legs' paragraphs, which number the Extractor's `p<N>`.
export function legView(r, k) {
  const legs = r.run.legs;
  const offset = legs.slice(0, k).reduce((a, l) => a + l.paragraphs, 0);
  const n = legs[k].paragraphs;
  const legText = read(join(r.runDir, legs[k].copy)) || "";
  const legId = (((r.briefRecord && r.briefRecord.reader_path) || [])[k] || {}).leg_id || null;
  const key = legId ? `"leg_id": ${JSON.stringify(legId)}` : null;
  return {
    ...r, legText, legCopy: legs[k].copy, paragraphs: legParagraphs(legText), offset, unitIndex: k, legId,
    extractions: r.extractions.slice(offset, offset + n),
    ingest: r.ingest ? { ...r.ingest, entries: (r.ingest.entries || []).slice(offset, offset + n) } : r.ingest,
    planCalls: key ? r.planCalls.filter((c) => String(c.stdin).includes(key)) : [],
    draftCalls: legId ? readCalls(join(r.runDir, "draft", `calls-${legId}.jsonl`)) : [],
  };
}

function stageNote(r, name) {
  const s = r.stage(name);
  if (s.state === "done") return "";
  return `<p class="stop">${esc(name)}: ${esc(s.state)}${s.stopped ? ` — ${esc(s.stopped)}` : ""}</p>`;
}

const sub = (title, body) => `<details class="sub"><summary>${esc(title)}</summary>${body}</details>`;
const subOpen = (title, body) => `<details class="sub" open><summary>${esc(title)}</summary>${body}</details>`;

// A call's stdin against the prompts the sheet already shows (`shown`, as [where, text]
// pairs): the same text byte for byte, or the same text with one block inserted -- a retry,
// whose refusal sits between the instruction and the input (src/workflow/judge.mjs
// `judgeRefusalBlock`) -- or neither.
function againstShown(stdin, shown) {
  const text = String(stdin);
  for (const [where, prompt] of shown) {
    if (prompt === text) return { where, inserted: null };
  }
  for (const [where, prompt] of shown) {
    if (text.length <= prompt.length) continue;
    let a = 0;
    while (a < prompt.length && prompt[a] === text[a]) a++;
    const b = prompt.length - a;
    if (!text.endsWith(prompt.slice(a))) continue;
    // The common prefix can run into the block where the block opens as the input does (both
    // with `-----`); slide the cut back to the nearest line start it can stand at (kogaki#1437).
    const len = text.length - prompt.length;
    let at = a;
    while (at > 0 && text[at - 1] === text[at - 1 + len] && text[at - 1] !== "\n") at--;
    if (at > 0 && text[at - 1] !== "\n") at = a;
    return { where, inserted: text.slice(at, at + len) };
  }
  return null;
}

// Every recorded call, folded: argv, then its prompt and answer. A call whose stdin is a
// prompt the sheet already shows names where rather than showing it again, and a retry
// shows only the block it inserted (kogaki#1401, "no prompt text appears in more than one
// place on the sheet"); a call whose stdin is shown nowhere else is shown whole.
function callsBlock(calls, label = "recorded model calls", shown = []) {
  if (!calls.length) return `<p class="muted">No ${esc(label)}.</p>`;
  return calls.map((c, i) => {
    const m = againstShown(c.stdin, shown);
    const prompt = !m ? sub("prompt (stdin)", pre(c.stdin))
      : m.inserted === null ? `<p class="muted">prompt (stdin): the prompt shown under ${esc(m.where)}, byte for byte.</p>`
        : `<p class="muted">prompt (stdin): the prompt shown under ${esc(m.where)}, with this block inserted before its input:</p>${pre(m.inserted)}`;
    return sub(`${label}: call ${i + 1} of ${calls.length} — exit ${c.exit}, at ${c.at}`,
      pre(`argv: ${JSON.stringify(c.argv)}`) + prompt
      + sub("answer (stdout)", pre(c.stdout))
      + (c.stderr ? sub("stderr", pre(c.stderr)) : ""));
  }).join("");
}

// THE ANCHORED BRIEF (kogaki#1495). A Brief whose Leg was judged recoverable from the
// Extraction's Segment content reads "Proof Sheet substitute, anchored". The mark is read from
// the run's own Leg Brief composer record (`brief.json`'s `anchored`), never from the live
// code, so an older run's sheet, composed before the criterion, still reads unanchored.
export const ANCHORED_SUFFIX = ", anchored";
export function briefAnchored(legBriefRun) {
  const rec = legBriefRun ? readJson(join(legBriefRun, "brief.json")) : null;
  return !!(rec && rec.anchored === true);
}

// Every card carries one badge: production, or Proof Sheet substitute with a coloured left
// border and the note (if any) in the badge's title attribute.
function badgeSpan(key, anchored = false) {
  const b = SHEET_CELL_BADGE[key];
  if (!b) return "";
  const label = (b.type === "substitute" ? "Proof Sheet substitute" : "production") + (anchored ? ANCHORED_SUFFIX : "");
  return ` <span class="badge ${b.type}"${b.note ? ` title="${esc(b.note)}"` : ""}>${esc(label)}</span>`;
}

// A STAGE COPIED FROM AN EARLIER RUN (kogaki#1512) carries a second badge naming that run, read
// from the stage's own record; its attempts and refusals are the earlier run's, never re-judged.
export const COPIED_BADGE = "copied from";
function copiedBadge(source) {
  return source ? ` <span class="badge copied">${COPIED_BADGE} ${esc(source)}</span>` : "";
}

// A list of Inputs entries, each a link to another card on the same page and the path of
// what the stage read (kogaki#1401 acceptance: "every Inputs entry is a link to another
// card"). No input's content is repeated here.
function inputsList(entries, idx = 0) {
  if (!entries.length) return `<p class="muted">None drawn as a card.</p>`;
  return `<ul>${entries.map(([key, path]) => `<li><a href="#card-${idx}-${key}">${esc(SHEET_TITLES[key])}</a>${path ? ` <span class="meta">${esc(path)}</span>` : ""}</li>`).join("")}</ul>`;
}

// One card: Output (folded, kogaki#1559 -- the anchor script below opens it on its link), Inputs,
// Prompt, Calls, in that order -- and Attempts between Output and Inputs where the card has one (the
// ParagraphPlan card, kogaki#1437).
function cardWrap(key, { output, attempts, inputs, prompt, calls, anchored = false, copiedFrom = null }, idx = 0) {
  const name = SHEET_TITLES[key];
  const b = SHEET_CELL_BADGE[key];
  const cls = b && b.type === "substitute" ? "pcard substitute" : "pcard";
  return `<section class="${cls}" id="card-${idx}-${key}"><h3><b>${esc(name)}</b>${badgeSpan(key, anchored)}${copiedBadge(copiedFrom)}</h3>`
    + `<details class="part out"><summary>Output</summary>${output}</details>`
    + (attempts !== undefined ? `<details class="part attempts"><summary>Attempts</summary>${attempts}</details>` : "")
    + `<details class="part in"><summary>Inputs</summary>${inputs}</details>`
    + `<details class="part prompt"><summary>Prompt</summary>${prompt}</details>`
    + `<details class="part calls"><summary>Calls</summary>${calls}</details>`
    + `</section>`;
}

// A recorded prompt's two halves: the instruction (above the judge's input marker, or the
// whole prompt where there is none), open, and the input, folded, with a note that they are
// two halves of one recorded file.
function promptHalves(promptText) {
  if (promptText === null || promptText === undefined) return `<p class="muted">No model call was recorded.</p>`;
  const at = promptText.indexOf(JUDGE_INPUT_MARKER);
  const instruction = at >= 0 ? promptText.slice(0, at) : promptText;
  const input = at >= 0 ? promptText.slice(at) : null;
  return (input !== null ? `<p class="muted">The instruction and the input below are two halves of one recorded prompt file.</p>` : "")
    + `${subOpen("instruction", pre(instruction))}`
    + (input !== null ? sub("input", pre(input)) : "");
}

// A stage's Prompt part: one prompt where the stage made one call (or one per paragraph),
// or one titled prompt per call where a stage makes two (the Brief composer's two calls, the
// ParagraphPlan's plan and judge calls), each titled by what it produced.
// Where every prompt carries the same instruction (the Extractor's, one per paragraph), the
// instruction is shown once and each prompt's input under its own title.
function promptPart(named) {
  if (!named.length) return `<p class="muted">No model call was recorded.</p>`;
  if (named.length === 1) return promptHalves(named[0][1]);
  const halves = named.map(([title, text]) => {
    const at = text.indexOf(JUDGE_INPUT_MARKER);
    return { title, instruction: at >= 0 ? text.slice(0, at) : null, input: at >= 0 ? text.slice(at) : null };
  });
  if (halves.every((h) => h.instruction !== null && h.instruction === halves[0].instruction)) {
    return `<p class="muted">Each recorded prompt file is this one instruction followed by its own input.</p>`
      + subOpen("instruction", pre(halves[0].instruction))
      + halves.map((h) => sub(`${h.title} — input`, pre(h.input))).join("");
  }
  return named.map(([title, text]) => sub(title, promptHalves(text))).join("");
}

// A Move file's Segments, read off its YAML record (kogaki#1413); none where the file is
// absent or unreadable.
function moveSegments(moveText) {
  if (!moveText) return [];
  try {
    const rec = parseYaml(moveText);
    return rec && Array.isArray(rec.segments) ? rec.segments.map((s) => String((s && s.operation) || "").trim()) : [];
  } catch { return []; }
}
function segmentCount(moveText) { return moveSegments(moveText).length; }

// THE PER-PARAGRAPH ANCHOR IDS a written-paragraph cell links to, and every per-paragraph row
// carries (kogaki#1402): one id per card per paragraph number, scoped by the sheet's run index
// so two runs on one page never collide.
const anchorId = (card, n, idx) => `${card}-p${n}-${idx}`;

// A PER-PARAGRAPH (OR PER-LEG-WAYPOINT) ROW, folded (kogaki#1410, owner 2026-10-17): closed by
// default, open only for the first. The anchor id the comparison table links to sits on a
// `div` INSIDE the details, never on the details itself: a browser navigating to a fragment
// opens the closed details that are the target's ancestors, not a details that is the target.
const prowBlock = (card, n, idx, summary, body, cls = "") =>
  `<details class="prow${cls ? ` ${cls}` : ""}"${n === 1 ? " open" : ""}><summary>${esc(summary)}</summary><div id="${anchorId(card, n, idx)}">${body}</div></details>`;

// THE PACKET'S RENDERED WAYPOINTS, CUT BY THEIR OWN NUMBERING (kogaki#1402): the Packet's
// waypoints block is a NUMBERED list, one top-level line per Leg Waypoint with its Paragraph
// Waypoints indented beneath it (`src/draft.mjs` `waypointLines`); this cuts that block back
// into one piece per Leg Waypoint number, reading only the rendered Packet -- the Packet file
// and `/draft` are untouched.
const WAYPOINTS_HEADING = "## The waypoints this Leg takes the reader through";
export function packetWaypointBlocks(packetText) {
  if (!packetText) return [];
  const at = packetText.indexOf(WAYPOINTS_HEADING);
  if (at < 0) return [];
  const bodyStart = packetText.indexOf("\n", at) + 1;
  const nextHeading = packetText.indexOf("\n## ", bodyStart);
  const section = packetText.slice(bodyStart, nextHeading >= 0 ? nextHeading : undefined);
  const blocks = [];
  let current = null;
  for (const line of section.split("\n")) {
    const m = line.match(/^(\d+)\.\s/);
    if (m) {
      if (current) blocks.push(current);
      current = { n: Number(m[1]), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);
  return blocks.map((b) => ({ n: b.n, text: b.lines.join("\n").trim() }));
}

// THE PIPELINE DIAGRAM (kogaki#1402, redrawn by the owner's 2026-10-17 reading, kogaki#1410):
// one left-to-right flowchart, opening the run's section, laid out in two rows -- Extraction,
// Move, ParagraphPlan, Packet, Draft on the first, Brief under Move, fed by Extraction and
// Audience and feeding ParagraphPlan and Packet, on the second. Passage and Audience are the
// only sources; Segments and Persona are not drawn as nodes (Segments is section 3 of the
// Extraction, and Persona is a key of the Audience file). Audience also feeds Packet, the edge
// that governs the Packet's prose rules. Every node is a link to where that material sits on
// the page, and carries one of three provenance classes -- owner-authored input, model-written
// or mechanically derived with no model call -- with the production/substitute distinction
// (kogaki#1400) riding a dashed border on Extraction and Brief. The artifact node names are the
// pipeline nouns SHEET_TITLES carries and nothing else (kogaki#1400). Mermaid is loaded from a
// pinned CDN; the diagram's own text is also written as a `<pre>` fallback inside a closed
// details element, so a sheet opened offline still shows the graph as text without it taking
// space by default (owner, 2026-10-17: "I would prefer it to be collapsed by default").
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs";
// The sheet's legend sentence (kogaki#1559): every stage card is folded on load, and a link into a
// card opens it.
export const FOLD_LEGEND = "Stage cards are folded; a link opens the card it points into.";
// The one line that opens a folded card on its link (kogaki#1559): on load and on every hash
// change, every `details` enclosing the link's target is opened, and so is the Output part of a
// target that is a card itself (a `#card-<idx>-<key>` link lands on the section, whose Output
// `details` is a descendant, not an ancestor); then the target is scrolled to.
// A `copy table` button copies the first table after its heading, header row first, one line per
// row and a tab between cells, leaving out each row's badge.
const COPY_BUTTON = `<button type="button" class="copy-table">copy table</button>`;
const COPY_SCRIPT = `<script>addEventListener("click",(e)=>{const b=e.target.closest("button.copy-table");if(!b)return;let t=b.closest("h4").nextElementSibling;while(t&&t.tagName!=="TABLE"&&t.tagName!=="H4")t=t.nextElementSibling;if(!t||t.tagName!=="TABLE")return;const cell=(c)=>{const k=c.cloneNode(true);k.querySelectorAll(".badge").forEach((x)=>x.remove());return k.textContent.trim().replace(/\\s+/g," ");};navigator.clipboard.writeText([...t.rows].map((r)=>[...r.cells].map(cell).join("\\t")).join("\\n")).then(()=>{b.textContent="copied";setTimeout(()=>{b.textContent="copy table";},1200);});});</script>`;
const ANCHOR_SCRIPT = `<script>const openTo=()=>{const t=location.hash&&document.getElementById(decodeURIComponent(location.hash.slice(1)));if(!t)return;for(let d=t.closest("details");d;d=d.parentElement&&d.parentElement.closest("details"))d.open=true;const o=t.querySelector("details.part.out");if(o)o.open=true;t.scrollIntoView();};addEventListener("hashchange",openTo);openTo();</script>`;

// The diagram's three provenance classes, by node name (kogaki#1410 design: "Three classes...
// owner-authored input... model-written... mechanically derived with no model call").
const DIAGRAM_CLASSES = {
  ownerInput: ["Passage", "Audience"],
  modelWritten: ["Extraction", "Brief", "ParagraphPlan", "Draft"],
  mechanical: ["Move", "Packet"],
};
const DIAGRAM_CLASS_LABELS = {
  ownerInput: "owner-authored input",
  modelWritten: "model-written",
  mechanical: "mechanically derived, no model call",
};
// The production/substitute border rides the dashed style (kogaki#1400), on Extraction and
// Brief only -- ParagraphPlan and Draft are production and stay solid.
const DIAGRAM_DASHED = ["Extraction", "Brief"];

function pipelineDiagram(idx) {
  const cardHref = (key) => `#card-${idx}-${key}`;
  const nodes = [
    ["Passage", `#comparison-${idx}`],
    ["Audience", "#run-conditions"],
    ["Extraction", cardHref("extraction")],
    ["Move", cardHref("move")],
    ["Brief", cardHref("brief")],
    ["ParagraphPlan", cardHref("paragraphPlan")],
    ["Packet", cardHref("packet")],
    ["Draft", cardHref("draft")],
  ];
  const edges = [
    ["Passage", "Extraction"], ["Audience", "Extraction"],
    ["Extraction", "Move"], ["Extraction", "Brief"], ["Audience", "Brief"],
    ["Move", "ParagraphPlan"], ["Brief", "ParagraphPlan"],
    ["Brief", "Packet"], ["ParagraphPlan", "Packet"], ["Audience", "Packet"],
    ["Packet", "Draft"],
  ];
  const nodeId = (name) => `${name}_${idx}`;
  const lines = ["flowchart LR"];
  for (const [name] of nodes) lines.push(`  ${nodeId(name)}["${name}"]`);
  for (const [a, b] of edges) lines.push(`  ${nodeId(a)} --> ${nodeId(b)}`);
  for (const [name, href] of nodes) lines.push(`  click ${nodeId(name)} "${href}"`);
  lines.push("  classDef ownerInput fill:#e9e4d8,stroke:#8a3b12,color:#1d1d1b");
  lines.push("  classDef modelWritten fill:#dce8df,stroke:#2f6b45,color:#1d1d1b");
  lines.push("  classDef mechanical fill:#dbe3ef,stroke:#2b4f7a,color:#1d1d1b");
  lines.push("  classDef dashed stroke-dasharray: 5 5");
  for (const [cls, names] of Object.entries(DIAGRAM_CLASSES)) lines.push(`  class ${names.map(nodeId).join(",")} ${cls}`);
  lines.push(`  class ${DIAGRAM_DASHED.map(nodeId).join(",")} dashed`);
  const text = lines.join("\n");
  const legend = `<ul class="legend">${Object.entries(DIAGRAM_CLASS_LABELS)
    .map(([cls, label]) => `<li><span class="swatch ${cls}"></span> ${esc(label)}</li>`).join("")}</ul>`;
  return `<div class="diagram"><div class="mermaid">${esc(text)}</div>${legend}<p class="muted fold-legend">${esc(FOLD_LEGEND)}</p>`
    + sub("Diagram text (shown for a sheet without network access to Mermaid)", pre(text))
    + `</div>`;
}

// THE RUN-CONDITIONS LINE: the Audience, the settings, the model command and the run
// directory, each with its path and content hash. The Audience's text and the settings'
// values open from here -- and nowhere else (kogaki#1401).
function runConditionsLine(r) {
  const relRun = relFromRepo(r.runDir, REPO);
  // THE AUDIENCE READS FROM THE RECORD ALONE (kogaki#1396): `run.json`'s own `audience` is
  // the path the run resolved and used, once, at its start. A record without it (an older
  // run, from before the run named the path it used) shows the cell as unreadable rather
  // than resolving a substitute from the live setting, which could have moved since.
  const audienceRel = r.run.audience || null;
  const audiencePath = audienceRel ? resolve(REPO, audienceRel) : null;
  const audience = audiencePath ? read(audiencePath) : null;
  const audienceLabel = audiencePath ? relFromRepo(audiencePath, REPO) : "(unreadable: the run record names no audience)";

  const settingsPath = resolve(REPO, "kogaki.settings.json");
  const table = readJson(EXTRACTION_TABLE);
  const settingsText = [
    `attempt bound (brief.unit_attempts): ${table ? settingValue(table.job.unit_attempts) : "(unreadable)"}`,
    `call limit, seconds (brief.call_limit_s): ${table ? settingValue(table.job.call_limit_s) : "(unreadable)"}`,
    `audience file (brief.audience_file): ${settingValue({ setting: "brief.audience_file" })}`,
  ].join("\n");

  const modelCommand = r.run.model_command || "(not recorded)";
  const runText = read(join(r.runDir, "run.json"));

  return `<div class="run-conditions" id="run-conditions"><b>Run conditions</b><ul>`
    + `<li>Audience: <span class="meta">${esc(audienceLabel)} · sha ${contentHash(audience)}</span> ${sub("Audience text", pre(audience || "(cannot be read)"))}</li>`
    + `<li>Settings: <span class="meta">${esc(relFromRepo(settingsPath, REPO))} · sha ${contentHash(settingsText)}</span> ${sub("Settings values", pre(settingsText))}</li>`
    + `<li>Model command: <span class="meta">${esc(modelCommand)} · sha ${contentHash(modelCommand)}</span></li>`
    + `<li>Run directory: <span class="meta">${esc(relRun)} · sha ${contentHash(runText)}</span></li>`
    + `</ul></div>`;
}

// THE ORIGINAL-BESIDE-WRITTEN TABLE: one row per paragraph, original Leg beside written Leg
// (one Leg Waypoint is one paragraph; the original is cut as The paragraph unit cuts it).
// Every written-paragraph cell links down to that paragraph's own row in each per-paragraph
// card -- Extraction, Move, ParagraphPlan, Packet and Draft -- so a reader reading the problem
// in a row can reach its evidence without reconstructing the pipeline (kogaki#1402).
function comparisonTable(r, idx, { sectionPath, written, writtenParas, draftStop }) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const n = Math.max(r.paragraphs.length, writtenParas.length);
  const anchorLinks = (i) => `<p class="anchors">`
    + [["Extraction", "extraction"], ["Move", "move"], ["ParagraphPlan", "planwp"], ["Packet", "packetwp"], ["Draft", "draft"]]
      .map(([label, card]) => `<a href="#${anchorId(card, i, idx)}">${esc(label)}</a>`).join(" · ")
    + `</p>`;
  const { planText, pl } = planLeg(r);
  const pwCell = (i) => {
    const w = pl && (pl.waypoints || []).find((x) => x.waypoint === i + 1);
    return w ? `<ol>${(w.paragraph_waypoints || []).map(pwItem).join("")}</ol>` : "";
  };
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const writtenCell = written ? `${esc(writtenParas[i] || "")}${anchorLinks(i + 1)}` : (i === 0 ? `<span class="stop">${esc(draftStop || "not written")}</span>` : "");
    pairs.push(`<tr><th>${i + 1}</th><td>${esc(r.paragraphs[i] || "")}</td><td class="pws">${pwCell(i)}</td><td>${writtenCell}</td></tr>`);
  }
  return `<table class="pair" id="comparison-${idx}"><thead><tr><th></th><th>Original Leg <span class="meta">${esc(rel(join(r.runDir, r.legCopy || "leg.md")))} · sha ${contentHash(r.legText)}</span></th>`
    + `<th>Paragraph Waypoints <span class="meta">${esc(rel(r.planPath))} · sha ${contentHash(planText)}</span></th>`
    + `<th>Written Leg <span class="meta">${esc(rel(sectionPath))} · sha ${contentHash(written)}</span></th></tr></thead>`
    + `<tbody>${pairs.join("")}</tbody></table>`;
}

// Paragraph `i`'s Move's `obligation` items, numbered on one line; nothing where its Move carries none.
function moveObligationLine(r, i) {
  const e = ((r.ingest && r.ingest.entries) || [])[i];
  const rec = e && e.move ? moveRecord(r, e.move) : null;
  const items = rec && Array.isArray(rec.obligation) ? rec.obligation : [];
  return items.length ? `<p class="obligation">Move obligation: ${items.map((x, j) => `(${j + 1}) ${esc(x)}`).join("; ")}</p>` : "";
}

// The plan file's text and this Leg's entry in it; the entry is null where the file is unreadable.
function planLeg(r) {
  const planText = read(r.planPath);
  let plan = null;
  if (planText) { try { plan = parseYaml(planText, r.planPath); } catch { plan = null; } }
  return { planText, pl: (plan && plan.legs && ((r.legId && plan.legs.find((l) => l && l.leg_id === r.legId)) || plan.legs[0])) || null };
}

// CARD 1 — EXTRACTION. Output: one collapsible block per paragraph, closed by default except
// paragraph 1 (kogaki#1410, owner 2026-10-17: "having all of them expanded makes navigation
// cumbersome"), each with its path and hash, opening on its Segments table, then its Move's
// open `before / after / breaks` table (kogaki#1534, owner 2026-10-23), with the record's
// rendering and the record file folded beneath them (kogaki#1479, owner 2026-10-20). Inputs:
// none drawn as a card (the original paragraph is in the comparison table above, the Audience
// is in the run-conditions line). Prompt: one per paragraph. Calls: one group per paragraph,
// with its attempt count.
function extractionParagraphs(r) {
  const n = r.paragraphs.length;
  const per = [];
  for (let i = 0; i < n; i++) {
    const name = r.extractions[i];
    const file = name ? join(r.runDir, "extract", name) : null;
    const text = file ? read(file) : null;
    const pdir = r.extractorRun ? join(r.extractorRun, `p${(r.offset || 0) + i + 1}`) : null;
    const promptText = pdir ? read(join(pdir, "prompt.md")) : null;
    const answer = pdir ? readJson(join(pdir, "answer.json")) : null;
    const attempts = pdir ? readJson(join(pdir, "attempts.json")) : null;
    const inputAt = promptText ? promptText.indexOf(JUDGE_INPUT_MARKER) : -1;
    const key = inputAt >= 0 ? promptText.slice(inputAt) : null;
    const calls = key ? r.extractCalls.filter((c) => String(c.stdin).includes(key)) : [];
    // THE RECORD, RENDERED (kogaki#1413): the Extraction file is a YAML record, shown here as
    // the Markdown `extractionMarkdown` renders, folded after the Segments table (kogaki#1479).
    // The Segments come off the record file, which is what the Moves were ingested from and
    // what the owner edits (kogaki#1512); the Extractor's answer stands in where it is unreadable.
    let rendered = null;
    let rec = null;
    if (text) { try { rec = parseYaml(text, file); rendered = extractionMarkdown(rec); } catch { rendered = null; } }
    const segs = rec && Array.isArray(rec.segments) ? rec.segments : answer && Array.isArray(answer.segments) ? answer.segments : [];
    per.push({ i, file, text, rendered, promptText, calls, attempts, segs });
  }
  return per;
}

// A paragraph's Segments table, the one renderer the Extraction card and the paragraph tables
// share. `edited` is the set of Segment numbers the run record names as edited by the owner
// (kogaki#1512); each such row carries the badge, with the edited fields in its title.
export const EDITED_BADGE = "edited by owner";
const segmentsTable = (segs, edited = new Map()) => (segs.length
  ? `<table><thead><tr><th>#</th><th>content clause</th><th>operation</th><th>relation</th><th>manner</th></tr></thead><tbody>`
    + segs.map((s, j) => `<tr${edited.has(j + 1) ? ' class="edited"' : ""}><td>${j + 1}${edited.has(j + 1)
      ? ` <span class="badge edited" title="${esc(edited.get(j + 1).join(", "))}">${EDITED_BADGE}</span>` : ""}</td>`
      + `<td>${esc(s.content || "")}</td><td>${esc(s.operation || "")}</td><td>${esc(s.relation || "")}</td>`
      + `<td>${esc(s.manner || "")}</td></tr>`).join("")
    + `</tbody></table>`
  : `<p class="muted">No Segments.</p>`);

// The owner's edits the run record names for paragraph `n`: Segment number -> edited fields.
function editedSegments(r, n) {
  const m = new Map();
  for (const e of (r.run.reuse && r.run.reuse.edits) || []) {
    if (e.paragraph === n + (r.offset || 0)) m.set(e.segment, [...(m.get(e.segment) || []), e.field]);
  }
  return m;
}

function extractionCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const per = extractionParagraphs(r);
  const entries = (r.ingest && r.ingest.entries) || [];
  const output = stageNote(r, "extract")
    + per.map((p) => prowBlock("extraction", p.i + 1, idx, `paragraph ${p.i + 1}`,
      `<p class="meta">${p.file ? esc(rel(p.file)) : "(not written)"} · sha ${contentHash(p.text)}</p>`
      + (p.file ? segmentsTable(p.segs, editedSegments(r, p.i + 1)) + moveStatesBreaks(r, entries[p.i] && entries[p.i].move)
        + sub("rendering", pre(p.rendered || p.text || "(not written)"))
        + sub("record file", pre(p.text || "(not written)")) : ""))).join("");

  // The Prompt is the recorded stdin of each paragraph's first call, not the judge's
  // `prompt.md`: the recorder's stdin carries the CLI preamble the model actually read.
  const promptEntries = per.filter((p) => p.calls.length).map((p) => [`paragraph ${p.i + 1}`, p.calls[0].stdin]);
  const callsHtml = per.some((p) => p.calls.length)
    ? per.map((p) => sub(`paragraph ${p.i + 1} — attempts ${p.attempts ? p.attempts.attempts : "?"}`, callsBlock(p.calls, `paragraph ${p.i + 1} calls`, promptEntries.map(([t, x]) => [`Prompt, ${t}`, x])))).join("")
    : `<p class="muted">No recorded model calls.</p>`;

  return cardWrap("extraction", { output, copiedFrom: r.stage("extract").copied_from || null, inputs: inputsList([], idx), prompt: promptPart(promptEntries), calls: callsHtml }, idx);
}

// CARD 2 — MOVE. Output (folded, kogaki#1487): one collapsible block per paragraph, closed by
// default except paragraph 1 (kogaki#1410), its Move file's path, hash and content, with its ingest screen
// folded. Inputs: Extraction. No model call -- `tools/move_ingest.py` is mechanical.
function moveCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const entries = (r.ingest && r.ingest.entries) || [];
  const n = r.paragraphs.length;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const e = entries[i] || {};
    const mp = e.move ? join(r.runDir, "moves", `${e.move}${MOVE_RECORD_EXT}`) : null;
    const mt = mp ? read(mp) : null;
    rows.push(prowBlock("move", i + 1, idx, `paragraph ${i + 1}`,
      `<p class="meta">${mp ? esc(rel(mp)) : "(not written)"} · sha ${contentHash(mt)}</p>`
      + pre(mt || e.refusal || "(not written)") + (e.screen ? sub(`ingest entry — sha ${contentHash(e.screen)}`, pre(e.screen)) : "")));
  }
  const output = stageNote(r, "ingest") + rows.join("");
  return cardWrap("move", {
    output,
    inputs: inputsList([["extraction", relFromRepo(join(r.runDir, "extract"), REPO)]], idx),
    prompt: `<p class="muted">No model call: <code>tools/move_ingest.py</code> <code>run_from_extraction</code> derives the Move mechanically.</p>`,
    calls: `<p class="muted">No model call.</p>`,
  }, idx);
}

// THE DERIVED CROSS-LEG FIELDS of a several-Leg Brief (kogaki#1532), one row each, marked
// `derived`, from the composer's `brief.json`; nothing for one Leg.
export const DERIVED_BADGE = "derived";
function derivedTable(r) {
  if (!(r.run.legs && r.run.legs.length > 1)) return "";
  const rows = ((r.legBriefRun && readJson(join(r.legBriefRun, "brief.json"))) || {}).derived || [];
  return `<table class="derived"><caption>Cross-Leg fields</caption><thead><tr><th>Leg</th><th>field</th><th>value</th><th>rule</th></tr></thead><tbody>`
    + (rows.length ? rows.map((d) => `<tr><td>${esc(d.leg_id)}</td><td>${esc(d.field)} <span class="badge derived">${DERIVED_BADGE}</span></td>`
      + `<td>${esc(Array.isArray(d.value) ? d.value.join(", ") : String(d.value))}</td><td>${esc(d.rule)}</td></tr>`).join("")
      : `<tr><td colspan="4" class="muted">(no derived field recorded)</td></tr>`)
    + `</tbody></table>`;
}

// CARD 3 — BRIEF. Output (folded, kogaki#1487): the Brief file, whole, with its path and hash. Inputs: Extraction (the reader state and claims the Leg Brief composer reads).
// Prompt/Calls: the composer's two calls, Reader start and Leg path, each titled by what it
// produced.
function briefCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const output = (r.briefText ? "" : stageNote(r, "brief"))
    + derivedTable(r)
    + `<p class="meta">${esc(rel(r.briefPath))} · sha ${contentHash(r.briefText)}</p>` + pre(r.briefText || "(not written)");

  const readerStartMarker = "`leg_reader_start_unit` judgment point";
  const legPathMarker = "`leg_path_unit` judgment point";
  const legs = r.run.legs && r.run.legs.length > 1 ? r.run.legs : null;
  // Several Legs' Leg calls are told apart by the first Strand each Leg's input names.
  const strandKey = (k) => `"claim_strand": "L${legs.slice(0, k).reduce((a, l) => a + l.paragraphs, 0) + 1}"`;
  const rowsFor = legs
    ? [["reader-start", [readerStartMarker], "Brief, Reader start"],
      ...legs.map((l, k) => [`leg-path-${k + 1}`, [legPathMarker, strandKey(k)], `Brief, Leg Waypoint, Leg ${k + 1}`])]
    : [["reader-start", [readerStartMarker], "Brief, Reader start"], ["leg-path", [legPathMarker], "Brief, Leg Waypoint"]];
  const named = [];
  let callsHtml = "";
  for (const [sub_, markers, title] of rowsFor) {
    const d = r.legBriefRun ? join(r.legBriefRun, sub_) : null;
    const answer = d ? readJson(join(d, "answer.json")) : null;
    const attempts = d ? readJson(join(d, "attempts.json")) : null;
    const calls = r.briefCalls.filter((c) => markers.every((m) => String(c.stdin).includes(m)));
    if (calls.length) named.push([title, calls[0].stdin]);
    callsHtml += sub(`${title} — attempts ${attempts ? attempts.attempts : "?"}`,
      sub(`answer — sha ${contentHash(answer && json(answer))}`, pre(answer ? json(answer) : "(none)")) + pre(attempts ? json(attempts) : "(no attempts record)")
      + callsBlock(calls, `${title} calls`, named.map(([t, x]) => [`Prompt, ${t}`, x])));
  }
  return cardWrap("brief", {
    output, anchored: briefAnchored(r.legBriefRun), copiedFrom: r.stage("brief").copied_from || null,
    inputs: inputsList([["extraction", relFromRepo(join(r.runDir, "extract"), REPO)]], idx),
    prompt: promptPart(named),
    calls: callsHtml,
  }, idx);
}

// A recorded call's answer: the `result` of its last stream-json result line, parsed as JSON,
// or the text that would not parse (`raw`) -- the whole stdout where no result line is found.
function callAnswer(c) {
  const lines = String((c && c.stdout) || "").split("\n").filter((l) => l.trim() !== "");
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    if (!obj || typeof obj !== "object" || obj.type !== "result") continue;
    if (typeof obj.result !== "string") return obj.result && typeof obj.result === "object" ? { record: obj.result } : { raw: JSON.stringify(obj.result) };
    try {
      const rec = JSON.parse(obj.result);
      return rec && typeof rec === "object" && !Array.isArray(rec) ? { record: rec } : { raw: obj.result };
    } catch { return { raw: obj.result }; }
  }
  return { raw: String((c && c.stdout) || "") };
}

// The ParagraphPlan's attempts, paired from its recorded calls by order of `at` (kogaki#1437):
// each plan call opens an attempt, and the judge call after it (before the next plan call)
// is that attempt's judge -- the last one, where an unreadable answer was asked again.
function planAttempts(calls) {
  const sorted = calls.map((c, i) => [c, i]).sort((a, b) => String(a[0].at).localeCompare(String(b[0].at)) || a[1] - b[1]).map(([c]) => c);
  const attempts = [];
  for (const c of sorted) {
    const text = String(c.stdin);
    if (text.includes('"leg_you_must_plan"')) attempts.push({ plan: c, judge: null });
    else if (text.includes('"leg_you_must_judge"') && attempts.length) attempts[attempts.length - 1].judge = c;
  }
  return attempts;
}

// A Paragraph Waypoint as a list item: a `point` entry as its text, a `performs` entry as its
// text in italics, as the Packet renders it (kogaki#1448), so no item is empty (kogaki#1479).
const pwItem = (p) => (p && Object.hasOwn(p, "performs") ? `<li><i>${esc(p.performs)}</i></li>` : `<li>${esc((p && p.point) || "")}</li>`);

// An attempt block's anchor id, inside its details as `prowBlock`'s is, so the review block's
// refused-attempts table can link to it (kogaki#1487).
const attemptId = (n, idx) => `attempt-${idx}-${n}`;

const waypointsNamed = (text) => [...new Set([...String(text || "").matchAll(/Waypoint (\d+)/g)].map((m) => Number(m[1])))].sort((a, b) => a - b);

// THE ATTEMPTS PART (kogaki#1437): one folded block per attempt, in order, each holding the
// planner's record per Leg Waypoint, the judge's verdict per Leg Waypoint with its `why` in
// full, and the refusal block the next attempt received. No prompt is repeated: each block
// names where its prompts are shown. The job record's refusal for an attempt is cross-checked
// against the judge's `does-not-fit` verdicts, and a mismatch is shown, never resolved.
function attemptsPart(attempts, job, planShown, judgeTitle, idx = 0, unitIndex = 0) {
  if (!attempts.length) return `<p class="muted">No plan call was recorded.</p>`;
  const unit = ((job && job.units) || [])[unitIndex] || null;
  const refusals = (unit && Array.isArray(unit.refusals)) ? unit.refusals : [];
  return attempts.map((a, i) => {
    const n = i + 1;
    const plan = callAnswer(a.plan);
    const planRecord = plan.record && Array.isArray(plan.record.waypoints) ? plan.record : null;
    const planner = planRecord
      ? planRecord.waypoints.map((w) => `<p class="meta">Leg Waypoint ${esc(w.waypoint)} · bound Move: ${esc(w.move === null ? "(none bound)" : w.move || "?")}</p>`
        + (w.join ? `<p>join: ${esc(w.join)}</p>` : "")
        + `<ol>${(w.paragraph_waypoints || []).map(pwItem).join("")}</ol>`).join("")
      : `<p class="stop">(no readable record)</p>${pre(plan.record ? json(plan.record) : plan.raw)}`;

    let judge;
    let notFit = null;
    if (a.judge) {
      const v = callAnswer(a.judge);
      if (v.record && Array.isArray(v.record.verdicts)) {
        notFit = v.record.verdicts.filter((x) => x && x.verdict === "does-not-fit").map((x) => Number(x.waypoint)).sort((p, q) => p - q);
        judge = `<ul>${v.record.verdicts.map((x) => `<li>Leg Waypoint ${esc(x && x.waypoint)}: <b>${esc(x && x.verdict)}</b> — ${esc((x && x.why) || "")}</li>`).join("")}</ul>`
          + `<p class="muted">The judge's prompt is shown under Prompt, ${esc(judgeTitle(a.judge))}.</p>`;
      } else {
        judge = `<p class="stop">(no readable record)</p>${pre(v.record ? json(v.record) : v.raw)}`;
      }
    } else if (a.plan.exit !== 0) {
      judge = `<p class="stop">No judge call: the plan call died (exit ${esc(a.plan.exit)}).</p>`;
    } else if (!planRecord) {
      judge = `<p class="stop">No judge call: the planner's answer carried no readable record.</p>`;
    } else {
      judge = `<p class="stop">No judge call: the validator refused the planner's record${refusals[i] ? ` — ${esc(refusals[i])}` : ""}.</p>`;
    }

    let mismatch = "";
    if (notFit !== null) {
      const named = refusals[i] !== undefined ? waypointsNamed(refusals[i]) : [];
      if (notFit.length && refusals[i] === undefined) {
        mismatch = `The judge answered does-not-fit at Leg Waypoint ${notFit.join(", ")}, and the job record holds no refusal for attempt ${n}.`;
      } else if (!notFit.length && refusals[i] !== undefined) {
        mismatch = `The judge answered fits at every Leg Waypoint, and the job record holds a refusal for attempt ${n}: ${refusals[i]}`;
      } else if (notFit.length && JSON.stringify(named) !== JSON.stringify(notFit)) {
        mismatch = `The judge answered does-not-fit at Leg Waypoint ${notFit.join(", ")}; the job record's refusal for attempt ${n} names Waypoint ${named.join(", ") || "none"}.`;
      }
    }

    let next;
    if (i + 1 < attempts.length) {
      const m = againstShown(attempts[i + 1].plan.stdin, [planShown]);
      next = !m ? `<p class="stop">The next attempt's prompt matches no prompt shown on this card; it is shown under Calls.</p>`
        : m.inserted === null ? `<p class="muted">The next attempt received the prompt shown under ${esc(m.where)} again, byte for byte, with no refusal block.</p>`
          : `<p class="muted">The next attempt received the prompt shown under ${esc(m.where)}, with this block inserted before its input:</p>${pre(m.inserted)}`;
    } else {
      next = `<p>no further attempt: the job ended \`${esc(job ? job.state : "(no job record)")}\`</p>`;
    }

    const verdicts = notFit === null ? "" : notFit.length ? ` — does-not-fit at Leg Waypoint ${notFit.join(", ")}` : " — fits at every Leg Waypoint";
    return sub(`attempt ${n} of ${attempts.length}${verdicts}`, `<div id="${attemptId(n, idx)}">`
      + `<p class="muted">The planner's prompt is shown under ${esc(planShown[0])}${i ? `, with the block shown under attempt ${i}'s "what the next attempt received" inserted` : ""}.</p>`
      + subOpen("the planner's record", planner)
      + subOpen("the judge's verdicts", judge)
      + (mismatch ? `<p class="stop">${esc(mismatch)}</p>` : "")
      + subOpen("what the next attempt received", next) + `</div>`);
  }).join("");
}

// CARD 4 — PARAGRAPHPLAN. Output: the plan file, the check verdict as a line (not a card),
// and Leg Waypoint -> Paragraph Waypoints counts against the bound Move's Segments, each row
// opening on the Leg Waypoint's point from the Brief (kogaki#1487) and carrying the plan
// file's join for a Leg Waypoint after the first (kogaki#1445).
// Attempts: every attempt's record, verdicts and the refusal block the next one received
// (kogaki#1437). Inputs: Brief, Move. Prompt/Calls: the plan call and the judge call, each
// titled by what it produced.
function paragraphPlanCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const job = readJson(join(r.jobDir, "reader-path-job.json"));
  const candFile = existsSync(r.jobDir) ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.candidate\.json$/.test(f)) : null;
  const specFile = existsSync(r.jobDir) ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.specialization\.json$/.test(f)) : null;
  const verdict = specFile ? read(join(r.jobDir, specFile)) : null;
  const genCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_plan"'));
  const judgeCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_judge"'));
  const { planText, pl } = planLeg(r);
  const bindings = readJson(join(r.jobDir, "paragraph-plan-bindings.json"));
  let verdictJson = null;
  try { verdictJson = verdict ? JSON.parse(verdict) : null; } catch { verdictJson = null; }
  const verdictLine = verdictJson && Array.isArray(verdictJson.verdicts)
    ? `Check verdict: ${verdictJson.verdicts.map((v) => `Leg Waypoint ${v.waypoint}: ${v.verdict}`).join("; ")}`
    : "Check verdict: (none recorded)";

  let countsTable = "";
  if (pl) {
    countsTable = pl.waypoints.map((w) => {
      const bnd = ((bindings && bindings.bindings) || []).find((x) => x.waypoint === w.waypoint && (!x.leg_id || !pl.leg_id || x.leg_id === pl.leg_id)) || {};
      const segs = bnd.move ? segmentCount(read(join(r.runDir, "moves", `${bnd.move}${MOVE_RECORD_EXT}`))) : 0;
      const pws = w.paragraph_waypoints || [];
      return prowBlock("planwp", w.waypoint, idx, `Leg Waypoint ${w.waypoint}`,
        `<p>Point: ${esc(legPoint(r, w.waypoint))}</p>`
        + `<p class="meta">bound Move: ${esc(bnd.move || "?")} · Segments of the Move: ${segs}</p>`
        + (w.join ? `<p>join: ${esc(w.join)}</p>` : "")
        + `<ol>${pws.map(pwItem).join("")}</ol>`,
        pws.length !== segs ? "off" : "");
    }).join("");
  }
  const output = (planText ? "" : stageNote(r, "paragraph-plan"))
    + `<p class="meta">${esc(rel(r.planPath))} · sha ${contentHash(planText)}</p>`
    + `<p>${esc(verdictLine)}</p>`
    + countsTable
    + sub("the file", pre(planText || "(not written)"))
    + sub("bindings", pre(bindings ? json(bindings) : "(none)"));

  // Every distinct judge prompt is shown once under Prompt -- each attempt's judge reads that
  // attempt's own record, so a judge prompt is never a retry of another -- under one
  // instruction where they share it.
  const attempts = planAttempts(r.planCalls);
  const planNamed = genCalls[0] ? [["ParagraphPlan, the plan call", genCalls[0].stdin]] : [];
  const judgeNamed = [];
  for (const a of attempts) {
    if (a.judge && !judgeNamed.some(([, x]) => x === a.judge.stdin)) {
      judgeNamed.push([`ParagraphPlan, the judge call${attempts.length > 1 ? `, attempt ${attempts.indexOf(a) + 1}` : ""}`, a.judge.stdin]);
    }
  }
  for (const c of judgeCalls) if (!judgeNamed.some(([, x]) => x === c.stdin)) judgeNamed.push([`ParagraphPlan, the judge call ${judgeNamed.length + 1}`, c.stdin]);
  const named = [...planNamed, ...judgeNamed];
  const shown = named.map(([t, x]) => [`Prompt, ${t}`, x]);
  const judgeTitle = (c) => (judgeNamed.find(([, x]) => x === c.stdin) || ["ParagraphPlan, the judge call"])[0];
  const prompt = judgeNamed.length > 1
    ? (planNamed.length ? sub(planNamed[0][0], promptHalves(planNamed[0][1])) : "") + promptPart(judgeNamed)
    : promptPart(named);

  const callsHtml = sub("the plan call — attempts and refusals",
      pre(job ? json({ state: job.state, units: (job.units || []).map((u) => ({ id: u.id, status: u.status, attempts: u.attempts, refusals: u.refusals || [] })) }) : "(none)")
      + callsBlock(genCalls, "plan calls", shown))
    + sub("the judge call", callsBlock(judgeCalls, "judge calls", shown));

  return cardWrap("paragraphPlan", {
    output,
    attempts: attemptsPart(attempts, job, shown[0] || ["Prompt, ParagraphPlan, the plan call", ""], judgeTitle, idx, r.unitIndex || 0),
    inputs: inputsList([["brief", rel(r.briefPath)], ["move", relFromRepo(join(r.runDir, "moves"), REPO)]], idx),
    prompt,
    calls: callsHtml,
  }, idx);
}

// CARD 5 — PACKET. Output: the Packet file, whole, with a per-Leg-Waypoint table above it
// cutting the rendered waypoints block by its own numbering (kogaki#1402: "the Packet is shown
// whole, so the lines the Writer received for paragraph N are not readable beside paragraph
// N"). Inputs: Brief, ParagraphPlan. No model call -- `/draft` renders it mechanically.
function packetCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const packetPath = r.legId ? join(r.ws, "packets", `${r.legId}.md`) : null;
  const packet = packetPath ? read(packetPath) : null;
  const blocks = packetWaypointBlocks(packet);
  const n = Math.max(r.paragraphs.length, blocks.length);
  const wpRows = [];
  for (let i = 1; i <= n; i++) {
    const b = blocks.find((x) => x.n === i);
    wpRows.push(prowBlock("packetwp", i, idx, `Leg Waypoint ${i}`, b ? pre(b.text) : `<p class="muted">No block for this Leg Waypoint.</p>`));
  }
  const output = (packet ? "" : stageNote(r, "draft"))
    + `<p class="meta">${packetPath ? esc(rel(packetPath)) : "(not rendered)"} · sha ${contentHash(packet)}</p>`
    + wpRows.join("")
    + pre(packet || "(not rendered)");
  return cardWrap("packet", {
    output,
    inputs: inputsList([["brief", rel(r.briefPath)], ["paragraphPlan", rel(r.planPath)]], idx),
    prompt: `<p class="muted">No model call: rendered by <code>/draft</code> from the Brief and the ParagraphPlan file.</p>`,
    calls: `<p class="muted">No model call.</p>`,
  }, idx);
}

// CARD 6 — DRAFT. Output: one row per paragraph, the written text (or the stop). Inputs:
// Packet. The Writer's recorded prompt is the Packet, so the Prompt and Calls parts say so
// rather than showing it again (kogaki#1401).
function draftCard(r, idx, { sectionPath, written, writtenParas, draftStop }) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const packetPath = r.legId ? join(r.ws, "packets", `${r.legId}.md`) : null;
  const packet = packetPath ? read(packetPath) : null;
  const writerCalls = r.draftCalls;
  const same = writerCalls.length && packet !== null && writerCalls.every((c) => c.stdin === packet);
  const n = Math.max(r.paragraphs.length, writtenParas.length);
  const rows = [];
  for (let i = 0; i < n; i++) {
    const cellText = written ? esc(writtenParas[i] || "") : (i === 0 ? `<span class="stop">${esc(draftStop || "not written")}</span>` : "");
    rows.push(prowBlock("draft", i + 1, idx, `paragraph ${i + 1}`, `<p>${cellText}</p>`));
  }
  const output = `<p class="meta">${sectionPath ? esc(rel(sectionPath)) : "(not written)"} · sha ${contentHash(written)}</p>`
    + rows.join("")
    + stageNote(r, "draft");

  const prompt = writerCalls.length
    ? `<p>${same ? "The recorded prompt equals the Packet shown in the Packet card above, byte for byte." : `<span class="stop">The recorded prompt is not the Packet.</span>`}</p>`
    : `<p class="muted">No Draft call was recorded.</p>`;
  const calls = callsBlock(writerCalls, "recorded Draft calls", packet === null ? [] : [["the Packet card's Output", packet]]);

  return cardWrap("draft", {
    output,
    inputs: inputsList([["packet", packetPath ? rel(packetPath) : null]], idx),
    prompt,
    calls,
  }, idx);
}

// CARD 7 — RUN RECORD. Output: `run.json` and each stage's `command.json`. Inputs: none; this
// card names what ran, not what it read.
function runRecordCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const runText = read(join(r.runDir, "run.json"));
  const stages = ["extract", "ingest", "brief", "paragraph-plan", "draft"];
  const commands = stages.map((s) => {
    const cmd = readJson(join(r.runDir, s, "command.json")) || [];
    return sub(`${s} — command.json`, pre(json(cmd.map((c) => ({ name: c.name, argv: c.argv, exit: c.exit })))));
  }).join("");
  const output = `<p class="meta">${esc(rel(join(r.runDir, "run.json")))} · sha ${contentHash(runText)}</p>` + pre(runText || "(none)") + commands;
  return cardWrap("runRecord", {
    output,
    inputs: inputsList([], idx),
    prompt: `<p class="muted">No model call: this card names what ran and how.</p>`,
    calls: `<p class="muted">No model calls of its own; see each card above for its stage's calls.</p>`,
  }, idx);
}

// A Leg Waypoint's point from the Brief, by its number on the run's Leg.
function legPoint(r, n) {
  const legs = (r.briefRecord && r.briefRecord.reader_path) || [];
  const leg = r.legId ? legs.find((l) => l && l.leg_id === r.legId) : legs[0];
  const wp = leg && Array.isArray(leg.waypoints) ? leg.waypoints[n - 1] : null;
  return (wp && wp.point) || "(no point in the Brief)";
}

// A Move's record, read from the plan's moves directory or, for the run's own Moves withheld
// from it (kogaki#1521), the ingest's; null where none is readable.
function moveRecord(r, move) {
  const dirs = [join(r.runDir, "moves"), r.stage("ingest").moves_dir].filter(Boolean);
  const mt = move ? dirs.map((d) => read(join(d, `${move}${MOVE_RECORD_EXT}`))).find((t) => t !== null) ?? null : null;
  if (!mt) return null;
  try { return parseYaml(mt) || null; } catch { return null; }
}

// A bound Move's `description` as one plain paragraph (kogaki#1517); nothing where no Move is
// bound or its record carries none.
function moveDescription(r, move) {
  const rec = moveRecord(r, move);
  const d = rec && typeof rec.description === "string" ? rec.description.trim() : "";
  return d ? `<p>${esc(d)}</p>` : "";
}

// A bound Move's `before` and `after`, one row per dimension, read from the run's moves directory.
function stateRows(rec) {
  const before = (rec.before && typeof rec.before === "object") ? rec.before : {};
  const after = (rec.after && typeof rec.after === "object") ? rec.after : {};
  const dims = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return dims.map((d) => `<tr><td>${esc(d)}</td><td>${esc(before[d] ?? "")}</td><td>${esc(after[d] ?? "")}</td></tr>`).join("");
}
const STATES_HEAD = `<thead><tr><th>dimension</th><th>before</th><th>after</th></tr></thead>`;
function moveStates(r, move) {
  const rec = moveRecord(r, move);
  if (!rec) return `<p class="muted">(the Move file is not readable)</p>`;
  return `<table>${STATES_HEAD}<tbody>${stateRows(rec)}</tbody></table>`;
}

// A paragraph's Move under its Segments table on the Extraction card, open on load (kogaki#1534):
// the before / after rows, then one row listing the Move's `breaks` in order; nothing where the
// paragraph has no Move.
function moveStatesBreaks(r, move) {
  if (!move) return "";
  const rec = moveRecord(r, move);
  if (!rec) return `<p class="muted">(the Move file is not readable)</p>`;
  const breaks = Array.isArray(rec.breaks) ? rec.breaks : [];
  return `<table class="move-states"><caption>before / after / breaks</caption>${STATES_HEAD}<tbody>${stateRows(rec)}`
    + `<tr class="breaks"><td>breaks</td><td colspan="2">${breaks.length
      ? `<ol>${breaks.map((b) => `<li>${esc(String(b))}</li>`).join("")}</ol>` : `<span class="muted">(none)</span>`}</td></tr>`
    + `</tbody></table>`;
}

// WHERE A BOUND MOVE CAME FROM (kogaki#1521): `library` or `this run`, read from the run record's
// `library.ids`; null for a run with no library, where every Move is the run's own.
export function moveSource(run, move) {
  const ids = run && run.library && run.library.ids;
  if (!ids || !move) return null;
  return (ids.library || []).includes(move) ? "library" : (ids.run || []).includes(move) ? "this run" : null;
}
function sourceBadge(run, move) {
  const src = moveSource(run, move);
  return src ? ` <span class="badge source">${esc(src)}</span>` : "";
}

// THE PARAGRAPH TABLES (kogaki#1487, owner 2026-10-21; plain tables since kogaki#1512, owner
// 2026-10-22): between the comparison table and the first card, three tables under their own
// headings, with no heading above them and nothing folded -- every paragraph's Segments table
// (by the Extraction card's own renderer), every `does-not-fit` verdict across the plan's
// attempts with the judge's `why` in full, and the bindings record with each bound Move's
// before and after in its row -- so a reader completes a review without opening a card. The
// before and after fold closed under `before / after`, one row per Leg Waypoint (kogaki#1516).
// Each paragraph's heading is followed by its bound Move's description (kogaki#1517).
function reviewBlock(r, idx) {
  const entries = (r.ingest && r.ingest.entries) || [];
  const bindings = readJson(join(r.jobDir, "paragraph-plan-bindings.json"));
  const rows = ((bindings && bindings.bindings) || []).filter((b) => !r.legId || !b.leg_id || b.leg_id === r.legId);
  // With a library, the heading also names the Move bound at the paragraph's Leg Waypoint and its source.
  const boundAt = (n) => {
    const b = r.run.library ? rows.find((x) => Number(x.waypoint) === n) : null;
    return b ? ` · bound ${esc(b.move || "(none bound)")}${sourceBadge(r.run, b.move)}` : "";
  };
  const segments = extractionParagraphs(r).map((p) => `<h4>paragraph ${p.i + 1} — ${esc((entries[p.i] && entries[p.i].move) || "(no Move)")}${boundAt(p.i + 1)}${COPY_BUTTON}</h4>`
    + moveDescription(r, entries[p.i] && entries[p.i].move) + moveObligationLine(r, p.i)
    + (p.file ? segmentsTable(p.segs, editedSegments(r, p.i + 1)) : `<p class="muted">(not written)</p>`)).join("");

  // An attempt with no readable judge verdict, or one the job record refused where the judge
  // named no does-not-fit, is a row too, carrying the job record's refusal: only an attempt
  // both readers agree passed leaves no row, so "no attempt was refused" is never a silence.
  const attempts = planAttempts(r.planCalls);
  const job = readJson(join(r.jobDir, "reader-path-job.json"));
  const unit = ((job && job.units) || [])[r.unitIndex || 0] || null;
  const jobRefusals = (unit && Array.isArray(unit.refusals)) ? unit.refusals : [];
  const refused = [];
  attempts.forEach((a, i) => {
    const v = a.judge ? callAnswer(a.judge) : null;
    const verdicts = v && v.record && Array.isArray(v.record.verdicts) ? v.record.verdicts : null;
    const jobSays = jobRefusals[i] !== undefined ? `the job record's refusal: ${jobRefusals[i]}` : "the job record holds no refusal for this attempt";
    if (verdicts === null) {
      refused.push({ n: i + 1, waypoint: "—", why: `${a.judge ? "the judge's answer carried no readable verdicts" : "no judge call was recorded"}; ${jobSays}` });
      return;
    }
    const notFit = verdicts.filter((x) => x && x.verdict === "does-not-fit");
    for (const x of notFit) refused.push({ n: i + 1, waypoint: x.waypoint, why: x.why || "" });
    if (!notFit.length && jobRefusals[i] !== undefined) refused.push({ n: i + 1, waypoint: "—", why: `the judge answered fits at every Leg Waypoint; ${jobSays}` });
  });
  const refusedHtml = !attempts.length ? `<p class="muted">No plan call was recorded.</p>`
    : !refused.length ? `<p>no attempt was refused</p>`
      : `<table class="refused"><thead><tr><th>attempt</th><th>Leg Waypoint</th><th>the judge's why</th></tr></thead><tbody>`
        + refused.map((x) => `<tr><td><a href="#${attemptId(x.n, idx)}">attempt ${x.n}</a></td><td>${esc(x.waypoint)}</td><td>${esc(x.why)}</td></tr>`).join("")
        + `</tbody></table>`;

  const bindingsHtml = rows.length
    ? `<table class="bindings"><thead><tr><th>Leg Waypoint</th><th>point</th><th>bound Move</th><th>why</th></tr></thead><tbody>`
      + rows.map((b) => `<tr><td>${esc(b.waypoint)}</td><td>${esc(legPoint(r, b.waypoint))}</td><td><a href="#card-${idx}-move">${esc(b.move || "(none bound)")}</a>${sourceBadge(r.run, b.move)}`
        + `<details class="states"><summary>before / after</summary>${moveStates(r, b.move)}</details></td><td>${esc(b.why || "")}</td></tr>`).join("")
      + `</tbody></table>`
    : `<p class="muted">No bindings record.</p>`;

  return `<section class="review" id="review-${idx}">`
    + `<h3>Segments</h3><div class="rpart segments">${segments}</div>`
    + `<h3>Refused attempts</h3><div class="rpart refused">${refusedHtml}</div>`
    + `<h3>Bindings</h3><div class="rpart bindings">${bindingsHtml}</div>`
    + `</section>`;
}

const CSS = `:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#d9d6cf;--accent:#8a3b12;--off:#fbe3d6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}}
:root[data-theme="dark"]{--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}
body{background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif;margin:0 auto;max-width:1400px;padding:16px}
.obligation{color:var(--accent);font-size:13px}
.card{border-top:2px solid var(--line);padding-top:12px;margin-bottom:40px}.meta,.muted,.prov{color:var(--muted);font-size:12px;font-weight:normal}
.run-conditions{border:1px solid var(--line);border-radius:4px;padding:8px;margin:10px 0}.run-conditions ul{margin:4px 0;padding-left:18px}
.pair{width:100%;border-collapse:collapse;margin-bottom:16px}.pair td,.pair th{border:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
.pair td{width:33%;white-space:pre-wrap}.pair td.pws{white-space:normal}.copy-table{margin-left:8px;font-size:11px}
.review{border:2px solid var(--line);border-radius:6px;padding:8px;margin:10px 0}.review>h3{font-size:16px;margin:10px 0 4px}.review h4{font-size:14px;margin:10px 0 4px}
.pcard{border:1px solid var(--line);border-radius:6px;padding:8px;margin:10px 0}.pcard>h3{font-size:16px;margin:4px 0}
details.part{margin:6px 0;padding:4px 8px;border:1px solid var(--line);border-radius:4px}details.part>summary{font-weight:bold;cursor:pointer}
details.sub{margin:4px 0 4px 8px}
.move-states{margin:6px 0}.move-states caption{text-align:left;font-weight:bold;font-size:13px}details.states{margin:4px 0}details.states>summary{cursor:pointer;color:var(--muted)}
details.prow{margin:4px 0;padding:4px 8px;border:1px solid var(--line);border-radius:4px}details.prow>summary{font-weight:bold;cursor:pointer}
details.prow.off{background:var(--off)}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:color-mix(in srgb,var(--line) 25%,transparent);padding:6px;max-height:480px;overflow:auto}
table{border-collapse:collapse;font-size:13px}td,th{border:1px solid var(--line);padding:3px 6px;vertical-align:top}.stop{color:var(--accent)}
.badge{display:inline-block;font-size:11px;border-radius:3px;padding:1px 6px;margin-left:4px;border:1px solid var(--line)}
.badge.copied,.badge.edited,.badge.source{color:var(--accent)}.badge.production{color:var(--muted)}.badge.substitute{color:var(--accent);border-color:var(--accent)}
.pcard.substitute{border-left:4px solid var(--accent)}
.diagram{margin-bottom:16px}.diagram .mermaid{max-height:220px}
.legend{list-style:none;display:flex;gap:14px;flex-wrap:wrap;margin:4px 0;padding:0;font-size:12px;color:var(--muted)}
.legend li{display:flex;align-items:center;gap:4px}
.swatch{display:inline-block;width:11px;height:11px;border-radius:2px;border:1px solid var(--line)}
.swatch.ownerInput{background:#e9e4d8}.swatch.modelWritten{background:#dce8df}.swatch.mechanical{background:#dbe3ef}
.anchors{margin:4px 0 0;font-size:12px}
.leg-block{border:2px solid var(--line);border-radius:6px;padding:8px;margin:16px 0}.leg-block>h3{font-size:17px;margin:4px 0}
.badge.derived{color:var(--accent)}.derived{margin:6px 0}.derived caption{text-align:left;font-weight:bold;font-size:13px}`;

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

function card(r, { provenance, mapHash, idx = 0 }) {
  const sectionPath = r.legId ? join(r.ws, "sections", `${r.legId}.md`) : null;
  const written = sectionPath ? read(sectionPath) : null;
  const writtenParas = written ? written.split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean) : [];
  const draftStop = r.stage("draft").stopped || r.run.stopped || null;

  const conditions = runConditionsLine(r);
  const comparison = comparisonTable(r, idx, { sectionPath, written, writtenParas, draftStop });

  const cards = [
    extractionCard(r, idx),
    moveCard(r, idx),
    briefCard(r, idx),
    paragraphPlanCard(r, idx),
    packetCard(r, idx),
    draftCard(r, idx, { sectionPath, written, writtenParas, draftStop }),
    runRecordCard(r, idx),
  ].join("");

  return `<section class="card"><h2>${esc(r.run.passage || "Leg")} <span class="meta">${esc(relFromRepo(r.runDir, REPO))}</span></h2>`
    + (r.run.stopped ? `<p class="stop">The run stopped at ${esc(r.run.stopped)}</p>` : "")
    + `<p class="library">${esc(libraryLine(r.run))}</p>`
    + `<p class="muted">Provenance map: ${esc(provenance)} · sha ${mapHash}</p>`
    + conditions + comparison + reviewBlock(r, idx) + cards + `</section>`;
}

// A RUN OF SEVERAL LEGS (see the header). A Leg block's Inputs link to the one Brief card.
function legsCard(r, { provenance, mapHash, idx = 0 }) {
  const blocks = r.run.legs.map((l, k) => {
    const v = legView(r, k);
    const vidx = `${idx}-${k + 1}`;
    const sectionPath = v.legId ? join(v.ws, "sections", `${v.legId}.md`) : null;
    const written = sectionPath ? read(sectionPath) : null;
    const writtenParas = written ? written.split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean) : [];
    const draftStop = (v.stage("draft").leg_id === v.legId && v.stage("draft").stopped) || (!written && r.run.stopped) || null;
    const shown = { sectionPath, written, writtenParas, draftStop };
    const body = comparisonTable(v, vidx, shown) + reviewBlock(v, vidx) + extractionCard(v, vidx) + moveCard(v, vidx)
      + paragraphPlanCard(v, vidx) + packetCard(v, vidx) + draftCard(v, vidx, shown);
    return `<section class="leg-block" id="leg-${vidx}"><h3>Leg ${k + 1} of ${r.run.legs.length} — ${esc(v.legId || "(no Leg in the Brief)")}`
      + ` <span class="meta">${esc(relFromRepo(join(r.runDir, l.copy), REPO))}</span></h3>`
      + body.split(`href="#card-${vidx}-brief"`).join(`href="#card-${idx}-brief"`) + `</section>`;
  });
  return `<section class="card"><h2>${esc(r.run.passage || "Legs")} <span class="meta">${esc(relFromRepo(r.runDir, REPO))}</span></h2>`
    + (r.run.stopped ? `<p class="stop">The run stopped at ${esc(r.run.stopped)}</p>` : "")
    + `<p class="library">${esc(libraryLine(r.run))}</p>`
    + `<p class="muted">Provenance map: ${esc(provenance)} · sha ${mapHash}</p>`
    + runConditionsLine(r) + briefCard(r, idx) + blocks.join("") + runRecordCard(r, idx) + `</section>`;
}

// BUILD THE SHEET. Returns `{ written }` or `{ error }`.
export function buildSheet({ runs, provenance, out }) {
  const mapText = read(provenance);
  if (mapText === null) return { error: `the provenance map at ${provenance} cannot be read` };
  const rows = provenanceRows(mapText);
  const missing = Object.values(SHEET_CELLS).filter((n) => !rows.has(n));
  if (missing.length) {
    return { error: `the provenance map at ${provenance} has no "${PROVENANCE_SECTION}" row for ${missing.map((m) => `"${m}"`).join(", ")} — a cell nobody can trace is not drawn` };
  }
  const mapHash = contentHash(mapText);
  const cards = runs.map((d, idx) => {
    const r = readRun(resolve(d));
    return (r.run.legs && r.run.legs.length > 1 ? legsCard : card)(r, { provenance, mapHash, idx });
  });
  const mermaidScript = `<script type="module">import mermaid from "${MERMAID_CDN}"; mermaid.initialize({ startOnLoad: true });</script>`;
  writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Leg Proof Sheet</title><style>${CSS}</style>${mermaidScript}</head><body><h1>Leg Proof Sheet</h1>`
    + pipelineDiagram(0)
    + `<p class="muted">One card per Leg run. Provenance map: ${esc(provenance)} · sha ${contentHash(mapText)}</p>${cards.join("")}${ANCHOR_SCRIPT}${COPY_SCRIPT}</body></html>\n`);
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
    process.stderr.write("leg-sheet: usage: node src/proof-sheet/leg-sheet.mjs build --run <Leg run directory> [--run <another>] --provenance <the provenance map> --out <sheet.html>\n");
    process.exit(1);
  }
  const r = buildSheet({ runs, provenance, out });
  if (r.error) { process.stderr.write(`leg-sheet: ${r.error}\n`); process.exit(1); }
  console.log(`sheet written: ${r.written}`);
}
