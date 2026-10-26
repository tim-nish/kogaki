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
#       sentence, carrying `content` and `operation`, `relation` on every Segment but
#       Segment 1 (kogaki#1510), and `manner` only where the answer filled one, paragraph 2's
#       Segment 2 here; `breaks` a list of tests; no Q4 Footing (kogaki#1414); a
#       `description` and no `technique` (kogaki#1412); and the record renders to Markdown
#       for reading.
#   (b) `tools/move_ingest.py`'s own `read_extraction` and `derive_from_extraction` — the
#       readers behind `passage --from-extraction` — admit both files unedited, and refuse
#       a Markdown Extraction by name (`extraction-form`).
#   (b2) `run_from_extraction`, the call the Proof Sheet's ingest stage makes, validates
#       through the Adapter's own validator (kogaki#1418): the Moves it admits from those
#       files are read by `moveContract` without refusal, and an over-long `description`
#       is refused in the Adapter's words with nothing written; the ingest carries no
#       type check of its own and refuses every record the Adapter refuses (a retired
#       `technique`, a joined-line state, prose `breaks`, no `segments`, no `description`,
#       an unknown figure kind, a field ROLES.json maps to no role) in the sentence
#       src/move-validate.mjs prints; and the
#       Brief's compose and Move-fit judge inputs read the admitted Moves, each bound to a
#       Leg, without refusal.
#   (b3) an entry of `segments` is read as a Segment or refused, never dropped (kogaki#1416):
#       an admitted Move carries exactly as many Segments as the Extraction lists; an entry
#       carrying a label key, one with an empty `operation`, one after the first with no
#       `relation`, and a Segment 1 carrying one, are each refused naming the Segment, the
#       last three in the Adapter's words; the Move admitted from paragraph 2 carries its
#       `manner` on Segment 2 and on no other (kogaki#1510);
#       a `reader` row naming a Segment the list does not hold is refused naming it; and
#       `tools/move_ingest.py` carries no label set.
#   (c) the run directory holds, per paragraph, the prompt as rendered (the
#       `extraction_unit` row through `judgePrompt`, FORMAT verbatim above the input
#       marker, and a JSON skeleton of the record with the paragraph number filled as a
#       number and `answers` holding exactly q1 to q3), the answer, and the attempt count
#       with every refusal: paragraph 1's first answer omits an `operation` clause and its
#       second names its paragraph as a string, each refused naming the field, and the
#       third attempt's prompt carries BOTH refusals, oldest first; paragraph 2's first
#       answer writes a `subject_nouns` entry into a reader `after` clause and is refused
#       naming the row (rule 7, kogaki#1440); the prompt carries rule 7's three
#       sentences; and it carries rule 9's read-aloud test, which excludes the page's
#       layout from `operation`, `content`, `relation`, `manner` and reader states
#       (kogaki#1478, kogaki#1510).
#   (d) every call ran with `--tools ""`, on the shared supervisor, the content-bound calls among them.
#   (e) paragraph 2 is handed the reader state paragraph 1 left (its `after` where a row
#       moved, its `before` where not), and its before column carries it.
#   (f) the validator refuses, naming the field: a `before` that is not the carried state,
#       a Segment count other than the sentence count, an `operation` clause naming a
#       subject noun, a `relation` on Segment 1 of a paragraph with earlier text (rule 5,
#       kogaki#1510), an empty `relation` on any later Segment, a `manner` restating the
#       `operation` or naming a subject noun (kogaki#1510), a subject noun in a `breaks` test or a
#       reader state, a word outside the Latin script in a `relation` or a `breaks` test, while a
#       subject noun in a `content` clause alone validates (kogaki#1519), a `breaks` given as keyed fields rather than a list of tests,
#       and an answer for the retired Q4 (kogaki#1414); a record carrying the retired
#       `technique`, and a `description` over 200 characters, naming its length
#       (kogaki#1412); a `manner` filled on one Segment and empty on the rest validates; and
#       a record wrong on BOTH `answers` and `segments` at once is
#       refused naming both (kogaki#1395); a `content` clause opening on a method verb is
#       refused naming the paragraph, the Segment and the verb, for the specimen `explains`
#       and for a second listed verb, while the clause opening on what the sentence says
#       validates, and FORMAT's rule 7 carries the sentence verbatim (kogaki#1554); a reader
#       `after` or a `breaks` test instructing wording ("must open with", "must stay in one
#       sentence") is refused naming the field and the phrase, while a `breaks` test whose
#       change is stated in one sentence, and a `manner` carrying the instruction, validate
#       (kogaki#1604).
#   (g) a block quotation or list announced by a paragraph stays with it (rule 1).
#   (h) the obligation, derived from the Move's own Segments (rule 8, kogaki#1590): a run whose
#       paragraph's Segment 2 operation counts two items and whose Segment 3 names them writes
#       `obligation_triggers.counts.fired: true` and two items; a paragraph whose counting
#       operation names no number writes one collective item, and on its record two ordinal
#       items, or an item carrying any of two, three, both, pair, first or second, are refused
#       by name (kogaki#1602); a paragraph whose operations
#       define, assert without grounds and give a label writes `fired: false` with a one-line
#       `why` and no `obligation` key; the obligation call's rendered prompt carries no
#       `passage`, `earlier_paragraphs`, `reader_state_before` or `subject_nouns` key, and its
#       input is the Segments' `operation` and `relation` alone.
#   (i) the obligation call's answer (kogaki#1590): on a record whose operation fixes a pair two
#       ordinal items validate and a collective item is refused by name (kogaki#1602);
#       `obligation` beside `fired: false`, a `why`
#       over twelve words, an item carrying each of ` since `, ` because `, ` so that `, ` must `
#       and ` which `, an item over twelve words, a retired trigger and a `trigger` key of the old
#       shape are each refused by name; `obligation` without `obligation_triggers` is refused on
#       the record and `obligation_trigger` is an undeclared key; the item validators of
#       kogaki#1557, #1568 and #1576 stay on the record, and in (b2) the ingest carries the field
#       to the Move record unchanged.
#   (k) the counting Segment (kogaki#1613): a Move whose counting Segment is followed by a Segment
#       whose `relation` unpacks the counted items validates `fired: false`, and `fired: true`
#       there with a `why` naming no later Segment is refused by name; a Move whose counting
#       Segment is last validates `fired: true`; a verdict without `segment`, or naming a Segment
#       the Move lacks, is refused by name; the record written from the answer carries `segment`.
#   (j) the retired keys (kogaki#1583): a record carrying `discharges` or `obligation_content` is
#       refused as an undeclared key, the extraction call's answer carrying `obligation` or
#       `obligation_triggers` is refused, and FORMAT carries rule 8 and the retired rule 10 verbatim.
#   (k) the content clause, judged source-bound (kogaki#1614), over the discriminating pair of the
#       2026-10-26 run: the clause "two of the countries sit where the dilemma arises readily, while
#       the strongest one sits where it does not" is refused naming "the strongest one", the refusal
#       reaches the Extractor's next attempt verbatim beside the refused answer, and the clause naming
#       Russia, China and the United States passes and is written with `content_bound`, one verdict
#       per Segment; `p1/attempts.json` names both calls' attempts; the verdict call's input is each
#       sentence beside its clause with `subject_nouns`; a clause refused on every attempt stops the run
#       at the Extractor's own budget, writing nothing; and the verdict answer's shape -- one per
#       Segment, a `why` of at most twelve words, an unbound verdict quoting a phrase of its clause --
#       is refused by name, as is the extraction call's answer carrying `content_bound`; and the sheet's
#       Segments table shows an unbound verdict's reason beside its content cell, and nothing for a bound one.
#
# NOT COVERED, stated rather than implied: the call-limit stop and the stall bound are the
# shared supervisor's, held by checks/check-brief-reader-path-job.sh. Whether a live model's
# Extraction is any good is the owner's reading, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync } from "node:fs";
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
  const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
  // The content-bound call (kogaki#1614): every clause here is bound.
  if (input.subject_nouns && !input.paragraph_you_must_extract) {
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ verdicts: input.segments.map(() => ({ bound: true, why: "Every reference resolves to the sentence." })) }) }) + "\\n");
    process.exit(0);
  }
  // The obligation call (kogaki#1590): its first answer carries items beside \`counts\` not
  // fired and is refused; every later one is \`counts\` not fired.
  if (!input.paragraph_you_must_extract) {
    const seen = existsSync(dir + "/obligation-calls") ? Number(readFileSync(dir + "/obligation-calls", "utf8")) : 0;
    writeFileSync(dir + "/obligation-calls", String(seen + 1));
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ triggers: { counts: { fired: false, why: "No operation counts items.", segment: 1 } }, ...(seen ? {} : { obligation: ["an item"] }) }) }) + "\\n");
    process.exit(0);
  }
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify(prompt) + "\\n");
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
      operation: "states one consequence of an act the reader did not ask for.",
      relation: i === 0 ? "" : "widens the step before it",
      manner: !first && i === 1 ? "a brief direct statement, given with no elaboration." : "" })),
    why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
    breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
    description: "Names an act, then names who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
  };
  if (first && attempt === 1) delete record.segments[0].operation;
  if (first && attempt === 2) record.paragraph = String(p.number);
  if (!first && attempt === 1) record.reader[0].after = "knows the installer owns the copy";
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
  ok(segs.every((s) => /^CONTENT-\d-\d names what the copy does\.$/.test(s.content) && /\S/.test(s.operation || "") && s.does === undefined),
    `(a) a Segment of ${f} lacks the content clause or the operation clause, or carries a \`does\``);
  ok(segs.every((s, j) => j === 0 ? s.relation === undefined : /\S/.test(s.relation || "")),
    `(a) a Segment of ${f} carries a relation on Segment 1, or lacks one after it`);
  ok(segs.every((s, j) => (i === 1 && j === 1) ? s.manner === "a brief direct statement, given with no elaboration." : s.manner === undefined),
    `(a) ${f} does not carry a manner exactly where the answer filled one: ${JSON.stringify(segs.map((s) => s.manner))}`);
  ok(Array.isArray(rec.breaks) && rec.breaks.length === 3 && rec.breaks.every((b) => typeof b === "string" && !/^(remove|reorder|extend):/.test(b)),
    `(a) ${f}'s breaks is not a list of three prose tests`);
  ok(!/Q4|Footing|^functions:/m.test(t) && !(rec.answers && rec.answers.q4), `(a) ${f} carries a Q4 Footing answer or a functions line`);
  ok(rec.technique === undefined && !/^technique:/m.test(t), `(a) ${f} carries the retired \`technique\` (kogaki#1412)`);
  const md = X.extractionMarkdown(rec);
  ok(["## Passage", "## Answers", "## 2. Reader before and after", "## 3. The order inside the Passage", "## 5. Where it would break"].every((h) => md.includes(`\n${h}\n`))
    && md.includes(`operation: ${segs[0] && segs[0].operation}`)
    && (i === 0 || md.includes("manner: a brief direct statement, given with no elaboration.")), `(a) ${f}'s record does not render to Markdown for reading`);
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

