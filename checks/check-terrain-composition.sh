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
import { readFileSync, writeFileSync } from "node:fs";
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
const CLAIMS = join(tmpdir(), `cotags-claims-${process.pid}.json`);
writeFileSync(CLAIMS, JSON.stringify({
  [`${TAG} × architecture`]: "both hold that a guard is only real once something exercised it",
}));
const withClaim = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", CLAIMS],
  { encoding: "utf8" });
if (withClaim.status !== 0) fails.push(`cotags --claims exited ${withClaim.status}: ${(withClaim.stderr || "").trim()}`);
const claimLines = String(withClaim.stdout).split("\n");
const claimAt = claimLines.findIndex((l) => l.includes("in common: both hold that a guard"));
const groupAt = claimLines.findIndex((l) => l.includes(`${TAG} × architecture (`));
if (claimAt < 0 || groupAt < 0 || claimAt !== groupAt + 1) {
  fails.push("the GroupClaim is not served FIRST, immediately under its GroupID — §6.1's order is the whole of what it asks for");
}
const memberAt = claimLines.findIndex((l, i) => i > groupAt && l.includes("lesson:alpha"));
if (!(memberAt > claimAt)) fails.push("the member ids do not follow the claim — GroupClaim first, THEN the members (§6.1)");
if (!String(withClaim.stdout).includes("pinned to 2 member(s)")) {
  fails.push("a screen-composed claim does not state the member set it is pinned to — §7's pinning is what makes a later subset selection a gate event rather than a refresh");
}
// A claim naming no composed group is refused: composition may attach text to
// a group and may do nothing else.
const BADCLAIMS = join(tmpdir(), `cotags-badclaims-${process.pid}.json`);
writeFileSync(BADCLAIMS, JSON.stringify({ "testing × nonesuch": "invented" }));
const badClaim = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", BADCLAIMS],
  { encoding: "utf8" });
if (badClaim.status === 0) {
  fails.push("a --claims entry naming no composed group was ACCEPTED — a claim carries no selection authority and may not invent a group (§6.1)");
}

// 7. SubGroups on the screen (kogaki#128, story 1.29 — §6.2), and the cover
//    they inherit: a member the judge leaves unplaced is NAMED, never dropped.
const SUBS = join(tmpdir(), `cotags-subs-${process.pid}.json`);
writeFileSync(SUBS, JSON.stringify({
  [`${TAG} × architecture`]: [
    { subgroup: "guards that cannot fail", claim: "a check whose inputs make failure unreachable",
      members: ["lesson:alpha"], composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
  ],
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
  fails.push("the SubGroupClaim does not render above its Lesson IDs (§6.2)");
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
  [`${TAG} × architecture`]: [
    { subgroup: "guards that cannot fail", claim: "a check whose inputs make failure unreachable",
      members: ["lesson:alpha"], composes_honestly: true, tighter_than_parent: false, legible_at_a_glance: true },
  ],
}));
const notLeaf = spawnSync(process.execPath,
  ["terrain/terrain.mjs", "cotags", "--survey", FIXTURE, "--tag", TAG, "--claims", CLAIMS,
   "--subdivisions", SUBS_NOT_LEAF, "--judge-model", "m", "--judge-effort", "high"],
  { encoding: "utf8" });
if (!String(withSubs.stdout).includes("leaf: the claim composes honestly AND is tighter")) {
  fails.push("the screen does not render the SubGroup's LEAF VERDICT — §6.2 requires the screen to judge, not merely render");
}
if (!String(notLeaf.stdout).includes("the split bought nothing")) {
  fails.push("flipping tighter_than_parent to false did not change the screen's verdict — the fixture supplies verdicts the code does not read, which presents as covering the leaf condition while covering only rendering");
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
  [`${TAG} × architecture`]: [
    { subgroup: "sg", claim: "this claim names alpha outright", members: ["lesson:alpha"],
      composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true },
  ],
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

if (fails.length) {
  console.log("FAIL cotags fixture — the second navigation step does not discriminate:");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("cotags fixture: 29/29 cases (lone-tag group; declared sort on both "
  + "axes; group-name form; cover passing; cover DROPPED / ADDED / both, all "
  + "three fired; end-to-end subcommand wiring; ids without --group; absent-claim "
  + "marker per-group and in aggregate; claim served FIRST then members; pinning "
  + "stated; invented group refused; SubGroup and SubGroupClaim rendered; unplaced "
  + "member named not dropped; leaf verdict rendered; a flipped verdict CHANGES it; "
  + "judge pin recorded and REFUSED when absent; degenerate-claim disclosure rendered; "
  + "no slug dump on the screen; the skill names the co-tag step; no member-count "
  + "threshold across cmdCotags, subgroupPlacement and judgeSubgroup)");
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
import { readFileSync, writeFileSync, mkdtempSync, readdirSync } from "node:fs";
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
const run = (extra) => spawnSync(process.execPath,
  ["terrain/terrain.mjs", "report", "--survey", FIXTURE, "--tag", TAG,
   "--report-dir", RD, ...extra], { encoding: "utf8" });
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
writeFileSync(SUBS, JSON.stringify({ [`${TAG} × architecture`]: [
  { subgroup: "sg", claim: "a tighter claim", members: ["lesson:alpha"],
    composes_honestly: true, tighter_than_parent: true, legible_at_a_glance: true }]}));
const noPin = run(["--group", "architecture", "--subdivisions", SUBS]);
if (noPin.status === 0) {
  fails.push("a report carrying SubGroupClaims was written with NO judge pin — the pin is §12.1's third identity component and judged material recorded without it is the drift-undetectable shape");
}
eq("the refusal wrote nothing", count(), 2);
run(["--group", "architecture", "--subdivisions", SUBS, "--judge-model", "m", "--judge-effort", "high"]);
eq("case 4 — same pin and query, one run subdivided and one not, COEXIST as two reports",
   count(), 3);
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
  console.log("Full Report fixture: 5/5 seam-free cases (whole-body reader vs headline "
    + "reader; uniform triple with `none` typed; judged vs unjudged do not collide; "
    + "identical identities compare equal) — the 8 artifact-counting cases are "
    + "CANNOT-DETERMINE here, stated above.");
} else {
  console.log("Full Report fixture: 13/13 cases (whole-body reader vs headline reader; "
    + "uniform triple with `none` typed; judged vs unjudged do not collide; identical "
    + "identities compare equal; the four §12.1 cases counted over real artifacts, "
    + "including judge-pin refusal writing nothing; identity recorded, classification "
    + "and untruncated asserted per artifact)");
}
JS
