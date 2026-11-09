// The Leg-Planning Playground's sheet (kogaki#1764): one page over one Trial directory, its parts in a fixed order and
// every heading from one fixed list, the Rounds of each stage in the FLP's blocks.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Leg-Planning Playground, Round, Submission, Comment, Call
//       specs/spec-draft-pipeline/SPEC.md
//
import { join, relative, resolve } from "node:path";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { CALLS_DIR } from "../workflow/call-record.mjs";
import { moveContract } from "../compose.mjs";
import { proofSheetCss } from "../mapping-playground/sheet.mjs";
import { CANDIDATE_ROUND_BLOCKS } from "../flp/sheet.mjs";
import { movePassage, NO_RECORD } from "../flp/provenance.mjs";

// THE SHEET'S PARTS, in order.
export const LPP_PARTS = ["Claims", "Structure", "Leg Waypoints", "Legs", "Rounds", "The Brief's Legs"];
// THE ONLY HEADINGS THE SHEET CARRIES: the parts, and these.
export const LPP_HEADINGS = [...LPP_PARTS, "Roles", "Relations", "Higher-order relations", "Leg <id>", "Move", "Stage <name>",
  "Round n", ...CANDIDATE_ROUND_BLOCKS];
const ACCENT = ':root[data-theme="dark"]{--accent:#e0a458}h1,h2{color:var(--accent)}tr.named td{background:#4a3a12}'
  + ".refusal{white-space:pre-wrap}.line{margin:.15em 0}.cols{display:grid;grid-template-columns:1fr 1fr;gap:1em}"
  + "h3{font-size:1.05em;margin:1.2em 0 .3em}h4{font-size:.8em;text-transform:uppercase;letter-spacing:.05em;margin:.8em 0 .2em;color:#9aa}";

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const line = (text, cls = "line") => `<p class="${cls}">${esc(text)}</p>`;
const none = (text) => `<p class="muted">${esc(text)}</p>`;
const listed = (name) => LPP_HEADINGS.some((h) => (h.includes("<") || h === "Round n"
  ? new RegExp(`^${h.replace(/<[^>]+>|\bn$/, ".+")}$`).test(name) : h === name));
