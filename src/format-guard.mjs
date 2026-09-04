// THE EMIT-TIME REFUSAL (SPEC-terrain §14.2, story 1.54, kogaki#346).
//
// The emitters validate the text they are ABOUT TO EMIT against
// `src/report-format.json` and refuse to write or print on
// failure. A nonconformant artifact is unmintable rather than detectable one
// incident later by a check suite growing at roughly one member per round.
//
// `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/architecture.md:249`
// — "restrict what the system can produce in the first place … which removes
// the possibility instead of catching it."
//
// THE PRECEDENT THIS REUSES RATHER THAN RE-DERIVES: §9's FIGURE_MISMATCH
// already refuses to write a survey record whose stored figure disagrees with
// the placements it claims to be counted over. Same shape, one layer out — the
// refusal is generation-time, and the check suite stays the fast path beneath
// it (AC5: nothing in `checks/` is removed).
//
// WHAT IS VALIDATED IS THE STRING, NOT THE MODEL BEHIND IT (AC3). The recorded
// specimen is the pre-#234 renderer, which dropped four of six member fields
// while every §12.1 assertion about the record stayed green. A guard reading
// the data structure would have been green too.
//
// THERE IS NO `--no-validate` (story 1.54 SQ1). §14.2 grants no escape hatch,
// and one would restore the admit-on-non-member fallback the allowlist shape
// exists to remove — `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:119`,
// "the load-bearing half is not completeness … but the non-member fallback".
//
// SCOPE IS THE TWO SURFACES THE GRAMMAR COVERS (SQ2, §14.1). `view`, `claim`,
// `adopt` and `subdivide` are owner surfaces too and the grammar says so, in
// `uncovered_surfaces`, under its own reopen trigger. Extending the refusal to
// them is that trigger's work; doing it here would be the silent widening
// §14.1 declined.

import { readFileSync } from "node:fs";

// --------------------------------------------------------------------------
// Token shapes. The grammar file is the authority for WHICH tokens exist and
// what they mean; these are the regex fragments that make each one decidable
// on a rendered line. A token the grammar declares `NOT YET MINTED` gets a
// permissive fragment on purpose — a shape asserted for it here would be this
// module deciding a question `not_expressible.group_subgroup_id_grammar`
// explicitly leaves open.
const FREE = "[\\s\\S]*?";

function tokenFragment(name, grammar) {
  const t = (grammar.tokens || {})[name];
  if (name === "LessonDisplayID") {
    // The ABNORMAL token is admitted beside the minted shape, because §14.3's
    // absence case REACHES the owner surface: a legacy survey record renders
    // it, and a refusal admitting only `^L[0-9]+$` here would reject exactly
    // the record the abnormality exists to make visible. The grammar says so
    // in `tokens.LessonDisplayID.absence_is_abnormal`.
    return "(?:L[0-9]+|⟨no display_id[^⟩]*⟩)";
  }
  if (name === "LessonCount") return "[0-9]+ Lessons?";
  if (name === "JudgePin") return "(?:`[^/`]+/[^/`]+`|`none`)";
  if (!t || !t.shape || /NOT YET MINTED/.test(t.shape)) return FREE;
  // A shape given as an anchored regex is used as one, minus its anchors.
  if (/^\^/.test(t.shape)) return `(?:${t.shape.replace(/^\^/, "").replace(/\$$/, "")})`;
  return FREE;
}

// `<LessonDisplayID list, ", "-joined>` and friends.
function placeholderFragment(inner, grammar) {
  const name = inner.trim();
  if (/^LessonDisplayID list/.test(name)) {
    const one = tokenFragment("LessonDisplayID", grammar);
    return `${one}(?:, ${one})*`;
  }
  // A placeholder naming a declared token gets that token's shape; anything
  // else — claim text, composer prose, a coherence rationale, `<n>` — is free text.
  // Permissiveness here is deliberate and is NOT a hole: the rules that carry
  // real weight (no element names, display ids in member positions, pin once)
  // are checked as their own predicates below, over the whole rendered text,
  // so they cannot be evaded by a line whose free-text tail happens to match.
  const bare = name.split("|")[0].trim();
  if ((grammar.tokens || {})[bare]) return tokenFragment(bare, grammar);
  return FREE;
}

