// brief/renderers — the renderer half (one entry per state the table
// declares) and the option-composer half (one entry per gate state). Cut from
// src/brief.mjs at its named sections (kogaki#1466); the design and its
// rulings are stated in the Issues each block below names.

// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): the
// rule lives in `src/SPEC-REFERENCES.md`. THE NAMES THIS FILE USES: none.
//
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { cmdAdoptCandidate, cmdAssemble, selectionOptionIds } from "../assemble.mjs";
import {
  audienceLanguage,
  definedTermsOf,
  definedTermsRefusal,
  personaPriorKnowledgeLine,
  readerPersona,
  recoverabilityOf,
  renderingsRefusal,
  validateLegs,
} from "../compose.mjs";
import { applyLegSections } from "../compose/sections.mjs";
import {
  componentsOf,
  elementLabel,
  mintStructure,
  partitionComponents,
  pathReachRefusal,
  readHolds,
  structureLegs,
  validateApex,
  validateReadSet,
} from "../compose/structure.mjs";
import { REVIEW_AREAS, attachReview, cmdAttach } from "../review.mjs";
import {
  DetachedJobStarted,
  READER_PATH_JOB_AWAIT_COMMAND,
  READER_PATH_JOB_STALL_S,
  jobHeartbeatMs,
  readReaderPathJob,
  readerPathJobPath,
  startDetachedJobSupervisor,
} from "../workflow/detached-job.mjs";
import { judgePrompt, judgeSettings, settingValue } from "../workflow/judge.mjs";
import { JudgmentRefusal, relFromRepo } from "../workflow/run-record.mjs";
import {
  classifyHomes,
  cmdAdopt,
  cmdEnter,
  cmdMint,
  composeThesisCandidates,
  pendingHomeCollision,
  thesesDirOf,
  thesisFreeTextRefusal,
  thesisGate,
  thesisWords,
  unconnectedLines,
  withThesis,
} from "./candidates.mjs";
import { candidateSelectionExtra, selectedCandidateId } from "./reader-path-unit.mjs";
import {
  BRIEF_REPO,
  REVIEW_PATH_JOB_DIR,
  briefAudienceFile,
  briefJobBounds,
  briefThesis,
  captureFile,
  detachedJobFor,
  entryInputs,
  fail,
  judged,
  needBrief,
  needRunState,
  readJson,
  readMintedBrief,
  refuseJudgment,
  strandClaims,
  writeJudgeInput,
} from "./run-state.mjs";

// THE RENDERINGS RECORD'S JUDGMENT (kogaki#1494), asked at the start of the
// `compose_path` state (kogaki#1768): the `renderings_unit` row over the settled Strands'
// claims, the Thesis and the Brief's Defined Terms. The record is validated by
// `renderingsRefusal`, so a re-ask carries its text. Returns the record's path.
async function judgeRenderings(rec, st, table, args, { record, thesis, language }) {
  const row =
    table.renderings_unit ||
    fail(
      `${st.id}: src/brief-workflow.json declares no renderings_unit row for the Brief's renderings record (kogaki#1494)`,
    );
  const claims = strandClaims(readJson(needRunState(rec, st)));
  const validate = (p) => {
    let r;
    try {
      r = readJson(p);
    } catch (e) {
      refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${row.input_shape}`);
    }
    if (!r || r.version !== "1") {
      refuseJudgment(
        `\`version\` must be "1" (src/candidate-schema.json, \`renderings_record\`); received ${JSON.stringify(r && r.version)}`,
      );
    }
    const err = renderingsRefusal(r.renderings, { thesis: thesis || "", claims: claims.map((c) => c.claim) });
    if (err) refuseJudgment(err);
  };
  const composeInputFor = () =>
    writeJudgeInput(rec, row, {
      state: st.id,
      unit: row.id,
      thesis,
      strand_claims: claims,
      defined_terms: Array.isArray(record && record.defined_terms) ? record.defined_terms : [],
      language,
    });
  return await judged(rec, row, table, args, "renderings", composeInputFor, validate);
}

// The served Strand claims of the run, from the run state `enter` wrote; a run
// record carrying no run state serves none.
function servedClaims(rec) {
  return rec.brief_run_state ? strandClaims(readJson(rec.brief_run_state)) : [];
}

