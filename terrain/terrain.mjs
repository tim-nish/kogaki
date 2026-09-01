#!/usr/bin/env node
// Terrain — the survey/selection surface (manifest item 1, specs/SPEC.md §5;
// kogaki#14 umbrella, kogaki#17 story 1.8; governing spec
// specs/spec-terrain/SPEC.md).
//
// Terrain reads SERVED RENDERINGS only, through the seam (element_survey),
// and composes the survey under its three contracts:
//   §2.1 completeness is a cover counted in placements, AFTER composition,
//        with every figure naming which family it counted;
//   §2.2 grouping is presentation-only — navigation narrows nothing;
//   §2.3 the second-proposer boundary — rank/trim/hide are proposals routed
//        through the item-3 record contract; enumerate/sort/filter-by-owner
//        are navigation; an act in neither list is a report.
//
// Terrain validates a survey record BEFORE writing it, with the same rules
// checks/check-terrain-composition.sh applies after — constrain generation,
// then detect what generation cannot promise.
//
// Run state (survey records, proposal records, gate declarations, captures)
// lives in the machine-local run workspace (default ~/.kogaki/runs/...),
// never in the repository (specs/SPEC.md §4 rider 3).
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync, readdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadGrammar, refuseUnlessConformant, FormatRefusal } from "./format-guard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SURVEY_SCHEMA = readJson(join(REPO, "specs/spec-terrain/survey-schema.json"));
const RECORD_SCHEMA = readJson(join(REPO, "specs/spec-proposal-contract/record-schema.json"));
const GATE_SCHEMA = readJson(join(REPO, "specs/spec-gate-carrier/gate-schema.json"));
const GATES_REGISTRY = readJson(join(REPO, "gates/registry.json"));
// §14.1's single carrier of the RENDERED FORM. Resolved from this module's own
// location, like every schema above it — the emit-time refusal must not depend
// on the cwd a run happens to start in.
const REPORT_FORMAT = join(REPO, "specs/spec-terrain/report-format.json");

