// The workflow engine — the gate call, the question-shape check, the open-gate pointer, and the
// gate declaration with its capture.
// Shared by every command that runs a workflow table, so it lives outside every command
// directory (kogaki#1259, kogaki#1302).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { GATES_REGISTRY, GATE_SCHEMA, OPENED_BY, fail, flow, readJson } from "./run-record.mjs";

// ---- CLAIM / ADOPT --------------------------------------------------------
// claim / adopt (SPEC.md, GroupClaim-first rendering). A claim is PINNED to its member set:
// the record carries the member ids and their pins; the claim text arrives as an argument.
// The claim re-offer wait is DELETED with no stub (kogaki#1030 item 4; SPEC-terrain).
// The one place a run declaration is composed; callers are `GATE_WORK`'s option composers
// at the wait that owes it — nothing outside a run reaches it. Re-offers route through
// manifest item 4's carrier, never an affordance of Terrain's own.
export function emitGateDeclaration(dir, gateId, dynamicOptions, extra = {}) {
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  if (!registered) fail(`${gateId} is not declared in src/gate-registry.json — an unregistered gate is the uncovered-by-default shape`);
  const seen = new Set(dynamicOptions.map((o) => o.id));
  const declaration = {
    ...registered,
    ...extra,
    options: [...dynamicOptions, ...registered.options.filter((o) => !seen.has(o.id))],
    // WHICH OPTIONS THIS RUN COMPOSED, RECORDED RATHER THAN INFERRED (PR #1119
    // round 1). A dynamic option WINS over a standing one of the same id — that
    // is what the `seen` filter above does — so a repair that merged the
    // registry back over the declaration would invert this precedence at exactly
    // the id collision this line anticipates, and rewrite a re-entered run to an
    // option label the run never composed. The refresh reads this list and skips
    // what it names; a declaration written before this field existed carries
    // none, and the refresh says so rather than guessing.
    run_composed_option_ids: dynamicOptions.map((o) => o.id),
    declared_at: new Date().toISOString(),
    run_declaration: true,
    // THE INSTANCE KEY, AND IT IS A NONCE RATHER THAN A DIGEST (kogaki#890).
    // The answer this declaration will be joined to is written by a harness
    // hook that sees a question and an option set, and nothing else — so the
    // join key has to name THIS RAISING of the gate and not what the gate
    // happens to say. A key derived from the question, the option set, the
    // run directory or the inputs is shared by every sibling that looks the
    // same, which separates two runs exactly when they differ and fails
    // exactly when they are alike; two entries over one settled input compose
    // identical options and therefore an identical digest. Minted per raising,
    // never per gate and never per directory.
    gate_instance_id: randomUUID(),
  };
  delete declaration.dynamic_options;
  // The sibling filename is a JOIN KEY: check-gate-carrier resolves this file
  // beside a capture to decide what the capture's options_offered is compared
  // against (SPEC-gate-carrier, what `options_offered` is judged against). It reads the suffix from the schema, so
  // this writer reads it from the same place — with two copies, a rename on
  // one side makes the check silently fall back to the registry comparison,
  // which is the pre-#818 behaviour it would then report as a pass (kogaki#837).
  const out = join(dir, `${gateId}${GATE_SCHEMA.capture.run_declaration_suffix}`);
  // THE CALL IS COMPOSED HERE, BESIDE THE DECLARATION (kogaki#1028 item 1).
  // AND IT IS COMPOSED BEFORE ANYTHING IS WRITTEN (kogaki#1090). The byte bound
  // below has to be able to leave NO artifact behind — `gate-call.json`, the
  // pointer, and the declaration that names them — and a composer called after
  // the declaration write would have to unwrite one. Ordering is what makes
  // "no gate opens" a property of where this call stands.
  const call = composeGateCall(declaration);
  if (call.over_bound) fail(call.over_bound);
  // BESIDE THE BYTE BOUND, AND FOR ITS REASON (kogaki#1118): both are refusals
  // by the CHANNEL the call is delivered on, and both have to be able to leave
  // no artifact behind, so both stand above every write in this function.
  if (call.refused) fail(call.refused);
  writeFileSync(out, JSON.stringify(declaration, null, 2) + "\n");
  let callPath = null;
  if (call.tool_input) {
    callPath = join(dir, `${gateId}${GATE_CALL_SUFFIX}`);
    writeFileSync(callPath, JSON.stringify(call.tool_input, null, 2) + "\n");
  }
  // THE SIDECAR IS WRITTEN HERE, BESIDE THE CALL (kogaki#1153). This is the
  // moment `gate-call.json` exists and the moment the session id this raising
  // belongs to is known (`sessionId()`, read the same way `writeOpenGatePointer`
  // reads it below) -- and it is BEFORE `writeOpenGatePointer` opens the gate,
  // so the write lands before the interval that would deny it starts.
  writeGateDeclarationSidecar(sessionId());
  writeOpenGatePointer(dir, declaration, out, callPath, call.unavailable || null);
  return out;
}

