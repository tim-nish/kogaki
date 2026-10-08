// The workflow engine — the judge call: its binary, settings, limits and refusals, and the
// composition input it reads.
// Shared by every command that runs a workflow table, so it lives outside every command
// directory (kogaki#1259, kogaki#1302).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { spawnSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { delimiter, join, resolve, sep } from "node:path";
import {
  JudgmentRefusal, REPO, REPORT_FORMAT, checkpointRun, fail, flow, readJson, relFromRepo,
  softRefusals,
} from "./run-record.mjs";
import { NO_GLOSS_BODY } from "./strands.mjs";

// THE COHERENCE LABEL: three affinity labels plus the residual `other`, ordered by
// decreasing coherence (kogaki#683 disposition 5; kogaki#738).
// `other` is the residual: named separately (`RESIDUAL_LABEL`), carries no affinity claim, has
// no `limits.subgroup_member_cap` row, and is bounded by its own limit — never unlimited.
// Consumer-owned values: rendered only on kogaki's own display, so no hub ratification.
// consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/knowledge-architecture.md:198
export const COHERENCE_LABELS = Object.freeze(["tight", "related", "loose", "other"]);
// The residual, named once so no reader has to infer it from the cap map's gaps.
export const RESIDUAL_LABEL = "other";

// The JUDGMENT half of subdivision, shared by the co-tag display and `subdivide`: one
// implementation, so the two surfaces cannot drift (kogaki#133).
// THE LIMITS' ONE READER (kogaki#738 ruling 5, owner amendment 2's five config keys).
// Every number the subdivision judgment enforces is read here and restated nowhere else.
// A missing block FAILS LOUDLY; a permissive default would silently delete a ruled refusal.
const CAPPED_LABELS = Object.freeze(COHERENCE_LABELS.filter((l) => l !== RESIDUAL_LABEL));

export function subdivisionLimits(grammarPath = REPORT_FORMAT) {
  const limits = readJson(grammarPath).limits;
  const caps = limits && limits.subgroup_member_cap;
  // EVERY PER-LABEL KEY IS CHECKED, not just the map's presence (PR #758 round
  // 1). `subgroupMemberCap` returns `null` for a label the map does not carry,
  // and `null` is this design's own signal for "deliberately uncapped, this is
  // the residual" — so an owner who deletes or misspells `loose` in an
  // owner-editable file would silently lose that cap's refusal, with an
  // oversized `loose` SubGroup admitted and indistinguishable from the residual
  // convention. That is the outcome this function's header says it exists to
  // prevent, reachable through the one case the block-level guard missed.
  const missingCap = caps ? CAPPED_LABELS.filter(
    (l) => !Object.prototype.hasOwnProperty.call(caps, l)) : [];
  if (!caps || missingCap.length || limits.min_subgroup_members === undefined
      || limits.max_residual_members === undefined) {
    fail("report-format.json declares no complete `limits` block, so semantic subdivision's subdivision limits "
      + "cannot be read (kogaki#738 ruling 5, owner amendment 2)"
      + (missingCap.length ? `; no cap is declared for ${missingCap.join(", ")}` : "")
      + ". The five keys live in the carrier by design — a cap for each of "
      + `${CAPPED_LABELS.join(", ")}, plus \`min_subgroup_members\` and \`max_residual_members\` — `
      + "and defaulting any of them here would silently delete a ruled refusal.");
  }
  return {
    caps,
    min: Number(limits.min_subgroup_members),
    maxResidual: Number(limits.max_residual_members),
  };
}

// THE LIMITS PUT IN FRONT OF THE JUDGE (kogaki#1068 item 2).
// Every number comes through `subdivisionLimits`, so the ask and the refusal cannot disagree.
// Keyed on the state's own declaration; an unknown block name is refused BY NAME.
const JUDGE_LIMIT_BLOCKS = Object.freeze({
  subdivision: () => {
    const { caps, min, maxResidual } = subdivisionLimits();
    return {
      _read_from: "report-format.json `limits` — the one carrier of these numbers; this ask restates none of them",
      subgroup_member_cap: Object.fromEntries(CAPPED_LABELS.map((l) => [l, Number(caps[l])])),
      min_subgroup_members: min,
      max_residual_members: maxResidual,
      every_member_must_be_placed: `Every member of this group appears in exactly one SubGroup. The engine composes no catch-all: a member you place nowhere is a refusal naming it, and a member you place twice is a refusal too. Place a member you find no affinity for in a SubGroup labelled ${JSON.stringify(RESIDUAL_LABEL)} — the residual, which carries no minimum and is bounded at ${maxResidual}.`,
      _refused: `A SubGroup over its label's cap, or under ${min} members, is refused and you are asked again with the refusal. A SubGroup holding the WHOLE group is exempt from the minimum alone — it divided nothing — and never from the cap.`,
    };
  },
});

function judgeLimits(st) {
  if (st.limits === undefined || st.limits === null) return null;
  const key = String(st.limits);
  if (!Object.prototype.hasOwnProperty.call(JUDGE_LIMIT_BLOCKS, key)) {
    fail(`${st.id}: the workflow table declares \`limits\` ${JSON.stringify(key)}, which names no known limit `
      + `block. The known one is ${Object.keys(JUDGE_LIMIT_BLOCKS).map((k) => JSON.stringify(k)).join(", ")}; `
      + "a second is added by ruling rather than by spelling, exactly as `record_example`'s directives are "
      + "(kogaki#1068).");
  }
  return JUDGE_LIMIT_BLOCKS[key]();
}

// THE `observed` PRODUCER (kogaki#1030): the executor's OWN record of each judge call —
// pinned model, command, state, attempt count, response sha from disk.
// Nothing in it comes from the response's content (kogaki#892).
// Set by `invokeJudge` alone; an argv-supplied record sets none and stays `declared`.
export const JUDGE_INVOCATIONS = new Map();

function recordJudgeInvocation(stateId, invocation) {
  JUDGE_INVOCATIONS.set(stateId, invocation);
}

// ---- THE JUDGE CALL ITSELF (kogaki#1030 item 1). ---------------------------
// The model is a called function, never the driver: compose the prompt from the table,
// run the pinned model (`terrain-workflow.json`, never the session's), parse ONE record.
// `KOGAKI_JUDGE_CLI` replaces WHICH executable runs, for fixtures, and nothing else.
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

// THE OWNER'S SETTINGS FILE (kogaki#1307): `kogaki.settings.json` at the repository
// root, the one human-facing place for values changed during non-coding operation.
// A table row that would restate one of them names it instead, as `{"setting":
// "<dotted key>"}`, and `settingValue` resolves the row. A missing file or key is a
// refusal naming the key: a value a run needs is never defaulted.
// `KOGAKI_SETTINGS` points at another file FOR FIXTURES ONLY.
const SETTINGS_FILE = "kogaki.settings.json";

function settingsPath() {
  return process.env.KOGAKI_SETTINGS ? resolve(process.env.KOGAKI_SETTINGS) : join(REPO, SETTINGS_FILE);
}

