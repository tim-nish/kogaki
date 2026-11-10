#!/usr/bin/env bash
# check-paragraph-plan — the ParagraphPlan stage generates every Leg Waypoint's
# Paragraph Waypoints after the Brief, and no Move information leaves it
# (kogaki#1375, owner decision 2026-10-14).
#
# WHAT THIS COVERS, each driven end to end through `node src/paragraph-plan.mjs
# start|await` over a real Brief record, a scratch Move library and a FAKE judge
# binary this member writes (`KOGAKI_JUDGE_CLI`) — never the actual `claude` CLI:
#   (a) a job whose every Leg binds a Move and is judged `fits` writes
#       `paragraph-plan.yaml` beside the Brief, naming the Brief by path and
#       content hash, holding `point` and `serves` per Paragraph Waypoint and
#       NOTHING OF A MOVE — no id, no Segment, no field; the Brief is
#       byte-for-byte unchanged; which Move was bound stays in the run
#       directory's `paragraph-plan-bindings.json`. A `does-not-fit` from the
#       judge on a first Round is put verbatim into the site prompt of the
#       Leg Waypoint it names, beside the refused entry, with its bound Move and
#       after-state held (kogaki#1642); the plan call is handed the Move's `segments` and `breaks`
#       beside the Leg Waypoint's own `point`, `serves` and `next_point` and
#       the persona, and NO Claim proposition (kogaki#1382); the judge call
#       is handed the four roles -- `before`, `after`, `segments` and
#       `breaks` (kogaki#1378) -- and neither call is handed a `technique`
#       (kogaki#1412).
#   (b) a Leg Waypoint no Move fits (`move: null`) refuses the unit
#       `no_paragraph_move_fits` and is asked again at that Leg Waypoint until
#       `brief.unit_rounds` is spent there (kogaki#1642); the stage then stops
#       naming the Leg and the Waypoint, writes
#       no ParagraphPlan file, and leaves the Brief unchanged.
#   (c) a library holding a Move with no `segments` stops the stage naming the
#       Move and `segments` (kogaki#1412); nothing is defaulted and no
#       ParagraphPlan file is written.
#   (d) `start` refuses a Brief whose Leg Waypoint carries `move` or `segments`,
#       by name.
#   (e) every Harness path and subcommand `.claude/skills/paragraph-plan/SKILL.md`
#       names exists — the criterion on which the skill file is tracked.
#   (f) a Move carrying `technique` and no `segments` is refused the same way:
#       `technique` is retired and is no fallback order (kogaki#1412,
#       retiring the fallback kogaki#1378 gave).
#   (g) a bound Move carrying three `segments` yields a plan record with
#       three Paragraph Waypoints under its Leg Waypoint, and the rendered
#       Packet carries the three indented lines under the one point, under a
#       header that renders each line as the sentences it is and adds none
#       (kogaki#1694, retiring kogaki#1381's licence to reword).
#   (h) a plan prompt built over a Move with three Segments carries every
#       Segment's number, `operation`, `relation` and `manner` as separate fields (kogaki#1414,
#       reverting the withholding of kogaki#1403), the plan row states that a
#       `operation` is an operation to perform and never a point to state, and a
#       plan-call answer whose Paragraph Waypoint restates a Segment's `operation` is
#       refused by the judge, put into the next Round's prompt verbatim, same
#       as any other does-not-fit.
#   (i) RETIRED at kogaki#1533: the judge's per-Segment axis (OPERATION
#       PERFORMED) was removed on the bench of 2026-10-23, so no judge refusal of
#       an unrelated first point is asserted; the count of Paragraph Waypoints
#       per Segment is the validator's, asserted by check-paragraph-plan-axes.
#   (l) THE JOIN IS A TYPED RELATION (kogaki#1411, kogaki#1477): the plan row
#       asks the planner to choose a `join` on every Leg Waypoint after the
#       first and names the closed set with one definition per word, each read
#       from `JOIN_TYPES` (src/compose/record.mjs); the judge row carries the
#       set (its JOIN axis was removed on the bench of 2026-10-23, kogaki#1533);
#       neither row carries the
#       retired "names no noun phrase" test. A plan whose join answers a
#       sentence is refused by the plan call's validator naming the entry, the
#       refusal reaching the next plan Round, after which the stage finishes
#       with a type word. Whether a LIVE planner chooses the right word is the
#       model's.
#   (m) THE JOIN'S PLACE AND SET ARE READ (kogaki#1411, kogaki#1477): the plan
#       reader refuses a missing, an empty and a misplaced join, a sentence and
#       a word outside the set, each by name; the plan call's validator refuses
#       the same; and the Brief's Leg Waypoint rule refuses `join` on a Brief.
#   (n) THE JOIN REACHES THE WRITER (kogaki#1411): `waypointLines` renders
#       `*Opens from:* <type>` under its Leg Waypoint and before its Paragraph
#       Waypoints, and nothing for a Leg Waypoint without one; the Packet
#       template carries the Opens-from instruction in the waypoints block and
#       the relation word in its Move-boundary comment.
#   (o) A SEGMENT'S RELATION IS NEVER CONTENT (kogaki#1446): the plan row's
#       ORDER states a Segment's `relation` is never stated in a Paragraph Waypoint.
#       The judge's axis for it was removed on the bench of 2026-10-23
#       (kogaki#1533), so no judge refusal is asserted.
#   (p) A SEGMENT THAT ACTS ON THE READING CARRIES `performs` (kogaki#1448): a
#       fake planner bound to p5, whose Segment 1 announces a simplification,
#       answers a `performs` Paragraph Waypoint on Segment 1 and a `point` one
#       after it; the plan file is written with that `performs` entry, the
#       judge's input carries it, and the plan row carries the form. The plan reader refuses a Leg Waypoint none of whose
#       Paragraph Waypoints carries a `point`, and a `performs` entry carrying
#       any key beside it, and names a refused `point` entry by its own place,
#       counting the `performs` entry before it. And a `performs` entry
#       names the operation alone (kogaki#1485): the rendered plan row carries
#       "the operation alone" and "no clause stating what the reader then
#       takes" in FORM, the judge's PERFORMS IS BARE carries "the reader's
#       resulting reading", and a
#       fake planner bound to p5 whose `performs` entry carries a "so that"
#       clause is refused by the fake judge -- which refuses only where the
#       row it was handed carries that sentence -- naming the entry and the
#       clause; the refusal reaches the next plan Round, whose bare-operation
#       `performs` fits and is written. Whether a LIVE judge refuses it is the
#       model's.
#   (q) A PARAGRAPH WAYPOINT EXPLAINS ITS LEG WAYPOINT (kogaki#1632): the
#       rendered plan prompt's DIVIDE, EXPLAIN, CONSISTENT and NO NEW FACT carry
#       the Issue's sentences.
#   (r) A PARAGRAPH MOVE IS BOUND BY WHAT IT TAKES UP (kogaki#1663, kogaki#1701): over a
#       Leg handed three terms the Brief record does not carry (a Leg introduces
#       no term, kogaki#1768), the rendered plan prompt carries
#       `terms_this_leg_introduces` empty beside the persona and
#       no `terms_this_leg_coins`, its BIND step carries "whose `takes` entries
#       are each met" and "the `what` by sense" (kogaki#1701) and none of
#       "toward `next_point`", "defines, names or grounds", "contradicts, on no
#       dimension it declares" or "exclusion, never ranking", the judge is
#       handed no term list and no TERM MEANING axis, and a Leg introducing
#       nothing is handed an empty list. The first Leg Waypoint binds p1, a
#       Move with no Segment that defines, names or grounds, introduces
#       nothing, and the plan is admitted and written.
#   (s) THE ROWS ARE NAMED CRITERIA UNDER A BOUND (kogaki#1511): the plan and
#       judge prompts (a)'s job sent carry, as `- <NAME>: <sentence>` lines, the
#       planner's steps as the workflow file's `criteria` names them and the
#       judge's axes as src/paragraph-plan-axes.json names them (kogaki#1533),
#       and nothing else names judge criteria, each one sentence within `criteria.words_max`
#       words, the whole rendered judgment point within `point_words_max`; and
#       `criteriaFailures`, which `start` refuses on, refuses a judge row grown by
#       a second sentence, an Issue number inside a criterion, a criterion over
#       the bound, a criterion the table does not name, text added around the
#       criteria, or a second sentence in a shared block. The
#       fake judge keys every refusal above on the named criterion that carries it.
#   (t) A SEGMENT'S MANNER REACHES THE PLAN CALL AND NOTHING WRITTEN FROM IT
#       (kogaki#1585, owner decision 2026-10-25, reverting kogaki#1510's copy): the
#       plan call is handed each Segment's `manner` beside `operation` and
#       `relation`; a job binding a Move whose Segment carries a `manner` hands
#       that `manner` to its plan call -- read first, so the absence is read over
#       a run known to have had one to drop -- and writes a plan file holding no
#       `manner` on any Paragraph Waypoint; a planner answer carrying `manner` is
#       refused; the plan reader refuses a plan file carrying `manner` on a
#       `point` or a `performs` Paragraph Waypoint, naming it; and
#       `waypointLines` renders no Manner label for a Paragraph Waypoint object
#       that carries one.
#   (u) WHAT A PARAGRAPH TAKES UP AND LEAVES IS ITS MOVE'S (kogaki#1701): the
#       plan row's BIND binds a Move by its `takes` against what stands to be
#       taken up, its LEAVE holds the Move to its `leaves`, and no row names
#       OWE; the judge judges TAKEN and LEFT and no PRECONDITION,
#       POSTCONDITION or PROMISE KEPT; `reader_state_before`,
#       `reader_state_after`, `obligations` and `discharges` on a Leg or an
#       entry are refused by name by the plan call's validator and the plan
#       reader; what stands to be taken up at a later Leg Waypoint is the first
#       one's list plus what each paragraph before leaves, less what one takes
#       up by the same kind and `what`; the first Leg's first Leg Waypoint is
#       handed the Persona's prior knowledge; a Brief Leg binding a Move the
#       library does not hold stops at start by name; and the template names
#       no Promise or Keeps line (kogaki#1584).
#   (w) A PARAGRAPH WAYPOINT PERFORMS ITS OWN SEGMENT'S OPERATION ALONE
#       (kogaki#1605): the judge row carries OWN STEP; bound to p7,
#       whose Segment 2 compresses Segment 1's definition, a first plan whose
#       first Paragraph Waypoint already carries the compressed form is refused by
#       the fake judge -- which refuses only where the row it was handed carries
#       OWN STEP -- naming Paragraph Waypoints 1 and 2 and Segment 2; the refusal
#       reaches the next Round, whose compression is held to the second
#       Paragraph Waypoint, fits, and is written. Whether a LIVE judge refuses it
#       is the bench's measurement (src/paragraph-plan-axes.json).
#   (y) THE CAST IS A CLOSED MAP (kogaki#1695, owner decision 2026-11-06):
#       the plan reader and the plan call's validator accept `cast:
#       { terse: true }` and `cast: {}` on a `point` Paragraph Waypoint, and
#       refuse `{ brief: true }` naming `brief`, a non-boolean value naming
#       its key, a cast that is not a map, a point Paragraph Waypoint with no
#       cast naming it, and a cast on a `performs` Paragraph Waypoint naming
#       it; case (a)'s fake planner sets `{ terse: true }` on Leg s1's points
#       and `{}` on Leg s2's, the written file carries each, and the plan
#       prompt's CAST asks for the cast and names every key of CAST_KEYS
#       with its definition.
#   (z) THE MAPPER IN PARAGRAPHPLAN (kogaki#1734): with `paragraph_plan.mapper`
#       true, a Leg of one `apart` Leg Waypoint and its successor reads one
#       structure (the successor takes its predecessor's), binds, grounds one
#       table per bound Move -- the successor's under `own` with the `apart`
#       table as `prior_tables` -- and writes its Paragraph Waypoints in a plan
#       call carrying each Move and table; a Paragraph Waypoint carrying a Role id
#       is refused naming the Leg Waypoint, the Role and its expression; the plan
#       names a Mapping Record of two tables and one structure; the job report
#       lists the reading and grounding Call Records, and `replay` re-runs one.
#       Every other case runs with the setting false.
#   (k) THE INGEST'S MOVE IS READ (kogaki#1418): `p1`, the Move case (a) and
#       its neighbours bind, is admitted by `tools/move_ingest.py`'s write gate
#       (`save_accepted`, validating through the Adapter's src/move-validate.mjs)
#       rather than written directly, and the stage reads it without refusal.
#
# NOT COVERED, stated rather than implied: the `--tools ""` minimal environment
# and the call-limit stop are the shared supervisor's, held by
# checks/check-brief-reader-path-job.sh. /draft's read of the file beside the
# Brief end to end is checks/check-proof-sheet-leg-brief.sh's and
# checks/check-proof-sheet-leg-run.sh's. Whether the Paragraph Waypoints a live model
# writes are any good is the judge call's judgment, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

// A HANDED-IN HEARTBEAT (kogaki#1424): every fixture job this check starts, and every
// poll over its record, runs at 100 ms instead of the production table's 10 s; the
// table itself is untouched (`jobHeartbeatMs` in src/workflow/detached-job.mjs).
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap, waypointsRefusal, loadMoveContracts, moveContract, readerPersona } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { segmentsForPlanCall } = await import(pathToFileURL(join(repo, "src", "paragraph-plan.mjs")).href);
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE, NO_PARAGRAPH_MOVE_FITS, paragraphPlanShapeRefusal: rawPlanShapeRefusal,
  validateParagraphPlanUnit: rawValidateUnit, planLeg, introducedTerms, criteriaOf, criteriaFailures, readAxes,
  paragraphPlanUnitInput, paragraphPlanUnitPrompt, standsToBeTakenUp, PRIOR_KNOWLEDGE, planLegOptions } = await import(pathToFileURL(join(repo, "src", "paragraph-plan.mjs")).href);
const { parseYaml, stringifyYaml } = await import(pathToFileURL(join(repo, "src", "yaml.mjs")).href);
const { JOIN_TYPES, CAST_KEYS, PLAN_SCHEMA_KEYS, legIntroducedTerms } = await import(pathToFileURL(join(repo, "src", "compose", "record.mjs")).href);

