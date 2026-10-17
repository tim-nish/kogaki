#!/usr/bin/env node
// The Leg sheet — one card per artifact, in pipeline order, built from the run directory
// alone (kogaki#1401, owner decision 2026-10-16).
//
// WHAT IT SHOWS. A run-conditions line (the Audience, the settings, the model command and
// the run directory, each with its path and content hash — the Audience's text and the
// settings' values open from the line), then the original-beside-written comparison table,
// then seven cards in pipeline order: Extraction, Move, Brief, ParagraphPlan, Packet, Draft,
// Run record. The Brief and ParagraphPlan cards sit side by side in one row on a wide
// viewport and stack on a narrow one. Every card has the same four parts, in the same order:
// Output (the artifact file, open by default — a table of one row per paragraph for a
// per-paragraph artifact), Inputs (folded, a list of links to the cards this stage read, no
// content repeated), Prompt (folded, the recorded stdin as its instruction half and its input
// half — a stage with two calls shows one prompt per call, titled by what it produced) and
// Calls (folded, attempts and refusals, then every recorded call's stdin and stdout). Nothing
// is rendered twice: a card that needs another's content links to it instead.
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
  const legId = draft.leg_id || (briefRecord && briefRecord.reader_path && briefRecord.reader_path[0] && briefRecord.reader_path[0].leg_id) || null;
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
    if (text.endsWith(prompt.slice(a))) return { where, inserted: text.slice(a, text.length - b) };
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

// Every card carries one badge: production, or Proof Sheet substitute with a coloured left
// border and the note (if any) in the badge's title attribute.
function badgeSpan(key) {
  const b = SHEET_CELL_BADGE[key];
  if (!b) return "";
  const label = b.type === "substitute" ? "Proof Sheet substitute" : "production";
  return ` <span class="badge ${b.type}"${b.note ? ` title="${esc(b.note)}"` : ""}>${esc(label)}</span>`;
}

// A list of Inputs entries, each a link to another card on the same page and the path of
// what the stage read (kogaki#1401 acceptance: "every Inputs entry is a link to another
// card"). No input's content is repeated here.
function inputsList(entries, idx = 0) {
  if (!entries.length) return `<p class="muted">None drawn as a card.</p>`;
  return `<ul>${entries.map(([key, path]) => `<li><a href="#card-${idx}-${key}">${esc(SHEET_TITLES[key])}</a>${path ? ` <span class="meta">${esc(path)}</span>` : ""}</li>`).join("")}</ul>`;
}

// One card: Output (open by default), Inputs, Prompt, Calls, in that order.
function cardWrap(key, { output, inputs, prompt, calls }, idx = 0) {
  const name = SHEET_TITLES[key];
  const b = SHEET_CELL_BADGE[key];
  const cls = b && b.type === "substitute" ? "pcard substitute" : "pcard";
  return `<section class="${cls}" id="card-${idx}-${key}"><h3><b>${esc(name)}</b>${badgeSpan(key)}</h3>`
    + `<details class="part out" open><summary>Output</summary>${output}</details>`
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
// ParagraphPlan's plan and check calls), each titled by what it produced.
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
    return rec && Array.isArray(rec.segments) ? rec.segments.map((s) => String((s && s.does) || "").trim()) : [];
  } catch { return []; }
}
function segmentCount(moveText) { return moveSegments(moveText).length; }

// THE PER-PARAGRAPH ANCHOR IDS a written-paragraph cell links to, and every per-paragraph row
// carries (kogaki#1402): one id per card per paragraph number, scoped by the sheet's run index
// so two runs on one page never collide.
const anchorId = (card, n, idx) => `${card}-p${n}-${idx}`;

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

// THE PIPELINE DIAGRAM (kogaki#1402, owner reading 2026-10-16): one left-to-right flowchart,
// opening the run's section, mapping the sources (Passage, cut into Segments; Persona;
// Audience) onto the six artifacts in pipeline order, every node a link to where that material
// sits on the page. The artifact node names are the pipeline nouns SHEET_TITLES carries and
// nothing else (kogaki#1400). Mermaid is loaded from a pinned CDN; the diagram's own text is
// also written as a `<pre>` fallback, so a sheet opened offline still shows the graph as text.
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs";

