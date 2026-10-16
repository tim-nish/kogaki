#!/usr/bin/env node
// The Leg sheet — one card per Leg run, built from the run directory alone (kogaki#1386,
// owner decision 2026-10-15).
//
// WHAT IT SHOWS. At the top of each card, the original Leg beside the written Leg, paragraph
// by paragraph (one Leg Waypoint is one paragraph; the original is cut as The paragraph unit cuts it). Below, two columns of closed cells in
// pipeline order. Left: the Passage as the stages cut it, each paragraph's Extraction with its
// section 3 clause pairs, each Move with its ingest entry, the Audience, the Brief. Right: the
// Leg Brief composer's two calls, the ParagraphPlan's plan and check calls, the ParagraphPlan
// file with its Paragraph Waypoint counts against the bound Move's Segment counts, the Packet,
// and the Draft. A cell for a model stage shows the prompt, the answer, the attempts and every
// recorded call; a stage with no model call says so.
//
// EVERY PATH IS REPOSITORY-ROOT-RELATIVE (kogaki#1400, owner decision 2026-10-16), including
// the run directory itself, printed once in the card header. Every card and prompt cell carries
// one badge, `production` or `Proof Sheet substitute` (`SHEET_CELL_BADGE`), by stage.
//
// EVERY CELL IS ADMITTED BY A ROW OF THE PROVENANCE MAP. The map's "Cells of the Leg card"
// table has one row per cell this file draws (`SHEET_CELLS`). A map missing a row refuses the
// sheet, naming the rows it lacks — a cell nobody can trace is not drawn; the row's label is
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
import { legParagraphs, sentencesOf, EXTRACTION_TABLE } from "./extract.mjs";

export const PROVENANCE_SECTION = "## Cells of the Leg card";
export const SHEET_CELLS = {
  // Tier 1 -- the shared section: what the stages were given, none of what they produced.
  audience: "Audience",
  extractorPrompt: "Extraction",
  readerStartPrompt: "Brief, Reader start",
  legPathPrompt: "Brief, Leg Waypoint",
  generatorPrompt: "ParagraphPlan, the plan call",
  judgePrompt: "ParagraphPlan, the check call",
  writerPrompt: "Packet",
  settings: "Settings",
  run: "Run record",
  // Tier 2 -- the Leg card: everything the run holds at Leg grain.
  original: "Original Leg",
  written: "Written Leg",
  brief: "Brief",
  readerStart: "Brief, Reader start",
  legPath: "Brief, Leg Waypoint",
  generator: "ParagraphPlan, the plan call",
  judge: "ParagraphPlan, the check call",
  plan: "ParagraphPlan",
  packet: "Packet",
  writer: "Draft",
  // Tier 3 -- one card per paragraph.
  passage: "Passage, cut into sentences",
  extraction: "Extraction",
  move: "Move",
  waypoint: "Leg Waypoint",
  paragraphWaypoints: "Paragraph Waypoints",
};

