#!/usr/bin/env node
// ParagraphPlan — the stage that generates Paragraph Waypoints after the Brief
// (kogaki#1375, owner decision 2026-10-14).
//
// WHAT IT IS. The Brief's Reader Path plans an article down to Leg Waypoints: the
// points the Leg's paragraphs make. This stage refines that plan one level down. For
// every Leg Waypoint it binds one paragraph Move and generates the Paragraph
// Waypoints the bound Move's Segments shape, and it hands them to the Packet through
// one planning record, `theses/<slug>/paragraph-plan.yaml`. It is NOT Reiter and
// Dale's microplanning: word choice, reference and sentence shape stay inside the
// one Writer call. [see: SPEC-draft-pipeline "the ParagraphPlan stage"]
//
// THE MOVE BOUNDARY. Move information may be used up to Paragraph Waypoint generation
// and nowhere after it. So the ParagraphPlan file holds `point` and `serves` per
// Paragraph Waypoint and NOTHING OF A MOVE — no id, no Segment, no field — and which
// Move was bound to which Leg Waypoint stays in this stage's run directory
// (`paragraph-plan-bindings.json`), a record of the run that no later stage reads. The one
// thing the file holds beside them is each later Leg Waypoint's `join` (kogaki#1411): one
// sentence on how its paragraph's first point follows from the paragraph before, composed
// from reader state, naming no Move and no Segment.
// The stage never writes the Brief, and the Brief names nothing downstream: the
// ParagraphPlan file names the Brief it was made from, by path and content hash.
//
// THE LOOP. One Detached Job unit per Leg, in Reader Path order, on the shared
// supervisor (src/workflow/detached-job.mjs). Each attempt is two headless calls:
// `paragraph_plan_unit` binds a Move to each Leg Waypoint and generates its Paragraph
// Waypoints, and `paragraph_plan_judge_unit` judges them against the bound Move's
// `before`, `after`, order (`segments`) and `breaks` -- the same four
// criteria the Leg judge judges (kogaki#1378, owner decision 2026-10-14). A refusal of either is put back into the next attempt's
// prompt verbatim, until `brief.unit_attempts` is spent; a call is bounded by
// `brief.call_limit_s`; there is no limit on the whole job. A Leg that spends its
// attempts stops the stage naming the Leg and the Waypoint, the Brief untouched, and
// the work resumes from the same Brief by running this stage again — the Reader
// Path is not composed again.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the ParagraphPlan stage
//       SPEC-draft-pipeline
//
import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { parseYaml, stringifyYaml } from "./yaml.mjs";
import { parseBriefRecord, unfilledSlots, briefLegs, waypointsRefusal, loadMoveContracts, loadMoveIds,
  moveContract, MOVE_RECORD_EXT, readerPersona, personaPriorKnowledgeLine, PARAGRAPH_PLAN_FILE, sha256, paragraphPlanPathFor,
  paragraphPlanRecord, paragraphPlanRecordText, readParagraphPlanBeside, paragraphPlanShapeRefusal,
  paragraphWaypointsRefusal, joinRefusal, undeclaredKey } from "./compose.mjs";
// THE FILE'S WRITER AND READER LIVE IN src/compose.mjs, shared code, because /draft reads the
// file too and a command module never imports another command's (kogaki#1302); this stage
// re-exports them so its checks reach the whole stage through one module.
export { PARAGRAPH_PLAN_FILE, sha256, paragraphPlanPathFor, paragraphPlanRecord, paragraphPlanRecordText,
  readParagraphPlanBeside, paragraphPlanShapeRefusal, paragraphWaypointsRefusal };
import { judgePrompt, resolveJudgeBinary, settingValue } from "./workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "./workflow/run-record.mjs";
import { startDetachedJobSupervisor, readReaderPathJob, readerPathJobPath, readerPathJobBounds,
  jobStallS, jobHeartbeatMs } from "./workflow/detached-job.mjs";
import { enterRun, laneDir } from "./runs.mjs";

