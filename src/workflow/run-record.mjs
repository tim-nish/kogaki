// The workflow engine — the run record and its persistence, the soft window, which flow and which
// run an act belongs to, and who executed a transition.
// Shared by every command that runs a workflow table, so it lives outside every command
// directory (kogaki#1259, kogaki#1302).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { spawnSync, execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { enterRun, laneDir, terrainRunEntry } from "../runs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, "../..");
export const GATE_SCHEMA = readJson(join(REPO, "src/gate-schema.json"));
export const GATES_REGISTRY = readJson(join(REPO, "src/gate-registry.json"));
// the carrier rule's single carrier of the RENDERED FORM. Resolved from this module's own
// location, like every schema above it — the emit-time refusal must not depend
// on the cwd a run happens to start in.
export const REPORT_FORMAT = join(REPO, "src/report-format.json");

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// THE PENDING RUN RECORD, held for exactly as long as a run's state loop is executing
// (kogaki#808). `fail()` persists it before exiting, so a refusal inside a state no longer
// discards the transitions the same act already performed (specimen: `J3_neighborhood`).
// A refusal stays a refusal: same exit code, same text — only the rollback is removed.
let RUN_PERSIST = null;

export function setRunPersist(dir, rec) {
  RUN_PERSIST = dir && rec ? { dir, rec } : null;
}

// THE PERSIST NEVER MASKS THE REFUSAL IT RIDES. A write that throws is
// swallowed deliberately: the operator is being told why the act refused, and
// a second failure reported in its place would replace a diagnosis with an
// accident of the tracing.
// EXPORTED AT kogaki#1108. `src/brief.mjs`'s own `fail` calls it, so a refusal
// raised inside a Brief state persists the transitions that act completed before
// it — the property kogaki#808 established for this file, reaching the second
// runtime through the one implementation rather than a copy of it.
export function persistPendingRun() {
  if (!RUN_PERSIST) return;
  const { dir, rec } = RUN_PERSIST;
  RUN_PERSIST = null;
  try {
    const out = { ...rec };
    delete out._dir;
    writeRunRecord(dir, out);
  } catch { /* the refusal below is the message that matters */ }
}

// ---- THE ONE SOFT WINDOW, AND IT IS A JUDGE RE-ASK (kogaki#1030). ----------
// Inside the window `fail()` throws the refusal instead of exiting, so `invokeJudge`'s caller
// can re-ask up to the count `terrain-workflow.json` declares; refusals are not duplicated.
// The window wraps ONE judge-response validation and closes in a `finally`; it is COUNTED, not
// boolean, so a nested open cannot close it early. Everywhere else a refusal still exits.
let SOFT_REFUSAL_DEPTH = 0;

export function softRefusals(fn) {
  SOFT_REFUSAL_DEPTH += 1;
  try { return fn(); }
  finally { SOFT_REFUSAL_DEPTH -= 1; }
}

export function fail(msg) {
  // The window is the judge re-ask's and nothing else's; `JudgmentRefusal` is
  // the existing carrier for "a refusal that has not exited yet", declared with
  // `orFail` further down and reused here rather than a second class.
  if (SOFT_REFUSAL_DEPTH > 0) throw new JudgmentRefusal(msg);
  persistPendingRun();
  process.stderr.write(`terrain: ${msg}\n`);
  process.exit(1);
}

// The run workspace: an explicit `--run-dir` or `KOGAKI_RUN_DIR` wins; only the DEFAULT lives
// in this lane's directory in the tree (kogaki#750), and only the default path PRUNES.
// `enterRun` prunes before it creates, so the bound is the run's first act.
// ---- WHICH FLOW THIS ACT IS AN ACT OF (kogaki#1108) -----------------------
// The executor names no state (kogaki#625); `FLOW` binds table, lane directory, capture prefix,
// renderers and option composers. Process-wide, like `OPENED_BY` and `WRITING_STATE`: one
// invocation is one act of one flow, set by `runWorkflow`. Default is Terrain's.
let FLOW = null;
// The default binding is Terrain's lane until `src/terrain.mjs` registers its whole flow (kogaki#1259).
let DEFAULT_FLOW = null;
export function flow() { return FLOW || DEFAULT_FLOW || TERRAIN_LANE; }
export function setDefaultFlow(binding) { DEFAULT_FLOW = binding; }
export function bindFlow(binding) { const held = FLOW; FLOW = binding; return held; }

