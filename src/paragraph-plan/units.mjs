// paragraph-plan/units — one job unit per Leg: the Leg as a step reads it, its told-before terms and its Roles. Cut from src/paragraph-plan.mjs along its headed
// sections (kogaki#1792); the design and its rulings are stated at the entry and in the Issues each
// block below names.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the rule lives in
// `src/SPEC-REFERENCES.md`. This module names no spec content, so its names table is empty.
// ---------------------------------------------------------------------------
// ONE UNIT PER LEG. The unit's id is `leg-<n>`, its place in the Reader Path, so a file
// name never carries a Leg id; `inputs.legs` is the Legs in that order.

export function unitIdFor(i) {
  return `leg-${i + 1}`;
}

// WHAT A UNIT IS HANDED ABOUT ITS LEG (kogaki#1777): the Leg's `text`, its relation's `holds` with each
// Role named; its relation's id; its Claims, each Strand id beside the proposition it is `from`; the Roles
// the relation stands between, each with its `context`; the Persona's prior-knowledge line; and what the
// Legs before it state, `the_reader_has_been_told` (`toldBefore`). Its Journeys, `{strand, use}`, ride for
// a paragraph to place (kogaki#1639). What its Move leaves and no later paragraph takes up is left for the
// next Leg, and nothing hands the Leg a list of it (kogaki#1853). `opts` is
// `{ told, roles, priorKnowledge }`.
export function planLeg(leg, opts = {}) {
  return {
    leg_id: leg.leg_id,
    ...(typeof leg.relation === "string" ? { relation: leg.relation } : {}),
    text: String(leg.text ?? "").trim(),
    claims: (leg.claims || []).map((g) => ({ strand: g.strand, proposition: String(g.proposition ?? "").trim() })),
    roles: (opts.roles || []).map((r) => ({ ...r })),
    prior_knowledge: typeof opts.priorKnowledge === "string" ? opts.priorKnowledge.trim() : "",
    the_reader_has_been_told: (opts.told || []).map((x) => ({ ...x })),
    journeys: (leg.journeys || [])
      .filter((j) => j && typeof j === "object")
      .map((j) => ({ strand: j.strand, use: j.use })),
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
    priorKnowledge,
  }));
}

// A MOVE'S SEGMENTS AS THE CALLS THAT READ A MOVE ARE HANDED THEM (kogaki#1884): each numbered into
// `{ segment, operation, relation, manner }`, `relation` empty on Segment 1 and `manner` empty where the Move
// gives none. The Structure-Mapping Playground's short Trial is its reader (src/structure-mapping-playground/short.mjs).
export function segmentsForPlanCall(segments) {
  if (!Array.isArray(segments) || !segments.length) return segments;
  return segments.map((s, i) => ({
    segment: i + 1,
    operation: String(s.operation).trim(),
    relation: String(s.relation ?? "").trim(),
    manner: String(s.manner ?? "").trim(),
  }));
}
