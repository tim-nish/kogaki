// paragraph-plan/axes — the planner and judge rows' criteria, the judge's axes and the validation of a Leg's plan record and the judge's verdict. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MOVE_RECORD_EXT,
  joinRefusal,
  loadMoveIds,
  moveContract,
  paragraphCountRefusal,
  paragraphWaypointsRefusal,
  paragraphsPerLeg,
  retiredPlanKeyRefusal,
  undeclaredKey,
} from "../compose.mjs";
import {
  PLAN_SCHEMA_KEYS,
  RETIRED_PLAN_KEYS,
  paragraphLegRefusal,
  paragraphSchemaRefusal,
} from "../compose/record.mjs";
import { correspondenceVocabularyFailures } from "../mapping-playground/rbs.mjs";
import { judgePrompt } from "../workflow/judge.mjs";
import { bindFlow } from "../workflow/run-record.mjs";
import { withAnalogy } from "../paragraph-plan-analogy.mjs";
import { FLOW, NO_PARAGRAPH_MOVE_FITS, PARAGRAPH_MOVE_ROLES, PARAGRAPH_PLAN_AXES } from "./stage.mjs";
import { legForUnit, renderRowHead } from "./units.mjs";

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
  return `\n${judgmentPointOf(prompt)}`
    .split("\n")
    .map((l) => l.match(CRITERION_LINE))
    .filter(Boolean)
    .map((m) => ({ name: m[1], text: m[2] }));
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
  if (!Number.isInteger(wordsMax) || wordsMax <= 0)
    return ["src/paragraph-plan-workflow.json's `criteria` declares no positive `words_max`"];
  if (!Number.isInteger(pointMax) || pointMax <= 0)
    return ["src/paragraph-plan-workflow.json's `criteria` declares no positive `point_words_max`"];
  const fails = [];
  for (const [name, text] of Object.entries(table.shared_text || {})) {
    if (!oneSentence(String(text))) fails.push(`shared text ${name} is not one sentence`);
  }
  const named = {
    paragraph_plan_unit: bound.paragraph_plan_unit,
    paragraph_plan_judge_unit: readAxes().axes.map((a) => String(a.id)),
  };
  for (const key of ["paragraph_plan_unit", "paragraph_plan_judge_unit"]) {
    const want = Array.isArray(named[key]) ? named[key] : [];
    const prompt = renderRowHead({ id: key, ...table[key] });
    const n = words(judgmentPointOf(prompt));
    if (n > pointMax) fails.push(`${key}'s rendered judgment point runs ${n} words, over the bound of ${pointMax}`);
    const got = criteriaOf(prompt);
    if (!want.length) fails.push(`\`criteria\` names no criterion for ${key}`);
    if (JSON.stringify(got.map((c) => c.name)) !== JSON.stringify(want)) {
      fails.push(
        `${key} carries the criteria ${JSON.stringify(got.map((c) => c.name))}, not the ${JSON.stringify(want)} \`criteria\` names`,
      );
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
const AND_CLAUSE_VERBS =
  "is|are|was|were|has|have|holds?|states?|carries|carry|gives?|leaves?|runs?|bears?|stands?|survives?|performs?|names?|says?|takes?";
const AND_CLAUSE = new RegExp(`,\\s*and\\b|\\band\\s+(?:\\S+\\s+){0,2}(?:${AND_CLAUSE_VERBS})\\b`, "i");

export function axisSentenceRefusal(sentence) {
  const t = String(sentence || "").trim();
  if (!t) return "carries no sentence";
  if (/[;:]/.test(t)) return "carries `;` or `:`";
  if (t.includes(" — ")) return "carries ` — `";
  if (!oneSentence(t)) return "is not one sentence";
  if (AND_CLAUSE.test(t)) return 'joins a second clause with "and"';
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
  if (Object.hasOwn(e, "move_takes")) {
    leg.bound_move.takes = e.move_takes;
    return input;
  }
  if (Object.hasOwn(e, "move_leaves")) {
    leg.bound_move.leaves = e.move_leaves;
    return input;
  }
  const p = leg.paragraphs[Number(e.paragraph) - 1];
  if (!p) throw new Error(`record "${name}" edits paragraph ${e.paragraph}, which "${r.from}" does not carry`);
  if (Object.hasOwn(e, "join")) {
    p.join = e.join;
    return input;
  }
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
        try {
          axisRecord(registry, n);
        } catch (e) {
          fails.push(`axis ${id}: ${e.message}`);
        }
        if (kind === "defect" && !Number.isInteger((registry.records[n] || {}).at_paragraph))
          fails.push(`axis ${id}: defect "${n}" names no \`at_paragraph\``);
      }
    }
    const j = a.justified_by;
    if (!j || !j.date || !j.run || !j.rates)
      fails.push(`axis ${id} carries no \`justified_by\` bench run (date, run, rates)`);
  }
  return fails;
}

