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
#       judge on a first attempt is put verbatim into the second attempt's
#       prompt, beside the attempt-1 plan record it judged (kogaki#1438); the plan call is handed the Move's `segments` and `breaks`
#       beside the Leg Waypoint's own `point`, `serves` and `next_point` and
#       the persona, and NO Claim proposition (kogaki#1382); the judge call
#       is handed the four roles -- `before`, `after`, `segments` and
#       `breaks` (kogaki#1378) -- and neither call is handed a `technique`
#       (kogaki#1412).
#   (b) a Leg Waypoint no Move fits (`move: null`) refuses the unit
#       `no_paragraph_move_fits` and is asked again until `brief.unit_attempts`
#       is spent; the stage then stops naming the Leg and the Waypoint, writes
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
#       Packet carries the three indented lines under the one point, under the
#       revised header (kogaki#1381).
#   (h) a plan prompt built over a Move with three Segments carries every
#       Segment's number, `does` and `relation` as separate fields (kogaki#1414,
#       reverting the withholding of kogaki#1403), the plan row states that a
#       `does` is an operation to perform and never a point to state, and a
#       plan-call answer whose Paragraph Waypoint restates a Segment's `does` is
#       refused by the judge, put into the next attempt's prompt verbatim, same
#       as any other does-not-fit.
#   (i) the 2026-10-16 paragraph 2 plan, reproduced: a Move whose Segment 1
#       concedes a distinction is hard and promises to simplify it, and a first
#       Paragraph Waypoint stating an unrelated fact. The judge row carries the
#       per-Segment criterion, the judge call is handed that Segment's `does`
#       beside that Paragraph Waypoint, the fake judge -- which refuses only
#       where the row it was handed carries the criterion -- refuses it, and the
#       refusal reaches the next plan attempt, after which the stage finishes
#       (kogaki#1414). Whether a LIVE judge refuses it is the model's judgment.
#   (l) THE JOIN IS A TYPED RELATION (kogaki#1411, kogaki#1477): the plan row
#       asks the planner to choose a `join` on every Leg Waypoint after the
#       first and names the closed set with one definition per word, each read
#       from `JOIN_TYPES` (src/compose/record.mjs); the judge row carries the
#       set and a BREAKS AND JOIN that admits `none` and `contrast` where the paragraph
#       defers what the previous `after` leaves open; neither row carries the
#       retired "names no noun phrase" test. A plan whose join answers a
#       sentence is refused by the plan call's validator naming the entry, the
#       refusal reaching the next plan attempt, after which the stage finishes
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
#   (o) A SEGMENT'S RELATION IS NEVER CONTENT (kogaki#1446): the plan row
#       states a Segment's `relation` is never stated in a Paragraph Waypoint and
#       the judge's RECOVERABLE refuses it as content, and a plan-call answer whose
#       Paragraph Waypoint carries its Segment's `relation` as content is
#       refused by the fake judge -- which refuses only where the row it was
#       handed carries that clause -- naming that Paragraph Waypoint, and the
#       refusal reaches the next plan attempt, same as the RECOVERABLE refusals of
#       (h). Whether a LIVE judge refuses it is the model's.
#   (p) A SEGMENT THAT ACTS ON THE READING CARRIES `performs` (kogaki#1448): a
#       fake planner bound to p5, whose Segment 1 announces a simplification,
#       answers a `performs` Paragraph Waypoint on Segment 1 and a `point` one
#       after it; the plan file is written with that `performs` entry, the
#       judge's input carries it, and both rows carry the form. A fake planner
#       bound to p6, whose Segment 1 defines a term, answers `performs` on
#       Segment 1, and the fake judge -- which refuses only where the row it
#       was handed carries ONE PER SEGMENT's form -- answers `does-not-fit`
#       naming that entry; the attempt is refused and the refusal reaches the
#       next plan attempt. The plan reader refuses a Leg Waypoint none of whose
#       Paragraph Waypoints carries a `point`, and a `performs` entry carrying
#       any key beside it, and names a refused `point` entry by its own place,
#       counting the `performs` entry before it. And a `performs` entry
#       names the operation alone (kogaki#1485): the rendered plan row carries
#       "the operation alone" and "no clause stating what the reader then
#       takes" in FORM, the judge's ONE PER SEGMENT carries "the reader's
#       resulting reading", and a
#       fake planner bound to p5 whose `performs` entry carries a "so that"
#       clause is refused by the fake judge -- which refuses only where the
#       row it was handed carries that sentence -- naming the entry and the
#       clause; the refusal reaches the next plan attempt, whose bare-operation
#       `performs` fits and is written. Whether a LIVE judge refuses it is the
#       model's.
#   (q) A PARAGRAPH WAYPOINT'S WORDS COME FROM ITS OWN LEG WAYPOINT (kogaki#1449):
#       the rendered plan prompt's DIVIDE keeps a Paragraph Waypoint to its own
#       Leg Waypoint's point, and the judge's RECOVERABLE refuses a term from
#       another Leg Waypoint or from planning.
#       Whether a LIVE planner keeps to it, or a live judge refuses a coined
#       term, is the model's.
#   (r) A TERM THE LEG INTRODUCES IS GIVEN ITS MEANING AT ITS FIRST USE
#       (kogaki#1497): over a Leg whose `introduces` carries one coined term
#       and whose second Leg Waypoint's `point` uses it, the rendered plan
#       prompt carries `terms_this_leg_introduces` with the term and its
#       meaning beside the persona, and the plan row carries the first-use
#       rule; a Leg introducing nothing is handed an empty list. A first plan
#       attempt whose first-use Paragraph Waypoint carries the term without
#       its meaning is refused by the fake judge -- which refuses only where
#       the row it was handed carries RECOVERABLE's first-use clause and the input names
#       the term -- naming the term; the refusal reaches the next attempt,
#       whose Paragraph Waypoint carries the meaning in apposition, fits, and
#       is written. Whether a LIVE planner binds a defining Segment, or a live
#       judge refuses a bare first use, is the model's.
#   (s) THE ROWS ARE NAMED CRITERIA UNDER A BOUND (kogaki#1511): the plan and
#       judge prompts (a)'s job sent carry, as `- <NAME>: <sentence>` lines, the
#       planner's steps and the judge's four criteria (BEGINS AND ENDS, ONE PER
#       SEGMENT, RECOVERABLE, BREAKS AND JOIN) exactly as the workflow file's
#       `criteria` names them, each one sentence within `criteria.words_max`
#       words; and `criteriaFailures`, which `start` refuses on, refuses a judge
#       row grown by a second sentence, an Issue number inside a criterion, a
#       criterion over the bound, or a criterion the table does not name. The
#       fake judge keys every refusal above on the named criterion that carries it.
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
const { legRecord, briefRecordText, readerStateMap, waypointsRefusal } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { PARAGRAPH_PLAN_FILE, PARAGRAPH_PLAN_STILL_RUNNING_LINE, NO_PARAGRAPH_MOVE_FITS, paragraphPlanShapeRefusal,
  validateParagraphPlanUnit, planLeg, introducedTerms, criteriaOf, criteriaFailures } = await import(pathToFileURL(join(repo, "src", "paragraph-plan.mjs")).href);
