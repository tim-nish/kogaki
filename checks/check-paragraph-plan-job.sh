#!/usr/bin/env bash
# check-paragraph-plan-job — a ParagraphPlan job keeps every finished Leg
# (kogaki#1641, owner decision 2026-10-31): a Leg's death or refusal ends that
# Leg alone, and a resume plans only the Legs the latest run of the same Brief
# did not finish.
#

# WHAT THIS COVERS, each driven end to end through `node src/paragraph-plan.mjs
# start|await` over a real Brief record of three one-Waypoint Legs, a scratch
# Move library and a FAKE judge binary this member writes (`KOGAKI_JUDGE_CLI`)
# whose behaviour per Leg is read from a mode file -- never the actual `claude`
# CLI:

#   (a) a job in which one Leg's plan call exits non-zero ends with that unit
#       `died`, its two siblings `done` on their own merits, no unit `killed`,
#       the job state `died` (reduced from the finished units under the job
#       table's `unit_isolation`), the record's failure block naming the two
#       kept candidates, and no plan file; the stop lines name the kept Legs
#       and the Leg the next run plans.

#   (b) a job in which one Leg is refused on every attempt ends with that unit
#       `refused` after `brief.unit_attempts`, the others `done`, and each
#       `done` unit's candidate and verdict files in the run directory.

#   (c) `start` on the same Brief after (b), the earlier run handed in as
#       `--prior-run`, spawns one unit (the refused Leg's two calls are the
#       only prompts), carries the other two Legs with `carried_from` naming
#       the earlier run on the job record and the start record, and on that
#       Leg finishing writes the plan file with every Leg.

#   (d) `start` on a Brief whose content hash differs from the prior run's
#       carries nothing and spawns every Leg; (d2) a prior run whose plan file
#       was already written carries nothing either.
#

# NOT COVERED, stated rather than implied: the retry inside a Leg -- which Leg
# Waypoint is re-planned, and the refusal of an identical attempt -- is its own
# Issue. The Brief's compose job keeps kogaki#1273's sibling kill, asserted by
# checks/check-brief-job-retry.sh (v4). The plan file's shape is
# checks/check-paragraph-plan.sh's.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// A HANDED-IN HEARTBEAT (kogaki#1424): every fixture job runs at 100 ms, the table untouched.
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE } = await import(pathToFileURL(join(repo, "src", "paragraph-plan.mjs")).href);
const { stringifyYaml, parseYaml } = await import(pathToFileURL(join(repo, "src", "yaml.mjs")).href);
const { readReaderPathJob } = await import(pathToFileURL(join(repo, "src", "workflow", "detached-job.mjs")).href);
const table = JSON.parse(readFileSync(join(repo, "src", "paragraph-plan-workflow.json"), "utf8"));
if (table.job.unit_isolation !== true) fails.push("the ParagraphPlan job table does not set `unit_isolation: true`");
const settings = JSON.parse(readFileSync(join(repo, "kogaki.settings.json"), "utf8"));
const UNIT_ATTEMPTS = settings.brief.unit_attempts;

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-job-"));

// ---- the Move library: one whole paragraph Move ----
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
writeFileSync(join(moves, "p1.yaml"), stringifyYaml({ id: "p1", description: "a fixture Move.",
  before: { knowledge: "before." }, after: { knowledge: "after." },
  breaks: ["breaks if the point is dropped."], segments: [{ operation: "states the point once, plainly." }] }));

// ---- the Brief: three Legs, one Leg Waypoint each ----
const lessonCite = (slug) => `coding::lesson/${slug}@${"0".repeat(64)}`;
const leg = (id, point) => ({
  leg_id: id, move: "a_leg_move", purpose: `purpose of ${id}`, reader_state_after: `knowledge: after ${id}.`,
  materials: ["L1"], depends_on: [], rationale: `rationale for ${id}.`,
  claims: [{ strand: "L1", proposition: "the installer copies the kit into the consumer's tree." }],
  waypoints: [{ point, serves: ["L1"] }],
});
const legs = [
  leg("s1", "The installer writes into a tree the consumer thought was theirs alone."),
  leg("s2", "The next run overwrites any edit made to the copy."),
  leg("s3", "The copy is the installer's, not the consumer's."),
];
const briefText = (thesis) => briefRecordText({
  slug: "job-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") }],
  thesis,
  reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: "s3",
  reader_path: legs.map(legRecord),
  strand_coverage: [], journey_coverage: [], obligations: [], tradeoffs: {}, bridged: {},
});

