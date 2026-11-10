#!/usr/bin/env bash
# check-brief-compose-job — the compose_path job of the structure-first Brief
# (kogaki#1768; the job kogaki#1193, kogaki#1307). Its one unit composes the Leg
# Waypoints from the adopted RelationalStructure (`lpp_waypoints`), and the
# per-unit judge holds them to GROUNDED (`lpp_grounded`); no Move is bound.
#   (a) the unit prompt and what compose_path declares; (b) `validateBriefWaypoints`
#       refusals by name; (c) the GROUNDED judge's prompt and verdict read back.
#   (aj) the no-tools sentence, no `judge_specialization` or `effort`.
#   (ak) the partition and the lines above the question; (al) a unit refused in
#        every Round ends the Brief through `job await` with no question.
#   (am) the Reader Path renders above the Candidate question.
# Case (al) runs a real `job await` over a fake judge; nothing calls a model.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, chmodSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { composeBrief, validateBriefWaypoints, groundedPrompt, groundedVerdict, groundedInput,
  composeJobExcluded, composeJobFinished, candidateSelectionExtra, noCandidateFitsReport, readerPathReading } from "./src/brief.mjs";
import { startDetachedJobSupervisor } from "./src/workflow/detached-job.mjs";
import { runRecordPath } from "./src/workflow/run-record.mjs";
import { judgePrompt } from "./src/workflow/judge.mjs";
import { bindFlow } from "./src/workflow/run-record.mjs";
import { BRIEF_FLOW } from "./src/brief/job-verbs.mjs";
// The run record binds no default lane (kogaki#1741): a Brief row renders under the Brief's flow.
bindFlow(BRIEF_FLOW);
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const composePathText = () => { const b = briefRuntimeText(); return b.slice(b.indexOf("  compose_path: async"), b.indexOf("  review_path: async")); };
const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
const fails = [];

// THE FIXTURE STRUCTURE: three relations, two higher-order relations, `h2` the apex.
const STRUCTURE = {
  roles: [{ id: "rules", context: "A set of checks that runs without anyone choosing what it reads.", attributes: ["automatic"], claims: ["L1", "L2"] },
    { id: "walk", context: "The list of files a tool visits when it runs.", attributes: [], claims: ["L1", "L2"] },
    { id: "file", context: "One file in a repository.", attributes: ["skipped"], claims: ["L2", "L3"] },
    { id: "team", context: "The people who read the result of a run.", attributes: [], claims: ["L3"] }],
  relations: [{ id: "p1", between: ["rules", "walk"], holds: "{rules} applies only to what {walk} visits.", from: "L1" },
    { id: "p2", between: ["walk", "file"], holds: "{file} left off {walk} is never checked.", from: "L2" },
    { id: "p3", between: ["team", "rules"], holds: "{team} reads a pass of {rules} as covering every file.", from: "L3" }],
  higher_order: [{ id: "h1", relates: ["p1", "p2"], holds: "Because {rules} reads only {walk}, {file} off it is unchecked.", from: ["L2"] },
    { id: "h2", relates: ["h1", "p3"], holds: "{team} trusts a pass that never reached {file}.", from: [] }],
  attains_thesis: "h2",
};
const WAYPOINTS = [
  { point: "An automatic rule set applies only to the files its walker visits.", carries: ["p1"] },
  { point: "A file the walker skips is never checked, because the rules read only the walk.", carries: ["p2", "h1"] },
  { point: "A team that reads a pass as covering every file trusts a pass that never reached the skipped file.", carries: ["p3", "h2"] }];

