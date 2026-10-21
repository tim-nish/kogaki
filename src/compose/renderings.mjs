// compose/renderings — the Brief's renderings record and the recoverability
// of a claim or a point from its served material under it (kogaki#1494,
// owner decision 2026-10-21).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   none: this file names no spec content beyond its Issue pointers
//
import { parseIntroducesEntry, wholeWordMatch } from "./sections.mjs";

// ---- THE RENDERINGS RECORD (kogaki#1494) ----
//
// The source terms the article will NOT keep, each with the plain phrase it
// uses instead. A Strand carries the source's own words; which of them the
// article keeps was decided, until this record, by each claim's wording in
// turn, so renaming a term and rewording a proposition were one act and
// neither could be judged. The record separates them: composed once, at the
// `differentiation` state, before any reader-path unit runs, and read by every
// unit and by the Path Review. A term absent from it keeps the served word.
// Which terms the article keeps is the composer's judgment and is not
// checked; the shape of each entry, that its term occurs in the material it
// was read from, and that the Thesis does not carry it, are.
export const RENDERING_KEYS = ["term", "as"];

// The entries' shape: an array of `{ term, as }`, both non-empty, no other
// key, no term twice, the rendering differing from the term, each term
// occurring whole-word in one of the Strand claims it was read from, and none
// occurring whole-word in the Thesis — the Thesis is the article's title, so
// a word it carries is a word the article keeps. Returns the refusal, or null.
export function renderingsRefusal(entries, { thesis = "", claims = [] } = {}) {
  if (!Array.isArray(entries)) {
    return `renderings is a list of { term, as } entries; received ${JSON.stringify(entries ?? null)} (kogaki#1494)`;
  }
  const seen = new Set();
  for (const [i, e] of entries.entries()) {
    const at = `renderings entry ${i + 1}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) return `${at} is not a { term, as } map`;
    const extra = Object.keys(e).filter((k) => !RENDERING_KEYS.includes(k));
    if (extra.length) return `${at} carries ${extra.map((k) => `\`${k}\``).join(", ")} — an entry is its term and its rendering, no prose`;
    if (typeof e.term !== "string" || e.term.trim() === "") return `${at} carries no term`;
    const term = e.term.trim();
    if (typeof e.as !== "string" || e.as.trim() === "") return `${at} ("${term}") carries no \`as\` — the plain phrase the article uses in its place`;
    if (e.as.trim().toLowerCase() === term.toLowerCase()) {
      return `${at} renders "${term}" as itself — a term the article keeps has no entry`;
    }
    const key = term.toLowerCase();
    if (seen.has(key)) return `${at} lists "${term}" a second time — one entry per term`;
    seen.add(key);
    if (!claims.some((c) => wholeWordMatch(term, c))) {
      return `${at} lists "${term}", which occurs whole-word in no Strand's claim — the record renders the `
        + "served material's own words, so a term in none of them was not read from it";
    }
    if (thesis && wholeWordMatch(term, thesis)) {
      return `${at} lists "${term}", which the Thesis carries — the Thesis is the article's title, so a word it `
        + "carries is a word the article keeps, and a kept word has no entry";
    }
  }
  return null;
}

// The entries of a renderings record, trimmed. A record that predates the
// field, or a Brief that carries none, renders nothing.
export function renderingsOf(record) {
  const list = Array.isArray(record?.renderings) ? record.renderings : [];
  return list.filter((e) => e && typeof e.term === "string" && e.term.trim() !== ""
    && typeof e.as === "string" && e.as.trim() !== "")
    .map((e) => ({ term: e.term.trim(), as: e.as.trim() }));
}

// `introduces` carries only terms the article keeps: an introduces entry
// whose term is the `term` of a renderings entry is refused, naming the Leg,
// the term and the entry. Case-insensitive, on the whole term.
export function renderedTermIntroducedRefusal(legs, renderings = []) {
  if (!Array.isArray(legs) || !Array.isArray(renderings) || renderings.length === 0) return null;
  for (const [i, s] of legs.entries()) {
    for (const raw of (s && Array.isArray(s.introduces) ? s.introduces : [])) {
      const e = parseIntroducesEntry(raw);
      if (e.error) continue;
      const r = renderings.find((x) => x.term.toLowerCase() === e.term.toLowerCase());
      if (!r) continue;
      return `leg ${i + 1}${s.leg_id ? ` (${s.leg_id})` : ""}: introduces "${e.term}", which the renderings record `
        + `renders — the entry { term: "${r.term}", as: "${r.as}" } — so the article does not keep it and has `
        + "nothing to introduce. Introduce the rendering's words where they need introducing, or drop the entry (kogaki#1494)";
    }
  }
  return null;
}