// The renderings record's entries, as the `compose_path` state wrote it. A
// run that predates the record carries none, which renders nothing.
function renderingsFor(rec) {
  if (!rec.brief_renderings) return [];
  const r = readJson(resolve(BRIEF_REPO, rec.brief_renderings));
  return Array.isArray(r && r.renderings) ? r.renderings : [];
}

// THE PERSONA AND THE ARTICLE'S LANGUAGE (kogaki#1216, kogaki#1370, kogaki#1417),
// read from the Audience file the `compose_path` row names, and refused by name
// as the STATE where either is missing — a judge asked to read for a Persona it
// was never handed answers from nothing.
function audienceFor(table, st) {
  const file = resolve(BRIEF_REPO, briefAudienceFile(table));
  const persona = readerPersona(file);
  if (persona.error) fail(`${st.id}: ${persona.error}`);
  const language = audienceLanguage(file);
  if (language.error) fail(`${st.id}: ${language.error}`);
  return {
    persona: { reader: persona.reader, prior_knowledge: personaPriorKnowledgeLine(persona) },
    language: language.language,
  };
}

// Every settled Strand's served claim, or the STATE's refusal naming the Strands
// that carry none: the structure is read from every claim (kogaki#1768), and a
// Strand whose rendering is a marker has no claim to read.
function everyClaim(state, st) {
  const claims = strandClaims(state);
  const missing = (state.strands || [])
    .filter((s) => !claims.some((c) => c.id === s.display_id))
    .map((s) => s.display_id);
  if (missing.length) {
    fail(
      `${st.id}: the settled Strand${missing.length === 1 ? "" : "s"} ${missing.join(", ")} carr${missing.length === 1 ? "ies" : "y"} no served claim, ` +
        "and the structure is read from every settled Strand's claim (kogaki#1768). Re-settle the set through Terrain. Nothing was written.",
    );
  }
  return claims;
}

// THE READER PATH FROM THE STRUCTURE (kogaki#1775): the Legs derived by the
// Harness with no Call, one per relation and higher-order relation the apex
// reaches (`structureLegs`), refused where they break the path's reach, each
// Leg's `opens_section` written by the one `leg_sections` Call, and ONE
// Candidate written. The Brief records no Round.
async function finishReaderPath(rec, st, table, args, { structure, language }) {
  const claims = servedClaims(rec);
  const derived = structureLegs(structure, claims);
  const bad = pathReachRefusal(derived, structure);
  if (bad) fail(`${st.id}: the derived Legs break the path's reach: ${bad}`);
  const row =
    table.leg_sections ||
    fail(`${st.id}: src/brief-workflow.json declares no leg_sections row for the Legs' Sections (kogaki#1768)`);
  let legs = null;
  const validate = (p) => {
    let r;
    try {
      r = readJson(p);
    } catch (e) {
      refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${row.input_shape}`);
    }
    const out = applyLegSections(derived, r);
    if (out.error) refuseJudgment(out.error);
    legs = out.legs;
  };
  const composeInputFor = () =>
    writeJudgeInput(rec, row, {
      state: st.id,
      unit: row.id,
      language,
      legs: derived.map((l) => ({ leg_id: l.leg_id, relation: l.relation, text: l.text })),
    });
  rec.brief_leg_sections = await judged(rec, row, table, args, "leg-sections", composeInputFor, validate);
  const v = validateLegs(legs, { structure });
  if (v.error) fail(`${st.id}: ${v.error}`);
  const candidate = {
    candidate_id: "reader-path",
    legs: v.legs,
    reasoning: {
      leg_validity:
        "The Legs are derived from the structure with no Call, one per relation and higher-order relation " +
        "the apex reaches, each saying its relation's `holds`; the apex's Leg attains the Thesis.",
    },
  };
  rec.brief_compose_excluded = [];
  // THE BARE ARRAY, WRITTEN BESIDE THE RECORD. `src/review.mjs attach` reads
  // its `--candidates` as the Candidate array.
  const out = join(rec._dir, "brief-candidates.json");
  writeFileSync(out, JSON.stringify([candidate], null, 2) + "\n");
  rec.brief_candidates = out;
  rec.judgments[st.id] = rec.brief_leg_sections;
  return null;
}

// THE THESIS BOUND (kogaki#1773): every candidate whose Thesis is over `brief.thesis_words` is
// rewritten once, by ONE Call under the `thesis_bound_unit` row handed each sentence, the bound and
// the component it attains. A rewrite still over the bound, or one that drops or adds a candidate,
// refuses and the run stops naming the length; the row declares no re-ask.
export function thesisBoundRefusal(answer, over, bound) {
  if (
    !answer ||
    typeof answer !== "object" ||
    Array.isArray(answer) ||
    !Array.isArray(answer.theses) ||
    Object.keys(answer).some((k) => k !== "theses")
  ) {
    return "the answer is not one record carrying exactly `theses`, a list";
  }
  const want = new Set(over.map((c) => c.id));
  const seen = new Set();
  for (const [i, t] of answer.theses.entries()) {
    if (
      !t ||
      typeof t !== "object" ||
      typeof t.candidate !== "string" ||
      typeof t.thesis !== "string" ||
      Object.keys(t).some((k) => k !== "candidate" && k !== "thesis")
    )
      return `theses[${i}] is not \`{ candidate, thesis }\``;
    if (!want.has(t.candidate) || seen.has(t.candidate))
      return `theses[${i}] names ${JSON.stringify(t.candidate)}, which is not a candidate to rewrite or is named twice`;
    seen.add(t.candidate);
    if (t.thesis.trim() === "" || /\{[^}]+\}/.test(t.thesis))
      return `the rewrite of ${t.candidate} is empty or carries a \`{<id>}\``;
    const n = thesisWords(t.thesis);
    if (n > bound)
      return `the rewrite of ${t.candidate} is ${n} words, and the Thesis is bounded at ${bound} words (brief.thesis_words)`;
  }
  const missing = over.find((c) => !seen.has(c.id));
  return missing ? `the answer carries no rewrite of ${missing.id}` : null;
}

