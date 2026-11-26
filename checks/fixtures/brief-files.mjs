// A fixture Brief written as an adopted Brief's three files (kogaki#1955). A record carrying no `structure` is given
// one: two Roles, and one relation between them per Leg whose `holds` is the Leg's `text`, the Leg marked
// `reaches_target` (or the last) naming the relation `attains_thesis` names. Returns the three texts in order, the one
// hash's input.
import { writeBriefFiles } from "../../src/compose.mjs";

export function withStructure(record) {
  if (record.structure) return record;
  const legs = record.reader_path || [];
  const relations = legs.map((l, i) => ({
    id: `c_${i + 1}`,
    name: `leg_${i + 1}`,
    between: ["r_1", "r_2"],
    holds: l.text,
    from: (l.claims && l.claims[0] && l.claims[0].strand) || "L1",
  }));
  const marked = legs.findIndex((l) => l.reaches_target === true);
  const target = marked === -1 ? legs.length - 1 : marked;
  return {
    ...record,
    structure: {
      roles: [
        { id: "r_1", name: "subject", context: "The fixture's one Role.", attributes: [], claims: ["L1"] },
        { id: "r_2", name: "object", context: "The fixture's second Role.", attributes: [], claims: ["L1"] },
      ],
      relations,
      attains_thesis: `c_${target + 1}`,
      reach: relations.map((r) => r.id),
      unreached: { relations: [], claims: [] },
    },
    reader_path: legs.map((l, i) => ({ ...l, relation: `c_${i + 1}` })),
  };
}

export function writeBriefFixture(briefPath, record) {
  const t = writeBriefFiles(briefPath, withStructure(record));
  return t.brief + t.structure + t.readerPath;
}
