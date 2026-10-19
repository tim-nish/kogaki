#!/usr/bin/env bash
# check-brief-compose-job — the Move library fixtures, the compose job's
# unit prompts and the per-unit fit judge's input (kogaki#1276, kogaki#1307,
# kogaki#1311, kogaki#1320, kogaki#1325, kogaki#1327, kogaki#1412).
#   (ag)-(au2) segments and breaks reach the prompt and the fit input; the
#              compose_path prompt and fit input; derived before-states.
#   (ah)-(al)  move/no_move_fits, the no-tools sentence, the partition, the
#              line above the question and the closing report.
#   (ao)-(aq)  waypoints, Section headings and the fit input's Sections.
# Case (ai) and (al) run a real `job-supervise` and `job await` over a fake
# judge; nothing calls a model. Cut from check-brief-compose.sh by
# kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, chmodSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as compose from "./src/compose.mjs";
import { stringifyYaml } from "./src/yaml.mjs";
import { composeBrief, validateReaderPathUnit, readerPathFitInput, readerPathFitVerdict,
  composeJobExcluded, composeJobFinished, candidateSelectionExtra, noCandidateFitsReport } from "./src/brief.mjs";
import { startDetachedJobSupervisor } from "./src/workflow/detached-job.mjs";
import { runRecordPath } from "./src/workflow/run-record.mjs";
import { judgePrompt } from "./src/workflow/judge.mjs";
import { recordOf, FIT_MOVE, segmentText, START_1276, leg1276, cand1276, fitMoveLibrary } from "./checks/fixtures/brief-compose/fixtures.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const { validateLegs } = compose;
const fitMoves = fitMoveLibrary();
const fails = [];

