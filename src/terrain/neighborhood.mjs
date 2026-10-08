// Terrain — the act and the neighborhood.
// One stage of the Terrain command, imported only by Terrain's own modules (kogaki#1259).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { NO_TARGET } from "./cotags.mjs";
import { RECORD_SCHEMA, glossMarkerFor } from "./survey.mjs";
import { JudgmentRefusal, fail, gatewayQuery, readJson } from "../workflow/run-record.mjs";

// ---- ACT ------------------------------------------------------------------
// act — the second-proposer boundary, enforced by enumeration.
// THE PROPOSAL RECORD of the retired `act` subcommand, reachable only from
// `TRIM_RATIFICATION`'s declaration composer (kogaki#625 item 1). While `act`
// stood, a session could mint a trim proposal from outside the executor with no
// run record — precisely what write authority claims is unwritable.
// Returns the written record's path, or null where the act names no proposal.
export function composeTrimProposal(args, dir) {
  const act = String(args.act || fail("TRIM_RATIFICATION needs --act <name>: the proposal it ratifies"));
  const acts = RECORD_SCHEMA.acts;
  if (acts.navigation.includes(act)) {
    console.log(`${act} is NAVIGATION — the executor reaches it as a table state (the non-flow utilities removed \`view\` as an entry point); no record is written. A navigation act wrapped as a proposal is a contract violation from the other direction (record-schema.json acts).`);
    return null;
  }
  if (!acts.proposal.includes(act)) {
    // The non-member fallback: a report, never a guess.
    const record = {
      id: `terrain-report-${Date.now()}`,
      kind: "report",
      act,
      reason: `act ${JSON.stringify(act)} is in neither the proposal list (${acts.proposal.join(", ")}) nor the navigation list (${acts.navigation.join(", ")}) — SPEC-terrain, the second-proposer boundary: an act not in either list is a report, not a choice`,
      narrows: false,
    };
    const out = join(dir, `${record.id}${RECORD_SCHEMA.records_home.suffix}`);
    writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
    console.log(`Unclassified act — report record written (narrows nothing): ${out}`);
    return null;
  }
  // A proposal. Where/Why/effect-stating label are the caller's to state —
  // this runtime binds the record's shape, never the narrowing's computation.
  const where = String(args.where || fail(`--where is required: the material the ${act} applies to`));
  const why = String(args.why || fail("--why is required: the machine premise, rendered — an implicit premise is the recorded failure"));
  const label = String(args.label || fail("--label is required: state the effect of taking the proposal"));
  const members = args.ids ? String(args.ids).split(",").map((s) => s.trim()).filter(Boolean) : [];
  if (members.length === 0) fail("--ids is required: the Strand ids the proposal narrows to (comma-separated)");
  const record = {
    id: `terrain-${act}-${Date.now()}`,
    kind: "proposal",
    act,
    where,
    why,
    label,
    options: [
      // Not the record's own label: item 3's floor refuses an option label
      // identical to the record's (caught by check-proposal-contract at
      // first dogfood, 2026-08-05).
      { id: `apply-${act}`, label: `Apply the ${act}: ${members.length} named Strand(s) go forward, the rest stay in the survey`, members },
      {
        id: "decline",
        label: "No narrowing; the full candidate set stands",
        negates_premise: true,
      },
    ],
    free_text: {
      accepted: true,
      prompt: "State a different narrowing, or decline, in your own words",
    },
  };
  const floor = RECORD_SCHEMA.proposal.label_floor;
  if (label.trim().split(/\s+/).length < floor.min_words || label.trim() === act) {
    fail(`label fails the effect-stating floor (≥${floor.min_words} words, never the bare act token). The floor is form only; sufficiency is the review lane's.`);
  }
  const out = join(dir, `${record.id}${RECORD_SCHEMA.records_home.suffix}`);
  writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
  console.log(`Proposal record written (presented at gate terrain-trim-ratification, never as navigation): ${out}`);
  return out;
}

// ---- NEIGHBORHOOD ---------------------------------------------------------
// SPEC-terrain, the provenance neighborhood (story 1.44, kogaki#302, umbrella kogaki#300);
// the settled-strand-set input v15; the neighborhood join v16; kogaki#686.
// A report beside the settled strand set, never a proposal. Input is the settled set alone.
// The bound is declared by the spec, not chosen: `source_batch` one hop and nothing else.
// The single-key freeze keeps the substrate NAMED; widening is an edit to this declared set.
const NEIGHBORHOOD_BOUND = Object.freeze({
  source_batch: 1,
});

// how A–E compose's slot, FILLED 2026-08-12 (owner selection, recorded on kogaki#300
// before this code was written). A suggestion is
// by construction NOT in the survey record, so the display-ID rule's assignor does not reach
// it. The neighborhood mints its own space, `N<n>`, DECLARED DISJOINT from
// `L<n>` — the display-ID rule is untouched, and a taken suggestion is assigned an `L<n>` by
// the display-ID rule's existing assignor on the way in, without its `N<n>` following it.
const NEIGHBOR_ID = (n) => `N${n}`;

