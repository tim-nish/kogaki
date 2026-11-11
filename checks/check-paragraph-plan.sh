#!/usr/bin/env bash
# check-paragraph-plan — the ParagraphPlan stage plans every Brief Leg down to paragraphs after
# the Brief: the Leg is its unit, binding one Move and writing at most `brief.paragraphs_per_leg`
# paragraphs of Waypoints, and no Move information leaves it but the Move's id
# (kogaki#1375, owner decision 2026-10-14; kogaki#1777, owner decision 2026-11-10).
#
# WHAT THIS COVERS, each driven end to end through `node src/paragraph-plan.mjs
# start|await` over a real Brief record, a scratch Move library and a FAKE judge
# binary this member writes (`KOGAKI_JUDGE_CLI`) — never the actual `claude` CLI:
#   (a) a job whose every Leg binds a Move and is judged `fits` writes
#       `paragraph-plan.yaml` beside the Brief, naming the Brief by path and
#       content hash, each Leg carrying its one bound Move's id and its paragraphs,
#       each paragraph its schema, its join and its Waypoints and NOTHING ELSE OF
#       A MOVE; the Brief is byte-for-byte unchanged and the run directory holds no
#       bindings record. The plan call is handed the Leg's `text` and Claims, what
#       the Legs before it state (`the_reader_has_been_told`, derived from the Leg
#       order alone), the Persona's prior knowledge, the paragraph bound and the
#       Moves' `segments` and `breaks`, and no reader state; a `does-not-fit` on a
#       first Round is put verbatim into the site prompt of the paragraph it names,
#       beside the refused paragraph, under the Leg's held Move (kogaki#1642); the
#       judge is handed the bound Move's `takes`, `leaves`, `segments` and `breaks`
#       beside what the Legs before it state; neither call a `technique` (kogaki#1412).
#   (b) a Leg no Move fits (`move: null`) refuses the unit `no_paragraph_move_fits`
#       and is asked again whole until `brief.unit_rounds` is spent, every refusal
#       carried oldest first; the stage then stops naming the Leg, writes no file and
#       leaves the Brief unchanged.
#   (c) and (f) a library holding a Move with no `segments` stops the stage naming
#       the Move and `segments`, whether or not it carries the retired `technique`.
#   (d) `start` refuses a Brief whose Leg carries `waypoints`, or no `text`, by name.
#   (e) every Harness path and subcommand `.claude/skills/paragraph-plan/SKILL.md`
#       names exists.
#   (g) a bound Move carrying three `segments` yields three Waypoints under each
#       paragraph, rendered as three indented lines under the paragraph's line.
#   (h) the plan prompt carries every Segment's number, `operation`, `relation` and
#       `manner` as separate fields and states an `operation` is performed on the
#       Leg's `text`; a Waypoint restating a Segment's `operation` is refused by the
#       judge and the refusal reaches the site retry.
#   (j) the Move record is read as YAML, its `before` one line per dimension; a
#       `.md` Move or a joined-line state is refused by name (kogaki#1413).
#   (k) `p1` is admitted by `tools/move_ingest.py`'s write gate (kogaki#1418).
#   (l) THE JOIN IS A TYPED RELATION (kogaki#1411, kogaki#1477): both rows name the
#       closed set with one definition per word; a plan whose join is a sentence is
#       refused naming the paragraph and repaired at that paragraph.
#   (m) the plan reader and the plan call's validator refuse a missing, empty or
#       misplaced join, a sentence and a word outside the set, by name; the Brief's
#       Waypoint rule refuses `join`.
#   (n) `waypointLines` renders one numbered line per paragraph, the Opens-from line
#       beneath it and its Waypoints after; the template carries the instruction.
#   (o) and (q) the plan row's ORDER, DIVIDE, EXPLAIN, CONSISTENT and NO NEW FACT
#       read against the Leg's `text` (kogaki#1446, kogaki#1632, kogaki#1777).
#   (p) a Segment acting on the reading carries a `performs` Waypoint, which the
#       file and the judge carry (kogaki#1448); a purpose clause is refused and the
#       bare operation fits (kogaki#1485); a paragraph with no `point` is refused.
#   (r) a Leg introduces no term (kogaki#1768): the ledger is empty; BIND binds by
#       `takes` against what the reader has been told (kogaki#1701, kogaki#1777).
#   (s) both rows are named one-sentence criteria under the workflow file's bound,
#       the judge's from the axis registry (kogaki#1511, kogaki#1533).
#   (t) a Segment's `manner` reaches the plan call and nothing written from it (kogaki#1585).
#   (u) what a Leg's Move takes up is met by what the Legs before it state, derived
#       from the Leg order (`toldBefore`), and by the Persona's prior knowledge;
#       its Roles come from the Brief's structure (`legRoles`); the retired reader
#       state and ledger keys are refused by name at every read (kogaki#1701).
#   (w) a Waypoint performs its own Segment's operation alone (kogaki#1605).
#   (x) every design refusal, by name, at every read (kogaki#1639, kogaki#1777):
#       a paragraph naming a Move, a Leg with no Move or one outside the library, a
#       Leg over `brief.paragraphs_per_leg`, a Leg carrying `waypoints`, and every
#       schema field out of its paragraph's place.
#   (y) the cast is a closed map (kogaki#1695).
#   (z) THE MAPPER (kogaki#1734, kogaki#1777): with `paragraph_plan.mapper` true, a
#       Leg reads one structure on its relation, binds, grounds one table for its
#       one Move and writes its Waypoints in that table's expressions; a Waypoint
#       carrying a Role id is refused naming the paragraph, the Role and its
#       expression; the plan names one structure and one table; the job report lists
#       the reading and grounding Call Records, and `replay` re-runs one.
#
# NOT COVERED, stated rather than implied: the retry inside a Leg is
# checks/check-paragraph-plan-site-retry.sh's; the `--tools ""` environment and the
# call-limit stop are checks/check-brief-reader-path-job.sh's; /draft's read of the
# file end to end is checks/check-proof-sheet-leg-brief.sh's. Whether the Waypoints
# a live model writes are any good is the judge call's judgment, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// A HANDED-IN HEARTBEAT (kogaki#1424): every fixture job runs at 100 ms, the table untouched.
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { legRecord, briefRecordText, waypointsRefusal } = await imp("src/compose.mjs");
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE, NO_PARAGRAPH_MOVE_FITS, paragraphPlanShapeRefusal: rawPlanShapeRefusal,
  validateParagraphPlanUnit: rawValidateUnit, planLeg, introducedTerms, criteriaOf, criteriaFailures, readAxes,
  segmentsForPlanCall, toldBefore, legRoles, planLegOptions } = await imp("src/paragraph-plan.mjs");
const { parseYaml, stringifyYaml } = await imp("src/yaml.mjs");
const { JOIN_TYPES, CAST_KEYS, PLAN_SCHEMA_KEYS, legIntroducedTerms } = await imp("src/compose/record.mjs");
const { waypointLines } = await imp("src/draft.mjs");
const { JUDGE_INPUT_MARKER } = await imp("src/workflow/judge.mjs");
const BOUND = 2;

// EVERY PARAGRAPH CARRIES ITS SCHEMA (kogaki#1639): the fixtures below that read a hand-built
// record or planner answer are about joins, manners, casts and the like, so each paragraph they
// build is filled with a well-formed schema before the read -- `materials` the Strands its
// Waypoints serve, a purpose, `depends_on` the paragraph before, a rationale, no term and no
// re-activation -- and each Leg binds p1 unless given. The schema's own refusals are read raw,
// in case (x), against the unfilled readers.
const fillParagraph = (e, j, leg) => {
  if (!e || typeof e !== "object" || Array.isArray(e)) return e;
  const n = j + 1;
  const served = [...new Set((e.paragraph_waypoints || []).flatMap((p) => (p && Array.isArray(p.serves) ? p.serves : [])))];
  const terms = legIntroducedTerms(leg);
  const meaningOf = (term) => { const t = (leg.introduces || []).find((x) => x && typeof x === "object" && x.term === term); return (t && t.meaning) || `the meaning of ${term}.`; };
  const defaults = {
    materials: served.length ? served : ["L1"], purpose: `brings the reader to the point of paragraph ${n}.`,
    depends_on: n > 1 ? [n - 1] : [], rationale: "its Segments carry the Leg's relation this far.",
    introduces: n === 1 ? terms.map((term) => ({ term, meaning: meaningOf(term) })) : [], "re-activate": [],
  };
  const out = { paragraph: n, ...e };
  for (const k of PLAN_SCHEMA_KEYS) if (k !== "journeys" && !Object.hasOwn(out, k)) out[k] = defaults[k];
  return out;
};
const fillLeg = (l, leg) => (l && leg && Array.isArray(l.paragraphs)
  ? { move: "p1", ...l, paragraphs: l.paragraphs.map((e, j) => fillParagraph(e, j, leg)) } : l);
const paragraphPlanShapeRefusal = (record, rel, ls, opts = {}) => rawPlanShapeRefusal(record && Array.isArray(record.legs)
  ? { ...record, legs: record.legs.map((l, i) => fillLeg(l, ls[i])) } : record, rel, ls, { bound: BOUND, ...opts });
const validateParagraphPlanUnit = (unit, inputs, unitId) => {
  const leg = (inputs.legs || []).find((l) => l.leg_id === (unit || {}).leg_id);
  return rawValidateUnit(unit && leg ? { rationale: "the Move carries the Leg's relation.", ...fillLeg(unit, leg) } : unit, inputs, unitId);
};

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-"));
// THE MAPPER IS A SETTING (kogaki#1734): every case runs without it but (z), which runs with it.
const settingsWith = (mapper) => {
  const doc = JSON.parse(readFileSync(join(repo, "kogaki.settings.json"), "utf8"));
  doc.paragraph_plan.mapper = mapper;
  doc.brief.paragraphs_per_leg = BOUND;
  const file = join(root, `settings-mapper-${mapper}.json`);
  writeFileSync(file, JSON.stringify(doc));
  return file;
};
let stageSettings = settingsWith(false);
process.env.KOGAKI_SETTINGS = stageSettings;
// One named criterion's sentence in a rendered prompt, read by the stage's own parser (kogaki#1511).
const critOf = (p, name) => (criteriaOf(p).find((c) => c.name === name) || { text: "" }).text;

// ---- the Move library ----
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
const PSEG_OPERATION = "states the point once, plainly.";
// Every Move carries the `description` the Adapter requires (kogaki#1412, kogaki#1418).
const writeMove = (dir, rec) => writeFileSync(join(dir, `${rec.id}.yaml`),
  stringifyYaml({ id: rec.id, description: "a fixture Move.", takes: [], leaves: [], ...rec }));
// THE INGEST ADMITS p1 (kogaki#1418): the Move every case below binds is written by
// `tools/move_ingest.py`'s own write gate, `save_accepted`, through the Adapter's validator.
const INGEST_SAVE = [
  "import json, sys",
  "sys.path.insert(0, 'tools')",
  "import move_ingest as m",
  "m.save_accepted(sys.argv[1], [m.Proposal(1, mapping=json.load(sys.stdin))])",
].join("\n");
const ingestMove = (dir, rec) => {
  const r = spawnSync("python3", ["-c", INGEST_SAVE, dir],
    { input: JSON.stringify({ description: "a fixture Move.", takes: [], leaves: [], ...rec }), encoding: "utf8" });
  if (r.status !== 0) fails.push(`(k) the ingest refused fixture Move ${rec.id}: ${(r.stderr || "").trim()}`);
  return r.status === 0;
};
const STATE = { before: { knowledge: "before." }, after: { knowledge: "after." } };
// p1's state holds two dimensions, so (j) can see them rendered one line each.
const P1_BEFORE = { knowledge: "before.", question: "holds: none." };
const P1_ADMITTED = ingestMove(moves, { id: "p1", before: P1_BEFORE, after: { knowledge: "after." }, breaks: ["breaks if the point is dropped."],
  segments: [{ operation: PSEG_OPERATION }] });
if (P1_ADMITTED && !existsSync(join(moves, "INDEX.md"))) fails.push("(k) the ingest admitted p1 and wrote no INDEX.md beside it");
const PSEG3 = [{ operation: "sets up the point." }, { operation: "makes the point.", relation: "answers what the setup opened." },
  { operation: "leaves the point.", relation: "draws the consequence of the point." }];
