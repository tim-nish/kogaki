// The Feedback-Loop Playground (FLP, kogaki#1756, kogaki#1758, kogaki#1762): one Leg of a ParagraphPlan run, or
// one Candidate of a Brief compose run, read from the run directory alone, one block per Round, every Round of a
// sheet holding the same blocks in the same order.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Feedback-Loop Playground, Round, Submission, Comment, Binding, Call, the Call Record,
//   the Mapping Record, the Candidate sheet
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { relFromRepo, REPO } from "../workflow/run-record.mjs";
import { callRows, callsRoot, readCallRecord, firstCallSecondsOf } from "../workflow/call-record.mjs";
import { readReaderPathJob, readerPathJobPath } from "../workflow/detached-job.mjs";
import { readJudgePrompt } from "../workflow/judge.mjs";
import { readMappingState, unitIdFor } from "../paragraph-plan.mjs";
import { moveContract, CAST_KEYS } from "../compose.mjs";
import { proofSheetCss } from "../mapping-playground/sheet.mjs";
import { movePassage, NO_RECORD } from "./provenance.mjs";

// The run's start record, written by /paragraph-plan beside the job record.
export const START_FILE = "paragraph-plan-start.json";
export const STATUS_TAGS = ["passed", "refused", "stopped", "not reached"];
// THE ONLY HEADINGS A TABLE ON THE SHEET STANDS UNDER (specs/spec-draft-pipeline/SPEC.md §"The Feedback-Loop Playground (FLP)").
export const TABLE_HEADINGS = ["Brief's point", "Structure", "Round n", "Binding", "Submission", "Comment", "Calls",
  "Candidate <id>", "Leg", "Move", "Purpose", "Leg Waypoints", "Case"];
export const ROUND_BLOCKS = ["Binding", "Submission", "Comment", "Calls"];
export const CANDIDATE_ROUND_BLOCKS = ["Submission", "Comment", "Calls"];
export const ROUND_DEFINITION = "A Round is one Submission at one Leg Waypoint, the Judge's verdict on it and, where the verdict "
  + "refuses it, the Comment it drew. A Call is one model call under this Leg's unit: bind, write, judge, site retry, "
  + "suffix, reading or grounding.";
export const CANDIDATE_ROUND_DEFINITION = "A Round is one Candidate composed by one compose Call, the Judge's fit verdict on each of its "
  + "Legs and, where a Leg does not fit its Move, the Comment it drew. A Call is one model call under this unit: compose or judge.";
export const NO_TABLE = "no Mapping Table was grounded for this Move";
export { NO_RECORD };
// The validator a refusal record names, else the one the declaring module runs at that phase.
const PHASE_VALIDATORS = { compose: "validateParagraphPlanUnit", site: "validateParagraphPlanSite", suffix: "validateParagraphPlanSuffix" };
const ACCENT = ':root[data-theme="dark"]{--accent:#e0a458;--off:#3d2c14}h1,h2{color:var(--accent)}'
  + ".tag{display:inline-block;padding:1px 8px;border-radius:4px;font-weight:600}"
  + ".tag-passed{background:#1f4d2b}.tag-refused{background:#6b1d1d}.tag-stopped{background:#5a3a12}.tag-not-reached{background:#2a2a2a}"
  + "tr.named td,td.named{background:#4a3a12}.refusal{white-space:pre-wrap}.line{margin:.15em 0}td p{margin:.1em 0}"
  + "h3.round{font-size:1.05em;margin:1.4em 0 .3em;border-top:1px solid #444;padding-top:.6em}"
  + "h4.th{font-size:.8em;text-transform:uppercase;letter-spacing:.05em;margin:.8em 0 .2em;color:#9aa}";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const none = (what) => `<p class="muted">${esc(what)}</p>`;
