#!/usr/bin/env bash
# The ParagraphPlan judge's criteria are a registry of one-sentence axes, each kept on
# evidence, and the countable rules are the validator's (kogaki#1533, kogaki#1647). (a) every
# axis is one sentence with one responsibility, a defect and a clean fixture and a
# `justified_by` bench run; (b) the judge prompt carries every axis in order and the table
# writes no criterion of its own; (c) the validator refuses a Waypoint count off
# the bound Move's Segments, and a paragraph carrying both `performs` and `point`; (d) the bench
# records or removes a scratch axis over a fake judge, leaving an unread one as it was;
# (e) the criteria table of the spec's ParagraphPlan stage carries every criterion of both
# judges and no other, and the judge is handed the Leg's one bound Move's `takes` and `leaves`
# beside what the Legs before it state (kogaki#1701, kogaki#1777).
# Declared limit: the one-responsibility test is lexical; whether a fixture violates
# its axis and no other is the bench's measurement, never this check's.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const REPO = resolve(".");
const imp = (p) => import(pathToFileURL(join(REPO, p)).href);
const { readAxes, axesFailures, axisRecord, criteriaOf, renderRowHead, validateParagraphPlanUnit, boundMoveContract,
  paragraphPlanJudgeInput } = await imp("src/paragraph-plan.mjs");
const { bindFlow } = await imp("src/workflow/run-record.mjs");
const fails = [];
let cases = 0;
const registry = readAxes();
const table = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));

// (a) the tree's registry, then each refusal constructed on a copy of it.
const tree = axesFailures(registry);
if (tree.length) fails.push(`(a) the registry fails: ${tree.join("; ")}`);
const edited = (edit) => { const r = structuredClone(registry); edit(r); return axesFailures(r).join("; "); };
const first = registry.axes[0] ? registry.axes[0].id : "";
const refusals = [
  ["(a1) a sentence carrying a semicolon", (r) => { r.axes[0].sentence = "The run holds; the order holds."; }, "carries `;` or `:`"],
  ["(a2) a sentence carrying a colon", (r) => { r.axes[0].sentence = "The run holds two things: order and span."; }, "carries `;` or `:`"],
  ["(a3) a sentence carrying a dash", (r) => { r.axes[0].sentence = "The run holds — in order."; }, "carries ` — `"],
  ["(a4) a second clause joined by and", (r) => { r.axes[0].sentence = "Every point is recoverable and the join is a word."; }, "joins a second clause"],
  ["(a5) a second sentence", (r) => { r.axes[0].sentence = "The run holds. The order holds."; }, "is not one sentence"],
  ["(a6) an axis with no defect fixture", (r) => { r.axes[0].fixtures.defect = []; }, "carries no `defect` fixture"],
  ["(a7) an axis with no clean fixture", (r) => { r.axes[0].fixtures.clean = []; }, "carries no `clean` fixture"],
  ["(a8) an axis with no bench run", (r) => { delete r.axes[0].justified_by; }, "carries no `justified_by`"],
  ["(a9) a fixture naming no record", (r) => { r.axes[0].fixtures.defect = ["no-such-record"]; }, "does not hold"],
];
for (const [label, edit, want] of refusals) {
  cases++;
  const why = edited(edit);
  if (!why.includes(`axis ${first}`) || !why.includes(want)) fails.push(`${label} is not refused naming the axis: ${why || "no refusal"}`);
}
for (const a of registry.axes) {
  for (const n of a.fixtures.defect) {
    const at = registry.records[n].at_paragraph;
    const site = (rec) => JSON.stringify([rec.leg_you_must_judge.bound_move, rec.leg_you_must_judge.paragraphs[at - 1]]);
    if (site(axisRecord(registry, n)) === site(axisRecord(registry, a.fixtures.clean[0]))) fails.push(`(a) defect "${n}" changes nothing at its paragraph ${at}`);
  }
}

