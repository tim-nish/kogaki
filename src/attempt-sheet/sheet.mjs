// The Feedback-Loop Playground (FLP, kogaki#1756; the Attempt Sheet of kogaki#1752): one Leg of a ParagraphPlan run,
// read from the run directory alone. Per Leg Waypoint, one block per attempt, stacked in attempt order, each pinned
// to the Attempt Record that wrote, judged or was refused at it.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Feedback-Loop Playground, the Attempt Record, the Mapping Record
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { relFromRepo } from "../workflow/run-record.mjs";
import { attemptRows, attemptsRoot, readAttemptRecord } from "../workflow/attempt-record.mjs";
import { readReaderPathJob, readerPathJobPath } from "../workflow/detached-job.mjs";
import { readJudgePrompt } from "../workflow/judge.mjs";
import { readMappingState, unitIdFor } from "../paragraph-plan.mjs";
import { proofSheetCss, segmentsTable } from "../mapping-playground/sheet.mjs";

// The run's start record, written by /paragraph-plan beside the job record.
export const START_FILE = "paragraph-plan-start.json";
export const STATUS_TAGS = ["passed", "refused here", "stood", "not reached"];
// THE ONLY HEADINGS A TABLE ON THE SHEET STANDS UNDER (specs/spec-draft-pipeline/SPEC.md §"The Feedback-Loop Playground (FLP)").
export const TABLE_HEADINGS = ["Brief's point", "Points after the last attempt", "Structure", "Correspondence",
  "Signal answered", "Entry as written", "Verdict", "Refusal drawn", "Calls"];
export const ATTEMPT_DEFINITION = "An attempt is one model call under this Leg's unit, numbered in the order it was made: "
  + "bind, write, judge, site retry at Waypoint n, suffix, or stopped (the per-call limit). A judge attempt writes no entry.";
const ACCENT = ':root[data-theme="dark"]{--accent:#e0a458;--off:#3d2c14}h1,h2{color:var(--accent)}'
  + ".tag{display:inline-block;padding:1px 8px;border-radius:4px;font-weight:600}"
  + ".tag-passed{background:#1f4d2b}.tag-refused-here{background:#6b1d1d}.tag-stood{background:#3a3f4b}.tag-not-reached{background:#2a2a2a}"
  + "tr.named td{background:#4a3a12}.refusal{white-space:pre-wrap}"
  + "h3.attempt{font-size:1em;margin:1.2em 0 .3em}h4.th{font-size:.8em;text-transform:uppercase;letter-spacing:.05em;margin:.8em 0 .2em;color:#9aa}";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const none = (what) => `<p class="muted">${esc(what)}</p>`;