// ---- THE GATE CALL (kogaki#1028 item 1). ----------------------------------
// The exact `AskUserQuestion` `tool_input` the session must send, written beside the
// declaration; `.claude/hooks/gate-open-terrain-gate.py` admits only a byte-equal call.
// Any reading (`GATE_CALL_READING_KEYS`) goes in the question text above the question line
// (kogaki#856). The free-text second option is transcribed from `free_text_offered`.
// consulted: product-lab@0f31c3bebdd65a126dd5c2928b86c2a212bba5c2 LESSONS.md:42
// No valid payload (no option, or >4): write no `gate-call.json`, carry
// `gate_call_unavailable` on the pointer — never wedge the run.
// consulted: product-lab@0f31c3bebdd65a126dd5c2928b86c2a212bba5c2 LESSONS.md:44
export const GATE_CALL_SUFFIX = ".gate-call.json";

// THE JUDGMENT-RETRY GATE'S ID (kogaki#1172 item 3), registered in
// `src/gate-registry.json`. It is raised from the state loop rather than from
// a `wait` state's own option composer, because it can be raised at ANY
// judgment state, naming itself in `extra.judgment_state`, so there is no one
// table row to bind an option composer to.
export const JUDGMENT_RETRY_GATE_ID = "terrain-judgment-retry";
// THE READER-PATH JOB'S ARM (kogaki#1193), raised by `job await` -- never from
// inside this loop, since nothing here ever finds this job in a non-`done`
// terminal state without a `job await` having classified it first.
export const READER_PATH_JOB_GATE_ID = "brief-reader-path-job";

// The harness's own bound on an AskUserQuestion payload. Read from its schema,
// restated here because there is no module to import it from across the seam --
// the same two-implementations-of-one-constant trade `option_set_digest` makes,
// and `checks/check-open-gate-exclusivity.sh` is what compares them.
const ASK_MIN_OPTIONS = 2;
const ASK_MAX_OPTIONS = 4;

// ONE constant, never a per-gate wording; a gate wanting its own words declares
// `free_text_label` in `src/gate-registry.json`.
// THE READING KEYS, one enumeration the composer reads (kogaki#1087): the first key found
// on a declaration is rendered above the question line. Add a key here, never a branch.
// Members added at PR #1109 and kogaki#1172 (`judgment_refusal`, spread from `extra`).
const GATE_CALL_READING_KEYS = ["tag_listing", "groups_listing", "settled_set_provenance", "judgment_refusal", "reader_path_unit_refusal", "excluded_candidates"];

// THE DECLARED BYTE BOUND (kogaki#1090). Read from `src/gate-registry.json`
// rather than written here: the number has a measured ground, the ground is
// prose, and a constant in this file would put the number one place and its
// argument another. Its rationale — what is measured, why, and where 8192 comes
// from — is `gate_call_bound_note` beside it, cited here and restated nowhere.
//
// AN ABSENT OR MALFORMED BOUND IS A REFUSAL AT LOAD, never a default. A bound
// that silently falls back to Infinity is the state this issue was filed from,
// reintroduced as a fallback: PR #1088's acceptance made the ID payload as long
// as the grouping and no bound was declared on it at all.
const GATE_CALL_MAX_BYTES = (() => {
  const declared = GATES_REGISTRY.gate_call_max_bytes;
  if (!Number.isInteger(declared) || declared <= 0) {
    throw new Error(
      "src/gate-registry.json declares no usable `gate_call_max_bytes` — a composed gate call is delivered "
      + "on a channel with a cap (kogaki#1081, kogaki#1090) and an undeclared bound is the state that wedged "
      + "the 2026-09-11 run, not a permissive one");
  }
  return declared;
})();

// The bytes the WRITER writes, not the bytes of some other serialisation. See
// `gate_call_bound_note`: the file is what the advance hook relays and what the
// PreToolUse equality check compares against.
function gateCallBytes(toolInput) {
  return Buffer.byteLength(JSON.stringify(toolInput, null, 2) + "\n", "utf8");
}

