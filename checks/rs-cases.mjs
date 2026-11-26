// The cases of checks/check-rs.sh (kogaki#1970), each stated in that member's `contract` in checks/registry.json:
// (a) `create` over two Lessons writes one RS file; (b) the instruction carries the sources and no Persona; (c) a
// Decision is read by its headline; (d) two structures stop; (e) an unread source stops; (f) a refused reading is
// asked three times, and a mended one is written; (g) a refused argument or an unserved address makes no call; (h) a
// second file of the same name ends `_2`; (i) the `check` verb. A stub stands in for the model and a file for the
// gateway.
import { mkdtempSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync, chmodSync } from "node:fs";
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
const TEXT = {
  [L1]: "A check that costs too much is dropped. Then no one runs it.",
  [L2]: "A suite that runs for an hour costs too much.\nThe team cuts it.",
  [D1]: "**We removed Tests to reduce computational costs.** The suite ran for an hour.",
};
const cite = (a, c) => `${a}@${c.repeat(64)}`;
const units = join(root, "units.json");
writeFileSync(
  units,
  JSON.stringify({
    [L1]: { cite: cite(L1, "a"), text: TEXT[L1] },
    [L2]: { cite: cite(L2, "b"), text: TEXT[L2] },
    [D1]: { cite: cite(D1, "c"), text: TEXT[D1] },
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
  parts: { roles: ROLES, relations: [rel("skips", "runner", "check", ["S1"]), rel("cuts", "team", "check", ["S2"])] },
  unread: { roles: ROLES.slice(0, 2), relations: [rel("skips", "runner", "check", ["S1"])] },
  three: { roles: ROLES, relations: [{ name: "all", holds: "The {runner} and the {team} meet the {check}.", from: ["S1"],
    between: ["runner", "team", "check"] }] },
  words: { roles: [role("check", ins("S1", "widget")), role("runner", ins("S1", "no one"))],
    relations: [rel("skips", "runner", "check", ["S1", "S2"])] },
  idle: { roles: [...ROLES, role("hour", ins("S2", "hour"))], relations: [rel("skips", "runner", "check", ["S1"]),
    rel("cuts", "team", "check", ["S1", "S2"]), high("costly", "skips", "cuts", ["S1", "S2"])] },
};
console.log(JSON.stringify({ result: JSON.stringify(READINGS[mode]) }));
`,
);
chmodSync(stub, 0o755);

const count = join(root, "count");
const promptFile = join(root, "prompt.txt");
const env = (mode) => ({
  ...process.env,
  KOGAKI_JUDGE_CLI: stub,
  KOGAKI_RS_RUNS: join(root, "runs"),
  KOGAKI_RS_UNITS: units,
  KOGAKI_RS_DIR: rsDir,
  STUB_COUNT: count,
  STUB_PROMPT: promptFile,
  STUB_MODE: mode,
});
const rs = (args, mode = "two") => {
  writeFileSync(count, "");
  const r = spawnSync(process.execPath, ["src/rs.mjs", ...args], { encoding: "utf8", timeout: 60000, env: env(mode) });
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

// (d) TWO STRUCTURES: one call, both printed with their sources, nothing written.
{
  const before = files();
  const r = rs(["create", L1, L2], "parts");
  ok(
    r.status === 1 && r.out.startsWith("stopped: several-structures\n"),
    `(d) did not stop several-structures: ${r.out}`,
  );
  ok(
    r.out.includes("skips: The runner meets the check.") &&
      r.out.includes("cuts: The team meets the check.") &&
      r.out.includes("(from S1)") &&
      r.out.includes("(from S2)"),
    `(d) the two structures are not printed with their sources: ${r.out}`,
  );
  ok(r.calls === 1 && isDeepStrictEqual(files(), before), `(d) ${r.calls} call(s), or a file was written`);
}

// (e) AN UNREAD SOURCE: one call, S2 named, nothing written.
{
  const before = files();
  const r = rs(["create", L1, L2], "unread");
  ok(
    r.status === 1 && r.out.startsWith("stopped: unread-source\n") && r.out.includes("S2 "),
    `(e) did not stop unread-source naming S2: ${r.out}`,
  );
  ok(r.calls === 1 && isDeepStrictEqual(files(), before), `(e) ${r.calls} call(s), or a file was written`);
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

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  console.log(`rs: ${fails.length} of ${cases} case(s) failed`);
  process.exit(1);
}
console.log(`rs: ${cases} case(s) pass`);
