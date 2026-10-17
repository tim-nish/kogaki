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
#       of `SHEET_CELLS` in pipeline order, Brief and ParagraphPlan in one row; every card has
#       Output, Inputs, Prompt and Calls in that order, Output open and the other three folded,
#       and every Inputs entry links to another card's id on the page; the Extraction card
#       shows paragraph 1's prompt and two attempts; the Draft card states its prompt equals
#       the Packet rather than repeating it; every recorded call's prompt, cut into its
#       instruction and its input, has each piece appear exactly once on the whole page (a retry
#       shows only the refusal block it inserted); the Audience and the settings appear only in
#       the run-conditions line.
#   (f) the provenance map gates the sheet: a map missing a row refuses naming it, and a
#       stopped Draft stage still draws the card with the stop in its Output.
#   (g) where the owner's map is on disk (corpus/ is not versioned), it carries every row.
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

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
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
import { appendFileSync, writeSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.PSR_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, argv: process.argv.slice(2), prompt, answer: stage === "writer" ? r : JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n" + JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n" }) + "\\n");
    // The Writer is declared with a text output format (src/draft-workflow.json); every judge with json.
    // A judge's answer is preceded by a stream line longer than a pipe's buffer, as a live
    // stream-json answer is: the recorder must hand all of it through (the 2026-10-15 live run
    // lost the result line of every answer past the first to an asynchronous write).
    if (stage !== "writer") writeSync(1, JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n");
    writeSync(1, stage === "writer" ? r : JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0);
  };
  const body = (key) => { const at = prompt.lastIndexOf('"' + key + '"'); const open = prompt.lastIndexOf("{", at); return JSON.parse(prompt.slice(open)); };
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER WAS REFUSED -----");
  if (prompt.includes('"leg_you_must_judge"')) {
    const leg = body("leg_you_must_judge").leg_you_must_judge;
    return out({ version: "1", leg_id: leg.leg_id, verdicts: leg.waypoints.map((w) => ({ waypoint: w.waypoint, verdict: "fits", why: "they begin at before and end at after." })) }, "plan-judge");
  }
  if (prompt.includes('"leg_you_must_plan"')) {
    const leg = body("leg_you_must_plan").leg_you_must_plan;
    const SEG = [2, 2, 3];
    return out({ version: "1", leg_id: leg.leg_id, waypoints: leg.waypoints.map((w) => ({ waypoint: w.waypoint, move: "name_an_act_then_its_cost_" + w.waypoint,
      why: "its before holds the state and its after reaches the next point.",
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
      segments: p.sentences.map((s, i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does.",
        does: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? (first ? "" : "draws the consequence of the act the previous paragraph named") : "widens the step before it" })),
      why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      technique: "Name an act, then name who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
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
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " from " + p.extraction.what_it_does })),
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph, serves: [p.claim_strand] })) }] }, "brief-leg-path");
  }
  return out(${JSON.stringify(WRITTEN.join("\n\n"))}, "writer");
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
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: root }, timeout: 600000 });
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
  const readOr = (p, dflt) => (existsSync(p) ? readFileSync(p, "utf8") : dflt);
  const ingest = JSON.parse(readOr(join(runDir, "ingest", "ingest.json"), '{"written":[],"entries":[]}'));
  ok(ingest.written.length === 3 && [1, 2, 3].every((n) => existsSync(join(runDir, "moves", `name_an_act_then_its_cost_${n}.md`))),
    `(b) the ingest did not write one Move per Extraction into the run's library: ${JSON.stringify(ingest.written)}`);
  ok(ingest.entries.length === 3 && ingest.entries.every((e) => e.admitted && e.screen.includes(`id: ${e.move}`)), "(b) an ingest entry does not carry its screen");
  const plan = parseYaml(readOr(join(runDir, "brief", "paragraph-plan.yaml"), "legs: []\n"), "plan");
  ok(plan.legs && plan.legs[0] && JSON.stringify(plan.legs[0].waypoints.map((w) => w.paragraph_waypoints.length)) === "[2,2,3]", "(b) the ParagraphPlan file's Paragraph Waypoint counts are not the Moves' Segment counts");

  // (c) the Writer's prompt is the Packet alone
  const packet = readOr(join(runDir, "draft", "leg-fixture", "packets", "copy-leg.md"), null);
  const w = calls("draft");
  ok(packet !== null && w.length === 1 && w[0].stdin === packet, "(c) the Writer's recorded prompt is not the Packet byte for byte");
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

  ok(/<div class="cols">/.test(html) && html.indexOf('<div class="cols">') < starts[ORDER.indexOf("brief")]
    && starts[ORDER.indexOf("paragraphPlan")] < html.indexOf("</div>", starts[ORDER.indexOf("paragraphPlan")]),
    "(e) Brief and ParagraphPlan are not in one row");

  for (const key of ORDER) {
    const name = S.SHEET_TITLES[key];
    const c = cards[key];
    ok(c.includes(`<b>${name}`), `(e) the ${name} card draws no title`);
    const badge = S.SHEET_CELL_BADGE[key];
    const wantLabel = badge.type === "substitute" ? "Proof Sheet substitute" : "production";
    ok(c.includes(`<span class="badge ${badge.type}"`) && c.includes(`>${wantLabel}<`), `(e) the ${name} card carries no "${wantLabel}" badge`);
    ok(/<details class="part out" open><summary>Output<\/summary>/.test(c), `(e) the ${name} card's Output is missing, or does not open by default`);
    ok(/<details class="part in"(?! open)><summary>Inputs<\/summary>/.test(c), `(e) the ${name} card's Inputs is missing, or opens by default`);
    ok(/<details class="part prompt"(?! open)><summary>Prompt<\/summary>/.test(c), `(e) the ${name} card's Prompt is missing, or opens by default`);
    ok(/<details class="part calls"(?! open)><summary>Calls<\/summary>/.test(c), `(e) the ${name} card's Calls is missing, or opens by default`);
    const partOrder = [...c.matchAll(/<details class="part (\w+)"/g)].map((m) => m[1]);
    ok(JSON.stringify(partOrder) === JSON.stringify(["out", "in", "prompt", "calls"]), `(e) the ${name} card's four parts are out of order: ${partOrder.join(",")}`);
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
  const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const occurrences = (needle) => html.split(needle).length - 1;
  const INPUT = "----- INPUT (JSON) -----";
  const REFUSED = "----- YOUR PREVIOUS ANSWER WAS REFUSED -----";
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
      segments: p.sentences.map((s, i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does.",
        does: "states one consequence of an act the reader did not ask for.",
        relation: i === 0 ? (first ? "" : "draws the consequence of the act the previous paragraph named") : "widens the step before it" })),
      why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      technique: "Name an act, then name who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
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
      claims: ps.map((p) => ({ type: "strand", strand: p.claim_strand, proposition: "CLAIM-" + p.paragraph + " from " + p.extraction.what_it_does })),
      waypoints: ps.map((p) => ({ point: "POINT-" + p.paragraph, serves: [p.claim_strand] })) }] }, "brief-leg-path");
  }
  return out(${JSON.stringify(WRITTEN.join("\n\n"))}, "writer");
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
  const extractCmd = JSON.parse(readFileSync(join(hRunDir, "extract", "command.json"), "utf8"));
  ok(extractCmd.length > extractDoneBefore.length, "(h) the resumed extract stage replaced command.json instead of appending to it");
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
writeFileSync(iAudience, "id: custom-fixture\npersona:\n  reader: >-\n    A custom reader, fixed for this test.\nregister: |\n  plain.\n");
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
}

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-leg-run");
JS
