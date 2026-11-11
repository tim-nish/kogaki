#!/usr/bin/env node
// ParagraphPlan — the stage that generates Waypoints after the Brief
// (kogaki#1375, owner decision 2026-10-14).
//
// WHAT IT IS. The Brief's Reader Path plans an article down to Legs: one per relation the
// Thesis reaches, each carrying its relation's `holds` as `text` and no Waypoint (kogaki#1775).
// This stage plans each Leg down to paragraphs. THE LEG IS THE UNIT (kogaki#1777, owner decision
// 2026-11-10): for every Leg it binds one paragraph Move and writes the Leg's paragraphs, at most
// `brief.paragraphs_per_leg`, each a list of Waypoints, one per Segment of the bound Move, and it
// hands them to the Packet through one planning record, `theses/<slug>/paragraph-plan.yaml`. Only
// this stage writes Waypoints. It is NOT Reiter and Dale's microplanning: word choice, reference
// and sentence shape stay inside the one Writer call. [see: SPEC-draft-pipeline "the ParagraphPlan stage"]
//
// THE MOVE BOUNDARY. Move information may be used up to Waypoint generation and nowhere after
// it. Each Leg entry of the file carries the bound Move's id (`move`, an id and nothing else of
// the Move) and its paragraphs, each the paragraph-level Leg schema (kogaki#1639) -- `materials`,
// `purpose`, `depends_on`, `rationale`, `introduces`, `re-activate` -- beside its `join`
// (kogaki#1411, kogaki#1477) and its Waypoints, each `point` and `serves` or `performs` alone
// (kogaki#1448). No Segment and no Move field reaches the file, it carries no reader state and no
// Obligations ledger (kogaki#1701), and the plan file is the record of the binding. The stage never
// writes the Brief, and the Brief names nothing downstream: the ParagraphPlan file names the Brief
// it was made from, by path and content hash.
//
// WHAT PRECEDES A LEG IS DERIVED (kogaki#1777): Leg n is handed the relations Legs 1 to n-1 state,
// read from the Leg order, as what the reader has been told; no state field is read or written.
//
// THE LOOP. One Detached Job unit per Leg, in Reader Path order, on the shared supervisor
// (src/workflow/detached-job.mjs). Each Round is two headless calls: `paragraph_plan_unit` binds a
// Move to the Leg and writes its paragraphs, and `paragraph_plan_judge_unit` judges them against the
// bound Move's `takes`, `leaves`, order (`segments`) and `breaks` (kogaki#1378, kogaki#1701). A
// refusal of either is put back into the next Round's prompt verbatim, until `brief.unit_rounds` is
// spent; a refusal naming a paragraph is retried at that paragraph alone (kogaki#1642); a call is
// bounded by `brief.call_limit_s`; there is no limit on the whole job. A Leg that spends its Rounds
// stops the stage naming the Leg and the paragraph, the Brief untouched, and the work resumes from
// the same Brief by running this stage again -- the Reader Path is not composed again.
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
import { parseBriefRecord, unfilledSlots, briefLegs, briefStructureRefusal, loadMoveContracts, loadMoveIds,
  moveContract, MOVE_RECORD_EXT, readerPersona, personaPriorKnowledgeLine, PARAGRAPH_PLAN_FILE, sha256, paragraphPlanPathFor,
  paragraphPlanRecord, paragraphPlanRecordText, readParagraphPlanBeside, paragraphPlanShapeRefusal,
  paragraphWaypointsRefusal, joinRefusal, undeclaredKey, parseIntroducesEntry, introducedMeaning,
  retiredPlanKeyRefusal, paragraphsPerLeg, paragraphCountRefusal, legStrandIds } from "./compose.mjs";
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
import { ANALOGY_ROW, ANALOGY_UNIT, ANALOGY_DIR, ANALOGY_FILE, NO_STRUCTURE_REASON, analogyMappingInput, analogyRecord,
  readAnalogy, writeAnalogy, withAnalogy } from "./paragraph-plan-analogy.mjs";

export const PARAGRAPH_PLAN_TABLE = join(REPO, "src", "paragraph-plan-workflow.json");
export const PARAGRAPH_PLAN_AXES = join(REPO, "src", "paragraph-plan-axes.json");
export const NO_PARAGRAPH_MOVE_FITS = "no_paragraph_move_fits";
// THE ROLES A BOUND PARAGRAPH MOVE MUST FILL (kogaki#1378): `breaks` to judge the
// Waypoints survive, and `segments` to order them by -- the Move's whole structure, with no
// fallback: `technique` is retired (kogaki#1412) and a Move without `segments` is refused at the
// Adapter. A bound Move missing one is a fatal stop, never a default. Its `takes` and `leaves`,
// required of every Move at the Adapter (kogaki#1698), are what it is bound and judged by (kogaki#1701).
export const PARAGRAPH_MOVE_ROLES = ["segments", "breaks"];
// The run directory's own files, beside the supervisor's. THE BINDINGS RECORD IS RETIRED
// (kogaki#1639): the plan file carries each paragraph's bound Move id and `rationale`, so the
// run directory holds no `paragraph-plan-bindings.json`.
const START_FILE = "paragraph-plan-start.json";
// THE LEG JOB, held while the Analogy Mapping runs (kogaki#1778): the supervisor's options, started once it is resolved.
const LEG_JOB_FILE = "paragraph-plan-leg-job.json";
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
// THE BRIEF THIS STAGE READS. An adopted Brief — no slot awaiting composition — whose Legs each
// carry their relation's `holds` as `text` and no Brief Waypoint (kogaki#1775, kogaki#1777).
// Returns `{ text, record, legs }` or `{ error }`.
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
  // THE LEG IS THE UNIT (kogaki#1777): a Leg is read by its `text` and never by a Brief Waypoint.
  for (const leg of legs) {
    const at = `the Brief at ${briefPath}, leg ${leg.leg_id}`;
    if (Array.isArray(leg.waypoints) && (leg.waypoints.length || typeof leg.text === "string")) {
      return { error: `${at} carries \`waypoints\` — /paragraph-plan takes the Leg as its unit and reads its \`text\`, never a `
        + "Brief Waypoint (kogaki#1777); compose the Brief again with /brief, whose Legs end at their relation's `holds` (kogaki#1775)" };
    }
    if (typeof leg.text !== "string" || leg.text.trim() === "") {
      return { error: `${at} carries no \`text\` — a Leg says its relation's \`holds\` in its \`text\`, which this stage plans (kogaki#1775, kogaki#1777)` };
    }
  }
  // `relation` BINDS ONLY WHERE THE BRIEF CARRIES A `structure` (kogaki#1768).
  const unbound = briefStructureRefusal(legs, parsed.record.structure, `the Brief at ${briefPath}`);
  if (unbound) return { error: unbound };
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

