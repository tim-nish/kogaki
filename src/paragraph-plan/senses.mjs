// paragraph-plan/senses — a Leg's Senses and the choice of a Move by them (kogaki#1865): the list of Senses and its
// names, the Leg's sentences, the check of one reading, the counting into Edge candidates, and the comparison of a
// Move's Edges with them under every filling of its Bind targets. No model call is made here. Moved from the
// Structure-Mapping Playground (kogaki#1849, kogaki#1851), whose commands import them from this file.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902). The rule these entries are written under lives in
// `src/SPEC-REFERENCES.md` and is not restated here.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the ParagraphPlan stage
//       specs/spec-draft-pipeline/SPEC.md
//
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO } from "../workflow/run-record.mjs";

export const SENSES_FILE = "src/paragraph-plan/senses.json";
// The number of readings of a Leg is fixed and has no setting (kogaki#1847).
export const READINGS = 5;
export const NAME_ROW = "paragraph_plan_name_senses";
export const CANDIDATES_SETTING = "paragraph_plan.leg_edge_candidates";

const isMap = (v) => v && typeof v === "object" && !Array.isArray(v);
const refuse = (group, text) => ({ group, text });
const answerKey = (a) => `${a.sense}|${a.played_by}`;

function keysRefusal(obj, keys, at) {
  if (!isMap(obj)) return `${at} is not a map`;
  const extra = Object.keys(obj).find((k) => !keys.includes(k));
  if (extra) return `${at} carries \`${extra}\`, which it does not declare — it carries ${keys.join(", ")}`;
  const missing = keys.find((k) => !Object.hasOwn(obj, k));
  return missing ? `${at} carries no \`${missing}\`` : null;
}

// ---------------------------------------------------------------------------
// THE LIST OF SENSES, read from senses.json: `senses`, what a reading is handed and what a sheet shows, and `own`,
// Kogaki's own Senses, which an Edge may keep and a reading is not handed (kogaki#1881).

const readSensesFile = () => JSON.parse(readFileSync(join(REPO, SENSES_FILE), "utf8"));

export function loadSenses() {
  return readSensesFile().senses;
}

export function loadOwnSenses() {
  return readSensesFile().own;
}

// Every name a reading may answer, in the list's order: `{ name, sense, part, plays, meaning, opposite, order }`.
export function senseNames(senses) {
  const out = [];
  for (const s of senses) {
    if (!s.parts.length) out.push({ name: s.sense, sense: s.sense, part: null, meaning: s.meaning, order: out.length });
    for (const p of s.parts)
      out.push({
        name: `${s.sense}.${p.part}`,
        sense: s.sense,
        part: p.part,
        plays: p.plays,
        meaning: s.meaning,
        opposite: s.opposite && s.opposite.includes(p.part) ? s.opposite.find((x) => x !== p.part) : null,
        order: out.length,
      });
  }
  return new Map(out.map((n) => [n.name, n]));
}

// One line per Sense, as the readings are given the list (kogaki#1847).
export function sensesText(senses) {
  return senses.map((s) => {
    const names = s.parts.length ? s.parts.map((p) => `${s.sense}.${p.part}`).join(" / ") : s.sense;
    const parts = s.parts.length ? s.parts.map((p) => `${p.part}: ${p.plays}`).join(" ") : "No part.";
    return `${names}: ${s.meaning} ${parts}`;
  });
}

// ONE SPELLING PER ANSWER: an opposite part played by the earlier sentence is its opposite played by the later one.
export function canonicalAnswer({ sense, played_by: by }, pair, names) {
  const n = names.get(sense);
  if (n && n.opposite && by === pair[0]) return { sense: `${n.sense}.${n.opposite}`, played_by: pair[1] };
  return { sense, played_by: by };
}

// ---------------------------------------------------------------------------
// THE SENTENCES, read from the Brief with no model call: the Arguments in the order the relation lists them, then
// the CentralClaim. A relation's text is its `holds` with each `{<Role id>}` written as the Role's `name`; a Role's
// text is its `context`.

export function legSentences(structure, relationId) {
  const roles = new Map(structure.roles.map((r) => [r.id, r]));
  const relations = new Map([...structure.relations, ...structure.higher_order].map((r) => [r.id, r]));
  const named = (holds) => holds.replace(/\{([^{}]+)\}/g, (m, id) => (roles.has(id) ? roles.get(id).name : m));
  const central = relations.get(relationId);
  const args = Object.hasOwn(central, "relates")
    ? central.relates.map((id) => ({ id, sentence: named(relations.get(id).holds) }))
    : central.between.map((id) => ({ id, sentence: roles.get(id).context }));
  return [
    ...args.map((a, k) => ({ number: k + 1, id: a.id, kind: "Argument", sentence: a.sentence })),
    { number: args.length + 1, id: relationId, kind: "CentralClaim", sentence: named(central.holds) },
  ];
}