const NO_RELATION_SECTION = "No relation (no served tag)";
// The selector affordance (AskUserQuestion) holds at most 4 options; one is
// always the standing registry option, so at most 3 strands ride a gate.
const MAX_STRAND_OPTIONS = 3;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fail(msg) {
  process.stderr.write(`terrain: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
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

function runDir(args) {
  const dir = args["run-dir"]
    || process.env.KOGAKI_RUN_DIR
    || join(homedir(), ".kogaki", "runs", `terrain-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// `soft` callers get a NULL instead of a process exit when the seam is
// unavailable (kogaki#528). Terrain's own calls stay HARD and must: "Terrain
// without served renderings has nothing to survey", so degrading there would
// compose a survey out of nothing. The Brief lane is the opposite case — its
// set is already settled and the rendering enriches material it holds — and
// CLAUDE.md's founding rule binds it: the substrate is an ENHANCER, NEVER A
// DEPENDENCY. A hard exit here would make a Brief unstartable whenever the
// gateway is down, which is the dependency that rule forbids.
function gatewayQuery(tool, toolArgs, { soft = false } = {}) {
  const bin = join(REPO, "policy/kit/bin/gateway-query.mjs");
  // Capture stdout through a file descriptor, not a pipe. The kit now drains
  // stdout before exiting (kogaki#23), so a pipe would work — but this call
  // deliberately does not depend on that: a file write is synchronous
  // regardless of what the other side of the seam does, and element_survey is
  // ~500KB, the size at which the difference stops being theoretical.
  const outPath = join(tmpdir(), `terrain-seam-${process.pid}-${Date.now()}.json`);
  const fd = openSync(outPath, "w");
  let res;
  try {
    res = spawnSync(process.execPath, [bin, "--consumer", "kogaki", "--tool", tool, "--args", JSON.stringify(toolArgs)], {
      stdio: ["ignore", fd, "pipe"],
      encoding: "utf8",
    });
  } finally {
    closeSync(fd);
  }
  res.stdout = readFileSync(outPath, "utf8");
  rmSync(outPath, { force: true });
  if (res.status !== 0 && soft) return null;
  if (res.status === 11) {
    // The seam is an enhancer elsewhere; here it is the material itself.
    // Degrade with the one-line idiom and stop — Terrain without served
    // renderings has nothing to survey, and inventing material would cross
    // the repository-invisible boundary, not soften a failure.
    process.stderr.write("policy_source unavailable: Terrain has no material without the seam — no survey composed\n");
    process.exit(11);
  }
  if (res.status !== 0) {
    // BOTH STREAMS. The transport's address refusal (exit 13) is a diagnostic
    // on stderr, but stdout is captured to a file here and would otherwise be
    // discarded — so a failure whose whole content sat in one stream printed
    // an empty tail. Report what both carried (round-1 finding on PR #372).
    const detail = [res.stderr, res.stdout].map((x) => (x || "").trim()).filter(Boolean).join(" | ");
    fail(`gateway-query failed (${res.status}): ${detail || "(no diagnostic on either stream)"}`);
  }
  return JSON.parse(res.stdout);
}

// --------------------------------------------------------------------------
// Survey validation — the same rules the check applies, run BEFORE writing.
// Returns a list of "CODE — detail" strings; empty = conforming.
// --------------------------------------------------------------------------
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
    // §14.3 — the display_id is the rendered token, so its shape and its
    // uniqueness are record-level invariants rather than rendering-time hopes.
    // A duplicate is the worse of the two failures: it does not read as a
    // collision on any surface, it reads as one Strand appearing twice.
    if (c.display_id !== undefined && c.display_id !== null && c.display_id !== "") {
      if (displayIdPattern && !displayIdPattern.test(String(c.display_id))) {
        v.push(`DISPLAY_ID_MALFORMED — candidates[${i}].display_id=${JSON.stringify(c.display_id)} does not match ${s.candidate_display_id_pattern}`);
      }
      if (displayIdSeen.has(c.display_id)) {
        v.push(`DISPLAY_ID_DUPLICATE — ${JSON.stringify(c.display_id)} appears twice; the survey record is the ID→slug map (SPEC.md §14.3) and a duplicate makes that map return the wrong Strand`);
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
  // Falsifier 1 (SPEC.md §5.2) — a Journey whose slug matches no Lesson has no
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
    // (SPEC.md §9). Placements authoritative, the stored figure subordinate,
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
    // The coverage half rides the same recompute. SPEC.md §5.2 declares
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

// The family split over a set of placed ids. Under SPEC.md §5 the rows are
// Lessons, so the Journey half is counted from the MARKS the placed Lessons
// carry — Lessons plus marks reconstructs the Strand set exactly (§5.2), which
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

// THE ONE RESOLUTION PATH FROM AN ID TO WHAT AN OWNER READS (§14.3, story 1.53).
//
// No owner surface renders an element name. The rendered token is the
// `display_id` the survey record assigned once, and this function is how every
// surface gets it — the record's candidate entry is the map, so there is no
// per-artifact map for `cotags`, `report`, `claim`, `adopt` or `subdivide` to
// write and no second carrier to drift (AC3).
//
// A MEMBER WITH NO `display_id` IS ABNORMAL, MARKED, AND NEVER SUBSTITUTED
// (AC7). Falling back to the slug would reintroduce exactly the ~40-character
// name this story removes, and it would do it silently — the reading that looks
// most helpful is the one that undoes the change. So the abnormality gets the
// same treatment §9 already gives a missing Gloss rendering
// (`NO_HEADLINE`): a stated token in place of the value, never the value from
// somewhere else. A legacy survey record written before this story renders
// entirely in these tokens, which is the correct reading of it — run
// `terrain survey` again (§12.2 v11: run-workspace artifacts are uncommitted
// and regenerable, so regeneration is the remedy, not a migration).
export const NO_DISPLAY_ID = "⟨no display_id — ABNORMAL, a survey record predating §14.3, never substituted⟩";

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
// the fault ONCE beneath the rows rather than per row — the shape §9's
// `missing` counter already uses at the candidate-row surface.
export function displayIds(ids, candidates) {
  const rendered = (ids || []).map((id) => displayIdOf(id, candidates));
  return { rendered, missing: rendered.filter((r) => r === NO_DISPLAY_ID).length };
}

// The one line every surface prints when `displayIds` reported a shortfall.
// Stated once so the eight call sites cannot drift into eight wordings.
export function displayIdAbnormalLine(missing, total) {
  return `ABNORMAL: ${missing} of ${total} member(s) on this surface carry no display_id. `
    + "The survey record is the ID→slug map (SPEC.md §14.3) and this one predates it — nothing was substituted for the missing IDs. "
    + "Re-run `terrain survey` to regenerate the record (§12.2 v11).";
}

// A SURVEY WITH NO CANDIDATES IS AMBIGUOUS, and the ambiguity is what let
// kogaki#368 live: an empty survey validated, exited zero, and could mean the
// corpus has no Lessons or that the call never reached one. The transport now
// refuses an undeclared key before sending, which removes the cause — but the
// surface still owes the distinction, because the cause is not the only way to
// arrive here. Pure, so it can be fixtured; the caller prints what it returns.
export function surveyEmptinessNote(servedLines, lessonCount) {
  if (lessonCount > 0) return null;
  if (servedLines === 0) {
    return "0 candidates, and THE SEAM SERVED NOTHING AT ALL — this is a "
      + "statement about the call, not about the corpus. A served surface with "
      + "no records is not a corpus with no Lessons.";
  }
  return `0 candidates, from ${servedLines} served record(s) — the seam `
    + "answered and NONE of what it served was a Lesson. This is a statement "
    + "about the corpus.";
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
// the resolve check (draft/cite-check.mjs), not to the producer.
export function composeIdentityCite(slug, kind, pin) {
  const sha = String(pin ?? "").split("@").pop();
  if (!sha) return null;
  return `gloss/ELEMENTS.jsonl slug=${slug} kind=${kind} @${sha}`;
}

// --------------------------------------------------------------------------
// survey — read the seam, compose, validate, write.
// --------------------------------------------------------------------------
function cmdSurvey(args) {
  const dir = runDir(args);
  // `{}`, NOT a kind filter. `element_survey` declares `kind` (SINGULAR) and
  // `tag`; this sent `kinds` and the gateway dropped the undeclared key and
  // returned the miss shape, so the survey composed with ZERO candidates at
  // exit zero and validated (kogaki#368). The families are filtered below
  // anyway, on `rec.kind`, so the server-side filter was never load-bearing.
  // The transport now refuses an undeclared key before sending it.
  const resp = gatewayQuery("element_survey", {});
  // The candidate row is ONE LESSON (SPEC.md §5). Journeys are read into their
  // own list and become a MARK on their Lesson's row; the list stays in the
  // record so count-in remains computable against count-out (§5.2) and so
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
      // The id stays family-qualified: a journey shares its lesson's slug, and
      // the qualification is what kept the two apart when both were rows.
      //
      // `display_id` is minted HERE and nowhere else (§14.3, story 1.53). The
      // survey record IS the ID→slug map, so there is no second carrier to
      // drift from: every owner surface resolves through `displayIdOf` over
      // these candidates.
      //
      // ASSIGNMENT ORDER, and why it is the served corpus's own order (SQ1).
      // §14.3 makes the ID stable within a pin and explicitly permits a pin
      // advance to renumber, but "legal to shuffle" is hostile to an owner
      // holding a printed screen — so the numbering follows the order the
      // substrate SERVES the records in, which is append-stable for the common
      // pin advance (a Lesson added to the end of a shard takes the next
      // number and shuffles nothing). It is not stable against an insertion
      // earlier in the served order, and no assignment can be without a
      // persistent map — which AC3 forbids as the second carrier this story
      // exists to remove. The weaker guarantee is stated rather than implied.
      const cite = composeIdentityCite(rec.slug, rec.kind, resp.pin);
      if (!cite) fail(`cannot compose an identity cite for lesson ${rec.slug} — the survey response carries no resolvable pin (${resp.pin ?? "absent"}); surfaced, not skipped`);
      lessons.push({ id: `lesson:${rec.slug}`, display_id: `L${lessons.length + 1}`, slug: rec.slug, family: "lesson", tags: rec.tags || [], cite, journey: null });
    } else if (rec.kind === "journey") {
      const cite = composeIdentityCite(rec.slug, rec.kind, resp.pin);
      if (!cite) fail(`cannot compose an identity cite for journey ${rec.slug} — the survey response carries no resolvable pin (${resp.pin ?? "absent"}); surfaced, not skipped`);
      journeys.push({ slug: rec.slug, cite });
    }
  }
  const emptiness = surveyEmptinessNote((resp.lines || []).length, lessons.length);
  if (emptiness) console.log(emptiness);
  // The mark reads by ABSENCE: a Lesson with no Journey is decorated, a Lesson
  // with one is not.
  const journeyBySlug = new Map(journeys.map((j) => [j.slug, j]));
  for (const c of lessons) {
    const j = journeyBySlug.get(c.slug);
    if (j) c.journey = { slug: j.slug, cite: j.cite };
  }
  // Compose: one section per served tag (screen 1's axis is the served tag
  // vocabulary, SPEC.md §2.2); multi-tag Lessons place in every section they
  // relate to — completeness is a COVER counted in placements, not a
  // partition (SPEC.md §2.1).
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
  // its family split so no emitted number is bare (SPEC.md §2.1, §9).
  for (const s of sections) s.by_family = familySplit(s.members, lessons);
  const placed = new Set(sections.flatMap((s) => s.members));
  const byFamily = familySplit([...placed], lessons);
  const thin = [...placed].filter((id) => !lessons.find((c) => c.id === id).journey).length;
  const id = `terrain-survey-${Date.now()}`;
  const record = {
    id,
    generated_by: "terrain/terrain.mjs",
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
  const out = join(dir, `${id}.terrain-survey.json`);
  writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
  // Rendering. The figure takes the first line here as a PRESENTATION choice;
  // whether it is contract is carried open at SPEC.md §11 and not decided by
  // this runtime.
  const c = record.completeness;
  console.log(`Completeness: ${denominator(c.placed, c.of)} placed (${strandFigure(c.by_family)}); counted over placements.`);
  console.log(`Journey coverage: ${c.coverage} Lessons carry a Journey — ${c.thin_lessons} thin Lesson(s), the actionable set; the mark reads by absence.`);
  console.log(`Pin: ${record.pin}`);
  console.log(`Survey record: ${out}\n`);
  // THE TAG LISTING IS NOT EMITTED HERE ANY MORE (PR #667 round 1 findings 4
  // and 5). It is the `tag_listing` surface, and `renderTagScreen` is its one
  // emitter, reached through the executor and written under that surface's
  // grammar. While both existed a run emitted the listing TWICE — once from
  // this compute state under no grammar, once from the owner-executed `tags` through the
  // guard — and the two had already diverged, since only the guarded copy
  // carried the amended navigation hint. Two emitters of one surface with one
  // of them unguarded is the defect class kogaki#665 exists to close, arriving
  // one channel over; extracting rather than copying is what criterion 2 asks
  // for. The navigation line went with it: it named `view`, which §15.7
  // removes.
  // The bounded-input pointer, sited at the step BEFORE the one that needs it.
  // A composer reaching for material per group has already spent the reads by
  // the time `cotags` runs, so a pointer only on the co-tag screen would arrive
  // after the cost (kogaki#163 lever 3).
  console.log(`Before composing claims for a tag: compose-input --survey ${out} --tag T — ${COMPOSITION_INPUT_BOUND}. Composing from per-group material instead spends one read per PLACEMENT, which is what the 2026-08-07 architecture run measured at ~19 minutes.`);
  // Returned so the §15 executor can record the survey record BY PATH (§15.3)
  // without re-deriving the name. The record references it and copies nothing
  // out of it — the ID->slug map stays §14.3's single carrier.
  return out;
}

// ---- Figure rendering. Every emitted figure names the families it counted
// (SPEC.md §2.1, §9): `agents (115 — 59 lessons + 56 journeys)`, never
// `agents (115)`. Every screen showing candidate rows states its denominator
// in Lessons (§5). These two helpers are the only place a Terrain figure is
// composed, so a new screen cannot emit a bare count by forgetting to.
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

// A count of Lessons, family-named (SPEC.md §9): the figure names the one
// family §5's candidate model puts on the row.
export function lessonCount(n) {
  return `${n} ${n === 1 ? "Lesson" : "Lessons"}`;
}

// Screen 1's tag row renders a declared ALLOWLIST and nothing else
// (SPEC.md §9, v5, kogaki#147): the tag name, and the tag's Lesson count. A
// line class not on the allowlist does not render — the remedy is the
// constructive form, never a per-column removal, because an enumerated
// prohibition's non-member fallback is admit.
export function tagRow(sec) {
  return `${sec.name} — ${lessonCount((sec.by_family || {}).lesson || 0)}`;
}

// --------------------------------------------------------------------------
// view — navigation. Narrows nothing; the record is never rewritten.
// --------------------------------------------------------------------------
// A tier-2 gloss shard, parsed into slug → { headline, cite }. The headline is
// the SERVED rendering's first sentence, quoted at the cite the seam returned —
// never re-parsed from a file and never composed here (SPEC.md §3, §9).
export function parseGlossShard(resp) {
  const out = new Map();
  const lines = resp.lines || [];
  let slug = null;
  for (const line of lines) {
    const t = line.text;
    if (t.startsWith("## ")) { slug = t.slice(3).trim(); continue; }
    if (!slug) continue;
    if (t.trim() === "" || t.startsWith("Source:") || t.startsWith("---")) continue;
    const sentence = t.match(/^.*?[.!?](?=\s|$)/);
    out.set(slug, { headline: (sentence ? sentence[0] : t).trim(), cite: line.cite });
    slug = null;
  }
  return out;
}

// Tag-scoped and bounded: one shard per viewed tag, addressed `<kind>/<tag>`
// and never `<tag>` alone. No fan-out, no whole-corpus prefetch (SPEC.md §9).
// `stats` IS AN OUT-PARAMETER RATHER THAN A CHANGED RETURN, and that is the
// point: `renderTagRowView` takes this function as an INJECTED fetcher whose
// contract is "returns a Map", and a check asserts the injection is honoured.
// Widening the return would have made the seam-free path's own contract a
// casualty of a fetch accounting change.
//
// TWO COUNTS, BECAUSE AN EMPTY MAP HAS TWO CAUSES (kogaki#689). A shard that
// ANSWERED and carried nothing, and a seam that never answered, both leave the
// map empty — so a caller reading only the map cannot tell "this corpus has no
// rendering for these tags" from "no read happened". `answered` counts the
// responses the seam actually produced, miss responses included: a miss is the
// seam saying there is no such shard, which is a read.
function fetchHeadlines(kind, tags, { soft = false, stats = null } = {}) {
  const out = new Map();
  for (const t of tags) {
    const resp = gatewayQuery("gloss_index", { tag: `${kind}/${t}` }, { soft });
    if (stats) stats.calls += 1;
    if (!resp) continue;
    if (stats) stats.answered += 1;
    if (resp.miss) continue;
    for (const [slug, entry] of parseGlossShard(resp)) if (!out.has(slug)) out.set(slug, entry);
  }
  return out;
}

export const NO_HEADLINE = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";

// THE SECOND MISS STATE, WHICH `NO_HEADLINE` WAS RENDERING AS THE FIRST
// (kogaki#689, PR #693 round 1). `NO_HEADLINE` says a shard was READ and
// carried no rendering for the slug. A row whose shard was never ADDRESSED is a
// different fact, and rendering it as the first asserts a read that did not
// happen — which is the state the ruling's own consulted line refuses, arriving
// one layer in from where the ruling looked:
//
//   "every enumerated class renders including its zero, and an empty class says
//    so rather than being omitted" — the failure named is SILENCE, and silence
//    is indistinguishable from NOT CHECKED.
//   product-lab@b20d85ea topics/archive/knowledge-architecture.md:57
//
// Two ways no shard carries a row, and this marker covers both because both are
// the same fact to a reader: the record carries no tag, so there is no shard
// address to form; or its family is outside every namespace the fetch was given.
// A TAGGED JOURNEY IS NO LONGER ONE OF THEM (kogaki#689): the neighborhood fetch
// addresses `journeys/` as well, so such a row is addressable and its miss is
// read-and-empty like any other addressable row's.
export const NO_SHARD_ADDRESSED = "⟨no Gloss shard carries this row — it carries no tag, or its family is outside the namespaces this path reads; a fault to clear, never substituted⟩";

// THE FOURTH STATE, DISTINGUISHED (kogaki#689, owner selection at the
// /ship-cycle 689 sitting). When the SEAM ITSELF is unreachable no shard is
// read at all, every entry comes back unfound, and a row that WOULD have been
// addressed rendered `NO_HEADLINE` — whose declared meaning is "a shard was
// READ and carried no rendering". That is false of a read that never happened,
// and it is the same conflation the other three markers exist to prevent, one
// layer further out. The shape is this repository's own degradation idiom: a
// seam-absent member reports CANNOT-DETERMINE rather than passing or failing.
export const NO_SEAM = "⟨no Gloss shard was read — the served seam was unreachable for this pull; a fault to clear, never substituted⟩";

// THE NAMESPACES THE NEIGHBORHOOD FETCH ADDRESSES (kogaki#689). `cmdView` reads
// both for the same reason §9 gives, and the neighborhood's members are not all
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

// WHICH FAMILY EACH SHARD NAMESPACE CARRIES. Addressability is derived from the
// namespaces a fetch was ACTUALLY GIVEN rather than from a second hard-coded
// list: `resolveHeadlines` takes its namespace set as a parameter, so a list
// here would let the two drift and would tell a caller resolving with the
// default that a tagged journey's miss was read-and-empty — a read that never
// happened, which is the conflation these markers exist to prevent (PR #711
// round 1).
const NAMESPACE_FAMILY = { lessons: "lesson", journeys: "journey" };
export function familiesFor(namespaces) {
  return (namespaces || []).map((ns) => NAMESPACE_FAMILY[ns]).filter(Boolean);
}

// THE BOUNDED RESOLVER THE BRIEF LANE CALLS (kogaki#528). Terrain is the one
// component that reads served renderings through the seam (§3, §9), so the
// Brief does not become a second substrate reader: it hands over the members
// it has already settled and gets their served prose back.
//
// BOUNDED BY THE MEMBERS, NEVER BY THE CORPUS. The tag set fetched is the
// union of the given members' OWN tags, so a settled set of 2-4 Strands costs
// at most that many shards. This is the same rule §9 already binds `cmdView`
// to — "one shard per viewed tag … no fan-out, no whole-corpus prefetch" —
// applied to a set that is smaller still, and it is why attaching renderings
// to every candidate at survey-generation time was REFUSED: that would fetch
// every tag in the corpus, which is the prefetch §9 names.
//
// AN ABSENCE IS DISCLOSED, NEVER SUBSTITUTED: a member whose shard carries no
// rendering gets NO_HEADLINE, the same abnormal marker `cmdView` renders, so a
// missing rendering reads as a fault to clear rather than as prose.
export function resolveHeadlines(members, { namespaces = ["lessons"] } = {}) {
  const list = Array.isArray(members) ? members : [];
  const tags = [...new Set(list.flatMap((m) => m.tags || []))];
  // THE BOUND IS UNCHANGED BY THE SECOND NAMESPACE. The tag union is still a
  // function of the members handed in, so a namespace is a second shard per tag
  // ALREADY in that union and never a wider tag set — the corpus-wide prefetch
  // §9 forbids stays unreachable from here.
  const stats = { calls: 0, answered: 0 };
  const heads = new Map();
  if (tags.length) {
    for (const ns of namespaces) {
      for (const [slug, e] of fetchHeadlines(ns, tags, { soft: true, stats })) {
        // FIRST NAMESPACE WINS on a slug present in both, which is the same
        // first-wins rule `fetchHeadlines` already applies across tags.
        //
        // STATED AND UNEXERCISED, and said so rather than left to read as
        // covered (PR #711 round 1, out-of-dimension). Slugs are family-scoped
        // in the served corpus, so no served record can reach this branch and
        // no case drives it — a fixture built to reach it would be asserting
        // against material the substrate cannot produce. What the statement
        // buys is that an implementation meeting the case cannot settle it
        // silently; what it does not buy is a check, and a reader counting this
        // as covered would be counting a comment.
        if (!heads.has(slug)) heads.set(slug, e);
      }
    }
  }
  const out = new Map();
  for (const m of list) {
    const e = heads.get(m.slug);
    // `found` SEPARATES A HIT FROM A MISS AT THIS BOUNDARY (kogaki#689, PR #693
    // round 2). Every member got an entry and a miss got `NO_HEADLINE` stamped
    // in, so a caller reading only the entry could not tell a shard that
    // answered from one that did not — the miss was resolved HERE and the
    // caller's own handling of it was dead code it could not detect. The
    // headline field keeps the marker so the disclosure contract this function
    // was built with is unchanged; the flag is added beside it.
    out.set(m.slug, e ? { headline: e.headline, cite: e.cite, found: true }
                      : { headline: NO_HEADLINE, cite: null, found: false });
  }
  // THREE SEAM STATES, REPORTED RATHER THAN INFERRED FROM AN EMPTY MAP.
  // `not-attempted` is not a degraded seam: no row had a tag, so no address
  // could be formed and there was nothing to read. Collapsing it into
  // `unreachable` would blame the seam for a property of the rows.
  const seam = stats.calls === 0 ? "not-attempted"
             : stats.answered > 0 ? "answered"
             : "unreachable";
  // THE NAMESPACE SET TRAVELS WITH THE RESULT, so `glossFor` decides
  // addressability against what was read rather than against a second list.
  return { headlines: out, seam, namespaces };
}

// WHICH MARKER A ROW WITH NO RENDERABLE QUOTATION CARRIES (PR #694 round 1).
// A row reaches here either because nothing was fetched for it or because what
// was fetched carries no cite. The second is a served rendering the row CANNOT
// ADDRESS, and a quotation without its address is the shape the verbatim rule
// refuses — so it renders `NO_HEADLINE`, the read-and-carried-nothing marker,
// which is true of it: a shard answered and what it returned is unusable here.
// The never-carried marker stays reserved for rows no shard reached at all.
function glossMarkerFor(x) {
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

// WHICH OF THE THREE GLOSS STATES A ROW IS IN (kogaki#689, PR #693 round 1).
//
// EXPORTED AND PURE BECAUSE THE INLINE FORM WAS UNASSERTABLE. This decision sat
// inside `cmdReport`'s fetch loop, and the neighborhood cases drive the screen
// directly — so every assertion about the miss markers was exercising the
// EMITTER'S fallback and none was reaching the state assignment. Collapsing the
// two miss states back into one marker changed nothing any case could see, which
// is the shape a mutation-verification cannot detect: an assertion that never
// ran and an assertion that survived are the same silence.
//
// FOUR STATES, FOUR ANSWERS (kogaki#689):
//   * a shard was read and carried a rendering → the headline;
//   * a shard was READ and carried none for the slug → `NO_HEADLINE`;
//   * NO SHARD COULD BE ADDRESSED — the row carries no tag, so no address can
//     be formed, or its family is outside every namespace the fetch was given
//     → `NO_SHARD_ADDRESSED`;
//   * NO SHARD WAS READ AT ALL — the seam itself never answered → `NO_SEAM`.
// Any of the last three rendered as another asserts something that did not
// happen, which is the whole reason they are separate strings.
//
// THE SEAM STATE CANNOT ARISE FROM THE REPORT PATH, and that is declared rather
// than implied. `cmdReport` reads member Gloss bodies through a NON-soft
// `fetchGlossBodies` before the neighborhood's soft fetch runs, so a down seam
// exits and the pull renders nothing. The arm is correct and prospective; its
// reopen trigger is the first Gloss caller on this path that reads SOFTLY.
export function glossFor(sug, headline, seam, namespaces = ["lessons"]) {
  // READ `found`, NEVER TRUTHINESS OF THE ENTRY. `resolveHeadlines` returns an
  // entry for every member it was handed, so `if (headline)` was true on every
  // miss and this function's whole second half was unreachable from the report
  // path — the branch existed, was asserted directly, and could not be reached
  // by the one caller that matters (PR #693 round 2). That is the same silence
  // one call site in from where round 1 looked: a branch that never ran and a
  // branch that ran correctly are indistinguishable from the suite.
  if (headline && headline.found) return headline.headline;
  // ADDRESSABILITY IS A PROPERTY OF THE ROW and is decided first, because a row
  // with no address has nothing to attribute to the seam however the seam
  // behaved. The family set is the one the namespaces above can carry.
  const addressable = ((sug && sug.tags) || []).length > 0
    && sug && familiesFor(namespaces).includes(sug.family);
  if (!addressable) return NO_SHARD_ADDRESSED;
  // THE SEAM ARM SITS BETWEEN THE TWO READ STATES. `unreachable` means no shard
  // answered at all, so `NO_HEADLINE` — which asserts a shard was read — would
  // be false of this row. A caller that passes no `seam` gets the pre-#689
  // behaviour rather than a silent new marker.
  if (seam === "unreachable") return NO_SEAM;
  return NO_HEADLINE;
}

// THE TWO SCREEN RENDERERS, PRIVATE (§15.5, §15.1; kogaki#665). Each RETURNS
// TEXT AND WRITES NOTHING — the write is the executor's, through the one
// private writer, under the calling state's own grammar. Neither is exported
// and neither is dispatchable by name: #625 acceptance item 1 makes an
// out-of-order act unwritable by construction rather than detected after it.
//
// THE SHARD FETCHER IS INJECTED, exactly as `composeInput` already injects its
// own, and that is load-bearing rather than symmetry: it is what makes
// REFUSE-conformance testable without the substrate. A renderer that reached
// the seam directly could only be exercised where the seam is.
function composeScreenText(record, tags, family, fetchShards) {
  const screen = [];
  const say = (s = "") => { for (const line of String(s).split("\n")) screen.push(line); };
  let list = record.candidates;
  if (tags) list = list.filter((c) => tags.some((t) => c.tags.includes(t)));
  // The rows are Lessons; a family filter selects rows whose Strand set
  // includes that family, so `--family journey` is the marked rows.
  if (family === "journey") list = list.filter((c) => c.journey);
  else if (family) list = list.filter((c) => c.family === family);
  list = [...list].sort((a, b) => a.id.localeCompare(b.id));

  // Headlines are fetched only for the tags actually being viewed. Without a
  // tag there is no shard to read, and prefetching the corpus to fill the gap
  // is the fan-out §9 forbids — so the absence is stated instead.
  let heads = new Map();
  let journeyHeads = new Map();
  if (tags) {
    heads = fetchShards("lessons", tags);
    if (list.some((c) => c.journey)) journeyHeads = fetchShards("journeys", tags);
  }
  let missing = 0;
  let missingDisplayId = 0;
  for (const c of list) {
    const mark = c.journey ? "" : "  ○ thin (no Journey)";
    // §14.3 — the row is named by its display_id. The cite stays: it is an
    // address rather than an element name, and it is what makes the row
    // traceable to the served surface.
    const shown = c.display_id || NO_DISPLAY_ID;
    if (!c.display_id) missingDisplayId++;
    say(`  ${shown}  (${c.tags.join(", ") || "no relation"})  ${c.cite}${mark}`);
    if (!tags) continue;
    const h = heads.get(c.slug);
    if (h) say(`      “${h.headline}”  ${h.cite}`);
    else { missing++; say(`      ${NO_HEADLINE}`); }
    if (c.journey) {
      const jh = journeyHeads.get(c.slug);
      say(jh ? `      ↳ Journey: “${jh.headline}”  ${jh.cite}` : `      ↳ Journey: ${NO_HEADLINE}`);
    }
  }
  const split = familySplit(list.map((c) => c.id), record.candidates);
  say(`\n${denominator(list.length, record.candidates.length)} in view (${strandFigure(split)}) — a view, not a narrowing: the survey record is unchanged and every Strand stays selectable (free text reaches all of them at the gate).`);
  if (!tags) {
    say("Gloss headlines are tag-scoped (one shard per viewed tag) — name a --tag to read them. No whole-corpus prefetch is taken to fill this in (SPEC.md §9).");
  } else if (missing) {
    say(`ABNORMAL: ${missing} of ${list.length} rows in view have no served Gloss rendering. This is a fault to clear on the served surface, not a tolerated gap, and nothing was substituted for it (SPEC.md §9).`);
  }
  if (missingDisplayId) say(displayIdAbnormalLine(missingDisplayId, list.length));
  return screen.join("\n");
}

// The PRE-SELECTION listing: the TAG ROWS — a tag name and its Lesson count,
// and nothing else (§9's allowlist, transcribed into the `tag_listing` grammar).
//
// EXTRACTED OUT OF `cmdSurvey`'s STDOUT, where this surface's own grammar
// already named its emitter (`report-format.json` surfaces.tag_listing
// `emitter_today`: "tagRow(), rendered at :506"). The state used to be wired
// to the untagged half of `view` — a CANDIDATE-row listing, a different
// surface — and the wiring was correct-looking because nothing enforced the
// grammar on the write path. The stale `workflow.json` note that directed an
// implementer there is criterion 5's second amendment and is corrected under
// #666, which owns the table.
//
// The completeness, coverage, pin and record lines stay in `cmdSurvey`'s
// stdout: they belong to the `survey` COMPUTE state, which writes no owner
// artifact, and admitting them here would put four line classes into a
// grammar §9 deliberately holds to two.
//
// COMPLETENESS INVENTORY (kogaki#625, carried from PR #667 round 2). An
// extraction criterion measures what must NOT remain, so it is satisfied most
// cheaply by removing behaviour, and checked alone it rewards the loss it
// exists to prevent — the inventory names what must SURVIVE and the test that
// fails if it stops:
//   · the header and one tag_row per section, and NOTHING else
//       → `checks/check-terrain-composition.sh`'s tag_listing grammar case: the
//         surface declares only `header` and `tag_row` under a REFUSE
//         non_member_fallback, so a fourth line class fails at emit time.
//   · ONE emitter for this surface — `cmdSurvey` no longer composes tag rows
//       → the single-construction assertion in the same check, which counts
//         `tagRow(` call sites and fails on a second.
//   · the navigation hint, which is what tells the owner the surface narrows
//     nothing
//       → the same grammar case: `NAVIGATION_HINT` is a declared line class and
//         its removal drops a required class.
// consulted: product-lab@d6fdadd50274cee5ab72730d73c4508b9a53e430 LESSONS.md:36
function renderTagScreen(record) {
  const out = ["The survey — screen 1. Navigation (narrows nothing): name a tag.", ""];
  for (const s of record.sections) out.push(`  ${tagRow(s)}`);
  out.push("");
  out.push(NAVIGATION_HINT);
  return out.join("\n");
}

// The candidate rows under ONE named tag — the conditional half, entered only
// when the owner asks to browse rows and never scheduled by the flow (§6.3,
// kogaki#162's fork half).
//
// COMPLETENESS INVENTORY (kogaki#625, carried from PR #667 round 2). What must
// survive the extraction, and the test that fails if it stops:
//   · candidate rows scoped to the ONE named tag, with their Gloss headlines
//       → `checks/check-terrain-composition.sh`'s injected-fetcher case, which
//         renders this surface with a stub `fetchShards` and asserts the rows
//         carry the served headline.
//   · a MISSING served rendering is MARKED and never substituted (§9)
//       → the same case, whose stub omits one slug and which fails unless the
//         ABNORMAL marker renders in its place.
//   · REFUSE-conformance under the `tag_row_listing` grammar
//       → the same case, which runs the composed text through the guard.
//
// `fetchShards` IS INJECTED FOR THAT CASE, and until kogaki#625 it had no
// injecting caller anywhere in `terrain/` or `checks/` — the affordance existed
// and the test it exists for was not written, which is an extraction criterion
// satisfied by the cheap half. Both call sites still take the default, so the
// seam path is unchanged.
// consulted: product-lab@d6fdadd50274cee5ab72730d73c4508b9a53e430 LESSONS.md:36
export function renderTagRowView(record, tag, family, fetchShards = fetchHeadlines) {
  return composeScreenText(record, [String(tag)], family || null, fetchShards);
}

// --------------------------------------------------------------------------
// cotags — the second navigation step (SPEC.md §6). Selecting a tag displays
// the other tags its members carry, grouped by co-tag with counts.
//
// It is NAVIGATION in the full §2.3 sense — it is that section's `enumerate`
// and `sort` applied to the tags the members already carry on the served
// surface — so it writes NO record of any kind, proposal or otherwise. A
// navigation act wrapped as a proposal is a contract violation from the other
// direction (record-schema.json acts).
//
// Nothing HERE is a member-count threshold, and that is now a statement about
// this function rather than about the runtime. §8's three instruments are three
// quantities, none of them a count of members, and they gate nothing — that is
// unchanged at v30. The threshold the engine DOES carry is
// `SUBDIVISION_REQUIRED_AT`, and it decides only WHETHER a group must split
// (kogaki#683); it is not one of the instruments and none of them became one.
// --------------------------------------------------------------------------
export const NO_SECOND_TAG = "(no second served tag)";
// A group with no composed claim is MARKED, never substituted — the same
// discipline §9 applies to a missing Gloss rendering, at the claim's layer.
export const NO_CLAIM = "⟨no composed GroupClaim — ABNORMAL, a fault to clear, never substituted⟩";

// No per-row pin renders on the screen (§6.1 v5, withdrawing v4's per-row
// pin): the pin is sited ONCE, in the Full Report, whose member records carry
// the member → served-line map. The WA baseline closed group presentation to
// "Group ID, Strand ID, gloss, journey — and nothing else" (wa#1115/#1116).
// The ordering is DECLARED rather than scored: co-tag name ascending, then
// member id ascending. No scoring, no model call in the ordering.
export const COTAG_SORT = "co-tag name ascending, then member id ascending (declared; no scoring, no model call in the ordering)";

export function cotagGroups(members, selectedTag) {
  const byCotag = new Map();
  for (const c of members) {
    const others = (c.tags || []).filter((t) => t !== selectedTag);
    const keys = others.length ? others : [NO_SECOND_TAG];
    for (const k of keys) {
      if (!byCotag.has(k)) byCotag.set(k, []);
      byCotag.get(k).push(c.id);
    }
  }
  // THE GroupID IS MINTED HERE, at the one place groups are composed
  // (§6.1 v6, story 1.56, kogaki#317). `G<n>` over the sorted group list, so
  // the id and `COTAG_SORT` agree by construction rather than by two call
  // sites happening to order the same way.
  //
  // IT CARRIES THE HIERARCHY, which is why it exists. Through v5 the level was
  // carried by indentation, and a claim line that wrapped at the terminal edge
  // resumed at column 0 — so the hierarchy vanished exactly where the text was
  // longest. An id is content: it survives wrapping.
  //
  // SCOPE, stated rather than implied (AC11, owner decision 2026-08-11 on
  // kogaki#317): the id is assigned in sort order and A PIN ADVANCE MAY
  // RENUMBER IT. One new co-tag shifts every group after it. The screen and
  // the report of a single run agree, which is what an owner-entered id set
  // (kogaki#314) consumes; an id copied from a screen printed under an earlier
  // pin does not, and the screen says so. No persistent map is written —
  // that would be the second carrier §14.3's ID→slug rule already refuses.
  return [...byCotag.keys()].sort().map((k, i) => ({
    name: `${selectedTag} × ${k}`,
    cotag: k,
    gid: `G${i + 1}`,
    members: byCotag.get(k).sort(),
  }));
}

// The cover measurement, over a COMPOSED GROUP LIST TREATED AS UNTRUSTED.
//
// This is the repair of a guard that could not fail (PR #123 review). The
// earlier form derived both sides of the comparison from `cotagGroups`'s own
// return value, and `cotagGroups` places every member by construction — so
// `uncovered` was empty for every possible input and the refusal was
// unreachable. A check that cannot fail is not a lenient check; it is theatre,
// and it looks identical to a check that has been switched off
// (`a-dissolved-unit-retires-its-check-never-re-points-it`,
// gloss/lessons/testing.md:29@f918c515). Worse, it is the structurally-incapable
// shape rather than the merely narrow one: no reading of its output bore on the
// question, so a passing audit and a broken composition were the same
// observation (topics/claude-code-ops.md:56@f918c515).
//
// So the two sides are now derived INDEPENDENTLY and the function takes the
// group list as a PARAMETER rather than computing it: `members` is the record's
// own answer to which Strands carry the selected tag, `groups` is whatever the
// composer produced. That gives the guard an input that can make it fail —
// which is the whole of #105's criterion that the count run AFTER composition,
// "because a composer that cannot omit in principle can still omit in fact"
// (topics/articles.md:74@f918c515). The evidence that it fires is
// checks/check-terrain-composition.sh's cotags fixture, which runs both
// directions on every invocation; an unexercised guard's health may be inferred
// only from runs that executed it (`absence-verification-counts-exercised-trials`).
//
// `invented` is the same measurement from the other side: a composer may not
// add a member either, and a cover fraction that ignores its numerator's
// provenance would pass a group list that dropped one member and gained one
// stranger.
export function cotagCover(members, groups) {
  const expected = members.map((c) => c.id);
  const expectedSet = new Set(expected);
  const covered = new Set(groups.flatMap((g) => g.members || []));
  return {
    covered,
    uncovered: expected.filter((id) => !covered.has(id)).sort(),
    invented: [...covered].filter((id) => !expectedSet.has(id)).sort(),
  };
}

function cmdCotags(args) {
  // THE SCREEN IS COMPOSED INTO A BUFFER, NOT PRINTED AS IT GOES (§14.2, story
  // 1.54, AC1). The refusal has to be able to emit NOTHING, and a command that
  // printed its first eight lines and then refused would have put a
  // nonconformant screen in front of the owner — which is the whole condition
  // the refusal exists to prevent. `say` is the only writer below; `fail`
  // still goes to stderr and is not a line of this surface
  // (report-format.json `refusal_text_boundary`).
  const screen = [];
  const say = (s = "") => { for (const line of String(s).split("\n")) screen.push(line); };
  const record = readJson(String(args.survey || fail("cotags needs --survey <file>")));
  const tag = String(args.tag || fail("cotags needs --tag <selected tag>"));
  const members = record.candidates.filter((c) => (c.tags || []).includes(tag));
  if (members.length === 0) fail(`no candidate carries the served tag ${JSON.stringify(tag)} — nothing is hidden here, the tag is simply not in the survey's vocabulary`);
  const groups = cotagGroups(members, tag);

  // Machine-composed connective prose at render time is ADMISSIBLE (§6), and
  // it arrives with the invariants binding HARDER. The composer may attach
  // text to a group and may do nothing else: membership is re-derived here and
  // never taken from the composer, and the cover is counted AFTER composition —
  // because a composer that cannot omit in principle can still omit in fact.
  let prose = {};
  if (args.connective) {
    prose = readJson(String(args.connective));
    for (const k of Object.keys(prose)) {
      if (!groups.some((g) => g.name === k)) {
        fail(`connective prose names ${JSON.stringify(k)}, which is no composed group — prose carries no selection authority and may not invent, merge or rename a group (SPEC.md §6)`);
      }
    }
  }

  // GroupClaim-first rendering, AT the screen, for EVERY group (§6.1, §7's v3
  // rider). v2 composed a claim only under a separate `claim` invocation naming
  // one group, which is why the served screen carried none — the machinery was
  // built and unreached. The composer's prompt, model and wording stay outside
  // this runtime exactly as §7 leaves them, so the claims ARRIVE AS ARGUMENTS;
  // what is bound here is that every group gets one and that a missing one is
  // marked rather than substituted.
  // §11 v10 (kogaki#212): the claims artifact is a TYPED RECORD carrying the
  // composition pin, and the pin is checked by CONTENT before any claim is
  // rendered. `readClaimsRecord` refuses a bare map by name and refuses a pin
  // computed against a different survey.
  const _claimsRaw = args.claims ? readJson(String(args.claims)) : null;
  const { claims, pin: _compPin } = readClaimsRecord(_claimsRaw, record);
  // THE SUBSET REFUSAL, naming what falls outside the bounded read. Composing
  // from the whole survey is what this makes unproducible.
  if (_compPin) {
    const outside = claimsOutsideBound(claims, _compPin, groups);
    if (outside.length) {
      const detail = outside.map((o) => o.members.length
        ? `${o.group}: ${o.members.join(", ")} (${o.reason})`
        : `${o.group} (${o.reason})`).join("; ");
      fail(`--claims were composed OUTSIDE the bounded read: ${detail}. `
        + "Every claim must be composed from the material `compose-input` served, and "
        + "the composition pin records what that was — recompose from it rather than "
        + "from the whole survey (SPEC.md §11 v10)");
    }
  }
  for (const k of Object.keys(claims)) {
    if (!groups.some((g) => g.name === k || g.cotag === k)) {
      fail(`--claims names ${JSON.stringify(k)}, which is no composed group — a claim carries no selection authority and may not invent, merge or rename a group (SPEC.md §6.1)`);
    }
  }
  // SubGroups, where §8's conditions bind (§6.2). WHETHER to subdivide is the
  // ENGINE's at `SUBDIVISION_REQUIRED_AT` members or more (§8 v30, kogaki#683);
  // below it, the judge's coherence label and the two disclosures put SubGroups
  // where they go. Membership assignment is the judge's at every size.
  const subdivisions = args.subdivisions ? readJson(String(args.subdivisions)) : {};
  for (const k of Object.keys(subdivisions)) {
    if (!groups.some((g) => g.name === k || g.cotag === k)) {
      fail(`--subdivisions names ${JSON.stringify(k)}, which is no composed group (SPEC.md §6.2)`);
    }
    // THE SECOND READER OF THE SAME MAP, migrated in the same change
    // (§12.1 v9, kogaki#199 AC6). `cmdReport` and this screen read one input;
    // migrating one and not the other would put two encodings behind one file
    // and rebuild the defect between them — the producer/consumer split where
    // neither side's suite can see the break.
    readSubdivisionEntry(k, subdivisions[k]);
  }
  // The screen REQUIRES the judge pin wherever it serves SubGroups (§6.2), on
  // the same ground `subdivide` refuses without one: a per-invocation judged
  // surface with no judge pin is the drift-undetectable shape, where
  // "recomputed fresh" silently becomes "recomputed by a different judge".
  let judgePin = null;
  if (Object.keys(subdivisions).length) {
    const m = args["judge-model"];
    const e = args["judge-effort"];
    if (!m || !e) fail("--judge-model and --judge-effort are required when the screen serves SubGroups: a judged surface that records no judge cannot be seen to drift (SPEC.md §6.2, §8)");
    judgePin = { model_id: String(m), effort_tier: String(e) };
  }

  const selected = args.group ? String(args.group) : null;
  const shown = selected ? groups.filter((g) => g.name === selected || g.cotag === selected) : groups;
  if (selected && shown.length === 0) fail(`no co-tag group ${JSON.stringify(selected)} in ${tag}`);

  say(`${tag} — the second navigation step. Grouped by co-tag; sort: ${COTAG_SORT}.`);
  let claimless = 0;
  let suppressedSplits = 0;
  for (const g of shown) {
    g.by_family = familySplit(g.members, record.candidates);
    // The served form (SPEC.md §6.1, v5): the heading line carries the
    // GroupID, the Lesson count and the member Lesson IDs; the claim renders
    // beneath. Where SubGroups are served the heading carries the count alone
    // and the IDs live on the SubGroup lines (§6.2). No per-row pin renders on
    // any screen — the pin is sited ONCE, in the Full Report (§6.1 v5's
    // withdrawal of the v4 per-row pin; the WA baseline, wa#1115/#1116).
    const _entry = readSubdivisionEntry(
      g.name, subdivisions[g.name] !== undefined ? subdivisions[g.name] : subdivisions[g.cotag]);
    // The screen's own reader takes the SubGroupClaim list out of the typed
    // record. A judged-empty group has none, which is the conformant state and
    // renders as no SubGroups rather than as a catch-all.
    const subForHeading = _entry ? _entry.subgroups : undefined;
    // Keyed on whether there ARE SubGroupClaims, never on whether the entry
    // exists: `[]` is truthy, and a judged-empty group that hid its members
    // behind the subdivided heading would drop the whole membership from the
    // screen — the same trap the report's `members` field carried.
    // §14.3 — group members render as display_ids, never as `lesson:<slug>`.
    const gShown = displayIds(g.members, record.candidates);
    // The claim is read BEFORE the heading now, because `judgeSubgroup` needs
    // it and the judgement decides which heading form the group gets (§6.2 v7).
    const claim = claims[g.name] !== undefined ? claims[g.name] : claims[g.cotag];

    // THE SUBDIVISION IS JUDGED BEFORE ANYTHING IS EMITTED (§6.2 v7, kogaki#316
    // decision 3, re-keyed at v30 and relabelled at kogaki#738). A split whose
    // only named SubGroup is labelled `other` — the judge found no coherent
    // subset among its members, so the split bought nothing — "does not
    // discharge the subdivision obligation"
    // — and that means
    // the group renders NO SubGroups, which is the fallback §6.2 already names
    // ("renders no SubGroups and is fully conformant"). It is NOT a refusal: a
    // judge's verdict must not be fatal to the surface, and refusing here would
    // contradict that conformance clause. BOUNDED BELOW THE THRESHOLD at v30
    // (kogaki#683): at `SUBDIVISION_REQUIRED_AT` members or more the fallback
    // is exactly the outcome §8 refuses, so it yields and the group renders.
    //
    // It has to happen here rather than at the render loop below, because the
    // heading form itself differs — a group serving SubGroups carries the count
    // alone, a flat one carries its member ids — so the decision must precede
    // the heading it changes.
    let judged = null;
    if (subForHeading && subForHeading.length) {
      const { subgroups } = subgroupPlacement(g, subForHeading, SURVEY_SCHEMA.subdivision);
      // THE SUM-TO-PARENT REFUSAL, PRE-RENDER (§6.2 rule 1; report-format.json
      // v13, kogaki#684). Through v12 this was a decidable rule over the
      // rendered text — the SubGroup counts against the parent count on the
      // group heading — and disposition 2 removed the heading's count, so one
      // side of that comparison is gone. It is carried here instead of being
      // re-pointed at the sum of the SubGroup counts, which would compare the
      // sum to itself and could never fail.
      //
      // WHAT THIS DOES NOT REPLACE, stated because the two are not equivalent:
      // it reads the PLACEMENT and the withdrawn rule read the TEXT, and
      // §14.2's own specimen is a renderer that dropped four of six member
      // fields while every assertion about the data structure stayed green. A
      // renderer that omits a whole SubGroup line still passes this. The
      // grammar's `not_expressible` entry records that gap as a gap.
      //
      // WHICH DIRECTION IT CAN ACTUALLY FIRE IN, stated so the refusal is not
      // read as covering more than it does — AND BOTH DIRECTIONS ARE NOW LIVE
      // (kogaki#738). This read "UNDER-placement is unreachable from here:
      // `subgroupPlacement` sweeps every unplaced member into the catch-all, so
      // the sum can never fall short", which was true of the sweep and false the
      // moment it was deleted. Under-placement is now refused one function
      // earlier, by SUBDIVISION_COVER_INCOMPLETE, naming the members it left —
      // so this refusal never sees it, which is a different fact from it being
      // unreachable. What it catches is DOUBLE placement — a judge record naming
      // one member in two SubGroups, which makes the counts sum OVER the parent
      // and renders that member twice. The withdrawn grammar rule caught both;
      // between this and the cover refusal, both are caught again.
      const placedCount = subgroups.reduce((n, sg) => n + sg.members.length, 0);
      if (placedCount !== g.members.length) {
        fail(`SUBGROUP_MEMBERS_DO_NOT_SUM — ${g.name} holds ${g.members.length} member Lesson(s) and its SubGroups place ${placedCount}. `
          + "§6.2 rule 1 requires the SubGroup member counts to sum to the parent's total: over the total means a member was placed "
          + "in more than one SubGroup and renders twice, under it means a member is hidden. Subdivision decides WHERE a member "
          + "appears, never how many times "
          + "(SPEC.md §6.2; report-format.json v13 carries this as a pre-render refusal, the heading no longer rendering a parent count).");
      }
      for (const sg of subgroups) {
        sg.by_family = familySplit(sg.members, record.candidates);
        judgeSubgroup(sg, claim, g.members.length);
      }
      // "Only named SubGroup" is the decision's own wording, and since
      // kogaki#738 EVERY SubGroup is named by the judge — the catch-all this
      // filter excluded is deleted, so the filter is gone rather than left
      // testing a name nothing composes. The literal singular case is still what
      // is implemented; a wider reading — no named SubGroup is tighter — would
      // be this lane deciding more than kogaki#316 did.
      const named = subgroups;
      // §6.2 v7 RULE 3, RE-KEYED ON THE LABEL AND BOUNDED BY THE THRESHOLD
      // retired-vocab-ok: provenance, past tense.
      // (kogaki#683, re-keyed again at kogaki#738). The suppression tested
      // `tighter_than_parent !== true`, which no longer exists; then `forced`,
      // which named the engine's compulsion; now `other`, which names the
      // judge's finding. What it keys on is the OUTCOME — one SubGroup that
      // discriminates nothing — and that outcome is unchanged by the relabel.
      //
      // AND IT CANNOT FIRE AT OR ABOVE THE THRESHOLD, which is the collision
      // this issue's own dispositions create and nothing else resolves. Rule 3
      // says such a group "renders no SubGroups"; disposition 1 says a group of
      // 10 or more that renders judged-empty is refused at render. For a ≥10
      // group the two rules point opposite ways, so the suppression yields:
      // the group RENDERS its split, labelled `other`, which is the honest
      // outcome. Below the threshold rule 3 is untouched.
      const bought = named.length === 1 && named[0].verdicts
        && named[0].verdicts.coherence === "other";
      const boughtNothing = bought && g.members.length < SUBDIVISION_REQUIRED_AT;
      judged = boughtNothing ? null : subgroups;
      if (boughtNothing) suppressedSplits++;
    }

    // §6.1 v6 — FLUSH LEFT, and the GroupID is what says this is a Group.
    // The co-tag name follows the id; it is a label, not the carrier.
    //
    // A BLANK LINE OPENS EVERY GROUP BLOCK (§6.2 v31, kogaki#684 disposition 1).
    // It is emitted here rather than trailing the previous block so that the
    // first group is separated from the header by the same act as every other
    // group is separated from its predecessor — a trailing newline on one
    // emitter and a leading one on another is how the pre-v31 screen ended up
    // spacing subdivided groups and running flat ones together.
    say("");
    // §6.2 — A SUBDIVIDED GROUP'S HEADING CARRIES THE PARENT'S LESSON COUNT
    // AGAIN (kogaki#739, owner ruling 2026-09-01; report-format.json v15).
    //
    // WHAT THE MEMBER DUMP TOOK WITH IT AND WHAT IT DID NOT. v31 removed the
    // whole tail on the ground that the members render on the SubGroup lines
    // and are read there — true of the MEMBERS, false of the PARENT TOTAL.
    // No line then carried it, which is why `subgroup_members_sum_to_parent`
    // had to leave `expressible`: one side of its comparison was gone.
    //
    // ONLY THE COUNT RETURNS, not the member list. The two heading classes
    // therefore differ by exactly the `: <ids>` tail, and the count sits in
    // the same position on both, family-named per §9 — a subdivided screen and
    // a flat one are read left to right the same way.
    say(judged
      ? `${g.gid} — ${g.name} — ${lessonCount(g.members.length)}`
      : `${g.gid} — ${g.name} — ${lessonCount(g.members.length)}: ${gShown.rendered.join(", ")}`);
    if (!judged && gShown.missing) {
      say(displayIdAbnormalLine(gShown.missing, g.members.length));
    }

    // The GroupClaim FIRST, then the members (§6.1) — for EVERY group,
    // subdivided ones included (§6.2 v31: the ruling's example block omits it
    // and is a spacing sketch; §6.1 and §7 require it, and removing it would
    // make what reaches the owner smaller than what exists).
    //
    // THE PINNING LINE IS DELETED (§6.2 v31, kogaki#684 disposition 4). §7's
    // pinning RULE is untouched — what is gone is the sentence printed under
    // every claim, which duplicated the heading's member count and announced a
    // protection enforced at the claim re-offer, where it explains itself when
    // it fires. Deleted rather than annotated: a superseded behaviour kept as a
    // record in an operative carrier is what regenerates it, and kogaki#684 is
    // the record.
    if (claim !== undefined && String(claim).trim() !== "") {
      say(`in common: ${claim}`);
    } else {
      claimless++;
      say(`in common: ${NO_CLAIM}`);
    }
    // The `> ` marker is what keeps composer prose DECIDABLE (§6.1 v6, AC9).
    // Flush left, `<composer prose>` would match every line and take
    // `line_class_allowlist` inert on this surface — which is exactly what the
    // first cut of this change did. The marker carries no level, so it does
    // not re-introduce the defect the flush-left move removed.
    if (prose[g.name]) say(`> ${prose[g.name]}`);

    // The member Lesson IDs, for EVERY group and WITHOUT --group being named.
    // This is kogaki#128's specific defect: v2 emitted them only under
    // `selected`, so the served screen showed counts and no ids, and no image
    // of a possible Thesis could form. Naming a group narrows what is PRINTED
    // and never what is counted — the cover below is unchanged by it.
    // A judged-empty group renders NO SubGroups. Calling subgroupPlacement on
    // an empty list would sweep every member into `no_member_hidden_subgroup`
    // and manufacture a SubGroup the judgment did not make.
    // Placement and judgement already ran above; this loop only renders.
    if (judged) {
      const subgroups = judged;
      let sgIdx = 0;
      for (const sg of subgroups) {
        // The served SubGroup form (§6.2, v5): one line — SubGroupID, Lesson
        // count, Lesson IDs — then the SubGroupClaim, then the coherence
        // verdict and any disclosures.
        // §14.3 — SubGroup members render as display_ids, never as
        // `lesson:<slug>` tokens.
        const sgShown = displayIds(sg.members, record.candidates);
        // §6.2 v6 — `G<n>-<m>` NAMES ITS PARENT, so a SubGroup line met on its
        // own (wrapped, or scrolled away from its group) still says where it
        // belongs. Flush left; the parenthesised count form is gone with the
        // indentation, since two punctuations for one shape meant nothing once
        // the level moved into the id.
        sg.sgid = `${g.gid}-${sgIdx += 1}`;
        say(`\n${sg.sgid} — ${lessonCount(sg.members.length)}: ${sgShown.rendered.join(", ")} — ${sg.name}`);
        if (sgShown.missing) say(displayIdAbnormalLine(sgShown.missing, sg.members.length));
        say(`in common: ${sg.claim || NO_CLAIM}`);
        say(sg.coherence_line);
        for (const d of sg.disclosures) say(`DISCLOSURE — ${d}`);
      }
      say(`\njudged by ${judgePin.model_id} / ${judgePin.effort_tier} (§6.2 — a judged surface with no judge pin is the drift-undetectable shape)`);
    }
  }
  // A SUPPRESSED SPLIT IS DISCLOSED, never silent (§2.1; the `claimless`
  // aggregate one block down is the shape this follows). §6.2 v7 makes the
  // group render flat and fully conformant, but a judgment DID run and DID
  // produce a split, and it bought nothing — an owner who sees a flat group
  // cannot otherwise tell that from a group nobody judged. Aggregate rather
  // than per-group, because a per-group line is what AC5 removes.
  if (suppressedSplits) {
    say(`\n${suppressedSplits} of ${shown.length} group(s) under ${SUBDIVISION_REQUIRED_AT} members render flat because their only named SubGroup was labelled \`other\` — the residual, so the judge found no subset of ${subdivisionLimits().min} or more members at loose-or-better affinity among them and the split bought nothing and does not discharge the subdivision obligation (SPEC.md §6.2 v7, kogaki#316; re-keyed and bounded at kogaki#683). The groups are fully conformant; nothing was hidden and no member was dropped. At or above ${SUBDIVISION_REQUIRED_AT} members this path is unavailable: the group renders its split, labelled honestly.`);
  }
  if (claimless) {
    say(`\nABNORMAL: ${claimless} of ${shown.length} group(s) on this screen carry no composed GroupClaim. §6.1 serves the claim FIRST and a screen without one cannot show what its members share — this is a fault to clear in composition, and nothing was substituted for it.`);
    // The remedy names the BOUNDED input rather than "go compose something":
    // the fault above is cleared by composing, and the way composing was
    // costing ~19 minutes was per-group reads (kogaki#163 lever 3).
    say(`Compose them from the bounded input — compose-input --survey ${String(args.survey)} --tag ${tag} — and pass the result back as --claims (and --subdivisions, which §8's judgment is composed from the SAME artifact and spends no further read).`);
  }

  // The cover, counted AFTER composition, over ALL composed groups — never
  // over `shown`. Selecting a group narrows what is PRINTED and narrows
  // nothing about what is counted, which is why `--group` cannot shrink the
  // denominator or the numerator of the figure below.
  const { covered, uncovered, invented } = cotagCover(members, groups);
  if (uncovered.length) {
    fail(`COTAG_COVER_INCOMPLETE — ${uncovered.length} member(s) of ${tag} appear in no co-tag group: ${uncovered.join(", ")}. Every member appears in at least one group and members carrying no second tag appear in the explicit ${JSON.stringify(NO_SECOND_TAG)} group rather than being dropped (SPEC.md §2.1, §6).`);
  }
  if (invented.length) {
    fail(`COTAG_COVER_INVENTED — ${invented.length} id(s) appear in a co-tag group without carrying ${JSON.stringify(tag)}: ${invented.join(", ")}. Composition may group the members and may not add one; a cover counted without checking its numerator's provenance would pass a group list that dropped a member and gained a stranger (SPEC.md §2.1, §6).`);
  }
  const split = familySplit(members.map((c) => c.id), record.candidates);
  say(`\nCover: ${covered.size} of ${members.length} member Lessons appear in at least one co-tag group — counted AFTER composition, over placements. Selected tag: ${strandFigure(split)}; ${denominator(members.length, record.candidates.length)}.`);
  say(`Classification: NAVIGATION (SPEC.md §2.3 — enumerate + sort over tags the members already carry on the served surface). No proposal record is written, and no record of any kind.`);
  say(`Narrows nothing: the survey record is unchanged, the full candidate set stays reachable, and free text still reaches every Strand at the gate.`);
  if (!selected) say(`\nSelect a group (still narrowing nothing): cotags --survey <F> --tag ${tag} --group "<co-tag>"`);

  // THE REFUSAL, over the STRING that is about to be emitted (AC1, AC3). Not
  // over `groups`, not over `record` — the recorded specimen is a renderer that
  // dropped four of six member fields while every assertion about the data
  // structure stayed green.
  // The refusal still gates the WRITE as well as the print — `emitOrRefuse`
  // validates before its callback runs, so a nonconformant screen reaches
  // neither the owner's terminal nor their artifact (§14.2, story 1.54 AC1).
  // THROUGH THE ONE PRIVATE WRITER, like the two screen states beside it
  // (PR #667 round 1 finding 3). This was a SECOND path to the same artifact —
  // its own `emitOrRefuse` plus a direct `writeScreen` — which left
  // `writeScreenSurface` one of two rather than the one criterion 1 names, and
  // left the `writers_per_artifact` drop resting on a "no second path" ground
  // the tree did not hold. The refusal still gates the write, because that is
  // what `writeScreenSurface` does — AND the print, which now happens inside
  // that writer's refusal callback rather than here (PR #667 round 2). Hoisting
  // it above the writer is what made `cmdCotags` emit before it validated,
  // which at the base it did not.
  const text = screen.join("\n");
  const path = writeScreenSurface(args, "cotag_screen", text);
  announceScreen(path);
  // Returned for the §15 executor's artifacts_written ledger (story 1.89 AC7).
  return path;
}

// The one emit path for both covered surfaces. It exists so the two callers
// cannot drift in WHEN they validate — the defect `announceArtifacts` was
// written to fix, one layer up: two branches carrying the same contract is one
// a later fix updates half of.
//
// The write is a CALLBACK, and that is load-bearing rather than tidy: it is
// what makes "validate before the artifact exists" structural instead of a
// convention a future edit can reorder. There is no path here that emits
// first.
function emitOrRefuse(surfaceName, text, write) {
  try {
    refuseUnlessConformant(surfaceName, text, loadGrammar(REPORT_FORMAT));
  } catch (e) {
    if (e instanceof FormatRefusal) fail(e.message);
    throw e;
  }
  write(text);
  return text;
}

// THE OWNER-EXECUTED LISTING'S EMIT PATH (SPEC-terrain §6.0 v29, kogaki#682,
// owner selection 2026-08-29).
//
// The pre-selection tag listing and the per-tag row view are NOT Screens: the
// owner ruling of 2026-08-28 defines a Screen as the rendering written AFTER a
// tag has been selected, and neither of these is. They therefore write no owner
// artifact at all — `reports/Screen.md` has exactly one writing state,
// `cotag_screen` — and they reach the owner by a channel the harness actually
// displays: THE OWNER RUNS THEM.
//
// WHY NOT STDOUT FROM A SESSION-DRIVEN ACT, which is what this looks like:
//
//   "In the Claude Code harness a tool call's stdout is displayed to the MODEL,
//   not reliably to the OWNER … every conformant behavior renders nothing, and
//   the observed false claim ('the screen is above') is what an agent produces
//   when instructed to deliver through a channel that does not display."
//   consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/claude-code-ops.md:69
//
// That finding is about WHO INVOKED the tool. A session's tool call prints to
// the session; an act the owner types prints to the owner. So the channel is
// not "stdout" in the abstract — it is the owner's own terminal, which is the
// one arm of kogaki#682's disposition 3 that answers the finding structurally
// rather than hoping.
//
// THE GRAMMAR GUARD IS KEPT, and that is the point of routing through here
// rather than calling `console.log`. §14.2's refusal is about what may be
// EMITTED, never about what may be written, so a surface that writes no
// artifact owes it exactly as much: one printer, one refusal, and a
// nonconformant listing reaches neither the owner's terminal nor anything else.
function emitOwnerListing(surfaceName, text) {
  emitOrRefuse(surfaceName, text, (conformant) => console.log(conformant));
}

// --------------------------------------------------------------------------
// claim / adopt — GroupClaim-first rendering, and claim pinning (SPEC.md §7).
//
// A claim composed over a member set is PINNED to that set: the record carries
// the member IDS and their pins, not only the claim text, because a derived
// expression's truth is relative to the set it was derived from. A subset
// selection therefore RECOMPOSES the claim and RE-OFFERS it as a GATE EVENT —
// never a silent refresh and never carried over unchanged. Keeping a group
// claim over a changed subset asserts commonality over absent members (a
// provenance lie); discarding it throws away the only thing in the interaction
// the machine did not supply.
//
// The composer's prompt, model and wording are implementation and are NOT
// specified by §7 — so the text arrives as an argument. What is bound here is
// the pinning, the gate event and the record's shape.
//
// The re-offer routes through the gate carrier (manifest item 4), never
// through an affordance of Terrain's own: §1's refusal and §4's out-of-scope
// decision are unchanged. The sentence that stood here named `claim` and `gate`
// as the two commands emitting this declaration, and both are removed
// (kogaki#625 item 1) — the declaration is composed by the executor at the wait
// that owes it, and adoption is that wait's captured answer. What the removal
// did NOT change is which surface renders it: AskUserQuestion, the gate
// carrier, as it always was.
// --------------------------------------------------------------------------
const CLAIM_GATE = "terrain-claim-reoffer";

function memberPins(ids, candidates) {
  return ids.map((id) => {
    const c = candidates.find((x) => x.id === id);
    if (!c) fail(`member ${JSON.stringify(id)} is no candidate in this survey — a claim cannot be pinned to a member the survey does not carry`);
    return { id, cite: c.cite };
  });
}

function validateClaimRecord(rec, block) {
  const v = [];
  for (const f of block.required) {
    if (rec[f] === undefined || rec[f] === null || rec[f] === "") v.push(`CLAIM_MISSING_FIELD — ${f}`);
  }
  if (rec.kind !== block.kind_must_be) v.push(`CLAIM_KIND_UNKNOWN — kind=${JSON.stringify(rec.kind)}, expected ${block.kind_must_be}`);
  if (Array.isArray(rec.members) && rec.members.length === 0) v.push("CLAIM_UNPINNED — a claim with no member set is not pinned to anything");
  const pins = rec.member_pins || [];
  if (Array.isArray(rec.members) && pins.length !== rec.members.length) {
    v.push(`CLAIM_UNPINNED — ${rec.members.length} member(s) but ${pins.length} pin(s): the record carries the member ids AND their pins, never the text alone`);
  }
  for (const p of pins) {
    for (const f of block.member_pin_required) {
      if (!p || p[f] === undefined || p[f] === "") v.push(`CLAIM_UNPINNED — member_pins entry missing ${f}`);
    }
  }
  for (const k of block.narrowing_keys_forbidden || []) {
    if (Object.prototype.hasOwnProperty.call(rec, k)) v.push(`NAVIGATION_STATE_NARROWS — claim record carries ${JSON.stringify(k)}: ${block.narrowing_rationale}`);
  }
  for (const k of block.group_id_keys_forbidden || []) {
    if (Object.prototype.hasOwnProperty.call(rec, k)) v.push(`CLAIM_RECORDED_BY_GROUP_ID — ${JSON.stringify(k)}: ${block.group_id_rationale}`);
  }
  if (block.composed_over_must_be && rec.composed_over !== block.composed_over_must_be) {
    v.push(`CLAIM_NOT_OVER_MEMBERS — composed_over=${JSON.stringify(rec.composed_over)}: ${block.composed_over_rationale}`);
  }
  if (block.adopted_must_be !== undefined && rec.adopted !== block.adopted_must_be) {
    v.push(`CLAIM_ADOPTED_WITHOUT_GATE — ${block.adopted_rationale}`);
  }
  if (block.claim_sources && !block.claim_sources.includes(rec.claim_source)) {
    v.push(`CLAIM_SOURCE_UNKNOWN — claim_source=${JSON.stringify(rec.claim_source)}; the sources are ${block.claim_sources.join("|")}`);
  }
  return v;
}

// THE RE-OFFER, reachable only from `CLAIM_REOFFER` (§15.6.1, kogaki#625
// item 1). `claim` and `adopt` ceased to be entry points, and the three halves
// they welded together split by owner: COMPOSING the claims record is the
// outside composer's (§15.6), VALIDATING it is `J1_claims`', and the GATE EVENT
// §7 rules a subset selection is this state's. Adoption is applying the
// captured answer, which the executor records at this same wait — so no
// separate `adopt` act remains to be performed out of order.
//
// The subset check is kept here rather than inherited: §7 pins a claim to the
// member set it was composed over, and a re-offer over members that were never
// in the group is not a recomposition of anything.
export function composeClaimReoffer(args, dir, record) {
  const tag = String(args.tag || fail("CLAIM_REOFFER needs --tag <selected tag>"));
  const groupArg = String(args.group || fail("CLAIM_REOFFER needs --group <co-tag>: the group whose claim is re-offered"));
  const text = String(args.text || fail("--text is required: the RECOMPOSED \"in common:\" line. §7 binds the pinning, the gate event and the declaration's shape — the composer's prompt, model and wording are not specified here and are not invented here."));
  const groups = cotagGroups(record.candidates.filter((c) => (c.tags || []).includes(tag)), tag);
  const group = groups.find((g) => g.name === groupArg || g.cotag === groupArg) || fail(`no co-tag group ${JSON.stringify(groupArg)} in ${tag}`);
  const subset = args.members ? String(args.members).split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (!subset) fail("CLAIM_REOFFER needs --members a,b,c — the SUBSET the claim is recomposed over. A full-group claim reaches no gate: §7 makes that rendering per-invocation and not an adopted claim, so there is nothing to re-offer.");
  const stray = subset.filter((id) => !group.members.includes(id));
  if (stray.length) fail(`--members names ${stray.join(", ")}, which are not members of ${group.name} — a subset is a subset of the set the claim was pinned to`);
  if (subset.length === group.members.length) {
    fail(`--members names all ${group.members.length} member(s) of ${group.name}, which is not a subset. This state's own \`conditional\` says so: it is entered ONLY on a PROPER subset.`);
  }
  const members = subset;
  const original = args.original ? readJson(String(args.original)) : null;
  const originText = args["original-text"] ? String(args["original-text"]) : null;
  const originMembers = args["original-members"]
    ? String(args["original-members"]).split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  let originBlock;
  if (original) {
    originBlock = { original_claim: original.claim, original_members: original.members,
                    original_members_provenance: "recorded",
                    original_source: "claim-record" };
  } else if (originText) {
    // The member set may be DERIVED from the group the claim was composed over
    // — §6.1 composes a GroupClaim over a group's WHOLE member set, so those
    // members genuinely are a screen-composed origin's. What §7 forbids is the
    // substitution being SILENT: a derived set and a recorded one are otherwise
    // indistinguishable at the gate, and the owner comparing a recomposed claim
    // against its origin cannot see which they hold. So the fallback announces
    // itself at the point of substitution, which is the only place the evidence
    // still exists, and `derived` is a WRITTEN value rather than an omission.
    const derived = !originMembers;
    originBlock = { original_claim: originText,
                    original_members: originMembers || group.members,
                    original_members_provenance: derived ? "derived" : "recorded",
                    original_source: derived
                      ? "screen-composed (wording passed as an argument; MEMBER SET DERIVED from the group it was composed over, not recorded — SPEC.md §7)"
                      : "screen-composed (passed as an argument; the screen writes no record — SPEC.md §7)" };
  } else {
    // An absent origin is STATED, never fabricated (§7 v4 rider). A gate that
    // silently omitted it would present a recomposed wording as if it had one.
    originBlock = { original_claim: null, original_members: null,
                    original_members_provenance: "none",
                    original_source: "NONE — this is the first composition over this set; no original exists and none is invented (SPEC.md §7)" };
  }
  return {
    options: [{ id: `adopt-recomposed:${group.name}`, label: `Adopt the recomposed wording over these ${members.length} member(s): ${text}` }],
    extra: { ...originBlock, recomposed_claim: text, recomposed_members: members, recomposed_over_subset: true },
  };
}

// The one place a run declaration is composed. Its callers are `GATE_WORK`'s
// option composers, reached from the executor at the wait that owes the
// declaration; `gate` and the standalone claim re-offer, which this comment
// used to name as its two callers, are both removed (kogaki#625 item 1). The
// re-offer still routes through manifest item 4's carrier and never through an
// affordance of Terrain's own (SPEC.md §7, §4) — what changed is that nothing
// outside a run can reach this composer at all.
export function emitGateDeclaration(dir, gateId, dynamicOptions, extra = {}) {
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  if (!registered) fail(`${gateId} is not declared in gates/registry.json — an unregistered gate is the uncovered-by-default shape`);
  const seen = new Set(dynamicOptions.map((o) => o.id));
  const declaration = {
    ...registered,
    ...extra,
    options: [...dynamicOptions, ...registered.options.filter((o) => !seen.has(o.id))],
    declared_at: new Date().toISOString(),
    run_declaration: true,
  };
  delete declaration.dynamic_options;
  const out = join(dir, `${gateId}.run-declaration.json`);
  writeFileSync(out, JSON.stringify(declaration, null, 2) + "\n");
  return out;
}
// `adopt` ceased to be an entry point (kogaki#625 item 1). §15.6.1 rules
// adoption the OWNER's act rather than a judgment, and the executor records it
// as the captured answer at `CLAIM_REOFFER` — the wait that offered it. The
// refusal the retired command carried ("a recomposed claim that was never
// offered cannot be adopted") is now structural: there is no capture without a
// declaration, and no declaration without the state.

// --------------------------------------------------------------------------
// subdivide — semantic subdivision as a judged substrate one level down
// (SPEC.md §8), DOGFOOD-FIRST.
//
// Placement plus title-derivation, hiding none: a cap decides WHICH members
// appear, subdivision decides WHERE each appears and hides none. It is
// therefore inside the presentation-only invariant and is NOT the refused
// within-axis cap.
//
// NOT OFFERED BY DEFAULT. Co-tags stay the default for a run naming no
// substrate, and this path is reachable only by naming it. Running it, and
// merging it, ARRIVES at §8.1's offering gate rather than discharging it.
//
// WHICH MODEL judges is a per-invocation PINNED FACT and not a decision this
// code makes: the judge pin (model id + effort tier) is ADOPTED for
// per-invocation judged surfaces and names terrain screens, claims and
// groupings among them, with the judge-migration tripwire as its complement —
// the pin makes a judge change observable, the tripwire makes it
// consequential. So the classification and its verdicts arrive as input and
// the record pins the judge that produced them. Terrain names no model.
//
// THE SPLIT DECISION CARRIES A CONSTANT AND THE JUDGMENT DOES NOT (§8 v30,
// kogaki#683). `SUBDIVISION_REQUIRED_AT` decides WHETHER a group must serve
// SubGroups; it stands in for no verdict. What the judge supplies is the
// COHERENCE LABEL — one of a closed three, with one sentence of why — and no
// number is compared against it. The three instruments remain REPORTED
// quantities gating nothing, and the screen budget still arrives per run.
//
// The prohibition this comment used to state — no numeric constant anywhere in
// split-or-stop logic — was reversed by the owner on 2026-08-28 on a specimen
// it permitted. It is quoted at §8 as provenance and is not the rule here.
// --------------------------------------------------------------------------
// The SubGroup's own two rendered lines — its name and its claim. Rendering
// arithmetic for the screen-budget instrument; it gates nothing and is not
// stop logic.
const LINES_PER_SUBGROUP_HEADER = 2;

// The PLACEMENT half of subdivision, extracted so the co-tag screen (§6.2) and
// `subdivide` (§8) share ONE composer rather than each carrying its own.
//
// It is this half — not the instruments and not the coherence verdicts — that owns
// the guarantee subdivision hides none: a member the judge invented is refused,
// and a member the judge left unplaced lands in the EXPLICIT named SubGroup
// rather than being dropped. Two copies of that would be two places for the
// cover to be wrong, and the second copy is the one nobody re-reads.
// THE SPLIT DECISION IS THE ENGINE'S (SPEC-terrain §8 v30, kogaki#683, owner
// ruling 2026-08-28 with the disposition-1 boundary confirmed at pickup
// 2026-08-29).
//
// A NUMBER IN SPLIT-OR-STOP LOGIC WAS A DEFECT AND IS NOW THE RULE. §8 carried
// "Terrain implements no member-count threshold. A number appearing in its code
// as one is a defect against this paragraph", and kogaki#316 withdrew a numeric
// trigger on 2026-08-09. The owner REVERSES their own recorded withdrawal,
// dated 2026-08-28, on a specimen the old contract permitted: G1 (agents ×
// architecture) served 40 members flat, judged-empty, violating nothing.
//
// THE BOUNDARY IS AT TEN, AND ITS DERIVATION OUTLIVED ITS INPUT (kogaki#738).
// This read: "the catch-all cap leaves 30% of the parent, and 30% of 10 is 3
// Strands — the minimum article — so the requirement works AT 10". That cap is
// deleted with the sweep, so the calculation has no second term. The number is
// unchanged — it is an owner ruling in its own right — and now stands on that
// ruling rather than on arithmetic whose input is gone.
export const SUBDIVISION_REQUIRED_AT = 10;

// THE COHERENCE LABEL, closed at three (kogaki#683 disposition 5, vocabulary
// confirmed as filed at pickup). Ordered by decreasing coherence.
//
// THE SET IS THREE AFFINITY LABELS PLUS A RESIDUAL (kogaki#738, owner rulings
// 2026-09-01 and owner amendments 1 and 2 the same day). It was `tight | related
// | forced`, where `forced` — "grouped to satisfy the split requirement" — named
// a fact about the ENGINE: the threshold compelled a split that bought nothing.
// The tell is right below — the placement used to STAMP `forced` on a bucket it
// composed itself, which is a label with no judgment behind it.
//
// `loose` is the third AFFINITY label, below `related`. `other` is the RESIDUAL
// and is a different kind of thing: it holds what the judge could place nowhere,
// it carries no affinity claim, and it is bounded by its own limit rather than by
// a per-label cap. Keeping them in one closed set is what the runtime validates
// against; keeping them DISTINCT is why `RESIDUAL_LABEL` is named separately and
// why `limits.subgroup_member_cap` has no `other` row.
//
// `other` IS NOT UNLIMITED, and that reverses this issue's own body. The body
// ruled it unbounded, "safe only because it is judged"; owner amendment 1 ruled
// that `other` = unlimited is an ANTI-PATTERN, because what actually went wrong
// was member counts implicitly assumed and never enforced. A judged bucket with
// no bound is still a black hole with a verdict attached.
//
// CONSUMER-OWNED VALUES, and that is a ruling rather than an omission: a
// consumer owns the SHAPE of its own record and never the VALUES of a field
// that JOINS across a boundary. This label is rendered on kogaki's own screen
// and read by nothing outside it, so no hub ratification is owed.
// consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/knowledge-architecture.md:198
export const COHERENCE_LABELS = Object.freeze(["tight", "related", "loose", "other"]);
// The residual, named once so no reader has to infer it from the cap map's gaps.
export const RESIDUAL_LABEL = "other";

export function subgroupPlacement(parent, classification, block) {
  const subgroups = [];
  const placedIds = new Set();
  for (const sg of classification) {
    const name = String(sg.subgroup || fail("each SubGroup needs a `subgroup` name"));
    const members = [...new Set(sg.members || [])].sort();
    const stray = members.filter((id) => !parent.members.includes(id));
    if (stray.length) fail(`SubGroup ${JSON.stringify(name)} places ${stray.join(", ")}, which are not members of ${parent.name} — subdivision decides WHERE a member appears, never that a new one exists`);
    members.forEach((id) => placedIds.add(id));
    subgroups.push({ name, claim: String(sg.claim || ""), members, verdicts: sg });
  }
  // AN UNPLACED MEMBER IS A REFUSAL NAMING IT (§6.2 rule 1, kogaki#738 ruling 1).
  // This branch used to SWEEP: every member the judge left out was pushed into a
  // `(fits no composed SubGroup)` SubGroup carrying `coherence: "forced"` "by
  // construction" — a verdict the judge never reached, on a bucket the engine
  // composed. The cover property is unchanged and is now stronger: every member
  // still appears, and it appears because the judge placed it.
  //
  // THE FALLBACK IS CHOSEN RATHER THAN INHERITED. The sweep was never decided;
  // it was whatever the code did with the members it had left over.
  // consulted: product-lab@652f47da1ed137c98d7f0264d8676e9e40e5af02 LESSONS.md:82
  //
  // AND THE REFUSAL NAMES THE IDS, which is load-bearing rather than a message
  // preference: the judge must still dispose of every member, so a refusal that
  // reported only a count would remove the sweep and hand back nothing to act on.
  // consulted: product-lab@652f47da1ed137c98d7f0264d8676e9e40e5af02 LESSONS.md:38
  const unplaced = parent.members.filter((id) => !placedIds.has(id));
  if (unplaced.length) {
    fail(`SUBDIVISION_COVER_INCOMPLETE — the classification of ${parent.name} leaves `
      + `${unplaced.length} member(s) unplaced: ${unplaced.sort().join(", ")}. Every member is `
      + `placed by the JUDGE, never swept: place each of these in a composed SubGroup, or in one `
      + `labelled \`other\` — the residual, which asserts you found no subset of `
      + `${subdivisionLimits().min} or more members at loose-or-better affinity among them `
      + `(SPEC-terrain §8, kogaki#738). The engine no longer composes a catch-all, `
      + `because a bucket it fills carries a verdict nobody reached.`);
  }

  // THE RESIDUAL IS BOUNDED (owner amendment 1 ruling 2, kogaki#738). Until the
  // residual falls to N the classification is REFUSED and further SubGroups are
  // forced — the refusal names the remainder count against N. It sits here
  // rather than in `judgeSubgroup` because it is a property of the WHOLE
  // classification: the residual is whatever the judge put in the `other`
  // SubGroup(s), and one SubGroup at a time cannot see the total.
  //
  // THIS REVERSES THE ISSUE BODY, and the reversal is the point. The body ruled
  // `other` unbounded, "safe only because it is judged"; the owner superseded
  // that the same day — `other` = unlimited is an ANTI-PATTERN. A judged bucket
  // with no bound still lets Lessons disappear into it, which is the instability
  // the issue was filed over.
  const { maxResidual } = subdivisionLimits();
  const residual = subgroups
    .filter((sg) => (sg.verdicts || {}).coherence === RESIDUAL_LABEL)
    .reduce((n, sg) => n + sg.members.length, 0);
  if (residual > maxResidual) {
    fail(`SUBDIVISION_RESIDUAL_OVER_LIMIT — the classification of ${parent.name} leaves `
      + `${residual} member(s) in the residual \`other\`, over the limit of ${maxResidual} `
      + `(report-format.json limits.max_residual_members, SPEC-terrain §8, kogaki#738 owner `
      + `amendment 1). Compose additional SubGroups until the residual falls to ${maxResidual} `
      + `or fewer. The residual exists so an absence of relationships is EXPLICIT, not so that `
      + `members can be parked in it.`);
  }
  return { subgroups, placedIds };
}

// The JUDGMENT half of subdivision (§8), extracted beside `subgroupPlacement`
// so the co-tag screen (§6.2) and `subdivide` share ONE implementation.
//
// kogaki#133's first finding is what this closes: the screen placed members
// and printed name, claim and ids while evaluating neither conjunct and
// emitting neither disclosure, so "where §8's conditions put them" was
// satisfied by the caller's JSON alone. A second copy of these rules would be
// a second place for the judgment to drift; the rule is enforced at the
// layer where it can be broken, and both surfaces break it the same way.
// THE LIMITS' ONE READER (§8, kogaki#738 ruling 5 and owner amendment 2's five
// config keys). Every number the subdivision judgment enforces comes from here,
// and NONE is restated in this file — unlike `SUBDIVISION_REQUIRED_AT`, which is
// duplicated and cross-checked, these have one carrier and so cannot disagree
// with it.
//
// A MISSING BLOCK FAILS LOUDLY rather than returning a permissive default.
// Amendment 2 requires the harness to enforce every key mechanically; a default
// here would delete a ruled refusal silently, which is the same
// engine-supplies-the-judgment defect ruling 1 is about, one layer down.
export const CAPPED_LABELS = Object.freeze(COHERENCE_LABELS.filter((l) => l !== RESIDUAL_LABEL));

export function subdivisionLimits(grammarPath = REPORT_FORMAT) {
  const limits = readJson(grammarPath).limits;
  const caps = limits && limits.subgroup_member_cap;
  // EVERY PER-LABEL KEY IS CHECKED, not just the map's presence (PR #758 round
  // 1). `subgroupMemberCap` returns `null` for a label the map does not carry,
  // and `null` is this design's own signal for "deliberately uncapped, this is
  // the residual" — so an owner who deletes or misspells `loose` in an
  // owner-editable file would silently lose that cap's refusal, with an
  // oversized `loose` SubGroup admitted and indistinguishable from the residual
  // convention. That is the outcome this function's header says it exists to
  // prevent, reachable through the one case the block-level guard missed.
  const missingCap = caps ? CAPPED_LABELS.filter(
    (l) => !Object.prototype.hasOwnProperty.call(caps, l)) : [];
  if (!caps || missingCap.length || limits.min_subgroup_members === undefined
      || limits.max_residual_members === undefined) {
    fail("report-format.json declares no complete `limits` block, so §8's subdivision limits "
      + "cannot be read (kogaki#738 ruling 5, owner amendment 2)"
      + (missingCap.length ? `; no cap is declared for ${missingCap.join(", ")}` : "")
      + ". The five keys live in the carrier by design — a cap for each of "
      + `${CAPPED_LABELS.join(", ")}, plus \`min_subgroup_members\` and \`max_residual_members\` — `
      + "and defaulting any of them here would silently delete a ruled refusal.");
  }
  return {
    caps,
    min: Number(limits.min_subgroup_members),
    maxResidual: Number(limits.max_residual_members),
  };
}

// The per-label cap, or `null` for the residual, which is bounded by
// `max_residual_members` instead and deliberately carries no row in the cap map.
export function subgroupMemberCap(label, grammarPath = REPORT_FORMAT) {
  const { caps } = subdivisionLimits(grammarPath);
  return Object.prototype.hasOwnProperty.call(caps, label) ? Number(caps[label]) : null;
}

export function judgeSubgroup(sg, groupClaim, parentSize = null) {
  const vd = sg.verdicts || {};

  // retired-vocab-ok: the three lines here name the replacement.
  // THE COHERENCE LABEL REPLACES THE CONJUNCTIVE LEAF CONDITION (kogaki#683
  // disposition 5, owner selection at pickup 2026-08-29). `composes_honestly`
  // and `tighter_than_parent` are GONE — one instrument, not two — and the
  // label carries what they carried: `tight` is what the conjunction admitted,
  // `related` is the honest-but-not-tighter middle the conjunction collapsed
  // into a bare failure, and the third label — `forced` until kogaki#738, `other`
  // since — carries the residue.
  //
  // `legible_at_a_glance` IS NOT FOLDED IN, and the omission is deliberate: it
  // is one of §8's three INSTRUMENTS rather than a conjunct of the leaf
  // condition, so absorbing it would re-cut the three-quantity triple in the
  // same act that deletes the paragraph's other text — two re-cuts of one
  // paragraph with only one licensed by a disposition.
  //
  // THE VALUE IS THE JUDGE'S AND IS NOT INVENTED HERE. A record arriving with
  // no label, or with a value outside the closed set, is REFUSED rather than
  // defaulted: a default would be this layer supplying the judgment the label
  // exists to carry.
  const coherence = vd.coherence;
  if (!COHERENCE_LABELS.includes(coherence)) {
    fail(`SubGroup ${JSON.stringify(sg.name)} carries coherence ${JSON.stringify(coherence === undefined ? null : coherence)}; the closed set is ${COHERENCE_LABELS.join(" | ")} (SPEC-terrain §8, kogaki#683). The label is the judge's and is never defaulted here — a default would be this layer supplying the judgment the label exists to carry.`);
  }
  const why = String(vd.coherence_why || "").trim();
  if (!why) {
    fail(`SubGroup ${JSON.stringify(sg.name)} carries a coherence label with no \`coherence_why\`. The label and one free-form sentence of why are ONE instrument: a label with no reason is a verdict a reader cannot weigh.`);
  }
  sg.coherence = coherence;
  sg.coherence_why = why;
  sg.coherence_line = `coherence: ${coherence} — ${why}`;

  // THE SIZE LIMITS, READ FROM THE CARRIER (§8, kogaki#738 ruling 3 and owner
  // amendments 1 and 2). Three refusals, and they bind different populations:
  //
  //   - an AFFINITY SubGroup over its label's cap — `tight` 5, `related` 7,
  //     `loose` 7. The asymmetry is the consumer's: Brief consumes a `tight`
  //     group WHOLE and cannot yet filter Strands, while `related` and `loose`
  //     are browse material a reader selects from.
  //   - an AFFINITY SubGroup under `min_subgroup_members` (M). A SubGroup of one
  //     or two is a claim about a relationship too small to be one.
  //   - the RESIDUAL over `max_residual_members` (N), which is handled at the
  //     placement rather than here, because it is a property of the whole
  //     classification and this function sees one SubGroup at a time.
  //
  // THE FLOOR DOES NOT BIND THE RESIDUAL. A shrinking residual is the outcome
  // the whole design wants, so a floor on it would refuse exactly the
  // classifications that did best.
  //
  // READ, NEVER RESTATED. The numbers live in `report-format.json`'s `limits`
  // block so an owner edits them without a code change — unlike
  // `SUBDIVISION_REQUIRED_AT`, which is duplicated and cross-checked, these have
  // one carrier and so cannot disagree with it.
  const { min } = subdivisionLimits();
  const cap = subgroupMemberCap(coherence);
  if (cap !== null && sg.members.length > cap) {
    fail(`SubGroup ${JSON.stringify(sg.name)} is labelled ${coherence} and carries `
      + `${sg.members.length} members, over the cap of ${cap} `
      + `(report-format.json limits.subgroup_member_cap.${coherence}, SPEC-terrain §8, kogaki#738). `
      + `Compose a tighter SubGroup, or judge these members at a label whose cap admits them.`);
  }
  // THE FLOOR EXEMPTS A WHOLE-GROUP SubGroup (owner selection 2026-09-01, at the
  // pickup gate for amendment 1). M refuses a SPLINTER — a SubGroup too small to
  // be a real division of its parent — and a SubGroup holding the entire parent
  // divided nothing, so there is no splinter for M to police. Without the
  // exemption a group under M has NO conformant affinity classification at all:
  // the residual is the only path left, and it asserts the judge found no
  // loose-or-better affinity among them, which the harness would then be forcing
  // the judge to assert whether or not it is true. That is the same served line
  // this issue's own refusal was built on, firing the other way —
  // consulted: product-lab@652f47da1ed137c98d7f0264d8676e9e40e5af02 LESSONS.md:38
  // ("when the actor must still dispose of the item in front of it, a fail-closed
  // refusal prevents nothing and merely removes one option").
  //
  // KEYED ON A STRUCTURAL FACT, never on a size. `parentSize === members.length`
  // says the SubGroup IS the group; a threshold like "2M or more" would be a
  // second derived number nobody ruled.
  const wholeGroup = parentSize !== null && sg.members.length === parentSize;
  if (coherence !== RESIDUAL_LABEL && sg.members.length < min && !wholeGroup) {
    fail(`SubGroup ${JSON.stringify(sg.name)} is labelled ${coherence} and carries `
      + `${sg.members.length} member(s), under the minimum of ${min} `
      + `(report-format.json limits.min_subgroup_members, SPEC-terrain §8, kogaki#738 owner `
      + `amendment 1). A SubGroup below the minimum asserts a relationship too small to be one; `
      + `merge it into a SubGroup it belongs with, or let its members fall to the residual. `
      + `(A SubGroup holding the WHOLE parent group is exempt: it divided nothing.)`);
  }

  // The two disclosures, DISJUNCTIVE: each is evaluated independently and
  // neither gates the other, because the first alone does not detect the
  // condition the second names.
  sg.disclosures = [];
  const namesAMember = sg.members.some((id) => (sg.claim || "").includes(id.replace(/^lesson:/, "")));
  if (vd.trails_into_enumeration === true || namesAMember) {
    sg.disclosures.push(`degenerate-claim: the claim trails into enumeration${namesAMember ? " (it names a member's slug)" : ""}`);
  }
  const sgText = (sg.claim || "").trim();
  const parentText = String(groupClaim || "").trim();
  if (vd.true_of_every_member === true || (sgText !== "" && sgText === parentText)) {
    sg.disclosures.push("undiscriminating-claim: honest, but true of every member at the size served — an honest summary true of every member discriminates between none");
  }
  return sg;
}

// THE RECORD HALF OF THE RETIRED `subdivide` SUBCOMMAND, reachable only from
// `J2_subdivision` (§15.6.2, kogaki#625 item 1). The RENDERING half left with
// the entry point — §15.7 removes `cmdSubdivide`'s hand-rendered lines, which
// §14.2's guard never saw. What stays is the composition §2.1 makes a RUNTIME
// refusal: subgroup placement, the three instruments, and
// SUBDIVISION_COVER_INCOMPLETE. Leaving those to whatever composed the record
// would move a ratified refusal out of the runtime.
export function composeSubdivisionRecord(args, dir, record) {
  const block = SURVEY_SCHEMA.subdivision;
  const tag = String(args.tag || fail("J2_subdivision needs --tag <selected tag>"));
  const groupArg = String(args.group || fail("J2_subdivision needs --group <co-tag>"));
  const groupClaim = String(args["group-claim"] || fail("--group-claim is required: the parent GroupClaim the SubGroup claims' coherence is judged against"));
  const modelId = String(args["judge-model"] || fail("--judge-model is required: the judge pin's model id. A per-invocation judged surface with no judge pin is the drift-undetectable shape — `recomputed fresh` silently becomes `recomputed by a different judge` (topics/knowledge-architecture.md:84@f918c515). Terrain names no model of its own; it records the one that served."));
  const effortTier = String(args["judge-effort"] || fail("--judge-effort is required: the judge pin's effort tier, the pin's fourth component alongside the model id"));
  const screenBudget = Number(args["screen-budget"] || fail("--screen-budget is required: the rendering destination, in lines. It is supplied per run rather than fixed in code — a rendering destination is a property of where a screen lands, not of the material, so it is the caller's to state (SPEC.md §8)"));
  const classification = readJson(String(args.classification || fail("J2_subdivision needs --classification <file>: the judge's SubGroups, each with its composed claim, its members, and its own coherence (tight|related|other) + coherence_why, and its trails_into_enumeration / true_of_every_member / legible_at_a_glance verdicts")));

  const groups = cotagGroups(record.candidates.filter((c) => (c.tags || []).includes(tag)), tag);
  const parent = groups.find((g) => g.name === groupArg || g.cotag === groupArg) || fail(`no co-tag group ${JSON.stringify(groupArg)} in ${tag}`);

  // Compose the SubGroups from the judge's placement. A member the judge
  // invented is refused; a member the judge left unplaced is placed in the
  // EXPLICIT named SubGroup rather than dropped — subdivision hides none.
  const { subgroups, placedIds } = subgroupPlacement(parent, classification, block);

  for (const sg of subgroups) {
    sg.by_family = familySplit(sg.members, record.candidates);
    judgeSubgroup(sg, groupClaim, parent.members.length);

    // Three instruments, three quantities, none a threshold, none gating.
    sg.instruments = {
      relative_share_of_placements: parent.members.length
        ? Number((sg.members.length / parent.members.length).toFixed(4)) : 0,
      // Line arithmetic for the rendering destination, not a threshold and not
      // stop logic: one line for the SubGroup name, one for its claim, one per
      // member. It gates nothing — the budget is REPORTED against the need.
      screen_budget_lines: { needs: LINES_PER_SUBGROUP_HEADER + sg.members.length, budget: screenBudget },
      // Read from the SubGroup's own carried verdicts rather than a binding in
      // this scope: story 1.31 moved `const vd = sg.verdicts || {}` into
      // `judgeSubgroup`, and this third instrument — the only `vd.` site left
      // outside that function — named nothing from that commit onward
      // (kogaki#165).
      legible_at_a_glance: (sg.verdicts || {}).legible_at_a_glance === true,
    };
  }

  // The cover, counted AFTER composition, over placements.
  const uncovered = parent.members.filter((id) => !placedIds.has(id));
  if (uncovered.length) fail(`SUBDIVISION_COVER_INCOMPLETE — ${uncovered.length} member(s) of ${parent.name} appear in no SubGroup: ${uncovered.join(", ")}. ${block.no_member_hidden_rationale}`);

  parent.by_family = familySplit(parent.members, record.candidates);
  const id = `terrain-subdivision-${Date.now()}`;
  const out = {
    id,
    kind: "subdivision",
    pin: record.pin,
    judge: { model_id: modelId, effort_tier: effortTier },
    group: parent.name,
    group_claim: groupClaim,
    parent_members: parent.members,
    subgroups: subgroups.map(({ verdicts, ...rest }) => ({ ...rest, judge_verdicts: verdicts })),
    cover: { placed: placedIds.size, of: parent.members.length, counted_over: "placements" },
    offered_by_default: false,
    lessons_served: record.candidates.length,
  };
  for (const f of block.required) {
    if (out[f] === undefined || out[f] === null || out[f] === "") fail(`refusing to write a non-conforming subdivision record: missing ${f}`);
  }
  if (out.offered_by_default !== block.offered_by_default_must_be) fail("refusing to write a subdivision record marked offered by default (SPEC.md §8.1)");
  const path = join(dir, `${id}.terrain-subdivision.json`);
  writeFileSync(path, JSON.stringify(out, null, 2) + "\n");
  return path;
}

// THE ENTERED SET RESOLVED TO TARGETS, SHARED BY `report` AND THE EXECUTOR'S
// `neighborhood_input` (kogaki#690). Both need the same answer to "which
// Groups and SubGroups did the owner enter", and the emitter's whole job is to
// enumerate the neighborhood of exactly that set — so a second resolver here
// would be two answers to one question, and the one that drifted would be the
// one no report ever exercised.
//
// Resolution runs against THE GROUPS THIS RUN COMPOSES (AC6): story 1.56 AC11
// makes an id valid for the run that printed it — a pin advance may renumber —
// so nothing here caches, persists or reconstructs an earlier numbering.
//
// IT RETURNS `subOf` RATHER THAN LEAVING ITS CALLER TO REBUILD ONE. Resolving a
// SubGroup id already requires parsing `--subdivisions`, so handing the closure
// back is what keeps one parse and one answer (PR #701 round 1). The §11 v10
// claims-reader rationale does NOT live here: this function reads no claims
// file, and a comment explaining `--claims` above a function that never opens
// one is a pointer to the wrong artifact.
function resolveReportTargets(record, tag, enteredIds, args) {
  const members = record.candidates.filter((c) => (c.tags || []).includes(tag));
  if (members.length === 0) fail(`no candidate carries the served tag ${JSON.stringify(tag)}`);
  const groups = cotagGroups(members, tag);
  const subdivisions = args.subdivisions ? readJson(String(args.subdivisions)) : {};
  const subOf = (g) => readSubdivisionEntry(
    g.name,
    subdivisions[g.name] !== undefined ? subdivisions[g.name] : subdivisions[g.cotag]);
  const resolved = resolveEnteredIds(enteredIds, groups, subOf);
  return { members, groups, resolved, subOf, targets: resolved.targets };
}

// --------------------------------------------------------------------------
// report — the Full Report (SPEC.md §12).
//
// The other half of §6.1's compact screen: the screen is what the owner
// NAVIGATES, this is what they READ. Untruncated Claims and Glosses, with no
// truncation anywhere — which is why it parses the served shard whole rather
// than through `parseGlossShard`, whose whole job is to cut a headline.
//
// It is a REPORT and therefore not a choice: it ranks nothing, narrows
// nothing and hides nothing, so it sits in neither act list (§2.3, §12).
//
// It is a RENDERING and therefore NOT AN ADDRESS: nothing downstream resolves
// a report id, and a Brief cites members and pins exactly as it does today
// (topics/articles.md:64,71@f918c515).
// --------------------------------------------------------------------------
export const NO_GLOSS_BODY = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";
export const NO_JUDGE = "none";

// THE TYPED SUBDIVISION ENTRY (§12.1 v9, kogaki#199).
//
// WHAT IT REPLACES, and why the old shape had to go rather than be tolerated.
// The entry used to be a bare array and its presence was tested for truthiness,
// so `[]` — a judged group with no subdivision — was TRUTHY and took the
// judged branch by accident, while an absent key and `{}` took the unjudged
// one. Three inputs, three different conformance outcomes, and NONE of them
// was the artifact §12.1 names as conformant: `subgroupPlacement(group, [], …)`
// placed nothing, computed `unplaced` as every member, and pushed the
// `no_member_hidden_subgroup` catch-all, after which `members` was nulled. A
// group whose judgment ran and found no split could not be recorded at all.
//
// The distinction is now STATED rather than inferred from a language
// property nothing documents:
//
//   {"G": {"judged": true, "subgroups": [ … ]}}   judged, with a subdivision
//   {"G": {"judged": true, "subgroups": []}}      judged, EMPTY — conformant
//   key absent                                    not judged — refused on the co-tag path
//
// A BARE ARRAY IS REFUSED BY NAME rather than read as the old form. Accepting
// it would leave two encodings for one fact, and a composer emitting the old
// shape would get the old accidental semantics back silently — the collision
// the served surface rules against: "a collision wants REFUSAL OR
// QUALIFICATION at the resolver, never a first-hit-wins guess"
// (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/knowledge-architecture.md:154`).
// THE TYPED CLAIMS RECORD, and the subset refusal it exists to make possible
// (§11 v10, kogaki#212).
//
// WHY THE CLAIMS ARTIFACT IS THE CARRIER. The pin has to accompany the claims,
// and v9 never said where it lives. It lives HERE, in one artifact with them,
// because a pin in a separate file can go stale beside the claims it
// accompanies and nothing in the tool would catch that — the same
// existence-versus-standing gap the subset check exists to close, moved one
// file over. It also mirrors §12.1 v9's typed subdivision record, so both
// composed inputs carry one shape rule learned once.
//
//   { "composition_pin": { "tag": …, "pin": …, "groups": { "<G>": ["lesson:…"] } },
//     "claims":         { "<G>": "…" } }
//
// A BARE MAP IS REFUSED BY NAME, as §12.1 v9 refuses the withdrawn bare array:
// two encodings for one fact would let a stale composer silently keep the
// unguarded shape.
export function readClaimsRecord(raw, record) {
  if (raw === undefined || raw === null) return { claims: {}, pin: null };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    fail("--claims must be an object (SPEC.md §11 v10)");
  }
  if (!("composition_pin" in raw) || !("claims" in raw)) {
    fail("--claims is a bare {group: claim} map, which is the withdrawn pre-v10 form. "
      + "A claim composed outside the bounded read is what this refuses, and a bare map "
      + "carries no evidence of where it was composed from. Write "
      + '{"composition_pin": {...}, "claims": {...}} — `compose-input` emits the pin '
      + "(SPEC.md §11 v10)");
  }
  const pin = raw.composition_pin;
  if (!pin || typeof pin !== "object" || Array.isArray(pin)) {
    fail("--claims carries no usable `composition_pin` object (SPEC.md §11 v10)");
  }
  if (!pin.groups || typeof pin.groups !== "object" || Array.isArray(pin.groups)) {
    fail("--claims `composition_pin` carries no `groups` map. It must hold the MEMBER "
      + "SET compose-input served, per group — a digest cannot support a subset check "
      + "and can name no offender (SPEC.md §11 v10)");
  }
  // AC4 — THE PIN BINDS THE SURVEY RECORD IT WAS COMPUTED AGAINST. A stale pin
  // must not become a confident wrong acceptance: re-resolving it silently
  // against a different record is the shape where the guard passes and the
  // claim it admitted was composed from material this survey never served.
  if (record && pin.pin && record.pin && pin.pin !== record.pin) {
    fail(`--claims was composed against survey pin ${pin.pin}, and this run's survey is `
      + `${record.pin}. The bounded read it evidences is not this one — re-run `
      + "compose-input against this survey and recompose (SPEC.md §11 v10)");
  }
  const claims = raw.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    fail("--claims `claims` must be a {group: claim} object (SPEC.md §11 v10)");
  }
  return { claims, pin };
}

// AC3 — THE SUBSET CHECK, bound by CONTENT and naming what falls outside.
//
// This is the load-bearing half. A pin asserting only that `compose-input` RAN
// is satisfiable by a session that runs it, takes the pin, and composes from
// the whole survey anyway — existence evidence standing in for standing
// (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:63`).
// The subset relation is what makes composing outside the bounded read
// UNPRODUCIBLE rather than discouraged.
//
// Returns the offending entries, so the caller can NAME them. An empty array is
// a pass. Pure over its inputs, so the fixtures can state both directions
// without a gateway.
export function claimsOutsideBound(claims, pin, groups) {
  const out = [];
  const served = pin && pin.groups ? pin.groups : {};
  for (const name of Object.keys(claims)) {
    // A claim naming a group the bounded read never served is outside it,
    // whatever its members are.
    if (!Object.prototype.hasOwnProperty.call(served, name)) {
      out.push({ group: name, reason: "no such group in the bounded read", members: [] });
      continue;
    }
    // And a group whose composed membership exceeds what was served is outside
    // it too — the subset direction. A NARROWER set is fine: composing a claim
    // over a subset of the served members is normal work, which is exactly why
    // this is a subset test and not equality.
    const g = groups.find((x) => x.name === name || x.cotag === name);
    if (!g) continue;
    const allowed = new Set(served[name] || []);
    const stray = g.members.filter((m) => !allowed.has(m));
    if (stray.length) {
      out.push({ group: name, reason: "members outside the bounded read", members: stray });
    }
  }
  return out;
}

export function readSubdivisionEntry(name, entry) {
  if (entry === undefined || entry === null) return null;   // absent: not judged
  if (Array.isArray(entry)) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} is a bare array, which is the `
      + `withdrawn pre-v9 form. Judged-empty and never-judged are different states and a `
      + `bare array cannot say which: write {"judged": true, "subgroups": [...]}, or omit `
      + `the key if the group was not judged (SPEC.md §12.1 v9)`);
  }
  if (typeof entry !== "object") {
    fail(`--subdivisions entry for ${JSON.stringify(name)} must be an object `
      + `{"judged": true, "subgroups": [...]} (SPEC.md §12.1 v9)`);
  }
  if (entry.judged !== true) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} does not declare "judged": true. `
      + `The judgment is what the entry attests; an entry that does not state it is `
      + `indistinguishable from a run that never asked (SPEC.md §12.1 v9, §6.2)`);
  }
  if (!Array.isArray(entry.subgroups)) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} needs a "subgroups" array — `
      + `[] states JUDGED AND EMPTY, which is conformant and is not the same as absent `
      + `(SPEC.md §12.1 v9)`);
  }
  return { judged: true, subgroups: entry.subgroups };
}


// The shard, parsed WHOLE. `parseGlossShard` above returns the first sentence
// because a screen row is a headline; §12 forbids truncation anywhere, so the
// report cannot reuse it — the same shard read for two purposes needs two
// readers, not one reader with a flag.
export function parseGlossFull(resp) {
  const out = new Map();
  let slug = null;
  let body = [];
  let cite = null;
  const flush = () => {
    if (slug && body.length) out.set(slug, { body: body.join("\n").trim(), cite });
    slug = null; body = []; cite = null;
  };
  for (const line of resp.lines || []) {
    const t = line.text;
    if (t.startsWith("## ")) { flush(); slug = t.slice(3).trim(); continue; }
    if (!slug) continue;
    // `Source:` closes an entry; `---` separates them. Everything between the
    // heading and those is the entry's body, kept WHOLE — no sentence match,
    // no cap, no ellipsis, because §12 forbids truncation anywhere.
    if (t.startsWith("Source:") || t.startsWith("---")) { flush(); continue; }
    if (t.trim() === "") { if (body.length) body.push(""); continue; }
    if (!body.length) cite = line.cite;
    body.push(t);
  }
  flush();
  return out;
}

function fetchGlossBodies(kind, tag) {
  const resp = gatewayQuery("gloss_index", { tag: `${kind}/${tag}` });
  if (resp.miss) return new Map();
  return parseGlossFull(resp);
}

// --------------------------------------------------------------------------
// compose-input — the BOUNDED input the claim and subdivision composers read
// (kogaki#163 lever 3; SPEC.md §9's "Tag-scoped and bounded — one shard pair
// per viewed tag", and §7's silence on the composer's input).
//
// WHAT THIS FIXES, measured rather than argued. Dogfood run 2026-08-07, tag
// `architecture`: 70 Lessons, 11 co-tag groups, 131 placements, ~19 minutes
// between the survey record write and the last Full Report write. The runtime
// was never the cost — re-running `cotags` read-only over the same record
// renders instantly — the cost was COMPOSITION, and it grew in the wrong
// quantity: the composer reached for each group's material once per group, so
// 70 Lessons cost 131 reads. The material a group needs is a subset of the
// material the TAG's shard pair already carries, and that pair is already §9's
// budget, so the excess bought nothing.
//
// THE BOUND IS STRUCTURAL, NOT ADVISORY. `material` is keyed by member id and
// `groups` carry ids only — references into it. A member appearing in five
// groups therefore appears ONCE in this artifact, and there is no shape in
// which a per-group copy could be written: the composer has no per-group
// material to re-read because none exists. That is the difference between
// bounding an input and asking a composer to be frugal with one.
//
// THE FETCHER IS INJECTED, and that is what makes the bound OBSERVABLE. The
// property this story asserts is a count of served-material reads, so the
// detector's unit has to be the read itself — "if the check is reading the
// system's own explanation of what it did, an explanation is not evidence"
// (`match-the-detectors-unit-to-the-propertys-unit`,
// gloss/lessons/testing.md:131@12ba65dd). A `reads:` field this function wrote
// about itself would be exactly that explanation, so the accounting block
// below is a REPORT for the operator and the check does not read it: the
// fixture passes a counting fetcher and counts the calls, and a second fixture
// holds the candidate set fixed while multiplying the placements to show the
// count does not move with them (AC3's discriminator, which no single run can
// display).
//
// It composes NOTHING and judges NOTHING. The claim wording stays the
// composer's (§7 leaves it there) and the coherence label stays the judge's
// (§8); this hands over material and the group structure, and no verdict.
// --------------------------------------------------------------------------
export const COMPOSITION_INPUT_BOUND =
  "one tag-scoped served Gloss shard pair, fetched once for the run (SPEC.md §9)";

export function composeInput(record, tag, groups, fetchShard) {
  const members = record.candidates.filter((c) => (c.tags || []).includes(tag));
  // The journey shard is fetched only where a member carries a Journey — the
  // same conditional `report` already applies. An unconditional second fetch
  // would be a read taken for material no member has.
  const anyJourney = members.some((c) => c.journey);
  const lessonBodies = fetchShard("lessons");
  const journeyBodies = anyJourney ? fetchShard("journeys") : new Map();

  let abnormal = 0;
  const material = [...members]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => {
      const lg = lessonBodies.get(c.slug);
      const jg = c.journey ? journeyBodies.get(c.slug) : null;
      if (!lg) abnormal++;
      if (c.journey && !jg) abnormal++;
      return {
        id: c.id,
        cite: c.cite || null,
        // Untruncated, exactly as §12 serves it: the composer judging a
        // SubGroupClaim's coherence against its parent's is the reader §8
        // addresses, and a headline-only input would decide that verdict by
        // what the bound withheld. A missing rendering is MARKED
        // and never substituted (§9), at this layer as at every other.
        gloss: lg ? lg.body : NO_GLOSS_BODY,
        gloss_cite: lg ? lg.cite : null,
        journey_gloss: c.journey ? (jg ? jg.body : NO_GLOSS_BODY) : null,
        journey_cite: c.journey && jg ? jg.cite : null,
      };
    });

  const placements = groups.reduce((n, g) => n + g.members.length, 0);
  return {
    kind: "composition-input",
    tag,
    pin: record.pin,
    // THE COMPOSITION PIN (§11 v10, kogaki#212). The claim composer copies this
    // into its claims artifact, and `cotags` refuses claims whose members are
    // not a SUBSET of what it covers — which is what makes composing from the
    // whole survey unproducible rather than merely discouraged.
    //
    // IT CARRIES THE SERVED MEMBER SET, NOT A DIGEST, and that correction is
    // the whole of why the guard can do its job. A digest supports EQUALITY,
    // not subset, and can name no offender — so it could not deliver the
    // refusal §11 states, which names the members that fall outside. The
    // property was load-bearing and the digest was the mechanism, so the
    // mechanism gave way
    // (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:86`).
    //
    // It costs no new computation: `groups` below is already assembled.
    composition_pin: {
      tag,
      pin: record.pin,
      groups: Object.fromEntries(groups.map((g) => [g.name, [...g.members]])),
    },
    bound: COMPOSITION_INPUT_BOUND,
    // ids only. See the structural note above: this is the half that makes a
    // per-group re-read unwritable rather than merely discouraged.
    groups: groups.map((g) => ({ name: g.name, cotag: g.cotag, members: g.members })),
    material,
    // For the OPERATOR, not for the check. A self-reported number is not
    // evidence of the property it reports.
    accounting: {
      shard_fetches: 1 + (anyJourney ? 1 : 0),
      candidates: material.length,
      placements,
      abnormal,
    },
  };
}

