// The Structure-Mapping Playground's inputs, read and refused (kogaki#1664): the proposition file and the owner-authored
// RelationalStructure.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Structure-Mapping Playground
//       specs/spec-draft-pipeline/SPEC.md
//

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
const CITE = /^\S+::\S+\/\S+@[0-9a-f]{12,}$/;
// The words a Role's `context` may not carry: a definition names no reader, writer or Persona (kogaki#1720).
const CONTEXT_WORDS = ["reader", "you", "must hold", "must come to", "Persona", "writer"];
const contextWord = (text) => CONTEXT_WORDS.find((w) => new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`, "i").test(text));
// Whether a `holds` sentence carries the placeholder `{<id>}` (kogaki#1720).
const carries = (holds, id) => holds.includes(`{${id}}`);

// The proposition file (kogaki#1685): a `cite:` line and a `proposition:` line, and nothing else.
export function parseProposition(text) {
  const lines = String(text).split("\n");
  const field = (key) => {
    const l = lines.find((x) => x.startsWith(`${key}:`));
    return l === undefined ? null : l.slice(key.length + 1).trim();
  };
  if (field("claim") !== null)
    return { error: "the proposition file carries a `claim:` line — its sentence is the `proposition:` line" };
  const cite = field("cite");
  const proposition = field("proposition");
  if (!cite) return { error: "the proposition file carries no `cite:` line" };
  if (!CITE.test(cite))
    return { error: `the proposition file's \`cite:\` ${JSON.stringify(cite)} is not a UnitID at a content hash` };
  if (!proposition) return { error: "the proposition file carries no `proposition:` line" };
  for (const key of ["cite", "proposition"]) {
    if (lines.filter((l) => l.startsWith(`${key}:`)).length > 1)
      return { error: `the proposition file carries more than one \`${key}:\` line` };
  }
  const last = Math.max(
    lines.findIndex((l) => l.startsWith("cite:")),
    lines.findIndex((l) => l.startsWith("proposition:")),
  );
  const stray = lines.findIndex((l) => l.trim() !== "" && !l.startsWith("cite:") && !l.startsWith("proposition:"));
  if (stray > last)
    return {
      error:
        "the proposition file carries text below its two lines; a Strand's rendering is not an input of the Playground",
    };
  if (stray >= 0)
    return {
      error: `the proposition file carries ${JSON.stringify(lines[stray].trim())} beside its two lines — it carries \`cite:\` and \`proposition:\` and nothing else`,
    };
  return { cite, proposition };
}

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !(k in obj));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// The structure's higher-order relations as a list (kogaki#1678): the list itself, the one-map form read as
// a list of one with id `h1`, or null where `higher_order` is neither.
export function higherOrderOf(record) {
  const h = isMap(record) ? record.higher_order : undefined;
  if (Array.isArray(h)) return h.length ? h : null;
  return isMap(h) ? [{ id: "h1", ...h }] : null;
}

// A TABLE'S POINT (kogaki#1688): the structure's `holds` in order, each `{<Role id>}` replaced by its expression; the
// short Trial's Leg `text` and the Packet's mapped line read it here, so neither reaches the other (kogaki#1784).
export function firstPoint(structure, table) {
  const base = new Map(
    table.correspondences.map((c) => [c.role, c.expression === null ? c.role : String(c.expression).trim()]),
  );
  return [...structure.relations, ...higherOrderOf(structure)]
    .map((e) =>
      String(e.holds)
        .trim()
        .replace(/\{([^{}\s]+)\}/g, (all, id) => (base.has(id) ? base.get(id) : all)),
    )
    .map((h) => h.charAt(0).toUpperCase() + h.slice(1))
    .join(" ");
}

