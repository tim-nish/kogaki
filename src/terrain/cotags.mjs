// Terrain — co-tag navigation, the ID gate's bounded reading, and claim/adopt.
// One stage of the Terrain command, imported only by Terrain's own modules (kogaki#1259).
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982): see `src/SPEC-REFERENCES.md`.
import { join } from "node:path";
import { loadGrammar, refuseUnlessConformant, FormatRefusal } from "../format-guard.mjs";
import { announceDisplay, writeDisplaySurface } from "./compose-input.mjs";
import { artifactPath } from "./flows.mjs";
import {
  claimsOutsideBound, judgePinLine, judgmentProvenance, readClaimsRecord, readSubdivisionEntry,
} from "./report.mjs";
import { SUBDIVISION_REQUIRED_AT, judgeSubgroup, subgroupPlacement } from "./subdivide.mjs";
import {
  SURVEY_SCHEMA, denominator, displayIdAbnormalLine, displayIds, familySplit, lessonCount,
  strandFigure,
} from "./survey.mjs";
import { subdivisionLimits } from "../workflow/judge.mjs";
import { REPORT_FORMAT, fail, readJson } from "../workflow/run-record.mjs";

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
export const NO_TARGET = "⟨no Thesis-candidate target on this row — ABNORMAL, a judged row reaching the renderer without one, never substituted⟩";

export const NO_CLAIM = "⟨no composed GroupClaim — ABNORMAL, a fault to clear, never substituted⟩";

// No per-row pin renders on the display (the display's serve rule v5, withdrawing v4's per-row
// pin): the pin is sited ONCE, in the Full Report, whose member records carry
// the member → served-line map. The WA baseline closed group presentation to
// "Group ID, Strand ID, gloss, journey — and nothing else" (wa#1115/#1116).
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

export function cmdCotags(args) {
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
export function emitOrRefuse(surfaceName, text, write) {
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
export function composeOwnerListing(surfaceName, text) {
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
