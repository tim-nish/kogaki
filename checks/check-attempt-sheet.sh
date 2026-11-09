#!/usr/bin/env bash
# check-attempt-sheet -- the Feedback-Loop Playground (kogaki#1756) renders one Leg of a ParagraphPlan run from the
# run directory alone. Its cases (a)-(l) are the `attempt-sheet` entry's contract in checks/registry.json.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { writeAttemptRecord, pinAttemptRefusal, attemptDir } = await imp("src/workflow/attempt-record.mjs");
const { SiteLoop } = await imp("src/workflow/site-retry.mjs");
const { JUDGE_INPUT_MARKER, judgeRefusalBlock, readJudgePrompt } = await imp("src/workflow/judge.mjs");
const { renderRowHead } = await imp("src/paragraph-plan.mjs");
const { renderAttemptSheet, unitStatus, TABLE_HEADINGS, ATTEMPT_DEFINITION } = await imp("src/attempt-sheet/sheet.mjs");
const root = mkdtempSync(join(tmpdir(), "attempt-sheet-"));
const run = join(root, "run");
mkdirSync(join(run, "mapping"), { recursive: true });

const M1 = "set_a_second_instance_beside_the_first";
const M2 = "carry_a_worked_case_onto_the_wider_scale";
const pw = (...points) => points.map((point) => ({ point, serves: ["L1"], cast: {} }));
const entry = (waypoint, points, extra = {}) => ({ waypoint, move: M1, ...(waypoint > 1 ? { join: "elaboration" } : {}), paragraph_waypoints: pw(...points), ...extra });
const leg = (id) => ({ leg_id: id, waypoints: [
  { waypoint: 1, point: `The first point of ${id}.`, case: "own" }, { waypoint: 2, point: `The second point of ${id}.`, case: "apart" }] });
writeFileSync(join(run, "paragraph-plan-start.json"), JSON.stringify({ brief: "theses/fixture/brief.yaml", brief_sha256: "0", moves_dir: "moves", legs: [leg("leg1"), leg("leg2")] }));

const head = (id, jp) => renderRowHead({ id, judgment_point: jp, input_shape: "one record" });
const planInput = (tabled) => ({ leg_you_must_plan: { leg_id: "leg2", waypoints: [1, 2].map((waypoint) => ({ waypoint, ...(tabled ? { move: M1, table: {} } : {}) })) } });
const record = (unit, n, phase, answer, refusal = null, prompt = "p") => writeAttemptRecord(run, unit, n,
  { prompt, argv: [], cli: null, input: null, row: { phase }, raw: "", answer, refusal });
// leg1: attempt 1 refused at Waypoint 1, attempt 2 passed.
const L1_REFUSAL = "Leg leg1, Waypoint 1 carries `join` — the first Leg Waypoint of a Leg carries no join";
const l1b = { version: 1, leg_id: "leg1", waypoints: [entry(1, ["Alpha one."]), entry(2, ["Alpha two."])] };
record("leg-1", 1, "compose", { version: 1, leg_id: "leg1", waypoints: [entry(1, ["Alpha one."], { join: "consequence" }), entry(2, ["Alpha two."])] }, { text: L1_REFUSAL, sites: [1] });
record("leg-1", 2, "compose", l1b);
// leg2.
const STOPPED = "the compose call ran past the 900s per-call limit";
const J2 = "Leg leg2, Waypoint 2: the judge wrote: \"OWN STEP fails: point 1 restates the earlier case.\"";
const S2 = "Leg leg2, Waypoint 2: Paragraph 2's points carry the Correspondence expression of the Role \"fallback\" in none of them";
const STOP = `Waypoint 2: the Leg's 1 site retries are spent (kogaki#1642); the first refusal: ${J2}; the last refusal: ${S2}`;
const LEGACY = "Leg leg2, Waypoint 2: a refusal an older run kept on the job record alone";
const SITE_JP = "repair the ONE paragraph a refusal named, and only it.\n- READ: Read every entry of `refused_here`.";
const BIND1 = "The rule stands in front of every request.";
const WRITE1 = "An enumerated prohibition stands in front of every request.";
const KEPT2 = "Everything else is settled silently.";
const SITE1 = "A second request meets the same prohibition, written out in full.";
record("leg-2", 1, "compose", undefined, { text: STOPPED }, head("paragraph_plan_unit", "plan the Leg.") + JSON.stringify(planInput(false)));
record("leg-2", 2, "compose", { version: 1, leg_id: "leg2", waypoints: [entry(1, ["Beta one."]), entry(2, [BIND1, KEPT2])] }, null,
  head("paragraph_plan_unit", "plan the Leg.") + JSON.stringify(planInput(false)));
record("leg-2", 3, "compose", { version: 1, leg_id: "leg2", waypoints: [entry(1, ["Beta one."]), entry(2, [WRITE1, KEPT2])] }, null,
  head("paragraph_plan_unit", "plan the Leg.") + JSON.stringify(planInput(true)));
