// sme/edges — Edge detection (kogaki#1847, kogaki#1849): the list of Senses and its names, the check of one reading
// of a set of sentences, and the counting of the readings into Edge candidates. `/paragraph-plan` and the
// Structure-Mapping Playground make the calls; no model call is made here.
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

export const SENSES_FILE = "src/sme/senses.json";
// The number of readings of a Leg is fixed and has no setting (kogaki#1847).
export const READINGS = 5;

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