function kogakiSetting(key) {
  const p = settingsPath();
  if (!existsSync(p)) fail(`the setting \`${key}\` is needed and ${p} does not exist — ${SETTINGS_FILE} carries the values an owner changes without coding (kogaki#1307).`);
  let doc;
  try { doc = JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { fail(`the setting \`${key}\` is needed and ${p} is not JSON (${e.message}).`); }
  let v = doc;
  for (const part of String(key).split(".")) {
    v = v && typeof v === "object" && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v, part) ? v[part] : undefined;
  }
  if (v === undefined || v === null || v === "") fail(`${p} carries no setting \`${key}\` — add it there; nothing defaults it (kogaki#1307).`);
  return v;
}

// A table value that names a setting is read from the settings file; any other value is the
// table's own literal.
export function settingValue(v) {
  return v && typeof v === "object" && !Array.isArray(v) && typeof v.setting === "string" ? kogakiSetting(v.setting) : v;
}

// EXPORTED FOR THE DETACHED JOB (kogaki#1193): `compose_path`'s own STATE_WORK
// resolves the same command/model/timeout the synchronous judge path reads,
// because the unit prompts it composes are handed to the SAME binary at the
// SAME pin -- there is no second judge configuration for a detached call.
export function judgeSettings(table, rec) {
  const j = (table && table.judge) || fail(
    "the workflow table declares no `judge` block, so a judgment state has no model to invoke. "
    + "field_semantics: the block names the command, THE PINNED MODEL and the output format, and the "
    + "model is never inherited from the session (kogaki#1030).");
  // THE RECORDED ABSOLUTE PATH, NEVER THE BARE WORD (kogaki#1076 item 2). The
  // table's `command` is what was RESOLVED; what is RUN is what the resolution
  // found and verified, so an advance fired from a session whose `PATH` differs
  // runs the run's own binary.
  const binary = (rec && rec.judge_binary) || null;
  return {
    command: binary ? String(binary.path) : fail(
      "this run's record carries no resolved judge binary, so a judgment call would spawn whatever the "
      + "firing session's PATH offers first -- which is the defect kogaki#1076 closed. The binary is "
      + "resolved and verified by the session that STARTS the run and written onto the run record; a "
      + "record carrying none is one this act never opened."),
    // THE PIN'S BINARY COMPONENT (kogaki#1076 item 3). What `--version` said,
    // taken from the executable the run actually resolved.
    binaryVersion: binary ? (binary.version || null) : null,
    model: String(settingValue(j.model) || fail("the workflow table's `judge` block pins no `model`")),
    outputFormat: String(j.output_format || "json"),
    // PER CALL, IN SECONDS IN THE TABLE AND MILLISECONDS HERE. Required rather
    // than defaulted: a bound that a table can silently omit is not a bound.
    timeoutMs: 1000 * (Number.isFinite(j.timeout_s) ? j.timeout_s : fail(
      "the workflow table's `judge` block declares no numeric `timeout_s`. A judgment call inside a "
      + "PostToolUse hook is bounded by that hook, and an unbounded child can exhaust the hook's own "
      + "timeout mid-span (kogaki#1030, PR #1044 round 1).")),
    // HOW MANY BOUNDED CALLS RUN AT ONCE (kogaki#1073; kogaki#1062). Concurrency keeps
    // a per-group state's wall time near the LONGEST call, not the sum.
    // REQUIRED AND POSITIVE, like `timeout_s`; a cap of 1 is the sequential behaviour.
    concurrency: Number.isInteger(j.concurrency) && j.concurrency > 0 ? j.concurrency : fail(
      "the workflow table's `judge` block declares no positive integer `concurrency`. It is the number "
      + "of judge calls a per-group judgment state runs at once; the per-call bound `timeout_s` and the "
      + "advance's own bound both hold unchanged, and this is what keeps their SUM from being what the "
      + "advance is measured against (kogaki#1073)."),
    // READ FROM THE RESOLUTION, not from this act's environment: the run's
    // binary was chosen once, and whether it was the fixture seam's is a fact
    // about that choice rather than about whoever is advancing the run now.
    stubbed: binary ? !!binary.stubbed : !!process.env.KOGAKI_JUDGE_CLI,
  };
}

// THE CHILD, RUN WITHOUT BLOCKING THE THREAD (kogaki#1073). `spawnSync` is what
// made the per-group calls a SUM: nothing else can run while one is in flight,
// so eleven calls cost eleven call-lengths however small each one is. This is
// `spawnSync`'s contract over `spawn` — the same argv, the same stdin, the same
// per-call bound and the same `maxBuffer` — returning a promise instead of a
// value, so the pool below can hold several in flight at once.
//
// THE TIMEOUT ARM IS REPRODUCED RATHER THAN INHERITED, and its shape is
// `spawnSync`'s: `error.code === "ETIMEDOUT"`, which is the token the caller
// already reads. `spawn`'s own `timeout` option reports a kill through a signal
// on `close`, and a caller distinguishing a bound from a crash by signal would
// be reading a different fact than the one it reads today.
function judgeSpawnAsync(command, argv, { input, timeoutMs, maxBuffer }) {
  return new Promise((resolvePromise) => {
    let child;
    try { child = spawn(command, argv, { stdio: ["pipe", "pipe", "pipe"] }); }
    catch (e) { resolvePromise({ error: e, status: null, stdout: "", stderr: "" }); return; }
    const outChunks = [];
    const errChunks = [];
    let outLen = 0;
    let settled = false;
    let timer = null;
    const settle = (r) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolvePromise(r);
    };
    const kill = (err) => { try { child.kill("SIGKILL"); } catch { /* already gone */ } settle(err); };
    child.stdout.on("data", (d) => {
      outLen += d.length;
      // THE SAME CEILING `spawnSync`'s `maxBuffer` CARRIED, enforced here because
      // `spawn` has none: a judge that streamed without end would otherwise fill
      // this process's memory rather than being cut off with a named error.
      if (outLen > maxBuffer) { kill({ error: Object.assign(new Error("stdout maxBuffer exceeded"), { code: "ENOBUFS" }), status: null, stdout: "", stderr: "" }); return; }
      outChunks.push(d);
    });
    child.stderr.on("data", (d) => errChunks.push(d));
    child.on("error", (e) => settle({ error: e, status: null, stdout: "", stderr: "" }));
    child.on("close", (status) => settle({
      error: null, status,
      stdout: Buffer.concat(outChunks).toString("utf8"),
      stderr: Buffer.concat(errChunks).toString("utf8"),
    }));
    timer = setTimeout(() => {
      kill({ error: Object.assign(new Error("child timed out"), { code: "ETIMEDOUT" }), status: null, stdout: "", stderr: "" });
    }, timeoutMs);
    child.stdin.on("error", () => { /* a child that exited before reading its prompt is the close arm's */ });
    child.stdin.end(input);
  });
}

