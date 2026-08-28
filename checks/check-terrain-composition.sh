#!/usr/bin/env bash
# Terrain's three ported contracts, made checkable (manifest item 1,
# specs/SPEC.md §5; kogaki#14 umbrella, kogaki#17 story 1.8).
#
# Validates every Terrain survey record (*.terrain-survey.json, anywhere in
# the tree) against specs/spec-terrain/survey-schema.json — the single
# carrier, whose field lists this check READS rather than restates:
#   1. completeness is a COVER counted in placements — every Strand placed,
#      no-relation Strands in an explicit named section, nothing silently
#      dropped (SPEC.md §2.1);
#   2. the figure is counted AFTER composition, over placements, recomputed
#      here from the placements themselves, and it NAMES which family it
#      counted — a bare count is a defect (SPEC.md §2.1);
#   3. navigation state carries no narrowing key — sections gate nothing
#      (SPEC.md §2.2/§2.3); a narrowing key in a survey record is the
#      refused minimal-form bundling arriving as a field.
# Plus: every record carries the pin the seam returned (SPEC.md §3).
#
# Schema v2 (kogaki#26/#27, story 1.22) extends the same three contracts to
# SPEC.md §5's candidate model and §9's family-named figures — no new contract
# and no new admission, since this check is already registered with its
# admission record and removal signal and its loop position is unchanged:
#   - rows are LESSONS ONLY and a Journey is a MARK on its Lesson's row
#     (CANDIDATE_NOT_A_LESSON);
#   - a Journey matching no Lesson is falsifier 1 and refuses the record
#     (JOURNEY_ORPHAN, §5.2 — a generation-time refusal, mirrored here);
#   - the per-section family split lives in the RECORD and is recomputed from
#     the placements it claims to count, refused on mismatch through the
#     EXISTING FIGURE_MISMATCH path (the fill of
#     `deferred-slot: terrain-family-split-carrier` with alternative (a),
#     owner decision 2026-08-06, SPEC.md §9).
# The recompute algorithm below is the SECOND copy — terrain/terrain.mjs
# familySplit is the first. §9 records that the single-carrier clause covers
# survey-schema.json's field lists and NOT this algorithm, and that (a)
# extends both halves; collapsing them is not licensed.
#
# What this check does NOT carry is stated in its own output: whether the
# grouping axis serves the owner, whether section names are honest, and
# whether a proposal's narrowing was worth ratifying are JUDGMENTS and route
# to the review lane (kogaki#13, story 1.5). An unstated omission reads as
# coverage. Terrain's runtime applies these same rules BEFORE writing
# (terrain/terrain.mjs validateSurvey) — this check is the detection half
# behind that constrained generation, and the fixture pass is the evidence
# both halves discriminate.
#
# Reporting obeys the three-part remedy: guard the crash, report a crash AS
# a crash (CANNOT-DETERMINE, never a finding), disclose repetition.
set -euo pipefail
cd "$(dirname "$0")/.."

# §12.2 v12 — the tree holds ONE owner rendering (reports/FullReport.md,
# overwritten per pull). Every fixture run below that is not explicitly
# exercising the DEFAULT rendering location renders into this throwaway
# directory instead, so a check run can never replace the owner's report with
# fixture material. The two defaults-under-test blocks delete this variable
# from their spawn env and save/restore the real file around their runs.
KOGAKI_REPORTS_DIR="$(mktemp -d "${TMPDIR:-/tmp}/terrain-check-renderings.XXXXXX")"
export KOGAKI_REPORTS_DIR
trap 'rm -rf "$KOGAKI_REPORTS_DIR"' EXIT

# NOTE ON CASE COUNTS (kogaki#145). These blocks used to close with a hand-
# written "N/N cases" fraction. The number was compared to nothing, so it
# attested to nothing and drifted every time a case was added — the last count
# read 12 over 17 assertion sites. It is REMOVED rather than computed: a
# counter would have to be incremented at every assertion site, which is the
# same hand-maintenance one layer down, and a wrong count is worse than none
# because it reads as a measurement. What each block still carries is the
# ENUMERATION of what it exercised, which is checkable against the block by
# reading it and cannot silently disagree with a number.
#
# --- cotags fixture (kogaki#105, story 1.23) --------------------------------
# THE COMPOSER IS JAVASCRIPT, SO IT GETS A JAVASCRIPT FIXTURE. Same shape as
# check-boundary-receipts.sh's shell fixture for its shell resolver: it runs on
# every invocation, needs no network, and is not behind a flag, because a
# fixture behind a flag is one nobody runs.
#
# It covers what the python pass structurally cannot see. That pass validates
# SURVEY RECORDS, and the cotags step writes no record of any kind — so before
# this block, nothing in the committed suite exercised `cotags` at all, and the
# `(no second served tag)` group and the declared sort were observable only to
# whoever ran the command by hand. That is the state #105's Review Focus names.
#
# No new admission is owed: this extends an ALREADY-REGISTERED check with
# coverage of the same subsystem's same three contracts, inheriting its
# admission record, tier and removal signal — the served position on extending
# a registered check rather than minting one (consulted at kogaki#113, receipt
# on master).
#
# BOTH DIRECTIONS OF THE COVER GUARD ARE FIRED. The passing direction alone
# would leave `cotagCover`'s refusal in exactly the condition PR #123's review
# found it in: present, correct-looking, and unreachable.
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cotagGroups, cotagCover, NO_SECOND_TAG, COTAG_SORT, NO_CLAIM, subgroupPlacement }
  from "./terrain/terrain.mjs";
import { spawnSync } from "node:child_process";

const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const TAG = "testing";
const record = JSON.parse(readFileSync(FIXTURE, "utf8"));
const members = record.candidates.filter((c) => (c.tags || []).includes(TAG));

const fails = [];
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) fails.push(`${label}: got ${g}, want ${w}`);
};

const groups = cotagGroups(members, TAG);

// 1. The lone-tag member lands in the explicit group rather than being dropped.
const lone = groups.find((g) => g.cotag === NO_SECOND_TAG);
if (!lone) fails.push(`no ${JSON.stringify(NO_SECOND_TAG)} group composed, though lesson:delta carries ${JSON.stringify(TAG)} and nothing else`);
else eq("the (no second served tag) group's members", lone.members, ["lesson:delta"]);

// 2. The DECLARED sort, both axes, asserted as values rather than as prose.
//    COTAG_SORT is quoted so a change to the declaration that the ordering does
//    not follow fails here rather than reading as documentation drift.
eq(`group order — ${COTAG_SORT}`, groups.map((g) => g.cotag),
   [NO_SECOND_TAG, "architecture", "cost"]);
eq("member order inside a multi-member group (id ascending)",
   (groups.find((g) => g.cotag === "architecture") || {}).members,
   ["lesson:alpha", "lesson:bravo"]);
eq("group names carry the `<tag> × <co-tag>` form",
   groups.map((g) => g.name).slice(1, 2), [`${TAG} × architecture`]);

// 3. The cover guard, PASSING direction: a faithful composition covers.
const ok = cotagCover(members, groups);
eq("cover over a faithful composition — uncovered", ok.uncovered, []);
eq("cover over a faithful composition — invented", ok.invented, []);
eq("cover size", ok.covered.size, members.length);

// 4. The cover guard, FAILING directions. These are the cases that were
//    unreachable before the guard took its group list as a parameter.
const dropped = groups.map((g) => ({ ...g, members: g.members.filter((m) => m !== "lesson:charlie") }));
eq("a composition that DROPPED a member is caught",
   cotagCover(members, dropped).uncovered, ["lesson:charlie"]);
const stranger = groups.map((g, i) => (i === 0 ? { ...g, members: [...g.members, "lesson:echo"] } : g));
eq("a composition that ADDED a non-member is caught",
   cotagCover(members, stranger).invented, ["lesson:echo"]);
eq("a composition that dropped one and gained one is caught on BOTH counts",
   [cotagCover(members, dropped.map((g, i) => (i === 0 ? { ...g, members: [...g.members, "lesson:echo"] } : g))).uncovered,
    cotagCover(members, dropped.map((g, i) => (i === 0 ? { ...g, members: [...g.members, "lesson:echo"] } : g))).invented],
   [["lesson:charlie"], ["lesson:echo"]]);

// 5. The wiring, end to end: the composers above are what the subcommand runs.
//    A unit that passes while nothing invokes it is the orphan shape.
const run = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG],
  { encoding: "utf8" });
if (run.status !== 0) fails.push(`cotags --tag ${TAG} exited ${run.status}: ${(run.stderr || "").trim()}`);
for (const want of [NO_SECOND_TAG, `Cover: ${members.length} of ${members.length}`, "counted AFTER composition"]) {
  if (!String(run.stdout).includes(want)) fails.push(`the rendered step does not carry ${JSON.stringify(want)}`);
}

// 6. GroupClaim-first rendering AT the screen (kogaki#128, story 1.29 — §6.1).
//    Each assertion below is written against the DEFECT it discriminates, not
//    against the feature: the v2 screen emitted member ids only under --group,
//    composed no claim at all, and had no way to say a claim was missing.
// §14.3 (story 1.53) — the screen names members by display_id, never by
// `lesson:<slug>`. The defect this discriminates is unchanged (v2 emitted no
// member ids at all without --group); only the token it looks for moved.
const idsWithoutGroup = members.every((m) => String(run.stdout).includes(m.display_id));
if (/lesson:[a-z]/.test(String(run.stdout))) {
  fails.push("an element name (`lesson:<slug>`) reached the co-tag screen — SPEC.md §14.3: no owner surface renders an element name, the rendered token is the display_id");
}
if (!idsWithoutGroup) {
  fails.push("member Lesson IDs do not all appear WITHOUT --group — this is kogaki#128's specific defect, and a screen with no visible ids fails Terrain's purpose regardless of what else it shows (§6.1)");
}
// A screen with no claims supplied must SAY so, per group and in aggregate.
// A missing claim that rendered as blank is indistinguishable from a group
// whose members share nothing, which is the substitution §6.1 forbids.
if (!String(run.stdout).includes(NO_CLAIM)) {
  fails.push("a group with no composed GroupClaim does not carry the ABNORMAL marker — a missing claim must be marked, never substituted (§6.1)");
}
if (!/ABNORMAL: 3 of 3 group\(s\)/.test(String(run.stdout))) {
  fails.push("the claimless aggregate is not stated — a per-group marker with no total lets a screen be mostly claimless without saying so (§6.1)");
}

// Claims supplied: served FIRST, and the pinning stated where the claim is.
// §11 v10 typed claims record (kogaki#212): the composition pin travels WITH
// the claims, carrying the member set `compose-input` served per group.
const SURVEY_PIN = JSON.parse(readFileSync(FIXTURE, "utf8")).pin;
const SERVED = {
  [`${TAG} × (no second served tag)`]: ["lesson:delta"],
  [`${TAG} × architecture`]: ["lesson:alpha", "lesson:bravo"],
  [`${TAG} × cost`]: ["lesson:charlie"],
};
const pinFor = (groups) => ({ tag: TAG, pin: SURVEY_PIN, groups });
const CLAIMS = join(tmpdir(), `cotags-claims-${process.pid}.json`);
writeFileSync(CLAIMS, JSON.stringify({
  composition_pin: pinFor(SERVED),
  claims: {
    [`${TAG} × architecture`]: "both hold that a guard is only real once something exercised it",
  },
}));
const withClaim = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", CLAIMS],
  { encoding: "utf8" });
if (withClaim.status !== 0) fails.push(`cotags --claims exited ${withClaim.status}: ${(withClaim.stderr || "").trim()}`);
const claimLines = String(withClaim.stdout).split("\n");
const claimAt = claimLines.findIndex((l) => l.includes("in common: both hold that a guard"));
// §6.1 v6 — the heading is found by its GroupID, flush left, not by the co-tag
// name and not by indentation. The name now trails the counts as a label.
const groupAt = claimLines.findIndex((l) => /^G[0-9]+ — /.test(l) && l.includes(`${TAG} × architecture`));
if (claimAt < 0 || groupAt < 0 || claimAt !== groupAt + 1) {
  fails.push("the GroupClaim is not served immediately under its group heading — §6.1 v5's order (heading line, then the claim)");
}
// §6.1 v5's heading form: the heading LINE carries the Lesson count and the
// member IDs — `<GroupID> — N Lessons: ids` — with the claim beneath. The v3
// members-after-claim order is superseded by the WA baseline's heading form.
const heading = claimLines[groupAt] || "";
// The two ids render in the declared member sort (id ascending: alpha, bravo),
// which is L2 then L1 in this fixture — display_id is minted in served-corpus
// order and the sort is by id, so the two orders are deliberately independent.
// v6: `G<n> — N Lessons: ids — <co-tag name>`, flush left. The two ids render
// in the declared member sort (id ascending: alpha, bravo) = L2 then L1.
if (!/^G[0-9]+ — .+ — 2 Lessons: L2, L1$/.test(heading)) {
  fails.push(`the group heading is not the §6.1 v6 flush-left form \`G<n> — <co-tag name> — N Lessons: ids\` — got ${JSON.stringify(heading)}`);
}
if (!String(withClaim.stdout).includes("pinned to 2 member(s)")) {
  fails.push("a screen-composed claim does not state the member set it is pinned to — §7's pinning is what makes a later subset selection a gate event rather than a refresh");
}
// A claim naming no composed group is refused: composition may attach text to
// a group and may do nothing else.
const BADCLAIMS = join(tmpdir(), `cotags-badclaims-${process.pid}.json`);
// The pin DECLARES the invented group, so this case still reaches §6.1's
// refusal rather than being intercepted by §11 v10's subset check. Without
// that, the fixture would pass for the wrong reason — a live instance of the
// dead-fixture class story 1.36 exists to catch, created by this very change.
writeFileSync(BADCLAIMS, JSON.stringify({
  composition_pin: pinFor({ ...SERVED, "testing × nonesuch": [] }),
  claims: { "testing × nonesuch": "invented" },
}));
const badClaim = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", BADCLAIMS],
  { encoding: "utf8" });
if (badClaim.status === 0) {
  fails.push("a --claims entry naming no composed group was ACCEPTED — a claim carries no selection authority and may not invent a group (§6.1)");
} else if (!/no composed group/.test(String(badClaim.stderr))) {
  fails.push("the invented-group refusal was reached by the WRONG guard — this case must exercise §6.1, not §11's subset check");
}

// --- §11 v10 / kogaki#212: the composition-pin guard, BOTH directions -------
// AC6 is explicit that a fixture demonstrating only acceptance does not
// discharge it, so the conformant path and the refusal are asserted as a pair,
// and the refusal is asserted to NAME the member that fell outside — which is
// the whole reason the pin carries the served set rather than a digest.

// 1. CONFORMANT: a claim composed over a SUBSET of the served members is
//    normal work and must be accepted. This is why the check is subset rather
//    than equality — equality would forbid a legitimate composition.
const SUBSETCLAIMS = join(tmpdir(), `cotags-subset-${process.pid}.json`);
writeFileSync(SUBSETCLAIMS, JSON.stringify({
  composition_pin: pinFor(SERVED),
  claims: { [`${TAG} × cost`]: "a claim over one of the served groups" },
}));
const subsetOk = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", SUBSETCLAIMS],
  { encoding: "utf8" });
if (subsetOk.status !== 0) {
  fails.push(`a claim over a SUBSET of the served groups was refused — subset is legitimate composition, and an equality check would forbid it: ${String(subsetOk.stderr).trim().slice(0, 160)}`);
}

// 2. REFUSED, AND THE OFFENDER NAMED: a group whose composed membership
//    exceeds what compose-input served is the session that took the pin and
//    composed from the whole survey anyway.
const OUTSIDECLAIMS = join(tmpdir(), `cotags-outside-${process.pid}.json`);
writeFileSync(OUTSIDECLAIMS, JSON.stringify({
  composition_pin: pinFor({ ...SERVED, [`${TAG} × architecture`]: ["lesson:alpha"] }),
  claims: { [`${TAG} × architecture`]: "composed over a member the bounded read never served" },
}));
const outside = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", OUTSIDECLAIMS],
  { encoding: "utf8" });
if (outside.status === 0) {
  fails.push("a claim composed OUTSIDE the bounded read was accepted — the subset relation is what makes composing from the whole survey unproducible (§11 v10)");
} else if (!/lesson:bravo/.test(String(outside.stderr))) {
  fails.push("the out-of-bound refusal did not NAME the offending member — a digest could refuse but not name, which is why the pin carries the served set (§11 v10)");
}

// 3. A BARE MAP is refused by name, as §12.1 v9 refuses the withdrawn bare
//    array — so a stale composer fails loudly rather than silently.
const BAREMAP = join(tmpdir(), `cotags-baremap-${process.pid}.json`);
writeFileSync(BAREMAP, JSON.stringify({ [`${TAG} × cost`]: "no provenance at all" }));
const bare = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", BAREMAP],
  { encoding: "utf8" });
if (bare.status === 0) {
  fails.push("a BARE {group: claim} map was accepted — the withdrawn pre-v10 form must be refused by name (§11 v10)");
} else if (!/bare \{group: claim\} map/.test(String(bare.stderr))) {
  fails.push("the bare-map refusal did not NAME the defect — a refusal that does not say what to write instead sends the composer guessing");
}

// 4. AC4 — the pin BINDS the survey record it was computed against. A stale
//    pin must not become a confident wrong acceptance.
const STALEPIN = join(tmpdir(), `cotags-stalepin-${process.pid}.json`);
writeFileSync(STALEPIN, JSON.stringify({
  composition_pin: { tag: TAG, pin: "product-lab@0000000000000000000000000000000000000000", groups: SERVED },
  claims: { [`${TAG} × cost`]: "composed against a different survey" },
}));
const stale = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", STALEPIN],
  { encoding: "utf8" });
if (stale.status === 0) {
  fails.push("a composition pin computed against a DIFFERENT survey was accepted — a stale pin must not become a confident wrong acceptance (§11 v10 AC4)");
}

// 7. SubGroups on the screen (kogaki#128, story 1.29 — §6.2), and the cover
//    they inherit: a member the judge leaves unplaced is NAMED, never dropped.
const SUBS = join(tmpdir(), `cotags-subs-${process.pid}.json`);
writeFileSync(SUBS, JSON.stringify({
  // §12.1 v9 typed record (kogaki#199): the judgment is STATED, never inferred
  // from an array's truthiness.
  [`${TAG} × architecture`]: { judged: true, subgroups: [
    { subgroup: "guards that cannot fail", claim: "a check whose inputs make failure unreachable",
      members: ["lesson:alpha"], composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
    // BOTH members are placed, and that is a CHANGE story 1.57 forced rather
    // than a tidy-up. This fixture used to place `alpha` and leave `bravo` in
    // the remainder — 1 of 2, a 50% catch-all — which `catch_all_share` now
    // refuses (kogaki#316 decision 2). The fixture encoded exactly the
    // judgment shape the owner decision was filed against.
    //
    // THE CAP HAS NO FLOOR AND NONE CAN BE ADDED, which is why the fixture
    // moved rather than the rule: a minimum-group-size before the cap applies
    // IS a member-count threshold, and §8 forbids one — the same §8 clause
    // kogaki#316 explicitly reaffirms. So a 2-member group with one member in
    // the remainder is 50% and is refused, arithmetically correct and a long
    // way from the 29-of-35 specimen that settled the number. Recorded here
    // rather than worked around.
    { subgroup: "guards exercised by a real run", claim: "a check some run has actually made fail",
      members: ["lesson:bravo"], composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
  ] },
}));
const withSubs = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", CLAIMS,
   "--subdivisions", SUBS, "--judge-model", "m", "--judge-effort", "high"],
  { encoding: "utf8" });
if (withSubs.status !== 0) fails.push(`cotags --subdivisions exited ${withSubs.status}: ${(withSubs.stderr || "").trim()}`);
if (!String(withSubs.stdout).includes("guards that cannot fail")) {
  fails.push("the SubGroup does not render on the screen (§6.2)");
}
if (!String(withSubs.stdout).includes("in common: a check whose inputs make failure unreachable")) {
  fails.push("the SubGroupClaim does not render beneath its SubGroup line (§6.2 v5)");
}
// §6.2 v5's line form: `<SubGroupID> (N Lessons: ids)`, claim on the next line.
// §6.2 v6 — `G<n>-<m> — N Lessons: ids — <name>`; the parenthesised count form
// went with the indentation, since the level is in the id now.
if (!/^G[0-9]+-[0-9]+ — 1 Lesson: L2 — guards that cannot fail$/m.test(String(withSubs.stdout))) {
  fails.push("the SubGroup line is not the §6.2 v6 form `G<n>-<m> — N Lessons: ids — <name>` — the SubGroupID must name its parent, which is what lets a wrapped line still say where it belongs");
}
// The unplaced-member-is-NAMED property moved off this end-to-end run and onto
// `subgroupPlacement` directly, because the fixture can no longer leave a
// member unplaced without violating the 30% cap (see the note above). Same
// property, asserted at the unit that owns it rather than through a screen
// that must now be conformant to render at all.
{
  const parent = { name: "p", gid: "G1", members: ["lesson:alpha", "lesson:bravo"] };
  const placed = subgroupPlacement(parent,
    [{ subgroup: "only alpha", claim: "c", members: ["lesson:alpha"],
       composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true }],
    JSON.parse(readFileSync("specs/spec-terrain/survey-schema.json", "utf8")).subdivision);
  const catchAll = placed.subgroups.find((sg) => sg.name === "(fits no composed SubGroup)");
  if (!catchAll) {
    fails.push("a member the judge left unplaced produced NO explicit catch-all SubGroup — subdivision decides WHERE a member appears and hides none (§8)");
  } else if (!catchAll.members.includes("lesson:bravo")) {
    fails.push("the unplaced member was DROPPED rather than named in the explicit catch-all SubGroup (§8)");
  }
}

// 8. The prohibition §8 states and §6.2 inherits: no member-count threshold.
//    Read against the source, because the property is the ABSENCE of a number
//    and no run can observe an absence by executing.
// The unit is EVERY function the split decision passes through, not one source
// slice. kogaki#133's finding 5: the earlier guard read only `cmdCotags`, so a
// threshold in `subgroupPlacement` — where the split logic actually lives —
// was outside the slice it claimed to cover.
const SRC = readFileSync("terrain/terrain.mjs", "utf8");
const sliceOf = (fn) => {
  const i = SRC.indexOf(fn);
  if (i < 0) { fails.push(`the no-threshold guard cannot find ${fn} — its unit has drifted from the code`); return ""; }
  const rest = SRC.slice(i + fn.length);
  const end = rest.indexOf("\n// ---");
  return rest.slice(0, end < 0 ? rest.length : end);
};
for (const fn of ["function cmdCotags(", "export function subgroupPlacement(", "export function judgeSubgroup("]) {
  const src = sliceOf(fn);
  const m = src.match(/\.length\s*[<>]=?\s*\d+|\d+\s*[<>]=?\s*[a-zA-Z_$][\w$]*\.length/);
  if (m) fails.push(`${fn.trim()} compares a member count against a numeric constant (${m[0]}) — kogaki#128's "five or more" is calibration evidence, and a threshold here is a defect against §8 and §6.2`);
}
// WHAT THIS GUARD CANNOT SEE, stated rather than implied. §8 declares the
// member-count prohibition deliberately carrier-less with a reopen trigger, so
// this narrows the gap and does not close it: a threshold written as a NAMED
// CONSTANT, or compared against a variable holding the count, passes the
// pattern above. A guard silently narrower than the property it names is the
// appearance half of "a check that cannot fail is theatre".
console.log("no-threshold guard: covers literal `<count> <op> <digits>` comparisons in "
  + "cmdCotags, subgroupPlacement and judgeSubgroup. NOT covered: a named constant, or a "
  + "comparison against a variable holding the count — §8's prohibition stays "
  + "declared carrier-less, and this narrows the gap rather than closing it.");

// The fixture's verdict fields are READ by the code under test (finding 4).
// Written the other way, a case supplying composes_honestly / tighter_than_parent
// that nothing reads presents as covering the leaf condition while covering
// only rendering — so the assertion flips a verdict and requires the output to
// change with it.
const SUBS_NOT_LEAF = join(tmpdir(), `cotags-subs-notleaf-${process.pid}.json`);
writeFileSync(SUBS_NOT_LEAF, JSON.stringify({
  [`${TAG} × architecture`]: { judged: true, subgroups: [
    { subgroup: "guards that cannot fail", claim: "a check whose inputs make failure unreachable",
      members: ["lesson:alpha"], composes_honestly: true, tighter_than_parent: false, legible_at_a_glance: true },
  ] },
}));
const notLeaf = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", CLAIMS,
   "--subdivisions", SUBS_NOT_LEAF, "--judge-model", "m", "--judge-effort", "high"],
  { encoding: "utf8" });
if (!String(withSubs.stdout).includes("leaf: the claim composes honestly AND is tighter")) {
  fails.push("the screen does not render the SubGroup's LEAF VERDICT — §6.2 requires the screen to judge, not merely render");
}
// Asserted on the string UNIQUE to the judge-supplied SubGroup, not on
// "the split bought nothing". `subgroupPlacement` appends the unplaced-members
// SubGroup with `tighter_than_parent: false`, so that phrase is present
// whatever the flipped verdict says — an assertion that could not fail, added
// while closing the class of assertions that cannot fail.
if (!String(withSubs.stdout).includes("leaf: the claim composes honestly AND is tighter")) {
  fails.push("the judge-supplied SubGroup's LEAF verdict does not render when both conjuncts hold (§6.2)");
}
if (String(notLeaf.stdout).includes("leaf: the claim composes honestly AND is tighter")) {
  fails.push("flipping tighter_than_parent to false did NOT change the screen's verdict — the fixture supplies verdicts the code does not read, which presents as covering the leaf condition while covering only rendering");
}
if (!String(withSubs.stdout).includes("judged by m / high")) {
  fails.push("the screen does not record its judge pin (§6.2)");
}
const noPin = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", CLAIMS, "--subdivisions", SUBS],
  { encoding: "utf8" });
if (noPin.status === 0) {
  fails.push("the screen served SubGroups with NO judge pin — a judged surface that records no judge cannot be seen to drift (§6.2)");
}
// A disclosure fires and is rendered (§6.2, §8) — disjunctive, gating nothing.
const SUBS_DEGEN = join(tmpdir(), `cotags-subs-degen-${process.pid}.json`);
writeFileSync(SUBS_DEGEN, JSON.stringify({
  [`${TAG} × architecture`]: { judged: true, subgroups: [
    { subgroup: "sg", claim: "this claim names alpha outright", members: ["lesson:alpha"],
      composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
    // Both members placed, for the same reason as the block above: a 1-of-2
    // remainder is a 50% catch-all and `catch_all_share` refuses the screen,
    // so a fixture exercising a DISCLOSURE could no longer reach the surface
    // it discloses on.
    { subgroup: "sg2", claim: "a second claim that names nobody", members: ["lesson:bravo"],
      composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
  ] },
}));
const degen = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", CLAIMS,
   "--subdivisions", SUBS_DEGEN, "--judge-model", "m", "--judge-effort", "high"],
  { encoding: "utf8" });
if (!String(degen.stdout).includes("DISCLOSURE — degenerate-claim")) {
  fails.push("the degenerate-claim disclosure does not render on the screen (§6.2, §8)");
}

// AC 7's carrier (finding 3): the flat slug dump has no literal section in the
// runtime — it was produced by the skill routing a tag selection to a second
// `view --tag`. So the absence is observed on BOTH sides: the co-tag screen
// emits no such section, and the skill names the co-tag step as where a tag
// selection lands.
if (/All \d+ Lesson slugs|in served order/.test(String(withSubs.stdout) + String(run.stdout))) {
  fails.push("the co-tag screen emits a flat slug listing — §6.1 removes it, and the members are served grouped instead");
}
const SKILL = readFileSync(".claude/skills/terrain/SKILL.md", "utf8");
if (!/cotags --survey/.test(SKILL)) {
  fails.push("the skill's flow does not name the co-tag step — its absence is what routed a tag selection to a second `view --tag` and produced the dump (§6.1)");
}
// §11 decided EAGER (v5, kogaki#146): the co-tag step generates the Full
// Reports in the same act. The 2026-08-06 defect was a flow that served the
// screen and generated nothing, so the flow naming the eager act is the
// carrier at the layer where it was broken.
// §11 v5 / §12 v6 (kogaki#314) SUPERSEDES the eager reading this once pinned.
// The old assertion required the skill to name `--all-groups`, a flag that now
// REFUSES — a check pinning the superseded contract, the same shape story 1.55
// found in this file's `SERVED VERBATIM` guard. The superseded spelling is
// deliberately not accepted in its place.
if (!/--ids/.test(SKILL)) {
  fails.push("the skill's co-tag step does not name the pull form (`report … --ids <G/SG list>`) — §12 v6 makes the report an owner-entered ID set, and a skill still teaching eager generation teaches a command that refuses");
}
// The flag may be NAMED — a reader grepping for why their command broke should
// find the answer here — but never TAUGHT. So the test is per line: every line
// mentioning it must also say it is gone. A blunt "does not appear" assertion
// fired on the removal note itself, which is a true positive for the letter and
// a false one for the intent.
const teaches = SKILL.split("\n").filter((l) =>
  l.includes("--all-groups") && !/gone|refuse|removed|supersed/i.test(l));
if (teaches.length) {
  fails.push(`the skill TEACHES \`--all-groups\` on ${teaches.length} line(s) — §11 v5 removed it and the runtime refuses, so teaching it teaches a command that errors. Naming it in a removal note is fine and is what the rest of the test allows: ${JSON.stringify(teaches[0].trim().slice(0, 80))}`);
}
// The serve-verbatim rule (§2.4's flow rule, kogaki#150): the sitting that
// re-rendered the runtime's output is the layer where three merged contracts
// failed at once, so the rule must be stated in the flow's own instructions.
// AC7 — THE CONFORMANCE FIXTURE AT THE PRODUCER/CONSUMER BOUNDARY
// (§12.1 v9, kogaki#199). The producer is this skill, which composes the
// subdivision input; the consumer is `cmdReport`. They hold separate suites
// over one contract, so neither side can see the break — which is why the
// amendment REQUIRES this fixture rather than suggesting it.
//
// consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:45
//
// The producer half: the instruction must teach the TYPED record and must say
// that an empty subgroups list is the judged-empty form. A skill that still
// showed a bare array would send every composer into the refusal.
if (!/"judged"\s*:\s*true/.test(SKILL) || !/"subgroups"\s*:\s*\[\s*\]/.test(SKILL)) {
  fails.push("the skill does not teach the v9 typed subdivision record with its judged-empty form "
    + '(`{"judged": true, "subgroups": []}`) — the producer would compose an input the consumer refuses');
}

