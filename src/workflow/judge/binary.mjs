// workflow/judge/binary — the judge's invocation record and the binary it is run with. Cut from
// src/workflow/judge.mjs along its headed sections (kogaki#1800); the design and its rulings are
// stated at the entry and in the Issues each block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, resolve, sep } from "node:path";
import { fail } from "../run-record.mjs";

// THE `observed` PRODUCER (kogaki#1030): the executor's OWN record of each judge call —
// pinned model, command, state, Call count, response sha from disk.
// Nothing in it comes from the response's content (kogaki#892).
// Set by `invokeJudge` alone; an argv-supplied record sets none and stays `declared`.
export const JUDGE_INVOCATIONS = new Map();

export function recordJudgeInvocation(stateId, invocation) {
  JUDGE_INVOCATIONS.set(stateId, invocation);
}
// ---- THE JUDGE BINARY IS RESOLVED ONCE, BY THE SESSION THAT STARTS THE RUN
// (kogaki#1076).
// Resolution walks PATH and RUNS each candidate with `--version`; the first that exits 0
// wins. Existence and the execute bit do not discriminate (a broken shim has both).
const JUDGE_VERSION_PROBE_MS = 20000;

// THE ORDER `PATH` DECLARES, DE-DUPLICATED. A command carrying a separator is
// not a `PATH` lookup at all and stands as its own single candidate -- that is
// the absolute form this act exists to produce, and an absolute path handed in
// is already it.
function judgeBinaryCandidates(command, pathEnv) {
  if (command.includes("/") || command.includes(sep)) return [resolve(command)];
  const seen = new Set();
  const out = [];
  for (const entry of String(pathEnv || "").split(delimiter)) {
    if (!entry) continue;
    const cand = resolve(entry, command);
    if (seen.has(cand)) continue;
    seen.add(cand);
    out.push(cand);
  }
  return out;
}

// STDIN IS CLOSED FOR THE PROBE. A judgment call feeds its prompt on stdin, and
// a binary that blocked here waiting for one would hang the start act rather
// than answering it -- so the probe is bounded as well, on the ground the
// per-call bound is: a bound a hung child can outlast is not a bound.
function probeJudgeBinary(candidate) {
  const r = spawnSync(candidate, ["--version"], {
    stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: JUDGE_VERSION_PROBE_MS,
  });
  if (r.error) return { ok: false, why: `${r.error.code || "spawn failed"}: ${r.error.message}` };
  if (r.status !== 0) {
    const said = String(r.stderr || r.stdout || "").trim().split("\n")[0].trim() || "(no output)";
    return { ok: false, why: `${r.status === null ? `killed on ${r.signal}` : `exited ${r.status}`}: ${said}` };
  }
  const first = (t) => String(t || "").trim().split("\n")[0].trim();
  return { ok: true, version: first(r.stdout) || first(r.stderr) || "(no version output)" };
}

// THE REFUSAL NAMES WHAT `PATH` OFFERED, every candidate that existed and the
// reason each one was rejected. "The judge could not be run" over a bare word
// tells an operator nothing they can act on; the shim's own stderr, quoted
// beside the path it came from, is the whole diagnosis.
export function resolveJudgeBinary(command, pathEnv) {
  const candidates = judgeBinaryCandidates(command, pathEnv);
  const rejected = [];
  for (const cand of candidates) {
    // NOT PROBED WHERE NOTHING IS THERE, and this is not the discriminating
    // check returning: a candidate that does not exist is not REJECTED on a
    // property, it is simply not a candidate, and spawning it to learn ENOENT
    // would cost one child per `PATH` entry to reach the same list.
    if (!existsSync(cand)) continue;
    const r = probeJudgeBinary(cand);
    if (r.ok) return { command, path: cand, version: r.version, rejected };
    rejected.push({ path: cand, why: r.why });
  }
  fail(`the judge command ${JSON.stringify(command)} resolves to no runnable binary. The judgment `
    + `states run a pinned model through this command, and the run resolves it ONCE -- here, in the `
    + `session that starts the run -- so that an advance fired from another session cannot run a `
    + `different executable (kogaki#1076).\n`
    + `  searched ${candidates.length} candidate(s) over PATH, ${rejected.length} of which exist:\n`
    + (rejected.length
      ? rejected.map((r) => `    ${r.path}\n      ${r.why}`).join("\n")
      : "    (none -- no PATH entry carries a file by that name)")
    + `\n  Each candidate is RUN with \`--version\` and the first to exit 0 is taken: existence and the `
    + `execute bit do not discriminate a working install from a shim whose own \`exec\` fails.`);
}

// RESOLVED AT THE START ACT (kogaki#1076 item 1) and read back by later acts; a record
// that carries one is never re-resolved. An older record resolves at its next act —
// never falls back to the bare word. `KOGAKI_JUDGE_CLI` is resolved like any command.
export function ensureJudgeBinary(rec, table) {
  if (rec.judge_binary) return rec.judge_binary;
  const declared = process.env.KOGAKI_JUDGE_CLI || ((table && table.judge) || {}).command;
  // A TABLE THAT DECLARES NO JUDGE REACHES NO JUDGMENT STATE, so there is
  // nothing to resolve and nothing to refuse. `judgeSettings` still refuses the
  // missing block at the state that needs it.
  if (!declared) return null;
  const r = resolveJudgeBinary(String(declared), process.env.PATH);
  rec.judge_binary = {
    command: r.command,
    path: r.path,
    version: r.version,
    stubbed: !!process.env.KOGAKI_JUDGE_CLI,
  };
  return rec.judge_binary;
}
