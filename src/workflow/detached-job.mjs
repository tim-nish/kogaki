// The workflow engine — the Detached Job and its supervisor.
// Shared by every command that runs a workflow table, so it lives outside every command
// directory (kogaki#1259, kogaki#1302).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { spawn } from "node:child_process";
import { writeFileSync, appendFileSync, existsSync, openSync, closeSync, writeSync, renameSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { JUDGE_INPUT_MARKER, JUDGE_REFUSAL_MARKER, JUDGE_REFUSAL_REPAIR_SENTENCE } from "./judge.mjs";
import { REPO, fail, readJson } from "./run-record.mjs";

// ============ THE DETACHED JOB (kogaki#1193) ============
// `compose_path` starts the job and throws `DetachedJobStarted`; the state is NOT complete
// and no gate is raised. `job await` resumes a FINISHED job (`detached-job` attribution).
// This file stays generic: the PROMPT and the declared VALIDATOR (kogaki#1240) come from the
// flow binding; never import `validateLegs` or anything Brief-specific here.
// Each job unit is a HEADLESS SESSION (a `claude -p` child that runs with no tools), and
// its answer fails in one of two classes (kogaki#1307): MALFORMED OUTPUT -- not JSON, or no
// record in it -- respawns the unit with the same prompt and counts no attempt; a SCHEMA
// REFUSAL -- a record the declared validator, or the declared Move-fit judge, refuses --
// feeds the one re-ask (kogaki#1203) and refused-twice-is-final (kogaki#1273) machinery.
export class DetachedJobStarted extends Error {
  constructor(stateId, jobRecordPath, message) {
    super(message);
    this.stateId = stateId;
    this.jobRecordPath = jobRecordPath;
  }
}

const READER_PATH_JOB_FILE = "reader-path-job.json";
// THE ABSOLUTE LIMIT IS NOT A CONSTANT HERE (kogaki#1307): each job's own limit is
// read by its starter from `kogaki.settings.json` and written onto the job record as
// `absolute_limit_s`, which the supervisor enforces and `job await` reads back. One
// number per job, held in one place, so a change to the setting needs no code edit.
// NO BYTE GROWTH ON ANY STILL-RUNNING UNIT FOR THIS LONG is read as a stall — a declared
// heuristic, kept narrower than the absolute limit.
// Per kogaki#1193 comment 3, this one output-byte bound stands in for both of the Issue's
// heartbeat and output signals.
export const READER_PATH_JOB_STALL_S = 90;
export const READER_PATH_JOB_HEARTBEAT_MS = 10000;

// THE TWO SESSION-TYPEABLE COMMAND LINES, SPELLED ONCE (kogaki#1193 PR #1195
// review round 1, finding 3). `jobWork`'s continuation text and
// `DetachedJobStarted`'s own message both used to describe these verbs in
// prose ("the Brief skill's `job status`/`job await` commands") rather than
// spell the exact line the skill's `allowed-tools` frontmatter admits — so a
// session reading either message met a paraphrase it could not type
// verbatim. Both readers now format off this one pair of strings.
export const READER_PATH_JOB_STATUS_COMMAND = "node src/brief.mjs run --status --job status";
export const READER_PATH_JOB_AWAIT_COMMAND = "node src/brief.mjs run --status --job await";

// THE STATES A JOB ENDS IN (kogaki#1193, narrowed by kogaki#1271, which removed
// the still-running state the 300s question was raised on). `done` carries no `failure` block;
// every other one does, and NOTHING IS EVER DELETED on any exit — a non-`done`
// job record is left exactly as it stood at classification, partial output
// included, for the Arm screen and for a later reader. The seven are `done`,
// `refused`, `stopped`, `ceiling`, `stalled`, `died` and `other`; the list was
// a constant nothing read, deleted at kogaki#1257, and
// `checks/check-brief-reader-path-job.sh` (a) now reads the set off the job
// records its fixtures end in.

// ONE RE-ASK PER UNIT (kogaki#1203, the owner's 2026-09-26 "same policy as
// before" ruling): 2 attempts total, so a unit refused on attempt 2 is
// terminal exactly as the synchronous judge's exhausted `retries` was.
const READER_PATH_UNIT_MAX_ATTEMPTS = 2;

// ONE FILE PER UNIT, NAMED BY ITS ID (kogaki#1203 acceptance 2). Both
// attempts of a retried unit land in this same path -- the first attempt's
// bytes, a divider line, then the second's -- so a unit that dies or is
// refused is inspectable from one path rather than a reader having to guess
// which attempt's file survived.
function readerPathUnitStdoutPath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.stdout`);
}

// ONE FILE PER FINISHED CANDIDATE, WRITTEN THE MOMENT ITS UNIT CLASSIFIES
// `done` (kogaki#1204). The job record already carries the same object
// embedded in the unit's own row, but that row lives inside one JSON file
// rewritten every heartbeat -- this is a second, narrower write, made once
// per unit and never touched again, so a finished Candidate is recoverable by
// itself whatever the job's own terminal state turns out to be and whatever
// else the record is rewritten to say next tick.
function readerPathUnitCandidatePath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.candidate.json`);
}

// THE RETRIED UNIT'S PROMPT (kogaki#1203): the first prompt, verbatim, plus
// the SAME refusal block a synchronous judge's re-ask gets from `judgePrompt`
// -- the marker, the refusal verbatim, `JUDGE_REFUSAL_REPAIR_SENTENCE` --
// SPLICED IN BEFORE `JUDGE_INPUT_MARKER`, exactly where `judgePrompt` puts it
// (PR #1207 review round 1): everything after that marker is the input file,
// so a block appended past it would be read as input, which is the defect
// #1203 diagnosed. The supervisor reads no table and no `st` -- the whole of
// what it has for a unit is the first prompt `startDetachedJobSupervisor`
// wrote into `reader-path-job-units.json` -- so it splices at the marker
// rather than re-rendering; the result is byte-identical to `judgePrompt`'s
// own re-ask over the same row and input. A prompt carrying no marker carries
// no input to misread, and the block is appended.
function readerPathUnitRetryPrompt(firstPrompt, refusal) {
  const block = ["", JUDGE_REFUSAL_MARKER, refusal, "", JUDGE_REFUSAL_REPAIR_SENTENCE].join("\n");
  const at = firstPrompt.indexOf(`\n${JUDGE_INPUT_MARKER}\n`);
  if (at < 0) return firstPrompt + "\n" + block;
  return firstPrompt.slice(0, at) + block + "\n" + firstPrompt.slice(at);
}