const line = (text, cls = "line") => `<p class="${cls}">${esc(text)}</p>`;
const tag = (t, text = t) => `<span class="tag tag-${t.replace(/ /g, "-")}">${esc(text)}</span>`;
const pointText = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `performs: ${p.performs}` : String(p.point ?? ""));
const heading = (name) => {
  if (!TABLE_HEADINGS.includes(name)) throw new Error(`the FLP has no heading ${JSON.stringify(name)}`);
  return `<h4 class="th">${esc(name)}</h4>`;
};
const link = (outDir, path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

// The unit's status, a `running` unit whose supervisor is gone read as `stopped`.
export function unitStatus(job, unit) {
  if (!unit) return "not started";
  return unit.status === "running" && !pidAlive(job.supervisor_pid) ? "stopped" : unit.status;
}

// The Leg Waypoints a refusal text names, in the `Leg <id>, Waypoint <n>` or leading `Waypoint <n>` form.
export function namedWaypoints(text) {
  return [...new Set([...String(text).matchAll(/(?:^|Leg [^,\s]+, )Waypoint (\d+)/gm)].map((m) => Number(m[1])))];
}

// A refusal record's text at Leg Waypoint `n`: a judge's per-site text where it carries one, else the whole text.
function refusalAt(refusal, n) {
  if (!refusal) return null;
  const sites = Array.isArray(refusal.sites) ? refusal.sites : null;
  if (sites && sites.length) {
    const hit = sites.find((s) => (s && typeof s === "object" ? Number(s.waypoint) : Number(s)) === n);
    if (!hit) return null;
    return typeof hit === "object" && hit.refusal ? String(hit.refusal) : String(refusal.text);
  }
  return namedWaypoints(refusal.text).includes(n) ? String(refusal.text) : null;
}

const isStopped = (rec) => Boolean(rec.refusal && /\bper-call limit\b/.test(String(rec.refusal.text)));

// THE UNIT'S CALLS, oldest first, each with its kind, the entries its answer carries by Leg Waypoint, a judge's
// verdicts and its refusal record.
export function unitCalls(runDir, unitId, { mapped = false } = {}) {
  return callRows(callsRoot(runDir)).filter((r) => r.unit === unitId).map((r) => {
    const rec = readCallRecord(r.dir);
    const phase = rec.row && rec.row.phase;
    const a = rec.answer;
    const input = readJudgePrompt(rec.prompt).input || {};
    const entries = new Map();
    const verdicts = new Map();
    if (phase === "fit") { for (const v of (a && Array.isArray(a.verdicts) ? a.verdicts : [])) verdicts.set(Number(v.waypoint), v); }
    else if (a && Array.isArray(a.waypoints)) { for (const e of a.waypoints) if (e && e.waypoint !== undefined) entries.set(Number(e.waypoint), e); }
    else if (a && a.waypoint !== undefined) entries.set(Number(a.waypoint), a);
    const site = input.leg_waypoint_you_must_plan ? Number(input.leg_waypoint_you_must_plan.waypoint) : null;
    const tabled = input.leg_you_must_plan && Array.isArray(input.leg_you_must_plan.waypoints)
      && input.leg_you_must_plan.waypoints.some((w) => w && Object.hasOwn(w, "table"));
    const kind = isStopped(rec) ? "stopped"
      : phase === "fit" ? "judge" : phase === "site" ? "site retry" : phase === "suffix" ? "suffix"
        : mapped && !tabled ? "bind" : "write";
    return { n: r.n, dir: r.dir, phase, kind, site, refusal: rec.refusal, entries, verdicts };
  });
}

// THE ROUNDS AT LEG WAYPOINT `n`, read from the Call Records alone. A write or site retry Call whose answer carries
// an entry here, or whose refusal names this Leg Waypoint, opens a Round; a validator's refusal is that Round's
// Comment, and the next judge Call naming this Leg Waypoint gives the open Round its verdict. Bind, suffix and
// stopped Calls open none.
export function roundsAt(calls, n, status) {
  const rounds = [];
  for (const c of calls) {
    if (c.phase === "fit") {
      const v = c.verdicts.get(n);
      const open = rounds[rounds.length - 1];
      if (!v || !open || open.verdict) continue;
      open.verdict = { kind: "judge", record: v };
      open.calls.push({ label: `Call ${c.n}`, kind: c.kind });
      open.comment = { text: (v.verdict !== "fits" && refusalAt(c.refusal, n)) || String(v.why ?? ""), source: "the Judge" };
      continue;
    }
    if (c.kind !== "write" && c.kind !== "site retry") continue;
    if (c.kind === "site retry" && c.site !== n) continue;
    const entry = c.entries.get(n) ?? null;
    const text = refusalAt(c.refusal, n);
    if (!entry && text === null) continue;
    const prev = rounds[rounds.length - 1];
    if (prev && !prev.verdict) prev.verdict = { kind: "not judged", reason: `Call ${c.n} wrote the next Submission before the Judge read this one.` };
    const round = { number: rounds.length + 1, entry, call: c, calls: [{ label: `Call ${c.n}`, kind: c.kind }], verdict: null, comment: null };
    if (text !== null) {
      round.verdict = { kind: "refused before the Judge" };
      round.comment = { text, source: (c.refusal && c.refusal.validator) || PHASE_VALIDATORS[c.phase] || "the validator" };
    }
    rounds.push(round);
  }
  const last = rounds[rounds.length - 1];
  if (last && !last.verdict) {
    last.verdict = { kind: "not judged", reason: status === "done" ? "No judge Call of this unit names this Leg Waypoint."
      : status === "running" ? "The Judge has not read this Submission yet."
        : "The unit stopped before the Judge read this Submission." };
  }
  return rounds;
}

// THE LOCATIONS A COMMENT NAMES: Paragraph Waypoints, by `Paragraph Waypoint n`, `point n` or a quotation of one
// whole point (a quoted expression inside a point names none); and Segments, by `Segment n`.
export function namedLocations(text, entry) {
  const t = String(text);
  const nums = (re) => [...t.matchAll(re)].map((m) => Number(m[1]));
  const waypoints = [...nums(/\bParagraph Waypoint (\d+)\b/g), ...nums(/\bpoint (\d+)\b/g)];
  const points = (entry && entry.paragraph_waypoints) || [];
  const quoted = [...t.matchAll(/"([^"]{12,})"/g)].map((m) => m[1]);
  points.forEach((p, i) => { const s = pointText(p).trim(); if (s && quoted.some((q) => q.trim() === s)) waypoints.push(i + 1); });
  const sorted = (xs) => [...new Set(xs)].filter((k) => k >= 1).sort((a, b) => a - b);
  return { waypoints: sorted(waypoints), segments: sorted(nums(/\bSegment (\d+)\b/g)) };
}

const namesLine = ({ waypoints, segments }) => [...waypoints.map((k) => `Paragraph Waypoint ${k}`), ...segments.map((k) => `Segment ${k}`)].join(", ") || "none named";

// The status line of a Leg Waypoint, and its tag.
export function waypointStatus(status, n, lastNamed, rounds) {
  const last = rounds[rounds.length - 1];
  if (!last) return { tag: "not reached", text: "not reached" };
  const k = last.number;
  const stopped = status === "refused" || status === "died" || status === "stopped";
  if (last.verdict.kind === "judge" && last.verdict.record.verdict === "fits") return { tag: "passed", text: `passed in Round ${k}` };
  if (status === "done") return { tag: "passed", text: `passed in Round ${k}` };
  if (stopped && (lastNamed.includes(n) || last.verdict.kind === "not judged")) return { tag: "stopped", text: `stopped after Round ${k}` };
  if (last.verdict.kind === "not judged") return { tag: "not reached", text: `Round ${k} awaits the Judge` };
  return { tag: "refused", text: `refused through Round ${k}` };
}

// The Segments table of one Submission, with no caption; a named Paragraph Waypoint's row and a named Segment's
// operation cell highlighted.
function submissionTable(library, entry, named) {
  const c = moveContract(entry.move, resolve(REPO, library));
  const segments = c.error ? [] : c.segments;
  const points = entry.paragraph_waypoints || [];
  const castOf = (p) => Object.keys(CAST_KEYS).filter((k) => p.cast && p.cast[k] === true);
  const pointCell = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `<i>${esc(p.performs)}</i>` : esc(p.point));
  const field = (sg, k) => (sg && typeof sg[k] === "string" ? esc(sg[k]) : "");
  const rows = new Set(named.waypoints);
  const cells = new Set(named.segments);
  return (c.error ? line(c.error, "stop") : "")
    + "<table><thead><tr><th>#</th><th>operation</th><th>relation</th><th>manner</th><th>point</th><th>cast</th></tr></thead><tbody>"
    + Array.from({ length: Math.max(segments.length, points.length) }, (_, i) => `<tr${rows.has(i + 1) ? ' class="named"' : ""}><td>${i + 1}</td>`
      + `<td${cells.has(i + 1) ? ' class="named"' : ""}>${field(segments[i], "operation")}</td><td>${field(segments[i], "relation")}</td><td>${field(segments[i], "manner")}</td>`
      + `<td>${pointCell(points[i])}</td><td>${points[i] ? esc(castOf(points[i]).join(", ")) : ""}</td></tr>`).join("")
    + "</tbody></table>";
}

