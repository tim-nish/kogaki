#!/usr/bin/env node
// The Leg sheet — one card per Leg run, built from the run directory alone (kogaki#1386,
// owner decision 2026-10-15).
//
// WHAT IT SHOWS. At the top of each card, the original Leg beside the written Leg, paragraph
// by paragraph (one Leg Waypoint is one paragraph; the original is cut as The paragraph unit cuts it). Below, two columns of closed cells in
// pipeline order. Left: the Passage as the stages cut it, each paragraph's Extraction with its
// section 3 clause pairs, each Move with its ingest entry, the Audience, the Brief reduced to
// the fields the stages read. Right: the Leg Brief composer's two rows, the ParagraphPlan
// generator and judge, the ParagraphPlan file with its Paragraph Waypoint counts against the
// bound Move's Segment counts, the Packet, and the Writer. A cell for a model stage shows the
// prompt, the answer, the attempts and every recorded call; a stage with no model call says so.
//
// EVERY CELL IS ADMITTED BY A ROW OF THE PROVENANCE MAP. The map's "Cells of the Leg card"
// table has one row per cell this file draws (`SHEET_CELLS`), and each cell prints that row's
// label, its artifact and the content hash of what it shows. A map missing a row refuses the
// sheet, naming the rows it lacks — a cell nobody can trace is not drawn.
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
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { parseYaml } from "../yaml.mjs";
import { settingValue } from "../workflow/judge.mjs";
import { REPO } from "../workflow/run-record.mjs";
import { legParagraphs, sentencesOf } from "./extract.mjs";

