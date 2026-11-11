// The short Trial's sheet (kogaki#1673), with one Segments table per paragraph binding (kogaki#1681), the proposition
// in place of the Strand's rendering (kogaki#1685), each binding's `takes` and `leaves` (kogaki#1700), and one Mapping Table per
// paragraph (kogaki#1709), the Base Paragraph's case and the leaves the last binding leaves unmet (kogaki#1719).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, relFromRepo } from "../workflow/run-record.mjs";
import { stringifyYaml, parseYaml } from "../yaml.mjs";
import { CALLS_FILE } from "../proof-sheet/leg-run.mjs";
import { moveContract, loadMoveContracts, CAST_KEYS } from "../compose.mjs";
import { higherOrderOf } from "./structure.mjs";
import { callRows, callsRoot, callRecordsOf } from "../workflow/call-record.mjs";
import { mappingDirFor, STRUCTURE_FILE, TABLE_FILE } from "../compose/mapping-record.mjs";

const LEG_SHEET = join(REPO, "src", "proof-sheet", "leg-sheet.mjs");
// The Proof Sheet's stylesheet is its renderer's `CSS` constant, read from the source rather than copied.
const CSS_DECLARATION = /^const CSS = `([\s\S]*?)`;$/m;
const MERMAID_DECLARATION = /^const MERMAID_CDN = "([^"]+)";$/m;
const ACCENT_COLOUR = "#6cc3d5";
// The Playground's own accent, so its sheet is told from a Proof Sheet at a glance.
const ACCENT =
  `:root[data-theme="dark"]{--accent:${ACCENT_COLOUR};--off:#163a42}h1,h2{color:var(--accent)}` +
  ".prose{white-space:pre-wrap}.diagram .mermaid{max-height:none}";

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
  if (!m)
    throw new Error(`${LEG_SHEET} declares no \`const MERMAID_CDN\` for the short Trial's sheet to load Mermaid from`);
  return `<script type="module">import mermaid from "${m[1]}"; mermaid.initialize({ startOnLoad: true, theme: "dark" });</script>`;
}

function readCalls(outDir, stages) {
  return stages.flatMap((s) => {
    const p = join(outDir, s.stage, CALLS_FILE);
    if (!existsSync(p)) return [];
    return readFileSync(p, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l, i) => ({ stage: s.stage, n: i + 1, ...JSON.parse(l) }));
  });
}

function elementsOf(structure) {
  if (!structure) return [];
  const roles = (structure.roles || []).map((r) => ({
    id: r.id,
    what: r.context,
    attributes: r.attributes || [],
    role: true,
  }));
  const relations = (structure.relations || []).map((r) => ({ id: r.id, what: r.holds, role: false }));
  const higher = (higherOrderOf(structure) || []).map((h) => ({ id: h.id, what: h.holds, role: false }));
  return [...roles, ...relations, ...higher];
}

// A Mapping Table (kogaki#1693), captioned with its paragraph and Move (kogaki#1709), or `no table`.
export function mappingTable(structure, table, number) {
  const roles = elementsOf(structure).filter((e) => e.role);
  const correspondences = table ? table.correspondences : [];
  const rows = roles.map((e) => ({
    id: e.id,
    what: e.what,
    attributes: e.attributes,
    correspondences: correspondences.filter((c) => c.role === e.id),
  }));
  for (const c of correspondences.filter((x) => !roles.some((e) => e.id === x.role))) {
    rows.push({ id: c.role, what: null, attributes: [], correspondences: [c] });
  }
  const domain =
    table && table.base && table.base.domain !== null && table.base.domain !== undefined ? table.base.domain : "none";
  const abstract = (r) => (r.what === null ? "" : targetHtml(r.what));
  const expression = (cs) => cs.map((c) => targetHtml(c.expression)).join("<br>");
  const caption = table ? `Paragraph ${number} <span class="meta">${esc(table.move)}</span>` : "no table";
  return (
    `<p class="meta">Base: ${esc(domain)}</p>` +
    `<table><caption>${caption}</caption><thead><tr><th>Role</th><th>Abstract</th><th>Attribute</th><th>Correspondence</th></tr></thead><tbody>` +
    rows
      .map(
        (r) =>
          `<tr><td>${esc(r.id)}</td><td>${abstract(r)}</td><td>${esc(r.attributes.join(", "))}</td><td>${expression(r.correspondences)}</td></tr>`,
      )
      .join("") +
    "</tbody></table>"
  );
}