export function paragraphPlanUnitPrompt(row, input) {
  const held = bindFlow(FLOW);
  try {
    return judgePrompt(row, JSON.stringify(input, null, 2), input, null);
  } finally {
    bindFlow(held);
  }
}

export const UNIT_KEYS = ["version", "leg_id", "move", "rationale", "paragraphs"];
// THE PARAGRAPH IS THE PLAN FILE'S PARAGRAPH (kogaki#1639, kogaki#1777): its schema fields, its join and
// its Waypoints; the Move is the Leg's.
export const UNIT_PARAGRAPH_KEYS = ["paragraph", ...PLAN_SCHEMA_KEYS, "join", "paragraph_waypoints"];
const words = (s) => String(s).trim().split(/\s+/).filter(Boolean).length;

// THE BOUND MOVE'S ROLES, OR A FATAL STOP (kogaki#1378). THROWS: inside the job the
// supervisor's catch-all ends it `other` with this sentence, which names the Move and the
// role. Nothing here defaults a missing role.
export function boundMoveContract(moveId, movesDir) {
  const c = moveContract(moveId, movesDir);
  if (c.error) {
    throw new Error(
      `ParagraphPlan stops: the paragraph Move "${moveId}" was bound and cannot be read for the roles ` +
        `this stage needs (${PARAGRAPH_MOVE_ROLES.join(", ")}) — ${c.error}`,
    );
  }
  // `breaks` arrives as a list of prose tests and `segments` as a list of Segments (kogaki#1413).
  const filled = (v) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim() !== "");
  for (const role of PARAGRAPH_MOVE_ROLES) {
    if (!filled(c[role])) {
      throw new Error(
        `ParagraphPlan stops: the paragraph Move "${moveId}" was bound and does not fill the role ` +
          `\`${role}\` (${movesDir}/${moveId}${MOVE_RECORD_EXT}) — this stage judges ` +
          "that the Waypoints survive its breaks, and orders them by its segments, so nothing is defaulted. " +
          "Repair the Move record under its own issue.",
      );
    }
  }
  return c;
}

// The bound on a Leg's paragraphs the unit is held to: the start's, or the setting's.
export const boundOf = (inputs) => (Number.isInteger(inputs && inputs.bound) ? inputs.bound : paragraphsPerLeg());

// THE FIRST CALL'S ANSWER, READ BACK (the declared validator). Returns `{ error }` — a
// refusal of the Round, put verbatim into the next — or `{}`. A Leg no Move fits is the
// refusal `no_paragraph_move_fits`, naming the Leg. A refusal that names its paragraph
// carries it as `sites`, the place the retry is scoped to (kogaki#1642); a refusal of the
// whole Leg -- its Move, its paragraph count, its Leg-wide rules -- carries none. A paragraph
// refusal carries every failure of every paragraph as `failures`, each `{ site, text }`, one line each in `error` (kogaki#1813).
export function validateParagraphPlanUnit(record, inputs, unitId) {
  const leg = legForUnit(inputs, unitId);
  const r = record || {};
  const at = `Leg ${leg.leg_id}`;
  const retired = retiredPlanKeyRefusal(r, `${at}: the plan record`);
  if (retired) return { error: retired };
  if (Object.hasOwn(r, "waypoints")) {
    return {
      error: `${at}: the plan record carries \`waypoints\` — the Leg is the unit (kogaki#1777): it binds one \`move\` and carries its \`paragraphs\``,
    };
  }
  const extra = undeclaredKey(r, UNIT_KEYS);
  if (extra)
    return {
      error: `${at}: the plan record carries \`${extra}\`, which it does not declare — it carries ${UNIT_KEYS.join(", ")}`,
    };
  if (String(r.version) !== "1")
    return { error: `${at}: the plan record's version is ${JSON.stringify(r.version)}, not "1"` };
  if (r.leg_id !== leg.leg_id)
    return { error: `${at}: the plan record names leg ${JSON.stringify(r.leg_id)}, not ${leg.leg_id}` };
  if (typeof r.rationale !== "string" || words(r.rationale) < 4)
    return { error: `${at}: the plan record's \`rationale\`, why its Move fits this Leg, is under four words` };
  if (r.move === null)
    return { error: noParagraphMoveFitsRefusal([{ leg_id: leg.leg_id, text: leg.text, why: r.rationale.trim() }]) };
  const library = loadMoveIds(inputs.movesDir);
  if (library.error) throw new Error(library.error);
  if (typeof r.move !== "string" || r.move.trim() === "") {
    return {
      error: `${at}: carries no \`move\` — a Leg names the one Move bound to it by id, or null where no Move fits (kogaki#1777)`,
    };
  }
  if (!library.ids.has(r.move))
    return {
      error: `${at}: binds move ${JSON.stringify(r.move)}, which names no Move in the library at ${inputs.movesDir}`,
    };
  if (!Array.isArray(r.paragraphs)) return { error: `${at}: the plan record carries no \`paragraphs\` list` };
  const count = paragraphCountRefusal(r.paragraphs.length, boundOf(inputs), at);
  if (count) return { error: count };
  const contract = boundMoveContract(r.move, inputs.movesDir);
  const table = groundedTable(inputs, unitId);
  if (table && r.move !== table.move) {
    return {
      error: `${at}: the plan binds ${JSON.stringify(r.move)}, and the Leg's Mapping Table was grounded for "${table.move}" — the Move is bound before grounding and kept after it`,
    };
  }
  const failures = r.paragraphs.flatMap((e, i) =>
    [
      ...paragraphFailures(e, i, leg, r.paragraphs.slice(0, i), contract, r.move, `${at}, paragraph ${i + 1}`),
      ...(table && isMapEntry(e) ? vocabularyFailures(e, i, table, `${at}, paragraph ${i + 1}`) : []),
    ].map((text) => ({ site: i + 1, text })),
  );
  if (failures.length) {
    return {
      error: failures.map((f) => f.text).join("\n"),
      failures,
      sites: [...new Set(failures.map((f) => f.site))],
    };
  }
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
function groundedTable(inputs, unitId) {
  return inputs.mapping ? (readMappingState(inputs.runDir, unitId) || {}).table || null : null;
}

function vocabularyFailures(e, i, table, atP) {
  const points = Array.isArray(e.paragraph_waypoints) ? e.paragraph_waypoints : [];
  return correspondenceVocabularyFailures(points, table, [], i + 1).map((v) => {
    const id = (/carries the Role id "([^"]+)"/.exec(v) || [])[1];
    const c = id && table.correspondences.find((x) => x.role === id);
    return `${atP}: ${v}${c ? `; the Role "${id}" reads "${c.expression}" in the Leg's Mapping Table` : ""}`;
  });
}

