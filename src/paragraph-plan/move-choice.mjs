// paragraph-plan/move-choice — the choice of a Move by a Leg's Edge candidates (kogaki#1865): the comparison of a
// Move's Edges with the candidates under every filling of its Bind targets, and the Move taken. No model call is made
// here. Edge detection itself stands in src/sme/edges.mjs.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the ParagraphPlan stage
//       specs/spec-draft-pipeline/SPEC.md
//
import { canonicalAnswer, candidatesOf } from "../sme/edges.mjs";

export const NAME_ROW = "paragraph_plan_name_senses";
export const CANDIDATES_SETTING = "paragraph_plan.leg_edge_candidates";

const answerKey = (a) => `${a.sense}|${a.played_by}`;

// ---------------------------------------------------------------------------
// THE COMPARISON, by code with no model call (kogaki#1851, kogaki#1865): every filling of a Move's Bind targets by
// the Leg's sentences. A Segment's `edges` is a list of `{ sense, to, hypophora? }`; an entry pointing to several
// Segments is one Edge for each of them. An Edge is compared when its `sense` is not null and both its Segments are
// bound, and met under a filling when the Edge candidates of the two sentences hold its Sense, with the Segment that
// carries the Edge playing the Sense's part. A Sense outside the list is compared and never met.

// Every way of giving `targets` Bind targets different sentences of `sentenceCount`, in order.
function fillingsOf(targets, sentenceCount) {
  const out = [];
  const walk = (taken) => {
    if (taken.length === targets) return out.push([...taken]);
    for (let n = 1; n <= sentenceCount; n++) if (!taken.includes(n)) walk([...taken, n]);
  };
  walk([]);
  return out;
}

// The Bind targets of a Move: the different numbers its Segments' `bind` names.
export const bindTargetsOf = (move) => new Set(move.segments.map((s) => s.bind).filter((b) => b !== null)).size;

// A Move's Edges, one per Segment it points to, each `{ segment, sense, to: [k] }`.
function edgesOf(move) {
  return move.segments.flatMap((s, k) =>
    (s.edges || []).flatMap((e) => e.to.map((to) => ({ segment: k + 1, sense: e.sense, to: [to] }))),
  );
}

export function compareMove(move, counted, sentenceCount, names) {
  const segments = move.segments;
  const targets = bindTargetsOf(move);
  const isBound = (k) => segments[k - 1].bind !== null;
  const related = edgesOf(move).filter((e) => e.sense !== null);
  const compared = related.filter((e) => isBound(e.segment) && isBound(e.to[0]));
  const not_compared = related.filter((e) => !(isBound(e.segment) && isBound(e.to[0])));
  if (targets > sentenceCount)
    return {
      chosen: false,
      fillings: [],
      none: `the Move has ${targets} bound Segments and the Leg has ${sentenceCount} sentences, so there is no filling`,
      not_compared,
    };
  const fillings = fillingsOf(targets, sentenceCount).map((taken) => {
    const sentenceOf = (k) => taken[segments[k - 1].bind - 1];
    const filling = Object.fromEntries(taken.map((n, b) => [b + 1, n]));
    const centralAt = segments.findIndex((s) => s.bind !== null && taken[s.bind - 1] === sentenceCount);
    const edges = compared.map((e) => {
      const carrier = sentenceOf(e.segment);
      const other = sentenceOf(e.to[0]);
      const pair = [Math.min(carrier, other), Math.max(carrier, other)];
      const known = names.get(e.sense);
      const wanted = known
        ? canonicalAnswer({ sense: e.sense, played_by: known.part ? carrier : null }, pair, names)
        : null;
      const candidates = candidatesOf(counted.find((p) => p.pair[0] === pair[0] && p.pair[1] === pair[1]));
      const met = wanted !== null && candidates.some((c) => answerKey(c) === answerKey(wanted));
      return { ...e, pair, wanted, candidates, met };
    });
    return {
      filling,
      central_claim: centralAt < 0 ? null : centralAt + 1,
      edges,
      met: edges.length > 0 && edges.every((x) => x.met),
      count: edges.filter((x) => x.met).length,
    };
  });
  if (!compared.length)
    return {
      chosen: false,
      fillings,
      none: "none of the Move's Edges is compared, because each has a Segment with nothing bound at one end",
      not_compared,
    };
  return { chosen: fillings.some((f) => f.met), fillings, none: null, not_compared };
}

// ---------------------------------------------------------------------------
// THE CHOICE (kogaki#1865): a Move is a candidate for a Leg when it has no more Bind targets than the Leg has
// sentences. Its filling is the one meeting the most compared Edges among those giving the CentralClaim, the Leg's last
// sentence, to a Segment (kogaki#1960), the first tried among equals. The Move taken
// has the highest count; among equals, the fewer compared Edges; among those, the id first in alphabetical order.
// `moves` are `{ id, segments }`, each Segment carrying `bind` and `edges`. Returns `{ move, filling, met, compared }`
// for the Move taken, or null where no Move is a candidate.

export function fitOf(move, counted, sentenceCount, names) {
  const c = compareMove(move, counted, sentenceCount, names);
  const compared = edgesOf(move).filter(
    (e) => e.sense !== null && move.segments[e.segment - 1].bind !== null && move.segments[e.to[0] - 1].bind !== null,
  ).length;
  const best = c.fillings
    .filter((f) => f.central_claim !== null)
    .reduce((b, f) => (b === null || f.count > b.count ? f : b), null);
  return best ? { filling: best.filling, met: best.count, compared } : null;
}

export function chooseMove(moves, counted, sentenceCount, names) {
  const fits = moves
    .filter((m) => bindTargetsOf(m) <= sentenceCount)
    .map((m) => ({ move: m, ...fitOf(m, counted, sentenceCount, names) }))
    .filter((f) => f.filling);
  fits.sort(
    (a, b) => b.met - a.met || a.compared - b.compared || (a.move.id < b.move.id ? -1 : a.move.id > b.move.id ? 1 : 0),
  );
  return fits.length ? fits[0] : null;
}

// The plan's Segments under the filling taken: per Segment of the Move, in order, the number of the Leg's sentence
// the filling gives it, or null, and its Edges as the Move file writes them.
export function fittedSegments(move, filling) {
  return move.segments.map((s) => ({
    bind: s.bind === null ? null : filling[s.bind],
    edges: (s.edges || []).map((e) => ({ ...e, to: [...e.to] })),
  }));
}