function labelledRow(label, values) {
  const vs = values.length ? values : [""];
  return (
    `<tr><th rowspan="${vs.length}">${esc(label)}</th><td>${vs[0]}</td></tr>` +
    vs
      .slice(1)
      .map((v) => `<tr><td>${v}</td></tr>`)
      .join("")
  );
}

// THE MOVE'S CONSTRAINTS (kogaki#1699): `before` and `after` are retired, so the Binding table
// renders the Move's `takes` and `leaves`, one `kind: what` row per entry.
function constraintRows(entries) {
  const list = Array.isArray(entries) ? entries : [];
  return list.length ? list.map((e) => esc(`${e.kind}: ${e.what}`)) : [esc("none")];
}

// kogaki#1719: an entry is taken up only where `kind` and `what` both match, as in standsToBeTakenUp (kogaki#1701).
export function leftUnmet(paragraphs, i, contracts) {
  const taken = new Set(
    paragraphs
      .slice(i + 1)
      .flatMap((p) => ((contracts.get(p.move) || {}).takes || []).map((x) => `${x.kind}\u0000${x.what}`)),
  );
  return (paragraphs[i].leaves || []).filter((x) => !taken.has(`${x.kind}\u0000${x.what}`));
}

function bindingTable(record, paragraphs, i, contracts) {
  const entry = paragraphs[i];
  const c = contracts.get(entry.move);
  const absent = [esc("not in the library")];
  const rationale =
    entry.binding_rationale === null || entry.binding_rationale === undefined ? "none" : entry.binding_rationale;
  const told = record.bind.case === null || record.bind.case === undefined ? "none" : record.bind.case;
  return (
    `<table><caption>Binding ${i + 1}</caption><tbody>` +
    labelledRow("Move", [esc(entry.move)]) +
    labelledRow("Bound by", [esc(record.bind.author)]) +
    (i === 0 ? labelledRow("Case", [esc(told)]) : "") +
    labelledRow("Takes", c ? constraintRows(c.takes) : absent) +
    labelledRow("Leaves", c ? constraintRows(c.leaves) : absent) +
    labelledRow("Rationale", [esc(rationale)]) +
    (i === paragraphs.length - 1
      ? labelledRow("Left unmet", constraintRows(leftUnmet(paragraphs, i, contracts)))
      : "") +
    "</tbody></table>"
  );
}

// `marked` holds the point numbers a refusal named, highlighted for the FLP (kogaki#1752).
export function segmentsTable(record, entry, number, marked = new Set()) {
  const c = moveContract(entry.move, resolve(REPO, record.library));
  const segments = c.error ? [] : c.segments;
  const points = entry.paragraph_waypoints || [];
  const n = Math.max(segments.length, points.length);
  // kogaki#1695: a point's true cast keys ride beside it in a meta span, in CAST_KEYS order.
  const castOf = (p) => Object.keys(CAST_KEYS).filter((k) => p.cast && p.cast[k] === true);
  const pointCell = (p) =>
    !p
      ? ""
      : Object.hasOwn(p, "performs")
        ? `<i>${esc(p.performs)}</i>`
        : esc(p.point) + (castOf(p).length ? ` <span class="meta">${esc(castOf(p).join(", "))}</span>` : "");
  const field = (sg, k) => (sg && typeof sg[k] === "string" ? esc(sg[k]) : "");
  return (
    (c.error ? `<p class="stop">${esc(c.error)}</p>` : "") +
    `<table><caption>Paragraph ${number} <span class="meta">${esc(entry.move)}</span></caption><thead><tr><th>#</th><th>operation</th><th>relation</th><th>manner</th><th>point</th></tr></thead><tbody>` +
    Array.from(
      { length: n },
      (_, i) =>
        `<tr${marked.has(i + 1) ? ' class="named"' : ""}><td>${i + 1}</td><td>${field(segments[i], "operation")}</td><td>${field(segments[i], "relation")}</td>` +
        `<td>${field(segments[i], "manner")}</td><td>${pointCell(points[i])}</td></tr>`,
    ).join("") +
    "</tbody></table>"
  );
}

