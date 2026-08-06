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
  for (const s of sections) console.log(`  ${sectionFigure(s, c.of)}`);
  console.log(`\nNavigation (narrows nothing): view --survey ${out} [--tag T] [--family lesson|journey] [--sort slug|section]`);
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
const NO_SECOND_TAG = "(no second served tag)";
// The ordering is DECLARED rather than scored: co-tag name ascending, then
// member id ascending. No scoring, no model call in the ordering.
const COTAG_SORT = "co-tag name ascending, then member id ascending (declared; no scoring, no model call in the ordering)";

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

  const selected = args.group ? String(args.group) : null;
  const shown = selected ? groups.filter((g) => g.name === selected || g.cotag === selected) : groups;
  if (selected && shown.length === 0) fail(`no co-tag group ${JSON.stringify(selected)} in ${tag}`);

  console.log(`${tag} — the second navigation step. Grouped by co-tag; sort: ${COTAG_SORT}.\n`);
  for (const g of shown) {
    g.by_family = familySplit(g.members, record.candidates);
    console.log(`  ${sectionFigure(g, record.candidates.length)}`);
    if (prose[g.name]) console.log(`      ${prose[g.name]}`);
    if (selected) for (const id of g.members) console.log(`      ${id}`);
  }

  // The cover, counted AFTER composition, over the groups as rendered.
  const covered = new Set(groups.flatMap((g) => g.members));
  const uncovered = members.map((c) => c.id).filter((id) => !covered.has(id));
  if (uncovered.length) {
    fail(`COTAG_COVER_INCOMPLETE — ${uncovered.length} member(s) of ${tag} appear in no co-tag group: ${uncovered.sort().join(", ")}. Every member appears in at least one group and members carrying no second tag appear in the explicit ${JSON.stringify(NO_SECOND_TAG)} group rather than being dropped (SPEC.md §2.1, §6).`);
  }
  const split = familySplit(members.map((c) => c.id), record.candidates);
  console.log(`\nCover: ${covered.size} of ${members.length} member Lessons appear in at least one co-tag group — counted AFTER composition, over placements. Selected tag: ${strandFigure(split)}; ${denominator(members.length, record.candidates.length)}.`);
  console.log(`Classification: NAVIGATION (SPEC.md §2.3 — enumerate + sort over tags the members already carry on the served surface). No proposal record is written, and no record of any kind.`);
  console.log(`Narrows nothing: the survey record is unchanged, the full candidate set stays reachable, and free text still reaches every Strand at the gate.`);
  if (!selected) console.log(`\nSelect a group (still narrowing nothing): cotags --survey <F> --tag ${tag} --group "<co-tag>"`);
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
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  if (!registered) fail(`${gateId} is not declared in gates/registry.json — an unregistered gate is the uncovered-by-default shape`);
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
  const seen = new Set(strandOptions.map((o) => o.id));
  const standing = registered.options.filter((o) => !seen.has(o.id));
  const declaration = {
    ...registered,
    options: [...strandOptions, ...standing],
    declared_at: new Date().toISOString(),
    run_declaration: true,
  };
  delete declaration.dynamic_options;
  const out = join(dir, `${gateId}.run-declaration.json`);
  writeFileSync(out, JSON.stringify(declaration, null, 2) + "\n");
  console.log(JSON.stringify(declaration, null, 2));
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

const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (cmd) {
  case "survey": cmdSurvey(args); break;
  case "view": cmdView(args); break;
  case "cotags": cmdCotags(args); break;
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
    console.log(`usage: terrain.mjs <survey|view|act|gate|capture|validate> [--run-dir DIR] ...
  survey                                    compose the survey from the seam (element_survey)
  view --survey F [--tag T] [--family X]    navigation — narrows nothing
  cotags --survey F --tag T [--group G] [--connective F]
                                            the second navigation step (§6) — narrows nothing
  act --act rank|trim|hide --where --why --label --ids a,b   proposal record (item 3 contract)
  act --act <other>                         report record — the non-member fallback
  gate --gate ID --ids a,b | --proposal F   per-run gate declaration (item 4 carrier)
  capture --declaration F --tool-use-id ID --option X | --free-text S
  validate --survey F                       run the composition rules on a record`);
    process.exit(cmd ? 1 : 0);
}
