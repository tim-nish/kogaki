#!/usr/bin/env bash
# check-paragraph-plan-site-retry — a ParagraphPlan refusal naming a paragraph is retried at that
# paragraph alone, under the Leg's one Move (kogaki#1642, kogaki#1777). A fake judge
# (`KOGAKI_JUDGE_CLI`) answers each call kind -- Leg, site, suffix, judge -- from a scenario module:
#   (s1) one site call holds the Leg's Move and what the Legs before it state; only the site and the next join are re-judged, and the second Leg is handed the first Leg's text;
#   (s2) a site answer repeating the refused paragraph is refused by name before any judge call;
#   (s3) a site answer carrying a Move is repaired by the program, the Leg's Move held;
#   (s4) a spent site ends its Leg alone, naming the paragraph;
#   (s5) the Leg ceiling `paragraph_plan.leg_revisions` ends a Leg naming the paragraph;
#   (s6) only the ParagraphPlan job declares the site loop, never the Brief's compose job;
#   (s7)-(s9) a repair-naming `rationale`, a Leg over `brief.paragraphs_per_leg` and a restatement are refused; (s10) a TAKEN or LEFT refusal reopens the whole Leg, its Move bound again;
#   (s11)-(s12) a forced rewrite and a forced rebind carry their axes, and the run counts them; (s13)-(s14) Repairs (kogaki#1815).
# NOT COVERED: whether a live planner repairs what the refusal names is the model's.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// A HANDED-IN HEARTBEAT (kogaki#1424): fixture jobs poll at 100 ms, the table untouched.
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { legRecord, briefRecordText } = await imp("src/compose.mjs");
const { callRows, callsRoot, readCallRecord } = await imp("src/workflow/call-record.mjs");
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE, siteRepeatRefusal, siteRestatementRefusal } = await imp("src/paragraph-plan.mjs");
const { readReaderPathJob } = await imp("src/workflow/detached-job.mjs");
const { stringifyYaml, parseYaml } = await imp("src/yaml.mjs");

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-site-"));
// THE MAPPER IS OFF IN THIS MEMBER (kogaki#1734): its fake answers the plan and judge calls alone;
// checks/check-paragraph-plan.sh case (z) runs the Mapper.
const noMapper = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
noMapper.paragraph_plan.mapper = false;
noMapper.brief.paragraphs_per_leg = 2;
process.env.KOGAKI_SETTINGS = join(root, "settings-no-mapper.json");
writeFileSync(process.env.KOGAKI_SETTINGS, JSON.stringify(noMapper));
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
for (const id of ["p1", "p2"]) {
  writeFileSync(join(moves, `${id}.yaml`), stringifyYaml({ id, description: "a fixture Move.",
    breaks: ["breaks if the point is dropped."], segments: [{ operation: "states the point once, plainly." }], takes: [], leaves: [] }));
}

// ---- the Brief: Leg s1 and Leg s2, each its relation's text and no Brief Waypoint (kogaki#1775) ----
const lessonCite = (slug) => `coding::lesson/${slug}@${"0".repeat(64)}`;
const leg = (id) => ({ leg_id: id, text: `The relation of ${id} holds.`, claims: [{ strand: "L1", proposition: "the fixture claim holds." }] });
const briefText = briefRecordText({
  slug: "site-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") }],
  thesis: "The fixture claim.",
  // No Reader start, Reader target or Obligations ledger, and no Leg state (kogaki#1699).
  reader_path: [leg("s1"), leg("s2")].map(legRecord),
  strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {},
});

