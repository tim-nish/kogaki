// The Mapper in ParagraphPlan (kogaki#1734): inside one Leg's job unit, structure reading on the Leg's relation
// before the bind call, grounding of one Mapping Table for the Leg's bound Move after it, and the Waypoints call,
// the Move fixed and its table in the input. The Leg is the unit (kogaki#1777): one reading and one grounding per Leg.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Mapper in ParagraphPlan
//       specs/spec-draft-pipeline/SPEC.md
//   The Call Record
//       specs/spec-draft-pipeline/SPEC.md
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { judgePrompt, refusalReach } from "./workflow/judge.mjs";
import { REPO, bindFlow } from "./workflow/run-record.mjs";
import { writeCallRecord, tableRecord } from "./workflow/call-record.mjs";
import { mapperInput, validateMapperAnswer, MAPPER_CALLS } from "./mapping-playground/sme.mjs";
import { correspondenceInput, correspondenceRefusal } from "./mapping-playground/short.mjs";
import { PLAYGROUND_TABLE } from "./mapping-playground/trial.mjs";
import { boundMoveContract, mappingStatePath } from "./paragraph-plan.mjs";
import { analogyFor, withAnalogy, groundedBaseRefusal } from "./paragraph-plan-analogy.mjs";

const FLOW = { lane: "paragraph-plan", label: "ParagraphPlan" };
export const READING_ROW = "sme_map_roles";
export const GROUNDING_ROW = "smp_correspondence";
export const READING = "reading";
export const GROUNDING = "grounding";

const rowOf = (table, id) => ({ id, ...table[id] });
// The Roles with their `context` and `attributes`, the relations and the higher-order relation.
const structureForPlan = (s) => ({ roles: s.roles, relations: s.relations, higher_order: s.higher_order });

