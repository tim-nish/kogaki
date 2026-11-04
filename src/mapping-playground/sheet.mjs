// The short Trial's sheet (kogaki#1673).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../workflow/run-record.mjs";
import { stringifyYaml } from "../yaml.mjs";
import { CALLS_FILE } from "../proof-sheet/leg-run.mjs";
import { moveContract } from "../compose.mjs";

const LEG_SHEET = join(REPO, "src", "proof-sheet", "leg-sheet.mjs");
// The Proof Sheet's stylesheet is its renderer's `CSS` constant, read from the source rather than copied.
const CSS_DECLARATION = /^const CSS = `([\s\S]*?)`;$/m;
// Mermaid is the Proof Sheet's, read from the same source (kogaki#1675).
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
  const higher = structure.higher_order ? [{ id: "higher_order", what: structure.higher_order.holds, role: false }] : [];
  return [...roles, ...relations, ...higher];
}

function mappingTable(structure, table) {
  const elements = elementsOf(structure);
  const dropped = new Map((structure && Array.isArray(structure.attributes) ? structure.attributes : [])
    .map((a) => [a.role, Array.isArray(a.words) ? a.words.join(", ") : a.words]));
  const pairs = table ? table.pairs : [];
  const named = (p, e) => p.target === e.id || p.target === e.what;
  const rows = elements.filter((e) => e.role).map((e) => ({ key: e.id, what: e.what, words: dropped.get(e.id), pairs: pairs.filter((p) => named(p, e)) }));
  for (const p of pairs.filter((q) => !rows.some((r) => r.pairs.includes(q)))) {
    const e = elements.find((x) => named(p, x));
    rows.push({ key: e ? e.id : null, what: e ? e.what : p.target, words: undefined, pairs: [p] });
  }
  const base = table && table.base ? table.base : { domain: null, kind: null };
  const kind = base.kind ? base.kind[0].toUpperCase() + base.kind.slice(1) : "Base";
  const cell = (v) => (v === undefined ? "" : targetHtml(v));
  const baseCell = (ps) => ps.map((p) => (p.base === null ? '<span class="muted">null</span>' : targetHtml(p.base))).join("<br>");
  const caption = table ? `${table.variant}${table.placeholder ? " — a placeholder, not an RBS" : ""}` : "no table";
  return `<table><caption>${esc(caption)}</caption><thead><tr><th>Role</th><th>Abstraction</th><th>Strand words dropped</th>`
    + `<th>${esc(kind)}: ${esc(base.domain === null || base.domain === undefined ? "null" : base.domain)}</th></tr></thead><tbody>`
    + rows.map((r) => `<tr><td>${r.key === null ? "" : esc(r.key)}</td><td>${cell(r.what)}</td><td>${cell(r.words)}</td><td>${baseCell(r.pairs)}</td></tr>`).join("")
    + "</tbody></table>";
}

// One row per Segment of the bound Move beside the point written for it (kogaki#1675).
function segmentsTable(record, entry) {
  if (!entry) return none("No Move was bound.");
  const c = moveContract(entry.move, join(REPO, record.library));
  const segments = c.error ? [] : c.segments;
  const points = entry.paragraph_waypoints || [];
  const how = record.bind && record.bind.state === "supplied" ? "supplied by the owner"
    : `bound by the model, bind ${(record.stages.find((s) => s.stage === "bind") || { state: "not run" }).state}`;
  const caption = `${entry.move} — ${how} — grounds: ${entry.grounds === null || entry.grounds === undefined ? "null" : entry.grounds}`;
  const n = Math.max(segments.length, points.length);
  const pointCell = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `<i>${esc(p.performs)}</i>` : esc(p.point));
  const field = (sg, k) => (sg && typeof sg[k] === "string" ? esc(sg[k]) : "");
  return (c.error ? `<p class="stop">${esc(c.error)}</p>` : "")
    + `<table><caption>${esc(caption)}</caption><thead><tr><th>#</th><th>operation</th><th>relation</th><th>manner</th><th>point</th></tr></thead><tbody>`
    + Array.from({ length: n }, (_, i) => `<tr><td>${i + 1}</td><td>${field(segments[i], "operation")}</td><td>${field(segments[i], "relation")}</td>`
      + `<td>${field(segments[i], "manner")}</td><td>${pointCell(points[i])}</td></tr>`).join("")
    + "</tbody></table>";
}

