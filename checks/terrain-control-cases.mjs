#!/usr/bin/env node
// checks/terrain-control-cases.mjs — the control plane.
// One section of the Terrain runtime's fixture pass, cut from the one case file
// by kogaki#1459. Run by checks/check-terrain-runtime.sh, which sums every case
// file's count line against the registry's `case_floor`; the shared fixtures
// are checks/fixtures/terrain-cases/helpers.mjs.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { laneDir } from "../src/runs.mjs";
import { readRunRecord } from "../src/workflow/run-record.mjs";
import {
  REPO, TERRAIN_SCRIPT, readJson, TERRAIN_WORKFLOW_TABLE, RUN_RECORD_FILE,
  FIXTURE_STATE_PREFIX, FIXTURE_RECORD_KEY_VALUE, FIXTURE_PAYLOAD, gateway,
  terrain, SCRATCH, LONE_ANSWERS, LONE_SUBDIVISIONS, ok, tagStopFixture,
  finish,
} from "./fixtures/terrain-cases/helpers.mjs";
const { selfPath, rd, tp } = tagStopFixture();

{
  // ---- the control plane CONTROL PLANE (story 1.89). Seam-free: every case below either
  // reads the shipped table or constructs a synthetic one, and no case
  // reaches the gateway. AC8: this pass needs no run record and emits no
  // owner surface.
  //
  // DRIVEN THROUGH `run` (kogaki#1257). A throwaway table is handed to the
  // executor with `--workflow`, and the counts and the baseline are read off
  // `run --status`, which renders both from the record and the table.
  const PAYLOAD_ENV = { input: FIXTURE_PAYLOAD };
  const runOver = (name, table, extra = []) => {
    const d = join(SCRATCH, `ctrl-${name}`);
    mkdirSync(d, { recursive: true });
    const tp = join(d, "table.json");
    writeFileSync(tp, JSON.stringify(table));
    const rd = join(d, "rd");
    const r = terrain(["run", "--run-dir", rd, "--workflow", tp, ...extra], PAYLOAD_ENV);
    return { ...r, rd, record: readRunRecord(rd) };
  };
  // The write-outcome classifier's three directions (PR #667 round 1 finding
  // 2). The executor's guard reads this, so these are the cases that separate
  // "wrote nothing deliberately" from "wrote and did not say where". Each
  // drives one write state whose fixture-only renderer returns the outcome
  // its own row carries, and reads the executor's verdict off the act.
  const outcomeRun = (name, outcome) => runOver(`outcome-${name}`, {
    version: 1,
    owner_artifacts: { display: { path: "reports/CoTagGroups.md", writer: "one" } },
    states: [
      { id: `${FIXTURE_STATE_PREFIX}returns_outcome`, kind: "write", writes: "display",
        ...(outcome === undefined ? {} : { fixture_outcome: outcome }) },
      { id: "done", kind: "terminal" },
    ],
  });
  const namedNothing = (r) => r.status !== 0 && /its renderer named no artifact/.test(r.stderr);
  ok("a renderer that names its artifact is `wrote`",
    (() => {
      const r = outcomeRun("wrote", { artifact: "reports/FullReport.md" });
      return r.status === 0 && !!r.record && r.record.done === true
        && r.record.artifacts_written.length === 1
        && r.record.artifacts_written[0].path === "reports/FullReport.md";
    })());
  ok("a renderer that RAN and deliberately wrote nothing is `wrote-nothing`, not a refusal — --no-render and the idempotent rerun are both this",
    (() => {
      const r = outcomeRun("wrote-nothing", { artifact: null });
      return r.status === 0 && !!r.record && r.record.done === true
        && r.record.artifacts_written.length === 0
        && r.record.completed.includes(`${FIXTURE_STATE_PREFIX}returns_outcome`);
    })());
  ok("a renderer returning nothing at all is `named-nothing` — the case the guard was built for",
    namedNothing(outcomeRun("nothing", undefined)));
  ok("an outcome object with no `artifact` KEY is `named-nothing` too, so a renderer cannot pass the guard by omitting the field",
    namedNothing(outcomeRun("no-artifact-key", { something_else: 1 })));

  // `run --status` over a record this pass writes, read against the shipped
  // table: the record's own counts, and the baseline derived from the table
  // beside the table's declared one.
  const status = (() => {
    const rd = join(SCRATCH, "ctrl-status");
    mkdirSync(rd, { recursive: true });
    writeFileSync(join(rd, RUN_RECORD_FILE), JSON.stringify({
      workflow: { path: TERRAIN_WORKFLOW_TABLE, version: readJson(TERRAIN_WORKFLOW_TABLE).version },
      completed: [], awaiting: null, done: false, owner_input: {},
      waits_reached: ["A", "B"],
      artifacts_written: [{ state: "x" }, { state: "y" }],
      judgments: { J1: "p", J2: "q" },
      conditional_entered: ["z"], conditional_skipped: [], gate_declarations_owed: [], transitions: [],
    }));
    return terrain(["run", "--status", "--run-dir", rd]);
  })();
  // The two blocks `--status` prints, each as name → number.
  const statusBlock = (heading) => {
    const lines = status.stdout.split("\n");
    const at = lines.findIndex((l) => l.startsWith(heading));
    const out = {};
    for (const l of at < 0 ? [] : lines.slice(at + 1)) {
      const m = /^  (\S+)\s+(\d+)/.exec(l);
      if (!m) break;
      out[m[1]] = Number(m[2]);
    }
    return out;
  };
  ok("the shipped workflow table loads under the structural rules",
    status.status === 0
    && status.stdout.includes("Workflow table: src/terrain-workflow.json")
    && Object.keys(statusBlock("derived from the TABLE")).length > 0);
  {
    // ACCEPTANCE ITEM 2's DENOMINATOR AGREES WITH ITSELF. The baseline this
    // executor counts against is DERIVED from the states array; the table
    // also carries a hand-written `counted_baseline`. They are two readings
    // of one array and a disagreement is a defect in the table, so the
    // fixture asserts they agree rather than trusting either alone.
    const disagree = status.stdout.split("\n").filter((l) => l.includes("DISAGREES with counted_baseline"));
    ok(`the table's counted_baseline agrees with the baseline derived from its own states array${disagree.length ? ` (disagrees on: ${disagree.map((l) => l.trim()).join(", ")})` : ""}`,
      status.status === 0 && Object.keys(statusBlock("derived from the TABLE")).length > 0 && disagree.length === 0);
  }
  ok("run counts read from a record alone, with conditional entries counted separately",
    (() => {
      const c = statusBlock("counted from the RUN RECORD");
      return c.waits === 2 && c.owner_artifact_writes === 2
        && c.judgment_points === 2 && c.conditional_states_entered === 1;
    })());

}
{
  {
    // THE REFUSING DIRECTIONS, each against a fixture that exists to fail.
    // `fail()` exits the process, so these run as subprocesses — the same
    // shape the registered checks use, and the only one that can observe an
    // exit code from inside a fixture pass.
    const selfPath = TERRAIN_SCRIPT;
    const scratch = join(tmpdir(), `terrain-selftest-${process.pid}`);
    mkdirSync(scratch, { recursive: true });
    const refuses = (name, table, extra = []) => {
      const tp = join(scratch, `${name.replace(/[^a-z0-9]+/gi, "-")}.json`);
      const rd = join(scratch, `rd-${name.replace(/[^a-z0-9]+/gi, "-")}`);
      mkdirSync(rd, { recursive: true });
      if (table !== null) writeFileSync(tp, JSON.stringify(table));
      const r = spawnSync(process.execPath,
        [selfPath, "run", "--run-dir", rd, "--workflow", table === null ? TERRAIN_WORKFLOW_TABLE : tp, ...extra],
        { input: FIXTURE_PAYLOAD, encoding: "utf8" });
      return r.status !== 0;
    };
    const terminal = { id: "done", kind: "terminal" };

    // A REFUSAL IS NOT A ROLLBACK (kogaki#808). The specimen was
    // `J3_neighborhood`: its input state wrote the candidate enumeration, the
    // judgment state then refused, and `fail()` exited before the loop's own write,
    // so the file was on disk and the record did not name it.
    //
    // The arm drives the property rather than the specimen, because that input
    // state reads the seam: what was lost was a completed transition discarded by a
    // later refusal in the same act, which this fixture stages. THE REFUSAL MUST
    // FIRE INSIDE THE LOOP: an uninterpretable kind is refused at load, before any
    // state completes, and passed against the unfixed runtime. The fixture refuses
    // at the renderer binding, a per-state check made after earlier states ran.
    {
      const tp = join(scratch, "refusal-persists.json");
      const rd = join(scratch, "rd-refusal-persists");
      mkdirSync(rd, { recursive: true });
      writeFileSync(tp, JSON.stringify({ version: 1, states: [
        { id: "a", kind: "compute" },
        // THE CONDITIONAL STATE IS NOW SKIPPED RATHER THAN ENTERED
        // (kogaki#1027). `--enter` was the selector that entered one and it is
        // deleted, so the loop-bookkeeping FIELD this arm needs beside
        // `completed` is `conditional_skipped` instead of
        // `conditional_entered`. The property under test is unchanged — a
        // refusal persists what the act completed, fields included — and it
        // is asserted over the field the loop still writes.
        { id: "cond", kind: "compute", conditional: "never entered: the selector that entered a conditional state is deleted (kogaki#1027)" },
        { id: `${FIXTURE_STATE_PREFIX}sets_record_key`, kind: "compute" },
        { id: "unrendered", kind: "write", writes: "display" },
        terminal,
      ] }));
      const r = spawnSync(process.execPath,
        [selfPath, "run", "--run-dir", rd, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8" });
      const persisted = readRunRecord(rd);
      ok("a refusal raised inside a run still refuses — exit is non-zero and the message is the refusal's own",
        r.status !== 0 && /no renderer bound to it/.test(r.stderr || ""), (r.stderr || "").trim().slice(0, 120));
      ok("a refusal PERSISTS the run record, so the transitions the same act completed survive it (kogaki#808)",
        persisted !== null, "no run record was written at all");
      ok("the persisted record names the state that completed before the refusal — a refusal stops being a rollback of what preceded it",
        !!persisted && Array.isArray(persisted.completed) && persisted.completed.includes("a"),
        persisted ? JSON.stringify(persisted.completed) : "(no record)");
      // A FIELD BESIDE THE COMPLETION LIST (PR #821 round 1). The loss #808 names
      // is a FIELD, so a pass asserting `completed` alone stays green through a later
      // narrowing of what is persisted.
      //
      // `conditional_entered` IS LOOP BOOKKEEPING (kogaki#824, correcting 91b4947):
      // the executor writes it beside `rec.completed.push(st.id)`. So this case
      // NARROWS the seam and does not close it: it fails a persist reduced to
      // `{completed}` alone and passes one reduced to control fields. The case below
      // binds the property; the two are kept apart so each claim has one assertion.
      ok("the persisted record carries a FIELD the loop set — not only the list of what completed",
        !!persisted && Array.isArray(persisted.conditional_skipped) && persisted.conditional_skipped.includes("cond"),
        persisted ? JSON.stringify(persisted.conditional_skipped) : "(no record)");
      // THE CASE THAT BINDS THE PROPERTY (kogaki#824). `fixture_record_key` is
      // written by the fixture-only state's OWN RENDERER and by nothing else —
      // no loop touches it — so a persist reduced to control fields drops it
      // and this case alone goes red. That is the discrimination the case
      // above cannot make, and it is asserted on the VALUE rather than on
      // presence, so a persist that carried the key with its contents lost
      // fails too.
      ok("the persisted record carries a key written by a STATE'S OWN RENDERER, which is the shape of the loss #808 names — a persist narrowed to control fields drops this while keeping the case above green",
        !!persisted && persisted.fixture_record_key === FIXTURE_RECORD_KEY_VALUE,
        persisted ? JSON.stringify(persisted.fixture_record_key) : "(no record)");
      // THE FIXTURE-ONLY ADMISSION IS BOUNDED BY THIS CASE, never by the
      // comment in `STATE_WORK`. The workflow table puts the state set in the carrier, so
      // what makes the renderer above harmless is that its id never reaches
      // `src/terrain-workflow.json` — asserted here rather than trusted, because an
      // admission whose whole guarantee is a comment is the class kogaki#824
      // is a member of.
      {
        // THE UNREADABLE-CARRIER GUARD IS DECLINED, AND THE DECLINE IS
        // MEASURED (PR #852 round 1, out-of-dimension). The observation — that
        // an unreadable `src/terrain-workflow.json` would abort here with a parse
        // error rather than failing this case by name — is correct in
        // principle and UNREACHABLE at this head: the module reads the same
        // carrier at evaluation time, so a malformed table kills the process
        // at import and this case never runs. Verified by writing `{ not json`
        // into the carrier: the pass dies in ModuleJob.run and prints no case
        // at all. A try/catch here would be dead code, which is the shape this
        // PR exists to argue against.
        const shipped = readJson(TERRAIN_WORKFLOW_TABLE);
        const leaked = (shipped.states || []).map((x) => String(x.id))
          .filter((id) => id.startsWith(FIXTURE_STATE_PREFIX));
        ok("the shipped workflow table names no fixture-only state — the STATE_WORK admission is bounded by a case, not by a comment",
          Array.isArray(shipped.states) && shipped.states.length > 0 && leaked.length === 0,
          JSON.stringify(leaked));
      }
      ok("the persisted record carries no internal run-directory handle — the refusal path writes the same shape the loop's own write does",
        !!persisted && persisted._dir === undefined);
    }

    // ITEM 2 OF THE SAME ISSUE: the flag existed, the table named it, and the
    // one surface an owner reads did not. Asserted here because a usage block
    // is exactly the kind of prose that drifts from the argument it documents
    // with nothing observing the gap.
    {
      const r = spawnSync(process.execPath, [selfPath], { encoding: "utf8" });
      const usage = (r.stdout || "") + (r.stderr || "");
      ok("`run` usage names --neighborhood, the flag whose absence was previously discoverable only from a refusal",
        /run \[--run-dir[\s\S]{0,400}--neighborhood F/.test(usage));
      ok("`report` usage names the identity QUADRUPLE rather than the triple it was widened from at kogaki#741",
        /QUADRUPLE \(substrate pin/.test(usage) && !/identified by the TRIPLE/.test(usage));
    }

    ok("a table declaring no states is refused",
      refuses("no-states", { version: 1, states: [] }));
    ok("a duplicate state id is refused",
      refuses("dup-id", { version: 1, states: [{ id: "a", kind: "compute" }, { id: "a", kind: "compute" }, terminal] }));
    ok("a kind this executor does not interpret is refused, rather than skipped",
      refuses("bad-kind", { version: 1, states: [{ id: "a", kind: "sideways" }, terminal] }));
    ok("a write state naming no artifact is refused",
      refuses("write-no-artifact", { version: 1, states: [{ id: "a", kind: "write" }, terminal] }));
    ok("a table with no terminal state is refused — the end of a run is read from the table, never from position",
      refuses("no-terminal", { version: 1, states: [{ id: "a", kind: "compute" }] }));
    ok("a write state with no renderer bound to it is refused, never invented and never skipped",
      refuses("write-no-renderer", {
        version: 1,
        owner_artifacts: { display: { path: "reports/CoTagGroups.md", writer: "one" } },
        states: [{ id: "not_a_shipped_state", kind: "write", writes: "display" }, terminal],
      }));
    ok("an owner input arriving with no outstanding wait is refused — the WAIT is what admits it",
      refuses("input-no-wait", null, ["--input", "claude-code-ops"]));
    rmSync(scratch, { recursive: true, force: true });
  }

}
{
  // THE LANE BINDING (kogaki#750). Every case above drives an explicit
  // `--run-dir`, which is the path the relocation did NOT touch, so on their
  // own they are green about a runtime still writing to the retired home
  // directory. These read the DEFAULTS.
  //
  // THE DEFAULT IS READ OFF A `report` THE COMMAND WROTE (kogaki#1257), from a
  // copy of `src/` under the scratch root: the lane resolves beside the
  // runtime's own file, so the copy's default lane is a scratch directory and
  // the act leaves nothing in this repository's `runs/`. `policy/` is linked
  // rather than copied, because the transport is read from beside it.
  {
    const laneRoot = laneDir("terrain");
    const stub = join(SCRATCH, "lane-stub");
    mkdirSync(stub, { recursive: true });
    cpSync(join(REPO, "src"), join(stub, "src"), { recursive: true });
    symlinkSync(join(REPO, "policy"), join(stub, "policy"));
    const reportArgs = (extra) => [join(stub, "src", "terrain.mjs"), "report",
      "--survey", join(REPO, "checks", "fixtures", "survey", "lone-tag-member.json"), "--tag", "testing", "--ids", "G2",
      "--judge-model", "fixture-model", "--judge-effort", "low",
      "--subdivisions", LONE_SUBDIVISIONS, "--rendering-dir", join(stub, "rendering"), ...extra];
    const recordAt = (r) => {
      const m = /^machine record \(JSON[^)]*\): (.+\.json)$/m.exec(`${r.stdout || ""}${r.stderr || ""}`);
      return m ? m[1] : null;
    };
    const env = { ...process.env, ...gateway(join(stub, "gw"), LONE_ANSWERS), KOGAKI_DEBUG: "1" };
    delete env.KOGAKI_RUN_DIR;
    const byDefault = spawnSync(process.execPath, reportArgs([]), { encoding: "utf8", cwd: REPO, env });
    const defaultRecord = recordAt(byDefault);
    ok("the report record store defaults into the terrain lane",
      byDefault.status === 0 && defaultRecord !== null
      && dirname(defaultRecord) === join(stub, "runs", "terrain", "reports"), defaultRecord);
    ok("the terrain lane resolves under the repository's runs/ directory",
      laneRoot === join(REPO, "runs", "terrain"), laneRoot);
    ok("no default record destination resolves under a home directory",
      defaultRecord !== null && !defaultRecord.includes(`${sep}.kogaki${sep}`));
    const elsewhere = join(stub, "elsewhere");
    const explicit = recordAt(spawnSync(process.execPath, reportArgs(["--report-dir", elsewhere]), { encoding: "utf8", cwd: REPO, env }));
    ok("an explicit --report-dir still wins over the lane default",
      explicit !== null && dirname(explicit) === elsewhere);
    // NOT ASSERTED HERE, stated rather than left to look covered: `runDir`'s
    // DEFAULT branch. Exercising it calls `enterRun`, which prunes this
    // repository's own terrain lane — a fixture pass that evicts a
    // developer's run workspaces reports a defect by causing one. The
    // arithmetic it delegates to is asserted in `src/runs.mjs --self-test`
    // against a scratch root; what is unasserted here is one expression
    // naming the lane, and that is the honest size of the gap.
    ok("an explicit --run-dir is honoured and creates exactly it", (() => {
      const d = join(SCRATCH, "explicit-run-dir", "made-by-the-command");
      const r = terrain(["survey", "--run-dir", d], { env: gateway(join(SCRATCH, "explicit-run-dir-gw"), LONE_ANSWERS) });
      return r.status === 0 && existsSync(d)
        && readdirSync(d).some((f) => f.endsWith(".terrain-survey.json"))
        && r.stdout.includes(`Survey record: ${d}${sep}`);
    })());
  }
}

finish("terrain-control-cases.mjs");
