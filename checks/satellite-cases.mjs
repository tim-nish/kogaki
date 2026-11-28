// The cases of checks/check-satellite.sh (kogaki#1963), each stated in that member's `contract` in checks/registry.json:
// (a) `add` over one Decision and one Lesson and a reading with one higher-order relation writes `s_1` and the
// BriefPlanPlayground (kogaki#1967); (b) a reading with two tops makes the apex call; (c) a reading in two parts stops;
// (d) a refused reading is asked three times; (e) a refused argument makes no call; (f) run again, it keeps `s_1` and
// the file's head; (g) `wholeReaderPath`; (h) the `check` verb with no file, with the written file, after a hand edit,
// and each refusal of the file, a relation between three Roles among them; (i) the Brief's files, their hash and a
// plan made before are untouched; (j) a Statute is read as a Decision is (kogaki#1989). A stub stands in for the model
// and a file for the gateway.
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
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
const { parseYaml, stringifyYaml } = await imp("src/yaml.mjs");
const C = await imp("src/compose.mjs");
const S = await imp("src/compose/satellites.mjs");
const { paragraphPlanView } = await imp("src/paragraph-plan/view.mjs");
const root = mkdtempSync(join(tmpdir(), "satellite-"));
const runs = join(root, "runs");

const STRUCTURE = {
  roles: [
    { id: "r_1", name: "rule", context: "A standing instruction.", attributes: [], claims: ["L1"] },
    { id: "r_2", name: "guard", context: "A watcher.", attributes: [], claims: ["L1"] },
    { id: "r_3", name: "request", context: "Something put forward.", attributes: [], claims: ["L1"] },
  ],
  relations: [
    { id: "c_1", name: "starts", between: ["r_1", "r_2"], holds: "The {r_1} starts the {r_2}.", from: "L1" },
    { id: "c_2", name: "stops", between: ["r_2", "r_3"], holds: "The {r_2} stops each {r_3}.", from: "L1" },
    { id: "c_3", name: "names", between: ["r_1", "r_3"], holds: "The {r_1} names each {r_3}.", from: "L1" },
  ],
  attains_thesis: "c_3",
  reach: ["c_1", "c_2", "c_3"],
  unreached: { relations: [], claims: [] },
};
const claim = [{ strand: "L1", proposition: "the rule starts the guard." }];
const RECORD = {
  slug: "satellite",
  compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "a", cite: `coding::lesson/a@${"0".repeat(64)}` }],
  thesis: "The rule names each request.",
  structure: STRUCTURE,
  reader_path: [
    { leg_id: "s1", relation: "c_1", claims: claim },
    { leg_id: "s2", relation: "c_2", claims: claim },
    { leg_id: "s3", relation: "c_3", claims: claim, reaches_target: true },
  ],
  strand_coverage: [],
  journey_coverage: [],
  tradeoffs: {},
  bridged: {},
};
const BRIEF_LINES = [
  "s1\tc_1\tThe rule starts the guard.",
  "s2\tc_2\tThe guard stops each request.",
  "s3\tc_3\tThe rule names each request.",
];

let n = 0;
const briefAt = () => {
  const dir = join(root, "theses", `b${++n}`);
  mkdirSync(dir, { recursive: true });
  const at = join(dir, "brief.yaml");
  const t = C.briefFileTexts(RECORD);
  writeFileSync(at, t.brief);
  writeFileSync(join(dir, "structure.yaml"), t.structure);
  writeFileSync(join(dir, "reader-path.yaml"), t.readerPath);
  return at;
};

// THE SERVED UNITS, a file in place of the gateway.
const DECISION = "coding::decision/cut-tests";
const LESSON = "coding::lesson/a-lesson";
const STATUTE = "coding::statute/a-budget";
const units = join(root, "units.json");
writeFileSync(
  units,
  JSON.stringify({
    [DECISION]: {
      cite: `${DECISION}@${"a".repeat(64)}`,
      text: "**We removed Tests to reduce computational costs.** The suite ran for an hour. It cost too much.",
    },
    [LESSON]: {
      cite: `${LESSON}@${"b".repeat(64)}`,
      text: "A check that costs too much is dropped. Then no one runs it.",
    },
    [STATUTE]: {
      cite: `${STATUTE}@${"c".repeat(64)}`,
      text: "**Every check runs within a budget.** The budget is set per suite. It is read each week.",
    },
  }),
);