// The Structure section: the element table with its `unreached` marks, and a Mermaid graph LR (kogaki#1675).
function structureSection(structure) {
  const roles = structure.roles || [];
  const relations = structure.relations || [];
  const h = structure.higher_order;
  const inRelation = new Set(relations.flatMap((r) => r.between || []));
  const inHigher = new Set(h ? h.relates || [] : []);
  const unreached = (yes) => (yes ? ' <span class="stop">unreached</span>' : "");
  const row = (id, category, args, holds) => `<tr><td>${esc(id)}</td><td>${category}</td><td>${args}</td><td>${holds}</td></tr>`;
  const table = `<table><thead><tr><th>id</th><th>category</th><th>arguments</th><th>holds</th></tr></thead><tbody>`
    + roles.map((r) => row(r.id, `Role${unreached(!inRelation.has(r.id))}`, esc(r.context), "")).join("")
    + relations.map((r) => row(r.id, `relation${unreached(!inHigher.has(r.id))}`, esc((r.between || []).join(", ")), esc(r.holds))).join("")
    + (h ? row("higher_order", "higher-order", esc((h.relates || []).join(", ")), esc(h.holds)) : "")
    + "</tbody></table>";
  const node = new Map([...roles.map((r, i) => [r.id, `R${i}`]), ...relations.map((r, i) => [r.id, `L${i}`]), ["higher_order", "H0"]]);
  const label = (id) => `${node.get(id)}["${String(id).replace(/"/g, "#quot;")}"]`;
  const edges = [];
  for (const r of relations) for (const x of r.between || []) edges.push([node.get(x), node.get(r.id), false]);
  if (h) for (const x of h.relates || []) edges.push([node.get(x), "H0", true]);
  const accented = edges.map((e, i) => (e[2] ? i : -1)).filter((i) => i >= 0);
  const graph = ["graph LR",
    '  subgraph roles["Roles"]', ...roles.map((r) => `    ${label(r.id)}`), "  end",
    '  subgraph relations["Relations"]', ...relations.map((r) => `    ${label(r.id)}`), "  end",
    '  subgraph higher["Higher-order relations"]', ...(h ? [`    ${label("higher_order")}`] : []), "  end",
    ...edges.map(([a, b]) => `  ${a} --> ${b}`),
    ...(accented.length ? [`  linkStyle ${accented.join(",")} stroke:${ACCENT_COLOUR},stroke-width:2px`] : [])].join("\n");
  return table + `<div class="diagram"><div class="mermaid">${esc(graph)}</div></div>`
    + `<details class="part"><summary>the structure the Trial read</summary>${pre(stringifyYaml(structure))}</details>`;
}

export function renderShortSheet({ outDir, record, strand, structure, table, entry, paragraphPath }) {
  const paragraph = existsSync(paragraphPath) ? `<div class="prose">${esc(readFileSync(paragraphPath, "utf8"))}</div>`
    : record.stopped ? `<p class="stop">stopped — ${esc(record.stopped)}</p>` : none("No paragraph was written.");
  const wbsParagraph = `<div class="cols"><div><h3>WBS <span class="meta">${esc(strand.cite)}</span></h3>`
    + `<p><b>claim:</b> ${esc(strand.claim)}</p><div class="prose">${esc(strand.rendering)}</div></div>`
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
    + part("wbs-paragraph", "WBS and Paragraph", wbsParagraph)
    + part("segments", "Segments", segmentsTable(record, entry))
    + part("mapping", "Mapping", mapping)
    + part("structure", "Structure", structureHtml)
    + part("calls", "Model calls", callsHtml)
    + "</body></html>\n";
}
