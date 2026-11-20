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

// THE SENTENCES, read from the Brief with no model call: the Arguments in the order the relation lists them, then
// the CentralClaim. A relation's text is its `holds` with each `{<Role id>}` written as the Role's `name`; a Role's
// text is its `context`.

export function legSentences(structure, relationId) {
  const roles = new Map(structure.roles.map((r) => [r.id, r]));
  const relations = new Map([...structure.relations, ...structure.higher_order].map((r) => [r.id, r]));
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
