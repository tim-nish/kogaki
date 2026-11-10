#!/usr/bin/env bash
# check-brief-compose-job — compose_path ends at Legs (kogaki#1775, owner design 2026-11-10):
# one Leg per relation and higher-order relation the apex reaches, derived with no Call, each
# Leg's `text` its relation's `holds`, the apex's Leg alone marked at any position.
#   (a) the five derived Legs, and compose_path declaring no job or Waypoint row; (b) the
#       reach rule's refusals; (c) `validateLegs` refusing `waypoints`, `move`, no `text`.
#   (aj) the no-tools sentence on the one job a Brief starts (`review_path`).
#   (ak) the lines above the Candidate question; (am) the Reader Path reading.
#   (al) END TO END: one advance from `mint` over a fake judge makes the renderings and
#        `leg_sections` calls alone and writes one Candidate, no Waypoint and no Round.
# Nothing calls a model.
set -u
cd "$(dirname "$0")/.."

iso="$(mktemp -d "${TMPDIR:-/tmp}/kogaki-compose-iso-XXXXXX")"
trap 'rm -rf "$iso"' EXIT
export KOGAKI_OPEN_GATES="$iso/open-gates"
export GATE_DECLARATION_SIDECAR_DIR="$iso/gate-declarations"
export CLAUDE_CODE_SESSION_ID="check-brief-compose-job-fixture"
mkdir -p "$KOGAKI_OPEN_GATES" "$GATE_DECLARATION_SIDECAR_DIR"

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, chmodSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composeBrief, candidateSelectionExtra, readerPathReading } from "./src/brief.mjs";
import { validateLegs } from "./src/compose.mjs";
import { startDetachedJobSupervisor } from "./src/workflow/detached-job.mjs";
import { runRecordPath } from "./src/workflow/run-record.mjs";
import { JUDGE_INPUT_MARKER } from "./src/workflow/judge.mjs";
import { mintStructure, structureLegs, pathReachRefusal } from "./src/compose/structure.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const code = (t) => t.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const composePathText = () => { const b = briefRuntimeText(); return code(b.slice(b.indexOf("  compose_path: async"), b.indexOf("  review_path: async"))); };
const finishText = () => { const b = briefRuntimeText(); return code(b.slice(b.indexOf("async function finishReaderPath("), b.indexOf("export function thesisBoundRefusal"))); };
const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
const fails = [];

// THE FIXTURE STRUCTURE: three relations, two higher-order relations, `h2` the apex, its ids minted by the runner over
// the names the read answers (kogaki#1772).
const STRUCTURE = mintStructure({
  roles: [{ name: "rules", context: "A set of checks that runs without anyone choosing what it reads.", attributes: ["automatic"], claims: ["L1", "L2"] },
    { name: "walk", context: "The list of files a tool visits when it runs.", attributes: [], claims: ["L1", "L2"] },
    { name: "file", context: "One file in a repository.", attributes: ["skipped"], claims: ["L2", "L3"] },
    { name: "team", context: "The people who read the result of a run.", attributes: [], claims: ["L3"] }],
  relations: [{ name: "p1", between: ["rules", "walk"], holds: "{rules} applies only to what {walk} visits.", from: "L1" },
    { name: "p2", between: ["walk", "file"], holds: "{file} left off {walk} is never checked.", from: "L2" },
    { name: "p3", between: ["team", "rules"], holds: "{team} reads a pass of {rules} as covering every file.", from: "L3" }],
  higher_order: [{ name: "h1", relates: ["p1", "p2"], holds: "Because {rules} reads only {walk}, {file} off it is unchecked.", from: ["L2"] },
    { name: "h2", relates: ["h1", "p3"], holds: "{team} trusts a pass that never reached {file}." }],
  attains_thesis: "h2",
}).structure;
const CLAIMS = [{ id: "L1", claim: "Rules apply to the walk." }, { id: "L2", claim: "A skipped file is unchecked." }, { id: "L3", claim: "Teams trust a pass." }];
const WANT = [["L1", "c_1", "rules applies only to what walk visits."], ["L2", "c_2", "file left off walk is never checked."],
  ["L3", "h_1", "Because rules reads only walk, file off it is unchecked."], ["L4", "c_3", "team reads a pass of rules as covering every file."],
  ["L5", "h_2", "team trusts a pass that never reached file."]];
const shape = (legs) => JSON.stringify((legs || []).map((l) => [l.leg_id, l.relation, l.text]));