// EVERY ENTRY CARRIES THE PARAGRAPH'S SCHEMA (kogaki#1639): the fixtures below that read a
// hand-built record or planner answer are about joins, manners, obligations and the like, so
// each entry they build is filled with a well-formed schema before the read -- the bound Move
// p1 unless given, `materials` its Leg Waypoint's `serves`, a purpose, `depends_on` the paragraph before, a rationale, no term and no
// re-activation -- and a retired `why` becomes the `rationale`. The schema's own refusals are
// read raw, in case (x), against the unfilled readers.
const fillEntry = (e, j, leg, total) => {
  if (!e || typeof e !== "object" || Array.isArray(e)) return e;
  const out = { ...e };
  if (Object.hasOwn(out, "why")) { if (!Object.hasOwn(out, "rationale")) out.rationale = out.why; delete out.why; }
  const n = j + 1;
  const serves = ((leg.waypoints || [])[j] || {}).serves || [];
  const terms = legIntroducedTerms(leg);
  const meaningOf = (term) => { const t = (leg.introduces || []).find((x) => x && typeof x === "object" && x.term === term); return (t && t.meaning) || `the meaning of ${term}.`; };
  const defaults = {
    move: "p1", materials: [...serves], purpose: `brings the reader to the point of paragraph ${n}.`,
    depends_on: n > 1 ? [n - 1] : [], rationale: "its before holds the state the paragraph before leaves.",
    introduces: n === 1 ? terms.map((term) => ({ term, meaning: meaningOf(term) })) : [], "re-activate": [],
  };
  for (const k of PLAN_SCHEMA_KEYS) if (k !== "journeys" && !Object.hasOwn(out, k)) out[k] = defaults[k];
  return out;
};
const paragraphPlanShapeRefusal = (record, rel, legs, opts) => {
  const r = record && typeof record === "object" && Array.isArray(record.legs) ? { ...record, legs: record.legs.map((l, i) => {
    const leg = legs[i]; return l && leg && Array.isArray(l.waypoints) ? { ...l, waypoints: l.waypoints.map((w, j) => fillEntry(w, j, leg, l.waypoints.length)) } : l;
  }) } : record;
  return rawPlanShapeRefusal(r, rel, legs, opts);
};
const validateParagraphPlanUnit = (unit, inputs, unitId) => {
  const leg = (inputs.legs || []).find((l) => l.leg_id === (unit || {}).leg_id);
  const u = unit && leg && Array.isArray(unit.waypoints) ? { ...unit, waypoints: unit.waypoints.map((w, j) => fillEntry(w, j, leg, unit.waypoints.length)) } : unit;
  return rawValidateUnit(u, inputs, unitId);
};
const { waypointLines } = await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);
const { JUDGE_INPUT_MARKER } = await import(pathToFileURL(join(repo, "src", "workflow", "judge.mjs")).href);

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-"));
// THE MAPPER IS A SETTING (kogaki#1734): every case runs without it but (z), which runs with it.
const settingsWith = (mapper) => {
  const doc = JSON.parse(readFileSync(join(repo, "kogaki.settings.json"), "utf8"));
  doc.paragraph_plan.mapper = mapper;
  const file = join(root, `settings-mapper-${mapper}.json`);
  writeFileSync(file, JSON.stringify(doc));
  return file;
};
let stageSettings = settingsWith(false);
// One named criterion's sentence in a rendered prompt, read by the stage's own parser (kogaki#1511).
const critOf = (p, name) => (criteriaOf(p).find((c) => c.name === name) || { text: "" }).text;

// ---- the Move library: one whole paragraph Move, one missing `segments` ----
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
const PSEG_OPERATION = "states the point once, plainly.";
// A Move record is YAML written by the Brief's own writer (kogaki#1413):
// `before` and `after` maps keyed by dimension, `breaks` a list, `segments`
// a list of maps.
// Every Move carries the `description` the Adapter requires (kogaki#1412, kogaki#1418).
const writeMove = (dir, rec) => writeFileSync(join(dir, `${rec.id}.yaml`),
  stringifyYaml({ id: rec.id, description: "a fixture Move.", takes: [], leaves: [], ...rec }));
// THE INGEST ADMITS p1 (kogaki#1418): the Move every case below binds is
// written by `tools/move_ingest.py`'s own write gate, `save_accepted`, which
// validates it through the Adapter (src/move-validate.mjs) -- so the stage
// reading it without refusal is a Move the ingest admitted being read.
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
writeMove(moves, { id: "p4", ...STATE,
  breaks: ["breaks if a segment is dropped."], segments: PSEG3 });
// A MOVE OF THE LIBRARY THE FIXTURE LEGS ONCE BOUND (kogaki#1701). A Leg binds no Move since
// kogaki#1768, so `legRecord` drops the fixture Legs' `move` and what this one leaves crosses no Leg.
const LEG_LEAVES = [{ kind: "explain", what: "why the copy is the installer's.", segment: 1 }];
const writeLegMove = (dir) => writeMove(dir, { id: "a_leg_move", ...STATE, breaks: ["breaks if the point is dropped."],
  segments: [{ operation: PSEG_OPERATION }], leaves: LEG_LEAVES });
writeLegMove(moves);

// ---- isolated Move libraries for (c) and (f): each holds one Move with no `segments`
// beside the whole p1, so the library itself is refused by name (kogaki#1412).
const isolatedLibrary = (name, rec) => {
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(join(dir, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(dir, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION }] });
  writeLegMove(dir);
  writeMove(dir, rec);
  return dir;
};
const movesNoOrder = isolatedLibrary("moves-c", { id: "p3", ...STATE, breaks: ["breaks if the point is dropped."] });
const movesTechnique = isolatedLibrary("moves-f", { id: "p2", technique: "names a case and leaves it.", ...STATE,
  breaks: ["breaks if the case is never named."] });

// ---- the Brief: two Legs, three Leg Waypoints ----
const C1 = "the installer copies the kit into the consumer's tree.";
const C2 = "a second run refreshes the copy and its stamp.";
const lessonCite = (slug) => `coding::lesson/${slug}@${"0".repeat(64)}`;
const leg = (id, claims, waypoints) => ({
  leg_id: id, move: "a_leg_move", purpose: `purpose of ${id}`,
  materials: ["L1", "L2"], depends_on: [], rationale: `rationale for ${id}.`, claims, waypoints,
});
const legs = [
  leg("s1", [{ strand: "L1", proposition: C1 }, { strand: "L2", proposition: C2 }], [
    { point: "The installer writes into a tree the consumer thought was theirs alone.", serves: ["L1"], case: "own" },
    { point: "The next run overwrites any edit made to the copy.", serves: ["L1", "L2"], case: "own" }]),
  leg("s2", [{ strand: "L2", proposition: C2 }], [{ point: "The copy is the installer's, not the consumer's.", serves: ["L2"], case: "own" }]),
];
// (r)'s Legs: s1 is handed three terms, which `legRecord` does not write (a Leg introduces no term,
// kogaki#1768), and its first Leg Waypoint's point uses TERM.
const TERM = { term: "kit stamp", meaning: "the hash the installer writes beside the copy" };
// The Brief's Defined Terms mark "kit stamp" alone `defined`.
const DEFINED = [{ term: TERM.term, class: "defined" }];
const REFERENTS = [{ term: "installer", meaning: "the program that copies the kit" }, { term: "next run", meaning: "the installer's following run" }];
const termLegs = [{ ...legs[0], introduces: [TERM, ...REFERENTS], waypoints: [
  { point: "The installer writes the kit stamp into a tree the consumer thought was theirs alone.", serves: ["L1"], case: "own" },
  legs[0].waypoints[1]] }, legs[1]];