// The consumer half, exercised END TO END on the case v9 exists to make
// expressible: a group whose judgment RAN and found no leaf split.
{
  const RDJE = mkdtempSync(join(tmpdir(), "terrain-judged-empty-"));
  const SJE = join(RDJE, "subs.json");
  writeFileSync(SJE, JSON.stringify({
    [`${TAG} × architecture`]: { judged: true, subgroups: [] },
  }));
  const je = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
     "--report-dir", RDJE, "--ids", "G2", "--subdivisions", SJE,
     "--judge-model", "m", "--judge-effort", "high"], { encoding: "utf8" });
  // SEAM-AWARE, exactly as every other report-running block in this file
  // (`:874-878`, `:965-969`, `:1175-1178`). `report` reads served Gloss
  // renderings, so where no gateway is configured it degrades with exit 11 —
  // and a fixture that read that as a hard failure would be RED on every
  // machine without a seam while passing on the author's. Round 1 of PR #225
  // caught exactly that: the suite was green locally and red in CI, which is
  // the signature of a seam dependency rather than of the diff.
  // A check that cannot run its trials SAYS SO (absence-verification-counts-
  // exercised-trials); it does not report a pass it did not earn, and it does
  // not fail a diff it did not test.
  const jeSeamAbsent = je.status === 11
    || (je.status !== 0
        && /policy_source unavailable|gateway/i.test(String(je.stderr) + String(je.stdout)));
  const written = readdirSync(RDJE).filter((f) => f.startsWith("terrain-full-report-"));
  if (jeSeamAbsent) {
    console.log("AC7 consumer half: CANNOT-DETERMINE for the judged-empty artifact cases — "
      + "the served seam is unavailable here and `report` reads served Gloss renderings "
      + "through it. The producer half (the skill teaches the typed record and its "
      + "judged-empty form) and the bare-array refusal below are seam-free and RAN.");
  } else if (je.status !== 0 || written.length !== 1) {
    fails.push(`a judged-EMPTY group did not produce its report (exit ${je.status}, `
      + `${written.length} written): ${(je.stderr || "").trim().slice(0, 200)}`);
  } else {
    const rec = JSON.parse(readFileSync(join(RDJE, written[0]), "utf8"));
    // AC3: the judge pin is real, the SubGroupClaims are ZERO, the catch-all
    // did NOT fire, and the members survived.
    if (rec.identity.judge_pin === "none") {
      fails.push("a judged-empty group minted a judge pin of `none` — the conformant case recorded as the violation (§12.1 v9)");
    }
    // §12 v7 (kogaki#314): the record carries SECTIONS, one per entered id, and
    // the per-group fields moved inside them. Same two properties, read where
    // they now live.
    const sec = (rec.sections || [])[0];
    if (!sec) {
      fails.push("the record carries no sections — §12 v7 makes a report one section per entered id");
    } else {
      if (!Array.isArray(sec.subgroups) || sec.subgroups.length !== 0) {
        fails.push(`a judged-empty section carries ${JSON.stringify(sec.subgroups)} rather than ZERO SubGroupClaims `
          + "— the no_member_hidden_subgroup catch-all manufactured a SubGroup the judgment did not make");
      }
      if (!Array.isArray(sec.members) || sec.members.length !== 2) {
        fails.push("a judged-empty section lost its MEMBERS — they are not in `subgroups`, so nulling them drops the whole membership from the artifact");
      }
    }
    // AC4: distinguishable from a never-judged artifact, which carries `none`.
    if (rec.identity.judge_pin === "none" || typeof rec.identity.judge_pin !== "object") {
      fails.push("a judged-empty artifact is not distinguishable from a never-judged one");
    }
  }
  // The withdrawn pre-v9 BARE ARRAY is refused by name rather than read as the
  // old form. Without this, a stale composer silently gets back the accidental
  // truthiness semantics that made judged-empty unrecordable — two encodings
  // behind one file, which is the collision the served surface rules against.
  const SLEGACY = join(RDJE, "legacy.json");
  writeFileSync(SLEGACY, JSON.stringify({ [`${TAG} × architecture`]: [] }));
  const legacy = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
     "--report-dir", RDJE, "--ids", "G2", "--subdivisions", SLEGACY,
     "--judge-model", "m", "--judge-effort", "high"], { encoding: "utf8" });
  // SEAM-FREE BY CONSTRUCTION, and that is why it stays a hard assertion:
  // `readSubdivisionEntry` refuses while validating the input, BEFORE any shard
  // fetch, so the refusal fires with or without a gateway. Only the NAMING
  // assertion is seam-conditional — under degrade the process exits 11 with the
  // `policy_source unavailable` line instead, so requiring "bare array" in
  // stderr there would fail on the absence rather than on the behaviour.
  if (legacy.status === 0) {
    fails.push("a BARE ARRAY subdivision entry was accepted — the withdrawn pre-v9 form must be refused by name, "
      + "or a stale composer silently recovers the truthiness semantics v9 removed");
  } else if (!jeSeamAbsent && !/bare array/.test(legacy.stderr || "")) {
    fails.push("the bare-array entry was refused without NAMING the defect — a refusal that does not say what to write instead sends the composer guessing");
  }

  rmSync(RDJE, { recursive: true, force: true });
}

// §14.4 (story 1.55, kogaki#347) SUPERSEDES the verbatim-relay wording this
// once matched. The rule is no longer "retype it faithfully" — it is that the
// relay is not a producer at all: deliver the artifact the runtime wrote. So
// the assertion moves to the PROPERTY the new form carries, and the old
// spelling is deliberately no longer accepted: a check that admitted both
// would pass a skill that kept the advisory form §14.4 replaced.
//
// Asserted as three parts rather than one phrase, because the failure this
// guards is a partial edit — a file that prohibits retyping and never says
// what to do instead sends the relay guessing, which is where it was.
if (!/never a quotation of it/i.test(SKILL)) {
  fails.push("the skill does not carry §14.4's one-producer rule — 'deliver the artifact the runtime wrote, NEVER a quotation of it'. The superseded verbatim-relay wording is not accepted in its place: retyping faithfully is advisory at exactly the layer where it breaks (kogaki#319, kogaki#347; the 2026-08-09 mid-token line fusion)");
}
if (!/cat <that path>|`cat`/i.test(SKILL) || !/announceArtifacts/.test(SKILL)) {
  fails.push("the skill prohibits retyping without naming the DELIVERY act — it must point at the artifact `announceArtifacts` names and say to `cat` it, or the relay is left with a prohibition and no way to comply");
}
if (!/nothing new has to be policed|is a REMOVAL/i.test(SKILL)) {
  fails.push("the skill states §14.4 as a policing duty rather than as a REMOVAL — 'nothing new is prohibited, so nothing new has to be policed'. A lint over model output is the detect-side answer this decision declined (story 1.55 AC2)");
}

if (fails.length) {
  console.log("FAIL cotags fixture — the second navigation step does not discriminate:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("cotags fixture: PASS — cases exercised (lone-tag group; declared sort on both "
  + "axes; group-name form; cover passing; cover DROPPED / ADDED / both, all "
  + "three fired; end-to-end subcommand wiring; ids without --group; absent-claim "
  + "marker per-group and in aggregate; claim beneath its heading; the v5 heading "
  + "carries count + IDs; pinning stated; invented group refused; SubGroup line "
  + "carries count + IDs with its claim beneath; unplaced member named not dropped; "
  + "leaf verdict rendered; a flipped verdict CHANGES it; judge pin recorded and "
  + "REFUSED when absent; degenerate-claim disclosure rendered; no slug dump on the "
  + "screen; AC7's boundary pair — the skill teaches the v9 typed record and its "
  + "judged-empty form, and a judged-EMPTY group runs END TO END with a real judge "
  + "pin, ZERO SubGroupClaims and its members intact (seam-aware: CANNOT-DETERMINE "
  + "where no gateway is configured) — plus the withdrawn bare array refused BY NAME; "
  + "the skill names the co-tag step, the pull-on-entered-ids report form, and the "
  + "serve-verbatim rule; no member-count threshold across cmdCotags, "
  + "subgroupPlacement and judgeSubgroup)");
JS

python3 - <<'EOF'
import json, pathlib, re, sys
from collections import Counter

root = pathlib.Path(".")
schema = json.loads((root / "specs/spec-terrain/survey-schema.json").read_text())
fixtures = root / "checks/fixtures/terrain"

# Every violation code this validator can emit. Each one owes a fixture.
CODES = {
    "SURVEY_MISSING_FIELD",
    "CANDIDATE_MISSING_FIELD",
    "CANDIDATE_ID_DUPLICATE",
    "CANDIDATE_NOT_A_LESSON",
    "JOURNEY_ORPHAN",
    "FAMILY_UNKNOWN",
    "SECTION_MISSING_FIELD",
    "PLACEMENT_UNKNOWN_STRAND",
    "COVER_STRAND_UNPLACED",
    "NO_RELATION_NOT_EXPLICIT",
    "FIGURE_NOT_OVER_PLACEMENTS",
    "FIGURE_FAMILY_UNNAMED",
    "FIGURE_MISMATCH",
    "NAVIGATION_STATE_NARROWS",
    # §14.3 (story 1.53). Declared here in the SAME change that taught the
    # validator to emit them — PR #351 round 1 finding 1 caught them absent,
    # and the shape of that miss is why this comment exists: `missing = CODES -
    # covered_codes` computes over the DECLARED set, so an undeclared code is
    # invisible to the very guard that reports coverage. The check went on
    # printing `fixture pass: n/14` while the validator could emit sixteen —
    # kogaki#209's green-line-over-undemonstrated-protection shape exactly.
    "DISPLAY_ID_MALFORMED",
    "DISPLAY_ID_DUPLICATE",
}
# Declared, not silent.
CODES_WITHOUT_FIXTURE = {"MALFORMED_JSON": "a fixture would not parse as JSON"}

CRASH = "CANNOT_DETERMINE"


def empty(x):
    return x is None or x == "" or x == []


def family_split(ids, candidates):
    """The family split over a set of placed ids.

    The SECOND copy of this algorithm — terrain/terrain.mjs familySplit is the
    first (generation-time). SPEC.md §9 records the correction that the
    single-carrier clause covers survey-schema.json's FIELD LISTS and not this
    recompute, which alternative (a) extends in BOTH halves. Collapsing the
    duplication is not licensed by that decision; it is named here so the next
    reader meets it in the code as well as in the spec.

    Rows are Lessons, so the Journey half is counted from the MARKS the placed
    Lessons carry — Lessons plus marks reconstructs the Strand set (§5.2)."""
    mark = schema["survey"]["journey_mark_key"]
    lesson_family = schema["candidate_family_must_be"]
    out = {f: 0 for f in schema["families"]}
    by_id = {c.get("id"): c for c in candidates if isinstance(c, dict)}
    for cid in ids:
        c = by_id.get(cid)
        if c is None:
            continue
        fam = c.get("family")
        if fam in out:
            out[fam] += 1
        if fam == lesson_family and c.get(mark) and "journey" in out:
            out["journey"] += 1
    return out


def validate_survey(record):
    """Return a list of (code, detail). Empty list = conforming.
    Mirrors terrain/terrain.mjs validateSurvey — the generation half."""
    v = []
    s = schema["survey"]
    for f in s["required"]:
        if f not in record or empty(record[f]):
            v.append(("SURVEY_MISSING_FIELD", f"survey.{f}"))

    candidates = record.get("candidates")
    candidates = candidates if isinstance(candidates, list) else []
    journeys = record.get("journeys")
    journeys = journeys if isinstance(journeys, list) else []
    sections = record.get("sections")
    sections = sections if isinstance(sections, list) else []

    ids = set()
    lesson_slugs = set()
    # SPEC.md §14.3 — the display_id is the token every owner surface renders,
    # so its shape and uniqueness are record-level invariants. Mirrors
    # terrain.mjs's own validation rather than replacing it: the refusal is at
    # generation, this is the fast path beneath it.
    display_id_seen = set()
    display_id_pattern = s.get("candidate_display_id_pattern")
    display_id_re = re.compile(display_id_pattern) if display_id_pattern else None
    for i, c in enumerate(candidates):
        for f in s["candidate_required"]:
            if f not in c or (empty(c[f]) and f != "tags"):
                v.append(("CANDIDATE_MISSING_FIELD", f"candidates[{i}].{f}"))
        fam = c.get("family")
        if fam is not None and fam not in schema["families"]:
            v.append(("FAMILY_UNKNOWN",
                      f"candidates[{i}].family={fam!r}; the served families are "
                      + "|".join(schema["families"])))
        elif fam is not None and fam != schema["candidate_family_must_be"]:
            v.append(("CANDIDATE_NOT_A_LESSON",
                      f"candidates[{i}].family={fam!r}: "
                      + schema["candidate_family_rationale"]))
        did = c.get("display_id")
        if did is not None and not empty(did):
            if display_id_re and not display_id_re.match(str(did)):
                v.append(("DISPLAY_ID_MALFORMED",
                          f"candidates[{i}].display_id={did!r} does not match "
                          + str(display_id_pattern)))
            if did in display_id_seen:
                v.append(("DISPLAY_ID_DUPLICATE",
                          f"{did!r} appears twice; the survey record is the "
                          "ID→slug map (SPEC.md §14.3) and a duplicate makes "
                          "that map return the wrong Strand"))
            display_id_seen.add(did)
        if c.get("slug"):
            lesson_slugs.add(c["slug"])
        if c.get("id"):
            if c["id"] in ids:
                v.append(("CANDIDATE_ID_DUPLICATE",
                          f"{c['id']!r} appears twice; a duplicate id silently "
                          "merges two Strands and breaks the cover (a journey "
                          "shares its lesson's slug — qualify by family)"))
            ids.add(c["id"])
        for k in s["narrowing_keys_forbidden"]:
            if k in c:
                v.append(("NAVIGATION_STATE_NARROWS",
                          f"candidates[{i}] carries {k!r}: {s['narrowing_rationale']}"))

    # Falsifier 1 (SPEC.md §5.2) — a Journey whose slug matches no Lesson has
    # no row to be marked on. The generation half REFUSES the write; this is
    # the detection half behind it, and it names the orphan slugs too.
    orphans = sorted(j["slug"] for j in journeys
                     if isinstance(j, dict) and j.get("slug")
                     and j["slug"] not in lesson_slugs)
    if orphans:
        v.append(("JOURNEY_ORPHAN",
                  f"{len(orphans)} Journey(s) match no Lesson row: "
                  + ", ".join(orphans) + f": {s['orphan_journey_rationale']}"))

    placed = set()
    for i, sec in enumerate(sections):
        for f in s["section_required"]:
            if f not in sec or empty(sec[f]):
                v.append(("SECTION_MISSING_FIELD", f"sections[{i}].{f}"))
        for k in s["narrowing_keys_forbidden"]:
            if k in sec:
                v.append(("NAVIGATION_STATE_NARROWS",
                          f"sections[{i}] carries {k!r}: {s['narrowing_rationale']}"))
        sec_placed = []
        for m in sec.get("members") or []:
            if m not in ids:
                v.append(("PLACEMENT_UNKNOWN_STRAND",
                          f"sections[{i}] places {m!r}, which is no candidate"))
            else:
                placed.add(m)
                sec_placed.append(m)
        # The section figure is recomputed from the placements it claims to be
        # counted over and refused on mismatch, exactly as completeness.by_family
        # already is — terrain-family-split-carrier filled with (a) (SPEC.md §9).
        if isinstance(sec.get("by_family"), dict):
            want = family_split(sec_placed, candidates)
            bad = []
            for f in schema["families"]:
                if f in sec["by_family"] and sec["by_family"][f] != want[f]:
                    bad.append(f"sections[{i}].by_family.{f}="
                               f"{sec['by_family'][f]} recomputed={want[f]}")
            if bad:
                v.append(("FIGURE_MISMATCH", "; ".join(bad)))

    for cid in sorted(ids - placed):
        v.append(("COVER_STRAND_UNPLACED",
                  f"{cid!r} appears in no section; nothing is silently dropped"))

    tagless = [c for c in candidates if c.get("tags") == []]
    if tagless:
        name = record.get("no_relation_section")
        if not name or not any(sec.get("name") == name for sec in sections):
            v.append(("NO_RELATION_NOT_EXPLICIT",
                      f"{len(tagless)} Strand(s) carry no served tag and no "
                      "declared no-relation section holds them"))

    comp = record.get("completeness")
    if isinstance(comp, dict):
        cs = s["completeness"]
        for f in cs["required"]:
            if f not in comp or (empty(comp[f]) and f != "placed"):
                v.append(("SURVEY_MISSING_FIELD", f"completeness.{f}"))
        if "counted_over" in comp and comp["counted_over"] != cs["counted_over_must_be"]:
            v.append(("FIGURE_NOT_OVER_PLACEMENTS",
                      f"completeness.counted_over={comp['counted_over']!r}: "
                      + cs["counted_over_rationale"]))
        fam = comp.get("family")
        if fam is not None and fam != cs["family_must_name"]:
            v.append(("FIGURE_FAMILY_UNNAMED",
                      f"completeness.family={fam!r}: {cs['family_rationale']}"))

        # Recompute the figure from the placements it claims to count.
        by_family = family_split(placed, candidates)
        mismatches = []
        if "placed" in comp and comp["placed"] != len(placed):
            mismatches.append(f"placed={comp['placed']} recomputed={len(placed)}")
        if "of" in comp and comp["of"] != len(candidates):
            mismatches.append(f"of={comp['of']} candidates={len(candidates)}")
        if isinstance(comp.get("by_family"), dict):
            for f in schema["families"]:
                if f in comp["by_family"] and comp["by_family"][f] != by_family[f]:
                    mismatches.append(
                        f"by_family.{f}={comp['by_family'][f]} recomputed={by_family[f]}")
        # The coverage half rides the same recompute. SPEC.md §5.2 declares
        # `instrument: none` for falsifier 2 — this refuses a WRONG coverage
        # figure and deliberately does not read the >=99% threshold.
        mark = s["journey_mark_key"]
        by_id = {c.get("id"): c for c in candidates if isinstance(c, dict)}
        thin = sum(1 for cid in placed
                   if (by_id.get(cid) or {}).get("family") == schema["candidate_family_must_be"]
                   and not (by_id.get(cid) or {}).get(mark))
        if "thin_lessons" in comp and comp["thin_lessons"] != thin:
            mismatches.append(f"thin_lessons={comp['thin_lessons']} recomputed={thin}")
        if mismatches:
            v.append(("FIGURE_MISMATCH", "; ".join(mismatches)))
    return v


def guarded_validate(doc, where):
    """(violations, crashes) — a record that cannot be judged is reported as
    CANNOT-DETERMINE, never as a finding against the record."""
    try:
        return validate_survey(doc), []
    except Exception as exc:
        # Keyed WITHOUT the file's row detail, deliberately: a deterministic
        # cause produces the identical entry N times, and collapsing on that
        # key lets the rendering disclose the repetition.
        return [], [(CRASH, f"{where}: {type(exc).__name__}: {exc}")]


def render(items, prefix):
    lines = []
    for (code, detail), n in Counter(items).items():
        line = f"{prefix} {code} — {detail}".strip() if prefix else f"{code} — {detail}"
        if n > 1:
            line += (f"  ×{n} (identical output, one deterministic cause — "
                     f"not {n} independent confirmations)")
        lines.append(line)
    return lines


def load(path):
    try:
        return json.loads(path.read_text()), None
    except json.JSONDecodeError as exc:
        return None, ("MALFORMED_JSON", str(exc))


failures = []
cannot_determine = []

# 1. Survey records in the tree — the default carrier. Real runs live in the
# machine-local run workspace, so zero here is the expected reading and is
# rendered rather than passed over in silence.
records = sorted(p for p in root.rglob("*.terrain-survey.json")
                 if ".git" not in p.parts and fixtures not in p.parents)
for path in records:
    doc, error = load(path)
    if error:
        failures.append(("MALFORMED_JSON", f"{path}: {error[1]}"))
        continue
    v, c = guarded_validate(doc, str(path))
    failures.extend((code, f"{path}: {detail}") for code, detail in v)
    cannot_determine.extend(c)

# 2. Fixtures — this check's discrimination evidence.
covered_codes = set()
for kind, expect_clean in (("conforming", True), ("nonconforming", False)):
    paths = sorted((fixtures / kind).glob("*.json"))
    if not paths:
        print(f"FAIL fixtures/{kind} is empty: this check's discrimination "
              "is unevidenced")
        sys.exit(1)
    for path in paths:
        doc, error = load(path)
        if error:
            failures.append(("FIXTURE", f"{path}: {error[0]} — {error[1]}"))
            continue
        v, c = guarded_validate(doc, str(path))
        got = [code for code, _ in v]
        if expect_clean:
            for code, detail in v:
                failures.append(("FIXTURE",
                                 f"conforming fixture rejected: {path}: {code} — {detail}"))
            if c:
                failures.append(("FIXTURE",
                                 f"conforming fixture crashed the validator: {path}: {c}"))
            continue
        if doc.get("_expect_cannot_determine"):
            # The crash path: reported AS a crash, never spent as a finding.
            if not c:
                failures.append(("FIXTURE",
                                 f"{path} expected CANNOT-DETERMINE; validator "
                                 f"returned findings {got or 'none'} instead"))
            if got:
                failures.append(("FIXTURE",
                                 f"{path}: a crash was emitted as a violation "
                                 f"({got}) — a crash is not a finding"))
            continue
        expected = doc.get("_expect")
        if not expected:
            failures.append(("FIXTURE",
                             f"{path} declares no _expect code"))
            continue
        if expected not in got:
            failures.append(("FIXTURE",
                             f"{path} expected {expected}; got {got or 'none'}"))
        if c:
            failures.append(("FIXTURE",
                             f"{path} crashed the validator instead of failing "
                             f"cleanly: {c}"))
        covered_codes.add(expected)

undeclared = covered_codes - CODES
missing = CODES - covered_codes
if undeclared:
    failures.append(("FIXTURE", f"fixtures expect undeclared codes: {sorted(undeclared)}"))
if missing:
    failures.append(("FIXTURE",
                     f"codes with no discriminating fixture: {sorted(missing)} "
                     f"(declared without one: {sorted(CODES_WITHOUT_FIXTURE)})"))

# --------------------------------------------------------------------------
# Report.
# --------------------------------------------------------------------------
print(f"terrain composition: {len(records)} survey record(s) in the tree"
      + (" (zero is the expected reading: real runs live in the machine-local "
         "run workspace and are never committed)" if not records else ""))
print(f"fixture pass: {len(covered_codes)}/{len(CODES)} violation codes "
      f"discriminated (declared without a fixture: "
      f"{', '.join(sorted(CODES_WITHOUT_FIXTURE))})")
print("not carried here, stated rather than implied: whether the grouping "
      "axis serves the owner, whether section names are honest, and whether "
      "a ratified narrowing was worth taking are judgments — the review "
      "lane's (kogaki#13, story 1.5). A pass here is not that claim.")

if cannot_determine:
    print("\nCANNOT-DETERMINE:")
    for line in render(cannot_determine, ""):
        print(f"  {line}")
    print("  This is a defect in this checker, not a finding against the "
          "audited record — debug here, not there.")

if failures:
    print("\nFAIL:")
    for line in render(failures, ""):
        print(f"  {line}")
    sys.exit(1)

print("PASS" if not cannot_determine else "PASS (with CANNOT-DETERMINE entries above)")
EOF

# --- Full Report fixture (kogaki#129, story 1.30) ----------------------------
#
# WHAT THIS DISCRIMINATES. §12.1 states four identity cases and §12 requires a
# report to RECORD its own identity — both are claims about what exists on disk
# after N invocations, which no unit test of a parser can observe. So the block
# runs the subcommand and counts artifacts.
#
# The judge-pin case is the one worth naming: v4.1 keyed a report as a pair or
# a triple according to its own content, so a request could not form the key;
# v4.2 made the arity uniform with `none` a typed value. The assertion below is
# what makes that concrete — a subdivided and an unsubdivided run over the SAME
# pin and query must produce TWO coexisting reports, not one.
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { parseGlossFull, reportIdentity, sameIdentity, NO_JUDGE }
  from "./terrain/terrain.mjs";

const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const TAG = "testing";
const fails = [];
const eq = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) fails.push(`${name}: got ${g}, want ${w}`);
};

// 1. The whole-body reader. `parseGlossShard` cuts a headline BY DESIGN, so a
//    report reusing it would truncate — §12 forbids truncation anywhere, and
//    this is the assertion that the two readers are genuinely different.
const shard = { lines: [
  { text: "## alpha", cite: "gloss/lessons/testing.md:9@abc" },
  { text: "" },
  { text: "First sentence. Second sentence continues the body.", cite: "gloss/lessons/testing.md:11@abc" },
  { text: "A second paragraph line.", cite: "gloss/lessons/testing.md:12@abc" },
  { text: "Source: `lessons/alpha.md` · tags: testing", cite: "gloss/lessons/testing.md:13@abc" },
]};
const full = parseGlossFull(shard);
eq("the full reader keeps the WHOLE body, not the first sentence",
   full.get("alpha").body,
   "First sentence. Second sentence continues the body.\nA second paragraph line.");
eq("the full reader carries the body's first cite",
   full.get("alpha").cite, "gloss/lessons/testing.md:11@abc");

// 2. Identity is a UNIFORM TRIPLE — `none` present, never omitted (§12.1).
const idNone = reportIdentity("product-lab@aaa", TAG, "testing × architecture", null);
eq("an unjudged report's judge component is the typed value, not absent",
   idNone.judge_pin, NO_JUDGE);
eq("identity carries all three components",
   Object.keys(idNone).sort(), ["identity_placeholder"].slice(0,0).concat(["judge_pin","pin","query"]));
const idJudged = reportIdentity("product-lab@aaa", TAG, "testing × architecture",
  { model_id: "m", effort_tier: "high" });
if (sameIdentity(idNone, idJudged)) {
  fails.push("a judged and an unjudged report over the same pin and query compare EQUAL — the judge pin is not in the key, which is the same-key-different-content collision §12.1 rejects (v4.2)");
}
if (!sameIdentity(idNone, reportIdentity("product-lab@aaa", TAG, "testing × architecture", NO_JUDGE))) {
  fails.push("two unjudged reports over the same pin and query compare UNEQUAL — the rerun would duplicate");
}

// 3. The four cases, counted over real artifacts.
const RD = mkdtempSync(join(tmpdir(), "terrain-reports-"));
// EVERY GROUP IS JUDGED on the co-tag path (§6.2), so v9 refuses a `report`
// whose target carries no subdivision entry rather than minting `none` for it
// (kogaki#199). These cases are about IDENTITY and idempotence, not about
// subdivision, so they supply the conformant judged-EMPTY record for every
// composed group — which is itself the case §12.1 v9 exists to make
// expressible, exercised here on every one of them.
const JUDGED_EMPTY = join(RD, "judged-empty.json");
writeFileSync(JUDGED_EMPTY, JSON.stringify({
  [`${TAG} × (no second served tag)`]: { judged: true, subgroups: [] },
  [`${TAG} × architecture`]: { judged: true, subgroups: [] },
  [`${TAG} × cost`]: { judged: true, subgroups: [] },
}));
const JUDGE = ["--judge-model", "m", "--judge-effort", "high"];
const withDefaults = (extra) => {
  const hasSubs = extra.includes("--subdivisions");
  const hasPin = extra.includes("--judge-model");
  return [...extra,
    ...(hasSubs ? [] : ["--subdivisions", JUDGED_EMPTY]),
    ...(hasPin ? [] : JUDGE)];
};
const run = (extra) => spawnSync(process.execPath,
  ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
   "--report-dir", RD, ...withDefaults(extra)], { encoding: "utf8" });
// Counted over REPORTS only. The subdivision input below lives in the same
// directory and also ends `.json`; counting by extension would have made the
// judge-pin refusal look like a write.
const count = () => readdirSync(RD).filter((f) => f.startsWith("terrain-full-report-")).length;

// THE SEAM IS MACHINE-LOCAL, so the artifact-counting cases below cannot run
// everywhere. `cmdReport` reads served Gloss renderings through the gateway,
// whose location is machine-local configuration and never a committed path
// (CLAUDE.md; kogaki#9) — so a CI runner has none and the subcommand stops.
//
// A check that could not run its trials reports CANNOT-DETERMINE. It does not
// pass (which would claim evidence it never gathered) and it does not fail
// (which would accuse the diff of a defect in the environment). The unit cases
// above are seam-free and always run, so this block degrades rather than
// vanishing — `absence-verification-counts-exercised-trials`, and the
// three-result discipline `check-external-deps.sh` already applies to its own
// reads.
const r1 = run(["--ids", "G2"]);
const seamAbsent = r1.status === 11
  || (r1.status !== 0
      && /policy_source unavailable|gateway/i.test(String(r1.stderr) + String(r1.stdout)));
if (seamAbsent) {
  console.log("Full Report fixture: CANNOT-DETERMINE for the 8 artifact-counting cases — "
    + "the served seam is unavailable here, and `report` reads served Gloss renderings "
    + "through it. The 5 seam-free cases above (whole-body reader, identity arity, "
    + "judged-vs-unjudged collision, equality) RAN and passed. This is neither a pass "
    + "nor a failure of the diff: a check that could not run its trials says so "
    + "(absence-verification-counts-exercised-trials).");
} else {
if (r1.status !== 0) fails.push(`report exited ${r1.status}: ${(r1.stderr || "").trim()}`);
eq("case 1a — one run, one report", count(), 1);
run(["--ids", "G2"]);
eq("case 1b — SAME identity run twice is ONE report (idempotent, not a duplicate)", count(), 1);
run(["--ids", "G3"]);
eq("case 3 — same pin, DIFFERENT query is two reports", count(), 2);

const SUBS = join(RD, "subs.json");
writeFileSync(SUBS, JSON.stringify({ [`${TAG} × architecture`]: { judged: true, subgroups: [
  { subgroup: "sg", claim: "a tighter claim", members: ["lesson:alpha"],
    composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true }] }}));
// The judge-pin refusal, exercised WITHOUT the conformant default the helper
// injects — otherwise this case would assert a refusal it had just prevented.
const noPin = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
   "--report-dir", RD, "--ids", "G2", "--subdivisions", SUBS],
  { encoding: "utf8" });
if (noPin.status === 0) {
  fails.push("a report was written with NO judge pin — v9 requires it for EVERY report invocation, and a co-tag run may never mint `none`");
}
eq("the refusal wrote nothing", count(), 2);

// A report with NO subdivision entry for its target is refused too (v9): an
// absent entry is `not judged`, and minting `none` for it is precisely what
// §12.1 v9 forbids. This case is the one that could not exist before — the
// runtime had no way to say `judged, empty`, so it said `none` and called the
// conformant case a violation.
const noEntry = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
   "--report-dir", RD, "--ids", "G2",
   "--judge-model", "m", "--judge-effort", "high"], { encoding: "utf8" });
if (noEntry.status === 0) {
  fails.push("a report was written for a group with NO subdivision entry — an absent entry is `not judged`, and the co-tag path must refuse rather than mint `none` (§12.1 v9)");
}
eq("the unjudged refusal wrote nothing either", count(), 2);

