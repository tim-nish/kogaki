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
// and nowhere after it. THE PARAGRAPHPLAN IS THE PARAGRAPH-LEVEL READER PATH (kogaki#1639,
// owner decision 2026-10-31): every Leg Waypoint entry of the file carries the Leg schema
// -- the bound Move's id (`move`, an id and nothing else of the Move, as a Leg's `move` is
// an id), `materials`, `purpose`, `depends_on`, `rationale`, `introduces`, `re-activate`
// -- beside its `join` (kogaki#1411, kogaki#1477) and its Paragraph Waypoints, each `point`
// and `serves` or `performs` alone (kogaki#1448). No Segment and no Move field reaches the
// file, it carries no reader state and no Obligations ledger (kogaki#1701), and the plan file is the record of the binding, so the run directory keeps no
// bindings record of its own. The stage never writes the Brief, and the Brief names
// nothing downstream: the ParagraphPlan file names the Brief it was made from, by path
// and content hash.
//
// THE LOOP. One Detached Job unit per Leg, in Reader Path order, on the shared
// supervisor (src/workflow/detached-job.mjs). Each Round is two headless calls:
// `paragraph_plan_unit` binds a Move to each Leg Waypoint and generates its Paragraph
// Waypoints, and `paragraph_plan_judge_unit` judges them against the bound Move's
// `takes`, `leaves`, order (`segments`) and `breaks` (kogaki#1378, kogaki#1701). A refusal of either is put back into the next Round's
// prompt verbatim, until `brief.unit_rounds` is spent; a call is bounded by
// `brief.call_limit_s`; there is no limit on the whole job. A Leg that spends its
// Rounds stops the stage naming the Leg and the Waypoint, the Brief untouched, and
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
import { readFileSync, writeFileSync, existsSync, readdirSync, renameSync, copyFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { parseYaml, stringifyYaml } from "./yaml.mjs";
import { parseBriefRecord, unfilledSlots, briefLegs, waypointsRefusal, loadMoveContracts, loadMoveIds,
  moveContract, MOVE_RECORD_EXT, readerPersona, personaPriorKnowledgeLine, PARAGRAPH_PLAN_FILE, sha256, paragraphPlanPathFor,
  paragraphPlanRecord, paragraphPlanRecordText, readParagraphPlanBeside, paragraphPlanShapeRefusal,
  paragraphWaypointsRefusal, joinRefusal, undeclaredKey, parseIntroducesEntry, introducedMeaning,
  retiredPlanKeyRefusal } from "./compose.mjs";
import { paragraphSchemaRefusal, paragraphLegRefusal, PLAN_SCHEMA_KEYS } from "./compose/record.mjs";
import { mappingDirFor, writeMappingRecord } from "./compose/mapping-record.mjs";
import { correspondenceVocabularyRefusal } from "./mapping-playground/rbs.mjs";
// THE FILE'S WRITER AND READER LIVE IN src/compose.mjs, shared code, because /draft reads the
// file too and a command module never imports another command's (kogaki#1302); this stage
// re-exports them so its checks reach the whole stage through one module.
export { PARAGRAPH_PLAN_FILE, sha256, paragraphPlanPathFor, paragraphPlanRecord, paragraphPlanRecordText,
  readParagraphPlanBeside, paragraphPlanShapeRefusal, paragraphWaypointsRefusal, paragraphSchemaRefusal, paragraphLegRefusal };
import { judgePrompt, judgeRefusalBlock, JUDGE_INPUT_MARKER, resolveJudgeBinary, settingValue } from "./workflow/judge.mjs";
import { REPO, relFromRepo, bindFlow } from "./workflow/run-record.mjs";
import { startDetachedJobSupervisor, readReaderPathJob, readerPathJobPath, readerPathJobBounds,
  jobStallS, jobHeartbeatMs, readerPathUnitCandidatePath, readerPathUnitSpecializationPath } from "./workflow/detached-job.mjs";
import { enterRun, laneDir } from "./runs.mjs";

export const PARAGRAPH_PLAN_TABLE = join(REPO, "src", "paragraph-plan-workflow.json");
export const PARAGRAPH_PLAN_AXES = join(REPO, "src", "paragraph-plan-axes.json");
export const NO_PARAGRAPH_MOVE_FITS = "no_paragraph_move_fits";
// THE ROLES A BOUND PARAGRAPH MOVE MUST FILL (kogaki#1378): `breaks` to judge the Paragraph
// Waypoints survive, and `segments` to order them by -- the Move's whole structure, with no
// fallback: `technique` is retired (kogaki#1412) and a Move without `segments` is refused at the
// Adapter. A bound Move missing one is a fatal stop, never a default. Its `takes` and `leaves`,
// required of every Move at the Adapter (kogaki#1698), are what it is bound and judged by (kogaki#1701).
export const PARAGRAPH_MOVE_ROLES = ["segments", "breaks"];
// The run directory's own files, beside the supervisor's. THE BINDINGS RECORD IS RETIRED
// (kogaki#1639): the plan file carries each paragraph's bound Move id and `rationale`, so the
// run directory holds no `paragraph-plan-bindings.json`.
const START_FILE = "paragraph-plan-start.json";
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

// What a unit is handed about its Leg: each Leg Waypoint's own point, serves and the next Leg
// Waypoint's point -- no Claim proposition (kogaki#1382, owner decision 2026-10-14: the Leg
// Waypoint alone is sufficient input; the served Claim justified the Leg Waypoint's selection,
// not its generation) -- and the Leg's Journeys, `{strand, use}`, for a paragraph to place
// (kogaki#1639). Kept small and plain so the validator and the judge read the same Leg the
// prompt showed.
// WHAT STANDS TO BE TAKEN UP (kogaki#1701): the first Leg Waypoint is handed `stands_to_be_taken_up`,
// the `leaves` of the Move the Brief bound to the previous Leg, each with `left_by` naming that
// Leg, and, on the Brief's first Leg, the Persona's prior-knowledge line; a later Leg Waypoint's is
// what the paragraphs before it leave (`standsToBeTakenUp`). `leaves_for_next_leg` is the `leaves`
// of the Move the Brief bound to this Leg: what this Leg's paragraphs leave for the next one.
// `opts` is `{ previousLeaves, previousLegId, leaves, priorKnowledge }`, read by `start` off the library.
export function planLeg(leg, opts = {}) {
  const ws = leg.waypoints || [];
  const first = [
    ...(opts.previousLeaves || []).map((x) => ({ kind: x.kind, what: x.what, left_by: `Leg ${opts.previousLegId}` })),
    ...(typeof opts.priorKnowledge === "string" && opts.priorKnowledge.trim() ? [{ what: opts.priorKnowledge.trim(), left_by: PRIOR_KNOWLEDGE }] : []),
  ];
  return {
    leg_id: leg.leg_id,
    waypoints: ws.map((w, i) => ({
      waypoint: i + 1,
      point: String(w.point),
      // Carried beside the point and read by no row yet (kogaki#1732).
      case: w.case,
      serves: [...w.serves],
      next_point: i + 1 < ws.length ? String(ws[i + 1].point) : null,
      ...(i === 0 ? { stands_to_be_taken_up: first } : {}),
    })),
    leaves_for_next_leg: (opts.leaves || []).map((x) => ({ kind: x.kind, what: x.what })),
    journeys: (leg.journeys || []).filter((j) => j && typeof j === "object").map((j) => ({ strand: j.strand, use: j.use })),
    introduces: introducedTerms(leg.introduces),
  };
}
export const PRIOR_KNOWLEDGE = "the reader's prior knowledge";

// The planLeg options for every Leg of a Brief, read off the Move library: each Leg's own Move's
// `leaves`, the previous Leg's, and the Persona's prior-knowledge line on the first Leg. A Leg
// binding no Move (a Trial's Brief, kogaki#1664) leaves nothing; a Leg naming a Move the library
// does not hold is refused by name.
export function planLegOptions(legs, moves, priorKnowledge) {
  const byId = new Map(moves.map((m) => [m.id, m]));
  const leavesOf = (leg) => (typeof leg.move === "string" ? (byId.get(leg.move) || {}).leaves || [] : []);
  return legs.map((leg, i) => {
    if (typeof leg.move === "string" && !byId.has(leg.move)) {
      return { error: `the Brief's Leg ${leg.leg_id} binds the Move ${JSON.stringify(leg.move)}, which the Move library does not hold — the ParagraphPlan reads what that Move leaves for the next Leg (kogaki#1701)` };
    }
    return { leaves: leavesOf(leg), previousLeaves: i > 0 ? leavesOf(legs[i - 1]) : [], previousLegId: i > 0 ? legs[i - 1].leg_id : null,
      priorKnowledge: i === 0 ? priorKnowledge : null };
  });
}

// WHAT STANDS TO BE TAKEN UP WHEN LEG WAYPOINT n BEGINS (kogaki#1701): the first Leg Waypoint's
// list, then, for each paragraph before n in order, its bound Move's `leaves` added with `left_by`
// naming that Leg Waypoint and every entry its `takes` names by `kind` and `what` alike removed.
// `contractOf` reads a Move id to its contract. An entry taken up by sense rather than by the same
// words stays on the list: whether it is met is the judge's.
export function standsToBeTakenUp(leg, entries, n, contractOf) {
  let out = [...((leg.waypoints[0] || {}).stands_to_be_taken_up || [])];
  for (const [i, e] of entries.slice(0, n - 1).entries()) {
    const c = e && typeof e.move === "string" ? contractOf(e.move) : null;
    if (!c) continue;
    const taken = new Set((c.takes || []).map((x) => `${x.kind}\u0000${x.what}`));
    out = out.filter((x) => !taken.has(`${x.kind}\u0000${x.what}`));
    out.push(...(c.leaves || []).map((x) => ({ kind: x.kind, what: x.what, left_by: `Leg Waypoint ${i + 1}` })));
  }
  return out;
}

// THE TERMS THE LEG INTRODUCES, AS TERM AND MEANING (kogaki#1497): the reader-knowledge ledger,
// handed to the plan call with each term's meaning and nothing else; a paragraph names a term in
// its `introduces` only where it gives the meaning (kogaki#1663) (an item carries no `kind` since kogaki#1529).
// The meaning is `introducedMeaning`'s, the rule the Packet's crossing line reads: a typed
// entry's `meaning`, a legacy anchored entry's anchor, and for a bare term with neither,
// `null`, for the planner to give in its own words.
export function introducedTerms(entries) {
  return (entries || []).map((raw) => parseIntroducesEntry(raw)).filter((p) => !p.error && p.term)
    .map((p) => ({ term: p.term, meaning: introducedMeaning(p) }));
}

// EVERY SEGMENT REACHES THE PLAN CALL WHOLE, AS ITS THREE FIELDS (kogaki#1414, reverting the
// withholding of kogaki#1403; `manner` from kogaki#1510, which reaches this call and nothing
// written from it, kogaki#1585). A Segment is `operation`, the step's
// operation written subject-free, `relation`, its relation to the Segment before it, in prose
// -- no label set -- and `manner`, the local realisation the step takes, empty on most. The
// Move record carries `segments` as a list of maps in that shape (kogaki#1413); this numbers
// each one into `{ segment, operation, relation, manner }`, `relation` empty on Segment 1 and
// `manner` empty where the Move gives none, so the planner reads the fields apart and by
// position. kogaki#1403 withheld the description because the
// planner read it as content; the plan row now says an `operation` is an operation to perform and
// never a point to state, and the judge checks each Paragraph Waypoint against its own
// Segment, so the leak is refused where it happens rather than by blinding the planner (on
// the 2026-10-16 run two labels alone could not carry "concede and promise to simplify", and
// paragraph 2's first point lost its Segment). `before`, `after` and `breaks` are untouched.
export function segmentsForPlanCall(segments) {
  if (!Array.isArray(segments) || !segments.length) return segments;
  return segments.map((s, i) => ({ segment: i + 1, operation: String(s.operation).trim(),
    relation: String(s.relation ?? "").trim(), manner: String(s.manner ?? "").trim() }));
}

// The Leg's introduced terms ride beside the persona rather than inside the Leg (kogaki#1497):
// like the persona, they say what the reader does not yet hold, never what a point says.
// Each bindable Move carries its `takes` and `leaves` on its contract (kogaki#1701).
export function paragraphPlanUnitInput(leg, moves, persona) {
  const { introduces, ...planned } = leg;
  return {
    leg_you_must_plan: planned,
    paragraph_moves_you_may_bind: moves.map((m) => ({ ...m, segments: segmentsForPlanCall(m.segments) })),
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
    terms_this_leg_introduces: introduces || [],
  };
}

export function renderRowHead(row) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, "", null, null); } finally { bindFlow(held); }
}