export const PARAGRAPH_PLAN_TABLE = join(REPO, "src", "paragraph-plan-workflow.json");
export const NO_PARAGRAPH_MOVE_FITS = "no_paragraph_move_fits";
// THE ROLES A BOUND PARAGRAPH MOVE MUST FILL (kogaki#1378, owner decision 2026-10-14,
// aligning this stage to the Leg judge's four criteria): `before` and `after` to bind
// and judge against, `breaks` to judge the Paragraph Waypoints survive, and `segments`
// to order them by -- the Move's whole structure, with no fallback: `technique` is
// retired (kogaki#1412) and a Move without `segments` is refused at the Adapter. A
// bound Move missing one is a fatal stop, never a default.
export const PARAGRAPH_MOVE_ROLES = ["before", "after", "segments", "breaks"];
// The run directory's own files, beside the supervisor's.
const START_FILE = "paragraph-plan-start.json";
const BINDINGS_FILE = "paragraph-plan-bindings.json";
const DONE_FILE = "paragraph-plan-done.json";
// THE AWAIT'S OWN BOUND, the Brief's (kogaki#1271): `await` returns after at most this
// long with the status lines, and the skill runs it again.
export const PARAGRAPH_PLAN_AWAIT_S = 30;
export const PARAGRAPH_PLAN_STILL_RUNNING_LINE = "paragraph-plan job still running — call await again";


const FLOW = { lane: "paragraph-plan", label: "ParagraphPlan" };

function fail(msg) {
  process.stderr.write(`paragraph-plan: ${msg}\n`);
  process.exit(1);
}


// ---------------------------------------------------------------------------
// THE BRIEF THIS STAGE READS. An adopted Brief — no slot awaiting composition — whose
// Leg Waypoints pass the Leg Waypoints' own rule, which refuses `move` and `segments`
// by name. Returns `{ text, record, legs }` or `{ error }`.
export function readAdoptedBrief(briefPath) {
  let text;
  try { text = readFileSync(briefPath, "utf8"); }
  catch (e) { return { error: `the Brief at ${briefPath} cannot be read (${e.message})` }; }
  const parsed = parseBriefRecord(text, briefPath);
  if (parsed.error) return { error: parsed.error };
  const open = unfilledSlots(parsed.record);
  if (open.length) {
    return { error: `the Brief at ${briefPath} is not adopted: the field "${open[0]}" still awaits composition — `
      + "/paragraph-plan runs on an adopted Brief (kogaki#1375)" };
  }
  const legs = briefLegs(parsed.record);
  if (!legs.length) return { error: `the Brief at ${briefPath} carries no Reader Path legs — there is nothing to plan` };
  for (const leg of legs) {
    const bad = waypointsRefusal(leg.waypoints, (leg.claims || []).map((g) => g.strand), `the Brief at ${briefPath}, leg ${leg.leg_id}`);
    if (bad) return { error: bad };
  }
  return { text, record: parsed.record, legs };
}

// The Audience the Brief was composed for: the Brief's own `compose_path`, or the one
// `brief.audience_file` names for a Brief minted before that line existed — the read
// `packetPersonaPath` in src/draft.mjs makes. This stage reads its `persona`.
export function audiencePathOf(record) {
  const named = record && record.compose_path;
  if (typeof named === "string" && named !== "") return resolve(REPO, named);
  return resolve(REPO, String(settingValue({ setting: "brief.audience_file" })));
}

// ---------------------------------------------------------------------------
// ONE UNIT PER LEG. The unit's id is `leg-<n>`, its place in the Reader Path, so a file
// name never carries a Leg id; `inputs.legs` is the Legs in that order.

export function unitIdFor(i) { return `leg-${i + 1}`; }
function legForUnit(inputs, unitId) {
  const m = /^leg-(\d+)$/.exec(String(unitId));
  const leg = m ? (inputs.legs || [])[Number(m[1]) - 1] : null;
  if (!leg) throw new Error(`the ParagraphPlan job has no Leg for unit ${JSON.stringify(unitId)}`);
  return leg;
}

