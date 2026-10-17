#!/usr/bin/env bash
# check-proof-sheet-extract — the Extractor writes each paragraph's Extraction as a harness
# unit, from a fixed row, with a run record (kogaki#1384, owner decision 2026-10-15).
#
# WHAT THIS COVERS, driven end to end through `node src/proof-sheet/extract.mjs run` over a
# two-paragraph Leg and a FAKE judge binary this member writes (`KOGAKI_JUDGE_CLI`) — never
# the actual `claude` CLI:
#   (a) the run writes one Extraction per paragraph as a `.yaml` record read by the Brief's
#       YAML reader (kogaki#1413): `status` naming the run, `unit: paragraph <N> of 2 in
#       <slug>`, `reader` a map of the five dimensions, `segments` a list of maps, one per
#       sentence, carrying `content` and `does`, and `relation` on every Segment but a first
#       paragraph's Segment 1; `breaks` a list of tests; no Q4 Footing (kogaki#1414); a
#       `description` and no `technique` (kogaki#1412); and the record renders to Markdown
#       for reading.
#   (b) `tools/move_ingest.py`'s own `read_extraction` and `derive_from_extraction` — the
#       readers behind `passage --from-extraction` — admit both files unedited, and refuse
#       a Markdown Extraction by name (`extraction-form`).
#   (c) the run directory holds, per paragraph, the prompt as rendered (the
#       `extraction_unit` row through `judgePrompt`, FORMAT verbatim above the input
#       marker, and a JSON skeleton of the record with the paragraph number filled as a
#       number and `answers` holding exactly q1 to q3), the answer, and the attempt count
#       with every refusal: paragraph 1's first answer omits a `does` clause and its
#       second names its paragraph as a string, each refused naming the field, and the
#       third attempt's prompt carries BOTH refusals, oldest first.
#   (d) every call ran with `--tools ""`, on the shared supervisor.
#   (e) paragraph 2 is handed the reader state paragraph 1 left (its `after` where a row
#       moved, its `before` where not), and its before column carries it.
#   (f) the validator refuses, naming the field: a `before` that is not the carried state,
#       a Segment count other than the sentence count, a `does` clause naming a subject
#       noun, an empty `relation` on Segment 1 where earlier paragraphs exist (rule 5) or
#       on any later Segment, a `breaks` given as keyed fields rather than a list of tests,
#       and an answer for the retired Q4 (kogaki#1414); a record carrying the retired
#       `technique`, and a `description` over 200 characters, naming its length
#       (kogaki#1412); and a record wrong on BOTH `answers` and `segments` at once is
#       refused naming both (kogaki#1395).
#   (g) a block quotation or list announced by a paragraph stays with it (rule 1).
#
# NOT COVERED, stated rather than implied: the call-limit stop and the stall bound are the
# shared supervisor's, held by checks/check-brief-reader-path-job.sh. Whether a live model's
# Extraction is any good is the owner's reading, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const ok = (cond, msg) => { if (!cond) fails.push(msg); };
const repo = resolve(".");
const X = await import(pathToFileURL(join(repo, "src", "proof-sheet", "extract.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "proof-sheet-extract-"));

const P1 = "The installer copies the kit into the consumer's tree. Nobody asked the consumer first.";
const P2 = "So the next run overwrites any edit. The copy is the installer's. The consumer owns nothing there.";
writeFileSync(join(root, "leg-fixture.txt"), `${P1}\n\n${P2}\n`);

// ---- the fake judge ----
const judge = join(root, "fake-judge.mjs");
writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PSX_FIXTURE_DIR;
appendFileSync(dir + "/argv.jsonl", JSON.stringify(process.argv.slice(2)) + "\\n");
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
  const p = input.paragraph_you_must_extract;
  const first = p.number === 1;
  const counterPath = dir + "/attempt-" + p.number;
  const attempt = (existsSync(counterPath) ? Number(readFileSync(counterPath, "utf8")) : 0) + 1;
  writeFileSync(counterPath, String(attempt));
  const carried = input.reader_state_before;
  const dims = ["knowledge", "question", "expectation", "orientation", "trust"];
  const record = {
    version: "1", paragraph: p.number, source: "not given", prior_text: first ? "not assumed — opens on a fact" : "assumed — \\"So\\" takes up the previous paragraph",
    language: "English", subject_nouns: ["installer", "kit"],
    answers: { q1: "Hands the reader one fact and its cost.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act." },
    what_it_does: first ? "Hands the reader a fact and then the cost of it." : "Draws the consequence of the previous act for the reader.",
    reader: dims.map((d, i) => ({ dimension: d, before: carried ? carried[d] : "BEFORE-" + d,
      after: i === 0 ? "AFTER-" + p.number + "-" + d : "unchanged", segment: i === 0 ? String(p.sentences.length) : "" })),
    segments: p.sentences.map((s, i) => ({
      content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does.",
      does: "states one consequence of an act the reader did not ask for.",
      relation: i === 0 ? (first ? "" : "draws the consequence of the act the previous paragraph named") : "widens the step before it" })),
    why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
    breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
    description: "Names an act, then names who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
  };
  if (first && attempt === 1) delete record.segments[0].does;
  if (first && attempt === 2) record.paragraph = String(p.number);
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(record) }) + "\\n");
  process.exit(0);
});
`);
chmodSync(judge, 0o755);

const out = join(root, "out");
const r = spawnSync(process.execPath, ["src/proof-sheet/extract.mjs", "run", "--leg", join(root, "leg-fixture.txt"), "--out", out],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSX_FIXTURE_DIR: root }, timeout: 300000 });
ok(r.status === 0, `(a) the run exited ${r.status}: ${r.stdout}${r.stderr}`);
const files = [join(out, "name_an_act_then_its_cost_1.yaml"), join(out, "name_an_act_then_its_cost_2.yaml")];
const runDir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];
const { parseYaml } = await import(pathToFileURL(join(repo, "src", "yaml.mjs")).href);
const recordOf = (f) => { try { return parseYaml(readFileSync(f, "utf8"), f); } catch (e) { return { parse_error: e.message }; } };

// (a) the record layout: one YAML record per paragraph (kogaki#1413), its
// Segments a list of maps, its reader rows a map keyed by dimension, its
// tests a list; rendered to Markdown only for reading.
for (const [i, f] of files.entries()) {
  if (!existsSync(f)) { fails.push(`(a) no Extraction written at ${f}`); continue; }
  const t = readFileSync(f, "utf8");
  ok(t.startsWith("# Extraction: "), `(a) ${f} does not open with its \`# Extraction:\` header comment`);
  const rec = recordOf(f);
  ok(!rec.parse_error, `(a) ${f} is not read by the Brief's YAML reader: ${rec.parse_error}`);
  ok(typeof rec.status === "string" && rec.status.startsWith(`${X.STATUS_LINE.slice("status: ".length)} — written by the Extractor run extractor-run-`),
    `(a) ${f} carries no status naming the run`);
  ok(rec.unit === `paragraph ${i + 1} of 2 in leg-fixture`, `(a) ${f} carries no \`unit: paragraph ${i + 1} of 2 in leg-fixture\``);
  for (const k of ["name", "passage", "answers", "what_it_does", "reader", "segments", "why_this_order", "presupposes", "breaks", "description"]) {
    ok(rec[k] !== undefined, `(a) ${f} carries no \`${k}\``);
  }
  ok(rec.reader && ["knowledge", "question", "expectation", "orientation", "trust"].every((d) => rec.reader[d] && typeof rec.reader[d].before === "string"),
    `(a) ${f}'s reader is not a map of the five dimensions, each with its before`);
  const segs = Array.isArray(rec.segments) ? rec.segments : [];
  const want = i === 0 ? 2 : 3;
  ok(segs.length === want, `(a) ${f} carries ${segs.length} Segments for ${want} sentences`);
  ok(segs.every((s) => /^CONTENT-\d-\d names what the copy does\.$/.test(s.content) && /\S/.test(s.does || "")),
    `(a) a Segment of ${f} lacks the content clause or the does clause`);
  ok(segs.every((s, j) => (i === 0 && j === 0) ? s.relation === undefined : /\S/.test(s.relation || "")),
    `(a) a Segment of ${f} carries a relation where nothing precedes it, or lacks one where something does`);
  ok(Array.isArray(rec.breaks) && rec.breaks.length === 3 && rec.breaks.every((b) => typeof b === "string" && !/^(remove|reorder|extend):/.test(b)),
    `(a) ${f}'s breaks is not a list of three prose tests`);
  ok(!/Q4|Footing|^functions:/m.test(t) && !(rec.answers && rec.answers.q4), `(a) ${f} carries a Q4 Footing answer or a functions line`);
  ok(rec.technique === undefined && !/^technique:/m.test(t), `(a) ${f} carries the retired \`technique\` (kogaki#1412)`);
  const md = X.extractionMarkdown(rec);
  ok(["## Passage", "## Answers", "## 2. Reader before and after", "## 3. The order inside the Passage", "## 5. Where it would break"].every((h) => md.includes(`\n${h}\n`))
    && md.includes(`does: ${segs[0] && segs[0].does}`), `(a) ${f}'s record does not render to Markdown for reading`);
}

