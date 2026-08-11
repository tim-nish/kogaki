// THE EMIT-TIME REFUSAL (SPEC-terrain §14.2, story 1.54, kogaki#346).
//
// The emitters validate the text they are ABOUT TO EMIT against
// `specs/spec-terrain/report-format.json` and refuse to write or print on
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
  // else — claim text, composer prose, a leaf reason, `<n>` — is free text.
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
    let out = "";
    for (const part of alt.split(/(\d+)/)) {
      if (/^\d+$/.test(part) && holes[Number(part)] !== undefined) {
        out += placeholderFragment(holes[Number(part)], grammar);
      } else {
        out += escapeLiteral(part).replace(/…[\s\S]*$/, "");
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
// summed zero and refused a perfectly good screen. The bug was not in the
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
        + "specs/spec-terrain/report-format.json wins on divergence (§14.1), so the grammar is amended deliberately, never to make a refusal go away"));
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
    if (rule.id === "subgroup_members_sum_to_parent") {
      v.push(...sumRule(surfaceName, lines, classified, rule));
    }
    if (rule.id === "catch_all_share") {
      v.push(...catchAllRule(surfaceName, lines, classified, rule));
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
//   cotag_screen — CARRIED, by `line_class_allowlist` plus the `<GroupID>` /
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

// subgroup_members_sum_to_parent — the SubGroup counts under a subdivided
// group heading must sum to the heading's own count. A member that appears in
// no SubGroup is the defect §8 forbids, and it is invisible on the screen.
function sumRule(surfaceName, lines, classified, rule) {
  const v = [];
  let parent = null;
  let parentLine = null;
  let parentNo = null;
  let sum = 0;
  const close = () => {
    if (parent !== null && sum !== parent) {
      v.push(violation(surfaceName, rule.id, parentLine, parentNo,
        `the SubGroup Lesson counts sum to ${sum}, the group heading says ${parent} — `
        + "a member placed in no SubGroup is hidden, which §8 forbids and the screen cannot show"));
    }
    parent = null; sum = 0;
  };
  classified.forEach((id, i) => {
    if (id === "group_heading_subdivided") {
      close();
      parent = countIn(lines[i]); parentLine = lines[i]; parentNo = i + 1; sum = 0;
    } else if (id === "group_heading_flat") {
      close();
    } else if (id === "subgroup_heading" && parent !== null) {
      const n = countIn(lines[i]);
      if (n !== null) sum += n;
    }
  });
  close();
  return v;
}

// catch_all_share — the "(no second served tag)" group's share of the Cover
// line's denominator. A catch-all swallowing most of the corpus is a
// composition that discriminated nothing.
function catchAllRule(surfaceName, lines, classified, rule) {
  const name = rule.catch_all_group_name;
  const cap = 0.30;
  let catchAll = null;
  let coverOf = null;
  classified.forEach((id, i) => {
    if ((id === "group_heading_flat" || id === "group_heading_subdivided") && lines[i].includes(name)) {
      catchAll = countIn(lines[i]);
    }
    if (id === "cover") {
      const m = /Cover: [0-9]+ of ([0-9]+)/.exec(lines[i]);
      if (m) coverOf = Number(m[1]);
    }
  });
  if (catchAll === null || !coverOf) return [];
  const share = catchAll / coverOf;
  if (share > cap) {
    return [violation(surfaceName, rule.id, null, null,
      `the ${JSON.stringify(name)} group holds ${catchAll} of ${coverOf} member Lessons `
      + `(${(share * 100).toFixed(1)}%), over the ${(cap * 100).toFixed(0)}% the grammar entry allows — `
      + "a catch-all this large is a composition that discriminated nothing")];
  }
  return [];
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
    super(`refusing to emit ${surfaceName}: the rendered text violates specs/spec-terrain/report-format.json`
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