// (p)'s Move: the 2026-10-16 run's paragraph 2, its Segments as the Extractor wrote them there.
const P5_SEG1 = "concedes that the distinction just given is hard to hold and promises to simplify it through a pair of contrasting concrete cases.";
writeMove(moves, { id: "p5", ...STATE,
  breaks: ["drop the concession — the cases arrive unmotivated."],
  segments: [{ operation: P5_SEG1 }, { operation: "gives the first case.", relation: "carries out the promised simplification." }] });
// (w)'s Move: Segment 2 compresses the definition Segment 1 gives.
writeMove(moves, { id: "p7", ...STATE,
  breaks: ["state the compression with the definition — the second step has nothing left to do."],
  segments: [{ operation: "defines the measure by what it grades." },
    { operation: "compresses the definition into one plainer quantity.", relation: "restates the step before in fewer words." }] });
writeMove(moves, { id: "p4", ...STATE, breaks: ["breaks if a segment is dropped."], segments: PSEG3 });

// ---- isolated Move libraries for (c) and (f): each holds one Move with no `segments` beside the whole p1 ----
const isolatedLibrary = (name, rec) => {
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(join(dir, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(dir, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION }] });
  writeMove(dir, rec);
  return dir;
};
const movesNoOrder = isolatedLibrary("moves-c", { id: "p3", ...STATE, breaks: ["breaks if the point is dropped."] });
const movesTechnique = isolatedLibrary("moves-f", { id: "p2", technique: "names a case and leaves it.", ...STATE,
  breaks: ["breaks if the case is never named."] });

// ---- the Brief: two Legs, each its relation's text and no Brief Waypoint (kogaki#1775) ----
// `paras` is the fake planner's own plan for the Leg -- one point per paragraph -- and never reaches the Brief.
const C1 = "the installer copies the kit into the consumer's tree.";
const C2 = "a second run refreshes the copy and its stamp.";
const S1_TEXT = "The installer writes into the consumer's tree, and its next run overwrites any edit made to the copy.";
const S2_TEXT = "The copy is the installer's, not the consumer's.";
const lessonCite = (slug) => `coding::lesson/${slug}@${"0".repeat(64)}`;
const leg = (id, text, claims, paras) => ({ leg_id: id, text, claims, paras });
const legs = [
  leg("s1", S1_TEXT, [{ strand: "L1", proposition: C1 }, { strand: "L2", proposition: C2 }], [
    { point: "The installer writes into a tree the consumer thought was theirs alone.", serves: ["L1"] },
    { point: "The next run overwrites any edit made to the copy.", serves: ["L1", "L2"] }]),
  leg("s2", S2_TEXT, [{ strand: "L2", proposition: C2 }], [{ point: S2_TEXT, serves: ["L2"] }]),
];
// (r)'s Legs: s1 is handed three terms, which `legRecord` does not write (a Leg introduces no term, kogaki#1768).
const TERM = { term: "kit stamp", meaning: "the hash the installer writes beside the copy" };
const DEFINED = [{ term: TERM.term, class: "defined" }];
const REFERENTS = [{ term: "installer", meaning: "the program that copies the kit" }, { term: "next run", meaning: "the installer's following run" }];
const termLegs = [{ ...legs[0], introduces: [TERM, ...REFERENTS], paras: [
  { point: "The installer writes the kit stamp into a tree the consumer thought was theirs alone.", serves: ["L1"] },
  legs[0].paras[1]] }, legs[1]];
const briefText = (ls, defined = []) => briefRecordText({
  slug: "plan-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") },
    { id: "L2", slug: "second-strand", cite: lessonCite("second-strand") }],
  thesis: "The fixture claim.",
  // No Reader start, Reader target or Obligations ledger, and no Leg state (kogaki#1699).
  reader_path: ls.map(legRecord),
  strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {},
  ...(defined.length ? { defined_terms: defined } : {}),
});

// ---- the fake judge: its behaviour is read from a mode file per run ----
const judge = join(root, "fake-judge.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PP_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const mode = readFileSync(dir + "/mode", "utf8").trim();
  const paras = JSON.parse(readFileSync(dir + "/paras.json", "utf8"));
  const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  const MARKER = ${JSON.stringify(JUDGE_INPUT_MARKER)};
  const callInput = () => JSON.parse(prompt.slice(prompt.lastIndexOf(MARKER) + MARKER.length));
  // The judge row's named criteria, each read off its own \`- <NAME>: <sentence>\` line (kogaki#1511).
  const crit = (name) => { const at = prompt.indexOf("\\n- " + name + ": "); return at < 0 ? "" : prompt.slice(at + name.length + 5, prompt.indexOf("\\n", at + 1)); };
  const planning = ["leg_you_must_plan", "leg_you_must_judge", "paragraph_you_must_plan"].some((k) => prompt.includes('"' + k + '"'));
  // THE MAPPER'S CALLS (kogaki#1734): a reading answers one structure, a grounding one table.
  if (!planning && prompt.includes('"proposition"')) {
    const i = callInput();
    out({ strand: i.strand, roles: [{ id: "gate", context: "A fixed check that lets some things through.", attributes: [] },
      { id: "crowd", context: "A body of things arriving in turn.", attributes: [] }],
      relations: [{ id: "r1", between: ["gate", "crowd"], holds: "{gate} lets part of {crowd} through." },
        { id: "r2", between: ["gate", "crowd"], holds: "{gate} sees only the part of {crowd} at its opening." }],
      higher_order: { relates: ["r1", "r2"], holds: "{gate} lets through only what of {crowd} reaches it." } });
  }
  if (!planning && prompt.includes('"segments"')) {
    out({ base: { domain: "the installer's tree" },
      correspondences: [{ role: "gate", expression: "the installer" }, { role: "crowd", expression: "the consumer's edits" }] });
  }
  const input = callInput();
  if (input.leg_you_must_judge) {
    const leg = input.leg_you_must_judge;
    const counter = dir + "/judge-" + leg.leg_id;
    const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
    writeFileSync(counter, String(n));
    const does = ((leg.bound_move && leg.bound_move.segments) || []).map((s) => String(s.operation || "").trim()).filter(Boolean);
    // EACH REFUSAL NAMES ITS OWN PARAGRAPH (kogaki#1642): a retry is scoped to the one it names.
    const restates = (p) => mode === "content" && (p.paragraph_waypoints || []).some((pw) => does.some((d) => String(pw.point || "").includes(d)));
    // (p): refuses a \`performs\` Waypoint carrying a purpose clause, only where the row carries PERFORMS IS BARE (kogaki#1485).
    const purposeRule = crit("PERFORMS IS BARE").includes("the reader's resulting reading");
    const purposeAt = (p) => (p.paragraph_waypoints || []).findIndex((pw) => / so that /.test(String(pw.performs || "")));
    const purposeP = mode === "performs-purpose" && purposeRule ? leg.paragraphs.find((p) => purposeAt(p) >= 0) : undefined;
    // (w): refuses a first Waypoint already carrying the second Segment's compressed form, only where the row carries OWN STEP (kogaki#1605).
    const ownRule = crit("OWN STEP").includes("nothing a later Segment's \`operation\` produces");
    const early = (p) => mode === "own-step" && ownRule && String(((p.paragraph_waypoints || [])[0] || {}).point || "").includes("COMPRESSED");
    const refuse = (p) => (mode === "ok" && leg.leg_id === "s2" && n === 1) || restates(p) || purposeP === p || early(p);
    const why = (p) => early(p) ? "OWN-STEP-SENTENCE Waypoint 1 already states what Waypoint 2's Segment 2 produces."
      : purposeP === p ? "PURPOSE-SENTENCE Waypoint " + (purposeAt(p) + 1) + " carries performs with the clause \\\\\\"so that"
        + p.paragraph_waypoints[purposeAt(p)].performs.split(" so that")[1] + "\\\\\\"."
      : restates(p) ? "CONTENT-SENTENCE the Waypoint restates a Segment's does rather than a part of the point."
      : refuse(p) ? "JUDGE-SENTENCE the first waypoint never reaches the after state." : "they begin at before and end at after.";
    out({ version: "1", leg_id: leg.leg_id, verdicts: leg.paragraphs.map((p) => ({ paragraph: p.paragraph,
      verdict: refuse(p) ? "does-not-fit" : "fits", why: why(p) })) });
  }
  // A SITE CALL (kogaki#1642) is answered by the same builder over its one paragraph, its terms carried,
  // its Waypoints marked as rewritten there.
  const site = input.paragraph_you_must_plan || null;
  const leg = site || input.leg_you_must_plan;
  const plan = paras[leg.leg_id];
  const planCounter = dir + "/plan-" + leg.leg_id;
  const planN = (existsSync(planCounter) ? Number(readFileSync(planCounter, "utf8")) : 0) + 1;
  writeFileSync(planCounter, String(planN));
  const table = leg.table;
  const nofit = mode === "nofit" && leg.leg_id === "s1";
  const move = nofit ? null : mode === "broken" ? "p3" : mode === "technique" ? "p2" : (mode === "segments3" || mode === "content" || mode === "relation") ? "p4"
    : (mode === "performs" || mode === "performs-purpose") ? "p5" : mode === "own-step" ? "p7" : "p1";
  const paragraphOf = (w, n) => {
    const pw = (k) => ({ point: "PW-" + leg.leg_id + "-" + n + "-" + k + " the paragraph establishes its point"
      + (site ? ", rewritten at its site." : "."), serves: [...w.serves], cast: mode === "ok" && leg.leg_id === "s1" ? { terse: true } : {} });
    const restated = mode === "content" && leg.leg_id === "s1" && n === 1 && planN === 1;
    const join = n === 1 ? undefined : mode === "join-sentence" && planN === 1 ? "The overwrite takes up the edit the installer's write left open." : "consequence";
    const carried = mode === "relation" && leg.leg_id === "s1" && n === 1 && planN === 1;
    // A term is named only where the paragraph gives its meaning, which this planner does for TERM alone.
    const terms = site ? [] : (input.terms_this_leg_introduces || []).filter((t) => t.term === ${JSON.stringify(TERM.term)});
    const introduces = site ? input.terms_this_paragraph_introduces : terms.filter((t) => String(w.point).includes(t.term) && !plan.slice(0, n - 1).some((o) => String(o.point).includes(t.term)))
      .map((t) => ({ term: t.term, meaning: t.meaning || "MEANING-" + t.term }));
    return { paragraph: n, materials: [...w.serves],
      purpose: "PURPOSE-" + leg.leg_id + "-" + n + " brings the reader to the point.",
      depends_on: n > 1 ? [n - 1] : [], rationale: "its Segments carry the Leg's relation this far.",
      introduces, "re-activate": [], ...(join ? { join } : {}),
      // (z): written in the table's expressions; the first such call breaks it at paragraph 2 with a Role id.
      paragraph_waypoints: table ? [{ point: table.correspondences.map((x) => x.expression).join(" and ") + " hold together"
        + (mode === "mapper" && n === 2 && planN === 2 ? ", and the gate stays." : "."), serves: [...w.serves], cast: {} }]
        : mode === "own-step"
        ? [{ point: "PW-" + leg.leg_id + "-" + n + "-1 the measure grades how far the copy is the installer's"
          + (planN === 1 ? ", that is, COMPRESSED who owns the copy." : "."), serves: [...w.serves], cast: {} },
          { point: "PW-" + leg.leg_id + "-" + n + "-2 put plainly, COMPRESSED who owns the copy.", serves: [...w.serves], cast: {} }]
        : mode === "performs-purpose"
        ? [{ performs: "PERFORMS-" + leg.leg_id + "-" + n + " announces the simplification"
          + (planN === 1 ? ", so that what follows is taken as an admitted shortcut." : ".") }, pw(2)]
        : mode === "performs" ? [{ performs: "PERFORMS-" + leg.leg_id + "-" + n + " flags the case as hard and announces the simplification." }, pw(2)]
        : restated ? [{ point: "RESTATED: sets up the point.", serves: [...w.serves], cast: {} }, pw(2), pw(3)]
        : mode === "relation" ? [pw(1), carried ? { point: "PW-s1-1-2 the overwrite is the consumer's edit, and answers what the setup opened.", serves: [...w.serves], cast: {} } : pw(2), pw(3)]
        : mode === "introduces" && w.point.includes(${JSON.stringify(TERM.term)})
        ? [{ point: "PW-" + leg.leg_id + "-" + n + "-1 the " + ${JSON.stringify(TERM.term)} + ", " + ${JSON.stringify(TERM.meaning)} + ", is written by the installer.", serves: [...w.serves], cast: {} }]
        : mode === "introduces" ? [{ point: "PW-" + leg.leg_id + "-" + n + "-1 the installer writes into the tree.", serves: [...w.serves], cast: {} }]
        : (mode === "segments3" || mode === "content") ? [pw(1), pw(2), pw(3)] : [pw(1)] };
  };
  if (site) out(paragraphOf(plan[site.paragraph - 1], site.paragraph));
  if (nofit) out({ version: "1", leg_id: leg.leg_id, move: null, rationale: "NOFIT-SENTENCE-" + planN + " no paragraph Move's takes are met when this Leg begins.", paragraphs: [] });
  out({ version: "1", leg_id: leg.leg_id, move: table ? leg.move : move, rationale: "the bound Move's Segments carry the Leg's relation.",
    paragraphs: plan.map((w, i) => paragraphOf(w, i + 1)) });
});
`);
chmodSync(judge, 0o755);

function runStage(name, ls, mode, movesDir = moves, defined = []) {
  const dir = join(root, name);
  const briefDir = join(dir, "theses", "plan-brief");
  const runDir = join(dir, "run");
  mkdirSync(briefDir, { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(dir, "mode"), mode);
  writeFileSync(join(dir, "paras.json"), JSON.stringify(Object.fromEntries(ls.map((l) => [l.leg_id, l.paras]))));
  const briefPath = join(briefDir, "brief.yaml");
  const text = briefText(ls, defined);
  writeFileSync(briefPath, text);
  const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, PP_FIXTURE_DIR: dir, KOGAKI_SETTINGS: stageSettings };
  const cli = (args) => spawnSync(process.execPath, [join(repo, "src", "paragraph-plan.mjs"), ...args, "--brief", briefPath,
    "--run-dir", runDir, "--moves-dir", movesDir], { cwd: repo, encoding: "utf8", env, timeout: 180000 });
  const started = cli(["start"]);
  let awaited = null;
  if (started.status === 0) {
    for (let i = 0; i < 6; i++) {
      awaited = cli(["await", "--wait-s", "25"]);
      if (!(awaited.stdout || "").includes(PARAGRAPH_PLAN_STILL_RUNNING_LINE)) break;
    }
  }
  const prompts = existsSync(join(dir, "prompts.jsonl"))
    ? readFileSync(join(dir, "prompts.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const said = `${started.stdout}${started.stderr}${awaited ? awaited.stdout + awaited.stderr : ""}`;
  return { dir, briefPath, text, runDir, started, awaited, prompts, said, planPath: join(briefDir, PARAGRAPH_PLAN_FILE) };
}
const finished = (tag, r) => {
  if (r.started.status !== 0) fails.push(`${tag} start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`${tag} await did not finish the job: ${r.said.slice(0, 600)}`);
};
const readPlan = (r) => (existsSync(r.planPath) ? parseYaml(readFileSync(r.planPath, "utf8"), r.planPath) : null);