// (b2) THE PROOF SHEET'S INGEST STAGE IS THE SAME GATE (kogaki#1418). `run_from_extraction`
// -- the call `src/proof-sheet/leg-run.mjs`'s ingest stage makes -- validates each candidate
// through the Adapter's own validator (src/move-validate.mjs): the Moves it admits from
// these Extractions are read by `moveContract`, the production Adapter, without refusal,
// and an Extraction whose `description` runs past the bound is refused in the Adapter's
// own words, nothing written.
const gate = spawnSync("python3", ["-I", "-c", `
import json, os, shutil, subprocess, sys, tempfile
sys.path.insert(0, "tools")
import move_ingest as m
bad = []
files = sys.argv[1:]
tmp = tempfile.mkdtemp()
moves = os.path.join(tmp, "moves")
os.makedirs(moves)
shutil.copy(os.path.join("moves", "ROLES.json"), moves)
r = m.run_from_extraction(files, moves, os.path.join(tmp, "out"), select="accept")
for w in r["written"] or []:
    move_id = os.path.basename(w)[:-len(".yaml")]
    read = subprocess.run(["node", "--input-type=module", "-e",
        "const { moveContract } = await import(process.argv[1]);"
        "process.stdout.write(JSON.stringify(moveContract(process.argv[2], process.argv[3])));",
        "file://" + os.path.abspath(os.path.join("src", "compose.mjs")), move_id, moves],
        capture_output=True, text=True)
    c = json.loads(read.stdout or "{}")
    if read.returncode != 0 or c.get("error") or not c.get("segments"):
        bad.append("the Adapter did not read the admitted Move %s: %s%s" % (move_id, read.stdout, read.stderr))
if len(r["written"] or []) != len(files):
    bad.append("run_from_extraction wrote %r for %d Extraction(s)" % (r["written"], len(files)))
record = m.read_extraction(files[0])[1]
record["description"] = "x" * 201
long_path = os.path.join(tmp, "long.yaml")
with open(long_path, "w") as h:
    h.write(m.yaml_write(record))
moves2 = os.path.join(tmp, "moves2")
os.makedirs(moves2)
try:
    m.run_from_extraction([long_path], moves2, os.path.join(tmp, "out2"), select="accept")
    bad.append("an over-long description was admitted by the Proof Sheet's ingest stage")
except m.Refusal as e:
    if "condition adapter" not in str(e) or "is 201 characters" not in str(e) or "at most 200" not in str(e):
        bad.append("the over-long description was not refused in the Adapter's words: %s" % e)
if [n for n in os.listdir(moves2) if n.endswith(".yaml")]:
    bad.append("a refused Extraction left a Move in the library")
# THE OBLIGATION IS CARRIED THROUGH UNCHANGED (kogaki#1557): an Extraction carrying the field
# yields a Move record carrying it, read back by the Adapter; one without it yields none. No
# item shares a word with any \`after\` line, and the Move is admitted (kogaki#1576).
obligation = ["leverage", "margin"]
for w in r["written"] or []:
    if "obligation" in m.read_extraction(w)[1]:
        bad.append("a Move admitted from an Extraction without the field carries obligation: %s" % w)
record = m.read_extraction(files[1])[1]
after_words = " ".join(str(row.get("after", "")) for row in record["reader"].values()).lower()
if any(item in after_words for item in obligation):
    bad.append("the fixture's \`after\` lines name an obligation item, so the unshared-word case is vacuous")
record["obligation"] = obligation
obl_path = os.path.join(tmp, "obligation.yaml")
with open(obl_path, "w") as h:
    h.write(m.yaml_write(record))
moves3 = os.path.join(tmp, "moves3")
os.makedirs(moves3)
shutil.copy(os.path.join("moves", "ROLES.json"), moves3)
r3 = m.run_from_extraction([obl_path], moves3, os.path.join(tmp, "out3"), select="accept")
for w in r3["written"] or []:
    if m.read_extraction(w)[1].get("obligation") != obligation:
        bad.append("the Move record does not carry the Extraction's obligation unchanged: %r" % m.read_extraction(w)[1].get("obligation"))
    read = subprocess.run(["node", "--input-type=module", "-e",
        "const { moveContract } = await import(process.argv[1]);"
        "process.stdout.write(JSON.stringify(moveContract(process.argv[2], process.argv[3])));",
        "file://" + os.path.abspath(os.path.join("src", "compose.mjs")), os.path.basename(w)[:-len(".yaml")], moves3],
        capture_output=True, text=True)
    if json.loads(read.stdout or "{}").get("obligation") != obligation:
        bad.append("the Adapter does not read the admitted Move's obligation: %s%s" % (read.stdout, read.stderr))
if len(r3["written"] or []) != 1:
    bad.append("run_from_extraction wrote %r for the Extraction carrying an obligation" % r3["written"])
# ONE VALIDATOR: the ingest carries no type check of its own, and every record the
# Adapter refuses -- a retired \`technique\`, a joined-line state, \`breaks\` as prose, no
# \`segments\`, no \`description\`, a figure kind outside the closed set, an unnamed field -- the ingest
# refuses with the sentence src/move-validate.mjs prints for it, verbatim.
source = open(os.path.join("tools", "move_ingest.py")).read()
for name in ("def check_field_set", "def check_state_shape", "def check_breaks_shape",
             "def check_structure", "def check_description", "def check_figure",
             "def load_roles", "RETIRED_FIELDS =", "DESCRIPTION_MAX ="):
    if name in source:
        bad.append("tools/move_ingest.py still carries %s of its own" % name)
good = m.derive_from_extraction(m.read_extraction(files[0])[1]).mapping
drop = lambda k: {key: v for key, v in good.items() if key != k}
for record in (dict(good, technique="restates the Segments."), dict(good, before="one joined line"),
               dict(good, breaks="one prose paragraph"), drop("segments"), drop("description"),
               dict(good, figure={"kind": "no_such_kind"}), dict(good, notes="a field no role maps")):
    adapter = subprocess.run(["node", os.path.join("src", "move-validate.mjs"), "moves"],
                             input=json.dumps(record), capture_output=True, text=True)
    said = adapter.stdout.strip()
    try:
        m.validate_move(record, 1)
        bad.append("the ingest admitted a record the Adapter refuses: rc %d %s" % (adapter.returncode, said))
    except m.Refusal as e:
        if adapter.returncode != 1 or not said or e.condition != "adapter" or e.message != said:
            bad.append("the ingest's refusal is not the Adapter's words: %r vs rc %d %r"
                       % (e.message, adapter.returncode, said))
# AN ENTRY IS READ AS A SEGMENT OR REFUSED, NEVER DROPPED (kogaki#1416). The admitted Move
# carries one Segment per entry; each unreadable entry and a \`reader\` row naming a Segment the
# list does not hold are refused naming the Segment, and nothing is written for any of them.
for name in ("FUNCTIONS =", "RELATIONS =", "SEGMENT_ENTRY ="):
    if name in source:
        bad.append("tools/move_ingest.py carries a label set: %s" % name)
BT = chr(96)
base = m.read_extraction(files[0])[1]
# THE MANNER IS COPIED ONTO ITS OWN SEGMENT (kogaki#1510): paragraph 2's Segment 2 carries one.
manner_move = m.derive_from_extraction(m.read_extraction(files[1])[1]).mapping
if [s.get("manner") for s in manner_move["segments"]] != [None, "a brief direct statement, given with no elaboration.", None]:
    bad.append("the Move admitted from paragraph 2 does not carry its manner on Segment 2 alone: %r" % manner_move["segments"])
if any("does" in s for s in manner_move["segments"]):
    bad.append("the admitted Move carries a Segment key named does: %r" % manner_move["segments"])
if len(good["segments"]) != len(base["segments"]):
    bad.append("the admitted Move carries %d Segment(s) for the Extraction's %d"
               % (len(good["segments"]), len(base["segments"])))
def variant(edit):
    rec = json.loads(json.dumps(base))
    if len(rec["segments"]) < 2:
        rec["segments"].append({"content": "c", "operation": "it widens the claim", "relation": "it extends it"})
    edit(rec)
    return rec
def label(rec): rec["segments"][1]["function"] = "opens"
def no_operation(rec): rec["segments"][1]["operation"] = ""
def no_relation(rec): rec["segments"][1].pop("relation", None)
def first_relation(rec): rec["segments"][0]["relation"] = "takes up the previous paragraph"
def far_row(rec):
    row = next(r for r in rec["reader"].values() if str(r.get("after", "")).strip().lower() != "unchanged")
    row["segment"] = "%d" % (len(rec["segments"]) + 1)
for edit, words in ((label, ("Segment 2 carries %sfunction%s" % (BT, BT), "cannot be read as a Segment")),
                    (no_operation, ("condition adapter", "Segment 2 carries no one-line %soperation%s" % (BT, BT))),
                    (no_relation, ("condition adapter", "Segment 2 carries no one-line %srelation%s" % (BT, BT))),
                    (first_relation, ("condition adapter", "Segment 1 carries a %srelation%s" % (BT, BT))),
                    (far_row, ("names Segment %d" % (len(base["segments"]) + 1 if len(base["segments"]) >= 2 else 3),
                               "disagrees with its own Segment count"))):
    path = os.path.join(tmp, "%s.yaml" % edit.__name__)
    with open(path, "w") as h:
        h.write(m.yaml_write(variant(edit)))
    lib = os.path.join(tmp, "lib-" + edit.__name__)
    os.makedirs(lib)
    shutil.copy(os.path.join("moves", "ROLES.json"), lib)
    try:
        m.run_from_extraction([path], lib, os.path.join(tmp, "out-" + edit.__name__), select="accept")
        bad.append("%s: an Extraction the ingest cannot read whole was admitted" % edit.__name__)
    except m.Refusal as e:
        missing = [w for w in words if w not in str(e)]
        if missing:
            bad.append("%s: the refusal does not say %r: %s" % (edit.__name__, missing, e))
    if [n for n in os.listdir(lib) if n.endswith(".yaml")]:
        bad.append("%s: a refused Extraction left a Move in the library" % edit.__name__)
# THE BRIEF READS WHAT THE INGEST ADMITTED: its compose input and Move-fit judge input read
# the library run_from_extraction wrote, each Move bound to a Leg, without refusal.
ids = [os.path.basename(w)[:-len(".yaml")] for w in r["written"] or []]
brief = subprocess.run(["node", "--input-type=module", "-e",
    "const { loadMoveContracts, moveContractsForLegs } = await import(process.argv[1]);"
    "const ids = JSON.parse(process.argv[3]);"
    "const lib = loadMoveContracts(process.argv[2]);"
    "const legs = moveContractsForLegs(ids.map((id, i) => ({ leg_id: 'L' + (i + 1), move: id, waypoints: ['w'] })), process.argv[2]);"
    "process.stdout.write(JSON.stringify({ lib: lib.error || null, legs: legs.error || null, n: (lib.moves || []).length,"
    " bound: (legs.contracts || []).map((c) => c.move) }));",
    "file://" + os.path.abspath(os.path.join("src", "compose.mjs")), moves, json.dumps(ids)],
    capture_output=True, text=True)
got = json.loads(brief.stdout or "{}") if brief.returncode == 0 else {"error": brief.stderr}
if got.get("error") or got.get("lib") or got.get("legs") or got.get("n") != len(ids) or got.get("bound") != ids:
    bad.append("the Brief's compose and judge inputs did not read the admitted Moves: %r" % got)
print("\\n".join(bad))
sys.exit(1 if bad else 0)
`, ...files], { encoding: "utf8", cwd: repo });
ok(gate.status === 0, `(b2) the Proof Sheet's ingest stage is not the Adapter's gate: ${gate.stdout}${gate.stderr}`);

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
  ok(Array.isArray(a1.refusals) && a1.refusals.length === 2 && /Segment 1 carries no `operation`/.test(a1.refusals[0])
    && /names paragraph "1", not 1/.test(a1.refusals[1]),
    `(c) p1/attempts.json does not record both refusals in order: ${JSON.stringify(a1.refusals)}`);
  const prompts = readFileSync(join(root, "prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  ok(prompts.length === 5, `(c) the fake judge was called ${prompts.length} time(s), not 5`);
  ok(prompts[1] && prompts[1].includes(a1.refusals[0]) && !prompts[1].includes(a1.refusals[1]),
    "(c) the second attempt's prompt does not carry only the first attempt's refusal");
  ok(prompts[2] && prompts[2].includes(a1.refusals[0]) && prompts[2].includes(a1.refusals[1])
    && prompts[2].indexOf(a1.refusals[0]) < prompts[2].indexOf(a1.refusals[1]),
    "(c) the third attempt's prompt does not carry BOTH prior refusals, oldest first");
  const o1 = existsSync(join(p1, "obligation", "attempts.json")) ? JSON.parse(readFileSync(join(p1, "obligation", "attempts.json"), "utf8")) : {};
  ok(o1.attempts === 2 && /`obligation` is present beside `counts` not fired/.test((o1.refusals || [])[0] || ""),
    `(c) p1/obligation/attempts.json does not record the refused answer and the second attempt: ${JSON.stringify(o1)}`);
  const a2 = existsSync(join(runDir, "p2", "attempts.json")) ? JSON.parse(readFileSync(join(runDir, "p2", "attempts.json"), "utf8")) : {};
  ok(a2.attempts === 2, `(c) p2/attempts.json records ${a2.attempts} attempt(s), not 2`);
  // rule 7's mechanical half (kogaki#1440): a subject noun in a reader `after` is refused naming the row
  ok(Array.isArray(a2.refusals) && a2.refusals.length === 1 && /the `knowledge` row's `after` names "installer", one of your subject_nouns/.test(a2.refusals[0]),
    `(c) a subject noun in a reader \`after\` was not refused naming the row: ${JSON.stringify(a2.refusals)}`);
  // rule 7's three sentences reach the Extractor in its rendered instruction
  const instruction = prompt.slice(0, prompt.indexOf("# Extraction: the interaction contract"));
  for (const sentence of [
    "a section 2 `after` state is written as `operation` is, in general terms, naming no term, place, person or claim of the original and none of `subject_nouns`, and describing nothing of a neighbouring paragraph's content, so that `before` states copied from it stay general.",
    "Segment 1's `operation` carries no reference to any earlier step or earlier paragraph.",
    "A later Segment's `operation` is the operation alone, and its `relation` carries the connection to the step before.",
  ]) ok(instruction.includes(sentence), `(c) the Extractor's rendered instruction does not carry rule 7's sentence: ${sentence}`);
  // rule 9 (kogaki#1478): the read-aloud test reaches the Extractor in FORMAT's own words, so neither copy can drift
  const formatText = readFileSync(join(repo, "passages", "FORMAT.md"), "utf8").replace(/\s+/g, " ");
  for (const sentence of [
    "`operation`, `content`, `relation` and `manner` describe what the sentence does when read aloud.",
    "Anything the reader would know only from the page, such as emphasis, bullets, numbering, headings, line breaks or a quotation's marks, is layout: it is recorded in `passage` and nowhere else, never in `operation`, `content`, `relation`, `manner` or a reader-state line.",
    "\"Introduces a bolded term\" fails the test; \"introduces a term\" passes it.",
  ]) {
    ok(instruction.includes(sentence), `(c) the Extractor's rendered instruction does not carry rule 9's read-aloud test: ${sentence}`);
    ok(formatText.includes(sentence), `(c) passages/FORMAT.md's rule 9 does not carry the instruction's sentence: ${sentence}`);
  }

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
ok(argvs.length === 10 && argvs.every((a) => { const i = a.indexOf("--tools"); return i >= 0 && a[i + 1] === ""; }),
  `(d) a call ran without \`--tools ""\`: ${JSON.stringify(argvs)}`);

// (f) the validator, directly
const persona = { reader: "a developer", prior_knowledge: "none" };
const input = X.extractionUnitInput({ passage: "s", paragraphs: [P1, P2], index: 1,
  before: { knowledge: "K", question: "Q", expectation: "E", orientation: "O", trust: "T" }, namesTaken: [], persona });
const good = () => ({ version: "1", paragraph: 2, source: "not given", prior_text: "assumed", language: "English", subject_nouns: ["installer"],
  answers: { q1: "a", q2: "b", q3: "c" }, what_it_does: "x by taking up the last point",
  reader: ["knowledge", "question", "expectation", "orientation", "trust"].map((d) => ({ dimension: d, before: d[0].toUpperCase(),
    after: d === "knowledge" ? "moved" : "unchanged", segment: d === "knowledge" ? "2" : "" })),
  segments: [1, 2, 3].map((_, i) => ({ content: "c", operation: "states one consequence plainly", relation: i === 0 ? "" : "r", manner: "" })),
  why_this_order: "w", presupposes: "p", breaks: ["a change — a loss"], description: "d", name: "n_m", notes: "" });
ok(!X.validateExtractionUnit(good(), input).error, `(f) the validator refused a good record: ${X.validateExtractionUnit(good(), input).error}`);
const m1 = good(); m1.reader[1].before = "drafted";
ok(/the `question` row's `before`.*carried, not drafted/.test(X.validateExtractionUnit(m1, input).error || ""), "(f) a before that is not the carried state was not refused naming the row");
const m2 = good(); m2.segments.pop();
ok(/one Segment per sentence/.test(X.validateExtractionUnit(m2, input).error || ""), "(f) a Segment count other than the sentence count was not refused");
const m3 = good(); m3.segments[1].operation = "the installer copies";
ok(/Segment 2: the `operation` clause names "installer"/.test(X.validateExtractionUnit(m3, input).error || ""), "(f) an operation clause naming a subject noun was not refused");

// rule 5 (kogaki#1510): Segment 1 carries no `relation`, on a paragraph with earlier text too --
// `good()` is paragraph 2 and validates with none; one carrying a relation is refused.
ok(input.earlier_paragraphs.length === 1, "(f) the validator's input is not a paragraph with earlier text");
const m4 = good(); m4.segments[0].relation = "takes up the previous paragraph's last point";
ok(/Segment 1: carries a `relation` — Segment 1 carries none/.test(X.validateExtractionUnit(m4, input).error || ""), "(f) a Segment 1 relation on a paragraph with earlier text was not refused (rule 5)");
const m4b = good(); m4b.segments[2].relation = "";
ok(/Segment 3: the `relation` clause is empty/.test(X.validateExtractionUnit(m4b, input).error || ""), "(f) an empty relation on a later Segment was not refused");
const m4c = good(); m4c.breaks = { remove: "r", reorder: "o", extend: "e" };
ok(/`breaks` is not a list of prose tests/.test(X.validateExtractionUnit(m4c, input).error || ""), "(f) keyed breaks were not refused as not a list of prose tests");
const m4d = good(); m4d.answers.q4 = "d";
ok(/`answers` carries `q4`/.test(X.validateExtractionUnit(m4d, input).error || ""), "(f) an answer for the retired Q4 was not refused");

// THE MANNER (kogaki#1510): filled on one Segment and empty on the rest validates; a manner
// restating the operation, or naming a subject noun, is refused naming the Segment.
const m4h = good(); m4h.segments[1].manner = "a brief direct statement, given with no elaboration.";
ok(!X.validateExtractionUnit(m4h, input).error, `(f) a manner filled on one Segment was refused: ${X.validateExtractionUnit(m4h, input).error}`);
const m4i = good(); m4i.segments[1].manner = "states the consequence plainly";
ok(/Segment 2: the `manner` clause restates the `operation`/.test(X.validateExtractionUnit(m4i, input).error || ""), "(f) a manner restating the operation was not refused naming the Segment");
const m4j = good(); m4j.segments[2].manner = "quotes the installer verbatim";
ok(/Segment 3: the `manner` clause names "installer"/.test(X.validateExtractionUnit(m4j, input).error || ""), "(f) a manner naming a subject noun was not refused naming the Segment");
// THE WHOLE MOVE IS GENERAL (kogaki#1519): a subject noun or a word in the original's language
// is refused in a `breaks` test, a reader state and a `relation` as in `operation` and
// `manner`, each naming the field; `content` is bound to the source and may name the subject.
const m4l = good(); m4l.breaks = ["a change — a loss", "name the installer's version — the step binds one subject"];
ok(/`breaks` test 2 names "installer", one of your subject_nouns/.test(X.validateExtractionUnit(m4l, input).error || ""), "(f) a break naming a subject noun was not refused naming the break");
const m4m = good(); m4m.reader[0].after = "knows the Installer owns the copy";
ok(/the `knowledge` row's `after` names "installer"/.test(X.validateExtractionUnit(m4m, input).error || ""), "(f) a reader state naming a subject noun was not refused naming the dimension");
const m4n = good(); m4n.segments[1].relation = "adds a point with また";
ok(/Segment 2: the `relation` clause carries "また", a word outside the Latin script/.test(X.validateExtractionUnit(m4n, input).error || ""), "(f) a relation carrying また was not refused naming the Segment");
const m4o = good(); m4o.breaks = ["drop 「なぜなら」 — the reason reads as a claim"];
ok(/`breaks` test 1 carries "「なぜなら」"/.test(X.validateExtractionUnit(m4o, input).error || ""), "(f) a break built on a source-language word was not refused naming the break");
const m4p = good(); m4p.segments[0].content = "says the installer owns the copy";
ok(!X.validateExtractionUnit(m4p, input).error, `(f) a record naming a subject noun in its content clause alone was refused: ${X.validateExtractionUnit(m4p, input).error}`);
// kogaki#1604
const m4w1 = good(); m4w1.reader[0].after = "knows the point, which must open with the claim";
ok(/the `knowledge` row's `after` carries "must open with", a wording instruction/.test(X.validateExtractionUnit(m4w1, input).error || ""), "(f) an after instructing wording was not refused naming the row and the phrase");
const m4w2 = good(); m4w2.breaks = ["a change — a loss", "the paragraph must stay in one sentence — the reader loses nothing"];
ok(/`breaks` test 2 carries "must stay in one sentence", a wording instruction/.test(X.validateExtractionUnit(m4w2, input).error || ""), "(f) a break instructing wording was not refused naming the break and the phrase");
const m4w3 = good(); m4w3.breaks = ["state both claims in one sentence — the reader loses the separation"];
ok(!X.validateExtractionUnit(m4w3, input).error, `(f) a break whose change is stated in one sentence was refused: ${X.validateExtractionUnit(m4w3, input).error}`);
const m4w4 = good(); m4w4.segments[1].manner = "must open with a question to the reader";
ok(!X.validateExtractionUnit(m4w4, input).error, `(f) a manner carrying a wording instruction was refused: ${X.validateExtractionUnit(m4w4, input).error}`);
const m4k = good(); m4k.segments[1].does = "g";
ok(/Segment 2 carries `does`, which it does not declare/.test(X.validateExtractionUnit(m4k, input).error || ""), "(f) a Segment carrying the retired `does` was not refused by name");

// kogaki#1412: `description` replaces the retired `technique` -- a record still carrying
// `technique` is refused as an undeclared key, and a description over 200 characters is
// refused naming its length; one of exactly 200 passes.
const m4e = good(); m4e.technique = "t";
ok(/carries `technique`, which it does not declare/.test(X.validateExtractionUnit(m4e, input).error || ""), "(f) a record carrying the retired technique was not refused by name");
const m4f = good(); m4f.description = "x".repeat(201);
ok(/`description` is 201 characters — at most 200/.test(X.validateExtractionUnit(m4f, input).error || ""), "(f) a 201-character description was not refused naming its length");
const m4g = good(); m4g.description = "x".repeat(200);
ok(!X.validateExtractionUnit(m4g, input).error, `(f) a 200-character description was refused: ${X.validateExtractionUnit(m4g, input).error}`);

// A CONTENT CLAUSE OPENS ON WHAT THE SENTENCE SAYS (kogaki#1554): one opening on a method verb
// is refused naming the paragraph, the Segment and the verb; the case pins a second listed verb
// as well as the specimen, and the clause rewritten to open on what the sentence says passes.
const m4q = good(); m4q.segments[1].content = "explains the principle by taking at face value the stock declaration of a country that starts a war";
ok(/paragraph 2, Segment 2: the `content` clause opens on "explains", a form of the method verb "explain"/.test(X.validateExtractionUnit(m4q, input).error || ""),
  `(f) a content clause opening on "explains" was not refused naming the paragraph, Segment 2 and the verb: ${X.validateExtractionUnit(m4q, input).error}`);
const m4r = good(); m4r.segments[1].content = "Restating the earlier claim in a narrower form";
ok(/Segment 2: the `content` clause opens on "Restating", a form of the method verb "restate"/.test(X.validateExtractionUnit(m4r, input).error || ""),
  `(f) a content clause opening on "Restating" was not refused naming the verb: ${X.validateExtractionUnit(m4r, input).error}`);
const m4s = good(); m4s.segments[1].content = "says every country starting a war declares it acts in defence";
ok(!X.validateExtractionUnit(m4s, input).error, `(f) a content clause opening on what the sentence says was refused: ${X.validateExtractionUnit(m4s, input).error}`);
const formatRule7 = readFileSync(join(repo, "passages", "FORMAT.md"), "utf8").replace(/\s+/g, " ");
ok(formatRule7.includes("A `content` clause opens on what the sentence says, never on a verb naming how the paragraph treats it."),
  "(f) passages/FORMAT.md does not carry the content-clause sentence verbatim");

// a record wrong on BOTH `answers` and `segments` at once is refused naming both (kogaki#1395)
const m5 = good(); delete m5.answers.q3; m5.segments.pop();
const e5 = X.validateExtractionUnit(m5, input).error || "";
ok(/answers/.test(e5) && /one Segment per sentence/.test(e5), `(f) a record broken on two fields at once did not name both: ${e5}`);

// (h) THE OBLIGATION, DERIVED FROM THE MOVE'S OWN SEGMENTS (FORMAT "The paragraph unit", rule 8,
// kogaki#1590): a second call per paragraph whose input is the record's Segments alone. A run
// whose first paragraph counts two items in Segment 2 and names them in Segment 3 writes
// `counts` fired and two items; a paragraph that defines, asserts without grounds and gives a
// label writes `counts` not fired with its `why` and no `obligation`; the call's rendered prompt
// carries no `passage`, `earlier_paragraphs`, `reader_state_before` or `subject_nouns` key.
{
  const hroot = join(root, "h");
  mkdirSync(hroot, { recursive: true });
  writeFileSync(join(hroot, "leg.txt"), "Copies drift. Two causes drive it. One is haste and one is habit.\n\nThe pattern is a lapse. It always spreads. Call it drift.\n\nCopies fail. Several causes drive it. Each is plain to see.\n");
  const hjudge = join(hroot, "fake-judge.mjs");
  writeFileSync(hjudge, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PSX_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
  const answer = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  if (input.subject_nouns && !input.paragraph_you_must_extract) {
    return answer({ verdicts: input.segments.map(() => ({ bound: true, why: "Every reference resolves to the sentence." })) });
  }
  if (!input.paragraph_you_must_extract) {
    appendFileSync(dir + "/obligation-inputs.jsonl", JSON.stringify(input) + "\\n");
    if (input.segments.some((x) => /counts two/.test(x.operation))) {
      return answer({ triggers: { counts: { fired: true, why: "Segment 3 counts two factors, and no Segment follows.", segment: 3 } }, obligation: ["the first factor", "the second factor"] });
    }
    if (input.segments.some((x) => /counts/.test(x.operation))) {
      return answer({ triggers: { counts: { fired: true, why: "Segment 3 counts causes, naming no number.", segment: 3 } }, obligation: ["each of the counted causes, in the order named"] });
    }
    return answer({ triggers: { counts: { fired: false, why: "No operation counts items.", segment: 3 } } });
  }
  const p = input.paragraph_you_must_extract;
  const carried = input.reader_state_before;
  const ops = p.number === 1
    ? [["states a general claim.", ""], ["gives the claim an instance.", "grounds the claim before it"], ["counts two factors behind the claim.", "gives the cause of the instance before it"]]
    : p.number === 3
    ? [["states a general claim.", ""], ["gives the claim an instance.", "grounds the claim before it"], ["counts a number of causes behind the claim.", "gives the cause of the instance before it"]]
    : [["defines a term for a recurring pattern.", ""], ["asserts a claim without giving its grounds.", "extends the term defined before it"], ["gives the pattern a label.", "closes on the claim before it"]];
  answer({ version: "1", paragraph: p.number, source: "not given", prior_text: "not assumed", language: "English", subject_nouns: ["installer"],
    answers: { q1: "Hands the reader one claim.", q2: "Raises why it holds.", q3: "Attention from a plain claim." },
    what_it_does: "Hands the reader one claim.",
    reader: ["knowledge", "question", "expectation", "orientation", "trust"].map((d, i) => ({ dimension: d, before: carried ? carried[d] : "BEFORE-" + d,
      after: i === 0 ? "AFTER-" + p.number : "unchanged", segment: i === 0 ? "2" : "" })),
    segments: ops.map(([operation, relation], i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " is about copies.", operation, relation, manner: "" })),
    why_this_order: "The claim comes first.", presupposes: "The reader keeps copies.", breaks: ["drop the instance — the claim floats"],
    description: "States a claim, then its parts.", name: "claim_then_parts_" + p.number, notes: "" });
});
`);
  chmodSync(hjudge, 0o755);
  const hout = join(hroot, "out");
  const hr = spawnSync(process.execPath, ["src/proof-sheet/extract.mjs", "run", "--leg", join(hroot, "leg.txt"), "--out", hout],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: hjudge, PSX_FIXTURE_DIR: hroot }, timeout: 300000 });
  ok(hr.status === 0, `(h) the obligation run exited ${hr.status}: ${hr.stdout}${hr.stderr}`);
  const w1 = existsSync(join(hout, "claim_then_parts_1.yaml")) ? recordOf(join(hout, "claim_then_parts_1.yaml")) : {};
  const t1 = (w1.obligation_triggers || {}).counts || {};
  ok(t1.fired === true && t1.segment === 3 && JSON.stringify(w1.obligation) === '["the first factor","the second factor"]',
    `(h) a last Segment counting two items did not yield \`counts\` fired on Segment 3 and two items: ${JSON.stringify([w1.obligation_triggers, w1.obligation])}`);
  ok(X.extractionMarkdown(w1).includes("obligation trigger counts: fired — Segment 3: Segment 3 counts two factors, and no Segment follows."), "(h) the Extraction does not render its verdict, after its Segment, for reading");
  const w2 = existsSync(join(hout, "claim_then_parts_2.yaml")) ? recordOf(join(hout, "claim_then_parts_2.yaml")) : { obligation: "unwritten" };
  const t2 = (w2.obligation_triggers || {}).counts || {};
  ok(t2.fired === false && t2.why === "No operation counts items." && t2.segment === 3 && !("obligation" in w2),
    `(h) a paragraph that defines, asserts without grounds and gives a label did not yield \`counts\` not fired with its \`why\` and no \`obligation\`: ${JSON.stringify([w2.obligation_triggers, w2.obligation])}`);
  ok(X.extractionMarkdown(w2).includes("obligation trigger counts: not fired — Segment 3: No operation counts items."), "(h) the Extraction does not render a verdict that did not fire");
  // an open count (kogaki#1602): no operation names a number, so the obligation is one collective
  // item, and two ordinal items, or any item carrying a number or ordinal word, are refused by name
  const w3 = existsSync(join(hout, "claim_then_parts_3.yaml")) ? recordOf(join(hout, "claim_then_parts_3.yaml")) : {};
  ok(((w3.obligation_triggers || {}).counts || {}).fired === true && JSON.stringify(w3.obligation) === '["each of the counted causes, in the order named"]',
    `(h) a Segment counting causes with no number did not yield one collective item: ${JSON.stringify([w3.obligation_triggers, w3.obligation])}`);
  const open = { ...good(), segments: good().segments.map((s, i) => (i === 1 ? { ...s, operation: "counts a number of causes behind the claim" } : s)) };
  const openErr = (o) => X.validateExtractionUnit({ ...open, obligation: o, obligation_triggers: { counts: { fired: true, why: "Segment 2 counts causes." } } }, input).error || "";
  const ordinals = openErr(["the first cause", "the second cause"]);
  ok(/item 1, "the first cause", carries "first", a number or ordinal word, and no Segment's `operation` names a number/.test(ordinals)
    && /item 2, "the second cause", carries "second"/.test(ordinals), `(h) two ordinal items on an open count were not refused by name: ${ordinals}`);
  for (const w of ["two", "three", "both", "pair", "first", "second"]) {
    const e = openErr([`the ${w} causes`]);
    ok(new RegExp(`carries "${w}", a number or ordinal word`).test(e), `(h) an item carrying "${w}" on an open count was not refused by name: ${e}`);
  }
  ok(!openErr(["each of the counted causes, in the order named"]), `(h) one collective item on an open count was refused: ${openErr(["each of the counted causes, in the order named"])}`);
  const hRun = (hr.stdout.match(/^run directory: (.+)$/m) || [])[1] || "";
  const oPrompt = existsSync(join(hRun, "p1", "obligation", "prompt.md")) ? readFileSync(join(hRun, "p1", "obligation", "prompt.md"), "utf8") : "";
  ok(oPrompt.includes("You are the judge at the Extractor workflow's `obligation_unit` judgment point."), "(h) p1/obligation/prompt.md is not the obligation_unit row rendered by judgePrompt");
  for (const k of ["passage", "earlier_paragraphs", "reader_state_before", "subject_nouns", "after"]) {
    ok(oPrompt && !oPrompt.includes(`"${k}":`), `(h) the obligation call's rendered prompt carries the \`${k}\` key`);
  }
  const oInputs = existsSync(join(hroot, "obligation-inputs.jsonl")) ? readFileSync(join(hroot, "obligation-inputs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  ok(oInputs.length === 3 && oInputs.every((x) => JSON.stringify(Object.keys(x)) === '["segments"]'
    && x.segments.every((s) => JSON.stringify(Object.keys(s)) === '["operation","relation"]')),
    `(h) the obligation call's input is not the Segments' operation and relation alone: ${JSON.stringify(oInputs)}`);
}

// (i) THE OBLIGATION CALL'S ANSWER AND THE RECORD'S VERDICT (kogaki#1590): each malformed answer
// is refused by name; on the record `obligation` stands only beside `obligation_triggers`, and
// the retired `obligation_trigger` is undeclared; the item validators of kogaki#1557, #1568 and
// #1576 stay on the record.
{
  // the record's Segment 2 fixes a pair (kogaki#1602), so ordinal items are its form
  const paired = () => ({ ...good(), segments: good().segments.map((s, i) => (i === 1 ? { ...s, operation: "sets two factors against each other" } : s)) });
  const at = { record: paired(), input };
  const fired = (why = "Segment 2 counts two items, and Segment 3 leaves them unused.", segment = 2) => ({ counts: { fired: true, why, segment } });
  const quiet = (why = "No operation counts items.", segment = 3) => ({ counts: { fired: false, why, segment } });
  const answerErr = (a) => X.validateObligationUnit(a, at).error || "";
  const beside = answerErr({ triggers: quiet(), obligation: ["the grounds"] });
  ok(/`obligation` is present beside `counts` not fired/.test(beside), `(i) an answer carrying \`obligation\` beside \`fired: false\` was not refused by name: ${beside}`);
  const longWhy = answerErr({ triggers: quiet("no operation in any of these three Segments counts any items at all here") });
  ok(/`triggers`\.counts\.why is 14 words/.test(longWhy), `(i) a \`why\` over twelve words was not refused by name: ${longWhy}`);
  for (const w of ["since", "because", "so that", "must", "which"]) {
    const e = answerErr({ triggers: fired(), obligation: [`the first factor ${w} it holds`] });
    ok(new RegExp(`carries "${w}", which is rationale`).test(e), `(i) an item carrying \` ${w} \` was not refused by name: ${e}`);
  }
  const longItem = answerErr({ triggers: fired(), obligation: ["one two three four five six seven eight nine ten eleven twelve thirteen"] });
  ok(/is 13 words — an item is a term or a question of at most 12 words/.test(longItem), `(i) an item over twelve words was not refused: ${longItem}`);
  const old = answerErr({ trigger: "counts", obligation: ["the first factor"] });
  ok(/the answer carries `trigger`, the retired shape/.test(old), `(i) a \`trigger\` key of the old shape was not refused by name: ${old}`);
  const retired = answerErr({ triggers: { ...quiet(), names: { fired: true, why: "a label is named." } } });
  ok(/`triggers` carries `names`, which is retired or undeclared/.test(retired), `(i) a retired trigger was not refused naming it: ${retired}`);
  ok(/`obligation` is absent beside `counts` fired/.test(answerErr({ triggers: fired() })), "(i) a fired `counts` naming no items was not refused");
  ok(!answerErr({ triggers: quiet() }) && !answerErr({ triggers: fired(), obligation: ["the first factor", "what is the second factor?"] }),
    `(i) a well-formed obligation answer was refused: ${answerErr({ triggers: quiet() })} ${answerErr({ triggers: fired(), obligation: ["the first factor", "what is the second factor?"] })}`);
  const collective = answerErr({ triggers: fired(), obligation: ["each of the counted factors, in the order named"] });
  ok(/item 1, "each of the counted factors, in the order named", is a collective item, and Segment 2's `operation` fixes the count with "two"/.test(collective),
    `(i) a collective item on a fixed pair was not refused by name: ${collective}`);
  const bare = X.validateExtractionUnit({ ...good(), obligation: ["the first factor"] }, input).error || "";
  ok(/`obligation` is present and `obligation_triggers` is absent/.test(bare), `(i) \`obligation\` without \`obligation_triggers\` was not refused naming both: ${bare}`);
  const oldKey = X.validateExtractionUnit({ ...good(), obligation: ["the first factor"], obligation_trigger: "counts" }, input).error || "";
  ok(/carries `obligation_trigger`, which it does not declare/.test(oldKey), `(i) the retired \`obligation_trigger\` key was not refused as undeclared: ${oldKey}`);
  const refused = (o) => X.validateExtractionUnit({ ...paired(), obligation: o, obligation_triggers: fired() }, input).error || "";
  for (const key of ["kind", "text", "term"]) {
    ok(new RegExp(`\`obligation\` is a map carrying \`${key}\``).test(refused({ [key]: "x" })), `(i) a map obligation carrying \`${key}\` was not refused naming the key`);
  }
  ok(/`obligation` is not a list of one or more one-line items/.test(refused([])), `(i) an empty obligation list was not refused: ${refused([])}`);
  ok(/`obligation` names "leverage" twice/.test(refused(["leverage", "leverage"])), `(i) an item named twice was not refused: ${refused(["leverage", "leverage"])}`);
  ok(/`obligation` item 1, "installer", names "installer", one of your subject_nouns/.test(refused(["installer"])), `(i) an item naming a subject noun was not refused: ${refused(["installer"])}`);
  ok(/a word outside the Latin script/.test(refused(["レバレッジ"])), `(i) an item outside the Latin script was not refused: ${refused(["レバレッジ"])}`);
  const defined = good(); defined.segments[1].content = "Leverage is defined as borrowed weight.";
  ok(/Segment 2: the `content` clause defines or answers "leverage"/.test(X.validateExtractionUnit({ ...defined, obligation: ["leverage"], obligation_triggers: fired() }, input).error || ""),
    "(i) an item a Segment's `content` clause defines was not refused naming the Segment");
  ok(formatRule7.includes("Each item is written general, as `operation` is: it names no term, place, person or claim of the original and none of `subject_nouns` (kogaki#1576)."),
    "(i) passages/FORMAT.md's `obligation` entry does not carry the general-item sentence");
}

// (k) THE COUNTING SEGMENT AND ITS NUMBER (kogaki#1613): a count a later Segment uses leaves
// nothing open. On a Move whose Segment 2 sets a pair and whose Segment 3's `relation` unpacks it,
// `fired: false` on Segment 2 validates and `fired: true` there with a `why` naming no later
// Segment is refused by name; on a Move whose counting Segment is last, `fired: true` on it
// validates; a verdict without `segment`, or naming a Segment the Move lacks, is refused by name.
{
  const moveOf = (ops) => ({ ...good(), segments: good().segments.map((s, i) => ({ ...s, operation: ops[i][0], relation: ops[i][1] })) });
  const unpacked = moveOf([["states one consequence plainly", ""], ["sets two factors against each other", "gives the ground of the step before"],
    ["takes each factor in turn", "unpacks the pairing the step before sets up"]]);
  const last = moveOf([["states one consequence plainly", ""], ["gives the consequence an instance", "grounds the step before"],
    ["sets two factors against each other", "gives the ground of the instance before"]]);
  const err = (record, a) => X.validateObligationUnit(a, { record, input }).error || "";
  const quietUse = { triggers: { counts: { fired: false, why: "Segment 3 unpacks the pairing Segment 2 sets up.", segment: 2 } } };
  ok(!err(unpacked, quietUse), `(k) \`fired: false\` on a count Segment 3 unpacks was refused: ${err(unpacked, quietUse)}`);
  ok(X.withObligation(unpacked, quietUse).obligation_triggers.counts.segment === 2, "(k) the record written from the answer does not carry `segment` under `counts`");
  const early = err(unpacked, { triggers: { counts: { fired: true, why: "Segment 2 counts two factors.", segment: 2 } }, obligation: ["the first factor", "the second factor"] });
  ok(/`triggers`\.counts fired on Segment 2, which is not the Move's last, and `why` names no later Segment/.test(early),
    `(k) \`fired: true\` before the last Segment with a \`why\` naming no later Segment was not refused by name: ${early}`);
  const lastFired = { triggers: { counts: { fired: true, why: "Segment 3 sets two factors, and no Segment follows.", segment: 3 } }, obligation: ["the first factor", "the second factor"] };
  ok(!err(last, lastFired), `(k) \`fired: true\` on a counting Segment that is the Move's last was refused: ${err(last, lastFired)}`);
  const none = err(last, { triggers: { counts: { fired: false, why: "No operation counts items." } } });
  ok(/`triggers`\.counts carries no `segment`/.test(none), `(k) a verdict without \`segment\` was not refused by name: ${none}`);
  for (const bad of [4, 0, "3", 2.5]) {
    const e = err(last, { triggers: { counts: { fired: false, why: "No operation counts items.", segment: bad } } });
    ok(/`triggers`\.counts\.segment is .+, and the Move has Segments 1 to 3/.test(e), `(k) a \`segment\` of ${JSON.stringify(bad)} was not refused by name: ${e}`);
  }
}

// (j) THE RETIRED KEYS (kogaki#1583): a record carrying `discharges` or `obligation_content` is
// refused as an undeclared key, the extraction call's answer carrying `obligation` is refused, and
// FORMAT carries rule 8 and the retired rule 10 verbatim.
{
  for (const k of ["discharges", "obligation_content"]) {
    const e = X.validateExtractionUnit({ ...good(), [k]: k === "discharges" ? true : ["leverage"] }, input).error || "";
    ok(new RegExp(`carries \`${k}\`, which it does not declare`).test(e), `(j) a record carrying \`${k}\` was not refused as an undeclared key: ${e}`);
  }
  for (const k of ["obligation", "obligation_triggers"]) {
    ok(new RegExp(`the record carries \`${k}\` — the Harness asks the obligation in a second call`).test(X.validateExtractionAnswer({ ...good(), [k]: ["x"] }, input).error || ""),
      `(j) the extraction call's answer carrying \`${k}\` was not refused`);
  }
  ok(!("open_obligation" in input), `(j) the extraction call's input still carries \`open_obligation\`: ${JSON.stringify(Object.keys(input))}`);
  const format = readFileSync(join(repo, "passages", "FORMAT.md"), "utf8");
  const rule8 = "8. **`obligation` is absent unless `counts` fires in the Move's own Segments.** The obligation is derived from the record's `segments` alone, each `operation` and `relation`, and nothing of the Passage: where an operation's wording counts items, `obligation` is the list of those items, one term or question of at most twelve words each; otherwise the key is absent. A counting operation names no number unless the number is the operation, as in a contrasting pair or the two sides of one measure. Where no operation names a number, `obligation` is ONE collective item naming the counted parts as a set, such as \"each of the counted parts, in the order named\", and an item carrying a number or ordinal word is refused; where an operation names the number or a fixed set, it is that many ordinal items in the order the Segments name them, and a collective item is refused (kogaki#1590, kogaki#1602). `obligation_triggers` carries the verdict on `counts` with its one-line reason on every record. The obligation belongs to the Move as a whole, and no Segment position is required; it shapes prose and carries no condition on how an item is kept (\"Where each field goes\"). Absent is the normal case.";
  ok(format.includes(rule8), "(j) passages/FORMAT.md does not carry rule 8 verbatim");
  ok(format.includes("10. *(retired, kogaki#1583: `discharges` held state across paragraphs.)*"), "(j) passages/FORMAT.md does not carry the retired rule 10 verbatim");
}

// (k) THE CONTENT CLAUSE, JUDGED SOURCE-BOUND (kogaki#1614), over the discriminating pair of the
// 2026-10-26 run: the clause replacing the three countries with "two of the countries" and "the
// strongest one" is refused naming "the strongest one", and the clause naming Russia, China and
// the United States passes. The fake verdict call judges that one phrase unresolved; the judgment
// is a live model's, and what is held here is the call, the refusal and the re-ask.
{
  const kroot = join(root, "k");
  mkdirSync(kroot, { recursive: true });
  const S2 = "Russia and China sit where the dilemma arises readily, while the United States sits where it does not.";
  writeFileSync(join(kroot, "leg.txt"), `Some powers meet the dilemma more often than others. ${S2}\n`);
  const BAD = "two of the countries sit where the dilemma arises readily, while the strongest one sits where it does not";
  const GOOD = "Russia and China sit where the dilemma arises readily, while the United States sits where it does not";
  const kjudge = join(kroot, "fake-judge.mjs");
  writeFileSync(kjudge, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PSX_FIXTURE_DIR;
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
  const answer = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  if (input.subject_nouns && !input.paragraph_you_must_extract) {
    appendFileSync(dir + "/bound-inputs.jsonl", JSON.stringify(input) + "\\n");
    return answer({ verdicts: input.segments.map((s) => (s.content.includes("the strongest one")
      ? { bound: false, why: '"the strongest one" resolves to no subject noun.' } : { bound: true, why: "Every reference resolves to a subject noun." })) });
  }
  if (!input.paragraph_you_must_extract) return answer({ triggers: { counts: { fired: false, why: "No operation counts items.", segment: 1 } } });
  appendFileSync(dir + "/extract-prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const n = (existsSync(dir + "/attempt") ? Number(readFileSync(dir + "/attempt", "utf8")) : 0) + 1;
  writeFileSync(dir + "/attempt", String(n));
  const p = input.paragraph_you_must_extract;
  answer({ version: "1", paragraph: p.number, source: "not given", prior_text: "not assumed", language: "English",
    subject_nouns: ["Russia", "China", "United States", "dilemma"],
    answers: { q1: "Places three powers against one test.", q2: "Raises which powers it binds.", q3: "Attention from a concrete contrast." },
    what_it_does: "Places named powers on either side of one test.",
    reader: ["knowledge", "question", "expectation", "orientation", "trust"].map((d, i) => ({ dimension: d, before: "BEFORE-" + d,
      after: i === 0 ? "AFTER-" + d : "unchanged", segment: i === 0 ? "2" : "" })),
    segments: [
      { content: "Some powers meet the dilemma more often than others", operation: "states a general claim.", relation: "", manner: "" },
      { content: process.env.PSX_ALWAYS || n === 1 ? ${JSON.stringify(BAD)} : ${JSON.stringify(GOOD)},
        operation: "sorts named cases to either side of the claim.", relation: "gives instances of the claim before it", manner: "" }],
    why_this_order: "The claim comes first.", presupposes: "The reader knows the powers.", breaks: ["drop the instances — the claim floats"],
    description: "States a claim, then sorts named cases by it.", name: "sort_cases_by_a_claim", notes: "" });
});
`);
  chmodSync(kjudge, 0o755);
  const kRun = (tag, env = {}) => {
    const d = join(kroot, tag);
    mkdirSync(d, { recursive: true });
    const res = spawnSync(process.execPath, ["src/proof-sheet/extract.mjs", "run", "--leg", join(kroot, "leg.txt"), "--out", join(d, "out")],
      { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: kjudge, PSX_FIXTURE_DIR: d, ...env }, timeout: 300000 });
    return { d, res, runDir: (res.stdout.match(/^run directory: (.+)$/m) || [])[1] || "" };
  };
  const pass = kRun("pass");
  ok(pass.res.status === 0, `(k) the content-bound run exited ${pass.res.status}: ${pass.res.stdout}${pass.res.stderr}`);
  const kf = join(pass.d, "out", "sort_cases_by_a_claim.yaml");
  const kw = existsSync(kf) ? recordOf(kf) : {};
  ok(((kw.segments || [])[1] || {}).content === GOOD, `(k) the written Segment 2 is not the clause naming Russia, China and the United States: ${JSON.stringify(kw.segments)}`);
  ok(JSON.stringify((kw.content_bound || []).map((v) => v.bound)) === "[true,true]", `(k) the record does not carry \`content_bound\`, one bound verdict per Segment: ${JSON.stringify(kw.content_bound)}`);
  const ka = existsSync(join(pass.runDir, "p1", "attempts.json")) ? JSON.parse(readFileSync(join(pass.runDir, "p1", "attempts.json"), "utf8")) : {};
  const refusal = (ka.refusals || [])[0] || "";
  ok(ka.attempts === 2 && ka.content_bound_attempts === 2 && /paragraph 1, Segment 2: the `content` clause leaves "the strongest one" unresolved/.test(refusal),
    `(k) p1/attempts.json does not name the refusal of "the strongest one" and both calls' attempts: ${JSON.stringify(ka)}`);
  ok(existsSync(join(pass.runDir, "p1", "content-bound", "attempts.json")) && existsSync(join(pass.runDir, "p1", "content-bound-2", "attempts.json")),
    "(k) each round's content-bound call has no attempts record of its own");
  const kp = existsSync(join(pass.d, "extract-prompts.jsonl")) ? readFileSync(join(pass.d, "extract-prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  ok(kp.length === 2 && !kp[0].includes(refusal) && refusal && kp[1].includes(refusal) && kp[1].includes(BAD),
    `(k) the Extractor's second attempt does not carry the refusal verbatim beside the refused answer (${kp.length} prompt(s))`);
  const kb = existsSync(join(pass.d, "bound-inputs.jsonl")) ? readFileSync(join(pass.d, "bound-inputs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  ok(kb.length === 2 && kb.every((x) => JSON.stringify(Object.keys(x)) === '["subject_nouns","segments"]'
    && x.segments.every((s) => JSON.stringify(Object.keys(s)) === '["sentence","content"]')) && kb[0].segments[1].sentence === S2,
    `(k) the content-bound call's input is not each sentence beside its content clause, with subject_nouns: ${JSON.stringify(kb[0])}`);
  const kcp = existsSync(join(pass.runDir, "p1", "content-bound", "prompt.md")) ? readFileSync(join(pass.runDir, "p1", "content-bound", "prompt.md"), "utf8") : "";
  ok(kcp.includes("You are the judge at the Extractor workflow's `content_bound_unit` judgment point."), "(k) p1/content-bound/prompt.md is not the content_bound_unit row rendered by judgePrompt");
  // within the Extractor's own attempt budget: a clause refused on every attempt stops the run
  const stop = kRun("stop", { PSX_ALWAYS: "1" });
  const budget = JSON.parse(readFileSync(join(repo, "kogaki.settings.json"), "utf8")).brief.unit_attempts;
  ok(stop.res.status === 1 && new RegExp(`the content-bound call refused the Extraction after ${budget} attempt\\(s\\) — paragraph 1, Segment 2: the \`content\` clause leaves "the strongest one" unresolved`).test(stop.res.stdout)
    && !existsSync(join(stop.d, "out", "sort_cases_by_a_claim.yaml")),
    `(k) a clause refused on every attempt did not stop the run at the Extractor's budget of ${budget}: ${stop.res.stdout}${stop.res.stderr}`);
  // the verdict call's own answer, read back
  const kin = { paragraph_you_must_extract: { number: 1, sentences: ["A.", S2] } };
  const krec = { segments: [{ content: "Some powers meet the dilemma" }, { content: BAD }] };
  const vErr = (verdicts) => X.validateContentBoundUnit({ verdicts }, { record: krec, input: kin }).error || "";
  ok(/`verdicts` carries 1 verdict\(s\) for 2 Segment\(s\)/.test(vErr([{ bound: true, why: "ok." }])), "(k) a verdict list short of the Segments was not refused");
  ok(/Segment 2: `bound` is false and `why` quotes no phrase of the `content` clause/.test(vErr([{ bound: true, why: "ok." }, { bound: false, why: "a reference is unresolved." }])),
    "(k) an unbound verdict quoting no phrase of the clause was not refused");
  ok(/Segment 1: `why` is 13 words/.test(vErr([{ bound: true, why: "one two three four five six seven eight nine ten eleven twelve thirteen" }, { bound: true, why: "ok." }])),
    "(k) a `why` over twelve words was not refused");
  ok(!vErr([{ bound: true, why: "ok." }, { bound: false, why: '"the strongest one" resolves to nothing.' }]), "(k) a well-formed verdict list was refused");
  ok(X.contentBoundRefusal([{ bound: true, why: "ok." }, { bound: true, why: "ok." }], { segments: [{ content: "x" }, { content: GOOD }] }, kin) === null,
    "(k) the clause naming Russia, China and the United States was refused");
  // the sheet (src/proof-sheet/leg-sheet.mjs): an unbound verdict's reason stands beside its content cell, a bound one shows nothing
  const L = await import(pathToFileURL(join(repo, "src", "proof-sheet", "leg-sheet.mjs")).href);
  const cells = L.segmentsTable([{ content: "Some powers meet the dilemma" }, { content: BAD }], new Map(),
    [{ bound: true, why: "Every reference resolves." }, { bound: false, why: '"the strongest one" resolves to nothing.' }]);
  ok(cells.includes(`${BAD} <span class="unbound">not bound: &quot;the strongest one&quot; resolves to nothing.</span></td>`) && cells.split('class="unbound"').length === 2,
    `(k) the sheet does not show the unbound reason beside its content cell, and only there: ${cells}`);
  ok(!L.segmentsTable([{ content: GOOD }], new Map(), [{ bound: true, why: "ok." }]).includes("unbound"), "(k) the sheet shows a reason beside a bound clause");
  ok(/the record carries `content_bound` — the Harness judges each `content` clause in a call of its own/.test(X.validateExtractionAnswer({ content_bound: [] }, { paragraph_you_must_extract: { number: 1 } }).error || ""),
    "(k) the extraction call's answer carrying `content_bound` was not refused");
}

// (g) announced blocks stay with their paragraph
const ps = X.legParagraphs("One says:\n\n> a quoted line.\n\nThen a list:\n\n- first\n- second\n\nA new paragraph.");
ok(ps.length === 3 && ps[0].endsWith("> a quoted line.") && ps[1].endsWith("- second"), `(g) an announced block was cut into its own paragraph: ${JSON.stringify(ps)}`);

if (fails.length) { for (const f of fails) console.log(`FAIL ${f}`); process.exit(1); }
console.log("ok proof-sheet-extract");
JS