// What a unit is handed about its Leg: the derived before-state, the after-state, and
// each Leg Waypoint's own point, serves and the next Leg Waypoint's point -- no Claim
// proposition (kogaki#1382, owner decision 2026-10-14: the Leg Waypoint alone is
// sufficient input; the served Claim justified the Leg Waypoint's selection, not its
// generation). Kept small and plain so the validator and the judge read the same Leg
// the prompt showed.
export function planLeg(leg) {
  const ws = leg.waypoints || [];
  return {
    leg_id: leg.leg_id,
    reader_state_before: leg.reader_state_before ?? null,
    reader_state_after: leg.reader_state_after ?? null,
    waypoints: ws.map((w, i) => ({
      waypoint: i + 1,
      point: String(w.point),
      serves: [...w.serves],
      next_point: i + 1 < ws.length ? String(ws[i + 1].point) : null,
    })),
  };
}

// EVERY SEGMENT REACHES THE PLAN CALL WHOLE, AS ITS TWO FIELDS (kogaki#1414, reverting the
// withholding of kogaki#1403). A Segment is `does`, the step's operation written subject-free,
// and `relation`, its relation to the Segment before it, in prose -- no label set. The Move
// record carries `segments` as a list of maps in that shape (kogaki#1413); this numbers each
// one into `{ segment, does, relation }`, `relation` empty on Segment 1, so the planner reads
// the two fields apart and by position. kogaki#1403 withheld the description because the
// planner read it as content; the plan row now says a `does` is an operation to perform and
// never a point to state, and the judge checks each Paragraph Waypoint against its own
// Segment, so the leak is refused where it happens rather than by blinding the planner (on
// the 2026-10-16 run two labels alone could not carry "concede and promise to simplify", and
// paragraph 2's first point lost its Segment). `before`, `after` and `breaks` are untouched.
export function segmentsForPlanCall(segments) {
  if (!Array.isArray(segments) || !segments.length) return segments;
  return segments.map((s, i) => ({ segment: i + 1, does: String(s.does).trim(), relation: String(s.relation ?? "").trim() }));
}

export function paragraphPlanUnitInput(leg, moves, persona) {
  return {
    leg_you_must_plan: leg,
    paragraph_moves_you_may_bind: moves.map((m) => ({ ...m, segments: segmentsForPlanCall(m.segments) })),
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
  };
}

function renderRowHead(row) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, "", null, null); } finally { bindFlow(held); }
}

export function paragraphPlanUnitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
}

const UNIT_KEYS = ["version", "leg_id", "waypoints"];
const UNIT_WAYPOINT_KEYS = ["waypoint", "move", "why", "join", "paragraph_waypoints"];
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

// THE BOUND MOVE'S ROLES, OR A FATAL STOP (kogaki#1378). THROWS: inside the job the
// supervisor's catch-all ends it `other` with this sentence, which names the Move and the
// role. Nothing here defaults a missing role.
export function boundMoveContract(moveId, movesDir) {
  const c = moveContract(moveId, movesDir);
  if (c.error) {
    throw new Error(`ParagraphPlan stops: the paragraph Move "${moveId}" was bound and cannot be read for the roles `
      + `this stage needs (${PARAGRAPH_MOVE_ROLES.join(", ")}) — ${c.error}`);
  }
  // `before` and `after` arrive rendered one line per dimension, `breaks` as a list of
  // prose tests and `segments` as a list of Segments (kogaki#1413).
  const filled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "");
  for (const role of PARAGRAPH_MOVE_ROLES) {
    if (!filled(c[role])) {
      throw new Error(`ParagraphPlan stops: the paragraph Move "${moveId}" was bound and does not fill the role `
        + `\`${role}\` (${movesDir}/${moveId}${MOVE_RECORD_EXT}) — this stage binds and judges against its before and after, judges `
        + "that the Paragraph Waypoints survive its breaks, and orders them by its segments, so nothing is defaulted. "
        + "Repair the Move record under its own issue.");
    }
  }
  return c;
}

