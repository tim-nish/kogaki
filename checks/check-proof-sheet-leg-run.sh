#!/usr/bin/env bash
# check-proof-sheet-leg-run — one command runs an original Leg through the Extractor, the
# ingest, the Leg Brief composer, `/paragraph-plan` and `/draft`, and writes a sheet with one
# card per Leg (kogaki#1386, owner decision 2026-10-15).
#
# WHAT THIS COVERS, driven end to end through `node src/proof-sheet/leg-run.mjs run` over a
# three-paragraph Leg and ONE fake model binary (`KOGAKI_JUDGE_CLI`) answering every stage —
# never the actual `claude` CLI. Each assertion names a stage's own record rather than the
# sheet file alone, so a run that skipped a stage cannot pass (the consult receipt on the
# Issue: a plan names the gate, not the outputs):
#   (a) the run exits 0 with every stage `done` in `run.json`, and each model stage's calls
#       went through the recorder: `calls.jsonl` per stage holds exactly the calls the fake
#       binary saw, each judge answer padded past a pipe's buffer and handed through whole
#       (Extractor 4 — paragraph 1 refused once —, Leg Brief composer 2,
#       ParagraphPlan generator and judge, Writer 1), each prompt and answer as sent.
#   (b) the ingest derived one Move per Extraction into the run's own library, and the
#       ParagraphPlan file gives each Leg Waypoint as many Paragraph Waypoints as its bound
#       Move has Segments.
#   (c) the Writer's recorded prompt is the Packet alone: the recorded stdin equals the
#       Packet file `/draft` rendered, byte for byte, and equals what the fake binary read.
#   (d) the run writes nothing to the repository's `moves/` or `theses/`.
#   (e) the sheet: one run-conditions line, one comparison table, and exactly the seven cards
#       of `SHEET_CELLS` in pipeline order, stacked with no `.cols` row (kogaki#1487); every card
#       has Output, Inputs, Prompt and Calls in that order, Output open -- folded on the Move and
#       Brief cards (kogaki#1487) -- and the other three folded,
#       and every Inputs entry links to another card's id on the page; the Extraction card
#       shows paragraph 1's prompt and two attempts; the Draft card states its prompt equals
#       the Packet rather than repeating it; every recorded call's prompt, cut into its
#       instruction and its input, has each piece appear exactly once on the whole page (a retry
#       shows only the refusal block it inserted); the Audience and the settings appear only in
#       the run-conditions line.
#   (f) the provenance map gates the sheet: a map missing a row refuses naming it, and a
#       stopped Draft stage still draws the card with the stop in its Output.
#   (g) where the owner's map is on disk (corpus/ is not versioned), it carries every row.
#   (i) the Brief card badge (kogaki#1495): on a built sheet it reads "substitute, anchored", and an
#       older run whose Leg Brief record carries no `anchored` reads "Proof Sheet substitute".
#   (j) the article's language (kogaki#1417): two runs over one Passage under one Audience each
#       record its language, hand it to the Leg Brief composer and the Packet, and the Brief
#       and the Draft carry it; another Audience's language replaces it throughout; an Audience
#       declaring none is refused by name at the Brief stage.
#   (l) the ParagraphPlan card's Attempts part (kogaki#1437): the main run's fake judge answers
#       `does-not-fit` at Leg Waypoint 2 on the first attempt and `fits` on the second, and the
#       part carries two blocks -- the first with that attempt's Paragraph Waypoints, the verdict
#       and its `why`, and the refusal block the second attempt received; the second `fits` on
#       every Leg Waypoint and "no further attempt". A run refused on every attempt shows every
#       attempt and an Output of "(not written)". The Calls part names "the judge call" and
#       never "the check call".
#   (m) the ParagraphPlan card's Output rows carry the plan file's join (kogaki#1445): the row
#       for each Leg Waypoint after the first carries its `join` type word (kogaki#1477), read from the row block
#       alone since the Attempts part shows it too, and the row for Leg Waypoint 1 carries none.
#   (n) the Leg sheet's first views (kogaki#1479): the main run's plan gives Leg Waypoint 2 a
#       `performs` Paragraph Waypoint, and the ParagraphPlan card's Output row and Attempts part
#       carry its text in italics with no list item empty; each Extraction paragraph block opens
#       on its Segments table, with the folded "rendering" and "record file" blocks after it.
#   (o) the review block and the Point line (kogaki#1487): between the comparison table and the
#       Extraction card, a block carrying one Segments table per paragraph, a refused-attempts
#       table with exactly one row -- attempt 1, Leg Waypoint 2, the judge's `why` -- linking to
#       that attempt's block, and a Bindings table with one row per Leg Waypoint carrying its
#       `point`, the bound Move and the bindings record's `why`, each with a folded "before /
#       after" block carrying the Move file's before and after; an attempt whose judge answer
#       is unreadable is a row carrying the job record's refusal; the resumed run (h), refused
#       nowhere, renders "no attempt was refused". Each ParagraphPlan Output row opens on
#       "Point:" and the Leg Waypoint's `point` from the Brief.
#   (k) the recorder streams (kogaki#1439): with a 1 s stall bound handed in through
#       `KOGAKI_JOB_STALL_S` and every ParagraphPlan call running 2.5 s past its first line
#       (a stream line every 200 ms, as a live stream-json call writes),
#       the ParagraphPlan stage ends `done` rather than `stalled`, each recorded call carries
#       the binary's whole stdout (past 64 KB) and exit status 0, and run.json keeps its shape.
#   (p) the terms file (kogaki#1498): the resumed run (h) is started with `--terms` naming one
#       term, its `run.json` carries the file's path, hash and count, the resumed Brief stage is
#       handed the same `--terms`, and its sheet's Brief card reads "Conditions: terms: fixed (1)";
#       the main run, given none, records `terms: null` and its Brief card reads
#       "Conditions: terms: model".
#
# NOT COVERED, stated rather than implied: the Extractor's, Leg Brief composer's, ParagraphPlan
# stage's and Writer's own refusals are held by their own members
# (check-proof-sheet-extract.sh, check-proof-sheet-leg-brief.sh, check-paragraph-plan.sh,
# check-draft-*.sh). Whether a live model's Leg is any good is the owner's reading of the sheet.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, cpSync, rmSync } from "node:fs";
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
const readOr = (p, dflt) => (existsSync(p) ? readFileSync(p, "utf8") : dflt);
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// (l) The ParagraphPlan card's Attempts part, cut into its per-attempt blocks.
const attemptBlocks = (cardHtml) => {
  const a = cardHtml.indexOf('<details class="part attempts">');
  if (a < 0) return [];
  return cardHtml.slice(a, cardHtml.indexOf('<details class="part in"', a)).split("<summary>attempt ").slice(1);
};
// (l) The refusal block a retry's prompt carries: from its refusal marker to its input marker.
const refusalBlock = (retry) => {
  const at = retry.indexOf("----- YOUR PREVIOUS ANSWER (attempt ");
  const end = retry.indexOf("----- INPUT (JSON) -----");
  return at >= 0 && end > at ? retry.slice(at, end).trim() : null;
};
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const S = await imp("src/proof-sheet/leg-sheet.mjs");
const { parseYaml } = await imp("src/yaml.mjs");
const root = mkdtempSync(join(tmpdir(), "proof-sheet-leg-run-"));

