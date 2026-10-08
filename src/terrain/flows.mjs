// Terrain — the renderer half: each state's work and the gate option composers.
// One stage of the Terrain command, imported only by Terrain's own modules (kogaki#1259).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadGrammar } from "../format-guard.mjs";
import { cmdComposeInput, cmdReport, readThesisCandidates } from "./compose-input.mjs";
import { cmdCotags, composeIdGateListing, composeOwnerListing } from "./cotags.mjs";
import {
  composeTrimProposal, neighborhoodForTargets, orFail, readNeighborhoodJudgments,
  refuseTargetsOutsideCandidates,
} from "./neighborhood.mjs";
import { readSubdivisionEntry } from "./report.mjs";
import { composeSubdivisionRecord, resolveReportTargets, subdivisionRules } from "./subdivide.mjs";
import { NO_DISPLAY_ID, cmdSurvey, displayIdOf, renderTagDisplay, tagRow } from "./survey.mjs";
import { judgedRecordPath } from "../workflow/judge.mjs";
import { REPO, REPORT_FORMAT, fail, flow, readJson, relFromRepo, repoRoot } from "../workflow/run-record.mjs";

// The path the table declares for the artifact a write state names. Read from
// the table rather than held here, so renaming an owner artifact is a table
// edit and not a code edit (the workflow table's evolvability contract).
export function artifactPath(table, st) {
  const decl = (table.owner_artifacts || {})[st.writes];
  return (decl && decl.path)
    || fail(`workflow table declares state ${JSON.stringify(st.id)} as writing ${JSON.stringify(st.writes)}, and its owner_artifacts map carries no path for that artifact.`);
}

// The owner input a named wait supplied. Renderers use this; control code
// does not (see the header note on why naming a wait here is not a state
// list).
function ownerInput(rec, waitId) {
  return Object.prototype.hasOwnProperty.call(rec.owner_input, waitId)
    ? rec.owner_input[waitId] : null;
}

function needSurvey(rec) {
  return rec.survey_record
    || fail("this run has no survey record yet — the state that mints it has not run. Re-enter the executor without --input to advance the flow (the re-entrant executor).");
}

// THE FIXTURE-ONLY STATE PREFIX (kogaki#824). A state id beginning with this
// string is admitted to `STATE_WORK` for the self-test's own throwaway tables
// and is refused a place in the shipped carrier. The workflow table puts the state set in
// `src/terrain-workflow.json`, so an id that never enters that file alters no contract
// — and the bound is asserted rather than promised: the pass drives the shipped
// table against this prefix.
const FIXTURE_STATE_PREFIX = "__fixture_";
const FIXTURE_RECORD_KEY_VALUE = "written by this state's own renderer";

// ---- THE RENDERER HALF (the workflow table: "a table row PLUS a renderer"). ------------
// Keyed by state id. Each entry performs its state's work and returns either
// null, or `{ artifact }` for a write state naming the path it wrote. The
// executor never inspects these beyond that contract, and a state absent from
// this map is an unrendered state — refused for `write` and `judgment`, and a
// no-op advance for `compute`, which is what makes a pure-sequencing table
// edit cost no code.
// The composed input `compose_input` wrote, demanded rather than recomputed
// (kogaki#1030). It is the judge's whole input at `J1_claims` and
// `J2_subdivision`, and its absence means the state before this one did not run
// — which is a refusal about the RUN and not about the judge, so it is raised
// here rather than inside the call.
function needCompositionInput(rec, st) {
  return rec.composition_input
    || fail(`${st.id} has no composed input to judge over — \`compose_input\` writes it and precedes this `
      + `state in the workflow table. A judgment asked over nothing is a judgment about nothing (kogaki#1030).`);
}