// WHAT A UNIT IS HANDED ABOUT ITS LEG (kogaki#1777): the Leg's `text`, its relation's `holds` with each
// Role named; its relation's id; its Claims, each Strand id beside the proposition it is `from`; the Roles
// the relation stands between, each with its `context`; the Persona's prior-knowledge line; and what the
// Legs before it state, `the_reader_has_been_told` (`toldBefore`). Its Journeys, `{strand, use}`, ride for
// a paragraph to place (kogaki#1639). No Leg binds a Move of the Brief's (kogaki#1768), so no Leg leaves
// anything for the next and `leaves_for_next_leg` is empty unless a caller hands one. Kept small and plain
// so the validator and the judge read the same Leg the prompt showed. `opts` is
// `{ told, roles, leaves, priorKnowledge }`.
export function planLeg(leg, opts = {}) {
  return {
    leg_id: leg.leg_id,
    ...(typeof leg.relation === "string" ? { relation: leg.relation } : {}),
    text: String(leg.text ?? "").trim(),
    claims: (leg.claims || []).map((g) => ({ strand: g.strand, proposition: String(g.proposition ?? "").trim() })),
    roles: (opts.roles || []).map((r) => ({ ...r })),
    prior_knowledge: typeof opts.priorKnowledge === "string" ? opts.priorKnowledge.trim() : "",
    the_reader_has_been_told: (opts.told || []).map((x) => ({ ...x })),
    leaves_for_next_leg: (opts.leaves || []).map((x) => ({ kind: x.kind, what: x.what })),
    journeys: (leg.journeys || []).filter((j) => j && typeof j === "object").map((j) => ({ strand: j.strand, use: j.use })),
    introduces: introducedTerms(leg.introduces),
  };
}

// WHAT THE READER HAS BEEN TOLD WHEN LEG n BEGINS (kogaki#1777): the relation each Leg before it
// states, in Leg order, as `{ leg_id, relation, text }`. Derived from the order alone; the Brief
// carries no reader state (kogaki#1699), and nothing here reads or writes one. `n` is 0-based.
export function toldBefore(legs, n) {
  return legs.slice(0, n).map((l) => ({ leg_id: l.leg_id, ...(typeof l.relation === "string" ? { relation: l.relation } : {}),
    text: String(l.text ?? "").trim() }));
}

// THE ROLES A LEG'S RELATION STANDS BETWEEN (kogaki#1777): an ordinary relation's `between`, and for a
// higher-order relation the Roles of every relation it relates, closed; each `{ id, name, context }`.
// Empty where the Brief carries no `structure`.
export function legRoles(structure, relationId) {
  if (!structure || typeof relationId !== "string") return [];
  const relation = new Map((structure.relations || []).map((r) => [r.id, r]));
  const higher = new Map((structure.higher_order || []).map((h) => [h.id, h]));
  const ids = new Set();
  const seen = new Set();
  const walk = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    if (relation.has(id)) for (const r of relation.get(id).between || []) ids.add(r);
    else if (higher.has(id)) (higher.get(id).relates || []).forEach(walk);
  };
  walk(relationId);
  return (structure.roles || []).filter((r) => ids.has(r.id))
    .map((r) => ({ id: r.id, ...(typeof r.name === "string" ? { name: r.name } : {}), context: r.context ?? "" }));
}

// The planLeg options for every Leg of a Brief: what the Legs before it state, the Roles of its
// relation and the Persona's prior-knowledge line.
export function planLegOptions(legs, structure, priorKnowledge) {
  return legs.map((leg, i) => ({ told: toldBefore(legs, i), roles: legRoles(structure, leg.relation), leaves: [], priorKnowledge }));
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
// never a point to state, and the judge checks each Waypoint against its own
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
// Each bindable Move carries its `takes` and `leaves` on its contract (kogaki#1701), and the
// input names the bound on the Leg's paragraphs (kogaki#1777).
export function paragraphPlanUnitInput(leg, moves, persona, bound) {
  const { introduces, ...planned } = leg;
  return {
    leg_you_must_plan: planned,
    paragraphs_at_most: bound,
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
// with its one `edit` applied -- a paragraph's Waypoint or `join` replaced, or the bound
// Move's `takes` (`move_takes`) or `leaves` (`move_leaves`) (kogaki#1701, kogaki#1777).
export function axisRecord(registry, name, seen = new Set()) {
  const r = (registry.records || {})[name];
  if (!r) throw new Error(`src/paragraph-plan-axes.json names the record "${name}", which \`records\` does not hold`);
  if (seen.has(name)) throw new Error(`src/paragraph-plan-axes.json's record "${name}" is derived from itself`);
  if (r.input) return structuredClone(r.input);
  const input = axisRecord(registry, r.from, new Set([...seen, name]));
  const e = r.edit || {};
  const leg = input.leg_you_must_judge;
  if (Object.hasOwn(e, "move_takes")) { leg.bound_move.takes = e.move_takes; return input; }
  if (Object.hasOwn(e, "move_leaves")) { leg.bound_move.leaves = e.move_leaves; return input; }
  const p = leg.paragraphs[Number(e.paragraph) - 1];
  if (!p) throw new Error(`record "${name}" edits paragraph ${e.paragraph}, which "${r.from}" does not carry`);
  if (Object.hasOwn(e, "join")) { p.join = e.join; return input; }
  const at = Number(e.waypoint) - 1;
  if (!p.paragraph_waypoints[at] || !e.to) throw new Error(`record "${name}" replaces no Waypoint of "${r.from}"`);
  p.paragraph_waypoints[at] = e.to;
  return input;
}

// Every failure of the registry: each axis one sentence, both fixture kinds naming records
// that resolve, a defect naming the paragraph it sits on, and a `justified_by` run.
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
        if (kind === "defect" && !Number.isInteger((registry.records[n] || {}).at_paragraph)) fails.push(`axis ${id}: defect "${n}" names no \`at_paragraph\``);
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

const UNIT_KEYS = ["version", "leg_id", "move", "rationale", "paragraphs"];
// THE PARAGRAPH IS THE PLAN FILE'S PARAGRAPH (kogaki#1639, kogaki#1777): its schema fields, its join and
// its Waypoints; the Move is the Leg's.
const UNIT_PARAGRAPH_KEYS = ["paragraph", ...PLAN_SCHEMA_KEYS, "join", "paragraph_waypoints"];
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
        + "that the Waypoints survive its breaks, and orders them by its segments, so nothing is defaulted. "
        + "Repair the Move record under its own issue.");
    }
  }
  return c;
}

// The bound on a Leg's paragraphs the unit is held to: the start's, or the setting's.
const boundOf = (inputs) => (Number.isInteger(inputs && inputs.bound) ? inputs.bound : paragraphsPerLeg());

