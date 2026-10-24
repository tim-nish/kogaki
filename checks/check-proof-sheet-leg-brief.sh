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
#   (g) THE LEG CALL READS AN EXTRACTION'S PARAGRAPH CONTENT ONLY (kogaki#1449): the fixture
#       Extractions carry `why_this_order`, `breaks`, `presupposes`, `description` and `notes`,
#       and the Leg call's rendered input carries none of them, nor `name`, while it still
#       carries each paragraph's `what_it_does`, `reader` rows and Segment `content` clauses.
#   (h) THE LEG CALL WRITES A CLAIM FROM WHAT THE PARAGRAPH SAYS (kogaki#1480): the rendered
#       Leg call instruction names the paragraph's `text` and its Segment `content` clauses as
#       the source of the `proposition` and the `point`, forbids a characterisation of the
#       paragraph in them, and names `what_it_does` and `reader` beside `reader_state_after`,
#       `purpose` and `rationale` and never as a `proposition`'s source.
#   (i) THE WORDS ARE THE SEGMENT CONTENT'S (kogaki#1495): the Leg validator, handed each
#       paragraph's Segment `content`, refuses a Leg Waypoint whose point carries a word in no
#       Segment `content` of its paragraph, naming the word and the Segments, and the same for a
#       Claim's proposition; a point built from the Segment's own words, a word the Leg
#       `introduces` and function words passes; a validator handed no Segment content refuses
#       rather than passing; the run hands the validator the Extractions' Segment content and
#       records `anchored: true` in its `brief.json`; and the rendered Leg call carries the
#       Segment-content sentence in place of production's renderings-record sentence.
#   (j) THE TERMS FILE IS RETIRED (kogaki#1498, retired by kogaki#1529, kogaki#1531): a run given
#       `--terms` exits non-zero with the retirement sentence and starts no run directory; the
#       validator refuses an `introduces` entry carrying the retired `kind`, naming the term; a run
#       without it carries no `introduces_given_kinds` and `brief.json` carries no `terms` key.
#   (k) THE EARLIER LEGS' IDS ARE SHOWN (kogaki#1560): over a two-Leg Extractor run, the first
#       Leg's rendered prompt carries `leg_ids_already_carried` empty and the second Leg's carries
#       the first Leg's id, and the rendered Leg call states that this Leg's `leg_id` is none of them.
#   (l) THE OBLIGATION ROWS COME FROM THE `discharges` MARK (kogaki#1570), driven through
#       `obligationRows` over three two-paragraph Legs: a marked passage, paragraph 2 raising two
#       items and paragraph 5 marked, gives one row owed by every Leg from the second through the
#       marked one and one `{ leg_id, items, kept_by }`; an unmarked passage is refused naming
#       paragraph 2 and both items; and a raising and a discharging paragraph in one Leg give no row.
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

