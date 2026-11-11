// The Leg-Planning Playground's sheet (kogaki#1764, kogaki#1767, kogaki#1775): one page over one Trial directory, its parts in a fixed order and
// every heading from one fixed list, the Rounds of each stage in the FLP's blocks. The Brief sheet (kogaki#1776): one page over one
// adopted Brief file, rendered with no model call.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Leg-Planning Playground, Round, Submission, Comment, Call
//       specs/spec-draft-pipeline/SPEC.md
//
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseYaml } from "../yaml.mjs";
import { strandClaims } from "../brief/run-state.mjs";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { CALLS_DIR } from "../workflow/call-record.mjs";
import { proofSheetCss } from "../mapping-playground/sheet.mjs";
import { CANDIDATE_ROUND_BLOCKS } from "../flp/sheet.mjs";
import { movePassage, NO_RECORD } from "../flp/provenance.mjs";
import { elementLabel, readHolds } from "../compose/structure.mjs";

// THE SHEET'S PARTS, in order.
export const LPP_PARTS = ["Claims", "Structure", "Legs", "Rounds", "The Brief's Legs"];
// THE ONLY HEADINGS THE SHEET CARRIES: the parts, and these.
export const LPP_HEADINGS = [
  ...LPP_PARTS,
  "Unreached claims",
  "Roles",
  "Relations",
  "Higher-order relations",
  "Not connected",
  "Leg <id>",
  "Stage <name>",
  "Round n",
  ...CANDIDATE_ROUND_BLOCKS,
];
// THE BRIEF SHEET'S PARTS, in order (kogaki#1776, kogaki#1805), and every column heading either sheet's tables carry.
export const BRIEF_PARTS = ["Thesis", "Claims", "Structure Mapping", "Legs"];
export const LPP_COLUMNS = [
  "id",
  "name",
  "claim",
  "reached",
  "holds",
  "from",
  "relation",
  "text",
  "Role",
  "Abstract",
  "Attribute",
  "between",
  "higher-order relation",
  "relates",
  "cite",
  "stated by",
  "paragraph",
  "paragraph Move",
  "Waypoints",
  "verdict",
  "Leg",
  "The Brief",
  "This run",
  "relations",
  "claims",
  "why",
];
// THE WORDS THE BRIEF SHEET NEVER PRINTS: the owner was never given their meaning (kogaki#1776).
export const BRIEF_RETIRED_WORDS = ["Trial", "Move", "Round", "Waypoint"];
const ACCENT =
  ':root[data-theme="dark"]{--accent:#e0a458}h1,h2{color:var(--accent)}tr.named td{background:#4a3a12}tr.unreached td{opacity:.6}' +
  ".refusal{white-space:pre-wrap}.line{margin:.15em 0}.cols{display:grid;grid-template-columns:1fr 1fr;gap:1em}" +
  "h3{font-size:1.05em;margin:1.2em 0 .3em}h4{font-size:.8em;text-transform:uppercase;letter-spacing:.05em;margin:.8em 0 .2em;color:#9aa}";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const line = (text, cls = "line") => `<p class="${cls}">${esc(text)}</p>`;
const none = (text) => `<p class="muted">${esc(text)}</p>`;
const listed = (name) =>
  [...LPP_HEADINGS, ...BRIEF_PARTS].some((h) =>
    h.includes("<") || h === "Round n" ? new RegExp(`^${h.replace(/<[^>]+>|\bn$/, ".+")}$`).test(name) : h === name,
  );
function heading(level, name) {
  if (!listed(name)) throw new Error(`the Leg-Planning sheet has no heading ${JSON.stringify(name)}`);
  return `<h${level}>${esc(name)}</h${level}>`;
}
const part = (name, body) =>
  `<section class="card" id="${esc(name.toLowerCase().replace(/[^a-z]+/g, "-"))}">${heading(2, name)}${body}</section>`;
const table = (head, rows) => {
  const stray = head.find((h) => !LPP_COLUMNS.includes(h));
  if (stray !== undefined) throw new Error(`the Leg-Planning sheet has no column heading ${JSON.stringify(stray)}`);
  return tableHtml(head, rows);
};
const tableHtml = (head, rows) =>
  `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
const row = (cells, cls = "") =>
  `<tr${cls ? ` class="${cls}"` : ""}>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
