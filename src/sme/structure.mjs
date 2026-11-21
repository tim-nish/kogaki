// sme/structure — the RelationalStructure a claim set is read into (kogaki#1764, kogaki#1768): the ids given to the
// answer of the one structure call and the check of that answer. `/brief` and the Leg-Planning Playground make the
// call; no model call is made here.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   RelationalStructure
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
export const ELEMENT_NAME = /^[a-z][a-z0-9_]*$/;
const NAME = ELEMENT_NAME;
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
  const overRelations = (h) => (typeof h === "string" ? h.replace(/\{([^}]+)\}/g, (m, n) => `{${related(n)}}`) : h);
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
      ...(Object.hasOwn(h, "holds_over_relations")
        ? { holds_over_relations: overRelations(h.holds_over_relations) }
        : {}),
    })),
    ...(Object.hasOwn(answer, "attains_thesis")
      ? { attains_thesis: ids.higher_order.get(answer.attains_thesis) ?? answer.attains_thesis }
      : {}),
    ...(Array.isArray(answer.considered)
      ? {
          considered: answer.considered.map((c) =>
            isMap(c) && Array.isArray(c.relations) ? { ...c, relations: c.relations.map(related) } : c,
          ),
        }
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
// names — carries no `from` (kogaki#1772). `considered: true` is the Brief's read too (kogaki#1817).
export function validateReadSet(record, claims, { thesis = true, considered = false } = {}) {
  const derived = isMap(record) ? ["reach", "unreached"].find((k) => Object.hasOwn(record, k)) : undefined;
  if (derived)
    return shape(`the structure carries \`${derived}\` — it is derived from \`attains_thesis\`, never written`);
  const bad = keysRefusal(
    record,
    [
      "roles",
      "relations",
      "higher_order",
      ...(thesis ? ["attains_thesis"] : []),
      ...(considered ? ["considered"] : []),
    ],
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
    if (!Array.isArray(r.between) || r.between.length !== 2 || r.between.some((x) => !roleIds.has(x))) {
      return shape(`${at}'s \`between\` does not name exactly two Roles`);
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
      keysRefusal(
        h,
        ["id", "name", "relates", "holds", ...(apex ? [] : ["holds_over_relations", "from"])],
        `higher_order[${i}]`,
      ) ||
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
    if (h.id !== apexId && h.relates.length !== 2) return shape(`${at} does not relate exactly two relations`);
    const stray = h.relates.find((x) => !relationIds.has(x) && !higherIds.has(x));
    if (stray !== undefined)
      return shape(`${at} relates ${JSON.stringify(stray)}, which names no relation or higher-order relation`);
    if (!isText(h.holds)) return shape(`${at}'s \`holds\` is empty`);
    if (h.id === apexId) continue;
    const over = overRelationsRefusal(h, new Map([...relations, ...higher].map((x) => [x.id, x.name])));
    if (over) return shape(`${at}'s \`holds_over_relations\` ${over}`);
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
  if (considered) {
    const text = consideredRefusal(record.considered, relations, higher, claimIds);
    if (text) return shape(text);
  }
  return {};
}

// A HIGHER-ORDER RELATION'S SENTENCE OVER THE RELATIONS IT RELATES, refused as the words after the field's name, or
// `null`: one sentence carrying `{<id>}` for each of the two `relates` names and no other braces.
function overRelationsRefusal(h, nameOf) {
  if (!isText(h.holds_over_relations)) return "is empty";
  const written = [...h.holds_over_relations.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  const absent = h.relates.find((x) => !written.includes(x));
  if (absent !== undefined) return `writes no {${nameOf.get(absent)}}, a relation its \`relates\` names`;
  const stray = written.find((x) => !h.relates.includes(x));
  if (stray !== undefined)
    return `writes {${nameOf.get(stray) ?? stray}}, which is neither of the two its \`relates\` names`;
  return null;
}

// THE VERDICTS A CONSIDERED ROW CARRIES (kogaki#1817).
export const CONSIDERED_VERDICTS = Object.freeze(["connected", "not_connected"]);
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

// THE CONNECTIONS THE READ WEIGHED (kogaki#1817), refused naming the row or the element, or `null`.
function consideredRefusal(rows, relations, higher, claimIds) {
  if (!Array.isArray(rows)) return "the structure's `considered` is not a list";
  const known = new Map([...relations, ...higher].map((x) => [x.id, x]));
  const nameOf = (id) => JSON.stringify(known.get(id)?.name ?? id);
  for (const [i, c] of rows.entries()) {
    const at = `considered[${i}]`;
    const bad = keysRefusal(c, ["relations", "criterion", "verdict", "why"], at);
    if (bad) return bad;
    if (!Array.isArray(c.relations) || c.relations.length < 2) return `${at} names fewer than two relations`;
    const stray = c.relations.find((x) => !known.has(x));
    if (stray !== undefined)
      return `${at} names ${JSON.stringify(stray)}, which names no relation or higher-order relation`;
    if (!listOf(c.criterion) || c.criterion.some((x) => !claimIds.has(x)))
      return `${at}'s \`criterion\` is not a non-empty list of claim ids`;
    if (!CONSIDERED_VERDICTS.includes(c.verdict))
      return `${at}'s \`verdict\` ${JSON.stringify(c.verdict)} is not ${CONSIDERED_VERDICTS.join(" or ")}`;
    if (!isText(c.why)) return `${at}'s \`why\` is empty`;
    const written = higher.find((h) => sameSet(h.relates, c.relations));
    if (c.verdict === "connected" && !written)
      return `${at} is \`connected\` and no higher-order relation relates ${c.relations.map(nameOf).join(", ")}`;
    if (c.verdict === "not_connected" && written)
      return `${at} is \`not_connected\` and ${named("higher_order", written)} relates exactly those`;
  }
  const unrowed = higher.find((h) => !rows.some((c) => c.verdict === "connected" && sameSet(h.relates, c.relations)));
  if (unrowed) return `${named("higher_order", unrowed)} carries no \`connected\` row under \`considered\``;
  const absent = relations.find((r) => !rows.some((c) => c.relations.includes(r.id)));
  if (absent) return `${named("relations", absent)} stands in no row under \`considered\``;
  return null;
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
