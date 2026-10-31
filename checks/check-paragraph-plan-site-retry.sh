#!/usr/bin/env bash
# check-paragraph-plan-site-retry — a ParagraphPlan refusal that names a Leg Waypoint is
# retried at that Leg Waypoint alone (kogaki#1642, owner decision 2026-10-31).
#
# Each case runs `node src/paragraph-plan.mjs start|await` over a scratch Brief and Move
# library with a FAKE judge binary (`KOGAKI_JUDGE_CLI`) whose answers a scenario module
# scripts per call kind -- the Leg call, the site call, the suffix call and the judge:
#   (s1) a judge refusing Leg Waypoint 1 alone makes one site call there, holding its Move
#        and after-state, composes no other entry again, and re-judges Waypoint 1 and the
#        join of Waypoint 2 only;
#   (s2) a site answer repeating the refused entry is refused by name, spends the site's
#        attempt and makes no judge call;
#   (s3) a second site retry moving the after-state at Waypoint 2 recomposes Waypoint 3 from
#        the new state, leaves Waypoint 1 as it was, and still refuses a last entry whose
#        after-state is not the Leg's;
#   (s4) a `move: null` site retry is asked with the rejected Move named, an answer naming
#        only it is refused as a repeat, and the Leg ends refused naming the Leg and the
#        Waypoint once the site's attempts are spent while the other Leg finishes;
#   (s5) the Leg ceiling `paragraph_plan.leg_attempts` ends a Leg whose sites still have
#        attempts, naming the Waypoint;
#   (s6) only the ParagraphPlan job declares the site loop: the Brief's compose job does not.
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
const { legRecord, briefRecordText, readerStateMap } = await imp("src/compose.mjs");
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE, siteRepeatRefusal } = await imp("src/paragraph-plan.mjs");
const { readReaderPathJob } = await imp("src/workflow/detached-job.mjs");
const { stringifyYaml, parseYaml } = await imp("src/yaml.mjs");

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-site-"));
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
for (const id of ["p1", "p2"]) {
  writeFileSync(join(moves, `${id}.yaml`), stringifyYaml({ id, description: "a fixture Move.", before: { knowledge: "before." },
    after: { knowledge: "after." }, breaks: ["breaks if the point is dropped."], segments: [{ operation: "states the point once, plainly." }] }));
}

// ---- the Brief: Leg s1 of three Leg Waypoints, Leg s2 of one ----
const lessonCite = (slug) => `coding::lesson/${slug}@${"0".repeat(64)}`;
const leg = (id, n) => ({
  leg_id: id, move: "a_leg_move", purpose: `purpose of ${id}`, reader_state_after: `knowledge: after ${id}.`,
  materials: ["L1"], depends_on: [], rationale: `rationale for ${id}.`, claims: [{ strand: "L1", proposition: "the fixture claim holds." }],
  waypoints: Array.from({ length: n }, (_, i) => ({ point: `Point ${i + 1} of ${id} is made.`, serves: ["L1"] })),
});
const briefText = briefRecordText({
  slug: "site-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") }],
  thesis: "The fixture claim.",
  reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: "s2", reader_path: [leg("s1", 3), leg("s2", 1)].map(legRecord),
  strand_coverage: [], journey_coverage: [], obligations: [], tradeoffs: {}, bridged: {},
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
  const kind = input.leg_you_must_judge ? "judge" : input.leg_waypoint_you_must_plan ? "site" : input.paragraphs_that_stand ? "suffix" : "plan";
  const legId = (input.leg_you_must_judge || input.leg_waypoint_you_must_plan || input.leg_you_must_plan).leg_id;
  const counter = dir + "/n-" + kind + "-" + legId;
  const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
  writeFileSync(counter, String(n));
  const head = kind === "suffix" ? prompt.slice(0, prompt.lastIndexOf(marker)) : "";
  appendFileSync(dir + "/calls.jsonl", JSON.stringify({ kind, leg: legId, n, input, head }) + "\\n");
  const scenario = await import(pathToFileURL(process.env.PP_SCENARIO).href);
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(scenario[kind](input, n, legId)) }) + "\\n");
});
`);
chmodSync(judge, 0o755);

// THE SCENARIO'S SHARED BUILDERS: one entry of the paragraph schema, tagged where it was
// rewritten, and a verdict record refusing the Leg Waypoints `bad` names.
const BUILDERS = `
export const entry = (w, legId, total, legAfter, { move = "p1", tag = "", after = null, rationale = null } = {}) => ({
  waypoint: w, move, materials: ["L1"], purpose: "brings the reader to point " + w + ".",
  reader_state_after: w === total ? legAfter : after || { knowledge: "STATE-" + legId + "-" + w + " after." },
  depends_on: w > 1 ? [w - 1] : [], rationale: rationale || "its before holds the state the paragraph before leaves.",
  introduces: [], "re-activate": [], ...(w > 1 ? { join: "consequence" } : {}),
  paragraph_waypoints: move === null ? [] : [{ point: "PW-" + legId + "-" + w + tag + " the paragraph makes its point.", serves: ["L1"] }] });