// CASE 4, RE-CUT for v9, and the re-cut carries a consequence worth asserting
// rather than absorbing. It used to read "one run subdivided and one not
// COEXIST", which rested on an unsubdivided run minting `none` — a state v9
// refuses, so the old case asserts a pair the required path can no longer
// produce. §12.1 v8 anticipated exactly this and restated its own row 4 on the
// judge pin's VALUE rather than its PRESENCE.
//
// 4a — WITH the pin required unconditionally, a subdivided run and a
// judged-empty run BY THE SAME JUDGE now share an identity, because identity
// is (pin, query, judge pin) and the SubGroupClaims are not in it. Under v8
// they differed only because one of them carried `none`. So this is idempotent
// rather than a second report — row 1 of §12.1's table, reached by a path that
// did not exist before.
const before4 = count();
run(["--ids", "G2", "--subdivisions", SUBS, "--judge-model", "m", "--judge-effort", "high"]);
eq("case 4a — a subdivided run at the SAME judge as an earlier judged-empty one is IDEMPOTENT",
   count(), before4);
// 4b — the same query judged by a DIFFERENT judge is the pair the required
// path produces routinely, and it is what row 4 now describes.
run(["--ids", "G2", "--subdivisions", SUBS, "--judge-model", "m2", "--judge-effort", "high"]);
eq("case 4b — same pin and query, TWO DIFFERENT judge pins, COEXIST as two reports",
   count(), before4 + 1);
}

// 4. §12's recording obligation: the identity is IN the artifact. §12.2 makes
//    these the only source of it, so a report carrying none is unresolvable —
//    and that state passes every other clause in the section.
for (const f of readdirSync(RD).filter((x) => x.startsWith("terrain-full-report-"))) {
  const rec = JSON.parse(readFileSync(join(RD, f), "utf8"));
  const id = rec.identity || {};
  // §12 v6 (kogaki#314): the query component is `{ tag, ids }`, the ids being
  // the canonical entered set. `group` is the pre-v6 spelling.
  if (!id.pin || !id.query || !id.query.tag
      || !(Array.isArray(id.query.ids) && id.query.ids.length) || id.judge_pin === undefined) {
    fails.push(`${f} does not record all three identity components — §12.2 forbids recovering them from the filename, so this report cannot be resolved at all`);
  }
  if (rec.classification !== "report" || rec.narrows !== false) {
    fails.push(`${f} is not classified as a report that narrows nothing (§2.3, §12)`);
  }
  if (rec.truncated !== false) fails.push(`${f} does not assert untruncated content (§12)`);
}

if (fails.length) {
  console.log("FAIL Full Report fixture — §12's identity and recording rules do not hold:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
if (seamAbsent) {
  console.log("Full Report fixture: PASS — seam-free cases exercised (whole-body reader vs headline "
    + "reader; uniform triple with `none` typed; judged vs unjudged do not collide; "
    + "identical identities compare equal) — the 8 artifact-counting cases are "
    + "CANNOT-DETERMINE here, stated above.");
} else {
  console.log("Full Report fixture: PASS — cases exercised (whole-body reader vs headline reader; "
    + "uniform triple with `none` typed; judged vs unjudged do not collide; identical "
    + "identities compare equal; the four §12.1 cases counted over real artifacts, "
    + "including judge-pin refusal writing nothing; identity recorded, classification "
    + "and untruncated asserted per artifact)");
}
JS

# --- claim re-offer origin fixture (kogaki#143; re-pointed kogaki#625 item 1) --
#
# WHY THIS IS AN EXTENSION AND NOT A TENTH CHECK. The claim re-offer's origin
# path is terrain composition — §7's claim lifecycle is the contract this file
# already carries — so the coverage lands inside an existing member's declared
# contract and no admission record is owed. A tenth check for one finding is the
# one-member-per-incident growth the served surface names as the tell that you
# are on the wrong side ("a check suite growing at roughly one member per
# incident", product-lab@f918c515 LESSONS.md:45), in a repository whose
# founding decision put a rebuilt suite under a high admission bar to avoid it.
#
# WHAT IT DISCRIMINATES. §7's v4 rider defines THREE origin branches and story
# 1.31 shipped all three untested — no registered check invoked the composition
# at all, and PR #141's acceptance table named a test that did not exist. The
# third branch is the one most worth holding: its whole content is that an
# absent origin is STATED and never fabricated, so its failure mode is a MISSING
# line rather than a wrong one, which no assertion about present content would
# catch.
#
# RE-POINTED AT THE COMPOSER, AND WHY THAT IS A RE-BINDING RATHER THAN A
# WEAKENING (kogaki#625 item 1). The block drove `terrain.mjs claim`, which
# §15.6.1 removes as an entry point; the composition it exercised did not move,
# it became `composeClaimReoffer`, reachable only from the `CLAIM_REOFFER`
# state. Driving the executor instead would need a survey and therefore the
# seam, and this block is seam-free by construction — so it calls the composer
# directly, exactly as the runtime's own fixture pass calls its composers. The
# three origin branches are the property; `claim` was only ever the invocation.
#
# The reachability half is asserted too, and separately: the retired entry
# points must REFUSE WITH A POINTER (§15.6.3) rather than vanish, and a fixture
# that only tested the composer would pass just as well if the commands had been
# left live — which is the defect item 1 exists to close.
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { composeClaimReoffer, emitGateDeclaration } from "./terrain/terrain.mjs";

const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const TAG = "testing";
const GROUP = "architecture";
const CLAIM_GATE = "terrain-claim-reoffer";
const survey = JSON.parse(readFileSync(FIXTURE, "utf8"));
const fails = [];

// The re-offer is a GATE EVENT and fires only on a SUBSET selection (§7), so
// every case below names a proper subset of the group's members — which the
// composer now REFUSES to treat otherwise, since `CLAIM_REOFFER`'s own
// `conditional` says it is entered on a proper subset and nothing else.
const reoffer = (dir, extra) => {
  const args = { tag: TAG, group: GROUP, text: "the recomposed wording",
                 members: "lesson:alpha", ...extra };
  const { options, extra: origin } = composeClaimReoffer(args, dir, survey);
  emitGateDeclaration(dir, CLAIM_GATE, options, origin);
};

const declarationIn = (dir) => {
  const f = readdirSync(dir).find((x) => x.endsWith(".run-declaration.json"));
  return f ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null;
};

// Branch 1 — RECORD. `--original <claim record>`. The fixture writes its own
// origin record: the retired `claim` used to seed one as a side effect, and a
// fixture that builds its inputs is the shape the runtime's own pass uses.
const d1 = mkdtempSync(join(tmpdir(), "claim-record-"));
const seedPath = join(d1, "seed.terrain-claim.json");
writeFileSync(seedPath, JSON.stringify({
  id: "terrain-claim-seed", kind: "group-claim", claim: "the original wording",
  members: ["lesson:alpha", "lesson:bravo"],
}, null, 2) + "\n");
const d1b = mkdtempSync(join(tmpdir(), "claim-record-b-"));
try { reoffer(d1b, { original: seedPath }); }
catch (e) { fails.push(`the record branch threw: ${e && e.message}`); }
const g1 = declarationIn(d1b);
if (!g1) fails.push("the record branch emitted no gate run declaration");
else if (g1.original_source !== "claim-record") {
  fails.push(`the record branch's origin_source is ${JSON.stringify(g1.original_source)}, not "claim-record"`);
} else if (!g1.original_claim || !Array.isArray(g1.original_members)) {
  fails.push("the record branch carries no original claim or member set into the gate");
}

// Branch 2 — SCREEN-COMPOSED. §7's v4 rider: the screen writes NO record, so
// the origin travels as ARGUMENTS. This is the branch the rider was written
// for, and before kogaki#133 it was unreachable — `--original` reads a record
// and the screen produces none, so exactly the claims v3 moved earlier reached
// the owner with nothing to compare against.
const d2 = mkdtempSync(join(tmpdir(), "claim-screen-"));
try { reoffer(d2, { "original-text": "the screen's original line",
                    "original-members": "lesson:alpha,lesson:bravo" }); }
catch (e) { fails.push(`the screen-composed branch threw: ${e && e.message}`); }
const g2 = declarationIn(d2);
if (!g2) fails.push("the screen-composed branch emitted no gate run declaration");
else {
  if (g2.original_claim !== "the screen's original line") {
    fails.push(`the screen-composed origin did not reach the gate: original_claim is ${JSON.stringify(g2.original_claim)}`);
  }
  if (JSON.stringify(g2.original_members) !== JSON.stringify(["lesson:alpha", "lesson:bravo"])) {
    fails.push(`the screen-composed origin's MEMBER SET did not reach the gate: ${JSON.stringify(g2.original_members)} — the rider records the adopted claim together with the members it was composed from, so the wording alone is half the contract`);
  }
  if (!/screen-composed/.test(String(g2.original_source))) {
    fails.push(`the screen-composed branch does not declare its source: ${JSON.stringify(g2.original_source)}`);
  }
}
// THE NO-RECORD RIDER, NOW STRICTER THAN IT WAS. The retired `claim` wrote a
// claim record of its own for the subset; the composer writes none at all —
// composing the claims record is the outside composer's under §15.6, so the
// re-offer persists nothing but the declaration it was asked for.
if (readdirSync(d2).filter((f) => f.endsWith(".terrain-claim.json")).length !== 0) {
  fails.push("the screen-composed branch persisted a claim record — the origin travels as an argument and the re-offer composes no claims record of its own (§15.6)");
}

// Branch 3 — ABSENT. The branch whose entire content is that the absence is
// STATED and never fabricated. Its failure mode is a MISSING line rather than
// a wrong one, so it is asserted positively (the declaration says NONE) AND
// negatively (nothing was invented).
const d3 = mkdtempSync(join(tmpdir(), "claim-absent-"));
try { reoffer(d3, {}); }
catch (e) { fails.push(`the absent-origin branch threw: ${e && e.message}`); }
const g3 = declarationIn(d3);
if (!g3) fails.push("the absent-origin branch emitted no gate run declaration");
else {
  if (!/^NONE\b/.test(String(g3.original_source))) {
    fails.push(`the absent-origin branch does not STATE the absence: original_source is ${JSON.stringify(g3.original_source)} — an omitted field and a field reading NONE are the same silence to a reader and different silences to a grep`);
  }
  if (g3.original_claim !== null || g3.original_members !== null) {
    fails.push(`the absent-origin branch FABRICATED an origin: claim=${JSON.stringify(g3.original_claim)} members=${JSON.stringify(g3.original_members)}`);
  }
}

// The three branches are genuinely distinct at the gate. Written because the
// cheapest way to pass every assertion above is one branch that happens to
// satisfy all of them.
const sources = [g1, g2, g3].filter(Boolean).map((g) => String(g.original_source));
if (new Set(sources).size !== sources.length) {
  fails.push(`the origin branches do not discriminate — ${JSON.stringify(sources)} contains a duplicate, so at least two paths are indistinguishable at the gate`);
}

// A FULL-GROUP re-offer is refused rather than composed. §7 makes the
// full-group rendering per-invocation and not an adopted claim, so there is
// nothing to re-offer — and `CLAIM_REOFFER`'s `conditional` says the state is
// entered on a PROPER subset. Without this the state's own entry condition is
// asserted by the table and enforced by nothing.
// Spawned rather than caught: the runtime's refusals exit the process, so an
// in-process try/catch would observe nothing and the assertion would pass by
// never running — a guard untested by its own happy path.
const d4 = mkdtempSync(join(tmpdir(), "claim-full-"));
const fullGroup = spawnSync(process.execPath, ["--input-type=module", "-e",
  `import { composeClaimReoffer } from "./terrain/terrain.mjs";
   import { readFileSync } from "node:fs";
   composeClaimReoffer({ tag: ${JSON.stringify(TAG)}, group: ${JSON.stringify(GROUP)},
     text: "the recomposed wording", members: "lesson:alpha,lesson:bravo" },
     ${JSON.stringify(d4)}, JSON.parse(readFileSync(${JSON.stringify(FIXTURE)}, "utf8")));`],
  { encoding: "utf8" });
if (fullGroup.status === 0) {
  fails.push("a FULL-GROUP member set was composed into a re-offer — §7 makes that rendering per-invocation and not an adopted claim, and CLAIM_REOFFER is entered only on a proper subset");
} else if (!/not a subset/.test(`${fullGroup.stdout || ""}${fullGroup.stderr || ""}`)) {
  fails.push(`the full-group re-offer failed for the wrong reason: ${JSON.stringify((fullGroup.stderr || "").trim().slice(0, 160))}`);
}

// THE REACHABILITY HALF (§15.6.3, kogaki#625 item 1). The retired entry points
// must refuse WITH A POINTER, not vanish and not survive. Asserted here because
// every assertion above would pass just as well with the commands still live,
// which is precisely the defect item 1 closes.
for (const cmd of ["claim", "adopt", "subdivide", "act", "gate", "capture"]) {
  const r = spawnSync(process.execPath, ["terrain/terrain.mjs", cmd], { encoding: "utf8" });
  const said = `${r.stdout || ""}${r.stderr || ""}`;
  if (r.status === 0) {
    fails.push(`\`${cmd}\` still succeeds as an entry point — §15.7 removes it, and while it stands a session can mint run state from outside the executor (#625 acceptance item 1)`);
  } else if (!/removed as an entry point/.test(said) || !/run --run-dir/.test(said)) {
    fails.push(`\`${cmd}\` refuses without naming its replacement: ${JSON.stringify(said.trim().slice(0, 120))} — §13.2's precedent is a refusal NAMING THE REPLACEMENT, never a silent no-op`);
  }
}

if (fails.length) {
  console.log("FAIL claim re-offer origin fixture — §7's v4 rider is not observed:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("claim re-offer origin fixture: PASS — cases exercised (record branch carries claim and "
  + "members; screen-composed branch carries BOTH wording and member set as arguments and "
  + "persists nothing at all; absent branch STATES the absence and fabricates neither "
  + "field; the three sources are mutually distinct at the gate; a full-group set is refused; "
  + "and all six retired entry points refuse with a pointer)");
JS


# --- the injected-fetcher case (kogaki#625, from PR #667 round 2) ------------
#
# `renderTagRowView` takes its shard fetcher as a parameter so that
# "REFUSE-conformance is testable without the seam" — and until this case
# existed no caller anywhere in `terrain/` or `checks/` injected one, so the
# affordance was built and the test it exists for was not written. That is an
# extraction criterion satisfied by its cheap half: the criterion measures what
# must not remain, and only the completeness inventory beside the renderer names
# what must survive (product-lab@d6fdadd5 LESSONS.md:36).
#
# Seam-free by construction, which is the point rather than a convenience: the
# stub IS the seam, so this case runs on a machine with no gateway at all.
node --input-type=module - <<'JS'
import { readFileSync } from "node:fs";
import { renderTagRowView, NO_HEADLINE } from "./terrain/terrain.mjs";
import { validateSurface, loadGrammar } from "./terrain/format-guard.mjs";
const GRAMMAR = loadGrammar("specs/spec-terrain/report-format.json");

const FIXTURE = "checks/fixtures/terrain/conforming/survey-two-strands.json";
const record = JSON.parse(readFileSync(FIXTURE, "utf8"));
const TAG = "architecture";
const fails = [];

// The stub serves ONE slug and withholds the other, so the marked-absence
// direction is exercised by the same render as the present one. A stub serving
// everything could not distinguish "the headline reached the row" from "no row
// needed one".
const served = new Map([["strand-a", { headline: "the served headline", cite: "gloss/ELEMENTS.jsonl:9@16a6dbf6" }]]);
let asked = [];
const stub = (kind, tags) => { asked.push([kind, [...tags].join(",")]); return kind === "lessons" ? served : new Map(); };

const text = renderTagRowView(record, TAG, null, stub);

// 1. THE FETCHER WAS ACTUALLY USED. Without this the whole case passes on a
//    renderer that ignores its parameter and reaches the seam anyway — the
//    failure mode an injected affordance has when nothing asserts the injection.
if (!asked.length) {
  fails.push("the injected fetcher was never called — `renderTagRowView` ignored its `fetchShards` parameter, so this case proves nothing about the seam-free path and the affordance is unexercised");
} else if (!asked.some(([, tags]) => tags === TAG)) {
  fails.push(`the injected fetcher was called with ${JSON.stringify(asked)} — the shard read is TAG-SCOPED (§9: one shard per viewed tag, no whole-corpus prefetch), so a call not scoped to ${JSON.stringify(TAG)} is a different read`);
}

// 2. The served headline reaches the row.
if (!text.includes("the served headline")) {
  fails.push("the served headline did not reach the row — the fetcher's material is dropped between the read and the rendering");
}

// 3. A MISSING served rendering is MARKED, never substituted (§9). The stub
//    withholds the journey shard, so the marker must render.
if (!text.includes(NO_HEADLINE)) {
  fails.push(`a withheld served rendering was not MARKED: the render carries no ${JSON.stringify(NO_HEADLINE)}. §9 makes an absent Gloss rendering a fault to clear rather than a tolerated gap, and nothing is substituted for it`);
}

// 4. REFUSE-CONFORMANCE, which is the property the parameter exists for. The
//    composed text goes through the guard under this state's own grammar.
const verdict = validateSurface("tag_row_view", text, GRAMMAR);
if (verdict.length) {
  fails.push(`the injected-fetcher render does not conform to the tag_row_view grammar: ${JSON.stringify(verdict.slice(0, 3))}`);
}

// 5. And the case is not vacuous: a line the grammar does not declare must be
//    REFUSED by the same call, or assertion 4 would pass on a guard that admits
//    anything.
const bogus = validateSurface("tag_row_view", `${text}\n!! a line class this surface never declares`, GRAMMAR);
if (!bogus.length) {
  fails.push("the tag_row_view grammar ACCEPTED an undeclared line class, so assertion 4 above is not evidence of conformance — a guard that admits anything conforms everything");
}

if (fails.length) {
  console.log("FAIL injected-fetcher case:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("injected-fetcher case: SEAM-FREE and RAN — the injected fetcher IS called and tag-scoped, "
  + "its material reaches the rows, a withheld rendering is MARKED rather than substituted, the "
  + "composed text conforms to the tag_row_view grammar, and the same guard refuses an undeclared "
  + "line class so the conformance assertion is not vacuous");
JS

# --- v5 residuals + origin provenance (kogaki#154, kogaki#145) ---------------
#
# EXTENSION, NOT NEW CHECKS. `tagRow`'s shape, `--all-groups`' fan-out and the
# claim origin's provenance are all terrain composition — inside this member's
# carried contract — and the registry `contract` field is corrected in the same
# diff to name what the member actually covers, which is kogaki#145's finding 1
# and the reason no admission record is owed here.
#
# The forms below were RULED by the owner on 2026-08-06 and shipped with no
# assertion over them, which is the state worth paying for: "a guard's value is
# observable only when it fires ... every time it was not right is unrecorded"
# (product-lab@f918c515 topics/archive/knowledge-architecture.md:163).
node --input-type=module - <<'JS'
import { readFileSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { tagRow } from "./terrain/terrain.mjs";

const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const TAG = "testing";
const fails = [];

// 1. kogaki#147's ALLOWLIST has a carrier. `tagRow` is the single composer for
//    screen 1's tag rows — a real construction constraint — but nothing
//    observed that its output stays ON the allowlist. Permitted: the tag name
//    and the tag's Lesson count. Nothing else.
const row = tagRow({ name: "architecture", by_family: { lesson: 2, journey: 7 } });
if (!row.includes("architecture")) fails.push(`tagRow drops the tag name: ${JSON.stringify(row)}`);
if (!/\b2\b/.test(row)) fails.push(`tagRow drops the Lesson count: ${JSON.stringify(row)}`);
// The Journey half is carried on the CANDIDATE rows, never on the tag row
// (SPEC.md §9 v5.1). 7 is the journey count and must not appear.
if (/\b7\b/.test(row)) {
  fails.push(`tagRow carries the JOURNEY half (${JSON.stringify(row)}) — §9's allowlist permits the tag name and the Lesson count and nothing else; the Journey half is the candidate rows' (v5.1, kogaki#154)`);
}
// A line class not on the allowlist does not render: no cite, no tag list, no
// gloss. Asserted against a section carrying fields a composer could reach for.
const rich = tagRow({ name: "architecture", by_family: { lesson: 2 },
                      cite: "gloss/ELEMENTS.jsonl:1@abc", tags: ["x", "y"],
                      gloss: "a headline that must not render" });
if (/gloss\/ELEMENTS|a headline that must not render|\bx\b, ?\by\b/.test(rich)) {
  fails.push(`tagRow rendered a line class off the allowlist: ${JSON.stringify(rich)}`);
}
// The composer is still WIRED. A unit that passes while nothing invokes it is
// the orphan shape, and screen 1 is where the allowlist is broken.
//
// RE-POINTED WITH THE EMITTER (kogaki#665, PR #667 round 1 finding 5). This
// read `cmdSurvey`'s stdout loop, which was screen 1's emitter until that
// issue EXTRACTED the listing into `renderTagScreen` — the surface's one
// emitter, reached through the executor and written under `tag_screen`'s
// grammar. The property is unchanged and is the one this line always meant:
// the tag rows are composed through the single constructor, never assembled
// beside it. Only the function holding that loop moved, which is why this is a
// re-binding and not a weakening — the assertion still fails if any emitter
// builds a tag row by hand.
if (!/for \(const s of record\.sections\) out\.push\(`  \$\{tagRow\(s\)\}`\)/.test(readFileSync("terrain/terrain.mjs", "utf8"))) {
  fails.push("renderTagScreen no longer composes its tag rows through tagRow — the allowlist's single construction constraint is bypassed, which no assertion over tagRow itself can see");
}

// 2. kogaki#146's EAGER fan-out. Seam-aware exactly as the Full Report block
//    above: `report` reads served Gloss renderings, so where the seam is absent
//    these cases report CANNOT-DETERMINE rather than failing the diff.
const RD = mkdtempSync(join(tmpdir(), "terrain-allgroups-"));
const JUDGED_EMPTY2 = join(RD, "judged-empty.json");
writeFileSync(JUDGED_EMPTY2, JSON.stringify({
  [`${TAG} × (no second served tag)`]: { judged: true, subgroups: [] },
  [`${TAG} × architecture`]: { judged: true, subgroups: [] },
  [`${TAG} × cost`]: { judged: true, subgroups: [] },
}));
const run = (extra) => spawnSync(process.execPath,
  ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
   "--report-dir", RD,
   ...(extra.includes("--subdivisions") ? [] : ["--subdivisions", JUDGED_EMPTY2]),
   ...(extra.includes("--judge-model") ? [] : ["--judge-model", "m", "--judge-effort", "high"]),
   ...extra], { encoding: "utf8" });
const reports = () => readdirSync(RD).filter((f) => f.startsWith("terrain-full-report-")).length;

const probe = run(["--ids", "G1,G2,G3"]);
const seamAbsent = probe.status === 11
  || (probe.status !== 0 && /policy_source unavailable|gateway/i.test(String(probe.stderr) + String(probe.stdout)));
if (seamAbsent) {
  console.log("v5 residuals: CANNOT-DETERMINE for the 4 --ids cases — the served "
    + "seam is unavailable here and `report` reads through it. The tagRow allowlist cases "
    + "above are seam-free and RAN.");
} else {
  if (probe.status !== 0) fails.push(`report --ids exited ${probe.status}: ${(probe.stderr || "").trim()}`);
  // ONE REPORT OVER THE ENTERED SET — the pre-#314 assertion here was "three
  // reports over three composed groups", which is the eager reading §11 v5
  // supersedes. Entering all three ids now writes ONE file with three
  // sections, and asserting the old count would be asserting the superseded
  // contract.
  if (reports() !== 1) fails.push(`--ids G1,G2,G3 wrote ${reports()} report(s) — §12 v6 makes it ONE report over the entered set, not one per group`);
  {
    const only = readdirSync(RD).filter((f) => f.startsWith("terrain-full-report-"))[0];
    const rec = JSON.parse(readFileSync(join(RD, only), "utf8"));
    if ((rec.sections || []).length !== 3) {
      fails.push(`the one report carries ${(rec.sections || []).length} section(s) over 3 entered ids — §12 v7 is one section per entered id`);
    }
    if (JSON.stringify(rec.identity.query.ids) !== JSON.stringify(["G1", "G2", "G3"])) {
      fails.push(`the identity's ids are ${JSON.stringify(rec.identity.query.ids)} — §12 v6 records the CANONICAL entered set`);
    }
  }
  // IDEMPOTENT ON THE SET, and re-entering in a DIFFERENT ORDER must collide
  // with the first — that is what set-based identity buys (§12 v6, AC2).
  run(["--ids", "G3,G1,G2"]);
  if (reports() !== 1) fails.push(`re-entering the same ids in a different order wrote ${reports()} report(s) — identity is set-based, so two typings of one set are ONE artifact (§12 v6)`);
  // The judge-pin validation is PRE-WRITE. A refusal that had already written
  // some of its targets would be a partial pass presenting as one, which is
  // the whole reason the validation is sited before the fan-out.
  const RD2 = mkdtempSync(join(tmpdir(), "terrain-allgroups-partial-"));
  const SUBS = join(RD2, "subs.json");
  writeFileSync(SUBS, JSON.stringify({ [`${TAG} × architecture`]: { judged: true, subgroups: [
    { subgroup: "sg", claim: "c", members: ["lesson:alpha"],
      composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true }] }}));
  const partial = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
     "--report-dir", RD2, "--ids", "G1,G2,G3", "--subdivisions", SUBS], { encoding: "utf8" });
  if (partial.status === 0) {
    fails.push("--ids with SubGroupClaims and no judge pin was ACCEPTED — the pin is §12.1's third identity component");
  }
  if (readdirSync(RD2).filter((f) => f.startsWith("terrain-full-report-")).length !== 0) {
    fails.push("the judge-pin refusal had already written some of its targets — a partial pass presenting as one, which is what siting the validation BEFORE the fan-out exists to prevent");
  }
}

// 3. kogaki#145's origin PROVENANCE. A derived member set and a recorded one
//    are otherwise indistinguishable at the gate.
// RE-POINTED at the composer with its block above (kogaki#625 item 1): `claim`
// is removed as an entry point and `composeClaimReoffer` is the same
// composition, reachable only from the `CLAIM_REOFFER` state. Spawned rather
// than imported so a refusal is observable — the runtime's refusals exit.
const claimRun = (dir, extra) => spawnSync(process.execPath, ["--input-type=module", "-e",
  `import { composeClaimReoffer, emitGateDeclaration } from "./terrain/terrain.mjs";
   import { readFileSync } from "node:fs";
   const a = { tag: ${JSON.stringify(TAG)}, group: "architecture", text: "recomposed",
               members: "lesson:alpha", ...${JSON.stringify(extra)} };
   const survey = JSON.parse(readFileSync(${JSON.stringify(FIXTURE)}, "utf8"));
   const r = composeClaimReoffer(a, ${JSON.stringify(dir)}, survey);
   emitGateDeclaration(${JSON.stringify(dir)}, "terrain-claim-reoffer", r.options, r.extra);`],
  { encoding: "utf8" });
const decl = (dir) => {
  const f = readdirSync(dir).find((x) => x.endsWith(".run-declaration.json"));
  return f ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null;
};
const dDer = mkdtempSync(join(tmpdir(), "prov-derived-"));
claimRun(dDer, { "original-text": "orig" });
const gDer = decl(dDer);
const dRec = mkdtempSync(join(tmpdir(), "prov-recorded-"));
claimRun(dRec, { "original-text": "orig", "original-members": "lesson:alpha,lesson:bravo" });
const gRec = decl(dRec);
if (!gDer || !gRec) fails.push("the provenance cases emitted no gate run declaration");
else {
  if (gDer.original_members_provenance !== "derived") {
    fails.push(`a DERIVED origin member set is not announced as derived: ${JSON.stringify(gDer.original_members_provenance)} — the substitution is silent, and a derived set is indistinguishable at the gate from a recorded one (SPEC.md §7 v5.1)`);
  }
  if (gRec.original_members_provenance !== "recorded") {
    fails.push(`a RECORDED origin member set is announced as ${JSON.stringify(gRec.original_members_provenance)}`);
  }
  // The two produce the SAME member set — which is exactly why the marking is
  // the only thing that distinguishes them, and why asserting on the set alone
  // could never have caught this.
  if (JSON.stringify(gDer.original_members) !== JSON.stringify(gRec.original_members)) {
    fails.push("the derived and recorded cases no longer produce the same member set, so this pair no longer discriminates the marking from the value");
  }
  if (gDer.original_source === gRec.original_source) {
    fails.push("the derived and recorded origins carry the same `original_source` prose — the announcement is not at the point of substitution");
  }
}
// A written value, never an omission: the absent branch says `none` rather
// than dropping the field, so the three states are greppable.
const dNone = mkdtempSync(join(tmpdir(), "prov-none-"));
claimRun(dNone, {});
const gNone = decl(dNone);
if (!gNone || gNone.original_members_provenance !== "none") {
  fails.push(`the absent-origin branch omits its provenance rather than writing \`none\` — an omitted field and a field reading \`none\` are the same silence to a reader and different silences to a grep`);
}

if (fails.length) {
  console.log("FAIL v5 residuals + origin provenance:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`v5 residuals + origin provenance: PASS — ${seamAbsent ? "seam-free cases" : "cases"} exercised `
  + "(tagRow keeps the tag name and Lesson count, drops the Journey half, renders no "
  + "off-allowlist line class, and is still wired into screen 1"
  + (seamAbsent ? "" : "; --all-groups writes one report per group, is idempotent, and its "
  + "judge-pin refusal writes NOTHING")
  + "; derived vs recorded vs none provenance all distinguished over an identical member set)");
JS

# --- subdivide COMMAND fixture (kogaki#165) ----------------------------------
#
# WHY THIS IS AN EXTENSION AND NOT A TENTH CHECK. §8's subdivision record is
# terrain composition — this member's admission record already names §6.2's
# SubGroup judging and §8's schema is the same survey-schema.json carrier — so
# the coverage lands inside the declared contract and no admission record is
# owed. The registry `contract` field is corrected in the same diff to name
# what is now covered, which is kogaki#145's finding 1 applied to itself.
#
# WHAT IT DISCRIMINATES. `subdivide` crashed on EVERY invocation with
# `ReferenceError: vd is not defined` from story 1.31's extraction until
# kogaki#165 — for the whole of that window no registered check invoked the
# COMMAND, only its exported composers, and the co-tag screen reaches
# subdivision through `subgroupPlacement` + `judgeSubgroup` and never through
# `cmdSubdivide`, so every exercised path masked a dead command. Coverage of
# the composers could not have caught it and still cannot; only the command
# path can. Case 1 is that regression, held at the command.
#
# Cases 2 and 3 exist because removing the crash is not the same as restoring
# the instrument: `legible_at_a_glance: false` (or `: true`) as a literal also
# stops the ReferenceError and reports a quantity that no longer reads the
# judge's verdict. So the third instrument is asserted to DISCRIMINATE over two
# otherwise-identical runs, and the PLACEMENT-COMPOSED `(fits no composed SubGroup)`
# SubGroup — whose verdicts are composed by placement rather than supplied by
# the judge — is asserted to carry it too, that being the one SubGroup no
# judge input can set.
#
# Seam-free by construction: `subdivide` reads the survey record and the
# classification file and never reaches the gateway, so this block runs
# everywhere.
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const TAG = "testing";
const GROUP = "architecture";  // parent members: lesson:alpha, lesson:bravo
const SCHEMA = JSON.parse(readFileSync("specs/spec-terrain/survey-schema.json", "utf8")).subdivision;
const fails = [];

// The instrument list and the fallback SubGroup's name are READ from the
// single carrier, never restated here — the same discipline the blocks above
// hold for the survey field lists.
const INSTRUMENTS = SCHEMA.instruments.required;
const NO_FIT = SCHEMA.no_member_hidden_subgroup;

const write = (dir, name, body) => {
  const p = join(dir, name);
  writeFileSync(p, JSON.stringify(body, null, 2) + "\n");
  return p;
};

// One invocation of the COMPOSER — the whole point of this block. Everything it
// needs is supplied per run; no numeric constant enters the runtime (§8).
//
// RE-POINTED, NOT WEAKENED (kogaki#625 item 1). This drove `terrain.mjs
// subdivide`, which §15.6.2 removes as an entry point; the composition did not
// move, it became `composeSubdivisionRecord`, reachable only from the
// `J2_subdivision` state. Spawned rather than imported because every case below
// turns on whether the runtime REFUSED, and a refusal exits the process.
const subdivide = (classification) => {
  const dir = mkdtempSync(join(tmpdir(), "subdivide-"));
  const cls = write(dir, "classification.json", classification);
  const r = spawnSync(process.execPath, ["--input-type=module", "-e",
    `import { composeSubdivisionRecord } from "./terrain/terrain.mjs";
     import { readFileSync } from "node:fs";
     composeSubdivisionRecord({ tag: ${JSON.stringify(TAG)}, group: ${JSON.stringify(GROUP)},
       "group-claim": "the parent group's line", "judge-model": "fixture-judge",
       "judge-effort": "low", "screen-budget": "40", classification: ${JSON.stringify(cls)} },
       ${JSON.stringify(dir)}, JSON.parse(readFileSync(${JSON.stringify(FIXTURE)}, "utf8")));`],
    { encoding: "utf8" });
  const f = readdirSync(dir).find((x) => x.endsWith(".terrain-subdivision.json"));
  return { r, dir, record: f ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null };
};

const sg = (name, extra) => ({
  subgroup: name,
  claim: "a line narrower than the parent's, composed over the placed members",
  members: ["lesson:alpha"],
  composes_honestly: true,
  tighter_than_parent: true,
  ...extra,
});

// Case 1 — THE REGRESSION. The command runs to completion and writes its
// record. The crash sat in the instruments loop, which every invocation
// executes BEFORE the record write, so a written record is the evidence the
// loop was reached and survived; the exit status alone would not say where.
const legible = subdivide([sg("the legible split", { legible_at_a_glance: true })]);
if (legible.r.status !== 0) {
  fails.push(`subdivide exited ${legible.r.status}: ${(legible.r.stderr || "").trim()}`);
}
if (/ReferenceError/.test(legible.r.stderr || "")) {
  fails.push(`subdivide raised a ReferenceError — the story-1.31 extraction left a name behind again: ${(legible.r.stderr || "").trim()}`);
}
if (!legible.record) {
  fails.push("subdivide wrote no subdivision record — the instruments loop runs before the write, so an unwritten record means the command did not get past it");
}

// Every SubGroup carries all three instruments, the list read from the schema.
for (const s of legible.record ? legible.record.subgroups : []) {
  const missing = INSTRUMENTS.filter((k) => s.instruments === undefined || s.instruments[k] === undefined);
  if (missing.length) fails.push(`SubGroup ${JSON.stringify(s.name)} is missing instrument(s) ${missing.join(", ")}`);
}

// Case 2 — THE INSTRUMENT DISCRIMINATES. Identical in every other respect, so
// the verdict is the only thing that can move the reported quantity. A literal
// in place of the read would pass case 1 and fail here.
const illegible = subdivide([sg("the legible split", { legible_at_a_glance: false })]);
if (illegible.r.status !== 0) {
  fails.push(`subdivide (illegible case) exited ${illegible.r.status}: ${(illegible.r.stderr || "").trim()}`);
}
const readInstrument = (res, name) => {
  const s = res.record && res.record.subgroups.find((x) => x.name === name);
  return s ? s.instruments.legible_at_a_glance : undefined;
};
const yes = readInstrument(legible, "the legible split");
const no = readInstrument(illegible, "the legible split");
if (yes !== true || no !== false) {
  fails.push(`the third instrument does not read the judge's verdict at the command: true-verdict reported ${JSON.stringify(yes)} and false-verdict reported ${JSON.stringify(no)} — removing the crash is not the same as restoring the quantity, and a literal passes every assertion that does not vary the input`);
}
// The rest of the record is genuinely identical, which is what makes the pair
// above a discrimination rather than two unrelated runs. `judge_verdicts` is
// the flipped INPUT carried through to the record and is excluded with the
// instruments — comparing it would only restate that the two runs differ where
// they were made to differ.
const strip = (res) => JSON.stringify((res.record ? res.record.subgroups : []).map(
  ({ instruments, judge_verdicts, ...rest }) => rest));
if (legible.record && illegible.record && strip(legible) !== strip(illegible)) {
  fails.push("the legible and illegible runs differ outside the instruments block, so the pair no longer isolates the verdict");
}

// Case 3 — THE PLACEMENT-COMPOSED SUBGROUP. `lesson:bravo` is placed by no judge
// SubGroup above, so it lands in the EXPLICIT named SubGroup whose verdicts
// placement composes. No judge input can set its instrument, which is why it
// is the one SubGroup a judge-supplied fixture would never cover.
const placementComposed = legible.record
  && legible.record.subgroups.find((s) => s.name === NO_FIT);
if (!placementComposed) {
  fails.push(`no ${JSON.stringify(NO_FIT)} SubGroup in the record — lesson:bravo was placed by no judge SubGroup and must be NAMED rather than dropped`);
} else {
  if (!placementComposed.members.includes("lesson:bravo")) {
    fails.push(`the ${JSON.stringify(NO_FIT)} SubGroup does not hold the unplaced member: ${JSON.stringify(placementComposed.members)}`);
  }
  const missing = INSTRUMENTS.filter((k) => placementComposed.instruments === undefined || placementComposed.instruments[k] === undefined);
  if (missing.length) {
    fails.push(`the ${JSON.stringify(NO_FIT)} SubGroup is missing instrument(s) ${missing.join(", ")} — its verdicts are composed by placement, so no classification fixture can supply them and only the command path reaches it`);
  }
  if (legible.record.cover.placed !== legible.record.cover.of) {
    fails.push(`the cover is incomplete: ${legible.record.cover.placed} of ${legible.record.cover.of}`);
  }
}

if (fails.length) {
  console.log("FAIL subdivide command fixture — §8's command path is not observed:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("subdivide command fixture: PASS — cases exercised (the COMMAND runs end to end "
  + "and writes its record past the instruments loop, no ReferenceError; the third instrument "
  + "discriminates a true from a false verdict over an otherwise-identical run; the "
  + `${JSON.stringify(NO_FIT)} SubGroup names the unplaced member and carries all three `
  + "instruments, the list read from the schema)");
JS

# --- compose-input BOUNDED-READ fixture (kogaki#163, story 1.33) -------------
#
# WHY THIS IS AN EXTENSION AND NOT A TENTH CHECK. `compose-input` is Terrain
# composition — it is the input half of §6.1/§6.2's claims and SubGroupClaims,
# both already inside this member's admission contract — so the coverage lands
# in the declared contract and no admission record is owed. The loop position
# is unchanged, which is the quantity the served line prices: "where a check
# sits in your workflow matters as much as how long it takes"
# (`a-checks-runtime-multiplies-by-its-loop-position`,
# gloss/lessons/claude-code-ops.md:11@12ba65dd). The registry `contract` is
# extended in the same diff to name what is now covered.
#
# WHAT IT DISCRIMINATES, and why the shape is unusual. The property is a COUNT
# OF SERVED-MATERIAL READS that must not grow with the placement count. Two
# things follow, and both are why this block does not look like the others:
#
#   1. THE COUNT IS OBSERVED, NEVER READ OFF THE ARTIFACT. `compose-input`
#      prints an accounting line and writes an `accounting` block; this check
#      reads neither as evidence. "If it survives because the check is reading
#      the system's own explanation of what it did, an explanation is not
#      evidence, and you need something else"
#      (`match-the-detectors-unit-to-the-propertys-unit`,
#      gloss/lessons/testing.md:131@12ba65dd). So the unit case counts calls
#      into an injected fetcher, and the command case counts lines a STUB
#      GATEWAY appended as it served them.
#
#   2. NO SINGLE RUN CAN DISPLAY IT. "Bounded by the candidates" and "grows
#      with the placements" agree on any one input; they disagree only across
#      inputs that hold the candidates fixed and multiply the placements. Case
#      2 is that pair, which is the same served line's other half — a property
#      that "survives because the problem is repetition or sameness" needs a
#      detector that looks across many outputs.
#
# Seam-free by construction, at BOTH layers: the unit cases inject their own
# fetcher, and the command case points the kit's own machine-local resolution
# ($TSUREZURE_GATEWAY_JS) at checks/fixtures/terrain/compose-input/stub-gateway.mjs.
# Nothing here reaches the real substrate, so the block runs in CI identically.
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { composeInput, cotagGroups, COMPOSITION_INPUT_BOUND, NO_GLOSS_BODY }
  from "./terrain/terrain.mjs";

const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const STUB = "checks/fixtures/terrain/compose-input/stub-gateway.mjs";
const record = JSON.parse(readFileSync(FIXTURE, "utf8"));
const fails = [];
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) fails.push(`${label}: got ${g}, want ${w}`);
};

// A fetcher that RECORDS every call. This is the detector's unit: the read
// itself, not the runtime's report of how many it took.
const counting = () => {
  const calls = [];
  const fn = (kind) => {
    calls.push(kind);
    return new Map([["alpha", { body: "alpha body", cite: "gloss/lessons/x.md:1@stub" }],
                    ["bravo", { body: "bravo body", cite: "gloss/lessons/x.md:2@stub" }],
                    ["charlie", { body: "charlie body", cite: "gloss/lessons/x.md:3@stub" }],
                    ["delta", { body: "delta body", cite: "gloss/lessons/x.md:4@stub" }],
                    ["echo", { body: "echo body", cite: "gloss/lessons/x.md:5@stub" }]]);
  };
  return { fn, calls };
};
const compose = (rec, tag) => {
  const members = rec.candidates.filter((c) => (c.tags || []).includes(tag));
  const groups = cotagGroups(members, tag);
  const c = counting();
  return { input: composeInput(rec, tag, groups, c.fn), calls: c.calls, groups };
};

// AC1 (§11 v10, kogaki#212) — THE PRODUCER HALF. Every consumer fixture above
// builds the composition pin by hand, so none of them would notice if
// `compose-input` stopped emitting one, or emitted an empty one. That gap is
// exactly the dead-fixture shape story 1.36 exists to catch, so the emitter is
// asserted here against a REAL `composeInput` call.
{
  const t = compose(record, "testing");
  const cp = t.input.composition_pin;
  if (!cp) {
    fails.push("compose-input emits no composition_pin — every downstream guard is then unreachable (§11 v10)");
  } else {
    eq("the pin names its tag", cp.tag, "testing");
    eq("the pin binds the survey record it was computed against", cp.pin, record.pin);
    // THE SERVED MEMBER SET, not a digest. A digest supports equality, not
    // subset, and can name no offender — which is why v10 corrected it.
    const served = cp.groups || {};
    eq("the pin carries one entry per composed group",
       Object.keys(served).sort(), t.groups.map((g) => g.name).sort());
    for (const g of t.groups) {
      eq(`the pin carries the MEMBER SET served for ${g.name}`,
         (served[g.name] || []).slice().sort(), g.members.slice().sort());
    }
    if (Object.values(served).every((v) => !Array.isArray(v) || v.length === 0)) {
      fails.push("the pin's groups carry no members — a subset check over an empty set admits nothing and names no offender");
    }
  }
}

// Case 1 — ONE SHARD PAIR, and only the half a member actually needs.
// `testing`: 4 members, one of them (lesson:alpha) carrying a Journey.
const testing = compose(record, "testing");
eq("the shards actually fetched for a tag with a Journey member", testing.calls, ["lessons", "journeys"]);
eq("material is one entry per CANDIDATE carrying the tag",
   testing.input.material.map((m) => m.id),
   ["lesson:alpha", "lesson:bravo", "lesson:charlie", "lesson:delta"]);
if (new Set(testing.input.material.map((m) => m.id)).size !== testing.input.material.length) {
  fails.push("material carries a duplicate member id — a member appearing in several groups must appear ONCE");
}
// `cost`: lesson:charlie and lesson:echo, neither carrying a Journey. The
// second fetch is CONDITIONAL, and a composer that took the pair
// unconditionally would pass case 1 and fail here.
eq("the journey shard is NOT fetched for a tag no member of which carries one",
   compose(record, "cost").calls, ["lessons"]);

// The structural half of the bound: groups carry IDS ONLY. A group that
// carried material would be a per-group copy, which is the shape the bound
// exists to make unwritable rather than merely discouraged.
const strayMaterial = testing.input.groups.filter((g) => g.members.some((m) => typeof m !== "string"));
if (strayMaterial.length) {
  fails.push(`a composed group carries member MATERIAL rather than ids (${strayMaterial.map((g) => g.name).join(", ")}) — the bound is structural: a member in several groups must have one entry to point at, not one copy per group`);
}
for (const g of testing.input.groups) {
  const unresolved = g.members.filter((id) => !testing.input.material.some((m) => m.id === id));
  if (unresolved.length) fails.push(`group ${JSON.stringify(g.name)} references ${unresolved.join(", ")}, which are in no material entry — an id-only group is only bounded if every id resolves`);
}
// The bound is DECLARED in the artifact rather than left to the reader.
eq("the artifact states its own bound", testing.input.bound, COMPOSITION_INPUT_BOUND);
// UNTRUNCATED, because §8's leaf condition asks whether a SubGroupClaim is
// TIGHTER THAN its parent's — a headline-only input would decide that conjunct
// by what the bound withheld rather than by the material.
if (testing.input.material.some((m) => m.gloss !== NO_GLOSS_BODY && /…|\.\.\.$/.test(m.gloss))) {
  fails.push("a material entry is truncated — the bound is on the number of reads, never on what a read returns (§12 forbids truncation anywhere)");
}

// Case 2 — READS DO NOT GROW WITH PLACEMENTS. The discriminator, and the one
// no single run can display: the SAME four candidates, re-tagged so the co-tag
// axis explodes the placement count, must cost the same reads.
const many = JSON.parse(readFileSync(FIXTURE, "utf8"));
const EXTRA = ["architecture", "cost", "agents", "testing-ops", "policy", "seam", "gates", "runtime", "records"];
for (const c of many.candidates) if ((c.tags || []).includes("testing")) c.tags = ["testing", ...EXTRA];
const exploded = compose(many, "testing");
const placementsOf = (r) => r.groups.reduce((n, g) => n + g.members.length, 0);
const before = placementsOf(testing), after = placementsOf(exploded);
if (!(after > before)) {
  fails.push(`the exploded record did not actually multiply the placements (${before} -> ${after}) — the pair no longer discriminates and the case below proves nothing`);
}
eq(`reads over ${after} placements (up from ${before}), same 4 candidates`, exploded.calls, testing.calls);
eq("material size over the exploded record — bounded by CANDIDATES",
   exploded.input.material.length, testing.input.material.length);

// Case 3 — THE COMMAND PATH, over a REAL transport and a stub gateway, with
// the reads counted by the server that served them. The unit cases above
// cannot see the wiring: a composer that passes every one of them while
// `cmdComposeInput` fetches per group would look identical here.
const dir = mkdtempSync(join(tmpdir(), "compose-input-"));
const LOG = join(dir, "gateway-calls.log");
// A survey record whose members sit in SEVERAL groups each, so the
// once-per-member property has something to be violated on at the command.
const multi = JSON.parse(readFileSync(FIXTURE, "utf8"));
for (const c of multi.candidates) if ((c.tags || []).includes("testing")) c.tags = ["testing", "architecture", "cost", "agents"];
const SURVEY = join(dir, "multi.terrain-survey.json");
writeFileSync(SURVEY, JSON.stringify(multi, null, 2) + "\n");

const run = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "compose-input", "--survey", SURVEY, "--tag", "testing", "--run-dir", dir],
  { encoding: "utf8", env: { ...process.env, TSUREZURE_GATEWAY_JS: STUB, STUB_GATEWAY_CALL_LOG: LOG } });
if (run.status !== 0) {
  fails.push(`compose-input exited ${run.status}: ${(run.stderr || "").trim() || String(run.stdout).slice(-400)}`);
}
const served = existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean) : [];
// THE COUNT THE SERVER OBSERVED. Four candidates in four groups each = 16
// placements; a per-group composer costs 16 reads and this costs 2.
eq("gateway calls the STUB actually served (not the number the run reported)",
   served, ['gloss_index {"tag":"lessons/testing"}', 'gloss_index {"tag":"journeys/testing"}']);

const artifact = readdirSync(dir).find((f) => f.startsWith("terrain-composition-input-"));
if (!artifact) {
  fails.push("compose-input wrote no artifact — the command path is what the composer reads, and a unit that passes while nothing invokes it is the orphan shape");
} else {
  const out = JSON.parse(readFileSync(join(dir, artifact), "utf8"));
  const placements = out.groups.reduce((n, g) => n + g.members.length, 0);
  if (placements <= out.material.length) {
    fails.push(`the command fixture has ${placements} placement(s) over ${out.material.length} candidate(s) — with placements at or below candidates the once-per-member property is vacuous here`);
  }
  eq("the artifact holds ONE entry per member across all its groups",
     out.material.length, new Set(out.groups.flatMap((g) => g.members)).size);
  if (out.material.some((m) => m.gloss === NO_GLOSS_BODY)) {
    fails.push("a member came back with no served rendering from the stub — the stub serves every fixture slug, so this is the address, not the material");
  }
}

// Case 4 — THE POINTER IS REACHABLE FROM THE SCREEN THAT NEEDS IT. A run that
// composed no claims lands on the claimless ABNORMAL block; the remedy there
// names the bounded input rather than "compose something", because composing
// per group is exactly what the ~19 minutes bought. Seam-free: `cotags` makes
// no gateway call.
const claimless = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", "testing"],
  { encoding: "utf8" });