// A REFUSAL NAMING A PARAGRAPH IS RETRIED THERE ALONE (kogaki#1642): its retry is a site prompt,
// whose refusals ride in `refused_here` beside the paragraphs they refused.
const inputOf = (p) => JSON.parse(p.slice(p.lastIndexOf(JUDGE_INPUT_MARKER) + JUDGE_INPUT_MARKER.length));
const isPlan = (p) => p.includes('"leg_you_must_plan"');
const isSite = (p) => p.includes('"paragraph_you_must_plan"');
const isJudge = (p) => p.includes('"leg_you_must_judge"');
const legOf = (p) => { const i = inputOf(p); return (i.leg_you_must_plan || i.paragraph_you_must_plan || i.leg_you_must_judge || {}).leg_id; };
const retriesOf = (prompts, legId) => prompts.filter((p) => (isPlan(p) || isSite(p)) && legOf(p) === legId);
const retryText = (p) => (isSite(p) ? inputOf(p).refused_here.map((h) => `${h.refusal}\n${JSON.stringify(h.entry)}`).join("\n") : p);
const inputs = (ls = legs) => ({ legs: ls.map((l) => planLeg(l)), movesDir: moves, bound: BOUND });

// (a) A PLANNED JOB WRITES THE PARAGRAPH-LEVEL READER PATH (kogaki#1639, kogaki#1777): each Leg its one
// bound Move's id and its paragraphs, each paragraph its schema, its join and its Waypoints and nothing
// else; no reader state, no `obligations` and no `discharges` (kogaki#1701); and the run directory holds
// no bindings record. The plan call hands each Leg what the Legs before it state and the Persona's
// prior knowledge (kogaki#1777).
let okPrompts = [];
{
  const r = runStage("ok", legs, "ok");
  okPrompts = r.prompts;
  finished("(a)", r);
  const rec = readPlan(r);
  if (!rec) fails.push("(a) no ParagraphPlan file was written beside the Brief");
  else {
    const plan = readFileSync(r.planPath, "utf8");
    const body = plan.split("\n").filter((l) => !l.startsWith("#")).join("\n");
    for (const banned of ["segments", "settles", "technique", "breaks", "operation", "reader_state_before", "reader_state_after", "obligations", "discharges", "why", "waypoints", "waypoint"]) {
      if (new RegExp(`(^|[^A-Za-z_])${banned}([^A-Za-z_]|$)`, "m").test(body)) fails.push(`(a) the ParagraphPlan file carries Move information or a retired field (\`${banned}\`)`);
    }
    for (const id of ["s1-1", "s1-2", "s2-1"]) if (!plan.includes(`PW-${id}`)) fails.push(`(a) the ParagraphPlan file lacks the paragraph ${id}`);
    for (const l of rec.legs) {
      if (JSON.stringify(Object.keys(l)) !== JSON.stringify(["leg_id", "move", "paragraphs"]) || l.move !== "p1") {
        fails.push(`(a) Leg ${l.leg_id} does not carry exactly its id, its one bound Move p1 and its paragraphs: ${JSON.stringify(Object.keys(l))} ${JSON.stringify(l.move)}`);
      }
      for (const p of l.paragraphs) {
        const want = ["paragraph", "materials", "purpose", "depends_on", "rationale", "introduces", "re-activate", ...(p.paragraph > 1 ? ["join"] : []), "paragraph_waypoints"];
        if (JSON.stringify(Object.keys(p)) !== JSON.stringify(want)) {
          fails.push(`(a) Leg ${l.leg_id}, paragraph ${p.paragraph} carries ${Object.keys(p).join(", ")}, not ${want.join(", ")}`);
        }
        if (!/^PURPOSE-/.test(p.purpose) || !/^its Segments carry/.test(p.rationale) || JSON.stringify(p.introduces) !== "[]" || JSON.stringify(p["re-activate"]) !== "[]") {
          fails.push(`(a) Leg ${l.leg_id}, paragraph ${p.paragraph} does not carry the planner's purpose, rationale, introduces and re-activate as written: ${JSON.stringify(p)}`);
        }
      }
    }
    const s1 = rec.legs[0].paragraphs;
    if (JSON.stringify(s1.map((p) => p.materials)) !== JSON.stringify([["L1"], ["L1", "L2"]]) || JSON.stringify(s1.map((p) => p.depends_on)) !== JSON.stringify([[], [1]])) {
      fails.push(`(a) Leg s1's paragraphs do not carry their materials and dependencies as the planner wrote them: ${JSON.stringify(s1.map((p) => [p.materials, p.depends_on]))}`);
    }
    const joins = rec.legs.map((l) => l.paragraphs.map((p) => p.join ?? null));
    if (JSON.stringify(joins) !== JSON.stringify([[null, "consequence"], [null]])) {
      fails.push(`(a) the ParagraphPlan file does not carry a join on every paragraph after the first and none on a first (kogaki#1411): ${JSON.stringify(joins)}`);
    }
    const sha = (await import("node:crypto")).createHash("sha256").update(r.text).digest("hex");
    if (!plan.includes(sha)) fails.push("(a) the ParagraphPlan file does not name the Brief's content hash");
    if (!plan.includes("theses/plan-brief/brief.yaml")) fails.push("(a) the ParagraphPlan file does not name the Brief's path");
    const self = rawPlanShapeRefusal(rec, "plan.yaml", legs, { bound: BOUND });
    if (self !== null) fails.push(`(a) the plan reader refuses the file the stage wrote: ${self}`);
    // THE CAST RIDES INTO THE FILE (kogaki#1695): s1's `{ terse: true }` and s2's `{}`.
    const casts = rec.legs.map((l) => l.paragraphs.flatMap((p) => p.paragraph_waypoints.filter((x) => !Object.hasOwn(x, "performs")).map((x) => x.cast)));
    if (JSON.stringify(casts) !== JSON.stringify([[{ terse: true }, { terse: true }], [{}]])) {
      fails.push(`(a) the ParagraphPlan file does not carry the planner's cast on every point Waypoint (kogaki#1695): ${JSON.stringify(casts)}`);
    }
    // THE MAPPING RECORD (kogaki#1733): written beside the plan, empty until a stage fills it, named by path and digest.
    const empty = (await import("node:crypto")).createHash("sha256").update("").digest("hex");
    const m = rec.mapping || {};
    if (!existsSync(join(r.planPath, "..", "mapping")) || !String(m.path).endsWith("theses/plan-brief/mapping") || m.sha256 !== empty || JSON.stringify(m.files) !== "[]") {
      fails.push(`(a) the stage did not write mapping/ beside the plan and name it by path and the digest of nothing (kogaki#1733): ${JSON.stringify(rec.mapping)}`);
    }
  }
  const plans = r.prompts.filter(isPlan);
  if (!plans.length || !plans.every((p) => critOf(p, "CAST").includes("a `cast` setting true each key its Segment's `manner` bears"))) {
    fails.push("(a) a plan prompt's CAST does not ask for the cast from the Segment's manner (kogaki#1695)");
  }
  for (const [key, definition] of Object.entries(CAST_KEYS)) {
    if (!plans.every((p) => p.includes(`\`${key}\` -- ${definition}`))) fails.push(`(a) a plan prompt's row does not name the cast key \`${key}\` with its definition (kogaki#1695)`);
  }
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(a) the Brief was rewritten by the stage");
  if (readdirSync(r.runDir).some((f) => /bindings/.test(f))) fails.push(`(a) the run directory holds a bindings record: ${readdirSync(r.runDir).join(", ")}`);
  const planIn = (id) => plans.map(inputOf).find((i) => i.leg_you_must_plan.leg_id === id);
  const s1In = planIn("s1");
  const s2In = planIn("s2");
  // WHAT THE LEGS BEFORE IT STATE (kogaki#1777): derived from the Leg order alone.
  if (!s1In || JSON.stringify(s1In.leg_you_must_plan.the_reader_has_been_told) !== "[]"
    || !s2In || JSON.stringify(s2In.leg_you_must_plan.the_reader_has_been_told) !== JSON.stringify([{ leg_id: "s1", text: S1_TEXT }])) {
    fails.push(`(a) each Leg is not handed what the Legs before it state: ${JSON.stringify([s1In && s1In.leg_you_must_plan.the_reader_has_been_told, s2In && s2In.leg_you_must_plan.the_reader_has_been_told])}`);
  }
  if (!s1In || s1In.leg_you_must_plan.text !== S1_TEXT || JSON.stringify(s1In.leg_you_must_plan.claims) !== JSON.stringify(legs[0].claims)
    || typeof s1In.leg_you_must_plan.prior_knowledge !== "string" || !s1In.leg_you_must_plan.prior_knowledge || s1In.paragraphs_at_most !== BOUND) {
    fails.push(`(a) the plan call is not handed the Leg's text, its Claims, the Persona's prior knowledge and the paragraph bound: ${JSON.stringify(s1In)}`.slice(0, 900));
  }
  if (!s1In || JSON.stringify(s1In.leg_you_must_plan.leaves_for_next_leg) !== "[]" || "waypoints" in s1In.leg_you_must_plan) {
    fails.push("(a) the plan call is handed a Brief Waypoint or a `leaves_for_next_leg` though no Leg binds a Move of the Brief's (kogaki#1768)");
  }
  if (r.prompts.some((p) => /"(reader_state_(before|after)|entry_state|stands_to_be_taken_up|obligations_this_leg_owes|deferred_slots|next_point)"/.test(p))) {
    fails.push("(a) a prompt still carries a reader state, what stands to be taken up, an owed Brief row or a Brief Waypoint's next_point (kogaki#1701, kogaki#1777)");
  }
  // THE RETRY IS A SITE CALL (kogaki#1642): the judge refused Leg s2's one paragraph, so its second
  // prompt holds the Leg's Move and carries the refused paragraph beside the judge's sentence.
  const s2Plans = retriesOf(r.prompts, "s2");
  const site2 = s2Plans[1] && isSite(s2Plans[1]) ? inputOf(s2Plans[1]) : null;
  if (s2Plans.length !== 2 || !site2 || !retryText(s2Plans[1]).includes("JUDGE-SENTENCE")) {
    fails.push(`(a) the judge's does-not-fit sentence was not put into Leg s2's site prompt (${s2Plans.length} plan or site prompt(s))`);
  }
  if (!site2 || site2.bound_move.id !== "p1" || "fixed" in site2 || site2.paragraph_you_must_plan.paragraph !== 1
    || JSON.stringify(site2.paragraph_you_must_plan.the_reader_has_been_told) !== JSON.stringify([{ leg_id: "s1", text: S1_TEXT }])
    || !JSON.stringify((site2.refused_here[0] || {}).entry).includes("PW-s2-1-1")) {
    fails.push(`(a) Leg s2's site prompt does not hold the Leg's Move and what the Legs before it state beside the refused paragraph: ${JSON.stringify(site2).slice(0, 800)}`);
  }
  if (!plans.length || !plans.every((p) => p.includes(`"operation": ${JSON.stringify(PSEG_OPERATION)}`) && p.includes('"relation": ""')
    && p.includes('"persona"') && p.includes("breaks if the point is dropped."))) {
    fails.push("(a) a plan prompt is not handed the Moves' segments (each Segment's operation and relation) and breaks beside the persona");
  }
  const judges = r.prompts.filter(isJudge);
  if (!judges.length || !judges.every((p) => ["takes", "leaves", "the_reader_has_been_told", "leaves_for_next_leg", "breaks", "segments", "bound_move", "text"].every((k) => p.includes(`"${k}"`)))) {
    fails.push("(a) a judge prompt is not handed the Leg's text and bound Move's takes, leaves, segments and breaks beside what the Legs before it state (kogaki#1701, kogaki#1777)");
  }
  if ([...plans, ...judges].some((p) => p.includes('"technique"'))) fails.push("(a) a plan or judge prompt is handed a `technique` (kogaki#1412)");
}