export const plan = (input) => { const l = input.leg_you_must_plan;
  return { version: "1", leg_id: l.leg_id, waypoints: l.waypoints.map((w) => entry(w.waypoint, l.leg_id, l.waypoints.length, l.reader_state_after)) }; };
export const siteEntry = (input, opts = {}) => { const s = input.leg_waypoint_you_must_plan;
  return entry(s.waypoint, s.leg_id, s.waypoints_in_leg, s.reader_state_after, { ...(input.fixed || {}), ...opts }); };
export const verdicts = (input, bad) => { const l = input.leg_you_must_judge;
  return { version: "1", leg_id: l.leg_id, verdicts: l.waypoints.map((w) => ({ waypoint: w.waypoint,
    verdict: bad(w.waypoint) ? "does-not-fit" : "fits", why: bad(w.waypoint) ? "REFUSED-AT-" + w.waypoint + " the paragraph misses its step." : "the paragraph performs its step." })) }; };
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
    const doc = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
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
  return { calls, plan, out, job: readReaderPathJob(runDir), of: (kind, l = "s1") => calls.filter((c) => c.kind === kind && c.leg === l) };
}
const pwOf = (plan, l, w) => (plan ? plan.legs.find((x) => x.leg_id === l).waypoints[w - 1] : null);
const point = (e) => (e && e.paragraph_waypoints[0] ? e.paragraph_waypoints[0].point : "");

// (s1) ONE SITE CALL, THE REST STANDING, THE SITE AND THE NEXT JOIN RE-JUDGED.
{
  const r = run("s1", `export const site = (i) => siteEntry(i, { tag: "-site" });
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && n === 1 && w === 1);`);
  const sites = r.of("site");
  if (r.of("plan").length !== 1) fails.push(`(s1) Leg s1's Leg call was asked ${r.of("plan").length} times, not once`);
  if (sites.length !== 1 || sites[0].input.leg_waypoint_you_must_plan.waypoint !== 1) fails.push(`(s1) not one site call at Waypoint 1: ${JSON.stringify(sites.map((c) => c.input.leg_waypoint_you_must_plan.waypoint))}`);
  const fixed = sites[0] && sites[0].input.fixed;
  if (!fixed || fixed.move !== "p1" || JSON.stringify(fixed.reader_state_after) !== JSON.stringify({ knowledge: "STATE-s1-1 after." })) {
    fails.push(`(s1) the site call does not hold the refused entry's move and reader_state_after: ${JSON.stringify(fixed)}`);
  }
  if (!sites[0] || !sites[0].input.refused_here.some((h) => h.refusal.includes("REFUSED-AT-1") && point(h.entry).startsWith("PW-s1-1 "))) {
    fails.push("(s1) the site call is not handed the refused entry beside the judge's sentence");
  }
  const judges = r.of("judge");
  const second = judges[1] && judges[1].input.leg_you_must_judge.waypoints;
  if (judges.length !== 2 || !second || JSON.stringify(second.map((w) => w.waypoint)) !== "[1,2]"
    || second[0].judge_its_join_only || second[1].judge_its_join_only !== true || !Array.isArray(judges[1].input.standing_paragraphs)) {
    fails.push(`(s1) the second judgment is not Waypoint 1 whole and Waypoint 2's join alone beside the standing record: ${JSON.stringify(second)}`);
  }
  if (!r.plan) fails.push(`(s1) no ParagraphPlan file was written: ${r.out.slice(0, 600)}`);
  else if (!point(pwOf(r.plan, "s1", 1)).includes("PW-s1-1-site") || ![2, 3].every((w) => point(pwOf(r.plan, "s1", w)).startsWith(`PW-s1-${w} `))) {
    fails.push(`(s1) the plan file does not carry the site's rewrite at Waypoint 1 and the Leg call's entries elsewhere: ${[1, 2, 3].map((w) => point(pwOf(r.plan, "s1", w))).join(" / ")}`);
  }
}

