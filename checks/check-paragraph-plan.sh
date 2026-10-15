#!/usr/bin/env bash
# check-paragraph-plan — the ParagraphPlan stage generates every Leg Waypoint's
# Paragraph Waypoints after the Brief, and no Move information leaves it
# (kogaki#1375, owner decision 2026-10-14).
#
# WHAT THIS COVERS, each driven end to end through `node src/paragraph-plan.mjs
# start|await` over a real Brief record, a scratch Move library and a FAKE judge
# binary this member writes (`KOGAKI_JUDGE_CLI`) — never the actual `claude` CLI:
#   (a) a job whose every Leg binds a Move and is judged `fits` writes
#       `paragraph-plan.yaml` beside the Brief, naming the Brief by path and
#       content hash, holding `point` and `serves` per Paragraph Waypoint and
#       NOTHING OF A MOVE — no id, no Segment, no field; the Brief is
#       byte-for-byte unchanged; which Move was bound stays in the run
#       directory's `paragraph-plan-bindings.json`. A `does-not-fit` from the
#       judge on a first attempt is put verbatim into the second attempt's
#       prompt; the plan call is handed the Move's `segments` and `breaks`
#       beside the Leg Waypoint's own `point`, `serves` and `next_point` and
#       the persona, and NO Claim proposition (kogaki#1382); the judge call
#       is handed all five roles -- `before`, `after`, `technique`, `breaks`
#       and `segments` (kogaki#1378).
#   (b) a Leg Waypoint no Move fits (`move: null`) refuses the unit
#       `no_paragraph_move_fits` and is asked again until `brief.unit_attempts`
#       is spent; the stage then stops naming the Leg and the Waypoint, writes
#       no ParagraphPlan file, and leaves the Brief unchanged.
#   (c) a bound Move that fills neither `segments` nor `technique` stops the
#       stage naming the Move and the role; nothing is defaulted and no
#       ParagraphPlan file is written.
#   (d) `start` refuses a Brief whose Leg Waypoint carries `move` or `segments`,
#       by name.
#   (e) every Harness path and subcommand `.claude/skills/paragraph-plan/SKILL.md`
#       names exists — the criterion on which the skill file is tracked.
#   (f) a bound Move carrying `technique` and no `segments` plans and judges
#       the same as one carrying `segments` -- the fallback kogaki#1378 gives
#       the Leg composer's own rule (§4.1), never a stop.
#   (g) a bound Move carrying three `segments` yields a plan record with
#       three Paragraph Waypoints under its Leg Waypoint, and the rendered
#       Packet carries the three indented lines under the one point, under the
#       revised header (kogaki#1381).
#
# NOT COVERED, stated rather than implied: the `--tools ""` minimal environment
# and the call-limit stop are the shared supervisor's, held by
# checks/check-brief-reader-path-job.sh. /draft's read of the file beside the
# Brief — and its refusal of a missing one or one made from another Brief — is
# checks/check-draft-packet.sh's. Whether the Paragraph Waypoints a live model
# writes are any good is the judge call's judgment, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE, NO_PARAGRAPH_MOVE_FITS } =
  await import(pathToFileURL(join(repo, "src", "paragraph-plan.mjs")).href);
const { parseYaml } = await import(pathToFileURL(join(repo, "src", "yaml.mjs")).href);
const { waypointLines } = await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-"));

// ---- the Move library: one whole paragraph Move, one missing `segments` ----
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
const PSEG = "1. settles — elaboration — makes the point.";
writeFileSync(join(moves, "p1.md"), ["id: p1", "technique: >-", "  makes one point and holds it.", "before: >-", "  knowledge: before.",
  "after: >-", "  knowledge: after.", "breaks: >-", "  breaks if the point is dropped.", "segments: |-", `  ${PSEG}`, ""].join("\n"));
writeFileSync(join(moves, "p2.md"), ["id: p2", "technique: >-", "  names a case and leaves it.", "before: >-", "  knowledge: before.",
  "after: >-", "  knowledge: after.", "breaks: >-", "  breaks if the case is never named.", ""].join("\n"));
const PSEG3 = ["1. opens — contrast — sets up the point.", "2. settles — elaboration — makes the point.",
  "3. closes — consequence — leaves the point."];
