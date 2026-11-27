// The BriefPlanPlayground (kogaki#1776, kogaki#1967): one page over one adopted Brief file, rendered with no model
// call, its parts in a fixed order and every heading from one fixed list.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The BriefPlanPlayground
//       specs/spec-draft-pipeline/SPEC.md
//
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { strandClaims } from "../brief/run-state.mjs";
import { proofSheetCss } from "../structure-mapping-playground/sheet.mjs";
import { elementLabel, readHolds } from "../compose/structure.mjs";
import { readBriefFiles } from "../compose/brief-files.mjs";
import { readSatellites, rolesFirstUsed, wholeReaderPath } from "../compose/satellites.mjs";
import { relationsAmongRelations, relationsAmongRoles } from "../sme/structure.mjs";
import { undeclaredLegKeyRefusal } from "../compose/leg-schema.mjs";
import { readDocumentPlan } from "../document-plan/file.mjs";
import { readRs, sentenceOf, RESTS_ON } from "../rs/file.mjs";

// THE BRIEFPLANPLAYGROUND'S PARTS, in order (kogaki#1776, kogaki#1805).
export const BRIEF_PARTS = ["Thesis", "Claims", "Structure Mapping", "Legs"];
// THE PARTS OF A DOCUMENTPLAN'S PAGE, in order (kogaki#1977).
export const PLAN_PARTS = ["ReaderPath", "Connections", "RS files"];
// THE PART DRAWN BETWEEN STRUCTURE MAPPING AND LEGS where satellites.yaml holds an entry (kogaki#1964).
export const ADDED_PART = "Added structures";
// THE ONLY HEADINGS THE SHEET CARRIES: the parts, and these, and one per entry of satellites.yaml.
export const BRIEF_HEADINGS = [
  ...BRIEF_PARTS,
  ADDED_PART,
  ...PLAN_PARTS,
  "Read from",
  "Roles",
  "Relations",
  "Higher-order relations",
  "Not connected",
];
// THE LINE ABOVE THE LEGS TABLE (kogaki#1964).
export const FIRST_USED_LINE = "A Role first used at a Leg is what a Background placed before that Leg would explain.";
// EVERY COLUMN HEADING THE SHEET'S TABLES CARRY.
export const BRIEF_COLUMNS = [
  "id",
  "name",
  "claim",
  "reached",
  "holds",
  "from",
  "relation",
  "text",
  "relations",
  "claims",
  "why",
  "cite",
  "structure",
  "Roles first used here",
  "position",
  "rs",
  "apex",
  "nucleus",
  "context",
];
// THE WORDS THE BRIEFPLANPLAYGROUND NEVER PRINTS: the owner was never given their meaning (kogaki#1776).
export const BRIEF_RETIRED_WORDS = ["Trial", "Move", "Round"];
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
function heading(level, name) {
  if (!BRIEF_HEADINGS.includes(name)) throw new Error(`the BriefPlanPlayground has no heading ${JSON.stringify(name)}`);
  return `<h${level}>${esc(name)}</h${level}>`;
}
const part = (name, body) =>
  `<section class="card" id="${esc(name.toLowerCase().replace(/[^a-z]+/g, "-"))}">${heading(2, name)}${body}</section>`;
const table = (head, rows) => {
  const stray = head.find((h) => !BRIEF_COLUMNS.includes(h));
  if (stray !== undefined) throw new Error(`the BriefPlanPlayground has no column heading ${JSON.stringify(stray)}`);
  return tableHtml(head, rows);
};
const tableHtml = (head, rows) =>
  `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
const row = (cells, cls = "") =>
  `<tr${cls ? ` class="${cls}"` : ""}>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
const UNREACHED = "unreached — the article leaves it";