// (b) the judge row renders the registry's axes, and the table holds no criterion prose.
cases++;
const held = bindFlow({ lane: "paragraph-plan", label: "ParagraphPlan" });
let prompt;
try { prompt = renderRowHead({ id: "paragraph_plan_judge_unit", ...table.paragraph_plan_judge_unit }); } finally { bindFlow(held); }
const got = criteriaOf(prompt).map((c) => `${c.name}: ${c.text}`);
const want = registry.axes.map((a) => `${a.id}: ${a.sentence}`);
if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`(b) the rendered judge prompt carries ${JSON.stringify(got)}, not the registry's axes`);
if (/\n- [A-Z]/.test(table.paragraph_plan_judge_unit.judgment_point)) fails.push("(b) the judge row's own text writes a criterion line");
if (Object.hasOwn(table.criteria || {}, "paragraph_plan_judge_unit")) fails.push("(b) the workflow table's `criteria` names judge criteria of its own");

// (c) the validator counts what the judge no longer judges.
// The Move is the check's own fixture copy (kogaki#1625).
const moveId = "apply_a_definition_to_one_everyday_instance";
const lib = mkdtempSync(join(tmpdir(), "paragraph-plan-axes-lib-"));
writeFileSync(join(lib, "ROLES.json"), readFileSync(join("moves", "ROLES.json")));
writeFileSync(join(lib, `${moveId}.yaml`), readFileSync(join("checks", "fixtures", "moves", `${moveId}.yaml`)));
const segments = boundMoveContract(moveId, lib).segments.length;
const inputs = { movesDir: lib, bound: 2, legs: [{ leg_id: "v1", text: "A relation holds.", claims: [{ strand: "L1", proposition: "A claim." }] }] };
// The paragraph carries its schema (kogaki#1639) and no reader state (kogaki#1701); the Move is the Leg's (kogaki#1777).
const paragraph = (pws, n = 1) => ({ paragraph: n, materials: ["L1"], purpose: "brings the reader to the point.",
  depends_on: [], rationale: "the Move carries this point", "re-activate": [], ...(n > 1 ? { join: "elaboration" } : {}), paragraph_waypoints: pws });
const plan = (pws) => ({ version: "1", leg_id: "v1", move: moveId, rationale: "the Move carries the relation", paragraphs: [paragraph(pws)] });
const pw = (i) => ({ point: `Part ${i} of the point.`, serves: ["L1"], cast: {} });
const parts = (n) => Array.from({ length: n }, (_, i) => pw(i + 1));
cases++;
const ok = validateParagraphPlanUnit(plan(parts(segments)), inputs, "leg-1");
if (ok.error) fails.push(`(c) a plan one per Segment is refused: ${ok.error}`);
cases++;
const short = validateParagraphPlanUnit(plan(parts(segments - 1)), inputs, "leg-1").error || "";
if (!short.includes("Leg v1, paragraph 1") || !short.includes(`${segments - 1} Waypoint(s) for the ${segments} Segment(s)`)) {
  fails.push(`(c1) a paragraph one Waypoint short of its Move's Segments is not refused naming the paragraph: ${short || "no refusal"}`);
}
cases++;
const both = parts(segments);
both[1] = { performs: "Puts the question to the reader.", point: "Part 2 of the point.", serves: ["L1"] };
const two = validateParagraphPlanUnit(plan(both), inputs, "leg-1").error || "";
if (!two.includes("Leg v1, paragraph 1") || !two.includes("Waypoint 2 carries `performs` beside")) {
  fails.push(`(c2) a paragraph carrying both performs and point is not refused naming it: ${two || "no refusal"}`);
}