writeFileSync(join(moves, "p4.md"), ["id: p4", "technique: >-", "  should not be read -- segments present.", "before: >-",
  "  knowledge: before.", "after: >-", "  knowledge: after.", "breaks: >-", "  breaks if a segment is dropped.",
  "segments: |-", ...PSEG3.map((s) => `  ${s}`), ""].join("\n"));

// ---- an isolated Move library for (c): its own ROLES.json leaves `specialized-by-the-Leg`
// unmapped, the way `segments` already goes unmapped where a schema has nothing for it, so a
// Move record here may fill neither `segments` nor `technique` without moveContract() itself
// refusing before boundMoveContract()'s own check can run.
const movesNoOrder = join(root, "moves-c");
mkdirSync(movesNoOrder);
const rolesNoTechnique = JSON.parse(readFileSync("moves/ROLES.json", "utf8"));
rolesNoTechnique.optional["specialized-by-the-Leg"] = null;
writeFileSync(join(movesNoOrder, "ROLES.json"), JSON.stringify(rolesNoTechnique, null, 2));
writeFileSync(join(movesNoOrder, "p3.md"), ["id: p3", "before: >-", "  knowledge: before.", "after: >-", "  knowledge: after.",
  "breaks: >-", "  breaks if the point is dropped.", ""].join("\n"));

// ---- the Brief: two Legs, three Leg Waypoints ----
const C1 = "the installer copies the kit into the consumer's tree.";
const C2 = "a second run refreshes the copy and its stamp.";
const lessonCite = (slug) => `coding::lesson/${slug}@${"0".repeat(64)}`;
const leg = (id, claims, waypoints) => ({
  leg_id: id, move: "a_leg_move", purpose: `purpose of ${id}`, reader_state_after: `knowledge: after ${id}.`,
  materials: ["L1", "L2"], depends_on: [], rationale: `rationale for ${id}.`, claims, waypoints,
});
const legs = [
  leg("s1", [{ strand: "L1", proposition: C1 }, { strand: "L2", proposition: C2 }], [
    { point: "The installer writes into a tree the consumer thought was theirs alone.", serves: ["L1"] },
    { point: "The next run overwrites any edit made to the copy.", serves: ["L1", "L2"] }]),
  leg("s2", [{ strand: "L2", proposition: C2 }], [{ point: "The copy is the installer's, not the consumer's.", serves: ["L2"] }]),
];
const briefText = (ls) => briefRecordText({
  slug: "plan-brief", compose_path: "audiences/dev-to-zenn.md", external_authority: "on",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") },
    { id: "L2", slug: "second-strand", cite: lessonCite("second-strand") }],
  thesis: "The fixture claim.",
  reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: ls[ls.length - 1].leg_id,
  reader_path: ls.map(legRecord),
  strand_coverage: [], journey_coverage: [], closure: [], tradeoffs: {}, bridged: {},
});