// ---- THE BRIEFPLANPLAYGROUND (kogaki#1776) ----
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
// relation joined by a thick edge to what it relates, the apex blue and every unreached element red. Each entry of
// satellites.yaml (kogaki#1964) is a subgraph whose node ids are prefixed `<entry id>__`, as `r_1` repeats across
// structures.
const quote = (s) => `"${String(s).replace(/"/g, "#quot;")}"`;
function elementLines(structure, claims, id = (x) => x, pad = "  ") {
  const lines = [];
  for (const x of [...structure.roles, ...relationsAmongRoles(structure), ...relationsAmongRelations(structure)])
    lines.push(`${pad}${id(x.id)}[${quote(elementLabel(structure, x.id, claims))}]`);
  for (const r of relationsAmongRoles(structure))
    for (const role of r.between) lines.push(`${pad}${id(r.id)} --- ${id(role)}`);
  for (const h of relationsAmongRelations(structure))
    for (const x of h.relates) lines.push(`${pad}${id(h.id)} ==> ${id(x)}`);
  return lines;
}

export function structureGraphText(structure, claims, satellites = []) {
  const left = unreachedIds(structure);
  const apex = structure.attains_thesis ? [structure.attains_thesis] : [];
  const lines = ["flowchart TB"];
  if (!satellites.length) lines.push(...elementLines(structure, claims));
  else {
    lines.push(`  subgraph nucleus[${quote("Brief")}]`, ...elementLines(structure, claims, (x) => x, "    "), "  end");
    for (const e of satellites) {
      const id = (x) => `${e.id}__${x}`;
      lines.push(
        `  subgraph ${e.id}[${quote(`${e.id} · ${e.rst_relation} · before ${e.before}`)}]`,
        ...elementLines(e.structure, e.sources || [], id, "    "),
        "  end",
      );
      for (const x of unreachedIds(e.structure)) left.add(id(x));
    }
    for (const e of satellites)
      lines.push(
        `  ${e.id}__${e.structure.attains_thesis} -. ${quote(e.rst_relation)} .-> ${structure.attains_thesis}`,
      );
    apex.push(...satellites.map((e) => `${e.id}__${e.structure.attains_thesis}`));
  }
  lines.push(
    "  classDef apex fill:#2b5fa8,stroke:#9cc2ff,color:#ffffff",
    "  classDef unreached fill:#8a2626,stroke:#ff9a9a,color:#ffffff",
  );
  if (apex.length) lines.push(`  class ${apex.join(",")} apex`);
  if (left.size) lines.push(`  class ${[...left].join(",")} unreached`);
  return lines.join("\n");
}

function structureGraph(structure, claims, satellites) {
  const text = structureGraphText(structure, claims, satellites);
  return `<div class="diagram"><div class="mermaid">${esc(text)}</div><details><summary>Graph as text</summary><pre>${esc(text)}</pre></details></div>`;
}

function unreachedIds(structure) {
  const u = structure.unreached || {};
  const left = new Set((u.relations || []).map((x) => x.id));
  const among = relationsAmongRoles(structure);
  for (const r of among)
    if (left.has(r.id))
      for (const role of r.between) {
        if (!among.some((o) => !left.has(o.id) && o.between.includes(role))) left.add(role);
      }
  return left;
}

// THE ROLES, RELATIONS AND HIGHER-ORDER RELATIONS TABLES of one structure, at heading `level`, every element a row and
// an unreached one marked; `whyOf`, where given, fills a `why` column of the higher-order relations.
function structureTables(structure, claims, level, whyOf = null) {
  const left = unreachedIds(structure);
  const cls = (id) => (left.has(id) ? "unreached" : "");
  const holds = (h) => esc(readHolds(structure, h));
  const elements = (list, holdsOf, fromOf, why = null) =>
    table(
      ["id", "name", "holds", "from", ...(why ? ["why"] : [])],
      list.map((x) => row([esc(x.id), esc(x.name ?? ""), holdsOf(x), fromOf(x), ...(why ? [why(x)] : [])], cls(x.id))),
    );
  return (
    heading(level, "Roles") +
    elements(
      structure.roles,
      (r) => esc(r.context ?? ""),
      (r) => esc((r.claims || []).join(", ")),
    ) +
    heading(level, "Relations") +
    elements(
      relationsAmongRoles(structure),
      (r) => holds(r.holds),
      (r) => esc(r.from ?? ""),
    ) +
    heading(level, "Higher-order relations") +
    elements(
      relationsAmongRelations(structure),
      (h) => holds(h.holds),
      (h) => (h.id === structure.attains_thesis ? "" : esc([].concat(h.from ?? []).join(", "))),
      whyOf,
    )
  );
}

