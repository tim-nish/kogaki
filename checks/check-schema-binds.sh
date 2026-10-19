#!/usr/bin/env bash
# Every schema field a workflow row reads carries a declared hold, the hold is
# checked against the text the row's model call reads, and src/SCHEMA-BINDS.md
# is the regeneration of the declarations (kogaki#1452).
#
# WHAT THIS CARRIES. The rules saying how a field of the Move record, the
# Brief's Leg or the ParagraphPlan record may reach the Packet live as prose in
# the `judgment_point` strings of the three workflow tables, and nothing listed,
# per field, which stage reads it and what it holds it to: on 2026-10-19 the
# owner found only by asking that the ParagraphPlan contract held a Segment's
# `does` and not its `relation` (kogaki#1446), a gap that sat in the difference
# between the planner's wording of one criterion and the judge's. That is the
# named defect -- a field a stage reads and does not bind is invisible until its
# leak reaches the prose.
#
# WHAT IT ASSERTS, over the tree:
#   (a) src/binds-schema.json declares the five holds, one sentence each, and
#       the field sets it leans on are still named where they are declared;
#       every row of src/brief-workflow.json, src/paragraph-plan-workflow.json
#       and src/proof-sheet/extraction-workflow.json that carries `binds`
#       declares an entry, or a `binds_unread` name, for every field of each
#       schema it reads, and a row rendering src/leg-schema.json carries
#       `binds.leg`; each bound field is named in the text `judgePrompt`
#       renders for the row; and an `operation`, `structural` or `excluded`
#       hold has a sentence of that text naming the field as not stated;
#   (b) no `judgment_point` carries a sentence another row of the same table
#       carries with words changed -- such a criterion is written once under
#       the table's `shared_text`, and every `{{shared:<name>}}` is proven to
#       reach the prompt by rendering the row through `judgePrompt`;
#   (c) the Packet template's BINDS line and the review items' `binds` name
#       known fields and holds, and the template renders each block named;
#   (d) src/SCHEMA-BINDS.md is byte-for-byte `renderView()` of the declarations.
#
# THE FIXTURE PASS RUNS ON EVERY INVOCATION: (f1) a judge row reading the Move
# record with no entry for `segments.relation` fails naming the table and the
# field, (f2) the same row naming it unread passes, (f3) two rows carrying one
# sentence one word apart fail naming both rows, (f4) the same two rows
# carrying it identically pass, (f5) a view missing a line fails.
#
# WHAT IT DOES NOT VERIFY, stated rather than left to look covered: the
# not-stated test is LEXICAL -- a sentence naming the field beside "never",
# "not", "no" or "nothing" -- so it finds a hold no text states and cannot judge
# that the sentence says what the hold means. Whether a hold is the right one
# for a field is the author's reading, shown on the view, never linted here.
set -u
cd "$(dirname "$0")/.."

# `--write` regenerates src/SCHEMA-BINDS.md from the declarations and asserts nothing.
SCHEMA_BINDS_WRITE=""
[ "${1:-}" = "--write" ] && SCHEMA_BINDS_WRITE=1
export SCHEMA_BINDS_WRITE

node --input-type=module - <<'JS'
// EVERY ENTRY IS ITERATED, NONE IS NAMED. A table read only for the keys its reader asks
// for binds nothing else (consulted: coding::lesson/a-declaration-table-binds-only-the-keys-its-reader-names@b2ad9ce23c4c67d80cdc22a66f3648eed141a84224ac68415b0015cf0ad8078f),
// so this walks every row, every schema field and every declared entry, and the row text
// it tests is the text `judgePrompt` renders -- shared text substituted, a copied row
// derived -- never the raw table string.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const REPO = resolve(".");
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const { withSharedText, SHARED_TEXT_FIELDS, SHARED_TEXT_TOKEN, judgePrompt } = await imp("src/workflow/judge.mjs");
const { derivedRow } = await imp("src/proof-sheet/leg-brief.mjs");
const { MOVE_CARRIED_FIELDS } = await imp("src/compose.mjs");