// (e) THE CRITERIA TABLE (kogaki#1647, kogaki#1768): every Paragraph cell is an axis or a shared
// criterion the judge row names, every Leg cell a criterion of the Leg judge (retired by kogaki#1775, so none), and
// nothing either judge carries is missing from the table. The Leg judge's criteria are the
// upper-case names its judgment point writes before a colon.
const spec = readFileSync("specs/spec-draft-pipeline/SPEC.md", "utf8");
// The Leg judge is retired (kogaki#1775): no row of the Brief's table is a Leg judge, so its list is empty.
const briefRows = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
const legPoint = briefRows.lpp_grounded ? briefRows.lpp_grounded.judgment_point : "";
const legItems = (point) => [...point.matchAll(/\b([A-Z][A-Z ]+[A-Z]): /g)].map((m) => m[1]);
const sharedIds = (row) => [...row.judgment_point.matchAll(/\{\{shared:([a-z_]+)\}\}/g)].map((m) => m[1]);
const STANDINGS = { shared: [true, true], "Leg only": [true, false], "paragraph only": [false, true] };
const cell = (t) => { const v = t.trim(); return v === "—" ? null : v.replace(/^`|`$/g, ""); };
function tableFailures(text, paragraphIds, legList) {
  const at = text.indexOf("**The criteria table:");
  if (at < 0) return ["specs/spec-draft-pipeline/SPEC.md carries no criteria table"];
  const lines = text.slice(at).split("\n");
  const top = lines.findIndex((l) => l.startsWith("|"));
  const end = lines.findIndex((l, i) => i > top && !l.startsWith("|"));
  const rows = lines.slice(top + 2, end).map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  const out = [];
  const seen = { leg: new Set(), paragraph: new Set() };
  for (const [name, standing, leg, paragraph, reason, binds] of rows) {
    const want = STANDINGS[standing];
    if (!want) { out.push(`row ${name} is ${JSON.stringify(standing)}, not shared, Leg only or paragraph only`); continue; }
    if (Boolean(cell(leg)) !== want[0] || Boolean(cell(paragraph)) !== want[1]) out.push(`row ${name} is ${standing} with its cells ${leg} and ${paragraph}`);
    if (!cell(reason || "—")) out.push(`row ${name} states no reason`);
    if (!["criterion", "wording"].includes(binds)) out.push(`row ${name} says neither criterion nor wording binds`);
    if (cell(leg)) seen.leg.add(cell(leg));
    if (cell(paragraph)) seen.paragraph.add(cell(paragraph));
  }
  for (const id of paragraphIds) if (!seen.paragraph.has(id)) out.push(`the ParagraphPlan judge's ${id} is not in the criteria table`);
  for (const id of seen.paragraph) if (!paragraphIds.includes(id)) out.push(`the criteria table's ${id} is no criterion of the ParagraphPlan judge`);
  for (const it of legList) if (!seen.leg.has(it)) out.push(`the Leg judge's "${it}" is not in the criteria table`);
  for (const it of seen.leg) if (!legList.includes(it)) out.push(`the criteria table's "${it}" is no item of the Leg judge's list`);
  return out;
}
const paragraphIds = [...registry.axes.map((a) => a.id), ...sharedIds(table.paragraph_plan_judge_unit)];
const legList = legItems(legPoint);
cases++;
if (briefRows.lpp_grounded || legList.length) fails.push(`(e) src/brief-workflow.json still carries the retired Leg judge lpp_grounded (kogaki#1775): ${JSON.stringify(legList)}`);
const atHead = tableFailures(spec, paragraphIds, legList);
if (atHead.length) fails.push(`(e) the criteria table fails: ${atHead.join("; ")}`);
const tableRefusals = [
  ["(e1) an axis the table does not carry", spec, [...paragraphIds, "SCRATCH AXIS"], legList, "SCRATCH AXIS is not in the criteria table"],
  ["(e2) a Leg item the table does not carry", spec, paragraphIds, [...legList, "the scratch item"], "\"the scratch item\" is not in the criteria table"],
  ["(e3) a row naming no criterion of the judge", spec.replace("`BREAKS` |", "`BREAKING` |"), paragraphIds, legList, "BREAKING is no criterion of the ParagraphPlan judge"],
  ["(e4) a row with no binding half", spec.replace(/(Takes met \|.*\| )criterion \|/, "$1either |"), paragraphIds, legList, "row Takes met says neither"],
];
for (const [label, text, ids, list, want] of tableRefusals) {
  cases++;
  const why = tableFailures(text, ids, list).join("; ");
  if (!why.includes(want)) fails.push(`${label} is not refused naming it: ${why || "no refusal"}`);
}
// (e5) the judge is handed the Leg's one bound Move's `takes` and `leaves`, its text, and what the Legs
// before it state (kogaki#1701, kogaki#1777), and each paragraph's Waypoints beside its join.
cases++;
{
  const scratch = mkdtempSync(join(tmpdir(), "paragraph-plan-axes-left-"));
  writeFileSync(join(scratch, "ROLES.json"), readFileSync(join("moves", "ROLES.json")));
  const text = readFileSync(join("checks", "fixtures", "moves", `${moveId}.yaml`), "utf8")
    .replace(/^leaves: \[\]$/m, "leaves:\n  - kind: explain\n    what: the instance's one named part\n    segment: 1");
  writeFileSync(join(scratch, `${moveId}.yaml`), text);
  const told = [{ leg_id: "v0", text: "An earlier relation holds." }];
  const two = { movesDir: scratch, legs: [{ leg_id: "v1", text: "A relation holds.", prior_knowledge: "holds what a definition is",
    the_reader_has_been_told: told, leaves_for_next_leg: [{ kind: "explain", what: "the instance's one named part" }] }] };
  const judged = paragraphPlanJudgeInput({ version: "1", leg_id: "v1", move: moveId, rationale: "the Move carries the relation",
    paragraphs: [paragraph(parts(segments)), paragraph(parts(segments), 2)] }, two, "leg-1").leg_you_must_judge;
  if (JSON.stringify(judged.the_reader_has_been_told) !== JSON.stringify(told) || judged.text !== "A relation holds."
      || !Array.isArray(judged.bound_move.takes) || judged.bound_move.leaves.length !== 1 || JSON.stringify(judged.leaves_for_next_leg) !== JSON.stringify(two.legs[0].leaves_for_next_leg)
      || judged.paragraphs.length !== 2 || judged.paragraphs[1].join !== "elaboration" || "join" in judged.paragraphs[0]
      || "stands_to_be_taken_up" in judged || "before" in judged.bound_move || "after" in judged.bound_move) {
    fails.push(`(e5) the judge is not handed the Leg's bound Move's takes and leaves beside what the Legs before it state: ${JSON.stringify(judged)}`);
  }
  rmSync(scratch, { recursive: true, force: true });
}