// THE FIRST CALL'S ANSWER, READ BACK (the declared validator). Returns `{ error }` — a
// refusal of the attempt, put verbatim into the next — or `{}`. A Leg Waypoint no Move
// fits is the refusal `no_paragraph_move_fits`, naming the Leg and the Waypoint.
export function validateParagraphPlanUnit(record, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const r = record || {};
  const at = `Leg ${leg.leg_id}`;
  const extra = undeclaredKey(r, UNIT_KEYS);
  if (extra) return { error: `${at}: the plan record carries \`${extra}\`, which it does not declare — it carries version, leg_id and waypoints` };
  if (String(r.version) !== "1") return { error: `${at}: the plan record's version is ${JSON.stringify(r.version)}, not "1"` };
  if (r.leg_id !== leg.leg_id) return { error: `${at}: the plan record names leg ${JSON.stringify(r.leg_id)}, not ${leg.leg_id}` };
  const ws = leg.waypoints;
  if (!Array.isArray(r.waypoints) || r.waypoints.length !== ws.length) {
    return { error: `${at}: the plan record carries ${Array.isArray(r.waypoints) ? r.waypoints.length : "no"} entr(ies) for the Leg's `
      + `${ws.length} Leg Waypoint(s) — one per Leg Waypoint, in order` };
  }
  const library = loadMoveIds(inputs.movesDir);
  if (library.error) throw new Error(library.error);
  const noFit = [];
  for (const [i, e] of r.waypoints.entries()) {
    const atW = `${at}, Waypoint ${i + 1}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) return { error: `${atW}: the entry is not a map` };
    const k = undeclaredKey(e, UNIT_WAYPOINT_KEYS);
    if (k) return { error: `${atW}: the entry carries \`${k}\`, which it does not declare — it carries waypoint, move, why, join (on every Leg Waypoint after the first) and paragraph_waypoints` };
    if (e.waypoint !== i + 1) return { error: `${atW}: the entry is numbered ${JSON.stringify(e.waypoint)} — entries are one per Leg Waypoint, in order` };
    if (typeof e.why !== "string" || words(e.why) < 4) return { error: `${atW}: \`why\` is under four words` };
    if (e.move === null) { noFit.push({ leg_id: leg.leg_id, waypoint: i + 1, point: ws[i].point, why: e.why.trim() }); continue; }
    if (typeof e.move !== "string" || !library.ids.has(e.move)) {
      return { error: `${atW}: binds move ${JSON.stringify(e.move)}, which names no Move in the library at ${inputs.movesDir}` };
    }
    boundMoveContract(e.move, inputs.movesDir);
    // THE JOIN, BY THE PLAN READER'S OWN RULE (kogaki#1411): so the file this stage writes is
    // one /draft reads. Whether it takes up what the previous paragraph left is the judge's.
    const badJoin = joinRefusal(e, i, atW);
    if (badJoin) return { error: badJoin };
    const bad = paragraphWaypointsRefusal(e.paragraph_waypoints, ws[i].serves, atW);
    if (bad) return { error: bad };
  }
  if (noFit.length) return { error: noParagraphMoveFitsRefusal(noFit) };
  return {};
}

export function noParagraphMoveFitsRefusal(failures) {
  return [`NO PARAGRAPH MOVE FITS THESE LEG WAYPOINTS (${NO_PARAGRAPH_MOVE_FITS}):`,
    ...failures.map((f) => `Leg ${f.leg_id}, Waypoint ${f.waypoint} ("${f.point}"): you wrote: "${f.why}"`),
    "There is no fallback paragraph shape. Bind again: read each Move's before and after against this Leg Waypoint "
    + "once more, with the next Leg Waypoint in view."].join("\n");
}

// THE SECOND CALL — the judge. Its input carries each Leg Waypoint with the bound Move's
// before, after, segments and breaks, and the Paragraph Waypoints generated
// for it (kogaki#1378: the same four criteria the Leg judge judges); every Leg Waypoint
// after the first also carries its `join`, judged against the previous entry's bound
// Move's `after` and every Paragraph Waypoint (kogaki#1411).
export function paragraphPlanJudgeInput(record, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  return {
    leg_you_must_judge: {
      leg_id: leg.leg_id,
      reader_state_before: leg.reader_state_before,
      reader_state_after: leg.reader_state_after,
      waypoints: leg.waypoints.map((w, i) => {
        const e = record.waypoints[i];
        const c = boundMoveContract(e.move, inputs.movesDir);
        return { waypoint: i + 1, point: w.point, next_point: w.next_point,
          bound_move: { before: c.before, after: c.after, segments: c.segments, breaks: c.breaks },
          ...(i > 0 ? { join: e.join } : {}),
          paragraph_waypoints: e.paragraph_waypoints };
      }),
    },
  };
}

