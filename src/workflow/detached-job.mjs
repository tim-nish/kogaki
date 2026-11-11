// The workflow engine — the Detached Job and its supervisor.
// Shared by every command that runs a workflow table, so it lives outside every command
// directory (kogaki#1259, kogaki#1302).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { spawn } from "node:child_process";
import { writeFileSync, appendFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { REPO, fail, readJson } from "./run-record.mjs";
import { loadSiteRetry, SiteLoop } from "./site-retry.mjs";
import { writeCallRecord, pinCallRefusal, cliRecord, tableRecord } from "./call-record.mjs";
import {
  CALL_TIME_LIMIT,
  SCHEMA_REFUSAL,
  classifyDetachedJobUnit,
  classifyFitJudgeCall,
  judgedSites,
  readerPathUnitCandidatePath,
  readerPathUnitFitStdoutPath,
  readerPathUnitRetryPrompt,
  readerPathUnitSpecializationPath,
  readerPathUnitStdoutPath,
  spawnDetachedJobUnit,
  withNoToolsSentence,
} from "./detached-job/units.mjs";
import {
  MAPPER_PHASES,
  loadMapper,
  loadReaderPathFitJudge,
  loadReaderPathUnitValidator,
} from "./detached-job/loaders.mjs";
import {
  READER_PATH_JOB_STALL_S,
  READER_PATH_JOB_SYSTEM_FAILURE_STATES,
  classifyDetachedJobState,
  readReaderPathJob,
  readerPathDoneJobUnfinished,
  readerPathJobFailure,
  readerPathJobStopFlagPath,
  writeReaderPathJob,
} from "./detached-job/job-state.mjs";
export {
  readerPathUnitCandidatePath,
  readerPathUnitRetryPrompt,
  readerPathUnitSpecializationPath,
} from "./detached-job/units.mjs";
export { loadReaderPathUnitValidator } from "./detached-job/loaders.mjs";
export {
  READER_PATH_JOB_STALL_S,
  READER_PATH_JOB_SYSTEM_FAILURE_STATES,
  RETIRED_JOB_LIMIT_KEYS,
  readReaderPathJob,
  readerPathAwaitStep,
  readerPathJobBounds,
  readerPathJobPath,
  readerPathJobStopFlagPath,
} from "./detached-job/job-state.mjs";

// The unit row's field holding its first call's seconds; the FLP reads it by this name (kogaki#1758).
export const FIRST_CALL_SECONDS_FIELD = "call_1_s";

// ============ THE DETACHED JOB (kogaki#1193) ============
// `compose_path` starts the job and throws `DetachedJobStarted`; the state is NOT complete
// and no gate is raised. `job await` resumes a FINISHED job (`detached-job` attribution).
// This file stays generic: the PROMPT and the declared VALIDATOR (kogaki#1240) come from the
// flow binding; never import `validateLegs` or anything Brief-specific here.
// Each job unit is a HEADLESS SESSION (a `claude -p` child that runs with no tools), and
// its answer fails in one of two classes (kogaki#1307): MALFORMED OUTPUT -- not JSON, or no
// record in it -- respawns the unit with the same prompt and counts no Round; a SCHEMA
// REFUSAL -- a record the declared validator, or the declared Move-fit judge, refuses --
// spends one of the unit's Rounds and is re-asked (kogaki#1203, counted by kogaki#1355).
export class DetachedJobStarted extends Error {
  constructor(stateId, jobRecordPath, message) {
    super(message);
    this.stateId = stateId;
    this.jobRecordPath = jobRecordPath;
  }
}
export const READER_PATH_JOB_HEARTBEAT_MS = 10000;

// A FIXTURE-SUPPLIED HEARTBEAT (kogaki#1424). The heartbeat paces both the supervisor's
// own loop and every CLI-side poll over its record, so a check driving a production
// workflow table against a judge that answers at once still waited a whole 10 s per
// poll. A check hands in a short one through `KOGAKI_JOB_HEARTBEAT_MS`; a run with it
// unset reads exactly what the table (or the constant above) declares. The production
// value is injected around, never shrunk.
export function jobHeartbeatMs(declared) {
  const fixture = Number(process.env.KOGAKI_JOB_HEARTBEAT_MS);
  if (Number.isFinite(fixture) && fixture > 0) return fixture;
  return Number(declared) || READER_PATH_JOB_HEARTBEAT_MS;
}

// A FIXTURE-SUPPLIED STALL BOUND (kogaki#1439), the heartbeat's twin above: a check whose
// assertion is that a call pausing longer than the bound still ends `done` hands in a short
// one through `KOGAKI_JOB_STALL_S`, rather than waiting out the production 90 s. A run with
// it unset reads exactly what the table (or the constant above) declares.
export function jobStallS(declared) {
  const fixture = Number(process.env.KOGAKI_JOB_STALL_S);
  if (Number.isFinite(fixture) && fixture > 0) return fixture;
  return Number(declared) || READER_PATH_JOB_STALL_S;
}

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
// included, for the Arm screen and for a later reader. The six are `done`,
// `refused`, `stopped`, `stalled`, `died` and `other` (`ceiling` left with the
// whole-job limit, kogaki#1355); the list was
// a constant nothing read, deleted at kogaki#1257, and
// `checks/check-brief-reader-path-job.sh` (a) now reads the set off the job
// records its fixtures end in.

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
    // THE TWO BOUNDS ARE HANDED OVER, NEVER DEFAULTED (kogaki#1307, kogaki#1355): the
    // starter read them from `kogaki.settings.json`, and a supervisor told either one
    // not refuses to start. The retired whole-job limit is refused by name.
    if (args["absolute-limit-s"] !== undefined)
      throw new Error(
        "job-supervise was handed --absolute-limit-s, a whole-job limit retired by kogaki#1355; it takes --call-limit-s and --unit-rounds.",
      );
    const callLimitS = Number(args["call-limit-s"]);
    if (!Number.isFinite(callLimitS) || callLimitS <= 0)
      throw new Error("job-supervise needs a positive --call-limit-s (kogaki#1355).");
    const unitRounds = Number(args["unit-rounds"]);
    if (!Number.isInteger(unitRounds) || unitRounds <= 0)
      throw new Error("job-supervise needs a positive integer --unit-rounds (kogaki#1355).");
    const stallS = Number(args["stall-s"]) || READER_PATH_JOB_STALL_S;
    const heartbeatMs = Number(args["heartbeat-ms"]) || READER_PATH_JOB_HEARTBEAT_MS;
    // THE DECLARED VALIDATOR, REQUIRED (kogaki#1240): a units file with no
    // `validator` key -- or naming no loadable export -- `fail()`s here,
    // before any child is spawned, and is caught by this function's own
    // catch-all below exactly like any other malformed units file.
    const declared = readJson(unitsPath);
    const units = Array.isArray(declared)
      ? declared
      : declared.units || fail("the units file at " + unitsPath + " carries no `units` array.");
    const validate = await loadReaderPathUnitValidator(declared.validator);
    const fit = await loadReaderPathFitJudge(declared.fit_judge);
    const siteRetry = await loadSiteRetry(declared.site_retry);
    const recordArray =
      declared.record_array === false
        ? false
        : typeof declared.record_array === "string" && declared.record_array
          ? declared.record_array
          : "legs";
    // UNIT ISOLATION AND THE CARRIED ROWS (kogaki#1641), both written by the starter from
    // the job's own table: under `unit_isolation` a died unit ends that unit alone, and
    // every row in `carried` is a unit a prior run of the same inputs already finished --
    // written on the record as it stands, ahead of the units this job spawns, and never
    // spawned again.
    const unitIsolation = declared.unit_isolation === true;
    const carriedRows = Array.isArray(declared.carried) ? declared.carried : [];

    // THE MINIMAL ENVIRONMENT (kogaki#1193, kogaki#1197): only `units[].prompt` and the
    // session's own login; do not add the bare-session flag (it breaks OAuth auth), and keep
    // `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` in the child env.
    // THE OUTPUT FORMAT IS HARDCODED (PR #1195): `stream-json` with
    // `--include-partial-messages` is the stall bound's only progress signal; never make it
    // a per-caller option.
    const argv = [
      "-p",
      "--model",
      model,
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
      "--tools",
      "",
      "--disable-slash-commands",
      "--strict-mcp-config",
      "--setting-sources",
      "",
      "--no-session-persistence",
    ];
    const childEnv = { CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" };
    const startedAt = Date.now();
    // EVERY CALL WRITES ITS CALL RECORD (kogaki#1717); `n` counts all of a unit's calls, whatever their phase.
    const cli = cliRecord(command, args["command-version"] ? String(args["command-version"]) : null);
    const callArgv = { argv, model, output_format: "stream-json", timeout_s: callLimitS };
    const mapper = await loadMapper(declared.mapper, { runDir: dir, cli, callArgv });
    const rowOf = (phase) => {
      const r = (declared.rows || {})[phase];
      if (!r || !r.table) return { phase, row: null, tables: [] };
      const t = readJson(resolve(REPO, String(r.table)));
      return { phase, row: { id: r.id, ...(t[r.id] || {}) }, tables: [tableRecord(r.table)] };
    };
    const validatorName = (phase) =>
      phase === "fit"
        ? declared.fit_judge.verdict_export
        : phase === "compose"
          ? declared.validator.export
          : declared.site_retry[`${phase}_validator_export`];
    const recordCall = (u, sp, cls) => {
      const st = S.get(u.id);
      st.calls += 1;
      const f = cls.failure || {};
      const refusal =
        cls.status === "done"
          ? null
          : {
              group: f.group ?? null,
              reach: f.reach ?? null,
              text: f.stderr_tail ?? f.class ?? cls.status,
              validator: cls.status === "refused" && f.class === SCHEMA_REFUSAL ? validatorName(sp.phase) : null,
              sites: f.sites || (f.move_fit && f.move_fit.length ? f.move_fit : null),
            };
      const answer = sp.phase === "fit" ? (cls.specialization ?? undefined) : (cls.candidate ?? undefined);
      const dirOf = writeCallRecord(dir, u.id, st.calls, {
        prompt: sp.prompt,
        argv: callArgv,
        cli,
        input: u.input ?? null,
        row: rowOf(sp.phase),
        raw: Buffer.concat(sp.out.chunks || []).toString("utf8"),
        answer,
        refusal,
      });
      st.callRecords = resolve(dirOf, "..");
    };
    // THE PER-UNIT STATE (kogaki#1355). `rounds` is the Round now running: it starts
    // at 1 and reaches `unitRounds` at most. A schema refusal or a call killed at
    // `callLimitS` spends one; `refusals` holds every Round's refusal and `timedOut`
    // every killed call, so a unit that spent them all reports each. `malformed` counts
    // MALFORMED OUTPUT respawns (kogaki#1307), which spend no Round, and
    // `malformedThisRound` bounds them at `unitRounds` per Round.
    // `round1S` is Round 1's own duration, written onto the row from Round 2 on as
    // the status line's estimate. `phase` is `compose` while the unit's own record is
    // being written and `fit` while its Move fit is judged; `composed` holds the record
    // the fit call judges.
    const S = new Map(
      units.map((u) => [
        u.id,
        {
          rounds: 1,
          malformed: 0,
          malformedThisRound: 0,
          phase: "compose",
          prompt: withNoToolsSentence(u.prompt),
          composed: null,
          fitPrompt: null,
          refusals: [],
          timedOut: [],
          round1S: undefined,
          loop: null,
          callPrompt: null,
          scope: null,
          roundStartedAt: startedAt,
          callStartedAt: startedAt,
          final: null,
          calls: 0,
          callRecords: null,
          roundBase: 0,
          refusalBase: 0,
        },
      ]),
    );
    // A spawned call keeps the prompt it was sent and its phase, for its Call Record (kogaki#1717).
    const spawnCall = (u, prompt, phase, stdoutPath, flag) => ({
      ...spawnDetachedJobUnit(command, argv, prompt, () => {}, childEnv, { path: stdoutPath, flag }),
      prompt,
      phase,
    });
    const spawnCompose = (u, flag) =>
      spawnCall(u, S.get(u.id).prompt, "compose", readerPathUnitStdoutPath(dir, u.id), flag);
    const spawnFit = (u, flag) =>
      spawnCall(u, S.get(u.id).fitPrompt, "fit", readerPathUnitFitStdoutPath(dir, u.id), flag);
    // A SITE OR SUFFIX CALL (kogaki#1642) writes beside the unit's own call, in its stdout file.
    const spawnSite = (u, flag) =>
      spawnCall(u, S.get(u.id).callPrompt, S.get(u.id).phase, readerPathUnitStdoutPath(dir, u.id), flag);
    // A MAPPER'S CALL (kogaki#1734) writes beside the unit's own call; its Call Record is the Mapper's.
    const spawnMapperCall = (u, flag) =>
      spawnCall(u, S.get(u.id).callPrompt, S.get(u.id).phase, readerPathUnitStdoutPath(dir, u.id), flag);
    unitsRunning = new Map();
    // THE MAPPER'S ACT, CARRIED OUT: a reading call spawned, the plan call spawned over the
    // input the Mapper composed, or the unit ended naming the Leg, the Brief Waypoint and the stage.
    const mapperAct = (u, act, flag, bytes = 0, stdoutPath = readerPathUnitStdoutPath(dir, u.id)) => {
      const st = S.get(u.id);
      if (act.stopped) {
        st.refusals.push({ refusal: act.stopped });
        return {
          row: endUnit(
            u,
            { status: "refused", failure: { class: SCHEMA_REFUSAL, stderr_tail: act.stopped, bytes_written: bytes } },
            bytes,
            stdoutPath,
          ),
          progressed: false,
        };
      }
      st.callStartedAt = Date.now();
      st.malformedThisRound = 0;
      if (act.call) {
        st.phase = act.call.phase;
        st.callPrompt = act.call.prompt;
        if (flag === "a") {
          try {
            appendFileSync(stdoutPath, `\n----- ${act.call.label} -----\n`);
          } catch {
            /* best-effort */
          }
        }
        unitsRunning.set(u.id, spawnMapperCall(u, flag));
        return { row: runningRow(u, 0), progressed: true };
      }
      // THE PLAN CALL OVER THE MAPPER'S INPUT: its refusals and Rounds are counted from here.
      // The Waypoints call after the bind call opens the next Round (kogaki#1812).
      if (st.phase === "compose") beginNextRound(st, Date.now());
      st.roundBase = st.rounds - 1;
      st.refusalBase = st.refusals.length;
      u.prompt = act.compose.prompt;
      u.input = act.compose.input;
      st.prompt = withNoToolsSentence(u.prompt);
      st.phase = "compose";
      st.composed = null;
      if (flag === "a") {
        try {
          appendFileSync(stdoutPath, "\n----- the plan call over the Mapper's input -----\n");
        } catch {
          /* best-effort */
        }
      }
      unitsRunning.set(u.id, spawnCompose(u, flag));
      return { row: runningRow(u, 0), progressed: true };
    };
    const mapperAnswer = (u, sp, out) =>
      mapperAct(
        u,
        mapper.answered(u.id, { raw: Buffer.concat(sp.out.chunks || []).toString("utf8"), ...out }),
        "a",
        sp.out.bytes,
      );

    let lastProgressAt = startedAt;
    let lastBytesTotal = 0;

    const secondsSince = (t, end = Date.now()) => Math.round((end - t) / 100) / 10;

    // A NEW ROUND BEGINS (kogaki#1355): Round 1's duration is kept for the estimate,
    // the malformed bound resets, and the count moves on.
    const beginNextRound = (st, endedAt) => {
      if (st.rounds === 1) st.round1S = secondsSince(st.roundStartedAt, endedAt);
      st.rounds += 1;
      st.malformedThisRound = 0;
      st.roundStartedAt = Date.now();
      st.callStartedAt = st.roundStartedAt;
    };

    // THE ROW OF A UNIT STILL WORKING (kogaki#1355): the Round it is on, the call it is
    // in and when that Round began, and from Round 2 on Round 1's own duration --
    // what `job await`'s status line reads, never recomputes.
    const runningRow = (u, bytes) => {
      const st = S.get(u.id);
      return {
        id: u.id,
        status: "running",
        bytes,
        rounds: st.rounds,
        phase: st.phase,
        round_started_at: new Date(st.roundStartedAt).toISOString(),
        ...(st.callRecords ? { call_records: st.callRecords } : {}),
        ...(st.round1S !== undefined ? { [FIRST_CALL_SECONDS_FIELD]: st.round1S } : {}),
      };
    };

    // THE UNIT HAS ENDED. Its row keeps every count a reader needs to see a unit that
    // drifted toward a bound: Rounds, malformed outputs, every refusal, every killed call.
    const endUnit = (u, cls, bytes, stdoutPath) => {
      const st = S.get(u.id);
      const firstRefusal = st.rounds > 1 && st.refusals.length ? st.refusals[0].refusal : undefined;
      if (cls.status === "died" || cls.status === "refused") {
        cls.failure = {
          ...cls.failure,
          file: stdoutPath,
          ...(firstRefusal !== undefined ? { first_refusal: firstRefusal } : {}),
        };
      }
      const row = {
        id: u.id,
        bytes,
        ...cls,
        rounds: st.rounds,
        phase: st.phase,
        ...(st.round1S !== undefined ? { [FIRST_CALL_SECONDS_FIELD]: st.round1S } : {}),
        ...(st.malformed > 0 ? { malformed_output: st.malformed } : {}),
        ...(firstRefusal !== undefined ? { first_refusal: firstRefusal } : {}),
        // THE RECORD'S `refusals` STAYS AN ARRAY OF STRINGS (kogaki#1438): the Proof Sheet
        // reads it, and the refused answers live in the unit's own state and its prompts.
        ...(st.refusals.length ? { refusals: st.refusals.map((h) => h.refusal) } : {}),
        // Each refusal's group and reach, where the row declares them (kogaki#1708).
        ...(st.refusals.some((h) => h.reach)
          ? { refusal_reach: st.refusals.map((h) => ({ group: h.group ?? null, reach: h.reach ?? null })) }
          : {}),
        ...(st.timedOut.length ? { timed_out: st.timedOut.slice() } : {}),
        ...(st.callRecords ? { call_records: st.callRecords } : {}),
      };
      // A SCHEMA-VALID CANDIDATE IS KEPT ON EVERY ENDING (PR #1308 round 1): a unit whose
      // fit call refused, died or ran out of time still carries the Candidate it composed,
      // so the record holds it. It is not offered: its Move fit was not judged `consistent`,
      // and "The judged half — the specialization verdict" makes that judgment an occasion with no skip.
      if (st.composed && cls.status !== "done") {
        row.candidate = st.composed;
        row.fit_judged = cls.status === "refused" && !!cls.specialization;
      } else if (cls.status !== "done") delete row.candidate;
      // THE CANDIDATE IS WRITTEN TO DISK THE MOMENT THIS UNIT ENDS `done` (kogaki#1204
      // acceptance 2), whatever its siblings are doing; with a Move-fit judge, the
      // specialization record is written beside it (kogaki#1307).
      if (cls.status === "done") {
        const candidate = st.composed || cls.candidate;
        row.candidate = candidate;
        row.candidate_file = readerPathUnitCandidatePath(dir, u.id);
        try {
          writeFileSync(row.candidate_file, `${JSON.stringify(candidate, null, 2)}\n`);
        } catch {
          /* the job record's own embedded `candidate` is still the truth */
        }
        if (cls.specialization) {
          row.specialization_file = readerPathUnitSpecializationPath(dir, u.id);
          try {
            writeFileSync(row.specialization_file, `${JSON.stringify(cls.specialization, null, 2)}\n`);
          } catch {
            /* the job record's own embedded `specialization` is still the truth */
          }
        }
      }
      st.final = row;
      return row;
    };

    const callStdoutPath = (u) =>
      S.get(u.id).phase === "fit" ? readerPathUnitFitStdoutPath(dir, u.id) : readerPathUnitStdoutPath(dir, u.id);
    const respawnCall = (u) => {
      const phase = S.get(u.id).phase;
      const sp = phase === "compose" ? spawnCompose(u, "a") : phase === "fit" ? spawnFit(u, "a") : spawnSite(u, "a");
      unitsRunning.set(u.id, sp);
      S.get(u.id).callStartedAt = Date.now();
      return sp;
    };

    // A CALL PAST `call_limit_s` IS KILLED AND SPENDS ONE ROUND (kogaki#1355). It is a
    // time bound, not a defect, so the Brief does not end: the same call is asked again
    // with the same prompt while a Round is left, and the unit ends `refused` naming
    // the limit once none is.
    const timeOut = (u, sp) => {
      const st = S.get(u.id);
      try {
        if (sp.child) sp.child.kill("SIGKILL");
      } catch {
        /* already gone */
      }
      if (MAPPER_PHASES.includes(st.phase))
        return mapperAnswer(u, sp, { unread: `the ${st.phase} call ran past the ${callLimitS}s per-call limit` });
      const callS = secondsSince(st.callStartedAt);
      st.timedOut.push({ round: st.rounds, phase: st.phase, call_s: callS });
      recordCall(u, sp, {
        status: "refused",
        failure: { stderr_tail: `the ${st.phase} call ran past the ${callLimitS}s per-call limit` },
      });
      const stdoutPath = callStdoutPath(u);
      // INSIDE A SITE LOOP the killed call is that site's refusal, or a judgment asked again.
      if (st.loop) {
        const text = `the ${st.phase} call ran past the ${callLimitS}s per-call limit`;
        return siteAct(u, st.phase === "fit" ? st.loop.judged([], text) : st.loop.answered(null, text), sp, stdoutPath);
      }
      if (st.rounds < unitRounds) {
        beginNextRound(st, Date.now());
        try {
          appendFileSync(
            stdoutPath,
            `\n----- the ${st.phase} call ran past the ${callLimitS}s per-call limit; round ${st.rounds} asks it again with the same prompt -----\n`,
          );
        } catch {
          /* best-effort */
        }
        respawnCall(u);
        return { row: runningRow(u, 0), progressed: true };
      }
      const refusal = `the ${st.phase} call ran past the ${callLimitS}s per-call limit on round ${st.rounds} of ${unitRounds}, the last one`;
      st.refusals.push({ refusal });
      return {
        row: endUnit(
          u,
          { status: "refused", failure: { class: CALL_TIME_LIMIT, stderr_tail: refusal, bytes_written: sp.out.bytes } },
          sp.out.bytes,
          stdoutPath,
        ),
        progressed: false,
      };
    };

    // THE SITE LOOP'S NEXT ACT, CARRIED OUT (kogaki#1642): a site, suffix or judge call
    // spawned, or the unit ended `done` on the standing record or `refused` naming the site.
    const siteAct = (u, act, sp, stdoutPath, specialization = null) => {
      const st = S.get(u.id);
      for (const refusal of st.loop.drain()) st.refusals.push({ refusal });
      for (const r of st.loop.drainRaised()) pinCallRefusal(dir, u.id, st.calls, r);
      if (act.done) {
        st.composed = act.done;
        return {
          row: endUnit(
            u,
            { status: "done", candidate: act.done, ...(specialization ? { specialization } : {}) },
            sp.out.bytes,
            stdoutPath,
          ),
          progressed: false,
        };
      }
      if (act.refused) {
        st.composed = st.loop.standing;
        st.refusals.push({ refusal: act.refused });
        return {
          row: endUnit(
            u,
            {
              status: "refused",
              failure: { class: SCHEMA_REFUSAL, stderr_tail: act.refused, bytes_written: sp.out.bytes },
            },
            sp.out.bytes,
            stdoutPath,
          ),
          progressed: false,
        };
      }
      if (act.kind === "judge") {
        st.malformedThisRound = 0;
        st.callStartedAt = Date.now();
        st.phase = "fit";
        st.composed = st.loop.standing;
        st.scope = act.scope;
        st.fitPrompt = withNoToolsSentence(fit.prompt(st.composed, u.id, act.scope));
        unitsRunning.set(u.id, spawnFit(u, "a"));
        return { row: runningRow(u, 0), progressed: true };
      }
      // EVERY PLANNING CALL IS A ROUND ON THE ROW: a site or suffix call counts as the whole
      // call did, so `rounds` is the number of records asked for and the Proof Sheet's blocks.
      beginNextRound(st, Date.now());
      st.phase = act.kind;
      st.callPrompt = withNoToolsSentence(act.prompt);
      const label =
        act.kind === "site"
          ? `site retry at Waypoint ${act.site}`
          : `the entries from Waypoint ${act.ctx.from} composed again`;
      try {
        appendFileSync(readerPathUnitStdoutPath(dir, u.id), `\n----- ${label} -----\n`);
      } catch {
        /* best-effort */
      }
      unitsRunning.set(u.id, spawnSite(u, "a"));
      return { row: runningRow(u, 0), progressed: true };
    };

    // ONE FINISHED CALL OF ONE UNIT, ANSWERED (kogaki#1307, Rounds counted by
    // kogaki#1355). Returns the row while the unit is still working, and sets `st.final`
    // once it has ended.
    const answer = (u, sp) => {
      const st = S.get(u.id);
      if (MAPPER_PHASES.includes(st.phase)) {
        const m = classifyDetachedJobUnit(sp.out, null, false, u.id);
        if (m.status === "died") {
          mapper.answered(u.id, {
            raw: Buffer.concat(sp.out.chunks || []).toString("utf8"),
            died: String(m.failure.stderr_tail || m.failure.result || "exit"),
          });
          return { row: endUnit(u, m, sp.out.bytes, readerPathUnitStdoutPath(dir, u.id)), progressed: false };
        }
        return mapperAnswer(
          u,
          sp,
          m.status === "malformed" ? { unread: m.failure.stderr_tail } : { record: m.candidate },
        );
      }
      const cls =
        st.phase === "compose"
          ? classifyDetachedJobUnit(sp.out, validate, recordArray, u.id)
          : st.phase === "fit"
            ? classifyFitJudgeCall(sp.out, fit, st.composed, u.id, st.scope)
            : classifyDetachedJobUnit(sp.out, null, st.phase === "suffix" ? recordArray : false, u.id);
      recordCall(u, sp, cls);
      const stdoutPath = callStdoutPath(u);
      const endedAt = Date.parse(sp.out.endedAt) || Date.now();
      // MALFORMED OUTPUT IS RETRIED MECHANICALLY (kogaki#1307): the same prompt again,
      // no Round spent, and at most `unit_rounds` respawns per Round (kogaki#1355),
      // so a unit cannot loop. A unit past that bound ends `refused` naming the count.
      if (cls.status === "malformed") {
        st.malformed += 1;
        st.malformedThisRound += 1;
        if (st.malformedThisRound <= unitRounds) {
          try {
            appendFileSync(
              stdoutPath,
              `\n----- malformed output ${st.malformed}; respawned with the same prompt -----\n`,
            );
          } catch {
            /* best-effort */
          }
          respawnCall(u);
          return { row: runningRow(u, 0), progressed: true };
        }
        cls.status = "refused";
        cls.failure = {
          ...cls.failure,
          stderr_tail: `malformed output ${st.malformedThisRound} times on round ${st.rounds}, past the bound of ${unitRounds} respawns per round; the last: ${cls.failure.stderr_tail}`,
        };
        st.refusals.push({ refusal: cls.failure.stderr_tail });
        return { row: endUnit(u, cls, sp.out.bytes, stdoutPath), progressed: false };
      }
      // INSIDE A SITE LOOP every answered call is the loop's to read (kogaki#1642).
      if (st.loop && cls.status !== "died") {
        if (st.phase !== "fit") return siteAct(u, st.loop.answered(cls.candidate), sp, stdoutPath);
        return siteAct(
          u,
          st.loop.judged(cls.status === "refused" ? judgedSites(cls.failure) : []),
          sp,
          stdoutPath,
          cls.specialization,
        );
      }
      // A REFUSAL NAMING ITS SITES OPENS THE LOOP, where the job declares one (kogaki#1642): the
      // refused record stands, and only the Brief Waypoints it names are asked again.
      if (
        siteRetry &&
        cls.status === "refused" &&
        cls.failure.class === SCHEMA_REFUSAL &&
        (!mapper || mapper.grounded(u.id))
      ) {
        const sites =
          st.phase === "compose"
            ? (cls.failure.sites || []).map((n) => ({ site: n, refusal: cls.failure.stderr_tail }))
            : judgedSites(cls.failure);
        if (sites.length) {
          st.loop = new SiteLoop(siteRetry, u.id, unitRounds);
          const standing = st.phase === "compose" ? cls.candidate : st.composed;
          st.refusals.push({ answer: standing, refusal: cls.failure.stderr_tail });
          return siteAct(u, st.loop.open(standing, sites, { byJudge: st.phase === "fit" }), sp, stdoutPath);
        }
      }
      // THE BIND CALL'S RECORD IS GROUNDED FIRST, where the job declares a Mapper (kogaki#1734).
      if (cls.status === "done" && st.phase === "compose" && mapper) {
        const act = mapper.bound(u.id, cls.candidate);
        if (!act.proceed) return mapperAct(u, act, "a", sp.out.bytes, stdoutPath);
      }
      // A FINISHED, VALID RECORD WITH A DECLARED MOVE-FIT JUDGE IS JUDGED NEXT, inside
      // the same unit and the same Round (kogaki#1307).
      if (cls.status === "done" && st.phase === "compose" && fit) {
        st.phase = "fit";
        st.composed = cls.candidate;
        st.fitPrompt = withNoToolsSentence(fit.prompt(cls.candidate, u.id));
        unitsRunning.set(u.id, spawnFit(u, "w"));
        st.callStartedAt = Date.now();
        return { row: runningRow(u, 0), progressed: true };
      }
      // A SCHEMA REFUSAL SPENDS ONE ROUND (kogaki#1203, counted by kogaki#1355): the
      // validator's, or the Move-fit judge's sentence, re-asks the compose call with the
      // refusal spliced in verbatim while a Round is left. The retry decision reads the
      // Round count only. `died` is never retried: it is a system failure.
      if (cls.status === "refused" && cls.failure.class === SCHEMA_REFUSAL) {
        // THE REFUSED ANSWER IS KEPT BESIDE ITS REFUSAL (kogaki#1438): the composed
        // Candidate for a fit refusal, the validator's candidate for a schema one, so the
        // next Round's fresh session sees what it is asked to repair.
        const refusal = cls.failure.stderr_tail;
        const { group, reach } = cls.failure;
        st.refusals.push({
          answer: st.phase === "fit" ? st.composed : cls.candidate,
          refusal,
          ...(reach ? { group, reach } : {}),
        });
        // A `stop` refusal, or one whose group the row does not declare, is never put back (kogaki#1708).
        if (st.rounds - st.roundBase < unitRounds && reach !== "stop") {
          beginNextRound(st, endedAt);
          const composePath = readerPathUnitStdoutPath(dir, u.id);
          try {
            appendFileSync(composePath, `\n----- round ${st.rounds} -----\n`);
          } catch {
            /* best-effort */
          }
          st.prompt = readerPathUnitRetryPrompt(withNoToolsSentence(u.prompt), st.refusals.slice(st.refusalBase));
          st.phase = "compose";
          st.composed = null;
          unitsRunning.set(u.id, spawnCompose(u, "a"));
          return { row: runningRow(u, 0), progressed: true };
        }
      }
      return { row: endUnit(u, cls, sp.out.bytes, stdoutPath), progressed: false };
    };

    for (const u of units) {
      if (mapper) {
        const act = mapper.begin(u.id, u.input);
        if (act.stopped) throw new Error(act.stopped);
        mapperAct(u, act, "w");
      } else unitsRunning.set(u.id, spawnCompose(u, "w"));
    }

    for (;;) {
      // one supervisor, one loop,
      // ordinary sequential polling; `spawnDetachedJobUnit`'s children still
      // service their own stdout/stderr/close events on this event loop
      // between ticks, which is why this is `setTimeout` and never the
      // synchronous `Atomics.wait` `job await` uses on the CLI side -- that one
      // has no children of its own to starve.
      await new Promise((r) => {
        setTimeout(r, heartbeatMs);
      });
      const stopRequested = existsSync(readerPathJobStopFlagPath(dir));
      let bytesTotal = 0;
      // A RESPAWN IS PROGRESS TOO (kogaki#1203): the respawned child's byte counter
      // starts back at 0, so `bytesTotal` can fall even though real work just
      // happened -- tracked separately so a respawn is never mistaken for a stall.
      let progressed = false;
      const unitRows = [
        ...carriedRows,
        ...units.map((u) => {
          const st = S.get(u.id);
          if (st.final) {
            bytesTotal += st.final.bytes || 0;
            return st.final;
          }
          const sp = unitsRunning.get(u.id);
          if (!sp.out.done) {
            if (secondsSince(st.callStartedAt) < callLimitS) {
              bytesTotal += sp.out.bytes;
              return runningRow(u, sp.out.bytes);
            }
            const t = timeOut(u, sp);
            if (t.progressed) progressed = true;
            bytesTotal += t.row.bytes || 0;
            return t.row;
          }
          const a = answer(u, sp);
          if (a.progressed) progressed = true;
          bytesTotal += a.row.bytes || 0;
          return a.row;
        }),
      ];
      if (progressed || bytesTotal > lastBytesTotal) {
        lastBytesTotal = bytesTotal;
        lastProgressAt = Date.now();
      }
      const stalledS = Math.floor((Date.now() - lastProgressAt) / 1000);
      const state = classifyDetachedJobState(unitRows, { stopRequested, stalledS, stallS, unitIsolation });
      let rows = unitRows;
      if (READER_PATH_JOB_SYSTEM_FAILURE_STATES.includes(state)) {
        // A SYSTEM FAILURE ENDS EVERY UNIT ON THIS TICK (kogaki#1273): the
        // units still running are killed below, with no retry, and their rows
        // say so rather than reading `running` on a job that has ended.
        rows = unitRows.map((r) =>
          r.status === "running"
            ? {
                id: r.id,
                status: "killed",
                bytes: r.bytes || 0,
                rounds: r.rounds,
                phase: r.phase,
                note: `killed on the tick the job ended ${state}`,
              }
            : r,
        );
      }
      // A UNIT ENDED MID-FIT KEEPS ITS COMPOSED CANDIDATE (PR #1308 round 1), on the
      // ground the ended-unit row above states: on the record, never offered.
      if (state !== "running") {
        rows = rows.map((r) => {
          const st = S.get(r.id);
          return st && st.composed && r.status !== "done" && !r.candidate
            ? { ...r, candidate: st.composed, fit_judged: false }
            : r;
        });
      }
      writeReaderPathJob(dir, {
        started_at: new Date(startedAt).toISOString(),
        call_limit_s: callLimitS,
        unit_rounds: unitRounds,
        last_progress_at: new Date(lastProgressAt).toISOString(),
        supervisor_pid: process.pid,
        ...(unitIsolation ? { unit_isolation: true } : {}),
        state,
        units: rows,
        ...(state === "done" ? readerPathDoneJobUnfinished(rows) : {}),
        ...(state !== "done" && state !== "running"
          ? { failure: readerPathJobFailure(state, rows, { stalledS }) }
          : {}),
      });
      if (state === "running") continue;
      for (const u of units) {
        const sp = unitsRunning.get(u.id);
        if (!sp.out.done) {
          try {
            sp.child.kill("SIGKILL");
          } catch {
            /* already gone */
          }
        }
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
        if (sp.child && !sp.out.done) {
          try {
            sp.child.kill("SIGKILL");
          } catch {
            /* already gone */
          }
        }
      }
      const existing = readReaderPathJob(dir) || { started_at: new Date().toISOString(), units: [] };
      writeReaderPathJob(dir, {
        ...existing,
        supervisor_pid: process.pid,
        state: "other",
        failure: readerPathJobFailure("other", existing.units || [], {
          note: `the supervisor process itself failed: ${e.message}`,
        }),
      });
    } catch {
      /* the write itself failing leaves the prior record, which is still the truth as of its own timestamp */
    }
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
  const callLimitS = Number(opts.callLimitS);
  if (!Number.isFinite(callLimitS) || callLimitS <= 0) {
    fail("startDetachedJobSupervisor needs a positive `callLimitS`, read from kogaki.settings.json (kogaki#1355).");
  }
  const unitRounds = Number(opts.unitRounds);
  if (!Number.isInteger(unitRounds) || unitRounds <= 0) {
    fail(
      "startDetachedJobSupervisor needs a positive integer `unitRounds`, read from kogaki.settings.json (kogaki#1355).",
    );
  }
  const unitsPath = join(dir, "reader-path-job-units.json");
  // EVERY UNIT PROMPT BEGINS WITH THE NO-TOOLS SENTENCE (kogaki#1307), written here so the
  // units file a reader opens is the prompt each headless session was given.
  const units = opts.units.map((u) => ({ ...u, prompt: withNoToolsSentence(u.prompt) }));
  // THE CARRIED ROWS AND THE ISOLATION FLAG RIDE THE UNITS FILE (kogaki#1641): a row the
  // starter carries from a prior run is handed over finished, so the supervisor writes it
  // on every record and spawns nothing for it.
  const carried = Array.isArray(opts.carried) ? opts.carried : [];
  const unitIsolation = opts.unitIsolation === true;
  writeFileSync(
    unitsPath,
    `${JSON.stringify(
      {
        units,
        validator,
        ...(opts.fitJudge ? { fit_judge: opts.fitJudge } : {}),
        ...(opts.siteRetry ? { site_retry: opts.siteRetry } : {}),
        ...(opts.mapper ? { mapper: opts.mapper } : {}),
        ...(opts.recordArray || opts.recordArray === false ? { record_array: opts.recordArray } : {}),
        ...(unitIsolation ? { unit_isolation: true } : {}),
        ...(opts.rows ? { rows: opts.rows } : {}),
        ...(carried.length ? { carried } : {}),
      },
      null,
      2,
    )}\n`,
  );
  // THE SHARED SUPERVISOR ENTRY POINT (kogaki#1741): named for no lane.
  const scriptPath = join(REPO, "src", "workflow", "job-supervise.mjs");
  const child = spawn(
    process.execPath,
    [
      scriptPath,
      "--run",
      dir,
      "--units",
      unitsPath,
      "--command",
      opts.command,
      "--model",
      opts.model,
      "--output-format",
      opts.outputFormat,
      "--call-limit-s",
      String(callLimitS),
      "--unit-rounds",
      String(unitRounds),
      "--stall-s",
      String(opts.stallS),
      "--heartbeat-ms",
      String(opts.heartbeatMs),
      ...(opts.commandVersion ? ["--command-version", String(opts.commandVersion)] : []),
    ],
    { detached: true, stdio: "ignore", cwd: REPO },
  );
  child.unref();
  const now = new Date().toISOString();
  writeReaderPathJob(dir, {
    started_at: now,
    call_limit_s: callLimitS,
    unit_rounds: unitRounds,
    last_progress_at: now,
    supervisor_pid: child.pid,
    ...(unitIsolation ? { unit_isolation: true } : {}),
    state: "running",
    units: [
      ...carried,
      ...opts.units.map((u) => ({
        id: u.id,
        status: "running",
        bytes: 0,
        rounds: 1,
        phase: opts.mapper ? "reading" : "compose",
        round_started_at: now,
      })),
    ],
  });
  return { unitsPath, supervisorPid: child.pid };
}