// (d) the bench, over a scratch axis added to a copy of the registry and a fake judge that refuses
// its defect only where the prompt carries the axis line: kept with its rates; over a judge blind
// to it, removed with the record only it named.
const tmp = mkdtempSync(join(tmpdir(), "paragraph-plan-axes-"));
const fake = join(tmp, "fake-judge.mjs");
writeFileSync(fake, `#!/usr/bin/env node
if (process.argv.includes("--version")) { console.log("fake 1"); process.exit(0); }
let s = ""; process.stdin.on("data", (b) => { s += b; }).on("end", () => {
  if (process.env.FAKE_SEES === "silent") process.exit(0);
  const leg = JSON.parse(s.slice(s.indexOf('{\\n  "leg_you_must_judge"'))).leg_you_must_judge;
  const sees = process.env.FAKE_SEES === "1" && s.includes("\\n- SCRATCH AXIS: ");
  const verdicts = leg.paragraphs.map((w, i) => ({ paragraph: i + 1, why: "the fake judge read the join word",
    verdict: sees && w.join === "consequence" ? "does-not-fit" : "fits" }));
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ version: "1", leg_id: leg.leg_id, verdicts }) }) + "\\n");
});
`, { mode: 0o755 });
const benchOnce = (sees, label) => {
  const reg = join(tmp, `${label}.json`);
  const scratch = structuredClone(registry);
  scratch.records["scratch-two"] = { from: "leg3-clean", edit: { move_takes: [] } };
  const base = structuredClone(scratch.records["leg3-clean"].input);
  base.leg_you_must_judge.paragraphs.push({ paragraph: 2, join: "elaboration", paragraph_waypoints: base.leg_you_must_judge.paragraphs[0].paragraph_waypoints });
  scratch.records["scratch-two"] = { input: base };
  scratch.records["scratch-join"] = { from: "scratch-two", at_paragraph: 2, edit: { paragraph: 2, join: "consequence" } };
  scratch.axes.push({ id: "SCRATCH AXIS", sentence: "The join is judged.", fixtures: { defect: ["scratch-join"], clean: ["scratch-two"] } });
  writeFileSync(reg, JSON.stringify(scratch, null, 2));
  const out = join(tmp, label);
  const r = spawnSync("node", ["src/move-extraction-playground/judge-bench.mjs", "--axis", "SCRATCH AXIS", "--draws", "5", "--out", out, "--registry", reg, "--record"],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: fake, FAKE_SEES: sees === "silent" ? "silent" : sees ? "1" : "0" } });
  return { r, bench: existsSync(join(out, "bench.json")) ? JSON.parse(readFileSync(join(out, "bench.json"), "utf8")) : null,
    after: JSON.parse(readFileSync(reg, "utf8")) };
};
cases++;
const seen = benchOnce(true, "sees");
const rates = seen.bench && seen.bench.axes["SCRATCH AXIS"] ? seen.bench.axes["SCRATCH AXIS"].rates : null;
if (!rates || rates.defect_refused_with !== 1 || rates.defect_refused_without !== 0 || rates.clean_passed_with !== 1 || rates.clean_passed_without !== 1) {
  fails.push(`(d1) the bench over a scratch axis did not write its rates: ${JSON.stringify(rates)} ${seen.r.stderr || ""}`);
}
const kept = seen.after.axes.find((a) => a.id === "SCRATCH AXIS");
if (!kept || !kept.justified_by || kept.justified_by.rates.defect_refused_with !== 1) fails.push("(d1) a kept axis's justified_by was not recorded");
cases++;
const blind = benchOnce(false, "blind");
if (!blind.bench || blind.bench.axes["SCRATCH AXIS"].kept !== false) fails.push("(d2) an axis whose defect is not refused with it was graded kept");
if (blind.after.axes.some((a) => a.id === "SCRATCH AXIS") || Object.hasOwn(blind.after.records, "scratch-join")
    || !Object.hasOwn(blind.after.records, "leg3-clean")) {
  fails.push("(d2) an axis the rule does not keep was not removed with only the record it alone named");
}
cases++;
const silent = benchOnce("silent", "silent");
if (!silent.bench || silent.bench.axes["SCRATCH AXIS"].measured !== false || !silent.after.axes.some((a) => a.id === "SCRATCH AXIS")) {
  fails.push("(d3) an axis whose bench calls were never read was removed, or not reported as unmeasured");
}
rmSync(tmp, { recursive: true, force: true });
rmSync(lib, { recursive: true, force: true });

console.log(`fixture cases run: ${cases}`);
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan-axes -- every judge axis is one sentence with a defect and a clean fixture and the bench run that kept it, the judge prompt renders exactly the registry's axes, the validator refuses a Waypoint count off the bound Move's Segments and a paragraph carrying both performs and point, the bench writes an axis's rates and records or removes it, the criteria table carries every criterion of both judges and no other, and the judge is handed the Leg's bound Move's takes and leaves beside what the Legs before it state");
JS