// Every pair of `count` sentences, in the order (1, 2), (1, 3) and so on.
export function pairsOf(count) {
  const out = [];
  for (let i = 1; i <= count; i++) for (let j = i + 1; j <= count; j++) out.push([i, j]);
  return out;
}

// ---------------------------------------------------------------------------
// THE CHECK OF ONE READING: every Sense that holds, per pair, in order; a refusal naming the place, or null.

export function nameRefusal(answer, sentenceCount, names) {
  const top = keysRefusal(answer, ["pairs"], "the record");
  if (top) return refuse("shape", top);
  const pairs = pairsOf(sentenceCount);
  if (!Array.isArray(answer.pairs)) return refuse("pairs", "the record's `pairs` is not a list");
  if (answer.pairs.length !== pairs.length)
    return refuse(
      "pairs",
      `\`pairs\` carries ${answer.pairs.length} entries, and ${sentenceCount} sentences have ${pairs.length} pairs — one entry per pair, in order`,
    );
  for (const [i, p] of answer.pairs.entries()) {
    const at = `pairs[${i}]`;
    const bad = keysRefusal(p, ["pair", "senses"], at);
    if (bad) return refuse("pairs", bad);
    const pair = pairs[i];
    if (JSON.stringify(p.pair) !== JSON.stringify(pair))
      return refuse(
        "pairs",
        `${at}.pair is ${JSON.stringify(p.pair)}, and the pair in that place is ${JSON.stringify(pair)}`,
      );
    if (!Array.isArray(p.senses)) return refuse("senses", `${at}.senses is not a list`);
    const seen = new Map();
    for (const [j, s] of p.senses.entries()) {
      const sat = `${at}.senses[${j}]`;
      const sb = keysRefusal(s, ["sense", "played_by"], sat);
      if (sb) return refuse("senses", sb);
      const n = names.get(s.sense);
      if (!n)
        return refuse(
          "senses",
          `${sat}.sense is ${JSON.stringify(s.sense)}, which is no name of \`senses\` — a Sense with a part word is written with it`,
        );
      if (n.part && !pair.includes(s.played_by))
        return refuse(
          "senses",
          `${sat}.played_by is ${JSON.stringify(s.played_by)}, and ${s.sense} is played by one of the pair's sentences, ${pair[0]} or ${pair[1]}`,
        );
      if (!n.part && s.played_by !== null)
        return refuse(
          "senses",
          `${sat}.played_by is ${JSON.stringify(s.played_by)}, and ${s.sense} has no part word: it is null`,
        );
      const key = answerKey(canonicalAnswer(s, pair, names));
      if (seen.has(key))
        return refuse(
          "senses",
          `${sat} says the same of the pair as ${at}.senses[${seen.get(key)}] — a pair's Senses are all different`,
        );
      seen.set(key, j);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// THE COUNTING, by code with no model call.

// Per pair, each different answer: in how many readings named, its places; in order, the first `keep` the candidates.
export function countPairs(readings, sentenceCount, names, keep) {
  return pairsOf(sentenceCount).map((pair, i) => {
    const byKey = new Map();
    for (const reading of readings)
      reading.pairs[i].senses.forEach((s, place) => {
        const c = canonicalAnswer(s, pair, names);
        const key = answerKey(c);
        if (!byKey.has(key)) byKey.set(key, { ...c, named: 0, place_sum: 0 });
        const row = byKey.get(key);
        row.named++;
        row.place_sum += place + 1;
      });
    const answers = [...byKey.values()].sort(
      (a, b) =>
        b.named - a.named ||
        a.place_sum - b.place_sum ||
        names.get(a.sense).order - names.get(b.sense).order ||
        a.played_by - b.played_by,
    );
    answers.forEach((a, k) => (a.candidate = k < keep));
    return { pair, answers };
  });
}

export const candidatesOf = (p) =>
  p.answers.filter((a) => a.candidate).map((a) => ({ sense: a.sense, played_by: a.played_by }));

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
// sentences. Its filling is the one meeting the most compared Edges, the first tried among equals. The Move taken
// has the highest count; among equals, the fewer compared Edges; among those, the id first in alphabetical order.
// `moves` are `{ id, segments }`, each Segment carrying `bind` and `edges`. Returns `{ move, filling, met, compared }`
// for the Move taken, or null where no Move is a candidate.

export function fitOf(move, counted, sentenceCount, names) {
  const c = compareMove(move, counted, sentenceCount, names);
  const compared = edgesOf(move).filter(
    (e) => e.sense !== null && move.segments[e.segment - 1].bind !== null && move.segments[e.to[0] - 1].bind !== null,
  ).length;
  const best = c.fillings.reduce((b, f) => (b === null || f.count > b.count ? f : b), null);
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
