// The cases of checks/check-paragraph-plan.sh (kogaki#1865, kogaki#1876), each stated in that member's `contract`,
// driven end to end through `node src/paragraph-plan.mjs start|await` over a Brief with a `structure`, a scratch Move
// library and a fake model binary recording every call: (a) a run to the end, five `paragraph_plan_name_senses` calls
// per Leg and no other, the plan `version` "2" with `leg_id` and `segments` on each Leg and no Move's id in the file;
// (b) of two Moves with the same count the one with fewer compared Edges taken; (c) a reading refused once asked
// again, twice stopping the Leg; (e) a Leg no Move is a candidate for; (f) `readParagraphPlanBeside` refusing the keys
// that left the record by name, and (f2) a Segment with nothing bound at neither end of an Edge; (g) `chooseMove` by itself; (h) what `start` refuses; (i) the view; (j)
// `validateMoveRecord` beside `bind` and `edges`; (k) SKILL.md's paths. Case (d) went with its call (kogaki#1876).
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const repo = resolve(".");
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
const fails = [];
let cases = 0;
const ok = (cond, msg) => {
  cases++;
  if (!cond) fails.push(msg);
};
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const { stringifyYaml, parseYaml } = await imp("src/yaml.mjs");
const { readParagraphPlanBeside, validateMoveRecord } = await imp("src/compose.mjs");
const P = await imp("src/paragraph-plan.mjs");
const S = { ...(await imp("src/sme/edges.mjs")), ...(await imp("src/sme/arguments.mjs")) };
const { readReaderPathJob } = await imp("src/workflow/detached-job.mjs");
const root = mkdtempSync(join(tmpdir(), "paragraph-plan-"));
const names = S.senseNames(S.loadSenses());

const F = await imp("checks/fixtures/paragraph-plan/stage.mjs");
const { STRUCTURE, LEGS, move, seg, Z_FEWER, A_MORE, WIDE } = F;
const { newBrief, library, runStage, MOVES } = F.makeFixture(root);
const MOVES_UNEDGED = library("moves-unedged", [
  Z_FEWER,
  move("plain", [{ operation: "opens." }, { operation: "closes.", relation: "ends." }]),
]);

// (a) and (b) A RUN TO THE END.
const a = runStage("ok");
ok(a.wait.status === 0, `(a) the stage did not finish: ${a.out}`);
ok(a.plan && String(a.plan.version) === "2", `(a) the plan file is not version "2": ${JSON.stringify(a.plan)}`);
const legsA = (a.plan && a.plan.legs) || [];
ok(
  legsA.length === 2 && legsA.every((l) => Array.isArray(l.segments)),
  `(a) a Leg of the plan lacks segments: ${JSON.stringify(legsA)}`,
);
ok(
  legsA.every((l) => Object.keys(l).sort().join() === "leg_id,segments"),
  `(a) a Leg of the plan carries a key beside leg_id and segments: ${JSON.stringify(legsA)}`,
);
for (const id of ["s1", "s2"]) {
  const readings = a.calls.filter((c) => c.row === "paragraph_plan_name_senses" && c.leg === id).length;
  ok(readings === 5, `(a) Leg ${id} made ${readings} reading call(s), not five`);
}
ok(
  a.calls.every((c) => c.row === "paragraph_plan_name_senses"),
  `(a) a call by another row was made: ${JSON.stringify([...new Set(a.calls.map((c) => c.row))])}`,
);
ok(a.calls.length === 10, `(a) the stage made ${a.calls.length} calls, not five per Leg`);
ok(a.briefSame, "(a) the Brief changed under the stage");
const planTextA = existsSync(a.planPath) ? readFileSync(a.planPath, "utf8") : "";
ok(planTextA !== "" && !/z_fewer|a_more/.test(planTextA), `(a) the plan file holds a Move's id: ${planTextA}`);
ok(
  legsA.length === 2 &&
    JSON.stringify(legsA[0].segments) ===
      JSON.stringify([
        { bind: 1, edges: [] },
        { bind: 2, edges: [{ sense: "Conjunction", to: [1] }] },
        { bind: null, edges: [{ sense: null, to: [2], hypophora: true }] },
      ]),
  `(a) Leg s1's Segments are not z_fewer's fitted by its first best filling: ${JSON.stringify(legsA[0] && legsA[0].segments)}`,
);
const draftRead = readParagraphPlanBeside(a.brief, readFileSync(a.brief, "utf8"), LEGS);
ok(
  !draftRead.error && draftRead.segments.get("s1").length === 3,
  `(a) /draft's reader refused the plan: ${draftRead.error}`,
);
ok(/Move z_fewer, 1 of 1 compared Edge\(s\) met/.test(a.out), `(a) the await output names no Move and fit: ${a.out}`);
// (b) the tie: z_fewer and a_more both meet one Edge; z_fewer compares one, a_more two. The Move taken and its fit
// are read from the job's own record of each Leg in the run directory.
const takenA = ((readReaderPathJob(a.dir) || {}).units || []).map((u) => u.candidate || {});
ok(
  takenA.length === 2 && takenA.every((c) => c.move === "z_fewer" && c.fit.met === 1 && c.fit.compared === 1),
  `(b) of two Moves with the same count the one with fewer compared Edges was not taken: ${JSON.stringify(takenA.map((c) => [c.move, c.fit]))}`,
);