export const PROVENANCE_SECTION = "## Cells of the Leg card";
export const SHEET_CELLS = {
  original: "Original Leg",
  written: "Written Leg",
  run: "Run record",
  passage: "Passage, cut into paragraphs and sentences",
  extraction: "Extraction",
  move: "Move",
  audience: "Audience",
  brief: "Brief, the fields the stages read",
  readerStart: "Leg Brief composer, Reader start",
  legPath: "Leg Brief composer, Leg path",
  generator: "ParagraphPlan generator",
  judge: "ParagraphPlan judge",
  plan: "ParagraphPlan file",
  packet: "Packet",
  writer: "Writer",
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

function callsBlock(calls, label = "recorded model calls") {
  if (!calls.length) return `<p class="muted">No ${esc(label)}.</p>`;
  return calls.map((c, i) => sub(`${label}: call ${i + 1} of ${calls.length} — exit ${c.exit}, at ${c.at}`,
    `${pre(`argv: ${JSON.stringify(c.argv)}`)}${sub("prompt (stdin)", pre(c.stdin))}${sub("answer (stdout)", pre(c.stdout))}`
    + (c.stderr ? sub("stderr", pre(c.stderr)) : ""))).join("");
}

const sub = (title, body) => `<details class="sub"><summary>${esc(title)}</summary>${body}</details>`;

// One cell: its label from the map, its artifact, the content hash of what it shows.
function cell(rows, key, { artifact, hashOf, body, suffix = "" }) {
  const name = SHEET_CELLS[key];
  const row = rows.get(name);
  return `<details class="cell"><summary><b>${esc(name)}${esc(suffix)}</b> <span class="meta">${esc(artifact)} · sha ${contentHash(hashOf)}</span></summary>`
    + `<p class="prov">provenance row: <code>${esc(row || "(none)")}</code></p>${body}</details>`;
}

function segmentCount(moveText) {
  const m = String(moveText || "").match(/^segments:[^\n]*\n((?:[ \t]+[^\n]*\n?)*)/m);
  return m ? m[1].split("\n").filter((l) => /^\s+\d+\.\s/.test(l)).length : 0;
}

function card(r, rows) {
  const rel = (p) => (p ? relative(r.runDir, p) || "." : "(none)");
  const sectionPath = r.legId ? join(r.ws, "sections", `${r.legId}.md`) : null;
  const written = sectionPath ? read(sectionPath) : null;
  const writtenParas = written ? written.split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean) : [];
  const draftStop = r.stage("draft").stopped || r.run.stopped || null;
  const n = Math.max(r.paragraphs.length, writtenParas.length);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    pairs.push(`<tr><th>${i + 1}</th><td>${esc(r.paragraphs[i] || "")}</td><td>${written ? esc(writtenParas[i] || "") : (i === 0 ? `<span class="stop">${esc(draftStop || "not written")}</span>` : "")}</td></tr>`);
  }
  const top = `<table class="pair"><thead><tr><th></th><th>${esc(SHEET_CELLS.original)} <span class="meta">leg.md · sha ${contentHash(r.legText)} · `
    + `provenance row: ${esc(rows.has(SHEET_CELLS.original) ? SHEET_CELLS.original : "(none)")}</span></th>`
    + `<th>${esc(SHEET_CELLS.written)} <span class="meta">${esc(rel(sectionPath))} · sha ${contentHash(written)} · provenance row: ${esc(rows.has(SHEET_CELLS.written) ? SHEET_CELLS.written : "(none)")}</span></th></tr></thead>`
    + `<tbody>${pairs.join("")}</tbody></table>`;

  const left = [];
  left.push(cell(rows, "passage", { artifact: "leg.md", hashOf: r.legText,
    body: `<p class="muted">No model call: the Harness's own cut (extract.mjs <code>legParagraphs</code>, <code>sentencesOf</code>). One sentence is one Segment.</p>`
      + r.paragraphs.map((p, i) => `<h4>Paragraph ${i + 1}</h4><ol>${sentencesOf(p).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`).join("") }));
  for (let i = 0; i < r.paragraphs.length; i++) {
    const file = r.extractions[i] ? join(r.runDir, "extract", r.extractions[i]) : null;
    const text = file ? read(file) : null;
    const pdir = r.extractorRun ? join(r.extractorRun, `p${i + 1}`) : null;
    const prompt = pdir ? read(join(pdir, "prompt.md")) : null;
    const answer = pdir ? readJson(join(pdir, "answer.json")) : null;
    const attempts = pdir ? readJson(join(pdir, "attempts.json")) : null;
    const inputAt = prompt ? prompt.indexOf("----- INPUT (JSON) -----") : -1;
    const key = inputAt >= 0 ? prompt.slice(inputAt) : null;
    const calls = key ? r.extractCalls.filter((c) => String(c.stdin).includes(key)) : [];
    const segs = answer && Array.isArray(answer.segments) ? answer.segments : [];
    const pairsTable = segs.length ? `<table><thead><tr><th>#</th><th>function</th><th>relation</th><th>content clause</th><th>generalized clause</th></tr></thead><tbody>`
      + segs.map((s, j) => `<tr><td>${j + 1}</td><td>${esc(s.function || "")}</td><td>${esc(s.relation || "")}</td><td>${esc(s.content || "")}</td><td>${esc(s.generalized || "")}</td></tr>`).join("")
      + `</tbody></table>` : `<p class="muted">No section 3 entries.</p>`;
    left.push(cell(rows, "extraction", { suffix: ` — paragraph ${i + 1}`, artifact: file ? rel(file) : "(not written)", hashOf: text,
      body: (text ? "" : stageNote(r, "extract")) + `<h4>Section 3, clause pairs</h4>${pairsTable}`
        + sub("the Extraction file", pre(text || "(not written)"))
        + sub(`prompt as rendered — ${pdir ? rel(join(pdir, "prompt.md")) : "none"} · sha ${contentHash(prompt)}`, pre(prompt || "(none)"))
        + sub(`answer — sha ${contentHash(answer && json(answer))}`, pre(answer ? json(answer) : "(none)"))
        + sub(`attempts — ${attempts ? attempts.attempts : "?"}`, pre(attempts ? json(attempts) : "(none)"))
        + callsBlock(calls) }));
  }
  const entries = (r.ingest && r.ingest.entries) || [];
  for (let i = 0; i < Math.max(entries.length, r.paragraphs.length); i++) {
    const e = entries[i] || {};
    const mp = e.move ? join(r.runDir, "moves", `${e.move}.md`) : null;
    const mt = mp ? read(mp) : null;
    left.push(cell(rows, "move", { suffix: ` — paragraph ${i + 1}`, artifact: mp ? rel(mp) : "(not written)", hashOf: mt,
      body: (mt ? "" : stageNote(r, "ingest")) + `<p class="muted">No model call: <code>tools/move_ingest.py</code> <code>run_from_extraction</code>, accepted into this run's library.</p>`
        + pre(mt || e.refusal || "(not written)")
        + sub(`ingest entry — ${e.extraction || "?"} · sha ${contentHash(e.screen)}`, pre(e.screen || "(none)")) }));
  }
  const audiencePath = resolve(REPO, r.run.audience || String(settingValue({ setting: "brief.audience_file" })));
  const audience = read(audiencePath);
  left.push(cell(rows, "audience", { artifact: relative(REPO, audiencePath), hashOf: audience, body: pre(audience || "(cannot be read)") }));
  const b = r.briefRecord || {};
  const leg = (b.reader_path || [])[0] || {};
  const reduced = r.briefRecord ? json({ reader_start: b.reader_start, compose_path: b.compose_path,
    leg: { leg_id: leg.leg_id, purpose: leg.purpose, reader_state_after: leg.reader_state_after, claims: leg.claims, waypoints: leg.waypoints } }) : null;
  left.push(cell(rows, "brief", { artifact: rel(r.briefPath), hashOf: r.briefText,
    body: (r.briefText ? "" : stageNote(r, "brief")) + pre(reduced || "(not written)") + sub("the whole Brief", pre(r.briefText || "(not written)")) }));

  const right = [];
  for (const [key, sub_, row] of [["readerStart", "reader-start", "leg_reader_start_unit"], ["legPath", "leg-path", "leg_path_unit"]]) {
    const d = r.legBriefRun ? join(r.legBriefRun, sub_) : null;
    const prompt = d ? read(join(d, "prompt.md")) : null;
    const answer = d ? readJson(join(d, "answer.json")) : null;
    const attempts = d ? readJson(join(d, "attempts.json")) : null;
    const marker = `\`${row}\` judgment point`;
    right.push(cell(rows, key, { artifact: d ? rel(join(d, "prompt.md")) : "(not run)", hashOf: prompt,
      body: (prompt ? "" : stageNote(r, "brief")) + sub("prompt as rendered", pre(prompt || "(none)"))
        + sub(`answer — sha ${contentHash(answer && json(answer))}`, pre(answer ? json(answer) : "(none)"))
        + sub(`attempts — ${attempts ? attempts.attempts : "?"}`, pre(attempts ? json(attempts) : "(none)"))
        + callsBlock(r.briefCalls.filter((c) => String(c.stdin).includes(marker))) }));
  }
  const job = readJson(join(r.jobDir, "reader-path-job.json"));
  const candFile = existsSync(r.jobDir) ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.candidate\.json$/.test(f)) : null;
  const specFile = existsSync(r.jobDir) ? readdirSync(r.jobDir).find((f) => /^reader-path-unit-.+\.specialization\.json$/.test(f)) : null;
  const candidate = candFile ? read(join(r.jobDir, candFile)) : null;
  const verdict = specFile ? read(join(r.jobDir, specFile)) : null;
  const genCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_plan"'));
  const judgeCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_judge"'));
  const unitPrompt = ((readJson(join(r.jobDir, "reader-path-job-units.json")) || {}).units || [])[0];
  right.push(cell(rows, "generator", { artifact: candFile ? rel(join(r.jobDir, candFile)) : "(no candidate)", hashOf: candidate,
    body: (candidate ? "" : stageNote(r, "paragraph-plan")) + sub("prompt as recorded by the job", pre(unitPrompt ? unitPrompt.prompt : "(none)"))
      + sub("answer", pre(candidate || "(none)"))
      + sub("attempts and refusals (the job record)", pre(job ? json({ state: job.state, units: (job.units || []).map((u) => ({ id: u.id, status: u.status, attempts: u.attempts, refusals: u.refusals || [] })) }) : "(none)"))
      + callsBlock(genCalls) }));
  right.push(cell(rows, "judge", { artifact: specFile ? rel(join(r.jobDir, specFile)) : "(no verdict)", hashOf: verdict,
    body: (verdict ? "" : stageNote(r, "paragraph-plan")) + sub("verdict", pre(verdict || "(none)")) + callsBlock(judgeCalls) }));
  const planText = read(r.planPath);
  const bindings = readJson(join(r.jobDir, "paragraph-plan-bindings.json"));
  let counts = "";
  if (planText) {
    let plan = null;
    try { plan = parseYaml(planText, r.planPath); } catch { plan = null; }
    const pl = plan && plan.legs && plan.legs[0];
    if (pl) {
      counts = `<table><thead><tr><th>Leg Waypoint</th><th>bound Move</th><th>Paragraph Waypoints</th><th>Segments of the Move</th></tr></thead><tbody>`
        + pl.waypoints.map((w) => {
          const bnd = ((bindings && bindings.bindings) || []).find((x) => x.waypoint === w.waypoint) || {};
          const segs = bnd.move ? segmentCount(read(join(r.runDir, "moves", `${bnd.move}.md`))) : 0;
          const k = (w.paragraph_waypoints || []).length;
          return `<tr${k !== segs ? ' class="off"' : ""}><td>${w.waypoint}</td><td>${esc(bnd.move || "?")}</td><td>${k}</td><td>${segs}</td></tr>`;
        }).join("") + `</tbody></table>`;
    }
  }
  right.push(cell(rows, "plan", { artifact: rel(r.planPath), hashOf: planText,
    body: (planText ? "" : stageNote(r, "paragraph-plan")) + `<p class="muted">No model call: written by <code>/paragraph-plan</code> from the job's candidates.</p>`
      + counts + sub("the file", pre(planText || "(not written)")) + sub("bindings", pre(bindings ? json(bindings) : "(none)")) }));
  const packetPath = r.legId ? join(r.ws, "packets", `${r.legId}.md`) : null;
  const packet = packetPath ? read(packetPath) : null;
  right.push(cell(rows, "packet", { artifact: packetPath ? rel(packetPath) : "(not rendered)", hashOf: packet,
    body: (packet ? "" : stageNote(r, "draft")) + `<p class="muted">No model call: rendered by <code>/draft</code> from the Brief and the ParagraphPlan file.</p>` + pre(packet || "(not rendered)") }));
  const writerCalls = r.draftCalls;
  const draftRun = read(join(r.ws, "run.json"));
  const same = writerCalls.length && packet !== null && writerCalls.every((c) => c.stdin === packet);
  right.push(cell(rows, "writer", { artifact: sectionPath ? rel(sectionPath) : "(not written)", hashOf: written,
    body: stageNote(r, "draft")
      + `<p>${writerCalls.length ? (same ? "Every recorded Writer call's prompt is the Packet, byte for byte, and nothing else." : `<span class="stop">A recorded Writer call's prompt is not the Packet.</span>`) : "No Writer call was recorded."}</p>`
      + sub("output", pre(written || "(not written)"))
      + sub("run record (/draft run.json)", pre(draftRun || "(none)"))
      + sub("commands", pre(json((readJson(join(r.runDir, "draft", "command.json")) || []).map((c) => ({ name: c.name, argv: c.argv, exit: c.exit, stdout: c.stdout, stderr: c.stderr })))))
      + callsBlock(writerCalls, "recorded Writer calls") }));
  const runText = read(join(r.runDir, "run.json"));
  right.push(cell(rows, "run", { artifact: "run.json", hashOf: runText, body: pre(runText || "(none)") }));

  return `<section class="card"><h2>${esc(r.run.passage || "Leg")} <span class="meta">${esc(r.runDir)}</span></h2>`
    + (r.run.stopped ? `<p class="stop">The run stopped at ${esc(r.run.stopped)}</p>` : "")
    + top + `<div class="cols"><div>${left.join("")}</div><div>${right.join("")}</div></div></section>`;
}

