// The cases of checks/check-structure-mapping-playground-move.sh (kogaki#1830), each stated in that member's `contract` in
// checks/registry.json, over a fixture Brief and a fixture Move library:
//   (a) the route's stages and files, case own, no Analogy Mapping, a refused reading retried once;
//   (b) the sheet's Segments rows, three columns each: `unmatched`, `base` and the Unmatched table;
//   (c) the flags; (d) the Brief, Leg and Move refused by value with nothing written;
//   (e) `validateMoveStructure` and (f) `validatePairing`, each refusal by name, a null not refused;
//   (g) the Leg's structure; (h) no call of the row `paragraph_plan_unit` (kogaki#1883), an unchanged production row,
//   moves/ and theses/;
//   (i) the route under `--move-edges` (kogaki#1880), the Move's Bind targets and Edges read from its Move file, run to
//   the end with no call between grounding and the writer but the readback (kogaki#1876); (j) a Move with no `bind` and
//   `edges`, a Move whose Bind targets are not the Leg's, `--move-table` and `--move-edges` refused by name, nothing
//   written. Case (k) went with its call (kogaki#1876). (l) the `readback` stage under `--move-edges` (kogaki#1882).
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  chmodSync,
  readdirSync,
  statSync,
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
const { legRecord, briefRecordText } = await imp("src/compose.mjs");
const { stringifyYaml, parseYaml } = await imp("src/yaml.mjs");
const { validateMoveStructure, validatePairing, unmatchedOf, legStructureOf } = await imp(
  "src/structure-mapping-playground/move-structure.mjs",
);
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const root = mkdtempSync(join(tmpdir(), "structure-mapping-playground-move-"));
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
  ["moves", "theses"].forEach((t) => walk(join(repo, t)));
  return rows.sort().join("\n");
};
const before = snapshot();

// ---- the Move library: one Move of three Segments, and two Moves of moves/ whose Segments carry `bind` and `edges` ----
const MOVE = "m3";
const EDGED = "grant_the_rule_then_withdraw_its_enforcer";
const TWO_TARGETS = "swap_the_question_for_a_narrower_one_and_name_its_hinge";
const library = join(root, "moves");
mkdirSync(library);
writeFileSync(join(library, "ROLES.json"), readFileSync("moves/ROLES.json"));
for (const id of [EDGED, TWO_TARGETS]) writeFileSync(join(library, `${id}.yaml`), readFileSync(`moves/${id}.yaml`));
writeFileSync(
  join(library, `${MOVE}.yaml`),
  stringifyYaml({
    id: MOVE,
    description: "a fixture Move of three Segments.",
    takes: [],
    leaves: [],
    breaks: ["breaks if the point is dropped."],
    segments: [
      { operation: "names the two parts." },
      { operation: "sets the third part beside them.", relation: "follows from the step before." },
      { operation: "states what the two relations make together.", relation: "follows from the step before." },
    ],
  }),
);

// ---- the Brief: three Roles, two relations, a higher-order relation and one over it ----
const STRUCTURE = {
  roles: [
    { id: "r_1", name: "installer", context: "the program that copies the kit.", attributes: [], claims: ["L1"] },
    { id: "r_2", name: "copy", context: "the files it writes.", attributes: [], claims: ["L1"] },
    { id: "r_3", name: "edit", context: "a change the consumer makes.", attributes: [], claims: ["L2"] },
  ],
  relations: [
    { id: "c_1", name: "writes", between: ["r_1", "r_2"], holds: "The {r_1} writes the {r_2}.", from: "L1" },
    { id: "c_2", name: "overwrites", between: ["r_2", "r_3"], holds: "The {r_2} overwrites any {r_3}.", from: "L2" },
  ],
  higher_order: [
    { id: "h_1", name: "ownership", relates: ["c_1", "c_2"], holds: "The {r_2} is the {r_1}'s.", from: ["L1", "L2"] },
    { id: "h_2", name: "reach", relates: ["h_1", "c_1"], holds: "What the {r_1} writes is its own.", from: ["L1"] },
  ],
  attains_thesis: "h_2",
  reach: ["c_1", "c_2", "h_1", "h_2"],
  unreached: { relations: [], higher_order: [], claims: [] },
};
const LEGS = [
  {
    leg_id: "s1",
    relation: "c_1",
    text: "The installer writes the copy.",
    claims: [{ strand: "L1", proposition: "the installer copies the kit." }],
  },
  {
    leg_id: "s2",
    relation: "h_2",
    text: "What the installer writes is its own.",
    claims: [{ strand: "L1", proposition: "the installer copies the kit." }],
    reaches_target: true,
  },
];
const briefOf = (structure, legs) =>
  briefRecordText({
    slug: "move-brief",
    compose_path: "audiences/dev-to-zenn.md",
    strands: [
      { id: "L1", slug: "a", cite: `coding::lesson/a@${"0".repeat(64)}` },
      { id: "L2", slug: "b", cite: `coding::lesson/b@${"0".repeat(64)}` },
    ],
    thesis: "The copy is the installer's.",
    ...(structure ? { structure } : {}),
    reader_path: legs.map((l) => legRecord(l)),
    strand_coverage: [],
    journey_coverage: [],
    tradeoffs: {},
    bridged: {},
  });
const writeBrief = (name, text) => {
  const p = join(root, name, "brief.yaml");
  mkdirSync(join(root, name), { recursive: true });
  writeFileSync(p, text);
  return p;
};
const brief = writeBrief("brief", briefOf(STRUCTURE, LEGS));

