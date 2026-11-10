// The Leg-Planning Playground's sheet (kogaki#1764, kogaki#1767): one page over one Trial directory, its parts in a fixed order and
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
import { proofSheetCss } from "../mapping-playground/sheet.mjs";
import { CANDIDATE_ROUND_BLOCKS } from "../flp/sheet.mjs";
import { movePassage, NO_RECORD } from "../flp/provenance.mjs";
import { elementLabel, readHolds } from "../compose/structure.mjs";

// THE SHEET'S PARTS, in order.
export const LPP_PARTS = ["Claims", "Structure", "Leg Waypoints", "Legs", "Rounds", "The Brief's Legs"];
// THE ONLY HEADINGS THE SHEET CARRIES: the parts, and these.
export const LPP_HEADINGS = [...LPP_PARTS, "Unreached claims", "Roles", "Relations", "Higher-order relations", "Leg <id>", "Stage <name>",
  "Round n", ...CANDIDATE_ROUND_BLOCKS];
const ACCENT = ':root[data-theme="dark"]{--accent:#e0a458}h1,h2{color:var(--accent)}tr.named td{background:#4a3a12}tr.unreached td{opacity:.6}'
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

const UNREACHED = "unreached — the article leaves it";

// The thesis and every claim, then the claims the thesis does not reach, with their cites.
function claimsPart(record, structure) {
  const all = line(`thesis: ${record.claims.thesis}`)
    + table(["id", "cite", "claim"], record.claims.claims.map((c) => row([esc(c.id), esc(c.cite), esc(c.claim)])));
  if (!structure || !structure.unreached) return all;
  const byId = new Map(record.claims.claims.map((c) => [c.id, c]));
  const left = structure.unreached.claims;
  return all + heading(3, "Unreached claims") + (left.length
    ? table(["id", "cite", "claim", "stated by"], left.map((u) => row([esc(u.id), esc(byId.get(u.id).cite), esc(byId.get(u.id).claim),
      esc(u.reached_by.map((id) => elementLabel(structure, id, record.claims.claims)).join(", "))]), "unreached"))
    : none("Every claim is reached; the article leaves none."));
}

// Every Role, relation and higher-order relation as its name and the claim ids it is read from (kogaki#1772), each
// `holds` with its Roles' names, and never a bare id.
function structurePart(structure, claims) {
  if (!structure) return none("No structure was read.");
  const left = new Set(structure.unreached ? [...structure.unreached.relations, ...structure.unreached.higher_order].map((u) => u.id) : []);
  const mark = (id) => (id === structure.attains_thesis ? "attains the thesis" : left.has(id) ? UNREACHED : "");
  const cls = (id) => (left.has(id) ? "unreached" : "");
  const label = (id) => esc(elementLabel(structure, id, claims));
  const nameOf = new Map([...structure.roles, ...structure.relations, ...structure.higher_order].map((x) => [x.id, x.name]));
  const names = (ids) => esc(ids.map((id) => nameOf.get(id) ?? id).join(", "));
  return heading(3, "Roles") + table(["Role", "Abstract", "Attribute"], structure.roles.map((r) => row([label(r.id), esc(r.context),
    esc(r.attributes.join(", "))])))
    + heading(3, "Relations") + table(["relation", "between", "holds", ""], structure.relations.map((r) => row([label(r.id),
      names(r.between), esc(readHolds(structure, r.holds)), esc(mark(r.id))], cls(r.id))))
    + heading(3, "Higher-order relations") + table(["higher-order relation", "relates", "holds", ""], structure.higher_order.map((h) => row([label(h.id),
      names(h.relates), esc(readHolds(structure, h.holds)), esc(mark(h.id))], cls(h.id))));
}

// The Leg each Waypoint number falls in, from the derivation's partition.
const legOfWaypoint = (partition) => new Map((partition || []).flatMap((p) => p.waypoints.map((n) => [n, p.leg_id])));

