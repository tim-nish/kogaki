// brief/reader-path-unit — the Candidate question's unoffered lines and the
// owner's selection at it. Cut from src/brief.mjs at
// its named sections (kogaki#1466); the design and its rulings are stated in
// the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES: none.
//
import { fail } from "./run-state.mjs";

// What renders above the Candidate question: one plain line per Candidate
// not offered, and nothing when every Candidate is offered.
export function candidateSelectionExtra(excluded) {
  return excluded.length ? { excluded_candidates: excludedCandidateLines(excluded).join("\n") } : {};
}

// One plain line per Reader Path not offered: a review that did not finish
// (kogaki#1301). The Reader Path is derived with no Call (kogaki#1775), so a
// review is the one step that can leave it unoffered.
export function excludedCandidateLines(excluded) {
  return excluded.map(() => "Not offered: the Reader Path — its review did not finish.");
}

// The owner's answer at the Candidate gate, read from the run record the
// executor wrote it onto. A free-text answer carries no option and reaches
// `adoptCandidate`'s own refusal — free text at this gate is a COMMENT, not a
// selection — so it is passed through rather than reinterpreted here.
export function selectedCandidateId(rec, st) {
  const chosen = (rec.owner_input || {}).CANDIDATE_SELECTION;
  if (typeof chosen !== "string" || chosen === "") {
    fail(`${st.id} has no answer at the Candidate-selection gate — the CANDIDATE_SELECTION wait `
      + "precedes this state in src/brief-workflow.json, and the answer is the OWNER's. Nothing was written.");
  }
  if (chosen === "none-of-these") {
    fail("the owner answered \"none-of-these\" at the Candidate-selection gate — the Thesis or the "
      + "selected set is what should change, and NO Reader Path lands in the Brief. Nothing was written.");
  }
  return chosen;
}