if (!/compose-input --survey .* --tag testing/.test(String(claimless.stdout))) {
  fails.push("the claimless ABNORMAL block does not name `compose-input` — the bounded input is reachable only if the surface that needs it says so, and a mechanism nothing points at is the orphan shape one layer up");
}

// WHAT ACTUALLY RAN IS RECORDED, because the terminal PASS line must report
// exercised trials rather than intended ones (PR #240 review round 1, finding
// 4). The first version printed CANNOT-DETERMINE twice in CI and then asserted
// all of it as exercised — kogaki#209's specimen, a green line claiming
// protection that did not exist.
//   "treat this kind of check as having three results rather than two … when
//   it has none, report that you cannot tell instead of reporting that the
//   problem is fixed."  product-lab@dec0d568 gloss/lessons/testing.md:53
//   "if [the empty-input answer] matches its normal healthy output, the check
//   is missing and the failure is invisible by construction."  ibid.:107
const K234 = { split: "NOT REACHED", defaults: "NOT REACHED", gitignore: "NOT REACHED",
               material: "NOT REACHED", rerun: "NOT REACHED" };

// --- kogaki#234: the owner rendering exists, in the TREE, and the owner
// surface never names a machine-local path ---
//
// THE PROPERTY IS THE ARTIFACT'S LOCATION AND THE SURFACE'S WORDS, so both are
// asserted. Terrain was in a failed state under `specs/SPEC.md` §2.5 while a
// human-facing report lived under `~/.kogaki/` — and every §12.1 assertion
// passed throughout, because identity and idempotence are true of a file
// wherever it sits. A suite that could not see this is why the defect survived
// two ratified sittings.
{
  const tree = mkdtempSync(join(tmpdir(), "kogaki-tree-"));
  const run = mkdtempSync(join(tmpdir(), "kogaki-run-"));
  const subs = join(run, "subs.json");
  writeFileSync(subs, JSON.stringify({
    "testing × architecture": { judged: true, subgroups: [] },
  }));
  const r = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", "testing",
     "--ids", "G2", "--subdivisions", subs,
     "--report-dir", run, "--rendering-dir", join(tree, "reports"),
     "--judge-model", "m", "--judge-effort", "high"], { encoding: "utf8" });
  const out = String(r.stdout) + String(r.stderr);

  // SEAM-AWARE, exactly as every other report-running block here: `report`
  // reads served Gloss renderings, so with no gateway it degrades with exit 11.
  // A fixture reading that as failure would be RED on every machine without a
  // seam and green on the author's — the PR #225 signature.
  const seamAbsent = r.status === 11
    || (r.status !== 0 && /policy_source unavailable|gateway/i.test(out));

  if (seamAbsent) {
    K234.split = "CANNOT-DETERMINE (seam unavailable)";
    console.log("kogaki#234 artifact split: CANNOT-DETERMINE — the served seam is "
      + "unavailable here and `report` reads served Gloss through it. The "
      + "gitignore assertion below is seam-free and RAN.");
  } else if (r.status !== 0) {
    K234.split = `FAILED (exit ${r.status})`;
    fails.push(`the report run failed (exit ${r.status}): ${out.trim().slice(0, 200)}`);
  } else {
    K234.split = "RAN";
    const rdir = join(tree, "reports");
    const mds = existsSync(rdir) ? readdirSync(rdir).filter((f) => f.endsWith(".md")) : [];
    if (mds.length === 0) {
      fails.push("no owner RENDERING was written to the tree — the run produced a machine record and left the owner exactly where kogaki#234's ruling found them");
    }
    // §12.2 v12 (kogaki#440): EXACTLY ONE, under the FIXED NAME. Asserting
    // only `!== 0` above passes on the 25-file accumulation the ruling was
    // written against, so the count and the name are asserted here and not
    // left to the by-construction argument — a future path that writes a
    // rendering without going through `renderingsDir()` is invisible to that
    // argument and visible to this.
    if (mds.length > 1) {
      fails.push(`the tree holds ${mds.length} owner renderings (${mds.join(", ")}) — §12.2 v12 allows exactly one, and a run leaving two or more is a failed run`);
    }
    if (mds.length && !mds.includes("FullReport.md")) {
      fails.push(`the owner rendering is named ${mds[0]} — §12.2 v12 makes the name normative (reports/FullReport.md); a machine-oriented name declares the file machine-facing exactly as a hidden directory does`);
    }
    if (readdirSync(run).filter((f) => f.endsWith(".json") && f.startsWith("terrain-full-report-")).length === 0) {
      fails.push("no machine RECORD was written to the run workspace — the split is two artifacts, and dropping the record trades one violation for another");
    }
    if (mds.length) {
      const body = readFileSync(join(rdir, mds[0]), "utf8");
      // READABLE, not a JSON blob behind a .md name: the whole ruling is about
      // what the owner opens.
      if (!/^# Full Report/m.test(body) || !/^## /m.test(body)) {
        fails.push("the owner rendering is not owner-register Markdown — a machine format behind a .md name satisfies the location clause and defeats its purpose");
      }
      if (/^\s*[{[]/.test(body)) fails.push("the owner rendering is serialized JSON");
    }
    // §2.5 clause 3 — THE OWNER SURFACE. This block points `--rendering-dir`
    // OUTSIDE the repository, where `relFromRepo` returning an absolute path is
    // the documented and correct behaviour (hiding a location the owner cannot
    // otherwise find would be worse). So the absolute-path property is asserted
    // in the DEFAULTS block below, where the rendering genuinely sits in-tree.
    if (/\.kogaki\//.test(out) || /\.local\//.test(out)) {
      fails.push("the owner surface printed a machine-local hidden path — §2.5 clause 3 forbids it outside debugging, and naming one tells the owner the opposite of what is true");
    }
    if (!/reports\/[^\s]*\.md/.test(out)) {
      fails.push("the owner surface does not name the repo-relative rendering path — a file the owner cannot find is not repo-visible in any sense that matters");
    }
  }
  rmSync(tree, { recursive: true, force: true });
  rmSync(run, { recursive: true, force: true });
}

// THE DEFAULT LOCATION, EXERCISED (kogaki#234). The block above passes
// `--rendering-dir`, so it proves the flag and says NOTHING about where a real
// run writes — and a real run is what the owner ruling is about. Pointing the
// mutation probe at the default is what caught this: moving the default back
// to `~/.kogaki/reports` left every assertion above green.
//
// This is the dead-fixture class kogaki#230 binds, arriving through an
// override rather than through a missing assertion: a fixture that supplies
// the value under test cannot see the default drift.
{
  const run2 = mkdtempSync(join(tmpdir(), "kogaki-run2-"));
  const subs2 = join(run2, "subs.json");
  writeFileSync(subs2, JSON.stringify({
    "testing × architecture": { judged: true, subgroups: [] },
  }));
  // NEITHER default is overridden here (PR #240 review round 1, finding 3).
  // The first version passed `--report-dir`, so the `.kogaki` assertions were
  // evaluated over a path the fixture itself supplied — the same
  // fixture-supplies-the-value-under-test class as the rendering flag, one flag
  // over. `KOGAKI_RUN_DIR` steers the RECORD the way the product intends
  // (`reportsDir` reads it), so the run is redirected by the ENVIRONMENT rather
  // than by a flag that bypasses the default expression under test.
  //   "Write down each path and which passing run covers it; a path with no
  //   named run is untested no matter how healthy the overall suite looks."
  //   product-lab@dec0d568 gloss/lessons/testing.md:155
  // §12.2 v12 — this block exercises the DEFAULT rendering location, so the
  // harness-level KOGAKI_REPORTS_DIR shield is removed from its env; and
  // because the default IS the owner's real reports/FullReport.md, the
  // pre-existing file is saved first and restored below, so the check never
  // leaves fixture material standing as the owner's report.
  const env2 = Object.assign({}, process.env, { KOGAKI_RUN_DIR: run2 });
  delete env2.KOGAKI_REPORTS_DIR;
  const OWNER_MD2 = "reports/FullReport.md";
  const priorOwnerMd2 = existsSync(OWNER_MD2) ? readFileSync(OWNER_MD2) : null;
  const d = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", "testing",
     "--ids", "G2", "--subdivisions", subs2,
     "--judge-model", "m", "--judge-effort", "high"],
    { encoding: "utf8", env: env2 });
  const dout = String(d.stdout) + String(d.stderr);
  const dSeamAbsent = d.status === 11
    || (d.status !== 0 && /policy_source unavailable|gateway/i.test(dout));
  if (dSeamAbsent) {
    K234.defaults = "CANNOT-DETERMINE (seam unavailable)";
    console.log("kogaki#234 default location: CANNOT-DETERMINE — seam unavailable.");
  } else if (d.status !== 0) {
    K234.defaults = `FAILED (exit ${d.status})`;
    fails.push(`the default-location run failed (exit ${d.status}): ${dout.trim().slice(0, 160)}`);
  } else {
    K234.defaults = "RAN";
    if (/\.kogaki\//.test(dout)) {
      fails.push("with NO --rendering-dir, the owner surface names a machine-local path — the DEFAULT is where a real run lands, and the ruling is about real runs");
    }
    if (!/^Full Report — READ THIS ONE[^\n]*: reports\//m.test(dout)) {
      fails.push("the default rendering path is not repo-relative `reports/…` — the default must satisfy §2.5 without the operator passing a flag");
    }
    // The RECORD's own default expression, read from source rather than from a
    // run: with KOGAKI_RUN_DIR set above the default branch is not taken, and a
    // fixture that only exercised the steered path would say nothing about the
    // retired directory kogaki#234 acceptance 4 removes.
    // NO OWNER-SURFACE LINE CARRIES AN ABSOLUTE MACHINE PATH, asserted on the
    // PROPERTY rather than on the `.kogaki` string. Matching that substring
    // alone cannot see an unconditional absolute print, because every block
    // steers storage to a tmpdir and `/tmp/…` passes a `.kogaki` test — the
    // THIRD appearance in this one change of "the fixture cannot see what the
    // fixture supplied". Here both locations are defaults, so an absolute path
    // on either line is the defect §2.5 clause 3 names.
    for (const line of dout.split("\n")) {
      // The five-directory enumeration this replaced was the same
      // scoped-to-the-spelling defect one level out from the `.kogaki`
      // substring above (PR #254 round 2, finding D): blind to /opt, /srv,
      // /mnt or any directory a future run workspace sits under. Tested as the
      // property — a token beginning at the root, or at `~/`. POSIX only, and
      // said so rather than implied.
      if (/^(Full Report|machine record)/.test(line)
          && line.split(/\s+/).some((t) => /^~?\//.test(t) && t.length > 1)) {
        fails.push(`an owner-surface line prints an ABSOLUTE path: ${line.trim().slice(0, 120)} — §2.5 clause 3 keeps machine paths off the owner surface outside debugging, and a tmpdir is no better than a home directory`);
      }
    }

    // SCOPED TO THE FUNCTION UNDER TEST, not to the file. The retired path is
    // still named once on purpose — `retireLegacyReportsDir` has to name what
    // it removes — so a whole-file scan reports the disposal code as the
    // defect. Same scoping trap the sweep's blocking-literal tripwire hit; the
    // fix is the same and the comment survives as the record.
    const src = readFileSync("terrain/terrain.mjs", "utf8");
    const body = (src.split("function reportsDir(args) {")[1] || "").split("\n}")[0];
    if (!body) {
      fails.push("could not locate reportsDir's body — this assertion is scoped to that function and cannot report a pass it did not earn");
    } else if (/\.kogaki",\s*"reports"/.test(body.replace(/\s+/g, " "))) {
      fails.push("the machine record still DEFAULTS to ~/.kogaki/reports — acceptance 4 retires that directory, and with no KOGAKI_RUN_DIR a real run would write it");
    }
  }
  // Restore the owner's real report (or its absence) regardless of which
  // branch above ran — fixture material must not survive as FullReport.md.
  if (priorOwnerMd2 !== null) writeFileSync(OWNER_MD2, priorOwnerMd2);
  else rmSync(OWNER_MD2, { force: true });
  rmSync(run2, { recursive: true, force: true });
}