// (ag) segments and breaks reach the composer's prompt and the per-unit fit judge's input verbatim,
// and no `technique` does (kogaki#1412).
{
  const library = compose.loadMoveContracts(fitMoves);
  if (library.error) fails.push(`(ag) loadMoveContracts refused the fixture library: ${library.error}`);
  else {
    for (const [id, f] of Object.entries(FIT_MOVE)) {
      const m = library.moves.find((x) => x.id === id);
      if (!m || JSON.stringify(m.segments) !== JSON.stringify(f.segments) || JSON.stringify(m.breaks) !== JSON.stringify(f.breaks) || "technique" in m) fails.push(`(ag) loadMoveContracts does not carry ${id}'s segments and breaks verbatim, and no technique: ${JSON.stringify(m)}`);
    }
    const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
    const input = { state: "compose_path", moves_you_may_bind: library.moves, unit_number: 1 };
    const prompt = judgePrompt(table.reader_path_unit, JSON.stringify(input, null, 2), input, null);
    for (const f of Object.values(FIT_MOVE)) {
      if (!segmentText(f).every((d) => prompt.includes(d)) || !f.breaks.every((b) => prompt.includes(b))) fails.push(`(ag) the compose_path unit prompt does not carry a Move's segments and breaks verbatim: ${segmentText(f)}`);
    }
    const brief = briefRuntimeText();
    const composePath = brief.slice(brief.indexOf("  compose_path: async"), brief.indexOf("  review_path: async"));
    if (!/const library = loadMoveContracts\(movesDir\)/.test(composePath) || !/moves_you_may_bind: library\.moves,\n\s+unit_number: n/.test(composePath)) {
      fails.push("(ag) compose_path's unit input no longer takes `moves_you_may_bind` from loadMoveContracts");
    }
  }
  const j = readerPathFitInput(cand1276("c1"), fitMoves, START_1276);
  if (j.error) fails.push(`(ag) readerPathFitInput refused: ${j.error}`);
  else {
    const own = j.input.candidate_you_must_judge;
    if (!own || own.candidate_id !== "c1") fails.push(`(ag) the per-unit fit input does not hold its one Candidate: ${JSON.stringify(own && own.candidate_id)}`);
    for (const c of (own && own.move_contracts) || []) {
      const f = FIT_MOVE[c.move];
      if (!f || JSON.stringify(c.segments) !== JSON.stringify(f.segments) || "technique" in c || JSON.stringify(c.breaks) !== JSON.stringify(f.breaks) || typeof c.before !== "string" || typeof c.after !== "string") {
        fails.push(`(ag) the per-unit fit input does not carry leg ${c.leg_id}'s Move contract verbatim: ${JSON.stringify(c)}`);
      }
    }
    const brief = briefRuntimeText();
    const composePath = brief.slice(brief.indexOf("  compose_path: async"), brief.indexOf("  review_path: async"));
    if (!/prompt_export: "readerPathFitPrompt"/.test(composePath) || !/verdict_export: "readerPathFitVerdict"/.test(composePath)) {
      fails.push("(ag) compose_path does not declare the per-unit fit judge to its job");
    }
    // THE FIT PROMPT ASKS FOR ONE RECORD (PR #1308 round 1): the schema text it renders
    // carries the one-record blocks and never the `set` envelope's `records` requirement.
    const fitHead = judgePrompt(JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_fit_unit, "", null, null);
    const schemaText = fitHead.slice(fitHead.indexOf("THE SCHEMA THE ELEMENTS"));
    if (/"set"\s*:/.test(schemaText) || /"required":\s*\[\s*"records"/.test(schemaText) || !/"verdicts"/.test(schemaText)) {
      fails.push("(ag) the per-unit fit prompt renders the set envelope, or no `verdicts` record, as the shape to answer");
    }
  }
}

// (at) kogaki#1320 — the compose_path prompt and the per-unit fit judge's
// input carry each bound Move's `segments` verbatim; a library holding a Move
// that carries none is refused by name, never read with `segments: null`
// (kogaki#1412, retiring the null kogaki#1320 allowed).
{
  const library = compose.loadMoveContracts(fitMoves);
  if (library.error) fails.push(`(at) loadMoveContracts refused the fixture library: ${library.error}`);
  else {
    const mTurn = library.moves.find((m) => m.id === "m_turn");
    const mOpen = library.moves.find((m) => m.id === "m_open");
    if (!mTurn || JSON.stringify(mTurn.segments) !== JSON.stringify(FIT_MOVE.m_turn.segments)) fails.push(`(at) loadMoveContracts does not carry m_turn's segments verbatim: ${JSON.stringify(mTurn)}`);
    if (!mOpen || JSON.stringify(mOpen.segments) !== JSON.stringify(FIT_MOVE.m_open.segments)) fails.push(`(at) loadMoveContracts does not carry m_open's segments verbatim: ${JSON.stringify(mOpen)}`);
    const bare = mkdtempSync(join(tmpdir(), "kogaki-1412-moves-"));
    writeFileSync(join(bare, "ROLES.json"), readFileSync("moves/ROLES.json"));
    writeFileSync(join(bare, "m_bare.yaml"), stringifyYaml({ id: "m_bare", description: "the fixture Move m_bare.", before: { knowledge: "before." }, after: { knowledge: "after." },
      breaks: ["breaks if dropped."], technique: "restates an order in prose." }));
    const refused = compose.loadMoveContracts(bare);
    if (!refused.error || !refused.error.includes('move "m_bare" carries no segments') || !refused.error.includes("kogaki#1412")) {
      fails.push(`(at) a library holding a Move with no segments was not refused by name: ${JSON.stringify(refused).slice(0, 300)}`);
    }
    const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
    const input = { state: "compose_path", moves_you_may_bind: library.moves, unit_number: 1 };
    const prompt = judgePrompt(table.reader_path_unit, JSON.stringify(input, null, 2), input, null);
    // THE PROMPT TEXT IS A JSON-STRINGIFIED INPUT, so a segments value with
    // newlines appears there with escaped `\n`, not a literal newline.
    if (!FIT_MOVE.m_turn.segments.every((s) => prompt.includes(s.does))) fails.push("(at) the compose_path unit prompt does not carry m_turn's segments verbatim");
  }
  const j = readerPathFitInput(cand1276("c1"), fitMoves, START_1276);
  if (j.error) fails.push(`(at) readerPathFitInput refused: ${j.error}`);
  else {
    for (const c of j.input.candidate_you_must_judge.move_contracts) {
      const f = FIT_MOVE[c.move];
      const want = f.segments;
      if (JSON.stringify(c.segments) !== JSON.stringify(want)) fails.push(`(at) the per-unit fit input does not carry leg ${c.leg_id}'s Move segments (want ${JSON.stringify(want)}, got ${JSON.stringify(c.segments)})`);
    }
  }
}

// (au) kogaki#1325 — a Leg's before-state is the previous after-state by
// construction. (au1) a Candidate whose Leg carries `reader_state_before` is
// refused naming the field, at the pure validator and at the compose unit;
// (au2) the per-unit fit input carries each Leg's DERIVED before-state, the one
// question asked of the Move's `before`, and no specialization vocabulary for a
// before-state; (au3) a fit record whose Leg 1 verdict is `contradicts` with a
// `why` naming `knowledge` is read as a refusal of the unit carrying that
// sentence, and the unit is re-asked once, as before. Whether a Move's `before`
// does require what the state lacks is the model's judgment and is not
// exercised here.
{
  const legs = () => cand1276("c1").legs;
  // (au1)
  const written = legs();
  written[1].reader_state_before = "knowledge: holds the Thesis as a slogan\nquestion: holds: none";
  const r1 = validateLegs(written, START_1276);
  if (!r1.error || !/leg 2 \(s2\): carries `reader_state_before`/.test(r1.error) || !/kogaki#1325/.test(r1.error)) {
    fails.push(`(au1) validateLegs did not refuse a Leg carrying reader_state_before by name: ${JSON.stringify(r1)}`);
  }
  const unit = validateReaderPathUnit({ ...cand1276("c1"), legs: written }, { strandIds: ["L1"], readerStart: START_1276, movesDir: fitMoves });
  if (!unit || !unit.error || !/carries `reader_state_before`/.test(unit.error)) {
    fails.push(`(au1) the compose unit did not refuse a Candidate whose Leg writes reader_state_before: ${JSON.stringify(unit)}`);
  }
  const clean = validateLegs(legs(), START_1276);
  if (clean.error) fails.push(`(au1) a Candidate writing no before-state was refused: ${clean.error}`);
  else if (clean.legs[0].reader_state_before !== START_1276 || clean.legs[1].reader_state_before !== clean.legs[0].reader_state_after) {
    fails.push(`(au1) validateLegs did not derive the before-states (Reader start, then the previous after-state): ${JSON.stringify(clean.legs.map((l) => l.reader_state_before))}`);
  }
  const schemaFields = JSON.parse(readFileSync("src/leg-schema.json", "utf8")).fields;
  if ("reader_state_before" in schemaFields) fails.push("(au1) src/leg-schema.json still lists reader_state_before among the Leg's composed fields");

  // (au2)
  const cand = cand1276("c1");
  cand.legs[0].reader_state_after = "knowledge: after s1\nquestion: why does the guard pass";
  const j = readerPathFitInput(cand, fitMoves, START_1276);
  if (j.error) fails.push(`(au2) readerPathFitInput refused: ${j.error}`);
  else {
    const own = j.input.candidate_you_must_judge;
    const befores = own.legs.map((l) => l.reader_state_before);
    if (befores[0] !== START_1276 || befores[1] !== cand.legs[0].reader_state_after) {
      fails.push(`(au2) the fit input's Legs do not carry their derived before-states: ${JSON.stringify(befores)}`);
    }
    if ("reader_state_before" in cand.legs[0]) fails.push("(au2) building the fit input wrote reader_state_before onto the Candidate's own Leg");
    const spec = JSON.parse(readFileSync("src/specialization-schema.json", "utf8"));
    if (!own.before_state || own.before_state.question !== spec.before_state.question
        || !/require, on any dimension, something the derived before-state does not hold/.test(own.before_state.question)) {
      fails.push(`(au2) the fit input does not carry the one question asked of the Move's before: ${JSON.stringify(own.before_state)}`);
    }
    if ("first_leg" in own || "first_leg" in spec) fails.push("(au2) the fit input or the schema still carries the retired `first_leg` before-state comparison");
    if (/speciali[sz]/i.test(JSON.stringify(own.before_state)) || /speciali[sz]/i.test(spec.before_state.question)) {
      fails.push("(au2) the before-state question still speaks of a specialization");
    }
    const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
    const fitRow = table.reader_path_fit_unit;
    if (/reader_state_before and reader_state_after are consistent SPECIALIZATIONS/.test(fitRow.judgment_point)
        || !fitRow.schema_blocks.includes("before_state")) {
      fails.push("(au2) the reader_path_fit_unit row still judges a before-state as a specialization, or does not render `before_state`");
    }
  }

  // (au3)
  const verdict = (leg, v, why) => ({ leg_id: leg.leg_id, move: leg.move, verdict: v, why });
  const WHY_K = "the Move's before needs a stated general claim in knowledge that no earlier text carries.";
  const rec = { version: "1", candidate_id: "c1",
    verdicts: [verdict(cand.legs[0], "contradicts", WHY_K), verdict(cand.legs[1], "consistent", "the after-state specializes the Move's after.")] };
  const v = readerPathFitVerdict(rec, cand);
  if (v.error) fails.push(`(au3) a contradicts record on Leg 1 was refused as malformed rather than read: ${v.error}`);
  else if (!v.refusal || !v.refusal.includes(`Leg s1 (m_open): contradicts — the judge wrote: "${WHY_K}"`)
      || !/Compose the Candidate again/.test(v.refusal) || !(v.failures || []).some((f) => f.leg_id === "s1")) {
    fails.push(`(au3) a Leg 1 contradicts naming knowledge was not read as the unit's refusal with the judge's sentence: ${JSON.stringify(v)}`);
  }
  const note = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_fit_unit.note;
  if (!/the unit is re-asked once with this judge's sentence verbatim/.test(note)) fails.push("(au3) the fit row no longer declares the one re-ask on a contradicts verdict");
}

// (ah) both or neither of move / no_move_fits is refused naming the Leg.
{
  const both = cand1276("c1", { no_move_fits: "the claims describe one guard, and no Move works with one party." });
  const rBoth = validateLegs(both.legs, START_1276);
  if (!rBoth.error || !/leg 2 \(s2\)/.test(rBoth.error) || !/both move and no_move_fits/.test(rBoth.error)) fails.push(`(ah) a Leg carrying both move and no_move_fits was not refused naming the Leg: ${rBoth.error}`);
  const neither = cand1276("c1");
  delete neither.legs[1].move;
  const rNeither = validateLegs(neither.legs, START_1276);
  if (!rNeither.error || !/leg 2 \(s2\)/.test(rNeither.error) || !/neither move nor no_move_fits/.test(rNeither.error)) fails.push(`(ah) a Leg carrying neither move nor no_move_fits was not refused naming the Leg: ${rNeither.error}`);
  const ok = validateLegs(cand1276("c1").legs, START_1276);
  if (ok.error) fails.push(`(ah) the fixture path with a move on every Leg was refused: ${ok.error}`);
}

// (ai) a no_move_fits Leg refuses its unit with the sentence, and the retry prompt carries it.
{
  const SENTENCE = "the claims describe one guard, and every Move here needs a second party who answers.";
  const c = cand1276("c1");
  delete c.legs[1].move;
  c.legs[1].no_move_fits = SENTENCE;
  const validate = (x) => { const r = validateReaderPathUnit(x, { strandIds: ["L1"], readerStart: START_1276, movesDir: fitMoves }); return r && r.error ? r.error : null; };
  // THE UNIT IS CLASSIFIED BY A REAL `job-supervise` RUN (kogaki#1257), under
  // the declared `validateReaderPathUnit` validator and a fake judge that
  // answers this Candidate on every attempt and records each prompt it is
  // sent -- so the refusal is read off the unit row and the retry prompt is
  // the second one the supervisor actually sent.
  const sup = mkdtempSync(join(tmpdir(), "kogaki-ai-"));
  const judge = join(sup, "judge.mjs");
  writeFileSync(judge, "#!/usr/bin/env node\nimport { appendFileSync } from \"node:fs\";\n"
    + "let c = []; process.stdin.on(\"data\", (d) => c.push(d)); process.stdin.on(\"end\", () => {\n"
    + `  appendFileSync(${JSON.stringify(join(sup, "prompts.jsonl"))}, JSON.stringify(Buffer.concat(c).toString("utf8")) + "\\n");\n`
    + `  process.stdout.write(${JSON.stringify(JSON.stringify({ type: "result", result: JSON.stringify(c) }) + "\n")});\n`
    + "});\n");
  chmodSync(judge, 0o755);
  writeFileSync(join(sup, "units.json"), JSON.stringify({ units: [{ id: "u", prompt: "compose one path\n----- INPUT -----\n{}" }],
    validator: { module: "src/brief.mjs", export: "validateReaderPathUnit",
      inputs: { strandIds: ["L1"], readerStart: START_1276, movesDir: fitMoves } } }));
  spawnSync(process.execPath, ["src/terrain.mjs", "job-supervise", "--run", sup, "--units", join(sup, "units.json"),
    "--command", judge, "--model", "m", "--output-format", "json",
    "--call-limit-s", "100", "--unit-attempts", "2", "--stall-s", "100", "--heartbeat-ms", "250"], { encoding: "utf8", timeout: 15000 });
  const jobFile = join(sup, "reader-path-job.json");
  const unit = existsSync(jobFile) ? (JSON.parse(readFileSync(jobFile, "utf8")).units || []).find((u) => u.id === "u") : null;
  if (!unit || unit.status !== "refused") fails.push(`(ai) a Candidate with a no_move_fits Leg classified ${unit && unit.status}, want refused`);
  else {
    const refusal = unit.first_refusal || "";
    if (!refusal.includes(SENTENCE) || !/leg s2/.test(refusal)) fails.push(`(ai) the unit refusal does not carry the Leg's sentence: ${refusal}`);
    const promptsFile = join(sup, "prompts.jsonl");
    const sent = existsSync(promptsFile) ? readFileSync(promptsFile, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
    const retry = sent[1] || "";
    if (!retry.includes("----- YOUR PREVIOUS ANSWER (attempt 1) -----") || !retry.includes(SENTENCE)) fails.push("(ai) the retry prompt does not carry the no_move_fits sentence verbatim");
  }
  const good = validate(cand1276("c1"));
  if (good) fails.push(`(ai) the same Candidate with a move on every Leg was refused: ${good}`);
}

// (aj) every compose job unit prompt begins with the no-tools sentence, and
// neither table carries `judge_specialization` or `effort` (kogaki#1307). The
// sentence is read off the units file `startDetachedJobSupervisor` -- the one
// starter `compose_path` calls -- writes for the job.
{
  const run = mkdtempSync(join(tmpdir(), "kogaki-1307-units-"));
  const started = startDetachedJobSupervisor(run, {
    units: [{ id: "candidate-1", prompt: "first unit prompt" }, { id: "candidate-2", prompt: "second unit prompt" }],
    command: "/bin/false", model: "m", outputFormat: "json", callLimitS: 5, unitAttempts: 2, stallS: 5, heartbeatMs: 100,
    validator: { module: "src/brief.mjs", export: "validateReaderPathUnit", inputs: {} },
  });
  try { process.kill(started.supervisorPid); } catch { /* already gone */ }
  const declared = JSON.parse(readFileSync(started.unitsPath, "utf8"));
  const heads = declared.units.map((u, i) => u.prompt.slice(0, u.prompt.length - `\n\n${["first", "second"][i]} unit prompt`.length));
  const sentence = heads[0] || "";
  if (declared.units.length !== 2 || !declared.units[0].prompt.endsWith("\n\nfirst unit prompt") || heads[1] !== sentence) {
    fails.push(`(aj) the compose job unit prompts do not each begin with the same sentence ahead of the unit's own text: ${JSON.stringify(declared.units.map((u) => u.prompt.slice(0, 80)))}`);
  }
  if (!/^You are running with no tools/.test(sentence) || !/not something to open/.test(sentence) || /\n/.test(sentence)) {
    fails.push(`(aj) the sentence every unit prompt begins with does not say the session has no tools and that a path is not to be opened: ${JSON.stringify(sentence)}`);
  }
  const brief = briefRuntimeText();
  if (!/startDetachedJobSupervisor\(dir, \{\n\s+units,/.test(brief.slice(brief.indexOf("  compose_path: async"), brief.indexOf("  review_path: async")))) {
    fails.push("(aj) compose_path no longer starts its job through startDetachedJobSupervisor, so the units file above is not its prompts");
  }
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  if (table.states.some((x) => x.id === "judge_specialization")) fails.push("(aj) src/brief-workflow.json still declares a judge_specialization state");
  const hasEffort = (v) => v && typeof v === "object" && (Array.isArray(v) ? v.some(hasEffort) : ("effort" in v || Object.values(v).some(hasEffort)));
  if (hasEffort(table)) fails.push("(aj) src/brief-workflow.json still carries an `effort` field");
  if (hasEffort(JSON.parse(readFileSync("src/terrain-workflow.json", "utf8")))) fails.push("(aj) src/terrain-workflow.json still carries an `effort` field");
}

// (ak)/(al) the partition, the line above the question, and the closing report.
// Since kogaki#1307 the partition is the compose job's own: a unit whose Legs do
// not fit their Moves after its one re-ask ends `refused`, carrying the judge's
// verdicts, and `composeJobExcluded` reads the excluded Candidates off the rows.
{
  const cands = ["c1", "c2", "c3"].map((id) => cand1276(id));
  const verdict = (leg, v, why) => ({ leg_id: leg.leg_id, move: leg.move, verdict: v, why });
  const recordOf = (c, v2, why2 = "both reader states specialize the Move's before and after.") => ({
    version: "1", candidate_id: c.candidate_id,
    verdicts: [verdict(c.legs[0], "consistent", "the reader states specialize the Move's before and after."), verdict(c.legs[1], v2, why2)],
  });
  const WHY = "the Leg's two claims are about one guard, and the Segments need a second party.";
  // The unit row the supervisor writes for a refused unit, built from the real verdict reader.
  const rowOf = (c, i, v2, why2) => {
    const r = readerPathFitVerdict(recordOf(c, v2, why2), c);
    if (v2 === "consistent") return { id: `candidate-${i + 1}`, status: "done", candidate: c };
    if (!r.refusal) fails.push(`(ak) a ${v2} verdict was not read as a refusal of the unit: ${JSON.stringify(r)}`);
    return { id: `candidate-${i + 1}`, status: "refused", candidate: c,
      failure: { class: "schema refusal", stderr_tail: r.refusal, move_fit: r.failures || [] } };
  };
  const rows = [rowOf(cands[0], 0, "consistent"), rowOf(cands[1], 1, "contradicts", WHY), rowOf(cands[2], 2, "consistent")];
  const excluded = composeJobExcluded(rows);
  // THE RUN'S OWN FILTER, NOT A HAND-WRITTEN ONE (kogaki#1360): the partition
  // asserted here is the one `job await` forwards to `compose_path`.
  const fit = composeJobFinished(rows).map((u) => u.candidate);
  if (JSON.stringify(fit.map((c) => c.candidate_id)) !== JSON.stringify(["c1", "c3"])) fails.push(`(ak) the offered Candidates are ${JSON.stringify(fit.map((c) => c.candidate_id))}, want ["c1","c3"]`);
  const extra = candidateSelectionExtra(excluded).excluded_candidates || "";
  const lines = extra.split("\n").filter(Boolean);
  if (lines.length !== 1 || !lines[0].includes("path c2") || !lines[0].includes("Leg s2")) fails.push(`(ak) the line above the Candidate question does not name the excluded Candidate and its Leg in one line: ${JSON.stringify(extra)}`);
  if (/path c1|path c3/.test(extra)) fails.push(`(ak) the excluded line names an offered Candidate: ${extra}`);
  if (Object.keys(candidateSelectionExtra([])).length) fails.push("(ak) with no Candidate excluded, something still renders above the question");
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const sel = table.states.find((x) => x.id === "CANDIDATE_SELECTION");
  const filled = Object.keys(candidateSelectionExtra(excluded));
  if (JSON.stringify(filled) !== JSON.stringify([sel.renders_above_question])) fails.push(`(ak) CANDIDATE_SELECTION's renders_above_question (${JSON.stringify(sel.renders_above_question)}) is not the key its option composer fills (${JSON.stringify(filled)})`);
  if (!/"excluded_candidates"/.test(readFileSync("src/workflow/gate.mjs", "utf8").match(/const GATE_CALL_READING_KEYS = .*/)[0])) fails.push("(ak) excluded_candidates is not a gate-call reading key");

  // (al) END TO END through `job await`: a compose job whose every unit ended
  // `refused` on its Move fit, under a run whose Brief was minted in a
  // `theses/<slug>/` of its own. No question is asked, the directory is gone,
  // and the report names each failing Leg and says the Brief was removed.
  const allRows = [rowOf(cands[0], 0, "contradicts", WHY),
    rowOf(cands[1], 1, "cannot-determine", "the Move's Segments cannot be read against these claims."),
    rowOf(cands[2], 2, "contradicts", WHY)];
  const base = mkdtempSync(join(tmpdir(), "kogaki-1307-nofit-"));
  const thesisDir = join(base, "theses", "fixture-1307");
  mkdirSync(thesisDir, { recursive: true });
  const briefPath = join(thesisDir, "brief.yaml");
  writeFileSync(briefPath, composeBrief({ slug: "fixture-1307", strands: [{ display_id: "L1", slug: "fixture-strand", cite: "fixture" }],
    thesis: "The fixture claim.", composePath: "audiences/dev-to-zenn.md" }));
  const run = join(base, "run");
  mkdirSync(run);
  const now = new Date().toISOString();
  writeFileSync(join(run, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "refused",
    units: allRows.map((u) => ({ ...u, bytes: 50 })),
  }, null, 2) + "\n");
  writeFileSync(runRecordPath(run), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: table.version }, judge_binary: null, survey_record: null,
    completed: ["enter", "THESIS_ADOPTION", "adopt_thesis", "mint", "differentiation"], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: "compose_path", owner_input: {},
    artifacts_written: [{ state: "mint", path: briefPath }], judgments: {}, gate_declarations_owed: [], done: false,
  }, null, 2) + "\n");
  const stub = join(base, "judge.mjs");
  writeFileSync(stub, "#!/usr/bin/env node\nprocess.stdout.write(\"fixture judge\\n\");\n");
  chmodSync(stub, 0o755);
  const r = spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"], { encoding: "utf8", timeout: 60000,
    env: { ...process.env, KOGAKI_BRIEF_RUN_DIR: run, KOGAKI_BRIEF_OPEN_RUN: join(run, "open-run-pointer.json"), KOGAKI_JUDGE_CLI: stub } });
  const report = String(r.stderr || "");
  const after = JSON.parse(readFileSync(runRecordPath(run), "utf8"));
  if (existsSync(thesisDir)) fails.push(`(al) every Candidate failed and theses/<slug>/ is still there: ${thesisDir} stderr=${report}`);
  if (!/was removed, so its name is free again/.test(report)) fails.push(`(al) the closing report does not say the Brief was removed: ${report}`);
  if (/under a different name/.test(report)) fails.push(`(al) the report still offers the different-name route though the name is free: ${report}`);
  for (const c of cands) if (!report.includes(`"path ${c.candidate_id}"`)) fails.push(`(al) the report does not name candidate ${c.candidate_id}`);
  if (!report.includes(`Leg s2 (m_turn): contradicts — ${WHY}`) || !report.includes("cannot-determine — the Move's Segments cannot be read")) fails.push(`(al) the report does not name each failing Leg with the judge's sentence: ${report}`);
  if (after.done !== true || (after.gate_declarations_owed || []).length || after.awaiting) fails.push(`(al) ending with every Candidate failed raised a question or left the run open: ${JSON.stringify(after)}`);
  if (existsSync(join(run, "brief-reader-path-job.gate-call.json"))) fails.push("(al) ending with every Candidate failed wrote a gate call");
  const kept = noCandidateFitsReport(composeJobExcluded(allRows), "theses/fixture/brief.yaml", { removed: false });
  if (!/could not be removed/.test(kept)) fails.push(`(al) a Brief that could not be removed is not reported as kept: ${kept}`);
}