export function paragraphPlanJudgePrompt(record, inputs, unitId) {
  return `${inputs.promptHead}${JSON.stringify(paragraphPlanJudgeInput(record, inputs, unitId), null, 2)}`;
}

export const PARAGRAPH_PLAN_VERDICTS = ["fits", "does-not-fit"];

// The judge's answer, read back: `{ error }` is its own malformed output, asked again
// with the same prompt; `{ refusal, failures }` refuses the attempt; `{}` passes it.
export function paragraphPlanJudgeVerdict(verdict, record, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const v = verdict || {};
  if (String(v.version) !== "1") return { error: `the verdict record's version is ${JSON.stringify(v.version)}, not "1"` };
  if (v.leg_id !== leg.leg_id) return { error: `the verdict record names leg ${JSON.stringify(v.leg_id)}, not ${leg.leg_id}` };
  if (!Array.isArray(v.verdicts) || v.verdicts.length !== leg.waypoints.length) {
    return { error: `the verdict record carries ${Array.isArray(v.verdicts) ? v.verdicts.length : "no"} verdict(s) for the Leg's `
      + `${leg.waypoints.length} Leg Waypoint(s) — one per Leg Waypoint, in order` };
  }
  const failures = [];
  for (const [i, x] of v.verdicts.entries()) {
    if (!x || typeof x !== "object" || x.waypoint !== i + 1) return { error: `verdict ${i + 1} does not name Waypoint ${i + 1}` };
    if (!PARAGRAPH_PLAN_VERDICTS.includes(x.verdict)) return { error: `Waypoint ${i + 1}'s verdict ${JSON.stringify(x.verdict)} is outside ${PARAGRAPH_PLAN_VERDICTS.join(" | ")}` };
    if (typeof x.why !== "string" || words(x.why) < 4) return { error: `Waypoint ${i + 1}'s \`why\` is under four words` };
    if (x.verdict === "does-not-fit") failures.push({ leg_id: leg.leg_id, waypoint: i + 1, why: x.why.trim() });
  }
  if (!failures.length) return {};
  return { failures, refusal: ["THE PARAGRAPH WAYPOINTS WERE JUDGED, AND THESE DO NOT FIT THE MOVE BOUND TO THEIR LEG WAYPOINT:",
    ...failures.map((f) => `Leg ${f.leg_id}, Waypoint ${f.waypoint}: the judge wrote: "${f.why}"`),
    "Generate the Paragraph Waypoints again so that they begin where the bound Move's before holds, end where its "
    + "after leaves the reader, follow the Move's order (its segments), "
    + "each perform its own Segment's does and stand in that Segment's relation, "
    + "and survive each of its breaks, or bind another Move; and write each join so that it takes up what the "
    + "previous paragraph's bound Move's after leaves open, restates no Paragraph Waypoint, names no noun phrase "
    + "of either paragraph's Paragraph Waypoints, brings no case, example or term of its own and states no effect "
    + "on the reader."].join("\n") };
}

// ---------------------------------------------------------------------------
// THE RUN DIRECTORY. In the Brief's lane, under the Brief's slug and the start instant,
// so a re-run on the same Brief opens a new one and the newest is found by name.

function runPrefix(slug) { return `paragraph-plan-${slug}-`; }

export function latestRunDir(slug, root = laneDir("brief")) {
  if (!existsSync(root)) return null;
  const names = readdirSync(root).filter((n) => n.startsWith(runPrefix(slug))).sort();
  return names.length ? join(root, names[names.length - 1]) : null;
}

function supervisorAlive(pid) {
  if (!Number.isInteger(pid)) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; }
}

