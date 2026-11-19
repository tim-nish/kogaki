// paragraph-plan/steps — the three steps of one Leg's job unit (kogaki#1865): the Leg's Senses read by five calls,
// the Move chosen and fitted by code, and one call that writes Points; then the unit ends.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the ParagraphPlan stage
//       specs/spec-draft-pipeline/SPEC.md
//   The Call Record
//       specs/spec-draft-pipeline/SPEC.md
import { judgePrompt, refusalReach } from "../workflow/judge.mjs";
import { bindFlow, readRowTable } from "../workflow/run-record.mjs";
import { writeCallRecord, tableRecord } from "../workflow/call-record.mjs";
import {
  NAME_ROW,
  READINGS,
  chooseMove,
  countPairs,
  fittedSegments,
  loadSenses,
  nameRefusal,
  senseNames,
  sensesText,
} from "./senses.mjs";
import { FLOW, PARAGRAPH_PLAN_TABLE } from "./stage.mjs";
import { POINTS_ROW, pointsInput, tablePointsRefusal } from "./units.mjs";

export const READING = "reading";
export const POINTS = "points";
// An answer refused is asked again once; a reading refused twice stops the Leg.
export const READING_CALLS = 2;

// The record of one Leg, as the plan file writes it, refused naming the place, or null. A `note` rides beside it for
// the status line and never reaches the file.
export const LEG_KEYS = ["leg_id", "move", "fit", "segments", "points", "note"];
export function validateParagraphPlanLeg(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return { error: "the Leg's record is not a map" };
  const extra = Object.keys(record).find((k) => !LEG_KEYS.includes(k));
  return extra ? { error: `the Leg's record carries \`${extra}\`` } : null;
}

// ONE LEG'S STEPS, held by the supervisor (src/workflow/detached-job.mjs) as its declared `mapper` for the job's life.
// `inputs` is `{ legs, sentences, moves, keep }`: the planned Legs in unit order, each Leg's sentences
// (`legSentences`), the Move library's Moves and `paragraph_plan.leg_edge_candidates`. `ctx` is the supervisor's
// `{ runDir, cli, callArgv }`, written onto every Call Record. An act is `{ call }`, `{ done }` or `{ stopped }`.
export class ParagraphPlanLegSteps {
  constructor(inputs, ctx) {
    this.inputs = inputs;
    this.ctx = ctx;
    this.table = readRowTable(PARAGRAPH_PLAN_TABLE);
    const senses = loadSenses();
    this.names = senseNames(senses);
    this.listText = sensesText(senses);
    this.units = new Map();
  }

  grounded() {
    return true;
  }

  bound() {
    return { proceed: true };
  }

  begin(unitId) {
    const m = /^leg-(\d+)$/.exec(String(unitId));
    const i = m ? Number(m[1]) - 1 : -1;
    const leg = (this.inputs.legs || [])[i];
    if (!leg) throw new Error(`the ParagraphPlan has no Leg for unit ${JSON.stringify(unitId)}`);
    this.units.set(unitId, {
      leg,
      sentences: this.inputs.sentences[i],
      phase: READING,
      readings: [],
      history: [],
      calls: 0,
      plan: null,
    });
    return this.call(unitId);
  }

  row(id) {
    return { id, ...this.table[id] };
  }

  call(unitId) {
    const u = this.units.get(unitId);
    u.calls += 1;
    const row = this.row(u.phase === READING ? NAME_ROW : POINTS_ROW);
    const input =
      u.phase === READING
        ? { sentences: u.sentences.map((s) => ({ number: s.number, sentence: s.sentence })), senses: this.listText }
        : pointsInput(u.leg.leg_id, u.sentences, u.plan.segments);
    const held = bindFlow(FLOW);
    let prompt;
    try {
      prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, u.history.length ? u.history : null);
    } finally {
      bindFlow(held);
    }
    const step = u.phase === READING ? `reading-${u.readings.length + 1}` : POINTS;
    u.pending = { row, input, prompt, step };
    return { call: { phase: u.phase, prompt, label: `${step} of Leg ${u.leg.leg_id}, call ${u.calls}` } };
  }

  refusalOf(u, record) {
    return u.phase === READING
      ? nameRefusal(record, u.sentences.length, this.names)
      : tablePointsRefusal(record, u.plan.segments.length);
  }

  // ONE CALL, ANSWERED: `out` is `{ raw, record }`, or `{ raw, unread }` for an answer with no record in it or a
  // call past its limit, or `{ raw, died }`.
  answered(unitId, out) {
    const u = this.units.get(unitId);
    const { row, input, prompt, step } = u.pending;
    const raw = out.died
      ? { group: null, text: out.died }
      : out.unread
        ? { group: "shape", text: out.unread }
        : this.refusalOf(u, out.record);
    const r = raw && raw.text ? (raw.group ? refusalReach(row, raw) : { ...raw, reach: null }) : null;
    writeCallRecord(this.ctx.runDir, `${unitId}/${step}`, u.calls, {
      prompt,
      argv: this.ctx.callArgv,
      cli: this.ctx.cli,
      input,
      row: { row, tables: [tableRecord(PARAGRAPH_PLAN_TABLE)] },
      raw: out.raw,
      answer: out.record ?? undefined,
      refusal: r && {
        group: r.group,
        reach: r.reach,
        text: r.text,
        validator: out.died || out.unread ? null : u.phase === READING ? "nameRefusal" : "tablePointsRefusal",
      },
    });
    const at = `Leg ${u.leg.leg_id}`;
    if (out.died) return { stopped: `${at}: the ${step} call died: ${out.died}` };
    if (u.phase === POINTS) return { done: this.record(u, r ? null : out.record.points, r) };
    if (!r) {
      u.readings.push(out.record);
      u.history = [];
      u.calls = 0;
      return u.readings.length < READINGS ? this.call(unitId) : this.choose(unitId);
    }
    u.history.push({ answer: out.record ?? null, refusal: r.text, group: r.group, reach: r.reach });
    if (u.calls >= READING_CALLS)
      return {
        stopped: `${at}: ${step} of the Leg's Senses was refused ${u.calls} times, and the Leg stops; the last refusal: ${r.text}`,
      };
    return this.call(unitId);
  }

  // THE CHOICE, by code: the Move meeting the most Edges, fitted to the Leg; with no Move a candidate, the Leg's
  // plan carries no Move and no Segments, and no Points call is made.
  choose(unitId) {
    const u = this.units.get(unitId);
    const n = u.sentences.length;
    const counted = countPairs(u.readings, n, this.names, this.inputs.keep);
    const taken = chooseMove(this.inputs.moves, counted, n, this.names);
    if (!taken)
      return {
        done: {
          leg_id: u.leg.leg_id,
          note: `Leg ${u.leg.leg_id}: no Move file is a candidate, since every Move has more Bind targets than the Leg's ${n} sentences — the plan carries no move and no segments`,
        },
      };
    u.plan = {
      leg_id: u.leg.leg_id,
      move: taken.move.id,
      fit: { met: taken.met, compared: taken.compared },
      segments: fittedSegments(taken.move, taken.filling),
    };
    u.phase = POINTS;
    u.history = [];
    u.calls = 0;
    return this.call(unitId);
  }

  record(u, points, refusal) {
    return {
      ...u.plan,
      ...(points ? { points: points.map((p) => ({ segment: p.segment, point: p.point.trim() })) } : {}),
      ...(refusal
        ? {
            note: `Leg ${u.leg.leg_id}: the Points answer was refused and is not asked again, so the plan carries no points — ${refusal.text}`,
          }
        : {}),
    };
  }
}