function waypointsPart(record, waypoints, legOf, structure) {
  const st = stageOf(record, "waypoints");
  if (!waypoints) return none(`No Leg Waypoint set passed${st && st.stopped ? `: ${st.stopped}` : "."}`);
  const named = new Map();
  for (const s of (st && st.named) || []) if (!named.has(s.waypoint)) named.set(s.waypoint, s);
  return table(["#", "point", "carries", "serves", "Leg"], waypoints.map((w, i) => {
    const s = named.get(i + 1);
    const flag = s ? `<p class="line refusal">${esc(`GROUNDED named in Round ${s.round}: "${s.phrase}"`)}</p>` : "";
    return row([String(i + 1), esc(w.point) + flag, esc(w.carries.map((id) => elementLabel(structure, id, record.claims.claims)).join(", ")),
      esc(w.serves.join(", ")), esc(legOf.get(i + 1) ?? "")], s ? "named" : "");
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

// One Leg of the `Legs` part (kogaki#1767).
function legHtml(leg, p, structure, waypoints, planLeg, bindings, libraryDir, outDir) {
  const h = structure.higher_order.find((x) => x.id === p.relation);
  const rows = p.waypoints.map((n, k) => {
    const w = waypoints[n - 1];
    const b = bindings.find((x) => x.leg_id === leg.leg_id && x.waypoint === k + 1) || null;
    const entry = planLeg ? planLeg.waypoints[k] : null;
    const move = (entry && entry.move) || (b && b.move);
    const pws = entry ? entry.paragraph_waypoints.map((pw, i) => line(`${i + 1}. ${pw.performs !== undefined ? `performs: ${pw.performs}` : pw.point}`)).join("")
      : none("no Paragraph Waypoints");
    return row([String(n), esc(w.point), move ? moveLine(move, libraryDir, outDir) : none("no Move bound"), pws, esc(b ? b.verdict : "not reached")]);
  });
  return heading(3, `Leg ${leg.leg_id}`)
    + line(`serves ${elementLabel(structure, p.relation)}${h ? ` — ${readHolds(structure, h.holds)}` : ""}${leg.reaches_target ? " (reaches the target)" : ""}`)
    + table(["Waypoint", "point", "paragraph Move", "Paragraph Waypoints", "verdict"], rows);
}

function legsPart(record, legs, structure, waypoints, plan, libraryDir, outDir) {
  const st = stageOf(record, "legs");
  if (!legs) return none(`No Legs were derived${st && st.stopped ? `: ${st.stopped}` : "."}`);
  const pst = stageOf(record, "paragraph-plan");
  const bindings = (pst && pst.waypoints) || [];
  const planLegs = new Map(((plan && plan.legs) || []).map((l) => [l.leg_id, l]));
  return (pst && pst.stopped ? line(`ParagraphPlan stopped: ${pst.stopped}`, "line refusal") : "")
    + legs.map((leg, i) => legHtml(leg, st.partition[i], structure, waypoints, planLegs.get(leg.leg_id), bindings, libraryDir, outDir)).join("");
}

// THE ROUNDS OF THE PARAGRAPHPLAN STAGE, per Leg Waypoint, from the record trial.json carries (kogaki#1767).
function planRounds(st, outDir) {
  const callLink = (dir) => link(outDir, resolve(REPO, dir), dir.split("/").slice(-2).join("/"));
  if (!(st.waypoints || []).length) return st.stopped ? line(`stopped: ${st.stopped}`, "line refusal") : none("no Round");
  return st.waypoints.map((w) => w.rounds.map((r) => {
    const calls = r.call === null ? none("none") : `<p class="line">${callLink(r.call)}</p>`;
    const blocks = { Submission: calls, Comment: line(`verdict: ${r.verdict}`) + (r.comment ? line(`why: ${r.comment}`, "line refusal") : ""), Calls: calls };
    return heading(4, `Round ${w.leg_id} Waypoint ${w.waypoint}, ${r.round}`) + CANDIDATE_ROUND_BLOCKS.map((b) => heading(4, b) + blocks[b]).join("");
  }).join("")).join("");
}

// THE ROUNDS OF EACH STAGE, in the FLP's blocks: Submission, Comment, Calls. The Legs are derived and carry none.
function roundsPart(record, outDir) {
  const callLink = (c) => link(outDir, join(outDir, CALLS_DIR, c), c);
  return record.stages.map((st) => heading(3, `Stage ${st.stage}`) + (st.state === "not run" ? none("not run")
    : st.stage === "paragraph-plan" ? planRounds(st, outDir)
    : st.stage === "legs" ? none("derived by the runner — no Call")
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

export function renderLppSheet({ outDir, record, structure, waypoints, legs, plan = null, libraryDir = resolve(REPO, "moves"), briefLegs = null }) {
  const st = stageOf(record, "legs");
  const legOf = legOfWaypoint(legs && st ? st.partition : null);
  const parts = [
    part("Claims", claimsPart(record, structure)),
    part("Structure", structurePart(structure, record.claims.claims)),
    part("Leg Waypoints", waypointsPart(record, waypoints, legOf, structure)),
    part("Legs", legsPart(record, legs, structure, waypoints, plan, libraryDir, outDir)),
    part("Rounds", roundsPart(record, outDir)),
    ...(briefLegs ? [part("The Brief's Legs", briefPart(briefLegs, legs))] : []),
  ];
  return `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Leg-Planning Playground ${esc(record.trial)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>`
    + `<h1>Leg-Planning Playground — ${esc(record.trial)}</h1>`
    + (record.stopped ? line(`Stopped: ${record.stopped}`, "line refusal") : "") + parts.join("") + "</body></html>\n";
}