const briefText = (ls, obligations = [], defined = []) => briefRecordText({
  slug: "plan-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") },
    { id: "L2", slug: "second-strand", cite: lessonCite("second-strand") }],
  thesis: "The fixture claim.",
  // NO READER START, READER TARGET OR OBLIGATIONS (kogaki#1699): the Brief record carries none,
  // so a Leg owes no Brief row; `obligations` is kept as a parameter and never written.
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
  const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  // The judge row's named criteria, each read off its own \`- <NAME>: <sentence>\` line (kogaki#1511).
  const crit = (name) => { const at = prompt.indexOf("\\n- " + name + ": "); return at < 0 ? "" : prompt.slice(at + name.length + 5, prompt.indexOf("\\n", at + 1)); };
  // THE MAPPER'S CALLS (kogaki#1734): a reading answers one structure, a grounding one table by its case.
  const MARKER = ${JSON.stringify(JUDGE_INPUT_MARKER)};
  const planning = ["leg_you_must_plan", "leg_you_must_judge", "leg_waypoint_you_must_plan"].some((k) => prompt.includes('"' + k + '"'));
  const callInput = () => JSON.parse(prompt.slice(prompt.lastIndexOf(MARKER) + MARKER.length));
  if (!planning && prompt.includes('"proposition"')) {
    const i = callInput();
    out({ strand: i.strand, roles: [{ id: "gate", context: "A fixed check that lets some things through.", attributes: [] },
      { id: "crowd", context: "A body of things arriving in turn.", attributes: [] }],
      relations: [{ id: "r1", between: ["gate", "crowd"], holds: "{gate} lets part of {crowd} through." },
        { id: "r2", between: ["gate", "crowd"], holds: "{gate} sees only the part of {crowd} at its opening." }],
      higher_order: { relates: ["r1", "r2"], holds: "{gate} lets through only what of {crowd} reaches it." } });
  }
  if (!planning && prompt.includes('"segments"')) {
    const apart = callInput().case === "apart";
    out({ base: { domain: apart ? "a stadium turnstile" : "the installer's tree" },
      correspondences: [{ role: "gate", expression: apart ? "the turnstile" : "the installer" },
        { role: "crowd", expression: apart ? "the arriving fans" : "the consumer's edits" }] });
  }
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    const counter = dir + "/judge-" + leg.leg_id;
    const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
    writeFileSync(counter, String(n));
    const doesOf = (w) => ((w.bound_move && w.bound_move.segments) || []).map((s) => String(s.operation || "").trim()).filter(Boolean);
    // EACH REFUSAL NAMES ITS OWN LEG WAYPOINT (kogaki#1642): a retry is scoped to the one it names.
    const restates = (w) => mode === "content"
      && (w.paragraph_waypoints || []).some((pw) => doesOf(w).some((d) => d && String(pw.point || "").includes(d)));
    // (p): refuses a \`performs\` Paragraph Waypoint carrying a purpose clause, only where the row
    // it was handed carries PERFORMS IS BARE, the mirror of the planner's bound (kogaki#1485).
    const purposeRule = crit("PERFORMS IS BARE").includes("the reader's resulting reading");
    const purposeAt = (w) => (w.paragraph_waypoints || []).findIndex((pw) => / so that /.test(String(pw.performs || "")));
    const purposeWp = mode === "performs-purpose" && purposeRule ? leg.waypoints.find((w) => purposeAt(w) >= 0) : undefined;
    // (w): refuses a first Paragraph Waypoint already carrying the second Segment's compressed
    // form, only where the row it was handed carries OWN STEP (kogaki#1605).
    const ownRule = crit("OWN STEP").includes("nothing a later Segment's \`operation\` produces");
    const earlyWp = mode === "own-step" && ownRule ? leg.waypoints.find((w) =>
      String(((w.paragraph_waypoints || [])[0] || {}).point || "").includes("COMPRESSED")) : undefined;
    const refuse = (w) => (mode === "ok" && leg.leg_id === "s2" && n === 1) || restates(w) || purposeWp === w || earlyWp === w;
    const why = (w) => earlyWp === w ? "OWN-STEP-SENTENCE Paragraph Waypoint 1 already states what Paragraph Waypoint 2's Segment 2 produces."
      : purposeWp === w ? "PURPOSE-SENTENCE Paragraph Waypoint " + (purposeAt(purposeWp) + 1) + " carries performs with the clause \\\"so that"
        + purposeWp.paragraph_waypoints[purposeAt(purposeWp)].performs.split(" so that")[1] + "\\\"."
      : restates(w)
      ? "CONTENT-SENTENCE the Paragraph Waypoint restates a Segment's does rather than a part of the point."
      : refuse(w) ? "JUDGE-SENTENCE the first paragraph waypoint never reaches the after state." : "they begin at before and end at after.";
    out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint,
      verdict: refuse(w) ? "does-not-fit" : "fits", why: why(w) })) });
  }
  // A SITE CALL (kogaki#1642) is answered by the same builder over its one Leg Waypoint, the
  // entry's terms carried, its Paragraph Waypoints marked as rewritten there.
  const site = prompt.includes('"leg_waypoint_you_must_plan"') ? body("leg_waypoint_you_must_plan") : null;
  const sw = site && site.leg_waypoint_you_must_plan;
  const planIn = site ? null : body("leg_you_must_plan");
  const leg = site ? { leg_id: sw.leg_id, waypoints: Array.from({ length: sw.waypoints_in_leg },
    (_, i) => (i + 1 === sw.waypoint ? { waypoint: sw.waypoint, point: sw.point, serves: sw.serves, table: sw.table } : { waypoint: i + 1, point: "", serves: [] })) }
    : planIn.leg_you_must_plan;
  const planCounter = dir + "/plan-" + leg.leg_id;
  const planN = (existsSync(planCounter) ? Number(readFileSync(planCounter, "utf8")) : 0) + 1;
  writeFileSync(planCounter, String(planN));
  const entryOf = (w) => {
    const nofit = mode === "nofit" && leg.leg_id === "s1" && w.waypoint === 2;
    const move = nofit ? null : mode === "broken" ? "p3" : mode === "technique" ? "p2" : (mode === "segments3" || mode === "content" || mode === "relation") ? "p4"
      : (mode === "performs" || mode === "performs-purpose") ? "p5" : mode === "own-step" ? "p7"
      : "p1";
    const pw = (n) => ({ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-" + n + " the paragraph establishes its point"
      + (site ? ", rewritten at its site." : "."), serves: [...w.serves], cast: mode === "ok" && leg.leg_id === "s1" ? { terse: true } : {} });
    const restated = mode === "content" && leg.leg_id === "s1" && w.waypoint === 1 && planN === 1;
    const join = w.waypoint === 1 || nofit ? undefined
      : mode === "join-sentence" && planN === 1 ? "The overwrite takes up the edit the installer's write left open."
      : "consequence";
    const carried = mode === "relation" && leg.leg_id === "s1" && w.waypoint === 1 && planN === 1;
    // THE ENTRY IS THE PARAGRAPH'S SCHEMA (kogaki#1639): the bound Move's id, its Leg
    // Waypoint's serves as materials, a purpose, the paragraph before as its dependency, a
    // rationale, the Leg's term where this paragraph's point first uses it, and no re-activation.
    // A term is named only where the paragraph gives its meaning, which this planner does for TERM alone.
    const terms = site ? [] : (planIn.terms_this_leg_introduces || []).filter((t) => t.term === ${JSON.stringify(TERM.term)});
    const introduces = site ? site.terms_this_entry_introduces : terms.filter((t) => String(w.point).includes(t.term) && !leg.waypoints.some((o) => o.waypoint < w.waypoint && String(o.point).includes(t.term)))
      .map((t) => ({ term: t.term, meaning: t.meaning || "MEANING-" + t.term }));
    return { waypoint: w.waypoint, move, materials: [...w.serves],
      purpose: "PURPOSE-" + leg.leg_id + "-" + w.waypoint + " brings the reader to the point.",
      depends_on: w.waypoint > 1 ? [w.waypoint - 1] : [],
      rationale: nofit ? "NOFIT-SENTENCE-" + planN + " no paragraph Move's before holds this state." : "its before holds the state and its after reaches the next point.",
      introduces, "re-activate": [],
      ...(join ? { join } : {}),
      // (z): written in the table's expressions; the first such call breaks it at Leg Waypoint 2 with a Role id.
      paragraph_waypoints: nofit ? [] : w.table ? [{ point: w.table.correspondences.map((c) => c.expression).join(" and ") + " hold together"
        + (mode === "mapper" && w.waypoint === 2 && planN === 2 ? ", and the gate stays." : "."), serves: [...w.serves], cast: {} }]
        : mode === "own-step"
        ? [{ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-1 the measure grades how far the copy is the installer's"
          + (planN === 1 ? ", that is, COMPRESSED who owns the copy." : "."), serves: [...w.serves], cast: {} },
          { point: "PW-" + leg.leg_id + "-" + w.waypoint + "-2 put plainly, COMPRESSED who owns the copy.", serves: [...w.serves], cast: {} }]
        : mode === "performs-purpose"
        ? [{ performs: "PERFORMS-" + leg.leg_id + "-" + w.waypoint + " announces the simplification"
          + (planN === 1 ? ", so that what follows is taken as an admitted shortcut." : ".") }, pw(2)]
        : mode === "performs"
        ? [{ performs: "PERFORMS-" + leg.leg_id + "-" + w.waypoint + " flags the case as hard and announces the simplification." }, pw(2)]
        : restated ? [{ point: "RESTATED: sets up the point.", serves: [...w.serves], cast: {} }, pw(2), pw(3)]
        : mode === "relation" ? [pw(1), carried ? { point: "PW-s1-1-2 the overwrite is the consumer's edit, and answers what the setup opened.", serves: [...w.serves], cast: {} } : pw(2), pw(3)]
        : mode === "introduces" && w.point.includes(${JSON.stringify(TERM.term)})
        ? [{ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-1 the " + ${JSON.stringify(TERM.term)}
          + ", " + ${JSON.stringify(TERM.meaning)} + ", is written by the installer.", serves: [...w.serves], cast: {} }]
        : mode === "introduces" ? [{ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-1 the installer writes into the tree.", serves: [...w.serves], cast: {} }]
        : (mode === "segments3" || mode === "content") ? [pw(1), pw(2), pw(3)] : [pw(1)] };
  };
  if (site) out(entryOf(leg.waypoints[sw.waypoint - 1]));
  out({ version: "1", leg_id: leg.leg_id,
    waypoints: leg.waypoints.map(entryOf) });
});
`);
chmodSync(judge, 0o755);

function runStage(name, ls, mode, movesDir = moves, obligations = [], defined = []) {
  const dir = join(root, name);
  const briefDir = join(dir, "theses", "plan-brief");
  const runDir = join(dir, "run");
  mkdirSync(briefDir, { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(dir, "mode"), mode);
  const briefPath = join(briefDir, "brief.yaml");
  const text = briefText(ls, obligations, defined);
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
  return { dir, briefPath, text, runDir, started, awaited, prompts, planPath: join(briefDir, PARAGRAPH_PLAN_FILE) };
}

// A REFUSAL NAMING A LEG WAYPOINT IS RETRIED THERE ALONE (kogaki#1642): its retry is a site
// prompt, whose refusals ride in `refused_here` beside the entries they refused.
const isSite = (p) => p.includes('"leg_waypoint_you_must_plan"');
const siteInput = (p) => JSON.parse(p.slice(p.lastIndexOf("{", p.lastIndexOf('"leg_waypoint_you_must_plan"'))));
const retriesOf = (prompts, legId) => prompts.filter((p) => (p.includes('"leg_you_must_plan"') || isSite(p)) && p.includes(`"leg_id": "${legId}"`));
const retryText = (p) => (isSite(p) ? siteInput(p).refused_here.map((h) => `${h.refusal}\n${JSON.stringify(h.entry)}`).join("\n") : p);

// (a) A PLANNED JOB WRITES THE PARAGRAPH-LEVEL READER PATH (kogaki#1639): every entry carries
// the Leg schema at the paragraph scale -- the bound Move's id, `materials`, `purpose`,
// `depends_on`, `rationale`, `introduces`, `re-activate` -- beside its `join` and
// `paragraph_waypoints`, and nothing else: no reader state, no `obligations` and no `discharges`
// (kogaki#1701), no Segment and no Move field but the id; and the run directory holds no
// bindings record (the plan file is the record). The plan call hands the first Leg Waypoint what
// stands to be taken up -- the Persona's prior knowledge on the first Leg, the previous Leg's
// Move's `leaves` on a later one -- and every Leg its own Move's `leaves` (kogaki#1701).
let okPrompts = [];
{
  const r = runStage("ok", legs, "ok");
  okPrompts = r.prompts;
  if (r.started.status !== 0) fails.push(`(a) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(a) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  if (!existsSync(r.planPath)) fails.push("(a) no ParagraphPlan file was written beside the Brief");
  else {
    const plan = readFileSync(r.planPath, "utf8");
    const body = plan.split("\n").filter((l) => !l.startsWith("#")).join("\n");
    for (const banned of ["segments", "settles", "technique", "breaks", "operation", "reader_state_before", "reader_state_after", "obligations", "discharges", "why"]) {
      if (new RegExp(`(^|[^A-Za-z_])${banned}([^A-Za-z_]|$)`, "m").test(body)) fails.push(`(a) the ParagraphPlan file carries Move information or a derived field (\`${banned}\`)`);
    }
    for (const id of ["s1-1", "s1-2", "s2-1"]) if (!plan.includes(`PW-${id}`)) fails.push(`(a) the ParagraphPlan file lacks the Paragraph Waypoint of ${id}`);
    const rec = parseYaml(plan, r.planPath);
    const entries = rec.legs.flatMap((l) => l.waypoints.map((w) => [l.leg_id, w]));
    const SCHEMA = ["move", "materials", "purpose", "depends_on", "rationale", "introduces", "re-activate"];
    for (const [legId, w] of entries) {
      const want = ["waypoint", ...SCHEMA, ...(w.waypoint > 1 ? ["join"] : []), "paragraph_waypoints"];
      if (JSON.stringify(Object.keys(w)) !== JSON.stringify(want)) {
        fails.push(`(a) an entry does not carry exactly the paragraph's schema: Leg ${legId}, Waypoint ${w.waypoint} carries ${Object.keys(w).join(", ")}, not ${want.join(", ")}`);
      }
      if (w.move !== "p1") fails.push(`(a) Leg ${legId}, Waypoint ${w.waypoint} does not carry the bound Move's id: ${JSON.stringify(w.move)}`);
      if (!/^PURPOSE-/.test(w.purpose) || !/^its before holds/.test(w.rationale) || JSON.stringify(w.introduces) !== "[]" || JSON.stringify(w["re-activate"]) !== "[]") {
        fails.push(`(a) Leg ${legId}, Waypoint ${w.waypoint} does not carry the planner's purpose, rationale, introduces and re-activate as written: ${JSON.stringify(w)}`);
      }
    }
    const s1 = rec.legs[0].waypoints;
    if (JSON.stringify(s1.map((w) => w.materials)) !== JSON.stringify([["L1"], ["L1", "L2"]]) || JSON.stringify(s1.map((w) => w.depends_on)) !== JSON.stringify([[], [1]])) {
      fails.push(`(a) Leg s1's entries do not carry their materials and dependencies as the planner wrote them: ${JSON.stringify(s1.map((w) => [w.materials, w.depends_on]))}`);
    }
    const joins = rec.legs.map((l) => l.waypoints.map((w) => w.join ?? null));
    if (JSON.stringify(joins) !== JSON.stringify([[null, "consequence"], [null]])) {
      fails.push(`(a) the ParagraphPlan file does not carry a join on every Leg Waypoint after the first and none on a first (kogaki#1411): ${JSON.stringify(joins)}`);
    }
    const sha = (await import("node:crypto")).createHash("sha256").update(r.text).digest("hex");
    if (!plan.includes(sha)) fails.push("(a) the ParagraphPlan file does not name the Brief's content hash");
    if (!plan.includes("theses/plan-brief/brief.yaml")) fails.push("(a) the ParagraphPlan file does not name the Brief's path");
    if (rawPlanShapeRefusal(rec, "plan.yaml", legs) !== null) fails.push(`(a) the plan reader refuses the file the stage wrote: ${rawPlanShapeRefusal(rec, "plan.yaml", legs)}`);
    // THE CAST RIDES INTO THE FILE (kogaki#1695): every point Paragraph Waypoint carries the
    // planner's cast, s1's `{ terse: true }` and s2's `{}`.
    const casts = rec.legs.map((l) => l.waypoints.flatMap((w) => (w.paragraph_waypoints || []).filter((p) => !Object.hasOwn(p, "performs")).map((p) => p.cast)));
    if (JSON.stringify(casts) !== JSON.stringify([[{ terse: true }, { terse: true }], [{}]])) {
      fails.push(`(a) the ParagraphPlan file does not carry the planner's cast on every point Paragraph Waypoint (kogaki#1695): ${JSON.stringify(casts)}`);
    }
    // THE MAPPING RECORD (kogaki#1733): written beside the plan, empty until a stage fills it, named by path and digest.
    const empty = (await import("node:crypto")).createHash("sha256").update("").digest("hex");
    const m = rec.mapping || {};
    if (!existsSync(join(r.planPath, "..", "mapping")) || !String(m.path).endsWith("theses/plan-brief/mapping") || m.sha256 !== empty || JSON.stringify(m.files) !== "[]") {
      fails.push(`(a) the stage did not write mapping/ beside the plan and name it by path and the digest of nothing (kogaki#1733): ${JSON.stringify(rec.mapping)}`);
    }
  }
  const castPlans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  if (!castPlans.length || !castPlans.every((p) => critOf(p, "CAST").includes("a `cast` setting true each key its Segment's `manner` bears"))) {
    fails.push("(a) a plan prompt's CAST does not ask for the cast from the Segment's manner (kogaki#1695)");
  }
  for (const [key, definition] of Object.entries(CAST_KEYS)) {
    if (!castPlans.every((p) => p.includes(`\`${key}\` -- ${definition}`))) fails.push(`(a) a plan prompt's row does not name the cast key \`${key}\` with its definition (kogaki#1695)`);
  }
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(a) the Brief was rewritten by the stage");
  const bindings = join(r.runDir, "paragraph-plan-bindings.json");
  if (existsSync(bindings)) fails.push("(a) the run directory still carries a paragraph-plan-bindings.json, retired (kogaki#1639): the plan file is the record");
  if (readdirSync(r.runDir).some((f) => /bindings/.test(f))) fails.push(`(a) the run directory holds a bindings record: ${readdirSync(r.runDir).join(", ")}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const planOf = (p) => JSON.parse(p.slice(p.lastIndexOf("{", p.lastIndexOf('"leg_you_must_plan"')))).leg_you_must_plan;
  const s1In = plans.map(planOf).find((l) => l.leg_id === "s1");
  const s2In = plans.map(planOf).find((l) => l.leg_id === "s2");
  const leftBy = (l) => JSON.stringify(((l && l.waypoints[0].stands_to_be_taken_up) || []).map((x) => x.left_by));
  if (!s1In || leftBy(s1In) !== JSON.stringify(["the reader's prior knowledge"]) || "stands_to_be_taken_up" in s1In.waypoints[1]) {
    fails.push(`(a) Leg s1's first Leg Waypoint is not handed the Persona's prior knowledge alone as what stands to be taken up (kogaki#1701): ${JSON.stringify(s1In && s1In.waypoints)}`);
  }
  // A LEG BINDS NO MOVE (kogaki#1768): nothing a Leg's Move leaves crosses to the next Leg, so Leg s2's
  // first Leg Waypoint is handed nothing to take up and no Leg is handed a `leaves_for_next_leg`.
  if (!s2In || JSON.stringify(s2In.waypoints[0].stands_to_be_taken_up) !== "[]") {
    fails.push(`(a) Leg s2's first Leg Waypoint is handed something a Leg Move left (kogaki#1768): ${JSON.stringify(s2In && s2In.waypoints[0])}`);
  }
  if (!s1In || JSON.stringify(s1In.leaves_for_next_leg) !== "[]") {
    fails.push(`(a) Leg s1 is handed a \`leaves_for_next_leg\` though it binds no Move (kogaki#1768): ${JSON.stringify(s1In && s1In.leaves_for_next_leg)}`);
  }
  if (plans.some((p) => /"(reader_state_(before|after)|entry_state|obligations_this_leg_owes|deferred_slots)"/.test(p))) {
    fails.push("(a) a plan prompt still carries a reader state, an owed Brief row or a deferred slot (kogaki#1701)");
  }
  // THE RETRY IS A SITE CALL (kogaki#1642): the judge refused Leg s2's one Leg Waypoint, so its
  // second prompt holds the bound Move and what stands to be taken up and carries the refused
  // entry beside the judge's sentence.
  const s2Plans = retriesOf(r.prompts, "s2");
  const site2 = s2Plans[1] && isSite(s2Plans[1]) ? siteInput(s2Plans[1]) : null;
  if (s2Plans.length !== 2 || !site2 || !retryText(s2Plans[1]).includes("JUDGE-SENTENCE")) {
    fails.push(`(a) the judge's does-not-fit sentence was not put into Leg s2's site prompt (${s2Plans.length} plan or site prompt(s))`);
  }
  const sw2 = site2 && site2.leg_waypoint_you_must_plan;
  if (!site2 || !site2.fixed || site2.fixed.move !== "p1" || !sw2 || !Array.isArray(sw2.stands_to_be_taken_up)
    || !JSON.stringify((site2.refused_here[0] || {}).entry).includes("PW-s2-1-1")) {
    fails.push(`(a) Leg s2's site prompt does not hold the bound Move and what stands to be taken up beside the refused entry: ${JSON.stringify(site2 && { fixed: site2.fixed, site: sw2, refused_here: site2.refused_here })}`);
  }
  if (!plans.length || !plans.every((p) => p.includes(`"operation": ${JSON.stringify(PSEG_OPERATION)}`) && p.includes('"relation": ""')
    && p.includes('"persona"') && p.includes("breaks if the point is dropped."))) {
    fails.push("(a) a plan prompt is not handed the Move's segments (each Segment's operation and relation) and breaks beside the persona");
  }
  if (!plans.length || !plans.every((p) => p.includes('"point"') && p.includes('"serves"') && p.includes('"next_point"'))) {
    fails.push("(a) a plan prompt does not carry a Leg Waypoint entry's point, serves and next_point");
  }
  if (plans.some((p) => p.includes(C1) || p.includes(C2))) {
    fails.push("(a) a plan prompt carries a Claim proposition on a Leg Waypoint entry (kogaki#1382)");
  }
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judges.length || !judges.every((p) => p.includes('"takes"') && p.includes('"leaves"') && p.includes('"stands_to_be_taken_up"')
    && p.includes('"leaves_for_next_leg"') && p.includes('"breaks"') && p.includes('"segments"'))) {
    fails.push("(a) a judge prompt is not handed the bound Move's takes, leaves, segments and breaks beside what stands to be taken up and the Leg's leaves_for_next_leg (kogaki#1701)");
  }
  if ([...plans, ...judges].some((p) => p.includes('"technique"'))) {
    fails.push("(a) a plan or judge prompt is handed a `technique` (kogaki#1412)");
  }
}