// (a) FIVE LEGS, DERIVED WITH NO CALL: one per reached relation and higher-order relation, in post-order, each
// saying its relation's `holds` with the Role names substituted, the apex's alone marked.
const LEGS = structureLegs(STRUCTURE, CLAIMS);
{
  if (shape(LEGS) !== JSON.stringify(WANT)) fails.push(`(a) the derived Legs are not the five, in post-order, each saying its relation's holds: ${shape(LEGS)}`);
  const marked = LEGS.filter((l) => l.reaches_target === true).map((l) => l.relation);
  if (JSON.stringify(marked) !== '["h_2"]') fails.push(`(a) the Leg marked reaches_target is not the apex's alone: ${JSON.stringify(marked)}`);
  for (const l of LEGS) {
    for (const gone of ["waypoints", "move", "rounds"]) if (gone in l) fails.push(`(a) derived Leg ${l.leg_id} carries \`${gone}\` (kogaki#1775)`);
    if (!Array.isArray(l.claims) || !l.claims.length || l.claims.some((c) => c.type !== "strand")) fails.push(`(a) derived Leg ${l.leg_id} carries no Strand claims: ${JSON.stringify(l.claims)}`);
  }
  if (JSON.stringify(LEGS[2].claims.map((c) => c.strand)) !== '["L2"]') fails.push(`(a) a higher-order relation's Leg does not carry the claims its \`from\` names: ${JSON.stringify(LEGS[2].claims)}`);
  for (const gone of ["lpp_waypoints", "lpp_grounded", "reader_path_unit", "reader_path_fit_unit"]) {
    if (table[gone]) fails.push(`(a) src/brief-workflow.json still declares the retired \`${gone}\` row`);
  }
  if ((table.states.find((x) => x.id === "compose_path") || {}).job) fails.push("(a) compose_path still declares a job (kogaki#1775)");
  const cp = `${composePathText()}\n${finishText()}`;
  for (const [what, re] of [["a Detached Job", /startDetachedJobSupervisor/], ["a Waypoint row", /table\.lpp_/], ["a Waypoint record array", /recordArray|record_array/],
    ["the Move library", /loadMoveContracts|moves_you_may_bind|move_contracts/]]) {
    if (re.test(cp)) fails.push(`(a) compose_path still starts or reads ${what}`);
  }
  if (!/structureLegs\(structure, claims\)/.test(cp) || !/pathReachRefusal\(derived, structure\)/.test(cp)) fails.push("(a) compose_path does not derive its Legs through structureLegs and hold them to pathReachRefusal");
}

