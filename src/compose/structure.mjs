// The RelationalStructure a claim set is read into and the Legs derived from it, one per relation the apex reaches
// (kogaki#1764, kogaki#1766, kogaki#1775), read and refused here for the Brief (kogaki#1768) and the Leg-Planning
// Playground alike.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   RelationalStructure, The Leg-Planning Playground
//       specs/spec-draft-pipeline/SPEC.md
//
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";

export function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !(k in obj));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

const shape = (text) => ({ group: "shape", text });
const listOf = (v) => (Array.isArray(v) && v.length ? v : null);

// THE ID PREFIX OF EACH KIND OF ELEMENT (kogaki#1772): a Role's `r_<n>`, a relation's `c_<n>` and a higher-order
// relation's `h_<n>`, numbered in order of appearance from 1.
export const ID_PREFIX = Object.freeze({ roles: "r", relations: "c", higher_order: "h" });
const NAME = /^[a-z][a-z0-9_]*$/;
const KIND_WORD = { roles: "the Role", relations: "the relation", higher_order: "the higher-order relation" };

// THE IDS, MINTED BY THE RUNNER (kogaki#1772). The read answers each Role, relation and higher-order relation by its
// `name` and names the elements it refers to by name; this assigns each its id in order of appearance and rewrites
// `between`, `relates`, `attains_thesis` and every `{<name>}` of a `holds` to the ids. Returns `{ structure }`, or a
// refusal `{ group, text }` where the answer writes an `id` itself. A name that names nothing is left as written, and
// `validateReadSet` refuses it.
export function mintStructure(answer) {
  if (!isMap(answer)) return { structure: answer };
  for (const kind of Object.keys(ID_PREFIX)) {
    const at = (Array.isArray(answer[kind]) ? answer[kind] : []).findIndex((x) => isMap(x) && Object.hasOwn(x, "id"));
    if (at >= 0)
      return shape(
        `${kind}[${at}] carries \`id\` — ids are minted by the runner; write the element's \`name\` and name the elements it relates by their names`,
      );
  }
  const ids = Object.fromEntries(
    Object.entries(ID_PREFIX).map(([kind, p]) => [
      kind,
      new Map(
        (Array.isArray(answer[kind]) ? answer[kind] : [])
          .map((x, i) => [isMap(x) ? x.name : undefined, `${p}_${i + 1}`])
          .reverse(),
      ),
    ]),
  );
  const role = (n) => ids.roles.get(n) ?? n;
  const related = (n) => ids.relations.get(n) ?? ids.higher_order.get(n) ?? n;
  const holds = (h) =>
    typeof h === "string" ? h.replace(/\{([^}]+)\}/g, (m, n) => (ids.roles.has(n) ? `{${ids.roles.get(n)}}` : m)) : h;
  const minted = (kind, f) =>
    Array.isArray(answer[kind])
      ? answer[kind].map((x, i) => (isMap(x) ? { id: `${ID_PREFIX[kind]}_${i + 1}`, ...f(x) } : x))
      : answer[kind];
  const structure = {
    ...answer,
    roles: minted("roles", (r) => r),
    relations: minted("relations", (r) => ({
      ...r,
      ...(Array.isArray(r.between) ? { between: r.between.map(role) } : {}),
      holds: holds(r.holds),
    })),
    higher_order: minted("higher_order", (h) => ({
      ...h,
      ...(Array.isArray(h.relates) ? { relates: h.relates.map(related) } : {}),
      holds: holds(h.holds),
    })),
    ...(Object.hasOwn(answer, "attains_thesis")
      ? { attains_thesis: ids.higher_order.get(answer.attains_thesis) ?? answer.attains_thesis }
      : {}),
  };
  return { structure };
}

// AN ELEMENT AS A REFUSAL NAMES IT: its name, and its id beside it.
const named = (kind, x) => `${KIND_WORD[kind]} ${JSON.stringify(x.name)} (${x.id})`;

// THE ELEMENT'S `id` AND `name` (kogaki#1772), refused naming the element or `null`.
function idNameRefusal(kind, x, i, names) {
  const want = `${ID_PREFIX[kind]}_${i + 1}`;
  if (x.id !== want)
    return `${kind}[${i}]'s \`id\` ${JSON.stringify(x.id)} is not ${want} — ids are ${ID_PREFIX[kind]}_<n>, in order of appearance`;
  if (typeof x.name !== "string" || !NAME.test(x.name))
    return `${kind}[${i}] (${want}) carries no \`name\` that is one short snake_case word`;
  if (names.has(x.name))
    return `${kind}[${i}] (${want}): its \`name\` ${JSON.stringify(x.name)} is already another element's`;
  names.add(x.name);
  return null;
}

