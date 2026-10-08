// Terrain — the survey and its validation, figure rendering, and the view.
// One stage of the Terrain command, imported only by Terrain's own modules (kogaki#1259).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { COMPOSITION_INPUT_BOUND } from "../workflow/judge.mjs";
import { REPO, fail, gatewayQuery, readJson, runDir, setRunPersist } from "../workflow/run-record.mjs";
import { NO_HEADLINE, NO_SEAM, NO_SHARD_ADDRESSED } from "../workflow/strands.mjs";

export const SURVEY_SCHEMA = readJson(join(REPO, "src/survey-schema.json"));
export const RECORD_SCHEMA = readJson(join(REPO, "src/record-schema.json"));

const NO_RELATION_SECTION = "No relation (no served tag)";

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        // repeatable flags accumulate
        if (args[key] === undefined) args[key] = next;
        else args[key] = [].concat(args[key], next);
        i++;
      }
    } else {
      args._.push(a);
    }
  }
  return args;
}

// ---- SURVEY VALIDATION ----------------------------------------------------
// Survey validation — the same rules the check applies, run BEFORE writing.
// Returns a list of "CODE — detail" strings; empty = conforming.
export function validateSurvey(record, schema = SURVEY_SCHEMA) {
  const v = [];
  const s = schema.survey;
  for (const f of s.required) {
    if (record[f] === undefined || record[f] === null || record[f] === "") {
      v.push(`SURVEY_MISSING_FIELD — survey.${f}`);
    }
  }
  const candidates = Array.isArray(record.candidates) ? record.candidates : [];
  const journeys = Array.isArray(record.journeys) ? record.journeys : [];
  const sections = Array.isArray(record.sections) ? record.sections : [];
  const ids = new Set();
  const lessonSlugs = new Set();
  const displayIdSeen = new Set();
  const displayIdPattern = s.candidate_display_id_pattern
    ? new RegExp(s.candidate_display_id_pattern) : null;
  candidates.forEach((c, i) => {
    for (const f of s.candidate_required) {
      if (c[f] === undefined || c[f] === null || c[f] === "") {
        v.push(`CANDIDATE_MISSING_FIELD — candidates[${i}].${f}`);
      }
    }
    if (c.family !== undefined && !schema.families.includes(c.family)) {
      v.push(`FAMILY_UNKNOWN — candidates[${i}].family=${JSON.stringify(c.family)}; the served families are ${schema.families.join("|")}`);
    } else if (c.family !== undefined && c.family !== schema.candidate_family_must_be) {
      v.push(`CANDIDATE_NOT_A_LESSON — candidates[${i}].family=${JSON.stringify(c.family)}: ${schema.candidate_family_rationale}`);
    }
    // the display-ID rule — the display_id is the rendered token, so its shape and its
    // uniqueness are record-level invariants rather than rendering-time hopes.
    // A duplicate is the worse of the two failures: it does not read as a
    // collision on any surface, it reads as one Strand appearing twice.
    if (c.display_id !== undefined && c.display_id !== null && c.display_id !== "") {
      if (displayIdPattern && !displayIdPattern.test(String(c.display_id))) {
        v.push(`DISPLAY_ID_MALFORMED — candidates[${i}].display_id=${JSON.stringify(c.display_id)} does not match ${s.candidate_display_id_pattern}`);
      }
      if (displayIdSeen.has(c.display_id)) {
        v.push(`DISPLAY_ID_DUPLICATE — ${JSON.stringify(c.display_id)} appears twice; the survey record is the ID→slug map (SPEC.md, the display-ID rule) and a duplicate makes that map return the wrong Strand`);
      }
      displayIdSeen.add(c.display_id);
    }
    if (c.slug) lessonSlugs.add(c.slug);
    if (c.id) {
      if (ids.has(c.id)) {
        v.push(`CANDIDATE_ID_DUPLICATE — ${JSON.stringify(c.id)} appears twice; a duplicate id silently merges two Strands and breaks the cover (a journey shares its lesson's slug — qualify by family)`);
      }
      ids.add(c.id);
    }
    narrowingKeys(c, s).forEach((k) =>
      v.push(`NAVIGATION_STATE_NARROWS — candidates[${i}] carries ${JSON.stringify(k)}: ${s.narrowing_rationale}`));
  });
  // Falsifier 1 (SPEC-terrain, what would falsify the candidate model) — a Journey whose slug matches no Lesson has no
  // row to be marked on, so the re-projection would drop it. Generation-time
  // refusal, never a rendering-time warning; the orphan slugs are named.
  const orphans = journeys.filter((j) => j && j.slug && !lessonSlugs.has(j.slug)).map((j) => j.slug);
  if (orphans.length) {
    v.push(`JOURNEY_ORPHAN — ${orphans.length} Journey(s) match no Lesson row: ${orphans.sort().join(", ")}: ${s.orphan_journey_rationale}`);
  }
  const placed = new Set();
  sections.forEach((sec, i) => {
    for (const f of s.section_required) {
      if (sec[f] === undefined || sec[f] === null || sec[f] === "") {
        v.push(`SECTION_MISSING_FIELD — sections[${i}].${f}`);
      }
    }
    narrowingKeys(sec, s).forEach((k) =>
      v.push(`NAVIGATION_STATE_NARROWS — sections[${i}] carries ${JSON.stringify(k)}: ${s.narrowing_rationale}`));
    const secPlaced = [];
    for (const m of sec.members || []) {
      if (!ids.has(m)) {
        v.push(`PLACEMENT_UNKNOWN_STRAND — sections[${i}] places ${JSON.stringify(m)}, which is no candidate`);
      } else {
        placed.add(m);
        secPlaced.push(m);
      }
    }
    // The section figure is recomputed from the placements it claims to be
    // counted over and refused on mismatch, exactly as completeness.by_family
    // already is — the fill of terrain-family-split-carrier with (a)
    // (SPEC.md, the rendering rule). Placements authoritative, the stored figure subordinate,
    // FIGURE_MISMATCH the mechanical check, at the layer the figure is made.
    if (sec.by_family && typeof sec.by_family === "object") {
      const want = familySplit(secPlaced, candidates, schema);
      const bad = [];
      for (const fam of schema.families) {
        if (sec.by_family[fam] !== undefined && sec.by_family[fam] !== want[fam]) {
          bad.push(`sections[${i}].by_family.${fam}=${sec.by_family[fam]} recomputed=${want[fam]}`);
        }
      }
      if (bad.length) v.push(`FIGURE_MISMATCH — ${bad.join("; ")}`);
    }
  });
  for (const id of ids) {
    if (!placed.has(id)) {
      v.push(`COVER_STRAND_UNPLACED — ${JSON.stringify(id)} appears in no section; nothing is silently dropped`);
    }
  }
  const tagless = candidates.filter((c) => Array.isArray(c.tags) && c.tags.length === 0);
  if (tagless.length > 0) {
    const name = record.no_relation_section;
    const sec = sections.find((x) => x.name === name);
    if (!name || !sec) {
      v.push(`NO_RELATION_NOT_EXPLICIT — ${tagless.length} Strand(s) carry no served tag and no declared no-relation section holds them`);
    }
  }
  const comp = record.completeness;
  if (comp && typeof comp === "object") {
    const cs = s.completeness;
    for (const f of cs.required) {
      if (comp[f] === undefined || comp[f] === null || comp[f] === "") {
        v.push(`SURVEY_MISSING_FIELD — completeness.${f}`);
      }
    }
    if (comp.counted_over !== undefined && comp.counted_over !== cs.counted_over_must_be) {
      v.push(`FIGURE_NOT_OVER_PLACEMENTS — completeness.counted_over=${JSON.stringify(comp.counted_over)}: ${cs.counted_over_rationale}`);
    }
    if (comp.family !== undefined && comp.family !== "" && comp.family !== cs.family_must_name) {
      v.push(`FIGURE_FAMILY_UNNAMED — completeness.family=${JSON.stringify(comp.family)}: ${cs.family_rationale}`);
    }
    if (comp.family === "" || comp.family === null) {
      v.push(`FIGURE_FAMILY_UNNAMED — completeness.family is empty: ${cs.family_rationale}`);
    }
    // The figure is recomputed from the placements it claims to be counted
    // over. A stored figure that disagrees is a wrong number, not a view.
    const byFamily = familySplit([...placed], candidates, schema);
    const mismatches = [];
    if (comp.placed !== undefined && comp.placed !== placed.size) {
      mismatches.push(`placed=${comp.placed} recomputed=${placed.size}`);
    }
    if (comp.of !== undefined && comp.of !== candidates.length) {
      mismatches.push(`of=${comp.of} candidates=${candidates.length}`);
    }
    if (comp.by_family && typeof comp.by_family === "object") {
      for (const fam of schema.families) {
        if (comp.by_family[fam] !== undefined && comp.by_family[fam] !== byFamily[fam]) {
          mismatches.push(`by_family.${fam}=${comp.by_family[fam]} recomputed=${byFamily[fam]}`);
        }
      }
    }
    // The coverage half rides the same recompute. SPEC-terrain, what would falsify the candidate model declares
    // `instrument: none` for falsifier 2, and this is not that carrier: it
    // refuses a WRONG coverage figure, it does not read the threshold.
    const thin = [...placed].filter((id) => {
      const c = candidates.find((x) => x && x.id === id);
      return c && c.family === schema.candidate_family_must_be && !c[s.journey_mark_key];
    }).length;
    if (comp.thin_lessons !== undefined && comp.thin_lessons !== thin) {
      mismatches.push(`thin_lessons=${comp.thin_lessons} recomputed=${thin}`);
    }
    if (mismatches.length) {
      v.push(`FIGURE_MISMATCH — ${mismatches.join("; ")}`);
    }
  }
  return v;
}

