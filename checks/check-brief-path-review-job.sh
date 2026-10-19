#!/usr/bin/env bash
# check-brief-path-review-job — path review as a Detached Job, one unit per
# Candidate (kogaki#1301), driven by `job await` alone from a finished
# Reader-path job to CANDIDATE_SELECTION: (x1)-(x5).
# Cut from check-brief-reader-path-job.sh by kogaki#1464.
set -u
cd "$(dirname "$0")/.."

# FIXTURE ISOLATION. `emitGateDeclaration`, reached by the job's gate, writes an
# open-gate pointer and a gate-declaration sidecar keyed to the session id it
# reads from the environment. Inherited, that opens a live gate in whichever
# session runs this check and the gate-open hook then refuses every tool but
# the gate's own question — which is what stopped two implement workers on
# #1193. So the whole member runs under a fixture session id and scratch
# directories, and fails if a pointer naming the fixture session reached the
# live pointer directory (pointers are keyed by gate instance, so the match is
# on the session id they carry — another session's gate is not this check's).
live_gates="${KOGAKI_OPEN_GATES:-$HOME/.claude/kogaki-open-gates}"
iso="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-rpjob-iso-XXXXXX")"
trap 'rm -rf "$iso"' EXIT
export KOGAKI_OPEN_GATES="$iso/open-gates"
export GATE_DECLARATION_SIDECAR_DIR="$iso/gate-declarations"
export CLAUDE_CODE_SESSION_ID="check-brief-path-review-job-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { judgePrompt, JUDGE_INPUT_MARKER } from "./src/workflow/judge.mjs";
import { findInternalVocabulary } from "./src/assemble.mjs";
import {
  root, JOB_UNIT_NO_TOOLS_SENTENCE, scratch, runRecordPath,
} from "./checks/fixtures/brief-reader-path-job/fixtures.mjs";
const fails = [];

