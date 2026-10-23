// brief/reader-path-unit — the Reader-path unit validator, the per-unit fit
// input, prompt and verdict, and the no-fit report. Cut from src/brief.mjs at
// its named sections (kogaki#1466); the design and its rulings are stated in
// the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES: none.
//
import { existsSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  candidateLedgerRefusal, characteristicMaxLength, retiredReaderFieldRefusal,
  retiredReasoningFieldRefusal, targetLegAfterState,
} from "../assemble.mjs";
import {
  BRIEF_RECORD_FILE, deriveReaderStatesBefore, moveContract, moveContractsForLegs, resolveFigureForms,
  resolveMoveIds, sectionHeadingsWithLastAfterState, specializationFailures,
  specializationSchema, validateLegs, validateSpecialization,
} from "../compose.mjs";
import { checkpointRun, clearOpenRunPointer, relFromRepo } from "../workflow/run-record.mjs";
import { fail, needBrief } from "./run-state.mjs";

// THE DECLARED PER-UNIT VALIDATOR (kogaki#1240): every rule a single Candidate
// obeys on its own, applied at the unit's own classification. `job-supervise`
// declares it by module path and export name in `reader-path-job-units.json`,
// so a breach classifies the unit `refused` and gets the per-unit re-ask
// (kogaki#1203) rather than ending the run. Pure and `{error}`-returning: it
// runs outside any judged/re-ask window.
export function validateReaderPathUnit(candidate, inputs) {
  const c = candidate || {};
  const { strandIds = [], readerStart, movesDir, definedTerms = [] } = inputs || {};
  if (typeof c.reader_experience !== "string" || c.reader_experience.trim() === "") {
    return { error: `candidate ${c.candidate_id}: \`reader_experience\` is required and cannot be `
      + "blank — Candidates differ in READER EXPERIENCE, the difference must be stated to be "
      + "selectable, and the option's DESCRIPTION is composed from this prose (kogaki#1126)" };
  }
  if (typeof c.characteristic !== "string" || c.characteristic.trim() === "") {
    return { error: `candidate ${c.candidate_id}: \`characteristic\` is required and cannot be `
      + "blank — the option LABEL at the Candidate gate is composed from it as `<n>. "
      + "<characteristic>`, and the Harness composes that label rather than the Candidate's prose "
      + "(src/candidate-schema.json, `characteristic`)" };
  }
  const charMax = characteristicMaxLength();
  const charValue = c.characteristic.trim();
  if (charValue.length > charMax) {
    return { error: `candidate ${c.candidate_id}: \`characteristic\` is ${charValue.length} `
      + `characters and src/candidate-schema.json bounds it at ${charMax} — it names the path in a `
      + "few words and renders as the option's label; the explanation belongs in "
      + `\`reader_experience\`, which renders as the description beside it. Received: `
      + `${JSON.stringify(charValue)}` };
  }
  // READER START IS GIVEN (kogaki#1216), not composed: `src/candidate-schema.json`
  // declares it `given: true` and a unit's own written value is overwritten by
  // the differentiation record and never read (`finishReaderPathJobAwait` sets
  // it on the Candidate AFTER classification). So the value validated here --
  // against `validateLegs` and against the unit's own answer below -- is the
  // one the job's boundary handed this validator, `inputs.readerStart`, and it
  // is set onto the candidate before `validateLegs` runs so the two readers of
  // the field never disagree.
  if (typeof readerStart !== "string" || readerStart === "") {
    return { error: `candidate ${c.candidate_id}: Reader start is absent — it is GIVEN by the differentiation `
      + "record and handed to this validator at the reader-path job's boundary (kogaki#1216), so its absence "
      + "here is the runtime's fault rather than the composer's" };
  }
  c.reader_start = readerStart;
  // THE LEG REFUSALS ARE `validateLegs`' OWN, re-implemented nowhere.
  // One-claim-per-Strand, the closed claim type set, every required field
  // and its description all come from `src/leg-schema.json` through that
  // function.
  // THE BRIEF'S DEFINED TERMS ride the same call (kogaki#1331), handed over at
  // the job's boundary from the minted Brief, so a defined term used before
  // its introducing Leg gets this unit's own re-ask.
  // A WAYPOINT CARRYING `move` OR `segments` IS REFUSED BY NAME inside `validateLegs`
  // (kogaki#1375): no Move information reaches the Brief, and the paragraph Move is bound
  // by /paragraph-plan after the Brief is adopted.
  const v = validateLegs(c.legs, c.reader_start, c.obligations, definedTerms);
  if (v.error) return { error: `candidate ${c.candidate_id}: ${v.error}` };
  // A LEG NO MOVE FITS ENDS THE UNIT `refused` WITH ITS OWN SENTENCE
  // (kogaki#1276). The refusal is the retry prompt's text verbatim
  // (`readerPathUnitRetryPrompt`, kogaki#1203), so the retry can revise the
  // path: omit the Leg, change the path, or leave a Strand unused.
  const unfit = (c.legs || []).find((s) => typeof s.no_move_fits === "string" && s.no_move_fits.trim() !== "");
  if (unfit) {
    return { error: `candidate ${c.candidate_id}, leg ${unfit.leg_id}: no Move fits this Leg — `
      + `"${unfit.no_move_fits.trim()}". Revise the path: omit this Leg, change the path, or leave a Strand unused` };
  }
  // THE MOVE IDS, RESOLVED HERE rather than only at adoption (kogaki#1125).
  const mv = resolveMoveIds(c.legs, movesDir);
  if (mv.error) return { error: `candidate ${c.candidate_id}: ${mv.error}` };
  // THE FIGURE DECISION'S MOVE-DEPENDENT HALF, RESOLVED HERE AND NOWHERE LATER
  // (kogaki#1311; it sat at adoption under kogaki#877). Whether a figure-
  // carrying Leg's Move declares a form, and whether its bindings are exactly
  // that form's roles, needs the Move open — and the Move is read up to the
  // Candidate and never again, so this is the last seat that can decide it.
  const fig = resolveFigureForms(c.legs, movesDir);
  if (fig.error) return { error: `candidate ${c.candidate_id}: ${fig.error}` };
  // THE CLOSED STRAND SET, refused HERE rather than only at adoption. A
  // material outside the Brief's closed set is refused by `fillBrief` at
  // `adopt_candidate` -- after the owner has chosen the path -- so raising
  // it here is what makes it repairable instead of terminal. A Brief never
  // fetches: the set closed at mint.
  for (const s of c.legs || []) {
    for (const m of s.materials || []) {
      if (!strandIds.includes(m)) {
        return { error: `candidate ${c.candidate_id}, leg ${s.leg_id}: material ${m} is outside `
          + `the Brief's closed Strand set (${strandIds.join(", ")}). The set closed at mint and a `
          + "Brief never fetches — compose from the settled Strands and from nothing else" };
      }
    }
  }
  const reasoning = c.reasoning || {};
  // A RETIRED KEY IS REFUSED BY NAME FIRST (kogaki#1328): a Candidate still
  // carrying `reasoning.thesis_closure` is told the field is retired, never
  // that some other key is missing.
  const retiredReasoning = retiredReasoningFieldRefusal(c);
  if (retiredReasoning) return { error: retiredReasoning };
  for (const key of ["leg_validity"]) {
    if (typeof reasoning[key] !== "string" || reasoning[key].trim() === "") {
      return { error: `candidate ${c.candidate_id}: \`reasoning.${key}\` is required — it is the Candidate's `
        + "gate evidence, and adoption fills no default" };
    }
  }
  // `opening_question` (kogaki#1216) AND `reader_target` (kogaki#1225) ARE
  // RETIRED FIELDS, refused BY NAME -- Reader target is the after-state of
  // the Leg marked `reaches_target` (kogaki#1231) and no Opening question is
  // rendered.
  const retired = retiredReaderFieldRefusal(c);
  if (retired) return { error: retired };
  if (targetLegAfterState(c.legs) === null) {
    return { error: `candidate ${c.candidate_id}: the Leg marked \`reaches_target\`'s \`reader_state_after\` `
      + "is absent, or the path carries none or several such Legs -- it IS the Brief's Reader target "
      + "(kogaki#1231), and adoption fills no default" };
  }
  // THE THREE LEDGER FIELDS, REFUSED HERE BY NAME (kogaki#1129).
  // `candidateLedgerRefusal` reads the declaration in
  // `src/candidate-schema.json`, which the executor renders into the unit's
  // own prompt -- the same two-readers property `validateLegs` has, one
  // field set over.
  const ledger = candidateLedgerRefusal(c, strandIds);
  if (ledger) return { error: ledger };
  return null;
}