const TABLES = Object.freeze([
  "src/brief-workflow.json",
  "src/paragraph-plan-workflow.json",
  "src/proof-sheet/extraction-workflow.json",
]);
const BINDS_SCHEMA = "src/binds-schema.json";
const PACKET_TEMPLATE = "src/packet-template.md";
const REVIEW_ITEMS = "src/review-items.json";
const VIEW = "src/SCHEMA-BINDS.md";
// A row declaring this schema file renders the Leg schema verbatim, so it owes `binds.leg`.
const SCHEMA_FILE_OWES = Object.freeze({ "src/leg-schema.json": "leg" });

const readJson = (p) => JSON.parse(readFileSync(join(REPO, p), "utf8"));

// ---- the schemas' field sets, each read from the file that declares it ----
function schemaFields(decl = readJson(BINDS_SCHEMA)) {
  const out = {};
  const roles = readJson("moves/ROLES.json");
  const seg = decl.schemas.move.list_fields.segments;
  out.move = [
    ...Object.values(roles.required), ...Object.values(roles.optional), ...MOVE_CARRIED_FIELDS,
    ...seg.keys.map((k) => `segments.${k}`),
  ];
  const leg = readJson("src/leg-schema.json");
  out.leg = [
    ...Object.keys(leg.fields), ...Object.keys(leg.derived),
    ...Object.keys(leg.waypoint.fields).map((k) => `waypoints.${k}`),
  ];
  out.paragraph_plan = [...decl.schemas.paragraph_plan.fields];
  return out;
}

// The declarations the field sets lean on, checked so a renamed key cannot leave a stale list.
function schemaDeclarationFailures(decl = readJson(BINDS_SCHEMA)) {
  const fails = [];
  const holds = Object.keys(decl.holds || {});
  const want = ["operation", "structural", "content", "excluded", "copied"];
  if (holds.join() !== want.join()) fails.push(`${BINDS_SCHEMA}: \`holds\` is ${JSON.stringify(holds)}, not the closed set ${JSON.stringify(want)}`);
  for (const h of holds) {
    const s = String(decl.holds[h] || "");
    if (!/^[^.]+\.(\s[^.]+\.)?$/.test(s.trim())) fails.push(`${BINDS_SCHEMA}: hold \`${h}\` is not declared in one sentence`);
  }
  const shape = String(readJson("moves/ROLES.json").shapes.segments);
  for (const k of decl.schemas.move.list_fields.segments.keys) {
    if (!shape.includes(`\`${k}\``)) fails.push(`${BINDS_SCHEMA}: Segment key \`${k}\` is not named by moves/ROLES.json \`shapes.segments\``);
  }
  const planShape = String(readJson("src/paragraph-plan-workflow.json").paragraph_plan_unit.input_shape);
  for (const f of decl.schemas.paragraph_plan.fields) {
    const leaf = f.split(".").pop();
    if (!planShape.includes(`\`${leaf}\``) && !planShape.includes(`"${leaf}"`)) {
      fails.push(`${BINDS_SCHEMA}: ParagraphPlan field \`${f}\` is not named by paragraph_plan_unit's \`input_shape\``);
    }
  }
  return fails;
}

// ---- rows, and the text each one's model call reads ----
function rowsOf(table) {
  const out = [];
  for (const s of Array.isArray(table.states) ? table.states : []) {
    if (s && (typeof s.judgment_point === "string" || s.copy_of)) out.push({ key: s.id, row: s });
  }
  for (const [k, v] of Object.entries(table)) {
    // A row outside `states` names what governs it; a block such as `field_semantics`
    // describes the fields and governs nothing, so it is no row.
    if (k === "states" || !v || typeof v !== "object" || Array.isArray(v) || !v.governing) continue;
    if (typeof v.judgment_point === "string" || v.copy_of) out.push({ key: k, row: v });
  }
  return out;
}