// A HANDED-IN HEARTBEAT (kogaki#1424): every fixture job this check starts, and every
// poll over its record, runs at 100 ms instead of the production table's 10 s; the
// table itself is untouched (`jobHeartbeatMs` in src/workflow/detached-job.mjs).
process.env.KOGAKI_JOB_HEARTBEAT_MS = "100";
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
    // The Segment content carries the fake judge's words, so its Leg is recoverable (kogaki#1495).
    segments: [{ content: `CONTENT-${i + 1} CLAIM-${i + 1} POINT-${i + 1}`, operation: `DOES-${i + 1}`, relation: "" }],
    why_this_order: `ORDER-${i + 1}`, presupposes: `PRESUPPOSES-${i + 1}`, breaks: [`BREAKS-${i + 1} - the reader loses it`],
    description: `DESCRIPTION-${i + 1}`, notes: `NOTES-${i + 1}`,
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
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER (attempt ");
  let record;
  if (prompt.includes("\`leg_reader_start_unit\` judgment point")) {
    record = retried
      ? { version: "1", reader_start: ["knowledge: holds that installers copy files", "question: holds: none", "trust: extends a peer's ordinary good faith"] }
      : { version: "1", reader_start: ["The reader knows installers copy files."] };
  } else {
    const ps = input.paragraphs;
    // a later Leg's id is its own, so the two-Leg run of (k) composes (kogaki#1560)
    record = { legs: [{ leg_id: ps[0].claim_strand === "L1" ? "copy-leg" : "copy-leg-" + ps[0].claim_strand, purpose: "Move the reader from owning the copy to seeing who owns it.",
      rationale: "It is the only Leg.", reader_state_after: "knowledge: holds that the installer owns the copy\\norientation: sees the copy as the installer's",
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " from " + p.extraction.what_it_does })),
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph + " CLAIM-" + p.paragraph, serves: [p.claim_strand] })) }] };
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
  ok((leg.waypoints || []).every((w, i) => w.point === `POINT-${i + 1} CLAIM-${i + 1}` && w.serves[0] === `L${i + 1}`), "(a) a Leg Waypoint is not paragraph N's point serving L<N>");
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
  const planLegs = briefLegs(rec).map((l) => ({ leg_id: l.leg_id, waypoints: l.waypoints.map((w, i) => [{ point: `Paragraph ${i + 1}.`, serves: [...w.serves] }]),
    // a later Leg Waypoint's join is one relation word (kogaki#1477).
    joins: l.waypoints.map((w, i) => (i ? "consequence" : null)) }));
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
// (g) the Leg call's input: each paragraph's Extraction, its paragraph-content parts only
{
  const prompts = existsSync(join(root, "prompts.jsonl")) ? readFileSync(join(root, "prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  const leg = prompts.find((p) => p.includes("`leg_path_unit` judgment point")) || "";
  const marker = "----- INPUT (JSON) -----";
  let input = null;
  try { input = JSON.parse(leg.slice(leg.indexOf(marker) + marker.length)); } catch { /* reported below */ }
  const xs = input && Array.isArray(input.paragraphs) ? input.paragraphs.map((p) => p.extraction || {}) : [];
  ok(xs.length === 3, `(g) the Leg call's rendered input carries ${xs.length} paragraph Extraction(s), not 3`);
  for (const [i, x] of xs.entries()) {
    for (const k of ["why_this_order", "breaks", "presupposes", "description", "name", "notes"]) {
      ok(!(k in x), `(g) paragraph ${i + 1}'s Extraction in the Leg call's input carries \`${k}\``);
    }
    ok(x.what_it_does === `WHAT-${i + 1}` && Array.isArray(x.reader) && x.reader.length === 5,
      `(g) paragraph ${i + 1}'s Extraction in the Leg call's input lost \`what_it_does\` or its \`reader\` rows`);
    ok(JSON.stringify(x.segments) === JSON.stringify([{ content: `CONTENT-${i + 1} CLAIM-${i + 1} POINT-${i + 1}` }]),
      `(g) paragraph ${i + 1}'s Extraction in the Leg call's input does not carry its Segment content clauses alone: ${JSON.stringify(x.segments)}`);
  }
  ok(!/ORDER-\d|BREAKS-\d/.test(leg), "(g) the Leg call's rendered prompt still carries a `why_this_order` or `breaks` text");
}
// (h) the Leg call's instruction: the Claim and the point from the text, the reader states from the analysis
{
  const prompts = existsSync(join(root, "prompts.jsonl")) ? readFileSync(join(root, "prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  const leg = prompts.find((p) => p.includes("`leg_path_unit` judgment point")) || "";
  const jp = (leg.match(/^JUDGMENT POINT: (.*)$/m) || [])[1] || "";
  ok(jp, "(h) the Leg call's rendered prompt carries no judgment point");
  ok(jp.includes("Claim N's `proposition` and Leg Waypoint N's `point` are written from paragraph N's `text`, with its Extraction's Segment `content` clauses"),
    "(h) the Leg call's instruction does not name the paragraph's `text` and its Segment `content` clauses as the source of the proposition and the point");
  ok(/carry no characterisation of the paragraph -- no "exhaustively", "exactly", "only" or "in parallel"/.test(jp),
    "(h) the Leg call's instruction does not forbid a characterisation of the paragraph in the proposition and the point");
  const clauses = jp.split(/; |\. /);
  const analysis = clauses.filter((c) => c.includes("`what_it_does`") || c.includes("(`reader`)"));
  ok(analysis.length > 0 && analysis.every((c) => /`reader_state_after`, `purpose` and `rationale` only/.test(c)),
    `(h) a clause naming \`what_it_does\` or \`reader\` does not name them for \`reader_state_after\`, \`purpose\` and \`rationale\`: ${JSON.stringify(analysis)}`);
  ok(!analysis.some((c) => /`proposition`[^;]*written from/.test(c)), `(h) the Leg call's instruction still writes a \`proposition\` from \`what_it_does\` or \`reader\`: ${JSON.stringify(analysis)}`);
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
const inputs = { paragraph_count: 2, reader_start: "knowledge: holds nothing yet", segments: [["one first"], ["two second"]] };
const good = () => ({ legs: [{ leg_id: "g", purpose: "p", rationale: "r", reader_state_after: "knowledge: holds it",
  claims: [{ type: "strand", strand: "L1", proposition: "one" }, { type: "strand", strand: "L2", proposition: "two" }],
  waypoints: [{ point: "first", serves: ["L1"] }, { point: "two second", serves: ["L2"] }] }] });
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

// (i) the recoverability criterion over the Segment content
{
  const segs = [["The installer copies the kit.", "The consumer's tree receives it."], ["The next run copies it again."]];
  const leg = (point2, proposition1 = "The installer copies the kit") => ({ legs: [{ leg_id: "g", purpose: "p", rationale: "r",
    reader_state_after: "knowledge: holds it",
    introduces: ["copy — the kit as it stands in the consumer's tree"],
    claims: [{ type: "strand", strand: "L1", proposition: proposition1 }, { type: "strand", strand: "L2", proposition: "The next run copies it" }],
    waypoints: [{ point: "The installer copies the kit into the consumer's tree", serves: ["L1"] }, { point: point2, serves: ["L2"] }] }] });
  const iIn = { paragraph_count: 2, reader_start: "knowledge: holds nothing yet", segments: segs };
  const pass = LB.validateLegPathUnit(leg("The next run copies the copy again"), iIn);
  ok(!pass.error, `(i) a point built from its Segment's own words, an introduced term and function words was refused: ${pass.error}`);
  const bad = LB.validateLegPathUnit(leg("The next run overwrites the copy again"), iIn).error || "";
  ok(/`waypoints\[1\]\.point` carries "overwrites", which is in no Segment `content` of paragraph 2's Segment 1/.test(bad),
    `(i) a point carrying a word in no Segment content of its paragraph was not refused naming the word and the Segment: ${bad}`);
  const badClaim = LB.validateLegPathUnit(leg("The next run copies it again", "The installer ships the kit"), iIn).error || "";
  ok(/`claims\[0\]\.proposition` carries "ships", which is in no Segment `content` of paragraph 1's Segments 1–2/.test(badClaim),
    `(i) a proposition carrying a word in no Segment content of its paragraph was not refused naming the word and the Segments: ${badClaim}`);
  // a word of ANOTHER paragraph's Segment is not this paragraph's material
  const cross = LB.validateLegPathUnit(leg("The next run copies the consumer's tree"), iIn).error || "";
  ok(/carries "consumer's", which is in no Segment `content` of paragraph 2's/.test(cross),
    `(i) a point recovered only from another paragraph's Segment content passed: ${cross}`);
  // the Claim's words in its points (kogaki#1547): a point recovered from its Segment that drops
  // a Claim word refuses, naming the Claim, the word and the Waypoints read; a Claim word an
  // `introduces` entry carries needs no point
  const dropped = LB.validateLegPathUnit(leg("The run copies the copy again"), iIn).error || "";
  ok(/Claim 2 \(L2\) carries "next" in its `proposition`, which is in no `point` of the Leg Waypoints serving L2 \(read: waypoint 2\) and in no `introduces` entry/.test(dropped),
    `(i) a point dropping a word of the Claim it serves was not refused naming the Claim, the word and the Waypoint: ${dropped}`);
  const m6 = leg("The next run copies the copy again"); m6.legs[0].waypoints[0].point = "The installer copies the copy";
  ok(!LB.validateLegPathUnit(m6, iIn).error, `(i) a Claim word carried by an \`introduces\` entry and no point was refused: ${LB.validateLegPathUnit(m6, iIn).error}`);
  const none = LB.validateLegPathUnit(leg("The next run copies it again"), { paragraph_count: 2, reader_start: "knowledge: holds nothing yet" }).error || "";
  ok(/handed no paragraph\(s\) of Segment content/.test(none), `(i) a validator handed no Segment content did not refuse: ${none}`);
  ok(JSON.stringify(LB.segmentContents([{ segments: [{ content: "a", operation: "x" }, { content: "b" }] }, {}])) === JSON.stringify([["a", "b"], []]),
    "(i) segmentContents does not read each paragraph's Segment content clauses alone");
  const bj = runDir && existsSync(join(runDir, "brief.json")) ? JSON.parse(readFileSync(join(runDir, "brief.json"), "utf8")) : {};
  ok(bj.anchored === true, `(i) the run's brief.json does not record \`anchored: true\`: ${JSON.stringify(bj)}`);
  const unitsPath = runDir ? join(runDir, "leg-path", "reader-path-job-units.json") : "";
  const v = unitsPath && existsSync(unitsPath) ? (JSON.parse(readFileSync(unitsPath, "utf8")).validator || {}) : {};
  ok(v.export === "validateLegPathUnit" && JSON.stringify((v.inputs || {}).segments) === JSON.stringify([1, 2, 3].map((n) => [`CONTENT-${n} CLAIM-${n} POINT-${n}`])),
    `(i) the run did not hand the Leg validator the Extractions' Segment content: ${JSON.stringify(v.inputs)}`);
  const prompts = existsSync(join(root, "prompts.jsonl")) ? readFileSync(join(root, "prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  const legP = prompts.find((p) => p.includes("`leg_path_unit` judgment point")) || "";
  ok(legP.includes("THE WORDS ARE THE SEGMENT CONTENT'S (kogaki#1495)") && !legP.includes("THE RENDERINGS RECORD (kogaki#1494)"),
    "(i) the Leg call does not carry the Segment-content sentence in place of production's renderings-record sentence");
}

// (j) the terms file
{
  const bj0 = runDir && existsSync(join(runDir, "brief.json")) ? JSON.parse(readFileSync(join(runDir, "brief.json"), "utf8")) : {};
  ok(Object.keys(bj0).length > 0 && !("terms" in bj0), `(j) brief.json is missing or carries a \`terms\` key: ${JSON.stringify(bj0)}`);
  const prompts0 = existsSync(join(root, "prompts.jsonl")) ? readFileSync(join(root, "prompts.jsonl"), "utf8") : "";
  ok(prompts0 !== "" && !prompts0.includes("introduces_given_kinds"), "(j) a run without --terms carries `introduces_given_kinds` in a prompt");

  const termsPath = join(root, "terms.json");
  writeFileSync(termsPath, JSON.stringify({ "Ownership Boundary": "established" }));
  const jroot = join(root, "j");
  mkdirSync(jroot, { recursive: true });
  const jr = spawnSync(process.execPath, ["src/proof-sheet/leg-brief.mjs", "run", "--extractions", xrun, "--out", join(jroot, "out"), "--terms", termsPath],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSL_FIXTURE_DIR: jroot }, timeout: 300000 });
  ok(jr.status !== 0 && `${jr.stdout}${jr.stderr}`.includes(LB.TERMS_RETIRED), `(j) a run given --terms was not refused with the retirement sentence: ${jr.status} ${jr.stdout}${jr.stderr}`);
  ok(!/^run directory: /m.test(jr.stdout) && !existsSync(join(jroot, "prompts.jsonl")), "(j) a run given --terms started a run");

  const leg = (entry) => ({ legs: [{ leg_id: "g", purpose: "p", rationale: "r", reader_state_after: "knowledge: holds it", introduces: [entry],
    claims: [{ type: "strand", strand: "L1", proposition: "one" }, { type: "strand", strand: "L2", proposition: "two" }],
    waypoints: [{ point: "first", serves: ["L1"] }, { point: "second", serves: ["L2"] }] }] });
  const refused = LB.validateLegPathUnit(leg({ term: "ownership boundary", kind: "established", meaning: "where it ends" }), inputs).error || "";
  ok(/"ownership boundary" carries `kind`/.test(refused), `(j) the validator did not refuse an entry carrying the retired kind naming the term: ${refused}`);
  ok(!("readTermsFile" in LB), "(j) leg-brief still exports readTermsFile");
}

// (k) the earlier Legs' ids, over a two-Leg Extractor run
{
  const kroot = join(root, "k");
  const kx = join(kroot, "extractor-run");
  mkdirSync(kx, { recursive: true });
  writeFileSync(join(kroot, "leg-a.txt"), `${PARAS.slice(0, 2).join("\n\n")}\n`);
  writeFileSync(join(kroot, "leg-b.txt"), `${PARAS[2]}\n`);
  for (const [i] of PARAS.entries()) {
    mkdirSync(join(kx, `p${i + 1}`), { recursive: true });
    writeFileSync(join(kx, `p${i + 1}`, "answer.json"), readFileSync(join(xrun, `p${i + 1}`, "answer.json")));
  }
  writeFileSync(join(kx, "extractions.json"), JSON.stringify({ legs: [{ leg: join(kroot, "leg-a.txt") }, { leg: join(kroot, "leg-b.txt") }],
    passage: "copy-legs", written: ["move_1.md", "move_2.md", "move_3.md"] }));
  const kr = spawnSync(process.execPath, ["src/proof-sheet/leg-brief.mjs", "run", "--extractions", kx, "--out", join(kroot, "out")],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSL_FIXTURE_DIR: kroot }, timeout: 300000 });
  const kRun = (kr.stdout.match(/^run directory: (.+)$/m) || [])[1];
  const marker = "----- INPUT (JSON) -----";
  const carried = (k) => {
    const f = kRun ? join(kRun, `leg-path-${k}`, "prompt.md") : "";
    const p = f && existsSync(f) ? readFileSync(f, "utf8") : "";
    try { return { prompt: p, ids: JSON.parse(p.slice(p.indexOf(marker) + marker.length)).leg_ids_already_carried }; } catch { return { prompt: p, ids: undefined }; }
  };
  const [one, two] = [carried(1), carried(2)];
  ok(JSON.stringify(one.ids) === "[]", `(k) the first Leg's prompt does not carry \`leg_ids_already_carried\` empty: ${JSON.stringify(one.ids)} ${kr.stdout}${kr.stderr}`);
  ok(JSON.stringify(two.ids) === JSON.stringify(["copy-leg"]), `(k) the second Leg's prompt does not carry the first Leg's id: ${JSON.stringify(two.ids)}`);
  ok(two.prompt.includes("`leg_ids_already_carried` lists the ids earlier Legs of this Brief carry; this Leg's `leg_id` is none of them."),
    "(k) the second Leg's prompt does not state that its `leg_id` is none of the earlier Legs' ids");
}

// (l) THE OBLIGATION ROWS COME FROM THE `discharges` MARK (kogaki#1570).
{
  const out = [{ leg_id: "leg-a" }, { leg_id: "leg-b" }, { leg_id: "leg-c" }];
  const counts = [2, 2, 2];
  const none = { items: null, discharges: false };
  const items = ["frobnicator", "gizmo"];
  const marked = LB.obligationRows(out, counts, [none, { items, discharges: false }, none, none, { items: null, discharges: true }, none]);
  ok(JSON.stringify(marked.obligations) === JSON.stringify([{ item: items, raised_by: "leg-a", owed_by: ["leg-b", "leg-c"], discharged_by: "leg-c" }])
    && JSON.stringify(marked.deferrals) === JSON.stringify([{ leg_id: "leg-a", items, kept_by: "leg-c" }]),
    `(l) a marked passage does not give one row owed by every Leg from the second through the marked one: ${JSON.stringify(marked)}`);
  const unmarked = LB.obligationRows(out, counts, [none, { items, discharges: false }, none, none, none, none]);
  ok(/paragraph 2 leaves "frobnicator", "gizmo" open/.test(String(unmarked.error)),
    `(l) an unmarked passage is not refused naming paragraph 2 and both items: ${JSON.stringify(unmarked)}`);
  const local = LB.obligationRows(out, counts, [{ items, discharges: false }, { items: null, discharges: true }, none, none, none, none]);
  ok(JSON.stringify(local) === JSON.stringify({ obligations: [], deferrals: [] }),
    `(l) a raising and a discharging paragraph in one Leg gave a Leg-scale row: ${JSON.stringify(local)}`);
}

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-leg-brief");
JS