function cmdComposeInput(args) {
  const dir = runDir(args);
  const record = readJson(String(args.survey || fail("compose-input needs --survey <file>")));
  const tag = String(args.tag || fail("compose-input needs --tag <selected tag>"));
  const members = record.candidates.filter((c) => (c.tags || []).includes(tag));
  if (members.length === 0) fail(`no candidate carries the served tag ${JSON.stringify(tag)} — nothing is hidden here, the tag is simply not in the survey's vocabulary`);
  const groups = cotagGroups(members, tag);

  // Memoized per kind, so the "fetched once for the run" half of §9's bound is
  // enforced HERE rather than assumed of the caller. `composeInput` asks for a
  // kind at most once already; this makes a future second caller unable to
  // spend a second read either.
  const seen = new Map();
  const fetchShard = (kind) => {
    if (!seen.has(kind)) seen.set(kind, fetchGlossBodies(kind, tag));
    return seen.get(kind);
  };

  const input = composeInput(record, tag, groups, fetchShard);
  const out = join(dir, `terrain-composition-input-${tag.replace(/[^a-zA-Z0-9]+/g, "-")}.json`);
  writeFileSync(out, JSON.stringify(input, null, 2) + "\n");

  const a = input.accounting;
  console.log(`Composition input (bounded): ${out}`);
  console.log(`Bound: ${COMPOSITION_INPUT_BOUND}.`);
  console.log(`Reads: ${a.shard_fetches} served-material fetch(es) for ${a.candidates} candidate(s) across ${a.placements} placement(s) in ${input.groups.length} group(s) — the read count is bounded by the CANDIDATES and does not grow with the placements.`);
  console.log(`${denominator(a.candidates, record.candidates.length)} carry ${tag}; ${strandFigure(familySplit(members.map((c) => c.id), record.candidates))}.`);
  if (a.abnormal) {
    console.log(`ABNORMAL: ${a.abnormal} served Gloss rendering(s) are missing. This is a fault to clear on the served surface, not a tolerated gap, and nothing was substituted for it (SPEC.md §9).`);
  }
  console.log(`Compose EVERY GroupClaim and EVERY SubGroupClaim from this one artifact: \`material\` is keyed by member id and \`groups\` carry ids only, so a member in several groups is read once, and no group has per-group material to re-read.`);
  console.log(`Classification: REPORT (SPEC.md §2.3) — it ranks nothing, narrows nothing and hides nothing. It composes no claim and judges nothing: the claim wording stays the composer's (§7) and the coherence label the judge's (§8).`);
  console.log(`Machine-local run workspace, never committed (founding spec rider 3).`);
  console.log(`\nNext: cotags --survey ${String(args.survey)} --tag ${tag} --claims <F> [--subdivisions <F> --judge-model M --judge-effort E]`);
}

