#!/usr/bin/env node
// Terrain — the survey/selection surface (manifest item 1, specs/SPEC.md, the port manifest;
// kogaki#14 umbrella, kogaki#17 story 1.8; governing spec
// SPEC-terrain).
//
// Terrain reads SERVED RENDERINGS only, through the seam (element_survey),
// and composes the survey under its three contracts:
//   the placement cover — completeness is a cover counted in placements, AFTER composition,
//        with every figure naming which family it counted;
//   grouping is presentation-only — navigation narrows nothing;
//   the second-proposer boundary — rank/trim/hide are proposals routed
//        through the item-3 record contract; enumerate/sort/filter-by-owner
//        are navigation; an act in neither list is a report.
//
// Terrain validates a survey record BEFORE writing it, with the same rules
// checks/check-terrain-composition.sh applies after — constrain generation,
// then detect what generation cannot promise.
//
// Run state (survey records, proposal records, gate declarations, captures)
// lives in the run workspace — `runs/terrain/<timestamp>/` in the working tree
// since kogaki#750, `~/.kogaki/runs/...` before it. It is still machine state
// and still uncommitted — machine-readable intermediates and resumable run
// state live in machine-state directories (specs/SPEC.md, "Human-facing files
// live where the human works"), and `.gitignore` keeps it so; what the move
// changes is that it is legible where a contributor works and bounded by the
// in-band prune, rather than accumulating unread in a hidden home directory.
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   the open questions
//       SPEC-terrain
//   the open-questions section
//       SPEC-terrain
//   the Full Report
//       SPEC-terrain
//   the report identity
//       SPEC-terrain
//   location and naming
//       SPEC-terrain
//   the Thesis candidates
//       SPEC-terrain
//   the provenance neighborhood
//       SPEC-terrain
//   the neighborhood defect
//       SPEC-terrain
//   the neighborhood as a report
//       SPEC-terrain
//   the settled-strand-set input
//       SPEC-terrain
//   the neighborhood join
//       SPEC-terrain
//   the neighborhood section's shape
//       SPEC-terrain
//   the carrier rule
//       SPEC-terrain
//   the emit-time refusal
//       SPEC-terrain
//   the display-ID rule
//       SPEC-terrain
//   the single producer rule
//       SPEC-terrain
//   how A–E compose
//       SPEC-terrain
//   the control plane
//       SPEC-terrain
//   the workflow table
//       SPEC-terrain
//   the re-entrant executor
//       SPEC-terrain
//   the run record
//       SPEC-terrain
//   the wait rule
//       SPEC-terrain
//   write authority
//       SPEC-terrain
//   the typed judgment points
//       SPEC-terrain
//   the claim re-offer wait
//       SPEC-terrain
//   subdivide's composition fold
//       SPEC-terrain
//   the non-flow utilities
//       SPEC-terrain
//   what is not carried
//       SPEC-terrain
//   the placement cover
//       SPEC-terrain
//   presentation-only grouping
//       SPEC-terrain
//   the second-proposer boundary
//       SPEC-terrain
//   the served-renderings input rule
//       SPEC-terrain
//   the out-of-scope decision
//       SPEC-terrain
//   the candidate model
//       SPEC-terrain
//   what would falsify the candidate model
//       SPEC-terrain
//   the co-tag navigation step
//       SPEC-terrain
//   the pre-selection listing
//       SPEC-terrain
//   the display's serve rule
//       SPEC-terrain
//   the SubGroup threshold
//       SPEC-terrain
//   the post-tag-selection window
//       SPEC-terrain
//   GroupClaim-first rendering
//       SPEC-terrain
//   semantic subdivision
//       SPEC-terrain
//   measurement before offering
//       SPEC-terrain
//   the rendering rule
//       SPEC-terrain
//   what `options_offered` is judged against
//       SPEC-gate-carrier
//   Human-facing files live where the human works
//       specs/SPEC.md
//
import { spawnSync, spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync, renameSync, readdirSync } from "node:fs";
import { basename, delimiter, dirname, join, resolve, sep } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { loadGrammar, refuseUnlessConformant, validateSurface, classMatchers, FormatRefusal } from "./format-guard.mjs";
import { enterRun, laneDir, terrainRunEntry } from "./runs.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const SURVEY_SCHEMA = readJson(join(REPO, "src/survey-schema.json"));
const RECORD_SCHEMA = readJson(join(REPO, "src/record-schema.json"));
const GATE_SCHEMA = readJson(join(REPO, "src/gate-schema.json"));
const GATES_REGISTRY = readJson(join(REPO, "src/gate-registry.json"));
// the carrier rule's single carrier of the RENDERED FORM. Resolved from this module's own
// location, like every schema above it — the emit-time refusal must not depend
// on the cwd a run happens to start in.
const REPORT_FORMAT = join(REPO, "src/report-format.json");

const NO_RELATION_SECTION = "No relation (no served tag)";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// THE PENDING RUN RECORD, held for exactly as long as a run's state loop is
// executing (kogaki#808). `fail()` is `process.exit(1)`, and the record was
// written only after the loop — so a refusal raised INSIDE a state discarded
// every transition the same act had already performed. The specimen is
// `J3_neighborhood`: `neighborhood_input` writes the candidate enumeration to
// the run directory, `J3_neighborhood` then refuses for want of `--neighborhood`,
// and the enumeration sat on disk with the run record not naming it. J1 and J2
// have the same shape and lose nothing, because their input is produced by a
// separate command; J3's is produced by the preceding state in the same act,
// which is what makes the loss specific to it.
//
// A REFUSAL STAYS A REFUSAL. This changes nothing about what is refused, what
// exit code it carries, or what it prints; it stops the refusal being a
// ROLLBACK of the states that completed before it. That is the constraint the
// issue's own `remedy:` names, and it is sited at `fail()` rather than at the
// judgment states because a per-state repair would cover the one state whose
// loss was observed and leave the next one to be discovered the same way.
let RUN_PERSIST = null;

export function setRunPersist(dir, rec) {
  RUN_PERSIST = dir && rec ? { dir, rec } : null;
}

// THE PERSIST NEVER MASKS THE REFUSAL IT RIDES. A write that throws is
// swallowed deliberately: the operator is being told why the act refused, and
// a second failure reported in its place would replace a diagnosis with an
// accident of the tracing.
function persistPendingRun() {
  if (!RUN_PERSIST) return;
  const { dir, rec } = RUN_PERSIST;
  RUN_PERSIST = null;
  try {
    const out = { ...rec };
    delete out._dir;
    writeRunRecord(dir, out);
  } catch { /* the refusal below is the message that matters */ }
}

// ---- THE ONE SOFT WINDOW, AND IT IS A JUDGE RE-ASK (kogaki#1030). ----------
//
// A judgment state's refusals are `fail()` — `process.exit(1)` — which is right
// for every caller it has ever had: an owner-supplied record that the state
// refuses is the run stopping. With the executor invoking the judge itself, the
// same refusal is now also the thing a RETRY reads: "the response passes through
// the existing refusals; a refused response is retried at most the count
// `workflow.json` declares for the state, then the run fails with the refusal
// text" (kogaki#1030 item 1).
//
// SO THE REFUSALS ARE NOT DUPLICATED, THE EXIT IS DEFERRED. A second copy of
// each state's refusal, written to throw for the retry path, is two readings of
// one rule — the shape `J3_neighborhood`'s own comment sets out to avoid. The
// window is opened around ONE call, the validation of one judge response, and
// closed in a `finally`; inside it `fail()` throws the refusal instead of
// exiting, and `invokeJudge`'s caller decides between re-asking and letting the
// refusal reach `fail()` for real.
//
// COUNTED, NOT BOOLEAN, so a nested open cannot close the window early.
//
// EVERYTHING OUTSIDE THAT WINDOW IS UNCHANGED. A refusal raised anywhere else in
// a run still exits, still persists the pending record, and still prints the
// same text — this adds no second exit path and retires none.
let SOFT_REFUSAL_DEPTH = 0;

function softRefusals(fn) {
  SOFT_REFUSAL_DEPTH += 1;
  try { return fn(); }
  finally { SOFT_REFUSAL_DEPTH -= 1; }
}

function fail(msg) {
  // The window is the judge re-ask's and nothing else's; `JudgmentRefusal` is
  // the existing carrier for "a refusal that has not exited yet", declared with
  // `orFail` further down and reused here rather than a second class.
  if (SOFT_REFUSAL_DEPTH > 0) throw new JudgmentRefusal(msg);
  persistPendingRun();
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

// The run workspace. An explicit `--run-dir` and `KOGAKI_RUN_DIR` are unchanged
// — the flow drives several states through ONE workspace and that is how it
// says which — and only the DEFAULT moves, from the hidden home directory to
// this lane's own directory in the tree (kogaki#750).
//
// The default path is also the only one that PRUNES, and deliberately: pruning
// is a lane's act over the entries it owns, and a caller who named a directory
// named it because they hold it. `enterRun` prunes before it creates, so the
// bound is enforced as the run's first act rather than after the write it was
// supposed to bound.
function runDir(args) {
  if (args["run-dir"] || process.env.KOGAKI_RUN_DIR) {
    const dir = args["run-dir"] || process.env.KOGAKI_RUN_DIR;
    mkdirSync(dir, { recursive: true });
    return dir;
  }
  return enterRun("terrain", terrainRunEntry());
}

// ---- WHICH RUN THE ADVANCE IS AN ADVANCE OF (PR #1034 round 1, blocking) ----
//
// THE DEFECT THIS CLOSES, stated because it is the one the model's `--run-dir`
// was silently carrying. `--run-dir` was run identity, re-supplied by the
// session on every re-entry; kogaki#1027 removes the session's route and left
// nothing in its place. With no carrier the default branch above mints a
// TIMESTAMP-NAMED NEW WORKSPACE per invocation, so `start` would open run A and
// stop at its gate while the advance ran in an empty B — re-running `survey`,
// raising the same gate class again, and orphaning A's open-gate pointer, which
// by `write-gate-capture.py`'s own docstring makes every later raising of that
// class ambiguous until the TTL reaps it. Pinning `KOGAKI_RUN_DIR` instead fails
// the other way: `start` refuses an existing record, so one fixed directory
// admits exactly one run ever.
//
// SO THE CARRIER IS A POINTER THE START ACT WRITES, and it is the smallest
// thing that can be one: a file in the lane directory naming the workspace this
// lane's open run lives in. It is written at `start`, read by the advance, and
// removed when the run reaches its terminal — so "no open run" and "an open run
// somewhere" are distinguishable states rather than one silence.
//
// MACHINE-LOCAL, like every other run intermediate: it lives under `runs/`,
// which this repository ignores wholesale, so it is repo-visible and never
// committed.
const OPEN_RUN_POINTER = "open-run";

// `KOGAKI_OPEN_RUN` overrides the pointer path for tests, on the idiom
// `KOGAKI_OPEN_GATES` already sets one seam over. It exists because the
// alternative is exercising `runDir`'s DEFAULT branch, which `terrain-runtime`'s
// own registry record declines to assert for a stated reason: driving it prunes
// this repository's real terrain lane, so a fixture pass would evict an owner's
// runs to check a path.
function openRunPointerPath() {
  return process.env.KOGAKI_OPEN_RUN || join(laneDir("terrain"), OPEN_RUN_POINTER);
}

export function readOpenRunPointer() {
  const p = openRunPointerPath();
  if (!existsSync(p)) return null;
  const dir = readFileSync(p, "utf8").trim();
  // A POINTER TO A DIRECTORY THAT IS GONE IS NOT A RUN. A `runs/` prune, a
  // deleted workspace or a hand-cleaned lane each leave the file behind, and
  // resolving it would advance into a directory with no record in it.
  return dir && existsSync(dir) ? dir : null;
}

function writeOpenRunPointer(dir) {
  const p = openRunPointerPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, `${resolve(dir)}\n`);
}

function clearOpenRunPointer() {
  try { rmSync(openRunPointerPath(), { force: true }); } catch { /* a stale pointer costs a refusal, never a run */ }
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
// same treatment the rendering rule already gives a missing Gloss rendering
// (`NO_HEADLINE`): a stated token in place of the value, never the value from
// somewhere else. A legacy survey record written before this story renders
// entirely in these tokens, which is the correct reading of it — run
// `terrain survey` again (location and naming v11: run-workspace artifacts are uncommitted
// and regenerable, so regeneration is the remedy, not a migration).
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

// A SURVEY WITH NO CANDIDATES IS A REFUSAL (kogaki#1026), and it was a NOTE
// until 2026-09-09, when the difference cost two runs. The note was correct
// and said the right thing — the ambiguity kogaki#368 left behind, that zero
// candidates can mean the corpus holds no Lessons or that the call reached no
// surface — but it printed and returned, and the executor carried on into
// `TAG_SELECTION`, wrote a gate declaration whose tag listing held only its
// header lines, and minted an open-gate pointer. Raising the tag question over
// an empty table is precisely what the pre-selection listing exists to
// prevent, so the surface that states the ambiguity is also the one that must
// stop.
//
// THE PIN IS PART OF THE REFUSAL, not decoration. The two causes are told
// apart by asking a second served surface AT THE SAME PIN, and an operator who
// is not told which pin was read cannot perform that check — which is how the
// 2026-09-09 runs were read as a corpus with no material when the corpus held
// 558 lines.
//
// Pure, so it can be fixtured; the caller prints what it returns and exits.
export function surveyEmptinessRefusal(servedLines, lessonCount, pin) {
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
export function composeIdentityCite(slug, kind, pin) {
  const sha = String(pin ?? "").split("@").pop();
  if (!sha) return null;
  return `gloss/ELEMENTS.jsonl slug=${slug} kind=${kind} @${sha}`;
}

// --------------------------------------------------------------------------
// survey — read the seam, compose, validate, write.
// --------------------------------------------------------------------------
function cmdSurvey(args) {
  // THE RUN DIRECTORY IS NOT CREATED HERE ANY MORE (kogaki#1026). `runDir`
  // creates — and on the default path PRUNES — under `runs/`, so calling it
  // first made every survey touch the run store before it knew whether it had
  // anything to survey. The read and the decision both come first, and the
  // directory is taken only once this act is going to write into it.
  //
  // WHAT THAT DOES AND DOES NOT BUY, stated rather than left to be assumed
  // (PR #1033 round 1). On the STANDALONE `terrain survey` path it leaves
  // `runs/` absent, which is what the act arm asserts. Under the EXECUTOR it
  // does not: `cmdRun` takes the run directory before the `survey` state runs,
  // so the lane is already entered and pruned by then. What the refusal
  // withholds there — and what kogaki#1026 actually asks for — is the run
  // RECORD, the gate declaration and the open-gate pointer, none of which is
  // written once this state exits non-zero.
  // `{}`, NOT a kind filter. `element_survey` declares `kind` (SINGULAR) and
  // `tag`; this sent `kinds` and the gateway dropped the undeclared key and
  // returned the miss shape, so the survey composed with ZERO candidates at
  // exit zero and validated (kogaki#368). The families are filtered below
  // anyway, on `rec.kind`, so the server-side filter was never load-bearing.
  // The transport now refuses an undeclared key before sending it.
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
      // The id stays family-qualified: a journey shares its lesson's slug, and
      // the qualification is what kept the two apart when both were rows.
      //
      // `display_id` is minted HERE and nowhere else (the display-ID rule, story 1.53). The
      // survey record IS the ID→slug map, so there is no second carrier to
      // drift from: every owner surface resolves through `displayIdOf` over
      // these candidates.
      //
      // ASSIGNMENT ORDER, and why it is the served corpus's own order (SQ1).
      // the display-ID rule makes the ID stable within a pin and explicitly permits a pin
      // advance to renumber, but "legal to shuffle" is hostile to an owner
      // holding a printed display — so the numbering follows the order the
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
  // THE TAG LISTING IS NOT EMITTED HERE ANY MORE (PR #667 round 1 findings 4
  // and 5). It is the `tag_listing` surface, and `renderTagDisplay` is its one
  // emitter, reached through the executor and written under that surface's
  // grammar. While both existed a run emitted the listing TWICE — once from
  // this compute state under no grammar, once from `tags` through the
  // guard — and the two had already diverged, since only the guarded copy
  // carried the amended navigation hint. Two emitters of one surface with one
  // of them unguarded is the defect class kogaki#665 exists to close, arriving
  // one channel over; extracting rather than copying is what criterion 2 asks
  // for. The navigation line went with it: it named `view`, which the non-flow utilities
  // removes.
  // The bounded-input pointer, sited at the step BEFORE the one that needs it.
  // A composer reaching for material per group has already spent the reads by
  // the time `cotags` runs, so a pointer only on the CoTagGroups display would arrive
  // after the cost (kogaki#163 lever 3).
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

// --------------------------------------------------------------------------
// view — navigation. Narrows nothing; the record is never rewritten.
// --------------------------------------------------------------------------
// A tier-2 gloss shard, parsed into slug → { headline, cite }. The headline is
// the SERVED rendering's first sentence, quoted at the cite the seam returned —
// never re-parsed from a file and never composed here (SPEC.md, the served-renderings input rule, the rendering rule).
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
// and never `<tag>` alone. No fan-out, no whole-corpus prefetch (SPEC.md, the rendering rule).
// `stats` IS AN OUT-PARAMETER RATHER THAN A CHANGED RETURN. `resolveHeadlines`
// is its only injecting caller, and the shape is kept rather than collapsed to
// that one caller, because widening the return would make a caller's contract
// a casualty of a fetch accounting change.
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
// component that reads served renderings through the seam (the served-renderings input rule, the rendering rule), so the
// Brief does not become a second substrate reader: it hands over the members
// it has already settled and gets their served prose back.
//
// BOUNDED BY THE MEMBERS, NEVER BY THE CORPUS. The tag set fetched is the
// union of the given members' OWN tags, so a settled set of 2-4 Strands costs
// at most that many shards. This is the same rule the rendering rule already binds `cmdView`
// to — "one shard per viewed tag … no fan-out, no whole-corpus prefetch" —
// applied to a set that is smaller still, and it is why attaching renderings
// to every candidate at survey-generation time was REFUSED: that would fetch
// every tag in the corpus, which is the prefetch the rendering rule names.
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
  // the rendering rule forbids stays unreachable from here.
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
// inside `cmdReport`'s fetch loop, and the neighborhood cases drive the display
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

// The PRE-SELECTION listing: the TAG ROWS — a tag name and its Lesson count,
// and nothing else (the rendering rule's allowlist, transcribed into the `tag_listing` grammar).
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
// grammar the rendering rule deliberately holds to two.
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
function renderTagDisplay(record) {
  const out = ["The survey — display 1. Navigation (narrows nothing): name a tag.", ""];
  for (const s of record.sections) out.push(`  ${tagRow(s)}`);
  out.push("");
  out.push(NAVIGATION_HINT);
  return out.join("\n");
}

// --------------------------------------------------------------------------
// cotags — the second navigation step (SPEC.md, the co-tag navigation step). Selecting a tag displays
// the other tags its members carry, grouped by co-tag with counts.
//
// It is NAVIGATION in the full sense the second-proposer boundary gives — it is that section's `enumerate`
// and `sort` applied to the tags the members already carry on the served
// surface — so it writes NO record of any kind, proposal or otherwise. A
// navigation act wrapped as a proposal is a contract violation from the other
// direction (record-schema.json acts).
//
// Nothing HERE is a member-count threshold, and that is now a statement about
// this function rather than about the runtime. Semantic subdivision's three instruments are three
// quantities, none of them a count of members, and they gate nothing — that is
// unchanged at v30. The threshold the engine DOES carry is
// `SUBDIVISION_REQUIRED_AT`, and it decides only WHETHER a group must split
// (kogaki#683); it is not one of the instruments and none of them became one.
// --------------------------------------------------------------------------
export const NO_SECOND_TAG = "(no second served tag)";
// A group with no composed claim is MARKED, never substituted — the same
// discipline the rendering rule applies to a missing Gloss rendering, at the claim's layer.
// The row's TC-target marker (kogaki#861). Same vocabulary as the Gloss
// markers beside it: a fault to clear, never a substituted candidate id.
export const NO_TARGET = "⟨no Thesis-candidate target on this row — ABNORMAL, a judged row reaching the renderer without one, never substituted⟩";

export const NO_CLAIM = "⟨no composed GroupClaim — ABNORMAL, a fault to clear, never substituted⟩";

// No per-row pin renders on the display (the display's serve rule v5, withdrawing v4's per-row
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
  // (the display's serve rule v6, story 1.56, kogaki#317). `G<n>` over the sorted group list, so
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
  // RENUMBER IT. One new co-tag shifts every group after it. The display and
  // the report of a single run agree, which is what an owner-entered id set
  // (kogaki#314) consumes; an id copied from a display printed under an earlier
  // pin does not, and the display says so. No persistent map is written —
  // that would be the second carrier the display-ID rule's ID→slug rule already refuses.
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
  // THE DISPLAY IS COMPOSED INTO A BUFFER, NOT PRINTED AS IT GOES (the emit-time refusal, story
  // 1.54, AC1). The refusal has to be able to emit NOTHING, and a command that
  // printed its first eight lines and then refused would have put a
  // nonconformant display in front of the owner — which is the whole condition
  // the refusal exists to prevent. `say` is the only writer below; `fail`
  // still goes to stderr and is not a line of this surface
  // (report-format.json `refusal_text_boundary`).
  const display = [];
  const say = (s = "") => { for (const line of String(s).split("\n")) display.push(line); };
  const record = readJson(String(args.survey || fail("cotags needs --survey <file>")));
  const tag = String(args.tag || fail("cotags needs --tag <selected tag>"));
  const members = record.candidates.filter((c) => (c.tags || []).includes(tag));
  if (members.length === 0) fail(`no candidate carries the served tag ${JSON.stringify(tag)} — nothing is hidden here, the tag is simply not in the survey's vocabulary`);
  const groups = cotagGroups(members, tag);

  // Machine-composed connective prose at render time is ADMISSIBLE (the co-tag navigation step), and
  // it arrives with the invariants binding HARDER. The composer may attach
  // text to a group and may do nothing else: membership is re-derived here and
  // never taken from the composer, and the cover is counted AFTER composition —
  // because a composer that cannot omit in principle can still omit in fact.
  let prose = {};
  if (args.connective) {
    prose = readJson(String(args.connective));
    for (const k of Object.keys(prose)) {
      if (!groups.some((g) => g.name === k)) {
        fail(`connective prose names ${JSON.stringify(k)}, which is no composed group — prose carries no selection authority and may not invent, merge or rename a group (SPEC.md, the co-tag navigation step)`);
      }
    }
  }

  // GroupClaim-first rendering, AT the display, for EVERY group (the display's serve rule, GroupClaim-first rendering's v3
  // rider). v2 composed a claim only under a separate `claim` invocation naming
  // one group, which is why the served display carried none — the machinery was
  // built and unreached. The composer's prompt, model and wording stay outside
  // this runtime exactly as GroupClaim-first rendering leaves them, so the claims ARRIVE AS ARGUMENTS;
  // what is bound here is that every group gets one and that a missing one is
  // marked rather than substituted.
  // the open-questions section, v10 (kogaki#212): the claims artifact is a TYPED RECORD carrying the
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
        + "from the whole survey (SPEC.md, the open-questions section, v10)");
    }
  }
  for (const k of Object.keys(claims)) {
    if (!groups.some((g) => g.name === k || g.cotag === k)) {
      fail(`--claims names ${JSON.stringify(k)}, which is no composed group — a claim carries no selection authority and may not invent, merge or rename a group (SPEC.md, the display's serve rule)`);
    }
  }
  // SubGroups, where semantic subdivision's conditions bind (the SubGroup threshold). WHETHER to subdivide is the
  // ENGINE's at `SUBDIVISION_REQUIRED_AT` members or more (semantic subdivision v30, kogaki#683);
  // below it, the judge's coherence label and the two disclosures put SubGroups
  // where they go. Membership assignment is the judge's at every size.
  const subdivisions = args.subdivisions ? readJson(String(args.subdivisions)) : {};
  for (const k of Object.keys(subdivisions)) {
    if (!groups.some((g) => g.name === k || g.cotag === k)) {
      fail(`--subdivisions names ${JSON.stringify(k)}, which is no composed group (SPEC.md, the SubGroup threshold)`);
    }
    // THE SECOND READER OF THE SAME MAP, migrated in the same change
    // (the report identity v9, kogaki#199 AC6). `cmdReport` and this display read one input;
    // migrating one and not the other would put two encodings behind one file
    // and rebuild the defect between them — the producer/consumer split where
    // neither side's suite can see the break.
    readSubdivisionEntry(k, subdivisions[k]);
  }
  // The display REQUIRES the judge pin wherever it serves SubGroups (the SubGroup threshold), on
  // the same ground `subdivide` refuses without one: a per-invocation judged
  // surface with no judge pin is the drift-undetectable shape, where
  // "recomputed fresh" silently becomes "recomputed by a different judge".
  let judgePin = null;
  if (Object.keys(subdivisions).length) {
    const m = args["judge-model"];
    const e = args["judge-effort"];
    if (!m || !e) fail("--judge-model and --judge-effort are required when the display serves SubGroups: a judged surface that records no judge cannot be seen to drift (SPEC.md, the SubGroup threshold, semantic subdivision)");
  // THE PIN'S BINARY COMPONENT (kogaki#1076 item 3). PRESENT-AND-NULL where
  // nothing observed a binary, on `judge_pin`'s own uniform-arity ground: a
  // declared pin names a model the composer says judged, and there is no
  // executable behind it to name. The executor's own path supplies it, which is
  // the path every judged surface this repository mints comes through.
    judgePin = {
      model_id: String(m), effort_tier: String(e),
      binary_version: args["judge-binary-version"] === undefined || args["judge-binary-version"] === null
        ? null : String(args["judge-binary-version"]),
    };
  }
  // WHAT THE HARNESS OBSERVED about that pin (kogaki#892). Computed here, beside
  // the pin it qualifies, so a pin can never reach the display without it.
  const judgeProv = judgmentProvenance(args.subdivisions ? String(args.subdivisions) : null);

  const selected = args.group ? String(args.group) : null;
  const shown = selected ? groups.filter((g) => g.name === selected || g.cotag === selected) : groups;
  if (selected && shown.length === 0) fail(`no co-tag group ${JSON.stringify(selected)} in ${tag}`);

  say(`${tag} — the second navigation step. Grouped by co-tag; sort: ${COTAG_SORT}.`);
  let claimless = 0;
  let suppressedSplits = 0;
  for (const g of shown) {
    g.by_family = familySplit(g.members, record.candidates);
    // The served form (SPEC.md, the display's serve rule, v5): the heading line carries the
    // GroupID, the Lesson count and the member Lesson IDs; the claim renders
    // beneath. Where SubGroups are served the heading carries the count alone
    // and the IDs live on the SubGroup lines (the SubGroup threshold). No per-row pin renders on
    // any display — the pin is sited ONCE, in the Full Report (the display's serve rule v5's
    // withdrawal of the v4 per-row pin; the WA baseline, wa#1115/#1116).
    const _entry = readSubdivisionEntry(
      g.name, subdivisions[g.name] !== undefined ? subdivisions[g.name] : subdivisions[g.cotag]);
    // The display's own reader takes the SubGroupClaim list out of the typed
    // record. A judged-empty group has none, which is the conformant state and
    // renders as no SubGroups rather than as a catch-all.
    const subForHeading = _entry ? _entry.subgroups : undefined;
    // Keyed on whether there ARE SubGroupClaims, never on whether the entry
    // exists: `[]` is truthy, and a judged-empty group that hid its members
    // behind the subdivided heading would drop the whole membership from the
    // display — the same trap the report's `members` field carried.
    // the display-ID rule — group members render as display_ids, never as `lesson:<slug>`.
    const gShown = displayIds(g.members, record.candidates);
    // The claim is read BEFORE the heading now, because `judgeSubgroup` needs
    // it and the judgement decides which heading form the group gets (the SubGroup threshold v7).
    const claim = claims[g.name] !== undefined ? claims[g.name] : claims[g.cotag];

    // THE SUBDIVISION IS JUDGED BEFORE ANYTHING IS EMITTED (the SubGroup threshold v7, kogaki#316
    // decision 3, re-keyed at v30 and relabelled at kogaki#738). A split whose
    // only named SubGroup is labelled `other` — the judge found no coherent
    // subset among its members, so the split bought nothing — "does not
    // discharge the subdivision obligation"
    // — and that means
    // the group renders NO SubGroups, which is the fallback the SubGroup threshold already names
    // ("renders no SubGroups and is fully conformant"). It is NOT a refusal: a
    // judge's verdict must not be fatal to the surface, and refusing here would
    // contradict that conformance clause. BOUNDED BELOW THE THRESHOLD at v30
    // (kogaki#683): at `SUBDIVISION_REQUIRED_AT` members or more the fallback
    // is exactly the outcome semantic subdivision refuses, so it yields and the group renders.
    //
    // It has to happen here rather than at the render loop below, because the
    // heading form itself differs — a group serving SubGroups carries the count
    // alone, a flat one carries its member ids — so the decision must precede
    // the heading it changes.
    let judged = null;
    if (subForHeading && subForHeading.length) {
      const { subgroups } = subgroupPlacement(g, subForHeading, SURVEY_SCHEMA.subdivision);
      // THE SUM-TO-PARENT REFUSAL, PRE-RENDER (the SubGroup threshold rule 1; report-format.json
      // v13, kogaki#684). Through v12 this was a decidable rule over the
      // rendered text — the SubGroup counts against the parent count on the
      // group heading — and disposition 2 removed the heading's count, so one
      // side of that comparison is gone. It is carried here instead of being
      // re-pointed at the sum of the SubGroup counts, which would compare the
      // sum to itself and could never fail.
      //
      // WHAT THIS DOES NOT REPLACE, stated because the two are not equivalent:
      // it reads the PLACEMENT and the withdrawn rule read the TEXT, and
      // the emit-time refusal's own specimen is a renderer that dropped four of six member
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
      // THE SUM REFUSAL IS `subgroupPlacement`'s NOW (PR #1070 round 1), on the
      // ground this block's own comment already gave: two implementations of one
      // refusal is the drift the SubGroup limits' single carrier exists to
      // prevent. What the note below records is unchanged and is kept because it
      // is about the RULE rather than about its address.
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
      // the SubGroup threshold v7 RULE 3, RE-KEYED ON THE LABEL AND BOUNDED BY THE THRESHOLD
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

    // the display's serve rule v6 — FLUSH LEFT, and the GroupID is what says this is a Group.
    // The co-tag name follows the id; it is a label, not the carrier.
    //
    // A BLANK LINE OPENS EVERY GROUP BLOCK (the SubGroup threshold v31, kogaki#684 disposition 1).
    // It is emitted here rather than trailing the previous block so that the
    // first group is separated from the header by the same act as every other
    // group is separated from its predecessor — a trailing newline on one
    // emitter and a leading one on another is how the pre-v31 display ended up
    // spacing subdivided groups and running flat ones together.
    say("");
    // the SubGroup threshold — A SUBDIVIDED GROUP'S HEADING CARRIES THE PARENT'S LESSON COUNT
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
    // the same position on both, family-named per the rendering rule — a subdivided display and
    // a flat one are read left to right the same way.
    say(judged
      ? `${g.gid} — ${g.name} — ${lessonCount(g.members.length)}`
      : `${g.gid} — ${g.name} — ${lessonCount(g.members.length)}: ${gShown.rendered.join(", ")}`);
    if (!judged && gShown.missing) {
      say(displayIdAbnormalLine(gShown.missing, g.members.length));
    }

    // The GroupClaim FIRST, then the members (the display's serve rule) — for EVERY group,
    // subdivided ones included (the SubGroup threshold v31: the ruling's example block omits it
    // and is a spacing sketch; the display's serve rule and GroupClaim-first rendering require it, and removing it would
    // make what reaches the owner smaller than what exists).
    //
    // THE PINNING LINE IS DELETED (the SubGroup threshold v31, kogaki#684 disposition 4). GroupClaim-first rendering's
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
    // The `> ` marker is what keeps composer prose DECIDABLE (the display's serve rule v6, AC9).
    // Flush left, `<composer prose>` would match every line and take
    // `line_class_allowlist` inert on this surface — which is exactly what the
    // first cut of this change did. The marker carries no level, so it does
    // not re-introduce the defect the flush-left move removed.
    if (prose[g.name]) say(`> ${prose[g.name]}`);

    // The member Lesson IDs, for EVERY group and WITHOUT --group being named.
    // This is kogaki#128's specific defect: v2 emitted them only under
    // `selected`, so the served display showed counts and no ids, and no image
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
        // The served SubGroup form (the SubGroup threshold, v5): one line — SubGroupID, Lesson
        // count, Lesson IDs — then the SubGroupClaim, then the coherence
        // verdict and any disclosures.
        // the display-ID rule — SubGroup members render as display_ids, never as
        // `lesson:<slug>` tokens.
        const sgShown = displayIds(sg.members, record.candidates);
        // the SubGroup threshold v6 — `G<n>-<m>` NAMES ITS PARENT, so a SubGroup line met on its
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
      // THE LINE NAMES ITS PROVENANCE (kogaki#892). It used to read `judged by
      // <model>/<effort>` on the strength of the record's own `judged: true`,
      // which is a declaration rendered as an observation.
      say(`\n${judgePinLine(judgePin, judgeProv)}`);
    }
  }
  // A SUPPRESSED SPLIT IS DISCLOSED, never silent (the placement cover; the `claimless`
  // aggregate one block down is the shape this follows). The SubGroup threshold v7 makes the
  // group render flat and fully conformant, but a judgment DID run and DID
  // produce a split, and it bought nothing — an owner who sees a flat group
  // cannot otherwise tell that from a group nobody judged. Aggregate rather
  // than per-group, because a per-group line is what AC5 removes.
  if (suppressedSplits) {
    say(`\n${suppressedSplits} of ${shown.length} group(s) under ${SUBDIVISION_REQUIRED_AT} members render flat because their only named SubGroup was labelled \`other\` — the residual, so the judge found no subset of ${subdivisionLimits().min} or more members at loose-or-better affinity among them and the split bought nothing and does not discharge the subdivision obligation (SPEC.md, the SubGroup threshold v7, kogaki#316; re-keyed and bounded at kogaki#683). The groups are fully conformant; nothing was hidden and no member was dropped. At or above ${SUBDIVISION_REQUIRED_AT} members this path is unavailable: the group renders its split, labelled honestly.`);
  }
  if (claimless) {
    say(`\nABNORMAL: ${claimless} of ${shown.length} group(s) on this display carry no composed GroupClaim. The display's serve rule serves the claim FIRST and a display without one cannot show what its members share — this is a fault to clear in composition, and nothing was substituted for it.`);
    // The remedy names the BOUNDED input rather than "go compose something":
    // the fault above is cleared by composing, and the way composing was
    // costing ~19 minutes was per-group reads (kogaki#163 lever 3).
    say(`Compose them from the bounded input — compose-input --survey ${String(args.survey)} --tag ${tag} — and pass the result back as --claims (and --subdivisions, which semantic subdivision's judgment is composed from the SAME artifact and spends no further read).`);
  }

  // The cover, counted AFTER composition, over ALL composed groups — never
  // over `shown`. Selecting a group narrows what is PRINTED and narrows
  // nothing about what is counted, which is why `--group` cannot shrink the
  // denominator or the numerator of the figure below.
  const { covered, uncovered, invented } = cotagCover(members, groups);
  if (uncovered.length) {
    fail(`COTAG_COVER_INCOMPLETE — ${uncovered.length} member(s) of ${tag} appear in no co-tag group: ${uncovered.join(", ")}. Every member appears in at least one group and members carrying no second tag appear in the explicit ${JSON.stringify(NO_SECOND_TAG)} group rather than being dropped (SPEC.md, the placement cover, the co-tag navigation step).`);
  }
  if (invented.length) {
    fail(`COTAG_COVER_INVENTED — ${invented.length} id(s) appear in a co-tag group without carrying ${JSON.stringify(tag)}: ${invented.join(", ")}. Composition may group the members and may not add one; a cover counted without checking its numerator's provenance would pass a group list that dropped a member and gained a stranger (SPEC.md, the placement cover, the co-tag navigation step).`);
  }
  const split = familySplit(members.map((c) => c.id), record.candidates);
  say(`\nCover: ${covered.size} of ${members.length} member Lessons appear in at least one co-tag group — counted AFTER composition, over placements. Selected tag: ${strandFigure(split)}; ${denominator(members.length, record.candidates.length)}.`);
  say(`Classification: NAVIGATION (SPEC.md, the second-proposer boundary — enumerate + sort over tags the members already carry on the served surface). No proposal record is written, and no record of any kind.`);
  say(`Narrows nothing: the survey record is unchanged, the full candidate set stays reachable, and free text still reaches every Strand at the gate.`);
  if (!selected) say(`\nSelect a group (still narrowing nothing): cotags --survey <F> --tag ${tag} --group "<co-tag>"`);

  // THE REFUSAL, over the STRING that is about to be emitted (AC1, AC3). Not
  // over `groups`, not over `record` — the recorded specimen is a renderer that
  // dropped four of six member fields while every assertion about the data
  // structure stayed green.
  // The refusal still gates the WRITE as well as the print — `emitOrRefuse`
  // validates before its callback runs, so a nonconformant display reaches
  // neither the owner's terminal nor their artifact (the emit-time refusal, story 1.54 AC1).
  // THROUGH THE ONE PRIVATE WRITER, like the two display states beside it
  // (PR #667 round 1 finding 3). This was a SECOND path to the same artifact —
  // its own `emitOrRefuse` plus a direct `writeDisplay` — which left
  // `writeDisplaySurface` one of two rather than the one criterion 1 names, and
  // left the `writers_per_artifact` drop resting on a "no second path" ground
  // the tree did not hold. The refusal still gates the write, because that is
  // what `writeDisplaySurface` does — AND the print, which now happens inside
  // that writer's refusal callback rather than here (PR #667 round 2). Hoisting
  // it above the writer is what made `cmdCotags` emit before it validated,
  // which at the base it did not.
  const text = display.join("\n");
  const path = writeDisplaySurface(args, "cotag_groups", text);
  announceDisplay(path);
  // Returned for the control plane executor's artifacts_written ledger (story 1.89 AC7).
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

// THE LISTING'S COMPOSE PATH (kogaki#856; SPEC-terrain, the pre-selection listing).
//
// The pre-selection tag listing is not the CoTagGroups display: that is the
// rendering written AFTER a tag has been selected, and this precedes it. So it
// writes no owner artifact at all — `reports/CoTagGroups.md` has exactly one
// writing state, `cotag_groups` — and it reaches the owner as bytes carried in
// the TAG_SELECTION gate declaration, which the session renders above the
// question.
//
// WHY IT IS NOT PRINTED, and this is the finding the whole issue turns on:
//
//   "In the Claude Code harness a tool call's stdout is displayed to the MODEL,
//   not reliably to the OWNER … every conformant behavior renders nothing, and
//   the observed false claim ('the display is above') is what an agent produces
//   when instructed to deliver through a channel that does not display."
//   consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:98
//
// THE PREVIOUS ANSWER to that finding was to make the OWNER type the command,
// so the print landed in their own terminal — which is why `emitOwnerListing`
// stood here and is now gone with its last caller. The owner ruled that premise
// false on 2026-09-04: the owner types nothing, and the Harness displays what
// the runtime produces where the declaration puts it. Both halves of the
// finding are still respected — nothing here relies on stdout reaching the
// owner, and no session retypes the table — because the bytes ride an artifact
// the session renders verbatim rather than a stream it has to relay.
//
// THE GRAMMAR GUARD IS KEPT, and that is the point of routing through here
// rather than handing `renderTagDisplay`'s return straight to the composer.
// the emit-time refusal's refusal is about what may be EMITTED, never about what may be
// written, so a surface that writes no artifact owes it exactly as much: one
// composer, one refusal, and a nonconformant listing reaches no declaration.

// THE SAME GUARD, WITHOUT THE PRINT (kogaki#856). A rendering carried in a gate
// declaration is judged by exactly the grammar that judged it when it was
// printed — same surface, same REFUSE fallback, same emitter — and the only
// difference is where the conformant text goes. Written as a second caller of
// `emitOrRefuse` rather than as a flag on the first, so neither path can drift
// into checking something the other does not.
function composeOwnerListing(surfaceName, text) {
  return emitOrRefuse(surfaceName, text, () => {});
}

// --------------------------------------------------------------------------
// THE ID GATE'S BOUNDED READING (kogaki#1090).
//
// WHAT CHANGED AND WHY. kogaki#1087 put the whole `reports/CoTagGroups.md`
// rendering inside the ID question, on the correct ground that a pointer is
// rendered by whoever chooses to open it. For the `agents` tag that rendering is
// 40,789 characters, the composed call was 42,432 bytes, and the delivery
// channel truncated it — so the gate never rendered and the run wedged. A 40 KB
// question is also not a reading surface an owner can use in a terminal.
//
// SO THE READING IS A PROJECTION OF THAT ARTIFACT, NOT A SECOND RENDERING OF
// THE DATA. One line per Group and one per SubGroup — id, Lesson count, name —
// read off the heading lines of the text `cotag_groups` wrote and
// `composeOwnerListing` has already judged against the `cotag_groups` surface.
// The claims, the coherence lines, the disclosures and the member id lists stay
// in the artifact, which the question names as the full reading.
//
// PROJECTED RATHER THAN RECOMPOSED, and that is the load-bearing half. Deriving
// the rows from the survey record again would be a second computation of the
// grouping, free to disagree with the file the owner is being pointed at —
// which is the two-carriers-of-one-fact shape this repository keeps removing.
// Read off the artifact, the listing cannot say anything the artifact does not.
//
// A HEADING IT CANNOT REDUCE IS A REFUSAL, never a dropped row. A projection
// that silently loses a group would send the owner a shorter grouping than the
// one that exists, which is the failure mode of the payload this replaces
// arriving by a quieter route.
const COTAG_GROUP_HEADING = /^(G\d+) — (.+?) — (\d+ Lessons?)(?::.*)?$/;
const COTAG_SUBGROUP_HEADING = /^(G\d+-\d+) — (\d+ Lessons?): .* — (.+)$/;
const COTAG_ANY_ID_LINE = /^G\d+(?:-\d+)? — /;

export function composeIdGateListing(text, artifactPath) {
  const rows = [];
  for (const line of String(text).split("\n")) {
    const g = COTAG_GROUP_HEADING.exec(line);
    if (g) { rows.push(`${g[1]} — ${g[3]} — ${g[2]}`); continue; }
    const sg = COTAG_SUBGROUP_HEADING.exec(line);
    if (sg) { rows.push(`${sg[1]} — ${sg[2]} — ${sg[3]}`); continue; }
    if (COTAG_ANY_ID_LINE.test(line)) {
      fail(`the co-tag rendering carries a Group or SubGroup heading this listing cannot reduce to an id, a count and a name: ${JSON.stringify(line)}. `
        + "The ID gate's reading is a projection of that file's heading lines (kogaki#1090), so a heading shape it does not know is a row the owner would never see — and a listing shorter than the grouping is the failure the whole-file payload was replaced to avoid.");
    }
  }
  if (!rows.length) return null;
  return [
    `The composed grouping — ${rows.length} row(s). Read ${artifactPath} for the claims, the coherence lines and the disclosures; this is the id, the count and the name alone.`,
    "",
    ...rows,
  ].join("\n");
}

// --------------------------------------------------------------------------
// claim / adopt — GroupClaim-first rendering, and claim pinning (SPEC.md, GroupClaim-first rendering).
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
// specified by GroupClaim-first rendering — so the text arrives as an argument. What is bound here is
// the pinning, the gate event and the record's shape.
//
// The re-offer routes through the gate carrier (manifest item 4), never
// through an affordance of Terrain's own: the sequencing refusal and the out-of-scope
// decision are unchanged. The declaration is composed by the executor at the
// wait that owes it, and adoption is that wait's captured answer; nothing
// outside a run emits it. The surface that renders it is AskUserQuestion, the
// gate carrier.
// --------------------------------------------------------------------------
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

// THE RE-OFFER IS DELETED, AND LEAVES NO STUB (kogaki#1030 item 4, owner
// selection 2026-09-09). `CLAIM_REOFFER` was a `wait` sited between
// `J1_claims` and `J2_subdivision`; item 2 of that issue requires
// `compose_input`, both judgments and the `reports/CoTagGroups.md` write to
// complete inside ONE PostToolUse hook, so the co-tag file is finished before
// the ID question is offered. A wait in that span makes that guarantee false on
// exactly the runs where it fires, so the gate and the requirement cannot both
// hold. What the wait existed for is not lost: its subject is a claim pinned to
// a PROPER SUBSET of the set its composition pin served -- a derived origin
// member set -- and that is governed by the rule that a derived origin member
// set ANNOUNCES ITSELF, a duty on the rendering rather than a wait.
//
// DELETED RATHER THAN DEPRECATED, per SPEC-terrain "A removed entry point is
// DELETED, and leaves no stub": the state is gone from `src/workflow.json`, its
// gate is gone from `src/gate-registry.json`, and this composer is gone with
// them. Nothing refuses by name here because nothing can reach it -- a table row
// naming a gate this runtime has no composer for is already a declared,
// reported state (`gate_declarations_owed[].unwritten`).
// The one place a run declaration is composed. Its callers are `GATE_WORK`'s
// option composers, reached from the executor at the wait that owes the
// declaration, and nothing outside a run can reach this composer at all. The
// claim re-offer routes through manifest item 4's carrier and never through an
// affordance of Terrain's own (SPEC.md, GroupClaim-first rendering, the out-of-scope decision).
export function emitGateDeclaration(dir, gateId, dynamicOptions, extra = {}) {
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  if (!registered) fail(`${gateId} is not declared in src/gate-registry.json — an unregistered gate is the uncovered-by-default shape`);
  const seen = new Set(dynamicOptions.map((o) => o.id));
  const declaration = {
    ...registered,
    ...extra,
    options: [...dynamicOptions, ...registered.options.filter((o) => !seen.has(o.id))],
    declared_at: new Date().toISOString(),
    run_declaration: true,
    // THE INSTANCE KEY, AND IT IS A NONCE RATHER THAN A DIGEST (kogaki#890).
    // The answer this declaration will be joined to is written by a harness
    // hook that sees a question and an option set, and nothing else — so the
    // join key has to name THIS RAISING of the gate and not what the gate
    // happens to say. A key derived from the question, the option set, the
    // run directory or the inputs is shared by every sibling that looks the
    // same, which separates two runs exactly when they differ and fails
    // exactly when they are alike; two entries over one settled input compose
    // identical options and therefore an identical digest. Minted per raising,
    // never per gate and never per directory.
    gate_instance_id: randomUUID(),
  };
  delete declaration.dynamic_options;
  // The sibling filename is a JOIN KEY: check-gate-carrier resolves this file
  // beside a capture to decide what the capture's options_offered is compared
  // against (SPEC-gate-carrier, what `options_offered` is judged against). It reads the suffix from the schema, so
  // this writer reads it from the same place — with two copies, a rename on
  // one side makes the check silently fall back to the registry comparison,
  // which is the pre-#818 behaviour it would then report as a pass (kogaki#837).
  const out = join(dir, `${gateId}${GATE_SCHEMA.capture.run_declaration_suffix}`);
  // THE CALL IS COMPOSED HERE, BESIDE THE DECLARATION (kogaki#1028 item 1).
  // AND IT IS COMPOSED BEFORE ANYTHING IS WRITTEN (kogaki#1090). The byte bound
  // below has to be able to leave NO artifact behind — `gate-call.json`, the
  // pointer, and the declaration that names them — and a composer called after
  // the declaration write would have to unwrite one. Ordering is what makes
  // "no gate opens" a property of where this call stands.
  const call = composeGateCall(declaration);
  if (call.over_bound) fail(call.over_bound);
  writeFileSync(out, JSON.stringify(declaration, null, 2) + "\n");
  let callPath = null;
  if (call.tool_input) {
    callPath = join(dir, `${gateId}${GATE_CALL_SUFFIX}`);
    writeFileSync(callPath, JSON.stringify(call.tool_input, null, 2) + "\n");
  }
  writeOpenGatePointer(dir, declaration, out, callPath, call.unavailable || null);
  return out;
}

// --------------------------------------------------------------------------
// THE GATE CALL (kogaki#1028 item 1).
//
// WHAT THIS IS. The exact `AskUserQuestion` `tool_input` the session must send,
// written by the executor beside the declaration. Before it, the session read a
// declaration and COMPOSED a question from it -- and on 2026-09-09, with the tag
// gate open, it composed nothing at all: it called two MCP tools, wrote a file,
// declined to render the gate, and answered the typed tag by calling
// `ListAgents`. A payload the model composes is a payload the model can decline
// to compose, paraphrase, or reorder, and no downstream carrier could tell.
//
// SO THE PAYLOAD IS AN ARTIFACT, NOT AN INSTRUCTION. `.claude/hooks/gate-open-
// terrain-gate.py` allows exactly the call that is byte-equal to this file
// after JSON canonicalisation and denies every other tool while the gate is
// open. That comparison is only possible because the bytes exist on disk; a
// prose instruction to "render it as declared" is checkable by nobody.
//
// THE READING RIDES INSIDE THE PAYLOAD. Where the declaration carries a reading
// the owner answers over -- the runtime's own pre-selection listing at the tag
// gate, its composed grouping at the ID gate; `GATE_CALL_READING_KEYS` is the
// enumeration -- it goes into the question text ABOVE the question line rather
// than being left for the session to put on screen. kogaki#856 put the reading before the question; this puts it inside
// the thing that is compared, so a table that arrives missing, paraphrased or
// reordered is a byte difference and is denied rather than merely regretted.
//
// THE SECOND OPTION IS COMPOSED, AND THAT IS AN OWNER RULING (2026-09-09, at the
// /ship-cycle gate on this issue). `AskUserQuestion` admits 2-4 options; seven
// of this repository's eight registered gates declare exactly one. The
// declaration's `free_text_offered: true` is the second way to answer -- the
// registry says so in as many words for the tag gate ("exactly two ways to
// answer exist ... the standing option above, or free-form entry of a tag
// name") -- so the composer TRANSCRIBES that flag into the row the harness
// requires rather than the session inventing one at render time. It is the
// deterministic half extended by one step, not a new arm: the ground is that an
// automated lane which stops at one ruled outcome and says nothing about what
// follows hands the following act to judgment, where a new design decision
// enters disguised as a mechanical continuation.
// consulted: product-lab@0f31c3bebdd65a126dd5c2928b86c2a212bba5c2 LESSONS.md:42
//
// AND WHERE IT CANNOT COMPOSE ONE, IT SAYS SO RATHER THAN WEDGING THE RUN. A
// gate offering no option at all, or more than four after the free-text row, has
// no valid payload -- so no `gate-call.json` is written and the pointer carries
// `gate_call_unavailable` instead. The hook then still denies every tool but
// `AskUserQuestion`, which is the exclusivity this issue is about, and admits
// any payload for the question itself, because there is nothing to compare it
// to. A deny with no admissible act is a wedge, and the failure this repository
// already ruled on is that a fail-closed refusal relocates the choice it
// refuses rather than preventing anything.
// consulted: product-lab@0f31c3bebdd65a126dd5c2928b86c2a212bba5c2 LESSONS.md:44
export const GATE_CALL_SUFFIX = ".gate-call.json";

// The harness's own bound on an AskUserQuestion payload. Read from its schema,
// restated here because there is no module to import it from across the seam --
// the same two-implementations-of-one-constant trade `option_set_digest` makes,
// and `checks/check-open-gate-exclusivity.sh` is what compares them.
const ASK_MIN_OPTIONS = 2;
const ASK_MAX_OPTIONS = 4;

// ONE constant, never a per-gate wording composed at render time. A gate that
// wants its own words declares `free_text_label` in `src/gate-registry.json`,
// where an owner merges it, rather than the executor inventing a phrasing per
// gate -- which is the composition this whole file removes.
// THE READING KEYS, IN ONE LIST RATHER THAN ONE BRANCH PER GATE (kogaki#1087).
// A declaration whose gate owes the owner something to read before answering
// carries those bytes under one of these keys, and the composer puts the first
// one it finds above the question line. It was a single `tag_listing` test until
// the ID gate stopped carrying a pointer and started carrying its grouping; a
// second `||` branch beside the first is how two carriers of one rule begin, so
// the keys are enumerated here and the composer reads the enumeration.
const GATE_CALL_READING_KEYS = ["tag_listing", "groups_listing"];

// THE DECLARED BYTE BOUND (kogaki#1090). Read from `src/gate-registry.json`
// rather than written here: the number has a measured ground, the ground is
// prose, and a constant in this file would put the number one place and its
// argument another. Its rationale — what is measured, why, and where 8192 comes
// from — is `gate_call_bound_note` beside it, cited here and restated nowhere.
//
// AN ABSENT OR MALFORMED BOUND IS A REFUSAL AT LOAD, never a default. A bound
// that silently falls back to Infinity is the state this issue was filed from,
// reintroduced as a fallback: PR #1088's acceptance made the ID payload as long
// as the grouping and no bound was declared on it at all.
const GATE_CALL_MAX_BYTES = (() => {
  const declared = GATES_REGISTRY.gate_call_max_bytes;
  if (!Number.isInteger(declared) || declared <= 0) {
    throw new Error(
      "src/gate-registry.json declares no usable `gate_call_max_bytes` — a composed gate call is delivered "
      + "on a channel with a cap (kogaki#1081, kogaki#1090) and an undeclared bound is the state that wedged "
      + "the 2026-09-11 run, not a permissive one");
  }
  return declared;
})();

// The bytes the WRITER writes, not the bytes of some other serialisation. See
// `gate_call_bound_note`: the file is what the advance hook relays and what the
// PreToolUse equality check compares against.
export function gateCallBytes(toolInput) {
  return Buffer.byteLength(JSON.stringify(toolInput, null, 2) + "\n", "utf8");
}

const GATE_CALL_FREE_TEXT_LABEL = "Answer in your own words instead";
const GATE_CALL_FREE_TEXT_DESCRIPTION =
  "This gate offers free text. Choose this row and type the answer; the harness "
  + "records what you type, and the executor reads it from the capture.";

// The chip label, at most 12 characters, DERIVED rather than composed: the last
// hyphen-separated segment of the gate id. `terrain-tag-selection` -> `selection`.
// A gate may override it with `header` in the registry.
export function gateCallHeader(declaration) {
  const declared = declaration.header;
  if (typeof declared === "string" && declared.trim()) return declared.trim().slice(0, 12);
  const segments = String(declaration.id || "gate").split("-").filter(Boolean);
  return (segments[segments.length - 1] || "gate").slice(0, 12);
}

export function composeGateCall(declaration) {
  const declared = Array.isArray(declaration.options) ? declaration.options : [];
  const options = declared.map((o) => ({
    label: String(o.label),
    // The description is the option's OWN, and where it carries none the id is
    // shown rather than a sentence invented about it.
    description: String(o.description || o.id || ""),
  }));
  if (options.length === 0) {
    return { unavailable: `${declaration.id} declares no option, and a question with no arm is not a gate — the free-text row alone would leave the owner one way to answer where the declaration promises none` };
  }
  if (options.length < ASK_MIN_OPTIONS) {
    if (!declaration.free_text_offered) {
      return { unavailable: `${declaration.id} declares ${options.length} option(s) and no free text, and AskUserQuestion admits at least ${ASK_MIN_OPTIONS} — there is no row to compose from, so none is invented` };
    }
    options.push({
      label: String(declaration.free_text_label || GATE_CALL_FREE_TEXT_LABEL),
      description: GATE_CALL_FREE_TEXT_DESCRIPTION,
    });
  }
  if (options.length > ASK_MAX_OPTIONS) {
    return { unavailable: `${declaration.id} composes ${options.length} options and AskUserQuestion admits at most ${ASK_MAX_OPTIONS} — no payload is written, and nothing here drops an option the declaration offered` };
  }
  const reading = GATE_CALL_READING_KEYS
    .map((k) => (typeof declaration[k] === "string" && declaration[k].trim() ? declaration[k] : null))
    .find(Boolean) || null;
  const question = reading
    ? `${reading}\n\n${String(declaration.question)}`
    : String(declaration.question);
  const tool_input = {
    questions: [{
      question,
      header: gateCallHeader(declaration),
      multiSelect: false,
      options,
    }],
  };
  // THE BOUND, CHECKED OVER THE WHOLE COMPOSED CALL (kogaki#1090). Over the
  // reading alone it would miss a question or an option set that grew, and the
  // channel does not care which field the bytes came from.
  const bytes = gateCallBytes(tool_input);
  if (bytes > GATE_CALL_MAX_BYTES) {
    return {
      bytes,
      // A SEPARATE ARM FROM `unavailable`, and the separation is the point.
      // `unavailable` writes an open-gate pointer and leaves the gate
      // renderable from the declaration's own options; there is no smaller
      // rendering of an oversized payload, so this writes nothing and ends the
      // run. A refusal at compose is loud; a truncated payload at render is the
      // silent failure the 2026-09-11 run showed.
      over_bound: `${declaration.id} composes a ${bytes}-byte gate call and `
        + `src/gate-registry.json declares a bound of ${GATE_CALL_MAX_BYTES} bytes. `
        + "No declaration, no gate-call.json and no open-gate pointer were written, and no gate is open. "
        + "The call is delivered on a PostToolUse hook's additionalContext, which truncates above the "
        + "bound, and the open-gate interval refuses the Read that would fetch the remainder — so an "
        + "oversized call reaches the owner as a fragment nothing in the session can complete "
        + "(kogaki#1028, kogaki#1081, kogaki#1090). The reading this gate carries belongs in its written "
        + "artifact, which the question names, rather than inside the question text.",
    };
  }
  return { tool_input, bytes };
}

// --------------------------------------------------------------------------
// THE OPEN-GATE POINTER (kogaki#890).
//
// The capture is written by `.claude/hooks/write-gate-capture.py`, a
// PostToolUse carrier on `AskUserQuestion`. That hook sees the harness's own
// payload — the question, the labels, the tool_use_id — and has no way to know
// which run raised the question, because a run workspace is machine-local and
// may sit anywhere. The pointer is how it finds out: one small file per
// OUTSTANDING raising, naming the instance, the declaration and the capture
// path, in a directory the hook reads.
//
// IT CARRIES NO ANSWER AND GRANTS NOTHING. A pointer is a forwarding address;
// deleting the whole directory costs a re-render and never an admitted answer,
// because the executor reads the CAPTURE and refuses without a matching row.
// That is what keeps this file off the trust surface: nothing downstream
// believes a pointer, and a forged one can only cause a row to be written
// where no gate is outstanding, which the instance-id check then refuses.
export function openGateDir() {
  return process.env.KOGAKI_OPEN_GATES || join(homedir(), ".claude", "kogaki-open-gates");
}

// THE POINTER NAMES ITS SESSION (kogaki#1028 item 5).
//
// Every consumer of this directory previously matched on the question text
// alone, so one machine's outstanding gate was every session's outstanding gate:
// a second session answering a question with the same text wrote a row into the
// first session's capture, and a PreToolUse deny keyed on "a pointer exists"
// would have frozen every session on the machine rather than the one at the
// gate.
//
// THE ID IS READ FROM AN ENVIRONMENT VARIABLE, SO ITS ABSENCE IS A CASE AND NOT
// AN ERROR, AND THE TWO READERS TREAT IT DIFFERENTLY ON PURPOSE (PR #1043 round
// 1, findings 2 and 5 -- the first cut's comment here said one thing and the
// reader did another, which is the worse half of the defect):
//
//   `.claude/hooks/write-gate-capture.py` treats a null-session pointer as it
//       treated every pointer before this field existed, matching on question
//       text alone. Refusing it would turn "we cannot prove who owns this" into
//       "no answer is ever recorded", breaking a path that works today.
//   `.claude/hooks/gate-open-terrain-gate.py` gates nothing on a null-session
//       pointer. Denying every tool call in a session that cannot be shown to
//       own the gate is the failure with no recovery inside the session.
//
// Both readers therefore fail toward the recoverable side of their own act, and
// neither treats the absence as a wildcard.
function sessionId() {
  // `CLAUDE_CODE_SESSION_ID` is what Claude Code exports into a Bash tool call
  // and into a hook's process, which are the two routes the executor is started
  // by (the skill's `!` line, and `.claude/hooks/advance-terrain.py`). A run
  // started any other way carries null, and the readers above say what that
  // means rather than leaving it to be inferred.
  return process.env.CLAUDE_CODE_SESSION_ID || null;
}

// The question text the session actually sends for this gate: the composed
// call's, where one was written, else the declaration's own.
function sentQuestion(declaration, callPath) {
  if (callPath && existsSync(callPath)) {
    try {
      const q = readJson(callPath);
      const text = q && q.questions && q.questions[0] && q.questions[0].question;
      if (typeof text === "string" && text) return text;
    } catch { /* an unreadable call is the composer's fault and is reported at its write */ }
  }
  return declaration.question;
}

export function writeOpenGatePointer(dir, declaration, declPath, callPath = null, callUnavailable = null) {
  const gd = openGateDir();
  mkdirSync(gd, { recursive: true });
  const capPath = join(dir, `terrain${GATE_SCHEMA.capture.suffix}`);
  // A RE-RAISING SUPERSEDES ITS OWN PREVIOUS POINTER (PR #917 round 1, finding
  // 3). Re-rendering a gate after a refusal is the ordinary recovery this file
  // tells the owner to perform, and each raising mints a fresh instance id —
  // so without this the recovery itself accumulates orphans, one per attempt,
  // in the directory whose ambiguity arm then refuses to write anything. The
  // superseded pointer is this run's own, matched on the capture it names and
  // the gate it raises, so nothing here reaches another run's.
  for (const f of readdirSync(gd)) {
    if (!f.endsWith(".json")) continue;
    try {
      const prev = readJson(join(gd, f));
      if (prev.gate_id === declaration.id && prev.capture_path === resolve(capPath)) {
        rmSync(join(gd, f), { force: true });
      }
    } catch { /* an unreadable pointer is the hook's to report, not this writer's to repair */ }
  }
  writeFileSync(join(gd, `${declaration.gate_instance_id}.json`), JSON.stringify({
    gate_instance_id: declaration.gate_instance_id,
    gate_id: declaration.id,
    // THE QUESTION AS SENT, never the bare declaration's (PR #1048 round 1,
    // finding 1). `write-gate-capture.py` joins the harness's `answers` key to
    // this field by exact equality, and the key is the question text the
    // session sent -- which, where the composed call prepends `tag_listing`,
    // differs from `declaration.question` by the whole table. A pointer
    // carrying the bare text matches nothing, no row is written, and under the
    // exclusivity hook the session then has no admissible act at all.
    question: sentQuestion(declaration, callPath),
    declaration_path: resolve(declPath),
    capture_path: resolve(capPath),
    // The byte-fixed call the session must send, or the stated reason there is
    // none. Exactly one of the two is non-null, always.
    gate_call_path: callPath ? resolve(callPath) : null,
    gate_call_unavailable: callUnavailable,
    session_id: sessionId(),
    // WHICH EXECUTOR OPENED THIS GATE (kogaki#1051). `skill-expansion` is the
    // start act, and it is the one kind for which no model turn can yet have
    // run -- see `OPENED_BY`. `hook` means a turn ran to produce the tool call
    // the hook fired on. `null` is a run started outside either route, and the
    // reader treats it as the ordinary pointer it was before this field.
    opened_by: OPENED_BY,
    opened_at: declaration.declared_at,
  }, null, 2) + "\n");
}
// `adopt` ceased to be an entry point (kogaki#625 item 1), and the wait that
// replaced it is itself deleted (kogaki#1030 item 4). The refusal the retired
// command carried ("a recomposed claim that was never offered cannot be
// adopted") stays structural, and by a shorter route than before: there is no
// capture without a declaration, no declaration without a state, and no state.

// --------------------------------------------------------------------------
// subdivide — semantic subdivision as a judged substrate one level down
// (SPEC.md, semantic subdivision), DOGFOOD-FIRST.
//
// Placement plus title-derivation, hiding none: a cap decides WHICH members
// appear, subdivision decides WHERE each appears and hides none. It is
// therefore inside the presentation-only invariant and is NOT the refused
// within-axis cap.
//
// NOT OFFERED BY DEFAULT. Co-tags stay the default for a run naming no
// substrate, and this path is reachable only by naming it. Running it, and
// merging it, ARRIVES at measurement before offering's offering gate rather than discharging it.
//
// WHICH MODEL judges is a per-invocation PINNED FACT and not a decision this
// code makes: the judge pin (model id + effort tier) is ADOPTED for
// per-invocation judged surfaces and names terrain displays, claims and
// groupings among them, with the judge-migration tripwire as its complement —
// the pin makes a judge change observable, the tripwire makes it
// consequential. So the classification and its verdicts arrive as input and
// the record pins the judge that produced them. Terrain names no model.
//
// THE SPLIT DECISION CARRIES A CONSTANT AND THE JUDGMENT DOES NOT (semantic subdivision v30,
// kogaki#683). `SUBDIVISION_REQUIRED_AT` decides WHETHER a group must serve
// SubGroups; it stands in for no verdict. What the judge supplies is the
// COHERENCE LABEL — one of a closed three, with one sentence of why — and no
// number is compared against it. The three instruments remain REPORTED
// quantities gating nothing, and the display budget still arrives per run.
//
// The prohibition this comment used to state — no numeric constant anywhere in
// split-or-stop logic — was reversed by the owner on 2026-08-28 on a specimen
// it permitted. It is quoted at semantic subdivision as provenance and is not the rule here.
// --------------------------------------------------------------------------
// The SubGroup's own two rendered lines — its name and its claim. Rendering
// arithmetic for the display-budget instrument; it gates nothing and is not
// stop logic.
const LINES_PER_SUBGROUP_HEADER = 2;

// The PLACEMENT half of subdivision, extracted so the co-tag display (the SubGroup threshold) and
// `subdivide` (semantic subdivision) share ONE composer rather than each carrying its own.
//
// It is this half — not the instruments and not the coherence verdicts — that owns
// the guarantee subdivision hides none: a member the judge invented is refused,
// and a member the judge left unplaced lands in the EXPLICIT named SubGroup
// rather than being dropped. Two copies of that would be two places for the
// cover to be wrong, and the second copy is the one nobody re-reads.
// THE SPLIT DECISION IS THE ENGINE'S (SPEC-terrain, semantic subdivision v30, kogaki#683, owner
// ruling 2026-08-28 with the disposition-1 boundary confirmed at pickup
// 2026-08-29).
//
// A NUMBER IN SPLIT-OR-STOP LOGIC WAS A DEFECT AND IS NOW THE RULE. Semantic subdivision carried
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
// that JOINS across a boundary. This label is rendered on kogaki's own display
// and read by nothing outside it, so no hub ratification is owed.
// consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/knowledge-architecture.md:198
export const COHERENCE_LABELS = Object.freeze(["tight", "related", "loose", "other"]);
// The residual, named once so no reader has to infer it from the cap map's gaps.
export const RESIDUAL_LABEL = "other";

export function subgroupPlacement(parent, classification, block) {
  const subgroups = [];
  const placedIds = new Set();
  for (const sg of classification) {
    // THE KEYS ARE THE RECORD EXAMPLE'S, AND THE EXAMPLE IS THE BINDING
    // (kogaki#1067). `src/workflow.json`'s `J2_subdivision.record_example` — the
    // literal shape kogaki#1062 item 5 put in front of the judge — writes each
    // SubGroup as `{name, claim, members, verdicts: {coherence, …}}`, and the
    // live 2026-09-10 judge conformed to it. This reader read a `subgroup` key and
    // took the WHOLE entry as the verdicts object, so it refused every real
    // classification with "each SubGroup needs a `subgroup` name" and stalled
    // the run before `cotag_groups`. Every other reader of a SubGroup in this
    // file — the coherence checks, the display and report renderers,
    // `resolveEnteredIds` — already read `name`, and `judgeSubgroup` and the
    // residual filter already read `.verdicts.coherence`, so the two spellings
    // here were the only ones out of step.
    //
    // NO SECOND SPELLING IS ACCEPTED. A reader tolerating both keys re-opens
    // exactly the drift this closes: the example would stop being the one
    // binding, and the next judge to conform to it would have no way to tell
    // which half of the reader it was talking to.
    const name = String(sg.name || fail("each SubGroup needs a `name` — the key `J2_subdivision.record_example` declares (kogaki#1067)"));
    const members = [...new Set(sg.members || [])].sort();
    const stray = members.filter((id) => !parent.members.includes(id));
    if (stray.length) fail(`SubGroup ${JSON.stringify(name)} places ${stray.join(", ")}, which are not members of ${parent.name} — subdivision decides WHERE a member appears, never that a new one exists`);
    members.forEach((id) => placedIds.add(id));
    subgroups.push({ name, claim: String(sg.claim || ""), members, verdicts: sg.verdicts || {} });
  }
  // AN UNPLACED MEMBER IS A REFUSAL NAMING IT (the SubGroup threshold rule 1, kogaki#738 ruling 1).
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
      + `(SPEC-terrain, semantic subdivision, kogaki#738). The engine no longer composes a catch-all, `
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
  // DOUBLE PLACEMENT, HERE RATHER THAN AT A CALLER (PR #1070 round 1). The cover
  // refusal above cannot see it: a member named in two SubGroups IS placed, so
  // the cover is complete and the counts sum OVER the parent instead. It lived
  // at the co-tag display alone, which meant the report's two placement sites
  // never had it and kogaki#1068's new judgment-state call arrived with a second
  // copy of it -- two wordings citing two different grounds on their first day.
  // It sits with `placedIds`, which is what it is actually about, and every
  // caller gets one reading of it.
  const placedCount = subgroups.reduce((n, sg) => n + sg.members.length, 0);
  if (placedCount !== parent.members.length) {
    fail(`SUBGROUP_MEMBERS_DO_NOT_SUM — ${parent.name} holds ${parent.members.length} member Lesson(s) `
      + `and its SubGroups place ${placedCount}. the SubGroup threshold rule 1 requires the SubGroup `
      + `member counts to sum to the parent's total: over the total means a member was placed in more `
      + `than one SubGroup and renders twice, under it means a member is hidden. Subdivision decides `
      + `WHERE a member appears, never how many times `
      + `(SPEC.md, the SubGroup threshold; report-format.json v13 carries this as a pre-render refusal, `
      + `the heading no longer rendering a parent count).`);
  }

  const { maxResidual } = subdivisionLimits();
  const residual = subgroups
    .filter((sg) => (sg.verdicts || {}).coherence === RESIDUAL_LABEL)
    .reduce((n, sg) => n + sg.members.length, 0);
  if (residual > maxResidual) {
    fail(`SUBDIVISION_RESIDUAL_OVER_LIMIT — the classification of ${parent.name} leaves `
      + `${residual} member(s) in the residual \`other\`, over the limit of ${maxResidual} `
      + `(report-format.json limits.max_residual_members, SPEC-terrain, semantic subdivision, kogaki#738 owner `
      + `amendment 1). Compose additional SubGroups until the residual falls to ${maxResidual} `
      + `or fewer. The residual exists so an absence of relationships is EXPLICIT, not so that `
      + `members can be parked in it.`);
  }
  return { subgroups, placedIds };
}

// The JUDGMENT half of subdivision (semantic subdivision), extracted beside `subgroupPlacement`
// so the co-tag display (the SubGroup threshold) and `subdivide` share ONE implementation.
//
// kogaki#133's first finding is what this closes: the display placed members
// and printed name, claim and ids while evaluating neither conjunct and
// emitting neither disclosure, so "where semantic subdivision's conditions put them" was
// satisfied by the caller's JSON alone. A second copy of these rules would be
// a second place for the judgment to drift; the rule is enforced at the
// layer where it can be broken, and both surfaces break it the same way.
// THE LIMITS' ONE READER (semantic subdivision, kogaki#738 ruling 5 and owner amendment 2's five
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
    fail("report-format.json declares no complete `limits` block, so semantic subdivision's subdivision limits "
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
  // is one of semantic subdivision's three INSTRUMENTS rather than a conjunct of the leaf
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
    fail(`SubGroup ${JSON.stringify(sg.name)} carries coherence ${JSON.stringify(coherence === undefined ? null : coherence)}; the closed set is ${COHERENCE_LABELS.join(" | ")} (SPEC-terrain, semantic subdivision, kogaki#683). The label is the judge's and is never defaulted here — a default would be this layer supplying the judgment the label exists to carry.`);
  }
  const why = String(vd.coherence_why || "").trim();
  if (!why) {
    fail(`SubGroup ${JSON.stringify(sg.name)} carries a coherence label with no \`coherence_why\`. The label and one free-form sentence of why are ONE instrument: a label with no reason is a verdict a reader cannot weigh.`);
  }
  sg.coherence = coherence;
  sg.coherence_why = why;
  sg.coherence_line = `coherence: ${coherence} — ${why}`;

  // THE SIZE LIMITS, READ FROM THE CARRIER (semantic subdivision, kogaki#738 ruling 3 and owner
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
      + `(report-format.json limits.subgroup_member_cap.${coherence}, SPEC-terrain, semantic subdivision, kogaki#738). `
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
      + `(report-format.json limits.min_subgroup_members, SPEC-terrain, semantic subdivision, kogaki#738 owner `
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

// THE SubGroup RULES, RUN WHERE THE RE-ASK IS (kogaki#1068). Until this landed
// they ran only in `subgroupPlacement` and `judgeSubgroup` at the two RENDER
// states — the co-tag display and `cotag_groups` — and `J2_subdivision`, the
// state that HAS the bounded re-ask loop, validated the envelope alone
// (`judged: true`, `subgroups` an array). So a record that breached a cap, fell
// under the minimum, overran the residual or left a member unplaced passed J2,
// spent every group's call, and failed the run at a state with no route back to
// the judge. On the parked 2026-09-09 live run nine of eleven groups breached a
// rule this way.
//
// IT RE-IMPLEMENTS NOTHING. The refusals are `subgroupPlacement`'s and
// `judgeSubgroup`'s, called over this group's own entry — the same two functions
// `cotag_groups` calls, which is what keeps one reading of every limit.
// `cotag_groups` KEEPS ITS CHECKS and is simply expected never to be the first
// to fire them; a second implementation here would be the drift the SubGroup
// limits' single carrier exists to prevent.
//
// THE DISCLOSURES ARE NOT THIS LAYER'S. `judgeSubgroup` also computes the two
// disclosures, which are a RENDERING concern and need the GroupClaim to compute
// the undiscriminating-claim one; the display holds that claim and recomputes
// them there. What is wanted here is the refusals, so the claim is passed empty
// and the disclosures this call produces are discarded — a disclosure is not a
// refusal, and none of them can fail.
//
// A GROUP WITH NO COMPOSED PARENT IS NOT JUDGED HERE, and that is a bound rather
// than a hole: the rules are all statements ABOUT the parent's membership — the
// cover, the sum, the whole-group exemption — so a record supplied by argv
// against no composed input has nothing here to be judged against. Those runs
// reach the render state exactly as they did before.
export function subdivisionRules(name, entry, parent) {
  if (!entry || !parent) return;
  // JUDGED-EMPTY IS CONFORMANT and has no SubGroup for any rule to bind on
  // (the report identity v9). It is refused at the split threshold, and that
  // refusal is the display's, keyed on a size this function is not the place to
  // re-decide.
  if (!entry.subgroups.length) return;
  const { subgroups } = subgroupPlacement(parent, entry.subgroups, SURVEY_SCHEMA.subdivision);
  for (const sg of subgroups) judgeSubgroup(sg, "", parent.members.length);
}

// THE LIMITS THE RECORD IS JUDGED AGAINST, PUT IN FRONT OF THE JUDGE
// (kogaki#1068 item 2). The per-group ask carried the group, its material, the
// composition pin, the bound and the accounting; it named no cap, no minimum and
// no residual bound, and `record_example` carries the closed label set with no
// count against it. A judge asked to subdivide eight members at `tight` under a
// cap of five it has not been told breaches it — and did, in four of eleven
// groups on the 2026-09-09 run.
//
// READ, NEVER RETYPED. Every number comes back through `subdivisionLimits`, the
// one reader of `report-format.json`'s `limits` block, so the numbers in the ask
// and the numbers in the refusal cannot disagree.
//
// KEYED ON THE STATE'S OWN DECLARATION, so a second state joins by a table row
// rather than by an edit here — the property `per_group`, `retries` and
// `record_example` already have. An unknown block name is refused BY NAME, on
// `record_example`'s directive ground: a third block is added by ruling rather
// than by spelling.
const JUDGE_LIMIT_BLOCKS = Object.freeze({
  subdivision: () => {
    const { caps, min, maxResidual } = subdivisionLimits();
    return {
      _read_from: "report-format.json `limits` — the one carrier of these numbers; this ask restates none of them",
      subgroup_member_cap: Object.fromEntries(CAPPED_LABELS.map((l) => [l, Number(caps[l])])),
      min_subgroup_members: min,
      max_residual_members: maxResidual,
      every_member_must_be_placed: `Every member of this group appears in exactly one SubGroup. The engine composes no catch-all: a member you place nowhere is a refusal naming it, and a member you place twice is a refusal too. Place a member you find no affinity for in a SubGroup labelled ${JSON.stringify(RESIDUAL_LABEL)} — the residual, which carries no minimum and is bounded at ${maxResidual}.`,
      _refused: `A SubGroup over its label's cap, or under ${min} members, is refused and you are asked again with the refusal. A SubGroup holding the WHOLE group is exempt from the minimum alone — it divided nothing — and never from the cap.`,
    };
  },
});

export function judgeLimits(st) {
  if (st.limits === undefined || st.limits === null) return null;
  const key = String(st.limits);
  if (!Object.prototype.hasOwnProperty.call(JUDGE_LIMIT_BLOCKS, key)) {
    fail(`${st.id}: the workflow table declares \`limits\` ${JSON.stringify(key)}, which names no known limit `
      + `block. The known one is ${Object.keys(JUDGE_LIMIT_BLOCKS).map((k) => JSON.stringify(k)).join(", ")}; `
      + "a second is added by ruling rather than by spelling, exactly as `record_example`'s directives are "
      + "(kogaki#1068).");
  }
  return JUDGE_LIMIT_BLOCKS[key]();
}

// THE RECORD HALF OF THE RETIRED `subdivide` SUBCOMMAND, reachable only from
// `J2_subdivision` (subdivide's composition fold, kogaki#625 item 1). The RENDERING half left with
// the entry point — the non-flow utilities removes `cmdSubdivide`'s hand-rendered lines, which
// the emit-time refusal's guard never saw. What stays is the composition the placement cover makes a RUNTIME
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
  // THE PIN'S BINARY COMPONENT (kogaki#1076 item 3). PRESENT-AND-NULL where
  // nothing observed a binary, on `judge_pin`'s own uniform-arity ground: a
  // declared pin names a model the composer says judged, and there is no
  // executable behind it to name. The executor's own path supplies it, which is
  // the path every judged surface this repository mints comes through.
  const binaryVersion = args["judge-binary-version"] === undefined || args["judge-binary-version"] === null
    ? null : String(args["judge-binary-version"]);
  const displayBudget = Number(args["display-budget"] || fail("--display-budget is required: the rendering destination, in lines. It is supplied per run rather than fixed in code — a rendering destination is a property of where a display lands, not of the material, so it is the caller's to state (SPEC.md, semantic subdivision)"));
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
      display_budget_lines: { needs: LINES_PER_SUBGROUP_HEADER + sg.members.length, budget: displayBudget },
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
    judge: { model_id: modelId, effort_tier: effortTier, binary_version: binaryVersion },
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
  if (out.offered_by_default !== block.offered_by_default_must_be) fail("refusing to write a subdivision record marked offered by default (SPEC.md, measurement before offering)");
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
// back is what keeps one parse and one answer (PR #701 round 1). The open-questions section, v10
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
// report — the Full Report (SPEC.md).
//
// The other half of the display's serve rule's compact display: the display is what the owner
// NAVIGATES, this is what they READ. Untruncated Claims and Glosses, with no
// truncation anywhere — which is why it parses the served shard whole rather
// than through `parseGlossShard`, whose whole job is to cut a headline.
//
// It is a REPORT and therefore not a choice: it ranks nothing, narrows
// nothing and hides nothing, so it sits in neither act list (the second-proposer boundary, the Full Report).
//
// It is a RENDERING and therefore NOT AN ADDRESS: nothing downstream resolves
// a report id, and a Brief cites members and pins exactly as it does today
// (topics/articles.md:64,71@f918c515).
// --------------------------------------------------------------------------
export const NO_GLOSS_BODY = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";
export const NO_JUDGE = "none";

// THE TYPED SUBDIVISION ENTRY (the report identity v9, kogaki#199).
//
// WHAT IT REPLACES, and why the old shape had to go rather than be tolerated.
// The entry used to be a bare array and its presence was tested for truthiness,
// so `[]` — a judged group with no subdivision — was TRUTHY and took the
// judged branch by accident, while an absent key and `{}` took the unjudged
// one. Three inputs, three different conformance outcomes, and NONE of them
// was the artifact the report identity names as conformant: `subgroupPlacement(group, [], …)`
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
// (the open-questions section, v10, kogaki#212).
//
// WHY THE CLAIMS ARTIFACT IS THE CARRIER. The pin has to accompany the claims,
// and v9 never said where it lives. It lives HERE, in one artifact with them,
// because a pin in a separate file can go stale beside the claims it
// accompanies and nothing in the tool would catch that — the same
// existence-versus-standing gap the subset check exists to close, moved one
// file over. It also mirrors the report identity v9's typed subdivision record, so both
// composed inputs carry one shape rule learned once.
//
//   { "composition_pin": { "tag": …, "pin": …, "groups": { "<G>": ["lesson:…"] } },
//     "claims":         { "<G>": "…" } }
//
// A BARE MAP IS REFUSED BY NAME, as the report identity v9 refuses the withdrawn bare array:
// two encodings for one fact would let a stale composer silently keep the
// unguarded shape.
export function readClaimsRecord(raw, record) {
  if (raw === undefined || raw === null) return { claims: {}, pin: null };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    fail("--claims must be an object (SPEC.md, the open-questions section, v10)");
  }
  if (!("composition_pin" in raw) || !("claims" in raw)) {
    fail("--claims is a bare {group: claim} map, which is the withdrawn pre-v10 form. "
      + "A claim composed outside the bounded read is what this refuses, and a bare map "
      + "carries no evidence of where it was composed from. Write "
      + '{"composition_pin": {...}, "claims": {...}} — `compose-input` emits the pin '
      + "(SPEC.md, the open-questions section, v10)");
  }
  const pin = raw.composition_pin;
  if (!pin || typeof pin !== "object" || Array.isArray(pin)) {
    fail("--claims carries no usable `composition_pin` object (SPEC.md, the open-questions section, v10)");
  }
  if (!pin.groups || typeof pin.groups !== "object" || Array.isArray(pin.groups)) {
    fail("--claims `composition_pin` carries no `groups` map. It must hold the MEMBER "
      + "SET compose-input served, per group — a digest cannot support a subset check "
      + "and can name no offender (SPEC.md, the open-questions section, v10)");
  }
  // AC4 — THE PIN BINDS THE SURVEY RECORD IT WAS COMPUTED AGAINST. A stale pin
  // must not become a confident wrong acceptance: re-resolving it silently
  // against a different record is the shape where the guard passes and the
  // claim it admitted was composed from material this survey never served.
  if (record && pin.pin && record.pin && pin.pin !== record.pin) {
    fail(`--claims was composed against survey pin ${pin.pin}, and this run's survey is `
      + `${record.pin}. The bounded read it evidences is not this one — re-run `
      + "compose-input against this survey and recompose (SPEC.md, the open-questions section, v10)");
  }
  const claims = raw.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    fail("--claims `claims` must be a {group: claim} object (SPEC.md, the open-questions section, v10)");
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
      + `the key if the group was not judged (SPEC.md, the report identity v9)`);
  }
  if (typeof entry !== "object") {
    fail(`--subdivisions entry for ${JSON.stringify(name)} must be an object `
      + `{"judged": true, "subgroups": [...]} (SPEC.md, the report identity v9)`);
  }
  if (entry.judged !== true) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} does not declare "judged": true. `
      + `The judgment is what the entry attests; an entry that does not state it is `
      + `indistinguishable from a run that never asked (SPEC.md, the report identity v9, the SubGroup threshold)`);
  }
  if (!Array.isArray(entry.subgroups)) {
    fail(`--subdivisions entry for ${JSON.stringify(name)} needs a "subgroups" array — `
      + `[] states JUDGED AND EMPTY, which is conformant and is not the same as absent `
      + `(SPEC.md, the report identity v9)`);
  }
  return { judged: true, subgroups: entry.subgroups };
}

// --------------------------------------------------------------------------
// JUDGMENT PROVENANCE — what the HARNESS OBSERVED about the judgment, held
// apart from what the RECORD DECLARES about it (kogaki#892, under the owner's
// 2026-09-04 ruling that a Harness must not consume model output as
// authoritative control input for state, counts, eligibility or routing).
//
// `readSubdivisionEntry` above refuses an entry that does not state
// `"judged": true`, and that refusal does real work: judged-empty and
// never-judged are different states and the flag is what separates them. What
// it CANNOT do is show that a judgment ran. `{"judged": true, "subgroups": []}`
// is the conformant record for a judgment that found no split, and it is
// byte-identical to one nobody performed. The judge pin is the same shape one
// level over — `--judge-model`/`--judge-effort` are values the composer
// supplies, and `readNeighborhoodJudgments`' own note is explicit that "no
// model call happens inside this tool".
//
// THE DEFECT WAS IN THE RENDERING, NOT IN THE JUDGMENT. The judgment is a
// named LLM judgment point and it stays. What the display printed was
// `judged by <model>/<effort>` — which reads as a fact the Harness stands
// behind — on the strength of a declaration alone. The right act with a guard
// silently disabled, which is the ruling's own test for this class.
//
// TWO STATES, and which of them is reachable is stated rather than left for a
// reader to infer:
//
//   `observed`  the Harness invoked the judge itself, or holds a judgment
//               record its OWN act wrote. SINCE kogaki#1030 THIS STATE HAS A
//               PRODUCER: the executor invokes the pinned model at every
//               judgment state, so a run that reached one holds an invocation
//               record its own act wrote. The arm was named here before it had
//               one -- a single-state provenance is indistinguishable from no
//               provenance at all -- and lighting it up touched neither
//               renderer, which is what that naming was for.
//   `declared`  no such record. The pin names what the COMPOSER says judged
//               this split. This is every run whose judgment record arrived on
//               argv, and every run made before kogaki#1030.
//
// WHAT THE HARNESS DOES OBSERVE, in both states: the `--subdivisions` artifact
// it read, whose sha it takes ITSELF from the bytes on disk — the same read
// `composedInputDigests` already makes for the report record. That is
// kogaki#892 acceptance 1's second arm, "a recorded judgment artifact whose sha
// the Harness took", and it is a real binding: it says WHICH record a rendering
// came from, so a rendering and a record can be shown to disagree. It is NOT
// evidence that a judgment ran, and the rendered text says so rather than
// letting the sha stand in for the thing it cannot show.
//
// NO NEW FILE IS READ FOR THIS, and the omission is the decision. A
// `judgment-record.json` the session writes and this layer reads back would be
// the SAME defect wearing a second carrier: read-back is allowed only of the
// Harness's own acts, and a record the model composes is model output whatever
// it is named. Minting one would discharge the issue on the surface while
// reproducing it underneath.
export const JUDGMENT_OBSERVED = "observed";
export const JUDGMENT_DECLARED = "declared";

// THE SITE IS FILLED (kogaki#1030). The comment above says `observed` "HAS NO
// PRODUCER TODAY … it is the arm a judge-invoking act would light up without
// touching either renderer". This is that act, and neither renderer is touched:
// the executor now invokes the judge itself at every `judgment` state, and what
// it records here is ITS OWN act — the model it pinned from the workflow table,
// the command it ran, the state it ran it for, how many times it asked, and the
// sha it took from the response bytes on disk.
//
// STILL NOT A READ-BACK OF MODEL OUTPUT. The distinction kogaki#892 draws is
// between a record the HARNESS wrote about an act it performed and a record the
// MODEL composed about itself; this is the first. Nothing in the invocation
// record comes from the response's content — the model cannot write its own
// provenance by saying it judged.
//
// SET BY `invokeJudge` AND BY NOTHING ELSE, per state, for the life of the
// process. A run where the owner supplied the record on argv sets none and stays
// `declared`, which is the honest reading: that run's judgment was declared to
// this layer, not observed by it.
const JUDGE_INVOCATIONS = new Map();

export function recordJudgeInvocation(stateId, invocation) {
  JUDGE_INVOCATIONS.set(stateId, invocation);
}

// The Harness's own judgment-invocation record. `null` where this process
// invoked no judge — the one honest value, and the state every pre-#1030 run is
// in. A FUNCTION rather than a bare constant so that the site is named and
// reachable, and so the two renderers below read one source rather than each
// testing a literal.
//
// THE DEFAULT ARGUMENT IS THE SUBDIVISION STATE because the two renderers that
// read this are the subdivision display's, and `judgmentProvenance` is called
// with the `--subdivisions` artifact. A caller naming another state gets that
// state's invocation.
export function harnessJudgeInvocation(stateId = "J2_subdivision") {
  return JUDGE_INVOCATIONS.get(stateId) || null;
}

// ---- THE JUDGE CALL ITSELF (kogaki#1030 item 1). ---------------------------
//
// THE MODEL IS A CALLED FUNCTION, NEVER THE DRIVER. The executor composes the
// prompt from the table's own declaration of the state — its judgment point, its
// input shape and its refusal text — hands the state's composed input alongside,
// runs the pinned model, and parses ONE typed record out. Every decision about
// what happens next stays here.
//
// THE MODEL IS PINNED IN `workflow.json` AND NEVER INHERITED FROM THE SESSION.
// A judgment carried out by whatever model happened to be driving is not
// reproducible and the run record could not say what judged it.
//
// `KOGAKI_JUDGE_CLI` REPLACES THE BINARY, FOR FIXTURES. The acceptance cases
// drive this path with `claude -p` stubbed, and a fixture that had to reach the
// real CLI would be a fixture that cannot run. It overrides WHICH executable is
// run and nothing else: the argv, the pinned model, the parse and every refusal
// below are the same on both paths, so the fixture exercises the shipped code
// rather than a second one written for it.
// ---- THE JUDGE BINARY IS RESOLVED ONCE, BY THE SESSION THAT STARTS THE RUN
// (kogaki#1076).
//
// The table's `judge.command` is the bare word `claude`, and a bare word is
// resolved by whoever spawns it -- so the binary a judgment call ran was
// whatever the FIRING session's `PATH` offered first. On 2026-09-10 an advance
// fired from a second session resolved a Windows npm shim under `/mnt/c`, whose
// own `exec` failed, and three judge calls exited 127 against a tree in which
// the same judge had run to completion an hour earlier. Nothing in the tree had
// changed; the session had.
//
// THE PIN NAMED EVERYTHING BUT THE BINARY. `judge_pin` carries the model, the
// effort tier and the survey revision, so two runs with equal pins had run
// different executables and one of them was not an executable at all. A run's
// judgments depended on an environment the run neither owned nor recorded.
//
// RESOLUTION IS A WALK, AND RUNNING THE CANDIDATE IS WHAT MAKES IT ONE.
// Existence and the execute bit do not discriminate: the shim HAS both, and
// fails only when it is run. So each candidate is RUN, with `--version`, and the
// first that exits 0 is the run's binary -- a walk that stopped at the first
// existing file would have chosen the shim, which is the defect with an extra
// step.
const JUDGE_VERSION_PROBE_MS = 20000;

// THE ORDER `PATH` DECLARES, DE-DUPLICATED. A command carrying a separator is
// not a `PATH` lookup at all and stands as its own single candidate -- that is
// the absolute form this act exists to produce, and an absolute path handed in
// is already it.
export function judgeBinaryCandidates(command, pathEnv) {
  if (command.includes("/") || command.includes(sep)) return [resolve(command)];
  const seen = new Set();
  const out = [];
  for (const entry of String(pathEnv || "").split(delimiter)) {
    if (!entry) continue;
    const cand = resolve(entry, command);
    if (seen.has(cand)) continue;
    seen.add(cand);
    out.push(cand);
  }
  return out;
}

// STDIN IS CLOSED FOR THE PROBE. A judgment call feeds its prompt on stdin, and
// a binary that blocked here waiting for one would hang the start act rather
// than answering it -- so the probe is bounded as well, on the ground the
// per-call bound is: a bound a hung child can outlast is not a bound.
function probeJudgeBinary(candidate) {
  const r = spawnSync(candidate, ["--version"], {
    stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", timeout: JUDGE_VERSION_PROBE_MS,
  });
  if (r.error) return { ok: false, why: `${r.error.code || "spawn failed"}: ${r.error.message}` };
  if (r.status !== 0) {
    const said = String(r.stderr || r.stdout || "").trim().split("\n")[0].trim() || "(no output)";
    return { ok: false, why: `${r.status === null ? `killed on ${r.signal}` : `exited ${r.status}`}: ${said}` };
  }
  const first = (t) => String(t || "").trim().split("\n")[0].trim();
  return { ok: true, version: first(r.stdout) || first(r.stderr) || "(no version output)" };
}

// THE REFUSAL NAMES WHAT `PATH` OFFERED, every candidate that existed and the
// reason each one was rejected. "The judge could not be run" over a bare word
// tells an operator nothing they can act on; the shim's own stderr, quoted
// beside the path it came from, is the whole diagnosis.
export function resolveJudgeBinary(command, pathEnv) {
  const candidates = judgeBinaryCandidates(command, pathEnv);
  const rejected = [];
  for (const cand of candidates) {
    // NOT PROBED WHERE NOTHING IS THERE, and this is not the discriminating
    // check returning: a candidate that does not exist is not REJECTED on a
    // property, it is simply not a candidate, and spawning it to learn ENOENT
    // would cost one child per `PATH` entry to reach the same list.
    if (!existsSync(cand)) continue;
    const r = probeJudgeBinary(cand);
    if (r.ok) return { command, path: cand, version: r.version, rejected };
    rejected.push({ path: cand, why: r.why });
  }
  fail(`the judge command ${JSON.stringify(command)} resolves to no runnable binary. The judgment `
    + `states run a pinned model through this command, and the run resolves it ONCE -- here, in the `
    + `session that starts the run -- so that an advance fired from another session cannot run a `
    + `different executable (kogaki#1076).\n`
    + `  searched ${candidates.length} candidate(s) over PATH, ${rejected.length} of which exist:\n`
    + (rejected.length
      ? rejected.map((r) => `    ${r.path}\n      ${r.why}`).join("\n")
      : "    (none -- no PATH entry carries a file by that name)")
    + `\n  Each candidate is RUN with \`--version\` and the first to exit 0 is taken: existence and the `
    + `execute bit do not discriminate a working install from a shim whose own \`exec\` fails.`);
}

// RESOLVED AT THE START ACT, BEFORE THE SURVEY (kogaki#1076 item 1), and read
// back by every later act of the same run. A record that already carries one is
// never re-resolved: that is the whole of item 2 -- the advance uses the RUN's
// binary and not the session's.
//
// A RECORD WRITTEN BEFORE THIS FIELD EXISTED RESOLVES AT ITS NEXT ACT rather
// than falling back to the bare word. The fallback is the defect; a resolution
// that refuses in a session whose PATH offers only the shim names the shim,
// which is strictly better than the exit 127 it replaces.
//
// `KOGAKI_JUDGE_CLI` IS RESOLVED LIKE ANY OTHER COMMAND, not around this act.
// It replaces WHICH executable is run, and a fixture whose stub cannot answer
// `--version` is a fixture running something the shipped path would refuse.
function ensureJudgeBinary(rec, table) {
  if (rec.judge_binary) return rec.judge_binary;
  const declared = process.env.KOGAKI_JUDGE_CLI || ((table && table.judge) || {}).command;
  // A TABLE THAT DECLARES NO JUDGE REACHES NO JUDGMENT STATE, so there is
  // nothing to resolve and nothing to refuse. `judgeSettings` still refuses the
  // missing block at the state that needs it.
  if (!declared) return null;
  const r = resolveJudgeBinary(String(declared), process.env.PATH);
  rec.judge_binary = {
    command: r.command,
    path: r.path,
    version: r.version,
    stubbed: !!process.env.KOGAKI_JUDGE_CLI,
  };
  return rec.judge_binary;
}

function judgeSettings(table, rec) {
  const j = (table && table.judge) || fail(
    "the workflow table declares no `judge` block, so a judgment state has no model to invoke. "
    + "field_semantics: the block names the command, THE PINNED MODEL and the output format, and the "
    + "model is never inherited from the session (kogaki#1030).");
  // THE RECORDED ABSOLUTE PATH, NEVER THE BARE WORD (kogaki#1076 item 2). The
  // table's `command` is what was RESOLVED; what is RUN is what the resolution
  // found and verified, so an advance fired from a session whose `PATH` differs
  // runs the run's own binary.
  const binary = (rec && rec.judge_binary) || null;
  return {
    command: binary ? String(binary.path) : fail(
      "this run's record carries no resolved judge binary, so a judgment call would spawn whatever the "
      + "firing session's PATH offers first -- which is the defect kogaki#1076 closed. The binary is "
      + "resolved and verified by the session that STARTS the run and written onto the run record; a "
      + "record carrying none is one this act never opened."),
    // THE PIN'S BINARY COMPONENT (kogaki#1076 item 3). What `--version` said,
    // taken from the executable the run actually resolved.
    binaryVersion: binary ? (binary.version || null) : null,
    model: String(j.model || fail("the workflow table's `judge` block pins no `model`")),
    outputFormat: String(j.output_format || "json"),
    // PER CALL, IN SECONDS IN THE TABLE AND MILLISECONDS HERE. Required rather
    // than defaulted: a bound that a table can silently omit is not a bound.
    timeoutMs: 1000 * (Number.isFinite(j.timeout_s) ? j.timeout_s : fail(
      "the workflow table's `judge` block declares no numeric `timeout_s`. A judgment call inside a "
      + "PostToolUse hook is bounded by that hook, and an unbounded child can exhaust the hook's own "
      + "timeout mid-span (kogaki#1030, PR #1044 round 1).")),
    // HOW MANY OF THOSE BOUNDED CALLS RUN AT ONCE (kogaki#1073). `timeout_s`
    // bounds ONE call and `ADVANCE_TIMEOUT_S` bounds the WHOLE advance, and
    // between them sat a quantity neither named: the SUM. kogaki#1062 made each
    // per-group call small and left the sum untouched, and on 2026-09-10 eleven
    // sequential calls of thirty to ninety seconds each were killed at the
    // advance bound after eight of them. The repair is to remove the sum rather
    // than to choose a number for it: with the calls running concurrently the
    // wall time of a per-group judgment state is about the LONGEST call, not the
    // total, so neither bound has to move.
    //
    // REQUIRED AND POSITIVE, on `timeout_s`'s own ground one field above: a cap
    // a table can silently omit is not a cap, and a run that defaulted it would
    // be running at a width nothing declared. A cap of 1 is the sequential
    // behaviour, declared rather than inherited.
    concurrency: Number.isInteger(j.concurrency) && j.concurrency > 0 ? j.concurrency : fail(
      "the workflow table's `judge` block declares no positive integer `concurrency`. It is the number "
      + "of judge calls a per-group judgment state runs at once; the per-call bound `timeout_s` and the "
      + "advance's own bound both hold unchanged, and this is what keeps their SUM from being what the "
      + "advance is measured against (kogaki#1073)."),
    // READ FROM THE RESOLUTION, not from this act's environment: the run's
    // binary was chosen once, and whether it was the fixture seam's is a fact
    // about that choice rather than about whoever is advancing the run now.
    stubbed: binary ? !!binary.stubbed : !!process.env.KOGAKI_JUDGE_CLI,
  };
}

// THE CHILD, RUN WITHOUT BLOCKING THE THREAD (kogaki#1073). `spawnSync` is what
// made the per-group calls a SUM: nothing else can run while one is in flight,
// so eleven calls cost eleven call-lengths however small each one is. This is
// `spawnSync`'s contract over `spawn` — the same argv, the same stdin, the same
// per-call bound and the same `maxBuffer` — returning a promise instead of a
// value, so the pool below can hold several in flight at once.
//
// THE TIMEOUT ARM IS REPRODUCED RATHER THAN INHERITED, and its shape is
// `spawnSync`'s: `error.code === "ETIMEDOUT"`, which is the token the caller
// already reads. `spawn`'s own `timeout` option reports a kill through a signal
// on `close`, and a caller distinguishing a bound from a crash by signal would
// be reading a different fact than the one it reads today.
function judgeSpawnAsync(command, argv, { input, timeoutMs, maxBuffer }) {
  return new Promise((resolvePromise) => {
    let child;
    try { child = spawn(command, argv, { stdio: ["pipe", "pipe", "pipe"] }); }
    catch (e) { resolvePromise({ error: e, status: null, stdout: "", stderr: "" }); return; }
    const outChunks = [];
    const errChunks = [];
    let outLen = 0;
    let settled = false;
    let timer = null;
    const settle = (r) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolvePromise(r);
    };
    const kill = (err) => { try { child.kill("SIGKILL"); } catch { /* already gone */ } settle(err); };
    child.stdout.on("data", (d) => {
      outLen += d.length;
      // THE SAME CEILING `spawnSync`'s `maxBuffer` CARRIED, enforced here because
      // `spawn` has none: a judge that streamed without end would otherwise fill
      // this process's memory rather than being cut off with a named error.
      if (outLen > maxBuffer) { kill({ error: Object.assign(new Error("stdout maxBuffer exceeded"), { code: "ENOBUFS" }), status: null, stdout: "", stderr: "" }); return; }
      outChunks.push(d);
    });
    child.stderr.on("data", (d) => errChunks.push(d));
    child.on("error", (e) => settle({ error: e, status: null, stdout: "", stderr: "" }));
    child.on("close", (status) => settle({
      error: null, status,
      stdout: Buffer.concat(outChunks).toString("utf8"),
      stderr: Buffer.concat(errChunks).toString("utf8"),
    }));
    timer = setTimeout(() => {
      kill({ error: Object.assign(new Error("child timed out"), { code: "ETIMEDOUT" }), status: null, stdout: "", stderr: "" });
    }, timeoutMs);
    child.stdin.on("error", () => { /* a child that exited before reading its prompt is the close arm's */ });
    child.stdin.end(input);
  });
}

// N AT A TIME, IN DECLARATION ORDER, AND THE RESULTS COME BACK IN THAT ORDER
// (kogaki#1073). A worker takes the next index until there is none left, so the
// cap bounds how many are IN FLIGHT and never how many run. The results array is
// indexed by the item's own position, so the bookkeeping that follows the pool
// reads the groups in the order the composed input declared them — the order the
// sequential loop read them in, unchanged by the concurrency.
async function runPool(items, cap, fn) {
  const results = new Array(items.length);
  let next = 0;
  const width = Math.max(1, Math.min(cap, items.length));
  await Promise.all(Array.from({ length: width }, async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }));
  return results;
}

// Everything after this line in a judge prompt is the input file, verbatim.
export const JUDGE_INPUT_MARKER = "----- INPUT (JSON) -----";

// AND EVERYTHING AFTER THIS LINE IS THE PRIOR ATTEMPT'S REFUSAL, verbatim
// (kogaki#1059). It appears only on a re-ask, and it appears BEFORE the input
// marker, because the input marker's own contract is that everything after it
// is the input file — a refusal appended past it would be read as input by any
// reader keying on position, which is the one thing that marker promises.
export const JUDGE_REFUSAL_MARKER = "----- YOUR PREVIOUS ANSWER WAS REFUSED -----";

// THE FILLED RECORD EXAMPLE (kogaki#1059). A PROSE SHAPE DESCRIPTION CANNOT BIND
// A VALIDATOR'S SHAPE. `input_shape` is one sentence — for `J1_claims`, "typed
// claims record carrying composition_pin and one claim per group" — and on
// 2026-09-09 the live judge returned a record that SATISFIES that sentence and
// the validator refused three times: the pin as the pin STRING rather than the
// pin OBJECT the subset check needs the `groups` map out of, and the claims as
// an array of `{group, claim}` rather than the `{group: claim}` map. The literal
// shape existed only in a source comment and in the refusal text, neither of
// which the judge sees.
//
// SO THE EXAMPLE IS FILLED FROM THE RUN'S OWN COMPOSED INPUT rather than written
// out as a literal in the table. A hand-written example is a fourth carrier of
// the shape that can drift from the validator exactly as the prose did; one
// built from `composition_pin` as the input actually holds it, and keyed by the
// group names that input actually composed, cannot name a pin the run did not
// compose or a group the subset check would then refuse.
//
// TABLE-DRIVEN, so a fifth judgment state gets an example by adding a row and no
// code here — the property the prompt composer above already has. Two directives
// and no third, each refused by name:
//
//   "$input:<key>"          the composed input's top-level <key>, verbatim
//   "$per-group:<text>"     an object mapping each composed group's name to <text>
//
// Any other value is a literal. A `$`-prefixed string that is neither directive
// is a REFUSAL rather than a literal: a typo'd directive rendered as its own text
// would put the word `$per-groups:` in front of the judge as though it were the
// shape, which is the prose-instead-of-shape defect returning through the carrier
// that exists to end it.
export function judgeRecordExample(st, input) {
  const tpl = st.record_example;
  if (tpl === undefined || tpl === null) return null;
  if (typeof tpl !== "object" || Array.isArray(tpl)) {
    fail(`${st.id}: \`record_example\` must be a JSON object whose values are literals or one of the `
      + "two directives `$input:<key>` and `$per-group:<text>` (kogaki#1059).");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    fail(`${st.id}: \`record_example\` is declared and this state's composed input is not a JSON `
      + "object, so the example cannot be filled from the run's own material. An example filled from "
      + "anything else would put a shape in front of the judge that this run never composed "
      + "(kogaki#1059).");
  }
  // `$per-group` AS THE SOLE KEY, WHOSE VALUE IS THE TEMPLATE (kogaki#1062).
  // This is the SAME directive as the string form below, not a third one: what
  // widens is WHERE it may stand. `J1_claims`' record wraps its per-group map
  // under a `claims` key, so the string form under an ordinary key expresses it;
  // `J2_subdivision`'s record IS the per-group map, and its entries are OBJECTS
  // rather than sentences. Neither is expressible as a value under a key, so a
  // state whose whole record is the map had no way to bind its shape by example
  // and stayed bound by prose — which is the defect kogaki#1059 closed for its
  // sibling and this state still carried.
  const soleKeys = Object.keys(tpl);
  if (soleKeys.length === 1 && soleKeys[0] === "$per-group") {
    if (!Array.isArray(input.groups)) {
      fail(`${st.id}: \`record_example\` is the per-group map itself, and the composed input carries `
        + "no `groups` array to name its keys (kogaki#1062).");
    }
    return Object.fromEntries(input.groups.map((g) => [String(g && g.name), tpl["$per-group"]]));
  }
  const out = {};
  for (const [key, value] of Object.entries(tpl)) {
    if (typeof value !== "string" || !value.startsWith("$")) { out[key] = value; continue; }
    const at = value.indexOf(":");
    const directive = at < 0 ? value : value.slice(0, at);
    const arg = at < 0 ? "" : value.slice(at + 1).trim();
    if (directive === "$input") {
      if (!Object.prototype.hasOwnProperty.call(input, arg)) {
        fail(`${st.id}: \`record_example\` fills \`${key}\` from the composed input's \`${arg}\`, and `
          + "the input carries no such key. The example binds the shape the validator reads, so an "
          + "example filled from a key that is not there is worse than none (kogaki#1059).");
      }
      out[key] = input[arg];
    } else if (directive === "$per-group") {
      if (!Array.isArray(input.groups)) {
        fail(`${st.id}: \`record_example\` fills \`${key}\` with one entry per composed group, and the `
          + "composed input carries no `groups` array to name them (kogaki#1059).");
      }
      out[key] = Object.fromEntries(input.groups.map((g) => [String(g && g.name), arg]));
    } else {
      fail(`${st.id}: \`record_example\` names the unknown directive \`${directive}\`. The two are `
        + "`$input:<key>` and `$per-group:<text>`, and a third is added by ruling rather than by "
        + "spelling (kogaki#1059).");
    }
  }
  return out;
}

// The prompt is composed FROM THE TABLE, so a fifth judgment state needs a table
// row and no code here: its judgment point, input shape and refusal text are
// already the three things the state declares about what it wants.
//
// COMPOSED PER ATTEMPT (kogaki#1059). It was composed once outside the retry
// loop, so attempt N+1 was byte-identical to attempt N and never saw attempt N's
// refusal — which made the declared bound a REPETITION rather than a repair loop:
// on 2026-09-09 it reproduced one deterministic refusal three times at about
// ninety seconds each. `lastRefusal` is what makes the second ask a different
// ask.
function judgePrompt(st, inputText, input, lastRefusal) {
  const L = [];
  L.push(`You are the judge at the Terrain workflow's \`${st.id}\` judgment point.`);
  L.push("");
  L.push(`JUDGMENT POINT: ${st.judgment_point || st.id}`);
  L.push(`REQUIRED RECORD SHAPE: ${st.input_shape || "the typed record this state declares"}`);
  if (st.refusal) L.push(`WHAT IS REFUSED: ${st.refusal}`);
  const example = judgeRecordExample(st, input);
  if (example) {
    L.push("");
    L.push("THE LITERAL RECORD SHAPE, filled from THIS run's own composed input. Answer with a record");
    L.push("of exactly this shape: the same keys, the same nesting, and the same group names, with");
    L.push("each placeholder replaced by your judgment. The sentence above DESCRIBES the record; this");
    L.push("is the record.");
    L.push(JSON.stringify(example, null, 2));
  }
  L.push("");
  L.push("Your INPUT is the JSON below the marker, and it is the whole of what you may judge over.");
  L.push("Answer with the typed record and NOTHING else -- no prose, no fences, no commentary.");
  if (lastRefusal) {
    L.push("");
    L.push(JUDGE_REFUSAL_MARKER);
    L.push(lastRefusal);
    L.push("");
    L.push("That is the refusal your previous answer raised, verbatim. Answer again, repairing exactly");
    L.push("it. The input below is unchanged, so re-reading the material is not what is wanted -- the");
    L.push("shape of your record is.");
  }
  L.push("");
  // THE MARKER IS PART OF THE CONTRACT, not decoration. Everything after it is
  // the input file verbatim, so a reader — the judge, or a fixture stub standing
  // in for one — can find the input by position rather than by scanning for a
  // brace that the state's own `input_shape` text might also contain.
  L.push(JUDGE_INPUT_MARKER);
  L.push(inputText);
  return L.join("\n");
}

// The response's typed record. `--output-format json` wraps the answer in the
// CLI's own envelope, so the record is dug out of `result` rather than parsed
// off the whole of stdout; a bare record is admitted too, because that is what a
// stub is likeliest to emit and because admitting it costs no ambiguity.
function judgeRecordFrom(stdout, st) {
  let outer;
  try { outer = JSON.parse(stdout); }
  catch (e) {
    fail(`${st.id}: the judge's response is not JSON (${e.message}). The response is what the `
      + `pinned model returned to \`--output-format json\`, unedited: ${String(stdout).slice(0, 400)}`);
  }
  const inner = outer && typeof outer === "object" && !Array.isArray(outer)
    && Object.prototype.hasOwnProperty.call(outer, "result") ? outer.result : outer;
  if (typeof inner !== "string") return inner;
  try { return JSON.parse(inner); }
  catch (e) {
    fail(`${st.id}: the judge's response envelope parsed and its \`result\` did not (${e.message}). `
      + `The record must be the typed record alone -- no prose and no fences: ${inner.slice(0, 400)}`);
  }
  return null;
}

// THE RETRY IS BOUNDED BY THE TABLE, and the bound is the STATE's. `retries` is
// the number of RE-ASKS, so a state declaring 2 makes at most three calls.
//
// THE FAILURE CARRIES THE REFUSAL TEXT, which is the issue's own wording: the
// last refusal the state raised is what the run fails with, so the operator
// reads why the judge's record was rejected rather than "the judge failed".
// ONE BOUNDED ASK-AND-VALIDATE LOOP, WRITTEN ONCE AND SPENT BY BOTH INVOCATION
// SHAPES (kogaki#1062). `invokeJudge` asks once over the whole composed input;
// `invokeJudgePerGroup` asks once per composed group. The bound, the per-attempt
// prompt composition, the widened refusal window and the deliberate
// spawn-failure exception are properties of AN ASK rather than of either shape,
// so a second copy of them for the per-group path would be two readings of one
// licence -- exactly the shape `judgedRecordPath` already refuses for the
// VALIDATION body one line below it.
//
// IT RETURNS RATHER THAN FAILING on an exhausted bound, and that is what the
// per-group shape needs: the failure text names the group and the groups already
// judged, and only the caller knows those. The whole-input caller's `fail()` is
// unchanged and still carries the same words it did.
async function judgeAttempts(cfg, st, retries, { inputText, input, out, validate, label }) {
  const argv = ["-p", "--model", cfg.model, "--output-format", cfg.outputFormat];
  const at = label || "";
  let lastRefusal = null;
  // EVERY REFUSAL THE BOUND ABSORBED, in order. The run record carries them on
  // BOTH arms (kogaki#1059): a run refused once and repaired on the second ask
  // is not a run that was never refused, and a reader who cannot tell the two
  // apart cannot see a judge drifting toward the bound until it is spent.
  const refusals = [];
  // COUNTED AS IT HAPPENS, never derived from the bound. A message composed from
  // `retries + 1` reports the number of attempts the table LICENSED rather than
  // the number this call made -- so a loop that stopped early would still say it
  // had spent them all, and an operator reading the refusal would be told a
  // count nothing performed. Found by mutating the loop bound and watching the
  // case stay green.
  let attempts = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    attempts += 1;
    // THE ASK CARRIES THE PRIOR REFUSAL (kogaki#1059). Composed HERE, inside the
    // loop, so attempt N+1 is a different ask from attempt N.
    const prompt = judgePrompt(st, inputText, input, lastRefusal);
    try {
      // THE WHOLE RESPONSE HANDLING IS INSIDE THE WINDOW (PR #1044 round 1).
      // The first cut wrapped only `validate`, so `retries` bounded the
      // CONFORMANCE arm alone: a response that was not JSON, a `result` that did
      // not parse, and a non-zero exit each reached `fail()` outside the window
      // and ended the run on the first occurrence. Those are the arms a re-ask is
      // LIKELIEST to repair, and the licence does not distinguish them -- #1030
      // item 1 says "the response passes through the existing refusals; a refused
      // response is retried at most the count `workflow.json` declares".
      //
      // `res.error` STAYS OUTSIDE IT, and that is the one deliberate exception: a
      // command that could not be SPAWNED will not spawn on the next attempt
      // either, so re-asking would spend the bound on a fact that cannot change.
      // A model that answered badly is a different case from a binary that is not
      // there.
      // THE CALL IS AWAITED OUTSIDE THE WINDOW AND ITS RESULT IS JUDGED INSIDE
      // (kogaki#1073). The soft window is a synchronous depth counter, and a
      // window held across an `await` would be open while OTHER groups' results
      // were being judged in the same process — so the two are separated: the
      // child runs first and raises nothing, and every refusal below is decided
      // in one synchronous window as it always was.
      const raw = await judgeSpawnAsync(cfg.command, argv, {
        input: prompt, maxBuffer: 64 * 1024 * 1024,
        // THE CHILD IS BOUNDED, AND ITS BOUND IS DERIVED FROM THE HOOK'S
        // (PR #1044 round 1). `.claude/hooks/advance-terrain.py` kills the whole
        // advance at `ADVANCE_TIMEOUT_S`, and a span can now make several pinned
        // calls inside one PostToolUse event -- so an unbounded child could
        // exhaust the hook's bound mid-span and leave the half-finished record
        // that bound exists to relay, falsifying the one-hook-event guarantee
        // with no state misbehaving. The table declares the per-call seconds;
        // the two are named apart rather than conflated, because one bounds a
        // CALL and the other bounds an ADVANCE.
        timeoutMs: cfg.timeoutMs,
      });
      const res = softRefusals(() => {
        const r = raw;
        if (r.error && r.error.code === "ETIMEDOUT") {
          fail(`${st.id}${at}: the judge exceeded the ${cfg.timeoutMs / 1000}s per-call bound the workflow table's `
            + "`judge` block declares. The bound exists so that several calls in one span cannot exhaust the "
            + "PostToolUse advance's own timeout and leave a half-finished record (kogaki#1030).");
        }
        if (r.error) {
          // OUTSIDE THE RETRY, by the exception above: re-thrown past the window
          // so a spawn failure exits on the first occurrence.
          throw r.error;
        }
        if (r.status !== 0) {
          fail(`${st.id}${at}: the judge exited ${r.status}. Its stderr, verbatim: ${(r.stderr || "").trim() || "(empty)"}`);
        }
        return r;
      });
      const record = softRefusals(() => judgeRecordFrom(res.stdout, st));
      // WRITTEN UNDER A TEMPORARY NAME AND RENAMED AFTER IT VALIDATES
      // (kogaki#1073). The per-group records are now READ BACK on a later
      // advance, so what sits at `out` is evidence rather than a by-product: a
      // record cut off mid-write, or one this attempt is about to refuse, would
      // be taken by the next run as a group already judged. The rename is the
      // one act that makes "the file exists" and "the file validated" the same
      // fact. A refused attempt therefore leaves the temporary beside the run
      // for a reader, and never at the name the reuse check reads.
      const partial = `${out}.partial`;
      writeFileSync(partial, JSON.stringify(record, null, 2) + "\n");
      // THE STATE'S OWN REFUSALS, run against the judge's record exactly as they
      // run against an owner-supplied one.
      softRefusals(() => validate(partial));
      renameSync(partial, out);
      return { ok: true, out, record, attempts, refusals, lastRefusal, prompt };
    } catch (e) {
      if (!(e instanceof JudgmentRefusal)) {
        // The spawn failure the window deliberately re-throws, given its own
        // refusal here rather than at the throw site so the two arms of "the
        // judge did not answer" read alike to an operator.
        if (e && e.syscall) {
          fail(`${st.id}${at}: the judge could not be run (${cfg.command}: ${e.message}). The command and the `
            + "model are pinned in the workflow table's `judge` block; nothing here falls back to another "
            + "model, and a binary that is not there will not be there on a re-ask, so the bound is not spent on it.");
        }
        throw e;
      }
      lastRefusal = e.message;
      refusals.push(e.message);
    }
  }
  return { ok: false, out, attempts, refusals, lastRefusal };
}

// THE WHOLE COMPOSED INPUT, ONE ASK. The default shape, and the one every
// judgment state but `J2_subdivision` still spends.
async function invokeJudge(table, st, inputPath, dir, validate, rec) {
  const cfg = judgeSettings(table, rec);
  const retries = Number.isInteger(st.retries) ? st.retries : fail(
    `${st.id} is kind "judgment" and declares no integer \`retries\`. field_semantics requires the `
    + `key of exactly the judgment states -- the count is a property of the workflow and is held in `
    + `the table, never in this file (kogaki#1030).`);
  // READ AND PARSED ONCE, and the PROMPT is what is composed per attempt
  // (kogaki#1059). The input does not change between attempts -- the whole of
  // what a re-ask repairs is the judge's record -- so re-reading the file each
  // time would spend a read to make the two asks look different.
  const inputText = readFileSync(inputPath, "utf8");
  let input = null;
  try { input = JSON.parse(inputText); }
  catch (e) {
    // ONLY THE EXAMPLE NEEDS IT PARSED, so a state declaring none is unaffected
    // and a state declaring one refuses rather than silently dropping the
    // example -- an example that vanishes on a bad input is the prose-only
    // prompt returning at exactly the moment nothing would report it.
    if (st.record_example !== undefined && st.record_example !== null) {
      fail(`${st.id}: the composed input at ${inputPath} is not JSON (${e.message}), so the filled `
        + "record example this state declares cannot be built from the run's own material "
        + "(kogaki#1059).");
    }
  }
  // ONE CALL PER COMPOSED GROUP WHERE THE TABLE DECLARES IT (kogaki#1062). A
  // TABLE fact, so a second state joins by a row and no code here -- the
  // property `judgeRecordExample` and `judgePrompt` already have.
  // THE LIMITS THE RECORD IS JUDGED AGAINST (kogaki#1068 item 2), RESOLVED FOR
  // EVERY JUDGMENT STATE AND SPENT BY ONE (PR #1070 round 1). Resolving it inside
  // the per-group arm made both properties the table's `limits` row claims false
  // for a state that declared the key without `per_group`: the block silently did
  // not reach the ask, and the unknown-block-name refusal was unreachable, so a
  // typo in the table read as an absent key. Resolving it here makes the refusal
  // a property of DECLARING the key, which is what the row says it is.
  //
  // IT IS SPENT ON THE PER-GROUP ASK ALONE, and the asymmetry is deliberate
  // rather than an oversight the line above repairs. `judgePrompt` embeds the
  // whole-input arm's input file VERBATIM, by the marker's own contract --
  // everything past it is the file, so a reader or a stub can find the input by
  // position -- and injecting a key there would put a prompt in front of the
  // judge that disagrees with the artifact on disk. The per-group arm already
  // COMPOSES its text from a narrowed object, so the limits ride the same
  // narrowing. A state that wants them on the whole-input ask needs the composer
  // to write them into the artifact, which is a change to `compose_input` and not
  // to this line.
  const limits = judgeLimits(st);
  if (st.per_group === true) {
    return await invokeJudgePerGroup(cfg, st, retries, inputPath, input, dir, validate, rec, limits);
  }
  const out = join(dir, `terrain-judge-${st.id}.json`);
  const r = await judgeAttempts(cfg, st, retries, { inputText, input, out, validate, label: "" });
  if (r.ok) {
    recordJudgeInvocation(st.id, {
      state: st.id,
      command: cfg.command,
      // WHAT `--version` SAID, beside the path (kogaki#1076). Two invocation
      // records naming one command told a reader nothing about whether one
      // executable produced both.
      binary_version: cfg.binaryVersion,
      model: cfg.model,
      stubbed: cfg.stubbed,
      calls: 1,
      attempts: r.attempts,
      retries_declared: retries,
      refusals_repaired: r.refusals.length,
      // TAKEN FROM THE BYTES ON DISK BY THIS LAYER, like every other sha in
      // this file. A sha the response supplied would be one more declaration.
      response_sha: createHash("sha256").update(readFileSync(out)).digest("hex").slice(0, 16),
      at: new Date().toISOString(),
    });
    // ONE CALL, ON THE RUN RECORD, for the per-group arm's own reason: the two
    // shapes are distinguishable at the record rather than only by which fields
    // happen to be absent.
    if (rec) {
      rec.judge_calls = rec.judge_calls || {};
      rec.judge_calls[st.id] = {
        per_group: false, calls: 1, attempts: r.attempts,
        retries_declared: retries, refusals_repaired: r.refusals.length,
        // WHAT MADE THESE CALLS (kogaki#1076). `harnessJudgeInvocation`'s record
        // holds it too and lives in this process alone, so before this the run
        // record -- the one carrier a later reader has -- said how many calls
        // were made and nothing about which executable made them.
        command: cfg.command, binary_version: cfg.binaryVersion,
      };
    }
    // THE REPAIRED ARM WRITES THE RECORD TOO (kogaki#1059). `judgment_refusals`
    // used to be written on exhaustion alone, so a run the retry loop REPAIRED
    // was indistinguishable at the record from one the judge answered first
    // time -- and a repair loop nothing counts is a bound whose approach is
    // invisible until it is spent. `repaired` is what keeps the two arms
    // apart, so the existing exhaustion reader is unchanged by the widening.
    if (rec && r.refusals.length) {
      rec.judgment_refusals = rec.judgment_refusals || {};
      rec.judgment_refusals[st.id] = {
        attempts: r.attempts, retries_declared: retries, refusal: r.lastRefusal,
        refusals: r.refusals, repaired: true,
      };
    }
    return out;
  }
  // THE RUN RECORD NAMES THE REFUSAL, not only stderr (PR #1044 round 1, D1's
  // partial-discharge note). #1030 acceptance 2 reads "the run fails after the
  // declared retry count and THE RECORD NAMES THE REFUSAL", and stderr and the
  // persisted record are not one carrier: `fail()` persists the pending record
  // and prints the text, so a reader coming back to the run afterwards had the
  // failure and not its reason. Written before the refusal, so kogaki#808's
  // persist carries it out.
  if (rec) {
    rec.judgment_refusals = rec.judgment_refusals || {};
    rec.judgment_refusals[st.id] = {
      attempts: r.attempts, retries_declared: retries, refusal: r.lastRefusal,
      refusals: r.refusals, repaired: false,
    };
  }
  fail(`${st.id}: the judge's record was refused on all ${r.attempts} attempt(s) (${retries} re-ask(s) licensed, the count `
    + `the workflow table declares for this state). The last refusal, verbatim: ${r.lastRefusal}`);
  return null;
}

// THE COMPOSED INPUT, NARROWED TO ONE GROUP (kogaki#1062). The whole point of
// the per-group ask is that each call carries THAT GROUP'S material alone: the
// composed input's `material` holds every member's untruncated Gloss body, so
// the whole-input ask grows with the tag and the per-group ask does not.
//
// IT NARROWS AND NEVER ADDS. Every key the composed input carries is kept as it
// stands -- the tag, the pin, the bound -- and only the three that are keyed BY
// GROUP are cut down: `groups`, `material`, and `composition_pin.groups`. A
// judge told about eleven groups and asked about one would compose a claim
// against a parent it cannot see the rest of, and a `composition_pin` still
// naming all eleven would license members this ask never handed over -- which
// is the subset check's own reason for carrying the member set rather than a
// digest.
export function scopeCompositionInput(input, group) {
  const name = String(group && group.name);
  const members = new Set(group && Array.isArray(group.members) ? group.members : []);
  const out = { ...input, groups: [group] };
  if (Array.isArray(input.material)) {
    out.material = input.material.filter((m) => members.has(m && m.id));
  }
  const cp = input.composition_pin;
  if (cp && typeof cp === "object" && !Array.isArray(cp) && cp.groups && typeof cp.groups === "object") {
    out.composition_pin = { ...cp, groups: { [name]: [...members] } };
  }
  if (input.accounting && typeof input.accounting === "object") {
    out.accounting = {
      ...input.accounting,
      candidates: Array.isArray(out.material) ? out.material.length : input.accounting.candidates,
      placements: members.size,
      // NAMED RATHER THAN SILENT: the shard fetches were spent once for the RUN,
      // not once per group, and a per-group figure copied from the whole input's
      // would say this ask paid for them.
      shard_fetches_note: "spent once for the run, before this narrowing",
    };
  }
  // WHICH GROUP THIS ASK IS ABOUT, stated rather than left to be inferred from a
  // one-entry array. The filled record example names the same group, so the two
  // agree by construction.
  out.judging_group = name;
  return out;
}

// ONE CALL PER COMPOSED GROUP (kogaki#1062). The per-group records are ASSEMBLED
// into the typed per-group record the existing validator reads, and that
// validator then runs over the assembly -- so no refusal moves and no validation
// is re-implemented. What changes is the SIZE of one ask and the SCOPE of one
// re-ask, which is the whole of the repair: on 2026-09-09 the whole-input ask
// straddled the 90s per-call bound (two of three attempts exceeded it) while
// `J1_claims`, the smaller judgment over the same input, already spent ~70s of
// it.
//
// A GROUP'S REFUSAL IS RE-ASKED ALONE, to the state's own `retries`, and the
// groups that passed are not re-asked -- kogaki#1060's per-attempt feedback
// applied per group, which is what makes the bound a per-group repair loop
// rather than a whole-run one.
async function invokeJudgePerGroup(cfg, st, retries, inputPath, input, dir, validate, rec, limits) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !Array.isArray(input.groups)) {
    fail(`${st.id}: this state declares \`per_group\`, and the composed input at ${inputPath} carries no `
      + "`groups` array to ask about. The per-group ask is one call per composed group, so an input that "
      + "names no groups is not an input this state can be asked over (kogaki#1062).");
  }
  const groups = input.groups;
  const assembled = {};
  const perGroup = {};
  const judged = [];
  let attemptsTotal = 0;
  let refusalsTotal = 0;
  let callsMade = 0;
  let lastRefusal = null;
  const allRefusals = [];

  // ---- THE ASK IS PREPARED FOR EVERY GROUP FIRST, then run under the cap.
  // Preparing is a narrowing and a file write; asking is a child process. They
  // are separated because only the second is what the pool bounds.
  const asks = groups.map((g) => {
    const name = String(g && g.name);
    const slug = name.replace(/[^a-zA-Z0-9]+/g, "-") || "group";
    const scoped = scopeCompositionInput(input, g);
    if (limits) scoped.limits = limits;
    const scopedText = JSON.stringify(scoped, null, 2);
    // WRITTEN BESIDE THE RUN'S OWN INPUT, so a reader can see exactly what each
    // call was handed rather than reconstructing the narrowing from the whole.
    writeFileSync(join(dir, `terrain-judge-input-${st.id}-${slug}.json`), scopedText + "\n");
    const out = join(dir, `terrain-judge-${st.id}-${slug}.json`);
    // THE STATE'S OWN VALIDATOR, OVER A ONE-KEY RECORD. `validate` iterates the
    // record's keys, so a one-key record validates exactly this group's entry
    // through the shipped reader; what is added here is that the key must be THE
    // GROUP ASKED ABOUT, which the whole-record validator has no way to check
    // because there the key set IS the question.
    const validateOne = (p) => {
      const raw = readJson(p);
      const keys = raw && typeof raw === "object" && !Array.isArray(raw) ? Object.keys(raw) : null;
      if (!keys || keys.length !== 1 || keys[0] !== name) {
        fail(`${st.id} refuses this group's record: it must be the one-key object `
          + `{${JSON.stringify(name)}: {"judged": true, "subgroups": [...]}}. This ask carried exactly one `
          + `composed group, so its answer names exactly that group; the record carried `
          + `${keys ? JSON.stringify(keys) : "no key at all"}, and an envelope around the entry -- or a `
          + `second group this ask never handed over -- is not an answer to the question asked `
          + `(kogaki#1062).`);
      }
      validate(p);
    };
    return { g, name, slug, scoped, scopedText, out, validateOne };
  });

  // ---- THE RECORD ALREADY ON DISK IS TAKEN, AND IT IS VALIDATED FIRST
  // (kogaki#1073). On 2026-09-10 an advance was killed at its bound with eight of
  // eleven per-group records written, and re-answering the gate asked for all
  // eleven again -- so the retry died where the first attempt died, because the
  // remaining work was the same work plus everything already done. What makes the
  // reuse safe rather than a second trust surface is that the record goes through
  // THE SAME VALIDATOR a fresh response gets: a record that fails it is redone,
  // and `judgeAttempts` renames into this name only after validating, so a group
  // cut off mid-write has no file here to be trusted.
  const reused = new Set();
  for (const a of asks) {
    if (!existsSync(a.out)) continue;
    try {
      softRefusals(() => a.validateOne(a.out));
      reused.add(a.name);
    } catch (e) {
      // A REFUSAL MEANS REDO, and nothing else does. Anything that is not the
      // state's own refusal is a fault in this layer and is not swallowed.
      if (!(e instanceof JudgmentRefusal)) throw e;
    }
  }

  // ---- THE CALLS RUN CONCURRENTLY UNDER THE TABLE'S CAP (kogaki#1073). One
  // `judgeAttempts` per group, unchanged -- its bound, its per-attempt feedback
  // and its refusals are a property of AN ASK and are untouched by how many asks
  // are in flight. The pool returns results in the composed input's own order, so
  // every reading below is the order the sequential loop read.
  const results = await runPool(asks, cfg.concurrency, async (a) => {
    if (reused.has(a.name)) {
      // NOT A CALL, AND COUNTED AS ONE NOWHERE. `attempts: 0` is the honest
      // figure: this group's record was judged by an earlier advance, and a run
      // reporting it as an attempt of its own would say a call happened that
      // did not.
      return { ok: true, out: a.out, attempts: 0, refusals: [], lastRefusal: null, reused: true };
    }
    callsMade += 1;
    const r = await judgeAttempts(cfg, st, retries, {
      inputText: a.scopedText, input: a.scoped, out: a.out, validate: a.validateOne,
      label: ` (group ${JSON.stringify(a.name)})`,
    });
    // ---- THE RUN RECORD IS WRITTEN AFTER EVERY COMPLETED PER-GROUP RECORD
    // (kogaki#1073 item 3). The advance's own record used to be written only when
    // the advance ENDED, so an advance killed at its bound left a record saying
    // nothing had happened -- eight finished groups on disk as files and absent
    // from the one carrier a later reader consults. The checkpoint costs one
    // small write per group and is what makes the resume point readable from the
    // run's own record.
    if (r.ok && rec) {
      rec.judge_group_records = rec.judge_group_records || {};
      (rec.judge_group_records[st.id] = rec.judge_group_records[st.id] || {})[a.name] = relFromRepo(a.out);
      checkpointRun(rec);
    }
    return r;
  });

  // ---- THE BOOKKEEPING, IN THE COMPOSED INPUT'S ORDER. Read after the pool
  // rather than inside it, because the refusal below ends the run and which group
  // ends it must not depend on which call happened to finish first.
  for (let i = 0; i < asks.length; i++) {
    const { name } = asks[i];
    const r = results[i];
    attemptsTotal += r.attempts;
    refusalsTotal += r.refusals.length;
    // PREFIXED BY GROUP, because the run record's `refusals` is one flat list and
    // an operator reading eleven groups' refusals needs to know which group each
    // one is about.
    for (const text of r.refusals) allRefusals.push(`group ${JSON.stringify(name)}: ${text}`);
    if (r.refusals.length) lastRefusal = `group ${JSON.stringify(name)}: ${r.refusals[r.refusals.length - 1]}`;
    // `repaired` IS WRITTEN ONLY WHERE THERE WAS SOMETHING TO REPAIR (PR #1065
    // round 1). On the whole-input arm the whole entry is written only when
    // `refusals.length`, so `repaired` there means *was refused and then
    // repaired* -- and a per-group row saying `repaired: true` of a group nothing
    // ever refused makes the flag whose stated job is keeping those two arms
    // apart stop doing it across the two carriers.
    perGroup[name] = { attempts: r.attempts, retries_declared: retries, refusals: r.refusals };
    if (r.reused) perGroup[name].reused = true;
    if (r.refusals.length) perGroup[name].repaired = r.ok;
    if (!r.ok) {
      // THE PARTIAL IS ON THE RECORD BEFORE THE REFUSAL, for the reason the
      // whole-input arm writes its own: `fail()` persists the pending record, and
      // a reader coming back to the run needs to see which groups were judged
      // before the one that spent its bound.
      if (rec) {
        rec.judgment_refusals = rec.judgment_refusals || {};
        rec.judgment_refusals[st.id] = {
          attempts: attemptsTotal, retries_declared: retries, refusal: lastRefusal,
          refusals: allRefusals, repaired: false, groups: perGroup, judged_before: [...judged],
        };
      }
      fail(`${st.id}: the judge's record for group ${JSON.stringify(name)} was refused on all ${r.attempts} `
        + `attempt(s) (${retries} re-ask(s) licensed, the count the workflow table declares for this state). `
        + `${judged.length} of ${groups.length} group(s) were judged before it`
        + `${judged.length ? `: ${judged.join(", ")}` : ""}. The last refusal, verbatim: ${r.lastRefusal}`);
    }
    assembled[name] = readJson(r.out)[name];
    judged.push(name);
  }
  const out = join(dir, `terrain-judge-${st.id}.json`);
  writeFileSync(out, JSON.stringify(assembled, null, 2) + "\n");
  // AND THE WHOLE RECORD'S REFUSALS RUN OVER THE ASSEMBLY. The per-group calls
  // validated their own entries; this is the record the rest of the run reads,
  // and it is validated as a record rather than trusted because its parts were.
  validate(out);
  recordJudgeInvocation(st.id, {
    state: st.id,
    command: cfg.command,
    binary_version: cfg.binaryVersion,
    model: cfg.model,
    stubbed: cfg.stubbed,
    // ONE PER GROUP, and named, because this is the figure the advance bound is
    // derived from and a reader checking that derivation needs the count the run
    // actually made.
    //
    // THE COUNT IS WHAT THIS ADVANCE ASKED, NOT HOW MANY GROUPS THERE ARE
    // (kogaki#1073). With per-group records reused from an earlier advance the
    // two figures come apart, and `groups.length` would report calls this run
    // never made -- the figure the advance's bound is derived from saying the
    // opposite of what the run did. `groups` beside it is still the whole set.
    calls: callsMade,
    groups_declared: groups.length,
    reused_records: reused.size,
    concurrency: cfg.concurrency,
    per_group: true,
    attempts: attemptsTotal,
    retries_declared: retries,
    refusals_repaired: refusalsTotal,
    response_sha: createHash("sha256").update(readFileSync(out)).digest("hex").slice(0, 16),
    at: new Date().toISOString(),
  });
  // AND ON THE RUN RECORD, because that is the carrier that outlives the process
  // (kogaki#1062). `recordJudgeInvocation` fills an in-memory map the subdivision
  // display reads through `judgmentProvenance`; the CALL COUNT is the figure
  // `.claude/hooks/advance-terrain.py`'s bound is derived from, and a reader
  // checking that derivation comes back to a finished run rather than standing
  // inside the process that made the calls.
  if (rec) {
    rec.judge_calls = rec.judge_calls || {};
    rec.judge_calls[st.id] = {
      per_group: true,
      command: cfg.command,
      binary_version: cfg.binaryVersion,
      calls: callsMade,
      groups_declared: groups.length,
      reused_records: reused.size,
      concurrency: cfg.concurrency,
      groups: [...judged],
      attempts: attemptsTotal,
      retries_declared: retries,
      refusals_repaired: refusalsTotal,
    };
  }
  if (rec && refusalsTotal) {
    rec.judgment_refusals = rec.judgment_refusals || {};
    rec.judgment_refusals[st.id] = {
      attempts: attemptsTotal, retries_declared: retries, refusal: lastRefusal,
      refusals: allRefusals, repaired: true, groups: perGroup,
    };
  }
  return out;
}

// The one place a judgment state decides between the record it was HANDED and
// the one it ASKS FOR. An explicit `--<flag>` still wins — that is the fixture
// path, the second-repository path and the owner's own, and it is unchanged —
// and its absence is no longer a refusal but a call.
async function judgedRecordPath(rec, st, table, args, flag, composeInput, validate) {
  if (args[flag] !== undefined) {
    const p = String(args[flag]);
    validate(p);
    return p;
  }
  return await invokeJudge(table, st, composeInput(), rec._dir, validate, rec);
}

export function judgmentProvenance(subdivisionsPath) {
  const invocation = harnessJudgeInvocation();
  return {
    state: invocation ? JUDGMENT_OBSERVED : JUDGMENT_DECLARED,
    // Taken from the bytes on disk BY THIS LAYER. A sha the composer supplied
    // would be one more declaration, which is the whole of what this removes.
    artifact_sha: subdivisionsPath
      ? createHash("sha256").update(readFileSync(String(subdivisionsPath))).digest("hex").slice(0, 16)
      : null,
    invocation,
  };
}

// A record written before this field existed carries no provenance, and the
// honest reading of that is `declared` — an old record cannot show an
// observation it never made. Absent and declared are NOT collapsed elsewhere;
// they are collapsed HERE, once, at the one place the distinction has no
// consequence, so no renderer has to test for `undefined`.
export function provenanceOf(carrier) {
  const p = carrier && carrier.judgment_provenance;
  return p && p.state
    ? p
    : { state: JUDGMENT_DECLARED, artifact_sha: null, invocation: null };
}

// THE DISPLAY'S WRAP COLUMN, and it is TAKEN from the report notice rather
// than minted beside it (kogaki#919). The report's counterpart —
// `judgedEmptyNoticeLines`, transcribed line for line into
// `src/report-format.json`'s `judged_empty_notice_declared` — is hand-wrapped,
// and its widest line is this number. A second number chosen freely here is how
// two surfaces carrying the same provenance content come to wrap at two
// columns; the self-test asserts the notice's own lines still fit inside it, so
// the pair cannot drift apart in silence.
export const DISPLAY_WRAP_COLUMNS = 77;

// Word wrap, with the hanging indent that says a line is a CONTINUATION. The
// terminal is the surface kogaki#317 exists to keep readable under wrapping,
// and a continuation flush against the left margin reads as a new statement —
// the indent is what distinguishes the two by eye, and it is what the grammar's
// `judge_pin_continuation` class keys on, so the allowlist stays specific
// instead of gaining a bare-placeholder member that would admit anything.
//
// A single word longer than the column is emitted OVERLONG rather than broken:
// the tokens that reach this line are a sha in backticks and an invocation id,
// and breaking one would produce a value that cannot be copied.
//
// A `head` IS EMITTED WHOLE ON THE FIRST LINE, however long, and the wrap
// begins after it (PR #921 round 1 finding 1). This is not a convenience: the
// grammar classifies a wrapped line by its FIRST line, and an abbreviated form
// compiles to a PREFIX regex, so whatever the class pins must be text no input
// can push onto a continuation. Wrapping the sentence whole put the pin clause
// — `<model_id> / <effort_tier>.`, composer-supplied and unbounded in length —
// inside the wrappable region, so a model id past roughly 45 characters moved
// the wrap point above it, `line_class_allowlist` returned null and
// `emitOrRefuse` failed the WHOLE `cotag_groups` emit. A display that refuses
// itself on a long pin is worse than the long line this change removes, and no
// fixture reached it because the fixtures carry short ids.
export function wrapDisplayLine(text, columns = DISPLAY_WRAP_COLUMNS, indent = "  ", head = null) {
  const words = String(text).split(/\s+/).filter((w) => w !== "");
  const out = [];
  let line = head === null ? "" : String(head);
  for (const w of words) {
    if (line === "") { line = w; continue; }
    if (`${line} ${w}`.length <= columns) { line = `${line} ${w}`; continue; }
    out.push(line);
    line = indent + w;
  }
  if (line !== "") out.push(line);
  return out.length ? out : [""];
}

// THE JUDGE LINE, composed ONCE for both owner surfaces (the SubGroup threshold, the report identity). Two
// renderers each writing their own sentence is how the display and the report
// would come to say different things about the same record — the second-carrier
// shape this file refuses everywhere else.
export function judgePinLine(pin, prov) {
  const p = prov || { state: JUDGMENT_DECLARED, artifact_sha: null, invocation: null };
  const seen = p.artifact_sha
    ? `the --subdivisions record it read, sha \`${p.artifact_sha}\``
    : "no --subdivisions record at all";
  // BOTH ARMS WRAP, by one rule (kogaki#919 acceptance 2). The observed arm was
  // unreachable when that rule was written, and wrapping only the arm a run
  // could then produce would have left the divergence standing for whenever a
  // producer appeared — the amend-it-later shape this file refuses. kogaki#1030
  // is that producer, and the rule needed no amendment to meet it, which is the
  // whole of what writing it that way bought.
  //
  // THE PIN CLAUSE IS THE HEAD, on both arms, and that is what keeps a long
  // composer-supplied `model_id` from moving the text the grammar classifies
  // on (PR #921 round 1 finding 1). Each form below abbreviates at exactly the
  // head's end and NOT one space later: a form ending `<effort_tier>. …`
  // demands a further word on the first line, which is the same length
  // dependency in a costume.
  if (p.state === JUDGMENT_OBSERVED) {
    return wrapDisplayLine(`the Harness holds its own `
      + `invocation record \`${p.invocation.id}\`, taken over ${seen} (SPEC-terrain, the SubGroup threshold, the report identity)`,
    DISPLAY_WRAP_COLUMNS, "  ",
    `judged by ${pin.model_id} / ${pin.effort_tier} — OBSERVED:`).join("\n");
  }
  return wrapDisplayLine(`The Harness invoked no judge and holds `
    + `no invocation record, so this names what the composer says judged this split rather than something the `
    + `Harness saw happen; what it did observe is ${seen} (SPEC-terrain, the SubGroup threshold, the report identity — a judged surface with no `
    + `judge pin is the drift-undetectable shape; kogaki#892 — a declaration is not rendered as an observation)`,
  DISPLAY_WRAP_COLUMNS, "  ",
  `judge pin DECLARED — ${pin.model_id} / ${pin.effort_tier}.`).join("\n");
}

// THE REPORT'S JUDGE LINE, composed ONCE (kogaki#918). It sits beside
// `judgePinLine` rather than inside it: the display and the report are two
// surfaces with two sentences by the report identity's own arrangement, and folding them
// would make one of them say what the other's reader needs. What it does share
// is the rule — one composer per surface, so a renderer cannot come to say two
// things about one record.
//
// THREE ARMS, and the third is what #918 adds. A `none` pin is the ABSENCE of
// a pin, not a declared one, so a provenance clause reading `pin DECLARED`
// against it asserts a declaration nobody made — the same class kogaki#892
// closed one step over (a declaration rendered as an observation), arriving in
// the change that closed it.
//
// AND THE CLAUSE NAMES THE RECORD, never the run. It used to open `observed:`,
// which reads as a fact about the act that produced the line — and the
// idempotent-rerun path re-renders a PRIOR record through this same function,
// so a rerun that DID pass `--subdivisions` rendered a pre-#892 record as
// `observed: no subdivisions record`: true of the record, false of the run,
// with nothing in the line saying which. The repair is made here, at the one
// composer both paths reach, rather than at the rerun site — a second sentence
// for the second path is exactly the divergence this arrangement refuses.
export function reportJudgeLine(identity, prov) {
  const p = prov || { state: JUDGMENT_DECLARED, artifact_sha: null, invocation: null };
  const held = p.artifact_sha
    ? `subdivisions record sha \`${p.artifact_sha}\``
    : "no subdivisions record";
  if (identity.judge_pin === NO_JUDGE) {
    return "*Judge:* `none` — this report names no judge, so there is nothing here to attribute "
      + `to one; the record holds: ${held}`;
  }
  const pinText = `\`${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}\``;
  return `*Judge:* ${pinText} — ${p.state === JUDGMENT_OBSERVED
    ? `OBSERVED, Harness invocation record \`${p.invocation.id}\`, over ${held}`
    : `pin DECLARED, no Harness invocation record; the record holds: ${held}`}`;
}

// THE JUDGED-EMPTY NOTICE (kogaki#892 acceptance 2). Below the threshold a
// judged-empty outcome is conformant and renders; at or above it the pre-render
// refusal in `cmdReport` has already fired, which is why the size scoping this
// acceptance names is enforced upstream rather than re-tested here — a second
// size test would be a second carrier for one threshold.
export function judgedEmptyNoticeLines(prov) {
  if ((prov || {}).state === JUDGMENT_OBSERVED) {
    return ["*The judgment produced NO split — this is a judged-empty outcome,",
      "not an absent judgment. Members are listed below.*"];
  }
  return ["*NO SPLIT IS RECORDED for this group. The subdivisions record declares a",
    "judgment that produced none; the Harness invoked no judge and holds no",
    "invocation record, so it cannot show that a judgment RAN and does not say",
    "one did (kogaki#892). This is still not an absent record: `[]` and an absent",
    "key stay different states. Members are listed below.*"];
}


// The shard, parsed WHOLE. `parseGlossShard` above returns the first sentence
// because a display row is a headline; the Full Report forbids truncation anywhere, so the
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
    // no cap, no ellipsis, because the Full Report forbids truncation anywhere.
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
// (kogaki#163 lever 3; SPEC.md, the rendering rule's "Tag-scoped and bounded — one shard pair
// per viewed tag", and GroupClaim-first rendering's silence on the composer's input).
//
// WHAT THIS FIXES, measured rather than argued. Dogfood run 2026-08-07, tag
// `architecture`: 70 Lessons, 11 co-tag groups, 131 placements, ~19 minutes
// between the survey record write and the last Full Report write. The runtime
// was never the cost — re-running `cotags` read-only over the same record
// renders instantly — the cost was COMPOSITION, and it grew in the wrong
// quantity: the composer reached for each group's material once per group, so
// 70 Lessons cost 131 reads. The material a group needs is a subset of the
// material the TAG's shard pair already carries, and that pair is already the rendering rule's
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
// composer's (GroupClaim-first rendering leaves it there) and the coherence label stays the judge's
// (semantic subdivision); this hands over material and the group structure, and no verdict.
// --------------------------------------------------------------------------
export const COMPOSITION_INPUT_BOUND =
  "one tag-scoped served Gloss shard pair, fetched once for the run (SPEC.md, the rendering rule)";

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
        // Untruncated, exactly as the Full Report serves it: the composer judging a
        // SubGroupClaim's coherence against its parent's is the reader semantic subdivision
        // addresses, and a headline-only input would decide that verdict by
        // what the bound withheld. A missing rendering is MARKED
        // and never substituted (the rendering rule), at this layer as at every other.
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
    // THE COMPOSITION PIN (the open-questions section, v10, kogaki#212). The claim composer copies this
    // into its claims artifact, and `cotags` refuses claims whose members are
    // not a SUBSET of what it covers — which is what makes composing from the
    // whole survey unproducible rather than merely discouraged.
    //
    // IT CARRIES THE SERVED MEMBER SET, NOT A DIGEST, and that correction is
    // the whole of why the guard can do its job. A digest supports EQUALITY,
    // not subset, and can name no offender — so it could not deliver the
    // refusal the open questions states, which names the members that fall outside. The
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

  // Memoized per kind, so the "fetched once for the run" half of the rendering rule's bound is
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
  // OBSERVED AND RETURNED, like `cmdSurvey` and the two renderers beside it: the
  // caller records the path this act actually wrote rather than re-deriving the
  // filename from the tag (kogaki#1030).
  const composedInputPath = out;

  const a = input.accounting;
  console.log(`Composition input (bounded): ${out}`);
  console.log(`Bound: ${COMPOSITION_INPUT_BOUND}.`);
  console.log(`Reads: ${a.shard_fetches} served-material fetch(es) for ${a.candidates} candidate(s) across ${a.placements} placement(s) in ${input.groups.length} group(s) — the read count is bounded by the CANDIDATES and does not grow with the placements.`);
  console.log(`${denominator(a.candidates, record.candidates.length)} carry ${tag}; ${strandFigure(familySplit(members.map((c) => c.id), record.candidates))}.`);
  if (a.abnormal) {
    console.log(`ABNORMAL: ${a.abnormal} served Gloss rendering(s) are missing. This is a fault to clear on the served surface, not a tolerated gap, and nothing was substituted for it (SPEC.md, the rendering rule).`);
  }
  console.log(`Compose EVERY GroupClaim and EVERY SubGroupClaim from this one artifact: \`material\` is keyed by member id and \`groups\` carry ids only, so a member in several groups is read once, and no group has per-group material to re-read.`);
  console.log(`Classification: REPORT (SPEC.md, the second-proposer boundary) — it ranks nothing, narrows nothing and hides nothing. It composes no claim and judges nothing: the claim wording stays the composer's (GroupClaim-first rendering) and the coherence label the judge's (semantic subdivision).`);
  console.log(`Machine-local run workspace, never committed (founding spec rider 3).`);
  console.log(`\nNext: cotags --survey ${String(args.survey)} --tag ${tag} --claims <F> [--subdivisions <F> --judge-model M --judge-effort E]`);
  return composedInputPath;
}

// Where the machine RECORD lives (location and naming v11). A record is machine-facing and
// the run workspace is its legitimate home — the owner ruling moved the
// RENDERING, not this. A STABLE home rather than a per-invocation directory,
// because the report identity's first case — same identity, run twice, ONE report — is a
// claim across invocations and a timestamped directory would make every rerun
// a duplicate by construction.
// PURE, and split from the preparing call for the same reason
// `renderingDestination` is (PR #702 round 1, finding 2): a caller that wants
// to know WHERE the record store is must not create it, and a fixture case
// asserting the default must not leave a directory behind in the tree.
function reportsDestination(args) {
  return args["report-dir"] || process.env.KOGAKI_RUN_DIR
    || join(laneDir("terrain"), "reports");
}

function reportsDir(args) {
  // location and naming v11's own table gives the record's home as the RUN WORKSPACE, and
  // kogaki#234 acceptance 4 retires `~/.kogaki/reports/` outright. The v11
  // amendment moved the RENDERING and left this default naming the directory
  // the issue removes — so with no KOGAKI_RUN_DIR a real run still wrote the
  // retired path (PR #240 review round 1, finding 1).
  //
  // kogaki#750 moves the default again, out of the home directory entirely and
  // into `runs/terrain/reports/`. It stays a STABLE home and is the one entry
  // the lane's prune never removes — the report identity's same-identity-run-twice-is-ONE-
  // report claim is a claim ACROSS runs, and an entry inside a keep-last-K
  // window would falsify it on the K+1th run rather than at a review point.
  const dir = reportsDestination(args);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// The retired directory, disposed of rather than left to rot (acceptance 4).
//
// kogaki#750 retires the PARENT — no lane writes anywhere under `~/.kogaki` any
// more — and widening this `rmSync` to that parent was DECLINED rather than
// overlooked: #234 licensed removing one directory this repository had written,
// and removing a whole home-directory tree on every survey run is a larger act
// than the one licensed, on a path no check of this repository can see. The
// owner deleted the legacy contents by hand on 2026-09-01, so the widening
// would also have nothing left to remove on the machine that motivated it.
// Reports are idempotently regenerable (the report identity), so there is nothing to migrate
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
    + "idempotent (SPEC-terrain, the report identity) — rerun to regenerate at the new locations.");
}

// Where the OWNER RENDERING lives (location and naming v11, kogaki#234). The working tree,
// because a Full Report is what the owner reads to think a Thesis through and
// `specs/SPEC.md`, "Human-facing files live where the human works", rules that a
// machine-local hidden directory DECLARES a
// file machine-facing. Terrain was in a failed state under that rule until this
// existed.
//
// The discriminator is LIFETIME, never format: a run workspace holds things
// whose lifetime is the RUN, the tree holds things whose lifetime is the
// OWNER's — the discriminator is LIFETIME, not format or audience-in-principle. Defaulting to the repository root rather than to cwd is
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

// location and naming v12 (owner ruling 2026-08-14): the tree holds EXACTLY ONE owner
// rendering — `FullReport.md`, overwritten on every pull. An identity-named
// `terrain-full-report-<digest>.md` in the tree is the machine register's
// naming reaching the owner surface — the defect the no-hidden-path owner-surface rule states by
// LOCATION, arriving by NAME — so any file so named is retired on sight, with
// one line saying so (the same disposal discipline as `retireLegacyReportsDir`:
// never silently). Nothing is lost: the rendering is a pure function of the
// machine record (the report identity), which keeps identity and coexistence in the run
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
  console.log(`retired ${stale.length} identity-named rendering(s) (SPEC-terrain, location and naming v12): `
    + "the tree holds ONE owner rendering, FullReport.md — identity lives in the machine "
    + "record, and reports are idempotently regenerable (the report identity).");
}

// The owner surface prints a REPO-RELATIVE path — no owner-facing output prints a hidden path: no owner-facing
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

// THE OWNER SURFACE'S ARTIFACT LINES, IN ONE PLACE (the no-hidden-path owner-surface rule; location and naming, v11).
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
    console.log(`Full Report — READ THIS ONE (owner rendering, SPEC.md, location and naming): ${relFromRepo(rendered)}`);
    console.log("ONE rendering file, overwritten per pull (SPEC-terrain, location and naming v12) — identity "
      + "and coexistence live in the machine record, never in the tree.");
  }
  // The record is machine-facing, so the owner surface names its FILENAME and
  // says where the class of thing lives; the full path is debugging output and
  // rides KOGAKI_DEBUG.
  if (process.env.KOGAKI_DEBUG) {
    console.log(`machine record (JSON, identity + idempotence; SPEC.md, the report identity): ${recordPath}`);
  } else {
    console.log("machine record written (JSON, identity + idempotence; SPEC.md, the report identity) "
      + `as ${basename(recordPath)} in the run workspace. Set KOGAKI_DEBUG=1 for its path.`);
  }
}

// THE CoTagGroups OWNER RENDERING (kogaki#434; implemented under
// kogaki#464 after #434 closed without it).
//
// The runtime WRITES this rendering, and the single producer rule's removal of the relay as a
// producer is why: the channel this repository is operated through displays a
// tool call's stdout TO THE MODEL and not reliably to the owner — it collapses
// to a one-line summary — and retyping is prohibited (the single producer rule) while a question
// UI is prohibited after tag selection (the post-tag-selection window). What model composition produced
// was not silence but a FALSE CLAIM OF SUCCESS, which reads as delivery.
//
// THE NAME IS A LITERAL joined onto the renderings directory, exactly as
// `FullReport.md` is, so a second rendering name is UNWRITABLE RATHER THAN
// DETECTED — the constrain-side answer what is not carried names in its own
// what-is-not-carried list. Every display renders through here; there is no
// second path and no caller-supplied name.
//
// location and naming v12's "exactly one owner rendering" is SCOPED TO FULL REPORT
// RENDERINGS, and this display is a SECOND owner-rendering class with
// its own count of exactly one: overwritten per render, never accumulated. The
// invariant location and naming v12 actually protects — no accumulation, no machine-register
// naming on the owner surface — holds for both, which is why this is a scoping
// and not a repeal.
// THE NAVIGATION HINT, one literal shared by the emitter and asserted against
// the grammar (kogaki#665). Its previous form named `view --survey <F> …` —
// the entry point this issue REMOVES — so under REFUSE the emitter would have
// had to print a removed subcommand or refuse. `report-format.json`'s
// `navigation_hint` form is amended to match, deliberately and on this
// issue's licence, never to make a refusal go away.
export const NAVIGATION_HINT =
  "Navigation (narrows nothing): name a tag in chat — the executor advances on the owner's word.";

export const DISPLAY_RENDERING = "CoTagGroups.md";

// WRITE AUTHORITY, CARRIED AT THE WRITE (SPEC-terrain, write authority v28, kogaki#681,
// successor to #680). Write authority's title — "owner artifacts are written only from
// writing states" — was carried by nothing: `cotags` and `report` stayed live
// dispatcher cases calling the same renderers, so a session could mint
// `reports/CoTagGroups.md` or `reports/FullReport.md` out of order, with no run
// record. #680's disposition ("they cease to exist as entry points") was
// REFUTED by observation at #681: the executor re-surveys live rather than
// accepting a fixture, `compose_input` crosses the served-material seam, and
// `J1_claims` is non-conditional — so the 34 composition-check sites that drive
// these two commands could not be migrated, and the claimless display the display's serve rule
// requires is unreachable through `run` at all.
//
// SO THE REFUSAL BINDS THE WRITE AND NOT THE ENTRY POINT. The commands survive
// as COMPOSITION routes; what they cannot do is land an owner artifact. The
// discriminator is the RESOLVED destination, never a flag and never an env
// var's presence — the non-flow utilities forecloses a debug-only escape ("a retained generator
// regenerates what a ban forbids"), and a route whose refusal could be
// switched off would be exactly that. A caller that redirects elsewhere writes
// no owner artifact by that section's own lifetime rule, which is why the check suite's
// throwaway-directory runs are unaffected rather than exempted.
//
// WHAT THIS DOES NOT CLAIM, stated because the superseded prose overclaimed in
// exactly this direction: the composition remains callable out of order. The
// property carried here is the one in the section's title, and write authority now says
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
  fail(`${artifact} is an OWNER ARTIFACT and is written only from a writing state of the workflow table (SPEC-terrain, write authority, kogaki#681). `
    + `This call reaches ${relFromRepo(resolve(dir))} from outside the executor, so it would land an owner surface belonging to no run record. `
    + "Drive it through the executor — `run --run-dir <D> …` — which reaches the same renderer from the state the table binds it to. "
    + "The composition itself is not refused: render into a run-scoped location and the write proceeds, because a rendering whose lifetime is the run is not an owner artifact.");
}

function writeDisplay(args, text) {
  // REFUSED BEFORE THE DESTINATION IS PREPARED, not after (PR #702 round 1,
  // finding 2). `renderingsDir` mkdirs and retires; the guard reads the pure
  // destination so an unauthorized act touches nothing at all.
  refuseUnauthorizedOwnerWrite(renderingDestination(args), DISPLAY_RENDERING);
  const path = join(renderingsDir(args), DISPLAY_RENDERING);
  writeFileSync(path, text.endsWith("\n") ? text : text + "\n");
  return path;
}

// THE ONE PRIVATE DISPLAY WRITER (write authority, kogaki#665). Every state whose
// `writes` field names the display artifact goes through here, and the GRAMMAR
// COMES FROM THE CALLING STATE rather than from the artifact path — three
// states share one file, and `report-format.json` declares a separate surface
// for each, so a writer that inferred the grammar from `CoTagGroups.md` could only
// ever enforce one of the three.
//
// WHAT THIS REMOVES, which is the point rather than a tidy: `cmdView` used to
// call `writeDisplay` DIRECTLY, with no `emitOrRefuse` anywhere on its path —
// so the two listing surfaces had declared grammars that nothing on the
// write path enforced. An earlier form admitted two writers; write authority supersedes it with
// one, and this is that one. The refusal gates the WRITE and not only a print,
// because `emitOrRefuse` takes the write as a callback: there is no path here
// that emits first.
//
// AND THE PRINT IS INSIDE THE CALLBACK TOO (PR #667 round 2, carried to
// kogaki#625). All three display states printed the text and THEN called this,
// so the sentence above was true of the write and false of the terminal — the
// property "a nonconformant display reaches neither the owner's terminal nor
// their artifact" had quietly become a property of the artifact alone. The single producer rule
// puts the owner's reading on the artifact, so the ratified guarantee was
// intact and only its stated reach was overclaimed; the repair is to make the
// sentence true again rather than to narrow it, because a comment asserting a
// structural property the code no longer has is how the next edit loses it for
// real. One printer, one writer, one callback, one refusal.
function writeDisplaySurface(args, surface, text) {
  // BEFORE THE PRINTER, NOT ONLY BEFORE THE WRITE (write authority v28, kogaki#681).
  // `writeDisplay` carries the same refusal as the writer's own guard, but the
  // printer runs first inside the callback below — so siting the check only
  // there put the refused display on the owner's terminal and then declined to
  // file it. That is the exact half-property PR #667 round 2 repaired for the
  // grammar refusal ("a nonconformant display reaches NEITHER the owner's
  // terminal nor their artifact"), re-broken by a second refusal added at the
  // wrong end of the same callback. Two call sites, one property: this one
  // binds the printer, `writeDisplay`'s binds any future caller of the writer.
  refuseUnauthorizedOwnerWrite(renderingDestination(args), DISPLAY_RENDERING);
  let path = null;
  emitOrRefuse(surface, text, (conformant) => {
    console.log(conformant);
    path = writeDisplay(args, conformant);
  });
  // Unreachable: `emitOrRefuse` either runs the callback or fails the process.
  return path || fail(`${surface} produced no artifact path`);
}

// THE HAND-OVER'S FLOOR, and only its floor. Writing the artifact is NOT
// delivery: a run that writes `reports/CoTagGroups.md` and tells the owner nothing
// produces exactly the owner-visible state kogaki#434 was filed against.
//
// THE DESIGN CONTENT THIS WAS IMPLEMENTED AGAINST, COPIED HERE RATHER THAN
// CITED (owner ruling 2026-09-05, kogaki#857). A section number is not a stable
// name and carries no authority over code; a spec may be rewritten or deleted
// and this function must keep working against what it was built for. So the
// rule it implements is stated here in full, and propagating a later design
// change into this code is a separate, explicit act:
//
//   the hand-over floor  — the rendering reaches the owner as the first act
//   after the command returns, and the object of that act is the artifact,
//   NAMED. Handing over nothing is a failure. The floor binds the HAND-OVER
//   and never the write.
//
//   one rendering per class — exactly one CoTagGroups file exists, overwritten
//   per render, the same count the Full Report's rendering carries.
//
// What this function does is name the artifact. WHICH FORM the relay's own
// hand-over takes — a pointer, an `!`-command, a file-send — is non-normative
// and is deliberately not decided here: a runtime that printed one prescribed
// form would re-import the harness binding the ruling removed.
function announceDisplay(path) {
  console.log(`CoTagGroups — READ THIS ONE (owner rendering): ${relFromRepo(path)}`);
  console.log("ONE CoTagGroups file, overwritten per render — one owner rendering per class.");
}

// The owner register (location and naming v11). Markdown, because the artifact's whole job is
// to be READ — the JSON beside it keeps every machine property, so nothing here
// is load-bearing for identity and nothing may parse it back.
// the Thesis candidates — the section this register renders (kogaki#760).
//
// THE ABSENT CASE RENDERS THE SECTION AND SAYS IT IS EMPTY, which is the
// fallback CHOSEN at the gate rather than inherited from the code. The three
// candidates were: refuse the render, omit the section, or disclose. Omitting
// makes "no candidates were composed" and "this section does not exist"
// indistinguishable to the owner, which is the silence the neighborhood section's shape already refuses
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
  candidates.forEach((c) => {
    // THE ID IS READ, NOT MINTED (kogaki#861). It used to be minted here from
    // the loop index, which made the render the place a TC id came into
    // existence — and J3's judgment record now names one, so a target could
    // only be checked against ids that did not yet exist. `readThesisCandidates`
    // mints them, before the neighborhood is judged; this section renders what
    // that reader fixed. A candidate arriving here without one is a caller that
    // bypassed the reader, and re-minting from the index would silently paper
    // over exactly the ordering question the move exists to settle.
    L.push(`- ${c.id || fail("a Thesis candidate reached the Thesis candidates section with no minted id. Ids are fixed by readThesisCandidates before J3_neighborhood judges (kogaki#861); a candidate composed past that reader has an id nothing checked a neighborhood target against.")} — ${c.claim}`);
    L.push(`  strands: ${c.strands.join(", ")}`);
  });
  L.push("");
  return L;
}

// THE PRE-#861 REPLAY GUARD, PURE AND EXPORTED (PR #923 round 1, finding 2).
// It lives here rather than inline in `cmdReport` for the reason every other
// predicate in this file was split out: `cmdReport` reaches the seam, so a
// fixture that can only call the command cannot state this property, and a
// guard whose failing path no case can reach is one nobody can show works.
//
// WHAT IT ANSWERS: thesis candidate ids were minted at RENDER time until
// kogaki#861 moved the mint into `readThesisCandidates`, so a record stored
// before that move carries candidates with no `id` — and `thesisCandidatesSection`
// now refuses one, naming "a caller that bypassed the reader" when the true
// cause is a record predating the field. Replaying such a record would fail a
// rerun that has done nothing wrong, which is exactly the treatment the
// `priorPredatesJudgmentKey` clause declines two clauses up. Recomputing mints
// the ids through the reader, which is where they now come from.
export function priorPredatesCandidateIds(prior) {
  return Array.isArray(prior && prior.thesis_candidates)
    && prior.thesis_candidates.some((c) => !c || !c.id);
}

// THE WHOLE REPLAY DECISION, not just its new conjunct — and the widening is
// the repair rather than tidiness. The first cut of this fix exported the
// predicate alone and asserted it, and the mutation that DROPPED the conjunct
// from `cmdReport`'s condition left the fixture GREEN: the case bound the
// predicate and the defect lived at the call site, which is the same
// binds-a-proxy shape this sitting's own emission names one layer over. A case
// can only bind the decision if the decision is the thing it calls, so the
// condition moves here whole and `cmdReport` asks it rather than composing it.
//
// The two predating guards are stated as one function and not two because they
// are one rule: a stored record that cannot be shown idempotent is RECOMPUTED
// — never replayed, and never refused, since refusing would fail a rerun that
// has done nothing wrong.
export function shouldReplayPrior(prior, identity, sameIdentityFn = sameIdentity) {
  const predatesJudgmentKey = !!(prior && prior.identity
    && prior.identity.neighborhood_judgment === undefined);
  return sameIdentityFn(prior && prior.identity, identity)
    && !predatesJudgmentKey
    && !priorPredatesCandidateIds(prior);
}

export function renderReportMarkdown(report, tag) {
  const L = [];
  const i = report.identity;
  // the Full Report v7 — the title names the TAG, never an id. A report may span several
  // entered ids, so no single GroupID identifies it; the entered set rides
  // `*Selections:*` in the identity block, where the report identity already puts the
  // recorded components. Kept short deliberately: five ids in a title wrap, on
  // the surface kogaki#317 exists to keep readable under wrapping.
  L.push(`# Full Report — ${tag}`);
  L.push("");
  L.push(`*Selected tag:* \`${tag}\`  `);
  L.push(`*Selections:* ${(i.query.ids || []).join(", ")}  `);
  L.push(`*Substrate pin:* \`${i.pin}\`  `);
  // the report identity's third component, AND WHAT THE HARNESS OBSERVED OF IT (kogaki#892).
  // The pin alone read as a fact the Harness stands behind; the provenance
  // clause is what separates a pin the composer declared from a judgment an act
  // was seen to perform. Read through `provenanceOf`, so a report record written
  // before the field existed renders `declared` rather than crashing or, worse,
  // rendering as though it had been observed.
  L.push(reportJudgeLine(i, provenanceOf(report)));
  L.push("");
  L.push("> Untruncated. This report ranks nothing, narrows nothing and hides");
  L.push("> nothing (SPEC-terrain, the second-proposer boundary, the Full Report). It is a RENDERING, not an address:");
  L.push("> article material is quoted from served renderings at pins, never");
  L.push("> from a report.");
  L.push("");
  // the Thesis candidates — THE THESIS CANDIDATES SECTION (kogaki#760, owner ruling
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
  // the second-proposer boundary promises this surface never does.
  L.push(...thesisCandidatesSection(report.thesis_candidates));
  // The singular `## Group claim` block is GONE (the Full Report v7): a report may span
  // several ids, so there is no one group whose claim heads the file. Each
  // section carries its own claim under its own heading.
  // the Full Report v7 — ONE SECTION PER ENTERED ID, keyed by the id. What repeats is the
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
      // the report identity v9's three states, unchanged by the multi-section form: a
      // judged-empty outcome and a SUPPRESSED split are not the same silence,
      // and neither is an absent judgment.
      if (sec.suppressed_split) {
        L.push("*The judgment produced a split and it was SUPPRESSED: its only named");
        L.push("SubGroup was labelled `other` — the residual, so the judge found no");
        L.push("subset of M or more members at loose-or-better affinity among them —");
        L.push("so it bought nothing and");
        L.push("does not discharge the subdivision obligation (SPEC-terrain, the SubGroup threshold v7,");
        L.push("re-keyed and bounded at kogaki#683, relabelled at kogaki#738). This is neither");
        L.push("a judged-empty outcome nor an absent judgment. Members are listed below,");
        L.push("and none was dropped.*");
      } else {
        // kogaki#892 acceptance 2 — a judged-empty outcome is rendered as
        // "no split recorded" unless the Harness can show the judgment ran.
        L.push(...judgedEmptyNoticeLines(provenanceOf(report)));
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
  // the neighborhood as a report v20 / the Full Report v8 (kogaki#473) — the provenance neighborhood, ONCE and
  // LAST. Conditional on the record carrying one: a record written before
  // this section existed renders without it — the ordinary
  // spec-ahead-of-code interval the report identity names, read here from the record's own
  // shape rather than guessed. A NEW pull always carries the field, empty
  // enumeration included (the neighborhood section's shape's disclosure: an empty result renders its
  // explicit lines, never an absent section).
  if (report.neighborhood) {
    L.push("");
    L.push(...neighborhoodSection(report.neighborhood));
  }
  return L.join("\n") + "\n";
}

// THE MEMBER → SERVED-LINE MAP, SITED ONCE AT THE REPORT'S END (the Full Report, line 805).
//
// This is the baseline's own siting — *"the shared pin stated once in the Full
// Report, with the member → served-line map at the report's end"*
// (wa#1115/#1116) — and until story 1.53 the renderer satisfied the Full Report by putting
// a `*Served line:*` row on every member instead. That per-member form is what
// kogaki#318 called the second name-shaped row, and the owner's story-1.53 SQ2
// ruling removed it.
//
// So the map MOVES rather than disappearing, and both halves matter: the display-ID rule
// takes element NAMES off the owner surface, while the Full Report keeps the ADDRESS the
// report is accountable to. A cite is an address — it is what lets a reader
// check the report against the substrate — and dropping it from the rendering
// entirely would have made the owner rendering uncheckable without opening the
// machine record, which is a different decision from the one that was made.
//
// A member with no display_id or no cite is NAMED here rather than omitted:
// a map that silently skips its unmappable rows is the shape the placement cover forbids.
// THE PIN IS STATED ONCE, IN THE IDENTITY — so every other cite renders BARE
// (the Full Report v12, kogaki#315, story 1.56 AC5/AC6).
//
// A served cite arrives as `<file>:<line>@<pin>`; the `@<pin>` half is the
// substrate pin repeated. On a two-member report that was six pin-bearing
// lines where the Full Report registers one, and story 1.53 did not fix it — it moved the
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
  // MERGED ACROSS SECTIONS AND DEDUPED (the Full Report v7, kogaki#314). The map is sited
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

// ONE MEMBER, WHOLE (the Full Report). The record carries six served fields per member —
// `id`, `cite`, `gloss`, `gloss_cite`, `journey_gloss`, `journey_cite` — and
// this is the surface the Full Report addresses when it says "the complete Lesson and
// Journey Glosses, with no truncation anywhere" and that the report "carries
// the member → served-line map in its member records".
//
// THE DEFECT THIS REPLACES. The previous renderer emitted `\`id\` — gloss` and
// dropped the other four. The live dogfood run of 2026-08-08 (kogaki#234
// comment 5223800169) found `grep -c "gloss/lessons/"` returning ZERO over
// every file in `reports/`, no Journey Gloss text anywhere, and a file that
// opened with `> Untruncated.` and printed `- journey: 1` in its Counted block
// while containing no journey. That is the kogaki#243 form-E shape exactly:
// the prose asserted a property no carrier held, and every assertion under the report identity
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
// silence — the same rule the report identity v9 applies to judged-empty SubGroups. Without
// it the Counted block's `journey: N` has nothing in the body to agree with,
// which is how the run above produced a count with no material behind it.
export function memberBlock(m, level) {
  const h = "#".repeat(Math.max(1, Math.min(6, level || 3)));
  // A non-object member is a malformed record, and it renders as that rather
  // than as its own string value — printing `String(m)` here was the one path
  // by which a bare `lesson:<slug>` could still reach the owner rendering
  // (the display-ID rule).
  if (!m || typeof m !== "object") return [`${h} ${NO_DISPLAY_ID}`, ""];
  // the display-ID rule (story 1.53) — the heading is the plain display_id. It is read from
  // the member, which `reportMembers` fills from the survey record's candidate
  // entry; a member with none renders the ABNORMAL token and NEVER the slug,
  // because the slug is exactly what the display-ID rule removes and a silent fallback would
  // undo the change while looking like robustness.
  const L = [`${h} ${m.display_id || NO_DISPLAY_ID}`, ""];
  // THE `*Served line:*` ROW IS GONE, and this is the owner's answer to story
  // 1.53 SQ2 rather than an omission. kogaki#318 called the heading and this
  // row "two name-shaped rows where the owner ruled one plain ID suffices",
  // and the pair reading is the one that was chosen. Nothing is lost: the cite
  // stays in the machine record beside the full identity quadruple (AC6,
  // location and naming v11, widened at kogaki#741), which is where a reader who needs the address goes. The Gloss cite
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

// The identity QUADRUPLE (the report identity, widened from the triple at kogaki#741):
// substrate pin, co-tag query (selected tag, named group), judge pin, and the
// neighborhood judgment record — the last two typed `none` where no judged
// material is present. UNIFORM ARITY: `none` is a value that must be present, never an
// omitted component, because a key whose shape depends on the report's own
// content is one a request cannot construct.
// the Full Report v6 (kogaki#314) — the query component is `{ tag, ids }`, the ids
// CANONICAL. Idempotence is set-based: two typings of the same set in
// different orders are ONE artifact, which is what makes a re-request return
// the same report rather than a second one.
export function reportIdentity(pin, tag, ids, judgePin, neighborhoodJudgment) {
  return {
    pin,
    query: { tag, ids: canonicalIds(ids) },
    judge_pin: judgePin || NO_JUDGE,
    // THE FOURTH COMPONENT (the report identity, kogaki#741). The digest of the neighborhood
    // judgment record this report was rendered from, or the typed `NO_JUDGE`
    // where none was supplied. Typed-and-present rather than omitted, exactly
    // as `judge_pin` is: the report identity's uniform arity means a requester forms the key
    // from inputs it holds, never by hashing the report it is addressing.
    neighborhood_judgment: neighborhoodJudgment || NO_JUDGE,
  };
}

// The filename is derived from the identity ONLY so that reruns collide on
// disk. Nothing reads it: location and naming makes the recorded components the sole source
// of identity, and this hash is not parsed back anywhere.
function identityDigest(identity) {
  return createHash("sha256")
    .update(JSON.stringify(reportIdentityKey(identity)))
    .digest("hex").slice(0, 16);
}

// THE COMPOSED-INPUT DIGEST (the report identity, kogaki#700). The identity names the substrate
// pin, the query and the judge pin — and NOT the composed inputs, which the report identity
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
// `neighborhood` LEFT THIS SET at kogaki#741 and is now KEYED, per the report identity's
// quadruple. The rest stay RECORDED — kogaki#700's arm is untouched for them,
// and `COMPOSED_INPUT_MISMATCH` still fires on a changed `--claims`. The
// discriminator is membership: a claims or subdivisions record changes what a
// group SAYS about members the query already fixed, while the judgment record
// decides WHICH CANDIDATES ARE DISPLAYED AT ALL.
// `thesis-candidates` JOINED THE SET AT kogaki#927, and it joined the RECORDED
// half rather than the identity because the report identity's own
// discriminator puts it there: the claims and subdivisions change what a
// section SAYS about members
// the query already fixed, while the neighborhood judgment decides WHICH
// CANDIDATES ARE DISPLAYED AT ALL. An edited candidates file changes the
// Thesis candidates' claim text and strand picks, and the `serves: … for
// TC<n>` rows that join
// against them — what the report says, never who is in it. So it is RECORDED,
// and `COMPOSED_INPUT_MISMATCH` is what a rerun at the same identity with an
// edited file now meets.
//
// WHAT THE OMISSION COST, kept because the failure reported SUCCESS. The flag
// decided the artifact while sitting in neither the identity nor this list, so
// a same-identity rerun with an edited file took the replay branch, found an
// empty delta, re-rendered the PRIOR record's Thesis candidates section, and
// printed that the rerun was idempotent — rendering a candidate list the
// invocation did not
// supply, and returning before `refuseTargetsOutsideCandidates` could see it.
// kogaki#861 raised the cost rather than creating it: every row judged under
// the neighborhood section's shape now names a TC id, so a stale replay can
// put a `serves: … for TC2` row
// against a TC2 the supplied candidates no longer describe.
export const COMPOSED_INPUT_FLAGS = ["claims", "subdivisions", "neighborhood-candidates", "thesis-candidates"];
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
    // THE BINARY IS IN THE KEY (kogaki#1076 item 3), and that is the whole point
    // of putting it on the pin: two runs with equal model and effort had run
    // different executables, and an identity that cannot tell them apart is the
    // drift-undetectable shape the pin exists to close. A pin written before the
    // field existed carries `undefined` and keys as `NO_JUDGE`, which is what it
    // meant -- no binary entered its identity -- on the fourth component's own
    // precedent one line below.
    i.judge_pin === NO_JUDGE ? NO_JUDGE
      : `${i.judge_pin.model_id}/${i.judge_pin.effort_tier}/${
        i.judge_pin.binary_version === undefined || i.judge_pin.binary_version === null
          ? NO_JUDGE : i.judge_pin.binary_version}`,
    // the report identity's fourth component (kogaki#741). A record written before the field
    // existed carries `undefined` here and hashes as `NO_JUDGE`, which is what
    // it meant: no neighborhood judgment entered its identity.
    i.neighborhood_judgment === undefined ? NO_JUDGE : i.neighborhood_judgment];
}

// THE ENTERED ID SET, RESOLVED AND CANONICALISED (the Full Report v6, kogaki#314).
//
// The owner reads a display and types `G10,G5-1,G5-2`. Those ids resolve
// against THE GROUPS THIS RUN COMPOSES and nothing else — story 1.56 AC11
// makes an id valid for the run that printed it, because a pin advance may
// renumber, so a cached numbering would silently resolve to the wrong Strands.
//
// THE SORT IS NUMERIC-AWARE, and this is the part a plain reading gets wrong.
// `G5-1` comes before `G10`: lexicographically `"G10" < "G5-1"`, which would
// render a display's tenth group above its fifth. Compare the numeric
// components, never the raw string.
//
// CANONICAL, so identity is SET-BASED (the Full Report v6): two typings of the same ids in
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

// Resolve each entered id to a Group or a SubGroup of this display.
//
// A SubGroup id brings ITS SubGroup, not its parent (AC7): entering `G5` and
// `G5-1` together is admissible and renders both, with `G5-1`'s members
// appearing under each — a COVER, not a duplication (the placement cover).
function resolveEnteredIds(entered, groups, subOf) {
  const known = [];
  const byId = new Map();
  for (const g of groups) {
    known.push(g.gid);
    byId.set(g.gid, { kind: "group", gid: g.gid, group: g });
    // SubGroup ids are derived exactly as the display derives them: the
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
    // back to re-read a display they already read.
    fail(`report --ids names ${missing.join(", ")}, which resolve to no Group or SubGroup on this display. `
      + `The ids that do resolve are: ${canonicalIds(known).join(", ")}. `
      + "Ids are valid for the run that printed them (story 1.56 AC11): a pin advance may renumber, so re-read the display rather than reusing an older list.");
  }
  return { canonical: canon, targets: canon.map((id) => byId.get(id)) };
}

// the Thesis candidates — reading and REFUSING the Thesis-candidate input (kogaki#760).
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
    fail("--thesis-candidates must be a JSON array of {claim, strands} objects (SPEC.md, the Thesis candidates)");
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
      + "The count is EXACT rather than a maximum (SPEC.md, the Thesis candidates): a section whose length varies run to run "
      + "cannot be read as a fixed early image. Compose exactly " + want + ", or amend the limit in "
      + "src/report-format.json on its own licensing issue.");
  }
  const members = new Set(memberDisplayIds);
  return raw.map((c, i) => {
    const at = `--thesis-candidates[${i}]`;
    if (!c || typeof c !== "object" || Array.isArray(c)) {
      fail(`${at} must be an object carrying "claim" and "strands" (SPEC.md, the Thesis candidates)`);
    }
    const claim = c.claim;
    if (typeof claim !== "string" || claim.trim() === "") {
      fail(`${at} carries no "claim" text (SPEC.md, the Thesis candidates: one sentence per candidate)`);
    }
    if (/\n/.test(claim)) {
      // One RENDERED line per claim: a newline would emit a line no class
      // admits, and the emit-time refusal would then report the surface rather
      // than the input that caused it.
      fail(`${at}'s claim spans more than one line. The Thesis candidates renders one line per candidate, so a `
        + "multi-line claim would emit a line no grammar class admits and the refusal would name the "
        + "surface rather than this input.");
    }
    const strands = c.strands;
    if (!Array.isArray(strands) || strands.length < 2 || strands.length > 8) {
      fail(`${at} carries ${Array.isArray(strands) ? strands.length : "no"} strand(s); the Thesis candidates requires 2 to 8. `
        + "One strand is not a combination and nine is not an early image.");
    }
    const unknown = strands.filter((x) => !members.has(x));
    if (unknown.length) {
      fail(`${at} names ${unknown.join(", ")}, which ${unknown.length === 1 ? "is" : "are"} not a member of THIS report. `
        + `The display ids this report carries are: ${[...members].join(", ")}. `
        + "A candidate may only combine Strands the owner is reading in this file (SPEC.md, the Thesis candidates) — an id that "
        + "resolves elsewhere in the survey record is still refused here.");
    }
    const dup = strands.filter((x, j) => strands.indexOf(x) !== j);
    if (dup.length) {
      fail(`${at} names ${[...new Set(dup)].join(", ")} more than once. A repeated strand inflates the `
        + "combination without adding to it.");
    }
    // THE ID IS MINTED HERE, POSITIONALLY, AND IT IS MINTED BEFORE THE
    // NEIGHBORHOOD IS JUDGED (kogaki#861, owner ruling 2026-09-05). It used to
    // be minted at RENDER time inside `thesisCandidatesSection`, which was
    // sound while nothing but that section named a TC id — and unusable the
    // moment J3's judgment record had to name one. A neighbor's target is
    // checked against this set, so the set must be FIXED before the judgment
    // rather than assigned after it:
    //
    //   "JUDGMENT SITS IN THE GAPS BETWEEN DETERMINISTIC PARTS, NEVER AS A
    //    LAYER AROUND THEM … is the model deciding what happens next, or
    //    supplying a value between two things whose order is already fixed?"
    //   product-lab@ab04cc9bca21a600cd9eb0a594619d3ca899d05f
    //     topics/claude-code-ops.md:24
    //
    // Still POSITIONAL and still never read from the input: a supplied id would
    // be a second carrier for a number the list already fixes, and the two
    // would drift the first time a candidate was reordered. What changed is
    // WHEN the position is read, not who decides it — the `thesis_candidates`
    // state reads it, writes the minted list to the run workspace, and every
    // later reader of that file re-mints the same ids from the same order.
    return { id: `TC${i + 1}`, claim, strands: [...strands] };
  });
}

function cmdReport(args) {
  retireLegacyReportsDir();
  const dir = reportsDir(args);
  const record = readJson(String(args.survey || fail("report needs --survey <file>")));
  const tag = String(args.tag || fail("report needs --tag <selected tag>"));
  // the open questions v5 / the Full Report v6 (kogaki#314): the owner enters a G/SG ID SET and ONE report
  // covers exactly it. `--all-groups` and `--group` are GONE, not deprecated —
  // leaving the eager flag reachable would leave the over-generation the
  // decision removes one argument away, on precisely the 11-group display that
  // filed the issue.
  if (args["all-groups"] !== undefined || args.group !== undefined) {
    fail("report no longer takes --all-groups or --group. SPEC.md, the open questions v5 (kogaki#314) supersedes eager per-group generation: enter the Group/SubGroup IDs you want, e.g. `report --tag <T> --ids G10,G5-1,G5-2`, and ONE report covers exactly those.");
  }
  const idsArg = String(args.ids || fail("report needs --ids <G/SG list>, e.g. --ids G10,G5-1 (SPEC.md, the Full Report v6: one report over the entered ID set)"));
  const enteredIds = idsArg.split(",").map((x) => x.trim()).filter(Boolean);
  if (enteredIds.length === 0) {
    // SQ3, answered: an empty set REFUSES rather than producing an empty
    // report. "The owner entered nothing" and "the owner wants a report of
    // nothing" are different, and the second is not a thing the Full Report can render —
    // a report with no material has no identity worth colliding on.
    fail("report --ids was empty. An empty ID set is not a report of nothing: enter at least one Group or SubGroup ID from the display.");
  }

  const { groups, targets, resolved, subOf } = resolveReportTargets(record, tag, enteredIds, args);
  // THE SECOND READER OF THE SAME ARTIFACT (the open-questions section, v10, kogaki#212). `cotags` and
  // `report` are handed the same `--claims` file, so migrating one and leaving
  // the other reading the flat map would put two encodings behind one file —
  // the defect the report identity v9 fixed for `--subdivisions` by migrating both readers in
  // one change. `report` does not re-run the subset check (that is the display's
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

  // THE JUDGE PIN IS REQUIRED UNCONDITIONALLY (the report identity v9, kogaki#199), not only
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
      + "(SPEC.md, the report identity v9). A co-tag-generated Full Report may never mint a judge pin "
      + "of `none`: judged-with-no-split and never-judged are different states, and a "
      + "report carrying `none` is indistinguishable from a run that never asked");
  }
  // THE PIN'S BINARY COMPONENT (kogaki#1076 item 3). PRESENT-AND-NULL where
  // nothing observed a binary, on `judge_pin`'s own uniform-arity ground: a
  // declared pin names a model the composer says judged, and there is no
  // executable behind it to name. The executor's own path supplies it, which is
  // the path every judged surface this repository mints comes through.
  const suppliedJudge = {
    model_id: String(m), effort_tier: String(e),
    binary_version: args["judge-binary-version"] === undefined || args["judge-binary-version"] === null
      ? null : String(args["judge-binary-version"]),
  };

  // EVERY TARGET MUST BE JUDGED. An absent entry is `not judged`, and the
  // co-tag path refuses it rather than minting `none` for it — the whole of
  // what the report identity v9 forbids.
  const unjudged = targetGroups.filter((g) => subOf(g) === null).map((g) => g.name);
  if (unjudged.length) {
    fail(`--subdivisions carries no entry for ${unjudged.join(", ")}. On the co-tag path `
      + `every group is judged (the SubGroup threshold), so a missing entry cannot be recorded: write `
      + `{"judged": true, "subgroups": []} for a group whose judgment found no subdivision`);
  }

  // the Thesis candidates (kogaki#760) — READ AND REFUSED HERE, before any generation runs, so
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
    // for a record predating the display-ID rule, so it is excluded by NAME. A `filter(Boolean)`
    // would keep it and the sentinel would then read as an admissible strand id.
    .map((mid) => displayIdOf(mid, record.candidates))
    .filter((d) => d && d !== NO_DISPLAY_ID);
  const thesisCandidates = readThesisCandidates(
    args["thesis-candidates"] ? readJson(String(args["thesis-candidates"])) : null,
    reportMemberIds, loadGrammar(REPORT_FORMAT).limits || {});

  // One shard fetch for the whole invocation — tag-scoped and bounded (the rendering rule),
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

  // ONE report over the whole entered set (the Full Report v6/v7) — not one per group.
  //
  // AND ITS RETURN VALUE IS THIS FUNCTION'S (kogaki#1087). The call discarded it
  // and `cmdReport` then fell off its end returning `undefined`, so the executor's
  // `written || null` mapped a real owner artifact to `{ artifact: null }` and
  // `classifyWriteOutcome` reported `wrote-nothing` -- the run record's
  // `artifacts_written` named `reports/CoTagGroups.md` alone on a run that had
  // written `reports/FullReport.md` beside it. Both of `generateReport`'s own
  // returns are already the observed path, and PR #667 round 2 repaired the
  // idempotent branch to return one; the loss was one frame further out, where
  // nothing was reading what either branch returned.
  return generateReport(targets);

  function generateReport(entered) {
  // the Full Report v7 — ONE report over the entered set. The identity is the set; each
  // entered id becomes one SECTION, and the identity block, Counted and
  // Served lines appear once for the file.
  // THE NEIGHBOURHOOD JUDGMENT IS THE FOURTH COMPONENT (the report identity, kogaki#741), so
  // it is hashed INTO the identity rather than beside it. Same reading as
  // `composedInputDigests` takes — the record's file bytes — so the two cannot
  // disagree about what "this input" is.
  // A RECORD-JOINED PATH THAT NO LONGER RESOLVES REFUSES BY NAME (the neighborhood section's shape,
  // kogaki#741 acceptance 2). The run record stores the judgment file's PATH,
  // so a rerun reads the file again — and deleting it between J3 and the render
  // must fail loudly rather than render an unjudged section. Left to the digest read below or to `readJson`
  // this surfaces as an uncaught ENOENT, which is loud but names neither the
  // state nor the repair, so the check is made HERE — ahead of the
  // digest read, which is the first line that touches the file — and typed.
  if (args.neighborhood && !existsSync(String(args.neighborhood))) {
    fail(`the neighborhood judgment record this pull joins is gone: ${String(args.neighborhood)} `
      + "does not exist. The run record names it, so J3_neighborhood ran and its file was removed "
      + "afterwards. Re-enter J3_neighborhood rather than re-rendering — the neighborhood section's shape has no path to an "
      + "unjudged neighborhood rendering, and joining nothing here would be one.");
  }
  const neighborhoodJudgmentDigest = args.neighborhood
    ? createHash("sha256").update(readFileSync(String(args.neighborhood))).digest("hex").slice(0, 16)
    : NO_JUDGE;
  const identity = reportIdentity(record.pin, tag, resolved.canonical, suppliedJudge,
    neighborhoodJudgmentDigest);
  // Computed BESIDE the identity and never inside it (the report identity, kogaki#700): the
  // claims and subdivisions ride the record. The neighborhood judgment no
  // longer does — it moved into the key above.
  const composedInputs = composedInputDigests(args);
  // WHAT THE HARNESS OBSERVED of the judgment this report is served on
  // (kogaki#892). Recorded BESIDE the identity and never inside it, exactly as
  // `composed_inputs` is: the identity's third component is the PIN, and a
  // provenance folded into the key would make two runs over one record under
  // one pin two different reports the moment a judge-invoking act existed.
  const judgmentProv = judgmentProvenance(args.subdivisions ? String(args.subdivisions) : null);
  const sectionsOut = [];
  let abnormalTotal = 0;
  const allMemberIds = [];

  function buildSection(t) {
  const group = t.group;
  const groupClaim = claims[group.name] !== undefined ? claims[group.name] : claims[group.cotag];
  const sub = subOf(group);
  // Unconditional now: `sub` is non-null for every target (refused above), and
  // NO_JUDGE is never minted here. It stays exported and valid in the identity
  // triple — the report identity's uniform arity is untouched and `(pin, query, none)` is
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
      // the display-ID rule — resolved from `record.candidates` AT RENDER TIME. The record
      // is the map (AC3); this is a projection of it onto the member being
      // rendered, not a second map written beside it, and nothing reads it
      // back. `null` when the record predates the display-ID rule, which `memberBlock`
      // renders as the stated abnormality rather than as the slug (AC7).
      display_id: c.display_id || null,
      gloss: lg ? lg.body : NO_GLOSS_BODY,
      gloss_cite: lg ? lg.cite : null,
      journey_gloss: c.journey ? (jg ? jg.body : NO_GLOSS_BODY) : null,
      journey_cite: c.journey && jg ? jg.cite : null,
    };
  });

  // JUDGED-EMPTY IS ZERO SubGroupClaims, and it is still handled before
  // `subgroupPlacement` (the report identity v9). The reason CHANGED at kogaki#738 and the
  // branch did not: the placement used to sweep every member into a catch-all on
  // an empty list, manufacturing a SubGroup the judgment never made; now it
  // REFUSES on an empty list, naming every member of the group. Judged-empty is
  // a legitimate outcome and must reach neither, so the guard stays exactly
  // where it was.
  let subgroups = null;
  // the SubGroup threshold v7 / the report identity v9's THIRD state. Set where the suppression is decided and
  // read by the renderer — PR #356 round 1 finding 2 found the read with no
  // writer, so the branch was unreachable and a suppressed section rendered
  // "the judgment produced NO split", which is false of it. That is the
  // carrier-with-no-input shape, and it read as fixed.
  let suppressedSplitHere = false;
  if (sub && sub.subgroups.length === 0) {
    subgroups = [];
  } else if (sub) {
    const placed = subgroupPlacement(group, sub.subgroups, SURVEY_SCHEMA.subdivision);
    // the SubGroup threshold v7 RULE 3 BINDS THIS SURFACE TOO, and it did not until PR #355
    // round 1 finding 1. The rule reads unconditionally — "the group renders no
    // SubGroups" — and story 1.57 implemented the suppression only in
    // `cmdCotags`, so one run's two owner surfaces disagreed: the display showed
    // the group flat while the report still carried the SubGroups the display
    // had suppressed. An owner copying a G-id between them would have found two
    // different structures under it, which is the divergence kogaki#317 minted
    // the ids to prevent.
    //
    // The judgement runs HERE rather than being read off the display, because
    // the two surfaces share the subdivision record and nothing else — reading
    // the display's verdict would be a second carrier. Same input, same
    // `judgeSubgroup`, same conclusion.
    for (const sg of placed.subgroups) judgeSubgroup(sg, groupClaim, group.members.length);
    // EVERY SubGroup IS NAMED BY THE JUDGE (kogaki#738): the catch-all filter
    // that stood here excluded a bucket the engine composed, and that bucket is
    // deleted.
    const namedSg = placed.subgroups;
    // The record half of the SubGroup threshold v7 rule 3, re-keyed and bounded exactly as the
    // display's is — same input, same conclusion, one rule (kogaki#683, #738).
    if (namedSg.length === 1 && namedSg[0].verdicts
        && namedSg[0].verdicts.coherence === "other"
        && group.members.length < SUBDIVISION_REQUIRED_AT) {
      // Rendered as judged-empty in SHAPE, and flagged so the renderer can
      // tell it from a genuine no-split. `[]` and not `null` — the report identity v9 keeps
      // judged-empty distinguishable from unjudged, and this group WAS judged.
      subgroups = [];
      suppressedSplitHere = true;
    } else {
    // the SubGroup threshold v6 — the SubGroupID is derived the same way the display derives it:
    // the parent's GroupID plus a 1-based index over the SAME `subgroupPlacement`
    // output in the same order. That is what makes AC4 hold — an owner copying
    // `G2-1` off the display finds `G2-1` in the report — without either surface
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
    // the Full Report v7 — one section per entered id, KEYED BY THE ID so an owner can
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

  // THE SPLIT REQUIREMENT REACHES THIS SURFACE TOO (semantic subdivision v30, kogaki#683; PR #705
  // round 1). Disposition 1 refuses a judged-empty outcome for a group at or
  // above the threshold, and the `subdivision_required_at_ten` grammar rule
  // carries that on `cotag_groups`. It cannot carry it here: `full_report`'s
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
  // SubGroup's members and `subgroups: null`; semantic subdivision's requirement is on composed
  // GROUPS, so the test reads the empty-array state that only a judged group
  // reaches, and a suppressed split is excluded because suppression is already
  // unavailable at this size.
  for (const sec of sectionsOut) {
    if (sec.subgroups && sec.subgroups.length === 0 && !sec.suppressed_split
        && (sec.members || []).length >= SUBDIVISION_REQUIRED_AT) {
      fail(`${sec.id} — ${sec.name} holds ${(sec.members || []).length} member Lessons and its judgment produced NO split. `
        + `At ${SUBDIVISION_REQUIRED_AT} or more, serving SubGroups is the engine's requirement rather than the judge's `
        + "discretion (kogaki#683), so a judged-empty outcome for such a group does not render. "
        + "Recompose the subdivision for this group and pull the report again.");
    }
  }

  // the report identity case 1: same identity, run twice -> ONE report. The rerun is
  // idempotent, not a duplicate, so an existing report with THIS identity is
  // returned rather than rewritten.
  const out = join(dir, `terrain-full-report-${identityDigest(identity)}.json`);
  if (existsSync(out)) {
    const prior = readJson(out);
    // A PRE-#741 RECORD IS NEVER REPLAYED (PR #756 round 1). `reportIdentityKey`
    // hashes an ABSENT fourth component as `NO_JUDGE`, which is what it meant —
    // but it makes a stored record written under the superseded design match a
    // pull carrying no judgment, and its stored rendering may hold the very
    // unjudged section the neighborhood section's shape now has no path to. Falling through RECOMPUTES,
    // which reaches the refuse-unjudged guard below and refuses exactly when the
    // enumeration is non-empty; it is the same treatment `composedInputDelta`
    // gives a record predating ITS field, for the same reason — a record that
    // cannot be shown idempotent is recomputed rather than replayed.
    // A PRE-#861 RECORD IS NEVER REPLAYED EITHER, and for the reason the clause
    // above already gives rather than a new one. Both predating guards and the
    // identity comparison are `shouldReplayPrior`, pure and exported: this
    // branch reaches the seam, so a condition composed HERE is one no fixture
    // can state — see that function's own header for what the first cut of this
    // fix left unbound.
    if (shouldReplayPrior(prior, identity)) {
      // THE COMPOSED INPUTS ARE COMPARED BEFORE THE REPLAY (the report identity, kogaki#700).
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
        // done nothing wrong. Recomputing is safe because the report identity case 1 is a
        // claim about the report, not about the write: one identity, one file,
        // rewritten in place.
      } else if (delta.length) {
        fail(`COMPOSED_INPUT_MISMATCH — this identity was already reported from different composed input(s): `
          + `${delta.join(", ")}. The identity is the substrate pin, the query, the judge pin and the neighborhood `
          + "judgment record (SPEC-terrain, the report identity, widened at kogaki#741), "

          + "and the composed inputs are NOT part of it — so replaying the stored rendering would render material this "
          + "invocation did not supply, while reporting success. Re-run against a fresh --report-dir to render the new "
          + "inputs as their own report, or restore the inputs this identity was reported from.");
      } else {
        // IDEMPOTENT ON THE RECORD, AND THE RENDERING IS STILL WRITTEN IN THIS
        // ACT (location and naming v11: "Both are written in the same act"). Idempotence is a
        // claim about the RECORD — one identity, one report — and the rendering
        // is a pure function of that record, so re-deriving it is the same
        // artifact rather than a second one. Writing it rather than skipping it
        // is what makes a rerun self-healing: the rendering's lifetime is the
        // OWNER's by lifetime, so it can be deleted, be stale from an older
        // renderer, or never have existed because the first run passed
        // `--no-render`, and none of those are states a second run should leave
        // standing while reporting success.
        // the emit-time refusal — the rerun path refuses on exactly the same grammar as the fresh
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
          // write authority v28 — THE RERUN IS A WRITE, so it carries the write authority
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
          // location and naming v12 — ONE owner rendering, a fixed human name, overwritten per
          // pull. Identity stays in the record alone; the filename carries none.
          priorRendered = join(renderingsDir(args), "FullReport.md");
        }
        emitOrRefuse("full_report", priorText,
          (text) => { if (priorRendered) writeFileSync(priorRendered, text); });
        console.log("Full Report already exists for this identity — the rerun is IDEMPOTENT, "
          + "not a duplicate (SPEC.md, the report identity).");
        announceArtifacts(priorRendered, out);
        console.log(`Identity: pin=${identity.pin} query=(${tag}, ${identity.query.ids.join(", ")}) judge=${identity.judge_pin === NO_JUDGE ? NO_JUDGE : `${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}`}`);
        // RETURNS WHAT THIS BRANCH WROTE (PR #667 round 2, carried to kogaki#625).
        // It `return`ed undefined after writing `reports/FullReport.md`, so the
        // executor's `written || null` mapped a real owner artifact to
        // `{ artifact: null }` and `classifyWriteOutcome` reported `wrote-nothing`
        // — the run record skipped its `artifacts_written` push for a state that
        // did write. The report identity's idempotence is a claim about the RECORD, and the
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
  // entered set (the settled-strand-set input), after every refusal above so a refused pull pays no
  // seam call. Either way the result is stored IN THE RECORD, so the
  // rendering stays a pure function of the record (the report identity) — a section
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
  // candidate with no judgment keeps none — `neighborhoodDisplay` counts it as
  // unjudged and says so, rather than defaulting it to a level nobody assigned.
  // `full_report` REFUSES AN UNJUDGED NEIGHBORHOOD (the neighborhood section's shape, kogaki#741 ruling 2).
  // Scoped to a NON-EMPTY enumeration, mirroring the orphan refusal below: where
  // the mechanical layer returned no candidate there is nothing to judge, and
  // refusing would turn a legitimate empty neighborhood into an error.
  if (!args.neighborhood && (neighborhood.suggestions || []).length) {
    fail("full_report refuses: this pull carries "
      + `${(neighborhood.suggestions || []).length} mechanical candidate(s) and no neighborhood `
      + "judgment record. The neighborhood section's shape makes the judgment pass UNCONDITIONAL and the Report REQUIRES it "
      + "by design — there is no path to an unjudged neighborhood rendering. Enter J3_neighborhood "
      + "so the run record names the judgment this pull joins.");
  }
  const judgments = readNeighborhoodJudgments(args.neighborhood);
  // A KEY MATCHING NO CANDIDATE IS REFUSED, NOT DROPPED. A typo, a stale file,
  // or a slug from another Group would otherwise vanish — and where NO key
  // matched, the display took its all-unjudged arm and printed "the mechanical
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
  // THE TARGETS JOIN TO THE THESIS-CANDIDATES SECTION OF THIS SAME FILE (kogaki#861), and
  // the absent-candidates fallback STOPS APPLYING to a judged neighborhood.
  // `--thesis-candidates` was optional and an absent list rendered the Thesis candidates's
  // empty notice; that is still the answer for an unjudged or empty
  // neighborhood, and it cannot be the answer here — every row about to render
  // names a candidate, so a pull with no candidates would put TC ids on the
  // owner's surface with no section for them to point at.
  if (judgments.size && (neighborhood.suggestions || []).length) {
    if (!thesisCandidates.length) {
      fail("this pull carries a neighborhood judgment and no --thesis-candidates. Every judged row names "
        + "the Thesis candidate it serves (kogaki#861), so the candidates must be composed for this pull: "
        + "an absent list would render TC ids against the Thesis candidates's empty notice. Compose them and pass "
        + "--thesis-candidates, or run the pull with no neighborhood judgment.");
    }
    orFail(() => refuseTargetsOutsideCandidates(judgments, thesisCandidates.map((c) => c.id), "full_report"));
  }
  for (const sug of neighborhood.suggestions || []) {
    const j = judgments.get(sug.slug);
    if (j) { sug.level = j.level; sug.claim = j.claim; sug.target = j.target; }
    // The relation IN PLAIN WORDS (kogaki#686 disposition 3, field 2). With
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

  // THE BOUNDED GLOSS FETCH (kogaki#689, owner ruling 2026-08-28). kogaki#686
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
  // Brief lane and the same one the rendering rule binds `cmdView` to. The corpus-wide prefetch
  // the rendering rule forbids is not reachable from here, because the tag set is a function of
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
    // RECORDED BESIDE THE IDENTITY, never inside it (the report identity, kogaki#700).
    composed_inputs: composedInputs,
    // The same siting, for the same reason (kogaki#892) — see `judgmentProv`.
    judgment_provenance: judgmentProv,
    kind: "full-report",
    identity,
    // the Full Report v7 — the entered set, canonical, recorded in the identity block.
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
    // the Thesis candidates (kogaki#760) — validated ABOVE, before this object exists, so a
    // refusal precedes both writes exactly as the emit-time refusal requires of the emit-time
    // guard. An empty array is the DISCLOSED absence and not a missing field.
    thesis_candidates: thesisCandidates,
    // the neighborhood as a report v20 — ONCE per file, rendered LAST by `renderReportMarkdown`.
    neighborhood,
  };
  const abnormal = abnormalTotal;
  // THE REFUSAL PRECEDES BOTH WRITES (the emit-time refusal, story 1.54 AC2). The record is
  // written BELOW this line, not above it: location and naming v11 requires the record and
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

  // THE OWNER RENDERING, in the SAME ACT (location and naming v11, kogaki#234). A run that
  // wrote the record and not the rendering would leave the owner exactly where
  // the ruling found them, so this is not conditional on a flag: `--no-render`
  // is the opt-out and its absence is the default.
  let rendered = null;
  if (!args["no-render"]) {
    // write authority v28 (kogaki#681) — the same write-authority refusal the display
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
    // sufficient, so the rerun branch shipped unguarded and write authority v28's central
    // claim was false at the artifact the amendment was written to protect.
    // The guard now sits on BOTH branches and this note is the record.
    refuseUnauthorizedOwnerWrite(renderingDestination(args), "FullReport.md");
    const rdir = renderingsDir(args);
    // location and naming v12 — ONE owner rendering, a fixed human name, overwritten per
    // pull. Identity stays in the record alone; the filename carries none.
    rendered = join(rdir, "FullReport.md");
    writeFileSync(rendered, renderedText);
  }

  // The no-hidden-path owner-surface rule binds BOTH artifact lines (PR #240 review round 1, finding
  // 2), on this path and on the rerun path alike — see `announceArtifacts`,
  // which is where the contract now lives so that neither path can drift from
  // the other again.
  announceArtifacts(rendered, out);
  console.log(`Identity RECORDED in the report: pin=${identity.pin} query=(${tag}, [${identity.query.ids.join(", ")}]) judge=${identity.judge_pin === NO_JUDGE ? NO_JUDGE : `${identity.judge_pin.model_id}/${identity.judge_pin.effort_tier}`} judge-provenance=${judgmentProv.state}${judgmentProv.artifact_sha ? ` (subdivisions sha ${judgmentProv.artifact_sha})` : ""}`);
  console.log(`${sectionFigure({ name: `${tag} — ${identity.query.ids.length} selection(s)`, members: [...new Set(allMemberIds)], by_family: report.counted }, record.candidates.length)}`);
  if (abnormal) {
    console.log(`ABNORMAL: ${abnormal} served Gloss rendering(s) are missing. This is a fault to clear on the served surface, not a tolerated gap, and nothing was substituted for it (SPEC.md, the rendering rule, the Full Report).`);
  }
  console.log("Classification: REPORT (SPEC.md, the second-proposer boundary, the Full Report) — it ranks nothing, narrows nothing and hides nothing, so it sits in neither act list.");
  console.log("A RENDERING, not an address: nothing downstream resolves a report id, and a Brief records members and pins (SPEC.md, the Full Report).");
  console.log("The RENDERING is repo-visible and NOT committed; the RECORD is "
    + "machine-local — visibility is decided explicitly, never by storage location, and location and naming holds v11. Two artifacts, two rules — "
    + "visibility and publication are separate decisions.");

  // RETURNS WHAT IT WROTE, so the control plane executor can OBSERVE the artifact
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
// THE ANSWER IS READ, NEVER ARGUED (kogaki#890; owner selection 2026-09-05).
//
// `writeCapture` stood here and took the answer from the session:
// `--capture-option`, `--capture-free-text` and `--tool-use-id` were all
// composed by the model after it rendered the gate, and the id was stored
// under the key `evidence` without ever being resolved against anything. The
// option bound was real — an option the declaration did not offer was refused
// — and it was the only real thing: a mis-transcribed option that WAS offered,
// or a capture issued with no gate ever shown, was admitted, the wait
// completed, and the run advanced on an answer the owner never gave. That is
// the right act with the guard silently disabled, which the 2026-09-04 ruling
// separates from the loud failure and treats as the dangerous one.
//
// The row is now written by `.claude/hooks/write-gate-capture.py` at the
// moment the owner answers, from the harness's own payload. This function is
// its reader, and every refusal below is a refusal to advance rather than a
// complaint about a shape: the wait stays outstanding, so the recovery is
// always to render the gate again.
export function readCapturedAnswer(dir, decl, payloadToolUseId = null) {
  const capPath = join(dir, `terrain${GATE_SCHEMA.capture.suffix}`);
  const instance = decl.gate_instance_id;
  if (!instance) {
    fail(`the declaration for gate ${decl.id} carries no gate_instance_id, so no captured answer can be joined to it. `
      + `It was written before kogaki#890 — re-enter the wait to raise the gate again, which mints one.`);
  }
  if (!existsSync(capPath)) {
    fail(noAnswerRefusal(decl, capPath, "no capture file exists beside this run"));
  }
  const doc = readJson(capPath);
  const rows = Array.isArray(doc.rows) ? doc.rows : [];
  // THE JOIN IS ON THE INSTANCE ID AND ON NOTHING ELSE. Not on the gate id,
  // which every raising of this gate shares; not on the question or the option
  // set, which two runs over one input share exactly.
  const mine = rows.filter((r) => r && r.gate_instance_id === instance);
  if (mine.length === 0) {
    fail(noAnswerRefusal(decl, capPath,
      `the capture holds ${rows.length} row(s) and none carries this raising's instance id ${JSON.stringify(instance)}`));
  }
  // THE ADVANCE IS THE ANSWER'S OWN, AND THIS IS THE SECOND READER OF THAT
  // (kogaki#1075). `.claude/hooks/advance-terrain.py` will not spawn this act
  // for a question whose `tool_use_id` no row of this run carries; the guard
  // holds here too, at the re-entry, for the reason the open-gate exclusivity
  // has two readers -- a precondition enforced only where it cannot re-ask is a
  // precondition one direct invocation walks past.
  //
  // WHAT IT REFUSES. An advance driven by a payload that answered SOME OTHER
  // question while this gate's row was already on disk: the run would move on
  // an answer the owner did give, attributed to a question they gave it at
  // nowhere. That is what happened on 2026-09-10, when a `/ship-cycle` cleanup
  // question in another session walked a parked run through two states and
  // three failed judgments.
  //
  // A NULL ID DOES NOT REFUSE, and the asymmetry is deliberate: a caller that
  // names no payload is asserting nothing about which question drove it, and
  // absence of a claim is not a claim that fails. Every route that can advance
  // a run names one -- `completeState` refuses a transition with no attribution
  // -- so the admitted case is a reader, not an advance.
  if (typeof payloadToolUseId === "string" && payloadToolUseId !== "") {
    const answered = mine.filter((r) => (r.evidence || {}).tool_use_id === payloadToolUseId);
    if (answered.length === 0) {
      fail(`this advance was driven by AskUserQuestion ${JSON.stringify(payloadToolUseId)}, and no captured row for gate ${decl.id} `
        + `(raising ${JSON.stringify(instance)}) carries that id — the ${mine.length} row(s) here answer `
        + `${JSON.stringify([...new Set(mine.map((r) => (r.evidence || {}).tool_use_id))])}. `
        + `A question that did not answer this gate does not advance it, however open the run is (kogaki#1075). `
        + `Nothing was advanced, and the wait is still outstanding: the gate is re-offered at its next raising.`);
    }
    mine.length = 0;
    mine.push(...answered);
  }
  // THE LAST ROW. A gate can be re-rendered after an answer the owner wants to
  // change, and the answer that governs is the one they gave last.
  const row = mine[mine.length - 1];
  const ev = row.evidence;
  if (!ev || ev.tool !== "AskUserQuestion") {
    fail(`the captured row for gate ${decl.id} records evidence.tool ${JSON.stringify(ev && ev.tool)} — this is an OWNER act at the question UI, `
      + `and SPEC-gate-carrier binds this repository's gate medium to AskUserQuestion. A row recording any other tool records a session's own act.`);
  }
  if (typeof ev.tool_use_id !== "string" || ev.tool_use_id === "") {
    fail(`the captured row for gate ${decl.id} carries no evidence.tool_use_id — the one field tying it to a question the harness actually asked.`);
  }
  const digest = ownerGateDigest(decl.id, (decl.options || []).map((o) => o.id));
  const bound = row.answers_over || {};
  if (bound.option_set_digest !== digest) {
    fail(`the captured answer for gate ${decl.id} answers the option set digesting ${JSON.stringify(bound.option_set_digest)}, `
      + `but this declaration's options digest ${JSON.stringify(digest)} — the option set CHANGED after the gate was rendered, so the owner chose among alternatives other than these. `
      + `Re-render the gate. Nothing was advanced.`);
  }
  const answer = (row.payload || {}).answer || {};
  // AN UNRESOLVED LABEL IS REFUSED, NEVER READ AS FREE TEXT (PR #917 round 1,
  // finding 4). The hook records this when the harness's reported label neither
  // matches a declared one nor is clearly distinct from it — a truncation, a
  // decoration, a re-wrap. Reading such an answer as the owner's own words
  // would route a declared option's text to where a tag name or an id list
  // goes, skipping the unrouted-option refusal entirely; and the payload alone
  // cannot tell a mangled label from genuine free text, so the honest act is to
  // stop rather than to pick the reading that happens to advance.
  if (answer.label_unresolved) {
    fail(`the captured answer for gate ${decl.id} could not be resolved to an option or to free text: the harness reported ${JSON.stringify(answer.raw)}, `
      + `which resembles the declared option ${JSON.stringify(answer.resembles_option)} without matching it. `
      + `A near-miss is indistinguishable from free text on the payload alone, so it is refused rather than read as either. Re-render the gate, options verbatim.`);
  }
  const option = typeof answer.option === "string" && answer.option !== "" ? answer.option : null;
  const freeText = typeof answer.free_text === "string" && answer.free_text.trim() !== "" ? answer.free_text : null;
  if (!option && !freeText) {
    fail(`the captured row for gate ${decl.id} carries neither an option nor free text — an empty answer is not an answer.`);
  }
  // KEPT FROM THE RETIRED WRITER, and it is the one bound that was already
  // real: an option the declaration did not offer is refused. It now guards a
  // row the harness wrote rather than one the model composed, so it stops
  // being the only guard and starts being the last of several.
  if (option && !(decl.options || []).some((o) => o.id === option)) {
    fail(`the captured answer ${JSON.stringify(option)} was not offered by the declaration for gate ${decl.id}.`);
  }
  return { path: capPath, row, option, freeText, toolUseId: ev.tool_use_id };
}

// The refusal an unanswered gate raises, in one place because its two callers
// must not drift on WHAT THE OWNER IS TOLD TO DO. It names the pointer the
// hook reads, because a machine that has never installed the hook is the one
// state where re-rendering the question changes nothing — and a refusal that
// sends the owner round that loop forever is worse than the channel it
// replaced.
function noAnswerRefusal(decl, capPath, why) {
  return `gate ${decl.id} was declared for this run and the harness has recorded no answer to it: ${why}.\n`
    + `The answer to a declared gate is written by .claude/hooks/write-gate-capture.py when the owner answers the question, and by nothing else — `
    + `there is no argument that supplies one (kogaki#890).\n`
    + `  capture expected at: ${capPath}\n`
    + `  open-gate pointer:   ${join(openGateDir(), `${decl.gate_instance_id}.json`)}\n`
    + `If the question has not been rendered yet, render it now, options verbatim, free text on. `
    + `If it HAS been answered and this refusal persists, the hook is not installed on this machine — that wiring is machine-local and never committed, so a fresh clone reads as uncaptured until it is installed.`;
}

// The option-set digest, over [gate_id, [option ids]]. A capture certifies an
// answer GIVEN A SET OF OPTIONS: the same option id offered beside different
// alternatives is a different question, so binding to the offered set is what
// stops an answer taken at one rendering certifying a choice at another.
// `.claude/hooks/write-gate-capture.py` computes the same digest over the same
// canonical form; `checks/check-gate-capture-hook.sh` compares the two rather
// than trusting them to agree by reading.
export function ownerGateDigest(gateId, optionIds) {
  return createHash("sha256").update(JSON.stringify([gateId, [...optionIds]])).digest("hex");
}

// --------------------------------------------------------------------------
// neighborhood — SPEC-terrain, the provenance neighborhood (story 1.44,
// kogaki#302, umbrella kogaki#300).
//
// A WIDENING OF THE SETTLED STRAND SET, offered BESIDE it. The neighborhood as a report: a report,
// never a proposal — it narrows nothing, so the second-proposer boundary
// does not engage, and the full population stays reachable.
//
// INPUT IS THE SETTLED STRAND SET ALONE (the settled-strand-set input v15). There is no Thesis
// argument and a run must not refuse for want of one: the 2026-08-09 owner
// correction withdrew "Thesis" from Terrain's vocabulary on the ground that a
// claim-shaped input is DEAD INPUT here — the substrates below compute over
// member metadata and cannot read a claim, so a required Thesis was an input
// nothing consumed.
//
// THE BOUND IS DECLARED, NOT CHOSEN (the neighborhood join v16, owner selection 2026-08-12).
// The unit is traversal — substrates x depth — and the values are fixed:
// `source_batch` one hop, and nothing else since kogaki#686. They are read
// from the spec here rather than picked: an implementation choosing different
// values settles a spec question silently, and one deriving them from the
// settled set's CONTENT reintroduces the withdrawn input.
//
// SHARED-CARRIER IS OFF AS A VALUE, NOT AS AN ABSENCE. The substrate is
// implemented and its depth is zero, so it enumerates nothing at the declared
// setting and needs no code change if a later amendment turns it on. Writing it
// out is what keeps the neighborhood join's three substrates three.
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
// enumerator's total and by both of the display's counts (PR #392 round 1). A
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
          // records — the same silent-flattery shape the neighborhood defect removes, arriving
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

  // the neighborhood section's shape's PER-FAMILY FIGURES (story 1.45, AC3). Every family that appears
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
  // "no denominator readable" on the display.
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
  // lost — the neighborhood as a report widens, so every suggestion still renders as its own row with
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
// held, extracted when that subcommand retired (SPEC-terrain, the settled-strand-set input v20,
// story 1.69, kogaki#473) so `cmdReport` computes it inside the pull. Reuse,
// never re-derive: a second resolver is how the section and the display it
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
// unjudged, which is the silent-exclusion shape the neighborhood defect exists to remove.
// THE REFUSAL IS A THROW AND THE FILE READER CONVERTS IT (kogaki#861). Every
// refusal below used to call `fail()` directly, which exits the process — so
// the only way to assert one was to spawn a subprocess, and none of them was
// asserted by anything. This is `FormatRefusal`/`emitOrRefuse`'s arrangement
// one module over: the judgment is decided by a PURE function that throws, and
// the one impure caller turns the throw into the same `fail()` the refusal
// always was. The refusal text, its wording and its siting are unchanged; what
// moved is who exits.
export class JudgmentRefusal extends Error {}

// The one converter, so the two readers of a throwing validator cannot drift in
// WHEN they exit — the reason `emitOrRefuse` exists for the format guard.
function orFail(fn) {
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
export function neighborhoodJudgmentsFrom(raw) {
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

// THE NEIGHBORHOOD DISPLAY, composed apart from the command (story 1.45).
//
// Exported and pure over its inputs for the same reason `neighborhoodOf` is:
// the neighborhood section's shape's obligations are properties of what RENDERS, not of what enumerates,
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
// rows FILLED IN LEVEL ORDER `core -> useful -> background` (the neighborhood section's shape, kogaki#741
// ruling 3) — it was "all from the HIGHEST level present" until kogaki#754, a
// single-level premise the fill retires.
//
// WHAT WAS DELETED HERE, and why the deletions are not "kept beside their
// exception": the per-family tallies, the walk-settings line, the "narrows
// nothing" boilerplate, the per-Batch section headers, and the disjointness and
// unresolved footnotes. Each existed to discharge a disclosure obligation that
// the neighborhood defect, the neighborhood as a report or the neighborhood
// section's shape imposes over an enumeration this section no longer performs —
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
// computed inside the display alone, and the bounded Gloss fetch below has to
// reach the SAME set: a fetch over more rows than render pays for rows nobody
// sees, and a fetch over fewer leaves a rendered row unfilled. Two computations
// of "which rows show" is how those two drift, so there is one.
//
// Pure over its input and states every arm rather than returning a bare list:
// the display renders a different sentence for each, and an arm collapsed here
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
  // THE FILL, DETERMINISTIC IN THE HARNESS (the neighborhood section's shape, kogaki#741 ruling 3). Rows
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

export function neighborhoodDisplay({ tag, gids, suggestions, unresolved = [] }) {
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

  // THE BATCH-SIDE RESOLUTION DISCLOSURE (the neighborhood defect, kogaki#691, owner ruling
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
  // THE BATCH-SIDE RESOLUTION GAPS RENDER HERE (kogaki#691, owner ruling
  // 2026-08-29 — the neighborhood defect's duty SURVIVES #686 disposition 4 and is discharged on
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

  // FOUR FIXED LINE CLASSES PER ROW, in the ruled order (kogaki#861, owner
  // report 2026-09-04 and rulings 2026-09-05): the id/level/relation row, the
  // TC-target line, the Gloss line or its marker, the claim line. Each is a
  // fixed class, so the information is always shown explicitly and never only
  // where something happened to be recorded.
  //
  // THE LEVEL MOVED TO THE HEAD OF THE ROW and is gone from the tail of the
  // claim. It ranks the row, and a rank read after the sentence it ranks is a
  // rank the reader has to go back for; the trailing `[core]` is DELETED rather
  // than kept beside the new position, because two carriers for one level is
  // how a later edit updates half of them.
  //
  // THE GLOSS LINE STAYS, ABSENCE MARKERS INCLUDED (owner ruling 2026-09-05).
  // The owner's sketch of the new format omitted it and showed the NEW lines
  // rather than an exhaustive row spec. Dropping the three typed markers with
  // it would have been the worse half of that reading: a row whose shard
  // carried nothing would then render four clean lines and say nothing about
  // the fault —
  //   "A check inherits the trigger of the gate it is sited in, and can be
  //    ANTI-CORRELATED with its own need. … A check anti-correlated with its
  //    need is worse than no check, because its silence reads as a clean
  //    result."
  //   product-lab@ab04cc9bca21a600cd9eb0a594619d3ca899d05f
  //     topics/archive/claude-code-ops.md:24
  //
  // `relation` is plain words rather than a substrate token, because the row is
  // read by the owner and not by a parser.
  //
  // THE GLOSS IS QUOTED AT ITS CITE (kogaki#689). It is a served rendering, so
  // it travels with the address it was read from; a headline rendered bare is
  // the paraphrase-standing-for-a-quote shape the verbatim rule refuses. A row
  // whose shard carried no rendering gets `NO_HEADLINE` — the same abnormal
  // marker `cmdView` and the Brief lane render, so one vocabulary covers the
  // state wherever it arises, and it is a fault to clear rather than prose.
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

// THE FULL REPORT SECTION (SPEC-terrain, the neighborhood as a report v20, story 1.69, kogaki#473).
//
// The neighborhood's owner rendering is a section of `reports/FullReport.md`,
// at the Full Report's ONCE tier, LAST — never a display of its own. The lines are
// `neighborhoodDisplay`'s, reused rather than re-derived: the display's own
// heading (a plain-text line naming tag and set) is replaced by the Markdown
// heading and the `*Seeded by:*` line `report-format.json` v6 declares, and
// everything from the counts line down is the same emitter the neighborhood section's shape's
// obligations were asserted against. A second composer is how the section
// and the enumeration would drift — the reuse rule the licensing issue
// states verbatim.
//
// Exported and pure over its inputs for the same reason `neighborhoodDisplay`
// is: the neighborhood section's shape's obligations are properties of what RENDERS, so a fixture must
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
      "No served material reached the neighborhood: the seam returned no element records, so the enumeration did not run — a different state from an enumeration that ran and found nothing, stated rather than failing the pull (the disclosure discipline of the neighborhood section's shape).",
    ];
  }
  return [...head,
    // Drop only the display's heading line; the tag it carried already heads
    // the report's own title, and the set rides `*Seeded by:*` above.
    ...neighborhoodDisplay({ tag: "", gids, suggestions, unresolved }).slice(1),
  ];
}

// The CLI dispatch runs only when this file IS the entry point. Without the
// guard, importing the module to exercise one of its exported composers runs
// the dispatch with no command, which prints the usage banner and calls
// process.exit — so the module was unimportable and every composer in it was
// reachable only through a subprocess. A mechanism no fixture can call is the
// orphan shape one level in (`orphan-mechanisms-fail-the-suite`).
// ==========================================================================
// the control plane — THE CONTROL PLANE: the workflow table, the run record, the executor.
// (SPEC-terrain, the control plane, v23; kogaki#625 acceptance items 1, 2, 5 and 6; story
// 1.89 / kogaki#652.)
//
// WHERE THIS LIVES, stated rather than left implicit (story 1.89 SQ1). The control plane
// does not decide whether the executor is a sibling module or part of this
// file. Two things decided it here: kogaki#625's licensed artifact list names
// `src/terrain.mjs` and no sibling, so a new module would be an artifact
// no licence covers; and story 1.90 makes these same renderers PRIVATE to the
// executor, which is a smaller and more reviewable edit when caller and
// callee already share a file.
//
// WHAT "THE EXECUTOR HOLDS NO STATE LIST OF ITS OWN" MEANS, precisely —
// because the claim is checkable only if it is stated (the workflow table; #625 item 6):
//
//   Read from the table on EVERY run, and appearing nowhere in this file:
//   the state ids, their ORDER, their KIND, which of them WAIT, which WRITE
//   which artifact, under which GRAMMAR SURFACE, which are CONDITIONAL, which
//   reach a JUDGMENT POINT, and which is TERMINAL.
//
//   Held here: what a KIND MEANS (`KIND_SEMANTICS`), which is interpretation
//   and not sequencing; and the RENDERER HALF (`STATE_WORK`), which the workflow table
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
// the workflow table is control code that knew the ORDER those states run in — and none
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

const WORKFLOW_TABLE = join(REPO, "src/workflow.json");
const RUN_RECORD_FILE = "run-record.json";

// ---- WHO EXECUTED THIS TRANSITION (kogaki#1027) ------------------------------
//
// Every Terrain run before this one started when the model typed
// `node src/terrain.mjs run` into Bash and advanced when the model chose to
// re-enter, and the run record recorded WHICH states completed and never WHO
// executed the transition -- so a run the model drove and a run the Harness
// drove left identical records. `advanced_by` is the field that tells them
// apart, and it is COPIED from the harness's own payload rather than composed
// here: an executor that mints its own attribution records the thing the field
// exists to evidence.
//
// TWO EXECUTOR KINDS, AND THE SECOND IS NAMED RATHER THAN DISGUISED (owner
// selection, 2026-09-09, at the /ship-cycle gate on this issue). `hook` carries
// the three payload fields verbatim. `skill-expansion` carries NO hook fields
// at all, because the skill's `!` line receives no hook payload and inventing
// `hook_event_name: "SkillStart"` would be exactly the fabricated attribution
// the refusal below exists to prevent. The kinds are a closed set: a third one
// is a decision, not an addition.
//
// AND THE SELF-DECLARED KIND IS ONLY TRUSTWORTHY BECAUSE THE BASH ROUTE IS
// DENIED. `.claude/hooks/gate-terrain-executor.py` refuses any Bash command
// naming this file with any verb but `--status`, so a model cannot type
// `terrain.mjs start` and obtain a start-attributed record. The deny is the
// other half of this field, not a separate guard beside it, which is why the
// Removal Test fixture exercises it.
const EXECUTOR_KINDS = ["hook", "skill-expansion"];

// The start act's attribution. It carries no hook fields, deliberately -- see
// above.
const SKILL_EXPANSION_EXECUTOR = { executor: "skill-expansion" };

// WHO OPENED THE POINTER THIS ACT WRITES (kogaki#1051).
//
// The pointer already records WHICH gate is open and WHOSE session it is open
// for. What it could not say is whether the model has had a turn since -- and
// for the START act the answer is no, by construction: the harness runs the
// skill's `!` line BEFORE it runs UserPromptSubmit on the prompt that invoked
// the skill, so the gate is already open when the prompt that opened it is
// judged, and `gate-open-terrain-gate.py` refused it. On 2026-09-09 that
// wedged two sessions at their first prompt with no model turn ever running,
// and the recovery was to move the pointers out of the directory by hand.
//
// A PROCESS-WIDE VARIABLE, AND THAT IS THE SCOPE OF THE FACT. One invocation
// of this file is one act with one attribution: `cmdRun` receives it from its
// caller and every pointer written under that call was opened by it. Threading
// it through `emitGateDeclaration`'s callers -- the option composers, several
// frames down -- would carry the same single value along a longer path and
// give a second place for it to disagree with itself.
let OPENED_BY = null;

// Set once per act, by the one caller that knows: see `cmdRun`.
function setOpenedBy(advancedBy) {
  OPENED_BY = (advancedBy && EXECUTOR_KINDS.includes(advancedBy.executor))
    ? advancedBy.executor
    : null;
}

// The hook payload, read from stdin ONCE per act. Returns null when there is
// nothing readable there: no payload, an empty stream, or bytes that are not
// JSON. It never throws and never exits -- the REFUSAL is the caller's, so
// that the one place a missing payload is turned into a stop is the one place
// the message can name what to do about it.
export function readHookPayload(raw = null) {
  let text = raw;
  if (text === null) {
    // A TERMINAL IS NOT A PAYLOAD (PR #1034 round 1, nit). `readFileSync(0)`
    // against a TTY BLOCKS, so an invocation with a terminal attached — a
    // script, a cron, a second repository, anywhere outside the deny — would
    // hang instead of printing the refusal that names the two acts. Reachable
    // only there, and cheap to close.
    if (process.stdin.isTTY) return null;
    try {
      text = readFileSync(0, "utf8");
    } catch {
      return null;
    }
  }
  if (typeof text !== "string" || !text.trim()) return null;
  let doc;
  try {
    doc = JSON.parse(text);
  } catch {
    return null;
  }
  return (doc && typeof doc === "object" && !Array.isArray(doc)) ? doc : null;
}

// The three fields, copied. A payload missing any of them is NOT a payload for
// this purpose: `advanced_by` with a null `tool_use_id` records that a
// transition happened and not which question executed it, which is the same
// silence the field was added to end.
export function advancedByFromPayload(payload) {
  if (!payload) return null;
  const ev = payload.hook_event_name;
  const sid = payload.session_id;
  const tid = payload.tool_use_id;
  if (typeof ev !== "string" || !ev) return null;
  if (typeof sid !== "string" || !sid) return null;
  if (typeof tid !== "string" || !tid) return null;
  return { executor: "hook", hook_event_name: ev, session_id: sid, tool_use_id: tid };
}

// THE ONE WRITER OF A TRANSITION. Every advance in this executor goes through
// here, so `completed` and `transitions` cannot disagree about what ran -- and
// a state completing without an attribution is unproducible rather than merely
// discouraged.
function completeState(rec, stateId, advancedBy) {
  if (!advancedBy || !EXECUTOR_KINDS.includes(advancedBy.executor)) {
    fail(`transition to ${JSON.stringify(stateId)} has no executor attribution. Every transition names the act that executed it (kogaki#1027); the executor writes none of its own.`);
  }
  rec.completed.push(stateId);
  (rec.transitions || (rec.transitions = [])).push({
    state: stateId,
    advanced_by: advancedBy,
    at: new Date().toISOString(),
  });
}

// Structural validation only. This reads the table's FORM — ids present and
// unique, kinds interpretable, a write naming an artifact, a terminal
// existing. It judges no semantic contract, because the workflow table makes the table
// authoritative over sequencing and "authoritative over NOTHING ELSE".
export function loadWorkflowTable(path) {
  const table = readJson(path);
  if (!Array.isArray(table.states) || table.states.length === 0) {
    fail(`workflow table ${path} declares no states. The workflow table makes this artifact authoritative over sequencing; an empty array is not a flow.`);
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
    fail(`workflow table ${path} declares no terminal state. A generic executor reads the end of a run from the table and never from position (the workflow table).`);
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
//                    (`--no-render`, location and naming v11; the idempotent rerun, the report identity)
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
  // not a countable set, so the two-writer breach write authority exists to forbid was
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
  // direction. What replaces it is not a better count: write authority's one-writer
  // property is made true BY CONSTRUCTION at this issue — one private
  // `writeDisplaySurface`, no second path — which is constrain-generation where
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

// ---- THE RECORD AS IT STANDS, WRITTEN MID-ADVANCE (kogaki#1073 item 3).
//
// The loop's own write at the end of the advance is unchanged and is still the
// release point; this is the same write performed EARLIER as well, after every
// state that completes and after every per-group judge record that lands. An
// advance killed at `ADVANCE_TIMEOUT_S` runs no exit path -- `persistPendingRun`
// is `fail()`'s, and a SIGKILL calls nothing -- so before this the only carrier
// of an interrupted advance's progress was the files on disk, and the run's own
// record said the owner's answered gate was still awaiting an answer.
//
// IT IS THE SAME WRITER AND THE SAME SHAPE, `_dir` stripped exactly as the
// release does, so a checkpoint and a final record cannot disagree about form.
// A failing write is NOT swallowed: the run directory is where every artifact of
// this advance is going, and a checkpoint that could not be written is a fact
// about the run rather than an inconvenience of the tracing.
function checkpointRun(rec) {
  if (!rec || !rec._dir) return null;
  const out = { ...rec };
  delete out._dir;
  return writeRunRecord(rec._dir, out);
}

// CONTROL STATE ONLY (the run record). The survey record is referenced BY PATH and
// nothing is copied out of it — copying the ID->slug map here would discharge
// the control plane's one-record rule by breaching the display-ID rule's single-carrier rule in the same
// act, and the two are satisfiable together only this way. The standing
// refusal this honours is the one at `cmdSurvey`'s own record write.
function newRunRecord(tablePath, table) {
  return {
    workflow: { path: relFromRepo(tablePath), version: table.version ?? null },
    // THE BINARY THIS RUN'S JUDGMENT CALLS EXECUTE (kogaki#1076). Declared here
    // as a null rather than left to appear when it is first written, so a record
    // that was never resolved and one written before the field existed are the
    // same shape and neither reads as a resolution that happened.
    judge_binary: null,
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
    // WHO EXECUTED EACH TRANSITION (kogaki#1027). One row per state that
    // completed, in the order they completed, each carrying the payload the
    // harness supplied. `completed` stays the control list the loop reads;
    // this is the attribution beside it, and `completeState` is the only
    // writer of either.
    transitions: [],
    done: false,
  };
}

function stateById(table, id) {
  return table.states.find((s) => s.id === id) || null;
}

// The path the table declares for the artifact a write state names. Read from
// the table rather than held here, so renaming an owner artifact is a table
// edit and not a code edit (the workflow table's evolvability contract).
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
    || fail("this run has no survey record yet — the state that mints it has not run. Re-enter the executor without --input to advance the flow (the re-entrant executor).");
}

// THE FIXTURE-ONLY STATE PREFIX (kogaki#824). A state id beginning with this
// string is admitted to `STATE_WORK` for the self-test's own throwaway tables
// and is refused a place in the shipped carrier. The workflow table puts the state set in
// `src/workflow.json`, so an id that never enters that file alters no contract
// — and the bound is asserted rather than promised: the pass drives the shipped
// table against this prefix.
// THE SYNTHESIZED HOOK PAYLOAD every fixture spawn feeds the executor
// (kogaki#1027). The executor advances only inside a harness hook event, so a
// fixture that drove it with no stdin would be testing the payload refusal and
// nothing else. Synthesized rather than captured, deliberately: the acceptance
// item is that a run driven by payloads ALONE reaches its end, and a payload
// this pass composes is one no session and no harness supplied.
const FIXTURE_PAYLOAD = JSON.stringify({
  hook_event_name: "PostToolUse",
  session_id: "fixture-session",
  tool_use_id: "fixture-tool-use",
});
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

// The judge pin the two writing states record, from the table that pins the
// model and the invocation the executor actually made (kogaki#1030).
//
// THE MODEL HALF IS OBSERVED AND THE EFFORT HALF IS DECLARED, and the two are
// not conflated: the model is the one this process ran, read from the same
// `judge` block the call read; the effort tier is what the table declares the
// run asks at, because the call carries no effort flag and a value read back
// from nothing would be the provenance lie kogaki#892 exists to prevent.
//
// AN EXPLICIT FLAG STILL WINS. This supplies a default where a hook-driven run
// has no route to supply one; it overrides nothing.
// The judged records the two writing states render FROM, joined from the run
// record rather than from this act's argv (kogaki#1030).
//
// THE RULE IS `full_report`'s OWN, APPLIED TO THE STATES BESIDE IT. That state
// already joins the neighborhood judgment this way, and says why: "J3 wrote the
// path it validated; reading it back here is what makes deleting the judgment
// file after J3 and re-rendering fail loudly — the record still names the path".
// The claims and the subdivision records are in exactly that position: `J1_claims`
// and `J2_subdivision` validated them, and before this act nothing carried them
// forward, so a hook-driven run reached `cotag_groups` with the judgments it had
// just made invisible to it and `full_report` refused for want of an entry the
// run already held.
//
// AN EXPLICIT FLAG STILL WINS, for the fixture and second-repository paths.
function judgmentJoins(rec, args) {
  const j = (rec && rec.judgments) || {};
  const join = {};
  if (j.J1_claims && args.claims === undefined) join.claims = resolve(REPO, j.J1_claims);
  if (j.J2_subdivision && args.subdivisions === undefined) join.subdivisions = resolve(REPO, j.J2_subdivision);
  return join;
}

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
  if (!j.model || !j.effort) return fromRun;
  if (args["judge-model"] !== undefined || args["judge-effort"] !== undefined) return fromRun;
  return {
    "judge-model": String(j.model),
    "judge-effort": String(j.effort),
    ...fromRun,
  };
}

const STATE_WORK = {
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

  // JUDGMENT POINTS. The executor VALIDATES and never composes (the typed judgment points): the
  // refusals are the existing ones — this story adds no new judgment semantics
  // and re-implements none.
  //
  // WHAT kogaki#1030 CHANGES IS WHO PRODUCES THE RECORD, and nothing else. The
  // typed record used to arrive only as a file on argv, and with `--input`,
  // `--at` and `--enter` deleted (kogaki#1027) nothing in a hook-driven run
  // could put one there — so a run reached `J1_claims` and stopped at a refusal
  // asking for a flag no route could supply. The executor now ASKS THE PINNED
  // MODEL for the record itself, writes it, and runs these same refusals over
  // it; an explicit flag still wins and is unchanged.
  //
  // THE VALIDATION BODY IS THE SAME FUNCTION ON BOTH PATHS, which is why it is
  // written once as `validate` and handed to `judgedRecordPath`. Two copies —
  // one for the owner's record, one for the judge's — is two readings of one
  // rule, and it is the shape the two states below this one already refuse.
  J1_claims: async (rec, st, args, table) => {
    const survey = readJson(needSurvey(rec));
    const tag = ownerInput(rec, "TAG_SELECTION")
      || fail("J1_claims needs a tag, and no wait has supplied one yet.");
    const validate = (p) => {
      const { claims, pin } = readClaimsRecord(readJson(p), survey);
      const members = survey.candidates.filter((c) => (c.tags || []).includes(tag));
      const outside = claimsOutsideBound(claims, pin, cotagGroups(members, tag));
      if (outside.length) {
        fail(`${st.id} refuses: ${outside.map((o) => `${o.group} (${o.reason}${o.members.length ? `: ${o.members.join(", ")}` : ""})`).join("; ")}`);
      }
    };
    const path = await judgedRecordPath(rec, st, table, args, "claims",
      () => needCompositionInput(rec, st), validate);
    rec.judgments[st.id] = relFromRepo(resolve(path));
    return null;
  },

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
    // THE SAME COMPOSED ARTIFACT `J1_claims` JUDGED OVER, which is this state's
    // own standing note: semantic subdivision "is composed from the SAME
    // artifact and spends no further read".
    const path = await judgedRecordPath(rec, st, table, args, "subdivisions",
      () => needCompositionInput(rec, st), validate);
    rec.judgments[st.id] = relFromRepo(resolve(path));

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

  // THE NEIGHBORHOOD'S EMITTER AND ITS JUDGMENT POINT (kogaki#690, owner
  // ruling 2026-08-29). The reader existed and nothing produced its input —
  // "a reader with no writer is dead code wearing enforcement's name". These
  // two states are `compose_input → J1_claims` applied a second time, which is
  // the shape this table already uses for exactly this problem.
  //
  // BOTH ARE CONDITIONAL, and that is the answer to what an unjudged pull is.
  // A run naming neither renders the all-unjudged line the neighborhood section's shape already declares,
  // which is a legitimate terminal: refusing it would make the Report
  // unobtainable without an LLM pass, which no ruling asked for. What the
  // declaration removes is the SILENT version — an unjudged run is now a
  // skipped conditional the run record names, not an absent capability.
  // THE THESIS CANDIDATES ARE COMPOSED AND THEIR IDS FIXED BEFORE J3 JUDGES
  // (kogaki#861, owner ruling 2026-09-05). The alternative on the table was one
  // combined judgment composing candidates and neighborhood together; the
  // ordering was chosen instead, and the ground is what a judgment point is
  // for:
  //
  //   "JUDGMENT SITS IN THE GAPS BETWEEN DETERMINISTIC PARTS, NEVER AS A LAYER
  //    AROUND THEM … is the model deciding what happens next, or supplying a
  //    value between two things whose order is already fixed?"
  //   product-lab@ab04cc9bca21a600cd9eb0a594619d3ca899d05f
  //     topics/claude-code-ops.md:24
  //
  // TC1 must MEAN something before a neighbor can be judged against it. With one
  // combined record the model would be supplying the candidate list and the
  // targets into it in the same act, so nothing outside that act could refuse a
  // target naming a candidate the same record invented. Two states put the
  // ordering in the table, where the workflow table keeps it, and the refusal below reads a
  // set the state before it fixed.
  //
  // IT VALIDATES AND NEVER COMPOSES (the typed judgment points), like every judgment point beside
  // it: `readThesisCandidates` is the existing reader and carries the count,
  // arity and membership refusals unchanged. What this state adds is the WRITE
  // — the minted list goes to the run workspace so J3 and the pull read one
  // fixed set of ids rather than each re-deciding what TC1 is.
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
      const p = join(rec._dir, `terrain-judge-input-${st.id}.json`);
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
    // `neighborhoodDisplay` no longer needs an unjudged tally, because after this
    // refusal there is nothing for it to count.
    // THE FIFTH REFUSAL — THE TARGET NAMES A COMPOSED CANDIDATE (kogaki#861).
    // The typed record now carries, per candidate, the Thesis candidate it
    // serves; `neighborhoodJudgmentsFrom` refuses a record with no target and
    // refuses one whose target is not a TC id, and neither can refuse `TC9` in a
    // three-candidate pull — that is a fact about the OTHER state's output, and
    // this is where the two meet. Read from the file the `thesis_candidates`
    // state wrote rather than from argv, for the reason the judgment path is
    // read from the run record one state down: the ids J3 checks against must be
    // the ids the pull will render.
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
      const p = join(rec._dir, `terrain-judge-input-${st.id}.json`);
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
  // A STATE'S OWN RENDERER SETTING A RECORD KEY is the shape kogaki#808's loss
  // has, and it is the shape this seam-free pass could not otherwise stage.
  // TWO states above set a record key and NEITHER is reachable without the
  // gateway, by different routes — stated separately because a disjunction over
  // them is false and an earlier form of this comment asserted one (PR #852
  // round 1): `survey` reaches `cmdSurvey`, which calls `gatewayQuery`
  // DIRECTLY; `neighborhood_input` sets `rec.neighborhood_candidates` and calls
  // no gateway function itself, but opens with `readJson(needSurvey(rec))`, and
  // the survey record it demands is minted by `survey` and by nothing else — a
  // TRANSITIVE dependency, which is a real bar to a seam-free pass and not the
  // direct read the earlier sentence claimed.
  //
  // So the property was asserted through `conditional_entered` instead — a
  // PROXY the executor writes in its own advance loop, three lines from
  // `rec.completed.push(st.id)` — and a persist narrowed to control fields
  // would have kept the pass green while dropping exactly the key #808 was
  // filed over.
  //
  // ADMITTED FOR THE FIXTURE PATH ONLY, and that bound is a CASE rather than
  // this comment: the id carries `FIXTURE_STATE_PREFIX`, and the pass asserts
  // the shipped `src/workflow.json` names no state carrying it. A comment
  // saying "fixture-only" is the shape kogaki#824 exists to stop trusting.
  [`${FIXTURE_STATE_PREFIX}sets_record_key`]: (rec) => {
    rec.fixture_record_key = FIXTURE_RECORD_KEY_VALUE;
    return null;
  },
};

// ---- GATE OPTION COMPOSERS — the mirror of STATE_WORK for the other half of
// the wait rule's split (kogaki#625 item 1, owner selection 2026-08-26).
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
// session's. This is the split the claim re-offer wait was the first case of,
// generalised to every wait the table marks `renders_gate_declaration: true` --
// and it outlived that wait, which kogaki#1030 deleted.
//
// the post-tag-selection window's EMPTY QUESTION ALLOWLIST IS UNTOUCHED, and that is the clause worth
// checking rather than assuming: the executor still asks nothing and still
// renders no question UI. It writes a file and stops. What changed is that the
// file can no longer be written from anywhere else.
// The selector affordance holds four options; one is the registry's standing
// option, so the run contributes at most three (kogaki#1029).
const TAG_OPTION_COUNT = 3;

const GATE_WORK = {
  // THE LISTING RIDES THE DECLARATION, and that is the whole of kogaki#856's
  // display fix. `tag_listing` carries the runtime's own pre-selection
  // rendering over THIS run's survey record, byte-for-byte, through the same
  // format guard that judged it when `tags` printed it — so no session
  // composes the table, retypes it, or is asked to hand over a command that
  // produces it. The session renders these bytes above the question; the
  // question text stays short and the table is never put inside it (owner
  // ruling 4, 2026-09-04).
  //
  // NO RUN-COMPUTED OPTION, and the empty list is the shape rather than an
  // omission (owner rulings 1 and 2, 2026-09-04). Exactly two ways to answer
  // exist: the registry's standing option, which stands for "a method other
  // than co-tags" and is routed nowhere because no other method exists yet,
  // and free-form entry of a tag name. A per-tag option set is not offered —
  // the served tag count is in the hundreds and the selector affordance holds
  // four.
  //
  // REVISED 2026-09-09 (kogaki#1029, the first live hook-driven run): the
  // harness's selector REFUSES a question with fewer than two options, so the
  // one-standing-option shape above was unrenderable — the gate never appeared
  // and the run could not be advanced by anyone. The FORMAT is the surface's
  // (two to four options); the VALUES are the run's. The composer now offers
  // the largest served tags, up to TAG_OPTION_COUNT, each option id being the
  // tag name itself so a click lands exactly where a typed tag lands; the
  // standing option still rides beside them, and any other tag is free text.
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

  // THE ONE WAIT THAT DECLARED NO GATE (kogaki#890, acceptance item 3).
  //
  // `ID_SELECTION` took the owner's G/SG id list as a bare `--input` — a value
  // the model composed after reading the grouping, with no declaration to
  // check it against and no evidence that any question was ever put. That is
  // the same channel the other waits of the table AS IT THEN STOOD had closed --
  // four of them, before kogaki#1030 and kogaki#1087 deleted two -- surviving in
  // the one state a gate-coverage number computed over the DECLARED gates could
  // not see: the enumeration was complete and the uncovered wait was outside it.
  //
  // NO RUN-COMPUTED OPTION, and the empty list is the shape rather than an
  // omission. The answer is a LIST, and a list is not an option: a composed run
  // routinely carries more groups than the selector affordance's four, so a
  // per-group option set would either truncate the owner's view or refuse the
  // run outright. Exactly two ways to answer exist — the standing negation, or
  // free-form entry of the ids — which is `terrain-tag-selection`'s shape in
  // this same table, arrived at from the same constraint.
  //
  // THE GROUPING RIDES THE DECLARATION AS BYTES (kogaki#1087). It rode as a
  // POINTER until this issue -- `groups_artifact` named the file `cotag_groups`
  // wrote and left the rendering to the session, on the ground that inlining it
  // would invent a second rendering surface nothing grammars. That ground was
  // false in one respect and it was the load-bearing one: `report-format.json`
  // grammars `cotag_groups` exactly as it grammars `tag_listing`, so the bytes
  // this state reads have already passed the emit-time refusal at the write, and
  // passing them through `composeOwnerListing` re-checks them against the same
  // surface rather than against a format of this state's own.
  //
  // WHAT THE POINTER COST, observed rather than argued: on the live run of
  // 2026-09-10 the owner was asked which groups to enter with the grouping
  // nowhere on screen -- a pointer is rendered by whoever chooses to open it, and
  // the one act the tag gate proved must not be left to a session is putting the
  // reading in front of the owner. As bytes it is inside the payload the
  // PreToolUse equality check admits, so a grouping that arrives missing or
  // paraphrased is a byte difference and is denied.
  //
  // THE ABSENCE STAYS TYPED AND STAYS A NON-REFUSAL. A run whose `cotag_groups`
  // wrote nothing reaches this wait with no reading to carry, and the gate is
  // still raised: the sentence below rides in the reading's place, so the owner
  // is told what they are not being shown instead of being asked over a silence.
  // Refusing here would wedge the one run that most needs an owner.
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


// ---- THE EXECUTOR --------------------------------------------------------
// ONE entry point, entered once per act (the re-entrant executor). It reads the run record,
// executes table states until the next declared stop, writes that state's
// artifact, and stops. It never blocks on input: every wait in this flow
// spans a chat turn, `parseArgs` reads process.argv only, and supplying a
// stdin path would turn a wait into a prompt — which the post-tag-selection window's empty question
// allowlist for that window forbids.
// NO STOP IN THIS FLOW PRINTS AN INVOCATION (kogaki#856). A hand-over whose
// owner must read something before answering rides the gate declaration for
// that wait — the pre-selection tag listing is the one such reader, carried in
// the TAG_SELECTION declaration, where the executor composes the bytes and the
// session renders them above the question.
//
// THE FIELD IS GONE FROM `field_semantics` TOO, not merely unused. A schema key
// no state declares is an invitation to declare one, and what would then be
// declared is a channel this issue removed.
//
// WHAT WENT WITH IT, stated because the retirement is deliberate and not a
// casualty: kogaki#807's eight fixture cases asserted that every declared
// `owner_reads` key reached the stop output. `checks/registry.json` names the
// condition under which they retire — "or when the table stops declaring
// owner_reads at all" — and that is exactly what happened, so they are retired
// rather than re-pointed at whatever now occupies the same position. A check
// whose unit a redesign dissolved does not become easier to satisfy; it stops
// being a check.
// consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:133

// THE EXECUTOR'S ONE BODY, ENTERED BY TWO ACTS (kogaki#1027).
//
// `advancedBy` is the attribution every transition this act writes will carry,
// and it is resolved by the CALLER -- `cmdRun` from the hook payload on stdin,
// `cmdStart` as the skill expansion. Passing it in rather than reading it here
// is what keeps the "a transition without a payload is refused BEFORE ANY
// WRITE" ordering true by construction: by the time this function runs, the
// attribution already exists or the caller already refused.
//
// `stopAtFirstWait` bounds the start act to what the owner licensed it to
// produce -- `survey` and the stop at TAG_SELECTION -- so a start invocation
// cannot walk a whole run under one skill-expansion attribution.
async function cmdRun(args, advancedBy, { stopAtFirstWait = false } = {}) {
  // The attribution the caller resolved is also what every open-gate pointer
  // this act writes records as `opened_by` (kogaki#1051). Set here rather than
  // at the writer because here is where it is known.
  setOpenedBy(advancedBy);
  // THE START ACT OPENS a workspace; an ADVANCE RESOLVES the one that is open
  // (PR #1034 round 1). An explicit `--run-dir` still wins for both, because a
  // caller who named a directory named it because they hold it -- that is the
  // fixture path and the second-repository path, and it is unchanged.
  let dir;
  // `start --status` is refused BEFORE any workspace is opened (PR #1040
  // round 1, blocking finding): the start act mints a workspace and repoints
  // the open run, and a status read must never do either. `run --status` is
  // the one read-only route.
  if (stopAtFirstWait && args.status) {
    fail("`start --status` is refused: `start` opens a run and `--status` reads one, and the two are not one act. "
      + "The read-only route is `node src/terrain.mjs run --status` (kogaki#1038).");
  }
  if (stopAtFirstWait || args["run-dir"] || process.env.KOGAKI_RUN_DIR) {
    dir = runDir(args);
    if (stopAtFirstWait && !args["run-dir"] && !process.env.KOGAKI_RUN_DIR) writeOpenRunPointer(dir);
  } else {
    dir = readOpenRunPointer()
      || fail(`no Terrain run is open: ${openRunPointerPath()} names none, and an advance is an advance OF a run. `
        + `A run is opened by the terrain skill's own \`!\` line (\`node src/terrain.mjs start\`), which writes that pointer; `
        + `the pointer is removed when the run reaches its terminal. Nothing was written (kogaki#1027).`);
  }
  const tablePath = args.workflow ? String(args.workflow) : WORKFLOW_TABLE;
  const table = loadWorkflowTable(tablePath);

  if (args.status) return reportRunStatus(dir, tablePath, table);

  let rec = readRunRecord(dir);
  // THE START ACT PRODUCES EXACTLY ONE STOP, and this is where that bound is
  // enforced (owner constraint, 2026-09-09). `start` opens a run; it does not
  // resume one. Were it allowed to run against an existing record it could
  // walk states the hook route is supposed to execute, and every one of them
  // would be attributed to the skill expansion -- the attribution defect this
  // issue closes, reintroduced by the one act licensed to carry that kind.
  if (stopAtFirstWait && rec) {
    fail(`a run record already exists at ${runRecordPath(dir)}, so this is a resumption and not a start. `
      + `The start act opens a run and stops at its first wait; every advance after that is executed inside the `
      + `PostToolUse hook for the AskUserQuestion that answered the gate (kogaki#1027).`);
  }
  if (!rec) {
    rec = newRunRecord(tablePath, table);
  } else if (rec.workflow.version !== (table.version ?? null)) {
    // RESUMPTION REFUSES rather than guesses (#625 acceptance item 5). A
    // record written against another version of the table cannot be resumed
    // against this one: the position it names may not mean what it meant.
    fail(`run record ${runRecordPath(dir)} was written against workflow table version ${rec.workflow.version} and this table is version ${table.version}. The run cannot be resumed across a table version change — start a fresh run directory.`);
  }
  // ---- THE JUDGE BINARY, RESOLVED BEFORE THE SURVEY (kogaki#1076 item 1).
  //
  // BEFORE `setRunPersist`, so a start whose resolution fails writes nothing at
  // all: it refuses ahead of the survey and leaves no record naming a run that
  // never began. It stands here rather than at the first judgment state because
  // the fact it establishes -- which executable this run's judgments run -- must
  // be settled by the session that STARTS the run, and a judgment state is
  // reached inside an advance fired from whatever session answered a gate.
  //
  // AND IT RUNS ON EVERY ACT, not only on the start: a record already carrying a
  // resolution is returned untouched, so this is a resolution exactly once per
  // run and a no-op on every advance after it.
  ensureJudgeBinary(rec, table);
  rec._dir = dir;
  // ARMED FROM HERE (kogaki#808). Every refusal raised for the rest of this act
  // — an owner-input refusal, a capture refusal, a judgment state's missing
  // typed record — now persists the transitions this act completed before it,
  // instead of exiting with them on disk and unnamed by the record. The release
  // is at the loop's own write below.
  setRunPersist(dir, rec);

  // ---- THE OWNER-INPUT ENTRY POINT IS DELETED (kogaki#1027 item 5).
  //
  // `--input` carried the owner's words into the executor from a Bash command
  // the model composed, and `--at` bound them to a wait. Both are gone, with
  // NO STUB: a deprecated channel is a channel, and the finding was that this
  // one existed at all. Every wait in the shipped table declares a gate, and a
  // gate is answered by the harness's own capture -- so the route this
  // removes is the route by which the model supplied a fact rather than a
  // selector.
  //
  // REFUSED BY NAME, never ignored. An ignored flag is a session quietly
  // getting a different act than it asked for.
  for (const dead of ["input", "at", "enter"]) {
    if (args[dead] !== undefined) {
      fail(`--${dead} is DELETED (kogaki#1027). The Terrain executor is invoked by hooks only: `
        + `it is started by the terrain skill's own \`!\` line and advanced inside the PostToolUse hook for the `
        + `AskUserQuestion that answered a gate, and every transition names the hook that executed it. `
        + `There is no stub and no replacement flag -- a wait is answered by the owner's click, which `
        + `.claude/hooks/write-gate-capture.py records and the executor reads.`);
    }
  }

  // ---- THE CAPTURED ANSWER, READ RATHER THAN ARGUED (kogaki#890).
  //
  // The three flags that used to carry the owner's answer into this branch —
  // `--capture-option`, `--capture-free-text`, `--tool-use-id` — are REMOVED
  // and refused by name. Removed rather than deprecated, for the reason
  // kogaki#891 gives one lane over: a deprecated channel is a channel, and the
  // whole finding was that this one existed at all.
  for (const dead of ["capture-option", "capture-free-text", "tool-use-id"]) {
    if (args[dead] !== undefined) {
      fail(`--${dead} is REMOVED (kogaki#890). The owner's answer at a declared gate is written by `
        + `.claude/hooks/write-gate-capture.py at the moment the question is answered, from the harness's own payload, and is never composed by the session. `
        + `The gate's byte-fixed call is written beside its declaration and is the one payload the exclusivity hook admits (kogaki#1028); the answer is recorded when the harness reports it, and the advance runs inside that hook. Nothing here is re-entered by hand.`);
    }
  }
  //
  // THE READ IS UNCONDITIONAL AT AN OUTSTANDING DECLARED GATE, which is the
  // structural half of the change. There is no argument to branch on any more,
  // so a re-entry at such a wait either finds the harness's row and advances,
  // or refuses — and "the session did not pass a capture" has stopped being a
  // state the run can be in.
  if (rec.awaiting) {
    const owed = rec.gate_declarations_owed.find((g) => g.state === rec.awaiting);
    if (owed && owed.declaration) {
      // RECORDED REPO-RELATIVE, READ REPO-RELATIVE — and it took two goes to
      // get both halves pointing the same way (PR #671 rounds 1 and 2).
      //
      // The declaration is stored as `relFromRepo(resolve(declPath))`, which
      // strips the repository root and returns an OUT-OF-REPO path unchanged.
      // The first cut read it back through `join(REPO, …)`, which turned an
      // absolute /tmp path into `<repo>/tmp/...` — every capture in a
      // machine-local run workspace died in `readFileSync` before any refusal
      // could speak. Round 1 replaced that with a bare `readJson(…)`, which
      // fixed /tmp and broke the mirror case: Node resolves a relative path
      // against `process.cwd()`, so an IN-REPO `--run-dir` driven from a
      // subdirectory records `terrain/run/…` and reads it from wherever the
      // process happens to stand. The same crash, arriving from the other side.
      //
      // `resolve(REPO, …)` satisfies both, because it returns an
      // already-absolute path untouched and re-roots a repo-relative one
      // against the root `relFromRepo` stripped — so the read is the exact
      // inverse of the write rather than a second convention that agrees with
      // it by luck.
      const decl = readJson(resolve(REPO, owed.declaration));
      // THE PAYLOAD'S OWN ID IS PASSED, and it is the one `advancedBy` already
      // carries: `advancedByFromPayload` copied it out of the harness event
      // that spawned this act, so the two readers of *which question drove
      // this* are one field rather than two (kogaki#1075).
      const captured = readCapturedAnswer(dir, decl, advancedBy && advancedBy.tool_use_id);
      const capOption = captured.option;
      const capFree = captured.freeText;
      const capPath = captured.path;
      const row = captured.row;
      // AN OPTION THE DECLARATION ROUTES NOWHERE IS CAPTURED AND THEN REFUSED
      // (PR #898 round 1). A gate may legitimately offer an answer with no
      // downstream — `terrain-tag-selection`'s standing option stands for a
      // method that does not exist yet — and the answer is still evidence, so the
      // capture is written first and the refusal comes after it. What must NOT
      // happen is the advance: the option id would land where the wait's value
      // goes, and a later state would refuse it as if it were a malformed value
      // of that kind rather than a deliberate answer to this question.
      //
      // DATA, NOT DRIVER CODE, like every other field the executor reads here: the
      // routing is declared per gate in `src/gate-registry.json` and rides into
      // the run declaration, so a second gate with an unrouted option needs no
      // change to this file and no state is named below.
      //
      // THE WAIT STAYS OUTSTANDING, which is what makes the refusal recoverable:
      // `rec.awaiting` is untouched, nothing is pushed onto `completed`, and since
      // kogaki#808 a refusal persists the record — so the capture row is on disk,
      // the declaration is still owed, and re-entering re-offers the same gate.
      const unrouted = (decl.unrouted_options || {})[capOption];
      if (unrouted) {
        fail(`${JSON.stringify(capOption)} is an option gate ${owed.gate_id} declares as ROUTED NOWHERE, so the run does not advance past ${rec.awaiting}. `
          + `The answer was recorded (${capPath}) and the wait is still outstanding — the gate is re-offered at its next raising, and a different answer is captured there. `
          + `The declaration's own reason: ${unrouted}`);
      }
      // The answer IS the owner input for this wait. Adoption, ratification and
      // strand selection are all this one act (the claim re-offer wait: adoption is applying the
      // captured answer), which is why no second command remains to apply it.
      rec.owner_input[rec.awaiting] = capOption !== null ? capOption : capFree;
      completeState(rec, rec.awaiting, advancedBy);
      rec.awaiting = null;
      // THE POINTER IS RETIRED AT THE ADVANCE, not only by the hook. The hook
      // removes it after writing, and this is the second remover rather than a
      // duplicate one: a pointer left behind by a hook that wrote its row and
      // then failed to unlink makes the NEXT question with the same text read
      // as ambiguous, and the hook's own stderr note says exactly that. The
      // advance is the moment the gate stops being outstanding, so it is the
      // moment the forwarding address stops being true.
      try { rmSync(join(openGateDir(), `${decl.gate_instance_id}.json`), { force: true }); } catch { /* a stale pointer costs a re-render, never an answer */ }
      console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — written by the harness at the question, never argued.`);
    }
  }

  // ---- The advance. Order, kind, conditionality and stopping all come from
  // the table; nothing below names a state.
  // NOTHING ENTERS A CONDITIONAL STATE ANY MORE, and that is the stated cost of
  // deleting `--enter` (kogaki#1027 item 5). `--enter` was a model-typed
  // selector: the session decided that a conditional state should run and said
  // so on a Bash command line. With the flag gone and no computed condition in
  // its place, every conditional state is SKIPPED and the record says so --
  // which is what the executor already did on any act that omitted the flag.
  //
  // NAMED RATHER THAN HIDDEN: the shipped table's ONE remaining conditional
  // state, TRIM_RATIFICATION, is unreachable until a later child of kogaki#1025
  // makes its declared condition something the executor evaluates. The empty set
  // below is that fact, written once.
  //
  // IT WAS TWO. `CLAIM_REOFFER` was the other, and kogaki#1030 deleted it rather
  // than giving it the computed condition this comment anticipated -- because
  // that issue's item 2 requires the two judgments and the co-tag write to
  // complete inside one hook, and a wait sited between them cannot be made
  // reachable without falsifying that. Recorded here because a reader meeting a
  // one-member set where the history says two should be able to tell a deletion
  // from a state that quietly stopped being listed.
  const entered = new Set();
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
      // the wait rule / AC6: the executor renders NO gate declaration and NO question
      // UI. For a wait the table marks `renders_gate_declaration: true` the
      // obligation is RECORDED and named on stop; rendering it is not this
      // story's, and inventing one here would put a declaration behind a
      // runtime that the post-tag-selection window's allowlist keeps empty for the other two waits.
      if (st.renders_gate_declaration && !rec.gate_declarations_owed.some((g) => g.state === st.id)) {
        // AND THE EXECUTOR COMPOSES IT (kogaki#625 item 1). The pre-item-1 form
        // recorded the id of a state that owed a declaration and left composing
        // it to a `gate` invocation outside the run — which is how a session
        // minted run state the executor never saw. Composing is `record`, and
        // record is engine work; the RENDERING is the harness UI's, over the
        // byte-fixed call the exclusivity hook admits (kogaki#1028), and is
        // still not performed here.
        //
        // the workflow table binds this exactly as it binds a renderer: a new gate state is a
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
            unwritten: `this runtime has no option composer bound to ${JSON.stringify(st.id)} — the workflow table: a GATE state is a table row PLUS an option composer, and the executor invents neither options nor a judgment` });
        } else {
          // THE WAIT IS UNRECORDED BEFORE THIS REFUSAL (PR #821 round 1). The
          // branch above has already set `rec.awaiting`, and since kogaki#808
          // made a refusal persist the record, that assignment would now
          // OUTLIVE this refusal — leaving a record whose `awaiting` names a
          // state whose declaration was never composed, which the pre-loop
          // `--input` guard admits precisely because no declaration exists.
          // Reachable only on a malformed table, and the hole it grazes is the
          // one #625 item 1 closed, so the assignment is retracted rather than
          // left for the shipped table's `gate_id` coverage to keep unreachable.
          const gateId = st.gate_id || (() => {
            rec.awaiting = null;
            return fail(`workflow state ${JSON.stringify(st.id)} has an option composer bound to it and names no gate_id. field_semantics requires the key of exactly the states whose renders_gate_declaration is true.`);
          })();
          const { options, extra } = compose(rec, st, args, dir);
          const declPath = emitGateDeclaration(dir, gateId, options, extra || {});
          rec.gate_declarations_owed.push({ state: st.id, gate_id: gateId, declaration: relFromRepo(resolve(declPath)) });
        }
      }
      stopped = st;
      break;
    }

    if (st.kind === "terminal") {
      completeState(rec, st.id, advancedBy);
      rec.done = true;
      // THE RUN IS NO LONGER OPEN, so the pointer stops naming it. Cleared here
      // rather than by a reaper: the terminal is the moment the fact changes,
      // and a pointer outliving its run is what makes the NEXT `start` look
      // like a resumption of something finished.
      clearOpenRunPointer();
      stopped = st;
      break;
    }

    const work = STATE_WORK[st.id];
    if (!work && kind.needsRenderer) {
      fail(`workflow state ${JSON.stringify(st.id)} is kind ${JSON.stringify(st.kind)} and this runtime has no renderer bound to it. The workflow table: a new state is a table row PLUS a renderer — the executor interprets the table and invents neither a renderer nor a judgment.`);
    }
    // THE AUTHORITY IS HELD FOR THE DURATION OF A WRITING STATE AND NO LONGER
    // (write authority v28, kogaki#681). Scoped by `try/finally` rather than by setting
    // and clearing around the call: a renderer that `fail`s would otherwise
    // leave the authority standing for whatever ran next in the same process.
    let outcome = null;
    if (work) {
      const held = WRITING_STATE;
      if (st.kind === "write") WRITING_STATE = st.id;
      try { outcome = await work(rec, st, args, table); }
      finally { WRITING_STATE = held; }
    }
    if (st.kind === "write") {
      // A WRITE STATE THAT LEGITIMATELY WROTE NOTHING IS NOT A RENDERER THAT
      // NAMED NO ARTIFACT (PR #667 round 1 finding 2). The two were one branch,
      // so making `full_report` OBSERVE its path turned two live non-writing
      // paths into executor aborts: `run --no-render`, which location and naming v11 licenses
      // ("--no-render opts out of the rendering"), and the idempotent-rerun
      // branch, which the report identity rules "IDEMPOTENT, not a duplicate" and which
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
    completeState(rec, st.id, advancedBy);
    // AFTER EVERY COMPLETED STATE (kogaki#1073 item 3). The advance that was
    // killed on 2026-09-10 had completed `compose_input` and `J1_claims` and its
    // record named neither, because the only write was the one below.
    checkpointRun(rec);
  }

  // THE PENDING RECORD IS RELEASED HERE, at the one place the loop's own write
  // happens (kogaki#808). Everything between the arming ABOVE — at the top of
  // this act, beside `rec._dir = dir` — and this line is the window in which a
  // refusal would otherwise have discarded the act's completed transitions.
  setRunPersist(null, null);
  delete rec._dir;
  const recPath = writeRunRecord(dir, rec);

  console.log("");
  if (stopped && stopped.kind === "wait") {
    console.log(`Executor STOPPED at ${stopped.id} — a wait (the wait rule). ${stopped.owner_supplies ? `The owner supplies: ${stopped.owner_supplies}.` : ""}`);
    // NO INVOCATION IS PRINTED HERE (kogaki#856). A wait whose owner must READ
    // something before answering carries the reading in its gate declaration,
    // where the session renders it above the question — so this stop names the
    // wait and what the owner supplies, and never a command to type.
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
      // THE READING COMES BEFORE THE QUESTION, and the stop says so rather than
      // leaving the order to the session (kogaki#856). A declaration carrying a
      // rendering carries it so the owner can answer from it; rendered after the
      // question, or not at all, it is the defect this issue was filed about.
      // AND THE CALL IS NAMED, NOT DESCRIBED (kogaki#1028 item 1). The two lines
      // this replaces told the session what to compose; a session that composed
      // nothing at all was indistinguishable from one that had not been told.
      // The payload is now a file, the only admissible act while the pointer is
      // open is sending it byte-for-byte, and `.claude/hooks/gate-open-terrain-
      // gate.py` is what makes that true rather than this sentence.
      const callHere = join(dir, `${stopped.gate_id}${GATE_CALL_SUFFIX}`);
      if (existsSync(callHere)) {
        console.log(`The AskUserQuestion call is WRITTEN: ${callHere}`);
        console.log(`Send that file's contents as the tool_input, byte-for-byte — it already carries the reading (\`tag_listing\`) above the question. Nothing is retyped, summarized, reformatted or pre-selected, and the executor renders no question UI of its own (the post-tag-selection window).`);
        // AND THE BYTES ARE HERE, NOT ONLY THEIR ADDRESS (kogaki#1057). On
        // 2026-09-09 at 15:48 UTC this stop named the file and printed none of
        // it. The session's one admissible act needed those bytes; the act that
        // fetches bytes is a `Read`, and `.claude/hooks/gate-open-terrain-
        // gate.py` denies every tool inside the interval, no tool exempt. The
        // two refusals were each correct and jointly unrenderable: a payload
        // named and not printed is a payload no admissible act can obtain.
        // A PATH IS AN INSTRUCTION TO READ; the interval closes over the read.
        // So the start act delivers the payload on the one channel it already
        // owns to the session — this stdout, which the skill expansion hands
        // over before any tool exists to deny. THE FILE STAYS THE REFERENCE:
        // the PreToolUse equality check is unchanged and still compares against
        // it, so a payload that arrives paraphrased is refused exactly as
        // before, and nothing here admits a second act into the interval.
        // ONE SITE, BOTH ENTRIES (kogaki#1057 item 2). A re-entry that stops at
        // a gate wait with a written call prints through this same branch, so
        // "the same holds at re-entry" is a property of where this stands
        // rather than a second copy that could drift from it.
        console.log(`Its bytes are below — the payload itself, not a path to one. No tool is admissible inside the open-gate interval, the Read that would fetch this file included, so a call named and unprinted is one nothing can obtain (kogaki#1057).`);
        console.log("```json");
        console.log(readFileSync(callHere, "utf8").replace(/\n+$/, ""));
        console.log("```");
        console.log(`While this gate is open, every other tool call is DENIED and the turn cannot end until the answer is captured (kogaki#1028).`);
      } else {
        console.log(`No AskUserQuestion call could be composed for this gate, and the reason is on the open-gate pointer (\`gate_call_unavailable\`). Render the declaration's options verbatim, nothing pre-selected, free text on.`);
      }
      console.log(`Then re-enter with a bare  run --run-dir ${dir}  — the answer is read from the harness's own capture, written by .claude/hooks/write-gate-capture.py when the owner answers. No flag carries it (kogaki#890).`);
      console.log(`A bare --input is refused at a gate wait: it would skip the declaration's own option check and the tool_use_id that evidences the rendering.`);
    } else {
      console.log(`This wait declares a gate and its declaration is OWED AND UNWRITTEN: ${(owedHere && owedHere.unwritten) || "no option composer is bound to this state"}.`);
      console.log(`The run is not stuck — the workflow table makes a gate state a table row PLUS an option composer, and this table names one this runtime does not bind. Nothing can be captured here until it does.`);
    }
  } else if (stopped && stopped.kind === "terminal") {
    console.log(`Executor reached ${stopped.id} — terminal (the workflow table). The run is over.`);
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
    || fail(`no run record at ${runRecordPath(dir)}. A run's counts are read from its record alone (the run record).`);
  const derived = derivedBaseline(table);
  const declared = table.counted_baseline || {};
  const counts = runCounts(rec);
  console.log(`Run record: ${runRecordPath(dir)}`);
  console.log(`Workflow table: ${relFromRepo(tablePath)} (version ${table.version})`);
  console.log(`Position: ${rec.done ? "done" : rec.awaiting ? `awaiting ${rec.awaiting}` : "advancing"}; ${rec.completed.length} state(s) completed.`);
  console.log(`Survey record (by path, the run record): ${rec.survey_record || "not yet minted"}`);
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

function main() {
const [cmd, ...rest] = process.argv.slice(2);
const args = parseArgs(rest);
switch (cmd) {
  case "survey": cmdSurvey(args); break;
  case "cotags": cmdCotags(args); break;
  case "compose-input": cmdComposeInput(args); break;
  case "report": cmdReport(args); break;
  // the control plane's ONE ENTRY POINT, entered once per act (the re-entrant executor). Every standalone
  // owner-facing act is now a state of the table, reachable only through here.
  case "run": {
    // ---- THE PAYLOAD GATE, BEFORE ANY WRITE (kogaki#1027 item 4).
    //
    // `--status` is read-only and is the ONE verb the PreToolUse deny admits
    // from a Bash command, so it must not require a payload: an inspection
    // route that needed a hook event would leave a stuck run unreadable by the
    // one person able to unstick it.
    //
    // EVERYTHING ELSE REFUSES HERE, which is before `runDir` -- so a refused
    // act creates no run directory, writes no record and prunes no lane. That
    // ordering is the item's own wording ("refused before any write") and it
    // is why this gate sits in the dispatcher rather than inside `cmdRun`.
    if (args.status) { cmdRun(args, null); break; }
    const advancedBy = advancedByFromPayload(readHookPayload());
    if (!advancedBy) {
      fail(`the executor advances only inside a harness hook event, and no hook payload carrying `
        + `hook_event_name, session_id and tool_use_id was readable on stdin. Nothing was written. `
        + `A Terrain run is STARTED by the terrain skill's own \`!\` line (\`node src/terrain.mjs start\`) and `
        + `ADVANCED inside the PostToolUse hook for the AskUserQuestion that answered its gate `
        + `(.claude/hooks/advance-terrain.py); \`run --status\` is the only verb reachable from a Bash `
        + `command, and it is read-only (kogaki#1027).`);
    }
    cmdRun(args, advancedBy);
    break;
  }
  // ---- THE START ACT (kogaki#1027 item 1). Executed by the harness's skill
  // expansion -- the terrain skill file's one `!` line runs this before the
  // model sees anything. It opens the run, runs to the first wait, and stops;
  // its transitions carry the `skill-expansion` executor kind and no hook
  // fields, because no hook event produced them and inventing one would be the
  // fabricated attribution this issue removes.
  case "start": cmdRun(args, SKILL_EXPANSION_EXECUTOR, { stopAtFirstWait: true }); break;
  case "self-test": {
    // The composed-form fixture pass (kogaki#612): pure, seam-free — every
    // case constructs its own inputs, so the trial runs with no gateway.
    let n = 0; const bad = [];
    const ok = (name, cond) => { if (cond) n++; else bad.push(name); };
    // THE ANSWERS KEY IS THE QUESTION AS SENT (PR #1048 round 1, finding 1). A
    // fixture answering with the bare declaration question would pass against a
    // pointer that also carries the bare question, and both are wrong together.
    const sentQ = (rd, decl) => {
      const p = join(rd, `${decl.id}${GATE_CALL_SUFFIX}`);
      if (!existsSync(p)) return decl.question;
      const q = readJson(p);
      return q.questions[0].question;
    };
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

    // ---- AN EMPTY SURVEY IS A REFUSAL (kogaki#1026). The cases drive the
    // composer the refusal is made of, and the ACT is asserted beside it in
    // `checks/check-terrain-runtime.sh`'s sibling arm — the composer answering
    // correctly while the caller printed and carried on is exactly the state
    // the 2026-09-09 runs were in.
    //
    // THESE ARE THE REMOVAL TEST TOO (acceptance 3). Nothing here reads the
    // skill file or the Spec: `surveyEmptinessRefusal` is a pure function of
    // this module, so the cases pass with both absent from the tree, which is
    // what makes the refusal the executor's own code path rather than a rule
    // carried in prose beside it.
    ok("the miss shape refuses as a statement about the CALL, naming 0 served lines and the pin",
      (() => {
        const r = surveyEmptinessRefusal(0, 0, "product-lab@0f31c3b");
        return typeof r === "string"
          && /0 served line\(s\)/.test(r)
          && r.includes("pin product-lab@0f31c3b")
          && /about the CALL/.test(r);
      })());
    ok("a served response with records and no Lesson refuses as a statement about the CORPUS, naming the count and the pin",
      (() => {
        const r = surveyEmptinessRefusal(12, 0, "product-lab@0f31c3b");
        return typeof r === "string"
          && r.includes("12 served record(s)")
          && r.includes("pin product-lab@0f31c3b")
          && /about the CORPUS/.test(r);
      })());
    ok("an absent pin is NAMED rather than elided — the operator is told which pin was read, or that none was",
      surveyEmptinessRefusal(0, 0, undefined).includes("pin absent"));
    ok("a survey with candidates is not a refusal, so the ordinary path is untouched",
      surveyEmptinessRefusal(0, 1, "product-lab@0f31c3b") === null
      && surveyEmptinessRefusal(9, 4, "product-lab@0f31c3b") === null);
    ok("the two refusals are DISTINGUISHABLE — the whole point is telling the call apart from the corpus",
      surveyEmptinessRefusal(0, 0, "p@a") !== surveyEmptinessRefusal(12, 0, "p@a"));
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
    // class's whole purpose — the display-ID rule's absence case reaching the owner surface —
    // and it had never once been true, on either surface, because the failure
    // fires only on the abnormal path nothing exercised.
    {
      const grammar = loadGrammar(REPORT_FORMAT);
      const emitted = displayIdAbnormalLine(2, 3);
      const admits = (surface) => {
        try { refuseUnlessConformant(surface, emitted, grammar); return true; }
        catch (e) { if (e instanceof FormatRefusal) return false; throw e; }
      };
      // ONE DECLARING SURFACE. `cotag_groups` is the only surface an emit site
      // renders this line into (the two call sites above, in the co-tag group
      // renderer), so it is the only surface asserted here — a surface no emit
      // site reaches would be admitted against nothing.
      for (const surface of ["cotag_groups"]) {
        ok(`${surface} admits the line displayIdAbnormalLine actually emits`, admits(surface));
      }
      // The control: an abbreviated form whose tail carries NO digit worked
      // before this repair and must still work, so the fix is not a widening.
      ok("an abbreviated form with a digit-free tail still matches (classification)",
        (() => {
          try {
            refuseUnlessConformant("cotag_groups",
              "Classification: NAVIGATION (SPEC.md, the second-proposer boundary — it ranks nothing, narrows nothing and hides nothing.)",
              grammar);
            return true;
          } catch (e) { if (e instanceof FormatRefusal) return false; throw e; }
        })());
    }

    // ---- the control plane CONTROL PLANE (story 1.89). Seam-free: every case below either
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
          { input: FIXTURE_PAYLOAD, encoding: "utf8" });
        return r.status !== 0;
      };
      const terminal = { id: "done", kind: "terminal" };

      // A REFUSAL IS NOT A ROLLBACK (kogaki#808). The specimen was
      // `J3_neighborhood`: `neighborhood_input` writes the candidate
      // enumeration into the run directory, the judgment state then refuses for
      // want of `--neighborhood`, and `fail()` exited before the loop's own
      // write — so the enumeration was on disk and the record did not name it.
      //
      // THE ARM DRIVES THE PROPERTY, NOT THE SPECIMEN, and that is a choice
      // rather than a shortcut: `neighborhood_input` reads the seam, and this
      // pass is seam-free by construction. What makes the substitution faithful
      // is that the specimen's loss had nothing to do with the neighborhood —
      // it was a completed transition discarded by a later refusal in the same
      // act, which is exactly what this fixture stages.
      //
      // THE REFUSAL MUST FIRE INSIDE THE LOOP, and the first cut of this arm did
      // not: it used an uninterpretable KIND, which `loadWorkflowTable` refuses
      // at load, before any state runs. Nothing had completed, so nothing was
      // lost, and the arm passed against the unfixed runtime for a reason that
      // had nothing to do with the property. The fixture below refuses at the
      // renderer binding instead — a check the loop makes per state, after the
      // states before it have completed.
      {
        const tp = join(scratch, "refusal-persists.json");
        const rd = join(scratch, "rd-refusal-persists");
        mkdirSync(rd, { recursive: true });
        writeFileSync(tp, JSON.stringify({ version: 1, states: [
          { id: "a", kind: "compute" },
          // THE CONDITIONAL STATE IS NOW SKIPPED RATHER THAN ENTERED
          // (kogaki#1027). `--enter` was the selector that entered one and it is
          // deleted, so the loop-bookkeeping FIELD this arm needs beside
          // `completed` is `conditional_skipped` instead of
          // `conditional_entered`. The property under test is unchanged — a
          // refusal persists what the act completed, fields included — and it
          // is asserted over the field the loop still writes.
          { id: "cond", kind: "compute", conditional: "never entered: the selector that entered a conditional state is deleted (kogaki#1027)" },
          { id: `${FIXTURE_STATE_PREFIX}sets_record_key`, kind: "compute" },
          { id: "unrendered", kind: "write", writes: "display" },
          terminal,
        ] }));
        const r = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rd, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8" });
        const persisted = readRunRecord(rd);
        ok("a refusal raised inside a run still refuses — exit is non-zero and the message is the refusal's own",
          r.status !== 0 && /no renderer bound to it/.test(r.stderr || ""), (r.stderr || "").trim().slice(0, 120));
        ok("a refusal PERSISTS the run record, so the transitions the same act completed survive it (kogaki#808)",
          persisted !== null, "no run record was written at all");
        ok("the persisted record names the state that completed before the refusal — a refusal stops being a rollback of what preceded it",
          !!persisted && Array.isArray(persisted.completed) && persisted.completed.includes("a"),
          persisted ? JSON.stringify(persisted.completed) : "(no record)");
        // A FIELD BESIDE THE COMPLETION LIST (PR #821 round 1). The loss #808
        // names is a FIELD — `neighborhood_candidates` on disk and unnamed by
        // the record — so a pass asserting `completed` alone stays green through
        // a later narrowing of what is persisted, and re-opens the specimen
        // while reporting nothing.
        //
        // `conditional_entered` IS LOOP BOOKKEEPING, AND THE COMMENT THAT SAID
        // OTHERWISE WAS FALSE (kogaki#824, shipped at 91b4947 and corrected
        // here). It read "a transition's own record effect rather than the
        // loop's bookkeeping of which states ran"; the executor writes it in the
        // advance loop three lines from `rec.completed.push(st.id)` and beside
        // `conditional_skipped`. So this case NARROWS the seam and does not
        // close it: it fails a persist reduced to `{completed}` alone, and
        // PASSES one reduced to control fields — which is the narrowing the
        // round-1 finding actually named. The case below is the one that binds
        // the property, and the two are kept apart so a later reader can tell
        // which assertion carries which claim.
        ok("the persisted record carries a FIELD the loop set — not only the list of what completed",
          !!persisted && Array.isArray(persisted.conditional_skipped) && persisted.conditional_skipped.includes("cond"),
          persisted ? JSON.stringify(persisted.conditional_skipped) : "(no record)");
        // THE CASE THAT BINDS THE PROPERTY (kogaki#824). `fixture_record_key` is
        // written by the fixture-only state's OWN RENDERER and by nothing else —
        // no loop touches it — so a persist reduced to control fields drops it
        // and this case alone goes red. That is the discrimination the case
        // above cannot make, and it is asserted on the VALUE rather than on
        // presence, so a persist that carried the key with its contents lost
        // fails too.
        ok("the persisted record carries a key written by a STATE'S OWN RENDERER, which is the shape of the loss #808 names — a persist narrowed to control fields drops this while keeping the case above green",
          !!persisted && persisted.fixture_record_key === FIXTURE_RECORD_KEY_VALUE,
          persisted ? JSON.stringify(persisted.fixture_record_key) : "(no record)");
        // THE FIXTURE-ONLY ADMISSION IS BOUNDED BY THIS CASE, never by the
        // comment in `STATE_WORK`. The workflow table puts the state set in the carrier, so
        // what makes the renderer above harmless is that its id never reaches
        // `src/workflow.json` — asserted here rather than trusted, because an
        // admission whose whole guarantee is a comment is the class kogaki#824
        // is a member of.
        {
          // THE UNREADABLE-CARRIER GUARD IS DECLINED, AND THE DECLINE IS
          // MEASURED (PR #852 round 1, out-of-dimension). The observation — that
          // an unreadable `src/workflow.json` would abort here with a parse
          // error rather than failing this case by name — is correct in
          // principle and UNREACHABLE at this head: the module reads the same
          // carrier at evaluation time, so a malformed table kills the process
          // at import and this case never runs. Verified by writing `{ not json`
          // into the carrier: the pass dies in ModuleJob.run and prints no case
          // at all. A try/catch here would be dead code, which is the shape this
          // PR exists to argue against.
          const shipped = readJson(WORKFLOW_TABLE);
          const leaked = (shipped.states || []).map((x) => String(x.id))
            .filter((id) => id.startsWith(FIXTURE_STATE_PREFIX));
          ok("the shipped workflow table names no fixture-only state — the STATE_WORK admission is bounded by a case, not by a comment",
            Array.isArray(shipped.states) && shipped.states.length > 0 && leaked.length === 0,
            JSON.stringify(leaked));
        }
        ok("the persisted record carries no internal run-directory handle — the refusal path writes the same shape the loop's own write does",
          !!persisted && persisted._dir === undefined);
      }

      // ITEM 2 OF THE SAME ISSUE: the flag existed, the table named it, and the
      // one surface an owner reads did not. Asserted here because a usage block
      // is exactly the kind of prose that drifts from the argument it documents
      // with nothing observing the gap.
      {
        const r = spawnSync(process.execPath, [selfPath], { encoding: "utf8" });
        const usage = (r.stdout || "") + (r.stderr || "");
        ok("`run` usage names --neighborhood, the flag whose absence was previously discoverable only from a refusal",
          /run \[--run-dir[\s\S]{0,400}--neighborhood F/.test(usage));
        ok("`report` usage names the identity QUADRUPLE rather than the triple it was widened from at kogaki#741",
          /QUADRUPLE \(substrate pin/.test(usage) && !/identified by the TRIPLE/.test(usage));
      }

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
          owner_artifacts: { display: { path: "reports/CoTagGroups.md", writer: "one" } },
          states: [{ id: "not_a_shipped_state", kind: "write", writes: "display" }, terminal],
        }));
      ok("an owner input arriving with no outstanding wait is refused — the WAIT is what admits it",
        refuses("input-no-wait", null, ["--input", "claude-code-ops"]));
      rmSync(scratch, { recursive: true, force: true });
    }

    // THE LANE BINDING (kogaki#750). Every case above drives an explicit
    // `--run-dir`, which is the path the relocation did NOT touch, so on their
    // own they are green about a runtime still writing to the retired home
    // directory. These read the DEFAULTS.
    {
      const laneRoot = laneDir("terrain");
      ok("the report record store defaults into the terrain lane",
        reportsDestination({}) === join(laneRoot, "reports"), reportsDestination({}));
      ok("the terrain lane resolves under the repository's runs/ directory",
        laneRoot === join(REPO, "runs", "terrain"), laneRoot);
      ok("no default record destination resolves under a home directory",
        !reportsDestination({}).includes(`${sep}.kogaki${sep}`));
      ok("an explicit --report-dir still wins over the lane default",
        reportsDestination({ "report-dir": "/tmp/elsewhere" }) === "/tmp/elsewhere");
      // NOT ASSERTED HERE, stated rather than left to look covered: `runDir`'s
      // DEFAULT branch. Exercising it calls `enterRun`, which prunes this
      // repository's own terrain lane — a fixture pass that evicts a
      // developer's run workspaces reports a defect by causing one. The
      // arithmetic it delegates to is asserted in `src/runs.mjs --self-test`
      // against a scratch root; what is unasserted here is one expression
      // naming the lane, and that is the honest size of the gap.
      ok("an explicit --run-dir is honoured and creates exactly it", (() => {
        const d = join(tmpdir(), `terrain-rundir-${process.pid}`);
        const got = runDir({ "run-dir": d });
        const fine = got === d && existsSync(d);
        rmSync(d, { recursive: true, force: true });
        return fine;
      })());
    }

    // ---- THE FIRST-TAG GATE CARRIES ITS LISTING (kogaki#856).
    //
    // THE DEFECT THESE ASSERT AGAINST. At `TAG_SELECTION` the executor printed
    // a block headed "READ FIRST, and run it YOURSELF" naming three commands
    // for the owner to type, and the listing itself never reached the screen.
    // The owner does not run commands, so the owner was asked to name a tag
    // with nothing to choose from and selected from memory. Two prior issues
    // (#737, #807) repaired this area and both closed on artifact diffs while
    // the hop stayed broken.
    //
    // WHY THESE REPLACE kogaki#807's EIGHT CASES RATHER THAN JOINING THEM. Those
    // asserted that every `owner_reads` key reached the stop output, and this
    // change removes the field. `checks/registry.json` names the retirement
    // condition in the member's own removal signal — "or when the table stops
    // declaring owner_reads at all" — so they are RETIRED, not re-pointed at
    // whatever now occupies the same structural position. A check whose unit a
    // redesign dissolved does not become a lenient check; it stops being one.
    // consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:133
    {
      const wf = readJson(join(REPO, "src", "workflow.json"));
      const states = wf.states || [];
      const ts = states.find((st) => st && st.id === "TAG_SELECTION");

      // THE CONCEPT IS GONE, not merely unused on one state. A schema key no
      // state declares is an invitation to declare one, and what would be
      // declared is the channel this issue removed.
      ok("no state in the shipped table declares an owner_reads hand-over — the field and its renderer are retired",
        states.every((st) => st && st.owner_reads === undefined)
          && (wf.field_semantics || {}).owner_reads === undefined,
        states.filter((st) => st && st.owner_reads).map((st) => st.id).join(", ") || "field_semantics still declares it");
      ok("no owner-executed entry point survives — the map is present and empty, so an empty set is stated rather than dropped",
        wf.owner_executed_entry_points !== undefined
          && Object.keys(wf.owner_executed_entry_points).length === 0,
        JSON.stringify(wf.owner_executed_entry_points));

      // THE WAIT MUST ACTUALLY REACH THE COMPOSER. Either half missing lands it
      // in the executor's "OWED AND UNWRITTEN" branch, where the run is not
      // stuck and the listing is never composed — which is the pre-fix
      // behaviour wearing a gate's clothes.
      ok("TAG_SELECTION declares a gate and names a gate_id the registry carries",
        !!ts && ts.renders_gate_declaration === true
          && (GATES_REGISTRY.gates || []).some((g) => g.id === ts.gate_id),
        ts ? JSON.stringify({ decl: ts.renders_gate_declaration, gate_id: ts.gate_id }) : "(no TAG_SELECTION state)");
      ok("an option composer is bound to TAG_SELECTION — without one the executor records the declaration as owed and unwritten",
        typeof GATE_WORK.TAG_SELECTION === "function");

      const surveyPath = join(REPO, "checks", "fixtures", "survey", "lone-tag-member.json");
      const surveyRec = readJson(surveyPath);
      const composed = GATE_WORK.TAG_SELECTION({ survey_record: surveyPath });

      // ACCEPTANCE ITEM 2, asserted as byte equality rather than as
      // containment: the declaration carries the `tag_listing` SURFACE over
      // this survey record, so no party composed, trimmed or re-rendered it.
      ok("the declaration's tag_listing is BYTE-EQUAL to the tag_listing surface over the same survey record",
        composed.extra.tag_listing === renderTagDisplay(surveyRec),
        JSON.stringify(composed.extra.tag_listing || "").slice(0, 140));

      // EXACTLY TWO WAYS TO ANSWER (owner rulings 1 and 2, 2026-09-04): the
      // standing option, and free text. The composer contributes none of its
      // own, and the standing one is the premise negation the gate owes.
      // TWO TO FOUR OPTIONS, because that is the selector's format (kogaki#1029,
      // the first live hook-driven run: one option was refused by the harness).
      // The run contributes the largest served tags, ids = tag names, and the
      // standing option rides beside them.
      const rankedNames = [...surveyRec.sections]
        .sort((a, b) => (((b.by_family || {}).lesson || 0) - ((a.by_family || {}).lesson || 0)) || String(a.name).localeCompare(String(b.name)))
        .slice(0, 3).map((x) => String(x.name));
      ok("the composer offers the largest served tags as options, ids equal to the tag names, at most three",
        Array.isArray(composed.options) && composed.options.length === Math.min(3, surveyRec.sections.length)
          && composed.options.every((o, i) => o.id === rankedNames[i] && o.label === tagRow(surveyRec.sections.find((x) => String(x.name) === o.id))),
        JSON.stringify(composed.options));

      // THE BYTES REACH THE ARTIFACT, not only the composer's return value.
      // The session renders the FILE, so a declaration that dropped the key on
      // the way to disk would leave the listing exactly as unreachable as
      // before.
      {
        const gd = join(tmpdir(), `terrain-selftest-gate-${process.pid}`);
        mkdirSync(gd, { recursive: true });
        const declPath = emitGateDeclaration(gd, "terrain-tag-selection", composed.options, composed.extra);
        const decl = readJson(declPath);
        ok("the WRITTEN declaration carries the listing — the bytes reach the file the session renders, not only the composer's return",
          decl.tag_listing === renderTagDisplay(surveyRec));
        ok("the written declaration offers the tag options plus the standing option — between two and four, a shape the selector renders — and free text",
          decl.options.length >= 2 && decl.options.length <= 4
            && decl.options[decl.options.length - 1].id === "other-method"
            && decl.options.slice(0, -1).every((o, i) => o.id === rankedNames[i])
            && decl.free_text_offered === true,
          JSON.stringify(decl.options.map((o) => o.id)));
        rmSync(gd, { recursive: true, force: true });
      }

      // ACCEPTANCE ITEM 2's FIRST CLAUSE, AT THE SIZE IT NAMES (kogaki#1029;
      // PR #1061 round 1, finding 2). Everything above compares the composer
      // against `renderTagDisplay` over a THREE-section record, and the
      // hook-side cases in `checks/check-open-gate-exclusivity.sh` drive
      // payloads that check writes itself. So a renderer that dropped rows past
      // some N would satisfy both sides of the byte-equality above AND every
      // deny case over there, while the owner read a truncated table. The clause
      // is "a survey with 17 tags carries all 17 rows", and this is the only
      // case anywhere that reads a seventeen-section record.
      //
      // THE RECORD IS BUILT HERE RATHER THAN COMMITTED AS A FIXTURE. Seventeen
      // sections cloned from this survey's own differ from it in exactly one
      // field, the name, so a failure is about the COUNT and never about a
      // second record's shape having drifted from the first's.
      {
        const many = {
          ...surveyRec,
          sections: Array.from({ length: 17 }, (_, i) => ({
            ...surveyRec.sections[i % surveyRec.sections.length],
            name: `tag-${String(i + 1).padStart(2, "0")}`,
          })),
        };
        const manyPath = join(tmpdir(), `terrain-selftest-17tags-${process.pid}.json`);
        writeFileSync(manyPath, JSON.stringify(many));
        const listing17 = renderTagDisplay(many);
        const rows17 = listing17.split("\n").filter((l) => l.startsWith("  ") && l.trim());
        ok("a seventeen-tag survey renders seventeen tag rows — one per section, none dropped",
          rows17.length === 17 && many.sections.every((sec) => listing17.includes(tagRow(sec))),
          JSON.stringify({ rendered: rows17.length, sections: many.sections.length }));

        const composed17 = GATE_WORK.TAG_SELECTION({ survey_record: manyPath });
        ok("the declaration over a seventeen-tag survey carries that listing whole",
          composed17.extra.tag_listing === listing17,
          JSON.stringify((composed17.extra.tag_listing || "").length));

        // The end of the clause: the bytes the OWNER is shown. `composeGateCall`
        // is what puts the listing in front of the question, and this asserts
        // every one of the seventeen rows survives that composition.
        const call17 = composeGateCall({
          id: "terrain-tag-selection", question: "Which tag does the survey open on?",
          options: composed17.options, free_text_offered: true, ...composed17.extra,
        });
        const q17 = (call17.tool_input || { questions: [{}] }).questions[0].question || "";
        ok("the composed gate call for a seventeen-tag survey carries all seventeen rows in the question the owner reads",
          q17.startsWith(`${listing17}\n\n`) && many.sections.every((sec) => q17.includes(tagRow(sec))),
          JSON.stringify({ missing: many.sections.filter((sec) => !q17.includes(tagRow(sec))).map((sec) => sec.name) }));
        rmSync(manyPath, { force: true });
      }

      // THE ORDER IS THE DEFECT. A declaration carrying the bytes and a stop
      // that never says when to show them reproduces exactly what was filed:
      // the question rendered with the table nowhere on screen.
      {
        const selfPath = fileURLToPath(import.meta.url);
        const gs = join(tmpdir(), `terrain-selftest-tagstop-${process.pid}`);
        const rd = join(gs, "rd");
        mkdirSync(rd, { recursive: true });
        // EVERY EXECUTOR SPAWN IN THIS CASE CARRIES THE TEST SEAM (kogaki#1046).
        // The two spawns below declare the tag gate, and a declaration writes an
        // open-gate pointer; without `KOGAKI_OPEN_GATES` that pointer lands in
        // the owner's live directory, where the capture hook's refuse-when-
        // ambiguous rule then drops the next real answer -- which is what
        // happened on 2026-09-09, three pointers per self-test run.
        const execEnv = { ...process.env, KOGAKI_OPEN_GATES: join(gs, "open-gates", "exec") };
        const tp = join(gs, "table.json");
        writeFileSync(tp, JSON.stringify({ version: 1, states: [
          { id: "TAG_SELECTION", kind: "wait", owner_supplies: "one tag name, or the standing option",
            renders_gate_declaration: true, gate_id: "terrain-tag-selection" },
          { id: "done", kind: "terminal" },
        ] }));
        writeFileSync(join(rd, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        const r = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rd, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: execEnv });
        const out = `${r.stdout || ""}${r.stderr || ""}`;
        ok("a run reaching TAG_SELECTION stops with its declaration WRITTEN rather than owed and unwritten",
          r.status === 0 && /run declaration is WRITTEN/.test(out) && !/OWED AND UNWRITTEN/.test(out),
          out.trim().split("\n").slice(-3).join(" | ").slice(0, 160));
        // THE ORDER IS NOW A PROPERTY OF THE PAYLOAD, NOT OF THE STOP TEXT
        // (kogaki#1028 item 1). kogaki#856's case asserted that the stop TOLD the
        // session to put the listing on screen before the question; the listing
        // now rides inside the question text of the call the executor composed,
        // so what is asserted is that the call exists, is named, and carries the
        // listing above the question line. An instruction the session could
        // decline to follow has become bytes the PreToolUse hook compares.
        ok("the stop names the WRITTEN AskUserQuestion call rather than instructing the session to compose one",
          /call is WRITTEN/.test(out) && /byte-for-byte/.test(out) && !/OWED AND UNWRITTEN/.test(out),
          out.split("\n").filter((l) => /call is WRITTEN|byte-for-byte/.test(l)).join(" | ").slice(0, 200));
        // AND THE BYTES ARE ON THE STDOUT, NOT ONLY THEIR ADDRESS (kogaki#1057
        // item 3, the fixture the issue asks for). This is the case that would
        // have failed on 2026-09-09: the stop named the call and printed none of
        // it, and the session's one admissible act needed bytes that no
        // admissible act could fetch. It asserts the delivery rather than the
        // wording -- the block is PARSED and canonicalised against the written
        // file, so a printed path, a summary, or a re-serialisation that dropped
        // or reordered a field is a failure, and a re-worded sentence around the
        // block is not.
        {
          const callPath = join(rd, `terrain-tag-selection${GATE_CALL_SUFFIX}`);
          // The same canonicalisation the PreToolUse hook compares with: key
          // order is not part of the payload, and everything else is.
          const canon = (v) => JSON.stringify(v, (_k, x) => (
            x && typeof x === "object" && !Array.isArray(x)
              ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]))
              : x));
          const fenced = out.match(/```json\n([\s\S]*?)\n```/);
          let printed = null;
          try { printed = fenced ? JSON.parse(fenced[1]) : null; } catch { printed = null; }
          ok("the stop PRINTS the gate call's bytes, and the printed block canonicalises equal to the written file — the payload reaches the session on a channel the open-gate interval does not deny",
            !!fenced && printed !== null && existsSync(callPath)
              && canon(printed) === canon(readJson(callPath)),
            fenced ? `parsed=${printed !== null}` : "(no fenced block on the stop's stdout)");
        }
        {
          const callPath = join(rd, `terrain-tag-selection${GATE_CALL_SUFFIX}`);
          const call = existsSync(callPath) ? readJson(callPath) : null;
          const q = call && call.questions && call.questions[0];
          const listing = readJson(join(rd, "terrain-tag-selection.run-declaration.json")).tag_listing;
          ok("the call carries the tag listing VERBATIM and ABOVE the question line, so a missing or paraphrased table is a byte difference",
            !!q && typeof listing === "string" && q.question === `${listing}\n\n${"Which tag does the survey open on?"}`,
            q ? q.question.slice(0, 160) : "(no call written)");
          // THE CALL CARRIES THE DECLARATION'S OWN OPTIONS AND ADDS NOTHING.
          // kogaki#1029 landed the tag gate's dynamic options (the largest
          // served tags, plus the standing one) between this branch's first head
          // and its rebase, so this gate now declares two to four by itself and
          // the free-text fallback below is not reached for it. The case asserts
          // that: the composer transcribes, and only a gate that would otherwise
          // be UNRENDERABLE gets a row it did not declare.
          const declOptions = readJson(join(rd, "terrain-tag-selection.run-declaration.json")).options;
          ok("the call carries the declaration's own options unchanged, within AskUserQuestion's two-to-four bound",
            !!q && q.options.length === declOptions.length
              && q.options.length >= 2 && q.options.length <= 4
              && q.options.every((o, i) => o.label === declOptions[i].label)
              && q.multiSelect === false && q.header.length <= 12,
            q ? JSON.stringify({ n: q.options.length, header: q.header }) : "(no call written)");
          // AND THE FALLBACK IS STILL LIVE FOR THE GATES kogaki#1029 DID NOT
          // TOUCH — six of the eight still declare one option, so the arm the
          // owner ruled on is exercised directly rather than left unreached.
          const oneArm = composeGateCall({
            id: "fixture-one-option", question: "One arm?",
            options: [{ id: "only", label: "The only declared arm" }], free_text_offered: true,
          });
          ok("a gate still declaring ONE option gets the free-text row composed from its own `free_text_offered`, never an invented arm (owner ruling 2026-09-09)",
            !!oneArm.tool_input && oneArm.tool_input.questions[0].options.length === 2
              && oneArm.tool_input.questions[0].options[0].label === "The only declared arm",
            JSON.stringify((oneArm.tool_input || {}).questions || oneArm.unavailable));
          ok("a gate declaring one option and NO free text composes no call at all, and the reason is stated rather than an arm being invented",
            !composeGateCall({ id: "fixture-mute", question: "?", options: [{ id: "a", label: "A" }], free_text_offered: false }).tool_input,
            composeGateCall({ id: "fixture-mute", question: "?", options: [{ id: "a", label: "A" }], free_text_offered: false }).unavailable);
        }
        ok("the stop prints no invocation for the owner to run — no READ FIRST block, and no `terrain.mjs tags` hand-over",
          !/READ FIRST/.test(out) && !/terrain\.mjs tags/.test(out),
          out.split("\n").filter((l) => /READ FIRST|terrain\.mjs tags/.test(l)).join(" | "));

        // THE GUARD IS THE SAME GUARD. A listing riding a declaration is judged
        // by the grammar that judged it when it was printed — otherwise moving
        // the surface to a new channel silently loosens its contract. Driven as
        // a subprocess because the refusal is `fail()`, which exits.
        const badSurvey = join(gs, "bad-survey.json");
        const badRec = readJson(surveyPath);
        badRec.sections = [{ ...badRec.sections[0], name: "a tag whose name\nbreaks the row grammar" }];
        writeFileSync(badSurvey, JSON.stringify(badRec));
        const rdBad = join(gs, "rd-bad");
        mkdirSync(rdBad, { recursive: true });
        writeFileSync(join(rdBad, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: badSurvey,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        const rBad = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdBad, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: execEnv });
        const outBad = `${rBad.stdout || ""}${rBad.stderr || ""}`;
        {
          // The live directory holds no pointer this case minted (kogaki#1046
          // acceptance 1). Read only when it exists: a machine with no live
          // directory has nothing to leak into.
          const live = join(homedir(), ".claude", "kogaki-open-gates");
          const leaked = [];
          if (existsSync(live)) {
            for (const f of readdirSync(live)) {
              if (!f.endsWith(".json")) continue;
              try {
                const p = readJson(join(live, f));
                if (String(p.declaration_path || "").startsWith(gs)) leaked.push(f);
              } catch { /* an unreadable pointer is not this case's */ }
            }
          }
          ok("the self-test's executor spawns leave the live open-gate directory untouched (kogaki#1046)",
            leaked.length === 0, leaked.join(", "));
        }
        ok("a listing the tag_listing grammar refuses does not ride into a declaration — the gate refuses instead",
          rBad.status !== 0 && /refusing to emit tag_listing/.test(outBad),
          outBad.trim().split("\n")[0].slice(0, 140));


        // THE ANSWER NOW ARRIVES THROUGH THE HOOK, AND THESE CASES DRIVE IT
        // (kogaki#890). Every case below used to pass `--capture-option` /
        // `--capture-free-text` / `--tool-use-id`, which is precisely the
        // channel the issue removed — so re-pointing them at the harness path
        // is what keeps them evidence rather than a test of a dead flag. The
        // helper feeds `.claude/hooks/write-gate-capture.py` the payload shape
        // the harness sends, so the row under test is written by the same code
        // that writes it in a real run.
        //
        // EACH RUN GETS ITS OWN POINTER DIRECTORY, and that is a property of
        // the FIXTURE rather than of the design. In a real installation one
        // directory holds every outstanding raising on the machine, which is
        // exactly what makes the ambiguity case below possible; here the cases
        // must not collide with each other, because several of them
        // deliberately leave a gate unanswered and every one of them asks the
        // same question over the same survey. The last case opts back IN to a
        // shared directory, on purpose.
        const hookPath = join(REPO, ".claude", "hooks", "write-gate-capture.py");
        const gatesFor = (name) => join(gs, "open-gates", name);
        // THE SELF-TEST NAMES ITS OWN SESSION (kogaki#1028 item 5). The capture
        // hook joins a payload to a pointer on the nonce AND the session, and an
        // empty id on either side matches nothing — so a fixture inheriting the
        // ambient `CLAUDE_CODE_SESSION_ID` into the pointer while sending a
        // payload without one would write no row, and the fixture would be
        // reporting the join rather than what it means to cover. Pinned here so
        // the pass is the same inside a session and outside one.
        const SELF_TEST_SESSION = "terrain-self-test-session";
        const envFor = (name) => ({ ...process.env, KOGAKI_OPEN_GATES: gatesFor(name), CLAUDE_CODE_SESSION_ID: SELF_TEST_SESSION });
        // THE ADVANCE CARRIES THE PAYLOAD THAT PRODUCED THE ROW (kogaki#1075).
        // In an installation the capture hook and this hook read ONE harness
        // event, so the row's `evidence.tool_use_id` and the advancing
        // payload's are the same string by construction. The fixtures used to
        // decouple them -- answer under `toolu_test_*`, advance under
        // `fixture-tool-use` -- which was a shape no installation can produce
        // and which the executor now refuses by name. Composed here so a case
        // that means to drive an answered gate drives it the way the hook pair
        // does.
        const payloadAnswering = (toolUseId) => JSON.stringify({
          hook_event_name: "PostToolUse",
          session_id: "fixture-session",
          tool_use_id: toolUseId,
        });
        const answerThroughHook = (gatesName, questionText, label, toolUseId) => spawnSync(
          "python3", [hookPath],
          { encoding: "utf8", env: envFor(gatesName),
            input: JSON.stringify({
              tool_name: "AskUserQuestion",
              session_id: SELF_TEST_SESSION,
              tool_use_id: toolUseId,
              tool_input: { questions: [{ question: questionText, options: [] }] },
              tool_response: { answers: { [questionText]: label } },
            }) });

        // THE FLAGS ARE REFUSED BY NAME, not merely ignored. An ignored flag
        // is a session quietly getting a different act than it asked for; the
        // whole point of removing this channel is that reaching for it stops.
        const rdDead = join(gs, "rd-dead-flag");
        mkdirSync(rdDead, { recursive: true });
        writeFileSync(join(rdDead, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDead, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
        for (const dead of [["--capture-option", "other-method"], ["--capture-free-text", "x"], ["--tool-use-id", "t"]]) {
          const rDead = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, ...dead], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
          const outDead = `${rDead.stdout || ""}${rDead.stderr || ""}`;
          ok(`${dead[0]} is REMOVED and refused by name — the model no longer has a channel for the owner's answer`,
            rDead.status !== 0 && outDead.includes(`${dead[0]} is REMOVED`),
            outDead.trim().split("\n")[0].slice(0, 140));
        }

        // ---- THE EXECUTOR IS INVOKED BY HOOKS ONLY (kogaki#1027) -----------
        //
        // Every Terrain run since kogaki#17 started when the model typed
        // `node src/terrain.mjs run` into Bash and advanced when the model chose
        // to re-enter; the run record recorded WHICH states completed and never
        // WHO executed the transition, so a run the model drove and a run the
        // Harness drove left identical records. These cases drive the two
        // halves of the repair: the payload refusal, and the attribution.

        // ITEM 5. The three deleted entry points, refused BY NAME rather than
        // ignored, on the same ground the three above are: an ignored flag is a
        // session quietly getting a different act than it asked for.
        for (const dead of [["--input", "some tag"], ["--at", "TAG_SELECTION"], ["--enter", "TAG_SELECTION"]]) {
          const rGone = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, ...dead], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("dead") });
          const outGone = `${rGone.stdout || ""}${rGone.stderr || ""}`;
          ok(`${dead[0]} is DELETED and refused by name — the model-typed route into the executor has no stub`,
            rGone.status !== 0 && outGone.includes(`${dead[0]} is DELETED`),
            outGone.trim().split("\n")[0].slice(0, 140));
        }

        // ACCEPTANCE 1. Invoking the executor with no payload on stdin refuses
        // and WRITES NOTHING. The run directory is named but never created,
        // which is the "before any write" half — a refusal that had already
        // made the directory would have pruned this lane's entries on the way.
        {
          const rdNone = join(gs, "rd-no-payload");
          const rNone = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdNone, "--workflow", tp], { input: "", encoding: "utf8", env: envFor("nopayload") });
          const outNone = `${rNone.stdout || ""}${rNone.stderr || ""}`;
          ok("the executor with NO hook payload on stdin refuses, and names the two acts that do carry one",
            rNone.status !== 0 && /no hook payload/.test(outNone)
              && /terrain\.mjs start/.test(outNone) && /advance-terrain\.py/.test(outNone),
            outNone.trim().split("\n")[0].slice(0, 160));
          ok("that refusal wrote NOTHING — the run directory it named does not exist, so the refusal precedes every write",
            !existsSync(rdNone), rdNone);
          // A payload MISSING ONE FIELD is not a payload. `advanced_by` with a
          // null tool_use_id records that a transition happened and not which
          // question executed it, which is the same silence the field ends.
          for (const missing of ["hook_event_name", "session_id", "tool_use_id"]) {
            const partial = JSON.parse(FIXTURE_PAYLOAD);
            delete partial[missing];
            const rPart = spawnSync(process.execPath,
              [selfPath, "run", "--run-dir", join(gs, `rd-partial-${missing}`), "--workflow", tp],
              { input: JSON.stringify(partial), encoding: "utf8", env: envFor("nopayload") });
            ok(`a payload with no ${missing} is refused — a partial attribution is not an attribution`,
              rPart.status !== 0, `exit ${rPart.status}`);
          }
          // `--status` is the ONE verb the PreToolUse deny admits from a Bash
          // command, so it must not need a payload: an inspection route that
          // required a hook event would leave a stuck run unreadable by the one
          // person able to unstick it.
          const rStatus = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdDead, "--workflow", tp, "--status"], { input: "", encoding: "utf8", env: envFor("dead") });
          ok("`run --status` needs no payload — the one verb reachable from a Bash command is read-only and stays reachable",
            rStatus.status === 0, `exit ${rStatus.status}`);
        }

        // ACCEPTANCE 2. A run driven by synthesized hook payloads ALONE reaches
        // its end, and every transition in its record carries `advanced_by`
        // with the three fields.
        //
        // THE TABLE IS THE FIXTURE'S, NOT THE SHIPPED ONE, and the substitution
        // is stated rather than quietly made: this pass is seam-free by
        // construction and the shipped table's first state reads the gateway,
        // so a drive of `full_report` itself is exactly the end-to-end member
        // `terrain-runtime`'s own removal signal names as not existing yet. What
        // is asserted here is the property that acceptance item names — payloads
        // alone carry a run from its start through a gate answer to its terminal
        // — over a table that reaches a terminal without a seam.
        {
          const rdDrive = join(gs, "rd-hook-driven");
          mkdirSync(rdDrive, { recursive: true });
          writeFileSync(join(rdDrive, RUN_RECORD_FILE), JSON.stringify({
            workflow: { path: tp, version: 1 }, survey_record: surveyPath,
            completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
            awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
            gate_declarations_owed: [], transitions: [], done: false,
          }));
          spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDrive, "--workflow", tp],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("driven") });
          const declDrive = readJson(join(rdDrive, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
          // THE FREE-TEXT ARM, because the fixture survey's tag options are not
          // guaranteed to include a routed one and a case that depends on which
          // tags a corpus happens to carry is a case that fails for the wrong
          // reason. Free text is the affordance every gate here declares on, and
          // it advances the wait exactly as a routed option does.
          answerThroughHook("driven", sentQ(rdDrive, declDrive), "a tag the owner typed", "fixture-tool-use");
          const rDrive = spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdDrive, "--workflow", tp],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("driven") });
          const recDrive = readRunRecord(rdDrive);
          ok("a run driven by synthesized hook payloads alone advances through its gate to the terminal — no model-typed act anywhere on the path",
            rDrive.status === 0 && !!recDrive && recDrive.done === true && recDrive.completed.includes("done"),
            recDrive ? JSON.stringify({ done: recDrive.done, completed: recDrive.completed }) : "(no record)");
          const rows = (recDrive && recDrive.transitions) || [];
          ok("every transition in that record carries advanced_by with the three payload fields, copied from the payload rather than composed",
            rows.length > 0 && rows.every((t) => t.advanced_by
              && t.advanced_by.executor === "hook"
              && t.advanced_by.hook_event_name === "PostToolUse"
              && t.advanced_by.session_id === "fixture-session"
              && t.advanced_by.tool_use_id === "fixture-tool-use"),
            JSON.stringify(rows.map((t) => t.advanced_by)).slice(0, 200));
          ok("the transition list and the completed list name the same states in the same order — one writer, so they cannot disagree about what ran",
            rows.map((t) => t.state).join(",") === recDrive.completed.join(","),
            `${rows.map((t) => t.state).join(",")} vs ${recDrive.completed.join(",")}`);
        }

        // ITEM 1. The start act carries the `skill-expansion` executor kind and
        // NO hook fields, because no hook event produced it — and it refuses an
        // existing record, so it cannot walk states the hook route is supposed
        // to execute under an attribution that names no hook.
        {
          const rdStart = join(gs, "rd-start");
          mkdirSync(rdStart, { recursive: true });
          writeFileSync(join(rdStart, RUN_RECORD_FILE), JSON.stringify({
            workflow: { path: tp, version: 1 }, survey_record: surveyPath,
            completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
            awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
            gate_declarations_owed: [], transitions: [], done: false,
          }));
          const rStart = spawnSync(process.execPath, [selfPath, "start", "--run-dir", rdStart, "--workflow", tp],
            { input: "", encoding: "utf8", env: envFor("start") });
          const outStart = `${rStart.stdout || ""}${rStart.stderr || ""}`;
          ok("`start` refuses a run record that already exists — the start act opens a run and never resumes one",
            rStart.status !== 0 && /a resumption and not a start/.test(outStart),
            outStart.trim().split("\n")[0].slice(0, 160));

          const rdStart2 = join(gs, "rd-start-fresh");
          mkdirSync(rdStart2, { recursive: true });
          const startTable = join(gs, "start-table.json");
          writeFileSync(startTable, JSON.stringify({ version: 1, states: [
            { id: "a", kind: "compute" },
            { id: "W", kind: "wait", owner_supplies: "something" },
            { id: "done", kind: "terminal" },
          ] }));
          const rStart2 = spawnSync(process.execPath, [selfPath, "start", "--run-dir", rdStart2, "--workflow", startTable],
            { input: "", encoding: "utf8", env: envFor("start") });
          const recStart = readRunRecord(rdStart2);
          const startRows = (recStart && recStart.transitions) || [];
          ok("`start` runs with no payload on stdin — the skill's `!` line receives none, and the act is licensed rather than synthesized",
            rStart2.status === 0 && !!recStart, `exit ${rStart2.status}`);
          ok("the start act's transitions name the skill expansion and carry NO hook fields — an attribution no harness event supplied is never invented",
            startRows.length > 0 && startRows.every((t) => t.advanced_by
              && t.advanced_by.executor === "skill-expansion"
              && t.advanced_by.hook_event_name === undefined
              && t.advanced_by.session_id === undefined
              && t.advanced_by.tool_use_id === undefined),
            JSON.stringify(startRows.map((t) => t.advanced_by)).slice(0, 200));
          ok("the start act stops at the first wait — it produces one stop, not a walked run",
            !!recStart && recStart.awaiting === "W" && recStart.done === false,
            recStart ? JSON.stringify({ awaiting: recStart.awaiting, done: recStart.done }) : "(no record)");
        }

        // ---- WHICH RUN THE ADVANCE IS AN ADVANCE OF (PR #1034 round 1,
        // blocking). `--run-dir` was run identity, re-supplied by the session on
        // every re-entry; item 5 removed the session's route and left nothing in
        // its place, so `start` opened one workspace and the advance minted
        // another. The open-run pointer is the carrier that replaces it, and
        // these cases drive it over `KOGAKI_OPEN_RUN` so the real lane is never
        // touched.
        {
          const ptr = join(gs, "open-run-pointer");
          const envPtr = (extra = {}) => ({ ...process.env, KOGAKI_OPEN_RUN: ptr, ...extra });
          const startTable2 = join(gs, "pointer-table.json");
          writeFileSync(startTable2, JSON.stringify({ version: 1, states: [
            { id: "a", kind: "compute" },
            { id: "W", kind: "wait", owner_supplies: "something" },
            { id: "done", kind: "terminal" },
          ] }));

          // With no pointer and no --run-dir, an advance REFUSES and writes
          // nothing: an advance is an advance OF a run, and minting one here is
          // exactly the defect.
          const rNoRun = spawnSync(process.execPath, [selfPath, "run", "--workflow", startTable2],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envPtr() });
          const outNoRun = `${rNoRun.stdout || ""}${rNoRun.stderr || ""}`;
          ok("an advance with no open run refuses and names the start act, rather than minting a fresh workspace per question",
            rNoRun.status !== 0 && /no Terrain run is open/.test(outNoRun) && /terrain\.mjs start/.test(outNoRun),
            outNoRun.trim().split("\n")[0].slice(0, 160));
          ok("that refusal wrote no pointer either — nothing about the lane changed",
            !existsSync(ptr), ptr);

          // `start` on the default branch WRITES the pointer, and the advance
          // that follows resolves the same workspace rather than a new one.
          const rdPtr = join(gs, "rd-pointer");
          const rStartPtr = spawnSync(process.execPath,
            [selfPath, "start", "--run-dir", rdPtr, "--workflow", startTable2],
            { input: "", encoding: "utf8", env: envPtr() });
          ok("an explicit --run-dir still wins for `start`, and writes NO pointer — a caller who named a directory holds it",
            rStartPtr.status === 0 && !existsSync(ptr), `exit ${rStartPtr.status}`);

          // The pointer's own round trip, driven the way the start act writes
          // it. Read IN PROCESS, so the override has to be set here too — the
          // spawns above carry it in the child's environment.
          const heldPtrEnv = process.env.KOGAKI_OPEN_RUN;
          process.env.KOGAKI_OPEN_RUN = ptr;
          writeFileSync(ptr, `${rdPtr}\n`);
          ok("an advance with the pointer set resolves the SAME workspace the start act opened — the run the answer belongs to",
            readOpenRunPointer() === resolve(rdPtr), String(readOpenRunPointer()));
          // A POINTER TO A WORKSPACE THAT IS GONE IS NOT A RUN. A `runs/` prune
          // or a hand-cleaned lane leaves the file behind, and resolving it
          // would advance into a directory with no record in it.
          writeFileSync(ptr, `${join(gs, "not-a-run")}\n`);
          ok("a pointer naming a workspace that no longer exists reads as NO open run, rather than resolving to an empty directory",
            readOpenRunPointer() === null, String(readOpenRunPointer()));
          if (heldPtrEnv === undefined) delete process.env.KOGAKI_OPEN_RUN;
          else process.env.KOGAKI_OPEN_RUN = heldPtrEnv;
        }

        // THE STANDING OPTION IS ROUTED NOWHERE, AND SAYS SO (PR #898 round 1).
        // Before this the option id was recorded where a tag name goes and the
        // run died two states later in `compose_input`, telling the owner that
        // "other-method" was not in the survey's vocabulary — a refusal that
        // misdescribes what they did, from a state that cannot know what they
        // were asked. One of exactly two ways to answer deserves one that names
        // it, and the wait must survive so the gate can be re-offered.
        const rdOpt = join(gs, "rd-unrouted");
        mkdirSync(rdOpt, { recursive: true });
        writeFileSync(join(rdOpt, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("opt") });
        const declOpt = readJson(join(rdOpt, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const standingLabel = declOpt.options.find((o) => o.id === "other-method").label;
        // THE GATE IS UNANSWERED UNTIL THE HARNESS SAYS OTHERWISE, and this is
        // the case the whole issue turns on: a re-entry with no recorded answer
        // refuses instead of advancing on something a session supplied.
        const rUnanswered = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("opt") });
        const outUnanswered = `${rUnanswered.stdout || ""}${rUnanswered.stderr || ""}`;
        ok("an outstanding declared gate with NO harness-recorded answer refuses, and names the hook and the pointer rather than advancing",
          rUnanswered.status !== 0
            && /the harness has recorded no answer/.test(outUnanswered)
            && /write-gate-capture\.py/.test(outUnanswered)
            && /open-gate pointer/.test(outUnanswered),
          outUnanswered.trim().split("\n")[0].slice(0, 160));

        answerThroughHook("opt", sentQ(rdOpt, declOpt), standingLabel, "toolu_test_unrouted");
        const rOpt = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdOpt, "--workflow", tp], { input: payloadAnswering("toolu_test_unrouted"), encoding: "utf8", env: envFor("opt") });
        const outOpt = `${rOpt.stdout || ""}${rOpt.stderr || ""}`;
        const recOpt = readRunRecord(rdOpt);
        ok("capturing the standing option REFUSES the advance and names the option, rather than letting it land where a tag name goes",
          rOpt.status !== 0 && /ROUTED NOWHERE/.test(outOpt) && /other-method/.test(outOpt),
          outOpt.trim().split("\n").slice(-1)[0].slice(0, 160));
        ok("that refusal leaves the wait OUTSTANDING and records no owner input — the gate can be re-offered rather than the run being wedged",
          !!recOpt && recOpt.awaiting === "TAG_SELECTION"
            && !recOpt.completed.includes("TAG_SELECTION")
            && recOpt.owner_input.TAG_SELECTION === undefined,
          recOpt ? JSON.stringify({ awaiting: recOpt.awaiting, completed: recOpt.completed, input: recOpt.owner_input }) : "(no record)");
        ok("the answer is still CAPTURED — it is evidence, and the gate carrier owes the row whether or not the run advances",
          existsSync(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`))
            && readJson(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`)).rows.some((x) => x.payload.answer.option === "other-method"));
        ok("the captured row carries the HARNESS'S OWN tool_use_id and the raising's instance id — the two fields no session supplied",
          readJson(join(rdOpt, `terrain${GATE_SCHEMA.capture.suffix}`)).rows.some((x) =>
            x.evidence.tool_use_id === "toolu_test_unrouted" && x.gate_instance_id === declOpt.gate_instance_id));

        // A FREE-TEXT TAG IS UNAFFECTED, so the refusal above discriminates
        // rather than refusing every answer to this gate.
        const rdFree = join(gs, "rd-freetext");
        mkdirSync(rdFree, { recursive: true });
        writeFileSync(join(rdFree, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdFree, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("free") });
        const declFree = readJson(join(rdFree, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        answerThroughHook("free", sentQ(rdFree, declFree), "testing", "toolu_test_freetext");
        const rFree = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdFree, "--workflow", tp], { input: payloadAnswering("toolu_test_freetext"), encoding: "utf8", env: envFor("free") });
        const recFree = readRunRecord(rdFree);
        ok("a free-text tag answer still advances — the unrouted refusal is bound to the declared option and not to the gate",
          rFree.status === 0 && !!recFree && recFree.owner_input.TAG_SELECTION === "testing"
            && recFree.completed.includes("TAG_SELECTION"),
          recFree ? JSON.stringify(recFree.owner_input) : `(no record) ${(rFree.stderr || "").slice(0, 120)}`);

        // AN ANSWER TO ANOTHER RAISING DOES NOT ANSWER THIS ONE, which is the
        // property the instance nonce exists for and the one a content-derived
        // key cannot have. Both runs are over the same survey, so both compose
        // the same question and the same option set and therefore the same
        // digest — the pair a digest is least able to tell apart.
        const rdTwin = join(gs, "rd-twin");
        mkdirSync(rdTwin, { recursive: true });
        writeFileSync(join(rdTwin, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTwin, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
        const declTwin = readJson(join(rdTwin, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        ok("two raisings of one gate over one input compose an IDENTICAL option-set digest and DIFFERENT instance ids — so the nonce is doing work the digest cannot",
          ownerGateDigest(declTwin.id, declTwin.options.map((o) => o.id))
            === ownerGateDigest(declFree.id, declFree.options.map((o) => o.id))
            && declTwin.gate_instance_id !== declFree.gate_instance_id);
        // The twin's capture is handed the OTHER run's answered row verbatim.
        writeFileSync(join(rdTwin, `terrain${GATE_SCHEMA.capture.suffix}`),
          readFileSync(join(rdFree, `terrain${GATE_SCHEMA.capture.suffix}`), "utf8"));
        const rTwin = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdTwin, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
        const outTwin = `${rTwin.stdout || ""}${rTwin.stderr || ""}`;
        ok("a row answering a DIFFERENT raising does not advance this one — the join is on the instance id, never on the content two runs share",
          rTwin.status !== 0 && /none carries this raising's instance id/.test(outTwin),
          outTwin.trim().split("\n")[0].slice(0, 160));

        // TWO OUTSTANDING RAISINGS OF ONE QUESTION: the hook writes NOTHING
        // and says so, rather than choosing. Choosing would be the silent
        // misattribution the nonce exists to prevent, arriving one step earlier
        // through the narrowing that finds the pointer.
        const rdTwin2 = join(gs, "rd-twin-2");
        mkdirSync(rdTwin2, { recursive: true });
        writeFileSync(join(rdTwin2, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTwin2, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("shared") });
        const rTwoOpen = answerThroughHook("shared", sentQ(rdTwin, declTwin), "testing", "toolu_test_ambiguous");
        ok("with two outstanding gates carrying one question the hook writes no row and names the ambiguity, rather than picking one",
          /does not choose between them/.test(`${rTwoOpen.stdout || ""}${rTwoOpen.stderr || ""}`),
          `${rTwoOpen.stderr || ""}`.trim().split("\n")[0].slice(0, 160));

        // A TRUNCATED LABEL IS REFUSED, NOT READ AS THE OWNER'S OWN WORDS
        // (PR #917 round 1, finding 4). The standing option's label is a full
        // sentence, so a label that arrives cut short would have fallen through
        // an exact comparison and been recorded as free text — landing a
        // declared option's text where a tag name goes and skipping the
        // unrouted refusal entirely, which is the wedge PR #898 closed
        // returning by another route.
        const rdTrunc = join(gs, "rd-truncated");
        mkdirSync(rdTrunc, { recursive: true });
        writeFileSync(join(rdTrunc, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdTrunc, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("trunc") });
        const declTrunc = readJson(join(rdTrunc, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const fullLabel = declTrunc.options.find((o) => o.id === "other-method").label;
        answerThroughHook("trunc", sentQ(rdTrunc, declTrunc), fullLabel.slice(0, 24), "toolu_test_truncated");
        const rTrunc = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdTrunc, "--workflow", tp], { input: payloadAnswering("toolu_test_truncated"), encoding: "utf8", env: envFor("trunc") });
        const outTrunc = `${rTrunc.stdout || ""}${rTrunc.stderr || ""}`;
        const recTrunc = readRunRecord(rdTrunc);
        ok("a TRUNCATED option label is refused rather than recorded as free text — a near-miss is not silently read as the owner's own words",
          rTrunc.status !== 0 && /could not be resolved to an option or to free text/.test(outTrunc)
            && recTrunc.owner_input.TAG_SELECTION === undefined,
          outTrunc.trim().split("\n")[0].slice(0, 170));
        // A RE-WRAPPED label is still the same answer, so the refusal above
        // discriminates rather than refusing every label that is not byte-equal.
        const rdWrap = join(gs, "rd-rewrapped");
        mkdirSync(rdWrap, { recursive: true });
        writeFileSync(join(rdWrap, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdWrap, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("wrap") });
        const declWrap = readJson(join(rdWrap, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const wrapped = declWrap.options.find((o) => o.id === "other-method").label.replace(/ /g, "\n  ");
        answerThroughHook("wrap", sentQ(rdWrap, declWrap), wrapped, "toolu_test_rewrapped");
        const rWrap = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdWrap, "--workflow", tp], { input: payloadAnswering("toolu_test_rewrapped"), encoding: "utf8", env: envFor("wrap") });
        ok("a RE-WRAPPED label still resolves to its option — whitespace is presentation, and the near-miss refusal is not a refusal of every inexact label",
          rWrap.status !== 0 && /ROUTED NOWHERE/.test(`${rWrap.stdout || ""}${rWrap.stderr || ""}`),
          `${rWrap.stdout || ""}${rWrap.stderr || ""}`.trim().split("\n").slice(-1)[0].slice(0, 150));

        // AN ORPHANED POINTER IS REAPED, so one abandoned run cannot wedge a
        // whole gate class on the machine (PR #917 round 1, finding 3). The
        // question is a constant string, so every later raising would otherwise
        // match the orphan and the ambiguity arm would write nothing forever.
        const rdOrphan = join(gs, "rd-orphan");
        mkdirSync(rdOrphan, { recursive: true });
        writeFileSync(join(rdOrphan, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOrphan, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("orphan") });
        rmSync(rdOrphan, { recursive: true, force: true });   // the abandoned run
        const rdAfter = join(gs, "rd-after-orphan");
        mkdirSync(rdAfter, { recursive: true });
        writeFileSync(join(rdAfter, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdAfter, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("orphan") });
        const declAfter = readJson(join(rdAfter, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
        const rAfterHook = answerThroughHook("orphan", sentQ(rdAfter, declAfter), "a-tag", "toolu_test_after_orphan");
        const rAfter = spawnSync(process.execPath,
          [selfPath, "run", "--run-dir", rdAfter, "--workflow", tp], { input: payloadAnswering("toolu_test_after_orphan"), encoding: "utf8", env: envFor("orphan") });
        const recAfter = readRunRecord(rdAfter);
        ok("a pointer whose run was deleted is REAPED, so the next raising of that gate is not wedged by the orphan",
          /is reaped: its declaration/.test(`${rAfterHook.stdout || ""}${rAfterHook.stderr || ""}`)
            && rAfter.status === 0 && recAfter.owner_input.TAG_SELECTION === "a-tag",
          `${rAfterHook.stderr || ""}`.trim().split("\n")[0].slice(0, 150));

        // ANOTHER QUESTION'S PAYLOAD DOES NOT ADVANCE THIS GATE (kogaki#1075).
        // The row is on disk and answers THIS raising, so every check above it
        // passes; what refuses is the payload, which answered something else.
        // This is the live shape of 2026-09-10: a parked run, a cleanup
        // question in another session, and an executor that read the last
        // capture and moved. The hook is the first reader and this is the
        // second, so a direct invocation reaches the same stop.
        {
          const rdOther = join(gs, "rd-other-question");
          mkdirSync(rdOther, { recursive: true });
          writeFileSync(join(rdOther, RUN_RECORD_FILE), JSON.stringify({
            workflow: { path: tp, version: 1 }, survey_record: surveyPath,
            completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
            awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
            gate_declarations_owed: [], transitions: [], done: false,
          }));
          spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
            { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("other") });
          const declOther = readJson(join(rdOther, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`));
          answerThroughHook("other", sentQ(rdOther, declOther), "a-tag", "toolu_the_gates_own_question");
          const rElse = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
            { input: payloadAnswering("toolu_some_other_sessions_cleanup_plan"), encoding: "utf8", env: envFor("other") });
          const outElse = `${rElse.stdout || ""}${rElse.stderr || ""}`;
          const recElse = readRunRecord(rdOther);
          ok("a payload from a question that did not answer this gate REFUSES the advance by name, however open the run is",
            rElse.status !== 0
              && /no captured row for gate/.test(outElse)
              && /toolu_some_other_sessions_cleanup_plan/.test(outElse),
            outElse.trim().split("\n")[0].slice(0, 170));
          ok("that refusal advances nothing and leaves the wait outstanding — the run is re-offered its gate rather than walked by someone else's question",
            !!recElse && recElse.awaiting === "TAG_SELECTION"
              && !recElse.completed.includes("TAG_SELECTION")
              && recElse.owner_input.TAG_SELECTION === undefined,
            recElse ? JSON.stringify({ awaiting: recElse.awaiting, completed: recElse.completed }) : "(no record)");
          // ...AND THE GATE'S OWN PAYLOAD STILL ADVANCES IT, so the refusal
          // discriminates rather than closing the route it guards.
          const rOwn = spawnSync(process.execPath,
            [selfPath, "run", "--run-dir", rdOther, "--workflow", tp],
            { input: payloadAnswering("toolu_the_gates_own_question"), encoding: "utf8", env: envFor("other") });
          const recOwn = readRunRecord(rdOther);
          ok("the gate's OWN question advances it — the payload check narrows to the question that answered, and refuses nothing else",
            rOwn.status === 0 && !!recOwn && recOwn.owner_input.TAG_SELECTION === "a-tag"
              && recOwn.completed.includes("TAG_SELECTION"),
            recOwn ? JSON.stringify(recOwn.owner_input) : `(no record) ${(rOwn.stderr || "").slice(0, 140)}`);
        }

        // A RE-RAISING SUPERSEDES ITS OWN POINTER, so the recovery this file
        // prescribes — re-render after a refusal — does not itself accumulate
        // the orphans that wedge the gate.
        const rdRe = join(gs, "rd-reraise");
        mkdirSync(rdRe, { recursive: true });
        writeFileSync(join(rdRe, RUN_RECORD_FILE), JSON.stringify({
          workflow: { path: tp, version: 1 }, survey_record: surveyPath,
          completed: [], waits_reached: [], conditional_entered: [], conditional_skipped: [],
          awaiting: null, owner_input: {}, artifacts_written: [], judgments: {},
          gate_declarations_owed: [], done: false,
        }));
        for (let i = 0; i < 3; i++) {
          rmSync(join(rdRe, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`), { force: true });
          const rec = readRunRecord(rdRe);
          rec.gate_declarations_owed = [];
          writeFileSync(join(rdRe, RUN_RECORD_FILE), JSON.stringify(rec));
          spawnSync(process.execPath, [selfPath, "run", "--run-dir", rdRe, "--workflow", tp], { input: FIXTURE_PAYLOAD, encoding: "utf8", env: envFor("reraise") });
        }
        ok("three raisings of one gate in one run leave exactly ONE pointer — the prescribed recovery does not accumulate the orphans it would then be blocked by",
          readdirSync(gatesFor("reraise")).filter((f) => f.endsWith(".json")).length === 1,
          `${readdirSync(gatesFor("reraise")).length} pointer(s)`);

        // THE POINTER NAMES WHO OPENED IT (kogaki#1051). The hook admits the
        // prompt that invoked the skill for a `skill-expansion` pointer and for
        // no other, so the field has to be on the file the start act writes --
        // and it has to be the OTHER value on the file an advance writes, or
        // every gate in every run would admit typed text.
        const readOnly = (name) => {
          const dir = gatesFor(name);
          if (!existsSync(dir)) return null;
          const f = readdirSync(dir).filter((x) => x.endsWith(".json"))[0];
          return f ? readJson(join(dir, f)) : null;
        };
        ok("a pointer written under a hook-attributed advance records `opened_by: hook` — the ordinary gate, where a turn has run by construction",
          (readOnly("reraise") || {}).opened_by === "hook",
          JSON.stringify((readOnly("reraise") || {}).opened_by));

        // AND THE START ATTRIBUTION WRITES THE OTHER VALUE. The case above is
        // the whole wiring — `hook` reaches the pointer only through `cmdRun`'s
        // `setOpenedBy(advancedBy)`, so a writer that ignored the attribution
        // would record null there and fail. What remains is the VALUE the start
        // act carries, and the case at ITEM 1 above already asserts that its
        // transitions carry `executor: "skill-expansion"` — the same object
        // this drives the writer with.
        //
        // DRIVEN AT THE WRITER RATHER THAN THROUGH `start` BECAUSE THE CLI
        // START CANNOT REACH A GATE HERE: the start act mints its own run
        // record, its first state is the survey, and the survey state runs
        // `cmdSurvey` against the gateway — which this pass, being seam-free by
        // construction, does not have. A fixture that pre-wrote the survey
        // record would be refused as a resumption, which is the start act's own
        // rule working correctly.
        {
          const startGates = gatesFor("startwriter");
          const rdSW = join(gs, "rd-start-writer");
          mkdirSync(rdSW, { recursive: true });
          const declSW = {
            id: "terrain-tag-selection", question: "Which tag does the survey open on?",
            gate_instance_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            declared_at: new Date().toISOString(),
          };
          const declPathSW = join(rdSW, `terrain-tag-selection${GATE_SCHEMA.capture.run_declaration_suffix}`);
          writeFileSync(declPathSW, JSON.stringify(declSW, null, 2) + "\n");
          const savedGates = process.env.KOGAKI_OPEN_GATES;
          process.env.KOGAKI_OPEN_GATES = startGates;
          try {
            setOpenedBy(SKILL_EXPANSION_EXECUTOR);
            writeOpenGatePointer(rdSW, declSW, declPathSW);
          } finally {
            setOpenedBy(null);
            if (savedGates === undefined) delete process.env.KOGAKI_OPEN_GATES;
            else process.env.KOGAKI_OPEN_GATES = savedGates;
          }
          ok("a pointer written under the START attribution records `opened_by: skill-expansion` — the one state in which no model turn can yet have run, and the one the prompt arm admits",
            (readOnly("startwriter") || {}).opened_by === "skill-expansion",
            JSON.stringify((readOnly("startwriter") || {}).opened_by));
        }

        rmSync(gs, { recursive: true, force: true });
      }

    }

    // ---- JUDGMENT PROVENANCE (kogaki#892). The subdivisions record's own
    // `judged: true` and its declared judge pin used to reach both owner
    // surfaces as an assertion the Harness stood behind. These cases assert
    // that what the Harness never observed is no longer rendered as though it
    // had been, and — the direction a provenance case is usually blind in —
    // that the observed form is still emittable, so the repair is a split and
    // not a blanket downgrade.
    {
      const grammar = loadGrammar(REPORT_FORMAT);
      const admits = (surface, text) => validateSurface(surface, text, grammar)
        .every((v) => !/line_class_allowlist/.test(v));
      const pin = { model_id: "a-model", effort_tier: "high" };
      const declared = { state: JUDGMENT_DECLARED, artifact_sha: "0123456789abcdef", invocation: null };
      const observed = { state: JUDGMENT_OBSERVED, artifact_sha: "0123456789abcdef", invocation: { id: "inv-1" } };

      // THE STATE, not the text: terrain invokes no judge, so the only
      // provenance a run can compute is `declared`. A future act that invokes
      // one flips `harnessJudgeInvocation` and this case with it.
      ok("terrain invokes no judge, so a computed provenance is DECLARED and carries no invocation record",
        judgmentProvenance(null).state === JUDGMENT_DECLARED
        && harnessJudgeInvocation() === null
        && judgmentProvenance(null).invocation === null);

      // The sha is taken by THIS layer from the bytes on disk — the one thing
      // about the judgment the Harness actually observed.
      {
        const dir = join(tmpdir(), `terrain-selftest-prov-${process.pid}`);
        mkdirSync(dir, { recursive: true });
        const f = join(dir, "subdivisions.json");
        writeFileSync(f, JSON.stringify({ G1: { judged: true, subgroups: [] } }));
        const expect = createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 16);
        ok("the provenance takes the subdivisions record's sha from the bytes on disk, not from anything the record declares",
          judgmentProvenance(f).artifact_sha === expect && expect.length === 16);
        rmSync(dir, { recursive: true, force: true });
      }

      // The display line. The pre-#892 text is the discriminator: a line that
      // still opens `judged by` under a DECLARED provenance is the defect.
      ok("under a declared provenance the display says the pin is DECLARED and does not say the judgment was observed",
        /^judge pin DECLARED — a-model \/ high\./.test(judgePinLine(pin, declared))
        && !/^judged by/.test(judgePinLine(pin, declared))
        && judgePinLine(pin, declared).includes("0123456789abcdef"));
      ok("the OBSERVED form is still composable and names the Harness's own invocation record — the repair is a split, not a blanket downgrade",
        /^judged by a-model \/ high — OBSERVED/.test(judgePinLine(pin, observed))
        && judgePinLine(pin, observed).includes("inv-1"));

      // Both forms must reach the surface: a grammar admitting only the one the
      // runtime happens to emit today would refuse the other the moment a
      // judge-invoking act existed, which is the amend-it-later shape the
      // superseded entry beside it records.
      ok("cotag_groups admits BOTH judge-pin lines judgePinLine actually composes",
        admits("cotag_groups", judgePinLine(pin, declared))
        && admits("cotag_groups", judgePinLine(pin, observed)));

      // Acceptance 2. `no split recorded` under a declaration; the judged-empty
      // wording only where the judgment was observed.
      ok("a judged-empty group renders NO SPLIT IS RECORDED under a declared provenance, and the judged-empty wording only under an observed one",
        judgedEmptyNoticeLines(declared)[0].startsWith("*NO SPLIT IS RECORDED")
        && !judgedEmptyNoticeLines(declared).join(" ").includes("this is a judged-empty outcome")
        && judgedEmptyNoticeLines(observed).join(" ").includes("this is a judged-empty outcome"));
      ok("full_report admits BOTH judged-empty notices judgedEmptyNoticeLines actually composes",
        admits("full_report", judgedEmptyNoticeLines(declared).join("\n"))
        && admits("full_report", judgedEmptyNoticeLines(observed).join("\n")));

      // A report record written before the field existed renders DECLARED. The
      // direction matters: the safe default for a record that cannot show an
      // observation is the state that claims none.
      // ---- kogaki#919. The display line was ONE unwrapped string of roughly
      // 450 characters, emitted once per subdivided group — on the terminal,
      // which is the surface kogaki#317 exists to keep readable under wrapping,
      // while the report's counterpart notice carrying the same content was
      // hand-wrapped. These cases bound the width rather than describe it.
      ok("both judge-pin arms render inside the display wrap column, and no line of either exceeds it",
        [judgePinLine(pin, declared), judgePinLine(pin, observed)]
          .every((text) => text.split("\n").length > 1
            && text.split("\n").every((l) => l.length <= DISPLAY_WRAP_COLUMNS)));
      // The column is TAKEN from the report notice, so the two surfaces cannot
      // wrap at two columns. This case is what binds them: widen one and the
      // other's own lines are measured against it.
      ok("the wrap column still fits the report notice it was taken from, on both of that notice's arms",
        [...judgedEmptyNoticeLines(declared), ...judgedEmptyNoticeLines(observed)]
          .every((l) => l.length <= DISPLAY_WRAP_COLUMNS));
      // A value the owner might copy is never split across lines.
      ok("wrapping breaks on spaces only — a token longer than the column is emitted whole rather than broken",
        judgePinLine(pin, declared).includes("`0123456789abcdef`")
        && judgePinLine(pin, observed).includes("`inv-1`")
        && wrapDisplayLine("a ".repeat(3) + "x".repeat(120), 20).some((l) => l.includes("x".repeat(120))));
      // Continuations are marked, and the grammar keys on the mark. A flush-left
      // continuation reads as a new statement, and would need a bare-placeholder
      // class to admit — which is what makes an allowlist inert.
      ok("continuation lines carry the hanging indent both arms' grammar class keys on",
        [judgePinLine(pin, declared), judgePinLine(pin, observed)]
          .every((text) => text.split("\n").slice(1).every((l) => l.startsWith("  "))
            && !text.split("\n")[0].startsWith(" ")));
      // ---- PR #921 round 1 finding 1. THE PIN IS COMPOSER-SUPPLIED AND
      // UNBOUNDED, and the wrap made its length reach the grammar. A form
      // abbreviating one space past the pin clause demands a further word on
      // the first rendered line, so a long enough `model_id` wrapped the clause
      // apart, no class matched line 1, and `emitOrRefuse` refused the WHOLE
      // cotag_groups surface — a display that destroys itself on an input the
      // owner typed. The fixtures carried short ids, which is why nothing saw
      // it. This case is stated over the LENGTH rather than over one id: it
      // sweeps the whole range through and past the width, so a later change to
      // the column, the head or the form is measured against every crossing
      // rather than against the one specimen that failed.
      ok("a long composer-supplied judge pin still classifies — the pin clause is never wrapped off the first line, at any id length",
        [1, 20, 45, 48, 52, 60, 80, 140].every((n) => {
          const long = { model_id: "m".repeat(n), effort_tier: "high" };
          return [judgePinLine(long, declared), judgePinLine(long, observed)]
            .every((text) => text.split("\n")[0].includes(`${long.model_id} / high`)
              && admits("cotag_groups", text));
        }));

      // ---- kogaki#918. The provenance clause was composed against EVERY pin,
      // including the typed literal `none` — so the absence of a pin rendered
      // as `pin DECLARED`, an absence asserted as a declaration, which is #892's
      // own class one step over and arrived in the change that closed it.
      ok("a `none` pin renders no declaration: the report's judge line asserts nothing was declared and never says DECLARED",
        reportJudgeLine({ judge_pin: NO_JUDGE }, declared).startsWith("*Judge:* `none` —")
        && !/declared/i.test(reportJudgeLine({ judge_pin: NO_JUDGE }, declared))
        && !/declared/i.test(reportJudgeLine({ judge_pin: NO_JUDGE }, observed)));
      // The direction a downgrade case is usually blind in: the two pinned arms
      // must still assert what they always did, or the repair is a blanket
      // silencing rather than a third arm.
      ok("a pinned report judge line still says DECLARED where the Harness observed nothing, and OBSERVED where it did",
        /pin DECLARED, no Harness invocation record/.test(reportJudgeLine({ judge_pin: pin }, declared))
        && /OBSERVED, Harness invocation record `inv-1`/.test(reportJudgeLine({ judge_pin: pin }, observed)));
      // Acceptance 2. The rerun path re-renders a PRIOR record through this
      // same composer, so the clause must describe the RECORD; `observed:` read
      // as a claim about the run that re-read it, and a pre-#892 record
      // re-rendered by a `--subdivisions` rerun said the rerun observed nothing.
      ok("the report judge line names what the RECORD holds and never what the run passed, on all three arms",
        [reportJudgeLine({ judge_pin: NO_JUDGE }, declared),
          reportJudgeLine({ judge_pin: pin }, declared),
          reportJudgeLine({ judge_pin: pin }, observed)]
          .every((line) => /the record holds:|over subdivisions record sha/.test(line)
            && !/observed: /.test(line)));
      ok("full_report admits all three judge lines reportJudgeLine actually composes",
        admits("full_report", reportJudgeLine({ judge_pin: NO_JUDGE }, declared))
        && admits("full_report", reportJudgeLine({ judge_pin: pin }, declared))
        && admits("full_report", reportJudgeLine({ judge_pin: pin }, observed)));

      ok("a report record carrying no judgment_provenance reads as DECLARED rather than as observed",
        provenanceOf({}).state === JUDGMENT_DECLARED
        && provenanceOf(undefined).state === JUDGMENT_DECLARED
        && provenanceOf({ judgment_provenance: observed }).state === JUDGMENT_OBSERVED);
    }

    // ---- THE NEIGHBORHOOD ROW NAMES ITS THESIS-CANDIDATE TARGET (kogaki#861,
    // owner report 2026-09-04, owner rulings 2026-09-05). The Provenance
    // neighborhood sat in the same file as the Thesis candidates and was
    // related to nothing in it: a reader could not tell what a suggested
    // neighbor was FOR, and the level that ranks the row arrived at the end of
    // the sentence it ranks. These cases assert the four fixed line classes,
    // the judgment record's new required field, and the ordering that makes a
    // target checkable at all.
    //
    // SEAM-FREE, like every case above: the reader, the display and the section
    // are pure over their inputs, and the refusals are asserted through
    // `neighborhoodJudgmentsFrom`/`refuseTargetsOutsideCandidates`, which THROW
    // rather than exiting — the arrangement `emitOrRefuse` uses for the format
    // guard, and the reason these refusals are assertable at all.
    {
      const grammar = loadGrammar(REPORT_FORMAT);
      const admits = (surface, text) => validateSurface(surface, text, grammar)
        .every((v) => !/line_class_allowlist/.test(v));
      const refused = (fn) => {
        try { fn(); return null; }
        catch (e) { return e instanceof JudgmentRefusal ? e.message : null; }
      };
      const wellFormed = {
        "a/b": { level: "core", claim: "A decision from the thread that produced two of this group's members.",
          target: { candidate: "TC1", role: "Core" } },
      };

      ok("a judgment carrying level and claim and NO target is refused — the row's TC-target line is a fixed class and has nothing else to render from",
        /carries no target/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", claim: "a claim" } })) || ""));
      ok("a target that is not a Thesis-candidate id is refused, and so is one carrying no role — WHICH candidate and WHAT FOR are both owed",
        /is not a Thesis-candidate id/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", claim: "a claim", target: { candidate: "l15", role: "Core" } } })) || "")
        && /and no role for it/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", claim: "a claim", target: { candidate: "TC1" } } })) || ""));
      // THE CONTROL for the two above: the pre-existing refusals still fire and
      // a well-formed record still passes, so the new field is an addition
      // rather than a reader that refuses everything.
      ok("the level-with-no-claim refusal is untouched, and a well-formed record carries level, claim and target through the reader",
        /A level without a claim is a rank with no reason/.test(refused(() => neighborhoodJudgmentsFrom({
          "a/b": { level: "core", target: { candidate: "TC1", role: "Core" } } })) || "")
        && (() => {
          const j = neighborhoodJudgmentsFrom(wellFormed).get("a/b");
          return j.level === "core" && /A decision from the thread/.test(j.claim)
            && j.target.candidate === "TC1" && j.target.role === "Core";
        })());

      // A TARGET IS CHECKED AGAINST THE COMPOSED SET, not against its own shape:
      // `TC9` is a well-formed id naming nothing in a three-candidate pull.
      ok("a target naming a Thesis candidate the pull does not carry is refused, naming the row and the composed set; one inside the set passes",
        /TC9/.test(refused(() => refuseTargetsOutsideCandidates(
          neighborhoodJudgmentsFrom({ "a/b": { level: "core", claim: "c", target: { candidate: "TC9", role: "Core" } } }),
          ["TC1", "TC2", "TC3"], "J3_neighborhood")) || "")
        && refused(() => refuseTargetsOutsideCandidates(
          neighborhoodJudgmentsFrom(wellFormed), ["TC1", "TC2", "TC3"], "J3_neighborhood")) === null);

      // ---- THE ROW ITSELF. One judged suggestion, rendered through the display
      // the report section reuses, so what is asserted is what the owner reads.
      const row = (over = {}) => ({
        nid: "N3", slug: "a/b", level: "core",
        relation: "from the same Batch as L15, L97 (q_a/2026-08-08)",
        claim: "A decision from the thread that produced two of this group's members.",
        target: { candidate: "TC1", role: "Core" },
        gloss: "Binding claims at the refusing layer", gloss_cite: "product-lab@aaaaaaa gloss/ELEMENTS.jsonl:12",
        ...over,
      });
      const linesOf = (over) => neighborhoodDisplay({ tag: "t", gids: ["G1"], suggestions: [row(over)] });
      const shown = linesOf();
      const at = (re) => shown.findIndex((l) => re.test(l));

      ok("the row states its level at the HEAD, beside the id and before the relation",
        /^- N3 \[core\] — from the same Batch as L15, L97/.test(shown[at(/^- N3 /)] || ""));
      ok("the claim line carries NO trailing level — the level has one carrier and it is the row above",
        (() => {
          const claimLine = shown.find((l) => /A decision from the thread/.test(l));
          return claimLine === "  A decision from the thread that produced two of this group's members."
            && !/\[core\]/.test(claimLine);
        })());
      ok("the four line classes render in the ruled order: row, TC target, Gloss, claim",
        (() => {
          const i = at(/^- N3 /);
          return i >= 0 && shown[i + 1] === "  serves: Core for TC1"
            && /^  “Binding claims at the refusing layer”/.test(shown[i + 2] || "")
            && /^  A decision from the thread/.test(shown[i + 3] || "");
        })(), JSON.stringify(shown.slice(-4)));
      ok("the TC-target line is a FIXED class: a row reaching the renderer with no target renders the typed absence marker rather than dropping the line",
        (() => {
          const l = linesOf({ target: undefined });
          const i = l.findIndex((x) => /^- N3 /.test(x));
          return l[i + 1] === `  ${NO_TARGET}` && l.length === shown.length;
        })());

      // THE GLOSS LINE SURVIVES THE REFORMAT, absence markers included (owner
      // ruling 2026-09-05). A row whose shard carried nothing must still say so:
      // four clean lines over an unreported fault is the anti-correlated check.
      ok("the Gloss line still renders quoted at its cite, and each of the three typed absence markers still renders in its place",
        /^  “Binding claims at the refusing layer”  product-lab@aaaaaaa/.test(shown[at(/^- N3 /) + 2] || "")
        && [[{ gloss: null, gloss_cite: null }, NO_SHARD_ADDRESSED],
          [{ gloss: NO_SEAM, gloss_cite: null }, NO_SEAM],
          [{ gloss: "a headline with no address", gloss_cite: null }, NO_HEADLINE]]
          .every(([over, marker]) => {
            const l = linesOf(over);
            return l[l.findIndex((x) => /^- N3 /.test(x)) + 2] === `  ${marker}`;
          }));

      // THE GRAMMAR ADMITS WHAT THE EMITTER PRODUCES — the direction PR #658's
      // defect ran in, where a class never admitted its own emitter's line and
      // nothing said so.
      ok("full_report admits every line the reformatted row emits, on the quoted-Gloss arm and on all four absence arms",
        [shown, linesOf({ target: undefined }), linesOf({ gloss: null, gloss_cite: null }),
          linesOf({ gloss: NO_SEAM, gloss_cite: null }), linesOf({ gloss: "x", gloss_cite: null })]
          .every((l) => admits("full_report", l.slice(1).join("\n"))));

      // AND THE CLASSES THEMSELVES CARRY IT, which the surface-level case above
      // CANNOT assert. `neighborhood_suggestion_claim` lost its trailing level
      // and now pins no literal, so it admits any two-space-indented line —
      // deleting the target class outright leaves the surface admitting the
      // target line under the claim class, and `admits` stays green. Verified by
      // running that mutation, which is why this case reads the DECLARED class
      // by id and drives its own matcher.
      ok("the grammar's own classes carry the reformat: the target class admits the emitted line and refuses one naming no candidate, the absence marker has its own class, and the row class refuses the pre-#861 level-less row",
        (() => {
          const byId = (id) => {
            const e = ((grammar.surfaces.full_report || {}).line_classes || []).find((x) => x.id === id);
            return e ? classMatchers(e, grammar) : null;
          };
          const m = (res, line) => !!res && res.some((re) => re.test(line));
          return m(byId("neighborhood_suggestion_target"), "  serves: Core for TC1")
            && !m(byId("neighborhood_suggestion_target"), "  serves: Core for L1")
            && m(byId("neighborhood_suggestion_target_absent"), `  ${NO_TARGET}`)
            && m(byId("neighborhood_suggestion_row"), "- N3 [core] — from the same Batch as L15")
            && !m(byId("neighborhood_suggestion_row"), "- N3 — from the same Batch as L15");
        })());

      // ---- THE IDS ARE FIXED BEFORE THE JUDGMENT, which is what makes a target
      // checkable. Asserted from the OTHER side too: the section renders the id
      // it was handed, so a section that re-mints from its loop index fails.
      ok("readThesisCandidates mints the TC ids, and the Thesis candidates section renders the id it is handed rather than its own loop index",
        (() => {
          const composed = readThesisCandidates(
            [{ claim: "one", strands: ["L1", "L2"] }, { claim: "two", strands: ["L2", "L3"] },
              { claim: "three", strands: ["L1", "L3"] }],
            ["L1", "L2", "L3"], { thesis_candidates: 3 });
          const section = thesisCandidatesSection([{ id: "TC7", claim: "seven", strands: ["L1", "L2"] }]);
          return composed.map((c) => c.id).join(",") === "TC1,TC2,TC3"
            && section.some((l) => l === "- TC7 — seven");
        })());

      // ---- A RECORD PREDATING THE ID MINT IS RECOMPUTED, NEVER REPLAYED AND
      // NEVER REFUSED (PR #923 round 1, finding 2). The section's refusal is
      // right about a caller that bypassed the reader and wrong about a stored
      // record written before the field existed; the replay guard is what keeps
      // the second out of the first's reach. The CONTROL is the other half —
      // a record whose candidates all carry ids still replays, so this is a
      // guard on one shape and not a blanket disabling of the rerun path.
      ok("a stored report record whose Thesis candidates carry no id is recomputed rather than replayed, and one that carries them still replays",
        (() => {
          const pre = { thesis_candidates: [{ claim: "one", strands: ["L1"] }] };
          const post = { thesis_candidates: [{ id: "TC1", claim: "one", strands: ["L1"] }] };
          const none = { thesis_candidates: [] };
          // THE DECISION IS WHAT IS CALLED, never the conjunct alone: the
          // identity comparison is injected so this reaches the same function
          // `cmdReport` asks. ALL THREE CONJUNCTS ARE REACHED, and the third
          // one is why the injection takes two values rather than one
          // (kogaki#926): with `same` alone every assertion above was decided
          // by the two predating guards and the id predicate, so deleting
          // `sameIdentityFn(...)` from `shouldReplayPrior` left this case
          // GREEN — the case claimed the whole decision and bound two thirds
          // of it. `differs` is the discriminator: the records that replay
          // under a comparison returning true are RECOMPUTED under one
          // returning false, which no other conjunct can produce.
          const same = () => true;
          const differs = () => false;
          const idty = { neighborhood_judgment: "NO_JUDGE" };
          const wrap = (r) => ({ identity: idty, ...r });
          return priorPredatesCandidateIds(pre)
            && !priorPredatesCandidateIds(post)
            && !priorPredatesCandidateIds(none)
            && !priorPredatesCandidateIds({})
            && !shouldReplayPrior(wrap(pre), idty, same)
            && shouldReplayPrior(wrap(post), idty, same)
            && shouldReplayPrior(wrap(none), idty, same)
            && !shouldReplayPrior({ identity: {} }, idty, same)
            && !shouldReplayPrior(wrap(post), idty, differs)
            && !shouldReplayPrior(wrap(none), idty, differs);
        })());

      // ---- THE SHIPPED COMPARATOR IS DRIVEN, NOT INJECTED (kogaki#974). The
      // case above binds the identity conjunct's PRESENCE in the decision and
      // nothing else: all six of its `shouldReplayPrior` calls pass a stub
      // through `sameIdentityFn`, while `cmdReport` calls with the DEFAULT. So
      // `sameIdentity` and its `reportIdentityKey` had no reader in any case,
      // and dropping the `neighborhood_judgment` component from that key left
      // the pass green at 95 — the bind-a-proxy shape kogaki#926 repaired one
      // layer up, at the next seam in.
      //
      // The two records differ ONLY in that component, which is what makes the
      // comparator the thing being asserted: every other conjunct of the
      // decision is identical across the pair, so no predating guard and no id
      // predicate can produce the discrimination.
      //
      // THE kogaki#741 ABSENCE-HASHING RULE IS REACHED HERE RATHER THAN STATED
      // IN A COMMENT. It is unreachable through `shouldReplayPrior`, whose
      // `predatesJudgmentKey` guard short-circuits on exactly the record the
      // rule is about, so the rule is driven through the exported `sameIdentity`
      // directly — with a control that an absent component still discriminates
      // against a REAL judgment, so the case is not satisfied by a key that
      // hashes everything to `NO_JUDGE`.
      ok("shouldReplayPrior with the SHIPPED comparator recomputes two report identities differing only in neighborhood_judgment, and an absent component hashes as NO_JUDGE without collapsing the key",
        (() => {
          const identity = (nj) => ({
            pin: "product-lab@abc1234",
            query: { tag: "testing", ids: ["G1", "G2"] },
            judge_pin: NO_JUDGE,
            neighborhood_judgment: nj,
          });
          const a = identity("J-A");
          const b = identity("J-B");
          // NO THIRD ARGUMENT — this is the call `cmdReport` makes.
          const replaysAtItsOwnIdentity = shouldReplayPrior({ identity: a }, a);
          const recomputesAtTheOther = !shouldReplayPrior({ identity: a }, b);
          // the kogaki#741 rule, and its control.
          const absenceHashesAsNoJudge = sameIdentity(identity(undefined), identity(NO_JUDGE));
          const absenceStillDiscriminates = !sameIdentity(identity(undefined), a);
          return replaysAtItsOwnIdentity
            && recomputesAtTheOther
            && absenceHashesAsNoJudge
            && absenceStillDiscriminates;
        })());

      // ---- AND THE SAME DISCRIMINATION OVER THE BINARY COMPONENT (kogaki#1076,
      // PR #1078 round 1 finding 1). The component was added to
      // `reportIdentityKey` with nothing driving the comparator over it: the
      // registered fixture asserts the pin's COMPOSITION in a written report, so
      // striking the component back out of the key left both it and this pass
      // green -- the kogaki#974 defect one component over, arriving through the
      // same door and repaired with the same shape.
      //
      // THE CLAIM UNDER TEST IS THE ONE SPEC-terrain §"THE JUDGE BINARY IS THE
      // RUN'S, RESOLVED ONCE BY THE SESSION THAT STARTS IT" MAKES: two runs with equal
      // `model_id` and `effort_tier` that ran different executables are DIFFERENT
      // identities. So the pair differs only in `binary_version` and every other
      // conjunct is identical, which is what makes the comparator the thing being
      // asserted rather than some other guard. The absence control is the
      // kogaki#741 rule applied to this component -- a pin written before the
      // field existed hashes as `NO_JUDGE`, which is what it meant -- with its
      // own control that the absence still discriminates against a pin naming a
      // binary, so the case is not satisfied by a key that hashes everything.
      ok("two report identities differing ONLY in the judge pin's binary_version are not the same identity, and an absent component hashes as NO_JUDGE without collapsing the key",
        (() => {
          const identity = (bv) => ({
            pin: "product-lab@abc1234",
            query: { tag: "testing", ids: ["G1", "G2"] },
            judge_pin: { model_id: "m", effort_tier: "high", binary_version: bv },
            neighborhood_judgment: NO_JUDGE,
          });
          const a = identity("claude 1.2.3");
          const b = identity("claude 4.5.6");
          const sameAtItself = sameIdentity(a, a);
          const differsOnTheBinary = !sameIdentity(a, b);
          const absenceHashesAsNoJudge = sameIdentity(identity(undefined), identity(null));
          const absenceStillDiscriminates = !sameIdentity(identity(undefined), a);
          // AND THROUGH THE DECISION TOO, on the kogaki#974 case's own ground: the
          // comparator is what `cmdReport` reaches with NO third argument, so a
          // case that only called `sameIdentity` would leave the shipped call
          // path unread exactly as the six injected calls above it did.
          const replaysAtItsOwnIdentity = shouldReplayPrior({ identity: a }, a);
          const recomputesAtTheOther = !shouldReplayPrior({ identity: a }, b);
          return sameAtItself && differsOnTheBinary
            && absenceHashesAsNoJudge && absenceStillDiscriminates
            && replaysAtItsOwnIdentity && recomputesAtTheOther;
        })());

      // ---- THE RESOLUTION'S TWO EXPORTS HAVE A READER (kogaki#1076, PR #1078
      // round 1 finding 2). `checks/check-terrain-judge-invocation.sh` drives
      // them through a whole start act, which is the property that matters and is
      // also the most expensive way to ask any single question about them; these
      // are the two questions a fixture that builds a PATH and runs `node` cannot
      // ask cheaply, and an export offered to nobody reads as a case that was
      // intended and not written.
      ok("judgeBinaryCandidates walks PATH in its declared order and de-duplicates it, and treats a command carrying a separator as its own single candidate",
        (() => {
          const walked = judgeBinaryCandidates("claude", ["/a", "/b", "/a", "", "/c"].join(delimiter));
          const inOrder = JSON.stringify(walked)
            === JSON.stringify(["/a/claude", "/b/claude", "/c/claude"]);
          // A PATH LOOKUP IS WHAT A BARE WORD GETS, and nothing else does: an
          // absolute path and a relative one are each already the single
          // candidate this act exists to produce, so neither is searched for.
          const absolute = judgeBinaryCandidates("/opt/claude", ["/a", "/b"].join(delimiter));
          const relative = judgeBinaryCandidates("./bin/claude", ["/a", "/b"].join(delimiter));
          return inOrder
            && JSON.stringify(absolute) === JSON.stringify(["/opt/claude"])
            && relative.length === 1 && relative[0].endsWith("/bin/claude");
        })());

      // A SHIM AHEAD OF A WORKING BINARY, AT THE FUNCTION. The shim EXISTS and is
      // EXECUTABLE and fails only when it is run, so a resolution testing either
      // property picks it; this is the case that says the walk RUNS its
      // candidates. It asserts the rejected candidate is NAMED as well, because
      // the refusal is composed from that list and "the judge could not be run"
      // over a bare word is not something an operator can act on -- the refusal
      // itself is driven end to end by the registered fixture's case (b), which
      // is where a `process.exit` refusal can be observed.
      ok("resolveJudgeBinary runs each PATH candidate and takes the first that exits 0, naming the ones it rejected",
        (() => {
          const root = mkdtempSync(join(tmpdir(), "terrain-judge-resolve-"));
          const shimDir = join(root, "shim");
          const goodDir = join(root, "good");
          mkdirSync(shimDir, { recursive: true });
          mkdirSync(goodDir, { recursive: true });
          const shim = join(shimDir, "claude");
          const good = join(goodDir, "claude");
          writeFileSync(shim, '#!/bin/sh\nexec "$0.exe" "$@"\n', { mode: 0o755 });
          writeFileSync(good, "#!/bin/sh\necho 'fixture-judge 9.9.9'\n", { mode: 0o755 });
          const r = resolveJudgeBinary("claude", [shimDir, goodDir].join(delimiter));
          rmSync(root, { recursive: true, force: true });
          return r.path === good
            && r.version === "fixture-judge 9.9.9"
            && r.rejected.length === 1 && r.rejected[0].path === shim;
        })());

      // ---- AN EDITED CANDIDATES FILE AT THE SAME IDENTITY IS NOT IDEMPOTENT
      // (kogaki#927). The defect this binds reported SUCCESS: `--thesis-candidates`
      // decided the Thesis candidates and the `serves: … for TC<n>` rows while
      // sitting in neither the identity nor the recorded set, so the rerun
      // replayed the prior
      // section and printed that it was idempotent. The case drives the two
      // functions `cmdReport`'s replay branch actually asks — the digest
      // composer and the delta — over REAL FILE BYTES, because the digest is a
      // read of the file and asserting over hand-written digests would bind a
      // restatement rather than the act.
      //
      // FOUR CONJUNCTS, and each is one of the ways the fix could be wrong: the
      // flag is in the set at all; an edited file is NAMED in the delta rather
      // than merely counted; an UNCHANGED file still reports empty, which is the
      // control that this is not a blanket disabling of the rerun path; and a
      // record predating the field recomputes rather than refusing.
      ok("an edited --thesis-candidates file at the same identity is named in the composed-input delta, an unchanged one still replays, and a record predating the field recomputes",
        (() => {
          const d = join(tmpdir(), `terrain-selftest-tc-${process.pid}`);
          mkdirSync(d, { recursive: true });
          try {
            const write = (name, body) => {
              const f = join(d, name);
              writeFileSync(f, JSON.stringify(body, null, 2) + "\n");
              return f;
            };
            const claims = write("claims.json", { a: 1 });
            const before = write("tc-before.json", [{ claim: "one", strands: ["L1", "L2"] }]);
            const after = write("tc-after.json", [{ claim: "ONE, EDITED", strands: ["L1", "L2"] }]);
            const argsOf = (tc) => ({ claims, "thesis-candidates": tc });

            const prior = composedInputDigests(argsOf(before));
            const edited = composedInputDigests(argsOf(after));
            const same = composedInputDigests(argsOf(before));

            const namesIt = COMPOSED_INPUT_FLAGS.includes("thesis-candidates");
            const deltaEdited = composedInputDelta(prior, edited);
            const deltaSame = composedInputDelta(prior, same);
            // A PRE-#927 RECORD carries every other flag and not this one.
            const preRecord = { ...prior };
            delete preRecord["thesis-candidates"];

            return namesIt
              && prior["thesis-candidates"] !== NO_JUDGE
              && composedInputDigests({ claims })["thesis-candidates"] === NO_JUDGE
              && Array.isArray(deltaEdited) && deltaEdited.join(",") === "thesis-candidates"
              && Array.isArray(deltaSame) && deltaSame.length === 0
              && composedInputDelta(preRecord, edited) === null;
          } finally {
            rmSync(d, { recursive: true, force: true });
          }
        })());

      // ---- THE ORDERING, read from the shipped carrier (the workflow table keeps the state
      // set there, so this is a property of the table and not of this file).
      ok("the shipped table composes the Thesis candidates as a judgment point AHEAD of J3_neighborhood, which is ahead of the full_report write",
        (() => {
          const ids = shipped.states.map((x) => x.id);
          const tc = shipped.states.find((x) => x.id === "thesis_candidates");
          return !!tc && tc.kind === "judgment"
            && ids.indexOf("thesis_candidates") < ids.indexOf("J3_neighborhood")
            && ids.indexOf("J3_neighborhood") < ids.indexOf("full_report");
        })());
    }

    // ---- THE SUBDIVISION RECORD'S ARGUMENT PATH (kogaki#1085 fixture 3(b)).
    //
    // The states that RESOLVE an entered id now join the subdivision record from
    // the run record, because a hook-driven run supplies no argv and every
    // SubGroup id the display had just printed resolved to nothing. The join is
    // a FALLBACK ORDER and not a replacement: an explicit `--subdivisions` still
    // wins, which is what keeps the fixture and second-repository paths --
    // callers with a record on disk and no run record at all -- resolving
    // exactly the ids they resolve today. These two cases are that path and its
    // control, driven over `resolveReportTargets` itself.
    {
      const subdivDir = mkdtempSync(join(tmpdir(), "terrain-selftest-subids-"));
      try {
        const members = ["m1", "m2", "m3", "m4", "m5", "m6"];
        const record = { candidates: members.map((id) => ({ id, tags: ["fix", "wide"] })) };
        const groupName = "fix × wide";
        const subgroup = (name, ms) => ({
          name, claim: `A fixture claim over ${ms.length} member(s).`, members: ms,
          verdicts: { coherence: "tight", coherence_why: "a fixture reason" },
        });
        const subPath = join(subdivDir, "subdivisions.json");
        writeFileSync(subPath, JSON.stringify({
          [groupName]: {
            judged: true,
            subgroups: [subgroup("the first three", members.slice(0, 3)),
                        subgroup("the second three", members.slice(3))],
          },
        }) + "\n");
        ok("a caller supplying --subdivisions resolves a SubGroup id to that SubGroup's members alone, with no run record in play",
          (() => {
            const r = resolveReportTargets(record, "fix", ["G1-1"], { subdivisions: subPath });
            const t = r.targets[0];
            return r.targets.length === 1
              && t.kind === "subgroup"
              && t.gid === "G1-1"
              // NARROWER THAN THE PARENT, which is the half that discriminates:
              // a resolver that quietly handed back the whole Group would render
              // the same report and pass a membership-free assertion.
              && t.sg.members.join(",") === "m1,m2,m3"
              && t.group.members.length === 6;
          })());
        ok("the same display with no subdivisions record offers no SubGroup ids at all — the control that the case above is about the record rather than about the id",
          (() => {
            const r = resolveReportTargets(record, "fix", ["G1"], {});
            return r.subOf(r.groups[0]) === null
              && r.targets.length === 1
              && r.targets[0].kind === "group";
          })());
      } finally {
        rmSync(subdivDir, { recursive: true, force: true });
      }
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
    console.log(`usage: terrain.mjs <start|run|survey|cotags|compose-input|report|validate|self-test> [--run-dir DIR] ...
  start [--run-dir D] [--workflow F]        THE START ACT, executed by the harness's skill
                                            expansion — the terrain skill file's one \`!\` line.
                                            Opens the run, runs to its first wait, stops. It
                                            refuses an existing run record: start opens a run,
                                            it never resumes one (kogaki#1027).
  run [--run-dir D] [--workflow F]
      (the hook payload is read from stdin; there is no flag for the owner's answer, and
       --input, --at and --enter are DELETED and refused by name — kogaki#1027)
      [--claims F] [--subdivisions F] [--classification F] [--neighborhood F] [--thesis-candidates F]
      [--judge-model M] [--judge-effort E] [--judge-binary-version V]
      (the five record flags are OPTIONAL since kogaki#1030: a judgment state whose
       flag is absent INVOKES THE JUDGE ITSELF, using the model src/workflow.json's
       \`judge\` block pins -- never one inherited from the session -- and retries a
       refused response the number of times that state declares before failing with
       the refusal text. A flag that IS supplied still wins, unchanged.)
                                            THE CONTROL PLANE. One entry point, entered once
                                            per act: reads the run record, executes the states
                                            src/workflow.json declares until the
                                            next declared WAIT or the TERMINAL, writes that
                                            state's artifact, and stops. It never asks — a wait is
                                            the executor stopping and the owner speaking, so
                                            re-enter with --input '<what they said>'. Order,
                                            kinds, waits, write bindings, grammar surfaces,
                                            conditionality and judgment placement are read from
                                            the table on every run and are held nowhere in this
                                            file. --workflow runs an alternate table (the
                                            evolvability fixture). It advances ONLY inside a
                                            harness hook event: a transition arriving with no
                                            payload on stdin is refused before any write, and
                                            every transition it does write names the hook that
                                            executed it. No conditional state is entered — the
                                            selector that entered one was --enter, and it is
                                            deleted.
  run --status [--run-dir D] [--workflow F]  counts this run from its record alone, beside the
                                            counts derived from the table's states array and the
                                            table's own counted_baseline (#625 acceptance item 2).
  survey                                    compose the survey from the seam (element_survey)
  compose-input --survey F --tag T          the BOUNDED input for the claim and subdivision
                                            composers (the rendering rule): one tag-scoped shard pair, fetched
                                            once, material keyed by member id and groups
                                            carrying ids only — so a member in several groups
                                            is read once and the read count does not grow with
                                            the placements. Run it BEFORE composing --claims.
  cotags --survey F --tag T [--group G] [--claims F]
         [--subdivisions F --judge-model M --judge-effort E [--judge-binary-version V]] [--connective F]
                                            the second navigation step (the co-tag navigation step) — narrows nothing.
                                            The heading carries the GroupID, Lesson count and
                                            member IDs, claim beneath (the display's serve rule v5); SubGroups
                                            where semantic subdivision's conditions bind (the SubGroup threshold). --claims and
                                            --subdivisions are maps keyed by group name; a
                                            group missing a claim is MARKED, never substituted.
  report --survey F --tag T (--group G | --all-groups) [--claims F]
         [--subdivisions F] [--neighborhood F] [--thesis-candidates F]
         [--judge-model M --judge-effort E [--judge-binary-version V]] [--report-dir D]
                                            the Full Report — untruncated Claims and
                                            Glosses, identified by the QUADRUPLE (substrate pin,
                                            co-tag query, judge pin, neighborhood judgment
                                            record — widened from the triple at kogaki#741).
                                            TWO ARTIFACTS (location and naming v11):
                                            --neighborhood carries the judgment layer: one
                                            level (core|useful|background), one claim and one
                                            target per candidate, keyed by slug (the neighborhood section's shape,
                                            kogaki#686, kogaki#861). The target is
                                            {"candidate":"TC<n>","role":"…"} and names a
                                            Thesis candidate of THIS pull, so a judged
                                            neighborhood REQUIRES --thesis-candidates: the
                                            absent-candidates fallback does not apply to it.
                                            the machine RECORD in the run workspace, and the
                                            owner RENDERING — exactly ONE file,
                                            reports/FullReport.md, overwritten per pull
                                            (location and naming v12) — repo-visible and still never
                                            committed. Both are
                                            written in the same act; --no-render opts out of the
                                            rendering. A rerun under the same identity is
                                            idempotent, not a duplicate. --all-groups is the open questions's
                                            decided EAGER reading (v5): the co-tag view
                                            generates one report per composed group.
  validate --survey F                       run the composition rules on a record
  self-test                                 the composed-form fixture pass (identity cites, kogaki#612)

 At a wait that declares a gate, the executor WRITES the run declaration and names its path.
 Beside it, the byte-fixed gate call the harness renders; the exclusivity hook admits that payload and
 no other (kogaki#1028).
 THE RE-ENTRY IS NOT YOURS TO MAKE: .claude/hooks/advance-terrain.py runs the executor inside the
 PostToolUse hook for that question, after .claude/hooks/write-gate-capture.py has written the
 owner's answer. A Bash command naming this file with any verb but --status is denied.`);
    process.exit(cmd ? 1 : 0);
}
}
