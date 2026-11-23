// The cases of checks/check-structure-mapping-playground-leg-senses.sh (kogaki#1849), each stated in that member's
// `contract` in checks/registry.json, over a fixture Brief and two Moves of moves/ (kogaki#1880):
//   (a) a run to the end: five reading calls, one joining call, the run record, the counts and the sheet;
//   (b) each refusal before any model call, by name, with nothing written; (c) `nameRefusal`, each refusal by name;
//   (d) a reading refused twice stops the run with no sheet; (e) the order of a pair's answers, the opposite part
//   word rewritten, and a pair with no answer; (f) the setting keeping 3, and 5; (h) the comparison (kogaki#1851): every filling of the bound Segments, a filling meeting
//   every compared Edge, none doing so, an Edge with a Segment with nothing bound not compared, a Move with no Edge
//   compared, and more bound Segments than sentences;
//   (i) the sheet's tables and what each asks; (j) moves/ and the plan table unchanged. Case (g) went with the
//   hand-written Edges file (kogaki#1880).
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  chmodSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const repo = resolve(".");
const fails = [];
// Each assertion is one case; the member compares the count with its `case_floor` (kogaki#661).
let cases = 0;
const ok = (cond, msg) => {
  cases++;
  if (!cond) fails.push(msg);
};
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { parseYaml } = await imp("src/yaml.mjs");
const { legRecord, writeBriefFiles } = await imp("src/compose.mjs");
const M = await imp("src/structure-mapping-playground/move-senses.mjs");
const L = await imp("src/structure-mapping-playground/leg-senses.mjs");
const { renderLegSensesSheet, PAIR_ASKS, COMPARISON_ASKS } = await imp(
  "src/structure-mapping-playground/leg-senses-sheet.mjs",
);
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const root = mkdtempSync(join(tmpdir(), "structure-mapping-playground-leg-senses-"));
const trials = join(repo, "runs", "structure-mapping-playground");
mkdirSync(trials, { recursive: true });
const PLAN_TABLE = "src/paragraph-plan-workflow.json";
const planTableSha = sha(PLAN_TABLE);
const snapshot = () => {
  const rows = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      const s = statSync(p);
      if (s.isDirectory()) walk(p);
      else rows.push(`${p} ${s.size} ${s.mtimeMs}`);
    }
  };
  walk(join(repo, "moves"));
  return rows.sort().join("\n");
};
const before = snapshot();
const names = M.senseNames(M.loadSenses());

// ---- the Brief: three Roles, and in the one list two relations and a higher-order relation over them ----
const STRUCTURE = {
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
    {
      id: "c_3",
      name: "chain",
      relates: ["c_1", "c_2"],
      holds: "What the {r_1} starts stops the {r_3}.",
      from: ["L1", "L2"],
    },
  ],
  attains_thesis: "c_3",
  reach: ["c_1", "c_2", "c_3"],
  unreached: { relations: [], claims: [] },
};
const claim = [{ strand: "L1", proposition: "the rule starts the guard." }];
const LEGS = [
  { leg_id: "s1", relation: "c_1", text: "The rule starts the guard.", claims: claim },
  {
    leg_id: "s2",
    relation: "c_3",
    text: "What the rule starts stops the request.",
    claims: claim,
    reaches_target: true,
  },
];
const briefOf = (structure, legs) => ({
  slug: "leg-senses-brief",
  compose_path: "audiences/dev-to-zenn.md",
  strands: [
    { id: "L1", slug: "a", cite: `coding::lesson/a@${"0".repeat(64)}` },
    { id: "L2", slug: "b", cite: `coding::lesson/b@${"0".repeat(64)}` },
  ],
  thesis: "What the rule starts stops the request.",
  ...(structure ? { structure } : {}),
  reader_path: legs.map((l) => legRecord(l)),
  strand_coverage: [],
  journey_coverage: [],
  tradeoffs: {},
  bridged: {},
});
const writeFile = (name, text) => {
  const p = join(root, name);
  writeFileSync(p, text);
  return p;
};
mkdirSync(join(root, "brief"));
mkdirSync(join(root, "flat"));
// The Brief's three files (kogaki#1955), hashed as one; the flat Brief has no structure.yaml beside it.
const brief = join(root, "brief/brief.yaml");
const briefTexts = writeBriefFiles(brief, briefOf(STRUCTURE, LEGS));
const flat = join(root, "flat/brief.yaml");
writeBriefFiles(flat, briefOf(null, LEGS));
rmSync(join(root, "flat/structure.yaml"));
const SENTENCES = [
  "The rule starts the guard.",
  "The guard stops each request.",
  "What the rule starts stops the request.",
];