function segmentsSection(record, paragraphs) {
  if (!paragraphs || !paragraphs.length) return none("No Move was bound.");
  return paragraphs.map((p, i) => segmentsTable(record, p, i + 1)).join("");
}

function bindingsSection(record, paragraphs) {
  if (!paragraphs || !paragraphs.length) return none("No Move was bound.");
  const library = loadMoveContracts(join(REPO, record.library));
  const contracts = new Map((library.error ? [] : library.moves).map((m) => [m.id, m]));
  return (
    (library.error ? `<p class="stop">${esc(library.error)}</p>` : "") +
    paragraphs.map((p, i) => bindingTable(record, paragraphs, i, contracts)).join("")
  );
}

// A Mermaid node id: the element's own id, else `n<i>`; an authored `n<digits>` takes the fallback, so none collide.
const MERMAID_WORDS = new Set([
  "end",
  "graph",
  "flowchart",
  "subgraph",
  "style",
  "class",
  "classDef",
  "click",
  "linkStyle",
  "direction",
  "higher",
  "relations",
  "roles",
]);
const nodeId = (id, i) =>
  /^[A-Za-z][A-Za-z0-9_]*$/.test(id) && !/^n\d+$/.test(id) && !MERMAID_WORDS.has(id) ? id : `n${i}`;

function structureSection(structure) {
  const roles = structure.roles || [];
  const relations = structure.relations || [];
  const higher = higherOrderOf(structure) || [];
  const inRelation = new Set(relations.flatMap((r) => r.between || []));
  const inHigher = new Set(higher.flatMap((h) => h.relates || []));
  const unreached = (yes) => (yes ? ' <span class="stop">unreached</span>' : "");
  const row = (id, category, args, holds) =>
    `<tr><td>${esc(id)}</td><td>${category}</td><td>${args}</td><td>${holds}</td></tr>`;
  const table =
    `<table><thead><tr><th>id</th><th>category</th><th>arguments</th><th>holds</th></tr></thead><tbody>` +
    roles.map((r) => row(r.id, `Role${unreached(!inRelation.has(r.id))}`, esc(r.context), "")).join("") +
    relations
      .map((r) =>
        row(r.id, `relation${unreached(!inHigher.has(r.id))}`, esc((r.between || []).join(", ")), esc(r.holds)),
      )
      .join("") +
    higher.map((h) => row(h.id, "higher-order", esc((h.relates || []).join(", ")), esc(h.holds))).join("") +
    "</tbody></table>";
  const node = new Map([...roles, ...relations, ...higher].map((e, i) => [e.id, nodeId(String(e.id), i)]));
  const label = (id) => `${node.get(id)}["${String(id).replace(/"/g, "#quot;")}"]`;
  const edges = [];
  for (const r of relations) for (const x of r.between || []) edges.push([node.get(x), node.get(r.id), false]);
  for (const h of higher) for (const x of h.relates || []) edges.push([node.get(x), node.get(h.id), true]);
  const accented = edges.map((e, i) => (e[2] ? i : -1)).filter((i) => i >= 0);
  const graph = [
    '%%{init: {"flowchart": {"curve": "linear"}}}%%',
    "graph BT",
    '  subgraph higher["Higher-order relations"]',
    ...higher.map((h) => `    ${label(h.id)}`),
    "  end",
    '  subgraph relations["Relations"]',
    ...relations.map((r) => `    ${label(r.id)}`),
    "  end",
    '  subgraph roles["Roles"]',
    ...roles.map((r) => `    ${label(r.id)}`),
    "  end",
    ...edges.map(([a, b]) => `  ${a} --> ${b}`),
    ...(accented.length ? [`  linkStyle ${accented.join(",")} stroke:${ACCENT_COLOUR},stroke-width:2px`] : []),
  ].join("\n");
  return (
    table +
    `<div class="diagram"><div class="mermaid">${esc(graph)}</div></div>` +
    `<details class="part"><summary>the structure the Trial read</summary>${pre(stringifyYaml(structure))}</details>`
  );
}

