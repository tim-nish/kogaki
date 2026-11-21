#!/usr/bin/env bash
# check-move-extraction-playground-leg-run: one command runs an original Leg through its two stages, the
# Extractor and the ingest into a Move library of the run's own, writes a sheet of three cards and exits 0
# (kogaki#1386, cut to two stages at kogaki#1885). No other model call is made.
# Cases, driven through `node src/move-extraction-playground/leg-run.mjs run` over a three-paragraph Leg and one fake binary:
#   (a) the run exits 0 with the stages extract:done,ingest:done; every Extractor call went through the recorder
#       (10 calls, paragraph 1 refused once), each recorded call and answer the binary's own, and no other model
#       call was made; the run record keeps its shape, its one Leg in `legs`.
#   (b) the ingest derived one Move per Extraction into the run's own library, a `manner` on paragraph 2's
#       Segment 2 rides to that Move's Segment alone (kogaki#1510).
#   (d) the run writes nothing to the repository's `moves/` or `theses/`.
#   (e) the sheet: one run-conditions line and the three cards of `SHEET_CELLS` (Extraction, Move, Run record) in
#       order, each with its badge and its four folded parts; no comparison table and no card of a removed stage.
#   (f) the provenance map gates the sheet: a map missing one of the three rows refuses naming it.
#   (g) where the owner's map is on disk (corpus/ is not versioned), it carries every row.
#   (h) resume (kogaki#1396): a run stopped at the Extractor's paragraph 2 of 3 is resumed to exit 0 with both
#       stages done and one paragraph-1 call recorded; command.json is appended, not replaced.
#   (i) the Audience (kogaki#1396): run.json names the Audience path and its language, the Extractor is handed
#       the Audience's reader, the sheet shows the file's hash, and a record naming none is shown unreadable.
#   (p) `--terms` is refused as any unknown flag is, before anything starts.
# The Extractor's own contract is its own check (check-move-extraction-playground-extract.sh).
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, readdirSync, statSync, cpSync } from "node:fs";
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
const jsonlOf = (p) => (existsSync(p) ? readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const repo = resolve(".");
const imp = (p) => import(pathToFileURL(join(repo, p)).href);
const S = await imp("src/move-extraction-playground/leg-sheet.mjs");
const { parseYaml } = await imp("src/yaml.mjs");
const root = mkdtempSync(join(tmpdir(), "move-extraction-playground-leg-run-"));
const LEG_RUN = "src/move-extraction-playground/leg-run.mjs";

const PARAS = [
  "The installer copies the kit into the consumer's tree. Nobody asked the consumer first.",
  "So the next run overwrites any edit. The copy is the installer's.",
  "The consumer owns nothing there. Every edit is gone by morning. That is the cost.",
];
const legFixture = (dir) => { mkdirSync(dir, { recursive: true }); const f = join(dir, "leg-fixture.md"); writeFileSync(f, `${PARAS.join("\n\n")}\n`); return f; };

// ---- the provenance map: a Leg card table naming every cell ----
const mapRows = Object.values(S.SHEET_CELLS).map((n) => `| ${n} | fixture artifact | fixture contract |`);
const mapText = (rows) => ["# fixture map", "", `${S.PROVENANCE_SECTION} (fixture)`, "", "| cell | artifact | contract |", "|---|---|---|", ...rows, "", "## after", ""].join("\n");
const map = join(root, "PROVENANCE.md");
writeFileSync(map, mapText(mapRows));

// ---- the one fake model binary, answering the Extractor's calls ----
// PSR_REFUSE_P1=1: paragraph 1's first answer lacks a `content` clause, so it is asked once more.
// PSR_BROKEN=<n>: paragraph n's every answer lacks `notes`, so the Extractor stops there.
// Any other call is logged as stage "other" -- (a) asserts none is made.
// Every answer is preceded by a stream line longer than a pipe's buffer, as a live stream-json
// answer is: the recorder must hand all of it through (the 2026-10-15 live run lost the result
// line of every answer past the first to an asynchronous write).
const judge = join(root, "fake-model.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, writeSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-model 1.0"); process.exit(0); }
const dir = process.env.PSR_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const out = (r, stage) => {
    const head = JSON.stringify({ type: "system", pad: "x".repeat(200000) }) + "\\n";
    const answer = head + JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n";
    appendFileSync(dir + "/seen.jsonl", JSON.stringify({ stage, argv: process.argv.slice(2), prompt, answer }) + "\\n");
    writeSync(1, head); writeSync(1, answer.slice(head.length)); process.exit(0);
  };
  const IN = "----- INPUT (JSON) -----";
  const input = () => JSON.parse(prompt.slice(prompt.lastIndexOf(IN) + IN.length));
  const retried = prompt.includes("----- YOUR PREVIOUS ANSWER (call ");
  // The constraints call (kogaki#1698): every given entry is supported, nothing is left unnamed.
  if (prompt.includes("\`constraints_unit\` judgment point")) { const SI = input(); return out({ takes: (SI.takes || []).map((x) => ({ ...x, supported: true, why: "Segment 1 takes it up." })), leaves: (SI.leaves || []).map((x) => ({ ...x, supported: true, why: "The named Segment leaves it." })), unnamed: [] }, "extract"); }
  // The content-bound call (kogaki#1614): every clause is bound; the state-bound call (kogaki#1652): every reader row is supported.
  if (/\`(content_bound|state_bound)_unit\` judgment point/.test(prompt)) { const SI = input(); return out(SI.reader ? { rows: SI.reader.map((r) => ({ dimension: r.dimension, before: { supported: true, why: "Segment 1 presupposes it." }, ...(String(r.after).trim().toLowerCase() === "unchanged" ? {} : { after: { supported: true, why: "The named Segment produces it." } }), ...(SI.reader_state_before && typeof SI.reader_state_before[r.dimension] === "string" ? { predecessor: { supported: true, why: "The previous state holds it." } } : {}) })) } : { verdicts: SI.segments.map(() => ({ bound: true, why: "Every reference resolves to the sentence." })) }, "extract"); }
  if (prompt.includes(IN) && prompt.includes('"paragraph_you_must_extract"')) {
    const p = input().paragraph_you_must_extract;
    const first = p.number === 1;
    const record = {
      version: "1", paragraph: p.number, source: "not given", prior_text: first ? "not assumed — opens on a fact" : "assumed — \\"So\\" takes up the previous paragraph",
      language: "English", subject_nouns: ["installer", "kit"],
      answers: { q1: "Hands the reader one fact and its cost.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act." },
      what_it_does: first ? "Hands the reader a fact and then the cost of it." : "Draws the consequence of the previous act for the reader.",
      segments: p.sentences.map((s, i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does.",
        manner: p.number === 2 && i === 1 ? "a brief direct statement, given with no elaboration." : "" })),
      takes: [], leaves: [], why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
      breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
      description: "Names an act, then names who pays for it (paragraph " + p.number + ").", name: "name_an_act_then_its_cost_" + p.number, notes: "",
    };
    if (first && !retried && process.env.PSR_REFUSE_P1) delete record.segments[0].content;
    if (String(p.number) === process.env.PSR_BROKEN) delete record.notes;
    return out(record, "extract");
  }
  return out({}, "other");
});
`);
chmodSync(judge, 0o755);
const runIn = (dir, args, env = {}) => spawnSync(process.execPath, [LEG_RUN, "run", ...args],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSR_FIXTURE_DIR: dir, ...env }, timeout: 600000 });
const runDirOf = (r) => (r.stdout.match(/^run directory: (.+)$/m) || [])[1];

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