const GATE_CALL_FREE_TEXT_LABEL = "Answer in your own words instead";
const GATE_CALL_FREE_TEXT_DESCRIPTION =
  "This gate offers free text. Choose this row and type the answer; the harness "
  + "records what you type, and the executor reads it from the capture.";

// The chip label, at most 12 characters, DERIVED rather than composed: the last
// hyphen-separated segment of the gate id. `terrain-tag-selection` -> `selection`.
// A gate may override it with `header` in the registry.
function gateCallHeader(declaration) {
  const declared = declaration.header;
  if (typeof declared === "string" && declared.trim()) return declared.trim().slice(0, 12);
  const segments = String(declaration.id || "gate").split("-").filter(Boolean);
  return (segments[segments.length - 1] || "gate").slice(0, 12);
}

// ---- THE SHARED QUESTION-SHAPE CHECK, APPLIED AT COMPOSE (kogaki#1118). ----
// Invoke `issue-sync lint-question` (claude-toolkit#1077); never restate its rule here.
// consulted: product-lab@3b3802d245287f568fd93a574c8d422b277e69c8 LESSONS.md:68
// ONLY EXIT 1 REFUSES. An absent command, exit 2 or an older tool ADMIT — it is an
// external dependency (`src/deps-registry.json`; SPEC-external-deps "Report, never gate").
const QUESTION_SHAPE_VERB = "lint-question";

// The command's location is MACHINE-LOCAL and the env var is the seam a fixture
// drives; the default is the install path `issue-sync install-hooks` writes,
// named the same way `src/deps-registry.json` already names `~/.claude/hooks/
// lint-pr-merge.py` -- a committed name for a machine-local artifact, which is
// what an external-dependency declaration is.
function questionShapeCommand() {
  return process.env.KOGAKI_QUESTION_SHAPE_CMD
    || join(homedir(), ".claude", "tools", "issue-sync");
}

// null when the payload is admissible OR when the rule could not be applied;
// the refusal text VERBATIM when it was applied and refused. The command's own
// words are carried rather than paraphrased -- a paraphrase is the second copy
// this whole arrangement exists to refuse.
// THE WAIT IS BOUNDED (PR #1119 round 1). This call now stands on the path of
// every gate composition in both programs, so a command that HANGS rather than
// exiting takes the whole run with it — a wedge in the class this issue closes,
// reached through the dependency instead of through the label. An exit-code
// policy careful about every answer the command can give and silent about its
// giving none is not a policy. A timeout admits, like every other
// could-not-apply arm.
const QUESTION_SHAPE_TIMEOUT_MS = 5000;

function runQuestionShape(cmd, payload) {
  try {
    return spawnSync(cmd, [QUESTION_SHAPE_VERB], {
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: QUESTION_SHAPE_TIMEOUT_MS,
    });
  } catch {
    return null;
  }
}

// Probe that the verb exists before believing its exit 1 (PR #1119; claude-toolkit#1077):
// an older `issue-sync` exits 1 on an unknown subcommand. Same probe as
// `checks/check-gate-call-shape.sh` (empty question set => exit 0); once per process.
let questionShapeSupported = null;
function questionShapeVerbSupported(cmd) {
  if (questionShapeSupported && questionShapeSupported.cmd === cmd) {
    return questionShapeSupported.ok;
  }
  const probe = runQuestionShape(cmd, { questions: [] });
  const ok = !!probe && !probe.error && probe.status === 0;
  questionShapeSupported = { cmd, ok };
  return ok;
}

function questionShapeRefusal(toolInput) {
  const cmd = questionShapeCommand();
  if (!questionShapeVerbSupported(cmd)) return null;
  const res = runQuestionShape(cmd, toolInput);
  if (!res || res.error || res.status !== 1) return null;
  const text = `${res.stderr || ""}${res.stdout || ""}`.trim();
  return text || `${cmd} ${QUESTION_SHAPE_VERB} refused this gate call and printed nothing`;
}

