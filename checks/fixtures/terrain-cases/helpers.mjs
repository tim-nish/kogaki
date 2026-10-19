// checks/fixtures/terrain-cases/helpers.mjs — the shared fixtures of the Terrain
// runtime's fixture pass: the carriers, the oracle strings, the fake gateway, the
// `terrain()` and `drive()` helpers, the case counter, and the two fixtures more
// than one case file reads. Imported by every `checks/terrain-*-cases.mjs`
// (kogaki#1459, which cut the one case file into one per section).
//
// THE RUNTIME IS REACHED THROUGH ITS PRODUCTION SURFACE AND NOTHING ELSE
// (kogaki#1257): `node src/terrain.mjs <command>`, or an export `src/brief.mjs`
// or `src/draft.mjs` imports, with served material read through the real
// transport pointed at `checks/fixtures/fake-gateway/`.
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GATE_CALL_SUFFIX } from "../../../src/workflow/gate.mjs";

// The runtime file the subprocess cases spawn, named here because the file's
// own URL is this case file now, not the runtime.
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const TERRAIN_SCRIPT = join(REPO, "src", "terrain.mjs");
export const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// ---- THE CARRIERS THE RUNTIME READS, READ HERE FROM THE SAME FILES. These
// were imported from the runtime, which read them from these paths; reading the
// path is the same value with no export standing between.
export const GATE_SCHEMA = readJson(join(REPO, "src/gate-schema.json"));
export const GATES_REGISTRY = readJson(join(REPO, "src/gate-registry.json"));
export const REPORT_FORMAT = join(REPO, "src/report-format.json");
export const TERRAIN_WORKFLOW_TABLE = join(REPO, "src/terrain-workflow.json");
export const RUN_RECORD_FILE = "run-record.json";

// ---- THE STRINGS A CASE ASSERTS AGAINST, stated as the oracle. A case that
// compared a rendering against the runtime's own constant agreed with the
// runtime by construction; the literal is what an owner reads, so a change to
// it is a change a case should see.
export const NO_HEADLINE = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";
export const NO_SHARD_ADDRESSED = "⟨no Gloss shard carries this row — it carries no tag, or its family is outside the namespaces this path reads; a fault to clear, never substituted⟩";
export const NO_SEAM = "⟨no Gloss shard was read — the served seam was unreachable for this pull; a fault to clear, never substituted⟩";
export const NO_SHARD_NAME = "⟨the served enumeration names no Gloss shard for this row's tags — the address, not the material, is what is missing; a fault to clear, never substituted⟩";
export const NO_SHARD_SERVED = "⟨the served enumeration names no Gloss shard at all — the corpus is empty rather than misaddressed; a fault to clear, never substituted⟩";
export const NO_TARGET = "⟨no Thesis-candidate target on this row — ABNORMAL, a judged row reaching the renderer without one, never substituted⟩";
export const NO_JUDGE = "none";
// The display wrap column the judge-pin line and the report notice share
// (kogaki#919), as the owner surface measures it.
export const DISPLAY_WRAP_COLUMNS = 77;

// ---- THE FIXTURE-ONLY STATES the runtime admits to its renderer map
// (kogaki#824), named by the prefix it refuses in the shipped table.
export const FIXTURE_STATE_PREFIX = "__fixture_";
export const FIXTURE_RECORD_KEY_VALUE = "written by this state's own renderer";

// THE SYNTHESIZED HOOK PAYLOAD every fixture spawn feeds the executor
// (kogaki#1027). The executor advances only inside a harness hook event, so a
// fixture that drove it with no stdin would be testing the payload refusal and
// nothing else. Synthesized rather than captured, deliberately: the acceptance
// item is that a run driven by payloads ALONE reaches its end, and a payload
// this pass composes is one no session and no harness supplied.
export const FIXTURE_PAYLOAD = JSON.stringify({
  hook_event_name: "PostToolUse",
  session_id: "fixture-session",
  tool_use_id: "fixture-tool-use",
});