const DONE = "extract:done,ingest:done";
const stagesOf = (run) => run.stages.map((s) => `${s.stage}:${s.state}`).join(",");
const doneRun = (run) => stagesOf(run) === DONE && !("stopped" in run) && typeof run.finished_at === "string";

const r = runIn(root, ["--leg", join(legFixture(root)), "--out", join(root, "out"), "--provenance", map], { PSR_REFUSE_P1: "1" });
ok(r.status === 0 && !/the run stopped/.test(r.stdout), `(a) the run exited ${r.status}, not 0: ${r.stdout}${r.stderr}`);
const runDir = runDirOf(r);
const seen = jsonlOf(join(root, "seen.jsonl"));

if (!runDir) fails.push("(a) the run printed no run directory");
else {
  // (a) both stages done, every call through the recorder, no other model call
  const run = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
  ok(doneRun(run), `(a) the run's stages are not ${DONE} with no stop: ${stagesOf(run)} ${run.stopped}`);
  const cs = jsonlOf(join(runDir, "extract", "calls.jsonl"));
  ok(cs.length === 10, `(a) extract/calls.jsonl records ${cs.length} call(s), not 10`);
  ok(cs.length === seen.length && cs.every((c, i) => c.stdin === seen[i].prompt), "(a) the extract stage's recorded calls are not the calls the model binary saw");
  ok(cs.every((c, i) => c.stdout === seen[i].answer), "(a) the extract stage's recorded answers are not the binary's own output");
  ok(seen.every((s) => s.stage === "extract"), `(a) a model call other than the Extractor's was made: ${JSON.stringify(seen.map((s) => s.stage))}`);
  ok(!existsSync(join(runDir, "ingest", "calls.jsonl")), "(a) the ingest made a model call");
  ok(JSON.stringify(Object.keys(run)) === JSON.stringify(["leg", "passage", "paragraphs", "legs", "audience", "language", "model_command", "started_at", "stages", "finished_at"]),
    `(a) the run record's shape changed: ${JSON.stringify(Object.keys(run))}`);
  ok(JSON.stringify(run.legs) === JSON.stringify([{ file: run.leg, copy: "leg.md", paragraphs: 3 }]), `(a) a one-file run's legs list is not its one Leg: ${JSON.stringify(run.legs)}`);

  // (b) the ingest's Moves
  const ingest = JSON.parse(readOr(join(runDir, "ingest", "ingest.json"), '{"written":[],"entries":[]}'));
  ok(ingest.written.length === 3 && [1, 2, 3].every((n) => existsSync(join(runDir, "moves", `name_an_act_then_its_cost_${n}.yaml`))),
    `(b) the ingest did not write one Move per Extraction into the run's library: ${JSON.stringify(ingest.written)}`);
  ok(ingest.entries.length === 3 && ingest.entries.every((e) => e.admitted && e.screen.includes(`id: ${e.move}`)), "(b) an ingest entry does not carry its screen");
  ok(existsSync(join(runDir, "moves", "ROLES.json")), "(b) the run's library carries no copy of moves/ROLES.json");
  // THE MANNER STOPS AT THE MOVE (kogaki#1510, kogaki#1585): paragraph 2's Segment 2 carries one, so its Move does.
  const MANNER = "a brief direct statement, given with no elaboration.";
  const move2 = parseYaml(readOr(join(runDir, "moves", "name_an_act_then_its_cost_2.yaml"), "id: none\n"), "move2");
  ok(Array.isArray(move2.segments) && JSON.stringify(move2.segments.map((g) => g.manner ?? null)) === JSON.stringify([null, MANNER]),
    `(b) the Move ingested from paragraph 2 does not carry its manner on Segment 2 alone: ${JSON.stringify(move2.segments)}`);

  // (e) the sheet: one run-conditions line and the three cards of `SHEET_CELLS` in order --
  // every assertion reads inside the card a property belongs to.
  const html = readOr(join(runDir, "sheet.html"), "");
  ok(html.length > 0, "(e) the run wrote no sheet");
  ok((html.match(/<section class="card">/g) || []).length === 1, "(e) the sheet does not carry one run section");
  ok(/<div class="run-conditions" id="run-conditions">/.test(html), "(e) the run-conditions line is missing");
  ok(!/<table class="pair"/.test(html) && !html.includes('class="cols"'), "(e) the sheet still carries the comparison table or a .cols row");
  const ORDER = Object.keys(S.SHEET_CELLS);
  ok(JSON.stringify(ORDER) === '["extraction","move","runRecord"]', `(e) SHEET_CELLS is not the three cells Extraction, Move, Run record: ${JSON.stringify(ORDER)}`);
  const cardIds = [...html.matchAll(/<section class="pcard[^"]*" id="card-0-(\w+)"/g)].map((m) => m[1]);
  ok(JSON.stringify(cardIds) === JSON.stringify(ORDER), `(e) the sheet's cards are not exactly ${ORDER.join(", ")} in order: ${cardIds.join(", ")}`);
  const starts = ORDER.map((k) => html.indexOf(`id="card-0-${k}"`));
  for (const [i, key] of ORDER.entries()) {
    const name = S.SHEET_TITLES[key];
    const c = starts[i] < 0 ? "" : html.slice(starts[i], i + 1 < ORDER.length ? starts[i + 1] : undefined);
    ok(c.includes(`<b>${name}`), `(e) the ${name} card draws no title`);
    const badge = S.SHEET_CELL_BADGE[key];
    const wantLabel = badge.type === "substitute" ? "Move-Extraction Playground substitute" : "production";
    ok(c.includes(`<span class="badge ${badge.type}"`) && c.includes(`>${wantLabel}<`), `(e) the ${name} card carries no "${wantLabel}" badge`);
    // every part is folded on load (kogaki#1559), in the order Output, Inputs, Prompt, Calls
    const parts = [...c.matchAll(/<details class="part (\w+)"( open)?>/g)];
    ok(JSON.stringify(parts.map((m) => m[1])) === '["out","in","prompt","calls"]' && parts.every((m) => !m[2]),
      `(e) the ${name} card's parts are not Output, Inputs, Prompt, Calls, all folded: ${parts.map((m) => m[0]).join(",")}`);
    for (const href of [...c.matchAll(/<a href="#(card-[^"]+)">/g)].map((m) => m[1])) {
      ok(ORDER.some((k) => href === `card-0-${k}`), `(e) the ${name} card's Inputs links to "${href}", which is not a card`);
    }
  }
  ok([1, 2, 3].every((n) => html.includes(`CONTENT-${n}-1 names what the copy does.`)), "(e) the sheet's Segments tables do not carry each paragraph's first Segment");

  // (f) the map gates: a map missing the Move row refuses naming it
  const short = join(root, "PROVENANCE-short.md");
  writeFileSync(short, mapText(mapRows.filter((l) => !l.startsWith("| Move |"))));
  const refused = S.buildSheet({ runs: [runDir], provenance: short, out: join(root, "short.html") });
  ok(/has no "## Cells of the Leg card" row for "Move"/.test(refused.error || "") && !existsSync(join(root, "short.html")),
    `(f) a map missing the Move row was not refused by name: ${refused.error}`);
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

// (h) RESUME (kogaki#1396): a run stopped at the Extractor's paragraph 2 of 3 is resumed to
// exit 0, and its extract/calls.jsonl holds exactly one paragraph-1 call -- paragraph 1,
// already written before the stop, is never asked again.
const hRoot = join(root, "resume");
const r1 = runIn(hRoot, ["--leg", legFixture(hRoot), "--out", join(hRoot, "out"), "--provenance", map], { PSR_BROKEN: "2" });
const hRunDir = runDirOf(r1);
ok(!!hRunDir, `(h) the first run printed no run directory: ${r1.stdout}${r1.stderr}`);
if (hRunDir) {
  const run1 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(r1.status === 1 && stagesOf(run1) === "extract:stopped,ingest:not run" && String(run1.stopped).startsWith("extract:") && /paragraph 2 of 3/.test(run1.stopped),
    `(h) the first run did not stop at the Extractor's paragraph 2 of 3: ${stagesOf(run1)} / ${run1.stopped}`);
  const cmdBefore = JSON.parse(readOr(join(hRunDir, "extract", "command.json"), "[]"));
  ok(existsSync(join(hRunDir, "extract", "calls.jsonl")), "(h) the first run's extract stage made no recorded call");

  const r2 = runIn(hRoot, ["--resume", hRunDir, "--provenance", map]);
  ok(r2.status === 0, `(h) the resumed run exited ${r2.status}, not 0: ${r2.stdout}${r2.stderr}`);
  const run2 = JSON.parse(readFileSync(join(hRunDir, "run.json"), "utf8"));
  ok(doneRun(run2), `(h) the resumed run's stages are not ${DONE} with no stop: ${stagesOf(run2)} ${run2.stopped}`);
  const extractCalls = jsonlOf(join(hRunDir, "extract", "calls.jsonl"));
  const p1Calls = extractCalls.filter((c) => c.stdin.includes('"number": 1,'));
  ok(p1Calls.length === 1, `(h) the resumed run's extract/calls.jsonl does not hold exactly one paragraph-1 call: ${p1Calls.length} of ${extractCalls.length} total`);
  ok(existsSync(join(hRunDir, "sheet.html")) && (readOr(join(hRunDir, "moves", "name_an_act_then_its_cost_3.yaml"), "").length > 0),
    "(h) the resumed run did not write its sheet or paragraph 3's Move");
  const extractCmd = JSON.parse(readFileSync(join(hRunDir, "extract", "command.json"), "utf8"));
  ok(extractCmd.length === cmdBefore.length + 1, `(h) the resumed extract stage did not append one command to command.json: ${cmdBefore.length} then ${extractCmd.length}`);
}

// (p) `--terms` is refused as any unknown flag is: the usage line, exit 1, nothing started.
{
  const pRoot = join(root, "terms");
  const rT = runIn(pRoot, ["--leg", legFixture(pRoot), "--out", join(pRoot, "out"), "--provenance", map, "--terms", join(pRoot, "terms.json")]);
  ok(rT.status === 1 && rT.stderr.startsWith("leg-run: usage:") && !rT.stdout && !existsSync(join(pRoot, "out")) && !existsSync(join(pRoot, "seen.jsonl")),
    `(p) a run given --terms was not refused with the usage line before it started: ${rT.status} ${rT.stdout}${rT.stderr}`);
}

// (i) THE AUDIENCE (kogaki#1396): run.json always names the Audience path the run used and the
// language it declares, and the sheet's Audience cell shows that file with its hash -- the default
// setting when no flag was given, the flag's own path when one was; the Extractor is handed the
// flag's reader. A record naming none shows the cell as unreadable rather than resolving a
// substitute from the live setting.
const { settingValue } = await imp("src/workflow/judge.mjs");
const defaultAudienceText = readFileSync(resolve(repo, String(settingValue({ setting: "brief.audience_file" }))), "utf8");
if (runDir) {
  const run0 = JSON.parse(readFileSync(join(runDir, "run.json"), "utf8"));
  ok(run0.audience === String(settingValue({ setting: "brief.audience_file" })) && run0.language === "English",
    `(i) run.json does not name the default Audience setting and its language English: ${run0.audience} ${run0.language}`);
  ok(readOr(join(runDir, "sheet.html"), "").includes(`sha ${S.contentHash(defaultAudienceText)}`), "(i) the sheet's Audience cell does not show the default Audience file's hash");
}

const iAudience = join(root, "custom-audience.md");
writeFileSync(iAudience, "id: custom-fixture\nlanguage: Japanese\npersona:\n  reader: >-\n    A custom reader, fixed for this test.\nregister: |\n  plain.\n");
const iRoot = join(root, "audience-flag");
const r3 = runIn(iRoot, ["--leg", legFixture(iRoot), "--out", join(iRoot, "out"), "--provenance", map, "--audience", iAudience]);
const iRunDir = runDirOf(r3);
ok(r3.status === 0 && !!iRunDir, `(i) the --audience run exited ${r3.status}, not 0: ${r3.stdout}${r3.stderr}`);
if (iRunDir) {
  const run3 = JSON.parse(readFileSync(join(iRunDir, "run.json"), "utf8"));
  ok(run3.audience === iAudience && run3.language === "Japanese", `(i) run.json does not name the --audience flag's own path and its language Japanese: ${run3.audience} ${run3.language}`);
  const ex = jsonlOf(join(iRunDir, "extract", "calls.jsonl")).filter((c) => c.stdin.includes('"paragraph_you_must_extract"'));
  ok(ex.length === 3 && ex.every((c) => c.stdin.includes("A custom reader, fixed for this test.")), "(i) the Extractor was not handed the --audience file's reader on each paragraph");
  ok(readFileSync(join(iRunDir, "sheet.html"), "utf8").includes(`sha ${S.contentHash(readFileSync(iAudience, "utf8"))}`), "(i) the sheet's Audience cell does not show the --audience file's hash");

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
console.log("ok move-extraction-playground-leg-run");
JS
