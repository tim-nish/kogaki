#!/usr/bin/env node
// checks/terrain-executor-cases.mjs — the hook-delivered answer, the executor invoked by hooks, and which run an advance belongs to.
// One section of the Terrain runtime's fixture pass, cut from the one case file
// by kogaki#1459. Run by checks/check-terrain-runtime.sh, which sums every case
// file's count line against the registry's `case_floor`; the shared fixtures
// are checks/fixtures/terrain-cases/helpers.mjs.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { readRunRecord } from "../src/workflow/run-record.mjs";
import {
  readJson, GATE_SCHEMA, RUN_RECORD_FILE, FIXTURE_PAYLOAD, gateway, terrain,
  LONE_ANSWERS, ok, sentQ, tagStopFixture, finish,
} from "./fixtures/terrain-cases/helpers.mjs";
const { surveyPath, selfPath, gs, execEnv, tp, tagRun, gatesFor, envFor, payloadAnswering, answerThroughHook } = tagStopFixture();

{
  const { out } = tagRun();
  ok("the stop prints no invocation for the owner to run — no READ FIRST block, and no `terrain.mjs tags` hand-over",
    !/READ FIRST/.test(out) && !/terrain\.mjs tags/.test(out),
    out.split("\n").filter((l) => /READ FIRST|terrain\.mjs tags/.test(l)).join(" | "));

  // THE GUARD IS THE SAME GUARD. A listing riding a declaration is judged
  // by the grammar that judged it when it was printed — otherwise moving
  // the surface to a new channel silently loosens its contract. Driven as
  // a subprocess because the refusal is `fail()`, which exits.
  const badSurvey = join(gs, "bad-survey.json");
  const badRec = readJson(surveyPath);
  badRec.sections = [{ ...badRec.sections[0], name: "a tag whose name\nbreaks the row grammar" }];
  writeFileSync(badSurvey, JSON.stringify(badRec));
  const rdBad = join(gs, "rd-bad");
  mkdirSync(rdBad, { recursive: true });
  writeFileSync(join(rdBad, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: badSurvey,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  const rBad = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdBad, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: execEnv });
  const outBad = `${rBad.stdout || ""}${rBad.stderr || ""}`;
  {
    // The live directory holds no pointer this case minted (kogaki#1046
    // acceptance 1). Read only when it exists: a machine with no live
    // directory has nothing to leak into.
    const live = join(homedir(), ".claude", "kogaki-open-gates");
    const leaked = [];
    if (existsSync(live)) {
      for (const f of readdirSync(live)) {
        if (!f.endsWith(".json")) continue;
        try {
          const p = readJson(join(live, f));
          if (String(p.declaration_path || "").startsWith(gs)) leaked.push(f);
        } catch { /* an unreadable pointer is not this case's */ }
      }
    }
    ok("the self-test's executor spawns leave the live open-gate directory untouched (kogaki#1046)",
      leaked.length === 0, leaked.join(", "));
  }
  ok("a listing the tag_listing grammar refuses does not ride into a declaration — the gate refuses instead",
    rBad.status !== 0 && /refusing to emit tag_listing/.test(outBad),
    outBad.trim().split("\n")[0].slice(0, 140));

  // THE FLAGS ARE REFUSED BY NAME, not merely ignored. An ignored flag
  // is a session quietly getting a different act than it asked for; the
  // whole point of removing this channel is that reaching for it stops.
  const rdDead = join(gs, "rd-dead-flag");
  mkdirSync(rdDead, { recursive: true });
  writeFileSync(join(rdDead, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDead, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
  for (const dead of [["--capture-option", "other-method"], ["--capture-free-text", "x"], ["--tool-use-id", "t"]]) {
    const rDead = spawnSync(process.execPath,
      [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, ...dead], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
    const outDead = `${rDead.stdout || ""}${rDead.stderr || ""}`;
    ok(`${dead[0]} is REMOVED and refused by name — the model no longer has a channel for the owner's answer`,
      rDead.status !== 0 && outDead.includes(`${dead[0]} is REMOVED`),
      outDead.trim().split("\n")[0].slice(0, 140));
  }

  // ---- THE EXECUTOR IS INVOKED BY HOOKS ONLY (kogaki#1027) -----------
  //
  // Every Terrain run since kogaki#17 started when the model typed
  // `node src/terrain.mjs run` into Bash and advanced when the model chose
  // to re-enter; the run record recorded WHICH states completed and never
  // WHO executed the transition, so a run the model drove and a run the
  // Harness drove left identical records. These cases drive the two
  // halves of the repair: the payload refusal, and the attribution.

  // ITEM 5. The three deleted entry points, refused BY NAME rather than
  // ignored, on the same ground the three above are: an ignored flag is a
  // session quietly getting a different act than it asked for.
  for (const dead of [["--input", "some tag"], ["--at", "TAG_SELECTION"], ["--enter", "TAG_SELECTION"]]) {
    const rGone = spawnSync(process.execPath,
      [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, ...dead], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
    const outGone = `${rGone.stdout || ""}${rGone.stderr || ""}`;
    ok(`${dead[0]} is DELETED and refused by name — the model-typed route into the executor has no stub`,
      rGone.status !== 0 && outGone.includes(`${dead[0]} is DELETED`),
      outGone.trim().split("\n")[0].slice(0, 140));
  }

  // ACCEPTANCE 1. Invoking the executor with no payload on stdin refuses
  // and WRITES NOTHING. The run directory is named but never created,
  // which is the "before any write" half — a refusal that had already
  // made the directory would have pruned this lane's entries on the way.
  {
    const rdNone = join(gs, "rd-no-payload");
    const rNone = spawnSync(process.execPath,
      [selfPath, "run", "--run-dir", rdNone, "--workflow", tp], { input: "", encoding: "utf8", env: envFor("nopayload") });
    const outNone = `${rNone.stdout || ""}${rNone.stderr || ""}`;
    ok("the executor with NO hook payload on stdin refuses, and names the two acts that do carry one",
      rNone.status !== 0 && /no hook payload/.test(outNone)
        && /terrain\.mjs start/.test(outNone) && /advance-terrain\.py/.test(outNone),
      outNone.trim().split("\n")[0].slice(0, 160));
    ok("that refusal wrote NOTHING — the run directory it named does not exist, so the refusal precedes every write",
      !existsSync(rdNone), rdNone);
    // A payload MISSING ONE FIELD is not a payload. `advanced_by` with a
    // null tool_use_id records that a transition happened and not which
    // question executed it, which is the same silence the field ends.
    for (const missing of ["hook_event_name", "session_id", "tool_use_id"]) {
      const partial = JSON.parse(FIXTURE_PAYLOAD);
      delete partial[missing];
      const rPart = spawnSync(process.execPath,
        [selfPath, "run", "--run-dir", join(gs, `rd-partial-${missing}`), "--workflow", tp],
        { input: JSON.stringify(partial), encoding: "utf8", env: envFor("nopayload") });
      ok(`a payload with no ${missing} is refused — a partial attribution is not an attribution`,
        rPart.status !== 0, `exit ${rPart.status}`);
    }
    // `--status` is the ONE verb the PreToolUse deny admits from a Bash
    // command, so it must not need a payload: an inspection route that
    // required a hook event would leave a stuck run unreadable by the one
    // person able to unstick it.
    const rStatus = spawnSync(process.execPath,
      [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, "--status"], { input: "", encoding: "utf8", env: envFor("dead") });
    ok("`run --status` needs no payload — the one verb reachable from a Bash command is read-only and stays reachable",
      rStatus.status === 0, `exit ${rStatus.status}`);
  }

  // ACCEPTANCE 2. A run driven by synthesized hook payloads ALONE reaches
  // its end, and every transition in its record carries `advanced_by`
  // with the three fields.
  //
  // THE TABLE IS THE FIXTURE'S, NOT THE SHIPPED ONE, and the substitution
  // is stated rather than quietly made: this pass is seam-free by
  // construction and the shipped table's first state reads the gateway,
  // so a drive of `full_report` itself is exactly the end-to-end member
  // `terrain-runtime`'s own removal signal names as not existing yet. What
  // is asserted here is the property that acceptance item names — payloads
  // alone carry a run from its start through a gate answer to its terminal
  // — over a table that reaches a terminal without a seam.
  {
    const rdDrive = join(gs, "rd-hook-driven");
    mkdirSync(rdDrive, { recursive: true });
    writeFileSync(join(rdDrive, RUN_RECORD_FILE), JSON.stringify({
      workflow: { path: tp, version: 1 }, survey_record: surveyPath,
      completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
      awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
      gate_declarations_owed: [], transitions: [], done: false,
    }));
    spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDrive, "--workflow", tp],
      { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("driven") });
    const declDrive = readJson(join(rdDrive, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
    // THE FREE-TEXT ARM, because the fixture survey's tag options are not
    // guaranteed to include a routed one and a case that depends on which
    // tags a corpus happens to carry is a case that fails for the wrong
    // reason. Free text is the affordance every gate here declares on, and
    // it advances the wait exactly as a routed option does.
    answerThroughHook("driven", sentQ(rdDrive, declDrive), "a tag the owner typed", "fixture-tool-use");
    const rDrive = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDrive, "--workflow", tp],
      { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("driven") });
    const recDrive = readRunRecord(rdDrive);
    ok("a run driven by synthesized hook payloads alone advances through its gate to the terminal — no model-typed act anywhere on the path",
      rDrive.status === 0 && !!recDrive && recDrive.done === true && recDrive.completed.includes("done"),
      recDrive ? JSON.stringify({ done: recDrive.done, completed: recDrive.completed }) : "(no record)");
    const rows = (recDrive && recDrive.transitions) || [];
    ok("every transition in that record carries advanced_by with the three payload fields, copied from the payload rather than composed",
      rows.length > 0 && rows.every((t) => t.advanced_by
        && t.advanced_by.executor === "hook"
        && t.advanced_by.hook_event_name === "PostToolUse"
        && t.advanced_by.session_id === "fixture-session"
        && t.advanced_by.tool_use_id === "fixture-tool-use"),
      JSON.stringify(rows.map((t) => t.advanced_by)).slice(0, 200));
    ok("the transition list and the completed list name the same states in the same order — one writer, so they cannot disagree about what ran",
      rows.map((t) => t.state).join(",") === recDrive.completed.join(","),
      `${rows.map((t) => t.state).join(",")} vs ${recDrive.completed.join(",")}`);
  }

  // ITEM 1. The start act carries the `skill-expansion` executor kind and
  // NO hook fields, because no hook event produced it — and it refuses an
  // existing record, so it cannot walk states the hook route is supposed
  // to execute under an attribution that names no hook.
  {
    const rdStart = join(gs, "rd-start");
    mkdirSync(rdStart, { recursive: true });
    writeFileSync(join(rdStart, RUN_RECORD_FILE), JSON.stringify({
      workflow: { path: tp, version: 1 }, survey_record: surveyPath,
      completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
      awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
      gate_declarations_owed: [], transitions: [], done: false,
    }));
    const rStart = spawnSync(process.execPath, [selfPath, "start", "--run-dir", rdStart, "--workflow", tp],
      { input: "", encoding: "utf8", env: envFor("start") });
    const outStart = `${rStart.stdout || ""}${rStart.stderr || ""}`;
    ok("`start` refuses a run record that already exists — the start act opens a run and never resumes one",
      rStart.status !== 0 && /a resumption and not a start/.test(outStart),
      outStart.trim().split("\n")[0].slice(0, 160));

    const rdStart2 = join(gs, "rd-start-fresh");
    mkdirSync(rdStart2, { recursive: true });
    const startTable = join(gs, "start-table.json");
    writeFileSync(startTable, JSON.stringify({ version: 1, states: [
      { id: "a", kind: "compute" },
      { id: "W", kind: "wait", owner_supplies: "something" },
      { id: "done", kind: "terminal" },
    ] }));
    const rStart2 = spawnSync(process.execPath, [selfPath, "start", "--run-dir", rdStart2, "--workflow", startTable],
      { input: "", encoding: "utf8", env: envFor("start") });
    const recStart = readRunRecord(rdStart2);
    const startRows = (recStart && recStart.transitions) || [];
    ok("`start` runs with no payload on stdin — the skill's `!` line receives none, and the act is licensed rather than synthesized",
      rStart2.status === 0 && !!recStart, `exit ${rStart2.status}`);
    ok("the start act's transitions name the skill expansion and carry NO hook fields — an attribution no harness event supplied is never invented",
      startRows.length > 0 && startRows.every((t) => t.advanced_by
        && t.advanced_by.executor === "skill-expansion"
        && t.advanced_by.hook_event_name === undefined
        && t.advanced_by.session_id === undefined
        && t.advanced_by.tool_use_id === undefined),
      JSON.stringify(startRows.map((t) => t.advanced_by)).slice(0, 200));
    ok("the start act stops at the first wait — it produces one stop, not a walked run",
      !!recStart && recStart.awaiting === "W" && recStart.done === false,
      recStart ? JSON.stringify({ awaiting: recStart.awaiting, done: recStart.done }) : "(no record)");
  }

  // ---- WHICH RUN THE ADVANCE IS AN ADVANCE OF (PR #1034 round 1,
  // blocking). `--run-dir` was run identity, re-supplied by the session on
  // every re-entry; item 5 removed the session's route and left nothing in
  // its place, so `start` opened one workspace and the advance minted
  // another. The open-run pointer is the carrier that replaces it, and
  // these cases drive it over `KOGAKI_OPEN_RUN` so the real lane is never
  // touched.
  {
    const ptr = join(gs, "open-run-pointer");
    const envPtr = (extra = {}) => ({ ...process.env, KOGAKI_OPEN_RUN: ptr, ...extra });
    const startTable2 = join(gs, "pointer-table.json");
    writeFileSync(startTable2, JSON.stringify({ version: 1, states: [
      { id: "a", kind: "compute" },
      { id: "W", kind: "wait", owner_supplies: "something" },
      { id: "done", kind: "terminal" },
    ] }));

    // With no pointer and no --run-dir, an advance REFUSES and writes
    // nothing: an advance is an advance OF a run, and minting one here is
    // exactly the defect.
    const rNoRun = spawnSync(process.execPath, [selfPath, "run", "--workflow", startTable2],
      { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envPtr() });
    const outNoRun = `${rNoRun.stdout || ""}${rNoRun.stderr || ""}`;
    ok("an advance with no open run refuses and names the start act, rather than minting a fresh workspace per question",
      rNoRun.status !== 0 && /no Terrain run is open/.test(outNoRun) && /terrain\.mjs start/.test(outNoRun),
      outNoRun.trim().split("\n")[0].slice(0, 160));
    ok("that refusal wrote no pointer either — nothing about the lane changed",
      !existsSync(ptr), ptr);

    // `start` on the default branch WRITES the pointer, and the advance
    // that follows resolves the same workspace rather than a new one.
    const rdPtr = join(gs, "rd-pointer");
    const rStartPtr = spawnSync(process.execPath,
      [selfPath, "start", "--run-dir", rdPtr, "--workflow", startTable2],
      { input: "", encoding: "utf8", env: envPtr() });
    ok("an explicit --run-dir still wins for `start`, and writes NO pointer — a caller who named a directory holds it",
      rStartPtr.status === 0 && !existsSync(ptr), `exit ${rStartPtr.status}`);

    // The pointer's own round trip, driven the way the start act writes
    // it, and READ the way an advance reads it (kogaki#1257): `run
    // --status` with no `--run-dir` resolves the open run through the
    // pointer and names the record it read, so the record line is the
    // workspace the pointer resolved to.
    const statusVia = () => {
      const r = terrain(["run", "--workflow", startTable2, "--status"], { env: { KOGAKI_OPEN_RUN: ptr } });
      const m = r.out.match(/^Run record: (.*)$/m);
      return { ...r, dir: m ? dirname(m[1]) : null };
    };
    writeFileSync(ptr, `${rdPtr}\n`);
    const viaPtr = statusVia();
    ok("an advance with the pointer set resolves the SAME workspace the start act opened — the run the answer belongs to",
      viaPtr.status === 0 && viaPtr.dir === resolve(rdPtr), String(viaPtr.dir || viaPtr.out.trim().split("\n")[0]));
    // A POINTER TO A WORKSPACE THAT IS GONE IS NOT A RUN. A `runs/` prune
    // or a hand-cleaned lane leaves the file behind, and resolving it
    // would advance into a directory with no record in it.
    writeFileSync(ptr, `${join(gs, "not-a-run")}\n`);
    const viaGone = statusVia();
    ok("a pointer naming a workspace that no longer exists reads as NO open run, rather than resolving to an empty directory",
      viaGone.status !== 0 && /no Terrain run is open/.test(viaGone.out),
      viaGone.out.trim().split("\n")[0].slice(0, 160));
  }
}
{
  // THE STANDING OPTION IS ROUTED NOWHERE, AND SAYS SO (PR #898 round 1).
  // Before this the option id was recorded where a tag name goes and the
  // run died two states later in `compose_input`, telling the owner that
  // "other-method" was not in the survey's vocabulary — a refusal that
  // misdescribes what they did, from a state that cannot know what they
  // were asked. One of exactly two ways to answer deserves one that names
  // it, and the wait must survive so the gate can be re-offered.
  const rdOpt = join(gs, "rd-unrouted");
  mkdirSync(rdOpt, { recursive: true });
  writeFileSync(join(rdOpt, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("opt") });
  const declOpt = readJson(join(rdOpt, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
  const standingLabel = declOpt.options.find((o) => o.id === "other-method").label;
  // THE GATE IS UNANSWERED UNTIL THE HARNESS SAYS OTHERWISE, and this is
  // the case the whole issue turns on: a re-entry with no recorded answer
  // refuses instead of advancing on something a session supplied.
  const rUnanswered = spawnSync(process.execPath,
    [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("opt") });
  const outUnanswered = `${rUnanswered.stdout || ""}${rUnanswered.stderr || ""}`;
  ok("an outstanding declared gate with NO harness-recorded answer refuses, and names the hook and the pointer rather than advancing",
    rUnanswered.status !== 0
      && /the harness has recorded no answer/.test(outUnanswered)
      && /write-gate-capture\.py/.test(outUnanswered)
      && /open-gate pointer/.test(outUnanswered),
    outUnanswered.trim().split("\n")[0].slice(0, 160));

  answerThroughHook("opt", sentQ(rdOpt, declOpt), standingLabel, "toolu_test_unrouted");
  const rOpt = spawnSync(process.execPath,
    [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: payloadAnswering("toolu_test_unrouted"), encoding: "utf8", env: envFor("opt") });
  const outOpt = `${rOpt.stdout || ""}${rOpt.stderr || ""}`;
  const recOpt = readRunRecord(rdOpt);
  ok("capturing the standing option REFUSES the advance and names the option, rather than letting it land where a tag name goes",
    rOpt.status !== 0 && /ROUTED NOWHERE/.test(outOpt) && /other-method/.test(outOpt),
    outOpt.trim().split("\n").slice(-1)[0].slice(0, 160));
  ok("that refusal leaves the wait OUTSTANDING and records no owner input — the gate can be re-offered rather than the run being wedged",
    !!recOpt && recOpt.awaiting === "TAG_SELECTION"
      && !recOpt.completed.includes("TAG_SELECTION")
      && recOpt.owner_input.TAG_SELECTION === undefined,
    recOpt ? JSON.stringify({ awaiting: recOpt.awaiting, completed: recOpt.completed, input: recOpt.owner_input }) : "(no record)");
  ok("the answer is still CAPTURED — it is evidence, and the gate carrier owes the row whether or not the run advances",
    existsSync(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`))
      && readJson(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`)).rows.some((x) => x.payload.answer.option === "other-method"));
  ok("the captured row carries the HARNESS'S OWN tool_use_id and the raising's instance id — the two fields no session supplied",
    readJson(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`)).rows.some((x) =>
      x.evidence.tool_use_id === "toolu_test_unrouted" && x.gate_instance_id === declOpt.gate_instance_id));

  // A FREE-TEXT TAG IS UNAFFECTED, so the refusal above discriminates
  // rather than refusing every answer to this gate.
  const rdFree = join(gs, "rd-freetext");
  mkdirSync(rdFree, { recursive: true });
  writeFileSync(join(rdFree, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdFree, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("free") });
  const declFree = readJson(join(rdFree, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
  answerThroughHook("free", sentQ(rdFree, declFree), "testing", "toolu_test_freetext");
  const rFree = spawnSync(process.execPath,
    [selfPath, "run", "--run-dir", rdFree, "--workflow", tp], { input: payloadAnswering("toolu_test_freetext"), encoding: "utf8", env: envFor("free") });
  const recFree = readRunRecord(rdFree);
  ok("a free-text tag answer still advances — the unrouted refusal is bound to the declared option and not to the gate",
    rFree.status === 0 && !!recFree && recFree.owner_input.TAG_SELECTION === "testing"
      && recFree.completed.includes("TAG_SELECTION"),
    recFree ? JSON.stringify(recFree.owner_input) : `(no record) ${(rFree.stderr || "").slice(0, 120)}`);

  // AN ANSWER TO ANOTHER RAISING DOES NOT ANSWER THIS ONE, which is the
  // property the instance nonce exists for and the one a content-derived
  // key cannot have. Both runs are over the same survey, so both compose
  // the same question and the same option set and therefore the same
  // digest — the pair a digest is least able to tell apart.
  const rdTwin = join(gs, "rd-twin");
  mkdirSync(rdTwin, { recursive: true });
  writeFileSync(join(rdTwin, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTwin, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
  const declTwin = readJson(join(rdTwin, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
  ok("two raisings of one gate over one input compose an IDENTICAL option-set digest and DIFFERENT instance ids — so the nonce is doing work the digest cannot",
    // THE DIGEST'S WHOLE INPUT is `[gate_id, [option ids]]` on both sides of
    // the seam — `checks/check-gate-capture-hook.sh` holds the runtime's
    // and the hook's digests equal over it — so two raisings whose
    // canonical inputs are byte-equal digest identically (kogaki#1257:
    // compared at the input, the digest function being internal).
    JSON.stringify([declTwin.id, declTwin.options.map((o) => o.id)])
      === JSON.stringify([declFree.id, declFree.options.map((o) => o.id)])
      && declTwin.gate_instance_id !== declFree.gate_instance_id);
  // The twin's capture is handed the OTHER run's answered row verbatim.
  writeFileSync(join(rdTwin, `terrain${GATE_SCHEMA.capture.suffix}`),
    readFileSync(join(rdFree, `terrain${GATE_SCHEMA.capture.suffix}`), "utf8"));
  const rTwin = spawnSync(process.execPath,
    [selfPath, "run", "--run-dir", rdTwin, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
  const outTwin = `${rTwin.stdout || ""}${rTwin.stderr || ""}`;
  ok("a row answering a DIFFERENT raising does not advance this one — the join is on the instance id, never on the content two runs share",
    rTwin.status !== 0 && /none carries this raising's instance id/.test(outTwin),
    outTwin.trim().split("\n")[0].slice(0, 160));

  // TWO OUTSTANDING RAISINGS OF ONE QUESTION: the hook writes NOTHING
  // and says so, rather than choosing. Choosing would be the silent
  // misattribution the nonce exists to prevent, arriving one step earlier
  // through the narrowing that finds the pointer.
  const rdTwin2 = join(gs, "rd-twin-2");
  mkdirSync(rdTwin2, { recursive: true });
  writeFileSync(join(rdTwin2, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTwin2, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
  const rTwoOpen = answerThroughHook("shared", sentQ(rdTwin, declTwin), "testing", "toolu_test_ambiguous");
  ok("with two outstanding gates carrying one question the hook writes no row and names the ambiguity, rather than picking one",
    /does not choose between them/.test(`${rTwoOpen.stdout || ""}${rTwoOpen.stderr || ""}`),
    `${rTwoOpen.stderr || ""}`.trim().split("\n")[0].slice(0, 160));

  // A TRUNCATED LABEL IS REFUSED, NOT READ AS THE OWNER'S OWN WORDS
  // (PR #917 round 1, finding 4). The standing option's label is a full
  // sentence, so a label that arrives cut short would have fallen through
  // an exact comparison and been recorded as free text — landing a
  // declared option's text where a tag name goes and skipping the
  // unrouted refusal entirely, which is the wedge PR #898 closed
  // returning by another route.
  const rdTrunc = join(gs, "rd-truncated");
  mkdirSync(rdTrunc, { recursive: true });
  writeFileSync(join(rdTrunc, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTrunc, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("trunc") });
  const declTrunc = readJson(join(rdTrunc, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
  const fullLabel = declTrunc.options.find((o) => o.id === "other-method").label;
  answerThroughHook("trunc", sentQ(rdTrunc, declTrunc), fullLabel.slice(0, 24), "toolu_test_truncated");
  const rTrunc = spawnSync(process.execPath,
    [selfPath, "run", "--run-dir", rdTrunc, "--workflow", tp], { input: payloadAnswering("toolu_test_truncated"), encoding: "utf8", env: envFor("trunc") });
  const outTrunc = `${rTrunc.stdout || ""}${rTrunc.stderr || ""}`;
  const recTrunc = readRunRecord(rdTrunc);
  ok("a TRUNCATED option label is refused rather than recorded as free text — a near-miss is not silently read as the owner's own words",
    rTrunc.status !== 0 && /could not be resolved to an option or to free text/.test(outTrunc)
      && recTrunc.owner_input.TAG_SELECTION === undefined,
    outTrunc.trim().split("\n")[0].slice(0, 170));
  // A RE-WRAPPED label is still the same answer, so the refusal above
  // discriminates rather than refusing every label that is not byte-equal.
  const rdWrap = join(gs, "rd-rewrapped");
  mkdirSync(rdWrap, { recursive: true });
  writeFileSync(join(rdWrap, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdWrap, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("wrap") });
  const declWrap = readJson(join(rdWrap, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
  const wrapped = declWrap.options.find((o) => o.id === "other-method").label.replace(/ /g, "\n  ");
  answerThroughHook("wrap", sentQ(rdWrap, declWrap), wrapped, "toolu_test_rewrapped");
  const rWrap = spawnSync(process.execPath,
    [selfPath, "run", "--run-dir", rdWrap, "--workflow", tp], { input: payloadAnswering("toolu_test_rewrapped"), encoding: "utf8", env: envFor("wrap") });
  ok("a RE-WRAPPED label still resolves to its option — whitespace is presentation, and the near-miss refusal is not a refusal of every inexact label",
    rWrap.status !== 0 && /ROUTED NOWHERE/.test(`${rWrap.stdout || ""}${rWrap.stderr || ""}`),
    `${rWrap.stdout || ""}${rWrap.stderr || ""}`.trim().split("\n").slice(-1)[0].slice(0, 150));

  // AN ORPHANED POINTER IS REAPED, so one abandoned run cannot wedge a
  // whole gate class on the machine (PR #917 round 1, finding 3). The
  // question is a constant string, so every later raising would otherwise
  // match the orphan and the ambiguity arm would write nothing forever.
  const rdOrphan = join(gs, "rd-orphan");
  mkdirSync(rdOrphan, { recursive: true });
  writeFileSync(join(rdOrphan, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOrphan, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("orphan") });
  rmSync(rdOrphan, { recursive: true, force: true });   // the abandoned run
  const rdAfter = join(gs, "rd-after-orphan");
  mkdirSync(rdAfter, { recursive: true });
  writeFileSync(join(rdAfter, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdAfter, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("orphan") });
  const declAfter = readJson(join(rdAfter, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
  const rAfterHook = answerThroughHook("orphan", sentQ(rdAfter, declAfter), "a-tag", "toolu_test_after_orphan");
  const rAfter = spawnSync(process.execPath,
    [selfPath, "run", "--run-dir", rdAfter, "--workflow", tp], { input: payloadAnswering("toolu_test_after_orphan"), encoding: "utf8", env: envFor("orphan") });
  const recAfter = readRunRecord(rdAfter);
  ok("a pointer whose run was deleted is REAPED, so the next raising of that gate is not wedged by the orphan",
    /is reaped: its declaration/.test(`${rAfterHook.stdout || ""}${rAfterHook.stderr || ""}`)
      && rAfter.status === 0 && recAfter.owner_input.TAG_SELECTION === "a-tag",
    `${rAfterHook.stderr || ""}`.trim().split("\n")[0].slice(0, 150));

  // ANOTHER QUESTION'S PAYLOAD DOES NOT ADVANCE THIS GATE (kogaki#1075).
  // The row is on disk and answers THIS raising, so every check above it
  // passes; what refuses is the payload, which answered something else.
  // This is the live shape of 2026-09-10: a parked run, a cleanup
  // question in another session, and an executor that read the last
  // capture and moved. The hook is the first reader and this is the
  // second, so a direct invocation reaches the same stop.
  {
    const rdOther = join(gs, "rd-other-question");
    mkdirSync(rdOther, { recursive: true });
    writeFileSync(join(rdOther, RUN_RECORD_FILE), JSON.stringify({
      workflow: { path: tp, version: 1 }, survey_record: surveyPath,
      completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
      awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
      gate_declarations_owed: [], transitions: [], done: false,
    }));
    spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
      { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("other") });
    const declOther = readJson(join(rdOther, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
    answerThroughHook("other", sentQ(rdOther, declOther), "a-tag", "toolu_the_gates_own_question");
    const rElse = spawnSync(process.execPath,
      [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
      { input: payloadAnswering("toolu_some_other_sessions_cleanup_plan"), encoding: "utf8", env: envFor("other") });
    const outElse = `${rElse.stdout || ""}${rElse.stderr || ""}`;
    const recElse = readRunRecord(rdOther);
    ok("a payload from a question that did not answer this gate REFUSES the advance by name, however open the run is",
      rElse.status !== 0
        && /no captured row for gate/.test(outElse)
        && /toolu_some_other_sessions_cleanup_plan/.test(outElse),
      outElse.trim().split("\n")[0].slice(0, 170));
    ok("that refusal advances nothing and leaves the wait outstanding — the run is re-offered its gate rather than walked by someone else's question",
      !!recElse && recElse.awaiting === "TAG_SELECTION"
        && !recElse.completed.includes("TAG_SELECTION")
        && recElse.owner_input.TAG_SELECTION === undefined,
      recElse ? JSON.stringify({ awaiting: recElse.awaiting, completed: recElse.completed }) : "(no record)");
    // ...AND THE GATE'S OWN PAYLOAD STILL ADVANCES IT, so the refusal
    // discriminates rather than closing the route it guards.
    const rOwn = spawnSync(process.execPath,
      [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
      { input: payloadAnswering("toolu_the_gates_own_question"), encoding: "utf8", env: envFor("other") });
    const recOwn = readRunRecord(rdOther);
    ok("the gate's OWN question advances it — the payload check narrows to the question that answered, and refuses nothing else",
      rOwn.status === 0 && !!recOwn && recOwn.owner_input.TAG_SELECTION === "a-tag"
        && recOwn.completed.includes("TAG_SELECTION"),
      recOwn ? JSON.stringify(recOwn.owner_input) : `(no record) ${(rOwn.stderr || "").slice(0, 140)}`);
  }

  // A RE-RAISING SUPERSEDES ITS OWN POINTER, so the recovery this file
  // prescribes — re-render after a refusal — does not itself accumulate
  // the orphans that wedge the gate.
  const rdRe = join(gs, "rd-reraise");
  mkdirSync(rdRe, { recursive: true });
  writeFileSync(join(rdRe, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  for (let i = 0; i < 3; i++) {
    rmSync(join(rdRe, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`), { force: true });
    const rec = readRunRecord(rdRe);
    rec.gate_declarations_owed = [];
    writeFileSync(join(rdRe, RUN_RECORD_FILE), JSON.stringify(rec));
    spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdRe, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("reraise") });
  }
  ok("three raisings of one gate in one run leave exactly ONE pointer — the prescribed recovery does not accumulate the orphans it would then be blocked by",
    readdirSync(gatesFor("reraise")).filter((f) => f.endsWith(".json")).length === 1,
    `${readdirSync(gatesFor("reraise")).length} pointer(s)`);

  // THE POINTER NAMES WHO OPENED IT (kogaki#1051). The hook admits the
  // prompt that invoked the skill for a `skill-expansion` pointer and for
  // no other, so the field has to be on the file the start act writes --
  // and it has to be the OTHER value on the file an advance writes, or
  // every gate in every run would admit typed text.
  const readOnly = (name) => {
    const dir = gatesFor(name);
    if (!existsSync(dir)) return null;
    const f = readdirSync(dir).filter((x) => x.endsWith(".json"))[0];
    return f ? readJson(join(dir, f)) : null;
  };
  ok("a pointer written under a hook-attributed advance records `opened_by: hook` — the ordinary gate, where a turn has run by construction",
    (readOnly("reraise") || {}).opened_by === "hook",
    JSON.stringify((readOnly("reraise") || {}).opened_by));

  // AND THE START ATTRIBUTION WRITES THE OTHER VALUE. The case above is the
  // whole wiring (`hook` reaches the pointer only through `cmdRun`'s
  // `setOpenedBy(advancedBy)`); what remains is the VALUE the start act carries,
  // which ITEM 1 above asserts is `executor: "skill-expansion"`.
  //
  // DRIVEN THROUGH `start` (kogaki#1257): the start act mints its own record and
  // its first state is the survey, which the fake gateway serves, so a two-state
  // table (`survey`, then the tag gate) carries it to a gate and the pointer it
  // writes is read as written.
  {
    const startGates = gatesFor("startwriter");
    const swDir = join(gs, "start-writer");
    const swTable = join(swDir, "table.json");
    mkdirSync(swDir, { recursive: true });
    writeFileSync(swTable, JSON.stringify({ version: 1, states: [
      { id: "survey", kind: "compute" },
      { id: "TAG_SELECTION", kind: "wait", owner_supplies: "one tag name, or the standing option",
        renders_gate_declaration: true, gate_id: "terrain-tag-selection" },
      { id: "done", kind: "terminal" },
    ] }));
    const rSW = terrain(["start", "--run-dir", join(swDir, "rd"), "--workflow", swTable],
      { env: { ...envFor("startwriter"), ...gateway(swDir, LONE_ANSWERS) } });
    ok("a pointer written under the START attribution records `opened_by: skill-expansion` — the one state in which no model turn can yet have run, and the one the prompt arm admits",
      rSW.status === 0 && existsSync(startGates) && (readOnly("startwriter") || {}).opened_by === "skill-expansion",
      JSON.stringify((readOnly("startwriter") || {}).opened_by || rSW.out.trim().split("\n").slice(-1)[0].slice(0, 140)));
  }
}

finish("terrain-executor-cases.mjs");