// Where the machine RECORD lives (§12.2 v11). A record is machine-facing and
// the run workspace is its legitimate home — the owner ruling moved the
// RENDERING, not this. A STABLE home rather than a per-invocation directory,
// because §12.1's first case — same identity, run twice, ONE report — is a
// claim across invocations and a timestamped directory would make every rerun
// a duplicate by construction.
function reportsDir(args) {
  // §12.2 v11's own table gives the record's home as the RUN WORKSPACE, and
  // kogaki#234 acceptance 4 retires `~/.kogaki/reports/` outright. The v11
  // amendment moved the RENDERING and left this default naming the directory
  // the issue removes — so with no KOGAKI_RUN_DIR a real run still wrote the
  // retired path (PR #240 review round 1, finding 1).
  const dir = args["report-dir"] || process.env.KOGAKI_RUN_DIR
    || join(homedir(), ".kogaki", "runs", "reports");
  mkdirSync(dir, { recursive: true });
  return dir;
}

// The retired directory, disposed of rather than left to rot (acceptance 4).
// Reports are idempotently regenerable (§12.1), so there is nothing to migrate
// — the honest act is to remove it and SAY SO ONCE, never to leave an invalid
// location on disk looking authoritative. Silent removal is not on the table:
// deleting a directory the owner may have opened, without a word, is the
// storage-side twin of the defect this whole change is about.
function retireLegacyReportsDir() {
  const legacy = join(homedir(), ".kogaki", "reports");
  if (!existsSync(legacy)) return;
  const n = readdirSync(legacy).length;
  rmSync(legacy, { recursive: true, force: true });
  console.log(`retired the invalid reports location (kogaki#234): removed ${n} regenerable `
    + "report(s) from the machine-local directory the owner ruling struck. Reports are "
    + "idempotent (SPEC-terrain §12.1) — rerun to regenerate at the new locations.");
}

// Where the OWNER RENDERING lives (§12.2 v11, kogaki#234). The working tree,
// because a Full Report is what the owner reads to think a Thesis through and
// `specs/SPEC.md` §2.5 rules that a machine-local hidden directory DECLARES a
// file machine-facing. Terrain was in a failed state under that rule until this
// existed.
//
// The discriminator is LIFETIME, never format: a run workspace holds things
// whose lifetime is the RUN, the tree holds things whose lifetime is the
// OWNER's (§2.5.1). Defaulting to the repository root rather than to cwd is
// deliberate — the location must not depend on where the command was invoked
// from, which would be the producing stage's convenience picking the location
// again, one layer down.
// THE DESTINATION IS RESOLVED PURELY, and preparing it is a second act (PR
// #702 round 1, finding 2). `renderingsDir` is not a resolver: it `mkdirSync`s
// the destination and runs `retireIdentityNamedRenderings`, which DELETES files
// in the owner's tree and announces it. A write-authority guard that called it
// to learn where the write would land therefore created `reports/` and retired
// owner-tree files BEFORE deciding the act was unauthorized — a refusal that
// keeps the act off the owner surface in the write direction only. Splitting
// the two makes the guard's input side-effect-free; `renderingsDir` composes
// the same expression, so the default cannot drift between them.
function renderingDestination(args) {
  return args["rendering-dir"] || process.env.KOGAKI_REPORTS_DIR
    || join(repoRoot(), "reports");
}

function renderingsDir(args) {
  const dir = renderingDestination(args);
  mkdirSync(dir, { recursive: true });
  retireIdentityNamedRenderings(dir);
  return dir;
}

// §12.2 v12 (owner ruling 2026-08-14): the tree holds EXACTLY ONE owner
// rendering — `FullReport.md`, overwritten on every pull. An identity-named
// `terrain-full-report-<digest>.md` in the tree is the machine register's
// naming reaching the owner surface — the defect §2.5 clause 3 states by
// LOCATION, arriving by NAME — so any file so named is retired on sight, with
// one line saying so (the same disposal discipline as `retireLegacyReportsDir`:
// never silently). Nothing is lost: the rendering is a pure function of the
// machine record (§12.1), which keeps identity and coexistence in the run
// workspace, so a rerun regenerates any of them.
// EXPORTED so the retirement can be asserted SEAM-FREE (PR #436 round 1,
// finding 4). Reached only through `renderingsDir`, this ran exclusively on the
// `report` path, which reads served Gloss — so on a machine with no gateway
// every case covering it degraded to CANNOT-DETERMINE and the whole behaviour
// could be deleted with the suite still green. Exporting it costs nothing the
// module did not already expose (`relFromRepo` is exported for the same reason)
// and buys a case that runs everywhere.
export function retireIdentityNamedRenderings(dir) {
  const stale = readdirSync(dir)
    .filter((f) => f.startsWith("terrain-full-report-") && f.endsWith(".md"));
  if (!stale.length) return;
  for (const f of stale) rmSync(join(dir, f), { force: true });
  console.log(`retired ${stale.length} identity-named rendering(s) (SPEC-terrain §12.2 v12): `
    + "the tree holds ONE owner rendering, FullReport.md — identity lives in the machine "
    + "record, and reports are idempotently regenerable (§12.1).");
}

// The owner surface prints a REPO-RELATIVE path (§2.5 clause 3): no owner-facing
// output names a machine-local hidden path outside debugging, and an absolute
// path into someone's home directory is the specimen that clause was written
// against. Falls back to the absolute path only when the file genuinely sits
// outside the tree, where hiding the location would be worse than showing it.
export function relFromRepo(p, root) {
  const r = root === undefined ? repoRoot() : root;
  const pre = r.endsWith("/") ? r : r + "/";
  return p.startsWith(pre) ? p.slice(pre.length) : p;
}

let REPO_ROOT_FALLBACK_ANNOUNCED = false;

function repoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || process.cwd();
  } catch {
    // No git, or not a checkout. cwd is the honest fallback and it ANNOUNCES
    // ITSELF — a rendering written somewhere the owner did not expect is the
    // defect this whole section is about, so it must not happen quietly.
    //
    // The first version of this comment CLAIMED the report and no call site
    // made one (PR #240 review round 1, finding 5): outside a checkout the
    // rendering landed in `cwd/reports` and the owner saw a bare `reports/…`
    // with nothing saying which root. A comment asserting a property the code
    // lacks is worse than no comment — it retires the question.
    if (!REPO_ROOT_FALLBACK_ANNOUNCED) {
      REPO_ROOT_FALLBACK_ANNOUNCED = true;
      console.log(`NOTE: not a git checkout — the owner rendering is written under ${process.cwd()} `
        + "rather than a repository root. The path printed below is relative to THAT.");
    }
    return process.cwd();
  }
}

// THE OWNER SURFACE'S ARTIFACT LINES, IN ONE PLACE (§2.5 clause 3, §12.2 v11).
//
// This function exists because there are TWO paths that finish a report — the
// fresh write and the idempotent rerun — and PR #240 round 1 finding 2 fixed
// clause 3 on the first and left the second printing the absolute
// `~/.kogaki/runs/reports/….json` with no repo-relative rendering path at all.
// The live run of 2026-08-08 took the rerun path, which is the path a SECOND
// look always takes, and got the machine path and no "READ THIS ONE" line.
//
// Two branches printing the same contract in two places is what made a
// one-branch fix look complete, so the contract is stated ONCE and both
// branches call it. A duplicated invariant is one that a later fix updates
// half of.
function announceArtifacts(rendered, recordPath) {
  if (rendered) {
    console.log(`Full Report — READ THIS ONE (owner rendering, SPEC.md §12.2): ${relFromRepo(rendered)}`);
    console.log("ONE rendering file, overwritten per pull (SPEC-terrain §12.2 v12) — identity "
      + "and coexistence live in the machine record, never in the tree.");
  }
  // The record is machine-facing, so the owner surface names its FILENAME and
  // says where the class of thing lives; the full path is debugging output and
  // rides KOGAKI_DEBUG.
  if (process.env.KOGAKI_DEBUG) {
    console.log(`machine record (JSON, identity + idempotence; SPEC.md §12.1): ${recordPath}`);
  } else {
    console.log("machine record written (JSON, identity + idempotence; SPEC.md §12.1) "
      + `as ${basename(recordPath)} in the run workspace. Set KOGAKI_DEBUG=1 for its path.`);
  }
}

// THE SCREEN'S OWNER RENDERING (§14.4.1 v18, kogaki#434; implemented under
// kogaki#464 after #434 closed without it).
//
// §14.4.1 rules that an owner-facing screen is delivered as an ARTIFACT THE
// RUNTIME WRITES, never through a display channel. The channel this repository
// is operated through displays a tool call's stdout TO THE MODEL and not
// reliably to the owner — it collapses to a one-line summary — so through v17
// the contract had no satisfiable member: retyping is prohibited (§14.4), a
// question UI is prohibited after tag selection (§6.3), and model-side
// re-emission is refused. What that produced was not silence but a FALSE CLAIM
// OF SUCCESS, which reads as delivery.
//
// THE NAME IS A LITERAL joined onto the renderings directory, exactly as
// `FullReport.md` is, so a second screen name is UNWRITABLE RATHER THAN
// DETECTED — the constrain-side answer §14.4.1 names in its own
// what-is-not-carried list. Every screen renders through here; there is no
// second path and no caller-supplied name.
//
// §12.2 v12's "exactly one owner rendering" is SCOPED TO FULL REPORT
// RENDERINGS (§14.4.1), and the screen is a SECOND owner-rendering class with
// its own count of exactly one: overwritten per render, never accumulated. The
// invariant §12.2 v12 actually protects — no accumulation, no machine-register
// naming on the owner surface — holds for both, which is why this is a scoping
// and not a repeal.
// THE NAVIGATION HINT, one literal shared by the emitter and asserted against
// the grammar (kogaki#665). Its previous form named `view --survey <F> …` —
// the entry point this issue REMOVES — so under REFUSE the emitter would have
// had to print a removed subcommand or refuse. `report-format.json`'s
// `navigation_hint` form is amended to match, deliberately and on this
// issue's licence, never to make a refusal go away.
export const NAVIGATION_HINT =
  "Navigation (narrows nothing): name a tag in chat — the executor advances on the owner's word (§15.4).";

export const SCREEN_RENDERING = "Screen.md";

// WRITE AUTHORITY, CARRIED AT THE WRITE (SPEC-terrain §15.5 v28, kogaki#681,
// successor to #680). §15.5's title — "owner artifacts are written only from
// writing states" — was carried by nothing: `cotags` and `report` stayed live
// dispatcher cases calling the same renderers, so a session could mint
// `reports/Screen.md` or `reports/FullReport.md` out of order, with no run
// record. #680's disposition ("they cease to exist as entry points") was
// REFUTED by observation at #681: the executor re-surveys live rather than
// accepting a fixture, `compose_input` crosses the served-material seam, and
// `J1_claims` is non-conditional — so the 34 composition-check sites that drive
// these two commands could not be migrated, and the claimless screen §6.1
// requires is unreachable through `run` at all.
//
// SO THE REFUSAL BINDS THE WRITE AND NOT THE ENTRY POINT. The commands survive
// as COMPOSITION routes; what they cannot do is land an owner artifact. The
// discriminator is the RESOLVED destination, never a flag and never an env
// var's presence — §15.7 forecloses a debug-only escape ("a retained generator
// regenerates what a ban forbids"), and a route whose refusal could be
// switched off would be exactly that. A caller that redirects elsewhere writes
// no owner artifact by §2.5's own lifetime rule, which is why the check suite's
// throwaway-directory runs are unaffected rather than exempted.
//
// WHAT THIS DOES NOT CLAIM, stated because the superseded prose overclaimed in
// exactly this direction: the composition remains callable out of order. The
// property carried here is the one in the section's title, and §15.5 now says
// that and no more.
let WRITING_STATE = null;

// The default owner location, as one expression. `renderingsDir` composes the
// same default; a second literal here is how the two would drift.
function ownerRenderingLocation() {
  return join(repoRoot(), "reports");
}

// REFUSES BY DESTINATION, so a redirect that RESOLVES to the owner's tree is
// refused too — comparing the override's presence rather than its value is the
// hole a caller closes by passing `--rendering-dir reports`.
function refuseUnauthorizedOwnerWrite(dir, artifact) {
  if (WRITING_STATE !== null) return;
  if (resolve(dir) !== resolve(ownerRenderingLocation())) return;
  fail(`${artifact} is an OWNER ARTIFACT and is written only from a writing state of the workflow table (SPEC-terrain §15.5, kogaki#681). `
    + `This call reaches ${relFromRepo(resolve(dir))} from outside the executor, so it would land an owner surface belonging to no run record. `
    + "Drive it through the executor — `run --run-dir <D> …` — which reaches the same renderer from the state the table binds it to. "
    + "The composition itself is not refused: render into a run-scoped location and the write proceeds, because a rendering whose lifetime is the run is not an owner artifact (§2.5.1).");
}

function writeScreen(args, text) {
  // REFUSED BEFORE THE DESTINATION IS PREPARED, not after (PR #702 round 1,
  // finding 2). `renderingsDir` mkdirs and retires; the guard reads the pure
  // destination so an unauthorized act touches nothing at all.
  refuseUnauthorizedOwnerWrite(renderingDestination(args), SCREEN_RENDERING);
  const path = join(renderingsDir(args), SCREEN_RENDERING);
  writeFileSync(path, text.endsWith("\n") ? text : text + "\n");
  return path;
}

// THE ONE PRIVATE SCREEN WRITER (§15.5, kogaki#665). Every state whose
// `writes` field names the screen artifact goes through here, and the GRAMMAR
// COMES FROM THE CALLING STATE rather than from the artifact path — three
// states share one file, and `report-format.json` declares a separate surface
// for each, so a writer that inferred the grammar from `Screen.md` could only
// ever enforce one of the three.
//
// WHAT THIS REMOVES, which is the point rather than a tidy: `cmdView` used to
// call `writeScreen` DIRECTLY, with no `emitOrRefuse` anywhere on its path —
// so the two listing surfaces had declared grammars that nothing on the
// write path enforced. §14.4.1 admitted two writers; §15.5 supersedes it with
// one, and this is that one. The refusal gates the WRITE and not only a print,
// because `emitOrRefuse` takes the write as a callback: there is no path here
// that emits first.
//
// AND THE PRINT IS INSIDE THE CALLBACK TOO (PR #667 round 2, carried to
// kogaki#625). All three screen states printed the text and THEN called this,
// so the sentence above was true of the write and false of the terminal — the
// property "a nonconformant screen reaches neither the owner's terminal nor
// their artifact" had quietly become a property of the artifact alone. §14.4
// puts the owner's reading on the artifact, so the ratified guarantee was
// intact and only its stated reach was overclaimed; the repair is to make the
// sentence true again rather than to narrow it, because a comment asserting a
// structural property the code no longer has is how the next edit loses it for
// real. One printer, one writer, one callback, one refusal.
function writeScreenSurface(args, surface, text) {
  // BEFORE THE PRINTER, NOT ONLY BEFORE THE WRITE (§15.5 v28, kogaki#681).
  // `writeScreen` carries the same refusal as the writer's own guard, but the
  // printer runs first inside the callback below — so siting the check only
  // there put the refused screen on the owner's terminal and then declined to
  // file it. That is the exact half-property PR #667 round 2 repaired for the
  // grammar refusal ("a nonconformant screen reaches NEITHER the owner's
  // terminal nor their artifact"), re-broken by a second refusal added at the
  // wrong end of the same callback. Two call sites, one property: this one
  // binds the printer, `writeScreen`'s binds any future caller of the writer.
  refuseUnauthorizedOwnerWrite(renderingDestination(args), SCREEN_RENDERING);
  let path = null;
  emitOrRefuse(surface, text, (conformant) => {
    console.log(conformant);
    path = writeScreen(args, conformant);
  });
  // Unreachable: `emitOrRefuse` either runs the callback or fails the process.
  return path || fail(`${surface} produced no artifact path`);
}

// THE HAND-OVER'S FLOOR, and only its floor. Writing the artifact is NOT
// delivery: a run that writes `reports/Screen.md` and tells the owner nothing
// produces exactly the owner-visible state kogaki#434 was filed against, so
// §14.4's "Delivering nothing is still a failure" binds to the HAND-OVER and
// never to the write.
//
// What this function does is name the artifact. WHICH FORM the relay's own
// hand-over takes — a pointer, an `!`-command, a file-send — is non-normative
// per §14.4.1 and is deliberately not decided here: a runtime that printed one
// prescribed form would re-import the harness binding the ruling removed.
function announceScreen(path) {
  console.log(`Screen — READ THIS ONE (owner rendering, SPEC-terrain §14.4.1): ${relFromRepo(path)}`);
  console.log("ONE screen file, overwritten per render (§14.4.1) — §12.2 v12's count is scoped to "
    + "FullReport.md, and this is the second owner-rendering class with its own count of exactly one.");
}

// The owner register (§12.2 v11). Markdown, because the artifact's whole job is
// to be READ — the JSON beside it keeps every machine property, so nothing here
// is load-bearing for identity and nothing may parse it back.
// §12.3 — the Thesis candidates section (kogaki#760).
//
// THE ABSENT CASE RENDERS THE SECTION AND SAYS IT IS EMPTY, which is the
// fallback CHOSEN at the gate rather than inherited from the code. The three
// candidates were: refuse the render, omit the section, or disclose. Omitting
// makes "no candidates were composed" and "this section does not exist"
// indistinguishable to the owner, which is the silence §13.4 already refuses
// for the neighborhood — "an empty result renders its explicit lines, never an
// absent section" — and this follows that precedent in the same file. Refusing
// was the stronger reading of "fixed section" and was declined at the gate for
// its blast radius: eighteen `report` invocations supply no such file.
//
// The count, the arity and the membership are NOT checked here. They are
// runtime refusals in `cmdReport`, sited before anything is written, because
// `full_report`'s `line_class_allowlist` is inert — three of its body classes
// are bare placeholders admitting any line — so a grammar class on this
// surface carries FORM and can police nothing else.
export function thesisCandidatesSection(candidates) {
  const L = ["## Thesis candidates", ""];
  L.push("*Non-binding: this section does not constrain the Brief's Thesis.*");
  L.push("");
  if (!candidates || candidates.length === 0) {
    L.push("*No Thesis candidates were composed for this pull — the section is empty rather than absent.*");
    L.push("");
    return L;
  }
  candidates.forEach((c, i) => {
    // THE ID IS MINTED HERE, POSITIONALLY, and is never read from the input.
    // A supplied id would be a second carrier for a number the list already
    // fixes, and the two would drift the first time a candidate was reordered.
    L.push(`- TC${i + 1} — ${c.claim}`);
    L.push(`  strands: ${c.strands.join(", ")}`);
  });
  L.push("");
  return L;
}

export function renderReportMarkdown(report, tag) {
  const L = [];
  const i = report.identity;
  // §12 v7 — the title names the TAG, never an id. A report may span several
  // entered ids, so no single GroupID identifies it; the entered set rides
  // `*Selections:*` in the identity block, where §12.1 already puts the
  // recorded components. Kept short deliberately: five ids in a title wrap, on
  // the surface kogaki#317 exists to keep readable under wrapping.
  L.push(`# Full Report — ${tag}`);
  L.push("");
  L.push(`*Selected tag:* \`${tag}\`  `);
  L.push(`*Selections:* ${(i.query.ids || []).join(", ")}  `);
  L.push(`*Substrate pin:* \`${i.pin}\`  `);
  L.push(`*Judge:* ${i.judge_pin === NO_JUDGE ? "`none`"
    : `\`${i.judge_pin.model_id}/${i.judge_pin.effort_tier}\``}`);
  L.push("");
  L.push("> Untruncated. This report ranks nothing, narrows nothing and hides");
  L.push("> nothing (SPEC-terrain §2.3, §12). It is a RENDERING, not an address:");
  L.push("> article material is quoted from served renderings at pins, never");
  L.push("> from a report.");
  L.push("");
  // §12.3 — THE THESIS CANDIDATES SECTION (kogaki#760, owner ruling
  // 2026-09-01). The early image, so it is the first CONTENT the owner reads.
  //
  // SITED BELOW THE PREAMBLE, and the choice is stated rather than left as an
  // accident of where the push landed. The ruling says "immediately after the
  // report header"; the preamble is the boundary notice governing how
  // everything under it is read ("It is a RENDERING, not an address"), and a
  // section whose claims a judge composed belongs under that notice rather
  // than above it. Everything the ruling's own ground asks for is still
  // satisfied — nothing but the identity and the boundary precedes it.
  //
  // NON-BINDING, AND THE LINE SAYS SO ON THE SURFACE. Brief cannot yet select
  // or discard Strands, so the desired combination must be completable inside
  // Terrain; this section serves that and constrains the Brief's eventual
  // Thesis not at all. A reader who meets three candidate claims at the top of
  // a report will otherwise take them for a narrowing, which is the one thing
  // §2.3 promises this surface never does.
  L.push(...thesisCandidatesSection(report.thesis_candidates));
  // The singular `## Group claim` block is GONE (§12 v7): a report may span
  // several ids, so there is no one group whose claim heads the file. Each
  // section carries its own claim under its own heading.
  // §12 v7 — ONE SECTION PER ENTERED ID, keyed by the id. What repeats is the
  // section; the identity block above and the Counted / Served-lines blocks
  // below appear once for the file.
  for (const sec of report.sections || []) {
    L.push("");
    L.push(`## ${sec.id} — ${sec.name}`);
    L.push("");
    L.push(sec.claim === NO_CLAIM ? "*(none composed)*" : sec.claim);
    L.push("");
    if (sec.subgroups && sec.subgroups.length) {
      for (const sg of sec.subgroups) {
        L.push(`### ${sg.sgid ? `${sg.sgid} — ` : ""}${sg.name}`);
        L.push("");
        L.push(sg.claim === NO_CLAIM ? "*(no SubGroupClaim)*" : sg.claim);
        L.push("");
        for (const m of sg.members) L.push(...memberBlock(m, 4));
      }
    } else if (sec.subgroups && sec.subgroups.length === 0) {
      // §12.1 v9's three states, unchanged by the multi-section form: a
      // judged-empty outcome and a SUPPRESSED split are not the same silence,
      // and neither is an absent judgment.
      if (sec.suppressed_split) {
        L.push("*The judgment produced a split and it was SUPPRESSED: its only named");
        L.push("SubGroup was labelled `other` — the residual, so the judge found no");
        L.push("subset of M or more members at loose-or-better affinity among them —");
        L.push("so it bought nothing and");
        L.push("does not discharge the subdivision obligation (SPEC-terrain §6.2 v7,");
        L.push("re-keyed and bounded at kogaki#683, relabelled at kogaki#738). This is neither");
        L.push("a judged-empty outcome nor an absent judgment. Members are listed below,");
        L.push("and none was dropped.*");
      } else {
        L.push("*The judgment produced NO split — this is a judged-empty outcome,");
        L.push("not an absent judgment. Members are listed below.*");
      }
      L.push("");
      for (const m of sec.members || []) L.push(...memberBlock(m, 3));
    } else {
      for (const m of sec.members || []) L.push(...memberBlock(m, 3));
    }
  }
  L.push("");
  L.push("## Counted");
  L.push("");
  for (const [fam, n] of Object.entries(report.counted || {})) L.push(`- ${fam}: ${n}`);
  // THE `- lessons served: <n>` LINE IS GONE (kogaki#761, owner ruling
  // 2026-09-01; report-format.json v16 retires its `counted_served` class in
  // the same act). It rendered the full served denominator — every candidate
  // in the survey record, not the members of this report — and the owner ruled
  // it must not be displayed.
  //
  // THE RECORD FIELD STAYS, and the split is the whole of why this is safe:
  // `report.lessons_served` is still written by both record builders — grep
  // `lessons_served:` for the pair; they are named by the FIELD rather than by
  // a line number, which this very edit would have shifted — so nothing
  // reading the machine record breaks. What is withdrawn is one line of the
  // OWNER SURFACE. A reader looking for the denominator finds it on the record
  // and not on the report, which is the state the ruling asks for.
  L.push("");
  L.push(...servedLinesBlock(report));
  // §13.1 v20 / §12 v8 (kogaki#473) — the provenance neighborhood, ONCE and
  // LAST. Conditional on the record carrying one: a record written before
  // this section existed renders without it — the ordinary
  // spec-ahead-of-code interval §13.7 names, read here from the record's own
  // shape rather than guessed. A NEW pull always carries the field, empty
  // enumeration included (§13.4's disclosure: an empty result renders its
  // explicit lines, never an absent section).
  if (report.neighborhood) {
    L.push("");
    L.push(...neighborhoodSection(report.neighborhood));
  }
  return L.join("\n") + "\n";
}

// THE MEMBER → SERVED-LINE MAP, SITED ONCE AT THE REPORT'S END (§12, line 805).
//
// This is the baseline's own siting — *"the shared pin stated once in the Full
// Report, with the member → served-line map at the report's end"*
// (wa#1115/#1116) — and until story 1.53 the renderer satisfied §12 by putting
// a `*Served line:*` row on every member instead. That per-member form is what
// kogaki#318 called the second name-shaped row, and the owner's story-1.53 SQ2
// ruling removed it.
//
// So the map MOVES rather than disappearing, and both halves matter: §14.3
// takes element NAMES off the owner surface, while §12 keeps the ADDRESS the
// report is accountable to. A cite is an address — it is what lets a reader
// check the report against the substrate — and dropping it from the rendering
// entirely would have made the owner rendering uncheckable without opening the
// machine record, which is a different decision from the one that was made.
//
// A member with no display_id or no cite is NAMED here rather than omitted:
// a map that silently skips its unmappable rows is the shape §2.1 forbids.
// THE PIN IS STATED ONCE, IN THE IDENTITY — so every other cite renders BARE
// (§12 v12, kogaki#315, story 1.56 AC5/AC6).
//
// A served cite arrives as `<file>:<line>@<pin>`; the `@<pin>` half is the
// substrate pin repeated. On a two-member report that was six pin-bearing
// lines where §12 registers one, and story 1.53 did not fix it — it moved the
// per-member `*Served line:*` row into a trailing map and carried the pin
// along, same count, different siting.
//
// `pin_once_per_file` could not see any of it: that rule counts occurrences of
// the `substrate_pin` LINE CLASS, so it read 1 and passed. The repair is here,
// at the emitters, rather than in a widened rule — which is why story 1.56
// AC5 asserts pin-once by COUNTING OCCURRENCES over the rendered bytes.
export function bareCite(cite) {
  if (cite === null || cite === undefined) return cite;
  const s = String(cite);
  const at = s.lastIndexOf("@");
  return at === -1 ? s : s.slice(0, at);
}

