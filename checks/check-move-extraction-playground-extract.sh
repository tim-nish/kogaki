#!/usr/bin/env bash
# check-move-extraction-playground-extract — the Extractor writes each paragraph's Extraction as a harness
# unit, from a fixed row, with a run record (kogaki#1384, owner decision 2026-10-15).
#
# WHAT THIS COVERS, driven end to end through `node src/move-extraction-playground/extract.mjs run` over a
# two-paragraph Leg and a FAKE judge binary this member writes (`KOGAKI_JUDGE_CLI`) — never
# the actual `claude` CLI:
#   (a) the run writes one Extraction per paragraph as a `.yaml` record read by the Brief's
#       YAML reader (kogaki#1413): `status` naming the run, `unit: paragraph <N> of 2 in
#       <slug>`, no `reader` (kogaki#1699), `segments` a list of maps, one per
#       sentence, carrying `content` and `operation`, `relation` on every Segment but
#       Segment 1 (kogaki#1510), and `manner` only where the answer filled one, paragraph 2's
#       Segment 2 here; `breaks` a list of tests; no Q4 Footing (kogaki#1414); a
#       `description` and no `technique` (kogaki#1412); and the record renders to Markdown
#       for reading.
#   (b) `tools/move_ingest.py`'s own `read_extraction` and `derive_from_extraction` — the
#       readers behind `passage --from-extraction` — admit both files unedited, copying their
#       `takes` and `leaves` onto the Move (kogaki#1698), and refuse
#       a Markdown Extraction by name (`extraction-form`).
#   (b2) `run_from_extraction`, the call the Move-Extraction Playground's ingest stage makes, validates
#       through the Adapter's own validator (kogaki#1418): the Moves it admits from those
#       files are read by `moveContract` without refusal, and an over-long `description`
#       is refused in the Adapter's words with nothing written; the ingest carries no
#       type check of its own and refuses every record the Adapter refuses (a retired
#       `technique`, a `before` written as one joined line, prose `breaks`, no `segments`, no `description`,
#       an unknown figure kind, a field ROLES.json maps to no role) in the sentence
#       src/move-validate.mjs prints; and the
#       Brief's compose and Move-fit judge inputs read the admitted Moves, each bound to a
#       Leg, without refusal.
#   (b3) an entry of `segments` is read as a Segment or refused, never dropped (kogaki#1416):
#       an admitted Move carries exactly as many Segments as the Extraction lists; an entry
#       carrying a label key, one with an empty `operation`, one after the first with no
#       `relation`, and a Segment 1 carrying one, are each refused naming the Segment, the
#       last three in the Adapter's words; the Move admitted from paragraph 2 carries its
#       `manner` on Segment 2 and on no other (kogaki#1510); and
#       `tools/move_ingest.py` carries no label set.
#   (c) the run directory holds, per paragraph, the prompt as rendered (the
#       `extraction_unit` row through `judgePrompt`, FORMAT verbatim above the input
#       marker, and a JSON skeleton of the record with the paragraph number filled as a
#       number and `answers` holding exactly q1 to q3), the answer, and the Round count
#       with every refusal: paragraph 1's first answer omits an `operation` clause and its
#       second names its paragraph as a string, each refused naming the field, and the
#       third Round's prompt carries BOTH refusals, oldest first; paragraph 2's first
#       answer writes a `subject_nouns` entry into a `breaks` test and is refused
#       naming the test (rule 7, kogaki#1440); the prompt carries rule 7's
#       sentences; and it carries rule 9's read-aloud test, which excludes the page's
#       layout from `operation`, `content`, `relation` and `manner` (kogaki#1478, kogaki#1510).
#   (d) every call ran with `--tools ""`, on the shared supervisor, the content-bound and constraints calls among them.
#   (e) the reader table is retired (kogaki#1699): no paragraph's input carries `reader_state_before`,
#       no record or prompt skeleton carries `reader`, the table carries no `state_bound_unit`
#       row, and an answer carrying `reader` is refused as an undeclared key.
#   (f) the validator refuses, naming the field:
#       a Segment count other than the sentence count, an `operation` clause naming a
#       subject noun, a `relation` on Segment 1 of a paragraph with earlier text (rule 5,
#       kogaki#1510), an empty `relation` on any later Segment, a `manner` restating the
#       `operation` or naming a subject noun (kogaki#1510), a subject noun in a `breaks` test, a word outside the Latin script in a `relation` or a `breaks` test, while a
#       subject noun in a `content` clause alone validates (kogaki#1519), a `breaks` given as keyed fields rather than a list of tests,
#       and an answer for the retired Q4 (kogaki#1414); a record carrying the retired
#       `technique`, and a `description` over 200 characters, naming its length
#       (kogaki#1412); a `manner` filled on one Segment and empty on the rest validates; and
#       a record wrong on BOTH `answers` and `segments` at once is
#       refused naming both (kogaki#1395); a `content` clause opening on a method verb is
#       refused naming the paragraph, the Segment and the verb, for the specimen `explains`
#       and for a second listed verb, while the clause opening on what the sentence says
#       validates, and FORMAT's rule 7 carries the sentence verbatim (kogaki#1554); a
#       `breaks` test instructing wording ("must open with", "must stay in one
#       sentence") is refused naming the field and the phrase, while a `breaks` test whose
#       change is stated in one sentence, and a `manner` carrying the instruction, validate
#       (kogaki#1604).
#   (g) a block quotation or list announced by a paragraph stays with it (rule 1).
#   (h) the constraints, judged against the Segments (kogaki#1698): a run over six paragraphs writes
#       `takes` and `leaves` on every record and no obligation key; a `takes` entry is judged against
#       Segment 1 and a `leaves` entry against the Segment it names; a question left standing that no
#       entry names, a `takes` entry Segment 1 does not take up and a `leaves` entry a later Segment
#       explains are each refused naming the Segment or the entry, the refusal reaching the
#       Extractor's next Round; the call's input is the four kinds with their definitions, the
#       Segments' `operation` and `relation` and the two lists, and its prompt carries no `passage`,
#       `earlier_paragraphs`, `reader_state_before` or `subject_nouns` key.
#   (i) the constraints on the record and in the call's answer (kogaki#1698): the record refuses a
#       kind outside the four naming it, a `what` naming a subject noun, a `takes` entry carrying
#       `segment`, a `leaves` entry naming a Segment the paragraph lacks and a missing `takes`; the
#       answer is refused by name for a missing or undeclared key, a kind outside the four, a `why`
#       over twelve words, `supported` not a boolean and lists not repeating the input's, and, where
#       the lists were to be derived, for an unsupported entry or a non-empty `unnamed`.
#   (l) the library's constraints, derived (kogaki#1698): `rejudge --constraints --library <dir>`
#       over two fixture records hands the call each record's Segments and `obligation` with no
#       list and no `before` or `after`, changes no record without `--write`, and with it appends both
#       lists, every other line byte-identical, an obligation's question becoming a `leaves` entry of
#       kind `answer`; the records load; each run is recorded as `rejudge-<timestamp>` under the
#       `move-extraction-playground` lane of the `--runs-root` it passed and never beside the library (kogaki#1754);
#       a second run replaces the lists in place; a fourth run prunes the oldest, leaving three.
#   (m2) the obligation retired from the library (kogaki#1701): `rejudge --constraints --write
#       --retire-obligation` over a fixture library carrying `obligation` and `obligation_triggers`
#       leaves no record carrying either, every record loading in the Adapter and the obligation's
#       question carried as a `leaves` entry; `--retire-obligation` without `--write` is refused as
#       usage. (l)'s record still carrying `obligation` after a plain `--write` is refused naming it.
#   (j) the retired keys (kogaki#1583): a record carrying `discharges` or `obligation_content` is
#       refused as an undeclared key, the extraction call's answer carrying `obligation` or
#       `obligation_triggers` is refused as retired (kogaki#1698), and FORMAT carries rule 8 and the
#       retired rule 10 verbatim.
#   (k) the content clause, judged source-bound (kogaki#1614), over the discriminating pair of the
#       2026-10-26 run: the clause "two of the countries sit where the dilemma arises readily, while
#       the strongest one sits where it does not" is refused naming "the strongest one", the refusal
#       reaches the Extractor's next Round verbatim beside the refused answer, and the clause naming
#       Russia, China and the United States passes and is written with `content_bound`, one verdict
#       per Segment; `p1/rounds.json` names both calls' Rounds; the verdict call's input is each
#       sentence beside its clause with `subject_nouns`; a clause refused on every Round stops the run
#       at the Extractor's own budget, writing nothing; and the verdict answer's shape -- one per
#       Segment, a `why` of at most twelve words, an unbound verdict quoting a phrase of its clause --
#       is refused by name, as is the extraction call's answer carrying `content_bound`; and the sheet's
#       Segments table shows an unbound verdict's reason beside its content cell, and nothing for a bound one.
#   (m) the state retired from the library (kogaki#1699): `rejudge --constraints --write
#       --retire-state` over a fixture library carrying `before`, `after` and `after_segment` leaves no
#       record carrying any of the three, every record loading in the Adapter; `--retire-state`
#       without `--write`, and the deleted `rejudge --state`, are refused as usage.
#
# NOT COVERED, stated rather than implied: the call-limit stop and the stall bound are the
# shared supervisor's, held by checks/check-brief-reader-path-job.sh. Whether a live model's
# Extraction is any good is the owner's reading, never linted here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, copyFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
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
const X = await import(pathToFileURL(join(repo, "src", "move-extraction-playground", "extract.mjs")).href);
const root = mkdtempSync(join(tmpdir(), "move-extraction-playground-extract-"));

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
  // The constraints call (kogaki#1698): its first answer carries no \`unnamed\` and is refused;
  // every later one supports each given entry and names nothing left unnamed.
  if (input.kinds) {
    const seen = existsSync(dir + "/constraints-calls") ? Number(readFileSync(dir + "/constraints-calls", "utf8")) : 0;
    writeFileSync(dir + "/constraints-calls", String(seen + 1));
    const v = (x) => ({ ...x, supported: true, why: "The Segment supports it." });
    process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify({ takes: input.takes.map(v), leaves: input.leaves.map(v), ...(seen ? { unnamed: [] } : {}) }) }) + "\\n");
    process.exit(0);
  }
  appendFileSync(dir + "/prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const p = input.paragraph_you_must_extract;
  const first = p.number === 1;
  const counterPath = dir + "/round-" + p.number;
  const round = (existsSync(counterPath) ? Number(readFileSync(counterPath, "utf8")) : 0) + 1;
  writeFileSync(counterPath, String(round));
  if ("reader_state_before" in input) appendFileSync(dir + "/carried.jsonl", JSON.stringify(input.reader_state_before) + "\\n");
  const record = {
    version: "1", paragraph: p.number, source: "not given", prior_text: first ? "not assumed — opens on a fact" : "assumed — \\"So\\" takes up the previous paragraph",
    language: "English", subject_nouns: ["installer", "kit"],
    answers: { q1: "Hands the reader one fact and its cost.", q2: "Raises who owns the copy.", q3: "Attention from an unasked act." },
    what_it_does: first ? "Hands the reader a fact and then the cost of it." : "Draws the consequence of the previous act for the reader.",
    segments: p.sentences.map((s, i) => ({
      content: "CONTENT-" + p.number + "-" + (i + 1) + " names what the copy does.",
      operation: "states one consequence of an act the reader did not ask for.",
      relation: i === 0 ? "" : "widens the step before it",
      manner: !first && i === 1 ? "a brief direct statement, given with no elaboration." : "" })),
    takes: first ? [] : [{ kind: "answer", what: "who owns the copy" }],
    leaves: first ? [{ kind: "answer", what: "who owns the copy", segment: 2 }] : [],
    why_this_order: "The fact comes before its cost.", presupposes: "The reader has a tree of their own.",
    breaks: ["drop the fact — the cost floats", "put the cost first — no ground", "add a second example — the point blurs"],
    description: "Names an act, then names who pays for it.", name: "name_an_act_then_its_cost_" + p.number, notes: "",
  };
  if (first && round === 1) delete record.segments[0].operation;
  if (first && round === 2) record.paragraph = String(p.number);
  if (!first && round === 1) record.breaks[0] = "drop the installer — the cost floats";
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(record) }) + "\\n");
  process.exit(0);
});
`);
chmodSync(judge, 0o755);

const out = join(root, "out");
const r = spawnSync(process.execPath, ["src/move-extraction-playground/extract.mjs", "run", "--leg", join(root, "leg-fixture.txt"), "--out", out],
  { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: judge, PSX_FIXTURE_DIR: root }, timeout: 300000 });
ok(r.status === 0, `(a) the run exited ${r.status}: ${r.stdout}${r.stderr}`);
const files = [join(out, "name_an_act_then_its_cost_1.yaml"), join(out, "name_an_act_then_its_cost_2.yaml")];
const runDir = (r.stdout.match(/^run directory: (.+)$/m) || [])[1];
const { parseYaml, stringifyYaml } = await import(pathToFileURL(join(repo, "src", "yaml.mjs")).href);
const recordOf = (f) => { try { return parseYaml(readFileSync(f, "utf8"), f); } catch (e) { return { parse_error: e.message }; } };

// (a) the record layout: one YAML record per paragraph (kogaki#1413), its
// Segments a list of maps, no reader table (kogaki#1699), its
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
  for (const k of ["name", "passage", "answers", "what_it_does", "segments", "why_this_order", "presupposes", "breaks", "description"]) {
    ok(rec[k] !== undefined, `(a) ${f} carries no \`${k}\``);
  }
  ok(rec.reader === undefined && rec.dimensions_changed === undefined, `(a) ${f} carries the retired reader table (kogaki#1699)`);
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
  ok(!md.includes("## 2. Reader") && ["## Passage", "## Answers", "## 3. The order inside the Passage", "## 5. Where it would break"].every((h) => md.includes(`\n${h}\n`))
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
    rec = move_ingest.read_extraction(f)[1]
    p = move_ingest.derive_from_extraction(rec)
    if not p.admitted:
        bad.append("%s: %s" % (f, p.refusal))
    elif p.mapping.get("takes") != rec.get("takes") or p.mapping.get("leaves") != rec.get("leaves") or not (rec.get("takes") or rec.get("leaves")):
        bad.append("%s: the Move does not carry the Extraction's takes and leaves: %r" % (f, p.mapping))
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
// -- the call `src/move-extraction-playground/leg-run.mjs`'s ingest stage makes -- validates each candidate
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
    bad.append("an over-long description was admitted by the Move-Extraction Playground's ingest stage")
except m.Refusal as e:
    if "condition adapter" not in str(e) or "is 201 characters" not in str(e) or "at most 200" not in str(e):
        bad.append("the over-long description was not refused in the Adapter's words: %s" % e)
if [n for n in os.listdir(moves2) if n.endswith(".yaml")]:
    bad.append("a refused Extraction left a Move in the library")
# THE OBLIGATION IS NOT CARRIED (kogaki#1701): the Move's obligation is retired for leaves,
# so an Extraction written before kogaki#1698 carrying the field yields a Move record without it,
# which the Adapter loads and reads no obligation from; one without it yields none either.
obligation = ["leverage", "margin"]
for w in r["written"] or []:
    if "obligation" in m.read_extraction(w)[1]:
        bad.append("a Move admitted from an Extraction without the field carries obligation: %s" % w)
record = m.read_extraction(files[1])[1]
record["obligation"] = obligation
obl_path = os.path.join(tmp, "obligation.yaml")
with open(obl_path, "w") as h:
    h.write(m.yaml_write(record))
moves3 = os.path.join(tmp, "moves3")
os.makedirs(moves3)
shutil.copy(os.path.join("moves", "ROLES.json"), moves3)
r3 = m.run_from_extraction([obl_path], moves3, os.path.join(tmp, "out3"), select="accept")
if not (r3["written"] or []):
    bad.append("an Extraction carrying the retired obligation admitted no Move")
for w in r3["written"] or []:
    if "obligation" in m.read_extraction(w)[1]:
        bad.append("the Move record carries the Extraction's retired obligation: %r" % m.read_extraction(w)[1].get("obligation"))
    read = subprocess.run(["node", "--input-type=module", "-e",
        "const { moveContract } = await import(process.argv[1]);"
        "process.stdout.write(JSON.stringify(moveContract(process.argv[2], process.argv[3])));",
        "file://" + os.path.abspath(os.path.join("src", "compose.mjs")), os.path.basename(w)[:-len(".yaml")], moves3],
        capture_output=True, text=True)
    got = json.loads(read.stdout or "{}")
    if got.get("error") or "obligation" in got:
        bad.append("the Adapter does not load the admitted Move without an obligation: %s%s" % (read.stdout, read.stderr))
if len(r3["written"] or []) != 1:
    bad.append("run_from_extraction wrote %r for the Extraction carrying an obligation" % r3["written"])
# ONE VALIDATOR: the ingest carries no type check of its own, and every record the
# Adapter refuses -- a retired \`technique\`, a \`before\` written as one joined line, \`breaks\` as prose, no
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
# carries one Segment per entry; each unreadable entry is refused naming the Segment, and nothing is written for any of them.
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
for edit, words in ((label, ("Segment 2 carries %sfunction%s" % (BT, BT), "cannot be read as a Segment")),
                    (no_operation, ("condition adapter", "Segment 2 carries no one-line %soperation%s" % (BT, BT))),
                    (no_relation, ("condition adapter", "Segment 2 carries no one-line %srelation%s" % (BT, BT))),
                    (first_relation, ("condition adapter", "Segment 1 carries a %srelation%s" % (BT, BT)))):
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
ok(gate.status === 0, `(b2) the Move-Extraction Playground's ingest stage is not the Adapter's gate: ${gate.stdout}${gate.stderr}`);

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
  const a1 = existsSync(join(p1, "rounds.json")) ? JSON.parse(readFileSync(join(p1, "rounds.json"), "utf8")) : {};
  ok(a1.rounds === 3, `(c) p1/rounds.json records ${a1.rounds} round(s), not 3`);
  ok(Array.isArray(a1.refusals) && a1.refusals.length === 2 && /Segment 1 carries no `operation`/.test(a1.refusals[0])
    && /names paragraph "1", not 1/.test(a1.refusals[1]),
    `(c) p1/rounds.json does not record both refusals in order: ${JSON.stringify(a1.refusals)}`);
  const prompts = readFileSync(join(root, "prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  ok(prompts.length === 5, `(c) the fake judge was called ${prompts.length} time(s), not 5`);
  ok(prompts[1] && prompts[1].includes(a1.refusals[0]) && !prompts[1].includes(a1.refusals[1]),
    "(c) the second round's prompt does not carry only the first round's refusal");
  ok(prompts[2] && prompts[2].includes(a1.refusals[0]) && prompts[2].includes(a1.refusals[1])
    && prompts[2].indexOf(a1.refusals[0]) < prompts[2].indexOf(a1.refusals[1]),
    "(c) the third round's prompt does not carry BOTH prior refusals, oldest first");
  const o1 = existsSync(join(p1, "constraints", "rounds.json")) ? JSON.parse(readFileSync(join(p1, "constraints", "rounds.json"), "utf8")) : {};
  ok(o1.rounds === 2 && /the answer carries no `unnamed`/.test((o1.refusals || [])[0] || ""),
    `(c) p1/constraints/rounds.json does not record the refused answer and the second round: ${JSON.stringify(o1)}`);
  const a2 = existsSync(join(runDir, "p2", "rounds.json")) ? JSON.parse(readFileSync(join(runDir, "p2", "rounds.json"), "utf8")) : {};
  ok(a2.rounds === 2, `(c) p2/rounds.json records ${a2.rounds} round(s), not 2`);
  // rule 7's mechanical half (kogaki#1440): a subject noun in a `breaks` test is refused naming the test
  ok(Array.isArray(a2.refusals) && a2.refusals.length === 1 && /`breaks` test 1 names "installer", one of your subject_nouns/.test(a2.refusals[0]),
    `(c) a subject noun in a \`breaks\` test was not refused naming the test: ${JSON.stringify(a2.refusals)}`);
  // rule 7's sentences reach the Extractor in its rendered instruction
  const instruction = prompt.slice(0, prompt.indexOf("# Extraction: the interaction contract"));
  for (const sentence of [
    "Segment 1's `operation` carries no reference to any earlier step or earlier paragraph.",
    "A later Segment's `operation` is the operation alone, and its `relation` carries the connection to the step before.",
  ]) ok(instruction.includes(sentence), `(c) the Extractor's rendered instruction does not carry rule 7's sentence: ${sentence}`);
  // rule 9 (kogaki#1478): the read-aloud test reaches the Extractor in FORMAT's own words, so neither copy can drift
  const formatText = readFileSync(join(repo, "passages", "FORMAT.md"), "utf8").replace(/\s+/g, " ");
  for (const sentence of [
    "`operation`, `content`, `relation` and `manner` describe what the sentence does when read aloud.",
    "Anything the reader would know only from the page, such as emphasis, bullets, numbering, headings, line breaks or a quotation's marks, is layout: it is recorded in `passage` and nowhere else, never in `operation`, `content`, `relation` or `manner`.",
    "\"Introduces a bolded term\" fails the test; \"introduces a term\" passes it.",
  ]) {
    ok(instruction.includes(sentence), `(c) the Extractor's rendered instruction does not carry rule 9's read-aloud test: ${sentence}`);
    ok(formatText.includes(sentence), `(c) passages/FORMAT.md's rule 9 does not carry the instruction's sentence: ${sentence}`);
  }

  // (e) the reader table is retired (kogaki#1699)
  const in2 = prompts[3] ? JSON.parse(prompts[3].slice(prompts[3].indexOf("----- INPUT (JSON) -----") + 24)) : null;
  ok(in2 && !("reader_state_before" in in2) && !existsSync(join(root, "carried.jsonl")),
    `(e) a paragraph's input still carries \`reader_state_before\`: ${JSON.stringify(in2)}`);
  ok(!/"reader":/.test(prompt.slice(prompt.indexOf("THE RECORD'S SHAPE AS JSON"), prompt.indexOf("----- INPUT (JSON) -----"))), "(e) the prompt's record skeleton still carries `reader`");
  const table = JSON.parse(readFileSync(join(repo, "src", "move-extraction-playground", "extraction-workflow.json"), "utf8"));
  ok(!("state_bound_unit" in table), "(e) the extraction table still carries a `state_bound_unit` row");
}

// (d) --tools ""
const argvs = existsSync(join(root, "argv.jsonl")) ? readFileSync(join(root, "argv.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
ok(argvs.length === 10 && argvs.every((a) => { const i = a.indexOf("--tools"); return i >= 0 && a[i + 1] === ""; }),
  `(d) a call ran without \`--tools ""\`: ${JSON.stringify(argvs)}`);

// (f) the validator, directly
const persona = { reader: "a developer", prior_knowledge: "none" };
const input = X.extractionUnitInput({ passage: "s", paragraphs: [P1, P2], index: 1, namesTaken: [], persona });
const good = () => ({ version: "1", paragraph: 2, source: "not given", prior_text: "assumed", language: "English", subject_nouns: ["installer"],
  answers: { q1: "a", q2: "b", q3: "c" }, what_it_does: "x by taking up the last point",
  segments: [1, 2, 3].map((_, i) => ({ content: "c", operation: "states one consequence plainly", relation: i === 0 ? "" : "r", manner: "" })),
  takes: [], leaves: [], why_this_order: "w", presupposes: "p", breaks: ["a change — a loss"], description: "d", name: "n_m", notes: "" });
ok(!X.validateExtractionUnit(good(), input).error, `(f) the validator refused a good record: ${X.validateExtractionUnit(good(), input).error}`);
// the reader table is retired (kogaki#1699): an answer carrying `reader` is an undeclared key.
const m1 = good(); m1.reader = [{ dimension: "knowledge", before: "b", after: "a", segment: "1" }];
ok(/carries `reader`, which it does not declare/.test(X.validateExtractionUnit(m1, input).error || ""), `(e) a record carrying the retired \`reader\` was not refused: ${X.validateExtractionUnit(m1, input).error}`);
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
// is refused in a `breaks` test and a `relation` as in `operation` and
// `manner`, each naming the field; `content` is bound to the source and may name the subject.
const m4l = good(); m4l.breaks = ["a change — a loss", "name the installer's version — the step binds one subject"];
ok(/`breaks` test 2 names "installer", one of your subject_nouns/.test(X.validateExtractionUnit(m4l, input).error || ""), "(f) a break naming a subject noun was not refused naming the break");
const m4n = good(); m4n.segments[1].relation = "adds a point with また";
ok(/Segment 2: the `relation` clause carries "また", a word outside the Latin script/.test(X.validateExtractionUnit(m4n, input).error || ""), "(f) a relation carrying また was not refused naming the Segment");
const m4o = good(); m4o.breaks = ["drop 「なぜなら」 — the reason reads as a claim"];
ok(/`breaks` test 1 carries "「なぜなら」"/.test(X.validateExtractionUnit(m4o, input).error || ""), "(f) a break built on a source-language word was not refused naming the break");
const m4p = good(); m4p.segments[0].content = "says the installer owns the copy";
ok(!X.validateExtractionUnit(m4p, input).error, `(f) a record naming a subject noun in its content clause alone was refused: ${X.validateExtractionUnit(m4p, input).error}`);
// kogaki#1604
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

// (h) THE CONSTRAINTS, JUDGED AGAINST THE SEGMENTS (kogaki#1698): a fourth call per paragraph whose
// input is the four kinds, the record's Segments and its `takes` and `leaves`. The fake judge
// supports a `takes` entry where Segment 1's operation defines or answers, a `leaves` entry where
// the Segment it names poses a question or names a term no later Segment answers or defines, and
// lists in `unnamed` a question or term left standing that no entry names. Paragraph 1's first
// answer names nothing in `leaves`, paragraph 3's carries a `takes` entry Segment 1 does not take
// up, and paragraph 6's a `leaves` entry a later Segment explains: each is refused naming the entry
// or the Segment, the refusal reaches the Extractor's next Round verbatim, and the second answer
// is written. The call's rendered prompt carries no `passage`, `earlier_paragraphs`,
// `reader_state_before` or `subject_nouns` key.
const H_OPS = {
  1: [["poses a direct question about what decides a pattern.", ""], ["gives the question one instance.", "grounds the question before it"], ["names the parts that decide it, bare.", "fills the frame the step before set up"]],
  2: [["defines a term for a recurring pattern.", ""], ["asserts a claim without giving its grounds.", "extends the term defined before it"], ["gives the pattern a label.", "closes on the claim before it"]],
  3: [["states a general claim.", ""], ["names a term for the claim's cause.", "grounds the claim before it"], ["carries the claim to its consequence.", "runs the claim before it forward"]],
  4: [["defines a graded quantity.", ""], ["says it again in plain words.", "restates the definition before it"], ["states how the quantity bears on an outcome, naming two opposite ends of its range.", "applies the quantity defined before it"]],
  5: [["poses a direct question about what decides a pattern.", ""], ["answers the question with one cause.", "answers the question before it"]],
  6: [["names a term for the claim's cause.", ""], ["defines the term in one sentence.", "gives the meaning of the term before it"]],
};
const H_LEG = "Copies drift. One case shows it. Haste and habit decide it.\n\nThe pattern is a lapse. It always spreads. Call it drift.\n\nCopies fail. Call the cause inertia. So the copy stays wrong.\n\nDrift is graded. It is how far a copy strays. Little drift keeps a copy right, and much drift breaks it.\n\nWhy do copies drift? Haste makes them drift.\n\nCall the cause inertia. Inertia is the habit of leaving a thing as it is.\n";
const QUESTION = "what decides the pattern?", TERM = "the named cause";
const H_JUDGE = `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
if (process.argv.includes("--version")) { console.log("fake-judge 1.0"); process.exit(0); }
const dir = process.env.PSX_FIXTURE_DIR;
const OPS = ${JSON.stringify(H_OPS)};
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const input = JSON.parse(prompt.slice(prompt.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));
  const answer = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  if (input.subject_nouns && !input.paragraph_you_must_extract) {
    return answer({ verdicts: input.segments.map(() => ({ bound: true, why: "Every reference resolves to the sentence." })) });
  }
  const left = (ops) => {
    const asks = ops.findIndex((o) => /poses a direct question/.test(o));
    const names = ops.findIndex((o) => /names a term/.test(o));
    return [...(asks >= 0 && !ops.slice(asks + 1).some((o) => /answers/.test(o)) ? [{ kind: "answer", what: ${JSON.stringify(QUESTION)}, segment: asks + 1 }] : []),
      ...(names >= 0 && !ops.slice(names + 1).some((o) => /defines/.test(o)) ? [{ kind: "explain", what: ${JSON.stringify(TERM)}, segment: names + 1 }] : [])];
  };
  if (input.kinds) {
    appendFileSync(dir + "/constraints-inputs.jsonl", JSON.stringify(input) + "\\n");
    appendFileSync(dir + "/constraints-prompts.jsonl", JSON.stringify(prompt) + "\\n");
    const ops = input.segments.map((s) => s.operation);
    const owed = left(ops);
    if (input.takes === null) return answer({ takes: [], leaves: owed.map((x) => ({ ...x, supported: true, why: "The Segment leaves it standing." })), unnamed: [] });
    const named = (x) => input.leaves.some((y) => y.kind === x.kind && y.segment === x.segment);
    return answer({
      takes: input.takes.map((x) => ({ ...x, supported: /defines|answers/.test(ops[0]), why: /defines|answers/.test(ops[0]) ? "Segment 1 takes it up." : "Segment 1 takes nothing up." })),
      leaves: input.leaves.map((x) => { const s = owed.some((y) => y.kind === x.kind && y.segment === x.segment);
        return { ...x, supported: s, why: s ? "The named Segment leaves it standing." : "A later Segment explains what this entry names." }; }),
      unnamed: owed.filter((x) => !named(x)).map((x) => ({ ...x, why: "Segment " + x.segment + " leaves it and no entry names it." })) });
  }
  const p = input.paragraph_you_must_extract;
  const counter = dir + "/round-" + p.number;
  const round = (existsSync(counter) ? Number(readFileSync(counter, "utf8")) : 0) + 1;
  writeFileSync(counter, String(round));
  const ops = OPS[p.number];
  const leaves = p.number === 1 && round === 1 ? [] : p.number === 6 && round === 1 ? [{ kind: "explain", what: ${JSON.stringify(TERM)}, segment: 1 }] : left(ops.map((o) => o[0]));
  const takes = p.number === 3 && round === 1 ? [{ kind: "explain", what: "a term an earlier step named" }] : p.number === 4 ? [{ kind: "explain", what: "the quantity just named" }] : [];
  answer({ version: "1", paragraph: p.number, source: "not given", prior_text: "not assumed", language: "English", subject_nouns: ["installer"],
    answers: { q1: "Hands the reader one claim.", q2: "Raises why it holds.", q3: "Attention from a plain claim." },
    what_it_does: "Hands the reader one claim.",
    segments: ops.map(([operation, relation], i) => ({ content: "CONTENT-" + p.number + "-" + (i + 1) + " is about copies.", operation, relation, manner: "" })),
    takes, leaves,
    why_this_order: "The claim comes first.", presupposes: "The reader keeps copies.", breaks: ["drop the instance — the claim floats"],
    description: "States a claim, then its parts.", name: "claim_then_parts_" + p.number, notes: "" });
});
`;
const { MOVE_CONSTRAINT_KINDS } = await import(pathToFileURL(join(repo, "src", "move-validate.mjs")).href);
const { validateMoveRecord } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const hroot = join(root, "h");
const hjudge = join(hroot, "fake-judge.mjs");
{
  mkdirSync(hroot, { recursive: true });
  writeFileSync(hjudge, H_JUDGE);
  chmodSync(hjudge, 0o755);
  writeFileSync(join(hroot, "leg.txt"), H_LEG);
  const hout = join(hroot, "out");
  const r = spawnSync(process.execPath, ["src/move-extraction-playground/extract.mjs", "run", "--leg", join(hroot, "leg.txt"), "--out", hout],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: hjudge, PSX_FIXTURE_DIR: hroot }, timeout: 300000 });
  ok(r.status === 0, `(h) the six-paragraph run exited ${r.status}: ${r.stdout}${r.stderr}`);
  const rec = (n) => { const f = join(hout, `claim_then_parts_${n}.yaml`); return existsSync(f) ? parseYaml(readFileSync(f, "utf8"), f) : null; };
  const want = {
    1: [[], [{ kind: "answer", what: QUESTION, segment: 1 }]], 2: [[], []], 3: [[], [{ kind: "explain", what: TERM, segment: 2 }]],
    4: [[{ kind: "explain", what: "the quantity just named" }], []], 5: [[], []], 6: [[], []],
  };
  for (const [n, [takes, leaves]] of Object.entries(want)) {
    const x = rec(n);
    ok(x && JSON.stringify(x.takes) === JSON.stringify(takes) && JSON.stringify(x.leaves) === JSON.stringify(leaves),
      `(h) paragraph ${n}'s record does not carry takes ${JSON.stringify(takes)} and leaves ${JSON.stringify(leaves)}: ${x ? JSON.stringify([x.takes, x.leaves]) : "no record"}`);
    ok(x && !("obligation" in x) && !("obligation_triggers" in x), `(h) paragraph ${n}'s record carries an obligation key`);
  }
  const run = readdirSync(hout).find((d) => d.startsWith("extractor-run-"));
  const att = (n) => { const f = run ? join(hout, run, `p${n}`, "rounds.json") : ""; return f && existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}; };
  const refusal = (n) => (att(n).refusals || []).join("\n");
  ok(/paragraph 1, Segment 1: leaves a question no `leaves` entry names \(answer: "what decides the pattern\?"\)/.test(refusal(1)) && att(1).constraints_rounds === 2,
    `(h) paragraph 1's unnamed question was not refused naming the Segment: ${JSON.stringify(att(1))}`);
  ok(/paragraph 3: the `takes` entry 1 \(explain: "a term an earlier step named"\) is not supported by Segment 1/.test(refusal(3)),
    `(h) paragraph 3's takes entry was not refused against Segment 1: ${refusal(3)}`);
  ok(/paragraph 6: the `leaves` entry 1 \(explain: "the named cause"\) is not supported by Segment 1/.test(refusal(6)),
    `(h) paragraph 6's leaves entry was not refused against the Segment it names: ${refusal(6)}`);
  const p1Retry = run ? join(hout, run, "p1", "extract-2", "reader-path-job-units.json") : "";
  const p1Prompt = p1Retry && existsSync(p1Retry) ? JSON.stringify(JSON.parse(readFileSync(p1Retry, "utf8"))) : "";
  ok(p1Prompt.includes("leaves a question no `leaves` entry names"), "(h) paragraph 1's constraints refusal does not reach the Extractor's next round");
  const inputs = existsSync(join(hroot, "constraints-inputs.jsonl")) ? readFileSync(join(hroot, "constraints-inputs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  ok(inputs.length === 9 && inputs.every((x) => JSON.stringify(Object.keys(x)) === '["kinds","segments","takes","leaves","obligation"]'
    && x.segments.every((s) => JSON.stringify(Object.keys(s)) === '["operation","relation"]') && x.obligation === null),
    `(h) the constraints calls are not nine, each handed the kinds, the Segments' operation and relation and the two lists alone: ${inputs.length}`);
  ok(inputs.length && JSON.stringify(inputs[0].kinds) === JSON.stringify(MOVE_CONSTRAINT_KINDS), "(h) the constraints call is not handed the four kinds with their definitions");
  const cprompts = existsSync(join(hroot, "constraints-prompts.jsonl")) ? readFileSync(join(hroot, "constraints-prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  ok(cprompts.length && cprompts.every((t) => t.includes("You are the judge at the Extractor workflow's `constraints_unit` judgment point.")
    && !/"(passage|earlier_paragraphs|reader_state_before|subject_nouns)"/.test(t)),
    "(h) the constraints call's prompt is not the constraints_unit row, or carries a passage, earlier paragraphs, a predecessor state or subject nouns");
}

// (i) THE CONSTRAINTS ON THE RECORD AND IN THE CALL'S ANSWER (kogaki#1698): the Extraction record
// refuses a `kind` outside the four naming it, a `what` naming a subject noun, a `takes` entry
// carrying `segment` and a `leaves` entry naming a Segment the paragraph lacks; the call's answer
// is refused, by name, for a missing key, an undeclared key, a kind outside the four, a `why` over
// twelve words, `supported` not a boolean, lists that do not repeat the input's, and, where the
// lists were to be derived, an unsupported entry or a non-empty `unnamed`.
{
  const err = (edit) => X.validateExtractionUnit({ ...good(), ...edit }, input).error || "";
  ok(err({ leaves: [{ kind: "answer", what: "the posed question", segment: 3 }] }) === "", `(i) a record carrying one \`leaves\` entry was refused: ${err({ leaves: [{ kind: "answer", what: "the posed question", segment: 3 }] })}`);
  ok(/`leaves` entry 1 names the kind `instance`, outside the closed set/.test(err({ leaves: [{ kind: "instance", what: "the posed question", segment: 1 }] })),
    `(i) a kind outside the four was not refused naming it: ${err({ leaves: [{ kind: "instance", what: "the posed question", segment: 1 }] })}`);
  ok(/`takes` entry 1's `what`/.test(err({ takes: [{ kind: "explain", what: "what the installer is" }] })),
    `(i) a \`what\` naming a subject noun was not refused: ${err({ takes: [{ kind: "explain", what: "what the installer is" }] })}`);
  ok(/`takes` entry 1 carries `segment`/.test(err({ takes: [{ kind: "answer", what: "the posed question", segment: 1 }] })), "(i) a takes entry carrying segment was not refused");
  ok(/`leaves` entry 1: `segment` names Segment "4", and the Move has Segments 1 to 3/.test(err({ leaves: [{ kind: "answer", what: "the posed question", segment: 4 }] })),
    "(i) a leaves entry naming a Segment the paragraph lacks was not refused");
  const { takes: _t, ...noTakes } = good();
  ok(/carries no `takes`/.test(X.validateExtractionUnit(noTakes, input).error || ""), "(i) a record without `takes` was not refused naming it");
  const judged = { kinds: MOVE_CONSTRAINT_KINDS, segments: [{ operation: "poses a question.", relation: "" }, { operation: "narrows it.", relation: "takes up the question before it" }],
    takes: [], leaves: [{ kind: "answer", what: "the posed question", segment: 1 }], obligation: null };
  const v = (why = "Segment 1 poses it and nothing answers it.") => ({ kind: "answer", what: "the posed question", segment: 1, supported: true, why });
  const aerr = (a, inp = judged) => X.validateConstraintsUnit(a, { input: inp, at: "paragraph 1" }).error || "";
  ok(aerr({ takes: [], leaves: [v()], unnamed: [] }) === "", `(i) a well-formed answer was refused: ${aerr({ takes: [], leaves: [v()], unnamed: [] })}`);
  const cases = [
    ["a missing key", { takes: [], leaves: [v()] }, /the answer carries no `unnamed`/],
    ["an undeclared key", { takes: [], leaves: [v()], unnamed: [], triggers: {} }, /the answer carries `triggers`, which it does not declare/],
    ["a kind outside the four", { takes: [], leaves: [{ ...v(), kind: "instance" }], unnamed: [] }, /names the kind `instance`/],
    ["a why over twelve words", { takes: [], leaves: [v("one two three four five six seven eight nine ten eleven twelve thirteen")], unnamed: [] }, /`leaves` entry 1\.why is 13 words/],
    ["supported not a boolean", { takes: [], leaves: [{ ...v(), supported: "yes" }], unnamed: [] }, /`leaves` entry 1\.supported is "yes"/],
    ["lists not repeating the input", { takes: [], leaves: [{ ...v(), what: "another question" }], unnamed: [] }, /`leaves` does not repeat the input's 1 entr\(ies\) in order/],
  ];
  for (const [label, a, want] of cases) ok(want.test(aerr(a)), `(i) ${label} was not refused by name: ${aerr(a)}`);
  const derive = { ...judged, takes: null, leaves: null };
  ok(/judged unsupported in a list you derived/.test(aerr({ takes: [], leaves: [{ ...v(), supported: false }], unnamed: [] }, derive)), "(i) a derived entry judged unsupported was not refused");
  ok(/`unnamed` is not empty in a list you derived/.test(aerr({ takes: [], leaves: [v()], unnamed: [{ kind: "answer", what: "x", segment: 1, why: "left." }] }, derive)), "(i) a derived answer with unnamed entries was not refused");
  ok(aerr({ takes: [], leaves: [v()], unnamed: [] }, derive) === "", "(i) a derived answer was refused");
}

// (l) THE LIBRARY'S CONSTRAINTS, DERIVED (kogaki#1698): `rejudge --constraints --library <dir>`
// puts each record's Segments and `obligation` through the constraints call with
// no list given; without `--write` it changes no record, and with it writes both lists onto each
// record, leaving every other line byte-identical, and the library's own reader loads the result.
{
  const lib = join(hroot, "library");
  mkdirSync(lib, { recursive: true });
  copyFileSync(join(repo, "moves", "ROLES.json"), join(lib, "ROLES.json"));
  const recs = {
    asks: { id: "asks", description: "Poses a question and leaves it.",
      breaks: ["answer it at once — nothing is left to carry"], obligation: [QUESTION],
      segments: [{ operation: H_OPS[1][0][0] }, { operation: H_OPS[1][1][0], relation: H_OPS[1][1][1] }] },
    defines: { id: "defines", description: "Names a term and defines it.",
      breaks: ["drop the definition — the name is a label"],
      segments: [{ operation: H_OPS[6][0][0] }, { operation: H_OPS[6][1][0], relation: H_OPS[6][1][1] }] },
  };
  const texts = {};
  for (const [id, r] of Object.entries(recs)) { texts[id] = stringifyYaml(r); writeFileSync(join(lib, `${id}.yaml`), texts[id]); }
  const runsRoot = join(hroot, "runs");
  const rj = (args) => spawnSync(process.execPath, ["src/move-extraction-playground/extract.mjs", "rejudge", "--constraints", "--library", lib, "--runs-root", runsRoot, ...args],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: hjudge, PSX_FIXTURE_DIR: hroot }, timeout: 300000 });
  const dry = rj([]);
  ok(dry.status === 0 && /Moves derived: 2; no record was changed/.test(dry.stdout), `(l) the dry re-judge did not derive both Moves: ${dry.stdout}${dry.stderr}`);
  ok(Object.entries(texts).every(([id, t]) => readFileSync(join(lib, `${id}.yaml`), "utf8") === t), "(l) the re-judge without --write changed a record");
  const wet = rj(["--write"]);
  ok(wet.status === 0 && /written: 2/.test(wet.stdout), `(l) the re-judge with --write did not write both Moves: ${wet.stdout}${wet.stderr}`);
  for (const [id, t] of Object.entries(texts)) {
    const now = readFileSync(join(lib, `${id}.yaml`), "utf8");
    ok(now.startsWith(t) && /^takes:/m.test(now.slice(t.length)) && /^leaves:/m.test(now.slice(t.length)),
      `(l) ${id}'s record was not left byte-identical with takes and leaves appended: ${now}`);
    // `asks` keeps its `obligation` until `--retire-obligation` cuts it (m2), and the Adapter refuses
    // it naming the field (kogaki#1701); `defines`, carrying none, loads.
    const c = validateMoveRecord(parseYaml(now, `${id}.yaml`), lib, `${id}.yaml`);
    if (id === "asks") ok(/carries the retired `obligation`/.test(c.error || ""), `(l) asks's rewritten record, still carrying \`obligation\`, is not refused naming it: ${c.error || "loaded"}`);
    else ok(!c.error, `(l) ${id}'s rewritten record does not load: ${c.error}`);
  }
  const asks = parseYaml(readFileSync(join(lib, "asks.yaml"), "utf8"), "asks.yaml");
  ok(JSON.stringify(asks.leaves) === JSON.stringify([{ kind: "answer", what: QUESTION, segment: 1 }]) && JSON.stringify(asks.takes) === "[]",
    `(l) the obligation's question did not become a \`leaves\` entry of kind answer: ${JSON.stringify([asks.takes, asks.leaves])}`);
  const inputs = readFileSync(join(hroot, "constraints-inputs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)).filter((x) => x.takes === null);
  ok(inputs.length === 4 && inputs.some((x) => JSON.stringify(x.obligation) === JSON.stringify([QUESTION]))
    && inputs.every((x) => !("before" in x) && !("after" in x)),
    `(l) the re-judge did not hand the call each record's obligation, with no list and no state: ${JSON.stringify(inputs)}`);
  const lane = join(runsRoot, "move-extraction-playground");
  const runs = readdirSync(lane).filter((d) => /^rejudge-\d/.test(d)).sort();
  ok(runs.length === 2 && runs.every((d) => existsSync(join(lane, d, "constraints.json"))),
    `(l) each re-judge did not record its calls in a rejudge-<timestamp> directory under the move-extraction-playground lane: ${runs}`);
  ok(new RegExp(`^run directory: ${lane}/rejudge-\\d`, "m").test(wet.stdout), `(l) the re-judge did not name its run directory under the lane: ${wet.stdout}`);
  const twice = rj(["--write"]);
  const again = parseYaml(readFileSync(join(lib, "asks.yaml"), "utf8"), "asks.yaml");
  ok(twice.status === 0 && JSON.stringify(again.leaves) === JSON.stringify(asks.leaves) && (readFileSync(join(lib, "asks.yaml"), "utf8").match(/^leaves:/gm) || []).length === 1,
    "(l) a second --write run did not replace the two lists in place");
  const fourth = rj([]);
  const kept = readdirSync(lane).filter((d) => /^rejudge-\d/.test(d)).sort();
  ok(fourth.status === 0 && kept.length === 3 && !kept.includes(runs[0]),
    `(l) a fourth re-judge did not prune the lane to its three newest runs: ${kept}`);
  ok(![lib, hroot].some((d) => readdirSync(d).some((f) => f.startsWith("rejudge-run-"))), "(l) a re-judge wrote a rejudge-run-* directory beside the library");
}

// (m) THE STATE RETIRED FROM THE LIBRARY (kogaki#1699): `rejudge --constraints --write --retire-state`
// writes `takes` and `leaves` onto each record and deletes its `before`, `after` and `after_segment`,
// so every record it writes loads in the Adapter; `--retire-state` without `--write`, and the
// deleted `rejudge --state`, are refused as usage.
{
  const lib = join(hroot, "retire");
  mkdirSync(lib, { recursive: true });
  copyFileSync(join(repo, "moves", "ROLES.json"), join(lib, "ROLES.json"));
  const segs = [{ operation: H_OPS[1][0][0] }, { operation: H_OPS[1][1][0], relation: H_OPS[1][1][1] }];
  const recs = {
    stated: { id: "stated", description: "Poses a question and leaves it.", before: { question: "holds: none." }, after: { question: "asks what decides the pattern." },
      after_segment: { question: "1" }, breaks: ["answer it at once — nothing is left to carry"], segments: segs },
    bare: { id: "bare", description: "Poses a question and leaves it.", after: { knowledge: "holds a question." }, breaks: ["drop it — nothing is left"], segments: segs },
  };
  for (const [id, r] of Object.entries(recs)) writeFileSync(join(lib, `${id}.yaml`), stringifyYaml(r));
  const rj = (args) => spawnSync(process.execPath, ["src/move-extraction-playground/extract.mjs", "rejudge", ...args, "--runs-root", join(hroot, "runs")],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: hjudge, PSX_FIXTURE_DIR: hroot }, timeout: 300000 });
  const dry = rj(["--constraints", "--library", lib, "--retire-state"]);
  ok(dry.status !== 0 && /usage:/.test(dry.stderr), `(m) --retire-state without --write was not refused as usage: ${dry.stdout}${dry.stderr}`);
  const old = rj(["--state", "--library", lib]);
  ok(old.status !== 0 && /usage:/.test(old.stderr), `(m) the deleted rejudge --state was not refused as usage: ${old.stdout}${old.stderr}`);
  const wet = rj(["--constraints", "--library", lib, "--write", "--retire-state"]);
  ok(wet.status === 0 && /written: 2/.test(wet.stdout), `(m) the retiring re-judge did not write both Moves: ${wet.stdout}${wet.stderr}`);
  for (const id of Object.keys(recs)) {
    const text = readFileSync(join(lib, `${id}.yaml`), "utf8");
    const now = parseYaml(text, `${id}.yaml`);
    ok(!/^(before|after|after_segment):/m.test(text) && ["before", "after", "after_segment"].every((k) => !(k in now)) && Array.isArray(now.takes) && Array.isArray(now.leaves),
      `(m) ${id} still carries a retired state field, or lacks its lists: ${text}`);
    const c = validateMoveRecord(now, lib, `${id}.yaml`);
    ok(!c.error, `(m) ${id}'s retired record does not load: ${c.error}`);
  }
}

