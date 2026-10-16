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
#   (e) the sheet: one card; its top pairs original paragraph N with written paragraph N for
#       all three; every cell of `SHEET_CELLS` is drawn with its provenance row and a content
#       hash; the Extraction cell of paragraph 1 shows its prompt and two attempts; the
#       Writer cell states the prompt is the Packet.
#   (f) the provenance map gates the sheet: a map missing a row refuses naming it, and a
#       stopped Draft stage still draws the card with the stop in the written column.
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
      answers: { q1: "Hands the reader one fact and its cost.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act.", q4: "The reader's own tree." },
      what_it_does: first ? "Hands the reader a fact and then the cost of it." : "Draws the consequence of the previous act for the reader.",
      reader: dims.map((d, i) => ({ dimension: d, before: carried ? carried[d] : "BEFORE-" + d,
        after: i === 0 ? "AFTER-" + p.number + "-" + d : "unchanged", segment: i === 0 ? String(p.sentences.length) : "" })),
      segments: p.sentences.map((s, i) => ({ function: i === p.sentences.length - 1 ? "settles" : "advances",
        relation: i === 0 ? (first ? "none" : "consequence") : "elaboration",
        content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does.",
        generalized: "states one consequence of an act the reader did not ask for." })),
      why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: { remove: "the fact — the cost floats", reorder: "cost first — no ground", extend: "a second example — the point blurs" },
      technique: "Name an act, then name who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
    };
    if (first && !retried) delete record.segments[0].generalized;
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

  // (e) the sheet: three tiers (shared, the Leg card, one card per paragraph) -- every
  // assertion below reads inside the tier or paragraph card a cell belongs to, not a bare
  // substring search over the whole page (the consult receipt on the Issue: the property is
  // per card).
  const html = readOr(join(runDir, "sheet.html"), "");
  ok((html.match(/<section class="card">/g) || []).length === 1, "(e) the sheet does not carry one card");
  ok(/<details class="tier"><summary>Shared/.test(html), "(e) the shared tier is missing, or opens by default");
  ok(/<details class="tier leg" open><summary>Leg card<\/summary>/.test(html), "(e) the Leg card tier is missing, or does not open by default");
  for (let i = 1; i <= 3; i++) {
    ok(new RegExp(`<details class="card para"><summary>Paragraph ${i}</summary>`).test(html), `(e) paragraph ${i}'s card is missing, or opens by default`);
  }

  const sliceBetween = (a, b) => html.slice(html.indexOf(a), b ? html.indexOf(b) : undefined);
  const sharedHtml = sliceBetween('<details class="tier"><summary>Shared', '<details class="tier leg"');
  const legHtml = sliceBetween('<details class="tier leg"', '<details class="card para"><summary>Paragraph 1');
  const paraStarts = [1, 2, 3].map((i) => html.indexOf(`<details class="card para"><summary>Paragraph ${i}</summary>`));
  const paraHtmls = paraStarts.map((s, i) => html.slice(s, i + 1 < paraStarts.length ? paraStarts[i + 1] : undefined));

  const TIER1 = ["audience", "extractorPrompt", "readerStartPrompt", "legPathPrompt", "generatorPrompt", "judgePrompt", "writerPrompt", "settings", "run"];
  const TIER2 = ["original", "written", "brief", "readerStart", "legPath", "generator", "judge", "plan", "packet", "writer"];
  const TIER3 = ["passage", "extraction", "move", "waypoint", "paragraphWaypoints"];
  const checkCell = (slice, key, where) => {
    const name = S.SHEET_CELLS[key];
    ok(slice.includes(`<b>${name}`) || (["Original Leg", "Written Leg"].includes(name) && slice.includes(name)), `(e) ${where} draws no "${name}" cell`);
    const badge = S.SHEET_CELL_BADGE[key];
    if (badge) {
      const wantLabel = badge.type === "substitute" ? "Proof Sheet substitute" : "production";
      ok(slice.includes(`<span class="badge ${badge.type}"`) && slice.includes(`>${wantLabel}<`), `(e) ${where}'s "${name}" cell carries no "${wantLabel}" badge`);
    }
  };
  for (const key of TIER1) checkCell(sharedHtml, key, "the shared tier");
  for (const key of TIER2) checkCell(legHtml, key, "the Leg card");
  for (let i = 0; i < 3; i++) for (const key of TIER3) checkCell(paraHtmls[i], key, `paragraph ${i + 1}'s card`);

  ok(!/<b>(Extraction|Move|Packet|Draft)<\/b>[^<]*<\/span>[^<]*<span class="meta">[^<]*· sha none</.test(html), "(e) a cell of a finished stage shows no content hash");
  ok(!html.includes("provenance row:"), "(e) the sheet renders a provenance row line");

  const legTop = legHtml.slice(legHtml.indexOf('<table class="pair">'), legHtml.indexOf("</table>", legHtml.indexOf('<table class="pair">')));
  const legRows = legTop.split("<tr><th>").slice(2);
  ok(legRows.length === 3 && legRows.every((row, i) => row.includes(PARAS[i]) && row.includes(WRITTEN[i])),
    `(e) the Leg card's top does not pair original paragraph N with written paragraph N: ${legRows.length} row(s)`);
  for (let i = 0; i < 3; i++) {
    const pTop = paraHtmls[i].slice(paraHtmls[i].indexOf('<table class="pair">'), paraHtmls[i].indexOf("</table>", paraHtmls[i].indexOf('<table class="pair">')));
    ok(pTop.includes(PARAS[i]) && pTop.includes(WRITTEN[i]), `(e) paragraph ${i + 1}'s own top does not pair its original and written paragraph`);
  }

  ok(sharedHtml.includes("<b>Extraction") && sharedHtml.includes("instruction"),
    "(e) the shared tier's Extraction prompt cell does not show its instruction");
  ok(sharedHtml.includes("attempt bound (brief.unit_attempts)") && sharedHtml.includes("call limit, seconds (brief.call_limit_s)") && sharedHtml.includes("audience file (brief.audience_file)"),
    "(e) the shared tier's settings cell does not show the settings the stages read");

  const ex1 = paraHtmls[0].slice(paraHtmls[0].indexOf("<b>Extraction"), paraHtmls[0].indexOf("<b>Move"));
  ok(!ex1.includes("prompt as rendered") && ex1.includes("attempts — 2") && ex1.includes("call 2 of 2"),
    "(e) paragraph 1's Extraction cell shows its prompt, or does not show both attempts");
  ok(legHtml.includes("Every recorded Writer call's prompt is the Packet, byte for byte, and nothing else."), "(e) the Writer cell does not state its prompt is the Packet");

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
      answers: { q1: "Hands the reader one fact and its cost.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act.", q4: "The reader's own tree." },
      what_it_does: first ? "Hands the reader a fact and then the cost of it." : "Draws the consequence of the previous act for the reader.",
      reader: dims.map((d, i) => ({ dimension: d, before: carried ? carried[d] : "BEFORE-" + d,
        after: i === 0 ? "AFTER-" + p.number + "-" + d : "unchanged", segment: i === 0 ? String(p.sentences.length) : "" })),
      segments: p.sentences.map((s, i) => ({ function: i === p.sentences.length - 1 ? "settles" : "advances",
        relation: i === 0 ? (first ? "none" : "consequence") : "elaboration",
        content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does.",
        generalized: "states one consequence of an act the reader did not ask for." })),
      why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: { remove: "the fact — the cost floats", reorder: "cost first — no ground", extend: "a second example — the point blurs" },
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