function escapeLiteral(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// One line class → one or more anchored regexes. `lines:` wins where declared:
// the preamble and the judged-empty notice are declared as the exact lines the
// emitter pushes, because both previously shipped as a prose description that
// matched no rendered line — under REFUSE that rejects every conformant file,
// and the grammar records both incidents in its own notes.
export function classMatchers(entry, grammar) {
  if (Array.isArray(entry.lines)) {
    return entry.lines.map((l) => new RegExp(`^${escapeLiteral(l)}$`));
  }
  let form = String(entry.form === undefined ? "" : entry.form);
  if (form === "") return [/^$/];

  // A LEADING `\n` IN A FORM DENOTES THE BLANK LINE BEFORE IT, NOT A CHARACTER
  // OF IT. The emitters separate blocks with `\n`-prefixed strings and the
  // grammar transcribes them as written (`subgroup_heading`, `cover`), so a
  // literal read requires two characters — backslash, n — at the head of a
  // rendered line, which nothing ever produces. The blank line itself is
  // admitted by the `blank` class, which the grammar declares for exactly this
  // reason.
  form = form.replace(/^(?:\\n|\n)+/, "");

  // Placeholders are masked before the top-level alternation split, so a `|`
  // INSIDE `<claim text | NO_CLAIM>` is never mistaken for one between two
  // whole forms.
  const holes = [];
  const masked = form.replace(/<([^<>]*)>/g, (_, inner) => {
    holes.push(inner);
    return `${holes.length - 1}`;
  });

  return masked.split(" | ").map((alt) => {
    // `…` ABBREVIATES THE REST OF A LONG FIXED LINE, so a form carrying one is
    // matched as a PREFIX. Anchoring the tail as well is what rejected the
    // `classification` line: the grammar abbreviates mid-sentence and closes
    // its parenthesis, while the emitted line continues past it. An
    // abbreviation read literally is STRICTER than the text it abbreviates —
    // the `preamble` and `judged_empty_notice` defect in another costume, both
    // recorded in the grammar's own notes.
    const abbreviated = alt.includes("…");
    // TRUNCATE THE WHOLE ALTERNATIVE, NOT EACH PART. The masked form is split
    // on digit runs to find placeholder indices, so an abbreviated tail
    // CONTAINING DIGITS is scattered across several parts and a per-part
    // truncation reaches only the one holding the `…` — every later fragment
    // survives and is demanded as literal prefix text. `abnormal_display_id`
    // is the specimen: its tail is "… Re-run `terrain survey` to regenerate
    // the record (§12.2 v11).", whose `12`, `2` and `11` survived, so the
    // class NEVER admitted the line its own emitter produces, on either
    // surface that declares it. That is the exact failure its own note says it
    // exists to prevent — "a refusal that admitted only ^L[0-9]+$ in a
    // LessonDisplayID position would reject exactly the legacy record this
    // line exists to make visible" — and it was invisible because it fires
    // only on the abnormal path. `classification` masked it: its tail is ")",
    // carries no digit, and therefore worked.
    const body = abbreviated ? alt.replace(/…[\s\S]*$/, "") : alt;
    let out = "";
    for (const part of body.split(/(\d+)/)) {
      if (/^\d+$/.test(part) && holes[Number(part)] !== undefined) {
        out += placeholderFragment(holes[Number(part)], grammar);
      } else {
        out += escapeLiteral(part);
      }
    }
    // Trailing whitespace is tolerated because a Markdown HARD BREAK is two
    // trailing spaces and the `form` notation has no way to write them — the
    // report's identity block emits three such lines. This is a tolerance of
    // the NOTATION, not of the grammar: it admits no token, class or line the
    // grammar does not already admit. Declared in the grammar's reader_notes
    // rather than left as a silent kindness in this file.
    return new RegExp(abbreviated ? `^${out}` : `^${out}[ \\t]*$`);
  });
}

// HOW SPECIFIC A CLASS IS: the number of literal non-space characters it pins
// OUTSIDE its placeholders.
//
// This exists because several classes are catch-alls by construction —
// `group_prose` is `      <composer prose>`, which matches every line indented
// six spaces, including every `subgroup_heading`. First-match-wins therefore
// classified subgroup headings as prose, and `subgroup_members_sum_to_parent`
// summed zero and refused a perfectly good display. The bug was not in the
// grammar: both classes genuinely admit that line, and the grammar has no
// notation for "try me last".
//
// Specificity is the discriminator rather than declaration order, because
// order is invisible at the point of the defect — a class added in the wrong
// place would silently shadow another, and nothing would say so.
function specificity(entry) {
  if (Array.isArray(entry.lines)) return 1000;
  const form = String(entry.form === undefined ? "" : entry.form);
  return form.replace(/<[^<>]*>/g, "").replace(/\s/g, "").length;
}

export function loadGrammar(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// --------------------------------------------------------------------------
// The predicates. Each is one of `decidable_rules.expressible`; the ids match
// so a reader can put them side by side. `not_expressible` members are absent
// here on purpose — a predicate for a rule about artifacts nothing can produce
// is a conformance category with no members, which reads as coverage.
// --------------------------------------------------------------------------

// AC4 — a violation names the SURFACE, the LINE CLASS, the OFFENDING LINE and
// the GRAMMAR ENTRY, so a maintainer fixes it without re-deriving the format
// from prose.
function violation(surface, rule, line, lineNo, detail) {
  return {
    surface,
    rule,
    line_no: lineNo,
    line,
    detail,
    toString() {
      const where = lineNo === null ? "" : ` (line ${lineNo})`;
      return `${surface} / ${rule}${where}: ${detail}`
        + (line === null ? "" : `\n      offending line: ${JSON.stringify(line)}`);
    },
  };
}

export function validateSurface(surfaceName, text, grammar) {
  const surface = (grammar.surfaces || {})[surfaceName];
  if (!surface) {
    return [violation(surfaceName, "surface_declared", null, null,
      `no surface ${JSON.stringify(surfaceName)} in the grammar — SPEC.md §14.1 covers `
      + `${Object.keys(grammar.surfaces || {}).join(", ")} and nothing else`)];
  }
  const v = [];
  const lines = String(text).split("\n");
  // A trailing newline yields a final empty element that is not a rendered
  // line. Dropping it is not leniency: admitting it would depend on whether
  // the caller passed the file's bytes or its lines.
  if (lines.length && lines[lines.length - 1] === "") lines.pop();

  const classes = (surface.line_classes || [])
    .map((e) => ({ entry: e, res: classMatchers(e, grammar), spec: specificity(e) }))
    .sort((a, b) => b.spec - a.spec);
  const classOf = (line) => {
    for (const c of classes) if (c.res.some((re) => re.test(line))) return c.entry.id;
    return null;
  };
  const classified = lines.map(classOf);

  // line_class_allowlist — the non-member fallback is REFUSE, per the surface's
  // own `non_member_fallback`. This is the rule the other five lean on: a line
  // nothing admits is not silently ignored on its way to a token check.
  classified.forEach((id, i) => {
    if (id === null) {
      v.push(violation(surfaceName, "line_class_allowlist", lines[i], i + 1,
        `no line class in ${surfaceName}.line_classes admits this line, and the surface's `
        + `non_member_fallback is ${JSON.stringify(surface.non_member_fallback || "REFUSE")}. `
        + "Either the emitter changed shape, or the grammar owes a new class — "
        + "src/report-format.json wins on divergence (§14.1), so the grammar is amended deliberately, never to make a refusal go away"));
    }
  });

  // no_element_names — §14.2 verbatim, the WIDE rule. The grammar records that
  // two drafts narrowed it and both were withdrawn; the residue (whether a
  // served CITE counts as an element name) was ANSWERED on kogaki#345 SQ2 —
  // a cite is an address — so the predicate looks for element names only.
  lines.forEach((line, i) => {
    if (/\blesson:[a-z0-9-]/.test(line)) {
      v.push(violation(surfaceName, "no_element_names", line, i + 1,
        "an element name (`lesson:<slug>`) reached an owner surface. SPEC.md §14.3: "
        + "no owner surface renders an element name; the rendered token is the display_id, "
        + "resolved from the survey record"));
    }
  });

  // pin_once_per_file
  for (const rule of (grammar.decidable_rules || {}).expressible || []) {
    if (!(rule.surfaces || []).includes(surfaceName)) continue;
    if (rule.id === "pin_once_per_file") {
      const n = classified.filter((id) => id === "substrate_pin").length;
      if (n !== 1) {
        v.push(violation(surfaceName, "pin_once_per_file", null, null,
          `${n} \`substrate_pin\` line(s); the grammar entry requires exactly 1 `
          + "(§12: the report renders the shared substrate pin ONCE, in its identity)"));
      }
    }
    if (rule.id === "subdivision_required_at_ten") {
      v.push(...subdivisionRequiredRule(surfaceName, lines, classified, rule));
    }
    if (rule.id === "subgroup_members_sum_to_parent") {
      v.push(...sumToParentRule(surfaceName, lines, classified));
    }
  }
  return v;
}


// NO PREDICATE FOR `group_subgroup_id_grammar`, AND THE ENTRY SAYS SO.
//
// One was written and deleted in the same round (PR #354 round 1 finding 1,
// then its own test). It keyed on the CLASSIFICATION of a line — inspect every
// line classified as a heading and check its first token against the id shape —
// and that is tautological: the heading forms already embed `<GroupID>`, whose
// fragment IS the token shape, so a line with a bad id never classifies as a
// heading in the first place. It falls to `line_class_allowlist` instead. The
// predicate could not fail, which is the same defect the finding reported, one
// layer along; it was caught only because the repair was made to demonstrate
// itself firing.
//
// Where the guarantee actually lives, per surface:
//   cotag_groups — CARRIED, by `line_class_allowlist` plus the `<GroupID>` /
//     `<SubGroupID>` fragments inside the heading forms. A heading opening with
//     anything else is unadmitted and the emitter refuses. Verified: the
//     v5-shaped `testing × architecture — 2 Lessons: L2, L1` is refused.
//   full_report — NOT CARRIED. That surface's allowlist is inert (three body
//     classes are bare placeholders), so `# Full Report — testing × architecture`
//     is admitted by a body class and nothing refuses it. This is exactly how
//     round 1 finding 2's divergence survived, and it is the same gap
//     `reader_notes.line_class_allowlist_is_inert_on_full_report` already names.
//
const countIn = (s) => {
  const m = /([0-9]+) Lessons?/.exec(s);
  return m ? Number(m[1]) : null;
};

// THE WITHDRAWAL OF `subgroup_members_sum_to_parent`, AND ITS RETURN.
//
// KEPT AS HISTORY, NOT AS A STATEMENT ABOUT THIS FILE. This block read "NO
// PREDICATE FOR `subgroup_members_sum_to_parent`, AND THE GRAMMAR SAYS WHY"
// until v15 (kogaki#739), and by then it was false in its own file: the
// predicate stands at `sumToParentRule()` below and the entry is back in
// `expressible`. A reader arriving here first was told the predicate does not
// exist — the same defect the restored rule's own comment names one function
// along, left standing on the withdrawal side because the repair looked
// forward and nobody re-read what it made stale (PR #759 round 1, finding 2).
//
// WHAT ACTUALLY HAPPENED, in order. There was a predicate, over `cotag_groups`,
// through report-format.json v12: the SubGroup counts under a subdivided group
// heading had to sum to that heading's own count. kogaki#684 disposition 2
// removed the count from the heading, so one side of the comparison went away
// and the rule stopped being decidable from the rendered text; the entry moved
// to `not_expressible` and the predicate left with it, because a predicate for
// a rule about artifacts nothing can produce is a conformance category with no
// members and reads as coverage. kogaki#739 put the count back and the entry
// and its predicate returned together.
//
// IT WAS NEVER RE-POINTED, in either direction, and that is the part worth
// keeping. The available substitute was the sum of the SubGroup counts — the
// only parent quantity the surface carried while the heading had none — and
// that comparison is `sum == sum`, a predicate that cannot fail. The property
// was carried through the withdrawal by the PRE-RENDER refusal in `cmdCotags`,
// over the placement rather than the text, which is weaker in exactly the way
// §14.2 records; that refusal is not withdrawn now the rule is back, because
// the two read different things.

// catch_all_share IS DELETED (kogaki#738 ruling 4, owner rulings 2026-09-01).
//
// It bounded the `(fits no composed SubGroup)` remainder at 30% of its parent —
// a cap on a bucket the ENGINE filled, since `subgroupPlacement` swept every
// member the judge left unplaced into it. That sweep is deleted: a classification
// leaving any member unplaced is now REFUSED, naming the members, so there is no
// engine-filled remainder for a share cap to bound. Applying the cap to the
// judged `other` label instead was the declined alternative — it would be the
// engine second-guessing a verdict §8 assigns to the judge, and `other` is safe
// precisely because it is judged rather than swept.
//
// DELETED RATHER THAN LEFT DECLARED. A rule kept in the carrier after its
// subject is gone is a predicate that cannot fail, which reads as coverage. Its
// entry leaves `report-format.json` in the same act.
//
// WHAT IT ALSO CARRIED, and where that went — RESTATED AT v15 (kogaki#739),
// because the gap it named has since closed from the other side. This rule read
// the same `subgroup_heading` counts that `subgroup_members_sum_to_parent` could
// not read from the text, and at v13 that left the golden specimen as the only
// thing bounding them. `subgroup_members_sum_to_parent` is now back in
// `expressible` and reads those counts directly, so the gap this paragraph
// recorded is covered IN AGGREGATE and the paragraph is no longer the live
// statement of the cost. What is still uncovered is narrower and is named where
// it belongs — `subgroup_member_cap`'s own entry in `report-format.json` — since
// a sum constrains the total and admits two per-SubGroup errors that cancel.

// subgroup_members_sum_to_parent — the SubGroup counts under a subdivided
// group heading must add up to the count on that heading (§6.2 rule 1,
// kogaki#739; report-format.json v15).
//
// RESTORED, NOT WRITTEN. The rule existed as a grammar entry until v13 took the
// parent count off the heading, at which point one side of its comparison
// stopped being rendered and the entry moved to `not_expressible` under a
// reopen trigger naming exactly this event. The trigger fired; this is the
// predicate coming back, and it is deliberately the SAME comparison rather
// than a re-aimed one — a rule re-pointed at the sum of the SubGroup counts
// would compare a quantity to itself and could not fail.
//
// IT DOES NOT SUBSUME THE PRE-RENDER REFUSAL AND IS NOT SUBSUMED BY IT.
// `cmdCotags` refuses double placement and under-placement over the PLACEMENT
// RECORD before any text exists; this reads the TEXT. A renderer handed a
// perfectly placed record that drops a `subgroup_heading` line, or prints the
// wrong number on one, produces data-conformant input and non-conformant
// output — invisible to the first carrier and caught here. Both are kept.
//
// A GROUP WITH NO SUBGROUP LINES IS NOT EXAMINED. `group_heading_subdivided`
// is emitted only when SubGroups follow, so a subdivided heading with none
// after it is already a defect — but it is `subdivision_required_at_ten`'s
// defect when the group is large enough, and nothing's when it is not. Summing
// zero against a positive parent here would refuse on behalf of a rule that
// has its own arm and its own threshold, and would fire on the small-group
// case that rule deliberately declines to examine.
function sumToParentRule(surfaceName, lines, classified) {
  const v = [];
  let parent = null, parentLine = null, parentNo = null, sum = 0, seen = 0;
  const close = () => {
    if (parent === null || seen === 0) return;
    if (sum !== parent) {
      v.push(violation(surfaceName, "subgroup_members_sum_to_parent", parentLine, parentNo,
        `the group heading names ${parent} member Lesson(s) and its ${seen} SubGroup heading(s) sum to ${sum} `
        + "— §6.2 rule 1: every member is placed and nothing is silently dropped. The placement refusal in "
        + "`cmdCotags` reads the record and this rule reads the rendered text, so a disagreement here means the "
        + "RENDERER lost or miscounted a `subgroup_heading` line on a record that placed correctly"));
    }
  };
  classified.forEach((id, i) => {
    if (id === "group_heading_subdivided" || id === "group_heading_flat") {
      close();
      // A FLAT heading opens a group with no SubGroups under it, so it closes
      // the previous group and starts nothing this rule examines. Tracking it
      // as `null` rather than skipping it is what stops a flat group's absent
      // SubGroups from being attributed to the subdivided group above it.
      parent = id === "group_heading_subdivided" ? countIn(lines[i]) : null;
      parentLine = lines[i]; parentNo = i + 1; sum = 0; seen = 0;
    } else if (id === "subgroup_heading") {
      const n = countIn(lines[i]);
      if (n !== null) { sum += n; seen += 1; }
    }
  });
  close();
  return v;
}

// subdivision_required_at_ten — a group at or above the threshold must serve
// SubGroups (§8, kogaki#683 disposition 1; owner ruling 2026-08-28, boundary
// confirmed at ten-or-more at pickup 2026-08-29).
//
// ENGINE-SIDE, AT EMIT, NO MODEL DISCRETION, which is what the disposition asks
// for. It had a sibling measuring the opposite failure — `catch_all_share`
// bounded a judgment that DID split and swept most of the parent into the
// remainder — and that sibling is deleted at kogaki#738 with the sweep it
// measured. THIS RULE IS NOW ALONE IN ITS CLASS on this surface, stated rather
// than left as a comment naming a rule a reader cannot find.
//
// THE THRESHOLD IS READ FROM THE GRAMMAR, never written here. `boundary_ground`
// on the rule entry carries why it is ten; a second literal in this file would
// be the two-carriers-of-one-rule shape, and the number is exactly the kind of
// value that drifts silently when copied.
//
// WHY A GROUP HEADING PLUS ITS FOLLOWERS RATHER THAN A COUNT OF HEADINGS: the
// property is per parent, so a display with one conformant 12-member group and
// one flat 40-member group must fail on the second alone — a display-wide test
// would let the first mask it — the scoping mistake the deleted `catch_all_share`
// recorded having made once already, kept here because the lesson outlived the
// rule that learned it.
//
// A GROUP BELOW THE THRESHOLD IS NOT EXAMINED. §6.2 v7 rule 3 still lets a
// small group render flat when its only named SubGroup was labelled `other`,
// and that path stays legal below ten and is unavailable at or above it — the
// runtime declines to suppress there, so this rule is the carrier for any other
// route to the same rendered text.
function subdivisionRequiredRule(surfaceName, lines, classified, rule) {
  const at = Number(rule.threshold_members);
  const v = [];
  if (!Number.isFinite(at)) {
    // A rule whose threshold the grammar does not carry cannot be evaluated,
    // and guessing one here would be this file inventing the boundary the
    // owner set. Reported as a violation of the GRAMMAR rather than of the
    // text, so it cannot pass silently.
    v.push(violation(surfaceName, rule.id, null, null,
      "the grammar entry declares no numeric `threshold_members`, so this rule cannot be evaluated; "
      + "a threshold guessed in the guard would be the guard inventing the boundary the owner set"));
    return v;
  }
  let parent = null, parentLine = null, parentNo = null, sawSubgroup = false;
  const close = () => {
    if (parent === null || parent < at || sawSubgroup) return;
    v.push(violation(surfaceName, rule.id, parentLine, parentNo,
      `the group holds ${parent} member Lessons and renders NO SubGroup — at ${at} or more, serving SubGroups is the `
      + "engine's requirement rather than the judge's discretion (SPEC-terrain §8, kogaki#683). "
      + `Recompose the subdivision for ${JSON.stringify(parentLine)}: the split decision is not the judge's at this size, `
      + "and a judged-empty outcome for such a group does not render."));
  };
  classified.forEach((id, i) => {
    if (id === "group_heading_subdivided" || id === "group_heading_flat") {
      close();
      // THE SUBDIVIDED ARM STAYS NARROWED, AND ITS ORIGINAL REASON NO LONGER
      // HOLDS. v13 dropped it because that heading carried no count, so
      // `countIn` read `null` and the arm evaluated nothing while still looking
      // evaluated. kogaki#739 puts the count back, so that premise is spent —
      // and the narrowing is kept anyway, deliberately, with the spent premise
      // recorded rather than left to read as current.
      //
      // WHY KEPT: widening it changes what `subdivision_required_at_ten`
      // evaluates, and #739 licenses no clause of that rule. Its obligations
      // are enumerated closed — the heading form, the sum-to-parent entry and
      // its predicate, the `catch_all_share` determination, and the §6.1/§6.2
      // text — and none of them names this rule. It was widened in this PR's
      // first push and reverted at round 1, which found it out of scope and
      // found the widened arm diverging from the entry's own `rule` string
      // ("a `group_heading_flat` line whose LessonCount is >= 10 …"), where
      // §14.1 makes `report-format.json` win. Adjacency is not authorization.
      //
      // WHAT WIDENING WOULD BUY, so the next reader can price it rather than
      // rediscover it: almost nothing today. A line classifies
      // `group_heading_subdivided` only when the emitter is rendering
      // SubGroups, so `sawSubgroup` is set before `close()` reads it in every
      // display this emitter produces. It would remove an asymmetry, and it
      // would need its own issue and a matching amendment to the entry's rule
      // text — both, or the divergence returns.
      parent = id === "group_heading_flat" ? countIn(lines[i]) : null;
      parentLine = lines[i]; parentNo = i + 1; sawSubgroup = false;
    } else if (id === "subgroup_heading") {
      sawSubgroup = true;
    }
  });
  close();
  return v;
}

// --------------------------------------------------------------------------
// The refusal itself. Called by the emitters BEFORE they write or print.
//
// It throws rather than calling `fail()` so the caller decides the exit path,
// and — this is the part that matters for §12.2 v11 — so `cmdReport` can
// validate BEFORE either of its two artifacts exists. A refusal that had
// already written the rendering and not the record would reproduce the
// 2026-08-06 defect specimen from the other side.
export class FormatRefusal extends Error {
  constructor(surfaceName, violations) {
    super(`refusing to emit ${surfaceName}: the rendered text violates src/report-format.json`
      + ` (SPEC.md §14.2 — the refusal is generation-time)\n  `
      + violations.map((x) => `- ${x}`).join("\n  ")
      + "\n  The grammar is authoritative over the rendered form (§14.1). Fix the emitter, "
      + "or amend the grammar deliberately on its own licensing issue — never to make this refusal go away.");
    this.name = "FormatRefusal";
    this.surface = surfaceName;
    this.violations = violations;
  }
}

export function refuseUnlessConformant(surfaceName, text, grammar) {
  const v = validateSurface(surfaceName, text, grammar);
  if (v.length) throw new FormatRefusal(surfaceName, v);
  return text;
}
