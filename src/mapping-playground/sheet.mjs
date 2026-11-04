// The short Trial's sheet (kogaki#1669, kogaki#1671): the WBS beside the RBS slot, the correspondence
// table, the base, the dropped attributes, the RelationalStructure, the binding, the paragraph and every
// model call, on the Proof Sheet's cards.
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
export const SHEET_PARTS = ["wbs-rbs", "table", "base", "attributes", "structure", "binding", "paragraph", "calls"];

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

export function renderShortSheet({ outDir, record, strand, structure, table, entry, paragraphPath }) {
  const pairs = table ? table.pairs : [];
  const label = table ? `${table.variant}${table.placeholder ? " — a placeholder, not an RBS" : ""}` : "no table";
  const wbsRbs = `<div class="cols"><div><h3>WBS <span class="meta">${esc(strand.cite)}</span></h3>`
    + `<p><b>claim:</b> ${esc(strand.claim)}</p><div class="prose">${esc(strand.rendering)}</div></div>`
    + `<div><h3>RBS <span class="badge substitute">${esc(label)}</span></h3>`
    + (pairs.length ? `<ol>${pairs.map((p) => `<li>${targetHtml(p.target)}</li>`).join("")}</ol>` : none("The table was not filled."))
    + "</div></div>";
  const tableHtml = pairs.length
    ? `<table><thead><tr><th>#</th><th>base (WBS)</th><th>target (RBS)</th></tr></thead><tbody>${pairs.map((p, i) =>
      `<tr><td>${i + 1}</td><td>${p.base === null ? '<span class="muted">null</span>' : targetHtml(p.base)}</td><td>${targetHtml(p.target)}</td></tr>`).join("")}</tbody></table>`
    : none("The table was not filled.");
  const base = table && table.base
    ? `<p><b>domain:</b> ${orNull(table.base.domain)}</p><p><b>kind:</b> ${orNull(table.base.kind)}</p>`
    : none("The table names no base.");
  const attributes = structure && Array.isArray(structure.attributes) && structure.attributes.length
    ? `<table><thead><tr><th>Role</th><th>words dropped</th></tr></thead><tbody>${structure.attributes.map((a) =>
      `<tr><td>${esc(a.role)}</td><td>${targetHtml(Array.isArray(a.words) ? a.words.join(", ") : a.words)}</td></tr>`).join("")}</tbody></table>`
    : none("The structure names no attributes.");
  const supplied = record.bind && record.bind.state === "supplied" ? ' <span class="meta">supplied by the owner, no model call</span>' : "";
  const binding = entry
    ? `<p><b>Move:</b> ${esc(entry.move)}${supplied}</p><ol>${(entry.paragraph_waypoints || []).map((p) =>
      `<li>${Object.hasOwn(p, "performs") ? `<i>${esc(p.performs)}</i>` : `${esc(p.point)} <span class="meta">serves ${esc((p.serves || []).join(", "))}</span>`}</li>`).join("")}</ol>`
    : none("No Move was bound.");
  const paragraph = existsSync(paragraphPath) ? `<div class="prose">${esc(readFileSync(paragraphPath, "utf8"))}</div>` : none("No paragraph was written.");
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
    + part("wbs-rbs", "WBS and RBS", wbsRbs)
    + part("table", "Correspondence table", tableHtml)
    + part("base", "Base and its kind of match", base)
    + part("attributes", "Attributes the mapping drops", attributes)
    + part("structure", "RelationalStructure", structure ? pre(stringifyYaml(structure)) : none("No structure was read."))
    + part("binding", "Bound Move and Paragraph Waypoints", binding)
    + part("paragraph", "Paragraph", paragraph)
    + part("calls", "Model calls", callsHtml)
    + "</body></html>\n";
}