// (c) A READING REFUSED ONCE IS ASKED AGAIN; TWICE, THE LEG STOPS.
const c1 = runStage("refuse-once");
ok(
  c1.wait.status === 0 && c1.plan && c1.plan.legs.every((l) => Array.isArray(l.segments)),
  `(c) a reading refused once did not finish: ${c1.out}`,
);
ok(
  c1.calls.filter((c) => c.row === "paragraph_plan_name_senses").length === 12,
  `(c) a refused reading was not asked again exactly once per Leg: ${c1.calls.length} calls`,
);
const c2 = runStage("refuse-twice");
ok(c2.wait.status !== 0 && !c2.plan, `(c) a reading refused twice did not stop the stage: ${c2.out}`);
ok(
  /Leg s1/.test(c2.out) && /refused 2 times/.test(c2.out),
  `(c) the stop names no Leg and no second refusal: ${c2.out}`,
);
ok(
  c2.calls.filter((c) => c.row === "paragraph_plan_name_senses").length === 4 && c2.calls.length === 4,
  `(c) a Leg went on after its reading was refused twice: ${JSON.stringify(c2.calls)}`,
);

const pairs3 = (senses) => [
  { pair: [1, 2], senses },
  { pair: [1, 3], senses },
  { pair: [2, 3], senses },
];
// (e) NO MOVE IS A CANDIDATE: a Brief's Leg has three sentences or more and a Move file three Bind targets or fewer,
// so the Leg steps are handed a Move of four directly; the unit ends with no Move and no Segments.
{
  const steps = new P.ParagraphPlanLegSteps(
    {
      legs: [{ leg_id: "s1" }],
      sentences: [S.legSentences(STRUCTURE, "c_1")],
      moves: [{ id: WIDE.id, segments: WIDE.segments }],
      keep: 3,
    },
    { runDir: join(root, "steps-e"), cli: null, callArgv: [] },
  );
  let act = steps.begin("leg-1");
  const reading = { pairs: pairs3([{ sense: "Conjunction", played_by: null }]) };
  const rows = [];
  while (act.call) {
    rows.push(act.call.phase);
    act = steps.answered("leg-1", { raw: "{}", record: reading });
  }
  ok(
    rows.length === 5 && rows.every((r) => r === "reading"),
    `(e) the steps made calls other than five readings: ${rows}`,
  );
  ok(
    act.done && Object.keys(act.done).sort().join() === "leg_id,note",
    `(e) a Leg no Move fits carries more than its id: ${JSON.stringify(act)}`,
  );
  ok(
    /Leg s1: no Move file is a candidate/.test((act.done || {}).note),
    `(e) the status line does not name the Leg: ${JSON.stringify(act)}`,
  );
  const lines = P.legLines(act.done);
  ok(lines.length === 1 && lines[0] === act.done.note, `(e) the await lines do not carry the note: ${lines}`);
}

// (f) THE KEYS THAT LEFT THE RECORD.
for (const [key, at] of [
  ["paragraphs", "leg"],
  ["move_forced_by", "leg"],
  ["analogy", "top"],
  ["mapping", "top"],
]) {
  const text = readFileSync(a.planPath, "utf8");
  const rec = parseYaml(text, a.planPath);
  if (at === "top") rec[key] = { none: "x" };
  else rec.legs[0][key] = [];
  writeFileSync(a.planPath, stringifyYaml(rec));
  const r = readParagraphPlanBeside(a.brief, readFileSync(a.brief, "utf8"), LEGS);
  ok(
    r.error && r.error.includes(`\`${key}\``) && r.error.includes("run /paragraph-plan on this Brief again"),
    `(f) a plan carrying \`${key}\` was not refused by name: ${r.error}`,
  );
  writeFileSync(a.planPath, text);
}

// (f2) A SEGMENT WITH NOTHING BOUND AT NEITHER END OF AN EDGE (kogaki#1902): refused naming it, and read once a
// further Segment's Edge points to it.
{
  const text = readFileSync(a.planPath, "utf8");
  const rec = parseYaml(text, a.planPath);
  const segs = rec.legs[0].segments;
  segs.push({ bind: null, edges: [] });
  const n = segs.length;
  writeFileSync(a.planPath, stringifyYaml(rec));
  const r1 = readParagraphPlanBeside(a.brief, readFileSync(a.brief, "utf8"), LEGS);
  ok(
    r1.error && r1.error.includes(`leg ${LEGS[0].leg_id}, Segment ${n} has no \`bind\`, carries no Edge`),
    `(f2) a Segment with nothing bound at neither end of an Edge was not refused naming it: ${r1.error}`,
  );
  segs.push({ bind: null, edges: [{ sense: "Conjunction", to: [n] }] });
  writeFileSync(a.planPath, stringifyYaml(rec));
  const r2 = readParagraphPlanBeside(a.brief, readFileSync(a.brief, "utf8"), LEGS);
  ok(!r2.error, `(f2) a Segment a later Edge points to was refused: ${r2.error}`);
  writeFileSync(a.planPath, text);
}

