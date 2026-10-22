#!/usr/bin/env bash
# check-brief-job-retry — the re-ask, attempt and failure-class rules of a
# Reader-path job unit: the retry prompt (j)-(m), the attempt count and the
# system-failure exit (v1)-(v5), no `rerun` left (v7), the no-tools sentence
# (y0) and the two failure classes with the Move fit judged in the unit
# (y1)-(y6). Cut from check-brief-reader-path-job.sh by kogaki#1464.
set -u
cd "$(dirname "$0")/.."

# FIXTURE ISOLATION. `emitGateDeclaration`, reached by the job's gate, writes an
# open-gate pointer and a gate-declaration sidecar keyed to the session id it
# reads from the environment. Inherited, that opens a live gate in whichever
# session runs this check and the gate-open hook then refuses every tool but
# the gate's own question — which is what stopped two implement workers on
# #1193. So the whole member runs under a fixture session id and scratch
# directories, and fails if a pointer naming the fixture session reached the
# live pointer directory (pointers are keyed by gate instance, so the match is
# on the session id they carry — another session's gate is not this check's).
live_gates="${KOGAKI_OPEN_GATES:-$HOME/.claude/kogaki-open-gates}"
iso="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-rpjob-iso-XXXXXX")"
trap 'rm -rf "$iso"' EXIT
export KOGAKI_OPEN_GATES="$iso/open-gates"
export GATE_DECLARATION_SIDECAR_DIR="$iso/gate-declarations"
export CLAUDE_CODE_SESSION_ID="check-brief-job-retry-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { readerPathAwaitStep, READER_PATH_JOB_SYSTEM_FAILURE_STATES } from "./src/workflow/detached-job.mjs";
import { READER_PATH_JOB_GATE_ID, GATE_CALL_SUFFIX } from "./src/workflow/gate.mjs";
import { judgePrompt, judgeRefusalBlock, JUDGE_INPUT_MARKER } from "./src/workflow/judge.mjs";
import { assembleSelection } from "./src/assemble.mjs";
import {
  root, JOB_UNIT_NO_TOOLS_SENTENCE, scratch, fakeJudge, mkNewScratch, mkNewRun, declareUnits, superviseSync, readRecord, runRecordPath, unitRowOf, unitStdoutFile,
} from "./checks/fixtures/brief-reader-path-job/fixtures.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const fails = [];
if (!JOB_UNIT_NO_TOOLS_SENTENCE) fails.push("(y0) the starter's units file carries no sentence ahead of the unit's own prompt");


