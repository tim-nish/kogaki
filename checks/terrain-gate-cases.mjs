#!/usr/bin/env node
// checks/terrain-gate-cases.mjs — the first-tag gate, its order, its isolation and the question-shape check.
// One section of the Terrain runtime's fixture pass, cut from the one case file
// by kogaki#1459. Run by checks/check-terrain-runtime.sh, which sums every case
// file's count line against the registry's `case_floor`; the shared fixtures
// are checks/fixtures/terrain-cases/helpers.mjs.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { loadGrammar, validateSurface } from "../src/format-guard.mjs";
import { GATE_CALL_SUFFIX, emitGateDeclaration } from "../src/workflow/gate.mjs";
import {
  REPO, readJson, GATE_SCHEMA, GATES_REGISTRY, REPORT_FORMAT, RUN_RECORD_FILE,
  FIXTURE_PAYLOAD, SHAPE_CMD_FROM_ENV, terrain, moduleUrl, drive, SCRATCH, ok,
  tagStopFixture, finish,
} from "./fixtures/terrain-cases/helpers.mjs";
const { surveyPath, gs, rd, execSidecar, tagRun } = tagStopFixture();

// ---- THE FIRST-TAG GATE CARRIES ITS LISTING (kogaki#856). At
// `TAG_SELECTION` the executor printed three commands for the owner to type and
// never put the listing on screen, so the owner named a tag from memory; #737
// and #807 both closed on artifact diffs while the hop stayed broken.
//
// These REPLACE kogaki#807's eight `owner_reads` cases rather than joining
// them: this change removes the field, and the member's removal signal names
// "or when the table stops declaring owner_reads at all", so they are RETIRED,
// not re-pointed. A check whose unit a redesign dissolved stops being one.
// consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:133
const wf = readJson(join(REPO, "src", "terrain-workflow.json"));
const states = wf.states || [];
const ts = states.find((st) => st && st.id === "TAG_SELECTION");