// ---- the fake judge: per-Leg behaviour read from the mode file -- `ok`, `die`, `refuse` ----
const judge = join(root, "fake-judge.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, readFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const modes = JSON.parse(readFileSync(dir + "/mode", "utf8"));
  const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    appendFileSync(dir + "/prompts.jsonl", JSON.stringify({ call: "judge", leg: leg.leg_id }) + "\\n");
    const refuse = modes[leg.leg_id] === "refuse";
    out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint,
      verdict: refuse ? "does-not-fit" : "fits",
      why: refuse ? "JUDGE-SENTENCE Waypoint 1 never reaches the after state." : "they begin at before and end at after." })) });
  }
  // A site retry (kogaki#1642) answers with the refused entry, its Paragraph Waypoint rewritten.
  if (prompt.includes('"leg_waypoint_you_must_plan"')) {
    const site = body("leg_waypoint_you_must_plan"), e = site.refused_here[site.refused_here.length - 1].entry;
    appendFileSync(dir + "/prompts.jsonl", JSON.stringify({ call: "plan", leg: site.leg_waypoint_you_must_plan.leg_id }) + "\\n");
    out({ ...e, paragraph_waypoints: [{ point: "PW-" + site.leg_waypoint_you_must_plan.leg_id + " rewritten " + site.refused_here.length + ".", serves: [...e.paragraph_waypoints[0].serves] }] });
  }
  const leg = body("leg_you_must_plan").leg_you_must_plan;
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify({ call: "plan", leg: leg.leg_id }) + "\\n");
  if (modes[leg.leg_id] === "die") { process.stderr.write("DIED-SENTENCE the planner binary is gone\\n"); process.exit(3); }
  out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: "p1",
    materials: [...w.serves], purpose: "PURPOSE-" + leg.leg_id + " brings the reader to the point.",
    reader_state_after: leg.reader_state_after, depends_on: [], rationale: "its before holds the state and its after reaches the next point.",
    introduces: [], "re-activate": [],
    paragraph_waypoints: [{ point: "PW-" + leg.leg_id + " the paragraph establishes its point.", serves: [...w.serves] }] })) });
});
`);
chmodSync(judge, 0o755);

// One stage run: a fresh run directory, the Brief as given, the judge's per-Leg modes, and
// the prior run handed to `start` (an empty string carries nothing).
function runStage(name, modes, { thesis = "The fixture claim.", priorRun = "", briefDir = null } = {}) {
  const dir = join(root, name);
  const runDir = join(dir, "run");
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(dir, "mode"), JSON.stringify(modes));
  const bDir = briefDir || join(dir, "theses", "job-brief");
  mkdirSync(bDir, { recursive: true });
  const briefPath = join(bDir, "brief.yaml");
  writeFileSync(briefPath, briefText(thesis));
  const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, PP_FIXTURE_DIR: dir };
  const cli = (args) => spawnSync(process.execPath, [join(repo, "src", "paragraph-plan.mjs"), ...args, "--brief", briefPath,
    "--run-dir", runDir, "--moves-dir", moves, "--prior-run", priorRun], { cwd: repo, encoding: "utf8", env, timeout: 180000 });
  const started = cli(["start"]);
  let awaited = null;
  if (started.status === 0) {
    for (let i = 0; i < 6; i++) {
      awaited = cli(["await", "--wait-s", "25"]);
      if (!(awaited.stdout || "").includes(PARAGRAPH_PLAN_STILL_RUNNING_LINE)) break;
    }
  }
  const prompts = existsSync(join(dir, "prompts.jsonl"))
    ? readFileSync(join(dir, "prompts.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const out = `${(started.stdout || "") + (started.stderr || "")}${awaited ? (awaited.stdout || "") + (awaited.stderr || "") : ""}`;
  return { dir, briefDir: bDir, briefPath, runDir, started, awaited, prompts, out, job: readReaderPathJob(runDir),
    start: existsSync(join(runDir, "paragraph-plan-start.json")) ? JSON.parse(readFileSync(join(runDir, "paragraph-plan-start.json"), "utf8")) : null,
    planPath: join(bDir, PARAGRAPH_PLAN_FILE) };
}
const unit = (job, id) => (job && job.units || []).find((u) => u.id === id);
const stopped = (tag, r) => {
  if (r.started.status !== 0) fails.push(`${tag} start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status === 0) fails.push(`${tag} the stage was not stopped: ${r.out.slice(0, 600)}`);
  if (existsSync(r.planPath)) fails.push(`${tag} a ParagraphPlan file was written for a stopped job`);
};