// THE ROWS ARE NAMED CRITERIA UNDER A BOUND (kogaki#1511): a row's criteria are the
// `- <NAME>: <sentence>` lines of its rendered judgment point, read off the prompt the model
// is shown rather than the raw table string, so shared text cannot hide a criterion.
const CRITERION_LINE = /^- ([A-Z][A-Z ]*[A-Z]): (.+)$/;

function judgmentPointOf(prompt) {
  const at = prompt.indexOf("JUDGMENT POINT: ");
  const end = prompt.indexOf("\nREQUIRED RECORD SHAPE: ", at);
  return at < 0 ? "" : prompt.slice(at + "JUDGMENT POINT: ".length, end < 0 ? undefined : end);
}

export function criteriaOf(prompt) {
  return `\n${judgmentPointOf(prompt)}`.split("\n").map((l) => l.match(CRITERION_LINE)).filter(Boolean).map((m) => ({ name: m[1], text: m[2] }));
}

// One sentence: it ends at its only full stop, and carries no example's run date and no Issue
// number, which ride beside a criterion as a pointer line or not at all.
const oneSentence = (text) => /[.]$/.test(text) && !/[.;!?]\s/.test(text);

function criterionRefusal({ name, text }, wordsMax) {
  if (!oneSentence(text)) return `${name} is not one sentence`;
  if (/#\d+|\b\d{4}-\d{2}-\d{2}\b/.test(text)) return `${name} carries an Issue number or a run date`;
  const n = words(text);
  return n > wordsMax ? `${name} runs ${n} words, over the bound of ${wordsMax}` : null;
}

// Every failure of the table's two rows against `criteria`: the names in order, one sentence
// each, under `words_max`; each shared block one sentence; and the whole rendered judgment
// point -- lead, criteria, shared text and verdict -- under `point_words_max`, so the text
// around the criteria cannot grow where the per-criterion bound does not reach. Exported so
// the check reads what `start` refuses on.
export function criteriaFailures(table) {
  const bound = table.criteria || {};
  const wordsMax = Number(bound.words_max);
  const pointMax = Number(bound.point_words_max);
  if (!Number.isInteger(wordsMax) || wordsMax <= 0) return ["src/paragraph-plan-workflow.json's `criteria` declares no positive `words_max`"];
  if (!Number.isInteger(pointMax) || pointMax <= 0) return ["src/paragraph-plan-workflow.json's `criteria` declares no positive `point_words_max`"];
  const fails = [];
  for (const [name, text] of Object.entries(table.shared_text || {})) {
    if (!oneSentence(String(text))) fails.push(`shared text ${name} is not one sentence`);
  }
  const named = { paragraph_plan_unit: bound.paragraph_plan_unit,
    paragraph_plan_judge_unit: readAxes().axes.map((a) => String(a.id)) };
  for (const key of ["paragraph_plan_unit", "paragraph_plan_judge_unit"]) {
    const want = Array.isArray(named[key]) ? named[key] : [];
    const prompt = renderRowHead({ id: key, ...table[key] });
    const n = words(judgmentPointOf(prompt));
    if (n > pointMax) fails.push(`${key}'s rendered judgment point runs ${n} words, over the bound of ${pointMax}`);
    const got = criteriaOf(prompt);
    if (!want.length) fails.push(`\`criteria\` names no criterion for ${key}`);
    if (JSON.stringify(got.map((c) => c.name)) !== JSON.stringify(want)) {
      fails.push(`${key} carries the criteria ${JSON.stringify(got.map((c) => c.name))}, not the ${JSON.stringify(want)} \`criteria\` names`);
    }
    for (const c of got) {
      const why = criterionRefusal(c, wordsMax);
      if (why) fails.push(`${key}: ${why}`);
    }
  }
  return fails;
}

// ---------------------------------------------------------------------------
// THE JUDGE'S AXES (kogaki#1533, owner decision 2026-10-23): src/paragraph-plan-axes.json
// holds one sentence per axis, each with a defect and a clean fixture and the bench run
// that kept it. The judge row renders them through `{{axes}}`; what follows reads the file
// for `start`, the bench and checks/check-paragraph-plan-axes.sh alike.
export function readAxes(path = PARAGRAPH_PLAN_AXES) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// ONE RESPONSIBILITY, ONE SENTENCE: no `;`, `:` or ` — `, and no second finite clause
// joined by "and". Declared limit: the clause test is lexical -- `and` followed within
// two words by a verb from `AND_CLAUSE_VERBS`, or `, and` anywhere.
const AND_CLAUSE_VERBS = "is|are|was|were|has|have|holds?|states?|carries|carry|gives?|leaves?|runs?|bears?|stands?|survives?|performs?|names?|says?|takes?";
const AND_CLAUSE = new RegExp(`,\\s*and\\b|\\band\\s+(?:\\S+\\s+){0,2}(?:${AND_CLAUSE_VERBS})\\b`, "i");

export function axisSentenceRefusal(sentence) {
  const t = String(sentence || "").trim();
  if (!t) return "carries no sentence";
  if (/[;:]/.test(t)) return "carries `;` or `:`";
  if (t.includes(" — ")) return "carries ` — `";
  if (!oneSentence(t)) return "is not one sentence";
  if (AND_CLAUSE.test(t)) return "joins a second clause with \"and\"";
  return null;
}

// A fixture record as the judge reads it: a judge input whole, or `from` another record
// with its one `edit` applied -- a Paragraph Waypoint or a `join` replaced, a Leg Waypoint's
// `stands_to_be_taken_up` replaced, or its bound Move's `takes` (`move_takes`) or `leaves`
// (`move_leaves`) (kogaki#1701).
export function axisRecord(registry, name, seen = new Set()) {
  const r = (registry.records || {})[name];
  if (!r) throw new Error(`src/paragraph-plan-axes.json names the record "${name}", which \`records\` does not hold`);
  if (seen.has(name)) throw new Error(`src/paragraph-plan-axes.json's record "${name}" is derived from itself`);
  if (r.input) return structuredClone(r.input);
  const input = axisRecord(registry, r.from, new Set([...seen, name]));
  const e = r.edit || {};
  const ws = input.leg_you_must_judge.waypoints;
  const w = ws[Number(e.waypoint) - 1];
  if (!w) throw new Error(`record "${name}" edits Leg Waypoint ${e.waypoint}, which "${r.from}" does not carry`);
  if (Object.hasOwn(e, "join")) { w.join = e.join; return input; }
  if (Object.hasOwn(e, "stands_to_be_taken_up")) { w.stands_to_be_taken_up = e.stands_to_be_taken_up; return input; }
  if (Object.hasOwn(e, "move_takes")) { w.bound_move.takes = e.move_takes; return input; }
  if (Object.hasOwn(e, "move_leaves")) { w.bound_move.leaves = e.move_leaves; return input; }
  const at = Number(e.paragraph_waypoint) - 1;
  if (!w.paragraph_waypoints[at] || !e.to) throw new Error(`record "${name}" replaces no Paragraph Waypoint of "${r.from}"`);
  w.paragraph_waypoints[at] = e.to;
  return input;
}

// Every failure of the registry: each axis one sentence, both fixture kinds naming records
// that resolve, a defect naming the Leg Waypoint it sits on, and a `justified_by` run.
export function axesFailures(registry) {
  const fails = [];
  const axes = Array.isArray(registry.axes) ? registry.axes : [];
  if (!axes.length) return ["src/paragraph-plan-axes.json declares no axis"];
  for (const a of axes) {
    const id = String(a.id || "(no id)");
    const why = axisSentenceRefusal(a.sentence);
    if (why) fails.push(`axis ${id} ${why}`);
    for (const kind of ["defect", "clean"]) {
      const names = a.fixtures && Array.isArray(a.fixtures[kind]) ? a.fixtures[kind] : [];
      if (!names.length) fails.push(`axis ${id} carries no \`${kind}\` fixture`);
      for (const n of names) {
        try { axisRecord(registry, n); } catch (e) { fails.push(`axis ${id}: ${e.message}`); }
        if (kind === "defect" && !Number.isInteger((registry.records[n] || {}).at_waypoint)) fails.push(`axis ${id}: defect "${n}" names no \`at_waypoint\``);
      }
    }
    const j = a.justified_by;
    if (!j || !j.date || !j.run || !j.rates) fails.push(`axis ${id} carries no \`justified_by\` bench run (date, run, rates)`);
  }
  return fails;
}

export function paragraphPlanUnitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try { return judgePrompt(row, JSON.stringify(input, null, 2), input, null); } finally { bindFlow(held); }
}