// (b) no Move fits: re-asked to the Round bound, then a stop naming the Leg and Waypoint.
{
  const r = runStage("nofit", legs, "nofit");
  const out = r.awaited ? `${r.awaited.stdout}${r.awaited.stderr}` : "";
  if (r.started.status !== 0) fails.push(`(b) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status === 0) fails.push(`(b) await did not stop the stage: ${out.slice(0, 600)}`);
  if (!out.includes("Leg s1, Waypoint 2") || !out.includes(NO_PARAGRAPH_MOVE_FITS)) {
    fails.push(`(b) the stop does not name Leg s1, Waypoint 2 and ${NO_PARAGRAPH_MOVE_FITS}: ${out.slice(0, 600)}`);
  }
  // The site's Rounds (kogaki#1642): the Leg call, then two site calls at Waypoint 2.
  const s1Plans = retriesOf(r.prompts, "s1");
  if (s1Plans.length !== 3) fails.push(`(b) Leg s1 was not asked brief.unit_rounds (3) times: ${s1Plans.length}`);
  if (s1Plans.length > 1 && !retryText(s1Plans[1]).includes("NOFIT-SENTENCE-1")) fails.push("(b) the no_paragraph_move_fits refusal was not put into the next round's prompt");
  // the site prompt carries every refusal at the site so far, not only the last one (kogaki#1395)
  if (s1Plans.length > 2 && !(retryText(s1Plans[2]).includes("NOFIT-SENTENCE-1") && retryText(s1Plans[2]).includes("NOFIT-SENTENCE-2")
    && retryText(s1Plans[2]).indexOf("NOFIT-SENTENCE-1") < retryText(s1Plans[2]).indexOf("NOFIT-SENTENCE-2"))) {
    fails.push("(b) the third round's prompt does not carry BOTH the first and second rounds' refusals, oldest first");
  }
  if (existsSync(r.planPath)) fails.push("(b) a ParagraphPlan file was written for a stopped job");
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(b) the Brief was rewritten by a stopped stage");
}

// (j) kogaki#1413: the plan call reads the Move record through the Brief's YAML
// reader, its `before` map rendered one `dimension: sentence` line per dimension;
// a library holding a `.md` Move, or a Move whose state is one joined line, is
// refused by name and plans nothing.
{
  const r = runStage("yaml-state", legs, "ok");
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const want = `"before": ${JSON.stringify(Object.entries(P1_BEFORE).map(([d, s]) => `${d}: ${s}`).join("\n"))}`;
  if (!plans.length || !plans.every((p) => p.includes(want))) fails.push(`(j) a plan prompt does not carry p1's before one dimension per line (${want})`);

  const retired = join(root, "moves-retired");
  mkdirSync(retired);
  writeFileSync(join(retired, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(retired, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION }] });
  writeFileSync(join(retired, "p9.md"), "id: p9\nbefore: >-\n  knowledge: before.\n");
  const rr = runStage("retired", legs, "ok", retired);
  const rOut = `${rr.started.stdout}${rr.started.stderr}${rr.awaited ? rr.awaited.stdout + rr.awaited.stderr : ""}`;
  if (!rOut.includes("p9.md") || !rOut.includes("retired `.md` form")) fails.push(`(j) a library holding a .md Move is not refused naming it: ${rOut.slice(0, 400)}`);
  if (existsSync(rr.planPath)) fails.push("(j) a ParagraphPlan file was written over a library holding a .md Move");

  const joined = join(root, "moves-joined");
  mkdirSync(joined);
  writeFileSync(join(joined, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(joined, { id: "p1", before: "knowledge: before. question: holds: none.",
    after: { knowledge: "after." }, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION }] });
  const jr = runStage("joined", legs, "ok", joined);
  const jOut = `${jr.started.stdout}${jr.started.stderr}${jr.awaited ? jr.awaited.stdout + jr.awaited.stderr : ""}`;
  if (!jOut.includes("one joined line")) fails.push(`(j) a Move whose before is one joined line is not refused by name: ${jOut.slice(0, 400)}`);
  if (existsSync(jr.planPath)) fails.push("(j) a ParagraphPlan file was written over a joined-line Move");
}

// (c) and (f): a library holding a Move with no `segments` stops the stage naming the Move and
// `segments` -- whether or not the Move carries the retired `technique`, which is no fallback
// order (kogaki#1412). Nothing is defaulted, no file is written and the Brief is unchanged.
for (const [tag, name, movesDir, id] of [["(c)", "broken", movesNoOrder, "p3"], ["(f)", "technique", movesTechnique, "p2"]]) {
  const r = runStage(name, legs, name, movesDir);
  const out = `${r.started.stdout}${r.started.stderr}${r.awaited ? r.awaited.stdout + r.awaited.stderr : ""}`;
  if (r.started.status === 0 && (!r.awaited || r.awaited.status === 0)) fails.push(`${tag} the stage was not stopped: ${out.slice(0, 600)}`);
  if (!out.includes(`"${id}"`) || !out.includes("carries no segments") || !out.includes("kogaki#1412")) {
    fails.push(`${tag} the stop does not name the Move ${id} and its missing segments: ${out.slice(0, 600)}`);
  }
  if (out.includes("technique where")) fails.push(`${tag} the stop offers technique as a fallback order: ${out.slice(0, 600)}`);
  if (existsSync(r.planPath)) fails.push(`${tag} a ParagraphPlan file was written over a Move with no segments`);
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push(`${tag} the Brief was rewritten by a stopped stage`);
}

// (g) a bound Move carrying three `segments` yields three Paragraph Waypoints under its Leg
// Waypoint, and the rendered Packet carries the three indented lines under the one point,
// under the revised header (kogaki#1381).
{
  const r = runStage("segments3", legs, "segments3");
  if (r.started.status !== 0) fails.push(`(g) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(g) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  let planLegWp = null;
  if (!existsSync(r.planPath)) fails.push("(g) no ParagraphPlan file was written for a Move carrying three segments");
  else {
    const record = parseYaml(readFileSync(r.planPath, "utf8"), r.planPath);
    planLegWp = record.legs.find((l) => l.leg_id === "s1").waypoints[0];
    if (!Array.isArray(planLegWp.paragraph_waypoints) || planLegWp.paragraph_waypoints.length !== 3) {
      fails.push(`(g) the ParagraphPlan file does not carry three Paragraph Waypoints under s1's first Leg Waypoint: ${JSON.stringify(planLegWp)}`);
    }
    for (const n of [1, 2, 3]) if (!readFileSync(r.planPath, "utf8").includes(`PW-s1-1-${n}`)) fails.push(`(g) the ParagraphPlan file lacks Paragraph Waypoint ${n} of s1's first Leg Waypoint`);
  }
  if (planLegWp) {
    const s1 = legs.find((l) => l.leg_id === "s1");
    const renderLeg = { claims: s1.claims, waypoints: [{ ...s1.waypoints[0], paragraph_waypoints: planLegWp.paragraph_waypoints }] };
    const rendered = waypointLines(renderLeg);
    const indented = (rendered || "").split("\n").filter((l) => l.startsWith("   "));
    if (indented.length !== 3) fails.push(`(g) the rendered Packet waypoints block does not carry three indented lines under the one point: ${JSON.stringify(rendered)}`);
    for (const n of [1, 2, 3]) if (!(rendered || "").includes(`PW-s1-1-${n}`)) fails.push(`(g) the rendered Packet waypoints block lacks Paragraph Waypoint ${n}`);
  }
  const header = readFileSync("src/packet-template.md", "utf8");
  const flatHeader = header.replace(/\s+/g, " ");
  if (!flatHeader.includes("rendered as the sentences it is") || !flatHeader.includes("adds no sentence that no indented line carries")) {
    fails.push("(g) src/packet-template.md's waypoints header does not state that each line is rendered as the sentences it is and none is added");
  }
  for (const retired of ["as many sentences as it needs", "its wording is yours"]) {
    if (flatHeader.includes(retired)) fails.push(`(g) src/packet-template.md's waypoints header still carries the retired "${retired}"`);
  }
}