const { parseYaml, stringifyYaml } = await import(pathToFileURL(join(repo, "src", "yaml.mjs")).href);
const { JOIN_TYPES } = await import(pathToFileURL(join(repo, "src", "compose", "record.mjs")).href);
const { waypointLines } = await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);

const root = mkdtempSync(join(tmpdir(), "paragraph-plan-"));
// One named criterion's sentence in a rendered prompt, read by the stage's own parser (kogaki#1511).
const critOf = (p, name) => (criteriaOf(p).find((c) => c.name === name) || { text: "" }).text;

// ---- the Move library: one whole paragraph Move, one missing `segments` ----
const moves = join(root, "moves");
mkdirSync(moves);
writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
const PSEG_DOES = "states the point once, plainly.";
// A Move record is YAML written by the Brief's own writer (kogaki#1413):
// `before` and `after` maps keyed by dimension, `breaks` a list, `segments`
// a list of maps.
// Every Move carries the `description` the Adapter requires (kogaki#1412, kogaki#1418).
const writeMove = (dir, rec) => writeFileSync(join(dir, `${rec.id}.yaml`),
  stringifyYaml({ id: rec.id, description: "a fixture Move.", ...rec }));
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
    { input: JSON.stringify({ description: "a fixture Move.", ...rec }), encoding: "utf8" });
  if (r.status !== 0) fails.push(`(k) the ingest refused fixture Move ${rec.id}: ${(r.stderr || "").trim()}`);
  return r.status === 0;
};
const STATE = { before: { knowledge: "before." }, after: { knowledge: "after." } };
// p1's state holds two dimensions, so (j) can see them rendered one line each.
const P1_BEFORE = { knowledge: "before.", question: "holds: none." };
const P1_ADMITTED = ingestMove(moves, { id: "p1", before: P1_BEFORE, after: { knowledge: "after." }, breaks: ["breaks if the point is dropped."],
  segments: [{ does: PSEG_DOES }] });
if (P1_ADMITTED && !existsSync(join(moves, "INDEX.md"))) fails.push("(k) the ingest admitted p1 and wrote no INDEX.md beside it");
const PSEG3 = [{ does: "sets up the point." }, { does: "makes the point.", relation: "answers what the setup opened." },
  { does: "leaves the point.", relation: "draws the consequence of the point." }];
// (i)'s Move: the 2026-10-16 run's paragraph 2, its Segments as the Extractor wrote them there.
const P5_SEG1 = "concedes that the distinction just given is hard to hold and promises to simplify it through a pair of contrasting concrete cases.";
writeMove(moves, { id: "p5", ...STATE,
  breaks: ["drop the concession — the cases arrive unmotivated."],
  segments: [{ does: P5_SEG1 }, { does: "gives the first case.", relation: "carries out the promised simplification." }] });
// (p)'s defining Move: Segment 1 operates on the subject, so a `performs` entry on it is refused.
const P6_SEG1 = "defines the term the point turns on.";
writeMove(moves, { id: "p6", ...STATE,
  breaks: ["drop the definition — the case reads as undefined."],
  segments: [{ does: P6_SEG1 }, { does: "gives a case.", relation: "applies the definition." }] });
const UNRELATED_FIRST_POINT = "In some societies many ordinary people, and not only soldiers or police, carry guns.";
writeMove(moves, { id: "p4", ...STATE,
  breaks: ["breaks if a segment is dropped."], segments: PSEG3 });

// ---- isolated Move libraries for (c) and (f): each holds one Move with no `segments`
// beside the whole p1, so the library itself is refused by name (kogaki#1412).
const isolatedLibrary = (name, rec) => {
  const dir = join(root, name);
  mkdirSync(dir);
  writeFileSync(join(dir, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(dir, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ does: PSEG_DOES }] });
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
  leg_id: id, move: "a_leg_move", purpose: `purpose of ${id}`, reader_state_after: `knowledge: after ${id}.`,
  materials: ["L1", "L2"], depends_on: [], rationale: `rationale for ${id}.`, claims, waypoints,
});
const legs = [
  leg("s1", [{ strand: "L1", proposition: C1 }, { strand: "L2", proposition: C2 }], [
    { point: "The installer writes into a tree the consumer thought was theirs alone.", serves: ["L1"] },
    { point: "The next run overwrites any edit made to the copy.", serves: ["L1", "L2"] }]),
  leg("s2", [{ strand: "L2", proposition: C2 }], [{ point: "The copy is the installer's, not the consumer's.", serves: ["L2"] }]),
];
// (r)'s Legs: s1 introduces one coined term, and its second Leg Waypoint's point first uses it.
const TERM = { term: "kit stamp", kind: "coined", meaning: "the hash the installer writes beside the copy" };
const termLegs = [{ ...legs[0], introduces: [TERM], waypoints: [legs[0].waypoints[0],
  { point: "The next run overwrites any edit made to the copy and rewrites its kit stamp.", serves: ["L1", "L2"] }] }, legs[1]];
