// The cases of checks/check-rs.sh (kogaki#1970), each stated in that member's `contract` in checks/registry.json:
// (a) `create` over two Lessons writes one RS file; (b) the instruction carries the sources and no Persona; (c) a
// Decision is read by its headline; (d) two structures are two candidates, either written by `--reading --apex` with no
// call; (e) a source no Relation is from is left out; (f) a refused reading is
// asked three times, and a mended one is written; (g) a refused argument or an unserved address makes no call; (h) a
// second file of the same name ends `_2`; (i) the `check` verb; (j) `create --statement` reads a written statement and
// keeps the cites it rests on (kogaki#1975). A stub stands in for the model and a file for the gateway.
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
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
const { parseYaml, stringifyYaml } = await import(pathToFileURL(join(repo, "src/yaml.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "rs-"));
const rsDir = join(root, "rs");

// THE SERVED UNITS, a file in place of the gateway.
const L1 = "coding::lesson/costly-checks";
const L2 = "coding::lesson/hour-long-suite";
const D1 = "coding::decision/cut-tests";
const L3 = "coding::lesson/budget-hours";
const J1 = "coding::journey/a-slow-week";
const TEXT = {
  [J1]: "The week the suite slowed, the team stopped running it.",
  [L1]: "A check that costs too much is dropped. Then no one runs it.",
  [L2]: "A suite that runs for an hour costs too much.\nThe team cuts it.",
  [D1]: "**We removed Tests to reduce computational costs.** The suite ran for an hour.",
  [L3]: "A budget limits the hours of a check.",
};
const cite = (a, c) => `${a}@${c.repeat(64)}`;
const units = join(root, "units.json");
writeFileSync(
  units,
  JSON.stringify({
    [L1]: { cite: cite(L1, "a"), text: TEXT[L1] },
    [L2]: { cite: cite(L2, "b"), text: TEXT[L2] },
    [D1]: { cite: cite(D1, "c"), text: TEXT[D1] },
    [L3]: { cite: cite(L3, "d"), text: TEXT[L3] },
    [J1]: { cite: cite(J1, "e"), text: TEXT[J1] },
  }),
);

// THE STUB: answers as STUB_MODE says, counting its calls in STUB_COUNT and keeping the last prompt in STUB_PROMPT.
// A mode `a>b` answers `a` at the first call and `b` after.
const stub = join(root, "stub.mjs");
writeFileSync(
  stub,
  `#!/usr/bin/env node
import { readFileSync, appendFileSync, writeFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("stub 1"); process.exit(0); }
const prompt = readFileSync(0, "utf8");
appendFileSync(process.env.STUB_COUNT, "x");
writeFileSync(process.env.STUB_PROMPT, prompt);
const n = readFileSync(process.env.STUB_COUNT, "utf8").length;
const [first, then] = process.env.STUB_MODE.split(">");
const mode = n === 1 || !then ? first : then;
const ins = (source, words, attributes = []) => ({ source, words, attributes });
const role = (name, ...entries) => ({ name, context: "A kind of " + name + ".", in: entries });
const rel = (name, a, b, from, holds) => ({ name, holds: holds || "The {" + a + "} meets the {" + b + "}.", from, between: [a, b] });
const high = (name, x, y, from) => ({ name, holds: "Where the {check} costs too much, it goes.", from, relates: [x, y] });
const ROLES = [
  role("check", ins("S1", "check", ["costs too much"]), ins("S2", "suite", ["runs for an hour"])),
  role("runner", ins("S1", "no one")),
  role("team", ins("S2", "team")),
];
const READINGS = {
  two: { roles: ROLES, relations: [rel("skips", "runner", "check", ["S1"]), rel("cuts", "team", "check", ["S1", "S2"]),
    high("costly", "skips", "cuts", ["S1", "S2"])] },
  single: { roles: [role("tests", ins("S1", "Tests")), role("costs", ins("S1", "computational costs"))],
    relations: [rel("trimmed", "tests", "costs", ["S1"], "The {tests} are removed to reduce the {costs}.")] },
  stray: { roles: [...ROLES, role("suite", ins("S2", "suite")), role("hour", ins("S2", "hour"))],
    relations: [rel("skips", "runner", "check", ["S1"]), rel("cuts", "team", "check", ["S1"]),
    { name: "costly", holds: "Where the {check} runs an {hour}, it goes.", from: ["S1"], relates: ["skips", "cuts"] },
    rel("lasts", "suite", "hour", ["S2"])] },
  apart: { roles: [role("check", ins("S1", "check", ["costs too much"]), ins("S2", "suite", ["runs for an hour"]),
    ins("S3", "check")), ...ROLES.slice(1), role("budget", ins("S3", "budget")), role("hours", ins("S3", "hours"))],
    relations: [rel("skips", "runner", "check", ["S1"]), rel("cuts", "team", "check", ["S1", "S2"]),
    high("costly", "skips", "cuts", ["S1", "S2"]), rel("limits", "budget", "hours", ["S3"])] },
  over: { roles: ROLES, relations: [rel("skips", "runner", "check", ["S1"]), rel("cuts", "team", "check", ["S1"]),
    high("costly", "skips", "cuts", ["S1"])] },
  three: { roles: ROLES, relations: [{ name: "all", holds: "The {runner} and the {team} meet the {check}.", from: ["S1"],
    between: ["runner", "team", "check"] }] },
  words: { roles: [role("check", ins("S1", "widget")), role("runner", ins("S1", "no one"))],
    relations: [rel("skips", "runner", "check", ["S1", "S2"])] },
  idle: { roles: [...ROLES, role("hour", ins("S2", "hour"))], relations: [rel("skips", "runner", "check", ["S1"]),
    rel("cuts", "team", "check", ["S1", "S2"]), high("costly", "skips", "cuts", ["S1", "S2"])] },
  stated: { roles: [role("check", ins("S1", "slow check")), role("team", ins("S1", "team"))],
    relations: [rel("drops", "team", "check", ["S1"], "The {team} drops the {check}.")] },
  "stated-words": { roles: [role("check", ins("S1", "widget")), role("team", ins("S1", "team"))],
    relations: [rel("drops", "team", "check", ["S1"])] },
  "stated-two": { roles: [role("check", ins("S1", "slow check")), role("team", ins("S1", "team")),
    role("runner", ins("S1", "No one"))], relations: [rel("drops", "team", "check", ["S1"]),
    rel("skips", "runner", "check", ["S1"])] },
};
console.log(JSON.stringify({ result: JSON.stringify(READINGS[mode]) }));
`,
);
chmodSync(stub, 0o755);

const count = join(root, "count");
const promptFile = join(root, "prompt.txt");
const env = (mode, dir = rsDir) => ({
  ...process.env,
  KOGAKI_JUDGE_CLI: stub,
  KOGAKI_RS_RUNS: join(root, "runs"),
  KOGAKI_RS_UNITS: units,
  KOGAKI_RS_DIR: dir,
  STUB_COUNT: count,
  STUB_PROMPT: promptFile,
  STUB_MODE: mode,
});
const rs = (args, mode = "two", dir = rsDir) => {
  writeFileSync(count, "");
  const r = spawnSync(process.execPath, ["src/rs.mjs", ...args], {
    encoding: "utf8",
    timeout: 60000,
    env: env(mode, dir),
  });
  return { status: r.status, out: r.stdout, err: r.stderr, calls: readFileSync(count, "utf8").length };
};
const files = () => (existsSync(rsDir) ? readdirSync(rsDir).sort() : []);
const readFile = (name) => parseYaml(readFileSync(join(rsDir, name), "utf8"), name);

// (a) TWO LESSONS, ONE RELATION OVER TWO: one call, one file named after the top Relation.
const a = rs(["create", L1, L2]);
ok(a.status === 0, `(a) create exited ${a.status}: ${a.out}${a.err}`);
ok(a.calls === 1, `(a) create made ${a.calls} call(s), not 1`);
ok(isDeepStrictEqual(files(), ["costly.yaml"]), `(a) rs/ does not hold costly.yaml alone: ${files()}`);
const fa = existsSync(join(rsDir, "costly.yaml")) ? readFile("costly.yaml") : {};
ok(
  isDeepStrictEqual(Object.keys(fa), ["sources", "roles", "relations"]),
  `(a) the file does not hold the three keys alone: ${Object.keys(fa)}`,
);
ok(
  isDeepStrictEqual(fa.sources, [
    { id: "S1", cite: cite(L1, "a"), text: TEXT[L1] },
    { id: "S2", cite: cite(L2, "b"), text: TEXT[L2] },
  ]),
  `(a) the sources are not the two Lessons at their cites with their whole texts: ${JSON.stringify(fa.sources)}`,
);
ok(
  isDeepStrictEqual(
    (fa.roles || []).map((r) => [r.id, r.name, r.in.map((e) => e.source)]),
    [
      ["r_1", "check", ["S1", "S2"]],
      ["r_2", "runner", ["S1"]],
      ["r_3", "team", ["S2"]],
    ],
  ),
  `(a) the Roles do not carry one \`in\` entry per source that speaks of them: ${JSON.stringify(fa.roles)}`,
);
ok(
  isDeepStrictEqual(fa.relations, [
    { id: "c_1", name: "skips", holds: "The {r_2} meets the {r_1}.", from: ["S1"], between: ["r_2", "r_1"] },
    { id: "c_2", name: "cuts", holds: "The {r_3} meets the {r_1}.", from: ["S1", "S2"], between: ["r_3", "r_1"] },
    {
      id: "c_3",
      name: "costly",
      holds: "Where the {r_1} costs too much, it goes.",
      from: ["S1", "S2"],
      relates: ["c_1", "c_2"],
    },
  ]),
  `(a) the Relations are not the three with minted ids: ${JSON.stringify(fa.relations)}`,
);
const aLines = a.out.trim().split("\n");
ok(
  isDeepStrictEqual(aLines, [
    `written: ${join(rsDir, "costly.yaml")}`,
    "apex: c_3 Where the check costs too much, it goes.",
    "depth: 2",
    `source: S1 ${cite(L1, "a")}`,
    `source: S2 ${cite(L2, "b")}`,
  ]),
  `(a) create does not print written, apex, depth and two source lines: ${JSON.stringify(aLines)}`,
);
ok(readFileSync(join(rsDir, "costly.yaml"), "utf8").startsWith("# "), "(a) the file does not open with a comment");
ok(
  existsSync(join(root, "runs")) && readdirSync(join(root, "runs")).length === 1,
  "(a) the call was not kept under the runs root",
);

// (b) THE INSTRUCTION carries the two sources' texts and no Persona.
const prompt = readFileSync(promptFile, "utf8");
ok(
  prompt.includes(JSON.stringify(TEXT[L1])) && prompt.includes(JSON.stringify(TEXT[L2])),
  "(b) the instruction does not carry the two sources' texts",
);
ok(!/persona/i.test(prompt), "(b) the instruction carries the word Persona");

// (c) A DECISION IS READ BY ITS HEADLINE, and one Relation among two Roles is written at depth 1.
const c = rs(["create", D1], "single");
ok(c.status === 0 && c.out.includes("\ndepth: 1\n"), `(c) create did not print depth: 1: ${c.status} ${c.out}${c.err}`);
const fc = existsSync(join(rsDir, "trimmed.yaml")) ? readFile("trimmed.yaml") : { sources: [] };
ok(
  isDeepStrictEqual(fc.sources, [
    { id: "S1", cite: cite(D1, "c"), text: "We removed Tests to reduce computational costs." },
  ]),
  `(c) the Decision's source is not its headline: ${JSON.stringify(fc.sources)}`,
);

// (d) TWO STRUCTURES ARE TWO CANDIDATES: one call, nothing written, both printed, the larger first; then each is
// written from the kept reading with no call, holding only the Units it adopts.
{
  const dir = join(root, "rs-candidates");
  const inDir = () => (existsSync(dir) ? readdirSync(dir).sort() : []);
  const r = rs(["create", L1, L2, L3], "apart", dir);
  const lines = r.out.trim().split("\n");
  ok(r.status === 0 && r.calls === 1 && inDir().length === 0, `(d) ${r.status} ${r.calls} call(s) ${inDir()} ${r.out}`);
  ok(
    lines[0] === "candidates: 2" && /^reading: \S+$/.test(lines[1] || ""),
    `(d) no candidates and reading lines: ${r.out}`,
  );
  const stamp = (lines[1] || "").slice("reading: ".length);
  ok(
    isDeepStrictEqual(lines.slice(2), [
      "1: costly: Where the check costs too much, it goes.",
      "\tdepth: 2",
      `\tadopts: ${cite(L1, "a")}`,
      `\tadopts: ${cite(L2, "b")}`,
      "\tleaves out: 1",
      "\tunder: skips: The runner meets the check.",
      "\tunder: cuts: The team meets the check.",
      "2: limits: The budget meets the hours.",
      "\tdepth: 1",
      `\tadopts: ${cite(L3, "d")}`,
      "\tleaves out: 2",
    ]),
    `(d) the two candidates are not printed in order with depth, sources and the Relations under them: ${r.out}`,
  );
  const one = rs(["create", "--reading", stamp, "--apex", "1"], "apart", dir);
  ok(one.status === 0 && one.calls === 0, `(d) --apex 1: ${one.status} ${one.calls} call(s) ${one.out}${one.err}`);
  ok(isDeepStrictEqual(inDir(), ["costly.yaml"]), `(d) --apex 1 did not write costly.yaml alone: ${inDir()}`);
  const f1 = inDir().includes("costly.yaml") ? parseYaml(readFileSync(join(dir, "costly.yaml"), "utf8"), "c") : {};
  ok(
    isDeepStrictEqual(
      (f1.sources || []).map((x) => x.id),
      ["S1", "S2"],
    ) && !(f1.roles || []).some((x) => x.in.some((e) => e.source === "S3")),
    `(d) --apex 1 holds a source or an \`in\` entry of the third Lesson: ${JSON.stringify(f1)}`,
  );
  ok(
    isDeepStrictEqual(f1, fa),
    `(d) --apex 1 is not the file written over the two Lessons alone: ${JSON.stringify(f1)}`,
  );
  ok(
    isDeepStrictEqual(one.out.trim().split("\n"), [
      `written: ${join(dir, "costly.yaml")}`,
      "apex: c_3 Where the check costs too much, it goes.",
      "depth: 2",
      `source: S1 ${cite(L1, "a")}`,
      `source: S2 ${cite(L2, "b")}`,
      `left out: ${cite(L3, "d")}`,
    ]),
    `(d) --apex 1 does not print written, apex, depth, two sources and one left out: ${one.out}`,
  );
  const first = readFileSync(join(dir, "costly.yaml"), "utf8");
  const two = rs(["create", "--reading", stamp, "--apex", "2"], "apart", dir);
  const f2 = existsSync(join(dir, "limits.yaml")) ? parseYaml(readFileSync(join(dir, "limits.yaml"), "utf8"), "l") : {};
  ok(
    two.status === 0 &&
      two.calls === 0 &&
      isDeepStrictEqual(f2.sources, [{ id: "S1", cite: cite(L3, "d"), text: TEXT[L3] }]) &&
      isDeepStrictEqual(f2.relations, [
        { id: "c_1", name: "limits", holds: "The {r_1} meets the {r_2}.", from: ["S1"], between: ["r_1", "r_2"] },
      ]),
    `(d) --apex 2 does not write one source and one Relation: ${two.out}${two.err} ${JSON.stringify(f2)}`,
  );
  ok(readFileSync(join(dir, "costly.yaml"), "utf8") === first, "(d) --apex 2 changed the first file");
  for (const [label, args] of [
    ["a stamp no reading is kept under", ["--reading", "2000-01-01T00-00-00-000Z", "--apex", "1"]],
    ["a number no candidate has", ["--reading", stamp, "--apex", "3"]],
    ["an address beside --reading", ["--reading", stamp, "--apex", "1", L1]],
  ]) {
    const before = inDir();
    const x = rs(["create", ...args], "apart", dir);
    ok(
      x.status === 1 && x.out.startsWith("stopped: arguments\n") && x.calls === 0 && isDeepStrictEqual(inDir(), before),
      `(d) ${label}: ${x.status} ${x.calls} call(s) ${x.out}`,
    );
  }
}

// (d) A CANDIDATE WHOSE SENTENCE NAMES A ROLE IT DOES NOT KEEP stops with `form` naming the Role, and writes nothing.
{
  const dir = join(root, "rs-stray");
  const r = rs(["create", L1, L2], "stray", dir);
  const stamp = (r.out.split("\n")[1] || "").slice("reading: ".length);
  const x = rs(["create", "--reading", stamp, "--apex", "1"], "stray", dir);
  ok(
    x.status === 1 && x.out.startsWith("stopped: form\n") && x.out.includes("names the Role hour"),
    `(d) a stray Role did not stop form naming it: ${r.out} ${x.status} ${x.out}${x.err}`,
  );
  ok(x.calls === 0 && !existsSync(dir), `(d) a stray Role made a call or wrote a file: ${x.calls}`);
}

// (e) A SOURCE NO RELATION IS FROM is left out of the one candidate, which is written at once.
{
  const dir = join(root, "rs-over");
  const r = rs(["create", L1, L2], "over", dir);
  const f = existsSync(join(dir, "costly.yaml")) ? parseYaml(readFileSync(join(dir, "costly.yaml"), "utf8"), "o") : {};
  ok(
    r.status === 0 &&
      r.calls === 1 &&
      isDeepStrictEqual(
        (f.sources || []).map((x) => x.cite),
        [cite(L1, "a")],
      ),
    `(e) the file was not written with the one source: ${r.status} ${r.out}${r.err}`,
  );
  ok(
    r.out
      .split("\n")
      .filter((l) => l.startsWith("left out: "))
      .join("|") === `left out: ${cite(L2, "b")}`,
    `(e) one left out line naming S2's cite is not printed: ${r.out}`,
  );
}

// (f) A REFUSED READING is asked three times; a mended one is written after two calls.
for (const [mode, says] of [
  ["three", "does not name exactly two"],
  ["words", '"widget" does not occur in the text of S1'],
  ["idle", "is named by no Relation's between"],
]) {
  const before = files();
  const r = rs(["create", L1, L2], mode);
  ok(
    r.status === 1 && r.out.startsWith("stopped: form\n") && r.out.includes(says),
    `(f) ${mode}: did not stop form with the refusal: ${r.out}`,
  );
  ok(r.calls === 3 && isDeepStrictEqual(files(), before), `(f) ${mode}: ${r.calls} call(s), or a file was written`);
}
{
  const r = rs(["create", "--name", "mended", L1, L2], "three>two");
  ok(r.status === 0 && r.calls === 2 && existsSync(join(rsDir, "mended.yaml")), `(f) mended: ${r.calls} ${r.out}`);
  ok(
    readFileSync(promptFile, "utf8").includes("does not name exactly two"),
    "(f) the second call does not carry the refusal",
  );
}

// (g) A REFUSED ARGUMENT OR AN UNSERVED ADDRESS: no call, nothing written.
for (const [label, args, key] of [
  ["no address", [], "arguments"],
  ["an address twice", [L1, L1], "arguments"],
  ["a journey address", [L1, "coding::journey/a-path"], "arguments"],
  ["a --name whose file exists", ["--name", "mended", L1], "arguments"],
  ["an unserved address", [L1, "coding::lesson/not-there"], "not-served"],
]) {
  const before = files();
  const r = rs(["create", ...args]);
  ok(
    r.status === 1 && r.out.startsWith(`stopped: ${key}\n`) && r.calls === 0 && isDeepStrictEqual(files(), before),
    `(g) ${label}: ${r.status} ${r.calls} call(s) ${r.out}`,
  );
}
{
  const r = rs(["create", L1, "coding::lesson/not-there"]);
  ok(r.out.includes("coding::lesson/not-there"), `(g) not-served does not name the address: ${r.out}`);
}

// (h) A SECOND FILE OF THE SAME NAME ends `_2`, and the first is left as it was.
{
  const first = readFileSync(join(rsDir, "costly.yaml"), "utf8");
  const r = rs(["create", L1, L2]);
  ok(r.status === 0 && existsSync(join(rsDir, "costly_2.yaml")), `(h) no costly_2.yaml: ${r.out}`);
  ok(readFileSync(join(rsDir, "costly.yaml"), "utf8") === first, "(h) the first file changed");
}

// (i) THE CHECK VERB over the written files, and over files edited by hand.
{
  const r = rs(["check"]);
  const lines = r.out.trim().split("\n");
  ok(r.status === 0 && lines.length === files().length, `(i) check did not pass every file: ${r.status} ${r.out}`);
  ok(
    lines.includes(
      `${join(rsDir, "costly.yaml")}\tapex c_3\tWhere the check costs too much, it goes.\tdepth 2\t2 sources, 3 roles, 3 relations`,
    ),
    `(i) check does not print the ApexRelation, depth and counts: ${r.out}`,
  );
  const edited = (label, mutate) => {
    const f = readFile("costly.yaml");
    mutate(f);
    const at = join(root, `${label}.yaml`);
    writeFileSync(at, stringifyYaml(f));
    return { at, r: rs(["check", at]) };
  };
  for (const [label, mutate, names] of [
    [
      "second-top",
      (f) =>
        f.relations.push({
          id: "c_4",
          name: "more",
          holds: "The {r_2} sees the {r_3}.",
          from: ["S1"],
          between: ["r_2", "r_3"],
        }),
      ["c_3", "c_4"],
    ],
    ["three-roles", (f) => (f.relations[0].between = ["r_1", "r_2", "r_3"]), ["c_1"]],
    ["names-nothing", (f) => (f.relations[2].relates = ["c_1", "c_9"]), ["c_3", "c_9"]],
  ]) {
    const { at, r } = edited(label, mutate);
    ok(
      r.status === 1 && r.out.includes(at) && names.every((x) => r.out.includes(x)),
      `(i) ${label}: check did not refuse naming the file and ${names.join(", ")}: ${r.status} ${r.out}`,
    );
  }
  const { r: rw } = edited("reworded", (f) => {
    f.relations[0].holds = "Nobody reaches for the {r_1}, said the {r_2}.";
    f.roles[0].in[0].words = "a costly check";
  });
  ok(rw.status === 0, `(i) a holds and a words reworded by hand are refused: ${rw.out}`);
}

// (j) A WRITTEN STATEMENT (kogaki#1975): the statement alone is handed to the call, under S1, and the cites of the
// Units named beside it are kept under `rests_on`.
{
  const STATEMENT = "A slow check is dropped by the team.\nNo one runs it after that.";
  const said = join(root, "statement.txt");
  writeFileSync(said, `\n${STATEMENT}\n\n`);
  const dir = join(root, "rs-statement");
  const inDir = () => (existsSync(dir) ? readdirSync(dir).sort() : []);
  const at = (n) => parseYaml(readFileSync(join(dir, n), "utf8"), n);
  const lastInput = () => {
    const runs = join(root, "runs");
    const last = readdirSync(runs).sort().at(-1);
    return JSON.parse(readFileSync(join(runs, last, "call-1", "input.json"), "utf8"));
  };
  const r = rs(["create", "--statement", said, "--name", "x", L1, J1], "stated", dir);
  ok(r.status === 0 && r.calls === 1, `(j) create --statement: ${r.status} ${r.calls} call(s) ${r.out}${r.err}`);
  ok(
    isDeepStrictEqual(lastInput(), { sources: [{ id: "S1", text: STATEMENT }] }),
    `(j) the call's input is not the one source S1 holding the statement: ${JSON.stringify(lastInput())}`,
  );
  const handed = readFileSync(promptFile, "utf8");
  ok(
    !handed.includes(TEXT[L1]) && !handed.includes(TEXT[J1]),
    "(j) the instruction carries a Unit's text beside the statement",
  );
  ok(isDeepStrictEqual(inDir(), ["x.yaml"]), `(j) rs/ does not hold x.yaml alone: ${inDir()}`);
  const fx = inDir().includes("x.yaml") ? at("x.yaml") : {};
  ok(
    isDeepStrictEqual(Object.keys(fx), ["sources", "roles", "relations", "rests_on"]),
    `(j) the file does not hold the three keys and rests_on: ${Object.keys(fx)}`,
  );
  ok(
    isDeepStrictEqual(fx.sources, [{ id: "S1", text: STATEMENT }]),
    `(j) the sources are not S1 with the statement and no cite: ${JSON.stringify(fx.sources)}`,
  );
  ok(
    isDeepStrictEqual(fx.rests_on, [cite(L1, "a"), cite(J1, "e")]),
    `(j) rests_on is not the two cites in the order given: ${JSON.stringify(fx.rests_on)}`,
  );
  ok(
    isDeepStrictEqual(r.out.trim().split("\n"), [
      `written: ${join(dir, "x.yaml")}`,
      "apex: c_1 The team drops the check.",
      "depth: 1",
      "source: S1 statement",
      `rests on: ${cite(L1, "a")}`,
      `rests on: ${cite(J1, "e")}`,
    ]),
    `(j) create --statement does not print written, apex, depth, the statement and two rests on lines: ${r.out}`,
  );
  ok(
    /^# [^\n]*statement/.test(inDir().includes("x.yaml") ? readFileSync(join(dir, "x.yaml"), "utf8") : ""),
    "(j) the file's head comment does not say it was read from a statement",
  );

  const bare = rs(["create", "--statement", said, "--name", "y"], "stated", dir);
  const fy = inDir().includes("y.yaml") ? at("y.yaml") : {};
  ok(
    bare.status === 0 && isDeepStrictEqual(fy.rests_on, []) && !bare.out.includes("rests on:"),
    `(j) with no address rests_on is not empty, or a rests on line is printed: ${bare.out}${bare.err}`,
  );

  const mended = rs(["create", "--statement", said, "--name", "z", L1], "stated-words>stated", dir);
  ok(
    mended.status === 0 && mended.calls === 2 && inDir().includes("z.yaml"),
    `(j) a words not in the statement was not asked again and mended: ${mended.calls} ${mended.out}${mended.err}`,
  );
  ok(
    readFileSync(promptFile, "utf8").includes("does not occur in the text of S1"),
    "(j) the refusal put back does not name S1",
  );

  const twoDir = join(root, "rs-statement-two");
  const two = rs(["create", "--statement", said, L1], "stated-two", twoDir);
  const twoLines = two.out.trim().split("\n");
  ok(
    two.status === 0 && two.calls === 1 && twoLines[0] === "candidates: 2" && !existsSync(twoDir),
    `(j) two Relations no other names are not two candidates with nothing written: ${two.out}`,
  );
  const stamp = (twoLines[1] || "").slice("reading: ".length);
  const chosen = rs(["create", "--reading", stamp, "--apex", "2"], "stated-two", twoDir);
  const fc = existsSync(join(twoDir, "skips.yaml"))
    ? parseYaml(readFileSync(join(twoDir, "skips.yaml"), "utf8"), "s")
    : {};
  ok(
    chosen.status === 0 &&
      chosen.calls === 0 &&
      isDeepStrictEqual(fc.sources, [{ id: "S1", text: STATEMENT }]) &&
      isDeepStrictEqual(fc.rests_on, [cite(L1, "a")]),
    `(j) --apex 2 does not write S1 and the same rests_on with no call: ${chosen.out}${chosen.err} ${JSON.stringify(fc)}`,
  );

  const empty = join(root, "empty.txt");
  writeFileSync(empty, " \n\n");
  for (const [label, args, key] of [
    ["an unserved address", ["--statement", said, "coding::lesson/not-there"], "not-served"],
    ["--statement naming no file", ["--statement"], "arguments"],
    ["--statement naming a path that is no file", ["--statement", join(root, "absent.txt")], "arguments"],
    ["a statement file with no text", ["--statement", empty], "arguments"],
    ["--statement given twice", ["--statement", said, "--statement", said], "arguments"],
    ["an address of a Rule", ["--statement", said, "coding::rule/a-rule"], "arguments"],
  ]) {
    const before = inDir();
    const x = rs(["create", ...args], "stated", dir);
    ok(
      x.status === 1 && x.out.startsWith(`stopped: ${key}\n`) && x.calls === 0 && isDeepStrictEqual(inDir(), before),
      `(j) ${label}: ${x.status} ${x.calls} call(s) ${x.out}`,
    );
  }
  ok(!Object.hasOwn(fa, "rests_on"), "(j) the file create writes over Lessons carries rests_on");

  const mixed = (label, from, mutate) => {
    const f = parseYaml(readFileSync(from, "utf8"), label);
    mutate(f);
    const path = join(root, `${label}.yaml`);
    writeFileSync(path, stringifyYaml(f));
    return { path, r: rs(["check", path]) };
  };
  const xPath = join(dir, "x.yaml");
  for (const [label, mutate, says] of [
    ["cite-beside", (f) => (f.sources[0].cite = cite(L1, "a")), "carries a cite beside `rests_on`"],
    ["no-cite", (f) => delete f.rests_on, "carries no cite, and the file carries no `rests_on`"],
    ["two-sources", (f) => f.sources.push({ id: "S2", text: "More." }), "stands beside 2 sources"],
    ["bad-cite", (f) => (f.rests_on = ["coding::lesson/costly-checks"]), "is not <address>@<hash>"],
  ]) {
    const { path, r: m } = mixed(label, xPath, mutate);
    ok(
      m.status === 1 && m.out.includes(path) && m.out.includes(says),
      `(j) readRs does not refuse ${label} naming the file: ${m.status} ${m.out}`,
    );
  }
  const both = rs(["check", xPath, join(rsDir, "costly.yaml")]);
  ok(
    both.status === 0 &&
      isDeepStrictEqual(both.out.trim().split("\n"), [
        `${xPath}\tapex c_1\tThe team drops the check.\tdepth 1\t1 sources, 2 roles, 1 relations`,
        `${join(rsDir, "costly.yaml")}\tapex c_3\tWhere the check costs too much, it goes.\tdepth 2\t2 sources, 3 roles, 3 relations`,
      ]),
    `(j) check does not print one line for a file of each form: ${both.status} ${both.out}`,
  );
  ok(
    createHash("sha256").update(readFileSync("prompts/rs/read.prompt")).digest("hex") ===
      "1adc95917ca6bc933a97b6bed3b139f2550a84ed9f1e37d3d34a3579f9b09e2b",
    "(j) prompts/rs/read.prompt changed",
  );
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  console.log(`rs: ${fails.length} of ${cases} case(s) failed`);
  process.exit(1);
}
console.log(`rs: ${cases} case(s) pass`);