// THE ADDED STRUCTURES PART (kogaki#1964): per entry of satellites.yaml, in the order of the file, its heading, its
// sources and its three tables.
function addedStructures(satellites) {
  return satellites
    .map(
      (e) =>
        `<h3>${esc(`${e.id}: ${e.rst_relation}, before ${e.before}`)}</h3>` +
        table(
          ["id", "cite", "claim"],
          (e.sources || []).map((u) => row([esc(u.id), esc(u.cite), esc(u.claim)])),
        ) +
        structureTables(e.structure, e.sources || [], 4),
    )
    .join("");
}

// THE LEGS PART (kogaki#1964): the whole Reader Path in order, the `structure` column drawn only with entries, and for each
// Leg of the Brief the names of the Roles it is the first to use.
function legsPart(brief, claims, satellites) {
  const structure = brief.structure;
  const first = rolesFirstUsed(structure, brief.reader_path || []);
  const roleName = new Map(structure.roles.map((r) => [r.id, r.name ?? r.id]));
  const byId = new Map(satellites.map((e) => [e.id, e]));
  const rows = wholeReaderPath(brief, { satellites }).map((l) => {
    const e = l.satellite ? byId.get(l.satellite) : null;
    const label = e
      ? elementLabel(e.structure, l.relation, e.sources || [])
      : elementLabel(structure, l.relation, claims);
    return row([
      esc(l.leg_id),
      ...(satellites.length ? [esc(e ? `${e.id} (${e.rst_relation})` : "Brief")] : []),
      esc(label),
      esc(l.text),
      esc(e ? "" : (first.get(l.leg_id) || []).map((id) => roleName.get(id)).join(", ")),
    ]);
  });
  return (
    line(FIRST_USED_LINE) +
    table(["id", ...(satellites.length ? ["structure"] : []), "relation", "text", "Roles first used here"], rows)
  );
}