// (ao) kogaki#1311 — a Leg carries waypoints that serve its claims, and the
// count is no rule. (ao1) each shape refusal names the Leg and the waypoint;
// (ao2) the compose_path unit prompt renders src/leg-schema.json's
// `waypoints` entry, and the per-unit fit input carries each Leg's waypoints
// beside its Move's segments and breaks; (ao3) a Candidate whose waypoint
// counts differ from its Move's Segment count passes.
{
  const legs = (s1Extra = {}, s2Extra = {}) => [leg1276("s1", { opens_section: "Intro", ...s1Extra }),
    leg1276("s2", { move: "m_turn", depends_on: ["s1"], reaches_target: true, ...s2Extra })];
  const refusal = (ls) => { const r = compose.validateLegs(ls, START_1276, []); return r.error || null; };
  const noField = legs();
  delete noField[0].waypoints;
  const twoClaims = { materials: ["L1", "L2"], claims: [{ type: "strand", strand: "L1", proposition: "claim one of s1" },
    { type: "strand", strand: "L2", proposition: "claim two of s1" }] };
  const cases = [
    ["a Leg with no waypoints field", noField, /leg 1 \(s1\): carries no waypoints/],
    ["a Leg with an empty waypoints list", legs({ waypoints: [] }), /leg 1 \(s1\): carries no waypoints/],
    ["a waypoint with an empty point", legs({}, { waypoints: [{ point: "s2's claim holds", serves: ["L1"] }, { point: " ", serves: ["L1"] }] }),
      /leg 2 \(s2\): waypoint 2 has an empty point/],
    // THE EFFECT FORM IS REFUSED BY NAME (kogaki#1326): a waypoint still
    // carrying `effect` is not read as one with no point.
    ["a waypoint carrying the retired effect", legs({}, { waypoints: [{ effect: "the reader is handed one dated run", point: "s2's claim holds", serves: ["L1"] }] }),
      /leg 2 \(s2\): waypoint 1 carries `effect`, which is retired/],
    ["a waypoint with an empty serves", legs({ waypoints: [{ point: "s1's claim holds", serves: [] }] }),
      /leg 1 \(s1\): waypoint 1 has an empty serves/],
    ["a serves naming a Strand the Leg has no claim for", legs({ waypoints: [{ point: "s1's claim holds", serves: ["L1", "L9"] }] }),
      /leg 1 \(s1\): waypoint 1 serves "L9", and this Leg carries no claim for that Strand/],
    ["a claim no waypoint serves", legs({ ...twoClaims, waypoints: [{ point: "claim one holds", serves: ["L1"] }] }),
      /leg 1 \(s1\): its claim for "L2" is served by no waypoint/],
  ];
  for (const [what, ls, want] of cases) {
    const e = refusal(ls);
    if (!e) fails.push(`(ao1) ${what} was not refused`);
    else if (!want.test(e)) fails.push(`(ao1) ${what} was refused without naming the Leg and the waypoint: ${e}`);
  }

  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const library = compose.loadMoveContracts(fitMoves);
  const input = { state: "compose_path", moves_you_may_bind: library.moves, unit_number: 1 };
  const prompt = judgePrompt(table.reader_path_unit, JSON.stringify(input, null, 2), input, null);
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  if (!schema.fields.waypoints || !prompt.includes(schema.fields.waypoints.description)) {
    fails.push("(ao2) the compose_path unit prompt does not render src/leg-schema.json's `waypoints` entry");
  }
  if (!schema.waypoint || !prompt.includes(schema.waypoint.fields.point.description)) {
    fails.push("(ao2) the compose_path unit prompt does not render the schema's `waypoint` block");
  }
  const W2 = [{ point: "the first party acts", serves: ["L1"] },
    { point: "the second party answers", serves: ["L1"] },
    { point: "the answer is answered, and the balance holds", serves: ["L1"] }];
  const c = cand1276("c1", { waypoints: W2 });
  const j = readerPathFitInput(c, fitMoves, START_1276);
  if (j.error) fails.push(`(ao2) readerPathFitInput refused: ${j.error}`);
  else {
    for (const mc of j.input.candidate_you_must_judge.move_contracts) {
      const leg = c.legs.find((l) => l.leg_id === mc.leg_id);
      if (JSON.stringify(mc.waypoints) !== JSON.stringify(leg.waypoints) || !Array.isArray(mc.segments) || !Array.isArray(mc.breaks)) {
        fails.push(`(ao2) the fit input does not carry leg ${mc.leg_id}'s waypoints beside its Move's segments and breaks: ${JSON.stringify(mc)}`);
      }
    }
  }
  if (!/judge the points, not the claims/.test(table.reader_path_fit_unit.judgment_point)) {
    fails.push("(ao2) the reader_path_fit_unit judgment no longer judges the waypoints against the Move's order");
  }

  // (ao3) m_turn carries two Segments; s2 carries three waypoints and s1
  // one, and nothing refuses either.
  if (FIT_MOVE.m_turn.segments.length === W2.length) fails.push("(ao3) the fixture Move's Segment count no longer differs from the waypoint count");
  const e3 = refusal(legs({}, { waypoints: W2 }));
  if (e3) fails.push(`(ao3) a Candidate whose waypoint counts differ from its Move's named count was refused: ${e3}`);
  const u3 = validateReaderPathUnit(cand1276("c1", { waypoints: W2 }), { strandIds: ["L1"], readerStart: START_1276, movesDir: fitMoves });
  if (u3 && u3.error) fails.push(`(ao3) the compose unit refused the same Candidate: ${u3.error}`);
}

