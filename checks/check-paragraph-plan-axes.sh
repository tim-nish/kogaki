#!/usr/bin/env bash
# The ParagraphPlan judge's criteria are a registry of one-sentence axes, each kept on
# evidence, and the countable rules are the validator's (kogaki#1533, owner decision
# 2026-10-23). Four assertions: (a) every axis in src/paragraph-plan-axes.json is one
# sentence carrying one responsibility, with a defect and a clean fixture and a
# `justified_by` bench run; (b) the rendered judge prompt carries every axis, in order,
# and the workflow table writes no criterion of its own; (c) the plan-record validator
# refuses a Leg Waypoint whose Paragraph Waypoints are not one per Segment of the bound
# Move, and an entry carrying both `performs` and `point`, naming the entry; (d) the
# bench runs a scratch axis over a fake judge, writes its rates, and records or removes it,
# leaving an axis whose calls were never read as it was.
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
const { readAxes, axesFailures, axisRecord, criteriaOf, renderRowHead, validateParagraphPlanUnit, boundMoveContract }
  = await imp("src/paragraph-plan.mjs");
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
    const at = registry.records[n].at_waypoint;
    const clean = JSON.stringify(axisRecord(registry, a.fixtures.clean[0]).leg_you_must_judge.waypoints[at - 1]);
    if (JSON.stringify(axisRecord(registry, n).leg_you_must_judge.waypoints[at - 1]) === clean) fails.push(`(a) defect "${n}" changes nothing at its Leg Waypoint ${at}`);
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
// The Move is the check's own fixture copy, never a record of the curated library, which
// refills only from reviewed Proof Sheets (911bbd3, kogaki#1625); ROLES.json is the library's.
const moveId = "apply_a_definition_to_one_everyday_instance";
const lib = mkdtempSync(join(tmpdir(), "paragraph-plan-axes-lib-"));
writeFileSync(join(lib, "ROLES.json"), readFileSync(join("moves", "ROLES.json")));
writeFileSync(join(lib, `${moveId}.yaml`), readFileSync(join("checks", "fixtures", "moves", `${moveId}.yaml`)));
const segments = boundMoveContract(moveId, lib).segments.length;
const inputs = { movesDir: lib, legs: [{ leg_id: "v1", waypoints: [{ waypoint: 1, point: "A point.", serves: ["L1"], next_point: null }] }] };
const plan = (pws) => ({ version: "1", leg_id: "v1", waypoints: [{ waypoint: 1, move: moveId, why: "the Move carries this point", paragraph_waypoints: pws }] });
const pw = (i) => ({ point: `Part ${i} of the point.`, serves: ["L1"] });
const parts = (n) => Array.from({ length: n }, (_, i) => pw(i + 1));
cases++;
const ok = validateParagraphPlanUnit(plan(parts(segments)), inputs, "leg-1");
if (ok.error) fails.push(`(c) a plan one per Segment is refused: ${ok.error}`);
cases++;
const short = validateParagraphPlanUnit(plan(parts(segments - 1)), inputs, "leg-1").error || "";
if (!short.includes("Leg v1, Waypoint 1") || !short.includes(`${segments - 1} Paragraph Waypoint(s) for the ${segments} Segment(s)`)) {
  fails.push(`(c1) a Leg Waypoint one Paragraph Waypoint short of its Move's Segments is not refused naming the entry: ${short || "no refusal"}`);
}
cases++;
const both = parts(segments);
both[1] = { performs: "Puts the question to the reader.", point: "Part 2 of the point.", serves: ["L1"] };
const two = validateParagraphPlanUnit(plan(both), inputs, "leg-1").error || "";
if (!two.includes("Leg v1, Waypoint 1") || !two.includes("Paragraph Waypoint 2 carries `performs` beside")) {
  fails.push(`(c2) an entry carrying both performs and point is not refused naming it: ${two || "no refusal"}`);
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
  const verdicts = leg.waypoints.map((w, i) => ({ waypoint: i + 1, why: "the fake judge read the join word",
    verdict: sees && w.join === "consequence" ? "does-not-fit" : "fits" }));
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ version: "1", leg_id: leg.leg_id, verdicts }) }) + "\\n");
});
`, { mode: 0o755 });
const benchOnce = (sees, label) => {
  const reg = join(tmp, `${label}.json`);
  const scratch = structuredClone(registry);
  scratch.records["scratch-join"] = { from: "leg3-clean", at_waypoint: 3, edit: { waypoint: 3, join: "consequence" } };
  scratch.axes.push({ id: "SCRATCH AXIS", sentence: "The join is judged.", fixtures: { defect: ["scratch-join"], clean: ["leg3-clean"] } });
  writeFileSync(reg, JSON.stringify(scratch, null, 2));
  const out = join(tmp, label);
  const r = spawnSync("node", ["src/proof-sheet/judge-bench.mjs", "--axis", "SCRATCH AXIS", "--draws", "5", "--out", out, "--registry", reg, "--record"],
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
    || !Object.hasOwn(blind.after.records, "leg3-run")) {
  fails.push("(d2) an axis the rule does not keep was not removed with only the record it alone named");
}
cases++;
const silent = benchOnce("silent", "silent");
if (!silent.bench || silent.bench.axes["SCRATCH AXIS"].measured !== false || !silent.after.axes.some((a) => a.id === "SCRATCH AXIS")) {
  fails.push("(d3) an axis whose bench calls were never read was removed, or not reported as unmeasured");
}
rmSync(tmp, { recursive: true, force: true });

console.log(`fixture cases run: ${cases}`);
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan-axes -- every judge axis is one sentence with a defect and a clean fixture and the bench run that kept it, the judge prompt renders exactly the registry's axes, the validator refuses a Paragraph Waypoint count off the bound Move's Segments and an entry carrying both performs and point, and the bench writes an axis's rates and records or removes it");
JS