export function renderBriefPlanPlayground({ brief, claims, satellites = [] }) {
  for (const leg of brief.reader_path || []) {
    const bad = undeclaredLegKeyRefusal(leg, `Leg ${leg.leg_id}`);
    if (bad) throw new Error(bad);
    if (typeof leg.text !== "string")
      throw new Error(
        `Leg ${leg.leg_id} carries no \`text\`: this Brief predates kogaki#1775; regenerate it with /brief`,
      );
  }
  const structure = brief.structure;
  if (!structure) throw new Error("the Brief carries no `structure` to render");
  const leftClaims = new Set(((structure.unreached || {}).claims || []).map((c) => c.id));
  const nameOf = (id) => esc(elementLabel(structure, id, claims));
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
      structureGraph(structure, claims, satellites) +
        structureTables(structure, claims, 3, considered ? connectedWhy : null) +
        notConnected,
    ),
    ...(satellites.length ? [part(ADDED_PART, addedStructures(satellites))] : []),
    part("Legs", legsPart(brief, claims, satellites)),
  ];
  return (
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>BriefPlanPlayground ${esc(brief.slug)}</title><style>${proofSheetCss()}\n${ACCENT}${BRIEF_CSS}</style>` +
    `<script type="module">import mermaid from "${MERMAID_CDN}"; mermaid.initialize({ startOnLoad: true, theme: "dark" });</script></head><body>` +
    `<h1>BriefPlanPlayground — ${esc(brief.slug)}</h1>` +
    parts.join("") +
    "</body></html>\n"
  );
}

// ---- A DOCUMENTPLAN'S PAGE (kogaki#1977): its RS files in reading order and the relation joining each to its Nucleus ----
// THE MARK ON THE TOP NUCLEUS'S ROW.
export const TOP_NUCLEUS = "top Nucleus";

// THE CONNECTIONS AS INDENTED TEXT: the top Nucleus first, each Satellite one step in under its Nucleus with its
// relation's name before its own, the Satellites of one Nucleus in the plan's order.
export function connectionsText(plan, top) {
  const lines = [top];
  const walk = (nucleus, depth) => {
    for (const rs of plan.order) {
      const c = plan.connections.find((x) => x.satellite === rs && x.nucleus === nucleus);
      if (!c) continue;
      lines.push(`${"  ".repeat(depth)}${c.relation}: ${rs}`);
      walk(rs, depth + 1);
    }
  };
  walk(top, 1);
  return lines.join("\n");
}

// ONE RS FILE'S PART: what it was read from, its Roles and its Relations.
function rsFilePart(name, record) {
  const readFrom = Object.hasOwn(record, RESTS_ON)
    ? record.sources.map((s) => line(s.text)).join("") +
      table(
        ["cite"],
        record[RESTS_ON].map((c) => row([esc(c)])),
      )
    : table(
        ["id", "cite"],
        record.sources.map((s) => row([esc(s.id), esc(s.cite)])),
      );
  return (
    `<h3>${esc(name)}</h3>` +
    heading(4, "Read from") +
    readFrom +
    heading(4, "Roles") +
    table(
      ["id", "name", "context"],
      record.roles.map((r) => row([esc(r.id), esc(r.name), esc(r.context)])),
    ) +
    heading(4, "Relations") +
    table(
      ["id", "name", "holds"],
      record.relations.map((c) => row([esc(c.id), esc(c.name), esc(sentenceOf(record, c))])),
    )
  );
}

// `records` maps each RS of the plan to what readRs returned for it.
export function renderPlanPage({ name, plan, top, records }) {
  const joinOf = new Map(plan.connections.map((c) => [c.satellite, c]));
  const readerPath = table(
    ["position", "rs", "apex", "relation", "nucleus"],
    plan.order.map((rs, i) => {
      const { record, apex } = records.get(rs);
      const c = joinOf.get(rs);
      return row(
        [
          esc(i + 1),
          esc(rs) + (rs === top ? ` <span class="muted">${esc(TOP_NUCLEUS)}</span>` : ""),
          esc(sentenceOf(record, apex)),
          esc(c ? c.relation : ""),
          esc(c ? c.nucleus : ""),
        ],
        rs === top ? "named top" : "",
      );
    }),
  );
  const parts = [
    part("ReaderPath", readerPath),
    part("Connections", `<pre>${esc(connectionsText(plan, top))}</pre>`),
    part("RS files", plan.order.map((rs) => rsFilePart(rs, records.get(rs).record)).join("")),
  ];
  return (
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>BriefPlanPlayground ${esc(name)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>` +
    `<h1>BriefPlanPlayground — ${esc(name)}</h1>` +
    parts.join("") +
    "</body></html>\n"
  );
}

