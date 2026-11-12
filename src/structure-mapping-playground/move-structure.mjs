// The short Trial's Brief-Leg route (kogaki#1830): the Leg's structure read from an adopted Brief, and the two answers
// the route's model calls give, the Move's structure and its pairing with the Leg, refused or accepted.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   The short Trial
//       specs/spec-draft-pipeline/SPEC.md
//
import { readAdoptedBrief } from "../paragraph-plan/brief.mjs";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const isText = (v) => typeof v === "string" && v.trim() !== "";
export const SOURCES = ["target", "base"];
const MOVE_KEYS = ["roles", "relations", "higher_order", "segments"];
const ROLE_KEYS = ["id", "context", "attributes", "source"];
const RELATION_KEYS = ["id", "between", "holds"];
const HIGHER_KEYS = ["id", "relates", "holds"];
const SEGMENT_KEYS = ["segment", "states"];
const PAIR_KEYS = ["role_pairs", "relation_pairs"];

const refuse = (group, text) => ({ group, text });

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !Object.hasOwn(obj, k));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// ---------------------------------------------------------------------------
// THE LEG'S STRUCTURE, read from the Brief with no model call.

// Every element a relation or higher-order relation reaches: itself, the relations it relates and their Roles.
function reached(structure, id) {
  const relation = new Map((structure.relations || []).map((r) => [r.id, r]));
  const higher = new Map((structure.higher_order || []).map((h) => [h.id, h]));
  const roles = new Set();
  const relations = new Set();
  const highers = new Set();
  const walk = (x) => {
    if (relation.has(x)) {
      if (relations.has(x)) return;
      relations.add(x);
      for (const r of relation.get(x).between || []) roles.add(r);
    } else if (higher.has(x)) {
      if (highers.has(x)) return;
      highers.add(x);
      (higher.get(x).relates || []).forEach(walk);
    }
  };
  walk(id);
  return { roles, relations, highers };
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
      .map((x) => pick(x, ["id", "name", "between", "holds"])),
    higher_order: (structure.higher_order || [])
      .filter((x) => r.highers.has(x.id))
      .map((x) => pick(x, ["id", "name", "relates", "holds"])),
  };
}

// The Brief's Leg as this route reads it: `{ record, leg, structure }`, or `{ error }` naming the value refused.
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
  if (!structure.relations.length && !structure.higher_order.length)
    return {
      error: `the Brief's Leg ${legId} names the relation ${JSON.stringify(leg.relation)}, which its \`structure\` does not carry`,
    };
  return { record: b.record, leg, structure };
}

// ---------------------------------------------------------------------------
// THE MOVE'S STRUCTURE, the `smp_read_move` answer: refused naming the place, or null.