// (b) NO MOVE FITS THE LEG: asked again whole to the Round bound, then a stop naming the Leg.
{
  const r = runStage("nofit", legs, "nofit");
  if (r.started.status !== 0) fails.push(`(b) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status === 0) fails.push(`(b) await did not stop the stage: ${r.said.slice(0, 600)}`);
  if (!r.said.includes("Leg s1") || !r.said.includes(NO_PARAGRAPH_MOVE_FITS)) fails.push(`(b) the stop does not name Leg s1 and ${NO_PARAGRAPH_MOVE_FITS}: ${r.said.slice(0, 600)}`);
  const s1Plans = retriesOf(r.prompts, "s1");
  if (s1Plans.length !== 3 || s1Plans.some(isSite)) fails.push(`(b) Leg s1 was not asked whole brief.unit_rounds (3) times: ${s1Plans.length}`);
  if (s1Plans.length > 1 && !retryText(s1Plans[1]).includes("NOFIT-SENTENCE-1")) fails.push("(b) the no_paragraph_move_fits refusal was not put into the next round's prompt");
  // the prompt carries every refusal so far, not only the last one (kogaki#1395)
  if (s1Plans.length > 2 && !(retryText(s1Plans[2]).includes("NOFIT-SENTENCE-1") && retryText(s1Plans[2]).includes("NOFIT-SENTENCE-2")
    && retryText(s1Plans[2]).indexOf("NOFIT-SENTENCE-1") < retryText(s1Plans[2]).indexOf("NOFIT-SENTENCE-2"))) {
    fails.push("(b) the third round's prompt does not carry BOTH the first and second rounds' refusals, oldest first");
  }
  if (existsSync(r.planPath)) fails.push("(b) a ParagraphPlan file was written for a stopped job");
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(b) the Brief was rewritten by a stopped stage");
}

// (j) kogaki#1413: the plan call reads the Move record through the Brief's YAML reader, its `before`
// map rendered one `dimension: sentence` line per dimension; a `.md` Move, or a state of one joined
// line, is refused by name and plans nothing.
{
  const r = runStage("yaml-state", legs, "ok");
  const plans = r.prompts.filter(isPlan);
  const want = `"before": ${JSON.stringify(Object.entries(P1_BEFORE).map(([d, s]) => `${d}: ${s}`).join("\n"))}`;
  if (!plans.length || !plans.every((p) => p.includes(want))) fails.push(`(j) a plan prompt does not carry p1's before one dimension per line (${want})`);
  const retired = join(root, "moves-retired");
  mkdirSync(retired);
  writeFileSync(join(retired, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(retired, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION }] });
  writeFileSync(join(retired, "p9.md"), "id: p9\nbefore: >-\n  knowledge: before.\n");
  const rr = runStage("retired", legs, "ok", retired);
  if (!rr.said.includes("p9.md") || !rr.said.includes("retired `.md` form")) fails.push(`(j) a library holding a .md Move is not refused naming it: ${rr.said.slice(0, 400)}`);
  if (existsSync(rr.planPath)) fails.push("(j) a ParagraphPlan file was written over a library holding a .md Move");
  const joined = join(root, "moves-joined");
  mkdirSync(joined);
  writeFileSync(join(joined, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(joined, { id: "p1", before: "knowledge: before. question: holds: none.",
    after: { knowledge: "after." }, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION }] });
  const jr = runStage("joined", legs, "ok", joined);
  if (!jr.said.includes("one joined line")) fails.push(`(j) a Move whose before is one joined line is not refused by name: ${jr.said.slice(0, 400)}`);
  if (existsSync(jr.planPath)) fails.push("(j) a ParagraphPlan file was written over a joined-line Move");
}

// (c) and (f): a library holding a Move with no `segments` stops the stage naming the Move and
// `segments` -- whether or not the Move carries the retired `technique` (kogaki#1412).
for (const [tag, name, movesDir, id] of [["(c)", "broken", movesNoOrder, "p3"], ["(f)", "technique", movesTechnique, "p2"]]) {
  const r = runStage(name, legs, name, movesDir);
  if (r.started.status === 0 && (!r.awaited || r.awaited.status === 0)) fails.push(`${tag} the stage was not stopped: ${r.said.slice(0, 600)}`);
  if (!r.said.includes(`"${id}"`) || !r.said.includes("carries no segments") || !r.said.includes("kogaki#1412")) {
    fails.push(`${tag} the stop does not name the Move ${id} and its missing segments: ${r.said.slice(0, 600)}`);
  }
  if (r.said.includes("technique where")) fails.push(`${tag} the stop offers technique as a fallback order: ${r.said.slice(0, 600)}`);
  if (existsSync(r.planPath)) fails.push(`${tag} a ParagraphPlan file was written over a Move with no segments`);
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push(`${tag} the Brief was rewritten by a stopped stage`);
}

// (g) a bound Move carrying three `segments` yields three Waypoints under each paragraph, and the
// rendered Packet carries the three indented lines under the paragraph's line.
{
  const r = runStage("segments3", legs, "segments3");
  finished("(g)", r);
  const rec = readPlan(r);
  const first = rec ? rec.legs.find((l) => l.leg_id === "s1").paragraphs[0] : null;
  if (!first || first.paragraph_waypoints.length !== 3) fails.push(`(g) the ParagraphPlan file does not carry three Waypoints under s1's first paragraph: ${JSON.stringify(first)}`);
  else {
    const rendered = waypointLines({ text: S1_TEXT, claims: legs[0].claims, paragraphs: [first] }) || "";
    const indented = rendered.split("\n").filter((l) => l.startsWith("   "));
    if (indented.length !== 3 || ![1, 2, 3].every((n) => rendered.includes(`PW-s1-1-${n}`)) || !rendered.startsWith(`1. ${S1_TEXT} *Serves:* ${C1}`)) {
      fails.push(`(g) the rendered Packet does not carry the paragraph's line and three indented Waypoints under it: ${JSON.stringify(rendered)}`);
    }
  }
  const flatHeader = readFileSync("src/packet-template.md", "utf8").replace(/\s+/g, " ");
  if (!flatHeader.includes("rendered as the sentences it is") || !flatHeader.includes("adds no sentence that no indented line carries")) {
    fails.push("(g) src/packet-template.md's waypoints header does not state that each line is rendered as the sentences it is and none is added");
  }
  for (const retired of ["as many sentences as it needs", "its wording is yours"]) {
    if (flatHeader.includes(retired)) fails.push(`(g) src/packet-template.md's waypoints header still carries the retired "${retired}"`);
  }
}

// (h) EVERY SEGMENT REACHES THE PLAN CALL AS ITS FIELDS (kogaki#1414); the plan row states an
// `operation` is performed on the Leg's `text`; a Waypoint restating a Segment's `operation` is
// refused by the judge and repaired at its paragraph.
{
  const r = runStage("content", legs, "content");
  finished("(h)", r);
  const plans = r.prompts.filter(isPlan);
  const fields = [['"segment": 1', '"operation": "sets up the point."', '"relation": ""'],
    ['"segment": 2', '"operation": "makes the point."', '"relation": "answers what the setup opened."'],
    ['"segment": 3', '"operation": "leaves the point."', '"relation": "draws the consequence of the point."']];
  if (!plans.length || !plans.every((p) => fields.every((f) => f.every((x) => p.includes(x))))) {
    fails.push("(h) a plan prompt does not carry every Segment's number, operation and relation as separate fields");
  }
  if (!plans.length || !plans.every((p) => p.includes("A Segment's `operation` is an operation performed on a part of the Leg's `text`, never a point to state."))) {
    fails.push("(h) a plan prompt's row does not state that a Segment's operation is performed on the Leg's text and never a point to state");
  }
  const s1 = retriesOf(r.prompts, "s1");
  if (s1.length !== 2 || !isSite(s1[1]) || !retryText(s1[1]).includes("CONTENT-SENTENCE")) {
    fails.push(`(h) the judge's content refusal was not put into Leg s1's site prompt (${s1.length} plan or site prompt(s))`);
  }
}

// (o) A SEGMENT'S RELATION IS NEVER CONTENT (kogaki#1446), and (q) A WAYPOINT EXPLAINS ITS LEG'S
// TEXT (kogaki#1632, kogaki#1777): the plan row's ORDER, DIVIDE, EXPLAIN, CONSISTENT and NO NEW FACT.
{
  const r = runStage("relation", legs, "relation");
  finished("(o)", r);
  const plans = r.prompts.filter(isPlan);
  if (!plans.length || !plans.every((p) => critOf(p, "ORDER") === "A Segment's `relation` is carried by the order of the Waypoints, and no Waypoint states it.")) {
    fails.push("(o) a plan prompt's ORDER does not state that a Segment's relation is never stated in a Waypoint");
  }
  const Q_LINES = {
    DIVIDE: "Write each paragraph's Waypoints one per Segment of the bound Move, in its order, each the step its Segment's `operation` performs toward the Leg's `text`.",
    EXPLAIN: "A Waypoint may explain or illustrate the Leg's `text` in words and examples of your own.",
    CONSISTENT: "No Waypoint contradicts the Leg's `text` or breaks the progression toward it.",
    "NO NEW FACT": "No Waypoint states or implies a claim about the article's subject that the Leg's `text` and its `claims` do not make.",
  };
  for (const [name, line] of Object.entries(Q_LINES)) {
    if (!plans.length || !plans.every((p) => critOf(p, name) === line)) fails.push(`(q) a plan prompt's ${name} is not the sentence kogaki#1777 settled: ${plans.length ? critOf(plans[0], name) : "no plan prompt"}`);
  }
  for (const gone of ["Brief Waypoint's `point`", "standing to the one before it in its Segment's `relation`", "toward `next_point`"]) {
    if (!plans.length || plans.some((p) => p.includes(gone))) fails.push(`(q) a plan prompt still carries "${gone}"`);
  }
}