// (j) THE REAL UNIT ROW RENDERS A PROMPT THE PARSER ACTUALLY ACCEPTS
// (kogaki#1203 acceptance 4a). `src/brief-workflow.json`'s `reader_path_unit`
// row is rendered through the SAME `judgePrompt` renderer the unit build uses,
// and a fixture judge answering with the record shape THIS ROW STATES (a bare
// Candidate at the record's own root, `legs` included) must classify `done` --
// proving the row's stated shape and the parser's accepted shape are one
// shape, never two that can drift apart the way the old `compose_path` row
// and `readerPathUnitRecord` did.
{
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const unitRow = table.reader_path_unit;
  if (!unitRow) {
    fails.push("(j) src/brief-workflow.json declares no top-level `reader_path_unit` row");
  } else {
    if (/\{\s*candidates\s*:/i.test(unitRow.input_shape || "")) {
      fails.push(`(j) reader_path_unit.input_shape still describes a \`candidates\` wrapper array: ${unitRow.input_shape}`);
    }
    const input = { state: "compose_path", unit_number: 1 };
    const prompt = judgePrompt(unitRow, JSON.stringify(input, null, 2), input, null);
    // THE PARSER IS THE SUPERVISOR'S OWN (kogaki#1257): a unit whose judge
    // answers with that bare Candidate must classify `done` on a real
    // `job-supervise` run, its Candidate carried onto the unit row.
    const dir = mkNewRun();
    superviseSync(dir, [{ id: "c1", prompt: "BARE_CANDIDATE" }], {});
    const row = unitRowOf(readRecord(dir), "c1");
    if (!row || row.status !== "done" || !row.candidate || !Array.isArray(row.candidate.legs)) {
      fails.push(`(j) an answer of the shape reader_path_unit.input_shape states was refused by the unit parser: ${JSON.stringify(row)}`);
    }
    if (!prompt.includes(unitRow.judgment_point)) {
      fails.push("(j) judgePrompt(unitRow, ...) did not render the unit row's own judgment_point");
    }
  }
}

// (k) THE RETRY PROMPT CARRIES THE FIRST REFUSAL VERBATIM (kogaki#1203
// acceptance 4b / acceptance 3): the second attempt is the first prompt plus
// the same refusal-repair block `judgePrompt` appends for the synchronous
// judge, marker included. READ AS SENT since kogaki#1257: the fake judge
// records every prompt it receives, and a "RECORD_ONCE" unit is refused once
// and answered on its retry, so the second recorded prompt is the retry the
// supervisor composed, and the unit row's `first_refusal` is what it carried.
{
  // THE ANSWER RIDES BESIDE ITS REFUSAL (kogaki#1438): the attempt-1 record as 2-space
  // JSON between the two markers, the refusal after the second, all above the input.
  const RETRY_MARKER = "----- YOUR PREVIOUS ANSWER (attempt 1) -----";
  const REFUSED_MARKER = "----- IT WAS REFUSED -----";
  // What the fake judge's refusedRecord answered, as the supervisor classified it.
  const refusedAnswer = (why) => ({ legs: [{ id: "refused" }], refuse: why });
  const pairsOf = (refusals) => refusals.map((why) => ({ answer: refusedAnswer(why), refusal: why }));
  const retriedOnce = (prompt) => {
    const dir = mkNewRun();
    const promptsFile = join(dir, "prompts.jsonl");
    superviseSync(dir, [{ id: "c1", prompt }], { env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile } });
    const sent = existsSync(promptsFile)
      ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const row = unitRowOf(readRecord(dir), "c1");
    return { sent, refusal: row && row.first_refusal, row };
  };
  const firstPrompt = "RECORD_ONCE -- THE FIRST PROMPT, UNCHANGED BELOW THIS LINE";
  // EVERY PROMPT SENT BEGINS WITH THE NO-TOOLS SENTENCE (kogaki#1307), so the
  // first prompt as sent is that sentence and then the unit's own prompt.
  const NT = (p) => `${JOB_UNIT_NO_TOOLS_SENTENCE}\n\n${p}`;
  const synthetic = retriedOnce(firstPrompt);
  const retryPrompt = synthetic.sent[1] || "";
  if (synthetic.sent.length !== 2 || !synthetic.refusal) {
    fails.push(`(k) a unit refused once was not asked exactly twice with its first refusal recorded: ${JSON.stringify(synthetic)}`);
  }
  if (!retryPrompt.startsWith(NT(firstPrompt))) {
    fails.push("(k) the retried unit prompt does not begin with the first prompt, unchanged");
  }
  if (!retryPrompt.includes(RETRY_MARKER)) {
    fails.push("(k) the retried unit prompt carries no refusal marker");
  }
  if (!synthetic.refusal || !retryPrompt.includes(synthetic.refusal)) {
    fails.push("(k) the retried unit prompt does not carry the refusal verbatim");
  }
  if (synthetic.refusal && !retryPrompt.includes(`${RETRY_MARKER}\n${JSON.stringify(refusedAnswer(synthetic.refusal), null, 2)}\n${REFUSED_MARKER}\n${synthetic.refusal}\n`)) {
    fails.push("(k) the retried unit prompt does not carry its attempt-1 record as 2-space JSON beside the refusal (kogaki#1438)");
  }
  if (retryPrompt.includes("the shape of your record") || retryPrompt.includes("ANSWER WAS REFUSED")) {
    fails.push("(k) the retried unit prompt still carries the retired marker or repair sentence (kogaki#1438)");
  }
  if (!retryPrompt.includes("Keep every part the refusal did not name, and change the parts it\ndid. The input below is unchanged.")) {
    fails.push("(k) the retried unit prompt does not carry the content-repair sentence (kogaki#1438)");
  }
  // THE BLOCK SITS BEFORE THE INPUT MARKER (PR #1207 review round 1): over a
  // real unit prompt, the retry prompt is byte-identical to `judgePrompt`'s
  // own re-ask of the same row and input -- a block spliced past the marker
  // would be read as input, the #1203 defect in its second-attempt form.
  const unitRow = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_unit;
  if (unitRow) {
    const input = { state: "compose_path", unit_number: 1, fixture: "RECORD_ONCE" };
    const inputText = JSON.stringify(input, null, 2);
    const realFirst = judgePrompt(unitRow, inputText, input, null);
    const real = retriedOnce(realFirst);
    const realRetry = real.sent[1] || "";
    if (real.sent[0] !== NT(realFirst).trim() || !real.refusal
      || realRetry !== NT(judgePrompt(unitRow, inputText, input, pairsOf([real.refusal]))).trim()) {
      fails.push("(k) the retried unit prompt differs from judgePrompt's own re-ask of the same row and input");
    }
    if (!realRetry.endsWith(`${JUDGE_INPUT_MARKER}\n${inputText}`)) {
      fails.push("(k) the retried unit prompt carries text after its input");
    }
    // THE INPUT HALF IS BYTE-IDENTICAL TO ATTEMPT 1's, AND THE BLOCK IS ABOVE IT (kogaki#1438).
    const inputHalf = (t) => t.slice(t.indexOf(`\n${JUDGE_INPUT_MARKER}\n`));
    if (inputHalf(realRetry) !== inputHalf(real.sent[0] || "")
      || realRetry.indexOf(RETRY_MARKER) < 0 || realRetry.indexOf(RETRY_MARKER) > realRetry.indexOf(`\n${JUDGE_INPUT_MARKER}\n`)) {
      fails.push("(k) the retried unit prompt's input half differs from attempt 1's, or its answer block is not above the input marker");
    }
    // TWO REFUSALS NOW RIDE INTO THE THIRD ATTEMPT, BOTH (kogaki#1395): a unit
    // refused twice is asked a third time with `judgePrompt`'s OWN re-ask over
    // the two-entry refusals list, byte-identical to the supervisor's third
    // prompt -- not only the most recent refusal, the defect this Issue closed.
    const input2 = { state: "compose_path", unit_number: 1, fixture: "RECORD_TWICE" };
    const inputText2 = JSON.stringify(input2, null, 2);
    const firstPrompt2 = judgePrompt(unitRow, inputText2, input2, null);
    const dir2 = mkNewRun();
    const promptsFile2 = join(dir2, "prompts.jsonl");
    superviseSync(dir2, [{ id: "c1", prompt: firstPrompt2 }], { unitAttempts: 3, env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile2 } });
    const sent2 = existsSync(promptsFile2)
      ? readFileSync(promptsFile2, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const row2 = unitRowOf(readRecord(dir2), "c1");
    const refusals2 = (row2 && row2.refusals) || [];
    if (sent2.length !== 3 || refusals2.length !== 2) {
      fails.push(`(k) a unit refused twice was not asked three times with two refusals recorded: ${JSON.stringify({ sent: sent2.length, refusals: refusals2 })}`);
    }
    if (!refusals2.every((r) => typeof r === "string")) {
      fails.push(`(k) the job record's \`refusals\` is no longer an array of strings (kogaki#1438): ${JSON.stringify(refusals2)}`);
    }
    const thirdExpected = NT(judgePrompt(unitRow, inputText2, input2, pairsOf(refusals2))).trim();
    if ((sent2[2] || "") !== thirdExpected) {
      fails.push("(k) the third retry prompt differs from judgePrompt's own re-ask over the two-entry refusals list");
    }
  }
}