const PARAS = [
  "The installer copies the kit into the consumer's tree. Nobody asked the consumer first.",
  "So the next run overwrites any edit. The copy is the installer's.",
  "The consumer owns nothing there. Every edit is gone by morning. That is the cost.",
];
writeFileSync(join(root, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
const WRITTEN = ["WRITTEN-1 the first paragraph as the Writer wrote it.", "WRITTEN-2 the second.", "WRITTEN-3 the third."];

// ---- the provenance map: a Leg card table naming every cell ----
const mapRows = Object.values(S.SHEET_CELLS).map((n) => `| ${n} | fixture artifact | fixture contract |`);
const mapText = (rows) => ["# fixture map", "", `${S.PROVENANCE_SECTION} (fixture)`, "", "| cell | artifact | contract |", "|---|---|---|", ...rows, "", "## after", ""].join("\n");
const map = join(root, "PROVENANCE.md");
writeFileSync(map, mapText(mapRows));

// ---- the one fake model binary, answering every stage ----
const judge = join(root, "fake-model.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, writeSync, existsSync, readFileSync, writeFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.PSR_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    // (k) A LONG CALL: with PSR_PLAN_PAUSE_MS set, a ParagraphPlan call runs that long after its
    // first line, writing one short stream line every 200 ms as a live stream-json call does,
    // then writes its result — a healthy call longer than the stall bound the case hands in.
    const runMs = stage.startsWith("plan-") ? Number(process.env.PSR_PLAN_PAUSE_MS) || 0 : 0;
    const ticks = Array.from({ length: Math.ceil(runMs / 200) }, (_, n) => JSON.stringify({ type: "system", tick: n }) + "\\n");
    const head = JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n";
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, argv: process.argv.slice(2), prompt, answer: stage === "writer" ? r : head + ticks.join("") + JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n" }) + "\\n");
    // The Writer is declared with a text output format (src/draft-workflow.json); every judge with json.
    // A judge's answer is preceded by a stream line longer than a pipe's buffer, as a live
    // stream-json answer is: the recorder must hand all of it through (the 2026-10-15 live run
    // lost the result line of every answer past the first to an asynchronous write).
    if (stage !== "writer") writeSync(1, head);
    for (const t of ticks) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); writeSync(1, t); }
    writeSync(1, stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER (attempt ");
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    // (l) PSR_PLAN_REFUSE: "first" refuses Leg Waypoint 2 on the first judge call only, "all" on every one.
    const counter = dir + "/judge-count";
    const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
    writeFileSync(counter, String(n));
    const refuse = process.env.PSR_PLAN_REFUSE === "all" || (process.env.PSR_PLAN_REFUSE === "first" && n === 1);
    return out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => (refuse && w.waypoint === 2
      ? { waypoint: w.waypoint, verdict: "does-not-fit", why: "WHY-NOT-FIT the second paragraph waypoint restates the first instead of moving on." }
      : { waypoint: w.waypoint, verdict: "fits", why: "they begin at before and end at after." })) }, "plan-judge");
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const leg = body("leg_you_must_plan").leg_you_must_plan;
    const SEG = [2, 2, 3];
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: "name_an_act_then_its_cost_" + w.waypoint,
      why: "its before holds the state and its after reaches the next point.",
      ...(w.waypoint > 1 ? { join: w.waypoint === 2 ? "consequence" : "contrast" } : {}),
      // (n) Leg Waypoint 2's second Paragraph Waypoint is a \`performs\` entry (kogaki#1448).
      paragraph_waypoints: Array.from({ length: SEG[w.waypoint - 1] }, (_, n) => (w.waypoint === 2 && n === 1 ? { performs: "PERFORMS-2-2 the paragraph turns the reader back on the act." }
        : { point: "PW-" + w.waypoint + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves] })) })) }, "plan-generator");
  }
  if (prompt.includes("----- INPUT (JSON) -----") && prompt.includes('"paragraph_you_must_extract"')) {
    const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
    const p = input.paragraph_you_must_extract;
    const first = p.number === 1;
    const carried = input.reader_state_before;
    const dims = ["knowledge", "question", "expectation", "orientation", "trust"];
    const record = {
      version: "1", paragraph: p.number, source: "not given", prior_text: first ? "not assumed — opens on a fact" : "assumed — \\"So\\" takes up the previous paragraph",
      language: "English", subject_nouns: ["installer", "kit"],
      answers: { q1: "Hands the reader one fact and its cost.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act." },
      what_it_does: first ? "Hands the reader a fact and then the cost of it." : "Draws the consequence of the previous act for the reader.",
      reader: dims.map((d, i) => ({ dimension: d, before: carried ? carried[d] : "BEFORE-" + d,
        after: i === 0 ? "AFTER-" + p.number + "-" + d : "unchanged", segment: i === 0 ? String(p.sentences.length) : "" })),
      // the Segment content carries every word the fake Leg call writes (kogaki#1495)
      segments: p.sentences.map((s, i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does: CLAIM-" + p.number + ", POINT-" + p.number + ", in English or Japanese.",
        does: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? (first ? "" : "draws the consequence of the act the previous paragraph named") : "widens the step before it" })),
      why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      description: "Names an act, then names who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
    };
    if (first && !retried) delete record.segments[0].does;
    return out(record, "extract");
  }
  if (prompt.includes("\`leg_reader_start_unit\` judgment point")) {
    return out({ version: "1", reader_start: ["knowledge: holds that installers copy files", "question: holds: none", "trust: extends a peer's ordinary good faith"] }, "brief-reader-start");
  }
  if (prompt.includes("\`leg_path_unit\` judgment point")) {
    const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
    const ps = input.paragraphs;
    return out({ legs: [{ leg_id: "copy-leg", purpose: "Move the reader from owning the copy to seeing who owns it.",
      rationale: "It is the only Leg.", reader_state_after: "knowledge: holds that the installer owns the copy\\norientation: sees the copy as the installer's",
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " (in " + input.language + ")" })),
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph, serves: [p.claim_strand] })) }] }, "brief-leg-path");
  }
  // THE WRITER WRITES IN THE LANGUAGE ITS PACKET NAMES (kogaki#1417), so a Draft's language is
  // read from what the Writer was told rather than from anything the fixture assumes.
  const LANGUAGE_LINE = "**Language.** Write this Leg in ";
  const at = prompt.indexOf(LANGUAGE_LINE);
  const lang = at < 0 ? "no declared language" : prompt.slice(at + LANGUAGE_LINE.length, prompt.indexOf(".", at + LANGUAGE_LINE.length));
  return out(${JSON.stringify(WRITTEN)}.map((w) => w + " (in " + lang + ")").join("\\n\\n"), "writer");
});
`);
chmodSync(judge, 0o755);

// ---- (d)'s baseline: the repository's moves/ and theses/ ----
const snapshot = () => {
  const rows = [];
  for (const top of ["moves", "theses"]) {
    const walk = (d) => { if (!existsSync(d)) return; for (const f of readdirSync(d)) { const p = join(d, f); const s = statSync(p); if (s.isDirectory()) walk(p); else rows.push(`${p} ${s.size} ${s.mtimeMs}`); } };
    walk(join(repo, top));
  }
  return rows.sort().join("\n");
};
const before = snapshot();

const out = join(root, "out");
const r = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(root, "leg-fixture.md"), "--out", out, "--provenance", map],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: root, PSR_PLAN_REFUSE: "first" }, timeout: 600000 });
ok(r.status === 0, `(a) the run exited ${r.status}: ${r.stdout}${r.stderr}`);
const runDir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];
const seen = existsSync(join(root, "seen.jsonl")) ? readFileSync(join(root, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
const calls = (stage) => (runDir && existsSync(join(runDir, stage, "calls.jsonl")) ? readFileSync(join(runDir, stage, "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

if (!runDir) fails.push("(a) the run printed no run directory");
else {
  // (a) every stage done, every call through the recorder
  const run = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
  ok(run.stages.map((s) => `${s.stage}:${s.state}`).join(",") === "extract:done,ingest:done,brief:done,paragraph-plan:done,draft:done",
    `(a) the stages are not all done: ${JSON.stringify(run.stages.map((s) => [s.stage, s.state, s.stopped]))}`);
  const want = { extract: ["extract", 4], brief: ["brief-reader-start|brief-leg-path", 2], "paragraph-plan": ["plan-generator|plan-judge", null], draft: ["writer", 1] };
  for (const [stage, [kinds, n]] of Object.entries(want)) {
    const cs = calls(stage);
    const ks = kinds.split("|");
    const fake = seen.filter((s) => ks.includes(s.stage));
    ok(n === null ? cs.length >= 2 : cs.length === n, `(a) ${stage}/calls.jsonl records ${cs.length} call(s)`);
    ok(cs.length === fake.length && cs.every((c, i) => c.stdin === fake[i].prompt), `(a) ${stage}'s recorded calls are not the calls the model binary saw`);
    ok(cs.every((c, i) => c.stdout === fake[i].answer), `(a) ${stage}'s recorded answers are not the binary's own output`);
  }
  ok(calls("paragraph-plan").some((c) => c.stdin.includes('"leg_you_must_judge"')), "(a) no ParagraphPlan judge call was recorded");
  ok(!existsSync(join(runDir, "ingest", "calls.jsonl")), "(a) the ingest made a model call");

  // (b) the ingest's Moves and the plan's counts
  const ingest = JSON.parse(readOr(join(runDir, "ingest", "ingest.json"), '{"written":[],"entries":[]}'));
  ok(ingest.written.length === 3 && [1, 2, 3].every((n) => existsSync(join(runDir, "moves", `name_an_act_then_its_cost_${n}.yaml`))),
    `(b) the ingest did not write one Move per Extraction into the run's library: ${JSON.stringify(ingest.written)}`);
  ok(ingest.entries.length === 3 && ingest.entries.every((e) => e.admitted && e.screen.includes(`id: ${e.move}`)), "(b) an ingest entry does not carry its screen");
  const plan = parseYaml(readOr(join(runDir, "brief", "paragraph-plan.yaml"), "legs: []\n"), "plan");
  ok(plan.legs && plan.legs[0] && JSON.stringify(plan.legs[0].waypoints.map((w) => w.paragraph_waypoints.length)) === "[2,2,3]", "(b) the ParagraphPlan file's Paragraph Waypoint counts are not the Moves' Segment counts");
  ok(plan.legs && plan.legs[0] && JSON.stringify(plan.legs[0].waypoints.map((w) => w.join || "")) === '["","consequence","contrast"]',
    "(b) the ParagraphPlan file does not carry a type-word join on every Leg Waypoint after the first and none on the first (kogaki#1411, kogaki#1477)");

  // (c) the Writer's prompt is the Packet alone
  const packet = readOr(join(runDir, "draft", "leg-fixture", "packets", "copy-leg.md"), null);
  const w = calls("draft");
  ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(c) the Writer's recorded prompt is not the Packet byte for byte");
  ok(packet !== null && packet.includes("   *Opens from:* consequence\n") && packet.includes("   *Opens from:* contrast\n")
    && (packet.match(/\*Opens from:\*/g) || []).length === 2, "(c) the Packet does not render each plan join as its Opens-from line (kogaki#1411)");
  ok(seen.filter((s) => s.stage === "writer").every((s) => s.prompt === packet), "(c) the model binary was handed something other than the Packet");
  ok(w.length && w[0].argv.includes("--tools") && w[0].argv[w[0].argv.indexOf("--tools") + 1] === "", "(c) the Writer was not called with --tools \"\"");

  // (e) the sheet: one run-conditions line, one comparison table, and the seven cards of
  // `SHEET_CELLS` in pipeline order, Brief and ParagraphPlan in one row -- every assertion
  // below reads inside the card a property belongs to, not a bare substring search over the
  // whole page (the consult receipt on the Issue: the property is per card).
  const html = readOr(join(runDir, "sheet.html"), "");
  ok((html.match(/<section class="card">/g) || []).length === 1, "(e) the sheet does not carry one run section");
  ok(/<div class="run-conditions" id="run-conditions">/.test(html), "(e) the run-conditions line is missing");
  ok(/<table class="pair"/.test(html), "(e) the comparison table is missing");

  const ORDER = ["extraction", "move", "brief", "paragraphPlan", "packet", "draft", "runRecord"];
  // Each card carries a stable id, `card-0-<key>` for the sheet's only run (idx 0).
  const idxOf = (key) => html.indexOf(`id="card-0-${key}"`);
  const starts = ORDER.map((k) => idxOf(k));
  ok(starts.every((p) => p >= 0), `(e) a card is missing: ${ORDER.filter((k, i) => starts[i] < 0).join(", ")}`);
  ok(starts.every((p, i) => i === 0 || p > starts[i - 1]), `(e) the cards are not in pipeline order: ${ORDER.join(", ")}`);

  const cardHtml = (key) => {
    const i = ORDER.indexOf(key);
    const next = i + 1 < ORDER.length ? starts[i + 1] : html.indexOf("</section></body>");
    return html.slice(starts[i], next >= 0 ? next : undefined);
  };
  const cards = {};
  for (const key of ORDER) cards[key] = cardHtml(key);

  ok(!html.includes('class="cols"') && !html.includes(".cols{"), "(e) the sheet still carries a .cols row (kogaki#1487)");

  for (const key of ORDER) {
    const name = S.SHEET_TITLES[key];
    const c = cards[key];
    ok(c.includes(`<b>${name}`), `(e) the ${name} card draws no title`);
    const badge = S.SHEET_CELL_BADGE[key];
    // the Brief card reads "substitute, anchored" on a run composed under kogaki#1495's criterion
    const wantLabel = (badge.type === "substitute" ? "Proof Sheet substitute" : "production") + (key === "brief" ? S.ANCHORED_SUFFIX : "");
    ok(c.includes(`<span class="badge ${badge.type}"`) && c.includes(`>${wantLabel}<`), `(e) the ${name} card carries no "${wantLabel}" badge`);
    const folded = key === "move" || key === "brief";
    ok(folded ? /<details class="part out"><summary>Output<\/summary>/.test(c) : /<details class="part out" open><summary>Output<\/summary>/.test(c),
      `(e) the ${name} card's Output is missing, or ${folded ? "opens" : "does not open"} by default`);
    ok(/<details class="part in"(?! open)><summary>Inputs<\/summary>/.test(c), `(e) the ${name} card's Inputs is missing, or opens by default`);
    ok(/<details class="part prompt"(?! open)><summary>Prompt<\/summary>/.test(c), `(e) the ${name} card's Prompt is missing, or opens by default`);
    ok(/<details class="part calls"(?! open)><summary>Calls<\/summary>/.test(c), `(e) the ${name} card's Calls is missing, or opens by default`);
    const partOrder = [...c.matchAll(/<details class="part (\w+)"/g)].map((m) => m[1]);
    const wantOrder = key === "paragraphPlan" ? ["out", "attempts", "in", "prompt", "calls"] : ["out", "in", "prompt", "calls"];
    ok(JSON.stringify(partOrder) === JSON.stringify(wantOrder), `(e) the ${name} card's parts are out of order: ${partOrder.join(",")}`);
    for (const href of [...c.matchAll(/<a href="#([^"]+)">/g)].map((m) => m[1])) {
      ok(ORDER.some((k) => href === `card-0-${k}`), `(e) the ${name} card's Inputs links to "${href}", which is not a card`);
    }
  }

  ok(new Set(Object.values(S.SHEET_CELLS)).size === Object.keys(S.SHEET_CELLS).length && Object.keys(S.SHEET_CELLS).every((k) => k in S.SHEET_TITLES),
    "(e) two cards share a provenance row, or a card has no title");

  const pairStart = html.indexOf('<table class="pair"');
  const legRows = html.slice(pairStart, html.indexOf("</table>", pairStart))
    .split("<tr><th>").slice(2);
  ok(legRows.length === 3 && legRows.every((row, i) => row.includes(PARAS[i]) && row.includes(WRITTEN[i])),
    `(e) the comparison table does not pair original paragraph N with written paragraph N: ${legRows.length} row(s)`);

  ok(cards.extraction.includes("instruction"), "(e) the Extraction card does not show its paragraphs' prompts");
  const ex1 = cards.extraction.slice(cards.extraction.indexOf("paragraph 1"));
  ok(ex1.includes("attempts 2") && ex1.includes("call 2 of 2"), "(e) the Extraction card does not show paragraph 1's two attempts");

  ok(/id="run-conditions"[\s\S]*?attempt bound \(brief\.unit_attempts\)/.test(html), "(e) the run-conditions line does not show the settings the stages read");
  for (const key of ORDER) {
    ok(!cards[key].includes("attempt bound (brief.unit_attempts)"), `(e) the ${key} card shows the settings, which belong only to the run-conditions line`);
  }

  // No prompt text appears in more than one place: each recorded call's prompt is cut into its
  // instruction (before any refusal block or the input marker) and its input (from the input
  // marker), and each piece, escaped as the sheet escapes it, occurs on the page exactly once
  // -- a call whose prompt is shown under Prompt names it rather than repeating it, and a
  // retry shows only the refusal block it inserted.
  const occurrences = (needle) => html.split(needle).length - 1;
  const INPUT = "----- INPUT (JSON) -----";
  const REFUSED = "----- YOUR PREVIOUS ANSWER (attempt ";
  let pieces = 0;
  for (const st of ["extract", "brief", "paragraph-plan", "draft"]) {
    const recorded = readOr(join(runDir, st, "calls.jsonl"), "").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    for (const [n, c] of recorded.entries()) {
      const text = String(c.stdin);
      const cut = [text.indexOf(REFUSED), text.indexOf(INPUT)].filter((x) => x >= 0);
      const end = cut.length ? Math.min(...cut) : text.length;
      const at = text.indexOf(INPUT);
      for (const [part, piece] of [["instruction", text.slice(0, end).trim()], ["input", at >= 0 ? text.slice(at).trim() : ""]]) {
        if (!piece) continue;
        pieces++;
        const k = occurrences(escHtml(piece));
        ok(k === 1, `(e) the ${st} call ${n + 1}'s prompt ${part} appears ${k} times on the sheet, not once`);
      }
    }
  }
  ok(pieces >= 9, `(e) only ${pieces} prompt piece(s) were checked for appearing once`);
  const audienceRel = JSON.parse(readOr(join(runDir, "run.json"), "{}")).audience;
  const audienceText = audienceRel ? readOr(resolve(repo, audienceRel), null) : null;
  if (audienceText) {
    const head = escHtml(audienceText.trim().split("\n")[0]);
    ok(html.indexOf('id="run-conditions"') >= 0 && html.slice(html.indexOf('id="run-conditions"')).includes(head)
      && ORDER.every((key) => !cards[key].includes(escHtml(audienceText))), "(e) the Audience is not shown in the run-conditions line alone");
  }

  ok(cards.draft.includes("The recorded prompt equals the Packet shown in the Packet card above, byte for byte."),
    "(e) the Draft card does not state its prompt equals the Packet");
  const packetText = readOr(join(runDir, "draft", "leg-fixture", "packets", "copy-leg.md"), null);
  if (packetText) {
    ok(cards.packet.includes(packetText.slice(0, 40).split("\n")[0]), "(e) the Packet card does not show the Packet's own text");
    ok(!cards.draft.includes(packetText), "(e) the Draft card repeats the Packet's text instead of linking to it");
  }

  // (j) THE PIPELINE DIAGRAM, THE COMPARISON TABLE'S ANCHORS AND THE PACKET'S PER-WAYPOINT
  // ROWS (kogaki#1402, redrawn kogaki#1410). The diagram opens the page, before the
  // run-conditions line and the comparison table; its eight nodes -- the sources (Passage,
  // Audience) and the six artifacts, with no Segments node and no Persona node -- each click to
  // an id that exists on the page, and its text is also written as a `<pre>` fallback inside a
  // closed details element. Each written-paragraph cell links to that paragraph's row in
  // Extraction, Move, ParagraphPlan, Packet and Draft. The Packet card gets one row per Leg
  // Waypoint, cut from the rendered Packet by its own numbering, with the whole Packet below.
  const h1At = html.indexOf("<h1>Leg Proof Sheet</h1>");
  const diagramAt = html.indexOf('<div class="diagram">');
  ok(h1At >= 0 && diagramAt > h1At, "(j) the diagram does not follow the sheet's title");
  ok(diagramAt >= 0 && diagramAt < html.indexOf('id="run-conditions"') && diagramAt < pairStart,
    "(j) the diagram is not the sheet's first element, before the run-conditions line and the comparison table");

  const diagramHtml = html.slice(diagramAt, html.indexOf('<div class="run-conditions"', diagramAt));
  ok(diagramHtml.includes("flowchart LR"), "(j) the diagram is not a left-to-right flowchart");
  ok(!diagramHtml.includes(escHtml('Segments_0["Segments"]')), "(j) the diagram still has a Segments node");
  ok(!diagramHtml.includes(escHtml('Persona_0["Persona"]')), "(j) the diagram still has a Persona node");
  const DIAGRAM_NODES = ["Passage", "Audience", "Extraction", "Move", "Brief", "ParagraphPlan", "Packet", "Draft"];
  const DIAGRAM_LINKS = { Passage: "#comparison-0", Audience: "#run-conditions",
    Extraction: "#card-0-extraction", Move: "#card-0-move", Brief: "#card-0-brief", ParagraphPlan: "#card-0-paragraphPlan",
    Packet: "#card-0-packet", Draft: "#card-0-draft" };
  for (const name of DIAGRAM_NODES) {
    ok(diagramHtml.includes(escHtml(`${name}_0["${name}"]`)), `(j) the diagram has no "${name}" node`);
    ok(diagramHtml.includes(escHtml(`click ${name}_0 "${DIAGRAM_LINKS[name]}"`)), `(j) the diagram's "${name}" node carries no click link`);
  }
  for (const target of ["comparison-0", "run-conditions", "card-0-extraction", "card-0-move", "card-0-brief", "card-0-paragraphPlan", "card-0-packet", "card-0-draft"]) {
    ok(html.includes(`id="${target}"`), `(j) the diagram links to "#${target}", which is not an id on the page`);
  }

  // Two rows (kogaki#1410 design): Extraction, Move, ParagraphPlan, Packet, Draft on the chain
  // row, Brief fed by Extraction and Audience, feeding ParagraphPlan and Packet, on the other --
  // and the edge from Audience to Packet, the one that governs the Packet's prose rules.
  const DIAGRAM_EDGES = [["Passage", "Extraction"], ["Audience", "Extraction"],
    ["Extraction", "Move"], ["Extraction", "Brief"], ["Audience", "Brief"],
    ["Move", "ParagraphPlan"], ["Brief", "ParagraphPlan"],
    ["Brief", "Packet"], ["ParagraphPlan", "Packet"], ["Audience", "Packet"],
    ["Packet", "Draft"]];
  for (const [a, b] of DIAGRAM_EDGES) {
    ok(diagramHtml.includes(escHtml(`${a}_0 --> ${b}_0`)), `(j) the diagram has no edge from "${a}" to "${b}"`);
  }
  ok(!diagramHtml.includes(escHtml("Segments_0 --> Move_0")), "(j) the diagram still has the edge from Segments to Move, bypassing Extraction");

  // Three provenance classDefs with a legend, Extraction and Brief dashed.
  for (const cls of ["ownerInput", "modelWritten", "mechanical"]) {
    ok(diagramHtml.includes(`classDef ${cls} `), `(j) the diagram declares no "${cls}" classDef`);
  }
  ok(diagramHtml.includes("classDef dashed stroke-dasharray"), "(j) the diagram declares no dashed classDef");
  const dashedLine = (diagramHtml.match(/class [^\n<]* dashed/) || [""])[0];
  ok(dashedLine.includes("Extraction_0") && dashedLine.includes("Brief_0"), "(j) Extraction and Brief are not both assigned the dashed class");
  ok(/<ul class="legend">/.test(html) && diagramAt < html.indexOf('<ul class="legend">'), "(j) the diagram carries no legend");
  for (const label of ["owner-authored input", "model-written", "mechanically derived"]) {
    ok(html.slice(diagramAt, html.indexOf('id="run-conditions"')).includes(label), `(j) the legend names no "${label}" class`);
  }

  ok(/<details[^>]*><summary>Diagram text/.test(diagramHtml) && !/<details[^>]* open[^>]*><summary>Diagram text/.test(diagramHtml),
    "(j) the diagram's text fallback is missing, or is not closed by default");
  ok(/<details[^>]*><summary>Diagram text[\s\S]*flowchart LR[\s\S]*<\/pre><\/details>/.test(diagramHtml), "(j) the diagram's text is not present as a <pre> fallback inside its details element");

  for (let i = 1; i <= 3; i++) {
    const cell = legRows[i - 1];
    for (const card of ["extraction", "move", "planwp", "packetwp", "draft"]) {
      ok(cell.includes(`href="#${card}-p${i}-0"`), `(j) paragraph ${i}'s written cell carries no link to "${card}-p${i}-0"`);
      ok(html.includes(`id="${card}-p${i}-0"`), `(j) "${card}-p${i}-0" is linked but is not an id on the page`);
    }
  }

  // THE PER-PARAGRAPH (AND PER-LEG-WAYPOINT) ROWS ARE FOLDED (kogaki#1410, owner 2026-10-17):
  // every row on Extraction, Move, ParagraphPlan, Packet and Draft is a `details.prow`, open
  // only for the first. The link target sits INSIDE the details rather than on it, because
  // following a fragment opens a closed details that is the target's ancestor and leaves one
  // that is the target closed -- so this is what makes a comparison-table link open the block.
  for (const card of ["extraction", "move", "planwp", "packetwp", "draft"]) {
    for (let i = 1; i <= 3; i++) {
      const anchor = `${card}-p${i}-0`;
      const at = html.indexOf(`id="${anchor}"`);
      ok(at >= 0, `(j) "${anchor}" is not on the page`);
      if (at < 0) continue;
      const targetTag = html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
      ok(!targetTag.startsWith("<details"), `(j) "${anchor}" is on the details itself, so following a link to it leaves the block closed: ${targetTag}`);
      const tagStart = html.lastIndexOf('<details class="prow', at);
      const enclosed = tagStart >= 0 && !html.slice(tagStart, at).includes("</details>");
      ok(enclosed, `(j) "${anchor}" is not inside a folded per-paragraph block, so a link to it opens nothing`);
      if (!enclosed) continue;
      const tag = html.slice(tagStart, html.indexOf(">", tagStart) + 1);
      ok(i === 1 ? / open/.test(tag) : !/ open/.test(tag), `(j) "${anchor}"'s block is ${i === 1 ? "not open" : "open"} by default: ${tag}`);
    }
  }

  if (packetText) {
    for (let i = 1; i <= 3; i++) {
      const rowAt = cards.packet.indexOf(`id="packetwp-p${i}-0"`);
      ok(rowAt >= 0, `(j) the Packet card has no row for Leg Waypoint ${i}`);
      if (rowAt >= 0) {
        const rowHtml = cards.packet.slice(rowAt, cards.packet.indexOf("</details>", rowAt));
        ok(rowHtml.includes(`POINT-${i}`), `(j) the Packet card's Leg Waypoint ${i} row does not carry its point`);
        ok(rowHtml.includes(`PW-${i}-1`), `(j) the Packet card's Leg Waypoint ${i} row does not carry its Paragraph Waypoints`);
      }
    }
    ok(cards.packet.includes(escHtml(packetText.trim())), "(j) the whole Packet no longer appears below the per-waypoint table");
  }

  // (m) THE JOIN IN THE PARAGRAPHPLAN OUTPUT (kogaki#1445): each Leg Waypoint row of the card's
  // Output carries the plan file's join for a Leg Waypoint after the first and none for the
  // first. The join also appears in the Attempts part, so this reads the row block alone --
  // a match over the card or the page would pass with the row's line deleted (the consult
  // receipt on the Issue).
  const planWps = (plan.legs && plan.legs[0] && plan.legs[0].waypoints) || [];
  for (let i = 1; i <= 3; i++) {
    const rowAt = cards.paragraphPlan.indexOf(`id="planwp-p${i}-0"`);
    ok(rowAt >= 0, `(m) the ParagraphPlan card has no Output row for Leg Waypoint ${i}`);
    if (rowAt < 0) continue;
    const rowHtml = cards.paragraphPlan.slice(rowAt, cards.paragraphPlan.indexOf("</details>", rowAt));
    const want = (planWps.find((w) => w.waypoint === i) || {}).join;
    if (i === 1) ok(!/<p>join: /.test(rowHtml), "(m) the ParagraphPlan Output row for Leg Waypoint 1 carries a join line");
    else ok(want && rowHtml.includes(`<p>join: ${escHtml(want)}</p>`), `(m) the ParagraphPlan Output row for Leg Waypoint ${i} does not carry the plan file's join`);
  }

  // (n) THE LEG SHEET'S FIRST VIEWS (kogaki#1479): the plan carries a `performs` entry at Leg
  // Waypoint 2, which the old list rendered as an empty item, so the no-empty assertion below is
  // fed a case that fails without the fix (the consult receipt on the Issue).
  const PERFORMS = "PERFORMS-2-2 the paragraph turns the reader back on the act.";
  ok(planWps.some((w) => (w.paragraph_waypoints || []).some((p) => p.performs === PERFORMS)), "(n) the plan file does not carry the fixture's performs Paragraph Waypoint");
  const row2At = cards.paragraphPlan.indexOf(`id="planwp-p2-0"`);
  const row2 = row2At >= 0 ? cards.paragraphPlan.slice(row2At, cards.paragraphPlan.indexOf("</details>", row2At)) : "";
  ok(row2.includes(`<li><i>${escHtml(PERFORMS)}</i></li>`), "(n) the ParagraphPlan Output row for Leg Waypoint 2 does not carry the performs text in italics");
  ok(!/<li>(<i>)?\s*(<\/i>)?<\/li>/.test(cards.paragraphPlan), "(n) the ParagraphPlan card carries an empty list item");
  for (let i = 1; i <= 3; i++) {
    const at = cards.extraction.indexOf(`<summary>paragraph ${i}</summary>`);
    ok(at >= 0, `(n) the Extraction card has no block for paragraph ${i}`);
    if (at < 0) continue;
    const blk = cards.extraction.slice(at, cards.extraction.indexOf("</div></details>", at));
    const seg = blk.indexOf("<th>content clause</th>");
    const rend = blk.indexOf(`<details class="sub"><summary>rendering</summary>`);
    const file = blk.indexOf(`<details class="sub"><summary>record file</summary>`);
    ok(seg >= 0 && blk.includes(`CONTENT-${i}-1`) && !blk.slice(0, seg).includes("<details"),
      `(n) the Extraction block for paragraph ${i} does not open on its Segments table`);
    ok(seg >= 0 && rend > seg && file > rend, `(n) the Extraction block for paragraph ${i} does not carry the folded rendering and record file after its Segments table`);
  }

  // (l) THE ATTEMPTS PART (kogaki#1437): the first attempt was refused at Leg Waypoint 2 and the
  // second passed, so the part holds two blocks; the refusal block the second attempt received
  // is cut from the two recorded plan prompts, so the sheet is held to what was actually sent.
  const planCalls = calls("paragraph-plan").filter((c) => c.stdin.includes('"leg_you_must_plan"'));
  ok(planCalls.length === 2, `(l) the ParagraphPlan made ${planCalls.length} plan call(s), not 2 (refused once, then passed)`);
  const blocks = attemptBlocks(cards.paragraphPlan);
  ok(blocks.length === 2, `(l) the Attempts part holds ${blocks.length} block(s), not 2`);
  if (blocks.length === 2 && planCalls.length === 2) {
    const [b1, b2] = blocks;
    ok(PARAS.every((_, i) => b1.includes(`PW-${i + 1}-1 the paragraph makes its point.`)), "(l) attempt 1's block does not show its Paragraph Waypoints");
    ok(b1.includes(`<li><i>${escHtml(PERFORMS)}</i></li>`), "(n) attempt 1's block does not show the performs Paragraph Waypoint in italics");
    ok(b1.includes("does-not-fit") && b1.includes("WHY-NOT-FIT the second paragraph waypoint restates the first instead of moving on."),
      "(l) attempt 1's block does not show the does-not-fit verdict with its why");
    const inserted = refusalBlock(planCalls[1].stdin);
    ok(!!inserted && b1.includes(`<pre>${escHtml(inserted)}`),
      "(l) attempt 1's block does not show the refusal block the second attempt received, verbatim");
    ok(!b2.includes("does-not-fit") && (b2.match(/<b>fits<\/b>/g) || []).length === 3, "(l) attempt 2's block does not show fits on every Leg Waypoint");
    ok(b2.includes("no further attempt: the job ended `done`"), "(l) attempt 2's block does not say no further attempt");
    ok(!/class="stop">The judge answered/.test(b1 + b2), "(l) the Attempts part shows a mismatch between the judge and the job record on a run where they agree");
  }
  ok(cards.paragraphPlan.includes("the judge call") && !cards.paragraphPlan.includes("the check call"), "(l) the Calls part does not name the judge call, or still names the check call");

  // (o) THE REVIEW BLOCK AND THE POINT LINE (kogaki#1487). Every property is read inside the
  // part it belongs to, and the refused-attempts table is held to one row naming attempt 1,
  // Leg Waypoint 2 and the judge's why -- a silent table cannot pass, since the run that
  // refused nothing must render its own line (below, on the resumed run).
  const reviewAt = html.indexOf('<section class="review" id="review-0">');
  const pairEnd = html.indexOf("</table>", pairStart);
  ok(reviewAt > pairEnd && pairEnd > pairStart && reviewAt < starts[ORDER.indexOf("extraction")],
    "(o) the review block does not sit between the comparison table and the Extraction card");
  const review = reviewAt >= 0 ? html.slice(reviewAt, starts[ORDER.indexOf("extraction")]) : "";
  const rpart = (cls) => {
    const a = review.indexOf(`<details class="rpart ${cls}" open>`);
    if (a < 0) return "";
    const b = review.indexOf('<details class="rpart', a + 1);
    return review.slice(a, b >= 0 ? b : undefined);
  };
  const segPart = rpart("segments");
  ok((segPart.match(/<th>content clause<\/th>/g) || []).length === 3 && [1, 2, 3].every((i) => segPart.includes(`CONTENT-${i}-1`) && segPart.includes(`paragraph ${i} — name_an_act_then_its_cost_${i}`)),
    "(o) the review block does not carry one Segments table per paragraph, headed by its paragraph and Move");
  const refPart = rpart("refused");
  const refRows = refPart.split("<tbody>")[1] ? refPart.split("<tbody>")[1].split("</tbody>")[0].split("<tr>").slice(1) : [];
  ok(refRows.length === 1 && refRows[0].includes(`href="#attempt-0-1"`) && refRows[0].includes("<td>2</td>")
    && refRows[0].includes("WHY-NOT-FIT the second paragraph waypoint restates the first instead of moving on."),
    `(o) the refused-attempts table does not carry exactly one row naming attempt 1, Leg Waypoint 2 and the judge's why: ${refRows.length} row(s)`);
  const att1 = cards.paragraphPlan.indexOf('id="attempt-0-1"');
  ok(att1 >= 0 && cards.paragraphPlan.lastIndexOf('<details class="part attempts">', att1) >= 0, "(o) the refused row's link names no attempt block on the ParagraphPlan card");
  const bindRec = JSON.parse(readOr(join(runDir, "paragraph-plan", "job", "paragraph-plan-bindings.json"), '{"bindings":[]}')).bindings;
  const bindPart = rpart("bindings");
  const bindRows = bindPart.split("<tr><td>").slice(1).filter((x) => /^\d+<\/td><td>POINT-/.test(x) || /^\d+<\/td><td>\(no point/.test(x));
  ok(bindRec.length === 3 && bindRows.length === 3, `(o) the Bindings table holds ${bindRows.length} row(s) against the record's ${bindRec.length}`);
  for (const b of bindRec) {
    const row = bindRows.find((x) => x.startsWith(`${b.waypoint}</td>`)) || "";
    ok(row.includes(`POINT-${b.waypoint}`) && row.includes(`>${escHtml(b.move)}</a>`) && row.includes(escHtml(b.why)),
      `(o) the Bindings row for Leg Waypoint ${b.waypoint} does not carry its point, its Move and the record's why`);
    const at = bindPart.indexOf(row);
    const fold = at >= 0 ? bindPart.slice(at, bindPart.indexOf("</details>", at) + 10) : "";
    const mv = parseYaml(readOr(join(runDir, "moves", `${b.move}.yaml`), "{}"), "move");
    const lines = Object.keys(mv.before || {}).map((d) => [mv.before[d], (mv.after || {})[d]]);
    ok(/<details class="sub"><summary>before \/ after<\/summary>/.test(fold) && lines.length > 0
      && lines.every(([bf, af]) => fold.includes(escHtml(String(bf))) && fold.includes(escHtml(String(af ?? "")))),
      `(o) the Bindings row for Leg Waypoint ${b.waypoint} carries no folded before / after block with the Move's lines`);
  }
  // An attempt whose judge answer is unreadable is a row carrying the job record's refusal,
  // never a silence read as "no attempt was refused".
  const unreadable = join(root, "unreadable-judge-run");
  cpSync(runDir, unreadable, { recursive: true });
  const ppCalls = readFileSync(join(unreadable, "paragraph-plan", "calls.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const firstJudge = ppCalls.findIndex((c) => c.stdin.includes('"leg_you_must_judge"'));
  if (firstJudge >= 0) ppCalls[firstJudge].stdout = "UNREADABLE";
  writeFileSync(join(unreadable, "paragraph-plan", "calls.jsonl"), ppCalls.map((c) => JSON.stringify(c)).join("\n") + "\n");
  const uBuilt = S.buildSheet({ runs: [unreadable], provenance: map, out: join(root, "unreadable.html") });
  const uHtml = uBuilt.written ? readFileSync(uBuilt.written, "utf8") : "";
  const uRef = uHtml.slice(uHtml.indexOf('<details class="rpart refused" open>'), uHtml.indexOf('<details class="rpart bindings"'));
  const uJob = JSON.parse(readOr(join(unreadable, "paragraph-plan", "job", "reader-path-job.json"), "{}"));
  const uRefusal = (((uJob.units || [])[0] || {}).refusals || [])[0];
  ok(firstJudge >= 0 && !uRef.includes("no attempt was refused") && uRef.includes(`href="#attempt-0-1"`) && uRef.includes("no readable verdicts")
    && !!uRefusal && uRef.includes(escHtml(uRefusal)), "(o) an attempt with an unreadable judge answer does not render a row carrying the job record's refusal");

  for (let i = 1; i <= 3; i++) {
    const at = cards.paragraphPlan.indexOf(`id="planwp-p${i}-0">`);
    const body = at >= 0 ? cards.paragraphPlan.slice(at + `id="planwp-p${i}-0">`.length) : "";
    ok(body.startsWith(`<p>Point: POINT-${i}</p>`), `(o) the ParagraphPlan Output row for Leg Waypoint ${i} does not open on "Point:" and its point from the Brief`);
  }

  // (f) the map gates; a stopped Draft still draws
  const short = join(root, "PROVENANCE-short.md");
  writeFileSync(short, mapText(mapRows.filter((l) => !l.startsWith("| Packet |"))));
  const refused = S.buildSheet({ runs: [runDir], provenance: short, out: join(root, "short.html") });
  ok(/has no "## Cells of the Leg card" row for "Packet"/.test(refused.error || ""), `(f) a map missing the Packet row was not refused by name: ${refused.error}`);
  const stoppedRun = join(root, "stopped-run");
  cpSync(runDir, stoppedRun, { recursive: true });
  rmSync(join(stoppedRun, "draft", "leg-fixture", "sections"), { recursive: true, force: true });
  const rec = JSON.parse(readFileSync(join(stoppedRun, "run.json"), "utf8"));
  rec.stages[4] = { stage: "draft", state: "stopped", stopped: "STOP-LINE the writer refused section", leg_id: "copy-leg", workspace: join(stoppedRun, "draft", "leg-fixture") };
  rec.stopped = "draft: STOP-LINE the writer refused section";
  writeFileSync(join(stoppedRun, "run.json"), JSON.stringify(rec));
  const built = S.buildSheet({ runs: [stoppedRun], provenance: map, out: join(root, "stopped.html") });
  const sh = built.written ? readFileSync(built.written, "utf8") : "";
  ok(sh.includes("STOP-LINE the writer refused section") && sh.includes("<b>Packet"), "(f) a stopped Draft stage does not draw the card with the stop");
}

// (l) A PARAGRAPHPLAN REFUSED ON EVERY ATTEMPT: the run stops at paragraph-plan, and the sheet
// shows every attempt, each refused at Leg Waypoint 2, and an Output of "(not written)".
const lRoot = join(root, "refused-every-attempt");
mkdirSync(lRoot, { recursive: true });
writeFileSync(join(lRoot, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
const r6 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(lRoot, "leg-fixture.md"), "--out", join(lRoot, "out"), "--provenance", map],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: lRoot, PSR_PLAN_REFUSE: "all" }, timeout: 600000 });
const lRunDir = (r6.stdout.match(/^run directory: (.+)$/m) || [])[1];
ok(!!lRunDir, `(l) the run refused on every ParagraphPlan attempt printed no run directory: ${r6.stdout}${r6.stderr}`);
if (lRunDir) {
  const lRun = JSON.parse(readFileSync(join(lRunDir, "run.json"), "utf8"));
  const pp = lRun.stages.find((st) => st.stage === "paragraph-plan") || {};
  ok(pp.state && pp.state !== "done", `(l) the ParagraphPlan stage ended ${pp.state} on a run refused at every attempt`);
  const built = S.buildSheet({ runs: [lRunDir], provenance: map, out: join(lRoot, "sheet.html") });
  const lHtml = built.written ? readFileSync(built.written, "utf8") : "";
  const ppAt = lHtml.indexOf('id="card-0-paragraphPlan"');
  const ppCard = ppAt >= 0 ? lHtml.slice(ppAt, lHtml.indexOf('id="card-0-packet"')) : "";
  const lJob = JSON.parse(readOr(join(lRunDir, "paragraph-plan", "job", "reader-path-job.json"), "{}"));
  const spent = ((lJob.units || [])[0] || {}).attempts;
  const blocks = attemptBlocks(ppCard);
  ok(spent >= 2 && blocks.length === spent, `(l) the refused run's Attempts part holds ${blocks.length} block(s) against the ${spent} attempt(s) the job spent`);
  ok(blocks.every((b) => b.includes("does-not-fit") && b.includes("WHY-NOT-FIT")), "(l) a refused attempt's block does not show its does-not-fit verdict and why");
  ok(blocks.slice(0, -1).every((b) => b.includes("----- YOUR PREVIOUS ANSWER (attempt ")), "(l) a refused attempt's block does not show the refusal block the next attempt received");
  ok(blocks.length > 0 && blocks[blocks.length - 1].includes(`no further attempt: the job ended \`${lJob.state}\``), "(l) the last refused attempt does not say no further attempt and the job's state");
  const output = ppCard.slice(ppCard.indexOf('<details class="part out"'), ppCard.indexOf('<details class="part attempts"'));
  ok(output.includes("(not written)"), "(l) the refused run's ParagraphPlan Output does not read (not written)");
}

