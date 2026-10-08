// Terrain — the composition input and the artifacts written for the owner.
// One stage of the Terrain command, imported only by Terrain's own modules (kogaki#1259).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { homedir } from "node:os";
import { loadGrammar } from "../format-guard.mjs";
import { laneDir } from "../runs.mjs";
import { NO_CLAIM, cotagGroups, emitOrRefuse } from "./cotags.mjs";
import {
  neighborhoodDisplaySet, neighborhoodForTargets, neighborhoodSection, orFail,
  readNeighborhoodJudgments, refuseTargetsOutsideCandidates,
} from "./neighborhood.mjs";
import {
  NO_JUDGE, fetchGlossBodies, judgedEmptyNoticeLines, judgmentProvenance, provenanceOf,
  readClaimsRecord, reportJudgeLine,
} from "./report.mjs";
import {
  SUBDIVISION_REQUIRED_AT, judgeSubgroup, resolveReportTargets, subgroupPlacement,
} from "./subdivide.mjs";
import {
  NEIGHBORHOOD_GLOSS_NAMESPACES, NO_DISPLAY_ID, SURVEY_SCHEMA, compareDisplayIds, denominator,
  displayIdOf, familySplit, sectionFigure, strandFigure,
} from "./survey.mjs";
import { WRITING_STATE } from "../workflow/executor.mjs";
import { COMPOSITION_INPUT_BOUND, composeInput } from "../workflow/judge.mjs";
import { REPORT_FORMAT, fail, readJson, relFromRepo, repoRoot, runDir } from "../workflow/run-record.mjs";
import { NO_GLOSS_BODY, glossFor, resolveHeadlines } from "../workflow/strands.mjs";

export function cmdComposeInput(args) {
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

const DISPLAY_RENDERING = "CoTagGroups.md";

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
export function writeDisplaySurface(args, surface, text) {
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
export function announceDisplay(path) {
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
export function resolveEnteredIds(entered, groups, subOf) {
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
    // THE ID IS MINTED HERE, POSITIONALLY, BEFORE THE NEIGHBORHOOD IS JUDGED (kogaki#861, owner
    // ruling 2026-09-05): J3's targets are checked against this set, so it must be fixed first.
    // (product-lab@ab04cc9bca21a600cd9eb0a594619d3ca899d05f topics/claude-code-ops.md:24)
    // Never read an id from the input; later readers re-mint the same ids from the same order.
    return { id: `TC${i + 1}`, claim, strands: [...strands] };
  });
}

export function cmdReport(args) {
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
