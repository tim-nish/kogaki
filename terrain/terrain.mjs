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
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SURVEY_SCHEMA = readJson(join(REPO, "specs/spec-terrain/survey-schema.json"));
const RECORD_SCHEMA = readJson(join(REPO, "specs/spec-proposal-contract/record-schema.json"));
const GATE_SCHEMA = readJson(join(REPO, "specs/spec-gate-carrier/gate-schema.json"));
const GATES_REGISTRY = readJson(join(REPO, "gates/registry.json"));

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

function gatewayQuery(tool, toolArgs) {
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
  if (res.status === 11) {
    // The seam is an enhancer elsewhere; here it is the material itself.
    // Degrade with the one-line idiom and stop — Terrain without served
    // renderings has nothing to survey, and inventing material would cross
    // the repository-invisible boundary, not soften a failure.
    process.stderr.write("policy_source unavailable: Terrain has no material without the seam — no survey composed\n");
    process.exit(11);
  }
  if (res.status !== 0) fail(`gateway-query failed (${res.status}): ${res.stderr}`);
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

// --------------------------------------------------------------------------
// survey — read the seam, compose, validate, write.
// --------------------------------------------------------------------------
function cmdSurvey(args) {
  const dir = runDir(args);
  const resp = gatewayQuery("element_survey", { kinds: SURVEY_SCHEMA.families });
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
      lessons.push({ id: `lesson:${rec.slug}`, slug: rec.slug, family: "lesson", tags: rec.tags || [], cite: line.cite, journey: null });
    } else if (rec.kind === "journey") {
      journeys.push({ slug: rec.slug, cite: line.cite });
    }
  }
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
  for (const s of sections) console.log(`  ${tagRow(s)}`);
  console.log(`\nNavigation (narrows nothing): view --survey ${out} [--tag T] [--family lesson|journey] [--sort slug|section]`);
  // The bounded-input pointer, sited at the step BEFORE the one that needs it.
  // A composer reaching for material per group has already spent the reads by
  // the time `cotags` runs, so a pointer only on the co-tag screen would arrive
  // after the cost (kogaki#163 lever 3).
  console.log(`Before composing claims for a tag: compose-input --survey ${out} --tag T — ${COMPOSITION_INPUT_BOUND}. Composing from per-group material instead spends one read per PLACEMENT, which is what the 2026-08-07 architecture run measured at ~19 minutes.`);
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
function fetchHeadlines(kind, tags) {
  const out = new Map();
  for (const t of tags) {
    const resp = gatewayQuery("gloss_index", { tag: `${kind}/${t}` });
    if (resp.miss) continue;
    for (const [slug, entry] of parseGlossShard(resp)) if (!out.has(slug)) out.set(slug, entry);
  }
  return out;
}

const NO_HEADLINE = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";