function composeGateCall(declaration) {
  const declared = Array.isArray(declaration.options) ? declaration.options : [];
  // THE ID IS A JOIN KEY AND NEVER CONTENT, WHERE THE GATE SAYS SO (kogaki#1126).
  // Only a gate declaring `option_descriptions_required` (src/gate-registry.json) refuses an
  // undescribed option as `unavailable`; every other gate renders exactly as before.
  const owed = declaration.option_descriptions_required === true;
  const undescribed = owed
    ? declared.filter((o) => typeof o.description !== "string" || o.description.trim() === "")
    : [];
  if (undescribed.length) {
    return { unavailable: `${declaration.id} declares \`option_descriptions_required\`, and `
      + `${undescribed.length} of its option(s) carry no description: `
      + `${undescribed.map((o) => JSON.stringify(o.id)).join(", ")}. An option's id is the join key the `
      + `owner's answer resolves through and is never shown as content, so no payload is written and `
      + `nothing here invents a sentence about an option (kogaki#1126). Compose the description where the `
      + `option is composed, or give the standing option one in src/gate-registry.json.` };
  }
  const options = declared.map((o) => ({
    label: String(o.label),
    // The description is the option's OWN. Where the gate declares none is owed
    // and an option carries none, the id is shown -- the pre-#1126 default,
    // narrowed to the gates that have not declared the obligation above.
    description: String(o.description || o.id || ""),
  }));
  if (options.length === 0) {
    return { unavailable: `${declaration.id} declares no option, and a question with no arm is not a gate — the free-text row alone would leave the owner one way to answer where the declaration promises none` };
  }
  if (options.length < ASK_MIN_OPTIONS) {
    if (!declaration.free_text_offered) {
      return { unavailable: `${declaration.id} declares ${options.length} option(s) and no free text, and AskUserQuestion admits at least ${ASK_MIN_OPTIONS} — there is no row to compose from, so none is invented` };
    }
    options.push({
      label: String(declaration.free_text_label || GATE_CALL_FREE_TEXT_LABEL),
      description: GATE_CALL_FREE_TEXT_DESCRIPTION,
    });
  }
  if (options.length > ASK_MAX_OPTIONS) {
    return { unavailable: `${declaration.id} composes ${options.length} options and AskUserQuestion admits at most ${ASK_MAX_OPTIONS} — no payload is written, and nothing here drops an option the declaration offered` };
  }
  const reading = GATE_CALL_READING_KEYS
    .map((k) => (typeof declaration[k] === "string" && declaration[k].trim() ? declaration[k] : null))
    .find(Boolean) || null;
  const question = reading
    ? `${reading}\n\n${String(declaration.question)}`
    : String(declaration.question);
  const tool_input = {
    questions: [{
      question,
      header: gateCallHeader(declaration),
      multiSelect: false,
      options,
    }],
  };
  // THE BOUND, CHECKED OVER THE WHOLE COMPOSED CALL (kogaki#1090). Over the
  // reading alone it would miss a question or an option set that grew, and the
  // channel does not care which field the bytes came from.
  const bytes = gateCallBytes(tool_input);
  if (bytes > GATE_CALL_MAX_BYTES) {
    return {
      bytes,
      // A SEPARATE ARM FROM `unavailable`, and the separation is the point.
      // `unavailable` writes an open-gate pointer and leaves the gate
      // renderable from the declaration's own options; there is no smaller
      // rendering of an oversized payload, so this writes nothing and ends the
      // run. A refusal at compose is loud; a truncated payload at render is the
      // silent failure the 2026-09-11 run showed.
      over_bound: `${declaration.id} composes a ${bytes}-byte gate call and `
        + `src/gate-registry.json declares a bound of ${GATE_CALL_MAX_BYTES} bytes. `
        + "No declaration, no gate-call.json and no open-gate pointer were written, and no gate is open. "
        + "The call is delivered on a PostToolUse hook's additionalContext, which truncates above the "
        + "bound, and the open-gate interval refuses the Read that would fetch the remainder — so an "
        + "oversized call reaches the owner as a fragment nothing in the session can complete "
        + "(kogaki#1028, kogaki#1081, kogaki#1090). The reading this gate carries belongs in its written "
        + "artifact, which the question names, rather than inside the question text.",
    };
  }
  // THE SHAPE CHECK IS THE LAST THING COMPOSE DOES, and it is checked over the
  // WHOLE composed call rather than over the declaration's labels: the composer
  // adds the free-text row and folds the reading into the question text, so a
  // check over the declaration would judge a payload that is not the one sent.
  // A REFUSAL IS ITS OWN ARM, beside `over_bound` and never folded into
  // `unavailable`: `unavailable` writes a pointer and leaves the gate
  // renderable from the declaration's options, which for a label the channel
  // refuses would hand the session the very rendering that deadlocked it.
  const refused = questionShapeRefusal(tool_input);
  if (refused) {
    return {
      bytes,
      refused: `${declaration.id} composes a gate call the shared question-shape check refuses, `
        + `and ${QUESTION_SHAPE_VERB} is the one home of that rule (claude-toolkit#1077, kogaki#1118). `
        + "No declaration, no gate-call.json and no open-gate pointer were written, and no gate is open — "
        + "the refusal arrives here rather than as a session with an unshowable question open and no "
        + "admissible tool. The command's own refusal follows verbatim:\n\n"
        + refused,
    };
  }
  return { tool_input, bytes };
}