// ---- the fake judge: its behaviour is read from a mode file per run ----
const judge = join(root, "fake-judge.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const mode = readFileSync(dir + "/mode", "utf8").trim();
  const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    const counter = dir + "/judge-" + leg.leg_id;
    const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
    writeFileSync(counter, String(n));
    const refuse = mode === "ok" && leg.leg_id === "s2" && n === 1;
    out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint,
      verdict: refuse ? "does-not-fit" : "fits",
      why: refuse ? "JUDGE-SENTENCE the first paragraph waypoint never reaches the after state." : "they begin at before and end at after." })) });
  }
  const leg = body("leg_you_must_plan").leg_you_must_plan;
  out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => {
    const nofit = mode === "nofit" && leg.leg_id === "s1" && w.waypoint === 2;
    const move = nofit ? null : mode === "broken" ? "p3" : mode === "technique" ? "p2" : mode === "segments3" ? "p4" : "p1";
    const pw = (n) => ({ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-" + n + " the paragraph establishes its point.", serves: [...w.serves] });
    return { waypoint: w.waypoint, move,
      why: nofit ? "NOFIT-SENTENCE no paragraph Move's before holds this state." : "its before holds the state and its after reaches the next point.",
      paragraph_waypoints: nofit ? [] : mode === "segments3" ? [pw(1), pw(2), pw(3)] : [pw(1)] };
  }) });
});
`);
chmodSync(judge, 0o755);

function runStage(name, ls, mode, movesDir = moves) {
  const dir = join(root, name);
  const briefDir = join(dir, "theses", "plan-brief");
  const runDir = join(dir, "run");
  mkdirSync(briefDir, { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(dir, "mode"), mode);
  const briefPath = join(briefDir, "brief.yaml");
  const text = briefText(ls);
  writeFileSync(briefPath, text);
  const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, PP_FIXTURE_DIR: dir };
  const cli = (args) => spawnSync(process.execPath, [join(repo, "src", "paragraph-plan.mjs"), ...args, "--brief", briefPath,
    "--run-dir", runDir, "--moves-dir", movesDir], { cwd: repo, encoding: "utf8", env, timeout: 180000 });
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
  return { dir, briefPath, text, runDir, started, awaited, prompts, planPath: join(briefDir, PARAGRAPH_PLAN_FILE) };
}

// (a) a planned job writes the file, holding nothing of a Move.
{
  const r = runStage("ok", legs, "ok");
  if (r.started.status !== 0) fails.push(`(a) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(a) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  if (!existsSync(r.planPath)) fails.push("(a) no ParagraphPlan file was written beside the Brief");
  else {
    const plan = readFileSync(r.planPath, "utf8");
    for (const banned of ["move", "segments", "p1", "settles", "technique", "before", "after", "why"]) {
      if (new RegExp(`(^|[^A-Za-z_])${banned}([^A-Za-z_]|$)`, "m").test(plan.split("\n").filter((l) => !l.startsWith("#")).join("\n"))) {
        fails.push(`(a) the ParagraphPlan file carries Move information (\`${banned}\`)`);
      }
    }
    for (const id of ["s1-1", "s1-2", "s2-1"]) if (!plan.includes(`PW-${id}`)) fails.push(`(a) the ParagraphPlan file lacks the Paragraph Waypoint of ${id}`);
    const sha = (await import("node:crypto")).createHash("sha256").update(r.text).digest("hex");
    if (!plan.includes(sha)) fails.push("(a) the ParagraphPlan file does not name the Brief's content hash");
    if (!plan.includes("theses/plan-brief/brief.yaml")) fails.push("(a) the ParagraphPlan file does not name the Brief's path");
  }
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(a) the Brief was rewritten by the stage");
  const bindings = join(r.runDir, "paragraph-plan-bindings.json");
  if (!existsSync(bindings)) fails.push("(a) the run directory carries no paragraph-plan-bindings.json");
  else {
    const b = JSON.parse(readFileSync(bindings, "utf8")).bindings || [];
    if (b.length !== 3 || !b.every((x) => x.move === "p1")) fails.push(`(a) the bindings record does not name p1 for each Leg Waypoint: ${JSON.stringify(b)}`);
  }
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const s2Plans = plans.filter((p) => p.includes("The copy is the installer's, not the consumer's."));
  if (s2Plans.length !== 2 || !s2Plans[1].includes("JUDGE-SENTENCE")) {
    fails.push(`(a) the judge's does-not-fit sentence was not put into Leg s2's second plan prompt (${s2Plans.length} plan prompt(s))`);
  }
  if (!plans.length || !plans.every((p) => p.includes(PSEG) && p.includes('"persona"')
    && p.includes("makes one point and holds it.") && p.includes("breaks if the point is dropped."))) {
    fails.push("(a) a plan prompt is not handed the Move's segments and breaks beside the persona");
  }
  if (!plans.length || !plans.every((p) => p.includes('"point"') && p.includes('"serves"') && p.includes('"next_point"'))) {
    fails.push("(a) a plan prompt does not carry a Leg Waypoint entry's point, serves and next_point");
  }
  if (plans.some((p) => p.includes(C1) || p.includes(C2))) {
    fails.push("(a) a plan prompt carries a Claim proposition on a Leg Waypoint entry (kogaki#1382)");
  }
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judges.length || !judges.every((p) => p.includes('"before"') && p.includes('"after"') && p.includes('"technique"')
    && p.includes('"breaks"') && p.includes('"segments"'))) {
    fails.push("(a) a judge prompt is not handed the bound Move's before, after, technique, breaks and segments");
  }
}