// (b) the ingest reads both unedited, through its YAML reader; a Markdown
// Extraction is the retired form and refused by name (kogaki#1413).
const legacy = join(root, "legacy.md");
writeFileSync(legacy, "# Extraction: legacy\n\n## Passage\n\nA sentence.\n");
const py = spawnSync("python3", ["-I", "-c", `
import sys
sys.path.insert(0, "tools")
import move_ingest
bad = []
for f in sys.argv[2:]:
    p = move_ingest.derive_from_extraction(move_ingest.read_extraction(f)[1])
    if not p.admitted:
        bad.append("%s: %s" % (f, p.refusal))
try:
    move_ingest.read_extraction(sys.argv[1])
    bad.append("a Markdown Extraction was read")
except move_ingest.Refusal as e:
    if e.condition != "extraction-form":
        bad.append("a Markdown Extraction was refused on %s, not extraction-form" % e.condition)
print("\\n".join(bad))
sys.exit(1 if bad else 0)
`, legacy, ...files], { encoding: "utf8", cwd: repo });
ok(py.status === 0, `(b) the ingest refused an Extraction, or read a Markdown one: ${py.stdout}${py.stderr}`);

// (c) the run directory
if (!runDir) fails.push("(c) the run printed no run directory");
else {
  const p1 = join(runDir, "p1");
  const prompt = existsSync(join(p1, "prompt.md")) ? readFileSync(join(p1, "prompt.md"), "utf8") : "";
  ok(prompt.includes("You are the judge at the Extractor workflow's `extraction_unit` judgment point."), "(c) p1/prompt.md is not the extraction_unit row rendered by judgePrompt");
  ok(prompt.includes("# Extraction: the interaction contract") && prompt.indexOf("# Extraction: the interaction contract") < prompt.indexOf("----- INPUT (JSON) -----"),
    "(c) p1/prompt.md does not carry passages/FORMAT.md verbatim above the input marker");
  // the rendered record skeleton (kogaki#1395): the paragraph number as a number, and the
  // three `answers` keys, both ahead of the input marker -- Q4 Footing is retired (kogaki#1414).
  const beforeInput = prompt.slice(0, prompt.indexOf("----- INPUT (JSON) -----"));
  ok(beforeInput.includes('"paragraph": 1,'), "(c) p1/prompt.md's skeleton does not fill the paragraph number as a number");
  ok(["q1", "q2", "q3"].every((k) => beforeInput.includes(`"${k}":`)) && !beforeInput.includes('"q4":'), "(c) p1/prompt.md's skeleton does not carry exactly the three answers keys");
  ok(existsSync(join(p1, "answer.json")), "(c) p1/answer.json was not written");
  ok(existsSync(join(p1, "reader-path-unit-p1.stdout")), "(c) the supervisor's raw answers for p1 are not in the run directory");
  const a1 = existsSync(join(p1, "attempts.json")) ? JSON.parse(readFileSync(join(p1, "attempts.json"), "utf8")) : {};
  ok(a1.attempts === 3, `(c) p1/attempts.json records ${a1.attempts} attempt(s), not 3`);
  ok(Array.isArray(a1.refusals) && a1.refusals.length === 2 && /Segment 1 carries no `does`/.test(a1.refusals[0])
    && /names paragraph "1", not 1/.test(a1.refusals[1]),
    `(c) p1/attempts.json does not record both refusals in order: ${JSON.stringify(a1.refusals)}`);
  const prompts = readFileSync(join(root, "prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  ok(prompts.length === 4, `(c) the fake judge was called ${prompts.length} time(s), not 4`);
  ok(prompts[1] && prompts[1].includes(a1.refusals[0]) && !prompts[1].includes(a1.refusals[1]),
    "(c) the second attempt's prompt does not carry only the first attempt's refusal");
  ok(prompts[2] && prompts[2].includes(a1.refusals[0]) && prompts[2].includes(a1.refusals[1])
    && prompts[2].indexOf(a1.refusals[0]) < prompts[2].indexOf(a1.refusals[1]),
    "(c) the third attempt's prompt does not carry BOTH prior refusals, oldest first");
  const a2 = existsSync(join(runDir, "p2", "attempts.json")) ? JSON.parse(readFileSync(join(runDir, "p2", "attempts.json"), "utf8")) : {};
  ok(a2.attempts === 1, `(c) p2/attempts.json records ${a2.attempts} attempt(s), not 1`);

  // (e) the carried before column
  const in2 = prompts[3] ? JSON.parse(prompts[3].slice(prompts[3].indexOf("----- INPUT (JSON) -----") + 24)) : {};
  ok(in2.reader_state_before && in2.reader_state_before.knowledge === "AFTER-1-knowledge" && in2.reader_state_before.trust === "BEFORE-trust",
    `(e) paragraph 2 was not handed paragraph 1's carried state: ${JSON.stringify(in2.reader_state_before)}`);
  const k2 = existsSync(files[1]) ? ((recordOf(files[1]).reader || {}).knowledge || {}) : {};
  ok(k2.before === "AFTER-1-knowledge" && k2.after === "AFTER-2-knowledge" && String(k2.segment) === "3",
    `(e) paragraph 2's knowledge row does not carry paragraph 1's after into its before: ${JSON.stringify(k2)}`);
}

// (d) --tools ""
const argvs = existsSync(join(root, "argv.jsonl")) ? readFileSync(join(root, "argv.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
ok(argvs.length === 4 && argvs.every((a) => { const i = a.indexOf("--tools"); return i >= 0 && a[i + 1] === ""; }),
  `(d) a call ran without \`--tools ""\`: ${JSON.stringify(argvs)}`);

// (f) the validator, directly
const persona = { reader: "a developer", prior_knowledge: "none" };
const input = X.extractionUnitInput({ passage: "s", paragraphs: [P1, P2], index: 1,
  before: { knowledge: "K", question: "Q", expectation: "E", orientation: "O", trust: "T" }, namesTaken: [], persona });
const good = () => ({ version: "1", paragraph: 2, source: "not given", prior_text: "assumed", language: "English", subject_nouns: ["installer"],
  answers: { q1: "a", q2: "b", q3: "c" }, what_it_does: "x by taking up the last point",
  reader: ["knowledge", "question", "expectation", "orientation", "trust"].map((d) => ({ dimension: d, before: d[0].toUpperCase(),
    after: d === "knowledge" ? "moved" : "unchanged", segment: d === "knowledge" ? "2" : "" })),
  segments: [1, 2, 3].map(() => ({ content: "c", does: "g", relation: "r" })),
  why_this_order: "w", presupposes: "p", breaks: ["a change — a loss"], description: "d", name: "n_m", notes: "" });
ok(!X.validateExtractionUnit(good(), input).error, `(f) the validator refused a good record: ${X.validateExtractionUnit(good(), input).error}`);
const m1 = good(); m1.reader[1].before = "drafted";
ok(/the `question` row's `before`.*carried, not drafted/.test(X.validateExtractionUnit(m1, input).error || ""), "(f) a before that is not the carried state was not refused naming the row");
const m2 = good(); m2.segments.pop();
ok(/one Segment per sentence/.test(X.validateExtractionUnit(m2, input).error || ""), "(f) a Segment count other than the sentence count was not refused");
const m3 = good(); m3.segments[1].does = "the installer copies";
ok(/Segment 2: the `does` clause names "installer"/.test(X.validateExtractionUnit(m3, input).error || ""), "(f) a does clause naming a subject noun was not refused");

const m4 = good(); m4.segments[0].relation = "";
ok(/Segment 1: the `relation` clause is empty/.test(X.validateExtractionUnit(m4, input).error || ""), "(f) an empty Segment 1 relation with earlier paragraphs was not refused (rule 5)");
const m4b = good(); m4b.segments[2].relation = "";
ok(/Segment 3: the `relation` clause is empty/.test(X.validateExtractionUnit(m4b, input).error || ""), "(f) an empty relation on a later Segment was not refused");
const m4c = good(); m4c.breaks = { remove: "r", reorder: "o", extend: "e" };
ok(/`breaks` is not a list of prose tests/.test(X.validateExtractionUnit(m4c, input).error || ""), "(f) keyed breaks were not refused as not a list of prose tests");
const m4d = good(); m4d.answers.q4 = "d";
ok(/`answers` carries `q4`/.test(X.validateExtractionUnit(m4d, input).error || ""), "(f) an answer for the retired Q4 was not refused");

// kogaki#1412: `description` replaces the retired `technique` -- a record still carrying
// `technique` is refused as an undeclared key, and a description over 200 characters is
// refused naming its length; one of exactly 200 passes.
const m4e = good(); m4e.technique = "t";
ok(/carries `technique`, which it does not declare/.test(X.validateExtractionUnit(m4e, input).error || ""), "(f) a record carrying the retired technique was not refused by name");
const m4f = good(); m4f.description = "x".repeat(201);
ok(/`description` is 201 characters — at most 200/.test(X.validateExtractionUnit(m4f, input).error || ""), "(f) a 201-character description was not refused naming its length");
const m4g = good(); m4g.description = "x".repeat(200);
ok(!X.validateExtractionUnit(m4g, input).error, `(f) a 200-character description was refused: ${X.validateExtractionUnit(m4g, input).error}`);

// a record wrong on BOTH `answers` and `segments` at once is refused naming both (kogaki#1395)
const m5 = good(); delete m5.answers.q3; m5.segments.pop();
const e5 = X.validateExtractionUnit(m5, input).error || "";
ok(/answers/.test(e5) && /one Segment per sentence/.test(e5), `(f) a record broken on two fields at once did not name both: ${e5}`);

// (g) announced blocks stay with their paragraph
const ps = X.legParagraphs("One says:\n\n> a quoted line.\n\nThen a list:\n\n- first\n- second\n\nA new paragraph.");
ok(ps.length === 3 && ps[0].endsWith("> a quoted line.") && ps[1].endsWith("- second"), `(g) an announced block was cut into its own paragraph: ${JSON.stringify(ps)}`);

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-extract");
JS
