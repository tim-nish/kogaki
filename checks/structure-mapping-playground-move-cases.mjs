// The cases of checks/check-structure-mapping-playground-move.sh (kogaki#1830), each stated in that member's `contract` in
// checks/registry.json, over a fixture Brief and a fixture Move library:
//   (a) the route's stages and files, case own, no Analogy Mapping, a refused reading retried once;
//   (b) the sheet's Segments rows: `unmatched`, `base`, the Unmatched table and a Segment with no Waypoint;
//   (c) the flags; (d) the Brief, Leg and Move refused by value with nothing written;
//   (e) `validateMoveStructure` and (f) `validatePairing`, each refusal by name, a null not refused;
//   (g) the Leg's structure; (h) the plan call's inputs, an unchanged production row, moves/ and theses/;
//   (i) the Move table route (kogaki#1840) run to the end; (j) the table and its flag refused by name, nothing written.
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
const { renderShortSheet } = await imp("src/structure-mapping-playground/sheet.mjs");
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
const root = mkdtempSync(join(tmpdir(), "structure-mapping-playground-move-"));
const trials = join(repo, "runs", "structure-mapping-playground");
mkdirSync(trials, { recursive: true });
const PLAN_TABLE = "src/paragraph-plan-workflow.json";
const planTableSha = sha(PLAN_TABLE);
const PAIRED_SENTENCE = JSON.parse(readFileSync("src/structure-mapping-playground/playground-workflow.json", "utf8"))
  .smp_paired_plan.judgment_point;

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

// ---- the Move library: one Move of three Segments ----
const MOVE = "m3";
const library = join(root, "moves");
mkdirSync(library);
writeFileSync(join(library, "ROLES.json"), readFileSync("moves/ROLES.json"));
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

const LEG_S1_STRUCTURE = legStructureOf(STRUCTURE, "c_1");
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
    const answer = stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n";
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    writeSync(1, answer); process.exit(0);
  };
  const nth = (stage, file) => {
    const list = JSON.parse(readFileSync(file, "utf8"));
    let n = 0; try { n = readFileSync(dir + "/seen.jsonl", "utf8").split("\\n").filter(Boolean).filter((l) => JSON.parse(l).stage === stage).length; } catch {}
    return list[Math.min(n, list.length - 1)];
  };
  const body = (key) => {
    const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at);
    let depth = 0, str = false;
    for (let k = open; k < prompt.length; k++) {
      const ch = prompt[k];
      if (str) { if (ch === "\\\\") k++; else if (ch === '"') str = false; continue; }
      if (ch === '"') str = true; else if (ch === "{") depth++; else if (ch === "}" && --depth === 0) return JSON.parse(prompt.slice(open, k + 1));
    }
  };
  const row = (id) => prompt.includes("\\\`" + id + "\\\` judgment point");
  if (row("smp_read_move")) return out(nth("read", process.env.SMP_READ_ANSWERS), "read");
  if (row("smp_pair_roles")) return out(nth("pair", process.env.SMP_PAIR_ANSWERS), "pair");
  if (row("smp_correspondence")) return out(JSON.parse(process.env.SMP_TABLE), "grounding");
  if (row("paragraph_plan_unit")) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable } = body("leg_you_must_plan");
    const m = bindable.find((x) => x.id === leg.move);
    const serves = leg.claims.map((g) => g.strand);
    return out({ version: "1", leg_id: leg.leg_id, move: leg.move, rationale: "the Move's Segments carry the Leg.",
      paragraphs: [{ paragraph: 1, materials: serves, purpose: "states the Leg.", depends_on: [], "re-activate": [],
        rationale: "it is the one paragraph of this Leg.",
        paragraph_waypoints: m.segments.map((_, n) => ({ point: "PW-" + (n + 1) + " the installer writes the copied kit.", serves, cast: {} })) }] }, "waypoints");
  }
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
const ROUTE = ["--brief", brief, "--leg", "s1", "--move", MOVE, "--library", library];