const link = (outDir, path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;
const stageOf = (record, name) => record.stages.find((s) => s.stage === name) || null;

const UNREACHED = "unreached — the article leaves it";

// The thesis and every claim, then the claims the thesis does not reach, with their cites.
function claimsPart(record, structure) {
  const all =
    line(`thesis: ${record.claims.thesis}`) +
    table(
      ["id", "cite", "claim"],
      record.claims.claims.map((c) => row([esc(c.id), esc(c.cite), esc(c.claim)])),
    );
  if (!structure || !structure.unreached) return all;
  const byId = new Map(record.claims.claims.map((c) => [c.id, c]));
  const left = structure.unreached.claims;
  return (
    all +
    heading(3, "Unreached claims") +
    (left.length
      ? table(
          ["id", "cite", "claim", "stated by"],
          left.map(
            (u) =>
              row([
                esc(u.id),
                esc(byId.get(u.id).cite),
                esc(byId.get(u.id).claim),
                esc(u.reached_by.map((id) => elementLabel(structure, id, record.claims.claims)).join(", ")),
              ]),
            "unreached",
          ),
        )
      : none("Every claim is reached; the article leaves none."))
  );
}

// Every Role, relation and higher-order relation as its name and the claim ids it is read from (kogaki#1772), each
// `holds` with its Roles' names, and never a bare id.
function structurePart(structure, claims) {
  if (!structure) return none("No structure was read.");
  const left = new Set(
    structure.unreached ? [...structure.unreached.relations, ...structure.unreached.higher_order].map((u) => u.id) : [],
  );
  const mark = (id) => (id === structure.attains_thesis ? "attains the thesis" : left.has(id) ? UNREACHED : "");
  const cls = (id) => (left.has(id) ? "unreached" : "");
  const label = (id) => esc(elementLabel(structure, id, claims));
  const nameOf = new Map(
    [...structure.roles, ...structure.relations, ...structure.higher_order].map((x) => [x.id, x.name]),
  );
  const names = (ids) => esc(ids.map((id) => nameOf.get(id) ?? id).join(", "));
  return (
    heading(3, "Roles") +
    table(
      ["Role", "Abstract", "Attribute"],
      structure.roles.map((r) => row([label(r.id), esc(r.context), esc(r.attributes.join(", "))])),
    ) +
    heading(3, "Relations") +
    table(
      ["relation", "between", "holds", "reached"],
      structure.relations.map((r) =>
        row([label(r.id), names(r.between), esc(readHolds(structure, r.holds)), esc(mark(r.id))], cls(r.id)),
      ),
    ) +
    heading(3, "Higher-order relations") +
    table(
      ["higher-order relation", "relates", "holds", "reached"],
      structure.higher_order.map((h) =>
        row([label(h.id), names(h.relates), esc(readHolds(structure, h.holds)), esc(mark(h.id))], cls(h.id)),
      ),
    )
  );
}

// THE MOVE LINE: the id linking to its file in the library, and its Corpus passage where an extraction record names it.
function moveLine(move, libraryDir, outDir) {
  const p = movePassage(move);
  const passage = !p
    ? esc(NO_RECORD)
    : !p.file
      ? esc(`passage ${p.passage}, paragraph ${p.paragraph} — no passage file on this machine`)
      : p.span
        ? `${link(outDir, p.file, `${relFromRepo(p.file)}:${p.line}`)} ${esc(`lines ${p.span.first}–${p.span.last}`)}`
        : esc(`${relFromRepo(p.file)} holds no paragraph ${p.paragraph}`);
  return `<p class="line">${link(outDir, join(libraryDir, `${move}.yaml`), move)}</p><p class="line">passage: ${passage}</p>`;
}

// One Leg of the `Legs` part (kogaki#1775): the relation it serves and its `text`, then the paragraphs the plan wrote
// under it, each with the Move the Leg binds (kogaki#1777) and its Waypoints.
function legHtml(leg, structure, planLeg, bindings, libraryDir, outDir) {
  const rows = ((planLeg && planLeg.paragraphs) || []).map((entry, k) => {
    const b = bindings.find((x) => x.leg_id === leg.leg_id && x.paragraph === k + 1) || null;
    const move = (planLeg && planLeg.move) || (b && b.move);
    const pws =
      (entry.paragraph_waypoints || [])
        .map((pw, i) => line(`${i + 1}. ${pw.performs !== undefined ? `performs: ${pw.performs}` : pw.point}`))
        .join("") || none("no Waypoints");
    return row([
      String(k + 1),
      move ? moveLine(move, libraryDir, outDir) : none("no Move bound"),
      pws,
      esc(b ? b.verdict : "not reached"),
    ]);
  });
  return (
    heading(3, `Leg ${leg.leg_id}`) +
    line(`serves ${elementLabel(structure, leg.relation)}${leg.reaches_target ? " (reaches the target)" : ""}`) +
    line(leg.text) +
    (rows.length ? table(["paragraph", "paragraph Move", "Waypoints", "verdict"], rows) : none("no paragraph planned"))
  );
}

function legsPart(record, legs, structure, plan, libraryDir, outDir) {
  const st = stageOf(record, "legs");
  if (!legs) return none(`No Legs were derived${st && st.stopped ? `: ${st.stopped}` : "."}`);
  const pst = stageOf(record, "paragraph-plan");
  const bindings = (pst && pst.paragraphs) || [];
  const planLegs = new Map(((plan && plan.legs) || []).map((l) => [l.leg_id, l]));
  return (
    (pst && pst.stopped ? line(`ParagraphPlan stopped: ${pst.stopped}`, "line refusal") : "") +
    legs.map((leg) => legHtml(leg, structure, planLegs.get(leg.leg_id), bindings, libraryDir, outDir)).join("")
  );
}

// THE ROUNDS OF THE PARAGRAPHPLAN STAGE, per paragraph of each Leg, from the record trial.json carries (kogaki#1767, kogaki#1777).
function planRounds(st, outDir) {
  const callLink = (dir) => link(outDir, resolve(REPO, dir), dir.split("/").slice(-2).join("/"));
  if (!(st.paragraphs || []).length)
    return st.stopped ? line(`stopped: ${st.stopped}`, "line refusal") : none("no Round");
  const units = [...new Set(st.paragraphs.map((w) => w.leg_id))];
  return units
    .map(
      (unit) =>
        heading(4, `Leg ${unit}`) +
        st.paragraphs
          .filter((w) => w.leg_id === unit)
          .flatMap((w) => w.rounds.map((r) => ({ w, r })))
          .map(({ w, r }) => {
            const calls = r.call === null ? none("none") : `<p class="line">${callLink(r.call)}</p>`;
            const blocks = {
              Submission: calls,
              Comment: line(`verdict: ${r.verdict}`) + (r.comment ? line(`why: ${r.comment}`, "line refusal") : ""),
              Calls: calls,
            };
            return (
              heading(4, `Round ${r.round}, paragraph ${w.paragraph}`) +
              CANDIDATE_ROUND_BLOCKS.map((b) => heading(4, b) + blocks[b]).join("")
            );
          })
          .join(""),
    )
    .join("");
}

// THE ROUNDS OF EACH STAGE, in the FLP's blocks: Submission, Comment, Calls. The Legs are derived and carry none.
function roundsPart(record, outDir) {
  const callLink = (c) => link(outDir, join(outDir, CALLS_DIR, c), c);
  return record.stages
    .map(
      (st) =>
        heading(3, `Stage ${st.stage}`) +
        (st.state === "not run"
          ? none("not run")
          : st.stage === "paragraph-plan"
            ? planRounds(st, outDir)
            : st.stage === "legs"
              ? none("derived by the runner — no Call")
              : (st.rounds || [])
                  .map((r) => {
                    const blocks = {
                      Submission:
                        []
                          .concat(r.submission)
                          .map((c) => `<p class="line">${callLink(c)}</p>`)
                          .join("") || none("none"),
                      Comment:
                        line(`verdict: ${r.verdict}`) + (r.comment ? line(`why: ${r.comment}`, "line refusal") : ""),
                      Calls: [...[].concat(r.submission), ...(r.calls || [])]
                        .map((c) => `<p class="line">${callLink(c)}</p>`)
                        .join(""),
                    };
                    return (
                      heading(4, `Round ${r.round}`) +
                      CANDIDATE_ROUND_BLOCKS.map((b) => heading(4, b) + blocks[b]).join("")
                    );
                  })
                  .join("")),
    )
    .join("");
}

const legPoints = (leg) =>
  `<p class="line">${esc(leg.move ? `Leg ${leg.leg_id} — ${leg.move}` : `Leg ${leg.leg_id}`)}</p>` +
  (typeof leg.text === "string"
    ? line(leg.text)
    : (leg.waypoints || []).map((w, i) => line(`${i + 1}. ${w.point}`)).join(""));

function briefPart(briefLegs, legs) {
  const n = Math.max(briefLegs.length, (legs || []).length);
  return table(
    ["Leg", "The Brief", "This run"],
    Array.from({ length: n }, (_, i) =>
      row([String(i + 1), briefLegs[i] ? legPoints(briefLegs[i]) : "", legs && legs[i] ? legPoints(legs[i]) : ""]),
    ),
  );
}

export function renderLppSheet({
  outDir,
  record,
  structure,
  legs,
  plan = null,
  libraryDir = resolve(REPO, "moves"),
  briefLegs = null,
}) {
  const parts = [
    part("Claims", claimsPart(record, structure)),
    part("Structure", structurePart(structure, record.claims.claims)),
    part("Legs", legsPart(record, legs, structure, plan, libraryDir, outDir)),
    part("Rounds", roundsPart(record, outDir)),
    ...(briefLegs ? [part("The Brief's Legs", briefPart(briefLegs, legs))] : []),
  ];
  return (
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Leg-Planning Playground run ${esc(record.trial)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>` +
    `<h1>Leg-Planning Playground — run ${esc(record.trial)}</h1>` +
    (record.stopped ? line(`Stopped: ${record.stopped}`, "line refusal") : "") +
    parts.join("") +
    "</body></html>\n"
  );
}

// ---- THE BRIEF SHEET (kogaki#1776) ----
const MERMAID_CDN = "https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.esm.min.mjs";
const BRIEF_CSS = ".diagram .mermaid{margin:.5em 0}tr.unreached td{color:#e07070}";

// EACH STRAND'S CLAIM SENTENCE: the headline the newest Brief run that wrote this file resolved, else the proposition a
// Leg of the Brief carries for it, else none. The runs are read beside the `theses/` the Brief sits in.
export function briefClaims(brief, briefPath, root = resolve(briefPath, "..", "..", "..")) {
  const runsDir = join(root, "runs", "brief");
  const rel = relative(root, resolve(briefPath)).split("\\").join("/");
  const runs = existsSync(runsDir) ? readdirSync(runsDir).sort().reverse() : [];
  let served = [];
  for (const d of runs) {
    const f = join(runsDir, d, "run-record.json");
    if (!existsSync(f)) continue;
    let rec;
    try {
      rec = JSON.parse(readFileSync(f, "utf8"));
    } catch {
      continue;
    }
    if (!(rec.artifacts_written || []).some((a) => a.artifact === "brief" && a.path === rel)) continue;
    if (rec.brief_run_state && existsSync(rec.brief_run_state))
      served = strandClaims(JSON.parse(readFileSync(rec.brief_run_state, "utf8")));
    break;
  }
  const fromRun = new Map(served.map((c) => [c.id, c.claim]));
  const fromLegs = new Map();
  for (const leg of brief.reader_path || [])
    for (const c of leg.claims || [])
      if (c.strand && c.proposition && !fromLegs.has(c.strand)) fromLegs.set(c.strand, c.proposition);
  return (brief.strands || []).map((s) => ({ id: s.id, claim: fromRun.get(s.id) ?? fromLegs.get(s.id) ?? null }));
}

// THE STRUCTURE GRAPH: each element a node labelled by its name and claim ids, a relation joined to its Roles, a higher-order
// relation joined by a thick edge to what it relates, the apex blue and every unreached element red.
function structureGraph(structure, claims) {
  const quote = (s) => `"${String(s).replace(/"/g, "#quot;")}"`;
  const left = unreachedIds(structure);
  const lines = ["flowchart TB"];
  for (const x of [...structure.roles, ...structure.relations, ...structure.higher_order])
    lines.push(`  ${x.id}[${quote(elementLabel(structure, x.id, claims))}]`);
  for (const r of structure.relations) for (const role of r.between) lines.push(`  ${r.id} --- ${role}`);
  for (const h of structure.higher_order) for (const id of h.relates) lines.push(`  ${h.id} ==> ${id}`);
  lines.push(
    "  classDef apex fill:#2b5fa8,stroke:#9cc2ff,color:#ffffff",
    "  classDef unreached fill:#8a2626,stroke:#ff9a9a,color:#ffffff",
  );
  if (structure.attains_thesis) lines.push(`  class ${structure.attains_thesis} apex`);
  if (left.size) lines.push(`  class ${[...left].join(",")} unreached`);
  const text = lines.join("\n");
  return `<div class="diagram"><div class="mermaid">${esc(text)}</div><details><summary>Graph as text</summary><pre>${esc(text)}</pre></details></div>`;
}

function unreachedIds(structure) {
  const u = structure.unreached || {};
  const left = new Set([...(u.relations || []), ...(u.higher_order || [])].map((x) => x.id));
  for (const r of structure.relations)
    if (left.has(r.id))
      for (const role of r.between) {
        if (!structure.relations.some((o) => !left.has(o.id) && o.between.includes(role))) left.add(role);
      }
  return left;
}

// A Leg of the shape before kogaki#1775: the first key, in this order, that marks it.
function retiredLegKey(leg) {
  if ("waypoints" in leg) return "waypoints";
  if ("move" in leg) return "move";
  return typeof leg.text === "string" ? null : "text";
}

export function renderBriefSheet({ brief, claims }) {
  for (const leg of brief.reader_path || []) {
    const key = retiredLegKey(leg);
    if (key)
      throw new Error(
        `Leg ${leg.leg_id} ${key === "text" ? "carries no `text`" : `carries \`${key}\``}: this Brief predates kogaki#1775; regenerate it with /brief`,
      );
  }
  const structure = brief.structure;
  if (!structure) throw new Error("the Brief carries no `structure` to render");
  const leftClaims = new Set(((structure.unreached || {}).claims || []).map((c) => c.id));
  const left = unreachedIds(structure);
  const cls = (id) => (left.has(id) ? "unreached" : "");
  const holds = (h) => esc(readHolds(structure, h));
  const nameOf = (id) => esc(elementLabel(structure, id, claims));
  const elements = (list, holdsOf, fromOf, whyOf = null) =>
    table(
      ["id", "name", "holds", "from", ...(whyOf ? ["why"] : [])],
      list.map((x) =>
        row([esc(x.id), esc(x.name ?? ""), holdsOf(x), fromOf(x), ...(whyOf ? [whyOf(x)] : [])], cls(x.id)),
      ),
    );
  // THE CONNECTIONS THE READ WEIGHED (kogaki#1817): a Brief read before it carries none, and its sheet is unchanged.
  const considered = Array.isArray(structure.considered) ? structure.considered : null;
  const claimText = new Map(claims.map((c) => [c.id, c.claim]));
  const criterion = (c) =>
    c.criterion.map((id) => esc(`${id}: ${claimText.get(id) ?? "no claim sentence recorded"}`)).join("<br>");
  const connectedWhy = (h) => {
    const c = (considered || []).find(
      (x) =>
        x.verdict === "connected" &&
        x.relations.length === h.relates.length &&
        x.relations.every((id) => h.relates.includes(id)),
    );
    return c ? esc(c.why) : "";
  };
  const notConnected = considered
    ? heading(3, "Not connected") +
      table(
        ["relations", "claims", "why"],
        considered
          .filter((c) => c.verdict === "not_connected")
          .map((c) => row([c.relations.map(nameOf).join(", "), criterion(c), esc(c.why)])),
      )
    : "";
  const parts = [
    part("Thesis", line(brief.thesis)),
    part(
      "Claims",
      table(
        ["id", "claim", "reached"],
        claims.map((c) =>
          row(
            [
              esc(c.id),
              c.claim === null ? none("no claim sentence recorded") : esc(c.claim),
              esc(leftClaims.has(c.id) ? UNREACHED : "reached"),
            ],
            leftClaims.has(c.id) ? "unreached" : "",
          ),
        ),
      ),
    ),
    part(
      "Structure Mapping",
      structureGraph(structure, claims) +
        heading(3, "Roles") +
        elements(
          structure.roles,
          (r) => esc(r.context ?? ""),
          (r) => esc((r.claims || []).join(", ")),
        ) +
        heading(3, "Relations") +
        elements(
          structure.relations,
          (r) => holds(r.holds),
          (r) => esc(r.from ?? ""),
        ) +
        heading(3, "Higher-order relations") +
        elements(
          structure.higher_order,
          (h) => holds(h.holds),
          (h) => (h.id === structure.attains_thesis ? "" : esc([].concat(h.from ?? []).join(", "))),
          considered ? connectedWhy : null,
        ) +
        notConnected,
    ),
    part(
      "Legs",
      table(
        ["id", "relation", "text"],
        (brief.reader_path || []).map((l) => row([esc(l.leg_id), nameOf(l.relation), esc(l.text)])),
      ),
    ),
  ];
  return (
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Brief ${esc(brief.slug)}</title><style>${proofSheetCss()}\n${ACCENT}${BRIEF_CSS}</style>` +
    `<script type="module">import mermaid from "${MERMAID_CDN}"; mermaid.initialize({ startOnLoad: true, theme: "dark" });</script></head><body>` +
    `<h1>Brief — ${esc(brief.slug)}</h1>` +
    parts.join("") +
    "</body></html>\n"
  );
}

const BRIEF_USAGE =
  "usage: node src/leg-planning/sheet.mjs brief --brief <theses/<slug>/brief.yaml> --out <dir>\n" +
  "       node src/leg-planning/sheet.mjs show --brief <theses/<slug>/brief.yaml>";

// Reads and renders the Brief at `briefPath`; a refusal exits 1 before anything is written.
function renderOrExit(briefPath) {
  if (!existsSync(briefPath)) {
    process.stderr.write(`sheet: ${briefPath} does not exist\n`);
    process.exit(1);
  }
  const text = readFileSync(briefPath, "utf8");
  const brief = parseYaml(text, briefPath);
  try {
    return { text, html: renderBriefSheet({ brief, claims: briefClaims(brief, briefPath) }) };
  } catch (e) {
    process.stderr.write(`sheet: ${briefPath}: ${e.message}\n`);
    process.exit(1);
  }
}

// The Brief sheet's owner act, /brief-sheet (kogaki#1788): its home is read from the Brief's path, so
// `<root>/theses/<slug>/brief.yaml` writes under `<root>/runs/leg-planning/brief-sheets/<slug>/`.
function showMain(briefPath) {
  const abs = resolve(briefPath);
  const slug = basename(dirname(abs));
  if (basename(abs) !== "brief.yaml" || basename(dirname(dirname(abs))) !== "theses") {
    process.stderr.write(`sheet: ${briefPath} is not a theses/<slug>/brief.yaml\n`);
    process.exit(2);
  }
  const { text, html } = renderOrExit(abs);
  const root = dirname(dirname(dirname(abs)));
  const home = join(root, "runs", "leg-planning", "brief-sheets", slug);
  mkdirSync(home, { recursive: true });
  const out = join(home, "sheet.html");
  writeFileSync(out, html);
  writeFileSync(
    join(home, "brief.sha256"),
    `${createHash("sha256").update(text).digest("hex")}  ${relative(root, abs)}\n`,
  );
  process.stdout.write(`${pathToFileURL(out).href}\n`);
}

function briefMain(argv) {
  const arg = (k) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const briefPath = arg("brief");
  if (argv[0] === "show" && briefPath) return showMain(briefPath);
  const outDir = arg("out");
  if (argv[0] !== "brief" || !briefPath || !outDir) {
    process.stderr.write(`${BRIEF_USAGE}\n`);
    process.exit(2);
  }
  const { html } = renderOrExit(briefPath);
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, "sheet.html");
  writeFileSync(out, html);
  process.stdout.write(`${out}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  briefMain(process.argv.slice(2));
