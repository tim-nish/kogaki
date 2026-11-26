// The cases of checks/check-brief-files.sh (kogaki#1955), each stated in that member's `contract` in
// checks/registry.json: (a) adoption writes the three files and the BriefPlanPlayground (kogaki#1967); (b)
// `readAdoptedBrief` gives each Leg its relation's `holds`; (c) a hand edit of a `holds`; (d) a Leg removed and two
// reordered; (e) each refusal of the reader, by the `check` verb, and the relation `attains_thesis` names read over
// three relations; (f) the `split` verb, refused over a relation between three Roles; (g) a ParagraphPlan made before a
// hand edit of structure.yaml found stale.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from "node:fs";
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
const { readHolds } = await imp("src/compose/structure.mjs");
const { readAdoptedBrief } = await imp("src/paragraph-plan/brief.mjs");
const { paragraphPlanView } = await imp("src/paragraph-plan/view.mjs");
const root = mkdtempSync(join(tmpdir(), "brief-files-"));
const FILES = ["brief.yaml", "structure.yaml", "reader-path.yaml"];

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
      from: ["L1"],
    },
  ],
  attains_thesis: "c_3",
  reach: ["c_1", "c_2", "c_3"],
  unreached: { relations: [], claims: [] },
};
const claim = [{ strand: "L1", proposition: "the rule starts the guard." }];
const LEGS = [
  { leg_id: "s1", relation: "c_1", claims: claim, opens_section: "Where the rule starts." },
  { leg_id: "s2", relation: "c_2", claims: claim },
  { leg_id: "s3", relation: "c_1", claims: claim },
  { leg_id: "s4", relation: "c_3", claims: claim, reaches_target: true },
];
const RECORD = {
  slug: "brief-files",
  compose_path: "audiences/dev-to-zenn.md",
  strands: [
    { id: "L1", slug: "a", cite: `coding::lesson/a@${"0".repeat(64)}` },
    { id: "L2", slug: "b", cite: `coding::lesson/b@${"0".repeat(64)}` },
  ],
  thesis: "What the rule starts stops the request.",
  structure: STRUCTURE,
  reader_path: LEGS,
  strand_coverage: [],
  journey_coverage: [],
  tradeoffs: {},
  bridged: {},
};
const SAID = {
  c_1: "The rule starts the guard.",
  c_2: "The guard stops each request.",
  c_3: "What the rule starts stops the request.",
};

let n = 0;
// A Brief's three files from a record, each then edited by `edit` over its parsed value: `{ brief, structure, readerPath }`.
const briefAt = (edit = {}, record = RECORD) => {
  const dir = join(root, "theses", `b${++n}`);
  mkdirSync(dir, { recursive: true });
  const at = join(dir, "brief.yaml");
  const t = C.briefFileTexts(record);
  for (const [k, file] of [
    ["brief", "brief.yaml"],
    ["structure", "structure.yaml"],
    ["readerPath", "reader-path.yaml"],
  ]) {
    if (edit[k] === null) continue;
    writeFileSync(join(dir, file), edit[k] ? stringifyYaml(edit[k](parseYaml(t[k], file))) : t[k]);
  }
  return at;
};
const cli = (verb, at) => {
  const r = spawnSync(process.execPath, ["src/brief-files.mjs", verb, "--brief", at], {
    encoding: "utf8",
    timeout: 60000,
  });
  return { status: r.status, out: r.stdout, err: r.stderr };
};
const textsAt = (at) => FILES.map((f) => readFileSync(join(resolve(at, ".."), f), "utf8")).join("");

