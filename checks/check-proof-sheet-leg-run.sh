#!/usr/bin/env bash
# check-proof-sheet-leg-run: one command runs an original Leg through the Extractor, the
# ingest and the Leg Brief composer, and writes a sheet with one card per Leg (kogaki#1386).
#
# THE PLAN STAGE IS PARKED (kogaki#1777, owner decision 2026-11-11): the Leg-as-unit plan binds
# one Move per Leg with at most two paragraphs, and this run binds one Move per original
# paragraph. So `paragraph-plan` makes no call and stops with `PARKED_PLAN_LINE`, `draft` and
# `leg-move` are recorded as not run, and the run exits 1. Its replay as one Leg per original
# paragraph is kogaki#1784, where the cases this park retired -- the ParagraphPlan file and its
# Rounds, the Packet, the Writer, the library, the recorder's streams and the Leg Move -- return.
#
# Cases (the letters are the ones the member carried before the park; the retired ones are gone):
#   (a) the run exits 1 with `extract`, `ingest` and `brief` done, `paragraph-plan` stopped on the parked
#       line, `draft` and `leg-move` not run, and `run.json`'s stop line is the stage's; the Extractor's
#       and the Leg Brief composer's calls went through the recorder -- `calls.jsonl` per stage holds exactly
#       the prompts and answers the binary saw (Extractor 10 with paragraph 1 refused once, composer 1) -- and
#       no ParagraphPlan, Writer or Leg Move call reached the binary; the ingest made none.
#   (b) the ingest derived one Move per Extraction into the run's own library, and a `manner` the
#       Extractor fills on paragraph 2's Segment 2 rides to that Move's Segment alone (kogaki#1510).
#   (d) the run writes nothing to the repository's `moves/` or `theses/`.
#   (e) the sheet: one run-conditions line, one comparison table, and exactly the seven cards of `SHEET_CELLS` in
#       pipeline order, each with its title, badge and folded parts; the ParagraphPlan card carries the parked line.
#   (f) the provenance map gates the sheet: a map missing a row refuses naming it.
#   (g) where the owner's map is on disk (corpus/ is not versioned), it carries every row.
#   (h) resume (kogaki#1396): a run stopped at the Extractor's paragraph 2 of 3 is resumed to the park, and its
#       extract/calls.jsonl holds exactly one paragraph-1 call; command.json is appended, not replaced.
#   (p) the terms file is retired (kogaki#1498, kogaki#1529): `--terms` is refused before anything starts.
#   (i) the Audience (kogaki#1396, kogaki#1495): run.json names the Audience path, the sheet shows its hash,
#       a record naming none is unreadable, and the Brief card badge reads "substitute, anchored".
#   (j) the article's language (kogaki#1417): each run records the Audience's language and hands it to the
#       composer; an Audience declaring no language is refused by name at the Brief stage.
#   (q) stage reuse (kogaki#1512): `--reuse --from brief` carries the Extraction and Moves byte for byte with
#       no Extractor call; `--from paragraph-plan` also carries the Brief and makes no composer call, then
#       parks; an edited Extraction is recorded by paragraph, Segment and field; the ingest's refusal reaches
#       the stop line.
#   (s) three consecutive Legs under one Brief (kogaki#1532), with (u) a leading subset of the Legs (kogaki#1546)
#       and (v) no Obligation row and the items in the Move's `leaves` (kogaki#1582, kogaki#1698).
#   (t) the Claim's words in its points (kogaki#1547): a Leg answer dropping a content word is refused once.
#   (z) the left column (kogaki#1621): no built sheet carries an "Original Leg" header.
#
# Each stage's own contract is its own check (check-proof-sheet-extract.sh, check-proof-sheet-leg-brief.sh).
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, cpSync, rmSync, copyFileSync, renameSync } from "node:fs";
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
const COPY = '<button type="button" class="copy-table">copy table</button>', escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// (l) The ParagraphPlan card's Rounds part, cut into its per-Round blocks.
const roundBlocks = (cardHtml) => {
  const a = cardHtml.indexOf('<details class="part rounds">');
  if (a < 0) return [];
  return cardHtml.slice(a, cardHtml.indexOf('<details class="part in"', a)).split("<summary>round ").slice(1);
};
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const S = await imp("src/proof-sheet/leg-sheet.mjs");
const { parseYaml, stringifyYaml } = await imp("src/yaml.mjs");
const root = mkdtempSync(join(tmpdir(), "proof-sheet-leg-run-"));
// THE MAPPER IS OFF IN THIS MEMBER (kogaki#1734): its fake answers the plan and judge calls alone;
// checks/check-paragraph-plan.sh case (z) runs the Mapper.
const noMapper = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
noMapper.paragraph_plan.mapper = false;
process.env.KOGAKI_SETTINGS = join(root, "settings-no-mapper.json");
writeFileSync(process.env.KOGAKI_SETTINGS, JSON.stringify(noMapper));

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
const dir = process.env.PSR_FIXTURE_DIR; const MV = String(process.env.KOGAKI_PROOF_SHEET_CALLS).includes("/leg-move/") ? "restate_an_act_then_its_cost_" : "name_an_act_then_its_cost_"; // a Leg Move's own id (kogaki#1601)
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    // (k) A LONG CALL: with PSR_PLAN_PAUSE_MS set, a ParagraphPlan call runs that long after its
    // first line, writing one short stream line every 200 ms as a live stream-json call does,
    // then writes its result — a healthy call longer than the stall bound the case hands in.
    const runMs = stage.startsWith("plan-") && !String(process.env.KOGAKI_PROOF_SHEET_CALLS).includes("/leg-move/") ? Number(process.env.PSR_PLAN_PAUSE_MS) || 0 : 0;
    const ticks = Array.from({ length: Math.ceil(runMs / 200) }, (_, n) => JSON.stringify({ type: "system", tick: n }) + "\\n");
    const head = JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n";
    appendFileSync(dir + (String(process.env.KOGAKI_PROOF_SHEET_CALLS).includes("/leg-move/") ? "/seen-leg-move.jsonl" : "/seen.jsonl"), JSON.stringify({ stage, argv: process.argv.slice(2), prompt, answer: stage === "writer" ? r : head + ticks.join("") + JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n" }) + "\\n");
    // The Writer is declared with a text output format (src/draft-workflow.json); every judge with json.
    // A judge's answer is preceded by a stream line longer than a pipe's buffer, as a live
    // stream-json answer is: the recorder must hand all of it through (the 2026-10-15 live run
    // lost the result line of every answer past the first to an asynchronous write).
    if (stage !== "writer") writeSync(1, head);
    for (const t of ticks) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200); writeSync(1, t); }
    writeSync(1, stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER (call ");
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    // (l) PSR_PLAN_REFUSE: "first" refuses Brief Waypoint 2 on the first judge call only, "all" on every one.
    const counter = dir + "/judge-count";
    const n = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
    writeFileSync(counter, String(n));
    const refuse = process.env.PSR_PLAN_REFUSE === "all" || (process.env.PSR_PLAN_REFUSE === "first" && n === 1);
    return out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => (refuse && w.waypoint === 2
      ? { waypoint: w.waypoint, verdict: "does-not-fit", why: "WHY-NOT-FIT the second waypoint restates the first instead of moving on." }
      : { waypoint: w.waypoint, verdict: "fits", why: "they begin at before and end at after." })) }, "plan-judge");
  }
  // A site retry (kogaki#1642) answers with the refused entry, its Waypoints rewritten.
  if (prompt.includes('"leg_waypoint_you_must_plan"')) {
    const refused = body("leg_waypoint_you_must_plan").refused_here.map((h) => h.entry).filter(Boolean), e = refused[refused.length - 1];
    return out({ ...e, paragraph_waypoints: e.paragraph_waypoints.map((p) => (p.point ? { ...p, point: p.point + " Rewritten " + refused.length + "." } : p)) }, "plan-generator");
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable } = body("leg_you_must_plan");
    const SEG = [2, 2, 3], segs = (w) => ((bindable || []).find((m) => m.id === MV + w.waypoint) || { segments: { length: SEG[w.waypoint - 1] } }).segments.length;
    // (r) PSR_PLAN_BIND: "library-first" binds Brief Waypoint 1 from the library, "library" every one.
    const fromLibrary = (n) => (bindable || []).some((m) => m.id.startsWith("lib_")) && (process.env.PSR_PLAN_BIND === "library" || (process.env.PSR_PLAN_BIND === "library-first" && n === 1));
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: (fromLibrary(w.waypoint) ? "lib_" : "") + MV + w.waypoint,
      materials: [...w.serves], purpose: "PURPOSE-" + w.waypoint + " brings the reader to the point.", depends_on: w.waypoint > 1 ? [w.waypoint - 1] : [], introduces: [], "re-activate": [], rationale: "its before holds the state and its after reaches the next point.",
      ...(w.waypoint > 1 ? { join: w.waypoint === 2 ? "consequence" : "contrast" } : {}),
      // (n) Brief Waypoint 2's second Waypoint is a \`performs\` entry (kogaki#1448).
      paragraph_waypoints: Array.from({ length: segs(w) }, (_, n) => (w.waypoint === 2 && n === 1 ? { performs: "PERFORMS-2-2 the paragraph turns the reader back on the act." }
        : { point: "PW-" + w.waypoint + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves], cast: {} })) })) }, "plan-generator");
  }
  // The constraints call (kogaki#1698): every given entry is supported, nothing is left unnamed, and a list to derive is derived empty.
  if (prompt.includes("\`constraints_unit\` judgment point")) { const SI = JSON.parse(prompt.slice(prompt.lastIndexOf("----- INPUT (JSON) -----") + 24)); return out({ takes: (SI.takes || []).map((x) => ({ ...x, supported: true, why: "Segment 1 takes it up." })), leaves: (SI.leaves || []).map((x) => ({ ...x, supported: true, why: "The named Segment leaves it." })), unnamed: [] }, "extract"); }
  // The content-bound call (kogaki#1614): every clause is bound; the state-bound call (kogaki#1652): every reader row is supported.
  if (/\`(content_bound|state_bound)_unit\` judgment point/.test(prompt)) { const SI = JSON.parse(prompt.slice(prompt.lastIndexOf("----- INPUT (JSON) -----") + 24)); return out(SI.reader ? { rows: SI.reader.map((r) => ({ dimension: r.dimension, before: { supported: true, why: "Segment 1 presupposes it." }, ...(String(r.after).trim().toLowerCase() === "unchanged" ? {} : { after: { supported: true, why: "The named Segment produces it." } }), ...(SI.reader_state_before && typeof SI.reader_state_before[r.dimension] === "string" ? { predecessor: { supported: true, why: "The previous state holds it." } } : {}) })) } : { verdicts: SI.segments.map(() => ({ bound: true, why: "Every reference resolves to the sentence." })) }, "extract"); }
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
      // the Segment content carries every word the fake Leg call writes (kogaki#1495)
      segments: p.sentences.map((s, i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does: CLAIM-" + p.number + ", POINT-" + p.number + ", in English or Japanese.",
        operation: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? "" : "widens the step before it",
        manner: p.number === 2 && i === 1 ? "a brief direct statement, given with no elaboration." : "" })),
      takes: [], leaves: [], why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      description: "Names an act, then names who pays for it (paragraph " + p.number + ").", name: MV + p.number, notes: "",
    };
    if (first && !retried) delete record.segments[0].operation;
    return out(record, "extract");
  }
  if (prompt.includes("\`leg_path_unit\` judgment point")) {
    const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
    const ps = input.paragraphs;
    return out({ legs: [{ leg_id: "copy-leg", 
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " (in " + input.language + ")." })),
      // (t) PSR_LEG_DROP=first: the first Leg answer's point 2 drops its Claim's language word (kogaki#1547).
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph + " names CLAIM-" + p.paragraph
        + (process.env.PSR_LEG_DROP === "first" && !retried && p.paragraph === 2 ? "" : " in " + input.language), serves: [p.claim_strand], case: "own" })) }] }, "brief-leg-path");
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
ok(r.status === 1, `(a) the parked run exited ${r.status}, not 1: ${r.stdout}${r.stderr}`);
const runDir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];
const seen = existsSync(join(root, "seen.jsonl")) ? readFileSync(join(root, "seen.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
const calls = (stage) => (runDir && existsSync(join(runDir, stage, "calls.jsonl")) ? readFileSync(join(runDir, stage, "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

const LR0 = await imp("src/proof-sheet/leg-run.mjs");
const PARKED = "extract:done,ingest:done,brief:done,paragraph-plan:stopped,draft:not run,leg-move:not run";
const PARKED_STOP = "paragraph-plan: " + LR0.PARKED_PLAN_LINE;
const stagesOf = (run) => run.stages.map((s) => `${s.stage}:${s.state}`).join(",");
const stageRows = (run) => JSON.stringify(run.stages.map((s) => [s.stage, s.state, s.stopped]));

if (!runDir) fails.push("(a) the run printed no run directory");
else {
  // (a) the three stages before the park done, the park recorded, every call through the recorder
  const run = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
  ok(stagesOf(run) === PARKED, `(a) the stages are not the parked shape: ${stageRows(run)}`);
  ok(run.stopped === PARKED_STOP, `(a) run.json's stop line is not the parked stage's: ${JSON.stringify(run.stopped)}`);
  ok(LR0.PARKED_PLAN_LINE.startsWith("parked (kogaki#1777)") && LR0.PARKED_PLAN_LINE.includes("kogaki#1784"), "(a) the parked line does not name the park and its successor");
  const want = { extract: ["extract", 10], brief: ["brief-leg-path", 1] };
  for (const [stage, [kinds, n]] of Object.entries(want)) {
    const cs = calls(stage);
    const fake = seen.filter((s) => s.stage === kinds);
    ok(cs.length === n, `(a) ${stage}/calls.jsonl records ${cs.length} call(s)`);
    ok(cs.length === fake.length && cs.every((c, i) => c.stdin === fake[i].prompt), `(a) ${stage}'s recorded calls are not the calls the model binary saw`);
    ok(cs.every((c, i) => c.stdout === fake[i].answer), `(a) ${stage}'s recorded answers are not the binary's own output`);
  }
  ok(!seen.some((s) => s.stage.startsWith("plan-") || s.stage === "writer"), `(a) a ParagraphPlan or Writer call reached the binary: ${JSON.stringify(seen.map((s) => s.stage))}`);
  ok(!existsSync(join(runDir, "paragraph-plan", "calls.jsonl")) && !existsSync(join(runDir, "draft")) && !existsSync(join(runDir, "leg-move")), "(a) the parked stages wrote calls or a workspace");
  ok(!existsSync(join(runDir, "ingest", "calls.jsonl")), "(a) the ingest made a model call");

  // (b) the ingest's Moves
  const ingest = JSON.parse(readOr(join(runDir, "ingest", "ingest.json"), '{"written":[],"entries":[]}'));
  ok(ingest.written.length === 3 && [1, 2, 3].every((n) => existsSync(join(runDir, "moves", `name_an_act_then_its_cost_${n}.yaml`))),
    `(b) the ingest did not write one Move per Extraction into the run's library: ${JSON.stringify(ingest.written)}`);
  ok(ingest.entries.length === 3 && ingest.entries.every((e) => e.admitted && e.screen.includes(`id: ${e.move}`)), "(b) an ingest entry does not carry its screen");
  // THE MANNER STOPS AT THE MOVE (kogaki#1510, kogaki#1585): paragraph 2's Segment 2 carries one, so its Move does.
  const MANNER = "a brief direct statement, given with no elaboration.";
  const move2 = parseYaml(readOr(join(runDir, "moves", "name_an_act_then_its_cost_2.yaml"), "id: none\n"), "move2");
  ok(Array.isArray(move2.segments) && JSON.stringify(move2.segments.map((g) => g.manner ?? null)) === JSON.stringify([null, MANNER]),
    `(b) the Move ingested from paragraph 2 does not carry its manner on Segment 2 alone: ${JSON.stringify(move2.segments)}`);

  // (e) the sheet: one run-conditions line, one comparison table, and the seven cards of
  // `SHEET_CELLS` in pipeline order -- every assertion reads inside the card a property belongs to.
  const html = readOr(join(runDir, "sheet.html"), ""), mainHtml = html.split('<section class="leg-block leg-move"')[0];
  ok(html.length > 0, "(e) the parked run wrote no sheet");
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
    const next = i + 1 < ORDER.length ? starts[i + 1] : mainHtml.length;
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
    const wantOrder = key === "paragraphPlan" ? ["out", "rounds", "in", "prompt", "calls"] : ["out", "in", "prompt", "calls"];
    ok(JSON.stringify(partOrder) === JSON.stringify(wantOrder), `(e) the ${name} card's parts are out of order: ${partOrder.join(",")}`);
    for (const href of [...c.matchAll(/<a href="#([^"]+)">/g)].map((m) => m[1])) {
      ok(ORDER.some((k) => href === `card-0-${k}`), `(e) the ${name} card's Inputs links to "${href}", which is not a card`);
    }
  }
  ok(cards.paragraphPlan.includes(escHtml(LR0.PARKED_PLAN_LINE)), "(e) the ParagraphPlan card does not carry the parked line");
  ok(cards.runRecord.includes(escHtml(LR0.PARKED_PLAN_LINE)) || cards.runRecord.includes("stopped"), "(e) the Run record card does not show the stop");
  // (z) THE ORIGINAL PARAGRAPH (kogaki#1621)
  ok(!html.includes("Original Leg") && html.includes("<th>Original Paragraph"), "(z) the sheet carries an \"Original Leg\" header, or no \"Original Paragraph\" column");

  // (f) the map gates
  const short = join(root, "PROVENANCE-short.md");
  writeFileSync(short, mapText(mapRows.filter((l) => !l.startsWith("| Packet |"))));
  const refused = S.buildSheet({ runs: [runDir], provenance: short, out: join(root, "short.html") });
  ok(/has no "## Cells of the Leg card" row for "Packet"/.test(refused.error || ""), `(f) a map missing the Packet row was not refused by name: ${refused.error}`);
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
const dir = process.env.PSR_FIXTURE_DIR; const MV = String(process.env.KOGAKI_PROOF_SHEET_CALLS).includes("/leg-move/") ? "restate_an_act_then_its_cost_" : "name_an_act_then_its_cost_"; // a Leg Move's own id (kogaki#1601)
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    appendFileSync(dir + (String(process.env.KOGAKI_PROOF_SHEET_CALLS).includes("/leg-move/") ? "/leg-move-${seenFile}" : "/${seenFile}"), JSON.stringify({ stage, argv: process.argv.slice(2), prompt, answer: stage === "writer" ? r : JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n" + JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n" }) + "\\n");
    if (stage !== "writer") writeSync(1, JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n");
    writeSync(1, stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    return out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint, verdict: "fits", why: "they begin at before and end at after." })) }, "plan-judge");
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const { leg_you_must_plan: leg, paragraph_moves_you_may_bind: bindable } = body("leg_you_must_plan");
    const SEG = [2, 2, 3], segs = (w) => ((bindable || []).find((m) => m.id === MV + w.waypoint) || { segments: { length: SEG[w.waypoint - 1] } }).segments.length;
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: MV + w.waypoint,
      materials: [...w.serves], purpose: "PURPOSE-" + w.waypoint + " brings the reader to the point.", depends_on: w.waypoint > 1 ? [w.waypoint - 1] : [], introduces: [], "re-activate": [], rationale: "its before holds the state and its after reaches the next point.",
      ...(w.waypoint > 1 ? { join: w.waypoint === 2 ? "consequence" : "contrast" } : {}),
      paragraph_waypoints: Array.from({ length: segs(w) }, (_, n) => ({ point: "PW-" + w.waypoint + "-" + (n + 1) + " the paragraph makes its point.", serves: [...w.serves], cast: {} })) })) }, "plan-generator");
  }
  // The constraints call (kogaki#1698): every given entry is supported, nothing is left unnamed, and a list to derive is derived empty.
  if (prompt.includes("\`constraints_unit\` judgment point")) { const SI = JSON.parse(prompt.slice(prompt.lastIndexOf("----- INPUT (JSON) -----") + 24)); return out({ takes: (SI.takes || []).map((x) => ({ ...x, supported: true, why: "Segment 1 takes it up." })), leaves: (SI.leaves || []).map((x) => ({ ...x, supported: true, why: "The named Segment leaves it." })), unnamed: [] }, "extract"); }
  // The content-bound call (kogaki#1614): every clause is bound; the state-bound call (kogaki#1652): every reader row is supported.
  if (/\`(content_bound|state_bound)_unit\` judgment point/.test(prompt)) { const SI = JSON.parse(prompt.slice(prompt.lastIndexOf("----- INPUT (JSON) -----") + 24)); return out(SI.reader ? { rows: SI.reader.map((r) => ({ dimension: r.dimension, before: { supported: true, why: "Segment 1 presupposes it." }, ...(String(r.after).trim().toLowerCase() === "unchanged" ? {} : { after: { supported: true, why: "The named Segment produces it." } }), ...(SI.reader_state_before && typeof SI.reader_state_before[r.dimension] === "string" ? { predecessor: { supported: true, why: "The previous state holds it." } } : {}) })) } : { verdicts: SI.segments.map(() => ({ bound: true, why: "Every reference resolves to the sentence." })) }, "extract"); }
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
      // the Segment content carries every word the fake Leg call writes (kogaki#1495)
      segments: p.sentences.map((s, i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does: CLAIM-" + p.number + ", POINT-" + p.number + ", in English or Japanese.",
        operation: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? "" : "widens the step before it", manner: "" })),
      takes: [], leaves: [], why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      description: "Names an act, then names who pays for it.", name: MV + p.number, notes: "",
    };
    if (p.number === ${brokenParagraph === null ? "null" : String(brokenParagraph)}) delete record.notes;
    return out(record, "extract");
  }
  if (prompt.includes("\\\`leg_path_unit\\\` judgment point")) {
    const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
    const ps = input.paragraphs;
    return out({ legs: [{ leg_id: "copy-leg", 
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " (in " + input.language + ")." })),
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph + " names CLAIM-" + p.paragraph + " in " + input.language, serves: [p.claim_strand], case: "own" })) }] }, "brief-leg-path");
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
  ok(r2.status === 1, `(h) the resumed run exited ${r2.status}, not 1 at the park: ${r2.stdout}${r2.stderr}`);
  const run2 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(!("terms" in run2), `(p) the resumed run, its record carrying \`terms\`, kept the key: ${JSON.stringify(run2.terms)}`);
  ok(stagesOf(run2) === PARKED && run2.stopped === PARKED_STOP, `(h) the resumed run did not run to the park: ${stageRows(run2)}`);
  const extractCalls = readFileSync(join(hRunDir, "extract", "calls.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const p1Calls = extractCalls.filter((c) => c.stdin.includes('"number": 1,'));
  ok(p1Calls.length === 1, `(h) the resumed run's extract/calls.jsonl does not hold exactly one paragraph-1 call: ${p1Calls.length} of ${extractCalls.length} total`);
  ok(existsSync(join(hRunDir, "sheet.html")), "(h) the resumed run did not write a sheet");
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
  const lmFiles = (JSON.parse(readFileSync(join(runDir, "run.json"), "utf8")).stages.find((st) => st.stage === "leg-move") || {}).moves || [], isMove = (f) => f.endsWith(".yaml") && !lmFiles.includes(f); // the paragraph Moves: a Leg Move joins moves/ (kogaki#1601)
  const sameFiles = (a, b, keep) => existsSync(a) && existsSync(b) && LR.dirSha256(a, keep) === LR.dirSha256(b, keep);
  const srcRel = relFromRepo(runDir, repo);

  const q1 = reuseRun(runDir, "brief", "brief");
  ok(q1.rq.status === 1 && !!q1.run, `(q) the run reusing --from brief exited ${q1.rq.status}, not 1 at the park: ${q1.rq.stdout}${q1.rq.stderr}`);
  if (q1.run) {
    ok(stagesOf(q1.run) === PARKED, `(q) the reused run's stages are not the parked shape: ${stageRows(q1.run)}`);
    ok(!q1.seen.some((x) => x.stage === "extract") && q1.seen.some((x) => x.stage === "brief-leg-path") && !q1.seen.some((x) => x.stage === "writer" || x.stage.startsWith("plan-")),
      `(q) --from brief did not run the Brief alone to the park with no Extractor call: ${JSON.stringify(q1.seen.map((x) => x.stage))}`);
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
  ok(q2.rq.status === 1 && !!q2.run, `(q) the run reusing --from paragraph-plan exited ${q2.rq.status}, not 1 at the park: ${q2.rq.stdout}${q2.rq.stderr}`);
  if (q2.run) {
    ok(q2.seen.length === 0 && stagesOf(q2.run) === PARKED, `(q) --from paragraph-plan made a call, or did not park: ${JSON.stringify(q2.seen.map((x) => x.stage))} ${stageRows(q2.run)}`);
    ok(readOr(join(q2.dir, "brief", "brief.yaml"), "A") === readOr(join(runDir, "brief", "brief.yaml"), "B"), "(q) --from paragraph-plan does not carry the Brief byte for byte");
    ok(JSON.stringify(((q2.run.reuse || {}).copied || []).map((c) => c.stage)) === '["extract","brief"]', "(q) --from paragraph-plan does not record the copied Extraction and Brief");
    ok(cardOf(q2.html, "brief", "paragraphPlan").includes(`<span class="badge copied">copied from ${escHtml(srcRel)}</span>`), "(q) the sheet of --from paragraph-plan does not badge the Brief card as copied");
  }

  // a copy of the main run whose paragraph 2 Extraction `edit` rewrites; the owner edits its first Segment's content clause
  const editCopy = (tag, edit) => { const d = join(root, `${tag}-source`); cpSync(runDir, d, { recursive: true }); writeFileSync(join(d, "run.json"), readFileSync(join(d, "run.json"), "utf8").split(runDir).join(d));
    const f = join(d, "extract", readdirSync(join(d, "extract")).find((x) => x.startsWith("name_an_act_then_its_cost_2")) || "missing");
    const text = existsSync(f) ? readFileSync(f, "utf8") : ""; writeFileSync(f, edit(text)); return { dir: d, text }; };
  const { dir: edited, text: p2Text } = editCopy("edited", (t) => t.replace("CONTENT-2-1 names", "CONTENT-2-1 OWNER-EDIT names"));
  const q3 = reuseRun(edited, "brief", "edited");
  ok(q3.rq.status === 1 && !!q3.run && p2Text.includes("CONTENT-2-1 names"), `(q) the run reusing an edited Extraction exited ${q3.rq.status}: ${q3.rq.stdout}${q3.rq.stderr}`);
  if (q3.run) {
    ok(JSON.stringify(q3.run.reuse.edits) === JSON.stringify([{ paragraph: 2, segment: 1, field: "content" }]),
      `(q) run.json does not record the edit by paragraph, Segment and field: ${JSON.stringify(q3.run.reuse.edits)}`);
    const rows = [...q3.html.matchAll(/<tr class="edited"><td>(\d+) <span class="badge edited"[^>]*>edited by owner<\/span><\/td><td>([^<]*)</g)];
    ok(rows.length === 2 && rows.every((m) => m[1] === "1" && m[2].startsWith("CONTENT-2-1 OWNER-EDIT")),
      `(q) the sheet does not badge the edited Segment row "edited by owner" in the Extraction card and the Segments table: ${rows.length} row(s)`);
  }
  // THE INGEST'S REFUSAL REACHES THE STOP LINE (kogaki#1576): an obligation naming one item twice.
  // A `leaves` entry repeated in kind and `what` (kogaki#1698), the obligation it replaced retired (kogaki#1701).
  const q4 = reuseRun(editCopy("ingest-refused", (t) => t.replace(/^leaves: \[\]$/m, "leaves:\n  - kind: explain\n    what: leverage\n    segment: 1\n  - kind: explain\n    what: leverage\n    segment: 1")).dir, "brief", "ingest-refused"), q4stop = (q4.run && q4.run.stopped) || "";
  ok(q4.rq.status !== 0 && q4stop.startsWith("ingest:") && q4stop.includes('move "name_an_act_then_its_cost_2"') && q4stop.includes("repeats an earlier entry's `kind` and `what`") && !q4stop.includes("(no output)"), `(q) the ingest's refusal does not reach the run's stop line naming the Move and the entry: ${q4stop || q4.rq.stdout + q4.rq.stderr}`);

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
ok(r3.status === 1 && !!iRunDir, `(i) the --audience run exited ${r3.status}, not 1 at the park: ${r3.stdout}${r3.stderr}`);
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
  // one Leg call, the Reader start call being retired (kogaki#1699)
  ok(bc.length === 1 && bc.every((c) => c.stdin.includes(`"language": "${want}"`) && c.stdin.includes("THE ARTICLE'S LANGUAGE (kogaki#1417)")),
    `${at}: the Leg Brief composer's calls do not each carry the language ${want} and the row's language sentence`);
  const brief = existsSync(join(dir, "brief", "brief.yaml")) ? readFileSync(join(dir, "brief", "brief.yaml"), "utf8") : "";
  ok((brief.match(new RegExp(`\\(in ${want}\\)`, "g")) || []).length === 3, `${at}: the Brief's three claims are not written in ${want}`);
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

// (s) THREE CONSECUTIVE LEGS UNDER ONE BRIEF (kogaki#1532): `--leg` three times, one run, one
// fake binary of its own -- its Extraction names carry the Leg's file name, so the three Legs'
// Moves never collide. A Leg binds no Move (kogaki#1768), so no Leg depends on another,
// introduces a term or re-activates one.
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
// (v) PSR_TERMS: each Leg's content terms and introduced terms, the paragraph whose Segments leave items unexplained (keyed under \`obligations\`), and those items (\`general\`), which its Move carries in \`leaves\`.
const T = process.env.PSR_TERMS ? JSON.parse(process.env.PSR_TERMS) : null;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const IN = "----- INPUT (JSON) -----";
  const input = () => JSON.parse(prompt.slice(prompt.lastIndexOf(IN) + IN.length));
  const out = (r, stage) => {
    appendFileSync(process.env.PSR_FIXTURE_DIR + (String(process.env.KOGAKI_PROOF_SHEET_CALLS).includes("/leg-move/") ? "/seen-leg-move.jsonl" : "/seen.jsonl"), JSON.stringify({ stage, prompt }) + "\\n");
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
    const slug = leg.leg_id.replace("-", "_"), ids = plan.paragraph_moves_you_may_bind.map((m) => m.id), mv = (w) => (ids.includes("move_" + slug + "_" + w.waypoint) ? "move_" + slug + "_" + w.waypoint : ids[0]);
    // One Waypoint per Segment of the bound Move, the validator's count (kogaki#1533).
    const segmentsOf = (id) => (plan.paragraph_moves_you_may_bind.find((m) => m.id === id) || { segments: [{}] }).segments;
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: mv(w),
      materials: [...w.serves], purpose: "PURPOSE-" + w.waypoint + " brings the reader to the point.",
      depends_on: w.waypoint > 1 ? [w.waypoint - 1] : [], introduces: w.waypoint === 1 ? (plan.terms_this_leg_introduces || []).map((t) => ({ term: t.term, meaning: t.meaning || "MEANING-" + t.term })) : [], "re-activate": [], rationale: "its before holds the state and its after reaches the point.", ...(w.waypoint > 1 ? { join: "consequence" } : {}), // the Leg's terms go to its first paragraph (kogaki#1639)
      paragraph_waypoints: segmentsOf(mv(w)).map((_, n) => ({
        point: "PW-" + leg.leg_id + "-" + w.waypoint + (n ? "-" + (n + 1) : "") + " the paragraph makes its point.", serves: [...w.serves], cast: {} })) })) }, "plan-generator");
  }
  if (prompt.includes("\\\`constraints_unit\\\` judgment point")) { /* the constraints call (kogaki#1698), as in the judges above */ const SI = input(); return out({ takes: (SI.takes || []).map((x) => ({ ...x, supported: true, why: "Segment 1 takes it up." })), leaves: (SI.leaves || []).map((x) => ({ ...x, supported: true, why: "The named Segment leaves it." })), unnamed: [] }, "extract"); }
  // The content-bound call (kogaki#1614) finds every clause bound; the state-bound call (kogaki#1652) supports every reader row.
  if (/\\\`(content_bound|state_bound)_unit\\\` judgment point/.test(prompt)) { const SI = input(); return out(SI.reader ? { rows: SI.reader.map((r) => ({ dimension: r.dimension, before: { supported: true, why: "Segment 1 presupposes it." }, ...(String(r.after).trim().toLowerCase() === "unchanged" ? {} : { after: { supported: true, why: "The named Segment produces it." } }), ...(SI.reader_state_before && typeof SI.reader_state_before[r.dimension] === "string" ? { predecessor: { supported: true, why: "The previous state holds it." } } : {}) })) } : { verdicts: SI.segments.map(() => ({ bound: true, why: "Every reference resolves to the sentence." })) }, "extract"); }
  if (prompt.includes('"paragraph_you_must_extract"')) {
    const x = input();
    const p = x.paragraph_you_must_extract;
    const carried = x.reader_state_before;
    const dims = ["knowledge", "question", "expectation", "orientation", "trust"];
    const term = T ? (T.content[p.passage] || []).map((t) => " the " + t).join(" and") : /frobnicator/.test(p.text) ? " the frobnicator" : "";
    const owes = T && T.obligations[p.passage + ":" + p.number];
    return out({ version: "1", paragraph: p.number, source: "not given", prior_text: carried ? "assumed — it takes up the text before it" : "not assumed — opens on a fact",
      language: "English", subject_nouns: ["installer"],
      answers: { q1: "Hands the reader one fact.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act." },
      what_it_does: "Hands the reader one fact about the copy.",
      segments: p.sentences.map((_, i) => ({ content: "CONTENT names" + term + " CLAIM-" + p.number + ", POINT-" + p.number + ", in English.",
        operation: owes && i === p.sentences.length - 1 ? "names two devices and explains neither." : "states one consequence of an act the reader did not ask for.", relation: i === 0 ? "" : "widens the step before it", manner: "" })),
      takes: [], leaves: owes ? T.general.map((what) => ({ kind: "explain", what, segment: p.sentences.length })) : [], why_this_order: "The fact comes first.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the point floats", "add a second example — the point blurs"],
      description: "Names one fact about the copy.", name: "move_" + p.passage.replace(/-/g, "_") + "_" + p.number, notes: "" }, "extract");
  }
  if (prompt.includes("\\\`leg_path_unit\\\` judgment point")) {
    const x = input();
    const id = { L1: "leg-a", L3: "leg-b", L5: "leg-c", L7: "leg-d" }[x.paragraphs[0].claim_strand];
    return out({ legs: [{ leg_id: id,
      claims: x.paragraphs.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + "." })),
      waypoints: x.paragraphs.map((p) => ({ point: "POINT-" + p.paragraph + " names CLAIM-" + p.paragraph, serves: [p.claim_strand], case: "own" })) }] }, "brief-leg-path");
  }
  return out("WRITTEN-1 the first paragraph.\\n\\nWRITTEN-2 the second.", "writer");
});
`);
  chmodSync(sJudge, 0o755);
  const sArgs = Object.keys(LEGS).flatMap((n) => ["--leg", join(sRoot, `${n}.md`)]);
  const rs = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", ...sArgs, "--out", join(sRoot, "out"), "--provenance", map],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: sJudge, PSR_FIXTURE_DIR: sRoot }, timeout: 600000 });
  const sRunDir = (rs.stdout.match(/^run directory: (.+)$/m) || [])[1];
  ok(rs.status === 1 && !!sRunDir, `(s) the three-Leg run exited ${rs.status}, not 1 at the park: ${rs.stdout}${rs.stderr}`);
  if (sRunDir) {
    const run = JSON.parse(readFileSync(join(sRunDir, "run.json"), "utf8"));
    ok(stagesOf(run) === PARKED, `(s) the three-Leg run's stages are not the parked shape: ${stageRows(run)}`);
    ok(run.leg === null && JSON.stringify(run.legs.map((l) => [basename(l.file), l.copy, l.paragraphs])) === JSON.stringify([["leg_a.md", "legs/leg_a.md", 2], ["leg_b.md", "legs/leg_b.md", 2], ["leg_c.md", "legs/leg_c.md", 2]]),
      `(s) run.json's legs do not list the three files with their paragraph counts: ${JSON.stringify(run.legs)}`);
    // The Extractor ran every paragraph in order, Leg B's first reading Leg A's last as its earlier text.
    const sSeen = readOr(join(sRoot, "seen.jsonl"), "").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const ex = sSeen.filter((x) => x.stage === "extract").map((x) => JSON.parse(x.prompt.slice(x.prompt.lastIndexOf("----- INPUT (JSON) -----") + 24)))
      .filter((x) => x.paragraph_you_must_extract);
    ok(ex.length === 6 && JSON.stringify(ex.map((x) => `${x.paragraph_you_must_extract.passage}:${x.paragraph_you_must_extract.number}`)) === JSON.stringify(["leg_a:1", "leg_a:2", "leg_b:1", "leg_b:2", "leg_c:1", "leg_c:2"]),
      `(s) the Extractor did not run every paragraph of every Leg in order: ${JSON.stringify(ex.map((x) => x.paragraph_you_must_extract))}`);
    ok(ex.length === 6 && JSON.stringify(ex[2].earlier_paragraphs) === JSON.stringify([LEGS.leg_a[1]]) && JSON.stringify(ex[3].earlier_paragraphs) === JSON.stringify([LEGS.leg_b[0]])
      && !("reader_state_before" in ex[2]),
      "(s) Leg B's first paragraph did not read Leg A's last paragraph as its earlier text, or was handed a retired reader state (kogaki#1699)");
    // One Brief, three Legs, every cross-Leg field derived as stated.
    const { parseBriefRecord, briefLegs } = await imp("src/compose/record.mjs");
    const { validateLegs } = await imp("src/compose.mjs");
    const LB = await imp("src/proof-sheet/leg-brief.mjs");
    let rec = null;
    try { rec = parseBriefRecord(readFileSync(join(sRunDir, "brief", "brief.yaml"), "utf8")).record; } catch (e) { fails.push(`(s) the Brief does not parse: ${e.message}`); }
    const legs = rec ? briefLegs(rec) : [];
    ok(JSON.stringify(legs.map((l) => l.leg_id)) === '["leg-a","leg-b","leg-c"]', `(s) the Brief does not carry the three Legs in order: ${JSON.stringify(legs.map((l) => l.leg_id))}`);
    if (legs.length === 3) {
      // a Leg binds no Move, so no Leg depends on another, re-activates or introduces anything (kogaki#1768)
      ok(legs.every((l) => !(l.depends_on || []).length && !(l["re-activate"] || []).length && !(l.introduces || []).length),
        `(s) a Leg carries a derived depends_on, re-activate or introduces: ${JSON.stringify(legs.map((l) => [l.depends_on, l["re-activate"], l.introduces]))}`);
      ok(legs[0].opens_section === legs[2].claims.at(-1).proposition && legs.slice(1).every((l) => l.opens_section == null),
        `(s) opens_section is not the first Leg's alone, stating the last Leg's last Claim (kogaki#1699): ${JSON.stringify(legs.map((l) => l.opens_section))}`);
      ok(JSON.stringify(legs.map((l) => l.reaches_target === true)) === "[false,false,true]" && !("reader_target" in rec) && !("reader_start" in rec),
        "(s) reaches_target is not the last Leg's alone, or the Brief carries a retired Reader start or Reader target (kogaki#1699)");
      ok(legs.every((l) => !("reader_state_after" in l) && !("reader_state_before" in l)), "(s) a Leg of the Brief carries a retired reader state (kogaki#1699)");
    }
    const legBriefRun = (run.stages.find((st) => st.stage === "brief") || {}).leg_brief_run;
    const bj = legBriefRun ? JSON.parse(readOr(join(legBriefRun, "brief.json"), "{}")) : {};
    // The production validateLegs over the whole path the composer wrote: the three Legs as
    // composed, completed by the derivation; no Reader start call is made (kogaki#1699).
    const answers = [1, 2, 3].map((k) => JSON.parse(readOr(join(legBriefRun || sRoot, `leg-path-${k}`, "answer.json"), '{"legs":[null]}')).legs[0]);
    ok(legBriefRun && !existsSync(join(legBriefRun, "reader-start")), "(s) the composer made a Reader start call, which is retired (kogaki#1699)");
    if (answers.every(Boolean)) {
      const segs = [0, 2, 4].map((o) => [o, o + 1].map((i) => { const a = JSON.parse(readOr(join((run.stages[0] || {}).extractor_run || sRoot, `p${i + 1}`, "answer.json"), '{"segments":[]}')); return a.segments.map((g) => g.content); }));
      const v = validateLegs(LB.crossLegPath(answers).legs, []);
      ok(!v.error, `(s) the production validateLegs refuses the composed path: ${v.error}`);
    } else fails.push("(s) a Leg path answer is not on disk");
    ok(rec && !("obligations" in rec) && !("deferrals" in bj),
      `(s) the Brief carries the retired \`obligations\` (kogaki#1699) or brief.json \`deferrals\`: ${JSON.stringify(rec && rec.obligations)} / ${JSON.stringify(bj.deferrals)}`);
    ok(JSON.stringify((bj.derived || []).map((d) => `${d.leg_id}:${d.field}`).sort()) === JSON.stringify(["leg-a:opens_section", "leg-c:reaches_target"]),
      `(s) brief.json does not mark every derived cross-Leg field: ${JSON.stringify(bj.derived)}`);
    // The sheet: three Leg blocks in order, each with its comparison table, under one Brief card
    // marking the derived fields.
    const sheet = readOr(join(sRunDir, "sheet.html"), "");
    const blocks = [...sheet.matchAll(/<section class="leg-block" id="leg-0-(\d)"><h3>Leg (\d) of 3 — ([a-z-]+)/g)].map((m) => `${m[1]}:${m[2]}:${m[3]}`);
    ok(JSON.stringify(blocks) === '["1:1:leg-a","2:2:leg-b","3:3:leg-c"]', `(s) the sheet does not carry three Leg blocks in order: ${JSON.stringify(blocks)}`);
    ok([1, 2, 3].every((k) => sheet.includes(`id="comparison-0-${k}"`)) && (sheet.match(/class="pcard[^"]*" id="card-0-brief"/g) || []).length === 1,
      "(s) the sheet does not carry a comparison table per Leg under one Brief card");
    ok((sheet.match(/<span class="badge derived">derived<\/span>/g) || []).length === 2, "(s) the Brief card does not mark the two derived cross-Leg fields `derived`");
    ok(!sheet.includes("WRITTEN-1 the first paragraph.") && !sheet.includes('href="#card-0-1-brief"'), "(s) a Leg block carries written text under the park, or its Brief link is wrong");
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
    ok(t2.r.status === 1 && !!t2.run, `(u) --legs 2 exited ${t2.r.status}: ${t2.r.stdout}${t2.r.stderr}`);
    if (t2.run) {
      const ex = t2.run.stages.find((st) => st.stage === "extract") || {};
      const records = readdirSync(join(t2.dir, "extract")).filter((f) => f.endsWith(".yaml"));
      ok(!t2.seen.includes("extract") && stagesOf(t2.run) === PARKED,
        `(u) --legs 2 called the Extractor or left a stage short of done: ${JSON.stringify(t2.seen)} / ${JSON.stringify(t2.run.stages.map((st) => [st.stage, st.state, st.stopped]))}`);
      ok((ex.extractions || []).length === 4 && records.length === 4 && JSON.stringify(records.sort()) === JSON.stringify([...ex.extractions].sort()),
        `(u) --legs 2 does not keep exactly the four Extraction records of the first two Legs: ${JSON.stringify(records)}`);
      ok(t2.run.reuse.legs === 2 && JSON.stringify(t2.run.legs.map((l) => l.copy)) === '["legs/leg_a.md","legs/leg_b.md"]' && t2.run.paragraphs === 4,
        `(u) --legs 2 does not record two Legs: ${JSON.stringify({ reuse: t2.run.reuse, legs: t2.run.legs })}`);
      const { parseBriefRecord, briefLegs } = await imp("src/compose/record.mjs");
      let tLegs = [];
      try { tLegs = briefLegs(parseBriefRecord(readFileSync(join(t2.dir, "brief", "brief.yaml"), "utf8")).record); } catch (e) { fails.push(`(u) the two-Leg Brief does not parse: ${e.message}`); }
      ok(JSON.stringify(tLegs.map((l) => [l.leg_id, (l.depends_on || []).length, l.reaches_target === true])) === '[["leg-a",0,false],["leg-b",0,true]]',
        `(u) the Brief is not two Legs, the second reaching the target and neither depending on another (kogaki#1768): ${JSON.stringify(tLegs.map((l) => [l.leg_id, l.depends_on, l.reaches_target]))}`);
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
  // (v) NO OBLIGATION ROW, AND THE ITEMS IN THE MOVE'S `leaves` (kogaki#1582, kogaki#1698): Leg A's second paragraph's last
  // Segment names two devices and explains neither, so its Extraction's `leaves` names two general items of kind `explain`, and each
  // paragraph's constraints call is handed the kinds, the Segments and the two lists alone; no extraction call is handed an open
  // obligation. Over two Legs the Brief carries no `obligations` key (kogaki#1699), `brief.json` no `deferrals` and
  // no derived `obligations` row, the plan call for Leg B is handed no row to owe, the Move carries the items in `leaves` and no
  // `obligation`, and the sheet carries no Move obligation line.
  {
    const vRoot = join(root, "deferred-terms"); mkdirSync(vRoot, { recursive: true });
    const ITEMS = ["frobnicator", "gizmo"], OBLIGATIONS = { "leg_a:2": ITEMS }, GENERAL = ["a named device", "a second named device"];
    const { parseBriefRecord } = await imp("src/compose/record.mjs");
    const LBv = await imp("src/proof-sheet/leg-brief.mjs");
    const vRun = (tag, names) => {
      const d = join(vRoot, tag); mkdirSync(d, { recursive: true });
      for (const n of names) writeFileSync(join(d, `${n}.md`), `The ${n} paragraph states one fact.\n\nNobody asked the consumer first.\n`);
      const r = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", ...names.flatMap((n) => ["--leg", join(d, `${n}.md`)]), "--out", join(d, "out"), "--provenance", map],
        { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: sJudge, PSR_FIXTURE_DIR: d,
          PSR_TERMS: JSON.stringify({ obligations: OBLIGATIONS, general: GENERAL, introduces: {}, content: { leg_a: ITEMS } }) }, timeout: 600000 });
      const dir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];
      ok(r.status === 1 && !!dir, `(v) the ${tag} run exited ${r.status}, not 1 at the park: ${r.stdout}${r.stderr}`); if (!dir) return null;
      const run = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
      ok(stagesOf(run) === PARKED, `(v) the ${tag} run's stages are not the parked shape: ${stageRows(run)}`);
      let rec = null;
      try { rec = parseBriefRecord(readFileSync(join(dir, "brief", "brief.yaml"), "utf8")).record; } catch (e) { fails.push(`(v) the ${tag} Brief does not parse: ${e.message}`); }
      const lb = (run.stages.find((st) => st.stage === "brief") || {}).leg_brief_run;
      const IN = "----- INPUT (JSON) -----", stageInputs = readOr(join(d, "seen.jsonl"), "").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l))
        .filter((x) => x.stage === "extract").map((x) => JSON.parse(x.prompt.slice(x.prompt.lastIndexOf(IN) + IN.length)));
      return { dir, run, rec, text: readOr(join(dir, "brief", "brief.yaml"), ""), bj: lb ? JSON.parse(readOr(join(lb, "brief.json"), "{}")) : {},
        sheet: readOr(join(dir, "sheet.html"), ""), extractInputs: stageInputs.filter((x) => x.paragraph_you_must_extract),
        constraintsInputs: stageInputs.filter((x) => x.kinds) };
    };
    const block = (sheet, k) => { const a = sheet.indexOf(`<section class="leg-block" id="leg-0-${k}">`); return a < 0 ? "" : sheet.slice(a, sheet.indexOf("</table>", a)); };
    const segs = (sheet, k) => { const b = block(sheet, k), a = b ? sheet.indexOf('<div class="rpart segments">', sheet.indexOf(b)) : -1; return a < 0 ? [] : sheet.slice(a, sheet.indexOf('<div class="rpart refused">', a)).split("<h4>").slice(1); };
    const two = vRun("two", ["leg_a", "leg_b"]);
    if (two && two.rec) {
      const moveA2 = readOr(join(two.dir, "moves", "move_leg_a_2.yaml"), "");
      ok(two.extractInputs.length === 4 && two.extractInputs.every((x) => !("open_obligation" in x)),
        `(v) an extraction call is handed an open obligation: ${JSON.stringify(two.extractInputs.map((x) => Object.keys(x)))}`);
      ok(two.constraintsInputs.length === 4 && two.constraintsInputs.every((x) => JSON.stringify(Object.keys(x)) === '["kinds","segments","takes","leaves","obligation"]' && x.obligation === null),
        `(v) the constraints calls are not one per paragraph, each handed the kinds, the Segments and the two lists alone: ${JSON.stringify(two.constraintsInputs)}`);
      const leavesA2 = (parseYaml(moveA2 || "{}", "move_leg_a_2.yaml") || {}).leaves || [];
      ok(!("obligations" in two.rec) && JSON.stringify(leavesA2.map((x) => x.what)) === JSON.stringify(GENERAL) && leavesA2.every((x) => x.kind === "explain") && !/^obligation:/m.test(moveA2),
        `(v) the two-Leg Brief carries an Obligation row, or its Move does not carry the general items in \`leaves\` and no \`obligation\`: ${JSON.stringify(two.rec.obligations)} / ${moveA2}`);
      ok(!/^obligations:/m.test(two.text), "(v) the Brief carries the retired `obligations` key (kogaki#1699)");
      ok(!("deferrals" in two.bj) && !(two.bj.derived || []).some((d) => d.field === "obligations"),
        `(v) brief.json carries deferrals or a derived obligations row: ${JSON.stringify(two.bj)}`);
      ok(segs(two.sheet, 1).length === 2 && !two.sheet.includes("Move obligation") && !two.sheet.includes("raised here"), `(v) the sheet carries a Move obligation line, which no extracted Move carries now: ${segs(two.sheet, 1).join("")}`);
    }
  }
  // A ONE-FILE RUN KEEPS ITS RECORD SHAPE apart from the `legs` list.
  if (runDir) {
    const one = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
    ok(JSON.stringify(Object.keys(one)) === JSON.stringify(["leg", "passage", "paragraphs", "legs", "audience", "language", "model_command", "library", "started_at", "stages", "stopped", "finished_at"]),
      `(s) a one-file run's record shape changed beyond the legs list: ${JSON.stringify(Object.keys(one))}`);
    ok(JSON.stringify(one.legs) === JSON.stringify([{ file: one.leg, copy: "leg.md", paragraphs: 3 }]), `(s) a one-file run's legs list is not its one Leg: ${JSON.stringify(one.legs)}`);
  }
}

