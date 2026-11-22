// Case (dj) of checks/check-brief-mint.sh, over the apex written for a component with several tops (kogaki#1941):
// the `apex` answer carries `holds_over_relations`, the sentence rides the candidate and the run state to adoption,
// the adopted apex carries it and the Writer's row for the Leg that states the Thesis shows it. Returns the failures.
import { validateApex, withApex } from "../../../src/compose/structure.mjs";
import { thesisGateOptions } from "../../../src/brief/candidates.mjs";
import { legRows } from "../../../src/sme/arguments.mjs";

export function writtenApexCases({
  structure,
  claims,
  connected,
  k2,
  written,
  candidates,
  multi,
  adoptedMulti,
  runState,
}) {
  const fails = [];
  const multiTop = connected.filter((k) => k.top.length > 1);
  const whole = validateApex({ apexes: [written] }, multiTop, structure);
  if (JSON.stringify(k2.top) !== '["c_11","c_12"]' || whole.text) {
    fails.push(
      `(dj) an apex answer writing each of its tops c_11 and c_12 in braces was refused: ${JSON.stringify([k2.top, whole])}`,
    );
  }
  const { holds_over_relations: overTops, ...keyless } = written;
  const refused = [
    ["no `holds_over_relations`", keyless, "its `holds_over_relations` is missing"],
    [
      "an empty `holds_over_relations`",
      { ...written, holds_over_relations: " " },
      "its `holds_over_relations` is empty",
    ],
    [
      "a `holds_over_relations` that leaves out {c_12}",
      { ...written, holds_over_relations: "{c_11} holds of the record the clock stamps." },
      "its `holds_over_relations` writes no {c_12}, a relation its `relates` names",
    ],
    [
      "a `holds_over_relations` that writes {r_4} too",
      { ...written, holds_over_relations: `${overTops} {r_4} is that record.` },
      "its `holds_over_relations` writes {r_4}, which is neither of the two its `relates` names",
    ],
  ];
  for (const [what, apex, want] of refused) {
    const v = validateApex({ apexes: [apex] }, multiTop, structure);
    if (!v.text || !v.text.includes(`the apex of ${k2.component}: ${want}`)) {
      fails.push(
        `(dj) an apex answer carrying ${what} was not refused naming the component ${k2.component}: ${JSON.stringify(v)}`,
      );
    }
  }
  const braced = (options) => /[{}]/.test(options.map((o) => o.label).join(""));
  if (
    !multi ||
    multi.apex.holds_over_relations !== overTops ||
    multi.thesis !== written.holds ||
    braced(thesisGateOptions(candidates))
  ) {
    fails.push(
      `(dj) the written apex's candidate does not carry its sentence over relations, or the Thesis read at the gate is not its \`holds\`: ${JSON.stringify(multi)}`,
    );
  }
  if (
    adoptedMulti.attains_thesis !== "c_13" ||
    !adoptedMulti.relations.some((h) => h.id === "c_13" && h.name === "ax_log" && !Object.hasOwn(h, "from"))
  ) {
    fails.push(
      `(dj) a multi-top adoption did not carry the written apex: ${JSON.stringify(adoptedMulti.relations.map((h) => h.id))}`,
    );
  }
  const rowOf = (s) => legRows(s, s.attains_thesis).find((r) => r.symbol === `{${s.attains_thesis}}`);
  const apexRow = rowOf(adoptedMulti);
  const want = {
    id: "c_13",
    name: "ax_log",
    relates: ["c_11", "c_12"],
    holds: written.holds,
    holds_over_relations: overTops,
  };
  if (
    JSON.stringify(adoptedMulti.relations.find((h) => h.id === "c_13")) !== JSON.stringify(want) ||
    !apexRow ||
    apexRow.sentence !== overTops ||
    apexRow.arguments !== "{c_11}, {c_12}"
  ) {
    fails.push(
      `(dj) the adopted apex does not carry its sentence over relations, or its row does not show it: ${JSON.stringify([adoptedMulti.relations.at(-1), apexRow])}`,
    );
  }
  // An apex composed before the answer carried the key is adopted as it stands, and its row shows `holds`.
  const earlier = withApex(structure, { name: keyless.name, relates: keyless.relates, holds: keyless.holds }, claims);
  if (Object.hasOwn(earlier.relations.at(-1), "holds_over_relations") || rowOf(earlier).sentence !== written.holds) {
    fails.push(
      `(dj) an apex composed with no sentence over relations is not adopted as it stands, its row showing \`holds\`: ${JSON.stringify([earlier.relations.at(-1), rowOf(earlier)])}`,
    );
  }
  const t2 = (runState.thesis_candidates || []).find((x) => x.id === multi.id);
  if (!t2 || t2.apex.holds_over_relations !== overTops || braced(runState.gate.options)) {
    fails.push(
      `(dj) the run state does not carry the written apex's sentence over relations to adoption, or the gate prints it: ${JSON.stringify(t2)}`,
    );
  }
  return fails;
}