// ONE UNIT'S MAPPER, held by the supervisor (src/workflow/detached-job.mjs) for the job's life.
// `inputs` is the units file's `mapper.inputs`: `{ legs, strands, movesDir, persona, planHead }`, `legs`
// the planned Legs in unit order and `strands` one strand text per Leg. `ctx` is the supervisor's
// `{ runDir, cli, callArgv }`, written onto every Call Record. An act is `{ call }`, `{ compose }`,
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
    writeFileSync(path, `${JSON.stringify({ leg_id: u.leg.leg_id, ...(u.structure ? { structure: u.structure } : {}),
      ...(u.table ? { table: u.table } : {}) }, null, 2)}\n`);
  }

  grounded(unitId) {
    const u = this.units.get(unitId);
    return !u || u.stage === "confined" || u.stage === "done";
  }

  // READING FIRST: the Leg's relation, once.
  begin(unitId, input) {
    const { leg, strand } = this.legOf(unitId);
    this.units.set(unitId, { leg, strand, input, stage: READING, pending_calls: 1, history: [], calls: 0,
      structure: null, table: null, candidate: null });
    return this.next(unitId);
  }

  // The bind call's answer passed its validator: ground the Leg's bound Move, or, once grounded, go on.
  bound(unitId, candidate) {
    const u = this.units.get(unitId);
    if (!u || this.grounded(unitId)) {
      if (u) u.stage = "done";
      return { proceed: true };
    }
    u.stage = GROUNDING;
    u.candidate = candidate;
    u.contract = null;
    u.pending_calls = 1;
    u.history = [];
    u.calls = 0;
    return this.next(unitId);
  }

  // The next reading or grounding call, or the call after the last one.
  next(unitId) {
    const u = this.units.get(unitId);
    if (u.pending_calls) return this.call(unitId);
    this.save(unitId);
    if (u.stage === READING) {
      u.stage = "bind";
      return { compose: this.composeAct(u, false) };
    }
    u.stage = "confined";
    return { compose: this.composeAct(u, true) };
  }

  // THE PLAN CALL'S INPUT: the Leg carries its structure; once grounded, its bound Move and its table.
  composeAct(u, confined) {
    const leg = u.input.leg_you_must_plan;
    const t = u.table;
    const planned = { ...leg, ...(u.structure ? { structure: structureForPlan(u.structure) } : {}),
      ...(confined && t ? { move: t.move, table: { base: t.base, correspondences: t.correspondences } } : {}) };
    const input = confined && t ? withAnalogy({ ...u.input, leg_you_must_plan: planned }, this.contractOf(u), this.inputs.analogy)
      : { ...u.input, leg_you_must_plan: planned };
    return { prompt: `${this.inputs.planHead}${JSON.stringify(input, null, 2)}`, input };
  }

  // THE PROPOSITION THE MAPPER READS (kogaki#1777): the Leg's `text`, its relation's `holds` with each
  // Role named (kogaki#1772); the Claims it is `from`; the Roles it stands between, each with its
  // `context`; and what the Legs before it state, as what the reader has been told. It reads no
  // reader-state field: the last is derived from the Leg order (`toldBefore`).
  proposition(leg) {
    const lines = [String(leg.text)];
    if ((leg.claims || []).length) lines.push("The Claims it is read from:", ...leg.claims.map((g) => `- ${g.strand}: ${g.proposition}`));
    if ((leg.roles || []).length) lines.push("The Roles it stands between:", ...leg.roles.map((r) => `- ${r.name || r.id}: ${r.context}`));
    if ((leg.the_reader_has_been_told || []).length) {
      lines.push("What the Legs before it state:", ...leg.the_reader_has_been_told.map((x) => `- ${x.leg_id}: ${x.text}`));
    }
    return lines.join("\n");
  }

  callInput(u) {
    if (u.stage === READING) {
      return { row: rowOf(this.table, READING_ROW), input: mapperInput({ cite: u.strand, proposition: this.proposition(u.leg) }, this.inputs.persona) };
    }
    const move = u.candidate.move;
    const contract = boundMoveContract(move, this.inputs.movesDir);
    return { row: rowOf(this.table, GROUNDING_ROW),
      input: withAnalogy(correspondenceInput(u.structure, this.inputs.persona, contract, undefined, []), contract, this.inputs.analogy), move };
  }

  // The bound Move's contract, read once per unit.
  contractOf(u) {
    if (!u.contract) u.contract = boundMoveContract(u.candidate.move, this.inputs.movesDir);
    return u.contract;
  }

  // A GROUNDING FOR AN ANALOGY MOVE NAMES THE ARTICLE'S BASE DOMAIN (kogaki#1778).
  groundingRefusal(record, u) {
    const r = correspondenceRefusal(record, u.structure);
    if (r) return r;
    const a = analogyFor(this.contractOf(u), this.inputs.analogy);
    const off = a ? groundedBaseRefusal(record, a) : null;
    return off ? { group: "base", text: off } : null;
  }

  call(unitId) {
    const u = this.units.get(unitId);
    u.calls += 1;
    const { row, input } = this.callInput(u);
    const held = bindFlow(FLOW);
    let prompt;
    try { prompt = judgePrompt(row, JSON.stringify(input, null, 2), input, u.history.length ? u.history : null); } finally { bindFlow(held); }
    u.pending = { row, input, prompt };
    return { call: { phase: u.stage, prompt, label: `${u.stage} of Leg ${u.leg.leg_id}, call ${u.calls}` } };
  }

  // ONE READING OR GROUNDING CALL, ANSWERED: `out` is `{ raw, record }`, or `{ raw, unread }` for an answer
  // with no record in it or a call past its limit, or `{ raw, died }`.
  answered(unitId, out) {
    const u = this.units.get(unitId);
    const { row, input, prompt } = u.pending;
    const validator = u.stage === READING ? "validateMapperAnswer" : "correspondenceRefusal";
    const raw = out.died ? { group: null, text: out.died } : out.unread ? { group: "shape", text: out.unread }
      : u.stage === READING ? this.readingRefusal(out.record, u) : this.groundingRefusal(out.record, u);
    const r = raw && raw.text ? (raw.group ? refusalReach(row, raw) : { ...raw, reach: null }) : null;
    writeCallRecord(this.ctx.runDir, `${unitId}/${u.stage}`, u.calls, { prompt, argv: this.ctx.callArgv, cli: this.ctx.cli, input,
      row: { row, tables: [tableRecord(PLAYGROUND_TABLE)] }, raw: out.raw, answer: out.record ?? undefined,
      refusal: r && { group: r.group, reach: r.reach, text: r.text, validator: out.died || out.unread ? null : validator } });
    const at = `Leg ${u.leg.leg_id}`;
    if (out.died) return { stopped: `${at}: the ${u.stage} call died: ${out.died}` };
    if (!r) {
      if (u.stage === READING) u.structure = out.record;
      else u.table = { move: u.candidate.move, base: out.record.base, correspondences: out.record.correspondences };
      u.pending_calls = 0;
      u.history = [];
      u.calls = 0;
      this.save(unitId);
      return this.next(unitId);
    }
    u.history.push({ answer: out.record ?? null, refusal: r.text, group: r.group, reach: r.reach });
    if (r.undeclared || r.reach === "stop" || u.calls >= MAPPER_CALLS) {
      const why = r.undeclared ? `its refusal names the group ${JSON.stringify(r.group)}, which the \`${row.id}\` row does not declare`
        : r.reach === "stop" ? `its refusal of group ${JSON.stringify(r.group)} has reach stop` : `the \`${row.id}\` answer was refused ${u.calls} times`;
      return { stopped: `${at}: ${u.stage} stopped — ${why}; the last refusal: ${r.text}` };
    }
    return this.call(unitId);
  }

  readingRefusal(record, u) {
    const v = validateMapperAnswer(record, { cite: u.strand, proposition: this.proposition(u.leg) });
    return v.text ? v : null;
  }
}

