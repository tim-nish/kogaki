#!/usr/bin/env bash
# check-brief-path-review-job — path review as a Detached Job, one unit per
# Candidate (kogaki#1301), driven by `job await` alone from a finished
# minted Brief to CANDIDATE_SELECTION: (x1)-(x6). Since kogaki#1768 the
# Brief composes ONE Candidate, the Reader Path derived from the adopted
# structure, and since kogaki#1775 `compose_path` starts no job: the Harness
# derives one Leg per relation the apex reaches, with no Call, makes the
# synchronous renderings and `leg_sections` calls, and the path-review job
# reviews that one Candidate.
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
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, chmodSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { judgePrompt, JUDGE_INPUT_MARKER } from "./src/workflow/judge.mjs";
import { bindFlow } from "./src/workflow/run-record.mjs";
import { BRIEF_FLOW } from "./src/brief/job-verbs.mjs";
// The run record binds no default lane (kogaki#1741): a Brief row renders under the Brief's flow.
bindFlow(BRIEF_FLOW);
import { findInternalVocabulary } from "./src/assemble.mjs";
import {
  root, JOB_UNIT_NO_TOOLS_SENTENCE, scratch, runRecordPath,
} from "./checks/fixtures/brief-reader-path-job/fixtures.mjs";
const fails = [];