// The batch join does NOT hold by equality (the neighborhood join). Twelve legacy batches carry
// `source_batch: "q_a/3/answer.md"` while the batch id is `"q_a/3"`, so an
// equality join returns NO batch-mates for every Grain in them and presents
// that as "this Grain has no same-sitting siblings" — indistinguishable on
// display from a Grain that genuinely has none. That is this surface
// reproducing the silent exclusion the neighborhood defect exists to remove, one layer down.
function batchKey(sourceBatch) {
  if (!sourceBatch) return null;
  const s = String(sourceBatch);
  const m = /^(.*?)\/answer\.md$/.exec(s);
  return m ? m[1] : s;
}

// Enumerate the neighborhood over the served records. Pure over its inputs so
// every fixture runs with no seam: `records` is the served element set and
// `seedSlugs` the settled set's members.
//
// Returns { suggestions, unresolved, counts } — `suggestions` carry the
// substrate that REACHED them (the neighborhood section's shape's disclosure), never a score.

// ORDER IS DECLARED AND MECHANICAL: instance-bearing groups first, by substrate
// then by instance id, then the bare substrates by name. NEVER by size — a
// display that puts the biggest group first has ranked its groups, which is the
// judgment the neighborhood as a report refuses, arriving as layout rather than as a score.
function compareGroups(a, b) {
  const ka = [a.instance === null ? 1 : 0, a.substrate, a.instance ?? ""];
  const kb = [b.instance === null ? 1 : 0, b.substrate, b.instance ?? ""];
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

// HOW MANY ROWS ONE SUGGESTION RENDERS AS — ONE DEFINITION, used by the
// enumerator's total and by both of the display's counts (PR #392 round 1). A
// suggestion with no substrate instance still renders, under an explicit
// undisclosed heading, so it is ONE rendering and not zero: the alternative
// reading made the family section and the headline disagree on the check's own
// AC3/AC5 input, which was the two-definitions defect the grouping helpers
// warned about one field over — those helpers went with the grouping headings
// kogaki#686 deletes, and the reference is retired with them rather than left
// pointing at a symbol the file no longer defines.
function renderingsOf(s) {
  return (s.reached_by || []).length || 1;
}

function substrateInstances(bySubstrate) {
  const out = [];
  for (const [substrate, instances] of bySubstrate) {
    for (const instance of instances) out.push({ substrate, instance });
  }
  return out.sort(compareGroups);
}

function neighborhoodOf(records, seedSlugs, bound = NEIGHBORHOOD_BOUND) {
  // Batch records carry `id` rather than `slug` and are the JOIN TABLE, never
  // suggestions themselves — indexing them here would surface a batch as a
  // neighbor, which is not an element the owner can take.
  const bySlug = new Map(records.filter((r) => r.slug).map((r) => [r.slug, r]));
  const seeds = seedSlugs.filter((s) => bySlug.has(s));
  const seedSet = new Set(seeds);
  // slug -> Map of substrate name -> Set of INSTANCE ids (null for a substrate
  // that has no instances). The instance is what story 1.61 needs and the
  // substrate NAME alone cannot supply: the neighborhood section's shape obligation 4 groups by substrate
  // INSTANCE, so a display told only "source_batch" knows the row belongs under
  // some batch heading and not under WHICH — and the display cannot recover it,
  // because the batch join lives here and nowhere else. Widening the returned
  // shape is the alternative story 1.61's Review Focus names, taken because the
  // other one is unavailable rather than because it is tidier.
  const reached = new Map();
  // slug -> Set of the SEED slugs that reached it. kogaki#686 disposition 3's field 2
  // names "the same Batch as L88 (2026-08-13)" — the settled MEMBER the
  // candidate shares a Batch with, and the batch. `reached` above is keyed by
  // substrate and instance and cannot hold it: two seeds in one batch collapse
  // to one instance entry, which is exactly the value the row must not render
  // in the member's place. Kept beside rather than folded in, because the
  // relation is a fact about the settled set and not about the substrate
  // (kogaki#689, carried from PR #692 round 2).
  const reachedSeeds = new Map();
  const unresolved = [];
  // the neighborhood section's shape's DENOMINATOR POPULATION, family-keyed and read from the batch
  // records' own `members` rather than re-derived from the element set (story
  // 1.45, AC3). Kept as a Set per family so a slug listed by two batches counts
  // once — a population that double-counts is a denominator that flatters the
  // ratio it sits under.
  const population = new Map(); // family -> Set of slugs

  // `instance` is the substrate's own identifying value where it has one — the
  // batch id for `source_batch` — and null where the substrate IS the instance
  // batch id for `source_batch`. A null instance is a stated absence rather
  // than a missing key, and it survives kogaki#686's narrowing because a
  // substrate that IS its own instance is still expressible:
  // the display groups it under the substrate's own heading.
  const note = (slug, substrate, instance = null, seedsReaching = []) => {
    if (seedSet.has(slug) || !bySlug.has(slug)) return;
    if (!reachedSeeds.has(slug)) reachedSeeds.set(slug, new Set());
    for (const s of seedsReaching) reachedSeeds.get(slug).add(s);
    if (!reached.has(slug)) reached.set(slug, new Map());
    const bySubstrate = reached.get(slug);
    if (!bySubstrate.has(substrate)) bySubstrate.set(substrate, new Set());
    bySubstrate.get(substrate).add(instance);
  };

  // ---- source_batch, one hop. THE JOIN GOES THROUGH THE BATCH RECORD'S
  // `members` (the neighborhood join), not by equality and not by grouping the element set:
  // `members` is family-keyed, which is what makes the neighborhood section's shape's per-family
  // denominator mechanical rather than inferred, and a batch's membership is
  // the batch's own statement rather than something re-derived from elsewhere.
  //
  // Finding the record still needs the key normalisation above, because the
  // twelve legacy batches carry `source_batch: "q_a/3/answer.md"` against a
  // batch id of `"q_a/3"`.
  if (bound.source_batch > 0) {
    const byBatchId = new Map(
      records.filter((r) => r.kind === "batch" && r.id).map((r) => [r.id, r]));
    // Seeds resolve to the DISTINCT batches they name; the member walk below
    // then visits each batch exactly once.
    const distinctBatches = new Map();
    // batch key -> the seeds that named it, so the member walk below can say
    // WHICH settled member a suggestion shares its Batch with.
    const batchSeeds = new Map();
    for (const s of seeds) {
      const raw = bySlug.get(s).source_batch;
      const k = batchKey(raw);
      if (!k) {
        unresolved.push({ kind: "seed", slug: s, value: raw === undefined ? null : raw,
          why: "the record carries no source_batch" });
        continue;
      }
      const batch = byBatchId.get(k);
      if (!batch) {
        // AC4's real case: the value is present and names a batch nothing
        // serves. An empty result here presented as "no same-sitting siblings"
        // is the silent exclusion the neighborhood defect removes.
        unresolved.push({ kind: "seed", slug: s, value: raw,
          why: `source_batch names a batch no served record carries (resolved to ${JSON.stringify(k)})` });
        continue;
      }
      distinctBatches.set(k, batch);
      if (!batchSeeds.has(k)) batchSeeds.set(k, new Set());
      batchSeeds.get(k).add(s);
    }

    // THE WALK IS PER BATCH, NOT PER SEED (kogaki#369). The seed markers above belong in
    // the seed loop; a batch's `members` is walked once per distinct batch.
    // Keep it a loop over batches, not a de-duplicating guard on the push.
    for (const [k, batch] of distinctBatches) {
      // Family-keyed, so every family's list is walked rather than one.
      for (const family of Object.keys(batch.members || {})) {
        for (const m of batch.members[family] || []) {
          // POPULATION IS COUNTED BEFORE THE SERVED-SET GUARD BELOW, by decision: an unserved
          // member is still in the batch's denominator (and is marked unresolved below).
          // SEEDS ARE EXCLUDED, since `note()` never suggests a seed (PR #383).
          // Guarded rather than `continue`d: a seed must still reach the served-set check
          // and `note()` below.
          if (!seedSet.has(m)) {
            if (!population.has(family)) population.set(family, new Set());
            population.get(family).add(m);
          }
          // A LISTED MEMBER THE SERVED SET DOES NOT CARRY IS MARKED, not
          // dropped. Dropping
          // it yields a quieter neighborhood with no disclosure, which is
          // the neighborhood defect's silent exclusion one layer further in: the batch resolved,
          // so nothing upstream reports anything.
          if (!bySlug.has(m)) {
            // The SUBJECT is the batch, which is why this is not a seed slug.
            // KIND `member`, NOT `seed` (PR #697 round 1). The batch RESOLVED
            // and this walk is running over it, so the enumeration DID run —
            // the subject is a batch and the failure is one of its listed
            // members. Typed at the push rather than inferred downstream from
            // the `why` text: a renderer sniffing prose to recover a fact the
            // producer knew is the join every wording change breaks.
            unresolved.push({ kind: "member", slug: k, value: m,
              why: `the batch lists a member no served record carries (family ${JSON.stringify(family)})` });
            continue;
          }
          // The BATCH KEY, not the raw `source_batch` value: `k` is what the
          // batch record is indexed by, so a heading built from it names the
          // same batch the join walked. The twelve legacy records whose
          // `source_batch` is `"q_a/3/answer.md"` against an id of `"q_a/3"`
          // would otherwise split one batch across two headings.
          note(m, "source_batch", k, batchSeeds.get(k) || []);
        }
      }
    }
  }

  // ORDER IS THE SORT, NEVER A RANK (the neighborhood join). The bound may change HOW MANY
  // neighbors surface and may never change WHICH by scoring them — so the
  // output is sorted by slug, which carries no judgment, and `N<n>` is minted
  // over that order.
  const suggestions = [...reached.keys()].sort().map((slug, i) => ({
    nid: NEIGHBOR_ID(i + 1),
    slug,
    // The FAMILY a suggestion belongs to, carried on the suggestion itself so
    // the display never has to re-look-up the record to state a per-family
    // figure. A record with no `kind` yields null rather than a guess: an
    // unknown family folded into a known one is the pooling AC3 forbids,
    // arriving one record at a time.
    family: bySlug.get(slug)?.kind ?? null,
    // THE RECORD'S OWN TAGS, carried here for the same reason `family` is: the
    // bounded Gloss fetch (kogaki#689) is keyed on them, and `bySlug` does not
    // outlive this function. An absent `tags` yields `[]` rather than a guess —
    // a row with no tag addresses no shard, and that is a stated absence.
    tags: bySlug.get(slug)?.tags ?? [],
    // THE SETTLED MEMBERS THIS CANDIDATE WAS REACHED FROM, sorted, named by
    // slug here and resolved to display ids at the rendering. Field 2 names the
    // member; the substrate instance is the parenthetical beside it.
    seeds: [...(reachedSeeds.get(slug) || [])].sort(),
    // UNCHANGED IN SHAPE AND MEANING: the substrate NAMES, sorted. Story 1.45's
    // AC2 disclosure asserts over this field, so 1.61 adds beside it rather
    // than re-cutting it — a suggestion's disclosure line is the same sentence
    // it was before the grouping existed.
    substrates: [...reached.get(slug).keys()].sort(),
    // the neighborhood section's shape obligation 4's grouping key, one entry per (substrate, instance)
    // pair that reached this slug. A suggestion reached by two substrates
    // carries two entries and RENDERS UNDER EACH — which is why rendering count
    // and suggestion count differ by construction, and why both are stated.
    reached_by: substrateInstances(reached.get(slug)),
  }));

  // PER-FAMILY FIGURES (story 1.45, AC3; PR #383). Every family in a walked batch's
  // `members` or among the suggestions gets a row; a zero numerator is a reading.
  // `population: null` IS NOT ZERO: it renders as "no denominator readable".
  // Both sides of the ratio range over one set: the numerator counts only suggestions drawn
  // from the walked members minus seeds; others are counted separately with no denominator.
  const families = new Set([
    ...population.keys(),
    ...suggestions.map((s) => s.family).filter((f) => f !== null),
  ]);
  const by_family = {};
  for (const fam of [...families].sort()) {
    const pop = population.has(fam) ? population.get(fam) : null;
    const ofFamily = suggestions.filter((s) => s.family === fam);
    const fromPopulation = pop ? ofFamily.filter((s) => pop.has(s.slug)) : [];
    by_family[fam] = {
      // `suggested` is the numerator OF THE STATED RATIO — a subset of
      // `population` by construction, so `suggested <= population` always.
      suggested: fromPopulation.length,
      population: pop ? pop.size : null,
      // Suggestions of this family the batch membership never contained.
      // Counted and rendered, never silently added to the numerator.
      outside_population: ofFamily.length - fromPopulation.length,
    };
  }

  return {
    suggestions,
    unresolved,
    // `suggested` and `seeds` stay, and they are NOT the denominator AC3
    // governs — they are totals over the run. What AC3 forbids is stating a
    // POOLED denominator where a family-keyed one is readable, which is what
    // `by_family` now carries; the display prints the per-family rows and never
    // a pooled `n of m`.
    // `suggested` COUNTS SUGGESTIONS and `rendered` COUNTS RENDERINGS, and the
    // two are carried separately because they differ by construction (the neighborhood section's shape
    // obligation 4): a suggestion reached by two substrates renders under each.
    // A single figure standing in for both is the conflation story 1.61's AC2a
    // exists to refuse — stated here at the source rather than left for the
    // display to infer from a structure it would have to re-walk.
    counts: { seeds: seeds.length, suggested: suggestions.length,
      rendered: suggestions.reduce((n, s) => n + renderingsOf(s), 0),
      unresolved: unresolved.length, by_family },
  };
}

// Candidate `id` -> served `slug`. Separate and exported because the two key
// spaces are easy to conflate and the conflation FAILS QUIETLY: every lookup
// misses, the neighborhood is empty, and an empty is a legitimate outcome
// here (the settled-strand-set input), so nothing downstream can tell the two apart. An id naming no
// candidate is returned, never dropped.
function settledSlugs(candidates, memberIds) {
  const byId = new Map((candidates || []).map((c) => [c.id, c]));
  const slugs = [];
  const unmapped = [];
  for (const id of memberIds) {
    const c = byId.get(id);
    if (c && c.slug) slugs.push(c.slug);
    else unmapped.push(id);
  }
  return { slugs: [...new Set(slugs)], unmapped };
}

// The one converter, so the two readers of a throwing validator cannot drift in
// WHEN they exit — the reason `emitOrRefuse` exists for the format guard.
export function orFail(fn) {
  try { return fn(); }
  catch (e) {
    if (e instanceof JudgmentRefusal) fail(e.message);
    throw e;
  }
}

// A Thesis candidate's id, as `report-format.json`'s `ThesisCandidateID` token
// declares it. Transcribed rather than read from the grammar because this
// refusal fires on an INPUT and the grammar governs a rendered SURFACE: reading
// the token here would make a judgment record's admissibility depend on a
// carrier that describes what a line looks like.
const THESIS_CANDIDATE_ID = /^TC[0-9]+$/;

// THE JUDGMENT'S THIRD FIELD (kogaki#861, owner report 2026-09-04). A row that
// states a level and a claim still does not say what the neighbor is FOR, and
// the report carries the Thesis candidates it could be for at the top of the
// same file. So each judgment names the candidate it serves AND its role for
// that candidate, and a record without one is refused exactly as a level with
// no claim is: the row has a fixed line class for it and no way to render it
// from anything else.
function neighborhoodJudgmentsFrom(raw) {
  const out = new Map();
  for (const [slug, v] of Object.entries(raw || {})) {
    if (!v || typeof v !== "object") {
      throw new JudgmentRefusal(`neighborhood judgment for ${JSON.stringify(slug)} is not an object: `
        + `each entry is {"level": <one of ${NEIGHBORHOOD_LEVELS.join(" | ")}>, "claim": "<one sentence>", `
        + `"target": {"candidate": "TC<n>", "role": "<the role it plays for that candidate>"}}`);
    }
    if (!NEIGHBORHOOD_LEVELS.includes(v.level)) {
      throw new JudgmentRefusal(`neighborhood judgment for ${JSON.stringify(slug)} carries level `
        + `${JSON.stringify(v.level)}, which is not the harness-fixed set `
        + `(${NEIGHBORHOOD_LEVELS.join(" | ")}). The set is closed; extending it is the owner's act.`);
    }
    if (typeof v.claim !== "string" || !v.claim.trim()) {
      throw new JudgmentRefusal(`neighborhood judgment for ${JSON.stringify(slug)} carries no claim. `
        + "A level without a claim is a rank with no reason, which the row has no way to render.");
    }
    const t = v.target;
    if (!t || typeof t !== "object" || Array.isArray(t)) {
      throw new JudgmentRefusal(`neighborhood judgment for ${JSON.stringify(slug)} carries no target. `
        + "A level and a claim with no target is a recommendation with nothing to serve: the row's "
        + "TC-target line is a FIXED line class (kogaki#861) and there is nothing else to render it "
        + `from. Write "target": {"candidate": "TC<n>", "role": "<the role it plays for that candidate>"}.`);
    }
    if (typeof t.candidate !== "string" || !THESIS_CANDIDATE_ID.test(t.candidate.trim())) {
      throw new JudgmentRefusal(`neighborhood judgment for ${JSON.stringify(slug)} targets `
        + `${JSON.stringify(t.candidate)}, which is not a Thesis-candidate id (TC<n>). The target names a `
        + "candidate of the Thesis candidates section in THIS report; a slug, a display id or free text there would render a "
        + "line the reader cannot join to anything above it.");
    }
    if (typeof t.role !== "string" || !t.role.trim()) {
      throw new JudgmentRefusal(`neighborhood judgment for ${JSON.stringify(slug)} names a target candidate `
        + "and no role for it. WHICH candidate and WHAT FOR are both owed: a neighbor named against TC2 with "
        + "no role states that it is relevant and withholds the whole of why.");
    }
    if (/\n/.test(t.role)) {
      // One RENDERED line per target, exactly as the Thesis candidates's claim is bounded: a
      // newline emits a line no grammar class admits, and the emit-time
      // refusal would then name the surface rather than this input.
      throw new JudgmentRefusal(`neighborhood judgment for ${JSON.stringify(slug)} carries a role spanning more `
        + "than one line. The TC-target line is one rendered line, so a multi-line role emits a line no grammar "
        + "class admits and the refusal would name the surface rather than this input.");
    }
    out.set(slug, { level: v.level, claim: v.claim.trim(),
      target: { candidate: t.candidate.trim(), role: t.role.trim() } });
  }
  return out;
}

export function readNeighborhoodJudgments(path) {
  if (!path) return new Map();
  const raw = readJson(String(path));
  return orFail(() => neighborhoodJudgmentsFrom(raw));
}

// THE TARGET IS CHECKED AGAINST THE COMPOSED CANDIDATES, NEVER AGAINST ITS OWN
// SHAPE ALONE (kogaki#861). `TC9` is a well-formed id and names nothing in a
// three-candidate report; rendered unchecked it would put a line on the owner's
// surface pointing at a section that does not carry it — the join failing
// silently in the one direction the reader cannot see, which is the same
// silence the orphan-slug refusal beside it exists to end.
//
// Pure and throwing, so BOTH readers — the J3 state and the pull — reach one
// implementation of the rule rather than two readings of it.
export function refuseTargetsOutsideCandidates(judgments, candidateIds, at) {
  const known = new Set(candidateIds || []);
  const bad = [...judgments.entries()]
    .filter(([, j]) => j.target && !known.has(j.target.candidate))
    .map(([slug, j]) => `${slug} -> ${j.target.candidate}`);
  if (bad.length) {
    throw new JudgmentRefusal(`${at} refuses ${bad.length} neighborhood target(s) naming a Thesis candidate this `
      + `report does not carry: ${bad.join(", ")}. The composed candidates are: `
      + `${known.size ? [...known].join(", ") : "(none composed)"}. A target that joins nothing renders a line `
      + "pointing at a section that does not carry it.");
  }
  return judgments;
}

export function neighborhoodForTargets(record, targets) {
  // The settled set is the MEMBERS the entered ids reach. A SubGroup id brings
  // its SubGroup, a Group id brings the group — story 1.58's rule, reused.
  const memberIds = [...new Set(targets.flatMap((t) =>
    (t.kind === "subgroup" ? t.sg.members : t.group.members)))];
  // TWO KEY SPACES MEET HERE. A group's members are candidate `id`s
  // (`lesson:<slug>`, minted at :378); the served records the neighborhood
  // traverses are keyed by `slug`. Handing ids straight to the composer
  // matches nothing and yields a clean zero — which is AC4's defect one layer
  // out: an empty standing in for "nothing found". Found by running the
  // command, not by a fixture, which is why the mapping is its own exported
  // leg with its own case.
  const { slugs: seedSlugs, unmapped } = settledSlugs(record.candidates, memberIds);

  // THE SEAM CALL TAKES NO KIND FILTER, DELIBERATELY, and this is not the
  // shape `cmdSurvey` uses. `element_survey`'s declared arguments are `kind`
  // (singular) and `tag`; an UNDECLARED key returns the miss shape, so
  // `{ kinds: [...] }` yields zero lines. The neighborhood needs `batch`
  // records as well as the two survey families — the neighborhood join's join reads a batch's
  // own `members` — so it asks for everything and splits by kind here.
  // `cmdSurvey` sent the same shape and was the defect kogaki#368 was filed
  // for; it is repaired, and the transport now refuses an undeclared key
  // before sending it rather than answering a call it did not run.
  const resp = gatewayQuery("element_survey", {});
  const records = [];
  for (const line of resp.lines || []) {
    try { records.push(JSON.parse(line.text)); }
    catch { fail(`unparseable served record at ${line.cite} — surfaced, not skipped`); }
  }
  if (records.length === 0) {
    // DEGRADE, NEVER ABORT THE PULL (PR #477 round 1, carried on kogaki#473).
    // As a standalone act this refused — the owner asked for exactly this
    // enumeration, and a false empty is worse than a refusal. Inside the
    // report pull the same fail() would abort a DIFFERENT deliverable that
    // has its own answer to absence: `fetchGlossBodies` degrades to declared
    // abnormalities rather than killing the report. So the no-material state
    // is DISCLOSED as its own typed section form — a different state from an
    // enumeration that ran and found nothing, and stated as such, which is
    // the disclosure discipline of the neighborhood section's shape applied to the section's own inputs.
    return { gids: targets.map((t) => t.gid), no_material: true,
      suggestions: [], unresolved: [],
      counts: { seeds: 0, suggested: 0, rendered: 0, unresolved: 0, by_family: {} },
      unmapped };
  }

  const { suggestions, unresolved, counts } = neighborhoodOf(records, seedSlugs);
  return { gids: targets.map((t) => t.gid), suggestions, unresolved, counts, unmapped };
}

// THE NEIGHBORHOOD DISPLAY, composed apart from the command (story 1.45, AC5).
// Exported and pure so a fixture can exercise what RENDERS; returns lines, the caller prints.
// THE RECOMMENDATION LEVELS (kogaki#686): closed, ordered strongest first — the order IS the
// ranking. Extending the set is the owner's act.
const NEIGHBORHOOD_LEVELS = Object.freeze(["core", "useful", "background"]);
// The display cap. Ten rows, ruled; see the refusal below for what happens when
// more than ten are judged; the fill takes the first ten in level order.
const NEIGHBORHOOD_DISPLAY_CAP = 10;

// THE NEIGHBORHOOD SECTION (kogaki#686, kogaki#741 ruling 3, kogaki#754; kogaki#698,
// kogaki#691). Four fields per row; up to ten rows filled in level order
// `core -> useful -> background`.
// The parameter list below is the one statement of what is read; do not restate it here.
// THE DISPLAY SELECTION, DEFINED ONCE (kogaki#689): the display and the Gloss fetch must
// reach the same rows. Pure, and it states every arm rather than returning a bare list.
export function neighborhoodDisplaySet(suggestions) {
  const list = suggestions || [];
  const found = list.length;
  const judged = list.filter((x) => NEIGHBORHOOD_LEVELS.includes(x.level));
  const unjudged = found - judged.length;
  // EVERY ARM CARRIES `shown` (PR #694 round 1). Two of the four omitted it, so
  // a reader doing `.shown.length` threw on exactly the arms this helper exists
  // to make safe — the one caller was written around it with `.shown || []`,
  // which is the second reader compensating for the shape rather than the shape
  // being right. A helper extracted so two computations cannot drift must not
  // hand its arms different shapes.
  if (!found) return { state: "empty", found, unjudged, shown: [], composition: [] };
  // UNREACHABLE FROM `cmdReport` SINCE kogaki#754 — that caller refuses a
  // non-empty enumeration carrying no judgment, so this arm cannot be reached
  // through the flow. It is kept because this function is exported and pure,
  // and an arm removed from a pure helper is one its own fixture can no longer
  // state.
  if (!judged.length) return { state: "none-judged", found, unjudged, shown: [], composition: [] };
  // `top` and `atTop` are gone (kogaki#741 ruling 3, kogaki#754); `composition` below is
  // computed over the rows that actually show.
  // THE FILL: rows fill to the cap in level order `core -> useful -> background`; within a
  // level the declared slug sort orders them and carries NO judgment.
  const ordered = [];
  for (const l of NEIGHBORHOOD_LEVELS) {
    ordered.push(...judged.filter((x) => x.level === l)
      .sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0)));
  }
  const shown = ordered.slice(0, NEIGHBORHOOD_DISPLAY_CAP);
  // THE COMPOSITION IS COMPUTED HERE, not at the render site, for the reason
  // this helper exists at all: the counts line and the rows must describe one
  // selection, and two computations of "which rows show" is how those drift.
  const composition = NEIGHBORHOOD_LEVELS
    .map((l) => [l, shown.filter((x) => x.level === l).length])
    .filter(([, n]) => n > 0);
  return { state: "shown", found, unjudged, shown, composition };
}