// ---- the answers: the Move read whole, and its pairing with Leg s1 ----
const MOVE_STRUCTURE = {
  roles: [
    { id: "t1", context: "one who makes a thing.", attributes: [], source: "target" },
    { id: "t2", context: "the thing made.", attributes: [], source: "target" },
    { id: "t3", context: "what is done to the thing later.", attributes: [], source: "target" },
    { id: "b1", context: "a familiar case of making.", attributes: [], source: "base" },
  ],
  relations: [
    { id: "x1", between: ["t1", "t2"], holds: "{t1} makes {t2}." },
    { id: "x2", between: ["t2", "t3", "b1"], holds: "{t3} is done to {t2} as in {b1}." },
  ],
  higher_order: [{ id: "y1", relates: ["x1", "x2"], holds: "{t2} stays {t1}'s." }],
  segments: [
    { segment: 1, states: ["t1", "t2", "x1"] },
    { segment: 2, states: ["t3", "b1", "x2"] },
    { segment: 3, states: ["y1"] },
  ],
};
const PAIRING = {
  role_pairs: [
    { move_role: "t1", leg_role: "r_1" },
    { move_role: "t2", leg_role: "r_2" },
    { move_role: "t3", leg_role: null },
  ],
  relation_pairs: [
    { move_relation: "x1", leg_relation: "c_1" },
    { move_relation: "x2", leg_relation: null },
    { move_relation: "y1", leg_relation: null },
  ],
};
const TABLE = {
  base: { domain: "a kit installed into a repository" },
  correspondences: [
    { role: "r_1", expression: "the installer" },
    { role: "r_2", expression: "the copied kit" },
  ],
};
const answers = (name, list) => {
  const f = join(root, `${name}.json`);
  writeFileSync(f, JSON.stringify(list));
  return f;
};

// ---- the one fake model binary, answering each row by the judgment point its prompt names ----
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
    const answer = stage === "writer" || stage === "readback" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n";
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    writeSync(1, answer); process.exit(0);
  };
  const nth = (stage, file) => {
    const list = JSON.parse(readFileSync(file, "utf8"));
    let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter(Boolean).filter((l) => JSON.parse(l).stage === stage).length; } catch {}
    return list[Math.min(n, list.length - 1)];
  };
  const row = (id) => prompt.includes("\\\`" + id + "\\\` judgment point");
  if (row("smp_read_move")) return out(nth("read", process.env.SMP_READ_ANSWERS), "read");
  if (row("smp_pair_roles")) return out(nth("pair", process.env.SMP_PAIR_ANSWERS), "pair");
  if (row("smp_correspondence")) return out(JSON.parse(process.env.SMP_TABLE), "grounding");
  if (prompt.startsWith("# Read back the plan of one paragraph")) return out(process.env.SMP_READBACK, "readback");
  return out("WRITTEN the installer and the copied kit.", "writer");
});
`,
);
chmodSync(judge, 0o755);

const outRoot = mkdtempSync(join(trials, "check-move-"));
const run = (name, args, extraEnv = {}) => {
  const dir = join(root, `run-${name}`);
  mkdirSync(dir, { recursive: true });
  const o = join(outRoot, name);
  const res = spawnSync(process.execPath, ["src/structure-mapping-playground/short.mjs", "run", "--out", o, ...args], {
    encoding: "utf8",
    env: {
      ...process.env,
      KOGAKI_JUDGE_CLI: judge,
      SMP_FIXTURE_DIR: dir,
      SMP_READ_ANSWERS: answers(`read-${name}`, [MOVE_STRUCTURE]),
      SMP_PAIR_ANSWERS: answers(`pair-${name}`, [PAIRING]),
      SMP_TABLE: JSON.stringify(TABLE),
      SMP_READBACK: JSON.stringify(READBACK),
      ...extraEnv,
    },
    timeout: 300000,
  });
  const rec = existsSync(join(o, "trial.json")) ? JSON.parse(readFileSync(join(o, "trial.json"), "utf8")) : null;
  const seen = existsSync(join(dir, "seen.jsonl"))
    ? readFileSync(join(dir, "seen.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l))
    : [];
  return { res, o, rec, seen, said: `${res.stdout}${res.stderr}` };
};
// The readback of the three parts of the edged Move (kogaki#1882): its first part told nothing.
const READBACK = {
  parts: [
    { part: 1, readback: null, sample: null },
    {
      part: 2,
      readback: "Say that the copy overwrites any edit, against part 1.",
      sample: "Yet the copy overwrites any edit.",
    },
    {
      part: 3,
      readback: "Say the copy is the installer's, as what follows from part 2.",
      sample: "So the copy is the installer's.",
    },
  ],
};
const ROUTE = ["--brief", brief, "--leg", "s1", "--move", MOVE, "--library", library];

// (a) the route's stages and files
const BAD_READ = { ...MOVE_STRUCTURE, segments: MOVE_STRUCTURE.segments.slice(0, 2) };
const a = run("route", ROUTE, { SMP_READ_ANSWERS: answers("read-retry", [BAD_READ, MOVE_STRUCTURE]) });
const rec = a.rec || {};
ok(a.res.status === 0, `(a) the run exited ${a.res.status}: ${a.said}`);
ok(
  JSON.stringify((rec.stages || []).map((s) => `${s.stage}:${s.state}`)) ===
    JSON.stringify(["move-reading:done", "pairing:done", "grounding:done", "write:done"]),
  `(a) the stages are not the route's four, all done (kogaki#1883): ${JSON.stringify(rec.stages)}`,
);
ok(
  JSON.stringify(a.seen.map((x) => x.stage)) === JSON.stringify(["read", "read", "pair", "grounding", "writer"]),
  `(a) the calls are not the refused and retried reading, the pairing, grounding and writer: ${a.seen.map((x) => x.stage)}`,
);
ok(
  a.seen[1] && a.seen[1].prompt.includes("Segments — one entry per Segment"),
  "(a) the second reading call does not carry the first call's refusal",
);
const yamlAt = (f) => (existsSync(join(a.o, f)) ? parseYaml(readFileSync(join(a.o, f), "utf8"), f) : null);
ok(
  JSON.stringify(yamlAt("move-structure.yaml")) === JSON.stringify(MOVE_STRUCTURE),
  "(a) move-structure.yaml is not the reading",
);
const pairing = yamlAt("pairing.yaml") || {};
ok(
  JSON.stringify(pairing.unmatched) ===
    JSON.stringify({ move_roles: ["t3"], move_relations: ["x2", "y1"], leg_roles: [], leg_relations: [] }),
  `(a) pairing.yaml's unmatched is not what the pairing left: ${JSON.stringify(pairing.unmatched)}`,
);
const rbs = yamlAt("rbs.yaml") || {};
ok(
  Array.isArray(rbs.tables) && rbs.tables.length === 1 && rbs.tables[0].move === MOVE && Array.isArray(rbs.bindings),
  `(a) rbs.yaml is not the named Move's one Mapping Table with its paragraph record: ${JSON.stringify(rbs)}`,
);
// The Harness writes one paragraph record naming the Move given, and no `waypoints` folder (kogaki#1883).
const aParagraphs = (rec.bind && rec.bind.paragraphs) || [];
ok(
  aParagraphs.length === 1 &&
    aParagraphs[0].move === MOVE &&
    JSON.stringify(Object.keys(aParagraphs[0])) === JSON.stringify(["move", "binding_rationale", "leaves"]) &&
    JSON.stringify(rbs.bindings) === JSON.stringify(aParagraphs) &&
    !existsSync(join(a.o, "waypoints")),
  `(a) the paragraph record is not one { move, binding_rationale, leaves } under the named Move, or a waypoints folder was written: ${JSON.stringify(aParagraphs)}`,
);
ok(
  existsSync(join(a.o, "bind.yaml")) && existsSync(join(a.o, "paragraph.md")),
  "(a) bind.yaml or paragraph.md is missing",
);
ok(existsSync(join(a.o, "sheet.html")), "(a) sheet.html is missing");
ok(
  !existsSync(join(a.o, "analogy.yaml")) && rec.analogy && rec.analogy.path === null,
  "(a) an Analogy Mapping was written",
);
ok(
  rec.bind && rec.bind.move === MOVE && rec.bind.case === "own" && rec.bind.inference_move === null,
  `(a) trial.json's bind does not hold the named Move under case own: ${JSON.stringify(rec.bind)}`,
);
ok(
  rec.route === "brief-leg" && rec.brief && rec.brief.leg === "s1" && rec.brief.sha256 === sha(brief),
  `(a) trial.json does not name the Brief and its Leg: ${JSON.stringify(rec.brief)}`,
);

