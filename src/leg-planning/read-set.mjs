// The Leg-Planning Playground's own records, read and refused (kogaki#1764): the claims file and the file
// `/paragraph-plan` reads. The structure, the Waypoints and the Legs are read by `src/compose/structure.mjs` (kogaki#1768).
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The Leg-Planning Playground
//       specs/spec-draft-pipeline/SPEC.md
//
import { briefLegs } from "../compose/record.mjs";
import { validateLegs } from "../compose/leg-schema.mjs";

export const COMPOSED_BY = "leg-planning";
const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const CITE = /^\S+::\S+\/\S+@[0-9a-f]{12,}$/;
const KINDS = ["thesis", "cite", "claim"];

// THE CLAIMS FILE: one `thesis:` line, then pairs of a `cite:` line and a `claim:` line, and nothing else. A claim's id is
// `c<n>`, its place in the file.
export function parseClaims(text) {
  const lines = String(text).split("\n").map((l, i) => ({ n: i + 1, text: l })).filter((l) => l.text.trim() !== "");
  const at = (l) => `line ${l.n}, ${JSON.stringify(l.text.trim())}`;
  let thesis = null;
  const claims = [];
  let cite = null;
  for (const l of lines) {
    const m = /^([a-z_]+):(.*)$/.exec(l.text);
    const kind = m ? m[1] : null;
    const value = m ? m[2].trim() : "";
    if (kind === "proposition") return { error: `${at(l)}: the claims file carries a \`proposition:\` line — its sentences are \`claim:\` lines` };
    if (!KINDS.includes(kind)) return { error: `${at(l)}: the claims file carries \`thesis:\`, \`cite:\` and \`claim:\` lines and nothing else` };
    if (!value) return { error: `${at(l)}: the \`${kind}:\` line is empty` };
    if (kind === "thesis") {
      if (thesis !== null) return { error: `${at(l)}: a second \`thesis:\` line — the claims file carries one` };
      if (claims.length || cite) return { error: `${at(l)}: the \`thesis:\` line comes first, before every claim` };
      thesis = value;
    } else if (kind === "cite") {
      if (thesis === null) return { error: `${at(l)}: a \`cite:\` line before the \`thesis:\` line` };
      if (cite) return { error: `line ${cite.n}: the \`cite:\` line carries no \`claim:\` line after it` };
      if (!CITE.test(value)) return { error: `${at(l)}: the \`cite:\` is not a UnitID at a content hash` };
      cite = { n: l.n, value };
    } else {
      if (!cite) return { error: `${at(l)}: a \`claim:\` line with no \`cite:\` line before it` };
      claims.push({ id: `c${claims.length + 1}`, cite: cite.value, claim: value });
      cite = null;
    }
  }
  if (cite) return { error: `line ${cite.n}: the \`cite:\` line carries no \`claim:\` line after it` };
  if (thesis === null) return { error: "the claims file carries no `thesis:` line" };
  if (!claims.length) return { error: "the claims file carries no `cite:` and `claim:` pair" };
  return { thesis, claims };
}

// THE FILE `/paragraph-plan` READS AS A BRIEF'S `reader_path`, refused naming the Leg or `{}`: the Brief's own Leg
// reader over the structure (kogaki#1775).
export function readerPathRefusal(record, structure) {
  if (!isMap(record) || record.composed_by !== COMPOSED_BY) return { error: `the file carries no \`composed_by: ${COMPOSED_BY}\` line` };
  const legs = briefLegs(record);
  if (!legs.length) return { error: "the file carries no Reader Path legs" };
  // The Trial asks no `leg_sections` Call, so the Section grouping is not its to meet (kogaki#1775).
  const v = validateLegs(legs, { structure, sections: false });
  return v.error ? { error: v.error } : {};
}