function renderedRow(table, key, row) {
  let r = row;
  if (row.copy_of) {
    const d = derivedRow(table, key);
    if (d.error) throw new Error(d.error);
    r = d.row;
  }
  return withSharedText({ id: key, ...r });
}

// What the model call reads: the row rendered by `judgePrompt` up to the input marker, so
// a schema file the row renders verbatim is part of its instruction, as it is the model's.
function rowText(rendered) {
  return judgePrompt(rendered, "", null, null);
}

const sentences = (text) => String(text).split(/(?<=[.;!?])\s+|\s--\s/).map((s) => s.trim()).filter(Boolean);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A field is NAMED where it stands as `<leaf>` in backticks or as a quoted JSON key, the form
// a rendered schema file names it in; a leaf carrying `_` or `-` is
// an identifier no English sentence spells, so it is named bare too. A plain word -- `does`,
// `move`, `point` -- is named only in backticks, since prose uses it as a word.
const namesField = (text, leaf) => text.includes(`\`${leaf}\``) || text.includes(`"${leaf}"`)
  || (/[_-]/.test(leaf) && new RegExp(`(^|[^A-Za-z0-9_-])${escapeRe(leaf)}([^A-Za-z0-9_-]|$)`).test(text));
const NOT_STATED = /\b(never|not|no|nothing)\b/i;
const NEGATIVE_HOLDS = new Set(["operation", "structural", "excluded"]);

// ---- (1) coverage and holds, over one table ----
function bindsFailures(path, table, { fields = schemaFields(), holds = Object.keys(readJson(BINDS_SCHEMA).holds) } = {}) {
  const fails = [];
  const seen = {};
  const read = new Set();
  for (const { key, row } of rowsOf(table)) {
    const at = `${path}: \`${key}\``;
    for (const [file, schema] of Object.entries(SCHEMA_FILE_OWES)) {
      const files = Array.isArray(row.schema_file) ? row.schema_file : (row.schema_file ? [row.schema_file] : []);
      if (files.includes(file) && !(row.binds && row.binds[schema])) {
        fails.push(`${at} renders ${file} and declares no \`binds.${schema}\``);
      }
    }
    if (!row.binds) continue;
    let text;
    try { text = rowText(renderedRow(table, key, row)); }
    catch (e) { fails.push(`${at}: its text cannot be rendered (${e.message})`); continue; }
    const unread = row.binds_unread || {};
    for (const [schema, map] of Object.entries(row.binds)) {
      if (!fields[schema]) { fails.push(`${at} binds \`${schema}\`, which ${BINDS_SCHEMA} declares no schema for`); continue; }
      read.add(schema);
      seen[schema] = seen[schema] || new Set();
      const skip = new Set(unread[schema] || []);
      for (const f of skip) {
        if (!fields[schema].includes(f)) fails.push(`${at} names \`${f}\` in \`binds_unread.${schema}\`, which is no field of ${schema}`);
        if (Object.hasOwn(map, f)) fails.push(`${at} both binds and leaves unread ${schema} field \`${f}\``);
        seen[schema].add(f);
      }
      for (const [f, hold] of Object.entries(map)) {
        if (!fields[schema].includes(f)) { fails.push(`${at} binds \`${f}\`, which is no field of ${schema}`); continue; }
        seen[schema].add(f);
        if (!holds.includes(hold)) { fails.push(`${at} holds ${schema} \`${f}\` to ${JSON.stringify(hold)}, outside the closed set ${holds.join(", ")}`); continue; }
        const leaf = f.split(".").pop();
        if (!namesField(text, leaf)) { fails.push(`${at} binds ${schema} \`${f}\` and its text never names \`${leaf}\``); continue; }
        if (NEGATIVE_HOLDS.has(hold) && !sentences(text).some((s) => namesField(s, leaf) && NOT_STATED.test(s))) {
          fails.push(`${at} holds ${schema} \`${f}\` to ${hold}, and no sentence of its text names \`${leaf}\` as not stated`);
        }
      }
      for (const f of fields[schema]) {
        if (!Object.hasOwn(map, f) && !skip.has(f)) {
          fails.push(`${at} reads ${schema} and declares no entry for \`${f}\`: bind it or name it in \`binds_unread.${schema}\``);
        }
      }
    }
  }
  for (const schema of read) {
    for (const f of fields[schema]) {
      if (!seen[schema].has(f)) fails.push(`${path}: the table reads ${schema} and no row declares an entry for \`${f}\``);
    }
  }
  return fails;
}

