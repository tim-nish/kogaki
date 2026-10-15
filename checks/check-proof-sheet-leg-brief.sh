#!/usr/bin/env bash
# check-proof-sheet-leg-brief — the Leg Brief composer writes, from the Extractions of one
# original Leg, a Brief /paragraph-plan and /draft accept unedited (kogaki#1385, owner
# decision 2026-10-15).
#
# WHAT THIS COVERS, driven end to end through `node src/proof-sheet/leg-brief.mjs run` over
# a three-paragraph Leg, an Extractor run directory this member writes, and a FAKE judge
# binary (`KOGAKI_JUDGE_CLI`) — never the actual `claude` CLI:
#   (a) the run writes `brief.yaml` with ONE Leg carrying three Leg Waypoints and three
#       Claims, its Reader start and after-state as the record's five-key maps, and every
#       constant field marked by the constant comment.
#   (b) the gate the Brief must pass: /paragraph-plan's own `readAdoptedBrief` accepts it,
#       and `node src/draft.mjs resolve` accepts it with a plan written beside it by the
#       ParagraphPlan stage's own writer — neither file edited.
#   (c) the run directory holds, per row, the prompt as rendered, the answer, and the
#       attempt count with every refusal: the Reader start's first answer is a knowledge
#       sentence, is refused by the production shape check, and the refusal is put
#       verbatim into the second attempt's prompt.
#   (d) each rendered prompt carries its row's judgment point DERIVED from the production
#       row — production text outside the substitutions present, the substituted spans
#       absent — and `leg-brief.mjs diff` lists the substitutions and applies cleanly; a
#       substitution naming a span production no longer carries refuses naming it.
#   (e) every call ran with `--tools ""`, on the shared supervisor.
#   (f) the validators refuse by name: a Leg carrying `move`, a Leg Waypoint count other
#       than the paragraph count, Claim N not naming L<N>, a Leg Waypoint carrying the
#       retired `effect` (production `waypointsRefusal`), a `reader_state_after` that is
#       not `dimension: value` lines (production `validateLegs`), and a Reader start that is
#       not (production `readerStateShapeRefusal`); a good Leg passes.
#
# NOT COVERED, stated rather than implied: the call-limit stop and the stall bound are the
# shared supervisor's, held by checks/check-brief-reader-path-job.sh. Whether a live model's
# Brief is any good is the owner's reading, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const LB = await imp("src/proof-sheet/leg-brief.mjs");
const { parseBriefRecord, briefLegs } = await imp("src/compose.mjs");
const { readAdoptedBrief, paragraphPlanRecord, paragraphPlanRecordText, paragraphPlanPathFor } = await imp("src/paragraph-plan.mjs");
const root = mkdtempSync(join(tmpdir(), "proof-sheet-leg-brief-"));

// ---- the original Leg and its Extractor run ----
const PARAS = [
  "The installer copies the kit into the consumer's tree.",
  "The next run copies it again. Any edit to the copy is gone.",
  "So the copy belongs to the installer, not to the consumer.",
];
writeFileSync(join(root, "leg.txt"), `${PARAS.join("\n\n")}\n`);
const dims = ["knowledge", "question", "expectation", "orientation", "trust"];
const xrun = join(root, "extractor-run");
for (const [i] of PARAS.entries()) {
  mkdirSync(join(xrun, `p${i + 1}`), { recursive: true });
  writeFileSync(join(xrun, `p${i + 1}`, "answer.json"), JSON.stringify({
    version: "1", paragraph: i + 1, what_it_does: `WHAT-${i + 1}`, name: `move_${i + 1}`,
    reader: dims.map((d) => ({ dimension: d, before: `B${i + 1}-${d}`, after: d === "knowledge" ? `A${i + 1}-${d}` : "unchanged", segment: d === "knowledge" ? "1" : "" })),
  }));
}
writeFileSync(join(xrun, "extractions.json"), JSON.stringify({ leg: join(root, "leg.txt"), passage: "copy-leg", written: ["move_1.md", "move_2.md", "move_3.md"] }));