function narrowingKeys(obj, s) {
  return s.narrowing_keys_forbidden.filter((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

// The family split over a set of placed ids. Under SPEC.md, the candidate model, the rows are
// Lessons, so the Journey half is counted from the MARKS the placed Lessons
// carry — Lessons plus marks reconstructs the Strand set exactly (what would falsify the candidate model), which
// is what keeps `agents (115 — 59 lessons + 56 journeys)` a true statement
// about 115 Strands while the section holds 59 rows.
export function familySplit(ids, candidates, schema = SURVEY_SCHEMA) {
  const s = schema.survey;
  const markKey = s.journey_mark_key;
  const out = {};
  for (const fam of schema.families) out[fam] = 0;
  for (const id of ids) {
    const c = candidates.find((x) => x && x.id === id);
    if (!c) continue;
    if (out[c.family] !== undefined) out[c.family]++;
    if (c.family === schema.candidate_family_must_be && c[markKey] && out.journey !== undefined) out.journey++;
  }
  return out;
}

// THE ONE RESOLUTION PATH FROM AN ID TO WHAT AN OWNER READS (the display-ID rule, story 1.53).
// The survey record's candidate entry is the only ID map; no surface keeps its own (AC3).
// A member with no `display_id` renders the stated `NO_DISPLAY_ID` token, never the slug (AC7);
// the remedy for a legacy record is to run `terrain survey` again.
export const NO_DISPLAY_ID = "⟨no display_id — ABNORMAL, a survey record predating the display-ID rule, never substituted⟩";

export function displayIdOf(id, candidates) {
  const c = (candidates || []).find((x) => x && x.id === id);
  return c && c.display_id ? c.display_id : NO_DISPLAY_ID;
}

// DISPLAY IDS COMPARE NUMERICALLY (kogaki#689, PR #693 round 1). `L2` before
// `L10`, and the abnormal marker last — a lexicographic sort orders "L1", "L10",
// "L2" in that order, and a display id's number is its meaning on every surface
// in this file.
export function compareDisplayIds(a, b) {
  const n = (x) => { const m = /^([A-Za-z]+)([0-9]+)$/.exec(String(x)); return m ? [m[1], Number(m[2])] : null; };
  const na = n(a); const nb = n(b);
  if (!na && !nb) return String(a).localeCompare(String(b));
  if (!na) return 1;
  if (!nb) return -1;
  return na[0] === nb[0] ? na[1] - nb[1] : na[0].localeCompare(nb[0]);
}

// The plural form, plus the count of abnormal members so a surface can state
// the fault ONCE beneath the rows rather than per row — the shape the rendering rule's
// `missing` counter already uses at the candidate-row surface.
export function displayIds(ids, candidates) {
  const rendered = (ids || []).map((id) => displayIdOf(id, candidates));
  return { rendered, missing: rendered.filter((r) => r === NO_DISPLAY_ID).length };
}

// The one line every surface prints when `displayIds` reported a shortfall.
// Stated once so the eight call sites cannot drift into eight wordings.
export function displayIdAbnormalLine(missing, total) {
  return `ABNORMAL: ${missing} of ${total} member(s) on this surface carry no display_id. `
    + "The survey record is the ID→slug map (SPEC.md, the display-ID rule) and this one predates it — nothing was substituted for the missing IDs. "
    + "Re-run `terrain survey` to regenerate the record (location and naming v11).";
}

// A SURVEY WITH NO CANDIDATES IS A REFUSAL (kogaki#1026; the ambiguity is kogaki#368's):
// zero candidates stops the run before `TAG_SELECTION` raises a gate over an empty table.
// The refusal names the pin read, because the two causes are told apart by asking a second
// served surface AT THE SAME PIN. Pure, so it can be fixtured; the caller prints and exits.
function surveyEmptinessRefusal(servedLines, lessonCount, pin) {
  if (lessonCount > 0) return null;
  const at = `pin ${pin ?? "absent"}`;
  if (servedLines === 0) {
    return `0 candidates, and THE SEAM SERVED NOTHING AT ALL — 0 served `
      + `line(s) at ${at}. This is a statement about the CALL, not about the `
      + "corpus: a served surface with no records is not a corpus with no "
      + "Lessons. Ask a second surface at the same pin — if one answers while "
      + "this one misses, the fault is the element manifest and re-running "
      + "changes nothing.";
  }
  return `0 candidates, from ${servedLines} served record(s) at ${at} — the `
    + "seam answered and NONE of what it served was a Lesson. This is a "
    + "statement about the CORPUS.";
}

// The cite is COMPOSED at this producing site in the identity form
// (SPEC-draft-command v2, kogaki#600; producer half kogaki#612):
// `gloss/ELEMENTS.jsonl slug=<slug> kind=<lesson|journey> @<pin-sha>`, where
// (slug, kind) is the join key read from the served record's OWN fields and
// the substrate pin rides as provenance. The gateway's positional
// `gloss/ELEMENTS.jsonl:<line>@<sha>` cite is never copied into any kogaki
// artifact — Brief and Draft transport this composed form verbatim, so the
// positional form is unproducible downstream by construction. The pin's sha
// segment is taken as the response serves it; judging its shape belongs to
// the resolve check (src/cite-check.mjs), not to the producer.
function composeIdentityCite(slug, kind, pin) {
  const sha = String(pin ?? "").split("@").pop();
  if (!sha) return null;
  return `gloss/ELEMENTS.jsonl slug=${slug} kind=${kind} @${sha}`;
}

// ---- SURVEY ---------------------------------------------------------------
// survey — read the seam, compose, validate, write.
export function cmdSurvey(args) {
  // The run directory is taken only after the read and the emptiness decision (kogaki#1026;
  // PR #1033 round 1): a refusal writes no run record, gate declaration or open-gate pointer.
  // `{}`, NOT a kind filter: `element_survey` declares `kind` and `tag`, and an undeclared key
  // returned the miss shape (kogaki#368). Families are filtered below on `rec.kind`.
  const resp = gatewayQuery("element_survey", {});
  // The candidate row is ONE LESSON (SPEC.md, the candidate model). Journeys are read into their
  // own list and become a MARK on their Lesson's row; the list stays in the
  // record so count-in remains computable against count-out (what would falsify the candidate model) and so
  // falsifier 1 has an artifact to be decided from.
  const lessons = [];
  const journeys = [];
  for (const line of resp.lines || []) {
    let rec;
    try {
      rec = JSON.parse(line.text);
    } catch {
      fail(`unparseable served record at ${line.cite} — surfaced, not skipped: a silently dropped record breaks the cover`);
    }
    if (rec.kind === "lesson") {
      // The id stays family-qualified: a journey shares its lesson's slug.
      // `display_id` is minted HERE and nowhere else (the display-ID rule, story 1.53); the survey
      // record IS the ID→slug map, and every owner surface resolves through `displayIdOf`.
      // Numbering follows the substrate's SERVED order (SQ1): append-stable across a pin advance,
      // not stable against an earlier insertion; no persistent map is kept (AC3).
      const cite = composeIdentityCite(rec.slug, rec.kind, resp.pin);
      if (!cite) fail(`cannot compose an identity cite for lesson ${rec.slug} — the survey response carries no resolvable pin (${resp.pin ?? "absent"}); surfaced, not skipped`);
      lessons.push({ id: `lesson:${rec.slug}`, display_id: `L${lessons.length + 1}`, slug: rec.slug, family: "lesson", tags: rec.tags || [], cite, journey: null });
    } else if (rec.kind === "journey") {
      const cite = composeIdentityCite(rec.slug, rec.kind, resp.pin);
      if (!cite) fail(`cannot compose an identity cite for journey ${rec.slug} — the survey response carries no resolvable pin (${resp.pin ?? "absent"}); surfaced, not skipped`);
      journeys.push({ slug: rec.slug, cite });
    }
  }
  // THE REFUSAL, and it is sited HERE — after the read and the family split,
  // before the run directory, the survey record, and every state the executor
  // would run after this one. What it refuses is not a bad survey but an
  // EMPTY one: a tag question composed over zero candidates asks the owner to
  // name a tag from a listing that has no rows.
  const emptiness = surveyEmptinessRefusal((resp.lines || []).length, lessons.length, resp.pin);
  if (emptiness) {
    // THE PENDING RUN IS RELEASED RATHER THAN PERSISTED (kogaki#808's persist
    // is armed by the executor before this state runs). Its rule — a refusal
    // is not a rollback of the transitions the same act completed — is about
    // states that COMPLETED; `survey` is the first state of the table, so
    // there is nothing behind it to preserve, and a record naming a survey
    // that does not exist is worse than no record. This is the one release
    // outside the loop's own write, and it is stated rather than incidental.
    setRunPersist(null, null);
    process.stderr.write(`terrain: ${emptiness}\n`);
    process.exit(1);
  }
  // The mark reads by ABSENCE: a Lesson with no Journey is decorated, a Lesson
  // with one is not.
  const journeyBySlug = new Map(journeys.map((j) => [j.slug, j]));
  for (const c of lessons) {
    const j = journeyBySlug.get(c.slug);
    if (j) c.journey = { slug: j.slug, cite: j.cite };
  }
  // Compose: one section per served tag (display 1's axis is the served tag
  // vocabulary, SPEC-terrain, presentation-only grouping); multi-tag Lessons place in every section they
  // relate to — completeness is a COVER counted in placements, not a
  // partition (SPEC.md, the placement cover).
  const byTag = new Map();
  const tagless = [];
  for (const c of lessons) {
    if (c.tags.length === 0) { tagless.push(c.id); continue; }
    for (const t of c.tags) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t).push(c.id);
    }
  }
  const sections = [...byTag.keys()].sort().map((t) => ({ name: t, axis: "served-tag", members: byTag.get(t) }));
  if (tagless.length > 0) sections.push({ name: NO_RELATION_SECTION, axis: "served-tag", members: tagless });
  // The figures — counted AFTER composition, over placements, each carrying
  // its family split so no emitted number is bare (SPEC.md, the placement cover, the rendering rule).
  for (const s of sections) s.by_family = familySplit(s.members, lessons);
  const placed = new Set(sections.flatMap((s) => s.members));
  const byFamily = familySplit([...placed], lessons);
  const thin = [...placed].filter((id) => !lessons.find((c) => c.id === id).journey).length;
  const id = `terrain-survey-${Date.now()}`;
  const record = {
    id,
    generated_by: "src/terrain.mjs",
    pin: resp.pin,
    candidates: lessons,
    journeys,
    sections,
    no_relation_section: NO_RELATION_SECTION,
    completeness: {
      placed: placed.size,
      of: lessons.length,
      family: SURVEY_SCHEMA.family_label,
      by_family: byFamily,
      counted_over: "placements",
      thin_lessons: thin,
      coverage: placed.size ? `${byFamily.journey}/${placed.size}` : "0/0",
    },
  };
  const violations = validateSurvey(record);
  if (violations.length) {
    fail(`refusing to write a non-conforming survey record:\n  ${violations.join("\n  ")}`);
  }
  const dir = runDir(args);
  const out = join(dir, `${id}.terrain-survey.json`);
  writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
  // Rendering. The figure takes the first line here as a PRESENTATION choice;
  // whether it is contract is carried open at SPEC.md, the open questions and not decided by
  // this runtime.
  const c = record.completeness;
  console.log(`Completeness: ${denominator(c.placed, c.of)} placed (${strandFigure(c.by_family)}); counted over placements.`);
  console.log(`Journey coverage: ${c.coverage} Lessons carry a Journey — ${c.thin_lessons} thin Lesson(s), the actionable set; the mark reads by absence.`);
  console.log(`Pin: ${record.pin}`);
  console.log(`Survey record: ${out}\n`);
  // The tag listing is emitted only by `renderTagDisplay`, the `tag_listing` surface's one
  // emitter (PR #667 round 1 findings 4 and 5; kogaki#665) — do not emit it from this state.
  // The bounded-input pointer, sited at the step BEFORE the one that needs it (kogaki#163 lever 3).
  console.log(`Before composing claims for a tag: compose-input --survey ${out} --tag T — ${COMPOSITION_INPUT_BOUND}. Composing from per-group material instead spends one read per PLACEMENT, which is what the 2026-08-07 architecture run measured at ~19 minutes.`);
  // Returned so the control plane executor can record the survey record BY PATH (the run record)
  // without re-deriving the name. The record references it and copies nothing
  // out of it — the ID->slug map stays the display-ID rule's single carrier.
  return out;
}

// ---- Figure rendering. Every emitted figure names the families it counted
// (SPEC.md, the placement cover, the rendering rule): `agents (115 — 59 lessons + 56 journeys)`, never
// `agents (115)`. Every display showing candidate rows states its denominator
// in Lessons (the candidate model). These two helpers are the only place a Terrain figure is
// composed, so a new display cannot emit a bare count by forgetting to.
export function strandFigure(split) {
  const total = SURVEY_SCHEMA.families.reduce((n, f) => n + (split[f] || 0), 0);
  return `${total} — ${SURVEY_SCHEMA.families.map((f) => {
    const n = split[f] || 0;
    return `${n} ${n === 1 ? f : `${f}s`}`;
  }).join(" + ")}`;
}

export function denominator(inView, served) {
  return `${inView} of ${served} Lessons`;
}

export function sectionFigure(sec, lessonsServed) {
  return `${sec.name} (${strandFigure(sec.by_family)}); ${denominator(sec.members.length, lessonsServed)}`;
}

// A count of Lessons, family-named (SPEC.md, the rendering rule): the figure names the one
// family the candidate model puts on the row.
export function lessonCount(n) {
  return `${n} ${n === 1 ? "Lesson" : "Lessons"}`;
}

// Display 1's tag row renders a declared ALLOWLIST and nothing else
// (SPEC.md, the rendering rule, v5, kogaki#147): the tag name, and the tag's Lesson count. A
// line class not on the allowlist does not render — the remedy is the
// constructive form, never a per-column removal, because an enumerated
// prohibition's non-member fallback is admit.
export function tagRow(sec) {
  return `${sec.name} — ${lessonCount((sec.by_family || {}).lesson || 0)}`;
}

// THE NAMESPACES THE NEIGHBORHOOD FETCH ADDRESSES (kogaki#689). `cmdView` reads
// both for the same reason the rendering rule gives, and the neighborhood's members are not all
// Lessons — `neighborhoodOf` indexes every served record carrying a slug and
// stamps `family` from its kind — so a journey-family suggestion reached no
// shard while its tags were already in the union a `lessons/` read was spending.
// The incremental cost is a SECOND SHARD PER TAG ALREADY IN THE UNION, not a
// new tag, which is the shape `cmdView` already pays.
//
// THE BRIEF LANE KEEPS ONE NAMESPACE, and that is a scoping rather than an
// oversight: its members are settled Lessons by construction (kogaki#528), so a
// `journeys/` read there buys nothing and spends a shard per tag. The widening
// is the neighborhood's, so it is declared at the neighborhood's call site.
export const NEIGHBORHOOD_GLOSS_NAMESPACES = ["lessons", "journeys"];

// WHICH MARKER A ROW WITH NO RENDERABLE QUOTATION CARRIES (PR #694 round 1).
// A row reaches here either because nothing was fetched for it or because what
// was fetched carries no cite. The second is a served rendering the row CANNOT
// ADDRESS, and a quotation without its address is the shape the verbatim rule
// refuses — so it renders `NO_HEADLINE`, the read-and-carried-nothing marker,
// which is true of it: a shard answered and what it returned is unusable here.
// The never-carried marker stays reserved for rows no shard reached at all.
export function glossMarkerFor(x) {
  if (x.gloss === NO_SHARD_ADDRESSED) return NO_SHARD_ADDRESSED;
  // THE SEAM MARKER PASSES THROUGH (kogaki#689). It is a marker `glossFor`
  // already decided, so re-deriving it here would be this helper answering a
  // question the fetch answered — and falling through to `NO_HEADLINE` would
  // restate the read-that-never-happened claim the marker exists to replace.
  if (x.gloss === NO_SEAM) return NO_SEAM;
  // A TRUTHY GLOSS REACHING HERE HAS NO CITE, so it renders the read-and-empty
  // marker: a shard answered and what it returned cannot be addressed.
  if (x.gloss) return NO_HEADLINE;
  // NOTHING FETCHED. Written as the bare marker rather than `x.gloss || …`
  // (PR #694 round 2, nit): past the guard above `x.gloss` is necessarily
  // falsy, so the disjunction could only ever yield its right-hand side — a
  // residue of the ternary arm this helper replaced, reading as though a
  // falsy-but-present gloss could still be rendered. In a function whose whole
  // point is that each marker states exactly one fact, a branch that cannot
  // fire states a second one.
  return NO_SHARD_ADDRESSED;
}

// The PRE-SELECTION listing: the TAG ROWS — a tag name and its Lesson count, and nothing else
// (the rendering rule's allowlist, transcribed into the `tag_listing` grammar). Owned by the
// table under #666; completeness/coverage/pin/record lines stay in `cmdSurvey`'s stdout.
// Must survive (kogaki#625, PR #667 round 2), each held by checks/check-terrain-composition.sh:
// header plus one tag_row per section only; ONE `tagRow(` emitter; the navigation hint.
// consulted: product-lab@d6fdadd50274cee5ab72730d73c4508b9a53e430 LESSONS.md:36
export function renderTagDisplay(record) {
  const out = ["The survey — display 1. Navigation (narrows nothing): name a tag.", ""];
  for (const s of record.sections) out.push(`  ${tagRow(s)}`);
  out.push("");
  out.push(NAVIGATION_HINT);
  return out.join("\n");
}

// THE CoTagGroups OWNER RENDERING (kogaki#434; implemented under kogaki#464 after #434 closed).
// The runtime WRITES it (the single producer rule): the relay must not retype the display.
// The name is a LITERAL on the renderings directory, like `FullReport.md`: every display renders
// through here, with no second path and no caller-supplied name. One file, overwritten per render.
// NAVIGATION_HINT is one literal shared by the emitter and `report-format.json`'s `navigation_hint`
// form (kogaki#665); change both together.
const NAVIGATION_HINT =
  "Navigation (narrows nothing): name a tag in chat — the executor advances on the owner's word.";