function slugOf(record, briefPath) {
  return typeof record.slug === "string" && record.slug !== "" ? record.slug : basename(dirname(resolve(briefPath)));
}

function loadTable() {
  return JSON.parse(readFileSync(PARAGRAPH_PLAN_TABLE, "utf8"));
}

function positiveSetting(row, key) {
  const n = Number(settingValue(row && row[key]));
  return Number.isInteger(n) && n > 0 ? n
    : fail(`src/paragraph-plan-workflow.json's \`job\` declares no positive \`${key}\` -- it names a setting in kogaki.settings.json. Nothing was started.`);
}

function writeJson(path, doc) {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(doc, null, 2)}\n`);
  renameSync(tmp, path);
}

// START: read the adopted Brief, the Move library and the Audience's persona, render one
// prompt per Leg, and hand the units to the shared supervisor. Returns the run directory.
export function startParagraphPlan(briefPath, { runDir = null, movesDir = "moves" } = {}) {
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) fail(brief.error);
  const slug = slugOf(brief.record, briefPath);
  const prior = runDir ? (existsSync(readerPathJobPath(runDir)) ? runDir : null) : latestRunDir(slug);
  if (prior) {
    const job = readReaderPathJob(prior);
    if (job && job.state === "running" && supervisorAlive(job.supervisor_pid)) {
      fail(`a ParagraphPlan job for this Brief is still running at ${relFromRepo(prior)} — run `
        + `\`node src/paragraph-plan.mjs await --brief ${relFromRepo(resolve(briefPath))}\` to poll it. Nothing was started.`);
    }
  }
  const table = loadTable();
  const library = loadMoveContracts(movesDir);
  if (library.error) fail(library.error);
  if (!library.moves.length) fail(`the Move library at ${movesDir} holds no Move — there is nothing to bind. Nothing was started.`);
  const persona = readerPersona(audiencePathOf(brief.record));
  if (persona.error) fail(persona.error);
  const row = table.paragraph_plan_unit || fail("src/paragraph-plan-workflow.json declares no paragraph_plan_unit row. Nothing was started.");
  const judgeRow = table.paragraph_plan_judge_unit || fail("src/paragraph-plan-workflow.json declares no paragraph_plan_judge_unit row. Nothing was started.");
  const callLimitS = positiveSetting(table.job, "call_limit_s");
  const unitAttempts = positiveSetting(table.job, "unit_attempts");
  const declared = process.env.KOGAKI_JUDGE_CLI || table.judge.command;
  const binary = resolveJudgeBinary(String(declared), process.env.PATH);
  const model = String(settingValue(table.judge.model));
  const legs = brief.legs.map(planLeg);
  const dir = runDir || enterRun("brief", `${runPrefix(slug)}${new Date().toISOString().replace(/[:.]/g, "-")}`);
  writeJson(join(dir, START_FILE), {
    brief: relFromRepo(resolve(briefPath)), brief_sha256: sha256(brief.text), started_at: new Date().toISOString(),
    moves_dir: movesDir, legs,
  });
  const units = legs.map((leg, i) => ({ id: unitIdFor(i), prompt: paragraphPlanUnitPrompt(row, paragraphPlanUnitInput(leg, library.moves, persona)) }));
  startDetachedJobSupervisor(dir, {
    units, command: binary.path, model, outputFormat: String(table.judge.output_format || "json"),
    callLimitS, unitAttempts,
    stallS: jobStallS(table.job.stall_s),
    heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
    recordArray: "waypoints",
    validator: { module: "src/paragraph-plan.mjs", export: "validateParagraphPlanUnit", inputs: { legs, movesDir } },
    fitJudge: { module: "src/paragraph-plan.mjs", prompt_export: "paragraphPlanJudgePrompt", verdict_export: "paragraphPlanJudgeVerdict",
      inputs: { legs, movesDir, promptHead: renderRowHead(judgeRow) } },
  });
  return dir;
}

// ---------------------------------------------------------------------------
// THE END OF A JOB. Every Leg done writes the ParagraphPlan file and the run's own
// binding record; any Leg not done stops the stage naming the Leg and the Waypoint,
// and writes nothing beside the Brief.

