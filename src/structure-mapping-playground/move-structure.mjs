// The short Trial's Brief-Leg route (kogaki#1830, kogaki#1922): the Leg's structure read from an adopted Brief, and the
// move structure and the pairing the Harness writes from the Move file's Bind targets.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readAdoptedBrief } from "../paragraph-plan/brief.mjs";
import { sha256 } from "../compose/record.mjs";
import { legSentences } from "../sme/arguments.mjs";
import { bindTargetsOf } from "../paragraph-plan/move-choice.mjs";
import { relationsAmongRelations, relationsAmongRoles } from "../sme/structure.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);

// ---------------------------------------------------------------------------
// THE LEG'S STRUCTURE, read from the Brief with no model call.

// Every element a relation or higher-order relation reaches: itself, the relations it relates and their Roles.
function reached(structure, id) {
  const relation = new Map(relationsAmongRoles(structure).map((r) => [r.id, r]));
  const higher = new Map(relationsAmongRelations(structure).map((h) => [h.id, h]));
  const roles = new Set();
  const relations = new Set();
  const walk = (x) => {
    if (relations.has(x)) return;
    if (relation.has(x)) {
      relations.add(x);
      for (const r of relation.get(x).between || []) roles.add(r);
    } else if (higher.has(x)) {
      relations.add(x);
      (higher.get(x).relates || []).forEach(walk);
    }
  };
  walk(id);
  return { roles, relations };
}

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => Object.hasOwn(obj, k)).map((k) => [k, obj[k]]));

export function legStructureOf(structure, relationId) {
  const r = reached(structure, relationId);
  return {
    roles: (structure.roles || [])
      .filter((x) => r.roles.has(x.id))
      .map((x) => pick(x, ["id", "name", "context", "attributes"])),
    relations: (structure.relations || [])
      .filter((x) => r.relations.has(x.id))
      .map((x) => pick(x, ["id", "name", "between", "relates", "holds", "holds_over_relations"])),
  };
}

// The Brief's Leg as this route reads it: `{ record, leg, structure, renamed, sha256 }`, or `{ error }` naming the value
// refused; `renamed` the ids of a Brief stored under two lists, as `readAdoptedBrief` renamed them (kogaki#1937), and
// `sha256` the one hash of the Brief's three files (kogaki#1955).
export function readBriefLeg(briefPath, legId) {
  const b = readAdoptedBrief(briefPath);
  if (b.error) return { error: b.error };
  const s = b.record.structure;
  if (!isMap(s) || !Array.isArray(s.relations))
    return {
      error: `the Brief at ${briefPath} carries no \`structure\` — it is of the shape before kogaki#1775, and its Legs name no relation to read`,
    };
  const leg = b.legs.find((l) => l.leg_id === legId);
  if (!leg)
    return {
      error: `--leg ${JSON.stringify(legId)} names no Leg of the Brief at ${briefPath} — it carries ${b.legs.map((l) => l.leg_id).join(", ")}`,
    };
  const structure = legStructureOf(s, leg.relation);
  if (!structure.relations.length)
    return {
      error: `the Brief's Leg ${legId} names the relation ${JSON.stringify(leg.relation)}, which its \`structure\` does not carry`,
    };
  return { record: b.record, leg, structure, renamed: b.renamed, sha256: sha256(b.text) };
}

// ---------------------------------------------------------------------------
// THE SENTENCES are the Engine's (kogaki#1865): `legSentences` of src/sme/arguments.mjs.
export { legSentences };

// ---------------------------------------------------------------------------
// THE MOVE'S SEGMENTS (kogaki#1880), each carrying `bind` and `edges` as its Move file holds them.

// THE MOVE STRUCTURE THE MOVE FILE GIVES: the number of its Bind targets, and per Segment the one it is given.
export function edgesMoveStructure(segments) {
  return {
    binds: bindTargetsOf({ segments }),
    segments: segments.map((s, i) => ({ segment: i + 1, bind: s.bind })),
  };
}

// THE PAIRING A FILLING GIVES (kogaki#1953): Bind target k is given the entry of `legSentences` that `filling[k]`
// numbers. `inOrder(t)` is the filling that gives Bind target k entry k, for a Move of `t` Bind targets.
export const inOrder = (targets) => Object.fromEntries(Array.from({ length: targets }, (_, k) => [k + 1, k + 1]));

export function pairByFilling(legStructure, relationId, filling) {
  const sentences = legSentences(legStructure, relationId);
  return {
    binds: Object.keys(filling)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => ({ bind: k, kind: sentences[filling[k] - 1].kind, leg: sentences[filling[k] - 1].id })),
  };
}