// ---- the fake judge: it classifies the call, records it, and asks the scenario ----
const judge = join(root, "fake-judge.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", async () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const marker = "----- INPUT (JSON) -----\\n";
  const input = JSON.parse(prompt.slice(prompt.lastIndexOf(marker) + marker.length));
  const kind = input.leg_you_must_judge ? "judge" : input.paragraph_you_must_plan ? "site" : input.paragraphs_that_stand ? "suffix" : "plan";
  const legId = (input.leg_you_must_judge || input.paragraph_you_must_plan || input.leg_you_must_plan).leg_id;
  const counter = dir + "/n-" + kind + "-" + legId;
  const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
  writeFileSync(counter, String(n));
  const head = kind === "judge" ? "" : prompt.slice(0, prompt.lastIndexOf(marker));
  appendFileSync(dir + "/calls.jsonl", JSON.stringify({ kind, leg: legId, n, input, head }) + "\\n");
  const scenario = await import(pathToFileURL(process.env.PP_SCENARIO).href);
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify((scenario[kind] || scenario[kind + "Default"])(input, n, legId)) }) + "\\n");
});
`);
chmodSync(judge, 0o755);

// THE SCENARIO'S SHARED BUILDERS: one paragraph of the schema, tagged where it was rewritten,
// a Leg's record under its one Move, and a verdict record refusing the paragraphs `bad` names.
const BUILDERS = `
export const paragraph = (n, legId, { tag = "", rationale = null, move } = {}) => ({
  paragraph: n, ...(move !== undefined ? { move } : {}), materials: ["L1"], purpose: "brings the reader to point " + n + ".",
  depends_on: n > 1 ? [n - 1] : [], rationale: rationale || "its takes are met by what the paragraph before leaves.",
  "re-activate": [], ...(n > 1 ? { join: "consequence" } : {}),
  paragraph_waypoints: [{ point: "PW-" + legId + "-" + n + tag + " the paragraph makes its point.", serves: ["L1"], cast: {} }] });
export const legPlan = (legId, { move = "p1", count = legId === "s1" ? 2 : 1, tag = "" } = {}) => ({ version: "1", leg_id: legId, move,
  rationale: "the Move carries the relation.", paragraphs: Array.from({ length: count }, (_, i) => paragraph(i + 1, legId, { tag })) });
export const planDefault = (input) => legPlan(input.leg_you_must_plan.leg_id);
export const siteEntry = (input, opts = {}) => { const s = input.paragraph_you_must_plan; return paragraph(s.paragraph, s.leg_id, opts); };
export const verdicts = (input, bad) => { const l = input.leg_you_must_judge;
  return { version: "1", leg_id: l.leg_id, verdicts: l.paragraphs.map((p) => ({ paragraph: p.paragraph,
    verdict: bad(p.paragraph) ? "does-not-fit" : "fits", why: bad(p.paragraph) ? "REFUSED-AT-" + p.paragraph + " the paragraph misses its step." : "the paragraph performs its step." })) }; };
