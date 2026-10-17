#!/usr/bin/env bash
# check-proof-sheet-extract — the Extractor writes each paragraph's Extraction as a harness
# unit, from a fixed row, with a run record (kogaki#1384, owner decision 2026-10-15).
#
# WHAT THIS COVERS, driven end to end through `node src/proof-sheet/extract.mjs run` over a
# two-paragraph Leg and a FAKE judge binary this member writes (`KOGAKI_JUDGE_CLI`) — never
# the actual `claude` CLI:
#   (a) the run writes one Extraction per paragraph, in FORMAT's paragraph-unit layout: the
#       status line naming the run, `unit: paragraph <N> of 2 in <slug>`, and in section 3
#       one entry per sentence carrying the content clause and `— does:`, and `— relation:`
#       on every entry but a first paragraph's Segment 1; section 5 one `- ` line per test;
#       and no Q4 Footing (kogaki#1414).
#   (b) `tools/move_ingest.py`'s own `derive_from_extraction` — the reader behind
#       `passage --from-extraction` — admits both files unedited.
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
#       and an answer for the retired Q4 (kogaki#1414); and a record wrong on BOTH
#       `answers` and `segments` at once is refused naming both (kogaki#1395).
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
    technique: "Name an act, then name who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
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
const files = [join(out, "name_an_act_then_its_cost_1.md"), join(out, "name_an_act_then_its_cost_2.md")];
const runDir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];

// (a) the file layout
for (const [i, f] of files.entries()) {
  if (!existsSync(f)) { fails.push(`(a) no Extraction written at ${f}`); continue; }
  const t = readFileSync(f, "utf8");
  ok(t.startsWith(`${X.STATUS_LINE} — written by the Extractor run extractor-run-`), `(a) ${f} does not open with the status line naming the run`);
  ok(t.includes(`\nunit: paragraph ${i + 1} of 2 in leg-fixture\n`), `(a) ${f} carries no \`unit: paragraph ${i + 1} of 2 in leg-fixture\` line`);
  for (const h of ["## Passage", "## Answers", "## 1. What the Passage does", "## 2. Reader before and after", "## 3. The order inside the Passage",
    "## 4. What the Passage presupposes", "## 5. Where it would break", "## 6. The technique, subject-free", "## 7. Candidate name", "## 8. Notes"]) {
    ok(t.includes(`\n${h}\n`), `(a) ${f} carries no \`${h}\` heading`);
  }
  const entries = t.split("\n").filter((l) => /^\d+\. "/.test(l));
  const want = i === 0 ? 2 : 3;
  ok(entries.length === want, `(a) ${f} carries ${entries.length} section 3 entries for ${want} sentences`);
  ok(entries.every((l) => / — CONTENT-\d-\d names what the copy does\. — does: \S/.test(l)), `(a) a section 3 entry of ${f} lacks the content clause or the does clause`);
  ok(entries.every((l, j) => (i === 0 && j === 0) ? !/ — relation:/.test(l) : / — relation: \S/.test(l)),
    `(a) a section 3 entry of ${f} carries a relation where nothing precedes it, or lacks one where something does`);
  const s5 = t.slice(t.indexOf("## 5. Where it would break"), t.indexOf("## 6."));
  ok((s5.match(/^- \S/gm) || []).length === 3 && !/^(remove|reorder|extend):/m.test(s5), `(a) ${f}'s section 5 is not one \`- \` line per test`);
  ok(!/Q4|Footing|^functions:/m.test(t), `(a) ${f} carries a Q4 Footing answer or a functions line`);
}

// (b) the ingest reads both unedited
const py = spawnSync("python3", ["-I", "-c", `
import sys
sys.path.insert(0, "tools")
import move_ingest
bad = []
for f in sys.argv[1:]:
    p = move_ingest.derive_from_extraction(open(f, encoding="utf-8").read())
    if not p.admitted:
        bad.append("%s: %s" % (f, p.refusal))
print("\\n".join(bad))
sys.exit(1 if bad else 0)
`, ...files], { encoding: "utf8", cwd: repo });
ok(py.status === 0, `(b) the ingest refused an Extraction: ${py.stdout}${py.stderr}`);

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
  const t2 = existsSync(files[1]) ? readFileSync(files[1], "utf8") : "";
  ok(/^\| knowledge\s+\| AFTER-1-knowledge \| AFTER-2-knowledge \| 3 \|$/m.test(t2), "(e) paragraph 2's knowledge row does not carry paragraph 1's after into its before column");
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
  why_this_order: "w", presupposes: "p", breaks: ["a change — a loss"], technique: "t", name: "n_m", notes: "" });
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