// (h) EVERY SEGMENT REACHES THE PLAN CALL AS ITS TWO FIELDS (kogaki#1414, reverting the
// withholding of kogaki#1403): the plan prompt built over p4 (three Segments) carries every
// Segment's number, `operation`, `relation` and `manner` as separate fields, the plan row states that a
// `operation` is an operation and never a point, and a plan-call answer whose Paragraph Waypoint
// restates a Segment's `operation` is refused by the judge the check call's refusal binds, exactly
// as any other does-not-fit is -- put back into the next Round verbatim, and the stage
// finishes once the next Round's Paragraph Waypoint is recoverable from the Leg Waypoint's
// own point instead.
{
  const r = runStage("content", legs, "content", moves);
  if (r.started.status !== 0) fails.push(`(h) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(h) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const fields = [['"segment": 1', '"operation": "sets up the point."', '"relation": ""'],
    ['"segment": 2', '"operation": "makes the point."', '"relation": "answers what the setup opened."'],
    ['"segment": 3', '"operation": "leaves the point."', '"relation": "draws the consequence of the point."']];
  if (!plans.length || !plans.every((p) => fields.every((f) => f.every((x) => p.includes(x))))) {
    fails.push("(h) a plan prompt does not carry every Segment's number, operation and relation as separate fields");
  }
  if (!plans.length || !plans.every((p) => p.includes("A Segment's `operation` is an operation performed on a part of the Leg Waypoint's `point`, never a point to state."))) {
    fails.push("(h) a plan prompt's row does not state that a Segment's operation is an operation to perform and never a point to state");
  }
  const s1Plans = retriesOf(r.prompts, "s1").filter((p) => p.includes("The installer writes into a tree the consumer thought was theirs alone."));
  if (s1Plans.length !== 2 || !retryText(s1Plans[1]).includes("CONTENT-SENTENCE")) {
    fails.push(`(h) the judge's content refusal was not put into Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
}


// (o) A SEGMENT'S RELATION IS NEVER CONTENT (kogaki#1446): bound to p4, whose Segment 2's
// relation is "answers what the setup opened.", the first plan Round writes Leg s1's second
// Paragraph Waypoint carrying that relation as content, as the 2026-10-19 Leg run's planner did.
// The plan row's ORDER carries the relation sentence. The judge's axis for it (ORDER CARRIES THE
// RELATION) was removed on the bench of 2026-10-23 (kogaki#1533), so no judge refusal is asserted.
{
  const r = runStage("relation", legs, "relation", moves);
  if (r.started.status !== 0) fails.push(`(o) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(o) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  if (!plans.length || !plans.every((p) => critOf(p, "ORDER") === "A Segment's `relation` is carried by the order of the Paragraph Waypoints, and no Paragraph Waypoint states it.")) {
    fails.push("(o) a plan prompt's ORDER does not state that a Segment's relation is never stated in a Paragraph Waypoint");
  }
  // (q) kogaki#1632
  const Q_LINES = {
    DIVIDE: "Write one Paragraph Waypoint per Segment of the bound Move, in its order, each the step its Segment's `operation` performs toward its Leg Waypoint's `point`.",
    EXPLAIN: "A Paragraph Waypoint may explain or illustrate its Leg Waypoint's `point` in words and examples of your own.",
    CONSISTENT: "No Paragraph Waypoint contradicts its Leg Waypoint's `point` or breaks the progression toward it.",
    "NO NEW FACT": "No Paragraph Waypoint states or implies a claim about the article's subject that its Leg Waypoint's `point` does not make.",
  };
  for (const [name, line] of Object.entries(Q_LINES)) {
    if (!plans.length || !plans.every((p) => critOf(p, name) === line)) fails.push(`(q) a plan prompt's ${name} is not the sentence kogaki#1632 settled`);
  }
  for (const gone of ["a part of the Leg Waypoint's own `point`", "standing to the one before it in its Segment's `relation`", "nothing more"]) {
    if (!plans.length || plans.some((p) => p.includes(gone))) fails.push(`(q) a plan prompt still carries "${gone}"`);
  }
}

// (r) A PARAGRAPH MOVE IS BOUND BY WHAT IT TAKES UP (kogaki#1663, kogaki#1701): the fixture hands
// Leg s1 three terms, which the Brief record does not carry, since a Leg introduces no term
// (kogaki#1768); the plan call is handed an empty ledger and no coined subset; its BIND step binds by
// `takes`; the first Leg Waypoint binds p1, whose one Segment defines nothing, and the plan is
// admitted and written.
{
  const r = runStage("introduces", termLegs, "introduces", moves, [], DEFINED);
  if (r.started.status !== 0) fails.push(`(r) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(r) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  const inputOf = (p) => JSON.parse(p.slice(p.lastIndexOf("{", p.lastIndexOf('"leg_you_must_plan"'))));
  const s1Plans = plans.filter((p) => inputOf(p).leg_you_must_plan.leg_id === "s1");
  const s2Plans = plans.filter((p) => inputOf(p).leg_you_must_plan.leg_id === "s2");
  // A LEG INTRODUCES NO TERM (kogaki#1768): the Brief's Leg carries no `introduces`, so the ledger is empty.
  if (!s1Plans.length || !s1Plans.every((p) => JSON.stringify(inputOf(p).terms_this_leg_introduces) === "[]")) {
    fails.push(`(r) Leg s1's plan input carries a ledger of terms though a Leg introduces none: ${s1Plans.length ? JSON.stringify(inputOf(s1Plans[0]).terms_this_leg_introduces) : "no plan prompt"}`);
  }
  if (s1Plans.length && (!inputOf(s1Plans[0]).persona || Object.hasOwn(inputOf(s1Plans[0]).leg_you_must_plan, "introduces"))) {
    fails.push("(r) the introduced terms do not ride beside the persona, outside the Leg");
  }
  if (!s2Plans.length || JSON.stringify(inputOf(s2Plans[0]).terms_this_leg_introduces) !== "[]") {
    fails.push("(r) Leg s2, which introduces nothing, is not handed an empty list of introduced terms");
  }
  // THE PLANNER'S RENDERED PROMPT STATES NON-CONTRADICTION AND HANDS NO COINED SUBSET.
  // BIND binds by `takes` since kogaki#1701, its reader-state non-contradiction retired with the plan's states.
  for (const phrase of ["whose `takes` entries are each met", "the `what` by sense"]) {
    if (!plans.length || !plans.every((p) => critOf(p, "BIND").includes(phrase))) fails.push(`(r) a plan prompt's BIND row does not carry "${phrase}"`);
  }
  for (const phrase of ["toward `next_point`", "defines, names or grounds", "contradicts, on no dimension it declares", "exclusion, never ranking"]) {
    if (!plans.length || plans.some((p) => critOf(p, "BIND").includes(phrase))) fails.push(`(r) a plan prompt's BIND row still carries "${phrase}"`);
  }
  if (!plans.length || plans.some((p) => p.includes("terms_this_leg_coins"))) fails.push("(r) a plan prompt still carries `terms_this_leg_coins`");
  const judgeIn = (p) => JSON.parse(p.slice(p.lastIndexOf("{", p.lastIndexOf('"leg_you_must_judge"'))));
  if (!judges.length || judges.some((p) => Object.hasOwn(judgeIn(p), "terms_this_leg_coins") || critOf(p, "TERM MEANING") !== "")) {
    fails.push("(r) a judge prompt still carries `terms_this_leg_coins` or the TERM MEANING axis");
  }
  // TERMS NAMES A TERM IN AT MOST ONE ENTRY, where that entry's paragraph gives its meaning.
  for (const phrase of ["at most one entry, the first in the Leg to use it", "or yours where it is `null`"]) {
    if (!plans.length || !plans.every((p) => critOf(p, "TERMS").includes(phrase))) fails.push(`(r) a plan prompt's TERMS row does not carry "${phrase}"`);
  }
  // A `defined` term at the first Leg Waypoint, under a Move with no defining Segment, is admitted.
  const written = existsSync(r.planPath) ? parseYaml(readFileSync(r.planPath, "utf8"), r.planPath) : null;
  const first = written ? written.legs[0].waypoints[0] : null;
  if (!first || first.move !== "p1" || JSON.stringify(first.introduces) !== "[]") {
    fails.push(`(r) the ParagraphPlan file does not bind p1 at Leg s1's first Waypoint with nothing in its \`introduces\`: ${JSON.stringify(first)}`);
  }
  if (/^(define|defines|name|names|ground|grounds)\b/i.test(PSEG_OPERATION)) fails.push("(r) p1's one Segment defines, names or grounds, so the case proves nothing");
  // The meaning is read by the Packet's own rule (PR #1507 round 1): a legacy anchored entry's
  // anchor is its meaning, an item's is its `meaning`, and a bare term rides null (kogaki#1529).
  const read = introducedTerms(["stamp file — the file the hash is written to",
    { term: "fork", meaning: "a copy of a repository" }, "bare term"]);
  const wantRead = [{ term: "stamp file", meaning: "the file the hash is written to" },
    { term: "fork", meaning: "a copy of a repository" }, { term: "bare term", meaning: null }];
  if (JSON.stringify(read) !== JSON.stringify(wantRead)) fails.push(`(r) the introduced terms are not read by the Packet's meaning rule: ${JSON.stringify(read)}`);
}

// (w) A PARAGRAPH WAYPOINT PERFORMS ITS OWN SEGMENT'S OPERATION ALONE (kogaki#1605): bound to
// p7, the first Round's first Paragraph Waypoint carries Segment 2's compressed form and the
// judge refuses it naming both Paragraph Waypoints and the Segment; the second Round holds the
// compression to the second Paragraph Waypoint, fits, and is written.
{
  const r = runStage("own-step", legs, "own-step", moves);
  if (r.started.status !== 0) fails.push(`(w) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(w) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judges.length || !judges.every((p) => critOf(p, "OWN STEP").includes("names by both Paragraph Waypoints and that Segment"))) {
    fails.push("(w) a judge prompt's OWN STEP does not refuse a later Segment's result naming both Paragraph Waypoints and the Segment");
  }
  const s1Plans = retriesOf(r.prompts, "s1");
  // Both Leg Waypoints carry the defect, each repaired at its own site (kogaki#1642).
  if (s1Plans.length !== 3 || !retryText(s1Plans[1]).includes("OWN-STEP-SENTENCE Paragraph Waypoint 1 already states what Paragraph Waypoint 2's Segment 2 produces.")) {
    fails.push(`(w) the judge's refusal naming Paragraph Waypoints 1 and 2 and Segment 2 was not put into Leg s1's site prompt (${s1Plans.length} plan or site prompt(s))`);
  }
  if (!existsSync(r.planPath)) fails.push("(w) no ParagraphPlan file was written once the compression was held to the second Paragraph Waypoint");
  else {
    const record = parseYaml(readFileSync(r.planPath, "utf8"), r.planPath);
    const pws = record.legs.flatMap((l) => l.waypoints.map((w) => w.paragraph_waypoints.map((pw) => pw.point.includes("COMPRESSED"))));
    if (JSON.stringify(pws) !== JSON.stringify([[false, true], [false, true], [false, true]])) {
      fails.push(`(w) the ParagraphPlan file does not hold the compression to each second Paragraph Waypoint alone: ${JSON.stringify(pws)}`);
    }
  }
}

// (p) A SEGMENT THAT ACTS ON THE READING CARRIES \`performs\` (kogaki#1448): bound to p5, whose
// Segment 1 announces a simplification, the planner answers a \`performs\` Paragraph Waypoint on
// Segment 1 and a \`point\` one after it, and the file and the judge's input carry it; bound to
// p6, whose Segment 1 defines, a \`performs\` entry there is refused naming it and re-planned.
{
  const r = runStage("performs", legs, "performs", moves);
  if (r.started.status !== 0) fails.push(`(p) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(p) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  if (!existsSync(r.planPath)) fails.push("(p) no ParagraphPlan file was written for a plan carrying a performs Paragraph Waypoint");
  else {
    const record = parseYaml(readFileSync(r.planPath, "utf8"), r.planPath);
    const pws = record.legs.find((l) => l.leg_id === "s1").waypoints[0].paragraph_waypoints;
    const want = [{ performs: "PERFORMS-s1-1 flags the case as hard and announces the simplification." },
      { point: "PW-s1-1-2 the paragraph establishes its point.", serves: ["L1"], cast: {} }];
    if (JSON.stringify(pws) !== JSON.stringify(want)) {
      fails.push(`(p) the ParagraphPlan file does not carry the performs entry on Segment 1 and the point entry after it: ${JSON.stringify(pws)}`);
    }
  }
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judges.length || !judges.every((p) => p.includes('"performs": "PERFORMS-'))) fails.push("(p) the judge's input does not carry the performs Paragraph Waypoint");
  if (!plans.length || !plans.every((p) => critOf(p, "FORM").includes("acts on the reader's reading, where it carries `performs`"))) {
    fails.push("(p) a plan prompt's row does not say when a Paragraph Waypoint carries performs");
  }
  // kogaki#1485: the planner's bound and the judge's mirror, by their words.
  for (const words of ["the operation alone", "no clause stating what the reader then takes"]) {
    if (!plans.length || !plans.every((p) => critOf(p, "FORM").includes(words))) fails.push(`(p) a plan prompt's FORM does not carry "${words}"`);
  }
  if (!judges.length || !judges.every((p) => critOf(p, "PERFORMS IS BARE").includes("the reader's resulting reading"))) {
    fails.push("(p) a judge prompt's PERFORMS IS BARE does not refuse a clause stating the reader's resulting reading");
  }
}
{
  const r = runStage("performs-purpose", legs, "performs-purpose", moves);
  if (r.started.status !== 0) fails.push(`(p) start failed on the purpose-clause plan: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(p) await did not finish the purpose-clause job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const s1Plans = retriesOf(r.prompts, "s1");
  const named = "PURPOSE-SENTENCE Paragraph Waypoint 1 carries performs with the clause";
  // Both Leg Waypoints carry the defect, each repaired at its own site (kogaki#1642).
  if (s1Plans.length !== 3 || !retryText(s1Plans[1]).includes(named) || !retryText(s1Plans[1]).includes("what follows is taken as an admitted shortcut")) {
    fails.push(`(p) the judge's refusal naming the performs entry and its so-that clause did not reach Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
  if (!existsSync(r.planPath)) fails.push("(p) no ParagraphPlan file was written once the performs entry named the operation alone");
  else {
    const record = parseYaml(readFileSync(r.planPath, "utf8"), r.planPath);
    const performs = record.legs.find((l) => l.leg_id === "s1").waypoints[0].paragraph_waypoints[0].performs;
    if (performs !== "PERFORMS-s1-1 announces the simplification.") {
      fails.push(`(p) the ParagraphPlan file does not carry the bare-operation performs entry that fits: ${JSON.stringify(performs)}`);
    }
  }
}
{
  const s1 = legs.find((l) => l.leg_id === "s1");
  const leg0 = { leg_id: "s1", waypoints: s1.waypoints };
  const plan = (pws0) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0".repeat(64) },
    legs: [{ leg_id: "s1", waypoints: [{ waypoint: 1, paragraph_waypoints: pws0 },
      { waypoint: 2, join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] }] });
  const allPerforms = paragraphPlanShapeRefusal(plan([{ performs: "announces the simplification." }]), "plan.yaml", [leg0]) || "";
  if (!allPerforms.includes("none of its Paragraph Waypoints carries a `point`")) {
    fails.push(`(p) the plan reader did not refuse a Leg Waypoint none of whose Paragraph Waypoints carries a point: ${allPerforms}`);
  }
  const mixed = paragraphPlanShapeRefusal(plan([{ performs: "announces.", serves: ["L1"] }, { point: "a point.", serves: ["L1"], cast: {} }]), "plan.yaml", [leg0]) || "";
  if (!mixed.includes("carries `performs` beside `serves`")) fails.push(`(p) the plan reader did not refuse a performs entry carrying serves: ${mixed}`);
  // the ordinal a refusal names is the entry's own place, counting the performs entry before it.
  const second = paragraphPlanShapeRefusal(plan([{ performs: "announces." }, { point: "", serves: ["L1"], cast: {} }]), "plan.yaml", [leg0]) || "";
  if (!second.includes("waypoint 2 has an empty point")) fails.push(`(p) a refusal of a point entry after a performs entry does not name it by its own number: ${second}`);
  const ok = paragraphPlanShapeRefusal(plan([{ performs: "announces." }, { point: "a point.", serves: ["L1"], cast: {} }]), "plan.yaml", [leg0]);
  if (ok !== null) fails.push(`(p) the plan reader refused a performs entry beside a point entry: ${ok}`);
}

// (l) THE JOIN IS A TYPED RELATION (kogaki#1411, kogaki#1477): the plan row asks for the join
// and names every word of the set with its definition, read from JOIN_TYPES; the judge row carries
// the set and the deferral clause, and is handed the join; neither carries the retired noun-phrase
// test. A plan answering a sentence for `join` is refused by the validator naming the entry, the
// refusal reaching the next plan Round, after which the stage finishes with a type word.
{
  const r = runStage("join-sentence", legs, "join-sentence", moves);
  if (r.started.status !== 0) fails.push(`(l) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(l) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"') && p.includes('"leg_id": "s1"'));
  if (!plans.length || !plans.every((p) => critOf(p, "JOIN").includes("choose its `join`"))) fails.push("(l) a plan prompt's JOIN does not ask for the join");
  for (const [word, definition] of Object.entries(JOIN_TYPES)) {
    const named = `\`${word}\` -- ${definition}`;
    if (!plans.every((p) => p.includes(named))) fails.push(`(l) a plan prompt's row does not name \`${word}\` with its definition`);
    if (!judges.length || !judges.every((p) => p.includes(named))) fails.push(`(l) a judge prompt's row does not name \`${word}\` with its definition`);
  }
  if (plans.some((p) => p.includes("names no noun phrase")) || judges.some((p) => p.includes("names no noun phrase"))) {
    fails.push("(l) a row still carries the retired join test (\"names no noun phrase\")");
  }
  if (!judges.length || !judges[0].includes('"join": "consequence"')) fails.push("(l) the judge call is not handed the join");
  const s1Plans = retriesOf(r.prompts, "s1");
  if (s1Plans.length !== 2 || !retryText(s1Plans[1]).includes("Waypoint 2 carries a sentence for `join`")) {
    fails.push(`(l) the validator's refusal of a sentence join, naming the entry, did not reach Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
  if (existsSync(r.planPath) && !/join: consequence\n/.test(readFileSync(r.planPath, "utf8"))) fails.push("(l) the ParagraphPlan file does not carry the re-planned type word");
}

// (m) THE JOIN'S PLACE AND SET ARE READ (kogaki#1411, kogaki#1477): the plan reader refuses a
// missing, an empty and a misplaced join, a sentence and a word outside the set, by name; the plan
// call's validator refuses the same; the Brief's Leg Waypoint rule refuses `join` on a Brief.
{
  const pw = (serves) => [{ point: "a point.", serves, cast: {} }];
  const record = (w1, w2) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", waypoints: [{ waypoint: 1, ...w1, paragraph_waypoints: pw(["L1"]) }, { waypoint: 2, ...w2, paragraph_waypoints: pw(["L1", "L2"]) }] },
      { leg_id: "s2", waypoints: [{ waypoint: 1, paragraph_waypoints: pw(["L2"]) }] }] });
  const good = paragraphPlanShapeRefusal(record({}, { join: "contrast" }), "plan.yaml", legs);
  if (good !== null) fails.push(`(m) the plan reader refused a type word on the second Leg Waypoint: ${good}`);
  for (const [label, w1, w2, want, issue] of [["missing", {}, {}, "carries no `join`", "kogaki#1411"],
    ["empty", {}, { join: " " }, "carries an empty `join`", "kogaki#1411"],
    ["misplaced", { join: "contrast" }, { join: "contrast" }, "the first Leg Waypoint of a Leg carries no join", "kogaki#1411"],
    ["sentence", {}, { join: "The overwrite takes up the edit." }, "Waypoint 2 carries a sentence for `join`", "kogaki#1477"],
    ["outside-the-set", {}, { join: "addition" }, "carries the word \"addition\", which is outside the set", "kogaki#1477"]]) {
    const r = paragraphPlanShapeRefusal(record(w1, w2), "plan.yaml", legs) || "";
    if (!r.includes(want) || !r.includes(issue)) fails.push(`(m) the plan reader did not refuse a ${label} join by name: ${r}`);
    const unit = { version: "1", leg_id: "s1", waypoints: [
      { waypoint: 1, move: "p1", why: "its before holds the state.", ...w1, paragraph_waypoints: pw(["L1"]) },
      { waypoint: 2, move: "p1", why: "its before holds the state.", ...w2, paragraph_waypoints: pw(["L1", "L2"]) }] };
    const v = validateParagraphPlanUnit(unit, { legs: legs.map(planLeg), movesDir: moves }, "leg-1");
    if (!(v.error || "").includes(want)) fails.push(`(m) the plan call's validator did not refuse a ${label} join by name: ${JSON.stringify(v)}`);
  }
  const briefBad = waypointsRefusal([{ point: "a point.", serves: ["L1"], join: "contrast" }], ["L1"], "the Brief, leg s1") || "";
  if (!briefBad.includes("carries `join`") || !briefBad.includes("kogaki#1411")) fails.push(`(m) the Brief's Leg Waypoint rule did not refuse \`join\` by name: ${briefBad}`);
}

// (y) THE CAST IS A CLOSED MAP (kogaki#1695): the plan reader and the plan call's validator
// accept `{ terse: true }` and `{}` on a point Paragraph Waypoint, and refuse a key outside the
// set, a value that is not a boolean, a cast that is not a map and a missing cast, each naming
// the key or the Paragraph Waypoint, and a cast on a `performs` Paragraph Waypoint.
{
  const record = (pws1) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", waypoints: [{ waypoint: 1, paragraph_waypoints: pws1 },
      { waypoint: 2, join: "contrast", paragraph_waypoints: [{ point: "b point.", serves: ["L1", "L2"], cast: {} }] }] },
      { leg_id: "s2", waypoints: [{ waypoint: 1, paragraph_waypoints: [{ point: "c point.", serves: ["L2"], cast: {} }] }] }] });
  const unit = (pws1) => ({ version: "1", leg_id: "s1", waypoints: [
    { waypoint: 1, move: "p1", why: "its before holds the state.", paragraph_waypoints: pws1 },
    { waypoint: 2, move: "p1", why: "its before holds the state.", join: "contrast", paragraph_waypoints: [{ point: "b point.", serves: ["L1", "L2"], cast: {} }] }] });
  const point = (extra) => ({ point: "a point.", serves: ["L1"], ...extra });
  for (const [label, pws1, want] of [
    ["terse", [point({ cast: { terse: true } })], null],
    ["empty", [point({ cast: {} })], null],
    ["outside-the-set", [point({ cast: { brief: true } })], "carries the cast key `brief`, which is outside the set"],
    ["non-boolean", [point({ cast: { terse: "yes" } })], "carries the cast key `terse` with \"yes\", not a boolean"],
    ["not-a-map", [point({ cast: ["terse"] })], "carries a `cast` that is not a map"],
    ["missing", [point({})], "Paragraph Waypoint 1 carries no `cast`"],
    ["on-performs", [{ performs: "turns.", cast: {} }], "Paragraph Waypoint 1 carries `cast` on a `performs` Paragraph Waypoint"]]) {
    const r = paragraphPlanShapeRefusal(record(pws1), "plan.yaml", legs);
    const v = validateParagraphPlanUnit(unit(pws1), { legs: legs.map(planLeg), movesDir: moves }, "leg-1").error || null;
    for (const [reader, got] of [["plan reader", r], ["plan call's validator", v]]) {
      if (want === null ? got !== null : !(got || "").includes(want) || !(got || "").includes("kogaki#1695")) {
        fails.push(`(y) the ${reader} ${want === null ? "refused" : "did not refuse"} a ${label} cast${want === null ? "" : " by name"}: ${got}`);
      }
    }
  }
}

