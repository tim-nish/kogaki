#!/usr/bin/env bash
# check-flp -- the Feedback-Loop Playground (kogaki#1756, kogaki#1758) renders one Leg of a ParagraphPlan run from the
# run directory alone, one Round per Submission. Its cases (a)-(n) are the `flp` entry's contract in checks/registry.json.
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
const { renderRowHead } = await imp("src/paragraph-plan.mjs");
const { renderFlp, unitStatus, TABLE_HEADINGS, ROUND_BLOCKS, ROUND_DEFINITION, NO_TABLE } = await imp("src/flp/sheet.mjs");
const root = mkdtempSync(join(tmpdir(), "flp-"));
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
// leg1, with no Mapper: Call 1 refused at Waypoint 1 by the Leg validator, Call 2 passed.
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
const SITE2 = "A second request meets the prohibition, and the price list answers it.";
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
// THE SITE LOOP REFUSES THE SITE RETRY'S ENTRY, and the refusal is pinned to that Call's record (kogaki#1756).
const loop = new SiteLoop({ sitePrompt: () => "p", siteAccept: () => ({ error: S2 }), legAttempts: 1 }, "leg-2", 2);
loop.open({ waypoints: [entry(1, ["Beta one."]), entry(2, [WRITE1, KEPT2])] }, [{ waypoint: 2, refusal: J2 }], { byJudge: true });
loop.answered(entry(2, [SITE1, KEPT2], { move: M2 }));
const raised = loop.drainRaised();
ok(raised.length === 1 && raised[0].text === S2 && JSON.stringify(raised[0].sites) === "[2]", `(e) the site loop raised ${JSON.stringify(raised)}`);
for (const r of raised) pinAttemptRefusal(run, "leg-2", 5, r);
// Call 6: a second site retry, kept by no validator and read by no Judge, the unit stopping first.
record("leg-2", 6, "site", entry(2, [SITE2, KEPT2], { move: M2 }), null, head("paragraph_plan_site_unit", SITE_JP) + JSON.stringify(siteInput, null, 2));
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
  { id: "leg-2", status: "refused", attempts: 6, attempt_1_s: 30, failure: { class: "schema refusal", stderr_tail: STOP },
    refusals: [STOPPED, `THE PARAGRAPH WAYPOINTS WERE JUDGED:\n${J2}`, J2, S2, LEGACY, STOP] }] }));