// THE MOVE-FIT JUDGMENT, PER JOB UNIT (kogaki#1307; the judged half of the Leg-Move
// instantiation contract, kogaki#1276). Once a compose unit's record passes
// `validateReaderPathUnit`, the supervisor runs one more headless session over that
// Candidate alone, with each Leg beside its Move's `before`, `after`, `segments` and
// `breaks` verbatim from `moves/<id>.yaml`. Each Leg carries its DERIVED before-state
// (kogaki#1325) -- the previous Leg's after-state, or Reader start for the first --
// and `before_state` carries the one question asked of the Move's `before` against
// it, read from src/specialization-schema.json. `inputs.promptHead` is the `reader_path_fit_unit` row rendered by `judgePrompt`
// in `compose_path`, ending at the input marker; this appends the unit's own input.
// A LEG WHOSE MOVE RAISES A DEFERRED SLOT (kogaki#1529) carries the slots beside the
// Obligation rows the Leg raises, so a slot the composer left unfilled is judged.
export function readerPathFitInput(candidate, movesDir, readerStart, thesis) {
  const b = moveContractsForLegs(candidate.legs, movesDir);
  if (b.error) return { error: `candidate ${candidate.candidate_id}: ${b.error}` };
  const rows = Array.isArray(candidate.obligations) ? candidate.obligations : [];
  for (const entry of b.contracts) {
    const slots = moveContract(entry.move, movesDir).deferred_slots;
    if (!slots) continue;
    entry.deferred_slots = slots;
    entry.obligations_raised = rows.filter((o) => o && o.raised_by === entry.leg_id);
  }
  return {
    input: {
      candidate_you_must_judge: {
        candidate_id: candidate.candidate_id,
        legs: deriveReaderStatesBefore(candidate.legs, readerStart),
        move_contracts: b.contracts,
        reader_start: readerStart,
        // THE BRIEF'S THESIS (kogaki#1330), judged only on the Leg marked
        // `reaches_target`: Thesis attainment is verified here, at
        // composition, never at the review of the Draft.
        thesis,
        before_state: {
          derived_from: specializationSchema().before_state.derived_from,
          question: specializationSchema().before_state.question,
        },
        section_headings: sectionHeadingsWithLastAfterState(candidate.legs),
      },
    },
  };
}