// THE SENTENCE AT THE HEAD OF EVERY JOB UNIT PROMPT (kogaki#1307). A headless session
// spawned with `--tools ""` that reads a repository path in its prompt may answer with a
// tool call written as text -- the malformed output of run brief-2026-10-08T02-55-02-626Z.
// `startDetachedJobSupervisor` puts this first in every unit prompt it writes, and the
// supervisor puts it first in every Move-fit prompt it builds, so no caller can omit it.
const JOB_UNIT_NO_TOOLS_SENTENCE = "You are running with no tools and cannot open files. Every file path "
  + "in this prompt is a citation for a human reader, not something to open; everything you need is in this "
  + "prompt. Answer with the record alone.";

function withNoToolsSentence(prompt) {
  const p = String(prompt);
  return p.startsWith(JOB_UNIT_NO_TOOLS_SENTENCE) ? p : `${JOB_UNIT_NO_TOOLS_SENTENCE}\n\n${p}`;
}

// THE MOVE-FIT CALL'S OWN FILES (kogaki#1307): its raw output, and the specialization
// record it returned for a unit that finished, beside the unit's Candidate.
function readerPathUnitFitStdoutPath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.fit.stdout`);
}

function readerPathUnitSpecializationPath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.specialization.json`);
}

export function readerPathJobPath(dir) { return join(dir, READER_PATH_JOB_FILE); }
export function readerPathJobStopFlagPath(dir) { return join(dir, "reader-path-job.stop"); }

export function readReaderPathJob(dir) {
  const p = readerPathJobPath(dir);
  return existsSync(p) ? readJson(p) : null;
}

function writeReaderPathJob(dir, doc) {
  doc.updated_at = new Date().toISOString();
  const p = readerPathJobPath(dir);
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(doc, null, 2) + "\n");
  renameSync(tmp, p);
  return doc;
}

function readerPathBytes(str, n) {
  const s = String(str == null ? "" : str);
  return s.length > n ? s.slice(s.length - n) : s;
}

// ONE UNIT'S CHILD PROCESS, SPAWNED AND NEVER BLOCKED ON (kogaki#1193). Mirrors
// `judgeSpawnAsync`'s shape (same stdio, same accounting) but resolves nothing
// itself: the caller polls `out` at its own cadence, because a unit that
// stalls must not keep the other two — or the heartbeat — from being read.
//
// `stdoutFile`, WHEN GIVEN, IS WRITTEN AS THE CHILD STREAMS (kogaki#1203):
// `{ path, flag }`, `flag` defaulting to `"w"` -- a fresh file for a unit's
// first attempt, `"a"` for a retried attempt that appends past a divider its
// caller already wrote. This is what puts a unit's raw output on disk BEFORE
// the job ends, including a unit the ceiling or the stall bound kills mid-run:
// the write happens as each chunk arrives rather than at `close`, where a
// killed child never gets there.
function spawnDetachedJobUnit(command, argv, input, onBytes, env, stdoutFile) {
  const out = { bytes: 0, chunks: [], errChunks: [], done: false, exitCode: null, error: null, endedAt: null };
  let child;
  let fd = null;
  if (stdoutFile && stdoutFile.path) {
    try { fd = openSync(stdoutFile.path, stdoutFile.flag || "w"); } catch { fd = null; }
  }
  const closeFd = () => {
    if (fd === null) return;
    try { closeSync(fd); } catch { /* already gone */ }
    fd = null;
  };
  try {
    child = spawn(command, argv, { stdio: ["pipe", "pipe", "pipe"], env: env ? { ...process.env, ...env } : process.env });
  } catch (e) {
    closeFd();
    out.error = e; out.done = true; out.endedAt = new Date().toISOString();
    return { child: null, out };
  }
  child.stdout.on("data", (d) => {
    out.bytes += d.length; out.chunks.push(d);
    if (fd !== null) { try { writeSync(fd, d); } catch { /* the disk copy is best-effort; `out.chunks` is still the truth */ } }
    if (onBytes) onBytes(out.bytes);
  });
  child.stderr.on("data", (d) => out.errChunks.push(d));
  child.on("error", (e) => { out.error = e; });
  child.on("close", (code) => {
    out.exitCode = code; out.done = true; out.endedAt = new Date().toISOString();
    closeFd();
  });
  try { child.stdin.end(input); } catch { /* a child that exited before reading its prompt is the failure arm's */ }
  return { child, out };
}

// STRUCTURAL CLASSIFICATION OF ONE FINISHED UNIT (kogaki#1193, review round 1
// finding 1). Units spawn with `--output-format stream-json --verbose
// --include-partial-messages`, so `stdout` is JSONL — one JSON object per
// line, streamed as the child produces it — never the single buffered blob
// `--output-format json` writes at exit. The unit's record is the `result`
// field of its LAST `{"type":"result",...}` line, found by scanning from the
// end because a `stream-json` transcript carries many other line types
// (`system`, `assistant`, …) before the one that terminates it. Unwrapping
// `result` mirrors the same envelope `judgeRecordFrom` reads.
function readerPathUnitRecord(stdout, recordArray = "legs") {
  const lines = String(stdout == null ? "" : stdout).split("\n").filter((l) => l.trim() !== "");
  let resultLine = null;
  let anyValidJson = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    anyValidJson = true;
    if (obj && typeof obj === "object" && obj.type === "result") { resultLine = obj; break; }
  }
  if (!resultLine) {
    return { error: anyValidJson ? "no `type: \"result\"` line in the stream-json output" : "not JSON: no line parsed as JSON" };
  }
  const inner = Object.prototype.hasOwnProperty.call(resultLine, "result") ? resultLine.result : resultLine;
  const record = typeof inner === "string" ? (() => {
    try { return JSON.parse(inner); } catch (e) { return { __parseError: `result did not parse: ${e.message}` }; }
  })() : inner;
  if (record && record.__parseError) return { error: record.__parseError };
  if (!record || typeof record !== "object" || Array.isArray(record)) return { error: "not a JSON object" };
  // THE ARRAY THE RECORD MUST CARRY IS DECLARED BY THE UNITS FILE (kogaki#1301):
  // `legs` for a reader-path unit, `claim_register` for a path-review unit.
  if (!Array.isArray(record[recordArray])) return { error: `no \`${recordArray}\` array` };
  return { candidate: record };
}

