#!/usr/bin/env node
// checks/terrain-judgment-cases.mjs — judgment provenance and the display line.
// One section of the Terrain runtime's fixture pass, cut from the one case file
// by kogaki#1459. Run by checks/check-terrain-runtime.sh, which sums every case
// file's count line against the registry's `case_floor`; the shared fixtures
// are checks/fixtures/terrain-cases/helpers.mjs.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadGrammar, validateSurface } from "../src/format-guard.mjs";
import {
  readJson, REPORT_FORMAT, RUN_RECORD_FILE, DISPLAY_WRAP_COLUMNS,
  FIXTURE_PAYLOAD, terrain, SCRATCH, ok, tagStopFixture, fixFixture, finish,
} from "./fixtures/terrain-cases/helpers.mjs";
const { rd, tp } = tagStopFixture();
const { FIX_GW, fixSurvey, FIX_SUBDIVISIONS, STUB_JUDGE, SHIPPED_TABLE } = fixFixture();

// ---- JUDGMENT PROVENANCE (kogaki#892). A subdivisions record's own
// `judged: true` and declared judge pin used to reach both owner surfaces as an
// assertion the Harness stood behind. These cases assert that what the Harness
// never observed is not rendered as observed, and that the observed form is
// still emittable, so the repair is a split and not a blanket downgrade.
//
// BOTH ARMS ARE READ OFF WHAT THE COMMANDS WROTE (kogaki#1257): the declared
// arm is `cotags` and `report` handed `--subdivisions`; the observed arm is a
// run whose `J2_subdivision` asked a stub judge itself. Hand-built invocation
// records carried an `id` the executor never writes, so the old cases passed
// while every real observed line named its record `undefined`.
const fixSha = createHash("sha256").update(readFileSync(FIX_SUBDIVISIONS)).digest("hex").slice(0, 16);
// The judge-pin block a display carries: its first line and every hanging
// continuation under it.
const pinBlock = (text, head) => {
  const lines = String(text).split("\n");
  const at = lines.findIndex((l) => l.startsWith(head));
  if (at < 0) return null;
  let end = at + 1;
  while (end < lines.length && lines[end].startsWith("  ")) end++;
  return lines.slice(at, end).join("\n");
};
const DECLARED_HEAD = "judge pin DECLARED — ";
const OBSERVED_HEAD = "judged by ";
const declaredDisplay = (model = "a-model") => terrain(["cotags", "--survey", fixSurvey(), "--tag", "fix",
  "--subdivisions", FIX_SUBDIVISIONS, "--judge-model", model, "--judge-effort", "high",
  "--rendering-dir", join(SCRATCH, "fix-cotags-rendering")], { env: FIX_GW });