const isMapEntry = (e) => Boolean(e) && typeof e === "object" && !Array.isArray(e);

// ONE PARAGRAPH'S RULES, against the paragraphs before it: the Leg call's validator and the site
// validator read a paragraph by this one function (kogaki#1642). Every failure, `[]` where it passes (kogaki#1813).
function paragraphFailures(e, i, leg, prior, contract, moveId, atP) {
  if (!isMapEntry(e)) return [`${atP}: the paragraph is not a map`];
  const out = [];
  const add = (why) => {
    if (why) out.push(why);
  };
  // EACH KEY IS NAMED ONCE (kogaki#1813): the schema rule reads the paragraph without the keys named here.
  const named = new Set();
  const retired = retiredPlanKeyRefusal(e, `${atP}: the paragraph`);
  if (retired) {
    add(retired);
    for (const k of RETIRED_PLAN_KEYS) named.add(k);
  }
  if (Object.hasOwn(e, "why")) {
    add(
      `${atP}: the paragraph carries \`why\`, retired (kogaki#1639) — why this paragraph comes here is its \`rationale\``,
    );
    named.add("why");
  }
  if (Object.hasOwn(e, "move")) {
    add(`${atP}: the paragraph carries \`move\` — the Leg binds one Move for all its paragraphs (kogaki#1777)`);
    named.add("move");
  }
  const rest = Object.fromEntries(Object.entries(e).filter(([key]) => !named.has(key)));
  const k = undeclaredKey(rest, UNIT_PARAGRAPH_KEYS);
  if (k)
    add(
      `${atP}: the paragraph carries \`${k}\`, which it does not declare — it carries paragraph, ${PLAN_SCHEMA_KEYS.join(", ")}, join (on every paragraph after the first) and paragraph_waypoints`,
    );
  if (e.paragraph !== i + 1)
    add(`${atP}: the paragraph is numbered ${JSON.stringify(e.paragraph)} — paragraphs are numbered in order from 1`);
  // THE PARAGRAPH'S SCHEMA, BY THE PLAN READER'S OWN RULE (kogaki#1639): so the record this
  // stage writes is one every later read accepts, and a refusal names the field here first.
  const schema = paragraphSchemaRefusal(rest, i, leg, prior, atP);
  add(schema);
  if (!(schema && schema.includes("`rationale`")) && (typeof e.rationale !== "string" || words(e.rationale) < 4))
    add(`${atP}: \`rationale\` is under four words`);
  // ONE PER SEGMENT, COUNTED HERE AND NOT JUDGED (kogaki#1533).
  const n = Array.isArray(e.paragraph_waypoints) ? e.paragraph_waypoints.length : 0;
  if (n !== contract.segments.length) {
    add(
      `${atP}: carries ${n} Waypoint(s) for the ${contract.segments.length} Segment(s) of the Leg's bound Move ` +
        `"${moveId}" — one Waypoint per Segment, in the Move's order`,
    );
  }
  // THE JOIN, BY THE PLAN READER'S OWN RULE (kogaki#1411): so the file this stage writes is
  // one /draft reads. Whether it takes up what the previous paragraph left is the judge's.
  add(joinRefusal(e, i, atP));
  add(paragraphWaypointsRefusal(e.paragraph_waypoints, e.materials, atP));
  return out;
}

