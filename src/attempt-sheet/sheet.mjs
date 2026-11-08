// The Attempt Sheet (kogaki#1752): one Leg of a ParagraphPlan run, read from the run directory alone, so a refused
// run is as readable as a passed one. Per Leg Waypoint: a status tag, the final Points, the refusals that named it
// and the revision the next attempt made; then every Attempt Record of the Leg's unit, nested calls included.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Attempt Sheet, the Attempt Record, the Mapping Record
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { relFromRepo } from "../workflow/run-record.mjs";
import { attemptRows, attemptsRoot, readAttemptRecord } from "../workflow/attempt-record.mjs";
import { readReaderPathJob, readerPathJobPath } from "../workflow/detached-job.mjs";
import { legRefusals, readMappingState, unitIdFor } from "../paragraph-plan.mjs";
import { proofSheetCss, segmentsTable, mappingTable } from "../mapping-playground/sheet.mjs";

// The run's start record, written by /paragraph-plan beside the job record.
export const START_FILE = "paragraph-plan-start.json";
export const STATUS_TAGS = ["passed", "refused here", "stood", "not reached"];
const ROW_NAMES = { compose: "plan", fit: "judge", site: "site retry", suffix: "suffix retry" };
const ACCENT = ':root[data-theme="dark"]{--accent:#e0a458;--off:#3d2c14}h1,h2{color:var(--accent)}'
  + ".tag{display:inline-block;padding:1px 8px;border-radius:4px;font-weight:600}"
  + ".tag-passed{background:#1f4d2b}.tag-refused-here{background:#6b1d1d}.tag-stood{background:#3a3f4b}.tag-not-reached{background:#2a2a2a}"
  + "tr.named td{background:#4a3a12}.refusal{white-space:pre-wrap}.unchanged{color:#8a8a8a}";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const none = (what) => `<p class="muted">${esc(what)}</p>`;
const tag = (t) => `<span class="tag tag-${t.replace(/ /g, "-")}">${esc(t)}</span>`;
const pointText = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `performs: ${p.performs}` : String(p.point ?? ""));

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

// The unit's status, a `running` unit whose supervisor is gone read as `stopped`.
export function unitStatus(job, unit) {
  if (!unit) return "not started";
  return unit.status === "running" && !pidAlive(job.supervisor_pid) ? "stopped" : unit.status;
}

// The unit's own attempts, oldest first, each with its phase, refusal and the entries its answer carries by Waypoint.
function unitAttempts(runDir, unitId) {
  return attemptRows(attemptsRoot(runDir)).filter((r) => r.unit === unitId).map((r) => {
    const rec = readAttemptRecord(r.dir);
    const phase = rec.row && rec.row.phase;
    const a = rec.answer;
    const entries = new Map();
    if (a && Array.isArray(a.waypoints)) for (const e of a.waypoints) if (e && e.waypoint !== undefined) entries.set(Number(e.waypoint), e);
    if (a && !Array.isArray(a.waypoints) && a.waypoint !== undefined && phase !== "fit") entries.set(Number(a.waypoint), a);
    return { n: r.n, dir: r.dir, phase, refusal: rec.refusal, entries };
  });
}

// The entries standing after each attempt: a later answer replaces the entries it carries.
function standingAfter(attempts) {
  const now = new Map();
  return attempts.map((a) => { for (const [k, e] of a.entries) now.set(k, e); return new Map(now); });
}