// (b) no Move fits: re-asked to the attempt bound, then a stop naming the Leg and Waypoint.
{
  const r = runStage("nofit", legs, "nofit");
  const out = r.awaited ? `${r.awaited.stdout}${r.awaited.stderr}` : "";
  if (r.started.status !== 0) fails.push(`(b) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status === 0) fails.push(`(b) await did not stop the stage: ${out.slice(0, 600)}`);
  if (!out.includes("Leg s1, Waypoint 2") || !out.includes(NO_PARAGRAPH_MOVE_FITS)) {
    fails.push(`(b) the stop does not name Leg s1, Waypoint 2 and ${NO_PARAGRAPH_MOVE_FITS}: ${out.slice(0, 600)}`);
  }
  const s1Plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"') && p.includes('"leg_id": "s1"'));
  if (s1Plans.length !== 3) fails.push(`(b) Leg s1 was not asked brief.unit_attempts (3) times: ${s1Plans.length}`);
  if (s1Plans.length > 1 && !s1Plans[1].includes("NOFIT-SENTENCE")) fails.push("(b) the no_paragraph_move_fits refusal was not put into the next attempt's prompt");
  if (existsSync(r.planPath)) fails.push("(b) a ParagraphPlan file was written for a stopped job");
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(b) the Brief was rewritten by a stopped stage");
}

// (c) a bound Move that fills neither `segments` nor `technique` stops the stage naming the Move.
{
  const r = runStage("broken", legs, "broken", movesNoOrder);
  const out = r.awaited ? `${r.awaited.stdout}${r.awaited.stderr}` : "";
  if (r.started.status !== 0) fails.push(`(c) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status === 0) fails.push(`(c) await did not stop the stage: ${out.slice(0, 600)}`);
  if (!out.includes('"p3"') || !out.includes("neither `segments` nor `technique`")) {
    fails.push(`(c) the stop does not name the Move p3 and that it fills neither segments nor technique: ${out.slice(0, 600)}`);
  }
  if (existsSync(r.planPath)) fails.push("(c) a ParagraphPlan file was written over a Move missing a role");
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(c) the Brief was rewritten by a stopped stage");
}

// (f) a bound Move carrying `technique` and no `segments` plans and judges the same as one
// carrying `segments` -- the fallback kogaki#1378 gives the Leg composer's own rule, never a stop.
{
  const r = runStage("technique", legs, "technique");
  if (r.started.status !== 0) fails.push(`(f) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(f) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  if (!existsSync(r.planPath)) fails.push("(f) no ParagraphPlan file was written for a Move carrying technique and no segments");
  else {
    const plan = readFileSync(r.planPath, "utf8");
    for (const id of ["s1-1", "s1-2", "s2-1"]) if (!plan.includes(`PW-${id}`)) fails.push(`(f) the ParagraphPlan file lacks the Paragraph Waypoint of ${id}`);
  }
  const bindings = join(r.runDir, "paragraph-plan-bindings.json");
  if (!existsSync(bindings)) fails.push("(f) the run directory carries no paragraph-plan-bindings.json");
  else {
    const b = JSON.parse(readFileSync(bindings, "utf8")).bindings || [];
    if (b.length !== 3 || !b.every((x) => x.move === "p2")) fails.push(`(f) the bindings record does not name p2 for each Leg Waypoint: ${JSON.stringify(b)}`);
  }
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judges.length || !judges.every((p) => p.includes("names a case and leaves it.") && p.includes("breaks if the case is never named."))) {
    fails.push("(f) a judge prompt is not handed the bound Move's technique and breaks");
  }
}

// (g) a bound Move carrying three `segments` yields three Paragraph Waypoints under its Leg
// Waypoint, and the rendered Packet carries the three indented lines under the one point,
// under the revised header (kogaki#1381).
{
  const r = runStage("segments3", legs, "segments3");
  if (r.started.status !== 0) fails.push(`(g) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(g) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  let planLegWp = null;
  if (!existsSync(r.planPath)) fails.push("(g) no ParagraphPlan file was written for a Move carrying three segments");
  else {
    const record = parseYaml(readFileSync(r.planPath, "utf8"), r.planPath);
    planLegWp = record.legs.find((l) => l.leg_id === "s1").waypoints[0];
    if (!Array.isArray(planLegWp.paragraph_waypoints) || planLegWp.paragraph_waypoints.length !== 3) {
      fails.push(`(g) the ParagraphPlan file does not carry three Paragraph Waypoints under s1's first Leg Waypoint: ${JSON.stringify(planLegWp)}`);
    }
    for (const n of [1, 2, 3]) if (!readFileSync(r.planPath, "utf8").includes(`PW-s1-1-${n}`)) fails.push(`(g) the ParagraphPlan file lacks Paragraph Waypoint ${n} of s1's first Leg Waypoint`);
  }
  if (planLegWp) {
    const s1 = legs.find((l) => l.leg_id === "s1");
    const renderLeg = { claims: s1.claims, waypoints: [{ ...s1.waypoints[0], paragraph_waypoints: planLegWp.paragraph_waypoints }] };
    const rendered = waypointLines(renderLeg);
    const indented = (rendered || "").split("\n").filter((l) => l.startsWith("   "));
    if (indented.length !== 3) fails.push(`(g) the rendered Packet waypoints block does not carry three indented lines under the one point: ${JSON.stringify(rendered)}`);
    for (const n of [1, 2, 3]) if (!(rendered || "").includes(`PW-s1-1-${n}`)) fails.push(`(g) the rendered Packet waypoints block lacks Paragraph Waypoint ${n}`);
  }
  const header = readFileSync("src/packet-template.md", "utf8");
  if (!header.includes("they are not one sentence each") || !header.includes("as many sentences as it needs")) {
    fails.push("(g) src/packet-template.md's waypoints header does not state the revised rule");
  }
  if (header.includes("One paragraph per indented line is the expected shape")) {
    fails.push("(g) src/packet-template.md's waypoints header still carries the retired one-sentence-per-line rule");
  }
}

// (d) a Brief whose Leg Waypoint carries move or segments is refused at start, by name.
for (const k of ["move", "segments"]) {
  const bad = legs.map((l) => ({ ...l }));
  const text = briefText(bad).replace(/(\n(\s*)- serves:)/, `\n$2- ${k}: p1$1`.replace("- serves:", "  serves:"));
  const dir = join(root, `retired-${k}`, "theses", "plan-brief");
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, text);
  const r = spawnSync(process.execPath, [join(repo, "src", "paragraph-plan.mjs"), "start", "--brief", briefPath, "--moves-dir", moves],
    { cwd: repo, encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: "/bin/false" } });
  if (!text.includes(`${k}: p1`)) fails.push(`(d) fixture: the ${k} line was not written into the Brief`);
  else if (r.status === 0 || !(r.stderr || "").includes(`\`${k}\``) || !(r.stderr || "").includes("retired")) {
    fails.push(`(d) start did not refuse a Leg Waypoint carrying \`${k}\` by name: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
  }
  if (readdirSync(dir).includes(PARAGRAPH_PLAN_FILE)) fails.push(`(d) a ParagraphPlan file was written for a Brief carrying \`${k}\``);
}

