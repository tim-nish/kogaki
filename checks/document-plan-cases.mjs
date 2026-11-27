// The cases of checks/check-document-plan.sh (kogaki#1976), each stated in that member's `contract` in
// checks/registry.json: (a) `create` over three RS files writes one DocumentPlan; (b) the file holds two keys alone;
// (c) no model is called; (d) each refusal writes nothing; (e) `readDocumentPlan`; (f) the `check` verb; (g) the
// relation list. The RS files are written into a folder of the cases' own.
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
const { parseYaml, stringifyYaml } = await import(pathToFileURL(join(repo, "src/yaml.mjs")).href);
const { readDocumentPlan } = await import(pathToFileURL(join(repo, "src/document-plan/file.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "document-plan-"));
const rsDir = join(root, "rs");
const plansDir = join(root, "document-plans");
mkdirSync(rsDir);

// THE RS FILES: one Relation between two Roles each; `broken` holds no Relation, which readRs refuses.
const rsFile = (name, x, y) => ({
  sources: [{ id: "S1", cite: `coding::lesson/${name}@${"a".repeat(64)}`, text: `The ${x} meets the ${y}.` }],
  roles: [
    { id: "r_1", name: x, context: `A kind of ${x}.`, in: [{ source: "S1", words: x, attributes: [] }] },
    { id: "r_2", name: y, context: `A kind of ${y}.`, in: [{ source: "S1", words: y, attributes: [] }] },
  ],
  relations: [{ id: "c_1", name: "meets", holds: "The {r_1} meets the {r_2}.", from: ["S1"], between: ["r_1", "r_2"] }],
});
writeFileSync(join(rsDir, "a.yaml"), stringifyYaml(rsFile("a", "check", "runner")));
writeFileSync(join(rsDir, "b.yaml"), stringifyYaml(rsFile("b", "suite", "team")));
writeFileSync(join(rsDir, "c.yaml"), stringifyYaml(rsFile("c", "budget", "hour")));
writeFileSync(join(rsDir, "broken.yaml"), stringifyYaml({ ...rsFile("broken", "x", "y"), relations: [] }));

// A model binary that fails: any call to it would stop the command.
const failing = join(root, "failing.sh");
writeFileSync(failing, "#!/bin/sh\necho called >&2\nexit 3\n");
chmodSync(failing, 0o755);

const run = (args) => {
  const r = spawnSync(process.execPath, ["src/document-plan.mjs", ...args], {
    encoding: "utf8",
    timeout: 60000,
    env: { ...process.env, KOGAKI_RS_DIR: rsDir, KOGAKI_DOCUMENT_PLANS_DIR: plansDir, KOGAKI_JUDGE_CLI: failing },
  });
  return { status: r.status, out: r.stdout, err: r.stderr };
};
const plans = () => (existsSync(plansDir) ? readdirSync(plansDir).sort() : []);

// (a) THREE RS FILES, TWO CONNECTIONS: one file, `a` the top Nucleus.
const a = run([
  "create",
  "--name",
  "p",
  "--order",
  "a,b,c",
  "--connect",
  "b:evidence:a",
  "--connect",
  "c:background:b",
]);
ok(a.status === 0, `(a) create exited ${a.status}: ${a.out}${a.err}`);
ok(isDeepStrictEqual(plans(), ["p.yaml"]), `(a) document-plans/ does not hold p.yaml alone: ${plans()}`);
const p = existsSync(join(plansDir, "p.yaml")) ? parseYaml(readFileSync(join(plansDir, "p.yaml"), "utf8"), "p") : {};
ok(isDeepStrictEqual(p.order, ["a", "b", "c"]), `(a) the order is not a, b, c: ${JSON.stringify(p.order)}`);
ok(
  isDeepStrictEqual(p.connections, [
    { satellite: "b", relation: "evidence", nucleus: "a" },
    { satellite: "c", relation: "background", nucleus: "b" },
  ]),
  `(a) the connections are not the two given in order: ${JSON.stringify(p.connections)}`,
);
const lines = a.out.trim().split("\n");
ok(lines[0]?.startsWith("written: ") && lines[0].endsWith("p.yaml"), `(a) no written: line first: ${a.out}`);
ok(
  lines[1] === "top nucleus: a The check meets the runner.",
  `(a) the top nucleus line is not a with its sentence: ${a.out}`,
);
ok(
  lines[2] === "rs: 3" && lines[3] === "connections: 2" && lines.length === 4,
  `(a) the counts are not printed: ${a.out}`,
);

// (b) THE FILE HOLDS TWO KEYS ALONE.
ok(
  isDeepStrictEqual(Object.keys(p), ["order", "connections"]),
  `(b) the file does not hold order and connections alone: ${Object.keys(p)}`,
);

// (c) NO MODEL IS CALLED: the failing binary was never run.
ok(!a.err.includes("called"), `(c) create ran the model binary: ${a.err}`);

// (d) EACH REFUSAL EXITS 1, NAMES WHAT IT FOUND, AND WRITES NOTHING.
for (const [label, args, found] of [
  ["a name that exists", ["--name", "p", "--order", "a,b", "--connect", "b:evidence:a"], "p.yaml exists"],
  ["an RS with no file", ["--name", "q", "--order", "a,zed", "--connect", "zed:evidence:a"], "zed"],
  ["an RS file readRs refuses", ["--name", "q", "--order", "a,broken", "--connect", "broken:evidence:a"], "broken"],
  ["an order naming one RS twice", ["--name", "q", "--order", "a,b,a", "--connect", "b:evidence:a"], "a twice"],
  ["a relation that is not listed", ["--name", "q", "--order", "a,b", "--connect", "b:contrast:a"], "contrast"],
  [
    "a connection naming an RS outside the order",
    ["--name", "q", "--order", "a,b", "--connect", "c:evidence:a"],
    "c is not in the order",
  ],
  [
    "a Satellite that is its own Nucleus",
    ["--name", "q", "--order", "a,b", "--connect", "a:evidence:a"],
    "own Nucleus",
  ],
  [
    "c the Satellite of two connections",
    [
      "--name",
      "q",
      "--order",
      "a,b,c",
      "--connect",
      "b:evidence:a",
      "--connect",
      "c:evidence:a",
      "--connect",
      "c:background:b",
    ],
    "c is the Satellite of two",
  ],
  ["a and c the Satellite of none", ["--name", "q", "--order", "a,b,c", "--connect", "b:evidence:a"], "a, c"],
  [
    "a:evidence:b beside b:evidence:a",
    ["--name", "q", "--order", "a,b,c", "--connect", "a:evidence:b", "--connect", "b:evidence:a"],
    "return to",
  ],
]) {
  const r = run(["create", ...args]);
  ok(
    r.status === 1 && r.out.startsWith("refused: ") && r.out.includes(found) && isDeepStrictEqual(plans(), ["p.yaml"]),
    `(d) ${label}: did not exit 1 naming ${JSON.stringify(found)} with nothing written: ${r.status} ${r.out}${r.err} ${plans()}`,
  );
}

// (e) THE READER: the written file, and two files it refuses.
const read = readDocumentPlan(join(plansDir, "p.yaml"), "p.yaml");
ok(
  !read.error &&
    isDeepStrictEqual(read.plan.order, ["a", "b", "c"]) &&
    read.plan.connections.length === 2 &&
    read.top === "a",
  `(e) readDocumentPlan does not answer the order, the connections and the top Nucleus a: ${JSON.stringify(read)}`,
);
const edited = (label, mutate) => {
  const f = structuredClone(p);
  mutate(f);
  const at = join(root, `${label}.yaml`);
  writeFileSync(at, stringifyYaml(f));
  return at;
};
const third = readDocumentPlan(
  edited("third", (f) => (f.title = "x")),
  "third",
);
ok(third.error?.includes("`title`"), `(e) a file with a third key is not refused: ${JSON.stringify(third)}`);
const lacks = readDocumentPlan(
  edited("lacks", (f) => delete f.connections[0].relation),
  "lacks",
);
ok(
  lacks.error?.includes("no `relation`"),
  `(e) a connection lacking relation is not refused: ${JSON.stringify(lacks)}`,
);

// (f) THE CHECK VERB.
const c = run(["check"]);
ok(
  c.status === 0 &&
    c.out.trim().split("\n").length === 1 &&
    c.out.includes("p.yaml\ttop nucleus a\trs 3\tconnections 2"),
  `(f) check does not print one line for the written file: ${c.status} ${c.out}`,
);
const unlisted = edited("unlisted", (f) => (f.connections[0].relation = "contrast"));
const cu = run(["check", unlisted]);
ok(
  cu.status === 1 && cu.out.startsWith("refused: ") && cu.out.includes("contrast"),
  `(f) check passes an unlisted relation: ${cu.status} ${cu.out}`,
);

// (g) THE RELATION LIST.
const listed = JSON.parse(readFileSync("src/document-plan/relations.json", "utf8"));
ok(
  isDeepStrictEqual(listed, [
    "antithesis",
    "background",
    "circumstance",
    "concession",
    "condition",
    "elaboration",
    "enablement",
    "evaluation",
    "evidence",
    "interpretation",
    "justify",
    "motivation",
    "non_volitional_cause",
    "non_volitional_result",
    "otherwise",
    "purpose",
    "restatement",
    "solutionhood",
    "summary",
    "volitional_cause",
    "volitional_result",
  ]),
  `(g) relations.json does not hold the twenty-one names alone: ${JSON.stringify(listed)}`,
);

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  console.log(`document-plan: ${fails.length} of ${cases} case(s) failed`);
  process.exit(1);
}
console.log(`document-plan: ${cases} case(s) pass`);