function neighborhoodDisplay({ tag, gids, suggestions, unresolved = [] }) {
  const out = [];
  const say = (s = "") => out.push(s);
  say(`Provenance neighborhood — ${tag} — settled set ${gids.join(", ")}`);
  // NO BLANK HERE. `neighborhoodSection` drops this function's first line and
  // supplies its own blank after `*Seeded by:*`; a blank at index 1 survived
  // that `slice(1)` and rendered two where the section had always rendered one.
  // Harmless and admitted by the `blank` class — and a rendering change nobody
  // ruled, which is the kind that lands unnoticed inside a specimen regenerated
  // for other reasons.

  const sel = neighborhoodDisplaySet(suggestions);
  // THE ROWS ARE `shown` (kogaki#741 ruling 3, kogaki#754). This destructure
  // took `atTop` while the display set filled `shown`, so the fill spanned
  // levels and the renderer still emitted only the top one — the counts line
  // said three and the rows showed one. The field it read is deleted rather
  // than left beside its replacement.
  const { found, unjudged, shown } = sel;

  // THE BATCH-SIDE RESOLUTION DISCLOSURE (the neighborhood defect, kogaki#691, after #686).
  // The enumerator's three gaps — no `source_batch`, an unserved `source_batch`, an unserved
  // member — must reach this surface; where every seed fails to resolve, the empty arm's
  // "returned nothing" sentence would be false.
  const gaps = Array.isArray(unresolved) ? unresolved : [];
  // TWO KINDS (PR #697): only a `seed` gap falsifies the empty form's "the enumeration ran
  // over the settled set's Batches"; a `member` gap does not, so they render apart.
  // The kind is read from the marker, never string-matched out of its `why` prose.
  const seedGaps = gaps.filter((g) => g.kind === "seed");
  const memberGaps = gaps.filter((g) => g.kind !== "seed");
  const sayRows = (list) => {
    for (const g of list) {
      // THE VALUE IS APPENDED ONLY WHERE THE REASON DOES NOT ALREADY CARRY IT.
      // Marker 2's reason embeds the RESOLVED batch key, which differs from the
      // raw `source_batch` on the twelve legacy records (`q_a/3/answer.md`
      // against an id of `q_a/3`) — so both are informative when they differ
      // and a duplication when they do not.
      const v = g.value === null || g.value === undefined ? "" : String(g.value);
      const dup = v !== "" && String(g.why).includes(v);
      say(`  ${g.slug} — ${g.why}${v === "" || dup ? "" : ` (${v})`}`);
    }
  };
  const saySeedGaps = () => {
    say(`${seedGaps.length} settled reference(s) could not be resolved to a Batch, so no enumeration ran over them:`);
    sayRows(seedGaps);
  };
  const sayMemberGaps = () => {
    say(`${memberGaps.length} Batch member(s) reached by the walk are carried by no served record:`);
    sayRows(memberGaps);
  };
  const sayGaps = () => {
    if (seedGaps.length) saySeedGaps();
    if (memberGaps.length) sayMemberGaps();
  };

  if (sel.state === "empty") {
    // A RESOLUTION FAILURE AND AN EMPTY RESULT ARE DIFFERENT FACTS, and only
    // one of them may claim the enumeration ran. Where any gap exists the
    // empty form is NOT rendered — it would assert an enumeration that did not
    // happen — and the disclosure stands in its place.
    // ONLY A SEED GAP DISPLACES. Where the batch resolved and the walk ran,
    // the empty form's first line is TRUE and its second — "the half that
    // refuses the strong reading" — is true unconditionally, so a member gap
    // renders BESIDE them rather than deleting them.
    if (seedGaps.length) { sayGaps(); return out; }
    // THE TWO-LINE FORM IS THE DECLARED CLASS (`neighborhood_empty`), kept
    // through kogaki#686 because the ruling narrows what a POPULATED section
    // renders and says nothing about the empty one. The second line is the
    // load-bearing half: it refuses the strong reading of an empty result. It
    // is true only when every seed RESOLVED and the walk genuinely found
    // nothing, which is the condition guarded above.
    say("No suggestion. The enumeration ran over the settled set's Batches and "
      + "returned nothing — a result about this settled set, not a failure.");
    say("Not asserted: that an empty neighborhood is informative in the STRONG "
      + "sense. Absence here is absence of a same-Batch sibling, never evidence "
      + "that the settled set stands alone.");
    if (memberGaps.length) sayMemberGaps();
    return out;
  }

  // A candidate carries its level and claim, or it is UNJUDGED. The unjudged
  // arms are DEFENSIVE from kogaki#741 on: J3 refuses a record leaving any
  // mechanical candidate uncovered and `cmdReport` refuses a non-empty
  // enumeration carrying no record, so no command path reaches them. They are
  // kept rather than deleted because this renderer is called on a selection it
  // does not compute — an unjudged entry arriving here is a caller's defect,
  // and naming it beats rendering `background` in its place. The selection
  // itself is `neighborhoodDisplaySet`'s; this function renders its arms and
  // computes none of them.
  if (sel.state === "none-judged") {
    say(`${found} candidate(s) found, 0 shown — none carries a recommendation `
      + `level. The mechanical layer ran; the judgment layer did not.`);
    // A PARTIAL RESOLUTION FAILURE IS STILL OWED. Some seeds resolving does not
    // discharge the ones that did not: the count above is over what the walk
    // reached, and a reader cannot tell a small neighborhood from a small
    // fraction of the settled set having been walked at all.
    if (gaps.length) sayGaps();
    return out;
  }

  // THE OVER-CAP REFUSAL IS GONE (the neighborhood section's shape, kogaki#741 ruling 3). It rendered no
  // rows and stated the counts; the section now fills to the cap in level order
  // and states the composition. `neighborhoodDisplaySet` no longer returns an
  // `over-cap` state, so there is no arm here to take.

  // THE COUNTS LINE IS A FIXED GRAMMAR CLASS, and no part of it is
  // LLM-controlled: `showing 10 of 23 — all core`, or
  // `showing 10 of 23 — 7 core, then 3 useful`. The composition comes from the
  // display set rather than being recomputed, so the line and the rows cannot
  // disagree about which selection they describe.
  const comp = sel.composition || [];
  const desc = comp.length === 1
    ? `all ${comp[0][0]}`
    : comp.map(([l, n]) => `${n} ${l}`).join(", then ");
  say(`showing ${sel.shown.length} of ${found} — ${desc}`);
  // THE BATCH-SIDE RESOLUTION GAPS RENDER HERE (kogaki#691; #686 disposition 4; PR #697).
  // Both kinds ride a populated section: the counts above cover only what the walk REACHED.
  if (unjudged) say(`${unjudged} candidate(s) carry no level and are counted here, never shown.`);
  if (gaps.length) sayGaps();
  say();

  // FOUR FIXED LINE CLASSES PER ROW, in the ruled order (kogaki#861): id/level/relation,
  // TC target, Gloss line or its marker, claim. The level heads the row and nowhere else.
  // The Gloss line stays, absence markers included: a silent row would read as clean.
  // `relation` is plain words; the row is read by the owner, not a parser.
  // THE GLOSS IS QUOTED AT ITS CITE (kogaki#689); a missing rendering gets `NO_HEADLINE`.
  for (const x of shown) {
    say(`- ${x.nid} [${x.level}] — ${x.relation || "relation unrecorded"}`);
    // THE TC-TARGET LINE, ALWAYS (kogaki#861). `readNeighborhoodJudgments`
    // refuses a judgment carrying no target, so a row reaching here without one
    // came from a caller that composed its own selection — the same standing as
    // the unjudged arms above, and answered the same way: a TYPED ABSENCE
    // MARKER rather than an omitted line. Omitting it would make "the target is
    // a fixed line class" false exactly where it matters, and substituting a
    // plausible candidate id would be the renderer inventing the join.
    say(x.target && x.target.candidate && x.target.role
      ? `  serves: ${x.target.role} for ${x.target.candidate}`
      : `  ${NO_TARGET}`);
    // A HEADLINE WITH NO CITE FALLS TO THE MARKER, NEVER TO BARE PROSE (PR #694
    // round 1). The ternary's second arm used to print `x.gloss` when it was
    // truthy, so a served headline arriving with a null cite rendered UNQUOTED
    // and unaddressed — the paraphrase-standing-for-a-quote shape this section's
    // own rule refuses, and the shape the slug substitution was refused under at
    // #686 round 1. It is reachable from served data rather than hypothetical:
    // `parseGlossShard` sets `cite: line.cite` with no guard, so a shard line
    // returned without a cite yields exactly that entry. No grammar class is
    // shaped for the resulting line either, so the outcome was an emit-time
    // refusal of the whole report or an unclassed line.
    say(x.gloss && x.gloss_cite ? `  “${x.gloss}”  ${x.gloss_cite}`
                                : `  ${glossMarkerFor(x)}`);
    // THE LEVEL IS GONE FROM THIS LINE — it heads the row above (kogaki#861).
    say(`  ${x.claim || "claim unrecorded"}`);
  }
  return out;
}