// THE REFUSALS OF THE UNIT, each with the attempt it answered. A refusal an Attempt Record carries is pinned to that
// attempt; one only the job record carries, as the site loop's are, is placed by order, after the last placed one,
// and a refusal reporting the attempts spent is placed on the last attempt. `placed` says which.
export function refusalRows(job, unitId, attempts) {
  const texts = legRefusals(job, unitId, []);
  const raw = (((job.units || []).find((u) => u.id === unitId) || {}).refusals || []).map(String);
  const used = new Set();
  let cursor = 0;
  return raw.map((text, i) => {
    const at = attempts.findIndex((a, k) => !used.has(k) && a.refusal && String(a.refusal.text) === text);
    let k;
    let placed = "record";
    if (at >= 0) { k = at; used.add(at); cursor = at + 1; }
    else if (/\bare spent\b/.test(text)) { k = attempts.length - 1; placed = "order"; }
    else { k = Math.min(cursor, attempts.length - 1); cursor = k + 1; placed = "order"; }
    const a = attempts[k];
    const sites = a && placed === "record" && Array.isArray(a.refusal.sites) ? a.refusal.sites.map(Number) : [];
    return { index: k, attempt: a ? a.n : null, row: a ? (placed === "record" ? ROW_NAMES[a.phase] || a.phase : "site loop") : "job record",
      placed, text, group: a && placed === "record" ? a.refusal.group : null, reach: a && placed === "record" ? a.refusal.reach : null,
      waypoints: [...new Set([...sites, ...texts[i].waypoints])] };
  });
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

function refusalTable(rows, entryAt) {
  if (!rows.length) return none("No refusal named this Leg Waypoint.");
  return "<table><caption>Refusals</caption><thead><tr><th>attempt</th><th>row</th><th>refusal</th><th>group</th><th>reach</th><th>names</th></tr></thead><tbody>"
    + rows.map((r) => {
      const pts = namedPoints(r.text, entryAt(r));
      return `<tr><td>${r.attempt ?? ""}${r.placed === "order" ? ' <span class="meta">by order</span>' : ""}</td><td>${esc(r.row)}</td>`
        + `<td class="refusal">${esc(r.text)}</td><td>${esc(r.group ?? "")}</td><td>${esc(r.reach ?? "")}</td>`
        + `<td>${pts.length ? esc(pts.map((p) => `point ${p}`).join(", ")) : ""}</td></tr>`;
    }).join("") + "</tbody></table>";
}

// One `field | before | after` row per field, over `move`, `join` and each Point by number.
export function revisionRows(before, after) {
  const fields = [["move", (e) => e && e.move], ["join", (e) => e && e.join]];
  const n = Math.max(((before && before.paragraph_waypoints) || []).length, ((after && after.paragraph_waypoints) || []).length);
  for (let i = 0; i < n; i++) fields.push([`point ${i + 1}`, (e) => pointText(((e && e.paragraph_waypoints) || [])[i])]);
  return fields.map(([field, get]) => {
    const b = get(before) ?? "";
    const a = get(after) ?? "";
    return { field, before: String(b), after: String(a), unchanged: String(b) === String(a) };
  });
}

function revisionTable(rows, n, attempts, standing) {
  if (!rows.length) return "";
  return rows.map((r) => {
    const next = attempts.findIndex((a, k) => k > r.index && a.entries.has(n));
    const head = `<caption>Revision after attempt ${r.attempt ?? "?"}</caption>`;
    if (next < 0) return `<table>${head}<tbody><tr><td>${esc("No later attempt revised this Leg Waypoint.")}</td></tr></tbody></table>`;
    const lines = revisionRows(r.index >= 0 ? standing[r.index].get(n) : null, standing[next].get(n));
    return `<table>${head}<thead><tr><th>field</th><th>before (attempt ${r.attempt})</th><th>after (attempt ${attempts[next].n})</th></tr></thead><tbody>`
      + lines.map((l) => `<tr><td>${esc(l.field)}</td><td>${esc(l.before)}</td>`
        + `<td>${l.unchanged ? '<span class="unchanged">unchanged</span>' : esc(l.after)}</td></tr>`).join("")
      + "</tbody></table>";
  }).join("");
}

function callList(runDir, unitId, outDir) {
  const rows = attemptRows(attemptsRoot(runDir)).filter((r) => r.unit === unitId || r.unit.startsWith(`${unitId}/`));
  if (!rows.length) return none(`No Attempt Record of the unit ${unitId} is under ${relFromRepo(runDir)}.`);
  const link = (path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;
  const kind = (r) => (r.unit === unitId ? ROW_NAMES[(readAttemptRecord(r.dir).row || {}).phase] || "call" : r.unit.slice(unitId.length + 1));
  return "<table><caption>Calls</caption><thead><tr><th>unit</th><th>attempt</th><th>kind</th><th>refusal</th><th>files</th></tr></thead><tbody>"
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
  const attempts = unitAttempts(runDir, unitId);
  const standing = standingAfter(attempts);
  const candidate = unit && unit.candidate && Array.isArray(unit.candidate.waypoints) ? new Map(unit.candidate.waypoints.map((e) => [Number(e.waypoint), e])) : null;
  const finalEntry = (n) => (candidate && candidate.get(n)) || (standing.length ? standing[standing.length - 1].get(n) : undefined);
  const refusals = refusalRows(job, unitId, attempts);
  const last = refusals.length ? refusals[refusals.length - 1] : null;
  const lastNamed = last ? last.waypoints : [];
  const mapping = readMappingState(runDir, unitId) || {};
  const legWide = refusals.filter((r) => !r.waypoints.length);
  const chip = status === "done" ? "passed" : status === "refused" || status === "died" ? "refused-here" : "stood";
  const band = `<p class="meta">unit ${esc(unitId)} · <span class="tag tag-${chip}">${esc(status)}</span>`
    + ` · ${esc(unit ? unit.attempts || 1 : 0)} attempt(s) · first attempt ${esc(unit && unit.attempt_1_s !== undefined ? `${unit.attempt_1_s}s` : "not timed")}</p>`
    + (legWide.length ? "<p>Refusals naming no Leg Waypoint:</p>" + legWide.map((r) => `<p class="stop refusal">${esc(r.text)}</p>`).join("") : "");
  const body = leg.waypoints.map((w) => {
    const n = Number(w.waypoint);
    const entry = finalEntry(n);
    const rows = refusals.filter((r) => r.waypoints.includes(n));
    const entryAt = (r) => (r.index >= 0 && standing[r.index] ? standing[r.index].get(n) : entry);
    const marked = new Set(rows.flatMap((r) => namedPoints(r.text, entryAt(r))));
    const t = waypointTag(status, n, lastNamed, entry);
    const k = String(n);
    const structure = mapping.structures && (mapping.structures[k] || (mapping.read_from && mapping.structures[String(mapping.read_from[k])]));
    const table = mapping.tables && mapping.tables[k];
    const points = entry ? segmentsTable({ library }, entry, n, marked)
      + `<p class="meta">Move: ${esc(entry.move)} · join: ${esc(entry.join ?? "none")} · case: ${esc(w.case ?? (table && table.case) ?? "none")}</p>`
      : none("No attempt produced an entry for this Leg Waypoint.");
    return part(`waypoint-${n}`, `Leg Waypoint ${n}`, `<p>${tag(t)}</p><p><b>Brief's point:</b> ${esc(w.point)}</p>` + points
      + (structure || table ? mappingTable(structure || null, table || null, n) : none("No Mapping Table was grounded for this Leg Waypoint."))
      + refusalTable(rows, entryAt) + revisionTable(rows, n, attempts, standing));
  }).join("");
  const html = `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Attempt Sheet ${esc(legId)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>`
    + `<h1>Attempt Sheet — Leg ${esc(legId)}</h1><p class="meta">run: ${esc(relFromRepo(runDir))} · job ${esc(job.state)} · Brief: ${esc(start.brief)}</p>`
    + band + body + part("calls", "Calls", callList(runDir, unitId, outDir)) + "</body></html>\n";
  return { html, status, tags: leg.waypoints.map((w) => waypointTag(status, Number(w.waypoint), lastNamed, finalEntry(Number(w.waypoint)))) };
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