// ---- the readings of Leg s2: (1, 2) five answers, (1, 3) the rewriting, (2, 3) none ----
const sense = (s, by = null) => ({ sense: s, played_by: by });
const P12 = [
  [sense("Concession.Denier", 2), sense("Contrast"), sense("Conjunction")],
  [sense("Concession.Denier", 2), sense("Contrast")],
  [sense("Contrast"), sense("Concession.Denier", 2), sense("Equivalence")],
  [sense("Concession.Denier", 2), sense("Contrast"), sense("Similarity")],
  [sense("Contrast")],
];
const reading = (k) => ({
  pairs: [
    { pair: [1, 2], senses: P12[k - 1] },
    {
      pair: [1, 3],
      senses: [sense("Level-of-detail.Detail", 3), k >= 4 ? sense("Cause.Reason", 1) : sense("Cause.Result", 3)],
    },
    { pair: [2, 3], senses: [] },
  ],
});
const READINGS = [1, 2, 3, 4, 5].map(reading);
const answers = (name, list) => writeFile(`${name}.json`, JSON.stringify(list));

// ---- the one fake model binary: the readings from a list, the joining call from its own input ----
const judge = join(root, "fake-model.mjs");
writeFileSync(
  judge,
  `#!/usr/bin/env node
import { appendFileSync, writeSync, readFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.SMP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    writeSync(1, JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const marker = "----- INPUT (JSON) -----";
  const input = JSON.parse(prompt.slice(prompt.lastIndexOf(marker) + marker.length));
  const row = (id) => prompt.includes("\\\`" + id + "\\\` judgment point");
  if (row("paragraph_plan_name_senses")) {
    const list = JSON.parse(readFileSync(process.env.SMP_NAME_ANSWERS, "utf8"));
    let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter(Boolean).filter((l) => JSON.parse(l).stage === "name").length; } catch {}
    return out(list[Math.min(n, list.length - 1)], "name");
  }
  if (row("smp_join_senses"))
    return out({ rows: input.rows.map((r) => ({ ...r, word: "JOIN-" + r.sense, second: input.sentences[r.pair[1] - 1].sentence })) }, "join");
  return out({}, "other");
});
`,
);
chmodSync(judge, 0o755);
const settingsOf = (n) => {
  const doc = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
  doc.paragraph_plan.leg_edge_candidates = n;
  return writeFile(`settings-${n}.json`, JSON.stringify(doc));
};
const outRoot = mkdtempSync(join(trials, "check-leg-senses-"));
const run = (name, args, extraEnv = {}) => {
  const dir = join(root, `run-${name}`);
  mkdirSync(dir, { recursive: true });
  const o = join(outRoot, name);
  const res = spawnSync(
    process.execPath,
    ["src/structure-mapping-playground/leg-senses.mjs", "read", ...args.map((a) => (a === "@out" ? o : a))],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        KOGAKI_JUDGE_CLI: judge,
        SMP_FIXTURE_DIR: dir,
        SMP_NAME_ANSWERS: answers(`name-${name}`, READINGS),
        ...extraEnv,
      },
      timeout: 300000,
    },
  );
  const at = (f) => join(o, f);
  const json = (f) => (existsSync(at(f)) ? JSON.parse(readFileSync(at(f), "utf8")) : null);
  const text = (f) => (existsSync(at(f)) ? readFileSync(at(f), "utf8") : "");
  const seen = existsSync(join(dir, "seen.jsonl"))
    ? readFileSync(join(dir, "seen.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l))
    : [];
  return { res, o, at, json, text, seen, said: `${res.stdout}${res.stderr}` };
};
// The Moves of moves/ the comparison is run with: every Segment bound, and the first Segment with nothing bound.
const MOVE_ID = "grant_the_rule_then_withdraw_its_enforcer";
const UNBOUND_ID = "swap_the_question_for_a_narrower_one_and_name_its_hinge";
const segmentsOf = (id) =>
  parseYaml(readFileSync(`moves/${id}.yaml`, "utf8"), id).segments.map((s) => ({ bind: s.bind, edges: s.edges }));
const ARGS = ["--brief", brief, "--leg", "s2", "--out", "@out"];
const withMove = (id) => [...ARGS, "--move", id];

// (a) a run to the end, with no --move
const a = run("main", ARGS);
const rec = a.json(L.RUN_FILE) || {};
const counts = a.json(L.COUNTS_FILE) || { pairs: [] };
ok(a.res.status === 0, `(a) the run exited ${a.res.status}: ${a.said}`);
ok(
  JSON.stringify(a.seen.map((x) => x.stage)) === JSON.stringify(["name", "name", "name", "name", "name", "join"]),
  `(a) the calls are not five readings and one joining call: ${a.seen.map((x) => x.stage)}`,
);
ok(rec.state === "finished" && rec.stopped === null, `(a) the run record does not say the run finished: ${rec.state}`);
ok(
  rec.brief &&
    rec.brief.leg === "s2" &&
    rec.brief.sha256 ===
      createHash("sha256")
        .update(briefTexts.brief + briefTexts.structure + briefTexts.readerPath)
        .digest("hex") &&
    rec.move === null,
  `(a) the run record does not name the Brief, its Leg and digest: ${JSON.stringify(rec.brief)}`,
);
ok(
  JSON.stringify((rec.sentences || []).map((s) => [s.number, s.id, s.kind, s.sentence])) ===
    JSON.stringify([
      [1, "c_1", "Argument", SENTENCES[0]],
      [2, "c_2", "Argument", SENTENCES[1]],
      [3, "c_3", "CentralClaim", SENTENCES[2]],
    ]),
  `(a) the sentences are not the Arguments then the CentralClaim, each Role written by its name: ${JSON.stringify(rec.sentences)}`,
);
ok(rec.leg_edge_candidates === 3, `(a) the run record does not carry leg_edge_candidates: ${rec.leg_edge_candidates}`);
ok(
  [1, 2, 3, 4, 5].every((k) => existsSync(a.at(`reading-${k}/calls/paragraph_plan_name_senses/1/prompt.md`))) &&
    existsSync(a.at("join/calls/smp_join_senses/1/prompt.md")),
  "(a) a Call Record is missing",
);
ok(existsSync(a.at(L.SHEET_FILE)) && rec.sheet && rec.counts, "(a) sheet.html or the counts are missing");
const firstPrompt = a.seen[0] ? a.seen[0].prompt : "";
ok(
  firstPrompt.includes("name EVERY Sense of `senses` that holds") &&
    firstPrompt.includes(`"sentence": "${SENTENCES[1]}"`) &&
    firstPrompt.includes("Concession.Denier: a causal relation expected") &&
    !firstPrompt.includes('"kind"'),
  "(a) the reading call is not the paragraph_plan_name_senses row handed the numbered sentences alone and the list of Senses",
);
const joinInput = a.seen[5] ? a.seen[5].prompt : "";
ok(
  joinInput.includes("a pair of sentences of `sentences`") && !joinInput.includes("neighbouring"),
  "(a) the joining call's wording still says neighbouring",
);
ok(
  !existsSync(a.at(L.COMPARISON_FILE)) && rec.comparison === null && !a.text(L.SHEET_FILE).includes("The Move's Edges"),
  "(a) a run with no --move made a comparison or showed one",
);
const roleLeg = L.legSentences(STRUCTURE, "c_1");
ok(
  JSON.stringify(roleLeg.map((s) => [s.id, s.kind, s.sentence])) ===
    JSON.stringify([
      ["r_1", "Argument", STRUCTURE.roles[0].context],
      ["r_2", "Argument", STRUCTURE.roles[1].context],
      ["c_1", "CentralClaim", "The rule starts the guard."],
    ]),
  `(a) a Leg whose Arguments are Roles is not read by their definitions: ${JSON.stringify(roleLeg)}`,
);

// (b) each refusal before any model call, with nothing written
const refusedRun = (name, args, want) => {
  const r = run(name, args);
  ok(
    r.res.status === 1 && r.said.includes(want) && r.said.includes("no model call was made"),
    `(b) ${name}: not refused naming ${JSON.stringify(want)}: ${r.said}`,
  );
  ok(!r.seen.length && !existsSync(r.o), `(b) ${name}: a model call was made or something was written`);
};
const without = (flag) => {
  const i = ARGS.indexOf(`--${flag}`);
  return [...ARGS.slice(0, i), ...ARGS.slice(i + 2)];
};
for (const f of L.FLAGS) refusedRun(`no-${f}`, without(f), `\`--${f}\` is required`);
refusedRun("no-value", [...without("leg"), "--leg"], "`--leg` is required and takes a value");
refusedRun("move-no-value", [...ARGS, "--move"], "`--move` takes a Move id");
refusedRun("move-edges-retired", [...ARGS, "--move-edges", "edges.yaml"], "`--move-edges` is retired");
refusedRun(
  "unknown-leg",
  ARGS.map((x) => (x === "s2" ? "s9" : x)),
  '--leg "s9" names no Leg',
);
refusedRun(
  "no-structure",
  ARGS.map((x) => (x === brief ? flat : x)),
  "no structure.yaml beside it",
);
refusedRun("move-absent", withMove("no_such_move"), "--move no_such_move names no Move of moves/");
const outside = run(
  "outside",
  ARGS.map((x) => (x === "@out" ? join(root, "elsewhere") : x)),
);
ok(
  outside.res.status === 1 && outside.said.includes("is not a directory under runs/structure-mapping-playground/"),
  `(b) an --out outside the Playground's runs is not refused: ${outside.said}`,
);
ok(!outside.seen.length && !existsSync(join(root, "elsewhere")), "(b) an --out outside the runs was written");
const again = spawnSync(
  process.execPath,
  ["src/structure-mapping-playground/leg-senses.mjs", "read", ...ARGS.map((x) => (x === "@out" ? a.o : x))],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: join(root, "absent-binary") } },
);
ok(
  again.status === 1 && `${again.stderr}`.includes("already holds a run"),
  `(b) an --out holding a run is not refused: ${again.stderr}`,
);