// (k2) THE RENDERER'S OWN CONTRACT (kogaki#1438): a bare refusal string -- the retired
// shape -- is refused by name rather than rendered without its answer, and an entry with
// no answer renders the sink in the answer's place.
{
  for (const bare of [["a bare refusal"], "a bare refusal"]) {
    let threw = null;
    try { judgeRefusalBlock(bare); } catch (e) { threw = e; }
    if (!threw || !/judgeRefusalBlock/.test(threw.message) || !/answer, refusal/.test(threw.message)) {
      fails.push(`(k2) judgeRefusalBlock(${JSON.stringify(bare)}) was not refused by name: ${threw ? threw.message : "rendered"}`);
    }
  }
  const sink = judgeRefusalBlock([{ refusal: "raised before any record was read" }]);
  if (!sink.includes("----- YOUR PREVIOUS ANSWER (attempt 1) -----\n(no record was read)\n----- IT WAS REFUSED -----\nraised before any record was read\n")) {
    fails.push(`(k2) an entry with no answer does not render the sink: ${JSON.stringify(sink)}`);
  }
}

// (l) ONE RE-ASK, THEN SUCCESS (kogaki#1203 acceptance 2 + 3): a unit refused
// structurally on attempt 1 is respawned with the refusal appended, and a
// judge that repairs on the retried prompt ends the job `done` -- with the
// unit's stdout on disk under the run directory naming both attempts.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "FAIL_ONCE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "done" || rec.failure) {
    fails.push(`(l) a unit refused once then repaired did not end the job \`done\` with no failure: ${JSON.stringify(rec)}`);
  }
  const c2Row = ((rec && rec.units) || []).find((u) => u.id === "c2");
  if (!c2Row || c2Row.attempts !== 2 || !c2Row.first_refusal) {
    fails.push(`(l) the repaired unit's row does not record its two attempts and its first refusal: ${JSON.stringify(c2Row)}`);
  }
  const stdoutPath = unitStdoutFile(dir, "c2");
  if (!stdoutPath || !existsSync(stdoutPath)) {
    fails.push(`(l) no stdout file on disk for the retried unit in ${dir}`);
  } else {
    const onDisk = readFileSync(stdoutPath, "utf8");
    if (!onDisk.includes("attempt 2")) {
      fails.push("(l) the retried unit's stdout file does not mark the second attempt");
    }
  }
}

// (m) REFUSED TWICE IS TERMINAL (kogaki#1203 acceptance 3; kogaki#1273's
// "a refused retry ends the unit `refused`"): a unit whose retry is refused
// the same way ends `refused` after two attempts -- the job `refused`, since
// it is the only unit -- with BOTH refusals recorded, the second in
// `failure.stderr_tail`, the first in `failure.first_refusal`, and the unit's
// stdout file named by `failure.file`.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c2", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "refused" || !rec.failure || rec.failure.unit !== "c2") {
    fails.push(`(m) a unit refused on both attempts did not end the job \`refused\` naming its unit: ${JSON.stringify(rec)}`);
  } else {
    if (!rec.failure.stderr_tail) fails.push("(m) the terminal refusal carries no stderr_tail");
    const mRow = (rec.units || []).find((u) => u.id === "c2");
    if (!mRow || !mRow.failure || mRow.failure.class !== "schema refusal") fails.push(`(m) the refused unit's failure is not classed a schema refusal (kogaki#1307): ${JSON.stringify(mRow)}`);
    if (!rec.failure.first_refusal) fails.push(`(m) the terminal failure block carries no first_refusal: ${JSON.stringify(rec.failure)}`);
    const row = (rec.units || []).find((u) => u.id === "c2");
    if (!row || row.attempts !== 2) fails.push(`(m) the refused unit's row does not record exactly two attempts: ${JSON.stringify(row)}`);
    if (!rec.failure.file || rec.failure.file !== unitStdoutFile(dir, "c2")) {
      fails.push(`(m) the terminal failure block's file does not name the unit's stdout path: ${JSON.stringify(rec.failure)}`);
    } else if (!existsSync(rec.failure.file)) {
      fails.push(`(m) the failure block names a stdout file that does not exist: ${rec.failure.file}`);
    }
  }
}

// ---- kogaki#1273: THE SYSTEM-FAILURE EXIT AND ONE CANDIDATE; kogaki#1355: THE
// ATTEMPT COUNT IN PLACE OF THE RETRY THAT FITS.

// (v1) A UNIT REFUSED ON ATTEMPTS 1 AND 2 IS ACCEPTED ON ATTEMPT 3 (kogaki#1355):
// with `unit_attempts` 3, each ~1s attempt is refused twice and answers the
// third time, and the job ends `done`. Attempt 1 ran ~1s, more than half of a
// 1.9s job figure, so the rule this replaces (retry only when elapsed plus the
// attempt fits the job limit) would never have started attempt 2; the retry
// decision now reads the attempt count alone.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "SLOW_FAIL_TWICE_THEN_OK" }], { unitAttempts: 3, stallS: 30, heartbeatMs: 100 });
  const rec = readRecord(dir);
  const row = unitRowOf(rec, "c1");
  if (!rec || rec.state !== "done" || rec.failure || !row || row.status !== "done" || row.attempts !== 3
    || !Array.isArray(row.refusals) || row.refusals.length !== 2 || typeof row.attempt_1_s !== "number" || row.attempt_1_s <= 1.9 / 2
    || rec.unit_attempts !== 3) {
    fails.push(`(v1) a unit refused on attempts 1 and 2 was not accepted on attempt 3 with unit_attempts 3: ${JSON.stringify(rec)}`);
  }
}