// THE STUB: answers the structure reading as STUB_MODE says, and the apex call over the component it is handed,
// counting its calls in STUB_COUNT.
const stub = join(root, "stub.mjs");
writeFileSync(
  stub,
  `#!/usr/bin/env node
import { readFileSync, appendFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("stub 1"); process.exit(0); }
const prompt = readFileSync(0, "utf8");
appendFileSync(process.env.STUB_COUNT, "x");
const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + 24));
const role = (name, claims) => ({ name, context: "A kind of " + name + ".", attributes: [], claims });
const rel = (name, a, b, from) => ({ name, between: [a, b], holds: "The {" + a + "} meets the {" + b + "}.", from });
const high = (name, x, y, from) => ({ name, relates: [x, y], holds: "The whole of " + name + " holds.", holds_over_relations: "{" + x + "} leads to {" + y + "}.", from });
const row = (relations, verdict) => ({ relations, criterion: ["U1"], verdict, why: "The claims say so." });
const READINGS = {
  one: { roles: [role("cost", ["U1"]), role("suite", ["U1"]), role("check", ["U2"])],
    relations: [rel("weighs", "cost", "suite", "U1"), rel("drops", "suite", "check", "U2"), high("cut", "weighs", "drops", ["U1", "U2"])],
    considered: [row(["weighs", "drops"], "connected")] },
  chain: { roles: [role("cost", ["U1"]), role("suite", ["U1"]), role("check", ["U2"]), role("runner", ["U2"])],
    relations: [rel("weighs", "cost", "suite", "U1"), rel("drops", "suite", "check", "U2"), rel("skips", "check", "runner", "U2"),
      high("cut", "weighs", "drops", ["U1", "U2"]), high("gone", "drops", "skips", ["U2"])],
    considered: [row(["weighs", "drops"], "connected"), row(["drops", "skips"], "connected"), row(["cut", "gone"], "not_connected")] },
  parts: { roles: [role("cost", ["U1"]), role("suite", ["U1"]), role("hour", ["U1"]), role("check", ["U2"]), role("runner", ["U2"])],
    relations: [rel("weighs", "cost", "suite", "U1"), rel("lasts", "suite", "hour", "U1"), high("cut", "weighs", "lasts", ["U1"]),
      rel("skips", "check", "runner", "U2")],
    considered: [row(["weighs", "lasts"], "connected"), row(["cut", "skips"], "not_connected")] },
  single: { roles: [role("cost", ["U1"]), role("check", ["U2"])], relations: [rel("drops", "cost", "check", "U1")], considered: [] },
  idle: { roles: [role("cost", ["U1"]), role("suite", ["U1"]), role("check", ["U1"])],
    relations: [rel("weighs", "cost", "suite", "U1"), rel("drops", "suite", "check", "U1"), high("cut", "weighs", "drops", ["U1"])],
    considered: [row(["weighs", "drops"], "connected")] },
};
let answer;
if (input.state === "apex") {
  const k = input.components[0];
  answer = { apexes: [{ component: k.component, name: "whole", relates: k.top, holds: "Costs decide which checks run.",
    holds_over_relations: k.top.map((t) => "{" + t + "}").join(" and ") + " meet." }] };
} else answer = READINGS[process.env.STUB_MODE];
console.log(JSON.stringify({ result: JSON.stringify(answer) }));
`,
);
chmodSync(stub, 0o755);

const count = join(root, "count");
const add = (at, args, mode = "one") => {
  writeFileSync(count, "");
  const r = spawnSync(process.execPath, ["src/satellite.mjs", "add", "--brief", at, ...args], {
    encoding: "utf8",
    timeout: 60000,
    env: {
      ...process.env,
      KOGAKI_JUDGE_CLI: stub,
      KOGAKI_SATELLITE_RUNS: runs,
      KOGAKI_SATELLITE_UNITS: units,
      STUB_COUNT: count,
      STUB_MODE: mode,
    },
  });
  return { status: r.status, out: r.stdout, err: r.stderr, calls: readFileSync(count, "utf8").length };
};
const check = (at) => {
  const r = spawnSync(process.execPath, ["src/brief-files.mjs", "check", "--brief", at], {
    encoding: "utf8",
    timeout: 60000,
  });
  return { status: r.status, out: r.stdout, err: r.stderr };
};
const readFile = (at) => parseYaml(readFileSync(S.satellitesPathFor(at), "utf8"), "satellites.yaml");
const ADD = ["--before", "s1", "--as", "Background", DECISION, LESSON];
const texts = (at) => {
  const r = C.readBriefFiles(at);
  return { text: r.text, sha256: r.sha256 };
};