export function jobStatusLines(dir, job, now = Date.now()) {
  const startedAt = Date.parse(job.started_at || job.updated_at || new Date(now).toISOString());
  let bounds = null;
  try { bounds = readerPathJobBounds(job); } catch { bounds = null; }
  const lines = [`ParagraphPlan job at ${relFromRepo(readerPathJobPath(dir))} — ${job.state}, elapsed ${Math.floor((now - startedAt) / 1000)}s; `
    + `each Leg gets up to ${bounds ? bounds.unitAttempts : "?"} attempts of at most ${bounds ? `${bounds.callLimitS}s` : "?"} per call:`];
  for (const u of job.units || []) {
    lines.push(`  unit ${u.id}: attempt ${u.attempts || 1}, ${u.phase === "fit" ? "judge" : "plan"}, ${u.status}, ${u.bytes || 0} byte(s)`);
  }
  return lines;
}

// The Waypoints a stopped unit's refusals name, read off the refusal text the validator
// and the judge write (`Leg <id>, Waypoint <n>`); every Leg Waypoint where none is named,
// as for a call stopped at the per-call limit.
export function stoppedWaypoints(leg, refusal) {
  const named = [...String(refusal || "").matchAll(/Waypoint (\d+)/g)].map((m) => Number(m[1]));
  const set = [...new Set(named)].filter((n) => n >= 1 && n <= leg.waypoints.length);
  return set.length ? set : leg.waypoints.map((w) => w.waypoint);
}

export function stopLines(start, job) {
  const lines = [`ParagraphPlan stopped: the job ended ${job.state}, and the Brief at ${start.brief} is unchanged — `
    + "nothing was written beside it. Run /paragraph-plan on the same Brief again to resume; the Reader Path is not composed again."];
  for (const [i, u] of (job.units || []).entries()) {
    if (u.status === "done") continue;
    const leg = start.legs[i];
    const last = Array.isArray(u.refusals) && u.refusals.length ? u.refusals[u.refusals.length - 1]
      : (u.failure && u.failure.stderr_tail) || (job.failure && job.failure.note) || u.status;
    const ws = stoppedWaypoints(leg, last);
    lines.push(`  Leg ${leg.leg_id}, Waypoint ${ws.join(", ")}: ${u.status} after ${u.attempts || 1} attempt(s) — ${String(last).split("\n").join(" ")}`);
  }
  if (job.failure && job.failure.note && !(job.units || []).some((u) => u.status !== "done")) lines.push(`  ${job.failure.note}`);
  return lines;
}

// Finish a terminal job. Returns `{ written }` or `{ stopped: lines }`.
export function finishParagraphPlan(dir) {
  const start = JSON.parse(readFileSync(join(dir, START_FILE), "utf8"));
  const job = readReaderPathJob(dir);
  if (!job) return { stopped: [`ParagraphPlan: no job record at ${relFromRepo(dir)}`] };
  const units = job.units || [];
  if (job.state !== "done" || units.length !== start.legs.length || units.some((u) => u.status !== "done" || !u.candidate)) {
    return { stopped: stopLines(start, job) };
  }
  const briefPath = resolve(REPO, start.brief);
  const briefText = readFileSync(briefPath, "utf8");
  if (sha256(briefText) !== start.brief_sha256) {
    return { stopped: [`ParagraphPlan stopped: the Brief at ${start.brief} changed while the job ran (sha256 ${start.brief_sha256} `
      + `at the start, ${sha256(briefText)} now) — nothing was written; run /paragraph-plan on it again.`] };
  }
  const legs = start.legs.map((leg, i) => ({ leg_id: leg.leg_id,
    waypoints: units[i].candidate.waypoints.map((e) => e.paragraph_waypoints),
    joins: units[i].candidate.waypoints.map((e) => e.join ?? null) }));
  const record = paragraphPlanRecord({ briefPath, briefText, legs });
  const planPath = paragraphPlanPathFor(briefPath);
  writeFileSync(planPath, paragraphPlanRecordText(record));
  writeJson(join(dir, BINDINGS_FILE), {
    note: "Which paragraph Move was bound to which Leg Waypoint in this run (kogaki#1375). A record of the run: no later stage reads it.",
    brief: start.brief,
    bindings: start.legs.flatMap((leg, i) => units[i].candidate.waypoints.map((e) => ({ leg_id: leg.leg_id, waypoint: e.waypoint, move: e.move, why: e.why }))),
  });
  writeJson(join(dir, DONE_FILE), { written: relFromRepo(planPath), at: new Date().toISOString() });
  return { written: planPath };
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runDirFor(args, briefPath) {
  if (typeof args["run-dir"] === "string" && args["run-dir"] !== "") return resolve(args["run-dir"]);
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) fail(brief.error);
  return latestRunDir(slugOf(brief.record, briefPath))
    || fail(`no ParagraphPlan job has been started for the Brief at ${briefPath} — run \`node src/paragraph-plan.mjs start --brief ${briefPath}\`.`);
}

