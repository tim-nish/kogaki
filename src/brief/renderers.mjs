// brief/renderers — the renderer half (one entry per state the table
// declares) and the option-composer half (one entry per gate state). Cut from
// src/brief.mjs at its named sections (kogaki#1466); the design and its
// rulings are stated in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES: none.
//
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cmdAdoptCandidate, cmdAssemble, selectionOptionIds } from "../assemble.mjs";
import {
  audienceLanguage, briefJourneyStrands, briefStrandIds, definedTermsOf, definedTermsRefusal,
  deriveReaderStatesBefore, dischargeRows, loadMoveContracts, personaPriorKnowledgeLine,
  readerPersona,
} from "../compose.mjs";
import { DISCHARGE_VERDICTS, REVIEW_AREAS, attachReview, cmdAttach } from "../review.mjs";
import {
  DetachedJobStarted, READER_PATH_JOB_AWAIT_COMMAND, READER_PATH_JOB_STALL_S, jobHeartbeatMs,
  readReaderPathJob, readerPathJobPath, startDetachedJobSupervisor,
} from "../workflow/detached-job.mjs";
import { JUDGE_INPUT_MARKER, judgePrompt, judgeSettings } from "../workflow/judge.mjs";
import { JudgmentRefusal, relFromRepo } from "../workflow/run-record.mjs";
import { cmdAdopt, cmdEnter, cmdMint } from "./candidates.mjs";
import { candidateSelectionExtra, selectedCandidateId } from "./reader-path-unit.mjs";
import {
  BRIEF_REPO, REVIEW_PATH_JOB_DIR, briefAudienceFile, briefJobBounds, briefJobSetting,
  briefMovesDir, briefThesis, captureFile, detachedJobFor, differentiationBlockFor, entryInputs,
  fail, judged, needBrief, needRunState, readJson, readMintedBrief, refuseJudgment,
  strandClaims, validateDifferentiationRecord, writeJudgeInput,
} from "./run-state.mjs";