// N AT A TIME, IN DECLARATION ORDER, AND THE RESULTS COME BACK IN THAT ORDER
// (kogaki#1073). A worker takes the next index until there is none left, so the
// cap bounds how many are IN FLIGHT and never how many run. The results array is
// indexed by the item's own position, so the bookkeeping that follows the pool
// reads the groups in the order the composed input declared them — the order the
// sequential loop read them in, unchanged by the concurrency.
async function runPool(items, cap, fn) {
  const results = new Array(items.length);
  let next = 0;
  const width = Math.max(1, Math.min(cap, items.length));
  await Promise.all(Array.from({ length: width }, async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

// Everything after this line in a judge prompt is the input file, verbatim.
export const JUDGE_INPUT_MARKER = "----- INPUT (JSON) -----";

// AND EVERYTHING AFTER THIS LINE IS THE PRIOR ATTEMPT'S REFUSAL, verbatim
// (kogaki#1059). It appears only on a re-ask, and it appears BEFORE the input
// marker, because the input marker's own contract is that everything after it
// is the input file — a refusal appended past it would be read as input by any
// reader keying on position, which is the one thing that marker promises.
export const JUDGE_REFUSAL_MARKER = "----- YOUR PREVIOUS ANSWER WAS REFUSED -----";

// THE FIXED REPAIR SENTENCE, NAMED ONCE (kogaki#1203). `judgePrompt` below
// puts it after a synchronous judge's own refusal; the reader-path unit's
// retry prompt (`readerPathUnitRetryPrompt`) puts the SAME text after a
// unit's structural refusal, from the supervisor process, which reads no
// table. One exported string is what keeps the two ends of "the same refusal
// block" — the synchronous judge's re-ask and a detached unit's re-ask — from
// drifting into two different sentences one edit at a time.
export const JUDGE_REFUSAL_REPAIR_SENTENCE = "That is the refusal your previous answer raised, verbatim. Answer again, repairing exactly\n"
  + "it. The input below is unchanged, so re-reading the material is not what is wanted -- the\n"
  + "shape of your record is.";

// THE FILLED RECORD EXAMPLE (kogaki#1059): built from the run's own composed input
// (`composition_pin`, the composed group names), never a hand-written literal.
// Table-driven; two directives, each refused by name:
//   "$input:<key>"          the composed input's top-level <key>, verbatim
//   "$per-group:<text>"     an object mapping each composed group's name to <text>
// Any other value is a literal; any other `$`-prefixed string is a REFUSAL.
function judgeRecordExample(st, input) {
  const tpl = st.record_example;
  if (tpl === undefined || tpl === null) return null;
  if (typeof tpl !== "object" || Array.isArray(tpl)) {
    fail(`${st.id}: \`record_example\` must be a JSON object whose values are literals or one of the `
      + "two directives `$input:<key>` and `$per-group:<text>` (kogaki#1059).");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail(`${st.id}: \`record_example\` is declared and this state's composed input is not a JSON `
      + "object, so the example cannot be filled from the run's own material. An example filled from "
      + "anything else would put a shape in front of the judge that this run never composed "
      + "(kogaki#1059).");
  }
  // `$per-group` AS THE SOLE KEY, WHOSE VALUE IS THE TEMPLATE (kogaki#1062).
  // This is the SAME directive as the string form below, not a third one: what
  // widens is WHERE it may stand. `J1_claims`' record wraps its per-group map
  // under a `claims` key, so the string form under an ordinary key expresses it;
  // `J2_subdivision`'s record IS the per-group map, and its entries are OBJECTS
  // rather than sentences. Neither is expressible as a value under a key, so a
  // state whose whole record is the map had no way to bind its shape by example
  // and stayed bound by prose — which is the defect kogaki#1059 closed for its
  // sibling and this state still carried.
  const soleKeys = Object.keys(tpl);
  if (soleKeys.length === 1 && soleKeys[0] === "$per-group") {
    if (!Array.isArray(input.groups)) {
      fail(`${st.id}: \`record_example\` is the per-group map itself, and the composed input carries `
        + "no `groups` array to name its keys (kogaki#1062).");
    }
    return Object.fromEntries(input.groups.map((g) => [String(g && g.name), tpl["$per-group"]]));
  }
  const out = {};
  for (const [key, value] of Object.entries(tpl)) {
    if (typeof value !== "string" || !value.startsWith("$")) { out[key] = value; continue; }
    const at = value.indexOf(":");
    const directive = at < 0 ? value : value.slice(0, at);
    const arg = at < 0 ? "" : value.slice(at + 1).trim();
    if (directive === "$input") {
      if (!Object.prototype.hasOwnProperty.call(input, arg)) {
        fail(`${st.id}: \`record_example\` fills \`${key}\` from the composed input's \`${arg}\`, and `
          + "the input carries no such key. The example binds the shape the validator reads, so an "
          + "example filled from a key that is not there is worse than none (kogaki#1059).");
      }
      out[key] = input[arg];
    } else if (directive === "$per-group") {
      if (!Array.isArray(input.groups)) {
        fail(`${st.id}: \`record_example\` fills \`${key}\` with one entry per composed group, and the `
          + "composed input carries no `groups` array to name them (kogaki#1059).");
      }
      out[key] = Object.fromEntries(input.groups.map((g) => [String(g && g.name), arg]));
    } else {
      fail(`${st.id}: \`record_example\` names the unknown directive \`${directive}\`. The two are `
        + "`$input:<key>` and `$per-group:<text>`, and a third is added by ruling rather than by "
        + "spelling (kogaki#1059).");
    }
  }
  return out;
}

// The prompt is composed FROM THE TABLE (judgment point, input shape, refusal text).
// COMPOSED PER ATTEMPT (kogaki#1059): `lastRefusal` makes each re-ask a different ask.
// EXPORTED FOR THE DETACHED JOB (kogaki#1193): unit prompts use this one renderer.
export function judgePrompt(st, inputText, input, lastRefusal) {
  const L = [];
  L.push(`You are the judge at the ${flow().label} workflow's \`${st.id}\` judgment point.`);
  L.push("");
  L.push(`JUDGMENT POINT: ${st.judgment_point || st.id}`);
  L.push(`REQUIRED RECORD SHAPE: ${st.input_shape || "the typed record this state declares"}`);
  if (st.refusal) L.push(`WHAT IS REFUSED: ${st.refusal}`);
  // THE DECLARED SCHEMA, RENDERED VERBATIM (kogaki#1108). The validator reads its field
  // set from the same file, so the prompt and the refusal cannot disagree.
  // It stands ABOVE the input marker; everything past the marker is the composed input.
  // ONE ROW, ONE OR MANY FILES (kogaki#1126): each file whole, in order; a bare string
  // is the one-element list, so every pre-#1126 row reads unchanged.
  // Never fold two schemas into one file.
  // `schema_blocks` (kogaki#1307) names the top-level blocks of a ONE-file row to render,
  // each verbatim, for a row asking for one part of a file that also declares a shape this
  // judge is never asked for -- the per-unit Move-fit judge answers ONE specialization
  // record, and the file's `set` envelope is the adoption-level carrier, not its answer.
  const blocks = Array.isArray(st.schema_blocks) ? st.schema_blocks.map(String) : null;
  if (blocks && Array.isArray(st.schema_file)) {
    fail(`${st.id}: \`schema_blocks\` names blocks of ONE schema file, and this row declares several (kogaki#1307).`);
  }
  for (const declared of (Array.isArray(st.schema_file) ? st.schema_file : (st.schema_file ? [st.schema_file] : []))) {
    const sp = join(REPO, String(declared));
    if (!existsSync(sp)) {
      fail(`${st.id}: the table declares \`schema_file\` ${JSON.stringify(declared)} and no such file `
        + `exists. A judgment state that names a shape the judge is never shown is the prose-only prompt `
        + `wearing a declaration (kogaki#1108).`);
    }
    L.push("");
    if (blocks) {
      const whole = JSON.parse(readFileSync(sp, "utf8"));
      const missing = blocks.filter((b) => !(b in whole));
      if (missing.length) {
        fail(`${st.id}: \`schema_blocks\` names ${JSON.stringify(missing)}, which ${declared} does not declare (kogaki#1307).`);
      }
      L.push(`THE SCHEMA THE ELEMENTS OF YOUR RECORD ARE FILLED AGAINST -- the blocks ${blocks.join(", ")} of ${declared}, verbatim.`);
      L.push("Every field they declare, and what each one means. The refusals that judge your answer read");
      L.push("their field set from these same blocks, so what you are asked for and what is checked are one");
      L.push("text. Read them before composing.");
      L.push(JSON.stringify(Object.fromEntries(blocks.map((b) => [b, whole[b]])), null, 2));
      continue;
    }
    L.push(`THE SCHEMA THE ELEMENTS OF YOUR RECORD ARE FILLED AGAINST -- ${declared}, verbatim.`);
    L.push("Every field it declares, and what each one means. The refusals that judge your answer read");
    L.push("their field set from this same file, so what you are asked for and what is checked are one");
    L.push("text. Read it before composing.");
    L.push(readFileSync(sp, "utf8"));
  }
  const example = judgeRecordExample(st, input);
  if (example) {
    L.push("");
    L.push("THE LITERAL RECORD SHAPE, filled from THIS run's own composed input. Answer with a record");
    L.push("of exactly this shape: the same keys, the same nesting, and the same group names, with");
    L.push("each placeholder replaced by your judgment. The sentence above DESCRIBES the record; this");
    L.push("is the record.");
    L.push(JSON.stringify(example, null, 2));
  }
  L.push("");
  L.push("Your INPUT is the JSON below the marker, and it is the whole of what you may judge over.");
  L.push("Answer with the typed record and NOTHING else -- no prose, no fences, no commentary.");
  if (lastRefusal) {
    L.push("");
    L.push(JUDGE_REFUSAL_MARKER);
    L.push(lastRefusal);
    L.push("");
    L.push(JUDGE_REFUSAL_REPAIR_SENTENCE);
  }
  L.push("");
  // THE MARKER IS PART OF THE CONTRACT, not decoration. Everything after it is
  // the input file verbatim, so a reader — the judge, or a fixture stub standing
  // in for one — can find the input by position rather than by scanning for a
  // brace that the state's own `input_shape` text might also contain.
  L.push(JUDGE_INPUT_MARKER);
  L.push(inputText);
  return L.join("\n");
}

// The response's typed record. `--output-format json` wraps the answer in the
// CLI's own envelope, so the record is dug out of `result` rather than parsed
// off the whole of stdout; a bare record is admitted too, because that is what a
// stub is likeliest to emit and because admitting it costs no ambiguity.
function judgeRecordFrom(stdout, st) {
  let outer;
  try { outer = JSON.parse(stdout); }
  catch (e) {
    fail(`${st.id}: the judge's response is not JSON (${e.message}). The response is what the `
      + `pinned model returned to \`--output-format json\`, unedited: ${String(stdout).slice(0, 400)}`);
  }
  const inner = outer && typeof outer === "object" && !Array.isArray(outer)
    && Object.prototype.hasOwnProperty.call(outer, "result") ? outer.result : outer;
  if (typeof inner !== "string") return inner;
  try { return JSON.parse(inner); }
  catch (e) {
    fail(`${st.id}: the judge's response envelope parsed and its \`result\` did not (${e.message}). `
      + `The record must be the typed record alone -- no prose and no fences: ${inner.slice(0, 400)}`);
  }
  return null;
}

// THE RETRY IS BOUNDED BY THE STATE's `retries` (re-asks: 2 means at most three calls);
// a failure carries the last refusal text.
// ONE ASK-AND-VALIDATE LOOP for both invocation shapes (kogaki#1062): never copy it.
// It RETURNS on an exhausted bound; only the caller can name the groups in the failure.
async function judgeAttempts(cfg, st, retries, { inputText, input, out, validate, label }) {
  const argv = ["-p", "--model", cfg.model, "--output-format", cfg.outputFormat];
  const at = label || "";
  let lastRefusal = null;
  // EVERY REFUSAL THE BOUND ABSORBED, in order. The run record carries them on
  // BOTH arms (kogaki#1059): a run refused once and repaired on the second ask
  // is not a run that was never refused, and a reader who cannot tell the two
  // apart cannot see a judge drifting toward the bound until it is spent.
  const refusals = [];
  // COUNTED AS IT HAPPENS, never derived from the bound. A message composed from
  // `retries + 1` reports the number of attempts the table LICENSED rather than
  // the number this call made -- so a loop that stopped early would still say it
  // had spent them all, and an operator reading the refusal would be told a
  // count nothing performed. Found by mutating the loop bound and watching the
  // case stay green.
  let attempts = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    attempts += 1;
    // THE ASK CARRIES THE PRIOR REFUSAL (kogaki#1059). Composed HERE, inside the
    // loop, so attempt N+1 is a different ask from attempt N.
    const prompt = judgePrompt(st, inputText, input, lastRefusal);
    try {
      // ALL RESPONSE HANDLING IS INSIDE THE RETRY WINDOW (PR #1044; #1030 item 1).
      // `res.error` STAYS OUTSIDE IT: a command that could not be spawned is not re-asked.
      // THE CALL IS AWAITED OUTSIDE THE WINDOW AND JUDGED INSIDE (kogaki#1073): the
      // window is a synchronous depth counter and must never be held across an `await`.
      const startedAt = Date.now();
      const raw = await judgeSpawnAsync(cfg.command, argv, {
        input: prompt, maxBuffer: 64 * 1024 * 1024,
        // THE CHILD IS BOUNDED, AND ITS BOUND IS DERIVED FROM THE HOOK'S
        // (PR #1044 round 1). `.claude/hooks/advance-terrain.py` kills the whole
        // advance at the table's `advance_timeout_s`, and a span can now make several pinned
        // calls inside one PostToolUse event -- so an unbounded child could
        // exhaust the hook's bound mid-span and leave the half-finished record
        // that bound exists to relay, falsifying the one-hook-event guarantee
        // with no state misbehaving. The table declares the per-call seconds;
        // the two are named apart rather than conflated, because one bounds a
        // CALL and the other bounds an ADVANCE.
        timeoutMs: cfg.timeoutMs,
      });
      // A TIMEOUT IS A SYSTEM FAILURE, NOT A REFUSAL (kogaki#1300; never re-asked
      // since kogaki#1172). The same prompt over the same input takes the same
      // time, so neither a re-ask nor a retry gate can repair it. Returned with
      // `timeout` set; the caller throws `JudgeTimeout` and the run ends as a report.
      if (raw.error && raw.error.code === "ETIMEDOUT") {
        const measuredS = Math.round((Date.now() - startedAt) / 100) / 10;
        const msg = `${st.id}${at}: the judge exceeded the ${cfg.timeoutMs / 1000}s per-call bound the workflow table's `
          + `\`judge\` block declares (measured ${measuredS}s). Not re-asked (kogaki#1172) and not retried (kogaki#1300).`;
        refusals.push(msg);
        return { ok: false, out, attempts, refusals, lastRefusal: msg,
          timeout: { bound_s: cfg.timeoutMs / 1000, measured_s: measuredS, label: at } };
      }
      const res = softRefusals(() => {
        const r = raw;
        // ETIMEDOUT IS HANDLED ABOVE, before this window opens (kogaki#1172):
        // reaching here means `r.error` is either absent or some other spawn
        // fault, never a timeout.
        if (r.error) {
          // OUTSIDE THE RETRY, by the exception above: re-thrown past the window
          // so a spawn failure exits on the first occurrence.
          throw r.error;
        }
        if (r.status !== 0) {
          fail(`${st.id}${at}: the judge exited ${r.status}. Its stderr, verbatim: ${(r.stderr || "").trim() || "(empty)"}`);
        }
        return r;
      });
      const record = softRefusals(() => judgeRecordFrom(res.stdout, st));
      // WRITTEN UNDER A TEMPORARY NAME AND RENAMED AFTER IT VALIDATES
      // (kogaki#1073). The per-group records are now READ BACK on a later
      // advance, so what sits at `out` is evidence rather than a by-product: a
      // record cut off mid-write, or one this attempt is about to refuse, would
      // be taken by the next run as a group already judged. The rename is the
      // one act that makes "the file exists" and "the file validated" the same
      // fact. A refused attempt therefore leaves the temporary beside the run
      // for a reader, and never at the name the reuse check reads.
      const partial = `${out}.partial`;
      writeFileSync(partial, JSON.stringify(record, null, 2) + "\n");
      // THE STATE'S OWN REFUSALS, run against the judge's record exactly as they
      // run against an owner-supplied one.
      softRefusals(() => validate(partial));
      renameSync(partial, out);
      return { ok: true, out, record, attempts, refusals, lastRefusal, prompt };
    } catch (e) {
      if (!(e instanceof JudgmentRefusal)) {
        // The spawn failure the window deliberately re-throws, given its own
        // refusal here rather than at the throw site so the two arms of "the
        // judge did not answer" read alike to an operator.
        if (e && e.syscall) {
          fail(`${st.id}${at}: the judge could not be run (${cfg.command}: ${e.message}). The command and the `
            + "model are pinned in the workflow table's `judge` block; nothing here falls back to another "
            + "model, and a binary that is not there will not be there on a re-ask, so the bound is not spent on it.");
        }
        throw e;
      }
      lastRefusal = e.message;
      refusals.push(e.message);
    }
  }
  return { ok: false, out, attempts, refusals, lastRefusal };
}

// THE WHOLE COMPOSED INPUT, ONE ASK. The default shape, and the one every
// judgment state but `J2_subdivision` still spends.
async function invokeJudge(table, st, inputPath, dir, validate, rec) {
  const cfg = judgeSettings(table, rec);
  const retries = Number.isInteger(st.retries) ? st.retries : fail(
    `${st.id} is kind "judgment" and declares no integer \`retries\`. field_semantics requires the `
    + `key of exactly the judgment states -- the count is a property of the workflow and is held in `
    + `the table, never in this file (kogaki#1030).`);
  // READ AND PARSED ONCE, and the PROMPT is what is composed per attempt
  // (kogaki#1059). The input does not change between attempts -- the whole of
  // what a re-ask repairs is the judge's record -- so re-reading the file each
  // time would spend a read to make the two asks look different.
  const inputText = readFileSync(inputPath, "utf8");
  let input = null;
  try { input = JSON.parse(inputText); }
  catch (e) {
    // ONLY THE EXAMPLE NEEDS IT PARSED, so a state declaring none is unaffected
    // and a state declaring one refuses rather than silently dropping the
    // example -- an example that vanishes on a bad input is the prose-only
    // prompt returning at exactly the moment nothing would report it.
    if (st.record_example !== undefined && st.record_example !== null) {
      fail(`${st.id}: the composed input at ${inputPath} is not JSON (${e.message}), so the filled `
        + "record example this state declares cannot be built from the run's own material "
        + "(kogaki#1059).");
    }
  }
  // ONE CALL PER COMPOSED GROUP WHERE THE TABLE DECLARES IT (kogaki#1062).
  // THE LIMITS (kogaki#1068 item 2) RESOLVE FOR EVERY JUDGMENT STATE (PR #1070), so the
  // unknown-block refusal fires on declaring the key.
  // They are SPENT ON THE PER-GROUP ASK ALONE: the whole-input prompt embeds its input
  // file verbatim; limits there belong in `compose_input`, not here.
  const limits = judgeLimits(st);
  if (st.per_group === true) {
    return await invokeJudgePerGroup(cfg, st, retries, inputPath, input, dir, validate, rec, limits);
  }
  const out = join(dir, `${flow().lane}-judge-${st.id}.json`);
  const r = await judgeAttempts(cfg, st, retries, { inputText, input, out, validate, label: "" });
  if (r.ok) {
    recordJudgeInvocation(st.id, {
      state: st.id,
      command: cfg.command,
      // WHAT `--version` SAID, beside the path (kogaki#1076). Two invocation
      // records naming one command told a reader nothing about whether one
      // executable produced both.
      binary_version: cfg.binaryVersion,
      model: cfg.model,
      stubbed: cfg.stubbed,
      calls: 1,
      attempts: r.attempts,
      retries_declared: retries,
      refusals_repaired: r.refusals.length,
      // TAKEN FROM THE BYTES ON DISK BY THIS LAYER, like every other sha in
      // this file. A sha the response supplied would be one more declaration.
      response_sha: createHash("sha256").update(readFileSync(out)).digest("hex").slice(0, 16),
      at: new Date().toISOString(),
    });
    // ONE CALL, ON THE RUN RECORD, for the per-group arm's own reason: the two
    // shapes are distinguishable at the record rather than only by which fields
    // happen to be absent.
    if (rec) {
      rec.judge_calls = rec.judge_calls || {};
      rec.judge_calls[st.id] = {
        per_group: false, calls: 1, attempts: r.attempts,
        retries_declared: retries, refusals_repaired: r.refusals.length,
        // WHAT MADE THESE CALLS (kogaki#1076). `harnessJudgeInvocation`'s record
        // holds it too and lives in this process alone, so before this the run
        // record -- the one carrier a later reader has -- said how many calls
        // were made and nothing about which executable made them.
        command: cfg.command, binary_version: cfg.binaryVersion,
      };
    }
    // THE REPAIRED ARM WRITES THE RECORD TOO (kogaki#1059). `judgment_refusals`
    // used to be written on exhaustion alone, so a run the retry loop REPAIRED
    // was indistinguishable at the record from one the judge answered first
    // time -- and a repair loop nothing counts is a bound whose approach is
    // invisible until it is spent. `repaired` is what keeps the two arms
    // apart, so the existing exhaustion reader is unchanged by the widening.
    if (rec && r.refusals.length) {
      rec.judgment_refusals = rec.judgment_refusals || {};
      rec.judgment_refusals[st.id] = {
        attempts: r.attempts, retries_declared: retries, refusal: r.lastRefusal,
        refusals: r.refusals, repaired: true,
      };
    }
    return out;
  }
  // THE RUN RECORD NAMES THE REFUSAL, not only stderr (PR #1044 round 1, D1's
  // partial-discharge note). #1030 acceptance 2 reads "the run fails after the
  // declared retry count and THE RECORD NAMES THE REFUSAL", and stderr and the
  // persisted record are not one carrier: `fail()` persists the pending record
  // and prints the text, so a reader coming back to the run afterwards had the
  // failure and not its reason. Written before the refusal, so kogaki#808's
  // persist carries it out.
  if (rec) {
    rec.judgment_refusals = rec.judgment_refusals || {};
    rec.judgment_refusals[st.id] = {
      attempts: r.attempts, retries_declared: retries, refusal: r.lastRefusal,
      refusals: r.refusals, repaired: false,
    };
  }
  if (r.timeout) throw new JudgeTimeout(st.id, r.timeout, r.lastRefusal);
  // A SPENT BOUND STOPS THE STATE, NOT THE RUN (kogaki#1172 item 3). This used
  // to be `fail()`, which exits the process; the state loop now catches this
  // instead and raises `terrain-judgment-retry` in its place, leaving the run
  // open rather than dead.
  throw new JudgmentExhausted(st.id,
    `${st.id}: the judge's record was refused on all ${r.attempts} attempt(s) (${retries} re-ask(s) licensed, the count `
    + `the workflow table declares for this state). The last refusal, verbatim: ${r.lastRefusal}`);
}

// THE COMPOSED INPUT, NARROWED TO ONE GROUP (kogaki#1062).
// It NARROWS AND NEVER ADDS: every key is kept, and only the group-keyed three are cut —
// `groups`, `material`, and `composition_pin.groups`.
function scopeCompositionInput(input, group) {
  const name = String(group && group.name);
  const members = new Set(group && Array.isArray(group.members) ? group.members : []);
  const out = { ...input, groups: [group] };
  if (Array.isArray(input.material)) {
    out.material = input.material.filter((m) => members.has(m && m.id));
  }
  const cp = input.composition_pin;
  if (cp && typeof cp === "object" && !Array.isArray(cp) && cp.groups && typeof cp.groups === "object") {
    out.composition_pin = { ...cp, groups: { [name]: [...members] } };
  }
  if (input.accounting && typeof input.accounting === "object") {
    out.accounting = {
      ...input.accounting,
      candidates: Array.isArray(out.material) ? out.material.length : input.accounting.candidates,
      placements: members.size,
      // NAMED RATHER THAN SILENT: the shard fetches were spent once for the RUN,
      // not once per group, and a per-group figure copied from the whole input's
      // would say this ask paid for them.
      shard_fetches_note: "spent once for the run, before this narrowing",
    };
  }
  // WHICH GROUP THIS ASK IS ABOUT, stated rather than left to be inferred from a
  // one-entry array. The filled record example names the same group, so the two
  // agree by construction.
  out.judging_group = name;
  return out;
}

// ONE CALL PER COMPOSED GROUP (kogaki#1062). Per-group records are ASSEMBLED and the
// existing validator runs over the assembly; no refusal moves or is re-implemented.
// A refused group is re-asked alone to the state's `retries` (kogaki#1060).
async function invokeJudgePerGroup(cfg, st, retries, inputPath, input, dir, validate, rec, limits) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Array.isArray(input.groups)) {
    fail(`${st.id}: this state declares \`per_group\`, and the composed input at ${inputPath} carries no `
      + "`groups` array to ask about. The per-group ask is one call per composed group, so an input that "
      + "names no groups is not an input this state can be asked over (kogaki#1062).");
  }
  const groups = input.groups;
  const assembled = {};
  const perGroup = {};
  const judged = [];
  let attemptsTotal = 0;
  let refusalsTotal = 0;
  let callsMade = 0;
  let lastRefusal = null;
  const allRefusals = [];

  // ---- THE ASK IS PREPARED FOR EVERY GROUP FIRST, then run under the cap.
  // Preparing is a narrowing and a file write; asking is a child process. They
  // are separated because only the second is what the pool bounds.
  const asks = groups.map((g) => {
    const name = String(g && g.name);
    const slug = name.replace(/[^a-zA-Z0-9]+/g, "-") || "group";
    const scoped = scopeCompositionInput(input, g);
    if (limits) scoped.limits = limits;
    const scopedText = JSON.stringify(scoped, null, 2);
    // WRITTEN BESIDE THE RUN'S OWN INPUT, so a reader can see exactly what each
    // call was handed rather than reconstructing the narrowing from the whole.
    writeFileSync(join(dir, `${flow().lane}-judge-input-${st.id}-${slug}.json`), scopedText + "\n");
    const out = join(dir, `${flow().lane}-judge-${st.id}-${slug}.json`);
    // THE STATE'S OWN VALIDATOR, OVER A ONE-KEY RECORD. `validate` iterates the
    // record's keys, so a one-key record validates exactly this group's entry
    // through the shipped reader; what is added here is that the key must be THE
    // GROUP ASKED ABOUT, which the whole-record validator has no way to check
    // because there the key set IS the question.
    const validateOne = (p) => {
      const raw = readJson(p);
      const keys = raw && typeof raw === "object" && !Array.isArray(raw) ? Object.keys(raw) : null;
      if (!keys || keys.length !== 1 || keys[0] !== name) {
        fail(`${st.id} refuses this group's record: it must be the one-key object `
          + `{${JSON.stringify(name)}: {"judged": true, "subgroups": [...]}}. This ask carried exactly one `
          + `composed group, so its answer names exactly that group; the record carried `
          + `${keys ? JSON.stringify(keys) : "no key at all"}, and an envelope around the entry -- or a `
          + `second group this ask never handed over -- is not an answer to the question asked `
          + `(kogaki#1062).`);
      }
      validate(p);
    };
    return { g, name, slug, scoped, scopedText, out, validateOne };
  });

  // ---- THE RECORD ALREADY ON DISK IS TAKEN, AND IT IS VALIDATED FIRST
  // (kogaki#1073). On 2026-09-10 an advance was killed at its bound with eight of
  // eleven per-group records written, and re-answering the gate asked for all
  // eleven again -- so the retry died where the first attempt died, because the
  // remaining work was the same work plus everything already done. What makes the
  // reuse safe rather than a second trust surface is that the record goes through
  // THE SAME VALIDATOR a fresh response gets: a record that fails it is redone,
  // and `judgeAttempts` renames into this name only after validating, so a group
  // cut off mid-write has no file here to be trusted.
  const reused = new Set();
  for (const a of asks) {
    if (!existsSync(a.out)) continue;
    try {
      softRefusals(() => a.validateOne(a.out));
      reused.add(a.name);
    } catch (e) {
      // A REFUSAL MEANS REDO, and nothing else does. Anything that is not the
      // state's own refusal is a fault in this layer and is not swallowed.
      if (!(e instanceof JudgmentRefusal)) throw e;
    }
  }

  // ---- THE CALLS RUN CONCURRENTLY UNDER THE TABLE'S CAP (kogaki#1073). One
  // `judgeAttempts` per group, unchanged -- its bound, its per-attempt feedback
  // and its refusals are a property of AN ASK and are untouched by how many asks
  // are in flight. The pool returns results in the composed input's own order, so
  // every reading below is the order the sequential loop read.
  const results = await runPool(asks, cfg.concurrency, async (a) => {
    if (reused.has(a.name)) {
      // NOT A CALL, AND COUNTED AS ONE NOWHERE. `attempts: 0` is the honest
      // figure: this group's record was judged by an earlier advance, and a run
      // reporting it as an attempt of its own would say a call happened that
      // did not.
      return { ok: true, out: a.out, attempts: 0, refusals: [], lastRefusal: null, reused: true };
    }
    callsMade += 1;
    const r = await judgeAttempts(cfg, st, retries, {
      inputText: a.scopedText, input: a.scoped, out: a.out, validate: a.validateOne,
      label: ` (group ${JSON.stringify(a.name)})`,
    });
    // ---- THE RUN RECORD IS WRITTEN AFTER EVERY COMPLETED PER-GROUP RECORD
    // (kogaki#1073 item 3). The advance's own record used to be written only when
    // the advance ENDED, so an advance killed at its bound left a record saying
    // nothing had happened -- eight finished groups on disk as files and absent
    // from the one carrier a later reader consults. The checkpoint costs one
    // small write per group and is what makes the resume point readable from the
    // run's own record.
    if (r.ok && rec) {
      rec.judge_group_records = rec.judge_group_records || {};
      (rec.judge_group_records[st.id] = rec.judge_group_records[st.id] || {})[a.name] = relFromRepo(a.out);
      checkpointRun(rec);
    }
    return r;
  });

  // ---- THE BOOKKEEPING, IN THE COMPOSED INPUT'S ORDER. Read after the pool
  // rather than inside it, because the refusal below ends the run and which group
  // ends it must not depend on which call happened to finish first.
  for (let i = 0; i < asks.length; i++) {
    const { name } = asks[i];
    const r = results[i];
    attemptsTotal += r.attempts;
    refusalsTotal += r.refusals.length;
    // PREFIXED BY GROUP, because the run record's `refusals` is one flat list and
    // an operator reading eleven groups' refusals needs to know which group each
    // one is about.
    for (const text of r.refusals) allRefusals.push(`group ${JSON.stringify(name)}: ${text}`);
    if (r.refusals.length) lastRefusal = `group ${JSON.stringify(name)}: ${r.refusals[r.refusals.length - 1]}`;
    // `repaired` IS WRITTEN ONLY WHERE THERE WAS SOMETHING TO REPAIR (PR #1065
    // round 1). On the whole-input arm the whole entry is written only when
    // `refusals.length`, so `repaired` there means *was refused and then
    // repaired* -- and a per-group row saying `repaired: true` of a group nothing
    // ever refused makes the flag whose stated job is keeping those two arms
    // apart stop doing it across the two carriers.
    perGroup[name] = { attempts: r.attempts, retries_declared: retries, refusals: r.refusals };
    if (r.reused) perGroup[name].reused = true;
    if (r.refusals.length) perGroup[name].repaired = r.ok;
    if (!r.ok) {
      // THE PARTIAL IS ON THE RECORD BEFORE THE REFUSAL, for the reason the
      // whole-input arm writes its own: `fail()` persists the pending record, and
      // a reader coming back to the run needs to see which groups were judged
      // before the one that spent its bound.
      if (rec) {
        rec.judgment_refusals = rec.judgment_refusals || {};
        rec.judgment_refusals[st.id] = {
          attempts: attemptsTotal, retries_declared: retries, refusal: lastRefusal,
          refusals: allRefusals, repaired: false, groups: perGroup, judged_before: [...judged],
        };
      }
      if (r.timeout) throw new JudgeTimeout(st.id, r.timeout, r.lastRefusal);
      // A SPENT BOUND STOPS THE STATE, NOT THE RUN (kogaki#1172 item 3), on the
      // same ground the whole-input arm above takes: the groups already judged
      // are validated records on disk, and the reuse logic at the top of this
      // function picks them back up on the retry the owner's click re-fires,
      // so the state re-enters costing only the groups that had not judged yet.
      throw new JudgmentExhausted(st.id,
        `${st.id}: the judge's record for group ${JSON.stringify(name)} was refused on all ${r.attempts} `
        + `attempt(s) (${retries} re-ask(s) licensed, the count the workflow table declares for this state). `
        + `${judged.length} of ${groups.length} group(s) were judged before it`
        + `${judged.length ? `: ${judged.join(", ")}` : ""}. The last refusal, verbatim: ${r.lastRefusal}`);
    }
    assembled[name] = readJson(r.out)[name];
    judged.push(name);
  }
  const out = join(dir, `${flow().lane}-judge-${st.id}.json`);
  writeFileSync(out, JSON.stringify(assembled, null, 2) + "\n");
  // AND THE WHOLE RECORD'S REFUSALS RUN OVER THE ASSEMBLY. The per-group calls
  // validated their own entries; this is the record the rest of the run reads,
  // and it is validated as a record rather than trusted because its parts were.
  validate(out);
  recordJudgeInvocation(st.id, {
    state: st.id,
    command: cfg.command,
    binary_version: cfg.binaryVersion,
    model: cfg.model,
    stubbed: cfg.stubbed,
    // ONE PER GROUP, and named, because this is the figure the advance bound is
    // derived from and a reader checking that derivation needs the count the run
    // actually made.
    //
    // THE COUNT IS WHAT THIS ADVANCE ASKED, NOT HOW MANY GROUPS THERE ARE
    // (kogaki#1073). With per-group records reused from an earlier advance the
    // two figures come apart, and `groups.length` would report calls this run
    // never made -- the figure the advance's bound is derived from saying the
    // opposite of what the run did. `groups` beside it is still the whole set.
    calls: callsMade,
    groups_declared: groups.length,
    reused_records: reused.size,
    concurrency: cfg.concurrency,
    per_group: true,
    attempts: attemptsTotal,
    retries_declared: retries,
    refusals_repaired: refusalsTotal,
    response_sha: createHash("sha256").update(readFileSync(out)).digest("hex").slice(0, 16),
    at: new Date().toISOString(),
  });
  // AND ON THE RUN RECORD, because that is the carrier that outlives the process
  // (kogaki#1062). `recordJudgeInvocation` fills an in-memory map the subdivision
  // display reads through `judgmentProvenance`; the CALL COUNT is the figure
  // `.claude/hooks/advance-terrain.py`'s bound is derived from, and a reader
  // checking that derivation comes back to a finished run rather than standing
  // inside the process that made the calls.
  if (rec) {
    rec.judge_calls = rec.judge_calls || {};
    rec.judge_calls[st.id] = {
      per_group: true,
      command: cfg.command,
      binary_version: cfg.binaryVersion,
      calls: callsMade,
      groups_declared: groups.length,
      reused_records: reused.size,
      concurrency: cfg.concurrency,
      groups: [...judged],
      attempts: attemptsTotal,
      retries_declared: retries,
      refusals_repaired: refusalsTotal,
    };
  }
  if (rec && refusalsTotal) {
    rec.judgment_refusals = rec.judgment_refusals || {};
    rec.judgment_refusals[st.id] = {
      attempts: attemptsTotal, retries_declared: retries, refusal: lastRefusal,
      refusals: allRefusals, repaired: true, groups: perGroup,
    };
  }
  return out;
}