// (b) the sheet's Segments rows
const sheet = existsSync(join(a.o, "sheet.html")) ? readFileSync(join(a.o, "sheet.html"), "utf8") : "";
const partOf = (id) =>
  (sheet.match(new RegExp(`<section class="card" id="${id}">([\\s\\S]*?)</section>`)) || [])[1] || "";
const segs = partOf("segments");
const firstTable = (segs.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || "";
const rows = firstTable.split("<tr>").slice(1);
ok(rows.length === 3, `(b) the Segments table has ${rows.length} rows, and the Move has three Segments`);
ok(
  /<th>#<\/th><th>operation<\/th><th>states → paired with<\/th><\/tr>/.test(segs) &&
    rows.every((r) => (r.match(/<td>/g) || []).length === 3),
  `(b) a Segments row is not the three columns #, operation and states → paired with (kogaki#1883): ${rows[0]}`,
);
ok(
  rows[1] && /t3 → <span class="stop">unmatched<\/span>/.test(rows[1]) && !/t3/.test(rows[0] || ""),
  `(b) the Segment stating t3 does not read it unmatched: ${rows[1]}`,
);
ok(rows[0] && rows[0].includes("t1 → r_1") && rows[0].includes("x1 → c_1"), `(b) row 1 is not its pairs: ${rows[0]}`);
ok(rows[1] && rows[1].includes("b1 → base"), `(b) a base Role does not read base: ${rows[1]}`);
ok(
  /Unmatched/.test(segs) && /t3/.test(segs.split("Unmatched")[1] || "") && /x2, y1/.test(segs),
  "(b) the Unmatched table does not list what the pairing left",
);
ok(
  sheet.indexOf('id="move-structure"') !== -1 &&
    sheet.indexOf('id="move-structure"') < sheet.indexOf('id="segments"') &&
    sheet.indexOf('id="segments"') < sheet.indexOf('id="proposition-paragraph"'),
  "(b) Move structure and Segments do not stand above the paragraph",
);

// (c) the flags
const noWrite = (r, name) => !existsSync(join(outRoot, name));
const flagCases = [
  ["brief-only", ["--brief", brief], "`--leg` is required"],
  ["brief-leg", ["--brief", brief, "--leg", "s1"], "`--move` is required"],
  ["move-only", ["--move", MOVE], "`--brief` is required"],
  ...["proposition", "structure", "mapper", "rbs-file"].map((k) => [
    `with-${k}`,
    [...ROUTE, `--${k}`, "x"],
    `\`--${k}\` is no flag`,
  ]),
  ["with-compose", [...ROUTE, "--compose"], "`--compose` is no flag"],
];
for (const [name, args, want] of flagCases) {
  const r = run(name, args);
  ok(
    r.res.status !== 0 && r.said.includes(want) && noWrite(r, name),
    `(c) ${name} was not refused naming ${want}: ${r.said}`,
  );
}

// (d) the Brief, the Leg and the Move refused by value, nothing written
const flat = writeBrief(
  "flat",
  briefOf(
    null,
    LEGS.map((l) => ({ ...l, relation: undefined })),
  ),
);
// A stored Brief whose first Leg carries a key the Leg schema does not declare (kogaki#1885).
const wpRecord = parseYaml(briefOf(STRUCTURE, LEGS), "brief.yaml");
wpRecord.reader_path[0].waypoints = [{ point: "a point." }];
const wp = writeBrief("waypoints", stringifyYaml(wpRecord));
for (const [name, args, want] of [
  ["no-structure", ["--brief", flat, "--leg", "s1", "--move", MOVE, "--library", library], "carries no `structure`"],
  [
    "leg-waypoints",
    ["--brief", wp, "--leg", "s1", "--move", MOVE, "--library", library],
    "`waypoints`, which is not a Leg field",
  ],
  ["unknown-leg", ["--brief", brief, "--leg", "s9", "--move", MOVE, "--library", library], '"s9"'],
  ["unknown-move", ["--brief", brief, "--leg", "s1", "--move", "nope", "--library", library], '"nope"'],
]) {
  const r = run(name, args);
  ok(
    r.res.status !== 0 && r.said.includes(want) && noWrite(r, name),
    `(d) ${name} was not refused naming ${want}: ${r.said}`,
  );
}

// (e) the move-reading validator
const ms = (f) => {
  const x = structuredClone(MOVE_STRUCTURE);
  f(x);
  return x;
};
for (const [label, answer, want] of [
  ["an undeclared key", ms((x) => (x.extra = 1)), "`extra`"],
  ["a missing key", ms((x) => delete x.higher_order), "no `higher_order`"],
  ["an empty id", ms((x) => (x.roles[0].id = "")), "roles[0]'s `id` is empty or repeated"],
  ["a repeated id", ms((x) => (x.relations[0].id = "t1")), "relations[0]'s `id` is empty or repeated"],
  ["a source outside the two", ms((x) => (x.roles[1].source = "both")), '"t2"\'s `source` "both"'],
  ["a relation naming no Role", ms((x) => (x.relations[0].between = ["t1", "zz"])), '"zz", which is no Role'],
  ["a relation with no Role", ms((x) => (x.relations[0].between = [])), "names no Role"],
  ["segments of the wrong count", ms((x) => x.segments.pop()), "carries 2 entries, and the Move has 3"],
  ["segments out of order", ms((x) => (x.segments[0].segment = 2)), "Segment 1"],
  ["a states id naming nothing", ms((x) => x.segments[2].states.push("q9")), '"q9"'],
  ["an element no Segment states", ms((x) => (x.segments[2].states = [])), '"y1" is stated by no Segment'],
]) {
  const r = validateMoveStructure(answer, 3);
  ok(r && r.text.includes(want), `(e) ${label} was not refused naming ${want}: ${JSON.stringify(r)}`);
}
ok(validateMoveStructure(MOVE_STRUCTURE, 3) === null, "(e) the fixture reading is refused");
ok(
  validateMoveStructure(
    ms((x) => x.segments[0].states.splice(0)),
    3,
  ) !== null,
  "(e) a reading leaving t1 unstated passed",
);

// (f) the pairing validator
const LEG_S1 = legStructureOf(STRUCTURE, "c_1");
const pr = (f) => {
  const x = structuredClone(PAIRING);
  f(x);
  return x;
};
for (const [label, answer, want] of [
  ["a missing Role pair", pr((x) => x.role_pairs.pop()), 'no pair for the Role "t3"'],
  ["a repeated Role pair", pr((x) => x.role_pairs.push({ move_role: "t1", leg_role: null })), '"t1" a second time'],
  ["a move_role naming nothing", pr((x) => (x.role_pairs[2].move_role = "zz")), '"zz" names no Role of the Move'],
  ["a leg_role naming nothing", pr((x) => (x.role_pairs[2].leg_role = "r_9")), '"r_9" names no Role of the Leg'],
  ["a base Role paired", pr((x) => x.role_pairs.push({ move_role: "b1", leg_role: null })), "whose source is `base`"],
  ["a Leg Role named twice", pr((x) => (x.role_pairs[2].leg_role = "r_1")), "role_pairs[0] already names"],
  ["a missing relation pair", pr((x) => x.relation_pairs.pop()), 'no pair for the relation "y1"'],
  [
    "a leg_relation naming nothing",
    pr((x) => (x.relation_pairs[1].leg_relation = "c_9")),
    '"c_9" names no relation of the Leg',
  ],
  [
    "a Leg relation named twice",
    pr((x) => (x.relation_pairs[2].leg_relation = "c_1")),
    "relation_pairs[0] already names",
  ],
  ["an undeclared key", pr((x) => (x.extra = [])), "`extra`"],
]) {
  const r = validatePairing(answer, MOVE_STRUCTURE, LEG_S1);
  ok(r && r.text.includes(want), `(f) ${label} was not refused naming ${want}: ${JSON.stringify(r)}`);
}
ok(validatePairing(PAIRING, MOVE_STRUCTURE, LEG_S1) === null, "(f) the fixture pairing, nulls in it, is refused");
const LEG_H2 = legStructureOf(STRUCTURE, "h_2");
const crossed = {
  role_pairs: [
    { move_role: "t1", leg_role: "r_1" },
    { move_role: "t2", leg_role: "r_3" },
    { move_role: "t3", leg_role: null },
  ],
  relation_pairs: [
    { move_relation: "x1", leg_relation: "c_1" },
    { move_relation: "x2", leg_relation: null },
    { move_relation: "y1", leg_relation: null },
  ],
};
const cr = validatePairing(crossed, MOVE_STRUCTURE, LEG_H2);
ok(
  cr && cr.text.includes('"t2"') && cr.text.includes('"r_3"'),
  `(f) a relation pair whose Role the Leg relation does not hold passed: ${JSON.stringify(cr)}`,
);
ok(
  JSON.stringify(unmatchedOf(PAIRING, LEG_H2)) ===
    JSON.stringify({
      move_roles: ["t3"],
      move_relations: ["x2", "y1"],
      leg_roles: ["r_3"],
      leg_relations: ["c_2", "h_1", "h_2"],
    }),
  "(f) unmatched does not name the Leg elements no pair names",
);

// (g) the Leg's structure
const ids = (s) => [s.roles, s.relations, s.higher_order].map((l) => l.map((x) => x.id).join(",")).join(" | ");
ok(ids(LEG_S1) === "r_1,r_2 | c_1 | ", `(g) the Leg of c_1 reads ${ids(LEG_S1)}`);
ok(ids(LEG_H2) === "r_1,r_2,r_3 | c_1,c_2 | h_1,h_2", `(g) the Leg of h_2 reads ${ids(LEG_H2)}`);

// (h) no call of the row `paragraph_plan_unit` (kogaki#1883), and nothing outside the run changed
ok(
  !a.seen.some((x) => x.prompt.includes("`paragraph_plan_unit`")),
  "(h) the route made a call with the row `paragraph_plan_unit`",
);
ok(sha(PLAN_TABLE) === planTableSha, `(h) ${PLAN_TABLE} changed`);
ok(snapshot() === before, "(h) a file under moves/ or theses/ changed");

// (i) under `--move-edges` (kogaki#1880): each Segment's `bind` and `edges` read from the Move file, its Bind targets given
// the Leg's Arguments and CentralClaim in order by the Harness, and no call made between grounding and the writer (kogaki#1876)
const LEG_H1 = { leg_id: "s2", relation: "h_1", text: "The copy is the installer's.", claims: LEGS[0].claims };
const tableBrief = writeBrief("table-brief", briefOf(STRUCTURE, [LEGS[0], LEG_H1, { ...LEGS[1], leg_id: "s3" }]));
const EDGES_ROUTE = ["--brief", tableBrief, "--leg", "s2", "--move", EDGED, "--library", library];
const TABLE_H1 = { ...TABLE, correspondences: [...TABLE.correspondences, { role: "r_3", expression: "an edit" }] };
const ti = run("edges", [...EDGES_ROUTE, "--move-edges"], { SMP_TABLE: JSON.stringify(TABLE_H1) });
const trec = ti.rec || {};
const tYaml = (f) => (existsSync(join(ti.o, f)) ? parseYaml(readFileSync(join(ti.o, f), "utf8"), f) : null);
ok(ti.res.status === 0, `(i) the --move-edges run exited ${ti.res.status}: ${ti.said}`);
ok(
  JSON.stringify((trec.stages || []).map((s) => `${s.stage}:${s.state}`)) ===
    JSON.stringify(["move-reading:done", "pairing:done", "grounding:done", "readback:done", "write:done"]),
  `(i) the --move-edges run's stages are not move-reading, pairing, grounding, readback and write, all done: ${JSON.stringify(trec.stages)}`,
);
ok(
  JSON.stringify(ti.seen.map((x) => x.stage)) === JSON.stringify(["grounding", "readback", "writer"]),
  `(i) the --move-edges run made a call beside grounding, the readback and the writer: ${ti.seen.map((x) => x.stage)}`,
);
ok(!existsSync(join(ti.o, "waypoints")), "(i) the --move-edges run wrote a `waypoints` stage directory");
ok(
  (trec.stages || [])
    .filter((s) => s.stage === "move-reading" || s.stage === "pairing")
    .every((s) => s.calls === null && s.call_records.length === 0),
  `(i) the record shows a model call at move-reading or pairing: ${JSON.stringify(trec.stages)}`,
);
ok(
  JSON.stringify(tYaml("move-structure.yaml")) ===
    JSON.stringify({
      binds: 3,
      segments: [
        { segment: 1, bind: 1 },
        { segment: 2, bind: 2 },
        { segment: 3, bind: 3 },
      ],
    }),
  `(i) move-structure.yaml is not the Move file's: ${JSON.stringify(tYaml("move-structure.yaml"))}`,
);
ok(
  JSON.stringify(tYaml("pairing.yaml")) ===
    JSON.stringify({
      binds: [
        { bind: 1, kind: "Argument", leg: "c_1" },
        { bind: 2, kind: "Argument", leg: "c_2" },
        { bind: 3, kind: "CentralClaim", leg: "h_1" },
      ],
    }),
  `(i) pairing.yaml is not the Leg's Arguments then its CentralClaim, in order: ${JSON.stringify(tYaml("pairing.yaml"))}`,
);
ok(
  trec.move_edges === true && !Object.hasOwn(trec, "move_table"),
  `(i) trial.json does not record move_edges true and no second file: ${JSON.stringify(trec.move_edges)}`,
);
ok(
  ["rbs.yaml", "bind.yaml", "paragraph.md", "sheet.html"].every((f) => existsSync(join(ti.o, f))),
  "(i) the --move-edges run did not write its Mapping Table, paragraph record, paragraph and sheet",
);
const tParagraphs = (trec.bind && trec.bind.paragraphs) || [];
ok(
  tParagraphs.length === 1 && tParagraphs[0].move === EDGED && !Object.hasOwn(tParagraphs[0], "paragraph_waypoints"),
  `(i) the paragraph record is not one paragraph under the named Move with no \`paragraph_waypoints\`: ${JSON.stringify(tParagraphs)}`,
);
// The Writer is handed the plan and no Point (kogaki#1859): the Arguments, the CentralClaim and one part per Segment.
const tWriter = ((ti.seen.find((x) => x.stage === "writer") || {}).prompt || "").split("\n");
ok(
  [
    "- Argument 1. The installer writes the copy.",
    "- Argument 2. The copy overwrites any edit.",
    "- CentralClaim. The copy is the installer's.",
    "1. Argument 1.",
    "2. Argument 2. Sense Concession.Denier, to part 1.",
    "3. CentralClaim. Sense Cause.Result, to part 2.",
  ].every((l) => tWriter.includes(l)),
  `(i) the writer's stdin does not hold the Leg's Arguments, its CentralClaim and the three parts: ${JSON.stringify(tWriter.filter((l) => /^(- |\d+\. )/.test(l)))}`,
);
ok(
  !tWriter.some((l) => l.includes("PW-") || l.includes("*Serves:*") || l.includes("voiced as the parties' own words")),
  "(i) the writer's stdin carries a Point, a Serves line or a Segment's manner",
);
const tGround = ti.seen.find((x) => x.stage === "grounding");
ok(
  tGround &&
    tGround.prompt.includes('"edges"') &&
    !tGround.prompt.includes('"genericity"') &&
    !tGround.prompt.includes("grants that a prohibition"),
  "(i) the grounding call is not handed each Segment's number, bind and edges in place of its operation",
);
const tSheet = existsSync(join(ti.o, "sheet.html")) ? readFileSync(join(ti.o, "sheet.html"), "utf8") : "";
const tSegs = (tSheet.match(/<section class="card" id="segments">([\s\S]*?)<\/section>/) || [])[1] || "";
ok(
  /<th>#<\/th><th>bind<\/th><th>Edges<\/th><\/tr>/.test(tSegs) &&
    !tSegs.includes("operation") &&
    !tSegs.includes("genericity") &&
    !tSegs.includes("Unmatched") &&
    !tSegs.includes("Waypoint"),
  "(i) the sheet's Segments table is not the three columns, with no operation, no Unmatched table and no Waypoints column",
);
const tRows = ((tSegs.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || "").split("<tr>").slice(1);
ok(
  tRows.length === 3 &&
    tRows[0].includes("1 → Argument c_1") &&
    tRows[2].includes("3 → CentralClaim h_1") &&
    tRows[1].includes("Concession.Denier → 1") &&
    tRows[2].includes("Cause.Result → 2"),
  `(i) the Segments rows do not show each Bind target beside its Argument or CentralClaim and its Edges: ${tRows.join(" | ")}`,
);

// (i) under `--leg-senses` (kogaki#1875): a finished reading of the same Leg, recorded in trial.json and shown directly after
// the Segments, one row per pair; with no reading the section holds the one sentence.
const { NO_READING } = await imp("src/structure-mapping-playground/leg-senses-section.mjs");
const { relFromRepo } = await imp("src/workflow/run-record.mjs");
const { pairsOf } = await imp("src/sme/edges.mjs");
const { legSentences } = await imp("src/sme/arguments.mjs");
const tLegs = (html) => (html.match(/<section class="card" id="leg-senses">([\s\S]*?)<\/section>/) || [])[1] || "";
ok(
  tLegs(tSheet).includes(NO_READING) && trec.leg_senses === null,
  "(i) a run with no reading does not show the one sentence",
);
const readingDir = join(root, "reading");
mkdirSync(readingDir);
const tSentences = legSentences(STRUCTURE, "h_1");
writeFileSync(
  join(readingDir, "leg-senses-run.json"),
  JSON.stringify({ brief: { leg: "s2", path: relFromRepo(tableBrief) }, sentences: tSentences, state: "finished" }),
);
writeFileSync(
  join(readingDir, "counts.json"),
  JSON.stringify({
    pairs: pairsOf(tSentences.length).map((pair) => ({
      pair,
      answers: [{ sense: "Contrast", played_by: null, named: 4, place_sum: 4, candidate: true }],
    })),
  }),
);
const tl = run("edges-leg-senses", [...EDGES_ROUTE, "--move-edges", "--leg-senses", readingDir], {
  SMP_TABLE: JSON.stringify(TABLE_H1),
});
const tlSheet = existsSync(join(tl.o, "sheet.html")) ? readFileSync(join(tl.o, "sheet.html"), "utf8") : "";
const tlIds = [...tlSheet.matchAll(/<section class="card" id="([^"]+)"/g)].map((m) => m[1]);
const tlRows = tLegs(tlSheet).split("<tr>").slice(2);
ok(
  tl.res.status === 0 &&
    (tl.rec || {}).leg_senses === relFromRepo(readingDir) &&
    tlIds[tlIds.indexOf("segments") + 1] === "leg-senses" &&
    tlRows.length === 3 &&
    tlRows[0].includes("named 4 of 5") &&
    tlRows[0].includes("Segment 2: Concession.Denier → Segment 1 · ") &&
    tlRows[0].includes("not among the candidates"),
  `(i) a run under --leg-senses does not record the folder and show one row per pair after the Segments: ${tl.said} ${tLegs(tlSheet)}`,
);

// (i) the saved reading of 2026-11-16 (kogaki#1875): the two Arguments' row shows Contrast named 5 of 5 and Conjunction named
// 2 of 5, and Segment 3's Edge Conjunction, read from the Move file, among the candidates; a reading of another Leg is
// refused naming the flag and the folder before any call, with nothing written.
{
  const L = await imp("src/structure-mapping-playground/leg-senses-section.mjs");
  const READING = "checks/fixtures/leg-senses/trial-reading";
  const BRIEF = "theses/what-automatic-rule-registered-against/brief.yaml";
  const MOVE_ID = "build_the_familiar_side_of_a_contrast_up_to_its_principle";
  const contract = parseYaml(readFileSync(`moves/${MOVE_ID}.yaml`, "utf8"), MOVE_ID);
  const x = L.readLegSensesFolder(READING, resolve(repo, BRIEF), "L4");
  ok(x.reading && x.reading.pairs.length === 3, `(i) the saved reading was not read: ${JSON.stringify(x.error)}`);
  const pairing = { binds: x.reading.sentences.map((s) => ({ bind: s.number, kind: s.kind, leg: s.id })) };
  const edges = x.reading ? L.trialEdges(L.edgeSegments(contract), x.reading, pairing) : [];
  const args = (L.legSensesSection(x.reading, edges).split("<tr>")[2] || "").split("</tr>")[0];
  ok(
    args.includes("Argument 1, c_2") &&
      args.includes("Argument 2, c_3") &&
      args.includes("<b>Contrast</b>") &&
      args.includes("named 5 of 5") &&
      args.includes("<b>Conjunction</b>") &&
      args.includes("named 2 of 5") &&
      args.includes("Segment 3: Conjunction → Segment 2 · among the candidates, named 2 of 5"),
    `(i) the two Arguments' row does not show Contrast 5 of 5, Conjunction 2 of 5 and Segment 3's Edge among the candidates: ${args}`,
  );
  const xr = run("other-leg", ["--brief", BRIEF, "--leg", "L1", "--move", MOVE_ID, "--leg-senses", READING]);
  ok(
    xr.res.status === 1 &&
      xr.said.includes(`\`--leg-senses ${READING}\``) &&
      xr.said.includes("Leg L4") &&
      xr.said.includes("Nothing was started") &&
      !existsSync(xr.o) &&
      !xr.seen.length,
    `(i) a reading of another Leg was not refused before any call, naming the flag and the folder: ${xr.said}`,
  );
  const alone = run("leg-senses-alone", ["--leg-senses", READING]);
  ok(
    alone.res.status === 1 &&
      alone.said.includes("is a flag of a Trial that takes its Leg from a Brief") &&
      !existsSync(alone.o),
    `(i) --leg-senses without --brief, --leg and --move was not refused: ${alone.said}`,
  );
  const unfinished = run("leg-senses-unfinished", [...EDGES_ROUTE, "--leg-senses", "checks/fixtures/leg-senses"]);
  ok(
    unfinished.res.status === 1 && unfinished.said.includes("whose `state` is `finished`") && !existsSync(unfinished.o),
    `(i) a folder holding no finished reading was not refused: ${unfinished.said}`,
  );
}

// (j) refused before anything is started, by name, nothing written and no call made (kogaki#1880)
const swapRoute = EDGES_ROUTE.map((x) => (x === EDGED ? TWO_TARGETS : x));
const unedgedRoute = EDGES_ROUTE.map((x) => (x === EDGED ? MOVE : x));
for (const [name, args, want] of [
  [
    "e-unedged",
    [...unedgedRoute, "--move-edges"],
    `the Move ${MOVE} carries no \`bind\` and \`edges\` on its Segments`,
  ],
  [
    "e-targets",
    [...swapRoute, "--move-edges"],
    `the Move ${TWO_TARGETS} has 2 Bind targets, and the Leg s2 has 3 Arguments and CentralClaim`,
  ],
  ["e-table", [...EDGES_ROUTE, "--move-table", "table.yaml"], "`--move-table` is retired"],
  ["e-table-alone", ["--move-table", "table.yaml"], "`--move-table` is retired"],
  ["e-alone", ["--move-edges"], "`--move-edges` is a flag of the Brief-Leg route"],
  ["e-value", [...EDGES_ROUTE, "--move-edges", "edges.yaml"], "`--move-edges` takes no value"],
]) {
  const r = run(name, args);
  ok(
    r.res.status !== 0 && r.said.includes(want) && noWrite(r, name) && r.seen.length === 0,
    `(j) ${name} was not refused naming ${want}: ${r.said}`,
  );
}
ok(snapshot() === before, "(j) a file under moves/ or theses/ changed");

// (l) the `readback` stage under `--move-edges` (kogaki#1882): one call, readback.json and one row per Segment on the sheet;
// the Writer's input unchanged by its answer; a refused answer shown and the writer run; a null readback two empty cells.
{
  const section = (o) => {
    const f = join(o, "sheet.html");
    const html = existsSync(f) ? readFileSync(f, "utf8") : "";
    return (html.match(/<section class="card" id="readback">([\s\S]*?)<\/section>/) || [])[1] || "";
  };
  const rowsOf = (html) => ((html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || "").split("<tr>").slice(1);
  const written = existsSync(join(ti.o, "readback.json"))
    ? JSON.parse(readFileSync(join(ti.o, "readback.json"), "utf8"))
    : null;
  const lRows = rowsOf(section(ti.o));
  ok(
    ti.seen.filter((x) => x.stage === "readback").length === 1 &&
      JSON.stringify(written) === JSON.stringify(READBACK) &&
      trec.readback &&
      trec.readback.path &&
      trec.readback.path.endsWith("readback.json") &&
      lRows.length === 3 &&
      lRows[1].includes("<td>2. Argument 2. Sense Concession.Denier, to part 1.</td>") &&
      lRows[1].includes(`<td>${READBACK.parts[1].readback}</td><td>${READBACK.parts[1].sample}</td>`),
    `(l) the readback stage did not make one call, write readback.json and show one row per Segment: ${JSON.stringify(trec.readback)} ${lRows.length}`,
  );
  const other = {
    parts: READBACK.parts.map((p) =>
      p.readback ? { ...p, readback: "Another reading.", sample: "Another sentence." } : p,
    ),
  };
  const tj = run("readback-other", [...EDGES_ROUTE, "--move-edges"], {
    SMP_TABLE: JSON.stringify(TABLE_H1),
    SMP_READBACK: JSON.stringify(other),
  });
  const writerOf = (r) => (r.seen.find((x) => x.stage === "writer") || {}).prompt;
  ok(
    tj.res.status === 0 && writerOf(tj) !== undefined && writerOf(tj) === writerOf(ti),
    "(l) the Writer's input differs between two Trials whose readback answered differently",
  );
  const tr = run("readback-refused", [...EDGES_ROUTE, "--move-edges"], {
    SMP_TABLE: JSON.stringify(TABLE_H1),
    SMP_READBACK: "NOT A RECORD",
  });
  const rStages = ((tr.rec || {}).stages || []).map((x) => `${x.stage}:${x.state}`);
  const rSection = section(tr.o);
  ok(
    tr.res.status === 0 &&
      rStages.join() === "move-reading:done,pairing:done,grounding:done,readback:done,write:done" &&
      existsSync(join(tr.o, "paragraph.md")) &&
      !existsSync(join(tr.o, "readback.json")) &&
      tr.rec.readback.refusal.includes("not one JSON record") &&
      rSection.includes("refused") &&
      rSection.includes("NOT A RECORD") &&
      !rSection.includes("<table>"),
    `(l) a refused readback did not leave the writer running and show the refusal with no table: ${rStages} ${rSection}`,
  );
  ok(
    lRows.length > 0 && lRows[0].includes("<td>1. Argument 1.</td><td></td><td></td>"),
    `(l) a Segment with a null readback does not show two empty cells: ${lRows[0]}`,
  );
}

// (m) the `packet` section under `--move-edges` (kogaki#1897): its heading and one fold that is not open, holding the
// Packet; the section after `readback` and before `proposition-paragraph`.
{
  const f = join(ti.o, "sheet.html");
  const html = existsSync(f) ? readFileSync(f, "utf8") : "";
  const packet = (html.match(/<section class="card" id="packet">([\s\S]*?)<\/section>/) || [])[1] || "";
  const lines = ((packet.match(/<pre>([\s\S]*?)<\/pre>/) || [])[1] || "").split("\n");
  ok(
    packet.startsWith(
      '<h2>Packet</h2><details class="part"><summary>the Packet the Writer was handed</summary><pre>',
    ) &&
      (packet.match(/<details/g) || []).length === 1 &&
      lines.includes("# Write one Leg") &&
      lines.includes("## The plan of this paragraph"),
    `(m) the packet section does not open with its heading and one closed fold holding the Packet: ${packet.slice(0, 200)}`,
  );
  const ids = [...html.matchAll(/<section class="card" id="([^"]+)">/g)].map((x) => x[1]);
  const at = ids.indexOf("packet");
  ok(
    at > 0 && ids[at - 1] === "readback" && ids[at + 1] === "proposition-paragraph",
    `(m) the packet section does not stand after readback and before proposition-paragraph: ${JSON.stringify(ids)}`,
  );
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`structure-mapping-playground-move: ${cases} case(s) pass, (a)-(j), (l), (m)`);