// (a) ADOPTION WRITES THE THREE FILES, no Leg carrying `text`, its snapshots holding all three.
{
  const { selectionOptionIds } = await imp("src/assemble.mjs");
  const fx = "checks/fixtures/adopt-candidate";
  const reviewed = JSON.parse(readFileSync(join(fx, "reviewed.json"), "utf8"));
  const minted = C.parseBriefRecord(readFileSync(join(fx, "brief.yaml"), "utf8"), "brief.yaml").record;
  const legs = reviewed.candidates[0].legs;
  minted.structure = {
    roles: [
      { id: "r_1", name: "claim", context: "What the fixture claims.", attributes: [], claims: ["L1"] },
      { id: "r_2", name: "object", context: "The fixture's second Role.", attributes: [], claims: ["L1"] },
    ],
    relations: legs.map((l) => ({
      id: l.relation,
      name: l.relation,
      between: ["r_1", "r_2"],
      holds: l.text,
      from: "L1",
    })),
    attains_thesis: legs[1].relation,
  };
  const slug = `brief-files-adopt-${process.pid}`;
  const dir = join(root, "theses", slug);
  mkdirSync(dir, { recursive: true });
  const at = join(dir, "brief.yaml");
  writeFileSync(at, C.briefRecordText(minted));
  writeFileSync(join(root, "reviewed.json"), JSON.stringify(reviewed));
  const ids = selectionOptionIds(reviewed, minted).ids;
  const selection = {
    rows: [
      {
        gate_id: "brief-candidate-selection",
        evidence: { tool: "AskUserQuestion", tool_use_id: "toolu_fixture_brief_files" },
        answers_over: { option_set_digest: C.ownerGateDigest("brief-candidate-selection", ids) },
        payload: { answer: { option: "cand-a" } },
      },
    ],
  };
  writeFileSync(join(root, "selection.json"), JSON.stringify(selection));
  const adopt = (brief) =>
    spawnSync(
      process.execPath,
      ["src/assemble.mjs", "adopt-candidate", "--brief", brief, "--reviewed", join(root, "reviewed.json")].concat([
        "--candidate",
        "cand-a",
        "--selection",
        join(root, "selection.json"),
      ]),
      { encoding: "utf8", timeout: 60000 },
    );
  const r = adopt(at);
  const snaps = join(repo, "runs", "brief", slug, "snapshots");
  const after = existsSync(snaps) ? readdirSync(snaps).find((f) => f.endsWith("-after.yaml")) : null;
  const afterText = after ? readFileSync(join(snaps, after), "utf8") : null;
  rmSync(join(repo, "runs", "brief", slug), { recursive: true, force: true });
  ok(r.status === 0, `(a) adoption refused: ${r.stderr}`);
  // THE BRIEFPLANPLAYGROUND IS WRITTEN BY ADOPTION (kogaki#1967), under the fixture's runs directory.
  const page = join(root, "runs", "brief-plan-playground", slug, "sheet.html");
  const pageLines = r.stdout.split("\n").filter((l) => l.startsWith("BriefPlanPlayground"));
  ok(
    pageLines.length === 1 && pageLines[0] === `BriefPlanPlayground: ${pathToFileURL(page).href}` && existsSync(page),
    `(a) adoption did not write the BriefPlanPlayground and print its one line: ${JSON.stringify(pageLines)}`,
  );
  // Over a Brief not at theses/<slug>/brief.yaml, adoption succeeds and the page's absence is a warning.
  const elsewhere = `brief-files-elsewhere-${process.pid}`;
  const otherAt = join(root, elsewhere, "brief.yaml");
  mkdirSync(join(root, elsewhere), { recursive: true });
  writeFileSync(otherAt, C.briefRecordText(minted));
  const other = adopt(otherAt);
  rmSync(join(repo, "runs", "brief", elsewhere), { recursive: true, force: true });
  ok(
    other.status === 0 &&
      existsSync(join(root, elsewhere, "structure.yaml")) &&
      !other.stdout.includes("BriefPlanPlayground") &&
      other.stderr.includes("BriefPlanPlayground not written: ") &&
      other.stderr.includes("is not a theses/<slug>/brief.yaml"),
    `(a) adoption over a Brief not at theses/<slug>/brief.yaml did not succeed with the warning: ${other.status} ${other.stderr}`,
  );
  const files = FILES.map((f) => (existsSync(join(dir, f)) ? parseYaml(readFileSync(join(dir, f), "utf8"), f) : null));
  ok(files.every(Boolean), "(a) adoption did not write brief.yaml, structure.yaml and reader-path.yaml");
  ok(
    files[0] && !("structure" in files[0]) && !("reader_path" in files[0]),
    "(a) the adopted brief.yaml carries `structure` or `reader_path`",
  );
  ok(
    files[1] && files[1].attains_thesis === "c_leg2" && files[1].relations.length === 2,
    `(a) structure.yaml is not the adopted structure: ${JSON.stringify(files[1])}`,
  );
  ok(
    files[2] &&
      Object.keys(files[2]).join() === "reader_path" &&
      files[2].reader_path.map((l) => l.leg_id).join() === "leg1,leg2" &&
      files[2].reader_path.every((l) => !("text" in l)),
    `(a) reader-path.yaml does not hold the two Legs with no \`text\`: ${JSON.stringify(files[2])}`,
  );
  ok(
    files.every(Boolean) && afterText === textsAt(at),
    "(a) the after snapshot does not hold the three files in order",
  );
  // (b) THE READER GIVES EACH LEG ITS RELATION'S `holds` (readHolds).
  const b = readAdoptedBrief(at);
  ok(
    !b.error &&
      b.legs.every((l, i) => l.text === readHolds(b.record.structure, legs[i].text) && l.text === legs[i].text),
    `(b) readAdoptedBrief did not give each Leg its relation's holds: ${b.error || JSON.stringify(b.legs)}`,
  );
}
{
  const at = briefAt();
  const b = readAdoptedBrief(at);
  ok(
    !b.error && b.legs.map((l) => l.text).join("|") === LEGS.map((l) => SAID[l.relation]).join("|"),
    `(b) readAdoptedBrief over three files did not read each Leg's sentence with its Roles named: ${b.error || JSON.stringify(b.legs)}`,
  );
  ok(!b.error && b.text === textsAt(at), "(b) the reader's text is not the three files' texts in order");
}