// (a) THE UNIT PROMPT IS `lpp_waypoints` OVER THE STRUCTURE, and no Move library reaches it.
{
  const input = { state: "compose_path", thesis: "A green run says nothing of the files it never visited.", structure: STRUCTURE,
    persona: { reader: "a developer", prior_knowledge: "has used a CI system" }, language: "English" };
  const prompt = judgePrompt(table.lpp_waypoints, JSON.stringify(input, null, 2), input, null);
  if (!prompt.includes("`lpp_waypoints` judgment point") || !prompt.includes(STRUCTURE.higher_order[1].holds) || !prompt.includes('"attains_thesis": "h2"')) {
    fails.push("(a) the compose_path unit prompt is not the lpp_waypoints row rendered over the structure");
  }
  const cp = composePathText();
  if (/loadMoveContracts|moves_you_may_bind|move_contracts/.test(cp)) fails.push("(a) compose_path still reads the Move library or hands Move contracts (kogaki#1768)");
  for (const [what, re] of [["the unit row lpp_waypoints", /table\.lpp_waypoints/], ["the GROUNDED row lpp_grounded", /table\.lpp_grounded/],
    ["recordArray \"waypoints\"", /recordArray: "waypoints"/], ["record_array \"sites\"", /record_array: "sites"/],
    ["the groundedPrompt / groundedVerdict judge", /prompt_export: "groundedPrompt",\s+verdict_export: "groundedVerdict"/],
    ["the validateBriefWaypoints validator", /export: "validateBriefWaypoints"/], ["the one unit `reader-path`", /id: "reader-path"/]]) {
    if (!re.test(cp)) fails.push(`(a) compose_path does not declare ${what}`);
  }
  for (const gone of ["reader_path_unit", "reader_path_fit_unit"]) if (table[gone]) fails.push(`(a) src/brief-workflow.json still declares the retired \`${gone}\` row`);
}

// (b) THE WAYPOINT VALIDATOR, the real one the job declares.
{
  const v = (ws) => (validateBriefWaypoints({ waypoints: ws }, { structure: STRUCTURE }) || {}).error || null;
  if (v(WAYPOINTS)) fails.push(`(b) a covering Waypoint set was refused: ${v(WAYPOINTS)}`);
  const cases = [
    ["a written `serves`", WAYPOINTS.map((w, i) => (i ? w : { ...w, serves: ["L1"] })), /Waypoint 1 carries `serves` — it is derived from `carries`, never written/],
    ["an id the structure does not carry", WAYPOINTS.map((w, i) => (i ? w : { ...w, carries: ["p9"] })), /"p9"/],
    ["a reached relation no Waypoint carries", [WAYPOINTS[1], WAYPOINTS[2]], /"p1" is carried by no Waypoint/],
    ["a last Waypoint not carrying the apex", [WAYPOINTS[0], WAYPOINTS[2], WAYPOINTS[1]], /Waypoint 3, the last, does not carry "h2"/],
  ];
  for (const [what, ws, want] of cases) {
    const e = v(ws);
    if (!e || !want.test(e)) fails.push(`(b) ${what} was not refused by name: ${e}`);
  }
}

// (c) THE GROUNDED JUDGE: its prompt, and its verdict read back.
{
  const record = { waypoints: WAYPOINTS };
  const head = judgePrompt(table.lpp_grounded, "", null, null);
  const prompt = groundedPrompt(record, { structure: STRUCTURE, promptHead: head });
  const input = groundedInput(record, STRUCTURE);
  if (!prompt.startsWith(head) || !prompt.endsWith(JSON.stringify(input, null, 2))
    || JSON.stringify(input.waypoints.map((w) => w.waypoint)) !== "[1,2,3]" || !("structure" in input)) {
    fails.push("(c) the GROUNDED prompt is not the lpp_grounded head followed by the numbered Waypoints beside the structure");
  }
  if (!/GROUNDED/.test(table.lpp_grounded.judgment_point)) fails.push("(c) the lpp_grounded row does not judge GROUNDED");
  const fits = groundedVerdict({ verdict: "fits", sites: [] }, record);
  if (fits.error || fits.refusal) fails.push(`(c) a fits verdict did not pass: ${JSON.stringify(fits)}`);
  const PHRASE = "because the rules read only the walk";
  const WHY = "No carried relation states why the file goes unchecked in those words.";
  const no = groundedVerdict({ verdict: "does-not-fit", sites: [{ waypoint: 2, phrase: PHRASE, why: WHY }] }, record);
  if (!no.refusal || !no.refusal.includes(PHRASE) || !no.refusal.includes(WHY)) fails.push(`(c) a does-not-fit verdict is not the unit's refusal carrying its site verbatim: ${JSON.stringify(no)}`);
  const bad = groundedVerdict({ verdict: "fits", sites: [{ waypoint: 2, phrase: PHRASE, why: WHY }] }, record);
  if (!bad.error) fails.push(`(c) a fits verdict with sites was not refused as malformed: ${JSON.stringify(bad)}`);
  const offPhrase = groundedVerdict({ verdict: "does-not-fit", sites: [{ waypoint: 2, phrase: "words the point never says", why: WHY }] }, record);
  if (!offPhrase.error) fails.push(`(c) a site whose phrase is not words of its Waypoint was not refused: ${JSON.stringify(offPhrase)}`);
}