const waypointHtml = (html, n) => (html.split(`id="waypoint-${n}"`)[1] || "").split('id="waypoint-')[0].split('id="calls"')[0];
const escq = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const count = (hay, needle) => hay.split(needle).length - 1;
const r2 = renderFlp({ runDir: run, legId: "leg2", outDir: root });
const html = r2.html || "";
const w1 = waypointHtml(html, 1);
const w2 = waypointHtml(html, 2);
const roundsOf = (w) => w.split('<h3 class="round">').slice(1);
const round = (w, k) => roundsOf(w).find((r) => r.startsWith(`Round ${k}</h3>`)) || "";
const block = (r, name) => (r.split(`<h4 class="th">${name}</h4>`)[1] || "").split('<h4 class="th">')[0];
// (a)
ok(!r2.error, `(a) leg2 did not render: ${r2.error}`);
ok(!existsSync(join(run, "paragraph-plan.yaml")), "(a) the fixture holds a paragraph-plan.yaml");
for (const [n, w] of [[1, w1], [2, w2]]) {
  ok(/class="tag tag-/.test(w), `(a) Leg Waypoint ${n} carries no status line`);
  ok(w.includes(`The ${n === 1 ? "first" : "second"} point of leg2.`), `(a) Leg Waypoint ${n} lacks the Brief's point`);
}
// (b)
const r1 = renderFlp({ runDir: run, legId: "leg1", outDir: root });
ok(JSON.stringify(r1.tags) === JSON.stringify(["passed", "passed"]), `(b) leg1 tags are ${JSON.stringify(r1.tags)}, not passed on every Leg Waypoint`);
ok(waypointHtml(r1.html, 1).includes(">passed in Round 2<"), "(b) leg1's Leg Waypoint 1 does not read `passed in Round 2`");
// (c)
ok(JSON.stringify(r2.tags) === JSON.stringify(["passed", "stopped"]), `(c) leg2 tags are ${JSON.stringify(r2.tags)}`);
ok(w1.includes(">passed in Round 1<") && w2.includes(">stopped after Round 3<"), "(c) the status lines are not `passed in Round 1` and `stopped after Round 3`");
ok(w2.split('<h3 class="round">')[0].includes(escq(STOP)), "(c) the stopped Leg Waypoint's status line is not followed by the unit's stop text");
// (d) the Rounds, their bare headings and their five blocks
const headings = [...html.matchAll(/<h3 class="round">([^<]*)<\/h3>/g)].map((m) => m[1]);
ok(headings.every((h) => /^Round \d+$/.test(h)), `(d) a Round heading is more than the two words and the number: ${JSON.stringify(headings)}`);
ok(JSON.stringify(roundsOf(w2).map((r) => r.split("</h3>")[0])) === JSON.stringify(["Round 1", "Round 2", "Round 3"]), `(d) Leg Waypoint 2's Rounds are ${JSON.stringify(roundsOf(w2).map((r) => r.split("</h3>")[0]))}`);
ok(roundsOf(w1).length === 1, `(d) the bind Call or the site retry at Waypoint 2 renders a Round at Leg Waypoint 1: ${roundsOf(w1).length} Rounds`);
for (const [n, w] of [[1, w1], [2, w2], ...[1, 2].map((k) => [`leg1 ${k}`, waypointHtml(r1.html, k)])]) {
  for (const r of roundsOf(w)) {
    const blocks = [...r.matchAll(/<h4 class="th">([^<]*)<\/h4>/g)].map((m) => m[1]);
    ok(JSON.stringify(blocks) === JSON.stringify(ROUND_BLOCKS), `(d) ${r.split("</h3>")[0]} at Leg Waypoint ${n} holds the blocks ${JSON.stringify(blocks)}`);
  }
}
ok(!html.includes(">bind<") || !roundsOf(w2).some((r) => /Call 2: bind/.test(block(r, "Calls"))), "(d) the bind Call is listed as a Round's Call");
// (e) the Binding
ok(block(round(w2, 1), "Binding").includes("the price list") && !block(round(w2, 1), "Binding").includes(NO_TABLE), "(e) Round 1's Binding lacks the Mapping Table grounded for its Move");
ok(block(round(w2, 1), "Binding").includes("bound in Call 2"), "(e) Round 1's Binding does not name the bind Call");
ok(block(round(w2, 2), "Binding").includes(NO_TABLE) && block(round(w2, 2), "Binding").includes(M2), "(e) the rebinding Round's Binding does not say no Mapping Table was grounded for its Move");
ok(block(round(w2, 3), "Binding").includes("Binding of Round 2 holds"), "(e) Round 3's kept Binding is not `Binding of Round 2 holds`");
const outside = [html.split('id="waypoint-1"')[0], ...[w1, w2].map((w) => w.split('<h3 class="round">')[0]), html.split('id="calls"')[1] || ""].join("");
ok(!outside.includes("grounded for") && count(html, "grounded for") === roundsOf(html).filter((r) => block(r, "Binding").includes(NO_TABLE)).length, "(e) a `grounded for` line renders outside a Round's Binding");
// (f) Verdict and Comment, with their sources
ok(block(round(w2, 1), "Verdict").includes("does-not-fit") && block(round(w2, 1), "Comment").includes(escq(J2)) && block(round(w2, 1), "Comment").includes("the Judge"), "(f) the judge-refused Submission's Comment does not name the Judge");
ok(block(round(w2, 2), "Verdict").includes("refused before the Judge") && block(round(w2, 2), "Comment").includes(escq(S2))
  && block(round(w2, 2), "Comment").includes("validateParagraphPlanSite"), "(f) the validator-refused Submission is not `refused before the Judge` with the validator as source");
ok(block(round(w2, 3), "Verdict").includes("not judged") && block(round(w2, 3), "Verdict").includes("The unit stopped before the Judge read this Submission."), "(f) the unjudged Submission's Verdict is not `not judged` with its reason");
ok(block(round(w1, 1), "Comment").includes(">none<") && block(round(w1, 1), "Verdict").includes("fits"), "(f) a `fits` Verdict's Comment does not read none");
const l1w1 = waypointHtml(r1.html, 1);
ok(block(round(l1w1, 1), "Comment").includes("validateParagraphPlanUnit") && block(round(l1w1, 1), "Comment").includes(escq(L1_REFUSAL)), "(f) the Leg validator's Comment does not name it as source");
// (g) a Comment once
ok(count(roundsOf(w2).join(""), escq(J2)) === 1 && count(roundsOf(w2).join(""), escq(S2)) === 1, "(g) a Comment text is rendered a second time under a following Round");
// (h) the Move once per Round, in Binding; no two of Move, join and case on one line
for (const r of roundsOf(w2)) {
  const moves = count(r, M1) + count(r, M2);
  ok(moves <= 1 && moves === count(block(r, "Binding"), M1) + count(block(r, "Binding"), M2), `(h) ${r.split("</h3>")[0]} names the Move outside its Binding, or twice`);
  ok(block(r, "Submission").includes(`<caption>${r.split("</h3>")[0]}</caption>`), `(h) ${r.split("</h3>")[0]}'s Submission table is not captioned with the Round alone`);
}
ok(![...html.matchAll(/<p[^>]*>([^<]*)<\/p>/g)].some((m) => [/Move:/, /join:/, /case:/].filter((re) => re.test(m[1])).length > 1) && !html.includes("·"), "(h) a rendered line joins two fields");
// (i) the Points a Comment names are highlighted in its Submission
ok(/<tr class="named"><td>1<\/td>/.test(block(round(w2, 1), "Submission")), "(i) the point the Judge's Comment names is not highlighted in Round 1's Submission");
ok(block(round(w2, 2), "Submission").includes(SITE1) && block(round(w2, 3), "Submission").includes(SITE2), "(i) a Revision's Submission is not its own Call's entry");
// (j) Calls per Round
const r1calls = block(round(w2, 1), "Calls");
ok(r1calls.includes("Call 3: write") && r1calls.includes("Call 4: judge") && r1calls.includes("grounding/waypoint-2 Call 1: grounding"), `(j) Round 1's Calls are not the write, judge and grounding Calls: ${r1calls}`);
// (k) Structure
const structureAt = (w2.split(">Structure</h4>")[1] || "").split("</table>")[0];
ok(structureAt.includes("<th>Abstract</th>") && !structureAt.includes("the price list") && count(w2, ">Structure</h4>") === 1, "(k) the Structure table is not Role, Abstract and Attribute, once");
// (l) the Leg band and the call list
const band = html.split('id="waypoint-1"')[0];
ok(band.includes("unplaced") && band.includes(escq(LEGACY)) && !w2.includes(escq(LEGACY)), "(l) the job-record-only refusal is not `unplaced` in the Leg band");
ok(band.includes(STOPPED), "(l) the stopped Call's refusal naming no Leg Waypoint is not in the Leg band");
ok(band.includes(escq(ROUND_DEFINITION)) && band.includes("first Call: 30s"), "(l) the Leg band does not state the Round definition or the first Call's seconds");
const calls = html.split('id="calls"')[1] || "";
ok(calls.includes("reading/waypoint-1") && calls.includes("grounding/waypoint-1"), "(l) the call list lacks the nested reading and grounding records");
// (m) the CLI
const cli = (args) => spawnSync(process.execPath, ["src/flp/sheet.mjs", "leg", ...args], { encoding: "utf8" });
const empty = join(root, "empty");
mkdirSync(empty);
let c = cli(["--run", empty, "--leg", "leg1"]);
ok(c.status === 1 && /paragraph-plan-start\.json/.test(c.stderr), `(m) no start record: exit ${c.status}, ${c.stderr.trim()}`);
writeFileSync(join(empty, "paragraph-plan-start.json"), JSON.stringify({ legs: [] }));
c = cli(["--run", empty, "--leg", "leg1"]);
ok(c.status === 1 && /reader-path-job\.json/.test(c.stderr), `(m) no job record: exit ${c.status}, ${c.stderr.trim()}`);
c = cli(["--run", run, "--leg", "leg9"]);
ok(c.status === 1 && /leg1, leg2/.test(c.stderr), `(m) an unknown Leg: exit ${c.status}, ${c.stderr.trim()}`);
ok(unitStatus({ supervisor_pid: 2 ** 30 }, { status: "running" }) === "stopped", "(m) a running unit with no supervisor does not read stopped");
// (n) every table stands under a fixed heading
for (const t of html.split("<table>").slice(0, -1)) {
  const h = (t.match(/<h4 class="th">([^<]*)<\/h4>(?:<p[^>]*>(?:(?!<\/?p).)*<\/p>)*$/) || [])[1];
  ok(h !== undefined && TABLE_HEADINGS.includes(h.replace(/&#39;|&apos;/g, "'")), `(n) a table stands under no fixed heading, after ${JSON.stringify(t.slice(-120))}`);
}

rmSync(root, { recursive: true, force: true });
if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("flp: 14 cases pass");
JS