// THE STRUCTURE READ OVER THE CLAIM SET, refused `{ group, text }` or `{}`. `claims` is `parseClaims`'s list.
// `thesis: false` is the Brief's read (kogaki#1768): no Thesis is adopted yet, so the record carries no `attains_thesis`
// and every higher-order relation names the claims that state it. The apex — the higher-order relation `attains_thesis`
// names — carries no `from` (kogaki#1772).
export function validateReadSet(record, claims, { thesis = true } = {}) {
  const derived = isMap(record) ? ["reach", "unreached"].find((k) => Object.hasOwn(record, k)) : undefined;
  if (derived)
    return shape(`the structure carries \`${derived}\` — it is derived from \`attains_thesis\`, never written`);
  const bad = keysRefusal(
    record,
    ["roles", "relations", "higher_order", ...(thesis ? ["attains_thesis"] : [])],
    "the structure",
  );
  if (bad) return shape(bad);
  const claimIds = new Set(claims.map((c) => c.id));
  const names = new Set();
  const roles = listOf(record.roles);
  if (!roles) return shape("the structure's `roles` is not a non-empty list");
  for (const [i, r] of roles.entries()) {
    const b =
      keysRefusal(r, ["id", "name", "context", "attributes", "claims"], `roles[${i}]`) ||
      idNameRefusal("roles", r, i, names);
    if (b) return shape(b);
    const at = named("roles", r);
    if (!isText(r.context)) return shape(`${at}'s \`context\` is empty`);
    if (!Array.isArray(r.attributes) || r.attributes.some((a) => !isText(a)))
      return shape(`${at}'s \`attributes\` is not a list of text`);
    const stray = listOf(r.claims) ? r.claims.find((c) => !claimIds.has(c)) : null;
    if (!listOf(r.claims) || stray !== undefined)
      return shape(
        `${at}'s \`claims\` ${listOf(r.claims) ? `names ${JSON.stringify(stray)}, which is no claim's id` : "is not a non-empty list"}`,
      );
  }
  const roleIds = new Set(roles.map((r) => r.id));
  const roleName = new Map(roles.map((r) => [r.id, r.name]));
  const relations = listOf(record.relations);
  if (!relations) return shape("the structure's `relations` is not a non-empty list");
  for (const [i, r] of relations.entries()) {
    const b =
      keysRefusal(r, ["id", "name", "between", "holds", "from"], `relations[${i}]`) ||
      idNameRefusal("relations", r, i, names);
    if (b) return shape(b);
    const at = named("relations", r);
    if (!Array.isArray(r.between) || r.between.length < 2 || r.between.some((x) => !roleIds.has(x))) {
      return shape(`${at}'s \`between\` does not name two or more Roles`);
    }
    if (!claimIds.has(r.from)) return shape(`${at}'s \`from\` ${JSON.stringify(r.from)} is not one claim id`);
    if (!isText(r.holds)) return shape(`${at}'s \`holds\` is empty`);
    const absent = r.between.find((x) => !r.holds.includes(`{${x}}`));
    if (absent !== undefined)
      return shape(`${at}'s \`holds\` writes no {${roleName.get(absent)}}, a Role its \`between\` names`);
  }
  const relationIds = new Set(relations.map((r) => r.id));
  const higher = listOf(record.higher_order);
  if (!higher) return shape("the structure's `higher_order` is not a non-empty list");
  const apexId = thesis ? record.attains_thesis : undefined;
  for (const [i, h] of higher.entries()) {
    const apex = isMap(h) && h.id === apexId;
    if (apex && Object.hasOwn(h, "from"))
      return shape(
        `the apex, higher_order[${i}], carries \`from\` — the apex is the one connection no claim states, and carries no \`from\``,
      );
    const b =
      keysRefusal(h, ["id", "name", "relates", "holds", ...(apex ? [] : ["from"])], `higher_order[${i}]`) ||
      idNameRefusal("higher_order", h, i, names);
    if (b) return shape(b);
  }
  const higherIds = new Set(higher.map((h) => h.id));
  if (thesis && !higherIds.has(record.attains_thesis)) {
    return shape(`\`attains_thesis\` ${JSON.stringify(record.attains_thesis ?? null)} names no higher-order relation`);
  }
  for (const h of higher) {
    const at = named("higher_order", h);
    if (!Array.isArray(h.relates) || h.relates.length < 2) return shape(`${at} relates fewer than two relations`);
    const stray = h.relates.find((x) => !relationIds.has(x) && !higherIds.has(x));
    if (stray !== undefined)
      return shape(`${at} relates ${JSON.stringify(stray)}, which names no relation or higher-order relation`);
    if (!isText(h.holds)) return shape(`${at}'s \`holds\` is empty`);
    if (h.id === apexId) continue;
    if (!Array.isArray(h.from)) return shape(`${at}'s \`from\` is not a list of claim ids`);
    if (!h.from.length)
      return shape(
        `${at}'s \`from\` is empty — every higher-order relation but the apex names the claims whose text states it`,
      );
    const unknown = h.from.find((c) => !claimIds.has(c));
    if (unknown !== undefined)
      return shape(`${at}'s \`from\` names ${JSON.stringify(unknown)}, which is no claim's id`);
  }
  const cycle = cycleThrough(new Map(higher.map((h) => [h.id, h.relates.filter((x) => higherIds.has(x))])));
  if (cycle)
    return shape(
      `${named(
        "higher_order",
        higher.find((h) => h.id === cycle),
      )} relates itself through \`relates\``,
    );
  const used = new Set(relations.flatMap((r) => r.between));
  const idle = roles.find((r) => !used.has(r.id));
  if (idle) return { group: "coverage", text: `${named("roles", idle)} is in no relation` };
  return {};
}

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
  const rel = (s.relations || []).find((x) => x.id === id);
  const ho = (s.higher_order || []).find((x) => x.id === id);
  const x = role || rel || ho;
  if (!x) return String(id);
  const ids = role
    ? role.claims
    : rel
      ? [rel.from]
      : Array.isArray(ho.from) && ho.from.length
        ? ho.from
        : servesOf(s, [id], claims || [...new Set((s.relations || []).map((r) => r.from))].map((c) => ({ id: c })));
  return `${x.name ?? id} (${ids.join(", ")})`;
}