// (a) ONE HIGHER-ORDER RELATION OVER TWO RELATIONS: one call, s_1 with two sources and three Legs.
const at = briefAt();
const briefBefore = texts(at);
const first = add(at, ADD);
ok(first.status === 0, `(a) add exited ${first.status}: ${first.err}`);
ok(first.calls === 1, `(a) add made ${first.calls} call(s), not 1`);
const one = existsSync(S.satellitesPathFor(at)) ? readFile(at) : { satellites: [] };
const s1 = one.satellites[0] || {};
ok(
  one.satellites.length === 1 && s1.id === "s_1" && s1.rst_relation === "Background" && s1.before === "s1",
  `(a) satellites.yaml does not hold the one entry s_1, Background, before s1: ${JSON.stringify(one.satellites)}`,
);
ok(
  isDeepStrictEqual(s1.sources, [
    { id: "U1", cite: `${DECISION}@${"a".repeat(64)}`, claim: "We removed Tests to reduce computational costs." },
    { id: "U2", cite: `${LESSON}@${"b".repeat(64)}`, claim: "A check that costs too much is dropped." },
  ]),
  `(a) the sources are not the Decision's headline and the Lesson's first sentence at their cites: ${JSON.stringify(s1.sources)}`,
);
ok(s1.structure && s1.structure.attains_thesis === "c_3", `(a) attains_thesis is not the higher-order relation c_3`);
ok(
  isDeepStrictEqual(
    (s1.reader_path || []).map((l) => l.leg_id),
    ["s_1.L1", "s_1.L2", "s_1.L3"],
  ) && (s1.reader_path || []).every((l) => Object.keys(l).join() === "leg_id,relation"),
  `(a) the Legs are not s_1.L1 to s_1.L3 each with leg_id and relation alone: ${JSON.stringify(s1.reader_path)}`,
);
ok(
  first.out.includes("wrote s_1") && first.out.includes("s_1.L3\tc_3\t"),
  `(a) add does not print the entry and its Legs: ${first.out}`,
);
// THE BRIEFPLANPLAYGROUND IS WRITTEN AGAIN by `add` (kogaki#1967), and holds the new entry's id.
{
  const page = join(root, "runs", "brief-plan-playground", "b1", "sheet.html");
  const pageLines = first.out.split("\n").filter((l) => l.startsWith("BriefPlanPlayground"));
  ok(
    pageLines.length === 1 && pageLines[0] === `BriefPlanPlayground: ${pathToFileURL(page).href}`,
    `(a) add does not print the BriefPlanPlayground's one line: ${JSON.stringify(pageLines)}`,
  );
  ok(
    existsSync(page) && readFileSync(page, "utf8").includes("s_1 (Background)"),
    "(a) the BriefPlanPlayground written by add does not hold the entry s_1",
  );
  // Over a Brief not at theses/<slug>/brief.yaml, `add` succeeds and the page's absence is a warning.
  const dir = join(root, "elsewhere");
  mkdirSync(dir, { recursive: true });
  const t = C.briefFileTexts(RECORD);
  writeFileSync(join(dir, "brief.yaml"), t.brief);
  writeFileSync(join(dir, "structure.yaml"), t.structure);
  writeFileSync(join(dir, "reader-path.yaml"), t.readerPath);
  const r = add(join(dir, "brief.yaml"), ADD);
  ok(
    r.status === 0 &&
      r.out.includes("wrote s_1") &&
      !r.out.includes("BriefPlanPlayground") &&
      r.err.includes("BriefPlanPlayground not written: ") &&
      r.err.includes("is not a theses/<slug>/brief.yaml"),
    `(a) add over a Brief not at theses/<slug>/brief.yaml did not succeed with the warning: ${r.status} ${r.err}`,
  );
}
{
  const kept = join(runs, "b1");
  const stamps = existsSync(kept) ? readdirSync(kept) : [];
  const call = join(kept, stamps[0] || "none", "read-structure", "call-1");
  ok(
    ["input.json", "prompt.txt", "answer.txt"].every((f) => existsSync(join(call, f))),
    "(a) the call's input, prompt and answer are not kept under the runs directory",
  );
  const prompt = existsSync(join(call, "prompt.txt")) ? readFileSync(join(call, "prompt.txt"), "utf8") : "";
  ok(
    prompt.includes("the Satellite workflow's `read_structure` judgment point") &&
      prompt.includes('"claim": "We removed Tests to reduce computational costs."') &&
      prompt.includes('"reader":'),
    "(a) the kept prompt is not the structure reading over the claims and the Persona",
  );
}