// ---- RECOVERABILITY (kogaki#1494) ----
//
// A claim's `proposition` and a waypoint's `point` are recoverable from the
// claim's served material under the renderings record: every word in them is
// a word of that material, a word of a declared rendering of a term the
// material carries, a word of a term `introduces` has handed the Leg (on it
// or earlier), or a function word. The first word that is none of these
// fails the Leg, named. Words compare case-insensitively and across the
// inflections `wordForms` folds, so `registers` is recovered from `register`
// and never from `records`.
export const FUNCTION_WORDS = new Set([
  "a", "an", "the", "and", "or", "nor", "but", "so", "yet", "if", "then", "than", "that", "this", "these",
  "those", "which", "who", "whom", "whose", "what", "when", "where", "why", "how", "whether", "while",
  "because", "as", "of", "in", "on", "at", "by", "for", "from", "to", "into", "onto", "with", "without",
  "within", "about", "over", "under", "between", "among", "through", "across", "after", "before", "until",
  "since", "during", "against", "upon", "per", "via", "is", "are", "was", "were", "be", "been", "being",
  "am", "has", "have", "had", "having", "do", "does", "did", "doing", "can", "could", "may", "might",
  "must", "shall", "should", "will", "would", "not", "no", "it", "its", "itself", "they", "them", "their",
  "theirs", "themselves", "he", "him", "his", "she", "her", "hers", "we", "us", "our", "you", "your", "i",
  "me", "my", "one", "ones", "each", "every", "all", "any", "some", "both", "either", "neither", "other",
  "another", "such", "same", "own", "only", "also", "too", "very", "just", "there", "here", "even", "still",
  "already", "more", "most", "less", "least", "much", "many", "few", "s",
]);

const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: "word" });

// The words of a text, lower-cased, in order: the word-like segments the
// runtime's own word breaker yields, so a language written without spaces is
// split by its dictionary rather than read as one word.
export function wordsOf(text) {
  const out = [];
  for (const seg of WORD_SEGMENTER.segment(String(text ?? ""))) {
    if (seg.isWordLike) out.push(seg.segment.toLowerCase());
  }
  return out;
}

// The forms a word is compared under: itself and its stem with one regular
// English inflection removed. Two words are one word when their forms meet.
export function wordForms(word) {
  const w = String(word).toLowerCase().replace(/['’]s$/, "");
  const forms = new Set([w]);
  for (const suffix of ["ies", "es", "s", "ed", "d", "ing", "ly", "e"]) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      const stem = w.slice(0, -suffix.length);
      forms.add(stem);
      if (suffix === "ies") forms.add(`${stem}y`);
      if (suffix === "ing" || suffix === "ed") forms.add(`${stem}e`);
    }
  }
  return forms;
}

function formSet(texts) {
  const set = new Set();
  for (const t of texts) for (const w of wordsOf(t)) for (const f of wordForms(w)) set.add(f);
  return set;
}

// The first word of `text` the allowed forms do not hold, or null.
function unrecoveredWord(text, allowed) {
  for (const w of wordsOf(text)) {
    if (FUNCTION_WORDS.has(w) || /^[\p{N}]+$/u.test(w)) continue;
    if (![...wordForms(w)].some((f) => allowed.has(f))) return w;
  }
  return null;
}

// One entry per Leg, in Leg order: `{ leg_id, verdict: "holds" }`, or
// `{ leg_id, verdict: "fails", field, word }` naming the first claim or point
// carrying a word its material does not recover. `material` maps a Strand id
// (`L<n>`) to its served text; a claim reads its own Strand's, a waypoint the
// Strands it `serves`, and either falls back to the Leg's `materials` where
// those name none. `renderings` is the record's entries.
export function recoverabilityOf(legs, { material = {}, renderings = [] } = {}) {
  const textOf = (ids) => ids.map((id) => String(id).replace(/\.journey$/, ""))
    .map((id) => material[id]).filter((t) => typeof t === "string" && t !== "");
  const introducedSoFar = [];
  const out = [];
  for (const s of (Array.isArray(legs) ? legs : []).filter((l) => l && typeof l === "object")) {
    for (const raw of (Array.isArray(s.introduces) ? s.introduces : [])) {
      const e = parseIntroducesEntry(raw);
      if (!e.error) introducedSoFar.push(e.term);
    }
    const legMaterial = textOf(Array.isArray(s.materials) ? s.materials : []);
    const allowedFor = (texts) => {
      const own = texts.length ? texts : legMaterial;
      const rendered = renderings.filter((r) => own.some((t) => wholeWordMatch(r.term, t))).map((r) => r.as);
      return formSet([...own, ...rendered, ...introducedSoFar]);
    };
    const fields = [
      ...(Array.isArray(s.claims) ? s.claims : []).map((g, j) => [`claims[${j}].proposition`, g && g.proposition,
        textOf(g && typeof g.strand === "string" ? [g.strand] : [])]),
      ...(Array.isArray(s.waypoints) ? s.waypoints : []).map((w, j) => [`waypoints[${j}].point`, w && w.point,
        textOf(w && Array.isArray(w.serves) ? w.serves : [])]),
    ];
    let entry = { leg_id: s.leg_id, verdict: "holds" };
    for (const [field, text, own] of fields) {
      if (typeof text !== "string") continue;
      const word = unrecoveredWord(text, allowedFor(own));
      if (word) { entry = { leg_id: s.leg_id, verdict: "fails", field, word }; break; }
    }
    out.push(entry);
  }
  return out;
}