// ---- THE COMMAND SURFACE, AND THE SEAM IT READS (kogaki#1257).
//
// `terrain(args, opts)` runs one command of the runtime. `gateway(dir,
// answers)` points the transport at the fixture gateway with these answers and
// logs every call it receives into `dir`, so a case can assert WHICH addresses
// the runtime asked for as well as what it rendered from them. A command run
// without it reaches whatever gateway the machine has configured, so every case
// that reads served material passes one.
export const FAKE_GATEWAY = join(REPO, "checks", "fixtures", "fake-gateway", "gateway.mjs");
export function gateway(dir, answers) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "gateway-answers.json");
  writeFileSync(file, JSON.stringify(answers));
  return {
    TSUREZURE_GATEWAY_JS: FAKE_GATEWAY,
    KOGAKI_FAKE_GATEWAY: file,
    KOGAKI_FAKE_GATEWAY_LOG: join(dir, "gateway-calls.jsonl"),
  };
}
export function gatewayCalls(dir) {
  const f = join(dir, "gateway-calls.jsonl");
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}
// NO QUESTION-SHAPE COMMAND BY DEFAULT (kogaki#1257). That command is
// machine-local and outside this repository; a case not ABOUT the compose-time
// rule runs without it, so its outcome does not depend on the machine (and
// does not pay for the command on every gate a run reaches). The cases that
// are about the rule name the command in their own `env`.
export const NO_SHAPE_CMD = { KOGAKI_QUESTION_SHAPE_CMD: join(tmpdir(), "terrain-cases-no-question-shape-command") };
// AND THE DEFAULT REACHES EVERY SPAWN, not only the two helpers below
// (kogaki#1425): the cases that compose their own `{ ...process.env }` --
// the executor, pointer and report drives -- otherwise ran the real command on
// every gate they reached, 58 Python starts that were most of this pass's
// time. The machine's own setting is kept for the cases about the rule.
export const SHAPE_CMD_FROM_ENV = process.env.KOGAKI_QUESTION_SHAPE_CMD;
Object.assign(process.env, NO_SHAPE_CMD);
export function terrain(args, { input = "", env = {} } = {}) {
  const r = spawnSync(process.execPath, [TERRAIN_SCRIPT, ...args], {
    encoding: "utf8", input, cwd: REPO, env: { ...process.env, ...NO_SHAPE_CMD, ...env },
  });
  return { status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", out: `${r.stdout || ""}${r.stderr || ""}` };
}
// One production export, driven in a CHILD process: the runtime caches what it
// read from the seam per process (the served shard enumeration is read once),
// so a case whose answer depends on what the seam served gets a process of its
// own. The body sees every stage module's exports as `rt` -- never the entry
// point's, which exports nothing (kogaki#1259) -- and prints its result as the
// last line of stdout, JSON-encoded.
export const moduleUrl = (m) => pathToFileURL(join(REPO, "src", `${m}.mjs`)).href;
export const STAGE_URLS = ["workflow", "terrain"].flatMap((d) => readdirSync(join(REPO, "src", d))
  .filter((f) => f.endsWith(".mjs")).map((f) => moduleUrl(`${d}/${f.slice(0, -4)}`)));
export const STAGE_IMPORTS = STAGE_URLS.map((u, i) => `import * as rt${i} from ${JSON.stringify(u)};`).join("\n")
  + `\nconst rt = Object.assign({}, ${STAGE_URLS.map((_, i) => `rt${i}`).join(", ")});`;
export function drive(body, env = {}) {
  const r = spawnSync(process.execPath, ["--input-type=module", "-e",
    `${STAGE_IMPORTS}\n${body}`], {
    encoding: "utf8", cwd: REPO, env: { ...process.env, ...NO_SHAPE_CMD, ...env },
  });
  const last = (r.stdout || "").trim().split("\n").pop();
  try { return JSON.parse(last); } catch { return { driveFailed: true, status: r.status, stderr: (r.stderr || "").slice(0, 400) }; }
}
// A served element line, in the shape `element_survey` answers with.
export const servedLine = (rec, i = 0) => ({ text: JSON.stringify(rec), cite: `gloss/ELEMENTS.jsonl:${i + 1}@aaaaaaa` });
// A scratch root for every case below, removed at the end of the pass.
export const SCRATCH = mkdtempSync(join(tmpdir(), "terrain-cases-"));
// THE LONE-TAG FIXTURE'S SEAM AND SUBDIVISIONS. Every group of the fixture
// survey judged empty, keyed by group name as the record is; the seam serves
// one shard address and no Gloss line, so every row renders its marker.
export const LONE_ANSWERS = {
  element_survey: { lines: [servedLine({ kind: "lesson", slug: "alpha", tags: ["testing"] })], pin: "product-lab@aaaaaaa" },
  surface_names: { lines: [{ text: "lessons/tag=testing,window=2026-08" }] },
  gloss_index: { "*": { lines: [] } },
};
export const LONE_SUBDIVISIONS = join(SCRATCH, "lone-subdivisions.json");
writeFileSync(LONE_SUBDIVISIONS, JSON.stringify(Object.fromEntries(
  ["testing × (no second served tag)", "testing × architecture", "testing × cost"]
    .map((g) => [g, { judged: true, subgroups: [] }]))));

// THE CASE COUNTER. Every case file counts its own cases and ends with
// `finish`, which prints the one count line the runtime member sums.
let n = 0; const bad = [];
const cleanups = [];
export const ok = (name, cond) => { if (cond) n++; else bad.push(name); };
export function finish(file) {
  for (const c of cleanups) c();
  rmSync(SCRATCH, { recursive: true, force: true });
  console.log(`terrain self-test: ${n} case(s) pass in ${file}${bad.length ? `, FAILURES: ${bad.join(" | ")}` : ""}`);
  if (bad.length) process.exit(1);
}
// A value several case blocks read, made by the first block that asks for it.
export const once = (make) => { let made = false, value; return () => (made ? value : (made = true, value = make())); };
// THE ANSWERS KEY IS THE QUESTION AS SENT (PR #1048 round 1, finding 1). A
// fixture answering with the bare declaration question would pass against a
// pointer that also carries the bare question, and both are wrong together.
export const sentQ = (rd, decl) => {
  const p = join(rd, `${decl.id}${GATE_CALL_SUFFIX}`);
  if (!existsSync(p)) return decl.question;
  const q = readJson(p);
  return q.questions[0].question;
};

// ---- THE TAG-STOP FIXTURE, read by the gate and executor case files: a one-wait
// table stopped at TAG_SELECTION over the lone-tag survey, under its own pointer
// and sidecar directories, plus the helpers that answer it through the hook.
export const tagStopFixture = once(() => {
  const surveyPath = join(REPO, "checks", "fixtures", "survey", "lone-tag-member.json");
  const selfPath = TERRAIN_SCRIPT;
  const gs = join(tmpdir(), `terrain-selftest-tagstop-${process.pid}`);
  const rd = join(gs, "rd");
  mkdirSync(rd, { recursive: true });
  // EVERY EXECUTOR SPAWN IN THIS FIXTURE CARRIES THE TEST SEAM (kogaki#1046).
  // A declaration writes an open-gate pointer; without `KOGAKI_OPEN_GATES` it
  // lands in the owner's live directory, where the capture hook's refuse-when-
  // ambiguous rule drops the next real answer (2026-09-09, three per run).
  // AND THE SIDECAR IS THE SECOND SUCH DIRECTORY (kogaki#1153): the same act
  // writes `~/.claude/gate-declarations/<session_id>.json`, the primary carrier
  // `lint-gate-declaration.py` reads, so it is isolated on the pointer's terms
  // and ASSERTED by the gate cases rather than assumed.
  const execSidecar = join(gs, "gate-declarations", "exec");
  const execEnv = {
    ...process.env,
    KOGAKI_OPEN_GATES: join(gs, "open-gates", "exec"),
    GATE_DECLARATION_SIDECAR_DIR: execSidecar,
    CLAUDE_CODE_SESSION_ID: "terrain-selftest-tagstop-session",
  };
  const tp = join(gs, "table.json");
  writeFileSync(tp, JSON.stringify({ version: 1, states: [
    { id: "TAG_SELECTION", kind: "wait", owner_supplies: "one tag name, or the standing option",
      renders_gate_declaration: true, gate_id: "terrain-tag-selection" },
    { id: "done", kind: "terminal" },
  ] }));
  writeFileSync(join(rd, RUN_RECORD_FILE), JSON.stringify({
    workflow: { path: tp, version: 1 }, survey_record: surveyPath,
    completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
    awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
    gate_declarations_owed: [], done: false,
  }));
  // Started by the first case block that reads it, so a case file running
  // none of them pays nothing for it (kogaki#1425).
  const tagRun = once(() => {
    const r = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rd, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: execEnv });
    return { r, out: `${r.stdout || ""}${r.stderr || ""}` };
  });
  // THE ANSWER ARRIVES THROUGH THE HOOK (kogaki#890). The cases used to pass
  // `--capture-option` / `--capture-free-text` / `--tool-use-id`, the channel the
  // issue removed; the helper below feeds `.claude/hooks/write-gate-capture.py`
  // the payload shape the harness sends, so the row under test is written by the
  // code that writes it in a real run.
  //
  // EACH RUN GETS ITS OWN POINTER DIRECTORY, a property of the FIXTURE: several
  // cases leave a gate unanswered over the same question, so they must not
  // collide. The last case opts back IN to a shared directory, on purpose.
  const hookPath = join(REPO, ".claude", "hooks", "write-gate-capture.py");
  const gatesFor = (name) => join(gs, "open-gates", name);
  // THE SELF-TEST NAMES ITS OWN SESSION (kogaki#1028 item 5). The capture
  // hook joins a payload to a pointer on the nonce AND the session, and an
  // empty id on either side matches nothing — so a fixture inheriting the
  // ambient `CLAUDE_CODE_SESSION_ID` into the pointer while sending a
  // payload without one would write no row, and the fixture would be
  // reporting the join rather than what it means to cover. Pinned here so
  // the pass is the same inside a session and outside one.
  const SELF_TEST_SESSION = "terrain-self-test-session";
  // AND ITS OWN SIDECAR DIRECTORY, PER NAME (kogaki#1153), on the same
  // terms as the pointer directory beside it: these spawns reach
  // `emitGateDeclaration`, which now writes a gate-declaration sidecar
  // keyed by `CLAUDE_CODE_SESSION_ID` — pinned here to the fixture
  // session, so without a scratch directory every one of these cases
  // would write a `mechanical` declaration into the live carrier under
  // a session id no session owns.
  const envFor = (name) => ({
    ...process.env,
    KOGAKI_OPEN_GATES: gatesFor(name),
    GATE_DECLARATION_SIDECAR_DIR: join(gs, "gate-declarations", name),
    CLAUDE_CODE_SESSION_ID: SELF_TEST_SESSION,
  });
  // THE ADVANCE CARRIES THE PAYLOAD THAT PRODUCED THE ROW (kogaki#1075).
  // In an installation the capture hook and this hook read ONE harness
  // event, so the row's `evidence.tool_use_id` and the advancing
  // payload's are the same string by construction. The fixtures used to
  // decouple them -- answer under `toolu_test_*`, advance under
  // `fixture-tool-use` -- which was a shape no installation can produce
  // and which the executor now refuses by name. Composed here so a case
  // that means to drive an answered gate drives it the way the hook pair
  // does.
  const payloadAnswering = (toolUseId) => JSON.stringify({
    hook_event_name: "PostToolUse",
    session_id: "fixture-session",
    tool_use_id: toolUseId,
  });
  const answerThroughHook = (gatesName, questionText, label, toolUseId) => spawnSync(
    "python3", [hookPath],
    { encoding: "utf8", env: envFor(gatesName),
      input: JSON.stringify({
        tool_name: "AskUserQuestion",
        session_id: SELF_TEST_SESSION,
        tool_use_id: toolUseId,
        tool_input: { questions: [{ question: questionText, options: [] }] },
        tool_response: { answers: { [questionText]: label } },
      }) });
  cleanups.push(() => rmSync(gs, { recursive: true, force: true }));
  return { surveyPath, selfPath, gs, rd, execSidecar, execEnv, tp, tagRun, hookPath, gatesFor,
    SELF_TEST_SESSION, envFor, payloadAnswering, answerThroughHook };
});