// (d) nothing in moves/ or theses/
ok(snapshot() === before, "(d) the run wrote to the repository's moves/ or theses/");

// (g) the owner's map, where it is on disk
const owner = join(repo, "corpus", "p1329", "PROVENANCE.md");
if (existsSync(owner)) {
  const rows = S.provenanceRows(readFileSync(owner, "utf8"));
  const missing = Object.values(S.SHEET_CELLS).filter((n) => !rows.has(n));
  ok(!missing.length, `(g) corpus/p1329/PROVENANCE.md has no Leg card row for ${missing.join(", ")}`);
} else {
  console.log("not checked: corpus/p1329/PROVENANCE.md is not on disk (corpus/ is not versioned)");
}

// (h) RESUME (kogaki#1396): a run stopped at the Extractor's paragraph 2 of 3 is resumed,
// finishes every stage, and its extract/calls.jsonl holds exactly one paragraph-1 call --
// paragraph 1, already written before the stop, is never asked again.
function fakeModelSrc(brokenParagraph, seenFile) {
  return `#!/usr/bin/env node
import { appendFileSync, writeSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.PSR_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    appendFileSync(dir + "/${seenFile}", JSON.stringify({ stage, argv: process.argv.slice(2), prompt, answer: stage === "writer" ? r : JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n" + JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n" }) + "\\n");
    if (stage !== "writer") writeSync(1, JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n");
    writeSync(1, stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    return out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint, verdict: "fits", why: "they begin at before and end at after." })) }, "plan-judge");
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const leg = body("leg_you_must_plan").leg_you_must_plan;
    const SEG = [2, 2, 3];
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: "name_an_act_then_its_cost_" + w.waypoint,
      why: "its before holds the state and its after reaches the next point.",
      ...(w.waypoint > 1 ? { join: w.waypoint === 2 ? "consequence" : "contrast" } : {}),
      paragraph_waypoints: Array.from({ length: SEG[w.waypoint - 1] }, (_, n) => ({ point: "PW-" + w.waypoint + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves] })) })) }, "plan-generator");
  }
  if (prompt.includes("----- INPUT (JSON) -----") && prompt.includes('"paragraph_you_must_extract"')) {
    const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
    const p = input.paragraph_you_must_extract;
    const first = p.number === 1;
    const carried = input.reader_state_before;
    const dims = ["knowledge", "question", "expectation", "orientation", "trust"];
    const record = {
      version: "1", paragraph: p.number, source: "not given", prior_text: first ? "not assumed — opens on a fact" : "assumed — \\"So\\" takes up the previous paragraph",
      language: "English", subject_nouns: ["installer", "kit"],
      answers: { q1: "Hands the reader one fact and its cost.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act." },
      what_it_does: first ? "Hands the reader a fact and then the cost of it." : "Draws the consequence of the previous act for the reader.",
      reader: dims.map((d, i) => ({ dimension: d, before: carried ? carried[d] : "BEFORE-" + d,
        after: i === 0 ? "AFTER-" + p.number + "-" + d : "unchanged", segment: i === 0 ? String(p.sentences.length) : "" })),
      // the Segment content carries every word the fake Leg call writes (kogaki#1495)
      segments: p.sentences.map((s, i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does: CLAIM-" + p.number + ", POINT-" + p.number + ", in English or Japanese.",
        does: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? (first ? "" : "draws the consequence of the act the previous paragraph named") : "widens the step before it" })),
      why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      description: "Names an act, then names who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
    };
    if (p.number === ${brokenParagraph === null ? "null" : String(brokenParagraph)}) delete record.notes;
    return out(record, "extract");
  }
  if (prompt.includes("\\\`leg_reader_start_unit\\\` judgment point")) {
    return out({ version: "1", reader_start: ["knowledge: holds that installers copy files", "question: holds: none", "trust: extends a peer's ordinary good faith"] }, "brief-reader-start");
  }
  if (prompt.includes("\\\`leg_path_unit\\\` judgment point")) {
    const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
    const ps = input.paragraphs;
    return out({ legs: [{ leg_id: "copy-leg", purpose: "Move the reader from owning the copy to seeing who owns it.",
      rationale: "It is the only Leg.", reader_state_after: "knowledge: holds that the installer owns the copy\\norientation: sees the copy as the installer's",
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " (in " + input.language + ")" })),
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph, serves: [p.claim_strand] })) }] }, "brief-leg-path");
  }
  // THE WRITER WRITES IN THE LANGUAGE ITS PACKET NAMES (kogaki#1417), so a Draft's language is
  // read from what the Writer was told rather than from anything the fixture assumes.
  const LANGUAGE_LINE = "**Language.** Write this Leg in ";
  const at = prompt.indexOf(LANGUAGE_LINE);
  const lang = at < 0 ? "no declared language" : prompt.slice(at + LANGUAGE_LINE.length, prompt.indexOf(".", at + LANGUAGE_LINE.length));
  return out(${JSON.stringify(WRITTEN)}.map((w) => w + " (in " + lang + ")").join("\\n\\n"), "writer");
});
`;
}

