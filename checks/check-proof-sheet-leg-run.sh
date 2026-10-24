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
#   (b2) paragraph 2's Segment 2 carries a `manner`: the Move ingested from it carries it on
#       that Segment, the ParagraphPlan file on the Paragraph Waypoint built on it alone, the
#       Packet on that Paragraph Waypoint's line, and the sheet's Segment table in its
#       `manner` column (kogaki#1510).
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
#       Between the two sits an open `before / after / breaks` table (kogaki#1534): one row per
#       reader dimension carrying the paragraph's Move file's `before` and `after`, then one row
#       listing that file's `breaks` in order.
#   (o) the review block and the Point line (kogaki#1487): between the comparison table and the
#       Extraction card, a block carrying one Segments table per paragraph, a refused-attempts
#       table with exactly one row -- attempt 1, Leg Waypoint 2, the judge's `why` -- linking to
#       that attempt's block, and a Bindings table with one row per Leg Waypoint carrying its
#       `point`, the bound Move and the bindings record's `why`, each row carrying a "before /
#       after" `<details>` closed on load holding the Move file's before and after, and no other
#       row in the table (kogaki#1516); an attempt whose judge answer
#       is unreadable is a row carrying the job record's refusal; the resumed run (h), refused
#       nowhere, renders "no attempt was refused". Each ParagraphPlan Output row opens on
#       "Point:" and the Leg Waypoint's `point` from the Brief. Each paragraph heading in the
#       Segments part is followed by its bound Move's `description` as one plain paragraph and
#       then its table, and a paragraph with no Move bound has nothing between the two (kogaki#1517).
#   (k) the recorder streams (kogaki#1439): with a 1 s stall bound handed in through
#       `KOGAKI_JOB_STALL_S` and every ParagraphPlan call running 2.5 s past its first line
#       (a stream line every 200 ms, as a live stream-json call writes),
#       the ParagraphPlan stage ends `done` rather than `stalled`, each recorded call carries
#       the binary's whole stdout (past 64 KB) and exit status 0, and run.json keeps its shape.
#   (p) the terms file is retired (kogaki#1498, retired by kogaki#1529, kogaki#1531): a run given
#       `--terms`, with a file or bare, exits non-zero with the retirement sentence naming the flag
#       and prints no run directory; the resumed run (h), its record carrying a `terms` key with
#       its Brief not done, finishes with no `terms` key; the main run's record carries no `terms`
#       key, and its sheet carries no terms line, in the run header or on the Brief card; the
#       several-Leg Brief (s)'s `introduces` entries carry `term` and `meaning` and no `kind`.
#
#   (q) stage reuse (kogaki#1512): `--reuse <the main run> --from brief` carries the Extraction and
#       Moves byte for byte, records the source run and the copied stage's sha256, and no
#       Extractor call reaches the model binary; `--from paragraph-plan` also carries the Brief and
#       makes no Extractor or Brief call; the sheet badges each copied stage's card "copied from
#       <source>"; a copied Extraction with one Segment's content clause edited is recorded as
#       paragraph 2, Segment 1, `content`, and both Segments tables badge that row "edited by owner".
#       The paragraph tables (o) render with no details element but the before / after folds
#       and no "Review" heading.
#   (r) the library (kogaki#1521): `--reuse <the main run> --from brief --library <dir>` places
#       the library's three records beside the run's own three in the plan's Move directory, and
#       `run.json`'s `library` carries the directory, the records' sha256 and the ids by source;
#       with the fake plan binding Leg Waypoint 1 from the library, paragraph 1's heading and
#       Bindings row are badged "library" and the others "this run", and the run header names the
#       library; a library holding one of the run's own ids is refused naming it, with no run
#       directory and no model call; `--withhold-own` leaves the plan's directory holding the
#       library's records only while the ingest still lists the run's own, every Bindings row is
#       badged "library", and the header says the run's own were withheld; `--withhold-own`
#       without `--library` is refused.
#   (s) three consecutive Legs under one Brief (kogaki#1532): `--leg` given three times runs one
#       Brief of three Legs; the Extractor runs every paragraph in order, Leg B's first reading Leg
#       A's last as its earlier text; `depends_on`, `opens_section`, `reaches_target` and
#       `re-activate` are filled as derived and `brief.json` marks each; the production
#       `validateLegs` passes over the Brief's path; `/draft section` writes each Leg with its own
#       Writer calls file; the sheet carries three Leg blocks in order, each with its comparison
#       table, under one Brief card marking five fields `derived`; and the one-file run's record
#       keeps its shape apart from the `legs` list.
#   (t) the Claim's words in its points (kogaki#1547): a run whose fake Leg answer first drops one
#       content word of Claim 2 from point 2, then gives the full point, records one refusal in
#       the Leg row's `attempts.json` naming the Claim and the word, carries the second answer in
#       the Brief, and runs every later stage.
#   (u) a leading subset of the Legs (kogaki#1546): `--reuse <the three-Leg run> --from brief
#       --legs 2` makes no Extractor call, keeps four Extraction records, composes a two-Leg Brief
#       whose second Leg `depends_on` the first and reaches the target, and records `legs: 2`;
#       `--legs 3` records what a plain reuse records apart from `reuse.legs`, and a plain reuse
#       records no `legs`; `--legs 4`, `--legs 0` and `--legs 2 --from paragraph-plan` are each
#       refused naming `--legs`, with no run directory written.
#   (v) a deferring Move raises one Obligation row (kogaki#1548): Leg A's Move defers two terms its
#       content names; over two Legs, Leg B introducing one of them, the Brief carries exactly one
#       `term` row, `term` a one-element list, raised by Leg A, owed by and discharged by Leg B,
#       marked derived in the Brief and on the Brief card; Leg A's block carries `2 deferred, 1 kept
#       in this span`; and the plan call for Leg B is handed the row under what it owes. Over four
#       Legs, B and D introducing the two, one row carries both in order, owed by B and D,
#       discharged by D, each depending on A. The span of (s), deferring nothing, carries
#       `obligations: []`.
#
# NOT COVERED, stated rather than implied: the Extractor's, Leg Brief composer's, ParagraphPlan
# stage's and Writer's own refusals are held by their own members
# (check-proof-sheet-extract.sh, check-proof-sheet-leg-brief.sh, check-paragraph-plan.sh,
# check-draft-*.sh). Whether a live model's Leg is any good is the owner's reading of the sheet.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, cpSync, rmSync, copyFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
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
    // (r) PSR_PLAN_BIND: "library-first" binds Leg Waypoint 1 from the library, "library" every one.
    const fromLibrary = (n) => process.env.PSR_PLAN_BIND === "library" || (process.env.PSR_PLAN_BIND === "library-first" && n === 1);
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: (fromLibrary(w.waypoint) ? "lib_" : "") + "name_an_act_then_its_cost_" + w.waypoint,
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
        operation: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? "" : "widens the step before it",
        manner: p.number === 2 && i === 1 ? "a brief direct statement, given with no elaboration." : "" })),
      why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      description: "Names an act, then names who pays for it (paragraph " + p.number + ").", name: "name_an_act_then_its_cost_" + p.number, notes: "",
    };
    if (first && !retried) delete record.segments[0].operation;
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
      // (t) PSR_LEG_DROP=first: the first Leg answer's point 2 drops its Claim's language word (kogaki#1547).
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph + " names CLAIM-" + p.paragraph
        + (process.env.PSR_LEG_DROP === "first" && !retried && p.paragraph === 2 ? "" : " in " + input.language), serves: [p.claim_strand] })) }] }, "brief-leg-path");
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
  // THE MANNER RIDES FROM THE EXTRACTION TO THE PACKET (kogaki#1510): paragraph 2's Segment 2
  // carries one, so its Move does, the Paragraph Waypoint built on that Segment does, and no other.
  const MANNER = "a brief direct statement, given with no elaboration.";
  const move2 = parseYaml(readOr(join(runDir, "moves", "name_an_act_then_its_cost_2.yaml"), "id: none\n"), "move2");
  ok(Array.isArray(move2.segments) && JSON.stringify(move2.segments.map((g) => g.manner ?? null)) === JSON.stringify([null, MANNER]),
    `(b) the Move ingested from paragraph 2 does not carry its manner on Segment 2 alone: ${JSON.stringify(move2.segments)}`);
  ok(plan.legs && plan.legs[0] && JSON.stringify(plan.legs[0].waypoints.map((w) => w.paragraph_waypoints.map((p) => p.manner ?? null)))
    === JSON.stringify([[null, null], [null, MANNER], [null, null, null]]),
    `(b) the ParagraphPlan file does not carry the manner on the Paragraph Waypoint built on that Segment alone: ${JSON.stringify(plan.legs && plan.legs[0] && plan.legs[0].waypoints)}`);

  // (c) the Writer's prompt is the Packet alone
  const packet = readOr(join(runDir, "draft", "leg-fixture", "packets", "copy-leg.md"), null);
  const w = calls("draft");
  ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(c) the Writer's recorded prompt is not the Packet byte for byte");
  ok(packet !== null && packet.includes("   *Opens from:* consequence\n") && packet.includes("   *Opens from:* contrast\n")
    && (packet.match(/\*Opens from:\*/g) || []).length === 2, "(c) the Packet does not render each plan join as its Opens-from line (kogaki#1411)");
  ok(packet !== null && packet.split("\n").filter((l) => /^ *\d+\. .*\*Manner:\*/.test(l)).length === 1
    && packet.split("\n").some((l) => /^   2\. /.test(l) && l.endsWith(` *Manner:* ${MANNER}`)),
    `(c) the Packet does not render the manner on the line of the Paragraph Waypoint built on its Segment (kogaki#1510): ${JSON.stringify((packet || "").split("\n").filter((l) => /Manner|PW-2|PERFORMS-2/.test(l)))}`);
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
    // every card's Output is folded on load (kogaki#1559); the View block is the open surface
    ok(/<details class="part out"(?! open)><summary>Output<\/summary>/.test(c), `(e) the ${name} card's Output is missing, or opens by default`);
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

  // the View block renders open (kogaki#1559): no `details` opened before it is still unclosed
  // at it, so it sits inside no fold; the legend sentence and the anchor opener are on the page.
  const beforeReview = html.slice(0, html.indexOf('<section class="review" id="review-0">'));
  ok((beforeReview.match(/<details/g) || []).length === (beforeReview.match(/<\/details>/g) || []).length,
    "(e) the View block sits inside a folded details");
  ok(html.includes(`<p class="muted fold-legend">${S.FOLD_LEGEND}</p>`), "(e) the legend sentence on folded cards is missing");
  ok(/<script>const openTo=.*addEventListener\("hashchange",openTo\)/.test(html), "(e) the anchor script that opens a folded card on its link is missing");

  ok(new Set(Object.values(S.SHEET_CELLS)).size === Object.keys(S.SHEET_CELLS).length && Object.keys(S.SHEET_CELLS).every((k) => k in S.SHEET_TITLES),
    "(e) two cards share a provenance row, or a card has no title");

  const pairStart = html.indexOf('<table class="pair"');
  const legRows = html.slice(pairStart, html.indexOf("</table>", pairStart))
    .split("<tr><th>").slice(2);
  ok(legRows.length === 3 && legRows.every((row, i) => row.includes(PARAS[i]) && row.includes(WRITTEN[i])),
    `(e) the comparison table does not pair original paragraph N with written paragraph N: ${legRows.length} row(s)`);

  ok(cards.extraction.includes("instruction"), "(e) the Extraction card does not show its paragraphs' prompts");
  ok(cards.extraction.includes("<th>operation</th><th>relation</th><th>manner</th>") && cards.extraction.includes(`<td>${MANNER}</td>`)
    && !cards.extraction.includes("<th>does</th>"), "(e) the Extraction card's Segment table does not carry the manner column (kogaki#1510)");
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
    const stAt = blk.indexOf(`<table class="move-states"><caption>before / after / breaks</caption>`);
    const st = stAt >= 0 ? blk.slice(stAt, blk.indexOf("</table>", stAt)) : "";
    const mv = parseYaml(readOr(join(runDir, "moves", `name_an_act_then_its_cost_${i}.yaml`), "{}"), "move");
    const dimRows = Object.keys(mv.before || {}).map((d) => `<tr><td>${escHtml(d)}</td><td>${escHtml(String(mv.before[d]))}</td><td>${escHtml(String((mv.after || {})[d] ?? ""))}</td></tr>`);
    const brk = `<tr class="breaks"><td>breaks</td><td colspan="2"><ol>${(mv.breaks || []).map((x) => `<li>${escHtml(String(x))}</li>`).join("")}</ol></td></tr>`;
    ok(stAt > seg && stAt < rend && !blk.slice(seg, stAt).includes("<details") && dimRows.length > 0 && (mv.breaks || []).length > 0
      && st.includes(dimRows.join("") + brk),
      `(n) the Extraction block for paragraph ${i} carries no open before / after / breaks table of its Move between its Segments table and the folded rendering`);
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
    const a = review.indexOf(`<div class="rpart ${cls}">`);
    if (a < 0) return "";
    const b = review.indexOf('<div class="rpart', a + 1);
    return review.slice(a, b >= 0 ? b : undefined);
  };
  // (o) THE PARAGRAPH TABLES ARE PLAIN (kogaki#1512): three headings and no section heading,
  // no details element anywhere between the comparison table and the first card but each
  // binding's closed before / after fold (kogaki#1516).
  ok(!review.replace(/<details class="states"><summary>before \/ after<\/summary>/g, "").includes("<details") && !review.includes("<h3>Review</h3>")
    && ["Segments", "Refused attempts", "Bindings"].every((h) => review.includes(`<h3>${h}</h3>`)),
    "(o) the paragraph tables carry a details element or a Review heading, or lack their own three headings");
  const segPart = rpart("segments");
  ok((segPart.match(/<th>content clause<\/th>/g) || []).length === 3 && [1, 2, 3].every((i) => segPart.includes(`CONTENT-${i}-1`) && segPart.includes(`paragraph ${i} — name_an_act_then_its_cost_${i}`)),
    "(o) the review block does not carry one Segments table per paragraph, headed by its paragraph and Move");
  // (o) THE MOVE'S DESCRIPTION (kogaki#1517): each paragraph heading is followed by its bound
  // Move record's `description` as one plain paragraph, and only then by its Segments table.
  for (let i = 1; i <= 3; i++) {
    const head = segPart.indexOf(`<h4>paragraph ${i} — `);
    const mv = parseYaml(readOr(join(runDir, "moves", `name_an_act_then_its_cost_${i}.yaml`), "{}"), "move");
    const desc = typeof mv.description === "string" ? mv.description.trim() : "";
    const headEnd = head >= 0 ? segPart.indexOf("</h4>", head) + 5 : -1;
    const table = headEnd >= 0 ? segPart.indexOf("<table", headEnd) : -1;
    ok(desc === `Names an act, then names who pays for it (paragraph ${i}).` && headEnd > 4 && table > headEnd
      && segPart.slice(headEnd, table) === `<p>${escHtml(desc)}</p>`,
      `(o) paragraph ${i}'s heading is not followed by its Move's description as one plain paragraph above its Segments table`);
  }
  // A paragraph with no Move bound shows its heading and its table with nothing between them.
  const unbound = join(root, "unbound-move-run");
  cpSync(runDir, unbound, { recursive: true });
  const ingestPath = join(unbound, "ingest", "ingest.json");
  const ingestRec = JSON.parse(readOr(ingestPath, '{"entries":[]}'));
  if (ingestRec.entries && ingestRec.entries[1]) delete ingestRec.entries[1].move;
  writeFileSync(ingestPath, JSON.stringify(ingestRec));
  const nBuilt = S.buildSheet({ runs: [unbound], provenance: map, out: join(root, "unbound.html") });
  const nSeg = nBuilt.written ? readFileSync(nBuilt.written, "utf8") : "";
  const nHead = nSeg.indexOf("<h4>paragraph 2 — (no Move)</h4>");
  const nAfter = nHead >= 0 ? nSeg.slice(nHead + "<h4>paragraph 2 — (no Move)</h4>".length) : "";
  ok(nHead >= 0 && nAfter.startsWith("<table") && nSeg.includes(escHtml("Names an act, then names who pays for it (paragraph 1).")),
    "(o) a paragraph with no Move bound does not show its heading directly above its Segments table");
  const refPart = rpart("refused");
  const refRows = refPart.split("<tbody>")[1] ? refPart.split("<tbody>")[1].split("</tbody>")[0].split("<tr>").slice(1) : [];
  ok(refRows.length === 1 && refRows[0].includes(`href="#attempt-0-1"`) && refRows[0].includes("<td>2</td>")
    && refRows[0].includes("WHY-NOT-FIT the second paragraph waypoint restates the first instead of moving on."),
    `(o) the refused-attempts table does not carry exactly one row naming attempt 1, Leg Waypoint 2 and the judge's why: ${refRows.length} row(s)`);
  const att1 = cards.paragraphPlan.indexOf('id="attempt-0-1"');
  ok(att1 >= 0 && cards.paragraphPlan.lastIndexOf('<details class="part attempts">', att1) >= 0, "(o) the refused row's link names no attempt block on the ParagraphPlan card");
  const bindRec = JSON.parse(readOr(join(runDir, "paragraph-plan", "job", "paragraph-plan-bindings.json"), '{"bindings":[]}')).bindings;
  const bindPart = rpart("bindings");
  // A binding row runs to the next binding row: the Move's before / after table nests inside it.
  const rowAt = [...bindPart.matchAll(/<tr><td>(?=\d+<\/td><td>(?:POINT-|\(no point))/g)].map((m) => m.index);
  const bindRows = rowAt.map((at, i) => bindPart.slice(at + 8, i + 1 < rowAt.length ? rowAt[i + 1] : bindPart.length));
  ok(bindRec.length === 3 && bindRows.length === 3, `(o) the Bindings table holds ${bindRows.length} row(s) against the record's ${bindRec.length}`);
  for (const b of bindRec) {
    const row = bindRows.find((x) => x.startsWith(`${b.waypoint}</td>`)) || "";
    ok(row.includes(`POINT-${b.waypoint}`) && row.includes(`>${escHtml(b.move)}</a>`) && row.includes(escHtml(b.why)),
      `(o) the Bindings row for Leg Waypoint ${b.waypoint} does not carry its point, its Move and the record's why`);
    const sAt = row.indexOf('<details class="states"><summary>before / after</summary>');
    const fold = sAt >= 0 ? row.slice(sAt, row.indexOf("</details>", sAt) + 10) : "";
    const mv = parseYaml(readOr(join(runDir, "moves", `${b.move}.yaml`), "{}"), "move");
    const lines = Object.keys(mv.before || {}).map((d) => [mv.before[d], (mv.after || {})[d]]);
    ok(fold.includes("<table>") && lines.length > 0
      && lines.every(([bf, af]) => fold.includes(escHtml(String(bf))) && fold.includes(escHtml(String(af ?? "")))),
      `(o) the Bindings row for Leg Waypoint ${b.waypoint} carries no closed before / after fold with the Move's lines`);
  }
  // The before / after folds are closed on load and sit inside their binding's own row, so the
  // table's body holds one row per Leg Waypoint and nothing else (kogaki#1516).
  const bindBody = bindPart.includes("<tbody>") ? bindPart.slice(bindPart.indexOf("<tbody>") + 7, bindPart.lastIndexOf("</tbody>")) : "";
  const bodyRows = (bindBody.replace(/<details class="states">[\s\S]*?<\/details>/g, "").match(/<tr[\s>]/g) || []).length;
  ok(bodyRows === bindRec.length && !/<details class="states"[^>]*\sopen/.test(bindPart) && !bindPart.includes('<tr class="states">'),
    `(o) the Bindings table holds ${bodyRows} body row(s) against ${bindRec.length} Leg Waypoint(s), or a before / after fold is open on load`);
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
  const uRef = uHtml.slice(uHtml.indexOf('<div class="rpart refused">'), uHtml.indexOf('<div class="rpart bindings"'));
  const uJob = JSON.parse(readOr(join(unreadable, "paragraph-plan", "job", "reader-path-job.json"), "{}"));
  const uRefusal = (((uJob.units || [])[0] || {}).refusals || [])[0];
  ok(firstJudge >= 0 && !uRef.includes("no attempt was refused") && uRef.includes(`href="#attempt-0-1"`) && uRef.includes("no readable verdicts")
    && !!uRefusal && uRef.includes(escHtml(uRefusal)), "(o) an attempt with an unreadable judge answer does not render a row carrying the job record's refusal");

  for (let i = 1; i <= 3; i++) {
    const at = cards.paragraphPlan.indexOf(`id="planwp-p${i}-0">`);
    const body = at >= 0 ? cards.paragraphPlan.slice(at + `id="planwp-p${i}-0">`.length) : "";
    ok(body.startsWith(`<p>Point: POINT-${i} names CLAIM-${i} in English</p>`), `(o) the ParagraphPlan Output row for Leg Waypoint ${i} does not open on "Point:" and its point from the Brief`);
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
        operation: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? "" : "widens the step before it", manner: "" })),
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
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph + " names CLAIM-" + p.paragraph + " in " + input.language, serves: [p.claim_strand] })) }] }, "brief-leg-path");
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
const r1 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(hRoot, "leg-fixture.md"), "--out", hOut, "--provenance", map],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: stopJudge, PSR_FIXTURE_DIR: hRoot }, timeout: 600000 });
const hRunDir = (r1.stdout.match(/^run directory: (.+)$/m) || [])[1];
ok(!!hRunDir, `(h) the first run printed no run directory: ${r1.stdout}${r1.stderr}`);
if (hRunDir) {
  const run1 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(r1.status !== 0 && !!run1.stopped && run1.stopped.startsWith("extract:") && /paragraph 2 of 3/.test(run1.stopped),
    `(h) the first run did not stop at the Extractor's paragraph 2 of 3: ${JSON.stringify((run1.stages || []).map((s) => [s.stage, s.state]))} / ${run1.stopped}`);
  const extractDoneBefore = (JSON.parse(readFileSync(join(hRunDir, "extract", "command.json"), "utf8") || "[]"));
  ok(existsSync(join(hRunDir, "extract", "calls.jsonl")), "(h) the first run's extract stage made no recorded call");
  // (p) a record written with a terms file before kogaki#1531, its Brief not done, is resumed
  writeFileSync(join(hRunDir, "run.json"), JSON.stringify({ ...run1, terms: { path: join(hRoot, "terms.json"), sha256: "0", count: 1 } }));

  const r2 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--resume", hRunDir, "--provenance", map],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: goodJudge, PSR_FIXTURE_DIR: hRoot }, timeout: 600000 });
  ok(r2.status === 0, `(h) the resumed run exited ${r2.status}: ${r2.stdout}${r2.stderr}`);
  const run2 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(!("terms" in run2), `(p) the resumed run, its record carrying \`terms\`, kept the key: ${JSON.stringify(run2.terms)}`);
  ok(run2.stages.map((s) => `${s.stage}:${s.state}`).join(",") === "extract:done,ingest:done,brief:done,paragraph-plan:done,draft:done",
    `(h) the resumed run did not finish every stage: ${JSON.stringify(run2.stages.map((s) => [s.stage, s.state, s.stopped]))}`);
  const extractCalls = readFileSync(join(hRunDir, "extract", "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const p1Calls = extractCalls.filter((c) => c.stdin.includes('"number": 1,'));
  ok(p1Calls.length === 1, `(h) the resumed run's extract/calls.jsonl does not hold exactly one paragraph-1 call: ${p1Calls.length} of ${extractCalls.length} total`);
  ok(existsSync(join(hRunDir, "sheet.html")), "(h) the resumed run did not write a sheet");
  const hSheet = readOr(join(hRunDir, "sheet.html"), "");
  const hRef = hSheet.slice(hSheet.indexOf('<div class="rpart refused">'), hSheet.indexOf('<div class="rpart bindings"'));
  ok(hRef.includes("<p>no attempt was refused</p>") && !hRef.includes("<table"), "(o) the resumed run, refused nowhere, does not render \"no attempt was refused\"");
  const extractCmd = JSON.parse(readFileSync(join(hRunDir, "extract", "command.json"), "utf8"));
  ok(extractCmd.length > extractDoneBefore.length, "(h) the resumed extract stage replaced command.json instead of appending to it");

  // (p) the terms file is retired: a run given --terms is refused before it starts
  const hTerms = join(hRoot, "terms.json");
  writeFileSync(hTerms, JSON.stringify({ "ownership boundary": "established" }));
  const { TERMS_RETIRED } = await imp("src/proof-sheet/leg-brief.mjs");
  const rT = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(hRoot, "leg-fixture.md"), "--out", join(hRoot, "out-terms"), "--provenance", map,
    "--terms", hTerms], { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: goodJudge, PSR_FIXTURE_DIR: hRoot }, timeout: 600000 });
  ok(rT.status !== 0 && `${rT.stdout}${rT.stderr}`.includes(TERMS_RETIRED) && TERMS_RETIRED.startsWith("`--terms` is retired") && !/^run directory: /m.test(rT.stdout),
    `(p) a run given --terms was not refused with the retirement sentence before it started: ${rT.status} ${rT.stdout}${rT.stderr}`);
  const rB = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--resume", hRunDir, "--provenance", map, "--terms"],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: goodJudge, PSR_FIXTURE_DIR: hRoot }, timeout: 600000 });
  ok(rB.status !== 0 && `${rB.stdout}${rB.stderr}`.includes(TERMS_RETIRED) && !/^run directory: /m.test(rB.stdout),
    `(p) a resume given a bare --terms was not refused with the retirement sentence: ${rB.status} ${rB.stdout}${rB.stderr}`);
}
if (runDir) {
  const run0 = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
  ok(!("terms" in run0), `(p) run.json carries a \`terms\` key: ${JSON.stringify(run0.terms)}`);
  const sheet0 = readOr(join(runDir, "sheet.html"), "");
  ok(sheet0.includes('id="card-0-brief"') && !/class="terms"|brief-conditions|terms: (model|fixed)|terms by the Brief|terms fixed from/.test(sheet0),
    "(p) the sheet carries a terms line, in the run header or on the Brief card");
}

