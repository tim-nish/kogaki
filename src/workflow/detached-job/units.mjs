// workflow/detached-job/units — one job unit: its files, its prompt, its child process and its
// classification. Cut from src/workflow/detached-job.mjs along its headed sections (kogaki#1800);
// the design and its rulings are stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { spawn } from "node:child_process";
import { openSync, closeSync, writeSync } from "node:fs";
import { join } from "node:path";
import { JUDGE_INPUT_MARKER, judgeRefusalBlock } from "../judge.mjs";

// ONE FILE PER UNIT, NAMED BY ITS ID (kogaki#1203 acceptance 2). Every
// Round of a retried unit lands in this same path -- the first Round's
// bytes, a divider line, then the next's -- so a unit that dies or is
// refused is inspectable from one path rather than a reader having to guess
// which Round's file survived.
export function readerPathUnitStdoutPath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.stdout`);
}

// ONE FILE PER FINISHED CANDIDATE, WRITTEN THE MOMENT ITS UNIT CLASSIFIES
// `done` (kogaki#1204). The job record already carries the same object
// embedded in the unit's own row, but that row lives inside one JSON file
// rewritten every heartbeat -- this is a second, narrower write, made once
// per unit and never touched again, so a finished Candidate is recoverable by
// itself whatever the job's own terminal state turns out to be and whatever
// else the record is rewritten to say next tick.
// Exported for a starter that carries a finished unit's files into a new run (kogaki#1641).
export function readerPathUnitCandidatePath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.candidate.json`);
}

// THE RETRIED UNIT'S PROMPT (kogaki#1203; shares its renderer with `judgePrompt` as of
// kogaki#1395): the first prompt, verbatim, with `judgeRefusalBlock`'s text for the unit's
// WHOLE refusal history -- not only the last -- spliced in BEFORE `JUDGE_INPUT_MARKER`,
// exactly where `judgePrompt` puts the same block (PR #1207 review round 1): a block past
// that marker would be read as input, the #1203 defect. The supervisor reads no table and
// no `st`, so it splices into the prompt `startDetachedJobSupervisor` wrote rather than
// re-rendering; splicing the SAME renderer's text is what keeps the two byte-identical
// (`checks/check-brief-reader-path-job.sh` assertion (k)).
export function readerPathUnitRetryPrompt(firstPrompt, history) {
  const block = judgeRefusalBlock(history);
  const at = firstPrompt.indexOf(`\n${JUDGE_INPUT_MARKER}\n`);
  if (at < 0) return firstPrompt + "\n" + block;
  return firstPrompt.slice(0, at) + block + "\n" + firstPrompt.slice(at);
}

// THE SENTENCE AT THE HEAD OF EVERY JOB UNIT PROMPT (kogaki#1307). A headless session
// spawned with `--tools ""` that reads a repository path in its prompt may answer with a
// tool call written as text -- the malformed output of run brief-2026-10-08T02-55-02-626Z.
// `startDetachedJobSupervisor` puts this first in every unit prompt it writes, and the
// supervisor puts it first in every Move-fit prompt it builds, so no caller can omit it.
const JOB_UNIT_NO_TOOLS_SENTENCE =
  "You are running with no tools and cannot open files. Every file path " +
  "in this prompt is a citation for a human reader, not something to open; everything you need is in this " +
  "prompt. Answer with the record alone.";

// A JUDGE'S REFUSAL, AS THE SITE LOOP READS IT (kogaki#1642, kogaki#1777): one failure per site it
// names, or, where it names none, one failure refusing the record whole.
export function judgedSites(failure) {
  const named = (failure.move_fit || []).map((f) => ({
    ...f,
    site: f.site ?? f.waypoint ?? null,
    refusal: f.refusal || f.why,
  }));
  return named.length ? named : [{ site: null, refusal: failure.stderr_tail }];
}

export function withNoToolsSentence(prompt) {
  const p = String(prompt);
  return p.startsWith(JOB_UNIT_NO_TOOLS_SENTENCE) ? p : `${JOB_UNIT_NO_TOOLS_SENTENCE}\n\n${p}`;
}

