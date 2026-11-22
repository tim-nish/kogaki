// The Legs derived from a RelationalStructure, one per relation the apex reaches (kogaki#1764, kogaki#1766,
// kogaki#1775), and the apex composed over it (kogaki#1768), for the Brief and the Leg-Planning Playground alike.
// The structure itself is given its ids and checked in src/sme/structure.mjs.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   RelationalStructure, The Leg-Planning Playground
//       specs/spec-draft-pipeline/SPEC.md
//
import {
  keysRefusal,
  ID_PREFIX,
  ELEMENT_NAME as NAME,
  relationsAmongRoles as among,
  relationsAmongRelations as over,
} from "../sme/structure.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const shape = (text) => ({ group: "shape", text });

// A `holds` AS A READER READS IT (kogaki#1772): each `{<Role id>}` written as that Role's `name`.
export function readHolds(structure, holds) {
  const names = new Map(((structure && structure.roles) || []).map((r) => [r.id, r.name]));
  return String(holds ?? "").replace(/\{([^}]+)\}/g, (m, id) => names.get(id) ?? id);
}

// AN ELEMENT AS A RENDERER PRINTS IT (kogaki#1772): its `name` and, in parentheses, the claim ids it is read from — a
// Role's `claims`, a relation's `from`, a higher-order relation's `from`, and for the apex, which carries none, the
// claims its `relates` reaches. An id naming no element prints as itself.
export function elementLabel(structure, id, claims = null) {
  const s = structure || {};
  const role = (s.roles || []).find((x) => x.id === id);
  const rel = among(s).find((x) => x.id === id);
  const ho = over(s).find((x) => x.id === id);
  const x = role || rel || ho;
  if (!x) return String(id);
  const ids = role
    ? role.claims
    : rel
      ? [rel.from]
      : Array.isArray(ho.from) && ho.from.length
        ? ho.from
        : servesOf(s, [id], claims || [...new Set(among(s).map((r) => r.from))].map((c) => ({ id: c })));
  return `${x.name ?? id} (${ids.join(", ")})`;
}

// THE IDS THE APEX REACHES: `attains_thesis` and every relation and higher-order relation its `relates` names, closed,
// the relations among Roles first, then the higher-order relations, each in the order of the list.
export function reachOf(structure) {
  const higher = new Map(over(structure).map((h) => [h.id, h]));
  const reached = new Set();
  const walk = (id) => {
    if (reached.has(id)) return;
    reached.add(id);
    for (const x of (higher.get(id) || { relates: [] }).relates) walk(x);
  };
  walk(structure.attains_thesis);
  return [...among(structure).map((r) => r.id), ...over(structure).map((h) => h.id)].filter((id) => reached.has(id));
}

// THE STRUCTURE WITH ITS REACH: `reach`, and `unreached` — the relations of either sort, in the order of the list, and
// the claims outside it, each with `reached_by`, the ids that would have reached it.
export function withReach(structure, claims) {
  const reach = reachOf(structure);
  const inReach = new Set(reach);
  const relatedBy = (id) =>
    over(structure)
      .filter((h) => h.relates.includes(id))
      .map((h) => h.id);
  const statedBy = (c) => [
    ...among(structure)
      .filter((r) => r.from === c)
      .map((r) => r.id),
    ...over(structure)
      .filter((h) => (h.from || []).includes(c))
      .map((h) => h.id),
  ];
  const reachedClaims = new Set(claims.map((c) => c.id).filter((c) => statedBy(c).some((id) => inReach.has(id))));
  const read = Object.fromEntries(Object.entries(structure).filter(([k]) => k !== "reach" && k !== "unreached"));
  return {
    ...read,
    reach,
    unreached: {
      relations: structure.relations
        .filter((r) => !inReach.has(r.id))
        .map((r) => ({ id: r.id, reached_by: relatedBy(r.id) })),
      claims: claims.filter((c) => !reachedClaims.has(c.id)).map((c) => ({ id: c.id, reached_by: statedBy(c.id) })),
    },
  };
}