// ---- THE RENDERER HALF. One entry per state the table declares, keyed by state
// id, exactly as Terrain's STATE_WORK is: a new state is a table
// row PLUS a renderer, and the executor invents neither.
export const STATE_WORK = {
  enter: (rec, st, args) => {
    const runState = join(rec._dir, "run.json");
    const inputs = entryInputs(args);
    cmdEnter({ ...args, addresses: inputs.entered, "run-state": runState });
    rec.brief_run_state = runState;
    // THE WHOLE PROVENANCE, NOT ONLY THE ROUTE (PR #1109 round 1). `via` alone
    // was written here and read by nothing, so the owner answered the thesis
    // gate over a Strand set whose source was never rendered. At kogaki#1116
    // the thing that can be wrong is the MODEL's resolution of a report
    // coordinate into addresses, so what is recorded — and rendered above the
    // question — is the ADDRESSES THE RUN WAS STARTED WITH, marked as supplied
    // on the command line. That rendering is the whole reason opportunistic
    // resolution is acceptable: the owner reads the resolved set before
    // anything under `theses/` exists.
    rec.settled_set = { addresses: inputs.entered, via: inputs.via };
    rec.settled_set_via = inputs.via;
    return null;
  },

  adopt_thesis: (rec, st, args) => {
    // THE ANSWER IS THE HARNESS'S ROW, AND `--capture` NAMES THE FILE IT IS IN.
    // `cmdAdopt` re-derives the option-set digest from the gate `enter`
    // composed and refuses a row that answers a different one — the same check
    // the deleted `gate-thesis --capture` performed, now performed once, at the
    // one act that consumes the answer.
    cmdAdopt({ ...args, "run-state": needRunState(rec, st), capture: captureFile(rec) });
    return null;
  },

  // THE MINT ASKS ONE JUDGMENT BEFORE IT WRITES (kogaki#1331): the Brief's
  // Defined Terms, from the `defined_terms_unit` row, over the adopted Thesis
  // and each Strand's claim. The record is validated by the same refusal
  // `composeBrief` applies, so a re-ask carries its text; the mint then writes
  // the list once. A run that has adopted nothing goes straight to `cmdMint`,
  // whose refusal names that, without spending a judge call.
  mint: async (rec, st, args, table) => {
    const runState = needRunState(rec, st);
    const state = readJson(runState);
    if (state.stage !== "adopted") return { artifact: cmdMint({ ...args, "run-state": runState }) };
    const row = table.defined_terms_unit
      || fail(`${st.id}: src/brief-workflow.json declares no defined_terms_unit row for the Brief's Defined Terms (kogaki#1331)`);
    const thesis = state.adopted_thesis;
    const claims = strandClaims(state);
    let entries = null;
    const validate = (p) => {
      let r;
      try { r = readJson(p); }
      catch (e) { refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${row.input_shape}`); }
      if (!r || r.version !== "1") {
        refuseJudgment(`\`version\` must be "1" (src/candidate-schema.json, \`defined_terms_record\`); received ${JSON.stringify(r && r.version)}`);
      }
      const err = definedTermsRefusal(r.defined_terms, { thesis, claims: claims.map((c) => c.claim) });
      if (err) refuseJudgment(err);
      entries = r.defined_terms;
    };
    const composeInputFor = () => writeJudgeInput(rec, row, { state: st.id, unit: row.id, thesis, strand_claims: claims });
    rec.brief_defined_terms = await judged(rec, row, table, args, "defined-terms", composeInputFor, validate);
    return { artifact: cmdMint({ ...args, "run-state": runState, definedTerms: entries }) };
  },

  // ---- JUDGMENT POINT 0. Differentiation (kogaki#1206): decided BEFORE any
  // reader-path unit composes, one entry per unit, so the three Candidates
  // differ BY ASSIGNMENT rather than by chance among units that cannot see
  // each other. `compose_path` below reads this record to splice each unit's
  // own entry above that unit's own input marker, and tags the resulting
  // Candidate with its unit number so `src/assemble.mjs` can check the first
  // Leg bound what was assigned.
  differentiation: async (rec, st, args, table) => {
    const { briefPath, record, doc } = readMintedBrief(rec, st);
    const strandIds = briefStrandIds(record);
    const movesDir = briefMovesDir(args);
    const library = loadMoveContracts(movesDir);
    if (library.error) fail(`${st.id}: ${library.error}`);
    const units = briefJobSetting(table, "compose_path", "units");
    const journeyBearing = briefJourneyStrands(record).length > 0;
    const thesis = briefThesis(record);
    // THE PERSONA, read from the Audience file the `compose_path` row names
    // (kogaki#1216, kogaki#1370) -- the same row this state already reads
    // `job.units` from. An Audience file this state cannot read is a store
    // fault and refuses the STATE, before the ask: Reader start is authored
    // FROM it, and a judge asked to author a cold read from a Persona it was
    // never handed answers from nothing.
    const readerFile = briefAudienceFile(table);
    const persona = readerPersona(resolve(BRIEF_REPO, readerFile));
    if (persona.error) fail(`${st.id}: ${persona.error}`);
    // THE ARTICLE'S LANGUAGE (kogaki#1417), read from the same Audience file and
    // refused by name before the ask where it is missing.
    const language = audienceLanguage(resolve(BRIEF_REPO, readerFile));
    if (language.error) fail(`${st.id}: ${language.error}`);
    const validate = (p) => {
      let record;
      try { record = readJson(p); }
      catch (e) { refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${st.input_shape}`); }
      const r = validateDifferentiationRecord(record, { units, moves: library.moves, journeyBearing, thesis });
      if (r.error) refuseJudgment(r.error);
    };
    const composeInputFor = () => writeJudgeInput(rec, st, {
      state: st.id,
      brief: relFromRepo(briefPath),
      brief_document: doc,
      strands_you_may_use: strandIds,
      moves_you_may_bind: library.moves,
      units,
      journey_bearing: journeyBearing,
      // THE PERSONA, verbatim from the Audience file's `persona` and named by
      // path (kogaki#1216, kogaki#1370): `reader` and `prior_knowledge` are what `reader_start`
      // is derived from, line by line, beside the Thesis in `brief_document`.
      reader_file: readerFile,
      reader: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
      language: language.language,
    });
    const path = await judged(rec, st, table, args, "differentiation", composeInputFor, validate);
    rec.brief_differentiation = path;
    rec.judgments[st.id] = path;
    return null;
  },

  // ---- JUDGMENT POINT 1. The composition itself.
  //
  // THE SCHEMA IS RENDERED INTO THE PROMPT BY THE EXECUTOR, from this state's
  // `schema_file` row. What is validated here is the same file's field set, read
  // by `validateLegs` — so the text the Model composes against and the text the
  // refusal enforces are ONE FILE and cannot disagree. That property is the
  // reason `src/leg-schema.json` exists; this state is its second reader.
  compose_path: async (rec, st, args, table) => {
    const { briefPath, record, doc } = readMintedBrief(rec, st);
    const strandIds = briefStrandIds(record);
    const movesDir = briefMovesDir(args);
    // THE ADMITTED SET, READ ONCE AND BEFORE THE ASK (kogaki#1125). A store
    // fault refuses the STATE rather than the composition: the library being
    // unreadable is not something a judge can compose its way out of, so it
    // never reaches the re-ask window.
    const library = loadMoveContracts(movesDir);
    if (library.error) {
      fail(`${st.id}: ${library.error}`);
    }
    // THE PERSONA'S `prior_knowledge` IS NOT READ HERE (kogaki#1331, owner
    // decision 2026-10-10: "Let us remove Persona's permission to use
    // specialized terminology"). It granted a claim the words it named, and
    // that grant is what let a word's article-specific sense through; which
    // words need introducing is now the Brief's `defined_terms`, refused by
    // `validateLegs`. `prior_knowledge` keeps its one reader at Reader start.
    // THE ARTICLE'S LANGUAGE (kogaki#1417): the Audience's `language`, handed to
    // every unit, refused by name before anything starts where it is missing.
    const language = audienceLanguage(resolve(BRIEF_REPO, briefAudienceFile(table)));
    if (language.error) fail(`${st.id}: ${language.error}`);
    let composed = null;
    // CROSS-CANDIDATE RULES ONLY (kogaki#1240). Every per-unit rule -- the Leg
    // shape (`validateLegs`), the Move ids, the closed Strand set, the
    // `reasoning` keys, the retired-field names, the Reader target derivation
    // and the ledger fields -- moved into `validateReaderPathUnit` below,
    // DECLARED to `job-supervise` and applied at the unit's own
    // classification (kogaki#1193's `classifyDetachedJobUnit`), so a breach
    // gets the unit's own re-ask rather than waiting for every unit to
    // finish and failing the whole set here. What is left needs every
    // Candidate in hand and cannot run any earlier: the count, and the three
    // duplicate grounds across the set (id, reader experience, characteristic).
    const validate = (cands) => {
      if (!Array.isArray(cands)) {
        refuseJudgment(`the assembled record carries no \`candidates\` array; ${st.input_shape}`);
      }
      // THE COUNT IS `assembleSelection`'s AND IS STATED HERE TOO, deliberately.
      // One to three per article is the Candidate gate's own bound (kogaki#1273:
      // one finished Candidate is enough, and the question is shown with it),
      // and a breach reaching `assemble_candidates` would fail the run after
      // the review state had already spent a judge call on every Candidate.
      if (cands.length < 1 || cands.length > 3) {
        refuseJudgment(`${cands.length} Candidate(s) — the Candidate gate presents one to three per `
          + "article, differing in reader experience; none leaves nothing to choose, and four "
          + "overruns the selector");
      }
      const seenId = new Set();
      const seenExp = new Set();
      const seenChar = new Set();
      for (const c of cands) {
        if (!c || typeof c.candidate_id !== "string" || c.candidate_id === "") {
          refuseJudgment("every Candidate carries a non-empty `candidate_id`");
        }
        if (seenId.has(c.candidate_id)) {
          refuseJudgment(`two Candidates carry the candidate_id ${JSON.stringify(c.candidate_id)} — `
            + "the id is what the owner's answer at the selection gate resolves through");
        }
        seenId.add(c.candidate_id);
        const expKey = String(c.reader_experience || "").trim().toLowerCase();
        if (seenExp.has(expKey)) {
          refuseJudgment(`candidate ${c.candidate_id} states a reader experience another Candidate `
            + "already states — Candidates differ in reader experience, or they are one Candidate "
            + "presented twice");
        }
        seenExp.add(expKey);
        const charKey = String(c.characteristic || "").trim().toLowerCase();
        if (seenChar.has(charKey)) {
          refuseJudgment(`candidate ${c.candidate_id} states a characteristic another Candidate already `
            + "states — Candidates differ in reader experience, and the characteristic is the name the "
            + "owner reads that difference by, so two that fold to one value are two options they cannot "
            + "tell apart at the label");
        }
        seenChar.add(charKey);
      }
      composed = cands;
    };
    const dir = rec._dir;
    const finishWith = (cands, judgmentAttribution, specializations = [], excluded = []) => {
      validate(cands);
      // THE MOVE-FIT RECORDS, ONE PER FINISHED CANDIDATE (kogaki#1307): each job unit
      // judged its own Candidate's Move fit before it finished, so the set
      // `adopt_candidate` renders from is assembled here rather than judged again.
      const specOut = join(dir, "brief-specialization.json");
      writeFileSync(specOut, JSON.stringify({ records: specializations }, null, 2) + "\n");
      rec.brief_specialization = relFromRepo(resolve(specOut));
      // THE UNITS THAT ENDED WITHOUT A FIT CANDIDATE, named above the Candidate question.
      rec.brief_compose_excluded = excluded;
      // THE BARE ARRAY, WRITTEN BESIDE THE RECORD. `src/review.mjs attach` reads
      // its `--candidates` as the Candidate array; writing the projection here
      // is what keeps that reader from unwrapping a job record its own way.
      const out = join(dir, "brief-candidates.json");
      writeFileSync(out, JSON.stringify(composed, null, 2) + "\n");
      rec.brief_candidates = out;
      rec.judgments[st.id] = judgmentAttribution;
      return null;
    };

    // RESUMPTION (kogaki#1193). `job await`'s "done" arm re-enters this state
    // carrying `--candidates <file>` -- one Candidate per finished unit,
    // already STRUCTURALLY validated by the supervisor
    // (`readerPathUnitRecord`/`classifyDetachedJobUnit`). The FULL
    // candidate-schema rules above -- cross-candidate dedup, the ledger, the
    // closed Strand set -- can only be checked with every unit in hand, so
    // they run here, once, over the assembled set; and a failure here is
    // TERMINAL rather than re-asked, on the owner's 2026-09-25 "no automatic
    // retries" ruling -- a detached job has already spent its one attempt per
    // unit, and there is no round left to spend repairing the whole set.
    if (args.candidates) {
      try {
        // THE WRAPPED SHAPE (`{candidates: [...]}`), NOT THE BARE ARRAY --
        // `finishReaderPathJobAwait` writes it that way deliberately, the same
        // envelope the whole-input judge's record used to carry, so a reader
        // of `reader-path-candidates.json` (a fixture, an operator) meets the
        // same top-level key either way.
        const doc = readJson(String(args.candidates));
        return finishWith(doc.candidates, relFromRepo(resolve(readerPathJobPath(dir))),
          Array.isArray(doc.specializations) ? doc.specializations : [],
          Array.isArray(doc.excluded) ? doc.excluded : []);
      } catch (e) {
        if (e instanceof JudgmentRefusal) fail(`${st.id}: ${e.message}`);
        throw e;
      }
    }

    // ALREADY OPEN (kogaki#1193). A job already started is polled again by
    // `job await`, never restarted.
    if (readReaderPathJob(dir)) {
      throw new DetachedJobStarted(st.id, readerPathJobPath(dir),
        `the reader-path job at ${readerPathJobPath(dir)} is already open -- run \`${READER_PATH_JOB_AWAIT_COMMAND}\` `
        + "to poll it (kogaki#1193).");
    }

    // START (kogaki#1193). The single whole-input ask this state used to make
    // -- "compose two to three Candidates in one call" -- is what outgrew the
    // hook's own bound (311 measured seconds against a 180s per-call bound,
    // 2026-09-24). It becomes three concurrent one-Candidate units, each
    // handed the SAME Brief, Strand set and Move library the whole-input ask
    // carried, and nothing else -- the Harness composes each unit's whole
    // prompt here, before the supervisor is spawned, so the detached process
    // resolves no schema and reads no table of its own.
    const cfg = judgeSettings(table, rec);
    // THE UNIT COUNT AND THE TWO BOUNDS ARE SETTINGS (kogaki#1307, kogaki#1355), read
    // before anything starts.
    const unitCount = briefJobSetting(table, "compose_path", "units");
    const { callLimitS, unitAttempts } = briefJobBounds(table, "compose_path");
    // THE MOVE-FIT ROW (kogaki#1307): judged per unit inside this job, so it is read here
    // and its prompt head rendered here, where the Brief's own table and flow are in hand;
    // the supervisor appends each unit's own input below the marker.
    const fitRow = table.reader_path_fit_unit
      || fail(`${st.id}: src/brief-workflow.json declares no reader_path_fit_unit row for the job unit's Move-fit `
        + "judgment — nothing was started (kogaki#1307).");
    // THE SHARED BASE, DISCLOSED (kogaki#1193). Every unit's own prompt is
    // written straight into `reader-path-job-units.json` by
    // `startDetachedJobSupervisor` below and never lands under this state's
    // ordinary `brief-judge-input-<id>.json` name — but the fields every unit
    // shares (the Brief, the Strand set, the Move library) are the same
    // record a reader of THIS state's input has always found there, so it is
    // written here once, before the per-unit prompts are built, rather than
    // leaving that path silently unwritten.
    writeJudgeInput(rec, st, {
      state: st.id,
      brief: relFromRepo(briefPath),
      brief_document: doc,
      strands_you_may_use: strandIds,
      moves_you_may_bind: library.moves,
      units: unitCount,
      language: language.language,
    });
    // THE UNIT'S OWN ROW (kogaki#1203), read fresh per unit build rather than
    // reusing `st`: `st`'s own `input_shape`/`refusal` state the ASSEMBLED
    // three-candidate shape (`{candidates:[...]}`) that `validate()` above
    // checks, and a unit answering to that shape is refused by
    // `readerPathUnitRecord`, which parses a bare Candidate at its own root.
    const unitRow = table.reader_path_unit
      || fail(`${st.id}: src/brief-workflow.json declares no reader_path_unit row for the Detached `
        + "Job's per-unit prompt — nothing was started (kogaki#1203).");
    // DIFFERENTIATION'S OWN RECORD (kogaki#1206), one entry per unit, read
    // before any unit's prompt is built — `differentiation` precedes this
    // state and its own count refusal already guarantees one entry per unit
    // here, so a missing entry below is this state's own bug rather than a
    // reachable input.
    const differentiation = readJson(rec.brief_differentiation
      || fail(`${st.id} has no differentiation record — \`differentiation\` writes it and precedes `
        + "this state."));
    const survivorCount = Array.isArray(differentiation.leg1_survivors) ? differentiation.leg1_survivors.length : 0;
    const units = Array.from({ length: unitCount }, (_, i) => i + 1).map((n) => {
      const input = {
        state: st.id,
        brief: relFromRepo(briefPath),
        brief_document: doc,
        strands_you_may_use: strandIds,
        moves_you_may_bind: library.moves,
        unit_number: n,
        // GIVEN, not composed (kogaki#1216): the Brief's one Reader start, the
        // same value the assignment block above the marker renders.
        reader_start: differentiation.reader_start,
        language: language.language,
      };
      const entry = (differentiation.entries || []).find((e) => e.unit_number === n)
        || fail(`${st.id}: the differentiation record carries no entry for unit ${n} — its own count `
          + "refusal should have caught this. Nothing was started.");
      const basePrompt = judgePrompt(unitRow, JSON.stringify(input, null, 2), input, null);
      // SPLICED ABOVE THE INPUT MARKER, NEVER INSIDE THE INPUT (kogaki#1206
      // acceptance 2): the marker's own contract is that everything past it is
      // the composed input file verbatim, so the assignment rides as
      // instruction ahead of it, the same layer the schema and the record
      // example already occupy.
      const markerAt = basePrompt.indexOf(JUDGE_INPUT_MARKER);
      const prompt = markerAt === -1 ? basePrompt
        : `${basePrompt.slice(0, markerAt)}${differentiationBlockFor(entry, differentiation.reader_start, survivorCount)}\n\n${basePrompt.slice(markerAt)}`;
      return { id: `candidate-${n}`, prompt };
    });
    startDetachedJobSupervisor(dir, {
      units,
      command: cfg.command,
      model: cfg.model,
      outputFormat: cfg.outputFormat,
      callLimitS,
      unitAttempts,
      stallS: READER_PATH_JOB_STALL_S,
      heartbeatMs: jobHeartbeatMs(),
      // THE DECLARED MOVE-FIT JUDGE (kogaki#1307): once a unit's record passes the
      // validator, the supervisor runs one more headless session over it with what
      // `readerPathFitPrompt` builds, and reads the answer with `readerPathFitVerdict`.
      // A Leg that does not fit its Move is a schema refusal of the unit.
      fitJudge: {
        module: "src/brief.mjs",
        prompt_export: "readerPathFitPrompt",
        verdict_export: "readerPathFitVerdict",
        inputs: { movesDir, readerStart: differentiation.reader_start, thesis: briefThesis(record),
          promptHead: judgePrompt(fitRow, "", null, null) },
      },
      // THE DECLARED VALIDATOR (kogaki#1240) -- named, never implicit. The
      // detached `job-supervise` process is a fresh `node src/terrain.mjs`
      // entrypoint and never statically imports Brief-specific code; it
      // dynamically imports exactly this module and export, and the Candidate
      // ids every unit's materials and ledger must resolve against, and the
      // Reader start they must carry back unchanged, are handed over here
      // rather than re-derived inside the subprocess.
      validator: {
        module: "src/brief.mjs",
        export: "validateReaderPathUnit",
        inputs: { strandIds, readerStart: differentiation.reader_start, movesDir, definedTerms: definedTermsOf(record) },
      },
    });
    throw new DetachedJobStarted(st.id, readerPathJobPath(dir),
      `reader-path job started at ${readerPathJobPath(dir)} (kogaki#1193) -- run \`${READER_PATH_JOB_AWAIT_COMMAND}\` `
      + "to poll it.");
  },

  // ---- JUDGMENT POINT 2. Path review, which is REASONING and never a verdict.
  //
  // A DETACHED JOB, ONE UNIT PER CANDIDATE (kogaki#1301), split the way
  // `compose_path` was split at kogaki#1193: the one synchronous call over
  // every Candidate outgrew the hook advance's bound. Every item this state
  // judges is per Candidate, so each unit carries its own Candidate, that
  // Candidate's own `discharge_rows`, the Persona's
  // line and the review areas, and nothing of its siblings. `attachReview` is
  // still the validator, applied per unit at the unit's own classification
  // (`validateReviewPathUnit`), so a review that would be unattachable is
  // re-asked inside the job rather than refused at the attach.
  review_path: async (rec, st, args, table) => {
    const cands = readJson(rec.brief_candidates
      || fail(`${st.id} has no composed Candidates — \`compose_path\` writes them and precedes this state.`));
    const job = detachedJobFor(rec._dir, st.id);

    // RESUMPTION (kogaki#1301). `job await`'s "done" arm re-enters this state
    // carrying `--review-result <file>`: the finished units' entries keyed by
    // `candidate_id`, and the Candidates whose unit did not end `done`. The
    // record keeps the shape the single call wrote, so `attach_review` reads it
    // unchanged; a Candidate left unreviewed is not offered, and is named above the
    // Candidate question beside every compose unit that ended with no fit Candidate.
    if (args["review-result"]) {
      const result = readJson(String(args["review-result"]));
      const review = result && typeof result.review === "object" && result.review ? result.review : {};
      const unreviewed = Array.isArray(result && result.unreviewed) ? result.unreviewed : [];
      const reviewed = cands.filter((c) => Object.prototype.hasOwnProperty.call(review, c.candidate_id));
      if (reviewed.length === 0) fail(`${st.id}: the path-review job ended \`done\` and its result carries no reviewed Candidate.`);
      const r = attachReview(reviewed, review, {});
      if (r.error) fail(`${st.id}: ${r.error}`);
      const out = join(rec._dir, "brief-review.json");
      writeFileSync(out, JSON.stringify(review, null, 2) + "\n");
      rec.brief_review = relFromRepo(resolve(out));
      rec.judgments[st.id] = relFromRepo(resolve(readerPathJobPath(job.jobDir)));
      rec.brief_review_unfinished = unreviewed.map((u) => {
        const c = cands.find((x) => x.candidate_id === u.candidate_id) || {};
        return { candidate_id: u.candidate_id, characteristic: c.characteristic, review_unfinished: u.status };
      });
      rec.brief_excluded = [...(rec.brief_compose_excluded || []), ...rec.brief_review_unfinished];
      if (reviewed.length < cands.length) {
        const outCands = join(rec._dir, "brief-candidates-reviewed.json");
        writeFileSync(outCands, JSON.stringify(reviewed, null, 2) + "\n");
        rec.brief_candidates_reviewed = outCands;
      }
      return null;
    }

    // ALREADY OPEN: polled again by `job await`, never restarted.
    if (readReaderPathJob(job.jobDir)) {
      throw new DetachedJobStarted(st.id, readerPathJobPath(job.jobDir),
        `the path-review job at ${readerPathJobPath(job.jobDir)} is already open -- run \`${READER_PATH_JOB_AWAIT_COMMAND}\` `
        + "to poll it (kogaki#1301).");
    }

    // THE BRIEF'S DEFINED TERMS, the claim register's one declared side
    // (kogaki#1331, narrowing kogaki#1281): whether a claim uses a term the
    // Brief classifies `defined` that no `introduces` entry up to its Leg has
    // handed it. The Persona's `prior_knowledge` is not in this input — it
    // granted words, and the grant is removed (owner decision 2026-10-10).
    const definedTerms = definedTermsOf(readMintedBrief(rec, st).record);
    const unitRow = table.review_path_unit
      || fail(`${st.id}: src/brief-workflow.json declares no review_path_unit row for the Detached `
        + "Job's per-Candidate prompt — nothing was started (kogaki#1301).");
    // THE SHARED BASE, DISCLOSED, as `compose_path` writes its own: the fields
    // every unit carries, and the ids of the Candidates the units review.
    writeJudgeInput(rec, st, {
      state: st.id,
      review_areas: REVIEW_AREAS,
      discharge_verdicts: DISCHARGE_VERDICTS,
      defined_terms: definedTerms,
      units: cands.map((c, i) => ({ unit: `review-${i + 1}`, candidate_id: c.candidate_id })),
    });
    // ONE PROMPT PER CANDIDATE, carrying that Candidate alone. THE MECHANICAL
    // HALF IS EXTRACTED HERE (kogaki#1283): which rows, which claims, for the
    // judge to compare — never the comparison itself.
    const units = cands.map((c, i) => {
      const input = {
        state: st.id,
        review_areas: REVIEW_AREAS,
        discharge_verdicts: DISCHARGE_VERDICTS,
        // THE LEGS CARRY THEIR DERIVED BEFORE-STATES (kogaki#1325), the same
        // states the Brief will render, so the review reads the path the
        // reader walks rather than a Candidate missing half of each transition.
        candidate_you_must_review: { ...c, legs: deriveReaderStatesBefore(c.legs, c.reader_start) },
        defined_terms: definedTerms,
        discharge_rows: dischargeRows(c.legs, c.obligations),
      };
      return { id: `review-${i + 1}`, prompt: judgePrompt(unitRow, JSON.stringify(input, null, 2), input, null) };
    });
    // WHICH UNIT REVIEWS WHICH CANDIDATE is the Harness's own record, never the
    // Model's: the result is keyed by `candidate_id` from this map alone.
    rec.brief_review_units = Object.fromEntries(units.map((u, i) => [u.id, cands[i].candidate_id]));
    rec.detached_job_dirs = { ...(rec.detached_job_dirs || {}), [st.id]: REVIEW_PATH_JOB_DIR };
    mkdirSync(job.jobDir, { recursive: true });
    const cfg = judgeSettings(table, rec);
    startDetachedJobSupervisor(job.jobDir, {
      units,
      command: cfg.command,
      model: cfg.model,
      outputFormat: cfg.outputFormat,
      ...briefJobBounds(table, "review_path"),
      stallS: READER_PATH_JOB_STALL_S,
      heartbeatMs: jobHeartbeatMs(),
      recordArray: "claim_register",
      validator: {
        module: "src/brief.mjs",
        export: "validateReviewPathUnit",
        inputs: { candidates: Object.fromEntries(units.map((u, i) => [u.id, cands[i]])) },
      },
    });
    throw new DetachedJobStarted(st.id, readerPathJobPath(job.jobDir),
      `path-review job started at ${readerPathJobPath(job.jobDir)} (kogaki#1301) -- run \`${READER_PATH_JOB_AWAIT_COMMAND}\` `
      + "to poll it.");
  },

  attach_review: (rec, st, args) => {
    const out = join(rec._dir, "brief-reviewed.json");
    cmdAttach({
      ...args,
      // EVERY FINISHED, REVIEWED CANDIDATE (kogaki#1307): Move fit was judged inside the
      // compose job, so a Candidate here already fits its Moves.
      candidates: rec.brief_candidates_reviewed || rec.brief_candidates
        || fail(`${st.id} has no composed Candidates — \`compose_path\` writes them and precedes this state.`),
      review: resolve(BRIEF_REPO, rec.brief_review
        || fail(`${st.id} has no review record — \`review_path\` writes it and precedes this state.`)),
      brief: needBrief(rec, st),
      out,
    });
    rec.brief_reviewed = out;
    return null;
  },

  assemble_candidates: (rec, st, args) => {
    const out = join(rec._dir, "brief-selection.json");
    cmdAssemble({
      ...args,
      reviewed: rec.brief_reviewed
        || fail(`${st.id} has no reviewed Candidates — \`attach_review\` writes them and precedes this state.`),
      brief: needBrief(rec, st),
      // THE OPENING-MOVE CHECK'S OWN INPUT (kogaki#1206), carried through so
      // `assembleSelection` can refuse a Candidate whose first Leg does not
      // bind the Move `differentiation` assigned its unit, naming the unit.
      differentiation: rec.brief_differentiation
        || fail(`${st.id} has no differentiation record — \`differentiation\` writes it and precedes this state.`),
      out,
    });
    rec.brief_selection = out;
    return null;
  },

  adopt_candidate: (rec, st, args) => {
    const briefPath = needBrief(rec, st);
    const chosen = selectedCandidateId(rec, st);
    const set = readJson(resolve(BRIEF_REPO, rec.brief_specialization
      || fail(`${st.id} has no specialization record — the compose job writes one per finished Candidate (kogaki#1307).`)));
    const selected = (set.records || []).find((r) => r.candidate_id === chosen)
      || fail(`${st.id}: no compose job unit judged the Move fit of Candidate ${JSON.stringify(chosen)}. Nothing was written.`);
    const specialization = join(rec._dir, "brief-specialization-selected.json");
    writeFileSync(specialization, JSON.stringify(selected, null, 2) + "\n");
    cmdAdoptCandidate({
      ...args,
      brief: briefPath,
      reviewed: rec.brief_reviewed,
      candidate: chosen,
      specialization,
      // THE SELECTION IS THE HARNESS'S OWN CAPTURE FILE, passed whole.
      // `validateOwnerAnswer` filters it by gate id and binds the answer to the
      // option set it was offered against, so the file holding both gates'
      // rows is read as this gate's answer and no other.
      selection: captureFile(rec),
    });
    return { artifact: briefPath };
  },

  done: () => null,
};