// ---- THE OPEN-GATE POINTER (kogaki#890). ----------------------------------
// One file per OUTSTANDING raising, read by `.claude/hooks/write-gate-capture.py`.
// It carries no answer and grants nothing: the executor reads the CAPTURE.
// RE-ENTRY RE-CHECKS A WRITTEN GATE CALL (kogaki#1118 acceptance 4): refresh only the
// STANDING options (by id against `src/gate-registry.json`); a failing run-time option refuses
// with the command's text. Rewrite the declaration with the call; never remint
// `gate_instance_id`.
export function refreshWrittenGateCall(dir, gateId) {
  const declPath = join(dir, `${gateId}${GATE_SCHEMA.capture.run_declaration_suffix}`);
  const callPath = join(dir, `${gateId}${GATE_CALL_SUFFIX}`);
  if (!existsSync(declPath) || !existsSync(callPath)) return null;
  const written = JSON.parse(readFileSync(callPath, "utf8"));
  const refused = questionShapeRefusal(written);
  if (!refused) return null;

  const declaration = JSON.parse(readFileSync(declPath, "utf8"));
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  const standing = new Map((registered ? registered.options : []).map((o) => [o.id, o]));
  // THE RUN'S OWN OPTIONS ARE NOT REFRESHED, and the list is read rather than
  // inferred (PR #1119 round 1). A declaration predating the field carries none,
  // which is the pre-repair case this function exists for and where no collision
  // can have been recorded either way; the note below states which reading was
  // used rather than leaving it to be assumed.
  const runComposed = new Set(declaration.run_composed_option_ids || []);
  const legacy = !Array.isArray(declaration.run_composed_option_ids);
  const refreshed = {
    ...declaration,
    options: (declaration.options || []).map((o) => (
      standing.has(o.id) && !runComposed.has(o.id) ? { ...o, ...standing.get(o.id) } : o)),
  };
  const recomposed = composeGateCall(refreshed);
  if (!recomposed.tool_input) {
    // THE DIAGNOSIS IS THE ARM THAT WAS TAKEN, NOT A GUESS ABOUT IT (PR #1119
    // round 1). This branch is reached on three different states and the run-time
    // option is only one of them; naming that one unconditionally printed the
    // ORIGINAL refusal under a cause it had not established.
    const why = recomposed.refused
      ? "the refusal survives the refresh, so the refused label is a run-time option composed from "
        + "material a re-entry does not hold and there is nothing here to repair"
      : recomposed.over_bound
        ? "the refreshed call is over the declared byte bound"
        : "the refreshed declaration composes no call at all";
    fail(`${gateId} has a written gate call the shared question-shape check refuses, and refreshing its `
      + `standing options from src/gate-registry.json does not clear it: ${why}. No payload is printed. `
      + "Start the run again rather than re-entering this one (kogaki#1118). What the refresh met "
      + "follows verbatim:\n\n"
      + (recomposed.refused || recomposed.over_bound || recomposed.unavailable || refused));
  }
  writeFileSync(declPath, JSON.stringify(refreshed, null, 2) + "\n");
  writeFileSync(callPath, JSON.stringify(recomposed.tool_input, null, 2) + "\n");
  return { refused, declPath, callPath, legacy };
}

export function openGateDir() {
  return process.env.KOGAKI_OPEN_GATES || join(homedir(), ".claude", "kogaki-open-gates");
}

// THE GATE-DECLARATION SIDECAR (kogaki#1153). `lint-gate-declaration.py` reads it as the
// PRIMARY carrier (v68, claude-toolkit#774); it must be written here, at compose, before the
// open-gate pointer exists. `GATE_DECLARATION_SIDECAR_DIR` mirrors the hook's override,
// copied because a Python hook and a Node executor share no module.
function gateDeclarationSidecarDir() {
  return process.env.GATE_DECLARATION_SIDECAR_DIR
    || join(homedir(), ".claude", "gate-declarations");
}