export function runDir(args) {
  const f = flow();
  if (args["run-dir"] || process.env[f.runDirEnv]) {
    const dir = args["run-dir"] || process.env[f.runDirEnv];
    mkdirSync(dir, { recursive: true });
    return dir;
  }
  return f.newRunDir();
}

// ---- WHICH RUN THE ADVANCE IS AN ADVANCE OF (PR #1034 round 1, blocking) ----
// kogaki#1027 removed `--run-dir` as the session's run-identity carrier; without one the default
// branch mints a new workspace per invocation and orphans the open run's gate pointer.
// The carrier is a pointer file in the lane directory: written at `start`, read by the advance,
// removed at the run's terminal. Machine-local under `runs/`, never committed.
const OPEN_RUN_POINTER = "open-run";

// `KOGAKI_OPEN_RUN` overrides the pointer path for tests, on the idiom
// `KOGAKI_OPEN_GATES` already sets one seam over. It exists because the
// alternative is exercising `runDir`'s DEFAULT branch, which `terrain-runtime`'s
// own registry record declines to assert for a stated reason: driving it prunes
// this repository's real terrain lane, so a fixture pass would evict an owner's
// runs to check a path.
export function openRunPointerPath() {
  const f = flow();
  return process.env[f.openRunEnv] || join(laneDir(f.lane), OPEN_RUN_POINTER);
}

export function readOpenRunPointer() {
  const p = openRunPointerPath();
  if (!existsSync(p)) return null;
  const dir = readFileSync(p, "utf8").trim();
  // A POINTER TO A DIRECTORY THAT IS GONE IS NOT A RUN. A `runs/` prune, a
  // deleted workspace or a hand-cleaned lane each leave the file behind, and
  // resolving it would advance into a directory with no record in it.
  return dir && existsSync(dir) ? dir : null;
}