// (b) TWO TOPS: the apex call, the apex appended and named, six Legs.
{
  const atB = briefAt();
  const r = add(atB, ADD, "chain");
  const e = existsSync(S.satellitesPathFor(atB)) ? readFile(atB).satellites[0] : {};
  ok(r.status === 0 && r.calls === 2, `(b) add exited ${r.status} after ${r.calls} call(s), not 0 after 2: ${r.err}`);
  ok(
    e.structure && e.structure.relations.length === 6 && e.structure.attains_thesis === "c_6",
    `(b) the apex is not appended as c_6 and named by attains_thesis: ${JSON.stringify(e.structure && e.structure.attains_thesis)}`,
  );
  ok(
    e.structure &&
      isDeepStrictEqual(e.structure.relations[5].relates, ["c_4", "c_5"]) &&
      e.structure.relations[5].holds === "Costs decide which checks run.",
    "(b) the appended apex is not the answered one over c_4 and c_5",
  );
  ok((e.reader_path || []).length === 6, `(b) the entry has ${(e.reader_path || []).length} Legs, not 6`);
}

// (c) TWO PARTS: exit 1, both printed as sentences, nothing written.
{
  const atC = briefAt();
  const r = add(atC, ADD, "parts");
  ok(r.status === 1 && r.calls === 1, `(c) add exited ${r.status} after ${r.calls} call(s), not 1 after 1`);
  ok(
    r.out.includes("The cost meets the suite.") &&
      r.out.includes("The check meets the runner.") &&
      r.err.includes("2 structures"),
    `(c) the two parts are not printed as sentences: ${r.out} ${r.err}`,
  );
  ok(!existsSync(S.satellitesPathFor(atC)), "(c) a file was written for a reading in two parts");
}

// (d) A REFUSED READING: three calls, the refusal printed, nothing written.
for (const [mode, says] of [
  ["single", "at least one higher-order relation"],
  ["idle", "U2"],
]) {
  const atD = briefAt();
  const r = add(atD, ADD, mode);
  ok(r.status === 1 && r.calls === 3, `(d) ${mode}: add exited ${r.status} after ${r.calls} call(s), not 1 after 3`);
  ok(r.err.includes(says) && r.err.includes("refused 3 times"), `(d) ${mode}: the refusal is not printed: ${r.err}`);
  ok(!existsSync(S.satellitesPathFor(atD)), `(d) ${mode}: a file was written for a refused reading`);
}

// (e) A REFUSED ARGUMENT: exit 1 naming it, no call, nothing written.
for (const [label, args, says] of [
  ["a journey address", ["--before", "s1", "--as", "Background", "coding::journey/a-trip"], "coding::journey/a-trip"],
  ["an address not served", ["--before", "s1", "--as", "Background", "coding::lesson/absent"], "coding::lesson/absent"],
  ["a --before naming no Leg", ["--before", "s9", "--as", "Background", LESSON], "s9"],
  ["an --as outside the three", ["--before", "s1", "--as", "Evidence", LESSON], "Evidence"],
]) {
  const atE = briefAt();
  const r = add(atE, args);
  ok(
    r.status === 1 && r.calls === 0 && r.err.includes(says),
    `(e) ${label}: exit ${r.status}, ${r.calls} call(s): ${r.err}`,
  );
  ok(!existsSync(S.satellitesPathFor(atE)), `(e) ${label}: a file was written`);
}