const briefText = (ls) => briefRecordText({
  slug: "plan-brief", compose_path: "audiences/dev-to-zenn.md", external_authority: "on",
  strands: [{ id: "L1", slug: "first-strand", cite: lessonCite("first-strand") },
    { id: "L2", slug: "second-strand", cite: lessonCite("second-strand") }],
  thesis: "The fixture claim.",
  reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: ls[ls.length - 1].leg_id,
  reader_path: ls.map(legRecord),
  strand_coverage: [], journey_coverage: [], closure: [], tradeoffs: {}, bridged: {},
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
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    const counter = dir + "/judge-" + leg.leg_id;
    const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
    writeFileSync(counter, String(n));
    const doesOf = (w) => ((w.bound_move && w.bound_move.segments) || []).map((s) => String(s.does || "").trim()).filter(Boolean);
    const restatesDescription = mode === "content" && leg.waypoints.some((w) =>
      (w.paragraph_waypoints || []).some((pw) => doesOf(w).some((d) => d && String(pw.point || "").includes(d))));
    // (i): refuses only where the row it was handed checks each Paragraph Waypoint against its
    // own Segment, so the fixture fails exactly when that criterion is in the judge row.
    const perSegment = crit("ONE PER SEGMENT").includes("the Nth Segment's \`does\`");
    const lostSegment = mode === "mismatch" && perSegment && leg.waypoints.some((w) =>
      doesOf(w)[0] && (w.paragraph_waypoints || [])[0] && w.paragraph_waypoints[0].point === ${JSON.stringify(UNRELATED_FIRST_POINT)});
    // (o): refuses a Paragraph Waypoint carrying its own Segment's relation, only where the row
    // it was handed binds relation beside does.
    const relationRule = crit("RECOVERABLE").includes("a Segment's \`relation\`");
    const relationOf = (w, i) => String((((w.bound_move && w.bound_move.segments) || [])[i] || {}).relation || "").trim();
    const carriesRelation = mode === "relation" && relationRule && leg.waypoints.some((w) =>
      (w.paragraph_waypoints || []).some((pw, i) => relationOf(w, i) && String(pw.point || "").includes(relationOf(w, i))));
    // (p): refuses a \`performs\` Paragraph Waypoint on a Segment whose does defines, only where
    // the row it was handed carries the form in ONE PER SEGMENT (kogaki#1448).
    const formRule = crit("ONE PER SEGMENT").includes("a \`point\` everywhere else");
    const performsOnSubject = mode === "performs-defining" && formRule && leg.waypoints.some((w) =>
      (w.paragraph_waypoints || []).some((pw, i) => Object.hasOwn(pw, "performs") && /^defines\\b/.test(doesOf(w)[i] || "")));
    // (p): refuses a \`performs\` Paragraph Waypoint carrying a purpose clause, only where the row
    // it was handed carries ONE PER SEGMENT's mirror of the planner's bound (kogaki#1485).
    const purposeRule = crit("ONE PER SEGMENT").includes("the reader's resulting reading");
    const purposeAt = (w) => (w.paragraph_waypoints || []).findIndex((pw) => / so that /.test(String(pw.performs || "")));
    const purposeWp = mode === "performs-purpose" && purposeRule ? leg.waypoints.find((w) => purposeAt(w) >= 0) : undefined;
    // (r): refuses a first use of an introduced term that gives no meaning for it, only where the
    // row it was handed carries RECOVERABLE's first-use clause and the input names the term (kogaki#1497).
    const termRule = crit("RECOVERABLE").includes("gives that term a meaning");
    const terms = body("leg_you_must_judge").terms_this_leg_introduces || [];
    const pws = leg.waypoints.flatMap((w) => w.paragraph_waypoints || []);
    const bareTerm = mode === "introduces" && termRule ? terms.find((t) => {
      const first = pws.find((pw) => String(pw.point || "").includes(t.term));
      return first && !String(first.point).includes(t.meaning);
    }) : undefined;
    const refuse = (mode === "ok" && leg.leg_id === "s2" && n === 1) || Boolean(bareTerm) || restatesDescription || lostSegment || carriesRelation || performsOnSubject || Boolean(purposeWp);
    const why = bareTerm ? "TERM-SENTENCE the Paragraph Waypoint that first uses \\\"" + bareTerm.term + "\\\" gives no meaning for it."
      : purposeWp ? "PURPOSE-SENTENCE Paragraph Waypoint " + (purposeAt(purposeWp) + 1) + " carries performs with the clause \\\"so that"
        + purposeWp.paragraph_waypoints[purposeAt(purposeWp)].performs.split(" so that")[1] + "\\\"."
      : performsOnSubject ? "PERFORMS-SENTENCE Paragraph Waypoint 1 carries performs, and Segment 1's does defines a term on the subject."
      : carriesRelation ? "RELATION-SENTENCE Paragraph Waypoint 2 carries its Segment's relation as content."
      : restatesDescription
      ? "CONTENT-SENTENCE the Paragraph Waypoint restates a Segment's does rather than a part of the point."
      : lostSegment ? "SEGMENT-SENTENCE Paragraph Waypoint 1 neither concedes nor promises to simplify, as Segment 1's does requires."
      : refuse ? "JUDGE-SENTENCE the first paragraph waypoint never reaches the after state." : "they begin at before and end at after.";
    out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint,
      verdict: refuse ? "does-not-fit" : "fits", why })) });
  }
  const leg = body("leg_you_must_plan").leg_you_must_plan;
  const planCounter = dir + "/plan-" + leg.leg_id;
  const planN = (existsSync(planCounter) ? Number(readFileSync(planCounter, "utf8")) : 0) + 1;
  writeFileSync(planCounter, String(planN));
  out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => {
    const nofit = mode === "nofit" && leg.leg_id === "s1" && w.waypoint === 2;
    const move = nofit ? null : mode === "broken" ? "p3" : mode === "technique" ? "p2" : (mode === "segments3" || mode === "content" || mode === "relation") ? "p4"
      : (mode === "mismatch" || mode === "performs" || mode === "performs-purpose") ? "p5" : mode === "performs-defining" ? "p6" : "p1";
    const pw = (n) => ({ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-" + n + " the paragraph establishes its point.", serves: [...w.serves] });
    const restated = mode === "content" && leg.leg_id === "s1" && w.waypoint === 1 && planN === 1;
    const join = w.waypoint === 1 || nofit ? undefined
      : mode === "join-sentence" && planN === 1 ? "The overwrite takes up the edit the installer's write left open."
      : "consequence";
    const unrelated = mode === "mismatch" && planN === 1;
    const carried = mode === "relation" && leg.leg_id === "s1" && w.waypoint === 1 && planN === 1;
    return { waypoint: w.waypoint, move,
      why: nofit ? "NOFIT-SENTENCE-" + planN + " no paragraph Move's before holds this state." : "its before holds the state and its after reaches the next point.",
      ...(join ? { join } : {}),
      paragraph_waypoints: nofit ? [] : mode === "performs-purpose"
        ? [{ performs: "PERFORMS-" + leg.leg_id + "-" + w.waypoint + " announces the simplification"
          + (planN === 1 ? ", so that what follows is taken as an admitted shortcut." : ".") }, pw(2)]
        : mode === "performs" || (mode === "performs-defining" && planN === 1)
        ? [{ performs: "PERFORMS-" + leg.leg_id + "-" + w.waypoint + " flags the case as hard and announces the simplification." }, pw(2)]
        : mode === "performs-defining" ? [pw(1), pw(2)]
        : restated ? [{ point: "RESTATED: sets up the point.", serves: [...w.serves] }]
        : mode === "mismatch" ? [unrelated ? { point: ${JSON.stringify(UNRELATED_FIRST_POINT)}, serves: [...w.serves] } : pw(1), pw(2)]
        : mode === "relation" ? [pw(1), carried ? { point: "PW-s1-1-2 the overwrite is the consumer's edit, and answers what the setup opened.", serves: [...w.serves] } : pw(2), pw(3)]
        : mode === "introduces" && w.point.includes(${JSON.stringify(TERM.term)})
        ? [{ point: "PW-" + leg.leg_id + "-" + w.waypoint + "-1 the " + ${JSON.stringify(TERM.term)}
          + (planN === 1 ? "" : ", " + ${JSON.stringify(TERM.meaning)} + ",") + " is rewritten by the next run.", serves: [...w.serves] }]
        : mode === "segments3" ? [pw(1), pw(2), pw(3)] : [pw(1)] };
  }) });
});
`);
chmodSync(judge, 0o755);

function runStage(name, ls, mode, movesDir = moves) {
  const dir = join(root, name);
  const briefDir = join(dir, "theses", "plan-brief");
  const runDir = join(dir, "run");
  mkdirSync(briefDir, { recursive: true });
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(dir, "mode"), mode);
  const briefPath = join(briefDir, "brief.yaml");
  const text = briefText(ls);
  writeFileSync(briefPath, text);
  const env = { ...process.env, KOGAKI_JUDGE_CLI: judge, PP_FIXTURE_DIR: dir };
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

// (a) a planned job writes the file, holding nothing of a Move.
let okPrompts = [];
{
  const r = runStage("ok", legs, "ok");
  okPrompts = r.prompts;
  if (r.started.status !== 0) fails.push(`(a) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(a) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  if (!existsSync(r.planPath)) fails.push("(a) no ParagraphPlan file was written beside the Brief");
  else {
    const plan = readFileSync(r.planPath, "utf8");
    for (const banned of ["move", "segments", "p1", "settles", "technique", "before", "after", "why"]) {
      if (new RegExp(`(^|[^A-Za-z_])${banned}([^A-Za-z_]|$)`, "m").test(plan.split("\n").filter((l) => !l.startsWith("#")).join("\n"))) {
        fails.push(`(a) the ParagraphPlan file carries Move information (\`${banned}\`)`);
      }
    }
    for (const id of ["s1-1", "s1-2", "s2-1"]) if (!plan.includes(`PW-${id}`)) fails.push(`(a) the ParagraphPlan file lacks the Paragraph Waypoint of ${id}`);
    const rec = parseYaml(plan, r.planPath);
    const joins = rec.legs.map((l) => l.waypoints.map((w) => w.join ?? null));
    if (JSON.stringify(joins) !== JSON.stringify([[null, "consequence"], [null]])) {
      fails.push(`(a) the ParagraphPlan file does not carry a join on every Leg Waypoint after the first and none on a first (kogaki#1411): ${JSON.stringify(joins)}`);
    }
    const sha = (await import("node:crypto")).createHash("sha256").update(r.text).digest("hex");
    if (!plan.includes(sha)) fails.push("(a) the ParagraphPlan file does not name the Brief's content hash");
    if (!plan.includes("theses/plan-brief/brief.yaml")) fails.push("(a) the ParagraphPlan file does not name the Brief's path");
  }
  if (readFileSync(r.briefPath, "utf8") !== r.text) fails.push("(a) the Brief was rewritten by the stage");
  const bindings = join(r.runDir, "paragraph-plan-bindings.json");
  if (!existsSync(bindings)) fails.push("(a) the run directory carries no paragraph-plan-bindings.json");
  else {
    const b = JSON.parse(readFileSync(bindings, "utf8")).bindings || [];
    if (b.length !== 3 || !b.every((x) => x.move === "p1")) fails.push(`(a) the bindings record does not name p1 for each Leg Waypoint: ${JSON.stringify(b)}`);
  }
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const s2Plans = plans.filter((p) => p.includes("The copy is the installer's, not the consumer's."));
  if (s2Plans.length !== 2 || !s2Plans[1].includes("JUDGE-SENTENCE")) {
    fails.push(`(a) the judge's does-not-fit sentence was not put into Leg s2's second plan prompt (${s2Plans.length} plan prompt(s))`);
  }
  // THE REFUSED PLAN RIDES BESIDE THE VERDICT (kogaki#1438): the second prompt carries, above
  // the input marker, attempt 1's plan record as 2-space JSON and then the judge's `why`, in one block.
  {
    const p2 = s2Plans[1] || "";
    const A = "----- YOUR PREVIOUS ANSWER (attempt 1) -----\n", R = "\n----- IT WAS REFUSED -----\n";
    const at = p2.indexOf(A), rat = at >= 0 ? p2.indexOf(R, at) : -1, inAt = p2.indexOf("\n----- INPUT (JSON) -----\n");
    let answer = null;
    try { answer = rat > at ? JSON.parse(p2.slice(at + A.length, rat)) : null; } catch { answer = null; }
    const pretty = answer && p2.slice(at + A.length, rat) === JSON.stringify(answer, null, 2);
    if (!answer || !pretty || answer.leg_id !== "s2" || !Array.isArray(answer.waypoints)
      || !JSON.stringify(answer).includes("PW-s2-") || !(rat < inAt) || !p2.slice(rat, inAt).includes("JUDGE-SENTENCE")) {
      fails.push("(a) Leg s2's second plan prompt does not carry its attempt-1 plan record as 2-space JSON and the judge's why in one block above the input (kogaki#1438)");
    }
  }
  if (!plans.length || !plans.every((p) => p.includes(`"does": ${JSON.stringify(PSEG_DOES)}`) && p.includes('"relation": ""')
    && p.includes('"persona"') && p.includes("breaks if the point is dropped."))) {
    fails.push("(a) a plan prompt is not handed the Move's segments (each Segment's does and relation) and breaks beside the persona");
  }
  if (!plans.length || !plans.every((p) => p.includes('"point"') && p.includes('"serves"') && p.includes('"next_point"'))) {
    fails.push("(a) a plan prompt does not carry a Leg Waypoint entry's point, serves and next_point");
  }
  if (plans.some((p) => p.includes(C1) || p.includes(C2))) {
    fails.push("(a) a plan prompt carries a Claim proposition on a Leg Waypoint entry (kogaki#1382)");
  }
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judges.length || !judges.every((p) => p.includes('"before"') && p.includes('"after"')
    && p.includes('"breaks"') && p.includes('"segments"'))) {
    fails.push("(a) a judge prompt is not handed the bound Move's before, after, segments and breaks");
  }
  if ([...plans, ...judges].some((p) => p.includes('"technique"'))) {
    fails.push("(a) a plan or judge prompt is handed a `technique` (kogaki#1412)");
  }
}