// The one place a judgment state decides between the record it was HANDED and
// the one it ASKS FOR. An explicit `--<flag>` still wins — that is the fixture
// path, the second-repository path and the owner's own, and it is unchanged —
// and its absence is no longer a refusal but a call.
// EXPORTED AT kogaki#1108, for the second flow's judgment states. It is the one
// place a judgment record can come from — an explicit flag, or the executor's
// own call to the pinned judge — so a flow that composed its own would be the
// second producer `the typed judgment points` forbids.
export async function judgedRecordPath(rec, st, table, args, flag, composeInput, validate) {
  if (args[flag] !== undefined) {
    const p = String(args[flag]);
    validate(p);
    return p;
  }
  return await invokeJudge(table, st, composeInput(), rec._dir, validate, rec);
}

// ---- COMPOSE-INPUT --------------------------------------------------------
// compose-input — the BOUNDED input the claim and subdivision composers read (kogaki#163 lever 3;
// SPEC.md, the rendering rule: "Tag-scoped and bounded — one shard pair per viewed tag").
// The bound is structural: `material` is keyed by member id and `groups` carry ids only, so a
// member in five groups appears ONCE; never add per-group copies of material.
// The fetcher is INJECTED so a check can count served-material reads; the accounting block below
// is an operator report and no check reads it (gloss/lessons/testing.md:131@12ba65dd).
// It composes and judges NOTHING: claim wording stays the composer's, coherence the judge's.
export const COMPOSITION_INPUT_BOUND =
  "one tag-scoped served Gloss shard pair, fetched once for the run (SPEC.md, the rendering rule)";

