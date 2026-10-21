// compose/fill — the fill: reader_path, strand_coverage, journey_coverage, closure
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   SPEC-draft-pipeline: the Leg's shape; the claims rule;
//       the obligations ledger; the durable home and the entry point;
//       journey register as a Candidate axis
//
import { validateLegs } from "./leg-schema.mjs";
import { definedTermsOf } from "./defined-terms.mjs";
import { renderedTermIntroducedRefusal } from "./renderings.mjs";
import {
  CONCEDED_ROW_FIELDS, briefJourneyStrands, briefStrandIds, fillSlot,
  journeyPlacements, legRecord, placements,
} from "./record.mjs";

// ---- the fill: reader_path, strand_coverage, journey_coverage, closure ----
// Pure over the record; exported for the check. Returns `{ record, placed,
// total }` or `{ error }`.
export function fillBrief(record, { legs, coverage = {}, obligations = [], unused = {}, readerStart, renderings = null }) {
  const v = validateLegs(legs, readerStart, obligations, definedTermsOf(record));
  if (v.error) return { error: v.error };
  legs = v.legs;
  // THE RENDERINGS RECORD (kogaki#1494): `introduces` carries only terms the
  // article keeps, so a term the record renders is refused here, naming the
  // term and the entry, before anything is written. A caller with no record
  // (a run that predates it) writes none.
  if (renderings !== null) {
    if (!Array.isArray(renderings) || renderings.some((e) => !e || typeof e.term !== "string" || typeof e.as !== "string")) {
      return { error: `the renderings record is a list of { term, as } entries; received ${JSON.stringify(renderings)} (kogaki#1494)` };
    }
    const introduced = renderedTermIntroducedRefusal(legs, renderings);
    if (introduced) return { error: introduced };
  }
  const strandIds = briefStrandIds(record);
  if (strandIds.length === 0) return { error: "the Brief carries no Strands — not a minted Brief" };
  // materials may reference only the closed set's Strands (plus the Thesis,
  // reader assumptions, earlier legs' conclusions, constructed material —
  // the Leg's shape's many-to-many list; only L<n> tokens are checkable against the
  // closed set, and a foreign L<n> is a Brief fetch by the durable home and the entry point invariant).
  const journeyIds = briefJourneyStrands(record);
  for (const s of legs) {
    for (const m of s.materials) {
      if (/^L[0-9]+$/.test(m) && !strandIds.includes(m)) {
        return { error: `leg ${s.leg_id}: material ${m} is outside the Brief's closed Strand set `
          + `(${strandIds.join(", ")}) — growing the set routes back through Terrain, never a Brief fetch (the durable home and the entry point)` };
      }
      // A Journey material (the Leg's shape) is checkable twice: against the closed set,
      // and against that Strand ACTUALLY carrying Journey material. The second
      // check is what stops a composer inventing journey material for a Strand
      // whose served record has none — unsupported completion (the claims rule), in the
      // one place the bare-L<n> check cannot see.
      const j = /^(L[0-9]+)\.journey$/.exec(m);
      if (j) {
        if (!strandIds.includes(j[1])) {
          return { error: `leg ${s.leg_id}: material ${m} names a Strand outside the Brief's closed set `
            + `(${strandIds.join(", ")}) — never a Brief fetch (the durable home and the entry point)` };
        }
        if (!journeyIds.includes(j[1])) {
          return { error: `leg ${s.leg_id}: material ${m} claims Journey material for ${j[1]}, whose served `
            + `record carries none (the Brief records no journey cite for it) — a Journey the material does not `
            + `have is unsupported completion (the claims rule), never a composition choice` };
        }
      }
    }
    // THE SERVED-RECORD HALF OF the Journey a Leg draws on (kogaki#1111). `journeysRefusal`
    // checks the shape, the closed use set and that the Leg carries the
    // Strand; whether that Strand's SERVED record carries Journey material is
    // a fact about the Brief, and this is the one place holding both.
    for (const j of s.journeys || []) {
      if (!journeyIds.includes(j.strand)) {
        return { error: `leg ${s.leg_id}: journey draws on ${j.strand}'s Journey, whose served record carries none `
          + `(the Brief records no journey cite for it) — a Journey the material does not have is unsupported `
          + `completion (the claims rule), never a composition choice` };
      }
    }
    for (const g of s.claims) {
      if (!strandIds.includes(g.strand)) {
        return { error: `leg ${s.leg_id}: strand claim ${g.strand} is outside the closed set (${strandIds.join(", ")})` };
      }
    }
  }

  // Strand coverage: used_by_legs DERIVED from the composed legs; an
  // unplaced selected Strand DISCLOSES rather than silently drops (the obligations ledger).
  const place = placements(legs, strandIds);
  const placed = strandIds.filter((id) => place.get(id).length > 0);
  const strandCoverage = strandIds.map((id) => (place.get(id).length > 0
    ? { strand: id, used_by_legs: place.get(id), role_in_thesis: coverage[id]?.role_in_thesis ?? null }
    : { strand: id, unplaced: unused[id] ?? "left unused (the claims rule's third move — omit the Leg, revise the path, or leave the Strand unused; never invention)" }));
  // journey register as a Candidate axis MUST 1 — journey material is PLACED OR ITS OMISSION IS DISCLOSED,
  // per Journey-bearing member. An empty list where the selected set carries
  // no Journey material: vacuous rather than violated.
  const jplace = journeyPlacements(legs, journeyIds);
  const journeyCoverage = journeyIds.map((id) => (jplace.get(id).length > 0
    ? { strand: id, placed_by: jplace.get(id) }
    : { strand: id, omitted: unused[`${id}.journey`] ?? "the Journey material is left unplaced (the claims rule's third move — omit the Leg, revise the path, or leave the material unused; never invention)" }));

  // CLOSURE (kogaki#1151). An obligation is a promise the prose makes to the
  // reader that a later passage must keep. EVERY ROW ENDS IN ONE OF TWO
  // TERMINAL STATES — `discharged_by` or `conceded_by` — and a row carrying
  // neither, or both, is refused by name. The Thesis row is not a row of this
  // list: it is derived (`thesisClosureRow`, kogaki#1328).
  const legIds = new Set(legs.map((s) => s.leg_id));
  const closure = [];
  for (const [i, o] of obligations.entries()) {
    if (typeof o.text !== "string" || o.text === "" || typeof o.introduced_by !== "string") {
      return { error: `obligation ${i + 1}: each Closure row carries its text and introduced_by (the obligation definition)` };
    }
    if (!legIds.has(o.introduced_by)) {
      return { error: `obligation ${i + 1}: introduced_by "${o.introduced_by}" is not a leg in this sequence` };
    }
    if (o.discharged_by !== undefined && !legIds.has(o.discharged_by)) {
      return { error: `obligation ${i + 1}: discharged_by "${o.discharged_by}" is not a leg in this sequence` };
    }
    if (o.conceded_by !== undefined && !legIds.has(o.conceded_by)) {
      return { error: `obligation ${i + 1}: conceded_by "${o.conceded_by}" is not a leg in this sequence` };
    }
    const hasDischarged = o.discharged_by !== undefined;
    const hasConceded = o.conceded_by !== undefined;
    if (hasDischarged === hasConceded) {
      return { error: `obligation ${i + 1} (${JSON.stringify(o.text)}, introduced_by ${o.introduced_by}): `
        + `every Closure row ends discharged_by or conceded_by, naming the Leg — this row carries `
        + `${hasDischarged ? "BOTH" : "NEITHER"}` };
    }
    const row = { text: o.text, introduced_by: o.introduced_by };
    if (hasDischarged) row.discharged_by = o.discharged_by;
    else {
      row.conceded_by = o.conceded_by;
      // A CONCEDED ROW'S THREE FIELDS (kogaki#1263, kogaki#1261): what stays
      // open, why this article does not close it, and what the reader keeps.
      for (const k of CONCEDED_ROW_FIELDS) {
        if (typeof o[k] === "string" && o[k] !== "") row[k] = o[k];
      }
    }
    closure.push(row);
  }

  let out = record;
  // WRITTEN BESIDE THE READER PATH COMPOSED UNDER IT (kogaki#1494). Not a slot:
  // the record is composed at `differentiation`, and a Brief adopted before
  // the field carries none.
  if (Array.isArray(renderings)) out = { ...out, renderings: renderings.map((e) => ({ term: e.term.trim(), as: e.as.trim() })) };
  for (const [key, value] of [
    ["reader_path", legs.map(legRecord)],
    ["strand_coverage", strandCoverage],
    ["journey_coverage", journeyCoverage],
    ["closure", closure],
  ]) {
    const r = fillSlot(out, key, value);
    if (r.error) return r;
    out = r.record;
  }
  return { record: out, placed: placed.length, total: strandIds.length };
}
