// The short Trial's sheet (kogaki#1673), with one Segments table per paragraph binding (kogaki#1681) and the proposition
// in place of the Strand's rendering (kogaki#1685).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO } from "../workflow/run-record.mjs";
import { stringifyYaml } from "../yaml.mjs";
import { CALLS_FILE } from "../proof-sheet/leg-run.mjs";
import { moveContract, loadMoveContracts, MOVE_STATE_DIMENSIONS } from "../compose.mjs";
import { higherOrderOf } from "./structure.mjs";

const LEG_SHEET = join(REPO, "src", "proof-sheet", "leg-sheet.mjs");
// The Proof Sheet's stylesheet is its renderer's `CSS` constant, read from the source rather than copied.
const CSS_DECLARATION = /^const CSS = `([\s\S]*?)`;$/m;
const MERMAID_DECLARATION = /^const MERMAID_CDN = "([^"]+)";$/m;
const ACCENT_COLOUR = "#6cc3d5";
// The Playground's own accent, so its sheet is told from a Proof Sheet at a glance.
const ACCENT = `:root[data-theme="dark"]{--accent:${ACCENT_COLOUR};--off:#163a42}h1,h2{color:var(--accent)}`
  + ".cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cols>div{border:1px solid var(--line);border-radius:6px;padding:8px}"
  + ".cols h3{margin:4px 0 8px;font-size:15px}.prose{white-space:pre-wrap}.diagram .mermaid{max-height:none}";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pre = (t) => `<pre>${esc(t)}</pre>`;
const targetHtml = (t) => (typeof t === "string" ? esc(t) : pre(stringifyYaml(t)));
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const none = (what) => `<p class="muted">${esc(what)}</p>`;

export function proofSheetCss() {
  const m = CSS_DECLARATION.exec(readFileSync(LEG_SHEET, "utf8"));
  if (!m) throw new Error(`${LEG_SHEET} declares no \`const CSS\` stylesheet for the short Trial's sheet to reuse`);
  return m[1];
}

function mermaidScript() {
  const m = MERMAID_DECLARATION.exec(readFileSync(LEG_SHEET, "utf8"));
  if (!m) throw new Error(`${LEG_SHEET} declares no \`const MERMAID_CDN\` for the short Trial's sheet to load Mermaid from`);
  return `<script type="module">import mermaid from "${m[1]}"; mermaid.initialize({ startOnLoad: true, theme: "dark" });</script>`;
}

function readCalls(outDir, stages) {
  return stages.flatMap((s) => {
    const p = join(outDir, s.stage, CALLS_FILE);
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf8").split("\n").filter(Boolean).map((l, i) => ({ stage: s.stage, n: i + 1, ...JSON.parse(l) }));
  });
}

function elementsOf(structure) {
  if (!structure) return [];
  const roles = (structure.roles || []).map((r) => ({ id: r.id, what: r.context, role: true }));
  const relations = (structure.relations || []).map((r) => ({ id: r.id, what: r.holds, role: false }));
  const higher = (higherOrderOf(structure) || []).map((h) => ({ id: h.id, what: h.holds, role: false }));
  return [...roles, ...relations, ...higher];
}

function mappingTable(structure, table) {
  const elements = elementsOf(structure);
  const pairs = table ? table.pairs : [];
  const named = (p, e) => p.target === e.id || p.target === e.what;
  const rows = elements.filter((e) => e.role).map((e) => ({ key: e.id, what: e.what, pairs: pairs.filter((p) => named(p, e)) }));
  for (const p of pairs.filter((q) => !rows.some((r) => r.pairs.includes(q)))) {
    const e = elements.find((x) => named(p, x));
    rows.push({ key: e ? e.id : null, what: e ? e.what : p.target, pairs: [p] });
  }
  const base = table && table.base ? table.base : { domain: null, kind: null };
  const kind = base.kind ? base.kind[0].toUpperCase() + base.kind.slice(1) : "Base";
  const cell = (v) => (v === undefined ? "" : targetHtml(v));
  const baseCell = (ps) => ps.map((p) => (p.base === null ? '<span class="muted">null</span>' : targetHtml(p.base))).join("<br>");
  const caption = table ? `${table.variant}${table.placeholder ? " — a placeholder, not an RBS" : ""}` : "no table";
  return `<table><caption>${esc(caption)}</caption><thead><tr><th>Role</th><th>Abstraction</th>`
    + `<th>${esc(kind)}: ${esc(base.domain === null || base.domain === undefined ? "null" : base.domain)}</th></tr></thead><tbody>`
    + rows.map((r) => `<tr><td>${r.key === null ? "" : esc(r.key)}</td><td>${cell(r.what)}</td><td>${baseCell(r.pairs)}</td></tr>`).join("")
    + "</tbody></table>";
}