export function servedLinesBlock(report) {
  const rows = [];
  const seen = new Set();
  const collect = (m) => {
    if (!m || typeof m !== "object") return;
    const key = m.display_id || m.id || String(rows.length);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push([m.display_id || NO_DISPLAY_ID, bareCite(m.cite) || "⟨no served line recorded — ABNORMAL, never substituted⟩"]);
  };
  // MERGED ACROSS SECTIONS AND DEDUPED (§12 v7, kogaki#314). The map is sited
  // ONCE for the file, so a member entered under both `G5` and `G5-1` appears
  // in it once — `seen` above is what makes the merge honest rather than
  // merely shorter. A repeated per-section map is the class kogaki#315 named
  // unjustified.
  //
  // Both section shapes are walked, because a section renders EITHER SubGroups
  // or a flat member list and the map is owed by both.
  for (const sec of report.sections || []) {
    for (const sg of sec.subgroups || []) for (const m of sg.members || []) collect(m);
    for (const m of sec.members || []) collect(m);
  }
  // Pre-v7 records carried the members at the top level. Read them too, so a
  // record written before this change still renders its map rather than an
  // empty one — the specimen and any run-workspace record from today.
  for (const sg of report.subgroups || []) for (const m of sg.members || []) collect(m);
  for (const m of report.members || []) collect(m);

  const L = ["## Served lines", ""];
  if (rows.length === 0) {
    L.push("*No members in this report — the map is empty, stated rather than omitted.*");
    L.push("");
    return L;
  }
  L.push("| Member | Served line |");
  L.push("|---|---|");
  for (const [id, cite] of rows) L.push(`| ${id} | \`${cite}\` |`);
  L.push("");
  return L;
}

// ONE MEMBER, WHOLE (§12). The record carries six served fields per member —
// `id`, `cite`, `gloss`, `gloss_cite`, `journey_gloss`, `journey_cite` — and
// this is the surface §12 addresses when it says "the complete Lesson and
// Journey Glosses, with no truncation anywhere" and that the report "carries
// the member → served-line map in its member records".
//
// THE DEFECT THIS REPLACES. The previous renderer emitted `\`id\` — gloss` and
// dropped the other four. The live dogfood run of 2026-08-08 (kogaki#234
// comment 5223800169) found `grep -c "gloss/lessons/"` returning ZERO over
// every file in `reports/`, no Journey Gloss text anywhere, and a file that
// opened with `> Untruncated.` and printed `- journey: 1` in its Counted block
// while containing no journey. That is the kogaki#243 form-E shape exactly:
// the prose asserted a property no carrier held, and every §12.1 assertion
// stayed green because identity and idempotence are true of a rendering that
// drops its material.
//
// The member is a BLOCK rather than a list row because the property is
// UNTRUNCATED: a served Gloss body is multi-line prose, and a bullet row can
// only carry it by flattening or by cutting. A form that cannot hold the whole
// value is the truncation, one layer down from the code that does the cutting.
//
// ABSENCE IS STATED, never left as a gap. A member with no Journey and a
// member whose Journey went missing render differently, and neither renders as
// silence — the same rule §12.1 v9 applies to judged-empty SubGroups. Without
// it the Counted block's `journey: N` has nothing in the body to agree with,
// which is how the run above produced a count with no material behind it.
export function memberBlock(m, level) {
  const h = "#".repeat(Math.max(1, Math.min(6, level || 3)));
  // A non-object member is a malformed record, and it renders as that rather
  // than as its own string value — printing `String(m)` here was the one path
  // by which a bare `lesson:<slug>` could still reach the owner rendering
  // (§14.3).
  if (!m || typeof m !== "object") return [`${h} ${NO_DISPLAY_ID}`, ""];
  // §14.3 (story 1.53) — the heading is the plain display_id. It is read from
  // the member, which `reportMembers` fills from the survey record's candidate
  // entry; a member with none renders the ABNORMAL token and NEVER the slug,
  // because the slug is exactly what §14.3 removes and a silent fallback would
  // undo the change while looking like robustness.
  const L = [`${h} ${m.display_id || NO_DISPLAY_ID}`, ""];
  // THE `*Served line:*` ROW IS GONE, and this is the owner's answer to story
  // 1.53 SQ2 rather than an omission. kogaki#318 called the heading and this
  // row "two name-shaped rows where the owner ruled one plain ID suffices",
  // and the pair reading is the one that was chosen. Nothing is lost: the cite
  // stays in the machine record beside the full identity quadruple (AC6,
  // §12.2 v11, widened at kogaki#741), which is where a reader who needs the address goes. The Gloss cite
  // rows below are a different thing — they address the served GLOSS rendering
  // rather than naming the element — and they stay.
  L.push(m.gloss_cite ? `**Lesson Gloss** — \`${bareCite(m.gloss_cite)}\`` : "**Lesson Gloss** — *no served cite recorded*");
  L.push("");
  L.push(m.gloss !== undefined && m.gloss !== null ? String(m.gloss)
    : (m.claim !== undefined && m.claim !== null ? String(m.claim) : NO_GLOSS_BODY));
  L.push("");
  if (m.journey_gloss === undefined || m.journey_gloss === null) {
    L.push("**Journey Gloss** — *this member carries no Journey.*");
    L.push("");
  } else {
    L.push(m.journey_cite ? `**Journey Gloss** — \`${bareCite(m.journey_cite)}\`` : "**Journey Gloss** — *no served cite recorded*");
    L.push("");
    L.push(String(m.journey_gloss));
    L.push("");
  }
  return L;
}

// The identity QUADRUPLE (§12.1, widened from the triple at kogaki#741):
// substrate pin, co-tag query (selected tag, named group), judge pin, and the
// neighborhood judgment record — the last two typed `none` where no judged
// material is present. UNIFORM ARITY: `none` is a value that must be present, never an
// omitted component, because a key whose shape depends on the report's own
// content is one a request cannot construct.
// §12 v6 (kogaki#314) — the query component is `{ tag, ids }`, the ids
// CANONICAL. Idempotence is set-based: two typings of the same set in
// different orders are ONE artifact, which is what makes a re-request return
// the same report rather than a second one.
export function reportIdentity(pin, tag, ids, judgePin, neighborhoodJudgment) {
  return {
    pin,
    query: { tag, ids: canonicalIds(ids) },
    judge_pin: judgePin || NO_JUDGE,
    // THE FOURTH COMPONENT (§12.1, kogaki#741). The digest of the neighborhood
    // judgment record this report was rendered from, or the typed `NO_JUDGE`
    // where none was supplied. Typed-and-present rather than omitted, exactly
    // as `judge_pin` is: §12.1's uniform arity means a requester forms the key
    // from inputs it holds, never by hashing the report it is addressing.
    neighborhood_judgment: neighborhoodJudgment || NO_JUDGE,
  };
}

// The filename is derived from the identity ONLY so that reruns collide on
// disk. Nothing reads it: §12.2 makes the recorded components the sole source
// of identity, and this hash is not parsed back anywhere.
function identityDigest(identity) {
  return createHash("sha256")
    .update(JSON.stringify(reportIdentityKey(identity)))
    .digest("hex").slice(0, 16);
}

// THE COMPOSED-INPUT DIGEST (§12.1, kogaki#700). The identity names the substrate
// pin, the query and the judge pin — and NOT the composed inputs, which §12.1
// ratifies in as many words ("Nothing else enters the key: not the composed
// claims, not the run"). Those inputs nonetheless decide what the artifact says,
// so a rerun supplying different ones had the same identity and a different
// rendering, and the idempotent-rerun branch replayed the stored one. Measured on
// all three: a changed `--claims` re-rendered the first claim, a changed
// `--subdivisions` rendered no SubGroup, and a judged `--neighborhood` pull of a
// set already reported unjudged rendered the unjudged form.
//
// THE DIGEST IS RECORDED, NOT KEYED, which is the served discipline rather than a
// compromise between the two arms: a rendering is pinned to the sha of the content
// it was made from, and a mismatch RE-SURFACES rather than silently re-rendering.
// consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/articles.md:118
//
// FILE BYTES RATHER THAN A PARSE, deliberately. It is literally "the content it
// was made from", it adds no second parse of an artifact the run already read
// through its own reader, and it cannot drift from whatever those readers accept.
// The cost is stated: a whitespace-only reformat of an input refuses a rerun that
// would have rendered identically. That is a false refusal and never a false
// render, and the record cannot know the edit was insignificant.
// `neighborhood-candidates` joined the set with kogaki#700: once the pull
// consumes the emitter's persisted enumeration, that file decides what the
// artifact says exactly as the three original inputs do.
// `neighborhood` LEFT THIS SET at kogaki#741 and is now KEYED, per §12.1's
// quadruple. The rest stay RECORDED — kogaki#700's arm is untouched for them,
// and `COMPOSED_INPUT_MISMATCH` still fires on a changed `--claims`. The
// discriminator is membership: a claims or subdivisions record changes what a
// group SAYS about members the query already fixed, while the judgment record
// decides WHICH CANDIDATES ARE DISPLAYED AT ALL.
export const COMPOSED_INPUT_FLAGS = ["claims", "subdivisions", "neighborhood-candidates"];
export function composedInputDigests(args) {
  const out = {};
  for (const flag of COMPOSED_INPUT_FLAGS) {
    const path = args[flag];
    out[flag] = path
      ? createHash("sha256").update(readFileSync(String(path))).digest("hex").slice(0, 16)
      : NO_JUDGE;
  }
  return out;
}

// WHICH INPUTS DIFFER, named rather than counted — a refusal telling an operator
// only THAT something changed leaves them diffing three files to find out which.
export function composedInputDelta(prior, current) {
  if (!prior || typeof prior !== "object") return null;
  // A PRIOR RECORD MISSING A FLAG PREDATES THAT FLAG (kogaki#700). The
  // record-level rule already recomputes where the whole field is absent;
  // a per-flag absence is the same situation one key down — a record written
  // before the flag existed cannot be shown idempotent against it, and
  // refusing would fail a rerun that has done nothing wrong. Null means
  // recompute, exactly as it does for the record-level absence.
  if (COMPOSED_INPUT_FLAGS.some((f) => prior[f] === undefined)) return null;
  return COMPOSED_INPUT_FLAGS.filter((f) => prior[f] !== current[f]);
}

export function sameIdentity(a, b) {
  return JSON.stringify(reportIdentityKey(a)) === JSON.stringify(reportIdentityKey(b));
}
function reportIdentityKey(i) {
  return [i.pin, i.query.tag, i.query.ids,
    i.judge_pin === NO_JUDGE ? NO_JUDGE
      : `${i.judge_pin.model_id}/${i.judge_pin.effort_tier}`,
    // §12.1's fourth component (kogaki#741). A record written before the field
    // existed carries `undefined` here and hashes as `NO_JUDGE`, which is what
    // it meant: no neighborhood judgment entered its identity.
    i.neighborhood_judgment === undefined ? NO_JUDGE : i.neighborhood_judgment];
}

// THE ENTERED ID SET, RESOLVED AND CANONICALISED (§12 v6, kogaki#314).
//
// The owner reads a screen and types `G10,G5-1,G5-2`. Those ids resolve
// against THE GROUPS THIS RUN COMPOSES and nothing else — story 1.56 AC11
// makes an id valid for the run that printed it, because a pin advance may
// renumber, so a cached numbering would silently resolve to the wrong Strands.
//
// THE SORT IS NUMERIC-AWARE, and this is the part a plain reading gets wrong.
// `G5-1` comes before `G10`: lexicographically `"G10" < "G5-1"`, which would
// render a screen's tenth group above its fifth. Compare the numeric
// components, never the raw string.
//
// CANONICAL, so identity is SET-BASED (§12 v6): two typings of the same ids in
// different orders are ONE artifact, which is what makes a re-request return
// the same report rather than a second one. The cost is stated in the spec —
// section order is canonical, not entry order.
export function idSortKey(id) {
  const m = /^G([0-9]+)(?:-([0-9]+))?$/.exec(id);
  if (!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, id];
  return [Number(m[1]), m[2] === undefined ? -1 : Number(m[2]), ""];
}

export function canonicalIds(ids) {
  return [...new Set(ids)].sort((a, b) => {
    const ka = idSortKey(a), kb = idSortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1] || String(ka[2]).localeCompare(String(kb[2]));
  });
}

// Resolve each entered id to a Group or a SubGroup of this screen.
//
// A SubGroup id brings ITS SubGroup, not its parent (AC7): entering `G5` and
// `G5-1` together is admissible and renders both, with `G5-1`'s members
// appearing under each — a COVER, not a duplication (§2.1).
function resolveEnteredIds(entered, groups, subOf) {
  const known = [];
  const byId = new Map();
  for (const g of groups) {
    known.push(g.gid);
    byId.set(g.gid, { kind: "group", gid: g.gid, group: g });
    // SubGroup ids are derived exactly as the screen derives them: the
    // parent's gid plus a 1-based index over `subgroupPlacement`'s output.
    const entry = subOf ? subOf(g) : null;
    if (entry && entry.subgroups && entry.subgroups.length) {
      const placed = subgroupPlacement(g, entry.subgroups, SURVEY_SCHEMA.subdivision);
      placed.subgroups.forEach((sg, i) => {
        const sgid = `${g.gid}-${i + 1}`;
        known.push(sgid);
        byId.set(sgid, { kind: "subgroup", gid: sgid, group: g, sg });
      });
    }
  }
  const canon = canonicalIds(entered);
  const missing = canon.filter((id) => !byId.has(id));
  if (missing.length) {
    // AC5 — a refusal that does not say what WAS available sends the owner
    // back to re-read a screen they already read.
    fail(`report --ids names ${missing.join(", ")}, which resolve to no Group or SubGroup on this screen. `
      + `The ids that do resolve are: ${canonicalIds(known).join(", ")}. `
      + "Ids are valid for the run that printed them (story 1.56 AC11): a pin advance may renumber, so re-read the screen rather than reusing an older list.");
  }
  return { canonical: canon, targets: canon.map((id) => byId.get(id)) };
}

// §12.3 — reading and REFUSING the Thesis-candidate input (kogaki#760).
//
// EVERY BOUND IS A RUNTIME REFUSAL, and that siting is the finding rather than
// a preference. `full_report`'s `line_class_allowlist` is INERT — three of its
// body classes (`group_claim_body`, `subgroup_claim_body`, `member_gloss_body`)
// are bare placeholders admitting any line, which the grammar's own reader
// notes record — so a grammar class declared for this section polices its FORM
// and cannot carry the count, the arity or the membership. A class asserted as
// their carrier would read as coverage while checking nothing:
//
//   "the load-bearing half of an enumerated prohibition is its NON-MEMBER
//    FALLBACK: a carrier keyed to the DECLARED instance bounds ARITY while
//    leaving KIND admit-by-default, and because the carrier visibly works the
//    enumeration reads as coverage."
//   consulted: product-lab@ed0873dc topics/claude-code-ops.md:142
//
// THE COUNT IS EXACT, NOT A MAXIMUM. `limits.thesis_candidates` is read from
// the grammar and never written here — a second literal would be the
// two-carriers-of-one-number shape, and the number is exactly the kind of
// value that drifts silently when copied.
//
// THE MEMBER SET IS THIS REPORT'S, not the survey's. A candidate may only
// point at Strands the owner is actually reading in this file; an id that is a
// perfectly good display id elsewhere in the record is still a refusal here,
// because the section exists to let the owner combine what is in front of them.
export function readThesisCandidates(raw, memberDisplayIds, limits) {
  const want = Number((limits || {}).thesis_candidates);
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    fail("--thesis-candidates must be a JSON array of {claim, strands} objects (SPEC.md §12.3)");
  }
  if (!Number.isFinite(want)) {
    // A bound the grammar does not carry cannot be evaluated, and guessing one
    // here would be this file inventing a number the owner sets.
    fail("report-format.json declares no numeric `limits.thesis_candidates`, so the Thesis-candidate "
      + "count cannot be evaluated; a count guessed in the runtime would be the runtime inventing the "
      + "boundary the owner set");
  }
  if (raw.length !== want) {
    fail(`--thesis-candidates carries ${raw.length} candidate(s) and \`limits.thesis_candidates\` is ${want}. `
      + "The count is EXACT rather than a maximum (SPEC.md §12.3): a section whose length varies run to run "
      + "cannot be read as a fixed early image. Compose exactly " + want + ", or amend the limit in "
      + "specs/spec-terrain/report-format.json on its own licensing issue.");
  }
  const members = new Set(memberDisplayIds);
  return raw.map((c, i) => {
    const at = `--thesis-candidates[${i}]`;
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      fail(`${at} must be an object carrying "claim" and "strands" (SPEC.md §12.3)`);
    }
    const claim = c.claim;
    if (typeof claim !== "string" || claim.trim() === "") {
      fail(`${at} carries no "claim" text (SPEC.md §12.3: one sentence per candidate)`);
    }
    if (/\n/.test(claim)) {
      // One RENDERED line per claim: a newline would emit a line no class
      // admits, and the emit-time refusal would then report the surface rather
      // than the input that caused it.
      fail(`${at}'s claim spans more than one line. §12.3 renders one line per candidate, so a `
        + "multi-line claim would emit a line no grammar class admits and the refusal would name the "
        + "surface rather than this input.");
    }
    const strands = c.strands;
    if (!Array.isArray(strands) || strands.length < 2 || strands.length > 8) {
      fail(`${at} carries ${Array.isArray(strands) ? strands.length : "no"} strand(s); §12.3 requires 2 to 8. `
        + "One strand is not a combination and nine is not an early image.");
    }
    const unknown = strands.filter((x) => !members.has(x));
    if (unknown.length) {
      fail(`${at} names ${unknown.join(", ")}, which ${unknown.length === 1 ? "is" : "are"} not a member of THIS report. `
        + `The display ids this report carries are: ${[...members].join(", ")}. `
        + "A candidate may only combine Strands the owner is reading in this file (SPEC.md §12.3) — an id that "
        + "resolves elsewhere in the survey record is still refused here.");
    }
    const dup = strands.filter((x, j) => strands.indexOf(x) !== j);
    if (dup.length) {
      fail(`${at} names ${[...new Set(dup)].join(", ")} more than once. A repeated strand inflates the `
        + "combination without adding to it.");
    }
    return { claim, strands: [...strands] };
  });
}