record("leg-2", 4, "fit", { version: 1, leg_id: "leg2", verdicts: [{ waypoint: 1, verdict: "fits", why: "It fits." },
  { waypoint: 2, verdict: "does-not-fit", why: "OWN STEP fails: point 1 restates the earlier case." }] },
{ text: `THE PARAGRAPH WAYPOINTS WERE JUDGED:\n${J2}`, sites: [{ leg_id: "leg2", waypoint: 2, why: "OWN STEP fails", refusal: J2 }] });
const siteInput = { leg_waypoint_you_must_plan: { leg_id: "leg2", waypoint: 2 }, refused_here: [{ entry: entry(2, [WRITE1, KEPT2]), refusal: J2 }] };
record("leg-2", 5, "site", entry(2, [SITE1, KEPT2], { move: M2 }), null, head("paragraph_plan_site_unit", SITE_JP) + JSON.stringify(siteInput, null, 2));
// THE SITE LOOP REFUSES THE SITE RETRY'S ENTRY, and the refusal is pinned to that call's record (kogaki#1756).
const loop = new SiteLoop({ sitePrompt: () => "p", siteAccept: () => ({ error: S2 }), legAttempts: 1 }, "leg-2", 2);
loop.open({ waypoints: [entry(1, ["Beta one."]), entry(2, [WRITE1, KEPT2])] }, [{ waypoint: 2, refusal: J2 }], { byJudge: true });
loop.answered(entry(2, [SITE1, KEPT2], { move: M2 }));
const raised = loop.drainRaised();
ok(raised.length === 1 && raised[0].text === S2 && JSON.stringify(raised[0].sites) === "[2]", `(e) the site loop raised ${JSON.stringify(raised)}`);
for (const r of raised) pinAttemptRefusal(run, "leg-2", 5, r);
ok(!pinAttemptRefusal(run, "leg-2", 1, { text: "another" }), "(e) a pin replaced a refusal the call already carried");
const pinned = JSON.parse(readFileSync(join(attemptDir(run, "leg-2", 5), "refusal.json"), "utf8"));
ok(pinned && pinned.text === S2 && JSON.stringify(pinned.sites) === "[2]", `(e) the refused call's record holds ${JSON.stringify(pinned)}`);
record("leg-2/reading/waypoint-1", 1, "reading", { roles: [] });
record("leg-2/grounding/waypoint-1", 1, "grounding", { base: { domain: "instructions" }, correspondences: [{ role: "rule", expression: "an enumerated prohibition" }] });
record("leg-2/grounding/waypoint-2", 1, "grounding", { base: { domain: "a shop counter" }, correspondences: [{ role: "rule", expression: "the price list" }] });
const structure = { roles: [{ id: "rule", context: "a standing rule", attributes: ["enumerated"] }], relations: [] };
writeFileSync(join(run, "mapping", "leg-2.json"), JSON.stringify({ leg_id: "leg2", structures: { 1: structure, 2: structure },
  tables: { 1: { move: M1, case: "own", base: { domain: "instructions" }, correspondences: [{ role: "rule", expression: "an enumerated prohibition" }] },
    2: { move: M1, case: "apart", base: { domain: "a shop counter" }, correspondences: [{ role: "rule", expression: "the price list" }] } } }));
writeFileSync(join(run, "reader-path-job.json"), JSON.stringify({ state: "refused", supervisor_pid: 0, units: [
  { id: "leg-1", status: "done", attempts: 2, attempt_1_s: 12, candidate: l1b, refusals: [L1_REFUSAL] },
  { id: "leg-2", status: "refused", attempts: 5, attempt_1_s: 30, failure: { class: "schema refusal", stderr_tail: STOP },
    refusals: [STOPPED, `THE PARAGRAPH WAYPOINTS WERE JUDGED:\n${J2}`, J2, S2, LEGACY, STOP] }] }));