// A run seeded past its waits over the fix fixture's stub judge (helpers.mjs).
const seededRun = (name, { states, ownerInput, survey = fixSurvey(), judge = {}, env = FIX_GW, extra = [] }) => {
  const d = join(SCRATCH, `seeded-${name}`);
  const rd = join(d, "rd");
  mkdirSync(rd, { recursive: true });
  const table = {
    version: SHIPPED_TABLE.version,
    judge: { ...SHIPPED_TABLE.judge, ...judge },
    owner_artifacts: SHIPPED_TABLE.owner_artifacts,
    states: SHIPPED_TABLE.states.filter((s) => states.includes(s.id)),
  };
  const tp = join(d, "table.json");
  writeFileSync(tp, JSON.stringify(table));
  writeFileSync(join(rd, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: table.version }, judge_binary: null, survey_record: survey,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [], awaiting: null,
    owner_input: ownerInput, artifacts_written: [], judgments: {}, gate_declarations_owed: [], transitions: [], done: false,
  }));
  const rendering = join(d, "rendering");
  const reports = join(d, "reports");
  const r = terrain(["run", "--run-dir", rd, "--workflow", tp, "--report-dir", reports, ...extra], {
    input: FIXTURE_PAYLOAD, env: { ...env, KOGAKI_JUDGE_CLI: STUB_JUDGE, KOGAKI_REPORTS_DIR: rendering },
  });
  const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
  return { ...r, rd, reports, display: read(join(rendering, "CoTagGroups.md")), report: read(join(rendering, "FullReport.md")) };
};
// The report the declared arm writes: the same pull, handed the record.
const fixReport = (name, extra = []) => {
  const d = join(SCRATCH, `fix-report-${name}`);
  const r = terrain(["report", "--survey", fixSurvey(), "--tag", "fix", "--ids", "G1,G2",
    "--judge-model", "a-model", "--judge-effort", "high", "--subdivisions", FIX_SUBDIVISIONS,
    "--report-dir", join(d, "reports"), "--rendering-dir", join(d, "rendering"), ...extra], { env: FIX_GW });
  const reports = join(d, "reports");
  const recFile = existsSync(reports) ? readdirSync(reports).find((f) => f.endsWith(".json")) : null;
  const rendering = join(d, "rendering", "FullReport.md");
  return { ...r, recordPath: recFile ? join(reports, recFile) : null,
    record: recFile ? readJson(join(reports, recFile)) : null,
    report: existsSync(rendering) ? readFileSync(rendering, "utf8") : "" };
};
const judgeLineOf = (report) => (String(report).split("\n").find((l) => l.startsWith("*Judge:*")) || "");
const noticeOf = (report, first) => {
  const lines = String(report).split("\n");
  const at = lines.findIndex((l) => l.startsWith(first));
  if (at < 0) return [];
  let end = at;
  while (end < lines.length && !lines[end].endsWith("*")) end++;
  return lines.slice(at, end + 1);
};
{
  const grammar = loadGrammar(REPORT_FORMAT);
  const admits = (surface, text) => text !== null && text !== ""
    && validateSurface(surface, text, grammar).every((v) => !/line_class_allowlist/.test(v));
  {
  const observedRun = seededRun("observed", {
    states: ["compose_input", "J2_subdivision", "cotag_groups", "full_report", "done"],
    ownerInput: { TAG_SELECTION: "fix", ID_SELECTION: "G1,G2" },
  });
  const declaredReport = fixReport("declared");
    const declaredText = declaredDisplay();
    const declared = pinBlock(declaredText.stdout, DECLARED_HEAD);
    const observed = pinBlock(observedRun.stdout, OBSERVED_HEAD);
    const declaredNotice = noticeOf(declaredReport.report, "*NO SPLIT IS RECORDED");
    const observedNotice = noticeOf(observedRun.report, "*The judgment produced NO split");

    // THE STATE, not the text: a pull handed its record on argv invokes no
    // judge, so the only provenance it can compute is `declared`, and the
    // record it writes says so with no invocation record beside it.
    ok("terrain invokes no judge, so a computed provenance is DECLARED and carries no invocation record",
      declaredReport.status === 0 && !!declaredReport.record
      && declaredReport.record.judgment_provenance.state === "declared"
      && declaredReport.record.judgment_provenance.invocation === null);

    // The sha is taken by THIS layer from the bytes on disk — the one thing
    // about the judgment the Harness actually observed.
    ok("the provenance takes the subdivisions record's sha from the bytes on disk, not from anything the record declares",
      !!declaredReport.record && declaredReport.record.judgment_provenance.artifact_sha === fixSha && fixSha.length === 16);

    // The display line. The pre-#892 text is the discriminator: a line that
    // still opens `judged by` under a DECLARED provenance is the defect.
    ok("under a declared provenance the display says the pin is DECLARED and does not say the judgment was observed",
      declared !== null && /^judge pin DECLARED — a-model \/ high\./.test(declared)
      && !/^judged by/m.test(declaredText.stdout)
      && declared.includes(fixSha));
    ok("the OBSERVED form is still composable and names the Harness's own invocation record — the repair is a split, not a blanket downgrade",
      observedRun.status === 0 && observed !== null
      // The table pins a model and no effort (kogaki#1307), so the observed pin's
      // effort is the literal `unset` the runtime records rather than a tier.
      && /^judged by claude-opus-5 \/ unset — OBSERVED/.test(observed)
      && /`J2_subdivision@\d{4}-\d\d-\d\dT[^`]+`/.test(observed)
      && !observed.includes("undefined"));

    // Both forms must reach the surface: a grammar admitting only the one the
    // runtime happens to emit today would refuse the other the moment a
    // judge-invoking act existed, which is the amend-it-later shape the
    // superseded entry beside it records.
    ok("cotag_groups admits BOTH judge-pin lines judgePinLine actually composes",
      declaredText.status === 0 && admits("cotag_groups", declared) && admits("cotag_groups", observed));

    // Acceptance 2. `no split recorded` under a declaration; the judged-empty
    // wording only where the judgment was observed.
    ok("a judged-empty group renders NO SPLIT IS RECORDED under a declared provenance, and the judged-empty wording only under an observed one",
      declaredNotice.length > 0
      && !declaredReport.report.includes("this is a judged-empty outcome")
      && observedNotice.join(" ").includes("this is a judged-empty outcome"));
    ok("full_report admits BOTH judged-empty notices judgedEmptyNoticeLines actually composes",
      admits("full_report", declaredNotice.join("\n")) && admits("full_report", observedNotice.join("\n")));

    // A report record written before the field existed renders DECLARED. The
    // direction matters: the safe default for a record that cannot show an
    // observation is the state that claims none.
    // ---- kogaki#919. The display line was ONE unwrapped string of roughly
    // 450 characters, emitted once per subdivided group — on the terminal,
    // which is the surface kogaki#317 exists to keep readable under wrapping,
    // while the report's counterpart notice carrying the same content was
    // hand-wrapped. These cases bound the width rather than describe it.
    ok("both judge-pin arms render inside the display wrap column, and no line of either exceeds it",
      [declared, observed].every((text) => text !== null && text.split("\n").length > 1
        && text.split("\n").every((l) => l.length <= DISPLAY_WRAP_COLUMNS)));
    // The column is TAKEN from the report notice, so the two surfaces cannot
    // wrap at two columns. This case is what binds them: widen one and the
    // other's own lines are measured against it.
    ok("the wrap column still fits the report notice it was taken from, on both of that notice's arms",
      declaredNotice.length > 0 && observedNotice.length > 0
      && [...declaredNotice, ...observedNotice].every((l) => l.length <= DISPLAY_WRAP_COLUMNS));
    // A value the owner might copy is never split across lines. The token
    // longer than the column is a model id: it rides the head, which is
    // emitted whole on the first line however long.
    ok("wrapping breaks on spaces only — a token longer than the column is emitted whole rather than broken",
      declared !== null && declared.includes(`\`${fixSha}\``)
      && observed !== null && /`J2_subdivision@[^`\s]+`/.test(observed)
      && (() => {
        const long = "x".repeat(120);
        const block = pinBlock(declaredDisplay(long).stdout, DECLARED_HEAD);
        return block !== null && block.split("\n")[0].includes(long);
      })());
    // Continuations are marked, and the grammar keys on the mark. A flush-left
    // continuation reads as a new statement, and would need a bare-placeholder
    // class to admit — which is what makes an allowlist inert.
    ok("continuation lines carry the hanging indent both arms' grammar class keys on",
      [declared, observed].every((text) => text !== null
        && text.split("\n").slice(1).every((l) => l.startsWith("  "))
        && !text.split("\n")[0].startsWith(" ")));
    // ---- kogaki#918. The provenance clause was composed against EVERY pin,
    // including the typed literal `none` — so the absence of a pin rendered
    // as `pin DECLARED`, an absence asserted as a declaration, which is #892's
    // own class one step over and arrived in the change that closed it.
    //
    // NO COMMAND MINTS A `none` PIN (kogaki#1257): `report` refuses a pull
    // without one before it writes, and a stored record carrying one never
    // shares an identity with a pull that has one, so it is recomputed rather
    // than re-rendered. The case asserts that refusal, which is what keeps the
    // absence from reaching the line at all.
    ok("a `none` pin renders no declaration: the report's judge line asserts nothing was declared and never says DECLARED",
      (() => {
        const d = join(SCRATCH, "fix-report-no-pin");
        const r = terrain(["report", "--survey", fixSurvey(), "--tag", "fix", "--ids", "G1",
          "--subdivisions", FIX_SUBDIVISIONS, "--report-dir", join(d, "reports"),
          "--rendering-dir", join(d, "rendering")], { env: FIX_GW });
        return r.status !== 0 && /may never mint a judge pin\s+of `none`/.test(r.stderr)
          && !(existsSync(join(d, "reports")) && readdirSync(join(d, "reports")).some((f) => f.endsWith(".json")))
          && !existsSync(join(d, "rendering", "FullReport.md"));
      })());
    // The direction a downgrade case is usually blind in: the two pinned arms
    // must still assert what they always did, or the repair is a blanket
    // silencing rather than a third arm.
    const declaredLine = judgeLineOf(declaredReport.report);
    const observedLine = judgeLineOf(observedRun.report);
    ok("a pinned report judge line still says DECLARED where the Harness observed nothing, and OBSERVED where it did",
      /pin DECLARED, no Harness invocation record/.test(declaredLine)
      && /OBSERVED, Harness invocation record `J2_subdivision@[^`]+`/.test(observedLine));
    // Acceptance 2. The rerun path re-renders a PRIOR record through this
    // same composer, so the clause must describe the RECORD; `observed:` read
    // as a claim about the run that re-read it, and a pre-#892 record
    // re-rendered by a `--subdivisions` rerun said the rerun observed nothing.
    ok("the report judge line names what the RECORD holds and never what the run passed, on all three arms",
      [declaredLine, observedLine]
        .every((line) => line !== "" && /the record holds:|over subdivisions record sha/.test(line)
          && !/observed: /.test(line)));
    ok("full_report admits all three judge lines reportJudgeLine actually composes",
      admits("full_report", declaredLine) && admits("full_report", observedLine));

    // THE PRIOR RECORD, RE-RENDERED. A second identical pull replays the
    // stored record through the same renderer, so what the record carries is
    // what the rendering says: the field removed, and the field naming an
    // observation.
    ok("a report record carrying no judgment_provenance reads as DECLARED rather than as observed",
      (() => {
        const rerender = (name, edit) => {
          const first = fixReport(name);
          if (!first.recordPath) return "";
          const rec = readJson(first.recordPath);
          edit(rec);
          writeFileSync(first.recordPath, JSON.stringify(rec));
          return judgeLineOf(fixReport(name).report);
        };
        const absent = rerender("prov-absent", (rec) => { delete rec.judgment_provenance; });
        const observedRec = rerender("prov-observed", (rec) => {
          rec.judgment_provenance = { state: "observed", artifact_sha: fixSha,
            invocation: { state: "J2_subdivision", at: "2026-01-01T00:00:00.000Z" } };
        });
        return /pin DECLARED, no Harness invocation record; the record holds: no subdivisions record/.test(absent)
          && /OBSERVED, Harness invocation record `J2_subdivision@2026-01-01T00:00:00.000Z`/.test(observedRec);
      })());
  }
  // ---- PR #921 round 1 finding 1. THE PIN IS COMPOSER-SUPPLIED AND UNBOUNDED:
  // a long enough `model_id` wrapped the pin clause off line 1, no class matched,
  // and `emitOrRefuse` refused the whole cotag_groups surface. The case is stated
  // over the LENGTH, sweeping through and past the width, so a later change to the
  // column, head or form meets every crossing. The declared arm sweeps `cotags`;
  // the observed arm a run whose table pins the long model.
  // TWO CASES OVER TWO HALVES OF THE RANGE (kogaki#1425), cut where the lengths
  // cross the column, so neither is the longest single run of work in the pass.
  const pinSweepClassifies = (lengths) => lengths.every((n) => {
    const model = "m".repeat(n);
    const d = declaredDisplay(model);
    const o = seededRun(`long-pin-${n}`, {
      states: ["compose_input", "J2_subdivision", "cotag_groups", "done"],
      ownerInput: { TAG_SELECTION: "fix" }, judge: { model },
    });
    // The declared arm is handed `high` on argv; the observed arm's table
    // pins no effort, so it renders `unset` (kogaki#1307).
    return [[d, pinBlock(d.stdout, DECLARED_HEAD), "high"], [o, pinBlock(o.stdout, OBSERVED_HEAD), "unset"]]
      .every(([r, text, effort]) => r.status === 0 && text !== null
        && text.split("\n")[0].includes(`${model} / ${effort}`)
        && admits("cotag_groups", text));
  });
  {
    ok("a long composer-supplied judge pin still classifies — the pin clause is never wrapped off the first line, at any id length up to 48",
      pinSweepClassifies([1, 20, 45, 48]));
  }
  {
    ok("a long composer-supplied judge pin still classifies — the pin clause is never wrapped off the first line, at the id lengths from 52 to 140",
      pinSweepClassifies([52, 60, 80, 140]));
  }
}

finish("terrain-judgment-cases.mjs");