// (b) THE REACH RULE: every reached id has one Leg, no Leg is outside it, the apex's Leg alone is marked, at any position.
{
  const cases = [
    ["a Leg outside the reach", [...LEGS, { ...LEGS[0], leg_id: "L6", relation: "c_9" }], /Leg L6 serves "c_9", which the apex does not reach/],
    ["two Legs on one relation", [...LEGS, { ...LEGS[0], leg_id: "L6" }], /Legs L1 and L6 both serve "c_1"/],
    ["a reached relation with no Leg", LEGS.filter((l) => l.relation !== "c_2"), /leaves "c_2" with no Leg/],
    ["a mark on a Leg not the apex's", LEGS.map((l) => (l.relation === "h_1" ? { ...l, reaches_target: true } : l)), /not the apex's alone/],
  ];
  for (const [what, legs, want] of cases) {
    const e = pathReachRefusal(legs, STRUCTURE);
    if (!e || !want.test(e)) fails.push(`(b) ${what} was not refused by name: ${e}`);
  }
  if (pathReachRefusal(LEGS, STRUCTURE)) fails.push(`(b) the derived Legs were refused: ${pathReachRefusal(LEGS, STRUCTURE)}`);
  const apexFirst = [LEGS[4], ...LEGS.slice(0, 4)];
  if (pathReachRefusal(apexFirst, STRUCTURE)) fails.push(`(b) a path with the marked Leg first was refused, though the apex's Leg stands at any position: ${pathReachRefusal(apexFirst, STRUCTURE)}`);
}

// (c) THE LEG SCHEMA UNDER A STRUCTURE: a Brief Leg carrying `waypoints` or `move`, or no `text`, is refused by name.
{
  // The first Leg opens a Section, as the leg_sections Call answers it (the Section grouping rule 3).
  const sectioned = (legs) => legs.map((l, i) => (i === 0 ? { ...l, opens_section: "What the walk leaves out" } : { ...l }));
  const ok = validateLegs(sectioned(LEGS), { structure: STRUCTURE });
  if (ok.error) fails.push(`(c) the derived Legs were refused by validateLegs: ${ok.error}`);
  const withField = (k, v) => LEGS.map((l, i) => (i === 1 ? { ...l, [k]: v } : { ...l }));
  const cases = [
    ["a Leg carrying waypoints", withField("waypoints", [{ point: "x" }]), /carries `waypoints`/],
    ["a Leg carrying move", withField("move", "m-1"), /`move`/],
    ["a Leg with no text", LEGS.map((l, i) => { const { text, ...rest } = l; return i === 1 ? rest : { ...l }; }), /`text`/],
  ];
  for (const [what, legs, want] of cases) {
    const e = validateLegs(sectioned(legs), { structure: STRUCTURE }).error;
    if (!e || !want.test(e)) fails.push(`(c) ${what} was not refused by name: ${e}`);
  }
  const marked = validateLegs(sectioned([LEGS[4], ...LEGS.slice(0, 4)]), { structure: STRUCTURE });
  if (marked.error) fails.push(`(c) a Reader Path with the apex's Leg first was refused: ${marked.error}`);
}

// (aj) every job unit prompt begins with the no-tools sentence, and neither table carries `judge_specialization`
// or `effort` (kogaki#1307). The sentence is read off the units file `startDetachedJobSupervisor` -- the one starter
// `review_path`, the Brief's one job since kogaki#1775, calls -- writes for the job.
{
  const run = mkdtempSync(join(tmpdir(), "kogaki-1307-units-"));
  const started = startDetachedJobSupervisor(run, {
    units: [{ id: "review-1", prompt: "first unit prompt" }, { id: "review-2", prompt: "second unit prompt" }],
    command: "/bin/false", model: "m", outputFormat: "json", callLimitS: 5, unitRounds: 2, stallS: 5, heartbeatMs: 100,
    validator: { module: "src/brief.mjs", export: "validateReviewPathUnit", inputs: {} },
  });
  try { process.kill(started.supervisorPid); } catch { /* already gone */ }
  const declared = JSON.parse(readFileSync(started.unitsPath, "utf8"));
  const heads = declared.units.map((u, i) => u.prompt.slice(0, u.prompt.length - `\n\n${["first", "second"][i]} unit prompt`.length));
  const sentence = heads[0] || "";
  if (declared.units.length !== 2 || !declared.units[0].prompt.endsWith("\n\nfirst unit prompt") || heads[1] !== sentence) {
    fails.push(`(aj) the job unit prompts do not each begin with the same sentence ahead of the unit's own text: ${JSON.stringify(declared.units.map((u) => u.prompt.slice(0, 80)))}`);
  }
  if (!/^You are running with no tools/.test(sentence) || !/not something to open/.test(sentence) || /\n/.test(sentence)) {
    fails.push(`(aj) the sentence every unit prompt begins with does not say the session has no tools and that a path is not to be opened: ${JSON.stringify(sentence)}`);
  }
  const brief = briefRuntimeText();
  if (!/startDetachedJobSupervisor\(/.test(brief.slice(brief.indexOf("  review_path: async"), brief.indexOf("  attach_review:")))) {
    fails.push("(aj) review_path no longer starts its job through startDetachedJobSupervisor, so the units file above is not its prompts");
  }
  if (table.states.some((x) => x.id === "judge_specialization")) fails.push("(aj) src/brief-workflow.json still declares a judge_specialization state");
  const hasEffort = (v) => v && typeof v === "object" && (Array.isArray(v) ? v.some(hasEffort) : ("effort" in v || Object.values(v).some(hasEffort)));
  if (hasEffort(table)) fails.push("(aj) src/brief-workflow.json still carries an `effort` field");
  if (hasEffort(JSON.parse(readFileSync("src/terrain-workflow.json", "utf8")))) fails.push("(aj) src/terrain-workflow.json still carries an `effort` field");
}

// (ak) the lines above the Candidate question: nothing with nothing excluded, and one plain line for a review left unfinished.
{
  if (Object.keys(candidateSelectionExtra([])).length) fails.push("(ak) with nothing excluded, something still renders above the question");
  const extra = candidateSelectionExtra([{ candidate_id: "reader-path" }]).excluded_candidates || "";
  if (extra !== "Not offered: the Reader Path — its review did not finish.") fails.push(`(ak) the line above the Candidate question is not the plain not-offered line: ${JSON.stringify(extra)}`);
  if (/Waypoint/.test(extra)) fails.push(`(ak) the not-offered line still names a Waypoint: ${extra}`);
  const sel = table.states.find((x) => x.id === "CANDIDATE_SELECTION");
  if (sel.renders_above_question !== "reader_path") fails.push(`(ak) CANDIDATE_SELECTION renders ${JSON.stringify(sel.renders_above_question)} above the question, not the Reader Path`);
  const keys = readFileSync("src/workflow/gate.mjs", "utf8").match(/const GATE_CALL_READING_KEYS = .*/)[0];
  if (!/"excluded_candidates"/.test(keys) || !/"reader_path"/.test(keys)) fails.push("(ak) excluded_candidates or reader_path is not a gate-call reading key");
}

// (al) END TO END: one advance from `mint` over a fake judge. The judge answers the renderings call and the
// `leg_sections` call and logs every call; compose_path makes those two calls alone, starts no job, and writes the
// one Candidate carrying the five derived Legs, no Waypoint and no Round. The run then stops at review_path's job start.
{
  const base = mkdtempSync(join(tmpdir(), "kogaki-1775-compose-"));
  const thesisDir = join(base, "theses", "fixture-1775");
  mkdirSync(thesisDir, { recursive: true });
  const strands = [1, 2, 3].map((n) => ({ display_id: `L${n}`, slug: `strand-${n}`, cite: "fixture" }));
  const thesis = "A green run says nothing of the files it never visited.";
  const briefPath = join(thesisDir, "brief.yaml");
  writeFileSync(briefPath, composeBrief({ slug: "fixture-1775", strands, thesis, composePath: "audiences/dev-to-zenn.md",
    claims: CLAIMS.map((c) => c.claim), structure: STRUCTURE }));
  const run = join(base, "run");
  mkdirSync(run);
  const runState = join(run, "run.json");
  writeFileSync(runState, JSON.stringify({ stage: "adopted", strands, adopted_thesis: thesis, adopted_slug: "fixture-1775",
    strand_renderings: Object.fromEntries(strands.map((s, i) => [s.slug, { found: true, headline: CLAIMS[i].claim, cite: "fixture" }])),
    adopted_structure: STRUCTURE }, null, 2) + "\n");
  writeFileSync(runRecordPath(run), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: table.version }, judge_binary: null, survey_record: null,
    completed: ["enter", "read_structure", "apex", "THESIS_ADOPTION", "adopt_thesis", "mint"], waits_reached: [],
    conditional_entered: [], conditional_skipped: [], awaiting: null, owner_input: {},
    artifacts_written: [{ state: "mint", path: briefPath }], judgments: {}, gate_declarations_owed: [],
    brief_run_state: runState, done: false,
  }, null, 2) + "\n");
  const calls = join(base, "calls.jsonl");
  const judge = join(base, "judge.mjs");
  writeFileSync(judge, `#!/usr/bin/env node
import { appendFileSync } from "node:fs";
const argv = process.argv.slice(2);
if (argv.includes("--version")) { process.stdout.write("fixture judge\\n"); process.exit(0); }
const format = argv[argv.indexOf("--output-format") + 1];
const c = []; process.stdin.on("data", (d) => c.push(d)); process.stdin.on("end", () => {
  const prompt = Buffer.concat(c).toString("utf8");
  const head = prompt.split("\\n").find((l) => l.startsWith("You are the judge")) || prompt.split("\\n")[0];
  appendFileSync(${JSON.stringify(calls)}, JSON.stringify({ format, head }) + "\\n");
  const input = JSON.parse(prompt.slice(prompt.indexOf(${JSON.stringify(JUDGE_INPUT_MARKER)}) + ${JUDGE_INPUT_MARKER.length}));
  let record;
  if (head.includes("\\\`renderings_unit\\\`")) record = { version: "1", renderings: [] };
  else if (head.includes("\\\`leg_sections\\\`")) record = { sections: [{ leg_id: input.legs[0].leg_id, opens_section: "What the walk leaves out" }] };
  else { process.exit(5); }
  process.stdout.write((format === "stream-json" ? JSON.stringify({ type: "result", result: JSON.stringify(record) }) : JSON.stringify(record)) + "\\n");
});
`);
  chmodSync(judge, 0o755);
  const r = spawnSync(process.execPath, ["src/brief.mjs", "run"], { encoding: "utf8", timeout: 120000,
    env: { ...process.env, KOGAKI_BRIEF_RUN_DIR: run, KOGAKI_BRIEF_OPEN_RUN: join(run, "open-run-pointer.json"), KOGAKI_JUDGE_CLI: judge },
    input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-1775", tool_use_id: "toolu_1775_0" }) });
  const seen = `status=${r.status} stdout=${(r.stdout || "").slice(-400)} stderr=${(r.stderr || "").slice(-400)}`;
  const rec = JSON.parse(readFileSync(runRecordPath(run), "utf8"));
  const logged = existsSync(calls) ? readFileSync(calls, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const heads = logged.filter((x) => x.format !== "stream-json").map((x) => (/`renderings_unit`/.test(x.head) ? "renderings" : /`leg_sections`/.test(x.head) ? "leg_sections" : x.head));
  if (!rec.completed.includes("compose_path")) fails.push(`(al) the advance did not complete compose_path: ${seen}`);
  if (JSON.stringify(heads) !== '["renderings","leg_sections"]') fails.push(`(al) compose_path's calls are not the renderings and leg_sections calls alone: ${JSON.stringify(logged)} ${seen}`);
  if (logged.some((x) => /lpp_waypoints|lpp_grounded/.test(x.head))) fails.push(`(al) compose_path made a Waypoint call: ${JSON.stringify(logged)}`);
  if (existsSync(join(run, "reader-path-job.json")) || existsSync(join(run, "reader-path-waypoints.json"))) fails.push("(al) compose_path started a reader-path job or wrote a Waypoint file");
  const cands = rec.brief_candidates && existsSync(rec.brief_candidates) ? JSON.parse(readFileSync(rec.brief_candidates, "utf8")) : [];
  const legs = (cands[0] || {}).legs || [];
  if (cands.length !== 1 || shape(legs) !== JSON.stringify(WANT)) fails.push(`(al) the one Candidate does not carry the five derived Legs: ${JSON.stringify(cands).slice(0, 600)}`);
  if (legs.some((l) => "waypoints" in l || "move" in l || "rounds" in l)) fails.push(`(al) a written Leg carries waypoints, move or rounds: ${JSON.stringify(legs).slice(0, 600)}`);
  if (legs[0] && legs[0].opens_section !== "What the walk leaves out") fails.push(`(al) the leg_sections answer did not reach the first Leg: ${JSON.stringify(legs[0])}`);
  if (/rounds/.test(JSON.stringify(rec.judgments.compose_path || {})) || "brief_compose_rounds" in rec) fails.push(`(al) the run record carries a compose Round: ${JSON.stringify(rec.judgments.compose_path)}`);
}

// (am) THE READER PATH ABOVE THE QUESTION (kogaki#1768, kogaki#1775): each Leg with the relation it serves by name and
// the claims it rests on, its Section heading where it opens one, its text, and the apex's Leg saying it attains the Thesis.
{
  const candidate = { candidate_id: "reader-path", legs: LEGS.map((l, i) => (i === 0 ? { ...l, opens_section: "What the walk leaves out" } : l)) };
  const text = readerPathReading([candidate], STRUCTURE);
  const want = ["The Reader Path: 5 Leg(s).", "Section: What the walk leaves out", "L1 — p1 (L1)", "  rules applies only to what walk visits.",
    "L3 — h1 (L2)", "L5 — h2 (L1, L2, L3) (attains the Thesis)", "  team trusts a pass that never reached file."];
  for (const w of want) if (!text.includes(w)) fails.push(`(am) the Reader Path reading does not carry ${JSON.stringify(w)}: ${text}`);
  if (/Waypoint/.test(text)) fails.push(`(am) the Reader Path reading still names a Waypoint: ${text}`);
  if (/\b[rch]_\d+\b/.test(text)) fails.push(`(am) the Reader Path reading prints a bare minted id (kogaki#1772): ${text}`);
}

if (fails.length > 0) {
  console.log("FAIL check-brief-compose-job");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-compose-job — kogaki#1775: compose_path derives five Legs with no Call, one per relation and higher-order relation the apex reaches, each saying its relation's holds, the apex's alone marked at any position; the reach rule and the Leg schema refuse an outside, doubled or missing Leg and a Leg carrying waypoints, move or no text by name; one advance makes the renderings and leg_sections calls alone and writes one Candidate with no Waypoint and no Round; the Reader Path renders each Leg's relation and text");
JS
status=$?
if grep -lqs -- "check-brief-compose-job-fixture" "${HOME}/.claude/kogaki-open-gates"/*.json; then
  echo "FAIL check-brief-compose-job"
  echo "  - a pointer for the fixture session reached the live open-gate directory — a fixture escaped its isolation"
  exit 1
fi
exit "$status"
