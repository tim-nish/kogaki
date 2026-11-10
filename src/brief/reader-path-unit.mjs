// brief/reader-path-unit — the Reader-path unit validator, the per-unit
// GROUNDED prompt and verdict, and the no-fit report. Cut from src/brief.mjs at
// its named sections (kogaki#1466); the design and its rulings are stated in
// the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES: none.
//
import { basename, dirname } from "node:path";
import { BRIEF_RECORD_FILE } from "../compose.mjs";
import { siteComment, validateGrounded, validateWaypoints } from "../compose/structure.mjs";
import { checkpointRun, clearOpenRunPointer, relFromRepo } from "../workflow/run-record.mjs";
import { archiveHome } from "./candidates.mjs";
import { fail, needBrief } from "./run-state.mjs";

// THE DECLARED PER-UNIT VALIDATOR (kogaki#1240, kogaki#1768): the `compose_path`
// job's one unit answers the `lpp_waypoints` row's record, `{ waypoints }`, and
// `validateWaypoints` (src/compose/structure.mjs) refuses it against the Brief's
// adopted structure, handed over at the job's boundary. A breach classifies the
// unit `refused` and gets the unit's own re-ask. Pure and `{error}`-returning.
export function validateBriefWaypoints(record, inputs) {
  const v = validateWaypoints(record, inputs.structure);
  return v.text ? { error: v.text } : null;
}

// THE GROUNDED JUDGMENT, PER ROUND (kogaki#1768): once the unit's Waypoints pass
// the validator, the supervisor runs one more headless session over them with the
// `lpp_grounded` row. `inputs.promptHead` is that row rendered by `judgePrompt`
// in `compose_path`, ending at the input marker; this appends the input.
export function groundedInput(record, structure) {
  return { structure, waypoints: record.waypoints.map((w, i) => ({ waypoint: i + 1, point: w.point, carries: w.carries })) };
}

export function groundedPrompt(record, inputs) {
  return `${inputs.promptHead}${JSON.stringify(groundedInput(record, inputs.structure), null, 2)}`;
}

// THE JUDGE'S ANSWER, READ BACK: a verdict whose own shape is wrong is the
// judge's malformed output and is asked again; `does-not-fit` is the unit's
// schema refusal, each site the judge's own words, so the next Round composes
// the whole Waypoint set again under them.
export function groundedVerdict(answer, record) {
  const v = validateGrounded(answer, record.waypoints);
  if (v.text) return { error: v.text };
  if (answer.verdict === "fits") return {};
  return { refusal: groundedRefusal(answer.sites) };
}

export function groundedRefusal(sites) {
  return ["THE WAYPOINTS WERE JUDGED, AND THESE ARE NOT GROUNDED IN THE RELATIONS THEY CARRY:",
    ...sites.map(siteComment),
    "Compose the Waypoints again so that every assertion a point makes is stated by a relation it carries."].join("\n");
}

// THE UNITS THAT FINISHED (kogaki#1360): `status: "done"` with a record on the
// row, its Waypoints judged GROUNDED (kogaki#1768).
export function composeJobFinished(units) {
  return (units || []).filter((u) => u.status === "done" && u.candidate && typeof u.candidate === "object");
}

// THE UNITS A FINISHED COMPOSE JOB DID NOT TURN INTO A READER PATH (kogaki#1307,
// kogaki#1768): each refused unit, with the refusal its last Round ended on.
export function composeJobExcluded(units) {
  return (units || []).filter((u) => u.status === "refused").map((u) => {
    const f = u.failure || {};
    return {
      candidate_id: u.id,
      unit: u.id,
      refusal: f.stderr_tail || f.first_refusal || "no further detail was recorded for it",
    };
  });
}

// What renders above the Candidate question: one plain line per Candidate
// not offered, and nothing when every Candidate is offered.
export function candidateSelectionExtra(excluded) {
  return excluded.length ? { excluded_candidates: excludedCandidateLines(excluded).join("\n") } : {};
}

// One plain line per Reader Path not offered: a review that did not finish
// (kogaki#1301), or a composition refused in every Round.
export function excludedCandidateLines(excluded) {
  return excluded.map((x) => (x.review_unfinished
    ? "Not offered: the Reader Path — its review did not finish."
    : "Not offered: the Reader Path — its Leg Waypoints were refused in every Round."));
}

// NO READER PATH WAS COMPOSED (kogaki#1276, kogaki#1307, kogaki#1768): the Brief ends
// with no question. The report names the refusal the last Round ended on. The empty
// Brief is archived, and the report names where (`removed` is that path, or false);
// the run directory keeps every Round's record.
export function noCandidateFitsReport(excluded, briefPath, { removed = false } = {}) {
  const lines = ["No Reader Path was composed, so no question is asked and the Brief ends here."];
  for (const x of excluded) {
    if (x.review_unfinished) lines.push(`  Its review did not finish (${x.review_unfinished}).`);
    else if (x.refusal) lines.push(`  The last Round was refused: ${String(x.refusal).split("\n").slice(0, 4).join(" ")}`);
  }
  lines.push(removed
    ? `The Brief at ${briefPath} had no Reader Path in it and was moved to ${removed}, so its name is free again. `
      + "The run directory keeps every Round's record. The way forward is to re-settle the Strands through "
      + "Terrain, or to start the Brief again."
    : `The Brief at ${briefPath} could not be moved and stays as minted, with no Reader Path in it.`);
  return lines.join("\n");
}

export function endBriefNoCandidateFits(rec, st, excluded) {
  const briefPath = needBrief(rec, st);
  // THE EMPTY BRIEF IS MOVED OUT OF ITS NAME (kogaki#1307, owner decision
  // 2026-10-08): keeping its `theses/<slug>/` takes the name. It is archived
  // and never deleted (kogaki#1742).
  let removed = false;
  if (basename(briefPath) === BRIEF_RECORD_FILE) {
    try { removed = relFromRepo(archiveHome(dirname(briefPath))); }
    catch { removed = false; }
  }
  const report = noCandidateFitsReport(excluded, relFromRepo(briefPath), { removed });
  rec.brief_no_fit = excluded;
  if (removed) rec.brief_removed = removed;
  rec.awaiting = null;
  rec.done = true;
  checkpointRun(rec);
  clearOpenRunPointer();
  fail(report);
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