// Every composed gate has exactly ONE question, so the sidecar keys index 1, and the
// declaration is always `mechanical`.
// A write failure is NOT fatal (kogaki#1153; cf. kogaki#1090): the gate still opens and the
// transcript scan answers for it (the pre-#1153 race).
function writeGateDeclarationSidecar(sessionId) {
  if (!sessionId) return;
  const dir = gateDeclarationSidecarDir();
  const path = join(dir, `${sessionId}.json`);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify({ 1: "gate-declaration (question 1):\ngate: mechanical" }, null, 2) + "\n");
  } catch { /* the transcript scan is the fallback carrier this write is racing to make unnecessary, not the only one */ }
}

// THE POINTER NAMES ITS SESSION (kogaki#1028 item 5; PR #1043).
// A missing session id is a case, not an error: `write-gate-capture.py` falls back to
// question-text matching; `gate-open-terrain-gate.py` gates nothing on a null-session pointer.
// Both fail toward the recoverable side; neither treats absence as a wildcard.
function sessionId() {
  // `CLAUDE_CODE_SESSION_ID` is what Claude Code exports into a Bash tool call
  // and into a hook's process, which are the two routes the executor is started
  // by (the skill's `!` line, and `.claude/hooks/advance-terrain.py`). A run
  // started any other way carries null, and the readers above say what that
  // means rather than leaving it to be inferred.
  return process.env.CLAUDE_CODE_SESSION_ID || null;
}

// The question text the session actually sends for this gate: the composed
// call's, where one was written, else the declaration's own.
function sentQuestion(declaration, callPath) {
  if (callPath && existsSync(callPath)) {
    try {
      const q = readJson(callPath);
      const text = q && q.questions && q.questions[0] && q.questions[0].question;
      if (typeof text === "string" && text) return text;
    } catch { /* an unreadable call is the composer's fault and is reported at its write */ }
  }
  return declaration.question;
}

function writeOpenGatePointer(dir, declaration, declPath, callPath = null, callUnavailable = null) {
  const gd = openGateDir();
  mkdirSync(gd, { recursive: true });
  const capPath = join(dir, `${flow().lane}${GATE_SCHEMA.capture.suffix}`);
  // A RE-RAISING SUPERSEDES ITS OWN PREVIOUS POINTER (PR #917 round 1, finding
  // 3). Re-rendering a gate after a refusal is the ordinary recovery this file
  // tells the owner to perform, and each raising mints a fresh instance id —
  // so without this the recovery itself accumulates orphans, one per attempt,
  // in the directory whose ambiguity arm then refuses to write anything. The
  // superseded pointer is this run's own, matched on the capture it names and
  // the gate it raises, so nothing here reaches another run's.
  for (const f of readdirSync(gd)) {
    if (!f.endsWith(".json")) continue;
    try {
      const prev = readJson(join(gd, f));
      if (prev.gate_id === declaration.id && prev.capture_path === resolve(capPath)) {
        rmSync(join(gd, f), { force: true });
      }
    } catch { /* an unreadable pointer is the hook's to report, not this writer's to repair */ }
  }
  writeFileSync(join(gd, `${declaration.gate_instance_id}.json`), JSON.stringify({
    gate_instance_id: declaration.gate_instance_id,
    gate_id: declaration.id,
    // THE QUESTION AS SENT, never the bare declaration's (PR #1048 round 1,
    // finding 1). `write-gate-capture.py` joins the harness's `answers` key to
    // this field by exact equality, and the key is the question text the
    // session sent -- which, where the composed call prepends `tag_listing`,
    // differs from `declaration.question` by the whole table. A pointer
    // carrying the bare text matches nothing, no row is written, and under the
    // exclusivity hook the session then has no admissible act at all.
    question: sentQuestion(declaration, callPath),
    declaration_path: resolve(declPath),
    capture_path: resolve(capPath),
    // The byte-fixed call the session must send, or the stated reason there is
    // none. Exactly one of the two is non-null, always.
    gate_call_path: callPath ? resolve(callPath) : null,
    gate_call_unavailable: callUnavailable,
    session_id: sessionId(),
    // WHICH EXECUTOR OPENED THIS GATE (kogaki#1051). `skill-expansion` is the
    // start act, and it is the one kind for which no model turn can yet have
    // run -- see `OPENED_BY`. `hook` means a turn ran to produce the tool call
    // the hook fired on. `null` is a run started outside either route, and the
    // reader treats it as the ordinary pointer it was before this field.
    opened_by: OPENED_BY,
    opened_at: declaration.declared_at,
  }, null, 2) + "\n");
}