`;

function run(name, scenario, { settings = null } = {}) {
  const dir = join(root, name);
  const briefDir = join(dir, "theses", "site-brief");
  const runDir = join(dir, "run");
  mkdirSync(briefDir, { recursive: true });
  mkdirSync(runDir, { recursive: true });
  const scenarioPath = join(dir, "scenario.mjs");
  writeFileSync(scenarioPath, `${BUILDERS}\n${scenario}\n`);
  const briefPath = join(briefDir, "brief.yaml");
  writeFileSync(briefPath, briefText);
  const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, PP_FIXTURE_DIR: dir, PP_SCENARIO: scenarioPath };
  if (settings) {
    const doc = JSON.parse(readFileSync(process.env.KOGAKI_SETTINGS, "utf8"));
    doc.paragraph_plan = { ...doc.paragraph_plan, ...settings };
    writeFileSync(join(dir, "settings.json"), JSON.stringify(doc));
    env.KOGAKI_SETTINGS = join(dir, "settings.json");
  }
  const cli = (args) => spawnSync(process.execPath, [join(repo, "src", "paragraph-plan.mjs"), ...args, "--brief", briefPath,
    "--run-dir", runDir, "--moves-dir", moves], { cwd: repo, encoding: "utf8", env, timeout: 180000 });
  const started = cli(["start"]);
  let awaited = null;
  if (started.status === 0) {
    for (let i = 0; i < 6; i++) {
      awaited = cli(["await", "--wait-s", "25"]);
      if (!(awaited.stdout || "").includes(PARAGRAPH_PLAN_STILL_RUNNING_LINE)) break;
    }
  }
  const calls = existsSync(join(dir, "calls.jsonl"))
    ? readFileSync(join(dir, "calls.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const planPath = join(briefDir, PARAGRAPH_PLAN_FILE);
  const plan = existsSync(planPath) ? parseYaml(readFileSync(planPath, "utf8"), planPath) : null;
  const out = `${started.stdout}${started.stderr}${awaited ? awaited.stdout + awaited.stderr : ""}`;
  return { calls, plan, out, runDir, job: readReaderPathJob(runDir), of: (kind, l = "s1") => calls.filter((c) => c.kind === kind && c.leg === l) };
}
const pwOf = (plan, l, n) => (plan ? plan.legs.find((x) => x.leg_id === l).paragraphs[n - 1] : null);
const point = (e) => (e && e.paragraph_waypoints[0] ? e.paragraph_waypoints[0].point : "");
const phases = (r, unit = "leg-1") => callRows(callsRoot(r.runDir)).filter((x) => x.unit === unit).map((x) => readCallRecord(x.dir))
  .filter((x) => x.row).map((x) => x.row.phase);
const unit = (r, id) => r.job && r.job.units.find((u) => u.id === id);

// (s1) ONE SITE CALL UNDER THE LEG'S MOVE, THE REST STANDING, THE SITE AND THE NEXT JOIN RE-JUDGED.
{
  const r = run("s1", `export const site = (i) => siteEntry(i, { tag: "-site" });
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && n === 1 && w === 1);`);
  const sites = r.of("site");
  if (r.of("plan").length !== 1) fails.push(`(s1) Leg s1's Leg call was asked ${r.of("plan").length} times, not once`);
  const site1 = sites[0] && sites[0].input;
  if (sites.length !== 1 || site1.paragraph_you_must_plan.paragraph !== 1) fails.push(`(s1) not one site call at paragraph 1: ${JSON.stringify(sites.map((c) => c.input.paragraph_you_must_plan.paragraph))}`);
  if (!site1 || !site1.bound_move || site1.bound_move.id !== "p1" || "fixed" in site1) {
    fails.push(`(s1) the site call does not hold the Leg's Move: ${JSON.stringify(site1 && site1.bound_move)}`);
  }
  if (!site1 || !Array.isArray(site1.paragraph_you_must_plan.the_reader_has_been_told) || "stands_to_be_taken_up" in site1.paragraph_you_must_plan
    || "reader_state_before" in site1.paragraph_you_must_plan || !Array.isArray(site1.leaves_for_next_leg)) {
    fails.push(`(s1) the site call is not handed what the Legs before it state and the Leg's leaves_for_next_leg, with no reader state (kogaki#1777): ${JSON.stringify(site1 && site1.paragraph_you_must_plan)}`);
  }
  if (!site1 || !site1.refused_here.some((h) => h.refusal.includes("REFUSED-AT-1") && point(h.entry).startsWith("PW-s1-1 "))) {
    fails.push("(s1) the site call is not handed the refused paragraph beside the judge's sentence");
  }
  const judges = r.of("judge");
  const second = judges[1] && judges[1].input.leg_you_must_judge.paragraphs;
  if (judges.length !== 2 || !second || JSON.stringify(second.map((w) => w.paragraph)) !== "[1,2]"
    || second[0].judge_its_join_only || second[1].judge_its_join_only !== true || !Array.isArray(judges[1].input.standing_paragraphs)) {
    fails.push(`(s1) the second judgment is not paragraph 1 whole and paragraph 2's join alone beside the standing record: ${JSON.stringify(second)}`);
  }
  const told = r.of("plan", "s2")[0] && r.of("plan", "s2")[0].input.leg_you_must_plan.the_reader_has_been_told;
  if (JSON.stringify(told) !== JSON.stringify([{ leg_id: "s1", text: "The relation of s1 holds." }])
    || JSON.stringify(r.of("plan")[0].input.leg_you_must_plan.the_reader_has_been_told) !== "[]") {
    fails.push(`(s1) Leg s2 is not handed what Leg s1 states, derived from the Leg order (kogaki#1777): ${JSON.stringify(told)}`);
  }
  if (!r.plan) fails.push(`(s1) no ParagraphPlan file was written: ${r.out.slice(0, 600)}`);
  else if (!point(pwOf(r.plan, "s1", 1)).includes("PW-s1-1-site") || !point(pwOf(r.plan, "s1", 2)).startsWith("PW-s1-2 ")
    || r.plan.legs.find((x) => x.leg_id === "s1").move !== "p1") {
    fails.push(`(s1) the plan file does not carry the site's rewrite at paragraph 1 and the Leg call's paragraph 2 under p1: ${[1, 2].map((w) => point(pwOf(r.plan, "s1", w))).join(" / ")}`);
  }
}

