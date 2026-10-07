#!/usr/bin/env node
// Terrain — the survey/selection surface (manifest item 1, specs/SPEC.md, the port manifest;
// kogaki#14 umbrella, kogaki#17 story 1.8; governing spec SPEC-terrain).
// Reads SERVED RENDERINGS only, through the seam (element_survey). Validates a survey record
// BEFORE writing it, with the rules checks/check-terrain-composition.sh applies after.
// Run state lives in `runs/terrain/<timestamp>/` (kogaki#750): machine state, never committed.
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
// A spec name used here is a pointer to SPEC-terrain, except what `options_offered` is judged
// against (SPEC-gate-carrier) and "Human-facing files live where the human works" (specs/SPEC.md).
import { spawnSync, spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, existsSync, openSync, closeSync, writeSync, rmSync, renameSync, readdirSync } from "node:fs";
import { basename, delimiter, dirname, join, resolve, sep } from "node:path";
import { homedir, tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
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

// THE PENDING RUN RECORD, held for exactly as long as a run's state loop is executing
// (kogaki#808). `fail()` persists it before exiting, so a refusal inside a state no longer
// discards the transitions the same act already performed (specimen: `J3_neighborhood`).
// A refusal stays a refusal: same exit code, same text — only the rollback is removed.
let RUN_PERSIST = null;

function setRunPersist(dir, rec) {
  RUN_PERSIST = dir && rec ? { dir, rec } : null;
}

// THE PERSIST NEVER MASKS THE REFUSAL IT RIDES. A write that throws is
// swallowed deliberately: the operator is being told why the act refused, and
// a second failure reported in its place would replace a diagnosis with an
// accident of the tracing.
// EXPORTED AT kogaki#1108. `src/brief.mjs`'s own `fail` calls it, so a refusal
// raised inside a Brief state persists the transitions that act completed before
// it — the property kogaki#808 established for this file, reaching the second
// runtime through the one implementation rather than a copy of it.
export function persistPendingRun() {
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
// Inside the window `fail()` throws the refusal instead of exiting, so `invokeJudge`'s caller
// can re-ask up to the count `terrain-workflow.json` declares; refusals are not duplicated.
// The window wraps ONE judge-response validation and closes in a `finally`; it is COUNTED, not
// boolean, so a nested open cannot close it early. Everywhere else a refusal still exits.
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

// The run workspace: an explicit `--run-dir` or `KOGAKI_RUN_DIR` wins; only the DEFAULT lives
// in this lane's directory in the tree (kogaki#750), and only the default path PRUNES.
// `enterRun` prunes before it creates, so the bound is the run's first act.
// ---- WHICH FLOW THIS ACT IS AN ACT OF (kogaki#1108) -----------------------
// The executor names no state (kogaki#625); `FLOW` binds table, lane directory, capture prefix,
// renderers and option composers. Process-wide, like `OPENED_BY` and `WRITING_STATE`: one
// invocation is one act of one flow, set by `runWorkflow`. Default is Terrain's.
let FLOW = null;
function flow() { return FLOW || TERRAIN_FLOW; }

function runDir(args) {
  const f = flow();
  if (args["run-dir"] || process.env[f.runDirEnv]) {
    const dir = args["run-dir"] || process.env[f.runDirEnv];
    mkdirSync(dir, { recursive: true });
    return dir;
  }
  return f.newRunDir();
}

// ---- WHICH RUN THE ADVANCE IS AN ADVANCE OF (PR #1034 round 1, blocking) ----
// kogaki#1027 removed `--run-dir` as the session's run-identity carrier; without one the default
// branch mints a new workspace per invocation and orphans the open run's gate pointer.
// The carrier is a pointer file in the lane directory: written at `start`, read by the advance,
// removed at the run's terminal. Machine-local under `runs/`, never committed.
const OPEN_RUN_POINTER = "open-run";

// `KOGAKI_OPEN_RUN` overrides the pointer path for tests, on the idiom
// `KOGAKI_OPEN_GATES` already sets one seam over. It exists because the
// alternative is exercising `runDir`'s DEFAULT branch, which `terrain-runtime`'s
// own registry record declines to assert for a stated reason: driving it prunes
// this repository's real terrain lane, so a fixture pass would evict an owner's
// runs to check a path.
function openRunPointerPath() {
  const f = flow();
  return process.env[f.openRunEnv] || join(laneDir(f.lane), OPEN_RUN_POINTER);
}

function readOpenRunPointer() {
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

// EXPORTED, BUT EVERY CALLER IS WITHIN THIS FILE (kogaki#1193 PR #1195 review
// round 1, nit d — this comment previously claimed `brief.mjs` called it,
// which a grep across the tree does not bear out): the gate-answer "stop" and
// judgment-retry "abandon" arms in `runWorkflow`'s own answer-applying block
// clear the pointer here, in `terrain.mjs`. It stays exported because the
// export surface this module presents is not scoped file-by-file.
export function clearOpenRunPointer() {
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

// ---- SURVEY VALIDATION ----------------------------------------------------
// Survey validation — the same rules the check applies, run BEFORE writing.
// Returns a list of "CODE — detail" strings; empty = conforming.
function validateSurvey(record, schema = SURVEY_SCHEMA) {
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
function familySplit(ids, candidates, schema = SURVEY_SCHEMA) {
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
const NO_DISPLAY_ID = "⟨no display_id — ABNORMAL, a survey record predating the display-ID rule, never substituted⟩";

function displayIdOf(id, candidates) {
  const c = (candidates || []).find((x) => x && x.id === id);
  return c && c.display_id ? c.display_id : NO_DISPLAY_ID;
}

// DISPLAY IDS COMPARE NUMERICALLY (kogaki#689, PR #693 round 1). `L2` before
// `L10`, and the abnormal marker last — a lexicographic sort orders "L1", "L10",
// "L2" in that order, and a display id's number is its meaning on every surface
// in this file.
function compareDisplayIds(a, b) {
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
function displayIds(ids, candidates) {
  const rendered = (ids || []).map((id) => displayIdOf(id, candidates));
  return { rendered, missing: rendered.filter((r) => r === NO_DISPLAY_ID).length };
}

// The one line every surface prints when `displayIds` reported a shortfall.
// Stated once so the eight call sites cannot drift into eight wordings.
function displayIdAbnormalLine(missing, total) {
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
function cmdSurvey(args) {
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
function strandFigure(split) {
  const total = SURVEY_SCHEMA.families.reduce((n, f) => n + (split[f] || 0), 0);
  return `${total} — ${SURVEY_SCHEMA.families.map((f) => {
    const n = split[f] || 0;
    return `${n} ${n === 1 ? f : `${f}s`}`;
  }).join(" + ")}`;
}

function denominator(inView, served) {
  return `${inView} of ${served} Lessons`;
}

function sectionFigure(sec, lessonsServed) {
  return `${sec.name} (${strandFigure(sec.by_family)}); ${denominator(sec.members.length, lessonsServed)}`;
}

// A count of Lessons, family-named (SPEC.md, the rendering rule): the figure names the one
// family the candidate model puts on the row.
function lessonCount(n) {
  return `${n} ${n === 1 ? "Lesson" : "Lessons"}`;
}

// Display 1's tag row renders a declared ALLOWLIST and nothing else
// (SPEC.md, the rendering rule, v5, kogaki#147): the tag name, and the tag's Lesson count. A
// line class not on the allowlist does not render — the remedy is the
// constructive form, never a per-column removal, because an enumerated
// prohibition's non-member fallback is admit.
function tagRow(sec) {
  return `${sec.name} — ${lessonCount((sec.by_family || {}).lesson || 0)}`;
}

// ---- VIEW -----------------------------------------------------------------
// view — navigation. Narrows nothing; the record is never rewritten.
// A tier-2 gloss shard, parsed into slug → { headline, cite }. The headline is
// the SERVED rendering's first sentence, quoted at the cite the seam returned —
// never re-parsed from a file and never composed here (SPEC.md, the served-renderings input rule, the rendering rule).
function parseGlossShard(resp) {
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

// ---- SHARD ADDRESSES ------------------------------------------------------
// Shard ADDRESSES are selected from the served enumeration, never composed here (kogaki#1106).
// An address is a cell of `axis=value` pairs in the Kind's declared order, and cell shapes vary
// (product-lab@7e109c8c views/lessons/tag=agents,window=2026-08.md:3-5); never render a path.
// `surface_names(kind: "gloss")` names every shard; a (namespace, tag) request resolves to the
// served names whose namespace matches and whose cell carries that tag.
// Establishes the ADDRESS conjunct from the DISCLOSURE one (product-lab@7e109c8c LESSONS.md:168);
// a shard `surface_names` stops enumerating reports as an address fault.
// A served name parsed into its namespace and its cell; null for a name that is not an address,
// which the selector's caller reports rather than skips.
function parseShardName(name) {
  if (typeof name !== "string") return null;
  const slash = name.indexOf("/");
  if (slash <= 0 || slash === name.length - 1) return null;
  const namespace = name.slice(0, slash);
  const cell = new Map();
  for (const pair of name.slice(slash + 1).split(",")) {
    const eq = pair.indexOf("=");
    // A SEGMENT WITH NO `=` IS NOT AN AXIS PAIR, and is kept under the empty
    // axis name rather than dropped: a name shaped `lessons/agents` — the form
    // this module used to compose — must not parse as a cell carrying
    // `tag=agents`, or the selector would match the very address the surface
    // stopped serving and the fault would be invisible again.
    if (eq <= 0) { cell.set("", pair); continue; }
    cell.set(pair.slice(0, eq), pair.slice(eq + 1));
  }
  return { name, namespace, cell };
}

// The served names addressing (namespace, tag), in the order the surface served
// them. PURE, and separate from the read above it, because the property this
// change asserts is about ADDRESS SELECTION and a case that had to reach a
// gateway to drive it would be asserting the seam instead.
function selectShardNames(names, namespace, tag) {
  const out = [];
  for (const n of names || []) {
    const p = parseShardName(n);
    if (!p || p.namespace !== namespace) continue;
    if (p.cell.get("tag") !== tag) continue;
    out.push(p.name);
  }
  return out;
}

// THE ENUMERATION IS READ ONCE PER PROCESS. It is one call for the whole run
// and it is what every address in this module is now derived from, so a
// per-caller read would spend the same request repeatedly to learn the same
// thing. `null` means the read did not happen — which is a seam state and not
// an empty corpus, and the two are kept apart by the caller.
let SERVED_SHARD_NAMES;
function servedShardNames({ soft = false } = {}) {
  if (SERVED_SHARD_NAMES !== undefined) return SERVED_SHARD_NAMES;
  const resp = gatewayQuery("surface_names", { kind: "gloss" }, { soft });
  // A TRANSPORT FAILURE AND AN EMPTY ENUMERATION ARE DIFFERENT ANSWERS. The
  // first establishes nothing; the second is the surface saying it serves no
  // Gloss shard, which is a read and is the empty corpus.
  SERVED_SHARD_NAMES = resp ? (resp.miss ? [] : (resp.lines || []).map((l) => l.text.trim()).filter(Boolean)) : null;
  return SERVED_SHARD_NAMES;
}

// Tag-scoped and bounded: the shards the served enumeration names for the viewed tags, and
// nothing else (SPEC.md, the rendering rule). A tag may span several cells; read them all, since
// a cell not read is material silently absent.
// `stats` is an out-parameter; `resolveHeadlines` is its only injecting caller.
// `answered` counts seam responses, misses included, so "no rendering" and "no read" differ
// (kogaki#689); `unaddressable` counts tags the enumeration names no shard for (kogaki#1106).
function fetchHeadlines(kind, tags, { soft = false, stats = null } = {}) {
  const out = new Map();
  const names = servedShardNames({ soft });
  if (stats) {
    stats.namesRead = names !== null;
    stats.namesServed = names ? names.length : 0;
  }
  for (const t of tags) {
    if (stats) stats.tagsAsked += 1;
    const addresses = names ? selectShardNames(names, kind, t) : [];
    if (!addresses.length) {
      // NAMED AS UNADDRESSABLE RATHER THAN COUNTED AS A MISS. No request was
      // made for this tag, so reporting it as one would say the surface was
      // asked and answered nothing.
      if (stats) stats.unaddressable.add(t);
      continue;
    }
    if (stats) stats.tagsAddressed += 1;
    for (const address of addresses) {
      const resp = gatewayQuery("gloss_index", { tag: address }, { soft });
      if (stats) stats.calls += 1;
      if (!resp) continue;
      if (stats) stats.answered += 1;
      if (resp.miss) continue;
      for (const [slug, entry] of parseGlossShard(resp)) if (!out.has(slug)) out.set(slug, entry);
    }
  }
  return out;
}

const NO_HEADLINE = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";

// THE SECOND MISS STATE (kogaki#689, PR #693 round 1): `NO_HEADLINE` means a shard was READ and
// carried no rendering; a row whose shard was never ADDRESSED gets this marker instead.
// Covers both causes: the record carries no tag, or its family is outside every namespace the
// fetch was given. Tagged journeys are addressable (the fetch reads `journeys/` too).
// product-lab@b20d85ea topics/archive/knowledge-architecture.md:57
const NO_SHARD_ADDRESSED = "⟨no Gloss shard carries this row — it carries no tag, or its family is outside the namespaces this path reads; a fault to clear, never substituted⟩";

// THE FOURTH STATE, DISTINGUISHED (kogaki#689, owner selection at the
// /ship-cycle 689 sitting). When the SEAM ITSELF is unreachable no shard is
// read at all, every entry comes back unfound, and a row that WOULD have been
// addressed rendered `NO_HEADLINE` — whose declared meaning is "a shard was
// READ and carried no rendering". That is false of a read that never happened,
// and it is the same conflation the other three markers exist to prevent, one
// layer further out. The shape is this repository's own degradation idiom: a
// seam-absent member reports CANNOT-DETERMINE rather than passing or failing.
const NO_SEAM = "⟨no Gloss shard was read — the served seam was unreachable for this pull; a fault to clear, never substituted⟩";

// THE FIFTH AND SIXTH STATES (kogaki#1106): the ADDRESS itself is the fault, so `NO_HEADLINE`
// would wrongly claim the material is missing. A misaddressed corpus and an empty corpus are
// kept apart, matching the seam state's `address-fault` / `empty-corpus` split.
const NO_SHARD_NAME = "⟨the served enumeration names no Gloss shard for this row's tags — the address, not the material, is what is missing; a fault to clear, never substituted⟩";

const NO_SHARD_SERVED = "⟨the served enumeration names no Gloss shard at all — the corpus is empty rather than misaddressed; a fault to clear, never substituted⟩";

// A TAG IS UNADDRESSABLE ONLY WHERE **EVERY** NAMESPACE READ FAILED TO NAME A SHARD FOR IT
// (PR #1107 round 1, blocking) — an intersection, not a union, across namespaces.
// Pure and separate from the fetch loop so the quantifier is fixturable; no namespaces yields
// the empty set.
function intersectUnaddressable(sets) {
  const list = (sets || []).filter(Boolean);
  if (!list.length) return new Set();
  return new Set([...list[0]].filter((t) => list.every((s2) => s2.has(t))));
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
const NEIGHBORHOOD_GLOSS_NAMESPACES = ["lessons", "journeys"];

// WHICH FAMILY EACH SHARD NAMESPACE CARRIES. Addressability is derived from the
// namespaces a fetch was ACTUALLY GIVEN rather than from a second hard-coded
// list: `resolveHeadlines` takes its namespace set as a parameter, so a list
// here would let the two drift and would tell a caller resolving with the
// default that a tagged journey's miss was read-and-empty — a read that never
// happened, which is the conflation these markers exist to prevent (PR #711
// round 1).
const NAMESPACE_FAMILY = { lessons: "lesson", journeys: "journey" };
function familiesFor(namespaces) {
  return (namespaces || []).map((ns) => NAMESPACE_FAMILY[ns]).filter(Boolean);
}

// THE BOUNDED RESOLVER THE BRIEF LANE CALLS (kogaki#528): the Brief gets served prose through
// Terrain, the one seam reader (the served-renderings input rule, the rendering rule).
// Bounded by the members, never by the corpus: fetch only the union of the members' own tags.
// An absence is disclosed as NO_HEADLINE, never substituted.
export function resolveHeadlines(members, { namespaces = ["lessons"] } = {}) {
  const list = Array.isArray(members) ? members : [];
  const tags = [...new Set(list.flatMap((m) => m.tags || []))];
  // THE BOUND IS UNCHANGED BY THE SECOND NAMESPACE. The tag union is still a
  // function of the members handed in, so a namespace is a second shard per tag
  // ALREADY in that union and never a wider tag set — the corpus-wide prefetch
  // the rendering rule forbids stays unreachable from here.
  // SIX FIELDS, BECAUSE THE SEAM STATE IS NOW A SIX-WAY READ (kogaki#1106).
  // `namesRead`/`namesServed` answer whether the ENUMERATION was reachable and
  // whether it carries anything; `tagsAsked`/`tagsAddressed` and `unaddressable`
  // answer whether the tags this pull holds are names the surface serves. None
  // of the three questions is derivable from the other two.
  const stats = { calls: 0, answered: 0, namesRead: false, namesServed: 0,
                  tagsAsked: 0, tagsAddressed: 0, unaddressable: new Set() };
  // ONE SET PER NAMESPACE, INTERSECTED AFTER THE LOOP. `fetchHeadlines` reports
  // what ITS namespace could not name, which is a different question from what
  // the pull could not name; keeping one shared set answered the second with
  // the first (PR #1107 round 1).
  const perNamespace = [];
  const heads = new Map();
  if (tags.length) {
    for (const ns of namespaces) {
      stats.unaddressable = new Set();
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
      perNamespace.push(stats.unaddressable);
    }
  }
  const unaddressable = intersectUnaddressable(perNamespace);
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
  // FIVE SEAM STATES, REPORTED RATHER THAN INFERRED FROM AN EMPTY MAP.
  // `not-attempted` is not a degraded seam: no row had a tag, so no address
  // could be formed and there was nothing to read. Collapsing it into
  // `unreachable` would blame the seam for a property of the rows.
  //
  // THE ORDER IS THE ORDER THE QUESTIONS BECOME ANSWERABLE (kogaki#1106).
  // Whether anything was asked for comes first; then whether the enumeration
  // this pull's addresses are derived from was reachable at all, because with
  // it unread nothing below it can be established; then whether it carries any
  // shard name (an empty corpus); then whether any of those names addresses a
  // tag this pull holds (an address fault); and only then the read states,
  // which presuppose that a request was actually made.
  const seam = stats.tagsAsked === 0 ? "not-attempted"
             : !stats.namesRead ? "unreachable"
             : stats.namesServed === 0 ? "empty-corpus"
             : stats.tagsAddressed === 0 ? "address-fault"
             : stats.answered > 0 ? "answered"
             : "unreachable";
  // THE NAMESPACE SET TRAVELS WITH THE RESULT, so `glossFor` decides
  // addressability against what was read rather than against a second list.
  //
  // AND SO DOES THE UNADDRESSABLE TAG SET, for the same reason one level in: a
  // PARTIAL address fault — some tags named, some not — leaves the aggregate
  // `answered`, and a row whose every tag is in this set would then be stamped
  // with a read that never happened. The aggregate answers for the pull; this
  // answers for the row.
  return { headlines: out, seam, namespaces, unaddressable };
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

// WHICH GLOSS STATE A ROW IS IN (kogaki#689, PR #693 round 1). Exported and pure so cases
// reach the state assignment, not the emitter's fallback. Four states, four answers:
//   * a shard was read and carried a rendering → the headline;
//   * a shard was READ and carried none for the slug → `NO_HEADLINE`;
//   * no shard could be addressed (no tag, or family outside the namespaces) → `NO_SHARD_ADDRESSED`;
//   * the seam itself never answered → `NO_SEAM`.
// Never render one miss state as another. `NO_SEAM` cannot arise on the report path today.
export function glossFor(sug, headline, seam, namespaces = ["lessons"], unaddressable = null) {
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
  // THE ADDRESS ARMS SIT ABOVE THE READ MARKER, because both are states in
  // which no request was made for this row (kogaki#1106). A caller that passes
  // neither the new seam states nor `unaddressable` gets the pre-#1106
  // behaviour, on the same rule the arm above it follows.
  if (seam === "empty-corpus") return NO_SHARD_SERVED;
  // THE ROW-LEVEL READ IS TRIED BEFORE THE AGGREGATE ONE and subsumes it: on a
  // total fault every row's tags are in the set, so the aggregate arm below is
  // reached only by a caller that passed the seam state without the set.
  const tags = (sug && sug.tags) || [];
  if (unaddressable && tags.length && tags.every((t) => unaddressable.has(t))) return NO_SHARD_NAME;
  if (seam === "address-fault") return NO_SHARD_NAME;
  return NO_HEADLINE;
}

// The PRE-SELECTION listing: the TAG ROWS — a tag name and its Lesson count, and nothing else
// (the rendering rule's allowlist, transcribed into the `tag_listing` grammar). Owned by the
// table under #666; completeness/coverage/pin/record lines stay in `cmdSurvey`'s stdout.
// Must survive (kogaki#625, PR #667 round 2), each held by checks/check-terrain-composition.sh:
// header plus one tag_row per section only; ONE `tagRow(` emitter; the navigation hint.
// consulted: product-lab@d6fdadd50274cee5ab72730d73c4508b9a53e430 LESSONS.md:36
function renderTagDisplay(record) {
  const out = ["The survey — display 1. Navigation (narrows nothing): name a tag.", ""];
  for (const s of record.sections) out.push(`  ${tagRow(s)}`);
  out.push("");
  out.push(NAVIGATION_HINT);
  return out.join("\n");
}

// ---- COTAGS ---------------------------------------------------------------
// cotags — the second navigation step (SPEC.md, the co-tag navigation step): the other tags a
// selected tag's members carry, grouped by co-tag with counts.
// NAVIGATION (the second-proposer boundary's `enumerate` and `sort`): it writes NO record.
// No member-count threshold here; `SUBDIVISION_REQUIRED_AT` (kogaki#683) decides only WHETHER
// a group must split.
const NO_SECOND_TAG = "(no second served tag)";
// A group with no composed claim is MARKED, never substituted — the same
// discipline the rendering rule applies to a missing Gloss rendering, at the claim's layer.
// The row's TC-target marker (kogaki#861). Same vocabulary as the Gloss
// markers beside it: a fault to clear, never a substituted candidate id.
const NO_TARGET = "⟨no Thesis-candidate target on this row — ABNORMAL, a judged row reaching the renderer without one, never substituted⟩";

const NO_CLAIM = "⟨no composed GroupClaim — ABNORMAL, a fault to clear, never substituted⟩";

// No per-row pin renders on the display (the display's serve rule v5, withdrawing v4's per-row
// pin): the pin is sited ONCE, in the Full Report, whose member records carry
// the member → served-line map. The WA baseline closed group presentation to
// "Group ID, Strand ID, gloss, journey — and nothing else" (wa#1115/#1116).
// The ordering is DECLARED rather than scored: co-tag name ascending, then
// member id ascending. No scoring, no model call in the ordering.
const COTAG_SORT = "co-tag name ascending, then member id ascending (declared; no scoring, no model call in the ordering)";

function cotagGroups(members, selectedTag) {
  const byCotag = new Map();
  for (const c of members) {
    const others = (c.tags || []).filter((t) => t !== selectedTag);
    const keys = others.length ? others : [NO_SECOND_TAG];
    for (const k of keys) {
      if (!byCotag.has(k)) byCotag.set(k, []);
      byCotag.get(k).push(c.id);
    }
  }
  // THE GroupID IS MINTED HERE, at the one place groups are composed (the display's serve rule
  // v6, story 1.56, kogaki#317): `G<n>` over the sorted list, so id and `COTAG_SORT` agree.
  // It carries the hierarchy as content, so it survives wrapping.
  // A pin advance MAY renumber it (AC11): ids agree within one run, which is what kogaki#314
  // consumes; no persistent map is written (the display-ID rule).
  return [...byCotag.keys()].sort().map((k, i) => ({
    name: `${selectedTag} × ${k}`,
    cotag: k,
    gid: `G${i + 1}`,
    members: byCotag.get(k).sort(),
  }));
}

// The cover measurement, over a COMPOSED GROUP LIST TREATED AS UNTRUSTED (PR #123 review; #105).
// `members` (the record's answer) and `groups` (the composer's output) MUST be derived
// independently — derive both from `cotagGroups` and the guard can never fail.
// `invented` is the reverse measurement: a composer may not add a member either.
// Fixture: checks/check-terrain-composition.sh's cotags case runs both directions.
function cotagCover(members, groups) {
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

  // literal form pinned by src/report-format.json's cotag_groups grammar (unlicensed to
  // this rename; kogaki#1177 leaves this one rendered string as "step" until that
  // grammar is renamed on its own issue).
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
    // decision 3; kogaki#738). A split whose only named SubGroup is `other` renders NO SubGroups —
    // a conformant fallback, NOT a refusal; at `SUBDIVISION_REQUIRED_AT` members or more
    // (kogaki#683) the fallback yields and the group renders.
    // It precedes the render loop because the heading form depends on it.
    let judged = null;
    if (subForHeading && subForHeading.length) {
      const { subgroups } = subgroupPlacement(g, subForHeading, SURVEY_SCHEMA.subdivision);
      // SUM-TO-PARENT (the SubGroup threshold rule 1; report-format.json v13).
      // The sum refusal lives in `subgroupPlacement` (one carrier); it catches DOUBLE placement.
      // Under-placement is refused earlier by SUBDIVISION_COVER_INCOMPLETE.
      // It reads PLACEMENT, not TEXT: a renderer omitting a SubGroup line still passes
      // (the grammar's `not_expressible` entry records that gap).
      // Records: kogaki#684, kogaki#738; PR #1070.
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
      // the SubGroup threshold v7 RULE 3: suppress a split that bought nothing.
      // retired-vocab-ok: provenance, past tense.
      // Keys on the OUTCOME — one SubGroup labelled `other` — and never fires at or above
      // SUBDIVISION_REQUIRED_AT: a ≥10 group renders its split. Records: kogaki#683, kogaki#738.
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
    // the SubGroup threshold — a subdivided group's heading carries the parent's Lesson count
    // (kogaki#739; report-format.json v15). Only the count, not the member list: the two
    // heading classes differ by exactly the `: <ids>` tail, count in the same position.
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

  // THE REFUSAL is over the STRING about to be emitted (AC1, AC3), never over `groups`/`record`.
  // Write and print both go through `writeDisplaySurface`, the one private writer; the print
  // happens inside its refusal callback, so nothing emits before it validates
  // (the emit-time refusal, story 1.54 AC1). Records: PR #667.
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
// It writes no owner artifact and is never printed: the bytes ride the TAG_SELECTION gate
// declaration, which the session renders verbatim. Nothing here relies on stdout.
//   consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:98
// The grammar guard still applies: one composer, one refusal, and a nonconformant
// listing reaches no declaration.

// THE SAME GUARD, WITHOUT THE PRINT (kogaki#856). A rendering carried in a gate
// declaration is judged by exactly the grammar that judged it when it was
// printed — same surface, same REFUSE fallback, same emitter — and the only
// difference is where the conformant text goes. Written as a second caller of
// `emitOrRefuse` rather than as a flag on the first, so neither path can drift
// into checking something the other does not.
function composeOwnerListing(surfaceName, text) {
  return emitOrRefuse(surfaceName, text, () => {});
}

// ---- THE ID GATE'S BOUNDED READING (kogaki#1090). -------------------------
// One line per Group/SubGroup (id, Lesson count, name), PROJECTED from the heading lines
// `cotag_groups` wrote — never recomposed from the survey record. Records: kogaki#1087.
// A heading it cannot reduce is a REFUSAL, never a dropped or wrong row (PR #1091).
// Match the id segment by its own grammar, not a wildcard or lazy match: `<name>` and
// `NO_DISPLAY_ID` can both contain the em-dash separator.
const COTAG_MEMBER_ID = "(?:L\\d+|⟨[^⟩]*⟩)";
const COTAG_GROUP_HEADING = /^(G\d+) — (.+?) — (\d+ Lessons?)(?::.*)?$/;
const COTAG_SUBGROUP_HEADING = new RegExp(
  `^(G\\d+-\\d+) — (\\d+ Lessons?): ${COTAG_MEMBER_ID}(?:, ${COTAG_MEMBER_ID})* — (.+)$`);
const COTAG_ANY_ID_LINE = /^G\d+(?:-\d+)? — /;

function composeIdGateListing(text, artifactPath) {
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
  // AN ARTIFACT THAT YIELDS NO ROW IS THE SAME REFUSAL, not an absence (PR
  // #1091 round 1, finding 4). `cmdCotags` refuses a tag with no member, so a
  // written rendering always carries at least one Group heading; a projection
  // that finds none over a file that exists has failed to read it, and
  // returning null there would hand the caller the absence sentence — telling
  // the owner no grouping was written when one was, and putting the ID question
  // on screen with the grouping nowhere, which is exactly the 2026-09-10 defect
  // kogaki#1087 was filed from. The absence arm belongs to a MISSING artifact
  // and stays with the caller, which is the only party that can tell the two
  // apart.
  if (!rows.length) {
    fail(`the co-tag rendering at ${artifactPath} carries no Group heading this listing could reduce, and a written rendering always carries at least one. `
      + "The ID gate's reading is a projection of that file (kogaki#1090), so an empty projection over a non-empty file is a read that failed rather than a grouping that is absent.");
  }
  return [
    `The composed grouping — ${rows.length} row(s). Read ${artifactPath} for the claims, the coherence lines and the disclosures; this is the id, the count and the name alone.`,
    "",
    ...rows,
  ].join("\n");
}

// ---- CLAIM / ADOPT --------------------------------------------------------
// claim / adopt (SPEC.md, GroupClaim-first rendering). A claim is PINNED to its member set:
// the record carries the member ids and their pins; the claim text arrives as an argument.
// The claim re-offer wait is DELETED with no stub (kogaki#1030 item 4; SPEC-terrain).
// The one place a run declaration is composed; callers are `GATE_WORK`'s option composers
// at the wait that owes it — nothing outside a run reaches it. Re-offers route through
// manifest item 4's carrier, never an affordance of Terrain's own.
export function emitGateDeclaration(dir, gateId, dynamicOptions, extra = {}) {
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  if (!registered) fail(`${gateId} is not declared in src/gate-registry.json — an unregistered gate is the uncovered-by-default shape`);
  const seen = new Set(dynamicOptions.map((o) => o.id));
  const declaration = {
    ...registered,
    ...extra,
    options: [...dynamicOptions, ...registered.options.filter((o) => !seen.has(o.id))],
    // WHICH OPTIONS THIS RUN COMPOSED, RECORDED RATHER THAN INFERRED (PR #1119
    // round 1). A dynamic option WINS over a standing one of the same id — that
    // is what the `seen` filter above does — so a repair that merged the
    // registry back over the declaration would invert this precedence at exactly
    // the id collision this line anticipates, and rewrite a re-entered run to an
    // option label the run never composed. The refresh reads this list and skips
    // what it names; a declaration written before this field existed carries
    // none, and the refresh says so rather than guessing.
    run_composed_option_ids: dynamicOptions.map((o) => o.id),
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
  // BESIDE THE BYTE BOUND, AND FOR ITS REASON (kogaki#1118): both are refusals
  // by the CHANNEL the call is delivered on, and both have to be able to leave
  // no artifact behind, so both stand above every write in this function.
  if (call.refused) fail(call.refused);
  writeFileSync(out, JSON.stringify(declaration, null, 2) + "\n");
  let callPath = null;
  if (call.tool_input) {
    callPath = join(dir, `${gateId}${GATE_CALL_SUFFIX}`);
    writeFileSync(callPath, JSON.stringify(call.tool_input, null, 2) + "\n");
  }
  // THE SIDECAR IS WRITTEN HERE, BESIDE THE CALL (kogaki#1153). This is the
  // moment `gate-call.json` exists and the moment the session id this raising
  // belongs to is known (`sessionId()`, read the same way `writeOpenGatePointer`
  // reads it below) -- and it is BEFORE `writeOpenGatePointer` opens the gate,
  // so the write lands before the interval that would deny it starts.
  writeGateDeclarationSidecar(sessionId());
  writeOpenGatePointer(dir, declaration, out, callPath, call.unavailable || null);
  return out;
}

// ---- THE GATE CALL (kogaki#1028 item 1). ----------------------------------
// The exact `AskUserQuestion` `tool_input` the session must send, written beside the
// declaration; `.claude/hooks/gate-open-terrain-gate.py` admits only a byte-equal call.
// Any reading (`GATE_CALL_READING_KEYS`) goes in the question text above the question line
// (kogaki#856). The free-text second option is transcribed from `free_text_offered`.
// consulted: product-lab@0f31c3bebdd65a126dd5c2928b86c2a212bba5c2 LESSONS.md:42
// No valid payload (no option, or >4): write no `gate-call.json`, carry
// `gate_call_unavailable` on the pointer — never wedge the run.
// consulted: product-lab@0f31c3bebdd65a126dd5c2928b86c2a212bba5c2 LESSONS.md:44
export const GATE_CALL_SUFFIX = ".gate-call.json";

// THE JUDGMENT-RETRY GATE'S ID (kogaki#1172 item 3), registered in
// `src/gate-registry.json`. It is raised from the state loop rather than from
// a `wait` state's own option composer, because it can be raised at ANY
// judgment state, naming itself in `extra.judgment_state`, so there is no one
// table row to bind an option composer to.
const JUDGMENT_RETRY_GATE_ID = "terrain-judgment-retry";
// THE READER-PATH JOB'S ARM (kogaki#1193), raised by `job await` -- never from
// inside this loop, since nothing here ever finds this job in a non-`done`
// terminal state without a `job await` having classified it first.
export const READER_PATH_JOB_GATE_ID = "brief-reader-path-job";

// The harness's own bound on an AskUserQuestion payload. Read from its schema,
// restated here because there is no module to import it from across the seam --
// the same two-implementations-of-one-constant trade `option_set_digest` makes,
// and `checks/check-open-gate-exclusivity.sh` is what compares them.
const ASK_MIN_OPTIONS = 2;
const ASK_MAX_OPTIONS = 4;

// ONE constant, never a per-gate wording; a gate wanting its own words declares
// `free_text_label` in `src/gate-registry.json`.
// THE READING KEYS, one enumeration the composer reads (kogaki#1087): the first key found
// on a declaration is rendered above the question line. Add a key here, never a branch.
// Members added at PR #1109 and kogaki#1172 (`judgment_refusal`, spread from `extra`).
const GATE_CALL_READING_KEYS = ["tag_listing", "groups_listing", "settled_set_provenance", "judgment_refusal", "reader_path_unit_refusal", "excluded_candidates"];

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
function gateCallBytes(toolInput) {
  return Buffer.byteLength(JSON.stringify(toolInput, null, 2) + "\n", "utf8");
}

const GATE_CALL_FREE_TEXT_LABEL = "Answer in your own words instead";
const GATE_CALL_FREE_TEXT_DESCRIPTION =
  "This gate offers free text. Choose this row and type the answer; the harness "
  + "records what you type, and the executor reads it from the capture.";

// The chip label, at most 12 characters, DERIVED rather than composed: the last
// hyphen-separated segment of the gate id. `terrain-tag-selection` -> `selection`.
// A gate may override it with `header` in the registry.
function gateCallHeader(declaration) {
  const declared = declaration.header;
  if (typeof declared === "string" && declared.trim()) return declared.trim().slice(0, 12);
  const segments = String(declaration.id || "gate").split("-").filter(Boolean);
  return (segments[segments.length - 1] || "gate").slice(0, 12);
}

// ---- THE SHARED QUESTION-SHAPE CHECK, APPLIED AT COMPOSE (kogaki#1118). ----
// Invoke `issue-sync lint-question` (claude-toolkit#1077); never restate its rule here.
// consulted: product-lab@3b3802d245287f568fd93a574c8d422b277e69c8 LESSONS.md:68
// ONLY EXIT 1 REFUSES. An absent command, exit 2 or an older tool ADMIT — it is an
// external dependency (`src/deps-registry.json`; SPEC-external-deps "Report, never gate").
const QUESTION_SHAPE_VERB = "lint-question";

// The command's location is MACHINE-LOCAL and the env var is the seam a fixture
// drives; the default is the install path `issue-sync install-hooks` writes,
// named the same way `src/deps-registry.json` already names `~/.claude/hooks/
// lint-pr-merge.py` -- a committed name for a machine-local artifact, which is
// what an external-dependency declaration is.
function questionShapeCommand() {
  return process.env.KOGAKI_QUESTION_SHAPE_CMD
    || join(homedir(), ".claude", "tools", "issue-sync");
}

// null when the payload is admissible OR when the rule could not be applied;
// the refusal text VERBATIM when it was applied and refused. The command's own
// words are carried rather than paraphrased -- a paraphrase is the second copy
// this whole arrangement exists to refuse.
// THE WAIT IS BOUNDED (PR #1119 round 1). This call now stands on the path of
// every gate composition in both programs, so a command that HANGS rather than
// exiting takes the whole run with it — a wedge in the class this issue closes,
// reached through the dependency instead of through the label. An exit-code
// policy careful about every answer the command can give and silent about its
// giving none is not a policy. A timeout admits, like every other
// could-not-apply arm.
const QUESTION_SHAPE_TIMEOUT_MS = 5000;

function runQuestionShape(cmd, payload) {
  try {
    return spawnSync(cmd, [QUESTION_SHAPE_VERB], {
      input: JSON.stringify(payload),
      encoding: "utf8",
      timeout: QUESTION_SHAPE_TIMEOUT_MS,
    });
  } catch {
    return null;
  }
}

// Probe that the verb exists before believing its exit 1 (PR #1119; claude-toolkit#1077):
// an older `issue-sync` exits 1 on an unknown subcommand. Same probe as
// `checks/check-gate-call-shape.sh` (empty question set => exit 0); once per process.
let questionShapeSupported = null;
function questionShapeVerbSupported(cmd) {
  if (questionShapeSupported && questionShapeSupported.cmd === cmd) {
    return questionShapeSupported.ok;
  }
  const probe = runQuestionShape(cmd, { questions: [] });
  const ok = !!probe && !probe.error && probe.status === 0;
  questionShapeSupported = { cmd, ok };
  return ok;
}

function questionShapeRefusal(toolInput) {
  const cmd = questionShapeCommand();
  if (!questionShapeVerbSupported(cmd)) return null;
  const res = runQuestionShape(cmd, toolInput);
  if (!res || res.error || res.status !== 1) return null;
  const text = `${res.stderr || ""}${res.stdout || ""}`.trim();
  return text || `${cmd} ${QUESTION_SHAPE_VERB} refused this gate call and printed nothing`;
}

function composeGateCall(declaration) {
  const declared = Array.isArray(declaration.options) ? declaration.options : [];
  // THE ID IS A JOIN KEY AND NEVER CONTENT, WHERE THE GATE SAYS SO (kogaki#1126).
  // Only a gate declaring `option_descriptions_required` (src/gate-registry.json) refuses an
  // undescribed option as `unavailable`; every other gate renders exactly as before.
  const owed = declaration.option_descriptions_required === true;
  const undescribed = owed
    ? declared.filter((o) => typeof o.description !== "string" || o.description.trim() === "")
    : [];
  if (undescribed.length) {
    return { unavailable: `${declaration.id} declares \`option_descriptions_required\`, and `
      + `${undescribed.length} of its option(s) carry no description: `
      + `${undescribed.map((o) => JSON.stringify(o.id)).join(", ")}. An option's id is the join key the `
      + `owner's answer resolves through and is never shown as content, so no payload is written and `
      + `nothing here invents a sentence about an option (kogaki#1126). Compose the description where the `
      + `option is composed, or give the standing option one in src/gate-registry.json.` };
  }
  const options = declared.map((o) => ({
    label: String(o.label),
    // The description is the option's OWN. Where the gate declares none is owed
    // and an option carries none, the id is shown -- the pre-#1126 default,
    // narrowed to the gates that have not declared the obligation above.
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
  // THE SHAPE CHECK IS THE LAST THING COMPOSE DOES, and it is checked over the
  // WHOLE composed call rather than over the declaration's labels: the composer
  // adds the free-text row and folds the reading into the question text, so a
  // check over the declaration would judge a payload that is not the one sent.
  // A REFUSAL IS ITS OWN ARM, beside `over_bound` and never folded into
  // `unavailable`: `unavailable` writes a pointer and leaves the gate
  // renderable from the declaration's options, which for a label the channel
  // refuses would hand the session the very rendering that deadlocked it.
  const refused = questionShapeRefusal(tool_input);
  if (refused) {
    return {
      bytes,
      refused: `${declaration.id} composes a gate call the shared question-shape check refuses, `
        + `and ${QUESTION_SHAPE_VERB} is the one home of that rule (claude-toolkit#1077, kogaki#1118). `
        + "No declaration, no gate-call.json and no open-gate pointer were written, and no gate is open — "
        + "the refusal arrives here rather than as a session with an unshowable question open and no "
        + "admissible tool. The command's own refusal follows verbatim:\n\n"
        + refused,
    };
  }
  return { tool_input, bytes };
}

// ---- THE OPEN-GATE POINTER (kogaki#890). ----------------------------------
// One file per OUTSTANDING raising, read by `.claude/hooks/write-gate-capture.py`.
// It carries no answer and grants nothing: the executor reads the CAPTURE.
// RE-ENTRY RE-CHECKS A WRITTEN GATE CALL (kogaki#1118 acceptance 4): refresh only the
// STANDING options (by id against `src/gate-registry.json`); a failing run-time option refuses
// with the command's text. Rewrite the declaration with the call; never remint
// `gate_instance_id`.
function refreshWrittenGateCall(dir, gateId) {
  const declPath = join(dir, `${gateId}${GATE_SCHEMA.capture.run_declaration_suffix}`);
  const callPath = join(dir, `${gateId}${GATE_CALL_SUFFIX}`);
  if (!existsSync(declPath) || !existsSync(callPath)) return null;
  const written = JSON.parse(readFileSync(callPath, "utf8"));
  const refused = questionShapeRefusal(written);
  if (!refused) return null;

  const declaration = JSON.parse(readFileSync(declPath, "utf8"));
  const registered = (GATES_REGISTRY.gates || []).find((g) => g.id === gateId);
  const standing = new Map((registered ? registered.options : []).map((o) => [o.id, o]));
  // THE RUN'S OWN OPTIONS ARE NOT REFRESHED, and the list is read rather than
  // inferred (PR #1119 round 1). A declaration predating the field carries none,
  // which is the pre-repair case this function exists for and where no collision
  // can have been recorded either way; the note below states which reading was
  // used rather than leaving it to be assumed.
  const runComposed = new Set(declaration.run_composed_option_ids || []);
  const legacy = !Array.isArray(declaration.run_composed_option_ids);
  const refreshed = {
    ...declaration,
    options: (declaration.options || []).map((o) => (
      standing.has(o.id) && !runComposed.has(o.id) ? { ...o, ...standing.get(o.id) } : o)),
  };
  const recomposed = composeGateCall(refreshed);
  if (!recomposed.tool_input) {
    // THE DIAGNOSIS IS THE ARM THAT WAS TAKEN, NOT A GUESS ABOUT IT (PR #1119
    // round 1). This branch is reached on three different states and the run-time
    // option is only one of them; naming that one unconditionally printed the
    // ORIGINAL refusal under a cause it had not established.
    const why = recomposed.refused
      ? "the refusal survives the refresh, so the refused label is a run-time option composed from "
        + "material a re-entry does not hold and there is nothing here to repair"
      : recomposed.over_bound
        ? "the refreshed call is over the declared byte bound"
        : "the refreshed declaration composes no call at all";
    fail(`${gateId} has a written gate call the shared question-shape check refuses, and refreshing its `
      + `standing options from src/gate-registry.json does not clear it: ${why}. No payload is printed. `
      + "Start the run again rather than re-entering this one (kogaki#1118). What the refresh met "
      + "follows verbatim:\n\n"
      + (recomposed.refused || recomposed.over_bound || recomposed.unavailable || refused));
  }
  writeFileSync(declPath, JSON.stringify(refreshed, null, 2) + "\n");
  writeFileSync(callPath, JSON.stringify(recomposed.tool_input, null, 2) + "\n");
  return { refused, declPath, callPath, legacy };
}

function openGateDir() {
  return process.env.KOGAKI_OPEN_GATES || join(homedir(), ".claude", "kogaki-open-gates");
}

// THE GATE-DECLARATION SIDECAR (kogaki#1153). `lint-gate-declaration.py` reads it as the
// PRIMARY carrier (v68, claude-toolkit#774); it must be written here, at compose, before the
// open-gate pointer exists. `GATE_DECLARATION_SIDECAR_DIR` mirrors the hook's override,
// copied because a Python hook and a Node executor share no module.
function gateDeclarationSidecarDir() {
  return process.env.GATE_DECLARATION_SIDECAR_DIR
    || join(homedir(), ".claude", "gate-declarations");
}

// Every composed gate has exactly ONE question, so the sidecar keys index 1, and the
// declaration is always `mechanical`.
// A write failure is NOT fatal (kogaki#1153; cf. kogaki#1090): the gate still opens and the
// transcript scan answers for it (the pre-#1153 race).
function writeGateDeclarationSidecar(sessionId) {
  if (!sessionId) return;
  const dir = gateDeclarationSidecarDir();
  const path = join(dir, `${sessionId}.json`);
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(path, JSON.stringify({ 1: "gate-declaration (question 1):\ngate: mechanical" }, null, 2) + "\n");
  } catch { /* the transcript scan is the fallback carrier this write is racing to make unnecessary, not the only one */ }
}

// THE POINTER NAMES ITS SESSION (kogaki#1028 item 5; PR #1043).
// A missing session id is a case, not an error: `write-gate-capture.py` falls back to
// question-text matching; `gate-open-terrain-gate.py` gates nothing on a null-session pointer.
// Both fail toward the recoverable side; neither treats absence as a wildcard.
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

function writeOpenGatePointer(dir, declaration, declPath, callPath = null, callUnavailable = null) {
  const gd = openGateDir();
  mkdirSync(gd, { recursive: true });
  const capPath = join(dir, `${flow().lane}${GATE_SCHEMA.capture.suffix}`);
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

// ---- SUBDIVIDE ------------------------------------------------------------
// subdivide (SPEC.md, semantic subdivision): placement + title-derivation, hiding none.
// Reachable only by naming it; co-tags stay the default. Terrain names no model: the
// classification arrives as input and the record pins the judge.
// `SUBDIVISION_REQUIRED_AT` decides WHETHER to split (semantic subdivision v30, kogaki#683);
// the judge supplies the coherence label, and no number is compared against it.
// LINES_PER_SUBGROUP_HEADER: display-budget arithmetic only; it gates nothing.
const LINES_PER_SUBGROUP_HEADER = 2;

// The PLACEMENT half of subdivision, ONE composer shared by the co-tag display (the SubGroup
// threshold) and `subdivide`: refuses invented members and requires every member placed.
// The split boundary is an owner ruling (SPEC-terrain, semantic subdivision v30, kogaki#683),
// not derived arithmetic. Records: kogaki#316, kogaki#738.
const SUBDIVISION_REQUIRED_AT = 10;

// THE COHERENCE LABEL: three affinity labels plus the residual `other`, ordered by
// decreasing coherence (kogaki#683 disposition 5; kogaki#738).
// `other` is the residual: named separately (`RESIDUAL_LABEL`), carries no affinity claim, has
// no `limits.subgroup_member_cap` row, and is bounded by its own limit — never unlimited.
// Consumer-owned values: rendered only on kogaki's own display, so no hub ratification.
// consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/knowledge-architecture.md:198
const COHERENCE_LABELS = Object.freeze(["tight", "related", "loose", "other"]);
// The residual, named once so no reader has to infer it from the cap map's gaps.
const RESIDUAL_LABEL = "other";

function subgroupPlacement(parent, classification, block) {
  const subgroups = [];
  const placedIds = new Set();
  for (const sg of classification) {
    // THE KEYS ARE THE RECORD EXAMPLE'S (kogaki#1067; kogaki#1062 item 5):
    // `src/terrain-workflow.json`'s `J2_subdivision.record_example` writes each SubGroup as
    // `{name, claim, members, verdicts: {coherence, …}}`. NO SECOND SPELLING is accepted.
    const name = String(sg.name || fail("each SubGroup needs a `name` — the key `J2_subdivision.record_example` declares (kogaki#1067)"));
    const members = [...new Set(sg.members || [])].sort();
    const stray = members.filter((id) => !parent.members.includes(id));
    if (stray.length) fail(`SubGroup ${JSON.stringify(name)} places ${stray.join(", ")}, which are not members of ${parent.name} — subdivision decides WHERE a member appears, never that a new one exists`);
    members.forEach((id) => placedIds.add(id));
    subgroups.push({ name, claim: String(sg.claim || ""), members, verdicts: sg.verdicts || {} });
  }
  // AN UNPLACED MEMBER IS A REFUSAL NAMING IT (the SubGroup threshold rule 1, kogaki#738).
  // Never sweep: every member appears because the judge placed it.
  // consulted: product-lab@652f47da1ed137c98d7f0264d8676e9e40e5af02 LESSONS.md:82
  // The refusal names the ids, not just a count — the judge must dispose of each.
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

  // THE RESIDUAL IS BOUNDED (owner amendment 1 ruling 2, kogaki#738): until it falls to N the
  // classification is REFUSED. Checked here because only the whole classification sees it.
  // DOUBLE PLACEMENT is refused here too, with `placedIds`, for every caller (PR #1070;
  // kogaki#1068): the cover refusal cannot see it, since the counts sum OVER the parent.
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

// The JUDGMENT half of subdivision, shared by the co-tag display and `subdivide`: one
// implementation, so the two surfaces cannot drift (kogaki#133).
// THE LIMITS' ONE READER (kogaki#738 ruling 5, owner amendment 2's five config keys).
// Every number the subdivision judgment enforces is read here and restated nowhere else.
// A missing block FAILS LOUDLY; a permissive default would silently delete a ruled refusal.
const CAPPED_LABELS = Object.freeze(COHERENCE_LABELS.filter((l) => l !== RESIDUAL_LABEL));

function subdivisionLimits(grammarPath = REPORT_FORMAT) {
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
function subgroupMemberCap(label, grammarPath = REPORT_FORMAT) {
  const { caps } = subdivisionLimits(grammarPath);
  return Object.prototype.hasOwnProperty.call(caps, label) ? Number(caps[label]) : null;
}

function judgeSubgroup(sg, groupClaim, parentSize = null) {
  const vd = sg.verdicts || {};

  // retired-vocab-ok: the three lines here name the replacement.
  // THE COHERENCE LABEL (kogaki#683 disposition 5; third label renamed at kogaki#738).
  // `composes_honestly` and `tighter_than_parent` are GONE; the label carries them.
  // `legible_at_a_glance` is an instrument, not a leaf conjunct, and is not folded in.
  // The value is the judge's: a missing or out-of-set label is REFUSED, never defaulted.
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

  // THE SIZE LIMITS (kogaki#738 ruling 3, owner amendments 1 and 2): an affinity
  // SubGroup over its label's cap or under `min_subgroup_members` is refused here;
  // `max_residual_members` is checked at placement, which sees the whole classification.
  // The floor does NOT bind the residual.
  // Numbers are READ from `report-format.json`'s `limits` block, never restated.
  const { min } = subdivisionLimits();
  const cap = subgroupMemberCap(coherence);
  if (cap !== null && sg.members.length > cap) {
    fail(`SubGroup ${JSON.stringify(sg.name)} is labelled ${coherence} and carries `
      + `${sg.members.length} members, over the cap of ${cap} `
      + `(report-format.json limits.subgroup_member_cap.${coherence}, SPEC-terrain, semantic subdivision, kogaki#738). `
      + `Compose a tighter SubGroup, or judge these members at a label whose cap admits them.`);
  }
  // THE FLOOR EXEMPTS A WHOLE-GROUP SubGroup (owner selection 2026-09-01, amendment 1):
  // a SubGroup holding the entire parent divided nothing, so M has no splinter to refuse.
  // consulted: product-lab@652f47da1ed137c98d7f0264d8676e9e40e5af02 LESSONS.md:38
  // Keyed on the structural fact `parentSize === members.length`, never on a size.
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

// THE SubGroup RULES, RUN AT J2 WHERE THE RE-ASK IS (kogaki#1068).
// Re-implements nothing: calls `subgroupPlacement` and `judgeSubgroup`, as `cotag_groups`
// does, which keeps its own checks. Claim is passed empty; disclosures are discarded.
// A group with no composed parent is not judged here (the rules are about its membership).
function subdivisionRules(name, entry, parent) {
  if (!entry || !parent) return;
  // JUDGED-EMPTY IS CONFORMANT and has no SubGroup for any rule to bind on
  // (the report identity v9). It is refused at the split threshold, and that
  // refusal is the display's, keyed on a size this function is not the place to
  // re-decide.
  if (!entry.subgroups.length) return;
  const { subgroups } = subgroupPlacement(parent, entry.subgroups, SURVEY_SCHEMA.subdivision);
  for (const sg of subgroups) judgeSubgroup(sg, "", parent.members.length);
}

// THE LIMITS PUT IN FRONT OF THE JUDGE (kogaki#1068 item 2).
// Every number comes through `subdivisionLimits`, so the ask and the refusal cannot disagree.
// Keyed on the state's own declaration; an unknown block name is refused BY NAME.
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

function judgeLimits(st) {
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
function composeSubdivisionRecord(args, dir, record) {
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

// THE ENTERED SET RESOLVED TO TARGETS, shared by `report` and `neighborhood_input`
// (kogaki#690): one resolver, never a second. Story 1.56 AC11: ids are valid only for
// the run that printed them, so resolution runs against this run's groups and caches nothing.
// Returns `subOf` so callers keep one `--subdivisions` parse (PR #701). Reads no claims file.
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

// ---- THE BRIEF'S STRAND SET (kogaki#1116) ---------------------------------
// Resolves the Strand set Brief is started with against the served enumeration.
// Brief takes its set on its own command line and never reads a Terrain run.
// Records: kogaki#1108, kogaki#1090; product-lab#263 R1.
// An argument is the served address `<package>::<kind>/<local-name>`; an `L<n>` token is
// positional, so it is refused BY NAME. Lives here: this file is the one served reader.
const TERRAIN_TOKEN = /^(?:G[0-9]+(?:-[0-9]+)?|L[0-9]+|D[0-9]+)$/;

// The refusal every human-facing token takes, stated once so the three token
// families cannot drift into three readings of one rule.
function terrainTokenRefusal(tokens) {
  return `${tokens.join(", ")}: a Full Report coordinate, not a Strand address. `
    + "Terrain mints G/L/D tokens by position in the served enumeration at survey "
    + "time, so they name a row of one report rather than a Strand, and a pin "
    + "advance renumbers them. The MODEL resolves a report coordinate into served "
    + "addresses from the Full Report BEFORE invoking the brief skill, and the "
    + "skill is invoked with those addresses. Nothing was written.";
}

// The served address at its content hash — the cite every Brief output carries
// (kogaki#1116, acceptance item 6). THE COMMIT PIN IS DEPRECATED (hub decision
// staged 2026-09-14): the substrate pin dated a whole response, so two Strands
// cited at one pin were indistinguishable from two Strands that had both moved,
// and a reader holding the cite could not tell whether the material under it had
// changed. A content hash answers exactly that, per line, and the gateway
// already returns one — so the cite is the address the Package serves joined to
// the hash it serves beside it, and no kogaki artifact carries `@<commit>`.
function composeAddressCite(unitId, contentHash) {
  if (typeof unitId !== "string" || unitId === "") return null;
  if (typeof contentHash !== "string" || contentHash === "") return null;
  return `${unitId}@${contentHash}`;
}

// Resolve a Brief run's addresses against the served enumeration; returns `{ strands }`
// or `{ error }`. Refuses BY NAME and substitutes nothing; the refusal states the COUNT
// searched rather than listing ~1700 rows.
// The display id `L<n>` is minted here by argument order: a within-document token, while
// the identity on the command line and in every cite stays the served address.
export function resolveStrandAddresses(entered) {
  const list = (Array.isArray(entered) ? entered : []).map((x) => String(x).trim()).filter(Boolean);
  if (!list.length) {
    return { error: "no Strand address was given. A Brief is started with the served "
      + "Lesson addresses it composes from: `coding::lesson/<local-name>`, space-separated "
      + "(a bare local name resolves against the Lesson kind). Nothing was written." };
  }
  const terrainTokens = list.filter((x) => TERRAIN_TOKEN.test(x));
  if (terrainTokens.length) return { error: terrainTokenRefusal(terrainTokens) };

  // THE TRANSPORT AND THE RESOLUTION ARE SEPARABLE, which is what keeps the
  // Brief fixture pass SEAM-FREE (kogaki#1116). `KOGAKI_ELEMENTS_PAYLOAD` names
  // a RECORDED `element_survey` response — the same discipline
  // `src/cite-check.mjs` states one seam over, where the judge is pure over the
  // transport's text so a fixture can drive it with a recording. It is a fixture
  // route and not a second corpus: an unreadable recording REFUSES rather than
  // falling through to the live seam, because a fixture that silently reached
  // the network would be asserting against whatever the substrate served that
  // day.
  const recorded = process.env.KOGAKI_ELEMENTS_PAYLOAD;
  let resp;
  if (recorded) {
    try {
      resp = JSON.parse(readFileSync(recorded, "utf8"));
    } catch (e) {
      return { error: `KOGAKI_ELEMENTS_PAYLOAD names ${recorded}, which is not a readable `
        + `element_survey recording (${e.message}). A recorded enumeration that cannot be read is `
        + "not an empty enumeration, and falling through to the live seam would make this run's "
        + "answer depend on a substrate the caller asked it not to read." };
    }
  } else {
    resp = gatewayQuery("element_survey", {});
  }
  const byUnit = new Map();
  const lessonBySlug = new Map();
  const journeyBySlug = new Map();
  let served = 0;
  for (const line of resp.lines || []) {
    let rec;
    try {
      rec = JSON.parse(line.text);
    } catch {
      return { error: `unparseable served record at ${line.cite} — surfaced, not skipped: a silently `
        + "dropped record makes an address look unserved when it is the read that failed" };
    }
    served++;
    if (rec.unit_id) byUnit.set(rec.unit_id, rec);
    if (rec.kind === "lesson" && !lessonBySlug.has(rec.slug)) lessonBySlug.set(rec.slug, rec);
    if (rec.kind === "journey" && !journeyBySlug.has(rec.slug)) journeyBySlug.set(rec.slug, rec);
  }

  const strands = [];
  const seen = new Set();
  const missing = [];
  const wrongKind = [];
  for (const addr of list) {
    const rec = byUnit.get(addr) || (addr.includes("::") ? null : lessonBySlug.get(addr));
    if (!rec) { missing.push(addr); continue; }
    if (rec.kind !== "lesson") { wrongKind.push(`${addr} (kind ${rec.kind})`); continue; }
    // Dedup preserving the entered order — the set is the unit, and a repeat is
    // not an error the owner should be stopped for (the deleted resolver's rule,
    // kept).
    if (seen.has(rec.unit_id)) continue;
    seen.add(rec.unit_id);
    const cite = composeAddressCite(rec.unit_id, rec.content_hash);
    if (!cite) {
      return { error: `the served record for ${addr} carries no ${rec.unit_id ? "content hash" : "address"} — `
        + "a Strand whose cite cannot be composed is a fault to clear, never material to compose from" };
    }
    const j = journeyBySlug.get(rec.slug);
    strands.push({
      id: `lesson:${rec.slug}`,
      display_id: `L${strands.length + 1}`,
      slug: rec.slug,
      family: "lesson",
      address: rec.unit_id,
      tags: rec.tags || [],
      cite,
      journey: j ? { slug: j.slug, cite: composeAddressCite(j.unit_id, j.content_hash) } : null,
    });
  }
  if (wrongKind.length) {
    return { error: `${wrongKind.join(", ")}: served, but not a Lesson. A Brief composes from Lessons; `
      + "a Journey is a Lesson's own material and rides its Strand, and a Decision is not article "
      + "material at all. Nothing was written." };
  }
  if (missing.length) {
    return { error: `${missing.join(", ")}: the Package serves no such address. Searched ${served} served `
      + `record(s) at ${resp.pin ?? "an unnamed pin"}. An address is `
      + "`<package>::<kind>/<local-name>` as the Package serves it, or a bare local name resolved "
      + "against the Lesson kind. Nothing was dropped silently — every entered address is placed or "
      + "named. Nothing was written." };
  }
  return { strands };
}

// ---- REPORT ---------------------------------------------------------------
// report — the Full Report (SPEC.md): untruncated Claims and Glosses, so it parses the
// served shard whole rather than through `parseGlossShard`.
// A REPORT ranks, narrows and hides nothing; a RENDERING, so no report id is an address
// (topics/articles.md:64,71@f918c515).
const NO_GLOSS_BODY = "⟨no served Gloss rendering — ABNORMAL, a fault to clear, never substituted⟩";
const NO_JUDGE = "none";

// THE TYPED SUBDIVISION ENTRY (the report identity v9, kogaki#199):
//   {"G": {"judged": true, "subgroups": [ … ]}}   judged, with a subdivision
//   {"G": {"judged": true, "subgroups": []}}      judged, EMPTY — conformant
//   key absent                                    not judged — refused on the co-tag path
// A BARE ARRAY IS REFUSED BY NAME: two encodings for one fact are never accepted.
// (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/knowledge-architecture.md:154`).
// THE TYPED CLAIMS RECORD (the open-questions section, v10, kogaki#212): the pin lives in
// one artifact with the claims, so it cannot go stale beside them.
//   { "composition_pin": { "tag": …, "pin": …, "groups": { "<G>": ["lesson:…"] } },
//     "claims":         { "<G>": "…" } }
// A BARE MAP IS REFUSED BY NAME.
function readClaimsRecord(raw, record) {
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
function claimsOutsideBound(claims, pin, groups) {
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

function readSubdivisionEntry(name, entry) {
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

// ---- JUDGMENT PROVENANCE (kogaki#892) -------------------------------------
// What the HARNESS OBSERVED about a judgment, held apart from what the RECORD DECLARES
// (owner ruling 2026-09-04: model output is never authoritative control input).
//   `observed`  the Harness invoked the judge itself (producer since kogaki#1030).
//   `declared`  no such record; the pin names what the COMPOSER says judged the split.
// In both states the `--subdivisions` sha is taken by the Harness from disk; it binds a
// rendering to a record and is NOT evidence a judgment ran — the text must say so.
// Never read back a model-composed record (e.g. a `judgment-record.json`).
const JUDGMENT_OBSERVED = "observed";
const JUDGMENT_DECLARED = "declared";

// THE `observed` PRODUCER (kogaki#1030): the executor's OWN record of each judge call —
// pinned model, command, state, attempt count, response sha from disk.
// Nothing in it comes from the response's content (kogaki#892).
// Set by `invokeJudge` alone; an argv-supplied record sets none and stays `declared`.
const JUDGE_INVOCATIONS = new Map();

function recordJudgeInvocation(stateId, invocation) {
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
function harnessJudgeInvocation(stateId = "J2_subdivision") {
  return JUDGE_INVOCATIONS.get(stateId) || null;
}

// ---- THE JUDGE CALL ITSELF (kogaki#1030 item 1). ---------------------------
// The model is a called function, never the driver: compose the prompt from the table,
// run the pinned model (`terrain-workflow.json`, never the session's), parse ONE record.
// `KOGAKI_JUDGE_CLI` replaces WHICH executable runs, for fixtures, and nothing else.
// ---- THE JUDGE BINARY IS RESOLVED ONCE, BY THE SESSION THAT STARTS THE RUN
// (kogaki#1076).
// Resolution walks PATH and RUNS each candidate with `--version`; the first that exits 0
// wins. Existence and the execute bit do not discriminate (a broken shim has both).
const JUDGE_VERSION_PROBE_MS = 20000;

// THE ORDER `PATH` DECLARES, DE-DUPLICATED. A command carrying a separator is
// not a `PATH` lookup at all and stands as its own single candidate -- that is
// the absolute form this act exists to produce, and an absolute path handed in
// is already it.
function judgeBinaryCandidates(command, pathEnv) {
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

// RESOLVED AT THE START ACT (kogaki#1076 item 1) and read back by later acts; a record
// that carries one is never re-resolved. An older record resolves at its next act —
// never falls back to the bare word. `KOGAKI_JUDGE_CLI` is resolved like any command.
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

// EXPORTED FOR THE DETACHED JOB (kogaki#1193): `compose_path`'s own STATE_WORK
// resolves the same command/model/timeout the synchronous judge path reads,
// because the unit prompts it composes are handed to the SAME binary at the
// SAME pin -- there is no second judge configuration for a detached call.
export function judgeSettings(table, rec) {
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
    // HOW MANY BOUNDED CALLS RUN AT ONCE (kogaki#1073; kogaki#1062). Concurrency keeps
    // a per-group state's wall time near the LONGEST call, not the sum.
    // REQUIRED AND POSITIVE, like `timeout_s`; a cap of 1 is the sequential behaviour.
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
const JUDGE_REFUSAL_MARKER = "----- YOUR PREVIOUS ANSWER WAS REFUSED -----";

// THE FIXED REPAIR SENTENCE, NAMED ONCE (kogaki#1203). `judgePrompt` below
// puts it after a synchronous judge's own refusal; the reader-path unit's
// retry prompt (`readerPathUnitRetryPrompt`) puts the SAME text after a
// unit's structural refusal, from the supervisor process, which reads no
// table. One exported string is what keeps the two ends of "the same refusal
// block" — the synchronous judge's re-ask and a detached unit's re-ask — from
// drifting into two different sentences one edit at a time.
const JUDGE_REFUSAL_REPAIR_SENTENCE = "That is the refusal your previous answer raised, verbatim. Answer again, repairing exactly\n"
  + "it. The input below is unchanged, so re-reading the material is not what is wanted -- the\n"
  + "shape of your record is.";

// THE FILLED RECORD EXAMPLE (kogaki#1059): built from the run's own composed input
// (`composition_pin`, the composed group names), never a hand-written literal.
// Table-driven; two directives, each refused by name:
//   "$input:<key>"          the composed input's top-level <key>, verbatim
//   "$per-group:<text>"     an object mapping each composed group's name to <text>
// Any other value is a literal; any other `$`-prefixed string is a REFUSAL.
function judgeRecordExample(st, input) {
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

// The prompt is composed FROM THE TABLE (judgment point, input shape, refusal text).
// COMPOSED PER ATTEMPT (kogaki#1059): `lastRefusal` makes each re-ask a different ask.
// EXPORTED FOR THE DETACHED JOB (kogaki#1193): unit prompts use this one renderer.
export function judgePrompt(st, inputText, input, lastRefusal) {
  const L = [];
  L.push(`You are the judge at the ${flow().label} workflow's \`${st.id}\` judgment point.`);
  L.push("");
  L.push(`JUDGMENT POINT: ${st.judgment_point || st.id}`);
  L.push(`REQUIRED RECORD SHAPE: ${st.input_shape || "the typed record this state declares"}`);
  if (st.refusal) L.push(`WHAT IS REFUSED: ${st.refusal}`);
  // THE DECLARED SCHEMA, RENDERED VERBATIM (kogaki#1108). The validator reads its field
  // set from the same file, so the prompt and the refusal cannot disagree.
  // It stands ABOVE the input marker; everything past the marker is the composed input.
  // ONE ROW, ONE OR MANY FILES (kogaki#1126): each file whole, in order; a bare string
  // is the one-element list, so every pre-#1126 row reads unchanged.
  // Never fold two schemas into one file.
  for (const declared of (Array.isArray(st.schema_file) ? st.schema_file : (st.schema_file ? [st.schema_file] : []))) {
    const sp = join(REPO, String(declared));
    if (!existsSync(sp)) {
      fail(`${st.id}: the table declares \`schema_file\` ${JSON.stringify(declared)} and no such file `
        + `exists. A judgment state that names a shape the judge is never shown is the prose-only prompt `
        + `wearing a declaration (kogaki#1108).`);
    }
    L.push("");
    L.push(`THE SCHEMA THE ELEMENTS OF YOUR RECORD ARE FILLED AGAINST -- ${declared}, verbatim.`);
    L.push("Every field it declares, and what each one means. The refusals that judge your answer read");
    L.push("their field set from this same file, so what you are asked for and what is checked are one");
    L.push("text. Read it before composing.");
    L.push(readFileSync(sp, "utf8"));
  }
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
    L.push(JUDGE_REFUSAL_REPAIR_SENTENCE);
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

// THE RETRY IS BOUNDED BY THE STATE's `retries` (re-asks: 2 means at most three calls);
// a failure carries the last refusal text.
// ONE ASK-AND-VALIDATE LOOP for both invocation shapes (kogaki#1062): never copy it.
// It RETURNS on an exhausted bound; only the caller can name the groups in the failure.
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
      // ALL RESPONSE HANDLING IS INSIDE THE RETRY WINDOW (PR #1044; #1030 item 1).
      // `res.error` STAYS OUTSIDE IT: a command that could not be spawned is not re-asked.
      // THE CALL IS AWAITED OUTSIDE THE WINDOW AND JUDGED INSIDE (kogaki#1073): the
      // window is a synchronous depth counter and must never be held across an `await`.
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
      // A TIMEOUT IS NOT RE-ASKED (kogaki#1172 item 2). Every other refusal in
      // this window is fed back to the judge on the next attempt because the
      // NEXT ask is a different ask -- it carries the refusal text and asks the
      // judge to repair exactly it. A timeout repairs nothing by being re-asked:
      // the same prompt over the same input takes the same wall-clock time, so a
      // re-ask spends the retry bound on a fact a re-ask cannot change, which is
      // what the `method` tag's three exhausted 107s attempts (2026-09-20) spent
      // 270s doing. So this is decided BEFORE the soft window, on the same
      // exception `r.error` already gets one arm down, and it returns rather
      // than looping: `attempts` stays at what this call actually made (1, on
      // the first occurrence), and the caller's exhaustion message is built
      // from the return value exactly as it is on a bound genuinely spent.
      if (raw.error && raw.error.code === "ETIMEDOUT") {
        const msg = `${st.id}${at}: the judge exceeded the ${cfg.timeoutMs / 1000}s per-call bound the workflow table's `
          + "`judge` block declares. This attempt is NOT re-asked (kogaki#1172): a timeout is not repaired by "
          + "asking the same question again, so the bound is not spent re-running a call that will time out the "
          + "same way. The bound exists so that several calls in one span cannot exhaust the PostToolUse advance's "
          + "own timeout and leave a half-finished record (kogaki#1030).";
        refusals.push(msg);
        return { ok: false, out, attempts, refusals, lastRefusal: msg };
      }
      const res = softRefusals(() => {
        const r = raw;
        // ETIMEDOUT IS HANDLED ABOVE, before this window opens (kogaki#1172):
        // reaching here means `r.error` is either absent or some other spawn
        // fault, never a timeout.
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
  // ONE CALL PER COMPOSED GROUP WHERE THE TABLE DECLARES IT (kogaki#1062).
  // THE LIMITS (kogaki#1068 item 2) RESOLVE FOR EVERY JUDGMENT STATE (PR #1070), so the
  // unknown-block refusal fires on declaring the key.
  // They are SPENT ON THE PER-GROUP ASK ALONE: the whole-input prompt embeds its input
  // file verbatim; limits there belong in `compose_input`, not here.
  const limits = judgeLimits(st);
  if (st.per_group === true) {
    return await invokeJudgePerGroup(cfg, st, retries, inputPath, input, dir, validate, rec, limits);
  }
  const out = join(dir, `${flow().lane}-judge-${st.id}.json`);
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
  // A SPENT BOUND STOPS THE STATE, NOT THE RUN (kogaki#1172 item 3). This used
  // to be `fail()`, which exits the process; the state loop now catches this
  // instead and raises `terrain-judgment-retry` in its place, leaving the run
  // open rather than dead.
  throw new JudgmentExhausted(st.id,
    `${st.id}: the judge's record was refused on all ${r.attempts} attempt(s) (${retries} re-ask(s) licensed, the count `
    + `the workflow table declares for this state). The last refusal, verbatim: ${r.lastRefusal}`);
}

// THE COMPOSED INPUT, NARROWED TO ONE GROUP (kogaki#1062).
// It NARROWS AND NEVER ADDS: every key is kept, and only the group-keyed three are cut —
// `groups`, `material`, and `composition_pin.groups`.
function scopeCompositionInput(input, group) {
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

// ONE CALL PER COMPOSED GROUP (kogaki#1062). Per-group records are ASSEMBLED and the
// existing validator runs over the assembly; no refusal moves or is re-implemented.
// A refused group is re-asked alone to the state's `retries` (kogaki#1060).
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
    writeFileSync(join(dir, `${flow().lane}-judge-input-${st.id}-${slug}.json`), scopedText + "\n");
    const out = join(dir, `${flow().lane}-judge-${st.id}-${slug}.json`);
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
      // A SPENT BOUND STOPS THE STATE, NOT THE RUN (kogaki#1172 item 3), on the
      // same ground the whole-input arm above takes: the groups already judged
      // are validated records on disk, and the reuse logic at the top of this
      // function picks them back up on the retry the owner's click re-fires,
      // so the state re-enters costing only the groups that had not judged yet.
      throw new JudgmentExhausted(st.id,
        `${st.id}: the judge's record for group ${JSON.stringify(name)} was refused on all ${r.attempts} `
        + `attempt(s) (${retries} re-ask(s) licensed, the count the workflow table declares for this state). `
        + `${judged.length} of ${groups.length} group(s) were judged before it`
        + `${judged.length ? `: ${judged.join(", ")}` : ""}. The last refusal, verbatim: ${r.lastRefusal}`);
    }
    assembled[name] = readJson(r.out)[name];
    judged.push(name);
  }
  const out = join(dir, `${flow().lane}-judge-${st.id}.json`);
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
// EXPORTED AT kogaki#1108, for the second flow's judgment states. It is the one
// place a judgment record can come from — an explicit flag, or the executor's
// own call to the pinned judge — so a flow that composed its own would be the
// second producer `the typed judgment points` forbids.
export async function judgedRecordPath(rec, st, table, args, flag, composeInput, validate) {
  if (args[flag] !== undefined) {
    const p = String(args[flag]);
    validate(p);
    return p;
  }
  return await invokeJudge(table, st, composeInput(), rec._dir, validate, rec);
}

function judgmentProvenance(subdivisionsPath) {
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

// WHAT NAMES ONE INVOCATION RECORD (kogaki#1257). Both renderers read `.id`,
// a field `recordJudgeInvocation` never writes, so every OBSERVED line a real
// run produced named its record `undefined`; the cases fed a record carrying an
// `id` and saw nothing. The state and the moment of the call are written on
// every invocation record and together name one call; the response sha does
// not, since on the per-group arm it is the subdivisions record's own sha,
// which the same line already names.
function invocationRef(invocation) {
  return `${invocation.state}@${invocation.at}`;
}

// A record written before this field existed carries no provenance, and the
// honest reading of that is `declared` — an old record cannot show an
// observation it never made. Absent and declared are NOT collapsed elsewhere;
// they are collapsed HERE, once, at the one place the distinction has no
// consequence, so no renderer has to test for `undefined`.
function provenanceOf(carrier) {
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
const DISPLAY_WRAP_COLUMNS = 77;

// Word wrap with a hanging indent marking a CONTINUATION (kogaki#317); the grammar's
// `judge_pin_continuation` class keys on that indent.
// A word longer than the column is emitted OVERLONG, never broken (shas, invocation ids).
// A `head` is emitted WHOLE on the first line (PR #921): the grammar classifies a wrapped
// line by its first line, so no input length may push the head onto a continuation.
function wrapDisplayLine(text, columns = DISPLAY_WRAP_COLUMNS, indent = "  ", head = null) {
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
function judgePinLine(pin, prov) {
  const p = prov || { state: JUDGMENT_DECLARED, artifact_sha: null, invocation: null };
  const seen = p.artifact_sha
    ? `the --subdivisions record it read, sha \`${p.artifact_sha}\``
    : "no --subdivisions record at all";
  // BOTH ARMS WRAP, by one rule (kogaki#919 acceptance 2; observed arm since kogaki#1030).
  // THE PIN CLAUSE IS THE HEAD on both arms (PR #921): each form abbreviates at exactly
  // the head's end, not one space later.
  if (p.state === JUDGMENT_OBSERVED) {
    return wrapDisplayLine(`the Harness holds its own `
      + `invocation record \`${invocationRef(p.invocation)}\`, taken over ${seen} (SPEC-terrain, the SubGroup threshold, the report identity)`,
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

// THE REPORT'S JUDGE LINE, composed ONCE (kogaki#918; see also kogaki#892).
// Kept beside `judgePinLine`, not folded in: two surfaces, one composer each.
// Three arms (#918 adds the third): a `none` pin is the ABSENCE of a pin,
// never rendered as `pin DECLARED`.
// The clause names the RECORD, never the run: the idempotent rerun re-renders a PRIOR (pre-#892)
// record through this same function, so fix wording here, not at the rerun site.
function reportJudgeLine(identity, prov) {
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
    ? `OBSERVED, Harness invocation record \`${invocationRef(p.invocation)}\`, over ${held}`
    : `pin DECLARED, no Harness invocation record; the record holds: ${held}`}`;
}

// THE JUDGED-EMPTY NOTICE (kogaki#892 acceptance 2). Below the threshold a
// judged-empty outcome is conformant and renders; at or above it the pre-render
// refusal in `cmdReport` has already fired, which is why the size scoping this
// acceptance names is enforced upstream rather than re-tested here — a second
// size test would be a second carrier for one threshold.
function judgedEmptyNoticeLines(prov) {
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
function parseGlossFull(resp) {
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

// THE ADDRESS IS SELECTED HERE TOO (kogaki#1106) — see `fetchHeadlines` above
// for why no address in this module is composed any more. A tag resolves to
// every served cell carrying it, merged first-wins across cells in the order
// the surface served them, which is the same rule `fetchHeadlines` applies.
//
// AN UNADDRESSABLE TAG RETURNS AN EMPTY MAP, as a tag with no served rendering
// always did — and unlike the headline path this one has no marker vocabulary
// to report the difference through, because its callers render BODIES and a
// body's absence is disclosed by the surface that wanted it. What this path
// does not do is pretend a request was made: the empty map is reached without
// spending one.
function fetchGlossBodies(kind, tag) {
  const names = servedShardNames();
  const out = new Map();
  for (const address of names ? selectShardNames(names, kind, tag) : []) {
    const resp = gatewayQuery("gloss_index", { tag: address });
    if (resp.miss) continue;
    for (const [slug, entry] of parseGlossFull(resp)) if (!out.has(slug)) out.set(slug, entry);
  }
  return out;
}

// ---- COMPOSE-INPUT --------------------------------------------------------
// compose-input — the BOUNDED input the claim and subdivision composers read (kogaki#163 lever 3;
// SPEC.md, the rendering rule: "Tag-scoped and bounded — one shard pair per viewed tag").
// The bound is structural: `material` is keyed by member id and `groups` carry ids only, so a
// member in five groups appears ONCE; never add per-group copies of material.
// The fetcher is INJECTED so a check can count served-material reads; the accounting block below
// is an operator report and no check reads it (gloss/lessons/testing.md:131@12ba65dd).
// It composes and judges NOTHING: claim wording stays the composer's, coherence the judge's.
const COMPOSITION_INPUT_BOUND =
  "one tag-scoped served Gloss shard pair, fetched once for the run (SPEC.md, the rendering rule)";

function composeInput(record, tag, groups, fetchShard) {
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
    // THE COMPOSITION PIN (the open-questions section, v10, kogaki#212). The claim composer copies
    // this into its claims artifact; `cotags` refuses claims whose members are not a SUBSET of it.
    // It carries the served MEMBER SET, not a digest: a digest supports equality, not subset, and
    // cannot name the offending members the refusal must name.
    // (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:86`).
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

// The retired directory, removed and announced ONCE, never silently (acceptance 4).
// Scoped to the one directory #234 licensed; kogaki#750 retires the parent `~/.kogaki`, but this
// `rmSync` must not widen to that parent. Reports are regenerable, so nothing is migrated.
function retireLegacyReportsDir() {
  const legacy = join(homedir(), ".kogaki", "reports");
  if (!existsSync(legacy)) return;
  const n = readdirSync(legacy).length;
  rmSync(legacy, { recursive: true, force: true });
  console.log(`retired the invalid reports location (kogaki#234): removed ${n} regenerable `
    + "report(s) from the machine-local directory the owner ruling struck. Reports are "
    + "idempotent (SPEC-terrain, the report identity) — rerun to regenerate at the new locations.");
}

// Where the OWNER RENDERING lives (location and naming v11, kogaki#234; `specs/SPEC.md`,
// "Human-facing files live where the human works"). The discriminator is LIFETIME, not format.
// Default to the repository root, never cwd: the location must not depend on the invocation dir.
// Resolution is PURE (PR #702 round 1): `renderingsDir` also mkdirs and retires owner-tree files,
// so a guard must call this, never `renderingsDir`, to learn where a write would land.
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

// location and naming v12 (owner ruling 2026-08-14): the tree holds EXACTLY ONE owner rendering,
// `FullReport.md`. Any identity-named `terrain-full-report-<digest>.md` is retired on sight, with
// one line saying so (as `retireLegacyReportsDir`: never silently); a rerun regenerates it.
// EXPORTED so the retirement is asserted seam-free (PR #436 round 1, finding 4).
function retireIdentityNamedRenderings(dir) {
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

// THE OWNER SURFACE'S ARTIFACT LINES, IN ONE PLACE (no-hidden-path rule; location and naming v11).
// Both report paths — the fresh write and the idempotent rerun — must call this; never print the
// artifact lines inline on one branch (PR #240 round 1 finding 2).
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

// THE CoTagGroups OWNER RENDERING (kogaki#434; implemented under kogaki#464 after #434 closed).
// The runtime WRITES it (the single producer rule): the relay must not retype the display.
// The name is a LITERAL on the renderings directory, like `FullReport.md`: every display renders
// through here, with no second path and no caller-supplied name. One file, overwritten per render.
// NAVIGATION_HINT is one literal shared by the emitter and `report-format.json`'s `navigation_hint`
// form (kogaki#665); change both together.
const NAVIGATION_HINT =
  "Navigation (narrows nothing): name a tag in chat — the executor advances on the owner's word.";

const DISPLAY_RENDERING = "CoTagGroups.md";

// WRITE AUTHORITY, CARRIED AT THE WRITE (SPEC-terrain, write authority v28,
// kogaki#681, successor to #680; #681 kept `cotags`/`report` as entry points).
// The refusal binds the WRITE, not the entry point: `cotags`/`report` stay composition routes but
// cannot land an owner artifact out of order. The discriminator is the RESOLVED destination —
// never a flag or env var. The composition itself remains callable out of order.
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

// THE ONE PRIVATE DISPLAY WRITER (write authority, kogaki#665; PR #667 round 2, kogaki#625).
// The GRAMMAR comes from the CALLING STATE, not the artifact path: three states share one file.
// Both the print and the write run inside `emitOrRefuse`'s callback, so a nonconformant display
// reaches neither terminal nor artifact. One printer, one writer, one callback, one refusal.
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

// THE HAND-OVER'S FLOOR (kogaki#434; owner ruling 2026-09-05, kogaki#857). Writing is not
// delivery: the rendering must reach the owner, NAMED, as the first act after the command returns.
// Exactly one CoTagGroups file exists, overwritten per render. This function names the artifact;
// the form of the relay's hand-over is deliberately not decided here.
function announceDisplay(path) {
  console.log(`CoTagGroups — READ THIS ONE (owner rendering): ${relFromRepo(path)}`);
  console.log("ONE CoTagGroups file, overwritten per render — one owner rendering per class.");
}

// The owner register (location and naming v11). Markdown; nothing may parse it back.
// the Thesis candidates — the section this register renders (kogaki#760).
// The absent case RENDERS the section and says it is empty — never omit it, never refuse.
// Count, arity and membership are NOT checked here; they are runtime refusals in `cmdReport`,
// because `full_report`'s `line_class_allowlist` is inert.
function thesisCandidatesSection(candidates) {
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

// THE PRE-#861 REPLAY GUARD, PURE AND EXPORTED (PR #923 round 1, finding 2) so a case can reach it.
// A record stored before kogaki#861 carries thesis candidates with no `id`; such a record is
// RECOMPUTED (the reader mints the ids), never replayed into `thesisCandidatesSection`.
function priorPredatesCandidateIds(prior) {
  return Array.isArray(prior && prior.thesis_candidates)
    && prior.thesis_candidates.some((c) => !c || !c.id);
}

// THE WHOLE REPLAY DECISION lives here, and `cmdReport` asks it rather than composing it, so a
// case binds the decision itself, not a predicate beside the call site.
// Rule: a stored record that cannot be shown idempotent is RECOMPUTED — never replayed, never
// refused.
function shouldReplayPrior(prior, identity, sameIdentityFn = sameIdentity) {
  const predatesJudgmentKey = !!(prior && prior.identity
    && prior.identity.neighborhood_judgment === undefined);
  return sameIdentityFn(prior && prior.identity, identity)
    && !predatesJudgmentKey
    && !priorPredatesCandidateIds(prior);
}

function renderReportMarkdown(report, tag) {
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
  // the Thesis candidates — THE THESIS CANDIDATES SECTION (kogaki#760, owner ruling 2026-09-01).
  // Sited directly BELOW THE PREAMBLE (the boundary notice) and above all other content.
  // NON-BINDING, and the line says so on the surface: it constrains the Brief's Thesis not at all.
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
  // No `- lessons served: <n>` line on the owner surface (kogaki#761, owner ruling 2026-09-01;
  // report-format.json v16 retires `counted_served`).
  // `report.lessons_served` is still written by both record builders (grep `lessons_served:`).
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

// THE MEMBER → SERVED-LINE MAP, SITED ONCE AT THE REPORT'S END (the Full Report, line 805;
// wa#1115/#1116; story 1.53, kogaki#318). A member with no display_id or cite is NAMED.
// THE PIN IS STATED ONCE, IN THE IDENTITY — every other cite renders BARE (the Full Report v12,
// kogaki#315, story 1.56 AC5/AC6). AC5 asserts pin-once by counting occurrences in rendered bytes.
function bareCite(cite) {
  if (cite === null || cite === undefined) return cite;
  const s = String(cite);
  const at = s.lastIndexOf("@");
  return at === -1 ? s : s.slice(0, at);
}

function servedLinesBlock(report) {
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

// ONE MEMBER, WHOLE (the Full Report): render all six served fields — `id`, `cite`, `gloss`,
// `gloss_cite`, `journey_gloss`, `journey_cite` — with no truncation (kogaki#234, kogaki#243).
// A BLOCK, not a list row, so multi-line Gloss prose is never flattened or cut.
// Absence is STATED: no Journey and a missing Journey render differently, never as silence
// (the report identity v9).
function memberBlock(m, level) {
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
function reportIdentity(pin, tag, ids, judgePin, neighborhoodJudgment) {
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

// THE COMPOSED-INPUT DIGEST (the report identity, kogaki#700). Composed inputs are RECORDED,
// not keyed: a mismatch at the same identity refuses (`COMPOSED_INPUT_MISMATCH`), never replays.
// consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/articles.md:118
// Digest is over FILE BYTES, not a parse (a whitespace-only edit refuses a rerun).
// Set membership: an input that changes what the report SAYS is RECORDED here (kogaki#927);
// one that decides WHICH CANDIDATES ARE DISPLAYED is KEYED (`neighborhood`, kogaki#741).
// Every flag that decides the artifact must be here or in the identity (see kogaki#861).
const COMPOSED_INPUT_FLAGS = ["claims", "subdivisions", "neighborhood-candidates", "thesis-candidates"];
function composedInputDigests(args) {
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
function composedInputDelta(prior, current) {
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

function sameIdentity(a, b) {
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
// Ids resolve only against the groups THIS RUN composes (story 1.56 AC11).
// The sort is NUMERIC-AWARE: `G5-1` before `G10`; never compare the raw string.
// Canonical, so identity is set-based: the same ids in any order are ONE artifact.
function idSortKey(id) {
  const m = /^G([0-9]+)(?:-([0-9]+))?$/.exec(id);
  if (!m) return [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, id];
  return [Number(m[1]), m[2] === undefined ? -1 : Number(m[2]), ""];
}

function canonicalIds(ids) {
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
// Every bound is a RUNTIME refusal: `full_report`'s `line_class_allowlist` is inert, so a grammar
// class cannot carry count, arity or membership.
//   consulted: product-lab@ed0873dc topics/claude-code-ops.md:142
// The count is EXACT, read from `limits.thesis_candidates`; never write a second literal.
// The member set is THIS report's display ids, not the survey's.
function readThesisCandidates(raw, memberDisplayIds, limits) {
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
    // THE ID IS MINTED HERE, POSITIONALLY, BEFORE THE NEIGHBORHOOD IS JUDGED (kogaki#861, owner
    // ruling 2026-09-05): J3's targets are checked against this set, so it must be fixed first.
    // (product-lab@ab04cc9bca21a600cd9eb0a594619d3ca899d05f topics/claude-code-ops.md:24)
    // Never read an id from the input; later readers re-mint the same ids from the same order.
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

  // the Thesis candidates (kogaki#760) — READ AND REFUSED HERE, before anything is written.
  // The member set is THIS report's rendered display ids, computed from the resolved targets.
  // Key on `t.kind` (the SubGroup is on `t.sg`), like the other readers of this shape (PR #763
  // round 1).
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
  // the Full Report v7 — ONE report over the entered set; one SECTION per entered id.
  // The neighbourhood judgment is the FOURTH identity component (the report identity, kogaki#741),
  // hashed from the record's file bytes, as `composedInputDigests` reads it.
  // A missing record-joined judgment path refuses BY NAME here, ahead of the digest read
  // (the neighborhood section's shape, kogaki#741 acceptance 2).
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
    // the SubGroup threshold v7 RULE 3 binds this surface too (PR #355 round 1; kogaki#317):
    // both owner surfaces must show the same structure under a G-id.
    // Judge HERE with the same `judgeSubgroup`; never read the display's verdict.
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
  // round 1). `full_report`'s allowlist is inert, so the carrier is this PRE-RENDER refusal.
  // Scoped to GROUP sections: only a judged group reaches the empty-array `subgroups` state;
  // SubGroup sections carry `subgroups: null`.
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
    // A PRE-#741 RECORD IS NEVER REPLAYED (PR #756 round 1): an absent fourth component hashes as
    // `NO_JUDGE`, so falling through RECOMPUTES and reaches the refuse-unjudged guard below.
    // A PRE-#861 RECORD IS NEVER REPLAYED EITHER. Both guards and the identity comparison live in
    // `shouldReplayPrior`, pure and exported; never compose the condition here.
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
        // IDEMPOTENT ON THE RECORD; THE RENDERING IS STILL WRITTEN (location and naming v11).
        // Rewriting it makes a rerun self-healing (deleted, stale, or `--no-render` first run).
        // The rerun refuses on the same emit-time grammar as the fresh path, and validates
        // OUTSIDE the `--no-render` branch, symmetrically with the fresh path (PR #352 round 1).
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


  // THE PROVENANCE NEIGHBORHOOD — ONE ENUMERATION (kogaki#700).
  // Where `neighborhood_input` persisted the enumeration, the pull CONSUMES it: it is what J3
  // admitted judgment keys against, and a second live read can silently drop an admitted key.
  // Only a pull with no emitted enumeration computes fresh, after every refusal above.
  // Either way the result is stored IN THE RECORD, so rendering stays a pure function of it.
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

  // THE BOUNDED GLOSS FETCH (kogaki#689; kogaki#686 disposition 3; kogaki#741; kogaki#528).
  // Bounded by the rows that render (`neighborhoodDisplaySet`, at most
  // `NEIGHBORHOOD_DISPLAY_CAP`), never by the candidate set; `resolveHeadlines` bounds it
  // again to those rows' own tags.
  // A miss renders `NO_HEADLINE` and is never substituted.
  // The headline is a served rendering: it travels with its address (#686).
  const shownRows = neighborhoodDisplaySet(neighborhood.suggestions || []).shown || [];
  if (shownRows.length) {
    const { headlines: heads, seam, namespaces: ns, unaddressable } = resolveHeadlines(
      shownRows.map((x) => ({ slug: x.slug, tags: x.tags || [] })),
      { namespaces: NEIGHBORHOOD_GLOSS_NAMESPACES });
    for (const sug of shownRows) {
      const h = heads.get(sug.slug);
      sug.gloss = glossFor(sug, h, seam, ns, unaddressable);
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
  // THE REFUSAL PRECEDES BOTH WRITES (story 1.54 AC2; location and naming v11).
  // The record is written BELOW this line, and validation runs under `--no-render` too.
  // It goes through `emitOrRefuse` like the other two sites (PR #352): the write handed over
  // is empty and the two real writes follow.
  const renderedText = renderReportMarkdown(report, tag);
  emitOrRefuse("full_report", renderedText, () => {});

  writeFileSync(out, JSON.stringify(report, null, 2) + "\n");

  // THE OWNER RENDERING, in the SAME ACT (location and naming v11, kogaki#234). A run that
  // wrote the record and not the rendering would leave the owner exactly where
  // the ruling found them, so this is not conditional on a flag: `--no-render`
  // is the opt-out and its absence is the default.
  let rendered = null;
  if (!args["no-render"]) {
    // write authority v28 (kogaki#681; PR #702) — the write-authority refusal, BEFORE the
    // destination is prepared. The rerun branch also WRITES the rendering, so the guard sits
    // on BOTH branches.
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

// ---- ACT ------------------------------------------------------------------
// act — the second-proposer boundary, enforced by enumeration.
// THE PROPOSAL RECORD of the retired `act` subcommand, reachable only from
// `TRIM_RATIFICATION`'s declaration composer (kogaki#625 item 1). While `act`
// stood, a session could mint a trim proposal from outside the executor with no
// run record — precisely what write authority claims is unwritable.
// Returns the written record's path, or null where the act names no proposal.
function composeTrimProposal(args, dir) {
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

// ---- THE GATE DECLARATION AND ITS CAPTURE ---------------------------------
// The per-run declaration carries the RUN-COMPUTED options; the registry declares the CLASS.
// Records: kogaki#625 item 1, kogaki#890.
// Only the executor composes the declaration and admits the capture, at the wait that owes it.
// The answer is READ, never argued: `.claude/hooks/write-gate-capture.py` writes the row from
// the harness payload; this function is its reader.
// Every refusal below leaves the wait outstanding; recovery is to render the gate again.
function readCapturedAnswer(dir, decl, payloadToolUseId = null) {
  // THE CAPTURE FILE IS THE FLOW'S (kogaki#1108). It was `terrain<suffix>`
  // literally; the prefix is the lane, and the writer below reads it from the
  // same place, so the two cannot name different files.
  const capPath = join(dir, `${flow().lane}${GATE_SCHEMA.capture.suffix}`);
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
  // THE ADVANCE IS THE ANSWER'S OWN — second reader of the guard in
  // `.claude/hooks/advance-terrain.py` (kogaki#1075).
  // Refuses an advance driven by a payload whose `tool_use_id` answers some other question.
  // A NULL ID DOES NOT REFUSE: it asserts nothing; every advancing route names one
  // (`completeState` refuses a transition with no attribution).
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
function ownerGateDigest(gateId, optionIds) {
  return createHash("sha256").update(JSON.stringify([gateId, [...optionIds]])).digest("hex");
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

// THE ENUMERATION FOR A RESOLVED TARGET SET — extracted from the retired `cmdNeighborhood`
// (SPEC-terrain, the settled-strand-set input v20, story 1.69, kogaki#473). Reuse, never
// re-derive.
// THE JUDGMENT LAYER'S INPUT (kogaki#686): a session-composed FILE, as `--classification`
// is; no model call happens here. The level vocabulary is CLOSED and checked here.
// THE REFUSAL IS A THROW (kogaki#861): a pure function throws; the one impure caller turns it
// into `fail()`.
export class JudgmentRefusal extends Error {}

// A REFUSAL THE RE-ASK WINDOW MUST NOT ABSORB (kogaki#1125).
// The ask itself was malformed, so a re-ask from the same input cannot repair it; terminal by
// construction. `judgeAttempts` catches only `JudgmentRefusal`, so this propagates to `fail()`
// and `refusals_repaired` never counts it.
// consulted: coding::lesson/a-bounded-process-needs-one-exit-that-does-not-reproduce-it@206c657ee8da71ffbb1f4e41bf673d60401aaf49b87508be5b996058a5b8ea82
export class TerminalJudgmentRefusal extends Error {}

// A JUDGMENT STATE'S BOUND, SPENT (kogaki#1172, item 3).
// The state loop catches this, writes the `terrain-judgment-retry` gate declaration and
// stops as a `wait` does; the state is NOT marked complete, so "retry" re-enters it and
// "abandon" clears the open-run pointer.
// THROWN, never returned: the throw site is many frames below the loop that catches it.
class JudgmentExhausted extends Error {
  constructor(stateId, message) {
    super(message);
    this.stateId = stateId;
  }
}

// ============ THE DETACHED JOB (kogaki#1193) ============
// `compose_path` starts the job and throws `DetachedJobStarted`; the state is NOT complete
// and no gate is raised. `job await` resumes a FINISHED job (`detached-job` attribution).
// This file stays generic: the PROMPT and the declared VALIDATOR (kogaki#1240) come from the
// flow binding; never import `validateLegs` or anything Brief-specific here.
// A unit failing the validator classifies `refused`, feeding the re-ask (kogaki#1203) and
// refused-twice-is-final (kogaki#1273) machinery.
export class DetachedJobStarted extends Error {
  constructor(stateId, jobRecordPath, message) {
    super(message);
    this.stateId = stateId;
    this.jobRecordPath = jobRecordPath;
  }
}

const READER_PATH_JOB_FILE = "reader-path-job.json";
// THE OWNER'S OWN STATED CEILING (kogaki#1193), non-negotiable on technical
// grounds: no reader-path job runs past it.
export const READER_PATH_JOB_ABSOLUTE_LIMIT_S = 600;
// NO BYTE GROWTH ON ANY STILL-RUNNING UNIT FOR THIS LONG is read as a stall — a declared
// heuristic, kept narrower than the absolute limit.
// Per kogaki#1193 comment 3, this one output-byte bound stands in for both of the Issue's
// heartbeat and output signals.
export const READER_PATH_JOB_STALL_S = 90;
export const READER_PATH_JOB_HEARTBEAT_MS = 10000;

// THE TWO SESSION-TYPEABLE COMMAND LINES, SPELLED ONCE (kogaki#1193 PR #1195
// review round 1, finding 3). `jobWork`'s continuation text and
// `DetachedJobStarted`'s own message both used to describe these verbs in
// prose ("the Brief skill's `job status`/`job await` commands") rather than
// spell the exact line the skill's `allowed-tools` frontmatter admits — so a
// session reading either message met a paraphrase it could not type
// verbatim. Both readers now format off this one pair of strings.
export const READER_PATH_JOB_STATUS_COMMAND = "node src/brief.mjs run --status --job status";
export const READER_PATH_JOB_AWAIT_COMMAND = "node src/brief.mjs run --status --job await";

// THE STATES A JOB ENDS IN (kogaki#1193, narrowed by kogaki#1271, which removed
// the still-running state the 300s question was raised on). `done` carries no `failure` block;
// every other one does, and NOTHING IS EVER DELETED on any exit — a non-`done`
// job record is left exactly as it stood at classification, partial output
// included, for the Arm screen and for a later reader. The seven are `done`,
// `refused`, `stopped`, `ceiling`, `stalled`, `died` and `other`; the list was
// a constant nothing read, deleted at kogaki#1257, and
// `checks/check-brief-reader-path-job.sh` (a) now reads the set off the job
// records its fixtures end in.

// ONE RE-ASK PER UNIT (kogaki#1203, the owner's 2026-09-26 "same policy as
// before" ruling): 2 attempts total, so a unit refused on attempt 2 is
// terminal exactly as the synchronous judge's exhausted `retries` was.
const READER_PATH_UNIT_MAX_ATTEMPTS = 2;

// ONE FILE PER UNIT, NAMED BY ITS ID (kogaki#1203 acceptance 2). Both
// attempts of a retried unit land in this same path -- the first attempt's
// bytes, a divider line, then the second's -- so a unit that dies or is
// refused is inspectable from one path rather than a reader having to guess
// which attempt's file survived.
function readerPathUnitStdoutPath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.stdout`);
}

// ONE FILE PER FINISHED CANDIDATE, WRITTEN THE MOMENT ITS UNIT CLASSIFIES
// `done` (kogaki#1204). The job record already carries the same object
// embedded in the unit's own row, but that row lives inside one JSON file
// rewritten every heartbeat -- this is a second, narrower write, made once
// per unit and never touched again, so a finished Candidate is recoverable by
// itself whatever the job's own terminal state turns out to be and whatever
// else the record is rewritten to say next tick.
function readerPathUnitCandidatePath(dir, unitId) {
  return join(dir, `reader-path-unit-${unitId}.candidate.json`);
}

// THE RETRIED UNIT'S PROMPT (kogaki#1203): the first prompt, verbatim, plus
// the SAME refusal block a synchronous judge's re-ask gets from `judgePrompt`
// -- the marker, the refusal verbatim, `JUDGE_REFUSAL_REPAIR_SENTENCE` --
// SPLICED IN BEFORE `JUDGE_INPUT_MARKER`, exactly where `judgePrompt` puts it
// (PR #1207 review round 1): everything after that marker is the input file,
// so a block appended past it would be read as input, which is the defect
// #1203 diagnosed. The supervisor reads no table and no `st` -- the whole of
// what it has for a unit is the first prompt `startDetachedJobSupervisor`
// wrote into `reader-path-job-units.json` -- so it splices at the marker
// rather than re-rendering; the result is byte-identical to `judgePrompt`'s
// own re-ask over the same row and input. A prompt carrying no marker carries
// no input to misread, and the block is appended.
function readerPathUnitRetryPrompt(firstPrompt, refusal) {
  const block = ["", JUDGE_REFUSAL_MARKER, refusal, "", JUDGE_REFUSAL_REPAIR_SENTENCE].join("\n");
  const at = firstPrompt.indexOf(`\n${JUDGE_INPUT_MARKER}\n`);
  if (at < 0) return firstPrompt + "\n" + block;
  return firstPrompt.slice(0, at) + block + "\n" + firstPrompt.slice(at);
}

export function readerPathJobPath(dir) { return join(dir, READER_PATH_JOB_FILE); }
export function readerPathJobStopFlagPath(dir) { return join(dir, "reader-path-job.stop"); }

export function readReaderPathJob(dir) {
  const p = readerPathJobPath(dir);
  return existsSync(p) ? readJson(p) : null;
}

function writeReaderPathJob(dir, doc) {
  doc.updated_at = new Date().toISOString();
  const p = readerPathJobPath(dir);
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, JSON.stringify(doc, null, 2) + "\n");
  renameSync(tmp, p);
  return doc;
}

function readerPathBytes(str, n) {
  const s = String(str == null ? "" : str);
  return s.length > n ? s.slice(s.length - n) : s;
}

// ONE UNIT'S CHILD PROCESS, SPAWNED AND NEVER BLOCKED ON (kogaki#1193). Mirrors
// `judgeSpawnAsync`'s shape (same stdio, same accounting) but resolves nothing
// itself: the caller polls `out` at its own cadence, because a unit that
// stalls must not keep the other two — or the heartbeat — from being read.
//
// `stdoutFile`, WHEN GIVEN, IS WRITTEN AS THE CHILD STREAMS (kogaki#1203):
// `{ path, flag }`, `flag` defaulting to `"w"` -- a fresh file for a unit's
// first attempt, `"a"` for a retried attempt that appends past a divider its
// caller already wrote. This is what puts a unit's raw output on disk BEFORE
// the job ends, including a unit the ceiling or the stall bound kills mid-run:
// the write happens as each chunk arrives rather than at `close`, where a
// killed child never gets there.
function spawnDetachedJobUnit(command, argv, input, onBytes, env, stdoutFile) {
  const out = { bytes: 0, chunks: [], errChunks: [], done: false, exitCode: null, error: null, endedAt: null };
  let child;
  let fd = null;
  if (stdoutFile && stdoutFile.path) {
    try { fd = openSync(stdoutFile.path, stdoutFile.flag || "w"); } catch { fd = null; }
  }
  const closeFd = () => {
    if (fd === null) return;
    try { closeSync(fd); } catch { /* already gone */ }
    fd = null;
  };
  try {
    child = spawn(command, argv, { stdio: ["pipe", "pipe", "pipe"], env: env ? { ...process.env, ...env } : process.env });
  } catch (e) {
    closeFd();
    out.error = e; out.done = true; out.endedAt = new Date().toISOString();
    return { child: null, out };
  }
  child.stdout.on("data", (d) => {
    out.bytes += d.length; out.chunks.push(d);
    if (fd !== null) { try { writeSync(fd, d); } catch { /* the disk copy is best-effort; `out.chunks` is still the truth */ } }
    if (onBytes) onBytes(out.bytes);
  });
  child.stderr.on("data", (d) => out.errChunks.push(d));
  child.on("error", (e) => { out.error = e; });
  child.on("close", (code) => {
    out.exitCode = code; out.done = true; out.endedAt = new Date().toISOString();
    closeFd();
  });
  try { child.stdin.end(input); } catch { /* a child that exited before reading its prompt is the failure arm's */ }
  return { child, out };
}

// STRUCTURAL CLASSIFICATION OF ONE FINISHED UNIT (kogaki#1193, review round 1
// finding 1). Units spawn with `--output-format stream-json --verbose
// --include-partial-messages`, so `stdout` is JSONL — one JSON object per
// line, streamed as the child produces it — never the single buffered blob
// `--output-format json` writes at exit. The unit's record is the `result`
// field of its LAST `{"type":"result",...}` line, found by scanning from the
// end because a `stream-json` transcript carries many other line types
// (`system`, `assistant`, …) before the one that terminates it. Unwrapping
// `result` mirrors the same envelope `judgeRecordFrom` reads.
function readerPathUnitRecord(stdout, recordArray = "legs") {
  const lines = String(stdout == null ? "" : stdout).split("\n").filter((l) => l.trim() !== "");
  let resultLine = null;
  let anyValidJson = false;
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    anyValidJson = true;
    if (obj && typeof obj === "object" && obj.type === "result") { resultLine = obj; break; }
  }
  if (!resultLine) {
    return { error: anyValidJson ? "no `type: \"result\"` line in the stream-json output" : "not JSON: no line parsed as JSON" };
  }
  const inner = Object.prototype.hasOwnProperty.call(resultLine, "result") ? resultLine.result : resultLine;
  const record = typeof inner === "string" ? (() => {
    try { return JSON.parse(inner); } catch (e) { return { __parseError: `result did not parse: ${e.message}` }; }
  })() : inner;
  if (record && record.__parseError) return { error: record.__parseError };
  if (!record || typeof record !== "object" || Array.isArray(record)) return { error: "not a JSON object" };
  // THE ARRAY THE RECORD MUST CARRY IS DECLARED BY THE UNITS FILE (kogaki#1301):
  // `legs` for a reader-path unit, `claim_register` for a path-review unit.
  if (!Array.isArray(record[recordArray])) return { error: `no \`${recordArray}\` array` };
  return { candidate: record };
}

// THE DEAD UNIT'S LAST `result` LINE (kogaki#1197): even a unit that exits
// non-zero streams `stream-json`, so its last `{"type":"result",...}` line
// still carries the CLI's own `is_error: true` reading of what went wrong
// (e.g. "Not logged in · Please run /login") -- read here rather than left to
// `readerPathUnitRecord`, whose "not a JSON object" / "no `legs` array"
// checks are shaped for a LIVE candidate, not a dead unit's error string.
function readerPathDeadUnitResult(stdout) {
  const lines = String(stdout == null ? "" : stdout).split("\n").filter((l) => l.trim() !== "");
  for (let i = lines.length - 1; i >= 0; i--) {
    let obj;
    try { obj = JSON.parse(lines[i]); } catch { continue; }
    if (obj && typeof obj === "object" && obj.type === "result" && obj.is_error === true && typeof obj.result === "string") {
      return obj.result;
    }
  }
  return null;
}

// THE DECLARED VALIDATOR, LOADED HERE AND NOWHERE ELSE (kogaki#1240). This
// module knows nothing of Candidates, Legs or Briefs (kogaki#1193's own
// framing, carried forward) -- a checker inside a job is supplied concretely
// by the supervisor or not at all (the owner's 2026-09-25 principle), so the
// units file names the module and export to `import()` at runtime rather
// than this file statically importing anything Brief-specific. THROWS a
// plain `Error` (caught by `cmdJobSupervise`'s own catch-all, below) when the
// declaration or the named export is missing -- never `fail()`, which exits
// the process directly and would skip that catch entirely, leaving no job
// record behind for a refusal this function itself can fully describe.
async function loadReaderPathUnitValidator(declared) {
  if (!declared || typeof declared !== "object") throw new Error("the units file carries no declared validator (kogaki#1240).");
  if (!declared.module) throw new Error("the declared validator names no `module`.");
  if (!declared.export) throw new Error("the declared validator names no `export`.");
  const modulePath = String(declared.module);
  const exportName = String(declared.export);
  const mod = await import(pathToFileURL(resolve(REPO, modulePath)).href);
  const fn = mod[exportName];
  if (typeof fn !== "function") throw new Error(`${modulePath} exports no function named ${JSON.stringify(exportName)}.`);
  const inputs = declared.inputs || {};
  // THE `{error}`-RETURNING CONVENTION (carried from `validateLegs` and
  // `resolveMoveIds`, which `validateReaderPathUnit` itself calls) is
  // unwrapped HERE, once, so `classifyDetachedJobUnit` deals only in a
  // plain string-or-falsy refusal regardless of which declared validator
  // supplied it. The unit's own id rides as the third argument (kogaki#1301),
  // so a job whose units each judge a different subject can resolve which one.
  return (candidate, unitId) => {
    const r = fn(candidate, inputs, unitId);
    return r && r.error ? r.error : null;
  };
}

// `validate`, when given, is the DECLARED validator (kogaki#1240) loaded by
// the caller from the units file -- this function stays ignorant of what it
// checks or why, taking only a `(candidate) => string|null` function and
// downgrading an otherwise-`done` unit to `refused` on a truthy return.
function classifyDetachedJobUnit(out, validate, recordArray = "legs", unitId = null) {
  if (out.error) {
    return { status: "died", failure: { exit_code: out.exitCode, stderr_tail: readerPathBytes(String(out.error.message || out.error), 4000), bytes_written: out.bytes, ended_at: out.endedAt } };
  }
  if (out.exitCode !== 0) {
    const result = readerPathDeadUnitResult(Buffer.concat(out.chunks || []).toString("utf8"));
    return { status: "died", failure: { exit_code: out.exitCode, stderr_tail: readerPathBytes(Buffer.concat(out.errChunks).toString("utf8"), 4000), bytes_written: out.bytes, ended_at: out.endedAt, ...(result !== null ? { result } : {}) } };
  }
  const r = readerPathUnitRecord(Buffer.concat(out.chunks).toString("utf8"), recordArray);
  if (r.error) {
    return { status: "refused", failure: { exit_code: out.exitCode, stderr_tail: readerPathBytes(r.error, 4000), bytes_written: out.bytes, ended_at: out.endedAt } };
  }
  if (validate) {
    const refusal = validate(r.candidate, unitId);
    if (refusal) {
      return { status: "refused", failure: { exit_code: out.exitCode, stderr_tail: readerPathBytes(String(refusal), 4000), bytes_written: out.bytes, ended_at: out.endedAt } };
    }
  }
  return { status: "done", candidate: r.candidate };
}

// THE THREE SYSTEM-FAILURE STATES (kogaki#1273). A candidate REFUSAL is the
// unit's own answer failing its checks; these three are the job itself going
// wrong -- a unit that exited non-zero or never spawned (`died`), no output
// growth for the stall bound (`stalled`), and the supervisor's own catch-all
// (`other`). The owner's 2026-10-05 ruling: a system failure is a defect in
// /brief, never retried and never raised as a question, and it ends the Brief.
export const READER_PATH_JOB_SYSTEM_FAILURE_STATES = ["died", "stalled", "other"];

// THE REDUCTION OVER A FINISHED SET (kogaki#1273). One finished Candidate is
// enough: the job is `done` when at least one unit is `done`, whatever its
// siblings ended as, and `refused` only when every unit was refused. `ceiling`
// is a unit the absolute limit killed while it was still running -- a time
// bound rather than a defect -- so a set holding no `done` unit and at least
// one `ceiling` unit ends `ceiling`, the Stop-only arm.
function reduceFinishedReaderPathUnits(units) {
  if (units.some((u) => u.status === "done")) return "done";
  if (units.some((u) => u.status === "ceiling")) return "ceiling";
  if (units.some((u) => u.status === "refused")) return "refused";
  return "done";
}

// THE OVERALL JOB STATE, REDUCED FROM ITS UNITS (kogaki#1193, revised
// kogaki#1204 and kogaki#1273). A REFUSED unit does not end the job while a
// sibling is still running -- killing a running sibling on one unit's own
// refusal is exactly the loss #1204 was filed over. A DIED unit does, at once
// (kogaki#1273): it is a system failure, so it is answered on the tick it is
// seen rather than after its siblings finish, which is the #1204 rule this
// replaces. `stop_requested` is read first, because the owner's stop click is
// answered whatever a unit is doing; the two time bounds are read only while a
// unit is still running.
function classifyDetachedJobState(units, {
  stopRequested, elapsedS, stalledS,
  absoluteLimitS = READER_PATH_JOB_ABSOLUTE_LIMIT_S,
  stallS = READER_PATH_JOB_STALL_S,
} = {}) {
  if (stopRequested) return "stopped";
  if (units.some((u) => u.status === "died")) return "died";
  const running = units.filter((u) => u.status === "running");
  if (running.length === 0) return reduceFinishedReaderPathUnits(units);
  if (elapsedS >= absoluteLimitS) return "ceiling";
  if (stalledS >= stallS) return "stalled";
  return "running";
}

// THE ABSOLUTE LIMIT KEEPS FINISHED CANDIDATES (kogaki#1273). Every unit still
// running when the job reaches `READER_PATH_JOB_ABSOLUTE_LIMIT_S` ends
// `ceiling`, and the job is then reduced over the whole set like any other
// finished one: `done` when a unit finished, so the Candidate question is
// shown with what finished, and `ceiling` only when none did. The supervisor
// applies this when it kills those units, and `job await` applies the same
// function to a record its own clock reads past the limit before the
// supervisor's next tick has written it, so the two cannot disagree.
function readerPathJobAtLimit(units) {
  const atLimit = units.map((u) => (u.status === "running"
    ? { id: u.id, status: "ceiling", bytes: u.bytes || 0, note: "still running at the absolute limit; killed" }
    : u));
  return { units: atLimit, state: reduceFinishedReaderPathUnits(atLimit) };
}

// THE ONE RETRY, AND ONLY WHEN IT FITS (kogaki#1273, the owner's 2026-10-05
// ruling). A refused first attempt is retried once, and only if the job's
// elapsed time plus that attempt's own duration stays within the absolute
// limit: a retry that cannot finish before the limit is never started, which
// is the run of 2026-10-05 whose retries began with 140-200s left and ended as
// a timeout instead of the refusal that caused it. A refused retry is final --
// there is never a third attempt. Seconds may be fractional.
function readerPathRetryDecision({ attempt, elapsedS, attemptS, absoluteLimitS = READER_PATH_JOB_ABSOLUTE_LIMIT_S }) {
  if (attempt >= READER_PATH_UNIT_MAX_ATTEMPTS) return { retry: false };
  if (elapsedS + attemptS > absoluteLimitS) {
    return {
      retry: false,
      retry_skipped: {
        reason: "would pass the absolute limit",
        elapsed_s: elapsedS, attempt_s: attemptS, absolute_limit_s: absoluteLimitS,
      },
    };
  }
  return { retry: true };
}

// THE READER-PATH AWAIT'S OWN PER-POLL DECISION (kogaki#1213), pulled out of
// `awaitReaderPathJob` in `src/brief.mjs` as a pure function so a fixture can
// drive it without a live, 10-second heartbeat wait: the job record's units
// classified against the CURRENT elapsed time. THE LIMIT, READ BY THIS POLL'S
// OWN CLOCK (kogaki#1273): the running units end `ceiling` and the finished
// ones are kept, exactly as the supervisor reduces it -- never a Stop-only arm
// over a set that has a finished Candidate in it.
export function readerPathAwaitStep(job, { stopRequested, elapsedS, stalledS } = {}) {
  const raw = job.units || [];
  const classified = classifyDetachedJobState(raw, { stopRequested, elapsedS, stalledS });
  return classified === "ceiling" ? readerPathJobAtLimit(raw) : { units: raw, state: classified };
}

function readerPathRefusedUnits(unitRows) {
  return unitRows.filter((x) => x.status === "refused").map((x) => ({
    id: x.id, attempts: x.attempts || 1,
    ...(x.failure && x.failure.file ? { file: x.failure.file } : {}),
    ...(x.retry_skipped ? { retry_skipped: x.retry_skipped } : {}),
  }));
}

// THE UNITS A `done` JOB DID NOT FINISH, NAMED ON ITS RECORD (kogaki#1273). A
// `done` job carries no `failure` block, so the refused and `ceiling` units
// beside its finished Candidates ride as their own top-level fields.
function readerPathDoneJobUnfinished(unitRows) {
  const refused_units = readerPathRefusedUnits(unitRows);
  const ceiling_units = unitRows.filter((x) => x.status === "ceiling").map((x) => x.id);
  return {
    ...(refused_units.length ? { refused_units } : {}),
    ...(ceiling_units.length ? { ceiling_units } : {}),
  };
}

// THE `failure` BLOCK FOR A NON-`done` JOB RECORD (kogaki#1193 acceptance 2:
// "every state but `done` carries `failure`"). A `died`/`refused` job's
// failure is the offending unit's own -- already shaped by
// `classifyDetachedJobUnit` -- carried up rather than re-described; the three
// whole-job exits (`ceiling`, `stalled`, `stopped`) and the catch-all `other`
// state each a fact ABOUT THE JOB, so they are described here.
function readerPathJobFailure(state, unitRows, { elapsedS, stalledS, note } = {}) {
  if (state === "died" || state === "refused") {
    const u = unitRows.find((x) => x.status === state);
    // THE FINISHED SIBLINGS' CANDIDATES, NAMED (kogaki#1204 acceptance 2): a
    // `died`/`refused` job's failure block used to name only the offending
    // unit, leaving a reader of the record to notice by hand that its
    // siblings finished. Every `done` row beside it is named here, by id and
    // by the file `cmdJobSupervise` already wrote for it the moment it
    // classified `done` — the record pointing at bytes that are still there.
    const kept_candidates = unitRows
      .filter((x) => x.status === "done" && x.candidate_file)
      .map((x) => ({ id: x.id, file: x.candidate_file }));
    // THE SIBLINGS A DIED UNIT ENDED (kogaki#1273): a system failure kills
    // every unit still running on the same tick, and the record names them.
    const killed_units = unitRows.filter((x) => x.status === "killed").map((x) => x.id);
    // EVERY REFUSED UNIT, NOT ONLY THE FIRST (kogaki#1273): a job ends
    // `refused` only when all of its units were refused.
    const refused_units = state === "refused" ? readerPathRefusedUnits(unitRows) : undefined;
    return {
      unit: u ? u.id : null, ...(u && u.failure ? u.failure : {}), kept_candidates,
      ...(killed_units.length ? { killed_units } : {}),
      ...(refused_units ? { refused_units } : {}),
    };
  }
  if (state === "ceiling") {
    return { elapsed_s: elapsedS, ceiling_units: unitRows.filter((x) => x.status === "ceiling").map((x) => x.id),
      note: "the absolute limit was reached before any unit finished; nothing written so far is deleted." };
  }
  if (state === "stalled") {
    return { stalled_s: stalledS, note: "no unit produced new output for the stall bound; nothing written so far is deleted." };
  }
  if (state === "stopped") {
    return { note: "the owner's stop click ended the job; every unit's partial output stands." };
  }
  // `other` (kogaki#1193's catch-all): an exit the supervisor's own top-level
  // catch reaches, naming what actually happened rather than folding it into
  // one of the named exits it does not match.
  return { note: note || `unclassified exit (${state})` };
}

// THE SUPERVISOR (kogaki#1193). Spawned DETACHED by `startDetachedJobSupervisor`
// below and never awaited by its spawner -- this function's own process
// outlives the hook that started it, which is the whole point of a Detached
// Job. It owns the per-unit children, the heartbeat write and the terminal
// classification; nothing else writes `reader-path-job.json` once this has
// started.
async function cmdJobSupervise(args) {
  const dir = String(args.run || fail("job-supervise needs --run <dir> (internal verb, kogaki#1193)."));
  let unitsRunning = null;
  try {
    const unitsPath = String(args.units || fail("job-supervise needs --units <file>."));
    const command = String(args.command || fail("job-supervise needs --command <path>."));
    const model = String(args.model || fail("job-supervise needs --model <name>."));
    const absoluteLimitS = Number(args["absolute-limit-s"]) || READER_PATH_JOB_ABSOLUTE_LIMIT_S;
    const stallS = Number(args["stall-s"]) || READER_PATH_JOB_STALL_S;
    const heartbeatMs = Number(args["heartbeat-ms"]) || READER_PATH_JOB_HEARTBEAT_MS;
    // THE DECLARED VALIDATOR, REQUIRED (kogaki#1240): a units file with no
    // `validator` key -- or naming no loadable export -- `fail()`s here,
    // before any child is spawned, and is caught by this function's own
    // catch-all below exactly like any other malformed units file.
    const declared = readJson(unitsPath);
    const units = Array.isArray(declared) ? declared : (declared.units || fail("the units file at " + unitsPath + " carries no `units` array."));
    const validate = await loadReaderPathUnitValidator(declared.validator);
    const recordArray = typeof declared.record_array === "string" && declared.record_array ? declared.record_array : "legs";

    // THE MINIMAL ENVIRONMENT (kogaki#1193, kogaki#1197): only `units[].prompt` and the
    // session's own login; do not add the bare-session flag (it breaks OAuth auth), and keep
    // `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` in the child env.
    // THE OUTPUT FORMAT IS HARDCODED (PR #1195): `stream-json` with
    // `--include-partial-messages` is the stall bound's only progress signal; never make it
    // a per-caller option.
    const argv = ["-p", "--model", model,
      "--output-format", "stream-json", "--verbose", "--include-partial-messages",
      "--tools", "", "--disable-slash-commands", "--strict-mcp-config",
      "--setting-sources", "", "--no-session-persistence"];
    const childEnv = { CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" };
    const startedAt = Date.now();
    // THE PER-UNIT RETRY STATE (kogaki#1203). `attempts` starts at 1 for every
    // unit and reaches `READER_PATH_UNIT_MAX_ATTEMPTS` at most once a
    // structural refusal is re-asked; `firstRefusal` holds attempt 1's own
    // refusal text so a unit refused twice reports BOTH, and the second
    // attempt's own classification carries the second verbatim.
    const unitAttempts = new Map(units.map((u) => [u.id, 1]));
    const unitFirstRefusal = new Map();
    // WHEN EACH UNIT'S CURRENT ATTEMPT STARTED (kogaki#1273): a refused
    // attempt's own duration is what `readerPathRetryDecision` adds to the
    // job's elapsed time to decide whether a retry could finish in time.
    const unitAttemptStartedAt = new Map(units.map((u) => [u.id, startedAt]));
    // A REFUSED UNIT'S SKIPPED RETRY, KEPT so every later tick's row carries it.
    const unitRetrySkipped = new Map();
    // WRITTEN ONCE PER UNIT (kogaki#1204): a `done` unit's row is recomputed
    // from the same finished `out` on every later tick until the whole job
    // reaches a terminal state, and this set is what keeps that from
    // rewriting the same Candidate file every heartbeat.
    const unitCandidateWritten = new Set();
    unitsRunning = new Map(units.map((u) => {
      const stdoutFile = { path: readerPathUnitStdoutPath(dir, u.id), flag: "w" };
      return [u.id, spawnDetachedJobUnit(command, argv, u.prompt, () => {}, childEnv, stdoutFile)];
    }));
    let lastProgressAt = startedAt;
    let lastBytesTotal = 0;

    for (;;) {
      // eslint-disable-next-line no-await-in-loop -- one supervisor, one loop,
      // ordinary sequential polling; `spawnDetachedJobUnit`'s children still
      // service their own stdout/stderr/close events on this event loop
      // between ticks, which is why this is `setTimeout` and never the
      // synchronous `Atomics.wait` `job await` uses on the CLI side -- that one
      // has no children of its own to starve.
      await new Promise((r) => { setTimeout(r, heartbeatMs); });
      const stopRequested = existsSync(readerPathJobStopFlagPath(dir));
      let bytesTotal = 0;
      // A RETRY IS PROGRESS TOO (kogaki#1203): the respawned child's byte
      // counter starts back at 0, so `bytesTotal` can fall even though real
      // work just happened -- tracked separately so a retry can never be
      // mistaken for a stall.
      let retried = false;
      const unitRows = units.map((u) => {
        const sp = unitsRunning.get(u.id);
        if (sp.out.done) {
          const cls = classifyDetachedJobUnit(sp.out, validate, recordArray, u.id);
          const attempt = unitAttempts.get(u.id) || 1;
          // THE ONE RE-ASK (kogaki#1203 acceptance 3, bounded by kogaki#1273):
          // a STRUCTURAL refusal on attempt 1 respawns the unit with the
          // refusal appended, verbatim -- but only when the retry fits inside
          // the absolute limit (`readerPathRetryDecision`). `died` (a non-zero
          // exit) is never retried: it is a system failure.
          const decision = cls.status === "refused" && !unitRetrySkipped.has(u.id)
            ? readerPathRetryDecision({
              attempt,
              elapsedS: Math.round((Date.now() - startedAt) / 100) / 10,
              attemptS: Math.round(((Date.parse(sp.out.endedAt) || Date.now()) - unitAttemptStartedAt.get(u.id)) / 100) / 10,
              absoluteLimitS,
            })
            : { retry: false };
          if (decision.retry_skipped) unitRetrySkipped.set(u.id, decision.retry_skipped);
          if (decision.retry) {
            const refusal = cls.failure.stderr_tail;
            unitFirstRefusal.set(u.id, refusal);
            const stdoutPath = readerPathUnitStdoutPath(dir, u.id);
            try { appendFileSync(stdoutPath, `\n----- attempt ${attempt + 1} -----\n`); } catch { /* the disk copy is best-effort */ }
            const retryPrompt = readerPathUnitRetryPrompt(u.prompt, refusal);
            const respawned = spawnDetachedJobUnit(command, argv, retryPrompt, () => {}, childEnv,
              { path: stdoutPath, flag: "a" });
            unitsRunning.set(u.id, respawned);
            unitAttempts.set(u.id, attempt + 1);
            unitAttemptStartedAt.set(u.id, Date.now());
            bytesTotal += respawned.out.bytes;
            retried = true;
            return { id: u.id, status: "running", bytes: respawned.out.bytes };
          }
          bytesTotal += sp.out.bytes;
          const firstRefusal = unitFirstRefusal.get(u.id);
          if (cls.status === "died" || cls.status === "refused") {
            cls.failure = { ...cls.failure, file: readerPathUnitStdoutPath(dir, u.id),
              ...(firstRefusal !== undefined ? { first_refusal: firstRefusal } : {}) };
          }
          // A UNIT REPAIRED ON ITS RE-ASK IS NOT A UNIT NEVER REFUSED (PR #1207
          // review round 1, the synchronous judge's own position): its row
          // carries the attempt count and the first refusal, so a `done` job
          // still shows a judge drifting toward the bound.
          const retryTrace = firstRefusal !== undefined ? { attempts: attempt, first_refusal: firstRefusal } : {};
          // A RETRY NOT STARTED IS RECORDED WITH BOTH NUMBERS (kogaki#1273).
          const skipped = unitRetrySkipped.get(u.id);
          const skipTrace = skipped ? { attempts: attempt, retry_skipped: skipped } : {};
          // THE CANDIDATE IS WRITTEN TO DISK THE MOMENT THIS UNIT CLASSIFIES
          // `done` (kogaki#1204 acceptance 2), whatever the OTHER units are
          // doing and whatever the job's own terminal state turns out to be --
          // the write below runs regardless of any still-running sibling.
          let candidateFile;
          if (cls.status === "done") {
            candidateFile = readerPathUnitCandidatePath(dir, u.id);
            if (!unitCandidateWritten.has(u.id)) {
              try { writeFileSync(candidateFile, `${JSON.stringify(cls.candidate, null, 2)}\n`); unitCandidateWritten.add(u.id); }
              catch { /* the job record's own embedded `candidate` is still the truth */ }
            }
          }
          return { id: u.id, bytes: sp.out.bytes, ...cls, ...retryTrace, ...skipTrace, ...(candidateFile ? { candidate_file: candidateFile } : {}) };
        }
        bytesTotal += sp.out.bytes;
        return { id: u.id, status: "running", bytes: sp.out.bytes };
      });
      if (retried || bytesTotal > lastBytesTotal) { lastBytesTotal = bytesTotal; lastProgressAt = Date.now(); }
      const elapsedS = Math.floor((Date.now() - startedAt) / 1000);
      const stalledS = Math.floor((Date.now() - lastProgressAt) / 1000);
      let state = classifyDetachedJobState(unitRows, { stopRequested, elapsedS, stalledS, absoluteLimitS, stallS });
      let rows = unitRows;
      if (state === "ceiling") {
        // THE LIMIT KEEPS WHAT FINISHED (kogaki#1273): the units still running
        // end `ceiling` and are killed below; the job is `done` if any unit is.
        ({ units: rows, state } = readerPathJobAtLimit(unitRows));
      } else if (READER_PATH_JOB_SYSTEM_FAILURE_STATES.includes(state)) {
        // A SYSTEM FAILURE ENDS EVERY UNIT ON THIS TICK (kogaki#1273): the
        // units still running are killed below, with no retry, and their rows
        // say so rather than reading `running` on a job that has ended.
        rows = unitRows.map((r) => (r.status === "running"
          ? { id: r.id, status: "killed", bytes: r.bytes || 0, note: `killed on the tick the job ended ${state}` } : r));
      }
      writeReaderPathJob(dir, {
        started_at: new Date(startedAt).toISOString(),
        absolute_limit_s: absoluteLimitS,
        last_progress_at: new Date(lastProgressAt).toISOString(),
        supervisor_pid: process.pid,
        state,
        units: rows,
        ...(state === "done" ? readerPathDoneJobUnfinished(rows) : {}),
        ...(state !== "done" && state !== "running"
          ? { failure: readerPathJobFailure(state, rows, { elapsedS, stalledS }) } : {}),
      });
      if (state === "running") continue;
      for (const u of units) {
        const sp = unitsRunning.get(u.id);
        if (!sp.out.done) { try { sp.child.kill("SIGKILL"); } catch { /* already gone */ } }
      }
      break;
    }
  } catch (e) {
    // THE CATCH-ALL (kogaki#1193's `other`): an exit nothing above named --
    // a bad units file, a spawn that threw synchronously, anything this
    // function itself did not anticipate. Written best-effort: a record this
    // process cannot even open is a record `job await` reads as `died` on its
    // own staleness check, never as a silent nothing.
    try {
      for (const [, sp] of unitsRunning || []) {
        if (sp.child && !sp.out.done) { try { sp.child.kill("SIGKILL"); } catch { /* already gone */ } }
      }
      const existing = readReaderPathJob(dir) || { started_at: new Date().toISOString(), units: [] };
      writeReaderPathJob(dir, {
        ...existing,
        supervisor_pid: process.pid,
        state: "other",
        failure: readerPathJobFailure("other", existing.units || [], { note: `the supervisor process itself failed: ${e.message}` }),
      });
    } catch { /* the write itself failing leaves the prior record, which is still the truth as of its own timestamp */ }
  }
}

// THE STARTER (kogaki#1193), called in-process from `compose_path`'s own
// STATE_WORK -- never from a Bash command. Writes the units file the
// supervisor reads (the ONE thing the Harness hands it, per the owner's
// "strictly control what information is passed" ruling), spawns it DETACHED
// and returns immediately without waiting on it: the whole reason a
// `DetachedJobStarted` throw follows this call rather than a blocking wait.
export function startDetachedJobSupervisor(dir, opts) {
  const validator = opts.validator || fail("startDetachedJobSupervisor needs a declared `validator` (kogaki#1240).");
  const unitsPath = join(dir, "reader-path-job-units.json");
  writeFileSync(unitsPath, `${JSON.stringify({ units: opts.units, validator, ...(opts.recordArray ? { record_array: opts.recordArray } : {}) }, null, 2)}\n`);
  const scriptPath = fileURLToPath(import.meta.url);
  const child = spawn(process.execPath, [
    scriptPath, "job-supervise",
    "--run", dir, "--units", unitsPath,
    "--command", opts.command, "--model", opts.model, "--output-format", opts.outputFormat,
    "--absolute-limit-s", String(opts.absoluteLimitS),
    "--stall-s", String(opts.stallS), "--heartbeat-ms", String(opts.heartbeatMs),
  ], { detached: true, stdio: "ignore", cwd: REPO });
  child.unref();
  const now = new Date().toISOString();
  writeReaderPathJob(dir, {
    started_at: now,
    last_progress_at: now,
    supervisor_pid: child.pid,
    state: "running",
    units: opts.units.map((u) => ({ id: u.id, status: "running", bytes: 0 })),
  });
  return { unitsPath, supervisorPid: child.pid };
}

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

function readNeighborhoodJudgments(path) {
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
function refuseTargetsOutsideCandidates(judgments, candidateIds, at) {
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
function neighborhoodDisplaySet(suggestions) {
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
function neighborhoodSection({ gids, no_material, suggestions, unresolved = [] }) {
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

// The CLI dispatch runs only when this file IS the entry point, so the module stays
// importable by fixtures (`orphan-mechanisms-fail-the-suite`).
// ==== THE CONTROL PLANE ====================================================
// The workflow table, the run record, the executor (SPEC-terrain, the control plane, v23;
// kogaki#625 items 1, 2, 5, 6; #625 item 6; story 1.89 / kogaki#652).
// The executor holds NO state list: ids, order, kinds, waits, writes, conditions and
// terminals come from the table; only `KIND_SEMANTICS` and `STATE_WORK` live here.
// It REFUSES a write state it has no renderer for. A renderer may name the wait it consumes;
// no control code here may know the ORDER states run in.

// The kind vocabulary this executor interprets. The table's `state_kinds`
// object is the prose for these; `stops` is the only CONTROL property a kind
// carries, and it is why `terminal` had to be its own kind rather than a
// `compute` at the end of the array (terrain-workflow.json v2, PR #626 round 1).
const KIND_SEMANTICS = {
  compute: { stops: false, needsRenderer: false },
  write: { stops: false, needsRenderer: true },
  judgment: { stops: false, needsRenderer: true },
  wait: { stops: true, needsRenderer: false },
  terminal: { stops: true, needsRenderer: false },
};

const TERRAIN_WORKFLOW_TABLE = join(REPO, "src/terrain-workflow.json");
const RUN_RECORD_FILE = "run-record.json";

// ---- WHO EXECUTED THIS TRANSITION (kogaki#1027) ------------------------------
// `advanced_by` is COPIED from the harness's own payload, never composed here.
// The kinds are a closed set: `hook` carries the three payload fields verbatim;
// `skill-expansion` carries no hook fields. A third kind is a decision, not an addition.
// The self-declared kind is trustworthy only because `.claude/hooks/gate-terrain-executor.py`
// denies the Bash route; the Removal Test fixture exercises that deny.
const EXECUTOR_KINDS = ["hook", "skill-expansion", "detached-job"];

// The start act's attribution. It carries no hook fields, deliberately -- see
// above.
// EXPORTED FOR THE SECOND FLOW BINDING (kogaki#1108). `src/brief.mjs`'s own
// `start` case enters `runWorkflow` with this attribution, exactly as the
// dispatcher below enters `cmdRun` with it — the attribution is a property of
// WHICH ACT opened the run, not of which flow it opened, so a second flow that
// minted its own constant would be a second answer to one question.
export const SKILL_EXPANSION_EXECUTOR = { executor: "skill-expansion" };

// THE THIRD KIND (kogaki#1193 -- "a decision, not an addition"). `hook` says an
// owner clicked; `skill-expansion` says the harness ran the skill's own `!`
// line; NEITHER is true of the act that turns a FINISHED detached job into a
// completed `compose_path`. That act is `job await`, typed directly into Bash
// by the session -- and it is trustworthy for the same reason `start` is: it
// is one FIXED, narrow act (poll a job record this same run already opened,
// and resume the one waiting state that opened it), never a route to an
// arbitrary transition, and `gate-terrain-executor.py`'s admitted `run
// --status` shape is the only Bash spelling that reaches it (see `cmdJob`
// below). Carries the job record's own relative path, so a reader of the run
// record can find the job that produced this transition without guessing.
export function detachedJobExecutor(jobRecordRelPath) {
  return { executor: "detached-job", job_record: jobRecordRelPath };
}

// WHO OPENED THE POINTER THIS ACT WRITES (kogaki#1051).
// For the START act the model has had no turn since the gate opened: the skill's `!`
// line runs before UserPromptSubmit judges the invoking prompt.
// Process-wide on purpose: one invocation is one act with one attribution, set by `cmdRun`.
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
function loadWorkflowTable(path) {
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

// The baseline is DERIVED from the states array, not read from `counted_baseline`;
// `run --status` renders both so a disagreement is visible.
// THE WRITE-OUTCOME CLASSIFIER (kogaki#1257; PR #667 round 1 finding 2). Kept pure
// (`fail()` exits) so the fixture can exercise all three outcomes:
//   wrote          — the renderer wrote and named what it wrote
//   wrote-nothing  — ran and deliberately wrote nothing (`--no-render`, idempotent rerun)
//   named-nothing  — wrote and did not say where; the only one that refuses
function classifyWriteOutcome(outcome) {
  if (!outcome || typeof outcome !== "object" || !("artifact" in outcome)) return "named-nothing";
  return outcome.artifact ? "wrote" : "wrote-nothing";
}

function derivedBaseline(table) {
  const states = table.states;
  const writing = states.filter((s) => s.kind === "write");
  // `writers_per_artifact` IS DROPPED (PR #655 round 1 finding 3; decided at kogaki#665).
  // `writer` is prose, not a countable set, so the figure could never disagree.
  // Keep this derivation and `terrain-workflow.json`'s `counted_baseline` key-for-key;
  // one-writer is by construction: one private `writeDisplaySurface`, no second path.
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
function runCounts(rec) {
  return {
    waits: rec.waits_reached.length,
    owner_artifact_writes: rec.artifacts_written.length,
    judgment_points: Object.keys(rec.judgments).length,
    conditional_states_entered: rec.conditional_entered.length,
  };
}

function runRecordPath(dir) { return join(dir, RUN_RECORD_FILE); }

// EXPORTED FOR THE JOB-VERB DISPATCH (kogaki#1193): `job await` runs as its
// own `run --status --job await` invocation, outside the executor's own
// read/write of the record, and needs the same reader/writer the loop uses so
// a job-resumed run and a hook-resumed run persist the identical shape.
export function readRunRecord(dir) {
  const p = runRecordPath(dir);
  return existsSync(p) ? readJson(p) : null;
}

export function writeRunRecord(dir, rec) {
  writeFileSync(runRecordPath(dir), JSON.stringify(rec, null, 2) + "\n");
  return runRecordPath(dir);
}

// THE LANE'S MOST RECENT FINISHED RUN, OR NONE (kogaki#1163 acceptance 3). A
// `start` that mints a fresh workspace over one that reached `done` seconds
// earlier is a legitimate act — the terminal clears the open-run pointer by
// design — but it was, until this, an act the session had no way to notice
// from the new run's own output. Sorted on the entry name rather than mtime:
// `terrainRunEntry` names are ISO instants with the colons stripped, so
// lexicographic order over the directory names IS chronological order, with no
// filesystem timestamp to disagree with it.
function mostRecentDoneRun(lane) {
  const dir = laneDir(lane);
  if (!existsSync(dir)) return null;
  const names = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse();
  for (const name of names) {
    const rd = join(dir, name);
    const rec = readRunRecord(rd);
    if (rec && rec.done === true) return { dir: rd, rec };
  }
  return null;
}

// ---- THE RECORD AS IT STANDS, WRITTEN MID-ADVANCE (kogaki#1073 item 3).
// Same writer and shape as the release (`_dir` stripped), run after every completed
// state and every per-group judge record, since a SIGKILL at `ADVANCE_TIMEOUT_S` runs
// no exit path. A failing write is NOT swallowed.
// Exported for the job-verb dispatch (kogaki#1193): `job await` persists a `rec` with `_dir`.
export function checkpointRun(rec) {
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
// The model half is observed; the effort half is declared by the table. An explicit flag wins.
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

const GATE_WORK = {
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


// ---- THE EXECUTOR --------------------------------------------------------
// ONE entry point, entered once per act (the re-entrant executor). It never blocks on input:
// `parseArgs` reads process.argv only; no stdin path.
// NO STOP IN THIS FLOW PRINTS AN INVOCATION (kogaki#856): owner reading rides the gate
// declaration. Records: kogaki#807; `checks/registry.json`.
// consulted: product-lab@7e1bba09ae982ffa7e322463fdb052379c77a77d LESSONS.md:133

// THE EXECUTOR'S ONE BODY, ENTERED BY TWO ACTS (kogaki#1027). `advancedBy` is resolved
// by the CALLER, so a transition without a payload is refused BEFORE ANY WRITE.
// ---- THE TWO FLOW BINDINGS (kogaki#1108) ----------------------------------
// A flow is a table plus two maps plus a lane; everything below `runWorkflow` is shared.
//   lane: `runs/` lane (workspace, open-run pointer, capture prefix); label; startLine;
//   tablePath; newRunDir; stateWork; gateWork; runDirEnv/openRunEnv (per flow).
// `flow()` falls back to Terrain's binding for every caller outside `runWorkflow`.
const TERRAIN_FLOW = {
  lane: "terrain",
  label: "Terrain",
  startLine: "the terrain skill's own `!` line (`node src/terrain.mjs start`)",
  tablePath: TERRAIN_WORKFLOW_TABLE,
  newRunDir: () => enterRun("terrain", terrainRunEntry()),
  stateWork: STATE_WORK,
  gateWork: GATE_WORK,
  runDirEnv: "KOGAKI_RUN_DIR",
  openRunEnv: "KOGAKI_OPEN_RUN",
};

// THE ONE ENTRY A SECOND RUNTIME USES. `src/brief.mjs` composes its own
// binding and calls this; it never reimplements the loop, which is what makes
// "the executor advances from hook payloads" one implementation rather than
// two that can drift.
export async function runWorkflow(binding, args, advancedBy, opts = {}) {
  const held = FLOW;
  FLOW = binding;
  // SCOPED BY try/finally rather than by setting and clearing around the call,
  // on `WRITING_STATE`'s own argument one screen up: a refusal inside the loop
  // would otherwise leave one flow's binding standing for whatever ran next in
  // the same process.
  try { return await cmdRun(args, advancedBy, opts); }
  finally { FLOW = held; }
}

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
      + `The read-only route is this runtime's own \`run --status\` (kogaki#1038).`);
  }
  // `start` READS NO ARGUMENTS FROM THE SESSION (kogaki#1163); refused before `runDir`,
  // so a refused start opens no workspace and prunes no lane.
  // An ALLOWLIST (PR #1168 round 1): only `--run-dir` and `--workflow` pass.
  // Applies only when `_` is present (the `parseArgs` CLI): `runWorkflow` and
  // the Brief runtime's own parser pass other options.
  const START_READS = new Set(["run-dir", "workflow"]);
  if (stopAtFirstWait && Array.isArray(args._)) {
    const positionals = args._;
    const unread = Object.keys(args)
      .filter((k) => k !== "_" && !START_READS.has(k))
      .map((k) => `--${k}`)
      .concat(positionals);
    if (unread.length) {
      fail(`\`start\` reads no arguments from the session (kogaki#1163) — it opens a fresh ${flow().label} `
        + `workspace on every invocation and takes no run identity, so ${JSON.stringify(unread)} names nothing `
        + `this act can act on. A run already open is read with this runtime's own \`run --status\`, which is `
        + `the read-only route to an existing run's position; there is no argument that resumes one. `
        + `(\`--run-dir\` and \`--workflow\` are read, and are the fixture's route: a caller who names a `
        + `directory or a table holds it.)`);
    }
  }
  // THE PIN IS READ THROUGH THE BINDING, NOT BY NAME (PR #1109 round 1).
  // `runDir` one screen up reads `process.env[flow().runDirEnv]`, and these two
  // conditions read `KOGAKI_RUN_DIR` literally -- so with two flows the readers
  // disagreed in BOTH directions. `KOGAKI_BRIEF_RUN_DIR=/w node src/brief.mjs
  // run` took the `else` arm and refused "no Brief run is open" over a pinned
  // workspace; worse, with Terrain's `KOGAKI_RUN_DIR` standing in an inherited
  // environment a Brief advance took the pinned arm, `runDir` found no
  // `KOGAKI_BRIEF_RUN_DIR`, and every advance minted a fresh Brief workspace
  // and abandoned the open run. One reader of the pin, named by the binding.
  const pinned = process.env[flow().runDirEnv];
  // THE PRIOR RUN IS READ BEFORE THE NEW ONE IS MINTED (kogaki#1163 acceptance
  // 3). `runDir`'s default branch prunes the lane and creates this run's own
  // directory, so a read taken after it would already be looking at a lane
  // holding this run alongside whatever it did not prune. Read here, while the
  // lane still holds only what the LAST run left behind.
  const mintingFresh = stopAtFirstWait && !args["run-dir"] && !pinned;
  const priorDoneRun = mintingFresh ? mostRecentDoneRun(flow().lane) : null;
  if (stopAtFirstWait || args["run-dir"] || pinned) {
    dir = runDir(args);
    if (stopAtFirstWait && !args["run-dir"] && !pinned) writeOpenRunPointer(dir);
  } else {
    dir = readOpenRunPointer()
      || fail(`no ${flow().label} run is open: ${openRunPointerPath()} names none, and an advance is an advance OF a run. `
        + `A run is opened by ${flow().startLine}, which writes that pointer; `
        + `the pointer is removed when the run reaches its terminal. Nothing was written (kogaki#1027).`);
  }
  const tablePath = args.workflow ? String(args.workflow) : flow().tablePath;
  const table = loadWorkflowTable(tablePath);

  // THE DETACHED-JOB VERBS RIDE `run --status` (kogaki#1193), because that is
  // the one shape `.claude/hooks/gate-terrain-executor.py` admits from a Bash
  // command — the hook's own `admitted()` reads `args[0] === "run"` and
  // `"--status"` present and nothing about `--job`. `status` and `await` are
  // the two verbs a session can reach this way; `start` and `stop` are refused
  // by the flow's own `jobWork`, because both run in-process from a
  // hook-driven advance and neither is a read. A flow that declares no
  // `jobWork` (Terrain's own) has no detached-job states and `--job` names
  // nothing on it.
  if (args.status && args.job) {
    if (!flow().jobWork) {
      fail(`${flow().label} declares no detached-job work, so \`--job ${args.job}\` names nothing here (kogaki#1193).`);
    }
    return flow().jobWork(dir, String(args.job), table, tablePath, args);
  }
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
      fail(`--${dead} is DELETED (kogaki#1027). The ${flow().label} executor is invoked by hooks only: `
        + `it is started by ${flow().startLine} and advanced inside the PostToolUse hook for the `
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
      // RECORDED REPO-RELATIVE, READ REPO-RELATIVE (PR #671 rounds 1 and 2). Read with
      // `resolve(REPO, …)`: the exact inverse of `relFromRepo`, correct for absolute /tmp
      // paths and repo-relative ones, independent of cwd.
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
      // THE JUDGMENT-RETRY GATE ANSWERS ITSELF, RATHER THAN THROUGH THE
      // GENERIC WAIT-ANSWER APPLICATION BELOW (kogaki#1172 item 3). The
      // generic path calls `completeState`, which would mark the JUDGMENT
      // STATE complete on a "retry" click — the one thing that must NOT
      // happen, because the whole point of "retry" is that the state is
      // re-entered by the ordinary table loop on the next advance. "abandon"
      // has no state to complete at all: it ends the run.
      if (owed.gate_id === JUDGMENT_RETRY_GATE_ID) {
        const retryState = rec.awaiting;
        rec.owner_input[retryState] = capOption !== null ? capOption : capFree;
        rec.awaiting = null;
        try { rmSync(join(openGateDir(), `${decl.gate_instance_id}.json`), { force: true }); } catch { /* a stale pointer costs a re-render, never an answer */ }
        if (capOption === "abandon") {
          // THE OPEN-RUN POINTER IS CLEARED, AND `done` IS SET (kogaki#1172
          // item 3's acceptance 4). `done: true` is reused rather than a new
          // field invented beside it: `mostRecentDoneRun` already reads it to
          // tell an owner starting a fresh run that a prior one is over, and
          // that reading is exactly true of an abandoned run too — it will
          // not be resumed by anything, `start` included.
          rec.done = true;
          rec.judgment_abandoned = { state: retryState, at: new Date().toISOString() };
          clearOpenRunPointer();
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the run is ABANDONED at ${retryState}; the open-run pointer is cleared and nothing further is asked.`);
        } else {
          // "retry", or any free-text answer -- retried by default, since
          // abandon is the one way to stop and is named as its own option
          // rather than left to a wording guess over free text.
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the judgment at ${retryState} is RE-ASKED; the state was never marked complete, so the advance below re-enters it (kogaki#1172).`);
        }
      } else if (owed.gate_id === READER_PATH_JOB_GATE_ID) {
        // THE ARM ANSWERS ITSELF, ON THE SAME GROUND `JUDGMENT_RETRY_GATE_ID`
        // DOES ONE ROW UP (kogaki#1193). `stop` ends the RUN, and "stop" always
        // means the open-run pointer clears, never that one judgment retries.
        const jobState = rec.awaiting;
        rec.owner_input[jobState] = capOption !== null ? capOption : capFree;
        rec.awaiting = null;
        try { rmSync(join(openGateDir(), `${decl.gate_instance_id}.json`), { force: true }); } catch { /* a stale pointer costs a re-render, never an answer */ }
        if (capOption === "stop") {
          rec.done = true;
          rec.reader_path_job_stopped = { state: jobState, at: new Date().toISOString() };
          clearOpenRunPointer();
          // THE STOP FLAG IS WHAT THE SUPERVISOR ITSELF POLLS (kogaki#1193):
          // without it a still-running supervisor process would carry on to its
          // own ceiling or stall rather than ending promptly on the owner's
          // click. Best-effort kill of the recorded pid alongside it, since the
          // flag alone still costs one heartbeat's delay.
          // A JOB KEPT IN ITS OWN DIRECTORY (kogaki#1301's path-review job) is
          // named on the run record by the state that started it.
          const jobDir = rec.detached_job_dirs && rec.detached_job_dirs[jobState] ? join(dir, rec.detached_job_dirs[jobState]) : dir;
          try { writeFileSync(readerPathJobStopFlagPath(jobDir), `${new Date().toISOString()}\n`); } catch { /* the record is the truth; the flag is only a nudge */ }
          try {
            const job = readReaderPathJob(jobDir);
            if (job && Number.isInteger(job.supervisor_pid)) process.kill(job.supervisor_pid, "SIGTERM");
          } catch { /* already gone, or never ours to signal */ }
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the reader-path job at ${jobState} is STOPPED; the run is not resumed and the open-run pointer is cleared.`);
        } else {
          // ANY OTHER ANSWER (a free-text one): nothing is acted on, the state
          // was never marked complete, and the advance below re-enters
          // `compose_path`, which reads the job record again.
          console.log(`Answer read from ${capPath} (gate ${owed.gate_id}, instance ${decl.gate_instance_id}, AskUserQuestion ${captured.toolUseId}) — the answer at ${jobState} is not stop, so nothing is acted on; the advance below re-enters the state and reads the job record again.`);
        }
      } else {
        // AN OPTION THE DECLARATION ROUTES NOWHERE IS CAPTURED AND THEN REFUSED (PR #898 round 1).
        // Capture first, refuse after; never advance. Routing is data in `src/gate-registry.json`.
        // The wait stays outstanding (`rec.awaiting` untouched; refusal persists per kogaki#808),
        // so re-entering re-offers the same gate.
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
  }

  // ---- The advance. Order, kind, conditionality and stopping all come from
  // the table; nothing below names a state.
  // Every conditional state is SKIPPED and recorded so (kogaki#1027 item 5). TRIM_RATIFICATION
  // is unreachable until a child of kogaki#1025 makes its condition computable;
  // CLAIM_REOFFER was deleted by kogaki#1030.
  const entered = new Set();
  let stopped = null;
  // SURVIVES THE LOOP, UNLIKE `detachedJobStarted` ITSELF (kogaki#1193 PR
  // #1195 review round 1, finding 3). The generic `rec.awaiting === stopped.id`
  // read after the loop cannot otherwise tell a spent judgment bound from a
  // detached job that merely started or is still running — both set
  // `rec.awaiting = st.id` and `stopped = st` — and printed the judgment-retry
  // sentence on a `compose_path` start, naming a gate ("terrain-judgment-retry")
  // this state never raises.
  let stoppedForDetachedJob = false;
  // AN ABANDONED RUN ENTERS NO FURTHER STATE (kogaki#1172 item 3). The
  // pre-loop block above already applied the owner's "abandon" answer — set
  // `rec.done`, recorded `rec.judgment_abandoned` and cleared the open-run
  // pointer — and this is what stops the loop from immediately re-entering
  // the very judgment state that answer was about.
  for (const st of (rec.judgment_abandoned ? [] : table.states)) {
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
        // AND THE EXECUTOR COMPOSES IT (kogaki#625 item 1); rendering stays the harness UI's
        // (kogaki#1028). A gate state is a table row PLUS an option composer.
        // With no composer the state still RUNS, stops, and records its declaration owed and
        // unwritten (#625 acceptance item 6; the evolvability fixture's CLOSING_CONFIRMATION).
        const compose = flow().gateWork[st.id];
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

    const work = flow().stateWork[st.id];
    if (!work && kind.needsRenderer) {
      fail(`workflow state ${JSON.stringify(st.id)} is kind ${JSON.stringify(st.kind)} and this runtime has no renderer bound to it. The workflow table: a new state is a table row PLUS a renderer — the executor interprets the table and invents neither a renderer nor a judgment.`);
    }
    // THE AUTHORITY IS HELD FOR THE DURATION OF A WRITING STATE AND NO LONGER
    // (write authority v28, kogaki#681). Scoped by `try/finally` rather than by setting
    // and clearing around the call: a renderer that `fail`s would otherwise
    // leave the authority standing for whatever ran next in the same process.
    let outcome = null;
    let judgmentExhausted = null;
    let detachedJobStarted = null;
    if (work) {
      const held = WRITING_STATE;
      if (st.kind === "write") WRITING_STATE = st.id;
      try { outcome = await work(rec, st, args, table); }
      catch (e) {
        // A JUDGMENT STATE'S SPENT BOUND STOPS HERE, NOT THE PROCESS (kogaki#1172
        // item 3). Caught in this same frame rather than at `invokeJudge`'s own
        // level: the gate this raises names the STATE, and the state loop is
        // the one frame that already has `st`, `dir` and `rec` together without
        // threading them through the judge machinery.
        if (e instanceof JudgmentExhausted) { judgmentExhausted = e; }
        // A DETACHED JOB HAS STARTED OR IS STILL RUNNING (kogaki#1193). Caught
        // in the same frame, on the same ground: the state that started or
        // found the job is the one frame that already has `st` and `dir`
        // together, and the stop below is deliberately gate-less — nothing is
        // owed to the owner yet.
        else if (e instanceof DetachedJobStarted) { detachedJobStarted = e; }
        else { throw e; }
      }
      finally { WRITING_STATE = held; }
    }
    if (detachedJobStarted) {
      // NO GATE DECLARATION. This is the whole difference from
      // `judgmentExhausted` below: a spent judgment bound is something the
      // owner must decide, and a job that has merely started or is still
      // running is not — `job await` is what turns a finished job into
      // either a resumed state (silently, on `done`) or a raised
      // `brief-reader-path-job` gate (on any other terminal state), and
      // both of those happen OUTSIDE this loop, from `job await` itself.
      rec.awaiting = st.id;
      stopped = st;
      stoppedForDetachedJob = true;
      checkpointRun(rec);
      break;
    }
    if (judgmentExhausted) {
      if (rec) {
        rec.judgment_refusals = rec.judgment_refusals || {};
        // OVERWRITES THE ENTRY `invokeJudge`/`invokeJudgePerGroup` ALREADY WROTE
        // for this state with the SAME shape plus the gate's own note — the
        // refusal text is unchanged, and a reader of `judgment_refusals` sees
        // one entry rather than two disagreeing carriers of one fact.
        rec.judgment_refusals[st.id] = {
          ...(rec.judgment_refusals[st.id] || {}),
          refusal: judgmentExhausted.message,
          gate_raised: JUDGMENT_RETRY_GATE_ID,
        };
      }
      const declPath = emitGateDeclaration(dir, JUDGMENT_RETRY_GATE_ID, [], {
        judgment_state: st.id,
        judgment_refusal: judgmentExhausted.message,
      });
      rec.awaiting = st.id;
      rec.gate_declarations_owed.push({ state: st.id, gate_id: JUDGMENT_RETRY_GATE_ID, declaration: relFromRepo(resolve(declPath)) });
      stopped = st;
      checkpointRun(rec);
      break;
    }
    if (st.kind === "write") {
      // A WRITE STATE THAT WROTE NOTHING IS NOT A RENDERER THAT NAMED NO ARTIFACT
      // (PR #667 round 1 finding 2). `{ artifact: <path> }` wrote; `{ artifact: null }` ran
      // and wrote nothing deliberately; returning nothing still FAILS.
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
  // NAMED BESIDE THE NEW RUN, AT THE MOMENT IT HAPPENS (kogaki#1163 acceptance
  // 3). A second `start` over a run that already reached `done` is legitimate
  // — the pointer clears on the way to a terminal by design — but the session
  // that just re-entered the skill is exactly the one that needs told, before
  // it re-asks a question the finished run already answered.
  if (priorDoneRun) {
    // THE RELAY IS GUARDED THE WAY ITS PYTHON TWIN IS (PR #1168 round 1).
    // `done_context` in the advance hook reads `artifacts_written` through
    // `isinstance` on the list and on each entry, because a record this reader
    // cannot trust is not evidence either way; the same relay here threw on a
    // record carrying that field as anything but an array, and it threw inside
    // `start`, AFTER the new run's record had been written.
    const raw = priorDoneRun.rec.artifacts_written;
    const artifacts = (Array.isArray(raw) ? raw : [])
      .filter((a) => a && typeof a === "object")
      .map((a) => `  - ${a.state}: ${a.path}`).join("\n") || "  (none written)";
    console.log(`A previous run in this lane already reached done: ${priorDoneRun.dir}`);
    console.log(`Its artifacts:\n${artifacts}`);
    console.log("");
  }
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
      // BEFORE THE BYTES ARE PRINTED, NOT AFTER (kogaki#1118 acceptance 4). A
      // call written before a label repair is a payload the channel refuses, and
      // printing it hands the session its one admissible act in a form that
      // cannot be performed.
      const refreshedHere = refreshWrittenGateCall(dir, stopped.gate_id);
      if (existsSync(callHere)) {
        console.log(`The AskUserQuestion call is WRITTEN: ${callHere}`);
        console.log(`Send that file's contents as the tool_input, byte-for-byte — it already carries the reading (\`tag_listing\`) above the question. Nothing is retyped, summarized, reformatted or pre-selected, and the executor renders no question UI of its own (the post-tag-selection window).`);
        // AND THE BYTES ARE HERE, NOT ONLY THEIR ADDRESS (kogaki#1057): no tool is admissible
        // inside the open-gate interval, so stdout is the only channel. The file stays the
        // reference for the PreToolUse equality check.
        // ONE SITE, BOTH ENTRIES (kogaki#1057 item 2): re-entry prints through this same branch.
        console.log(`Its bytes are below — the payload itself, not a path to one. No tool is admissible inside the open-gate interval, the Read that would fetch this file included, so a call named and unprinted is one nothing can obtain (kogaki#1057).`);
        console.log("```json");
        console.log(readFileSync(callHere, "utf8").replace(/\n+$/, ""));
        console.log("```");
        if (refreshedHere) {
          console.log(`NOTE: the call written by the earlier stop carried a label the shared question-shape check refuses, so it was recomposed from the declaration's standing options before being printed (kogaki#1118). The bytes above are the refreshed payload and the file on disk matches them; the gate, its instance and its answer join are unchanged. The refusal it cleared: ${refreshedHere.refused.split("\n").filter(Boolean)[0]}${refreshedHere.legacy ? " — the declaration predates `run_composed_option_ids`, so every registered id was refreshed; a run-time option sharing an id with a registered one would have been overwritten, and none was recorded either way." : ""}`);
        }
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
  } else if (stoppedForDetachedJob) {
    // THE DETACHED-JOB STOP (kogaki#1193 PR #1195 review round 1, finding 3).
    // `stopped` is a `judgment` state that opened a Detached Job and raised
    // `DetachedJobStarted` rather than completing or raising a retry gate —
    // the generic `rec.awaiting === stopped.id` branch below cannot tell this
    // apart from the judgment-retry stop, and printed that stop's false text
    // here. This branch is checked first so the job's own state, not a
    // borrowed one, reaches the screen.
    console.log(`Executor STOPPED at ${stopped.id} — a Detached Job was started and is running outside this process (kogaki#1193; \`review_path\`'s since kogaki#1301). The state is NOT complete.`);
    console.log(`Poll it with  ${READER_PATH_JOB_STATUS_COMMAND}  (one-shot) or  ${READER_PATH_JOB_AWAIT_COMMAND}  (waits at most 30 seconds, then says whether the job is still running).`);
  } else if (stopped && rec.awaiting === stopped.id) {
    // THE JUDGMENT-RETRY STOP (kogaki#1172 item 3). `stopped` is a `judgment`
    // state that exhausted its retries and raised `terrain-judgment-retry`
    // rather than completing — the same shape a `wait` leaves, minus the
    // owner_supplies line, because a judgment state declares none.
    console.log(`Executor STOPPED at ${stopped.id} — a judgment exhausted its declared retries (kogaki#1172). It raised the terrain-judgment-retry gate rather than failing the run; the state is NOT complete, so answering "retry" re-enters it.`);
    const owedHere = rec.gate_declarations_owed.find((g) => g.state === stopped.id && g.gate_id === JUDGMENT_RETRY_GATE_ID);
    if (owedHere && owedHere.declaration) {
      console.log(`This stop declares a gate. Its run declaration is WRITTEN: ${owedHere.declaration}`);
      console.log(`Then re-enter with a bare  run --run-dir ${dir}  — the answer is read from the harness's own capture, exactly as at any other gate wait (kogaki#890).`);
    }
  } else if (rec.judgment_abandoned) {
    // THE ABANDON STOP (kogaki#1172 item 3, acceptance 4). The loop above ran
    // zero iterations -- `stopped` is null -- because the owner's "abandon"
    // answer was applied in the pre-loop block before the loop even started.
    console.log(`Run ABANDONED at ${rec.judgment_abandoned.state}, on the owner's answer to terrain-judgment-retry (kogaki#1172). The open-run pointer is cleared; nothing further is asked.`);
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
  // ---- THE DETACHED JOB'S SUPERVISOR ENTRYPOINT (kogaki#1193). Reached only
  // by `startDetachedJobSupervisor`'s own `spawn(process.execPath, [scriptPath,
  // "job-supervise", ...])` -- never by a Bash command a session could type:
  // `.claude/hooks/gate-terrain-executor.py`'s admitted shape is `run --status`,
  // and `job-supervise` is a different `cmd` entirely, not a `--job` value under
  // it.
  case "job-supervise": cmdJobSupervise(args); break;
  case "validate": {
    const record = readJson(String(args.survey || fail("validate needs --survey <file>")));
    const v = validateSurvey(record);
    if (v.length) { v.forEach((line) => console.log(`FAIL ${line}`)); process.exit(1); }
    console.log("survey record conforms (the same rules the registered check applies)");
    break;
  }
  default:
    console.log(`usage: terrain.mjs <start|run|survey|cotags|compose-input|report|validate> [--run-dir DIR] ...
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
       flag is absent INVOKES THE JUDGE ITSELF, using the model src/terrain-workflow.json's
       \`judge\` block pins -- never one inherited from the session -- and retries a
       refused response the number of times that state declares before failing with
       the refusal text. A flag that IS supplied still wins, unchanged.)
                                            THE CONTROL PLANE. One entry point, entered once
                                            per act: reads the run record, executes the states
                                            src/terrain-workflow.json declares until the
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

 At a wait that declares a gate, the executor WRITES the run declaration and names its path.
 Beside it, the byte-fixed gate call the harness renders; the exclusivity hook admits that payload and
 no other (kogaki#1028).
 THE RE-ENTRY IS NOT YOURS TO MAKE: .claude/hooks/advance-terrain.py runs the executor inside the
 PostToolUse hook for that question, after .claude/hooks/write-gate-capture.py has written the
 owner's answer. A Bash command naming this file with any verb but --status is denied.`);
    process.exit(cmd ? 1 : 0);
}
}