// THE MOVE-FIT CALL'S OWN FILES (kogaki#1307): its raw output, and the specialization
// record it returned for a unit that finished, beside the unit's Candidate.
export function readerPathUnitFitStdoutPath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.fit.stdout`);
}

export function readerPathUnitSpecializationPath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.specialization.json`);
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
// first Round, `"a"` for a retried Round that appends past a divider its
// caller already wrote. This is what puts a unit's raw output on disk BEFORE
// the job ends, including a call the per-call limit or the stall bound kills mid-run:
// the write happens as each chunk arrives rather than at `close`, where a
// killed child never gets there.
export function spawnDetachedJobUnit(command, argv, input, onBytes, env, stdoutFile) {
  const out = { bytes: 0, chunks: [], errChunks: [], done: false, exitCode: null, error: null, endedAt: null };
  let child;
  let fd = null;
  if (stdoutFile && stdoutFile.path) {
    try {
      fd = openSync(stdoutFile.path, stdoutFile.flag || "w");
    } catch {
      fd = null;
    }
  }
  const closeFd = () => {
    if (fd === null) return;
    try {
      closeSync(fd);
    } catch {
      /* already gone */
    }
    fd = null;
  };
  try {
    child = spawn(command, argv, {
      stdio: ["pipe", "pipe", "pipe"],
      env: env ? { ...process.env, ...env } : process.env,
    });
  } catch (e) {
    closeFd();
    out.error = e;
    out.done = true;
    out.endedAt = new Date().toISOString();
    return { child: null, out };
  }
  child.stdout.on("data", (d) => {
    out.bytes += d.length;
    out.chunks.push(d);
    if (fd !== null) {
      try {
        writeSync(fd, d);
      } catch {
        /* the disk copy is best-effort; `out.chunks` is still the truth */
      }
    }
    if (onBytes) onBytes(out.bytes);
  });
  child.stderr.on("data", (d) => out.errChunks.push(d));
  child.on("error", (e) => {
    out.error = e;
  });
  child.on("close", (code) => {
    out.exitCode = code;
    out.done = true;
    out.endedAt = new Date().toISOString();
    closeFd();
  });
  try {
    child.stdin.end(input);
  } catch {
    /* a child that exited before reading its prompt is the failure arm's */
  }
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
  const lines = String(stdout == null ? "" : stdout)
    .split("\n")
    .filter((l) => l.trim() !== "");
  let resultLine = null;
  let anyValidJson = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try {
      obj = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    anyValidJson = true;
    if (obj && typeof obj === "object" && obj.type === "result") {
      resultLine = obj;
      break;
    }
  }
  if (!resultLine) {
    return {
      error: anyValidJson ? 'no `type: "result"` line in the stream-json output' : "not JSON: no line parsed as JSON",
    };
  }
  const inner = Object.prototype.hasOwnProperty.call(resultLine, "result") ? resultLine.result : resultLine;
  const record =
    typeof inner === "string"
      ? (() => {
          try {
            return JSON.parse(inner);
          } catch (e) {
            return { __parseError: `result did not parse: ${e.message}` };
          }
        })()
      : inner;
  if (record && record.__parseError) return { error: record.__parseError };
  if (!record || typeof record !== "object" || Array.isArray(record)) return { error: "not a JSON object" };
  // THE ARRAY THE RECORD MUST CARRY IS DECLARED BY THE UNITS FILE (kogaki#1301):
  // `legs` for a reader-path unit, `claim_register` for a path-review unit; `false` for a
  // unit whose answer may carry no array at all (kogaki#1583).
  if (recordArray !== false && !Array.isArray(record[recordArray])) return { error: `no \`${recordArray}\` array` };
  return { candidate: record };
}