// THE FIRST CALL'S ANSWER, READ BACK (the declared validator). Returns `{ error }` — a
// refusal of the Round, put verbatim into the next — or `{}`. A Leg no Move fits is the
// refusal `no_paragraph_move_fits`, naming the Leg. A refusal that names its paragraph
// carries it as `sites`, the place the retry is scoped to (kogaki#1642); a refusal of the
// whole Leg -- its Move, its paragraph count, its Leg-wide rules -- carries none.
export function validateParagraphPlanUnit(record, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const r = record || {};
  const at = `Leg ${leg.leg_id}`;
  const retired = retiredPlanKeyRefusal(r, `${at}: the plan record`);
  if (retired) return { error: retired };
  if (Object.hasOwn(r, "waypoints")) {
    return { error: `${at}: the plan record carries \`waypoints\` — the Leg is the unit (kogaki#1777): it binds one \`move\` and carries its \`paragraphs\`` };
  }
  const extra = undeclaredKey(r, UNIT_KEYS);
  if (extra) return { error: `${at}: the plan record carries \`${extra}\`, which it does not declare — it carries ${UNIT_KEYS.join(", ")}` };
  if (String(r.version) !== "1") return { error: `${at}: the plan record's version is ${JSON.stringify(r.version)}, not "1"` };
  if (r.leg_id !== leg.leg_id) return { error: `${at}: the plan record names leg ${JSON.stringify(r.leg_id)}, not ${leg.leg_id}` };
  if (typeof r.rationale !== "string" || words(r.rationale) < 4) return { error: `${at}: the plan record's \`rationale\`, why its Move fits this Leg, is under four words` };
  if (r.move === null) return { error: noParagraphMoveFitsRefusal([{ leg_id: leg.leg_id, text: leg.text, why: r.rationale.trim() }]) };
  const library = loadMoveIds(inputs.movesDir);
  if (library.error) throw new Error(library.error);
  if (typeof r.move !== "string" || r.move.trim() === "") {
    return { error: `${at}: carries no \`move\` — a Leg names the one Move bound to it by id, or null where no Move fits (kogaki#1777)` };
  }
  if (!library.ids.has(r.move)) return { error: `${at}: binds move ${JSON.stringify(r.move)}, which names no Move in the library at ${inputs.movesDir}` };
  if (!Array.isArray(r.paragraphs)) return { error: `${at}: the plan record carries no \`paragraphs\` list` };
  const count = paragraphCountRefusal(r.paragraphs.length, boundOf(inputs), at);
  if (count) return { error: count };
  const contract = boundMoveContract(r.move, inputs.movesDir);
  for (const [i, e] of r.paragraphs.entries()) {
    const bad = paragraphRefusal(e, i, leg, r.paragraphs.slice(0, i), contract, r.move, `${at}, paragraph ${i + 1}`);
    if (bad) return { error: bad, sites: [i + 1] };
  }
  const mapped = mappingVocabularyRefusal(r, inputs, unitId, at);
  if (mapped) return mapped;
  // THE LEG'S RULES OVER ITS PARAGRAPHS (kogaki#1639), by the plan reader's own rule: each
  // introduced term assigned to at most one paragraph.
  const legRule = paragraphLegRefusal(r.paragraphs, leg, at);
  if (legRule) return { error: legRule };
  return {};
}

// THE LEG'S CLAIMS AS THE MAPPER'S STRAND (kogaki#1734): the cites of the Strands its Claims serve, in
// order, as one text, which the structure read from the Leg carries verbatim.
export function legStrand(leg, strands = []) {
  const cite = new Map((Array.isArray(strands) ? strands : []).map((x) => [x.id, x.cite]));
  return (leg.claims || []).map((g) => cite.get(g.strand) || g.strand).join(", ") || String(leg.leg_id);
}