function labelledRow(label, values) {
  const vs = values.length ? values : [""];
  return `<tr><th rowspan="${vs.length}">${esc(label)}</th><td>${vs[0]}</td></tr>`
    + vs.slice(1).map((v) => `<tr><td>${v}</td></tr>`).join("");
}

const STATE_LINE = new RegExp(`^(${MOVE_STATE_DIMENSIONS.join("|")}): `);
function stateRows(state) {
  const rows = [];
  for (const line of String(state).split("\n")) {
    if (STATE_LINE.test(line) || !rows.length) rows.push(line);
    else rows[rows.length - 1] += `\n${line}`;
  }
  return rows.map(esc);
}

function bindingTable(record, entry, contracts) {
  const c = contracts.get(entry.move);
  const absent = [esc("not in the library")];
  const rationale = entry.binding_rationale === null || entry.binding_rationale === undefined ? "none" : entry.binding_rationale;
  return "<table><caption>Binding</caption><tbody>"
    + labelledRow("Move", [esc(entry.move)])
    + labelledRow("Bound by", [esc(record.bind.author)])
    + labelledRow("Before", c ? stateRows(c.before) : absent)
    + labelledRow("After", c ? stateRows(c.after) : absent)
    + labelledRow("Rationale", [esc(rationale)])
    + "</tbody></table>";
}

function segmentsTable(record, entry) {
  const c = moveContract(entry.move, join(REPO, record.library));
  const segments = c.error ? [] : c.segments;
  const points = entry.paragraph_waypoints || [];
  const n = Math.max(segments.length, points.length);
  const pointCell = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `<i>${esc(p.performs)}</i>` : esc(p.point));
  const field = (sg, k) => (sg && typeof sg[k] === "string" ? esc(sg[k]) : "");
  return (c.error ? `<p class="stop">${esc(c.error)}</p>` : "")
    + `<table><thead><tr><th>#</th><th>operation</th><th>relation</th><th>manner</th><th>point</th></tr></thead><tbody>`
    + Array.from({ length: n }, (_, i) => `<tr><td>${i + 1}</td><td>${field(segments[i], "operation")}</td><td>${field(segments[i], "relation")}</td>`
      + `<td>${field(segments[i], "manner")}</td><td>${pointCell(points[i])}</td></tr>`).join("")
    + "</tbody></table>";
}

function writerInputTable(outDir, record, leg) {
  const write = record.stages.find((s) => s.stage === "write");
  const packet = write && write.packet ? relative(outDir, join(REPO, write.packet)) : null;
  return "<table><caption>Writer input</caption><tbody>"
    + labelledRow("Asserts", (leg ? leg.claims : []).map((c) => esc(c.proposition)))
    + labelledRow("Points", [esc("the point column of each Segments table above")])
    + labelledRow("Packet", [packet ? `<a href="${esc(packet)}">${esc(packet)}</a>` : esc("none")])
    + "</tbody></table>";
}

function segmentsSection(outDir, record, leg, paragraphs) {
  if (!paragraphs || !paragraphs.length) return none("No Move was bound.");
  const library = loadMoveContracts(join(REPO, record.library));
  const contracts = new Map((library.error ? [] : library.moves).map((m) => [m.id, m]));
  return (library.error ? `<p class="stop">${esc(library.error)}</p>` : "")
    + paragraphs.map((p) => bindingTable(record, p, contracts) + segmentsTable(record, p)).join("")
    + writerInputTable(outDir, record, leg);
}

// A Mermaid node id: the element's own id, else `n<i>`; an authored `n<digits>` takes the fallback, so none collide.
const MERMAID_WORDS = new Set(["end", "graph", "flowchart", "subgraph", "style", "class", "classDef", "click", "linkStyle", "direction", "higher", "relations", "roles"]);
const nodeId = (id, i) => (/^[A-Za-z][A-Za-z0-9_]*$/.test(id) && !/^n\d+$/.test(id) && !MERMAID_WORDS.has(id) ? id : `n${i}`);

