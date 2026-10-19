// brief/run-state — the refusal shape, the run state, the audience file, the
// job bounds, the judged call and the differentiation record. Cut from
// src/brief.mjs at its named sections (kogaki#1466); the design and its rulings
// are stated in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-terrain: the Full Report
//
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  gateSchema, readBriefRecord, readerStartThesisRefusal, readerStateShapeRefusal,
} from "../compose.mjs";
import { attachReview } from "../review.mjs";
import { BRIEF_ENTRIES, enterSubRun } from "../runs.mjs";
import { RETIRED_JOB_LIMIT_KEYS } from "../workflow/detached-job.mjs";
import { judgedRecordPath, settingValue } from "../workflow/judge.mjs";
import {
  JudgmentRefusal, TerminalJudgmentRefusal, persistPendingRun, readRunRecord,
} from "../workflow/run-record.mjs";

export function fail(msg) {
  // THE PENDING RUN RECORD IS PERSISTED FIRST (kogaki#1108, carrying kogaki#808).
  // Every state of the Brief table runs inside the shared executor, which arms a
  // pending record at the top of an act and releases it at the loop's own write.
  // A refusal raised in this file exits the process, so without this the
  // transitions that act had already completed would sit on disk unnamed by the
  // record — the exact loss #808 closed one runtime over. It is a no-op outside
  // an advance, which is every standalone invocation.
  persistPendingRun();
  process.stderr.write(`brief: ${msg}\n`);
  process.exit(1);
}

// A flag whose value was omitted parses as boolean true, and String(true)
// is "true" — a string that passes the slug grammar and reaches
// readFileSync as a filename (PR #484 round 1 finding 1). So every consumer
// reads through this guard: a non-string value is the omitted-value defect,
// refused with the runtime's own refusal shape rather than leaking an
// ENOENT stack the skill's relay contract does not cover.
export function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
}

// Pre-Thesis run state, in the Brief lane's own `entries/` directory
// (kogaki#750): timestamped, one per `enter`, and `enterSubRun` prunes to
// keep-last-K before creating it. A sub-directory rather than the lane root
// (PR #783 round 1, finding 3), so front-door re-runs never prune a Brief's
// slug workspace. `--run-state` names a path the caller holds and never prunes.
export function defaultRunState() {
  const entry = `entry-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  return join(enterSubRun("brief", BRIEF_ENTRIES, entry), "run.json");
}

export function readRunState(args) {
  const p = argString(args, "run-state",
    "this command needs --run-state <path> — the machine-local run record "
    + "`enter` wrote (pre-Thesis state is machine-local, the durable home and the entry point v9)");
  if (!existsSync(p)) {
    fail(`run state ${p} does not exist — run \`brief.mjs enter\` first `
      + "(entry → thesis-determination gate → mint, the durable home and the entry point v9).");
  }
  return { path: p, state: JSON.parse(readFileSync(p, "utf8")) };
}

// EACH SETTLED STRAND'S CLAIM, as the run state carries it: the served
// headline `enter` resolved for the member, in the order the set was settled.
// A member whose rendering was not found has no claim to read a term from and
// is left out rather than given a marker's words (kogaki#1331).
export function strandClaims(state) {
  const renderings = (state && state.strand_renderings) || {};
  return (Array.isArray(state?.strands) ? state.strands : [])
    .map((s) => ({ id: s.display_id, claim: renderings[s.slug] && renderings[s.slug].headline }))
    .filter((c) => typeof c.claim === "string" && c.claim.trim() !== "");
}