const UNIT_KEYS = ["version", "leg_id", "waypoints"];
// THE ENTRY IS THE PARAGRAPH'S SCHEMA (kogaki#1639): the plan file's own key set, `rationale` in
// place of the retired `why`.
const UNIT_WAYPOINT_KEYS = ["waypoint", ...PLAN_SCHEMA_KEYS, "join", "paragraph_waypoints"];
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
  // `breaks` arrives as a list of prose tests and `segments` as a list of Segments (kogaki#1413).
  const filled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "");
  for (const role of PARAGRAPH_MOVE_ROLES) {
    if (!filled(c[role])) {
      throw new Error(`ParagraphPlan stops: the paragraph Move "${moveId}" was bound and does not fill the role `
        + `\`${role}\` (${movesDir}/${moveId}${MOVE_RECORD_EXT}) — this stage judges `
        + "that the Paragraph Waypoints survive its breaks, and orders them by its segments, so nothing is defaulted. "
        + "Repair the Move record under its own issue.");
    }
  }
  return c;
}

// THE FIRST CALL'S ANSWER, READ BACK (the declared validator). Returns `{ error }` — a
// refusal of the Round, put verbatim into the next — or `{}`. A Leg Waypoint no Move
// fits is the refusal `no_paragraph_move_fits`, naming the Leg and the Waypoint. A refusal
// that names its Leg Waypoints carries them as `sites`, the place the retry is scoped to
// (kogaki#1642); a refusal of the whole Leg carries none.
export function validateParagraphPlanUnit(record, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const r = record || {};
  const at = `Leg ${leg.leg_id}`;
  const retired = retiredPlanKeyRefusal(r, `${at}: the plan record`);
  if (retired) return { error: retired };
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
    if (e && typeof e === "object" && !Array.isArray(e) && e.move === null && e.waypoint === i + 1
      && typeof e.rationale === "string" && words(e.rationale) >= 4 && !undeclaredKey(e, UNIT_WAYPOINT_KEYS)) {
      noFit.push({ leg_id: leg.leg_id, waypoint: i + 1, point: ws[i].point, why: e.rationale.trim() });
      continue;
    }
    const bad = entryRefusal(e, i, leg, r.waypoints.slice(0, i), library.ids, inputs.movesDir, atW);
    if (bad) return { error: bad, sites: [i + 1] };
  }
  if (noFit.length) return { error: noParagraphMoveFitsRefusal(noFit), sites: noFit.map((f) => f.waypoint) };
  const mapped = mappingVocabularyRefusal(r.waypoints, inputs, unitId, at);
  if (mapped) return mapped;
  // THE LEG'S RULES OVER ITS PARAGRAPHS (kogaki#1639), by the plan reader's own rule: each
  // introduced term assigned to at most one paragraph.
  const legRule = paragraphLegRefusal(r.waypoints, leg, at);
  if (legRule) return { error: legRule };
  return {};
}

// THE LEG'S CLAIMS AS THE MAPPER'S STRAND (kogaki#1734): the cites of the Strands its Claims serve, in
// order, as one text, which the structure read from each of its Leg Waypoints carries verbatim.
export function legStrand(leg, strands = []) {
  const cite = new Map((Array.isArray(strands) ? strands : []).map((x) => [x.id, x.cite]));
  return (leg.claims || []).map((g) => cite.get(g.strand) || g.strand).join(", ") || String(leg.leg_id);
}

// THE MAPPING STATE OF ONE UNIT (kogaki#1734): the structures read and the tables grounded so far, written
// by the Mapper (src/paragraph-plan-mapper.mjs) in the run directory and read here by the validators.
export const mappingStatePath = (runDir, unitId) => join(runDir, "mapping", `${unitId}.json`);
export function readMappingState(runDir, unitId) {
  const path = runDir ? mappingStatePath(runDir, unitId) : null;
  return path && existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

// ONCE GROUNDED, each entry keeps the Move its table was grounded for, and its Paragraph Waypoints carry that
// table's expressions and no Role id outside one of it or of the Leg's earlier tables (kogaki#1734).
function mappingVocabularyRefusal(entries, inputs, unitId, at) {
  const tables = inputs.mapping ? (readMappingState(inputs.runDir, unitId) || {}).tables : null;
  if (!tables || !Object.keys(tables).length) return null;
  const prior = [];
  for (const [i, e] of entries.entries()) {
    const t = tables[String(i + 1)];
    if (!t) continue;
    const atW = `${at}, Waypoint ${i + 1}`;
    if (e.move !== t.move) {
      return { error: `${atW}: the entry binds ${JSON.stringify(e.move)}, and the Mapping Table of this Leg Waypoint was grounded for "${t.move}" — the Move is bound before grounding and kept after it`, sites: [i + 1] };
    }
    const v = correspondenceVocabularyRefusal(e.paragraph_waypoints, t, prior, i + 1);
    if (v) {
      const id = (/carries the Role id "([^"]+)"/.exec(v) || [])[1];
      const c = id && t.correspondences.find((x) => x.role === id);
      return { error: `${atW}: ${v}${c ? `; the Role "${id}" reads "${c.expression}" in this Leg Waypoint's Mapping Table` : ""}`, sites: [i + 1] };
    }
    prior.push(t);
  }
  return null;
}

// ONE ENTRY'S RULES, against the entries before it: the Leg call's validator and the site
// validator read an entry by this one function (kogaki#1642). `null` where it passes. An entry
// whose `move` is null is refused here; the Leg call's validator collects those first.
function entryRefusal(e, i, leg, prior, libraryIds, movesDir, atW) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return `${atW}: the entry is not a map`;
  const retired = retiredPlanKeyRefusal(e, `${atW}: the entry`);
  if (retired) return retired;
  if (Object.hasOwn(e, "why")) return `${atW}: the entry carries \`why\`, retired (kogaki#1639) — why this paragraph comes here is its \`rationale\``;
  const k = undeclaredKey(e, UNIT_WAYPOINT_KEYS);
  if (k) return `${atW}: the entry carries \`${k}\`, which it does not declare — it carries waypoint, ${PLAN_SCHEMA_KEYS.join(", ")}, join (on every Leg Waypoint after the first) and paragraph_waypoints`;
  if (e.waypoint !== i + 1) return `${atW}: the entry is numbered ${JSON.stringify(e.waypoint)} — entries are one per Leg Waypoint, in order`;
  if (typeof e.rationale !== "string" || words(e.rationale) < 4) return `${atW}: \`rationale\` is under four words`;
  if (e.move === null) return noParagraphMoveFitsRefusal([{ leg_id: leg.leg_id, waypoint: i + 1, point: leg.waypoints[i].point, why: e.rationale.trim() }]);
  if (typeof e.move !== "string" || e.move.trim() === "") {
    return `${atW}: carries no \`move\` — a paragraph names the Move bound to it by id, or null where no Move fits (kogaki#1639)`;
  }
  if (!libraryIds.has(e.move)) return `${atW}: binds move ${JSON.stringify(e.move)}, which names no Move in the library at ${movesDir}`;
  // THE PARAGRAPH'S SCHEMA, BY THE PLAN READER'S OWN RULE (kogaki#1639): so the record this
  // stage writes is one every later read accepts, and a refusal names the field here first.
  const schema = paragraphSchemaRefusal(e, i, leg, prior, atW, { library: libraryIds });
  if (schema) return schema;
  const contract = boundMoveContract(e.move, movesDir);
  // ONE PER SEGMENT, COUNTED HERE AND NOT JUDGED (kogaki#1533).
  const n = Array.isArray(e.paragraph_waypoints) ? e.paragraph_waypoints.length : 0;
  if (n !== contract.segments.length) {
    return `${atW}: carries ${n} Paragraph Waypoint(s) for the ${contract.segments.length} Segment(s) of the bound Move `
      + `"${e.move}" — one Paragraph Waypoint per Segment, in the Move's order`;
  }
  // THE JOIN, BY THE PLAN READER'S OWN RULE (kogaki#1411): so the file this stage writes is
  // one /draft reads. Whether it takes up what the previous paragraph left is the judge's.
  return joinRefusal(e, i, atW) || paragraphWaypointsRefusal(e.paragraph_waypoints, leg.waypoints[i].serves, atW) || null;
}