export function validateMoveStructure(answer, segmentCount) {
  const top = keysRefusal(answer, MOVE_KEYS, "the move structure");
  if (top) return refuse("shape", top);
  const ids = new Set();
  const roleIds = new Set();
  const relationIds = new Set();
  const idRefusal = (x, at) => (!isText(x.id) || ids.has(x.id) ? `${at}'s \`id\` is empty or repeated` : null);
  for (const key of ["roles", "relations", "higher_order"])
    if (!Array.isArray(answer[key])) return refuse("shape", `the move structure's \`${key}\` is not a list`);
  if (!answer.roles.length) return refuse("shape", "the move structure's `roles` is empty");
  for (const [i, r] of answer.roles.entries()) {
    const at = `roles[${i}]`;
    const bad = keysRefusal(r, ROLE_KEYS, at) || idRefusal(r, at);
    if (bad) return refuse("shape", bad);
    if (!SOURCES.includes(r.source))
      return refuse(
        "shape",
        `the Role ${JSON.stringify(r.id)}'s \`source\` ${JSON.stringify(r.source)} is neither \`target\` nor \`base\``,
      );
    ids.add(r.id);
    roleIds.add(r.id);
  }
  for (const [i, r] of answer.relations.entries()) {
    const at = `relations[${i}]`;
    const bad = keysRefusal(r, RELATION_KEYS, at) || idRefusal(r, at);
    if (bad) return refuse("shape", bad);
    if (!Array.isArray(r.between) || !r.between.length)
      return refuse("shape", `the relation ${JSON.stringify(r.id)} names no Role in \`between\``);
    const stray = r.between.find((x) => !roleIds.has(x));
    if (stray !== undefined)
      return refuse(
        "shape",
        `the relation ${JSON.stringify(r.id)}'s \`between\` names ${JSON.stringify(stray)}, which is no Role`,
      );
    ids.add(r.id);
    relationIds.add(r.id);
  }
  for (const [i, h] of answer.higher_order.entries()) {
    const at = `higher_order[${i}]`;
    const bad = keysRefusal(h, HIGHER_KEYS, at) || idRefusal(h, at);
    if (bad) return refuse("shape", bad);
    if (!Array.isArray(h.relates) || !h.relates.length)
      return refuse("shape", `the higher-order relation ${JSON.stringify(h.id)} names no relation in \`relates\``);
    const stray = h.relates.find((x) => !relationIds.has(x));
    if (stray !== undefined)
      return refuse(
        "shape",
        `the higher-order relation ${JSON.stringify(h.id)}'s \`relates\` names ${JSON.stringify(stray)}, which is no relation before it`,
      );
    ids.add(h.id);
    relationIds.add(h.id);
  }
  const segments = answer.segments;
  if (!Array.isArray(segments) || segments.length !== segmentCount)
    return refuse(
      "segments",
      `the move structure's \`segments\` carries ${Array.isArray(segments) ? segments.length : "no list of"} entries, and the Move has ${segmentCount} Segments — one entry per Segment, in order`,
    );
  const stated = new Set();
  for (const [i, s] of segments.entries()) {
    const at = `segments[${i}]`;
    const bad = keysRefusal(s, SEGMENT_KEYS, at);
    if (bad) return refuse("segments", bad);
    if (s.segment !== i + 1)
      return refuse(
        "segments",
        `${at}'s \`segment\` is ${JSON.stringify(s.segment)}, and the entry in its place is Segment ${i + 1}`,
      );
    if (!Array.isArray(s.states)) return refuse("segments", `${at}'s \`states\` is not a list`);
    const stray = s.states.find((x) => !ids.has(x));
    if (stray !== undefined)
      return refuse(
        "states",
        `Segment ${i + 1}'s \`states\` names ${JSON.stringify(stray)}, which names nothing of the move structure`,
      );
    s.states.forEach((x) => stated.add(x));
  }
  const unstated = [...ids].find((x) => !stated.has(x));
  if (unstated !== undefined)
    return refuse(
      "states",
      `${JSON.stringify(unstated)} is stated by no Segment — every Role and relation is stated by one`,
    );
  return null;
}

// ---------------------------------------------------------------------------
// THE PAIRING, the `smp_pair_roles` answer: refused naming the pair, or null. A null is not a refusal.

const relationsOf = (s) => [...(s.relations || []), ...(s.higher_order || [])];
// The Roles a relation or higher-order relation holds, through the relations it relates.
const rolesHeld = (s, id) => reached(s, id).roles;