// (v2) A UNIT REFUSED ON EVERY ATTEMPT ENDS `refused` WITH EVERY REFUSAL ON ITS
// ROW (kogaki#1355): three attempts, three refusals, and no `retry_skipped`
// anywhere in the record -- nothing produces it any more. A FINISHED RECORD
// CARRIES NO WHOLE-JOB LIMIT: no `absolute_limit_s`, `ceiling` or
// `ceiling_units`, here or in (v1)'s `done` record.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_TWICE" }], { unitAttempts: 3, stallS: 30, heartbeatMs: 100 });
  const rec = readRecord(dir);
  const row = unitRowOf(rec, "c1");
  const text = JSON.stringify(rec || {});
  if (!rec || rec.state !== "refused" || !row || row.status !== "refused" || row.attempts !== 3
    || !Array.isArray(row.refusals) || row.refusals.length !== 3 || text.includes("retry_skipped")) {
    fails.push(`(v2) a unit refused on every attempt did not end \`refused\` with three refusals and no retry_skipped: ${text}`);
  }
  for (const k of ["absolute_limit_s", "ceiling", "ceiling_units"]) {
    if (text.includes(`"${k}"`) || text.includes(`"${k}`)) fails.push(`(v2) the finished job record still carries \`${k}\`: ${text}`);
  }
  // THE AWAIT'S POLL REFUSES A RECORD CARRYING THE RETIRED KEY, naming it.
  let refusal = "";
  try {
    readerPathAwaitStep({ absolute_limit_s: 600, call_limit_s: 900, unit_attempts: 3, units: [] }, { stopRequested: false, stalledS: 0 });
  } catch (e) { refusal = String(e.message); }
  if (!refusal.includes("absolute_limit_s")) fails.push(`(v2) \`job await\`'s poll did not refuse a record carrying absolute_limit_s by name: ${refusal}`);
}

// (v3) END TO END: two units `done` and one refused twice end the job `done`,
// naming the refused unit; three refused end it `refused`, naming all three.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "OK" }, { id: "c2", prompt: "OK" }, { id: "c3", prompt: "FAIL_TWICE" }], {});
  const rec = readRecord(dir);
  if (!rec || rec.state !== "done" || rec.failure || !Array.isArray(rec.refused_units)
    || rec.refused_units.length !== 1 || rec.refused_units[0].id !== "c3") {
    fails.push(`(v3) two done units and one refused did not end the job \`done\` naming the refused unit: ${JSON.stringify(rec)}`);
  }
  const dir2 = mkNewRun();
  superviseSync(dir2, [{ id: "c1", prompt: "FAIL_TWICE" }, { id: "c2", prompt: "FAIL_TWICE" }, { id: "c3", prompt: "FAIL_TWICE" }], {});
  const rec2 = readRecord(dir2);
  if (!rec2 || rec2.state !== "refused" || !rec2.failure || !Array.isArray(rec2.failure.refused_units)
    || rec2.failure.refused_units.length !== 3) {
    fails.push(`(v3) three refused units did not end the job \`refused\` naming all three: ${JSON.stringify(rec2)}`);
  }
}

// (v4) A DIED UNIT BESIDE RUNNING SIBLINGS KILLS THEM ON THE SAME TICK: the
// supervisor ends well inside its 100s limit (the old rule waited for the
// siblings, which never finish), the siblings' rows read `killed`, and `job
// await` exits non-zero with the defect line, writes no gate call, and marks
// the run ended.
{
  const dir = mkNewRun();
  const t0 = Date.now();
  superviseSync(dir, [{ id: "c1", prompt: "SLEEP_FOREVER" }, { id: "c2", prompt: "SLEEP_FOREVER" }, { id: "c3", prompt: "FAIL_EXIT" }],
    { callLimitS: 100, stallS: 100, heartbeatMs: 100 });
  const tookMs = Date.now() - t0;
  const rec = readRecord(dir);
  const killed = rec ? (rec.units || []).filter((u) => u.status === "killed").map((u) => u.id).sort() : [];
  if (!rec || rec.state !== "died" || JSON.stringify(killed) !== JSON.stringify(["c1", "c2"])
    || !rec.failure || JSON.stringify((rec.failure.killed_units || []).slice().sort()) !== JSON.stringify(["c1", "c2"])) {
    fails.push(`(v4) a died unit did not end the job \`died\` with its running siblings killed and named: ${JSON.stringify(rec)}`);
  }
  if (tookMs > 8000) fails.push(`(v4) the supervisor took ${tookMs}ms to end after a unit died -- its siblings were not killed on the same tick`);
  if (!READER_PATH_JOB_SYSTEM_FAILURE_STATES.includes("died")) fails.push("(v4) `died` is not declared a system-failure state");
  writeFileSync(runRecordPath(dir), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: null },
    judge_binary: null, survey_record: null, completed: [], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "compose_path",
    owner_input: {}, artifacts_written: [], judgments: {}, gate_declarations_owed: [],
    done: false,
  }, null, 2) + "\n");
  const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json") };
  const awaitRun = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 15000, encoding: "utf8", env });
  if (awaitRun.status === 0) fails.push(`(v4) \`job await\` over a died job exited 0: stdout=${awaitRun.stdout} stderr=${awaitRun.stderr}`);
  if (!String(awaitRun.stderr || "").includes("This is a /brief defect, not a candidate refusal:")
    || !String(awaitRun.stderr || "").includes("The run is ended; nothing was retried.")) {
    fails.push(`(v4) \`job await\` over a died job did not print the defect line: stderr=${awaitRun.stderr}`);
  }
  if (existsSync(join(dir, `${READER_PATH_JOB_GATE_ID}${GATE_CALL_SUFFIX}`))) {
    fails.push("(v4) `job await` over a died job raised a question (a gate-call file was written)");
  }
  const runRec = JSON.parse(readFileSync(runRecordPath(dir), "utf8"));
  if (runRec.done !== true || !runRec.brief_defect || (runRec.gate_declarations_owed || []).length) {
    fails.push(`(v4) the run record was not marked ended with the defect named, or owes a gate: ${JSON.stringify(runRec)}`);
  }
}

