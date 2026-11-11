// The Structure-Mapping Playground's Mapper (kogaki#1665): a structure reading variant, one row of
// `playground-workflow.json`, reads the proposition file and the Persona into a RelationalStructure.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Mapper's structure reading
//       specs/spec-draft-pipeline/SPEC.md
//
import { personaPriorKnowledgeLine } from "../compose.mjs";
import { validateStructure } from "./structure.mjs";

// A variant is a row whose id carries this prefix.
export const MAPPER_ROW_PREFIX = "sme_map_";

// The call bound of reading and grounding: the first refusal is put back verbatim with the answer, and a second ends the stage.
export const MAPPER_CALLS = 2;

// The variant's row, or a refusal naming the rows the table declares.
export function mapperRow(table, variant) {
  const rows = Object.keys(table).filter((k) => k.startsWith(MAPPER_ROW_PREFIX));
  if (!String(variant).startsWith(MAPPER_ROW_PREFIX) || !table[variant] || !table[variant].judgment_point) {
    return {
      error: `--mapper ${JSON.stringify(variant)} names no \`${MAPPER_ROW_PREFIX}<variant>\` row of the Playground's table — it declares ${rows.join(", ") || "none"}`,
    };
  }
  return { row: { id: variant, ...table[variant] } };
}

export function mapperInput(proposition, persona) {
  return {
    strand: proposition.cite,
    proposition: proposition.proposition,
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
  };
}

// The Mapper's answer, refused or `{}`: the Playground's own structure validator. `inputs` carries
// the proposition file's `cite` and `proposition`.
// A refusal is `{ group, text }` (kogaki#1708).
export function validateMapperAnswer(record, inputs) {
  const v = validateStructure(record, { cite: inputs.cite, proposition: inputs.proposition });
  return v.error ? { group: v.group, text: v.error } : {};
}