// THE DEAD UNIT'S LAST `result` LINE (kogaki#1197): even a unit that exits
// non-zero streams `stream-json`, so its last `{"type":"result",...}` line
// still carries the CLI's own `is_error: true` reading of what went wrong
// (e.g. "Not logged in · Please run /login") -- read here rather than left to
// `readerPathUnitRecord`, whose "not a JSON object" / "no `legs` array"
// checks are shaped for a LIVE candidate, not a dead unit's error string.
function readerPathDeadUnitResult(stdout) {
  const lines = String(stdout == null ? "" : stdout).split("\n").filter((l) => l.trim() !== "");
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    if (obj && typeof obj === "object" && obj.type === "result" && obj.is_error === true && typeof obj.result === "string") {
      return obj.result;
    }
  }
  return null;
}

// THE DECLARED VALIDATOR, LOADED HERE AND NOWHERE ELSE (kogaki#1240). This
// module knows nothing of Candidates, Legs or Briefs (kogaki#1193's own
// framing, carried forward) -- a checker inside a job is supplied concretely
// by the supervisor or not at all (the owner's 2026-09-25 principle), so the
// units file names the module and export to `import()` at runtime rather
// than this file statically importing anything Brief-specific. THROWS a
// plain `Error` (caught by `cmdJobSupervise`'s own catch-all, below) when the
// declaration or the named export is missing -- never `fail()`, which exits
// the process directly and would skip that catch entirely, leaving no job
// record behind for a refusal this function itself can fully describe.
async function loadReaderPathUnitValidator(declared) {
  if (!declared || typeof declared !== "object") throw new Error("the units file carries no declared validator (kogaki#1240).");
  if (!declared.module) throw new Error("the declared validator names no `module`.");
  if (!declared.export) throw new Error("the declared validator names no `export`.");
  const modulePath = String(declared.module);
  const exportName = String(declared.export);
  const mod = await import(pathToFileURL(resolve(REPO, modulePath)).href);
  const fn = mod[exportName];
  if (typeof fn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(exportName)}.`);
  const inputs = declared.inputs || {};
  // THE `{error}`-RETURNING CONVENTION (carried from `validateLegs` and
  // `resolveMoveIds`, which `validateReaderPathUnit` itself calls) is
  // unwrapped HERE, once, so `classifyDetachedJobUnit` deals only in a
  // plain string-or-falsy refusal regardless of which declared validator
  // supplied it. The unit's own id rides as the third argument (kogaki#1301),
  // so a job whose units each judge a different subject can resolve which one.
  return (candidate, unitId) => {
    const r = fn(candidate, inputs, unitId);
    return r && r.error ? r.error : null;
  };
}

// THE DECLARED MOVE-FIT JUDGE, LOADED HERE AND NOWHERE ELSE (kogaki#1307), on the
// validator's own terms: the units file names the module and its two exports, and this
// file stays ignorant of Moves and Legs. `prompt` builds the fit call's prompt from a
// unit's validated record; `verdict` reads the judge's record back and returns `{error}`
// for a record whose own shape is wrong, `{refusal, failures}` for a Leg that does not
// fit its Move, and `{}` for a Candidate that fits. Absent, a unit is one call.
async function loadReaderPathFitJudge(declared) {
  if (declared === undefined || declared === null) return null;
  if (typeof declared !== "object" || !declared.module || !declared.prompt_export || !declared.verdict_export) {
    throw new Error("the units file's `fit_judge` names no `module`, `prompt_export` and `verdict_export` (kogaki#1307).");
  }
  const modulePath = String(declared.module);
  const mod = await import(pathToFileURL(resolve(REPO, modulePath)).href);
  const promptFn = mod[String(declared.prompt_export)];
  const verdictFn = mod[String(declared.verdict_export)];
  if (typeof promptFn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(declared.prompt_export)}.`);
  if (typeof verdictFn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(declared.verdict_export)}.`);
  const inputs = declared.inputs || {};
  return {
    prompt: (candidate, unitId) => promptFn(candidate, inputs, unitId),
    verdict: (record, candidate, unitId) => verdictFn(record, candidate, inputs, unitId) || {},
  };
}

// `validate`, when given, is the DECLARED validator (kogaki#1240) loaded by
// the caller from the units file -- this function stays ignorant of what it
// checks or why, taking only a `(candidate) => string|null` function and
// downgrading an otherwise-`done` unit to `refused` on a truthy return.
// THE TWO FAILURE CLASSES (kogaki#1307): an answer with no record in it classifies
// `malformed` (class `malformed output`), which the supervisor respawns and never
// returns as a row; a record the validator refuses classifies `refused` (class
// `schema refusal`).
const MALFORMED_OUTPUT = "malformed output";
const SCHEMA_REFUSAL = "schema refusal";

function classifyDetachedJobUnit(out, validate, recordArray = "legs", unitId = null) {
  if (out.error) {
    return { status: "died", failure: { exit_code: out.exitCode, stderr_tail: readerPathBytes(String(out.error.message || out.error), 4000), bytes_written: out.bytes, ended_at: out.endedAt } };
  }
  if (out.exitCode !== 0) {
    const result = readerPathDeadUnitResult(Buffer.concat(out.chunks || []).toString("utf8"));
    return { status: "died", failure: { exit_code: out.exitCode, stderr_tail: readerPathBytes(Buffer.concat(out.errChunks).toString("utf8"), 4000), bytes_written: out.bytes, ended_at: out.endedAt, ...(result !== null ? { result } : {}) } };
  }
  const r = readerPathUnitRecord(Buffer.concat(out.chunks).toString("utf8"), recordArray);
  if (r.error) {
    return { status: "malformed", failure: { class: MALFORMED_OUTPUT, exit_code: out.exitCode, stderr_tail: readerPathBytes(r.error, 4000), bytes_written: out.bytes, ended_at: out.endedAt } };
  }
  if (validate) {
    const refusal = validate(r.candidate, unitId);
    if (refusal) {
      return { status: "refused", failure: { class: SCHEMA_REFUSAL, exit_code: out.exitCode, stderr_tail: readerPathBytes(String(refusal), 4000), bytes_written: out.bytes, ended_at: out.endedAt } };
    }
  }
  return { status: "done", candidate: r.candidate };
}

// THE MOVE-FIT CALL'S CLASSIFICATION (kogaki#1307), over the second headless session a
// unit runs once its record passed the validator. A dead call is `died`, as for the
// compose call; a judge answer with no record, or one whose own shape the declared
// verdict function refuses, is `malformed` and is respawned; a `contradicts` or
// `cannot-determine` on any Leg is a SCHEMA REFUSAL of the unit's Candidate, carrying
// the judge's sentences verbatim, which the unit's one re-ask answers.
function classifyFitJudgeCall(out, fit, candidate, unitId) {
  const base = classifyDetachedJobUnit(out, null, "verdicts", unitId);
  if (base.status !== "done") return base;
  const v = fit.verdict(base.candidate, candidate, unitId);
  if (v.error) {
    return { status: "malformed", failure: { class: MALFORMED_OUTPUT, exit_code: out.exitCode, stderr_tail: readerPathBytes(String(v.error), 4000), bytes_written: out.bytes, ended_at: out.endedAt } };
  }
  if (v.refusal) {
    return { status: "refused", specialization: base.candidate,
      failure: { class: SCHEMA_REFUSAL, exit_code: out.exitCode, stderr_tail: readerPathBytes(String(v.refusal), 4000), bytes_written: out.bytes, ended_at: out.endedAt, move_fit: v.failures || [] } };
  }
  return { status: "done", specialization: base.candidate };
}

// THE THREE SYSTEM-FAILURE STATES (kogaki#1273). A candidate REFUSAL is the
// unit's own answer failing its checks; these three are the job itself going
// wrong -- a unit that exited non-zero or never spawned (`died`), no output
// growth for the stall bound (`stalled`), and the supervisor's own catch-all
// (`other`). The owner's 2026-10-05 ruling: a system failure is a defect in
// /brief, never retried and never raised as a question, and it ends the Brief.
export const READER_PATH_JOB_SYSTEM_FAILURE_STATES = ["died", "stalled", "other"];

// THE REDUCTION OVER A FINISHED SET (kogaki#1273). One finished Candidate is
// enough: the job is `done` when at least one unit is `done`, whatever its
// siblings ended as, and `refused` only when every unit was refused. `ceiling`
// is a unit the absolute limit killed while it was still running -- a time
// bound rather than a defect -- so a set holding no `done` unit and at least
// one `ceiling` unit ends `ceiling`, the Stop-only arm.
function reduceFinishedReaderPathUnits(units) {
  if (units.some((u) => u.status === "done")) return "done";
  if (units.some((u) => u.status === "ceiling")) return "ceiling";
  if (units.some((u) => u.status === "refused")) return "refused";
  return "done";
}

// THE OVERALL JOB STATE, REDUCED FROM ITS UNITS (kogaki#1193, revised
// kogaki#1204 and kogaki#1273). A REFUSED unit does not end the job while a
// sibling is still running -- killing a running sibling on one unit's own
// refusal is exactly the loss #1204 was filed over. A DIED unit does, at once
// (kogaki#1273): it is a system failure, so it is answered on the tick it is
// seen rather than after its siblings finish, which is the #1204 rule this
// replaces. `stop_requested` is read first, because the owner's stop click is
// answered whatever a unit is doing; the two time bounds are read only while a
// unit is still running.
function classifyDetachedJobState(units, {
  stopRequested, elapsedS, stalledS, absoluteLimitS,
  stallS = READER_PATH_JOB_STALL_S,
} = {}) {
  if (stopRequested) return "stopped";
  if (units.some((u) => u.status === "died")) return "died";
  const running = units.filter((u) => u.status === "running");
  if (running.length === 0) return reduceFinishedReaderPathUnits(units);
  if (elapsedS >= absoluteLimitS) return "ceiling";
  if (stalledS >= stallS) return "stalled";
  return "running";
}

// THE ABSOLUTE LIMIT KEEPS FINISHED CANDIDATES (kogaki#1273). Every unit still
// running when the job reaches its absolute limit (`absolute_limit_s`) ends
// `ceiling`, and the job is then reduced over the whole set like any other
// finished one: `done` when a unit finished, so the Candidate question is
// shown with what finished, and `ceiling` only when none did. The supervisor
// applies this when it kills those units, and `job await` applies the same
// function to a record its own clock reads past the limit before the
// supervisor's next tick has written it, so the two cannot disagree.
function readerPathJobAtLimit(units) {
  const atLimit = units.map((u) => (u.status === "running"
    ? { id: u.id, status: "ceiling", bytes: u.bytes || 0, note: "still running at the absolute limit; killed" }
    : u));
  return { units: atLimit, state: reduceFinishedReaderPathUnits(atLimit) };
}

// THE ONE RETRY, AND ONLY WHEN IT FITS (kogaki#1273, the owner's 2026-10-05
// ruling). A refused first attempt is retried once, and only if the job's
// elapsed time plus that attempt's own duration stays within the absolute
// limit: a retry that cannot finish before the limit is never started, which
// is the run of 2026-10-05 whose retries began with 140-200s left and ended as
// a timeout instead of the refusal that caused it. A refused retry is final --
// there is never a third attempt. Seconds may be fractional.
function readerPathRetryDecision({ attempt, elapsedS, attemptS, absoluteLimitS }) {
  if (attempt >= READER_PATH_UNIT_MAX_ATTEMPTS) return { retry: false };
  if (elapsedS + attemptS > absoluteLimitS) {
    return {
      retry: false,
      retry_skipped: {
        reason: "would pass the absolute limit",
        elapsed_s: elapsedS, attempt_s: attemptS, absolute_limit_s: absoluteLimitS,
      },
    };
  }
  return { retry: true };
}

// THE READER-PATH AWAIT'S OWN PER-POLL DECISION (kogaki#1213), pulled out of
// `awaitReaderPathJob` in `src/brief.mjs` as a pure function so a fixture can
// drive it without a live, 10-second heartbeat wait: the job record's units
// classified against the CURRENT elapsed time. THE LIMIT, READ BY THIS POLL'S
// OWN CLOCK (kogaki#1273): the running units end `ceiling` and the finished
// ones are kept, exactly as the supervisor reduces it -- never a Stop-only arm
// over a set that has a finished Candidate in it.
// THE LIMIT IS THE JOB'S OWN (kogaki#1307): `absolute_limit_s` as its starter wrote it
// onto the record from `kogaki.settings.json`, never a constant of this file.
export function readerPathAwaitStep(job, { stopRequested, elapsedS, stalledS } = {}) {
  const raw = job.units || [];
  const absoluteLimitS = readerPathJobLimitS(job);
  const classified = classifyDetachedJobState(raw, { stopRequested, elapsedS, stalledS, absoluteLimitS });
  return classified === "ceiling" ? readerPathJobAtLimit(raw) : { units: raw, state: classified };
}

export function readerPathJobLimitS(job) {
  const n = job && Number(job.absolute_limit_s);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("the job record carries no `absolute_limit_s` -- the job's starter writes it from kogaki.settings.json (kogaki#1307).");
  }
  return n;
}

function readerPathRefusedUnits(unitRows) {
  return unitRows.filter((x) => x.status === "refused").map((x) => ({
    id: x.id, attempts: x.attempts || 1,
    ...(x.failure && x.failure.file ? { file: x.failure.file } : {}),
    ...(x.retry_skipped ? { retry_skipped: x.retry_skipped } : {}),
  }));
}

// THE UNITS A `done` JOB DID NOT FINISH, NAMED ON ITS RECORD (kogaki#1273). A
// `done` job carries no `failure` block, so the refused and `ceiling` units
// beside its finished Candidates ride as their own top-level fields.
function readerPathDoneJobUnfinished(unitRows) {
  const refused_units = readerPathRefusedUnits(unitRows);
  const ceiling_units = unitRows.filter((x) => x.status === "ceiling").map((x) => x.id);
  return {
    ...(refused_units.length ? { refused_units } : {}),
    ...(ceiling_units.length ? { ceiling_units } : {}),
  };
}

// THE `failure` BLOCK FOR A NON-`done` JOB RECORD (kogaki#1193 acceptance 2:
// "every state but `done` carries `failure`"). A `died`/`refused` job's
// failure is the offending unit's own -- already shaped by
// `classifyDetachedJobUnit` -- carried up rather than re-described; the three
// whole-job exits (`ceiling`, `stalled`, `stopped`) and the catch-all `other`
// state each a fact ABOUT THE JOB, so they are described here.
function readerPathJobFailure(state, unitRows, { elapsedS, stalledS, note } = {}) {
  if (state === "died" || state === "refused") {
    const u = unitRows.find((x) => x.status === state);
    // THE FINISHED SIBLINGS' CANDIDATES, NAMED (kogaki#1204 acceptance 2): a
    // `died`/`refused` job's failure block used to name only the offending
    // unit, leaving a reader of the record to notice by hand that its
    // siblings finished. Every `done` row beside it is named here, by id and
    // by the file `cmdJobSupervise` already wrote for it the moment it
    // classified `done` — the record pointing at bytes that are still there.
    const kept_candidates = unitRows
      .filter((x) => x.status === "done" && x.candidate_file)
      .map((x) => ({ id: x.id, file: x.candidate_file }));
    // THE SIBLINGS A DIED UNIT ENDED (kogaki#1273): a system failure kills
    // every unit still running on the same tick, and the record names them.
    const killed_units = unitRows.filter((x) => x.status === "killed").map((x) => x.id);
    // EVERY REFUSED UNIT, NOT ONLY THE FIRST (kogaki#1273): a job ends
    // `refused` only when all of its units were refused.
    const refused_units = state === "refused" ? readerPathRefusedUnits(unitRows) : undefined;
    return {
      unit: u ? u.id : null, ...(u && u.failure ? u.failure : {}), kept_candidates,
      ...(killed_units.length ? { killed_units } : {}),
      ...(refused_units ? { refused_units } : {}),
    };
  }
  if (state === "ceiling") {
    return { elapsed_s: elapsedS, ceiling_units: unitRows.filter((x) => x.status === "ceiling").map((x) => x.id),
      note: "the absolute limit was reached before any unit finished; nothing written so far is deleted." };
  }
  if (state === "stalled") {
    return { stalled_s: stalledS, note: "no unit produced new output for the stall bound; nothing written so far is deleted." };
  }
  if (state === "stopped") {
    return { note: "the owner's stop click ended the job; every unit's partial output stands." };
  }
  // `other` (kogaki#1193's catch-all): an exit the supervisor's own top-level
  // catch reaches, naming what actually happened rather than folding it into
  // one of the named exits it does not match.
  return { note: note || `unclassified exit (${state})` };
}

// THE SUPERVISOR (kogaki#1193). Spawned DETACHED by `startDetachedJobSupervisor`
// below and never awaited by its spawner -- this function's own process
// outlives the hook that started it, which is the whole point of a Detached
// Job. It owns the per-unit children, the heartbeat write and the terminal
// classification; nothing else writes `reader-path-job.json` once this has
// started.
export async function cmdJobSupervise(args) {
  const dir = String(args.run || fail("job-supervise needs --run <dir> (internal verb, kogaki#1193)."));
  let unitsRunning = null;
  try {
    const unitsPath = String(args.units || fail("job-supervise needs --units <file>."));
    const command = String(args.command || fail("job-supervise needs --command <path>."));
    const model = String(args.model || fail("job-supervise needs --model <name>."));
    // THE LIMIT IS HANDED OVER, NEVER DEFAULTED (kogaki#1307): the starter read it from
    // `kogaki.settings.json`, and a supervisor told no limit refuses to start.
    const absoluteLimitS = Number(args["absolute-limit-s"]);
    if (!Number.isFinite(absoluteLimitS) || absoluteLimitS <= 0) throw new Error("job-supervise needs a positive --absolute-limit-s (kogaki#1307).");
    const stallS = Number(args["stall-s"]) || READER_PATH_JOB_STALL_S;
    const heartbeatMs = Number(args["heartbeat-ms"]) || READER_PATH_JOB_HEARTBEAT_MS;
    // THE DECLARED VALIDATOR, REQUIRED (kogaki#1240): a units file with no
    // `validator` key -- or naming no loadable export -- `fail()`s here,
    // before any child is spawned, and is caught by this function's own
    // catch-all below exactly like any other malformed units file.
    const declared = readJson(unitsPath);
    const units = Array.isArray(declared) ? declared : (declared.units || fail("the units file at " + unitsPath + " carries no `units` array."));
    const validate = await loadReaderPathUnitValidator(declared.validator);
    const fit = await loadReaderPathFitJudge(declared.fit_judge);
    const recordArray = typeof declared.record_array === "string" && declared.record_array ? declared.record_array : "legs";

    // THE MINIMAL ENVIRONMENT (kogaki#1193, kogaki#1197): only `units[].prompt` and the
    // session's own login; do not add the bare-session flag (it breaks OAuth auth), and keep
    // `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` in the child env.
    // THE OUTPUT FORMAT IS HARDCODED (PR #1195): `stream-json` with
    // `--include-partial-messages` is the stall bound's only progress signal; never make it
    // a per-caller option.
    const argv = ["-p", "--model", model,
      "--output-format", "stream-json", "--verbose", "--include-partial-messages",
      "--tools", "", "--disable-slash-commands", "--strict-mcp-config",
      "--setting-sources", "", "--no-session-persistence"];
    const childEnv = { CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" };
    const startedAt = Date.now();
    const nowS = () => Math.round((Date.now() - startedAt) / 100) / 10;
    // THE PER-UNIT STATE. `attempts` counts SCHEMA REFUSALS answered by a re-ask
    // (kogaki#1203): it starts at 1 and reaches `READER_PATH_UNIT_MAX_ATTEMPTS` at most;
    // `firstRefusal` holds attempt 1's refusal so a unit refused twice reports both.
    // `malformed` counts MALFORMED OUTPUT respawns (kogaki#1307), which spend no attempt.
    // `phase` is `compose` while the unit's own record is being written and `fit` while
    // its Move fit is judged; `composed` holds the record the fit call judges.
    const S = new Map(units.map((u) => [u.id, {
      attempts: 1, malformed: 0, phase: "compose", prompt: withNoToolsSentence(u.prompt),
      composed: null, fitPrompt: null, firstRefusal: undefined, retrySkipped: undefined,
      attemptStartedAt: startedAt, callStartedAt: startedAt, final: null,
    }]));
    const spawnCompose = (u, flag) => spawnDetachedJobUnit(command, argv, S.get(u.id).prompt, () => {}, childEnv,
      { path: readerPathUnitStdoutPath(dir, u.id), flag });
    const spawnFit = (u, flag) => spawnDetachedJobUnit(command, argv, S.get(u.id).fitPrompt, () => {}, childEnv,
      { path: readerPathUnitFitStdoutPath(dir, u.id), flag });
    unitsRunning = new Map(units.map((u) => [u.id, spawnCompose(u, "w")]));
    let lastProgressAt = startedAt;
    let lastBytesTotal = 0;

    // ONE FINISHED CALL OF ONE UNIT, ANSWERED (kogaki#1307). Returns the row while the
    // unit is still working, and sets `st.final` once it has ended.
    const answer = (u, sp) => {
      const st = S.get(u.id);
      const cls = st.phase === "compose"
        ? classifyDetachedJobUnit(sp.out, validate, recordArray, u.id)
        : classifyFitJudgeCall(sp.out, fit, st.composed, u.id);
      const stdoutPath = st.phase === "compose" ? readerPathUnitStdoutPath(dir, u.id) : readerPathUnitFitStdoutPath(dir, u.id);
      const callS = Math.round(((Date.parse(sp.out.endedAt) || Date.now()) - st.callStartedAt) / 100) / 10;
      // MALFORMED OUTPUT IS RETRIED MECHANICALLY (kogaki#1307): the same prompt again,
      // no attempt spent, bounded only by the job limit -- a respawn that could not
      // finish inside it is never started.
      if (cls.status === "malformed") {
        st.malformed += 1;
        const fits = readerPathRetryDecision({ attempt: 0, elapsedS: nowS(), attemptS: callS, absoluteLimitS });
        if (fits.retry) {
          try { appendFileSync(stdoutPath, `\n----- malformed output ${st.malformed}; respawned with the same prompt -----\n`); } catch { /* best-effort */ }
          const respawned = st.phase === "compose" ? spawnCompose(u, "a") : spawnFit(u, "a");
          unitsRunning.set(u.id, respawned);
          st.callStartedAt = Date.now();
          return { row: { id: u.id, status: "running", bytes: 0 }, progressed: true };
        }
        st.retrySkipped = fits.retry_skipped;
        cls.status = "refused";
      }
      // A FINISHED, VALID RECORD WITH A DECLARED MOVE-FIT JUDGE IS JUDGED NEXT, inside
      // the same unit and the same limit (kogaki#1307).
      if (cls.status === "done" && st.phase === "compose" && fit) {
        st.phase = "fit";
        st.composed = cls.candidate;
        st.fitPrompt = withNoToolsSentence(fit.prompt(cls.candidate, u.id));
        unitsRunning.set(u.id, spawnFit(u, "w"));
        st.callStartedAt = Date.now();
        return { row: { id: u.id, status: "running", bytes: 0 }, progressed: true };
      }
      // THE ONE RE-ASK (kogaki#1203, bounded by kogaki#1273): a SCHEMA REFUSAL on attempt
      // 1 -- the validator's, or the Move-fit judge's sentence -- respawns the compose call
      // with the refusal spliced in verbatim, only when it fits inside the limit. `died`
      // is never retried: it is a system failure.
      if (cls.status === "refused" && cls.failure.class === SCHEMA_REFUSAL && st.retrySkipped === undefined) {
        const decision = readerPathRetryDecision({
          attempt: st.attempts, elapsedS: nowS(),
          attemptS: Math.round(((Date.parse(sp.out.endedAt) || Date.now()) - st.attemptStartedAt) / 100) / 10,
          absoluteLimitS,
        });
        if (decision.retry_skipped) st.retrySkipped = decision.retry_skipped;
        if (decision.retry) {
          const refusal = cls.failure.stderr_tail;
          st.firstRefusal = refusal;
          const composePath = readerPathUnitStdoutPath(dir, u.id);
          try { appendFileSync(composePath, `\n----- attempt ${st.attempts + 1} -----\n`); } catch { /* best-effort */ }
          st.prompt = readerPathUnitRetryPrompt(withNoToolsSentence(u.prompt), refusal);
          st.attempts += 1;
          st.phase = "compose";
          st.composed = null;
          unitsRunning.set(u.id, spawnCompose(u, "a"));
          st.attemptStartedAt = Date.now();
          st.callStartedAt = st.attemptStartedAt;
          return { row: { id: u.id, status: "running", bytes: 0 }, progressed: true };
        }
      }
      // THE UNIT HAS ENDED. Its row keeps every count a reader needs to see a unit that
      // drifted toward a bound: attempts, malformed outputs, the first refusal, a retry
      // not started.
      if (cls.status === "died" || cls.status === "refused") {
        cls.failure = { ...cls.failure, file: stdoutPath,
          ...(st.firstRefusal !== undefined ? { first_refusal: st.firstRefusal } : {}) };
      }
      const traced = st.firstRefusal !== undefined || st.retrySkipped !== undefined || st.malformed > 0;
      const row = {
        id: u.id, bytes: sp.out.bytes, ...cls,
        ...(traced ? { attempts: st.attempts } : {}),
        ...(st.malformed > 0 ? { malformed_output: st.malformed } : {}),
        ...(st.firstRefusal !== undefined ? { first_refusal: st.firstRefusal } : {}),
        ...(st.retrySkipped !== undefined ? { retry_skipped: st.retrySkipped } : {}),
      };
      // A SCHEMA-VALID CANDIDATE IS KEPT ON EVERY ENDING (PR #1308 round 1): a unit whose
      // fit call refused, died or ran out of time still carries the Candidate it composed,
      // so the record holds it. It is not offered: its Move fit was not judged `consistent`,
      // and "The judged half — the specialization verdict" makes that judgment an occasion with no skip.
      if (st.composed && cls.status !== "done") { row.candidate = st.composed; row.fit_judged = cls.status === "refused" && !!cls.specialization; }
      // THE CANDIDATE IS WRITTEN TO DISK THE MOMENT THIS UNIT ENDS `done` (kogaki#1204
      // acceptance 2), whatever its siblings are doing; with a Move-fit judge, the
      // specialization record is written beside it (kogaki#1307).
      if (cls.status === "done") {
        const candidate = st.composed || cls.candidate;
        row.candidate = candidate;
        row.candidate_file = readerPathUnitCandidatePath(dir, u.id);
        try { writeFileSync(row.candidate_file, `${JSON.stringify(candidate, null, 2)}\n`); }
        catch { /* the job record's own embedded `candidate` is still the truth */ }
        if (cls.specialization) {
          row.specialization_file = readerPathUnitSpecializationPath(dir, u.id);
          try { writeFileSync(row.specialization_file, `${JSON.stringify(cls.specialization, null, 2)}\n`); }
          catch { /* the job record's own embedded `specialization` is still the truth */ }
        }
      }
      st.final = row;
      return { row, progressed: false };
    };

    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- one supervisor, one loop,
      // ordinary sequential polling; `spawnDetachedJobUnit`'s children still
      // service their own stdout/stderr/close events on this event loop
      // between ticks, which is why this is `setTimeout` and never the
      // synchronous `Atomics.wait` `job await` uses on the CLI side -- that one
      // has no children of its own to starve.
      await new Promise((r) => { setTimeout(r, heartbeatMs); });
      const stopRequested = existsSync(readerPathJobStopFlagPath(dir));
      let bytesTotal = 0;
      // A RESPAWN IS PROGRESS TOO (kogaki#1203): the respawned child's byte counter
      // starts back at 0, so `bytesTotal` can fall even though real work just
      // happened -- tracked separately so a respawn is never mistaken for a stall.
      let progressed = false;
      const unitRows = units.map((u) => {
        const st = S.get(u.id);
        if (st.final) { bytesTotal += st.final.bytes || 0; return st.final; }
        const sp = unitsRunning.get(u.id);
        if (!sp.out.done) { bytesTotal += sp.out.bytes; return { id: u.id, status: "running", bytes: sp.out.bytes }; }
        const a = answer(u, sp);
        if (a.progressed) progressed = true;
        bytesTotal += a.row.bytes || 0;
        return a.row;
      });
      if (progressed || bytesTotal > lastBytesTotal) { lastBytesTotal = bytesTotal; lastProgressAt = Date.now(); }
      const elapsedS = Math.floor((Date.now() - startedAt) / 1000);
      const stalledS = Math.floor((Date.now() - lastProgressAt) / 1000);
      let state = classifyDetachedJobState(unitRows, { stopRequested, elapsedS, stalledS, absoluteLimitS, stallS });
      let rows = unitRows;
      if (state === "ceiling") {
        // THE LIMIT KEEPS WHAT FINISHED (kogaki#1273): the units still running
        // end `ceiling` and are killed below; the job is `done` if any unit is.
        ({ units: rows, state } = readerPathJobAtLimit(unitRows));
      } else if (READER_PATH_JOB_SYSTEM_FAILURE_STATES.includes(state)) {
        // A SYSTEM FAILURE ENDS EVERY UNIT ON THIS TICK (kogaki#1273): the
        // units still running are killed below, with no retry, and their rows
        // say so rather than reading `running` on a job that has ended.
        rows = unitRows.map((r) => (r.status === "running"
          ? { id: r.id, status: "killed", bytes: r.bytes || 0, note: `killed on the tick the job ended ${state}` } : r));
      }
      // A UNIT ENDED MID-FIT KEEPS ITS COMPOSED CANDIDATE (PR #1308 round 1), on the
      // ground the ended-unit row above states: on the record, never offered.
      if (state !== "running") {
        rows = rows.map((r) => {
          const st = S.get(r.id);
          return st && st.composed && r.status !== "done" && !r.candidate
            ? { ...r, candidate: st.composed, fit_judged: false } : r;
        });
      }
      writeReaderPathJob(dir, {
        started_at: new Date(startedAt).toISOString(),
        absolute_limit_s: absoluteLimitS,
        last_progress_at: new Date(lastProgressAt).toISOString(),
        supervisor_pid: process.pid,
        state,
        units: rows,
        ...(state === "done" ? readerPathDoneJobUnfinished(rows) : {}),
        ...(state !== "done" && state !== "running"
          ? { failure: readerPathJobFailure(state, rows, { elapsedS, stalledS }) } : {}),
      });
      if (state === "running") continue;
      for (const u of units) {
        const sp = unitsRunning.get(u.id);
        if (!sp.out.done) { try { sp.child.kill("SIGKILL"); } catch { /* already gone */ } }
      }
      break;
    }
  } catch (e) {
    // THE CATCH-ALL (kogaki#1193's `other`): an exit nothing above named --
    // a bad units file, a spawn that threw synchronously, anything this
    // function itself did not anticipate. Written best-effort: a record this
    // process cannot even open is a record `job await` reads as `died` on its
    // own staleness check, never as a silent nothing.
    try {
      for (const [, sp] of unitsRunning || []) {
        if (sp.child && !sp.out.done) { try { sp.child.kill("SIGKILL"); } catch { /* already gone */ } }
      }
      const existing = readReaderPathJob(dir) || { started_at: new Date().toISOString(), units: [] };
      writeReaderPathJob(dir, {
        ...existing,
        supervisor_pid: process.pid,
        state: "other",
        failure: readerPathJobFailure("other", existing.units || [], { note: `the supervisor process itself failed: ${e.message}` }),
      });
    } catch { /* the write itself failing leaves the prior record, which is still the truth as of its own timestamp */ }
  }
}

// THE STARTER (kogaki#1193), called in-process from `compose_path`'s own
// STATE_WORK -- never from a Bash command. Writes the units file the
// supervisor reads (the ONE thing the Harness hands it, per the owner's
// "strictly control what information is passed" ruling), spawns it DETACHED
// and returns immediately without waiting on it: the whole reason a
// `DetachedJobStarted` throw follows this call rather than a blocking wait.
export function startDetachedJobSupervisor(dir, opts) {
  const validator = opts.validator || fail("startDetachedJobSupervisor needs a declared `validator` (kogaki#1240).");
  const absoluteLimitS = Number(opts.absoluteLimitS);
  if (!Number.isFinite(absoluteLimitS) || absoluteLimitS <= 0) {
    fail("startDetachedJobSupervisor needs a positive `absoluteLimitS`, read from kogaki.settings.json (kogaki#1307).");
  }
  const unitsPath = join(dir, "reader-path-job-units.json");
  // EVERY UNIT PROMPT BEGINS WITH THE NO-TOOLS SENTENCE (kogaki#1307), written here so the
  // units file a reader opens is the prompt each headless session was given.
  const units = opts.units.map((u) => ({ ...u, prompt: withNoToolsSentence(u.prompt) }));
  writeFileSync(unitsPath, `${JSON.stringify({ units, validator,
    ...(opts.fitJudge ? { fit_judge: opts.fitJudge } : {}),
    ...(opts.recordArray ? { record_array: opts.recordArray } : {}) }, null, 2)}\n`);
  const scriptPath = join(REPO, "src", "terrain.mjs");
  const child = spawn(process.execPath, [
    scriptPath, "job-supervise",
    "--run", dir, "--units", unitsPath,
    "--command", opts.command, "--model", opts.model, "--output-format", opts.outputFormat,
    "--absolute-limit-s", String(absoluteLimitS),
    "--stall-s", String(opts.stallS), "--heartbeat-ms", String(opts.heartbeatMs),
  ], { detached: true, stdio: "ignore", cwd: REPO });
  child.unref();
  const now = new Date().toISOString();
  writeReaderPathJob(dir, {
    started_at: now,
    absolute_limit_s: absoluteLimitS,
    last_progress_at: now,
    supervisor_pid: child.pid,
    state: "running",
    units: opts.units.map((u) => ({ id: u.id, status: "running", bytes: 0 })),
  });
  return { unitsPath, supervisorPid: child.pid };
}
