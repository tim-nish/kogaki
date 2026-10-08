// Terrain — subdivision into subgroups.
// One stage of the Terrain command, imported only by Terrain's own modules (kogaki#1259).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { resolveEnteredIds } from "./compose-input.mjs";
import { cotagGroups } from "./cotags.mjs";
import { readSubdivisionEntry } from "./report.mjs";
import { SURVEY_SCHEMA, familySplit } from "./survey.mjs";
import { COHERENCE_LABELS, RESIDUAL_LABEL, subdivisionLimits } from "../workflow/judge.mjs";
import { REPORT_FORMAT, fail, readJson } from "../workflow/run-record.mjs";

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
export const SUBDIVISION_REQUIRED_AT = 10;

export function subgroupPlacement(parent, classification, block) {
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

// The per-label cap, or `null` for the residual, which is bounded by
// `max_residual_members` instead and deliberately carries no row in the cap map.
function subgroupMemberCap(label, grammarPath = REPORT_FORMAT) {
  const { caps } = subdivisionLimits(grammarPath);
  return Object.prototype.hasOwnProperty.call(caps, label) ? Number(caps[label]) : null;
}

export function judgeSubgroup(sg, groupClaim, parentSize = null) {
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

// THE ENTERED SET RESOLVED TO TARGETS, shared by `report` and `neighborhood_input`
// (kogaki#690): one resolver, never a second. Story 1.56 AC11: ids are valid only for
// the run that printed them, so resolution runs against this run's groups and caches nothing.
// Returns `subOf` so callers keep one `--subdivisions` parse (PR #701). Reads no claims file.
export function resolveReportTargets(record, tag, enteredIds, args) {
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