// AWAIT: poll the job for at most `PARAGRAPH_PLAN_AWAIT_S` (or `--wait-s`), then either
// print the still-running line, or finish the job.
export function awaitParagraphPlan(dir, waitS = PARAGRAPH_PLAN_AWAIT_S) {
  if (existsSync(join(dir, DONE_FILE))) {
    const d = JSON.parse(readFileSync(join(dir, DONE_FILE), "utf8"));
    console.log(`ParagraphPlan already finished: ${d.written} was written at ${d.at}.`);
    return 0;
  }
  const until = Date.now() + waitS * 1000;
  let job = readReaderPathJob(dir);
  for (;;) {
    if (!job) { console.log(`ParagraphPlan: no job record at ${relFromRepo(dir)}`); return 1; }
    const live = job.state === "running" && supervisorAlive(job.supervisor_pid);
    if (job.state !== "running") break;
    if (!live) {
      console.log(`ParagraphPlan stopped: the job's supervisor (pid ${job.supervisor_pid}) is gone while its record still reads running.`);
      return 1;
    }
    if (Date.now() >= until) {
      for (const l of jobStatusLines(dir, job)) console.log(l);
      console.log(PARAGRAPH_PLAN_STILL_RUNNING_LINE);
      return 0;
    }
    sleepSync(Math.min(jobHeartbeatMs(), Math.max(0, until - Date.now())));
    job = readReaderPathJob(dir);
  }
  const r = finishParagraphPlan(dir);
  if (r.written) { console.log(`ParagraphPlan written: ${relFromRepo(r.written)}`); return 0; }
  for (const l of r.stopped) console.log(l);
  return 1;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  const briefPath = typeof args.brief === "string" && args.brief !== "" ? args.brief
    : fail("this command needs --brief <path to theses/<slug>/brief.yaml>");
  switch (args._cmd) {
    case "start": {
      const dir = startParagraphPlan(briefPath, { runDir: typeof args["run-dir"] === "string" ? resolve(args["run-dir"]) : null,
        movesDir: typeof args["moves-dir"] === "string" ? args["moves-dir"] : "moves" });
      console.log(`ParagraphPlan job started at ${relFromRepo(readerPathJobPath(dir))}, one unit per Leg — run `
        + `\`node src/paragraph-plan.mjs await --brief ${briefPath}\` to poll it.`);
      break;
    }
    case "status": {
      const dir = runDirFor(args, briefPath);
      const job = readReaderPathJob(dir);
      if (!job) fail(`no job record at ${relFromRepo(dir)}`);
      for (const l of jobStatusLines(dir, job)) console.log(l);
      break;
    }
    case "await": {
      const dir = runDirFor(args, briefPath);
      const waitS = Number(args["wait-s"]);
      process.exitCode = awaitParagraphPlan(dir, Number.isFinite(waitS) && waitS >= 0 ? waitS : PARAGRAPH_PLAN_AWAIT_S);
      break;
    }
    default:
      fail("usage: node src/paragraph-plan.mjs start|status|await --brief <theses/<slug>/brief.yaml>");
  }
}