export function noParagraphMoveFitsRefusal(failures) {
  return [`NO PARAGRAPH MOVE FITS THESE LEG WAYPOINTS (${NO_PARAGRAPH_MOVE_FITS}):`,
    ...failures.map((f) => `Leg ${f.leg_id}, Waypoint ${f.waypoint} ("${f.point}"): you wrote: "${f.why}"`),
    "There is no fallback paragraph shape. Bind again: read each Move's takes against what stands to be taken up at this "
    + "Leg Waypoint once more, with the next Leg Waypoint in view."].join("\n");
}

// THE SECOND CALL — the judge. Its input carries each Leg Waypoint with what stands to be taken
// up when it begins, the bound Move's takes, leaves, segments and breaks, and the Paragraph
// Waypoints generated for it, judged on the axes src/paragraph-plan-axes.json keeps (kogaki#1533,
// kogaki#1701); every Leg Waypoint after the first also carries its `join` (kogaki#1411,
// kogaki#1477), and the Leg carries what its paragraphs leave for the next Leg.
//
// A SCOPED JUDGMENT (kogaki#1642): after a site retry `scope` names the entries to judge, `judge`
// whole and `join_only` for its join alone, and the judge is handed those entries with every
// paragraph of the standing record beside them, each with its bound Move's `takes`; its verdicts
// for the other entries are carried.
export function paragraphPlanJudgeInput(record, inputs, unitId, scope = null) {
  const leg = legForUnit(inputs, unitId);
  const contractOf = (id) => boundMoveContract(id, inputs.movesDir);
  const judged = judgedWaypoints(leg, scope);
  const joinOnly = new Set(scope ? scope.join_only || [] : []);
  return {
    leg_you_must_judge: {
      leg_id: leg.leg_id,
      leaves_for_next_leg: leg.leaves_for_next_leg || [],
      waypoints: judged.map((n) => {
        const i = n - 1;
        const w = leg.waypoints[i];
        const e = record.waypoints[i];
        const c = contractOf(e.move);
        return { waypoint: n, point: w.point, next_point: w.next_point,
          ...(joinOnly.has(n) ? { judge_its_join_only: true } : {}),
          stands_to_be_taken_up: standsToBeTakenUp(leg, record.waypoints, n, contractOf),
          bound_move: { takes: c.takes, leaves: c.leaves, segments: c.segments, breaks: c.breaks },
          ...(i > 0 ? { join: e.join } : {}),
          paragraph_waypoints: e.paragraph_waypoints };
      }),
    },
    ...(scope ? { standing_paragraphs: record.waypoints.map((e) => ({ waypoint: e.waypoint, move: e.move,
      takes: contractOf(e.move).takes, ...(e.waypoint > 1 ? { join: e.join } : {}), paragraph_waypoints: e.paragraph_waypoints })) } : {}),
  };
}

// The Leg Waypoints a judgment covers, in order: every one, or the scope's.
function judgedWaypoints(leg, scope) {
  if (!scope) return leg.waypoints.map((w) => w.waypoint);
  return [...new Set([...(scope.judge || []), ...(scope.join_only || [])])].sort((x, y) => x - y);
}

export function paragraphPlanJudgePrompt(record, inputs, unitId, scope = null) {
  return `${inputs.promptHead}${JSON.stringify(paragraphPlanJudgeInput(record, inputs, unitId, scope), null, 2)}`;
}

export const PARAGRAPH_PLAN_VERDICTS = ["fits", "does-not-fit"];

// The judge's answer, read back: `{ error }` is its own malformed output, asked again
// with the same prompt; `{ refusal, failures }` refuses the Round; `{}` passes it. Under a
// `scope` the verdicts are the scope's Leg Waypoints, in order (kogaki#1642).
export function paragraphPlanJudgeVerdict(verdict, record, inputs, unitId, scope = null) {
  const leg = legForUnit(inputs, unitId);
  const want = judgedWaypoints(leg, scope);
  const v = verdict || {};
  if (String(v.version) !== "1") return { error: `the verdict record's version is ${JSON.stringify(v.version)}, not "1"` };
  if (v.leg_id !== leg.leg_id) return { error: `the verdict record names leg ${JSON.stringify(v.leg_id)}, not ${leg.leg_id}` };
  if (!Array.isArray(v.verdicts) || v.verdicts.length !== want.length) {
    return { error: `the verdict record carries ${Array.isArray(v.verdicts) ? v.verdicts.length : "no"} verdict(s) for the `
      + `${want.length} Leg Waypoint(s) it judges — one per Leg Waypoint, in order` };
  }
  const failures = [];
  for (const [i, x] of v.verdicts.entries()) {
    const n = want[i];
    if (!x || typeof x !== "object" || x.waypoint !== n) return { error: `verdict ${i + 1} does not name Waypoint ${n}` };
    if (!PARAGRAPH_PLAN_VERDICTS.includes(x.verdict)) return { error: `Waypoint ${n}'s verdict ${JSON.stringify(x.verdict)} is outside ${PARAGRAPH_PLAN_VERDICTS.join(" | ")}` };
    if (typeof x.why !== "string" || words(x.why) < 4) return { error: `Waypoint ${n}'s \`why\` is under four words` };
    if (x.verdict === "does-not-fit") {
      const f = { leg_id: leg.leg_id, waypoint: n, why: x.why.trim() };
      failures.push({ ...f, refusal: judgeSiteRefusal(f) });
    }
  }
  if (!failures.length) return {};
  return { failures, refusal: ["THE PARAGRAPH WAYPOINTS WERE JUDGED, AND THESE DO NOT FIT THE MOVE BOUND TO THEIR LEG WAYPOINT:",
    ...failures.map((f) => f.refusal),
    "Generate the Paragraph Waypoints again so that the bound Move's takes are each met by what stands to be "
    + "taken up, its leaves are each taken up by a later paragraph or left for the next Leg, they follow the "
    + "Move's order (its segments), "
    + "each perform its own Segment's operation and stand in that Segment's relation, "
    + "and survive each of its breaks, or bind another Move; and write each join so that it takes up what the "
    + "previous paragraph's bound Move leaves, restates no Paragraph Waypoint, names no noun phrase "
    + "of either paragraph's Paragraph Waypoints, brings no case, example or term of its own and states no effect "
    + "on the reader."].join("\n") };
}

// One Leg Waypoint's refusal by the judge, the sentence a site retry is handed verbatim.
export function judgeSiteRefusal(f) {
  return `Leg ${f.leg_id}, Waypoint ${f.waypoint}: the judge wrote: "${f.why}"`;
}

// ---------------------------------------------------------------------------
// THE SITE RETRY (kogaki#1642, owner decision 2026-10-31). A refusal that names a Leg Waypoint
// is repaired at that Leg Waypoint alone: the site call is handed that one entry's endpoints
// and its refusals and answers one entry; the first retry holds the bound Move; a later one that
// moves it reopens the entries after it, which the suffix call composes again from what the new
// Move leaves. The supervisor runs the loop
// (src/workflow/site-retry.mjs); what follows builds the two calls' prompts and reads back
// their answers.
export const siteRepeatRefusal = (n) => `the answer repeats the refused entry at Leg Waypoint ${n}; the refusal asked for a change at that site`;

