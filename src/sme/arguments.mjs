// sme/arguments — a Relation of a RelationalStructure as its Arguments and its CentralClaim (kogaki#1865). No model
// call is made here.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the ParagraphPlan stage
//       specs/spec-draft-pipeline/SPEC.md
//
import { relationsAmongRelations, relationsAmongRoles } from "./structure.mjs";

// THE SENTENCES, read from the Brief with no model call: the Arguments in the order the relation lists them, then
// the CentralClaim. A relation's text is its `holds` with each `{<Role id>}` written as the Role's `name`; a Role's
// text is its `context`.

export function legSentences(structure, relationId) {
  const roles = new Map(structure.roles.map((r) => [r.id, r]));
  const relations = new Map(structure.relations.map((r) => [r.id, r]));
  const named = (holds) => holds.replace(/\{([^{}]+)\}/g, (m, id) => (roles.has(id) ? roles.get(id).name : m));
  const central = relations.get(relationId);
  const args = Object.hasOwn(central, "relates")
    ? central.relates.map((id) => ({ id, sentence: named(relations.get(id).holds) }))
    : central.between.map((id) => ({ id, sentence: roles.get(id).context }));
  return [
    ...args.map((a, k) => ({ number: k + 1, id: a.id, kind: "Argument", sentence: a.sentence })),
    { number: args.length + 1, id: relationId, kind: "CentralClaim", sentence: named(central.holds) },
  ];
}

// THE ROWS OF A LEG'S STRUCTURE, read from the Brief with no model call: everything the Leg's relation reaches, as
// Roles, then Relations, then HigherOrderRelations, each in the order of the Brief's lists. A sentence keeps its braces, and a
// HigherOrderRelation's row carries the kind `Relation` (specs/spec-draft-pipeline/SPEC.md, the plan block).
export function legRows(structure, relationId) {
  const relation = new Map(relationsAmongRoles(structure).map((r) => [r.id, r]));
  const higher = new Map(relationsAmongRelations(structure).map((h) => [h.id, h]));
  const reached = new Set();
  const walk = (id) => {
    if (reached.has(id)) return;
    reached.add(id);
    if (higher.has(id)) higher.get(id).relates.forEach(walk);
    else if (relation.has(id)) relation.get(id).between.forEach((r) => reached.add(r));
  };
  walk(relationId);
  const one = (s) => String(s).replace(/\s+/g, " ").trim().replace(/\|/g, "\\|");
  const braces = (ids) => ids.map((id) => `{${id}}`).join(", ");
  const row = (e, kind, args, sentence) => ({
    symbol: `{${e.id}}`,
    name: e.name,
    kind,
    arguments: braces(args),
    sentence: one(sentence),
  });
  return [
    ...structure.roles.filter((r) => reached.has(r.id)).map((r) => row(r, "Role", [], r.context)),
    ...relationsAmongRoles(structure)
      .filter((r) => reached.has(r.id))
      .map((r) => row(r, "Relation", r.between, r.holds)),
    ...relationsAmongRelations(structure)
      .filter((h) => reached.has(h.id))
      .map((h) => row(h, "Relation", h.relates, h.holds_over_relations ?? h.holds)),
  ];
}