// (s2) AN ANSWER REPEATING THE REFUSED PARAGRAPH IS REFUSED BEFORE THE JUDGE.
{
  const r = run("s2", `export const site = (i, n) => (n === 1 ? i.refused_here[0].entry : siteEntry(i, { tag: "-site" }));
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && n === 1 && w === 1);`);
  const sites = r.of("site");
  const want = `Leg s1, paragraph 1: ${siteRepeatRefusal(1)}`;
  if (siteRepeatRefusal(1) !== "the answer repeats the refused paragraph 1; the refusal asked for a change at that paragraph") {
    fails.push(`(s2) the repeat refusal does not read as the Issue states it: ${siteRepeatRefusal(1)}`);
  }
  if (sites.length !== 2 || !sites[1].input.refused_here.some((h) => h.refusal === want)) {
    fails.push(`(s2) the second site call is not handed the repeat refusal by name: ${JSON.stringify(sites.map((c) => c.input.refused_here.map((h) => h.refusal)))}`);
  }
  if (r.of("judge").length !== 2) fails.push(`(s2) the judge was called ${r.of("judge").length} times, not twice -- a repeat must reach no judge`);
  const row = unit(r, "leg-1");
  if (!row || row.status !== "done" || !(row.refusals || []).includes(want)) fails.push(`(s2) the unit row does not end done carrying the repeat refusal: ${JSON.stringify(row && { status: row.status, refusals: row.refusals })}`);
}

// (s4) THE SPENT SITE ENDS ITS LEG ALONE, NAMING THE PARAGRAPH.
{
  const r = run("s4", `export const site = (i) => i.refused_here[0].entry;
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && w === 1);`);
  const s1 = unit(r, "leg-1");
  const s2 = unit(r, "leg-2");
  const last = s1 && s1.refusals ? s1.refusals[s1.refusals.length - 1] : "";
  if (!s1 || s1.status !== "refused" || !/paragraph 1: its \d+ rounds are spent/.test(last) || !last.includes(siteRepeatRefusal(1))) {
    fails.push(`(s4) Leg s1 does not end refused naming paragraph 1 and its spent rounds: ${JSON.stringify(s1 && { status: s1.status, last })}`);
  }
  if (r.of("judge").length !== 1) fails.push(`(s4) the judge was called ${r.of("judge").length} times for Leg s1, not once -- a repeat reaches no judge`);
  if (!s2 || s2.status !== "done" || !s2.candidate) fails.push(`(s4) Leg s2 did not finish beside the refused Leg: ${JSON.stringify(s2 && s2.status)}`);
  // THE SITE LOOP'S REFUSAL IS PINNED TO THE CALL IT REFUSED (kogaki#1756): the first site call's Call Record.
  const siteRecords = callRows(callsRoot(r.runDir)).filter((x) => x.unit === "leg-1")
    .map((x) => readCallRecord(x.dir)).filter((x) => x.row && x.row.phase === "site");
  const pinned = siteRecords[0] && siteRecords[0].refusal;
  if (!pinned || !String(pinned.text).includes(siteRepeatRefusal(1)) || JSON.stringify(pinned.sites) !== "[1]") {
    fails.push(`(s4) the site call's Call Record does not hold the site loop's refusal at paragraph 1: ${JSON.stringify(pinned)}`);
  }
  if (!/Leg s1, paragraph 1\b/.test(r.out) || r.plan) fails.push(`(s4) the stop does not name Leg s1, paragraph 1, or a plan file was written: ${r.out.slice(0, 600)}`);
}