// `show --plan` (kogaki#1977): the plan at `<root>/document-plans/<name>.yaml` and its RS files at `<root>/rs/`, the page
// written under `<root>/runs/brief-plan-playground/plan-<name>/`. A refusal exits 1 before anything is written.
function showPlanMain(planPath) {
  const abs = resolve(planPath);
  if (!abs.endsWith(".yaml") || basename(dirname(abs)) !== "document-plans") {
    process.stderr.write(`sheet: ${planPath} is not a document-plans/<name>.yaml\n`);
    process.exit(2);
  }
  const root = dirname(dirname(abs));
  const at = (p) => relative(root, p).split("\\").join("/");
  const name = basename(abs, ".yaml");
  const read = existsSync(abs) ? readDocumentPlan(abs, at(abs)) : { error: `${at(abs)} does not exist` };
  if (read.error) {
    process.stderr.write(`sheet: ${read.error}\n`);
    process.exit(1);
  }
  const records = new Map();
  for (const rs of read.plan.order) {
    const file = join(root, "rs", `${rs}.yaml`);
    const r = existsSync(file) ? readRs(file, at(file)) : { error: `the RS ${rs} has no file ${at(file)}` };
    if (r.error) {
      process.stderr.write(`sheet: ${r.error.startsWith("the RS") ? r.error : `the RS ${rs}: ${r.error}`}\n`);
      process.exit(1);
    }
    records.set(rs, r);
  }
  const html = renderPlanPage({ name, plan: read.plan, top: read.top, records });
  const home = join(root, "runs", "brief-plan-playground", `plan-${name}`);
  mkdirSync(home, { recursive: true });
  const out = join(home, "sheet.html");
  writeFileSync(out, html);
  process.stdout.write(`${pathToFileURL(out).href}\n`);
}

const BRIEF_USAGE =
  "usage: node src/brief-plan-playground/sheet.mjs brief --brief <theses/<slug>/brief.yaml> --out <dir>\n" +
  "       node src/brief-plan-playground/sheet.mjs show --brief <theses/<slug>/brief.yaml>\n" +
  "       node src/brief-plan-playground/sheet.mjs show --plan <document-plans/<name>.yaml>";

// Reads and renders the Brief at `briefPath`; a refusal exits 1 before anything is written.
function renderOrExit(briefPath) {
  if (!existsSync(briefPath)) {
    process.stderr.write(`sheet: ${briefPath} does not exist\n`);
    process.exit(1);
  }
  // THE BRIEF'S THREE FILES, read through their one reader and hashed as one (kogaki#1955).
  const read = readBriefFiles(briefPath);
  if (read.error) {
    process.stderr.write(`sheet: ${read.error}\n`);
    process.exit(1);
  }
  const brief = read.record;
  // THE STRUCTURES ADDED BESIDE THE BRIEF (kogaki#1964), outside its hash.
  const added = readSatellites(briefPath, brief);
  if (added.error) {
    process.stderr.write(`sheet: ${added.error}\n`);
    process.exit(1);
  }
  const satellites = added.absent ? [] : added.record.satellites;
  try {
    return {
      sha256: read.sha256,
      html: renderBriefPlanPlayground({ brief, claims: briefClaims(brief, briefPath), satellites }),
    };
  } catch (e) {
    process.stderr.write(`sheet: ${briefPath}: ${e.message}\n`);
    process.exit(1);
  }
}

// The BriefPlanPlayground's `show` (kogaki#1788), run by adoption and `src/satellite.mjs add` (kogaki#1967): its home
// is read from the Brief's path, so
// `<root>/theses/<slug>/brief.yaml` writes under `<root>/runs/brief-plan-playground/<slug>/`.
function showMain(briefPath) {
  const abs = resolve(briefPath);
  const slug = basename(dirname(abs));
  if (basename(abs) !== "brief.yaml" || basename(dirname(dirname(abs))) !== "theses") {
    process.stderr.write(`sheet: ${briefPath} is not a theses/<slug>/brief.yaml\n`);
    process.exit(2);
  }
  const { sha256, html } = renderOrExit(abs);
  const root = dirname(dirname(dirname(abs)));
  const home = join(root, "runs", "brief-plan-playground", slug);
  mkdirSync(home, { recursive: true });
  const out = join(home, "sheet.html");
  writeFileSync(out, html);
  writeFileSync(join(home, "brief.sha256"), `${sha256}  ${relative(root, abs)}\n`);
  process.stdout.write(`${pathToFileURL(out).href}\n`);
}

function briefMain(argv) {
  const arg = (k) => {
    const i = argv.indexOf(`--${k}`);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const briefPath = arg("brief");
  if (argv[0] === "show" && briefPath) return showMain(briefPath);
  if (argv[0] === "show" && arg("plan")) return showPlanMain(arg("plan"));
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