function cmdReport(args) {
  retireLegacyReportsDir();
  const dir = reportsDir(args);
  const record = readJson(String(args.survey || fail("report needs --survey <file>")));
  const tag = String(args.tag || fail("report needs --tag <selected tag>"));
  // §11 v5 / §12 v6 (kogaki#314): the owner enters a G/SG ID SET and ONE report
  // covers exactly it. `--all-groups` and `--group` are GONE, not deprecated —
  // leaving the eager flag reachable would leave the over-generation the
  // decision removes one argument away, on precisely the 11-group screen that
  // filed the issue.
  if (args["all-groups"] !== undefined || args.group !== undefined) {
    fail("report no longer takes --all-groups or --group. SPEC.md §11 v5 (kogaki#314) supersedes eager per-group generation: enter the Group/SubGroup IDs you want, e.g. `report --tag <T> --ids G10,G5-1,G5-2`, and ONE report covers exactly those.");
  }
  const idsArg = String(args.ids || fail("report needs --ids <G/SG list>, e.g. --ids G10,G5-1 (SPEC.md §12 v6: one report over the entered ID set)"));
  const enteredIds = idsArg.split(",").map((x) => x.trim()).filter(Boolean);
  if (enteredIds.length === 0) {
    // SQ3, answered: an empty set REFUSES rather than producing an empty
    // report. "The owner entered nothing" and "the owner wants a report of
    // nothing" are different, and the second is not a thing §12 can render —
    // a report with no material has no identity worth colliding on.
    fail("report --ids was empty. An empty ID set is not a report of nothing: enter at least one Group or SubGroup ID from the screen.");
  }

  const { groups, targets, resolved, subOf } = resolveReportTargets(record, tag, enteredIds, args);
  // THE SECOND READER OF THE SAME ARTIFACT (§11 v10, kogaki#212). `cotags` and
  // `report` are handed the same `--claims` file, so migrating one and leaving
  // the other reading the flat map would put two encodings behind one file —
  // the defect §12.1 v9 fixed for `--subdivisions` by migrating both readers in
  // one change. `report` does not re-run the subset check (that is the screen's
  // gate, and it has already refused there) but it MUST read the same shape, or
  // a typed record would silently render every group's claim as absent.
  const { claims } = readClaimsRecord(
    args.claims ? readJson(String(args.claims)) : null, record);
  // `subOf` comes back from the resolver rather than being rebuilt here: it
  // already parsed `--subdivisions` to resolve SubGroup ids, and a second parse
  // with a second closure is the duplication the extraction exists to remove
  // (PR #701 round 1).
  // The groups the entered set reaches — used by the judge-pin and
  // subdivision-completeness gates below, which are per-GROUP checks.
  const targetGroups = [...new Map(targets.map((t) => [t.group.gid, t.group])).values()];

  // THE JUDGE PIN IS REQUIRED UNCONDITIONALLY (§12.1 v9, kogaki#199), not only
  // when a target carries SubGroupClaims. "Required" governs the JUDGMENT, so
  // every report the required path produces has a judge — and the previous
  // gating on `targets.some(subOf)` is exactly what let a judged-but-empty
  // group be minted with `none`, recording the conformant case as the
  // violation. Validated BEFORE any write: a refusal that had already written
  // some of its targets would be a partial pass presenting as one.
  const m = args["judge-model"];
  const e = args["judge-effort"];
  if (!m || !e) {
    fail("--judge-model and --judge-effort are required for EVERY report invocation "
      + "(SPEC.md §12.1 v9). A co-tag-generated Full Report may never mint a judge pin "
      + "of `none`: judged-with-no-split and never-judged are different states, and a "
      + "report carrying `none` is indistinguishable from a run that never asked");
  }
  const suppliedJudge = { model_id: String(m), effort_tier: String(e) };

  // EVERY TARGET MUST BE JUDGED. An absent entry is `not judged`, and the
  // co-tag path refuses it rather than minting `none` for it — the whole of
  // what §12.1 v9 forbids.
  const unjudged = targetGroups.filter((g) => subOf(g) === null).map((g) => g.name);
  if (unjudged.length) {
    fail(`--subdivisions carries no entry for ${unjudged.join(", ")}. On the co-tag path `
      + `every group is judged (§6.2), so a missing entry cannot be recorded: write `
      + `{"judged": true, "subgroups": []} for a group whose judgment found no subdivision`);
  }

  // §12.3 (kogaki#760) — READ AND REFUSED HERE, before any generation runs, so
  // the three bounds are checked while nothing has been written. The member set
  // is THIS report's rendered display ids, which is why it is computed from the
  // resolved targets rather than from the survey record.
  // KEYED ON `t.kind`, LIKE THE TWO OTHER READERS OF THIS SHAPE. The first
  // version tested `t.subgroup`, a field `resolveEnteredIds` never sets — the
  // resolver puts the SubGroup on `t.sg` — so the ternary was always false and
  // a `--ids G5-1` report validated candidates against the WHOLE PARENT GROUP.
  // The refusal then admitted display ids the rendering does not carry, which
  // is the coverage-shaped failure this very section cites
  // `product-lab@ed0873dc topics/claude-code-ops.md:142` against, produced by
  // the code that cites it. Caught by PR #763 round 1; the refusal block below
  // gains a SubGroup-target case, because all five of its original cases ran
  // `--ids G2` and none could have gone red on this.
  const reportMemberIds = [...new Set(
    targets.flatMap((t) => (t.kind === "subgroup" ? t.sg.members : t.group.members)))]
    // `displayIdOf` returns the ABNORMAL sentinel rather than a falsy value
    // for a record predating §14.3, so it is excluded by NAME. A `filter(Boolean)`
    // would keep it and the sentinel would then read as an admissible strand id.
    .map((mid) => displayIdOf(mid, record.candidates))
    .filter((d) => d && d !== NO_DISPLAY_ID);
  const thesisCandidates = readThesisCandidates(
    args["thesis-candidates"] ? readJson(String(args["thesis-candidates"])) : null,
    reportMemberIds, loadGrammar(REPORT_FORMAT).limits || {});

  // One shard fetch for the whole invocation — tag-scoped and bounded (§9),
  // shared across every target group.
  let bodies = null;
  const fetchBodies = () => {
    if (bodies) return bodies;
    const lessonBodies = fetchGlossBodies("lessons", tag);
    const journeyBodies = targetGroups.some((g) => g.members.some((id) => (record.candidates.find((c) => c.id === id) || {}).journey))
      ? fetchGlossBodies("journeys", tag) : new Map();
    bodies = { lessonBodies, journeyBodies };
    return bodies;
  };

  // ONE report over the whole entered set (§12 v6/v7) — not one per group.
  generateReport(targets);

  function generateReport(entered) {
  // §12 v7 — ONE report over the entered set. The identity is the set; each
  // entered id becomes one SECTION, and the identity block, Counted and
  // Served lines appear once for the file.
  // THE NEIGHBOURHOOD JUDGMENT IS THE FOURTH COMPONENT (§12.1, kogaki#741), so
  // it is hashed INTO the identity rather than beside it. Same reading as
  // `composedInputDigests` takes — the record's file bytes — so the two cannot
  // disagree about what "this input" is.
  // A RECORD-JOINED PATH THAT NO LONGER RESOLVES REFUSES BY NAME (§13.4,
  // kogaki#741 acceptance 2). The run record stores the judgment file's PATH,
  // so a rerun reads the file again — and deleting it between J3 and the render
  // must fail loudly rather than render an unjudged section. Left to the digest read below or to `readJson`
  // this surfaces as an uncaught ENOENT, which is loud but names neither the
  // state nor the repair, so the check is made HERE — ahead of the
  // digest read, which is the first line that touches the file — and typed.
  if (args.neighborhood && !existsSync(String(args.neighborhood))) {
    fail(`the neighborhood judgment record this pull joins is gone: ${String(args.neighborhood)} `
      + "does not exist. The run record names it, so J3_neighborhood ran and its file was removed "
      + "afterwards. Re-enter J3_neighborhood rather than re-rendering — §13.4 has no path to an "
      + "unjudged neighborhood rendering, and joining nothing here would be one.");
  }
  const neighborhoodJudgmentDigest = args.neighborhood
    ? createHash("sha256").update(readFileSync(String(args.neighborhood))).digest("hex").slice(0, 16)
    : NO_JUDGE;
  const identity = reportIdentity(record.pin, tag, resolved.canonical, suppliedJudge,
    neighborhoodJudgmentDigest);
  // Computed BESIDE the identity and never inside it (§12.1, kogaki#700): the
  // claims and subdivisions ride the record. The neighborhood judgment no
  // longer does — it moved into the key above.
  const composedInputs = composedInputDigests(args);
  const sectionsOut = [];
  let abnormalTotal = 0;
  const allMemberIds = [];

  function buildSection(t) {
  const group = t.group;
  const groupClaim = claims[group.name] !== undefined ? claims[group.name] : claims[group.cotag];
  const sub = subOf(group);
  // Unconditional now: `sub` is non-null for every target (refused above), and
  // NO_JUDGE is never minted here. It stays exported and valid in the identity
  // triple — §12.1's uniform arity is untouched and `(pin, query, none)` is
  // still constructible by a requester who does not hold the report.
  const { lessonBodies, journeyBodies } = fetchBodies();

  let abnormal = 0;
  const renderMembers = (ids) => ids.map((id) => {
    const c = record.candidates.find((x) => x.id === id) || {};
    const lg = lessonBodies.get(c.slug);
    const jg = c.journey ? journeyBodies.get(c.slug) : null;
    if (!lg) abnormal++;
    if (c.journey && !jg) abnormal++;
    return {
      id, cite: c.cite || null,
      // §14.3 — resolved from `record.candidates` AT RENDER TIME. The record
      // is the map (AC3); this is a projection of it onto the member being
      // rendered, not a second map written beside it, and nothing reads it
      // back. `null` when the record predates §14.3, which `memberBlock`
      // renders as the stated abnormality rather than as the slug (AC7).
      display_id: c.display_id || null,
      gloss: lg ? lg.body : NO_GLOSS_BODY,
      gloss_cite: lg ? lg.cite : null,
      journey_gloss: c.journey ? (jg ? jg.body : NO_GLOSS_BODY) : null,
      journey_cite: c.journey && jg ? jg.cite : null,
    };
  });

  // JUDGED-EMPTY IS ZERO SubGroupClaims, and it is still handled before
  // `subgroupPlacement` (§12.1 v9). The reason CHANGED at kogaki#738 and the
  // branch did not: the placement used to sweep every member into a catch-all on
  // an empty list, manufacturing a SubGroup the judgment never made; now it
  // REFUSES on an empty list, naming every member of the group. Judged-empty is
  // a legitimate outcome and must reach neither, so the guard stays exactly
  // where it was.
  let subgroups = null;
  // §6.2 v7 / §12.1 v9's THIRD state. Set where the suppression is decided and
  // read by the renderer — PR #356 round 1 finding 2 found the read with no
  // writer, so the branch was unreachable and a suppressed section rendered
  // "the judgment produced NO split", which is false of it. That is the
  // carrier-with-no-input shape, and it read as fixed.
  let suppressedSplitHere = false;
  if (sub && sub.subgroups.length === 0) {
    subgroups = [];
  } else if (sub) {
    const placed = subgroupPlacement(group, sub.subgroups, SURVEY_SCHEMA.subdivision);
    // §6.2 v7 RULE 3 BINDS THIS SURFACE TOO, and it did not until PR #355
    // round 1 finding 1. The rule reads unconditionally — "the group renders no
    // SubGroups" — and story 1.57 implemented the suppression only in
    // `cmdCotags`, so one run's two owner surfaces disagreed: the screen showed
    // the group flat while the report still carried the SubGroups the screen
    // had suppressed. An owner copying a G-id between them would have found two
    // different structures under it, which is the divergence kogaki#317 minted
    // the ids to prevent.
    //
    // The judgement runs HERE rather than being read off the screen, because
    // the two surfaces share the subdivision record and nothing else — reading
    // the screen's verdict would be a second carrier. Same input, same
    // `judgeSubgroup`, same conclusion.
    for (const sg of placed.subgroups) judgeSubgroup(sg, groupClaim, group.members.length);
    // EVERY SubGroup IS NAMED BY THE JUDGE (kogaki#738): the catch-all filter
    // that stood here excluded a bucket the engine composed, and that bucket is
    // deleted.
    const namedSg = placed.subgroups;
    // The record half of §6.2 v7 rule 3, re-keyed and bounded exactly as the
    // screen's is — same input, same conclusion, one rule (kogaki#683, #738).
    if (namedSg.length === 1 && namedSg[0].verdicts
        && namedSg[0].verdicts.coherence === "other"
        && group.members.length < SUBDIVISION_REQUIRED_AT) {
      // Rendered as judged-empty in SHAPE, and flagged so the renderer can
      // tell it from a genuine no-split. `[]` and not `null` — §12.1 v9 keeps
      // judged-empty distinguishable from unjudged, and this group WAS judged.
      subgroups = [];
      suppressedSplitHere = true;
    } else {
    // §6.2 v6 — the SubGroupID is derived the same way the screen derives it:
    // the parent's GroupID plus a 1-based index over the SAME `subgroupPlacement`
    // output in the same order. That is what makes AC4 hold — an owner copying
    // `G2-1` off the screen finds `G2-1` in the report — without either surface
    // reading an id the other stored, which would be the second carrier.
    subgroups = placed.subgroups.map((sg, i) => ({
      name: sg.name,
      sgid: `${group.gid}-${i + 1}`,
      claim: sg.claim || NO_CLAIM,
      members: renderMembers(sg.members),
    }));
    }
  }

  const sectionMembers = t.kind === "subgroup" ? t.sg.members : group.members;
  allMemberIds.push(...sectionMembers);
  abnormalTotal += abnormal;
  return {
    // §12 v7 — one section per entered id, KEYED BY THE ID so an owner can
    // match a section to what they typed.
    id: t.gid,
    name: t.kind === "subgroup" ? t.sg.name : group.name,
    kind: t.kind,
    claim: t.kind === "subgroup"
      ? (t.sg.claim || NO_CLAIM)
      : (groupClaim !== undefined && String(groupClaim).trim() !== "" ? groupClaim : NO_CLAIM),
    // A SubGroup section carries ITS members (AC7), never its parent's.
    subgroups: t.kind === "subgroup" ? null : subgroups,
    // The field the renderer reads to pick the third-state notice.
    suppressed_split: t.kind === "subgroup" ? false : suppressedSplitHere,
    members: t.kind === "subgroup"
      ? renderMembers(t.sg.members)
      : (subgroups && subgroups.length ? null : renderMembers(group.members)),
    counted: familySplit(sectionMembers, record.candidates),
  };
  }

  for (const t of entered) sectionsOut.push(buildSection(t));

  // THE SPLIT REQUIREMENT REACHES THIS SURFACE TOO (§8 v30, kogaki#683; PR #705
  // round 1). Disposition 1 refuses a judged-empty outcome for a group at or
  // above the threshold, and the `subdivision_required_at_ten` grammar rule
  // carries that on `cotag_screen`. It cannot carry it here: `full_report`'s
  // section heading renders no LessonCount, and that surface's line-class
  // allowlist is INERT by the grammar's own record — three body classes are
  // bare placeholders, so no line on it can be unadmitted. A rule declared over
  // a surface that cannot refuse would be coverage in name only.
  //
  // So the carrier here is a PRE-RENDER refusal, which is the same class in the
  // sense the disposition names — engine-side, at emit, no model discretion —
  // reached by the route this surface actually has. The runtime's declining to
  // suppress at the threshold closes the SUPPRESSION route; this closes the
  // judge-supplied-empty route, which is the one a record can walk in with.
  //
  // SCOPED TO GROUP SECTIONS. A section keyed by a SubGroup id carries that
  // SubGroup's members and `subgroups: null`; §8's requirement is on composed
  // GROUPS, so the test reads the empty-array state that only a judged group
  // reaches, and a suppressed split is excluded because suppression is already
  // unavailable at this size.
  for (const sec of sectionsOut) {
    if (sec.subgroups && sec.subgroups.length === 0 && !sec.suppressed_split
        && (sec.members || []).length >= SUBDIVISION_REQUIRED_AT) {
      fail(`${sec.id} — ${sec.name} holds ${(sec.members || []).length} member Lessons and its judgment produced NO split. `
        + `At ${SUBDIVISION_REQUIRED_AT} or more, serving SubGroups is the engine's requirement rather than the judge's `
        + "discretion (SPEC-terrain §8 v30, kogaki#683), so a judged-empty outcome for such a group does not render. "
        + "Recompose the subdivision for this group and pull the report again.");
    }
  }

  // §12.1 case 1: same identity, run twice -> ONE report. The rerun is
  // idempotent, not a duplicate, so an existing report with THIS identity is
  // returned rather than rewritten.
  const out = join(dir, `terrain-full-report-${identityDigest(identity)}.json`);
  if (existsSync(out)) {
    const prior = readJson(out);
    // A PRE-#741 RECORD IS NEVER REPLAYED (PR #756 round 1). `reportIdentityKey`
    // hashes an ABSENT fourth component as `NO_JUDGE`, which is what it meant —
    // but it makes a stored record written under the superseded design match a
    // pull carrying no judgment, and its stored rendering may hold the very
    // unjudged section §13.4 now has no path to. Falling through RECOMPUTES,
    // which reaches the refuse-unjudged guard below and refuses exactly when the
    // enumeration is non-empty; it is the same treatment `composedInputDelta`
    // gives a record predating ITS field, for the same reason — a record that
    // cannot be shown idempotent is recomputed rather than replayed.
    const priorPredatesJudgmentKey = prior.identity
      && prior.identity.neighborhood_judgment === undefined;
    if (sameIdentity(prior.identity, identity) && !priorPredatesJudgmentKey) {
      // THE COMPOSED INPUTS ARE COMPARED BEFORE THE REPLAY (§12.1, kogaki#700).
      // Same identity is not the same artifact when the inputs it was rendered
      // from differ: the CLAIMS and SUBDIVISIONS stay recorded rather than keyed
      // (the neighborhood judgment left this list at kogaki#741 and is now part
      // of the identity), so their mismatch surfaces here rather than by
      // widening the key further.
      const delta = composedInputDelta(prior.composed_inputs, composedInputs);
      if (delta === null) {
        // A RECORD WRITTEN BEFORE THIS FIELD EXISTED CANNOT BE SHOWN IDEMPOTENT,
        // so it is RECOMPUTED rather than replayed or refused. Replaying would
        // be the defect this clause removes, on exactly the records most likely
        // to predate the inputs in hand; refusing would fail a rerun that has
        // done nothing wrong. Recomputing is safe because §12.1 case 1 is a
        // claim about the report, not about the write: one identity, one file,
        // rewritten in place.
      } else if (delta.length) {
        fail(`COMPOSED_INPUT_MISMATCH — this identity was already reported from different composed input(s): `
          + `${delta.join(", ")}. The identity is the substrate pin, the query, the judge pin and the neighborhood `
          + "judgment record (SPEC-terrain §12.1, widened at kogaki#741), "

          + "and the composed inputs are NOT part of it — so replaying the stored rendering would render material this "
          + "invocation did not supply, while reporting success. Re-run against a fresh --report-dir to render the new "
          + "inputs as their own report, or restore the inputs this identity was reported from.");
      } else {
        // IDEMPOTENT ON THE RECORD, AND THE RENDERING IS STILL WRITTEN IN THIS
        // ACT (§12.2 v11: "Both are written in the same act"). Idempotence is a
        // claim about the RECORD — one identity, one report — and the rendering
        // is a pure function of that record, so re-deriving it is the same
        // artifact rather than a second one. Writing it rather than skipping it
        // is what makes a rerun self-healing: the rendering's lifetime is the
        // OWNER's (§2.5.1), so it can be deleted, be stale from an older
        // renderer, or never have existed because the first run passed
        // `--no-render`, and none of those are states a second run should leave
        // standing while reporting success.
        // §14.2 — the rerun path refuses on exactly the same grammar as the fresh
        // one. It is the path a SECOND look always takes, and it is the path that
        // shipped the last two clause-3 defects; a guard installed on the fresh
        // write alone would be the same half-fix again.
        //
        // VALIDATED OUTSIDE the `--no-render` branch, symmetrically with the
        // fresh path (PR #352 round 1). The asymmetry was against this change's
        // own stated ground: the rendering is a pure function of the record, so a
        // record that renders nonconformantly IS one, and whether the owner asked
        // for the file cannot be what decides if it is checked.
        const priorText = renderReportMarkdown(prior, tag);
        let priorRendered = null;
        if (!args["no-render"]) {
          // §15.5 v28 — THE RERUN IS A WRITE, so it carries the write authority
          // (PR #702 round 1, finding 1). This branch's own header already warns
          // that it "is the path a SECOND look always takes, and it is the path
          // that shipped the last two clause-3 defects; a guard installed on the
          // fresh write alone would be the same half-fix again" — and the first
          // cut of #681 installed exactly that half-fix, one clause below the
          // sentence saying not to. A standalone `report` repeated for an
          // identity already on disk landed reports/FullReport.md from outside
          // any writing state, which is #680's specimen at the artifact this
          // amendment claims to have closed.
          refuseUnauthorizedOwnerWrite(renderingDestination(args), "FullReport.md");
          // §12.2 v12 — ONE owner rendering, a fixed human name, overwritten per
          // pull. Identity stays in the record alone; the filename carries none.
          priorRendered = join(renderingsDir(args), "FullReport.md");
        }
        emitOrRefuse("full_report", priorText,
          (text) => { if (priorRendered) writeFileSync(priorRendered, text); });
        console.log("Full Report already exists for this identity — the rerun is IDEMPOTENT, "
          + "not a duplicate (SPEC.md §12.1).");
        announceArtifacts(priorRendered, out);
        console.log(`Identity: pin=${identity.pin} query=(${tag}, ${identity.query.ids.join(", ")}) judge=${identity.judge_pin === NO_JUDGE ? NO_JUDGE : `${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}`}`);
        // RETURNS WHAT THIS BRANCH WROTE (PR #667 round 2, carried to kogaki#625).
        // It `return`ed undefined after writing `reports/FullReport.md`, so the
        // executor's `written || null` mapped a real owner artifact to
        // `{ artifact: null }` and `classifyWriteOutcome` reported `wrote-nothing`
        // — the run record skipped its `artifacts_written` push for a state that
        // did write. §12.1's idempotence is a claim about the RECORD, and the
        // branch's own text says so ("the rendering is STILL WRITTEN IN THIS
        // ACT"); under-reporting the write is the same defect as asserting one,
        // facing the other way. Under `--no-render` `priorRendered` is null, which
        // is the genuine wrote-nothing case and still reports as one.
        return priorRendered;
      }
    }
  }


  // THE PROVENANCE NEIGHBORHOOD — ONE ENUMERATION (kogaki#700). Where the
  // run's emitter (`neighborhood_input`) persisted the enumeration, the pull
  // CONSUMES it rather than calling `neighborhoodForTargets` again: the
  // emitter's file is what J3 admitted judgment keys against, and a second
  // live read here is how a key admitted against enumeration A could be
  // absent from enumeration B and silently dropped, the section then
  // reporting the judgment layer as not having run. Only a pull with no
  // emitted enumeration — the unjudged flow, which has no admitted keys to
  // stay consistent with — computes fresh, inside the pull, seeded by the
  // entered set (§13.2), after every refusal above so a refused pull pays no
  // seam call. Either way the result is stored IN THE RECORD, so the
  // rendering stays a pure function of the record (§12.1) — a section
  // recomputed from the live seam at render time would let a moved serving
  // change what an unchanged identity renders.
  const candPath = args["neighborhood-candidates"];
  const neighborhood = candPath
    ? (readJson(String(candPath)).neighborhood
        || fail("the candidate record at " + String(candPath) + " predates the full-enumeration "
          + "field (kogaki#700) and cannot supply the pull's mechanical layer. Re-enter "
          + "neighborhood_input so the emitter writes the enumeration the pull consumes; "
          + "recomputing here would be the second enumeration this field exists to remove."))
    : neighborhoodForTargets(record, targets);
  // THE JUDGMENT LAYER, joined onto the mechanical candidates by slug. A
  // candidate with no judgment keeps none — `neighborhoodScreen` counts it as
  // unjudged and says so, rather than defaulting it to a level nobody assigned.
  // `full_report` REFUSES AN UNJUDGED NEIGHBORHOOD (§13.4, kogaki#741 ruling 2).
  // Scoped to a NON-EMPTY enumeration, mirroring the orphan refusal below: where
  // the mechanical layer returned no candidate there is nothing to judge, and
  // refusing would turn a legitimate empty neighborhood into an error.
  if (!args.neighborhood && (neighborhood.suggestions || []).length) {
    fail("full_report refuses: this pull carries "
      + `${(neighborhood.suggestions || []).length} mechanical candidate(s) and no neighborhood `
      + "judgment record. §13.4 makes the judgment pass UNCONDITIONAL and the Report REQUIRES it "
      + "by design — there is no path to an unjudged neighborhood rendering. Enter J3_neighborhood "
      + "so the run record names the judgment this pull joins.");
  }
  const judgments = readNeighborhoodJudgments(args.neighborhood);
  // A KEY MATCHING NO CANDIDATE IS REFUSED, NOT DROPPED. A typo, a stale file,
  // or a slug from another Group would otherwise vanish — and where NO key
  // matched, the screen took its all-unjudged arm and printed "the mechanical
  // layer ran; the judgment layer did not", which is the one fact the reader is
  // owed and the one fact that is false: the layer ran and joined nothing. The
  // reader is careful about a level it cannot recognise and was silent about a
  // slug it cannot place; both are the same class of unrecognised input.
  // SCOPED TO A NON-EMPTY ENUMERATION. Where the mechanical layer returned no
  // candidate at all, a judgment file has nothing to join and the section's
  // empty-enumeration lines are already the honest report — refusing the whole
  // pull there would turn a legitimate empty neighborhood into an error.
  if (judgments.size && (neighborhood.suggestions || []).length) {
    const have = new Set((neighborhood.suggestions || []).map((x) => x.slug));
    const orphans = [...judgments.keys()].filter((k) => !have.has(k));
    if (orphans.length) {
      fail(`neighborhood judgment(s) name ${orphans.length} slug(s) no mechanical candidate carries: `
        + `${orphans.join(", ")}. A judgment that joins nothing is silently dropped and the section `
        + "then reports that the judgment layer did not run, which is false. Check the file is for "
        + "this Group and this settled set.");
    }
  }
  for (const sug of neighborhood.suggestions || []) {
    const j = judgments.get(sug.slug);
    if (j) { sug.level = j.level; sug.claim = j.claim; }
    // The relation IN PLAIN WORDS (§686 disposition 3, field 2). With
    // exploration fixed to one substrate this is always Batch membership, so
    // the row names the batch rather than a substrate token a reader would
    // have to decode.
    //
    // IT NAMES THE SETTLED MEMBER, NOT THE BATCH INSTANCE (kogaki#689, carried
    // from PR #692 round 2). Disposition 3's own example is "from the same
    // Batch as L88 (2026-08-13)" — a member the owner can recognise, with the
    // batch beside it. The row used to render the batch key in the member's
    // place, which is the substrate-internal token this field exists to spare
    // the reader. Seeds are named by their DISPLAY ID where the record carries
    // one, because that is the identifier every other owner surface uses.
    const batch = (sug.reached_by || []).find((r) => r.substrate === "source_batch");
    // Resolved BY SLUG, because that is the key the enumerator works in;
    // `displayIdOf` addresses by candidate id and would match nothing here. A
    // seed whose record carries no display_id renders `NO_DISPLAY_ID` rather
    // than being dropped: omitting one of three named members would misname the
    // relation, which is worse than disclosing the fault.
    const named = (sug.seeds || []).map((sl) => {
      const c = (record.candidates || []).find((x) => x && x.slug === sl);
      return c && c.display_id ? c.display_id : NO_DISPLAY_ID;
    }).sort(compareDisplayIds);
    // Sorted by the identifier the row PRINTS, not by the slug it was reached
    // under: the seed list is a set and its order carries no meaning, so the
    // one the reader sees is the one that is stable across runs — and ordered
    // NUMERICALLY, because a display id's number is its meaning. A bare `.sort()`
    // put L10 before L2 and the ruling's own example id L88 before L9 (PR #693
    // round 1); the two-member specimen could not show it.
    // An unnamed seed set is a STATED absence, never a silent fallback to the
    // old wording: "the settled set" is what the row says when it can name no
    // member at all, and the reader can tell the two apart.
    const who = named.length ? named.join(", ") : "the settled set";
    sug.relation = batch && batch.instance
      ? `from the same Batch as ${who} (${batch.instance})`
      : `from the same Batch as ${who}`;
  }

  // THE BOUNDED GLOSS FETCH (kogaki#689, owner ruling 2026-08-28). §686
  // disposition 3 rules four fields per row and this is the fourth; until this
  // landed the report path fetched nothing and every row rendered its absence,
  // so the grammar declared a field the pipeline could not fill.
  //
  // BOUNDED BY THE ROWS THAT RENDER, NEVER BY THE CANDIDATE SET. The fetch runs
  // over `neighborhoodDisplaySet`'s own selection — at most `NEIGHBORHOOD_DISPLAY_CAP`
  // rows, and none at all on the empty and none-judged arms, which render no
  // row. The over-cap arm left that list at kogaki#741: it fills to the cap and
  // is fetched over like any other rendering arm. `resolveHeadlines` then bounds it a second time, to the union
  // of those rows' OWN tags: this is the same bound kogaki#528 ratified for the
  // Brief lane and the same one §9 binds `cmdView` to. The corpus-wide prefetch
  // §9 forbids is not reachable from here, because the tag set is a function of
  // ten records rather than of the corpus.
  //
  // A MISS IS DISCLOSED AND NEVER SUBSTITUTED. `resolveHeadlines` returns
  // `NO_HEADLINE` where the shard carries no rendering, which is the same
  // abnormal marker `cmdView` and the Brief lane render — a fault to clear
  // rather than prose. The earlier `gloss unrecorded` literal is gone with the
  // condition it disclosed: it said "this path makes no fetch", which is no
  // longer true, and keeping it beside `NO_HEADLINE` would be two vocabularies
  // for one state.
  //
  // THE HEADLINE IS QUOTED AT ITS CITE. It is a served rendering, so it travels
  // with the address it was read from and never as bare prose — the verbatim
  // rule the slug substitution was refused under at #686 round 1.
  const shownRows = neighborhoodDisplaySet(neighborhood.suggestions || []).shown || [];
  if (shownRows.length) {
    const { headlines: heads, seam, namespaces: ns } = resolveHeadlines(
      shownRows.map((x) => ({ slug: x.slug, tags: x.tags || [] })),
      { namespaces: NEIGHBORHOOD_GLOSS_NAMESPACES });
    for (const sug of shownRows) {
      const h = heads.get(sug.slug);
      sug.gloss = glossFor(sug, h, seam, ns);
      sug.gloss_cite = h ? h.cite : null;
    }
  }

  const report = {
    id: `terrain-full-report-${identityDigest(identity)}`,
    // RECORDED BESIDE THE IDENTITY, never inside it (§12.1, kogaki#700).
    composed_inputs: composedInputs,
    kind: "full-report",
    identity,
    // §12 v7 — the entered set, canonical, recorded in the identity block.
    selections: identity.query.ids,
    classification: "report",
    narrows: false,
    truncated: false,
    // ONE section per entered id; the identity block, Counted and Served
    // lines are once-per-file and live beside this rather than inside it.
    sections: sectionsOut,
    // AGGREGATED over the whole set, deduped by member id — a member entered
    // under both G5 and G5-1 is one Lesson, not two.
    counted: familySplit([...new Set(allMemberIds)], record.candidates),
    lessons_served: record.candidates.length,
    // §12.3 (kogaki#760) — validated ABOVE, before this object exists, so a
    // refusal precedes both writes exactly as §14.2 requires of the emit-time
    // guard. An empty array is the DISCLOSED absence and not a missing field.
    thesis_candidates: thesisCandidates,
    // §13.1 v20 — ONCE per file, rendered LAST by `renderReportMarkdown`.
    neighborhood,
  };
  const abnormal = abnormalTotal;
  // THE REFUSAL PRECEDES BOTH WRITES (§14.2, story 1.54 AC2). The record is
  // written BELOW this line, not above it: §12.2 v11 requires the record and
  // its rendering in the same act, so a refusal that had already written the
  // record would leave a machine record with no rendering — the 2026-08-06
  // defect specimen from the other side.
  //
  // AND IT VALIDATES UNDER `--no-render` TOO, where nothing will be written.
  // The rendering is a pure function of the record, so a record that renders
  // nonconformantly IS a nonconformant record; skipping the check when the
  // owner opted out of the file would make `--no-render` a way to mint exactly
  // the artifact this refuses, which is the escape hatch SQ1 declined arriving
  // through a flag that already exists.
  //
  // THROUGH `emitOrRefuse` LIKE THE OTHER TWO SITES (PR #352 round 1 nit).
  // This path's writes are separated by the record write, so the "write" it
  // hands over is empty and the two real writes follow below — but the WHEN is
  // the helper's, which is the whole reason the helper exists. Three validation
  // sites in two shapes, with the odd one out being the one the helper was
  // written for, is the drift `announceArtifacts` was written to end.
  const renderedText = renderReportMarkdown(report, tag);
  emitOrRefuse("full_report", renderedText, () => {});

  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");

  // THE OWNER RENDERING, in the SAME ACT (§12.2 v11, kogaki#234). A run that
  // wrote the record and not the rendering would leave the owner exactly where
  // the ruling found them, so this is not conditional on a flag: `--no-render`
  // is the opt-out and its absence is the default.
  let rendered = null;
  if (!args["no-render"]) {
    // §15.5 v28 (kogaki#681) — the same write-authority refusal the screen
    // writer carries, at the other owner artifact, and BEFORE the destination
    // is prepared.
    //
    // THIS COMMENT SAID SOMETHING FALSE AND THE FALSEHOOD WAS THE DEFECT (PR
    // #702 round 1, finding 1). It read: "sited HERE rather than at
    // `renderingsDir`, which also runs on read-shaped paths (the rerun branch
    // READS `priorRendered` through it)". The rerun branch does not read it —
    // its own text says "THE RENDERING IS STILL WRITTEN IN THIS ACT", and it
    // returns `priorRendered` as a real owner artifact. Mis-typing the sibling
    // path as read-shaped is exactly what made guarding this one look
    // sufficient, so the rerun branch shipped unguarded and §15.5 v28's central
    // claim was false at the artifact the amendment was written to protect.
    // The guard now sits on BOTH branches and this note is the record.
    refuseUnauthorizedOwnerWrite(renderingDestination(args), "FullReport.md");
    const rdir = renderingsDir(args);
    // §12.2 v12 — ONE owner rendering, a fixed human name, overwritten per
    // pull. Identity stays in the record alone; the filename carries none.
    rendered = join(rdir, "FullReport.md");
    writeFileSync(rendered, renderedText);
  }

  // §2.5 clause 3 binds BOTH artifact lines (PR #240 review round 1, finding
  // 2), on this path and on the rerun path alike — see `announceArtifacts`,
  // which is where the contract now lives so that neither path can drift from
  // the other again.
  announceArtifacts(rendered, out);
  console.log(`Identity RECORDED in the report: pin=${identity.pin} query=(${tag}, [${identity.query.ids.join(", ")}]) judge=${identity.judge_pin === NO_JUDGE ? NO_JUDGE : `${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}`}`);
  console.log(`${sectionFigure({ name: `${tag} — ${identity.query.ids.length} selection(s)`, members: [...new Set(allMemberIds)], by_family: report.counted }, record.candidates.length)}`);
  if (abnormal) {
    console.log(`ABNORMAL: ${abnormal} served Gloss rendering(s) are missing. This is a fault to clear on the served surface, not a tolerated gap, and nothing was substituted for it (SPEC.md §9, §12).`);
  }
  console.log("Classification: REPORT (SPEC.md §2.3, §12) — it ranks nothing, narrows nothing and hides nothing, so it sits in neither act list.");
  console.log("A RENDERING, not an address: nothing downstream resolves a report id, and a Brief records members and pins (SPEC.md §12).");
  console.log("The RENDERING is repo-visible and NOT committed; the RECORD is "
    + "machine-local (SPEC.md §2.5.2, §12.2 v11). Two artifacts, two rules — "
    + "visibility and publication are separate decisions.");

  // RETURNS WHAT IT WROTE, so the §15 executor can OBSERVE the artifact
  // rather than assert one (PR #655 round 1, carried to kogaki#665). Under
  // `--no-render` nothing is written and `rendered` stays null — which is
  // exactly the case that used to record a write that never happened.
  return rendered;
  }
}

// --------------------------------------------------------------------------
// act — the second-proposer boundary, enforced by enumeration.
// --------------------------------------------------------------------------
// THE PROPOSAL RECORD of the retired `act` subcommand, reachable only from
// `TRIM_RATIFICATION`'s declaration composer (kogaki#625 item 1). While `act`
// stood, a session could mint a trim proposal from outside the executor with no
// run record — precisely what §15.5 claims is unwritable.
// Returns the written record's path, or null where the act names no proposal.
export function composeTrimProposal(args, dir) {
  const act = String(args.act || fail("TRIM_RATIFICATION needs --act <name>: the proposal it ratifies"));
  const acts = RECORD_SCHEMA.acts;
  if (acts.navigation.includes(act)) {
    console.log(`${act} is NAVIGATION — the executor reaches it as a table state (§15.7 removed \`view\` as an entry point); no record is written. A navigation act wrapped as a proposal is a contract violation from the other direction (record-schema.json acts).`);
    return null;
  }
  if (!acts.proposal.includes(act)) {
    // The non-member fallback: a report, never a guess.
    const record = {
      id: `terrain-report-${Date.now()}`,
      kind: "report",
      act,
      reason: `act ${JSON.stringify(act)} is in neither the proposal list (${acts.proposal.join(", ")}) nor the navigation list (${acts.navigation.join(", ")}) — specs/spec-terrain/SPEC.md §2.3: an act not in either list is a report, not a choice`,
      narrows: false,
    };
    const out = join(dir, `${record.id}.proposal.json`);
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
  const out = join(dir, `${record.id}.proposal.json`);
  writeFileSync(out, JSON.stringify(record, null, 2) + "\n");
  console.log(`Proposal record written (presented at gate terrain-trim-ratification, never as navigation): ${out}`);
  return out;
}

// --------------------------------------------------------------------------
// The per-run gate declaration carries the RUN-COMPUTED options; the registry
// declares the gate CLASS. `gate` ceased to be an entry point (kogaki#625
// item 1) — the declaration is composed by the executor at the wait that owes
// it, and the recorded consult miss it carried (no served position on static
// declaration of run-computed option sets) is unchanged by who composes it.
// --------------------------------------------------------------------------
// THE CAPTURE, written by the executor and by nothing else (kogaki#625 item 1).
// `capture` ceased to be an entry point: an answer to a declared gate is
// admitted at the wait that declared it, which is what makes "a session could
// mint run state from outside the executor" unwritable rather than discouraged.
export function writeCapture(dir, decl, { toolUseId, option, freeText }) {
  if (!option && !freeText) fail("a capture needs --capture-option <id> or --capture-free-text <answer>");
  if (option && !decl.options.some((o) => o.id === option)) {
    fail(`answer option ${JSON.stringify(option)} was not offered by the declaration`);
  }
  const row = {
    stop_id: `stop-${Date.now()}`,
    gate_id: decl.id,
    evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
    payload: {
      options_offered: decl.options.map((o) => o.id),
      free_text_offered: true,
      answer: option ? { option } : { free_text: freeText },
    },
  };
  const out = join(dir, "terrain.gate-capture.json");
  const doc = existsSync(out) ? readJson(out) : { rows: [] };
  doc.rows.push(row);
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
  return { path: out, row };
}

// --------------------------------------------------------------------------
// neighborhood — SPEC-terrain §13, the provenance neighborhood (story 1.44,
// kogaki#302, umbrella kogaki#300).
//
// A WIDENING OF THE SETTLED STRAND SET, offered BESIDE it. §13.1: a report,
// never a proposal — it narrows nothing, so the §2.3 second-proposer boundary
// does not engage, and the full population stays reachable.
//
// INPUT IS THE SETTLED STRAND SET ALONE (§13.2 v15). There is no Thesis
// argument and a run must not refuse for want of one: the 2026-08-09 owner
// correction withdrew "Thesis" from Terrain's vocabulary on the ground that a
// claim-shaped input is DEAD INPUT here — the substrates below compute over
// member metadata and cannot read a claim, so a required Thesis was an input
// nothing consumed.
//
// THE BOUND IS DECLARED, NOT CHOSEN (§13.3 v16, owner selection 2026-08-12).
// The unit is traversal — substrates x depth — and the values are fixed:
// `source_batch` one hop, and nothing else since kogaki#686. They are read
// from the spec here rather than picked: an implementation choosing different
// values settles a spec question silently, and one deriving them from the
// settled set's CONTENT reintroduces the withdrawn input.
//
// SHARED-CARRIER IS OFF AS A VALUE, NOT AS AN ABSENCE. The substrate is
// implemented and its depth is zero, so it enumerates nothing at the declared
// setting and needs no code change if a later amendment turns it on. Writing it
// out is what keeps §13.3's three substrates three.
// EXPLORATION IS FIXED: SAME DISTILL BATCH, AND NOTHING ELSE (kogaki#686,
// owner ruling 2026-08-28). The two other substrates are DELETED rather than
// set to zero — per that ruling's own doctrine, a superseded behaviour is
// deleted, not kept as a record beside its exception.
//
//   cross_links (the reference-link walk, two hops) — removed on MEASUREMENT,
//     not on taste: on the 2026-08-28 pull it contributed zero rows, all 15
//     candidates arriving through Batch membership. Removing it bounds the
//     worst case, which a depth-2 walk over a cyclic [[slug]] graph does not.
//   shared_carrier — was already inert at bound 0, which is precisely the
//     "record kept beside its exception" shape the same ruling deletes.
//
// The object survives as a single-key freeze rather than becoming a bare
// constant, so the substrate stays NAMED at its call site and a future
// widening is a visible edit to a declared set rather than a new literal.
const NEIGHBORHOOD_BOUND = Object.freeze({
  source_batch: 1,
});

// §14.6's slot, FILLED 2026-08-12 (owner selection, recorded on kogaki#300
// before this code was written, which is what §13.7 requires). A suggestion is
// by construction NOT in the survey record, so §14.3's assignor does not reach
// it. The neighborhood mints its own space, `N<n>`, DECLARED DISJOINT from
// `L<n>` — §14.3 is untouched, and a taken suggestion is assigned an `L<n>` by
// §14.3's existing assignor on the way in, without its `N<n>` following it.
const NEIGHBOR_ID = (n) => `N${n}`;

// The batch join does NOT hold by equality (§13.3). Twelve legacy batches carry
// `source_batch: "q_a/3/answer.md"` while the batch id is `"q_a/3"`, so an
// equality join returns NO batch-mates for every Grain in them and presents
// that as "this Grain has no same-sitting siblings" — indistinguishable on
// screen from a Grain that genuinely has none. That is this surface
// reproducing the silent exclusion §13.0 exists to remove, one layer down.
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
// substrate that REACHED them (§13.4's disclosure), never a score.

// ORDER IS DECLARED AND MECHANICAL: instance-bearing groups first, by substrate
// then by instance id, then the bare substrates by name. NEVER by size — a
// screen that puts the biggest group first has ranked its groups, which is the
// judgment §13.1 refuses, arriving as layout rather than as a score.
export function compareGroups(a, b) {
  const ka = [a.instance === null ? 1 : 0, a.substrate, a.instance ?? ""];
  const kb = [b.instance === null ? 1 : 0, b.substrate, b.instance ?? ""];
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

// HOW MANY ROWS ONE SUGGESTION RENDERS AS — ONE DEFINITION, used by the
// enumerator's total and by both of the screen's counts (PR #392 round 1). A
// suggestion with no substrate instance still renders, under an explicit
// undisclosed heading, so it is ONE rendering and not zero: the alternative
// reading made the family section and the headline disagree on the check's own
// AC3/AC5 input, which was the two-definitions defect the grouping helpers
// warned about one field over — those helpers went with the grouping headings
// kogaki#686 deletes, and the reference is retired with them rather than left
// pointing at a symbol the file no longer defines.
export function renderingsOf(s) {
  return (s.reached_by || []).length || 1;
}

function substrateInstances(bySubstrate) {
  const out = [];
  for (const [substrate, instances] of bySubstrate) {
    for (const instance of instances) out.push({ substrate, instance });
  }
  return out.sort(compareGroups);
}

export function neighborhoodOf(records, seedSlugs, bound = NEIGHBORHOOD_BOUND) {
  // Batch records carry `id` rather than `slug` and are the JOIN TABLE, never
  // suggestions themselves — indexing them here would surface a batch as a
  // neighbor, which is not an element the owner can take.
  const bySlug = new Map(records.filter((r) => r.slug).map((r) => [r.slug, r]));
  const seeds = seedSlugs.filter((s) => bySlug.has(s));
  const seedSet = new Set(seeds);
  // slug -> Map of substrate name -> Set of INSTANCE ids (null for a substrate
  // that has no instances). The instance is what story 1.61 needs and the
  // substrate NAME alone cannot supply: §13.4 obligation 4 groups by substrate
  // INSTANCE, so a screen told only "source_batch" knows the row belongs under
  // some batch heading and not under WHICH — and the screen cannot recover it,
  // because the batch join lives here and nowhere else. Widening the returned
  // shape is the alternative story 1.61's Review Focus names, taken because the
  // other one is unavailable rather than because it is tidier.
  const reached = new Map();
  // slug -> Set of the SEED slugs that reached it. §686 disposition 3's field 2
  // names "the same Batch as L88 (2026-08-13)" — the settled MEMBER the
  // candidate shares a Batch with, and the batch. `reached` above is keyed by
  // substrate and instance and cannot hold it: two seeds in one batch collapse
  // to one instance entry, which is exactly the value the row must not render
  // in the member's place. Kept beside rather than folded in, because the
  // relation is a fact about the settled set and not about the substrate
  // (kogaki#689, carried from PR #692 round 2).
  const reachedSeeds = new Map();
  const unresolved = [];
  // §13.4's DENOMINATOR POPULATION, family-keyed and read from the batch
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
  // the screen groups it under the substrate's own heading.
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
  // `members` (§13.3), not by equality and not by grouping the element set:
  // `members` is family-keyed, which is what makes §13.4's per-family
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
        // is the silent exclusion §13.0 removes.
        unresolved.push({ kind: "seed", slug: s, value: raw,
          why: `source_batch names a batch no served record carries (resolved to ${JSON.stringify(k)})` });
        continue;
      }
      distinctBatches.set(k, batch);
      if (!batchSeeds.has(k)) batchSeeds.set(k, new Set());
      batchSeeds.get(k).add(s);
    }

    // THE WALK IS PER BATCH, NOT PER SEED (kogaki#369). The two markers above
    // state facts about a SEED — this record carries no source_batch, this
    // record's source_batch names nothing served — so they belong in the seed
    // loop. What a batch's `members` lists is a fact about the BATCH, and
    // walking it once per seed restated that fact once per seed: with a
    // co-tag group's members commonly drawn from one sitting, a single
    // unserved member yielded one identical line per seed, up to the whole
    // size of the settled set.
    //
    // The fix is the loop, not a guard on the push. A de-duplicating set over
    // `<batch>|<member>` would suppress the symptom and leave the per-seed
    // walk in place — and this is already the SECOND defect of its class in
    // this function, the first having been fixed with exactly such a guard
    // (`expanded`, below), which did not stop the second being written in the
    // same commit.
    for (const [k, batch] of distinctBatches) {
      // Family-keyed, so every family's list is walked rather than one.
      for (const family of Object.keys(batch.members || {})) {
        for (const m of batch.members[family] || []) {
          // POPULATION IS COUNTED BEFORE THE SERVED-SET GUARD BELOW, and the
          // ordering is the decision rather than an accident. `members` is the
          // batch's own statement of what it holds; a member the served set
          // does not carry is still IN the batch, and dropping it from the
          // denominator would make the ratio climb as the corpus loses
          // records — the same silent-flattery shape §13.0 removes, arriving
          // as arithmetic. It is marked as unresolved below either way, so the
          // absence is disclosed rather than absorbed.
          //
          // SEEDS ARE EXCLUDED, and this is what makes the ratio well-formed
          // rather than merely per-family. `note()` returns early on a seed, so
          // a seed can NEVER become a suggestion; leaving seeds in the
          // denominator counts candidates the numerator is structurally unable
          // to reach. Round 1 of PR #383 found the first version doing exactly
          // that — rendering `lesson: 2 of 2` where one of the two members WAS
          // the seed — so the denominator is the batch's members MINUS the
          // settled set: what this substrate could actually have surfaced.
          // Guarded rather than `continue`d: a seed must still fall through to
          // the served-set check and `note()` below, and skipping the whole
          // iteration would make that correctness depend on seeds always being
          // served — true today, and not a fact this loop should rest on.
          if (!seedSet.has(m)) {
            if (!population.has(family)) population.set(family, new Set());
            population.get(family).add(m);
          }
          // A LISTED MEMBER THE SERVED SET DOES NOT CARRY IS MARKED, not
          // dropped. Dropping
          // it yields a quieter neighborhood with no disclosure, which is
          // §13.0's silent exclusion one layer further in: the batch resolved,
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

  // ORDER IS THE SORT, NEVER A RANK (§13.3). The bound may change HOW MANY
  // neighbors surface and may never change WHICH by scoring them — so the
  // output is sorted by slug, which carries no judgment, and `N<n>` is minted
  // over that order.
  const suggestions = [...reached.keys()].sort().map((slug, i) => ({
    nid: NEIGHBOR_ID(i + 1),
    slug,
    // The FAMILY a suggestion belongs to, carried on the suggestion itself so
    // the screen never has to re-look-up the record to state a per-family
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
    // §13.4 obligation 4's grouping key, one entry per (substrate, instance)
    // pair that reached this slug. A suggestion reached by two substrates
    // carries two entries and RENDERS UNDER EACH — which is why rendering count
    // and suggestion count differ by construction, and why both are stated.
    reached_by: substrateInstances(reached.get(slug)),
  }));

  // §13.4's PER-FAMILY FIGURES (story 1.45, AC3). Every family that appears
  // either in a walked batch's `members` or among the suggestions gets a row;
  // the union is what stops a family with suggestions and no batch population
  // from vanishing, and a family with population and no suggestions from being
  // dropped as uninteresting — a zero numerator is a reading.
  //
  // `population: null` IS NOT ZERO, and the distinction is load-bearing. A
  // family with no `members` list behind it has no denominator that is
  // READABLE; printing 0 there would assert a
  // population that was never counted, and printing `n of 0` is arithmetic
  // nonsense that reads as a bug in the numerator. Null renders as an explicit
  // "no denominator readable" on the screen.
  // THE TWO SIDES OF THE RATIO RANGE OVER ONE SET, and getting that wrong is
  // what round 1 of PR #383 caught. The denominator is the walked batches'
  // members of this family, minus the seeds; so the numerator must be the
  // suggestions DRAWN FROM THAT SET, never every suggestion of the family. A
  // cross-link two hops out is a real suggestion and is in no walked batch's
  // `members` — counting it against a batch-membership denominator produced
  // `2 of 2` where one of the two was not among those members, and `3 of 2` as
  // soon as a second cross-link appeared. An impossible ratio is worse than a
  // pooled one: a reader can see that pooling hides something, and cannot see
  // that a well-formed-looking fraction is measuring two different populations.
  //
  // So suggestions reached from OUTSIDE the walked membership are reported as
  // their own count with NO denominator rather than folded in. They are not
  // lost — §13.1 widens, so every suggestion still renders as its own row with
  // its substrate; this figure is about what the batch substrate could reach.
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
    // `by_family` now carries; the screen prints the per-family rows and never
    // a pooled `n of m`.
    // `suggested` COUNTS SUGGESTIONS and `rendered` COUNTS RENDERINGS, and the
    // two are carried separately because they differ by construction (§13.4
    // obligation 4): a suggestion reached by two substrates renders under each.
    // A single figure standing in for both is the conflation story 1.61's AC2a
    // exists to refuse — stated here at the source rather than left for the
    // screen to infer from a structure it would have to re-walk.
    counts: { seeds: seeds.length, suggested: suggestions.length,
      rendered: suggestions.reduce((n, s) => n + renderingsOf(s), 0),
      unresolved: unresolved.length, by_family },
  };
}

// Candidate `id` -> served `slug`. Separate and exported because the two key
// spaces are easy to conflate and the conflation FAILS QUIETLY: every lookup
// misses, the neighborhood is empty, and an empty is a legitimate outcome
// here (§13.2), so nothing downstream can tell the two apart. An id naming no
// candidate is returned, never dropped.
export function settledSlugs(candidates, memberIds) {
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

// THE ENUMERATION FOR A RESOLVED TARGET SET — the machinery `cmdNeighborhood`
// held, extracted when that subcommand retired (SPEC-terrain §13.2 v20,
// story 1.69, kogaki#473) so `cmdReport` computes it inside the pull. Reuse,
// never re-derive: a second resolver is how the section and the screen it
// replaced would drift.
// THE JUDGMENT LAYER'S INPUT (kogaki#686). The LLM supplies, per mechanical
// candidate, one free-form claim and one level from the harness-fixed set. It
// arrives as a FILE the session composed, exactly as `--classification` does
// for J2_subdivision: no model call happens inside this tool, and
// `--judge-model`/`--judge-effort` remain the PIN rather than an invocation.
//
// The vocabulary is CLOSED and checked here. A level outside the set is refused
// rather than passed through, because the display ranks by level and an
// unrecognised token would sort as "no level" — showing a judged candidate as
// unjudged, which is the silent-exclusion shape §13.0 exists to remove.
export function readNeighborhoodJudgments(path) {
  if (!path) return new Map();
  const raw = readJson(String(path));
  const out = new Map();
  for (const [slug, v] of Object.entries(raw || {})) {
    if (!v || typeof v !== "object") {
      fail(`neighborhood judgment for ${JSON.stringify(slug)} is not an object: `
        + `each entry is {"level": <one of ${NEIGHBORHOOD_LEVELS.join(" | ")}>, "claim": "<one sentence>"}`);
    }
    if (!NEIGHBORHOOD_LEVELS.includes(v.level)) {
      fail(`neighborhood judgment for ${JSON.stringify(slug)} carries level `
        + `${JSON.stringify(v.level)}, which is not the harness-fixed set `
        + `(${NEIGHBORHOOD_LEVELS.join(" | ")}). The set is closed; extending it is the owner's act.`);
    }
    if (typeof v.claim !== "string" || !v.claim.trim()) {
      fail(`neighborhood judgment for ${JSON.stringify(slug)} carries no claim. `
        + "A level without a claim is a rank with no reason, which the row has no way to render.");
    }
    out.set(slug, { level: v.level, claim: v.claim.trim() });
  }
  return out;
}

function neighborhoodForTargets(record, targets) {
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
  // step with its own case.
  const { slugs: seedSlugs, unmapped } = settledSlugs(record.candidates, memberIds);

  // THE SEAM CALL TAKES NO KIND FILTER, DELIBERATELY, and this is not the
  // shape `cmdSurvey` uses. `element_survey`'s declared arguments are `kind`
  // (singular) and `tag`; an UNDECLARED key returns the miss shape, so
  // `{ kinds: [...] }` yields zero lines. The neighborhood needs `batch`
  // records as well as the two survey families — §13.3's join reads a batch's
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
    // §13.4's disclosure discipline applied to the section's own inputs.
    return { gids: targets.map((t) => t.gid), no_material: true,
      suggestions: [], unresolved: [],
      counts: { seeds: 0, suggested: 0, rendered: 0, unresolved: 0, by_family: {} },
      unmapped };
  }

  const { suggestions, unresolved, counts } = neighborhoodOf(records, seedSlugs);
  return { gids: targets.map((t) => t.gid), suggestions, unresolved, counts, unmapped };
}

// THE NEIGHBORHOOD SCREEN, composed apart from the command (story 1.45).
//
// Exported and pure over its inputs for the same reason `neighborhoodOf` is:
// §13.4's obligations are properties of what RENDERS, not of what enumerates,
// so a fixture that can only call the enumerator cannot exercise them. Before
// this split the disclosure lines lived inside `cmdNeighborhood`, which reads
// a survey file and calls the seam — so the only way to assert them was a
// subprocess with a live seam, and a property whose failing path is never
// exercised is not covered (AC5).
//
// Returns the lines; the caller prints.
//
// THE RECOMMENDATION LEVELS, harness-fixed and closed (kogaki#686, owner ruling
// 2026-08-28). Ordered strongest first — the order IS the level ranking, and it
// is the only ranking in this file. Extending the set is the owner's act.
export const NEIGHBORHOOD_LEVELS = Object.freeze(["core", "useful", "background"]);
// The display cap. Ten rows, ruled; see the refusal below for what happens when
// more than ten are judged; the fill takes the first ten in level order.
export const NEIGHBORHOOD_DISPLAY_CAP = 10;

// THE NEIGHBORHOOD SECTION (kogaki#686). Four fields per row, and up to ten
// rows FILLED IN LEVEL ORDER `core -> useful -> background` (§13.4, kogaki#741
// ruling 3) — it was "all from the HIGHEST level present" until kogaki#754, a
// single-level premise the fill retires.
//
// WHAT WAS DELETED HERE, and why the deletions are not "kept beside their
// exception": the per-family tallies, the walk-settings line, the "narrows
// nothing" boilerplate, the per-Batch section headers, and the disjointness and
// unresolved footnotes. Each existed to discharge a §13.0/§13.1/§13.4
// disclosure obligation over an enumeration this section no longer performs —
// with exploration fixed to one substrate at one hop, a per-family denominator
// and a substrate-grouping heading describe a shape the output cannot have.
//
// THE REFUSAL, and it is the one place this section declines to render
// (owner selection 2026-08-28). Above the cap AT THE HIGHEST LEVEL the section
// renders NO ROWS and states the counts. Truncating instead would need a
// tie-break among equals, and a machine choosing which of ten equally
// recommended relations the owner may see is the shape the served record names
// as failing the second-proposer test
// (product-lab@b20d85ea topics/articles.md:125). Silent truncation is refused
// one step earlier by the same record's rule that a surface which must not drop
// its tail reports rather than truncates
// (topics/archive/knowledge-architecture.md:67).
// A PARAMETER A FUNCTION DOES NOT READ IS A CLAIM ON ITS CALLER IT CANNOT
// HONOUR, so the signature below carries exactly what is read and nothing else.
//
// IT NO LONGER ENUMERATES WHICH PARAMETERS THOSE ARE (kogaki#698, owner ruling
// 2026-08-29). This comment held a list, and the list was a CONFORMANCE COPY of
// the parameter declaration one line beneath it — with no declared precedence
// and no check anywhere in `checks/` referencing it. It was wrong in both
// directions about `unresolved` within two days: first claiming it was read
// after the reading line was removed, then claiming it was neither read nor
// accepted while kogaki#691 read it. The declaration was correct throughout.
//
//   "A stale `accepted` field is worse than no field … it ships only with
//    declared precedence AND the mechanical mismatch check."
//   product-lab@b20d85ea topics/archive/knowledge-architecture.md:97
//
// It shipped with neither, so the copy is removed rather than instrumented: a
// parser over source comments, maintained forever, to check a fact the
// declaration already states is the more expensive half of the same repair.
// THE DISPLAY SELECTION, DEFINED ONCE (kogaki#689). Which rows a populated
// section renders — the judged set, the level-ordered fill, the cap — was
// computed inside the screen alone, and the bounded Gloss fetch below has to
// reach the SAME set: a fetch over more rows than render pays for rows nobody
// sees, and a fetch over fewer leaves a rendered row unfilled. Two computations
// of "which rows show" is how those two drift, so there is one.
//
// Pure over its input and states every arm rather than returning a bare list:
// the screen renders a different sentence for each, and an arm collapsed here
// would have to be re-derived there.
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
  // `top` AND `atTop` ARE DELETED (kogaki#741 ruling 3, kogaki#754). The
  // selection carried the highest level present and the entries at it; with the
  // fill spanning levels neither describes what renders, and a field that no
  // longer describes the selection is one a caller can still read — which is
  // exactly how this implementation first rendered one row under a counts line
  // saying three. What replaced them is `composition`, computed below over the
  // rows that actually show.
  // THE FILL, DETERMINISTIC IN THE HARNESS (§13.4, kogaki#741 ruling 3). Rows
  // fill to the cap in level order `core -> useful -> background`; within a
  // level the DECLARED SLUG SORT orders them, and that sort CARRIES NO
  // JUDGMENT — which is the whole ground on which this replaced the refusal.
  // The harness fixes where an arbitrary reproducible line falls; it does not
  // rank relations by relevance, so no machine decides which relation the owner
  // may see.
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

export function neighborhoodScreen({ tag, gids, suggestions, unresolved = [] }) {
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

  // THE BATCH-SIDE RESOLUTION DISCLOSURE (§13.0, kogaki#691, owner ruling
  // 2026-08-29 — arm 1: the duty SURVIVES disposition 4 and is discharged on
  // the surface). The enumerator marks three gaps — a seed carrying no
  // `source_batch`, a `source_batch` naming a batch nothing serves, and a batch
  // member the served set does not carry — and after #686 they reached no
  // surface at all.
  //
  // THIS IS NOT MERELY A RESTORED OMISSION. Where every seed fails to resolve
  // the enumeration produces no candidate, and the empty arm below then stated
  // "The enumeration ran over the settled set's Batches and returned nothing —
  // a result about this settled set, not a failure." That is FALSE of a run
  // that could not find the Batches: the surface asserted a completed
  // enumeration and a clean result. A silence that reads as a clean result is
  // the served defect; stating the clean result outright is that defect one
  // degree worse.
  //   product-lab@b20d85ea topics/archive/claude-code-ops.md:24 —
  //   "A check anti-correlated with its need is worse than no check, because
  //    its silence reads as a clean result."
  const gaps = Array.isArray(unresolved) ? unresolved : [];
  // TWO KINDS, AND ONLY ONE OF THEM MAKES THE EMPTY FORM FALSE (PR #697 round
  // 1). A `seed` gap is a settled reference that could not be resolved to a
  // Batch, so no enumeration ran over it — that is what falsifies "the
  // enumeration ran over the settled set's Batches". A `member` gap is the
  // opposite situation: the batch RESOLVED, this walk ran over it, and one of
  // its listed members is not served. Rendering both under one header told the
  // reader a settled reference had failed to resolve when it had not, and — in
  // the state where a member gap is the ONLY gap — displaced an empty form that
  // was TRUE with a line that was false. That is the defect this section exists
  // to remove, reproduced one state in.
  //
  // The kind is read from the marker, never sniffed out of its `why` prose: a
  // renderer recovering by string-match a fact the producer already knew is a
  // join that every wording change silently breaks.
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

  // THE OVER-CAP REFUSAL IS GONE (§13.4, kogaki#741 ruling 3). It rendered no
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
  // THE BATCH-SIDE RESOLUTION GAPS RENDER HERE (kogaki#691, owner ruling
  // 2026-08-29 — §13.0's duty SURVIVES #686 disposition 4 and is discharged on
  // the surface). Both kinds ride a populated section: a partial resolution
  // failure is not discharged by the seeds that did resolve, because the counts
  // above are over what the walk REACHED and a reader cannot otherwise tell a
  // small neighborhood from a small fraction of the settled set having been
  // walked at all.
  //
  // THIS COMMENT SAID THE OPPOSITE UNTIL PR #697 ROUND 1, in the same commit
  // that added the rendering two lines below: that none of the three markers
  // reaches a surface, that the round-1 line "is REMOVED here", and that the
  // question was carried on #686 "which stays open" — #686 closed on
  // 2026-08-28. A comment falsified by its own diff is the class this change's
  // own description names against the coverage case, arriving inside the fix
  // for it.
  if (unjudged) say(`${unjudged} candidate(s) carry no level and are counted here, never shown.`);
  if (gaps.length) sayGaps();
  say();

  // FOUR FIELDS, in the ruled order. `relation` is plain words rather than a
  // substrate token, because the row is read by the owner and not by a parser.
  //
  // THE GLOSS IS QUOTED AT ITS CITE (kogaki#689). It is a served rendering, so
  // it travels with the address it was read from; a headline rendered bare is
  // the paraphrase-standing-for-a-quote shape the verbatim rule refuses. A row
  // whose shard carried no rendering gets `NO_HEADLINE` — the same abnormal
  // marker `cmdView` and the Brief lane render, so one vocabulary covers the
  // state wherever it arises, and it is a fault to clear rather than prose.
  for (const x of shown) {
    say(`- ${x.nid} — ${x.relation || "relation unrecorded"}`);
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
    say(`  ${x.claim || "claim unrecorded"} [${x.level}]`);
  }
  return out;
}

// THE FULL REPORT SECTION (SPEC-terrain §13.1 v20, story 1.69, kogaki#473).
//
// The neighborhood's owner rendering is a section of `reports/FullReport.md`,
// at §12's ONCE tier, LAST — never a screen of its own. The lines are
// `neighborhoodScreen`'s, reused rather than re-derived: the screen's own
// heading (a plain-text line naming tag and set) is replaced by the Markdown
// heading and the `*Seeded by:*` line `report-format.json` v6 declares, and
// everything from the counts line down is the same emitter §13.4's
// obligations were asserted against. A second composer is how the section
// and the enumeration would drift — the reuse rule the licensing issue
// states verbatim.
//
// Exported and pure over its inputs for the same reason `neighborhoodScreen`
// is: §13.4's obligations are properties of what RENDERS, so a fixture must
// reach this without a seam.
// The rule the callee's comment states, holding HERE TOO: this frame forwards
// exactly what the callee reads, so its own parameter list is the one statement
// of that. It enumerated the same list and inherited the same defect
// (kogaki#698) — including deferring to a callee comment that was itself false
// at the time. The sole call site spreads `report.neighborhood`, so nothing
// here is positionally load-bearing either.
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
      "No served material reached the neighborhood: the seam returned no element records, so the enumeration did not run — a different state from an enumeration that ran and found nothing, stated rather than failing the pull (§13.4's disclosure discipline).",
    ];
  }
  return [...head,
    // Drop only the screen's heading line; the tag it carried already heads
    // the report's own title, and the set rides `*Seeded by:*` above.
    ...neighborhoodScreen({ tag: "", gids, suggestions, unresolved }).slice(1),
  ];
}