export function composeInput(record, tag, groups, fetchShard) {
  const members = record.candidates.filter((c) => (c.tags || []).includes(tag));
  // The journey shard is fetched only where a member carries a Journey — the
  // same conditional `report` already applies. An unconditional second fetch
  // would be a read taken for material no member has.
  const anyJourney = members.some((c) => c.journey);
  const lessonBodies = fetchShard("lessons");
  const journeyBodies = anyJourney ? fetchShard("journeys") : new Map();

  let abnormal = 0;
  const material = [...members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => {
      const lg = lessonBodies.get(c.slug);
      const jg = c.journey ? journeyBodies.get(c.slug) : null;
      if (!lg) abnormal++;
      if (c.journey && !jg) abnormal++;
      return {
        id: c.id,
        cite: c.cite || null,
        // Untruncated, exactly as the Full Report serves it: the composer judging a
        // SubGroupClaim's coherence against its parent's is the reader semantic subdivision
        // addresses, and a headline-only input would decide that verdict by
        // what the bound withheld. A missing rendering is MARKED
        // and never substituted (the rendering rule), at this layer as at every other.
        gloss: lg ? lg.body : NO_GLOSS_BODY,
        gloss_cite: lg ? lg.cite : null,
        journey_gloss: c.journey ? (jg ? jg.body : NO_GLOSS_BODY) : null,
        journey_cite: c.journey && jg ? jg.cite : null,
      };
    });

  const placements = groups.reduce((n, g) => n + g.members.length, 0);
  return {
    kind: "composition-input",
    tag,
    pin: record.pin,
    // THE COMPOSITION PIN (the open-questions section, v10, kogaki#212). The claim composer copies
    // this into its claims artifact; `cotags` refuses claims whose members are not a SUBSET of it.
    // It carries the served MEMBER SET, not a digest: a digest supports equality, not subset, and
    // cannot name the offending members the refusal must name.
    // (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:86`).
    composition_pin: {
      tag,
      pin: record.pin,
      groups: Object.fromEntries(groups.map((g) => [g.name, [...g.members]])),
    },
    bound: COMPOSITION_INPUT_BOUND,
    // ids only. See the structural note above: this is the half that makes a
    // per-group re-read unwritable rather than merely discouraged.
    groups: groups.map((g) => ({ name: g.name, cotag: g.cotag, members: g.members })),
    material,
    // For the OPERATOR, not for the check. A self-reported number is not
    // evidence of the property it reports.
    accounting: {
      shard_fetches: 1 + (anyJourney ? 1 : 0),
      candidates: material.length,
      placements,
      abnormal,
    },
  };
}

// A JUDGMENT STATE'S BOUND, SPENT (kogaki#1172, item 3).
// The state loop catches this, writes the `terrain-judgment-retry` gate declaration and
// stops as a `wait` does; the state is NOT marked complete, so "retry" re-enters it and
// "abandon" clears the open-run pointer.
// THROWN, never returned: the throw site is many frames below the loop that catches it.
export class JudgmentExhausted extends Error {
  constructor(stateId, message) {
    super(message);
    this.stateId = stateId;
  }
}

// A JUDGE CALL THAT OUTLIVED ITS `timeout_s` (kogaki#1300).
// A system failure, not a refusal: the state loop records `failure` on the run record,
// prints a report, clears the open-run pointer and exits non-zero. No gate, no retry.
// `completed` is untouched, so `run --run-dir <dir>` re-enters at this state.
export class JudgeTimeout extends Error {
  constructor(stateId, timeout, message) {
    super(message);
    this.stateId = stateId;
    this.boundS = timeout.bound_s;
    this.measuredS = timeout.measured_s;
  }
}