// (a) ONE LEG DIES; ITS SIBLINGS FINISH AND ARE KEPT.
{
  const r = runStage("die", { s1: "ok", s2: "die", s3: "ok" });
  stopped("(a)", r);
  const j = r.job || {};
  if (j.state !== "died") fails.push(`(a) the job did not end died: ${j.state}`);
  if (j.unit_isolation !== true) fails.push("(a) the job record does not carry `unit_isolation: true`");
  if (!unit(j, "leg-2") || unit(j, "leg-2").status !== "died") fails.push(`(a) the dying Leg's unit is not died: ${JSON.stringify(unit(j, "leg-2") && unit(j, "leg-2").status)}`);
  for (const id of ["leg-1", "leg-3"]) {
    const u = unit(j, id);
    if (!u || u.status !== "done") fails.push(`(a) a sibling of the died unit is not done on its own merits: ${id} ${JSON.stringify(u && u.status)}`);
    if (!u || !u.candidate_file || !existsSync(u.candidate_file)) fails.push(`(a) ${id}'s candidate file is not in the run directory`);
  }
  if ((j.units || []).some((u) => u.status === "killed")) fails.push("(a) a unit was killed on the tick the job ended died");
  const kept = ((j.failure || {}).kept_candidates || []).map((k) => k.id).sort();
  if (JSON.stringify(kept) !== JSON.stringify(["leg-1", "leg-3"])) fails.push(`(a) the failure block does not name the two kept candidates: ${JSON.stringify(kept)}`);
  if (!/Kept: Leg s1, s3 finished and are kept in the run directory/.test(r.out)) fails.push(`(a) the stop lines do not name the kept Legs: ${r.out.slice(0, 600)}`);
  if (!/Leg s2, Waypoint 1: died after 1 attempt\(s\)/.test(r.out)) fails.push(`(a) the stop lines do not name the died Leg: ${r.out.slice(0, 600)}`);
  if (!/Next: run \/paragraph-plan on the same Brief again; it plans Leg s2 only and carries the kept Legs/.test(r.out)) fails.push(`(a) the stop lines do not say the next run plans s2 only: ${r.out.slice(0, 600)}`);
}

// (b) ONE LEG IS REFUSED ON EVERY ATTEMPT; THE OTHERS' FILES ARE KEPT.
let refusedRun = null;
{
  const r = runStage("refuse", { s1: "ok", s2: "refuse", s3: "ok" });
  refusedRun = r;
  stopped("(b)", r);
  const j = r.job || {};
  if (j.state !== "refused") fails.push(`(b) the job did not end refused: ${j.state}`);
  const u2 = unit(j, "leg-2");
  if (!u2 || u2.status !== "refused" || u2.attempts !== UNIT_ATTEMPTS) fails.push(`(b) the refused Leg's unit is not refused after ${UNIT_ATTEMPTS} attempts: ${JSON.stringify(u2 && [u2.status, u2.attempts])}`);
  for (const id of ["leg-1", "leg-3"]) {
    const u = unit(j, id);
    if (!u || u.status !== "done") { fails.push(`(b) ${id} is not done: ${JSON.stringify(u && u.status)}`); continue; }
    if (!u.candidate_file || !existsSync(u.candidate_file)) fails.push(`(b) ${id}'s candidate file is not in the run directory`);
    if (!u.specialization_file || !existsSync(u.specialization_file)) fails.push(`(b) ${id}'s verdict file is not in the run directory`);
  }
}