// THE FULL REPORT SECTION (SPEC-terrain, the neighborhood as a report v20, story 1.69,
// kogaki#473). The last section of `reports/FullReport.md` at the ONCE tier; the lines are
// `neighborhoodDisplay`'s, reused, with the heading and `*Seeded by:*` line of
// `report-format.json` v6. Exported and pure so a fixture reaches it without a seam.
// This frame forwards exactly what the callee reads; its parameter list is the statement
// of that (kogaki#698).
export function neighborhoodSection({ gids, no_material, suggestions, unresolved = [] }) {
  const head = [
    "## Provenance neighborhood",
    "",
    `*Seeded by:* ${gids.join(", ")}`,
    "",
  ];
  // The seam served no element records: the enumeration DID NOT RUN, which is
  // a different state from an enumeration that ran and found nothing, and the
  // section says which (report-format.json v7 `neighborhood_no_material`).
  if (no_material) {
    return [...head,
      "No served material reached the neighborhood: the seam returned no element records, so the enumeration did not run — a different state from an enumeration that ran and found nothing, stated rather than failing the pull (the disclosure discipline of the neighborhood section's shape).",
    ];
  }
  return [...head,
    // Drop only the display's heading line; the tag it carried already heads
    // the report's own title, and the set rides `*Seeded by:*` above.
    ...neighborhoodDisplay({ tag: "", gids, suggestions, unresolved }).slice(1),
  ];
}