// (c) A HAND EDIT OF A `holds`: every Leg naming the relation prints the changed sentence.
{
  const at = briefAt({
    structure: (s) => ({
      ...s,
      relations: s.relations.map((r) => (r.id === "c_1" ? { ...r, holds: "Each {r_1} wakes one {r_2}." } : r)),
    }),
  });
  const r = cli("check", at);
  const lines = r.out.trim().split("\n");
  ok(r.status === 0, `(c) check refused a hand-edited holds: ${r.err}`);
  ok(
    lines[0] === "s1\tc_1\tEach rule wakes one guard." &&
      lines[2] === "s3\tc_1\tEach rule wakes one guard." &&
      lines[1] === "s2\tc_2\tThe guard stops each request.",
    `(c) check did not print the changed sentence on each Leg naming c_1: ${r.out}`,
  );
}

// (d) A LEG REMOVED AND TWO REORDERED, a Leg still naming the relation `attains_thesis` names.
{
  const at = briefAt({ readerPath: (p) => ({ reader_path: [p.reader_path[1], p.reader_path[0], p.reader_path[3]] }) });
  const r = cli("check", at);
  ok(
    r.status === 0 &&
      r.out
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("\t")[0])
        .join() === "s2,s1,s4",
    `(d) check did not pass a Reader Path with a Leg removed and two reordered: ${r.status} ${r.out}${r.err}`,
  );
}