function pipelineDiagram(idx) {
  const cardHref = (key) => `#card-${idx}-${key}`;
  const nodes = [
    ["Passage", `#comparison-${idx}`],
    ["Segments", cardHref("extraction")],
    ["Persona", "#run-conditions"],
    ["Audience", "#run-conditions"],
    ["Extraction", cardHref("extraction")],
    ["Move", cardHref("move")],
    ["Brief", cardHref("brief")],
    ["ParagraphPlan", cardHref("paragraphPlan")],
    ["Packet", cardHref("packet")],
    ["Draft", cardHref("draft")],
  ];
  const edges = [
    ["Passage", "Extraction"], ["Audience", "Extraction"], ["Segments", "Move"],
    ["Persona", "Brief"], ["Extraction", "Brief"],
    ["Move", "ParagraphPlan"], ["Brief", "ParagraphPlan"],
    ["Brief", "Packet"], ["ParagraphPlan", "Packet"],
    ["Packet", "Draft"],
  ];
  const nodeId = (name) => `${name}_${idx}`;
  const lines = ["flowchart LR"];
  for (const [name] of nodes) lines.push(`  ${nodeId(name)}["${name}"]`);
  for (const [a, b] of edges) lines.push(`  ${nodeId(a)} --> ${nodeId(b)}`);
  for (const [name, href] of nodes) lines.push(`  click ${nodeId(name)} "${href}"`);
  const text = lines.join("\n");
  return `<div class="diagram"><div class="mermaid">${esc(text)}</div>`
    + `<p class="muted">Diagram text (shown for a sheet without network access to Mermaid):</p>${pre(text)}</div>`;
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
  const pairs = [];
  for (let i = 0; i < n; i++) {
    const writtenCell = written ? `${esc(writtenParas[i] || "")}${anchorLinks(i + 1)}` : (i === 0 ? `<span class="stop">${esc(draftStop || "not written")}</span>` : "");
    pairs.push(`<tr><th>${i + 1}</th><td>${esc(r.paragraphs[i] || "")}</td><td>${writtenCell}</td></tr>`);
  }
  return `<table class="pair" id="comparison-${idx}"><thead><tr><th></th><th>Original Leg <span class="meta">${esc(rel(join(r.runDir, "leg.md")))} · sha ${contentHash(r.legText)}</span></th>`
    + `<th>Written Leg <span class="meta">${esc(rel(sectionPath))} · sha ${contentHash(written)}</span></th></tr></thead>`
    + `<tbody>${pairs.join("")}</tbody></table>`;
}

// CARD 1 — EXTRACTION. Output: one row per paragraph, its path, hash and file, with its
// Segments folded beside it. Inputs: none drawn as a card (the original paragraph is in
// the comparison table above, the Audience is in the run-conditions line). Prompt: one per
// paragraph. Calls: one group per paragraph, with its attempt count.
function extractionCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const n = r.paragraphs.length;
  const per = [];
  for (let i = 0; i < n; i++) {
    const name = r.extractions[i];
    const file = name ? join(r.runDir, "extract", name) : null;
    const text = file ? read(file) : null;
    const pdir = r.extractorRun ? join(r.extractorRun, `p${i + 1}`) : null;
    const promptText = pdir ? read(join(pdir, "prompt.md")) : null;
    const answer = pdir ? readJson(join(pdir, "answer.json")) : null;
    const attempts = pdir ? readJson(join(pdir, "attempts.json")) : null;
    const inputAt = promptText ? promptText.indexOf(JUDGE_INPUT_MARKER) : -1;
    const key = inputAt >= 0 ? promptText.slice(inputAt) : null;
    const calls = key ? r.extractCalls.filter((c) => String(c.stdin).includes(key)) : [];
    const segs = answer && Array.isArray(answer.segments) ? answer.segments : [];
    // THE RECORD, RENDERED (kogaki#1413): the Extraction file is a YAML record, shown here as
    // the Markdown `extractionMarkdown` renders, with the file itself folded beneath it.
    let rendered = null;
    if (text) { try { rendered = extractionMarkdown(parseYaml(text, file)); } catch { rendered = null; } }
    per.push({ i, file, text, rendered, promptText, calls, attempts, segs });
  }
  const pairsOf = (p) => (p.segs.length
    ? `<table><thead><tr><th>#</th><th>content clause</th><th>does</th><th>relation</th></tr></thead><tbody>`
      + p.segs.map((s, j) => `<tr><td>${j + 1}</td><td>${esc(s.content || "")}</td><td>${esc(s.does || "")}</td><td>${esc(s.relation || "")}</td></tr>`).join("")
      + `</tbody></table>`
    : `<p class="muted">No Segments.</p>`);
  const output = stageNote(r, "extract")
    + `<table class="rows"><thead><tr><th>paragraph</th><th>file</th></tr></thead><tbody>`
    + per.map((p) => `<tr id="${anchorId("extraction", p.i + 1, idx)}"><td>${p.i + 1}</td><td><p class="meta">${p.file ? esc(rel(p.file)) : "(not written)"} · sha ${contentHash(p.text)}</p>`
      + (p.file ? pre(p.rendered || p.text || "(not written)") + sub(`record file — ${esc(rel(p.file))}`, pre(p.text || "(not written)"))
        + sub("Segments", pairsOf(p)) : "") + `</td></tr>`).join("")
    + `</tbody></table>`;

  // The Prompt is the recorded stdin of each paragraph's first call, not the judge's
  // `prompt.md`: the recorder's stdin carries the CLI preamble the model actually read.
  const promptEntries = per.filter((p) => p.calls.length).map((p) => [`paragraph ${p.i + 1}`, p.calls[0].stdin]);
  const callsHtml = per.some((p) => p.calls.length)
    ? per.map((p) => sub(`paragraph ${p.i + 1} — attempts ${p.attempts ? p.attempts.attempts : "?"}`, callsBlock(p.calls, `paragraph ${p.i + 1} calls`, promptEntries.map(([t, x]) => [`Prompt, ${t}`, x])))).join("")
    : `<p class="muted">No recorded model calls.</p>`;

  return cardWrap("extraction", { output, inputs: inputsList([], idx), prompt: promptPart(promptEntries), calls: callsHtml }, idx);
}

