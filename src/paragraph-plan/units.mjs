// paragraph-plan/units — one job unit per Leg: the Leg's plan input, its told-before terms and its Segments. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
import { introducedMeaning, parseIntroducesEntry, personaPriorKnowledgeLine } from "../compose.mjs";
import { judgePrompt } from "../workflow/judge.mjs";
import { bindFlow } from "../workflow/run-record.mjs";
import { FLOW } from "./stage.mjs";

// ---------------------------------------------------------------------------
// ONE UNIT PER LEG. The unit's id is `leg-<n>`, its place in the Reader Path, so a file
// name never carries a Leg id; `inputs.legs` is the Legs in that order.

export function unitIdFor(i) {
  return `leg-${i + 1}`;
}
export function legForUnit(inputs, unitId) {
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
    journeys: (leg.journeys || [])
      .filter((j) => j && typeof j === "object")
      .map((j) => ({ strand: j.strand, use: j.use })),
    introduces: introducedTerms(leg.introduces),
  };
}

// WHAT THE READER HAS BEEN TOLD WHEN LEG n BEGINS (kogaki#1777): the relation each Leg before it
// states, in Leg order, as `{ leg_id, relation, text }`. Derived from the order alone; the Brief
// carries no reader state (kogaki#1699), and nothing here reads or writes one. `n` is 0-based.
export function toldBefore(legs, n) {
  return legs.slice(0, n).map((l) => ({
    leg_id: l.leg_id,
    ...(typeof l.relation === "string" ? { relation: l.relation } : {}),
    text: String(l.text ?? "").trim(),
  }));
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
  return (structure.roles || [])
    .filter((r) => ids.has(r.id))
    .map((r) => ({ id: r.id, ...(typeof r.name === "string" ? { name: r.name } : {}), context: r.context ?? "" }));
}

// The planLeg options for every Leg of a Brief: what the Legs before it state, the Roles of its
// relation and the Persona's prior-knowledge line.
export function planLegOptions(legs, structure, priorKnowledge) {
  return legs.map((leg, i) => ({
    told: toldBefore(legs, i),
    roles: legRoles(structure, leg.relation),
    leaves: [],
    priorKnowledge,
  }));
}

// THE TERMS THE LEG INTRODUCES, AS TERM AND MEANING (kogaki#1497): the reader-knowledge ledger,
// handed to the plan call with each term's meaning and nothing else; a paragraph names a term in
// its `introduces` only where it gives the meaning (kogaki#1663) (an item carries no `kind` since kogaki#1529).
// The meaning is `introducedMeaning`'s, the rule the Packet's crossing line reads: a typed
// entry's `meaning`, a legacy anchored entry's anchor, and for a bare term with neither,
// `null`, for the planner to give in its own words.
export function introducedTerms(entries) {
  return (entries || [])
    .map((raw) => parseIntroducesEntry(raw))
    .filter((p) => !p.error && p.term)
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
// position. kogaki#1403 withheld the description because the planner read it as content; the plan
// row now says an `operation` is an operation to perform and never a point to state, and the judge
// checks each Waypoint against its own Segment, so the leak is refused where it happens rather than
// by blinding the planner (kogaki#1414). `before`, `after` and `breaks` are untouched.
export function segmentsForPlanCall(segments) {
  if (!Array.isArray(segments) || !segments.length) return segments;
  return segments.map((s, i) => ({
    segment: i + 1,
    operation: String(s.operation).trim(),
    relation: String(s.relation ?? "").trim(),
    manner: String(s.manner ?? "").trim(),
  }));
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
  try {
    return judgePrompt(row, "", null, null);
  } finally {
    bindFlow(held);
  }
}