const hRoot = join(root, "resume");
mkdirSync(hRoot, { recursive: true });
writeFileSync(join(hRoot, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
const stopJudge = join(hRoot, "fake-model-stop.mjs");
writeFileSync(stopJudge, fakeModelSrc(2, "seen-resume.jsonl"));
chmodSync(stopJudge, 0o755);
const goodJudge = join(hRoot, "fake-model-good.mjs");
writeFileSync(goodJudge, fakeModelSrc(null, "seen-resume.jsonl"));
chmodSync(goodJudge, 0o755);

const hOut = join(hRoot, "out");
const hTerms = join(hRoot, "terms.json");
const hTermsText = JSON.stringify({ "ownership boundary": "established" });
writeFileSync(hTerms, hTermsText);
const r1 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(hRoot, "leg-fixture.md"), "--out", hOut, "--provenance", map,
  "--terms", hTerms],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: stopJudge, PSR_FIXTURE_DIR: hRoot }, timeout: 600000 });
const hRunDir = (r1.stdout.match(/^run directory: (.+)$/m) || [])[1];
ok(!!hRunDir, `(h) the first run printed no run directory: ${r1.stdout}${r1.stderr}`);
if (hRunDir) {
  const run1 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(r1.status !== 0 && !!run1.stopped && run1.stopped.startsWith("extract:") && /paragraph 2 of 3/.test(run1.stopped),
    `(h) the first run did not stop at the Extractor's paragraph 2 of 3: ${JSON.stringify((run1.stages || []).map((s) => [s.stage, s.state]))} / ${run1.stopped}`);
  const extractDoneBefore = (JSON.parse(readFileSync(join(hRunDir, "extract", "command.json"), "utf8") || "[]"));
  ok(existsSync(join(hRunDir, "extract", "calls.jsonl")), "(h) the first run's extract stage made no recorded call");

  const r2 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--resume", hRunDir, "--provenance", map],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: goodJudge, PSR_FIXTURE_DIR: hRoot }, timeout: 600000 });
  ok(r2.status === 0, `(h) the resumed run exited ${r2.status}: ${r2.stdout}${r2.stderr}`);
  const run2 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(run2.stages.map((s) => `${s.stage}:${s.state}`).join(",") === "extract:done,ingest:done,brief:done,paragraph-plan:done,draft:done",
    `(h) the resumed run did not finish every stage: ${JSON.stringify(run2.stages.map((s) => [s.stage, s.state, s.stopped]))}`);
  const extractCalls = readFileSync(join(hRunDir, "extract", "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const p1Calls = extractCalls.filter((c) => c.stdin.includes('"number": 1,'));
  ok(p1Calls.length === 1, `(h) the resumed run's extract/calls.jsonl does not hold exactly one paragraph-1 call: ${p1Calls.length} of ${extractCalls.length} total`);
  ok(existsSync(join(hRunDir, "sheet.html")), "(h) the resumed run did not write a sheet");
  const hSheet = readOr(join(hRunDir, "sheet.html"), "");
  const hRef = hSheet.slice(hSheet.indexOf('<details class="rpart refused" open>'), hSheet.indexOf('<details class="rpart bindings"'));
  ok(hRef.includes("<p>no attempt was refused</p>") && !hRef.includes("<table"), "(o) the resumed run, refused nowhere, does not render \"no attempt was refused\"");
  const extractCmd = JSON.parse(readFileSync(join(hRunDir, "extract", "command.json"), "utf8"));
  ok(extractCmd.length > extractDoneBefore.length, "(h) the resumed extract stage replaced command.json instead of appending to it");

  // (p) the terms file, carried through the record and the resume to the Brief stage and the sheet
  const { createHash } = await import("node:crypto");
  ok(run1.terms && run1.terms.path === hTerms && run1.terms.sha256 === createHash("sha256").update(hTermsText).digest("hex") && run1.terms.count === 1,
    `(p) run.json built with --terms does not carry the file's path, hash and count: ${JSON.stringify(run1.terms)}`);
  ok(JSON.stringify(run2.terms) === JSON.stringify(run1.terms), `(p) the resumed run.json does not keep the terms record: ${JSON.stringify(run2.terms)}`);
  const briefCmd = JSON.parse(readOr(join(hRunDir, "brief", "command.json"), "[]"));
  ok(briefCmd.length > 0 && briefCmd.every((c) => c.argv.join(" ").includes(`--terms ${hTerms}`)), `(p) the resumed Brief stage was not handed --terms: ${JSON.stringify(briefCmd.map((c) => c.argv))}`);
  ok(hSheet.includes("Conditions: terms: fixed (1)") && !hSheet.includes("terms: model"), "(p) the sheet of a run given a terms file does not read \"terms: fixed (1)\"");
}
if (runDir) {
  const run0 = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
  ok(run0.terms === null, `(p) run.json built without --terms does not record \`terms: null\`: ${JSON.stringify(run0.terms)}`);
  const sheet0 = readOr(join(runDir, "sheet.html"), "");
  ok(sheet0.includes("Conditions: terms: model") && !sheet0.includes("terms: fixed"), "(p) the sheet of a run given no terms file does not read \"terms: model\"");
}

// (i) THE AUDIENCE (kogaki#1396): run.json always names the Audience path the run used, and
// the sheet's Audience cell shows that file with its hash -- the default setting when no
// flag was given, the flag's own path when one was, and a record naming none shows the cell
// as unreadable rather than resolving a substitute from the live setting.
const { settingValue } = await imp("src/workflow/judge.mjs");
const defaultAudiencePath = resolve(repo, String(settingValue({ setting: "brief.audience_file" })));
const defaultAudienceText = readFileSync(defaultAudiencePath, "utf8");
if (hRunDir) {
  const run2 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(run2.audience === String(settingValue({ setting: "brief.audience_file" })), `(i) run.json does not name the default Audience setting: ${run2.audience}`);
  const sheetHtml = readFileSync(join(hRunDir, "sheet.html"), "utf8");
  ok(sheetHtml.includes(`sha ${S.contentHash(defaultAudienceText)}`), "(i) the sheet's Audience cell does not show the default Audience file's hash");
}

const iAudience = join(root, "custom-audience.md");
writeFileSync(iAudience, "id: custom-fixture\nlanguage: Japanese\npersona:\n  reader: >-\n    A custom reader, fixed for this test.\nregister: |\n  plain.\n");
const iRoot = join(root, "audience-flag");
mkdirSync(iRoot, { recursive: true });
writeFileSync(join(iRoot, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
const iOut = join(iRoot, "out");
const r3 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(iRoot, "leg-fixture.md"), "--out", iOut,
  "--provenance", map, "--audience", iAudience],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: iRoot }, timeout: 600000 });