// (x) kogaki#1301, kogaki#1768, kogaki#1775: PATH REVIEW IS A DETACHED JOB, ONE UNIT PER
// CANDIDATE, and the Brief composes exactly one Candidate, the Reader Path. A run directory
// standing after `mint`, its Brief carrying the adopted structure, is advanced once -- `compose_path`
// derives the Legs with no Call and starts no job -- and then driven by `job await` alone against
// a fake judge that answers the renderings call, the `leg_sections` call and the review unit, and
// logs each call. (x1) the one unit's prompt holds the one Candidate, its four derived Legs, and the
// structure; (x2) a `done` review unit assembles to the record keyed by `candidate_id`; (x3) a review
// unit refused every Round leaves no Candidate to offer, and `review_path` refuses naming that, never
// reaching CANDIDATE_SELECTION; (x4) the synchronous judge calls are the renderings and `leg_sections`
// calls, and no `review_path` call is synchronous; (x6) `compose_path` writes no reader-path job.
{
  const { composeBrief } = await import("./src/brief.mjs");
  const { withApex } = await import("./src/compose/structure.mjs");
  const base = mkdtempSync(join(tmpdir(), "kogaki-1301-"));
  const CLAIM = "Guards fail open when nobody feeds them.";
  const CLAIMS = [{ id: "L1", claim: CLAIM }];
  const STRANDS = [{ display_id: "L1", slug: "fixture-strand", cite: "fixture" }];
  // THE STRUCTURE AS THE RUNNER MINTS IT (kogaki#1772): `r_`, `c_` and `h_` ids beside each name, and the adopted apex
  // the next `h_<n>`, carrying no `from`.
  const structure = withApex({
    roles: [{ id: "r_1", name: "guard", context: "A check standing at a gate.", attributes: [], claims: ["L1"] },
      { id: "r_2", name: "input", context: "What feeds the check.", attributes: [], claims: ["L1"] }],
    relations: [{ id: "c_1", name: "reads", between: ["r_1", "r_2"], holds: "{r_1} reads {r_2}.", from: "L1" },
      { id: "c_2", name: "opens", between: ["r_1", "r_2"], holds: "{r_1} opens when {r_2} stops.", from: "L1" }],
    higher_order: [{ id: "h_1", name: "fails_open", relates: ["c_1", "c_2"], holds: "Because {r_1} reads only {r_2}, it opens when {r_2} stops.", from: ["L1"] }],
  }, { name: "apex", relates: ["h_1"], holds: CLAIM }, CLAIMS);
  const calls = join(base, "calls.jsonl");
  const judgeText = (refuseReview) => `#!/usr/bin/env node
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
  if (head.includes("\`renderings_unit\`")) {
    record = { version: "1", renderings: [] };
  } else if (head.includes("\`leg_sections\`")) {
    record = { sections: [{ leg_id: input.legs[0].leg_id, opens_section: "Guards and what feeds them" }] };
  } else if (head.includes("\`review_path_unit\`")) {
    const x = input.candidate_you_must_review;
    // A SCHEMA REFUSAL every time (kogaki#1307): a record missing an area, which the declared validator refuses.
    record = ${refuseReview ? "{ rationale_stands: \"r\", claim_register: x.legs.map((l) => ({ leg_id: l.leg_id, verdict: \"holds\" })) }"
      : "{ rationale_stands: \"r\", entailment: \"e\", prohibitions: \"p\", semantic_economy: \"s\", arc_integrity: \"a\", evaluation_levels: \"v\", claim_register: x.legs.map((l) => ({ leg_id: l.leg_id, verdict: \"holds\" })) }"};
  } else { process.stderr.write("unexpected prompt: " + head + "\\n"); process.exit(5); }
  process.stdout.write((format === "stream-json" ? JSON.stringify({ type: "result", result: JSON.stringify(record) }) : JSON.stringify(record)) + "\\n");
});
`;
  const judge = join(base, "judge.mjs");
  writeFileSync(judge, judgeText(false));
  chmodSync(judge, 0o755);
  const refusingJudge = join(base, "judge-refuse.mjs");
  writeFileSync(refusingJudge, judgeText(true));
  chmodSync(refusingJudge, 0o755);
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  // A run directory standing after `mint`, its Brief minted with one Strand and the adopted structure.
  const mkRun = (name, extra = {}) => {
    const dir = join(base, name);
    mkdirSync(dir);
    // THE BRIEF SITS IN ITS OWN HOME, as a minted one does: an ending that archives the home moves it alone.
    mkdirSync(join(base, "theses", name), { recursive: true });
    const briefPath = join(base, "theses", name, "brief.yaml");
    writeFileSync(briefPath, composeBrief({ slug: "fixture", strands: STRANDS, thesis: CLAIM,
      composePath: "audiences/dev-to-zenn.md", claims: [CLAIM], structure }));
    const runState = join(dir, "run.json");
    writeFileSync(runState, JSON.stringify({ stage: "adopted", strands: STRANDS, adopted_thesis: CLAIM, adopted_slug: "fixture",
      strand_renderings: { "fixture-strand": { found: true, headline: CLAIM, cite: "fixture" } }, adopted_structure: structure }, null, 2) + "\n");
    writeFileSync(runRecordPath(dir), JSON.stringify({
      workflow: { path: "src/brief-workflow.json", version: briefTable.version }, judge_binary: null, survey_record: null,
      completed: ["enter", "read_structure", "apex", "THESIS_ADOPTION", "adopt_thesis", "mint"], waits_reached: [],
      conditional_entered: [], conditional_skipped: [], awaiting: null, owner_input: {},
      artifacts_written: [{ state: "mint", path: briefPath }], judgments: {}, gate_declarations_owed: [],
      brief_run_state: runState, done: false, ...extra,
    }, null, 2) + "\n");
    return dir;
  };
  const env = (dir, j) => ({ ...process.env, KOGAKI_BRIEF_RUN_DIR: dir, KOGAKI_BRIEF_OPEN_RUN: join(dir, "open-run-pointer.json"),
    KOGAKI_JUDGE_CLI: j });
  const advanceIn = (dir, j = judge) => spawnSync(process.execPath, ["src/brief.mjs", "run"],
    { cwd: root, timeout: 60000, encoding: "utf8", env: env(dir, j),
      input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-x", tool_use_id: "toolu_x_0" }) });
  const awaitIn = (dir, j = judge) => spawnSync(process.execPath, ["src/brief.mjs", "run", "--status", "--job", "await"],
    { cwd: root, timeout: 60000, encoding: "utf8", env: env(dir, j) });
  const recOf = (dir) => JSON.parse(readFileSync(runRecordPath(dir), "utf8"));
  const drive = (dir, j = judge) => {
    const outputs = [advanceIn(dir, j)];
    for (let i = 0; i < 6 && recOf(dir).awaiting !== "CANDIDATE_SELECTION" && !recOf(dir).done
      && /Executor STOPPED at review_path|already open/.test(outputs[outputs.length - 1].stdout || ""); i++) outputs.push(awaitIn(dir, j));
    return { outputs, seen: JSON.stringify(outputs.map((o) => ({ status: o.status, stdout: (o.stdout || "").slice(-400), stderr: (o.stderr || "").slice(-400) }))) };
  };
  const now = new Date().toISOString();

  const dir = mkRun("live");
  const { outputs, seen } = drive(dir);
  const rec = recOf(dir);
  if (!/Executor STOPPED at review_path/.test(outputs[0].stdout || "")) fails.push(`(x4) the advance past compose_path did not stop at review_path's own job start: ${seen}`);
  // (x6) compose_path STARTS NO JOB (kogaki#1775): no reader-path job record stands at the run directory.
  if (existsSync(join(dir, "reader-path-job.json")) || existsSync(join(dir, "reader-path-waypoints.json"))) {
    fails.push("(x6) compose_path left a reader-path job record or a Waypoint file at the run directory -- it derives its Legs with no Call");
  }
  if (rec.awaiting !== "CANDIDATE_SELECTION") fails.push(`(x4) the run did not reach CANDIDATE_SELECTION with the review done by the job: awaiting=${rec.awaiting} ${seen}`);

  // (x1) the one Candidate in the one unit prompt, with the structure, as the supervisor was handed it.
  const unitsFile = join(dir, "review-path", "reader-path-job-units.json");
  const declared = existsSync(unitsFile) ? JSON.parse(readFileSync(unitsFile, "utf8")) : { units: [] };
  const map = rec.brief_review_units || {};
  if (declared.units.length !== 1) fails.push(`(x1) the path-review job declared ${declared.units.length} unit(s), want one for the one Candidate`);
  for (const u of declared.units) {
    const input = JSON.parse(u.prompt.slice(u.prompt.indexOf(JUDGE_INPUT_MARKER) + JUDGE_INPUT_MARKER.length));
    const own = input.candidate_you_must_review;
    if (!own || own.candidate_id !== "reader-path" || map[u.id] !== "reader-path"
      || JSON.stringify((own.legs || []).map((l) => [l.leg_id, l.relation, typeof l.text, "waypoints" in l])) !== '[["L1","c_1","string",false],["L2","c_2","string",false],["L3","h_1","string",false],["L4","h_2","string",false]]'
      || !input.structure || input.structure.attains_thesis !== "h_2" || Object.hasOwn(input.structure.higher_order[1], "from")) {
      fails.push(`(x1) unit ${u.id}'s prompt does not hold the one Reader Path, its four derived Legs, and the structure: ${JSON.stringify({ own: own && own.candidate_id, map: map[u.id], legs: own && own.legs })}`);
    }
  }
  if (declared.record_array !== "claim_register" || !declared.validator || declared.validator.export !== "validateReviewPathUnit") {
    fails.push(`(x1) the path-review units file does not declare its record array and validator: ${JSON.stringify({ record_array: declared.record_array, validator: declared.validator && declared.validator.export })}`);
  }
  const declPath = join(dir, "brief-candidate-selection.run-declaration.json");
  const decl = existsSync(declPath) ? JSON.parse(readFileSync(declPath, "utf8")) : {};
  if (JSON.stringify(decl.run_composed_option_ids) !== JSON.stringify(["reader-path"]) || decl.excluded_candidates) {
    fails.push(`(x1) CANDIDATE_SELECTION offers ${JSON.stringify(decl.run_composed_option_ids)} with ${JSON.stringify(decl.excluded_candidates)} above it, want ["reader-path"] and nothing excluded`);
  }

  // (x4) the synchronous calls are the renderings and `leg_sections` calls; no `review_path` call is synchronous, and the detector fires.
  const isSyncReviewPath = (call) => call.format !== "stream-json" && call.head.includes("`review_path`");
  const logged = existsSync(calls) ? readFileSync(calls, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  if (logged.some(isSyncReviewPath)) fails.push(`(x4) a synchronous review_path judge call was made: ${JSON.stringify(logged)}`);
  if (logged.filter((c) => c.format === "stream-json" && c.head.includes("`review_path_unit`")).length !== 1) fails.push(`(x4) the one path-review unit did not reach the judge once: ${JSON.stringify(logged)}`);
  const sync = logged.filter((c) => c.format !== "stream-json");
  if (sync.length !== 2 || !sync[0].head.includes("`renderings_unit`") || !sync[1].head.includes("`leg_sections`")) {
    fails.push(`(x4) the synchronous judge calls are not the renderings call and the one leg_sections call (kogaki#1768, kogaki#1775): ${JSON.stringify(sync)}`);
  }
  const reviewRow = briefTable.states.find((s) => s.id === "review_path");
  const syncHead = judgePrompt(reviewRow, "{}", {}, null).split("\n")[0];
  if (!isSyncReviewPath({ format: briefTable.judge.output_format, head: syncHead })) fails.push(`(x4) the detector does not fire on the head a synchronous review_path call carries: ${syncHead}`);

  // (x2) a `done` review unit assembles to the record keyed by candidate_id.
  const cand = JSON.parse(readFileSync(join(dir, "brief-candidates.json"), "utf8"))[0];
  const entryFor = (c) => ({ rationale_stands: "r", entailment: "e", prohibitions: "p", semantic_economy: "s",
    arc_integrity: "a", evaluation_levels: "v", claim_register: c.legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) });
  const dir2 = mkRun("assembled", {
    completed: ["enter", "read_structure", "apex", "THESIS_ADOPTION", "adopt_thesis", "mint", "compose_path"], awaiting: "review_path",
    brief_review_units: { "review-1": "reader-path" }, detached_job_dirs: { review_path: "review-path" },
  });
  const candsPath = join(dir2, "brief-candidates.json");
  writeFileSync(candsPath, JSON.stringify([cand], null, 2));
  writeFileSync(runRecordPath(dir2), JSON.stringify({ ...recOf(dir2), brief_candidates: candsPath }, null, 2) + "\n");
  mkdirSync(join(dir2, "review-path"));
  writeFileSync(join(dir2, "review-path", "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_rounds: 3, supervisor_pid: null, state: "done",
    units: [{ id: "review-1", status: "done", bytes: 50, candidate: entryFor(cand) }],
  }, null, 2) + "\n");
  const r2 = awaitIn(dir2);
  const after = recOf(dir2);
  const review = after.brief_review && existsSync(after.brief_review) ? JSON.parse(readFileSync(after.brief_review, "utf8")) : null;
  const { recoverability: _r, ...judged } = (review && review["reader-path"]) || {};
  if (!review || JSON.stringify(Object.keys(review)) !== '["reader-path"]' || JSON.stringify(judged) !== JSON.stringify(entryFor(cand))) {
    fails.push(`(x2) the done unit did not assemble to the record keyed by candidate_id: ${JSON.stringify(review)} stdout=${(r2.stdout || "").slice(-400)} stderr=${(r2.stderr || "").slice(-400)}`);
  }
  if (after.awaiting !== "CANDIDATE_SELECTION" || (after.brief_review_unfinished || []).length) fails.push(`(x2) the reviewed Candidate did not reach CANDIDATE_SELECTION with none left out: awaiting=${after.awaiting} unfinished=${JSON.stringify(after.brief_review_unfinished)}`);

  // (x3) the one review unit refused every Round: no Candidate is offered, and the run stops short of the gate.
  {
    const dir3 = mkRun("review-refused");
    const d3 = drive(dir3, refusingJudge);
    const rec3 = recOf(dir3);
    const all3 = d3.outputs.map((o) => `${o.stdout}${o.stderr}`).join("\n");
    if (rec3.awaiting === "CANDIDATE_SELECTION" || existsSync(join(dir3, "brief-candidate-selection.run-declaration.json"))) {
      fails.push(`(x3) a Reader Path whose review was refused every Round was offered at CANDIDATE_SELECTION: ${d3.seen}`);
    }
    if (!/carries no reviewed Candidate|refused/.test(all3)) fails.push(`(x3) the refused review was not reported: ${d3.seen}`);
  }

  // (x5) the table: `review_path` carries a `job` block declaring its own stall
  // and heartbeat, its two bounds NAME the settings (kogaki#1355), `compose_path`
  // declares no job (kogaki#1775), its unit row exists, and the judge note
  // states that no synchronous judgment follows the jobs.
  const job = reviewRow.job || {};
  if ((briefTable.states.find((s) => s.id === "compose_path") || {}).job) fails.push("(x5) compose_path still declares a job -- it derives its Legs with no Call (kogaki#1775)");
  for (const k of ["stall_s", "heartbeat_ms"]) {
    if (!(Number.isInteger(job[k]) && job[k] > 0)) fails.push(`(x5) review_path's job block does not declare ${k} as the bound the supervisor enforces (${job[k]})`);
  }
  if ((job.call_limit_s || {}).setting !== "brief.call_limit_s" || (job.unit_rounds || {}).setting !== "brief.unit_rounds"
    || job.absolute_limit_s !== undefined) {
    fails.push(`(x5) review_path's job does not name the settings brief.call_limit_s and brief.unit_rounds alone: ${JSON.stringify(job)}`);
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
console.log("ok: check-brief-path-review-job — compose_path derives its four Legs with no Call and starts no job, path review runs as its own Detached Job with the one Reader Path in its one unit beside the structure, a done unit assembled by candidate_id, a refused review offering nothing, and the synchronous calls the renderings and leg_sections calls alone (kogaki#1301, kogaki#1768, kogaki#1775)");
JS
status=$?

if grep -lqs -- "$CLAUDE_CODE_SESSION_ID" "$live_gates"/*.json; then
  echo "FAIL check-brief-path-review-job"
  echo "  - a pointer for the fixture session reached the live open-gate directory $live_gates — a fixture escaped its isolation and opened a real gate"
  exit 1
fi
exit "$status"