export function briefThesisWords(table) {
  const row = table && table.thesis_bound_unit;
  const n = Number(row ? settingValue(row.thesis_words) : undefined);
  return Number.isInteger(n) && n > 0
    ? n
    : fail(
        "src/brief-workflow.json's `thesis_bound_unit` row declares no positive `thesis_words` -- it names " +
          "`brief.thesis_words` in kogaki.settings.json (kogaki#1773). Nothing was written.",
      );
}

async function boundTheses(rec, table, args, { candidates, connected, language, described }) {
  const bound = briefThesisWords(table);
  const over = candidates.filter((c) => thesisWords(c.thesis) > bound);
  if (!over.length) return candidates;
  const row = table.thesis_bound_unit;
  let rewrites = null;
  const validate = (p) => {
    let r;
    try {
      r = readJson(p);
    } catch (e) {
      refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${row.input_shape}`);
    }
    const bad = thesisBoundRefusal(r, over, bound);
    if (bad) refuseJudgment(bad);
    rewrites = new Map(r.theses.map((t) => [t.candidate, t.thesis]));
  };
  const composeInputFor = () =>
    writeJudgeInput(rec, row, {
      state: "apex",
      unit: row.id,
      language,
      thesis_words: bound,
      theses: over.map((c) => ({
        candidate: c.id,
        thesis: c.thesis,
        words: thesisWords(c.thesis),
        attains: described(connected.find((k) => k.component === c.component)),
      })),
    });
  rec.brief_thesis_bound = await judged(rec, row, table, args, "thesis-bound", composeInputFor, validate);
  return candidates.map((c) => (rewrites.has(c.id) ? withThesis(c, rewrites.get(c.id)) : c));
}

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

  // ---- JUDGMENT POINT 0. The structure (kogaki#1768): the settled Strands'
  // served claims read as ONE RelationalStructure under the `read_structure`
  // row, before any Thesis exists, so no `attains_thesis` is written and every
  // higher-order relation names the claims that state it. The structure is
  // written onto the run state, where the `apex` state reads it.
  read_structure: async (rec, st, args, table) => {
    const runState = needRunState(rec, st);
    const state = readJson(runState);
    const claims = everyClaim(state, st);
    const { persona } = audienceFor(table, st);
    let structure = null;
    const validate = (p) => {
      let r;
      try {
        r = readJson(p);
      } catch (e) {
        refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${st.input_shape}`);
      }
      const m = mintStructure(r);
      if (m.text) refuseJudgment(m.text);
      const v = validateReadSet(m.structure, claims, { thesis: false });
      if (v.text) refuseJudgment(v.text);
      structure = m.structure;
    };
    const composeInputFor = () => writeJudgeInput(rec, st, { state: st.id, claims, persona });
    const path = await judged(rec, st, table, args, "structure", composeInputFor, validate);
    state.structure = structure;
    writeFileSync(runState, JSON.stringify(state, null, 2) + "\n");
    rec.brief_structure = path;
    rec.judgments[st.id] = path;
    return null;
  },

  // ---- JUDGMENT POINT 1. The apexes (kogaki#1768, kogaki#1773): the structure's connected
  // components are computed here (`componentsOf`); only a component a higher-order relation
  // connects is a candidate, the rest recorded as unconnected material. A component with one
  // top carries that top as its apex; one Call writes one apex per component with several.
  // A Thesis over `brief.thesis_words` is rewritten once by the `thesis_bound_unit` Call before
  // the gate is composed, and every candidate's home is classified before it (kogaki#1742).
  apex: async (rec, st, args, table) => {
    const runState = needRunState(rec, st);
    const state = readJson(runState);
    if (!state.structure)
      fail(`${st.id}: the run state carries no structure — \`read_structure\` writes it and precedes this state.`);
    const claims = everyClaim(state, st);
    const components = componentsOf(state.structure, claims);
    const { connected, unconnected } = partitionComponents(components);
    state.unconnected = unconnected;
    if (!connected.length) {
      writeFileSync(runState, JSON.stringify(state, null, 2) + "\n");
      fail(
        `${st.id}: no Thesis can be offered — ${unconnectedLines(unconnected).join(" ")} Go back through Terrain and re-settle the set; nothing was written under theses/.`,
      );
    }
    const multi = connected.filter((k) => k.top.length > 1);
    const { language } = audienceFor(table, st);
    const element = new Map(
      [...state.structure.relations, ...state.structure.higher_order].map((x) => [
        x.id,
        { id: x.id, name: x.name, holds: readHolds(state.structure, x.holds) },
      ]),
    );
    const described = (k) => ({
      component: k.component,
      relations: k.relations.map((id) => element.get(id)),
      higher_order: k.higher_order.map((id) => element.get(id)),
      top: k.top,
      claims: k.claims,
    });
    let apexes = [];
    if (multi.length) {
      const validate = (p) => {
        let r;
        try {
          r = readJson(p);
        } catch (e) {
          refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${st.input_shape}`);
        }
        const v = validateApex(r, multi, state.structure);
        if (v.text) refuseJudgment(v.text);
        apexes = r.apexes;
      };
      const composeInputFor = () =>
        writeJudgeInput(rec, st, { state: st.id, language, claims, components: multi.map(described) });
      rec.brief_apex = await judged(rec, st, table, args, "apex", composeInputFor, validate);
      rec.judgments[st.id] = rec.brief_apex;
    }
    let candidates = composeThesisCandidates(apexes, connected, claims, state.structure);
    candidates = await boundTheses(rec, table, args, { candidates, connected, language, described });
    classifyHomes(candidates, state.strands, thesesDirOf(args));
    state.components = components;
    state.thesis_candidates = candidates;
    state.gate = thesisGate(candidates, state.strands);
    writeFileSync(runState, JSON.stringify(state, null, 2) + "\n");
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
    const row =
      table.defined_terms_unit ||
      fail(
        `${st.id}: src/brief-workflow.json declares no defined_terms_unit row for the Brief's Defined Terms (kogaki#1331)`,
      );
    const thesis = state.adopted_thesis;
    const claims = strandClaims(state);
    let entries = null;
    const validate = (p) => {
      let r;
      try {
        r = readJson(p);
      } catch (e) {
        refuseJudgment(`the record at ${p} is not JSON (${e.message}); ${row.input_shape}`);
      }
      if (!r || r.version !== "1") {
        refuseJudgment(
          `\`version\` must be "1" (src/candidate-schema.json, \`defined_terms_record\`); received ${JSON.stringify(r && r.version)}`,
        );
      }
      const err = definedTermsRefusal(r.defined_terms, { thesis, claims: claims.map((c) => c.claim) });
      if (err) refuseJudgment(err);
      entries = r.defined_terms;
    };
    const composeInputFor = () =>
      writeJudgeInput(rec, row, { state: st.id, unit: row.id, thesis, strand_claims: claims });
    rec.brief_defined_terms = await judged(rec, row, table, args, "defined-terms", composeInputFor, validate);
    return { artifact: cmdMint({ ...args, "run-state": runState, definedTerms: entries }) };
  },

  // ---- JUDGMENT POINT 2. The Reader Path (kogaki#1775): the renderings record
  // first, then the Legs derived from the Brief's adopted structure by the
  // Harness, with no Call but the one `leg_sections` Call that groups them.
  compose_path: async (rec, st, args, table) => {
    const { briefPath, record } = readMintedBrief(rec, st);
    const structure =
      record.structure ||
      fail(
        `${st.id}: the Brief at ${relFromRepo(briefPath)} carries no \`structure\` — the mint writes the adopted ` +
          "structure beside the Thesis, and the Reader Path is derived from it (kogaki#1768). Nothing was started.",
      );
    const thesis = briefThesis(record);
    const { language } = audienceFor(table, st);

    // THE RENDERINGS RECORD, ASKED FIRST (kogaki#1494, owner decision
    // 2026-10-21): the source terms the article will not keep, each with the
    // plain phrase it uses instead. The Path Review's recoverability entry and
    // adoption read it from `brief_renderings`.
    rec.brief_renderings = await judgeRenderings(rec, st, table, args, { record, thesis, language });
    try {
      return await finishReaderPath(rec, st, table, args, { structure, language });
    } catch (e) {
      if (e instanceof JudgmentRefusal) fail(`${st.id}: ${e.message}`);
      throw e;
    }
  },

  // ---- JUDGMENT POINT 3. Path review, which is REASONING and never a verdict.
  //
  // A DETACHED JOB, ONE UNIT PER CANDIDATE (kogaki#1301), split the way
  // `compose_path` was split at kogaki#1193: the one synchronous call over
  // every Candidate outgrew the hook advance's bound. Every item this state
  // judges is per Candidate, so each unit carries its own Candidate, that
  // Candidate alone (kogaki#1699: no `discharge_rows`), the Persona's
  // line and the review areas, and nothing of its siblings. `attachReview` is
  // still the validator, applied per unit at the unit's own classification
  // (`validateReviewPathUnit`), so a review that would be unattachable is
  // re-asked inside the job rather than refused at the attach.
  review_path: async (rec, st, args, table) => {
    const cands = readJson(
      rec.brief_candidates ||
        fail(`${st.id} has no composed Candidates — \`compose_path\` writes them and precedes this state.`),
    );
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
      if (reviewed.length === 0)
        fail(`${st.id}: the path-review job ended \`done\` and its result carries no reviewed Candidate.`);
      const r = attachReview(reviewed, review, {});
      if (r.error) fail(`${st.id}: ${r.error}`);
      // RECOVERABILITY, THE HARNESS'S OWN ENTRY (kogaki#1494): every claim's
      // proposition and every waypoint's point read against its Strand's
      // served claim under the renderings record, one entry per Leg, naming
      // the first word nothing recovers. Computed here rather than asked of
      // the judge, and attached beside the judged review it rides with. A run
      // serving no claim has no material to read against, and attaches none.
      const served = servedClaims(rec);
      if (served.length > 0) {
        const material = Object.fromEntries(served.map((c) => [c.id, c.claim]));
        const renderings = renderingsFor(rec);
        for (const c of reviewed) {
          review[c.candidate_id] = {
            ...review[c.candidate_id],
            recoverability: recoverabilityOf(c.legs, { material, renderings }),
          };
        }
      }
      const out = join(rec._dir, "brief-review.json");
      writeFileSync(out, JSON.stringify(review, null, 2) + "\n");
      rec.brief_review = relFromRepo(resolve(out));
      rec.judgments[st.id] = relFromRepo(resolve(readerPathJobPath(job.jobDir)));
      rec.brief_review_unfinished = unreviewed.map((u) => {
        const c = cands.find((x) => x.candidate_id === u.candidate_id) || {};
        return { candidate_id: c.candidate_id || u.candidate_id, review_unfinished: u.status };
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
      throw new DetachedJobStarted(
        st.id,
        readerPathJobPath(job.jobDir),
        `the path-review job at ${readerPathJobPath(job.jobDir)} is already open -- run \`${READER_PATH_JOB_AWAIT_COMMAND}\` ` +
          "to poll it (kogaki#1301).",
      );
    }

    // THE BRIEF'S DEFINED TERMS, the claim register's one declared side
    // (kogaki#1331, narrowing kogaki#1281): whether a claim uses a term the
    // Brief classifies `defined` that no `introduces` entry up to its Leg has
    // handed it. The Persona's `prior_knowledge` is not in this input — it
    // granted words, and the grant is removed (owner decision 2026-10-10).
    const { record } = readMintedBrief(rec, st);
    const definedTerms = definedTermsOf(record);
    // THE STRUCTURE'S REACH, THE HARNESS'S OWN CHECK (kogaki#1768): a Reader Path
    // leaving a reached relation uncarried, or not carrying the apex last, is
    // refused before any review is asked. The review reads the reach from the
    // same structure, handed to every unit.
    const structure = record.structure || null;
    if (structure) {
      for (const c of cands) {
        const bad = pathReachRefusal(c.legs, structure);
        if (bad) fail(`${st.id}: ${bad}. Nothing was started.`);
      }
    }
    const unitRow =
      table.review_path_unit ||
      fail(
        `${st.id}: src/brief-workflow.json declares no review_path_unit row for the Detached ` +
          "Job's per-Candidate prompt — nothing was started (kogaki#1301).",
      );
    // THE SHARED BASE, DISCLOSED, as `compose_path` writes its own: the fields
    // every unit carries, and the ids of the Candidates the units review.
    writeJudgeInput(rec, st, {
      state: st.id,
      review_areas: REVIEW_AREAS,
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
        // THE CANDIDATE AS COMPOSED (kogaki#1699): its Legs carry no reader
        // states and it carries no Obligations ledger, so nothing is derived.
        candidate_you_must_review: c,
        defined_terms: definedTerms,
        ...(structure ? { structure } : {}),
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
    throw new DetachedJobStarted(
      st.id,
      readerPathJobPath(job.jobDir),
      `path-review job started at ${readerPathJobPath(job.jobDir)} (kogaki#1301) -- run \`${READER_PATH_JOB_AWAIT_COMMAND}\` ` +
        "to poll it.",
    );
  },

  attach_review: (rec, st, args) => {
    const out = join(rec._dir, "brief-reviewed.json");
    cmdAttach({
      ...args,
      // EVERY FINISHED, REVIEWED CANDIDATE (kogaki#1307): Move fit was judged inside the
      // compose job, so a Candidate here already fits its Moves.
      candidates:
        rec.brief_candidates_reviewed ||
        rec.brief_candidates ||
        fail(`${st.id} has no composed Candidates — \`compose_path\` writes them and precedes this state.`),
      review: resolve(
        BRIEF_REPO,
        rec.brief_review || fail(`${st.id} has no review record — \`review_path\` writes it and precedes this state.`),
      ),
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
      reviewed:
        rec.brief_reviewed ||
        fail(`${st.id} has no reviewed Candidates — \`attach_review\` writes them and precedes this state.`),
      brief: needBrief(rec, st),
      out,
    });
    rec.brief_selection = out;
    return null;
  },

  adopt_candidate: (rec, st, args) => {
    const briefPath = needBrief(rec, st);
    const chosen = selectedCandidateId(rec, st);
    cmdAdoptCandidate({
      ...args,
      brief: briefPath,
      reviewed: rec.brief_reviewed,
      candidate: chosen,
      // THE RENDERINGS RECORD (kogaki#1494), written into the Brief beside the
      // adopted Reader Path; a run that predates it passes none.
      ...(rec.brief_renderings ? { renderings: resolve(BRIEF_REPO, rec.brief_renderings) } : {}),
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
  // `state.gate` — the 2-3 (Thesis, name) pairs and the premise negation —
  // and `adopt` digests over that same list. Recomposing here
  // would be a second answer to what the owner was shown.
  THESIS_ADOPTION: (rec) => {
    const state = readJson(
      rec.brief_run_state ||
        fail("THESIS_ADOPTION has no run state to raise a gate from — `enter` writes it and precedes this wait."),
    );
    const gate = state.gate;
    if (!gate || !Array.isArray(gate.options) || gate.options.length === 0) {
      fail(
        "the run state carries no thesis-determination gate declaration — `enter` composes it, and an " +
          "answer is admitted only at the wait that declared it.",
      );
    }
    // THE SETTLED SET IS SHOWN ABOVE THE QUESTION (PR #1109 round 1).
    // `settled_set_provenance` is one of `GATE_CALL_READING_KEYS`, so
    // `composeGateCall` puts it in the question text itself — inside the bytes
    // the open-gate hook compares — rather than leaving it for a session to
    // relay. The Theses below were composed over this set and no other, and
    // where it came from is the one fact the owner cannot recover from the
    // options.
    const set = rec.settled_set;
    // A THESIS KEPT AT THE HOME-COLLISION GATE IS NAMED, NOT OFFERED (kogaki#1742):
    // its option is already gone from `state.gate`, so this line is the one
    // place the owner sees why.
    const kept = (state.thesis_candidates || [])
      .filter((c) => (state.home_answers || {})[c.id] === "keep")
      .map((c) => `Not offered: "${c.claim}" — you kept the existing Brief ${c.slug}.`);
    // NO SURVEY IS NAMED (kogaki#1121). Since #1116 the set is entered on the
    // command line and there is no survey behind it, so what is rendered is the
    // addresses and how they were entered, and nothing else.
    const provenance = [
      ...(set ? [`Composed over the settled Strand set ${(set.addresses || []).join(", ")}, entered ${set.via}.`] : []),
      ...kept,
      ...unconnectedLines(state.unconnected || []),
    ];
    return {
      options: gate.options.filter((o) => o.id !== "back-to-terrain").map((o) => ({ id: o.id, label: o.label })),
      extra: provenance.length ? { settled_set_provenance: provenance.join("\n") } : {},
    };
  },

  // THE HOME-COLLISION GATE (kogaki#1742): one raising per candidate whose home
  // holds the same Thesis, in candidate order. The three options are the
  // registry's own; the reading is the classification `enter` recorded.
  HOME_COLLISION: (rec) => {
    const state = readJson(
      rec.brief_run_state ||
        fail("HOME_COLLISION has no run state to raise a gate from — `enter` writes it and precedes this wait."),
    );
    const c =
      pendingHomeCollision(state) ||
      fail("HOME_COLLISION was entered with no candidate whose home holds the same Thesis left to answer.");
    return { options: [], extra: { home_collision: homeCollisionReading(c) } };
  },

  // ONE COMPOSER FOR THE OPTION SET, CALLED BY THE GATE AND BY ADOPTION.
  // `selectionOptionIds` is what the deleted `gate-candidate` called and what
  // `adoptCandidate` still calls, so the set the owner is shown, the set the
  // digest is taken over, and the set adoption re-derives are one computation.
  CANDIDATE_SELECTION: (rec) => {
    const reviewed = readJson(
      rec.brief_reviewed ||
        fail(
          "CANDIDATE_SELECTION has no reviewed Candidates to offer — `attach_review` writes them and precedes this wait.",
        ),
    );
    const { record } = readMintedBrief(rec, { id: "CANDIDATE_SELECTION" });
    const offered = selectionOptionIds(reviewed, record);
    if (offered.error) {
      fail(
        `${offered.error}\n\nNo gate is raised: the Candidates cannot be presented, so there is nothing ` +
          "to choose between. Repair the Candidates, not the gate.",
      );
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
      // THE READER PATH IS SHOWN ABOVE THE QUESTION (kogaki#1768, kogaki#1775):
      // its Legs, each with the relation it serves and its text. That reading is
      // the owner's reading of the Brief's sheet.
      extra: {
        ...candidateSelectionExtra(rec.brief_excluded || []),
        reader_path: readerPathReading(reviewed.candidates || [], record.structure || null),
      },
    };
  },
};

// THE READER PATH, AS THE OWNER READS IT ABOVE THE CANDIDATE QUESTION
// (kogaki#1775): each Leg with its Section heading where it opens one, the
// relation it serves as its name and the claim ids it is read from
// (kogaki#1772), and its `text`; the apex's Leg says it attains the Thesis.
export function readerPathReading(candidates, structure) {
  const lines = [];
  for (const c of candidates) {
    lines.push(`The Reader Path: ${(c.legs || []).length} Leg(s).`);
    for (const l of c.legs || []) {
      if (typeof l.opens_section === "string") lines.push(`Section: ${l.opens_section}`);
      lines.push(
        `${l.leg_id}${l.relation ? ` — ${elementLabel(structure, l.relation)}` : ""}${l.reaches_target ? " (attains the Thesis)" : ""}`,
      );
      if (typeof l.text === "string") lines.push(`  ${l.text}`);
    }
  }
  return lines.join("\n");
}

// The reading above the home-collision question (kogaki#1742): the existing
// Brief, whether every Strand is at the same hash or which are not, and what
// else its folder holds.
export function homeCollisionReading(c) {
  const h = c.home;
  const lines = [
    `A Brief named ${c.slug} already exists at ${relFromRepo(h.path)}/, with the same Thesis as this option:`,
    `"${c.claim}"`,
  ];
  if (h.same_pins) lines.push("Every Strand is at the same hash as in this run.");
  if (h.moved.length) lines.push(`These Strands are at a different hash now: ${h.moved.join(", ")}.`);
  if (h.added.length) lines.push(`This run adds Strands it did not use: ${h.added.join(", ")}.`);
  if (h.removed.length) lines.push(`It used Strands this run does not: ${h.removed.join(", ")}.`);
  lines.push(
    h.downstream.length
      ? `Its folder also holds later work: ${h.downstream.join(", ")}.`
      : "Its folder holds the Brief and nothing else.",
  );
  return lines.join("\n");
}

// ---- WHEN A CONDITIONAL STATE IS ENTERED (kogaki#1742), read from the run
// state rather than decided by the executor.
export const CONDITIONS = {
  HOME_COLLISION: (rec) => {
    if (!rec.brief_run_state || !existsSync(rec.brief_run_state)) return false;
    return (readJson(rec.brief_run_state).thesis_candidates || []).some(
      (c) => c.home && c.home.exists && c.home.same_thesis,
    );
  },
};

// ---- WHAT AN ANSWER AT A WAIT DOES BEYOND COMPLETING IT (kogaki#1742).
// `again` keeps the wait open for its next raising; `end` ends the run with
// nothing written.
export const ANSWER_WORK = {
  HOME_COLLISION: (rec, answer) => {
    const runPath = rec.brief_run_state;
    const state = readJson(runPath);
    const c = pendingHomeCollision(state);
    if (!c) return undefined;
    if (answer === "back-to-terrain") return "end";
    if (answer !== "replace" && answer !== "keep") {
      fail(
        `the answer at the home-collision gate is ${JSON.stringify(answer)}, and the gate offers replace, keep and back-to-terrain alone.`,
      );
    }
    state.home_answers = { ...(state.home_answers || {}), [c.id]: answer };
    if (answer === "keep") state.gate.options = state.gate.options.filter((o) => o.id !== c.id);
    writeFileSync(runPath, JSON.stringify(state, null, 2) + "\n");
    return pendingHomeCollision(state) ? "again" : undefined;
  },
  // TYPED TEXT IS NOT A THESIS (kogaki#1749): the wait stays open and the gate
  // is raised again, so `adopt` never sees the answer.
  THESIS_ADOPTION: (rec, answer) => {
    const gate = readJson(
      rec.brief_run_state ||
        fail("THESIS_ADOPTION has no run state to read the answer against — `enter` writes it and precedes this wait."),
    ).gate;
    if (!gate || !Array.isArray(gate.options) || gate.options.length === 0) {
      fail(
        "the run state carries no thesis-determination gate declaration — `enter` composes it, and an " +
          "answer is admitted only at the wait that declared it.",
      );
    }
    if (gate.options.some((o) => o.id === answer)) return undefined;
    console.error(`refused: ${thesisFreeTextRefusal(gate.gate_id)}`);
    return "again";
  },
};