export function writeOpenRunPointer(dir) {
  const p = openRunPointerPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${resolve(dir)}\n`);
}

// EXPORTED, BUT EVERY CALLER IS WITHIN THIS FILE (kogaki#1193 PR #1195 review
// round 1, nit d — this comment previously claimed `brief.mjs` called it,
// which a grep across the tree does not bear out): the gate-answer "stop" and
// judgment-retry "abandon" arms in `runWorkflow`'s own answer-applying block
// clear the pointer here, in `terrain.mjs`. It stays exported because the
// export surface this module presents is not scoped file-by-file.
export function clearOpenRunPointer() {
  try { rmSync(openRunPointerPath(), { force: true }); } catch { /* a stale pointer costs a refusal, never a run */ }
}

// `soft` callers get a NULL instead of a process exit when the seam is
// unavailable (kogaki#528). Terrain's own calls stay HARD and must: "Terrain
// without served renderings has nothing to survey", so degrading there would
// compose a survey out of nothing. The Brief lane is the opposite case — its
// set is already settled and the rendering enriches material it holds — and
// CLAUDE.md's founding rule binds it: the substrate is an ENHANCER, NEVER A
// DEPENDENCY. A hard exit here would make a Brief unstartable whenever the
// gateway is down, which is the dependency that rule forbids.
export function gatewayQuery(tool, toolArgs, { soft = false } = {}) {
  const bin = join(REPO, "policy/kit/bin/gateway-query.mjs");
  // Capture stdout through a file descriptor, not a pipe. The kit now drains
  // stdout before exiting (kogaki#23), so a pipe would work — but this call
  // deliberately does not depend on that: a file write is synchronous
  // regardless of what the other side of the seam does, and element_survey is
  // ~500KB, the size at which the difference stops being theoretical.
  const outPath = join(tmpdir(), `terrain-seam-${process.pid}-${Date.now()}.json`);
  const fd = openSync(outPath, "w");
  let res;
  try {
    res = spawnSync(process.execPath, [bin, "--consumer", "kogaki", "--tool", tool, "--args", JSON.stringify(toolArgs)], {
      stdio: ["ignore", fd, "pipe"],
      encoding: "utf8",
    });
  } finally {
    closeSync(fd);
  }
  res.stdout = readFileSync(outPath, "utf8");
  rmSync(outPath, { force: true });
  if (res.status !== 0 && soft) return null;
  if (res.status === 11) {
    // The seam is an enhancer elsewhere; here it is the material itself.
    // Degrade with the one-line idiom and stop — Terrain without served
    // renderings has nothing to survey, and inventing material would cross
    // the repository-invisible boundary, not soften a failure.
    process.stderr.write("policy_source unavailable: Terrain has no material without the seam — no survey composed\n");
    process.exit(11);
  }
  if (res.status !== 0) {
    // BOTH STREAMS. The transport's address refusal (exit 13) is a diagnostic
    // on stderr, but stdout is captured to a file here and would otherwise be
    // discarded — so a failure whose whole content sat in one stream printed
    // an empty tail. Report what both carried (round-1 finding on PR #372).
    const detail = [res.stderr, res.stdout].map((x) => (x || "").trim()).filter(Boolean).join(" | ");
    fail(`gateway-query failed (${res.status}): ${detail || "(no diagnostic on either stream)"}`);
  }
  return JSON.parse(res.stdout);
}

// The owner surface prints a REPO-RELATIVE path — no owner-facing output prints a hidden path: no owner-facing
// output names a machine-local hidden path outside debugging, and an absolute
// path into someone's home directory is the specimen that clause was written
// against. Falls back to the absolute path only when the file genuinely sits
// outside the tree, where hiding the location would be worse than showing it.
export function relFromRepo(p, root) {
  const r = root === undefined ? repoRoot() : root;
  const pre = r.endsWith("/") ? r : r + "/";
  return p.startsWith(pre) ? p.slice(pre.length) : p;
}

let REPO_ROOT_FALLBACK_ANNOUNCED = false;

export function repoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || process.cwd();
  } catch {
    // No git, or not a checkout. cwd is the honest fallback and it ANNOUNCES
    // ITSELF — a rendering written somewhere the owner did not expect is the
    // defect this whole section is about, so it must not happen quietly.
    //
    // The first version of this comment CLAIMED the report and no call site
    // made one (PR #240 review round 1, finding 5): outside a checkout the
    // rendering landed in `cwd/reports` and the owner saw a bare `reports/…`
    // with nothing saying which root. A comment asserting a property the code
    // lacks is worse than no comment — it retires the question.
    if (!REPO_ROOT_FALLBACK_ANNOUNCED) {
      REPO_ROOT_FALLBACK_ANNOUNCED = true;
      console.log(`NOTE: not a git checkout — the owner rendering is written under ${process.cwd()} `
        + "rather than a repository root. The path printed below is relative to THAT.");
    }
    return process.cwd();
  }
}

// THE ENUMERATION FOR A RESOLVED TARGET SET — extracted from the retired `cmdNeighborhood`
// (SPEC-terrain, the settled-strand-set input v20, story 1.69, kogaki#473). Reuse, never
// re-derive.
// THE JUDGMENT LAYER'S INPUT (kogaki#686): a session-composed FILE, as `--classification`
// is; no model call happens here. The level vocabulary is CLOSED and checked here.
// THE REFUSAL IS A THROW (kogaki#861): a pure function throws; the one impure caller turns it
// into `fail()`.
export class JudgmentRefusal extends Error {}

// A REFUSAL THE RE-ASK WINDOW MUST NOT ABSORB (kogaki#1125).
// The ask itself was malformed, so a re-ask from the same input cannot repair it; terminal by
// construction. `judgeAttempts` catches only `JudgmentRefusal`, so this propagates to `fail()`
// and `refusals_repaired` never counts it.
// consulted: coding::lesson/a-bounded-process-needs-one-exit-that-does-not-reproduce-it@206c657ee8da71ffbb1f4e41bf673d60401aaf49b87508be5b996058a5b8ea82
export class TerminalJudgmentRefusal extends Error {}

// The CLI dispatch runs only when this file IS the entry point, so the module stays
// importable by fixtures (`orphan-mechanisms-fail-the-suite`).
// ==== THE CONTROL PLANE ====================================================
// The workflow table, the run record, the executor (SPEC-terrain, the control plane, v23;
// kogaki#625 items 1, 2, 5, 6; #625 item 6; story 1.89 / kogaki#652).
// The executor holds NO state list: ids, order, kinds, waits, writes, conditions and
// terminals come from the table; only `KIND_SEMANTICS` and `STATE_WORK` live here.
// It REFUSES a write state it has no renderer for. A renderer may name the wait it consumes;
// no control code here may know the ORDER states run in.

// The kind vocabulary this executor interprets. The table's `state_kinds`
// object is the prose for these; `stops` is the only CONTROL property a kind
// carries, and it is why `terminal` had to be its own kind rather than a
// `compute` at the end of the array (terrain-workflow.json v2, PR #626 round 1).
export const KIND_SEMANTICS = {
  compute: { stops: false, needsRenderer: false },
  write: { stops: false, needsRenderer: true },
  judgment: { stops: false, needsRenderer: true },
  wait: { stops: true, needsRenderer: false },
  terminal: { stops: true, needsRenderer: false },
};

const TERRAIN_WORKFLOW_TABLE = join(REPO, "src/terrain-workflow.json");
// Terrain's lane without its state work: what `flow()` reads outside `runWorkflow` (kogaki#1259).
export const TERRAIN_LANE = {
  lane: "terrain",
  label: "Terrain",
  startLine: "the terrain skill's own `!` line (`node src/terrain.mjs start`)",
  tablePath: TERRAIN_WORKFLOW_TABLE,
  newRunDir: () => enterRun("terrain", terrainRunEntry()),
  runDirEnv: "KOGAKI_RUN_DIR",
  openRunEnv: "KOGAKI_OPEN_RUN",
};
const RUN_RECORD_FILE = "run-record.json";

// ---- WHO EXECUTED THIS TRANSITION (kogaki#1027) ------------------------------
// `advanced_by` is COPIED from the harness's own payload, never composed here.
// The kinds are a closed set: `hook` carries the three payload fields verbatim;
// `skill-expansion` carries no hook fields. A third kind is a decision, not an addition.
// The self-declared kind is trustworthy only because `.claude/hooks/gate-terrain-executor.py`
// denies the Bash route; the Removal Test fixture exercises that deny.
const EXECUTOR_KINDS = ["hook", "skill-expansion", "detached-job"];

// The start act's attribution. It carries no hook fields, deliberately -- see
// above.
// EXPORTED FOR THE SECOND FLOW BINDING (kogaki#1108). `src/brief.mjs`'s own
// `start` case enters `runWorkflow` with this attribution, exactly as the
// dispatcher below enters `cmdRun` with it — the attribution is a property of
// WHICH ACT opened the run, not of which flow it opened, so a second flow that
// minted its own constant would be a second answer to one question.
export const SKILL_EXPANSION_EXECUTOR = { executor: "skill-expansion" };

// THE THIRD KIND (kogaki#1193 -- "a decision, not an addition"). `hook` says an
// owner clicked; `skill-expansion` says the harness ran the skill's own `!`
// line; NEITHER is true of the act that turns a FINISHED detached job into a
// completed `compose_path`. That act is `job await`, typed directly into Bash
// by the session -- and it is trustworthy for the same reason `start` is: it
// is one FIXED, narrow act (poll a job record this same run already opened,
// and resume the one waiting state that opened it), never a route to an
// arbitrary transition, and `gate-terrain-executor.py`'s admitted `run
// --status` shape is the only Bash spelling that reaches it (see `cmdJob`
// below). Carries the job record's own relative path, so a reader of the run
// record can find the job that produced this transition without guessing.
export function detachedJobExecutor(jobRecordRelPath) {
  return { executor: "detached-job", job_record: jobRecordRelPath };
}

// WHO OPENED THE POINTER THIS ACT WRITES (kogaki#1051).
// For the START act the model has had no turn since the gate opened: the skill's `!`
// line runs before UserPromptSubmit judges the invoking prompt.
// Process-wide on purpose: one invocation is one act with one attribution, set by `cmdRun`.
export let OPENED_BY = null;

// Set once per act, by the one caller that knows: see `cmdRun`.
export function setOpenedBy(advancedBy) {
  OPENED_BY = (advancedBy && EXECUTOR_KINDS.includes(advancedBy.executor))
    ? advancedBy.executor
    : null;
}

// The hook payload, read from stdin ONCE per act. Returns null when there is
// nothing readable there: no payload, an empty stream, or bytes that are not
// JSON. It never throws and never exits -- the REFUSAL is the caller's, so
// that the one place a missing payload is turned into a stop is the one place
// the message can name what to do about it.
export function readHookPayload(raw = null) {
  let text = raw;
  if (text === null) {
    // A TERMINAL IS NOT A PAYLOAD (PR #1034 round 1, nit). `readFileSync(0)`
    // against a TTY BLOCKS, so an invocation with a terminal attached — a
    // script, a cron, a second repository, anywhere outside the deny — would
    // hang instead of printing the refusal that names the two acts. Reachable
    // only there, and cheap to close.
    if (process.stdin.isTTY) return null;
    try {
      text = readFileSync(0, "utf8");
    } catch {
      return null;
    }
  }
  if (typeof text !== "string" || !text.trim()) return null;
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  return (doc && typeof doc === "object" && !Array.isArray(doc)) ? doc : null;
}

// The three fields, copied. A payload missing any of them is NOT a payload for
// this purpose: `advanced_by` with a null `tool_use_id` records that a
// transition happened and not which question executed it, which is the same
// silence the field was added to end.
export function advancedByFromPayload(payload) {
  if (!payload) return null;
  const ev = payload.hook_event_name;
  const sid = payload.session_id;
  const tid = payload.tool_use_id;
  if (typeof ev !== "string" || !ev) return null;
  if (typeof sid !== "string" || !sid) return null;
  if (typeof tid !== "string" || !tid) return null;
  return { executor: "hook", hook_event_name: ev, session_id: sid, tool_use_id: tid };
}

// THE ONE WRITER OF A TRANSITION. Every advance in this executor goes through
// here, so `completed` and `transitions` cannot disagree about what ran -- and
// a state completing without an attribution is unproducible rather than merely
// discouraged.
export function completeState(rec, stateId, advancedBy) {
  if (!advancedBy || !EXECUTOR_KINDS.includes(advancedBy.executor)) {
    fail(`transition to ${JSON.stringify(stateId)} has no executor attribution. Every transition names the act that executed it (kogaki#1027); the executor writes none of its own.`);
  }
  rec.completed.push(stateId);
  (rec.transitions || (rec.transitions = [])).push({
    state: stateId,
    advanced_by: advancedBy,
    at: new Date().toISOString(),
  });
}

// Structural validation only. This reads the table's FORM — ids present and
// unique, kinds interpretable, a write naming an artifact, a terminal
// existing. It judges no semantic contract, because the workflow table makes the table
// authoritative over sequencing and "authoritative over NOTHING ELSE".
export function loadWorkflowTable(path) {
  const table = readJson(path);
  if (!Array.isArray(table.states) || table.states.length === 0) {
    fail(`workflow table ${path} declares no states. The workflow table makes this artifact authoritative over sequencing; an empty array is not a flow.`);
  }
  const seen = new Set();
  for (const s of table.states) {
    if (!s || typeof s.id !== "string" || s.id === "") {
      fail(`workflow table ${path}: a state carries no id.`);
    }
    if (seen.has(s.id)) fail(`workflow table ${path}: duplicate state id ${JSON.stringify(s.id)}.`);
    seen.add(s.id);
    if (!Object.prototype.hasOwnProperty.call(KIND_SEMANTICS, s.kind)) {
      fail(`workflow table ${path}: state ${JSON.stringify(s.id)} declares kind ${JSON.stringify(s.kind)}, which this executor does not interpret. Known kinds: ${Object.keys(KIND_SEMANTICS).join(", ")}.`);
    }
    if (s.kind === "write" && !s.writes) {
      fail(`workflow table ${path}: state ${JSON.stringify(s.id)} is kind "write" and names no artifact in its \`writes\` field.`);
    }
  }
  if (!table.states.some((s) => s.kind === "terminal")) {
    fail(`workflow table ${path} declares no terminal state. A generic executor reads the end of a run from the table and never from position (the workflow table).`);
  }
  if (table.judge) refuseOverBudgetAdvance(path, table);
  return table;
}

// THE ADVANCE BOUND IS A TABLE FIELD, AND ITS ARITHMETIC IS CHECKED HERE (kogaki#1300).
// An advance is the span of states between two stops: a wait, a terminal, or a state that
// starts a Detached Job (`job`), whose calls run outside any hook-bound advance. Each
// synchronous judgment state in a span costs `timeout_s`; a `per_group` one costs
// ceil(per_group_ceiling / concurrency) waves of it. A span summing past
// `advance_timeout_s` is refused, so the bound the hooks enforce cannot outgrow the table.
function refuseOverBudgetAdvance(path, table) {
  const j = table.judge;
  const positive = (k) => (Number.isFinite(j[k]) && j[k] > 0 ? j[k] : fail(
    `workflow table ${path}: the \`judge\` block declares no positive \`${k}\`. The advance bound is read `
    + "from the table by the advance hook and checked against the judge calls one advance makes (kogaki#1300)."));
  const advance = positive("advance_timeout_s");
  const call = positive("timeout_s");
  let span = [];
  let sum = 0;
  const close = () => {
    if (sum > advance) {
      fail(`workflow table ${path}: the synchronous judge calls of one advance (${span.join(", ")}) sum to ${sum}s, `
        + `past the \`judge\` block's \`advance_timeout_s\` of ${advance}s. The advance hook kills the executor at that `
        + "bound, so a table whose calls cannot fit inside it is refused rather than run (kogaki#1300).");
    }
    span = []; sum = 0;
  };
  for (const s of table.states) {
    if (s.kind === "wait" || s.kind === "terminal" || s.job) { close(); continue; }
    if (s.kind !== "judgment") continue;
    const waves = s.per_group ? Math.ceil(positive("per_group_ceiling") / positive("concurrency")) : 1;
    span.push(s.per_group ? `${s.id} ${waves}x${call}s` : `${s.id} ${call}s`);
    sum += waves * call;
  }
  close();
}

// The baseline is DERIVED from the states array, not read from `counted_baseline`;
// `run --status` renders both so a disagreement is visible.
// THE WRITE-OUTCOME CLASSIFIER (kogaki#1257; PR #667 round 1 finding 2). Kept pure
// (`fail()` exits) so the fixture can exercise all three outcomes:
//   wrote          — the renderer wrote and named what it wrote
//   wrote-nothing  — ran and deliberately wrote nothing (`--no-render`, idempotent rerun)
//   named-nothing  — wrote and did not say where; the only one that refuses
export function classifyWriteOutcome(outcome) {
  if (!outcome || typeof outcome !== "object" || !("artifact" in outcome)) return "named-nothing";
  return outcome.artifact ? "wrote" : "wrote-nothing";
}

export function derivedBaseline(table) {
  const states = table.states;
  const writing = states.filter((s) => s.kind === "write");
  // `writers_per_artifact` IS DROPPED (PR #655 round 1 finding 3; decided at kogaki#665).
  // `writer` is prose, not a countable set, so the figure could never disagree.
  // Keep this derivation and `terrain-workflow.json`'s `counted_baseline` key-for-key;
  // one-writer is by construction: one private `writeDisplaySurface`, no second path.
  return {
    waits: states.filter((s) => s.kind === "wait").length,
    conditional_states: states.filter((s) => Boolean(s.conditional)).length,
    owner_artifact_writes: writing.length,
    judgment_points: states.filter((s) => s.kind === "judgment").length,
    grammared_writing_states: writing.filter((s) => Boolean(s.grammar_surface)).length,
  };
}

// What a COMPLETED run actually did, counted from the run record alone
// (#625 acceptance item 2). Conditional states are counted where entered, so
// a run that never browsed rows legitimately writes fewer artifacts than the
// table's unconditional maximum — which is why `--status` renders the
// unconditional floor beside the table's total rather than asserting equality.
export function runCounts(rec) {
  return {
    waits: rec.waits_reached.length,
    owner_artifact_writes: rec.artifacts_written.length,
    judgment_points: Object.keys(rec.judgments).length,
    conditional_states_entered: rec.conditional_entered.length,
  };
}

export function runRecordPath(dir) { return join(dir, RUN_RECORD_FILE); }

// EXPORTED FOR THE JOB-VERB DISPATCH (kogaki#1193): `job await` runs as its
// own `run --status --job await` invocation, outside the executor's own
// read/write of the record, and needs the same reader/writer the loop uses so
// a job-resumed run and a hook-resumed run persist the identical shape.
export function readRunRecord(dir) {
  const p = runRecordPath(dir);
  return existsSync(p) ? readJson(p) : null;
}

export function writeRunRecord(dir, rec) {
  writeFileSync(runRecordPath(dir), JSON.stringify(rec, null, 2) + "\n");
  return runRecordPath(dir);
}

// THE LANE'S MOST RECENT FINISHED RUN, OR NONE (kogaki#1163 acceptance 3). A
// `start` that mints a fresh workspace over one that reached `done` seconds
// earlier is a legitimate act — the terminal clears the open-run pointer by
// design — but it was, until this, an act the session had no way to notice
// from the new run's own output. Sorted on the entry name rather than mtime:
// `terrainRunEntry` names are ISO instants with the colons stripped, so
// lexicographic order over the directory names IS chronological order, with no
// filesystem timestamp to disagree with it.
export function mostRecentDoneRun(lane) {
  const dir = laneDir(lane);
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const name of names) {
    const rd = join(dir, name);
    const rec = readRunRecord(rd);
    if (rec && rec.done === true) return { dir: rd, rec };
  }
  return null;
}