// (s5) THE LEG CEILING ENDS A LEG WHOSE SITES STILL HAVE ROUNDS.
{
  const r = run("s5", `export const site = (i, n) => siteEntry(i, { tag: "-site" + n });
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && w <= 2);`, { settings: { leg_revisions: 2 } });
  const s1 = unit(r, "leg-1");
  const last = s1 && s1.refusals ? s1.refusals[s1.refusals.length - 1] : "";
  if (r.of("site").length !== 2 || !s1 || s1.status !== "refused" || !last.includes("paragraph 1: the Leg's 2 site retries are spent")) {
    fails.push(`(s5) the Leg ceiling did not end Leg s1 after two site retries naming paragraph 1: ${r.of("site").length} site call(s), ${JSON.stringify(s1 && { status: s1.status, last })}`);
  }
}

// (s6) THE SITE LOOP IS THE PARAGRAPHPLAN JOB'S ALONE.
{
  const briefSrc = ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs")).map((f) => join("src/brief", f))]
    .map((p) => readFileSync(p, "utf8")).join("\n");
  if (/siteRetry|site_retry/.test(briefSrc)) fails.push("(s6) the Brief's runtime declares a site loop");
  const table = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));
  if (!table.job.site_retry || JSON.stringify(table.job.site_retry.leg_revisions) !== JSON.stringify({ setting: "paragraph_plan.leg_revisions" })) {
    fails.push("(s6) src/paragraph-plan-workflow.json's job does not declare `site_retry` reading `paragraph_plan.leg_revisions`");
  }
}

// (s7) THE PROSE FIELDS DESCRIBE THE PARAGRAPH, NEVER THE REPAIR (kogaki#1651).
{
  const r = run("s7", `export const site = (i, n) => siteEntry(i, { tag: "-site" + n, rationale: n === 1
  ? "The refusal named the shape of the Waypoints alone, so they are written again."
  : "its before holds where the \\\`point\\\` of the paragraph before leaves the reader." });
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && w === 1);`);
  const sites = r.of("site");
  const said = sites[1] ? sites[1].input.refused_here.map((h) => h.refusal) : [];
  if (sites.length !== 2 || !said.some((x) => x.startsWith("Leg s1, paragraph 1: the answer's `rationale` carries \"refusal\""))) {
    fails.push(`(s7) the second site call is not handed the refusal naming \`rationale\` and its word "refusal": ${JSON.stringify(said)}`);
  }
  const s1 = unit(r, "leg-1");
  if (!s1 || !(s1.refusals || []).some((x) => x.startsWith("Leg s1, paragraph 1: the answer's `rationale` carries `point`"))) {
    fails.push(`(s7) a backticked field name in \`rationale\` was not refused naming the field: ${JSON.stringify(s1 && s1.refusals)}`);
  }
  if (r.of("judge").length !== 1) fails.push(`(s7) the judge was called ${r.of("judge").length} times for Leg s1, not once -- a prose refusal reaches no judge`);
}

// (s8) A LEG ANSWER OVER brief.paragraphs_per_leg IS REFUSED NAMING THE LEG AND THE BOUND (kogaki#1777).
{
  const r = run("s8", `export const plan = (i, n) => legPlan(i.leg_you_must_plan.leg_id, { count: n === 1 && i.leg_you_must_plan.leg_id === "s1" ? 3 : 1 });
export const judge = (i) => verdicts(i, () => false);`);
  const s1 = unit(r, "leg-1");
  const said = (s1 && s1.refusals) || [];
  if (!said.some((x) => x.includes("Leg s1") && x.includes("3 paragraph") && x.includes("brief.paragraphs_per_leg") && x.includes("2"))) {
    fails.push(`(s8) a Leg of 3 paragraphs over the bound of 2 is not refused naming the Leg and brief.paragraphs_per_leg: ${JSON.stringify(said)}`);
  }
  if (r.of("plan").length !== 2 || r.of("judge").length !== 1) fails.push(`(s8) the over-bound Leg was not asked again before any judge: ${r.of("plan").length} plan call(s), ${r.of("judge").length} judgment(s)`);
  if (!r.plan || r.plan.legs.find((x) => x.leg_id === "s1").paragraphs.length !== 1) fails.push(`(s8) the plan file does not carry the Leg's second answer: ${r.out.slice(0, 600)}`);
}