// (f) RUN AGAIN over the file, a comment written by hand in it: s_1 and the head kept, s_2 appended.
const headText = readFileSync(S.satellitesPathFor(at), "utf8").replace(
  "rst_relation:",
  "# kept by hand\n    rst_relation:",
);
writeFileSync(S.satellitesPathFor(at), headText);
const second = add(at, ADD);
const two = readFile(at);
ok(second.status === 0, `(f) the second add exited ${second.status}: ${second.err}`);
ok(
  isDeepStrictEqual(
    two.satellites.map((e) => e.id),
    ["s_1", "s_2"],
  ) && isDeepStrictEqual(two.satellites[0], s1),
  `(f) the file does not hold s_1 unchanged and then s_2: ${two.satellites.map((e) => e.id).join(", ")}`,
);
ok(readFileSync(S.satellitesPathFor(at), "utf8").startsWith(headText), "(f) the file's head is not kept");

// (g) THE WHOLE READER PATH: s_1's Legs, s_2's, then the Brief's three; the Brief's alone with no file.
{
  const brief = C.readBriefFiles(at).record;
  const whole = S.wholeReaderPath(brief, S.readSatellites(at, brief));
  ok(
    isDeepStrictEqual(
      whole.map((l) => l.leg_id),
      ["s_1.L1", "s_1.L2", "s_1.L3", "s_2.L1", "s_2.L2", "s_2.L3", "s1", "s2", "s3"],
    ),
    `(g) the whole Reader Path is ${whole.map((l) => l.leg_id).join(", ")}`,
  );
  ok(
    whole[0].satellite === "s_1" &&
      whole[0].rst_relation === "Background" &&
      whole[0].text === "The cost meets the suite." &&
      whole[6].satellite === null &&
      whole[6].text === "The rule starts the guard.",
    `(g) a Leg does not carry its entry, relation name and sentence: ${JSON.stringify([whole[0], whole[6]])}`,
  );
  const bare = briefAt();
  const alone = S.wholeReaderPath(C.readBriefFiles(bare).record, S.readSatellites(bare, brief));
  ok(
    isDeepStrictEqual(
      alone.map((l) => l.leg_id),
      ["s1", "s2", "s3"],
    ),
    "(g) with no file the path is not the Brief's three Legs",
  );
}

// (h) THE CHECK VERB: no file prints what it prints today; the written file prints the whole path.
{
  const bare = check(briefAt());
  ok(
    bare.status === 0 && bare.out === `${BRIEF_LINES.join("\n")}\n`,
    `(h) a Brief with no file does not print its Legs alone: ${bare.out}`,
  );
  const written = check(at);
  ok(written.status === 0, `(h) the written file was refused: ${written.err}`);
  const lines = written.out.trim().split("\n");
  ok(
    lines.length === 9 &&
      lines[0] === "s_1.L1\tc_1\tThe cost meets the suite.\ts_1 Background" &&
      isDeepStrictEqual(lines.slice(6), BRIEF_LINES),
    `(h) the check does not print the whole Reader Path with the fourth field: ${written.out}`,
  );
}
{
  const atH = briefAt();
  const entry = JSON.parse(JSON.stringify(s1));
  entry.reader_path = entry.reader_path.filter((l) => l.leg_id !== "s_1.L2");
  entry.structure.relations[0].holds = "The {r_1} weighs on the {r_2}, reworded.";
  writeFileSync(S.satellitesPathFor(atH), stringifyYaml({ satellites: [entry] }));
  const r = check(atH);
  ok(
    r.status === 0 && r.out.includes("s_1.L1\tc_1\tThe cost weighs on the suite, reworded.\ts_1 Background"),
    `(h) a Leg removed and a sentence reworded by hand was not passed with the new sentence: ${r.err}${r.out}`,
  );
  ok(!r.out.includes("s_1.L2"), "(h) the removed Leg is still printed");
}
const entryOf = (f) => {
  const e = JSON.parse(JSON.stringify(s1));
  f(e);
  return { satellites: [e] };
};
const REFUSALS = [
  ["a key beside `satellites`", { satellites: [], more: 1 }, ["one key"]],
  ["`satellites` not a list", { satellites: {} }, ["not a list"]],
  ["two entries sharing an id", { satellites: [s1, s1] }, ["s_1", "share"]],
  ["an id not s_<n>", entryOf((e) => (e.id = "x1")), ['"x1"', "s_<n>"]],
  ["an rst_relation outside the three", entryOf((e) => (e.rst_relation = "Evidence")), ["s_1", "Evidence"]],
  ["a before naming no Leg", entryOf((e) => (e.before = "s9")), ["s_1", "s9"]],
  ["a relation with no holds", entryOf((e) => delete e.structure.relations[1].holds), ["s_1", "c_2", "`holds`"]],
  ["a Leg naming no relation", entryOf((e) => (e.reader_path[0].relation = "c_9")), ["s_1", "s_1.L1", "c_9"]],
  ["the apex's Leg removed", entryOf((e) => (e.reader_path = e.reader_path.slice(0, 2))), ["s_1", "c_3", "no Leg"]],
];
for (const [label, file, names] of REFUSALS) {
  const atR = briefAt();
  writeFileSync(S.satellitesPathFor(atR), stringifyYaml(file));
  const r = check(atR);
  ok(
    r.status === 1 && names.every((x) => r.err.includes(x)),
    `(h) ${label} was not refused naming ${names.join(", ")}: ${r.status} ${r.err}`,
  );
}
// A relation between three Roles in an entry is refused by the one reader, and the check verb stops (kogaki#1969).
{
  const atT = briefAt();
  const file = entryOf((e) => (e.structure.relations[0].between = e.structure.roles.slice(0, 3).map((r) => r.id)));
  writeFileSync(S.satellitesPathFor(atT), stringifyYaml(file));
  const read = S.readSatellites(atT, C.readBriefFiles(atT).record);
  const r = check(atT);
  ok(
    typeof read.error === "string" &&
      read.error.includes("s_1") &&
      read.error.includes('"c_1"') &&
      read.error.includes("does not name exactly two Roles") &&
      r.status === 1,
    `(h) an entry's relation between three Roles was not refused by readSatellites and check: ${read.error} ${r.status}`,
  );
}