// THE CLAIM IDS A CARRIED ID SERVES: a relation's `from`, and for a higher-order relation the `from` of every relation
// at the bottom of its `relates`, closed, in claim order.
export function servesOf(structure, carries, claims) {
  const relation = new Map(among(structure).map((r) => [r.id, r]));
  const higher = new Map(over(structure).map((h) => [h.id, h]));
  const from = new Set();
  const seen = new Set();
  const walk = (id) => {
    if (seen.has(id)) return;
    seen.add(id);
    if (relation.has(id)) from.add(relation.get(id).from);
    else if (higher.has(id)) higher.get(id).relates.forEach(walk);
  };
  carries.forEach(walk);
  return claims.map((c) => c.id).filter((id) => from.has(id));
}

// THE LEGS, DERIVED BY THE RUNNER WITH NO CALL (kogaki#1775; the rule is the spec's Reader Path): one Leg per relation and
// higher-order relation the apex reaches, the apex's own included, each higher-order relation after the ids it relates,
// in `relates` order. A Leg's `text` is its relation's `holds` with each Role named (`readHolds`); its `claims` are a
// higher-order relation's `from`, an ordinary relation's Roles' claims, and for the apex, which carries no `from`, the
// claims its `relates` reaches. The apex's Leg alone carries `reaches_target`.
export function structureLegs(structure, claims) {
  const relation = new Map(among(structure).map((r) => [r.id, r]));
  const higher = new Map(over(structure).map((h) => [h.id, h]));
  const apex = structure.attains_thesis;
  const order = [];
  const seen = new Set();
  const visit = (id) => {
    if (seen.has(id) || (!relation.has(id) && !higher.has(id))) return;
    seen.add(id);
    if (higher.has(id)) higher.get(id).relates.forEach(visit);
    order.push(id);
  };
  visit(apex);
  const roleClaims = new Map(structure.roles.map((r) => [r.id, r.claims || []]));
  const byId = new Map(claims.map((c) => [c.id, c]));
  const claimsOf = (id) => {
    if (relation.has(id)) {
      const from = new Set(relation.get(id).between.flatMap((r) => roleClaims.get(r) || []));
      return claims.map((c) => c.id).filter((c) => from.has(c));
    }
    const h = higher.get(id);
    if (Array.isArray(h.from) && h.from.length) return claims.map((c) => c.id).filter((c) => h.from.includes(c));
    return servesOf(structure, [id], claims);
  };
  return order.map((id, i) => ({
    leg_id: `L${i + 1}`,
    relation: id,
    text: readHolds(structure, (relation.get(id) || higher.get(id)).holds),
    claims: claimsOf(id).map((c) => ({ type: "strand", strand: c, proposition: byId.get(c).claim })),
    ...(id === apex ? { reaches_target: true } : {}),
  }));
}

// THE STRUCTURE'S CONNECTED COMPONENTS (kogaki#1768): two relations are connected when they share a Role or a
// higher-order relation relates both, and a component is the closure. Each component carries its id (`k<n>`, in the
// order of its first relation), `relations` -- its relations among Roles, then its higher-order relations (kogaki#1937)
// --, `top` -- the higher-order relations no other relates, or its relations where it has none -- and the claims its
// relations are `from`, in claim order.
export function componentsOf(structure, claims) {
  const parent = new Map(among(structure).map((r) => [r.id, r.id]));
  const find = (x) => (parent.get(x) === x ? x : find(parent.get(x)));
  const join = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  const byRole = new Map();
  for (const r of among(structure)) {
    for (const role of r.between) {
      if (byRole.has(role)) join(byRole.get(role), r.id);
      else byRole.set(role, r.id);
    }
  }
  const higher = new Map(over(structure).map((h) => [h.id, h]));
  const bottom = (id, seen = new Set()) => {
    if (seen.has(id)) return [];
    seen.add(id);
    return higher.has(id) ? higher.get(id).relates.flatMap((x) => bottom(x, seen)) : [id];
  };
  for (const h of over(structure)) {
    const rs = bottom(h.id).filter((id) => parent.has(id));
    for (const r of rs.slice(1)) join(rs[0], r);
  }
  const groups = new Map();
  for (const r of among(structure)) {
    const root = find(r.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r.id);
  }
  const related = new Set(over(structure).flatMap((h) => h.relates));
  return [...groups.values()].map((relations, i) => {
    const inside = new Set(relations);
    const hos = over(structure)
      .filter((h) => bottom(h.id).some((id) => inside.has(id)))
      .map((h) => h.id);
    const tops = hos.filter((id) => !related.has(id));
    const from = new Set([
      ...among(structure)
        .filter((r) => inside.has(r.id))
        .map((r) => r.from),
      ...over(structure)
        .filter((h) => hos.includes(h.id))
        .flatMap((h) => h.from || []),
    ]);
    return {
      component: `k${i + 1}`,
      relations: [...relations, ...hos],
      top: tops.length ? tops : relations,
      claims: claims.map((c) => c.id).filter((id) => from.has(id)),
    };
  });
}