// The judge pin the two writing states record (kogaki#1030; see kogaki#892).
// The model half is observed. NO CALL PASSES AN EFFORT FLAG, so the table declares no effort
// (kogaki#1307) and the effort half is the literal `unset`. An explicit flag wins.
// The judged records the writing states render FROM are joined from the run record,
// not argv (kogaki#1030) — `full_report`'s own rule. An explicit flag still wins.
// `claims` joins from `rec.claims_derived`, not `rec.judgments` (kogaki#1172); see
// `J2_subdivision`'s state work.
function judgmentJoins(rec, args) {
  const j = (rec && rec.judgments) || {};
  const join = {};
  if (rec && rec.claims_derived && args.claims === undefined) join.claims = resolve(REPO, rec.claims_derived);
  if (j.J2_subdivision && args.subdivisions === undefined) join.subdivisions = resolve(REPO, j.J2_subdivision);
  return join;
}

export const JUDGE_EFFORT_UNSET = "unset";

function judgePinArgs(table, args, rec) {
  const j = (table && table.judge) || {};
  // THE BINARY IS INJECTED BESIDE THE MODEL AND EFFORT, NEVER GATED BEHIND THEIR
  // ABSENCE (kogaki#1076, PR #1078 round 1 finding 3). The model and the effort
  // are the TABLE's, so a caller supplying them explicitly is overriding the
  // table and this withholds both; the binary version is the RUN's, which no
  // `--judge-model` on an argv overrides and no caller can know. Withheld with
  // them, one run reported through the executor's auto-pin and again with
  // explicit flags yielded TWO identities -- and, with the component in the
  // identity key, an idempotent rerun that recomputes. An explicit
  // `--judge-binary-version` still wins, on the same rule the other two follow.
  const binary = (rec && rec.judge_binary) || null;
  const fromRun = binary && binary.version && args["judge-binary-version"] === undefined
    ? { "judge-binary-version": String(binary.version) } : {};
  if (!j.model) return fromRun;
  if (args["judge-model"] !== undefined || args["judge-effort"] !== undefined) return fromRun;
  return {
    "judge-model": String(j.model),
    "judge-effort": JUDGE_EFFORT_UNSET,
    ...fromRun,
  };
}