// (q) STAGE REUSE (kogaki#1512): a run started with `--reuse <the main run> --from <stage>`
// copies the stages before <stage> byte for byte and records their hashes and the source run;
// the gate it is held to is the model binary's own log -- no Extractor call (and from
// `paragraph-plan`, no Brief call) reaches the binary -- not only the copied files existing.
// A copied Extraction with one Segment field changed is recorded by paragraph, Segment and
// field, and its Segments row is badged on the sheet.
if (runDir) {
  const LR = await imp("src/proof-sheet/leg-run.mjs");
  const { relFromRepo } = await imp("src/workflow/run-record.mjs");
  const reuseRun = (source, from, tag) => {
    const qRoot = join(root, `reuse-${tag}`);
    mkdirSync(qRoot, { recursive: true });
    const rq = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--reuse", source, "--from", from, "--out", join(qRoot, "out"), "--provenance", map],
      { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: qRoot }, timeout: 600000 });
    const dir = (rq.stdout.match(/^run directory: (.+)$/m) || [])[1];
    const seenQ = existsSync(join(qRoot, "seen.jsonl")) ? readFileSync(join(qRoot, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
    return { rq, dir, seen: seenQ, run: dir ? JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) : null,
      html: dir ? readOr(join(dir, "sheet.html"), "") : "" };
  };
  const cardOf = (html, key, next) => { const a = html.indexOf(`id="card-0-${key}"`); return a >= 0 ? html.slice(a, html.indexOf(`id="card-0-${next}"`, a)) : ""; };
  // The Moves are compared as the Move files; the library's INDEX.md names its own directory.
  const isMove = (f) => f.endsWith(".yaml");
  const sameFiles = (a, b, keep) => existsSync(a) && existsSync(b) && LR.dirSha256(a, keep) === LR.dirSha256(b, keep);
  const srcRel = relFromRepo(runDir, repo);

  const q1 = reuseRun(runDir, "brief", "brief");
  ok(q1.rq.status === 0 && !!q1.run, `(q) the run reusing --from brief exited ${q1.rq.status}: ${q1.rq.stdout}${q1.rq.stderr}`);
  if (q1.run) {
    ok(q1.run.stages.map((st) => `${st.stage}:${st.state}`).join(",") === "extract:done,ingest:done,brief:done,paragraph-plan:done,draft:done",
      `(q) the reused run's stages are not all done: ${JSON.stringify(q1.run.stages.map((st) => [st.stage, st.state, st.stopped]))}`);
    ok(!q1.seen.some((x) => x.stage === "extract") && q1.seen.some((x) => x.stage === "brief-leg-path") && q1.seen.some((x) => x.stage === "writer"),
      `(q) --from brief did not run the Brief and the Draft with no Extractor call: ${JSON.stringify(q1.seen.map((x) => x.stage))}`);
    ok(sameFiles(join(runDir, "extract"), join(q1.dir, "extract")) && sameFiles(join(runDir, "moves"), join(q1.dir, "moves"), isMove)
      && (q1.run.reuse.moves || {}).sha256 === LR.dirSha256(join(runDir, "moves"), isMove) && q1.run.reuse.moves.source_sha256 === q1.run.reuse.moves.sha256,
      "(q) --from brief does not carry the earlier run's Extraction and Moves byte for byte");
    const rc = q1.run.reuse || {};
    ok(rc.source === srcRel && rc.from === "brief" && JSON.stringify((rc.copied || []).map((c) => [c.stage, c.sha256]))
      === JSON.stringify([["extract", LR.dirSha256(join(runDir, "extract"))]]) && JSON.stringify(rc.edits) === "[]",
      `(q) run.json's reuse does not name the source run, the stage and the copied Extraction's sha256 with no edit: ${JSON.stringify(rc)}`);
    const ex = q1.run.stages.find((st) => st.stage === "extract") || {};
    const ing = q1.run.stages.find((st) => st.stage === "ingest") || {};
    ok(ex.copied_from === srcRel && String(ex.extractor_run || "").startsWith(q1.dir) && !ing.copied_from && existsSync(join(q1.dir, "ingest", "command.json")),
      "(q) the extract stage is not recorded as copied into the new run, or the ingest was not re-run");
    ok(cardOf(q1.html, "extraction", "move").includes(`<span class="badge copied">copied from ${escHtml(srcRel)}</span>`)
      && !cardOf(q1.html, "brief", "paragraphPlan").includes('class="badge copied"') && !cardOf(q1.html, "move", "brief").includes('class="badge copied"'),
      "(q) the sheet of --from brief does not badge the Extraction card alone as copied from the source run");
  }

  const q2 = reuseRun(runDir, "paragraph-plan", "plan");
  ok(q2.rq.status === 0 && !!q2.run, `(q) the run reusing --from paragraph-plan exited ${q2.rq.status}: ${q2.rq.stdout}${q2.rq.stderr}`);
  if (q2.run) {
    ok(!q2.seen.some((x) => x.stage === "extract" || x.stage.startsWith("brief-")) && q2.seen.some((x) => x.stage === "plan-generator") && q2.seen.some((x) => x.stage === "writer"),
      `(q) --from paragraph-plan ran a stage before the plan: ${JSON.stringify(q2.seen.map((x) => x.stage))}`);
    ok(readOr(join(q2.dir, "brief", "brief.yaml"), "A") === readOr(join(runDir, "brief", "brief.yaml"), "B"), "(q) --from paragraph-plan does not carry the Brief byte for byte");
    ok(JSON.stringify(((q2.run.reuse || {}).copied || []).map((c) => c.stage)) === '["extract","brief"]', "(q) --from paragraph-plan does not record the copied Extraction and Brief");
    ok(cardOf(q2.html, "brief", "paragraphPlan").includes(`<span class="badge copied">copied from ${escHtml(srcRel)}</span>`), "(q) the sheet of --from paragraph-plan does not badge the Brief card as copied");
  }

  // the owner edits paragraph 2's first Segment's content clause in a copy of the main run
  const edited = join(root, "edited-source");
  cpSync(runDir, edited, { recursive: true });
  writeFileSync(join(edited, "run.json"), readFileSync(join(edited, "run.json"), "utf8").split(runDir).join(edited));
  const p2 = readdirSync(join(edited, "extract")).find((f) => f.startsWith("name_an_act_then_its_cost_2"));
  const p2Text = p2 ? readFileSync(join(edited, "extract", p2), "utf8") : "";
  writeFileSync(join(edited, "extract", p2 || "missing"), p2Text.replace("CONTENT-2-1 names", "CONTENT-2-1 OWNER-EDIT names"));
  const q3 = reuseRun(edited, "brief", "edited");
  ok(q3.rq.status === 0 && !!q3.run && p2Text.includes("CONTENT-2-1 names"), `(q) the run reusing an edited Extraction exited ${q3.rq.status}: ${q3.rq.stdout}${q3.rq.stderr}`);
  if (q3.run) {
    ok(JSON.stringify(q3.run.reuse.edits) === JSON.stringify([{ paragraph: 2, segment: 1, field: "content" }]),
      `(q) run.json does not record the edit by paragraph, Segment and field: ${JSON.stringify(q3.run.reuse.edits)}`);
    const rows = [...q3.html.matchAll(/<tr class="edited"><td>(\d+) <span class="badge edited"[^>]*>edited by owner<\/span><\/td><td>([^<]*)</g)];
    ok(rows.length === 2 && rows.every((m) => m[1] === "1" && m[2].startsWith("CONTENT-2-1 OWNER-EDIT")),
      `(q) the sheet does not badge the edited Segment row "edited by owner" in the Extraction card and the Segments table: ${rows.length} row(s)`);
  }

  // (r) THE LIBRARY (kogaki#1521): a library of the main run's three Moves under `lib_` ids, and a
  // second one that also holds one of the run's own ids. Each run reuses the main run's Extraction,
  // so the run's own ids are the main run's.
  const ownIds = readdirSync(join(runDir, "moves")).filter(isMove).map((f) => f.slice(0, -5)).sort();
  const lib = join(root, "library");
  const clashLib = join(root, "library-clash");
  for (const d of [lib, clashLib]) mkdirSync(d, { recursive: true });
  for (const id of ownIds) {
    const t = readFileSync(join(runDir, "moves", `${id}.yaml`), "utf8");
    for (const d of [lib, clashLib]) writeFileSync(join(d, `lib_${id}.yaml`), t.replace(`id: ${id}`, `id: lib_${id}`));
  }
  copyFileSync(join(runDir, "moves", `${ownIds[1]}.yaml`), join(clashLib, `${ownIds[1]}.yaml`));
  const libIds = ownIds.map((id) => `lib_${id}`);
  const libRel = relFromRepo(lib, repo);
  const libraryRun = (tag, extra, bind) => {
    const rRoot = join(root, `library-${tag}`);
    mkdirSync(rRoot, { recursive: true });
    const rr = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--reuse", runDir, "--from", "brief", "--out", join(rRoot, "out"), "--provenance", map, ...extra],
      { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: rRoot, PSR_PLAN_BIND: bind }, timeout: 600000 });
    const dir = (rr.stdout.match(/^run directory: (.+)$/m) || [])[1];
    return { rr, dir, rRoot, run: dir ? JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) : null, html: dir ? readOr(join(dir, "sheet.html"), "") : "",
      planIds: dir && existsSync(join(dir, "moves")) ? readdirSync(join(dir, "moves")).filter(isMove).map((f) => f.slice(0, -5)).sort() : [] };
  };
  const badge = (src) => `<span class="badge source">${src}</span>`;
  const bindingRows = (html) => [...html.matchAll(/<tr><td>(\d+)<\/td><td>[^<]*<\/td><td><a href="#card-0-move">([^<]*)<\/a>( <span class="badge source">[^<]*<\/span>)?/g)]
    .map((m) => [m[1], m[2], (m[3] || "").replace(/<[^>]*>/g, "").trim()]);
  const libSha = LR.readLibrary(lib).sha256;

  const r1 = libraryRun("beside", ["--library", lib], "library-first");
  ok(r1.rr.status === 0 && !!r1.run, `(r) the run with --library exited ${r1.rr.status}: ${r1.rr.stdout}${r1.rr.stderr}`);
  if (r1.run) {
    ok(JSON.stringify(r1.planIds) === JSON.stringify([...libIds, ...ownIds].sort()), `(r) with --library the plan's Move directory does not hold both sets: ${r1.planIds}`);
    ok(JSON.stringify(r1.run.library) === JSON.stringify({ dir: libRel, sha256: libSha, withhold_own: false, ids: { library: libIds, run: ownIds } }),
      `(r) run.json's library does not carry the directory, the sha256 and the ids by source: ${JSON.stringify(r1.run.library)}`);
    ok(r1.html.includes(`<h4>paragraph 1 — ${ownIds[0]} · bound ${libIds[0]} ${badge("library")}</h4>`)
      && r1.html.includes(`<h4>paragraph 2 — ${ownIds[1]} · bound ${ownIds[1]} ${badge("this run")}</h4>`),
      "(r) the paragraph headings do not name each bound Move with its source");
    ok(JSON.stringify(bindingRows(r1.html)) === JSON.stringify([["1", libIds[0], "library"], ["2", ownIds[1], "this run"], ["3", ownIds[2], "this run"]]),
      `(r) the Bindings rows do not badge each bound Move's source: ${JSON.stringify(bindingRows(r1.html))}`);
    ok(r1.html.includes(`<p class="library">Moves from the library ${escHtml(libRel)} (3) beside this run's own (3)</p>`),
      "(r) the run header does not name the library beside the run's own Moves");
  }

  const r2 = libraryRun("clash", ["--library", clashLib], "library-first");
  ok(r2.rr.status !== 0 && !r2.dir && r2.rr.stderr.includes(ownIds[1]) && r2.rr.stderr.includes("Nothing was started")
    && !existsSync(join(r2.rRoot, "out")) && !existsSync(join(r2.rRoot, "seen.jsonl")),
    `(r) a library holding one of the run's own ids was not refused naming it with nothing started: ${r2.rr.status} ${r2.rr.stderr}`);

  const r3 = libraryRun("withhold", ["--library", lib, "--withhold-own"], "library");
  ok(r3.rr.status === 0 && !!r3.run, `(r) the run with --withhold-own exited ${r3.rr.status}: ${r3.rr.stdout}${r3.rr.stderr}`);
  if (r3.run) {
    const ing = r3.run.stages.find((st) => st.stage === "ingest") || {};
    ok(JSON.stringify(r3.planIds) === JSON.stringify(libIds), `(r) with --withhold-own the plan's Move directory holds more than the library's records: ${r3.planIds}`);
    ok(JSON.stringify((ing.moves || []).map((f) => f.replace(/\.yaml$/, "")).sort()) === JSON.stringify(ownIds)
      && JSON.stringify(r3.run.library.ids) === JSON.stringify({ library: libIds, run: [] }) && r3.run.library.withhold_own === true,
      `(r) with --withhold-own the run record does not list the run's own ids at the ingest and none placed: ${JSON.stringify([ing.moves, r3.run.library])}`);
    ok(bindingRows(r3.html).length === 3 && bindingRows(r3.html).every((b) => b[2] === "library"), "(r) with --withhold-own a Bindings row is not badged \"library\"");
    ok(r3.html.includes(`<p class="library">Moves from the library ${escHtml(libRel)} (3); this run's own withheld</p>`), "(r) the run header does not say the run's own Moves were withheld");
  }

  const r4 = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--reuse", runDir, "--from", "brief", "--out", join(root, "withhold-alone"), "--provenance", map, "--withhold-own"],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: root } });
  ok(r4.status !== 0 && r4.stderr.includes("--withhold-own is valid only with --library") && !existsSync(join(root, "withhold-alone")),
    `(r) --withhold-own without --library was not refused: ${r4.status} ${r4.stderr}`);
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