// --- kogaki#234, the 2026-08-08 DOGFOOD FALSIFICATION: what the rendering
// CARRIES, and what the RERUN's owner surface SAYS -------------------------
//
// Acceptance items 2 and 5 were verified LANDED by artifact inspection and then
// falsified by a live run, which is the failure mode #234's own remedy (c)
// exists to name. Both defects are kogaki#243 FORM E — prose asserting a
// property no carrier holds — and both shipped past a fixture that was green:
//
//   A. The rendering opened with `> Untruncated.` and printed `- journey: 1`
//      in its Counted block while carrying no journey and no served cite at
//      all. `grep -c "gloss/lessons/"` over every file in `reports/` returned
//      ZERO. The record carries `cite`, `gloss_cite`, `journey_gloss` and
//      `journey_cite` per member; the renderer emitted `id` and `gloss`.
//   B. With KOGAKI_DEBUG unset, a RERUN printed the absolute
//      `/home/…/.kogaki/runs/reports/….json` and NO repo-relative rendering
//      path at all. PR #240 round 1 finding 2 fixed exactly this on the
//      fresh-write branch and left the rerun branch untouched — and a rerun is
//      the path a SECOND look always takes.
//
// WHY THE EXISTING BLOCKS COULD NOT SEE EITHER. They assert that a `.md` was
// written, that it opens `# Full Report`, that it has an `## ` heading and is
// not JSON, and that the FRESH run's surface names `reports/…`. Every one of
// those is true of a rendering that dropped four of its six served fields, and
// every one is evaluated on the first invocation only.
//
// SO THIS BLOCK ASSERTS THE RENDERED BYTES AGAINST THE RECORD THAT PRODUCED
// THEM, and asserts finding B on the SECOND invocation specifically. The
// expected values are READ OUT OF THE MACHINE RECORD rather than written here:
// a literal copied into the fixture is a second author's belief, and the
// property is that the two artifacts agree.
//
// THE SEAM IS THE STUB, not the real gateway — the same stub, resolved the
// same way, that case 3 above already uses. The pre-existing kogaki#234 blocks
// leave the seam unset and so read CANNOT-DETERMINE on every machine without
// one, which for THESE two properties would mean asserting nothing anywhere:
// the material only exists on a run that reached served Gloss.
{
  const run3 = mkdtempSync(join(tmpdir(), "kogaki-run3-"));
  const subs3 = join(run3, "subs.json");
  writeFileSync(subs3, JSON.stringify({
    "testing × architecture": { judged: true, subgroups: [] },
  }));
  const argv = ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", "testing",
    "--ids", "G2", "--subdivisions", subs3,
    "--judge-model", "m", "--judge-effort", "high"];
  // NEITHER RENDERING LOCATION IS OVERRIDDEN. `--rendering-dir` would supply
  // the value under test, which is the class PR #240 round 1 finding 3 already
  // caught once in this file; the record is steered by KOGAKI_RUN_DIR, which is
  // the product's own environment variable rather than a flag that bypasses the
  // default expression.
  const env3 = Object.assign({}, process.env, {
    KOGAKI_RUN_DIR: run3, TSUREZURE_GATEWAY_JS: STUB,
  });
  delete env3.KOGAKI_REPORTS_DIR;
  delete env3.KOGAKI_DEBUG;
  const seamOut = (r) => String(r.stdout) + String(r.stderr);
  const seamAbsent3 = (r) => r.status === 11
    || (r.status !== 0 && /policy_source unavailable|gateway/i.test(seamOut(r)));
  const count = (hay, needle) => hay.split(needle).length - 1;

  // §12.2 v12 — the DEFAULT rendering location is under test here, and it is
  // the owner's real reports/FullReport.md. Save the pre-existing file so the
  // block's runs (which overwrite it with fixture material) can restore it.
  const priorOwnerMd3 = existsSync("reports/FullReport.md")
    ? readFileSync("reports/FullReport.md") : null;

  const r1 = spawnSync(process.execPath, argv, { encoding: "utf8", env: env3 });
  if (seamAbsent3(r1)) {
    K234.material = "CANNOT-DETERMINE (seam unavailable)";
    K234.rerun = "CANNOT-DETERMINE (seam unavailable)";
    console.log("kogaki#234 rendered material + rerun surface: CANNOT-DETERMINE — the "
      + "stub gateway did not answer, so neither property was asserted here.");
  } else if (r1.status !== 0) {
    // A THROWN ERROR IS NOT A PASS. The fresh run is a precondition of both
    // properties below, so a non-zero exit that is not the declared degrade is
    // reported as a failure rather than skipped over.
    K234.material = `FAILED (exit ${r1.status})`;
    K234.rerun = `FAILED (exit ${r1.status})`;
    fails.push(`the fresh report run failed (exit ${r1.status}): ${seamOut(r1).trim().slice(0, 200)}`);
  } else {
    const recName = readdirSync(run3).find((f) => f.startsWith("terrain-full-report-") && f.endsWith(".json"));
    // §12.2 v12 — the rendering is the ONE fixed-name owner file; the record
    // alone carries identity, so the rendering's name derives from nothing.
    const md = join("reports", "FullReport.md");
    if (!recName || !existsSync(md)) {
      K234.material = "FAILED";
      K234.rerun = "FAILED";
      fails.push("the fresh run produced no record/rendering pair at the DEFAULT rendering location — every assertion below reads those two artifacts against each other and can report nothing without both");
    } else {
      const rec = JSON.parse(readFileSync(join(run3, recName), "utf8"));
      // §12 v7 (kogaki#314) — members live inside SECTIONS now. Read every
      // section's, flat or subdivided, and fall back to the pre-v7 top-level
      // shape so a record written before this change still reads.
      const members = (rec.sections && rec.sections.length
        ? rec.sections.flatMap((sec) => (sec.members && sec.members.length
            ? sec.members
            : (sec.subgroups || []).flatMap((sg) => sg.members || [])))
        : (rec.members && rec.members.length ? rec.members
            : (rec.subgroups || []).flatMap((sg) => sg.members || [])));
      const withJourney = members.filter((m) => m.journey_gloss !== null && m.journey_gloss !== undefined);

      // THE FIXTURE MUST BE ABLE TO FAIL. Each of these guards a way the block
      // could report a pass it did not earn — no members, no journey to drop,
      // or a single-line body that a flattening renderer carries just as well.
      if (members.length === 0) {
        fails.push("the record carries no members — the rendered-material assertions below would be vacuously true");
      }
      if (withJourney.length === 0) {
        fails.push("no member in the record carries a Journey — the dropped-Journey property (the `- journey: 1` with no journey) has nothing to be violated on here");
      }
      if (withJourney.length === members.length) {
        fails.push("every member carries a Journey — the no-Journey statement has no member to be stated about, so half the rendering's Journey contract is unexercised");
      }
      if (!members.some((m) => String(m.gloss).includes("\n"))) {
        fails.push("no served Gloss body in the record is multi-line — a one-line body fits a bullet row, so this block cannot distinguish a whole-body renderer from the flattening one it replaced");
      }
      // THE LESSON AND JOURNEY BODIES MUST DIFFER (PR #254 round 2, finding C).
      // The stub served BYTE-IDENTICAL text for a slug's `lessons/` and
      // `journeys/` shards, so `body.includes(journey_gloss)` was satisfied by
      // the Lesson Gloss alone: the Journey assertions passed over a rendering
      // with no Journey in it. That is this block's own defect class arriving
      // through the fixture's material rather than through its assertions, and
      // it is the guard that makes the stub-gateway mutant catchable HERE
      // rather than only by re-running the production mutation pass.
      for (const m of withJourney) {
        if (String(m.gloss) === String(m.journey_gloss)) {
          fails.push(`${m.id}'s Lesson and Journey Gloss bodies are byte-identical in the record — every Journey assertion below is then satisfied by the Lesson Gloss alone, and a rendering that dropped the Journey entirely would pass`);
        }
      }

      // THE RENDERED BYTES, ASSERTED AGAINST THE RECORD. `includes` of the
      // WHOLE body is the completeness property stated directly: a truncated,
      // headline-only or ellipsised rendering fails it, and a prefix assertion
      // would not.
      // THE CITE ASSERTIONS ARE UNCONDITIONAL (PR #254 round 2, finding A).
      // They previously read `if (m.cite && !body.includes(m.cite))`, and that
      // `&&` is a PREMISE NOTHING ASSERTED: with a null cite in the record the
      // assertion did not run, the block still reported PASS, and the state it
      // waved through — a rendering carrying no served cite at all — is the
      // exact defect this PR repairs. kogaki#243 form D, a failure absorbed
      // with the PASS surviving, reading on the guard rather than on a thrown
      // exception. So an absent cite is now REPORTED as the missing premise it
      // is, and the record-side and rendering-side conditions are separate
      // sentences rather than one conjunction that can vanish.
      // §12 v12 (story 1.56) — the RECORD keeps the full `file:line@pin` cite;
      // the RENDERING carries it BARE, because the substrate pin is stated once
      // in the identity. So the assertion still requires the cite to reach the
      // owner, and requires it in the form the contract now specifies. Reading
      // the record for the full value and the rendering for the bare one is the
      // point: it catches a renderer that drops the cite AND a renderer that
      // re-attaches the pin.
      const bare = (v) => {
        const t = String(v); const at = t.lastIndexOf("@");
        return at === -1 ? t : t.slice(0, at);
      };
      const assertCite = (value, body, where, label) => {
        if (value === null || value === undefined || String(value) === "") {
          fails.push(`${where}: ${label} is ABSENT FROM THE RECORD — the rendering assertion for it has no premise, and a served surface returning no cite is indistinguishable here from a renderer that dropped it, which is the state this whole block exists to detect`);
        } else if (!body.includes(bare(value))) {
          fails.push(`${where}: ${label} (bare: \`${bare(value)}\`) appears nowhere in the rendered bytes`);
        } else if (String(value) !== bare(value) && body.includes(String(value))) {
          fails.push(`${where}: ${label} rendered WITH its \`@<pin>\` (\`${value}\`) — §12 v12 states the pin exactly once per file, in the identity, and every other cite bare (kogaki#315)`);
        }
      };
      const assertMaterial = (body, where) => {
        // §14.3 — stated once over the whole rendering rather than once per
        // member, so a leak reports as one finding instead of N.
        if (/lesson:[a-z]/.test(body)) {
          fails.push(`${where}: an element name (\`lesson:<slug>\`) reached the owner rendering — SPEC.md §14.3: no owner surface renders an element name, the rendered token is the display_id`);
        }
        for (const m of members) {
          const id = m.id;
          // §14.3 (story 1.53) — the rendering names the member by its
          // display_id. The `id` stays the key everything else here is keyed
          // on, because it is what the RECORD carries; only what reaches the
          // owner moved.
          const shown = m.display_id;
          if (!shown) {
            fails.push(`${where}: member ${id} carries no display_id in the record — SPEC.md §14.3 assigns one once, in the survey record, and the rendering has nothing to name it by`);
          } else if (!body.includes(shown)) {
            fails.push(`${where}: member ${id} is not named by its display_id (${shown}) in the rendering`);
          }
          assertCite(m.cite, body, where, `the member → SERVED-LINE map for ${id} (§12 requires the report to carry it)`);
          assertCite(m.gloss_cite, body, where, `the Lesson Gloss cite for ${id} (the \`grep -c "gloss/lessons/"\` returning ZERO that the 2026-08-08 run measured)`);
          if (!body.includes(String(m.gloss))) {
            fails.push(`${where}: the COMPLETE Lesson Gloss for ${id} is not in the rendering — §12 requires the complete Glosses with no truncation anywhere, and the file asserts \`> Untruncated.\` while it holds`);
          }
          if (m.journey_gloss !== null && m.journey_gloss !== undefined) {
            if (!body.includes(String(m.journey_gloss))) {
              fails.push(`${where}: the COMPLETE Journey Gloss for ${id} is not in the rendering — the Counted block prints a journey count with nothing behind it`);
            }
            assertCite(m.journey_cite, body, where, `the Journey Gloss cite for ${id}`);
          }
        }
        // THE COUNTED BLOCK AND THE BODY MUST AGREE. `- journey: 1` over a file
        // containing no journey is the specimen; a count and a carrier that can
        // disagree silently is what let it ship.
        const journeyBlocks = count(body, "**Journey Gloss**");
        if (journeyBlocks !== members.length) {
          fails.push(`${where}: ${journeyBlocks} Journey Gloss statement(s) for ${members.length} member(s) — every member states its Journey or states that it has none, so absence is never silence`);
        }
        const citedJourneys = count(body, "**Journey Gloss** — `");
        if (citedJourneys !== withJourney.length) {
          fails.push(`${where}: ${citedJourneys} cited Journey Gloss(es) in the rendering against ${withJourney.length} in the record — the rendering disagrees with the artifact it derives from`);
        }
        const counted = (rec.counted || {}).journey || 0;
        if (counted !== withJourney.length) {
          fails.push(`${where}: the Counted block claims journey: ${counted} while ${withJourney.length} member(s) carry one`);
        }
      };

      const fresh = readFileSync(md, "utf8");
      assertMaterial(fresh, "fresh rendering");
      K234.material = "RAN";

      // --- FINDING B: THE RERUN BRANCH, WHICH IS A DIFFERENT BRANCH ---------
      // The rendering is REMOVED first. A rerun that returned early would leave
      // it removed, so its reappearance is the observable for "both are written
      // in the same act" (§12.2 v11) and the whole block below cannot pass by
      // reading the FIRST run's leftovers.
      rmSync(md, { force: true });
      const r2 = spawnSync(process.execPath, argv, { encoding: "utf8", env: env3 });
      const out2 = String(r2.stdout);
      if (r2.status !== 0) {
        K234.rerun = `FAILED (exit ${r2.status})`;
        fails.push(`the RERUN failed (exit ${r2.status}): ${seamOut(r2).trim().slice(0, 200)}`);
      } else {
        K234.rerun = "RAN";
        // THE RERUN BRANCH IS THE ONE UNDER TEST, so the block proves it took
        // that branch. Without this the assertions below would be satisfied by
        // a second FRESH write, which passes already and proves nothing.
        if (!/IDEMPOTENT/.test(out2)) {
          fails.push("the second invocation did not report the idempotent rerun — this block asserts the RERUN branch's owner surface, and it cannot assert a branch it did not reach");
        }
        if (!existsSync(md)) {
          fails.push("the rerun did not write the owner rendering — §12.2 v11 says both artifacts are written in the same act, and a rerun that regenerates only the machine record leaves a deleted, stale or never-rendered file standing while reporting success");
        } else {
          const again = readFileSync(md, "utf8");
          assertMaterial(again, "rerun rendering");
          if (again !== fresh) {
            fails.push("the rerun's rendering differs BYTE FOR BYTE from the fresh one — the rendering is a pure function of the record, so a difference means one of them is not");
          }
        }
        if (!/^Full Report — READ THIS ONE[^\n]*: reports\//m.test(out2)) {
          fails.push("the RERUN's owner surface carries no repo-relative `reports/…` READ THIS ONE line — §12.2 v11's pointer is dropped on the path a second look always takes");
        }
        if (/\.kogaki\//.test(out2)) {
          fails.push("the RERUN's owner surface names a machine-local hidden path — §2.5 clause 3 forbids it outside debugging");
        }
        // THE PROPERTY IS "ABSOLUTE PATH", TESTED AS THE PROPERTY (PR #254
        // round 2, finding D). The first version enumerated five directory
        // names — `/(home|tmp|var|Users|root)/` — which is the same defect one
        // level out from the `.kogaki` substring it replaced: a guard scoped to
        // the current SPELLINGS rather than to the thing (kogaki#243 form C),
        // and blind to `/opt`, `/srv`, `/mnt`, `/data` or any directory a
        // future run workspace sits under. A path is ABSOLUTE if it begins at
        // the root, so that is what is tested: any whitespace-delimited token
        // starting with `/` or with `~/`, the ruling's own two spellings for
        // "not where the owner works".
        //
        // DECLARED LIMIT: this is the POSIX rule. A Windows-style `C:\…` is not
        // detected, and no carrier in this repository produces one — stated
        // rather than left for the next reader to discover the same way this
        // finding was discovered.
        for (const line of out2.split("\n")) {
          const abs = line.split(/\s+/).filter((t) => /^~?\//.test(t) && t.length > 1);
          if (abs.length) {
            fails.push(`the RERUN prints an ABSOLUTE path on the owner surface (${abs[0]}): ${line.trim().slice(0, 140)} — §2.5 clause 3 keeps machine paths off the owner surface outside debugging`);
          }
        }
      }

      // THE DEBUGGING EXCEPTION IS AN AFFORDANCE, asserted in its own
      // direction. §2.5 clause 3 excepts debugging, so a fix that simply
      // deleted the record line would satisfy every assertion above while
      // removing the operator's only way to find the file. Asserting only the
      // refusal cannot tell a guard from a deletion.
      const r3 = spawnSync(process.execPath, argv,
        { encoding: "utf8", env: Object.assign({}, env3, { KOGAKI_DEBUG: "1" }) });
      if (r3.status === 0) {
        if (!String(r3.stdout).includes(join(run3, recName))) {
          fails.push("with KOGAKI_DEBUG=1 the rerun does not print the machine record's full path — the clause excepts debugging, and a deleted line is not a guard");
        }
        if (!/IDEMPOTENT/.test(String(r3.stdout))) {
          fails.push("the KOGAKI_DEBUG invocation did not take the rerun branch, so it asserts the debugging exception on the wrong path");
        }
      } else {
        fails.push(`the KOGAKI_DEBUG rerun failed (exit ${r3.status}) — the debugging direction was not asserted`);
      }

      // AND THE OPT-OUT STILL OPTS OUT on the rerun path. `--no-render` is
      // §12.2 v11's named opt-out; a rerun that wrote the rendering regardless
      // would be a second default wearing a flag's name.
      //
      // THE EXIT IS ASSERTED FIRST, AS ITS OWN SENTENCE (PR #254 round 2,
      // finding B). The first version read `if (r4.status === 0 && existsSync(md))`,
      // which reads a non-zero exit as "nothing to check" while every sibling
      // assertion here reads it as failure — so the opt-out was verified only
      // on the runs that happened to succeed, and a mutation that broke the
      // rerun outright would have been recorded as an opt-out that works. The
      // conjunction is split: the run must succeed, and then the flag must have
      // opted out.
      rmSync(md, { force: true });
      const r4 = spawnSync(process.execPath, argv.concat(["--no-render"]),
        { encoding: "utf8", env: env3 });
      if (r4.status !== 0) {
        fails.push(`the \`--no-render\` rerun failed (exit ${r4.status}) — the opt-out was NOT asserted, and a run that did not complete is not evidence that a flag works: ${(String(r4.stdout) + String(r4.stderr)).trim().slice(0, 200)}`);
      } else if (existsSync(md)) {
        fails.push("`--no-render` wrote the owner rendering anyway on the rerun path — the opt-out is not one");
      }
      rmSync(md, { force: true });
    }
  }
  // Restore the owner's real report (or its absence) regardless of which
  // branch above ran — fixture material must not survive as FullReport.md.
  if (priorOwnerMd3 !== null) writeFileSync("reports/FullReport.md", priorOwnerMd3);
  else rmSync("reports/FullReport.md", { force: true });
  rmSync(run3, { recursive: true, force: true });
}

// And the rendering must be IGNORED rather than committed (§2.5.2): visibility
// and publication are separate decisions, and letting `git add` settle the
// second is the defect LESSONS.md:112 names by name.
{
  const g = spawnSync("git", ["check-ignore", "reports/x.md"], { encoding: "utf8" });
  K234.gitignore = "RAN";
  if (g.status !== 0) {
    fails.push("reports/ is not gitignored — the rendering derives from uncommitted survey records and inherits their sensitivity; committing it is a declassification act needing its own grounds");
  }
}