// ---- the fake judge ----
const judge = join(root, "fake-judge.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PSL_FIXTURE_DIR;
appendFileSync(dir + "/argv.jsonl", JSON.stringify(process.argv.slice(2)) + "\\n");
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER WAS REFUSED -----");
  let record;
  if (prompt.includes("\`leg_reader_start_unit\` judgment point")) {
    record = retried
      ? { version: "1", reader_start: ["knowledge: holds that installers copy files", "question: holds: none", "trust: extends a peer's ordinary good faith"] }
      : { version: "1", reader_start: ["The reader knows installers copy files."] };
  } else {
    const ps = input.paragraphs;
    record = { legs: [{ leg_id: "copy-leg", purpose: "Move the reader from owning the copy to seeing who owns it.",
      rationale: "It is the only Leg.", reader_state_after: "knowledge: holds that the installer owns the copy\\norientation: sees the copy as the installer's",
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " from " + p.extraction.what_it_does })),
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph, serves: [p.claim_strand] })) }] };
  }
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(record) }) + "\\n");
  process.exit(0);
});
`);
chmodSync(judge, 0o755);

const out = join(root, "theses", "copy-leg");
const r = spawnSync(process.execPath, ["src/proof-sheet/leg-brief.mjs", "run", "--extractions", xrun, "--out", out],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSL_FIXTURE_DIR: root }, timeout: 300000 });
ok(r.status === 0, `(a) the run exited ${r.status}: ${r.stdout}${r.stderr}`);
const briefPath = join(out, "brief.yaml");
const runDir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];

// (a) the Brief
const text = existsSync(briefPath) ? readFileSync(briefPath, "utf8") : "";
if (!text) fails.push(`(a) no Brief written at ${briefPath}`);
else {
  const p = parseBriefRecord(text, briefPath);
  ok(!p.error, `(a) the Brief does not parse: ${p.error}`);
  const rec = p.record || {};
  const legs = rec.reader_path || [];
  ok(legs.length === 1, `(a) the Brief carries ${legs.length} Leg(s), not one`);
  const leg = legs[0] || {};
  ok((leg.waypoints || []).length === 3 && (leg.claims || []).length === 3, "(a) the Leg does not carry three Leg Waypoints and three Claims");
  ok((leg.waypoints || []).every((w, i) => w.point === `POINT-${i + 1}` && w.serves[0] === `L${i + 1}`), "(a) a Leg Waypoint is not paragraph N's point serving L<N>");
  ok(!("move" in leg) && !("no_move_fits" in leg), "(a) the Brief's Leg carries a Move field");
  ok(rec.reader_start && rec.reader_start.knowledge === "holds that installers copy files", `(a) the Reader start is not the composed one as a map: ${JSON.stringify(rec.reader_start)}`);
  ok(leg.reader_state_after && leg.reader_state_after.orientation === "sees the copy as the installer's", "(a) the Leg's after-state is not the composed one as a map");
  for (const k of Object.keys(LB.constantFields({ slug: "s", paragraphs: PARAS, legId: "x" }))) {
    ok(new RegExp(`^${LB.CONSTANT_COMMENT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n${k}:`, "m").test(text), `(a) the constant field \`${k}\` is not marked`);
  }
  ok(text.split("\n").every((l) => l.length <= 120), "(a) a line of the Brief is longer than 120 characters");

  // (b) /paragraph-plan's own read, and /draft resolve with a plan written by the stage's writer
  const pp = readAdoptedBrief(briefPath);
  ok(!pp.error, `(b) /paragraph-plan refused the Brief: ${pp.error}`);
  const planLegs = briefLegs(rec).map((l) => ({ leg_id: l.leg_id, waypoints: l.waypoints.map((w, i) => [{ point: `Paragraph ${i + 1}.`, serves: [...w.serves] }]) }));
  writeFileSync(paragraphPlanPathFor(briefPath), paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText: text, legs: planLegs })));
  const dr = spawnSync(process.execPath, ["src/draft.mjs", "resolve", "--brief", briefPath, "--workspace", join(root, "ws")], { encoding: "utf8", timeout: 120000 });
  ok(dr.status === 0, `(b) /draft resolve refused the Brief: ${(dr.stderr || dr.stdout || "").slice(0, 600)}`);
  ok(readFileSync(briefPath, "utf8") === text, "(b) the Brief changed under /paragraph-plan or /draft");
}