// (c) nameRefusal, each refusal by name
const good = () => JSON.parse(JSON.stringify(READINGS[0]));
const nameCases = [
  ["an undeclared key", (r) => (r.extra = 1), "carries `extra`"],
  ["a missing key", (r) => delete r.pairs, "carries no `pairs`"],
  ["a pairs count", (r) => r.pairs.pop(), "`pairs` carries 2 entries, and 3 sentences have 3 pairs"],
  ["a pair out of order", (r) => (r.pairs[1].pair = [2, 3]), "pairs[1].pair is [2,3]"],
  ["a missing pair key", (r) => delete r.pairs[2].senses, "pairs[2] carries no `senses`"],
  ["senses not a list", (r) => (r.pairs[2].senses = "none"), "pairs[2].senses is not a list"],
  ["an undeclared Sense key", (r) => (r.pairs[0].senses[0].holds = true), "pairs[0].senses[0] carries `holds`"],
  ["an unknown Sense", (r) => (r.pairs[0].senses[1].sense = "Surprise"), 'pairs[0].senses[1].sense is "Surprise"'],
  [
    "a Sense without its part word",
    (r) => (r.pairs[0].senses[0].sense = "Concession"),
    'is "Concession", which is no name',
  ],
  ["a part played by no sentence of the pair", (r) => (r.pairs[1].senses[0].played_by = 2), "played_by is 2"],
  ["a played_by where no part", (r) => (r.pairs[0].senses[1].played_by = 1), "Contrast has no part word"],
  [
    "the same answer after the rewriting",
    (r) => r.pairs[1].senses.push(sense("Cause.Reason", 1)),
    "pairs[1].senses[2] says the same of the pair as pairs[1].senses[1]",
  ],
];
for (const [what, mutate, want] of nameCases) {
  const r = good();
  mutate(r);
  const got = L.nameRefusal(r, 3, names);
  ok(
    got && got.text.includes(want),
    `(c) nameRefusal: ${what} is not refused naming ${JSON.stringify(want)}: ${got && got.text}`,
  );
}
ok(L.nameRefusal(good(), 3, names) === null, "(c) nameRefusal refuses a good reading");

