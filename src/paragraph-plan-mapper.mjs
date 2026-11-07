// The Mapper in ParagraphPlan (kogaki#1734): inside one Leg's job unit, structure reading on each
// Leg Waypoint's point before the bind call, grounding of one Mapping Table per bound Move after it,
// and the Paragraph Waypoints call, each Move fixed and its table in the input.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Mapper in ParagraphPlan
//       specs/spec-draft-pipeline/SPEC.md
//   The Attempt Record
//       specs/spec-draft-pipeline/SPEC.md
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { judgePrompt, refusalReach } from "./workflow/judge.mjs";
import { REPO, bindFlow } from "./workflow/run-record.mjs";
import { writeAttemptRecord, tableRecord } from "./workflow/attempt-record.mjs";
import { mapperInput, validateMapperAnswer, MAPPER_ATTEMPTS } from "./mapping-playground/sme.mjs";
import { correspondenceInput, correspondenceRefusal } from "./mapping-playground/short.mjs";
import { PLAYGROUND_TABLE } from "./mapping-playground/trial.mjs";
import { boundMoveContract, mappingStatePath } from "./paragraph-plan.mjs";

const FLOW = { lane: "paragraph-plan", label: "ParagraphPlan" };
export const READING_ROW = "sme_map_roles";
export const GROUNDING_ROW = "smp_correspondence";
export const READING = "reading";
export const GROUNDING = "grounding";
const APART = "apart";

const rowOf = (table, id) => ({ id, ...table[id] });
// The Roles with their `context` and `attributes`, the relations and the higher-order relation.
const structureForPlan = (s) => ({ roles: s.roles, relations: s.relations, higher_order: s.higher_order });

// ONE UNIT'S MAPPER, held by the supervisor (src/workflow/detached-job.mjs) for the job's life.
// `inputs` is the units file's `mapper.inputs`: `{ legs, strands, movesDir, persona, planHead }`, `legs`
// the planned Legs in unit order and `strands` one strand text per Leg. `ctx` is the supervisor's
// `{ runDir, cli, callArgv }`, written onto every Attempt Record. An act is `{ call }`, `{ compose }`,
// `{ proceed }` or `{ stopped }`.
export class ParagraphPlanMapper {
  constructor(inputs, ctx) {
    this.inputs = inputs;
    this.ctx = ctx;
    this.table = JSON.parse(readFileSync(join(REPO, PLAYGROUND_TABLE), "utf8"));
    this.units = new Map();
  }

  legOf(unitId) {
    const m = /^leg-(\d+)$/.exec(String(unitId));
    const i = m ? Number(m[1]) - 1 : -1;
    const leg = (this.inputs.legs || [])[i];
    if (!leg) throw new Error(`the ParagraphPlan Mapper has no Leg for unit ${JSON.stringify(unitId)}`);
    return { leg, strand: (this.inputs.strands || [])[i] || leg.leg_id };
  }