// The RelationalStructure record, refused or `{}`. `proposition` is `parseProposition`'s answer.
// Each refusal carries its group (kogaki#1708): `shape`, `strand`, `attributes` or `context` (kogaki#1720).
export function validateStructure(record, proposition) {
  const bad = keysRefusal(record, ["strand", "roles", "relations", "higher_order"], "the structure");
  if (bad) return { group: "shape", error: bad };
  if (record.strand !== proposition.cite) {
    return {
      group: "strand",
      error: `the structure's \`strand\` ${JSON.stringify(record.strand)} is not the proposition file's \`cite:\` ${JSON.stringify(proposition.cite)}`,
    };
  }
  const ids = new Set();
  const listOf = (key) => (Array.isArray(record[key]) && record[key].length ? record[key] : null);
  const roles = listOf("roles");
  if (!roles) return { group: "shape", error: "the structure's `roles` is not a non-empty list" };
  for (const [i, r] of roles.entries()) {
    const at = `roles[${i}]`;
    const b = keysRefusal(r, ["id", "context", "attributes"], at);
    if (b) return { group: "shape", error: isMap(r) && isText(r.id) ? `${b} (the Role ${JSON.stringify(r.id)})` : b };
    if (!isText(r.id) || ids.has(r.id)) return { group: "shape", error: `${at}'s \`id\` is empty or not unique` };
    if (!isText(r.context)) return { group: "shape", error: `${at}'s \`context\` is empty` };
    const word = contextWord(r.context);
    if (word)
      return {
        group: "context",
        error: `the Role ${JSON.stringify(r.id)}'s \`context\` carries ${JSON.stringify(word)} — a \`context\` defines the Role in the third person and names no reader, writer or Persona`,
      };
    if (!Array.isArray(r.attributes))
      return { group: "attributes", error: `the Role ${JSON.stringify(r.id)}'s \`attributes\` is not a list` };
    for (const [n, a] of r.attributes.entries()) {
      if (!isText(a))
        return {
          group: "attributes",
          error: `the Role ${JSON.stringify(r.id)}'s \`attributes[${n}]\` is empty or not text`,
        };
      if (r.attributes.indexOf(a) !== n)
        return {
          group: "attributes",
          error: `the Role ${JSON.stringify(r.id)}'s \`attributes[${n}]\` repeats ${JSON.stringify(a)}`,
        };
    }
    ids.add(r.id);
  }
  const relations = listOf("relations");
  if (!relations) return { group: "shape", error: "the structure's `relations` is not a non-empty list" };
  const roleIds = new Set(ids);
  const relationIds = new Set();
  for (const [i, r] of relations.entries()) {
    const at = `relations[${i}]`;
    const b = keysRefusal(r, ["id", "between", "holds"], at);
    if (b) return { group: "shape", error: b };
    if (!isText(r.id) || ids.has(r.id)) return { group: "shape", error: `${at}'s \`id\` is empty or not unique` };
    if (!Array.isArray(r.between) || r.between.length !== 2)
      return { group: "shape", error: `${at}'s \`between\` does not name exactly two Roles` };
    const stray = r.between.find((x) => !roleIds.has(x));
    if (stray !== undefined)
      return { group: "shape", error: `${at}'s \`between\` names ${JSON.stringify(stray)}, which is no Role's id` };
    if (!isText(r.holds)) return { group: "shape", error: `${at}'s \`holds\` is empty` };
    const absent = r.between.find((x) => !carries(r.holds, x));
    if (absent !== undefined)
      return {
        group: "shape",
        error: `the relation ${JSON.stringify(r.id)}'s \`holds\` does not carry {${absent}}, a Role its \`between\` names`,
      };
    ids.add(r.id);
    relationIds.add(r.id);
  }
  const higher = higherOrderOf(record);
  if (!higher)
    return {
      group: "shape",
      error:
        "the structure's `higher_order` is neither a `{ relates, holds }` map nor a non-empty list of `{ id, relates, holds }`",
    };
  if (higher.length > 1)
    return {
      group: "shape",
      error: `the structure's \`higher_order\` carries ${higher.length} entries, and a proposition has one higher-order relation`,
    };
  const listed = Array.isArray(record.higher_order);
  for (const [i, h] of higher.entries()) {
    const at = listed ? `higher_order[${i}]` : "higher_order";
    const b = keysRefusal(
      listed ? h : record.higher_order,
      listed ? ["id", "relates", "holds"] : ["relates", "holds"],
      at,
    );
    if (b) return { group: "shape", error: b };
    if (!listed && ids.has(h.id))
      return {
        group: "shape",
        error:
          "higher_order is read as `h1`, which a Role or relation already names: rename that element or write higher_order as a list",
      };
    if (!isText(h.id) || ids.has(h.id)) return { group: "shape", error: `${at}'s \`id\` is empty or not unique` };
    if (!Array.isArray(h.relates) || h.relates.length !== 2)
      return { group: "shape", error: `${at}'s \`relates\` does not name exactly two relations` };
    const stray = h.relates.find((x) => !relationIds.has(x));
    if (stray !== undefined)
      return { group: "shape", error: `${at}'s \`relates\` names ${JSON.stringify(stray)}, which is no relation's id` };
    if (!isText(h.holds)) return { group: "shape", error: `${at}'s \`holds\` is empty` };
    const related = [...new Set(h.relates.flatMap((x) => relations.find((r) => r.id === x).between))];
    if (!related.some((x) => carries(h.holds, x))) {
      return {
        group: "shape",
        error: `${at}'s \`holds\` carries none of ${related.map((x) => `{${x}}`).join(", ")}, the Roles its relations relate`,
      };
    }
    ids.add(h.id);
  }
  return {};
}