// (ap) kogaki#1327 — a Section heading carries no term ANY Leg of the path
// introduces, not just terms introduced within that Section.
{
  const legsFor = (s1Extra = {}, s2Extra = {}) => [leg1276("s1", { opens_section: "what the reader now holds", ...s1Extra }),
    leg1276("s2", { move: "m_turn", depends_on: ["s1"], reaches_target: true, ...s2Extra })];
  const refusal = (ls) => { const r = compose.validateLegs(ls, START_1276, []); return r.error || null; };

  // a term introduced on a LATER Leg still refuses an EARLIER heading.
  const laterTerm = refusal(legsFor({ opens_section: "what a pipeline now does" }, { introduces: ["pipeline"] }));
  if (!laterTerm) fails.push("(ap) a heading carrying a term introduced on a later Leg was not refused");
  else {
    if (!/"pipeline"/.test(laterTerm)) fails.push(`(ap) the refusal did not name the term: ${laterTerm}`);
    if (!/leg 1 \(s1\)/.test(laterTerm)) fails.push(`(ap) the refusal did not name the heading's Leg: ${laterTerm}`);
    if (!/leg "s2"/.test(laterTerm)) fails.push(`(ap) the refusal did not name the introducing Leg: ${laterTerm}`);
  }

  // a heading free of introduced terms passes.
  const clean = refusal(legsFor({}, { introduces: ["pipeline"] }));
  if (clean) fails.push(`(ap) a heading carrying no introduced term was refused: ${clean}`);
}