export function readerPathFitPrompt(candidate, inputs) {
  const r = readerPathFitInput(candidate, inputs.movesDir, inputs.readerStart, inputs.thesis);
  // A MOVE THE VALIDATOR ADMITTED AND THIS CANNOT READ is a store fault, not a Candidate's.
  if (r.error) throw new Error(r.error);
  return `${inputs.promptHead}${JSON.stringify(r.input, null, 2)}`;
}

// THE JUDGE'S ANSWER, READ BACK (kogaki#1307). A record whose own shape is wrong is the
// judge's malformed output and is asked again with the same prompt; a Leg judged
// `contradicts` or `cannot-determine` is the Candidate's schema refusal, carrying the
// judge's sentence verbatim into the unit's one re-ask.
export function readerPathFitVerdict(record, candidate) {
  const v = validateSpecialization(record, candidate.legs, candidate.candidate_id, { refuseFailing: false });
  if (v.error) return { error: v.error };
  const failures = specializationFailures(record, candidate.legs);
  if (failures.length === 0) return {};
  return { refusal: moveFitRefusal(failures), failures };
}

export function moveFitRefusal(failures) {
  return ["THE MOVE FIT WAS JUDGED, AND THESE LEGS DO NOT FIT THE MOVE EACH BINDS:",
    ...failures.map((f) => `Leg ${f.leg_id} (${f.move}): ${f.verdict} — the judge wrote: "${f.why}"`),
    "Compose the Candidate again so that each of these Legs fits its Move, or binds a Move it does fit."].join("\n");
}