// (t) THE CLAIM'S WORDS IN ITS POINTS (kogaki#1547): the main fake binary's first Leg answer
// writes point 2 without its Claim's language word and its second the full point. The Leg
// row's rounds.json records one refusal naming Claim 2 and the word, the Brief carries the
// second answer, and every later stage runs.
{
  const tRoot = join(root, "claim-coverage");
  mkdirSync(tRoot, { recursive: true });
  writeFileSync(join(tRoot, "leg-fixture.md"), `${PARAS.join("\n\n")}\n`);
  const rt = spawnSync(process.execPath, ["src/proof-sheet/leg-run.mjs", "run", "--leg", join(tRoot, "leg-fixture.md"), "--out", join(tRoot, "out"), "--provenance", map],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: tRoot, PSR_LEG_DROP: "first" }, timeout: 600000 });
  const tRunDir = (rt.stdout.match(/^run directory: (.+)$/m) || [])[1];
  ok(rt.status === 1 && !!tRunDir, `(t) the run whose first Leg answer drops a Claim word exited ${rt.status}: ${rt.stdout}${rt.stderr}`);
  if (tRunDir) {
    const run = JSON.parse(readFileSync(join(tRunDir, "run.json"), "utf8"));
    ok(stagesOf(run) === PARKED, `(t) the stages after the refused Leg answer did not run to the park: ${stageRows(run)}`);
    const lb = existsSync(join(tRunDir, "brief")) ? readdirSync(join(tRunDir, "brief")).filter((f) => f.startsWith("leg-brief-run-")) : [];
    const ap = lb.length === 1 ? join(tRunDir, "brief", lb[0], "leg-path", "rounds.json") : "";
    const a = ap && existsSync(ap) ? JSON.parse(readFileSync(ap, "utf8")) : {};
    ok(a.rounds === 2 && Array.isArray(a.refusals) && a.refusals.length === 1
      && /Claim 2 \(L2\) carries "english" in its `proposition`, which is in no `point` of the Brief Waypoints serving L2 \(read: waypoint 2\)/.test(a.refusals[0]),
      `(t) leg-path/rounds.json does not record one refusal naming Claim 2 and the word: ${JSON.stringify(a)}`);
    const brief = readOr(join(tRunDir, "brief", "brief.yaml"), "");
    ok(brief.includes("POINT-2 names CLAIM-2 in English"), "(t) the Brief does not carry the second Leg answer's full point");
  }
}

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-leg-run");
JS