export const STATE_WORK = {
  survey: (rec, st, args) => {
    rec.survey_record = cmdSurvey({ ...args, "run-dir": rec._dir });
    return null;
  },

  // EVERY STATE HERE WRITES A DISPLAY, and a Display is the rendering written
  // AFTER a tag is selected (the pre-selection listing v29, kogaki#682). The
  // pre-selection tag listing is therefore not one: it carries no artifact and
  // no sequencing authority, and reaches the owner as bytes in the
  // TAG_SELECTION gate declaration instead. `reports/CoTagGroups.md` has
  // exactly one writing state, `cotag_groups`; with `full_report` the
  // owner-artifact writes per run are TWO.

  compose_input: (rec, st, args) => {
    // THE PATH IS RECORDED, not recomputed (kogaki#1030). `J1_claims` and
    // `J2_subdivision` are now the executor's own judge calls and both judge
    // over THIS artifact — the state's own note says the subdivision judgment
    // "is composed from the SAME artifact and spends no further read". A second
    // computation of the filename in each of them is two answers to the question
    // of which composition the run is judging, which is the shape
    // `neighborhood_input` already records its output to avoid.
    rec.composition_input = cmdComposeInput({
      ...args,
      // THE RUN'S OWN DIRECTORY (kogaki#1045). The control plane resolved this
      // run through the open-run pointer; without this key `runDir(args)` falls
      // to its default branch and mints a second, timestamp-named workspace --
      // which is where the 2026-09-09 live run's composition input landed while
      // the run record named the first.
      "run-dir": rec._dir,
      survey: needSurvey(rec),
      tag: ownerInput(rec, "TAG_SELECTION")
        || fail("compose_input needs a tag, and no wait has supplied one yet."),
    });
    return null;
  },

  // JUDGMENT POINTS. The executor VALIDATES and never composes (the typed judgment points).
  // Since kogaki#1030 the executor asks the pinned model for the record and runs the same
  // refusals over it; an explicit flag still wins (`--input`/`--at`/`--enter` gone: kogaki#1027).
  // One `validate` body serves both paths via `judgedRecordPath`; do not fork it.
  // GroupClaim composition is folded into `J2_subdivision`, per group (kogaki#1172).
  J2_subdivision: async (rec, st, args, table) => {
    // THE COMPOSED PARENTS, READ ONCE (kogaki#1068). The SubGroup rules are
    // statements about a group's own membership -- the cover, the caps, the
    // minimum with its whole-group exemption -- so the validator needs the
    // parent this run composed. It is the SAME artifact this state judges over,
    // so reading it here spends no further read and cannot name a group the ask
    // did not carry.
    //
    // ABSENT MEANS THE RULES BIND AT THE RENDER STATE, unchanged. A run supplying
    // `--subdivisions` on argv against no composed input -- the fixture path and
    // the second-repository path -- reaches `cotag_groups` exactly as it did.
    const composed = rec.composition_input ? readJson(String(rec.composition_input)) : null;
    const parents = new Map();
    if (composed && Array.isArray(composed.groups)) {
      for (const g of composed.groups) parents.set(String(g && g.name), g);
    }
    const validate = (p) => {
      const raw = readJson(p);
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        fail(`${st.id} refuses a bare array or non-object --subdivisions record; ${st.input_shape || "one typed entry per composed group"}.`);
      }
      // Each entry is read by the EXISTING validator, which carries the judged
      // flag, the judge pin and the coherence rules (semantic subdivision, measurement before offering, the report identity).
      //
      // AND THEN BY THE SubGroup RULES, INSIDE THE RE-ASK WINDOW (kogaki#1068).
      // This is the state with the bound and the per-group refusal feedback, so
      // a breach here is fed back to the judge and repaired; the same breach at
      // `cotag_groups` failed the run after every group's call was spent.
      for (const name of Object.keys(raw)) {
        subdivisionRules(name, readSubdivisionEntry(name, raw[name]), parents.get(name));
      }
    };
    // THE SAME COMPOSED ARTIFACT the retired `J1_claims` judged over, which is
    // this state's own standing note: semantic subdivision "is composed from
    // the SAME artifact and spends no further read".
    const path = await judgedRecordPath(rec, st, table, args, "subdivisions",
      () => needCompositionInput(rec, st), validate);
    rec.judgments[st.id] = relFromRepo(resolve(path));

    // THE GroupClaim, DERIVED FROM THE FOLDED RECORD (kogaki#1172). Readers still take
    // `{composition_pin, claims}` via `readClaimsRecord`; it is re-shaped from `entry.claim`
    // of the same per-group call — no second judge call. A group with no `claim` is absent
    // from the map and renders `NO_CLAIM`.
    if (args.claims === undefined) {
      const assembled = readJson(path);
      const claimsMap = {};
      if (assembled && typeof assembled === "object" && !Array.isArray(assembled)) {
        for (const [name, entry] of Object.entries(assembled)) {
          if (entry && typeof entry === "object" && typeof entry.claim === "string" && entry.claim.trim() !== "") {
            claimsMap[name] = entry.claim;
          }
        }
      }
      const composedPin = composed && composed.composition_pin ? composed.composition_pin : null;
      const claimsPath = join(rec._dir, `${flow().lane}-judge-claims-derived.json`);
      writeFileSync(claimsPath, JSON.stringify({ composition_pin: composedPin, claims: claimsMap }, null, 2) + "\n");
      rec.claims_derived = relFromRepo(resolve(claimsPath));
    }

    // AND THE COMPOSITION, WHICH THE RETIRED `subdivide` OWNED (subdivide's composition fold,
    // kogaki#625 item 1). Validation alone was never the whole of that command:
    // it placed the judge's SubGroups over the parent's members, computed the
    // three instruments, and REFUSED on SUBDIVISION_COVER_INCOMPLETE. The placement cover
    // makes completeness a cover COUNTED IN PLACEMENTS, which is a runtime
    // refusal — leaving it to whatever composed the record would move a
    // ratified refusal out of the runtime, so the state composes under the
    // classification rather than trusting a record that says it already did.
    //
    // Optional by ARGUMENT and not by state: a run supplying no
    // `--classification` is judged on the typed record alone, exactly as
    // before. What is no longer possible is composing one from outside.
    if (args.classification !== undefined) {
      const composedRecord = composeSubdivisionRecord(args, rec._dir, readJson(needSurvey(rec)));
      rec.judgments[`${st.id}:composed`] = relFromRepo(resolve(composedRecord));
    }
    return null;
  },

  // THE NEIGHBORHOOD'S EMITTER AND ITS JUDGMENT POINT (kogaki#690). Both are conditional;
  // a run naming neither renders the all-unjudged line, a legitimate terminal.
  // THESIS CANDIDATES ARE COMPOSED AND THEIR IDS FIXED BEFORE J3 JUDGES (kogaki#861),
  // so J3's refusal reads a set the state before it fixed.
  // Ground: product-lab@ab04cc9bca21a600cd9eb0a594619d3ca899d05f topics/claude-code-ops.md:24
  // `readThesisCandidates` carries the count/arity/membership refusals; this state adds the
  // WRITE, so J3 and the pull read one fixed set of ids.
  thesis_candidates: async (rec, st, args, table) => {
    const record = readJson(needSurvey(rec));
    const tag = ownerInput(rec, "TAG_SELECTION")
      || fail(`${st.id} needs a tag, and no wait has supplied one yet.`);
    const ids = ownerInput(rec, "ID_SELECTION")
      || fail(`${st.id} needs the entered ID set, and no wait has supplied one yet.`);
    // SPLIT AS `report` AND `neighborhood_input` SPLIT IT. Two parsers over one
    // owner input is two answers to one question, and the member set a
    // candidate's strands are checked against is exactly the set the pull will
    // render.
    const enteredIds = [].concat(ids).flatMap((x) => String(x).split(",")).map((x) => x.trim()).filter(Boolean);
    // THE SUBDIVISION RECORD COMES FROM THE RUN RECORD, exactly as it does at
    // the state that PRINTED these ids (kogaki#1085). `cotag_groups` renders the
    // SubGroup ids through `judgmentJoins`, and resolving them here from
    // `args.subdivisions` alone meant a hook-driven run -- which supplies no
    // argv at all since kogaki#1027 -- refused every id it had just offered.
    // Two carriers for one fact is what was wrong; the explicit flag still
    // wins, for the fixture and second-repository paths.
    const { targets } = resolveReportTargets(record, tag, enteredIds, { ...judgmentJoins(rec, args), ...args });
    const memberDisplayIds = [...new Set(
      targets.flatMap((t) => (t.kind === "subgroup" ? t.sg.members : t.group.members)))]
      .map((mid) => displayIdOf(mid, record.candidates))
      .filter((d) => d && d !== NO_DISPLAY_ID);
    const limits = loadGrammar(REPORT_FORMAT).limits || {};
    // COMPOSED HERE SO IT IS COMPOSED ONCE. `readThesisCandidates` mints the ids
    // and carries the count, arity and membership refusals; running it inside
    // `validate` is what makes a judge's record pass exactly the refusals an
    // owner's does, and holding the result is what keeps the ids the run writes
    // the ids the run validated.
    let composed = null;
    const validate = (p) => {
      composed = readThesisCandidates(readJson(p), memberDisplayIds, limits);
    };
    // THE JUDGE'S INPUT IS THE SET IT MAY COMPOSE OVER, and nothing wider. The
    // strand refusals are stated over `memberDisplayIds`, so handing the judge
    // anything else would be asking for a record this state must then refuse.
    const composeInputFor = () => {
      const p = join(rec._dir, `${flow().lane}-judge-input-${st.id}.json`);
      writeFileSync(p, JSON.stringify({
        state: st.id,
        strands_you_may_use: memberDisplayIds,
        candidates_required: limits.thesis_candidates,
      }, null, 2) + "\n");
      return p;
    };
    const path = await judgedRecordPath(rec, st, table, args, "thesis-candidates", composeInputFor, validate);
    const out = join(rec._dir, "terrain-thesis-candidates.json");
    writeFileSync(out, JSON.stringify(composed, null, 2) + "\n");
    // STORED ABSOLUTE, like `neighborhood_candidates` beside it — a run
    // workspace is routinely outside the tree.
    rec.thesis_candidates = out;
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

  neighborhood_input: (rec, st, args) => {
    const record = readJson(needSurvey(rec));
    const ids = ownerInput(rec, "ID_SELECTION")
      || fail("neighborhood_input needs the entered ID set, and no wait has supplied one yet.");
    const tag = ownerInput(rec, "TAG_SELECTION")
      || fail("neighborhood_input needs a tag, and no wait has supplied one yet.");
    // SPLIT THE WAY `report` SPLITS IT (PR #701 round 1). Two parsers over one
    // owner input is two answers to one question: on a space-separated
    // selection this enumerated two groups here and reached `full_report` as
    // one, so the emitter's candidate list and the rendering's would have been
    // computed over different sets.
    const enteredIds = [].concat(ids).flatMap((x) => String(x).split(",")).map((x) => x.trim()).filter(Boolean);
    // ONE CARRIER, as at `thesis_candidates` beside it (kogaki#1085): the
    // subdivision record is joined from the run record so the ids this state
    // resolves are the ids `cotag_groups` printed.
    const { targets } = resolveReportTargets(record, tag, enteredIds, { ...judgmentJoins(rec, args), ...args });
    const n = neighborhoodForTargets(record, targets);
    const path = join(rec._dir, "terrain-neighborhood-candidates.json");
    writeFileSync(path, JSON.stringify({
      gids: n.gids,
      // THE SLUGS THE JUDGE MAY KEY ON, and the only ones J3 admits. Written
      // rather than recomputed at J3: two enumerations of "which candidates
      // exist" is how the emitter and the refusal would disagree.
      candidates: (n.suggestions || []).map((x) => ({ nid: x.nid, slug: x.slug, family: x.family, relation_substrates: x.substrates })),
      no_material: n.no_material || false,
      // THE FULL ENUMERATION, persisted so the pull CONSUMES it (kogaki#700).
      // Three independent calls to `neighborhoodForTargets` — here, and (before
      // this landed) again inside `cmdReport` — were three reads of the served
      // surface where the reasoning assumed one: a key J3 admitted against THIS
      // enumeration could be absent from the pull's own re-read and silently
      // dropped, the section then reporting the judgment layer as not having
      // run. The pull's mechanical layer is THIS object; `candidates` above
      // stays the projection J3 keys on, unchanged.
      neighborhood: n,
    }, null, 2) + "\n");
    // STORED ABSOLUTE, like `survey_record` beside it. `relFromRepo` leaves an
    // outside-the-repo run dir as its own absolute path minus the leading
    // slash, so re-joining it to REPO produced a path under the repository
    // that never existed — found by driving the state rather than by reading
    // it. A run workspace is routinely outside the tree, which is why the
    // sibling field stores what the writer returned.
    rec.neighborhood_candidates = path;
    return null;
  },

  J3_neighborhood: async (rec, st, args, table) => {
    const validate = (path) => {
    // THE CLOSED-SET AND LEVEL-WITHOUT-CLAIM REFUSALS ARE THE EXISTING ONES.
    // the typed judgment points: the executor validates and never composes, and re-implementing a
    // refusal that already ships is how two readings of one rule appear.
    const judgments = readNeighborhoodJudgments(path);
    // THE THIRD REFUSAL NEEDS THE EMITTER'S OUTPUT, which is why the emitter is
    // a state rather than a step inside this one: a key naming no mechanical
    // candidate is only detectable against the enumeration, and the enumeration
    // is what `neighborhood_input` wrote.
    const emitted = rec.neighborhood_candidates
      ? readJson(rec.neighborhood_candidates)
      : fail(`${st.id} has no candidate enumeration to judge against — enter neighborhood_input in the same act (\`--enter neighborhood_input --enter ${st.id}\`).`);
    // SCOPED TO A NON-EMPTY ENUMERATION, exactly as `cmdReport`'s own orphan
    // refusal is (PR #701 round 1). Where the mechanical layer returned no
    // candidate at all there is nothing to join, and the section's empty
    // arms are already the honest report — refusing the whole run there
    // would turn a legitimate empty neighborhood into an error, and would
    // make `report` render a settled set that `run` refuses. That is the
    // second reading of one rule this state's own comment sets out to avoid,
    // reproduced in the state that quotes it.
    const have = new Set((emitted.candidates || []).map((c) => c.slug));
    const orphans = have.size ? [...judgments.keys()].filter((k) => !have.has(k)) : [];
    if (orphans.length) {
      fail(`${st.id} refuses ${orphans.length} judgment key(s) no mechanical candidate carries: ${orphans.join(", ")}. `
        + "A judgment that joins nothing is silently dropped and the section then reports that the judgment layer did not run, which is false.");
    }
    // THE FOURTH REFUSAL — COVERAGE (kogaki#741 ruling 1, kogaki#754): every candidate must
    // be labelled; so `neighborhoodDisplay` needs no unjudged tally.
    // THE FIFTH REFUSAL — THE TARGET NAMES A COMPOSED CANDIDATE (kogaki#861). Ids are read
    // from the file `thesis_candidates` wrote, not argv: J3 must check the ids the pull renders.
    const composedTc = rec.thesis_candidates
      ? readJson(rec.thesis_candidates)
      : fail(`${st.id} has no composed Thesis candidates to check its targets against — enter thesis_candidates first (\`--enter thesis_candidates\`). A neighborhood judged before the candidates exist names ids nothing has fixed (kogaki#861).`);
    orFail(() => refuseTargetsOutsideCandidates(judgments, (composedTc || []).map((c) => c.id), st.id));
    const uncovered = [...have].filter((slug) => !judgments.has(slug));
    if (uncovered.length) {
      fail(`${st.id} refuses: ${uncovered.length} mechanical candidate(s) carry no judgment — `
        + `${uncovered.join(", ")}. The neighborhood section's shape makes this pass unconditional and the LLM supplies the `
        + "level label PER CANDIDATE, so a record that judges only some of them is the "
        + "LLM-controlled skip kogaki#741 removes. Judge every candidate the enumeration wrote.");
    }
    };
    // THE JUDGE'S INPUT IS THE ENUMERATION `neighborhood_input` WROTE, plus the
    // composed Thesis candidates its targets must name. Both are read from the
    // run record rather than from argv, for the reason this state's refusals are:
    // the ids J3 is judged against must be the ids the pull will render.
    const composeInputFor = () => {
      const emitted = rec.neighborhood_candidates
        ? readJson(rec.neighborhood_candidates)
        : fail(`${st.id} has no candidate enumeration to judge against — neighborhood_input writes it and it precedes this state in the table.`);
      const tc = rec.thesis_candidates ? readJson(rec.thesis_candidates) : [];
      const p = join(rec._dir, `${flow().lane}-judge-input-${st.id}.json`);
      writeFileSync(p, JSON.stringify({
        state: st.id,
        candidates_you_must_judge: emitted.candidates || [],
        thesis_candidates_a_target_may_name: (tc || []).map((c) => ({ id: c.id, claim: c.claim })),
      }, null, 2) + "\n");
      return p;
    };
    const path = await judgedRecordPath(rec, st, table, args, "neighborhood", composeInputFor, validate);
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

  cotag_groups: (rec, st, args, table) => ({
    artifact: cmdCotags({
      ...judgePinArgs(table, args, rec),
      ...judgmentJoins(rec, args),
      ...args,
      survey: needSurvey(rec),
      tag: ownerInput(rec, "TAG_SELECTION")
        || fail("cotag_groups needs a tag, and no wait has supplied one yet."),
    }),
  }),

  full_report: (rec, st, args, table) => {
    const written = cmdReport({
      // THE JUDGE PIN NOW HAS A PRODUCER (kogaki#1030). `--judge-model` and
      // `--judge-effort` are required for every report invocation (the report
      // identity v9) and, since kogaki#1027 deleted the model-typed route, a
      // hook-driven run had nothing that could supply them — the same shape as
      // the judgment records themselves, and the same repair: the executor
      // supplies what it now knows. `model_id` is the model it ACTUALLY RAN.
      // Spread FIRST, so an explicit flag still wins.
      ...judgePinArgs(table, args, rec),
      ...judgmentJoins(rec, args),
      ...args,
      survey: needSurvey(rec),
      tag: ownerInput(rec, "TAG_SELECTION")
        || fail("full_report needs a tag, and no wait has supplied one yet."),
      ids: ownerInput(rec, "ID_SELECTION")
        || fail("full_report needs the entered ID set, and no wait has supplied one yet."),
      // THE EMITTER'S ENUMERATION, passed so the pull consumes it (kogaki#700).
      // Absent where no emitter ran — the unjudged flow — and cmdReport then
      // computes inside the pull as the settled-strand-set input always said.
      ...(rec.neighborhood_candidates ? { "neighborhood-candidates": rec.neighborhood_candidates } : {}),
      // THE COMPOSED CANDIDATES JOIN FROM THE RUN RECORD, never from this act's
      // argv (kogaki#861) — the same rule the judgment path below follows and
      // for the same reason. The `thesis_candidates` state minted the ids J3
      // validated every target against; re-reading a file named on argv here
      // could renumber them under a judgment that already passed.
      ...(rec.thesis_candidates ? { "thesis-candidates": rec.thesis_candidates } : {}),
      // THE JUDGMENT JOINS FROM THE RUN RECORD, never from this act's argv
      // (the neighborhood section's shape, kogaki#741 ruling 2). J3 wrote the path it validated; reading
      // it back here is what makes "deleting the judgment file after J3 and
      // re-rendering fails loudly" true — the record still names the path, and
      // the read fails at the missing file rather than silently rendering an
      // unjudged section. An argv `--neighborhood` cannot substitute: the
      // record is the only source, so a stale flag can neither supply nor
      // override the judgment this run actually validated.
      ...(rec.judgments && rec.judgments.J3_neighborhood
        ? { neighborhood: rec.judgments.J3_neighborhood } : {}),
    });
    // OBSERVED, NOT CONSTRUCTED (PR #655 round 1). `cmdSurvey`, the two display
    // renderers and `cmdCotags` each return the path they actually wrote; this
    // state ASSERTED one instead, via join(renderingsDir(args), basename(...)).
    // `cmdReport` honours `--no-render` by writing NO rendering and `args` is
    // spread into it verbatim, so `run --no-render` recorded a
    // `reports/FullReport.md` write that never happened. Reading the basename
    // from the table was never the defect — asserting a value where three
    // siblings observe one was. A state that wrote no owner artifact records
    // none, which is what makes the ledger's write count countable.
    // `{ artifact: null }` rather than a bare null: the state RAN and wrote
    // nothing, which is a different claim from a renderer that named no
    // artifact, and the executor's guard reads exactly that difference.
    return { artifact: written || null };
  },

  // ---- THE ONE FIXTURE-ONLY RENDERER (kogaki#824). ------------------------
  // Sets a record key seam-free, the shape of kogaki#808's loss (#808; PR #852 round 1).
  // The fixture-only bound is a CASE: the id carries `FIXTURE_STATE_PREFIX`, and the pass
  // asserts the shipped `src/terrain-workflow.json` names no state carrying it.
  [`${FIXTURE_STATE_PREFIX}sets_record_key`]: (rec) => {
    rec.fixture_record_key = FIXTURE_RECORD_KEY_VALUE;
    return null;
  },
  // RETURNS THE OUTCOME ITS OWN TABLE ROW CARRIES (kogaki#1257), so the write
  // guard's three directions are driven through `run` against a throwaway table
  // rather than by calling the classifier. A row with no `fixture_outcome` key
  // returns nothing at all, which is the direction the guard refuses. Bounded
  // by the same case as the state above.
  [`${FIXTURE_STATE_PREFIX}returns_outcome`]: (rec, st) =>
    (Object.prototype.hasOwnProperty.call(st, "fixture_outcome") ? st.fixture_outcome : null),
};

// ---- GATE OPTION COMPOSERS — the mirror of STATE_WORK (kogaki#625 item 1; kogaki#1030).
// consulted: product-lab@d6fdadd50274cee5ab72730d73c4508b9a53e430 LESSONS.md:32
// Composing a declaration is engine work; RENDERING the question stays the session's.
// The executor asks nothing and renders no question UI: it writes a file and stops.
// The selector affordance holds four options; one is the registry's standing
// option, so the run contributes at most three (kogaki#1029).
const TAG_OPTION_COUNT = 3;

export const GATE_WORK = {
  // THE LISTING RIDES THE DECLARATION (kogaki#856): `tag_listing` is the runtime's own
  // pre-selection rendering, byte-for-byte; the table is never put inside the question.
  // Options are the largest served tags, up to TAG_OPTION_COUNT, id = tag name, plus the
  // standing option; any other tag is free text. The selector needs 2–4 options (kogaki#1029).
  TAG_SELECTION: (rec) => {
    const survey = readJson(needSurvey(rec));
    const ranked = [...(survey.sections || [])]
      .sort((a, b) => (((b.by_family || {}).lesson || 0) - ((a.by_family || {}).lesson || 0)) || String(a.name).localeCompare(String(b.name)))
      .slice(0, TAG_OPTION_COUNT);
    return {
      options: ranked.map((sec) => ({ id: String(sec.name), label: tagRow(sec) })),
      extra: { tag_listing: composeOwnerListing("tag_listing", renderTagDisplay(survey)) },
    };
  },

  TRIM_RATIFICATION: (rec, st, args, dir) => {
    const proposalPath = args.proposal ? String(args.proposal) : composeTrimProposal(args, dir);
    if (!proposalPath) {
      fail("TRIM_RATIFICATION composed no proposal: the named act is navigation, or is in neither act list, so there is nothing to ratify. The second-proposer boundary — a navigation act wrapped as a proposal is a contract violation from the other direction.");
    }
    const p = readJson(proposalPath);
    return { options: (p.options || []).map((o) => ({ id: o.id, label: o.label })), extra: { proposal: relFromRepo(resolve(proposalPath)) } };
  },

  // THE ONE WAIT THAT DECLARED NO GATE (kogaki#890, acceptance item 3; see kogaki#1030).
  // No run-computed option: the answer is a list — the standing negation or free-form ids.
  // THE GROUPING RIDES THE DECLARATION AS BYTES (kogaki#1087), through `composeOwnerListing`,
  // so a missing or paraphrased grouping is a byte difference and is denied.
  // An empty `cotag_groups` still raises the gate, with the sentence below in its place.
  ID_SELECTION: (rec) => {
    const written = (rec.artifacts_written || []).filter((a) => a.state === "cotag_groups").pop();
    // `resolve` against the repository root rather than the cwd: the recorded
    // path is repo-relative by `relFromRepo`, which falls back to an ABSOLUTE
    // path for a rendering written outside the tree, and `resolve` reads both.
    const artifact = written ? resolve(repoRoot(), written.path) : null;
    // THE GUARD IS UNCHANGED AND THE PAYLOAD IS BOUNDED (kogaki#1090). The
    // artifact's bytes still pass `composeOwnerListing` against the
    // `cotag_groups` surface — the reading carried to the owner is a projection
    // of text that was judged, not of text nobody grammared — and what rides the
    // declaration is the projection rather than the whole file.
    const listing = artifact && existsSync(artifact)
      ? composeIdGateListing(
        composeOwnerListing("cotag_groups", readFileSync(artifact, "utf8")),
        written.path)
      : null;
    return {
      options: [],
      extra: {
        groups_listing: listing
          || "none — cotag_groups wrote no readable artifact in this run, so this question is raised over a grouping you have not been shown; the run's own report is the surface to read before answering",
      },
    };
  },
};
