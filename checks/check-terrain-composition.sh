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
import { cotagGroups, cotagCover, NO_SECOND_TAG, COTAG_SORT, NO_CLAIM }
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
const idsWithoutGroup = members.every((m) => String(run.stdout).includes(m.id));
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
const groupAt = claimLines.findIndex((l) => l.includes(`${TAG} × architecture — `));
if (claimAt < 0 || groupAt < 0 || claimAt !== groupAt + 1) {
  fails.push("the GroupClaim is not served immediately under its group heading — §6.1 v5's order (heading line, then the claim)");
}
// §6.1 v5's heading form: the heading LINE carries the Lesson count and the
// member IDs — `<GroupID> — N Lessons: ids` — with the claim beneath. The v3
// members-after-claim order is superseded by the WA baseline's heading form.
const heading = claimLines[groupAt] || "";
if (!/2 Lessons: lesson:alpha, lesson:bravo/.test(heading)) {
  fails.push("the group heading does not carry its Lesson count and member IDs on the heading line (§6.1 v5: `<GroupID> — N Lessons: ids`)");
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
if (!/guards that cannot fail \(1 Lesson: lesson:alpha\)/.test(String(withSubs.stdout))) {
  fails.push("the SubGroup line does not carry its Lesson count and IDs (§6.2 v5: `<SubGroupID> (N Lessons: ids)`)");
}
if (!String(withSubs.stdout).includes("(fits no composed SubGroup)")
    || !String(withSubs.stdout).includes("lesson:bravo")) {
  fails.push("a member the judge left unplaced was DROPPED rather than named in the explicit SubGroup — subdivision decides WHERE a member appears and hides none (§8)");
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
if (!/--all-groups/.test(SKILL)) {
  fails.push("the skill's co-tag step does not name eager report generation (`report … --all-groups`) — §11's decided EAGER reading (v5), and its absence is the 2026-08-06 no-report defect");
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
     "--report-dir", RDJE, "--group", "architecture", "--subdivisions", SJE,
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
    if (!Array.isArray(rec.subgroups) || rec.subgroups.length !== 0) {
      fails.push(`a judged-empty group carries ${JSON.stringify(rec.subgroups)} rather than ZERO SubGroupClaims `
        + "— the no_member_hidden_subgroup catch-all manufactured a SubGroup the judgment did not make");
    }
    if (!Array.isArray(rec.members) || rec.members.length !== 2) {
      fails.push("a judged-empty group lost its MEMBERS — they are not in `subgroups`, so nulling them drops the whole membership from the artifact");
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
     "--report-dir", RDJE, "--group", "architecture", "--subdivisions", SLEGACY,
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

if (!/SERVED\s+VERBATIM|served verbatim/i.test(SKILL)) {
  fails.push("the skill does not carry the serve-the-renderer-verbatim rule — re-rendering is how member IDs, SubGroup verdicts and ABNORMAL markers vanished on 2026-08-06 (kogaki#150)");
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
  + "the skill names the co-tag step, eager --all-groups reports, and the "
  + "serve-verbatim rule; no member-count threshold across cmdCotags, "
  + "subgroupPlacement and judgeSubgroup)");
JS

python3 - <<'EOF'
import json, pathlib, sys
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
const r1 = run(["--group", "architecture"]);
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
run(["--group", "architecture"]);
eq("case 1b — SAME identity run twice is ONE report (idempotent, not a duplicate)", count(), 1);
run(["--group", "cost"]);
eq("case 3 — same pin, DIFFERENT query is two reports", count(), 2);

const SUBS = join(RD, "subs.json");
writeFileSync(SUBS, JSON.stringify({ [`${TAG} × architecture`]: { judged: true, subgroups: [
  { subgroup: "sg", claim: "a tighter claim", members: ["lesson:alpha"],
    composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true }] }}));
// The judge-pin refusal, exercised WITHOUT the conformant default the helper
// injects — otherwise this case would assert a refusal it had just prevented.
const noPin = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
   "--report-dir", RD, "--group", "architecture", "--subdivisions", SUBS],
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
   "--report-dir", RD, "--group", "architecture",
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
run(["--group", "architecture", "--subdivisions", SUBS, "--judge-model", "m", "--judge-effort", "high"]);
eq("case 4a — a subdivided run at the SAME judge as an earlier judged-empty one is IDEMPOTENT",
   count(), before4);
// 4b — the same query judged by a DIFFERENT judge is the pair the required
// path produces routinely, and it is what row 4 now describes.
run(["--group", "architecture", "--subdivisions", SUBS, "--judge-model", "m2", "--judge-effort", "high"]);
eq("case 4b — same pin and query, TWO DIFFERENT judge pins, COEXIST as two reports",
   count(), before4 + 1);
}

// 4. §12's recording obligation: the identity is IN the artifact. §12.2 makes
//    these the only source of it, so a report carrying none is unresolvable —
//    and that state passes every other clause in the section.
for (const f of readdirSync(RD).filter((x) => x.startsWith("terrain-full-report-"))) {
  const rec = JSON.parse(readFileSync(join(RD, f), "utf8"));
  const id = rec.identity || {};
  if (!id.pin || !id.query || !id.query.tag || !id.query.group || id.judge_pin === undefined) {
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

# --- claim re-offer origin fixture (kogaki#143) ------------------------------
#
# WHY THIS IS AN EXTENSION AND NOT A TENTH CHECK. `claim`'s origin path is
# terrain composition — §7's claim lifecycle is the contract this file already
# carries — so the coverage lands inside an existing member's declared contract
# and no admission record is owed. A tenth check for one finding is the
# one-member-per-incident growth the served surface names as the tell that you
# are on the wrong side ("a check suite growing at roughly one member per
# incident", product-lab@f918c515 LESSONS.md:45), in a repository whose
# founding decision put a rebuilt suite under a high admission bar to avoid it.
#
# WHAT IT DISCRIMINATES. §7's v4 rider defines THREE origin branches and story
# 1.31 shipped all three untested — no registered check invoked `terrain.mjs
# claim` at all, and PR #141's acceptance table named a test that did not
# exist. The third branch is the one most worth holding: its whole content is
# that an absent origin is STATED and never fabricated, so its failure mode is
# a MISSING line rather than a wrong one, which no assertion about present
# content would catch.
#
# Seam-free by construction: `claim` reads the survey record and the gate
# registry and never reaches the gateway, so unlike the Full Report block above
# this one runs everywhere.
node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const FIXTURE = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const TAG = "testing";
const GROUP = "architecture";
const fails = [];

// The re-offer is a GATE EVENT and fires only on a SUBSET selection (§7), so
// every case below names a proper subset of the group's members.
const claim = (dir, extra) => spawnSync(process.execPath,
  ["terrain/terrain.mjs", "claim", "--survey", FIXTURE, "--tag", TAG, "--group", GROUP,
   "--text", "the recomposed wording", "--members", "lesson:alpha",
   "--run-dir", dir, ...extra], { encoding: "utf8" });

const declarationIn = (dir) => {
  const f = readdirSync(dir).find((x) => x.endsWith(".run-declaration.json"));
  return f ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null;
};

// Branch 1 — RECORD. The pre-existing path: `--original <claim record>`.
const d1 = mkdtempSync(join(tmpdir(), "claim-record-"));
const seed = claim(d1, []);
if (seed.status !== 0) fails.push(`claim (seed) exited ${seed.status}: ${(seed.stderr || "").trim()}`);
const seedRec = readdirSync(d1).find((x) => x.endsWith(".terrain-claim.json"));
if (!seedRec) fails.push("claim wrote no claim record for the subset selection");
const d1b = mkdtempSync(join(tmpdir(), "claim-record-b-"));
const fromRecord = claim(d1b, ["--original", join(d1, seedRec || "")]);
if (fromRecord.status !== 0) fails.push(`claim --original exited ${fromRecord.status}: ${(fromRecord.stderr || "").trim()}`);
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
const fromArgs = claim(d2, ["--original-text", "the screen's original line",
                            "--original-members", "lesson:alpha,lesson:bravo"]);
if (fromArgs.status !== 0) fails.push(`claim --original-text exited ${fromArgs.status}: ${(fromArgs.stderr || "").trim()}`);
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
// No record is written BY THE SCREEN — the origin is passed, not persisted, so
// §7's no-record rider stands. The claim record `claim` writes for its own
// subset is the pre-existing artifact and is not what that rider governs.
if (readdirSync(d2).filter((f) => f.endsWith(".terrain-claim.json")).length !== 1) {
  fails.push("the screen-composed branch wrote an unexpected number of claim records — the origin travels as an argument and persists nothing of its own");
}

// Branch 3 — ABSENT. The branch whose entire content is that the absence is
// STATED and never fabricated. Its failure mode is a MISSING line rather than
// a wrong one, so it is asserted positively (the declaration says NONE) AND
// negatively (nothing was invented).
const d3 = mkdtempSync(join(tmpdir(), "claim-absent-"));
const noOrigin = claim(d3, []);
if (noOrigin.status !== 0) fails.push(`claim (no origin) exited ${noOrigin.status}: ${(noOrigin.stderr || "").trim()}`);
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

if (fails.length) {
  console.log("FAIL claim re-offer origin fixture — §7's v4 rider is not observed:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("claim re-offer origin fixture: PASS — cases exercised (record branch carries claim and "
  + "members; screen-composed branch carries BOTH wording and member set as arguments and "
  + "persists nothing of its own; absent branch STATES the absence and fabricates neither "
  + "field; the three sources are mutually distinct at the gate)");
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
if (!/for \(const s of sections\) console\.log\(`  \$\{tagRow\(s\)\}`\)/.test(readFileSync("terrain/terrain.mjs", "utf8"))) {
  fails.push("cmdSurvey no longer composes its tag rows through tagRow — the allowlist's single construction constraint is bypassed, which no assertion over tagRow itself can see");
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

const probe = run(["--all-groups"]);
const seamAbsent = probe.status === 11
  || (probe.status !== 0 && /policy_source unavailable|gateway/i.test(String(probe.stderr) + String(probe.stdout)));
if (seamAbsent) {
  console.log("v5 residuals: CANNOT-DETERMINE for the 4 --all-groups cases — the served "
    + "seam is unavailable here and `report` reads through it. The tagRow allowlist cases "
    + "above are seam-free and RAN.");
} else {
  if (probe.status !== 0) fails.push(`report --all-groups exited ${probe.status}: ${(probe.stderr || "").trim()}`);
  // ONE REPORT PER COMPOSED GROUP. The fixture's `testing` tag composes three
  // co-tag groups, so the eager pass writes three.
  if (reports() !== 3) fails.push(`--all-groups wrote ${reports()} report(s) over 3 composed groups — the eager reading is one report per group (SPEC.md §11 v5)`);
  // IDEMPOTENT across the eager pass, per group, exactly as the single form is.
  run(["--all-groups"]);
  if (reports() !== 3) fails.push(`a second --all-groups pass wrote ${reports()} report(s) — the eager pass is idempotent per identity, not a duplicate per invocation`);
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
     "--report-dir", RD2, "--all-groups", "--subdivisions", SUBS], { encoding: "utf8" });
  if (partial.status === 0) {
    fails.push("--all-groups with SubGroupClaims and no judge pin was ACCEPTED — the pin is §12.1's third identity component");
  }
  if (readdirSync(RD2).filter((f) => f.startsWith("terrain-full-report-")).length !== 0) {
    fails.push("the judge-pin refusal had already written some of its targets — a partial pass presenting as one, which is what siting the validation BEFORE the fan-out exists to prevent");
  }
}

// 3. kogaki#145's origin PROVENANCE. A derived member set and a recorded one
//    are otherwise indistinguishable at the gate.
const CD = mkdtempSync(join(tmpdir(), "claim-prov-"));
const claimRun = (dir, extra) => spawnSync(process.execPath,
  ["terrain/terrain.mjs", "claim", "--survey", FIXTURE, "--tag", TAG, "--group", "architecture",
   "--text", "recomposed", "--members", "lesson:alpha", "--run-dir", dir, ...extra], { encoding: "utf8" });
const decl = (dir) => {
  const f = readdirSync(dir).find((x) => x.endsWith(".run-declaration.json"));
  return f ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null;
};
const dDer = mkdtempSync(join(tmpdir(), "prov-derived-"));
claimRun(dDer, ["--original-text", "orig"]);
const gDer = decl(dDer);
const dRec = mkdtempSync(join(tmpdir(), "prov-recorded-"));
claimRun(dRec, ["--original-text", "orig", "--original-members", "lesson:alpha,lesson:bravo"]);
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
claimRun(dNone, []);
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

// One invocation of the COMMAND — the whole point of this block. Everything it
// needs is supplied per run; no numeric constant enters the runtime (§8).
const subdivide = (classification) => {
  const dir = mkdtempSync(join(tmpdir(), "subdivide-"));
  const cls = write(dir, "classification.json", classification);
  const r = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "subdivide", "--survey", FIXTURE, "--tag", TAG,
     "--group", GROUP, "--group-claim", "the parent group's line",
     "--judge-model", "fixture-judge", "--judge-effort", "low",
     "--screen-budget", "40", "--classification", cls, "--run-dir", dir],
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
     "--group", "architecture", "--subdivisions", subs,
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
  const d = spawnSync(process.execPath,
    ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", "testing",
     "--group", "architecture", "--subdivisions", subs2,
     "--judge-model", "m", "--judge-effort", "high"],
    { encoding: "utf8", env: Object.assign({}, process.env, { KOGAKI_RUN_DIR: run2 }) });
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
      if (/^(Full Report|machine record)/.test(line) && /\/(home|tmp|var|Users|root)\//.test(line)) {
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
    "--group", "architecture", "--subdivisions", subs3,
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
    const md = recName ? join("reports", recName.replace(/\.json$/, ".md")) : null;
    if (!recName || !existsSync(md)) {
      K234.material = "FAILED";
      K234.rerun = "FAILED";
      fails.push("the fresh run produced no record/rendering pair at the DEFAULT rendering location — every assertion below reads those two artifacts against each other and can report nothing without both");
    } else {
      const rec = JSON.parse(readFileSync(join(run3, recName), "utf8"));
      const members = (rec.members && rec.members.length ? rec.members
        : (rec.subgroups || []).flatMap((sg) => sg.members || []));
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

      // THE RENDERED BYTES, ASSERTED AGAINST THE RECORD. `includes` of the
      // WHOLE body is the completeness property stated directly: a truncated,
      // headline-only or ellipsised rendering fails it, and a prefix assertion
      // would not.
      const assertMaterial = (body, where) => {
        for (const m of members) {
          const id = m.id;
          if (!body.includes(`\`${id}\``)) fails.push(`${where}: member ${id} is not named in the rendering`);
          if (m.cite && !body.includes(m.cite)) {
            fails.push(`${where}: the member → SERVED-LINE map is missing for ${id} — §12 requires the report to carry it, and \`${m.cite}\` appears nowhere in the rendered bytes`);
          }
          if (m.gloss_cite && !body.includes(m.gloss_cite)) {
            fails.push(`${where}: the Lesson Gloss cite for ${id} (\`${m.gloss_cite}\`) is absent — this is the \`grep -c "gloss/lessons/"\` returning ZERO that the 2026-08-08 run measured`);
          }
          if (!body.includes(String(m.gloss))) {
            fails.push(`${where}: the COMPLETE Lesson Gloss for ${id} is not in the rendering — §12 requires the complete Glosses with no truncation anywhere, and the file asserts \`> Untruncated.\` while it holds`);
          }
          if (m.journey_gloss !== null && m.journey_gloss !== undefined) {
            if (!body.includes(String(m.journey_gloss))) {
              fails.push(`${where}: the COMPLETE Journey Gloss for ${id} is not in the rendering — the Counted block prints a journey count with nothing behind it`);
            }
            if (m.journey_cite && !body.includes(m.journey_cite)) {
              fails.push(`${where}: the Journey Gloss cite for ${id} (\`${m.journey_cite}\`) is absent`);
            }
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
        // THE PROPERTY IS "ABSOLUTE PATH", NOT THE `.kogaki` SPELLING. Every
        // block here steers storage into a tmpdir, so a `.kogaki` substring
        // test passes over `/tmp/…` — the third time in this file that a
        // fixture could not see what the fixture supplied.
        for (const line of out2.split("\n")) {
          if (/\/(home|tmp|var|Users|root)\//.test(line)) {
            fails.push(`the RERUN prints an ABSOLUTE machine path on the owner surface: ${line.trim().slice(0, 140)}`);
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
      rmSync(md, { force: true });
      const r4 = spawnSync(process.execPath, argv.concat(["--no-render"]),
        { encoding: "utf8", env: env3 });
      if (r4.status === 0 && existsSync(md)) {
        fails.push("`--no-render` wrote the owner rendering anyway on the rerun path — the opt-out is not one");
      }
      rmSync(md, { force: true });
    }
  }
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
  + "repo-relative READ THIS ONE line present, no `.kogaki` path, NO absolute machine "
  + "path on any line, the rendering regenerated byte-identical, the KOGAKI_DEBUG "
  + "direction still printing the record's full path, and `--no-render` still opting "
  + "out. A block reading CANNOT-DETERMINE asserted NOTHING. NOT COVERED, stated "
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