// THE MOVE LINE: the id linking to its file in the library, and its Corpus passage where an extraction record on
// this machine names the Move (kogaki#1762).
function moveLine(move, { library, outDir, corpusDir }) {
  if (!move) return line("Move: none read");
  const file = resolve(REPO, library, `${move}.yaml`);
  const p = movePassage(move, corpusDir ? { corpusDir } : {});
  const passage = !p ? esc(NO_RECORD)
    : !p.file ? esc(`passage ${p.passage}, paragraph ${p.paragraph} — no passage file on this machine`)
      : p.span ? `${link(outDir, p.file, `${relFromRepo(p.file)}:${p.line}`)} ${esc(`lines ${p.span.first}–${p.span.last}`)}`
        : esc(`${relFromRepo(p.file)} holds no paragraph ${p.paragraph}`);
  return `<p class="line">Move: ${link(outDir, file, move)}</p><p class="line">passage: ${passage}</p>`;
}

// The Binding of a Round: the Move, `join`, and the Mapping Table grounded for that Move where one was.
function bindingOf(round, n, calls, mapping, groundingCalls) {
  const move = round.entry ? round.entry.move ?? null : null;
  const table = mapping && mapping.tables ? mapping.tables[String(n)] : null;
  const grounded = Boolean(table && move && table.move === move);
  const binder = round.call.kind === "write" && !mapping ? null
    : [...calls].reverse().find((c) => c.kind === "bind" && c.n < round.call.n && c.entries.has(n) && c.entries.get(n).move === move) || null;
  return { move, join: round.entry ? round.entry.join ?? "none" : "none", table: grounded ? table : null,
    bindCall: binder ? { label: `Call ${binder.n}`, kind: binder.kind } : null, groundedBy: grounded ? groundingCalls : [] };
}