// (n) THE JOIN REACHES THE WRITER (kogaki#1411): the Opens-from line sits under its Leg
// Waypoint and before its Paragraph Waypoints; a Leg Waypoint without a join renders none; the
// template carries the instruction and the Move-boundary sentence.
{
  const s1 = legs.find((l) => l.leg_id === "s1");
  const rendered = waypointLines({ claims: s1.claims, waypoints: [
    { ...s1.waypoints[0], paragraph_waypoints: [{ point: "PW-1-1.", serves: ["L1"], cast: {} }] },
    { ...s1.waypoints[1], join: "contrast", paragraph_waypoints: [{ point: "PW-2-1.", serves: ["L1", "L2"], cast: {} }] }] }) || "";
  const lines = rendered.split("\n");
  const want = ["1. ", "   1. PW-1-1.", "2. ", "   *Opens from:* contrast", "   1. PW-2-1."];
  if (lines.length !== want.length || !want.every((w, i) => lines[i].startsWith(w))) {
    fails.push(`(n) waypointLines does not render the Opens-from line under its Leg Waypoint and before its Paragraph Waypoints, and none elsewhere: ${JSON.stringify(rendered)}`);
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
  const handed = segmentsForPlanCall(segs);
  if (JSON.stringify(handed) !== JSON.stringify([{ segment: 1, operation: "sets up the point.", relation: "", manner: "" },
    { segment: 2, operation: "makes the point.", relation: "answers the setup.", manner: MANNER }])) {
    fails.push(`(t) the plan call is not handed each Segment's operation, relation and manner: ${JSON.stringify(handed)}`);
  }
  const movesManner = isolatedLibrary("moves-t", { id: "p9", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: "names a case." }] });
  writeMove(movesManner, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ operation: PSEG_OPERATION, manner: MANNER }] });
  const run = runStage("manner", legs, "ok", movesManner);
  const planCalls = run.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  if (!planCalls.length || !planCalls.every((p) => p.includes(`"manner": "${MANNER}"`))) {
    fails.push("(t) the plan call of a job binding a Move whose Segment carries a manner is not handed that manner, so the absence below reads nothing");
  } else if (!existsSync(run.planPath)) {
    fails.push(`(t) the job binding a manner-bearing Move wrote no plan file: ${(run.awaited && run.awaited.stdout) || (run.started && run.started.stderr)}`);
  } else {
    const planText = readFileSync(run.planPath, "utf8");
    const pws = parseYaml(planText, run.planPath).legs.flatMap((l) => l.waypoints.flatMap((w) => w.paragraph_waypoints));
    if (!pws.length || pws.some((p) => Object.hasOwn(p, "manner")) || planText.includes(MANNER)) {
      fails.push(`(t) the plan written from a Move whose Segment carries a manner holds a manner on a Paragraph Waypoint: ${JSON.stringify(pws)}`);
    }
  }
  const unit = { version: "1", leg_id: "s1", waypoints: [
    { waypoint: 1, move: "p1", why: "its before holds the state.", paragraph_waypoints: [{ point: "a point.", serves: ["L1"], manner: MANNER, cast: {} }] },
    { waypoint: 2, move: "p1", why: "its before holds the state.", join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] };
  const v = validateParagraphPlanUnit(unit, { legs: legs.map(planLeg), movesDir: moves }, "leg-1");
  if (!(v.error || "").includes("Paragraph Waypoint 1 carries `manner`")) fails.push(`(t) a planner answer carrying \`manner\` was not refused by name: ${JSON.stringify(v)}`);
  const record = (pw1) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", waypoints: [{ waypoint: 1, paragraph_waypoints: pw1 }, { waypoint: 2, join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] },
      { leg_id: "s2", waypoints: [{ waypoint: 1, paragraph_waypoints: [{ point: "a point.", serves: ["L2"], cast: {} }] }] }] });
  const clean = paragraphPlanShapeRefusal(record([{ point: "a point.", serves: ["L1"], cast: {} }, { performs: "turns." }]), "plan.yaml", legs);
  if (clean !== null) fails.push(`(t) the plan reader refused a plan file carrying no manner: ${clean}`);
  const onPoint = paragraphPlanShapeRefusal(record([{ point: "a point.", serves: ["L1"], cast: {} }, { point: "b point.", serves: ["L1"], manner: MANNER, cast: {} }]), "plan.yaml", legs) || "";
  if (!onPoint.includes("Paragraph Waypoint 2 carries `manner`")) fails.push(`(t) the plan reader did not refuse a manner on a point Paragraph Waypoint, naming it: ${onPoint || "no refusal"}`);
  const onPerforms = paragraphPlanShapeRefusal(record([{ point: "a point.", serves: ["L1"], cast: {} }, { performs: "turns.", manner: MANNER }]), "plan.yaml", legs) || "";
  if (!onPerforms.includes("Paragraph Waypoint 2 carries `performs` beside `manner`")) fails.push(`(t) the plan reader did not refuse a manner on a performs Paragraph Waypoint, naming it: ${onPerforms || "no refusal"}`);
  const s1 = legs.find((l) => l.leg_id === "s1");
  const rendered = waypointLines({ claims: s1.claims, waypoints: [{ ...s1.waypoints[0],
    paragraph_waypoints: [{ point: "PW-1-1.", serves: ["L1"], manner: MANNER, cast: {} }, { performs: "turns.", manner: MANNER }] }] }) || "";
  const lines = rendered.split("\n");
  if (!(lines[1] || "").startsWith("   1. PW-1-1.") || lines[2] !== "   2. *turns.*" || rendered.includes("Manner:") || rendered.includes(MANNER)) {
    fails.push(`(t) waypointLines renders a Paragraph Waypoint's manner: ${JSON.stringify(rendered)}`);
  }
}