// (i) THE BRIEF'S FILES, THEIR HASH AND A PLAN MADE BEFORE ARE UNTOUCHED BY `add`.
{
  ok(isDeepStrictEqual(texts(at), briefBefore), "(i) the Brief's three texts or their hash changed under add");
  const atI = briefAt();
  const planPath = C.paragraphPlanPathFor(atI);
  const before = C.readBriefFiles(atI);
  const legs = before.record.reader_path.map((l) => ({ leg_id: l.leg_id }));
  writeFileSync(
    planPath,
    C.paragraphPlanRecordText(C.paragraphPlanRecord({ briefPath: atI, briefText: before.text, legs })),
  );
  const r = add(atI, ADD);
  const view = paragraphPlanView(planPath);
  ok(r.status === 0 && !view.error, `(i) a plan made before add was found stale: ${view.error}`);
}

// (j) A STATUTE (kogaki#1989): read by its headline beside a Lesson, and named among the accepted forms.
{
  const atJ = briefAt();
  const r = add(atJ, ["--before", "s1", "--as", "Background", STATUTE, LESSON]);
  const e = existsSync(S.satellitesPathFor(atJ)) ? readFile(atJ).satellites[0] || {} : {};
  ok(
    r.status === 0 &&
      e.id === "s_1" &&
      isDeepStrictEqual(e.sources, [
        { id: "U1", cite: `${STATUTE}@${"c".repeat(64)}`, claim: "Every check runs within a budget." },
        { id: "U2", cite: `${LESSON}@${"b".repeat(64)}`, claim: "A check that costs too much is dropped." },
      ]),
    `(j) add over a Statute and a Lesson does not write s_1 with both sources at their cites: ${r.err} ${JSON.stringify(e.sources)}`,
  );
  const atK = briefAt();
  const other = add(atK, ["--before", "s1", "--as", "Background", "coding::rule/a-rule"]);
  ok(
    other.status === 1 && other.calls === 0 && other.err.includes("<package>::statute/<local-name>"),
    `(j) an address of a Rule does not exit 1 naming the Statute's form: ${other.status} ${other.err}`,
  );
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  console.log(`satellite: ${fails.length} of ${cases} case(s) failed`);
  process.exit(1);
}
console.log(`satellite: ${cases} case(s) pass`);