// (r) A PARAGRAPH MOVE IS BOUND BY WHAT IT TAKES UP (kogaki#1663, kogaki#1701, kogaki#1777): the
// fixture hands Leg s1 three terms the Brief record does not carry (a Leg introduces no term,
// kogaki#1768); the plan call is handed an empty ledger; BIND binds by `takes` against what the
// reader has been told; the Leg binds p1, whose one Segment defines nothing, and the plan is written.
{
  const r = runStage("introduces", termLegs, "introduces", moves, DEFINED);
  finished("(r)", r);
  const plans = r.prompts.filter(isPlan);
  const judges = r.prompts.filter(isJudge);
  const s1Plans = plans.filter((p) => legOf(p) === "s1");
  const s2Plans = plans.filter((p) => legOf(p) === "s2");
  if (!s1Plans.length || !s1Plans.every((p) => JSON.stringify(inputOf(p).terms_this_leg_introduces) === "[]")) {
    fails.push(`(r) Leg s1's plan input carries a ledger of terms though a Leg introduces none: ${s1Plans.length ? JSON.stringify(inputOf(s1Plans[0]).terms_this_leg_introduces) : "no plan prompt"}`);
  }
  if (s1Plans.length && (!inputOf(s1Plans[0]).persona || Object.hasOwn(inputOf(s1Plans[0]).leg_you_must_plan, "introduces"))) {
    fails.push("(r) the introduced terms do not ride beside the persona, outside the Leg");
  }
  if (!s2Plans.length || JSON.stringify(inputOf(s2Plans[0]).terms_this_leg_introduces) !== "[]") fails.push("(r) Leg s2 is not handed an empty list of introduced terms");
  for (const phrase of ["whose `takes` entries are each met", "the `what` by sense", "`the_reader_has_been_told`", "`prior_knowledge`", "for the whole Leg"]) {
    if (!plans.length || !plans.every((p) => critOf(p, "BIND").includes(phrase))) fails.push(`(r) a plan prompt's BIND row does not carry "${phrase}"`);
  }
  for (const phrase of ["toward `next_point`", "defines, names or grounds", "contradicts, on no dimension it declares", "exclusion, never ranking", "`stands_to_be_taken_up`"]) {
    if (!plans.length || plans.some((p) => critOf(p, "BIND").includes(phrase))) fails.push(`(r) a plan prompt's BIND row still carries "${phrase}"`);
  }
  if (!plans.length || plans.some((p) => p.includes("terms_this_leg_coins"))) fails.push("(r) a plan prompt still carries `terms_this_leg_coins`");
  if (!judges.length || judges.some((p) => Object.hasOwn(inputOf(p), "terms_this_leg_coins") || critOf(p, "TERM MEANING") !== "")) {
    fails.push("(r) a judge prompt still carries `terms_this_leg_coins` or the TERM MEANING axis");
  }
  for (const phrase of ["at most one paragraph, the first in the Leg to use it", "or yours where it is `null`"]) {
    if (!plans.length || !plans.every((p) => critOf(p, "TERMS").includes(phrase))) fails.push(`(r) a plan prompt's TERMS row does not carry "${phrase}"`);
  }
  const written = readPlan(r);
  const l1 = written ? written.legs[0] : null;
  if (!l1 || l1.move !== "p1" || JSON.stringify(l1.paragraphs[0].introduces) !== "[]") {
    fails.push(`(r) the ParagraphPlan file does not bind p1 on Leg s1 with nothing in its first paragraph's \`introduces\`: ${JSON.stringify(l1)}`);
  }
  if (/^(define|defines|name|names|ground|grounds)\b/i.test(PSEG_OPERATION)) fails.push("(r) p1's one Segment defines, names or grounds, so the case proves nothing");
  // The meaning is read by the Packet's own rule (kogaki#1529).
  const read = introducedTerms(["stamp file — the file the hash is written to", { term: "fork", meaning: "a copy of a repository" }, "bare term"]);
  const wantRead = [{ term: "stamp file", meaning: "the file the hash is written to" }, { term: "fork", meaning: "a copy of a repository" }, { term: "bare term", meaning: null }];
  if (JSON.stringify(read) !== JSON.stringify(wantRead)) fails.push(`(r) the introduced terms are not read by the Packet's meaning rule: ${JSON.stringify(read)}`);
}

// (w) A WAYPOINT PERFORMS ITS OWN SEGMENT'S OPERATION ALONE (kogaki#1605): bound to p7, the first
// Round's first Waypoint of each paragraph carries Segment 2's compressed form; each is repaired at
// its own paragraph and the compression held to the second Waypoint is written.
{
  const r = runStage("own-step", legs, "own-step");
  finished("(w)", r);
  const judges = r.prompts.filter(isJudge);
  if (!judges.length || !judges.every((p) => critOf(p, "OWN STEP").includes("names by both Waypoints and that Segment"))) {
    fails.push("(w) a judge prompt's OWN STEP does not refuse a later Segment's result naming both Waypoints and the Segment");
  }
  const s1 = retriesOf(r.prompts, "s1");
  if (s1.length !== 3 || !retryText(s1[1]).includes("OWN-STEP-SENTENCE Waypoint 1 already states what Waypoint 2's Segment 2 produces.")) {
    fails.push(`(w) the judge's refusal naming Waypoints 1 and 2 and Segment 2 was not put into each of Leg s1's site prompts (${s1.length} plan or site prompt(s))`);
  }
  const rec = readPlan(r);
  const pws = rec ? rec.legs.flatMap((l) => l.paragraphs.map((p) => p.paragraph_waypoints.map((x) => x.point.includes("COMPRESSED")))) : null;
  if (JSON.stringify(pws) !== JSON.stringify([[false, true], [false, true], [false, true]])) {
    fails.push(`(w) the ParagraphPlan file does not hold the compression to each second Waypoint alone: ${JSON.stringify(pws)}`);
  }
}

// (p) A SEGMENT THAT ACTS ON THE READING CARRIES `performs` (kogaki#1448, kogaki#1485).
{
  const r = runStage("performs", legs, "performs");
  finished("(p)", r);
  const rec = readPlan(r);
  const pws = rec ? rec.legs.find((l) => l.leg_id === "s1").paragraphs[0].paragraph_waypoints : null;
  const want = [{ performs: "PERFORMS-s1-1 flags the case as hard and announces the simplification." },
    { point: "PW-s1-1-2 the paragraph establishes its point.", serves: ["L1"], cast: {} }];
  if (JSON.stringify(pws) !== JSON.stringify(want)) fails.push(`(p) the ParagraphPlan file does not carry the performs entry on Segment 1 and the point entry after it: ${JSON.stringify(pws)}`);
  const plans = r.prompts.filter(isPlan);
  const judges = r.prompts.filter(isJudge);
  if (!judges.length || !judges.every((p) => p.includes('"performs": "PERFORMS-'))) fails.push("(p) the judge's input does not carry the performs Waypoint");
  for (const words of ["acts on the reader's reading, where it carries `performs`", "the operation alone", "no clause stating what the reader then takes"]) {
    if (!plans.length || !plans.every((p) => critOf(p, "FORM").includes(words))) fails.push(`(p) a plan prompt's FORM does not carry "${words}"`);
  }
  if (!judges.length || !judges.every((p) => critOf(p, "PERFORMS IS BARE").includes("the reader's resulting reading"))) {
    fails.push("(p) a judge prompt's PERFORMS IS BARE does not refuse a clause stating the reader's resulting reading");
  }
}
{
  const r = runStage("performs-purpose", legs, "performs-purpose");
  finished("(p)", r);
  const s1 = retriesOf(r.prompts, "s1");
  if (s1.length !== 3 || !retryText(s1[1]).includes("PURPOSE-SENTENCE Waypoint 1 carries performs with the clause") || !retryText(s1[1]).includes("what follows is taken as an admitted shortcut")) {
    fails.push(`(p) the judge's refusal naming the performs entry and its so-that clause did not reach Leg s1's site prompt (${s1.length} plan or site prompt(s))`);
  }
  const rec = readPlan(r);
  const performs = rec ? rec.legs.find((l) => l.leg_id === "s1").paragraphs[0].paragraph_waypoints[0].performs : null;
  if (performs !== "PERFORMS-s1-1 announces the simplification.") fails.push(`(p) the ParagraphPlan file does not carry the bare-operation performs entry that fits: ${JSON.stringify(performs)}`);
}
{
  const one = [legs[0]];
  const plan = (pws0) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0".repeat(64) },
    legs: [{ leg_id: "s1", paragraphs: [{ paragraph_waypoints: pws0 }, { join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] }] });
  const allPerforms = paragraphPlanShapeRefusal(plan([{ performs: "announces the simplification." }]), "plan.yaml", one) || "";
  if (!allPerforms.includes("none of its Waypoints carries a `point`")) fails.push(`(p) the plan reader did not refuse a paragraph none of whose Waypoints carries a point: ${allPerforms}`);
  const mixed = paragraphPlanShapeRefusal(plan([{ performs: "announces.", serves: ["L1"] }, { point: "a point.", serves: ["L1"], cast: {} }]), "plan.yaml", one) || "";
  if (!mixed.includes("carries `performs` beside `serves`")) fails.push(`(p) the plan reader did not refuse a performs entry carrying serves: ${mixed}`);
  const second = paragraphPlanShapeRefusal(plan([{ performs: "announces." }, { point: "", serves: ["L1"], cast: {} }]), "plan.yaml", one) || "";
  if (!second.includes("waypoint 2 has an empty point")) fails.push(`(p) a refusal of a point entry after a performs entry does not name it by its own number: ${second}`);
  const ok = paragraphPlanShapeRefusal(plan([{ performs: "announces." }, { point: "a point.", serves: ["L1"], cast: {} }]), "plan.yaml", one);
  if (ok !== null) fails.push(`(p) the plan reader refused a performs entry beside a point entry: ${ok}`);
}

// (l) THE JOIN IS A TYPED RELATION (kogaki#1411, kogaki#1477).
{
  const r = runStage("join-sentence", legs, "join-sentence");
  finished("(l)", r);
  const plans = r.prompts.filter(isPlan);
  const judges = r.prompts.filter((p) => isJudge(p) && legOf(p) === "s1");
  if (!plans.length || !plans.every((p) => critOf(p, "JOIN").includes("choose its `join`"))) fails.push("(l) a plan prompt's JOIN does not ask for the join");
  for (const [word, definition] of Object.entries(JOIN_TYPES)) {
    const named = `\`${word}\` -- ${definition}`;
    if (!plans.every((p) => p.includes(named))) fails.push(`(l) a plan prompt's row does not name \`${word}\` with its definition`);
    if (!judges.length || !judges.every((p) => p.includes(named))) fails.push(`(l) a judge prompt's row does not name \`${word}\` with its definition`);
  }
  if ([...plans, ...judges].some((p) => p.includes("names no noun phrase"))) fails.push("(l) a row still carries the retired join test (\"names no noun phrase\")");
  if (!judges.length || !judges[0].includes('"join": "consequence"')) fails.push("(l) the judge call is not handed the join");
  const s1 = retriesOf(r.prompts, "s1");
  if (s1.length !== 2 || !isSite(s1[1]) || !retryText(s1[1]).includes("paragraph 2 carries a sentence for `join`")) {
    fails.push(`(l) the validator's refusal of a sentence join, naming the paragraph, did not reach its site prompt (${s1.length} plan or site prompt(s))`);
  }
  if (existsSync(r.planPath) && !/join: consequence\n/.test(readFileSync(r.planPath, "utf8"))) fails.push("(l) the ParagraphPlan file does not carry the re-planned type word");
}