// ===========================================================================
// THE BRIEF FLOW (kogaki#1108, owner decision 2026-09-12): the Brief is a
// HARNESS-OWNED WORKFLOW TABLE on the Terrain pattern — `src/brief-workflow.json`,
// a lane, and the two maps a state id is looked up in — advanced by the shared
// `runWorkflow`, which is never reimplemented here. The Model acts only as the
// judge the executor calls, at `differentiation`, `compose_path` (and its
// per-unit Move fit, kogaki#1307) and `review_path`; it fills declared fields
// and never decides when a state runs, whether the run advances, or what the
// owner is asked.
const BRIEF_HERE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const BRIEF_REPO = resolve(BRIEF_HERE, "..");
export const BRIEF_TABLE = join(BRIEF_HERE, "brief-workflow.json");

export function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

// THE PERSONA'S PATH, READ FROM THE ONE PLACE IT IS DECLARED (kogaki#1262).
// `cmdMint` runs standalone (the CLI's `mint` verb) as well as under the
// workflow, so it reads `src/brief-workflow.json` itself rather than relying
// on a `table` a standalone caller never has in hand — the same row the
// `differentiation` state reads `reader_file` from, by the row's own id
// rather than by position, so the two readings cannot drift apart by table
// edit order.
export function briefComposePathDefault() {
  return briefAudienceFile(readJson(BRIEF_TABLE));
}

// THE AUDIENCE FILE IS A SETTING (kogaki#1307, kogaki#1370): the `compose_path` row's
// `reader_file` names `brief.audience_file` in `kogaki.settings.json`, and every reader
// resolves it here, so the row and the settings file are one fact.
export function briefAudienceFile(table) {
  const st = ((table && table.states) || []).find((s) => s.id === "compose_path");
  const v = st ? settingValue(st.reader_file) : undefined;
  return (typeof v === "string" && v !== "" && v)
    || fail("src/brief-workflow.json's `compose_path` state declares no `reader_file` — the Audience file's path is "
      + "read through it (kogaki#1216, kogaki#1262). Nothing was written.");
}

// THE COMPOSE JOB'S UNIT COUNT AND EACH JOB'S TWO BOUNDS ARE SETTINGS (kogaki#1307,
// kogaki#1355), named by the `job` rows of `compose_path` and `review_path`.
export function briefJobSetting(table, stateId, key) {
  const st = ((table && table.states) || []).find((s) => s.id === stateId);
  const v = st && st.job ? settingValue(st.job[key]) : undefined;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n
    : fail(`src/brief-workflow.json's \`${stateId}\` job declares no positive \`${key}\` -- it names a setting in `
      + "kogaki.settings.json (kogaki#1307). Nothing was started.");
}

// A JOB UNIT IS BOUNDED PER CALL AND PER ATTEMPT COUNT, NEVER BY A WHOLE-JOB LIMIT
// (kogaki#1355): `call_limit_s` and `unit_attempts`, each naming a setting, read before
// anything starts. A `job` row or a settings file still carrying a retired whole-job
// limit is refused naming the key, as a missing key is refused -- a limit that silently
// stopped binding would read as one still in force. The settings file is found as
// `settingValue` finds it, `KOGAKI_SETTINGS` included.
export function briefJobBounds(table, stateId) {
  const st = ((table && table.states) || []).find((s) => s.id === stateId);
  const row = (st && st.job) || {};
  for (const k of RETIRED_JOB_LIMIT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(row, k)) {
      fail(`src/brief-workflow.json's \`${stateId}\` job carries \`${k}\`, a whole-job limit retired by kogaki#1355 -- `
        + "a unit is bounded by `call_limit_s` and `unit_attempts`. Nothing was started.");
    }
  }
  const settingsPath = process.env.KOGAKI_SETTINGS ? resolve(process.env.KOGAKI_SETTINGS) : join(BRIEF_REPO, "kogaki.settings.json");
  let settings = null;
  try { settings = JSON.parse(readFileSync(settingsPath, "utf8")); } catch { settings = null; }
  const brief = settings && settings.brief && typeof settings.brief === "object" ? settings.brief : {};
  for (const k of RETIRED_JOB_LIMIT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(brief, k)) {
      fail(`${settingsPath} carries the setting \`brief.${k}\`, a whole-job limit retired by kogaki#1355 -- remove it; `
        + "`brief.call_limit_s` and `brief.unit_attempts` bound a job unit. Nothing was started.");
    }
  }
  return {
    callLimitS: briefJobSetting(table, stateId, "call_limit_s"),
    unitAttempts: briefJobSetting(table, stateId, "unit_attempts"),
  };
}

