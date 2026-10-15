#!/usr/bin/env bash
# check-proof-sheet-extract — the Extractor writes each paragraph's Extraction as a harness
# unit, from a fixed row, with a run record (kogaki#1384, owner decision 2026-10-15).
#
# WHAT THIS COVERS, driven end to end through `node src/proof-sheet/extract.mjs run` over a
# two-paragraph Leg and a FAKE judge binary this member writes (`KOGAKI_JUDGE_CLI`) — never
# the actual `claude` CLI:
#   (a) the run writes one Extraction per paragraph, in FORMAT's paragraph-unit layout: the
#       status line naming the run, `unit: paragraph <N> of 2 in <slug>`, and in section 3
#       one entry per sentence carrying both the content clause and `— generalized:`.
#   (b) `tools/move_ingest.py`'s own `derive_from_extraction` — the reader behind
#       `passage --from-extraction` — admits both files unedited.
#   (c) the run directory holds, per paragraph, the prompt as rendered (the
#       `extraction_unit` row through `judgePrompt`, FORMAT verbatim above the input
#       marker, and a JSON skeleton of the record with the paragraph number filled as a
#       number and `answers` holding exactly q1 to q4), the answer, and the attempt count
#       with every refusal: paragraph 1's first answer omits a `generalized` clause and its
#       second names its paragraph as a string, each refused naming the field, and the
#       third attempt's prompt carries BOTH refusals, oldest first.
#   (d) every call ran with `--tools ""`, on the shared supervisor.
#   (e) paragraph 2 is handed the reader state paragraph 1 left (its `after` where a row
#       moved, its `before` where not), and its before column carries it.
#   (f) the validator refuses, naming the field: a `before` that is not the carried state,
#       a Segment count other than the sentence count, a `generalized` clause naming a
#       subject noun, and a section 1 not naming Segment 1's relation (rule 5); and a
#       record wrong on BOTH `answers` and `segments` at once is refused naming both
#       (kogaki#1395).
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
  if (first && attempt === 1) delete record.segments[0].generalized;
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
  ok(entries.every((l) => / — CONTENT-\d-\d names what the copy does\. — generalized: \S/.test(l)), `(a) a section 3 entry of ${f} lacks the content clause or the generalized clause`);
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
  // four `answers` keys, both ahead of the input marker.
  const beforeInput = prompt.slice(0, prompt.indexOf("----- INPUT (JSON) -----"));
  ok(beforeInput.includes('"paragraph": 1,'), "(c) p1/prompt.md's skeleton does not fill the paragraph number as a number");
  ok(["q1", "q2", "q3", "q4"].every((k) => beforeInput.includes(`"${k}":`)), "(c) p1/prompt.md's skeleton does not carry all four answers keys");
  ok(existsSync(join(p1, "answer.json")), "(c) p1/answer.json was not written");
  ok(existsSync(join(p1, "reader-path-unit-p1.stdout")), "(c) the supervisor's raw answers for p1 are not in the run directory");
  const a1 = existsSync(join(p1, "attempts.json")) ? JSON.parse(readFileSync(join(p1, "attempts.json"), "utf8")) : {};
  ok(a1.attempts === 3, `(c) p1/attempts.json records ${a1.attempts} attempt(s), not 3`);
  ok(Array.isArray(a1.refusals) && a1.refusals.length === 2 && /Segment 1 carries no `generalized`/.test(a1.refusals[0])
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
  answers: { q1: "a", q2: "b", q3: "c", q4: "d" }, what_it_does: "x by elaboration",
  reader: ["knowledge", "question", "expectation", "orientation", "trust"].map((d) => ({ dimension: d, before: d[0].toUpperCase(),
    after: d === "knowledge" ? "moved" : "unchanged", segment: d === "knowledge" ? "2" : "" })),
  segments: [1, 2, 3].map(() => ({ function: "advances", relation: "elaboration", content: "c", generalized: "g" })),
  why_this_order: "w", presupposes: "p", breaks: { remove: "r", reorder: "o", extend: "e" }, technique: "t", name: "n_m", notes: "" });
ok(!X.validateExtractionUnit(good(), input).error, `(f) the validator refused a good record: ${X.validateExtractionUnit(good(), input).error}`);
const m1 = good(); m1.reader[1].before = "drafted";
ok(/the `question` row's `before`.*carried, not drafted/.test(X.validateExtractionUnit(m1, input).error || ""), "(f) a before that is not the carried state was not refused naming the row");
const m2 = good(); m2.segments.pop();
ok(/one Segment per sentence/.test(X.validateExtractionUnit(m2, input).error || ""), "(f) a Segment count other than the sentence count was not refused");
const m3 = good(); m3.segments[1].generalized = "the installer copies";
ok(/Segment 2: the `generalized` clause names "installer"/.test(X.validateExtractionUnit(m3, input).error || ""), "(f) a generalized clause naming a subject noun was not refused");

const m4 = good(); m4.what_it_does = "x";
ok(/`what_it_does` does not name Segment 1's relation/.test(X.validateExtractionUnit(m4, input).error || ""), "(f) a section 1 not naming Segment 1's relation was not refused");

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
