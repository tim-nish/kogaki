// compose/fill — the fill: reader_path, strand_coverage, journey_coverage
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg's shape; the claims rule;
//       the durable home and the entry point;
//       journey register as a Candidate axis
//
import { validateLegs } from "./leg-schema.mjs";
import { briefJourneyStrands, briefStrandIds, fillSlot, legRecord, placements } from "./record.mjs";

// ---- the fill: reader_path, strand_coverage, journey_coverage ----
// Pure over the record; exported for the check. Returns `{ record, placed,
// total }` or `{ error }`.
export function fillBrief(record, { legs, coverage = {}, renderings = null }) {
  // THE LEGS ARE READ UNDER THE BRIEF'S STRUCTURE WHERE IT CARRIES ONE
  // (kogaki#1775): every Leg then names the relation it serves and says it.
  const v = validateLegs(legs, { structure: record.structure || null });
  if (v.error) return { error: v.error };
  legs = v.legs;
  // THE RENDERINGS RECORD (kogaki#1494), written beside the Reader Path
  // composed under it. A caller with no record writes none.
  if (renderings !== null) {
    if (
      !Array.isArray(renderings) ||
      renderings.some((e) => !e || typeof e.term !== "string" || typeof e.as !== "string")
    ) {
      return {
        error: `the renderings record is a list of { term, as } entries; received ${JSON.stringify(renderings)} (kogaki#1494)`,
      };
    }
  }
  const strandIds = briefStrandIds(record);
  if (strandIds.length === 0) return { error: "the Brief carries no Strands — not a minted Brief" };
  for (const s of legs) {
    for (const g of s.claims) {
      if (!strandIds.includes(g.strand)) {
        return {
          error: `leg ${s.leg_id}: strand claim ${g.strand} is outside the closed set (${strandIds.join(", ")})`,
        };
      }
    }
  }

  // STRAND COVERAGE (kogaki#1768): `used_by_legs` DERIVED from the Legs'
  // claims; a Strand the mint recorded as not carried keeps that entry, and a
  // Strand neither carried nor so recorded discloses rather than silently drops.
  const place = placements(legs, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  const minted = new Map(
    (Array.isArray(record.strand_coverage) ? record.strand_coverage : [])
      .filter((e) => e && typeof e.not_carried === "string")
      .map((e) => [e.strand, e]),
  );
  const strandCoverage = strandIds.map((id) => {
    if (place.get(id).length > 0) {
      return {
        strand: id,
        used_by_legs: place.get(id),
        ...(typeof coverage[id]?.role_in_thesis === "string" ? { role_in_thesis: coverage[id].role_in_thesis } : {}),
      };
    }
    return minted.get(id) || { strand: id, not_carried: "No Leg serves this Strand's claim." };
  });
  // JOURNEY COVERAGE (kogaki#1768): a Leg binds no Move and places no Journey
  // material, so every Journey-bearing Strand's Journey is disclosed as omitted.
  const journeyCoverage = briefJourneyStrands(record).map((id) => ({
    strand: id,
    omitted:
      "No Leg places Journey material: a Leg binds no Move, and the Reader Path is derived from the claims' structure.",
  }));

  let out = { ...record, strand_coverage: strandCoverage };
  if (Array.isArray(renderings))
    out = { ...out, renderings: renderings.map((e) => ({ term: e.term.trim(), as: e.as.trim() })) };
  for (const [key, value] of [
    ["reader_path", legs.map(legRecord)],
    ["journey_coverage", journeyCoverage],
  ]) {
    const r = fillSlot(out, key, value);
    if (r.error) return r;
    out = r.record;
  }
  return { record: out, placed: placed.length, total: strandIds.length };
}