// The CLI dispatch runs only when this file IS the entry point. Without the
// guard, importing the module to exercise one of its exported composers runs
// the dispatch with no command, which prints the usage banner and calls
// process.exit — so the module was unimportable and every composer in it was
// reachable only through a subprocess. A mechanism no fixture can call is the
// orphan shape one level in (`orphan-mechanisms-fail-the-suite`).
// ==========================================================================
// §15 — THE CONTROL PLANE: the workflow table, the run record, the executor.
// (SPEC-terrain §15, v23; kogaki#625 acceptance items 1, 2, 5 and 6; story
// 1.89 / kogaki#652.)
//
// WHERE THIS LIVES, stated rather than left implicit (story 1.89 SQ1). §15
// does not decide whether the executor is a sibling module or part of this
// file. Two things decided it here: kogaki#625's licensed artifact list names
// `terrain/terrain.mjs` and no sibling, so a new module would be an artifact
// no licence covers; and story 1.90 makes these same renderers PRIVATE to the
// executor, which is a smaller and more reviewable edit when caller and
// callee already share a file.
//
// WHAT "THE EXECUTOR HOLDS NO STATE LIST OF ITS OWN" MEANS, precisely —
// because the claim is checkable only if it is stated (§15.1; #625 item 6):
//
//   Read from the table on EVERY run, and appearing nowhere in this file:
//   the state ids, their ORDER, their KIND, which of them WAIT, which WRITE
//   which artifact, under which GRAMMAR SURFACE, which are CONDITIONAL, which
//   reach a JUDGMENT POINT, and which is TERMINAL.
//
//   Held here: what a KIND MEANS (`KIND_SEMANTICS`), which is interpretation
//   and not sequencing; and the RENDERER HALF (`STATE_WORK`), which §15.1
//   names in as many words — "a table row PLUS A RENDERER".
//
// The consequence is the testable one: moving a handoff, adding a wait, or
// adding a terminal costs ZERO code here. Adding a `write` costs exactly its
// renderer — the executor REFUSES a write state it has no renderer for,
// naming it, rather than inventing one or silently skipping it.
//
// A RENDERER MAY NAME THE WAIT IT CONSUMES, and that is not a state list.
// `compose_input` needs the tag the owner named; it reads it from the run
// record by the id of the wait that supplied it. That binding is part of the
// renderer, which is bound to its state by construction. What would breach
// §15.1 is control code that knew the ORDER those states run in — and none
// below does.
// ==========================================================================

// The kind vocabulary this executor interprets. The table's `state_kinds`
// object is the prose for these; `stops` is the only CONTROL property a kind
// carries, and it is why `terminal` had to be its own kind rather than a
// `compute` at the end of the array (workflow.json v2, PR #626 round 1).
const KIND_SEMANTICS = {
  compute: { stops: false, needsRenderer: false },
  write: { stops: false, needsRenderer: true },
  judgment: { stops: false, needsRenderer: true },
  wait: { stops: true, needsRenderer: false },
  terminal: { stops: true, needsRenderer: false },
};

const WORKFLOW_TABLE = join(REPO, "specs/spec-terrain/workflow.json");
const RUN_RECORD_FILE = "run-record.json";

// Structural validation only. This reads the table's FORM — ids present and
// unique, kinds interpretable, a write naming an artifact, a terminal
// existing. It judges no semantic contract, because §15.1 makes the table
// authoritative over sequencing and "authoritative over NOTHING ELSE".
export function loadWorkflowTable(path) {
  const table = readJson(path);
  if (!Array.isArray(table.states) || table.states.length === 0) {
    fail(`workflow table ${path} declares no states. §15.1 makes this artifact authoritative over sequencing; an empty array is not a flow.`);
  }
  const seen = new Set();
  for (const s of table.states) {
    if (!s || typeof s.id !== "string" || s.id === "") {
      fail(`workflow table ${path}: a state carries no id.`);
    }
    if (seen.has(s.id)) fail(`workflow table ${path}: duplicate state id ${JSON.stringify(s.id)}.`);
    seen.add(s.id);
    if (!Object.prototype.hasOwnProperty.call(KIND_SEMANTICS, s.kind)) {
      fail(`workflow table ${path}: state ${JSON.stringify(s.id)} declares kind ${JSON.stringify(s.kind)}, which this executor does not interpret. Known kinds: ${Object.keys(KIND_SEMANTICS).join(", ")}.`);
    }
    if (s.kind === "write" && !s.writes) {
      fail(`workflow table ${path}: state ${JSON.stringify(s.id)} is kind "write" and names no artifact in its \`writes\` field.`);
    }
  }
  if (!table.states.some((s) => s.kind === "terminal")) {
    fail(`workflow table ${path} declares no terminal state. A generic executor reads the end of a run from the table and never from position (§15.1).`);
  }
  return table;
}

// The baseline, DERIVED from the states array rather than read from the
// table's own `counted_baseline` object. Deriving is the point: it is what
// lets acceptance item 2 compare a run against the table instead of against a
// figure someone typed beside it. `counted_baseline` is then a second reading
// of the same array, and `terrain.mjs run --status` renders both so a
// disagreement between them is visible rather than resolved silently.
// THE WRITE-OUTCOME CLASSIFIER, pure and exported so the distinction it draws
// is TESTABLE rather than asserted (PR #667 round 1 finding 2). The executor's
// guard used to read `!outcome.artifact`, which folded two different claims
// into one branch:
//
//   wrote          — the renderer wrote and named what it wrote
//   wrote-nothing  — the renderer RAN and deliberately wrote nothing
//                    (`--no-render`, §12.2 v11; the idempotent rerun, §12.1)
//   named-nothing  — the renderer wrote and did not say where; the case the
//                    guard was built for, and the only one that refuses
//
// It is a classifier rather than a refusal because `fail()` exits the process:
// keeping the judgment pure is what lets the fixture pass exercise all three
// directions without spawning three subprocesses.
export function classifyWriteOutcome(outcome) {
  if (!outcome || typeof outcome !== "object" || !("artifact" in outcome)) return "named-nothing";
  return outcome.artifact ? "wrote" : "wrote-nothing";
}

export function derivedBaseline(table) {
  const states = table.states;
  const writing = states.filter((s) => s.kind === "write");
  // `writers_per_artifact` IS DROPPED, NOT REPAIRED (PR #655 round 1 finding 3,
  // decided at kogaki#665 as that issue's body requires). It mapped each
  // `owner_artifacts` entry to 1 when its `writer` field was a non-empty
  // string and took the max — so the figure was 1 for any table declaring a
  // writer, however many writers there were. `writer` is a PROSE SENTENCE and
  // not a countable set, so the two-writer breach §15.5 exists to forbid was
  // never expressible in this derivation, and the self-test asserting
  // agreement with `counted_baseline` could not fail on the key.
  //
  // A DERIVED FIGURE THAT CAN NEVER DISAGREE IS WORSE THAN AN ABSENT ONE,
  // because a Test Plan reads it as evidence. The countable alternative — the
  // set of call sites reaching the private writer — is a fact about the CODE
  // and not about the table, and `derivedBaseline` derives from the table
  // alone. So the key leaves both sides: the derivation here and the
  // declaration in `workflow.json`'s `counted_baseline`, together, because a
  // declared key with no derived counterpart is the omission hole in the other
  // direction. What replaces it is not a better count: §15.5's one-writer
  // property is made true BY CONSTRUCTION at this issue — one private
  // `writeScreenSurface`, no second path — which is constrain-generation where
  // the figure was after-the-fact detection that never fired.
  return {
    waits: states.filter((s) => s.kind === "wait").length,
    conditional_states: states.filter((s) => Boolean(s.conditional)).length,
    owner_artifact_writes: writing.length,
    judgment_points: states.filter((s) => s.kind === "judgment").length,
    grammared_writing_states: writing.filter((s) => Boolean(s.grammar_surface)).length,
  };
}

// What a COMPLETED run actually did, counted from the run record alone
// (#625 acceptance item 2). Conditional states are counted where entered, so
// a run that never browsed rows legitimately writes fewer artifacts than the
// table's unconditional maximum — which is why `--status` renders the
// unconditional floor beside the table's total rather than asserting equality.
export function runCounts(rec) {
  return {
    waits: rec.waits_reached.length,
    owner_artifact_writes: rec.artifacts_written.length,
    judgment_points: Object.keys(rec.judgments).length,
    conditional_states_entered: rec.conditional_entered.length,
  };
}

function runRecordPath(dir) { return join(dir, RUN_RECORD_FILE); }

function readRunRecord(dir) {
  const p = runRecordPath(dir);
  return existsSync(p) ? readJson(p) : null;
}

function writeRunRecord(dir, rec) {
  writeFileSync(runRecordPath(dir), JSON.stringify(rec, null, 2) + "\n");
  return runRecordPath(dir);
}

// CONTROL STATE ONLY (§15.3). The survey record is referenced BY PATH and
// nothing is copied out of it — copying the ID->slug map here would discharge
// §15's one-record rule by breaching §14.3's single-carrier rule in the same
// act, and the two are satisfiable together only this way. The standing
// refusal this honours is the one at `cmdSurvey`'s own record write.
function newRunRecord(tablePath, table) {
  return {
    workflow: { path: relFromRepo(tablePath), version: table.version ?? null },
    survey_record: null,
    completed: [],
    waits_reached: [],
    conditional_entered: [],
    conditional_skipped: [],
    awaiting: null,
    owner_input: {},
    artifacts_written: [],
    judgments: {},
    gate_declarations_owed: [],
    done: false,
  };
}

function stateById(table, id) {
  return table.states.find((s) => s.id === id) || null;
}

// The path the table declares for the artifact a write state names. Read from
// the table rather than held here, so renaming an owner artifact is a table
// edit and not a code edit (§15.1's evolvability contract).
function artifactPath(table, st) {
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
    || fail("this run has no survey record yet — the state that mints it has not run. Re-enter the executor without --input to advance the flow (§15.2).");
}