// ONE STRUCTURE TABLE: Role, Abstract, Attribute, and the Expression the Mapping Table grounds for each Role, under
// the `Base:` line; the Expression column empty, under the line saying so, where no table was grounded.
function structureTable(structure, table) {
  const expr = new Map((table && table.correspondences || []).map((x) => [x.role, x.expression]));
  const roles = (structure && structure.roles) || [];
  return (table ? line(`Base: ${(table.base && table.base.domain) ?? ""}`) : line(NO_TABLE, "line stop"))
    + "<table><thead><tr><th>Role</th><th>Abstract</th><th>Attribute</th><th>Expression</th></tr></thead><tbody>"
    + roles.map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.context)}</td><td>${esc((r.attributes || []).join(", "))}</td><td>${esc(expr.get(r.id) ?? "")}</td></tr>`).join("")
    + "</tbody></table>";
}

function structureAt(mapping, n) {
  const k = String(n);
  return mapping && mapping.structures && (mapping.structures[k] || (mapping.read_from && mapping.structures[String(mapping.read_from[k])])) || null;
}

// The Comment block, one labelled line each: the verdict, the text verbatim, its source and the locations it names.
function commentHtml(verdict, comment, named) {
  const v = verdict.kind === "judge" ? `verdict: ${verdict.record.verdict}` : verdict.kind === "not judged" ? `not judged: ${verdict.reason}` : "refused before the Judge";
  if (!comment) return line(v);
  return line(v) + line(`why: ${comment.text}`, "line refusal") + line(`source: ${comment.source}`) + line(`names: ${namesLine(named)}`);
}

const roundHead = (number) => `<h3 class="round">Round ${number}</h3>`;

function roundHtml(round, n, ctx) {
  const { library, calls, mapping, groundingCalls, held, outDir, corpusDir } = ctx;
  const b = bindingOf(round, n, calls, mapping, groundingCalls);
  const same = held && held.binding.move === b.move && held.binding.join === b.join && held.binding.table === b.table;
  const binding = same ? line(`Binding of Round ${held.number} holds`)
    : moveLine(b.move, { library, outDir, corpusDir }) + line(`join: ${b.join}`) + structureTable(structureAt(mapping, n), b.table);
  const named = round.comment ? namedLocations(round.comment.text, round.entry) : { waypoints: [], segments: [] };
  const submission = round.entry ? submissionTable(library, round.entry, named)
    : none(`No Submission was read from Call ${round.call.n}: its answer did not parse.`);
  const roundCalls = [...round.calls, ...(b.bindCall ? [b.bindCall] : []), ...(b.table ? b.groundedBy : [])];
  return { binding: b, same, html: roundHead(round.number)
    + heading("Binding") + binding + heading("Submission") + submission
    + heading("Comment") + commentHtml(round.verdict, round.comment, named)
    + heading("Calls") + roundCalls.map((c) => line(`${c.label}: ${c.kind}`)).join("") };
}

function structureHtml(mapping, n) {
  const structure = structureAt(mapping, n);
  if (!structure) return none("No structure was read for this Leg Waypoint.");
  return heading("Structure") + "<table><thead><tr><th>Role</th><th>Abstract</th><th>Attribute</th></tr></thead><tbody>"
    + (structure.roles || []).map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.context)}</td><td>${esc((r.attributes || []).join(", "))}</td></tr>`).join("")
    + "</tbody></table>";
}