// (m2) THE OBLIGATION RETIRED FROM THE LIBRARY (kogaki#1701): `rejudge --constraints --write
// --retire-obligation` writes `takes` and `leaves` onto each record and deletes its `obligation`
// and `obligation_triggers`, leaving no record carrying either and every record loading in the
// Adapter, the obligation's question carried as a `leaves` entry; `--retire-obligation` without
// `--write` is refused as usage.
{
  const lib = join(hroot, "retire-obligation");
  mkdirSync(lib, { recursive: true });
  copyFileSync(join(repo, "moves", "ROLES.json"), join(lib, "ROLES.json"));
  const segs = [{ operation: H_OPS[1][0][0] }, { operation: H_OPS[1][1][0], relation: H_OPS[1][1][1] }];
  const recs = {
    owed: { id: "owed", description: "Poses a question and leaves it.", breaks: ["answer it at once — nothing is left to carry"], segments: segs,
      obligation: [QUESTION], obligation_triggers: { question: { fired: true, why: "Segment 1 asks what no later one answers.", segment: 1 } } },
    plain: { id: "plain", description: "Poses a question and leaves it.", breaks: ["drop it — nothing is left"], segments: segs },
  };
  for (const [id, r] of Object.entries(recs)) writeFileSync(join(lib, `${id}.yaml`), stringifyYaml(r));
  const rj = (args) => spawnSync(process.execPath, ["src/move-extraction-playground/extract.mjs", "rejudge", "--constraints", "--library", lib, "--runs-root", join(hroot, "runs"), ...args],
    { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: hjudge, PSX_FIXTURE_DIR: hroot }, timeout: 300000 });
  const dry = rj(["--retire-obligation"]);
  ok(dry.status !== 0 && /usage:/.test(dry.stderr) && /--retire-obligation/.test(dry.stderr), `(m2) --retire-obligation without --write was not refused as usage: ${dry.stdout}${dry.stderr}`);
  const wet = rj(["--write", "--retire-obligation"]);
  ok(wet.status === 0 && /written: 2/.test(wet.stdout), `(m2) the retiring re-judge did not write both Moves: ${wet.stdout}${wet.stderr}`);
  for (const id of Object.keys(recs)) {
    const text = readFileSync(join(lib, `${id}.yaml`), "utf8");
    const now = parseYaml(text, `${id}.yaml`);
    ok(!/^obligation(_triggers)?:/m.test(text) && !("obligation" in now) && !("obligation_triggers" in now) && Array.isArray(now.takes) && Array.isArray(now.leaves)
      && now.description === recs[id].description && JSON.stringify(now.segments) === JSON.stringify(recs[id].segments),
      `(m2) ${id} still carries an obligation key, lacks its lists, or lost another field: ${text}`);
    const c = validateMoveRecord(now, lib, `${id}.yaml`);
    ok(!c.error, `(m2) ${id}'s retired record does not load: ${c.error}`);
  }
  const owed = parseYaml(readFileSync(join(lib, "owed.yaml"), "utf8"), "owed.yaml");
  ok(JSON.stringify(owed.leaves) === JSON.stringify([{ kind: "answer", what: QUESTION, segment: 1 }]),
    `(m2) the retired obligation's question is not carried as a \`leaves\` entry of kind answer: ${JSON.stringify(owed.leaves)}`);
}