// (e) THE SKILL NAMES ONLY WHAT THE HARNESS HAS: every `node src/<module> <subcommand>` the
// tracked skill file names is a module in this tree whose CLI handles that subcommand.
{
  const skill = ".claude/skills/paragraph-plan/SKILL.md";
  const text = existsSync(skill) ? readFileSync(skill, "utf8") : "";
  const named = [...text.matchAll(/node (src\/[\w./-]+\.mjs) (\w+)/g)].map((m) => [m[1], m[2]]);
  if (!named.length) fails.push(`(e) ${skill} names no Harness entry point`);
  for (const [mod, sub] of named) {
    if (!existsSync(mod)) fails.push(`(e) ${skill} names ${mod}, which this tree does not carry`);
    else if (!readFileSync(mod, "utf8").includes(`case "${sub}":`)) fails.push(`(e) ${skill} names \`${mod} ${sub}\`, which its CLI does not handle`);
  }
  if (!["start", "status", "await"].every((sub) => named.some(([m, x]) => m === "src/paragraph-plan.mjs" && x === sub))) {
    fails.push(`(e) ${skill} does not name start, status and await on src/paragraph-plan.mjs`);
  }
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan — the stage writes paragraph-plan.yaml beside the Brief with point and serves only and no Move information, the bound Move staying in the run directory; the plan call carries the bound Move's segments and breaks and each Leg Waypoint's point, serves and next_point, and no Claim proposition; the judge call carries all five roles; a judge refusal is carried into the next attempt; a Leg Waypoint no Move fits stops after brief.unit_attempts naming the Leg and the Waypoint, and a bound Move filling neither segments nor technique stops naming the Move, each with the Brief unchanged and no file written; a Move carrying technique and no segments plans and judges the same as one carrying segments; a Move carrying three segments yields three Paragraph Waypoints under its Leg Waypoint, rendered as three indented lines under the revised header; a Leg Waypoint carrying move or segments is refused at start by name; the skill names only entry points the Harness has.");
JS