// THE JUDGE-TIMEOUT EXIT (kogaki#1300). Everything already written stays: the record is
// written with `failure` beside an unchanged `completed`, then the process exits non-zero.
export function endRunOnJudgeTimeout(rec, st, dir, e) {
  rec.awaiting = null;
  rec.failure = { cause: "judge-timeout", state: st.id, bound_s: e.boundS, measured_s: e.measuredS };
  setRunPersist(null, null);
  delete rec._dir;
  const recPath = writeRunRecord(dir, rec);
  clearOpenRunPointer();
  process.stderr.write([
    `${flow().label} run FAILED at ${st.id}: a judge call exceeded its bound.`,
    `  state     ${st.id}`,
    `  bound     ${e.boundS}s (the workflow table's judge.timeout_s)`,
    `  measured  ${e.measuredS}s`,
    `  run       ${dir}`,
    `This is a system failure, not a refusal: no question is raised and no retry is spent (kogaki#1300).`,
    `Every completed state is kept; \`run --run-dir ${dir}\` re-enters at ${st.id}.`,
    `Run record: ${recPath}`,
  ].join("\n") + "\n");
  process.exit(1);
}

// ---- THE RECORD AS IT STANDS, WRITTEN MID-ADVANCE (kogaki#1073 item 3).
// Same writer and shape as the release (`_dir` stripped), run after every completed
// state and every per-group judge record, since a SIGKILL at the table's `advance_timeout_s` runs
// no exit path. A failing write is NOT swallowed.
// Exported for the job-verb dispatch (kogaki#1193): `job await` persists a `rec` with `_dir`.
export function checkpointRun(rec) {
  if (!rec || !rec._dir) return null;
  const out = { ...rec };
  delete out._dir;
  return writeRunRecord(rec._dir, out);
}