// (a) the route's stages and files
const BAD_READ = { ...MOVE_STRUCTURE, segments: MOVE_STRUCTURE.segments.slice(0, 2) };
const a = run("route", ROUTE, { SMP_READ_ANSWERS: answers("read-retry", [BAD_READ, MOVE_STRUCTURE]) });
const rec = a.rec || {};
ok(a.res.status === 0, `(a) the run exited ${a.res.status}: ${a.said}`);
ok(
  JSON.stringify((rec.stages || []).map((s) => `${s.stage}:${s.state}`)) ===
    JSON.stringify(["move-reading:done", "pairing:done", "grounding:done", "waypoints:done", "write:done"]),
  `(a) the stages are not the route's five, all done: ${JSON.stringify(rec.stages)}`,
);
ok(
  JSON.stringify(a.seen.map((x) => x.stage)) ===
    JSON.stringify(["read", "read", "pair", "grounding", "waypoints", "writer"]),
  `(a) the calls are not the refused and retried reading, the pairing, grounding, plan and writer: ${a.seen.map((x) => x.stage)}`,
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
  `(a) rbs.yaml is not the named Move's one Mapping Table with its Waypoints: ${JSON.stringify(rbs)}`,
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
  rows[1] && /t3 → <span class="stop">unmatched<\/span>/.test(rows[1]) && !/t3/.test(rows[0] || ""),
  `(b) the Segment stating t3 does not read it unmatched: ${rows[1]}`,
);
ok(
  rows[0] && rows[0].includes("t1 → r_1") && rows[0].includes("x1 → c_1") && rows[0].includes("PW-1"),
  `(b) row 1 is not its pairs and Waypoint: ${rows[0]}`,
);
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
// A Segment the plan wrote no Waypoint for says so, rendered from the run's own record with one Waypoint cut.
const cut = (rec.bind.paragraphs || []).map((p) => ({ ...p, paragraph_waypoints: p.paragraph_waypoints.slice(0, 1) }));
const cutSheet = renderShortSheet({
  outDir: a.o,
  record: rec,
  proposition: { proposition: LEGS[0].text, cite: "fixture" },
  structure: LEG_S1_STRUCTURE,
  tables: rbs.tables,
  paragraphs: cut,
  paragraphPath: join(a.o, "paragraph.md"),
  moveRoute: { move: MOVE, moveStructure: MOVE_STRUCTURE, pairing },
});
ok(
  (cutSheet.match(/the plan wrote no Waypoint for this Segment/g) || []).length === 2,
  "(b) the two Segments with no Waypoint do not say so",
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
const wp = writeBrief(
  "waypoints",
  briefOf(STRUCTURE, [{ ...LEGS[0], waypoints: [{ point: "a point.", serves: ["L1"] }] }, LEGS[1]]),
);
for (const [name, args, want] of [
  ["no-structure", ["--brief", flat, "--leg", "s1", "--move", MOVE, "--library", library], "carries no `structure`"],
  ["leg-waypoints", ["--brief", wp, "--leg", "s1", "--move", MOVE, "--library", library], "waypoints"],
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

// (h) the plan call's inputs, and nothing outside the run changed
const plan = a.seen.find((x) => x.stage === "waypoints");
ok(
  plan &&
    plan.prompt.includes('"move_structure"') &&
    plan.prompt.includes('"pairing"') &&
    plan.prompt.includes(PAIRED_SENTENCE),
  "(h) the plan call's stdin does not carry move_structure, pairing and the smp_paired_plan sentence",
);
ok(sha(PLAN_TABLE) === planTableSha, `(h) ${PLAN_TABLE} changed`);
ok(snapshot() === before, "(h) a file under moves/ or theses/ changed");

// (i) the Move table (kogaki#1840): read by hand-written table, paired in order by the Harness, planned with no name
const { callDir, CALL_FILES } = await imp("src/workflow/call-record.mjs");
const TABLE_FIXTURE = "checks/fixtures/move-table/grant_the_rule_then_withdraw_its_enforcer.yaml";
const TABLE_SENTENCE = JSON.parse(readFileSync("src/structure-mapping-playground/playground-workflow.json", "utf8"))
  .smp_table_plan.judgment_point;
const LEG_H1 = { leg_id: "s2", relation: "h_1", text: "The copy is the installer's.", claims: LEGS[0].claims };
const tableBrief = writeBrief("table-brief", briefOf(STRUCTURE, [LEGS[0], LEG_H1, { ...LEGS[1], leg_id: "s3" }]));
const TABLE_ROUTE = ["--brief", tableBrief, "--leg", "s2", "--move", MOVE, "--library", library];
const TABLE_H1 = { ...TABLE, correspondences: [...TABLE.correspondences, { role: "r_3", expression: "an edit" }] };
const ti = run("table", [...TABLE_ROUTE, "--move-table", TABLE_FIXTURE], { SMP_TABLE: JSON.stringify(TABLE_H1) });
const trec = ti.rec || {};
const tYaml = (f) => (existsSync(join(ti.o, f)) ? parseYaml(readFileSync(join(ti.o, f), "utf8"), f) : null);
ok(ti.res.status === 0, `(i) the table run exited ${ti.res.status}: ${ti.said}`);
ok(
  JSON.stringify((trec.stages || []).map((s) => `${s.stage}:${s.state}`)) ===
    JSON.stringify(["move-reading:done", "pairing:done", "grounding:done", "waypoints:done", "write:done"]),
  `(i) the table run's stages are not the route's five, all done: ${JSON.stringify(trec.stages)}`,
);
ok(
  JSON.stringify(ti.seen.map((x) => x.stage)) === JSON.stringify(["grounding", "waypoints", "writer"]),
  `(i) the table run called the model at move-reading or pairing: ${ti.seen.map((x) => x.stage)}`,
);
ok(
  (trec.stages || [])
    .filter((s) => s.stage === "move-reading" || s.stage === "pairing")
    .every((s) => s.calls === null && s.call_records.length === 0),
  `(i) the record shows a model call at move-reading or pairing: ${JSON.stringify(trec.stages)}`,
);
ok(
  JSON.stringify(tYaml("move-structure.yaml")) ===
    JSON.stringify({
      roles: 3,
      relations: [{ id: "R1" }, { id: "R2" }, { id: "R3" }],
      segments: [
        { segment: 1, states: ["R1"] },
        { segment: 2, states: ["R2"] },
        { segment: 3, states: ["R3"] },
      ],
    }),
  `(i) move-structure.yaml is not the table's: ${JSON.stringify(tYaml("move-structure.yaml"))}`,
);
ok(
  JSON.stringify(tYaml("pairing.yaml")) ===
    JSON.stringify({
      role_pairs: [],
      relation_pairs: [
        { move_relation: "R1", leg_relation: "c_1" },
        { move_relation: "R2", leg_relation: "c_2" },
        { move_relation: "R3", leg_relation: "h_1" },
      ],
    }),
  `(i) pairing.yaml is not the Leg's relations then its higher-order relation, in order: ${JSON.stringify(tYaml("pairing.yaml"))}`,
);
ok(
  trec.move_table && trec.move_table.sha256 === sha(TABLE_FIXTURE),
  `(i) trial.json does not name the table: ${JSON.stringify(trec.move_table)}`,
);
ok(
  ["rbs.yaml", "bind.yaml", "paragraph.md", "sheet.html"].every((f) => existsSync(join(ti.o, f))),
  "(i) the table run did not write its Mapping Table, Waypoints, paragraph and sheet",
);
const tPlan = ti.seen.find((x) => x.stage === "waypoints");
const tPrompt = (tPlan && tPlan.prompt) || "";
ok(tPrompt.includes(TABLE_SENTENCE), "(i) the plan call does not carry the smp_table_plan sentence");
ok(!tPrompt.includes(PAIRED_SENTENCE), "(i) the plan call carries the smp_paired_plan sentence beside the table's");
const tInputPath = join(callDir(join(ti.o, "waypoints"), "paragraph_plan_unit", 1), CALL_FILES.input);
const tInput = existsSync(tInputPath) ? JSON.parse(readFileSync(tInputPath, "utf8")) : {};
const offered = (tInput.paragraph_moves_you_may_bind || [])[0] || {};
ok(
  (tInput.paragraph_moves_you_may_bind || []).length === 1 &&
    offered.id === "move" &&
    JSON.stringify(offered.breaks) === "[]" &&
    tInput.leg_you_must_plan.move === "move",
  `(i) the plan call's recorded input does not offer the one Move as \`move\` with empty breaks: ${JSON.stringify(offered)}`,
);
ok(
  Array.isArray(offered.segments) &&
    offered.segments.length === 3 &&
    offered.segments.every((s) => !Object.hasOwn(s, "operation") && !Object.hasOwn(s, "relation")),
  `(i) a Segment of the plan call carries an operation or relation: ${JSON.stringify(offered.segments)}`,
);
for (const [label, text] of [
  ["the Move's name", MOVE],
  ["`breaks` prose", "breaks if the point is dropped"],
  ["`operation` prose", "names the two parts"],
  ["`relation` prose", "follows from the step before"],
])
  ok(
    !JSON.stringify(tInput).includes(text) && !tPrompt.includes(`"${text}`),
    `(i) the plan call's input carries ${label}`,
  );
const tAnswerPath = join(callDir(join(ti.o, "waypoints"), "paragraph_plan_unit", 1), CALL_FILES.answer);
ok(
  existsSync(tAnswerPath) &&
    JSON.parse(readFileSync(tAnswerPath, "utf8")).move === MOVE &&
    trec.bind &&
    (trec.bind.paragraphs || [])[0] &&
    trec.bind.paragraphs[0].move === MOVE,
  "(i) the named Move's id was not written back into the plan answer's `move` before it was recorded",
);
const tGround = ti.seen.find((x) => x.stage === "grounding");
ok(
  tGround && tGround.prompt.includes('"genericity"') && !tGround.prompt.includes("names the two parts"),
  "(i) the grounding call is not handed the table's Segments in place of their operation",
);
const tSheet = existsSync(join(ti.o, "sheet.html")) ? readFileSync(join(ti.o, "sheet.html"), "utf8") : "";
const tSegs = (tSheet.match(/<section class="card" id="segments">([\s\S]*?)<\/section>/) || [])[1] || "";
ok(
  /<th>#<\/th><th>states<\/th><th>domain<\/th><th>genericity<\/th><th>discourse relation<\/th><th>manner<\/th><th>Waypoints<\/th>/.test(
    tSegs,
  ) &&
    !tSegs.includes("operation") &&
    !tSegs.includes("Unmatched"),
  "(i) the sheet's Segments table is not the table route's columns, with no operation and no Unmatched table",
);
const tRows = ((tSegs.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || "").split("<tr>").slice(1);
ok(
  tRows.length === 3 &&
    tRows[0].includes("R1 → c_1") &&
    tRows[2].includes("R3 → h_1") &&
    tRows[1].includes("Concession → 1") &&
    tRows[2].includes("own words") &&
    tRows[0].includes("PW-1"),
  `(i) the Segments rows do not show each Relation beside its Leg relation, the table's fields and the Waypoints: ${tRows.join(" | ")}`,
);

// (j) the table refused before anything is started, by name, nothing written
const fixtureTable = parseYaml(readFileSync(TABLE_FIXTURE, "utf8"), TABLE_FIXTURE);
const tableFile = (name, f) => {
  const x = structuredClone(fixtureTable);
  f(x);
  const p = join(root, `table-${name}.yaml`);
  writeFileSync(p, stringifyYaml(x));
  return p;
};
for (const [name, file, args, want] of [
  ["t-key", tableFile("key", (x) => (x.extra = 1)), TABLE_ROUTE, "`extra`, which the table does not declare"],
  [
    "t-missing",
    tableFile("missing", (x) => delete x.segments[1].genericity),
    TABLE_ROUTE,
    "Segment 2 carries no `genericity`",
  ],
  ["t-count", tableFile("count", (x) => x.segments.pop()), TABLE_ROUTE, "carries 2 entries, and the named Move has 3"],
  [
    "t-range",
    tableFile("range", (x) => (x.segments[0].states = [4])),
    TABLE_ROUTE,
    "names 4, outside the Relations 1 to 3",
  ],
  [
    "t-unstated",
    tableFile("unstated", (x) => (x.segments[2].states = [2])),
    TABLE_ROUTE,
    "Relation 3 is stated by no Segment",
  ],
  [
    "t-to-self",
    tableFile("self", (x) => (x.segments[1].discourse_relation.to = [2])),
    TABLE_ROUTE,
    "names 2, which is not a Segment before it",
  ],
  [
    "t-to-later",
    tableFile("later", (x) => (x.segments[1].discourse_relation.to = [3])),
    TABLE_ROUTE,
    "names 3, which is not a Segment before it",
  ],
  ["t-apart", tableFile("apart", (x) => (x.segments[0].domain.apart = true)), TABLE_ROUTE, "`domain.apart` is true"],
  [
    "t-particular",
    tableFile("particular", (x) => (x.segments[2].genericity = "particular")),
    TABLE_ROUTE,
    "`genericity` is `particular`",
  ],
  [
    "t-roles",
    tableFile("roles", (x) => (x.roles = 2)),
    TABLE_ROUTE,
    "needs 2 Roles, and the Leg s2's structure holds 3 Roles",
  ],
  ["t-relations", TABLE_FIXTURE, ROUTE, "states 3 Relations, and the Leg s1's structure holds 1 relations"],
]) {
  const r = run(name, [...args, "--move-table", file]);
  ok(
    r.res.status !== 0 && r.said.includes(want) && noWrite(r, name) && r.seen.length === 0,
    `(j) ${name} was not refused naming ${want}: ${r.said}`,
  );
}
for (const [name, args, want] of [
  ["t-alone", ["--move-table", TABLE_FIXTURE], "`--move-table` is a flag of the Brief-Leg route"],
  ["t-empty", [...TABLE_ROUTE, "--move-table"], "`--move-table` takes a file"],
]) {
  const r = run(name, args);
  ok(
    r.res.status !== 0 && r.said.includes(want) && noWrite(r, name),
    `(j) ${name} was not refused naming ${want}: ${r.said}`,
  );
}
ok(snapshot() === before, "(j) a file under moves/ or theses/ changed");

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`structure-mapping-playground-move: ${cases} case(s) pass, (a)-(j)`);