// (s9) A RESTATEMENT UNDER A CHANGED SHAPE IS REFUSED BEFORE THE JUDGE (kogaki#1651).
{
  const r = run("s9", `export const site = (i, n) => { if (n > 1) return siteEntry(i, { tag: "-site" + n });
  const e = siteEntry(i, { rationale: "the paragraph begins where its neighbour leaves the reader." });
  return { ...e, paragraph_waypoints: e.paragraph_waypoints.map((p) => ({ performs: p.point })) }; };
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && n === 1 && w === 1);`);
  const sites = r.of("site");
  const want = `Leg s1, paragraph 1: ${siteRestatementRefusal(1, ["PW-s1-1 the paragraph makes its point."])}`;
  if (!want.includes('"PW-s1-1 the paragraph makes its point."')) fails.push(`(s9) the restatement refusal does not name the unchanged point: ${want}`);
  if (sites.length < 2 || !sites[1].input.refused_here.some((h) => h.refusal.split("\n").includes(want))) {
    fails.push(`(s9) the second site call is not handed the restatement refusal naming the points: ${JSON.stringify(sites.map((c) => c.input.refused_here.map((h) => h.refusal)))}`);
  }
  if (sites.length !== 2 || r.of("judge").length !== 2) fails.push(`(s9) the judge was called ${r.of("judge").length} times for Leg s1 over ${sites.length} site call(s), not twice over two -- a restatement reaches no judge`);
}

// (s10) A REFUSAL OF THE BINDING REOPENS THE WHOLE LEG; A REFUSAL OF THE POINTS HOLDS THE MOVE
// (kogaki#1647, kogaki#1777).
for (const [axis, whole] of [["TAKEN", true], ["LEFT", true], ["BREAKS", false]]) {
  const r = run(`s10-${axis.toLowerCase()}`, `export const site = (i, n) => siteEntry(i, { tag: "-site" + n });
export const plan = (i, n) => legPlan(i.leg_you_must_plan.leg_id, n === 1 ? {} : { move: "p2", tag: "-again" });
export const judge = (i, n, l) => { const v = verdicts(i, (w) => l === "s1" && n === 1 && w === 1);
  for (const x of v.verdicts) if (x.verdict === "does-not-fit") x.why = "${axis} fails at the paragraph's first point.";
  return v; };`);
  const s1 = r.plan && r.plan.legs.find((x) => x.leg_id === "s1");
  if (whole) {
    const again = r.of("plan")[1];
    if (r.of("site").length || r.of("plan").length !== 2 || !phases(r).includes("suffix") || !again || !again.head.includes(`${axis} fails`)) {
      fails.push(`(s10) a ${axis} refusal did not reopen Leg s1 whole through one suffix call handed the refusal: ${r.of("site").length} site, ${r.of("plan").length} plan call(s), phases ${JSON.stringify(phases(r))}`);
    }
    if (!s1 || s1.move !== "p2" || !point(s1.paragraphs[1]).includes("-again")) fails.push(`(s10) after a ${axis} refusal the plan file does not carry the Leg rebound to p2: ${JSON.stringify(s1)}`);
  } else if (r.of("site").length !== 1 || r.of("site")[0].input.bound_move.id !== "p1" || !s1 || s1.move !== "p1") {
    fails.push(`(s10) a ${axis} refusal was not repaired at its paragraph under the Leg's Move p1: ${r.of("site").length} site call(s), ${JSON.stringify(s1 && s1.move)}`);
  }
}

