#!/usr/bin/env node
// check-paragraph-plan-analogy — the ParagraphPlan chooses one Analogy Mapping from the Brief's
// structure before its first Leg, writes it at the top of `paragraph-plan.yaml`, and every Leg
// draws its examples from it (kogaki#1778, owner decision 2026-11-10; kogaki#1812).
//
// Cases (a)-(e) and (g) drive `node src/paragraph-plan.mjs start|await` over a structure Brief, a
// scratch Move library and a FAKE judge binary (`KOGAKI_JUDGE_CLI`), never the real `claude` CLI;
// (f) calls the validator, the plan reader and the projection directly. Each case is stated in this
// member's `contract` in checks/registry.json. Whether a live model's base domain is apt is the
// judgment's own, never linted here.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { legRecord, briefRecordText } = await imp("src/compose.mjs");
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE, paragraphPlanShapeRefusal } =
  await imp("src/paragraph-plan.mjs");
const { validateAnalogyMapping, analogyOf, legTable, NO_STRUCTURE_REASON, ANALOGY_INPUT_KEY } = await imp(
  "src/paragraph-plan-analogy.mjs",
);
const { parseYaml, stringifyYaml } = await imp("src/yaml.mjs");
const { JUDGE_INPUT_MARKER } = await imp("src/workflow/judge.mjs");

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-analogy-"));
const settings = JSON.parse(readFileSync(join(repo, "kogaki.settings.json"), "utf8"));
settings.paragraph_plan.mapper = false;
settings.brief.paragraphs_per_leg = 2;
const settingsFile = join(root, "settings.json");
writeFileSync(settingsFile, JSON.stringify(settings));
process.env.KOGAKI_SETTINGS = settingsFile;
// (g) runs with the Mapper on (kogaki#1812).
const mapperSettings = join(root, "settings-mapper.json");
writeFileSync(
  mapperSettings,
  JSON.stringify({ ...settings, paragraph_plan: { ...settings.paragraph_plan, mapper: true } }),
);
const ANALOGUE = JSON.parse(readFileSync("src/paragraph-plan-axes.json", "utf8")).axes.find((a) => a.id === "ANALOGUE");

// ---- the Move library: pa leaves a carry, pb takes one, p1 carries none ----
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
const writeMove = (rec) =>
  writeFileSync(
    join(moves, `${rec.id}.yaml`),
    stringifyYaml({
      id: rec.id,
      description: "a fixture Move.",
      takes: [],
      leaves: [],
      breaks: ["breaks if the point is dropped."],
      segments: [{ operation: "states the point once, plainly." }],
      ...rec,
    }),
  );
writeMove({
  id: "pa",
  leaves: [{ kind: "carry", what: "a familiar base whose structure awaits the subject", segment: 1 }],
});
writeMove({ id: "pb", takes: [{ kind: "carry", what: "a base's structure, to be carried onto the subject" }] });
writeMove({ id: "p1" });

// ---- the Brief: three Legs over a structure of three Roles, two relations and the apex ----
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
    {
      id: "h_1",
      name: "ownership",
      relates: ["c_1", "c_2"],
      holds: "The {r_2} is the {r_1}'s, not the consumer's.",
      from: ["L1", "L2"],
    },
  ],
  attains_thesis: "h_1",
  reach: ["c_1", "c_2", "h_1"],
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
    relation: "c_2",
    text: "The copy overwrites any edit.",
    claims: [{ strand: "L2", proposition: "a second run refreshes the copy." }],
  },
  {
    leg_id: "s3",
    relation: "h_1",
    text: "The copy is the installer's, not the consumer's.",
    claims: [{ strand: "L1", proposition: "the installer copies the kit." }],
    reaches_target: true,
  },
];
const briefText = (structure) =>
  briefRecordText({
    slug: "plan-brief",
    compose_path: "audiences/dev-to-zenn.md",
    strands: [
      { id: "L1", slug: "a", cite: `coding::lesson/a@${"0".repeat(64)}` },
      { id: "L2", slug: "b", cite: `coding::lesson/b@${"0".repeat(64)}` },
    ],
    thesis: "The copy is the installer's.",
    ...(structure ? { structure } : {}),
    reader_path: LEGS.map((l) => legRecord(structure ? l : { ...l, relation: undefined })),
    strand_coverage: [],
    journey_coverage: [],
    tradeoffs: {},
    bridged: {},
  });
