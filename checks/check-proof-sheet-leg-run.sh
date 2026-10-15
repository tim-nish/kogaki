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

  // (e) the sheet
  const html = readOr(join(runDir, "sheet.html"), "");
  ok((html.match(/<section class="card">/g) || []).length === 1, "(e) the sheet does not carry one card");
  const top = html.slice(html.indexOf('<table class="pair">'), html.indexOf("</table>", html.indexOf('<table class="pair">')));
  const rows = top.split("<tr><th>").slice(2);
  ok(rows.length === 3 && rows.every((row, i) => row.includes(PARAS[i]) && row.includes(WRITTEN[i])),
    `(e) the top does not pair original paragraph N with written paragraph N: ${rows.length} row(s)`);
  for (const name of Object.values(S.SHEET_CELLS)) {
    ok(html.includes(`<b>${name}`) || (["Original Leg", "Written Leg"].includes(name) && top.includes(name)), `(e) the sheet draws no "${name}" cell`);
    ok(html.includes(`provenance row: <code>| ${name} | fixture artifact |`) || (["Original Leg", "Written Leg"].includes(name) && top.includes(`provenance row: ${name}`)), `(e) the "${name}" cell prints no provenance row`);
  }
  ok(!/sha none<\/span><\/summary><p class="prov">provenance row: <code>\| (Extraction|Move|Packet|Writer) /.test(html), "(e) a cell of a finished stage shows no content hash");
  const ex1 = html.slice(html.indexOf("<b>Extraction — paragraph 1"), html.indexOf("<b>Extraction — paragraph 2"));
  ok(ex1.includes("prompt as rendered") && ex1.includes("attempts — 2") && ex1.includes("call 2 of 2"), "(e) the paragraph 1 Extraction cell does not show its prompt and both attempts");
  ok(html.includes("Every recorded Writer call's prompt is the Packet, byte for byte, and nothing else."), "(e) the Writer cell does not state its prompt is the Packet");

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

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-leg-run");
JS