// ---- THE FIX FIXTURE, read by the judgment and neighborhood case files.
export const fixFixture = once(() => {
  // A SURVEY WITH ONE SUBDIVIDABLE GROUP AND ONE SMALL ONE, minted by `survey`
  // over the fixture gateway: six Lessons under `fix × wide` (G2) and two
  // under `fix × narrow` (G1).
  const FIX_ANSWERS = (() => {
    const recs = [
      ...[1, 2, 3, 4, 5, 6].map((i) => ({ kind: "lesson", slug: `w${i}`, tags: ["fix", "wide"] })),
      ...[1, 2].map((i) => ({ kind: "lesson", slug: `n${i}`, tags: ["fix", "narrow"] })),
    ];
    return {
      element_survey: { lines: recs.map(servedLine), pin: "product-lab@aaaaaaa" },
      surface_names: { lines: [{ text: "lessons/tag=fix,window=2026-08" }] },
      gloss_index: { "*": { lines: [] } },
    };
  })();
  const FIX_GW = gateway(join(SCRATCH, "fix-gw"), FIX_ANSWERS);
  const fixSurvey = once(() => {
    const rd = join(SCRATCH, "fix-survey");
    terrain(["survey", "--run-dir", rd], { env: FIX_GW });
    const f = existsSync(rd) ? readdirSync(rd).find((x) => x.endsWith(".terrain-survey.json")) : null;
    return f ? join(rd, f) : join(rd, "(survey refused)");
  });
  const fixSubgroup = (name, ms) => ({
    name, claim: `A fixture claim over ${ms.length} member(s).`, members: ms,
    verdicts: { coherence: "tight", coherence_why: "a fixture reason" },
  });
  const WIDE = [1, 2, 3, 4, 5, 6].map((i) => `lesson:w${i}`);
  const FIX_SUBDIVISIONS = join(SCRATCH, "fix-subdivisions.json");
  writeFileSync(FIX_SUBDIVISIONS, JSON.stringify({
    "fix × wide": { judged: true, subgroups: [fixSubgroup("the first half", WIDE.slice(0, 3)), fixSubgroup("the second half", WIDE.slice(3))] },
    "fix × narrow": { judged: true, subgroups: [] },
  }));
  // A RUN SEEDED PAST ITS WAITS, over a table narrowed to the states named.
  // The record is written as the executor writes a fresh one, with the waits'
  // answers already in `owner_input`, so the run starts at the first named
  // state and stops only at the terminal one. The judge is a stub that splits
  // a group of six or more in half and judges a smaller one empty.
  const STUB_JUDGE = join(SCRATCH, "stub-judge.mjs");
  writeFileSync(STUB_JUDGE, [
    "#!/usr/bin/env node",
    'import { readFileSync } from "node:fs";',
    'if (process.argv.includes("--version")) { console.log("stub-judge 1.0"); process.exit(0); }',
    'const text = readFileSync(0, "utf8");',
    'const input = JSON.parse(text.slice(text.indexOf("----- INPUT (JSON) -----") + "----- INPUT (JSON) -----".length));',
    'const sg = (name, ms) => ({ name, claim: `A fixture claim over ${ms.length} member(s).`, members: ms, verdicts: { coherence: "tight", coherence_why: "a fixture reason" } });',
    "const out = {};",
    "for (const g of input.groups) {",
    "  const h = Math.floor(g.members.length / 2);",
    "  out[g.name] = { judged: true, claim: `The fixture claim for ${g.name}.`,",
    '    subgroups: g.members.length >= 6 ? [sg("the first half", g.members.slice(0, h)), sg("the second half", g.members.slice(h))] : [] };',
    "}",
    "process.stdout.write(JSON.stringify({ result: JSON.stringify(out) }));",
  ].join("\n") + "\n");
  chmodSync(STUB_JUDGE, 0o755);
  const SHIPPED_TABLE = readJson(TERRAIN_WORKFLOW_TABLE);
  return { FIX_GW, fixSurvey, FIX_SUBDIVISIONS, STUB_JUDGE, SHIPPED_TABLE };
});