const MAPPING = {
  version: "1",
  base_domain: { name: "a lending library", description: "A library lends its books and takes them back." },
  roles: [
    { role: "r_1", counterpart: "the librarian" },
    { role: "r_2", counterpart: "the lent book" },
    { role: "r_3", counterpart: "a reader's margin note" },
  ],
  relations: [
    { relation: "c_1", counterpart: "the librarian lends the book" },
    { relation: "c_2", counterpart: "the returned book is wiped of notes" },
    { relation: "h_1", counterpart: "the book is the library's, not the reader's" },
  ],
};

// ---- the fake judge ----
const judge = join(root, "fake-judge.mjs");
writeFileSync(
  judge,
  `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const mode = readFileSync(dir + "/mode", "utf8").trim();
  const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  const MARKER = ${JSON.stringify(JUDGE_INPUT_MARKER)};
  const input = JSON.parse(prompt.slice(prompt.lastIndexOf(MARKER) + MARKER.length));
  const mapping = ${JSON.stringify(MAPPING)};
  if (input.structure && input.structure.apex) {
    out(mode === "noapex" ? { ...mapping, relations: mapping.relations.filter((r) => r.relation !== "h_1") } : mapping);
  }
  // THE MAPPER'S READING (kogaki#1734): one structure; no grounding call is made (kogaki#1812).
  if (input.proposition) {
    out({ strand: input.strand, roles: [{ id: "lender", context: "One who hands a thing out for a while.", attributes: [] },
      { id: "thing", context: "What is handed out and comes back.", attributes: [] }],
      relations: [{ id: "q1", between: ["lender", "thing"], holds: "{lender} hands out {thing}." },
        { id: "q2", between: ["lender", "thing"], holds: "{lender} takes back {thing}." }],
      higher_order: { relates: ["q1", "q2"], holds: "{thing} stays the {lender}'s." } });
  }
  // A table's expressions, once the Leg carries one; the first Waypoints call of Leg s1 also names a Role id.
  const expressions = (t) => (t ? t.correspondences.map((c) => c.expression).join(", ") : "");
  const once = (name) => { const f = dir + "/" + name; const n = existsSync(f) ? Number(readFileSync(f, "utf8")) : 0; writeFileSync(f, String(n + 1)); return n === 0; };
  const MOVES = { s1: "pa", s2: "pb", s3: "p1" };
  const paragraph = (legId, point) => ({ paragraph: 1, materials: [legId === "s2" ? "L2" : "L1"], purpose: "brings the reader to the point.",
    depends_on: [], rationale: "its Segment carries the Leg's relation.", introduces: [], "re-activate": [],
    paragraph_waypoints: [{ point, serves: [legId === "s2" ? "L2" : "L1"], cast: {} }] });
  if (input.leg_you_must_judge) {
    const leg = input.leg_you_must_judge;
    const a = leg.bound_move && leg.bound_move.analogy_you_must_draw_from;
    const stray = (p) => a && p.paragraph_waypoints.some((w) => String(w.point).includes("fishing net"));
    out({ version: "1", leg_id: leg.leg_id, verdicts: leg.paragraphs.map((p) => ({ paragraph: p.paragraph,
      verdict: stray(p) ? "does-not-fit" : "fits",
      why: stray(p) ? "ANALOGUE-SENTENCE the paragraph names a fishing net, not the base domain." : "the Waypoints carry the Leg's relation." })) });
  }
  if (input.paragraph_you_must_plan) {
    const legId = input.paragraph_you_must_plan.leg_id;
    const t = input.paragraph_you_must_plan.table;
    out(paragraph(legId, "SITE-" + legId + " the lending library takes the book back, and the margin note goes." + (t ? " " + expressions(t) + "." : "")));
  }
  const legId = input.leg_you_must_plan.leg_id;
  const t = input.leg_you_must_plan.table;
  const point = mode === "stray" && legId === "s2" ? "PLAN-s2 a fishing net lets the edit slip away."
    : t ? "PLAN-" + legId + " " + expressions(t) + (legId === "s1" && once("roleid") ? ", as r_1 does." : ".")
    : "PLAN-" + legId + " the lending library shows the point.";
  out({ version: "1", leg_id: legId, move: MOVES[legId], rationale: "the bound Move's Segment carries the Leg's relation.", paragraphs: [paragraph(legId, point)] });
});
`,
);
chmodSync(judge, 0o755);