// (c) THE RESUME PLANS THE REFUSED LEG ONLY, CARRIES THE OTHERS, AND WRITES THE FILE WHOLE.
let resumedRun = null;
if (refusedRun && refusedRun.job && refusedRun.job.state === "refused") {
  const r = runStage("resume", { s1: "ok", s2: "ok", s3: "ok" }, { priorRun: refusedRun.runDir });
  resumedRun = r;
  if (r.started.status !== 0) fails.push(`(c) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(c) await did not finish the job: ${r.out.slice(0, 600)}`);
  const calls = r.prompts.map((p) => `${p.call}:${p.leg}`).sort();
  if (JSON.stringify(calls) !== JSON.stringify(["judge:s2", "plan:s2"])) fails.push(`(c) the resume did not spawn the unfinished Leg alone: ${JSON.stringify(calls)}`);
  const j = r.job || {};
  for (const id of ["leg-1", "leg-3"]) {
    const u = unit(j, id);
    if (!u || u.status !== "done" || u.carried_from !== refusedRun.runDir) fails.push(`(c) ${id} is not carried from the earlier run: ${JSON.stringify(u && [u.status, u.carried_from])}`);
    if (!u || !u.candidate_file || !u.candidate_file.startsWith(r.runDir) || !existsSync(u.candidate_file)) fails.push(`(c) ${id}'s candidate file was not copied into the new run directory`);
  }
  const u2 = unit(j, "leg-2");
  if (!u2 || u2.status !== "done" || u2.carried_from) fails.push(`(c) the unfinished Leg was not planned afresh: ${JSON.stringify(u2 && [u2.status, u2.carried_from])}`);
  const carried = ((r.start || {}).carried || []).map((c) => `${c.unit}:${c.leg_id}:${c.from}`).sort();
  if (JSON.stringify(carried) !== JSON.stringify([`leg-1:s1:${refusedRun.runDir}`, `leg-3:s3:${refusedRun.runDir}`])) fails.push(`(c) the start record does not name the carried Legs: ${JSON.stringify(carried)}`);
  if (!existsSync(r.planPath)) fails.push("(c) no ParagraphPlan file was written beside the Brief");
  else {
    const rec = parseYaml(readFileSync(r.planPath, "utf8"), r.planPath);
    const ids = rec.legs.map((l) => l.leg_id);
    if (JSON.stringify(ids) !== JSON.stringify(["s1", "s2", "s3"])) fails.push(`(c) the plan file does not carry every Leg in order: ${JSON.stringify(ids)}`);
    for (const l of rec.legs) if (!JSON.stringify(l).includes(`PW-${l.leg_id}`)) fails.push(`(c) the plan file lacks the Paragraph Waypoint of ${l.leg_id}`);
  }
} else fails.push("(c) not run: (b) left no refused job to resume from");

// (d) A DIFFERENT BRIEF CARRIES NOTHING.
if (refusedRun) {
  const r = runStage("changed", { s1: "ok", s2: "ok", s3: "ok" }, { priorRun: refusedRun.runDir, thesis: "The fixture claim, restated." });
  if (r.started.status !== 0) fails.push(`(d) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  const calls = r.prompts.map((p) => `${p.call}:${p.leg}`).sort();
  if (calls.length !== 6) fails.push(`(d) a run over a changed Brief did not spawn every Leg: ${JSON.stringify(calls)}`);
  if ((r.job && r.job.units || []).some((u) => u.carried_from) || (r.start || {}).carried) fails.push("(d) a run over a changed Brief carried a Leg");
  if (!existsSync(r.planPath)) fails.push(`(d) no ParagraphPlan file was written: ${r.out.slice(0, 400)}`);
}
// (d2) A PRIOR RUN WHOSE PLAN FILE WAS WRITTEN CARRIES NOTHING.
if (resumedRun && existsSync(resumedRun.planPath)) {
  const r = runStage("after-done", { s1: "ok", s2: "ok", s3: "ok" }, { priorRun: resumedRun.runDir });
  const calls = r.prompts.map((p) => `${p.call}:${p.leg}`).sort();
  if (calls.length !== 6) fails.push(`(d2) a run after a written plan did not spawn every Leg: ${JSON.stringify(calls)}`);
  if ((r.job && r.job.units || []).some((u) => u.carried_from)) fails.push("(d2) a run after a written plan carried a Leg");
}

if (fails.length) { for (const f of fails) console.error(`FAIL ${f}`); process.exit(1); }
console.log("check-paragraph-plan-job: ok");
JS
