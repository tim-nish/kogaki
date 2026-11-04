// The short Trial's sheet (kogaki#1669, kogaki#1671, kogaki#1673): the WBS beside the Paragraph, one
// mapping table of the Roles and the base, the binding, the RelationalStructure and every model call,
// on the Proof Sheet's cards.
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

const LEG_SHEET = join(REPO, "src", "proof-sheet", "leg-sheet.mjs");
// The Proof Sheet's stylesheet is its renderer's `CSS` constant, read from the source rather than copied.
const CSS_DECLARATION = /^const CSS = `([\s\S]*?)`;$/m;
// The Playground's own accent, so its sheet is told from a Proof Sheet at a glance.
const ACCENT = ':root[data-theme="dark"]{--accent:#6cc3d5;--off:#163a42}h1,h2{color:var(--accent)}'
  + ".cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cols>div{border:1px solid var(--line);border-radius:6px;padding:8px}"
  + ".cols h3{margin:4px 0 8px;font-size:15px}.prose{white-space:pre-wrap}";
// The part ids, in the order the sheet carries them.
export const SHEET_PARTS = ["wbs-paragraph", "mapping", "binding", "structure", "calls"];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pre = (t) => `<pre>${esc(t)}</pre>`;
const targetHtml = (t) => (typeof t === "string" ? esc(t) : pre(stringifyYaml(t)));
const part = (id, title, body) => `<section class="card" id="${id}"><h2>${esc(title)}</h2>${body}</section>`;
const none = (what) => `<p class="muted">${esc(what)}</p>`;
const orNull = (v) => (v === null || v === undefined ? '<span class="muted">null</span>' : esc(v));

export function proofSheetCss() {
  const m = CSS_DECLARATION.exec(readFileSync(LEG_SHEET, "utf8"));
  if (!m) throw new Error(`${LEG_SHEET} declares no \`const CSS\` stylesheet for the short Trial's sheet to reuse`);
  return m[1];
}

function readCalls(outDir, stages) {
  return stages.flatMap((s) => {
    const p = join(outDir, s.stage, CALLS_FILE);
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf8").split("\n").filter(Boolean).map((l, i) => ({ stage: s.stage, n: i + 1, ...JSON.parse(l) }));
  });
}

// The structure's elements, Roles first: each with the id a pair names it by and the sentence that says
// what it is. The placeholder names an element by that sentence, so either form resolves.
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
  const cell = (v) => (v === undefined ? "" : targetHtml(v));
  const baseCell = (ps) => ps.map((p) => (p.base === null ? '<span class="muted">null</span>' : targetHtml(p.base))).join("<br>");
  const caption = table ? `${table.variant}${table.placeholder ? " — a placeholder, not an RBS" : ""}` : "no table";
  return `<table><caption>${esc(caption)}</caption><thead><tr><th>Role</th><th>What the Role is</th><th>Strand words dropped</th>`
    + `<th>In the base: ${orNull(base.domain)} <span class="meta">${orNull(base.kind)}</span></th></tr></thead><tbody>`
    + rows.map((r) => `<tr><td>${r.key === null ? "" : esc(r.key)}</td><td>${cell(r.what)}</td><td>${cell(r.words)}</td><td>${baseCell(r.pairs)}</td></tr>`).join("")
    + "</tbody></table>";
}

export function renderShortSheet({ outDir, record, strand, structure, table, entry, paragraphPath }) {
  const paragraph = existsSync(paragraphPath) ? `<div class="prose">${esc(readFileSync(paragraphPath, "utf8"))}</div>`
    : record.stopped ? `<p class="stop">stopped — ${esc(record.stopped)}</p>` : none("No paragraph was written.");
  const wbsParagraph = `<div class="cols"><div><h3>WBS <span class="meta">${esc(strand.cite)}</span></h3>`
    + `<p><b>claim:</b> ${esc(strand.claim)}</p><div class="prose">${esc(strand.rendering)}</div></div>`
    + `<div><h3>Paragraph</h3>${paragraph}</div></div>`;
  const mapping = structure || table ? mappingTable(structure, table) : none("Neither a structure nor a table was read.");
  const supplied = record.bind && record.bind.state === "supplied" ? ' <span class="meta">supplied by the owner, no model call</span>' : "";
  const binding = entry
    ? `<p><b>Move:</b> ${esc(entry.move)}${supplied}</p><ol>${(entry.paragraph_waypoints || []).map((p) =>
      `<li>${Object.hasOwn(p, "performs") ? `<i>${esc(p.performs)}</i>` : `${esc(p.point)} <span class="meta">serves ${esc((p.serves || []).join(", "))}</span>`}</li>`).join("")}</ol>`
    : none("No Move was bound.");
  const structureHtml = structure ? `<details class="part"><summary>the structure the Trial read</summary>${pre(stringifyYaml(structure))}</details>` : none("No structure was read.");
  const calls = readCalls(outDir, record.stages);
  const callsHtml = calls.length
    ? calls.map((c) => `<details class="part"><summary>${esc(c.stage)} call ${c.n} <span class="meta">exit ${esc(c.exit)} · ${esc(c.at)}</span></summary>`
      + `<details class="sub"><summary>prompt</summary>${pre(c.stdin)}</details><details class="sub" open><summary>answer</summary>${pre(c.stdout)}</details></details>`).join("")
    : none("No model call was made.");
  const stages = `<p class="meta">${record.stages.map((s) => `${esc(s.stage)}: ${esc(s.state)}`).join(" · ")}</p>`
    + (record.stopped ? `<p class="stop">stopped — ${esc(record.stopped)}</p>` : "");
  return `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`
    + `<title>Playground short Trial ${esc(record.trial)}</title><style>${proofSheetCss()}\n${ACCENT}</style></head><body>`
    + `<h1>Structure-Mapping Playground — short Trial ${esc(record.trial)}</h1>${stages}`
    + part("wbs-paragraph", "WBS and Paragraph", wbsParagraph)
    + part("mapping", "Mapping", mapping)
    + part("binding", "RBS: the bound Move and its points", binding)
    + part("structure", "RelationalStructure", structureHtml)
    + part("calls", "Model calls", callsHtml)
    + "</body></html>\n";
}