// ---- (2) a sentence one row restates from another, words changed ----
const words = (s) => s.replace(SHARED_TEXT_TOKEN, " ").toLowerCase().match(/[a-z0-9_#]+/g) || [];
function wordDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}
// Long enough that two rows carrying it say one criterion, and close enough that the
// difference is a rewording rather than a second sentence.
const RESTATED_MIN_WORDS = 8;
const RESTATED_MAX_SHARE = 0.25;

function restatedFailures(path, table) {
  const fails = [];
  const per = [];
  for (const { key, row } of rowsOf(table)) {
    let r;
    try { r = row.copy_of ? renderedRow(table, key, { ...row, shared_text_file: undefined }) : row; }
    catch (e) { fails.push(`${path}: \`${key}\`: its text cannot be rendered (${e.message})`); continue; }
    const jp = typeof r.judgment_point === "string" ? r.judgment_point : "";
    per.push({ key, list: sentences(jp.replace(SHARED_TEXT_TOKEN, ". ")).map((s) => ({ s, w: words(s) })).filter((x) => x.w.length >= RESTATED_MIN_WORDS) });
  }
  for (let i = 0; i < per.length; i++) {
    for (let j = i + 1; j < per.length; j++) {
      for (const a of per[i].list) {
        for (const b of per[j].list) {
          const n = Math.max(a.w.length, b.w.length);
          if (Math.abs(a.w.length - b.w.length) > n * RESTATED_MAX_SHARE) continue;
          const d = wordDistance(a.w, b.w);
          if (d > 0 && d <= Math.max(1, Math.floor(n * RESTATED_MAX_SHARE))) {
            fails.push(`${path}: \`${per[i].key}\` and \`${per[j].key}\` carry one sentence with ${d} word(s) changed -- write it once under \`shared_text\`: ${JSON.stringify(a.s.slice(0, 120))}`);
          }
        }
      }
    }
  }
  return fails;
}

// ---- (3) the Packet template's and the review items' declarations ----
const PACKET_BINDS_LINE = /^BINDS \(kogaki#1452\): (\{.*\})$/m;
function packetBinds(text = readFileSync(join(REPO, PACKET_TEMPLATE), "utf8")) {
  const head = (text.match(/^<!--[\s\S]*?-->/) || [""])[0];
  const m = head.match(PACKET_BINDS_LINE);
  return m ? JSON.parse(m[1]) : null;
}

function declaredOnlyFailures({ fields = schemaFields(), holds = Object.keys(readJson(BINDS_SCHEMA).holds) } = {}) {
  const fails = [];
  const one = (at, binds) => {
    for (const [schema, map] of Object.entries(binds || {})) {
      if (!fields[schema]) { fails.push(`${at} binds \`${schema}\`, which ${BINDS_SCHEMA} declares no schema for`); continue; }
      for (const [f, hold] of Object.entries(map)) {
        if (!fields[schema].includes(f)) fails.push(`${at} binds \`${f}\`, which is no field of ${schema}`);
        if (!holds.includes(hold)) fails.push(`${at} holds ${schema} \`${f}\` to ${JSON.stringify(hold)}, outside the closed set`);
      }
    }
  };
  const text = readFileSync(join(REPO, PACKET_TEMPLATE), "utf8");
  const pb = packetBinds(text);
  if (!pb) fails.push(`${PACKET_TEMPLATE}: its header comment carries no \`BINDS (kogaki#1452):\` line`);
  for (const [slot, binds] of Object.entries(pb || {})) {
    if (!text.includes(`{{${slot}}}`)) fails.push(`${PACKET_TEMPLATE}: BINDS names block \`${slot}\`, which the template renders no \`{{${slot}}}\` for`);
    one(`${PACKET_TEMPLATE}: block \`${slot}\``, binds);
  }
  for (const it of readJson(REVIEW_ITEMS).items) {
    if (it.binds) one(`${REVIEW_ITEMS}: item \`${it.id}\``, it.binds);
  }
  return fails;
}

// ---- (4) shared text reaches the prompt ----
// Proven by rendering, never by the table carrying it: every row naming shared text is
// rendered through `judgePrompt`, and each text it names must stand in the prompt.
function sharedRenderFailures(path, table) {
  const fails = [];
  for (const { key, row } of rowsOf(table)) {
    const names = new Set();
    for (const f of SHARED_TEXT_FIELDS) {
      for (const m of String(row[f] || "").matchAll(SHARED_TEXT_TOKEN)) names.add(m[1]);
    }
    if (!names.size) continue;
    let prompt;
    try { prompt = judgePrompt({ id: key, ...row }, "", null, null); }
    catch (e) { fails.push(`${path}: \`${key}\` names shared text and does not render (${e.message})`); continue; }
    for (const n of names) {
      if (!prompt.includes(table.shared_text?.[n] ?? "\u0000")) fails.push(`${path}: \`${key}\`'s rendered prompt does not carry shared text \`${n}\``);
    }
    if (new RegExp(SHARED_TEXT_TOKEN.source).test(prompt)) fails.push(`${path}: \`${key}\`'s rendered prompt still carries a \`{{shared:...}}\` token`);
  }
  return fails;
}

// ---- the view ----
function renderView(fields = schemaFields(), decl = readJson(BINDS_SCHEMA)) {
  const stages = [];
  for (const path of TABLES) {
    const table = readJson(path);
    for (const { key, row } of rowsOf(table)) {
      if (row.binds) stages.push({ label: key, where: `${path} \`${key}\``, binds: row.binds, unread: row.binds_unread || {} });
    }
  }
  for (const [slot, binds] of Object.entries(packetBinds() || {})) {
    stages.push({ label: `packet:${slot}`, where: `${PACKET_TEMPLATE} block \`{{${slot}}}\``, binds, unread: {} });
  }
  for (const it of readJson(REVIEW_ITEMS).items) {
    if (it.binds) stages.push({ label: `review:${it.id}`, where: `${REVIEW_ITEMS} item \`${it.id}\``, binds: it.binds, unread: {} });
  }
  const L = [
    "# Schema binds",
    "",
    "GENERATED by `bash checks/check-schema-binds.sh --write` from the `binds` declarations",
    `(kogaki#1452) -- edit the declarations, never this file. \`checks/check-schema-binds.sh\``,
    "fails while it is not their regeneration.",
    "",
    "One table per schema, one row per field, one column per stage that reads the schema.",
    "A cell is the hold the stage declares, `unread` where the stage names the field as one",
    "it does not read, and empty where the stage does not read the schema at all.",
    "",
    "## The holds",
    "",
    "| hold | what it means |",
    "|---|---|",
    ...Object.entries(decl.holds).map(([h, s]) => `| \`${h}\` | ${s} |`),
  ];
  for (const [schema, list] of Object.entries(fields)) {
    const cols = stages.filter((s) => s.binds[schema] || s.unread[schema]);
    L.push("", `## ${schema} -- ${decl.schemas[schema].names}`, "");
    if (!cols.length) { L.push("No stage declares it."); continue; }
    L.push(`| field | ${cols.map((c) => c.label).join(" | ")} |`);
    L.push(`|---|${cols.map(() => "---").join("|")}|`);
    for (const f of list) {
      const cells = cols.map((c) => {
        const h = c.binds[schema]?.[f];
        if (h) return h;
        return (c.unread[schema] || []).includes(f) ? "unread" : "";
      });
      L.push(`| \`${f}\` | ${cells.join(" | ")} |`);
    }
    L.push("", ...cols.map((c) => `- \`${c.label}\` is ${c.where}.`));
  }
  return L.join("\n") + "\n";
}

// ---- the whole tree ----
function treeFailures({ view = existsSync(join(REPO, VIEW)) ? readFileSync(join(REPO, VIEW), "utf8") : null } = {}) {
  const fails = [...schemaDeclarationFailures()];
  for (const path of TABLES) {
    const table = readJson(path);
    fails.push(...bindsFailures(path, table), ...restatedFailures(path, table), ...sharedRenderFailures(path, table));
  }
  fails.push(...declaredOnlyFailures());
  const fresh = renderView();
  const committed = view;
  if (committed === null) fails.push(`${VIEW} is missing -- run \`bash checks/check-schema-binds.sh --write\``);
  else if (committed !== fresh) fails.push(`${VIEW} is not the regeneration of the binds declarations -- run \`bash checks/check-schema-binds.sh --write\``);
  return fails;
}

if (process.env.SCHEMA_BINDS_WRITE) {
  writeFileSync(join(REPO, VIEW), renderView());
  console.log(`wrote ${VIEW}`);
  process.exit(0);
}

const fixture = (name) => {
  const path = `checks/fixtures/schema-binds/${name}`;
  return { path, table: JSON.parse(readFileSync(join(REPO, path), "utf8")) };
};
const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };

// (f1) the kogaki#1446 shape: a judge row reading the Move record, no entry for `relation`.
{
  const { path, table } = fixture("unbound-relation.json");
  const f = bindsFailures(path, table);
  ok(f.some((l) => l.startsWith(path) && l.includes("move") && l.includes("`segments.relation`")),
    `(f1) a judge row reading the Move record with no entry for segments.relation fails naming the table and the field: ${f.join(" | ")}`);
  // (f2) the control: the same row naming the field unread passes.
  table.fixture_judge_unit.binds_unread.move.push("segments.relation");
  const g = bindsFailures(path, table);
  ok(g.length === 0, `(f2) the same row naming segments.relation unread passes: ${g.join(" | ")}`);
}
// (f3) one sentence, two rows, one word changed.
{
  const { path, table } = fixture("restated-pair.json");
  const f = restatedFailures(path, table);
  ok(f.some((l) => l.includes("`fixture_plan_unit`") && l.includes("`fixture_judge_unit`") && l.includes("1 word(s) changed")),
    `(f3) two rows carrying one sentence one word apart fail naming both rows: ${f.join(" | ")}`);
  // (f4) the control: identical sentences are one criterion said twice, not a restatement.
  table.fixture_judge_unit.judgment_point = table.fixture_judge_unit.judgment_point.replace("Waypoint states.", "Waypoint says.");
  const g = restatedFailures(path, table);
  ok(g.length === 0, `(f4) the same two rows carrying the sentence identically pass: ${g.join(" | ")}`);
}
// (f5) a view that is not the regeneration fails naming it.
{
  const fresh = renderView();
  const f = treeFailures({ view: fresh.split("\n").slice(1).join("\n") });
  ok(f.some((l) => l.includes(VIEW) && l.includes("not the regeneration")), `(f5) a stale view fails naming ${VIEW}: ${f.join(" | ")}`);
}
console.log("fixture cases run: 5");

// (a)-(d) the tree.
const tree = treeFailures();
fails.push(...tree.map((l) => `(tree) ${l}`));

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log("check-schema-binds: PASS -- every schema field each workflow row reads carries a hold or is named unread, each hold is named by the row's rendered text, restated criteria are written once as shared text, and src/SCHEMA-BINDS.md is their regeneration");
JS