const iRunDir = (r3.stdout.match(/^run directory: (.+)$/m) || [])[1];
ok(r3.status === 0 && !!iRunDir, `(i) the --audience run exited ${r3.status}: ${r3.stdout}${r3.stderr}`);
if (iRunDir) {
  const run3 = JSON.parse(readFileSync(join(iRunDir, "run.json"), "utf8"));
  ok(run3.audience === iAudience, `(i) run.json does not name the --audience flag's own path: ${run3.audience}`);
  const sheetHtml = readFileSync(join(iRunDir, "sheet.html"), "utf8");
  ok(sheetHtml.includes(`sha ${S.contentHash(readFileSync(iAudience, "utf8"))}`), "(i) the sheet's Audience cell does not show the --audience file's hash");

  // a record naming no Audience (an older run) shows the cell as unreadable, never a live substitute
  const noAudienceRun = join(root, "no-audience-run");
  cpSync(iRunDir, noAudienceRun, { recursive: true });
  const rec = JSON.parse(readFileSync(join(noAudienceRun, "run.json"), "utf8"));
  delete rec.audience;
  writeFileSync(join(noAudienceRun, "run.json"), JSON.stringify(rec));
  const built = S.buildSheet({ runs: [noAudienceRun], provenance: map, out: join(root, "no-audience.html") });
  const sh = built.written ? readFileSync(built.written, "utf8") : "";
  ok(sh.includes("unreadable: the run record names no audience") && !sh.includes(`sha ${S.contentHash(defaultAudienceText)}`),
    "(i) a run record naming no Audience resolved a substitute from the live setting instead of showing itself unreadable");

  // THE ANCHORED BADGE IS THE RUN'S OWN (kogaki#1495): the built sheet's Brief card reads
  // "substitute, anchored", and an older run whose Leg Brief record carries no `anchored`
  // reads "Proof Sheet substitute" alone.
  const briefBadge = (html) => { const at = html.indexOf('id="card-0-brief"'); return at < 0 ? "" : (html.slice(at).match(/<span class="badge [^"]*"[^>]*>([^<]*)</) || [])[1] || ""; };
  ok(briefBadge(readFileSync(join(iRunDir, "sheet.html"), "utf8")) === "Proof Sheet substitute, anchored",
    `(i) the built sheet's Brief card badge does not read "substitute, anchored": ${JSON.stringify(briefBadge(readFileSync(join(iRunDir, "sheet.html"), "utf8")))}`);
  const olderRun = join(root, "unanchored-run");
  cpSync(iRunDir, olderRun, { recursive: true });
  const orec = JSON.parse(readFileSync(join(olderRun, "run.json"), "utf8"));
  const ob = orec.stages.find((st) => st.stage === "brief");
  const olderBriefRun = join(root, "unanchored-leg-brief-run");
  cpSync(ob.leg_brief_run, olderBriefRun, { recursive: true });
  const obj = JSON.parse(readFileSync(join(olderBriefRun, "brief.json"), "utf8"));
  delete obj.anchored;
  writeFileSync(join(olderBriefRun, "brief.json"), JSON.stringify(obj));
  ob.leg_brief_run = olderBriefRun;
  writeFileSync(join(olderRun, "run.json"), JSON.stringify(orec));
  const ob2 = S.buildSheet({ runs: [olderRun], provenance: map, out: join(root, "unanchored.html") });
  const osh = ob2.written ? readFileSync(ob2.written, "utf8") : "";
  ok(briefBadge(osh) === "Proof Sheet substitute", `(i) an older run's Brief card, its record carrying no \`anchored\`, does not read "Proof Sheet substitute" alone: ${JSON.stringify(briefBadge(osh))}`);
}

// (j) THE ARTICLE'S LANGUAGE (kogaki#1417): two Leg runs over the same Passage under the same
// Audience -- the first run and the resumed one, both under the default Audience -- each record
// the Audience's language, hand it to both Leg Brief composer calls beside the row's language
// sentence, and render it on the Packet's language line; the fake model writes in the language
// it was handed, so the Brief's claims and the Draft's paragraphs are read for it. The --audience
// run declares another language and every one of those carries it instead. An Audience declaring
// no language is refused by name at the Brief stage, before any composer call.
const languageOf = (dir, want) => {
  const at = `(j) ${dir}`;
  const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
  ok(run.language === want, `${at}: run.json names language ${JSON.stringify(run.language)}, not ${want}`);
  const bc = existsSync(join(dir, "brief", "calls.jsonl")) ? readFileSync(join(dir, "brief", "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  ok(bc.length === 2 && bc.every((c) => c.stdin.includes(`"language": "${want}"`) && c.stdin.includes("THE ARTICLE'S LANGUAGE (kogaki#1417)")),
    `${at}: the Leg Brief composer's calls do not each carry the language ${want} and the row's language sentence`);
  const brief = existsSync(join(dir, "brief", "brief.yaml")) ? readFileSync(join(dir, "brief", "brief.yaml"), "utf8") : "";
  ok((brief.match(new RegExp(`\\(in ${want}\\)`, "g")) || []).length === 3, `${at}: the Brief's three claims are not written in ${want}`);
  const packet = existsSync(join(dir, "draft", "leg-fixture", "packets", "copy-leg.md")) ? readFileSync(join(dir, "draft", "leg-fixture", "packets", "copy-leg.md"), "utf8") : "";
  ok(packet.includes(`**Language.** Write this Leg in ${want}.`), `${at}: the Packet's Write block does not name ${want}`);
  const section = existsSync(join(dir, "draft", "leg-fixture", "sections", "copy-leg.md")) ? readFileSync(join(dir, "draft", "leg-fixture", "sections", "copy-leg.md"), "utf8") : "";
  ok((section.match(new RegExp(`\\(in ${want}\\)`, "g")) || []).length === 3, `${at}: the Draft's three paragraphs are not written in ${want}`);
};
if (runDir) languageOf(runDir, "English");
if (hRunDir) languageOf(hRunDir, "English");
if (iRunDir) languageOf(iRunDir, "Japanese");

const jAudience = join(root, "no-language-audience.md");
writeFileSync(jAudience, "id: no-language-fixture\npersona:\n  reader: >-\n    A reader.\nregister: |\n  plain.\n");
const jRoot = join(root, "no-language");
mkdirSync(jRoot, { recursive: true });
writeFileSync(join(jRoot, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
const r4 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(jRoot, "leg-fixture.md"), "--out", join(jRoot, "out"),
  "--provenance", map, "--audience", jAudience],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: jRoot }, timeout: 600000 });
const jRunDir = (r4.stdout.match(/^run directory: (.+)$/m) || [])[1];
ok(r4.status !== 0 && !!jRunDir, `(j) the run under an Audience declaring no language exited ${r4.status}: ${r4.stdout}${r4.stderr}`);
if (jRunDir) {
  const run4 = JSON.parse(readFileSync(join(jRunDir, "run.json"), "utf8"));
  ok(run4.language === null, `(j) run.json names language ${JSON.stringify(run4.language)} for an Audience declaring none`);
  ok(typeof run4.stopped === "string" && run4.stopped.startsWith("brief:") && run4.stopped.includes("`language`"),
    `(j) the run did not stop at the Brief stage naming the missing \`language\` key: ${run4.stopped}`);
  ok(!existsSync(join(jRunDir, "brief", "calls.jsonl")), "(j) the Leg Brief composer made a model call under an Audience declaring no language");
}

// (k) THE RECORDER STREAMS (kogaki#1439): the ParagraphPlan job reads output growth as a call's
// liveness, so a call running longer than the job's stall bound ends `done` only if the
// recorder hands each chunk on as it arrives. The bound is handed in (`KOGAKI_JOB_STALL_S`,
// 1 s) and each ParagraphPlan call runs 2.5 s past its first line, writing a stream line every
// 200 ms; a buffering recorder shows the job no byte for the whole call and the job ends `stalled`.
const kRoot = join(root, "streaming");
mkdirSync(kRoot, { recursive: true });
writeFileSync(join(kRoot, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
const r5 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(kRoot, "leg-fixture.md"), "--out", join(kRoot, "out"), "--provenance", map],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: kRoot, KOGAKI_JOB_STALL_S: "1", PSR_PLAN_PAUSE_MS: "2500" }, timeout: 600000 });
const kRunDir = (r5.stdout.match(/^run directory: (.+)$/m) || [])[1];
ok(r5.status === 0 && !!kRunDir, `(k) the run whose ParagraphPlan calls run past the stall bound exited ${r5.status}: ${r5.stdout}${r5.stderr}`);
if (kRunDir) {
  const run5 = JSON.parse(readFileSync(join(kRunDir, "run.json"), "utf8"));
  const pp = run5.stages.find((st) => st.stage === "paragraph-plan") || {};
  ok(pp.state === "done", `(k) the ParagraphPlan stage ended ${pp.state} (${pp.stopped || ""}) rather than done under calls running past the stall bound`);
  if (runDir) {
    ok(JSON.stringify(Object.keys(run5)) === JSON.stringify(Object.keys(JSON.parse(readFileSync(join(runDir, "run.json"), "utf8")))),
      "(k) run.json's shape differs between a streamed run and the plain one");
  }
  const kSeen = existsSync(join(kRoot, "seen.jsonl")) ? readFileSync(join(kRoot, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((x) => x.stage.startsWith("plan-")) : [];
  const kCalls = existsSync(join(kRunDir, "paragraph-plan", "calls.jsonl")) ? readFileSync(join(kRunDir, "paragraph-plan", "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  ok(kCalls.length >= 2 && kCalls.length === kSeen.length, `(k) paragraph-plan/calls.jsonl records ${kCalls.length} call(s) against ${kSeen.length} the binary saw`);
  ok(kCalls.every((c, i) => c.stdout === kSeen[i].answer && c.stdout.length > 64 * 1024 && c.exit === 0 && c.signal === null),
    "(k) a recorded streamed call does not carry the binary's whole stdout (past 64 KB) and its exit status 0");
}

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-leg-run");
JS