// (s2) AN ANSWER REPEATING THE REFUSED ENTRY IS REFUSED BEFORE THE JUDGE.
{
  const r = run("s2", `export const site = (i, n) => (n === 1 ? i.refused_here[0].entry : siteEntry(i, { tag: "-site" }));
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && n === 1 && w === 1);`);
  const sites = r.of("site");
  const want = `Leg s1, Waypoint 1: ${siteRepeatRefusal(1)}`;
  if (siteRepeatRefusal(1) !== "the answer repeats the refused entry at Leg Waypoint 1; the refusal asked for a change at that site") {
    fails.push(`(s2) the repeat refusal does not read as the Issue states it: ${siteRepeatRefusal(1)}`);
  }
  if (sites.length !== 2 || !sites[1].input.refused_here.some((h) => h.refusal === want)) {
    fails.push(`(s2) the second site call is not handed the repeat refusal by name: ${JSON.stringify(sites.map((c) => c.input.refused_here.map((h) => h.refusal)))}`);
  }
  if (r.of("judge").length !== 2) fails.push(`(s2) the judge was called ${r.of("judge").length} times, not twice -- a repeat must reach no judge`);
  const row = r.job && r.job.units.find((u) => u.id === "leg-1");
  if (!row || row.status !== "done" || !(row.refusals || []).includes(want)) fails.push(`(s2) the unit row does not end done carrying the repeat refusal: ${JSON.stringify(row && { status: row.status, refusals: row.refusals })}`);
}

// (s3) A MOVED AFTER-STATE REOPENS THE ENTRIES AFTER IT, AND NONE BEFORE IT.
{
  const MOVED = { knowledge: "MOVED-STATE after." };
  const r = run("s3", `export const site = (i, n) => (n === 1 ? siteEntry(i, { tag: "-site1" }) : siteEntry(i, { move: "p2", tag: "-site2", after: ${JSON.stringify(MOVED)} }));
export const suffix = (i, n) => { const l = i.leg_you_must_plan; return { version: "1", leg_id: l.leg_id,
  waypoints: l.waypoints.map((w) => entry(w.waypoint, l.leg_id, 3, n === 1 ? { knowledge: "WRONG-END after." } : l.reader_state_after, { tag: "-suffix" + n })) }; };
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && n <= 2 && w === 2);`);
  const suffixes = r.of("suffix");
  const first = suffixes[0] && suffixes[0].input;
  if (suffixes.length !== 2 || JSON.stringify(first.leg_you_must_plan.reader_state_before) !== JSON.stringify(MOVED)
    || JSON.stringify(first.leg_you_must_plan.waypoints.map((w) => w.waypoint)) !== "[3]") {
    fails.push(`(s3) the entries after Waypoint 2 were not composed again from the moved state: ${JSON.stringify(first && first.leg_you_must_plan)}`);
  }
  if (!first || first.paragraphs_that_stand.length !== 2 || !point(first.paragraphs_that_stand[0]).startsWith("PW-s1-1 ")) {
    fails.push("(s3) the suffix call is not handed Waypoint 1 as the Leg call wrote it and the moved Waypoint 2");
  }
  if (!suffixes[1] || !suffixes[1].head.includes("is not the Leg's, line for line") || !suffixes[1].head.includes("WRONG-END")) {
    fails.push("(s3) a suffix whose last after-state is not the Leg's was not refused and asked again with the refused answer and its refusal above the input");
  }
  const judges = r.of("judge");
  const last = judges[judges.length - 1];
  if (!last || JSON.stringify(last.input.leg_you_must_judge.waypoints.map((w) => w.waypoint)) !== "[2,3]") {
    fails.push(`(s3) the last judgment is not Waypoints 2 and 3: ${JSON.stringify(last && last.input.leg_you_must_judge.waypoints.map((w) => w.waypoint))}`);
  }
  if (!r.plan) fails.push(`(s3) no ParagraphPlan file was written: ${r.out.slice(0, 600)}`);
  else {
    const [e1, e2, e3] = [1, 2, 3].map((w) => pwOf(r.plan, "s1", w));
    if (!point(e1).startsWith("PW-s1-1 ") || e2.move !== "p2" || JSON.stringify(e2.reader_state_after) !== JSON.stringify(MOVED)
      || !point(e3).includes("-suffix2") || JSON.stringify(e3.reader_state_after) !== JSON.stringify({ knowledge: "after s1." })) {
      fails.push(`(s3) the plan file is not Waypoint 1 unchanged, Waypoint 2 rebound and Waypoint 3 recomposed to the Leg's end: ${JSON.stringify([e1, e2, e3])}`);
    }
  }
}

