// The cases of checks/check-analogy.sh (kogaki#1957), each stated in that member's `contract` in checks/registry.json:
// (a) `propose` over a Brief of three Legs writes six Bases, two telling each Leg; (b) run again, it keeps the six and
// appends six more; (c) an answer lacking a sentence is asked three times and the Leg gets no Base; (d) every call is
// kept; (e) the `check` verb with no file, with the written file, and each refusal of the file; (f) a ParagraphPlan
// made before a Base's sentence is edited is not found stale; (g) a Leg's `base` checked against the file (kogaki#1959).
// A stub stands in for the model.
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
const A = await imp("src/compose/analogy.mjs");
const { paragraphPlanView } = await imp("src/paragraph-plan/view.mjs");
const root = mkdtempSync(join(tmpdir(), "analogy-"));
const runs = join(root, "runs");

const STRUCTURE = {
  roles: [
    { id: "r_1", name: "rule", context: "A standing instruction.", attributes: [], claims: ["L1"] },
    {
      id: "r_2",
      name: "guard",
      context: "A watcher that stops what it does not know.",
      attributes: [],
      claims: ["L1"],
    },
    { id: "r_3", name: "request", context: "Something put forward to be done.", attributes: [], claims: ["L1"] },
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
  slug: "analogy",
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

// THE STUB: answers two Bases over the step after the prompt's last line, counting its calls in STUB_COUNT; with
// STUB_LACK set, its Bases give no sentence for that relation.
const stub = join(root, "stub.mjs");
writeFileSync(
  stub,
  `#!/usr/bin/env node
import { readFileSync, appendFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("stub 1"); process.exit(0); }
const prompt = readFileSync(0, "utf8");
appendFileSync(process.env.STUB_COUNT, "x");
const step = JSON.parse(prompt.slice(prompt.indexOf("The step:") + "The step:".length));
const lack = process.env.STUB_LACK || "";
const base = (k) => ({
  name: "field " + k,
  description: "A field of everyday life, number " + k + ".",
  roles: step.roles.map((r) => ({ role: r.id, thing: "thing " + r.id + " " + k })),
  relations: step.relations.filter((r) => r.id !== lack).map((r) => ({ relation: r.id, sentence: "It holds " + r.id + " " + k + "." })),
});
console.log(JSON.stringify({ result: JSON.stringify({ bases: [base(1), base(2)] }) }));
`,
);
chmodSync(stub, 0o755);

const count = join(root, "count");
const run = (args, env = {}) => {
  writeFileSync(count, "");
  const r = spawnSync(process.execPath, ["src/analogy.mjs", ...args], {
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, KOGAKI_JUDGE_CLI: stub, KOGAKI_ANALOGY_RUNS: runs, STUB_COUNT: count, ...env },
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
const readFile = (at) => parseYaml(readFileSync(A.analogyPathFor(at), "utf8"), "analogy.yaml");
const telling = (rec, relation) => A.basesTelling(rec, STRUCTURE, relation);

// (a) SIX BASES, TWO TELLING EACH LEG.
const at = briefAt();
const first = run(["propose", "--brief", at]);
ok(first.status === 0, `(a) propose exited ${first.status}: ${first.err}`);
ok(first.calls === 3, `(a) propose made ${first.calls} call(s) for three Legs, not 3`);
const one = existsSync(A.analogyPathFor(at)) ? readFile(at) : { bases: [] };
ok(one.bases.length === 6, `(a) analogy.yaml holds ${one.bases.length} Base(s), not 6`);
ok(
  isDeepStrictEqual(
    one.bases.map((b) => b.id),
    ["b_1", "b_2", "b_3", "b_4", "b_5", "b_6"],
  ),
  `(a) the Bases' ids are ${one.bases.map((b) => b.id).join(", ")}`,
);
ok(
  isDeepStrictEqual(
    ["c_1", "c_2", "c_3"].map((c) => telling(one, c)),
    [
      ["b_1", "b_2"],
      ["b_3", "b_4"],
      ["b_5", "b_6"],
    ],
  ),
  `(a) the Bases do not each tell one Leg: ${JSON.stringify(["c_1", "c_2", "c_3"].map((c) => telling(one, c)))}`,
);
ok(
  isDeepStrictEqual(one.bases[0], {
    id: "b_1",
    name: "field 1",
    description: "A field of everyday life, number 1.",
    roles: { r_1: "thing r_1 1", r_2: "thing r_2 1" },
    relations: { c_1: "It holds c_1 1." },
  }),
  `(a) the first Base is not the answer's first Base under b_1: ${JSON.stringify(one.bases[0])}`,
);

// (b) RUN AGAIN: THE SIX KEPT, SIX MORE APPENDED, the file's text kept as its head.
const beforeText = readFileSync(A.analogyPathFor(at), "utf8");
const second = run(["propose", "--brief", at]);
ok(second.status === 0, `(b) the second propose exited ${second.status}: ${second.err}`);
const two = readFile(at);
ok(two.bases.length === 12, `(b) analogy.yaml holds ${two.bases.length} Base(s) after the second run, not 12`);
ok(isDeepStrictEqual(two.bases.slice(0, 6), one.bases), "(b) the second run changed a Base the first wrote");
ok(
  isDeepStrictEqual(
    two.bases.slice(6).map((b) => b.id),
    ["b_7", "b_8", "b_9", "b_10", "b_11", "b_12"],
  ),
  `(b) the appended ids are ${two.bases
    .slice(6)
    .map((b) => b.id)
    .join(", ")}`,
);
ok(
  readFileSync(A.analogyPathFor(at), "utf8").startsWith(beforeText),
  "(b) the file's text before the run is not its head",
);
{
  const edited = beforeText.replace("description:", "# kept by hand\n    description:");
  const at2 = briefAt();
  writeFileSync(A.analogyPathFor(at2), edited);
  const r = run(["propose", "--brief", at2, "--leg", "s1"]);
  const text = readFileSync(A.analogyPathFor(at2), "utf8");
  ok(r.status === 0 && text.startsWith(edited), "(b) a comment written by hand did not survive an appending run");
}

// (c) AN ANSWER LACKING A SENTENCE: three calls, the Leg named, no Base for it.
{
  const at3 = briefAt();
  const r = run(["propose", "--brief", at3, "--leg", "s2"], { STUB_LACK: "c_2" });
  ok(r.status === 1, `(c) propose exited ${r.status} on a refused Leg, not 1`);
  ok(r.calls === 3, `(c) propose made ${r.calls} call(s) for the refused Leg, not 3`);
  ok(
    r.err.includes("Leg s2") && r.err.includes("refused 3 times") && r.err.includes("c_2"),
    `(c) the stop does not name the Leg, the count and the relation: ${r.err}`,
  );
  ok(!existsSync(A.analogyPathFor(at3)), "(c) a Base was written for the refused Leg");
  const at4 = briefAt();
  const all = run(["propose", "--brief", at4], { STUB_LACK: "c_2" });
  const rec = existsSync(A.analogyPathFor(at4)) ? readFile(at4) : { bases: [] };
  ok(
    all.status === 1 && rec.bases.length === 2 && telling(rec, "c_2").length === 0,
    `(c) over the whole Brief the stop wrote ${rec.bases.length} Base(s), ${telling(rec, "c_2").length} telling the refused Leg`,
  );
}

// (d) EVERY CALL IS KEPT under runs/analogy/<slug>/: its input, its prompt and its answer, a refused one its refusal.
{
  const legDirs = readdirSync(join(runs, "b3"))
    .map((s) => join(runs, "b3", s, "s2"))
    .filter((d) => existsSync(d));
  const calls = legDirs.flatMap((d) => readdirSync(d).map((c) => join(d, c)));
  ok(calls.length === 3, `(d) ${calls.length} call record(s) kept for the refused Leg, not 3`);
  ok(
    calls.every((c) => ["input.json", "prompt.txt", "answer.txt", "refusal.txt"].every((f) => existsSync(join(c, f)))),
    "(d) a kept call lacks its input, prompt, answer or refusal",
  );
  const prompt = calls.length ? readFileSync(join(calls[0], "prompt.txt"), "utf8") : "";
  ok(
    prompt.startsWith(readFileSync("prompts/analogy/propose-bases.prompt", "utf8")) && prompt.includes('"id": "r_2"'),
    "(d) the kept prompt is not the prompt file followed by the step",
  );
}

// (e) THE CHECK VERB: no file passes; the written file passes and names the Bases under each Leg.
{
  const bare = check(briefAt());
  ok(
    bare.status === 0 && !bare.out.includes("bases:"),
    `(e) a Brief with no analogy.yaml did not pass bare: ${bare.err}`,
  );
  const written = check(at);
  ok(written.status === 0, `(e) the written file was refused: ${written.err}`);
  ok(
    written.out.includes("s1\tc_1\t") && written.out.includes("\tbases: b_1, b_2, b_7, b_8\n"),
    `(e) the check does not print the Bases under the Leg: ${written.out}`,
  );
}
const REFUSALS = [
  ["two Bases share an id", (b) => [b[0], { ...b[1], id: "b_1" }], ["b_1", "share"]],
  ["a Base with no name", (b) => [{ ...b[0], name: undefined }, b[1]], ["b_1", "`name`"]],
  ["a Base with no description", (b) => [b[0], { ...b[1], description: "" }], ["b_2", "`description`"]],
  [
    "a roles key naming no Role",
    (b) => [{ ...b[0], roles: { ...b[0].roles, r_9: "x" } }, b[1]],
    ["b_1", "r_9", "Role"],
  ],
  [
    "a relations key naming no Relation",
    (b) => [b[0], { ...b[1], relations: { ...b[1].relations, c_9: "It." } }],
    ["b_2", "c_9", "Relation"],
  ],
  ["a told Relation lacking a Role's thing", (b) => [{ ...b[0], roles: { r_1: "x" } }, b[1]], ["b_1", "c_1", "r_2"]],
];
for (const [label, edit, names] of REFUSALS) {
  const atR = briefAt();
  const bases = edit(one.bases.slice(0, 2)).map((b) => JSON.parse(JSON.stringify(b)));
  writeFileSync(A.analogyPathFor(atR), stringifyYaml({ bases }));
  const r = check(atR);
  ok(
    r.status === 1 && names.every((x) => r.err.includes(x)),
    `(e) ${label} was not refused naming ${names.join(", ")}: ${r.status} ${r.err}`,
  );
}

// (f) A PARAGRAPHPLAN MADE BEFORE A BASE'S SENTENCE IS EDITED IS NOT FOUND STALE.
{
  const planPath = C.paragraphPlanPathFor(at);
  const before = C.readBriefFiles(at);
  const legs = before.record.reader_path.map((l) => ({ leg_id: l.leg_id }));
  writeFileSync(
    planPath,
    C.paragraphPlanRecordText(C.paragraphPlanRecord({ briefPath: at, briefText: before.text, legs })),
  );
  const ap = A.analogyPathFor(at);
  writeFileSync(ap, readFileSync(ap, "utf8").replace("It holds c_1 1.", "It holds the first relation, edited."));
  const view = paragraphPlanView(planPath);
  ok(!view.error, `(f) the view found a plan made before a Base's edit stale: ${view.error}`);
}

// (g) A LEG'S `base` (kogaki#1959): naming a Base that tells it passes; naming one that does not tell it, naming no Base
// of the file, or given with no file, is refused naming the Leg and the id.
{
  const withBase = (base, bases) => {
    const dir = join(root, "theses", `b${++n}`);
    mkdirSync(dir, { recursive: true });
    const atG = join(dir, "brief.yaml");
    const t = C.briefFileTexts({
      ...RECORD,
      reader_path: RECORD.reader_path.map((l) => (l.leg_id === "s1" ? { ...l, base } : l)),
    });
    writeFileSync(atG, t.brief);
    writeFileSync(join(dir, "structure.yaml"), t.structure);
    writeFileSync(join(dir, "reader-path.yaml"), t.readerPath);
    if (bases) writeFileSync(A.analogyPathFor(atG), stringifyYaml({ bases }));
    return check(atG);
  };
  const told = withBase("b_2", one.bases);
  ok(
    told.status === 0 && told.out.includes("\tbases: b_1, b_2\n"),
    `(g) a Leg naming a Base that tells it was refused: ${told.err}`,
  );
  const refused = [
    ["a Base that does not tell it", withBase("b_3", one.bases), ["s1", "b_3", "does not tell"]],
    ["no Base of the file", withBase("b_9", one.bases), ["s1", "b_9", "names no Base"]],
    ["a Base with no file", withBase("b_1", null), ["s1", "b_1", "names no Base"]],
  ];
  for (const [label, r, names] of refused)
    ok(
      r.status === 1 && names.every((x) => r.err.includes(x)),
      `(g) a Leg naming ${label} was not refused naming ${names.join(", ")}: ${r.status} ${r.err}`,
    );
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`analogy: ${cases} case(s) pass`);