const inputOf = (p) => JSON.parse(p.slice(p.lastIndexOf(JUDGE_INPUT_MARKER) + JUDGE_INPUT_MARKER.length));
const isAnalogyCall = (p) => {
  const i = inputOf(p);
  return Boolean(i.structure && i.structure.apex);
};
const keyOf = (p) => ["leg_you_must_plan", "leg_you_must_judge", "paragraph_you_must_plan"].find((k) => inputOf(p)[k]);

function runStage(name, mode, structure = STRUCTURE, stageSettings = settingsFile) {
  const dir = join(root, name);
  const briefDir = join(dir, "theses", "plan-brief");
  const runDir = join(dir, "run");
  mkdirSync(briefDir, { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(dir, "mode"), mode);
  const briefPath = join(briefDir, "brief.yaml");
  writeFileSync(briefPath, briefText(structure));
  const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, PP_FIXTURE_DIR: dir, KOGAKI_SETTINGS: stageSettings };
  const cli = (args) =>
    spawnSync(
      process.execPath,
      [
        join(repo, "src", "paragraph-plan.mjs"),
        ...args,
        "--brief",
        briefPath,
        "--run-dir",
        runDir,
        "--moves-dir",
        moves,
      ],
      { cwd: repo, encoding: "utf8", env, timeout: 180000 },
    );
  const started = cli(["start"]);
  let awaited = null;
  if (started.status === 0) {
    for (let i = 0; i < 6; i++) {
      awaited = cli(["await", "--wait-s", "25"]);
      if (!(awaited.stdout || "").includes(PARAGRAPH_PLAN_STILL_RUNNING_LINE)) break;
    }
  }
  const prompts = existsSync(join(dir, "prompts.jsonl"))
    ? readFileSync(join(dir, "prompts.jsonl"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
  const planPath = join(briefDir, PARAGRAPH_PLAN_FILE);
  const plan = existsSync(planPath) ? parseYaml(readFileSync(planPath, "utf8"), planPath) : null;
  return {
    runDir,
    started,
    awaited,
    prompts,
    plan,
    said: `${started.stdout}${started.stderr}${awaited ? awaited.stdout + awaited.stderr : ""}`,
  };
}
const finished = (tag, r) => {
  if (r.started.status !== 0) fails.push(`${tag} start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0)
    fails.push(`${tag} await did not finish the job: ${r.said.slice(0, 600)}`);
};

// (a) and (b): the opening step, its record, and what each Leg is handed.
{
  const r = runStage("ok", "ok");
  finished("(a)", r);
  const opening = r.prompts.filter(isAnalogyCall);
  if (opening.length !== 1 || !isAnalogyCall(r.prompts[0] || ""))
    fails.push(`(a) ${opening.length} analogy_mapping call(s), not one before every Leg's`);
  else {
    const s = inputOf(opening[0]).structure;
    if (
      JSON.stringify(s.roles.map((x) => x.id)) !== '["r_1","r_2","r_3"]' ||
      JSON.stringify(s.relations.map((x) => x.id)) !== '["c_1","c_2"]' ||
      JSON.stringify(s.higher_order.map((x) => x.id)) !== '["h_1"]' ||
      s.apex !== "h_1"
    ) {
      fails.push(
        `(a) the analogy_mapping call is not handed the Roles, the reached relations and the apex: ${JSON.stringify(s).slice(0, 300)}`,
      );
    }
  }
  if (!r.plan) fails.push("(a) no ParagraphPlan file was written");
  else {
    const keys = Object.keys(r.plan);
    if (keys.indexOf("analogy") !== keys.indexOf("brief") + 1 || keys.indexOf("analogy") > keys.indexOf("legs"))
      fails.push(`(a) the plan's keys are ${keys.join(", ")}: analogy is not after brief and before the Legs`);
    const a = r.plan.analogy || {};
    if (
      !a.base_domain ||
      a.base_domain.name !== "a lending library" ||
      (a.roles || []).length !== 3 ||
      (a.relations || []).length !== 3
    ) {
      fails.push(
        `(a) the plan's analogy is not the mapping, one counterpart per Role and reached relation: ${JSON.stringify(a).slice(0, 300)}`,
      );
    }
  }
  const judged = Object.fromEntries(
    r.prompts.filter((p) => keyOf(p) === "leg_you_must_judge").map((p) => [inputOf(p).leg_you_must_judge.leg_id, p]),
  );
  const drawn = (id) => judged[id] && inputOf(judged[id]).leg_you_must_judge.bound_move[ANALOGY_INPUT_KEY];
  for (const id of ["s1", "s2", "s3"]) {
    if (!drawn(id) || drawn(id).base_domain.name !== "a lending library")
      fails.push(`(b) Leg ${id}'s judge is not handed the base domain under ${ANALOGY_INPUT_KEY}`);
  }
  if (!ANALOGUE || !judged.s3 || !judged.s3.includes(`\n- ANALOGUE: ${ANALOGUE.sentence}`))
    fails.push("(b) the judge row does not carry the ANALOGUE axis on every Leg");
  if (r.prompts.filter((p) => keyOf(p) === "leg_you_must_plan").some((p) => p.includes(`"${ANALOGY_INPUT_KEY}"`)))
    fails.push("(b) a plan call is handed the mapping before its Move is bound");
}

// (c) a paragraph naming another analogue is refused by the judge and repaired at its site with the mapping.
{
  const r = runStage("stray", "stray");
  finished("(c)", r);
  const site = r.prompts.filter((p) => keyOf(p) === "paragraph_you_must_plan");
  if (site.length !== 1 || !inputOf(site[0]).bound_move[ANALOGY_INPUT_KEY])
    fails.push(`(c) ${site.length} site call(s), not one handed the mapping after the judge's refusal`);
  else if (!JSON.stringify(inputOf(site[0]).refused_here).includes("ANALOGUE-SENTENCE"))
    fails.push("(c) the site call is not handed the judge's refusal");
  const text = JSON.stringify(r.plan || {});
  if (!r.plan || text.includes("fishing net") || !text.includes("SITE-s2"))
    fails.push(`(c) the plan written still names another analogue or lacks the repair: ${text.slice(0, 300)}`);
}

// (d) a mapping without the apex is refused on every round, and nothing is planned or written.
{
  const r = runStage("noapex", "noapex");
  if (r.started.status !== 0) fails.push(`(d) start failed: ${r.said.slice(0, 300)}`);
  if (!r.awaited || r.awaited.status === 0) fails.push("(d) await did not stop the stage");
  if (!r.said.includes("leaves the apex h_1 without a counterpart") || !r.said.includes("before any Leg was planned"))
    fails.push(`(d) the stop does not name the apex: ${r.said.slice(0, 500)}`);
  if (r.prompts.some((p) => keyOf(p))) fails.push("(d) a Leg was planned after the Analogy Mapping was refused");
  if (r.prompts.filter(isAnalogyCall).length !== settings.brief.unit_rounds)
    fails.push(`(d) ${r.prompts.filter(isAnalogyCall).length} analogy call(s), not one per round`);
  if (r.plan) fails.push("(d) a plan file was written");
}

// (e) a Brief carrying no structure records none and makes no call.
{
  const r = runStage("nostructure", "ok", null);
  finished("(e)", r);
  if (r.prompts.some(isAnalogyCall)) fails.push("(e) an analogy_mapping call ran for a Brief with no structure");
  if (!r.plan || JSON.stringify(r.plan.analogy) !== JSON.stringify({ none: NO_STRUCTURE_REASON }))
    fails.push(`(e) the plan's analogy is not none with its reason: ${JSON.stringify(r.plan && r.plan.analogy)}`);
}

// (f) the validator, the plan reader and the projection.
{
  const v = (rec) => validateAnalogyMapping(rec, { structure: STRUCTURE }).error || null;
  if (v(MAPPING)) fails.push(`(f) the whole mapping is refused: ${v(MAPPING)}`);
  const cut = (k, id) => ({ ...MAPPING, [k]: MAPPING[k].filter((x) => x[k === "roles" ? "role" : "relation"] !== id) });
  const want = [
    [cut("roles", "r_2"), "the Role r_2 without a counterpart"],
    [cut("relations", "c_2"), "the reached relation c_2 without a counterpart"],
    [cut("relations", "h_1"), "the apex h_1 without a counterpart"],
    [{ ...MAPPING, roles: [...MAPPING.roles, { role: "r_9", counterpart: "x" }] }, "r_9"],
    [{ version: "1", none: "" }, "no reason"],
    [{ ...MAPPING, none: "no domain fits." }, "`none` carries its reason and nothing else"],
  ];
  for (const [rec, says] of want)
    if (!String(v(rec)).includes(says)) fails.push(`(f) refusal ${JSON.stringify(says)} not given: ${v(rec)}`);
  if (v({ version: "1", none: "no domain the reader holds carries the system." }))
    fails.push("(f) a reasoned none is refused");
  if (analogyOf({ none: "x." }) || analogyOf(MAPPING) !== MAPPING)
    fails.push("(f) a mapping recorded none is handed to a Leg, or a mapping is not");
  const plan = { version: "1", brief: { path: "b", sha256: "s" }, analogy: { base_domain: { name: "x" } }, legs: [] };
  if (!String(paragraphPlanShapeRefusal(plan, "p", [])).includes("analogy.base_domain"))
    fails.push("(f) the plan reader does not refuse a malformed analogy");
  const t = legTable("pa", [{ id: "r_3" }, { id: "r_1" }, { id: "r_9" }], MAPPING);
  if (
    JSON.stringify(t) !==
    JSON.stringify({
      move: "pa",
      base: { domain: "a lending library" },
      correspondences: [
        { role: "r_3", expression: "a reader's margin note" },
        { role: "r_1", expression: "the librarian" },
      ],
    })
  ) {
    fails.push(
      `(f) legTable is not the mapping's counterparts for the Leg's Roles under its Move: ${JSON.stringify(t)}`,
    );
  }
  if (legTable("pa", [{ id: "r_1" }], { none: "x." }) || legTable("pa", [{ id: "r_9" }], MAPPING))
    fails.push("(f) legTable writes a table from a none mapping or from no Role it names");
}

// (g) THE MAPPER ON (kogaki#1812): no grounding call; each Leg's table is the mapping's projection onto its Roles.
{
  const r = runStage("mapper", "mapper", STRUCTURE, mapperSettings);
  finished("(g)", r);
  const planning = (p) => Boolean(keyOf(p));
  const groundings = r.prompts.filter((p) => !planning(p) && !isAnalogyCall(p) && !inputOf(p).proposition);
  if (groundings.length)
    fails.push(`(g) ${groundings.length} call(s) beside the reading, the plan, the judge and the site calls`);
  for (const id of ["leg-1", "leg-2", "leg-3"]) {
    if (existsSync(join(r.runDir, "calls", id, "grounding"))) fails.push(`(g) the run wrote calls/${id}/grounding/`);
  }
  const want = {
    s1: [
      ["r_1", "the librarian"],
      ["r_2", "the lent book"],
    ],
    s2: [
      ["r_2", "the lent book"],
      ["r_3", "a reader's margin note"],
    ],
    s3: [
      ["r_1", "the librarian"],
      ["r_2", "the lent book"],
      ["r_3", "a reader's margin note"],
    ],
  };
  const tables = {};
  for (const p of r.prompts.filter((x) => keyOf(x) === "leg_you_must_plan")) {
    const l = inputOf(p).leg_you_must_plan;
    if (l.table && !tables[l.leg_id]) tables[l.leg_id] = l.table;
  }
  for (const [id, pairs] of Object.entries(want)) {
    const t = tables[id];
    const got = t ? t.correspondences.map((c) => [c.role, c.expression]).sort() : null;
    if (!t || t.base.domain !== "a lending library" || JSON.stringify(got) !== JSON.stringify(pairs.slice().sort())) {
      fails.push(
        `(g) Leg ${id}'s Waypoints call does not carry the mapping's counterparts for its Roles: ${JSON.stringify(t)}`,
      );
    }
  }
  const job = existsSync(join(r.runDir, "reader-path-job.json"))
    ? JSON.parse(readFileSync(join(r.runDir, "reader-path-job.json"), "utf8"))
    : { units: [] };
  const refusals = ((job.units.find((u) => u.id === "leg-1") || {}).refusals || []).join("\n");
  if (!/Leg s1, paragraph 1: .*Role id "r_1".*"the librarian"/.test(refusals)) {
    fails.push(
      `(g) a Waypoint carrying a Role id was not refused naming the paragraph, the Role and its counterpart: ${refusals || "no refusal"}`,
    );
  }
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(
  "ok: check-paragraph-plan-analogy — one analogy_mapping call over the Brief's structure runs before the first Leg and is written at the top of paragraph-plan.yaml, one counterpart per Role and per reached relation, or none with its reason (kogaki#1778); every Leg is judged with the same base domain under the ANALOGUE axis, a paragraph naming another analogue is refused and repaired at its site with the mapping, a mapping leaving the apex without a counterpart stops the stage before any Leg, and with the Mapper on each Leg's table is the mapping's projection onto its Roles with no grounding call (kogaki#1812).",
);