export function validatePairing(answer, moveStructure, legStructure) {
  const top = keysRefusal(answer, PAIR_KEYS, "the pairing");
  if (top) return refuse("shape", top);
  for (const key of PAIR_KEYS)
    if (!Array.isArray(answer[key])) return refuse("shape", `the pairing's \`${key}\` is not a list`);
  const moveRoles = new Map(moveStructure.roles.map((r) => [r.id, r]));
  const moveRelations = new Set(relationsOf(moveStructure).map((r) => r.id));
  const legRoles = new Set(legStructure.roles.map((r) => r.id));
  const legRelations = new Set(relationsOf(legStructure).map((r) => r.id));
  const roleOf = new Map();
  const legRoleUsed = new Map();
  for (const [i, p] of answer.role_pairs.entries()) {
    const at = `role_pairs[${i}]`;
    const bad = keysRefusal(p, ["move_role", "leg_role"], at);
    if (bad) return refuse("pair", bad);
    const r = moveRoles.get(p.move_role);
    if (!r) return refuse("pair", `${at}'s \`move_role\` ${JSON.stringify(p.move_role)} names no Role of the Move`);
    if (r.source === "base")
      return refuse(
        "pair",
        `${at} pairs the Role ${JSON.stringify(p.move_role)}, whose source is \`base\` — the reader's domain supplies it`,
      );
    if (roleOf.has(p.move_role))
      return refuse("pair", `${at} pairs the Role ${JSON.stringify(p.move_role)} a second time`);
    if (p.leg_role !== null) {
      if (!legRoles.has(p.leg_role))
        return refuse("pair", `${at}'s \`leg_role\` ${JSON.stringify(p.leg_role)} names no Role of the Leg`);
      if (legRoleUsed.has(p.leg_role))
        return refuse(
          "pair",
          `${at} names the Leg Role ${JSON.stringify(p.leg_role)}, which role_pairs[${legRoleUsed.get(p.leg_role)}] already names`,
        );
      legRoleUsed.set(p.leg_role, i);
    }
    roleOf.set(p.move_role, p.leg_role);
  }
  const missingRole = moveStructure.roles.find((r) => r.source === "target" && !roleOf.has(r.id));
  if (missingRole) return refuse("pair", `role_pairs carries no pair for the Role ${JSON.stringify(missingRole.id)}`);
  const relationOf = new Map();
  const legRelationUsed = new Map();
  for (const [i, p] of answer.relation_pairs.entries()) {
    const at = `relation_pairs[${i}]`;
    const bad = keysRefusal(p, ["move_relation", "leg_relation"], at);
    if (bad) return refuse("pair", bad);
    if (!moveRelations.has(p.move_relation))
      return refuse(
        "pair",
        `${at}'s \`move_relation\` ${JSON.stringify(p.move_relation)} names no relation of the Move`,
      );
    if (relationOf.has(p.move_relation))
      return refuse("pair", `${at} pairs the relation ${JSON.stringify(p.move_relation)} a second time`);
    if (p.leg_relation !== null) {
      if (!legRelations.has(p.leg_relation))
        return refuse(
          "pair",
          `${at}'s \`leg_relation\` ${JSON.stringify(p.leg_relation)} names no relation of the Leg`,
        );
      if (legRelationUsed.has(p.leg_relation))
        return refuse(
          "pair",
          `${at} names the Leg relation ${JSON.stringify(p.leg_relation)}, which relation_pairs[${legRelationUsed.get(p.leg_relation)}] already names`,
        );
      legRelationUsed.set(p.leg_relation, i);
      const held = rolesHeld(legStructure, p.leg_relation);
      const off = [...rolesHeld(moveStructure, p.move_relation)].find((r) => {
        const paired = roleOf.get(r);
        return paired !== undefined && paired !== null && !held.has(paired);
      });
      if (off !== undefined)
        return refuse(
          "pair",
          `${at} pairs ${JSON.stringify(p.move_relation)} with ${JSON.stringify(p.leg_relation)}, and the Move Role ${JSON.stringify(off)} of the one is paired with ${JSON.stringify(roleOf.get(off))}, which the other does not hold`,
        );
    }
    relationOf.set(p.move_relation, p.leg_relation);
  }
  const missingRelation = [...moveRelations].find((x) => !relationOf.has(x));
  if (missingRelation !== undefined)
    return refuse("pair", `relation_pairs carries no pair for the relation ${JSON.stringify(missingRelation)}`);
  return null;
}

// What the pairing leaves unmatched, written by the Harness: the Move's elements paired with null, and the Leg's no pair names.
export function unmatchedOf(pairing, legStructure) {
  const namedRoles = new Set(pairing.role_pairs.map((p) => p.leg_role).filter((x) => x !== null));
  const namedRelations = new Set(pairing.relation_pairs.map((p) => p.leg_relation).filter((x) => x !== null));
  return {
    move_roles: pairing.role_pairs.filter((p) => p.leg_role === null).map((p) => p.move_role),
    move_relations: pairing.relation_pairs.filter((p) => p.leg_relation === null).map((p) => p.move_relation),
    leg_roles: legStructure.roles.map((r) => r.id).filter((x) => !namedRoles.has(x)),
    leg_relations: relationsOf(legStructure)
      .map((r) => r.id)
      .filter((x) => !namedRelations.has(x)),
  };
}

// What one Move element is paired with on the sheet: the Leg's id, `unmatched`, or `base` for a Role the reader's domain supplies.
export function pairedWith(id, moveStructure, pairing) {
  const rp = pairing.role_pairs.find((p) => p.move_role === id);
  if (rp) return rp.leg_role === null ? "unmatched" : rp.leg_role;
  const lp = pairing.relation_pairs.find((p) => p.move_relation === id);
  if (lp) return lp.leg_relation === null ? "unmatched" : lp.leg_relation;
  return moveStructure.roles.some((r) => r.id === id) ? "base" : "unmatched";
}