const paragraphHtml = (path, record) =>
  existsSync(path)
    ? `<div class="prose">${esc(readFileSync(path, "utf8"))}</div>`
    : record.stopped
      ? `<p class="stop">stopped — ${esc(record.stopped)}</p>`
      : none("No paragraph was written.");

// THE CALL RECORDS (kogaki#1718): per stage, one row per Call Record, linking its files and each replay's result.
function callRecordsSection(outDir, record) {
  const link = (path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;
  const stages = record.stages
    .map((s) => ({ stage: s.stage, rows: (callRecordsOf(s) || []).flatMap((p) => callRows(resolve(REPO, p))) }))
    .filter((s) => s.rows.length);
  if (!stages.length) return none("No Call Record was written.");
  return stages
    .map(
      ({ stage, rows }) =>
        `<table><caption>${esc(stage)}</caption><thead><tr><th>unit</th><th>call</th><th>group</th>` +
        "<th>reach</th><th>refusal</th><th>files</th><th>replays</th></tr></thead><tbody>" +
        rows
          .map(
            (r) =>
              `<tr><td>${esc(r.unit)}</td><td>${r.n}</td><td>${esc(r.group ?? "")}</td><td>${esc(r.reach ?? "")}</td>` +
              `<td>${r.refusal === null ? "passed" : esc(r.refusal)}</td><td>${r.files.map((f) => link(join(r.dir, f), f)).join(" ")}</td>` +
              `<td>${r.replays.map((x) => link(join(x.dir, "result.json"), `${x.mode}: ${x.verdict}`)).join(" ")}</td></tr>`,
          )
          .join("") +
        "</tbody></table>",
    )
    .join("");
}

// THE TRIAL'S ANALOGY MAPPING (kogaki#1784), as the run wrote it before the Leg: the base domain and each counterpart, or
// the reason there is none.
function analogySection(record) {
  const path = record.analogy && record.analogy.path ? resolve(REPO, record.analogy.path) : null;
  if (!path || !existsSync(path)) return none("No Analogy Mapping was written.");
  const a = (parseYaml(readFileSync(path, "utf8"), record.analogy.path) || {}).analogy || {};
  if (Object.hasOwn(a, "none")) return `<p>none — ${esc(a.none)}</p>`;
  return (
    `<p>${esc(a.base_domain.name)} — ${esc(a.base_domain.description)}</p>` +
    "<table><thead><tr><th>element</th><th>counterpart</th></tr></thead><tbody>" +
    [...a.roles.map((x) => [x.role, x.counterpart]), ...a.relations.map((x) => [x.relation, x.counterpart])]
      .map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`)
      .join("") +
    "</tbody></table>"
  );
}

export function renderShortSheet({ outDir, record, proposition, structure, tables, paragraphs, paragraphPath }) {
  const propositionParagraph =
    `<p>${esc(proposition.proposition)}</p><p class="meta">cite: ${esc(proposition.cite)}</p>` +
    paragraphHtml(paragraphPath, record);
  const mapping =
    tables && tables.length
      ? tables.map((t, i) => mappingTable(structure, t, i + 1)).join("")
      : structure
        ? mappingTable(structure, null)
        : none("Neither a structure nor a table was read.");
  const structureHtml = structure ? structureSection(structure) : none("No structure was read.");
  const calls = readCalls(outDir, record.stages);
  const callsHtml = calls.length
    ? calls
        .map(
          (c) =>
            `<details class="part"><summary>${esc(c.stage)} call ${c.n} <span class="meta">exit ${esc(c.exit)} · ${esc(c.at)}</span></summary>` +
            `<details class="sub"><summary>prompt</summary>${pre(c.stdin)}</details><details class="sub" open><summary>answer</summary>${pre(c.stdout)}</details></details>`,
        )
        .join("")
    : none("No model call was made.");
  const stages =
    `<p class="meta">${record.stages.map((s) => `${esc(s.stage)}: ${esc(s.state)}`).join(" · ")}</p>` +
    (record.stopped ? `<p class="stop">stopped — ${esc(record.stopped)}</p>` : "");
  return (
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Playground short Trial ${esc(record.trial)}</title><style>${proofSheetCss()}\n${ACCENT}</style>${mermaidScript()}</head><body>` +
    `<h1>Structure-Mapping Playground — short Trial ${esc(record.trial)}</h1>${stages}` +
    part("proposition-paragraph", "Proposition and Paragraph", propositionParagraph) +
    part("segments", "Segments", segmentsSection(record, paragraphs)) +
    part("bindings", "Bindings", bindingsSection(record, paragraphs)) +
    part("mapping", "Mapping", mapping) +
    part("analogy", "Analogy Mapping", analogySection(record)) +
    part("structure", "Structure", structureHtml) +
    part("call-records", "Call Records", callRecordsSection(outDir, record)) +
    part("calls", "Model calls", callsHtml) +
    "</body></html>\n"
  );
}

// ONE LEG'S MAPPING RECORD (kogaki#1733), in the short Trial sheet's layout: per Brief Waypoint its structure (an `apart`
// successor shows its predecessor's), Mapping Table, binding with `case`, Waypoints with their Cast, and, with a
// run, the Call Records of the Leg's job unit. Reads the plan and the record beside it; writes nothing but `out`.
const readYamlAt = (path) => (existsSync(path) ? parseYaml(readFileSync(path, "utf8"), relFromRepo(path)) : null);

// THE LEG'S ONE BINDING (kogaki#1777): the Leg binds one Move for all its paragraphs.
function legBindingTable(leg, table, contracts) {
  const c = contracts.get(leg.move);
  const absent = [esc("not in the library")];
  const told = table && table.case !== null && table.case !== undefined ? table.case : "none";
  const rationale = (leg.paragraphs || []).map((p) => p && p.rationale).filter((x) => typeof x === "string");
  return (
    `<table><caption>Binding</caption><tbody>` +
    labelledRow("Move", [esc(leg.move ?? "none")]) +
    labelledRow("Case", [esc(told)]) +
    labelledRow("Takes", c ? constraintRows(c.takes) : absent) +
    labelledRow("Leaves", c ? constraintRows(c.leaves) : absent) +
    labelledRow("Rationale", rationale.length ? rationale.map(esc) : [esc("none")]) +
    "</tbody></table>"
  );
}

function legCallRecords(runDir, unit, outDir) {
  if (!runDir)
    return none("No run was named: pass --run <the ParagraphPlan job's run directory> to list its Call Records.");
  const rows = callRows(callsRoot(runDir)).filter((r) => r.unit === unit);
  if (!rows.length) return none(`No Call Record of the unit ${unit} is under ${relFromRepo(runDir)}.`);
  const link = (path, text) => `<a href="${esc(relative(outDir, path).split("\\").join("/"))}">${esc(text)}</a>`;
  return (
    `<table><caption>${esc(unit)}</caption><thead><tr><th>call</th><th>group</th><th>reach</th><th>refusal</th><th>files</th></tr></thead><tbody>` +
    rows
      .map(
        (r) =>
          `<tr><td>${r.n}</td><td>${esc(r.group ?? "")}</td><td>${esc(r.reach ?? "")}</td>` +
          `<td>${r.refusal === null ? "passed" : esc(r.refusal)}</td><td>${r.files.map((f) => link(join(r.dir, f), f)).join(" ")}</td></tr>`,
      )
      .join("") +
    "</tbody></table>"
  );
}

export function renderLegSheet({ planPath, legId, runDir = null, movesDir = "moves", outDir = process.cwd() }) {
  let plan;
  try {
    plan = parseYaml(readFileSync(planPath, "utf8"), relFromRepo(planPath));
  } catch (e) {
    return { error: `the ParagraphPlan file at ${planPath} cannot be read (${e.message})` };
  }
  const legs = Array.isArray(plan && plan.legs) ? plan.legs : [];
  const i = legs.findIndex((l) => l && l.leg_id === legId);
  if (i === -1)
    return {
      error: `the ParagraphPlan file ${relFromRepo(planPath)} carries no Leg ${legId} — it carries ${legs.map((l) => l && l.leg_id).join(", ")}`,
    };
  const dir = join(mappingDirFor(planPath), String(legId));
  const library = loadMoveContracts(resolve(REPO, movesDir));
  const contracts = new Map((library.error ? [] : library.moves).map((m) => [m.id, m]));
  // THE LEG AS UNIT (kogaki#1777): one structure and one table per Leg, and its paragraphs' Waypoints
  // under the one Move the Leg binds.
  const leg = legs[i];
  const structure = readYamlAt(join(dir, STRUCTURE_FILE));
  const table = readYamlAt(join(dir, TABLE_FILE));
  const paragraphs = Array.isArray(leg.paragraphs) ? leg.paragraphs : [];
  const body =
    part("bindings", "Binding", legBindingTable(leg, table, contracts)) +
    part(
      "mapping",
      "Mapping",
      table ? mappingTable(structure, table, 1) : none("No Mapping Table was recorded for this Leg."),
    ) +
    part(
      "structure",
      "Structure",
      structure ? structureSection(structure) : none("No structure was recorded for this Leg."),
    ) +
    paragraphs
      .map((p, k) =>
        part(
          `paragraph-${k + 1}`,
          `Paragraph ${k + 1}`,
          segmentsTable({ library: movesDir }, { ...p, move: leg.move }, k + 1),
        ),
      )
      .join("");
  const html =
    `<!doctype html><html data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Mapping Record ${esc(legId)}</title><style>${proofSheetCss()}\n${ACCENT}</style>${mermaidScript()}</head><body>` +
    `<h1>Mapping Record — Leg ${esc(legId)}</h1><p class="meta">plan: ${esc(relFromRepo(planPath))} · record: ${esc(relFromRepo(dir))}</p>` +
    (library.error ? `<p class="stop">${esc(library.error)}</p>` : "") +
    body +
    part("call-records", "Call Records", legCallRecords(runDir, `leg-${i + 1}`, outDir)) +
    "</body></html>\n";
  return { html };
}

function argsOf(argv) {
  const args = { _: [] };
  for (let k = 0; k < argv.length; k++) {
    if (argv[k].startsWith("--") && argv[k + 1] !== undefined && !argv[k + 1].startsWith("--"))
      args[argv[k].slice(2)] = argv[++k];
    else args._.push(argv[k]);
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = argsOf(process.argv.slice(2));
  const usage =
    "usage: node src/mapping-playground/sheet.mjs leg --plan theses/<slug>/paragraph-plan.yaml --leg <leg_id> [--run <dir>] [--moves-dir <dir>] [--out <file>]";
  if (args._[0] !== "leg" || !args.plan || !args.leg) {
    process.stderr.write(`${usage}\n`);
    process.exit(2);
  }
  const out = args.out ? resolve(args.out) : null;
  const r = renderLegSheet({
    planPath: resolve(args.plan),
    legId: args.leg,
    runDir: args.run ? resolve(args.run) : null,
    movesDir: args["moves-dir"] || "moves",
    outDir: out ? resolve(out, "..") : process.cwd(),
  });
  if (r.error) {
    process.stderr.write(`sheet: ${r.error}\n`);
    process.exit(1);
  }
  if (out) {
    writeFileSync(out, r.html);
    process.stderr.write(`sheet: ${relFromRepo(out)}\n`);
  } else process.stdout.write(r.html);
}