// (v5) ONE `done` CANDIDATE PASSES BOTH COUNT CHECKS: `assembleSelection`'s
// count refusal does not fire on one Candidate (four still refuses), and
// `compose_path`'s own count check in src/brief.mjs admits one -- that one is
// a closure inside the state's work function, so it is read from the source,
// on the ground this suite's note states for checks a fixture cannot reach.
{
  const one = {
    candidate_id: "c1", differentiation_unit: 1, reader_experience: "exp one", characteristic: "one",
    legs: [{ move: "move-a" }],
    review: { rationale_stands: "x", entailment: "x", prohibitions: "x", semantic_economy: "x", arc_integrity: "x", evaluation_levels: "x" },
    reasoning: { leg_validity: "x" },
  };
  const r1 = assembleSelection({ candidates: [one] }, "");
  if (r1.error && /Candidate\(s\) —/.test(r1.error)) fails.push(`(v5) assembleSelection refused one Candidate on the count: ${r1.error}`);
  const four = [1, 2, 3, 4].map((n) => ({ ...one, candidate_id: `c${n}`, reader_experience: `exp ${n}`, characteristic: `c${n}` }));
  const r4 = assembleSelection({ candidates: four }, "");
  if (!r4.error || !/4 Candidate\(s\) —/.test(r4.error)) fails.push(`(v5) assembleSelection did not refuse four Candidates on the count: ${JSON.stringify(r4)}`);
  const brief = briefRuntimeText();
  if (!brief.includes("if (cands.length < 1 || cands.length > 3) {") || brief.includes("cands.length < 2")) {
    fails.push("(v5) the Brief runtime's compose_path count check does not admit one Candidate");
  }
  if (brief.includes("default in disguise") || readFileSync("src/assemble.mjs", "utf8").includes("default in disguise")) {
    fails.push("(v5) a count refusal still says a single Candidate is a default in disguise");
  }
}

// ---- kogaki#1307: THE TWO FAILURE CLASSES, THE LIMIT FROM THE SETTINGS FILE,
// AND THE MOVE FIT JUDGED INSIDE EACH COMPOSE JOB UNIT.

// (y1) MALFORMED OUTPUT SPENDS NO ATTEMPT: a unit whose first answer is not
// JSON is respawned with the SAME prompt and finishes `done` with
// `malformed_output: 1` and `attempts: 1`; and a unit whose malformed answer is
// followed by a schema refusal is still re-asked once, finishing `done` with
// `attempts: 2` and the refusal on its row.
{
  const dir = mkNewRun();
  const promptsFile = join(dir, "prompts.jsonl");
  superviseSync(dir, [{ id: "c1", prompt: "MALFORMED_ONCE" }], { env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile } });
  const row = unitRowOf(readRecord(dir), "c1");
  if (!row || row.status !== "done" || row.malformed_output !== 1 || row.attempts !== 1 || row.first_refusal) {
    fails.push(`(y1) a malformed first answer did not end the unit \`done\` with malformed_output: 1 and attempts: 1: ${JSON.stringify(row)}`);
  }
  const sent = existsSync(promptsFile) ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (sent.length !== 2 || sent[0] !== sent[1]) fails.push(`(y1) the malformed unit was not respawned with the same prompt: ${JSON.stringify(sent)}`);
  const dir2 = mkNewRun();
  superviseSync(dir2, [{ id: "c1", prompt: "MALFORMED_THEN_REFUSED" }], {});
  const row2 = unitRowOf(readRecord(dir2), "c1");
  if (!row2 || row2.status !== "done" || row2.malformed_output !== 1 || row2.attempts !== 2
    || !String(row2.first_refusal || "").includes("the fixture's schema refusal after a malformed answer")) {
    fails.push(`(y1) a schema refusal after a malformed answer was not re-asked once: ${JSON.stringify(row2)}`);
  }
}

// (y2) A SCHEMA REFUSAL IS RE-ASKED ONCE, THEN THE UNIT IS `refused`: two
// prompts are sent, the second carrying the first refusal, and the row reads
// `refused` with class `schema refusal` after two attempts.
{
  const dir = mkNewRun();
  const promptsFile = join(dir, "prompts.jsonl");
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_TWICE" }], { env: { KOGAKI_FAKE_JUDGE_PROMPTS: promptsFile } });
  const row = unitRowOf(readRecord(dir), "c1");
  const sent = existsSync(promptsFile) ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (!row || row.status !== "refused" || row.attempts !== 2 || (row.failure || {}).class !== "schema refusal" || row.malformed_output) {
    fails.push(`(y2) a unit refused twice did not end \`refused\` as a schema refusal after two attempts: ${JSON.stringify(row)}`);
  }
  if (sent.length !== 2 || !sent[1].includes("the fixture refuses this record every time")) {
    fails.push(`(y2) the schema refusal was not re-asked exactly once with its refusal text: ${JSON.stringify(sent)}`);
  }
}