// (b) no Move fits: re-asked to the attempt bound, then a stop naming the Leg and Waypoint.
{
  const r = runStage("nofit", legs, "nofit");
  const out = r.awaited ? `${r.awaited.stdout}${r.awaited.stderr}` : "";
  if (r.started.status !== 0) fails.push(`(b) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status === 0) fails.push(`(b) await did not stop the stage: ${out.slice(0, 600)}`);
  if (!out.includes("Leg s1, Waypoint 2") || !out.includes(NO_PARAGRAPH_MOVE_FITS)) {
    fails.push(`(b) the stop does not name Leg s1, Waypoint 2 and ${NO_PARAGRAPH_MOVE_FITS}: ${out.slice(0, 600)}`);
  }
  const s1Plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"') && p.includes('"leg_id": "s1"'));
  if (s1Plans.length !== 3) fails.push(`(b) Leg s1 was not asked brief.unit_attempts (3) times: ${s1Plans.length}`);
  if (s1Plans.length > 1 && !s1Plans[1].includes("NOFIT-SENTENCE-1")) fails.push("(b) the no_paragraph_move_fits refusal was not put into the next attempt's prompt");
  // the shared supervisor's retry prompt carries every refusal so far, not only the last one (kogaki#1395)
  if (s1Plans.length > 2 && !(s1Plans[2].includes("NOFIT-SENTENCE-1") && s1Plans[2].includes("NOFIT-SENTENCE-2")
    && s1Plans[2].indexOf("NOFIT-SENTENCE-1") < s1Plans[2].indexOf("NOFIT-SENTENCE-2"))) {
    fails.push("(b) the third attempt's prompt does not carry BOTH the first and second attempts' refusals, oldest first");
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
  writeMove(retired, { id: "p1", ...STATE, breaks: ["breaks if the point is dropped."], segments: [{ does: PSEG_DOES }] });
  writeFileSync(join(retired, "p9.md"), "id: p9\nbefore: >-\n  knowledge: before.\n");
  const rr = runStage("retired", legs, "ok", retired);
  const rOut = `${rr.started.stdout}${rr.started.stderr}${rr.awaited ? rr.awaited.stdout + rr.awaited.stderr : ""}`;
  if (!rOut.includes("p9.md") || !rOut.includes("retired `.md` form")) fails.push(`(j) a library holding a .md Move is not refused naming it: ${rOut.slice(0, 400)}`);
  if (existsSync(rr.planPath)) fails.push("(j) a ParagraphPlan file was written over a library holding a .md Move");

  const joined = join(root, "moves-joined");
  mkdirSync(joined);
  writeFileSync(join(joined, "ROLES.json"), readFileSync("moves/ROLES.json"));
  writeMove(joined, { id: "p1", before: "knowledge: before. question: holds: none.",
    after: { knowledge: "after." }, breaks: ["breaks if the point is dropped."], segments: [{ does: PSEG_DOES }] });
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
  if (!header.includes("they are not one sentence each") || !header.includes("as many sentences as it needs")) {
    fails.push("(g) src/packet-template.md's waypoints header does not state the revised rule");
  }
  if (header.includes("One paragraph per indented line is the expected shape")) {
    fails.push("(g) src/packet-template.md's waypoints header still carries the retired one-sentence-per-line rule");
  }
}

// (h) EVERY SEGMENT REACHES THE PLAN CALL AS ITS TWO FIELDS (kogaki#1414, reverting the
// withholding of kogaki#1403): the plan prompt built over p4 (three Segments) carries every
// Segment's number, `does` and `relation` as separate fields, the plan row states that a
// `does` is an operation and never a point, and a plan-call answer whose Paragraph Waypoint
// restates a Segment's `does` is refused by the judge the check call's refusal binds, exactly
// as any other does-not-fit is -- put back into the next attempt verbatim, and the stage
// finishes once the next attempt's Paragraph Waypoint is recoverable from the Leg Waypoint's
// own point instead.
{
  const r = runStage("content", legs, "content", moves);
  if (r.started.status !== 0) fails.push(`(h) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(h) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const fields = [['"segment": 1', '"does": "sets up the point."', '"relation": ""'],
    ['"segment": 2', '"does": "makes the point."', '"relation": "answers what the setup opened."'],
    ['"segment": 3', '"does": "leaves the point."', '"relation": "draws the consequence of the point."']];
  if (!plans.length || !plans.every((p) => fields.every((f) => f.every((x) => p.includes(x))))) {
    fails.push("(h) a plan prompt does not carry every Segment's number, does and relation as separate fields");
  }
  if (!plans.length || !plans.every((p) => p.includes("A Segment's `does` is an operation performed on a part of the Leg Waypoint's `point`, never a point to state."))) {
    fails.push("(h) a plan prompt's row does not state that a Segment's does is an operation to perform and never a point to state");
  }
  const s1Plans = plans.filter((p) => p.includes('"leg_id": "s1"') && p.includes("The installer writes into a tree the consumer thought was theirs alone."));
  if (s1Plans.length !== 2 || !s1Plans[1].includes("CONTENT-SENTENCE")) {
    fails.push(`(h) the judge's content refusal was not put into Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
}

// (i) THE 2026-10-16 PARAGRAPH 2 PLAN, REPRODUCED (kogaki#1414): bound to p5, whose Segment 1
// concedes and promises to simplify, the first plan attempt writes a first Paragraph Waypoint
// stating an unrelated fact, as that run's planner did. The judge call is handed Segment 1's
// `does` beside that Paragraph Waypoint under a row that checks each Paragraph Waypoint
// against its own Segment; the refusal names Paragraph Waypoint 1 and reaches the next plan
// attempt, and the stage finishes once the first point is no longer the unrelated one.
{
  const one = [leg("s1", [{ strand: "L1", proposition: C1 }], [
    { point: "Whether the distinction holds is easiest to see in two societies, one where ordinary people carry guns and one where they do not.", serves: ["L1"] }])];
  const r = runStage("mismatch", one, "mismatch", moves);
  if (r.started.status !== 0) fails.push(`(i) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(i) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  const first = judges[0] || "";
  if (!critOf(first, "ONE PER SEGMENT").includes("the Nth Segment's `does`")) fails.push("(i) the judge row's ONE PER SEGMENT does not check each Paragraph Waypoint against its own Segment");
  if (!first.includes(P5_SEG1) || !first.includes(UNRELATED_FIRST_POINT)) {
    fails.push("(i) the first judge call is not handed Segment 1's does beside the unrelated first Paragraph Waypoint");
  }
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  if (plans.length !== 2 || !plans[1].includes("SEGMENT-SENTENCE")) {
    fails.push(`(i) the judge's refusal of the unrelated first point did not reach the next plan attempt (${plans.length} plan prompt(s))`);
  }
  if (existsSync(r.planPath) && readFileSync(r.planPath, "utf8").includes(UNRELATED_FIRST_POINT)) {
    fails.push("(i) the ParagraphPlan file kept the unrelated first point the judge refused");
  }
}

// (o) A SEGMENT'S RELATION IS NEVER CONTENT (kogaki#1446): bound to p4, whose Segment 2's
// relation is "answers what the setup opened.", the first plan attempt writes Leg s1's second
// Paragraph Waypoint carrying that relation as content, as the 2026-10-19 Leg run's planner did.
// Both rows carry the relation sentence; the judge refuses naming that Paragraph Waypoint, the
// refusal reaches the next plan attempt, and the stage finishes without the carried relation.
{
  const r = runStage("relation", legs, "relation", moves);
  if (r.started.status !== 0) fails.push(`(o) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(o) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!plans.length || !plans.every((p) => /`relation` decide the plan and are never stated in a Paragraph Waypoint/.test(p))) {
    fails.push("(o) a plan prompt's row does not state that a Segment's relation is never stated in a Paragraph Waypoint");
  }
  if (!judges.length || !judges.every((p) => /never what the paragraph does to its reader, .*a Segment's `relation`/.test(critOf(p, "RECOVERABLE")))) {
    fails.push("(o) a judge prompt's RECOVERABLE does not refuse a Segment's relation as content");
  }
  const s1Plans = plans.filter((p) => p.includes('"leg_id": "s1"') && p.includes("The installer writes into a tree the consumer thought was theirs alone."));
  if (s1Plans.length !== 2 || !s1Plans[1].includes("RELATION-SENTENCE Paragraph Waypoint 2")) {
    fails.push(`(o) the judge's refusal naming the Paragraph Waypoint that carries its Segment's relation was not put into Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
  if (existsSync(r.planPath) && readFileSync(r.planPath, "utf8").includes("answers what the setup opened.")) {
    fails.push("(o) the ParagraphPlan file kept the Paragraph Waypoint carrying its Segment's relation");
  }
  // (q) a Paragraph Waypoint's words are its own Leg Waypoint's, in both rendered rows (kogaki#1449)
  if (!plans.length || !plans.every((p) => critOf(p, "DIVIDE").includes("the Leg Waypoint's own `point` in that point's own terms"))) {
    fails.push("(q) a plan prompt's DIVIDE does not keep a Paragraph Waypoint to its own Leg Waypoint's point");
  }
  if (!judges.length || !judges.every((p) => critOf(p, "RECOVERABLE").includes("a term from another Leg Waypoint or from planning"))) {
    fails.push("(q) a judge prompt's RECOVERABLE does not refuse a term from another Leg Waypoint or from planning");
  }
}

// (r) A TERM THE LEG INTRODUCES IS GIVEN ITS MEANING AT ITS FIRST USE (kogaki#1497): Leg s1
// introduces "kit stamp" and its second Leg Waypoint's point first uses it. The plan call is
// handed the term and its meaning beside the persona; the first attempt's first-use Paragraph
// Waypoint carries the bare term and the judge refuses naming it; the second attempt carries
// the meaning in apposition, fits, and is written.
{
  const r = runStage("introduces", termLegs, "introduces", moves);
  if (r.started.status !== 0) fails.push(`(r) start failed: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(r) await did not finish the job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"'));
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  const inputOf = (p) => JSON.parse(p.slice(p.lastIndexOf("{", p.lastIndexOf('"leg_you_must_plan"'))));
  const s1Plans = plans.filter((p) => inputOf(p).leg_you_must_plan.leg_id === "s1");
  const s2Plans = plans.filter((p) => inputOf(p).leg_you_must_plan.leg_id === "s2");
  const want = JSON.stringify([{ term: TERM.term, meaning: TERM.meaning }]);
  if (!s1Plans.length || !s1Plans.every((p) => JSON.stringify(inputOf(p).terms_this_leg_introduces) === want)) {
    fails.push(`(r) Leg s1's plan input does not carry the introduced term and its meaning: ${s1Plans.length ? JSON.stringify(inputOf(s1Plans[0]).terms_this_leg_introduces) : "no plan prompt"}`);
  }
  if (s1Plans.length && (!inputOf(s1Plans[0]).persona || Object.hasOwn(inputOf(s1Plans[0]).leg_you_must_plan, "introduces"))) {
    fails.push("(r) the introduced terms do not ride beside the persona, outside the Leg");
  }
  if (!s2Plans.length || JSON.stringify(inputOf(s2Plans[0]).terms_this_leg_introduces) !== "[]") {
    fails.push("(r) Leg s2, which introduces nothing, is not handed an empty list of introduced terms");
  }
  if (!plans.length || !plans.every((p) => critOf(p, "TERMS").includes("first in the Leg to use a term from `terms_this_leg_introduces`"))) {
    fails.push("(r) a plan prompt's row does not carry the first-use rule for an introduced term");
  }
  if (s1Plans.length !== 2 || !s1Plans[1].includes(`TERM-SENTENCE the Paragraph Waypoint that first uses "${TERM.term}" gives no meaning for it.`)) {
    fails.push(`(r) the judge's refusal naming the bare first use of "${TERM.term}" was not put into Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
  const s1Judges = judges.filter((p) => p.includes('"leg_id": "s1"'));
  if (!s1Judges.length || !s1Judges.every((p) => p.includes(`"term": "${TERM.term}"`) && p.includes(TERM.meaning))) {
    fails.push("(r) Leg s1's judge input does not carry the introduced term and its meaning");
  }
  const plan = existsSync(r.planPath) ? readFileSync(r.planPath, "utf8") : "";
  if (!plan.includes(`the ${TERM.term}, ${TERM.meaning}, is rewritten`)) {
    fails.push("(r) the ParagraphPlan file does not carry the first use of the term with its meaning in apposition");
  }
  // The meaning is read by the Packet's own rule (PR #1507 round 1): a legacy anchored entry's
  // anchor is its meaning, an established term with none rides null and never its `source`.
  const read = introducedTerms(["stamp file — the file the hash is written to",
    { term: "fork", kind: "established", source: "git" }, "bare term"]);
  const wantRead = [{ term: "stamp file", meaning: "the file the hash is written to" },
    { term: "fork", meaning: null }, { term: "bare term", meaning: null }];
  if (JSON.stringify(read) !== JSON.stringify(wantRead)) fails.push(`(r) the introduced terms are not read by the Packet's meaning rule: ${JSON.stringify(read)}`);
  // A null meaning is the planner's to give, and the judge reads whether one is given.
  if (!plans.length || !plans.every((p) => critOf(p, "TERMS").includes("or yours where it is `null`"))) {
    fails.push("(r) a plan prompt's row does not give the planner a null meaning to write in its own words");
  }
  if (!judges.length || !judges.every((p) => critOf(p, "RECOVERABLE").includes("gives that term a meaning, in any words"))) {
    fails.push("(r) a judge prompt's row does not judge whether a meaning is given rather than whether it matches");
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
      { point: "PW-s1-1-2 the paragraph establishes its point.", serves: ["L1"] }];
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
  if (!judges.length || !judges.every((p) => critOf(p, "ONE PER SEGMENT").includes("where that `does` acts on the reader's reading, and a `point` everywhere else"))) {
    fails.push("(p) a judge prompt's ONE PER SEGMENT does not carry the form of a Paragraph Waypoint on a reading-directed Segment");
  }
  // kogaki#1485: the planner's bound and the judge's mirror, by their words.
  for (const words of ["the operation alone", "no clause stating what the reader then takes"]) {
    if (!plans.length || !plans.every((p) => critOf(p, "FORM").includes(words))) fails.push(`(p) a plan prompt's FORM does not carry "${words}"`);
  }
  if (!judges.length || !judges.every((p) => critOf(p, "ONE PER SEGMENT").includes("the reader's resulting reading"))) {
    fails.push("(p) a judge prompt's ONE PER SEGMENT does not refuse a clause stating the reader's resulting reading");
  }
}
{
  const r = runStage("performs-purpose", legs, "performs-purpose", moves);
  if (r.started.status !== 0) fails.push(`(p) start failed on the purpose-clause plan: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(p) await did not finish the purpose-clause job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const s1Plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"') && p.includes('"leg_id": "s1"'));
  const named = "PURPOSE-SENTENCE Paragraph Waypoint 1 carries performs with the clause";
  if (s1Plans.length !== 2 || !s1Plans[1].includes(named) || !s1Plans[1].includes("what follows is taken as an admitted shortcut")) {
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
  const r = runStage("performs-defining", legs, "performs-defining", moves);
  if (r.started.status !== 0) fails.push(`(p) start failed on the defining Move: ${(r.started.stderr || "").slice(0, 400)}`);
  else if (!r.awaited || r.awaited.status !== 0) fails.push(`(p) await did not finish the defining-Move job: ${(r.awaited && (r.awaited.stdout + r.awaited.stderr) || "").slice(0, 600)}`);
  const judges = r.prompts.filter((p) => p.includes('"leg_you_must_judge"'));
  if (!judges[0] || !judges[0].includes(P6_SEG1) || !judges[0].includes('"performs": "PERFORMS-')) {
    fails.push("(p) the first judge call is not handed Segment 1's defining does beside the performs Paragraph Waypoint");
  }
  const s1Plans = r.prompts.filter((p) => p.includes('"leg_you_must_plan"') && p.includes('"leg_id": "s1"'));
  if (s1Plans.length !== 2 || !s1Plans[1].includes("PERFORMS-SENTENCE Paragraph Waypoint 1")) {
    fails.push(`(p) the judge's refusal naming the performs entry on a defining Segment did not reach Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
  if (existsSync(r.planPath) && readFileSync(r.planPath, "utf8").includes("PERFORMS-")) {
    fails.push("(p) the ParagraphPlan file kept the performs entry the judge refused on a defining Segment");
  }
}
{
  const s1 = legs.find((l) => l.leg_id === "s1");
  const leg0 = { leg_id: "s1", waypoints: s1.waypoints };
  const plan = (pws0) => ({ version: "1", brief: { path: "theses/plan-brief/brief.yaml", sha256: "0".repeat(64) },
    legs: [{ leg_id: "s1", waypoints: [{ waypoint: 1, paragraph_waypoints: pws0 },
      { waypoint: 2, join: "contrast", paragraph_waypoints: [{ point: "a point.", serves: ["L1", "L2"] }] }] }] });
  const allPerforms = paragraphPlanShapeRefusal(plan([{ performs: "announces the simplification." }]), "plan.yaml", [leg0]) || "";
  if (!allPerforms.includes("none of its Paragraph Waypoints carries a `point`")) {
    fails.push(`(p) the plan reader did not refuse a Leg Waypoint none of whose Paragraph Waypoints carries a point: ${allPerforms}`);
  }
  const mixed = paragraphPlanShapeRefusal(plan([{ performs: "announces.", serves: ["L1"] }, { point: "a point.", serves: ["L1"] }]), "plan.yaml", [leg0]) || "";
  if (!mixed.includes("carries `performs` beside `serves`")) fails.push(`(p) the plan reader did not refuse a performs entry carrying serves: ${mixed}`);
  // the ordinal a refusal names is the entry's own place, counting the performs entry before it.
  const second = paragraphPlanShapeRefusal(plan([{ performs: "announces." }, { point: "", serves: ["L1"] }]), "plan.yaml", [leg0]) || "";
  if (!second.includes("waypoint 2 has an empty point")) fails.push(`(p) a refusal of a point entry after a performs entry does not name it by its own number: ${second}`);
  const ok = paragraphPlanShapeRefusal(plan([{ performs: "announces." }, { point: "a point.", serves: ["L1"] }]), "plan.yaml", [leg0]);
  if (ok !== null) fails.push(`(p) the plan reader refused a performs entry beside a point entry: ${ok}`);
}

// (l) THE JOIN IS A TYPED RELATION (kogaki#1411, kogaki#1477): the plan row asks for the join
// and names every word of the set with its definition, read from JOIN_TYPES; the judge row carries
// the set and the deferral clause, and is handed the join; neither carries the retired noun-phrase
// test. A plan answering a sentence for `join` is refused by the validator naming the entry, the
// refusal reaching the next plan attempt, after which the stage finishes with a type word.
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
  if (!judges.length || !critOf(judges[0], "BREAKS AND JOIN").includes("on every Leg Waypoint after the first the `join`")) fails.push("(l) the judge row does not carry the join criterion");
  if (!judges.length || !critOf(judges[0], "BREAKS AND JOIN").includes("`none` or `contrast` fitting where it defers what the previous `after` leaves open")) {
    fails.push("(l) the judge row's BREAKS AND JOIN does not admit `none` and `contrast` where the paragraph defers the previous `after`");
  }
  if (!judges.length || !judges[0].includes('"join": "consequence"')) fails.push("(l) the judge call is not handed the join");
  const s1Plans = plans.filter((p) => p.includes('"leg_id": "s1"'));
  if (s1Plans.length !== 2 || !s1Plans[1].includes("Waypoint 2 carries a sentence for `join`")) {
    fails.push(`(l) the validator's refusal of a sentence join, naming the entry, did not reach Leg s1's next plan prompt (${s1Plans.length} plan prompt(s))`);
  }
  if (existsSync(r.planPath) && !/join: consequence\n/.test(readFileSync(r.planPath, "utf8"))) fails.push("(l) the ParagraphPlan file does not carry the re-planned type word");
}

// (m) THE JOIN'S PLACE AND SET ARE READ (kogaki#1411, kogaki#1477): the plan reader refuses a
// missing, an empty and a misplaced join, a sentence and a word outside the set, by name; the plan
// call's validator refuses the same; the Brief's Leg Waypoint rule refuses `join` on a Brief.
{
  const pw = (serves) => [{ point: "a point.", serves }];
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

// (n) THE JOIN REACHES THE WRITER (kogaki#1411): the Opens-from line sits under its Leg
// Waypoint and before its Paragraph Waypoints; a Leg Waypoint without a join renders none; the
// template carries the instruction and the Move-boundary sentence.
{
  const s1 = legs.find((l) => l.leg_id === "s1");
  const rendered = waypointLines({ claims: s1.claims, waypoints: [
    { ...s1.waypoints[0], paragraph_waypoints: [{ point: "PW-1-1.", serves: ["L1"] }] },
    { ...s1.waypoints[1], join: "contrast", paragraph_waypoints: [{ point: "PW-2-1.", serves: ["L1", "L2"] }] }] }) || "";
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
// sent carry the judge's four named criteria and the planner's named steps, each one sentence
// under `criteria.words_max`, and the stage's own reader refuses a row that grows past it -- a
// second sentence, a criterion over the bound, an Issue number inside one, or a criterion the
// table does not name.
{
  const table = JSON.parse(readFileSync("src/paragraph-plan-workflow.json", "utf8"));
  const bound = table.criteria || {};
  const JUDGE = ["BEGINS AND ENDS", "ONE PER SEGMENT", "RECOVERABLE", "BREAKS AND JOIN"];
  if (JSON.stringify(bound.paragraph_plan_judge_unit) !== JSON.stringify(JUDGE)) {
    fails.push(`(s) \`criteria\` does not name the judge's four criteria: ${JSON.stringify(bound.paragraph_plan_judge_unit)}`);
  }
  const tree = criteriaFailures(table);
  if (tree.length) fails.push(`(s) the tree's rows fail their bound: ${tree.join("; ")}`);
  const sent = [["paragraph_plan_unit", okPrompts.find((p) => p.includes('"leg_you_must_plan"'))],
    ["paragraph_plan_judge_unit", okPrompts.find((p) => p.includes('"leg_you_must_judge"'))]];
  for (const [key, prompt] of sent) {
    const got = prompt ? criteriaOf(prompt) : [];
    if (!got.length || JSON.stringify(got.map((c) => c.name)) !== JSON.stringify(bound[key])) {
      fails.push(`(s) the ${key} prompt the job sent carries ${JSON.stringify(got.map((c) => c.name))}, not ${JSON.stringify(bound[key])}`);
    }
    for (const c of got) {
      const n = c.text.split(/\s+/).length;
      if (!/[.]$/.test(c.text) || /[.;!?]\s/.test(c.text) || n > bound.words_max) {
        fails.push(`(s) the ${key} prompt's ${c.name} is not one sentence within ${bound.words_max} words (${n})`);
      }
    }
  }
  const grown = (edit) => { const t = JSON.parse(JSON.stringify(table)); edit(t); return criteriaFailures(t).join("; "); };
  const line = (t, name, f) => {
    const jp = t.paragraph_plan_judge_unit.judgment_point;
    const at = jp.indexOf(`\n- ${name}: `) + 1;
    const end = jp.indexOf("\n", at);
    t.paragraph_plan_judge_unit.judgment_point = jp.slice(0, at) + f(jp.slice(at, end)) + jp.slice(end);
  };
  const cases = [
    ["a second sentence", (t) => line(t, "RECOVERABLE", (l) => `${l} As on one run, a restated operation does not fit.`), "RECOVERABLE is not one sentence"],
    ["an Issue number", (t) => line(t, "BREAKS AND JOIN", (l) => l.replace(/[.]$/, " (kogaki#1477).")), "BREAKS AND JOIN carries an Issue number"],
    ["a word over the bound", (t) => { t.criteria.words_max = 20; }, "over the bound of 20"],
    ["a fifth criterion", (t) => line(t, "BREAKS AND JOIN", (l) => `${l}\n- SEVENTH: The join is judged.`), "not the"],
  ];
  for (const [what, edit, want] of cases) {
    const why = grown(edit);
    if (!why.includes(want)) fails.push(`(s) a judge row grown by ${what} is not refused naming it: ${why || "no refusal"}`);
  }
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-paragraph-plan — the stage writes paragraph-plan.yaml beside the Brief with point and serves only and no Move information, the bound Move staying in the run directory; the plan call carries the bound Move's segments (each Segment's number, does and relation as separate fields) and breaks and each Leg Waypoint's point, serves and next_point, and no Claim proposition; the judge call carries the four roles and neither call a technique (kogaki#1412); a judge refusal is carried into the next attempt; a Leg Waypoint no Move fits stops after brief.unit_attempts naming the Leg and the Waypoint, and a library holding a Move with no segments stops naming the Move whether or not it carries technique, each with the Brief unchanged and no file written (kogaki#1412); a Move carrying three segments yields three Paragraph Waypoints under its Leg Waypoint, rendered as three indented lines under the revised header; a Paragraph Waypoint restating a Segment's does is refused by the judge same as any other does-not-fit; the plan row never states a Segment's relation and the judge's RECOVERABLE refuses it as content, and a Paragraph Waypoint carrying its Segment's relation as content is refused naming it (kogaki#1446); the 2026-10-16 paragraph 2 plan, whose first point lost its Segment, is refused by the judge's per-Segment check and re-planned; a Leg Waypoint carrying move or segments is refused at start by name; the Move record is read as YAML, its before map rendered one dimension per line, and a .md Move or a joined-line state is refused by name (kogaki#1413); every Leg Waypoint after the first carries a join and no first one does, the plan reader and the plan call's validator refuse a missing, empty or misplaced join, a sentence and a word outside the set by name, the Brief refuses one, both rows name the closed set with one definition per word and neither carries the retired noun-phrase test, the judge's BREAKS AND JOIN admits none and contrast where the paragraph defers the previous after, a plan answering a sentence for join is refused naming the entry and re-planned (kogaki#1477), and the Packet renders each join as its Opens-from line under the template's instruction (kogaki#1411); a Segment that acts on the reader's reading carries a performs Paragraph Waypoint the plan file and the judge's input carry, a performs entry on a defining Segment is refused naming it, and a Leg Waypoint with no point entry is refused (kogaki#1448); a performs entry carrying a clause stating the reader's resulting reading is refused naming the entry and the clause, and the bare operation fits (kogaki#1485); both rows keep a Paragraph Waypoint's words to its own Leg Waypoint's point (kogaki#1449); both rows are named one-sentence criteria within the workflow file's word bound, and a row grown past it is refused naming the criterion (kogaki#1511); the plan call is handed the Leg's introduced terms with their meanings beside the persona, and a first use of an introduced term with no meaning is refused naming the term while one carrying it in apposition fits (kogaki#1497); the Move the stage binds is one the ingest admitted through the Adapter's validator (kogaki#1418); the skill names only entry points the Harness has.");
JS
