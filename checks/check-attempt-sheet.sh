#!/usr/bin/env bash
# check-attempt-sheet -- the Attempt Sheet (kogaki#1752) renders one Leg of a ParagraphPlan run from the run directory
# alone, over a fixture run holding one passed Leg (leg1) and one refused Leg (leg2), two attempts each, written by the
# Attempt Record's own writer:
#   (a) leg2 renders with no paragraph-plan.yaml: each Leg Waypoint carries a status tag, the Brief's point, its final
#       Points as a Segments table and its Mapping Table.
#   (b) leg1, done, carries `passed` on every Leg Waypoint.
#   (c) the Waypoint the last refusal named carries `refused here`, its refusal table holds the full text and names
#       the point, and that point's row is highlighted; the other carries `stood`.
#   (d) the revision table shows the revised point before and after, and the unrevised point and Move as unchanged.
#   (e) a refusal naming no Leg Waypoint appears in full in the Leg band.
#   (f) the call list holds the unit's nested reading and grounding records.
#   (g) the CLI refuses a directory with no start record or no job record, naming the file, and a --leg the start
#       record does not carry, naming the Legs it does.
#   (h) a `running` unit whose supervisor is gone reads `stopped`.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { writeAttemptRecord } = await imp("src/workflow/attempt-record.mjs");
const { renderAttemptSheet, unitStatus } = await imp("src/attempt-sheet/sheet.mjs");
const root = mkdtempSync(join(tmpdir(), "attempt-sheet-"));
const run = join(root, "run");
mkdirSync(join(run, "mapping"), { recursive: true });

const MOVE = "set_a_second_instance_beside_the_first";
const pw = (...points) => points.map((point) => ({ point, serves: ["L1"], cast: {} }));
const entry = (waypoint, points, extra = {}) => ({ waypoint, move: MOVE, ...(waypoint > 1 ? { join: "elaboration" } : {}), paragraph_waypoints: pw(...points), ...extra });
const leg = (id) => ({ leg_id: id, waypoints: [
  { waypoint: 1, point: `The first point of ${id}.`, case: "own" }, { waypoint: 2, point: `The second point of ${id}.`, case: "apart" }] });
writeFileSync(join(run, "paragraph-plan-start.json"), JSON.stringify({ brief: "theses/fixture/brief.yaml", brief_sha256: "0", moves_dir: "moves", legs: [leg("leg1"), leg("leg2")] }));

const record = (unit, n, phase, answer, refusal = null) => writeAttemptRecord(run, unit, n,
  { prompt: "p", argv: [], cli: null, input: null, row: { phase }, raw: "", answer, refusal });
// leg1: attempt 1 refused at Waypoint 1, attempt 2 passed.
const L1_REFUSAL = "Leg leg1, Waypoint 1 carries `join` — the first Leg Waypoint of a Leg carries no join";
const l1a = { version: 1, leg_id: "leg1", waypoints: [entry(1, ["Alpha one."], { join: "consequence" }), entry(2, ["Alpha two."])] };
const l1b = { version: 1, leg_id: "leg1", waypoints: [entry(1, ["Alpha one."]), entry(2, ["Alpha two."])] };
record("leg-1", 1, "compose", l1a, { text: L1_REFUSAL, sites: [1] });
record("leg-1", 2, "compose", l1b);
// leg2: attempt 1 refused at Waypoint 2 point 1; attempt 2, a site retry there, revises point 1 and keeps point 2;
// the site loop then refuses Waypoint 2 again, recorded only on the job record.
const R1 = "Leg leg2, Waypoint 2: Paragraph 2's point 1 carries the Role id \"rule\" — a point says the structure in the Correspondence expressions";
const R2 = "Leg leg2, Waypoint 2: Paragraph 2's points carry the Correspondence expression of the Role \"fallback\" in none of them";
const WIDE = "the judge found the Leg's paragraphs out of their Reader Path order";
const OLD1 = "The rule stands in front of every request.";
const NEW1 = "An enumerated prohibition stands in front of every request.";
const KEPT2 = "Everything else is settled silently.";
record("leg-2", 1, "compose", { version: 1, leg_id: "leg2", waypoints: [entry(1, ["Beta one."]), entry(2, [OLD1, KEPT2])] }, { text: R1, sites: [2], group: "vocabulary", reach: "site" });
record("leg-2", 2, "site", entry(2, [NEW1, KEPT2]));
record("leg-2/reading/waypoint-1", 1, "reading", { roles: [] });
record("leg-2/grounding/waypoint-1", 1, "grounding", { correspondences: [] });
writeFileSync(join(run, "mapping", "leg-2.json"), JSON.stringify({ leg_id: "leg2",
  structures: { 1: { roles: [{ id: "rule", context: "a standing rule", attributes: ["enumerated"] }], relations: [] } },
  tables: { 1: { move: MOVE, case: "own", base: { domain: "instructions" }, correspondences: [{ role: "rule", expression: "an enumerated prohibition" }] } } }));