// (u) WHAT A PARAGRAPH TAKES UP AND LEAVES IS ITS MOVE'S (kogaki#1701): the ParagraphPlan carries
// no reader state, no Obligations ledger and no discharge -- each refused by name by the plan
// call's validator and the plan reader, on the record, the Leg and the entry; the plan row binds
// a Move by its `takes` and holds it to its `leaves` (BIND, LEAVE), and no row names OWE; the
// judge row judges TAKEN and LEFT, and no PRECONDITION, POSTCONDITION or PROMISE KEPT; what stands
// to be taken up at a later Leg Waypoint is what the paragraphs before it leave and no later one
// takes up; and a Brief Leg binding a Move the library does not hold stops at start by name.
{
  const planPrompts = okPrompts.filter((p) => p.includes('"leg_you_must_plan"'));
  if (!planPrompts.length || !planPrompts.every((p) => critOf(p, "BIND").includes("`takes`") && critOf(p, "BIND").includes("`stands_to_be_taken_up`"))) {
    fails.push("(u) a plan prompt's BIND does not bind a Move by its `takes` against what stands to be taken up (kogaki#1701)");
  }
  if (!planPrompts.every((p) => critOf(p, "LEAVE").includes("`leaves`") && critOf(p, "LEAVE").includes("`leaves_for_next_leg`"))) {
    fails.push("(u) a plan prompt carries no LEAVE holding a bound Move's `leaves` to a later paragraph or the Leg's `leaves_for_next_leg` (kogaki#1701)");
  }
  if (planPrompts.some((p) => critOf(p, "OWE"))) fails.push("(u) a plan prompt still carries the OWE criterion, retired (kogaki#1701)");
  const judgePrompts = okPrompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judgePrompts.length || !judgePrompts.every((p) => critOf(p, "TAKEN") && critOf(p, "LEFT"))) fails.push("(u) a judge prompt does not judge TAKEN and LEFT (kogaki#1701)");
  for (const gone of ["PRECONDITION", "POSTCONDITION", "PROMISE KEPT"]) {
    if (judgePrompts.some((p) => critOf(p, gone))) fails.push(`(u) a judge prompt still judges ${gone}, retired (kogaki#1701)`);
  }

  // THE RETIRED KEYS, REFUSED BY NAME AT EVERY READ.
  const planned = { legs: legs.map((l) => planLeg(l)), movesDir: moves };
  const unit = (top, entry) => ({ version: "1", leg_id: "s1", ...top, waypoints: [
    { waypoint: 1, move: "p1", why: "its takes are met.", ...entry, paragraph_waypoints: [{ point: "a point.", serves: ["L1"], cast: {} }] },
    { waypoint: 2, move: "p1", why: "its takes are met.", join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] });
  const record = (leg, entry) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0" },
    legs: [{ leg_id: "s1", ...leg, waypoints: [{ waypoint: 1, ...entry, paragraph_waypoints: [{ point: "a point.", serves: ["L1"], cast: {} }] },
      { waypoint: 2, join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"], cast: {} }] }] },
    { leg_id: "s2", waypoints: [{ waypoint: 1, paragraph_waypoints: [{ point: "a point.", serves: ["L2"], cast: {} }] }] }] });
  const VALUES = { reader_state_before: { knowledge: "before." }, reader_state_after: { knowledge: "after." },
    obligations: [{ opened_by: 1, items: [{ item: "which edit survives?", closed_by: 2 }] }], discharges: [{ obligation: 1, by: 1 }] };
  for (const key of ["reader_state_before", "reader_state_after", "obligations", "discharges"]) {
    const named = `carries \`${key}\`, retired from the ParagraphPlan (kogaki#1701)`;
    for (const [where, v, r] of [
      ["the Leg", validateParagraphPlanUnit(unit({ [key]: VALUES[key] }, {}), planned, "leg-1").error || "", paragraphPlanShapeRefusal(record({ [key]: VALUES[key] }, {}), "plan.yaml", legs) || ""],
      ["a Leg Waypoint entry", validateParagraphPlanUnit(unit({}, { [key]: VALUES[key] }), planned, "leg-1").error || "", paragraphPlanShapeRefusal(record({}, { [key]: VALUES[key] }), "plan.yaml", legs) || ""]]) {
      if (!v.includes(named)) fails.push(`(u) the plan call's validator did not refuse \`${key}\` on ${where} by name: ${v || "no refusal"}`);
      if (!r.includes(named) || !r.includes("leg s1")) fails.push(`(u) the plan reader did not refuse \`${key}\` on ${where} by name: ${r || "no refusal"}`);
      if (where !== "the Leg" && !r.includes("Waypoint 1")) fails.push(`(u) the plan reader's refusal of \`${key}\` does not name the Leg Waypoint: ${r}`);
    }
  }

  // WHAT STANDS TO BE TAKEN UP AT A LATER LEG WAYPOINT: the first's list, plus what each paragraph
  // before leaves, less what a paragraph before takes up by the same kind and `what`.
  const contracts = { opens: { takes: [], leaves: [{ kind: "answer", what: "which edit survives?", segment: 1 }, { kind: "explain", what: "the kit stamp.", segment: 1 }] },
    answers: { takes: [{ kind: "answer", what: "which edit survives?" }], leaves: [] } };
  const pl = planLeg({ leg_id: "s2", waypoints: [1, 2, 3].map((n) => ({ point: `point ${n}.`, serves: ["L1"], case: "own" })) },
    { previousLeaves: [{ kind: "carry", what: "the copy as a lease.", segment: 1 }], previousLegId: "s1", leaves: [] });
  const entries = [{ move: "opens" }, { move: "answers" }];
  const at2 = standsToBeTakenUp(pl, entries, 2, (id) => contracts[id]);
  const at3 = standsToBeTakenUp(pl, entries, 3, (id) => contracts[id]);
  const want2 = [{ kind: "carry", what: "the copy as a lease.", left_by: "Leg s1" }, { kind: "answer", what: "which edit survives?", left_by: "Leg Waypoint 1" },
    { kind: "explain", what: "the kit stamp.", left_by: "Leg Waypoint 1" }];
  if (JSON.stringify(at2) !== JSON.stringify(want2)) fails.push(`(u) what stands to be taken up at Leg Waypoint 2 is not the first's list and what Leg Waypoint 1's Move leaves: ${JSON.stringify(at2)}`);
  if (JSON.stringify(at3) !== JSON.stringify([want2[0], want2[2]])) fails.push(`(u) what Leg Waypoint 2's Move takes up still stands at Leg Waypoint 3: ${JSON.stringify(at3)}`);
  if (JSON.stringify(pl.waypoints[0].stands_to_be_taken_up) !== JSON.stringify([want2[0]]) || "stands_to_be_taken_up" in pl.waypoints[1]) {
    fails.push(`(u) planLeg does not hand the first Leg Waypoint alone what the previous Leg's Move leaves: ${JSON.stringify(pl.waypoints)}`);
  }
  const first = planLeg(legs[0], { priorKnowledge: "knows what an installer is." }).waypoints[0].stands_to_be_taken_up;
  if (JSON.stringify(first) !== JSON.stringify([{ what: "knows what an installer is.", left_by: PRIOR_KNOWLEDGE }])) {
    fails.push(`(u) the first Leg's first Leg Waypoint is not handed the Persona's prior knowledge: ${JSON.stringify(first)}`);
  }

  // A LEG BINDS NO MOVE (kogaki#1768): a Leg's `move` is not read, so naming one the library does not
  // hold refuses nothing, and no Leg leaves anything for the next.
  const opts = planLegOptions(legs.map((l) => ({ ...l, move: "absent_leg_move" })), [], "knows what an installer is.");
  if (opts.some((o) => o.error || o.leaves.length || o.previousLeaves.length)) fails.push(`(u) planLegOptions still reads a Leg's Move: ${JSON.stringify(opts)}`);

  // NO RECORD REACHES THE PACKET (kogaki#1584): the template's waypoints block names no Promise or Keeps line.
  const t = readFileSync("src/packet-template.md", "utf8");
  const block = t.slice(t.indexOf("## The waypoints this Leg takes the reader through"), t.indexOf("{{waypoints}}"));
  if (block.includes("*Promise:*") || block.includes("*Keeps:*")) fails.push("(u) src/packet-template.md's waypoints block still names a Promise or Keeps line");
}

// (d) a Brief whose Leg Waypoint carries move or segments is refused at start, by name.
for (const k of ["move", "segments"]) {
  const bad = legs.map((l) => ({ ...l }));
  const text = briefText(bad).replace(/(\n(\s*)- serves:)/, `\n$2- ${k}: p1$1`.replace("- serves:", "  serves:"));
  const dir = join(root, `retired-${k}`, "theses", "plan-brief");
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, text);
  const r = spawnSync(process.execPath, [join(repo, "src", "paragraph-plan.mjs"), "start", "--brief", briefPath, "--moves-dir", moves],
    { cwd: repo, encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: "/bin/false" } });
  if (!text.includes(`${k}: p1`)) fails.push(`(d) fixture: the ${k} line was not written into the Brief`);
  else if (r.status === 0 || !(r.stderr || "").includes(`\`${k}\``) || !(r.stderr || "").includes("retired")) {
    fails.push(`(d) start did not refuse a Leg Waypoint carrying \`${k}\` by name: ${(r.stderr || r.stdout || "").slice(0, 400)}`);
  }
  if (readdirSync(dir).includes(PARAGRAPH_PLAN_FILE)) fails.push(`(d) a ParagraphPlan file was written for a Brief carrying \`${k}\``);
}

// (e) THE SKILL NAMES ONLY WHAT THE HARNESS HAS: every `node src/<module> <subcommand>` the
// tracked skill file names is a module in this tree whose CLI handles that subcommand.
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

// (s) THE ROWS ARE NAMED CRITERIA UNDER A BOUND (kogaki#1511): the prompts (a)'s job actually
// sent carry the judge's registry axes and the planner's named steps, each one sentence
// under `criteria.words_max`, and the stage's own reader refuses a row that grows past it -- a
// second sentence, a criterion over the bound, an Issue number inside one, a criterion the
// table does not name, or growth around the criteria past `point_words_max`.
{
  const table = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));
  const bound = table.criteria || {};
  // The judge's criteria are the axes of src/paragraph-plan-axes.json, named nowhere else (kogaki#1533).
  const axes = readAxes().axes;
  const names = { paragraph_plan_unit: bound.paragraph_plan_unit, paragraph_plan_judge_unit: axes.map((a) => a.id) };
  if (Object.hasOwn(bound, "paragraph_plan_judge_unit")) fails.push("(s) `criteria` names judge criteria beside the axis registry");
  const tree = criteriaFailures(table);
  if (tree.length) fails.push(`(s) the tree's rows fail their bound: ${tree.join("; ")}`);
  const sent = [["paragraph_plan_unit", okPrompts.find((p) => p.includes('"leg_you_must_plan"'))],
    ["paragraph_plan_judge_unit", okPrompts.find((p) => p.includes('"leg_you_must_judge"'))]];
  for (const [key, prompt] of sent) {
    const got = prompt ? criteriaOf(prompt) : [];
    if (!got.length || JSON.stringify(got.map((c) => c.name)) !== JSON.stringify(names[key])) {
      fails.push(`(s) the ${key} prompt the job sent carries ${JSON.stringify(got.map((c) => c.name))}, not ${JSON.stringify(names[key])}`);
    }
    for (const c of got) {
      const n = c.text.split(/\s+/).length;
      if (!/[.]$/.test(c.text) || /[.;!?]\s/.test(c.text) || n > bound.words_max) {
        fails.push(`(s) the ${key} prompt's ${c.name} is not one sentence within ${bound.words_max} words (${n})`);
      }
    }
  }
  const grown = (edit) => { const t = JSON.parse(JSON.stringify(table)); edit(t); return criteriaFailures(t).join("; "); };
  // The judge row's axes are written into its text first, so a mutation edits the rendered line.
  const line = (t, name, f) => {
    const row = t.paragraph_plan_judge_unit;
    if (row.axes_file) { row.judgment_point = row.judgment_point.replace("{{axes}}", axes.map((a) => `- ${a.id}: ${a.sentence}`).join("\n")); delete row.axes_file; }
    const jp = row.judgment_point;
    const at = jp.indexOf(`\n- ${name}: `) + 1;
    const end = jp.indexOf("\n", at);
    t.paragraph_plan_judge_unit.judgment_point = jp.slice(0, at) + f(jp.slice(at, end)) + jp.slice(end);
  };
  const cases = [
    ["a second sentence", (t) => line(t, axes[0].id, (l) => `${l} As on one run, a restated operation does not fit.`), `${axes[0].id} is not one sentence`],
    ["an Issue number", (t) => line(t, axes[axes.length - 1].id, (l) => l.replace(/[.]$/, " (kogaki#1477).")), `${axes[axes.length - 1].id} carries an Issue number`],
    ["a word over the bound", (t) => { t.criteria.words_max = 20; }, "over the bound of 20"],
    ["a criterion the registry does not name", (t) => line(t, axes[axes.length - 1].id, (l) => `${l}\n- SEVENTH: The join is judged.`), '"SEVENTH"]'],
    ["text around the criteria", (t) => { t.paragraph_plan_judge_unit.judgment_point += " Judge carefully.".repeat(300); }, "rendered judgment point runs"],
    ["a second sentence in a shared block", (t) => { t.shared_text.operation_is_performed += " It is never content."; }, "shared text operation_is_performed is not one sentence"],
  ];
  for (const [what, edit, want] of cases) {
    const why = grown(edit);
    if (!why.includes(want)) fails.push(`(s) a judge row grown by ${what} is not refused naming it: ${why || "no refusal"}`);
  }
}