// (s11) A REWRITE THE JUDGE FORCED CARRIES ITS AXIS, AND THE RUN COUNTS IT (kogaki#1649).
{
  const r = run("s11", `export const site = (i) => siteEntry(i, { tag: "-site" });
export const judge = (i, n, l) => { const v = verdicts(i, (w) => l === "s1" && n === 1 && w === 1);
  for (const x of v.verdicts) if (x.verdict === "does-not-fit") x.why = "PERFORMS IS BARE fails: the performs line states the reading the reader then takes.";
  return v; };`);
  const marks = (l, w) => { const e = pwOf(r.plan, l, w); return e ? e.paragraph_waypoints.map((p) => p.forced_by || null) : []; };
  if (!r.plan) fails.push(`(s11) no ParagraphPlan file was written: ${r.out.slice(0, 600)}`);
  else {
    if (JSON.stringify(marks("s1", 1)) !== JSON.stringify([["PERFORMS IS BARE"]])) {
      fails.push(`(s11) the rewritten Waypoint at Leg s1, paragraph 1 does not carry forced_by [PERFORMS IS BARE]: ${JSON.stringify(marks("s1", 1))}`);
    }
    for (const [l, w] of [["s1", 2], ["s2", 1]]) {
      if (marks(l, w).some(Boolean)) fails.push(`(s11) Leg ${l}, paragraph ${w} passed on its first round and carries forced_by: ${JSON.stringify(marks(l, w))}`);
    }
    if (Object.hasOwn(r.plan.legs.find((x) => x.leg_id === "s1"), "move_forced_by")) fails.push("(s11) a site call that held the Move marks the Leg's move");
  }
  const donePath = join(root, "s11", "run", "paragraph-plan-done.json");
  const c = existsSync(donePath) ? JSON.parse(readFileSync(donePath, "utf8")).collisions : null;
  const row = c && c.rows.find((x) => x.axis === "PERFORMS IS BARE");
  if (!row || row.entries !== 1 || c.total !== 1 || c.rows.some((x) => x.axis !== "PERFORMS IS BARE" && x.entries !== 0)) {
    fails.push(`(s11) paragraph-plan-done.json does not count PERFORMS IS BARE at 1 and the total at 1: ${JSON.stringify(c)}`);
  }
}

// (s12) A REBIND THE JUDGE FORCED MARKS THE LEG'S MOVE WITH THE SAME AXES (kogaki#1649, kogaki#1777).
{
  const r = run("s12", `export const plan = (i, n) => legPlan(i.leg_you_must_plan.leg_id, n === 1 ? {} : { move: "p2", tag: "-again" });
export const judge = (i, n, l) => { const v = verdicts(i, (w) => l === "s2" && n === 1 && w === 1);
  for (const x of v.verdicts) if (x.verdict === "does-not-fit") x.why = "TAKEN fails: the bound Move takes up an answer the reader has not been told.";
  return v; };`);
  const l = r.plan && r.plan.legs.find((x) => x.leg_id === "s2");
  if (!l || l.move !== "p2" || JSON.stringify(l.move_forced_by) !== JSON.stringify(["TAKEN"])
    || JSON.stringify(l.paragraphs[0].paragraph_waypoints.map((p) => p.forced_by)) !== JSON.stringify([["TAKEN"]])) {
    fails.push(`(s12) the rebound Leg s2 does not carry move_forced_by and forced_by [TAKEN]: ${JSON.stringify(l) || r.out.slice(0, 600)}`);
  }
}

const repairCases = await imp("checks/fixtures/paragraph-plan-repair/cases.mjs"); // (s3), (s13)-(s14), (u), kogaki#1815
repairCases.repairHookCases(fails); repairCases.flpRepairCase(fails); await repairCases.siteRepairCases({ run, pwOf, point, fails });
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan-site-retry — a refusal naming a paragraph is retried there alone under the Leg's one Move, handed what the Legs before it state (kogaki#1777); a repeat, a site's own Move, prose naming the repair and a restated round are each refused by name before the judge (kogaki#1651); a site's rounds or the Leg ceiling end that Leg alone, naming the paragraph (kogaki#1642); a Leg over brief.paragraphs_per_leg is asked again whole; a TAKEN or LEFT refusal reopens the whole Leg and binds its Move again (kogaki#1647, kogaki#1777); a Waypoint the judge forced carries forced_by naming the axis, one passing first carries none, a forced rebind carries move_forced_by, and paragraph-plan-done.json counts the collisions per axis and in total (kogaki#1649); a refusal is read as classed Findings and a Repair naming its Arm and grounds is written before each retry, a shape Finding repaired by the program with no model call and modify_points keeping every point it does not name (kogaki#1815).");
JS