// ---- THE RENDERER HALF (§15.1: "a table row PLUS a renderer"). ------------
// Keyed by state id. Each entry performs its state's work and returns either
// null, or `{ artifact }` for a write state naming the path it wrote. The
// executor never inspects these beyond that contract, and a state absent from
// this map is an unrendered state — refused for `write` and `judgment`, and a
// no-op advance for `compute`, which is what makes a pure-sequencing table
// edit cost no code.
const STATE_WORK = {
  survey: (rec, st, args) => {
    rec.survey_record = cmdSurvey({ ...args, "run-dir": rec._dir });
    return null;
  },

  // `tag_screen` AND `tag_row_view` ARE GONE AS STATES (§6.0 v29, kogaki#682,
  // owner ruling 2026-08-28 + owner selection 2026-08-29). Neither renders a
  // Screen — a Screen is the rendering written AFTER a tag is selected — so
  // neither writes `reports/Screen.md`, and with no artifact to write and no
  // sequencing authority to carry there is nothing left for a state to do.
  // Their renderings reach the owner through `tags` and `tag-rows`, which the
  // OWNER runs. `reports/Screen.md` now has exactly one writing state,
  // `cotag_screen`; with `full_report` the owner-artifact writes per run are
  // TWO.

  compose_input: (rec, st, args) => {
    cmdComposeInput({
      ...args,
      survey: needSurvey(rec),
      tag: ownerInput(rec, "TAG_SELECTION")
        || fail("compose_input needs a tag, and no wait has supplied one yet."),
    });
    return null;
  },

  // JUDGMENT POINTS. The executor VALIDATES and never composes (§15.6): the
  // typed record arrives as a file, and the refusals are the existing ones —
  // this story adds no new judgment semantics and re-implements none.
  J1_claims: (rec, st, args) => {
    const path = String(args.claims
      || fail(`${st.id} is a declared judgment point and needs its typed record: --claims <file>. ${st.refusal || ""}`.trim()));
    const survey = readJson(needSurvey(rec));
    const { claims, pin } = readClaimsRecord(readJson(path), survey);
    const tag = ownerInput(rec, "TAG_SELECTION")
      || fail("J1_claims needs a tag, and no wait has supplied one yet.");
    const members = survey.candidates.filter((c) => (c.tags || []).includes(tag));
    const outside = claimsOutsideBound(claims, pin, cotagGroups(members, tag));
    if (outside.length) {
      fail(`${st.id} refuses: ${outside.map((o) => `${o.group} (${o.reason}${o.members.length ? `: ${o.members.join(", ")}` : ""})`).join("; ")}`);
    }
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

  J2_subdivision: (rec, st, args) => {
    const path = String(args.subdivisions
      || fail(`${st.id} is a declared judgment point and needs its typed record: --subdivisions <file>. ${st.refusal || ""}`.trim()));
    const raw = readJson(path);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      fail(`${st.id} refuses a bare array or non-object --subdivisions record; ${st.input_shape || "one typed entry per composed group"}.`);
    }
    // Each entry is read by the EXISTING validator, which carries the judged
    // flag, the judge pin and the coherence rules (§8, §8.1, §12.1).
    for (const name of Object.keys(raw)) readSubdivisionEntry(name, raw[name]);
    rec.judgments[st.id] = relFromRepo(resolve(path));

    // AND THE COMPOSITION, WHICH THE RETIRED `subdivide` OWNED (§15.6.2,
    // kogaki#625 item 1). Validation alone was never the whole of that command:
    // it placed the judge's SubGroups over the parent's members, computed the
    // three instruments, and REFUSED on SUBDIVISION_COVER_INCOMPLETE. §2.1
    // makes completeness a cover COUNTED IN PLACEMENTS, which is a runtime
    // refusal — leaving it to whatever composed the record would move a
    // ratified refusal out of the runtime, so the state composes under the
    // classification rather than trusting a record that says it already did.
    //
    // Optional by ARGUMENT and not by state: a run supplying no
    // `--classification` is judged on the typed record alone, exactly as
    // before. What is no longer possible is composing one from outside.
    if (args.classification !== undefined) {
      const composed = composeSubdivisionRecord(args, rec._dir, readJson(needSurvey(rec)));
      rec.judgments[`${st.id}:composed`] = relFromRepo(resolve(composed));
    }
    return null;
  },

  // THE NEIGHBORHOOD'S EMITTER AND ITS JUDGMENT POINT (kogaki#690, owner
  // ruling 2026-08-29). The reader existed and nothing produced its input —
  // "a reader with no writer is dead code wearing enforcement's name". These
  // two states are `compose_input → J1_claims` applied a second time, which is
  // the shape this table already uses for exactly this problem.
  //
  // BOTH ARE CONDITIONAL, and that is the answer to what an unjudged pull is.
  // A run naming neither renders the all-unjudged line §13.4 already declares,
  // which is a legitimate terminal: refusing it would make the Report
  // unobtainable without an LLM pass, which no ruling asked for. What the
  // declaration removes is the SILENT version — an unjudged run is now a
  // skipped conditional the run record names, not an absent capability.
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
    const { targets } = resolveReportTargets(record, tag, enteredIds, args);
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

  J3_neighborhood: (rec, st, args) => {
    const path = String(args.neighborhood
      || fail(`${st.id} is a declared judgment point and needs its typed record: --neighborhood <file>. ${st.refusal || ""}`.trim()));
    // THE CLOSED-SET AND LEVEL-WITHOUT-CLAIM REFUSALS ARE THE EXISTING ONES.
    // §15.6: the executor validates and never composes, and re-implementing a
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
    // THE FOURTH REFUSAL — COVERAGE (kogaki#741 ruling 1, kogaki#754). The three
    // above refuse a key naming no candidate, a level outside the closed set,
    // and a level with no claim; none of them refuses a record that judges only
    // SOME candidates. That omission IS an LLM-controlled skip: ruling 1 removes
    // every such skip and states that the LLM controls "the level label ... PER
    // CANDIDATE", so a record leaving a candidate unlabelled has not supplied
    // what the ruling requires. Without this the candidate silently never
    // displays, which is the same silence the orphan refusal exists to end,
    // arriving from the other direction.
    //
    // The partial arm is therefore closed BY CONSTRUCTION rather than counted:
    // `neighborhoodScreen` no longer needs an unjudged tally, because after this
    // refusal there is nothing for it to count.
    const uncovered = [...have].filter((slug) => !judgments.has(slug));
    if (uncovered.length) {
      fail(`${st.id} refuses: ${uncovered.length} mechanical candidate(s) carry no judgment — `
        + `${uncovered.join(", ")}. §13.4 makes this pass unconditional and the LLM supplies the `
        + "level label PER CANDIDATE, so a record that judges only some of them is the "
        + "LLM-controlled skip kogaki#741 removes. Judge every candidate the enumeration wrote.");
    }
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

  cotag_screen: (rec, st, args) => ({
    artifact: cmdCotags({
      ...args,
      survey: needSurvey(rec),
      tag: ownerInput(rec, "TAG_SELECTION")
        || fail("cotag_screen needs a tag, and no wait has supplied one yet."),
    }),
  }),

  full_report: (rec, st, args, table) => {
    const written = cmdReport({
      ...args,
      survey: needSurvey(rec),
      tag: ownerInput(rec, "TAG_SELECTION")
        || fail("full_report needs a tag, and no wait has supplied one yet."),
      ids: ownerInput(rec, "ID_SELECTION")
        || fail("full_report needs the entered ID set, and no wait has supplied one yet."),
      // THE EMITTER'S ENUMERATION, passed so the pull consumes it (kogaki#700).
      // Absent where no emitter ran — the unjudged flow — and cmdReport then
      // computes inside the pull as §13.2 always said.
      ...(rec.neighborhood_candidates ? { "neighborhood-candidates": rec.neighborhood_candidates } : {}),
      // THE JUDGMENT JOINS FROM THE RUN RECORD, never from this act's argv
      // (§13.4, kogaki#741 ruling 2). J3 wrote the path it validated; reading
      // it back here is what makes "deleting the judgment file after J3 and
      // re-rendering fails loudly" true — the record still names the path, and
      // the read fails at the missing file rather than silently rendering an
      // unjudged section. An argv `--neighborhood` cannot substitute: the
      // record is the only source, so a stale flag can neither supply nor
      // override the judgment this run actually validated.
      ...(rec.judgments && rec.judgments.J3_neighborhood
        ? { neighborhood: rec.judgments.J3_neighborhood } : {}),
    });
    // OBSERVED, NOT CONSTRUCTED (PR #655 round 1). `cmdSurvey`, the two screen
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
};

// ---- GATE OPTION COMPOSERS — the mirror of STATE_WORK for the other half of
// §15.4's split (kogaki#625 item 1, owner selection 2026-08-26).
//
//   "Workflow orchestration (start, supervise, land, record, expose state) is
//    deterministic infrastructure and belongs in engine code, while a session
//    holds only the steps whose next action turns on an open question ... a
//    judgment step is engine-scheduled but model-decided."
//
// consulted: product-lab@d6fdadd50274cee5ab72730d73c4508b9a53e430 LESSONS.md:32
//   outcome: covered-after-reframing
//   query: "Removing a command that a session invokes: when engine code absorbs
//          a step a session used to perform by hand, which part must stay with
//          the session and which becomes deterministic infrastructure?"
//
// COMPOSING a declaration and RECORDING a capture are `record`, and record is
// engine code; RENDERING the question is the judgment step and stays the
// session's. This is the same split §15.6.1 made for CLAIM_REOFFER, generalised
// to every wait the table marks `renders_gate_declaration: true`.
//
// §6.3's EMPTY QUESTION ALLOWLIST IS UNTOUCHED, and that is the clause worth
// checking rather than assuming: the executor still asks nothing and still
// renders no question UI. It writes a file and stops. What changed is that the
// file can no longer be written from anywhere else.
const GATE_WORK = {
  TRIM_RATIFICATION: (rec, st, args, dir) => {
    const proposalPath = args.proposal ? String(args.proposal) : composeTrimProposal(args, dir);
    if (!proposalPath) {
      fail("TRIM_RATIFICATION composed no proposal: the named act is navigation, or is in neither act list, so there is nothing to ratify. §2.3 — a navigation act wrapped as a proposal is a contract violation from the other direction.");
    }
    const p = readJson(proposalPath);
    return { options: (p.options || []).map((o) => ({ id: o.id, label: o.label })), extra: { proposal: relFromRepo(resolve(proposalPath)) } };
  },

  STRAND_SELECTION: (rec, st, args) => {
    const raw = args.ids !== undefined ? String(args.ids) : ownerInput(rec, "ID_SELECTION");
    const ids = String(raw || fail("STRAND_SELECTION needs --ids a,b,c — the current view's Strands. No wait has supplied an ID selection yet either.")).split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > MAX_STRAND_OPTIONS) {
      fail(`${ids.length} Strands exceed the selector affordance (${MAX_STRAND_OPTIONS} beside the standing option). Narrowing the view for the gate is a TRIM — enter TRIM_RATIFICATION with \`--act trim\`; picking a subset here silently would be the refused minimal-form bundling.`);
    }
    return { options: ids.map((id) => ({ id: `strand:${id}`, label: id })), extra: {} };
  },

  CLAIM_REOFFER: (rec, st, args) => composeClaimReoffer(args, rec._dir, readJson(needSurvey(rec))),
};


// ---- THE EXECUTOR --------------------------------------------------------
// ONE entry point, entered once per act (§15.2). It reads the run record,
// executes table states until the next declared stop, writes that state's
// artifact, and stops. It never blocks on input: every wait in this flow
// spans a chat turn, `parseArgs` reads process.argv only, and supplying a
// stdin path would turn a wait into a prompt — which §6.3's empty question
// allowlist for that window forbids.
function cmdRun(args) {
  const dir = runDir(args);
  const tablePath = args.workflow ? String(args.workflow) : WORKFLOW_TABLE;
  const table = loadWorkflowTable(tablePath);

  if (args.status) return reportRunStatus(dir, tablePath, table);

  let rec = readRunRecord(dir);
  if (!rec) {
    rec = newRunRecord(tablePath, table);
  } else if (rec.workflow.version !== (table.version ?? null)) {
    // RESUMPTION REFUSES rather than guesses (#625 acceptance item 5). A
    // record written against another version of the table cannot be resumed
    // against this one: the position it names may not mean what it meant.
    fail(`run record ${runRecordPath(dir)} was written against workflow table version ${rec.workflow.version} and this table is version ${table.version}. The run cannot be resumed across a table version change — start a fresh run directory.`);
  }
  rec._dir = dir;

  // ---- Owner input, admitted by the WAIT and not by its own shape (AC5).
  if (args.input !== undefined) {
    if (!rec.awaiting) {
      fail(`no wait is outstanding in ${runRecordPath(dir)}, so there is nothing for --input to answer. An owner input is admissible only at a declared wait — the wait is what makes it admissible, not the input's own shape (§15.2, §15.4).`);
    }
    if (args.at !== undefined && String(args.at) !== rec.awaiting) {
      fail(`--input names state ${JSON.stringify(String(args.at))} and this run awaits ${JSON.stringify(rec.awaiting)}. Refused rather than applied to the awaited state: an input bound to the wrong wait is not the input that wait asked for.`);
    }
    // A GATE WAIT IS ANSWERED BY A CAPTURE, NEVER BY A BARE INPUT (PR #671
    // round 1). Removing `capture` as an entry point closed the OUT-OF-BAND
    // route and left this IN-BAND one open beside it: `--input` checked only
    // that some wait was outstanding, so a bare `--input adopt-recomposed:G1`
    // at a gate wait wrote the owner input, pushed `completed` and cleared
    // `awaiting` — skipping the declaration's own option validation, the
    // `--tool-use-id` evidence and the capture row entirely. §15.4's "a capture
    // is admissible only at the wait that declared the gate" says nothing from
    // this direction, so the refusal states it: at such a wait the capture is
    // not one way to answer, it is the only one.
    //
    // SCOPED TO A DECLARATION THAT EXISTS, and acceptance item 6 is what scoped
    // it. The first cut refused `--input` at every gate-declaring wait, which
    // deadlocked the evolvability fixture: its `CLOSING_CONFIRMATION` has no
    // bound option composer, so its declaration is owed-and-unwritten, a
    // capture has nothing to validate against, and refusing the input too left
    // the state unanswerable — adding a gate state to a table would then need
    // driver code, which item 6 denies. So the refusal binds the state a
    // declaration was WRITTEN for. Where none could be composed, `--input`
    // stays the answer and the run record carries `unwritten` with its reason,
    // which is the declared limit rather than a silent exemption.
    const awaitedState = stateById(table, rec.awaiting);
    const owedForInput = rec.gate_declarations_owed.find((g) => g.state === rec.awaiting);
    if (awaitedState && awaitedState.renders_gate_declaration && owedForInput && owedForInput.declaration) {
      fail(`${rec.awaiting} declares a gate and its declaration is written (${owedForInput.declaration}), so it is answered by a CAPTURE and never by a bare --input. The answer must carry the option the declaration offered and the AskUserQuestion tool_use_id that evidences the rendering: run --run-dir ${dir} --capture-option <id> --tool-use-id <id> (or --capture-free-text '<answer>'). An input that skips the declaration answers a question nothing can show was asked (§15.4, §2.3).`);
    }
    rec.owner_input[rec.awaiting] = String(args.input);
    rec.completed.push(rec.awaiting);
    rec.awaiting = null;
  }

  // ---- The CAPTURE, admitted by the WAIT THAT DECLARED THE GATE and by
  // nothing else (kogaki#625 item 1). `capture` ceased to be an entry point,
  // and the refusal the retired command carried — an answer to an option that
  // was never offered — is unchanged, now read against the declaration THIS
  // run wrote rather than one a caller named.
  const capOption = args["capture-option"] !== undefined ? String(args["capture-option"]) : null;
  const capFree = args["capture-free-text"] !== undefined ? String(args["capture-free-text"]) : null;
  if (capOption !== null || capFree !== null) {
    if (!rec.awaiting) {
      fail(`no wait is outstanding in ${runRecordPath(dir)}, so there is no declared gate for a capture to answer. §15.4 — a capture is admissible only at the wait that declared the gate.`);
    }
    const owed = rec.gate_declarations_owed.find((g) => g.state === rec.awaiting)
      || fail(`the outstanding wait ${JSON.stringify(rec.awaiting)} declared no gate, so there is nothing to capture. An answer with no declaration is the shape §7 calls a silent refresh.`);
    // OWED-AND-UNWRITTEN IS A STATE THIS PATH MUST NAME (PR #671 round 1). A
    // gate state this runtime binds no option composer to records
    // `declaration: null` by design — and reading that null as a path threw a
    // raw TypeError instead of the refusal every neighbouring branch is careful
    // to write. It is reachable on the very fixture the design cites as its
    // proof (`evolved.json`'s CLOSING_CONFIRMATION), so the case is not
    // hypothetical: the honest answer is that there is no declaration to answer
    // against, not a stack trace.
    if (!owed.declaration) {
      fail(`${rec.awaiting} owes a gate declaration that was never written: ${owed.unwritten || "no option composer is bound to this state"}. There is nothing for a capture to be validated against, so the answer is refused rather than recorded against an absent declaration.`);
    }
    const toolUseId = String(args["tool-use-id"] || fail("a capture needs --tool-use-id (the AskUserQuestion tool use — evidence, not a claim)"));
    // RECORDED REPO-RELATIVE, READ REPO-RELATIVE — and it took two goes to get
    // both halves pointing the same way (PR #671 rounds 1 and 2).
    //
    // The declaration is stored as `relFromRepo(resolve(declPath))`, which
    // strips the repository root and returns an OUT-OF-REPO path unchanged. The
    // first cut read it back through `join(REPO, …)`, which turned an absolute
    // /tmp path into `<repo>/tmp/...` — every capture in a machine-local run
    // workspace died in `readFileSync` before any refusal could speak. Round 1
    // replaced that with a bare `readJson(owed.declaration)`, which fixed /tmp
    // and broke the mirror case: Node resolves a relative path against
    // `process.cwd()`, so an IN-REPO `--run-dir` driven from a subdirectory
    // records `terrain/run/…` and reads it from wherever the process happens to
    // stand. The same crash, arriving from the other side.
    //
    // `resolve(REPO, …)` is the form that satisfies both, because it returns an
    // already-absolute path untouched and re-roots a repo-relative one against
    // the root `relFromRepo` stripped — so the read is the exact inverse of the
    // write rather than a second convention that agrees with it by luck.
    const { path: capPath, row } = writeCapture(dir, readJson(resolve(REPO, owed.declaration)), { toolUseId, option: capOption, freeText: capFree });
    // The answer IS the owner input for this wait. Adoption, ratification and
    // strand selection are all this one act (§15.6.1: adoption is applying the
    // captured answer), which is why no second command remains to apply it.
    rec.owner_input[rec.awaiting] = capOption !== null ? capOption : capFree;
    rec.completed.push(rec.awaiting);
    rec.awaiting = null;
    console.log(`Captured ${row.stop_id} (gate ${owed.gate_id}) → ${capPath} — machine-local run state, never committed.`);
  }

  // ---- The advance. Order, kind, conditionality and stopping all come from
  // the table; nothing below names a state.
  const entered = new Set([].concat(args.enter || []).filter((x) => x !== true).map(String));
  let stopped = null;
  for (const st of table.states) {
    if (rec.completed.includes(st.id)) continue;
    if (st.conditional && !entered.has(st.id)) {
      if (!rec.conditional_skipped.includes(st.id)) rec.conditional_skipped.push(st.id);
      continue;
    }
    if (st.conditional) {
      // A conditional state skipped in an earlier act and entered in a later
      // one must not remain on both lists: the record is what a resumption
      // reads (AC4), and a record asserting a state was both skipped and
      // entered cannot be resumed from without a second source to break the
      // tie. Entering RETRACTS the skip.
      rec.conditional_skipped = rec.conditional_skipped.filter((x) => x !== st.id);
      if (!rec.conditional_entered.includes(st.id)) rec.conditional_entered.push(st.id);
    }

    const kind = KIND_SEMANTICS[st.kind];

    if (st.kind === "wait") {
      rec.awaiting = st.id;
      // DEDUPED, like its three siblings in this same loop (PR #655 round 1).
      // Re-entering `run --run-dir D` with no `--input` at an outstanding wait —
      // the resume act #625 acceptance item 4 licenses, and the act needSurvey's
      // own refusal text tells the owner to perform — used to record the id a
      // second time, so runCounts(rec).waits exceeded counted_baseline.waits for a
      // run that reached exactly four waits. checks/check-terrain-workflow.sh now
      // counts against that baseline, so the defect made a registered check go red
      // on a record no owner mis-drove.
      if (!rec.waits_reached.includes(st.id)) rec.waits_reached.push(st.id);
      // §15.4 / AC6: the executor renders NO gate declaration and NO question
      // UI. For a wait the table marks `renders_gate_declaration: true` the
      // obligation is RECORDED and named on stop; rendering it is not this
      // story's, and inventing one here would put a declaration behind a
      // runtime that §6.3's allowlist keeps empty for the other two waits.
      if (st.renders_gate_declaration && !rec.gate_declarations_owed.some((g) => g.state === st.id)) {
        // AND THE EXECUTOR COMPOSES IT (kogaki#625 item 1). The pre-item-1 form
        // recorded the id of a state that owed a declaration and left composing
        // it to a `gate` invocation outside the run — which is how a session
        // minted run state the executor never saw. Composing is `record`, and
        // record is engine work; the RENDERING through AskUserQuestion is the
        // judgment step and is still not performed here.
        //
        // §15.1 binds this exactly as it binds a renderer: a new gate state is a
        // table row PLUS an option composer, and the executor invents neither.
        // THE LIMIT IS DECLARED RATHER THAN SILENT, and #625 acceptance item 6
        // is what forced it to be. A state this runtime has no option composer
        // for still RUNS — it reaches the wait, stops, and records that its
        // declaration is owed and unwritten. Refusing instead would have meant
        // that adding a gate state to a table needs driver code, which is the
        // property item 6 denies and the evolvability fixture proves: its
        // CLOSING_CONFIRMATION is exactly such a state.
        //
        // This costs item 1 nothing. What item 1 closes is a SESSION minting run
        // state from outside the executor, and that is closed by `gate` and
        // `capture` ceasing to exist — not by whether this runtime happens to
        // know how to compose a given table's options. An uncomposed
        // declaration is a table owing a composer; it is not an escape hatch,
        // because there is no longer any surface through which one could be
        // written by hand.
        const compose = GATE_WORK[st.id];
        if (!compose) {
          rec.gate_declarations_owed.push({ state: st.id, gate_id: st.gate_id || null, declaration: null,
            unwritten: `this runtime has no option composer bound to ${JSON.stringify(st.id)} — §15.1: a GATE state is a table row PLUS an option composer, and the executor invents neither options nor a judgment` });
        } else {
          const gateId = st.gate_id || fail(`workflow state ${JSON.stringify(st.id)} has an option composer bound to it and names no gate_id. field_semantics requires the key of exactly the states whose renders_gate_declaration is true.`);
          const { options, extra } = compose(rec, st, args, dir);
          const declPath = emitGateDeclaration(dir, gateId, options, extra || {});
          rec.gate_declarations_owed.push({ state: st.id, gate_id: gateId, declaration: relFromRepo(resolve(declPath)) });
        }
      }
      stopped = st;
      break;
    }

    if (st.kind === "terminal") {
      rec.completed.push(st.id);
      rec.done = true;
      stopped = st;
      break;
    }

    const work = STATE_WORK[st.id];
    if (!work && kind.needsRenderer) {
      fail(`workflow state ${JSON.stringify(st.id)} is kind ${JSON.stringify(st.kind)} and this runtime has no renderer bound to it. §15.1: a new state is a table row PLUS a renderer — the executor interprets the table and invents neither a renderer nor a judgment.`);
    }
    // THE AUTHORITY IS HELD FOR THE DURATION OF A WRITING STATE AND NO LONGER
    // (§15.5 v28, kogaki#681). Scoped by `try/finally` rather than by setting
    // and clearing around the call: a renderer that `fail`s would otherwise
    // leave the authority standing for whatever ran next in the same process.
    let outcome = null;
    if (work) {
      const held = WRITING_STATE;
      if (st.kind === "write") WRITING_STATE = st.id;
      try { outcome = work(rec, st, args, table); }
      finally { WRITING_STATE = held; }
    }
    if (st.kind === "write") {
      // A WRITE STATE THAT LEGITIMATELY WROTE NOTHING IS NOT A RENDERER THAT
      // NAMED NO ARTIFACT (PR #667 round 1 finding 2). The two were one branch,
      // so making `full_report` OBSERVE its path turned two live non-writing
      // paths into executor aborts: `run --no-render`, which §12.2 v11 licenses
      // ("--no-render opts out of the rendering"), and the idempotent-rerun
      // branch, which §12.1 rules "IDEMPOTENT, not a duplicate" and which
      // returns after having written. An abort is neither of those.
      //
      // So the renderer declares WHICH it means. `{ artifact: <path> }` wrote
      // and names it; `{ artifact: null }` ran and wrote nothing, deliberately;
      // and a renderer returning nothing at all still FAILS, because that is
      // the case the guard was built for — a renderer that wrote and did not
      // say where.
      const kindOfWrite = classifyWriteOutcome(outcome);
      if (kindOfWrite === "named-nothing") {
        fail(`workflow state ${JSON.stringify(st.id)} is kind "write" and its renderer named no artifact.`);
      }
      if (kindOfWrite === "wrote") {
        rec.artifacts_written.push({ state: st.id, artifact: st.writes, path: relFromRepo(resolve(outcome.artifact)) });
      }
    }
    rec.completed.push(st.id);
  }

  delete rec._dir;
  const recPath = writeRunRecord(dir, rec);

  console.log("");
  if (stopped && stopped.kind === "wait") {
    console.log(`Executor STOPPED at ${stopped.id} — a wait (§15.4). ${stopped.owner_supplies ? `The owner supplies: ${stopped.owner_supplies}.` : ""}`);
    // THE HAND-OVER IS DECLARED IN THE TABLE, never composed here (§6.0 v29,
    // kogaki#682). A wait whose owner needs to READ something before answering
    // names the invocation in `owner_reads`; the executor renders it with the
    // survey record resolved and neither runs it nor relays its output. That
    // split is what keeps the channel honest: the command prints to whoever
    // types it, and the point of this arm is that the owner types it.
    //
    // DATA, NOT DRIVER CODE — the same property #625 acceptance item 6 asserts
    // for every other field here: a table that moves the hand-over, or adds one
    // to a second wait, needs no runtime change.
    if (stopped.owner_reads) {
      const rec2 = readRunRecord(dir);
      const sr = rec2 && rec2.survey_record ? relFromRepo(resolve(REPO, rec2.survey_record)) : "<survey record>";
      // ONE PLACEHOLDER, SUBSTITUTED; everything else is the table's own text.
      // Composing the invocation here would put the command in two places and
      // make the table advisory about its own hand-over.
      const sub = (t) => String(t).replace(/<survey record>/g, sr);
      const or = stopped.owner_reads;
      console.log(`READ FIRST, and run it YOURSELF — ${or.why || ""}`);
      console.log(`  ${sub(or.invocation)}`);
      if (or.also) console.log(`  ${sub(or.also)}`);
    }
    const owedHere = stopped.renders_gate_declaration
      ? rec.gate_declarations_owed.find((g) => g.state === stopped.id) : null;
    if (!stopped.renders_gate_declaration) {
      console.log(`Nothing is asked here: the executor stops and the owner speaks. Re-enter with what they said — run --run-dir ${dir} --input '<...>'`);
    } else if (owedHere && owedHere.declaration) {
      // THE STOP NAMES THE FILE (PR #671 round 1). The executor now WRITES the
      // declaration, and this message still said it did not and still sent the
      // reader to `--input` — while SKILL.md promised "the executor composes the
      // run declaration and names its path". The path was returned silently and
      // carried only on the run record, so the skill instructed the session to
      // render a file the runtime never pointed at.
      console.log(`This wait declares a gate. Its run declaration is WRITTEN: ${owedHere.declaration}`);
      console.log(`Render it through AskUserQuestion exactly as declared — options verbatim, nothing pre-selected, free text always on. The executor renders no question UI and asks nothing (§6.3).`);
      console.log(`Then re-enter with the answer AND its evidence — run --run-dir ${dir} --capture-option <id> --tool-use-id <id>   (or --capture-free-text '<answer>')`);
      console.log(`A bare --input is refused at a gate wait: it would skip the declaration's own option check and the tool_use_id that evidences the rendering.`);
    } else {
      console.log(`This wait declares a gate and its declaration is OWED AND UNWRITTEN: ${(owedHere && owedHere.unwritten) || "no option composer is bound to this state"}.`);
      console.log(`The run is not stuck — §15.1 makes a gate state a table row PLUS an option composer, and this table names one this runtime does not bind. Nothing can be captured here until it does.`);
    }
  } else if (stopped && stopped.kind === "terminal") {
    console.log(`Executor reached ${stopped.id} — terminal (§15.1). The run is over.`);
  } else {
    console.log("Executor advanced to the end of the table without reaching a stop, which a conformant table cannot do.");
  }
  console.log(`Run record: ${recPath}`);
  return recPath;
}

// Counts, from the record and from the table, rendered side by side. This is
// the read #625's acceptance item 2 asks for; story 1.91's registered check is
// what REFUSES on a disagreement.
function reportRunStatus(dir, tablePath, table) {
  const rec = readRunRecord(dir)
    || fail(`no run record at ${runRecordPath(dir)}. A run's counts are read from its record alone (§15.3).`);
  const derived = derivedBaseline(table);
  const declared = table.counted_baseline || {};
  const counts = runCounts(rec);
  console.log(`Run record: ${runRecordPath(dir)}`);
  console.log(`Workflow table: ${relFromRepo(tablePath)} (version ${table.version})`);
  console.log(`Position: ${rec.done ? "done" : rec.awaiting ? `awaiting ${rec.awaiting}` : "advancing"}; ${rec.completed.length} state(s) completed.`);
  console.log(`Survey record (by path, §15.3): ${rec.survey_record || "not yet minted"}`);
  console.log("");
  console.log("counted from the RUN RECORD:");
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(28)} ${v}`);
  console.log("");
  console.log("derived from the TABLE's states array (the denominator acceptance item 2 counts against):");
  for (const [k, v] of Object.entries(derived)) {
    const d = Object.prototype.hasOwnProperty.call(declared, k) ? declared[k] : null;
    const note = d === null ? " (not in counted_baseline)" : d === v ? "" : `  <- DISAGREES with counted_baseline: ${d}`;
    console.log(`  ${k.padEnd(28)} ${v}${note}`);
  }
  console.log("");
  console.log("A run that entered no conditional state legitimately writes fewer artifacts than the table's");
  console.log("unconditional total; the check story 1.91 registers is what judges a disagreement, not this read.");
  return rec;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

// THE TWO OWNER-EXECUTED LISTINGS (SPEC-terrain §6.0 v29, kogaki#682).
//
// Each takes the survey record the executor already produced and PRINTS its
// rendering. Neither writes anything, so §15.5's write authority never engages
// — there is no owner artifact to be written from outside a writing state,
// which is why this channel needs no grant and adds no third artifact to the
// two the ruling fixes.
//
// TWO CASES AND NOT ONE, deliberately. Folding them into a single case
// discriminated by `--tag` would re-create the removed `view`, whose collapse
// of the listing and the row view into one surface is the defect
// `workflow.json` v3 corrected (PR #626 round 2, finding 4) — two renderings
// with two grammars are two entry points.
function cmdTags(args) {
  const record = readJson(String(args.survey || fail("tags needs --survey <file> — the survey record the executor wrote. The `run` stop that hands this over names the path.")));
  emitOwnerListing("tag_listing", renderTagScreen(record));
}

function cmdTagRows(args) {
  const record = readJson(String(args.survey || fail("tag-rows needs --survey <file> — the survey record the executor wrote.")));
  const tag = String(args.tag || fail("tag-rows needs --tag <tag name> — this is the per-tag row view, and the tag is what scopes it."));
  emitOwnerListing("tag_row_listing", renderTagRowView(record, tag, args.family ? String(args.family) : null));
}

function main() {
const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (cmd) {
  case "survey": cmdSurvey(args); break;
  // OWNER-EXECUTED, and that is their whole channel (§6.0 v29, kogaki#682).
  // The owner types these; the session does not drive them. They emit their
  // rendering to the owner's own terminal under the format guard and write
  // nothing, so they are neither Screens nor states of the flow.
  case "tags": cmdTags(args); break;
  case "tag-rows": cmdTagRows(args); break;
  case "cotags": cmdCotags(args); break;
  // RETIRED, LOUDLY (§13.2 v20, kogaki#473) — the same shape `--all-groups`
  // and `--group` took: a refusal naming the replacement, never a silent
  // no-op. The post-gate act is the defect, not a deprecated convenience —
  // a suggestion delivered after the selection cannot inform it.
  case "neighborhood":
    fail("neighborhood is retired as a standalone act (SPEC-terrain §13.2 v20, kogaki#472): "
      + "the provenance-neighborhood section renders on every `report` pull, seeded by the "
      + "entered ID set, inside reports/FullReport.md. Pull the report — "
      + "`report --survey <f> --tag <T> --ids <G…> --claims <f> --subdivisions <f> [--neighborhood <f>] "
      + "--judge-model <m> --judge-effort <e>` — and read the section there.");
    break;
  case "compose-input": cmdComposeInput(args); break;
  case "report": cmdReport(args); break;
  // §15's ONE ENTRY POINT, entered once per act (§15.2). Every standalone
  // owner-facing act is now a state of the table, reachable only through here.
  case "run": cmdRun(args); break;
  // REMOVED, AND REFUSING WITH A POINTER (§15.6.3, kogaki#625 item 1). A
  // removed entry point does not simply vanish: §13.2's `neighborhood`
  // precedent is a refusal NAMING THE REPLACEMENT, never a silent no-op, and
  // without the stub a reader meets a bare unknown-command. They emit no owner
  // surface and carry no sequencing authority, which is why these stubs do not
  // reopen §15.7's removal.
  //
  // This is what makes §15.5's claim TRUE rather than aspirational: with these
  // six gone there is no callable surface by which an act can happen out of
  // order, because every one of them wrote run state a session could mint from
  // outside the executor.
  case "claim":
  case "adopt":
    fail(`${cmd} is removed as an entry point (SPEC-terrain §15.6.1/§15.7, kogaki#625). `
      + "Composing the claims record is the outside composer's; VALIDATING it is the "
      + "`J1_claims` state's; the subset RE-OFFER §7 rules a gate event is the "
      + "`CLAIM_REOFFER` state's, and adoption is that wait's captured answer. Drive them "
      + "through the executor: `run --run-dir <D> --claims <f>`, then, on a proper-subset "
      + "claim, `run --run-dir <D> --enter CLAIM_REOFFER --group <G> --text <line> "
      + "--members a,b`, then `run --run-dir <D> --capture-option <id> --tool-use-id <id>`.");
    break;
  case "subdivide":
    fail("subdivide is removed as an entry point (SPEC-terrain §15.6.2/§15.7, kogaki#625). "
      + "The judgment and its composition — subgroup placement, the three instruments and "
      + "the SUBDIVISION_COVER_INCOMPLETE refusal — are the `J2_subdivision` state's. Drive "
      + "it through the executor: `run --run-dir <D> --subdivisions <f> --classification <f> "
      + "--tag <T> --group <G> --group-claim <line> --judge-model <m> --judge-effort <e> "
      + "--screen-budget <n>`.");
    break;
  case "act":
  case "gate":
  case "capture":
    fail(`${cmd} is removed as an entry point (SPEC-terrain §15.6.3/§15.7, kogaki#625). `
      + "The proposal record, the run declaration and the capture are the executor's, at the "
      + "wait that owes them — composing and recording are engine work; RENDERING the "
      + "declaration through AskUserQuestion stays the session's. Drive it through the "
      + "executor: `run --run-dir <D> --enter TRIM_RATIFICATION --act trim --where <w> "
      + "--why <p> --label <l> --ids a,b`, render the declaration it writes, then "
      + "`run --run-dir <D> --capture-option <id> --tool-use-id <id>`.");
    break;
  case "self-test": {
    // The composed-form fixture pass (kogaki#612): pure, seam-free — every
    // case constructs its own inputs, so the trial runs with no gateway.
    let n = 0; const bad = [];
    const ok = (name, cond) => { if (cond) n++; else bad.push(name); };
    ok("a lesson cite composes in the identity form from the record's own fields",
      composeIdentityCite("alpha", "lesson", "product-lab@aaaaaaa") === "gloss/ELEMENTS.jsonl slug=alpha kind=lesson @aaaaaaa");
    ok("a journey cite carries its own kind in the join key",
      composeIdentityCite("alpha", "journey", "product-lab@aaaaaaa") === "gloss/ELEMENTS.jsonl slug=alpha kind=journey @aaaaaaa");
    ok("the pin's sha segment is taken as served — a bare sha pin composes too",
      composeIdentityCite("alpha", "lesson", "bbbbbbb") === "gloss/ELEMENTS.jsonl slug=alpha kind=lesson @bbbbbbb");
    ok("an absent or empty pin refuses composition rather than minting an unpinned cite",
      composeIdentityCite("alpha", "lesson", undefined) === null
      && composeIdentityCite("alpha", "lesson", "") === null
      && composeIdentityCite("alpha", "lesson", "product-lab@") === null);
    ok("the positional form is not producible by this composer",
      !/ELEMENTS\.jsonl:\d/.test(composeIdentityCite("alpha", "lesson", "product-lab@aaaaaaa")));
    // ---- THE ABBREVIATED-FORM COMPILER (kogaki#653). A `…` in a `form`
    // abbreviates the rest of a long fixed line, so the class matches as a
    // PREFIX. The compiler truncated per split-part, and the masked form is
    // split on digit runs to find placeholder indices — so an abbreviated tail
    // CONTAINING DIGITS was scattered across parts the truncation never
    // reached, and every later fragment was demanded as literal prefix text.
    //
    // THE ASSERTION IS OVER THE BEHAVIOUR, not over the compiler's text: for
    // each surface declaring `abnormal_display_id`, the line
    // `displayIdAbnormalLine` ACTUALLY EMITS must be admitted. That is the
    // class's whole purpose — §14.3's absence case reaching the owner surface —
    // and it had never once been true, on either surface, because the failure
    // fires only on the abnormal path nothing exercised.
    {
      const grammar = loadGrammar(REPORT_FORMAT);
      const emitted = displayIdAbnormalLine(2, 3);
      const admits = (surface) => {
        try { refuseUnlessConformant(surface, emitted, grammar); return true; }
        catch (e) { if (e instanceof FormatRefusal) return false; throw e; }
      };
      for (const surface of ["cotag_screen", "tag_row_listing"]) {
        ok(`${surface} admits the line displayIdAbnormalLine actually emits`, admits(surface));
      }
      // The control: an abbreviated form whose tail carries NO digit worked
      // before this repair and must still work, so the fix is not a widening.
      ok("an abbreviated form with a digit-free tail still matches (classification)",
        (() => {
          try {
            refuseUnlessConformant("cotag_screen",
              "Classification: NAVIGATION (SPEC.md §2.3 — it ranks nothing, narrows nothing and hides nothing.)",
              grammar);
            return true;
          } catch (e) { if (e instanceof FormatRefusal) return false; throw e; }
        })());
    }

    // ---- §15 CONTROL PLANE (story 1.89). Seam-free: every case below either
    // reads the shipped table or constructs a synthetic one, and no case
    // reaches the gateway. AC8: this pass needs no run record and emits no
    // owner surface.
    const shipped = loadWorkflowTable(WORKFLOW_TABLE);
    // The write-outcome classifier's three directions (PR #667 round 1 finding
    // 2). The executor's guard reads this, so these are the cases that separate
    // "wrote nothing deliberately" from "wrote and did not say where".
    ok("a renderer that names its artifact is `wrote`",
      classifyWriteOutcome({ artifact: "reports/FullReport.md" }) === "wrote");
    ok("a renderer that RAN and deliberately wrote nothing is `wrote-nothing`, not a refusal — --no-render and the idempotent rerun are both this",
      classifyWriteOutcome({ artifact: null }) === "wrote-nothing");
    ok("a renderer returning nothing at all is `named-nothing` — the case the guard was built for",
      classifyWriteOutcome(null) === "named-nothing");
    ok("an outcome object with no `artifact` KEY is `named-nothing` too, so a renderer cannot pass the guard by omitting the field",
      classifyWriteOutcome({ something_else: 1 }) === "named-nothing");

    ok("the shipped workflow table loads under the structural rules",
      Array.isArray(shipped.states) && shipped.states.length > 0);
    {
      // ACCEPTANCE ITEM 2's DENOMINATOR AGREES WITH ITSELF. The baseline this
      // executor counts against is DERIVED from the states array; the table
      // also carries a hand-written `counted_baseline`. They are two readings
      // of one array and a disagreement is a defect in the table, so the
      // fixture asserts they agree rather than trusting either alone.
      const d = derivedBaseline(shipped);
      const c = shipped.counted_baseline || {};
      const disagree = Object.keys(d).filter((k) =>
        Object.prototype.hasOwnProperty.call(c, k) && c[k] !== d[k]);
      ok(`the table's counted_baseline agrees with the baseline derived from its own states array${disagree.length ? ` (disagrees on: ${disagree.map((k) => `${k} declared ${c[k]} derived ${d[k]}`).join(", ")})` : ""}`,
        disagree.length === 0);
    }
    ok("run counts read from a record alone, with conditional entries counted separately",
      (() => {
        const c = runCounts({
          waits_reached: ["A", "B"],
          artifacts_written: [{ state: "x" }, { state: "y" }],
          judgments: { J1: "p", J2: "q" },
          conditional_entered: ["z"],
        });
        return c.waits === 2 && c.owner_artifact_writes === 2
          && c.judgment_points === 2 && c.conditional_states_entered === 1;
      })());

    {
      // THE REFUSING DIRECTIONS, each against a fixture that exists to fail.
      // `fail()` exits the process, so these run as subprocesses — the same
      // shape the registered checks use, and the only one that can observe an
      // exit code from inside a fixture pass.
      const selfPath = fileURLToPath(import.meta.url);
      const scratch = join(tmpdir(), `terrain-selftest-${process.pid}`);
      mkdirSync(scratch, { recursive: true });
      const refuses = (name, table, extra = []) => {
        const tp = join(scratch, `${name.replace(/[^a-z0-9]+/gi, "-")}.json`);
        const rd = join(scratch, `rd-${name.replace(/[^a-z0-9]+/gi, "-")}`);
        mkdirSync(rd, { recursive: true });
        if (table !== null) writeFileSync(tp, JSON.stringify(table));
        const r = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rd, "--workflow", table === null ? WORKFLOW_TABLE : tp, ...extra],
          { encoding: "utf8" });
        return r.status !== 0;
      };
      const terminal = { id: "done", kind: "terminal" };
      ok("a table declaring no states is refused",
        refuses("no-states", { version: 1, states: [] }));
      ok("a duplicate state id is refused",
        refuses("dup-id", { version: 1, states: [{ id: "a", kind: "compute" }, { id: "a", kind: "compute" }, terminal] }));
      ok("a kind this executor does not interpret is refused, rather than skipped",
        refuses("bad-kind", { version: 1, states: [{ id: "a", kind: "sideways" }, terminal] }));
      ok("a write state naming no artifact is refused",
        refuses("write-no-artifact", { version: 1, states: [{ id: "a", kind: "write" }, terminal] }));
      ok("a table with no terminal state is refused — the end of a run is read from the table, never from position",
        refuses("no-terminal", { version: 1, states: [{ id: "a", kind: "compute" }] }));
      ok("a write state with no renderer bound to it is refused, never invented and never skipped",
        refuses("write-no-renderer", {
          version: 1,
          owner_artifacts: { screen: { path: "reports/Screen.md", writer: "one" } },
          states: [{ id: "not_a_shipped_state", kind: "write", writes: "screen" }, terminal],
        }));
      ok("an owner input arriving with no outstanding wait is refused — the WAIT is what admits it",
        refuses("input-no-wait", null, ["--input", "claude-code-ops"]));
      rmSync(scratch, { recursive: true, force: true });
    }

    console.log(`terrain self-test: ${n} case(s) pass${bad.length ? `, FAILURES: ${bad.join(" | ")}` : ""}`);
    if (bad.length) process.exit(1);
    break;
  }
  case "validate": {
    const record = readJson(String(args.survey || fail("validate needs --survey <file>")));
    const v = validateSurvey(record);
    if (v.length) { v.forEach((line) => console.log(`FAIL ${line}`)); process.exit(1); }
    console.log("survey record conforms (the same rules the registered check applies)");
    break;
  }
  default:
    console.log(`usage: terrain.mjs <run|tags|tag-rows|survey|cotags|compose-input|report|validate|self-test> [--run-dir DIR] ...
  tags --survey F                           THE OWNER RUNS THIS (SPEC-terrain §6.0). Prints the
                                            pre-selection tag listing — a header and one tag row
                                            per section — under the tag_listing grammar, and
                                            WRITES NOTHING. It is the owner's to type because a
                                            session's tool output is displayed to the session
                                            rather than reliably to the owner; the executor names
                                            this invocation at its TAG_SELECTION stop and neither
                                            runs it nor relays its output.
  tag-rows --survey F --tag T [--family F]  THE OWNER RUNS THIS TOO (§6.0, §6.3's browse-rows fork
                                            half). The candidate rows under one named tag with
                                            their Gloss headlines, under tag_row_listing. Writes
                                            nothing. Never scheduled by the flow.
  run [--run-dir D] [--workflow F] [--input S] [--at STATE] [--enter STATE]
      [--capture-option ID | --capture-free-text S] [--tool-use-id ID]
      [--claims F] [--subdivisions F] [--classification F] [--judge-model M] [--judge-effort E]
                                            THE §15 CONTROL PLANE. One entry point, entered once
                                            per act: reads the run record, executes the states
                                            specs/spec-terrain/workflow.json declares until the
                                            next declared WAIT or the TERMINAL, writes that
                                            state's artifact, and stops. It never asks — a wait is
                                            the executor stopping and the owner speaking, so
                                            re-enter with --input '<what they said>'. Order,
                                            kinds, waits, write bindings, grammar surfaces,
                                            conditionality and judgment placement are read from
                                            the table on every run and are held nowhere in this
                                            file. --workflow runs an alternate table (the
                                            evolvability fixture). --enter STATE enters a
                                            conditional state the flow never schedules.
  run --status [--run-dir D] [--workflow F]  counts this run from its record alone, beside the
                                            counts derived from the table's states array and the
                                            table's own counted_baseline (#625 acceptance item 2).
  survey                                    compose the survey from the seam (element_survey)
  compose-input --survey F --tag T          the BOUNDED input for the claim and subdivision
                                            composers (§9): one tag-scoped shard pair, fetched
                                            once, material keyed by member id and groups
                                            carrying ids only — so a member in several groups
                                            is read once and the read count does not grow with
                                            the placements. Run it BEFORE composing --claims.
  cotags --survey F --tag T [--group G] [--claims F]
         [--subdivisions F --judge-model M --judge-effort E] [--connective F]
                                            the second navigation step (§6) — narrows nothing.
                                            The heading carries the GroupID, Lesson count and
                                            member IDs, claim beneath (§6.1 v5); SubGroups
                                            where §8's conditions bind (§6.2). --claims and
                                            --subdivisions are maps keyed by group name; a
                                            group missing a claim is MARKED, never substituted.
  report --survey F --tag T (--group G | --all-groups) [--claims F]
         [--subdivisions F] [--neighborhood F] [--judge-model M --judge-effort E]
         [--report-dir D]
                                            the Full Report (§12) — untruncated Claims and
                                            Glosses, identified by the TRIPLE (substrate pin,
                                            co-tag query, judge pin). TWO ARTIFACTS (§12.2 v11):
                                            --neighborhood carries the judgment layer: one
                                            level (core|useful|background) and one claim per
                                            candidate, keyed by slug (§13.4, kogaki#686).
                                            the machine RECORD in the run workspace, and the
                                            owner RENDERING — exactly ONE file,
                                            reports/FullReport.md, overwritten per pull
                                            (§12.2 v12) — repo-visible and still never
                                            committed. Both are
                                            written in the same act; --no-render opts out of the
                                            rendering. A rerun under the same identity is
                                            idempotent, not a duplicate. --all-groups is §11's
                                            decided EAGER reading (v5): the co-tag view
                                            generates one report per composed group.
  validate --survey F                       run the composition rules on a record
  self-test                                 the composed-form fixture pass (identity cites, kogaki#612)

 RETIRED, and refusing with a pointer (§13.2 v20, kogaki#472) — the precedent:
   neighborhood                              the provenance-neighborhood section rides every
                                             'report' pull, seeded by the entered ID set. Its
                                             behaviour is GONE FROM THE SYSTEM as a standalone act;
                                             the pointer names where the material now renders.

 REMOVED, and refusing with a pointer (§15.6.3, §15.7 — kogaki#625 item 1):
   claim  adopt  subdivide  act  gate  capture
                                             each is a STATE of the workflow table now, reachable
                                             only through 'run'. Invoke one and its refusal names
                                             the state and the exact 'run' invocation that gets
                                             you there. Listed rather than dropped for the same
                                             reason they still have cases: a reader who knew the
                                             old surface is owed the replacement, and an entry
                                             point that simply vanishes hands them a bare
                                             unknown-command (§13.2's precedent).

 At a wait that declares a gate, the executor WRITES the run declaration and names its path.
 Render it through AskUserQuestion — options verbatim, nothing pre-selected, free text always on
 — then re-enter with --capture-option <id> --tool-use-id <id> (or --capture-free-text).
 A bare --input is REFUSED there: it would skip the declaration's own option check and the
 tool_use_id that evidences the rendering.`);
    process.exit(cmd ? 1 : 0);
}
}