// (m) THE JOIN'S PLACE AND SET ARE READ (kogaki#1411, kogaki#1477).
{
  const pw = (serves) => [{ point: "a point.", serves, cast: {} }];
  const record = (w1, w2) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", paragraphs: [{ ...w1, paragraph_waypoints: pw(["L1"]) }, { ...w2, paragraph_waypoints: pw(["L1", "L2"]) }] },
      { leg_id: "s2", paragraphs: [{ paragraph_waypoints: pw(["L2"]) }] }] });
  const good = paragraphPlanShapeRefusal(record({}, { join: "contrast" }), "plan.yaml", legs);
  if (good !== null) fails.push(`(m) the plan reader refused a type word on the second paragraph: ${good}`);
  for (const [label, w1, w2, want, issue] of [["missing", {}, {}, "carries no `join`", "kogaki#1411"],
    ["empty", {}, { join: " " }, "carries an empty `join`", "kogaki#1411"],
    ["misplaced", { join: "contrast" }, { join: "contrast" }, "the first paragraph of a Leg carries no join", "kogaki#1411"],
    ["sentence", {}, { join: "The overwrite takes up the edit." }, "paragraph 2 carries a sentence for `join`", "kogaki#1477"],
    ["outside-the-set", {}, { join: "addition" }, "carries the word \"addition\", which is outside the set", "kogaki#1477"]]) {
    const r = paragraphPlanShapeRefusal(record(w1, w2), "plan.yaml", legs) || "";
    if (!r.includes(want) || !r.includes(issue)) fails.push(`(m) the plan reader did not refuse a ${label} join by name: ${r}`);
    const unit = { version: "1", leg_id: "s1", paragraphs: [{ ...w1, paragraph_waypoints: pw(["L1"]) }, { ...w2, paragraph_waypoints: pw(["L1", "L2"]) }] };
    const v = validateParagraphPlanUnit(unit, inputs(), "leg-1");
    if (!(v.error || "").includes(want)) fails.push(`(m) the plan call's validator did not refuse a ${label} join by name: ${JSON.stringify(v)}`);
  }
  const briefBad = waypointsRefusal([{ point: "a point.", serves: ["L1"], join: "contrast" }], ["L1"], "the Brief, leg s1") || "";
  if (!briefBad.includes("carries `join`") || !briefBad.includes("kogaki#1411")) fails.push(`(m) the Brief's Waypoint rule did not refuse \`join\` by name: ${briefBad}`);
}

// (y) THE CAST IS A CLOSED MAP (kogaki#1695).
{
  const record = (pws1) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", paragraphs: [{ paragraph_waypoints: pws1 },
      { join: "contrast", paragraph_waypoints: [{ point: "b point.", serves: ["L1", "L2"], cast: {} }] }] },
    { leg_id: "s2", paragraphs: [{ paragraph_waypoints: [{ point: "c point.", serves: ["L2"], cast: {} }] }] }] });
  const unit = (pws1) => ({ version: "1", leg_id: "s1", paragraphs: [{ materials: ["L1"], paragraph_waypoints: pws1 },
    { join: "contrast", paragraph_waypoints: [{ point: "b point.", serves: ["L1", "L2"], cast: {} }] }] });
  const point = (extra) => ({ point: "a point.", serves: ["L1"], ...extra });
  for (const [label, pws1, want] of [
    ["terse", [point({ cast: { terse: true } })], null],
    ["empty", [point({ cast: {} })], null],
    ["outside-the-set", [point({ cast: { brief: true } })], "carries the cast key `brief`, which is outside the set"],
    ["non-boolean", [point({ cast: { terse: "yes" } })], "carries the cast key `terse` with \"yes\", not a boolean"],
    ["not-a-map", [point({ cast: ["terse"] })], "carries a `cast` that is not a map"],
    ["missing", [point({})], "Waypoint 1 carries no `cast`"],
    ["on-performs", [{ performs: "turns.", cast: {} }], "Waypoint 1 carries `cast` on a `performs` Waypoint"]]) {
    const r = paragraphPlanShapeRefusal(record(pws1), "plan.yaml", legs);
    const v = validateParagraphPlanUnit(unit(pws1), inputs(), "leg-1").error || null;
    for (const [reader, got] of [["plan reader", r], ["plan call's validator", v]]) {
      if (want === null ? got !== null : !(got || "").includes(want) || !(got || "").includes("kogaki#1695")) {
        fails.push(`(y) the ${reader} ${want === null ? "refused" : "did not refuse"} a ${label} cast${want === null ? "" : " by name"}: ${got}`);
      }
    }
  }
}

// (n) THE JOIN REACHES THE WRITER (kogaki#1411): one numbered line per paragraph, its Opens-from line
// beneath it and before its Waypoints; a paragraph without a join renders none.
{
  const rendered = waypointLines({ text: S1_TEXT, claims: legs[0].claims, paragraphs: [
    { materials: ["L1"], paragraph_waypoints: [{ point: "PW-1-1.", serves: ["L1"], cast: {} }] },
    { materials: ["L1", "L2"], join: "contrast", paragraph_waypoints: [{ point: "PW-2-1.", serves: ["L1", "L2"], cast: {} }] }] }) || "";
  const lines = rendered.split("\n");
  const want = [`1. ${S1_TEXT}`, "   1. PW-1-1.", `2. ${S1_TEXT}`, "   *Opens from:* contrast", "   1. PW-2-1."];
  if (lines.length !== want.length || !want.every((w, i) => lines[i].startsWith(w))) {
    fails.push(`(n) waypointLines does not render one line per paragraph, its Opens-from line under it and before its Waypoints: ${JSON.stringify(rendered)}`);
  }
  const t = readFileSync("src/packet-template.md", "utf8");
  const block = t.slice(t.indexOf("## The waypoints this Leg takes the reader through"), t.indexOf("{{waypoints}}"));
  if (!block.includes("An *Opens from* line under a numbered line carries one word")
    || !block.includes("`none` adds nothing.") || !block.includes("The word is not copied and not announced.")) {
    fails.push("(n) src/packet-template.md's waypoints block does not carry the Opens-from instruction");
  }
  const comment = t.slice(t.indexOf("NO MOVE REACHES THE PACKET"), t.indexOf("-->", t.indexOf("NO MOVE REACHES THE PACKET")));
  if (!comment.includes("is the ParagraphPlan's join, one word of a closed set of")) {
    fails.push("(n) src/packet-template.md's Move-boundary comment does not say the join is a ParagraphPlan relation word carrying nothing of a Move");
  }
}

// (t) A SEGMENT'S MANNER REACHES THE PLAN CALL AND NOTHING WRITTEN FROM IT (kogaki#1585).
{
  const MANNER = "a brief direct statement, given with no elaboration.";
  const segs = [{ operation: "sets up the point." }, { operation: "makes the point.", relation: "answers the setup.", manner: MANNER }];
  if (JSON.stringify(segmentsForPlanCall(segs)) !== JSON.stringify([{ segment: 1, operation: "sets up the point.", relation: "", manner: "" },
    { segment: 2, operation: "makes the point.", relation: "answers the setup.", manner: MANNER }])) {
    fails.push(`(t) the plan call is not handed each Segment's operation, relation and manner: ${JSON.stringify(segmentsForPlanCall(segs))}`);
  }
  const movesManner = isolatedLibrary("moves-t", { id: "p9", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: "names a case." }] });
  writeMove(movesManner, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION, manner: MANNER }] });
  const run = runStage("manner", legs, "ok", movesManner);
  const planCalls = run.prompts.filter(isPlan);
  if (!planCalls.length || !planCalls.every((p) => p.includes(`"manner": "${MANNER}"`))) {
    fails.push("(t) the plan call of a job binding a Move whose Segment carries a manner is not handed that manner, so the absence below reads nothing");
  } else if (!existsSync(run.planPath)) {
    fails.push(`(t) the job binding a manner-bearing Move wrote no plan file: ${run.said.slice(0, 600)}`);
  } else {
    const planText = readFileSync(run.planPath, "utf8");
    const pws = parseYaml(planText, run.planPath).legs.flatMap((l) => l.paragraphs.flatMap((p) => p.paragraph_waypoints));
    if (!pws.length || pws.some((p) => Object.hasOwn(p, "manner")) || planText.includes(MANNER)) {
      fails.push(`(t) the plan written from a Move whose Segment carries a manner holds a manner on a Waypoint: ${JSON.stringify(pws)}`);
    }
  }
  const unit = { version: "1", leg_id: "s1", paragraphs: [
    { materials: ["L1"], paragraph_waypoints: [{ point: "a point.", serves: ["L1"], manner: MANNER, cast: {} }] },
    { join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] };
  const v = validateParagraphPlanUnit(unit, inputs(), "leg-1");
  if (!(v.error || "").includes("Waypoint 1 carries `manner`")) fails.push(`(t) a planner answer carrying \`manner\` was not refused by name: ${JSON.stringify(v)}`);
  const record = (pw1) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", paragraphs: [{ materials: ["L1"], paragraph_waypoints: pw1 }, { join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] },
      { leg_id: "s2", paragraphs: [{ paragraph_waypoints: [{ point: "a point.", serves: ["L2"], cast: {} }] }] }] });
  const clean = paragraphPlanShapeRefusal(record([{ point: "a point.", serves: ["L1"], cast: {} }, { performs: "turns." }]), "plan.yaml", legs);
  if (clean !== null) fails.push(`(t) the plan reader refused a plan file carrying no manner: ${clean}`);
  const onPoint = paragraphPlanShapeRefusal(record([{ point: "a point.", serves: ["L1"], cast: {} }, { point: "b point.", serves: ["L1"], manner: MANNER, cast: {} }]), "plan.yaml", legs) || "";
  if (!onPoint.includes("Waypoint 2 carries `manner`")) fails.push(`(t) the plan reader did not refuse a manner on a point Waypoint, naming it: ${onPoint || "no refusal"}`);
  const onPerforms = paragraphPlanShapeRefusal(record([{ point: "a point.", serves: ["L1"], cast: {} }, { performs: "turns.", manner: MANNER }]), "plan.yaml", legs) || "";
  if (!onPerforms.includes("Waypoint 2 carries `performs` beside `manner`")) fails.push(`(t) the plan reader did not refuse a manner on a performs Waypoint, naming it: ${onPerforms || "no refusal"}`);
  const rendered = waypointLines({ text: S1_TEXT, claims: legs[0].claims, paragraphs: [{ materials: ["L1"],
    paragraph_waypoints: [{ point: "PW-1-1.", serves: ["L1"], manner: MANNER, cast: {} }, { performs: "turns.", manner: MANNER }] }] }) || "";
  const lines = rendered.split("\n");
  if (!(lines[1] || "").startsWith("   1. PW-1-1.") || lines[2] !== "   2. *turns.*" || rendered.includes("Manner:") || rendered.includes(MANNER)) {
    fails.push(`(t) waypointLines renders a Waypoint's manner: ${JSON.stringify(rendered)}`);
  }
}

