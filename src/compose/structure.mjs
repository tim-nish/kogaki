// The RelationalStructure a claim set is read into, the Leg Waypoints composed from it and the Legs derived over them
// (kogaki#1764, kogaki#1766, kogaki#1767), read and refused here for the Brief (kogaki#1768) and the Leg-Planning
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

// THE STRUCTURE READ OVER THE CLAIM SET, refused `{ group, text }` or `{}`. `claims` is `parseClaims`'s list.
// `thesis: false` is the Brief's read (kogaki#1768): no Thesis is adopted yet, so the record carries no `attains_thesis`
// and every higher-order relation names the claims that state it.
export function validateReadSet(record, claims, { thesis = true } = {}) {
  const derived = isMap(record) ? ["reach", "unreached"].find((k) => Object.hasOwn(record, k)) : undefined;
  if (derived) return shape(`the structure carries \`${derived}\` — it is derived from \`attains_thesis\`, never written`);
  const bad = keysRefusal(record, ["roles", "relations", "higher_order", ...(thesis ? ["attains_thesis"] : [])], "the structure");
  if (bad) return shape(bad);
  const claimIds = new Set(claims.map((c) => c.id));
  const ids = new Set();
  const roles = listOf(record.roles);
  if (!roles) return shape("the structure's `roles` is not a non-empty list");
  for (const [i, r] of roles.entries()) {
    const b = keysRefusal(r, ["id", "context", "attributes", "claims"], `roles[${i}]`);
    if (b) return shape(b);
    if (!isText(r.id) || ids.has(r.id)) return shape(`roles[${i}]'s \`id\` is empty or not unique`);
    if (!isText(r.context)) return shape(`the Role ${JSON.stringify(r.id)}'s \`context\` is empty`);
    if (!Array.isArray(r.attributes) || r.attributes.some((a) => !isText(a))) return shape(`the Role ${JSON.stringify(r.id)}'s \`attributes\` is not a list of text`);
    const stray = listOf(r.claims) ? r.claims.find((c) => !claimIds.has(c)) : null;
    if (!listOf(r.claims) || stray !== undefined) return shape(`the Role ${JSON.stringify(r.id)}'s \`claims\` ${listOf(r.claims) ? `names ${JSON.stringify(stray)}, which is no claim's id` : "is not a non-empty list"}`);
    ids.add(r.id);
  }
  const roleIds = new Set(ids);
  const relations = listOf(record.relations);
  if (!relations) return shape("the structure's `relations` is not a non-empty list");
  const relationIds = new Set();
  for (const [i, r] of relations.entries()) {
    const b = keysRefusal(r, ["id", "between", "holds", "from"], `relations[${i}]`);
    if (b) return shape(b);
    if (!isText(r.id) || ids.has(r.id)) return shape(`relations[${i}]'s \`id\` is empty or not unique`);
    if (!Array.isArray(r.between) || r.between.length < 2 || r.between.some((x) => !roleIds.has(x))) {
      return shape(`the relation ${JSON.stringify(r.id)}'s \`between\` does not name two or more Roles`);
    }
    if (!claimIds.has(r.from)) return shape(`the relation ${JSON.stringify(r.id)}'s \`from\` ${JSON.stringify(r.from)} is not one claim id`);
    if (!isText(r.holds)) return shape(`the relation ${JSON.stringify(r.id)}'s \`holds\` is empty`);
    const absent = r.between.find((x) => !r.holds.includes(`{${x}}`));
    if (absent !== undefined) return shape(`the relation ${JSON.stringify(r.id)}'s \`holds\` writes no {${absent}}, a Role its \`between\` names`);
    ids.add(r.id);
    relationIds.add(r.id);
  }
  const higher = listOf(record.higher_order);
  if (!higher) return shape("the structure's `higher_order` is not a non-empty list");
  const higherIds = new Set();
  for (const [i, h] of higher.entries()) {
    const b = keysRefusal(h, ["id", "relates", "holds", "from"], `higher_order[${i}]`);
    if (b) return shape(b);
    if (!isText(h.id) || ids.has(h.id) || higherIds.has(h.id)) return shape(`higher_order[${i}]'s \`id\` is empty or not unique`);
    higherIds.add(h.id);
  }
  if (thesis && !higherIds.has(record.attains_thesis)) {
    return shape(`\`attains_thesis\` ${JSON.stringify(record.attains_thesis ?? null)} names no higher-order relation`);
  }
  for (const h of higher) {
    const at = `the higher-order relation ${JSON.stringify(h.id)}`;
    if (!Array.isArray(h.relates) || h.relates.length < 2) return shape(`${at} relates fewer than two relations`);
    const stray = h.relates.find((x) => !relationIds.has(x) && !higherIds.has(x));
    if (stray !== undefined) return shape(`${at} relates ${JSON.stringify(stray)}, which is no relation's or higher-order relation's id`);
    if (!isText(h.holds)) return shape(`${at}'s \`holds\` is empty`);
    if (!Array.isArray(h.from)) return shape(`${at}'s \`from\` is not a list of claim ids`);
    if (thesis && h.id === record.attains_thesis) {
      if (h.from.length) return shape(`${at} attains the thesis, and its \`from\` names ${JSON.stringify(h.from[0])} — the one higher-order relation that attains the thesis carries \`from: []\``);
      continue;
    }
    if (!h.from.length) return shape(`${at}'s \`from\` is empty — every higher-order relation but the one that attains the thesis names the claims whose text states it`);
    const unknown = h.from.find((c) => !claimIds.has(c));
    if (unknown !== undefined) return shape(`${at}'s \`from\` names ${JSON.stringify(unknown)}, which is no claim's id`);
  }
  const cycle = cycleThrough(new Map(higher.map((h) => [h.id, h.relates.filter((x) => higherIds.has(x))])));
  if (cycle) return shape(`the higher-order relation ${JSON.stringify(cycle)} relates itself through \`relates\``);
  const used = new Set(relations.flatMap((r) => r.between));
  const idle = roles.find((r) => !used.has(r.id));
  if (idle) return { group: "coverage", text: `the Role ${JSON.stringify(idle.id)} is in no relation` };
  return {};
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
  return [...structure.relations.map((r) => r.id), ...structure.higher_order.map((h) => h.id)].filter((id) => reached.has(id));
}

// THE STRUCTURE WITH ITS REACH: `reach`, and `unreached` — the relations, higher-order relations and claims outside it,
// each with `reached_by`, the ids that would have reached it.
export function withReach(structure, claims) {
  const reach = reachOf(structure);
  const inReach = new Set(reach);
  const relatedBy = (id) => structure.higher_order.filter((h) => h.relates.includes(id)).map((h) => h.id);
  const statedBy = (c) => [...structure.relations.filter((r) => r.from === c).map((r) => r.id),
    ...structure.higher_order.filter((h) => h.from.includes(c)).map((h) => h.id)];
  const reachedClaims = new Set(claims.map((c) => c.id).filter((c) => statedBy(c).some((id) => inReach.has(id))));
  const read = Object.fromEntries(Object.entries(structure).filter(([k]) => k !== "reach" && k !== "unreached"));
  return {
    ...read,
    reach,
    unreached: {
      relations: structure.relations.filter((r) => !inReach.has(r.id)).map((r) => ({ id: r.id, reached_by: relatedBy(r.id) })),
      higher_order: structure.higher_order.filter((h) => !inReach.has(h.id)).map((h) => ({ id: h.id, reached_by: relatedBy(h.id) })),
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

// ONE WAYPOINT, refused naming it or `null`.
function waypointRefusal(w, n, known, reached) {
  const at = `Waypoint ${n}`;
  if (isMap(w) && Object.hasOwn(w, "serves")) return { group: "shape", text: `${at} carries \`serves\` — it is derived from \`carries\`, never written` };
  const b = keysRefusal(w, ["point", "carries"], at);
  if (b) return { group: "shape", text: b };
  if (!isText(w.point)) return { group: "shape", text: `${at}'s \`point\` is empty` };
  if (!listOf(w.carries)) return { group: "carries", text: `${at}'s \`carries\` is empty` };
  const stray = w.carries.find((id) => !known.has(id));
  if (stray !== undefined) return { group: "carries", text: `${at} carries ${JSON.stringify(stray)}, which names no relation or higher-order relation of the structure` };
  const outside = w.carries.find((id) => !reached.has(id));
  if (outside !== undefined) return { group: "carries", text: `${at} carries ${JSON.stringify(outside)}, which the higher-order relation that attains the thesis does not reach — the article leaves it` };
  return null;
}

// THE WAYPOINT SET, refused `{ group, text }` or `{}`.
export function validateWaypoints(answer, structure) {
  const b = keysRefusal(answer, ["waypoints"], "the answer");
  if (b) return shape(b);
  const ws = listOf(answer.waypoints);
  if (!ws) return shape("the answer's `waypoints` is not a non-empty list");
  const known = new Set([...structure.relations.map((r) => r.id), ...structure.higher_order.map((h) => h.id)]);
  const reach = reachOf(structure);
  const reached = new Set(reach);
  for (const [i, w] of ws.entries()) {
    const r = waypointRefusal(w, i + 1, known, reached);
    if (r) return r;
  }
  const carried = new Set(ws.flatMap((w) => w.carries));
  const idle = reach.find((id) => !carried.has(id));
  if (idle) return { group: "coverage", text: `${JSON.stringify(idle)} is carried by no Waypoint — the Waypoints together carry every relation and higher-order relation the one that attains the thesis reaches` };
  if (!ws[ws.length - 1].carries.includes(structure.attains_thesis)) {
    return { group: "coverage", text: `Waypoint ${ws.length}, the last, does not carry ${JSON.stringify(structure.attains_thesis)}, the higher-order relation that attains the thesis` };
  }
  return {};
}

// A REWRITE OF WAYPOINT `n` ALONE, refused or `{ waypoints }`, the set with it in place.
export function rewrittenSet(answer, n, waypoints, structure) {
  if (isMap(answer) && Object.hasOwn(answer, "waypoint") && answer.waypoint !== n) {
    return shape(`the rewrite answers Waypoint ${JSON.stringify(answer.waypoint)}, and the Waypoint to rewrite is ${n}`);
  }
  const b = keysRefusal(answer, ["waypoint", "point", "carries"], `the rewrite of Waypoint ${n}`);
  if (b) return shape(b);
  const next = waypoints.map((w, i) => (i + 1 === n ? { point: answer.point, carries: answer.carries } : { point: w.point, carries: w.carries }));
  const v = validateWaypoints({ waypoints: next }, structure);
  return v.text ? v : { waypoints: next };
}

// THE GROUNDED VERDICT, refused `{ group, text }` or `{}`.
export function validateGrounded(answer, waypoints) {
  const b = keysRefusal(answer, ["verdict", "sites"], "the verdict");
  if (b) return shape(b);
  if (!["fits", "does-not-fit"].includes(answer.verdict)) return shape(`\`verdict\` ${JSON.stringify(answer.verdict)} is neither \`fits\` nor \`does-not-fit\``);
  if (!Array.isArray(answer.sites)) return shape("`sites` is not a list");
  if ((answer.verdict === "fits") !== (answer.sites.length === 0)) return shape(`\`sites\` is ${answer.sites.length ? "non-empty under `fits`" : "empty under `does-not-fit`"}`);
  for (const [i, s] of answer.sites.entries()) {
    const sb = keysRefusal(s, ["waypoint", "phrase", "why"], `sites[${i}]`);
    if (sb) return shape(sb);
    const w = waypoints[Number(s.waypoint) - 1];
    if (!w) return shape(`sites[${i}] names Waypoint ${JSON.stringify(s.waypoint)}, which the input does not carry`);
    if (!isText(s.phrase) || !w.point.includes(s.phrase)) return shape(`sites[${i}]'s \`phrase\` is not words of Waypoint ${s.waypoint}'s \`point\``);
  }
  return {};
}

// A GROUNDED SITE AS THE COMMENT ITS WAYPOINT IS HANDED: the judge's text, verbatim.
export const siteComment = (s) => `Waypoint ${s.waypoint}: the judge quoted "${s.phrase}" and wrote: ${s.why}`;

// THE LEGS, DERIVED BY THE RUNNER (kogaki#1767; the rule is the spec's Leg-Planning Playground, Stage 3). Returns
// `{ legs, partition }`, `partition` naming each Leg's higher-order relation and Waypoint numbers.
// `withStructure` is the Brief's (kogaki#1768): each Leg names its higher-order relation as `relation`, each Leg
// Waypoint keeps its `carries`, and each claim is typed `strand`.
export function derivedLegs(waypoints, structure, claims, { withStructure = false } = {}) {
  const apex = structure.attains_thesis;
  const others = structure.higher_order.filter((h) => h.id !== apex);
  const relates = new Map(structure.higher_order.map((h) => [h.id, new Set(h.relates)]));
  const reaches = (w, h) => w.carries.includes(h.id) || w.carries.some((id) => relates.get(h.id).has(id));
  const placed = waypoints.map((w) => {
    if (w.carries.includes(apex)) return apex;
    const h = others.find((x) => w.carries.includes(x.id)) || others.find((x) => reaches(w, x))
      || structure.higher_order.find((x) => x.id === apex && reaches(w, x));
    return h ? h.id : null;
  });
  for (let i = placed.length - 1; i >= 0; i--) if (placed[i] === null) placed[i] = placed[i + 1] ?? null;
  const order = [...new Set(placed.filter((id) => id !== null && id !== apex)), apex];
  const partition = order.map((relation, i) => ({ leg_id: `L${i + 1}`, relation,
    waypoints: placed.flatMap((id, k) => (id === relation ? [k + 1] : [])) })).filter((p) => p.waypoints.length);
  const byId = new Map(claims.map((c) => [c.id, c]));
  const legs = partition.map((p, i) => {
    const ws = p.waypoints.map((n) => waypoints[n - 1]);
    const served = claims.map((c) => c.id).filter((id) => ws.some((w) => w.serves.includes(id)));
    return {
      leg_id: p.leg_id,
      ...(withStructure ? { relation: p.relation } : {}),
      claims: served.map((id) => ({ ...(withStructure ? { type: "strand" } : {}), strand: id, proposition: byId.get(id).claim })),
      waypoints: ws.map((w) => ({ point: w.point, serves: [...w.serves], ...(withStructure ? { carries: [...w.carries] } : {}), case: "own" })),
      ...(i === partition.length - 1 ? { reaches_target: true } : {}),
    };
  });
  return { legs, partition };
}

// THE DERIVATION'S INVARIANT (kogaki#1767), refused naming what breaks it or `{}`.
export function legPartitionRefusal({ legs, partition }, waypoints, structure) {
  const seen = waypoints.map(() => 0);
  for (const p of partition) {
    if (!p.waypoints.length) return { error: `Leg ${p.leg_id} holds no Waypoint` };
    for (const n of p.waypoints) seen[n - 1] += 1;
  }
  const off = seen.findIndex((k) => k !== 1);
  if (off >= 0) return { error: `Waypoint ${off + 1} is in ${seen[off]} Legs — every Waypoint is in exactly one Leg` };
  const moved = legs.find((l) => Object.hasOwn(l, "move"));
  if (moved) return { error: `Leg ${moved.leg_id} binds a Move — a Leg binds none; the paragraph Move is ParagraphPlan's` };
  if (partition[partition.length - 1].relation !== structure.attains_thesis) {
    return { error: `the last Leg serves ${JSON.stringify(partition[partition.length - 1].relation)}, not the apex ${JSON.stringify(structure.attains_thesis)}` };
  }
  const marked = legs.filter((l) => l.reaches_target === true);
  if (marked.length !== 1 || marked[0] !== legs[legs.length - 1]) return { error: "the last Leg, and it alone, is marked `reaches_target`" };
  return {};
}


// THE STRUCTURE'S CONNECTED COMPONENTS (kogaki#1768): two relations are connected when they share a Role or a
// higher-order relation relates both, and a component is the closure. Each component carries its id (`k<n>`, in the
// order of its first relation), its relations, its higher-order relations, `top` -- the higher-order relations no
// other relates, or its relations where it has none -- and the claims its relations and higher-order relations are
// `from`, in claim order.
export function componentsOf(structure, claims) {
  const parent = new Map(structure.relations.map((r) => [r.id, r.id]));
  const find = (x) => (parent.get(x) === x ? x : find(parent.get(x)));
  const join = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(rb, ra); };
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
    const from = new Set([...structure.relations.filter((r) => inside.has(r.id)).map((r) => r.from),
      ...structure.higher_order.filter((h) => hos.includes(h.id)).flatMap((h) => h.from)]);
    return { component: `k${i + 1}`, relations, higher_order: hos, top: tops.length ? tops : relations,
      claims: claims.map((c) => c.id).filter((id) => from.has(id)) };
  });
}

// A COMPONENT IS A THESIS CANDIDATE ONLY WHERE A HIGHER-ORDER RELATION CONNECTS ITS CLAIMS (kogaki#1773): `connected`
// carries a higher-order relation, `unconnected` carries ordinary relations alone and is reported, never offered.
export function partitionComponents(components) {
  return { connected: components.filter((k) => k.higher_order.length > 0),
    unconnected: components.filter((k) => k.higher_order.length === 0) };
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

// A HIGHER-ORDER RELATION'S `holds` WITH ITS ROLES NAMED (kogaki#1773): each `{<id>}` written as the Role's id, its
// hyphens and underscores read as spaces -- the Thesis of a component whose one top is its apex.
export const holdsInRoleNames = (holds) => String(holds).replace(/\{([^}]+)\}/g, (_, id) => id.replace(/[-_]+/g, " "));

// THE APEX RECORD (kogaki#1768), refused `{ group, text }` or `{}`: one apex per component of `components`, each
// relating exactly that component's `top`, with an id no relation, higher-order relation or other apex carries, a
// `holds` that is one sentence, and `from: []`.
export function validateApex(answer, components, structure) {
  const b = keysRefusal(answer, ["apexes"], "the answer");
  if (b) return shape(b);
  if (!Array.isArray(answer.apexes)) return shape("the answer's `apexes` is not a list");
  const taken = new Set([...structure.roles.map((r) => r.id), ...structure.relations.map((r) => r.id), ...structure.higher_order.map((h) => h.id)]);
  const seen = new Set();
  for (const [i, a] of answer.apexes.entries()) {
    const ab = keysRefusal(a, ["component", "id", "relates", "holds", "from"], `apexes[${i}]`);
    if (ab) return shape(ab);
    const k = components.find((c) => c.component === a.component);
    if (!k) return shape(`apexes[${i}] names the component ${JSON.stringify(a.component)}, which the input does not carry`);
    if (seen.has(a.component)) return shape(`two apexes name the component ${JSON.stringify(a.component)} — each component carries one`);
    seen.add(a.component);
    if (!isText(a.id) || taken.has(a.id)) return shape(`the apex of ${a.component}: its \`id\` ${JSON.stringify(a.id)} is empty or already an id of the structure`);
    taken.add(a.id);
    const want = new Set(k.top);
    if (!Array.isArray(a.relates) || a.relates.length !== want.size || a.relates.some((x) => !want.has(x))) {
      return { group: "relates", text: `the apex of ${a.component} relates ${JSON.stringify(a.relates)}, and it relates exactly ${JSON.stringify(k.top)}, the component's top-level relations` };
    }
    if (!isText(a.holds)) return shape(`the apex of ${a.component}: its \`holds\` is empty`);
    if (/\{[^}]+\}/.test(a.holds)) return shape(`the apex of ${a.component}: its \`holds\` carries ${/\{[^}]+\}/.exec(a.holds)[0]} — the apex is the Thesis sentence, written in the claims' own words, never over Role ids`);
    if (!Array.isArray(a.from) || a.from.length) return shape(`the apex of ${a.component}: its \`from\` is not empty — the apex is the one connection no claim states`);
  }
  const missing = components.find((c) => !seen.has(c.component));
  if (missing) return { group: "coverage", text: `the component ${missing.component} carries no apex — every component carries one` };
  return {};
}