// ---- THE OPTION-COMPOSER HALF. A GATE state is a table row PLUS an option
// composer, and the executor invents neither options nor a judgment. Both
// composers below return only the RUN's options: the registry's standing
// premise-negation is merged in by `emitGateDeclaration` from
// `src/gate-registry.json`, after them and in that order — which is the order
// both digests are taken over.
export const GATE_WORK = {
  // THE OPTIONS ARE `enter`'S, CARRIED OVER AND NOT RECOMPOSED. `enter` writes
  // `state.gate` — the 2-3 (Thesis, name) pairs, the premise negation, the
  // free-text prompt — and `adopt` digests over that same list. Recomposing here
  // would be a second answer to what the owner was shown.
  THESIS_ADOPTION: (rec) => {
    const state = readJson(rec.brief_run_state
      || fail("THESIS_ADOPTION has no run state to raise a gate from — `enter` writes it and precedes this wait."));
    const gate = state.gate;
    if (!gate || !Array.isArray(gate.options) || gate.options.length === 0) {
      fail("the run state carries no thesis-determination gate declaration — `enter` composes it, and an "
        + "answer is admitted only at the wait that declared it.");
    }
    // THE SETTLED SET IS SHOWN ABOVE THE QUESTION (PR #1109 round 1).
    // `settled_set_provenance` is one of `GATE_CALL_READING_KEYS`, so
    // `composeGateCall` puts it in the question text itself — inside the bytes
    // the open-gate hook compares — rather than leaving it for a session to
    // relay. The Theses below were composed over this set and no other, and
    // where it came from is the one fact the owner cannot recover from the
    // options.
    const set = rec.settled_set;
    return {
      options: gate.options
        .filter((o) => o.id !== "back-to-terrain")
        .map((o) => ({ id: o.id, label: o.label })),
      extra: set
        // NO SURVEY IS NAMED (kogaki#1121). This read `set.ids` and
        // `set.survey`, the two fields of the Terrain-run form that #1116
        // removed when the set became `{ addresses, via }` — so the sentence
        // named the set as `undefined` in the very bytes the open-gate hook
        // compares. Since #1116 the set is entered on the command line and
        // there is no survey behind it, so what is rendered is the addresses
        // and how they were entered, and nothing else.
        ? { settled_set_provenance: `Composed over the settled Strand set ${(set.addresses || []).join(", ")}, entered ${set.via}.` }
        : {},
    };
  },

  // ONE COMPOSER FOR THE OPTION SET, CALLED BY THE GATE AND BY ADOPTION.
  // `selectionOptionIds` is what the deleted `gate-candidate` called and what
  // `adoptCandidate` still calls, so the set the owner is shown, the set the
  // digest is taken over, and the set adoption re-derives are one computation.
  CANDIDATE_SELECTION: (rec) => {
    const reviewed = readJson(rec.brief_reviewed
      || fail("CANDIDATE_SELECTION has no reviewed Candidates to offer — `attach_review` writes them and precedes this wait."));
    const { record } = readMintedBrief(rec, { id: "CANDIDATE_SELECTION" });
    const offered = selectionOptionIds(reviewed, record);
    if (offered.error) {
      fail(`${offered.error}\n\nNo gate is raised: the Candidates cannot be presented, so there is nothing `
        + "to choose between. Repair the Candidates, not the gate.");
    }
    return {
      // THE DESCRIPTION TRAVELS WITH THE OPTION (kogaki#1126). This mapping used
      // to keep `id` and `label` and drop everything else, so the description
      // `assembleSelection` composed never reached the declaration and
      // `composeGateCall` fell back to showing the id — the `A`/`B`/`C` column
      // measured at the 2026-09-15 gate. A projection that silently narrows the
      // composer's own output is a second composer, which is the shape the one
      // named composer above exists to prevent.
      options: offered.options
        .filter((o) => o.id !== "none-of-these")
        .map((o) => ({ id: o.id, label: o.label, description: o.description })),
      extra: candidateSelectionExtra(rec.brief_excluded || []),
    };
  },
};