// (s) THREE CONSECUTIVE LEGS UNDER ONE BRIEF (kogaki#1532): `--leg` three times, one run, one
// fake binary of its own -- its Extraction names carry the Leg's file name, so the three Legs'
// Moves never collide. Leg A introduces `frobnicator`, Leg B's content never uses it and Leg C's
// does, so the derivation re-activates it on Leg C.
{
  const sRoot = join(root, "three-legs");
  mkdirSync(sRoot, { recursive: true });
  const LEGS = { leg_a: ["The installer copies the kit. The frobnicator does the copying.", "Nobody asked the consumer first."],
    leg_b: ["So the next run overwrites any edit.", "The copy is the installer's."],
    leg_c: ["The frobnicator runs again tonight.", "Every edit is gone by morning."] };
  for (const [name, ps] of Object.entries(LEGS)) writeFileSync(join(sRoot, `${name}.md`), `${ps.join("\n\n")}\n`);
  const sJudge = join(sRoot, "fake-model.mjs");
  writeFileSync(sJudge, `#!/usr/bin/env node
import { appendFileSync, writeSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
// (v) PSR_TERMS: each Leg's content terms and introduced terms, and the one deferring Move.
const T = process.env.PSR_TERMS ? JSON.parse(process.env.PSR_TERMS) : null;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const IN = "----- INPUT (JSON) -----";
  const input = () => JSON.parse(prompt.slice(prompt.lastIndexOf(IN) + IN.length));
  const out = (r, stage) => {
    appendFileSync(process.env.PSR_FIXTURE_DIR + "/seen.jsonl", JSON.stringify({ stage, prompt }) + "\\n");
    writeSync(1, stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    return out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint, verdict: "fits", why: "they begin at before and end at after." })) }, "plan-judge");
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const plan = body("leg_you_must_plan");
    const leg = plan.leg_you_must_plan;
    const owes = plan.obligations_this_leg_owes || [];
    const slug = leg.leg_id.replace("-", "_");
    // One Paragraph Waypoint per Segment of the bound Move, the validator's count (kogaki#1533).
    const segmentsOf = (id) => (plan.paragraph_moves_you_may_bind.find((m) => m.id === id) || { segments: [{}] }).segments;
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: "move_" + slug + "_" + w.waypoint,
      why: "its before holds the state and its after reaches the point.", ...(w.waypoint > 1 ? { join: "consequence" } : {}),
      ...(w.waypoint === 1 && owes.length ? { discharges: owes.map((o) => ({ obligation: o.obligation, by: 1 })) } : {}),
      paragraph_waypoints: segmentsOf("move_" + slug + "_" + w.waypoint).map((_, n) => ({
        point: "PW-" + leg.leg_id + "-" + w.waypoint + (n ? "-" + (n + 1) : "") + " the paragraph makes its point.", serves: [...w.serves] })) })) }, "plan-generator");
  }
  if (prompt.includes('"paragraph_you_must_extract"')) {
    const x = input();
    const p = x.paragraph_you_must_extract;
    const carried = x.reader_state_before;
    const dims = ["knowledge", "question", "expectation", "orientation", "trust"];
    const term = T ? (T.content[p.passage] || []).map((t) => " the " + t).join(" and") : /frobnicator/.test(p.text) ? " the frobnicator" : "";
    return out({ version: "1", paragraph: p.number, source: "not given", prior_text: carried ? "assumed — it takes up the text before it" : "not assumed — opens on a fact",
      language: "English", subject_nouns: ["installer"],
      answers: { q1: "Hands the reader one fact.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act." },
      what_it_does: "Hands the reader one fact about the copy.",
      reader: dims.map((d, i) => ({ dimension: d, before: carried ? carried[d] : "BEFORE-" + d,
        after: i === 0 ? "AFTER-" + p.passage + "-" + p.number : "unchanged", segment: i === 0 ? String(p.sentences.length) : "" })),
      segments: p.sentences.map((_, i) => ({ content: "CONTENT names" + term + " CLAIM-" + p.number + ", POINT-" + p.number + ", in English.",
        operation: "states one consequence of an act the reader did not ask for.", relation: i === 0 ? "" : "widens the step before it", manner: "" })),
      why_this_order: "The fact comes first.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the point floats", "add a second example — the point blurs"],
      description: (T && T.defers[p.passage + ":" + p.number]) || "Names one fact about the copy.", name: "move_" + p.passage + "_" + p.number, notes: "" }, "extract");
  }
  if (prompt.includes("\\\`leg_reader_start_unit\\\` judgment point")) {
    return out({ version: "1", reader_start: ["knowledge: holds that installers copy files", "question: holds: none", "trust: extends a peer's ordinary good faith"] }, "brief-reader-start");
  }
  if (prompt.includes("\\\`leg_path_unit\\\` judgment point")) {
    const x = input();
    const id = { L1: "leg-a", L3: "leg-b", L5: "leg-c", L7: "leg-d" }[x.paragraphs[0].claim_strand];
    const intro = T ? (T.introduces[id] || []) : id === "leg-a" ? ["frobnicator"] : [];
    return out({ legs: [{ leg_id: id, purpose: "Move the reader one step on.", rationale: "It is one Leg of three.",
      reader_state_after: "knowledge: holds the step of " + id + "\\norientation: sees where the copy of " + id + " ends up",
      claims: x.paragraphs.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph })),
      waypoints: x.paragraphs.map((p) => ({ point: "POINT-" + p.paragraph + " names CLAIM-" + p.paragraph, serves: [p.claim_strand] })),
      ...(intro.length ? { introduces: intro.map((t) => ({ term: t, meaning: t === "frobnicator" ? "the part that copies the kit" : "the part called " + t })) } : {}) }] }, "brief-leg-path");
  }
  return out("WRITTEN-1 the first paragraph.\\n\\nWRITTEN-2 the second.", "writer");
});
`);
  chmodSync(sJudge, 0o755);
  const sArgs = Object.keys(LEGS).flatMap((n) => ["--leg", join(sRoot, `${n}.md`)]);
  const rs = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", ...sArgs, "--out", join(sRoot, "out"), "--provenance", map],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: sJudge, PSR_FIXTURE_DIR: sRoot }, timeout: 600000 });
  const sRunDir = (rs.stdout.match(/^run directory: (.+)$/m) || [])[1];
  ok(rs.status === 0 && !!sRunDir, `(s) the three-Leg run exited ${rs.status}: ${rs.stdout}${rs.stderr}`);
  if (sRunDir) {
    const run = JSON.parse(readFileSync(join(sRunDir, "run.json"), "utf8"));
    ok(run.stages.every((st) => st.state === "done"), `(s) the three-Leg run's stages are not all done: ${JSON.stringify(run.stages.map((st) => [st.stage, st.state, st.stopped]))}`);
    ok(run.leg === null && JSON.stringify(run.legs.map((l) => [basename(l.file), l.copy, l.paragraphs])) === JSON.stringify([["leg_a.md", "legs/leg_a.md", 2], ["leg_b.md", "legs/leg_b.md", 2], ["leg_c.md", "legs/leg_c.md", 2]]),
      `(s) run.json's legs do not list the three files with their paragraph counts: ${JSON.stringify(run.legs)}`);
    // The Extractor ran every paragraph in order, Leg B's first reading Leg A's last as its earlier text.
    const sSeen = readOr(join(sRoot, "seen.jsonl"), "").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const ex = sSeen.filter((x) => x.stage === "extract").map((x) => JSON.parse(x.prompt.slice(x.prompt.lastIndexOf("----- INPUT (JSON) -----") + 24)));
    ok(ex.length === 6 && JSON.stringify(ex.map((x) => `${x.paragraph_you_must_extract.passage}:${x.paragraph_you_must_extract.number}`)) === JSON.stringify(["leg_a:1", "leg_a:2", "leg_b:1", "leg_b:2", "leg_c:1", "leg_c:2"]),
      `(s) the Extractor did not run every paragraph of every Leg in order: ${JSON.stringify(ex.map((x) => x.paragraph_you_must_extract))}`);
    ok(ex.length === 6 && JSON.stringify(ex[2].earlier_paragraphs) === JSON.stringify([LEGS.leg_a[1]]) && JSON.stringify(ex[3].earlier_paragraphs) === JSON.stringify([LEGS.leg_b[0]])
      && ex[2].reader_state_before && ex[2].reader_state_before.knowledge === "AFTER-leg_a-2",
      "(s) Leg B's first paragraph did not read Leg A's last paragraph as its earlier text, carrying its reader state");
    // One Brief, three Legs, every cross-Leg field derived as stated.
    const { parseBriefRecord, briefLegs } = await imp("src/compose/record.mjs");
    const { validateLegs } = await imp("src/compose.mjs");
    const LB = await imp("src/proof-sheet/leg-brief.mjs");
    let rec = null;
    try { rec = parseBriefRecord(readFileSync(join(sRunDir, "brief", "brief.yaml"), "utf8")).record; } catch (e) { fails.push(`(s) the Brief does not parse: ${e.message}`); }
    const legs = rec ? briefLegs(rec) : [];
    ok(JSON.stringify(legs.map((l) => l.leg_id)) === '["leg-a","leg-b","leg-c"]', `(s) the Brief does not carry the three Legs in order: ${JSON.stringify(legs.map((l) => l.leg_id))}`);
    if (legs.length === 3) {
      ok(JSON.stringify(legs.map((l) => l.depends_on)) === '[[],["leg-a"],["leg-a","leg-b"]]', `(s) depends_on is not derived as stated: ${JSON.stringify(legs.map((l) => l.depends_on))}`);
      ok(legs[0].opens_section === "sees where the copy of leg-c ends up" && legs.slice(1).every((l) => l.opens_section == null),
        `(s) opens_section is not the first Leg's alone, stating the last Leg's orientation: ${JSON.stringify(legs.map((l) => l.opens_section))}`);
      ok(JSON.stringify(legs.map((l) => l.reaches_target === true)) === "[false,false,true]" && rec.reader_target === "leg-c", "(s) reaches_target is not the last Leg's alone");
      ok(JSON.stringify(legs.map((l) => l["re-activate"] || [])) === '[[],[],["leg-a term frobnicator"]]', `(s) re-activate is not carried by the first later Leg whose content uses the term: ${JSON.stringify(legs.map((l) => l["re-activate"]))}`);
      const intro = legs.flatMap((l) => l.introduces || []);
      ok(intro.length === 1 && intro.every((e) => JSON.stringify(Object.keys(e).sort()) === '["meaning","term"]'),
        `(p) a composed Brief's \`introduces\` entry does not carry exactly \`term\` and \`meaning\`: ${JSON.stringify(intro)}`);
    }
    const legBriefRun = (run.stages.find((st) => st.stage === "brief") || {}).leg_brief_run;
    const bj = legBriefRun ? JSON.parse(readOr(join(legBriefRun, "brief.json"), "{}")) : {};
    // The production validateLegs over the whole path the composer wrote: the three Legs as
    // composed, completed by the derivation, from the Brief's Reader start.
    const answers = [1, 2, 3].map((k) => JSON.parse(readOr(join(legBriefRun || sRoot, `leg-path-${k}`, "answer.json"), '{"legs":[null]}')).legs[0]);
    const startRec = JSON.parse(readOr(join(legBriefRun || sRoot, "reader-start", "answer.json"), '{"reader_start":[]}'));
    if (answers.every(Boolean)) {
      const segs = [0, 2, 4].map((o) => [o, o + 1].map((i) => { const a = JSON.parse(readOr(join((run.stages[0] || {}).extractor_run || sRoot, `p${i + 1}`, "answer.json"), '{"segments":[]}')); return a.segments.map((g) => g.content); }));
      const v = validateLegs(LB.crossLegPath(answers, [2, 2, 2], segs).legs, LB.readerStartText(startRec), [], []);
      ok(!v.error, `(s) the production validateLegs refuses the composed path: ${v.error}`);
    } else fails.push("(s) a Leg path answer is not on disk");
    ok(rec && Array.isArray(rec.obligations) && rec.obligations.length === 0 && JSON.stringify(bj.deferrals) === "[]",
      `(s) a span with no deferring Move does not carry obligations: [] (kogaki#1548): ${JSON.stringify(rec && rec.obligations)} / ${JSON.stringify(bj.deferrals)}`);
    ok(JSON.stringify((bj.derived || []).map((d) => `${d.leg_id}:${d.field}`).sort()) === JSON.stringify(["leg-a:opens_section", "leg-b:depends_on", "leg-c:depends_on", "leg-c:re-activate", "leg-c:reaches_target"]),
      `(s) brief.json does not mark every derived cross-Leg field: ${JSON.stringify(bj.derived)}`);
    const draft = run.stages.find((st) => st.stage === "draft") || {};
    ok(JSON.stringify(draft.leg_ids) === '["leg-a","leg-b","leg-c"]' && (draft.sections || []).length === 3 && draft.sections.every((f) => existsSync(f)),
      `(s) /draft section did not write each Leg in order: ${JSON.stringify(draft)}`);
    ok(["leg-a", "leg-b", "leg-c"].every((id) => readOr(join(sRunDir, "draft", `calls-${id}.jsonl`), "").trim().split("\n").filter(Boolean).length === 1),
      "(s) each Leg's Writer call is not recorded in its own calls file");
    // The sheet: three Leg blocks in order, each with its comparison table, under one Brief card
    // marking the derived fields.
    const sheet = readOr(join(sRunDir, "sheet.html"), "");
    const blocks = [...sheet.matchAll(/<section class="leg-block" id="leg-0-(\d)"><h3>Leg (\d) of 3 — ([a-z-]+)/g)].map((m) => `${m[1]}:${m[2]}:${m[3]}`);
    ok(JSON.stringify(blocks) === '["1:1:leg-a","2:2:leg-b","3:3:leg-c"]', `(s) the sheet does not carry three Leg blocks in order: ${JSON.stringify(blocks)}`);
    ok([1, 2, 3].every((k) => sheet.includes(`id="comparison-0-${k}"`)) && (sheet.match(/class="pcard[^"]*" id="card-0-brief"/g) || []).length === 1,
      "(s) the sheet does not carry a comparison table per Leg under one Brief card");
    ok((sheet.match(/<span class="badge derived">derived<\/span>/g) || []).length === 5, "(s) the Brief card does not mark the five derived cross-Leg fields `derived`");
    ok(sheet.includes("WRITTEN-1 the first paragraph.") && !sheet.includes('href="#card-0-1-brief"'), "(s) a Leg block's written text or its Brief link is wrong");
  }
  // (u) A LEADING SUBSET OF THE LEGS (kogaki#1546), reusing the three-Leg run above rather than
  // extracting again.
  if (sRunDir) {
    const tRun = (tag, extra) => {
      const tRoot = join(sRoot, `subset-${tag}`);
      mkdirSync(tRoot, { recursive: true });
      const r = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--reuse", sRunDir, ...extra, "--out", join(tRoot, "out"), "--provenance", map],
        { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: sJudge, PSR_FIXTURE_DIR: tRoot }, timeout: 600000 });
      const dir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];
      const seen = readOr(join(tRoot, "seen.jsonl"), "").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l).stage);
      return { r, dir, seen, out: join(tRoot, "out"), run: dir ? JSON.parse(readFileSync(join(dir, "run.json"), "utf8")) : null };
    };
    const t2 = tRun("2", ["--from", "brief", "--legs", "2"]);
    ok(t2.r.status === 0 && !!t2.run, `(u) --legs 2 exited ${t2.r.status}: ${t2.r.stdout}${t2.r.stderr}`);
    if (t2.run) {
      const ex = t2.run.stages.find((st) => st.stage === "extract") || {};
      const records = readdirSync(join(t2.dir, "extract")).filter((f) => f.endsWith(".yaml"));
      ok(!t2.seen.includes("extract") && t2.run.stages.every((st) => st.state === "done"),
        `(u) --legs 2 called the Extractor or left a stage short of done: ${JSON.stringify(t2.seen)} / ${JSON.stringify(t2.run.stages.map((st) => [st.stage, st.state, st.stopped]))}`);
      ok((ex.extractions || []).length === 4 && records.length === 4 && JSON.stringify(records.sort()) === JSON.stringify([...ex.extractions].sort()),
        `(u) --legs 2 does not keep exactly the four Extraction records of the first two Legs: ${JSON.stringify(records)}`);
      ok(t2.run.reuse.legs === 2 && JSON.stringify(t2.run.legs.map((l) => l.copy)) === '["legs/leg_a.md","legs/leg_b.md"]' && t2.run.paragraphs === 4,
        `(u) --legs 2 does not record two Legs: ${JSON.stringify({ reuse: t2.run.reuse, legs: t2.run.legs })}`);
      const { parseBriefRecord, briefLegs } = await imp("src/compose/record.mjs");
      let tLegs = [];
      try { tLegs = briefLegs(parseBriefRecord(readFileSync(join(t2.dir, "brief", "brief.yaml"), "utf8")).record); } catch (e) { fails.push(`(u) the two-Leg Brief does not parse: ${e.message}`); }
      ok(JSON.stringify(tLegs.map((l) => [l.leg_id, l.depends_on, l.reaches_target === true])) === '[["leg-a",[],false],["leg-b",["leg-a"],true]]',
        `(u) the Brief is not two Legs, the second depending on the first and reaching the target: ${JSON.stringify(tLegs.map((l) => [l.leg_id, l.depends_on, l.reaches_target]))}`);
    }
    // Every Leg kept records what a plain reuse records, `reuse.legs` apart.
    const t3 = tRun("3", ["--from", "brief", "--legs", "3"]);
    const plain = tRun("plain", ["--from", "brief"]);
    const shape = (x) => x && { ...x, started_at: null, finished_at: null, model_command: null, stages: x.stages.map((st) => [st.stage, st.state, st.extractions || null]),
      reuse: { ...x.reuse, legs: undefined, moves: null } };
    ok(!!t3.run && !!plain.run && JSON.stringify(shape(t3.run)) === JSON.stringify(shape(plain.run)) && t3.run.reuse.legs === 3
      && JSON.stringify(Object.keys(plain.run.reuse)) === '["source","from","copied","edits","moves"]',
      `(u) --legs 3 of three does not record what a plain reuse records apart from reuse.legs: ${JSON.stringify(shape(t3.run))} / ${JSON.stringify(shape(plain.run))}`);
    // Refused by name, with nothing written.
    for (const [tag, extra] of [["4", ["--from", "brief", "--legs", "4"]], ["0", ["--from", "brief", "--legs", "0"]], ["plan", ["--from", "paragraph-plan", "--legs", "2"]]]) {
      const t = tRun(`refused-${tag}`, extra);
      ok(t.r.status !== 0 && t.r.stderr.includes("--legs") && !t.dir && !existsSync(t.out) && !t.seen.length,
        `(u) ${extra.join(" ")} was not refused naming --legs with nothing written: ${t.r.status} ${t.r.stdout}${t.r.stderr}`);
    }
  }
  // (v) A DEFERRING MOVE RAISES ONE OBLIGATION ROW (kogaki#1548): Leg A's second paragraph's Move
  // defers two terms its content names, frobnicator then gizmo. Over two Legs, Leg B introduces
  // frobnicator alone: one `term` row, `term` a one-element list, raised by Leg A, owed by and
  // discharged by Leg B, marked derived, the sheet carrying `2 deferred, 1 kept in this span` on Leg
  // A's block and the plan call for Leg B handed the row it owes. Over four Legs, Leg B introduces
  // frobnicator and Leg D gizmo: one row, both terms in order, owed by Legs B and D, discharged by D.
  {
    const vRoot = join(root, "deferred-terms");
    mkdirSync(vRoot, { recursive: true });
    const DEFERS = { "leg_a:2": "Names the frobnicator and the gizmo and leaves both terms for a later Leg." };
    const { parseBriefRecord, briefLegs } = await imp("src/compose/record.mjs");
    const vRun = (tag, names, introduces) => {
      const d = join(vRoot, tag);
      mkdirSync(d, { recursive: true });
      for (const n of names) writeFileSync(join(d, `${n}.md`), `The ${n} paragraph states one fact.\n\nNobody asked the consumer first.\n`);
      const r = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", ...names.flatMap((n) => ["--leg", join(d, `${n}.md`)]), "--out", join(d, "out"), "--provenance", map],
        { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: sJudge, PSR_FIXTURE_DIR: d,
          PSR_TERMS: JSON.stringify({ defers: DEFERS, introduces, content: { leg_a: ["frobnicator", "gizmo"], ...Object.fromEntries(Object.entries(introduces).map(([id, t]) => [id.replace("-", "_"), t])) } }) }, timeout: 600000 });
      const dir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];
      ok(r.status === 0 && !!dir, `(v) the ${tag} run exited ${r.status}: ${r.stdout}${r.stderr}`);
      if (!dir) return null;
      const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
      ok(run.stages.every((st) => st.state === "done"), `(v) the ${tag} run's stages are not all done: ${JSON.stringify(run.stages.map((st) => [st.stage, st.state, st.stopped]))}`);
      let rec = null;
      try { rec = parseBriefRecord(readFileSync(join(dir, "brief", "brief.yaml"), "utf8")).record; } catch (e) { fails.push(`(v) the ${tag} Brief does not parse: ${e.message}`); }
      const lb = (run.stages.find((st) => st.stage === "brief") || {}).leg_brief_run;
      return { dir, run, rec, text: readOr(join(dir, "brief", "brief.yaml"), ""), bj: lb ? JSON.parse(readOr(join(lb, "brief.json"), "{}")) : {},
        sheet: readOr(join(dir, "sheet.html"), "") };
    };
    const block = (sheet, k) => { const a = sheet.indexOf(`<section class="leg-block" id="leg-0-${k}">`); return a < 0 ? "" : sheet.slice(a, sheet.indexOf("</h3>", a) + 200); };
    const two = vRun("two", ["leg_a", "leg_b"], { "leg-b": ["frobnicator"] });
    if (two && two.rec) {
      ok(JSON.stringify(two.rec.obligations) === JSON.stringify([{ kind: "term", term: ["frobnicator"], raised_by: "leg-a", owed_by: ["leg-b"], discharged_by: "leg-b" }]),
        `(v) the two-Leg Brief does not carry exactly one term row raised by leg-a, owed by and discharged by leg-b: ${JSON.stringify(two.rec.obligations)}`);
      ok(two.text.includes("# PROOF SHEET DERIVED (kogaki#1548): from the Legs' deferring Moves, no model call.\nobligations:"),
        "(v) the Brief does not mark its obligations derived rather than constant");
      ok((two.bj.derived || []).some((d) => d.leg_id === "leg-a" && d.field === "obligations")
        && /<td>leg-a<\/td><td>obligations <span class="badge derived">derived<\/span><\/td>/.test(two.sheet),
        `(v) the Brief card does not mark the obligations row derived: ${JSON.stringify(two.bj.derived)}`);
      ok(block(two.sheet, 1).includes("2 deferred, 1 kept in this span") && !block(two.sheet, 2).includes("deferred,"),
        `(v) Leg A's block does not carry "2 deferred, 1 kept in this span" alone: ${block(two.sheet, 1)}`);
      const planB = readOr(join(two.dir, "paragraph-plan", "calls.jsonl"), "").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
        .map((c) => c.stdin).filter((s) => s.includes('"leg_you_must_plan"') && s.includes('"leg_id": "leg-b"'));
      ok(planB.length >= 1 && planB.every((s) => /"obligations_this_leg_owes": \[\s*\{\s*"obligation": 1,\s*"kind": "term",\s*"term": \[\s*"frobnicator"\s*\]/.test(s)),
        "(v) the plan call for leg-b is not handed the row it owes under obligations_this_leg_owes");
    }
    const four = vRun("four", ["leg_a", "leg_b", "leg_c", "leg_d"], { "leg-b": ["frobnicator"], "leg-d": ["gizmo"] });
    if (four && four.rec) {
      ok(JSON.stringify(four.rec.obligations) === JSON.stringify([{ kind: "term", term: ["frobnicator", "gizmo"], raised_by: "leg-a", owed_by: ["leg-b", "leg-d"], discharged_by: "leg-d" }]),
        `(v) the four-Leg Brief does not carry one row of both terms in order, owed by leg-b and leg-d: ${JSON.stringify(four.rec.obligations)}`);
      ok(JSON.stringify(briefLegs(four.rec).map((l) => l.depends_on || [])) === '[[],["leg-a"],["leg-b"],["leg-a","leg-c"]]',
        `(v) the introducing Legs do not depend on the raising Leg: ${JSON.stringify(briefLegs(four.rec).map((l) => l.depends_on))}`);
      ok(block(four.sheet, 1).includes("2 deferred, 2 kept in this span"), "(v) Leg A's block does not carry \"2 deferred, 2 kept in this span\"");
    }
  }
  // A ONE-FILE RUN KEEPS ITS RECORD SHAPE apart from the `legs` list.
  if (runDir) {
    const one = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
    ok(JSON.stringify(Object.keys(one)) === JSON.stringify(["leg", "passage", "paragraphs", "legs", "audience", "language", "model_command", "library", "started_at", "stages", "finished_at"]),
      `(s) a one-file run's record shape changed beyond the legs list: ${JSON.stringify(Object.keys(one))}`);
    ok(JSON.stringify(one.legs) === JSON.stringify([{ file: one.leg, copy: "leg.md", paragraphs: 3 }]), `(s) a one-file run's legs list is not its one Leg: ${JSON.stringify(one.legs)}`);
  }
}