// CONTROL STATE ONLY (the run record). The survey record is referenced BY PATH and
// nothing is copied out of it — copying the ID->slug map here would discharge
// the control plane's one-record rule by breaching the display-ID rule's single-carrier rule in the same
// act, and the two are satisfiable together only this way. The standing
// refusal this honours is the one at `cmdSurvey`'s own record write.
export function newRunRecord(tablePath, table) {
  return {
    workflow: { path: relFromRepo(tablePath), version: table.version ?? null },
    // THE BINARY THIS RUN'S JUDGMENT CALLS EXECUTE (kogaki#1076). Declared here
    // as a null rather than left to appear when it is first written, so a record
    // that was never resolved and one written before the field existed are the
    // same shape and neither reads as a resolution that happened.
    judge_binary: null,
    survey_record: null,
    completed: [],
    waits_reached: [],
    conditional_entered: [],
    conditional_skipped: [],
    awaiting: null,
    owner_input: {},
    artifacts_written: [],
    judgments: {},
    gate_declarations_owed: [],
    // WHO EXECUTED EACH TRANSITION (kogaki#1027). One row per state that
    // completed, in the order they completed, each carrying the payload the
    // harness supplied. `completed` stays the control list the loop reads;
    // this is the attribution beside it, and `completeState` is the only
    // writer of either.
    transitions: [],
    done: false,
  };
}