// (d) a reading refused twice stops the run
const bad = { pairs: [] };
const d = run("refused", ARGS, { SMP_NAME_ANSWERS: answers("extra-refused", [READINGS[0], READINGS[1], bad, bad]) });
const drec = d.json(L.RUN_FILE) || {};
ok(d.res.status === 1, `(d) a reading refused twice did not stop the run: ${d.said}`);
ok(
  drec.state === "stopped" && /^reading-3: /.test(drec.stopped || ""),
  `(d) the run record does not name reading 3 as the stop: ${drec.stopped}`,
);
ok(
  !existsSync(d.at(L.SHEET_FILE)) && !existsSync(d.at(L.COUNTS_FILE)) && !d.seen.some((x) => x.stage === "join"),
  "(d) a stopped run counted, joined or wrote a sheet",
);
ok(
  d.seen[3] && d.seen[3].prompt.includes("`pairs` carries 0 entries"),
  "(d) the retried reading does not carry the first refusal",
);

// (e) the order of a pair's answers, the rewriting, and a pair with no answer
const [p12, p13, p23] = counts.pairs.length === 3 ? counts.pairs : [{ answers: [] }, { answers: [] }, { answers: [] }];
ok(
  JSON.stringify(p12.answers.map((x) => [x.sense, x.named, x.place_sum])) ===
    JSON.stringify([
      ["Contrast", 5, 8],
      ["Concession.Denier", 4, 5],
      ["Similarity", 1, 3],
      ["Conjunction", 1, 3],
      ["Equivalence", 1, 3],
    ]),
  `(e) the pair (1, 2)'s answers are not ordered by readings, then the sum of places, then the list: ${JSON.stringify(p12.answers)}`,
);
const placed = L.countPairs(
  [
    { pairs: [{ pair: [1, 2], senses: [sense("Similarity"), sense("Contrast")] }] },
    { pairs: [{ pair: [1, 2], senses: [sense("Similarity"), sense("Contrast")] }] },
  ],
  2,
  names,
  3,
)[0];
ok(
  JSON.stringify(placed.answers.map((x) => x.sense)) === JSON.stringify(["Similarity", "Contrast"]),
  `(e) the lower sum of places does not come first before the list's order: ${placed.answers.map((x) => x.sense)}`,
);
const cause = p13.answers.filter((x) => x.sense.startsWith("Cause."));
ok(
  cause.length === 1 && cause[0].sense === "Cause.Result" && cause[0].played_by === 3 && cause[0].named === 5,
  `(e) Cause.Reason by 1 and Cause.Result by 3 are not counted as one answer: ${JSON.stringify(cause)}`,
);
ok(p23.answers.length === 0, `(e) the pair with no answer keeps something: ${JSON.stringify(p23.answers)}`);