// (t) THE CLAIM'S WORDS IN ITS POINTS (kogaki#1547): the main fake binary's first Leg answer
// writes point 2 without its Claim's language word and its second the full point. The Leg
// row's attempts.json records one refusal naming Claim 2 and the word, the Brief carries the
// second answer, and every later stage runs.
{
  const tRoot = join(root, "claim-coverage");
  mkdirSync(tRoot, { recursive: true });
  writeFileSync(join(tRoot, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
  const rt = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(tRoot, "leg-fixture.md"), "--out", join(tRoot, "out"), "--provenance", map],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: tRoot, PSR_LEG_DROP: "first" }, timeout: 600000 });
  const tRunDir = (rt.stdout.match(/^run directory: (.+)$/m) || [])[1];
  ok(rt.status === 0 && !!tRunDir, `(t) the run whose first Leg answer drops a Claim word exited ${rt.status}: ${rt.stdout}${rt.stderr}`);
  if (tRunDir) {
    const run = JSON.parse(readFileSync(join(tRunDir, "run.json"), "utf8"));
    ok(run.stages.map((st) => `${st.stage}:${st.state}`).join(",") === "extract:done,ingest:done,brief:done,paragraph-plan:done,draft:done",
      `(t) the stages after the refused Leg answer did not all run: ${JSON.stringify(run.stages.map((st) => [st.stage, st.state, st.stopped]))}`);
    const lb = existsSync(join(tRunDir, "brief")) ? readdirSync(join(tRunDir, "brief")).filter((f) => f.startsWith("leg-brief-run-")) : [];
    const ap = lb.length === 1 ? join(tRunDir, "brief", lb[0], "leg-path", "attempts.json") : "";
    const a = ap && existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : {};
    ok(a.attempts === 2 && Array.isArray(a.refusals) && a.refusals.length === 1
      && /Claim 2 \(L2\) carries "english" in its `proposition`, which is in no `point` of the Leg Waypoints serving L2 \(read: waypoint 2\)/.test(a.refusals[0]),
      `(t) leg-path/attempts.json does not record one refusal naming Claim 2 and the word: ${JSON.stringify(a)}`);
    const brief = readOr(join(tRunDir, "brief", "brief.yaml"), "");
    ok(brief.includes("POINT-2 names CLAIM-2 in English"), "(t) the Brief does not carry the second Leg answer's full point");
  }
}

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-leg-run");
JS