// The lane entry name a START act opens a workspace under. Its shape is
// `terrainRunEntry`'s — the lane name, the ISO instant, path-safe — and it is
// composed here rather than imported because that helper names its own lane.
export function briefRunEntry(now = new Date()) {
  return `brief-${now.toISOString().replace(/[:.]/g, "-")}`;
}

// The capture file the harness writes this run's answers into. ONE FILE PER RUN
// WORKSPACE, holding a row per raising of either gate: `readCapturedAnswer` in
// the executor composes exactly this path from the flow's lane and the gate
// schema's suffix, and `validateOwnerAnswer` filters it by `gate_id`, so the two
// gates share a file and never an answer.
export function captureFile(rec) {
  return join(rec._dir, `brief${gateSchema().capture.suffix}`);
}

export function needRunState(rec, st) {
  return rec.brief_run_state
    || fail(`${st.id} has no run state — the \`enter\` state writes it and precedes this state in `
      + "src/brief-workflow.json. Nothing was written.");
}

export function needBrief(rec, st) {
  const written = (rec.artifacts_written || []).find((a) => a.state === "mint");
  return written
    ? resolve(BRIEF_REPO, written.path)
    : fail(`${st.id} has no minted Brief — the \`mint\` state creates it and precedes this state in `
      + "src/brief-workflow.json. Nothing was written.");
}

// A refusal a JUDGMENT state raises. Inside the executor's re-ask window this is
// what makes the judge try again with this exact text; outside it — the explicit
// `--candidates`/`--review`/`--specialization` path, which the fixture and the
// second-repository paths use — it is caught by `judged` below and becomes an
// ordinary refusal. ONE REFUSAL BODY FOR BOTH, which is `judgedRecordPath`'s own
// rule one file over: two copies of a refusal is two readings of one rule.
export function refuseJudgment(msg) {
  throw new JudgmentRefusal(msg);
}

export async function judged(rec, st, table, args, flag, composeInput, validate) {
  try {
    return await judgedRecordPath(rec, st, table, args, flag, composeInput, validate);
  } catch (e) {
    // TERMINAL FIRST. Both arms end at the same `fail()` — the difference is
    // upstream, where `judgeAttempts` catches one class and re-throws the
    // other, so only the re-askable one is ever pushed onto `refusals_repaired`.
    if (e instanceof TerminalJudgmentRefusal) fail(`${st.id}: ${e.message}`);
    if (e instanceof JudgmentRefusal) fail(`${st.id}: ${e.message}`);
    throw e;
  }
}

// The Move library's path, resolved the one way every other reader of it
// resolves it — `--moves-dir` when given and non-empty, the default otherwise.
// `src/assemble.mjs` and `src/draft.mjs` each spell this inline; it is written
// once here rather than a third time, because a flow whose composing state and
// whose adopting state read two different libraries would compose against one
// set and resolve against another.
export function briefMovesDir(args) {
  return typeof args["moves-dir"] === "string" && args["moves-dir"] !== "" ? args["moves-dir"] : "moves";
}

export function writeJudgeInput(rec, st, body) {
  const p = join(rec._dir, `brief-judge-input-${st.id}.json`);
  writeFileSync(p, JSON.stringify(body, null, 2) + "\n");
  return p;
}

const DIFFERENTIATION_DIMENSIONS = ["knowledge", "question", "expectation", "orientation", "trust"];