// (c) the run directory, and (d) the derived prompts
if (!runDir) fails.push("(c) the run printed no run directory");
else {
  const table = JSON.parse(readFileSync(join(repo, "src", "proof-sheet", "extraction-workflow.json"), "utf8"));
  for (const [sub, key, attempts] of [["reader-start", "leg_reader_start_unit", 2], ["leg-path", "leg_path_unit", 1]]) {
    const d = join(runDir, sub);
    const prompt = existsSync(join(d, "prompt.md")) ? readFileSync(join(d, "prompt.md"), "utf8") : "";
    ok(prompt.includes(`You are the judge at the Leg Brief composer workflow's \`${key}\` judgment point.`), `(c) ${sub}/prompt.md is not the ${key} row rendered by judgePrompt`);
    ok(existsSync(join(d, "answer.json")), `(c) ${sub}/answer.json was not written`);
    const a = existsSync(join(d, "attempts.json")) ? JSON.parse(readFileSync(join(d, "attempts.json"), "utf8")) : {};
    ok(a.attempts === attempts, `(c) ${sub}/attempts.json records ${a.attempts} attempt(s), not ${attempts}`);
    const derived = LB.derivedRow(table, key);
    ok(!derived.error && prompt.includes(`JUDGMENT POINT: ${derived.row.judgment_point}`), `(d) ${sub}/prompt.md does not carry the derived judgment point: ${derived.error || ""}`);
    for (const s of table[key].substitutions) {
      if (s.from) ok(!prompt.includes(s.from), `(d) ${sub}/prompt.md still carries the substituted production span ${JSON.stringify(s.from.slice(0, 60))}`);
    }
  }
  const rs = existsSync(join(runDir, "reader-start", "attempts.json")) ? JSON.parse(readFileSync(join(runDir, "reader-start", "attempts.json"), "utf8")) : {};
  ok(Array.isArray(rs.refusals) && rs.refusals.length === 1 && /reader_start is not written as `dimension: value` lines/.test(rs.refusals[0]),
    `(c) reader-start/attempts.json does not record the production shape refusal: ${JSON.stringify(rs.refusals)}`);
  const prompts = readFileSync(join(root, "prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  ok(prompts.length === 3, `(c) the fake judge was called ${prompts.length} time(s), not 3`);
  ok(prompts[1] && rs.refusals && prompts[1].includes(rs.refusals[0]), "(c) the second Reader start attempt's prompt does not carry the refusal verbatim");
  ok(prompts[0] && prompts[0].includes("Author this Leg's READER START") && !prompts[0].includes("leg1_survivors"), "(d) the Reader start prompt is not the cut production row");
  ok(prompts[2] && prompts[2].includes("EVERY LEG CARRIES ITS WAYPOINTS (kogaki#1311)") && prompts[2].includes("THE SCHEMA THE ELEMENTS OF YOUR RECORD ARE FILLED AGAINST -- src/leg-schema.json"),
    "(d) the Leg path prompt does not carry the production text kept or the Leg schema");
}
const diff = spawnSync(process.execPath, ["src/proof-sheet/leg-brief.mjs", "diff"], { encoding: "utf8" });
ok(diff.status === 0 && (diff.stdout.match(/applies cleanly to the production text/g) || []).length === 2, `(d) \`leg-brief.mjs diff\` does not apply both rows cleanly: ${diff.stdout}${diff.stderr}`);
{
  const table = JSON.parse(readFileSync(join(repo, "src", "proof-sheet", "extraction-workflow.json"), "utf8"));
  table.leg_path_unit.substitutions[0] = { from: "a span production never carried", to: "x" };
  const d = LB.derivedRow(table, "leg_path_unit");
  ok(/substitution 1: the production text no longer carries "a span production never carried"/.test(d.error || ""), `(d) a substitution naming an absent span was not refused by name: ${d.error}`);
}

// (e) --tools ""
const argvs = existsSync(join(root, "argv.jsonl")) ? readFileSync(join(root, "argv.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
ok(argvs.length === 3 && argvs.every((a) => { const i = a.indexOf("--tools"); return i >= 0 && a[i + 1] === ""; }), `(e) a call ran without \`--tools ""\`: ${JSON.stringify(argvs)}`);

// (f) the validators, directly
const inputs = { paragraph_count: 2, reader_start: "knowledge: holds nothing yet" };
const good = () => ({ legs: [{ leg_id: "g", purpose: "p", rationale: "r", reader_state_after: "knowledge: holds it",
  claims: [{ type: "strand", strand: "L1", proposition: "one" }, { type: "strand", strand: "L2", proposition: "two" }],
  waypoints: [{ point: "first", serves: ["L1"] }, { point: "second", serves: ["L2"] }] }] });
ok(!LB.validateLegPathUnit(good(), inputs).error, `(f) a good Leg was refused: ${LB.validateLegPathUnit(good(), inputs).error}`);
const m1 = good(); m1.legs[0].move = "some_move";
ok(/carries `move`, which it does not declare/.test(LB.validateLegPathUnit(m1, inputs).error || ""), "(f) a Leg carrying `move` was not refused by name");
const m2 = good(); m2.legs[0].waypoints.pop();
ok(/one Leg Waypoint per paragraph/.test(LB.validateLegPathUnit(m2, inputs).error || ""), "(f) a Leg Waypoint count other than the paragraph count was not refused");
const m3 = good(); m3.legs[0].claims[1].strand = "L7";
ok(/Claim 2 names "L7", not L2/.test(LB.validateLegPathUnit(m3, inputs).error || ""), "(f) Claim N not naming L<N> was not refused");
const m4 = good(); m4.legs[0].waypoints[1].effect = "the reader feels it";
ok(/waypoint 2 carries `effect`, which is retired/.test(LB.validateLegPathUnit(m4, inputs).error || ""), "(f) a Leg Waypoint carrying `effect` was not refused by waypointsRefusal");
const m5 = good(); m5.legs[0].reader_state_after = "The reader now holds it.";
ok(/reader_state_after is not written as `dimension: value` lines/.test(LB.validateLegPathUnit(m5, inputs).error || ""), "(f) a reader_state_after that is not dimension lines was not refused by validateLegs");
ok(/reader_start is not written as `dimension: value` lines/.test(LB.validateLegReaderStartUnit({ version: "1", reader_start: ["A sentence."] }).error || ""), "(f) a malformed Reader start was not refused by readerStateShapeRefusal");
ok(!LB.validateLegReaderStartUnit({ version: "1", reader_start: ["knowledge: holds nothing"] }).error, "(f) a good Reader start was refused");

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-leg-brief");
JS