// CARD 2 — MOVE. Output: one row per paragraph, its Move file's path, hash and content, with
// its ingest screen folded. Inputs: Extraction. No model call -- `tools/move_ingest.py` is mechanical.
function moveCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const entries = (r.ingest && r.ingest.entries) || [];
  const n = r.paragraphs.length;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const e = entries[i] || {};
    const mp = e.move ? join(r.runDir, "moves", `${e.move}${MOVE_RECORD_EXT}`) : null;
    const mt = mp ? read(mp) : null;
    rows.push(`<tr id="${anchorId("move", i + 1, idx)}"><td>${i + 1}</td><td><p class="meta">${mp ? esc(rel(mp)) : "(not written)"} · sha ${contentHash(mt)}</p>`
      + pre(mt || e.refusal || "(not written)") + (e.screen ? sub(`ingest entry — sha ${contentHash(e.screen)}`, pre(e.screen)) : "") + `</td></tr>`);
  }
  const output = stageNote(r, "ingest")
    + `<table class="rows"><thead><tr><th>paragraph</th><th>file</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  return cardWrap("move", {
    output,
    inputs: inputsList([["extraction", relFromRepo(join(r.runDir, "extract"), REPO)]], idx),
    prompt: `<p class="muted">No model call: <code>tools/move_ingest.py</code> <code>run_from_extraction</code> derives the Move mechanically.</p>`,
    calls: `<p class="muted">No model call.</p>`,
  }, idx);
}

// CARD 3 — BRIEF. Output: the Brief file, whole, with its path and hash. Inputs: Extraction (the reader state and claims the Leg Brief composer reads).
// Prompt/Calls: the composer's two calls, Reader start and Leg path, each titled by what it
// produced.
function briefCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const output = (r.briefText ? "" : stageNote(r, "brief"))
    + `<p class="meta">${esc(rel(r.briefPath))} · sha ${contentHash(r.briefText)}</p>` + pre(r.briefText || "(not written)");

  const readerStartMarker = "`leg_reader_start_unit` judgment point";
  const legPathMarker = "`leg_path_unit` judgment point";
  const named = [];
  let callsHtml = "";
  for (const [sub_, marker, title] of [["reader-start", readerStartMarker, "Brief, Reader start"], ["leg-path", legPathMarker, "Brief, Leg Waypoint"]]) {
    const d = r.legBriefRun ? join(r.legBriefRun, sub_) : null;
    const answer = d ? readJson(join(d, "answer.json")) : null;
    const attempts = d ? readJson(join(d, "attempts.json")) : null;
    const calls = r.briefCalls.filter((c) => String(c.stdin).includes(marker));
    if (calls.length) named.push([title, calls[0].stdin]);
    callsHtml += sub(`${title} — attempts ${attempts ? attempts.attempts : "?"}`,
      sub(`answer — sha ${contentHash(answer && json(answer))}`, pre(answer ? json(answer) : "(none)")) + pre(attempts ? json(attempts) : "(no attempts record)")
      + callsBlock(calls, `${title} calls`, named.map(([t, x]) => [`Prompt, ${t}`, x])));
  }
  return cardWrap("brief", {
    output,
    inputs: inputsList([["extraction", relFromRepo(join(r.runDir, "extract"), REPO)]], idx),
    prompt: promptPart(named),
    calls: callsHtml,
  }, idx);
}

// CARD 4 — PARAGRAPHPLAN. Output: the plan file, the check verdict as a line (not a card),
// and Leg Waypoint -> Paragraph Waypoints counts against the bound Move's Segments. Inputs:
// Brief, Move. Prompt/Calls: the plan call and the check call, each titled by what it
// produced.
function paragraphPlanCard(r, idx) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const job = readJson(join(r.jobDir, "reader-path-job.json"));
  const candFile = existsSync(r.jobDir) ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.candidate\.json$/.test(f)) : null;
  const specFile = existsSync(r.jobDir) ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.specialization\.json$/.test(f)) : null;
  const verdict = specFile ? read(join(r.jobDir, specFile)) : null;
  const genCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_plan"'));
  const judgeCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_judge"'));
  const planText = read(r.planPath);
  const bindings = readJson(join(r.jobDir, "paragraph-plan-bindings.json"));
  let plan = null;
  if (planText) { try { plan = parseYaml(planText, r.planPath); } catch { plan = null; } }
  const pl = plan && plan.legs && plan.legs[0];
  let verdictJson = null;
  try { verdictJson = verdict ? JSON.parse(verdict) : null; } catch { verdictJson = null; }
  const verdictLine = verdictJson && Array.isArray(verdictJson.verdicts)
    ? `Check verdict: ${verdictJson.verdicts.map((v) => `Leg Waypoint ${v.waypoint}: ${v.verdict}`).join("; ")}`
    : "Check verdict: (none recorded)";

  let countsTable = "";
  if (pl) {
    countsTable = `<table><thead><tr><th>Leg Waypoint</th><th>bound Move</th><th>Paragraph Waypoints</th><th>Segments of the Move</th></tr></thead><tbody>`
      + pl.waypoints.map((w) => {
        const bnd = ((bindings && bindings.bindings) || []).find((x) => x.waypoint === w.waypoint) || {};
        const segs = bnd.move ? segmentCount(read(join(r.runDir, "moves", `${bnd.move}${MOVE_RECORD_EXT}`))) : 0;
        const pws = w.paragraph_waypoints || [];
        return `<tr id="${anchorId("planwp", w.waypoint, idx)}"${pws.length !== segs ? ' class="off"' : ""}><td>${w.waypoint}</td><td>${esc(bnd.move || "?")}</td>`
          + `<td><ol>${pws.map((p) => `<li>${esc(p.point || "")}</li>`).join("")}</ol></td><td>${segs}</td></tr>`;
      }).join("") + `</tbody></table>`;
  }
  const output = (planText ? "" : stageNote(r, "paragraph-plan"))
    + `<p class="meta">${esc(rel(r.planPath))} · sha ${contentHash(planText)}</p>`
    + `<p>${esc(verdictLine)}</p>`
    + countsTable
    + sub("the file", pre(planText || "(not written)"))
    + sub("bindings", pre(bindings ? json(bindings) : "(none)"));

  const named = [];
  if (genCalls[0]) named.push(["ParagraphPlan, the plan call", genCalls[0].stdin]);
  if (judgeCalls[0]) named.push(["ParagraphPlan, the check call", judgeCalls[0].stdin]);

  const callsHtml = sub("the plan call — attempts and refusals",
      pre(job ? json({ state: job.state, units: (job.units || []).map((u) => ({ id: u.id, status: u.status, attempts: u.attempts, refusals: u.refusals || [] })) }) : "(none)")
      + callsBlock(genCalls, "plan calls", named.map(([t, x]) => [`Prompt, ${t}`, x])))
    + sub("the check call", callsBlock(judgeCalls, "check calls", named.map(([t, x]) => [`Prompt, ${t}`, x])));

  return cardWrap("paragraphPlan", {
    output,
    inputs: inputsList([["brief", rel(r.briefPath)], ["move", relFromRepo(join(r.runDir, "moves"), REPO)]], idx),
    prompt: promptPart(named),
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
    wpRows.push(`<tr id="${anchorId("packetwp", i, idx)}"><td>${i}</td><td>${b ? pre(b.text) : `<p class="muted">No block for this Leg Waypoint.</p>`}</td></tr>`);
  }
  const wpTable = n
    ? `<table class="rows"><thead><tr><th>Leg Waypoint</th><th>its block, as the Packet renders it</th></tr></thead><tbody>${wpRows.join("")}</tbody></table>`
    : "";
  const output = (packet ? "" : stageNote(r, "draft"))
    + `<p class="meta">${packetPath ? esc(rel(packetPath)) : "(not rendered)"} · sha ${contentHash(packet)}</p>`
    + wpTable
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
    rows.push(`<tr id="${anchorId("draft", i + 1, idx)}"><td>${i + 1}</td><td>${cellText}</td></tr>`);
  }
  const output = `<p class="meta">${sectionPath ? esc(rel(sectionPath)) : "(not written)"} · sha ${contentHash(written)}</p>`
    + `<table><thead><tr><th>paragraph</th><th>written text</th></tr></thead><tbody>${rows.join("")}</tbody></table>`
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

const CSS = `:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#d9d6cf;--accent:#8a3b12;--off:#fbe3d6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}}
:root[data-theme="dark"]{--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}
body{background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif;margin:0 auto;max-width:1400px;padding:16px}
.card{border-top:2px solid var(--line);padding-top:12px;margin-bottom:40px}.meta,.muted,.prov{color:var(--muted);font-size:12px;font-weight:normal}
.run-conditions{border:1px solid var(--line);border-radius:4px;padding:8px;margin:10px 0}.run-conditions ul{margin:4px 0;padding-left:18px}
.pair{width:100%;border-collapse:collapse;margin-bottom:16px}.pair td,.pair th{border:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
.pair td{width:50%;white-space:pre-wrap}.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:800px){.cols{grid-template-columns:1fr}}
.pcard{border:1px solid var(--line);border-radius:6px;padding:8px;margin:10px 0}.pcard>h3{font-size:16px;margin:4px 0}
details.part{margin:6px 0;padding:4px 8px;border:1px solid var(--line);border-radius:4px}details.part>summary{font-weight:bold;cursor:pointer}
details.sub{margin:4px 0 4px 8px}table.rows{width:100%}table.rows td:last-child{width:100%}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:color-mix(in srgb,var(--line) 25%,transparent);padding:6px;max-height:480px;overflow:auto}
table{border-collapse:collapse;font-size:13px}td,th{border:1px solid var(--line);padding:3px 6px;vertical-align:top}tr.off{background:var(--off)}.stop{color:var(--accent)}
.badge{display:inline-block;font-size:11px;border-radius:3px;padding:1px 6px;margin-left:4px;border:1px solid var(--line)}
.badge.production{color:var(--muted)}.badge.substitute{color:var(--accent);border-color:var(--accent)}
.pcard.substitute{border-left:4px solid var(--accent)}
.diagram{margin-bottom:16px}.diagram .mermaid{max-height:220px}
.anchors{margin:4px 0 0;font-size:12px}`;

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
    `<div class="cols">${briefCard(r, idx)}${paragraphPlanCard(r, idx)}</div>`,
    packetCard(r, idx),
    draftCard(r, idx, { sectionPath, written, writtenParas, draftStop }),
    runRecordCard(r, idx),
  ].join("");

  return `<section class="card"><h2>${esc(r.run.passage || "Leg")} <span class="meta">${esc(relFromRepo(r.runDir, REPO))}</span></h2>`
    + (r.run.stopped ? `<p class="stop">The run stopped at ${esc(r.run.stopped)}</p>` : "")
    + `<p class="muted">Provenance map: ${esc(provenance)} · sha ${mapHash}</p>`
    + conditions + comparison + cards + `</section>`;
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
  const cards = runs.map((d, idx) => card(readRun(resolve(d)), { provenance, mapHash, idx }));
  const mermaidScript = `<script type="module">import mermaid from "${MERMAID_CDN}"; mermaid.initialize({ startOnLoad: true });</script>`;
  writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Leg Proof Sheet</title><style>${CSS}</style>${mermaidScript}</head><body><h1>Leg Proof Sheet</h1>`
    + pipelineDiagram(0)
    + `<p class="muted">One card per Leg run. Provenance map: ${esc(provenance)} · sha ${contentHash(mapText)}</p>${cards.join("")}</body></html>\n`);
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