const CSS = `:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#d9d6cf;--accent:#8a3b12;--off:#fbe3d6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}}
:root[data-theme="dark"]{--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}
body{background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif;margin:0 auto;max-width:1400px;padding:16px}
.card{border-top:2px solid var(--line);padding-top:12px;margin-bottom:40px}.meta,.muted,.prov{color:var(--muted);font-size:12px;font-weight:normal}
.pair{width:100%;border-collapse:collapse;margin-bottom:16px}.pair td,.pair th{border:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
.pair td{width:50%;white-space:pre-wrap}.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:800px){.cols{grid-template-columns:1fr}}
details.cell{border:1px solid var(--line);border-radius:4px;margin:6px 0;padding:4px 8px}details.sub{margin:4px 0 4px 8px}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:color-mix(in srgb,var(--line) 25%,transparent);padding:6px;max-height:480px;overflow:auto}
table{border-collapse:collapse;font-size:13px}td,th{border:1px solid var(--line);padding:3px 6px;vertical-align:top}tr.off{background:var(--off)}.stop{color:var(--accent)}`;

// BUILD THE SHEET. Returns `{ written }` or `{ error }`.
export function buildSheet({ runs, provenance, out }) {
  const mapText = read(provenance);
  if (mapText === null) return { error: `the provenance map at ${provenance} cannot be read` };
  const rows = provenanceRows(mapText);
  const missing = Object.values(SHEET_CELLS).filter((n) => !rows.has(n));
  if (missing.length) {
    return { error: `the provenance map at ${provenance} has no "${PROVENANCE_SECTION}" row for ${missing.map((m) => `"${m}"`).join(", ")} — a cell nobody can trace is not drawn` };
  }
  const cards = runs.map((d) => card(readRun(resolve(d)), rows));
  writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Leg Proof Sheet</title><style>${CSS}</style></head><body><h1>Leg Proof Sheet</h1>`
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