// (x) kogaki#1301: PATH REVIEW IS A DETACHED JOB, ONE UNIT PER CANDIDATE. A
// run directory just past `differentiation`, beside a `done` reader-path job
// of three Candidates, is driven by `job await` alone against a fake judge
// that answers every unit (refusing every attempt for `c2`) and logs each call.
// (x1) each unit's prompt holds exactly one Candidate; (x2) three `done` units
// assemble to the record keyed by `candidate_id`; (x3) the refused unit leaves
// the other two at CANDIDATE_SELECTION with `c2` named above the question;
// (x4) no synchronous judge call was made, the `review_path` detector shown to
// fire on the head such a call would carry.
{
  const { composeBrief } = await import("./src/brief.mjs");
  const base = mkdtempSync(join(tmpdir(), "kogaki-1301-"));
  const moves = join(base, "moves");
  mkdirSync(moves);
  for (const id of ["m_open", "m_turn"]) {
    writeFileSync(join(moves, `${id}.yaml`), [
      `id: ${id}`, `description: the fixture Move ${id}.`, "before:", `  knowledge: before ${id}.`,
      "after:", `  knowledge: after ${id}.`, "breaks:", `  - breaks if ${id} is skipped.`,
      "segments:", `  - does: opens ${id}.`, `  - does: closes ${id}.`, "    relation: answers the opening.", "",
    ].join("\n"));
  }
  // A FIXTURE LIBRARY IS A LIBRARY (kogaki#1349): the adapter in
  // `src/compose.mjs` reads `<movesDir>/ROLES.json` with no fallback.
  writeFileSync(join(moves, "ROLES.json"), readFileSync("moves/ROLES.json"));
  const START = "knowledge: before\nquestion: holds: none";
  const leg = (legId, extra) => ({
    leg_id: legId, move: "m_open", materials: ["L1"], purpose: `what ${legId} is for`,
    reader_state_after: "knowledge: after\nquestion: holds: none",
    depends_on: [], rationale: `why ${legId} sits here`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${legId}` }], waypoints: [{ point: `the paragraph establishes what ${legId} claims`, serves: ["L1"] }],
    ...extra,
  });
  const cand = (id) => ({
    candidate_id: id, characteristic: `path ${id}`, reader_experience: `experience ${id}`,
    reasoning: { leg_validity: "x" },
    legs: [leg("s1", { opens_section: "Intro" }), leg("s2", { move: "m_turn", depends_on: ["s1"], reaches_target: true })],
  });
  const entryFor = (c) => ({ rationale_stands: "r", entailment: "e", prohibitions: "p", semantic_economy: "s",
    arc_integrity: "a", evaluation_levels: "v", claim_register: c.legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) });
  const judge = join(base, "judge.mjs");
  const calls = join(base, "calls.jsonl");
  writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const argv = process.argv.slice(2);
if (argv.includes("--version")) { process.stdout.write("fixture judge\\n"); process.exit(0); }
const format = argv[argv.indexOf("--output-format") + 1];
const NO_TOOLS = ${JSON.stringify(JOB_UNIT_NO_TOOLS_SENTENCE)};
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const sent = Buffer.concat(c).toString("utf8");
  const prompt = sent.startsWith(NO_TOOLS) ? sent.slice(NO_TOOLS.length).replace(/^\\s+/, "") : sent;
  const head = prompt.split("\\n")[0];
  appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ format, head }) + "\\n");
  const input = JSON.parse(prompt.slice(prompt.indexOf(${JSON.stringify(JUDGE_INPUT_MARKER)}) + ${JUDGE_INPUT_MARKER.length}));
  let record;
  if (head.includes("\`review_path_unit\`")) {
    const x = input.candidate_you_must_review;
    // A SCHEMA REFUSAL every time (kogaki#1307): a record missing an area, which the
    // declared validator refuses -- unparseable stdout would be malformed output,
    // respawned until the job limit.
    if (x.candidate_id === "c2") {
      record = { rationale_stands: "r", claim_register: x.legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) };
      process.stdout.write((format === "stream-json" ? JSON.stringify({ type: "result", result: JSON.stringify(record) }) : JSON.stringify(record)) + "\\n");
      process.exit(0);
    }
    record = { rationale_stands: "r", entailment: "e", prohibitions: "p", semantic_economy: "s", arc_integrity: "a", evaluation_levels: "v",
      claim_register: x.legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) };
  } else { process.stderr.write("unexpected prompt: " + head + "\\n"); process.exit(5); }
  process.stdout.write((format === "stream-json" ? JSON.stringify({ type: "result", result: JSON.stringify(record) }) : JSON.stringify(record)) + "\\n");
});
`);
  chmodSync(judge, 0o755);
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  // A run directory standing past `differentiation`, its Brief minted with one Strand.
  const mkRun = (name, extra = {}) => {
    const dir = join(base, name);
    mkdirSync(dir);
    const briefPath = join(dir, "brief.yaml");
    writeFileSync(briefPath, composeBrief({ slug: "fixture", strands: [{ display_id: "L1", slug: "fixture-strand", cite: "fixture" }],
      thesis: "The fixture claim.", composePath: "audiences/dev-to-zenn.md" }));
    const diffPath = join(dir, "differentiation.json");
    writeFileSync(diffPath, JSON.stringify({ reader_start: START, leg1_survivors: ["m_open"],
      entries: [1, 2, 3].map((n) => ({ unit_number: n, dimension: ["knowledge", "question", "trust"][n - 1], opening_move: "m_open", reader_experience: `exp ${n}` })) }));
    writeFileSync(runRecordPath(dir), JSON.stringify({
      workflow: { path: "src/brief-workflow.json", version: briefTable.version }, judge_binary: null, survey_record: null,
      completed: ["enter", "THESIS_ADOPTION", "adopt_thesis", "mint", "differentiation"], waits_reached: [],
      conditional_entered: [], conditional_skipped: [], awaiting: null, owner_input: {},
      artifacts_written: [{ state: "mint", path: briefPath }], judgments: {}, gate_declarations_owed: [],
      brief_differentiation: diffPath, done: false, ...extra,
    }, null, 2) + "\n");
    return dir;
  };
  const env = (dir) => ({ ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json"),
    KOGAKI_JUDGE_CLI: judge });
  const awaitIn = (dir) => spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await", "--moves-dir", moves],
    { cwd: root, timeout: 60000, encoding: "utf8", env: env(dir) });
  const recOf = (dir) => JSON.parse(readFileSync(runRecordPath(dir), "utf8"));
  const now = new Date().toISOString();

  const dir = mkRun("live");
  writeFileSync(join(dir, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "done",
    units: ["c1", "c2", "c3"].map((id, i) => ({ id: `candidate-${i + 1}`, status: "done", bytes: 50, candidate: cand(id) })),
  }, null, 2) + "\n");
  const outputs = [awaitIn(dir)];
  for (let i = 0; i < 6 && recOf(dir).awaiting !== "CANDIDATE_SELECTION" && !recOf(dir).done; i++) outputs.push(awaitIn(dir));
  const rec = recOf(dir);
  const seen = JSON.stringify(outputs.map((o) => ({ status: o.status, stdout: (o.stdout || "").slice(-400), stderr: (o.stderr || "").slice(-400) })));
  if (!/Executor STOPPED at review_path/.test(outputs[0].stdout || "")) fails.push(`(x4) the resumed reader-path job did not stop at review_path's own job start: ${seen}`);
  if (rec.awaiting !== "CANDIDATE_SELECTION") fails.push(`(x4) the run did not reach CANDIDATE_SELECTION with the review done by the job: awaiting=${rec.awaiting} ${seen}`);

  // (x1) one Candidate per unit prompt, as the supervisor was handed them.
  const unitsFile = join(dir, "review-path", "reader-path-job-units.json");
  const declared = existsSync(unitsFile) ? JSON.parse(readFileSync(unitsFile, "utf8")) : { units: [] };
  const map = rec.brief_review_units || {};
  if (declared.units.length !== 3) fails.push(`(x1) the path-review job declared ${declared.units.length} unit(s), want one per Candidate (3)`);
  for (const u of declared.units) {
    const input = JSON.parse(u.prompt.slice(u.prompt.indexOf(JUDGE_INPUT_MARKER) + JUDGE_INPUT_MARKER.length));
    const own = input.candidate_you_must_review && input.candidate_you_must_review.candidate_id;
    const others = ["c1", "c2", "c3"].filter((id) => id !== own && u.prompt.includes(`"candidate_id": "${id}"`));
    if (!own || own !== map[u.id] || others.length) fails.push(`(x1) unit ${u.id}'s prompt does not hold exactly its one Candidate (${map[u.id]}): holds ${own}, also names ${JSON.stringify(others)}`);
  }
  if (declared.record_array !== "claim_register" || !declared.validator || declared.validator.export !== "validateReviewPathUnit") {
    fails.push(`(x1) the path-review units file does not declare its record array and validator: ${JSON.stringify({ record_array: declared.record_array, validator: declared.validator && declared.validator.export })}`);
  }

  // (x3) the refused unit's Candidate is left out, and named above the question.
  const declPath = join(dir, "brief-candidate-selection.run-declaration.json");
  const decl = existsSync(declPath) ? JSON.parse(readFileSync(declPath, "utf8")) : {};
  if (JSON.stringify(decl.run_composed_option_ids) !== JSON.stringify(["c1", "c3"])) fails.push(`(x3) CANDIDATE_SELECTION offers ${JSON.stringify(decl.run_composed_option_ids)}, want ["c1","c3"] with the refused c2 left out`);
  if (!String(decl.excluded_candidates || "").includes("path c2") || /path c1|path c3/.test(String(decl.excluded_candidates || ""))) {
    fails.push(`(x3) the line above the Candidate question does not name the refused Candidate alone: ${JSON.stringify(decl.excluded_candidates)}`);
  }
  if (findInternalVocabulary(String(decl.excluded_candidates || ""))) fails.push(`(x3) the line above the Candidate question leaks internal vocabulary: ${decl.excluded_candidates}`);

  // (x4) no synchronous `review_path` call in any advance, and the detector fires.
  const isSyncReviewPath = (call) => call.format !== "stream-json" && call.head.includes("`review_path`");
  const logged = existsSync(calls) ? readFileSync(calls, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (logged.some(isSyncReviewPath)) fails.push(`(x4) a synchronous review_path judge call was made: ${JSON.stringify(logged)}`);
  if (logged.filter((c) => c.format === "stream-json" && c.head.includes("`review_path_unit`")).length < 3) fails.push(`(x4) fewer than three path-review units reached the judge: ${JSON.stringify(logged)}`);
  if (logged.some((c) => c.format !== "stream-json")) fails.push(`(x4) a synchronous judge call was made, though no judgment state follows the path-review job since kogaki#1307: ${JSON.stringify(logged)}`);
  const reviewRow = briefTable.states.find((s) => s.id === "review_path");
  const syncHead = judgePrompt(reviewRow, "{}", {}, null).split("\n")[0];
  if (!isSyncReviewPath({ format: briefTable.judge.output_format, head: syncHead })) fails.push(`(x4) the detector does not fire on the head a synchronous review_path call carries: ${syncHead}`);

  // (x2) three `done` units assemble to the record keyed by candidate_id.
  const cands = ["c1", "c2", "c3"].map(cand);
  const dir2 = mkRun("assembled", {
    completed: ["enter", "THESIS_ADOPTION", "adopt_thesis", "mint", "differentiation", "compose_path"], awaiting: "review_path",
    brief_review_units: { "review-1": "c1", "review-2": "c2", "review-3": "c3" }, detached_job_dirs: { review_path: "review-path" },
  });
  const candsPath = join(dir2, "brief-candidates.json");
  writeFileSync(candsPath, JSON.stringify(cands.map((c) => ({ ...c, reader_start: START, differentiation_unit: Number(c.candidate_id.slice(1)) })), null, 2));
  const rec2 = recOf(dir2);
  writeFileSync(runRecordPath(dir2), JSON.stringify({ ...rec2, brief_candidates: candsPath }, null, 2) + "\n");
  mkdirSync(join(dir2, "review-path"));
  writeFileSync(join(dir2, "review-path", "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "done",
    units: cands.map((c, i) => ({ id: `review-${i + 1}`, status: "done", bytes: 50, candidate: entryFor(c) })),
  }, null, 2) + "\n");
  const r2 = awaitIn(dir2);
  const after = recOf(dir2);
  const review = after.brief_review && existsSync(after.brief_review) ? JSON.parse(readFileSync(after.brief_review, "utf8")) : null;
  if (!review || JSON.stringify(Object.keys(review).sort()) !== JSON.stringify(["c1", "c2", "c3"])
    || JSON.stringify(review.c2) !== JSON.stringify(entryFor(cands[1]))) {
    fails.push(`(x2) three done units did not assemble to the record keyed by candidate_id: ${JSON.stringify(review)} stdout=${(r2.stdout || "").slice(-400)} stderr=${(r2.stderr || "").slice(-400)}`);
  }
  if (after.awaiting !== "CANDIDATE_SELECTION" || (after.brief_review_unfinished || []).length) fails.push(`(x2) three reviewed Candidates did not reach CANDIDATE_SELECTION with none left out: awaiting=${after.awaiting} unfinished=${JSON.stringify(after.brief_review_unfinished)}`);

  // (x6) kogaki#1360: A COMPOSE UNIT REFUSED ON MOVE FIT KEEPS ITS CANDIDATE ON
  // THE ROW, and that Candidate reaches `excluded` and nothing else. A `done`
  // compose job whose `candidate-2` ended `refused` with `candidate` still on it
  // and `failure.move_fit` naming Leg s2 is driven through `job await` to
  // CANDIDATE_SELECTION: the forwarded set carries c1 and c3 only, c2 sits
  // under `excluded`, the question offers ["c1","c3"], and the line above it
  // names c2 and neither offered Candidate. Before this case every refused
  // fixture unit carried no `candidate`, so the presence test the resume arm
  // used read exactly like the status test it was not.
  {
    const dir6 = mkRun("fit-refused");
    const refusal = "THE MOVE FIT WAS JUDGED, AND THESE LEGS DO NOT FIT THE MOVE EACH BINDS:\nLeg s2 (m_turn): contradicts — fixture why.";
    writeFileSync(join(dir6, "reader-path-job.json"), JSON.stringify({
      started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_attempts: 3, supervisor_pid: null, state: "done",
      units: [
        { id: "candidate-1", status: "done", bytes: 50, candidate: cand("c1"), specialization: { version: "1", candidate_id: "c1", verdicts: [] } },
        { id: "candidate-2", status: "refused", bytes: 50, candidate: cand("c2"), attempts: 3,
          failure: { class: "schema refusal", exit_code: 0, stderr_tail: refusal,
            move_fit: [{ leg_id: "s2", move: "m_turn", verdict: "contradicts", why: "fixture why." }] } },
        { id: "candidate-3", status: "done", bytes: 50, candidate: cand("c3"), specialization: { version: "1", candidate_id: "c3", verdicts: [] } },
      ],
    }, null, 2) + "\n");
    const outs6 = [awaitIn(dir6)];
    for (let i = 0; i < 6 && recOf(dir6).awaiting !== "CANDIDATE_SELECTION" && !recOf(dir6).done; i++) outs6.push(awaitIn(dir6));
    const rec6 = recOf(dir6);
    const seen6 = JSON.stringify(outs6.map((o) => ({ status: o.status, stdout: (o.stdout || "").slice(-300), stderr: (o.stderr || "").slice(-300) })));
    const fwdPath = join(dir6, "reader-path-candidates.json");
    const fwd = existsSync(fwdPath) ? JSON.parse(readFileSync(fwdPath, "utf8")) : {};
    const fwdIds = (fwd.candidates || []).map((c) => c.candidate_id);
    const exIds = (fwd.excluded || []).map((x) => x.candidate_id);
    if (JSON.stringify(fwdIds) !== JSON.stringify(["c1", "c3"]) || JSON.stringify(exIds) !== JSON.stringify(["c2"])) {
      fails.push(`(x6) the set forwarded to compose_path is ${JSON.stringify(fwdIds)} with excluded ${JSON.stringify(exIds)}, want ["c1","c3"] and ["c2"]: ${seen6}`);
    }
    if (rec6.awaiting !== "CANDIDATE_SELECTION") fails.push(`(x6) the run did not reach CANDIDATE_SELECTION: awaiting=${rec6.awaiting} ${seen6}`);
    const decl6Path = join(dir6, "brief-candidate-selection.run-declaration.json");
    const decl6 = existsSync(decl6Path) ? JSON.parse(readFileSync(decl6Path, "utf8")) : {};
    if (JSON.stringify(decl6.run_composed_option_ids) !== JSON.stringify(["c1", "c3"])) {
      fails.push(`(x6) CANDIDATE_SELECTION offers ${JSON.stringify(decl6.run_composed_option_ids)}, want ["c1","c3"] with the fit-refused c2 left out`);
    }
    const above6 = String(decl6.excluded_candidates || "");
    if (!above6.includes("path c2") || !above6.includes("Leg s2") || /path c1|path c3/.test(above6)) {
      fails.push(`(x6) the line above the Candidate question does not name the fit-refused Candidate and its Leg alone: ${JSON.stringify(above6)}`);
    }
  }

  // (x5) the table: `review_path` carries a `job` block on the reader-path
  // job's own stall and heartbeat, its two bounds NAME the same settings as the
  // compose job's (kogaki#1355), its unit row exists, and the judge note states
  // that no synchronous judgment follows the jobs.
  const job = reviewRow.job || {};
  const composeJob = (briefTable.states.find((s) => s.id === "compose_path") || {}).job || {};
  for (const k of ["stall_s", "heartbeat_ms"]) {
    if (job[k] === undefined || job[k] !== composeJob[k]) fails.push(`(x5) review_path's job block does not declare ${k} as the bound the supervisor enforces (${job[k]} vs ${composeJob[k]})`);
  }
  if ((job.call_limit_s || {}).setting !== "brief.call_limit_s" || (job.unit_attempts || {}).setting !== "brief.unit_attempts"
    || job.absolute_limit_s !== undefined) {
    fails.push(`(x5) review_path's job does not name the settings brief.call_limit_s and brief.unit_attempts alone: ${JSON.stringify(job)}`);
  }
  if (!briefTable.review_path_unit || !/ONE CANDIDATE|ONE composed Candidate/.test(briefTable.review_path_unit.judgment_point || "")) fails.push("(x5) src/brief-workflow.json declares no review_path_unit row for one Candidate");
  if (!/no synchronous judgment state follows the jobs/.test(briefTable.judge.note || "")) fails.push("(x5) the judge note does not state that no synchronous judgment follows the jobs");
}

rmSync(scratch, { recursive: true, force: true });

if (fails.length) {
  console.log("FAIL check-brief-path-review-job");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-path-review-job — path review runs as its own Detached Job with one Candidate per unit, a refused unit's Candidate left out and named, and no synchronous review_path call in any advance (kogaki#1301)");
JS
status=$?

if grep -lqs -- "$CLAUDE_CODE_SESSION_ID" "$live_gates"/*.json; then
  echo "FAIL check-brief-path-review-job"
  echo "  - a pointer for the fixture session reached the live open-gate directory $live_gates — a fixture escaped its isolation and opened a real gate"
  exit 1
fi
exit "$status"