// (aj) every compose job unit prompt begins with the no-tools sentence, and
// neither table carries `judge_specialization` or `effort` (kogaki#1307). The
// sentence is read off the units file `startDetachedJobSupervisor` -- the one
// starter `compose_path` calls -- writes for the job.
{
  const run = mkdtempSync(join(tmpdir(), "kogaki-1307-units-"));
  const started = startDetachedJobSupervisor(run, {
    units: [{ id: "reader-path", prompt: "first unit prompt" }, { id: "reader-path-2", prompt: "second unit prompt" }],
    command: "/bin/false", model: "m", outputFormat: "json", callLimitS: 5, unitRounds: 2, stallS: 5, heartbeatMs: 100,
    validator: { module: "src/brief.mjs", export: "validateBriefWaypoints", inputs: {} },
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
  if (!/startDetachedJobSupervisor\(dir, \{\n\s+units[,:]/.test(brief.slice(brief.indexOf("  compose_path: async"), brief.indexOf("  review_path: async")))) {
    fails.push("(aj) compose_path no longer starts its job through startDetachedJobSupervisor, so the units file above is not its prompts");
  }
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  if (table.states.some((x) => x.id === "judge_specialization")) fails.push("(aj) src/brief-workflow.json still declares a judge_specialization state");
  const hasEffort = (v) => v && typeof v === "object" && (Array.isArray(v) ? v.some(hasEffort) : ("effort" in v || Object.values(v).some(hasEffort)));
  if (hasEffort(table)) fails.push("(aj) src/brief-workflow.json still carries an `effort` field");
  if (hasEffort(JSON.parse(readFileSync("src/terrain-workflow.json", "utf8")))) fails.push("(aj) src/terrain-workflow.json still carries an `effort` field");
}

// (ak)/(al) the partition, the lines above the question, and the closing report.
// A unit refused in its last Round ends `refused`, carrying the refusal; the
// partition is read off the rows by the run's own filters (kogaki#1360).
{
  const WHY = "THE WAYPOINTS WERE JUDGED, AND THESE ARE NOT GROUNDED IN THE RELATIONS THEY CARRY: Waypoint 2";
  const done = { id: "reader-path", status: "done", rounds: 2, candidate: { waypoints: WAYPOINTS } };
  const refused = { id: "reader-path", status: "refused", rounds: 3, candidate: { waypoints: WAYPOINTS }, failure: { class: "schema refusal", stderr_tail: WHY } };
  if (JSON.stringify(composeJobFinished([done]).map((u) => u.id)) !== '["reader-path"]' || composeJobFinished([refused]).length) {
    fails.push("(ak) composeJobFinished does not keep the done unit alone");
  }
  const excluded = composeJobExcluded([refused]);
  if (excluded.length !== 1 || excluded[0].refusal !== WHY) fails.push(`(ak) composeJobExcluded does not carry the refused unit's refusal: ${JSON.stringify(excluded)}`);
  const extra = candidateSelectionExtra(excluded).excluded_candidates || "";
  if (extra !== "Not offered: the Reader Path — its Leg Waypoints were refused in every Round.") fails.push(`(ak) the line above the Candidate question is not the plain not-offered line: ${JSON.stringify(extra)}`);
  if (Object.keys(candidateSelectionExtra([])).length) fails.push("(ak) with nothing excluded, something still renders above the question");
  const sel = table.states.find((x) => x.id === "CANDIDATE_SELECTION");
  if (sel.renders_above_question !== "reader_path") fails.push(`(ak) CANDIDATE_SELECTION renders ${JSON.stringify(sel.renders_above_question)} above the question, not the Reader Path`);
  const keys = readFileSync("src/workflow/gate.mjs", "utf8").match(/const GATE_CALL_READING_KEYS = .*/)[0];
  if (!/"excluded_candidates"/.test(keys) || !/"reader_path"/.test(keys)) fails.push("(ak) excluded_candidates or reader_path is not a gate-call reading key");

  // (al) END TO END through `job await`: the compose unit refused in every Round, under a run
  // whose Brief was minted in a `theses/<slug>/` of its own. No question is asked, the folder is
  // archived, and the report carries the last Round's refusal.
  const base = mkdtempSync(join(tmpdir(), "kogaki-1768-nofit-"));
  const thesisDir = join(base, "theses", "fixture-1768");
  mkdirSync(thesisDir, { recursive: true });
  const briefPath = join(thesisDir, "brief.yaml");
  writeFileSync(briefPath, composeBrief({ slug: "fixture-1768", strands: [{ display_id: "L1", slug: "fixture-strand", cite: "fixture" }],
    thesis: "The fixture claim.", composePath: "audiences/dev-to-zenn.md", structure: STRUCTURE }));
  const run = join(base, "run");
  mkdirSync(run);
  const now = new Date().toISOString();
  writeFileSync(join(run, "reader-path-job.json"), JSON.stringify({
    started_at: now, last_progress_at: now, updated_at: now, call_limit_s: 900, unit_rounds: 3, supervisor_pid: null, state: "refused",
    units: [{ ...refused, bytes: 50 }],
  }, null, 2) + "\n");
  writeFileSync(runRecordPath(run), JSON.stringify({
    workflow: { path: "src/brief-workflow.json", version: table.version }, judge_binary: null, survey_record: null,
    completed: ["enter", "read_structure", "apex", "THESIS_ADOPTION", "adopt_thesis", "mint"], waits_reached: [],
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
  if (existsSync(thesisDir)) fails.push(`(al) no Reader Path was composed and theses/<slug>/ is still there: ${thesisDir} stderr=${report}`);
  // ARCHIVED, NEVER DELETED (kogaki#1742): the folder is under theses/.archive/.
  const archived = existsSync(join(base, "theses", ".archive")) ? readdirSync(join(base, "theses", ".archive")) : [];
  if (!archived.some((n) => n.startsWith("fixture-1768@") && existsSync(join(base, "theses", ".archive", n, "brief.yaml")))) fails.push(`(al) the empty Brief was not moved to theses/.archive/: ${JSON.stringify(archived)}`);
  if (!/was moved to \S*\.archive\/fixture-1768@\S*, so its name is free again/.test(report)) fails.push(`(al) the closing report does not say where the Brief was moved: ${report}`);
  if (!report.includes("No Reader Path was composed") || !report.includes(`The last Round was refused: ${WHY}`)) fails.push(`(al) the report does not carry the last Round's refusal: ${report}`);
  if (after.done !== true || (after.gate_declarations_owed || []).length || after.awaiting) fails.push(`(al) a unit refused in every Round raised a question or left the run open: ${JSON.stringify(after)}`);
  if (existsSync(join(run, "brief-reader-path-job.gate-call.json"))) fails.push("(al) a unit refused in every Round wrote a gate call");
  const kept = noCandidateFitsReport(excluded, "theses/fixture/brief.yaml", { removed: false });
  if (!/could not be moved/.test(kept)) fails.push(`(al) a Brief that could not be moved is not reported as kept: ${kept}`);
}

// (am) THE READER PATH ABOVE THE QUESTION (kogaki#1768): each Leg with the higher-order relation
// it serves, its Section heading where it opens one, and each Leg Waypoint with what it carries.
{
  const candidate = { candidate_id: "reader-path", legs: [
    { leg_id: "s1", relation: "h1", opens_section: "What the walk leaves out", waypoints: [{ ...WAYPOINTS[0], serves: ["L1"] }, { ...WAYPOINTS[1], serves: ["L2"] }] },
    { leg_id: "s2", relation: "h2", reaches_target: true, waypoints: [{ ...WAYPOINTS[2], serves: ["L3"] }] }] };
  const text = readerPathReading([candidate], STRUCTURE);
  const want = ["The Reader Path: 2 Leg(s), 3 Leg Waypoint(s).", "Section: What the walk leaves out",
    "s1 — Because rules reads only walk, file off it is unchecked.", `  2. ${WAYPOINTS[1].point} (carries p2, h1)`,
    "s2 — team trusts a pass that never reached file."];
  for (const w of want) if (!text.includes(w)) fails.push(`(am) the Reader Path reading does not carry ${JSON.stringify(w)}: ${text}`);
}

if (fails.length > 0) {
  console.log("FAIL check-brief-compose-job");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-compose-job — kogaki#1768: the compose_path unit prompt is lpp_waypoints over the RelationalStructure and hands no Move library, the Waypoint validator refuses a written serves, an unknown id, an uncarried reached relation and a last Waypoint without the apex, the GROUNDED judge's verdict is the unit's refusal carrying its sites verbatim; the no-tools sentence (kogaki#1307); the partition and the not-offered line; a unit refused in every Round ending the Brief with its folder archived; and the Reader Path rendered above the Candidate question.");
JS
