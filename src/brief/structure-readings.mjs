// brief/structure-readings — the Harness's grouping of several structure readings into
// Thesis candidates ordered by agreement (kogaki#1833). Pure: no Call, no file.

import {
  componentsOf,
  depthOf,
  keysRefusal,
  mintStructure,
  partitionComponents,
  validateApex,
  validateReadSet,
} from "../compose/structure.mjs";

// At most this many candidates reach the Thesis question (kogaki#1833 item 7).
export const OFFERED_GROUPS = 3;

// A part's pattern (kogaki#1833 item 4): a relation is the claim it is `from`, a
// higher-order relation the sorted patterns it relates in parentheses, and a part with
// several tops their sorted patterns in square brackets.
export function partPattern(structure, part) {
  const rel = new Map(structure.relations.map((r) => [r.id, r]));
  const higher = new Map(structure.higher_order.map((h) => [h.id, h]));
  const of = (id, seen) => {
    if (rel.has(id)) return String(rel.get(id).from);
    const h = higher.get(id);
    if (!h || seen.has(id)) return "?";
    const next = new Set(seen).add(id);
    return `(${h.relates
      .map((x) => of(x, next))
      .sort()
      .join(", ")})`;
  };
  const tops = part.top.map((id) => of(id, new Set())).sort();
  return tops.length === 1 ? tops[0] : `[${tops.join(", ")}]`;
}

// A part's depth, by the rule `composeThesisCandidates` applies to a candidate.
export function partDepth(structure, part) {
  const higher = new Set(structure.higher_order.map((h) => h.id));
  return part.top.length === 1 && higher.has(part.top[0])
    ? depthOf(structure, part.top[0])
    : 1 + Math.max(0, ...part.top.map((id) => depthOf(structure, id)));
}

// Every connected part of every reading, named `<reading number>-<component>`.
export function readingParts(readings, claims) {
  const parts = [];
  const unconnected = [];
  readings.forEach((structure, i) => {
    const reading = i + 1;
    const { connected, unconnected: loose } = partitionComponents(componentsOf(structure, claims));
    for (const k of connected) {
      parts.push({
        reading,
        key: `${reading}-${k.component}`,
        part: k,
        pattern: partPattern(structure, k),
        depth: partDepth(structure, k),
        reaches: [...k.claims],
      });
    }
    for (const k of loose) unconnected.push({ reading, claims: [...k.claims] });
  });
  return { parts, unconnected };
}

// The groups (kogaki#1833 items 4-6): parts grouped by the set of Strands each reaches,
// each with its standing part and the number of readings that hold one of its parts,
// ordered most readings first, then the deeper standing part, then the earlier reading.
export function groupParts(parts) {
  const byReach = new Map();
  for (const p of parts) {
    const key = [...p.reaches].sort().join(" ");
    if (!byReach.has(key)) byReach.set(key, []);
    byReach.get(key).push(p);
  }
  const groups = [...byReach.values()].map((members) => {
    const count = new Map();
    for (const p of members) count.set(p.pattern, (count.get(p.pattern) || 0) + 1);
    const standing = [...members].sort(
      (a, b) => count.get(b.pattern) - count.get(a.pattern) || b.depth - a.depth || a.reading - b.reading,
    )[0];
    return {
      reaches: [...standing.reaches],
      readings: new Set(members.map((p) => p.reading)).size,
      standing,
      parts: members,
    };
  });
  return groups.sort(
    (a, b) => b.readings - a.readings || b.standing.depth - a.standing.depth || a.standing.reading - b.standing.reading,
  );
}

// The whole grouping over the validated readings: the groups offered, the groups named
// above the question, and the Strands no group reaches.
export function groupReadings(readings, claims) {
  const { parts, unconnected } = readingParts(readings, claims);
  const groups = groupParts(parts);
  const reached = new Set(groups.flatMap((g) => g.reaches));
  return {
    groups,
    offered: groups.slice(0, OFFERED_GROUPS),
    further: groups.slice(OFFERED_GROUPS),
    unreached: claims.map((c) => c.id).filter((id) => !reached.has(id)),
    unconnected,
  };
}

// The agreement a candidate's label carries (kogaki#1833 item 9).
export function agreementLine(m, n) {
  return `${m} of ${n} readings`;
}

// The lines above the Thesis question this grouping owes (kogaki#1833 items 7, 9, 10):
// a failed unit's count, each further group, and each Strand no offered candidate reaches.
export function readingLines({ asked, read, further, offered, claims, reason }) {
  const lines = [];
  if (read < asked) lines.push(`${asked} readings were asked for and ${read} were read.`);
  for (const g of further) {
    lines.push(
      `Not offered: a Thesis over ${g.reaches.join(", ")} — ${agreementLine(g.readings, read)}, after the first ${OFFERED_GROUPS}.`,
    );
  }
  const shown = new Set([...offered, ...further].flatMap((g) => g.reaches));
  for (const id of claims.map((c) => c.id).filter((x) => !shown.has(x))) lines.push(`Not offered: ${id} — ${reason}`);
  return lines;
}

// The Brief file's `structure_agreement` (kogaki#1833 item 12). `holds` names the Roles of
// a part's one top; a part with several tops carries none.
export function structureAgreement({ asked, readings, groups, adoptedKey, holdsOf }) {
  return {
    asked,
    read: readings.length,
    groups: groups.map((g) => ({
      reaches: [...g.reaches],
      readings: g.readings,
      adopted: g.standing.key === adoptedKey,
      parts: g.parts.map((p) => ({
        reading: p.reading,
        pattern: p.pattern,
        depth: p.depth,
        ...(p.part.top.length === 1 ? { holds: holdsOf(readings[p.reading - 1], p.part.top[0]) } : {}),
      })),
    })),
  };
}

// THE STRUCTURE-READING UNIT'S DECLARED VALIDATOR (kogaki#1833), loaded by the detached
// supervisor: the checks the synchronous state ran, over the claims the job was started with.
export function validateStructureReadingUnit(entry, inputs) {
  const m = mintStructure(entry);
  if (m.text) return { error: m.text };
  const v = validateReadSet(m.structure, (inputs || {}).claims || [], { thesis: false, considered: true });
  return v.text ? { error: v.text } : null;
}

// The validated structure of a unit's record, as the validator above minted it.
export function readingOf(entry) {
  return mintStructure(entry).structure;
}

// THE APEX RECORD OVER PARTS OF SEVERAL READINGS (kogaki#1833 item 8): each apex is checked by
// `validateApex` against the reading its part comes from, its part named `<reading>-<component>`.
export function validateApexAcross(answer, parts, readingOfPart) {
  const b = keysRefusal(answer, ["apexes"], "the answer");
  if (b) return { group: "shape", text: b };
  if (!Array.isArray(answer.apexes)) return { group: "shape", text: "the answer's `apexes` is not a list" };
  const known = new Set(parts.map((k) => k.component));
  const stray = answer.apexes.findIndex((a) => !a || typeof a !== "object" || !known.has(a.component));
  if (stray >= 0) return validateApex({ apexes: [answer.apexes[stray]] }, [], readingOfPart(parts[0]));
  const byReading = new Map();
  for (const k of parts) {
    const r = k.component.split("-")[0];
    if (!byReading.has(r)) byReading.set(r, []);
    byReading.get(r).push(k);
  }
  for (const ks of byReading.values()) {
    const mine = new Set(ks.map((k) => k.component));
    const v = validateApex({ apexes: answer.apexes.filter((a) => mine.has(a.component)) }, ks, readingOfPart(ks[0]));
    if (v.text) return v;
  }
  return {};
}