// (y3) THE TWO BOUNDS ARE READ FROM kogaki.settings.json, A MISSING KEY IS
// REFUSED BY NAME, AND A RETIRED WHOLE-JOB LIMIT IS REFUSED BY NAME (kogaki#1307,
// kogaki#1355). The table names the settings, the repository's file holds them,
// `settingValue` reads them -- from a fixture file through `KOGAKI_SETTINGS` --
// and `briefJobBounds`, the one reader the two job starters call, refuses a
// settings file carrying `compose_job_limit_s` or `review_job_limit_s`, a file
// missing `call_limit_s` or `unit_attempts`, and a `job` row carrying
// `absolute_limit_s`, each naming the key.
{
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const composeJob = (table.states.find((x) => x.id === "compose_path") || {}).job || {};
  if ((composeJob.call_limit_s || {}).setting !== "brief.call_limit_s" || (composeJob.unit_attempts || {}).setting !== "brief.unit_attempts"
    || composeJob.absolute_limit_s !== undefined) {
    fails.push(`(y3) compose_path's job does not name the settings brief.call_limit_s and brief.unit_attempts alone: ${JSON.stringify(composeJob)}`);
  }
  const settings = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
  if (settings.brief.call_limit_s !== 900 || settings.brief.unit_attempts !== 3 || settings.brief.compose_units !== 3
    || "compose_job_limit_s" in settings.brief || "review_job_limit_s" in settings.brief) {
    fails.push(`(y3) kogaki.settings.json does not hold the owner's values: ${JSON.stringify(settings.brief)}`);
  }
  const sdir = mkNewScratch();
  const readKey = (file, key) => spawnSync(process.execPath, ["--input-type=module", "-e",
    `import { settingValue } from "./src/workflow/judge.mjs"; console.log(JSON.stringify(settingValue({ setting: ${JSON.stringify(key)} })));`],
    { cwd: root, timeout: 15000, encoding: "utf8", env: { ...process.env, KOGAKI_SETTINGS: file } });
  const fixture = join(sdir, "settings.json");
  writeFileSync(fixture, JSON.stringify({ brief: { call_limit_s: 7 } }));
  const got = readKey(fixture, "brief.call_limit_s");
  if (got.status !== 0 || got.stdout.trim() !== "7") fails.push(`(y3) the per-call limit was not read from the settings file: ${got.stdout} ${got.stderr}`);
  const noFile = readKey(join(sdir, "absent.json"), "brief.call_limit_s");
  if (noFile.status === 0 || !String(noFile.stderr).includes("brief.call_limit_s")) {
    fails.push(`(y3) a missing settings file was not refused naming the key: status=${noFile.status} stderr=${noFile.stderr}`);
  }
  // THE STARTERS' OWN READER, over fixture settings files and a fixture table.
  const bounds = (file, tableFile) => spawnSync(process.execPath, ["--input-type=module", "-e",
    `import { readFileSync } from "node:fs"; const m = await import("./src/" + "brief.mjs"); `
    + `console.log(JSON.stringify(m.briefJobBounds(JSON.parse(readFileSync(${JSON.stringify(tableFile)}, "utf8")), "compose_path")));`],
    { cwd: root, timeout: 15000, encoding: "utf8", env: { ...process.env, KOGAKI_SETTINGS: file } });
  const tableFile = join(sdir, "table.json");
  writeFileSync(tableFile, JSON.stringify(table));
  const okFile = join(sdir, "ok.json");
  writeFileSync(okFile, JSON.stringify({ brief: { call_limit_s: 11, unit_attempts: 4 } }));
  const ok = bounds(okFile, tableFile);
  if (ok.status !== 0 || ok.stdout.trim() !== JSON.stringify({ callLimitS: 11, unitAttempts: 4 })) {
    fails.push(`(y3) briefJobBounds did not read both bounds from the settings file: ${ok.stdout} ${ok.stderr}`);
  }
  for (const [label, brief, key] of [
    ["carrying compose_job_limit_s", { call_limit_s: 11, unit_attempts: 4, compose_job_limit_s: 1200 }, "compose_job_limit_s"],
    ["carrying review_job_limit_s", { call_limit_s: 11, unit_attempts: 4, review_job_limit_s: 600 }, "review_job_limit_s"],
    ["missing call_limit_s", { unit_attempts: 4 }, "brief.call_limit_s"],
    ["missing unit_attempts", { call_limit_s: 11 }, "brief.unit_attempts"],
  ]) {
    const f = join(sdir, `${key}.json`);
    writeFileSync(f, JSON.stringify({ brief }));
    const r = bounds(f, tableFile);
    if (r.status === 0 || !String(r.stderr).includes(key)) fails.push(`(y3) a settings file ${label} was not refused naming \`${key}\`: status=${r.status} stdout=${r.stdout} stderr=${r.stderr}`);
  }
  const oldTable = JSON.parse(JSON.stringify(table));
  oldTable.states.find((x) => x.id === "compose_path").job.absolute_limit_s = { setting: "brief.compose_job_limit_s" };
  const oldTableFile = join(sdir, "old-table.json");
  writeFileSync(oldTableFile, JSON.stringify(oldTable));
  const oldRow = bounds(okFile, oldTableFile);
  if (oldRow.status === 0 || !String(oldRow.stderr).includes("absolute_limit_s")) {
    fails.push(`(y3) a job row carrying absolute_limit_s was not refused naming the key: status=${oldRow.status} stderr=${oldRow.stderr}`);
  }
  // The supervisor takes no bound of its own: a units run with no
  // `--call-limit-s`, or handed the retired `--absolute-limit-s`, is refused
  // rather than defaulted.
  const unitsPath = join(sdir, "units.json");
  writeFileSync(unitsPath, JSON.stringify(declareUnits([{ id: "c1", prompt: "OK" }])));
  const noLimit = spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", sdir, "--units", unitsPath,
    "--command", fakeJudge, "--model", "m", "--output-format", "json", "--unit-attempts", "2", "--stall-s", "100", "--heartbeat-ms", "250"],
    { cwd: root, timeout: 15000, encoding: "utf8" });
  const noLimitRec = readRecord(sdir);
  if (noLimitRec && noLimitRec.state === "done") fails.push(`(y3) the supervisor ran a job with no --call-limit-s: ${JSON.stringify(noLimitRec)} ${noLimit.stderr}`);
  const odir = mkNewScratch();
  spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", odir, "--units", unitsPath,
    "--command", fakeJudge, "--model", "m", "--output-format", "json", "--absolute-limit-s", "100",
    "--call-limit-s", "100", "--unit-attempts", "2", "--stall-s", "100", "--heartbeat-ms", "250"],
    { cwd: root, timeout: 15000, encoding: "utf8" });
  const oldRec = readRecord(odir);
  if (!oldRec || oldRec.state !== "other" || !JSON.stringify(oldRec.failure || {}).includes("absolute-limit-s")) {
    fails.push(`(y3) the supervisor handed --absolute-limit-s was not refused naming it: ${JSON.stringify(oldRec)}`);
  }
}