// (j) THE RETIRED KEYS (kogaki#1583): a record carrying `discharges` or `obligation_content` is
// refused as an undeclared key, the extraction call's answer carrying `obligation` is refused, and
// FORMAT carries rule 8, `takes` and `leaves` (kogaki#1698), and the retired rule 10 verbatim.
{
  for (const k of ["discharges", "obligation_content"]) {
    const e = X.validateExtractionUnit({ ...good(), [k]: k === "discharges" ? true : ["leverage"] }, input).error || "";
    ok(new RegExp(`carries \`${k}\`, which it does not declare`).test(e), `(j) a record carrying \`${k}\` was not refused as an undeclared key: ${e}`);
  }
  for (const k of ["obligation", "obligation_triggers"]) {
    ok(new RegExp(`the record carries \`${k}\`, which is retired — \`leaves\` names what the paragraph leaves for later`).test(X.validateExtractionAnswer({ ...good(), [k]: ["x"] }, input).error || ""),
      `(j) the extraction call's answer carrying \`${k}\` was not refused`);
  }
  ok(!("open_obligation" in input), `(j) the extraction call's input still carries \`open_obligation\`: ${JSON.stringify(Object.keys(input))}`);
  const format = readFileSync(join(repo, "passages", "FORMAT.md"), "utf8");
  const rule8 = "8. **`takes` and `leaves` are the Move's constraints** (kogaki#1698, owner ruling 2026-11-06, replacing the obligation of kogaki#1583 and kogaki#1618). `takes` is what Segment 1 takes up on entry, written as what a predecessor could leave; `leaves` is what the paragraph's Segments leave for a later unit to take up.";
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
  if (input.kinds) return answer({ takes: input.takes.map((x) => ({ ...x, supported: true, why: "Segment 1 takes it up." })), leaves: input.leaves.map((x) => ({ ...x, supported: true, why: "The Segment leaves it." })), unnamed: [] });
  appendFileSync(dir + "/extract-prompts.jsonl", JSON.stringify(prompt) + "\\n");
  const n = (existsSync(dir + "/round") ? Number(readFileSync(dir + "/round", "utf8")) : 0) + 1;
  writeFileSync(dir + "/round", String(n));
  const p = input.paragraph_you_must_extract;
  answer({ version: "1", paragraph: p.number, source: "not given", prior_text: "not assumed", language: "English",
    subject_nouns: ["Russia", "China", "United States", "dilemma"],
    answers: { q1: "Places three powers against one test.", q2: "Raises which powers it binds.", q3: "Attention from a concrete contrast." },
    what_it_does: "Places named powers on either side of one test.",
    segments: [
      { content: "Some powers meet the dilemma more often than others", operation: "states a general claim.", relation: "", manner: "" },
      { content: process.env.PSX_ALWAYS || n === 1 ? ${JSON.stringify(BAD)} : ${JSON.stringify(GOOD)},
        operation: "sorts named cases to either side of the claim.", relation: "gives instances of the claim before it", manner: "" }],
    takes: [], leaves: [], why_this_order: "The claim comes first.", presupposes: "The reader knows the powers.", breaks: ["drop the instances — the claim floats"],
    description: "States a claim, then sorts named cases by it.", name: "sort_cases_by_a_claim", notes: "" });
});
`);
  chmodSync(kjudge, 0o755);
  const kRun = (tag, env = {}) => {
    const d = join(kroot, tag);
    mkdirSync(d, { recursive: true });
    const res = spawnSync(process.execPath, ["src/move-extraction-playground/extract.mjs", "run", "--leg", join(kroot, "leg.txt"), "--out", join(d, "out")],
      { encoding: "utf8", env: { ...process.env, KOGAKI_JUDGE_CLI: kjudge, PSX_FIXTURE_DIR: d, ...env }, timeout: 300000 });
    return { d, res, runDir: (res.stdout.match(/^run directory: (.+)$/m) || [])[1] || "" };
  };
  const pass = kRun("pass");
  ok(pass.res.status === 0, `(k) the content-bound run exited ${pass.res.status}: ${pass.res.stdout}${pass.res.stderr}`);
  const kf = join(pass.d, "out", "sort_cases_by_a_claim.yaml");
  const kw = existsSync(kf) ? recordOf(kf) : {};
  ok(((kw.segments || [])[1] || {}).content === GOOD, `(k) the written Segment 2 is not the clause naming Russia, China and the United States: ${JSON.stringify(kw.segments)}`);
  ok(JSON.stringify((kw.content_bound || []).map((v) => v.bound)) === "[true,true]", `(k) the record does not carry \`content_bound\`, one bound verdict per Segment: ${JSON.stringify(kw.content_bound)}`);
  const ka = existsSync(join(pass.runDir, "p1", "rounds.json")) ? JSON.parse(readFileSync(join(pass.runDir, "p1", "rounds.json"), "utf8")) : {};
  const refusal = (ka.refusals || [])[0] || "";
  ok(ka.rounds === 2 && ka.content_bound_rounds === 2 && /paragraph 1, Segment 2: the `content` clause leaves "the strongest one" unresolved/.test(refusal),
    `(k) p1/rounds.json does not name the refusal of "the strongest one" and both calls' rounds: ${JSON.stringify(ka)}`);
  ok(existsSync(join(pass.runDir, "p1", "content-bound", "rounds.json")) && existsSync(join(pass.runDir, "p1", "content-bound-2", "rounds.json")),
    "(k) each round's content-bound call has no rounds record of its own");
  const kp = existsSync(join(pass.d, "extract-prompts.jsonl")) ? readFileSync(join(pass.d, "extract-prompts.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  ok(kp.length === 2 && !kp[0].includes(refusal) && refusal && kp[1].includes(refusal) && kp[1].includes(BAD),
    `(k) the Extractor's second round does not carry the refusal verbatim beside the refused answer (${kp.length} prompt(s))`);
  const kb = existsSync(join(pass.d, "bound-inputs.jsonl")) ? readFileSync(join(pass.d, "bound-inputs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l)) : [];
  ok(kb.length === 2 && kb.every((x) => JSON.stringify(Object.keys(x)) === '["subject_nouns","segments"]'
    && x.segments.every((s) => JSON.stringify(Object.keys(s)) === '["sentence","content"]')) && kb[0].segments[1].sentence === S2,
    `(k) the content-bound call's input is not each sentence beside its content clause, with subject_nouns: ${JSON.stringify(kb[0])}`);
  const kcp = existsSync(join(pass.runDir, "p1", "content-bound", "prompt.md")) ? readFileSync(join(pass.runDir, "p1", "content-bound", "prompt.md"), "utf8") : "";
  ok(kcp.includes("You are the judge at the Extractor workflow's `content_bound_unit` judgment point."), "(k) p1/content-bound/prompt.md is not the content_bound_unit row rendered by judgePrompt");
  // within the Extractor's own Round budget: a clause refused on every Round stops the run
  const stop = kRun("stop", { PSX_ALWAYS: "1" });
  const budget = JSON.parse(readFileSync(join(repo, "kogaki.settings.json"), "utf8")).brief.unit_rounds;
  ok(stop.res.status === 1 && new RegExp(`the content-bound call refused the Extraction after ${budget} round\\(s\\) — paragraph 1, Segment 2: the \`content\` clause leaves "the strongest one" unresolved`).test(stop.res.stdout)
    && !existsSync(join(stop.d, "out", "sort_cases_by_a_claim.yaml")),
    `(k) a clause refused on every round did not stop the run at the Extractor's budget of ${budget}: ${stop.res.stdout}${stop.res.stderr}`);
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
  // the sheet (src/move-extraction-playground/leg-sheet.mjs): an unbound verdict's reason stands beside its content cell, a bound one shows nothing
  const L = await import(pathToFileURL(join(repo, "src", "move-extraction-playground", "leg-sheet.mjs")).href);
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
console.log("ok move-extraction-playground-extract");
JS