// THE BRIEF'S ADOPTED THESIS, the record's `thesis` key as `composeBrief`
// writes it (kogaki#1325, kogaki#1328). Null where it is absent or blank, so a
// caller checks nothing rather than a blank.
export function briefThesis(record) {
  const t = record && record.thesis;
  return typeof t === "string" && t.trim() !== "" ? t.trim() : null;
}

// The minted Brief a state reads: its record and its text, or a refusal of
// the STATE naming why it cannot be read.
export function readMintedBrief(rec, st) {
  const briefPath = needBrief(rec, st);
  const r = readBriefRecord(briefPath);
  if (r.error) fail(`${st.id}: ${r.error}`);
  return { briefPath, record: r.record, doc: r.text };
}
const DIFFERENTIATION_PLACEMENTS = ["opening", "turn", "close"];

// PURE, so `checks/check-brief-differentiation.sh` can import and test every
// refusal directly, matching the codebase's other pure judgment validators
// (attachReview, validateLegs, assembleSelection, candidateLedgerRefusal).
// Returns `{ error }` naming the offending entry, or `{ entries }` on success
// (kogaki#1206).
export function validateDifferentiationRecord(record, { units, moves, journeyBearing, thesis }) {
  if (!record || record.version !== "1") {
    return { error: `\`version\` must be "1" (src/differentiation-schema.json); received `
      + `${JSON.stringify(record && record.version)}` };
  }
  // READER START AND THE FIRST-LEG SURVIVORS (kogaki#1216). Both are
  // properties of the Brief and of no path, so they are checked here, once,
  // before the per-unit entries that draw on them. Reader start is a shape
  // check only -- its DERIVATION from the Persona and the Thesis is judgment
  // and is linted nowhere; the survivor list is checked for resolution and
  // non-emptiness, and every unit's `opening_move` must be a member of it,
  // which is the whole of what the exclusion rule makes mechanical.
  if (typeof record.reader_start !== "string" || record.reader_start.trim() === "") {
    return { error: "`reader_start` is required and cannot be blank -- the Brief's one Reader start, a cold read "
      + "authored from the Audience's persona and the adopted Thesis (src/differentiation-schema.json, kogaki#1216)" };
  }
  const shapeErr = readerStateShapeRefusal(record.reader_start, "reader_start", "reader_start");
  if (shapeErr) return { error: shapeErr };
  // THE THESIS ENTERS `question` ONLY (kogaki#1325). `thesis` is optional for
  // a caller with none to hand; the differentiation state always passes the
  // Brief's own.
  const thesisErr = readerStartThesisRefusal(record.reader_start, thesis);
  if (thesisErr) return { error: thesisErr };
  const survivors = record.leg1_survivors;
  if (!Array.isArray(survivors) || survivors.length === 0) {
    return { error: "`leg1_survivors` is required and cannot be empty -- every Move whose `before` does not contradict "
      + "`reader_start` on a dimension it declares, by id (src/differentiation-schema.json, kogaki#1216); an empty list "
      + "names a library with no Move able to open from this Reader start, which is a store fault and not a Brief" };
  }
  for (const id of survivors) {
    if (typeof id !== "string" || id === "" || !moves.some((m) => m.id === id)) {
      return { error: `\`leg1_survivors\` names ${JSON.stringify(id)}, which resolves to no record in `
        + "`moves_you_may_bind` (src/differentiation-schema.json, kogaki#1216)" };
    }
  }
  const entries = record.entries;
  if (!Array.isArray(entries) || entries.length !== units) {
    return { error: `\`entries\` must carry exactly ${units} entries, one per reader-path unit; `
      + `received ${Array.isArray(entries) ? entries.length : "no array"} (src/differentiation-schema.json)` };
  }
  const seenUnit = new Set();
  const seenDim = new Set();
  for (const e of entries) {
    if (!e || typeof e.unit_number !== "number" || !Number.isInteger(e.unit_number)
      || e.unit_number < 1 || e.unit_number > units) {
      return { error: `every entry carries an integer \`unit_number\` in 1..${units}; received `
        + `${JSON.stringify(e && e.unit_number)}` };
    }
    if (seenUnit.has(e.unit_number)) {
      return { error: `two entries carry \`unit_number\` ${e.unit_number} — it is the join key the `
        + "unit's own prompt and the assembled Candidate's tag both resolve through" };
    }
    seenUnit.add(e.unit_number);
    if (typeof e.dimension !== "string" || !DIFFERENTIATION_DIMENSIONS.includes(e.dimension)) {
      return { error: `unit ${e.unit_number}: \`dimension\` must be one of `
        + `${DIFFERENTIATION_DIMENSIONS.join(", ")} (src/differentiation-schema.json); received `
        + `${JSON.stringify(e && e.dimension)}` };
    }
    if (seenDim.has(e.dimension)) {
      return { error: `unit ${e.unit_number} leads with \`dimension\` ${JSON.stringify(e.dimension)}, `
        + "already assigned to another unit — two units leading with the same dimension are not "
        + "differentiated by assignment, they are differentiated by luck" };
    }
    seenDim.add(e.dimension);
    if (typeof e.opening_move !== "string" || e.opening_move === ""
      || !moves.some((m) => m.id === e.opening_move)) {
      return { error: `unit ${e.unit_number}: \`opening_move\` must resolve in \`moves_you_may_bind\`; `
        + `received ${JSON.stringify(e && e.opening_move)}` };
    }
    if (!survivors.includes(e.opening_move)) {
      return { error: `unit ${e.unit_number}: \`opening_move\` ${JSON.stringify(e.opening_move)} is not a member of `
        + "`leg1_survivors` -- the first Leg binds a Move whose `before` does not contradict Reader start, and the "
        + "survivor list is where that exclusion is recorded (src/differentiation-schema.json, kogaki#1216)" };
    }
    if (e.journey_placement !== undefined) {
      if (!journeyBearing) {
        return { error: `unit ${e.unit_number}: \`journey_placement\` is present and this Brief's `
          + "selected Strands carry no Journey material at all (src/differentiation-schema.json, "
          + "`absent_when`)" };
      }
      if (!DIFFERENTIATION_PLACEMENTS.includes(e.journey_placement)) {
        return { error: `unit ${e.unit_number}: \`journey_placement\` must be one of `
          + `${DIFFERENTIATION_PLACEMENTS.join(", ")} when present; received `
          + `${JSON.stringify(e.journey_placement)}` };
      }
    }
    if (typeof e.reader_experience !== "string" || e.reader_experience.trim() === "") {
      return { error: `unit ${e.unit_number}: \`reader_experience\` is required and cannot be blank — `
        + "it is carried into the unit's own prompt so it composes toward it" };
    }
  }
  return { entries };
}