// (f) the setting: 3 keeps the first three; 5 keeps all five; a pair with fewer keeps all
ok(
  JSON.stringify(p12.answers.map((x) => x.candidate)) === "[true,true,true,false,false]" &&
    p13.answers.every((x) => x.candidate),
  `(f) a setting of 3 does not keep the first three: ${JSON.stringify(p12.answers.map((x) => x.candidate))}`,
);
const five = run("five", ARGS, { KOGAKI_SETTINGS: settingsOf(5) });
const fiveCounts = five.json(L.COUNTS_FILE) || { pairs: [{ answers: [] }] };
ok(
  five.res.status === 0 && (five.json(L.RUN_FILE) || {}).leg_edge_candidates === 5,
  `(f) the run under a setting of 5 did not carry it: ${five.said}`,
);
ok(
  fiveCounts.pairs[0].answers.filter((x) => x.candidate).length === 5,
  "(f) a setting of 5 does not keep all five answers of the pair (1, 2)",
);

// (h) the comparison: every filling of the bound Segments, the CentralClaim on each and on none; an Edge with a
// Segment with nothing bound not compared; a Move with no Edge compared; more bound Segments than sentences
const n = run("none", withMove(MOVE_ID));
const nc = n.json(L.COMPARISON_FILE) || { fillings: [] };
const notMet = nc.fillings.map((f) => f.edges.filter((e) => !e.met).map((e) => `${e.segment}:${e.sense}`));
ok(n.res.status === 0 && nc.chosen === false, `(h) the fixture's Move is not refused for the Leg: ${n.said}`);
ok(
  JSON.stringify(nc.fillings.map((f) => [f.filling, f.central_claim])) ===
    JSON.stringify([
      [{ 1: 1, 2: 2, 3: 3 }, 3],
      [{ 1: 1, 2: 3, 3: 2 }, 2],
      [{ 1: 2, 2: 1, 3: 3 }, 3],
      [{ 1: 2, 2: 3, 3: 1 }, 2],
      [{ 1: 3, 2: 1, 3: 2 }, 1],
      [{ 1: 3, 2: 2, 3: 1 }, 1],
    ]),
  `(h) not every filling was tried, with the CentralClaim on each bound Segment: ${JSON.stringify(nc.fillings.map((f) => [f.filling, f.central_claim]))}`,
);
ok(
  JSON.stringify(notMet[0]) === JSON.stringify(["3:Cause.Result"]) &&
    JSON.stringify(notMet[2]) === JSON.stringify(["2:Concession.Denier"]) &&
    notMet.every((x) => x.length),
  `(h) the Edge not met under each filling is not named: ${JSON.stringify(notMet)}`,
);
ok(
  JSON.stringify(nc.not_compared) === "[]" && nc.none === null,
  `(h) a Move with every Segment bound lists an Edge not compared: ${JSON.stringify(nc.not_compared)}`,
);
ok((n.json(L.RUN_FILE) || {}).move === MOVE_ID, "(h) the run record does not name the Move");
const metMove = {
  segments: [
    { bind: 1, edges: [{ sense: "Cause.Reason", to: [3] }] },
    { bind: 2, edges: [{ sense: "Concession.Denier", to: [1] }] },
    { bind: 3, edges: [] },
  ],
};
const mc = L.compareMove(metMove, counts.pairs, 3, names);
ok(
  mc.chosen === true && mc.fillings.filter((f) => f.met).length === 1,
  `(h) a Move one filling of which meets every Edge is not chosen: ${JSON.stringify(mc.fillings.map((f) => f.met))}`,
);
ok(
  mc.fillings[0] &&
    JSON.stringify(mc.fillings[0].edges[0].wanted) === JSON.stringify({ sense: "Cause.Result", played_by: 3 }),
  "(h) an Edge is not compared in the one spelling",
);
const u = run("unbound", withMove(UNBOUND_ID));
const uc = u.json(L.COMPARISON_FILE) || { fillings: [], not_compared: [] };
ok(
  u.res.status === 0 &&
    JSON.stringify(uc.fillings.map((f) => [f.filling, f.central_claim])) ===
      JSON.stringify([
        [{ 1: 1, 2: 2 }, null],
        [{ 1: 1, 2: 3 }, 3],
        [{ 1: 2, 2: 1 }, null],
        [{ 1: 2, 2: 3 }, 3],
        [{ 1: 3, 2: 1 }, 2],
        [{ 1: 3, 2: 2 }, 2],
      ]),
  `(h) the fillings of a Move with a Segment with nothing bound are not every one, or none gives the CentralClaim to no Segment: ${JSON.stringify(uc.fillings.map((f) => [f.filling, f.central_claim]))}`,
);
ok(
  JSON.stringify(uc.not_compared) === JSON.stringify([{ segment: 2, sense: "MetaDiscourse", to: [1] }]) &&
    uc.fillings.every((f) => f.edges.length === 1 && f.edges[0].segment === 3),
  `(h) an Edge with a Segment with nothing bound at one end is compared, or not listed once: ${JSON.stringify(uc.not_compared)}`,
);
ok(
  uc.chosen === true && uc.fillings.filter((f) => f.met).length === 1 && uc.fillings[4].met === true,
  `(h) the compared Edge of the Move with a Segment with nothing bound is not met under the one filling: ${JSON.stringify(uc.fillings.map((f) => f.met))}`,
);
const noneMove = {
  segments: [
    { bind: null, edges: [] },
    { bind: 1, edges: [{ sense: "Conjunction", to: [1] }] },
  ],
};
const noneCompared = L.compareMove(noneMove, counts.pairs, 3, names);
ok(
  noneCompared.chosen === false &&
    noneCompared.fillings.length === 3 &&
    noneCompared.fillings.every((f) => !f.edges.length && f.met === false) &&
    noneCompared.none.includes("none of the Move's Edges is compared") &&
    noneCompared.not_compared.length === 1,
  `(h) a Move none of whose Edges is compared is not reported as not to be chosen, with the reason: ${JSON.stringify(noneCompared)}`,
);
const moreMove = { segments: [...segmentsOf(MOVE_ID), { bind: 4, edges: [] }] };
const more = L.compareMove(moreMove, counts.pairs, 3, names);
ok(
  more.chosen === false &&
    !more.fillings.length &&
    more.none.includes("the Move has 4 bound Segments and the Leg has 3 sentences, so there is no filling"),
  `(h) a Move with more bound Segments than the Leg has sentences has a filling: ${JSON.stringify(more)}`,
);