// A RE-PRINT THAT FINDS NO LIVE POINTER WRITES ONE AGAIN (kogaki#1313). The
// raising that wrote the declaration and the call also wrote a pointer with
// this instance id; where a session abandoned the gate before capturing it,
// that pointer moved to `abandoned/` and the instance has no live one. The
// declaration and the call are both still on disk, so this writes the
// pointer again from them, with the same instance id — the capture hook then
// joins the owner's later answer to the declaration already on the record,
// rather than leaving a re-raised gate with no admissible act at all.
export function restoreOpenGatePointer(dir, gateId) {
  const declPath = join(dir, `${gateId}${GATE_SCHEMA.capture.run_declaration_suffix}`);
  if (!existsSync(declPath)) return;
  const declaration = readJson(declPath);
  if (!declaration.gate_instance_id) return;
  if (existsSync(join(openGateDir(), `${declaration.gate_instance_id}.json`))) return;
  const callPath = join(dir, `${gateId}${GATE_CALL_SUFFIX}`);
  writeOpenGatePointer(dir, declaration, declPath, existsSync(callPath) ? callPath : null, null);
}

// ---- THE GATE DECLARATION AND ITS CAPTURE ---------------------------------
// The per-run declaration carries the RUN-COMPUTED options; the registry declares the CLASS.
// Records: kogaki#625 item 1, kogaki#890.
// Only the executor composes the declaration and admits the capture, at the wait that owes it.
// The answer is READ, never argued: `.claude/hooks/write-gate-capture.py` writes the row from
// the harness payload; this function is its reader.
// Every refusal below leaves the wait outstanding; recovery is to render the gate again.
export function readCapturedAnswer(dir, decl, payloadToolUseId = null) {
  // THE CAPTURE FILE IS THE FLOW'S (kogaki#1108). It was `terrain<suffix>`
  // literally; the prefix is the lane, and the writer below reads it from the
  // same place, so the two cannot name different files.
  const capPath = join(dir, `${flow().lane}${GATE_SCHEMA.capture.suffix}`);
  const instance = decl.gate_instance_id;
  if (!instance) {
    fail(`the declaration for gate ${decl.id} carries no gate_instance_id, so no captured answer can be joined to it. `
      + `It was written before kogaki#890 — re-enter the wait to raise the gate again, which mints one.`);
  }
  if (!existsSync(capPath)) {
    fail(noAnswerRefusal(decl, capPath, "no capture file exists beside this run"));
  }
  const doc = readJson(capPath);
  const rows = Array.isArray(doc.rows) ? doc.rows : [];
  // THE JOIN IS ON THE INSTANCE ID AND ON NOTHING ELSE. Not on the gate id,
  // which every raising of this gate shares; not on the question or the option
  // set, which two runs over one input share exactly.
  const mine = rows.filter((r) => r && r.gate_instance_id === instance);
  if (mine.length === 0) {
    fail(noAnswerRefusal(decl, capPath,
      `the capture holds ${rows.length} row(s) and none carries this raising's instance id ${JSON.stringify(instance)}`));
  }
  // THE ADVANCE IS THE ANSWER'S OWN — second reader of the guard in
  // `.claude/hooks/advance-terrain.py` (kogaki#1075).
  // Refuses an advance driven by a payload whose `tool_use_id` answers some other question.
  // A NULL ID DOES NOT REFUSE: it asserts nothing; every advancing route names one
  // (`completeState` refuses a transition with no attribution).
  if (typeof payloadToolUseId === "string" && payloadToolUseId !== "") {
    const answered = mine.filter((r) => (r.evidence || {}).tool_use_id === payloadToolUseId);
    if (answered.length === 0) {
      fail(`this advance was driven by AskUserQuestion ${JSON.stringify(payloadToolUseId)}, and no captured row for gate ${decl.id} `
        + `(raising ${JSON.stringify(instance)}) carries that id — the ${mine.length} row(s) here answer `
        + `${JSON.stringify([...new Set(mine.map((r) => (r.evidence || {}).tool_use_id))])}. `
        + `A question that did not answer this gate does not advance it, however open the run is (kogaki#1075). `
        + `Nothing was advanced, and the wait is still outstanding: the gate is re-offered at its next raising.`);
    }
    mine.length = 0;
    mine.push(...answered);
  }
  // THE LAST ROW. A gate can be re-rendered after an answer the owner wants to
  // change, and the answer that governs is the one they gave last.
  const row = mine[mine.length - 1];
  const ev = row.evidence;
  if (!ev || ev.tool !== "AskUserQuestion") {
    fail(`the captured row for gate ${decl.id} records evidence.tool ${JSON.stringify(ev && ev.tool)} — this is an OWNER act at the question UI, `
      + `and SPEC-gate-carrier binds this repository's gate medium to AskUserQuestion. A row recording any other tool records a session's own act.`);
  }
  if (typeof ev.tool_use_id !== "string" || ev.tool_use_id === "") {
    fail(`the captured row for gate ${decl.id} carries no evidence.tool_use_id — the one field tying it to a question the harness actually asked.`);
  }
  const digest = ownerGateDigest(decl.id, (decl.options || []).map((o) => o.id));
  const bound = row.answers_over || {};
  if (bound.option_set_digest !== digest) {
    fail(`the captured answer for gate ${decl.id} answers the option set digesting ${JSON.stringify(bound.option_set_digest)}, `
      + `but this declaration's options digest ${JSON.stringify(digest)} — the option set CHANGED after the gate was rendered, so the owner chose among alternatives other than these. `
      + `Re-render the gate. Nothing was advanced.`);
  }
  const answer = (row.payload || {}).answer || {};
  // AN UNRESOLVED LABEL IS REFUSED, NEVER READ AS FREE TEXT (PR #917 round 1,
  // finding 4). The hook records this when the harness's reported label neither
  // matches a declared one nor is clearly distinct from it — a truncation, a
  // decoration, a re-wrap. Reading such an answer as the owner's own words
  // would route a declared option's text to where a tag name or an id list
  // goes, skipping the unrouted-option refusal entirely; and the payload alone
  // cannot tell a mangled label from genuine free text, so the honest act is to
  // stop rather than to pick the reading that happens to advance.
  if (answer.label_unresolved) {
    fail(`the captured answer for gate ${decl.id} could not be resolved to an option or to free text: the harness reported ${JSON.stringify(answer.raw)}, `
      + `which resembles the declared option ${JSON.stringify(answer.resembles_option)} without matching it. `
      + `A near-miss is indistinguishable from free text on the payload alone, so it is refused rather than read as either. Re-render the gate, options verbatim.`);
  }
  const option = typeof answer.option === "string" && answer.option !== "" ? answer.option : null;
  const freeText = typeof answer.free_text === "string" && answer.free_text.trim() !== "" ? answer.free_text : null;
  if (!option && !freeText) {
    fail(`the captured row for gate ${decl.id} carries neither an option nor free text — an empty answer is not an answer.`);
  }
  // KEPT FROM THE RETIRED WRITER, and it is the one bound that was already
  // real: an option the declaration did not offer is refused. It now guards a
  // row the harness wrote rather than one the model composed, so it stops
  // being the only guard and starts being the last of several.
  if (option && !(decl.options || []).some((o) => o.id === option)) {
    fail(`the captured answer ${JSON.stringify(option)} was not offered by the declaration for gate ${decl.id}.`);
  }
  return { path: capPath, row, option, freeText, toolUseId: ev.tool_use_id };
}