// ONE UNIT'S OWN ASSIGNMENT, rendered as instruction rather than as a second
// input (kogaki#1206). `compose_path` splices this ABOVE the input marker
// its per-unit prompt already carries — the same layer the rendered schema
// and record example occupy — so the unit is told what it was assigned
// before it ever reaches the input file it is judging over.
export function differentiationBlockFor(entry, readerStart, survivorCount) {
  return [
    "YOUR ASSIGNED DIFFERENTIATION (kogaki#1206) — decided before any unit composed, so the three",
    "Candidates differ BY ASSIGNMENT and not by chance (src/differentiation-schema.json):",
    `  reader-state dimension you lead with: ${entry.dimension}`,
    `  opening Move your first Leg MUST bind: ${entry.opening_move}`,
    `  journey placement: ${entry.journey_placement || "(none assigned — carry no Journey material for this unit)"}`,
    `  intended reader experience: ${entry.reader_experience}`,
    "",
    // READER START IS GIVEN, NOT COMPOSED (kogaki#1216). It was authored once
    // at `differentiation` from the Persona and the Thesis, and every unit
    // composes from the same one; the Harness sets it on the Candidate, so a
    // unit that writes its own is writing a value nothing reads.
    "THE BRIEF'S READER START (kogaki#1216) — a cold read authored from the Persona and the Thesis, never from",
    "a Move; GIVEN to you, not yours to compose. It IS your first Leg's before-state (kogaki#1325): no Leg writes a",
    "`reader_state_before` -- each begins at the previous Leg's `reader_state_after`, the first at Reader start, and",
    "a Leg carrying the field is refused by name. Your opening Move's `before` must require nothing Reader start",
    "does not hold. Your LAST Leg's `reader_state_after`",
    "IS the Brief's Reader target (kogaki#1225) — no field authors it apart from the Leg. Your assigned opening",
    `Move is one of the ${survivorCount} Move(s) whose \`before\` does not contradict this Reader start:`,
    ...String(readerStart).split("\n").map((l) => `  ${l}`),
  ].join("\n");
}