// THE MAPPING STATE OF ONE UNIT (kogaki#1734): the structure read and the table grounded for the Leg,
// written by the Mapper (src/paragraph-plan-mapper.mjs) in the run directory and read here by the validators.
export const mappingStatePath = (runDir, unitId) => join(runDir, "mapping", `${unitId}.json`);
export function readMappingState(runDir, unitId) {
  const path = runDir ? mappingStatePath(runDir, unitId) : null;
  return path && existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

// ONCE GROUNDED, the Leg keeps the Move its table was grounded for, and every paragraph's Waypoints
// carry that table's expressions and no Role id outside it (kogaki#1734).
function mappingVocabularyRefusal(record, inputs, unitId, at) {
  const t = inputs.mapping ? (readMappingState(inputs.runDir, unitId) || {}).table : null;
  if (!t) return null;
  if (record.move !== t.move) {
    return { error: `${at}: the plan binds ${JSON.stringify(record.move)}, and the Leg's Mapping Table was grounded for "${t.move}" — the Move is bound before grounding and kept after it` };
  }
  for (const [i, e] of record.paragraphs.entries()) {
    const v = correspondenceVocabularyRefusal(e.paragraph_waypoints, t, [], i + 1);
    if (v) {
      const id = (/carries the Role id "([^"]+)"/.exec(v) || [])[1];
      const c = id && t.correspondences.find((x) => x.role === id);
      return { error: `${at}, paragraph ${i + 1}: ${v}${c ? `; the Role "${id}" reads "${c.expression}" in the Leg's Mapping Table` : ""}`, sites: [i + 1] };
    }
  }
  return null;
}

// ONE PARAGRAPH'S RULES, against the paragraphs before it: the Leg call's validator and the site
// validator read a paragraph by this one function (kogaki#1642). `null` where it passes.
function paragraphRefusal(e, i, leg, prior, contract, moveId, atP) {
  if (!e || typeof e !== "object" || Array.isArray(e)) return `${atP}: the paragraph is not a map`;
  const retired = retiredPlanKeyRefusal(e, `${atP}: the paragraph`);
  if (retired) return retired;
  if (Object.hasOwn(e, "why")) return `${atP}: the paragraph carries \`why\`, retired (kogaki#1639) — why this paragraph comes here is its \`rationale\``;
  if (Object.hasOwn(e, "move")) return `${atP}: the paragraph carries \`move\` — the Leg binds one Move for all its paragraphs (kogaki#1777)`;
  const k = undeclaredKey(e, UNIT_PARAGRAPH_KEYS);
  if (k) return `${atP}: the paragraph carries \`${k}\`, which it does not declare — it carries paragraph, ${PLAN_SCHEMA_KEYS.join(", ")}, join (on every paragraph after the first) and paragraph_waypoints`;
  if (e.paragraph !== i + 1) return `${atP}: the paragraph is numbered ${JSON.stringify(e.paragraph)} — paragraphs are numbered in order from 1`;
  if (typeof e.rationale !== "string" || words(e.rationale) < 4) return `${atP}: \`rationale\` is under four words`;
  // THE PARAGRAPH'S SCHEMA, BY THE PLAN READER'S OWN RULE (kogaki#1639): so the record this
  // stage writes is one every later read accepts, and a refusal names the field here first.
  const schema = paragraphSchemaRefusal(e, i, leg, prior, atP);
  if (schema) return schema;
  // ONE PER SEGMENT, COUNTED HERE AND NOT JUDGED (kogaki#1533).
  const n = Array.isArray(e.paragraph_waypoints) ? e.paragraph_waypoints.length : 0;
  if (n !== contract.segments.length) {
    return `${atP}: carries ${n} Waypoint(s) for the ${contract.segments.length} Segment(s) of the Leg's bound Move `
      + `"${moveId}" — one Waypoint per Segment, in the Move's order`;
  }
  // THE JOIN, BY THE PLAN READER'S OWN RULE (kogaki#1411): so the file this stage writes is
  // one /draft reads. Whether it takes up what the previous paragraph left is the judge's.
  return joinRefusal(e, i, atP) || paragraphWaypointsRefusal(e.paragraph_waypoints, e.materials, atP) || null;
}

export function noParagraphMoveFitsRefusal(failures) {
  return [`NO PARAGRAPH MOVE FITS THESE LEGS (${NO_PARAGRAPH_MOVE_FITS}):`,
    ...failures.map((f) => `Leg ${f.leg_id} ("${f.text}"): you wrote: "${f.why}"`),
    "There is no fallback paragraph shape. Bind again: read each Move's takes against what the reader has been told "
    + "when this Leg begins once more, with the Leg's relation in view."].join("\n");
}

// THE SECOND CALL — the judge. Its input carries the Leg's text, what the reader has been told when it
// begins (kogaki#1777), the bound Move's takes, leaves, segments and breaks, and each paragraph's
// Waypoints, judged on the axes src/paragraph-plan-axes.json keeps (kogaki#1533, kogaki#1701); every
// paragraph after the first also carries its `join` (kogaki#1411, kogaki#1477), and the Leg carries
// what its paragraphs leave for the next Leg.
//
// A SCOPED JUDGMENT (kogaki#1642): after a site retry `scope` names the paragraphs to judge, `judge`
// whole and `join_only` for its join alone, and the judge is handed those paragraphs with every
// paragraph of the standing record beside them; its verdicts for the other paragraphs are carried.
export function paragraphPlanJudgeInput(record, inputs, unitId, scope = null) {
  const leg = legForUnit(inputs, unitId);
  const c = boundMoveContract(record.move, inputs.movesDir);
  const judged = judgedParagraphs(record, scope);
  const joinOnly = new Set(scope ? scope.join_only || [] : []);
  return {
    leg_you_must_judge: {
      leg_id: leg.leg_id,
      text: leg.text,
      prior_knowledge: leg.prior_knowledge || "",
      the_reader_has_been_told: leg.the_reader_has_been_told || [],
      leaves_for_next_leg: leg.leaves_for_next_leg || [],
      bound_move: withAnalogy({ takes: c.takes, leaves: c.leaves, segments: c.segments, breaks: c.breaks }, c, inputs.analogy),
      paragraphs: judged.map((n) => {
        const e = record.paragraphs[n - 1];
        return { paragraph: n, ...(joinOnly.has(n) ? { judge_its_join_only: true } : {}),
          ...(n > 1 ? { join: e.join } : {}), paragraph_waypoints: e.paragraph_waypoints };
      }),
    },
    ...(scope ? { standing_paragraphs: record.paragraphs.map((e, i) => ({ paragraph: i + 1,
      ...(i > 0 ? { join: e.join } : {}), paragraph_waypoints: e.paragraph_waypoints })) } : {}),
  };
}

// The paragraphs a judgment covers, in order: every one, or the scope's.
function judgedParagraphs(record, scope) {
  if (!scope) return (record.paragraphs || []).map((_, i) => i + 1);
  return [...new Set([...(scope.judge || []), ...(scope.join_only || [])])].sort((x, y) => x - y);
}

export function paragraphPlanJudgePrompt(record, inputs, unitId, scope = null) {
  return `${inputs.promptHead}${JSON.stringify(paragraphPlanJudgeInput(record, inputs, unitId, scope), null, 2)}`;
}

export const PARAGRAPH_PLAN_VERDICTS = ["fits", "does-not-fit"];

// THE AXES THAT JUDGE THE BINDING ITSELF (kogaki#1647, kogaki#1701): a refusal on one of them is a
// refusal of the Leg's Move, which no paragraph can repair under it (kogaki#1777), so it reopens the
// whole Leg and the Move is bound again.
export const BINDING_AXES = ["TAKEN", "LEFT"];
const BINDING_REFUSAL = new RegExp(`\\b(?:${BINDING_AXES.join("|")})\\b`);

// The judge's answer, read back: `{ error }` is its own malformed output, asked again
// with the same prompt; `{ refusal, failures }` refuses the Round; `{}` passes it. Under a
// `scope` the verdicts are the scope's paragraphs, in order (kogaki#1642). A failure on a binding
// axis carries no site: the whole Leg is planned again.
export function paragraphPlanJudgeVerdict(verdict, record, inputs, unitId, scope = null) {
  const leg = legForUnit(inputs, unitId);
  const want = judgedParagraphs(record, scope);
  const v = verdict || {};
  if (String(v.version) !== "1") return { error: `the verdict record's version is ${JSON.stringify(v.version)}, not "1"` };
  if (v.leg_id !== leg.leg_id) return { error: `the verdict record names leg ${JSON.stringify(v.leg_id)}, not ${leg.leg_id}` };
  if (!Array.isArray(v.verdicts) || v.verdicts.length !== want.length) {
    return { error: `the verdict record carries ${Array.isArray(v.verdicts) ? v.verdicts.length : "no"} verdict(s) for the `
      + `${want.length} paragraph(s) it judges — one per paragraph, in order` };
  }
  const failures = [];
  for (const [i, x] of v.verdicts.entries()) {
    const n = want[i];
    if (!x || typeof x !== "object" || x.paragraph !== n) return { error: `verdict ${i + 1} does not name paragraph ${n}` };
    if (!PARAGRAPH_PLAN_VERDICTS.includes(x.verdict)) return { error: `paragraph ${n}'s verdict ${JSON.stringify(x.verdict)} is outside ${PARAGRAPH_PLAN_VERDICTS.join(" | ")}` };
    if (typeof x.why !== "string" || words(x.why) < 4) return { error: `paragraph ${n}'s \`why\` is under four words` };
    if (x.verdict === "does-not-fit") {
      const f = { leg_id: leg.leg_id, paragraph: n, why: x.why.trim() };
      failures.push({ ...f, ...(BINDING_REFUSAL.test(f.why) ? {} : { site: n }), refusal: judgeSiteRefusal(f) });
    }
  }
  if (!failures.length) return {};
  const refusal = ["THE WAYPOINTS WERE JUDGED, AND THESE DO NOT FIT THE MOVE BOUND TO THEIR LEG:",
    ...failures.map((f) => f.refusal),
    "Generate the Waypoints again so that the bound Move's takes are each met by what the reader has been told "
    + "when the Leg begins, its leaves are each taken up by a later paragraph or left for the next Leg, they follow the "
    + "Move's order (its segments), "
    + "each perform its own Segment's operation and stand in that Segment's relation, "
    + "and survive each of its breaks, or bind another Move; and write each join so that it takes up what the "
    + "previous paragraph leaves, restates no Waypoint, names no noun phrase "
    + "of either paragraph's Waypoints, brings no case, example or term of its own and states no effect "
    + "on the reader."].join("\n");
  // A BINDING REFUSAL REOPENS THE LEG: the Round is refused whole, and no site is named.
  return { refusal, failures: failures.some((f) => f.site === undefined) ? [] : failures };
}

// One paragraph's refusal by the judge, the sentence a site retry is handed verbatim.
export function judgeSiteRefusal(f) {
  return `Leg ${f.leg_id}, paragraph ${f.paragraph}: the judge wrote: "${f.why}"`;
}

// ---------------------------------------------------------------------------
// THE SITE RETRY (kogaki#1642, owner decision 2026-10-31). A refusal that names a paragraph is
// repaired at that paragraph alone: the site call is handed that one paragraph, the Leg's bound
// Move, the paragraphs beside it and its refusals, and answers one paragraph. The Move is the
// Leg's and is held at every site (kogaki#1777); a refusal of the binding reopens the whole Leg
// through the suffix call from paragraph 1, which may bind another Move. The supervisor runs the
// loop (src/workflow/site-retry.mjs); what follows builds the calls' prompts and reads back their
// answers.
export const siteRepeatRefusal = (n) => `the answer repeats the refused paragraph ${n}; the refusal asked for a change at that paragraph`;

const canonical = (v) => JSON.stringify(v ?? null, (k, x) => (x && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
const isMap = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// AN ANSWER THAT DOES NOT ACT ON ITS REFUSAL: after a judge's refusal, the same Waypoints and
// join; after a validator's, the same paragraph whole, since the field it named may be any of them.
export function repeatsRefusedEntry(answer, refused, byJudge) {
  if (!isMap(answer) || !isMap(refused)) return false;
  if (!byJudge) return canonical(answer) === canonical(refused);
  return canonical(answer.paragraph_waypoints) === canonical(refused.paragraph_waypoints)
    && canonical(answer.join) === canonical(refused.join);
}

// THE TEXT OF A PARAGRAPH'S WAYPOINTS, IN ORDER (kogaki#1651): each one's `point` or
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

// AN ANSWER THAT RESTATES A REFUSED ROUND (kogaki#1651): its Waypoints' text equals a
// refused paragraph's, in order, whatever else the record changed. Returns the unchanged points.
export function restatedPoints(answer, history) {
  const mine = paragraphPointsText(answer);
  if (!mine.length) return null;
  for (const h of history || []) {
    const theirs = paragraphPointsText(h.entry);
    if (theirs.length === mine.length && theirs.every((t, i) => t === mine[i])) return mine;
  }
  return null;
}
export const siteRestatementRefusal = (n, points) => `the answer restates the refused round's Waypoints at paragraph ${n} unchanged — `
  + `${points.map((t) => JSON.stringify(t)).join(", ")}; the refusal asked for a change to what they say`;

// THE PARAGRAPHS BESIDE A SITE (kogaki#1651): the previous and next paragraphs' Waypoints, each by number.
export function paragraphsBeside(entries, n) {
  return [n - 1, n + 1].filter((m) => m >= 1 && isMap(entries[m - 1]))
    .map((m) => ({ paragraph: m, paragraph_waypoints: entries[m - 1].paragraph_waypoints || [] }));
}

// PROSE THAT DESCRIBES THE REPAIR RATHER THAN THE PARAGRAPH (kogaki#1651): a word of the refusal or
// the Round, an Issue reference, or a field of the record named in backticks.
const SITE_PROSE_FIELDS = ["purpose", "rationale"];
const RECORD_FIELD_NAMES = new Set([...UNIT_KEYS, ...UNIT_PARAGRAPH_KEYS, "point", "serves", "performs",
  "paragraph_you_must_plan", "bound_move", "paragraphs_beside", "refused_here", "the_reader_has_been_told",
  "leaves_for_next_leg", "terms_this_paragraph_introduces", "re_activations_this_paragraph_carries",
  "takes", "leaves", "segments", "operation"]);
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

function bindableMoves(movesDir) {
  const library = loadMoveContracts(movesDir);
  if (library.error) throw new Error(library.error);
  return library.moves.map((m) => ({ ...m, segments: segmentsForPlanCall(m.segments) }));
}

// kogaki#1649: the passing record, each Waypoint that differs from the first refused Round at its paragraph
// marked with the axes the judge's refusals named. A refusal of the Leg whole (kogaki#1777), kept at
// site 0, marks each Waypoint that differs from the refused Leg's same paragraph, and a Move it rebound.
export function paragraphPlanForcedMark(record, history, inputs) {
  const axes = (inputs && inputs.axes) || [];
  const named = (text) => axes.filter((id) => new RegExp(`\\b${escapeRe(id)}\\b`).test(String(text)));
  const forcedBy = (refusals) => axes.filter((id) => refusals.some((h) => named(h.refusal).includes(id)));
  const whole = ((history && history.get(0)) || []).filter((h) => h.by_judge);
  const wholeForced = forcedBy(whole);
  const wholeRefused = whole.length && isMap(whole[0].entry) ? whole[0].entry : {};
  const paragraphs = record.paragraphs.map((e, i) => {
    if (!isMap(e)) return e;
    const refusals = ((history && history.get(i + 1)) || []).filter((h) => h.by_judge);
    const marks = [[forcedBy(refusals), refusals.length && isMap(refusals[0].entry) ? refusals[0].entry : {}],
      [wholeForced, (Array.isArray(wholeRefused.paragraphs) && wholeRefused.paragraphs[i]) || {}]].filter(([f]) => f.length);
    if (!marks.length) return e;
    const pws = (e.paragraph_waypoints || []).map((p) => {
      const forced = axes.filter((id) => marks.some(([f, refused]) => f.includes(id)
        && !(Array.isArray(refused.paragraph_waypoints) ? refused.paragraph_waypoints : []).map(canonical).includes(canonical(p))));
      return forced.length ? { ...p, forced_by: forced } : p;
    });
    return { ...e, paragraph_waypoints: pws };
  });
  const rebound = wholeForced.length && wholeRefused.move !== undefined && wholeRefused.move !== record.move;
  return { ...record, ...(rebound ? { move_forced_by: wholeForced } : {}), paragraphs };
}

// kogaki#1649: one row per axis with the paragraphs it forced across the plan's Legs, and the total.
export function paragraphPlanCollisions(legs, axes) {
  const rows = axes.map((axis) => ({ axis, entries: 0 }));
  for (const l of legs) {
    for (const e of l.paragraphs || []) {
      const hit = new Set([...(l.move_forced_by || []), ...(e.paragraph_waypoints || []).flatMap((p) => p.forced_by || [])]);
      for (const r of rows) if (hit.has(r.axis)) r.entries += 1;
    }
  }
  return { rows, total: rows.reduce((n, r) => n + r.entries, 0) };
}

// THE SITE CALL'S INPUT. `ctx` is `{ standing, site, retry, history }`: the Leg's standing
// record, the paragraph's number, the site retry this is (1 for the first), and every
// refused paragraph at the site beside its refusal, oldest first.
export function paragraphPlanSiteInput(ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const n = ctx.site;
  const entries = ctx.standing.paragraphs;
  const entry = isMap(entries[n - 1]) ? entries[n - 1] : {};
  const c = boundMoveContract(ctx.standing.move, inputs.movesDir);
  return {
    paragraph_you_must_plan: {
      leg_id: leg.leg_id, paragraph: n, paragraphs_in_leg: entries.length, text: leg.text, claims: leg.claims,
      prior_knowledge: leg.prior_knowledge || "", the_reader_has_been_told: leg.the_reader_has_been_told || [],
      ...siteMapping(inputs, unitId),
    },
    leaves_for_next_leg: leg.leaves_for_next_leg || [],
    bound_move: withAnalogy({ id: ctx.standing.move, takes: c.takes, leaves: c.leaves, segments: segmentsForPlanCall(c.segments), breaks: c.breaks },
      c, inputs.analogy),
    paragraphs_beside: paragraphsBeside(entries, n),
    persona: inputs.persona,
    terms_this_paragraph_introduces: entry.introduces || [],
    re_activations_this_paragraph_carries: entry["re-activate"] || [],
    refused_here: (ctx.history || []).map((h) => ({ entry: h.entry ?? null, refusal: h.refusal })),
  };
}

// The Leg's structure and Mapping Table, once the unit is grounded (kogaki#1734).
function siteMapping(inputs, unitId) {
  const state = inputs.mapping ? readMappingState(inputs.runDir, unitId) : null;
  const s = state && state.structure;
  const t = state && state.table;
  return { ...(s ? { structure: { roles: s.roles, relations: s.relations, higher_order: s.higher_order } } : {}),
    ...(t ? { table: { base: t.base, correspondences: t.correspondences } } : {}) };
}

export function paragraphPlanSitePrompt(ctx, inputs, unitId) {
  const input = paragraphPlanSiteInput(ctx, inputs, unitId);
  if (inputs.runDir) appendSiteCallInput(inputs.runDir, unitId, siteCallInputRow(input, ctx));
  return `${inputs.siteHead}${JSON.stringify(input, null, 2)}`;
}

// THE SITE CALL'S ANSWER, READ BACK. Returns `{ error }`, a refusal at the site that spends its
// Round, or `{ record, changed, sites? }`: the standing record with the paragraph in place, the
// paragraphs to judge again, and later sites an unvalidated standing record still fails.
export function validateParagraphPlanSite(answer, ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const n = ctx.site;
  const at = `Leg ${leg.leg_id}, paragraph ${n}`;
  if (!isMap(answer)) return { error: `${at}: the site answer is not one paragraph` };
  if (answer.paragraph !== n) return { error: `${at}: the site answer is numbered ${JSON.stringify(answer.paragraph)} — it is paragraph ${n} alone` };
  if (Object.hasOwn(answer, "move")) {
    return { error: `${at}: the answer carries \`move\` — the Leg's Move ${JSON.stringify(ctx.standing.move)} is held at every paragraph, and a paragraph names none (kogaki#1777)` };
  }
  if ((ctx.history || []).some((h) => repeatsRefusedEntry(answer, h.entry, h.by_judge))) return { error: `${at}: ${siteRepeatRefusal(n)}` };
  const restated = restatedPoints(answer, ctx.history);
  if (restated) return { error: `${at}: ${siteRestatementRefusal(n, restated)}` };
  const prose = repairProse(answer);
  if (prose) {
    return { error: `${at}: the answer's \`${prose.field}\` carries ${prose.said} — it describes the paragraph and its reader, and carries no word of the refusal, the attempt, the shape of the record or any rule by name` };
  }
  const standing = ctx.standing.paragraphs;
  const merged = { ...ctx.standing, paragraphs: standing.map((e, i) => (i === n - 1 ? answer : e)) };
  const r = validateParagraphPlanUnit(merged, inputs, unitId);
  if (!r.error) return { record: merged, changed: [n] };
  if (r.sites && r.sites.length && r.sites.every((m) => m > n)) {
    return { record: merged, changed: [n], sites: r.sites.map((m) => ({ site: m, why: r.error })) };
  }
  return { error: r.error };
}

// THE SUFFIX CALL'S INPUT: the Leg call's own input, with the paragraphs before `ctx.from` standing
// beside it; from paragraph 1, after a refusal of the binding, the whole Leg is planned again and its
// Move may change. The terms the standing paragraphs already carry are not asked for again.
export function paragraphPlanSuffixInput(ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const stand = ctx.from > 1 ? ctx.standing.paragraphs.slice(0, ctx.from - 1) : [];
  const introduced = new Set(stand.flatMap((e) => (e.introduces || []).map((t) => String(t.term).trim())));
  const { introduces, ...planned } = leg;
  return {
    leg_you_must_plan: planned,
    paragraphs_at_most: boundOf(inputs),
    ...(ctx.from > 1 ? { move: ctx.standing.move, paragraphs_that_stand: stand } : {}),
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

// THE SUFFIX CALL'S ANSWER, READ BACK: a plan record whose `paragraphs` run from `ctx.from` on, joined
// to the paragraphs that stand and read by the Leg call's own validator. From paragraph 2 on it keeps
// the standing Move. `{ error }` refuses the answer and asks the suffix call again; `{ record, changed }` takes it.
export function validateParagraphPlanSuffix(answer, ctx, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const a = answer || {};
  const at = `Leg ${leg.leg_id}, paragraph ${ctx.from}`;
  const extra = undeclaredKey(a, UNIT_KEYS);
  if (extra) return { error: `${at}: the answer carries \`${extra}\`, which it does not declare` };
  if (a.leg_id !== leg.leg_id) return { error: `${at}: the answer names leg ${JSON.stringify(a.leg_id)}, not ${leg.leg_id}` };
  if (!Array.isArray(a.paragraphs)) return { error: `${at}: the answer carries no \`paragraphs\` list` };
  if (ctx.from > 1 && a.move !== ctx.standing.move) {
    return { error: `${at}: the answer binds ${JSON.stringify(a.move)} — the paragraphs before ${ctx.from} stand under ${JSON.stringify(ctx.standing.move)}, which the Leg keeps` };
  }
  const stand = ctx.from > 1 ? ctx.standing.paragraphs.slice(0, ctx.from - 1) : [];
  const merged = { version: "1", leg_id: leg.leg_id, move: a.move, rationale: a.rationale ?? ctx.standing.rationale,
    paragraphs: [...stand, ...a.paragraphs] };
  const r = validateParagraphPlanUnit(merged, inputs, unitId);
  if (r.error) return { error: r.error };
  return { record: merged, changed: merged.paragraphs.map((e, i) => i + 1).filter((m) => m >= ctx.from) };
}

// ---------------------------------------------------------------------------
// THE SELECTION INPUT RECORD (kogaki#1650, owner decision 2026-11-01): one file per Leg in the
// run directory, holding the values the plan call and each site call were handed, so a reader
// addresses them without reading a prompt. The prompt string is unchanged.
export const PARAGRAPH_PLAN_INPUT_PREFIX = "paragraph-plan-input-";
export const paragraphPlanInputPath = (dir, unitId) => join(dir, `${PARAGRAPH_PLAN_INPUT_PREFIX}${unitId}.json`);
const moveIdsOf = (moves) => moves.map((m) => m.id);

// The plan call's row: the Leg's text, Claims and what the reader has been told, the bound and the Moves.
export function planCallInputRow(input) {
  const leg = input.leg_you_must_plan;
  return { text: leg.text, claims: leg.claims, the_reader_has_been_told: leg.the_reader_has_been_told,
    paragraphs_at_most: input.paragraphs_at_most, terms_this_leg_introduces: input.terms_this_leg_introduces,
    paragraph_moves_you_may_bind: moveIdsOf(input.paragraph_moves_you_may_bind) };
}

export function siteCallInputRow(input, ctx) {
  const p = input.paragraph_you_must_plan;
  return { paragraph: p.paragraph, retry: ctx.retry, text: p.text, the_reader_has_been_told: p.the_reader_has_been_told,
    bound_move: input.bound_move.id, terms_this_paragraph_introduces: input.terms_this_paragraph_introduces,
    refused_here: input.refused_here };
}

function appendSiteCallInput(dir, unitId, row) {
  const path = paragraphPlanInputPath(dir, unitId);
  let doc;
  try { doc = JSON.parse(readFileSync(path, "utf8")); } catch { doc = { unit: unitId, plan_call: null, site_calls: [] }; }
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
  // A KEPT LEG WAS PLANNED UNDER ITS RUN'S ANALOGY MAPPING (kogaki#1778), so the mapping is carried with it.
  if (!existsSync(join(source, ANALOGY_FILE))) return [];
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
  const prior = runDir ? ([runDir, analogyDir(runDir)].some((d) => existsSync(readerPathJobPath(d))) ? runDir : null) : latest;
  if (prior) {
    const job = readReaderPathJob(prior);
    const opening = readReaderPathJob(analogyDir(prior));
    if ([job, opening].some((j) => j && j.state === "running" && supervisorAlive(j.supervisor_pid))) {
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
  // THE BOUND ON A LEG'S PARAGRAPHS (kogaki#1777), read once at the start and handed to every reader.
  const bound = paragraphsPerLeg();
  // THE MAPPER (kogaki#1734): reading, bind, grounding and the Waypoints call, in that order, per Leg.
  const mapping = settingValue(table.job.mapper) === true;
  const declared = process.env.KOGAKI_JUDGE_CLI || table.judge.command;
  const binary = resolveJudgeBinary(String(declared), process.env.PATH);
  const model = String(settingValue(table.judge.model));
  const legOptions = planLegOptions(brief.legs, brief.record.structure || null, personaPriorKnowledgeLine(persona));
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
  const unitInputs = legs.map((leg) => paragraphPlanUnitInput(leg, library.moves, persona, bound));
  for (const [i, leg] of legs.entries()) {
    const id = unitIdFor(i);
    const prior = carriedIds.has(id) && latest ? paragraphPlanInputPath(latest, id) : null;
    if (prior && existsSync(prior)) copyFileSync(prior, paragraphPlanInputPath(dir, id));
    else writeJson(paragraphPlanInputPath(dir, id), { leg_id: leg.leg_id, unit: id, plan_call: planCallInputRow(unitInputs[i]), site_calls: [] });
  }
  const units = legs.map((leg, i) => ({ id: unitIdFor(i), prompt: paragraphPlanUnitPrompt(row, unitInputs[i]), input: unitInputs[i] }))
    .filter((u) => !carriedIds.has(u.id));
  const planned = { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) };
  const planHead = renderRowHead({ id: "paragraph_plan_unit", ...row });
  const legJob = {
    units, carried, command: binary.path, commandVersion: binary.version, model, outputFormat: String(table.judge.output_format || "json"),
    rows: Object.fromEntries([["compose", "paragraph_plan_unit"], ["fit", "paragraph_plan_judge_unit"], ["site", "paragraph_plan_site_unit"],
      ["suffix", "paragraph_plan_unit"]].map(([phase, id]) => [phase, { id, table: relFromRepo(PARAGRAPH_PLAN_TABLE) }])),
    callLimitS, unitRounds,
    unitIsolation: table.job.unit_isolation === true,
    stallS: jobStallS(table.job.stall_s),
    heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms),
    recordArray: "paragraphs",
    validator: { module: "src/paragraph-plan.mjs", export: "validateParagraphPlanUnit", inputs: { legs, movesDir, runDir: dir, mapping, bound } },
    ...(mapping ? { mapper: { module: "src/paragraph-plan-mapper.mjs", export: "ParagraphPlanMapper",
      inputs: { legs, strands: brief.legs.map((leg) => legStrand(leg, brief.record.strands)), movesDir, persona: planned, planHead,
        structure: brief.record.structure || null } } } : {}),
    fitJudge: { module: "src/paragraph-plan.mjs", prompt_export: "paragraphPlanJudgePrompt", verdict_export: "paragraphPlanJudgeVerdict",
      inputs: { legs, movesDir, promptHead: renderRowHead(judgeRow) } },
    // THE SITE LOOP (kogaki#1642): a refusal naming a paragraph is retried there alone.
    siteRetry: { module: siteRetry.module, site_prompt_export: siteRetry.site_prompt_export,
      site_validator_export: siteRetry.site_validator_export, suffix_prompt_export: siteRetry.suffix_prompt_export,
      suffix_validator_export: siteRetry.suffix_validator_export, mark_export: siteRetry.mark_export, leg_revisions: legRevisions,
      record_array: "paragraphs", site_label: "paragraph",
      inputs: { legs, movesDir, runDir: dir, mapping, bound, persona: planned, axes: readAxes().axes.map((a) => String(a.id)), siteHead: renderRowHead({ id: "paragraph_plan_site_unit", ...siteRow }),
        planHead } },
  };
  const bounds = { binary, model, outputFormat: String(table.judge.output_format || "json"), callLimitS, unitRounds,
    stallS: jobStallS(table.job.stall_s), heartbeatMs: jobHeartbeatMs(table.job.heartbeat_ms) };
  // THE ANALOGY MAPPING COMES FIRST (kogaki#1778): carried with the kept Legs, `none` for a Brief with no
  // structure, or one judgment run before the Leg job, which `await` starts once it is resolved.
  if (carried.length) copyFileSync(join(latest, ANALOGY_FILE), join(dir, ANALOGY_FILE));
  else if (!brief.record.structure) writeAnalogy(dir, { none: NO_STRUCTURE_REASON });
  if (readAnalogy(dir)) startLegJob(dir, legJob);
  else {
    writeJson(join(dir, LEG_JOB_FILE), legJob);
    startAnalogyJob(dir, table, brief.record.structure, persona, bounds);
  }
  return dir;
}

// The Leg job, every reader handed the run's Analogy Mapping.
function startLegJob(dir, legJob) {
  const analogy = readAnalogy(dir);
  const add = (o) => (o ? { ...o, inputs: { ...o.inputs, analogy } } : o);
  startDetachedJobSupervisor(dir, { ...legJob, mapper: add(legJob.mapper), fitJudge: add(legJob.fitJudge), siteRetry: add(legJob.siteRetry) });
}

// THE OPENING STEP (kogaki#1778): one unit, `analogy_mapping`, in the run directory's `analogy/`.
export const analogyDir = (dir) => join(dir, ANALOGY_DIR);
function startAnalogyJob(dir, table, structure, persona, b) {
  const row = table[ANALOGY_ROW] || fail(`src/paragraph-plan-workflow.json declares no ${ANALOGY_ROW} row. Nothing was started.`);
  const input = analogyMappingInput(structure, persona);
  mkdirSync(analogyDir(dir), { recursive: true });
  startDetachedJobSupervisor(analogyDir(dir), {
    units: [{ id: ANALOGY_UNIT, prompt: paragraphPlanUnitPrompt(row, input), input }],
    command: b.binary.path, commandVersion: b.binary.version, model: b.model, outputFormat: b.outputFormat,
    rows: { compose: { id: ANALOGY_ROW, table: relFromRepo(PARAGRAPH_PLAN_TABLE) } },
    callLimitS: b.callLimitS, unitRounds: b.unitRounds, stallS: b.stallS, heartbeatMs: b.heartbeatMs, recordArray: false,
    validator: { module: "src/paragraph-plan-analogy.mjs", export: "validateAnalogyMapping", inputs: { structure } },
  });
}

// The opening step's end: the mapping written and the Leg job started, or `{ stopped: lines }`.
function finishAnalogyJob(dir) {
  const job = readReaderPathJob(analogyDir(dir));
  const u = job && (job.units || [])[0];
  if (!job || job.state !== "done" || !u || u.status !== "done" || !u.candidate) {
    const last = u && Array.isArray(u.refusals) && u.refusals.length ? u.refusals[u.refusals.length - 1]
      : (u && u.failure && u.failure.stderr_tail) || (job && job.failure && job.failure.note) || (u ? u.status : "no unit");
    const start = JSON.parse(readFileSync(join(dir, START_FILE), "utf8"));
    return { stopped: [`ParagraphPlan stopped: the Analogy Mapping ended ${job ? job.state : "with no job record"} before any Leg `
      + `was planned, and the Brief at ${start.brief} is unchanged — nothing was written beside it.`,
      `  Analogy Mapping: ${String(last).split("\n").join(" ")}`,
      "  Next: run /paragraph-plan on the same Brief again; it chooses the Analogy Mapping first."] };
  }
  writeAnalogy(dir, analogyRecord(u.candidate));
  startLegJob(dir, JSON.parse(readFileSync(join(dir, LEG_JOB_FILE), "utf8")));
  return {};
}

// ---------------------------------------------------------------------------
// THE END OF A JOB. Every Leg done writes the ParagraphPlan file, which is the record of
// the binding too (kogaki#1639); any Leg not done stops the stage naming the Leg and the
// paragraph, and writes nothing beside the Brief.

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

// The paragraphs a stopped unit's refusals name, read off the refusal text the validator
// and the judge write (`Leg <id>, paragraph <n>`); none where none is named, as for a call
// stopped at the per-call limit or a refusal of the whole Leg.
export function stoppedParagraphs(refusal) {
  const named = [...String(refusal || "").matchAll(/paragraph (\d+)/gi)].map((m) => Number(m[1]));
  return [...new Set(named)].filter((n) => n >= 1);
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
    const ps = stoppedParagraphs(last);
    lines.push(`  Leg ${leg.leg_id}${ps.length ? `, paragraph ${ps.join(", ")}` : ""}: ${u.status} after ${u.rounds || 1} round(s) — ${String(last).split("\n").join(" ")}`);
  }
  if (job.failure && job.failure.note && !unfinished.length) lines.push(`  ${job.failure.note}`);
  if (unfinished.length) {
    lines.push(`  Next: run /paragraph-plan on the same Brief again; it plans Leg ${unfinished.map((r) => r.leg.leg_id).join(", ")} only`
      + `${kept.length ? " and carries the kept Legs" : ""}; the Reader Path is not composed again.`);
  }
  return lines;
}

// The Mapping Record's entries from each unit's mapping state (kogaki#1734): one per Leg, its
// structure read and its table grounded.
export function mappingEntries(dir, legs) {
  return legs.flatMap((leg, i) => {
    const state = readMappingState(dir, unitIdFor(i));
    if (!state || (!state.structure && !state.table)) return [];
    return [{ leg_id: leg.leg_id, ...(state.structure ? { structure: state.structure } : {}), ...(state.table ? { table: state.table } : {}) }];
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
  // EACH LEG'S MOVE AND PARAGRAPHS RIDE INTO THE FILE (kogaki#1639, kogaki#1777): the bound Move's id
  // and each paragraph's schema fields, exactly as the validator passed them; the file is the record of
  // the binding.
  const legs = start.legs.map((leg, i) => ({ leg_id: leg.leg_id, move: units[i].candidate.move,
    ...(units[i].candidate.move_forced_by ? { move_forced_by: units[i].candidate.move_forced_by } : {}),
    paragraphs: units[i].candidate.paragraphs }));
  // THE MAPPING RECORD IS WRITTEN WITH THE PLAN (kogaki#1733), and the plan names it by path and
  // digest: each Leg's structure read and table grounded (kogaki#1734).
  const planPath = paragraphPlanPathFor(briefPath);
  const mapping = writeMappingRecord(mappingDirFor(planPath), mappingEntries(dir, start.legs));
  const record = paragraphPlanRecord({ briefPath, briefText, analogy: readAnalogy(dir), legs, mapping });
  writeFileSync(planPath, paragraphPlanRecordText(record));
  writeJson(join(dir, DONE_FILE), { written: relFromRepo(planPath), at: new Date().toISOString(),
    collisions: paragraphPlanCollisions(record.legs, readAxes().axes.map((a) => String(a.id))) });
  return { written: planPath };
}

// ---------------------------------------------------------------------------
// THE VIEW (kogaki#1650): per Leg, its text and the bound Move's takes and leaves; per paragraph, the
// Move's Segments with each Waypoint beside its Segment (kogaki#1701); with a run, the refusals the Leg
// and each paragraph met and the axes they name. A rendering that writes nothing; the plan is read
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

// The refusals of one Leg's unit, each with the paragraphs it names (none: the whole Leg) and the
// judge axes it names. A refusal names its site as `Leg <id>, paragraph <n>` or opens with
// `paragraph <n>:`.
const REFUSAL_SITE = /(?:^|Leg [^,\s]+, )paragraph (\d+)/gi;
export function legRefusals(job, unitId, axisIds) {
  const u = (job.units || []).find((x) => x.id === unitId);
  return ((u && u.refusals) || []).map((r) => String(r)).map((text) => ({ text: oneLineText(text),
    paragraphs: [...new Set([...text.matchAll(REFUSAL_SITE)].map((m) => Number(m[1])))],
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
    const entry = plan.record.legs[li];
    const move = moves.get(entry.move);
    const segments = (move && move.segments) || [];
    const refusals = run ? legRefusals(run.job, unitIdFor(li), axisIds) : [];
    lines.push("", `## Leg ${leg.leg_id}`, "", `- **Text:** ${oneLineText(leg.text)}`,
      `- **Move:** \`${entry.move}\`${move ? "" : ` — not in the Move library at ${dirOfMoves}`}`,
      `- **Move takes:** ${move ? constraintsText(move.takes) : "(not read)"}`,
      `- **Move leaves:** ${move ? constraintsText(move.leaves) : "(not read)"}`);
    const legWide = refusals.filter((r) => !r.paragraphs.length);
    if (legWide.length) lines.push("", "Refusals in this run naming no paragraph:", ...legWide.map(refusalLine));
    for (const [i, e] of entry.paragraphs.entries()) {
      const pws = e.paragraph_waypoints || [];
      lines.push("", `### Paragraph ${i + 1}`, "", "| Segment | Operation | Relation | Manner | Waypoint |", "|---|---|---|---|---|");
      for (let k = 0; k < Math.max(segments.length, pws.length); k++) {
        const g = segments[k] || {};
        lines.push(`| ${k < segments.length ? k + 1 : "—"} | ${cell(g.operation)} | ${cell(g.relation)} | ${cell(g.manner)} | ${cell(paragraphWaypointText(pws[k]))} |`);
      }
      if (run) {
        const met = refusals.filter((r) => r.paragraphs.includes(i + 1));
        lines.push("", `- **Refusals in this run:** ${met.length ? "" : "none"}`, ...met.map(refusalLine));
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
  // THE OPENING STEP FIRST (kogaki#1778): while the Analogy Mapping runs there is no Leg job to poll.
  while (!readAnalogy(dir)) {
    const a = readReaderPathJob(analogyDir(dir));
    if (a && a.state === "running") {
      if (!supervisorAlive(a.supervisor_pid)) {
        console.log(`ParagraphPlan stopped: the Analogy Mapping's supervisor (pid ${a.supervisor_pid}) is gone while its record still reads running.`);
        return 1;
      }
      if (Date.now() >= until) {
        console.log(`ParagraphPlan job at ${relFromRepo(dir)} — choosing the Analogy Mapping before the first Leg, round ${(a.units[0] || {}).rounds || 1}.`);
        console.log(PARAGRAPH_PLAN_STILL_RUNNING_LINE);
        return 0;
      }
      sleepSync(Math.min(jobHeartbeatMs(), Math.max(0, until - Date.now())));
      continue;
    }
    const r = finishAnalogyJob(dir);
    if (r.stopped) { for (const l of r.stopped) console.log(l); return 1; }
  }
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
      console.log(`ParagraphPlan job started at ${relFromRepo(readerPathJobPath(dir))}, `
        + `${readAnalogy(dir) ? "" : "the Analogy Mapping first, then "}one unit per Leg — run `
        + `\`node src/paragraph-plan.mjs await --brief ${briefPath}\` to poll it.`);
      break;
    }
    case "status": {
      const dir = runDirFor(args, briefPath);
      const job = readReaderPathJob(dir);
      const opening = readAnalogy(dir) ? null : readReaderPathJob(analogyDir(dir));
      if (opening) { console.log(`ParagraphPlan job at ${relFromRepo(dir)} — the Analogy Mapping, ${opening.state}, before the first Leg.`); break; }
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