// THE FIRST HIGHER-ORDER ID ON A CYCLE of `edges` (an id to the higher-order ids it relates), or `null`.
function cycleThrough(edges) {
  const state = new Map();
  const visit = (id) => {
    if (state.get(id) === "done") return null;
    if (state.get(id) === "open") return id;
    state.set(id, "open");
    for (const next of edges.get(id) || []) {
      const found = visit(next);
      if (found) return found;
    }
    state.set(id, "done");
    return null;
  };
  for (const id of edges.keys()) {
    const found = visit(id);
    if (found) return found;
  }
  return null;
}

// THE IDS THE APEX REACHES: `attains_thesis` and every relation and higher-order relation its `relates` names, closed,
// in the structure's order, relations first.
export function reachOf(structure) {
  const higher = new Map(structure.higher_order.map((h) => [h.id, h]));
  const reached = new Set();
  const walk = (id) => {
    if (reached.has(id)) return;
    reached.add(id);
    for (const x of (higher.get(id) || { relates: [] }).relates) walk(x);
  };
  walk(structure.attains_thesis);
  return [...structure.relations.map((r) => r.id), ...structure.higher_order.map((h) => h.id)].filter((id) =>
    reached.has(id),
  );
}

// THE STRUCTURE WITH ITS REACH: `reach`, and `unreached` — the relations, higher-order relations and claims outside it,
// each with `reached_by`, the ids that would have reached it.
export function withReach(structure, claims) {
  const reach = reachOf(structure);
  const inReach = new Set(reach);
  const relatedBy = (id) => structure.higher_order.filter((h) => h.relates.includes(id)).map((h) => h.id);
  const statedBy = (c) => [
    ...structure.relations.filter((r) => r.from === c).map((r) => r.id),
    ...structure.higher_order.filter((h) => (h.from || []).includes(c)).map((h) => h.id),
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
      higher_order: structure.higher_order
        .filter((h) => !inReach.has(h.id))
        .map((h) => ({ id: h.id, reached_by: relatedBy(h.id) })),
      claims: claims.filter((c) => !reachedClaims.has(c.id)).map((c) => ({ id: c.id, reached_by: statedBy(c.id) })),
    },
  };
}