// THE COMPOSER IS REACHED THROUGH `run` (kogaki#1257). A one-wait table
// stops at TAG_SELECTION over a survey record, and what the composer
// returned is read off the declaration that stop WROTE: its options less
// the registry's standing ones, and its `tag_listing`. Every spawn carries
// the pointer and sidecar isolation helpers.mjs's tag-stop fixture explains.
const tagStop = (name, survey) => {
  const d = join(SCRATCH, `tagstop-${name}`);
  const rdT = join(d, "rd");
  mkdirSync(rdT, { recursive: true });
  const table = join(d, "table.json");
  writeFileSync(table, JSON.stringify({ version: 1, states: [
    { id: "TAG_SELECTION", kind: "wait", owner_supplies: "one tag name, or the standing option",
      renders_gate_declaration: true, gate_id: "terrain-tag-selection" },
    { id: "done", kind: "terminal" },
  ] }));
  writeFileSync(join(rdT, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: table, version: 1 }, survey_record: survey,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  const r = terrain(["run", "--run-dir", rdT, "--workflow", table], { input: FIXTURE_PAYLOAD, env: {
    KOGAKI_OPEN_GATES: join(d, "open-gates"),
    GATE_DECLARATION_SIDECAR_DIR: join(d, "gate-declarations"),
    CLAUDE_CODE_SESSION_ID: `terrain-selftest-${name}`,
  } });
  const declFile = join(rdT, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`);
  const callFile = join(rdT, `terrain-tag-selection${GATE_CALL_SUFFIX}`);
  return { ...r, decl: existsSync(declFile) ? readJson(declFile) : null,
    call: existsSync(callFile) ? readJson(callFile) : null };
};
const standingIds = new Set(((GATES_REGISTRY.gates || []).find((g) => g.id === "terrain-tag-selection") || { options: [] })
  .options.map((o) => o.id));
// THE LISTING THE SURFACE OWES, COMPOSED HERE from the record and the
// declared row form — the header, one `  <tag> — <n> Lesson(s)` row per
// section, and the navigation hint the grammar's own line class judges.
// A check-side oracle rather than the renderer called twice, so a
// renderer that dropped or reordered rows is a byte difference.
const tagRowOf = (sec) => {
  const n = (sec.by_family || {}).lesson || 0;
  return `${sec.name} — ${n} ${n === 1 ? "Lesson" : "Lessons"}`;
};
const tagListingOf = (rec, hint) => [
  "The survey — display 1. Navigation (narrows nothing): name a tag.", "",
  ...rec.sections.map((s) => `  ${tagRowOf(s)}`), "", hint,
].join("\n");
const tagGrammar = loadGrammar(REPORT_FORMAT);

const surveyRec = readJson(surveyPath);

// THE ORDER IS THE DEFECT. A declaration carrying the bytes and a stop
// that never says when to show them reproduces exactly what was filed:
// the question rendered with the table nowhere on screen.
{
  const { r, out } = tagRun();
  {
  const stop1 = tagStop("lone", surveyPath);
  const composed = {
  options: ((stop1.decl || {}).options || []).filter((o) => !standingIds.has(o.id)),
  extra: { tag_listing: (stop1.decl || {}).tag_listing },
  };
  const navHint = String(composed.extra.tag_listing || "").split("\n").pop();
  const expectedListing = tagListingOf(surveyRec, navHint);
  // THE CONCEPT IS GONE, not merely unused on one state. A schema key no
  // state declares is an invitation to declare one, and what would be
  // declared is the channel this issue removed.
  ok("no state in the shipped table declares an owner_reads hand-over — the field and its renderer are retired",
  states.every((st) => st && st.owner_reads === undefined)
    && (wf.field_semantics || {}).owner_reads === undefined,
  states.filter((st) => st && st.owner_reads).map((st) => st.id).join(", ") || "field_semantics still declares it");
  ok("no owner-executed entry point survives — the map is present and empty, so an empty set is stated rather than dropped",
  wf.owner_executed_entry_points !== undefined
    && Object.keys(wf.owner_executed_entry_points).length === 0,
  JSON.stringify(wf.owner_executed_entry_points));

  // THE WAIT MUST ACTUALLY REACH THE COMPOSER. Either half missing lands it
  // in the executor's "OWED AND UNWRITTEN" branch, where the run is not
  // stuck and the listing is never composed — which is the pre-fix
  // behaviour wearing a gate's clothes.
  ok("TAG_SELECTION declares a gate and names a gate_id the registry carries",
  !!ts && ts.renders_gate_declaration === true
    && (GATES_REGISTRY.gates || []).some((g) => g.id === ts.gate_id),
  ts ? JSON.stringify({ decl: ts.renders_gate_declaration, gate_id: ts.gate_id }) : "(no TAG_SELECTION state)");

  ok("an option composer is bound to TAG_SELECTION — without one the executor records the declaration as owed and unwritten",
  stop1.status === 0 && !!stop1.decl && !/OWED AND UNWRITTEN/.test(stop1.out),
  stop1.out.trim().split("\n").slice(-2).join(" | ").slice(0, 160));

  // ACCEPTANCE ITEM 2, asserted as byte equality rather than as
  // containment: the declaration carries the `tag_listing` SURFACE over
  // this survey record, so no party composed, trimmed or re-rendered it.
  ok("the declaration's tag_listing is BYTE-EQUAL to the tag_listing surface over the same survey record",
  composed.extra.tag_listing === expectedListing
    && validateSurface("tag_listing", expectedListing, tagGrammar).length === 0,
  JSON.stringify(composed.extra.tag_listing || "").slice(0, 140));

  // EXACTLY TWO WAYS TO ANSWER (owner rulings 1 and 2, 2026-09-04): the
  // standing option, and free text. The composer contributes none of its
  // own, and the standing one is the premise negation the gate owes.
  // TWO TO FOUR OPTIONS, because that is the selector's format (kogaki#1029,
  // the first live hook-driven run: one option was refused by the harness).
  // The run contributes the largest served tags, ids = tag names, and the
  // standing option rides beside them.
  const rankedNames = [...surveyRec.sections]
  .sort((a, b) => (((b.by_family || {}).lesson || 0) - ((a.by_family || {}).lesson || 0)) || String(a.name).localeCompare(String(b.name)))
  .slice(0, 3).map((x) => String(x.name));
  ok("the composer offers the largest served tags as options, ids equal to the tag names, at most three",
  Array.isArray(composed.options) && composed.options.length === Math.min(3, surveyRec.sections.length)
    && composed.options.every((o, i) => o.id === rankedNames[i] && o.label === tagRowOf(surveyRec.sections.find((x) => String(x.name) === o.id))),
  JSON.stringify(composed.options));

  // THE BYTES REACH THE ARTIFACT, not only the composer's return value.
  // The session renders the FILE, so a declaration that dropped the key on
  // the way to disk would leave the listing exactly as unreachable as
  // before.
  {
  const gd = join(tmpdir(), `terrain-selftest-gate-${process.pid}`);
  mkdirSync(gd, { recursive: true });
  // ISOLATED FROM THE MACHINE'S OWN SIDECAR DIRECTORY (kogaki#1153): this
  // in-process call runs inside whatever session invoked the self-test, and
  // `emitGateDeclaration` now writes a sidecar keyed by that session's id —
  // so without an override this case would write into the real
  // `~/.claude/gate-declarations/<session_id>.json` the invoking session
  // may itself depend on.
  const sidecarDir = join(tmpdir(), `terrain-selftest-sidecar-${process.pid}`);
  const savedSidecarDir = process.env.GATE_DECLARATION_SIDECAR_DIR;
  const savedSessionId = process.env.CLAUDE_CODE_SESSION_ID;
  process.env.GATE_DECLARATION_SIDECAR_DIR = sidecarDir;
  process.env.CLAUDE_CODE_SESSION_ID = "terrain-selftest-sidecar-session";
  let declPath;
  try {
    declPath = emitGateDeclaration(gd, "terrain-tag-selection", composed.options, composed.extra);
  } finally {
    if (savedSidecarDir === undefined) delete process.env.GATE_DECLARATION_SIDECAR_DIR;
    else process.env.GATE_DECLARATION_SIDECAR_DIR = savedSidecarDir;
    if (savedSessionId === undefined) delete process.env.CLAUDE_CODE_SESSION_ID;
    else process.env.CLAUDE_CODE_SESSION_ID = savedSessionId;
  }
  const decl = readJson(declPath);
  ok("the WRITTEN declaration carries the listing — the bytes reach the file the session renders, not only the composer's return",
    decl.tag_listing === expectedListing);
  ok("the written declaration offers the tag options plus the standing option — between two and four, a shape the selector renders — and free text",
    decl.options.length >= 2 && decl.options.length <= 4
      && decl.options[decl.options.length - 1].id === "other-method"
      && decl.options.slice(0, -1).every((o, i) => o.id === rankedNames[i])
      && decl.free_text_offered === true,
    JSON.stringify(decl.options.map((o) => o.id)));

  // THE SIDECAR IS THE FIX (kogaki#1153): `emitGateDeclaration` writes
  // `~/.claude/gate-declarations/<session_id>.json` at the same moment it
  // writes `gate-call.json`, so `lint-gate-declaration.py`'s primary
  // carrier is populated before the open-gate interval ever denies a
  // write to it — no tool call, no assistant-text race.
  const sidecarPath = join(sidecarDir, "terrain-selftest-sidecar-session.json");
  const sidecar = readJson(sidecarPath);
  ok("emitGateDeclaration writes the gate-declaration sidecar keyed by the session id, at the same moment as gate-call.json",
    sidecar["1"] === "gate-declaration (question 1):\ngate: mechanical",
    JSON.stringify(sidecar));

  rmSync(gd, { recursive: true, force: true });
  rmSync(sidecarDir, { recursive: true, force: true });
  }

  // ACCEPTANCE ITEM 2's FIRST CLAUSE, AT THE SIZE IT NAMES (kogaki#1029;
  // PR #1061 round 1, finding 2): "a survey with 17 tags carries all 17 rows".
  // Everything above uses a three-section record, and the hook-side cases in
  // `checks/check-open-gate-exclusivity.sh` write their own payloads, so a
  // renderer dropping rows past some N would pass both. This is the only case
  // that reads a seventeen-section record.
  //
  // THE RECORD IS BUILT HERE, not committed: seventeen sections cloned from this
  // survey's own differ only in the name, so a failure is about the COUNT.
  {
  const many = {
    ...surveyRec,
    sections: Array.from({ length: 17 }, (_, i) => ({
      ...surveyRec.sections[i % surveyRec.sections.length],
      name: `tag-${String(i + 1).padStart(2, "0")}`,
    })),
  };
  const manyPath = join(SCRATCH, "survey-17tags.json");
  writeFileSync(manyPath, JSON.stringify(many));
  // THE RENDERING IS READ OFF A RUN OVER THE RECORD (kogaki#1257): the
  // stop's written declaration and call are the composer's and the call
  // composer's output, so all three clauses read the same run.
  const stop17 = tagStop("17tags", manyPath);
  const decl17 = stop17.decl || {};
  const listing17 = String(decl17.tag_listing || "");
  const rows17 = listing17.split("\n").filter((l) => l.startsWith("  ") && l.trim());
  ok("a seventeen-tag survey renders seventeen tag rows — one per section, none dropped",
    rows17.length === 17 && many.sections.every((sec) => listing17.includes(tagRowOf(sec))),
    JSON.stringify({ rendered: rows17.length, sections: many.sections.length }));

  ok("the declaration over a seventeen-tag survey carries that listing whole",
    listing17 === tagListingOf(many, navHint),
    JSON.stringify(listing17.length));

  // The end of the clause: the bytes the OWNER is shown. The call the
  // stop wrote is what puts the listing in front of the question, and
  // this asserts every one of the seventeen rows survives that composition.
  const q17 = ((stop17.call || { questions: [{}] }).questions[0] || {}).question || "";
  ok("the composed gate call for a seventeen-tag survey carries all seventeen rows in the question the owner reads",
    q17.startsWith(`${listing17}\n\n`) && many.sections.every((sec) => q17.includes(tagRowOf(sec))),
    JSON.stringify({ missing: many.sections.filter((sec) => !q17.includes(tagRowOf(sec))).map((sec) => sec.name) }));
  }
  }
  ok("a run reaching TAG_SELECTION stops with its declaration WRITTEN rather than owed and unwritten",
    r.status === 0 && /run declaration is WRITTEN/.test(out) && !/OWED AND UNWRITTEN/.test(out),
    out.trim().split("\n").slice(-3).join(" | ").slice(0, 160));
  // THE ORDER IS NOW A PROPERTY OF THE PAYLOAD, NOT OF THE STOP TEXT
  // (kogaki#1028 item 1). kogaki#856's case asserted that the stop TOLD the
  // session to put the listing on screen before the question; the listing
  // now rides inside the question text of the call the executor composed,
  // so what is asserted is that the call exists, is named, and carries the
  // listing above the question line. An instruction the session could
  // decline to follow has become bytes the PreToolUse hook compares.
  ok("the stop names the WRITTEN AskUserQuestion call rather than instructing the session to compose one",
    /call is WRITTEN/.test(out) && /byte-for-byte/.test(out) && !/OWED AND UNWRITTEN/.test(out),
    out.split("\n").filter((l) => /call is WRITTEN|byte-for-byte/.test(l)).join(" | ").slice(0, 200));
  // AND THE BYTES ARE ON THE STDOUT, NOT ONLY THEIR ADDRESS (kogaki#1057
  // item 3, the fixture the issue asks for). This is the case that would
  // have failed on 2026-09-09: the stop named the call and printed none of
  // it, and the session's one admissible act needed bytes that no
  // admissible act could fetch. It asserts the delivery rather than the
  // wording -- the block is PARSED and canonicalised against the written
  // file, so a printed path, a summary, or a re-serialisation that dropped
  // or reordered a field is a failure, and a re-worded sentence around the
  // block is not.
  {
    const callPath = join(rd, `terrain-tag-selection${GATE_CALL_SUFFIX}`);
    // The same canonicalisation the PreToolUse hook compares with: key
    // order is not part of the payload, and everything else is.
    const canon = (v) => JSON.stringify(v, (_k, x) => (
      x && typeof x === "object" && !Array.isArray(x)
        ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]))
        : x));
    const fenced = out.match(/```json\n([\s\S]*?)\n```/);
    let printed = null;
    try { printed = fenced ? JSON.parse(fenced[1]) : null; } catch { printed = null; }
    ok("the stop PRINTS the gate call's bytes, and the printed block canonicalises equal to the written file — the payload reaches the session on a channel the open-gate interval does not deny",
      !!fenced && printed !== null && existsSync(callPath)
        && canon(printed) === canon(readJson(callPath)),
      fenced ? `parsed=${printed !== null}` : "(no fenced block on the stop's stdout)");
  }
  // THE ISOLATION IS PROVEN ACROSS THE PROCESS BOUNDARY, NOT ASSUMED
  // (kogaki#1153). `tools/run-registered-checks.sh` supplies one sidecar
  // directory for the whole suite and `tools/open-gates-guard.sh`
  // refuses when none is set — both of which rest on the executor, in a
  // CHILD process, honouring the variable. This case is the replay of
  // the failure they exist to prevent: the spawn above carries a pinned
  // session id and a scratch directory, so the sidecar must land there
  // and the owner's live `~/.claude/gate-declarations/` must be
  // untouched. Asserting the FILE is what distinguishes a variable that
  // is read from one that is merely exported.
  ok("the executor writes its gate-declaration sidecar into GATE_DECLARATION_SIDECAR_DIR, in the spawned process — the isolation the suite runner and the guard both rest on",
    existsSync(join(execSidecar, "terrain-selftest-tagstop-session.json"))
      && readJson(join(execSidecar, "terrain-selftest-tagstop-session.json"))["1"]
        === "gate-declaration (question 1):\ngate: mechanical",
    existsSync(execSidecar) ? readdirSync(execSidecar).join(",") : "(no sidecar directory written)");
  {
    const callPath = join(rd, `terrain-tag-selection${GATE_CALL_SUFFIX}`);
    const call = existsSync(callPath) ? readJson(callPath) : null;
    const q = call && call.questions && call.questions[0];
    const listing = readJson(join(rd, "terrain-tag-selection.run-declaration.json")).tag_listing;
    ok("the call carries the tag listing VERBATIM and ABOVE the question line, so a missing or paraphrased table is a byte difference",
      !!q && typeof listing === "string" && q.question === `${listing}\n\n${"Which tag does the survey open on?"}`,
      q ? q.question.slice(0, 160) : "(no call written)");
    // THE CALL CARRIES THE DECLARATION'S OWN OPTIONS AND ADDS NOTHING.
    // kogaki#1029 landed the tag gate's dynamic options (the largest
    // served tags, plus the standing one) between this branch's first head
    // and its rebase, so this gate now declares two to four by itself and
    // the free-text fallback below is not reached for it. The case asserts
    // that: the composer transcribes, and only a gate that would otherwise
    // be UNRENDERABLE gets a row it did not declare.
    const declOptions = readJson(join(rd, "terrain-tag-selection.run-declaration.json")).options;
    ok("the call carries the declaration's own options unchanged, within AskUserQuestion's two-to-four bound",
      !!q && q.options.length === declOptions.length
        && q.options.length >= 2 && q.options.length <= 4
        && q.options.every((o, i) => o.label === declOptions[i].label)
        && q.multiSelect === false && q.header.length <= 12,
      q ? JSON.stringify({ n: q.options.length, header: q.header }) : "(no call written)");
    // AND THE FALLBACK IS STILL LIVE FOR THE GATES kogaki#1029 DID NOT
    // TOUCH — six of the eight still declare one option, so the arm the
    // owner ruled on is exercised directly rather than left unreached.
    //
    // DRIVEN THROUGH `emitGateDeclaration` (kogaki#1257), the production
    // export that composes the call, over a registered one-option gate
    // with no run-composed option — the declaration's own `free_text_offered`
    // overridden through `extra` for the mute half. The child carries
    // pointer and sidecar isolation and no question-shape command, so
    // the compose-time rule degrades to admit and is not what is asserted.
    const oneGate = (GATES_REGISTRY.gates || []).find((g) => g.id === "brief-reader-path-job");
    const emitOne = (name, extra) => {
      const d = join(gs, `emit-${name}`);
      mkdirSync(join(d, "rd"), { recursive: true });
      const r = drive(`rt.emitGateDeclaration(${JSON.stringify(join(d, "rd"))}, "brief-reader-path-job", [], ${JSON.stringify(extra)});\nconsole.log("{}");`, {
        KOGAKI_OPEN_GATES: join(d, "open-gates"),
        GATE_DECLARATION_SIDECAR_DIR: join(d, "gate-declarations"),
        CLAUDE_CODE_SESSION_ID: `terrain-selftest-emit-${name}`,
        KOGAKI_QUESTION_SHAPE_CMD: join(d, "no-such-command"),
      });
      const callFile = join(d, "rd", `brief-reader-path-job${GATE_CALL_SUFFIX}`);
      const ptrDir = join(d, "open-gates");
      const ptrs = existsSync(ptrDir) ? readdirSync(ptrDir).filter((f) => f.endsWith(".json")) : [];
      return { r, call: existsSync(callFile) ? readJson(callFile) : null,
        pointer: ptrs.length ? readJson(join(ptrDir, ptrs[0])) : null };
    };
    const oneArm = emitOne("one", {});
    ok("a gate still declaring ONE option gets the free-text row composed from its own `free_text_offered`, never an invented arm (owner ruling 2026-09-09)",
      !!oneArm.call && oneArm.call.questions[0].options.length === 2
        && oneArm.call.questions[0].options[0].label === oneGate.options[0].label,
      JSON.stringify((oneArm.call || {}).questions || oneArm.r));
    const mute = emitOne("mute", { free_text_offered: false });
    ok("a gate declaring one option and NO free text composes no call at all, and the reason is stated rather than an arm being invented",
      !mute.r.driveFailed && !mute.call && !!mute.pointer && typeof mute.pointer.gate_call_unavailable === "string"
        && mute.pointer.gate_call_unavailable.length > 0,
      JSON.stringify(mute.pointer || mute.r));
  }
}
// THE SHARED QUESTION-SHAPE CHECK, AT COMPOSE (kogaki#1118).
//
// TWO CASES AND TWO COMMANDS, deliberately. The REAL command answers
// acceptance 1 -- the payload this repository sends is one the channel
// admits -- and can only be asked on a machine that has it, the command
// being machine-local and outside this repository. The STUB answers the
// refusal half, and is not a convenience: it exercises what the PROGRAM
// does when the rule refuses, which is the behaviour this issue is
// about, on every machine including the one where the real command is
// absent. A fixture resting on the real command alone would be silent
// in CI, which is exactly where a wedge would next be introduced.
{
  const shapeDir = mkdtempSync(join(tmpdir(), "terrain-selftest-shape-"));
  // THE COMMAND THE RUNTIME ASKS, named the way it names it: the
  // override, else the install path `issue-sync install-hooks` writes.
  const realCmd = SHAPE_CMD_FROM_ENV || join(homedir(), ".claude", "tools", "issue-sync");
  let probe = null;
  const realAnswers = () => {
    probe ??= spawnSync(realCmd, ["lint-question"], { input: '{"questions":[]}', encoding: "utf8" });
    return !probe.error && (probe.status === 0 || probe.status === 1);
  };

  // ONE EMIT OF THE THESIS GATE, in a child under isolated pointer and
  // sidecar directories (kogaki#1257): `emitGateDeclaration` composes
  // the call and writes it beside the declaration, so the composed
  // payload is read off the file rather than off an internal's return.
  const emitThesis = (name, dynamicOptions, env = {}) => {
    const d = join(shapeDir, `thesis-${name}`);
    mkdirSync(d, { recursive: true });
    const r = drive(`rt.emitGateDeclaration(${JSON.stringify(d)}, "brief-thesis-adoption", ${JSON.stringify(dynamicOptions)}, {});\nconsole.log("{}");`, {
      KOGAKI_OPEN_GATES: join(shapeDir, `open-gates-${name}`),
      GATE_DECLARATION_SIDECAR_DIR: join(shapeDir, `gate-declarations-${name}`),
      CLAUDE_CODE_SESSION_ID: `terrain-selftest-thesis-${name}`,
      ...env,
    });
    const callFile = join(d, `brief-thesis-adoption${GATE_CALL_SUFFIX}`);
    const declFile = join(d, `brief-thesis-adoption${GATE_SCHEMA.capture.run_declaration_suffix}`);
    return { dir: d, r, callFile, declFile, tool_input: existsSync(callFile) ? readJson(callFile) : null };
  };

  // The thesis gate, composed as a run composes it -- two served
  // addresses in the settled set, the registry's own standing options
  // merged in beneath them by `emitGateDeclaration`'s own rule.
  const thesisGate = JSON.parse(JSON.stringify(
    (GATES_REGISTRY.gates || []).find((g) => g.id === "brief-thesis-adoption")));
  const adoptOption = { id: "adopt", label: "Adopt the Thesis as named above" };
  {
    const thesisCall = emitThesis("composed", [adoptOption], { KOGAKI_QUESTION_SHAPE_CMD: realCmd });
    ok("the Brief's thesis gate composes a call at all, over a settled set of two served addresses",
      !!thesisCall.tool_input,
      JSON.stringify(thesisCall.r.driveFailed ? thesisCall.r.stderr : "composed"));
    // THE FIRST REAL CALL IS THE PROBE (kogaki#1425): whether the verb
    // answers is read off this verdict, so the case pays no separate
    // empty-payload start for it.
    const verdict = spawnSync(realCmd, ["lint-question"],
      { input: JSON.stringify(thesisCall.tool_input), encoding: "utf8" });
    probe ??= verdict;
    if (realAnswers()) {
      ok("that composed payload passes the toolkit's own question-shape command with exit 0 (kogaki#1118 acceptance 1)",
        verdict.status === 0,
        `exit=${verdict.status} ${(verdict.stderr || "").trim().slice(0, 200)}`);
    } else {
      ok("the toolkit's question-shape command does not answer on this machine, so acceptance 1 is typed CANNOT-ESTABLISH rather than reported clean — it is machine-local, outside this repository, and its absence degrades HOW the rule is applied and never WHETHER the gate composes",
        !thesisCall.r.driveFailed, `${realCmd}: ${probe.error ? probe.error.code : `exit=${probe.status}`}`);
    }

    // THE REFUSING COMMAND, AND THE START ACT UNDER IT (acceptance 2).
    // Driven as a subprocess because the refusal is `fail()`, which exits
    // -- the same reason the survey-grammar guard above is driven that way.
    const stub = join(shapeDir, "refusing-issue-sync");
    // THE STUB DISCRIMINATES, because the real command does and because
    // the composer now asks whether the verb is supported before believing
    // an exit 1 (PR #1119 round 1). A stub refusing every payload fails
    // that probe and is read as a command that does not carry the verb —
    // which is the guard working, and which would leave this case
    // asserting nothing.
    writeFileSync(stub,
      "#!/usr/bin/env bash\n"
      + "payload=$(cat)\n"
      + "case \"$payload\" in\n"
      + "  *'(a note)'*)\n"
      + "    echo \"question 1: option label carries the marker \\\"(a note)\\\", which is not an accepted marker class.\" >&2\n"
      + "    exit 1 ;;\n"
      + "esac\n"
      + "exit 0\n");
    chmodSync(stub, 0o755);
    const emitDir = join(shapeDir, "emit");
    mkdirSync(emitDir, { recursive: true });
    const gatesDir = join(shapeDir, "open-gates");
    const driver = join(shapeDir, "driver.mjs");
    writeFileSync(driver,
      `import { emitGateDeclaration } from ${JSON.stringify(moduleUrl("workflow/gate"))};\n`
      + `emitGateDeclaration(${JSON.stringify(emitDir)}, "brief-thesis-adoption",\n`
      + `  [{ id: "adopt", label: "Adopt the Thesis as named above (a note)" }], {});\n`);
    const run = spawnSync(process.execPath, [driver], {
      encoding: "utf8",
      env: { ...process.env, KOGAKI_QUESTION_SHAPE_CMD: stub, KOGAKI_OPEN_GATES: gatesDir,
        GATE_DECLARATION_SIDECAR_DIR: join(shapeDir, "gate-declarations"), CLAUDE_CODE_SESSION_ID: "terrain-selftest-shape" },
    });
    const emitted = existsSync(emitDir) ? readdirSync(emitDir) : [];
    const pointers = existsSync(gatesDir) ? readdirSync(gatesDir) : [];
    ok("the start act REFUSES a composed gate the shared check refuses, and carries the command's own text rather than a paraphrase of it (kogaki#1118 acceptance 2)",
      run.status !== 0 && /not an accepted marker class/.test(`${run.stderr || ""}${run.stdout || ""}`),
      `exit=${run.status} ${(run.stderr || "").trim().split("\\n").slice(-1)[0].slice(0, 200)}`);
    ok("and it writes NO gate-call.json and no run declaration — the refusal stands above every write in `emitGateDeclaration`, so there is no artifact to unwrite",
      emitted.length === 0, JSON.stringify(emitted));
    ok("and leaves NO open-gate pointer under the isolated `KOGAKI_OPEN_GATES` directory, so no session is held at a question that cannot be shown",
      pointers.length === 0, JSON.stringify(pointers));

    // AND THE ABSENT COMMAND ADMITS, which is the other half of the
    // degradation policy and is asserted rather than assumed: a
    // fail-closed arm here would wedge every gate on a machine that
    // merely lacks the toolkit, reintroducing this issue from the far side.
    const absent = spawnSync(process.execPath, [driver], {
      encoding: "utf8",
      env: {
        ...process.env,
        KOGAKI_QUESTION_SHAPE_CMD: join(shapeDir, "no-such-command"),
        KOGAKI_OPEN_GATES: join(shapeDir, "open-gates-absent"),
        GATE_DECLARATION_SIDECAR_DIR: join(shapeDir, "gate-declarations-absent"),
        CLAUDE_CODE_SESSION_ID: "terrain-selftest-shape",
      },
    });
    ok("a machine with NO question-shape command renders the gate rather than refusing it — the early refusal is lost, the refusal is not, because the installed hook still guards delivery",
      absent.status === 0, `exit=${absent.status} ${(absent.stderr || "").trim().slice(0, 160)}`);
  }

  {
    // THE RUN THAT STALLED BEFORE THE REPAIR (acceptance 4). Re-entry
    // prints the call file the earlier stop WROTE, so a label repair that
    // reached only `composeGateCall` would reach every future run and none
    // of the runs this issue was filed for. Driven over a synthetic stop
    // rather than the 2026-09-14 directory itself: that run lives in the
    // ignored runs lane, which a fixture pass on another machine does not
    // have, and a case that silently skips where the artifact is absent is
    // the reading this repository refuses.
    {
      // STAGED BY THE REAL COMPOSER UNDER AN ADMITTING COMMAND, not by a
      // literal written here (PR #1119 round 1). What is being staged is a
      // file an OLDER runtime wrote — one with no compose-time check at
      // all — and the way to get those bytes is to mute the check, never
      // to hand-build the payload beside it: a second composer here would
      // omit the free-text row and the folded reading, so the refresh
      // would be driven over bytes no runtime ever wrote and the case
      // would be green either way. Since kogaki#1257 the composer is
      // reached through `emitGateDeclaration` in a child, and the older
      // runtime's declaration is completed by dropping the one field it
      // could not have carried, `run_composed_option_ids`.
      const admitting = join(shapeDir, "admitting-issue-sync");
      writeFileSync(admitting, "#!/usr/bin/env bash\ncat >/dev/null\nexit 0\n");
      chmodSync(admitting, 0o755);
      const backToTerrain = thesisGate.options.find((o) => o.id === "back-to-terrain");
      const staged = emitThesis("stalled", [
        adoptOption, { ...backToTerrain, label: `${backToTerrain.label} (a Brief never fetches)` },
      ], { KOGAKI_QUESTION_SHAPE_CMD: admitting });
      ok("the pre-repair payload is staged by the real composer, so the refresh is driven over the bytes a runtime actually wrote — free-text row and folded reading included",
        !!staged.tool_input, JSON.stringify(staged.r.driveFailed ? staged.r.stderr : "composed"));
      const decl = existsSync(staged.declFile) ? readJson(staged.declFile) : { options: [] };
      delete decl.run_composed_option_ids;
      writeFileSync(staged.declFile, JSON.stringify(decl, null, 2) + "\n");

      // THE RE-ENTRY IS A REAL ONE: a run record standing at no wait, whose
      // gate wait already owes the staged declaration, so `run` walks to
      // the wait, finds the declaration composed, and stops — the branch
      // that prints the written call, and the one the refresh stands in.
      const stalledTable = join(shapeDir, "stalled-table.json");
      writeFileSync(stalledTable, JSON.stringify({ version: 1, states: [
        { id: "THESIS", kind: "wait", owner_supplies: "a Thesis, or the standing option",
          renders_gate_declaration: true, gate_id: "brief-thesis-adoption" },
        { id: "done", kind: "terminal" },
      ] }));
      const seed = JSON.stringify({
        workflow: { path: stalledTable, version: 1 }, survey_record: surveyPath,
        completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
        awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
        gate_declarations_owed: [{ state: "THESIS", gate_id: "brief-thesis-adoption", declaration: staged.declFile }],
        done: false,
      });
      const reenter = () => {
        writeFileSync(join(staged.dir, RUN_RECORD_FILE), seed);
        return terrain(["run", "--run-dir", staged.dir, "--workflow", stalledTable], { input: FIXTURE_PAYLOAD, env: {
          KOGAKI_OPEN_GATES: join(shapeDir, "open-gates-reentry"),
          GATE_DECLARATION_SIDECAR_DIR: join(shapeDir, "gate-declarations-reentry"),
          CLAUDE_CODE_SESSION_ID: "terrain-selftest-reentry",
          KOGAKI_QUESTION_SHAPE_CMD: realCmd,
        } });
      };
      const refreshNote = /NOTE: the call written by the earlier stop carried a label the shared question-shape check refuses/;
      // THE RULE'S VERDICT ON A FILE, asked of the command itself: the
      // refusal text when it refuses, null when it admits or cannot answer.
      const refusalOf = (file) => {
        if (!existsSync(file) || (probe && !realAnswers())) return null;
        const v = spawnSync(realCmd, ["lint-question"], { input: readFileSync(file, "utf8"), encoding: "utf8" });
        // THE FIRST REAL CALL IS THE PROBE (kogaki#1425), as above.
        probe ??= v;
        if (!realAnswers()) return null;
        return v.status === 1 ? ((v.stderr || "").trim() || "refused") : null;
      };
      const writtenBytes = existsSync(staged.callFile) ? readFileSync(staged.callFile, "utf8") : "";
      const before = refusalOf(staged.callFile);
      const first = reenter();
      const did = first.status === 0 && refreshNote.test(first.out);
      const after = refusalOf(staged.callFile);
      if (realAnswers()) {
        ok("a gate call WRITTEN before the label repair is refused, refreshed from the registry's standing options at re-entry, and admissible afterwards — so the run that stalled on 2026-09-14 shows its gate rather than staying stalled across the fix (kogaki#1118 acceptance 4)",
          !!before && did && !after,
          `before=${!!before} refreshed=${did} after=${!!after} ${first.out.trim().split("\n").slice(-1)[0].slice(0, 120)}`);
        const second = reenter();
        ok("and the refresh is a no-op on a call the check admits, so re-entry does not rewrite a payload nothing objected to",
          second.status === 0 && !refreshNote.test(second.out),
          `second re-entry exit=${second.status}`);
      } else {
        ok("the question-shape command does not answer here, so the re-entry refresh has nothing to judge and rewrites nothing — acceptance 4's assertion is typed CANNOT-ESTABLISH on this machine rather than reported clean",
          !before && first.status === 0 && !did, `before=${!!before} refreshed=${did} exit=${first.status}`);
        ok("and the written call is left exactly as the earlier stop wrote it, which is what an unapplied rule owes",
          !after && existsSync(staged.callFile) && readFileSync(staged.callFile, "utf8") === writtenBytes, "unchanged");
      }
      const declAfter = existsSync(staged.declFile) ? readJson(staged.declFile) : {};
      ok("the declaration is refreshed WITH the call and keeps its instance id — the answer's join key is the same raising of the same gate, and the capture's `options_offered` is judged against a declaration that matches what was shown",
        !!decl.gate_instance_id && declAfter.gate_instance_id === decl.gate_instance_id
          && (declAfter.options || []).length === decl.options.length,
        `instance=${declAfter.gate_instance_id} options=${(declAfter.options || []).length}`);
    }
  }
  rmSync(shapeDir, { recursive: true, force: true });
}

finish("terrain-gate-cases.mjs");