// The refusal an unanswered gate raises, in one place because its two callers
// must not drift on WHAT THE OWNER IS TOLD TO DO. It names the pointer the
// hook reads, because a machine that has never installed the hook is the one
// state where re-rendering the question changes nothing — and a refusal that
// sends the owner round that loop forever is worse than the channel it
// replaced.
function noAnswerRefusal(decl, capPath, why) {
  return `gate ${decl.id} was declared for this run and the harness has recorded no answer to it: ${why}.\n`
    + `The answer to a declared gate is written by .claude/hooks/write-gate-capture.py when the owner answers the question, and by nothing else — `
    + `there is no argument that supplies one (kogaki#890).\n`
    + `  capture expected at: ${capPath}\n`
    + `  open-gate pointer:   ${join(openGateDir(), `${decl.gate_instance_id}.json`)}\n`
    + `If the question has not been rendered yet, render it now, options verbatim, free text on. `
    + `If it HAS been answered and this refusal persists, the hook is not installed on this machine — that wiring is machine-local and never committed, so a fresh clone reads as uncaptured until it is installed.`;
}

// The option-set digest, over [gate_id, [option ids]]. A capture certifies an
// answer GIVEN A SET OF OPTIONS: the same option id offered beside different
// alternatives is a different question, so binding to the offered set is what
// stops an answer taken at one rendering certifying a choice at another.
// `.claude/hooks/write-gate-capture.py` computes the same digest over the same
// canonical form; `checks/check-gate-capture-hook.sh` compares the two rather
// than trusting them to agree by reading.
function ownerGateDigest(gateId, optionIds) {
  return createHash("sha256").update(JSON.stringify([gateId, [...optionIds]])).digest("hex");
}