// (s4) A NULL NAMING ONLY A REJECTED MOVE IS A REPEAT; THE SPENT SITE ENDS ITS LEG ALONE.
{
  const r = run("s4", `export const site = (i, n) => (n === 1 ? siteEntry(i, { tag: "-site1" })
  : siteEntry(i, { move: null, rationale: "NULL-SENTENCE p1 cannot hold the state this paragraph begins in." }));
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && w === 1);`);
  const sites = r.of("site");
  if (sites.length !== 2 || JSON.stringify(sites[1].input.moves_rejected_here) !== JSON.stringify(["p1"])) {
    fails.push(`(s4) the second site call is not handed the Move rejected at the site: ${JSON.stringify(sites.map((c) => c.input.moves_rejected_here))}`);
  }
  if (r.of("judge").length !== 2) fails.push(`(s4) the judge was called ${r.of("judge").length} times for Leg s1, not twice -- the null repeat must reach no judge`);
  const units = (r.job && r.job.units) || [];
  const s1 = units.find((u) => u.id === "leg-1");
  const s2 = units.find((u) => u.id === "leg-2");
  const last = s1 && s1.refusals ? s1.refusals[s1.refusals.length - 1] : "";
  if (!s1 || s1.status !== "refused" || !last.includes("Waypoint 1: its 3 attempts are spent") || !last.includes(siteRepeatRefusal(1))) {
    fails.push(`(s4) Leg s1 does not end refused naming Waypoint 1 and its spent attempts: ${JSON.stringify(s1 && { status: s1.status, last })}`);
  }
  if (!s2 || s2.status !== "done" || !s2.candidate) fails.push(`(s4) Leg s2 did not finish beside the refused Leg: ${JSON.stringify(s2 && s2.status)}`);
  if (!/Leg s1, Waypoint 1\b/.test(r.out) || r.plan) fails.push(`(s4) the stop does not name Leg s1, Waypoint 1, or a plan file was written: ${r.out.slice(0, 600)}`);
}

// (s5) THE LEG CEILING ENDS A LEG WHOSE SITES STILL HAVE ATTEMPTS.
{
  const r = run("s5", `export const site = (i, n) => siteEntry(i, { tag: "-site" + n });
export const judge = (i, n, l) => verdicts(i, (w) => l === "s1" && w <= 2);`, { settings: { leg_attempts: 2 } });
  const s1 = r.job && r.job.units.find((u) => u.id === "leg-1");
  const last = s1 && s1.refusals ? s1.refusals[s1.refusals.length - 1] : "";
  if (r.of("site").length !== 2 || !s1 || s1.status !== "refused" || !last.includes("Waypoint 1: the Leg's 2 site retries are spent")) {
    fails.push(`(s5) the Leg ceiling did not end Leg s1 after two site retries naming Waypoint 1: ${r.of("site").length} site call(s), ${JSON.stringify(s1 && { status: s1.status, last })}`);
  }
}

// (s6) THE SITE LOOP IS THE PARAGRAPHPLAN JOB'S ALONE.
{
  const briefSrc = ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs")).map((f) => join("src/brief", f))]
    .map((p) => readFileSync(p, "utf8")).join("\n");
  if (/siteRetry|site_retry/.test(briefSrc)) fails.push("(s6) the Brief's runtime declares a site loop");
  const table = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));
  if (!table.job.site_retry || JSON.stringify(table.job.site_retry.leg_attempts) !== JSON.stringify({ setting: "paragraph_plan.leg_attempts" })) {
    fails.push("(s6) src/paragraph-plan-workflow.json's job does not declare `site_retry` reading `paragraph_plan.leg_attempts`");
  }
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan-site-retry — a refusal naming a Leg Waypoint is retried there alone, holding its Move and after-state first; a repeat is refused before the judge; a moved after-state recomposes only the entries after it; a null naming only rejected Moves is a repeat; a site's attempts or the Leg ceiling end that Leg alone, naming the Waypoint (kogaki#1642).");
JS