// (aq) kogaki#1327 — the `reader_path_fit_unit` input carries each Section's
// heading beside its LAST Leg's after-state, not the opening Leg's own, so
// the fit judge can answer whether the heading states that destination.
{
  const s2After = "knowledge: after s2\nquestion: holds: none";
  const cand = cand1276("c-aq", { reader_state_after: s2After });
  const j = readerPathFitInput(cand, fitMoves, START_1276);
  if (j.error) fails.push(`(aq) readerPathFitInput refused: ${j.error}`);
  else {
    const sh = j.input.candidate_you_must_judge.section_headings;
    if (!Array.isArray(sh) || sh.length !== 1) fails.push(`(aq) section_headings does not carry one entry per Section: ${JSON.stringify(sh)}`);
    else if (sh[0].leg_id !== "s1" || sh[0].heading !== "Intro" || sh[0].after_state !== s2After) {
      fails.push(`(aq) section_headings did not carry the opening Leg's heading beside the Section's LAST Leg's after-state: ${JSON.stringify(sh)}`);
    }
  }
  if (!/section_headings/.test(JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_fit_unit.judgment_point)) {
    fails.push("(aq) the reader_path_fit_unit judgment_point does not name section_headings as one more judged item at the Leg that opens the Section");
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-compose-job");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-compose-job — kogaki#1276: the compose_path prompt and the per-unit Move-fit input carry each Move's segments and breaks verbatim and no technique (kogaki#1412), move/no_move_fits refused naming the Leg, a no_move_fits Leg refusing its unit, the no-tools sentence (kogaki#1307), one contradicts unit among three excluded and named, every Candidate failing ending the Brief with its directory removed; kogaki#1320's compose_path prompt and fit input; kogaki#1325's derived before-state; kogaki#1311's waypoint refusals; and kogaki#1327's Section heading rule and the fit input's Sections.");
JS