const canonical = (v) => JSON.stringify(v ?? null, (k, x) => (x && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
const isMap = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// The Move ids a sentence names, read against the library's own ids.
function movesNamed(text, ids) {
  return [...ids].filter((id) => new RegExp(`(^|[^A-Za-z0-9_])${escapeRe(id)}([^A-Za-z0-9_]|$)`).test(String(text || "")));
}

// THE MOVES REJECTED AT A SITE: each refused entry's bound Move, and every Move a refused
// `move: null` named in its rationale.
export function rejectedMoves(history, ids) {
  const out = new Set();
  for (const h of history || []) {
    const e = isMap(h.entry) ? h.entry : {};
    if (typeof e.move === "string") out.add(e.move);
    else if (e.move === null) for (const m of movesNamed(e.rationale, ids)) out.add(m);
  }
  return out;
}

// AN ANSWER THAT DOES NOT ACT ON ITS REFUSAL: after a judge's refusal, the same Move, Paragraph
// Waypoints and join; after a validator's, the same entry whole, since the field it
// named may be any of them.
export function repeatsRefusedEntry(answer, refused, byJudge) {
  if (!isMap(answer) || !isMap(refused)) return false;
  if (!byJudge) return canonical(answer) === canonical(refused);
  return answer.move === refused.move && canonical(answer.paragraph_waypoints) === canonical(refused.paragraph_waypoints)
    && canonical(answer.join) === canonical(refused.join);
}

// THE TEXT OF AN ENTRY'S PARAGRAPH WAYPOINTS, IN ORDER (kogaki#1651): each one's `point` or
// `performs`, or the first sentence it carries under any other key, so a restatement under a
// changed shape still reads as the same text.
export function paragraphPointsText(entry) {
  const pws = isMap(entry) && Array.isArray(entry.paragraph_waypoints) ? entry.paragraph_waypoints : [];
  return pws.map((pw) => {
    if (!isMap(pw)) return String(pw ?? "").trim();
    const text = [pw.point, pw.performs, ...Object.values(pw)].find((v) => typeof v === "string" && v.trim() !== "");
    return text ? text.trim() : "";
  });
}

// AN ANSWER THAT RESTATES A REFUSED ROUND (kogaki#1651): its Paragraph Waypoints' text equals a
// refused entry's, in order, whatever else the record changed. Returns the unchanged points.
export function restatedPoints(answer, history) {
  const mine = paragraphPointsText(answer);
  if (!mine.length) return null;
  for (const h of history || []) {
    const theirs = paragraphPointsText(h.entry);
    if (theirs.length === mine.length && theirs.every((t, i) => t === mine[i])) return mine;
  }
  return null;
}
export const siteRestatementRefusal = (n, points) => `the answer restates the refused round's Paragraph Waypoints at Leg Waypoint ${n} unchanged — `
  + `${points.map((t) => JSON.stringify(t)).join(", ")}; the refusal asked for a change to what they say`;

// THE MOVES BOUND BESIDE A SITE (kogaki#1651): the previous and next entries' Moves, each with the
// Leg Waypoint that binds it.
export function movesBoundBeside(entries, n) {
  return [n - 1, n + 1].filter((m) => m >= 1 && isMap(entries[m - 1]) && typeof entries[m - 1].move === "string")
    .map((m) => ({ waypoint: m, move: entries[m - 1].move }));
}

// PROSE THAT DESCRIBES THE REPAIR RATHER THAN THE PARAGRAPH (kogaki#1651): a word of the refusal or
// the Round, an Issue reference, or a field of the record named in backticks.
const SITE_PROSE_FIELDS = ["purpose", "rationale"];
const RECORD_FIELD_NAMES = new Set([...UNIT_KEYS, ...UNIT_WAYPOINT_KEYS, "point", "serves", "performs", "paragraph_waypoint",
  "leg_waypoint_you_must_plan", "fixed", "paragraph_moves_you_may_bind", "moves_rejected_here", "moves_bound_beside",
  "refused_here", "stands_to_be_taken_up", "leaves_for_next_leg", "terms_this_entry_introduces",
  "re_activations_this_entry_carries", "takes", "leaves", "segments", "operation"]);
export function repairProse(answer) {
  for (const field of SITE_PROSE_FIELDS) {
    const text = typeof answer[field] === "string" ? answer[field] : "";
    const word = (/\w*refus\w*/i.exec(text) || /\w*attempt\w*/i.exec(text) || /kogaki#\d*/i.exec(text) || [])[0];
    const named = [...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim()).find((k) => RECORD_FIELD_NAMES.has(k));
    if (word) return { field, said: JSON.stringify(word) };
    if (named) return { field, said: `\`${named}\`` };
  }
  return null;
}

// THE ENDPOINT THE FIRST RETRY HOLDS: the refused entry's bound Move, where it bound one; `null`
// on a later retry, where the refused entry bound none, or where the judge refused the binding
// itself, on an axis of `BINDING_AXES` (kogaki#1647, kogaki#1701).
export const BINDING_AXES = ["TAKEN", "LEFT"];
const BINDING_REFUSAL = new RegExp(`\\b(?:${BINDING_AXES.join("|")})\\b`);
export function siteFixed(ctx) {
  const last = (ctx.history || [])[ctx.history.length - 1];
  const e = last && isMap(last.entry) ? last.entry : null;
  if (last && last.by_judge && BINDING_REFUSAL.test(String(last.refusal))) return null;
  return ctx.retry === 1 && e && typeof e.move === "string" ? { move: e.move } : null;
}

function bindableMoves(movesDir) {
  const library = loadMoveContracts(movesDir);
  if (library.error) throw new Error(library.error);
  return library.moves.map((m) => ({ ...m, segments: segmentsForPlanCall(m.segments) }));
}

// kogaki#1649: the passing record, each Paragraph Waypoint and rebind that differs from the first refused Round marked with the axes the judge's refusals named.
export function paragraphPlanForcedMark(record, history, inputs) {
  const axes = (inputs && inputs.axes) || [];
  const named = (text) => axes.filter((id) => new RegExp(`\\b${escapeRe(id)}\\b`).test(String(text)));
  const waypoints = record.waypoints.map((e, i) => {
    const refusals = ((history && history.get(i + 1)) || []).filter((h) => h.by_judge);
    const forced = axes.filter((id) => refusals.some((h) => named(h.refusal).includes(id)));
    if (!forced.length || !isMap(e)) return e;
    const refused = isMap(refusals[0].entry) ? refusals[0].entry : {};
    const before = new Set((Array.isArray(refused.paragraph_waypoints) ? refused.paragraph_waypoints : []).map(canonical));
    const pws = (e.paragraph_waypoints || []).map((p) => (before.has(canonical(p)) ? p : { ...p, forced_by: [...forced] }));
    return { ...e, ...(refused.move !== e.move ? { move_forced_by: [...forced] } : {}), paragraph_waypoints: pws };
  });
  return { ...record, waypoints };
}

// kogaki#1649: one row per axis with the entries it forced across the plan's Legs, and the total.
export function paragraphPlanCollisions(legs, axes) {
  const rows = axes.map((axis) => ({ axis, entries: 0 }));
  for (const l of legs) {
    for (const e of l.waypoints || []) {
      const hit = new Set([...(e.move_forced_by || []), ...(e.paragraph_waypoints || []).flatMap((p) => p.forced_by || [])]);
      for (const r of rows) if (hit.has(r.axis)) r.entries += 1;
    }
  }
  return { rows, total: rows.reduce((n, r) => n + r.entries, 0) };
}

// THE SITE CALL'S INPUT. `ctx` is `{ standing, site, retry, history }`: the Leg's standing
// record, the Leg Waypoint's number, the site retry this is (1 for the first), and every
// refused entry at the site beside its refusal, oldest first.
export function paragraphPlanSiteInput(ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const n = ctx.site;
  const entries = ctx.standing.waypoints;
  const entry = isMap(entries[n - 1]) ? entries[n - 1] : {};
  const w = leg.waypoints[n - 1];
  const moves = bindableMoves(inputs.movesDir);
  return {
    leg_waypoint_you_must_plan: {
      leg_id: leg.leg_id, waypoint: n, waypoints_in_leg: leg.waypoints.length,
      point: w.point, case: w.case, serves: [...w.serves], next_point: w.next_point,
      stands_to_be_taken_up: standsToBeTakenUp(leg, entries, n, (id) => boundMoveContract(id, inputs.movesDir)),
      ...siteMapping(inputs, unitId, n),
    },
    leaves_for_next_leg: leg.leaves_for_next_leg || [],
    fixed: siteFixed(ctx),
    paragraph_moves_you_may_bind: moves,
    moves_rejected_here: [...rejectedMoves(ctx.history, new Set(moves.map((m) => m.id)))],
    moves_bound_beside: movesBoundBeside(entries, n),
    persona: inputs.persona,
    terms_this_entry_introduces: entry.introduces || [],
    re_activations_this_entry_carries: entry["re-activate"] || [],
    refused_here: (ctx.history || []).map((h) => ({ entry: h.entry ?? null, refusal: h.refusal })),
  };
}

// The site's structure and Mapping Table, once the unit is grounded (kogaki#1734).
function siteMapping(inputs, unitId, n) {
  const state = inputs.mapping ? readMappingState(inputs.runDir, unitId) : null;
  const s = state && state.structures && state.structures[String(n)];
  const t = state && state.tables && state.tables[String(n)];
  return { ...(s ? { structure: { roles: s.roles, relations: s.relations, higher_order: s.higher_order } } : {}),
    ...(t ? { table: { base: t.base, correspondences: t.correspondences } } : {}) };
}

export function paragraphPlanSitePrompt(ctx, inputs, unitId) {
  const input = paragraphPlanSiteInput(ctx, inputs, unitId);
  if (inputs.runDir) appendSiteCallInput(inputs.runDir, unitId, siteCallInputRow(input, ctx, legForUnit(inputs, unitId)));
  return `${inputs.siteHead}${JSON.stringify(input, null, 2)}`;
}

// THE SITE CALL'S ANSWER, READ BACK. Returns `{ error }`, a refusal at the site that spends its
// Round, or `{ record, changed, suffixFrom?, sites? }`: the standing record with the entry in
// place, the entries to judge again, the first entry the suffix call composes again where the
// answer moved an endpoint, and later sites an unvalidated standing record still fails.
export function validateParagraphPlanSite(answer, ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const n = ctx.site;
  const total = leg.waypoints.length;
  const at = `Leg ${leg.leg_id}, Waypoint ${n}`;
  if (!isMap(answer)) return { error: `${at}: the site answer is not one entry` };
  if (answer.waypoint !== n) return { error: `${at}: the site answer is numbered ${JSON.stringify(answer.waypoint)} — it is the entry of Leg Waypoint ${n} alone` };
  const library = loadMoveIds(inputs.movesDir);
  if (library.error) throw new Error(library.error);
  const rejected = rejectedMoves(ctx.history, library.ids);
  if ((ctx.history || []).some((h) => repeatsRefusedEntry(answer, h.entry, h.by_judge))
    || (answer.move === null && movesNamed(answer.rationale, library.ids).every((m) => rejected.has(m)))) {
    return { error: `${at}: ${siteRepeatRefusal(n)}` };
  }
  const restated = restatedPoints(answer, ctx.history);
  if (restated) return { error: `${at}: ${siteRestatementRefusal(n, restated)}` };
  const prose = repairProse(answer);
  if (prose) {
    return { error: `${at}: the answer's \`${prose.field}\` carries ${prose.said} — it describes the paragraph and its reader, and carries no word of the refusal, the attempt, the shape of the record or any rule by name` };
  }
  const fixed = siteFixed(ctx);
  if (fixed && answer.move !== fixed.move) {
    return { error: `${at}: the answer changes \`move\` from ${JSON.stringify(fixed.move)} to ${JSON.stringify(answer.move)} — the first retry at a Leg Waypoint keeps its bound Move and rewrites its Paragraph Waypoints` };
  }
  const standing = ctx.standing.waypoints;
  const beside = !fixed && movesBoundBeside(standing, n).find((b) => b.move === answer.move);
  if (beside) {
    return { error: `${at}: the answer binds ${JSON.stringify(answer.move)}, the Move Leg Waypoint ${beside.waypoint} beside it already binds — a rebound paragraph binds no Move of \`moves_bound_beside\`` };
  }
  const was = isMap(standing[n - 1]) ? standing[n - 1] : {};
  const moved = n < total && typeof was.move === "string" && answer.move !== was.move;
  if (moved) {
    const bad = entryRefusal(answer, n - 1, leg, standing.slice(0, n - 1), library.ids, inputs.movesDir, at);
    if (bad) return { error: bad };
    return { record: { ...ctx.standing, waypoints: [...standing.slice(0, n - 1), answer] }, changed: [n], suffixFrom: n + 1 };
  }
  const merged = { ...ctx.standing, waypoints: standing.map((e, i) => (i === n - 1 ? answer : e)) };
  const r = validateParagraphPlanUnit(merged, inputs, unitId);
  if (!r.error) return { record: merged, changed: [n] };
  if (r.sites && r.sites.length && r.sites.every((m) => m > n)) {
    return { record: merged, changed: [n], sites: r.sites.map((m) => ({ waypoint: m, why: r.error })) };
  }
  return { error: r.error };
}

// THE SUFFIX CALL'S INPUT: the Leg call's own input over the Leg Waypoints from `ctx.from` on, the
// first of them handed what stands to be taken up after the entries that stand, beside them; the
// terms those entries already carry are not asked for again.
export function paragraphPlanSuffixInput(ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const stand = ctx.standing.waypoints.slice(0, ctx.from - 1);
  const introduced = new Set(stand.flatMap((e) => (e.introduces || []).map((t) => String(t.term).trim())));
  const { introduces, ...planned } = leg;
  const standing = standsToBeTakenUp(leg, ctx.standing.waypoints, ctx.from, (id) => boundMoveContract(id, inputs.movesDir));
  return {
    leg_you_must_plan: { ...planned,
      waypoints: planned.waypoints.filter((w) => w.waypoint >= ctx.from)
        .map((w) => (w.waypoint === ctx.from ? { ...w, stands_to_be_taken_up: standing } : (({ stands_to_be_taken_up, ...rest }) => rest)(w))) },
    paragraphs_that_stand: stand,
    paragraph_moves_you_may_bind: bindableMoves(inputs.movesDir),
    persona: inputs.persona,
    terms_this_leg_introduces: (introduces || []).filter((t) => !introduced.has(t.term)),
  };
}

// The Leg call's row over the suffix input, every refused suffix answer spliced in before the
// input marker by the Leg call's own retry block.
export function paragraphPlanSuffixPrompt(ctx, inputs, unitId) {
  const head = (ctx.history || []).length
    ? inputs.planHead.replace(new RegExp(`\\n${escapeRe(JUDGE_INPUT_MARKER)}\\n$`), `${judgeRefusalBlock(ctx.history)}\n\n${JUDGE_INPUT_MARKER}\n`)
    : inputs.planHead;
  return `${head}${JSON.stringify(paragraphPlanSuffixInput(ctx, inputs, unitId), null, 2)}`;
}

// THE SUFFIX CALL'S ANSWER, READ BACK: the entries from `ctx.from` on, joined to the entries that
// stand and read by the Leg call's own validator.
// `{ error }` refuses the answer and asks the suffix call again; `{ record, changed }` takes it.
export function validateParagraphPlanSuffix(answer, ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const a = answer || {};
  const total = leg.waypoints.length;
  const at = `Leg ${leg.leg_id}, Waypoint ${ctx.from}`;
  const extra = undeclaredKey(a, UNIT_KEYS);
  if (extra) return { error: `${at}: the answer carries \`${extra}\`, which it does not declare` };
  if (a.leg_id !== leg.leg_id) return { error: `${at}: the answer names leg ${JSON.stringify(a.leg_id)}, not ${leg.leg_id}` };
  if (!Array.isArray(a.waypoints) || a.waypoints.length !== total - ctx.from + 1) {
    return { error: `${at}: the answer carries ${Array.isArray(a.waypoints) ? a.waypoints.length : "no"} entr(ies) — one per Leg Waypoint from ${ctx.from} to ${total}, in order` };
  }
  const merged = { version: "1", leg_id: leg.leg_id,
    waypoints: [...ctx.standing.waypoints.slice(0, ctx.from - 1), ...a.waypoints] };
  const r = validateParagraphPlanUnit(merged, inputs, unitId);
  if (r.error) return { error: r.error };
  return { record: merged, changed: merged.waypoints.map((e, i) => i + 1).filter((m) => m >= ctx.from) };
}

// ---------------------------------------------------------------------------
// THE SELECTION INPUT RECORD (kogaki#1650, owner decision 2026-11-01): one file per Leg in the
// run directory, holding the values the plan call and each site call were handed, by Leg
// Waypoint, so a reader addresses them without reading a prompt. The prompt string is unchanged.
export const PARAGRAPH_PLAN_INPUT_PREFIX = "paragraph-plan-input-";
export const paragraphPlanInputPath = (dir, unitId) => join(dir, `${PARAGRAPH_PLAN_INPUT_PREFIX}${unitId}.json`);
const moveIdsOf = (moves) => moves.map((m) => m.id);

// The plan call's rows: `stands_to_be_taken_up` is the first Leg Waypoint's list on the first and
// null on every later one, where it is what the paragraphs the plan call binds before it leave.
export function planCallInputRows(input) {
  const leg = input.leg_you_must_plan;
  return leg.waypoints.map((w) => ({ waypoint: w.waypoint, point: w.point, case: w.case, serves: [...w.serves], next_point: w.next_point,
    stands_to_be_taken_up: w.waypoint === 1 ? w.stands_to_be_taken_up : null,
    terms_this_leg_introduces: input.terms_this_leg_introduces,
    paragraph_moves_you_may_bind: moveIdsOf(input.paragraph_moves_you_may_bind) }));
}

export function siteCallInputRow(input, ctx, leg) {
  const w = input.leg_waypoint_you_must_plan;
  return { waypoint: w.waypoint, retry: ctx.retry, point: w.point, case: w.case, serves: [...w.serves], next_point: w.next_point,
    stands_to_be_taken_up: w.stands_to_be_taken_up, terms_this_leg_introduces: leg.introduces || [],
    paragraph_moves_you_may_bind: moveIdsOf(input.paragraph_moves_you_may_bind),
    refused_here: input.refused_here, fixed: input.fixed, moves_rejected_here: input.moves_rejected_here };
}

function appendSiteCallInput(dir, unitId, row) {
  const path = paragraphPlanInputPath(dir, unitId);
  let doc;
  try { doc = JSON.parse(readFileSync(path, "utf8")); } catch { doc = { unit: unitId, waypoints: [], site_calls: [] }; }
  doc.site_calls = [...(doc.site_calls || []), row];
  writeJson(path, doc);
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

// THE LEGS A PRIOR RUN FINISHED, CARRIED INTO THIS ONE (kogaki#1641, owner decision
// 2026-10-31): a ParagraphPlan is designed for one Leg alone, so a Leg a prior run of the
// SAME inputs already finished -- the same Brief by content hash, the same Move library --
// is not planned again. Its candidate and verdict files are copied into the new run
// directory and its row is written `done` with `carried_from` naming the earlier run; no
// session is spawned for it. A prior run whose plan file was already written carries
// nothing, as does one over a different Brief or library.
function carriedUnits(source, dir, { briefSha, movesDir, legs }) {
  if (!source || resolve(source) === resolve(dir)) return [];
  if (existsSync(join(source, DONE_FILE)) || !existsSync(join(source, START_FILE))) return [];
  const job = readReaderPathJob(source);
  if (!job || !Array.isArray(job.units)) return [];
  let start;
  try { start = JSON.parse(readFileSync(join(source, START_FILE), "utf8")); } catch { return []; }
  if (start.brief_sha256 !== briefSha || start.moves_dir !== movesDir) return [];
  const ids = new Set(legs.map((_, i) => unitIdFor(i)));
  const copy = (from, to) => { if (from && existsSync(from)) { copyFileSync(from, to); return to; } return undefined; };
  return job.units.filter((u) => u.status === "done" && u.candidate && ids.has(u.id)).map((u) => {
    const candidateFile = copy(u.candidate_file, readerPathUnitCandidatePath(dir, u.id));
    const specializationFile = copy(u.specialization_file, readerPathUnitSpecializationPath(dir, u.id));
    if (existsSync(mappingStatePath(source, u.id))) {
      mkdirSync(dirname(mappingStatePath(dir, u.id)), { recursive: true });
      copy(mappingStatePath(source, u.id), mappingStatePath(dir, u.id));
    }
    return { id: u.id, status: "done", bytes: u.bytes || 0, rounds: u.rounds || 1, phase: u.phase || "fit",
      candidate: u.candidate, ...(candidateFile ? { candidate_file: candidateFile } : {}),
      ...(u.specialization ? { specialization: u.specialization } : {}),
      ...(specializationFile ? { specialization_file: specializationFile } : {}),
      carried_from: relFromRepo(resolve(source)) };
  });
}

// START: read the adopted Brief, the Move library and the Audience's persona, render one
// prompt per Leg, and hand the units to the shared supervisor. Returns the run directory.
// `priorRun` names the run whose finished Legs are carried; it is the latest run of the same
// Brief unless handed in (a fixture's run directories live outside the lane).
export function startParagraphPlan(briefPath, { runDir = null, movesDir = "moves", priorRun = undefined } = {}) {
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) fail(brief.error);
  const slug = slugOf(brief.record, briefPath);
  const latest = priorRun !== undefined ? (priorRun || null) : latestRunDir(slug);
  const prior = runDir ? (existsSync(readerPathJobPath(runDir)) ? runDir : null) : latest;
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
  const siteRow = table.paragraph_plan_site_unit || fail("src/paragraph-plan-workflow.json declares no paragraph_plan_site_unit row. Nothing was started.");
  const unbounded = criteriaFailures(table);
  if (unbounded.length) fail(`src/paragraph-plan-workflow.json's rows are not named criteria under their bound (kogaki#1511): ${unbounded.join("; ")}. Nothing was started.`);
  const unjustified = axesFailures(readAxes());
  if (unjustified.length) fail(`src/paragraph-plan-axes.json is not a registry of kept axes (kogaki#1533): ${unjustified.join("; ")}. Nothing was started.`);
  const callLimitS = positiveSetting(table.job, "call_limit_s");
  const unitRounds = positiveSetting(table.job, "unit_rounds");
  const siteRetry = table.job.site_retry || fail("src/paragraph-plan-workflow.json's `job` declares no `site_retry` (kogaki#1642). Nothing was started.");
  const legRevisions = positiveSetting(siteRetry, "leg_revisions");
  // THE MAPPER (kogaki#1734): reading, bind, grounding and the Paragraph Waypoints call, in that order, per Leg.
  const mapping = settingValue(table.job.mapper) === true;
  const declared = process.env.KOGAKI_JUDGE_CLI || table.judge.command;
  const binary = resolveJudgeBinary(String(declared), process.env.PATH);
  const model = String(settingValue(table.judge.model));
  const legOptions = planLegOptions(brief.legs, library.moves, personaPriorKnowledgeLine(persona));
  const unread = legOptions.find((o) => o.error);
  if (unread) fail(`${unread.error}. Nothing was started.`);
  const legs = brief.legs.map((leg, i) => planLeg(leg, legOptions[i]));
  const dir = runDir || enterRun("brief", `${runPrefix(slug)}${new Date().toISOString().replace(/[:.]/g, "-")}`);
  const briefSha = sha256(brief.text);
  const carried = carriedUnits(latest, dir, { briefSha, movesDir, legs });
  const carriedIds = new Set(carried.map((u) => u.id));
  writeJson(join(dir, START_FILE), {
    brief: relFromRepo(resolve(briefPath)), brief_sha256: briefSha, started_at: new Date().toISOString(),
    moves_dir: movesDir, legs,
    ...(carried.length ? { carried: carried.map((u) => ({ unit: u.id, leg_id: legs[Number(u.id.split("-")[1]) - 1].leg_id, from: u.carried_from })) } : {}),
  });
  const unitInputs = legs.map((leg) => paragraphPlanUnitInput(leg, library.moves, persona));
  for (const [i, leg] of legs.entries()) {
    const id = unitIdFor(i);
    const prior = carriedIds.has(id) && latest ? paragraphPlanInputPath(latest, id) : null;
    if (prior && existsSync(prior)) copyFileSync(prior, paragraphPlanInputPath(dir, id));
    else writeJson(paragraphPlanInputPath(dir, id), { leg_id: leg.leg_id, unit: id, waypoints: planCallInputRows(unitInputs[i]), site_calls: [] });
  }
  const units = legs.map((leg, i) => ({ id: unitIdFor(i), prompt: paragraphPlanUnitPrompt(row, unitInputs[i]), input: unitInputs[i] }))
    .filter((u) => !carriedIds.has(u.id));
  const planned = { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) };
  const planHead = renderRowHead({ id: "paragraph_plan_unit", ...row });
  startDetachedJobSupervisor(dir, {
    units, carried, command: binary.path, commandVersion: binary.version, model, outputFormat: String(table.judge.output_format || "json"),
    rows: Object.fromEntries([["compose", "paragraph_plan_unit"], ["fit", "paragraph_plan_judge_unit"], ["site", "paragraph_plan_site_unit"],
      ["suffix", "paragraph_plan_unit"]].map(([phase, id]) => [phase, { id, table: relFromRepo(PARAGRAPH_PLAN_TABLE) }])),
    callLimitS, unitRounds,
    unitIsolation: table.job.unit_isolation === true,
    stallS: jobStallS(table.job.stall_s),
    heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
    recordArray: "waypoints",
    validator: { module: "src/paragraph-plan.mjs", export: "validateParagraphPlanUnit", inputs: { legs, movesDir, runDir: dir, mapping } },
    ...(mapping ? { mapper: { module: "src/paragraph-plan-mapper.mjs", export: "ParagraphPlanMapper",
      inputs: { legs, strands: brief.legs.map((leg) => legStrand(leg, brief.record.strands)), movesDir, persona: planned, planHead } } } : {}),
    fitJudge: { module: "src/paragraph-plan.mjs", prompt_export: "paragraphPlanJudgePrompt", verdict_export: "paragraphPlanJudgeVerdict",
      inputs: { legs, movesDir, promptHead: renderRowHead(judgeRow) } },
    // THE SITE LOOP (kogaki#1642): a refusal naming a Leg Waypoint is retried there alone.
    siteRetry: { module: siteRetry.module, site_prompt_export: siteRetry.site_prompt_export,
      site_validator_export: siteRetry.site_validator_export, suffix_prompt_export: siteRetry.suffix_prompt_export,
      suffix_validator_export: siteRetry.suffix_validator_export, mark_export: siteRetry.mark_export, leg_revisions: legRevisions,
      inputs: { legs, movesDir, runDir: dir, mapping, persona: planned, axes: readAxes().axes.map((a) => String(a.id)), siteHead: renderRowHead({ id: "paragraph_plan_site_unit", ...siteRow }),
        planHead } },
  });
  return dir;
}

// ---------------------------------------------------------------------------
// THE END OF A JOB. Every Leg done writes the ParagraphPlan file, which is the record of
// the binding too (kogaki#1639); any Leg not done stops the stage naming the Leg and the
// Waypoint, and writes nothing beside the Brief.

export function jobStatusLines(dir, job, now = Date.now()) {
  const startedAt = Date.parse(job.started_at || job.updated_at || new Date(now).toISOString());
  let bounds = null;
  try { bounds = readerPathJobBounds(job); } catch { bounds = null; }
  const lines = [`ParagraphPlan job at ${relFromRepo(readerPathJobPath(dir))} — ${job.state}, elapsed ${Math.floor((now - startedAt) / 1000)}s; `
    + `each Leg gets up to ${bounds ? bounds.unitRounds : "?"} rounds of at most ${bounds ? `${bounds.callLimitS}s` : "?"} per call:`];
  for (const u of job.units || []) {
    const phase = u.phase === "fit" ? "judge" : u.phase === "site" ? "site retry" : ["reading", "grounding"].includes(u.phase) ? u.phase : "plan";
    lines.push(`  unit ${u.id}: round ${u.rounds || 1}, ${phase}, ${u.status}, ${u.bytes || 0} byte(s)`);
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

// The job's unit for each Leg of the start record, by id (kogaki#1641): a carried unit is
// written ahead of the spawned ones, so the record's order is not the Legs'.
function unitsByLeg(start, job) {
  const byId = new Map((job.units || []).map((u) => [u.id, u]));
  return start.legs.map((leg, i) => ({ leg, unit: byId.get(unitIdFor(i)) }));
}

// THE STOP LINES SAY WHAT WAS KEPT (kogaki#1641): the Legs that finished and are kept in the
// run directory, the Legs that ended refused or died with their last refusal, and that the
// next run on the same Brief plans the unfinished Legs only.
export function stopLines(start, job) {
  const rows = unitsByLeg(start, job);
  const kept = rows.filter((r) => r.unit && r.unit.status === "done");
  const unfinished = rows.filter((r) => !r.unit || r.unit.status !== "done");
  const lines = [`ParagraphPlan stopped: the job ended ${job.state}, and the Brief at ${start.brief} is unchanged — nothing was written beside it.`];
  if (kept.length) {
    lines.push(`  Kept: Leg ${kept.map((r) => r.leg.leg_id).join(", ")} finished and ${kept.length === 1 ? "is" : "are"} kept in the run directory`
      + `${kept.some((r) => r.unit.carried_from) ? ` (${kept.filter((r) => r.unit.carried_from).map((r) => `${r.leg.leg_id} carried from ${r.unit.carried_from}`).join("; ")})` : ""}.`);
  }
  for (const { leg, unit: u } of unfinished) {
    if (!u) { lines.push(`  Leg ${leg.leg_id}: no unit on the job record.`); continue; }
    const last = Array.isArray(u.refusals) && u.refusals.length ? u.refusals[u.refusals.length - 1]
      : (u.failure && u.failure.stderr_tail) || (job.failure && job.failure.note) || u.status;
    const ws = stoppedWaypoints(leg, last);
    lines.push(`  Leg ${leg.leg_id}, Waypoint ${ws.join(", ")}: ${u.status} after ${u.rounds || 1} round(s) — ${String(last).split("\n").join(" ")}`);
  }
  if (job.failure && job.failure.note && !unfinished.length) lines.push(`  ${job.failure.note}`);
  if (unfinished.length) {
    lines.push(`  Next: run /paragraph-plan on the same Brief again; it plans Leg ${unfinished.map((r) => r.leg.leg_id).join(", ")} only`
      + `${kept.length ? " and carries the kept Legs" : ""}; the Reader Path is not composed again.`);
  }
  return lines;
}

// The Mapping Record's entries from each unit's mapping state (kogaki#1734).
export function mappingEntries(dir, legs) {
  return legs.flatMap((leg, i) => {
    const state = readMappingState(dir, unitIdFor(i));
    if (!state) return [];
    return leg.waypoints.map((w) => {
      const k = String(w.waypoint);
      const structure = state.structures && state.structures[k] && !(state.read_from && state.read_from[k]) ? state.structures[k] : undefined;
      const table = state.tables && state.tables[k];
      return { leg_id: leg.leg_id, waypoint: w.waypoint, ...(structure ? { structure } : {}), ...(table ? { table } : {}) };
    });
  });
}

// Finish a terminal job. Returns `{ written }` or `{ stopped: lines }`.
export function finishParagraphPlan(dir) {
  const start = JSON.parse(readFileSync(join(dir, START_FILE), "utf8"));
  const job = readReaderPathJob(dir);
  if (!job) return { stopped: [`ParagraphPlan: no job record at ${relFromRepo(dir)}`] };
  // CARRIED AND FRESH UNITS ALIKE, EACH FOUND BY ITS LEG (kogaki#1641).
  const units = unitsByLeg(start, job).map((r) => r.unit);
  if (job.state !== "done" || units.some((u) => !u || u.status !== "done" || !u.candidate)) {
    return { stopped: stopLines(start, job) };
  }
  const briefPath = resolve(REPO, start.brief);
  const briefText = readFileSync(briefPath, "utf8");
  if (sha256(briefText) !== start.brief_sha256) {
    return { stopped: [`ParagraphPlan stopped: the Brief at ${start.brief} changed while the job ran (sha256 ${start.brief_sha256} `
      + `at the start, ${sha256(briefText)} now) — nothing was written; run /paragraph-plan on it again.`] };
  }
  // EACH ENTRY'S SCHEMA RIDES INTO THE FILE (kogaki#1639): the bound Move's id and the paragraph's
  // Leg-schema fields, exactly as the validator passed them; the file is the record of the binding.
  const legs = start.legs.map((leg, i) => ({ leg_id: leg.leg_id,
    waypoints: units[i].candidate.waypoints.map((e) => e.paragraph_waypoints),
    entries: units[i].candidate.waypoints.map((e) => Object.fromEntries([...PLAN_SCHEMA_KEYS, "move_forced_by"].filter((k) => Object.hasOwn(e, k)).map((k) => [k, e[k]]))),
    joins: units[i].candidate.waypoints.map((e) => e.join ?? null) }));
  // THE MAPPING RECORD IS WRITTEN WITH THE PLAN (kogaki#1733), and the plan names it by path and
  // digest: each Leg's structures read and tables grounded (kogaki#1734); a structure a Leg Waypoint
  // took from its predecessor is not written again.
  const planPath = paragraphPlanPathFor(briefPath);
  const mapping = writeMappingRecord(mappingDirFor(planPath), mappingEntries(dir, start.legs));
  const record = paragraphPlanRecord({ briefPath, briefText, legs, mapping });
  writeFileSync(planPath, paragraphPlanRecordText(record));
  writeJson(join(dir, DONE_FILE), { written: relFromRepo(planPath), at: new Date().toISOString(),
    collisions: paragraphPlanCollisions(record.legs, readAxes().axes.map((a) => String(a.id))) });
  return { written: planPath };
}

// ---------------------------------------------------------------------------
// THE VIEW (kogaki#1650): per Leg Waypoint, the Brief's point, the bound Move's takes, Segments
// and leaves with each Paragraph Waypoint beside its Segment (kogaki#1701); with a run, the
// refusals the entry met and the axes they name. A rendering that writes nothing; the plan is read
// through /draft's own reader, so a moved Brief is refused alike.
const constraintsText = (list) => (Array.isArray(list) && list.length
  ? list.map((x) => `${x.kind}: ${oneLineText(x.what)}`).join("; ") : "(none)");
const oneLineText = (v) => String(v).replace(/\s*\n\s*/g, " ").trim();
const cell = (v) => oneLineText(v ?? "").replace(/\|/g, "\\|");
const paragraphWaypointText = (p) => (!p ? "" : Object.hasOwn(p, "performs") ? `performs: ${p.performs}`
  : `${p.point} (serves ${(p.serves || []).join(", ")})`);

function viewRun(runDir, briefSha) {
  let start;
  try { start = JSON.parse(readFileSync(join(runDir, START_FILE), "utf8")); }
  catch (e) { return { error: `the run at ${relFromRepo(runDir)} has no start record a reader can read (${e.message})` }; }
  if (start.brief_sha256 !== briefSha) {
    return { error: `the run at ${relFromRepo(runDir)} was made from a different Brief: its start record names sha256 `
      + `${start.brief_sha256}, and the plan names sha256 ${briefSha}` };
  }
  const job = readReaderPathJob(runDir);
  if (!job) return { error: `the run at ${relFromRepo(runDir)} has no job record` };
  return { start, job };
}

// The refusals of one Leg's unit, each with the Leg Waypoints it names (none: the whole Leg)
// and the judge axes it names. A refusal names its site as `Leg <id>, Waypoint <n>` or opens with
// `Waypoint <n>:`; a bare `Leg Waypoint <n>` in its prose is a neighbour it cites, never its site.
const REFUSAL_SITE = /(?:^|Leg [^,\s]+, )Waypoint (\d+)/g;
export function legRefusals(job, unitId, axisIds) {
  const u = (job.units || []).find((x) => x.id === unitId);
  return ((u && u.refusals) || []).map((r) => String(r)).map((text) => ({ text: oneLineText(text),
    waypoints: [...new Set([...text.matchAll(REFUSAL_SITE)].map((m) => Number(m[1])))],
    axes: axisIds.filter((a) => new RegExp(`\\b${escapeRe(a)}\\b`).test(text)) }));
}
const refusalLine = (r) => `  - ${r.text} — axes: ${r.axes.length ? r.axes.join(", ") : "none named"}`;

export function paragraphPlanView(planPath, { runDir = null, movesDir = null } = {}) {
  let record;
  try { record = parseYaml(readFileSync(planPath, "utf8"), planPath); }
  catch (e) { return { error: `the ParagraphPlan file at ${planPath} cannot be read (${e.message})` }; }
  const named = record && record.brief && record.brief.path;
  if (typeof named !== "string" || named === "") return { error: `the ParagraphPlan file at ${planPath} names no Brief` };
  const briefPath = resolve(REPO, named);
  if (paragraphPlanPathFor(briefPath) !== resolve(planPath)) {
    return { error: `the ParagraphPlan file at ${planPath} is not beside the Brief it names (${named})` };
  }
  const brief = readAdoptedBrief(briefPath);
  if (brief.error) return { error: brief.error };
  const plan = readParagraphPlanBeside(briefPath, brief.text, brief.legs);
  if (plan.error) return { error: plan.error };
  const run = runDir ? viewRun(runDir, plan.record.brief.sha256) : null;
  if (run && run.error) return { error: run.error };
  const dirOfMoves = movesDir || (run && run.start.moves_dir) || "moves";
  const library = loadMoveContracts(dirOfMoves);
  if (library.error) return { error: library.error };
  const moves = new Map(library.moves.map((m) => [m.id, m]));
  const axisIds = (readAxes().axes || []).map((a) => a.id);
  const lines = [`# ParagraphPlan view: ${relFromRepo(resolve(planPath))}`, "",
    `Brief: \`${plan.record.brief.path}\` (sha256 \`${plan.record.brief.sha256}\`). Move library: \`${dirOfMoves}\`. `
    + `Run: ${run ? `\`${relFromRepo(resolve(runDir))}\`` : "none given"}.`];
  for (const [li, leg] of brief.legs.entries()) {
    const entries = plan.record.legs[li].waypoints;
    const refusals = run ? legRefusals(run.job, unitIdFor(li), axisIds) : [];
    lines.push("", `## Leg ${leg.leg_id}`);
    const legWide = refusals.filter((r) => !r.waypoints.length);
    if (legWide.length) lines.push("", "Refusals in this run naming no Leg Waypoint:", ...legWide.map(refusalLine));
    for (const [i, w] of leg.waypoints.entries()) {
      const e = entries[i];
      const move = moves.get(e.move);
      const segments = (move && move.segments) || [];
      const pws = e.paragraph_waypoints || [];
      lines.push("", `### Leg Waypoint ${i + 1}`, "", `- **Point:** ${oneLineText(w.point)}`,
        `- **Move:** \`${e.move}\`${move ? "" : ` — not in the Move library at ${dirOfMoves}`}`,
        `- **Move takes:** ${move ? constraintsText(move.takes) : "(not read)"}`, "",
        "| Segment | Operation | Relation | Manner | Paragraph Waypoint |", "|---|---|---|---|---|");
      for (let k = 0; k < Math.max(segments.length, pws.length); k++) {
        const g = segments[k] || {};
        lines.push(`| ${k < segments.length ? k + 1 : "—"} | ${cell(g.operation)} | ${cell(g.relation)} | ${cell(g.manner)} | ${cell(paragraphWaypointText(pws[k]))} |`);
      }
      lines.push("", `- **Move leaves:** ${move ? constraintsText(move.leaves) : "(not read)"}`);
      if (run) {
        const met = refusals.filter((r) => r.waypoints.includes(i + 1));
        lines.push(`- **Refusals in this run:** ${met.length ? "" : "none"}`, ...met.map(refusalLine));
      }
    }
  }
  return { lines };
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
  if (args._cmd === "view") {
    if (typeof args.plan !== "string" || args.plan === "") fail("view needs --plan <path to theses/<slug>/paragraph-plan.yaml>");
    const v = paragraphPlanView(resolve(args.plan), { runDir: typeof args.run === "string" ? resolve(args.run) : null,
      movesDir: typeof args["moves-dir"] === "string" ? args["moves-dir"] : null });
    if (v.error) fail(v.error);
    console.log(v.lines.join("\n"));
  } else {
    runStageCommand(args);
  }
}

function runStageCommand(args) {
  const briefPath = typeof args.brief === "string" && args.brief !== "" ? args.brief
    : fail("this command needs --brief <path to theses/<slug>/brief.yaml>");
  switch (args._cmd) {
    case "start": {
      const dir = startParagraphPlan(briefPath, { runDir: typeof args["run-dir"] === "string" ? resolve(args["run-dir"]) : null,
        movesDir: typeof args["moves-dir"] === "string" ? args["moves-dir"] : "moves",
        // `--prior-run <dir>` names the run whose finished Legs are carried (kogaki#1641); an
        // empty value carries nothing; absent, the latest run of the same Brief is read.
        ...(typeof args["prior-run"] === "string" ? { priorRun: args["prior-run"] === "" ? null : resolve(args["prior-run"]) } : {}) });
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
      fail("usage: node src/paragraph-plan.mjs start|status|await --brief <theses/<slug>/brief.yaml> | view --plan <theses/<slug>/paragraph-plan.yaml> [--run <dir>] [--moves-dir <dir>]");
  }
}