// (e) EACH REFUSAL OF THE READER, by the `check` verb, naming the file and what its row names.
const rel = (fn) => (s) => ({ ...s, relations: s.relations.map(fn) });
const REFUSALS = [
  [
    "brief.yaml carries structure",
    { brief: (b) => ({ ...b, structure: STRUCTURE }) },
    ["brief.yaml", "`structure`", "brief-files.mjs split"],
  ],
  [
    "brief.yaml carries reader_path",
    { brief: (b) => ({ ...b, reader_path: [] }) },
    ["brief.yaml", "`reader_path`", "brief-files.mjs split"],
  ],
  ["structure.yaml missing", { structure: null }, ["no structure.yaml beside it"]],
  ["reader-path.yaml missing", { readerPath: null }, ["no reader-path.yaml beside it"]],
  [
    "two Roles share an id",
    { structure: (s) => ({ ...s, roles: [...s.roles, s.roles[0]] }) },
    ["structure.yaml", '"r_1"'],
  ],
  [
    "two Relations share an id",
    { structure: (s) => ({ ...s, relations: [...s.relations, s.relations[0]] }) },
    ["structure.yaml", '"c_1"'],
  ],
  [
    "two Legs share an id",
    { readerPath: (p) => ({ reader_path: [...p.reader_path, p.reader_path[0]] }) },
    ["reader-path.yaml", '"s1"'],
  ],
  [
    "a Role with no name",
    { structure: (s) => ({ ...s, roles: s.roles.map((r, i) => (i ? r : { ...r, name: "" })) }) },
    ["structure.yaml", '"r_1"', "`name`"],
  ],
  [
    "a Relation with no holds",
    { structure: rel((r) => (r.id === "c_2" ? { ...r, holds: "" } : r)) },
    ["structure.yaml", '"c_2"', "`holds`"],
  ],
  [
    "a Relation with between and relates",
    { structure: rel((r) => (r.id === "c_3" ? { ...r, between: ["r_1"] } : r)) },
    ["structure.yaml", '"c_3"', "both"],
  ],
  [
    "a Relation with neither",
    {
      structure: rel((r) =>
        r.id === "c_2" ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== "between")) : r,
      ),
    },
    ["structure.yaml", '"c_2"', "neither"],
  ],
  [
    "between names no Role",
    { structure: rel((r) => (r.id === "c_1" ? { ...r, between: ["r_1", "r_9"] } : r)) },
    ["structure.yaml", '"c_1"', '"r_9"'],
  ],
  [
    "relates names no Relation",
    { structure: rel((r) => (r.id === "c_3" ? { ...r, relates: ["c_1", "c_9"] } : r)) },
    ["structure.yaml", '"c_3"', '"c_9"'],
  ],
  [
    "relates names its own",
    { structure: rel((r) => (r.id === "c_3" ? { ...r, relates: ["c_1", "c_3"] } : r)) },
    ["structure.yaml", '"c_3"', "itself"],
  ],
  [
    "a brace naming no Role",
    { structure: rel((r) => (r.id === "c_2" ? { ...r, holds: "The {r_2} stops each {r_7}." } : r)) },
    ["structure.yaml", '"c_2"', "{r_7}"],
  ],
  [
    "a Relation between three Roles",
    { structure: rel((r) => (r.id === "c_1" ? { ...r, between: ["r_1", "r_2", "r_3"] } : r)) },
    ["structure.yaml", '"c_1"', "`between` does not name exactly two Roles"],
  ],
  [
    "a Relation between one Role",
    { structure: rel((r) => (r.id === "c_2" ? { ...r, between: ["r_2"] } : r)) },
    ["structure.yaml", '"c_2"', "`between` does not name exactly two Roles"],
  ],
  [
    "a Relation over three relations attains_thesis does not name",
    {
      structure: (s) => ({
        ...s,
        relations: [
          ...s.relations,
          { id: "c_4", name: "all", relates: ["c_1", "c_2", "c_3"], holds: "The {r_1} ends it.", from: ["L1"] },
        ],
      }),
    },
    ["structure.yaml", '"c_4"', "`relates` does not name exactly two relations"],
  ],
  [
    "attains_thesis names no Relation",
    { structure: (s) => ({ ...s, attains_thesis: "c_8" }) },
    ["structure.yaml", '"c_8"'],
  ],
  [
    "a Leg naming no Relation",
    { readerPath: (p) => ({ reader_path: p.reader_path.map((l, i) => (i ? l : { ...l, relation: "c_9" })) }) },
    ["reader-path.yaml", "leg s1", '"c_9"'],
  ],
  [
    "a Leg carrying none",
    {
      readerPath: (p) => ({
        reader_path: p.reader_path.map((l, i) => (i === 1 ? { leg_id: l.leg_id, claims: l.claims } : l)),
      }),
    },
    ["reader-path.yaml", "leg s2", "no `relation`"],
  ],
  [
    "a Leg carrying text",
    { readerPath: (p) => ({ reader_path: p.reader_path.map((l, i) => (i ? l : { ...l, text: "Its own." })) }) },
    ["reader-path.yaml", "leg s1", "`text`", "`holds` in", "structure.yaml"],
  ],
  [
    "no Leg naming attains_thesis",
    { readerPath: (p) => ({ reader_path: p.reader_path.slice(0, 3) }) },
    ["reader-path.yaml", '"c_3"', "attains_thesis"],
  ],
];
for (const [name, edit, want] of REFUSALS) {
  const r = cli("check", briefAt(edit));
  ok(
    r.status === 1 && r.out === "" && want.every((w) => r.err.includes(w)),
    `(e) ${name} was not refused by check naming ${JSON.stringify(want)}: ${r.status} ${r.err}${r.out}`,
  );
}

// (e) THE RELATION `attains_thesis` NAMES IS NOT COUNTED (kogaki#1969): over three relations, check reads it.
{
  const at = briefAt({
    structure: (s) => ({
      ...s,
      relations: [
        ...s.relations.map((r) => (r.id === "c_3" ? { ...r, relates: ["c_1", "c_2", "c_4"] } : r)),
        { id: "c_4", name: "names", between: ["r_1", "r_3"], holds: "The {r_1} names each {r_3}.", from: "L1" },
      ],
    }),
  });
  const r = cli("check", at);
  ok(
    r.status === 0 && r.err === "",
    `(e) check refused a relation named by attains_thesis over three relations: ${r.status} ${r.err}`,
  );
}