function cmdView(args) {
  const record = readJson(String(args.survey || fail("view needs --survey <file>")));
  const tags = args.tag ? [].concat(args.tag).map(String) : null;
  const family = args.family ? String(args.family) : null;
  let list = record.candidates;
  if (tags) list = list.filter((c) => tags.some((t) => c.tags.includes(t)));
  // The rows are Lessons; a family filter selects rows whose Strand set
  // includes that family, so `--family journey` is the marked rows.
  if (family === "journey") list = list.filter((c) => c.journey);
  else if (family) list = list.filter((c) => c.family === family);
  list = [...list].sort((a, b) => a.id.localeCompare(b.id));

  // Headlines are fetched only for the tags actually being viewed. Without a
  // --tag there is no shard to read, and prefetching the corpus to fill the
  // gap is the fan-out §9 forbids — so the absence is stated instead.
  let heads = new Map();
  let journeyHeads = new Map();
  if (tags) {
    heads = fetchHeadlines("lessons", tags);
    if (list.some((c) => c.journey)) journeyHeads = fetchHeadlines("journeys", tags);
  }
  let missing = 0;
  for (const c of list) {
    const mark = c.journey ? "" : "  ○ thin (no Journey)";
    console.log(`  ${c.id}  (${c.tags.join(", ") || "no relation"})  ${c.cite}${mark}`);
    if (!tags) continue;
    const h = heads.get(c.slug);
    if (h) console.log(`      “${h.headline}”  ${h.cite}`);
    else { missing++; console.log(`      ${NO_HEADLINE}`); }
    if (c.journey) {
      const jh = journeyHeads.get(c.slug);
      console.log(jh ? `      ↳ Journey: “${jh.headline}”  ${jh.cite}` : `      ↳ Journey: ${NO_HEADLINE}`);
    }
  }
  const split = familySplit(list.map((c) => c.id), record.candidates);
  console.log(`\n${denominator(list.length, record.candidates.length)} in view (${strandFigure(split)}) — a view, not a narrowing: the survey record is unchanged and every Strand stays selectable (free text reaches all of them at the gate).`);
  if (!tags) {
    console.log("Gloss headlines are tag-scoped (one shard per viewed tag) — name a --tag to read them. No whole-corpus prefetch is taken to fill this in (SPEC.md §9).");
  } else if (missing) {
    console.log(`ABNORMAL: ${missing} of ${list.length} rows in view have no served Gloss rendering. This is a fault to clear on the served surface, not a tolerated gap, and nothing was substituted for it (SPEC.md §9).`);
  }
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
// Nothing here is a member-count threshold. §8's three instruments are three
// quantities and none of them is a count of members; a number appearing here
// as one would be a defect against SPEC.md §8.
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
  return [...byCotag.keys()].sort().map((k) => ({
    name: `${selectedTag} × ${k}`,
    cotag: k,
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
  const claims = args.claims ? readJson(String(args.claims)) : {};
  for (const k of Object.keys(claims)) {
    if (!groups.some((g) => g.name === k || g.cotag === k)) {
      fail(`--claims names ${JSON.stringify(k)}, which is no composed group — a claim carries no selection authority and may not invent, merge or rename a group (SPEC.md §6.1)`);
    }
  }
  // SubGroups, where §8's conditions bind (§6.2). The decision to subdivide is
  // §8's CONJUNCTIVE leaf condition and its two disclosures, judged by the
  // composer — never a member count. kogaki#128's "five or more" is calibration
  // evidence for where the undiscriminating-claim condition binds, and there is
  // deliberately no number here to be that threshold.
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

  console.log(`${tag} — the second navigation step. Grouped by co-tag; sort: ${COTAG_SORT}.\n`);
  let claimless = 0;
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
    console.log(subForHeading && subForHeading.length
      ? `  ${g.name} — ${lessonCount(g.members.length)}`
      : `  ${g.name} — ${lessonCount(g.members.length)}: ${g.members.join(", ")}`);

    // The GroupClaim FIRST, then the members (§6.1). A claim composed over a
    // member set is PINNED to that set (§7), so the pinning is stated on the
    // screen where the claim is: the owner reading a subset later gets a gate
    // event, and that only means anything if they saw what it was pinned to.
    const claim = claims[g.name] !== undefined ? claims[g.name] : claims[g.cotag];
    if (claim !== undefined && String(claim).trim() !== "") {
      console.log(`      in common: ${claim}`);
      console.log(`      pinned to ${g.members.length} member(s) — a subset selection RECOMPOSES and re-offers it as a gate event (SPEC.md §7)`);
    } else {
      claimless++;
      console.log(`      in common: ${NO_CLAIM}`);
    }
    if (prose[g.name]) console.log(`      ${prose[g.name]}`);

    // The member Lesson IDs, for EVERY group and WITHOUT --group being named.
    // This is kogaki#128's specific defect: v2 emitted them only under
    // `selected`, so the served screen showed counts and no ids, and no image
    // of a possible Thesis could form. Naming a group narrows what is PRINTED
    // and never what is counted — the cover below is unchanged by it.
    // A judged-empty group renders NO SubGroups. Calling subgroupPlacement on
    // an empty list would sweep every member into `no_member_hidden_subgroup`
    // and manufacture a SubGroup the judgment did not make.
    const sub = subForHeading && subForHeading.length ? subForHeading : null;
    if (sub) {
      const { subgroups } = subgroupPlacement(g, sub, SURVEY_SCHEMA.subdivision);
      for (const sg of subgroups) {
        sg.by_family = familySplit(sg.members, record.candidates);
        // The screen JUDGES rather than merely rendering (§6.2). Same
        // implementation `subdivide` runs — the leaf condition is conjunctive
        // and the two disclosures are disjunctive, and neither gates anything.
        judgeSubgroup(sg, claim);
        // The served SubGroup form (§6.2, v5): one line — SubGroupID, Lesson
        // count, Lesson IDs — then the SubGroupClaim, then the leaf verdict
        // and any disclosures.
        console.log(`\n      ${sg.name} (${lessonCount(sg.members.length)}: ${sg.members.join(", ")})`);
        console.log(`          in common: ${sg.claim || NO_CLAIM}`);
        console.log(`          ${sg.leaf_reason}`);
        for (const d of sg.disclosures) console.log(`          DISCLOSURE — ${d}`);
      }
      console.log(`\n      judged by ${judgePin.model_id} / ${judgePin.effort_tier} (§6.2 — a judged surface with no judge pin is the drift-undetectable shape)`);
      console.log("");
    }
  }
  if (claimless) {
    console.log(`\nABNORMAL: ${claimless} of ${shown.length} group(s) on this screen carry no composed GroupClaim. §6.1 serves the claim FIRST and a screen without one cannot show what its members share — this is a fault to clear in composition, and nothing was substituted for it.`);
    // The remedy names the BOUNDED input rather than "go compose something":
    // the fault above is cleared by composing, and the way composing was
    // costing ~19 minutes was per-group reads (kogaki#163 lever 3).
    console.log(`Compose them from the bounded input — compose-input --survey ${String(args.survey)} --tag ${tag} — and pass the result back as --claims (and --subdivisions, which §8's judgment is composed from the SAME artifact and spends no further read).`);
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
  console.log(`\nCover: ${covered.size} of ${members.length} member Lessons appear in at least one co-tag group — counted AFTER composition, over placements. Selected tag: ${strandFigure(split)}; ${denominator(members.length, record.candidates.length)}.`);
  console.log(`Classification: NAVIGATION (SPEC.md §2.3 — enumerate + sort over tags the members already carry on the served surface). No proposal record is written, and no record of any kind.`);
  console.log(`Narrows nothing: the survey record is unchanged, the full candidate set stays reachable, and free text still reaches every Strand at the gate.`);
  if (!selected) console.log(`\nSelect a group (still narrowing nothing): cotags --survey <F> --tag ${tag} --group "<co-tag>"`);
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
// decision are unchanged by this story, so `claim` emits the same run
// declaration `gate` emits and adoption happens only against a capture.
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

function cmdClaim(args) {
  const dir = runDir(args);
  const record = readJson(String(args.survey || fail("claim needs --survey <file>")));
  const tag = String(args.tag || fail("claim needs --tag <selected tag>"));
  const groupArg = String(args.group || fail("claim needs --group <co-tag>"));
  const text = String(args.text || fail("--text is required: the composed \"in common:\" line. §7 binds the pinning, the gate event and the record's shape — the composer's prompt, model and wording are not specified here and are not invented here."));
  const groups = cotagGroups(record.candidates.filter((c) => (c.tags || []).includes(tag)), tag);
  const group = groups.find((g) => g.name === groupArg || g.cotag === groupArg) || fail(`no co-tag group ${JSON.stringify(groupArg)} in ${tag}`);

  const subset = args.members ? String(args.members).split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (subset) {
    const stray = subset.filter((id) => !group.members.includes(id));
    if (stray.length) fail(`--members names ${stray.join(", ")}, which are not members of ${group.name} — a subset is a subset of the set the claim was pinned to`);
  }
  const members = subset || group.members;
  const isSubset = Boolean(subset) && subset.length !== group.members.length;

  // GroupClaim FIRST, then the member Lessons (§7). Every count beside a claim
  // names its families and states its denominator in Lessons (§9).
  group.by_family = familySplit(group.members, record.candidates);
  console.log(sectionFigure(group, record.candidates.length));
  console.log(`  in common: ${text}`);
  console.log(`  pinned to ${members.length} member(s)${isSubset ? ` — a SUBSET of the group's ${group.members.length}` : ""}\n`);
  for (const p of memberPins(members, record.candidates)) console.log(`    ${p.id}  ${p.cite}`);

  const id = `terrain-claim-${Date.now()}`;
  const claimRec = {
    id,
    kind: "group-claim",
    pin: record.pin,
    group: group.name,
    claim: text,
    members,
    member_pins: memberPins(members, record.candidates),
    composed_over: "members",
    adopted: false,
    counted: familySplit(members, record.candidates),
    lessons_served: record.candidates.length,
    recomposed_over_subset: isSubset,
  };
  const violations = validateClaimRecord(claimRec, SURVEY_SCHEMA.group_claim);
  if (violations.length) fail(`refusing to write a non-conforming claim record:\n  ${violations.join("\n  ")}`);
  const out = join(dir, `${id}.terrain-claim.json`);
  writeFileSync(out, JSON.stringify(claimRec, null, 2) + "\n");
  console.log(`\nClaim record (pinned to its member set, adopted: false): ${out}`);
  console.log(`Subset figure: ${strandFigure(claimRec.counted)}; ${denominator(members.length, record.candidates.length)}.`);
  console.log("Composing a claim narrows nothing on its own — the survey record is unchanged and a subset selection is the OWNER's act; rank, trim and hide still route through the proposal contract (SPEC.md §2.3, §8.2).");

  if (!isSubset) {
    console.log("\nFull-group claim: this rendering is per-invocation. It is not persisted as the adopted claim, and it does not survive a subset selection (SPEC.md §7).");
    return;
  }

  // The set changed, so this is a GATE EVENT rather than a refresh. The
  // re-offer goes through the gate carrier — never a Terrain-local affordance.
  // The ORIGIN travels into the gate — as a RECORD where one exists, and as
  // ARGUMENTS where the claim was composed AT THE SCREEN (§7's v4 rider).
  // The screen deliberately writes no record, so before this the re-offer for
  // exactly the claims v3 moved earlier reached the owner with nothing to
  // compare against — and handing the owner a stale claim and expecting them
  // to notice it no longer fits IS homework (topics/articles.md:73@f918c515).
  // No record is written here either: the caller already holds what it
  // composed, so the origin is passed rather than persisted.
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
  const declPath = emitGateDeclaration(dir, CLAIM_GATE, [
    { id: `adopt-recomposed:${id}`, label: `Adopt the recomposed wording over these ${members.length} member(s): ${text}` },
  ], originBlock);
  console.log(`\nThe member set changed, so the claim is RE-OFFERED as a gate event, never silently refreshed and never carried over unchanged.`);
  console.log(`Gate run declaration: ${declPath}`);
  console.log(`Render it through AskUserQuestion exactly as declared — options verbatim, nothing pre-selected, free text always on — then \`capture\`, then \`adopt --claim ${out} --capture <capture file>\`.`);
}

// The one place a run declaration is composed, shared by `gate` and by the
// claim re-offer: the re-offer routes through manifest item 4's carrier and
// never through an affordance of Terrain's own (SPEC.md §7, §4).
function emitGateDeclaration(dir, gateId, dynamicOptions, extra = {}) {
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

function cmdAdopt(args) {
  const dir = runDir(args);
  const claimRec = readJson(String(args.claim || fail("adopt needs --claim <terrain-claim record>")));
  const capture = readJson(String(args.capture || fail("adopt needs --capture <gate-capture file> — adoption happens only at the gate, never as a refresh")));
  const row = [...(capture.rows || [])].reverse().find((r) => r.gate_id === CLAIM_GATE)
    || fail(`no ${CLAIM_GATE} row in the capture — a recomposed claim that was never offered cannot be adopted (SPEC.md §7)`);
  const answer = row.payload && row.payload.answer;
  if (!answer) fail("the capture row carries no answer");

  let claim = null;
  let source = null;
  if (answer.free_text) {
    claim = answer.free_text;
    source = "free-text";
  } else if (String(answer.option || "").startsWith("adopt-recomposed:")) {
    claim = claimRec.claim;
    source = "recomposed";
  } else if (answer.option === "keep-original-wording") {
    claim = String(args["original-text"] || fail("--original-text is required when the owner kept the original wording: the adopted record carries the wording that was adopted, over the members it is now pinned to"));
    source = "original-wording-kept";
  } else {
    fail(`answer option ${JSON.stringify(answer.option)} is not an adoption outcome this gate offers`);
  }

  // The members are ALWAYS the set the claim is now pinned to — the subset.
  // Keeping the original wording keeps the WORDING, never the old member set:
  // the recorded member set is exactly what makes the mismatch LEGIBLE rather
  // than forbidden (§7). The full-group claim survives only in the
  // per-invocation rendering and is never persisted here.
  const id = `terrain-adopted-claim-${Date.now()}`;
  const adopted = {
    id,
    kind: "adopted-claim",
    pin: claimRec.pin,
    claim,
    claim_source: source,
    members: claimRec.members,
    member_pins: claimRec.member_pins,
    counted: claimRec.counted,
    lessons_served: claimRec.lessons_served,
    gate: { gate_id: row.gate_id, stop_id: row.stop_id, answer: row.payload.answer },
  };
  const violations = validateClaimRecord(adopted, SURVEY_SCHEMA.adopted_claim);
  if (violations.length) fail(`refusing to write a non-conforming adopted-claim record:\n  ${violations.join("\n  ")}`);
  const out = join(dir, `${id}.terrain-adopted-claim.json`);
  writeFileSync(out, JSON.stringify(adopted, null, 2) + "\n");
  console.log(`Adopted claim (${source}) recorded with the members it was composed from — by member id and pin, never by a group id: ${out}`);
  if (source === "original-wording-kept") {
    console.log("The original wording now stands over a CHANGED member set. The record carries that set, so the mismatch is legible rather than forbidden (SPEC.md §7).");
  }
  console.log(`Members (${strandFigure(adopted.counted)}); ${denominator(adopted.members.length, adopted.lessons_served)} — by id: ${adopted.members.join(", ")}`);
}

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
// NO NUMERIC CONSTANT APPEARS IN THE SPLIT OR STOP LOGIC. §8's declared
// reopen trigger is the first subdivision implementation reaching review with
// one, and inventing a threshold to stand in for the judge's verdicts would
// fire it. The leaf condition is the CONJUNCTION of the judge's two verdicts;
// the three instruments are REPORTED quantities and gate nothing; the screen
// budget arrives per run rather than as a constant here.
// --------------------------------------------------------------------------
// The SubGroup's own two rendered lines — its name and its claim. Rendering
// arithmetic for the screen-budget instrument; it gates nothing and is not
// stop logic.
const LINES_PER_SUBGROUP_HEADER = 2;

// The PLACEMENT half of subdivision, extracted so the co-tag screen (§6.2) and
// `subdivide` (§8) share ONE composer rather than each carrying its own.
//
// It is this half — not the instruments and not the leaf verdicts — that owns
// the guarantee subdivision hides none: a member the judge invented is refused,
// and a member the judge left unplaced lands in the EXPLICIT named SubGroup
// rather than being dropped. Two copies of that would be two places for the
// cover to be wrong, and the second copy is the one nobody re-reads.
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
  const unplaced = parent.members.filter((id) => !placedIds.has(id));
  if (unplaced.length) {
    subgroups.push({
      name: block.no_member_hidden_subgroup,
      claim: "These members fit none of the composed SubGroups. They are named rather than dropped.",
      members: unplaced.sort(),
      verdicts: { composes_honestly: true, tighter_than_parent: false, legible_at_a_glance: true },
    });
    unplaced.forEach((id) => placedIds.add(id));
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
// a second place for the leaf condition to drift; the rule is enforced at the
// layer where it can be broken, and both surfaces break it the same way.
export function judgeSubgroup(sg, groupClaim) {
  const vd = sg.verdicts || {};

  // The leaf condition, CONJUNCTIVE. Both conjuncts are the judge's own
  // verdicts and neither is re-derived from a proxy.
  const honest = vd.composes_honestly === true;
  const tighter = vd.tighter_than_parent === true;
  sg.leaf = honest && tighter;
  sg.leaf_reason = honest
    ? (tighter ? "leaf: the claim composes honestly AND is tighter than its parent's"
               : "NOT a leaf: the claim composes honestly but is not tighter than its parent's — the split bought nothing")
    : "NOT a leaf: the claim does not compose honestly — split further";

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

function cmdSubdivide(args) {
  const dir = runDir(args);
  const block = SURVEY_SCHEMA.subdivision;
  const record = readJson(String(args.survey || fail("subdivide needs --survey <file>")));
  const tag = String(args.tag || fail("subdivide needs --tag <selected tag>"));
  const groupArg = String(args.group || fail("subdivide needs --group <co-tag>"));
  const groupClaim = String(args["group-claim"] || fail("--group-claim is required: the parent GroupClaim the subgroup claims are judged TIGHTER THAN"));
  const modelId = String(args["judge-model"] || fail("--judge-model is required: the judge pin's model id. A per-invocation judged surface with no judge pin is the drift-undetectable shape — `recomputed fresh` silently becomes `recomputed by a different judge` (topics/knowledge-architecture.md:84@f918c515). Terrain names no model of its own; it records the one that served."));
  const effortTier = String(args["judge-effort"] || fail("--judge-effort is required: the judge pin's effort tier, the pin's fourth component alongside the model id"));
  const screenBudget = Number(args["screen-budget"] || fail("--screen-budget is required: the rendering destination, in lines. It is supplied per run rather than fixed in code, so no numeric constant enters this runtime (SPEC.md §8)"));
  const classification = readJson(String(args.classification || fail("subdivide needs --classification <file>: the judge's SubGroups, each with its composed claim, its members, and its own composes_honestly / tighter_than_parent / trails_into_enumeration / true_of_every_member / legible_at_a_glance verdicts")));

  const groups = cotagGroups(record.candidates.filter((c) => (c.tags || []).includes(tag)), tag);
  const parent = groups.find((g) => g.name === groupArg || g.cotag === groupArg) || fail(`no co-tag group ${JSON.stringify(groupArg)} in ${tag}`);

  // Compose the SubGroups from the judge's placement. A member the judge
  // invented is refused; a member the judge left unplaced is placed in the
  // EXPLICIT named SubGroup rather than dropped — subdivision hides none.
  const { subgroups, placedIds } = subgroupPlacement(parent, classification, block);

  for (const sg of subgroups) {
    sg.by_family = familySplit(sg.members, record.candidates);
    judgeSubgroup(sg, groupClaim);

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

  // Rendering: GroupClaim FIRST, then the SubGroups each with its own composed
  // claim, then the Lessons per SubGroup.
  console.log(sectionFigure(parent, record.candidates.length));
  console.log(`  in common: ${groupClaim}\n`);
  for (const sg of subgroups) {
    console.log(`  ${sg.name} (${strandFigure(sg.by_family)}); ${denominator(sg.members.length, record.candidates.length)}`);
    console.log(`    in common: ${sg.claim}`);
    console.log(`    ${sg.leaf_reason}`);
    for (const d of sg.disclosures) console.log(`    DISCLOSURE — ${d}`);
    const ins = sg.instruments;
    console.log(`    instruments (three quantities, none a threshold, none gating): relative share of placements ${(ins.relative_share_of_placements * 100).toFixed(1)}%; screen budget ${ins.screen_budget_lines.needs} lines needed of ${ins.screen_budget_lines.budget}; legible at a glance: ${ins.legible_at_a_glance}`);
    for (const id2 of sg.members) console.log(`      ${id2}`);
    console.log("");
  }
  console.log(`Cover: ${out.cover.placed} of ${out.cover.of} parent members placed in at least one SubGroup — counted AFTER composition, over placements. No member is hidden.`);
  console.log(`Judge pin: ${modelId} (effort ${effortTier}) — the fourth component on the pin discipline, so a change of serving judge is OBSERVABLE and fires the judge-migration tripwire.`);
  console.log(`Subdivision ranks, trims and hides nothing — those still route through the proposal contract, and the >${MAX_STRAND_OPTIONS}-option trim guard at the selection gate stands (SPEC.md §8.2).`);
  console.log(`Dogfood specimen: ${path}`);
  console.log("NOT OFFERED BY DEFAULT. Co-tags are the default for a run naming no substrate; subdivision is reachable only by naming it. Producing this specimen ARRIVES at §8.1's offering gate rather than discharging it — merged code evidences existence, never the gate's standing. The hub-side gate (product-lab:q_a/staging/2026-07-31-subdivision-offering-measurement-due.md) remains undischarged.");
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
// so `[]` — a judged group with no leaf split — was TRUTHY and took the
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
//   {"G": {"judged": true, "subgroups": [ … ]}}   judged, with a leaf split
//   {"G": {"judged": true, "subgroups": []}}      judged, EMPTY — conformant
//   key absent                                    not judged — refused on the co-tag path
//
// A BARE ARRAY IS REFUSED BY NAME rather than read as the old form. Accepting
// it would leave two encodings for one fact, and a composer emitting the old
// shape would get the old accidental semantics back silently — the collision
// the served surface rules against: "a collision wants REFUSAL OR
// QUALIFICATION at the resolver, never a first-hit-wins guess"
// (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/knowledge-architecture.md:154`).
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
// composer's (§7 leaves it there) and the leaf condition stays the judge's
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
        // Untruncated, exactly as §12 serves it: the composer judging whether a
        // SubGroupClaim is TIGHTER THAN its parent's is the reader §8's leaf
        // condition addresses, and a headline-only input would decide that
        // conjunct by what the bound withheld. A missing rendering is MARKED
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
  console.log(`Classification: REPORT (SPEC.md §2.3) — it ranks nothing, narrows nothing and hides nothing. It composes no claim and judges no leaf condition: the claim wording stays the composer's (§7) and the leaf condition the judge's (§8).`);
  console.log(`Machine-local run workspace, never committed (founding spec rider 3).`);
  console.log(`\nNext: cotags --survey ${String(args.survey)} --tag ${tag} --claims <F> [--subdivisions <F> --judge-model M --judge-effort E]`);
}

// Where reports live. §12.2: the MACHINE-LOCAL run workspace, never committed.
// A STABLE home rather than a per-invocation directory, because §12.1's first
// case — same identity, run twice, ONE report — is a claim across invocations
// and a timestamped directory would make every rerun a duplicate by
// construction.
function reportsDir(args) {
  const dir = args["report-dir"] || process.env.KOGAKI_RUN_DIR
    || join(homedir(), ".kogaki", "reports");
  mkdirSync(dir, { recursive: true });
  return dir;
}

// The identity TRIPLE (§12.1): substrate pin, co-tag query (selected tag,
// named group), judge pin — the last typed `none` where no judged material is
// present. UNIFORM ARITY: `none` is a value that must be present, never an
// omitted component, because a key whose shape depends on the report's own
// content is one a request cannot construct.
export function reportIdentity(pin, tag, group, judgePin) {
  return {
    pin,
    query: { tag, group },
    judge_pin: judgePin || NO_JUDGE,
  };
}

// The filename is derived from the identity ONLY so that reruns collide on
// disk. Nothing reads it: §12.2 makes the recorded components the sole source
// of identity, and this hash is not parsed back anywhere.
function identityDigest(identity) {
  return createHash("sha256")
    .update(JSON.stringify([identity.pin, identity.query.tag, identity.query.group,
      identity.judge_pin === NO_JUDGE ? NO_JUDGE
        : `${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}`]))
    .digest("hex").slice(0, 16);
}

export function sameIdentity(a, b) {
  return JSON.stringify(reportIdentityKey(a)) === JSON.stringify(reportIdentityKey(b));
}
function reportIdentityKey(i) {
  return [i.pin, i.query.tag, i.query.group,
    i.judge_pin === NO_JUDGE ? NO_JUDGE
      : `${i.judge_pin.model_id}/${i.judge_pin.effort_tier}`];
}

function cmdReport(args) {
  const dir = reportsDir(args);
  const record = readJson(String(args.survey || fail("report needs --survey <file>")));
  const tag = String(args.tag || fail("report needs --tag <selected tag>"));
  const all = Boolean(args["all-groups"]);
  if (all && args.group) fail("report takes --group <co-tag> or --all-groups, never both");
  const groupArg = all ? null : String(args.group || fail("report needs --group <co-tag> or --all-groups (SPEC.md §11 v5: the co-tag view generates EAGERLY, one report per composed group)"));

  const members = record.candidates.filter((c) => (c.tags || []).includes(tag));
  if (members.length === 0) fail(`no candidate carries the served tag ${JSON.stringify(tag)}`);
  const groups = cotagGroups(members, tag);
  // --all-groups is §11's decided EAGER reading (v5, kogaki#146): one report
  // per composed group, in the same act as the screen. Generation stays
  // idempotent per §12.1, so the eager pass and a later re-request are the
  // same artifact.
  const targets = all ? groups
    : [groups.find((g) => g.name === groupArg || g.cotag === groupArg)
        || fail(`no co-tag group ${JSON.stringify(groupArg)} in ${tag}`)];

  const claims = args.claims ? readJson(String(args.claims)) : {};
  const subdivisions = args.subdivisions ? readJson(String(args.subdivisions)) : {};
  const subOf = (g) => readSubdivisionEntry(
    g.name,
    subdivisions[g.name] !== undefined ? subdivisions[g.name] : subdivisions[g.cotag]);

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
  const unjudged = targets.filter((g) => subOf(g) === null).map((g) => g.name);
  if (unjudged.length) {
    fail(`--subdivisions carries no entry for ${unjudged.join(", ")}. On the co-tag path `
      + `every group is judged (§6.2), so a missing entry cannot be recorded: write `
      + `{"judged": true, "subgroups": []} for a group whose judgment found no leaf split`);
  }

  // One shard fetch for the whole invocation — tag-scoped and bounded (§9),
  // shared across every target group.
  let bodies = null;
  const fetchBodies = () => {
    if (bodies) return bodies;
    const lessonBodies = fetchGlossBodies("lessons", tag);
    const journeyBodies = targets.some((g) => g.members.some((id) => (record.candidates.find((c) => c.id === id) || {}).journey))
      ? fetchGlossBodies("journeys", tag) : new Map();
    bodies = { lessonBodies, journeyBodies };
    return bodies;
  };

  for (const group of targets) generateReport(group);

  function generateReport(group) {
  const groupClaim = claims[group.name] !== undefined ? claims[group.name] : claims[group.cotag];
  const sub = subOf(group);
  // Unconditional now: `sub` is non-null for every target (refused above), and
  // NO_JUDGE is never minted here. It stays exported and valid in the identity
  // triple — §12.1's uniform arity is untouched and `(pin, query, none)` is
  // still constructible by a requester who does not hold the report.
  const judgePin = suppliedJudge;
  const identity = reportIdentity(record.pin, tag, group.name, judgePin);

  // §12.1 case 1: same identity, run twice -> ONE report. The rerun is
  // idempotent, not a duplicate, so an existing report with THIS identity is
  // returned rather than rewritten.
  const out = join(dir, `terrain-full-report-${identityDigest(identity)}.json`);
  if (existsSync(out)) {
    const prior = readJson(out);
    if (sameIdentity(prior.identity, identity)) {
      console.log(`Full Report already exists for this identity — the rerun is IDEMPOTENT, not a duplicate (SPEC.md §12.1): ${out}`);
      console.log(`Identity: pin=${identity.pin} query=(${tag}, ${group.name}) judge=${identity.judge_pin === NO_JUDGE ? NO_JUDGE : `${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}`}`);
      return;
    }
  }

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
      gloss: lg ? lg.body : NO_GLOSS_BODY,
      gloss_cite: lg ? lg.cite : null,
      journey_gloss: c.journey ? (jg ? jg.body : NO_GLOSS_BODY) : null,
      journey_cite: c.journey && jg ? jg.cite : null,
    };
  });

  // JUDGED-EMPTY IS ZERO SubGroupClaims, and the catch-all must NOT fire for it
  // (§12.1 v9). `subgroupPlacement` places nothing on an empty list and then
  // sweeps every member into `no_member_hidden_subgroup` — correct when a
  // judgment produced a split that missed some members, wrong when it produced
  // no split at all, because it manufactures a SubGroup the judgment did not
  // make.
  let subgroups = null;
  if (sub && sub.subgroups.length === 0) {
    subgroups = [];
  } else if (sub) {
    const placed = subgroupPlacement(group, sub.subgroups, SURVEY_SCHEMA.subdivision);
    subgroups = placed.subgroups.map((sg) => ({
      name: sg.name,
      claim: sg.claim || NO_CLAIM,
      members: renderMembers(sg.members),
    }));
  }

  const report = {
    id: `terrain-full-report-${identityDigest(identity)}`,
    kind: "full-report",
    // The identity is RECORDED, not implied (§12): §12.2 makes these the only
    // source of it, so a report that carried none could never be resolved.
    identity,
    classification: "report",
    narrows: false,
    truncated: false,
    group_claim: groupClaim !== undefined && String(groupClaim).trim() !== "" ? groupClaim : NO_CLAIM,
    subgroups,
    // A judged-empty group keeps its MEMBERS: they are not in `subgroups`, so
    // nulling them here would drop the group's whole membership from the
    // artifact. Keyed on whether any SubGroupClaim exists, never on whether the
    // group was judged.
    members: subgroups && subgroups.length ? null : renderMembers(group.members),
    counted: familySplit(group.members, record.candidates),
    lessons_served: record.candidates.length,
  };
  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");

  console.log(`Full Report (untruncated; SPEC.md §12): ${out}`);
  console.log(`Identity RECORDED in the report: pin=${identity.pin} query=(${tag}, ${group.name}) judge=${identity.judge_pin === NO_JUDGE ? NO_JUDGE : `${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}`}`);
  console.log(`${sectionFigure(Object.assign({}, group, { by_family: report.counted }), record.candidates.length)}`);
  if (abnormal) {
    console.log(`ABNORMAL: ${abnormal} served Gloss rendering(s) are missing. This is a fault to clear on the served surface, not a tolerated gap, and nothing was substituted for it (SPEC.md §9, §12).`);
  }
  console.log("Classification: REPORT (SPEC.md §2.3, §12) — it ranks nothing, narrows nothing and hides nothing, so it sits in neither act list.");
  console.log("A RENDERING, not an address: nothing downstream resolves a report id, and a Brief records members and pins (SPEC.md §12).");
  console.log("Machine-local and never committed (SPEC.md §12.2; founding spec rider 3).");
  }
}

// --------------------------------------------------------------------------
// act — the second-proposer boundary, enforced by enumeration.
// --------------------------------------------------------------------------
function cmdAct(args) {
  const dir = runDir(args);
  const act = String(args.act || fail("act needs --act <name>"));
  const acts = RECORD_SCHEMA.acts;
  if (acts.navigation.includes(act)) {
    console.log(`${act} is NAVIGATION — use \`view\`; no record is written. A navigation act wrapped as a proposal is a contract violation from the other direction (record-schema.json acts).`);
    return;
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
    return;
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
}

// --------------------------------------------------------------------------
// gate — emit the per-run gate declaration for the skill to render through
// AskUserQuestion. The registry declares the gate CLASS; the run declaration
// carries the computed options, written beside the capture in the run
// workspace (the recorded consult miss: no served position was found on
// static declaration of run-computed option sets — surfaced, not silently
// resolved).
// --------------------------------------------------------------------------
function cmdGate(args) {
  const dir = runDir(args);
  const gateId = String(args.gate || fail("gate needs --gate <terrain-strand-selection|terrain-trim-ratification>"));
  let strandOptions = [];
  if (args.proposal) {
    const p = readJson(String(args.proposal));
    strandOptions = (p.options || []).map((o) => ({ id: o.id, label: o.label }));
  } else {
    const ids = String(args.ids || fail("gate needs --ids a,b,c (the current view's Strands) or --proposal <record>")).split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > MAX_STRAND_OPTIONS) {
      fail(`${ids.length} Strands exceed the selector affordance (${MAX_STRAND_OPTIONS} beside the standing option). Narrowing the view for the gate is a TRIM — run \`act --act trim\` and present it at terrain-trim-ratification; picking a subset here silently would be the refused minimal-form bundling.`);
    }
    strandOptions = ids.map((id) => ({ id: `strand:${id}`, label: id }));
  }
  // The registered standing option always rides; a proposal record that
  // already carries an option with the same id (the premise negation IS the
  // standing decline) is not doubled — a duplicated option id would make
  // options_offered unable to say which one was answered.
  const out = emitGateDeclaration(dir, gateId, strandOptions);
  console.log(readFileSync(out, "utf8").trimEnd());
  console.log(`\nRun declaration: ${out}`);
  console.log("Render through AskUserQuestion exactly as declared — options verbatim, nothing pre-selected, free text always on. Then record with `capture`.");
}

// --------------------------------------------------------------------------
// capture — record the answer with its payload and the rendering's own
// evidence (the AskUserQuestion tool_use_id).
// --------------------------------------------------------------------------
function cmdCapture(args) {
  const dir = runDir(args);
  const decl = readJson(String(args.declaration || fail("capture needs --declaration <run-declaration file>")));
  const toolUseId = String(args["tool-use-id"] || fail("capture needs --tool-use-id (the AskUserQuestion tool use — evidence, not a claim)"));
  const option = args.option ? String(args.option) : null;
  const freeText = args["free-text"] ? String(args["free-text"]) : null;
  if (!option && !freeText) fail("capture needs --option <id> or --free-text <answer>");
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
  console.log(`Captured ${row.stop_id} (gate ${decl.id}) → ${out} — machine-local run state, never committed.`);
}

// The CLI dispatch runs only when this file IS the entry point. Without the
// guard, importing the module to exercise one of its exported composers runs
// the dispatch with no command, which prints the usage banner and calls
// process.exit — so the module was unimportable and every composer in it was
// reachable only through a subprocess. A mechanism no fixture can call is the
// orphan shape one level in (`orphan-mechanisms-fail-the-suite`).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

function main() {
const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (cmd) {
  case "survey": cmdSurvey(args); break;
  case "view": cmdView(args); break;
  case "cotags": cmdCotags(args); break;
  case "compose-input": cmdComposeInput(args); break;
  case "claim": cmdClaim(args); break;
  case "adopt": cmdAdopt(args); break;
  case "subdivide": cmdSubdivide(args); break;
  case "report": cmdReport(args); break;
  case "act": cmdAct(args); break;
  case "gate": cmdGate(args); break;
  case "capture": cmdCapture(args); break;
  case "validate": {
    const record = readJson(String(args.survey || fail("validate needs --survey <file>")));
    const v = validateSurvey(record);
    if (v.length) { v.forEach((line) => console.log(`FAIL ${line}`)); process.exit(1); }
    console.log("survey record conforms (the same rules the registered check applies)");
    break;
  }
  default:
    console.log(`usage: terrain.mjs <survey|view|cotags|compose-input|act|gate|capture|validate> [--run-dir DIR] ...
  survey                                    compose the survey from the seam (element_survey)
  view --survey F [--tag T] [--family X]    navigation — narrows nothing
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
  claim --survey F --tag T --group G --text S [--members a,b]
        [--original F | --original-text S [--original-members a,b]]
                                            GroupClaim first, pinned to its member set (§7);
                                            a subset RE-OFFERS it at the gate carrier
  adopt --claim F --capture F [--original-text S]
                                            record the adopted claim with its members, by id and pin
  report --survey F --tag T (--group G | --all-groups) [--claims F]
         [--subdivisions F] [--judge-model M --judge-effort E] [--report-dir D]
                                            the Full Report (§12) — untruncated Claims and
                                            Glosses, identified by the TRIPLE (substrate pin,
                                            co-tag query, judge pin), machine-local and never
                                            committed. A rerun under the same identity is
                                            idempotent, not a duplicate. --all-groups is §11's
                                            decided EAGER reading (v5): the co-tag view
                                            generates one report per composed group.
  subdivide --survey F --tag T --group G --group-claim S --classification F
            --judge-model M --judge-effort E --screen-budget N
                                            semantic subdivision (§8) — DOGFOOD-FIRST, never
                                            offered by default; co-tags are the default
  act --act rank|trim|hide --where --why --label --ids a,b   proposal record (item 3 contract)
  act --act <other>                         report record — the non-member fallback
  gate --gate ID --ids a,b | --proposal F   per-run gate declaration (item 4 carrier)
  capture --declaration F --tool-use-id ID --option X | --free-text S
  validate --survey F                       run the composition rules on a record`);
    process.exit(cmd ? 1 : 0);
}
}
