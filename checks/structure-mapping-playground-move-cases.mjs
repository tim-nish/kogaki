// The cases of checks/check-structure-mapping-playground-move.sh (kogaki#1830), each stated in that member's `contract` in
// checks/registry.json, over a fixture Brief and a fixture Move library:
//   (a) the route's stages and files, case own, no Analogy Mapping, no call but grounding, the readback and the writer;
//   (b) the sheet's Segments rows, the three columns `#`, `bind` and `Edges`, above the paragraph;
//   (c) the flags; (d) the Brief, Leg and Move refused by value with nothing written;
//   (g) the Leg's structure; (h) no call of the row `paragraph_plan_unit` (kogaki#1883), an unchanged production row,
//   moves/ and theses/; (i) the same route under `--move-edges`, which changes nothing (kogaki#1880, kogaki#1922), with
//   no call between grounding and the writer but the readback (kogaki#1876); (j) a Move with no `bind` and `edges`, a
//   Move whose Bind targets are not the Leg's, `--move-table` and `--move-edges` refused by name, nothing written.
//   Cases (e) and (f) went with the two calls whose answers they checked (kogaki#1922), and case (k) with its call
//   (kogaki#1876). (l) the `readback` stage and its debugging file (kogaki#1905).
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
import { dirname, join, resolve } from "node:path";
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
const { legRecord, writeBriefFiles } = await imp("src/compose.mjs");
const { stringifyYaml, parseYaml } = await imp("src/yaml.mjs");
const { legStructureOf, readBriefLeg } = await imp("src/structure-mapping-playground/move-structure.mjs");
const { legRows } = await imp("src/sme/arguments.mjs");
const { debugRecord } = await imp("src/structure-mapping-playground/readback.mjs");
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

// ---- the Move library: one Move of three Segments in the form the ingest writes, with no `bind` and `edges`, and two
// Moves of moves/ whose Segments carry them ----
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
    segments: [{}, {}, {}],
  }),
);