// Every card and prompt cell carries one badge, production or Proof Sheet substitute
// (kogaki#1400, owner decision 2026-10-16). A substitute's note, where it has one,
// goes in the badge's title attribute.
export const SHEET_CELL_BADGE = {
  audience: { type: "production" },
  extractorPrompt: { type: "substitute" },
  readerStartPrompt: { type: "substitute", note: "production rows with declared substitutions" },
  legPathPrompt: { type: "substitute", note: "production rows with declared substitutions" },
  generatorPrompt: { type: "production" },
  judgePrompt: { type: "production" },
  writerPrompt: { type: "production" },
  settings: { type: "production" },
  run: { type: "production" },
  brief: { type: "substitute", note: "production rows with declared substitutions" },
  readerStart: { type: "substitute", note: "production rows with declared substitutions" },
  legPath: { type: "substitute", note: "production rows with declared substitutions" },
  generator: { type: "production" },
  judge: { type: "production" },
  plan: { type: "production" },
  packet: { type: "production" },
  writer: { type: "production" },
  passage: { type: "production" },
  extraction: { type: "substitute" },
  move: { type: "production", note: "production code, written into this run's own library" },
  waypoint: { type: "substitute" },
  paragraphWaypoints: { type: "production" },
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
const subOpen = (title, body) => `<details class="sub" open><summary>${esc(title)}</summary>${body}</details>`;

// Every card and prompt cell carries one badge: production, or Proof Sheet substitute
// with a coloured left border and the note (if any) in the badge's title attribute.
function badgeSpan(key) {
  const b = SHEET_CELL_BADGE[key];
  if (!b) return "";
  const label = b.type === "substitute" ? "Proof Sheet substitute" : "production";
  return ` <span class="badge ${b.type}"${b.note ? ` title="${esc(b.note)}"` : ""}>${esc(label)}</span>`;
}

// One cell: its label, its badge, its artifact (repository-root-relative), the content
// hash of what it shows.
function cell(key, { artifact, hashOf, body, suffix = "" }) {
  const name = SHEET_CELLS[key];
  const b = SHEET_CELL_BADGE[key];
  const cls = b && b.type === "substitute" ? "cell substitute" : "cell";
  return `<details class="${cls}"><summary><b>${esc(name)}${esc(suffix)}</b>${badgeSpan(key)} <span class="meta">${esc(artifact)} · sha ${contentHash(hashOf)}</span></summary>`
    + `${body}</details>`;
}

// A prompt cell for the shared tier: the instruction part (above the judge's input marker,
// or the whole prompt where there is none) open, the input part folded.
function promptCell(key, { artifact, promptText }) {
  if (promptText === null || promptText === undefined) {
    return cell(key, { artifact, hashOf: null, body: `<p class="muted">No model call was recorded.</p>` });
  }
  const at = promptText.indexOf(JUDGE_INPUT_MARKER);
  const instruction = at >= 0 ? promptText.slice(0, at) : promptText;
  const input = at >= 0 ? promptText.slice(at) : null;
  return cell(key, { artifact, hashOf: promptText,
    body: `${subOpen("instruction", pre(instruction))}${input !== null ? sub("input", pre(input)) : ""}` });
}

function moveSegments(moveText) {
  const m = String(moveText || "").match(/^segments:[^\n]*\n((?:[ \t]+[^\n]*\n?)*)/m);
  return m ? m[1].split("\n").filter((l) => /^\s+\d+\.\s/.test(l)).map((l) => l.replace(/^\s+\d+\.\s*/, "").trim()) : [];
}
function segmentCount(moveText) { return moveSegments(moveText).length; }

// TIER 1 -- the shared section: what the stages were given, none of what they produced.
function sharedTier(r, { provenance, mapHash }) {
  const relRun = (...segs) => relFromRepo(join(r.runDir, ...segs), REPO);
  const out = [];
  // THE AUDIENCE READS FROM THE RECORD ALONE (kogaki#1396): `run.json`'s own `audience` is
  // the path the run resolved and used, once, at its start. A record without it (an older
  // run, from before the run named the path it used) shows the cell as unreadable rather
  // than resolving a substitute from the live setting, which could have moved since.
  const audienceRel = r.run.audience || null;
  const audiencePath = audienceRel ? resolve(REPO, audienceRel) : null;
  const audience = audiencePath ? read(audiencePath) : null;
  out.push(["audience", { artifact: audiencePath ? relFromRepo(audiencePath, REPO) : "(unreadable: the run record names no audience)", hashOf: audience, body: pre(audience || "(cannot be read)") }, "cell"]);

  const readerStartMarker = "`leg_reader_start_unit` judgment point";
  const legPathMarker = "`leg_path_unit` judgment point";
  const readerStartCalls = r.briefCalls.filter((c) => String(c.stdin).includes(readerStartMarker));
  const legPathCalls = r.briefCalls.filter((c) => String(c.stdin).includes(legPathMarker));
  const genCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_plan"'));
  const judgeCalls = r.planCalls.filter((c) => String(c.stdin).includes('"leg_you_must_judge"'));
  const writerCalls = r.draftCalls;

  out.push(["extractorPrompt", { artifact: r.extractCalls.length ? `${relRun("extract", "calls.jsonl")} · paragraph 1` : "(no call)", promptText: r.extractCalls[0] ? r.extractCalls[0].stdin : null }, "prompt"]);
  out.push(["readerStartPrompt", { artifact: readerStartCalls.length ? `${relRun("brief", "calls.jsonl")} · reader-start` : "(no call)", promptText: readerStartCalls[0] ? readerStartCalls[0].stdin : null }, "prompt"]);
  out.push(["legPathPrompt", { artifact: legPathCalls.length ? `${relRun("brief", "calls.jsonl")} · leg-path` : "(no call)", promptText: legPathCalls[0] ? legPathCalls[0].stdin : null }, "prompt"]);
  out.push(["generatorPrompt", { artifact: genCalls.length ? `${relRun("paragraph-plan", "calls.jsonl")} · plan call` : "(no call)", promptText: genCalls[0] ? genCalls[0].stdin : null }, "prompt"]);
  out.push(["judgePrompt", { artifact: judgeCalls.length ? `${relRun("paragraph-plan", "calls.jsonl")} · check call` : "(no call)", promptText: judgeCalls[0] ? judgeCalls[0].stdin : null }, "prompt"]);
  out.push(["writerPrompt", { artifact: writerCalls.length ? relRun("draft", "calls.jsonl") : "(no call)", promptText: writerCalls[0] ? writerCalls[0].stdin : null }, "prompt"]);

  const table = readJson(EXTRACTION_TABLE);
  const settingsText = [
    `attempt bound (brief.unit_attempts): ${table ? settingValue(table.job.unit_attempts) : "(unreadable)"}`,
    `call limit, seconds (brief.call_limit_s): ${table ? settingValue(table.job.call_limit_s) : "(unreadable)"}`,
    `audience file (brief.audience_file): ${settingValue({ setting: "brief.audience_file" })}`,
  ].join("\n");
  out.push(["settings", { artifact: "kogaki.settings.json", hashOf: settingsText, body: pre(settingsText) }, "cell"]);
  const runText = read(join(r.runDir, "run.json"));
  out.push(["run", { artifact: relRun("run.json"), hashOf: runText, body: pre(runText || "(none)") }, "cell"]);
  return `<details class="tier"><summary>Shared — what the stages were given</summary>`
    + `<p class="muted">Provenance map: ${esc(provenance)} · sha ${mapHash}</p>`
    + out.map(([key, opts, kind]) => (kind === "prompt" ? promptCell(key, opts) : cell(key, opts))).join("")
    + `</details>`;
}

// TIER 2 -- the Leg card: everything the run holds at Leg grain.
function legCardTier(r, { sectionPath, written, writtenParas, draftStop }) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const n = Math.max(r.paragraphs.length, writtenParas.length);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    pairs.push(`<tr><th>${i + 1}</th><td>${esc(r.paragraphs[i] || "")}</td><td>${written ? esc(writtenParas[i] || "") : (i === 0 ? `<span class="stop">${esc(draftStop || "not written")}</span>` : "")}</td></tr>`);
  }
  const top = `<table class="pair"><thead><tr><th></th><th>${esc(SHEET_CELLS.original)} <span class="meta">${esc(rel(join(r.runDir, "leg.md")))} · sha ${contentHash(r.legText)}</span></th>`
    + `<th>${esc(SHEET_CELLS.written)} <span class="meta">${esc(rel(sectionPath))} · sha ${contentHash(written)}</span></th></tr></thead>`
    + `<tbody>${pairs.join("")}</tbody></table>`;

  const cells = [];
  const b = r.briefRecord || {};
  const leg = (b.reader_path || [])[0] || {};
  const reduced = r.briefRecord ? json({ reader_start: b.reader_start, compose_path: b.compose_path,
    leg: { leg_id: leg.leg_id, purpose: leg.purpose, reader_state_after: leg.reader_state_after, claims: leg.claims, waypoints: leg.waypoints } }) : null;
  cells.push(cell("brief", { suffix: " (rows derived from production with declared substitutions)", artifact: rel(r.briefPath), hashOf: r.briefText,
    body: (r.briefText ? "" : stageNote(r, "brief")) + pre(reduced || "(not written)") + sub("the whole Brief", pre(r.briefText || "(not written)")) }));

  const readerStartMarker = "`leg_reader_start_unit` judgment point";
  const legPathMarker = "`leg_path_unit` judgment point";
  for (const [key, sub_, marker] of [["readerStart", "reader-start", readerStartMarker], ["legPath", "leg-path", legPathMarker]]) {
    const d = r.legBriefRun ? join(r.legBriefRun, sub_) : null;
    const answer = d ? readJson(join(d, "answer.json")) : null;
    const attempts = d ? readJson(join(d, "attempts.json")) : null;
    cells.push(cell(key, { artifact: d ? rel(join(d, "answer.json")) : "(not run)", hashOf: answer && json(answer),
      body: (answer ? "" : stageNote(r, "brief")) + sub(`answer — sha ${contentHash(answer && json(answer))}`, pre(answer ? json(answer) : "(none)"))
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
  cells.push(cell("generator", { artifact: candFile ? rel(join(r.jobDir, candFile)) : "(no candidate)", hashOf: candidate,
    body: (candidate ? "" : stageNote(r, "paragraph-plan")) + sub("answer", pre(candidate || "(none)"))
      + sub("attempts and refusals (the job record)", pre(job ? json({ state: job.state, units: (job.units || []).map((u) => ({ id: u.id, status: u.status, attempts: u.attempts, refusals: u.refusals || [] })) }) : "(none)"))
      + callsBlock(genCalls) }));
  cells.push(cell("judge", { artifact: specFile ? rel(join(r.jobDir, specFile)) : "(no verdict)", hashOf: verdict,
    body: (verdict ? "" : stageNote(r, "paragraph-plan")) + sub("verdict", pre(verdict || "(none)")) + callsBlock(judgeCalls) }));
  const planText = read(r.planPath);
  const bindings = readJson(join(r.jobDir, "paragraph-plan-bindings.json"));
  let counts = "";
  let plan = null;
  if (planText) { try { plan = parseYaml(planText, r.planPath); } catch { plan = null; } }
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
  cells.push(cell("plan", { artifact: rel(r.planPath), hashOf: planText,
    body: (planText ? "" : stageNote(r, "paragraph-plan")) + `<p class="muted">No model call: written by <code>/paragraph-plan</code> from the job's candidates.</p>`
      + counts + sub("the file", pre(planText || "(not written)")) + sub("bindings", pre(bindings ? json(bindings) : "(none)")) }));
  const packetPath = r.legId ? join(r.ws, "packets", `${r.legId}.md`) : null;
  const packet = packetPath ? read(packetPath) : null;
  cells.push(cell("packet", { artifact: packetPath ? rel(packetPath) : "(not rendered)", hashOf: packet,
    body: (packet ? "" : stageNote(r, "draft")) + `<p class="muted">No model call: rendered by <code>/draft</code> from the Brief and the ParagraphPlan file.</p>` + pre(packet || "(not rendered)") }));
  const writerCalls = r.draftCalls;
  const draftRun = read(join(r.ws, "run.json"));
  const same = writerCalls.length && packet !== null && writerCalls.every((c) => c.stdin === packet);
  cells.push(cell("writer", { artifact: sectionPath ? rel(sectionPath) : "(not written)", hashOf: written,
    body: stageNote(r, "draft")
      + `<p>${writerCalls.length ? (same ? "Every recorded Draft call's prompt is the Packet, byte for byte, and nothing else." : `<span class="stop">A recorded Draft call's prompt is not the Packet.</span>`) : "No Draft call was recorded."}</p>`
      + sub("output", pre(written || "(not written)"))
      + sub("run record (/draft run.json)", pre(draftRun || "(none)"))
      + sub("commands", pre(json((readJson(join(r.runDir, "draft", "command.json")) || []).map((c) => ({ name: c.name, argv: c.argv, exit: c.exit, stdout: c.stdout, stderr: c.stderr })))))
      + callsBlock(writerCalls, "recorded Draft calls") }));

  return `<details class="tier leg" open><summary>Leg card</summary>${top}${cells.join("")}</details>`;
}

// TIER 3 -- one card per paragraph: original beside written, then Extraction/Move
// (left) beside the Leg Waypoint and Paragraph Waypoints (right). A paragraph with
// no Extraction shows the Extractor's stop on the left and nothing on the right.
function paragraphCard(r, i, { written, writtenParas, draftStop, planLeg, bindings }) {
  const rel = (p) => (p ? relFromRepo(resolve(p), REPO) : "(none)");
  const original = r.paragraphs[i] || "";
  const hasWritten = written !== null;
  const writtenPara = hasWritten ? (writtenParas[i] || "") : null;
  const top = `<table class="pair"><thead><tr><th></th><th>${esc(SHEET_CELLS.original)}</th><th>${esc(SHEET_CELLS.written)}</th></tr></thead>`
    + `<tbody><tr><th>${i + 1}</th><td>${esc(original)}</td><td>${hasWritten ? esc(writtenPara) : (i === 0 ? `<span class="stop">${esc(draftStop || "not written")}</span>` : "")}</td></tr></tbody></table>`;

  const file = r.extractions[i] ? join(r.runDir, "extract", r.extractions[i]) : null;
  if (!file) {
    const left = stageNote(r, "extract") || `<p class="stop">extract: not run for paragraph ${i + 1}</p>`;
    return `<details class="card para"><summary>Paragraph ${i + 1}</summary>${top}<div class="cols"><div>${left}</div><div></div></div></details>`;
  }
  const text = read(file);
  const pdir = r.extractorRun ? join(r.extractorRun, `p${i + 1}`) : null;
  const prompt = pdir ? read(join(pdir, "prompt.md")) : null;
  const answer = pdir ? readJson(join(pdir, "answer.json")) : null;
  const attempts = pdir ? readJson(join(pdir, "attempts.json")) : null;
  const inputAt = prompt ? prompt.indexOf(JUDGE_INPUT_MARKER) : -1;
  const key = inputAt >= 0 ? prompt.slice(inputAt) : null;
  const calls = key ? r.extractCalls.filter((c) => String(c.stdin).includes(key)) : [];
  const segs = answer && Array.isArray(answer.segments) ? answer.segments : [];
  const pairsTable = segs.length ? `<table><thead><tr><th>#</th><th>function</th><th>relation</th><th>content clause</th><th>generalized clause</th></tr></thead><tbody>`
    + segs.map((s, j) => `<tr><td>${j + 1}</td><td>${esc(s.function || "")}</td><td>${esc(s.relation || "")}</td><td>${esc(s.content || "")}</td><td>${esc(s.generalized || "")}</td></tr>`).join("")
    + `</tbody></table>` : `<p class="muted">No section 3 entries.</p>`;

  let left = cell("passage", { artifact: rel(join(r.runDir, "leg.md")), hashOf: original,
    body: `<p class="muted">No model call: the Harness's own cut (extract.mjs <code>legParagraphs</code>, <code>sentencesOf</code>). One sentence is one Segment.</p>`
      + `<ol>${sentencesOf(original).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` });
  left += cell("extraction", { artifact: rel(file), hashOf: text,
    body: `<h4>Section 3, clause pairs</h4>${pairsTable}`
      + sub("the Extraction file", pre(text || "(not written)"))
      + sub(`answer — sha ${contentHash(answer && json(answer))}`, pre(answer ? json(answer) : "(none)"))
      + sub(`attempts — ${attempts ? attempts.attempts : "?"}`, pre(attempts ? json(attempts) : "(none)"))
      + callsBlock(calls) });
  const entries = (r.ingest && r.ingest.entries) || [];
  const e = entries[i] || {};
  const mp = e.move ? join(r.runDir, "moves", `${e.move}.md`) : null;
  const mt = mp ? read(mp) : null;
  left += cell("move", { artifact: mp ? rel(mp) : "(not written)", hashOf: mt,
    body: (mt ? "" : stageNote(r, "ingest")) + `<p class="muted">No model call: <code>tools/move_ingest.py</code> <code>run_from_extraction</code>, accepted into this run's library.</p>`
      + pre(mt || e.refusal || "(not written)")
      + sub(`ingest entry — ${e.extraction || "?"} · sha ${contentHash(e.screen)}`, pre(e.screen || "(none)")) });

  const b = r.briefRecord || {};
  const leg = (b.reader_path || [])[0] || {};
  const w = (leg.waypoints || [])[i] || null;
  let right = cell("waypoint", { artifact: rel(r.briefPath), hashOf: w && json(w), body: pre(w ? json(w) : "(not written)") });
  const pw = planLeg ? (planLeg.waypoints || []).find((ww) => ww.waypoint === i + 1) : null;
  const bnd = pw ? ((bindings && bindings.bindings) || []).find((x) => x.waypoint === i + 1) || {} : {};
  const moveSegs = bnd.move ? moveSegments(read(join(r.runDir, "moves", `${bnd.move}.md`))) : [];
  const pws = (pw && pw.paragraph_waypoints) || [];
  right += cell("paragraphWaypoints", { artifact: rel(r.planPath), hashOf: json(pws),
    body: `<table><thead><tr><th>#</th><th>Paragraph Waypoint</th><th>Segment of ${esc(bnd.move || "?")}</th></tr></thead><tbody>`
      + pws.map((p, j) => `<tr><td>${j + 1}</td><td>${esc(p.point || "")}</td><td>${esc(moveSegs[j] || "(none)")}</td></tr>`).join("")
      + `</tbody></table>` });
  right += `<p class="muted">Written paragraph ${i + 1} again:</p><p>${hasWritten ? esc(writtenPara) : "(not written)"}</p>`;

  return `<details class="card para"><summary>Paragraph ${i + 1}</summary>${top}<div class="cols"><div>${left}</div><div>${right}</div></div></details>`;
}

function card(r, { provenance, mapHash }) {
  const sectionPath = r.legId ? join(r.ws, "sections", `${r.legId}.md`) : null;
  const written = sectionPath ? read(sectionPath) : null;
  const writtenParas = written ? written.split(/\n[ \t]*\n/).map((p) => p.trim()).filter(Boolean) : [];
  const draftStop = r.stage("draft").stopped || r.run.stopped || null;

  const planText = read(r.planPath);
  let plan = null;
  if (planText) { try { plan = parseYaml(planText, r.planPath); } catch { plan = null; } }
  const planLeg = plan && plan.legs && plan.legs[0];
  const bindings = readJson(join(r.jobDir, "paragraph-plan-bindings.json"));

  const shared = sharedTier(r, { provenance, mapHash });
  const legCard = legCardTier(r, { sectionPath, written, writtenParas, draftStop });
  const n = Math.max(r.paragraphs.length, writtenParas.length);
  const paragraphs = [];
  for (let i = 0; i < n; i++) paragraphs.push(paragraphCard(r, i, { written, writtenParas, draftStop, planLeg, bindings }));

  return `<section class="card"><h2>${esc(r.run.passage || "Leg")} <span class="meta">${esc(relFromRepo(r.runDir, REPO))}</span></h2>`
    + (r.run.stopped ? `<p class="stop">The run stopped at ${esc(r.run.stopped)}</p>` : "")
    + shared + legCard + paragraphs.join("") + `</section>`;
}

const CSS = `:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a65;--line:#d9d6cf;--accent:#8a3b12;--off:#fbe3d6}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}}
:root[data-theme="dark"]{--bg:#1a1a18;--fg:#e9e7e2;--muted:#a19f98;--line:#3a3935;--accent:#f0a070;--off:#4a2a1c}
body{background:var(--bg);color:var(--fg);font:15px/1.55 system-ui,sans-serif;margin:0 auto;max-width:1400px;padding:16px}
.card{border-top:2px solid var(--line);padding-top:12px;margin-bottom:40px}.meta,.muted,.prov{color:var(--muted);font-size:12px;font-weight:normal}
.pair{width:100%;border-collapse:collapse;margin-bottom:16px}.pair td,.pair th{border:1px solid var(--line);padding:8px;vertical-align:top;text-align:left}
.pair td{width:50%;white-space:pre-wrap}.cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}@media (max-width:800px){.cols{grid-template-columns:1fr}}
details.cell{border:1px solid var(--line);border-radius:4px;margin:6px 0;padding:4px 8px}details.sub{margin:4px 0 4px 8px}
details.tier{margin:10px 0}details.tier>summary{font-size:18px;font-weight:bold;cursor:pointer}
details.card.para{border:1px solid var(--line);border-radius:6px;padding:8px;margin:10px 0}details.card.para>summary{font-size:16px;font-weight:bold;cursor:pointer}
pre{white-space:pre-wrap;word-break:break-word;font-size:12px;background:color-mix(in srgb,var(--line) 25%,transparent);padding:6px;max-height:480px;overflow:auto}
table{border-collapse:collapse;font-size:13px}td,th{border:1px solid var(--line);padding:3px 6px;vertical-align:top}tr.off{background:var(--off)}.stop{color:var(--accent)}
.badge{display:inline-block;font-size:11px;border-radius:3px;padding:1px 6px;margin-left:4px;border:1px solid var(--line)}
.badge.production{color:var(--muted)}.badge.substitute{color:var(--accent);border-color:var(--accent)}
details.cell.substitute{border-left:4px solid var(--accent)}`;

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
  const cards = runs.map((d) => card(readRun(resolve(d)), { provenance, mapHash }));
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