function callList(runDir, unitId, outDir, calls) {
  const rows = callRows(callsRoot(runDir)).filter((r) => r.unit === unitId || r.unit.startsWith(`${unitId}/`));
  if (!rows.length) return none(`No Call Record of the unit ${unitId} is under ${relFromRepo(runDir)}.`);
  const kind = (r) => (r.unit === unitId ? (calls.find((c) => c.n === r.n) || {}).kind || "call" : r.unit.slice(unitId.length + 1));
  return heading("Calls") + "<table><thead><tr><th>unit</th><th>Call</th><th>kind</th><th>refusal</th><th>files</th></tr></thead><tbody>"
    + rows.map((r) => `<tr><td>${esc(r.unit)}</td><td>${r.n}</td><td>${esc(kind(r))}</td><td>${r.refusal === null ? "passed" : esc(r.refusal)}</td>`
      + `<td>${r.files.map((f) => link(outDir, join(r.dir, f), f)).join(" ")}</td></tr>`).join("")
    + "</tbody></table>";
}

// THE BAND a unit's section opens on: its status, its Calls by kind, its first Call's seconds, the Round definition
// and its stop in full. Shared by the Leg sheet and the Candidate sheet.
function bandHtml({ unitId, status, calls, unit, definition, stop, extra = "" }) {
  const kinds = [...new Set(calls.map((c) => c.kind))].map((k) => `${k} ${calls.filter((c) => c.kind === k).length}`);
  const firstS = firstCallSecondsOf(unit);
  const chip = status === "done" ? "passed" : status === "refused" || status === "died" ? "refused" : "stopped";
  return `<p class="line">unit ${esc(unitId)}</p><p class="line">status ${tag(chip, status)}</p>`
    + line(`${calls.length} Call(s)${kinds.length ? `: ${kinds.join(", ")}` : ""}`)
    + line(`first Call: ${firstS !== undefined ? `${firstS}s` : "not timed"}`)
    + line(definition, "meta")
    + (stop ? line("Stop:") + line(stop, "stop refusal") : "") + extra;
}