  save(unitId) {
    const u = this.units.get(unitId);
    const path = mappingStatePath(this.ctx.runDir, unitId);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify({ leg_id: u.leg.leg_id, structures: u.structures, read_from: u.readFrom, tables: u.tables }, null, 2)}\n`);
  }

  grounded(unitId) {
    const u = this.units.get(unitId);
    return !u || u.stage === "confined" || u.stage === "done";
  }

  // READING FIRST: a Leg Waypoint following an `apart` one reads none and takes its predecessor's structure.
  begin(unitId, input) {
    const { leg, strand } = this.legOf(unitId);
    const ws = leg.waypoints;
    const queue = ws.map((w) => w.waypoint).filter((n) => !(n > 1 && ws[n - 2].case === APART));
    this.units.set(unitId, { leg, strand, input, stage: READING, queue, history: [], attempt: 0,
      structures: {}, readFrom: {}, tables: {}, candidate: null });
    return this.next(unitId);
  }

  // The bind call's answer passed its validator: ground each bound Move, or, once grounded, go on.
  bound(unitId, candidate) {
    const u = this.units.get(unitId);
    if (!u || this.grounded(unitId)) {
      if (u) u.stage = "done";
      return { proceed: true };
    }
    u.stage = GROUNDING;
    u.candidate = candidate;
    u.queue = u.leg.waypoints.map((w) => w.waypoint);
    u.history = [];
    u.attempt = 0;
    return this.next(unitId);
  }

  // The next reading or grounding call, or the call after the last one.
  next(unitId) {
    const u = this.units.get(unitId);
    if (u.stage === READING) {
      for (const [i, w] of u.leg.waypoints.entries()) {
        if (i > 0 && u.leg.waypoints[i - 1].case === APART && u.structures[w.waypoint - 1] && !u.structures[w.waypoint]) {
          u.structures[w.waypoint] = u.structures[w.waypoint - 1];
          u.readFrom[w.waypoint] = w.waypoint - 1;
        }
      }
    }
    if (u.queue.length) return this.call(unitId);
    this.save(unitId);
    if (u.stage === READING) {
      u.stage = "bind";
      return { compose: this.composeAct(u, false) };
    }
    u.stage = "confined";
    return { compose: this.composeAct(u, true) };
  }

  // THE PLAN CALL'S INPUT: each Leg Waypoint carries its structure; once grounded, its bound Move and its table.
  composeAct(u, confined) {
    const leg = u.input.leg_you_must_plan;
    const waypoints = leg.waypoints.map((w) => {
      const s = u.structures[w.waypoint];
      const t = u.tables[w.waypoint];
      return { ...w, ...(s ? { structure: structureForPlan(s) } : {}),
        ...(confined && t ? { move: t.move, table: { base: t.base, correspondences: t.correspondences } } : {}) };
    });
    const input = { ...u.input, leg_you_must_plan: { ...leg, waypoints } };
    return { prompt: `${this.inputs.planHead}${JSON.stringify(input, null, 2)}`, input };
  }

  callInput(u, n) {
    const w = u.leg.waypoints[n - 1];
    if (u.stage === READING) {
      return { row: rowOf(this.table, READING_ROW), input: mapperInput({ cite: u.strand, proposition: w.point }, this.inputs.persona) };
    }
    const move = u.candidate.waypoints[n - 1].move;
    const prior = u.leg.waypoints.slice(0, n - 1).map((p) => u.tables[p.waypoint]).filter(Boolean)
      .map((t) => ({ move: t.move, base: t.base, correspondences: t.correspondences }));
    return { row: rowOf(this.table, GROUNDING_ROW),
      input: correspondenceInput(u.structures[n], this.inputs.persona, boundMoveContract(move, this.inputs.movesDir), w.case, prior), move };
  }

  call(unitId) {
    const u = this.units.get(unitId);
    const n = u.queue[0];
    u.attempt += 1;
    const { row, input } = this.callInput(u, n);
    const held = bindFlow(FLOW);
    let prompt;
    try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, u.history.length ? u.history : null); } finally { bindFlow(held); }
    u.pending = { n, row, input, prompt };
    return { call: { phase: u.stage, prompt, label: `${u.stage} at Leg Waypoint ${n}, attempt ${u.attempt}` } };
  }

  // ONE READING OR GROUNDING CALL, ANSWERED: `out` is `{ raw, record }`, or `{ raw, unread }` for an answer
  // with no record in it or a call past its limit, or `{ raw, died }`.
  answered(unitId, out) {
    const u = this.units.get(unitId);
    const { n, row, input, prompt } = u.pending;
    const validator = u.stage === READING ? "validateMapperAnswer" : "correspondenceRefusal";
    const raw = out.died ? { group: null, text: out.died } : out.unread ? { group: "shape", text: out.unread }
      : u.stage === READING ? this.readingRefusal(out.record, u, n) : correspondenceRefusal(out.record, u.structures[n]);
    const r = raw && raw.text ? (raw.group ? refusalReach(row, raw) : { ...raw, reach: null }) : null;
    writeAttemptRecord(this.ctx.runDir, `${unitId}/${u.stage}/waypoint-${n}`, u.attempt, { prompt, argv: this.ctx.callArgv, cli: this.ctx.cli, input,
      row: { row, tables: [tableRecord(PLAYGROUND_TABLE)] }, raw: out.raw, answer: out.record ?? undefined,
      refusal: r && { group: r.group, reach: r.reach, text: r.text, validator: out.died || out.unread ? null : validator } });
    const at = `Leg ${u.leg.leg_id}, Waypoint ${n}`;
    if (out.died) return { stopped: `${at}: the ${u.stage} call died: ${out.died}` };
    if (!r) {
      if (u.stage === READING) u.structures[n] = out.record;
      else u.tables[n] = { move: u.candidate.waypoints[n - 1].move, case: u.leg.waypoints[n - 1].case, base: out.record.base, correspondences: out.record.correspondences };
      u.queue.shift();
      u.history = [];
      u.attempt = 0;
      this.save(unitId);
      return this.next(unitId);
    }
    u.history.push({ answer: out.record ?? null, refusal: r.text, group: r.group, reach: r.reach });
    if (r.undeclared || r.reach === "stop" || u.attempt >= MAPPER_ATTEMPTS) {
      const why = r.undeclared ? `its refusal names the group ${JSON.stringify(r.group)}, which the \`${row.id}\` row does not declare`
        : r.reach === "stop" ? `its refusal of group ${JSON.stringify(r.group)} has reach stop` : `the \`${row.id}\` answer was refused ${u.attempt} times`;
      return { stopped: `${at}: ${u.stage} stopped — ${why}; the last refusal: ${r.text}` };
    }
    return this.call(unitId);
  }

  readingRefusal(record, u, n) {
    const v = validateMapperAnswer(record, { cite: u.strand, proposition: u.leg.waypoints[n - 1].point });
    return v.text ? v : null;
  }
}