function structureSection(structure) {
  const roles = structure.roles || [];
  const relations = structure.relations || [];
  const higher = higherOrderOf(structure) || [];
  const inRelation = new Set(relations.flatMap((r) => r.between || []));
  const inHigher = new Set(higher.flatMap((h) => h.relates || []));
  const unreached = (yes) => (yes ? ' <span class="stop">unreached</span>' : "");
  const row = (id, category, args, holds) => `<tr><td>${esc(id)}</td><td>${category}</td><td>${args}</td><td>${holds}</td></tr>`;
  const table = `<table><thead><tr><th>id</th><th>category</th><th>arguments</th><th>holds</th></tr></thead><tbody>`
    + roles.map((r) => row(r.id, `Role${unreached(!inRelation.has(r.id))}`, esc(r.context), "")).join("")
    + relations.map((r) => row(r.id, `relation${unreached(!inHigher.has(r.id))}`, esc((r.between || []).join(", ")), esc(r.holds))).join("")
    + higher.map((h) => row(h.id, "higher-order", esc((h.relates || []).join(", ")), esc(h.holds))).join("")
    + "</tbody></table>";
  const node = new Map([...roles, ...relations, ...higher].map((e, i) => [e.id, nodeId(String(e.id), i)]));
  const label = (id) => `${node.get(id)}["${String(id).replace(/"/g, "#quot;")}"]`;
  const edges = [];
  for (const r of relations) for (const x of r.between || []) edges.push([node.get(x), node.get(r.id), false]);
  for (const h of higher) for (const x of h.relates || []) edges.push([node.get(x), node.get(h.id), true]);
  const accented = edges.map((e, i) => (e[2] ? i : -1)).filter((i) => i >= 0);
  const graph = ['%%{init: {"flowchart": {"curve": "linear"}}}%%', "graph BT",
    '  subgraph higher["Higher-order relations"]', ...higher.map((h) => `    ${label(h.id)}`), "  end",
    '  subgraph relations["Relations"]', ...relations.map((r) => `    ${label(r.id)}`), "  end",
    '  subgraph roles["Roles"]', ...roles.map((r) => `    ${label(r.id)}`), "  end",
    ...edges.map(([a, b]) => `  ${a} --> ${b}`),
    ...(accented.length ? [`  linkStyle ${accented.join(",")} stroke:${ACCENT_COLOUR},stroke-width:2px`] : [])].join("\n");
  return table + `<div class="diagram"><div class="mermaid">${esc(graph)}</div></div>`
    + `<details class="part"><summary>the structure the Trial read</summary>${pre(stringifyYaml(structure))}</details>`;
}

const paragraphHtml = (path, record) => (existsSync(path) ? `<div class="prose">${esc(readFileSync(path, "utf8"))}</div>`
  : record.stopped ? `<p class="stop">stopped — ${esc(record.stopped)}</p>` : none("No paragraph was written."));

export function renderShortSheet({ outDir, record, proposition, structure, table, leg, paragraphs, paragraphPath }) {
  const paragraph = paragraphHtml(paragraphPath, record);
  const cite = `<p><b>cite:</b> ${esc(proposition.cite)}</p>`;
  const propositionParagraph = `<div class="cols"><div><h3>Proposition</h3><p>${esc(proposition.proposition)}</p></div>`
    + `<div><h3>Paragraph</h3>${paragraph}</div></div>`;
  const mapping = structure || table ? mappingTable(structure, table) : none("Neither a structure nor a table was read.");
  const structureHtml = structure ? structureSection(structure) : none("No structure was read.");
  const calls = readCalls(outDir, record.stages);
  const callsHtml = calls.length
    ? calls.map((c) => `<details class="part"><summary>${esc(c.stage)} call ${c.n} <span class="meta">exit ${esc(c.exit)} · ${esc(c.at)}</span></summary>`
      + `<details class="sub"><summary>prompt</summary>${pre(c.stdin)}</details><details class="sub" open><summary>answer</summary>${pre(c.stdout)}</details></details>`).join("")
    : none("No model call was made.");
  const stages = `<p class="meta">${record.stages.map((s) => `${esc(s.stage)}: ${esc(s.state)}`).join(" · ")}</p>`
    + (record.stopped ? `<p class="stop">stopped — ${esc(record.stopped)}</p>` : "");
  return `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Playground short Trial ${esc(record.trial)}</title><style>${proofSheetCss()}\n${ACCENT}</style>${mermaidScript()}</head><body>`
    + `<h1>Structure-Mapping Playground — short Trial ${esc(record.trial)}</h1>${stages}`
    + part("strand", "Strand", cite)
    + part("proposition-paragraph", "Proposition and Paragraph", propositionParagraph)
    + part("segments", "Segments", segmentsSection(outDir, record, leg, paragraphs))
    + part("mapping", "Mapping", mapping)
    + part("structure", "Structure", structureHtml)
    + part("calls", "Model calls", callsHtml)
    + "</body></html>\n";
}