// A COMPONENT IS A THESIS CANDIDATE ONLY WHERE A HIGHER-ORDER RELATION CONNECTS ITS CLAIMS (kogaki#1773): `connected`
// carries a higher-order relation of `structure`, `unconnected` carries ordinary relations alone and is reported,
// never offered.
export function partitionComponents(components, structure) {
  const higher = new Set(over(structure).map((h) => h.id));
  const connected = (k) => k.relations.some((id) => higher.has(id));
  return {
    connected: components.filter(connected),
    unconnected: components.filter((k) => !connected(k)),
  };
}

// THE DEPTH OF `id` (kogaki#1773): 0 for an ordinary relation, and for a higher-order relation one more than the
// deepest id it relates -- the longest chain of higher-order relations down to an ordinary relation.
export function depthOf(structure, id) {
  const higher = new Map(over(structure).map((h) => [h.id, h]));
  const walk = (x, seen) => {
    const h = higher.get(x);
    if (!h || seen.has(x)) return 0;
    const next = new Set(seen).add(x);
    return 1 + Math.max(0, ...h.relates.map((r) => walk(r, next)));
  };
  return walk(id, new Set());
}

// A HIGHER-ORDER RELATION'S `holds` WITH ITS ROLES NAMED (kogaki#1773): each `{<Role id>}` written as that Role's
// `name` (kogaki#1772), its hyphens and underscores read as spaces -- the Thesis of a component whose one top is its
// apex, read as a sentence rather than over the minted ids.
export const holdsInRoleNames = (structure, holds) => {
  const names = new Map(
    ((structure || {}).roles || []).map((r) => [r.id, String(r.name ?? r.id).replace(/[-_]+/g, " ")]),
  );
  return String(holds ?? "").replace(/\{([^}]+)\}/g, (m, id) => names.get(id) ?? id.replace(/[-_]+/g, " "));
};