writeFileSync(join(run, "reader-path-job.json"), JSON.stringify({ state: "refused", supervisor_pid: 0, units: [
  { id: "leg-1", status: "done", attempts: 2, attempt_1_s: 12, candidate: l1b, refusals: [L1_REFUSAL] },
  { id: "leg-2", status: "refused", attempts: 2, attempt_1_s: 30, refusals: [WIDE, R1, R2] }] }));

const waypointHtml = (html, n) => (html.split(`id="waypoint-${n}"`)[1] || "").split('id="waypoint-')[0].split('id="calls"')[0];
const r2 = renderAttemptSheet({ runDir: run, legId: "leg2", outDir: root });
const html = r2.html || "";
// (a)
ok(!r2.error, `(a) leg2 did not render: ${r2.error}`);
ok(!existsSync(join(run, "paragraph-plan.yaml")), "(a) the fixture holds a paragraph-plan.yaml");
for (const n of [1, 2]) {
  const w = waypointHtml(html, n);
  ok(/class="tag tag-/.test(w), `(a) Leg Waypoint ${n} carries no status tag`);
  ok(w.includes(`The ${n === 1 ? "first" : "second"} point of leg2.`), `(a) Leg Waypoint ${n} lacks the Brief's point`);
  ok(w.includes("<th>operation</th>") && w.includes("<th>point</th>"), `(a) Leg Waypoint ${n} lacks the Segments table`);
}
ok(waypointHtml(html, 1).includes("<th>Correspondence</th>") && waypointHtml(html, 1).includes("an enumerated prohibition"), "(a) Leg Waypoint 1 lacks its Mapping Table");
// (b)
const r1 = renderAttemptSheet({ runDir: run, legId: "leg1", outDir: root });
ok(JSON.stringify(r1.tags) === JSON.stringify(["passed", "passed"]), `(b) leg1 tags are ${JSON.stringify(r1.tags)}, not passed on every Waypoint`);
// (c)
ok(JSON.stringify(r2.tags) === JSON.stringify(["stood", "refused here"]), `(c) leg2 tags are ${JSON.stringify(r2.tags)}`);
const w2 = waypointHtml(html, 2);
const escq = (s) => s.replace(/"/g, "&quot;");
ok(w2.includes(escq(R1)) && w2.includes(escq(R2)), "(c) the refusal table lacks the full refusal text");
ok(/<td>point 1<\/td><\/tr>/.test(w2), "(c) the refusal table does not name point 1");
ok(/<tr class="named"><td>1<\/td>/.test(w2), "(c) point 1's row is not highlighted");
ok(!waypointHtml(html, 1).includes(escq(R1)), "(c) Leg Waypoint 1 shows a refusal that named Waypoint 2");
// (d)
ok(w2.includes(`<td>point 1</td><td>${OLD1}</td><td>${NEW1}</td>`), "(d) the revision table does not show point 1 before and after");
ok(w2.includes(`<td>point 2</td><td>${KEPT2}</td><td><span class="unchanged">unchanged</span></td>`), "(d) point 2 is not shown unchanged");
ok(/<td>move<\/td><td>[^<]*<\/td><td><span class="unchanged">unchanged<\/span>/.test(w2), "(d) the Move is not shown unchanged");
// (e)
const band = html.split('id="waypoint-1"')[0];
ok(band.includes(WIDE) && !waypointHtml(html, 1).includes(WIDE), "(e) the Leg-wide refusal is not in the Leg band");
// (f)
const calls = html.split('id="calls"')[1] || "";
ok(calls.includes("reading/waypoint-1") && calls.includes("grounding/waypoint-1"), "(f) the call list lacks the nested reading and grounding records");
// (g)
const cli = (args) => spawnSync(process.execPath, ["src/attempt-sheet/sheet.mjs", "leg", ...args], { encoding: "utf8" });
const empty = join(root, "empty");
mkdirSync(empty);
let c = cli(["--run", empty, "--leg", "leg1"]);
ok(c.status === 1 && /paragraph-plan-start\.json/.test(c.stderr), `(g) no start record: exit ${c.status}, ${c.stderr.trim()}`);
writeFileSync(join(empty, "paragraph-plan-start.json"), JSON.stringify({ legs: [] }));
c = cli(["--run", empty, "--leg", "leg1"]);
ok(c.status === 1 && /reader-path-job\.json/.test(c.stderr), `(g) no job record: exit ${c.status}, ${c.stderr.trim()}`);
c = cli(["--run", run, "--leg", "leg9"]);
ok(c.status === 1 && /leg1, leg2/.test(c.stderr), `(g) an unknown Leg: exit ${c.status}, ${c.stderr.trim()}`);
// (h)
ok(unitStatus({ supervisor_pid: 2 ** 30 }, { status: "running" }) === "stopped", "(h) a running unit with no supervisor does not read stopped");

rmSync(root, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("attempt-sheet: 8 cases pass");
JS