// (y6) MALFORMED RESPAWNS ARE BOUNDED PER ATTEMPT (kogaki#1355): a unit whose
// every answer is malformed respawns without spending an attempt, at most
// `unit_attempts` times, and then ends `refused` naming the malformed count.
{
  const dir = mkNewRun();
  superviseSync(dir, [{ id: "c1", prompt: "FAIL_JSON" }], { unitAttempts: 2, stallS: 30, heartbeatMs: 100 });
  const row = unitRowOf(readRecord(dir), "c1");
  if (!row || row.status !== "refused" || row.attempts !== 1 || row.malformed_output !== 3
    || !String((row.failure || {}).stderr_tail || "").includes("malformed output 3 times")) {
    fails.push(`(y6) malformed output did not respawn without spending an attempt and stop at the bound naming the count: ${JSON.stringify(row)}`);
  }
}

// (y4) THE MOVE FIT IS JUDGED INSIDE THE UNIT: a fit judge declared in the units
// file -- the real `readerPathFitPrompt`/`readerPathFitVerdict` of src/brief.mjs
// over a real Move library, beside the real `validateReaderPathUnit` -- answers
// `contradicts` on the first Candidate, which re-asks the compose call with the
// judge's sentence verbatim; the second Candidate is judged `consistent`, and
// that record is written beside the unit's Candidate.
{
  const base = mkNewScratch();
  const moves = join(base, "moves");
  mkdirSync(moves);
  writeFileSync(join(moves, "m1.yaml"), ["id: m1", "description: the fixture Move m1.",
    "before:", "  knowledge: before.", "after:", "  knowledge: after.",
    "breaks:", "  - breaks if the left-out case is never named.",
    "segments:", "  - operation: states the claim.", "  - operation: names the case it leaves out.", "    relation: limits the claim.", ""].join("\n"));
  // A FIXTURE LIBRARY IS A LIBRARY (kogaki#1349): the adapter in
  // `src/compose.mjs` reads `<movesDir>/ROLES.json` with no fallback.
  writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
  const START = "knowledge: before\nquestion: holds: none";
  const legOf = (legId, extra) => ({
    leg_id: legId, move: "m1", materials: ["L1"], purpose: `what ${legId} is for`,
    reader_state_after: "knowledge: after\nquestion: holds: none",
    depends_on: [], rationale: `why ${legId} sits here`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }], waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"] }], ...extra,
  });
  const candidate = {
    candidate_id: "c1", characteristic: "x", reader_experience: "y", reader_start: START,
    reasoning: { leg_validity: "x" },
    legs: [legOf("s1", { opens_section: "Intro" }), legOf("s2", { depends_on: ["s1"], reaches_target: true })],
  };
  const SENTENCE = "the Leg names no case left out, which the Segments require of it.";
  const counter = join(base, "fit-counter.json");
  const prompts = join(base, "prompts.jsonl");
  const judgeFile = join(base, "fit-fake-judge.mjs");
  writeFileSync(judgeFile, `#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  appendFileSync(${JSON.stringify(prompts)}, JSON.stringify(prompt) + "\\n");
  const out = (r) => { process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(r) }) + "\\n"); process.exit(0); };
  if (!prompt.includes("FIT_JUDGE_HEAD")) out(${JSON.stringify(candidate)});
  const n = (existsSync(${JSON.stringify(counter)}) ? Number(readFileSync(${JSON.stringify(counter)}, "utf8")) : 0) + 1;
  writeFileSync(${JSON.stringify(counter)}, String(n));
  const verdicts = ["s1", "s2"].map((leg) => ({ leg_id: leg, move: "m1",
    verdict: n === 1 && leg === "s2" ? "contradicts" : "consistent",
    why: n === 1 && leg === "s2" ? ${JSON.stringify(SENTENCE)} : "both reader states specialize the Move's before and after." }));
  out({ version: "1", candidate_id: "c1", verdicts });
});
`);
  chmodSync(judgeFile, 0o755);
  const unitsPath = join(base, "units.json");
  writeFileSync(unitsPath, JSON.stringify({
    units: [{ id: "c1", prompt: "COMPOSE ONE CANDIDATE" }],
    validator: { module: "src/brief.mjs", export: "validateReaderPathUnit", inputs: { strandIds: ["L1"], movesDir: moves, readerStart: START } },
    fit_judge: { module: "src/brief.mjs", prompt_export: "readerPathFitPrompt", verdict_export: "readerPathFitVerdict",
      inputs: { movesDir: moves, readerStart: START, promptHead: "FIT_JUDGE_HEAD\n" } },
  }, null, 2));
  spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", base, "--units", unitsPath,
    "--command", judgeFile, "--model", "m", "--output-format", "json",
    "--call-limit-s", "100", "--unit-attempts", "2", "--stall-s", "100", "--heartbeat-ms", "150"], { cwd: root, timeout: 30000, encoding: "utf8" });
  const rec = readRecord(base);
  const row = unitRowOf(rec, "c1");
  const sent = existsSync(prompts) ? readFileSync(prompts, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const composeCalls = sent.filter((x) => !x.includes("FIT_JUDGE_HEAD"));
  if (!row || row.status !== "done" || row.attempts !== 2 || !String(row.first_refusal || "").includes(SENTENCE)) {
    fails.push(`(y4) a contradicts verdict did not re-ask the unit once with the judge's sentence and then finish: ${JSON.stringify(row)}`);
  }
  if (composeCalls.length !== 2 || !composeCalls[1].includes(SENTENCE)) {
    fails.push(`(y4) the re-asked compose prompt does not carry the judge's sentence verbatim: ${JSON.stringify(composeCalls.map((x) => x.slice(-300)))}`);
  }
  if (!sent.every((x) => x.startsWith(JOB_UNIT_NO_TOOLS_SENTENCE))) fails.push("(y4) a compose or fit call's prompt does not begin with the no-tools sentence");
  if (!row || !row.specialization_file || !existsSync(row.specialization_file) || !row.candidate_file
    || join(row.specialization_file, "..") !== join(row.candidate_file, "..")) {
    fails.push(`(y4) no specialization record was written beside the unit's Candidate: ${JSON.stringify(row)}`);
  } else {
    const spec = JSON.parse(readFileSync(row.specialization_file, "utf8"));
    if (spec.candidate_id !== "c1" || !spec.verdicts.every((v) => v.verdict === "consistent")) {
      fails.push(`(y4) the written specialization record is not the consistent one: ${JSON.stringify(spec)}`);
    }
  }
  // (y5) A FIT CALL THAT DIES KEEPS THE COMPOSED CANDIDATE ON THE ROW (PR #1308
  // round 1): the unit ends `died`, its row carries the schema-valid Candidate it
  // composed, marked `fit_judged: false`, and it is not written as an offered one.
  const dieDir = mkNewScratch();
  const dieJudge = join(base, "fit-dies.mjs");
  writeFileSync(dieJudge, `#!/usr/bin/env node
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  if (prompt.includes("FIT_JUDGE_HEAD")) { process.stderr.write("fit call died on purpose\\n"); process.exit(4); }
  process.stdout.write(JSON.stringify({ type: "result", result: JSON.stringify(${JSON.stringify(candidate)}) }) + "\\n");
});
`);
  chmodSync(dieJudge, 0o755);
  spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", dieDir, "--units", unitsPath,
    "--command", dieJudge, "--model", "m", "--output-format", "json",
    "--call-limit-s", "100", "--unit-attempts", "2", "--stall-s", "100", "--heartbeat-ms", "150"], { cwd: root, timeout: 30000, encoding: "utf8" });
  const dieRow = unitRowOf(readRecord(dieDir), "c1");
  if (!dieRow || dieRow.status !== "died" || !dieRow.candidate || dieRow.candidate.candidate_id !== "c1"
    || dieRow.fit_judged !== false || dieRow.candidate_file) {
    fails.push(`(y5) a unit whose fit call died did not keep its composed Candidate on the row, unoffered: ${JSON.stringify(dieRow)}`);
  }
}