// THE APEX RECORD (kogaki#1768), refused `{ group, text }` or `{}`: one apex per component of `components`, each
// relating exactly that component's `top`, with a `name` no element of the structure or other apex carries and a
// `holds` that is one sentence. The apex carries no `id`, which the adoption mints, and no `from` (kogaki#1772).
export function validateApex(answer, components, structure) {
  const b = keysRefusal(answer, ["apexes"], "the answer");
  if (b) return shape(b);
  if (!Array.isArray(answer.apexes)) return shape("the answer's `apexes` is not a list");
  const taken = new Set([...structure.roles, ...structure.relations].map((x) => x.name));
  const seen = new Set();
  for (const [i, a] of answer.apexes.entries()) {
    if (isMap(a) && Object.hasOwn(a, "from"))
      return shape(
        `apexes[${i}] carries \`from\` — the apex is the one connection no claim states, and carries no \`from\``,
      );
    if (isMap(a) && Object.hasOwn(a, "id"))
      return shape(`apexes[${i}] carries \`id\` — the apex's id is minted when it is adopted; write its \`name\``);
    const ab = keysRefusal(a, ["component", "name", "relates", "holds"], `apexes[${i}]`);
    if (ab) return shape(ab);
    const k = components.find((c) => c.component === a.component);
    if (!k)
      return shape(`apexes[${i}] names the component ${JSON.stringify(a.component)}, which the input does not carry`);
    if (seen.has(a.component))
      return shape(`two apexes name the component ${JSON.stringify(a.component)} — each component carries one`);
    seen.add(a.component);
    if (typeof a.name !== "string" || !NAME.test(a.name) || taken.has(a.name))
      return shape(
        `the apex of ${a.component}: its \`name\` ${JSON.stringify(a.name)} is not one short snake_case word, or is already a name of the structure`,
      );
    taken.add(a.name);
    const want = new Set(k.top);
    if (!Array.isArray(a.relates) || a.relates.length !== want.size || a.relates.some((x) => !want.has(x))) {
      return {
        group: "relates",
        text: `the apex of ${a.component} relates ${JSON.stringify(a.relates)}, and it relates exactly ${JSON.stringify(k.top)}, the component's top-level relations`,
      };
    }
    if (!isText(a.holds)) return shape(`the apex of ${a.component}: its \`holds\` is empty`);
    if (/\{[^}]+\}/.test(a.holds))
      return shape(
        `the apex of ${a.component}: its \`holds\` carries ${/\{[^}]+\}/.exec(a.holds)[0]} — the apex is the Thesis sentence, written in the claims' own words, never over Role ids`,
      );
  }
  const missing = components.find((c) => !seen.has(c.component));
  if (missing)
    return {
      group: "coverage",
      text: `the component ${missing.component} carries no apex — every component carries one`,
    };
  return {};
}

// THE STRUCTURE WITH ONE APEX ADOPTED (kogaki#1768): the apex appended to `relations` under the next `c_<n>` id
// (kogaki#1772, kogaki#1937) and named `attains_thesis`, the other apexes discarded, and `reach` and `unreached` derived as
// \`withReach\` derives them.
// An apex whose `name` is already a higher-order relation's is a single top (kogaki#1773): it is named
// `attains_thesis` under the id it already carries and nothing is appended.
export function withApex(structure, apex, claims) {
  const read = Object.fromEntries(
    Object.entries(structure).filter(([k]) => !["reach", "unreached", "attains_thesis"].includes(k)),
  );
  const top = over(structure).find((h) => h.name === apex.name);
  if (top) return withReach({ ...read, attains_thesis: top.id }, claims);
  const id = `${ID_PREFIX.relations}_${structure.relations.length + 1}`;
  return withReach(
    {
      ...read,
      relations: [...structure.relations, { id, name: apex.name, relates: [...apex.relates], holds: apex.holds }],
      attains_thesis: id,
    },
    claims,
  );
}

// THE PATH'S REACH, refused naming what breaks it or `null` (kogaki#1775): every relation and higher-order relation the
// apex reaches is one Leg's `relation`, no Leg serves an id outside the reach, and the Leg marked `reaches_target` is the
// apex's, wherever it sits.
export function pathReachRefusal(legs, structure) {
  const reachIds = Array.isArray(structure.reach) ? structure.reach : reachOf(structure);
  const reach = new Set(reachIds);
  const served = new Map();
  for (const l of legs || []) {
    if (!reach.has(l.relation))
      return `Leg ${l.leg_id} serves ${JSON.stringify(l.relation)}, which the apex does not reach — the article leaves it`;
    if (served.has(l.relation))
      return `Legs ${served.get(l.relation)} and ${l.leg_id} both serve ${JSON.stringify(l.relation)} — each reached relation is one Leg`;
    served.set(l.relation, l.leg_id);
  }
  const idle = reachIds.find((id) => !served.has(id));
  if (idle !== undefined)
    return `the Reader Path leaves ${JSON.stringify(idle)} with no Leg — the apex reaches it, so one Leg serves it`;
  const marked = (legs || []).filter((l) => l.reaches_target === true);
  if (marked.length !== 1 || marked[0].relation !== structure.attains_thesis) {
    return `the Leg marked \`reaches_target\` is not the apex's alone — exactly one Leg is marked, the one serving ${JSON.stringify(structure.attains_thesis)}`;
  }
  return null;
}