// THE CLAIM IDS A CARRIED ID SERVES: a relation's `from`, and for a higher-order relation the `from` of every relation
// at the bottom of its `relates`, closed, in claim order.
export function servesOf(structure, carries, claims) {
  const relation = new Map(structure.relations.map((r) => [r.id, r]));
  const higher = new Map(structure.higher_order.map((h) => [h.id, h]));
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
  const relation = new Map(structure.relations.map((r) => [r.id, r]));
  const higher = new Map(structure.higher_order.map((h) => [h.id, h]));
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
// order of its first relation), its relations, its higher-order relations, `top` -- the higher-order relations no
// other relates, or its relations where it has none -- and the claims its relations and higher-order relations are
// `from`, in claim order.
export function componentsOf(structure, claims) {
  const parent = new Map(structure.relations.map((r) => [r.id, r.id]));
  const find = (x) => (parent.get(x) === x ? x : find(parent.get(x)));
  const join = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  const byRole = new Map();
  for (const r of structure.relations) {
    for (const role of r.between) {
      if (byRole.has(role)) join(byRole.get(role), r.id);
      else byRole.set(role, r.id);
    }
  }
  const higher = new Map(structure.higher_order.map((h) => [h.id, h]));
  const bottom = (id, seen = new Set()) => {
    if (seen.has(id)) return [];
    seen.add(id);
    return higher.has(id) ? higher.get(id).relates.flatMap((x) => bottom(x, seen)) : [id];
  };
  for (const h of structure.higher_order) {
    const rs = bottom(h.id).filter((id) => parent.has(id));
    for (const r of rs.slice(1)) join(rs[0], r);
  }
  const groups = new Map();
  for (const r of structure.relations) {
    const root = find(r.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r.id);
  }
  const related = new Set(structure.higher_order.flatMap((h) => h.relates));
  return [...groups.values()].map((relations, i) => {
    const inside = new Set(relations);
    const hos = structure.higher_order.filter((h) => bottom(h.id).some((id) => inside.has(id))).map((h) => h.id);
    const tops = hos.filter((id) => !related.has(id));
    const from = new Set([
      ...structure.relations.filter((r) => inside.has(r.id)).map((r) => r.from),
      ...structure.higher_order.filter((h) => hos.includes(h.id)).flatMap((h) => h.from || []),
    ]);
    return {
      component: `k${i + 1}`,
      relations,
      higher_order: hos,
      top: tops.length ? tops : relations,
      claims: claims.map((c) => c.id).filter((id) => from.has(id)),
    };
  });
}

// A COMPONENT IS A THESIS CANDIDATE ONLY WHERE A HIGHER-ORDER RELATION CONNECTS ITS CLAIMS (kogaki#1773): `connected`
// carries a higher-order relation, `unconnected` carries ordinary relations alone and is reported, never offered.
export function partitionComponents(components) {
  return {
    connected: components.filter((k) => k.higher_order.length > 0),
    unconnected: components.filter((k) => k.higher_order.length === 0),
  };
}

// THE DEPTH OF `id` (kogaki#1773): 0 for an ordinary relation, and for a higher-order relation one more than the
// deepest id it relates -- the longest chain of higher-order relations down to an ordinary relation.
export function depthOf(structure, id) {
  const higher = new Map(structure.higher_order.map((h) => [h.id, h]));
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
  const taken = new Set([...structure.roles, ...structure.relations, ...structure.higher_order].map((x) => x.name));
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

// THE STRUCTURE WITH ONE APEX ADOPTED (kogaki#1768): the apex appended to `higher_order` under the next `h_<n>` id
// (kogaki#1772) and named `attains_thesis`, the other apexes discarded, and `reach` and `unreached` derived as
// \`withReach\` derives them.
// An apex whose `name` is already a higher-order relation's is a single top (kogaki#1773): it is named
// `attains_thesis` under the id it already carries and nothing is appended.
export function withApex(structure, apex, claims) {
  const read = Object.fromEntries(
    Object.entries(structure).filter(([k]) => !["reach", "unreached", "attains_thesis"].includes(k)),
  );
  const top = structure.higher_order.find((h) => h.name === apex.name);
  if (top) return withReach({ ...read, attains_thesis: top.id }, claims);
  const id = `${ID_PREFIX.higher_order}_${structure.higher_order.length + 1}`;
  return withReach(
    {
      ...read,
      higher_order: [...structure.higher_order, { id, name: apex.name, relates: [...apex.relates], holds: apex.holds }],
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