function heading(level, name) {
  if (!listed(name)) throw new Error(`the Leg-Planning sheet has no heading ${JSON.stringify(name)}`);
  return `<h${level}>${esc(name)}</h${level}>`;
}
const part = (name, body) => `<section class="card" id="${esc(name.toLowerCase().replace(/[^a-z]+/g, "-"))}">${heading(2, name)}${body}</section>`;
const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
const row = (cells, cls = "") => `<tr${cls ? ` class="${cls}"` : ""}>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
const link = (outDir, path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;
const stageOf = (record, name) => record.stages.find((s) => s.stage === name) || null;

function claimsPart(record) {
  return line(`thesis: ${record.claims.thesis}`)
    + table(["id", "cite", "claim"], record.claims.claims.map((c) => row([esc(c.id), esc(c.cite), esc(c.claim)])));
}

function structurePart(structure) {
  if (!structure) return none("No structure was read.");
  return heading(3, "Roles") + table(["id", "Abstract", "Attribute", "claims"], structure.roles.map((r) => row([esc(r.id), esc(r.context),
    esc(r.attributes.join(", ")), esc(r.claims.join(", "))])))
    + heading(3, "Relations") + table(["id", "from", "between", "holds"], structure.relations.map((r) => row([esc(r.id), esc(r.from),
      esc(r.between.join(", ")), esc(r.holds)])))
    + heading(3, "Higher-order relations") + table(["id", "relates", "holds", ""], structure.higher_order.map((h) => row([esc(h.id),
      esc(h.relates.join(", ")), esc(h.holds), h.id === structure.attains_thesis ? "attains the thesis" : ""])));
}

// The Leg each Waypoint number falls in.
const legOfWaypoint = (legs, answerLegs) => {
  const m = new Map();
  (answerLegs || []).forEach((l, i) => l.waypoints.forEach((n) => m.set(n, legs[i].leg_id)));
  return m;
};

function waypointsPart(record, waypoints, legOf) {
  const st = stageOf(record, "waypoints");
  if (!waypoints) return none(`No Leg Waypoint set passed${st && st.stopped ? `: ${st.stopped}` : "."}`);
  const named = new Map();
  for (const s of (st && st.named) || []) if (!named.has(s.waypoint)) named.set(s.waypoint, s);
  return table(["#", "point", "carries", "serves", "Leg"], waypoints.map((w, i) => {
    const s = named.get(i + 1);
    const flag = s ? `<p class="line refusal">${esc(`GROUNDED named in Round ${s.round}: "${s.phrase}"`)}</p>` : "";
    return row([String(i + 1), esc(w.point) + flag, esc(w.carries.join(", ")), esc(w.serves.join(", ")), esc(legOf.get(i + 1) ?? "")], s ? "named" : "");
  }));
}

// THE MOVE LINE: the id linking to its file in the library, and its Corpus passage where an extraction record names it.
function moveLine(move, libraryDir, outDir) {
  const p = movePassage(move);
  const passage = !p ? esc(NO_RECORD) : !p.file ? esc(`passage ${p.passage}, paragraph ${p.paragraph} — no passage file on this machine`)
    : p.span ? `${link(outDir, p.file, `${relFromRepo(p.file)}:${p.line}`)} ${esc(`lines ${p.span.first}–${p.span.last}`)}`
      : esc(`${relFromRepo(p.file)} holds no paragraph ${p.paragraph}`);
  return `<p class="line">${link(outDir, join(libraryDir, `${move}.yaml`), move)}</p><p class="line">passage: ${passage}</p>`;
}

// One Leg: its Move, the Move's Segments beside the Leg's Waypoints in order, and the fit verdict on it.
function legHtml(leg, numbers, waypoints, verdict, libraryDir, outDir) {
  const c = moveContract(leg.move, libraryDir);
  const segments = c.error ? [] : c.segments;
  const cell = (sg, k) => esc(sg && typeof sg[k] === "string" ? sg[k] : "");
  const rows = Array.from({ length: Math.max(segments.length, numbers.length) }, (_, i) => {
    const n = numbers[i];
    const w = n ? waypoints[n - 1] : null;
    return row([String(i + 1), cell(segments[i], "operation"), cell(segments[i], "relation"), cell(segments[i], "manner"),
      w ? esc(`Waypoint ${n}: ${w.carries.join(", ")}`) : ""]);
  });
  return heading(3, `Leg ${leg.leg_id}`) + heading(4, "Move") + moveLine(leg.move, libraryDir, outDir) + (c.error ? line(c.error) : "")
    + table(["Segment", "operation", "relation", "manner", "Waypoint carried"], rows)
    + line(verdict ? `fit: ${verdict.verdict} — ${verdict.why}` : "fit: not judged");
}

function legsPart(record, legs, waypoints, answerLegs, libraryDir, outDir) {
  const st = stageOf(record, "legs");
  if (!legs) return none(`No Legs passed${st && st.stopped ? `: ${st.stopped}` : "."}`);
  const verdicts = new Map(((st && st.verdicts) || []).map((v) => [v.leg_id, v]));
  return legs.map((leg, i) => legHtml(leg, answerLegs[i].waypoints, waypoints, verdicts.get(leg.leg_id), libraryDir, outDir)).join("");
}

// THE ROUNDS OF EACH STAGE, in the FLP's blocks: Submission, Comment, Calls.
function roundsPart(record, outDir) {
  const callLink = (c) => link(outDir, join(outDir, CALLS_DIR, c), c);
  return record.stages.map((st) => heading(3, `Stage ${st.stage}`) + (st.state === "not run" ? none("not run")
    : (st.rounds || []).map((r) => {
      const blocks = {
        Submission: [].concat(r.submission).map((c) => `<p class="line">${callLink(c)}</p>`).join("") || none("none"),
        Comment: line(`verdict: ${r.verdict}`) + (r.comment ? line(`why: ${r.comment}`, "line refusal") : ""),
        Calls: [...[].concat(r.submission), ...(r.calls || [])].map((c) => `<p class="line">${callLink(c)}</p>`).join(""),
      };
      return heading(4, `Round ${r.round}`) + CANDIDATE_ROUND_BLOCKS.map((b) => heading(4, b) + blocks[b]).join("");
    }).join(""))).join("");
}

const legPoints = (leg) => `<p class="line">${esc(`Leg ${leg.leg_id} — ${leg.move ?? "no Move"}`)}</p>`
  + (leg.waypoints || []).map((w, i) => line(`${i + 1}. ${w.point}`)).join("");

function briefPart(briefLegs, legs) {
  const n = Math.max(briefLegs.length, (legs || []).length);
  return table(["Leg", "The Brief", "This Trial"], Array.from({ length: n }, (_, i) => row([String(i + 1),
    briefLegs[i] ? legPoints(briefLegs[i]) : "", legs && legs[i] ? legPoints(legs[i]) : ""])));
}

export function renderLppSheet({ outDir, record, structure, waypoints, legs, libraryDir = resolve(REPO, "moves"), briefLegs = null }) {
  const st = stageOf(record, "legs");
  const answerLegs = legs && st && st.partition ? st.partition : null;
  const legOf = legOfWaypoint(legs || [], answerLegs);
  const parts = [
    part("Claims", claimsPart(record)),
    part("Structure", structurePart(structure)),
    part("Leg Waypoints", waypointsPart(record, waypoints, legOf)),
    part("Legs", legsPart(record, legs, waypoints, answerLegs, libraryDir, outDir)),
    part("Rounds", roundsPart(record, outDir)),
    ...(briefLegs ? [part("The Brief's Legs", briefPart(briefLegs, legs))] : []),
  ];
  return `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Leg-Planning Playground ${esc(record.trial)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>`
    + `<h1>Leg-Planning Playground — ${esc(record.trial)}</h1>`
    + (record.stopped ? line(`Stopped: ${record.stopped}`, "line refusal") : "") + parts.join("") + "</body></html>\n";
}