const waypointHtml = (html, n) => (html.split(`id="waypoint-${n}"`)[1] || "").split('id="waypoint-')[0].split('id="calls"')[0];
const escq = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r2 = renderAttemptSheet({ runDir: run, legId: "leg2", outDir: root });
const html = r2.html || "";
const w1 = waypointHtml(html, 1);
const w2 = waypointHtml(html, 2);
const block = (n) => (w2.split(`>Attempt ${n} · `)[1] || "").split(">Attempt ")[0];
// (a)
ok(!r2.error, `(a) leg2 did not render: ${r2.error}`);
ok(!existsSync(join(run, "paragraph-plan.yaml")), "(a) the fixture holds a paragraph-plan.yaml");
for (const [n, w] of [[1, w1], [2, w2]]) {
  ok(/class="tag tag-/.test(w), `(a) Leg Waypoint ${n} carries no status tag`);
  ok(w.includes(`The ${n === 1 ? "first" : "second"} point of leg2.`), `(a) Leg Waypoint ${n} lacks the Brief's point`);
}
// (b)
const r1 = renderAttemptSheet({ runDir: run, legId: "leg1", outDir: root });
ok(JSON.stringify(r1.tags) === JSON.stringify(["passed", "passed"]), `(b) leg1 tags are ${JSON.stringify(r1.tags)}, not passed on every Waypoint`);
// (c)
ok(JSON.stringify(r2.tags) === JSON.stringify(["stood", "refused here"]), `(c) leg2 tags are ${JSON.stringify(r2.tags)}`);
// (d)
const order = [...w2.matchAll(/<h3 class="attempt">Attempt (\d+) · ([^<]+)<\/h3>/g)].map((m) => `${m[1]} ${m[2]}`);
ok(JSON.stringify(order) === JSON.stringify(["2 bind", "3 write", "4 judge", "5 site retry at Waypoint 2"]), `(d) Waypoint 2's attempt blocks are ${JSON.stringify(order)}`);
ok(w2.includes("Attempt 1 · stopped · left standing"), "(d) the stopped call is not one `left standing` line at Waypoint 2");
ok(block(4).includes(">Verdict</h4>") && block(4).includes("does-not-fit") && !block(4).includes(">Entry as written</h4>"), "(d) the judge block is not a Verdict without an entry");
ok(w1.includes("Attempt 5 · site retry at Waypoint 2 · left standing"), "(d) the site retry is not `left standing` at Waypoint 1");
// (e)
ok(block(5).includes(">Refusal drawn</h4>") && block(5).includes(escq(S2)) && block(5).includes("<td>attempt 5</td>"), "(e) the site loop's refusal is not drawn by the site retry's entry");
ok(block(3).includes(">Refusal drawn</h4>") && block(3).includes(escq(J2)) && block(3).includes("<td>attempt 4</td>"), "(e) the judge's refusal is not drawn by the write call's entry, raised by the judge");
ok(!block(2).includes(">Refusal drawn</h4>"), "(e) the bind call's entry is shown drawing a refusal");
ok(!html.includes("by order"), "(e) the sheet carries a `by order` marker");
const band = html.split('id="waypoint-1"')[0];
ok(band.includes("unplaced") && band.includes(escq(LEGACY)) && !w2.includes(escq(LEGACY)), "(e) the job-record-only refusal is not `unplaced` in the Leg band");
ok(band.includes(STOPPED), "(e) the stopped call's refusal naming no Leg Waypoint is not in the Leg band");
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
// (i)
const signal = (block(5).split(">Signal answered</h4>")[1] || "").split("</table>")[0];
ok(signal.includes(escq(J2)) && signal.includes(escq(SITE_JP)), "(i) the site retry's Signal answered lacks its handed refusal or its judgment point, verbatim");
ok(!block(2).includes(">Signal answered</h4>"), "(i) a first call shows a Signal answered");
const retry = readJudgePrompt(`${head("paragraph_plan_unit", "plan the Leg.").slice(0, -(JUDGE_INPUT_MARKER.length + 1))}${judgeRefusalBlock([{ answer: { a: 1 }, refusal: "first\n\nrefusal" }, { answer: null, refusal: S2 }])}\n\n${JUDGE_INPUT_MARKER}\n{}`);
ok(JSON.stringify(retry.refusals) === JSON.stringify(["first\n\nrefusal", S2]) && /^Those are your previous answers/.test(retry.instruction || ""),
  `(i) a write retry's prompt reads back ${JSON.stringify(retry)}`);
// (j)
const points = (w2.split(">Points after the last attempt (attempt 5)</h4>")[1] || "").split("<h4")[0];
ok(points.includes(SITE1) && !points.includes(WRITE1), "(j) Points after the last attempt is not the site retry's entry");
// (k)
const structureAt = (w2.split(">Structure</h4>")[1] || "").split("</table>")[0];
const corr = (w2.split(">Correspondence</h4>")[1] || "").split("</table>")[0];
ok(structureAt.includes("<th>Abstract</th>") && !structureAt.includes("the price list"), "(k) the Structure table is not Role, Abstract and Attribute alone");
ok(corr.includes(`attempt 2 · ${M1}`) && corr.includes("the price list"), `(k) the Correspondence column is not headed by the bind attempt and its Move`);
ok(w2.includes(`grounded for ${M1}; the last attempt binds ${M2}`), "(k) the `grounded for` line does not name both Moves");
ok(!w1.includes("grounded for"), "(k) Waypoint 1, whose last attempt binds the grounded Move, carries a `grounded for` line");
// (l)
for (const t of html.split("<table>").slice(0, -1)) {
  const h = (t.match(/<h4 class="th">([^<]*)<\/h4>(?:<p[^>]*>(?:(?!<\/?p).)*<\/p>)*$/) || [])[1];
  ok(h !== undefined && TABLE_HEADINGS.some((name) => h.replace(/&#39;|&apos;/g, "'") === name || h.startsWith(`${name} (`)), `(l) a table stands under no fixed heading, after ${JSON.stringify(t.slice(-120))}`);
}
ok(band.includes(escq(ATTEMPT_DEFINITION)), "(l) the Leg band does not state the attempt definition");

rmSync(root, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("attempt-sheet: 12 cases pass");
JS