const tag = (t) => `<span class="tag tag-${t.replace(/ /g, "-")}">${esc(t)}</span>`;
const pointText = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `performs: ${p.performs}` : String(p.point ?? ""));
const heading = (name, suffix = "") => {
  if (!TABLE_HEADINGS.includes(name)) throw new Error(`the FLP has no table heading ${JSON.stringify(name)}`);
  return `<h4 class="th">${esc(name + suffix)}</h4>`;
};
const rowsTable = (rows) => `<table><tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td class="refusal">${esc(v)}</td></tr>`).join("")}</tbody></table>`;

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

// THE UNIT'S ATTEMPTS, oldest first, each with its kind, the entries its answer carries by Leg Waypoint, a judge's
// verdicts, its refusal record and its prompt read back.
export function unitAttempts(runDir, unitId, { mapped = false } = {}) {
  return attemptRows(attemptsRoot(runDir)).filter((r) => r.unit === unitId).map((r) => {
    const rec = readAttemptRecord(r.dir);
    const phase = rec.row && rec.row.phase;
    const a = rec.answer;
    const prompt = readJudgePrompt(rec.prompt);
    const entries = new Map();
    const verdicts = new Map();
    if (phase === "fit") { for (const v of (a && Array.isArray(a.verdicts) ? a.verdicts : [])) verdicts.set(Number(v.waypoint), v); }
    else if (a && Array.isArray(a.waypoints)) { for (const e of a.waypoints) if (e && e.waypoint !== undefined) entries.set(Number(e.waypoint), e); }
    else if (a && a.waypoint !== undefined) entries.set(Number(a.waypoint), a);
    const input = prompt.input || {};
    const site = input.leg_waypoint_you_must_plan ? Number(input.leg_waypoint_you_must_plan.waypoint) : null;
    const tabled = input.leg_you_must_plan && Array.isArray(input.leg_you_must_plan.waypoints)
      && input.leg_you_must_plan.waypoints.some((w) => w && Object.hasOwn(w, "table"));
    const kind = rec.refusal && /\bper-call limit\b/.test(String(rec.refusal.text)) ? "stopped"
      : phase === "fit" ? "judge" : phase === "site" ? `site retry at Waypoint ${site ?? "?"}` : phase === "suffix" ? "suffix"
        : mapped && !tabled ? "bind" : "write";
    return { n: r.n, dir: r.dir, phase, kind, site, refusal: rec.refusal, entries, verdicts, prompt };
  });
}

// What attempt `a` was handed for Leg Waypoint `n`: each refusal, verbatim, and the instruction sentence after them.
export function signalAt(a, n) {
  if (a.site !== null && a.site === n) {
    const handed = (a.prompt.input && a.prompt.input.refused_here) || [];
    return handed.length ? { refusals: handed.map((h) => String(h.refusal)), instruction: a.prompt.judgmentPoint } : null;
  }
  const at = a.prompt.refusals.filter((t) => { const w = namedWaypoints(t); return !w.length || w.includes(n); });
  return at.length ? { refusals: at, instruction: a.prompt.instruction } : null;
}

// THE REFUSALS EACH ATTEMPT'S ENTRY DREW AT LEG WAYPOINT `n`, read from the Attempt Records alone: a call's own refusal
// is drawn by its own entry; a judge's is drawn by the last earlier attempt that wrote the entry it judged.
export function drawnAt(attempts, n) {
  const drawn = new Map(attempts.map((a) => [a.n, []]));
  attempts.forEach((a, i) => {
    const text = refusalAt(a.refusal, n);
    if (text === null) return;
    const row = { text, by: a.n, group: a.refusal.group ?? null, reach: a.refusal.reach ?? null };
    if (a.phase !== "fit") { drawn.get(a.n).push(row); return; }
    const writer = attempts.slice(0, i).reverse().find((w) => w.entries.has(n));
    if (writer) drawn.get(writer.n).push(row);
  });
  return drawn;
}

// The Point numbers a refusal names: `point <n>`, or a quotation of one whole point; a quoted expression inside a point names none.
export function namedPoints(text, entry) {
  const nums = [...String(text).matchAll(/\bpoint (\d+)\b/g)].map((m) => Number(m[1]));
  const points = (entry && entry.paragraph_waypoints) || [];
  const quoted = [...String(text).matchAll(/"([^"]{12,})"/g)].map((m) => m[1]);
  points.forEach((p, i) => { const t = pointText(p).trim(); if (t && quoted.some((q) => q.trim() === t)) nums.push(i + 1); });
  return [...new Set(nums)].filter((n) => n >= 1).sort((a, b) => a - b);
}

export function waypointTag(status, n, lastNamed, entry) {
  if (!entry) return "not reached";
  if (status === "done") return "passed";
  return lastNamed.includes(n) ? "refused here" : "stood";
}

function entryHtml(library, entry, n, w, marked) {
  return `<p class="meta">Move: ${esc(entry.move)} · join: ${esc(entry.join ?? "none")} · case: ${esc(w.case ?? "none")}</p>`
    + segmentsTable({ library }, entry, n, marked);
}

// One attempt's block at Leg Waypoint `n`, or `null` where it neither wrote, judged nor was refused there.
function attemptBlock(a, n, w, drawn, library) {
  const entry = a.entries.get(n);
  const verdict = a.verdicts.get(n);
  if (!entry && !verdict && !drawn.length) return null;
  const signal = signalAt(a, n);
  const marked = new Set(drawn.flatMap((d) => namedPoints(d.text, entry)));
  return `<h3 class="attempt">Attempt ${a.n} · ${esc(a.kind)}</h3>`
    + (signal ? heading("Signal answered") + rowsTable([...signal.refusals.map((t) => ["refusal", t]),
      ["instruction", signal.instruction ?? "none read from the prompt"]]) : "")
    + (verdict ? heading("Verdict") + rowsTable([["verdict", verdict.verdict], ["why", verdict.why ?? ""]])
      : entry ? heading("Entry as written") + entryHtml(library, entry, n, w, marked) : "")
    + (drawn.length ? heading("Refusal drawn") + "<table><thead><tr><th>raised by</th><th>refusal</th><th>group</th><th>reach</th><th>names</th></tr></thead><tbody>"
      + drawn.map((d) => { const pts = namedPoints(d.text, entry);
        return `<tr><td>attempt ${d.by}</td><td class="refusal">${esc(d.text)}</td><td>${esc(d.group ?? "")}</td><td>${esc(d.reach ?? "")}</td>`
          + `<td>${pts.length ? esc(pts.map((p) => `point ${p}`).join(", ")) : ""}</td></tr>`; }).join("") + "</tbody></table>" : "");
}

// The Mapping Table as two tables: Structure, once, and Correspondence, one column per grounding call.
function mappingHtml(runDir, unitId, mapping, n, attempts, lastEntry) {
  const k = String(n);
  const structure = mapping.structures && (mapping.structures[k] || (mapping.read_from && mapping.structures[String(mapping.read_from[k])]));
  const table = mapping.tables && mapping.tables[k];
  const roles = (structure && structure.roles) || [];
  let html = structure ? heading("Structure") + "<table><thead><tr><th>Role</th><th>Abstract</th><th>Attribute</th></tr></thead><tbody>"
    + roles.map((r) => `<tr><td>${esc(r.id)}</td><td>${esc(r.context)}</td><td>${esc((r.attributes || []).join(", "))}</td></tr>`).join("")
    + "</tbody></table>" : none("No structure was read for this Leg Waypoint.");
  const unit = `${unitId}/grounding/waypoint-${n}`;
  const calls = attemptRows(attemptsRoot(runDir)).filter((r) => r.unit === unit)
    .map((r) => readAttemptRecord(r.dir).answer).filter((ans) => ans && Array.isArray(ans.correspondences));
  if (!calls.length) return html + none("No Correspondence was grounded for this Leg Waypoint.");
  const move = table ? table.move : null;
  const binder = [...attempts].reverse().find((a) => a.kind === "bind" && a.entries.has(n) && a.entries.get(n).move === move)
    || [...attempts].reverse().find((a) => a.kind === "bind" && a.entries.has(n));
  const head = `${binder ? `attempt ${binder.n} · ` : ""}${move ?? "no Move recorded"}`;
  const ids = [...new Set([...roles.map((r) => r.id), ...calls.flatMap((c) => c.correspondences.map((x) => x.role))])];
  html += heading("Correspondence") + `<table><thead><tr><th>Role</th>${calls.map(() => `<th>${esc(head)}</th>`).join("")}</tr></thead><tbody>`
    + `<tr><td>base</td>${calls.map((c) => `<td>${esc((c.base && c.base.domain) ?? "")}</td>`).join("")}</tr>`
    + ids.map((id) => `<tr><td>${esc(id)}</td>${calls.map((c) => `<td>${esc(c.correspondences.filter((x) => x.role === id).map((x) => x.expression).join("; "))}</td>`).join("")}</tr>`).join("")
    + "</tbody></table>";
  if (lastEntry && move && lastEntry.move !== move) html += `<p class="stop">grounded for ${esc(move)}; the last attempt binds ${esc(lastEntry.move ?? "no Move")}</p>`;
  return html;
}

function callList(runDir, unitId, outDir, attempts) {
  const rows = attemptRows(attemptsRoot(runDir)).filter((r) => r.unit === unitId || r.unit.startsWith(`${unitId}/`));
  if (!rows.length) return none(`No Attempt Record of the unit ${unitId} is under ${relFromRepo(runDir)}.`);
  const link = (path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;
  const kind = (r) => (r.unit === unitId ? (attempts.find((a) => a.n === r.n) || {}).kind || "call" : r.unit.slice(unitId.length + 1));
  return heading("Calls") + "<table><thead><tr><th>unit</th><th>attempt</th><th>kind</th><th>refusal</th><th>files</th></tr></thead><tbody>"
    + rows.map((r) => `<tr><td>${esc(r.unit)}</td><td>${r.n}</td><td>${esc(kind(r))}</td><td>${r.refusal === null ? "passed" : esc(r.refusal)}</td>`
      + `<td>${r.files.map((f) => link(join(r.dir, f), f)).join(" ")}</td></tr>`).join("")
    + "</tbody></table>";
}

export function renderAttemptSheet({ runDir, legId, movesDir = null, outDir = process.cwd() }) {
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
  const attempts = unitAttempts(runDir, unitId, { mapped: Boolean(mapping) });
  const lastEntry = (n) => { const a = [...attempts].reverse().find((x) => x.entries.has(n)); return a ? { at: a.n, entry: a.entries.get(n) } : null; };
  const stop = unit && unit.failure && (status === "refused" || status === "died") ? String(unit.failure.stderr_tail ?? unit.failure.class ?? "") : null;
  const lastRefused = [...attempts].reverse().find((a) => a.refusal);
  const lastNamed = stop ? namedWaypoints(stop)
    : lastRefused ? leg.waypoints.map((w) => Number(w.waypoint)).filter((n) => refusalAt(lastRefused.refusal, n) !== null) : [];
  // A refusal only the job record carries — every one, in a run made before kogaki#1756 — is placed on no attempt.
  const onRecords = new Set(attempts.flatMap((a) => (a.refusal ? [String(a.refusal.text), ...((a.refusal.sites || []).filter((s) => s && s.refusal).map((s) => String(s.refusal)))] : [])));
  const unplaced = ((unit && unit.refusals) || []).map(String).filter((t) => !onRecords.has(t) && t !== stop);
  const legWide = attempts.filter((a) => a.refusal && !leg.waypoints.some((w) => refusalAt(a.refusal, Number(w.waypoint)) !== null));
  const counts = [...new Set(attempts.map((a) => a.kind.replace(/ at Waypoint .*/, "")))].map((k) => `${k} ${attempts.filter((a) => a.kind.startsWith(k)).length}`);
  const chip = status === "done" ? "passed" : status === "refused" || status === "died" ? "refused-here" : "stood";
  const band = `<p class="meta">unit ${esc(unitId)} · <span class="tag tag-${chip}">${esc(status)}</span>`
    + ` · ${attempts.length} attempt(s)${counts.length ? ` (${esc(counts.join(", "))})` : ""} · first attempt ${esc(unit && unit.attempt_1_s !== undefined ? `${unit.attempt_1_s}s` : "not timed")}</p>`
    + `<p class="meta">${esc(ATTEMPT_DEFINITION)}</p>`
    + (stop ? `<p>Stop:</p><p class="stop refusal">${esc(stop)}</p>` : "")
    + (legWide.length ? "<p>Refusals naming no Leg Waypoint:</p>" + legWide.map((a) => `<p class="stop refusal">attempt ${a.n} · ${esc(a.kind)}: ${esc(a.refusal.text)}</p>`).join("") : "")
    + (unplaced.length ? "<p>unplaced — on the job record and no Attempt Record:</p>" + unplaced.map((t) => `<p class="stop refusal">${esc(t)}</p>`).join("") : "");
  const body = leg.waypoints.map((w) => {
    const n = Number(w.waypoint);
    const last = lastEntry(n);
    const drawn = drawnAt(attempts, n);
    const t = waypointTag(status, n, lastNamed, last && last.entry);
    const lastDrawn = last ? drawn.get(last.at) : [];
    const blocks = attempts.map((a) => attemptBlock(a, n, w, drawn.get(a.n), library) ?? `<p class="meta">Attempt ${a.n} · ${esc(a.kind)} · left standing</p>`).join("");
    return part(`waypoint-${n}`, `Leg Waypoint ${n}`, `<p>${tag(t)}</p>` + heading("Brief's point") + `<p>${esc(w.point)}</p>`
      + (last ? heading("Points after the last attempt", ` (attempt ${last.at})`)
        + entryHtml(library, last.entry, n, w, new Set(lastDrawn.flatMap((d) => namedPoints(d.text, last.entry))))
        : none("No attempt produced an entry for this Leg Waypoint."))
      + mappingHtml(runDir, unitId, mapping || {}, n, attempts, last && last.entry) + blocks);
  }).join("");
  const html = `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Feedback-Loop Playground ${esc(legId)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>`
    + `<h1>Feedback-Loop Playground — Leg ${esc(legId)}</h1><p class="meta">run: ${esc(relFromRepo(runDir))} · job ${esc(job.state)} · Brief: ${esc(start.brief)}</p>`
    + band + body + part("calls", "Calls", callList(runDir, unitId, outDir, attempts)) + "</body></html>\n";
  return { html, status, tags: leg.waypoints.map((w) => { const l = lastEntry(Number(w.waypoint)); return waypointTag(status, Number(w.waypoint), lastNamed, l && l.entry); }) };
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
  const usage = "usage: node src/attempt-sheet/sheet.mjs leg --run <ParagraphPlan run directory> --leg <leg_id> [--moves-dir <dir>] [--out <file>]";
  if (args._[0] !== "leg" || !args.run || !args.leg) { process.stderr.write(`${usage}\n`); process.exit(2); }
  const out = args.out ? resolve(args.out) : null;
  const r = renderAttemptSheet({ runDir: resolve(args.run), legId: args.leg, movesDir: args["moves-dir"] || null,
    outDir: out ? resolve(out, "..") : process.cwd() });
  if (r.error) { process.stderr.write(`attempt-sheet: ${r.error}\n`); process.exit(1); }
  if (out) { writeFileSync(out, r.html); process.stderr.write(`attempt-sheet: ${relFromRepo(out)}\n`); }
  else process.stdout.write(r.html);
}