// (u) WHAT A LEG'S MOVE TAKES UP IS MET BY WHAT THE LEGS BEFORE IT STATE (kogaki#1701, kogaki#1777):
// the plan row binds a Move by its `takes` against `the_reader_has_been_told` and `prior_knowledge`
// and holds it to its `leaves`; the judge judges TAKEN and LEFT; the retired reader state and ledger
// keys are refused by name at every read; and what the reader has been told is derived from the Leg
// order alone, each Leg's Roles from the Brief's structure.
{
  const planPrompts = okPrompts.filter(isPlan);
  if (!planPrompts.length || !planPrompts.every((p) => critOf(p, "BIND").includes("`takes`") && critOf(p, "BIND").includes("`the_reader_has_been_told`"))) {
    fails.push("(u) a plan prompt's BIND does not bind a Move by its `takes` against what the reader has been told (kogaki#1777)");
  }
  if (!planPrompts.every((p) => critOf(p, "LEAVE").includes("`leaves`") && critOf(p, "LEAVE").includes("`leaves_for_next_leg`"))) {
    fails.push("(u) a plan prompt carries no LEAVE holding a bound Move's `leaves` to a later paragraph or the Leg's `leaves_for_next_leg` (kogaki#1701)");
  }
  if (!planPrompts.every((p) => critOf(p, "PARAGRAPHS").includes("`paragraphs_at_most`"))) fails.push("(u) a plan prompt carries no PARAGRAPHS bounding the Leg's paragraphs (kogaki#1777)");
  if (planPrompts.some((p) => critOf(p, "OWE"))) fails.push("(u) a plan prompt still carries the OWE criterion, retired (kogaki#1701)");
  const judgePrompts = okPrompts.filter(isJudge);
  if (!judgePrompts.length || !judgePrompts.every((p) => critOf(p, "TAKEN") && critOf(p, "LEFT"))) fails.push("(u) a judge prompt does not judge TAKEN and LEFT (kogaki#1701)");
  for (const gone of ["PRECONDITION", "POSTCONDITION", "PROMISE KEPT"]) {
    if (judgePrompts.some((p) => critOf(p, gone))) fails.push(`(u) a judge prompt still judges ${gone}, retired (kogaki#1701)`);
  }
  // THE RETIRED KEYS, REFUSED BY NAME AT EVERY READ.
  const unit = (top, entry) => ({ version: "1", leg_id: "s1", ...top, paragraphs: [
    { ...entry, paragraph_waypoints: [{ point: "a point.", serves: ["L1"], cast: {} }] },
    { join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] });
  const record = (l, entry) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", ...l, paragraphs: [{ ...entry, paragraph_waypoints: [{ point: "a point.", serves: ["L1"], cast: {} }] },
      { join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] },
    { leg_id: "s2", paragraphs: [{ paragraph_waypoints: [{ point: "a point.", serves: ["L2"], cast: {} }] }] }] });
  const VALUES = { reader_state_before: { knowledge: "before." }, reader_state_after: { knowledge: "after." },
    obligations: [{ opened_by: 1, items: [{ item: "which edit survives?", closed_by: 2 }] }], discharges: [{ obligation: 1, by: 1 }] };
  for (const key of ["reader_state_before", "reader_state_after", "obligations", "discharges"]) {
    const named = `carries \`${key}\`, retired from the ParagraphPlan (kogaki#1701)`;
    for (const [where, v, r] of [
      ["the Leg", validateParagraphPlanUnit(unit({ [key]: VALUES[key] }, {}), inputs(), "leg-1").error || "", paragraphPlanShapeRefusal(record({ [key]: VALUES[key] }, {}), "plan.yaml", legs) || ""],
      ["a paragraph", validateParagraphPlanUnit(unit({}, { [key]: VALUES[key] }), inputs(), "leg-1").error || "", paragraphPlanShapeRefusal(record({}, { [key]: VALUES[key] }), "plan.yaml", legs) || ""]]) {
      if (!v.includes(named)) fails.push(`(u) the plan call's validator did not refuse \`${key}\` on ${where} by name: ${v || "no refusal"}`);
      if (!r.includes(named) || !r.includes("leg s1")) fails.push(`(u) the plan reader did not refuse \`${key}\` on ${where} by name: ${r || "no refusal"}`);
      if (where !== "the Leg" && !r.includes("paragraph 1")) fails.push(`(u) the plan reader's refusal of \`${key}\` does not name the paragraph: ${r}`);
    }
  }
  // WHAT THE READER HAS BEEN TOLD WHEN A LEG BEGINS: the relation each Leg before it states, in order.
  const three = [{ leg_id: "a", relation: "r1", text: "A holds." }, { leg_id: "b", text: "B holds." }, { leg_id: "c", text: "C holds." }];
  if (JSON.stringify(toldBefore(three, 0)) !== "[]" || JSON.stringify(toldBefore(three, 2)) !== JSON.stringify([{ leg_id: "a", relation: "r1", text: "A holds." }, { leg_id: "b", text: "B holds." }])) {
    fails.push(`(u) toldBefore does not derive what the Legs before a Leg state from their order: ${JSON.stringify(toldBefore(three, 2))}`);
  }
  const structure = { roles: [{ id: "gate", name: "the gate", context: "a check." }, { id: "crowd", context: "arrivals." }, { id: "other", context: "unrelated." }],
    relations: [{ id: "r1", between: ["gate", "crowd"], holds: "{gate} lets {crowd} through." }],
    higher_order: [{ id: "h1", relates: ["r1"], holds: "it holds." }] };
  const roles = (id) => legRoles(structure, id).map((x) => x.id);
  if (JSON.stringify(roles("r1")) !== '["gate","crowd"]' || JSON.stringify(roles("h1")) !== '["gate","crowd"]' || JSON.stringify(roles(undefined)) !== "[]") {
    fails.push(`(u) legRoles does not read a relation's Roles, and a higher-order relation's through the relations it relates: ${JSON.stringify([roles("r1"), roles("h1")])}`);
  }
  const opts = planLegOptions(legs.map((l) => ({ ...l, move: "absent_leg_move" })), null, "knows what an installer is.");
  const pl = planLeg(legs[1], opts[1]);
  if (opts.some((o) => o.error || o.leaves.length) || JSON.stringify(pl.the_reader_has_been_told) !== JSON.stringify([{ leg_id: "s1", text: S1_TEXT }])
    || pl.prior_knowledge !== "knows what an installer is." || "waypoints" in pl || "stands_to_be_taken_up" in pl) {
    fails.push(`(u) planLeg does not hand a Leg what the Legs before it state and the Persona's prior knowledge, reading no Move of a Leg's: ${JSON.stringify(pl)}`);
  }
  // NO RECORD REACHES THE PACKET (kogaki#1584): the template's waypoints block names no Promise or Keeps line.
  const t = readFileSync("src/packet-template.md", "utf8");
  const block = t.slice(t.indexOf("## The waypoints this Leg takes the reader through"), t.indexOf("{{waypoints}}"));
  if (block.includes("*Promise:*") || block.includes("*Keeps:*")) fails.push("(u) src/packet-template.md's waypoints block still names a Promise or Keeps line");
}

// (d) A Brief whose Leg carries `waypoints`, or no `text`, is refused at start by name (kogaki#1777).
for (const [label, bad, want] of [
  ["a Brief Waypoint", legs.map((l, i) => (i === 0 ? { ...l, waypoints: [{ point: "A point.", serves: ["L1"], case: "own" }] } : l)), "carries `waypoints`"],
  ["no text", legs.map((l, i) => (i === 1 ? { ...l, text: undefined } : l)), "carries no `text`"]]) {
  const dir = join(root, `refused-${label.replace(/\s+/g, "-")}`, "theses", "plan-brief");
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, briefText(bad));
  const r = spawnSync(process.execPath, [join(repo, "src", "paragraph-plan.mjs"), "start", "--brief", briefPath, "--moves-dir", moves],
    { cwd: repo, encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: "/bin/false", KOGAKI_SETTINGS: stageSettings } });
  if (r.status === 0 || !(r.stderr || "").includes(want) || !(r.stderr || "").includes("kogaki#1777")) {
    fails.push(`(d) start did not refuse a Brief whose Leg carries ${label} by name: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
  }
  if (readdirSync(dir).includes(PARAGRAPH_PLAN_FILE)) fails.push(`(d) a ParagraphPlan file was written for a Brief whose Leg carries ${label}`);
}

// (e) THE SKILL NAMES ONLY WHAT THE HARNESS HAS.
{
  const skill = ".claude/skills/paragraph-plan/SKILL.md";
  const text = existsSync(skill) ? readFileSync(skill, "utf8") : "";
  const named = [...text.matchAll(/node (src\/[\w./-]+\.mjs) (\w+)/g)].map((m) => [m[1], m[2]]);
  if (!named.length) fails.push(`(e) ${skill} names no Harness entry point`);
  for (const [mod, sub] of named) {
    if (!existsSync(mod)) fails.push(`(e) ${skill} names ${mod}, which this tree does not carry`);
    else if (!readFileSync(mod, "utf8").includes(`case "${sub}":`)) fails.push(`(e) ${skill} names \`${mod} ${sub}\`, which its CLI does not handle`);
  }
  if (!["start", "status", "await"].every((sub) => named.some(([m, x]) => m === "src/paragraph-plan.mjs" && x === sub))) {
    fails.push(`(e) ${skill} does not name start, status and await on src/paragraph-plan.mjs`);
  }
}

// (s) THE ROWS ARE NAMED CRITERIA UNDER A BOUND (kogaki#1511).
{
  const table = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));
  const bound = table.criteria || {};
  const axes = readAxes().axes;
  const names = { paragraph_plan_unit: bound.paragraph_plan_unit, paragraph_plan_judge_unit: axes.map((a) => a.id) };
  if (Object.hasOwn(bound, "paragraph_plan_judge_unit")) fails.push("(s) `criteria` names judge criteria beside the axis registry");
  const tree = criteriaFailures(table);
  if (tree.length) fails.push(`(s) the tree's rows fail their bound: ${tree.join("; ")}`);
  for (const [key, prompt] of [["paragraph_plan_unit", okPrompts.find(isPlan)], ["paragraph_plan_judge_unit", okPrompts.find(isJudge)]]) {
    const got = prompt ? criteriaOf(prompt) : [];
    if (!got.length || JSON.stringify(got.map((c) => c.name)) !== JSON.stringify(names[key])) {
      fails.push(`(s) the ${key} prompt the job sent carries ${JSON.stringify(got.map((c) => c.name))}, not ${JSON.stringify(names[key])}`);
    }
    for (const c of got) {
      const n = c.text.split(/\s+/).length;
      if (!/[.]$/.test(c.text) || /[.;!?]\s/.test(c.text) || n > bound.words_max) fails.push(`(s) the ${key} prompt's ${c.name} is not one sentence within ${bound.words_max} words (${n})`);
    }
  }
  const grown = (edit) => { const t = JSON.parse(JSON.stringify(table)); edit(t); return criteriaFailures(t).join("; "); };
  const line = (t, name, f) => {
    const row = t.paragraph_plan_judge_unit;
    if (row.axes_file) { row.judgment_point = row.judgment_point.replace("{{axes}}", axes.map((a) => `- ${a.id}: ${a.sentence}`).join("\n")); delete row.axes_file; }
    const jp = row.judgment_point;
    const at = jp.indexOf(`\n- ${name}: `) + 1;
    const end = jp.indexOf("\n", at);
    t.paragraph_plan_judge_unit.judgment_point = jp.slice(0, at) + f(jp.slice(at, end)) + jp.slice(end);
  };
  for (const [what, edit, want] of [
    ["a second sentence", (t) => line(t, axes[0].id, (l) => `${l} As on one run, a restated operation does not fit.`), `${axes[0].id} is not one sentence`],
    ["an Issue number", (t) => line(t, axes[axes.length - 1].id, (l) => l.replace(/[.]$/, " (kogaki#1477).")), `${axes[axes.length - 1].id} carries an Issue number`],
    ["a word over the bound", (t) => { t.criteria.words_max = 20; }, "over the bound of 20"],
    ["a criterion the registry does not name", (t) => line(t, axes[axes.length - 1].id, (l) => `${l}\n- SEVENTH: The join is judged.`), '"SEVENTH"]'],
    ["text around the criteria", (t) => { t.paragraph_plan_judge_unit.judgment_point += " Judge carefully.".repeat(300); }, "rendered judgment point runs"],
    ["a second sentence in a shared block", (t) => { t.shared_text.operation_is_performed += " It is never content."; }, "shared text operation_is_performed is not one sentence"]]) {
    const why = grown(edit);
    if (!why.includes(want)) fails.push(`(s) a judge row grown by ${what} is not refused naming it: ${why || "no refusal"}`);
  }
}