// (x) EVERY DESIGN REFUSAL, BY NAME, AT EVERY READ (kogaki#1639): the plan reader (what /draft
// and the Proof Sheet open) and the plan call's validator refuse, naming the Leg and the
// Waypoint, an entry carrying `reader_state_before`, an undeclared key, no `move`, a `move`
// naming no Move in the open library, a term the Leg does not introduce, a Leg term introduced
// by two paragraphs, a dependency or a re-activation on this paragraph, a later one
// or another Leg, a material outside the parent's `serves`, a last paragraph whose after-state
// is not the Leg's, and an after-state out of the Leg's shape. The readers are the raw ones.
{
  const s1 = { ...legs[0], introduces: [TERM] };
  const L = [s1, legs[1]];
  const E = (n, over = {}) => ({ ...fillEntry({ waypoint: n, ...(n > 1 ? { join: "contrast" } : {}),
    paragraph_waypoints: [{ point: "a point.", serves: n === 1 ? ["L1"] : ["L1", "L2"], cast: {} }] }, n - 1, s1, 2), ...over });
  const rec = (w1, w2) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0".repeat(64) },
    legs: [{ leg_id: "s1", waypoints: [E(1, w1), E(2, w2)] },
      { leg_id: "s2", waypoints: [fillEntry({ waypoint: 1, paragraph_waypoints: [{ point: "a point.", serves: ["L2"], cast: {} }] }, 0, legs[1], 1)] }] });
  const unit = (w1, w2) => ({ version: "1", leg_id: "s1", waypoints: [E(1, w1), E(2, w2)] });
  const planned = { legs: L.map((l) => planLeg(l, [])), movesDir: moves };
  const clean = rawPlanShapeRefusal(rec({}, {}), "plan.yaml", L);
  if (clean !== null) fails.push(`(x) the plan reader refused a well-formed record: ${clean}`);
  const cleanUnit = rawValidateUnit(unit({}, {}), planned, "leg-1").error;
  if (cleanUnit) fails.push(`(x) the validator refused a well-formed answer: ${cleanUnit}`);
  const cases = [
    ["a written `reader_state_before`", {}, { reader_state_before: { knowledge: "after 1." } }, ["Waypoint 2", "carries `reader_state_before`, retired from the ParagraphPlan (kogaki#1701)"]],
    ["an undeclared key", {}, { segments: [] }, ["Waypoint 2", "carries `segments`"]],
    ["a Move field beside the id", {}, { before: "knowledge: x." }, ["Waypoint 2", "carries `before`"]],
    ["no `move`", {}, { move: "" }, ["Waypoint 2", "carries no `move`"]],
    ["a `move` naming no Move in the library", {}, { move: "p-nowhere" }, ["Waypoint 2", "\"p-nowhere\"", "names no Move in the library"]],
    ["a term the Leg does not introduce", {}, { introduces: [{ term: "other", meaning: "a meaning." }] }, ["Waypoint 2", "introduces \"other\"", "does not introduce"]],
    ["a Leg term introduced by two paragraphs", {}, { introduces: [TERM] }, ["\"kit stamp\"", "introduced by paragraphs 1 and 2"]],
    ["a dependency on this paragraph", {}, { depends_on: [2] }, ["Waypoint 2", "depends on 2", "only on an earlier paragraph"]],
    ["a dependency on a later paragraph", { depends_on: [2] }, {}, ["Waypoint 1", "depends on 2", "none before this one"]],
    ["a dependency on another Leg", {}, { depends_on: ["s2"] }, ["Waypoint 2", "depends on \"s2\"", "another Leg"]],
    ["a re-activation of this paragraph", {}, { "re-activate": ["2 term kit stamp"] }, ["Waypoint 2", "re-activates \"2 term kit stamp\"", "earlier paragraph"]],
    ["a re-activation from another Leg", {}, { "re-activate": ["s2 claim L2 as the copy is the installer's."] }, ["Waypoint 2", "names \"s2\"", "another Leg"]],
    ["a re-activated term the paragraph does not introduce", { introduces: [TERM] }, { "re-activate": ["1 term other"] }, ["Waypoint 2", "paragraph 1 does not introduce \"other\""]],
    ["a re-activated claim the paragraph does not stand on", {}, { "re-activate": ["1 claim L2 as the copy is refreshed."] }, ["Waypoint 2", "paragraph 1 does not stand on \"L2\""]],
    ["a material outside the parent's serves", { materials: ["L2"] }, {}, ["Waypoint 1", "names \"L2\" in `materials`", "does not serve"]],
    ["a written `reader_state_after`", {}, { reader_state_after: { knowledge: "after 2." } }, ["Waypoint 2", "carries `reader_state_after`, retired from the ParagraphPlan (kogaki#1701)"]],
    ["the retired `why`", {}, { why: "its before holds the state." }, ["Waypoint 2", "`why`"]],
  ];
  for (const [what, w1, w2, wants] of cases) {
    const r = rawPlanShapeRefusal(rec(w1, w2), "plan.yaml", L, { library: new Set(["p1", "p4"]) }) || "";
    const v = rawValidateUnit(unit(w1, w2), planned, "leg-1").error || "";
    for (const [reader, got] of [["plan reader", r], ["validator", v]]) {
      if (!got.includes("s1") || !wants.every((x) => got.includes(x))) fails.push(`(x) the ${reader} did not refuse ${what} by name: ${got || "no refusal"}`);
    }
  }
  // Without a library open, the plan reader checks the id's presence and leaves its existence to
  // a read that has the library (the validator and the Proof Sheet): /draft opens no Move (kogaki#1311).
  const noLib = rawPlanShapeRefusal(rec({}, { move: "p-nowhere" }), "plan.yaml", L);
  if (noLib !== null) fails.push(`(x) the plan reader with no library open refused a Move id it cannot check: ${noLib}`);
  // The first paragraph's dependency on the one before it and a re-activation of a term and a
  // claim from an earlier paragraph are well formed.
  const ok = rawPlanShapeRefusal(rec({ introduces: [TERM] }, { introduces: [], "re-activate": ["1 term kit stamp", "1 claim L1 as the installer writes into the tree."] }), "plan.yaml", L);
  if (ok !== null) fails.push(`(x) the plan reader refused a well-formed re-activation: ${ok}`);
  // A LEG TERM MAY BE PLACED NOWHERE (kogaki#1663): a Leg term introduced by no paragraph is read
  // by both readers, and one introduced by two is refused.
  const R = [{ ...s1, introduces: [TERM, ...REFERENTS] }, legs[1]];
  const refPlanned = { legs: R.map((l) => planLeg(l, [])), movesDir: moves };
  const bare = rawPlanShapeRefusal(rec({ introduces: [] }, {}), "plan.yaml", R);
  const bareUnit = rawValidateUnit(unit({ introduces: [] }, {}), refPlanned, "leg-1").error;
  if (bare !== null || bareUnit) fails.push(`(x) a Leg term introduced by no paragraph was refused: ${bare || bareUnit}`);
  const twiceRef = rawValidateUnit(unit({ introduces: [TERM, REFERENTS[0]] }, { introduces: [REFERENTS[0]] }), refPlanned, "leg-1").error || "";
  if (!twiceRef.includes("\"installer\"") || !twiceRef.includes("introduced by paragraphs 1 and 2")) {
    fails.push(`(x) a Leg term introduced by two paragraphs was not refused by name: ${twiceRef || "no refusal"}`);
  }
  // NO DEFINING SEGMENT IS OWED (kogaki#1663): the paragraph introducing "kit stamp" under p1,
  // whose one Segment states, is admitted.
  const unbound = rawValidateUnit(unit({ move: "p1", introduces: [TERM] }, {}), planned, "leg-1").error;
  if (unbound) fails.push(`(x) a term introduced under a Move with no defining Segment was refused: ${unbound}`);
}

// (z) THE MAPPER IN PARAGRAPHPLAN (kogaki#1734): reading, bind, grounding, the Paragraph Waypoints call.
{
  stageSettings = settingsWith(true);
  const mapLegs = [leg("m1", [{ strand: "L1", proposition: C1 }], [
    { point: "A rule set only sees what reaches the checks it was written for.", serves: ["L1"], case: "apart" },
    { point: "The installer only sees the edits that reach the copy it writes.", serves: ["L1"], case: "own" }])];
  const r = runStage("mapper", mapLegs, "mapper");
  stageSettings = settingsWith(false);
  const said = `${r.started.stdout}${r.started.stderr}${r.awaited ? r.awaited.stdout + r.awaited.stderr : ""}`;
  const input = (p) => JSON.parse(p.slice(p.lastIndexOf(JUDGE_INPUT_MARKER) + JUDGE_INPUT_MARKER.length));
  const planning = (p) => ["leg_you_must_plan", "leg_you_must_judge", "leg_waypoint_you_must_plan"].some((k) => p.includes(`"${k}"`));
  const readings = r.prompts.filter((p) => !planning(p) && p.includes('"proposition"'));
  const groundings = r.prompts.filter((p) => !planning(p) && !p.includes('"proposition"') && p.includes('"segments"'));
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  if (!existsSync(r.planPath)) fails.push(`(z) the Mapper job wrote no plan file: ${said}`);
  if (readings.length !== 1 || input(readings[0]).proposition !== mapLegs[0].waypoints[0].point) {
    fails.push(`(z) the Leg was read ${readings.length} time(s), not once on the \`apart\` Leg Waypoint's point (its successor takes its structure)`);
  }
  if (groundings.length !== 2) fails.push(`(z) ${groundings.length} grounding call(s), not one per bound Move (2)`);
  else {
    const [g1, g2] = groundings.map(input);
    if (g1.case !== "apart" || g2.case !== "own" || g1.prior_tables || !Array.isArray(g2.prior_tables) || g2.prior_tables.length !== 1
      || g2.prior_tables[0].base.domain !== "a stadium turnstile" || !Array.isArray(g2.segments) || !g2.structure) {
      fails.push(`(z) the grounding calls did not read each Leg Waypoint's case with the Leg's earlier tables: ${JSON.stringify([g1.case, g1.prior_tables, g2.case, g2.prior_tables])}`);
    }
  }
  const bind = plans[0] ? input(plans[0]).leg_you_must_plan.waypoints : [];
  if (!bind.length || !bind.every((w) => w.structure && Array.isArray(w.structure.roles) && !w.table)) {
    fails.push(`(z) the bind call's Leg Waypoints do not carry their structure alone: ${JSON.stringify(bind).slice(0, 300)}`);
  }
  const confined = plans[1] ? input(plans[1]).leg_you_must_plan.waypoints : [];
  if (confined.length !== 2 || !confined.every((w) => w.move === "p1" && w.table && w.structure)) {
    fails.push(`(z) the Paragraph Waypoints call does not carry each Leg Waypoint's Move, table and structure: ${JSON.stringify(confined).slice(0, 300)}`);
  }
  if (!critOf(plans[0] || "", "MAP").includes("higher-order relation")) fails.push("(z) the plan row carries no MAP criterion naming the structure's relations");
  const job = JSON.parse(readFileSync(join(r.runDir, "reader-path-job.json"), "utf8"));
  const refusals = (job.units[0].refusals || []).join("\n");
  if (!/Leg m1, Waypoint 2: .*Role id "gate".*"the installer"/.test(refusals)) {
    fails.push(`(z) a Paragraph Waypoint carrying a Role id was not refused naming the Leg Waypoint, the Role and its expression: ${refusals || "no refusal"}`);
  }
  if (existsSync(r.planPath)) {
    const plan = parseYaml(readFileSync(r.planPath, "utf8"));
    const files = (plan.mapping && plan.mapping.files || []).map((f) => f.path);
    if (JSON.stringify(files) !== JSON.stringify(["m1/1/structure.yaml", "m1/1/table.yaml", "m1/2/table.yaml"])) {
      fails.push(`(z) the plan's Mapping Record is not one structure and two tables: ${JSON.stringify(files)}`);
    }
    const t1 = parseYaml(readFileSync(join(r.planPath, "..", "mapping", "m1", "1", "table.yaml"), "utf8"));
    if (t1.move !== "p1" || t1.case !== "apart" || t1.base.domain !== "a stadium turnstile") fails.push(`(z) table.yaml is not { move, case, base, correspondences }: ${JSON.stringify(t1)}`);
    const pws = plan.legs[0].waypoints.map((e) => e.paragraph_waypoints.map((p) => p.point).join(" "));
    if (!pws[1].includes("the installer") || /\bgate\b/.test(pws[1])) fails.push(`(z) the written Paragraph Waypoints are not the table's expressions: ${JSON.stringify(pws)}`);
  }
  const report = spawnSync(process.execPath, ["src/workflow/job-report.mjs", r.runDir], { cwd: repo, encoding: "utf8" });
  for (const unit of ["leg-1/reading/waypoint-1", "leg-1/grounding/waypoint-1", "leg-1/grounding/waypoint-2"]) {
    if (!(report.stdout || "").includes(`unit ${unit}:`)) fails.push(`(z) the job report does not list the Call Records of ${unit}: ${report.stdout}${report.stderr}`);
  }
  const replay = spawnSync(process.execPath, ["src/workflow/replay.mjs", join(r.runDir, "calls", "leg-1", "reading", "waypoint-1", "1"), "--mode", "model"],
    { cwd: repo, encoding: "utf8", env: { ...process.env, PP_FIXTURE_DIR: r.dir } });
  if (replay.status !== 0 || !(replay.stdout || "").startsWith("model: passed")) fails.push(`(z) replay did not re-run the reading Call Record: ${replay.stdout}${replay.stderr}`);
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan — the stage writes paragraph-plan.yaml beside the Brief as the paragraph-level Reader Path, every entry carrying the bound Move's id, materials, purpose, depends_on, rationale, introduces and re-activate beside its join and Paragraph Waypoints and nothing else of the Move, no reader state, no obligations and no discharges (kogaki#1701), the first Leg Waypoint handed what stands to be taken up (the Persona's prior knowledge on the first Leg, the previous Leg's Move's leaves on a later one) and every Leg its own Move's leaves (kogaki#1701), no term assigned to two paragraphs (kogaki#1663), every undeclared, missing or out-of-Leg field refused by name by the validator and the plan reader, and no bindings record in the run directory (kogaki#1639); the plan call carries the bound Move's segments (each Segment's number, operation, relation and manner as separate fields) and breaks and each Leg Waypoint's point, serves and next_point, and no Claim proposition; the judge call carries the bound Move's takes, leaves, segments and breaks and neither call a technique (kogaki#1412, kogaki#1701); a judge refusal is carried into the next round; a Leg Waypoint no Move fits stops after brief.unit_rounds naming the Leg and the Waypoint, and a library holding a Move with no segments stops naming the Move whether or not it carries technique, each with the Brief unchanged and no file written (kogaki#1412); a Move carrying three segments yields three Paragraph Waypoints under its Leg Waypoint, rendered as three indented lines under the revised header; a Paragraph Waypoint restating a Segment's operation is refused by the judge same as any other does-not-fit; the plan row's ORDER never states a Segment's relation (kogaki#1446); a Leg Waypoint carrying move or segments is refused at start by name; the Move record is read as YAML, its before map rendered one dimension per line, and a .md Move or a joined-line state is refused by name (kogaki#1413); every Leg Waypoint after the first carries a join and no first one does, the plan reader and the plan call's validator refuse a missing, empty or misplaced join, a sentence and a word outside the set by name, the Brief refuses one, both rows name the closed set with one definition per word and neither carries the retired noun-phrase test, a plan answering a sentence for join is refused naming the entry and re-planned (kogaki#1477), and the Packet renders each join as its Opens-from line under the template's instruction (kogaki#1411); a Segment that acts on the reader's reading carries a performs Paragraph Waypoint the plan file and the judge's input carry, and a Leg Waypoint with no point entry is refused (kogaki#1448); a performs entry carrying a clause stating the reader's resulting reading is refused naming the entry and the clause, and the bare operation fits (kogaki#1485); the plan row makes each Paragraph Waypoint the step its Segment performs toward its Leg Waypoint's point, which it may explain in its own words but not contradict or add a claim to (kogaki#1632); both rows are named one-sentence criteria within the workflow file's word bound, the judge's read from the axis registry (kogaki#1533), and a row grown past it is refused naming the criterion (kogaki#1511); the plan call is handed the Leg's introduced terms with their meanings beside the persona and no coined subset, and a term the Brief marks defined introduced at the first Leg Waypoint under a Move with no defining Segment is admitted (kogaki#1497, kogaki#1663); the plan row's BIND binds a Move by its takes against what stands to be taken up and its LEAVE holds the Move to its leaves, no row names OWE, the judge judges TAKEN and LEFT and no PRECONDITION, POSTCONDITION or PROMISE KEPT, `reader_state_before`, `reader_state_after`, `obligations` and `discharges` on a Leg or an entry are refused by name by the validator and the plan reader, what stands to be taken up at a later Leg Waypoint is what the paragraphs before it leave less what they take up, and a Brief Leg binding a Move the library does not hold stops at start by name (kogaki#1701); the plan call is handed each Segment's manner, a job binding a Move whose Segment carries one hands it to the plan call and writes a plan file holding none, a planner answer carrying one is refused by name, the plan reader refuses one on a point or a performs Paragraph Waypoint naming it, and the Packet renders no Manner label (kogaki#1585); a first Paragraph Waypoint already carrying a later Segment's result is refused naming both Paragraph Waypoints and the Segment, and the same plan with that result held to the later Paragraph Waypoint fits (kogaki#1605); the Move the stage binds is one the ingest admitted through the Adapter's validator (kogaki#1418); with the Mapper on, a Leg reads one structure per Leg Waypoint not following an `apart` one, grounds one table per bound Move, writes its Paragraph Waypoints in a plan call carrying each Move and table, refuses a Paragraph Waypoint carrying a Role id naming the Leg Waypoint, the Role and its expression, names the structures and tables in the plan's Mapping Record, and its job report lists the reading and grounding Call Records, one of which replay re-runs (kogaki#1734); the skill names only entry points the Harness has.");
JS