// (g) THE CHOICE BY ITSELF.
const counted = S.countPairs([{ pairs: pairs3([{ sense: "Conjunction", played_by: null }]) }], 3, names, 3);
const pick = (moves) => P.chooseMove(moves, counted, 3, names);
const twin = (id) => ({ ...Z_FEWER, id });
ok(pick([twin("b"), twin("a")]).move.id === "a", "(g) of two equal Moves the id first in order was not taken");
ok(pick([A_MORE, Z_FEWER]).move.id === "z_fewer", "(g) the fewer compared Edges did not decide before the id");
const MEETS_TWO = move("m", [
  seg(1),
  { ...seg(2, [{ sense: "Conjunction", to: [1] }]), relation: "a." },
  { ...seg(3, [{ sense: "Conjunction", to: [2] }]), relation: "b." },
]);
ok(pick([Z_FEWER, MEETS_TWO]).move.id === "m", "(g) the higher count did not decide first");
const NONE_MET = move("n", [seg(1), { ...seg(2, [{ sense: "Contrast", to: [1] }]), relation: "a." }]);
const zero = pick([NONE_MET]);
ok(
  zero && zero.move.id === "n" && zero.met === 0 && zero.compared === 1,
  `(g) a Move whose count is 0 was not taken: ${JSON.stringify(zero)}`,
);
ok(pick([WIDE]) === null, "(g) a Move with more Bind targets than sentences was a candidate");
ok(pick([]) === null, "(g) an empty library gave a Move");

// (h) WHAT `start` REFUSES.
const h1 = runStage("ok", { brief: newBrief(null) });
ok(
  h1.start.status !== 0 && /carries no `structure`/.test(h1.out) && !existsSync(h1.dir),
  `(h) a Brief with no structure was not refused: ${h1.out}`,
);
const h2 = runStage("ok", { moves: MOVES_UNEDGED });
ok(
  h2.start.status !== 0 && /The Move plain|Move plain/.test(h2.out) && h2.calls.length === 0,
  `(h) a Move with no Edges was not refused: ${h2.out}`,
);

// (i) THE VIEW.
const view = P.paragraphPlanView(a.planPath, { runDir: a.dir });
const viewText = view.lines ? view.lines.join("\n") : view.error;
ok(
  !/z_fewer/.test(viewText) && !/compared Edge/.test(viewText) && !/Point/.test(viewText),
  `(i) the view shows a Move, a fit or a Point column: ${viewText}`,
);
ok(
  /\| Segment \| Bound \| Edges \|/.test(viewText) &&
    /\| 2 \| 2\. /.test(viewText) &&
    /Conjunction to 1/.test(viewText),
  `(i) the view shows no Segment row: ${viewText}`,
);

// (j) A MOVE RECORD WITH `bind` AND `edges` NEEDS NO OPERATION OR RELATION.
const bare = move("bare", [
  { bind: 1, edges: [] },
  { bind: 2, edges: [{ sense: "Conjunction", to: [1] }] },
]);
const vb = validateMoveRecord(bare, MOVES);
ok(!vb.error, `(j) a Move whose Segments carry bind and edges was refused for its operation or relation: ${vb.error}`);
const vo = validateMoveRecord(move("old", [{ operation: "opens." }, { operation: "closes." }]), MOVES);
ok(
  vo.error && /relation/.test(vo.error),
  `(j) a Move with no bind and edges was admitted without its relation: ${vo.error}`,
);

// (k) THE SKILL NAMES ONLY WHAT THE HARNESS HAS: every `node <module> <subcommand>` it names is handled, and it
// names start, status and await.
{
  const skill = readFileSync(".claude/skills/paragraph-plan/SKILL.md", "utf8");
  const named = [...skill.matchAll(/node (src\/[\w./-]+\.mjs) (\w+)/g)].map((m) => [m[1], m[2]]);
  const unhandled = named.filter(
    ([mod, sub]) => !existsSync(mod) || !readFileSync(mod, "utf8").includes(`case "${sub}":`),
  );
  ok(
    named.length > 0 && !unhandled.length,
    `(k) SKILL.md names entry points the Harness does not have: ${JSON.stringify(unhandled)}`,
  );
  ok(
    ["start", "status", "await"].every((sub) => named.some(([m, x]) => m === "src/paragraph-plan.mjs" && x === sub)),
    "(k) SKILL.md does not name start, status and await on src/paragraph-plan.mjs",
  );
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log(`paragraph-plan: ${cases} case(s) pass`);