// (i) the sheet: each pair table and the comparison headed by what it asks
const sheet = a.text(L.SHEET_FILE);
ok(sheet.includes("Read: the Leg s2 of the Brief"), "(i) the sheet does not say which Brief and Leg were read");
ok(
  sheet.includes(`<td>3</td><td>CentralClaim</td><td>${SENTENCES[2]}</td>`) &&
    sheet.includes("<td>1</td><td>Argument</td>"),
  "(i) the sentences are not shown numbered and marked Argument or CentralClaim",
);
const pairParts = sheet.split("<h3>Sentences ").slice(1);
ok(
  pairParts.length === 3 && pairParts.every((t) => t.includes(PAIR_ASKS)),
  `(i) not every pair table is headed by the sentence saying what it asks: ${pairParts.length}`,
);
ok(
  sheet.includes('Contrast<span class="meaning">at least two differences between the two are brought out.</span>'),
  "(i) a Sense is not shown with its meaning in the same cell",
);
ok(
  sheet.includes(`${SENTENCES[0]} <b>JOIN-Level-of-detail.Detail</b> ${SENTENCES[2]}`) &&
    sheet.includes("named in 5 of 5"),
  "(i) the joined sentences or the count are not shown",
);
ok(
  sheet.includes("Named but not kept: Conjunction (named in 1 of 5), Equivalence (named in 1 of 5).") &&
    sheet.includes("No reading named a Sense for this pair."),
  "(i) the answers not kept, or the pair with no answer, are not shown",
);
const nsheet = n.text(L.SHEET_FILE);
const nPart = nsheet.slice(nsheet.indexOf('id="comparison"'));
ok(
  nPart.indexOf(COMPARISON_ASKS) >= 0 &&
    nPart.indexOf(COMPARISON_ASKS) <
      nPart.indexOf(
        "Every way of giving the Leg's 3 sentences, its Arguments and its CentralClaim, to the Move's 3 bound Segments",
      ) &&
    nsheet.includes("The Move cannot be chosen for this Leg") &&
    nsheet.includes("not met"),
  "(i) the comparison is not opened by what it asks, then by every way of giving the Leg's sentences to the bound Segments, or does not say whether the Move can be chosen",
);
ok(
  nsheet.includes(
    "<td>Segment 1 = sentence 3, Segment 2 = sentence 1, Segment 3 = sentence 2; Segment 1 states the CentralClaim</td>",
  ),
  "(i) a filling's column does not name the sentence each bound Segment is given and the Segment stating the CentralClaim",
);
const usheet = u.text(L.SHEET_FILE);
ok(
  usheet.includes("<td>Segment 2 = sentence 1, Segment 3 = sentence 2; no Segment states the CentralClaim</td>") &&
    usheet.includes("<li>Segment 2: MetaDiscourse to Segment 1 — Segment 1 has nothing bound</li>"),
  "(i) a filling giving the CentralClaim to no Segment, or an Edge not compared with its Segment with nothing bound, is not shown",
);
const sheetOf = (comparison, move) =>
  renderLegSensesSheet({
    brief: "b.yaml",
    legId: "s2",
    sentences: rec.sentences || [],
    counted: counts.pairs,
    comparison,
    move,
    joins: [],
    readings: [],
    prompts: [null, null],
    names,
    readingCount: 5,
  });
ok(sheetOf(mc, metMove).includes("The Move can be chosen for this Leg"), "(i) a chosen Move is not reported so");
ok(
  sheetOf(more, moreMove).includes("so there is no filling"),
  "(i) a Move with no filling is not reported on the sheet",
);
ok(
  sheetOf(noneCompared, noneMove).includes(
    "The Move cannot be chosen for this Leg: none of the Move's Edges is compared",
  ),
  "(i) a Move none of whose Edges is compared is not reported on the sheet with the reason",
);
ok(
  sheet.includes("&quot;Concession.Denier&quot;") && sheet.includes("instruction of the joining call"),
  "(i) the folded part does not hold every answer as given and the two instructions",
);

// (j) moves/ and the plan table unchanged
ok(snapshot() === before, "(j) a file under moves/ changed");
ok(sha(PLAN_TABLE) === planTableSha, "(j) src/paragraph-plan-workflow.json changed");

if (fails.length) {
  console.log(fails.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log(`structure-mapping-playground-leg-senses: ${cases} case(s) pass`);