// ---- the Brief: three Roles, and in the one list two relations, a higher-order relation and one over it ----
const STRUCTURE = {
  roles: [
    { id: "r_1", name: "installer", context: "the program that copies the kit.", attributes: [], claims: ["L1"] },
    { id: "r_2", name: "copy", context: "the files it writes.", attributes: [], claims: ["L1"] },
    { id: "r_3", name: "edit", context: "a change the consumer makes.", attributes: [], claims: ["L2"] },
  ],
  relations: [
    { id: "c_1", name: "writes", between: ["r_1", "r_2"], holds: "The {r_1} writes the {r_2}.", from: "L1" },
    { id: "c_2", name: "overwrites", between: ["r_2", "r_3"], holds: "The {r_2} overwrites any {r_3}.", from: "L2" },
    { id: "c_3", name: "ownership", relates: ["c_1", "c_2"], holds: "The {r_2} is the {r_1}'s.", from: ["L1", "L2"] },
    { id: "c_4", name: "reach", relates: ["c_3", "c_1"], holds: "What the {r_1} writes is its own.", from: ["L1"] },
  ],
  attains_thesis: "c_4",
  reach: ["c_1", "c_2", "c_3", "c_4"],
  unreached: { relations: [], claims: [] },
};
// The same structure as a Brief stored it before the one list: `higher_order` beside `relations`, and `h_<n>` ids.
const STORED_STRUCTURE = {
  roles: STRUCTURE.roles,
  relations: STRUCTURE.relations.slice(0, 2),
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
    relation: "c_4",
    text: "What the installer writes is its own.",
    claims: [{ strand: "L1", proposition: "the installer copies the kit." }],
    reaches_target: true,
  },
];
const briefOf = (structure, legs) => ({
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
// The Brief's three files (kogaki#1955); a record with no `structure` has no structure.yaml beside it.
const writeBrief = (name, record) => {
  const p = join(root, name, "brief.yaml");
  mkdirSync(join(root, name), { recursive: true });
  writeBriefFiles(p, record);
  if (!record.structure) rmSync(join(root, name, "structure.yaml"));
  return p;
};
const textsOf = (p) =>
  ["brief.yaml", "structure.yaml", "reader-path.yaml"].map((f) => readFileSync(join(dirname(p), f), "utf8")).join("");
const brief = writeBrief("brief", briefOf(STRUCTURE, LEGS));

// ---- the answer of the grounding call ----
const TABLE = {
  base: { domain: "a kit installed into a repository" },
  correspondences: [
    { role: "r_1", expression: "the installer" },
    { role: "r_2", expression: "the copied kit" },
  ],
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
  const row = (id) => prompt.includes("\\\`" + id + "\\\` judgment point");
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
const LEG_H1 = { leg_id: "s2", relation: "c_3", text: "The copy is the installer's.", claims: LEGS[0].claims };
const tableBrief = writeBrief("table-brief", briefOf(STRUCTURE, [LEGS[0], LEG_H1, { ...LEGS[1], leg_id: "s3" }]));
const EDGES_ROUTE = ["--brief", tableBrief, "--leg", "s2", "--move", EDGED, "--library", library];
const TABLE_H1 = { ...TABLE, correspondences: [...TABLE.correspondences, { role: "r_3", expression: "an edit" }] };

// (a) the route's stages and files, with no flag beside its three
const a = run("route", EDGES_ROUTE, { SMP_TABLE: JSON.stringify(TABLE_H1) });
const rec = a.rec || {};
ok(a.res.status === 0, `(a) the run exited ${a.res.status}: ${a.said}`);
ok(
  JSON.stringify((rec.stages || []).map((s) => `${s.stage}:${s.state}`)) ===
    JSON.stringify(["move-reading:done", "pairing:done", "grounding:done", "readback:done", "write:done"]),
  `(a) the stages are not move-reading, pairing, grounding, readback and write, all done: ${JSON.stringify(rec.stages)}`,
);
ok(
  JSON.stringify(a.seen.map((x) => x.stage)) === JSON.stringify(["grounding", "readback", "writer"]),
  `(a) the run made a call beside grounding, the readback and the writer (kogaki#1922): ${a.seen.map((x) => x.stage)}`,
);
const yamlAt = (f) => (existsSync(join(a.o, f)) ? parseYaml(readFileSync(join(a.o, f), "utf8"), f) : null);
const rbs = yamlAt("rbs.yaml") || {};
ok(
  Array.isArray(rbs.tables) && rbs.tables.length === 1 && rbs.tables[0].move === EDGED && Array.isArray(rbs.bindings),
  `(a) rbs.yaml is not the named Move's one Mapping Table with its paragraph record: ${JSON.stringify(rbs)}`,
);
// The Harness writes one paragraph record naming the Move given, and no `waypoints` folder (kogaki#1883).
const aParagraphs = (rec.bind && rec.bind.paragraphs) || [];
ok(
  aParagraphs.length === 1 &&
    aParagraphs[0].move === EDGED &&
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
  rec.bind && rec.bind.move === EDGED && rec.bind.case === "own" && rec.bind.inference_move === null,
  `(a) trial.json's bind does not hold the named Move under case own: ${JSON.stringify(rec.bind)}`,
);
ok(
  rec.route === "brief-leg" &&
    rec.brief &&
    rec.brief.leg === "s2" &&
    rec.brief.sha256 === createHash("sha256").update(textsOf(tableBrief)).digest("hex"),
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
const { SEGMENT_COLUMNS } = await imp("src/structure-mapping-playground/sheet.mjs");
const SEGMENT_HEAD = `<thead><tr>${SEGMENT_COLUMNS.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
ok(
  SEGMENT_COLUMNS.join() === "#,Bind target,given,domain,points to,Sense,Hypophora" &&
    segs.includes(SEGMENT_HEAD) &&
    rows.every((r) => (r.match(/<td>/g) || []).length === 7) &&
    !segs.includes("Unmatched"),
  `(b) a Segments row is not the seven columns of the Move's Segments (kogaki#1953), or an Unmatched table stands (kogaki#1922): ${rows[0]}`,
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
const wpRecord = briefOf(STRUCTURE, LEGS);
wpRecord.reader_path[0].waypoints = [{ point: "a point." }];
const wp = writeBrief("waypoints", wpRecord);
for (const [name, args, want] of [
  [
    "no-structure",
    ["--brief", flat, "--leg", "s1", "--move", MOVE, "--library", library],
    "no structure.yaml beside it",
  ],
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

// (e) and (f) went with the two calls whose answers they checked (kogaki#1922).

// (g) the Leg's structure
const storedBrief = writeBrief(
  "stored-brief",
  briefOf(STORED_STRUCTURE, [LEGS[0], { ...LEG_H1, relation: "h_1" }, { ...LEGS[1], leg_id: "s3", relation: "h_2" }]),
);
const storedText = textsOf(storedBrief);
const LEG_S1 = legStructureOf(STRUCTURE, "c_1");
const LEG_H2 = legStructureOf(STRUCTURE, "c_4");
const ids = (s) => [s.roles, s.relations].map((l) => l.map((x) => x.id).join(",")).join(" | ");
ok(
  ids(LEG_S1) === "r_1,r_2 | c_1" && JSON.stringify(Object.keys(LEG_S1)) === '["roles","relations"]',
  `(g) the Leg of c_1 reads ${ids(LEG_S1)}`,
);
// A Brief stored before the one list reads as the Brief stored after it: each Leg, its structure and its table rows the
// same, the `h_<n>` ids renamed and the stored file left as it was.
const storedLegs = ["s1", "s2", "s3"].map((leg) => [readBriefLeg(storedBrief, leg), readBriefLeg(tableBrief, leg)]);
const rowsOf = (b) => JSON.stringify(legRows(b.record.structure, b.leg.relation));
ok(
  ids(LEG_H2) === "r_1,r_2,r_3 | c_1,c_2,c_3,c_4" &&
    storedLegs.every(
      ([was, now]) =>
        !was.error &&
        !now.error &&
        JSON.stringify(was.leg) === JSON.stringify(now.leg) &&
        JSON.stringify(was.structure) === JSON.stringify(now.structure) &&
        JSON.stringify(was.record) === JSON.stringify(now.record) &&
        rowsOf(was) === rowsOf(now) &&
        JSON.stringify([...was.renamed]) === '[["h_1","c_3"],["h_2","c_4"]]' &&
        now.renamed.size === 0,
    ) &&
    rowsOf(storedLegs[1][0]).includes(
      '"symbol":"{c_3}","name":"ownership","kind":"Relation","arguments":"{c_1}, {c_2}"',
    ) &&
    textsOf(storedBrief) === storedText,
  `(g) the Leg of c_4 reads ${ids(LEG_H2)}, or a Brief stored under \`relations\` and \`higher_order\` does not read as the same Legs and rows with its ids renamed: ${JSON.stringify(storedLegs.map(([was]) => was.error || [was.leg.relation, [...was.renamed]]))}`,
);

// (h) no call of the row `paragraph_plan_unit` (kogaki#1883), and nothing outside the run changed
ok(
  !a.seen.some((x) => x.prompt.includes("`paragraph_plan_unit`")),
  "(h) the route made a call with the row `paragraph_plan_unit`",
);
ok(sha(PLAN_TABLE) === planTableSha, `(h) ${PLAN_TABLE} changed`);
ok(snapshot() === before, "(h) a file under moves/ or theses/ changed");

// (i) under `--move-edges`, which changes nothing (kogaki#1880, kogaki#1922): each Segment's `bind` and `edges` read from
// the Move file, its Bind targets given the Leg's Arguments and CentralClaim in order by the Harness, and no call made
// between grounding and the writer (kogaki#1876)
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
        { bind: 3, kind: "CentralClaim", leg: "c_3" },
      ],
    }),
  `(i) pairing.yaml is not the Leg's Arguments then its CentralClaim, in order: ${JSON.stringify(tYaml("pairing.yaml"))}`,
);
ok(
  !Object.hasOwn(trec, "move_edges") && !Object.hasOwn(trec, "move_table"),
  `(i) trial.json records the flag or a second file: ${JSON.stringify(trec.move_edges)}`,
);
const sameWriter = (r) => (r.seen.find((x) => x.stage === "writer") || {}).prompt;
ok(
  JSON.stringify(a.seen.map((x) => x.stage)) === JSON.stringify(ti.seen.map((x) => x.stage)) &&
    sameWriter(a) !== undefined &&
    sameWriter(a) === sameWriter(ti) &&
    JSON.stringify(yamlAt("move-structure.yaml")) === JSON.stringify(tYaml("move-structure.yaml")) &&
    JSON.stringify(yamlAt("pairing.yaml")) === JSON.stringify(tYaml("pairing.yaml")),
  "(i) the run under --move-edges differs from the run without it in its calls, the Writer's input, the move structure or the pairing (kogaki#1922)",
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
// The Writer is handed the plan and no Point: the table of the Leg's structure, the symbols of its CentralClaim and
// Arguments, and one part per Segment.
const tWriter = ((ti.seen.find((x) => x.stage === "writer") || {}).prompt || "").split("\n");
ok(
  [
    "| {r_1} | installer | Role |  | the program that copies the kit. |",
    "| {r_2} | copy | Role |  | the files it writes. |",
    "| {r_3} | edit | Role |  | a change the consumer makes. |",
    "| {c_1} | writes | Relation | {r_1}, {r_2} | The {r_1} writes the {r_2}. |",
    "| {c_2} | overwrites | Relation | {r_2}, {r_3} | The {r_2} overwrites any {r_3}. |",
    "| {c_3} | ownership | Relation | {c_1}, {c_2} | The {r_2} is the {r_1}'s. |",
    "The CentralClaim of this paragraph is {c_3}.",
    "Its Arguments are {c_1}, {c_2}.",
    "1. {c_1}. Pointed to by part 2.",
    "2. {c_2}. To part 1: a causal relation expected on the basis of one is cancelled or denied by the situation the other describes. Here this sentence denies the expectation. The reader is led to expect something and is then told it does not hold. Pointed to by part 3.",
    "3. {c_3}. To part 2: the situations the two describe are causally tied, and not as a condition. Here this sentence gives the effect. The reader learns why a situation holds, or what it led to.",
  ].every((l) => tWriter.includes(l)),
  `(i) the writer's stdin does not hold the table of the Leg's structure, the symbols of its CentralClaim and Arguments and the three parts: ${JSON.stringify(tWriter.filter((l) => /^(\| \{|The CentralClaim |Its Arguments |\d+\. )/.test(l)))}`,
);
ok(
  !tWriter.some((l) => l.includes("PW-") || l.includes("*Serves:*")),
  "(i) the writer's stdin carries a Point or a Serves line",
);
const tGround = ti.seen.find((x) => x.stage === "grounding");
ok(
  tGround &&
    tGround.prompt.includes('"edges"') &&
    !tGround.prompt.includes('"genericity"') &&
    !tGround.prompt.includes('"operation"') &&
    !tGround.prompt.includes('"relation"') &&
    !tGround.prompt.includes('"manner"'),
  "(i) the grounding call is not handed each Segment's number, bind and edges and nothing else of a Segment",
);
const tSheet = existsSync(join(ti.o, "sheet.html")) ? readFileSync(join(ti.o, "sheet.html"), "utf8") : "";
const tSegs = (tSheet.match(/<section class="card" id="segments">([\s\S]*?)<\/section>/) || [])[1] || "";
// The Move's description on the sheet (kogaki#1913), above how the Move was taken and the table of its Segments
// (kogaki#1953); the description is handed to neither the Writer nor the Readback call.
const tMove = parseYaml(readFileSync("moves/grant_the_rule_then_withdraw_its_enforcer.yaml", "utf8"));
ok(
  tSegs.startsWith(
    `<h2>Segments</h2><p>${tMove.description}</p><p class="meta">The Move was named by --move, and its Bind targets are given the Leg's first sentences in order.</p>`,
  ) &&
    tSegs.includes(SEGMENT_HEAD) &&
    !tSegs.includes("Given to no Segment") &&
    !tSegs.includes("genericity") &&
    !tSegs.includes("Unmatched") &&
    !tSegs.includes("Waypoint"),
  "(i) the sheet's Segments section does not open with the Move's description and how the Move was taken and show the seven columns, or it holds a sentence given to no Segment, genericity, an Unmatched table or a Waypoints column",
);
const tReadback = (ti.seen.find((x) => x.stage === "readback") || {}).prompt || "";
ok(
  !tWriter.join("\n").includes(tMove.description) && !tReadback.includes(tMove.description),
  "(i) the Writer's input or the Readback call's input holds the Move's description",
);
const tRows = ((tSegs.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || "").split("<tr>").slice(1);
ok(
  tRows.length === 3 &&
    tRows[0].includes("<td>1</td><td>1</td><td>Argument c_1: The installer writes the copy.</td><td>own</td>") &&
    tRows[0].includes("<td>none</td><td>none</td><td>none</td>") &&
    tRows[2].includes("<td>3</td><td>3</td><td>CentralClaim c_3: The copy is the installer's.</td>") &&
    tRows[1].includes("<td>Segment 1</td><td>Concession.Denier</td><td>none</td>") &&
    tRows[2].includes("<td>Segment 2</td><td>Cause.Result</td><td>none</td>"),
  `(i) the Segments rows do not show each Bind target, the Argument or CentralClaim it is given with its sentence, its domain and each Edge's Segment, Sense and Hypophora: ${tRows.join(" | ")}`,
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
const tSentences = legSentences(STRUCTURE, "c_3");
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
  // The saved reading was made of a Brief stored before the one list and names its CentralClaim `h_1`; read with the
  // renaming the Brief's reader gives, that sentence carries the id the Brief's Leg now names.
  const xRenamed = L.readLegSensesFolder(READING, resolve(repo, BRIEF), "L4", new Map([["h_1", "c_6"]]));
  const sentenceIds = (r) => ((r.reading || {}).sentences || []).map((s) => s.id).join(",");
  ok(
    x.reading &&
      x.reading.pairs.length === 3 &&
      sentenceIds(x) === "c_2,c_3,h_1" &&
      sentenceIds(xRenamed) === "c_2,c_3,c_6",
    `(i) the saved reading was not read, or not read under the ids its Brief now carries: ${JSON.stringify(x.error)} ${sentenceIds(xRenamed)}`,
  );
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
  ["unedged", unedgedRoute, `the Move ${MOVE} carries no \`bind\` and \`edges\` on its Segments`],
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

// (p) the Move and its filling (kogaki#1953): a named Move of fewer Bind targets than the Leg has sentences is given the
// first ones in order with no reading, and the sentences its reading's best filling gives with one; with a reading
// and no `--move` the Move is the one `chooseMove` takes; the Writer and the Readback are handed the fitted Segments;
// with no Move of the library a candidate the Trial is refused before anything is started.
{
  const env = { SMP_TABLE: JSON.stringify(TABLE_H1) };
  const yamlOf = (r, f) => (existsSync(join(r.o, f)) ? parseYaml(readFileSync(join(r.o, f), "utf8"), f) : null);
  const segsOf = (r) => {
    const f = join(r.o, "sheet.html");
    const html = existsSync(f) ? readFileSync(f, "utf8") : "";
    return (html.match(/<section class="card" id="segments">([\s\S]*?)<\/section>/) || [])[1] || "";
  };
  const debugBinds = (r) =>
    existsSync(join(r.o, "packet-debug.json"))
      ? JSON.parse(readFileSync(join(r.o, "packet-debug.json"), "utf8")).parts.map((x) => x.bind)
      : null;
  const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const p1 = run("two-targets", swapRoute, env);
  ok(
    p1.res.status === 0 &&
      same((p1.rec || {}).move_choice, { by: "named", filling: { 1: 1, 2: 2 }, met: null, compared: null }) &&
      same(yamlOf(p1, "pairing.yaml"), {
        binds: [
          { bind: 1, kind: "Argument", leg: "c_1" },
          { bind: 2, kind: "Argument", leg: "c_2" },
        ],
      }) &&
      same(debugBinds(p1), [null, 1, 2]),
    `(p) a named Move of two Bind targets was not given the Leg's first two sentences in order: ${p1.said} ${JSON.stringify((p1.rec || {}).move_choice)}`,
  );
  ok(
    segsOf(p1).includes("<p>Given to no Segment: CentralClaim c_3: The copy is the installer's.</p>") &&
      segsOf(p1).includes("<td>3</td><td>2</td><td>Argument c_2: The copy overwrites any edit.</td><td>both</td>") &&
      segsOf(p1).includes("<td>Segment 2</td><td>Cause.Reason</td><td>answer</td>") &&
      segsOf(p1).includes("<td>2</td><td>1</td>") &&
      segsOf(p1).includes("<td>1</td><td>none</td><td>none</td><td>neither</td>"),
    `(p) the Segments section does not show the sentence given to no Segment, a Segment with no Bind target, a domain and an Edge's Hypophora: ${segsOf(p1)}`,
  );
  // A reading under which the two-target Move's one compared Edge is met only with its Bind targets given the
  // CentralClaim and then the first Argument: the first Argument gives the reason, stored as the CentralClaim giving
  // the result.
  const turned = join(root, "reading-turned");
  mkdirSync(turned);
  writeFileSync(
    join(turned, "leg-senses-run.json"),
    JSON.stringify({ brief: { leg: "s2", path: relFromRepo(tableBrief) }, sentences: tSentences, state: "finished" }),
  );
  writeFileSync(
    join(turned, "counts.json"),
    JSON.stringify({
      pairs: pairsOf(tSentences.length).map((pair) => ({
        pair,
        answers: [
          pair.join() === "1,3"
            ? { sense: "Cause.Result", played_by: 3, named: 5, place_sum: 5, candidate: true }
            : { sense: "Contrast", played_by: null, named: 4, place_sum: 4, candidate: true },
        ],
      })),
    }),
  );
  const TURNED = { by: "chosen", filling: { 1: 3, 2: 1 }, met: 1, compared: 1 };
  const chosenRoute = ["--brief", tableBrief, "--leg", "s2", "--library", library, "--leg-senses", turned];
  const p2 = run("chosen", chosenRoute, env);
  ok(
    p2.res.status === 0 &&
      (p2.rec || {}).bind.move === TWO_TARGETS &&
      same((p2.rec || {}).move_choice, TURNED) &&
      same(yamlOf(p2, "pairing.yaml"), {
        binds: [
          { bind: 1, kind: "CentralClaim", leg: "c_3" },
          { bind: 2, kind: "Argument", leg: "c_1" },
        ],
      }),
    `(p) with a reading and no --move the Move and its filling are not the ones Move choice takes: ${p2.said} ${JSON.stringify((p2.rec || {}).move_choice)}`,
  );
  const p2Writer = ((p2.seen.find((x) => x.stage === "writer") || {}).prompt || "").split("\n");
  ok(
    same(debugBinds(p2), [null, 3, 1]) &&
      p2Writer.some((l) => l.startsWith("2. {c_3}.")) &&
      p2Writer.some((l) => l.startsWith("3. {c_1}.")) &&
      segsOf(p2).includes(
        "The Move was chosen from the reading of the Leg's Senses, as /paragraph-plan chooses it. Under it the Leg meets 1 of the Move's 1 compared Edges.",
      ) &&
      segsOf(p2).includes("<p>Given to no Segment: Argument c_2: The copy overwrites any edit.</p>"),
    `(p) the Writer and the Readback were not handed the Segments under the chosen filling, or the sheet does not say how the Move was taken: ${p2Writer.filter((l) => /^\d+\. /.test(l)).join(" | ")}`,
  );
  const p3 = run("named-turned", [...swapRoute, "--leg-senses", turned], env);
  ok(
    p3.res.status === 0 &&
      same((p3.rec || {}).move_choice, { ...TURNED, by: "named" }) &&
      segsOf(p3).includes(
        "The Move was named by --move, and its Bind targets are given the sentences that meet the most of its compared Edges.",
      ),
    `(p) a named Move under a reading is not given the reading's best filling: ${p3.said} ${JSON.stringify((p3.rec || {}).move_choice)}`,
  );
  const bare = join(root, "moves-bare");
  mkdirSync(bare);
  writeFileSync(join(bare, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeFileSync(join(bare, `${MOVE}.yaml`), readFileSync(join(library, `${MOVE}.yaml`)));
  const p4 = run(
    "no-candidate",
    chosenRoute.map((x) => (x === library ? bare : x)),
  );
  ok(
    p4.res.status === 1 &&
      p4.said.includes("is a candidate for the Leg s2") &&
      p4.said.includes("Nothing was started") &&
      !existsSync(p4.o) &&
      p4.seen.length === 0,
    `(p) a library with no candidate Move was not refused before anything was started: ${p4.said}`,
  );
  const p5 = run("no-move", ["--brief", tableBrief, "--leg", "s2", "--library", library]);
  ok(
    p5.res.status === 1 && p5.said.includes("`--move` is required beside `--brief`") && !existsSync(p5.o),
    `(p) a run with neither --move nor --leg-senses was not refused naming --move: ${p5.said}`,
  );
  ok(snapshot() === before, "(p) a file under moves/ or theses/ changed");
}

// (l) the `readback` stage under `--move-edges` (kogaki#1882): one call, packet-debug.json (kogaki#1905) and one row per
// Segment on the sheet; the Writer's input unchanged by its answer; a refused answer shown and the writer run; a null
// readback two empty cells.
{
  const section = (o) => {
    const f = join(o, "sheet.html");
    const html = existsSync(f) ? readFileSync(f, "utf8") : "";
    return (html.match(/<section class="card" id="readback">([\s\S]*?)<\/section>/) || [])[1] || "";
  };
  const rowsOf = (html) => ((html.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || "").split("<tr>").slice(1);
  const debugOf = (o) =>
    existsSync(join(o, "packet-debug.json")) ? JSON.parse(readFileSync(join(o, "packet-debug.json"), "utf8")) : null;
  const written = debugOf(ti.o);
  const lSection = section(ti.o);
  const lRows = rowsOf(lSection);
  ok(
    ti.seen.filter((x) => x.stage === "readback").length === 1 &&
      written !== null &&
      !existsSync(join(ti.o, "readback.json")) &&
      trec.readback &&
      trec.readback.path &&
      trec.readback.path.endsWith("packet-debug.json"),
    `(l) the readback stage did not make one call, write packet-debug.json and no readback.json, and name it: ${JSON.stringify(trec.readback)}`,
  );
  ok(
    written !== null &&
      Object.keys(written).join() === "move,parts" &&
      written.move === EDGED &&
      written.parts.length === 3 &&
      written.parts.every(
        (p, i) =>
          Object.keys(p).join() === "part,line,bind,edges,readback,sample" &&
          p.part === i + 1 &&
          p.line === trec.readback.plan[i] &&
          p.bind === i + 1 &&
          p.readback === READBACK.parts[i].readback &&
          p.sample === READBACK.parts[i].sample,
      ) &&
      JSON.stringify(written.parts.map((p) => p.edges)) ===
        JSON.stringify([[], [{ sense: "Concession.Denier", to: [1] }], [{ sense: "Cause.Result", to: [2] }]]),
    `(l) packet-debug.json does not hold the Move's id and each part's line, bind, Edges, Readback and Sample: ${JSON.stringify(written)}`,
  );
  ok(
    lSection.includes(
      `<table><caption>${EDGED}</caption><thead><tr><th>#</th><th>Edges</th><th>plan</th><th>Readback</th><th>Sample</th></tr></thead>`,
    ) &&
      lRows.length === 3 &&
      lRows[1].includes(
        "<td>2</td><td>Concession.Denier → 1</td><td>2. {c_2}. To part 1: a causal relation expected on the basis of one is cancelled or denied by the situation the other describes. Here this sentence denies the expectation. The reader is led to expect something and is then told it does not hold. Pointed to by part 3.</td>",
      ) &&
      lRows[1].includes(`<td>${READBACK.parts[1].readback}</td><td>${READBACK.parts[1].sample}</td>`) &&
      lRows[0].startsWith("<td>1</td><td>none</td>"),
    `(l) the sheet's readback table does not hold the Move's id, the five column heads and one row per part: ${lSection.slice(0, 400)}`,
  );
  const alone = debugRecord(
    "m",
    [
      { bind: null, edges: [{ sense: null, hypophora: "answer", to: [2] }] },
      { bind: 1, edges: [{ sense: "Contrast", to: [1] }] },
    ],
    ["1. a", "2. b"],
  );
  ok(
    JSON.stringify(alone) ===
      JSON.stringify({
        move: "m",
        parts: [
          { part: 1, line: "1. a", bind: null, edges: [{ sense: null, to: [2], hypophora: "answer" }] },
          { part: 2, line: "2. b", bind: 1, edges: [{ sense: "Contrast", to: [1] }] },
        ],
      }),
    `(l) debugRecord does not keep a null sense and a null bind, with \`hypophora\` only where the Edge carries it: ${JSON.stringify(alone)}`,
  );
  const between = (text, close) => {
    const ls = String(text || "").split("\n");
    return ls.slice(1, ls.indexOf(close)).join("\n");
  };
  const rPrompt = (ti.seen.find((x) => x.stage === "readback") || {}).prompt;
  const wPrompt = (ti.seen.find((x) => x.stage === "writer") || {}).prompt;
  ok(
    between(rPrompt, "## Read back") !== "" &&
      between(rPrompt, "## Read back") === between(wPrompt, "## Write") &&
      !String(rPrompt).split("\n").includes("----- THE PLAN -----"),
    "(l) the Readback's input between its title and its closing section is not the Writer's between its title and its own",
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
  const readbackOf = (r) => (r.seen.find((x) => x.stage === "readback") || {}).prompt || "";
  const named = [EDGED, "Concession.Denier", "Cause.Result", "packet-debug.json"];
  ok(
    tj.res.status === 0 &&
      writerOf(tj) !== undefined &&
      writerOf(tj) === writerOf(ti) &&
      readbackOf(ti) !== "" &&
      named.every((n) => !writerOf(ti).includes(n) && !readbackOf(ti).includes(n)),
    "(l) the Writer's input differs between two Trials whose readback answered differently, or it or the Readback call's input names the Move, a Sense or the debugging file",
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
      JSON.stringify(debugOf(tr.o)) ===
        JSON.stringify({
          move: EDGED,
          parts: written.parts.map((p) => ({ part: p.part, line: p.line, bind: p.bind, edges: p.edges })),
        }) &&
      tr.rec.readback.path.endsWith("packet-debug.json") &&
      tr.rec.readback.refusal.includes("not one JSON record") &&
      rSection.includes("refused") &&
      rSection.includes("NOT A RECORD") &&
      !rSection.includes("<table>"),
    `(l) a refused readback did not leave the writer running and show the refusal with no table: ${rStages} ${rSection}`,
  );
  ok(
    lRows.length > 0 && lRows[0].includes("<td>1. {c_1}. Pointed to by part 2.</td><td></td><td></td>"),
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

// (n) under a plan the Trial hands no claims block: neither input holds its heading, and each holds the plan's.
{
  const CLAIMS = "## The claims this Leg asserts";
  const PLAN = "## The plan of this paragraph";
  const inputs = [tWriter, tReadback.split("\n")];
  ok(
    inputs.every((lines) => lines.includes(PLAN) && !lines.some((l) => l.startsWith(CLAIMS))),
    `(n) under a plan the Writer's input or the Readback call's input holds the heading "${CLAIMS}", or holds no plan block`,
  );
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`structure-mapping-playground-move: ${cases} case(s) pass, (a)-(d), (g)-(j), (l)-(n), (p)`);
