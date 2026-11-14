// compose/defined-terms — the Brief's Defined Terms
// (cut from src/compose.mjs at its named section, kogaki#1465; the entry
// re-exports every name src/compose.mjs exported before the cut).

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES:
//   none: this file names no spec content beyond its Issue pointers
//
import { wholeWordMatch } from "./sections.mjs";

// ---- THE BRIEF'S DEFINED TERMS (kogaki#1331, owner decision 2026-10-10) ----
//
// The words this article gives a meaning to. The mint writes the list once —
// every noun of the Thesis and of each Strand's claim, classified `defined`
// (used in a sense this article gives it) or `ordinary` (the sense the reader
// already holds) — and composition is its one consumer: a `defined` term may
// not appear in a claim's proposition, a waypoint's point or an opens_section
// before the Leg whose `introduces` carries it. The list lives in the Brief
// and ends there; nothing below reaches the Packet. Which terms the composer
// calls `ordinary` is its judgment and is not checked; the shape of each
// entry, and that it occurs in the text it was read from, is.
export const DEFINED_TERM_CLASSES = ["defined", "ordinary"];

// The entries' shape: an array of `{ term, class }`, the term non-empty and
// in the form an introduces entry's term takes, the class one of the two,
// no term twice, and each term occurring whole-word in the Thesis or in one
// of the Strand claims it was read from. Returns the refusal, or null.
export function definedTermsRefusal(entries, { thesis = "", claims = [] } = {}) {
  if (!Array.isArray(entries)) {
    return `defined_terms is a list of { term, class } entries; received ${JSON.stringify(entries ?? null)} (kogaki#1331)`;
  }
  const seen = new Set();
  for (const [i, e] of entries.entries()) {
    const at = `defined_terms entry ${i + 1}`;
    if (!e || typeof e !== "object" || Array.isArray(e)) return `${at} is not a { term, class } map`;
    const extra = Object.keys(e).filter((k) => k !== "term" && k !== "class");
    if (extra.length)
      return `${at} carries ${extra.map((k) => `\`${k}\``).join(", ")} — an entry is its term and its class, no prose`;
    if (typeof e.term !== "string" || e.term.trim() === "") return `${at} carries no term`;
    const term = e.term.trim();
    if (!DEFINED_TERM_CLASSES.includes(e.class)) {
      return `${at} ("${term}") carries the class ${JSON.stringify(e.class ?? null)} — every entry carries exactly one of ${DEFINED_TERM_CLASSES.join(", ")}`;
    }
    const key = term.toLowerCase();
    if (seen.has(key)) return `${at} lists "${term}" a second time — one entry per term`;
    seen.add(key);
    if (!wholeWordMatch(term, thesis) && !claims.some((c) => wholeWordMatch(term, c))) {
      return (
        `${at} lists "${term}", which occurs whole-word in neither the Thesis nor any Strand's claim — ` +
        "the list is read from those texts, so a term in neither was not read from them"
      );
    }
  }
  return null;
}

// The terms a Brief record classifies `defined`. A Brief minted before the
// field existed carries none, which defines nothing.
export function definedTermsOf(record) {
  const list = Array.isArray(record?.defined_terms) ? record.defined_terms : [];
  return list
    .filter((e) => e && e.class === "defined" && typeof e.term === "string" && e.term.trim() !== "")
    .map((e) => e.term.trim());
}