// ---- THE ONE FACT `enter` NEEDS, AND WHERE IT COMES FROM (kogaki#1116).
// The Strand set arrives on the command line and nowhere else: the brief
// skill's `!` line carries `$ARGUMENTS`, each a served Lesson address resolved
// by `resolveStrandAddresses`. Nothing here reads a Terrain run (owner ruling
// 2026-09-13/14: the two lanes are independent); the resolved set is rendered
// at the thesis gate before anything under `theses/` is written.
export function entryInputs(args) {
  const entered = Array.isArray(args._rest) ? args._rest : [];
  if (!entered.length) {
    fail("`start` was given no Strand address. A Brief is started with the served Lesson addresses "
      + "it composes from, space-separated: `/brief coding::lesson/<local-name> "
      + "coding::lesson/<local-name>` (a bare local name resolves against the Lesson kind). A "
      + "human-facing reference — a Full Report coordinate like `G1` or `L101`, or a description in "
      + "prose — is resolved into served addresses from the Full Report BEFORE the skill is invoked, "
      + "and this runtime refuses such a token by name. Nothing was written.");
  }
  return { entered, via: "supplied on the command line" };
}

// THE PATH-REVIEW UNIT'S DECLARED VALIDATOR (kogaki#1301), loaded by the
// detached supervisor exactly as `validateReaderPathUnit` is. Each unit
// reviews ONE Candidate, named by the unit's own id in `inputs.candidates`, and
// its entry is checked by `attachReview` over that Candidate alone — the same
// shape check the single synchronous call ran, against an empty ledger.
export function validateReviewPathUnit(entry, inputs, unitId) {
  const c = ((inputs || {}).candidates || {})[unitId];
  if (!c || typeof c.candidate_id !== "string") {
    return { error: `the path-review unit ${JSON.stringify(unitId)} names no Candidate the job was started with` };
  }
  const r = attachReview([c], { [c.candidate_id]: entry }, {});
  return r.error ? { error: r.error } : null;
}

// THE TWO DETACHED JOBS OF THIS FLOW (kogaki#1301). The reader-path job keeps
// its files in the run directory, as it has since kogaki#1193; the path-review
// job keeps the same set of files in a directory of its own beneath it, so the
// two never overwrite each other's record. `job status` and `job await` read
// the job of the state the run is waiting at.
export const REVIEW_PATH_JOB_DIR = "review-path";
export function detachedJobFor(runDir, stateId) {
  const review = stateId === "review_path";
  return {
    runDir,
    stateId: review ? "review_path" : "compose_path",
    jobDir: review ? join(runDir, REVIEW_PATH_JOB_DIR) : runDir,
    label: review ? "path-review job" : "reader-path job",
  };
}
export function detachedJobOfRun(runDir) {
  let rec = null;
  try { rec = readRunRecord(runDir); } catch { rec = null; }
  return detachedJobFor(runDir, rec && rec.awaiting);
}