// (v7) NO `rerun` OPTION AND NO `job-rerun-unit` VERB REMAINS.
{
  const brief = briefRuntimeText();
  // The Terrain runtime is the entry and every module it was split into (kogaki#1259).
  const terrain = ["src/terrain.mjs", ...["src/terrain", "src/workflow"].flatMap((d) => readdirSync(d)
    .filter((f) => f.endsWith(".mjs")).map((f) => join(d, f)))].map((p) => readFileSync(p, "utf8")).join("\n");
  if (/id:\s*"rerun"/.test(brief)) fails.push("(v7) the Brief runtime still offers a `rerun` option");
  if (/capOption === "rerun"/.test(terrain)) fails.push("(v7) the Terrain runtime still answers a `rerun` click");
  if (terrain.includes("job-rerun-unit") || terrain.includes("cmdJobRerunUnit") || terrain.includes("startReaderPathUnitRerun")) {
    fails.push("(v7) the Terrain runtime still carries the `job-rerun-unit` verb or its starter");
  }
  const flowTable = JSON.parse(readFileSync("src/terrain-workflow.json", "utf8"));
  if ((flowTable.non_flow_entry_points || {})["job-rerun-unit"]) fails.push("(v7) src/terrain-workflow.json still accounts for a `job-rerun-unit` entry point");
  const registry = readFileSync("src/gate-registry.json", "utf8");
  if (registry.includes('{id:\\"rerun\\"')) fails.push("(v7) src/gate-registry.json still composes a `rerun` option for the reader-path gate");
}

rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  console.log("FAIL check-brief-job-retry");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-job-retry — a refused unit is re-asked with every refusal so far and bounded by its attempt count alone, a died unit ends the job at once, one Candidate passes both count checks, no `rerun` remains, malformed output is respawned spending no attempt while a schema refusal spends one, the bounds are read from kogaki.settings.json with a missing or retired key refused by name, and a contradicts Move-fit verdict re-asks the unit (kogaki#1203, kogaki#1273, kogaki#1307, kogaki#1355)");
JS
status=$?

if grep -lqs -- "$CLAUDE_CODE_SESSION_ID" "$live_gates"/*.json; then
  echo "FAIL check-brief-job-retry"
  echo "  - a pointer for the fixture session reached the live open-gate directory $live_gates — a fixture escaped its isolation and opened a real gate"
  exit 1
fi
exit "$status"