// (x) EVERY DESIGN REFUSAL, BY NAME, AT EVERY READ (kogaki#1639, kogaki#1777): the plan reader (what
// /draft and the Proof Sheet open) and the plan call's validator, the raw ones.
{
  const s1 = { ...legs[0], introduces: [TERM] };
  const L = [s1, legs[1]];
  const P = (n, over = {}) => ({ ...fillParagraph({ ...(n > 1 ? { join: "contrast" } : {}),
    paragraph_waypoints: [{ point: "a point.", serves: n === 1 ? ["L1"] : ["L1", "L2"], cast: {} }] }, n - 1, s1), ...over });
  const leg1 = (w1, w2, top = {}) => ({ leg_id: "s1", move: "p1", ...top, paragraphs: [P(1, w1), P(2, w2)] });
  const rec = (w1, w2, top) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0".repeat(64) },
    legs: [leg1(w1, w2, top), { leg_id: "s2", move: "p1", paragraphs: [fillParagraph({ paragraph_waypoints: [{ point: "a point.", serves: ["L2"], cast: {} }] }, 0, legs[1])] }] });
  const unit = (w1, w2, top) => ({ version: "1", rationale: "the Move carries the Leg's relation.", ...leg1(w1, w2, top) });
  const planned = inputs(L);
  const read = (w1, w2, top, opts = {}) => rawPlanShapeRefusal(rec(w1, w2, top), "plan.yaml", L, { bound: BOUND, library: new Set(["p1", "p4"]), ...opts }) || "";
  const valid = (w1, w2, top) => rawValidateUnit(unit(w1, w2, top), planned, "leg-1").error || "";
  if (read({}, {}) !== "") fails.push(`(x) the plan reader refused a well-formed record: ${read({}, {})}`);
  if (valid({}, {}) !== "") fails.push(`(x) the validator refused a well-formed answer: ${valid({}, {})}`);
  const cases = [
    ["a paragraph naming a Move", {}, { move: "p1" }, {}, ["paragraph 2", "carries `move`", "kogaki#1777"]],
    ["a Leg with no `move`", {}, {}, { move: "" }, ["carries no `move`", "kogaki#1777"]],
    ["a Leg `move` naming no Move in the library", {}, {}, { move: "p-nowhere" }, ["\"p-nowhere\"", "names no Move in the library"]],
    ["a Leg carrying `waypoints`", {}, {}, { waypoints: [] }, ["carries `waypoints`", "kogaki#1777"]],
    ["a written `reader_state_before`", {}, { reader_state_before: { knowledge: "after 1." } }, {}, ["paragraph 2", "carries `reader_state_before`, retired from the ParagraphPlan (kogaki#1701)"]],
    ["an undeclared key", {}, { segments: [] }, {}, ["paragraph 2", "carries `segments`"]],
    ["a Move field beside the id", {}, { before: "knowledge: x." }, {}, ["paragraph 2", "carries `before`"]],
    ["a term the Leg does not introduce", {}, { introduces: [{ term: "other", meaning: "a meaning." }] }, {}, ["paragraph 2", "introduces \"other\"", "does not introduce"]],
    ["a Leg term introduced by two paragraphs", {}, { introduces: [TERM] }, {}, ["\"kit stamp\"", "introduced by paragraphs 1 and 2"]],
    ["a dependency on this paragraph", {}, { depends_on: [2] }, {}, ["paragraph 2", "depends on 2", "only on an earlier paragraph"]],
    ["a dependency on a later paragraph", { depends_on: [2] }, {}, {}, ["paragraph 1", "depends on 2", "none before this one"]],
    ["a dependency on another Leg", {}, { depends_on: ["s2"] }, {}, ["paragraph 2", "depends on \"s2\"", "another Leg"]],
    ["a re-activation of this paragraph", {}, { "re-activate": ["2 term kit stamp"] }, {}, ["paragraph 2", "re-activates \"2 term kit stamp\"", "earlier paragraph"]],
    ["a re-activation from another Leg", {}, { "re-activate": ["s2 claim L2 as the copy is the installer's."] }, {}, ["paragraph 2", "names \"s2\"", "another Leg"]],
    ["a re-activated term the paragraph does not introduce", { introduces: [TERM] }, { "re-activate": ["1 term other"] }, {}, ["paragraph 2", "paragraph 1 does not introduce \"other\""]],
    ["a re-activated claim the paragraph does not stand on", {}, { "re-activate": ["1 claim L2 as the copy is refreshed."] }, {}, ["paragraph 2", "paragraph 1 does not stand on \"L2\""]],
    ["a material no Claim of its Leg names", { materials: ["L9"] }, {}, {}, ["paragraph 1", "names \"L9\" in `materials`", "no Claim of its Leg names"]],
    ["a written `reader_state_after`", {}, { reader_state_after: { knowledge: "after 2." } }, {}, ["paragraph 2", "carries `reader_state_after`, retired from the ParagraphPlan (kogaki#1701)"]],
    ["the retired `why`", {}, { why: "its before holds the state." }, {}, ["paragraph 2", "`why`"]],
  ];
  for (const [what, w1, w2, top, wants] of cases) {
    for (const [reader, got] of [["plan reader", read(w1, w2, top)], ["validator", valid(w1, w2, top)]]) {
      if (!got.includes("s1") || !wants.every((x) => got.includes(x))) fails.push(`(x) the ${reader} did not refuse ${what} by name: ${got || "no refusal"}`);
    }
  }
  // A LEG OVER `brief.paragraphs_per_leg` (kogaki#1777): three paragraphs over the bound of two.
  const over = { ...rec({}, {}), legs: [{ ...leg1({}, {}), paragraphs: [P(1), P(2), P(3)] }, rec({}, {}).legs[1]] };
  const overRead = rawPlanShapeRefusal(over, "plan.yaml", L, { bound: BOUND }) || "";
  const overValid = rawValidateUnit({ ...unit({}, {}), paragraphs: [P(1), P(2), P(3)] }, planned, "leg-1").error || "";
  for (const [reader, got] of [["plan reader", overRead], ["validator", overValid]]) {
    if (!got.includes("s1") || !got.includes("carries 3 paragraphs, over the bound of 2") || !got.includes("brief.paragraphs_per_leg")) {
      fails.push(`(x) the ${reader} did not refuse a Leg over brief.paragraphs_per_leg by name: ${got || "no refusal"}`);
    }
  }
  // Without a library open, the plan reader checks the id's presence and leaves its existence to a read
  // that has the library (the validator and the Proof Sheet): /draft opens no Move (kogaki#1311).
  const noLib = rawPlanShapeRefusal(rec({}, {}, { move: "p-nowhere" }), "plan.yaml", L, { bound: BOUND });
  if (noLib !== null) fails.push(`(x) the plan reader with no library open refused a Move id it cannot check: ${noLib}`);
  const ok = read({ introduces: [TERM] }, { introduces: [], "re-activate": ["1 term kit stamp", "1 claim L1 as the installer writes into the tree."] });
  if (ok !== "") fails.push(`(x) the plan reader refused a well-formed re-activation: ${ok}`);
  // A LEG TERM MAY BE PLACED NOWHERE (kogaki#1663); one introduced by two paragraphs is refused.
  const R = [{ ...s1, introduces: [TERM, ...REFERENTS] }, legs[1]];
  const bare = rawPlanShapeRefusal(rec({ introduces: [] }, {}), "plan.yaml", R, { bound: BOUND });
  const bareUnit = rawValidateUnit(unit({ introduces: [] }, {}), inputs(R), "leg-1").error;
  if (bare !== null || bareUnit) fails.push(`(x) a Leg term introduced by no paragraph was refused: ${bare || bareUnit}`);
  const twiceRef = rawValidateUnit(unit({ introduces: [TERM, REFERENTS[0]] }, { introduces: [REFERENTS[0]] }), inputs(R), "leg-1").error || "";
  if (!twiceRef.includes("\"installer\"") || !twiceRef.includes("introduced by paragraphs 1 and 2")) fails.push(`(x) a Leg term introduced by two paragraphs was not refused by name: ${twiceRef || "no refusal"}`);
}

// (z) THE MAPPER IN PARAGRAPHPLAN (kogaki#1734, kogaki#1777): one reading on the Leg's relation, the
// bind, one grounding for its one Move, the Waypoints call in the table's expressions.
{
  stageSettings = settingsWith(true);
  const mapLegs = [leg("m1", "A gate only lets through what of the crowd reaches it.", [{ strand: "L1", proposition: C1 }], [
    { point: "A rule set only sees what reaches the checks it was written for.", serves: ["L1"] },
    { point: "The installer only sees the edits that reach the copy it writes.", serves: ["L1"] }])];
  const r = runStage("mapper", mapLegs, "mapper");
  stageSettings = settingsWith(false);
  const planning = (p) => isPlan(p) || isJudge(p) || isSite(p);
  const readings = r.prompts.filter((p) => !planning(p) && p.includes('"proposition"'));
  const groundings = r.prompts.filter((p) => !planning(p) && !p.includes('"proposition"') && p.includes('"segments"'));
  const plans = r.prompts.filter(isPlan);
  if (!existsSync(r.planPath)) fails.push(`(z) the Mapper job wrote no plan file: ${r.said.slice(0, 800)}`);
  if (readings.length !== 1 || !String(inputOf(readings[0]).proposition).startsWith(mapLegs[0].text) || !String(inputOf(readings[0]).proposition).includes(C1)) {
    fails.push(`(z) the Leg was read ${readings.length} time(s), not once on its text and its Claims`);
  }
  if (groundings.length !== 1 || !inputOf(groundings[0]).structure || !Array.isArray(inputOf(groundings[0]).segments)) {
    fails.push(`(z) ${groundings.length} grounding call(s), not one for the Leg's one bound Move over its structure`);
  }
  const bind = plans[0] ? inputOf(plans[0]).leg_you_must_plan : {};
  if (!bind.structure || !Array.isArray(bind.structure.roles) || bind.table) fails.push(`(z) the bind call's Leg does not carry its structure alone: ${JSON.stringify(bind).slice(0, 300)}`);
  const confined = plans[1] ? inputOf(plans[1]).leg_you_must_plan : {};
  if (confined.move !== "p1" || !confined.table || !confined.structure) fails.push(`(z) the Waypoints call does not carry the Leg's Move, table and structure: ${JSON.stringify(confined).slice(0, 300)}`);
  if (!critOf(plans[0] || "", "MAP").includes("higher-order relation")) fails.push("(z) the plan row carries no MAP criterion naming the structure's relations");
  const job = JSON.parse(readFileSync(join(r.runDir, "reader-path-job.json"), "utf8"));
  const refusals = (job.units[0].refusals || []).join("\n");
  if (!/Leg m1, paragraph 2: .*Role id "gate".*"the installer"/.test(refusals)) {
    fails.push(`(z) a Waypoint carrying a Role id was not refused naming the paragraph, the Role and its expression: ${refusals || "no refusal"}`);
  }
  if (existsSync(r.planPath)) {
    const plan = parseYaml(readFileSync(r.planPath, "utf8"));
    const files = (plan.mapping && plan.mapping.files || []).map((f) => f.path);
    if (JSON.stringify(files) !== JSON.stringify(["m1/structure.yaml", "m1/table.yaml"])) fails.push(`(z) the plan's Mapping Record is not one structure and one table: ${JSON.stringify(files)}`);
    const t1 = parseYaml(readFileSync(join(r.planPath, "..", "mapping", "m1", "table.yaml"), "utf8"));
    if (t1.move !== "p1" || t1.base.domain !== "the installer's tree") fails.push(`(z) table.yaml is not the Leg's table under its Move: ${JSON.stringify(t1)}`);
    const pws = plan.legs[0].paragraphs.map((e) => e.paragraph_waypoints.map((p) => p.point).join(" "));
    if (!pws[1] || !pws[1].includes("the installer") || /\bgate\b/.test(pws[1])) fails.push(`(z) the written Waypoints are not the table's expressions: ${JSON.stringify(pws)}`);
  }
  const report = spawnSync(process.execPath, ["src/workflow/job-report.mjs", r.runDir], { cwd: repo, encoding: "utf8" });
  for (const unit of ["leg-1/reading", "leg-1/grounding"]) {
    if (!(report.stdout || "").includes(`unit ${unit}:`)) fails.push(`(z) the job report does not list the Call Records of ${unit}: ${report.stdout}${report.stderr}`);
  }
  const replay = spawnSync(process.execPath, ["src/workflow/replay.mjs", join(r.runDir, "calls", "leg-1", "reading", "1"), "--mode", "model"],
    { cwd: repo, encoding: "utf8", env: { ...process.env, PP_FIXTURE_DIR: r.dir } });
  if (replay.status !== 0 || !(replay.stdout || "").startsWith("model: passed")) fails.push(`(z) replay did not re-run the reading Call Record: ${replay.stdout}${replay.stderr}`);
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan — the stage writes paragraph-plan.yaml beside the Brief, each Leg its one bound Move's id and at most brief.paragraphs_per_leg paragraphs, each paragraph its schema, its join and its Waypoints and nothing else of the Move, no reader state and no ledger (kogaki#1639, kogaki#1701, kogaki#1777); the plan call is handed the Leg's text and Claims, what the Legs before it state derived from the Leg order, the Persona's prior knowledge and the paragraph bound, and the judge the bound Move's takes, leaves, segments and breaks beside them; a judge refusal is repaired at its paragraph under the Leg's Move, and a Leg no Move fits is asked again whole and stops naming the Leg; a Move with no segments stops the stage by name (kogaki#1412); the Move record is read as YAML (kogaki#1413) and admitted by the ingest (kogaki#1418); a Brief whose Leg carries waypoints or no text is refused at start; the join is a typed relation read at every read and rendered as its Opens-from line (kogaki#1411, kogaki#1477); performs, cast and manner are read as their rules state (kogaki#1448, kogaki#1485, kogaki#1585, kogaki#1695); a Waypoint performs its own Segment's operation (kogaki#1605); both rows are named one-sentence criteria under the bound (kogaki#1511, kogaki#1533); every design refusal, a paragraph naming a Move and a Leg over the bound among them, is refused by name at every read; and with the Mapper on, a Leg reads one structure, grounds one table for its one Move and writes its Waypoints in its expressions (kogaki#1734); the skill names only entry points the Harness has.");
JS