const unitStop = (unit, status) => (unit && unit.failure && (status === "refused" || status === "died" || status === "stopped")
  ? String(unit.failure.stderr_tail ?? unit.failure.class ?? "") : null);

const page = (title, body) => `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
  + `<title>Feedback-Loop Playground ${esc(title)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>`
  + `<h1>Feedback-Loop Playground — ${esc(title)}</h1>${body}</body></html>\n`;

export function renderFlp({ runDir, legId, movesDir = null, outDir = process.cwd(), corpusDir = null }) {
  const startPath = join(runDir, START_FILE);
  if (!existsSync(startPath)) return { error: `the run directory ${relFromRepo(runDir)} holds no start record ${START_FILE}` };
  if (!existsSync(readerPathJobPath(runDir))) return { error: `the run directory ${relFromRepo(runDir)} holds no job record ${relative(runDir, readerPathJobPath(runDir))}` };
  const start = JSON.parse(readFileSync(startPath, "utf8"));
  const job = readReaderPathJob(runDir);
  const legs = Array.isArray(start.legs) ? start.legs : [];
  const li = legs.findIndex((l) => l && l.leg_id === legId);
  if (li === -1) return { error: `the start record of ${relFromRepo(runDir)} carries no Leg ${legId} — it carries ${legs.map((l) => l && l.leg_id).join(", ")}` };
  const leg = legs[li];
  const unitId = unitIdFor(li);
  const unit = (job.units || []).find((u) => u.id === unitId);
  const status = unitStatus(job, unit);
  const library = movesDir || start.moves_dir || "moves";
  const mapping = readMappingState(runDir, unitId);
  const calls = unitCalls(runDir, unitId, { mapped: Boolean(mapping) });
  const stop = unitStop(unit, status);
  const lastRefused = [...calls].reverse().find((c) => c.refusal);
  const lastNamed = stop ? namedWaypoints(stop)
    : lastRefused ? leg.waypoints.map((w) => Number(w.waypoint)).filter((n) => refusalAt(lastRefused.refusal, n) !== null) : [];
  // A refusal only the job record carries — every one, in a run made before kogaki#1756 — is placed on no Call.
  const onRecords = new Set(calls.flatMap((c) => (c.refusal ? [String(c.refusal.text), ...((c.refusal.sites || []).filter((s) => s && s.refusal).map((s) => String(s.refusal)))] : [])));
  const unplaced = ((unit && unit.refusals) || []).map(String).filter((t) => !onRecords.has(t) && t !== stop);
  const legWide = calls.filter((c) => c.refusal && !leg.waypoints.some((w) => refusalAt(c.refusal, Number(w.waypoint)) !== null));
  const band = bandHtml({ unitId, status, calls, unit, definition: ROUND_DEFINITION, stop,
    extra: (legWide.length ? line("Refusals naming no Leg Waypoint:") + legWide.map((c) => line(`Call ${c.n}, ${c.kind}: ${c.refusal.text}`, "stop refusal")).join("") : "")
    + (unplaced.length ? line("unplaced — on the job record and on no Call Record:") + unplaced.map((t) => line(t, "stop refusal")).join("") : "") });
  const statuses = [];
  const body = leg.waypoints.map((w) => {
    const n = Number(w.waypoint);
    const rounds = roundsAt(calls, n, status);
    const st = waypointStatus(status, n, lastNamed, rounds);
    statuses.push(st.tag);
    const groundingCalls = callRows(callsRoot(runDir)).filter((r) => r.unit === `${unitId}/grounding/waypoint-${n}`)
      .map((r) => ({ label: `grounding/waypoint-${n} Call ${r.n}`, kind: "grounding" }));
    let held = null;
    const roundsHtml = rounds.map((round) => {
      const r = roundHtml(round, n, { library, calls, mapping, groundingCalls, held, outDir, corpusDir });
      if (!r.same) held = { number: round.number, binding: r.binding };
      return r.html;
    }).join("");
    return part(`waypoint-${n}`, `Leg Waypoint ${n}`, `<p class="line">${tag(st.tag, st.text)}</p>`
      + heading("Brief's point") + line(w.point) + line(`case: ${w.case ?? "none"}`) + structureHtml(mapping, n)
      + (rounds.length ? roundsHtml : none("No Submission was written for this Leg Waypoint.")));
  }).join("");
  const html = page(`Leg ${legId}`, line(`run: ${relFromRepo(runDir)}`, "meta") + line(`job: ${job.state}`, "meta") + line(`Brief: ${start.brief}`, "meta")
    + band + body + part("calls", "Calls", callList(runDir, unitId, outDir, calls)));
  return { html, status, tags: statuses };
}

// THE CANDIDATE SHEET (kogaki#1762): one compose unit of a Brief run. A compose Call opens a Round; the fit Call
// that follows it gives every Leg its verdict and is the Round's Comment; a compose Call with no fit Call after it
// is `not judged`.
export function candidateRounds(runDir, unitId, status) {
  const calls = callRows(callsRoot(runDir)).filter((r) => r.unit === unitId).map((r) => {
    const rec = readCallRecord(r.dir);
    const phase = rec.row && rec.row.phase;
    return { n: r.n, dir: r.dir, phase, kind: isStopped(rec) ? "stopped" : phase === "fit" ? "judge" : "compose", answer: rec.answer, refusal: rec.refusal };
  });
  const rounds = [];
  for (const c of calls) {
    const open = rounds[rounds.length - 1];
    if (c.phase === "fit") {
      if (!open || open.fit) continue;
      open.fit = c;
      open.calls.push({ label: `Call ${c.n}`, kind: c.kind });
      continue;
    }
    rounds.push({ number: rounds.length + 1, compose: c, fit: null, calls: [{ label: `Call ${c.n}`, kind: c.kind }] });
  }
  for (const r of rounds) {
    if (r.fit) continue;
    r.notJudged = r.compose.kind === "stopped" || !r.compose.answer ? "No Submission reached the Judge."
      : r !== rounds[rounds.length - 1] ? `Call ${rounds[r.number].compose.n} composed the next Candidate before the Judge read this one.`
        : status === "done" ? "No judge Call of this unit follows this compose Call."
          : status === "running" ? "The Judge has not read this Submission yet." : "The unit stopped before the Judge read this Submission.";
  }
  return { calls, rounds };
}

function candidateRoundHtml(round, ctx) {
  const { library, outDir, corpusDir } = ctx;
  const candidate = round.compose.answer;
  const legs = candidate && Array.isArray(candidate.legs) ? candidate.legs : null;
  const verdicts = new Map(round.fit && round.fit.answer && Array.isArray(round.fit.answer.verdicts) ? round.fit.answer.verdicts.map((v) => [String(v.leg_id), v]) : []);
  const refused = new Set([...verdicts.values()].filter((v) => v.verdict !== "consistent").map((v) => String(v.leg_id)));
  const submission = !legs ? none(`no Submission: ${round.compose.refusal ? round.compose.refusal.text : "the compose Call's answer did not parse"}`)
    : "<table><thead><tr><th>Leg</th><th>Move</th><th>Purpose</th><th>Leg Waypoints</th><th>Case</th></tr></thead><tbody>"
      + legs.map((l) => `<tr${refused.has(String(l.leg_id)) ? ' class="named"' : ""}><td>${esc(l.leg_id)}</td><td>${moveLine(l.move, { library, outDir, corpusDir })}</td>`
        + `<td>${esc(l.purpose)}</td><td>${(l.waypoints || []).map((w) => `<p>${esc(w.point)}</p>`).join("")}</td>`
        + `<td>${(l.waypoints || []).map((w) => `<p>${esc(w.case ?? "")}</p>`).join("")}</td></tr>`).join("")
      + "</tbody></table>";
  const comment = round.fit
    ? "<table><thead><tr><th>Leg</th><th>verdict</th><th>why</th><th>source</th></tr></thead><tbody>"
      + [...verdicts.values()].map((v) => `<tr><td>${esc(v.leg_id)}</td><td>${esc(v.verdict)}</td><td class="refusal">${esc(v.why)}</td><td>the Judge</td></tr>`).join("")
      + "</tbody></table>"
    : line(`not judged: ${round.notJudged}`);
  return roundHead(round.number) + heading("Submission") + submission + heading("Comment") + comment
    + heading("Calls") + round.calls.map((c) => line(`${c.label}: ${c.kind}`)).join("");
}

export function renderCandidate({ runDir, unitId, movesDir = "moves", outDir = process.cwd(), corpusDir = null }) {
  if (!existsSync(readerPathJobPath(runDir))) return { error: `the run directory ${relFromRepo(runDir)} holds no job record ${relative(runDir, readerPathJobPath(runDir))}` };
  const job = readReaderPathJob(runDir);
  const units = Array.isArray(job.units) ? job.units : [];
  const unit = units.find((u) => u && u.id === unitId);
  if (!unit) return { error: `the job record of ${relFromRepo(runDir)} carries no unit ${unitId} — it carries ${units.map((u) => u && u.id).join(", ")}` };
  const status = unitStatus(job, unit);
  const { calls, rounds } = candidateRounds(runDir, unitId, status);
  const band = bandHtml({ unitId, status, calls, unit, definition: CANDIDATE_ROUND_DEFINITION, stop: unitStop(unit, status) });
  const body = rounds.length ? rounds.map((r) => candidateRoundHtml(r, { library: movesDir, outDir, corpusDir })).join("") : none("No compose Call of this unit left a record.");
  const html = page(`Candidate ${unitId}`, line(`run: ${relFromRepo(runDir)}`, "meta") + line(`job: ${job.state}`, "meta")
    + part(unitId, `Candidate ${unitId}`, band + body) + part("calls", "Calls", callList(runDir, unitId, outDir, calls)));
  return { html, status, rounds: rounds.length };
}

function argsOf(argv) {
  const args = { _: [] };
  for (let k = 0; k < argv.length; k++) {
    if (argv[k].startsWith("--") && argv[k + 1] !== undefined && !argv[k + 1].startsWith("--")) args[argv[k].slice(2)] = argv[++k];
    else args._.push(argv[k]);
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf(process.argv.slice(2));
  const usage = "usage: node src/flp/sheet.mjs leg --run <ParagraphPlan run directory> --leg <leg_id> [--moves-dir <dir>] [--out <file>]\n"
    + "       node src/flp/sheet.mjs candidate --run <Brief run directory> --unit <candidate-N> [--moves-dir <dir>] [--out <file>]";
  const mode = args._[0];
  if (!args.run || !((mode === "leg" && args.leg) || (mode === "candidate" && args.unit))) { process.stderr.write(`${usage}\n`); process.exit(2); }
  const out = args.out ? resolve(args.out) : null;
  const outDir = out ? resolve(out, "..") : process.cwd();
  const r = mode === "leg"
    ? renderFlp({ runDir: resolve(args.run), legId: args.leg, movesDir: args["moves-dir"] || null, outDir })
    : renderCandidate({ runDir: resolve(args.run), unitId: args.unit, movesDir: args["moves-dir"] || "moves", outDir });
  if (r.error) { process.stderr.write(`flp: ${r.error}\n`); process.exit(1); }
  if (out) { writeFileSync(out, r.html); process.stderr.write(`flp: ${relFromRepo(out)}\n`); }
  else process.stdout.write(r.html);
}