// (f) SPLIT: a Brief of one file into three that check passes, its record the one file's; refused where a Leg's
// `text` is not its relation's `holds`, writing nothing, and over a Brief already split.
{
  const dir = join(root, "theses", "one-file");
  mkdirSync(dir, { recursive: true });
  const at = join(dir, "brief.yaml");
  const said = { ...RECORD, reader_path: LEGS.map((l) => ({ ...C.legRecord({ ...l, text: SAID[l.relation] }) })) };
  const text = C.briefRecordText(said);
  writeFileSync(at, text);
  const one = C.briefAsOneList(C.parseBriefRecord(text, at).record).record;
  const r = cli("split", at);
  ok(
    r.status === 0 && FILES.every((f) => existsSync(join(dir, f))),
    `(f) split did not write the three files: ${r.err}`,
  );
  ok(cli("check", at).status === 0, `(f) check refused the split files: ${cli("check", at).err}`);
  const back = C.readBriefFiles(at);
  ok(
    !back.error && isDeepStrictEqual(back.record, one),
    "(f) the record read from the three files is not the one file's",
  );
  const again = cli("split", at);
  ok(
    again.status === 1 && again.err.includes("already split"),
    `(f) split over a split Brief was not refused: ${again.err}`,
  );
  const dDir = join(root, "theses", "one-file-differs");
  mkdirSync(dDir, { recursive: true });
  const dAt = join(dDir, "brief.yaml");
  writeFileSync(
    dAt,
    C.briefRecordText({
      ...said,
      reader_path: said.reader_path.map((l, i) => (i === 1 ? { ...l, text: "Another." } : l)),
    }),
  );
  const differs = cli("split", dAt);
  ok(
    differs.status === 1 &&
      differs.err.includes("leg s2") &&
      differs.err.includes("Nothing was written") &&
      readdirSync(dDir).join() === "brief.yaml",
    `(f) split over a Leg whose text is not its holds was not refused naming it, or wrote: ${differs.err}`,
  );
}

// (f) SPLIT OVER A BRIEF OF ONE FILE WHOSE RELATION NAMES THREE ROLES is refused, and writes nothing (kogaki#1969).
{
  const dir = join(root, "theses", "one-file-three-roles");
  mkdirSync(dir, { recursive: true });
  const at = join(dir, "brief.yaml");
  const structure = rel((r) => (r.id === "c_1" ? { ...r, between: ["r_1", "r_2", "r_3"] } : r))(STRUCTURE);
  const said = {
    ...RECORD,
    structure,
    reader_path: LEGS.map((l) => ({ ...C.legRecord({ ...l, text: SAID[l.relation] }) })),
  };
  writeFileSync(at, C.briefRecordText(said));
  const r = cli("split", at);
  ok(
    r.status === 1 &&
      r.err.includes('"c_1"') &&
      r.err.includes("does not name exactly two Roles") &&
      r.err.trim().endsWith("Nothing was written") &&
      !existsSync(join(dir, "structure.yaml")) &&
      !existsSync(join(dir, "reader-path.yaml")),
    `(f) split over a relation between three Roles was not refused, or wrote: ${r.status} ${r.err}`,
  );
}

// (g) A PARAGRAPHPLAN MADE BEFORE A HAND EDIT OF structure.yaml IS FOUND STALE BY THE VIEW, by the hash.
{
  const at = briefAt();
  const planPath = C.paragraphPlanPathFor(at);
  const before = C.readBriefFiles(at);
  const legs = before.record.reader_path.map((l) => ({ leg_id: l.leg_id }));
  writeFileSync(
    planPath,
    C.paragraphPlanRecordText(C.paragraphPlanRecord({ briefPath: at, briefText: before.text, legs })),
  );
  const fresh = paragraphPlanView(planPath);
  ok(!fresh.error, `(g) the view refused a plan made from the files as they stand: ${fresh.error}`);
  const sp = join(resolve(at, ".."), "structure.yaml");
  writeFileSync(sp, readFileSync(sp, "utf8").replace("The {r_2} stops each {r_3}.", "The {r_2} halts each {r_3}."));
  const stale = paragraphPlanView(planPath);
  ok(
    typeof stale.error === "string" &&
      stale.error.includes("made from a different Brief") &&
      stale.error.includes(before.sha256) &&
      stale.error.includes(C.readBriefFiles(at).sha256),
    `(g) the view did not find a plan made before the hand edit stale by the hash: ${stale.error}`,
  );
}

rmSync(root, { recursive: true, force: true });
if (fails.length) {
  for (const f of fails) console.log(`FAIL ${f}`);
  process.exit(1);
}
console.log(`brief-files: ${cases} case(s) pass`);