// THE UNITS THAT FINISHED A FIT CANDIDATE (kogaki#1360): `status: "done"` with a
// Candidate on the row. The partition `finishReaderPathJobAwait` forwards to
// `compose_path` is this function's and `composeJobExcluded`'s, so a check that
// asserts the offered set reads the same filter the run performs. It does not
// also require a `specialization` on the row: a unit ends `done` with none when
// the job ran no Move-fit judge (src/workflow/detached-job.mjs writes the record
// only "with a Move-fit judge"), and that Candidate is still a finished one.
export function composeJobFinished(units) {
  return (units || []).filter((u) => u.status === "done" && u.candidate && typeof u.candidate === "object");
}

// THE UNITS A FINISHED COMPOSE JOB DID NOT TURN INTO A CANDIDATE (kogaki#1307): each
// refused unit, with the Legs that did not fit where Move fit was what refused it.
export function composeJobExcluded(units) {
  return (units || []).filter((u) => u.status === "refused").map((u) => {
    const c = u.candidate && typeof u.candidate === "object" ? u.candidate : {};
    const f = u.failure || {};
    return {
      candidate_id: typeof c.candidate_id === "string" ? c.candidate_id : u.id,
      characteristic: c.characteristic,
      unit: u.id,
      failures: Array.isArray(f.move_fit) ? f.move_fit : [],
      refusal: f.stderr_tail || f.first_refusal || "no further detail was recorded for it",
    };
  });
}

// What renders above the Candidate question: one plain line per Candidate
// not offered, and nothing when every Candidate is offered.
export function candidateSelectionExtra(excluded) {
  return excluded.length ? { excluded_candidates: excludedCandidateLines(excluded).join("\n") } : {};
}

function candidateName(x) {
  return typeof x.characteristic === "string" && x.characteristic.trim() ? x.characteristic.trim() : x.candidate_id;
}

// One plain line per Candidate not offered: the first Leg that did not fit its Move,
// a review that did not finish (kogaki#1301), or a composition refused twice.
export function excludedCandidateLines(excluded) {
  return excluded.map((x) => {
    if (x.review_unfinished) return `Not offered: "${candidateName(x)}" — its review did not finish.`;
    if (x.failures && x.failures.length) return `Not offered: "${candidateName(x)}" — Leg ${x.failures[0].leg_id} does not fit its Move.`;
    return `Not offered: "${candidateName(x)}" — its composition was refused.`;
  });
}

// EVERY CANDIDATE FAILED (kogaki#1276, kogaki#1307): the Brief ends with no question.
// The report names, per Candidate, each Leg that did not fit and the judge's sentence,
// or the refusal its composition ended on. The empty Brief is removed, and the report
// says so; the run directory keeps every unit's record.
export function noCandidateFitsReport(excluded, briefPath, { removed = false } = {}) {
  const lines = ["No Candidate fits, so no question is asked and the Brief ends here."];
  for (const x of excluded) {
    lines.push(`Candidate "${candidateName(x)}":`);
    if (x.review_unfinished) lines.push(`  its review did not finish (${x.review_unfinished}).`);
    if (x.failures && x.failures.length) {
      for (const f of x.failures) lines.push(`  Leg ${f.leg_id} (${f.move}): ${f.verdict} — ${f.why}`);
    } else if (x.refusal) {
      lines.push(`  its composition was refused: ${String(x.refusal).split("\n")[0]}`);
    }
  }
  lines.push(removed
    ? `The Brief at ${briefPath} had no Reader Path in it and was removed, so its name is free again. `
      + "The run directory keeps every unit's record. The way forward is to add a Move through the Move-ingest "
      + "command, or to start the Brief again."
    : `The Brief at ${briefPath} could not be removed and stays as minted, with no Reader Path in it.`);
  return lines.join("\n");
}

export function endBriefNoCandidateFits(rec, st, excluded) {
  const briefPath = needBrief(rec, st);
  // THE EMPTY BRIEF IS REMOVED (kogaki#1307, owner decision 2026-10-08): its
  // `theses/<slug>/` holds only what `mint` wrote, and keeping it takes the name.
  let removed = false;
  if (basename(briefPath) === BRIEF_RECORD_FILE) {
    try { rmSync(dirname(briefPath), { recursive: true, force: true }); removed = !existsSync(dirname(briefPath)); }
    catch { removed = false; }
  }
  const report = noCandidateFitsReport(excluded, relFromRepo(briefPath), { removed });
  rec.brief_no_fit = excluded;
  if (removed) rec.brief_removed = relFromRepo(dirname(briefPath));
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
