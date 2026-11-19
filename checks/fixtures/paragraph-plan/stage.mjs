// The ParagraphPlan stage's fixture (kogaki#1865), shared by checks/paragraph-plan-cases.mjs and
// checks/paragraph-plan-job-cases.mjs: a Brief of two Legs over a `structure`, Move libraries whose Segments carry
// `bind` and `edges`, and one fake model binary that records every call by its row and answers by a mode file.
// A mode is `ok`, `refuse-once`, `refuse-twice` or `points-refused` for every Leg, or `refuse-twice:<leg>` or
// `die:<leg>` for that Leg alone.
import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { stringifyYaml, parseYaml } from "../../../src/yaml.mjs";
import { legRecord, briefRecordText } from "../../../src/compose.mjs";
import { legSentences } from "../../../src/paragraph-plan/senses.mjs";

// ---- the Brief: two Legs of three sentences each ----
export const STRUCTURE = {
  roles: [
    { id: "r_1", name: "rule", context: "A standing order that runs by itself.", attributes: [], claims: ["L1"] },
    {
      id: "r_2",
      name: "guard",
      context: "A watcher that stops what it does not know.",
      attributes: [],
      claims: ["L1"],
    },
    { id: "r_3", name: "request", context: "Something put forward to be done.", attributes: [], claims: ["L2"] },
  ],
  relations: [
    { id: "c_1", name: "starts", between: ["r_1", "r_2"], holds: "The {r_1} starts the {r_2}.", from: "L1" },
    { id: "c_2", name: "stops", between: ["r_2", "r_3"], holds: "The {r_2} stops each {r_3}.", from: "L2" },
  ],
  higher_order: [
    {
      id: "h_1",
      name: "chain",
      relates: ["c_1", "c_2"],
      holds: "What the {r_1} starts stops the {r_3}.",
      from: ["L1", "L2"],
    },
  ],
  attains_thesis: "h_1",
  reach: ["c_1", "c_2", "h_1"],
  unreached: { relations: [], higher_order: [], claims: [] },
};
const claim = [{ strand: "L1", proposition: "the rule starts the guard." }];
export const LEGS = [
  { leg_id: "s1", relation: "c_1", text: "The rule starts the guard.", claims: claim },
  {
    leg_id: "s2",
    relation: "h_1",
    text: "What the rule starts stops the request.",
    claims: claim,
    reaches_target: true,
  },
];
export const briefOf = (structure) =>
  briefRecordText({
    slug: "paragraph-plan-brief",
    compose_path: "audiences/dev-to-zenn.md",
    strands: [
      { id: "L1", slug: "a", cite: `coding::lesson/a@${"0".repeat(64)}` },
      { id: "L2", slug: "b", cite: `coding::lesson/b@${"0".repeat(64)}` },
    ],
    thesis: "What the rule starts stops the request.",
    ...(structure ? { structure } : {}),
    reader_path: LEGS.map((l) => legRecord(l)),
    strand_coverage: [],
    journey_coverage: [],
    tradeoffs: {},
    bridged: {},
  });