// THE STRUCTURE WITH ONE APEX ADOPTED (kogaki#1768): the apex appended to `higher_order` and named `attains_thesis`,
// the other apexes discarded, and `reach` and `unreached` derived as \`withReach\` derives them.
// An apex whose id is already a higher-order relation of the structure is a single top (kogaki#1773): it is named
// `attains_thesis` and nothing is appended.
export function withApex(structure, apex, claims) {
  const read = Object.fromEntries(Object.entries(structure).filter(([k]) => !["reach", "unreached", "attains_thesis"].includes(k)));
  if (structure.higher_order.some((h) => h.id === apex.id)) return withReach({ ...read, attains_thesis: apex.id }, claims);
  return withReach({ ...read, higher_order: [...structure.higher_order, { id: apex.id, relates: [...apex.relates], holds: apex.holds, from: [] }],
    attains_thesis: apex.id }, claims);
}

// THE PATH'S REACH, refused naming what breaks it or `null` (kogaki#1768): every relation and higher-order relation
// the apex reaches is carried by a Leg Waypoint, and the last Waypoint of the last Leg carries the apex.
export function pathReachRefusal(legs, structure) {
  const ws = (legs || []).flatMap((l) => (l.waypoints || []).map((w, i) => ({ leg: l.leg_id, n: i + 1, carries: Array.isArray(w.carries) ? w.carries : [] })));
  const carried = new Set(ws.flatMap((w) => w.carries));
  const idle = (structure.reach || []).find((id) => !carried.has(id));
  if (idle !== undefined) return `the Reader Path leaves ${JSON.stringify(idle)} uncarried — the apex reaches it, so a Leg Waypoint carries it`;
  const last = ws[ws.length - 1];
  if (!last || !last.carries.includes(structure.attains_thesis)) {
    return `the Reader Path does not reach the apex last — Leg ${last ? last.leg : "(none)"}, Waypoint ${last ? last.n : "(none)"}, the last, does not carry ${JSON.stringify(structure.attains_thesis)}`;
  }
  return null;
}