// THE DEAD UNIT'S LAST `result` LINE (kogaki#1197): even a unit that exits
// non-zero streams `stream-json`, so its last `{"type":"result",...}` line
// still carries the CLI's own `is_error: true` reading of what went wrong
// (e.g. "Not logged in · Please run /login") -- read here rather than left to
// `readerPathUnitRecord`, whose "not a JSON object" / "no `legs` array"
// checks are shaped for a LIVE candidate, not a dead unit's error string.
function readerPathDeadUnitResult(stdout) {
  const lines = String(stdout == null ? "" : stdout)
    .split("\n")
    .filter((l) => l.trim() !== "");
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try {
      obj = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (
      obj &&
      typeof obj === "object" &&
      obj.type === "result" &&
      obj.is_error === true &&
      typeof obj.result === "string"
    ) {
      return obj.result;
    }
  }
  return null;
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
export const SCHEMA_REFUSAL = "schema refusal";
// A UNIT WHOSE LAST ROUND'S CALL RAN PAST `call_limit_s` (kogaki#1355) ends `refused`
// with this class: a time bound, never a system failure.
export const CALL_TIME_LIMIT = "call time limit";

export function classifyDetachedJobUnit(out, validate, recordArray = "legs", unitId = null) {
  if (out.error) {
    return {
      status: "died",
      failure: {
        exit_code: out.exitCode,
        stderr_tail: readerPathBytes(String(out.error.message || out.error), 4000),
        bytes_written: out.bytes,
        ended_at: out.endedAt,
      },
    };
  }
  if (out.exitCode !== 0) {
    const result = readerPathDeadUnitResult(Buffer.concat(out.chunks || []).toString("utf8"));
    return {
      status: "died",
      failure: {
        exit_code: out.exitCode,
        stderr_tail: readerPathBytes(Buffer.concat(out.errChunks).toString("utf8"), 4000),
        bytes_written: out.bytes,
        ended_at: out.endedAt,
        ...(result !== null ? { result } : {}),
      },
    };
  }
  const r = readerPathUnitRecord(Buffer.concat(out.chunks).toString("utf8"), recordArray);
  if (r.error) {
    return {
      status: "malformed",
      failure: {
        class: MALFORMED_OUTPUT,
        exit_code: out.exitCode,
        stderr_tail: readerPathBytes(r.error, 4000),
        bytes_written: out.bytes,
        ended_at: out.endedAt,
      },
    };
  }
  if (validate) {
    const refusal = validate(r.candidate, unitId);
    if (refusal) {
      // The refused record rides the classification so the next Round can be shown it
      // (kogaki#1438); `endUnit` keeps it off the row, where `candidate` means schema-valid.
      const text = typeof refusal === "string" ? refusal : refusal.text;
      return {
        status: "refused",
        candidate: r.candidate,
        failure: {
          class: SCHEMA_REFUSAL,
          exit_code: out.exitCode,
          stderr_tail: readerPathBytes(String(text), 4000),
          bytes_written: out.bytes,
          ended_at: out.endedAt,
          ...(typeof refusal === "object" ? { sites: refusal.sites } : {}),
          ...(typeof refusal === "object" && refusal.reach
            ? { group: refusal.group, reach: refusal.reach, ...(refusal.undeclared ? { undeclared: true } : {}) }
            : {}),
        },
      };
    }
  }
  return { status: "done", candidate: r.candidate };
}

// THE MOVE-FIT CALL'S CLASSIFICATION (kogaki#1307), over the second headless session a
// unit runs once its record passed the validator. A dead call is `died`, as for the
// compose call; a judge answer with no record, or one whose own shape the declared
// verdict function refuses, is `malformed` and is respawned; a `contradicts` or
// `cannot-determine` on any Leg is a SCHEMA REFUSAL of the unit's Candidate, carrying
// the judge's sentences verbatim, which the unit's next Round answers.
export function classifyFitJudgeCall(out, fit, candidate, unitId, scope = null) {
  const base = classifyDetachedJobUnit(out, null, fit.recordArray || "verdicts", unitId);
  if (base.status !== "done") return base;
  const v = fit.verdict(base.candidate, candidate, unitId, scope);
  if (v.error) {
    return {
      status: "malformed",
      failure: {
        class: MALFORMED_OUTPUT,
        exit_code: out.exitCode,
        stderr_tail: readerPathBytes(String(v.error), 4000),
        bytes_written: out.bytes,
        ended_at: out.endedAt,
      },
    };
  }
  if (v.refusal) {
    return {
      status: "refused",
      specialization: base.candidate,
      failure: {
        class: SCHEMA_REFUSAL,
        exit_code: out.exitCode,
        stderr_tail: readerPathBytes(String(v.refusal), 4000),
        bytes_written: out.bytes,
        ended_at: out.endedAt,
        move_fit: v.failures || [],
      },
    };
  }
  return { status: "done", specialization: base.candidate };
}