export function noParagraphMoveFitsRefusal(failures) {
  return [
    `NO PARAGRAPH MOVE FITS THESE LEGS (${NO_PARAGRAPH_MOVE_FITS}):`,
    ...failures.map((f) => `Leg ${f.leg_id} ("${f.text}"): you wrote: "${f.why}"`),
    "There is no fallback paragraph shape. Bind again: read each Move's takes against what the reader has been told " +
      "when this Leg begins once more, with the Leg's relation in view.",
  ].join("\n");
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
      bound_move: withAnalogy(
        { takes: c.takes, leaves: c.leaves, segments: c.segments, breaks: c.breaks },
        inputs.analogy,
      ),
      paragraphs: judged.map((n) => {
        const e = record.paragraphs[n - 1];
        return {
          paragraph: n,
          ...(joinOnly.has(n) ? { judge_its_join_only: true } : {}),
          ...(n > 1 ? { join: e.join } : {}),
          paragraph_waypoints: e.paragraph_waypoints,
        };
      }),
    },
    ...(scope
      ? {
          standing_paragraphs: record.paragraphs.map((e, i) => ({
            paragraph: i + 1,
            ...(i > 0 ? { join: e.join } : {}),
            paragraph_waypoints: e.paragraph_waypoints,
          })),
        }
      : {}),
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
  if (String(v.version) !== "1")
    return { error: `the verdict record's version is ${JSON.stringify(v.version)}, not "1"` };
  if (v.leg_id !== leg.leg_id)
    return { error: `the verdict record names leg ${JSON.stringify(v.leg_id)}, not ${leg.leg_id}` };
  if (!Array.isArray(v.verdicts) || v.verdicts.length !== want.length) {
    return {
      error:
        `the verdict record carries ${Array.isArray(v.verdicts) ? v.verdicts.length : "no"} verdict(s) for the ` +
        `${want.length} paragraph(s) it judges — one per paragraph, in order`,
    };
  }
  const failures = [];
  for (const [i, x] of v.verdicts.entries()) {
    const n = want[i];
    if (!x || typeof x !== "object" || x.paragraph !== n)
      return { error: `verdict ${i + 1} does not name paragraph ${n}` };
    if (!PARAGRAPH_PLAN_VERDICTS.includes(x.verdict))
      return {
        error: `paragraph ${n}'s verdict ${JSON.stringify(x.verdict)} is outside ${PARAGRAPH_PLAN_VERDICTS.join(" | ")}`,
      };
    if (typeof x.why !== "string" || words(x.why) < 4) return { error: `paragraph ${n}'s \`why\` is under four words` };
    if (x.verdict === "does-not-fit") {
      const f = { leg_id: leg.leg_id, paragraph: n, why: x.why.trim() };
      failures.push({ ...f, ...(BINDING_REFUSAL.test(f.why) ? {} : { site: n }), refusal: judgeSiteRefusal(f) });
    }
  }
  if (!failures.length) return {};
  const refusal = [
    "THE WAYPOINTS WERE JUDGED, AND THESE DO NOT FIT THE MOVE BOUND TO THEIR LEG:",
    ...failures.map((f) => f.refusal),
    "Generate the Waypoints again so that the bound Move's takes are each met by what the reader has been told " +
      "when the Leg begins, its leaves are each taken up by a later paragraph or left for the next Leg, they follow the " +
      "Move's order (its segments), " +
      "each perform its own Segment's operation and stand in that Segment's relation, " +
      "and survive each of its breaks, or bind another Move; and write each join so that it takes up what the " +
      "previous paragraph leaves, restates no Waypoint, names no noun phrase " +
      "of either paragraph's Waypoints, brings no case, example or term of its own and states no effect " +
      "on the reader.",
  ].join("\n");
  // A BINDING REFUSAL REOPENS THE LEG: the Round is refused whole, and no site is named.
  return { refusal, failures: failures.some((f) => f.site === undefined) ? [] : failures };
}

// One paragraph's refusal by the judge, the sentence a site retry is handed verbatim.
export function judgeSiteRefusal(f) {
  return `Leg ${f.leg_id}, paragraph ${f.paragraph}: the judge wrote: "${f.why}"`;
}