if (fails.length) {
  console.log("FAIL compose-input bounded-read fixture — the composer's input is not bounded to the tag-scoped shard (kogaki#163, SPEC.md §9):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("compose-input bounded-read fixture: PASS — cases exercised (one tag-scoped shard "
  + "pair per run, with the journey half fetched only where a member carries one; groups carry "
  + "IDS ONLY so a per-group copy is unwritable and every id resolves into the material; the "
  + "material untruncated; reads UNCHANGED across a record whose placements were multiplied over "
  + "the same candidates — the pair no single run can display; the COMMAND path run end to end "
  + "against a stub gateway that counted the reads it served, rather than the accounting the run "
  + "printed about itself; and the claimless co-tag screen naming the bounded input as its remedy)");
// THE kogaki#234 HALF REPORTS ITS OWN EXERCISED TRIALS, separately and by
// state, rather than riding the sentence above (PR #240 review round 1,
// finding 4). A block that did not run must not appear inside a PASS claim.
console.log(`kogaki#234 rendered material: ${K234.material}; rerun owner surface: ${K234.rerun}. `
  + "Asserted WHERE RAN, on the RENDERED BYTES read against the machine record that "
  + "produced them and never against a literal written here: every member's served "
  + "line, its Lesson Gloss cite and COMPLETE body, its Journey Gloss cite and "
  + "COMPLETE body where it has one and an explicit statement where it has not, and "
  + "the Counted journey figure agreeing with the members that carry one — the "
  + "`> Untruncated.` / `- journey: 1` specimen of the 2026-08-08 dogfood run. And on "
  + "the SECOND invocation specifically (proven to have taken the idempotent-rerun "
  + "branch, with the rendering DELETED first so no leftover can satisfy it): the "
  + "repo-relative READ THIS ONE line present, no `.kogaki` path, NO token beginning at "
  + "the root or at `~/` on any line (the PROPERTY, not an enumeration of directory "
  + "names), the rendering regenerated byte-identical, the KOGAKI_DEBUG direction still "
  + "printing the record's full path, and `--no-render` still opting out on a run whose "
  + "EXIT was asserted first. Every cite assertion is UNCONDITIONAL: an absent cite is "
  + "reported as the missing premise it is rather than skipping the assertion, and the "
  + "record's Lesson and Journey bodies are required to DIFFER, without which every "
  + "Journey assertion would be satisfied by the Lesson Gloss alone. A block reading "
  + "CANNOT-DETERMINE asserted NOTHING. NOT COVERED, stated "
  + "rather than left to be inferred: the member block's HEADING DEPTH under a "
  + "composed SubGroup — this fixture's group is judged-empty, so members render at "
  + "the top level and a mutation collapsing depth 4 to 3 survives the whole suite. "
  + "Depth carries no §12 property, so it is named here rather than asserted.");
console.log(`kogaki#234 artifact location — artifact-split: ${K234.split}; `
  + `defaults (no --report-dir, no --rendering-dir): ${K234.defaults}; `
  + `gitignore: ${K234.gitignore}. Asserted WHERE RAN: the owner RENDERING lands `
  + "in the TREE as owner-register Markdown while the machine RECORD lands in the "
  + "run workspace; the owner surface names the repo-relative rendering path and NO "
  + "machine-local hidden path; reportsDir's own default no longer names the retired "
  + "directory; and reports/ is gitignored — visibility and publication decided "
  + "separately. A block reading CANNOT-DETERMINE asserted NOTHING.");
JS

# --------------------------------------------------------------------------
# THE EMIT-TIME REFUSAL, FIRED IN BOTH DIRECTIONS (SPEC-terrain §14.2, story
# 1.54, kogaki#346).
#
# The happy path is already asserted above — every cotags and report block in
# this file now runs through the guard, so a refusal on conformant output fails
# the suite loudly (story 1.54 AC6). What that CANNOT show is that the refusal
# fires at all. A guard exercised only by its happy path is indistinguishable
# from one that has been switched off, which is the condition this file's own
# cover-guard block was written after.
#
# So: the REFUSING direction, at both altitudes — the predicate over a crafted
# nonconformant string, and the command end-to-end, where what matters is that
# NOTHING was written.
node --input-type=module - <<'JS'
import { mkdtempSync, existsSync, readdirSync, readFileSync, writeFileSync, rmSync, cpSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { loadGrammar, validateSurface, refuseUnlessConformant, FormatRefusal }
  from "./terrain/format-guard.mjs";

const fails = [];
const G = loadGrammar("specs/spec-terrain/report-format.json");

// Each case names the RULE it must fire, so a case that starts passing for the
// wrong reason — some other violation in the same string — is caught.
const cases = [
  // v3 forms: flush left, ids carry the level, composer prose marked `> `.
  // These strings were v2-shaped (indented) until story 1.56 and the suite went
  // red on the spec diff alone — a fixture encoding the shape it was authored
  // beside, which is why AC10 made re-authoring them a criterion rather than
  // a chore discovered at implementation time.
  { rule: "line_class_allowlist", surface: "cotag_screen",
    text: "testing — the second navigation step. Grouped by co-tag; sort: name.\nan invented line no class admits",
    why: "a line outside the surface's line_classes; the declared non_member_fallback is REFUSE. THIS CASE IS AC9: it was passing vacuously the moment `group_prose` went flush-left and began admitting every line, and the `> ` marker is what makes it able to fail again" },
  { rule: "no_element_names", surface: "cotag_screen",
    text: "G1 — testing × architecture — 2 Lessons: lesson:alpha, lesson:bravo",
    why: "§14.2 verbatim — an element name reached an owner surface" },
  { rule: "no_element_names", surface: "full_report",
    text: "# Full Report — g\n*Substrate pin:* `p`\n#### lesson:alpha",
    why: "the same rule on the other covered surface, because a rule installed on one is not installed" },
  { rule: "pin_once_per_file", surface: "full_report",
    text: "# Full Report — g\n*Substrate pin:* `p`\n*Substrate pin:* `p`",
    why: "§12 renders the shared pin ONCE, in the identity" },
  // The predicate written for finding 1 must be shown FIRING. A rule moved into
  // `expressible` with nothing evaluating it is what that finding was; a rule
  // evaluated by code no case exercises is the same thing one layer along.
  // `group_subgroup_id_grammar` is discharged on cotag_screen BY the allowlist —
  // a heading with a bad id never classifies as a heading, so the refusal
  // arrives under that rule's name. Asserted here under the rule that actually
  // fires rather than under the one the grammar names, because claiming the
  // latter fired would be the coverage-shaped lie the entry warns about.
  { rule: "line_class_allowlist", surface: "cotag_screen",
    text: "testing × architecture — 2 Lessons: L2, L1",
    why: "the v5 group heading, opening with the co-tag NAME instead of a GroupID — v6 replaced it because a name cannot carry the level through a wrap, and this is where group_subgroup_id_grammar is actually enforced on this surface" },
  // AC3 — `catch_all_share` has NEVER had a crafted case, which is how it
  // measured the wrong catch-all through two stories and a review round. The
  // numbers are kogaki#316's own first specimen: a parent of 17 with 11 in the
  // remainder (65%).
  { rule: "catch_all_share", surface: "cotag_screen",
    text: "G1 — agents × knowledge-architecture — 17 Lessons\nG1-1 — 6 Lessons: L1, L2, L3, L4, L5, L6 — a real split\nG1-2 — 11 Lessons: L7, L8, L9, L10, L11, L12, L13, L14, L15, L16, L17 — (fits no composed SubGroup)",
    why: "kogaki#316's own specimen — 11 of 17 swept into the remainder, 65%, over the 30% §14.2 allows" },
  { rule: "subgroup_members_sum_to_parent", surface: "cotag_screen",
    text: "G1 — testing × architecture — 4 Lessons\nG1-1 — 1 Lesson: L1 — sg",
    why: "a member placed in no SubGroup is hidden, and the screen cannot show it" },
];
// AC9's own negative: composer prose WITHOUT its marker must be refused, and
// WITH it must be admitted. Asserted as a pair, because either half alone is
// satisfiable by a grammar that got it wrong in the other direction — an
// unmarked line admitted means the allowlist is inert again, and a marked line
// refused means the class does not render at all.
{
  const marked = validateSurface("cotag_screen", "> some composed connective prose", G);
  if (marked.length) {
    fails.push(`AC9: a MARKED composer-prose line was refused — ${marked.map(String).join("; ")}`);
  }
  const unmarked = validateSurface("cotag_screen", "some composed connective prose", G);
  if (!unmarked.some((x) => x.rule === "line_class_allowlist")) {
    fails.push("AC9: an UNMARKED free-text line was ADMITTED — `line_class_allowlist` is inert on cotag_screen again. The `> ` marker is the only thing constraining `group_prose` now that indentation is gone; without it that class matches every line and this rule can never fire (report-format.json cotag_screen.line_class_allowlist_went_inert_here_in_v3)");
  }
}

for (const c of cases) {
  const v = validateSurface(c.surface, c.text, G);
  if (!v.some((x) => x.rule === c.rule)) {
    fails.push(`the refusal did NOT fire for ${c.rule} on ${c.surface} (${c.why}) — got: ${v.map((x) => x.rule).join(", ") || "no violations at all"}`);
  }
}

// AC4 — the message is actionable: surface, line class/rule, offending line,
// and the grammar entry. Asserted as the four PROPERTIES rather than as a
// string literal, so a reworded message that still carries them passes.
try {
  refuseUnlessConformant("cotag_screen", "an invented line no class admits", G);
  fails.push("refuseUnlessConformant did not throw on a nonconformant surface");
} catch (e) {
  if (!(e instanceof FormatRefusal)) fails.push(`threw ${e.name}, not FormatRefusal`);
  else {
    const m = e.message;
    if (!m.includes("cotag_screen")) fails.push("AC4: the refusal does not name the SURFACE");
    if (!m.includes("line_class_allowlist")) fails.push("AC4: the refusal does not name the RULE/line class");
    if (!m.includes("an invented line no class admits")) fails.push("AC4: the refusal does not quote the OFFENDING LINE");
    if (!m.includes("report-format.json")) fails.push("AC4: the refusal does not name the GRAMMAR ENTRY it was decided against");
  }
}

// AC2, end to end and at the altitude that matters: NEITHER artifact exists
// after a refusing `report` run.
//
// TWO THINGS THIS BLOCK GOT WRONG ON ITS FIRST PUSH, both found by PR #352
// round 1, and both worth stating because the shapes recur.
//
// (1) IT WAS NOT SEAM-AWARE, AND THAT MADE IT PASS VACUOUSLY IN CI. `report`
// reads served Gloss renderings through the seam, which CI does not have, so
// the run exited non-zero BEFORE reaching the guard — and `r.status !== 0`
// plus "zero artifacts written" were then both satisfied by a run that never
// tested anything. Only the stderr assertion reported the miss, which is the
// second time in this block's short life that assertion has been what caught
// it. Eleven other blocks in this file already print CANNOT-DETERMINE where
// the seam is absent; this one now does too. The seam-FREE cases above —
// `validateSurface` over crafted text, and AC4's message properties — stay
// UNCONDITIONAL, because a check that skips what it can still run is reporting
// less than it knows.
//
// (2) IT MUTATED THE TRACKED, §14.1-AUTHORITATIVE GRAMMAR IN THE WORKING TREE
// and relied on `finally` to restore it. A SIGKILL, a runner timeout, or a
// concurrent reader would have seen — or left behind — a deliberately broken
// copy of the repository's own authoritative artifact. It now mutates a COPY:
// `terrain.mjs` resolves every schema from its own location (`REPO = resolve(
// HERE, "..")`), so a temp tree holding `terrain/`, `specs/` and `gates/` gives
// a real end-to-end run with nothing tracked touched. No override flag was
// added to the runtime for this; a test needing one is not a reason to open a
// second path to the grammar.
let e2eRan = false;
const dir = mkdtempSync(join(tmpdir(), "terrain-refuse-"));
const survey = "checks/fixtures/terrain/cotags/lone-tag-member.json";
try {
  const tree = join(dir, "tree");
  // `policy` is in this list because leaving it out FAKED A SEAM ABSENCE.
  // terrain.mjs resolves the gateway-query script from REPO too, so a tree
  // without it fails with "Cannot find module …/policy/kit/bin/gateway-query.mjs"
  // — which the seam test below reads as "no gateway here" and reports
  // CANNOT-DETERMINE. That is the same vacuous pass this block was just
  // repaired for, one level up: the guard added to stop a run being counted
  // when it never reached the refusal would itself have stopped it being
  // counted when the copy was simply incomplete. An incomplete fixture tree
  // reports as an absent environment, and the two are indistinguishable from
  // the exit code alone.
  for (const d of ["terrain", "specs", "gates", "policy"]) {
    cpSync(d, join(tree, d), { recursive: true });
  }
  const grammarPath = join(tree, "specs/spec-terrain/report-format.json");
  const g2 = JSON.parse(readFileSync(grammarPath, "utf8"));
  // Remove the `substrate_pin` class, so `pin_once_per_file` counts 0 where it
  // requires exactly 1.
  //
  // THE FIRST ATTEMPT REMOVED `title` INSTEAD, AND IT DID NOT REFUSE — recorded
  // because the reason is a real property of the grammar rather than a slip in
  // this block. `full_report` carries three body classes whose whole form is a
  // bare placeholder (`group_claim_body`, `subgroup_claim_body`,
  // `member_gloss_body`), each of which matches ANY line; so on that surface
  // `line_class_allowlist` has no unadmitted line to find and is unenforceable
  // as written. That is a limit on what §14.2 can decide about the Full Report,
  // not a defect this story may fix by inventing constraints the grammar does
  // not state — §14.1 makes the grammar authoritative. Named in the block's own
  // output below, and on kogaki#346.
  g2.surfaces.full_report.line_classes =
    g2.surfaces.full_report.line_classes.filter((e) => e.id !== "substrate_pin");
  writeFileSync(grammarPath, JSON.stringify(g2, null, 2) + "\n");

  const subsPath = join(dir, "subdivisions.json");
  writeFileSync(subsPath, JSON.stringify({ "testing \u00d7 architecture": { judged: true, subgroups: [] } }));

  const out = join(dir, "out");
  const r = spawnSync(process.execPath, [join(tree, "terrain/terrain.mjs"), "report",
    "--survey", survey, "--tag", "testing", "--ids", "G2",
    "--judge-model", "m", "--judge-effort", "e", "--subdivisions", subsPath,
    "--report-dir", out, "--rendering-dir", out], { encoding: "utf8" });

  // The seam test, in the same shape the eleven other blocks use.
  const seamAbsent = r.status === 11
    || (r.status !== 0
        && /policy_source unavailable|gateway/i.test(String(r.stderr) + String(r.stdout)));

  if (seamAbsent) {
    console.log("AC2 end-to-end: CANNOT-DETERMINE — the served seam is unavailable here and "
      + "`report` reads served Gloss renderings through it, so a non-zero exit and an empty "
      + "output directory would both be satisfied by a run that never reached the refusal. "
      + "Reported rather than counted: this is the vacuous pass PR #352 round 1 found. The "
      + "seam-FREE cases above (5 rules over crafted text, AC4's four message properties) RAN.");
  } else {
    e2eRan = true;
    if (r.status === 0) {
      fails.push("AC2: `report` exited 0 against a grammar its rendering violates — the refusal is not installed on this path");
    }
    const written = existsSync(out) ? readdirSync(out) : [];
    if (written.length !== 0) {
      fails.push(`AC2: the refusal wrote ${written.length} artifact(s) (${written.join(", ")}) — neither the owner rendering NOR the machine record may exist, because \u00a712.2 v11 requires both in the same act and a record without its rendering is the 2026-08-06 specimen from the other side`);
    }
    if (!String(r.stderr).includes("report-format.json")) {
      fails.push("AC2: the refusal reached stderr without naming the grammar it was decided against");
    }
    if (String(r.stdout).includes("refusing to emit")) {
      fails.push("the refusal text was printed to STDOUT \u2014 refusal_text_boundary: no text raised through fail() is a line of any owner surface");
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// AC2 — THE CO-TAG BOUND IS GONE, asserted as a removal rather than assumed.
// A screen whose `(no second served tag)` group holds most of the corpus must
// now pass: no owner decision ever capped it, and a large tagless group is a
// fact about the corpus rather than a composition defect.
{
  const bigTagless = [
    "testing — the second navigation step. Grouped by co-tag; sort: name.",
    "",
    "G1 — testing × (no second served tag) — 9 Lessons: L1, L2, L3, L4, L5, L6, L7, L8, L9",
    "in common: they carry the selected tag and no other",
    "G2 — testing × architecture — 1 Lesson: L10",
    "in common: a claim",
    "",
    "Cover: 10 of 10 member Lessons appear in at least one co-tag group — counted AFTER composition, over placements. Selected tag: 10 — 10 lessons + 0 journeys; 10 of 10 Lessons.",
  ].join("\n");
  const v = validateSurface("cotag_screen", bigTagless, G);
  if (v.some((x) => x.rule === "catch_all_share")) {
    fails.push("AC2: `catch_all_share` fired on the CO-TAG group (9 of 10 tagless). That bound was removed — it was never an owner decision, and a tagless group over 30% is a fact about the corpus, not a composition defect. A renamed survivor is the unratified number kept under a new label");
  }
}

if (fails.length) {
  console.log("FAIL emit-time refusal (SPEC-terrain §14.2, story 1.54):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("NOT DECIDABLE ON full_report, stated rather than left to be inferred: "
  + "`line_class_allowlist`. Three of that surface's classes (group_claim_body, "
  + "subgroup_claim_body, member_gloss_body) have a bare placeholder as their whole "
  + "form, so each admits ANY line and no line can be unadmitted. The rule is enforced "
  + "on cotag_screen, where the classes are constrained, and it is inert on the report. "
  + "Fixing it means the grammar declaring what a claim body may look like — §14.1 makes "
  + "that artifact authoritative, so it is not narrowed from here (kogaki#346).");
console.log(`emit-time refusal: ${cases.length}/${cases.length} rules fire on crafted nonconformant text; `
  + "AC4's four properties present in the message (surface, rule, offending line, grammar). "
  + `AC2 end-to-end: ${e2eRan ? "RAN — `report` against a tightened grammar exited non-zero having written ZERO artifacts, neither the rendering nor the record, with the refusal on stderr and off the owner surface" : "CANNOT-DETERMINE, seam absent (stated above)"}. `
  + "The claim is written from WHICH BRANCH RAN rather than asserted flat: the first version of "
  + "this line described the end-to-end case unconditionally, which would have reported a run "
  + "that never happened. The PASSING direction is asserted by every other cotags and report "
  + "block in this file, which now all run through the guard (AC6: a refusal on conformant "
  + "output fails the suite).");
JS

# --------------------------------------------------------------------------
# THE GOLDEN SPECIMENS (SPEC-terrain §14.5, story 1.55, kogaki#347).
#
# One specimen per surface the grammar covers — two at v14. The point is to
# catch a renderer edit that changes the rendered shape IN THE PR, between the
# hands-on rounds rather than during them, which is when the 2026-08-09
# transcript's fused lines were found.
#
# TWO ASSERTIONS PER SPECIMEN, and the pair is the design rather than belt and
# braces. (1) The specimen is CONFORMANT against the grammar, by the same
# predicate the emitters refuse with. (2) The renderer's output over the
# committed input EQUALS the specimen. (1) alone would let the renderer drift
# anywhere the grammar still admits; (2) alone would bless whatever the renderer
# emitted, which is the "fixture supplies the value under test" form the
# specimens are hand-authored to avoid — see the README beside them.
#
# AC5 — the fixture NEVER wins. On disagreement the grammar is authoritative and
# the SPECIMEN is what is reported stale, in those words.
node --input-type=module - <<'JS'
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { loadGrammar, validateSurface } from "./terrain/format-guard.mjs";

const fails = [];
const G = loadGrammar("specs/spec-terrain/report-format.json");
const DIR = "checks/fixtures/terrain/format";
const SURVEY = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const STUB = "checks/fixtures/terrain/compose-input/stub-gateway.mjs";
const TAG = "testing";
const GROUP = "testing × architecture";

// AC3's count is PER COVERED SURFACE, read from the grammar rather than
// written here as a number — so a sitting that covers a third surface gets a
// failure telling it a specimen is owed, instead of a suite that quietly still
// says two.
const covered = Object.keys(G.surfaces || {});
const SPECIMENS = { cotag_screen: "cotag-screen.txt", full_report: "full-report.md",
                    tag_screen: "tag-screen.txt", tag_row_view: "tag-row-view.txt" };
for (const s of covered) {
  if (!SPECIMENS[s]) {
    fails.push(`the grammar covers ${s} and ${DIR} holds no specimen for it — §14.5's count is ONE PER COVERED SURFACE, so covering a surface owes a specimen in the same sitting`);
  }
}
const present = new Set(readdirSync(DIR).filter((f) => f !== "README.md"));
for (const f of present) {
  // The judgment-layer INPUT is not a specimen of a surface — it is a fixture
  // the golden run consumes (kogaki#686). Named here so the corpus guard keeps
  // its meaning: one specimen per covered surface, and inputs are not specimens.
  if (f === "neighborhood-judgments.json") continue;
  if (!Object.values(SPECIMENS).includes(f)) {
    fails.push(`${DIR}/${f} is a specimen for no covered surface — AC6: a specimen, not a corpus. A format incident earns a grammar edit and a REGENERATED specimen, never an additional fixture`);
  }
}

let paired = 0;
const dir = mkdtempSync(join(tmpdir(), "terrain-golden-"));
try {
  const pin = JSON.parse(readFileSync(SURVEY, "utf8")).pin;
  const claims = join(dir, "claims.json");
  writeFileSync(claims, JSON.stringify({
    composition_pin: { tag: TAG, pin, groups: {
      "testing × (no second served tag)": ["lesson:delta"],
      "testing × architecture": ["lesson:alpha", "lesson:bravo"],
      "testing × cost": ["lesson:charlie"],
    } },
    claims: {
      "testing × architecture": "both hold that a guard is real only once something exercised it",
      "testing × cost": "both price a check by where in the loop it runs",
      "testing × (no second served tag)": "carries the selected tag and no other",
    },
  }));
  const subs = join(dir, "subs.json");
  writeFileSync(subs, JSON.stringify({ "testing × architecture": { judged: true, subgroups: [] } }));

  // The two actual renderings, over the COMMITTED input.
  //
  // BOTH ARE READ FROM THEIR ARTIFACT, NEVER FROM STDOUT (§14.4.1 v18,
  // kogaki#464). The report's specimen always was, because `announceArtifacts`
  // prints beside it; the screen's could be taken from stdout only while stdout
  // WAS the rendering, and §14.4.1 is the ruling that it is not — a tool call's
  // stdout is displayed to the model, not reliably to the owner. Reading the
  // artifact keeps the specimen bound to what the owner actually opens, and it
  // is why the hand-over lines do not have to be admitted into the grammar:
  // they are beside the surface, exactly as the report's have always been.
  const sdir = join(dir, "s");
  const screen = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "cotags", "--survey", SURVEY, "--tag", TAG, "--claims", claims,
     "--rendering-dir", sdir],
    { encoding: "utf8" });
  if (screen.status !== 0) fails.push(`cotags exited ${screen.status}: ${(screen.stderr || "").trim()}`);
  const smd = readdirSync(sdir).filter((f) => f.endsWith(".md"));
  if (smd.length !== 1 || smd[0] !== "Screen.md") {
    fails.push(`expected exactly one screen artifact named Screen.md, found ${JSON.stringify(smd)} — §14.4.1 fixes the name and the count`);
  }

  const rdir = join(dir, "r"); const gdir = join(dir, "g");
  const rep = spawnSync(process.execPath,
    // `--neighborhood` carries the JUDGMENT LAYER (kogaki#686): one level from
    // the harness-fixed set and one claim per mechanical candidate. The
    // specimen exercises the JUDGED path deliberately — the unjudged state is a
    // real rendering and a legible one, but a golden specimen showing it would
    // pin the shape nobody ships and leave the four ruled fields uncovered.
    ["terrain/terrain.mjs", "report", "--survey", SURVEY, "--tag", TAG, "--ids", "G2",
     "--claims", claims, "--subdivisions", subs,
     "--neighborhood", join(DIR, "neighborhood-judgments.json"),
     "--judge-model", "claude-opus-5", "--judge-effort", "high",
     "--report-dir", rdir, "--rendering-dir", gdir],
    { encoding: "utf8", env: { ...process.env, TSUREZURE_GATEWAY_JS: STUB } });
  if (rep.status !== 0) fails.push(`report exited ${rep.status}: ${(rep.stderr || "").trim()}`);
  const md = readdirSync(gdir).filter((f) => f.endsWith(".md"));
  const actual = {
    cotag_screen: smd.includes("Screen.md") ? readFileSync(join(sdir, "Screen.md"), "utf8") : null,
    full_report: md.length === 1 ? readFileSync(join(gdir, md[0]), "utf8") : null,
  };
  if (md.length !== 1) fails.push(`expected exactly one rendered report, found ${md.length}`);

  paired = Object.keys(SPECIMENS).filter((s) => actual[s] !== null && actual[s] !== undefined).length;

  for (const [surface, file] of Object.entries(SPECIMENS)) {
    const path = join(DIR, file);
    const specimen = readFileSync(path, "utf8");

    // (1) CONFORMANT — and a failure here names the SPECIMEN as stale, never
    // the grammar. §14.1's precedence is one-way (AC5).
    const v = validateSurface(surface, specimen, G);
    if (v.length) {
      fails.push(`THE SPECIMEN IS STALE — ${path} does not conform to specs/spec-terrain/report-format.json, which is authoritative (§14.1, §14.5). Regenerate the specimen; do NOT amend the grammar to admit it:\n      ` + v.map(String).join("\n      "));
    }

    // (2) EQUAL to what the renderer produces. This is the assertion that
    // fails a renderer edit in the PR (AC4), and it names the divergence
    // rather than only reporting inequality.
    const got = actual[surface];
    if (got === null || got === undefined) continue;
    if (got !== specimen) {
      const a = specimen.split("\n"), b = got.split("\n");
      const at = a.findIndex((l, i) => l !== b[i]);
      const detail = at < 0
        ? `the specimen has ${a.length} lines and the rendering ${b.length}`
        : `first divergence at line ${at + 1}:\n        specimen:  ${JSON.stringify(a[at])}\n        rendering: ${JSON.stringify(b[at] === undefined ? null : b[at])}`;
      fails.push(`THE RENDERED SHAPE MOVED — ${surface} no longer matches ${path}.\n      ${detail}\n      If the new shape is correct, amend specs/spec-terrain/report-format.json on its own licensing issue FIRST and regenerate the specimen; the grammar decides, never the fixture (§14.1, §14.5, AC5).`);
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL golden specimens (SPEC-terrain §14.5, story 1.55):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`golden specimens: ${Object.keys(SPECIMENS).length}/${Object.keys(SPECIMENS).length} covered surfaces carry one; `
  + `${paired} of them asserted TWICE and ${Object.keys(SPECIMENS).length - paired} ONCE. `
  + "The two assertions are: conformant against the grammar (by the emitters' own predicate), and byte-equal to the renderer's "
  + "output over the committed input. THE SPLIT IS REPORTED RATHER THAN AVERAGED (kogaki#636): the second assertion runs only "
  + "where a renderer writes that surface's artifact today, and the screen-1 surfaces have none — the tag listing goes to "
  + "stdout from cmdSurvey and nothing writes it to reports/Screen.md until §15's executor lands. A green line claiming TWICE "
  + "for a surface asserted ONCE is the figure-asserted-rather-than-derived defect this issue was filed over, one layer down. "
  + "The count is read from the grammar, so covering a third surface fails here until its "
  + "specimen exists, and a file matching no covered surface fails as corpus growth (AC6). On disagreement the SPECIMEN is "
  + "reported stale and the grammar stands (AC5). Hand-authored, not generated — the reason is recorded in the README beside them.");
JS

# --------------------------------------------------------------------------
# AC5 / AC6 — A SPLIT THAT BUYS NOTHING RENDERS NO SUBGROUPS, AND THE SCREEN
# STILL PRINTS (SPEC-terrain §6.2 v7, kogaki#316 decision 3, story 1.57).
#
# The two criteria pull against each other on purpose: the group must render
# WITHOUT SubGroups, and the command must still succeed. A refusal satisfies
# the first and fails the second — and refusing would contradict §6.2's own
# clause that a group whose leaf condition fails is FULLY CONFORMANT.
#
# Before this story the verdict was computed, printed as `NOT a leaf: … the
# split bought nothing`, and read by nothing: the obligation was reported
# rather than discharged.
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const fails = [];
const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const TAG = "testing";
const pin = JSON.parse(readFileSync(FIXTURE, "utf8")).pin;

const claims = join(tmpdir(), `ac5-claims-${process.pid}.json`);
writeFileSync(claims, JSON.stringify({
  composition_pin: { tag: TAG, pin, groups: {
    [`${TAG} × (no second served tag)`]: ["lesson:delta"],
    [`${TAG} × architecture`]: ["lesson:alpha", "lesson:bravo"],
    [`${TAG} × cost`]: ["lesson:charlie"],
  } },
  claims: { [`${TAG} × architecture`]: "both are guards of some kind" },
}));

// The only named SubGroup restates the parent: `tighter_than_parent: false`.
const subs = join(tmpdir(), `ac5-subs-${process.pid}.json`);
writeFileSync(subs, JSON.stringify({
  [`${TAG} × architecture`]: { judged: true, subgroups: [
    { subgroup: "guards of some kind", claim: "both are guards of some kind",
      members: ["lesson:alpha", "lesson:bravo"],
      composes_honestly: true, tighter_than_parent: false, legible_at_a_glance: true },
  ] },
}));

const r = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG,
   "--claims", claims, "--subdivisions", subs, "--judge-model", "m", "--judge-effort", "high"],
  { encoding: "utf8" });
const out = String(r.stdout);

// AC6 first: the screen must exist at all. Asserting AC5 on an empty stdout
// would pass vacuously — every "must not appear" is satisfied by nothing.
if (r.status !== 0) {
  fails.push(`AC6: cotags exited ${r.status} on a split that bought nothing — §6.2 v7 makes the group render FLAT and fully conformant; a judge's verdict must not be fatal to the surface. stderr: ${(r.stderr || "").trim().slice(0, 300)}`);
} else if (out.trim() === "") {
  fails.push("AC6: cotags exited 0 and printed nothing — every AC5 assertion below would pass vacuously");
} else {
  // AC5 — the group renders FLAT: heading carries its member ids, and no
  // SubGroup line or leaf verdict appears for it.
  if (!/^G[0-9]+ — testing × architecture — 2 Lessons: L2, L1$/m.test(out)) {
    fails.push("AC5: the group did not fall back to the FLAT heading form with its member ids — a suppressed split leaves the group rendering exactly as an unjudged-empty one does (§6.2 v7)");
  }
  if (/^G[0-9]+-[0-9]+ — /m.test(out)) {
    fails.push("AC5: a SubGroup line rendered for a split that bought nothing — the split does not discharge the subdivision obligation, so it renders as no split at all");
  }
  if (out.includes("NOT a leaf")) {
    fails.push("AC5: the `NOT a leaf` verdict line still renders — that line IS the reported-rather-than-discharged state kogaki#316 decision 3 replaces");
  }
  // The suppression is DISCLOSED, never silent (§2.1). A flat group is
  // otherwise indistinguishable from one nobody judged.
  if (!/render flat because their only named SubGroup was not tighter than the parent/.test(out)) {
    fails.push("AC5: the suppression is SILENT — a judgment ran, produced a split and had it suppressed, and the screen says nothing. §2.1 states an absence rather than leaving it, and the `claimless` aggregate is the shape this follows");
  }
  // And the fallback must not have eaten the members.
  for (const id of ["L2", "L1"]) {
    if (!out.includes(id)) fails.push(`AC5: member ${id} vanished from the flat fallback — the fallback renders the group, it does not narrow it`);
  }
}

// PR #355 round 1 finding 1 — RULE 3 BINDS THE FULL REPORT TOO. The screen
// suppressing while the report still carried the SubGroups is one run showing
// two structures for one group, which is exactly what kogaki#317's ids were
// minted to prevent. Asserted on the REPORT's own bytes, seam-gated because
// `report` reads served Gloss renderings.
{
  const dir = mkdtempSync(join(tmpdir(), "ac5-report-"));
  const r2 = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
     "--ids", "G2", "--claims", claims, "--subdivisions", subs,
     "--judge-model", "m", "--judge-effort", "high",
     "--report-dir", dir, "--rendering-dir", dir],
    { encoding: "utf8", env: { ...process.env, TSUREZURE_GATEWAY_JS: "checks/fixtures/terrain/compose-input/stub-gateway.mjs" } });
  const seamAbsent = r2.status === 11
    || (r2.status !== 0 && /policy_source unavailable|gateway/i.test(String(r2.stderr) + String(r2.stdout)));
  if (seamAbsent) {
    console.log("rule 3 on the Full Report: CANNOT-DETERMINE — the served seam is unavailable here and "
      + "`report` reads served Gloss renderings through it. The screen half above RAN.");
  } else if (r2.status !== 0) {
    fails.push(`rule 3 on the Full Report: report exited ${r2.status}: ${(r2.stderr || "").trim().slice(0, 200)}`);
  } else {
    const md = readdirSync(dir).filter((f) => f.endsWith(".md"));
    const body = md.length === 1 ? readFileSync(join(dir, md[0]), "utf8") : "";
    if (md.length !== 1) {
      fails.push(`rule 3 on the Full Report: expected one rendering, found ${md.length}`);
    } else if (/^### G[0-9]+-[0-9]+ — /m.test(body)) {
      fails.push("rule 3 on the Full Report: the report STILL carries the SubGroups the screen suppressed — §6.2 v7 rule 3 reads unconditionally, so one run's two owner surfaces must not disagree about whether a group has a split");
    } else if (!body.includes("it was SUPPRESSED")) {
      // §12.1 v9 HAS THREE STATES and this is the third. The suppressed case
      // must carry its OWN notice: routed into the judged-empty shape it
      // inherits "the judgment produced NO split", which is FALSE of it — a
      // split WAS produced and suppressed.
      //
      // PR #355 round 2 found this and its repair was reverted at the
      // two-round bound; PR #356 round 1 then found the read with NO WRITER in
      // the sectioned renderer. Asserted here so the third state cannot go
      // unreachable a third time.
      fails.push("rule 3 on the Full Report: the suppressed section did not carry its OWN notice — it inherits the judged-empty sentence, which asserts \"the judgment produced NO split\" about a section whose judgment produced one (§12.1 v9's three states)");
    } else if (body.includes("The judgment produced NO split")) {
      fails.push("rule 3 on the Full Report: the report asserts \"the judgment produced NO split\" about a SUPPRESSED split — false in its own terms");
    } else if (false) {
      fails.push("rule 3 on the Full Report: the suppressed group did not render as JUDGED-EMPTY — §12.1 v9 keeps judged-empty distinguishable from unjudged, and this group WAS judged");
    }
  }
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL suppressed split (SPEC-terrain §6.2 v7, story 1.57):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("suppressed split: a split whose only named SubGroup is not tighter than its parent renders NO "
  + "SubGroups, the group falls back to its FLAT heading with member ids intact, no `NOT a leaf` line "
  + "survives, the suppression is DISCLOSED in aggregate rather than silently, and the command EXITS ZERO — "
  + "AC6 is asserted before AC5 so the must-not-appear assertions cannot pass on an empty screen.");
JS

# --------------------------------------------------------------------------
# THE ENTERED ID SET (SPEC-terrain §11 v5, §12 v6/v7; kogaki#314, story 1.58).
#
# Seam-free by construction: every case below is either a unit call on the
# canonicaliser or a `report` run that REFUSES before reaching the seam. The
# one case that renders is seam-gated where it appears above.
node --input-type=module - <<'JS'
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { canonicalIds, idSortKey, neighborhoodOf, neighborhoodScreen, readNeighborhoodJudgments, settledSlugs, surveyEmptinessNote } from "./terrain/terrain.mjs";

const fails = [];
const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";

// AC3 — NUMERIC-AWARE. The plain reading of "sorted" is lexicographic and it
// is wrong: "G10" < "G5-1" as strings, which renders a screen's tenth group
// above its fifth. This case is the whole reason AC3 is a criterion.
{
  const got = canonicalIds(["G10", "G5-1", "G5-2"]);
  const want = ["G5-1", "G5-2", "G10"];
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    fails.push(`AC3: canonicalIds gave ${JSON.stringify(got)}, want ${JSON.stringify(want)} — the sort must compare NUMERIC components, never the raw string`);
  }
  if (JSON.stringify(["G10", "G5-1", "G5-2"].sort()) === JSON.stringify(want)) {
    fails.push("AC3: this case cannot discriminate — plain string sort already gives the wanted order, so it proves nothing about numeric-awareness");
  }
  // A parent sorts before its own SubGroups.
  const nested = canonicalIds(["G2-1", "G2", "G10", "G2-10", "G2-2"]);
  if (JSON.stringify(nested) !== JSON.stringify(["G2", "G2-1", "G2-2", "G2-10", "G10"])) {
    fails.push(`AC3: nested order ${JSON.stringify(nested)} — a parent precedes its SubGroups and -10 follows -2`);
  }
}

// AC2 — CANONICAL means deduped as well as ordered: identity is set-based, so
// a repeated id cannot make two artifacts out of one set.
{
  const got = canonicalIds(["G2", "G1", "G2"]);
  if (JSON.stringify(got) !== JSON.stringify(["G1", "G2"])) {
    fails.push(`AC2: canonicalIds did not dedupe — got ${JSON.stringify(got)}`);
  }
}
// An unparseable id sorts last rather than throwing: it is refused by
// resolution (AC5), and the canonicaliser is not where that refusal lives.
if (idSortKey("nonsense")[0] !== Number.MAX_SAFE_INTEGER) {
  fails.push("idSortKey did not sort an unparseable id last — resolution owns the refusal, not the sort");
}

const report = (extra) => spawnSync(process.execPath,
  ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", "testing",
   "--judge-model", "m", "--judge-effort", "high", ...extra], { encoding: "utf8" });

// AC1 — the superseded flags are GONE, and the refusal SAYS WHAT TO DO. A
// removal that leaves the caller guessing is a worse removal.
for (const flag of [["--all-groups"], ["--group", "architecture"]]) {
  const r = report(flag);
  if (r.status === 0) {
    fails.push(`AC1: report still accepted ${flag[0]} — §11 v5 supersedes the eager path, and leaving the flag reachable leaves the over-generation one argument away`);
  } else if (!/--ids/.test(String(r.stderr))) {
    fails.push(`AC1: the ${flag[0]} refusal does not name the replacement (--ids) — a removal that does not say what to write instead sends the caller guessing`);
  }
}

// AC5 — an unresolvable id refuses AND lists what does resolve.
{
  const r = report(["--ids", "G99"]);
  if (r.status === 0) {
    fails.push("AC5: an unresolvable id was ACCEPTED");
  } else {
    if (!/G1|G2|G3/.test(String(r.stderr))) {
      fails.push("AC5: the refusal does not list the ids that DO resolve — it sends the owner back to re-read a screen they already read");
    }
    if (!/renumber|printed them/.test(String(r.stderr))) {
      fails.push("AC5: the refusal does not say ids are valid for the run that printed them — story 1.56 AC11 is why a stale list fails, and the message is where an owner learns it");
    }
  }
}

// SQ3, answered — an empty set REFUSES rather than rendering nothing.
{
  const r = report(["--ids", ""]);
  if (r.status === 0) fails.push("SQ3: an empty --ids was accepted — a report of nothing has no identity worth colliding on");
}

// AC7 + the third state — SEAM-GATED, because these render. PR #356 round 1
// found that NO case entered a `G<n>-<m>` at all: the SubGroup section shape,
// the G5+G5-1 cover case and `resolveEnteredIds`' SubGroupID derivation were
// all unexercised, and the suppressed-split notice had a reader with no writer.
{
  const dir = mkdtempSync(join(tmpdir(), "ac7-"));
  const pin = JSON.parse(readFileSync(FIXTURE, "utf8")).pin;
  const claims = join(dir, "c.json");
  writeFileSync(claims, JSON.stringify({
    composition_pin: { tag: "testing", pin, groups: {
      "testing × (no second served tag)": ["lesson:delta"],
      "testing × architecture": ["lesson:alpha", "lesson:bravo"],
      "testing × cost": ["lesson:charlie"] } },
    claims: { "testing × architecture": "both are guards of some kind" },
  }));
  // A real split, so G2 has a G2-1.
  const subs = join(dir, "s.json");
  writeFileSync(subs, JSON.stringify({
    "testing × architecture": { judged: true, subgroups: [
      { subgroup: "guards that cannot fail", claim: "a check whose inputs make failure unreachable",
        members: ["lesson:alpha"], composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
      { subgroup: "guards exercised by a real run", claim: "a check some run has made fail",
        members: ["lesson:bravo"], composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
    ] },
  }));
  const out = join(dir, "o");
  const r = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", "testing",
     "--ids", "G2,G2-1", "--claims", claims, "--subdivisions", subs,
     "--judge-model", "m", "--judge-effort", "high", "--report-dir", out, "--rendering-dir", out],
    { encoding: "utf8", env: { ...process.env, TSUREZURE_GATEWAY_JS: "checks/fixtures/terrain/compose-input/stub-gateway.mjs" } });
  const seamAbsent = r.status === 11
    || (r.status !== 0 && /policy_source unavailable|gateway/i.test(String(r.stderr) + String(r.stdout)));
  if (seamAbsent) {
    console.log("AC7: CANNOT-DETERMINE — the served seam is unavailable and `report` reads through it. "
      + "The seam-free canonicaliser and refusal cases above RAN.");
  } else if (r.status !== 0) {
    fails.push(`AC7: entering a SubGroup id exited ${r.status}: ${(r.stderr || "").trim().slice(0, 200)}`);
  } else {
    const md = readdirSync(out).filter((f) => f.endsWith(".md"));
    const body = md.length === 1 ? readFileSync(join(out, md[0]), "utf8") : "";
    if (!/^## G2-1 — /m.test(body)) {
      fails.push("AC7: entering `G2-1` produced no `## G2-1` section — a SubGroup id is a section of its own, not a pointer at its parent");
    }
    if (!/^## G2 — /m.test(body)) {
      fails.push("AC7: `G2` and `G2-1` entered together did not both render — the entered set is the unit, and a member under both is a COVER, not a duplication (§2.1)");
    }
    // AC4c — the map is merged and DEDUPED across sections, so alpha appears
    // once despite being in both G2 and G2-1.
    const rows = (body.match(/^\| L[0-9]+ \|/gm) || []);
    if (new Set(rows).size !== rows.length) {
      fails.push(`AC4c: the served-lines map repeats a member across sections — ${JSON.stringify(rows)}. Merged and DEDUPED is what keeps it honest rather than merely shorter`);
    }
  }
  rmSync(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// §13 the provenance neighborhood — story 1.44 (kogaki#302, umbrella #300).
//
// Every case calls the exported composer with an injected record set, so the
// block is SEAM-FREE: `neighborhoodOf` takes the served records as an argument
// and reaches nothing. AC7 asks each property for a case that FAILS without the
// implementation, so each assertion below states what it would miss.
{
  const rec = (slug, batch, links = [], projects = []) =>
    ({ slug, kind: "lesson", source_batch: batch, cross_links: links, projects });
  // §13.3's join reads a BATCH RECORD's own family-keyed `members`, so the
  // fixtures supply them rather than letting the composer re-derive membership
  // from the element set — re-deriving is the mechanism AC3 does NOT name.
  const batch = (id, lessons) => ({ id, kind: "batch", members: { lesson: lessons } });

  // AC2 — the substrates enumerate AND each suggestion records which reached
  // it. A run that surfaced the right members with no substrate would satisfy
  // "enumerate" and fail §13.4's disclosure, so the substrate field is asserted
  // and not only the membership.
  {
    const records = [
      rec("seed", "q_a/2026-08-01-x", ["linked"]),
      rec("mate", "q_a/2026-08-01-x"),
      rec("linked", "q_a/other"),
      rec("far", "q_a/unrelated"),
      batch("q_a/2026-08-01-x", ["seed", "mate"]),
      batch("q_a/other", ["linked"]), batch("q_a/unrelated", ["far"]),
    ];
    const { suggestions } = neighborhoodOf(records, ["seed"]);
    const bySlug = Object.fromEntries(suggestions.map((s) => [s.slug, s]));
    if (!bySlug.mate || !bySlug.mate.substrates.includes("source_batch")) {
      fails.push("§13/1.44 AC2: a same-batch member was not reached, or was reached without naming source_batch as the substrate that reached it");
    }
    // The cross-link half of this case retired with the substrate (kogaki#686).
    // What replaces it is the NEGATIVE: a record reachable only by a reference
    // link, in another batch, must NOT surface.
    if (bySlug.linked) {
      fails.push("§13/686 AC2: a reference-linked member in another batch surfaced — exploration is same-Batch only");
    }
    if (bySlug.far) fails.push("§13/1.44 AC2: an unrelated member was surfaced — the enumeration is not bounded by the substrates");
    if (bySlug.seed) fails.push("§13/1.44 AC2: the seed itself was surfaced as its own neighbor");
  }

  // AC3 — THE JOIN DOES NOT HOLD BY EQUALITY. This is the case that fails
  // against a naive implementation: both records are the same sitting, and
  // their raw `source_batch` strings DIFFER, so `===` returns no batch-mate and
  // presents "no same-sitting siblings" for a Grain that has one.
  {
    const records = [
      rec("legacy-seed", "q_a/3/answer.md"),
      rec("legacy-mate", "q_a/3"),
      batch("q_a/3", ["legacy-seed", "legacy-mate"]),
    ];
    const { suggestions } = neighborhoodOf(records, ["legacy-seed"]);
    if (!suggestions.some((s) => s.slug === "legacy-mate")) {
      fails.push("§13/1.44 AC3: `q_a/3/answer.md` did not join `q_a/3` — an equality join returns no batch-mates for every Grain in the 12 legacy numbered batches and presents that as having none");
    }
    // And the inverse direction, so the normalisation is not one-way.
    const back = neighborhoodOf(records, ["legacy-mate"]).suggestions;
    if (!back.some((s) => s.slug === "legacy-seed")) {
      fails.push("§13/1.44 AC3: the batch join is not symmetric — `q_a/3` did not reach `q_a/3/answer.md`");
    }
  }

  // AC3 — THE MECHANISM, not just the effect. A batch record's `members` is
  // the batch's OWN statement of who was in the sitting, and it is what §13.3
  // names. An implementation that instead re-derives membership by grouping
  // elements on their own `source_batch` gets the same answer whenever the two
  // agree — so this case makes them DISAGREE: `adopted` is listed in the batch
  // and its own record points somewhere else. Only the declared mechanism
  // reaches it.
  {
    const records = [
      rec("anchor", "q_a/2026-05-05-s"),
      rec("adopted", "q_a/somewhere-else"),
      batch("q_a/2026-05-05-s", ["anchor", "adopted"]),
      batch("q_a/somewhere-else", ["adopted"]),
    ];
    const got = neighborhoodOf(records, ["anchor"]).suggestions.map((x) => x.slug);
    if (!got.includes("adopted")) {
      fails.push("§13/1.44 AC3: a member the BATCH RECORD lists was not reached — the join is re-deriving membership from each element's own source_batch instead of reading the batch's `members`, which is the mechanism §13.3 names and the one that survives an element disagreeing with its batch");
    }
  }

  // A BATCH IS NEVER A SUGGESTION. Batch records are the join table; they carry
  // `id` rather than `slug` and are not elements an owner can take. The case
  // makes one reachable — a cross_link naming a batch id — so an implementation
  // that indexes batches alongside elements surfaces it and fails here.
  {
    const records = [
      rec("s", "q_a/b1", ["q_a/b2"]),
      batch("q_a/b1", ["s"]), batch("q_a/b2", ["other"]), rec("other", "q_a/b2"),
    ];
    const got = neighborhoodOf(records, ["s"]).suggestions.map((x) => x.slug);
    if (got.includes("q_a/b2")) {
      fails.push("§13/1.44 AC2: a BATCH surfaced as a suggestion — batch records are the join table, not elements, and an owner cannot take one");
    }
  }

  // THE TWO KEY SPACES. A group's members are candidate ids; the served corpus
  // is keyed by slug. This case exists because the conflation is INVISIBLE at
  // the composer's boundary — it returns a perfectly well-formed empty — and
  // was found only by running the command against the real seam.
  {
    const cands = [{ id: "lesson:a", slug: "a" }, { id: "lesson:b", slug: "b" }];
    const r = settledSlugs(cands, ["lesson:a", "lesson:b"]);
    if (r.slugs.join(",") !== "a,b") {
      fails.push(`§13/1.44 AC1: candidate ids did not map to served slugs (got ${JSON.stringify(r.slugs)}) — the settled set would reach nothing and the run would report an informative empty it has not earned`);
    }
    const u = settledSlugs(cands, ["lesson:a", "lesson:gone"]);
    if (!u.unmapped.includes("lesson:gone")) {
      fails.push("§13/1.44 AC4: a settled id naming no candidate was DROPPED rather than named — the same silent-empty defect the unresolved marker exists to prevent");
    }
  }

  // A BATCH MEMBER THE SERVED SET DOES NOT CARRY IS MARKED. The batch itself
  // resolves, so the source_batch arm reports nothing and the member simply
  // vanishes — §13.0's silent exclusion one layer in from the case AC4 names.
  // Round-1 finding on PR #367; the cross_links arm already had this.
  {
    const records = [
      rec("seed", "q_a/b"),
      batch("q_a/b", ["seed", "vanished"]),
    ];
    const r = neighborhoodOf(records, ["seed"]);
    if (!r.unresolved.some((u) => u.value === "vanished")) {
      fails.push("§13/1.44 AC4: a batch member no served record carries was DROPPED rather than marked — the batch resolved, so nothing else reports it and the neighborhood is quietly smaller");
    }
  }

  // REMOVED WITH THE WALK IT COVERED (kogaki#686). This case asserted that a
  // dangling reference reachable by two cross_links paths is counted once — a
  // property of the depth-2 frontier's expanded-set, which no longer exists.
  // Deleted rather than left asserting over a traversal the ruling removed: a
  // case whose subject is gone is not coverage, it is a fixture that cannot
  // fail. The double-count property that SURVIVES — one unserved batch member
  // shared by two seeds producing one unresolved reference — has its own case
  // below and is untouched.

  // AC8 — DISJOINTNESS ASSERTED AGAINST AN `L` SPACE THAT IS ACTUALLY PRESENT.
  // The first version of this case tested the `nid` shape over output holding
  // only `N` tokens, so the intersection it asserted was with the empty set and
  // it could not fail on the defect kogaki#300's fill names. Here the survey's
  // own display ids are in hand and the assertion is a real intersection.
  {
    const surveyDisplayIds = new Set(["L1", "L2", "L3"]);
    const records = [
      rec("seed", "q_a/b"),
      batch("q_a/b", ["seed", "n-one", "n-two"]),
      rec("n-one", "q_a/b"), rec("n-two", "q_a/b"),
    ];
    const nids = neighborhoodOf(records, ["seed"]).suggestions.map((x) => x.nid);
    if (nids.length < 2) {
      fails.push("§13/1.44 AC8: the disjointness case needs at least two suggestions to be worth asserting over");
    }
    const collide = nids.filter((n) => surveyDisplayIds.has(n));
    if (collide.length) {
      fails.push(`§13/1.44 AC8: suggestion id(s) ${collide.join(", ")} collide with the survey's OWN display ids — §14.6's fill declares the two spaces disjoint, and an owner surface rendering both would name two different elements with one token`);
    }
  }

  // THE COMPOSITION OF THE TWO PROPERTIES (kogaki#369). Two seeds share one
  // batch, and that batch lists one member the served set does not carry. Each
  // property already had a case and neither caught this: the batch-marker case
  // has ONE seed, and the double-count case has TWO seeds and NO dangling
  // member. A per-seed walk restates the batch's fact once per seed.
  {
    const records = [
      rec("s1", "q_a/shared"), rec("s2", "q_a/shared"),
      batch("q_a/shared", ["s1", "s2", "vanished"]),
    ];
    const r = neighborhoodOf(records, ["s1", "s2"]);
    const hits = r.unresolved.filter((u) => u.value === "vanished");
    if (hits.length !== 1) {
      fails.push(`§13/1.44 AC4: one unserved member of a batch shared by 2 seed(s) produced ${hits.length} unresolved reference(s) — the member list is a fact about the BATCH and is being restated once per seed, so the screen's count scales with the settled set instead of with the missing records`);
    }
  }

  // THE SUBJECT FIELD IS PINNED, because it is now HETEROGENEOUS. `unresolved`
  // carries four kinds of entry and `slug` holds a served record's slug for
  // three of them and a BATCH ID for the fourth — the screen renders it as
  // `${u.slug}: ${u.value} — ${u.why}`, so a wrong subject misattributes the
  // fact to a record that did not state it. No case read this field before
  // (both batch cases filter on `value`), so a mutation writing any subject
  // at all passed the whole mutation pass. Round-1 finding on PR #370.
  {
    const records = [
      rec("s1", "q_a/shared"), rec("s2", "q_a/shared"),
      rec("orphan", undefined),
      batch("q_a/shared", ["s1", "s2", "vanished"]),
    ];
    const r = neighborhoodOf(records, ["s1", "s2", "orphan"]);
    // BOTH ASSERTIONS ASSERT PRESENCE FIRST. Locating an entry and then
    // guarding the check on having found it is FAIL-OPEN: the locator misses,
    // the assertion is skipped, and nothing reports that the case stopped
    // testing anything — in the case whose whole purpose is to stop a field
    // going unasserted. Round-2 finding on PR #370.
    const member = r.unresolved.find((u) => u.value === "vanished");
    if (!member) {
      fails.push("§13/1.44 AC4: no unresolved entry for the unserved batch member — the subject assertion below would have been SKIPPED rather than failed, so the case must fail here instead");
    }
    if (member && member.slug !== "q_a/shared") {
      fails.push(`§13/1.44 AC4: the dangling-member entry names ${JSON.stringify(member.slug)} as its subject — the fact is the BATCH's, so the subject is the batch key, and any other value misattributes it on the screen line that renders it`);
    }
    // The locator is a SUBSTRING of the production prose, not an equality on
    // it: an exact match reads a sentence `terrain.mjs` owns, so rewording it
    // there would silently disarm this case. The looser form is what the
    // neighbouring pre-existing assertion in this file already uses.
    const seedScoped = r.unresolved.find((u) => (u.why || "").includes("no source_batch"));
    if (!seedScoped) {
      fails.push("§13/1.44 AC4: no SEED-scoped unresolved entry was found for the record carrying no source_batch — the subject assertion below would have been skipped rather than failed");
    }
    if (seedScoped && seedScoped.slug !== "orphan") {
      fails.push(`§13/1.44 AC4: a SEED-scoped unresolved entry names ${JSON.stringify(seedScoped.slug)} as its subject rather than the seed — the two kinds share one field and only the subject distinguishes them`);
    }
  }

  // §13/1.60 AC5 — A ZERO-CANDIDATE SURVEY STATES WHICH IT IS. The two causes
  // were indistinguishable, which is how kogaki#368 survived: an empty survey
  // validated and exited zero whether the corpus had no Lessons or the call
  // never reached one.
  {
    if (surveyEmptinessNote(0, 5) !== null) {
      fails.push("§13/1.60 AC5: a survey WITH candidates emitted an emptiness note");
    }
    const nothing = surveyEmptinessNote(0, 0) || "";
    const someNonLessons = surveyEmptinessNote(814, 0) || "";
    if (!/about the call/.test(nothing)) {
      fails.push(`§13/1.60 AC5: 0 served records did not read as a statement about the CALL: ${JSON.stringify(nothing)}`);
    }
    if (!/about the corpus/.test(someNonLessons) || !/814/.test(someNonLessons)) {
      fails.push(`§13/1.60 AC5: served-but-no-Lessons did not read as a statement about the CORPUS naming its denominator: ${JSON.stringify(someNonLessons)}`);
    }
    if (nothing === someNonLessons) {
      fails.push("§13/1.60 AC5: the two empty causes render IDENTICALLY — which is the ambiguity the criterion exists to remove");
    }
  }

  // AC4 — unresolved is MARKED, never empty. Two shapes: a record with no
  // source_batch at all, and a cross_link naming a slug nothing serves.
  {
    const records = [rec("no-batch", undefined, ["ghost"]), rec("orphan", "q_a/nonesuch")];
    const { unresolved } = neighborhoodOf(records, ["no-batch", "orphan"]);
    if (!unresolved.some((u) => u.why.includes("no source_batch"))) {
      fails.push("§13/1.44 AC4: a record with no source_batch produced no unresolved marker — an empty result was presented as 'no siblings'");
    }
    if (!unresolved.some((u) => u.why.includes("names a batch no served record carries"))) {
      fails.push("§13/1.44 AC4: a source_batch naming a batch nothing serves produced no marker — this is the case an element-side grouping cannot see, because it has no batch record to miss");
    }
    // The dangling-cross_link marker retired with the walk (kogaki#686). The
    // two batch-side markers above are the ones that survive, and they are the
    // ones §13.0's silent-exclusion rule was written for.
    // The marker NAMES THE VALUE — a bare count would satisfy "marked" and
    // leave the reader unable to act, which is the disclosure AC4 asks for.
    for (const u of unresolved) {
      if (!("value" in u)) fails.push("§13/1.44 AC4: an unresolved marker does not carry the value it could not resolve");
    }
  }

  // AC4 negative — resolvable but genuinely alone is NOT unresolved. Without
  // this the marker fires on every solitary Grain and stops discriminating.
  {
    const { unresolved } = neighborhoodOf(
      [rec("alone", "q_a/solo"), batch("q_a/solo", ["alone"])], ["alone"]);
    if (unresolved.length !== 0) {
      fails.push("§13/1.44 AC4: a Grain whose batch resolves and has no siblings was marked unresolved — the marker must separate 'could not look' from 'nothing to see'");
    }
  }

  // AC5 — THE DECLARED BOUND, and after kogaki#686 the bound IS the substrate
  // set. Exploration is same-Batch only, so what discriminates a correct
  // implementation is no longer "two hops and not three" but "batch membership
  // and nothing else": records linked to one another in DIFFERENT batches must
  // surface none of them.
  {
    const records = [
      rec("s", "q_a/z", ["a"]), rec("a", "q_a/z2", ["b"]),
      rec("b", "q_a/z3", ["c"]), rec("c", "q_a/z4"),
      batch("q_a/z", ["s"]), batch("q_a/z2", ["a"]),
      batch("q_a/z3", ["b"]), batch("q_a/z4", ["c"]),
    ];
    const got = neighborhoodOf(records, ["s"]).suggestions.map((x) => x.slug).sort();
    if (got.length) {
      fails.push(`§13/686: a reference-linked chain in OTHER batches surfaced ${JSON.stringify(got)} — exploration is fixed to the same Distill Batch and nothing else, so an implementation still walking links fails here`);
    }
  }


  // AC5 — shared carrier is OFF as a VALUE. Two records sharing a project and
  // nothing else must not surface at the declared setting; flipping the depth
  // to 1 must surface them, which proves the substrate EXISTS rather than
  // having been omitted from the code.
  {
    const records = [rec("p1", "q_a/a", [], ["kogaki"]), rec("p2", "q_a/b", [], ["kogaki"]),
      batch("q_a/a", ["p1"]), batch("q_a/b", ["p2"])];
    const off = neighborhoodOf(records, ["p1"]).suggestions;
    if (off.length !== 0) {
      fails.push("§13/1.44 AC5: shared carrier surfaced a member at the declared setting, where §13.3 v16 declares it OFF");
    }
    // THE INVERSE OF THE OLD ASSERTION, and the inversion is the point
    // (kogaki#686). This case used to prove shared_carrier was OFF-as-a-value
    // rather than absent, by turning its depth on and expecting a member. The
    // ruling DELETES it — a record kept beside its exception is exactly what
    // that doctrine removes — so the assertion now proves the substrate is
    // unreachable at any setting, which is what "deleted" means and what
    // "off" never did.
    const on = neighborhoodOf(records, ["p1"], { source_batch: 1, shared_carrier: 1 }).suggestions;
    if (on.some((x) => x.slug === "p2")) {
      fails.push("§13/686: shared_carrier surfaced a member when its depth was set — the substrate is DELETED, not off, so no setting may reach it");
    }
  }

  // AC5a — the bound changes HOW MANY, never WHICH. Widening cross_links must
  // only ADD; an implementation that scores or drops would change membership
  // rather than extend it, and the subset assertion is what catches that.
  {
    const records = [
      rec("s", "q_a/z", ["a"]), rec("a", "q_a/z2", ["b"]),
      rec("b", "q_a/z3", ["c"]), rec("c", "q_a/z4"),
      batch("q_a/z", ["s"]), batch("q_a/z2", ["a"]),
      batch("q_a/z3", ["b"]), batch("q_a/z4", ["c"]),
    ];
    const narrow = neighborhoodOf(records, ["s"], { source_batch: 1, cross_links: 1, shared_carrier: 0 })
      .suggestions.map((x) => x.slug);
    const wide = new Set(neighborhoodOf(records, ["s"], { source_batch: 1, cross_links: 3, shared_carrier: 0 })
      .suggestions.map((x) => x.slug));
    for (const slug of narrow) {
      if (!wide.has(slug)) {
        fails.push(`§13/1.44 AC5a: widening the bound REMOVED ${slug} — a bound may change how many neighbors surface and never which, so a member lost under a wider bound means the implementation ranks or drops`);
      }
    }
  }

  // AC8 — the display-id space. `N<n>` minted over the sorted output, and
  // DISJOINT from `L<n>` (§14.6, filled kogaki#300 2026-08-12).
  {
    const records = [rec("s", "q_a/z", ["a", "b"]), rec("a", "q_a/z2"), rec("b", "q_a/z3"),
      batch("q_a/z", ["s"]), batch("q_a/z2", ["a"]), batch("q_a/z3", ["b"])];
    const { suggestions } = neighborhoodOf(records, ["s"]);
    if (!suggestions.every((x) => /^N[0-9]+$/.test(x.nid))) {
      fails.push("§13/1.44 AC8: a suggestion carries no `N<n>` id, or one that does not match the declared shape");
    }
    if (suggestions.some((x) => /^L[0-9]+$/.test(x.nid))) {
      fails.push("§13/1.44 AC8: a suggestion was assigned an `L<n>` — the spaces are DECLARED DISJOINT and §14.3 remains the sole assignor of `L<n>`, for survey members only");
    }
    // MINTED OVER THE SORT, and the case has to discriminate that from
    // discovery order — two calls on one input share a discovery order, so
    // comparing them proves nothing. The seed links z-late BEFORE a-early, so
    // discovery order and sorted order disagree and only one puts N1 on
    // a-early.
    // REBUILT ON BATCH MEMBERSHIP (kogaki#686). The discriminator was a seed
    // linking z-late before a-early, so discovery and sorted order disagreed;
    // with the walk gone the same disagreement is produced by a batch that
    // LISTS its members z-late first.
    const ordered = neighborhoodOf(
      [rec("root", "q_a/o"), rec("z-late", "q_a/o"), rec("a-early", "q_a/o"),
       batch("q_a/o", ["root", "z-late", "a-early"])],
      ["root"]).suggestions;
    const n1 = ordered.find((x) => x.nid === "N1");
    if (!n1 || n1.slug !== "a-early") {
      fails.push(`§13/1.44 AC8: N1 went to ${n1 ? n1.slug : "nothing"} — ids are minted over DISCOVERY order, not the sort, so they are unstable under any change to link order`);
    }
  }

  // AC6 — empty is a result. The enumeration itself is empty here, which is
  // the only form v16 leaves (AC6a): the STRONG form rested on a Thesis and
  // was withdrawn with it, so nothing asserts it.
  {
    const { suggestions, counts } = neighborhoodOf(
      [rec("lonely", "q_a/only"), batch("q_a/only", ["lonely"])], ["lonely"]);
    if (suggestions.length !== 0) fails.push("§13/1.44 AC6: a seed with no provenance neighbors surfaced something");
    if (counts.seeds !== 1) fails.push("§13/1.44 AC6: the seed count is not reported, so an empty result cannot be read as a result");
  }
}
console.log("provenance neighborhood (§13, story 1.44): the three substrates enumerate and each suggestion "
  + "NAMES the substrate that reached it; the batch join holds through the batch key and is symmetric, so the "
  + "12 legacy `q_a/N/answer.md` batches resolve where an equality join returns nothing; unresolved references "
  + "are marked WITH THEIR VALUE and a resolvable-but-solitary Grain is NOT marked, which is what keeps the two "
  + "apart; the declared bound is asserted in both directions (two hops reached, three refused) and shared "
  + "carrier is proven OFF-as-a-value by turning it on; widening only ADDS, so a ranking implementation fails; "
  + "and `N<n>` is disjoint from `L<n>` and stable across calls. Seam-free — every case injects its records.");
// ---------------------------------------------------------------------------
// §13 THE NEIGHBORHOOD SECTION — kogaki#686 (owner ruling 2026-08-28).
//
// THIS BLOCK REPLACES stories 1.45 and 1.61's display cases WHOLESALE, and the
// replacement is the honest move rather than an edit. Those cases asserted the
// per-family ratios, the grouping headings, the two-totals headline, the
// report-not-proposal line and the unresolved section — every one a
// §13.0/§13.1/§13.4 disclosure obligation over an enumeration this section no
// longer performs. Reshaping them would keep assertions whose subject is gone;
// deleting them without replacement would drop the display from coverage
// entirely. What follows covers the shape the ruling actually fixes.
{
  // THE FIXTURE SUPPLIES WHAT THE PIPELINE SUPPLIES, and no more. It used to
  // set `gloss`, a field `cmdReport` cannot produce — so the four-fields case
  // asserted a value the production path never builds, which is a case that
  // cannot fail for the reason it claims to cover. `gloss: null` is what the
  // pipeline actually hands the screen.
  const S = (n, level, extra = {}) => ({
    nid: `N${n}`, slug: `s${n}`, level,
    relation: "from the same Batch as the settled set (q_a/x)",
    gloss: null, claim: `claim ${n}`, ...extra,
  });
  const screen = (suggestions) =>
    neighborhoodScreen({ tag: "T", gids: ["G1"], suggestions, unresolved: [], counts: {} });

  // THE HIGHEST LEVEL PRESENT, never a mix.
  {
    const lines = screen([S(1, "core"), S(2, "useful"), S(3, "background")]).join("\n");
    if (!lines.includes("3 candidate(s) found, 1 shown")) {
      fails.push("§13/686: the counts are not honest — expected \"3 candidate(s) found, 1 shown\"");
    }
    if (lines.includes("[useful]") || lines.includes("[background]")) {
      fails.push("§13/686: a row below the highest level present rendered — only the top level is shown");
    }
  }

  // FALLS TO THE NEXT LEVEL when the top one is empty — "highest level
  // PRESENT", never "core".
  {
    const lines = screen([S(1, "useful"), S(2, "background")]).join("\n");
    if (!lines.includes("`useful`") || lines.includes("[background]")) {
      fails.push("§13/686: with no `core` candidate the section did not fall to `useful` as the highest level present");
    }
  }

  // THE FOUR RULED FIELDS, and no deleted element beside them.
  {
    const lines = screen([S(1, "core")]).join("\n");
    for (const [what, frag] of [["the Strand ID", "N1"], ["the relation in plain words", "from the same Batch"],
                                ["the Gloss slot, disclosed as unfetched", "gloss unrecorded"],
                                ["the claim", "claim 1"], ["the level", "[core]"]]) {
      if (!lines.includes(frag)) fails.push(`§13/686: the row does not carry ${what}`);
    }
    for (const gone of ["reached by:", "rendering(s)", "suggestion(s) of", "never a proposal", "Bound:"]) {
      if (lines.includes(gone)) {
        fails.push(`§13/686: a DELETED display element survived — ${JSON.stringify(gone)}. Disposition 4 deletes it rather than keeping it beside an exception`);
      }
    }
  }

  // THE GLOSS SLOT IN BOTH DIRECTIONS. Absent it DISCLOSES; supplied it renders.
  // Only the first is reachable on the shipped path today, which is why the
  // second is asserted here rather than assumed to follow.
  {
    const withGloss = screen([S(1, "core", { gloss: "a served headline." })]).join("\n");
    if (!withGloss.includes("a served headline.") || withGloss.includes("gloss unrecorded")) {
      fails.push("§13/686: a SUPPLIED gloss did not render — the disclosure arm must not swallow the value arm");
    }
  }

  // THE CAP AND ITS REFUSAL. At ten it renders; above ten at the highest level
  // it renders nothing and states why — the tie-break among equals is the act
  // it declines to make.
  {
    const ten = screen(Array.from({ length: 10 }, (_, i) => S(i + 1, "core"))).join("\n");
    if (!ten.includes("10 candidate(s) found, 10 shown")) {
      fails.push("§13/686: exactly ten at the highest level did not render — the cap is AT MOST ten, not fewer than ten");
    }
    const eleven = screen(Array.from({ length: 11 }, (_, i) => S(i + 1, "core"))).join("\n");
    if (!eleven.includes("0 shown") || eleven.includes("[core]")) {
      fails.push("§13/686: eleven at the highest level rendered rows — above the cap the section refuses rather than truncating, because choosing which ten the owner sees is a tie-break among equals it has no ground to make");
    }
    if (!eleven.includes("11 sit at the highest level")) {
      fails.push("§13/686: the refusal does not state the count it refused over — a refusal hiding its denominator is the silent exclusion §13.0 removes");
    }
  }

  // UNJUDGED IS ITS OWN STATE, counted and named.
  {
    const mixed = screen([S(1, "core"), { nid: "N2", slug: "s2" }]).join("\n");
    if (!mixed.includes("1 candidate(s) carry no level")) {
      fails.push("§13/686: an unjudged candidate was neither counted nor named — the judgment layer not having run is a different state from a `background` verdict");
    }
    const none = screen([{ nid: "N1", slug: "s1" }]).join("\n");
    if (!none.includes("the judgment layer did not")) {
      fails.push("§13/686: with no candidate judged the section did not say the judgment layer had not run");
    }
  }

  // THE VOCABULARY IS CLOSED AT THE READER. An unrecognised level would sort as
  // "unjudged", showing a judged candidate as unjudged — the silent exclusion
  // one layer in — so it is refused rather than passed through.
  //
  // ASSERTED THROUGH A SUBPROCESS, because `fail` exits rather than throwing:
  // an in-process try/catch cannot observe it and would kill this suite instead
  // of recording a case. The refusal's own exit is the observable.
  {
    const f = mkdtempSync(join(tmpdir(), "neigh-judg-"));
    try {
      const probe = (obj) => {
        const jf = join(f, "j.json");
        writeFileSync(jf, JSON.stringify(obj));
        return spawnSync(process.execPath, ["-e",
          `import("./terrain/terrain.mjs").then(m => m.readNeighborhoodJudgments(${JSON.stringify(jf)}))`],
          { encoding: "utf8" });
      };
      const bad = probe({ s1: { level: "critical", claim: "x" } });
      if (bad.status === 0) {
        fails.push("§13/686: a level outside the harness-fixed set was accepted — the set is closed");
      } else if (!/core \| useful \| background/.test(bad.stderr || "")) {
        fails.push("§13/686: the out-of-set refusal does not name the set it enforces");
      }
      const noClaim = probe({ s1: { level: "core" } });
      if (noClaim.status === 0) {
        fails.push("§13/686: a level with no claim was accepted — a rank with no reason has nothing to render");
      }
      const ok = probe({ s1: { level: "core", claim: "a reason" } });
      if (ok.status !== 0) {
        fails.push(`§13/686: a WELL-FORMED judgment was refused (${(ok.stderr || "").trim()}) — the refusals must discriminate, not reject everything`);
      }
    } finally { rmSync(f, { recursive: true, force: true }); }
  }
}

console.log("neighborhood section (§13, kogaki#686): the display is asserted over the COMPOSED "
  + "LINES rather than the enumerator, for the reason the block it replaces gave — an enumerator "
  + "returning a structure the screen prints wrongly satisfies the enumeration cases and ships the "
  + "defect. Asserted in both directions: only the HIGHEST level present renders and a lower one "
  + "never does; the level falls to `useful` when no `core` is judged; the four ruled fields are "
  + "each present and every DELETED element is absent; the cap renders AT ten and REFUSES above "
  + "ten, stating the count it refused over rather than truncating; an unjudged candidate is "
  + "counted and named as its own state, distinct from `background`; and the level vocabulary is "
  + "closed at the reader, probed through a SUBPROCESS because the refusal exits rather than "
  + "throwing, with a well-formed judgment accepted in the same pass so the refusals discriminate "
  + "rather than reject everything.");


if (fails.length) {
  console.log("FAIL entered ID set (SPEC-terrain §12 v6/v7, story 1.58):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("entered ID set: canonicalIds is NUMERIC-AWARE (G5-1 before G10, and the case asserts plain "
  + "string sort would NOT give that order, so it cannot pass vacuously), dedupes, and sorts a parent "
  + "before its SubGroups; both superseded flags refuse AND name --ids; an unresolvable id refuses listing "
  + "what resolves and why a stale list fails; an empty set refuses. Seam-free — every case is a unit call "
  + "or a refusal that precedes the seam.");
JS

# §12.2 v12's RETIREMENT, ASSERTED SEAM-FREE (PR #436 round 1, finding 4).
# Every case that reached `retireIdentityNamedRenderings` before this one ran
# through `report`, which reads served Gloss — so on a machine with no gateway
# they all degraded to CANNOT-DETERMINE and DELETING THE WHOLE RETIREMENT LEFT
# THE SUITE GREEN. That is the PR #225 signature this file warns about
# elsewhere, arriving in the block written to prove the newest clause. The unit
# call below runs everywhere, and the announcement is asserted as well as the
# deletion: v12 says "retired on sight, announced in one line, NEVER silently",
# so a mutation that removes the `console.log` and keeps the `rmSync` must fail
# here, and it does.
node --input-type=module - <<'JS'
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { retireIdentityNamedRenderings } from "./terrain/terrain.mjs";

const fails = [];
const dir = mkdtempSync(join(tmpdir(), "kogaki-v12-retire-"));

// Two identity-named renderings, the fixed name, and a bystander. The
// bystander is not decoration: a retirement that simply emptied the directory
// would satisfy a delete-only assertion, and the owner's own notes sitting
// beside their report is exactly what that would destroy.
writeFileSync(join(dir, "terrain-full-report-aaaa1111.md"), "stale one\n");
writeFileSync(join(dir, "terrain-full-report-bbbb2222.md"), "stale two\n");
writeFileSync(join(dir, "FullReport.md"), "# Full Report\n\n## Group\n");
writeFileSync(join(dir, "notes.md"), "the owner's own file\n");

const said = [];
const realLog = console.log;
console.log = (...a) => said.push(a.join(" "));
try {
  retireIdentityNamedRenderings(dir);
} finally {
  console.log = realLog;
}

const left = readdirSync(dir).sort();

// THE DELETION.
const stragglers = left.filter((f) => f.startsWith("terrain-full-report-"));
if (stragglers.length) {
  fails.push(`identity-named rendering(s) survived retirement: ${stragglers.join(", ")} — §12.2 v12 retires them ON SIGHT, and one left standing is the accumulation the ruling was written against`);
}

// THE SURVIVORS. Scope is the identity-named form, never "everything here".
if (!left.includes("FullReport.md")) {
  fails.push("the retirement deleted FullReport.md — it retires the MACHINE-NAMED form, and taking the owner's one rendering with it inverts the clause");
}
if (!left.includes("notes.md")) {
  fails.push("the retirement deleted an unrelated file (notes.md) — its scope is `terrain-full-report-*.md`, not the rendering directory's contents");
}

// THE ANNOUNCEMENT. "never silently" is half the clause, and it is the half a
// delete-only assertion cannot see.
const announced = said.join("\n");
if (!announced.trim()) {
  fails.push("the retirement said NOTHING — §12.2 v12 requires one line announcing it, and a silent disposal is what `retireLegacyReportsDir`'s discipline exists to refuse");
} else if (!/retired/i.test(announced) || !/2/.test(announced)) {
  fails.push(`the announcement does not say what was retired or how many: ${JSON.stringify(announced.slice(0, 200))}`);
}

// THE NO-OP DIRECTION. Called on a clean directory it must stay silent —
// otherwise every ordinary run prints a disposal notice for nothing, which
// trains the reader to skip the line that matters.
const said2 = [];
const realLog2 = console.log;
console.log = (...a) => said2.push(a.join(" "));
try {
  retireIdentityNamedRenderings(dir);
} finally {
  console.log = realLog2;
}
if (said2.length) {
  fails.push(`the retirement announced itself with nothing to retire: ${JSON.stringify(said2.join(" ").slice(0, 200))} — an announcement on every run is not an announcement`);
}

if (fails.length) {
  console.log("FAIL §12.2 v12 retirement (kogaki#440):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("§12.2 v12 retirement: SEAM-FREE and RAN — both identity-named renderings deleted, "
  + "FullReport.md and an unrelated bystander left standing (so a directory-emptying implementation "
  + "fails), the disposal ANNOUNCED with its count (so a silent `rmSync` fails), and the no-op "
  + "direction asserted silent (so an announcement on every run fails). This is the case whose "
  + "absence let the whole retirement be deleted with the suite green on any machine without a seam.");
JS

# --------------------------------------------------------------------------
# §14.4.1 v18 — THE SCREEN IS DELIVERED AS AN ARTIFACT (kogaki#434, kogaki#464,
# story 1.66).
#
# The ruling: each screen is written by the runtime to `reports/Screen.md`, a
# fixed human name, overwritten on every render. It is here rather than beside
# the §12.2 v12 block because the two counts are SCOPED SEPARATELY — v12 counts
# Full Report renderings, this counts the screen, and §14.4.1 states which side
# wins for which artifact. A single "exactly one .md" assertion over the
# directory would now be false by construction and would have made this clause
# unimplementable.
#
# SEAM-FREE ON PURPOSE. Every §12.2 case reached its subject through `report`,
# which reads served Gloss, so on a machine with no gateway the whole behaviour
# could be deleted with the suite green (PR #436 round 1, finding 4). `view`
# without `--tag` fetches no headlines, so this case RUNS EVERYWHERE — the one
# property the block it is modelled on had to be rewritten to obtain.
#
# AND IT CARRIES ITS OWN MUTATION. Story 1.66's Verification section requires
# it: a screen test that passes when nothing is written is the defect class
# kogaki#243 tracks, and a case written to prove a delivery clause is exactly
# where that failure would be invisible. Two mutants run below — the write
# removed, and the hand-over line removed with the write left standing — and
# each must fail.
node --input-type=module - <<'JS'
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, symlinkSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const fails = [];
const A = "checks/fixtures/terrain/conforming/survey-two-strands.json";
const B = "checks/fixtures/terrain/conforming/survey-with-no-relation-section.json";

// THE INVOCATION PATH CHANGED, THE ASSERTIONS DID NOT (kogaki#665). §15.7
// removes `view` as an entry point, so this block drives `cotags` instead —
// a live entry point (`workflow.json` `bound_to_a_state`: "cotags: the
// cotag_screen state") that takes a fixture survey directly and writes
// `reports/Screen.md` through the same one private writer. What §14.4.1
// asserts here is the WRITE, the OVERWRITE-never-accumulate and the HAND-OVER
// line, and all three are properties of the screen artifact rather than of
// whichever state rendered it — which is why the swap is an invocation change
// and not a weakening. Both fixtures carry the tag named below.
const DELIVERY_TAG = "architecture";
function render(runtime, dir, survey) {
  return spawnSync(process.execPath,
    [runtime, "cotags", "--survey", survey, "--tag", DELIVERY_TAG], {
    encoding: "utf8", env: { ...process.env, KOGAKI_REPORTS_DIR: dir },
  });
}
const mds = (dir) => readdirSync(dir).filter((f) => f.endsWith(".md"));

// ---- AC1 + AC2, over the SHIPPED runtime ---------------------------------
// The two renders are DELIBERATELY DIFFERENT surveys. Rendering the same screen
// twice would pass on an implementation that wrote once and never overwrote,
// which is half of what AC2 asserts — "overwritten, never accumulated" has two
// failure directions and identical inputs can only see one.
// Every temp dir this block makes is registered for removal, as the block at
// :2770 it is modelled on already does. Five leaked per run — two holding a
// full copy of `terrain.mjs` — on every CI run and every local invocation
// (PR #465 round 1, finding 3).
const TEMPS = [];
const temp = (p) => { const d = mkdtempSync(join(tmpdir(), p)); TEMPS.push(d); return d; };
const dir = temp("kogaki-screen-artifact-");
const r1 = render("terrain/terrain.mjs", dir, A);
if (r1.status !== 0) fails.push(`the first screen render failed (exit ${r1.status}): ${(r1.stderr || "").trim().slice(0, 200)}`);
const after1 = mds(dir);
if (!after1.includes("Screen.md")) {
  fails.push(`no screen artifact was written — the tree holds ${JSON.stringify(after1)} and §14.4.1 names reports/Screen.md. A screen delivered only to stdout is the state kogaki#434 was filed against, because stdout is displayed to the model and not reliably to the owner`);
}
const r2 = render("terrain/terrain.mjs", dir, B);
if (r2.status !== 0) fails.push(`the second screen render failed (exit ${r2.status}): ${(r2.stderr || "").trim().slice(0, 200)}`);
const after2 = mds(dir);
if (after2.length !== 1) {
  fails.push(`after two renders the renderings directory holds ${after2.length} screen file(s) (${after2.join(", ")}) — §14.4.1 rules ONE, overwritten per render, and a second name accumulating is the §12.2 v12 defect arriving one artifact class over`);
}
if (after2.includes("Screen.md")) {
  const body = readFileSync(join(dir, "Screen.md"), "utf8");
  // The SECOND render's material, not the first: this is what makes the
  // assertion about overwriting rather than about existence.
  //
  // THE MARKER WAS RE-BOUND WITH THE INVOCATION (kogaki#665). It used to be
  // "no relation", a string `view`'s row listing produced; the co-tag screen
  // filtered to one tag never emits it, so carrying the old marker across the
  // swap would have made the assertion fail for a reason unrelated to
  // overwriting. `G2 —` is the new marker and it is MATERIAL rather than
  // incidental: fixture B composes a SECOND co-tag group and fixture A, with
  // one member, cannot — so the string is present exactly when the second
  // render's material is, which is the property this line claims.
  if (!body.includes("G2 —")) {
    fails.push("the screen artifact does not carry the SECOND render's material — the file exists but was not overwritten, so the owner opens a stale screen while the run reports success");
  }
}
// The hand-over FLOOR's runtime half: the artifact is NAMED. Writing the file
// and saying nothing produces exactly the owner-visible state the ruling was
// filed against, so the announcement is asserted, never assumed.
if (!/Screen — READ THIS ONE/.test(r1.stdout || "")) {
  fails.push("the run wrote the screen artifact and never named it — §14.4.1's hand-over floor binds to the HAND-OVER and never to the write");
}

// ---- THE MUTANTS ----------------------------------------------------------
// A copy of the runtime with one behaviour removed. `format-guard.mjs` travels
// with it because `terrain.mjs` imports it relatively; nothing else is needed,
// which is itself a property worth having (a mutant needing the whole tree is
// a mutant nobody runs).
// `expectRefusal` names the ONE case where a non-zero exit is the behaviour
// under test rather than a crash: a mutant whose whole point is that the format
// guard refuses it. Without the parameter the did-it-RUN guard below reports
// every such mutant as crashed, which is the guard doing its job on a case it
// was not written for — so the case declares itself instead of the guard being
// weakened for everyone.
function mutant(name, edit, expectRefusal = false) {
  const md = temp(`kogaki-screen-mutant-${name}-`);
  mkdirSync(join(md, "terrain"), { recursive: true });
  copyFileSync("terrain/format-guard.mjs", join(md, "terrain", "format-guard.mjs"));
  // `terrain.mjs` resolves its schemas from ITS OWN location (`REPO =
  // resolve(HERE, "..")`), never from the cwd — so a mutant that copies only
  // the two modules dies at import, before reaching the behaviour it mutates.
  // It then writes no artifact FOR THE WRONG REASON and the mutation reads as
  // killed while asserting nothing, which is
  // `a-verification-artifact-bound-by-belief-verifies-nothing` inside the case
  // written to prevent it. The sibling directories are linked so the mutant
  // resolves exactly what the shipped runtime resolves.
  for (const d of ["specs", "gates"]) symlinkSync(resolve(d), join(md, d), "dir");
  const src = readFileSync("terrain/terrain.mjs", "utf8");
  const out = edit(src);
  if (out === src) return { skipped: true };
  writeFileSync(join(md, "terrain", "terrain.mjs"), out);
  const rdir = temp(`kogaki-screen-mutant-${name}-out-`);
  const r = render(join(md, "terrain", "terrain.mjs"), rdir, A);
  // THE MUTANT MUST HAVE RUN. Every assertion below reads an ABSENCE, and an
  // absence produced by a crash is indistinguishable from one produced by the
  // removed behaviour. Asserting the exit first is what makes the kill mean
  // what it says.
  if (r.status !== 0 && expectRefusal) {
    // The refusal IS the run. Returned whole so the caller reads the exit and
    // the streams itself.
    return { r, rdir, runtime: join(md, "terrain", "terrain.mjs"), skipped: false, refused: true };
  }
  if (r.status !== 0) {
    fails.push(`the ${name} mutant did not RUN (exit ${r.status}): ${(r.stderr || "").trim().split("\n")[0].slice(0, 200)} — an absent artifact from a crashed mutant asserts nothing about the behaviour that was removed`);
    // `r` IS RETURNED so the caller can tell a crash from a no-match. Returning
    // a bare `{ skipped: true }` here made both skip causes identical at the
    // call site, so a crashed mutant emitted its honest "did not RUN" failure
    // AND the false "could not be constructed" one — a block asserting a
    // discrimination its own return shape does not make (PR #465 round 1,
    // finding 1).
    return { r, skipped: true };
  }
  return { r, rdir, runtime: join(md, "terrain", "terrain.mjs"), skipped: false };
}

// ---- THE REFUSAL'S REACH, bound rather than asserted (PR #667 round 2,
// carried to kogaki#625). `writeScreenSurface`'s own header claims "a
// nonconformant screen reaches neither the owner's terminal nor their
// artifact" and "there is no path here that emits first". For three heads that
// was true of the ARTIFACT and false of the TERMINAL: all three screen states
// printed the text and then called the writer, so a refused screen was printed
// in full and then not written. Nothing asserted the terminal half, which is
// how a structural property became a comment.
//
// INJECT_NONCONFORMANT makes the composed screen violate its own grammar. The
// pair below is the assertion and its own kill: the first says a refused screen
// reaches neither surface; the second HOISTS the print back above the writer
// and must therefore be caught by the first's assertion. Without the second,
// "stdout did not carry the line" would pass just as well on a runtime that
// never composed the line at all.
//
// THE INJECTION SITE IS LOAD-BEARING and was wrong once. Injecting inside the
// `emitOrRefuse` CALL bound the assertion to the mutants and not to the
// property: a runtime printing `text` before that call prints text the
// injection never touched, so hoisting the real print left the case green. The
// line is therefore appended to `text` ON ENTRY to the writer, upstream of both
// the print and the guard — which is what makes "whichever surface it reaches,
// it reaches with the injected line in it" true.
const INJECT = "!! INJECTED NONCONFORMANT LINE";
const inject = (s) => s.replace(
  "function writeScreenSurface(args, surface, text) {\n  let path = null;\n",
  `function writeScreenSurface(args, surface, text) {\n  text = text + "\\n${INJECT}";\n  let path = null;\n`);

const refused = mutant("nonconformant", inject, true);
if (refused.skipped && refused.r === undefined) {
  fails.push("the nonconformant-screen mutant could not be constructed — `writeScreenSurface`'s emitOrRefuse call no longer matches the text this case mutates, so the refusal's reach is verified by nothing");
} else {
  // This mutant is EXPECTED to fail: the grammar must refuse it. The harness's
  // did-it-RUN guard reads a non-zero exit as a crash, so this case reads the
  // exit itself rather than going through that guard's verdict.
  const said = `${(refused.r && refused.r.stdout) || ""}`;
  if (refused.r && refused.r.status === 0) {
    fails.push(`a screen carrying ${JSON.stringify(INJECT)} was ACCEPTED — the format guard admits a line class report-format.json does not declare, so §14.2's refusal is not gating this surface at all`);
  } else if (said.includes(INJECT)) {
    fails.push(`the refused screen REACHED THE OWNER'S TERMINAL: stdout carries ${JSON.stringify(INJECT)}. §14.2's guard gated the write and not the print, which is the state writeScreenSurface's own header says is unreachable ("there is no path here that emits first")`);
  }
}

// The kill. A runtime that prints before it validates must be caught by the
// assertion above, or that assertion is bound to nothing.
const hoisted = mutant("nonconformant-hoisted", (s) => {
  const injected = inject(s);
  if (injected === s) return s;
  // Exactly the pre-repair shape: the print moves OUT of the refusal callback
  // and above the guard, printing the same `text` the guard is about to refuse.
  const moved = injected.replace("    console.log(conformant);\n", "");
  if (moved === injected) return s;
  return moved.replace("  emitOrRefuse(surface, text,", "  console.log(text);\n  emitOrRefuse(surface, text,");
}, true);
if (hoisted.skipped && hoisted.r === undefined) {
  fails.push("the hoisted-print mutant could not be constructed, so the refusal-reach assertion above is unkilled and may be asserting nothing");
} else if (hoisted.r && !`${hoisted.r.stdout || ""}`.includes(INJECT)) {
  fails.push("HOISTING the print above the writer did NOT put the refused line on stdout — the refusal-reach assertion above cannot distinguish a guarded print from an unguarded one, so it verifies nothing");
}

// Mutant 1 — the write path is broken. The AC1/AC2 assertions above must fail.
const m1 = mutant("nowrite", (s) => s.replace(
  '  writeFileSync(path, text.endsWith("\\n") ? text : text + "\\n");\n', ""));
if (m1.skipped) {
  // Either the text moved or the mutant crashed; the crash case already
  // reported itself above, and this names the other one.
  if (m1.r === undefined) fails.push("the no-write mutant could not be constructed — `writeScreen`'s write no longer matches the text this case mutates, so the mutation is not exercising the write path it names");
} else if (mds(m1.rdir).includes("Screen.md")) {
  fails.push("the no-write mutant still produced Screen.md — the assertion above is not bound to the write path it claims to verify");
}

// Mutant 2 — the write survives and the HAND-OVER is removed. This is the
// mutant that matters most: it is the shape §14.4.1 explicitly names as
// satisfying the clause while producing the failure the clause is about.
const m2 = mutant("nohandover", (s) => s.replace(
  "  console.log(`Screen — READ THIS ONE (owner rendering, SPEC-terrain §14.4.1): ${relFromRepo(path)}`);\n", ""));
if (m2.skipped) {
  if (m2.r === undefined) fails.push("the no-hand-over mutant could not be constructed — `announceScreen`'s line no longer matches the text this case mutates");
} else {
  if (!mds(m2.rdir).includes("Screen.md")) {
    fails.push("the no-hand-over mutant wrote no artifact — the two mutants are not independent, so neither isolates its behaviour");
  }
  if (/Screen — READ THIS ONE/.test(m2.r.stdout || "")) {
    fails.push("the no-hand-over mutant still named the artifact — the hand-over assertion is not bound to the line it claims to verify");
  }
}

// Mutant 3 — WRITE-ONCE. The write survives and stops overwriting, which is
// AC2's own failure direction and the half this case exists for: mutant 1
// removes the write entirely, so an `existsSync` guard passes its absence check
// untouched and is caught only by the second-render-material read at :4270 —
// an assertion nothing had shown to fire (PR #465 round 1, finding 2). Left
// unmutated it was a coverage CLAIM rather than demonstrated coverage.
const m3 = mutant("writeonce", (s) => s.replace(
  '  writeFileSync(path, text.endsWith("\\n") ? text : text + "\\n");\n',
  '  if (!existsSync(path)) writeFileSync(path, text.endsWith("\\n") ? text : text + "\\n");\n'));
if (m3.skipped) {
  if (m3.r === undefined) fails.push("the write-once mutant could not be constructed — `writeScreen`'s write no longer matches the text this case mutates");
} else {
  const r3b = render(m3.runtime, m3.rdir, B);
  if (r3b.status !== 0) {
    fails.push(`the write-once mutant's second render did not RUN (exit ${r3b.status}) — the mutation asserts nothing if the run it depends on never happened`);
  } else {
    const f3 = mds(m3.rdir);
    if (!f3.includes("Screen.md")) {
      fails.push("the write-once mutant wrote no artifact at all — it is not isolating the OVERWRITE from the write, so it duplicates mutant 1 instead of covering AC2's second direction");
    // THE SAME RE-BINDING AS ITS PARTNER AT :4295 (kogaki#665, PR #667 round 1
    // finding 1). This assertion was left reading "no relation" when the
    // invocation swapped to `cotags`, which never emits it — so the mutant
    // passed whatever it did and the guard was DISARMED while the suite stayed
    // green. A mutation and the assertion it is meant to kill are ONE unit:
    // re-binding one without the other leaves a kill test that cannot kill.
    } else if (readFileSync(join(m3.rdir, "Screen.md"), "utf8").includes("G2 —")) {
      fails.push("the write-once mutant still produced the SECOND render's material — the overwrite assertion is not bound to the write it claims to verify, and a write-once implementation would ship green");
    }
  }
}

if (fails.length) {
  console.log("FAIL §14.4.1 screen-as-artifact (kogaki#464, story 1.66):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
for (const d of TEMPS) rmSync(d, { recursive: true, force: true });

// WHAT IS MUTATED AND WHAT IS NOT, separated. The first version of this line
// claimed four discriminations over two mutants, which is the coverage CLAIM
// this file refuses everywhere else (PR #465 round 1, finding 2).
console.log("§14.4.1 screen delivery: SEAM-FREE and RAN — the screen is written to reports/Screen.md, "
  + "ONE file after two renders of DIFFERENT surveys, carrying the SECOND render's material, and NAMED "
  + "on stdout. FIVE MUTANTS CONFIRMED, each asserted to have RUN before its absence is read: removing "
  + "the write kills the artifact assertion; guarding the write with `existsSync` kills the OVERWRITE "
  + "assertion (AC2's own direction, which removing the write entirely cannot reach); and removing the "
  + "hand-over line while keeping the write kills the floor assertion — the shape §14.4.1 names as "
  + "satisfying the clause while producing the failure it is about; and a screen made NONCONFORMANT ON ENTRY to the writer reaches NEITHER surface, with its own kill — hoisting the print back above the guard puts the refused line on stdout and is caught (kogaki#625, PR #667 round 2). The injection sits UPSTREAM of both the print and the guard, because injecting inside the guard’s own call bound the case to the mutants rather than to the property and left a hoisted real print green. NOT MUTATED, stated rather than "
  + "claimed: the fixed NAME holds by construction (the literal is joined inside `writeScreen`, so a "
  + "second screen name is unwritable), and a mutation would have to invent a second write path rather "
  + "than alter this one.");
JS

# --------------------------------------------------------------------------
# The provenance neighborhood RIDES THE FULL REPORT (SPEC-terrain §13.1/§13.2
# v20, story 1.69, kogaki#473) — the five cases of the issue's acceptance item
# 5, plus (f) for the no-material degradation PR #477 round 1 asked for. Mutation evidence, stated as what was RUN rather
# than as a per-case claim (PR #477 round 1 finding 5): ONE mutation was
# performed during implementation — dropping the `report.neighborhood` field —
# and it failed (a), (c) and (d) across seven assertions in one run. Cases
# (b) and (e) assert their own direction on every run: (b) reads the rendered
# bytes across two pulls and the IDEMPOTENT marker, (e) reads the refusal's
# exit and text. No mutation for (b) was demonstrated in this suite — both
# pulls read one deterministic stub, so a live-seam recomputation would pass
# here and diverge only when the serving moves; that limit is stated rather
# than claimed away.
# --------------------------------------------------------------------------
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const SURVEY = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const STUB = "checks/fixtures/terrain/compose-input/stub-gateway.mjs";
const fails = [];
const dir = mkdtempSync(join(tmpdir(), "terrain-neighborhood-"));
try {
  const pin = JSON.parse(readFileSync(SURVEY, "utf8")).pin;
  const claims = join(dir, "claims.json");
  writeFileSync(claims, JSON.stringify({
    composition_pin: { tag: "testing", pin, groups: {
      "testing × (no second served tag)": ["lesson:delta"],
      "testing × architecture": ["lesson:alpha", "lesson:bravo"],
      "testing × cost": ["lesson:charlie"],
    } },
    claims: {
      "testing × architecture": "both hold that a guard is real only once something exercised it",
      "testing × cost": "both price a check by where in the loop it runs",
      "testing × (no second served tag)": "carries the selected tag and no other",
    },
  }));
  const subs = join(dir, "subs.json");
  writeFileSync(subs, JSON.stringify({
    "testing × architecture": { judged: true, subgroups: [] },
    "testing × (no second served tag)": { judged: true, subgroups: [] },
    "testing × cost": { judged: true, subgroups: [] },
  }));
  const pull = (ids, rdir, gdir) => spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", SURVEY, "--tag", "testing", "--ids", ids,
     "--claims", claims, "--neighborhood", "checks/fixtures/terrain/format/neighborhood-judgments.json", "--subdivisions", subs,
     "--judge-model", "claude-opus-5", "--judge-effort", "high",
     "--report-dir", join(dir, rdir), "--rendering-dir", join(dir, gdir)],
    { encoding: "utf8", env: { ...process.env, TSUREZURE_GATEWAY_JS: STUB } });

  // (a) A pulled report CONTAINS the section, conformant under v6. Conformance
  // is the emitters' own predicate: the pull succeeding IS the emitOrRefuse
  // pass, so this case asserts presence and the §13.4 obligations' rendered
  // forms rather than re-running the validator.
  const r1 = pull("G2", "r1", "g1");
  if (r1.status !== 0) fails.push(`(a) report exited ${r1.status}: ${(r1.stderr || "").trim()}`);
  const md1 = readFileSync(join(dir, "g1", "FullReport.md"), "utf8");
  if (!md1.includes("\n## Provenance neighborhood\n")) fails.push("(a) the pulled report carries no `## Provenance neighborhood` section — §13.1 v20 sites it in the report, once");
  // §13.4's per-family figures and substrate disclosure retired with the
  // enumeration they described (kogaki#686). What the section owes now is the
  // honest count and the level it rendered at.
  if (!/candidate\(s\) found, [0-9]+ shown/.test(md1)) fails.push("(a) the section states no honest counts — kogaki#686 disposition 3");
  if (/reached by: |Suggestions by family/.test(md1)) fails.push("(a) a DELETED display element survived into the report");
  // The stub's dangling cross_link (bravo -> zulu-missing) is unreachable now:
  // the walk that found it is deleted, so the unresolved section it fed has
  // nothing to report and is deleted with it.
  if (/unresolved reference\(s\)/.test(md1)) fails.push("(a) the unresolved section survived — it reported on a walk kogaki#686 deleted");
  if ((md1.match(/\n## Provenance neighborhood\n/g) || []).length !== 1) fails.push("(a) the section renders other than ONCE — §12 v8");
  if (md1.indexOf("## Provenance neighborhood") < md1.indexOf("## Served lines")) fails.push("(a) the section renders before `## Served lines` — §12 v8 puts it LAST");

  // (b) SAME IDENTITY TWICE -> IDENTICAL SECTION. The second pull takes the
  // rerun path and renders from the recorded neighborhood, which is what makes
  // idempotence hold even if the seam moves between pulls.
  const r2 = pull("G2", "r1", "g1");
  if (r2.status !== 0) fails.push(`(b) rerun exited ${r2.status}: ${(r2.stderr || "").trim()}`);
  if (!/IDEMPOTENT/.test(r2.stdout)) fails.push("(b) the second pull did not take the idempotent rerun path");
  const md2 = readFileSync(join(dir, "g1", "FullReport.md"), "utf8");
  if (md1 !== md2) fails.push("(b) two pulls under one identity rendered different artifacts — the section is not a pure function of the record");

  // (c) SUGGESTION IDS ARE N<n>, DISJOINT FROM L<n>, inside the report.
  const nids = [...md1.matchAll(/^- (N[0-9]+) — /gm)].map((m) => m[1]);
  if (nids.length === 0) fails.push("(c) no N<n> suggestion rows in the section");
  if (nids.some((id) => !/^N[0-9]+$/.test(id))) fails.push(`(c) a suggestion id is outside the N<n> space: ${JSON.stringify(nids)}`);
  if (!/^#### L[0-9]+$|^### L[0-9]+$/m.test(md1)) fails.push("(c) no L<n> member headings in the same report — the disjointness case needs both spaces present");
  // The disjointness FOOTNOTE is deleted (disposition 4); the PROPERTY it
  // asserted is unchanged and still asserted over the ids themselves above,
  // which is where it was always checkable.
  if (/DISJOINT from the survey's `L<n>`/.test(md1)) fails.push("(c) the disjointness footnote survived — the property is asserted over the ids, not restated in prose");

  // (d) An EMPTY enumeration renders the EXPLICIT empty lines, never an
  // absent section. G1 is delta, alone in batch q_a/solo with no links.
  const r3 = pull("G1", "r3", "g3");
  if (r3.status !== 0) fails.push(`(d) empty-set report exited ${r3.status}: ${(r3.stderr || "").trim()}`);
  const md3 = readFileSync(join(dir, "g3", "FullReport.md"), "utf8");
  if (!md3.includes("\n## Provenance neighborhood\n")) fails.push("(d) an empty enumeration rendered an ABSENT section — the silent exclusion §13.0 removes, §13.4's disclosure discipline");
  if (!/No suggestion\. The enumeration ran over the settled set's Batches/.test(md3)) fails.push("(d) the explicit empty-enumeration line is absent — an empty result rendered as an absent section is the silent exclusion §13.0 removes");
  if (!/Not asserted: that an empty neighborhood is informative in the STRONG sense/.test(md3)) fails.push("(d) the second empty-enumeration line is absent — the two-line form is the declared class");

  // (e) The standalone subcommand REFUSES, naming the replacement.
  const r4 = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "neighborhood", "--survey", SURVEY, "--tag", "testing", "--ids", "G2"],
    { encoding: "utf8" });
  if (r4.status === 0) fails.push("(e) `neighborhood` exited 0 — the retirement must refuse, never no-op (§13.2 v20)");
  if (!/retired/.test(r4.stderr) || !/FullReport\.md/.test(r4.stderr)) fails.push(`(e) the refusal does not name the replacement: ${JSON.stringify((r4.stderr || "").slice(0, 200))}`);

  // (f) NO MATERIAL: the seam serves zero element records and the pull
  // DEGRADES — the section renders its explicit did-not-run statement and the
  // report completes (PR #477 round 1's should, carried on kogaki#473). The
  // env flag flips the same stub, so this is the same transport as (a)-(d).
  const r5 = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", SURVEY, "--tag", "testing", "--ids", "G3",
     "--claims", claims, "--subdivisions", subs,
     "--judge-model", "claude-opus-5", "--judge-effort", "high",
     "--report-dir", join(dir, "r5"), "--rendering-dir", join(dir, "g5")],
    { encoding: "utf8", env: { ...process.env, TSUREZURE_GATEWAY_JS: STUB, STUB_ELEMENT_SURVEY_EMPTY: "1" } });
  if (r5.status !== 0) fails.push(`(f) the pull ABORTED on an empty element_survey (exit ${r5.status}) — the degradation must complete the report: ${(r5.stderr || "").trim().slice(0, 200)}`);
  else {
    const md5 = readFileSync(join(dir, "g5", "FullReport.md"), "utf8");
    if (!md5.includes("\n## Provenance neighborhood\n")) fails.push("(f) the no-material pull rendered an ABSENT section");
    if (!/No served material reached the neighborhood: the seam returned no element records/.test(md5)) fails.push("(f) the explicit did-not-run line is absent (report-format.json v7 neighborhood_no_material)");
    if (/No suggestion\. The enumeration itself came back empty/.test(md5)) fails.push("(f) the no-material state rendered the RAN-AND-FOUND-NOTHING lines — the two states must stay distinguishable");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL provenance-neighborhood section (SPEC-terrain §13 v20, story 1.69):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("neighborhood section: 6/6 cases — (a) present and conformant with §13.4's rendered obligations, "
  + "(b) idempotent under one identity via the recorded neighborhood, (c) N<n> disjoint from L<n> with both "
  + "spaces present and the disjointness stated, (d) empty enumeration renders its explicit two-line form and "
  + "never an absent section, (e) the standalone subcommand refuses naming reports/FullReport.md. "
  + "MUTATION EVIDENCE (story 1.69, honesty per PR #477 round 1 finding 5): ONE mutation run — dropping "
  + "`report.neighborhood` failed (a)/(c)/(d) across seven assertions; (b) and (e) assert their direction on "
  + "every run, and no mutation for (b) is demonstrable against a deterministic stub. Case (f) exercises the "
  + "no-material degradation: an empty element_survey renders the explicit did-not-run line and the pull completes.");
JS