// ---- the Move libraries ----
// `z_fewer` and `a_more` each meet one Edge under the readings below (Conjunction between every pair); `a_more`
// compares two, so the one with fewer compared Edges is taken although its id comes later. `wide` has four Bind
// targets, which no Move file may carry (`MOVE_BIND_MAX`), so it is handed to the Leg steps directly in (e).
const ROLES = () => readFileSync("moves/ROLES.json");
export const move = (id, segments) => ({
  id,
  description: "a fixture Move.",
  takes: [],
  leaves: [],
  breaks: ["breaks if a step is dropped."],
  segments,
});
export const seg = (bind, edges = []) => ({ operation: "does a step.", bind, edges });
export const Z_FEWER = move("z_fewer", [
  { operation: "opens.", bind: 1, edges: [] },
  { operation: "joins.", relation: "follows.", bind: 2, edges: [{ sense: "Conjunction", to: [1] }] },
  { operation: "closes.", relation: "ends.", bind: null, edges: [{ sense: null, to: [2], hypophora: true }] },
]);
export const A_MORE = move("a_more", [
  seg(1),
  { ...seg(2, [{ sense: "Conjunction", to: [1] }]), relation: "follows." },
  { ...seg(3, [{ sense: "Contrast", to: [2] }]), relation: "turns." },
]);
export const WIDE = move("wide", [
  seg(1),
  { ...seg(2), relation: "a." },
  { ...seg(3), relation: "b." },
  { ...seg(4, [{ sense: "Conjunction", to: [1] }]), relation: "c." },
]);
// ---- what depends on the scratch root: Briefs, libraries, the fake model and the stage run ----
export function makeFixture(root) {
  let briefN = 0;
  const newBrief = (structure = STRUCTURE) => {
    const d = join(root, `brief-${++briefN}`);
    mkdirSync(d);
    writeFileSync(join(d, "brief.yaml"), briefOf(structure));
    return join(d, "brief.yaml");
  };

  const library = (name, moves) => {
    const d = join(root, name);
    mkdirSync(d);
    writeFileSync(join(d, "ROLES.json"), ROLES());
    for (const m of moves) writeFileSync(join(d, `${m.id}.yaml`), stringifyYaml(m));
    return d;
  };

  // ---- the one fake model binary: every call recorded by its row; behaviour read from a mode file ----
  const judge = join(root, "fake-model.mjs");
  const firsts = Object.fromEntries(LEGS.map((l) => [legSentences(STRUCTURE, l.relation)[0].sentence, l.leg_id]));
  writeFileSync(
    judge,
    `#!/usr/bin/env node
  import { appendFileSync, readFileSync, existsSync } from "node:fs";
  if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
  const dir = process.env.PP_FIXTURE_DIR;
  const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
    const prompt = Buffer.concat(c).toString("utf8");
    const marker = "----- INPUT (JSON) -----";
    const input = JSON.parse(prompt.slice(prompt.lastIndexOf(marker) + marker.length));
    const row = (prompt.match(/workflow's \\\`([a-z_]+)\\\` judgment point/) || [])[1] || "none";
    const seen = existsSync(dir + "/calls.jsonl") ? readFileSync(dir + "/calls.jsonl", "utf8").split("\\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const legOf = input.leg ? input.leg.leg_id : JSON.parse(readFileSync(dir + "/firsts.json", "utf8"))[input.sentences[0].sentence];
    appendFileSync(dir + "/calls.jsonl", JSON.stringify({ row, leg: legOf }) + "\\n");
    const [mode, only] = readFileSync(dir + "/mode", "utf8").trim().split(":");
    const here = !only || only === legOf;
    const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
    if (row === "paragraph_plan_name_senses") {
      const n = input.sentences.length;
      const pairs = [];
      for (let i = 1; i <= n; i++) for (let j = i + 1; j <= n; j++) pairs.push({ pair: [i, j], senses: [{ sense: "Conjunction", played_by: null }] });
      const before = seen.filter((s) => s.row === row && s.leg === legOf).length;
      if (here && ((mode === "refuse-once" && before === 0) || mode === "refuse-twice")) return out({ pairs: [] });
      return out({ pairs });
    }
    if (row === "paragraph_plan_points") {
      if (mode === "points-refused") return out({ points: [] });
      if (mode === "die" && here) { process.stderr.write("FAKE-DIED"); process.exit(2); }
      return out({ points: input.segments.map((s) => ({ segment: s.segment, point: "POINT-" + input.leg.leg_id + "-" + s.segment })) });
    }
    return out({});
  });
  `,
  );
  chmodSync(judge, 0o755);

  let runN = 0;
  let fixtureN = 0;
  const MOVES = library("moves", [A_MORE, Z_FEWER]);
  const runStage = (mode, { brief = newBrief(), moves = MOVES, runDir = null, priorRun = "" } = {}) => {
    const dir = runDir || join(root, `run-${++runN}`);
    const fixture = join(root, `fixture-${++fixtureN}`);
    mkdirSync(fixture);
    writeFileSync(join(fixture, "mode"), mode);
    writeFileSync(join(fixture, "firsts.json"), JSON.stringify(firsts));
    const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, PP_FIXTURE_DIR: fixture };
    const before = readFileSync(brief, "utf8");
    const start = spawnSync(
      process.execPath,
      [
        "src/paragraph-plan.mjs",
        "start",
        "--brief",
        brief,
        "--run-dir",
        dir,
        "--moves-dir",
        moves,
        "--prior-run",
        priorRun,
      ],
      { encoding: "utf8", env },
    );
    const wait =
      start.status === 0
        ? spawnSync(
            process.execPath,
            ["src/paragraph-plan.mjs", "await", "--brief", brief, "--run-dir", dir, "--wait-s", "120"],
            {
              encoding: "utf8",
              env,
              timeout: 180000,
            },
          )
        : { status: null, stdout: "", stderr: "" };
    const planPath = join(resolve(brief, ".."), "paragraph-plan.yaml");
    const calls = existsSync(join(fixture, "calls.jsonl"))
      ? readFileSync(join(fixture, "calls.jsonl"), "utf8")
          .split("\n")
          .filter(Boolean)
          .map((l) => JSON.parse(l))
      : [];
    return {
      start,
      wait,
      out: `${start.stdout}${start.stderr}${wait.stdout}${wait.stderr}`,
      plan: existsSync(planPath) ? parseYaml(readFileSync(planPath, "utf8"), planPath) : null,
      planPath,
      calls,
      briefSame: readFileSync(brief, "utf8") === before,
      brief,
      dir,
      fixture,
    };
  };
  return { newBrief, library, runStage, judge, MOVES };
}
