#!/usr/bin/env bash
# check-brief-entry — the Brief entry point's contract properties
# (SPEC-draft-pipeline §5.3; v7 kogaki#482 story 1.71; re-sequenced v9
# kogaki#494, story 1.72: entry → thesis-determination gate → mint; the slug
# PAIRED INTO THE ONE GATE at v11, kogaki#518, story 1.76).
#
# Seam-free: every case runs against the committed terrain survey fixture
# (checks/fixtures/terrain/cotags/lone-tag-member.json, display ids L1-L5)
# with the run state and the briefs dir both in temporary directories. The
# composed document is asserted through the exported composer AND through
# the command path, so a wiring break between them fails here rather than
# shipping.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { composeBrief, resolveStrandIds, composeThesisCandidates, deriveSlugCandidate } from "./brief/brief.mjs";
import { NO_HEADLINE } from "./terrain/terrain.mjs";
import { findInternalVocabulary, SLOT_CAPTIONS } from "./brief/assemble.mjs";
import { journeyBearingStrands, fillBrief } from "./brief/compose.mjs";

const SURVEY = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const record = JSON.parse(readFileSync(SURVEY, "utf8"));
const fails = [];
const dir = mkdtempSync(join(tmpdir(), "brief-entry-"));
const briefs = join(dir, "briefs");
const rs = (name) => join(dir, `${name}.run.json`);
const run = (argv) => spawnSync(process.execPath,
  ["brief/brief.mjs", ...argv], { encoding: "utf8" });
const enter = (ids, state) => run(["enter", "--survey", SURVEY, "--ids", ids, "--run-state", state]);
const adopt = (state, thesis, slug) => run(slug === undefined
  ? ["adopt", "--run-state", state, "--thesis", thesis]
  : ["adopt", "--run-state", state, "--thesis", thesis, "--slug", slug]);
// The mint takes NO name of its own at v11 — it consumes the adopted pair.
const mint = (state) => run(["mint", "--run-state", state, "--briefs-dir", briefs]);
const briefsEmpty = () => !existsSync(briefs) || readdirSync(briefs).length === 0;
// The strand phrases the fixture's set can contribute — the vocabulary a
// composed candidate may draw content from (plus plain-register frame words).
const setPhrases = (ids) => ids.map((id) =>
  record.candidates.find((c) => c.display_id === id).slug.replace(/-/g, " "));
// Served renderings, INJECTED (kogaki#519/#528). The composer is pure over
// this map, so the compose-from-the-set case runs deterministically and
// SEAM-FREE — the whole reason the resolution lives in terrain and the
// composer only consumes it. Prose deliberately unlike any slug, so the
// no-slug-phrase assertion cannot pass by accident.
// THE LABEL TEST GOVERNS THE COMPOSER'S TEXT, NEVER THE MATERIAL (§5.1.2's
// layer argument, applied to §5.1.3's surface rule). A candidate's thesis OPENS
// with the served claim, and served prose may legitimately begin "Note: …" — that
// colon is the substrate's, not this composer's, and an owner typing a Thesis
// cannot break a rule about what this codebase emits. So a leading label is a
// finding only when it is NOT the claim's own opening. The concession is
// composer text end to end and has no such exemption.
const openingLabel = (text, exempt) => {
  const m = /^\s*[A-Z][A-Za-z' ]{0,30}:/.exec(text || "");
  if (!m) return null;
  if (exempt && String(exempt).trimStart().startsWith(m[0].trimStart())) return null;
  return m[0];
};

const mkHeads = (ids) => new Map(ids.map((id) => {
  const c = record.candidates.find((x) => x.display_id === id);
  return [c.slug, { headline: `A team that ships ${id} learns the cost only after the second time.`,
                    cite: `gloss/lessons/testing.md:${id.slice(1)}@deadbeef` }];
}));

try {
  // (a) ENTRY WRITES NOTHING UNDER briefs/ (AC1): pre-Thesis state is
  // machine-local run state; the mint is the only producer of the home.
  // Observed BOTH where the check points the mint (the tmp briefs dir) and
  // at the repository's own briefs/ (a read-only listing snapshot), because
  // `enter` takes no briefs-dir at all and a mutated enter would write
  // relative to cwd.
  const repoBriefs = () => existsSync("briefs") ? readdirSync("briefs").sort().join(",") : "(absent)";
  const repoBefore = repoBriefs();
  const s1 = rs("case-a");
  const r1 = enter("L2,L1", s1);
  if (r1.status !== 0) fails.push(`(a) enter exited ${r1.status}: ${(r1.stderr || "").trim()}`);
  if (!briefsEmpty()) fails.push("(a) enter created something under the briefs dir — a pre-Thesis Brief must be UNPRODUCIBLE (§5.3 v9, kogaki#494)");
  if (repoBriefs() !== repoBefore) fails.push("(a) enter changed the repository's briefs/ — a pre-Thesis Brief must be UNPRODUCIBLE (§5.3 v9, kogaki#494)");
  if (!existsSync(s1)) fails.push("(a) enter wrote no machine-local run state");
  const st1 = existsSync(s1) ? JSON.parse(readFileSync(s1, "utf8")) : {};

  // (b) THE THESIS-DETERMINATION GATE COMPOSES FROM THE SETTLED SET ONLY
  // (AC2): 2-3 candidates, each drawing its content phrases from the set's
  // own members; a foreign lesson slug appearing in any candidate is the
  // invented-from-outside defect.
  const cands = st1.thesis_candidates || [];
  if (cands.length < 2 || cands.length > 3) fails.push(`(b) ${cands.length} thesis candidate(s) — the gate composes 2-3`);
  const foreign = setPhrases(["L3", "L4", "L5"]);
  for (const c of cands) {
    for (const f of foreign) if ((c.thesis || "").includes(f)) fails.push(`(b) candidate ${c.id} references "${f}", which is outside the settled set — never widened, never invented (§3)`);
    // THE SHAPE, NEVER THE STRING (§5.1.3 v20, kogaki#566). This line used to
    // read `/Concedes:/`, which asserted the very field label the ruling
    // retires — and a string check "would reward exactly the templating D1
    // forbids" (product-lab@541e5958 topics/articles.md:49). What is asserted
    // now is that the concession is PRESENT as prose (SPEC-style-contract §4
    // clause 2 still requires it as part of the output) and that neither half
    // the owner reads OPENS WITH A FIELD LABEL.
    // THE CLAIM IS A PREFIX OF WHAT THE GATE RENDERS (kogaki#572). The mint
    // records `claim` and the owner reads `thesis`, so the strip is honest only
    // while the recorded text is CONTAINED in the rendered text — the Brief then
    // holds less than the owner read, never something else. This held for free
    // until one branch reworded its claim instead of extending it, and nothing
    // asserted it, which is why a fix landing in the area passed a suite that
    // had just been extended for it.
    if (typeof c.claim !== "string" || !(c.thesis || "").startsWith(c.claim)) {
      fails.push(`(b) candidate ${c.id}'s thesis does not open with its claim — the mint would record text the owner never read (§5.1.3, kogaki#572)`);
    }
    if (!(c.concession || "").trim()) fails.push(`(b) candidate ${c.id} carries no round-trip concession (SPEC-style-contract §4 clause 2 — a concession is part of the output, never a silent omission)`);
    for (const [half, text, exempt] of [["thesis", c.thesis, c.claim], ["concession", c.concession, null]]) {
      const label = openingLabel(text, exempt);
      if (label) fails.push(`(b) candidate ${c.id}'s ${half} opens with the field label ${JSON.stringify(label)} — every owner-facing rendering is ordinary prose (§5.1.3)`);
    }
    // THE DOUBLED-PERIOD ASSERTION IS NOT HERE, and that is deliberate rather
    // than an omission: this case reads the run state `enter` wrote, whose
    // renderings are UNRESOLVED on the check's seam-free path, so its candidates
    // carry terrain's marker and never a served sentence. A period assertion
    // here could not fail — it was written here first and SURVIVED its mutation
    // for exactly that reason. It lives in (b2), which injects served text.
  }

  // (b2) COMPOSED FROM THE SERVED RENDERINGS, NEVER FROM THE SLUGS
  // (kogaki#519/#528). Driven through the EXPORTED composer with an injected
  // map, which is what keeps this seam-free: the resolution is terrain's and
  // the composer is pure over its result. The old form templated
  // `slug.replace(/-/g, " ")`, so with four members three options shared
  // everything but the lead and read as machine language.
  {
    const strandsB2 = resolveStrandIds(record, ["L2", "L1"]).strands;
    const heads = mkHeads(["L2", "L1"]);
    const c2 = composeThesisCandidates(strandsB2, heads);
    const served = [...heads.values()].map((h) => h.headline);
    const slugPhrases = setPhrases(["L1", "L2"]);
    for (const c of c2) {
      if (!served.some((h) => (c.thesis || "").includes(h))) {
        fails.push(`(b2) candidate ${c.id} carries no served rendering — it is not composed FROM the set's material`);
      }
      for (const sp of slugPhrases) {
        if ((c.thesis || "").includes(sp)) {
          fails.push(`(b2) candidate ${c.id} still carries the slug-derived phrase "${sp}" — the generator is the defect (kogaki#519)`);
        }
      }
    }
    // The options must DIFFER on their lead, which is the whole reason the
    // gate offers more than one.
    if (new Set(c2.map((c) => c.thesis)).size !== c2.length) {
      fails.push("(b2) two candidates state the SAME Thesis — the composition fork is not real");
    }
    // TWO MEMBERS MAY SHARE A HEADLINE. A served first sentence is prose, and
    // nothing makes two Lessons' first sentences distinct — so this case is
    // real rather than hypothetical, and it is kept. WHAT IT ASSERTS CHANGED
    // AT §5.1.3 (v20, kogaki#566), and the supersession is recorded rather
    // than edited away, because a dropped case and an invented one read
    // identically.
    //
    // IT USED TO ASSERT: that the segment after the thesis's em dash carried
    // the shared headline, which discriminated position-filtering (`rest`
    // filtered by index) from text-filtering (filtered by value, which emptied
    // `rest` whenever two members shared a phrase). THAT PROPERTY IS RETIRED
    // WITH ITS MECHANISM. The composer no longer splices the supporting
    // members into the thesis at all — the splice was the run-on defect
    // kogaki#566 names — so there is no `rest`, no filter, and no way for the
    // defect to be reintroduced by a filtering choice. It is a retired-subject
    // orphan whose catch record can never matter, which is the one case the
    // served retention rule permits deleting
    // (product-lab@541e5958 topics/claude-code-ops.md:81); it is NOT a
    // never-fired member, and nothing here widens the permission to those.
    //
    // IT NOW ASSERTS THE UNPRODUCIBILITY DIRECTLY: no candidate carries more
    // than ONE served headline. That is the property that makes the splice
    // unreachable, and it fails the moment anyone re-introduces one — which a
    // punctuation search for the doubled period could not do on its own.
    {
      const dup = "Both members say the same first sentence.";
      const dupHeads = new Map([...heads.keys()].map((k) => [k, { headline: dup, cite: "x:1@d" }]));
      for (const c of composeThesisCandidates(strandsB2, dupHeads)) {
        const occurrences = (c.thesis || "").split(dup).length - 1;
        if (occurrences !== 1) {
          fails.push(`(b2) candidate ${c.id} carries the served headline ${occurrences} time(s) — exactly one leads, and a second is the splice §5.1.3 retires`);
        }
      }
      // AND THE SAME OVER DISTINCT HEADLINES, which is where a splice would
      // actually show: with the members' texts different, a candidate that
      // restated the others would carry two headlines and be caught here.
      const served2 = [...heads.values()].map((h) => h.headline);
      for (const c of composeThesisCandidates(strandsB2, heads)) {
        const carried = served2.filter((h) => (c.thesis || "").includes(h)).length;
        if (carried !== 1) {
          fails.push(`(b2) candidate ${c.id} carries ${carried} served headline(s) — a candidate leads with one member and restates none (§5.1.3)`);
        }
        // ONE TERMINAL PERIOD. The fixture's headlines END IN A SENTENCE, which
        // is what makes this assertion able to fail at all: the composer trims
        // before it appends, and a composer that appends unconditionally writes
        // `…second time..` here.
        // THE THESIS HALF ONLY, and the exclusion is the point rather than an
        // oversight (PR #571 round 1). Every concession is a composer literal
        // interpolating a member COUNT — no served text reaches it, so it has no
        // terminal period to double and a concession clause here could not fail.
        // Asserting over it would read as coverage this check does not have.
        if (/\.\./.test(c.thesis || "")) {
          fails.push(`(b2) candidate ${c.id} carries a doubled period — the composer appended a period to text that already ended in one (§5.1.3)`);
        }
        // THE NAME IS MADE OF SERVED WORDS ONLY (kogaki#572). `deriveSlugCandidate`
        // walks until five tokens or forty characters, so a claim running past its
        // served sentence let the derivation run on into the composer's own words
        // and name the Brief's directory after them. Asserted against the served
        // headline rather than against a denylist of composer vocabulary — a
        // denylist is the enumeration that goes stale one phrase later.
        {
          const servedWords = new Set(String(c.name_source || c.claim).toLowerCase()
            .replace(/[^a-z0-9\s-]/g, "").split(/\s+/).filter(Boolean));
          for (const w of String(c.slug).split("-")) {
            if (!servedWords.has(w)) {
              fails.push(`(b2) candidate ${c.id}'s name carries "${w}", which is not in the served sentence it derives from — the composer's own words reached a directory name (kogaki#572)`);
            }
          }
        }
        // AND NO FIELD LABEL, asserted over the SERVED path too. (b) asserts it
        // over the degraded one; a rendering is prose on both.
        for (const [half, text, exempt] of [["thesis", c.thesis, c.claim], ["concession", c.concession, null]]) {
          const label = openingLabel(text, exempt);
          if (label) fails.push(`(b2) candidate ${c.id}'s ${half} opens with the field label ${JSON.stringify(label)} — every owner-facing rendering is ordinary prose (§5.1.3)`);
        }
      }
    }

    // A REAL WIDENING ASSERTION (PR #534 round 1). (b)'s foreign-phrase loop
    // tests slug-derived phrases, which the fix makes unproducible, so it
    // became vacuous — a survivor that cannot fail. The property it MEANT to
    // hold is that no candidate carries material from a member OUTSIDE the
    // settled set, and that is now asserted in the substrate the composer
    // actually reads: a rendering for a foreign member is offered in the map
    // and must not appear.
    const widened = new Map(heads);
    const outsider = record.candidates.find((c) => !["L1", "L2"].includes(c.display_id));
    const OUTSIDE = "Foxtrot is a member nobody settled on and it must never appear.";
    // GUARDED, and it NAMES what it lacked (kogaki#540). The fixture carries
    // L3-L5 today; narrowing it to the settled pair turned this named assertion
    // into a TypeError — fail-safe in direction, and lossy in exactly the way a
    // check exists to avoid. A fixture that cannot supply an outsider cannot
    // exercise widening, and that is a finding rather than a crash.
    if (!outsider) {
      fails.push("(b2) the survey fixture carries no member outside the settled set, so the widening assertion could not run — it is unexercised rather than passing");
    } else {
      widened.set(outsider.slug, { headline: OUTSIDE, cite: "gloss/lessons/testing.md:1@deadbeef" });
      for (const c of composeThesisCandidates(strandsB2, widened)) {
        if ((c.thesis || "").includes(OUTSIDE)) {
          fails.push(`(b2) candidate ${c.id} carries a rendering for ${outsider.display_id}, which is OUTSIDE the settled set — never widened (§3)`);
        }
      }
    }
    // AN ABSENT RENDERING IS DISCLOSED, NEVER SUBSTITUTED: with no map the
    // composer must carry terrain's abnormal marker rather than fall back to
    // the slug, which is the fallback kogaki#519 exists to remove.
    const c3 = composeThesisCandidates(strandsB2, new Map());
    if (!c3.every((c) => (c.thesis || "").includes(NO_HEADLINE))) {
      fails.push("(b2) an unresolved rendering does not carry terrain's abnormal marker — an absence was substituted");
    }
    // AND THE DEGRADED OPTIONS STAY DISTINGUISHABLE. A bare marker is the same
    // text for every member, so the options collapsed into one option shown
    // three times — on the seam-free CI path and the gateway-down owner path
    // alike (PR #534 round 1). The marker carries its member's display_id.
    if (new Set(c3.map((c) => c.thesis)).size !== c3.length) {
      fails.push("(b2) with nothing resolved the candidates are byte-identical — the gate offers one option three times");
    }
    for (const c of c3) {
      if (!/L[0-9]+/.test(c.thesis || "")) {
        fails.push(`(b2) candidate ${c.id}'s abnormal marker names no member — the owner cannot tell which Strand lacks material`);
      }
    }
    for (const sp of slugPhrases) {
      if (c3.some((c) => (c.thesis || "").includes(sp))) {
        fails.push(`(b2) an unresolved rendering fell back to the slug phrase "${sp}" — substitution, not disclosure`);
      }
    }
  }

  // (b3) A ONE-MEMBER SET STILL OFFERS TWO REAL OPTIONS (PR #571 round 1). With
  // no lead to vary, the two candidates carry the same proposition — so the
  // property that matters is that they ADOPT differently, not merely that they
  // READ differently. Asserted on `claim`, because `claim` is what the mint
  // records: a check reading `thesis` here passes while the Brief comes out
  // byte-identical whichever option the owner chose, which is the regression
  // this case exists for.
  {
    const one = resolveStrandIds(record, ["L1"]).strands;
    const c1 = composeThesisCandidates(one, mkHeads(["L1"]));
    if (c1.length < 2) {
      fails.push(`(b3) a one-member set composed ${c1.length} candidate(s) — the gate offers 2-3`);
    } else {
      if (new Set(c1.map((c) => c.claim)).size !== c1.length) {
        fails.push("(b3) two candidates over a one-member set adopt the SAME claim — whichever option the owner takes, the Brief is byte-identical and the choice survives only as a routing token");
      }
      if (new Set(c1.map((c) => c.thesis)).size !== c1.length) {
        fails.push("(b3) two candidates over a one-member set read identically at the gate");
      }
      // THE ONE-MEMBER SET IS WHERE kogaki#572'S BOTH DEFECTS LIVED, so it is
      // where they are asserted. (b) and (b2) carry the same two properties over
      // multi-member sets, and on those every claim is a single served sentence
      // — so both assertions hold there BY CONSTRUCTION and neither could fail.
      // Two mutations survived exactly that way before this block was written,
      // which is the same survivor class this suite has now recorded three times:
      // an assertion is only as good as the inputs of the case it sits in.
      // A SHORT SERVED SENTENCE IS THE INPUT THIS NEEDS, and it is injected rather
      // than borrowed. `mkHeads` composes a long headline, which yields five slug
      // tokens on its own — so the derivation stops inside the served text and a
      // name assertion over it cannot fail however the claim runs on. kogaki#572's
      // own report says so: the defect "fires only under a short headline". The
      // fixture's headline is the wrong input for this property, and using it is
      // how the first cut of this assertion survived its mutation.
      const SHORT = "Reviews should be isolated.";
      const shortHeads = new Map([[one[0].slug, { headline: SHORT, cite: "gloss/lessons/testing.md:1@deadbeef" }]]);
      const cShort = composeThesisCandidates(one, shortHeads);
      const servedShort = new Set(SHORT.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/).filter(Boolean));
      for (const c of cShort) {
        for (const w of String(c.slug).split("-")) {
          if (!servedShort.has(w)) {
            fails.push(`(b3) candidate ${c.id}'s name carries "${w}", which is not in the short served sentence it derives from — the composer's own words reached a directory name (kogaki#572)`);
          }
        }
        if (!(c.thesis || "").startsWith(c.claim || "\u0000")) {
          fails.push(`(b3) candidate ${c.id}'s thesis does not open with its claim, over a short served sentence (kogaki#572)`);
        }
      }
      for (const c of c1) {
        if (!(c.concession || "").trim()) fails.push(`(b3) candidate ${c.id} carries no round-trip concession`);
        const label = openingLabel(c.thesis, c.claim);
        if (label) fails.push(`(b3) candidate ${c.id}'s thesis opens with the field label ${JSON.stringify(label)} — prose, never a labelled field (§5.1.3)`);
        // CONTAINMENT: the mint records `claim`, the owner reads `thesis`.
        if (!(c.thesis || "").startsWith(c.claim || "\u0000")) {
          fails.push(`(b3) candidate ${c.id}'s thesis does not open with its claim — the Brief would record text the owner never read (kogaki#572)`);
        }
        // (name purity is asserted above, over a SHORT served sentence — the only
        // input under which the derivation can run past it)
      }
    }
  }

  // (b4) A CANDIDATE WITH NO CLAIM REFUSES, NAMING IT (PR #571 round 1). The
  // `hit.claim || hit.thesis` disjunct this replaced could only fire on a run
  // state this file did not write — and there it would have silently recorded
  // the framed sentence the strip exists to remove. Exercised by writing exactly
  // that state rather than recorded as unreachable: a refusal nothing drives is
  // indistinguishable from one that was never wired up.
  {
    const sNo = rs("case-b4-claimless");
    enter("L2,L1", sNo);
    const stNo = JSON.parse(readFileSync(sNo, "utf8"));
    delete stNo.thesis_candidates[0].claim;
    writeFileSync(sNo, JSON.stringify(stNo, null, 2) + "\n");
    const rNo = adopt(sNo, "thesis-1");
    if (rNo.status === 0) {
      fails.push("(b4) adopting a claimless candidate SUCCEEDED — the framed thesis would be recorded as the Brief's claim with nothing reporting it");
    } else if (!/claim/.test(rNo.stderr || "")) {
      fails.push("(b4) the claimless refusal does not name the claim — a caller cannot tell which half is missing");
    }
    const stAfter = JSON.parse(readFileSync(sNo, "utf8"));
    if (stAfter.stage === "adopted") fails.push("(b4) the refused adoption still advanced the run state");
  }

  // (c) THE ASK CARRIES ITS GATE DECLARATION AND THE PREMISE'S NEGATION AS
  // A FIRST-CLASS OPTION (AC3): record-shape fields, negates_premise routing
  // back through Terrain, unconditional free text.
  const gate = st1.gate || {};
  if (gate.gate_id !== "brief-thesis-adoption") fails.push("(c) the ask carries no gate declaration (gate_id brief-thesis-adoption)");
  for (const f of ["where", "why", "label", "options", "free_text"]) if (!(f in gate)) fails.push(`(c) gate declaration lacks record field ${JSON.stringify(f)}`);
  const neg = (gate.options || []).find((o) => o.negates_premise === true);
  if (!neg) fails.push("(c) no option flagged negates_premise — the premise's negation must be first-class");
  else if (!/Terrain/.test(neg.label) || !/never|no Brief/.test(neg.label)) fails.push("(c) the negation option does not route back through Terrain / refuse a Brief fetch");
  if (gate.free_text?.accepted !== true) fails.push("(c) free text is not unconditionally accepted");

  // (d) THE ONE GATE CARRIES THE (THESIS, SLUG) PAIR (kogaki#518, story
  // 1.76; §5.3 v11). The second ask is GONE, not skipped: this case asserts
  // the pair on the gate payload, the two conditions v11 binds the merge by
  // — separately RENDERED and separately DECLINABLE — and the absence of the
  // retired ask from the run state, the runtime source and the gate registry.
  if ("slug_gate" in st1 || "slug_candidate" in st1) fails.push("(d) the run state still carries the RETIRED slug ask's keys — the second question is gone, not merely unraised (§5.3 v11)");
  const gateOpts = (st1.gate?.options || []).filter((o) => !o.negates_premise);
  for (const c of cands) {
    // AC1: one slug per candidate, and deriveSlugCandidate is THE derivation.
    if (typeof c.slug !== "string" || !c.slug) { fails.push(`(d) candidate ${c.id} carries no paired slug`); continue; }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(c.slug)) fails.push(`(d) candidate ${c.id}'s slug ${JSON.stringify(c.slug)} is not a name the owner could enumerate as a directory`);
    if (c.slug !== deriveSlugCandidate(c.name_source || c.claim)) fails.push(`(d) candidate ${c.id}'s slug is not what deriveSlugCandidate makes of ITS OWN served sentence — two derivations`);
    const words = new Set(c.thesis.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/));
    for (const w of c.slug.split("-")) if (![...words].some((t) => t === w || t.includes(w))) fails.push(`(d) candidate ${c.id}'s slug word "${w}" does not derive from its own Thesis`);
    // AC2: SEPARATELY RENDERED. THE SITE MOVED AND THE PROPERTY DID NOT
    // (kogaki#567). v11 declared the option BODY a try-one-first placement with
    // its own release condition — "if it reads badly in use, it moves to the
    // label, and that move needs no amendment" — and the condition fired at the
    // 2026-08-20 dogfood. So what is asserted here is no longer WHERE the name
    // renders but that it is still SEPARATELY rendered: a marked-off element
    // carrying its own name, never folded into the Thesis prose where the owner
    // would ratify a second decision class without seeing it.
    //
    // RETIRED WITH ITS SITE, stated because a dropped assertion and an invented
    // one read identically: the body-element assertion and its label-presence
    // sibling are gone, because the body element they read is gone. They are
    // replaced rather than deleted — the same property, asserted at the site
    // that now carries it, plus a NEW assertion the old form never needed: the
    // name renders ONCE. Two sites for one value is the state a move can leave
    // behind, and nothing else would catch it.
    const opt = gateOpts.find((o) => o.id === c.id);
    if (!opt) { fails.push(`(d) candidate ${c.id} has no option in the gate payload`); continue; }
    const named = /\s—\s([A-Za-z][A-Za-z ]{0,20}):\s*([a-z0-9][a-z0-9-]*)\s*$/.exec(opt.label || "");
    if (!named) {
      fails.push(`(d) option ${c.id}'s label carries no marked-off, NAMED name element — a second decision class riding invisibly inside the first is what §5.3 v11's served constraint forbids`);
    } else if (named[2] !== c.slug) {
      fails.push(`(d) option ${c.id}'s label names ${JSON.stringify(named[2])} while the candidate's paired name is ${JSON.stringify(c.slug)} — the owner would adopt a name the run does not carry`);
    }
    if ((opt.rendering || []).some((r) => r.text === c.slug)) {
      fails.push(`(d) option ${c.id} renders its name TWICE — the body element is retired by kogaki#567, and two sites for one value is what a half-finished move leaves behind`);
    }
  }
  // AC2: the BARE slug — `briefs/` appears in NO option's rendering.
  for (const o of st1.gate?.options || []) {
    const surfaces = [o.label, ...(o.rendering || []).flatMap((r) => [r.label, r.text])];
    for (const t of surfaces) if (String(t).includes("briefs/")) fails.push(`(d) option ${o.id} renders a briefs/ path — the owner reads the BARE name (owner rendering ruling 2026-08-18)`);
  }
  // AC3, half one: with no override, the ADOPTED CANDIDATE'S OWN paired slug
  // is what the run carries forward.
  const r2 = adopt(s1, "thesis-1");
  if (r2.status !== 0) fails.push(`(d) adopt exited ${r2.status}: ${(r2.stderr || "").trim()}`);
  const st2 = JSON.parse(readFileSync(s1, "utf8"));
  if ("slug_gate" in st2 || "slug_candidate" in st2) fails.push("(d) adoption emitted the RETIRED slug ask");
  if (/slug_gate|brief-slug-approval/.test(r2.stdout || "")) fails.push("(d) adopt printed a slug ask — the second question has no path to exist (§5.3 v11)");
  // THE ADOPTED TEXT IS THE CLAIM, AND THE FRAME IS STRIPPED (§5.1.3 v20,
  // kogaki#566). Asserted in BOTH directions, because the equality alone would
  // pass a composer that simply renamed its field: the run must carry the
  // candidate's claim AND must not carry the gate sentence that framed it.
  {
    const c1 = (st1.thesis_candidates || [])[0] || {};
    if (st2.adopted_thesis !== c1.claim) fails.push("(d) adopting thesis-1 did not record that candidate's CLAIM");
    if (c1.thesis && c1.thesis !== c1.claim && st2.adopted_thesis === c1.thesis) {
      fails.push("(d) the gate's framing sentence survived adoption — the mint records the claim, never the scaffolding (§5.1.3)");
    }
  }
  if (st2.adopted_slug !== cands[0]?.slug) fails.push(`(d) the adopted name is not the one paired with the adopted candidate: ${JSON.stringify(st2.adopted_slug)} vs ${JSON.stringify(cands[0]?.slug)}`);
  // AC3, half two: SEPARATELY DECLINABLE — the slug half is overridden in the
  // SAME one answer, costing neither a restatement of the Thesis nor the
  // option. Driven on its own run so the un-overridden path above stands.
  const sOv = rs("case-d-override");
  enter("L2,L1", sOv);
  const stOv0 = JSON.parse(readFileSync(sOv, "utf8"));
  const rOv = adopt(sOv, "thesis-1", "owner-named-this-brief");
  if (rOv.status !== 0) fails.push(`(d) adopt with an override slug exited ${rOv.status}: ${(rOv.stderr || "").trim()}`);
  const stOv = JSON.parse(readFileSync(sOv, "utf8"));
  if (stOv.adopted_slug !== "owner-named-this-brief") fails.push("(d) the owner's override is not the adopted name — the slug half is not separately declinable");
  if (stOv.adopted_thesis !== stOv0.thesis_candidates[0].claim) fails.push("(d) overriding the slug cost the owner the listed Thesis — declining one half must not abandon the option");
  if (stOv.adopted_via !== "thesis-1") fails.push("(d) the override path did not record the LISTED candidate as adopted — the option was abandoned rather than kept");
  const rBad = adopt(sOv, "thesis-2", "Not A Slug");
  if (rBad.status === 0) fails.push("(d) a malformed override was accepted as the Brief's name");
  // AC4: the retired ask is ABSENT FROM THE TREE, not merely unraised.
  const runtimeSrc = readFileSync("brief/brief.mjs", "utf8");
  for (const token of ["slug_gate", "brief-slug-approval"]) {
    if (new RegExp(`"${token}"|'${token}'|\\b${token}:`).test(runtimeSrc)) fails.push(`(d) brief/brief.mjs still carries ${token} as a live path — kogaki#518 retires the ask, it does not leave it unraised`);
  }
  const gatesRegistry = JSON.parse(readFileSync("gates/registry.json", "utf8"));
  if ((gatesRegistry.gates || []).some((g) => g.id === "brief-slug-approval")) fails.push("(d) gates/registry.json still declares brief-slug-approval — a registered gate nothing raises is the uncovered-by-default shape");
  const thesisGate = (gatesRegistry.gates || []).find((g) => g.id === "brief-thesis-adoption");
  const dyn = thesisGate?.dynamic_options || "";
  for (const [needle, what] of [[/pair/i, "the paired option"], [/separately RENDERED/i, "the separately-rendered condition"], [/separately DECLINABLE/i, "the separately-declinable condition"]]) {
    if (!needle.test(dyn)) fails.push(`(d) brief-thesis-adoption's dynamic_options does not declare ${what}`);
  }

  // (e) THE GATE BLOCKS (AC6): mint before adoption refuses and writes
  // nothing; and the mint INVENTS NO NAME — a run state carrying an adopted
  // Thesis but no adopted name refuses rather than deriving one itself,
  // which is the guard that keeps the name an ANSWERED half of the one gate.
  const s2 = rs("case-e");
  enter("L3", s2);
  const r3 = mint(s2);
  if (r3.status === 0) fails.push("(e) mint ran with NO adopted Thesis");
  if (!/no Thesis has been adopted/.test(r3.stderr || "")) fails.push(`(e) the pre-adoption refusal does not name the blocked gate: ${JSON.stringify((r3.stderr || "").slice(0, 120))}`);
  const sNoName = rs("case-e-nameless");
  enter("L3", sNoName);
  adopt(sNoName, "thesis-1");
  const stripped = JSON.parse(readFileSync(sNoName, "utf8"));
  delete stripped.adopted_slug;
  writeFileSync(sNoName, JSON.stringify(stripped, null, 2) + "\n");
  const r4 = mint(sNoName);
  if (r4.status === 0) fails.push("(e) mint invented a name for a run whose adopted pair carries none");
  if (!/no adopted name/.test(r4.stderr || "")) fails.push(`(e) the nameless refusal does not name what is missing: ${JSON.stringify((r4.stderr || "").slice(0, 160))}`);
  if (!briefsEmpty()) fails.push("(e) a blocked gate left something under briefs/");

  // (f) THE MINT (AC5): thesis FILLED at mint by construction — the adopted
  // text, never a slot — and every DOWNSTREAM §5.1 field a typed unfilled
  // slot; definition, pin, cites and closed-set line retained from v7; the
  // command path byte-equal to the exported composer.
  const r5 = mint(s1);
  if (r5.status !== 0) fails.push(`(f) mint exited ${r5.status}: ${(r5.stderr || "").trim()}`);
  const home = join(briefs, st2.adopted_slug);
  const doc = existsSync(join(home, "brief.md")) ? readFileSync(join(home, "brief.md"), "utf8") : "";
  if (!/A \*\*brief\*\* is the working plan/.test(doc)) fails.push("(f) the reader-facing definition of 'brief' is absent — coining an owner-facing term obliges a definition in the same act");
  if (!/### L2 — alpha/.test(doc) || !/### L1 — bravo/.test(doc)) fails.push("(f) a resolved Strand heading is absent");
  if (!new RegExp("cite: `gloss/").test(doc)) fails.push("(f) a Strand renders no cite");
  if (!/journey cite: `gloss/.test(doc)) fails.push("(f) L2's Journey cite is absent — a served cite the record holds and the document drops (§5.3, PR #484 round 1 finding 5)");
  const thesisBlock = (doc.split(/^## Thesis$/m)[1] || "").split(/^## /m)[0];
  if (!thesisBlock.includes(st2.adopted_thesis)) fails.push("(f) the Thesis section does not carry the adopted Thesis — thesis is filled at mint BY CONSTRUCTION (§5.3 v9)");
  if (/awaiting composition/.test(thesisBlock)) fails.push("(f) the Thesis section renders as an unfilled slot — the mint consumes the Thesis, it does not defer it");
  for (const h of ["Reader start", "Reader target", "Opening question",
                   "Sequence", "Strand coverage", "Unresolved obligations",
                   "Thesis closure", "Tradeoffs"]) {
    const re = new RegExp(`## ${h}\\n\\n\\*\\(awaiting composition\\)\\*`);
    if (!re.test(doc)) fails.push(`(f) downstream §5.1 field ${JSON.stringify(h)} is not present as a typed unfilled slot`);
  }
  if (!/CLOSED at mint/.test(doc)) fails.push("(f) the closed-set line is absent — the invariant binds from the mint");
  if (!doc.includes(record.pin)) fails.push("(f) the survey pin is absent from the document");
  const { strands } = resolveStrandIds(record, ["L2", "L1"]);
  if (composeBrief({ slug: st2.adopted_slug, pin: record.pin, strands, thesis: st2.adopted_thesis }) !== doc) {
    fails.push("(f) the command's document differs from the exported composer's — two producers");
  }

  // (g) UNKNOWN ID: refused naming BOTH sides, never a silent drop (v7,
  // unchanged at v9 — the re-sequencing moved the mint, not the refusals).
  const r6 = enter("L1,L99", rs("case-g"));
  if (r6.status === 0) fails.push("(g) an unknown display id was accepted");
  if (!/L99/.test(r6.stderr) || !/record holds: L1, L2, L3, L4, L5/.test(r6.stderr)) {
    fails.push(`(g) the refusal does not name both sides: ${JSON.stringify((r6.stderr || "").slice(0, 160))}`);
  }

  // (h) G-ID: refused BY NAME as a per-report-identity token.
  const r7 = enter("G1-1", rs("case-h"));
  if (r7.status === 0) fails.push("(h) a Group/SubGroup id was accepted");
  if (!/per-REPORT-IDENTITY/.test(r7.stderr) || !/L<n>/.test(r7.stderr)) {
    fails.push(`(h) the refusal does not name the token class and the right unit: ${JSON.stringify((r7.stderr || "").slice(0, 160))}`);
  }

  // (i) COLLISION: a creator, never an editor.
  const r8 = mint(s1);
  if (r8.status === 0) fails.push("(i) an existing slug was overwritten");
  if (!/already exists/.test(r8.stderr) || !/never\s+overwrites/.test(r8.stderr)) {
    fails.push(`(i) the refusal does not state the creator-never-editor rule: ${JSON.stringify((r8.stderr || "").slice(0, 160))}`);
  }
  const after = readFileSync(join(home, "brief.md"), "utf8");
  if (after !== doc) fails.push("(i) the collision refusal MUTATED the existing Brief");

  // (j) FREE-FORM THESIS: the owner's own words become the adopted Thesis
  // verbatim, and the derived slug follows THEM.
  const s3 = rs("case-j");
  enter("L4", s3);
  const owner = "Tests earn their keep by failing loudly";
  adopt(s3, owner);
  const st3 = JSON.parse(readFileSync(s3, "utf8"));
  if (st3.adopted_thesis !== owner) fails.push("(j) a free-form Thesis was not taken verbatim");
  if (st3.adopted_slug !== deriveSlugCandidate(owner)) fails.push("(j) the adopted name does not derive from the owner's own Thesis — v9 behaviour, unchanged at v11");
  if (st3.adopted_slug_via !== "derived-from-free-form-thesis") fails.push("(j) a free-form Thesis's name is not recorded as derived from it");
  // Exported helpers agree with the command path (same dual-producer guard
  // as (f)).
  // FED WHAT THE COMMAND ACTUALLY RESOLVED. Handing the exported composer an
  // empty map compared two different INPUTS, so the guard passed or failed on
  // whether the seam happened to answer during the run — non-determinism, not a
  // guard (PR #534 round 1). `strand_renderings` is the command's own record of
  // what it resolved, so this is one input through two producers.
  const usedHeads = new Map(Object.entries(st1.strand_renderings || {})
    .map(([slug, e]) => [slug, e]));
  const viaExport = composeThesisCandidates(resolveStrandIds(record, ["L2", "L1"]).strands, usedHeads);
  if (JSON.stringify(viaExport) !== JSON.stringify(st1.thesis_candidates)) {
    fails.push("(j) the command's thesis candidates differ from the exported composer's — two producers");
  }

  // (k) THE UNCITED JOURNEY RENDERS DIFFERENTLY FROM A CITED ONE (kogaki#507).
  // A Journey with a served cite and a Journey with none are different facts.
  // Rendering them on one line with only the value differing made an absence
  // indistinguishable from a presence to EVERY reader of the marker — the
  // defect kogaki#507 reports, whose fix belongs in this projection rather
  // than in each reader (consulted: product-lab@8906f207 LESSONS.md:57).
  // Driven through a DERIVED survey so the shared fixture other checks read
  // is untouched: L2's journey keeps its slug and loses its cite, which is
  // the state terrain tallies as an abnormality (`c.journey && !jg`).
  try {
    const derived = JSON.parse(JSON.stringify(record));
    const l2 = derived.candidates.find((c) => c.display_id === "L2");
    delete l2.journey.cite;
    const dsurvey = join(dir, "uncited-journey.json");
    writeFileSync(dsurvey, JSON.stringify(derived));
    const ds = rs("uncited");
    const e = spawnSync(process.execPath, ["brief/brief.mjs", "enter", "--survey", dsurvey, "--ids", "L2,L1", "--run-state", ds], { encoding: "utf8" });
    if (e.status !== 0) fails.push(`(k) enter over the derived survey exited ${e.status}: ${(e.stderr || "").trim()}`);
    // The override half of the one gate, driven end to end: this run adopts
    // the SAME listed Thesis as (f) and names the Brief differently in the
    // same answer, which is also what keeps the two runs from colliding.
    const a = spawnSync(process.execPath, ["brief/brief.mjs", "adopt", "--run-state", ds, "--thesis", "thesis-1", "--slug", "uncited-case"], { encoding: "utf8" });
    if (a.status !== 0) fails.push(`(k) adopt over the derived survey exited ${a.status}: ${(a.stderr || "").trim()}`);
    const st = JSON.parse(readFileSync(ds, "utf8"));
    const m = spawnSync(process.execPath, ["brief/brief.mjs", "mint", "--run-state", ds, "--briefs-dir", briefs], { encoding: "utf8" });
    if (m.status !== 0) fails.push(`(k) mint over the derived survey exited ${m.status}: ${(m.stderr || "").trim()}`);
    // GUARDED: (k) mints under the name the owner OVERRODE at the one gate,
    // so a broken override strands this case with no document. Report that
    // as (k)'s own finding rather than crashing the whole check — a crash
    // here would hide every case after it.
    const docPath = join(briefs, "uncited-case", "brief.md");
    if (!existsSync(docPath)) {
      fails.push("(k) no Brief was minted under the overriding name — the derived run has no document to assert against");
      throw new Error("__k_skipped__");
    }
    const doc = readFileSync(docPath, "utf8");

    // The absence is DISCLOSED — never silently dropped.
    if (!/PRESENT WITH NO SERVED CITE/.test(doc))
      fails.push("(k) a Journey with no served cite is not disclosed — the composition sitting is owed the abnormality, not silence");
    // …and it does NOT wear the cited marker, which is the whole repair.
    if (/^- journey cite:/m.test(doc))
      fails.push("(k) an uncited Journey still renders the `- journey cite:` marker — an absence rendered identically to a presence, which is the defect kogaki#507 names");
    // The reader is then correct WITHOUT a predicate of its own.
    if (JSON.stringify(journeyBearingStrands(doc)) !== "[]")
      fails.push(`(k) journeyBearingStrands counts an uncited Journey: ${JSON.stringify(journeyBearingStrands(doc))} — the projection fix must make the reader correct by construction`);
    // And §6.1's refusal now fires for it, which is what kogaki#507 was filed for.
    const bad = fillBrief(doc, { steps: [{
      step_id: "s1", materials: ["L2.journey"], purpose: "p",
      reader_state_before: "b", reader_state_after: "a", depends_on: [],
      rationale: "r", grounds: [{ type: "strand", strand: "L2", proposition: "x" }],
    }] });
    if (!bad.error || !/carries none/.test(bad.error))
      fails.push("(k) the §4.4 carries-none refusal still does not fire for an uncited Journey — the guard is absent in the case it is named for");
    if (st.adopted_slug !== "uncited-case") fails.push("(k) the derived run's overriding name did not reach the mint");
  } catch (e) {
    if (e.message !== "__k_skipped__") throw e;
  }

} finally {
  rmSync(dir, { recursive: true, force: true });
}

// (m) THE MINTED BRIEF CARRIES NO INTERNAL KEY AND NO SECTION REFERENCE
// (kogaki#526). `briefs/<slug>/brief.md` is a TRACKED document the owner reads
// directly. kogaki#520 removed spec-internal vocabulary from the gate payload
// and installed a tripwire there; that tripwire reads the payload and had no
// reach into the minted document, which is why #526 is its own carrier.
try {
  const strands = [
    { display_id: "L1", slug: "alpha-beta", cite: "gloss/ELEMENTS.jsonl:2@abc",
      journey: { slug: "alpha-beta", cite: "gloss/journeys/x.md:3@abc" } },
    // The second member's Journey carries NO cite, so the abnormal-disclosure
    // branch is composed too — it used to carry a section reference of its own.
    { display_id: "L2", slug: "gamma-delta", cite: "gloss/ELEMENTS.jsonl:3@abc",
      journey: { slug: "gamma-delta" } },
  ];
  const doc = composeBrief({ slug: "vocab-probe", pin: "survey@abc", thesis: "One claim the article makes.", strands });

  // EVERY LINE, not only the captions. #526's scope names the captions, but the
  // assertion it asks for is that no internal key or section reference appears
  // in a minted brief.md — and three lines OUTSIDE the captions carried one.
  doc.split("\n").forEach((line, i) => {
    const leak = findInternalVocabulary(line);
    if (leak) fails.push(`(m) the minted Brief leaks ${leak.kind} ${JSON.stringify(leak.token)} on line ${i + 1}: ${JSON.stringify(line.trim().slice(0, 70))}`);
  });

  // The captions come from ONE table, so a caption written here would be a
  // second vocabulary — which is the thing #526 forbids, not merely the keys.
  for (const [heading, caption] of SLOT_CAPTIONS) {
    if (!doc.includes(`## ${heading}`)) fails.push(`(m) the minted Brief has no ${JSON.stringify(heading)} slot`);
    if (!doc.includes(caption)) fails.push(`(m) the ${JSON.stringify(heading)} slot does not render the shared table's caption — a second vocabulary`);
  }

  // THE REACH IS THE COMPOSER'S OWN TEXT, AND NOT THE MATERIAL IT CARRIES
  // (§5.3 v15, kogaki#537). Round 1 of PR #536 found that the earlier full-line
  // reach refused the OWNER'S OWN adopted Thesis at mint, after the one gate
  // answer was spent — and §5.3 v11 takes a free-form Thesis verbatim, so that
  // path is live by design rather than hypothetical. Measured at the decision:
  // 0 of 160 served lesson headlines trip the predicate, so the served side was
  // never the live hazard; the owner side always was.
  //
  // BOTH DIRECTIONS ARE ASSERTED. A guard narrowed without asserting that it
  // still fires is a guard that has been removed.
  // ALL SIX EXEMPT POSITIONS, not one. Round 1 of PR #538 found the earlier
  // fixture exercised only the Thesis, so re-routing the pin, the Brief name, a
  // cite or a slug back through the guarded emitter left the suite GREEN — the
  // exempt set is an ENUMERATION and asserting one member asserts nothing about
  // the other five. Each position is poisoned with BOTH shapes at once and the
  // mint must succeed AND carry the value through unaltered.
  {
    const POISON_ID = "strand_coverage";
    const POISON_SEC = "§4.1";
    const poisoned = {
      slug: `owner_name-${POISON_SEC.replace(/\W/g, "")}`,
      pin: `survey_pin@abc ${POISON_SEC}`,
      thesis: `I want to lead with ${POISON_ID}, per ${POISON_SEC} of the spec.`,
      strands: [{
        display_id: "L1",
        slug: `alpha_beta ${POISON_SEC}`,
        cite: `gloss/x.md:1@abc ${POISON_ID} ${POISON_SEC}`,
        journey: { slug: "alpha_beta", cite: `gloss/j.md:2@abc ${POISON_ID} ${POISON_SEC}` },
      }],
    };
    let minted = null;
    try { minted = composeBrief(poisoned); }
    catch (e) {
      fails.push(`(m) a Brief whose OWNER and SUBSTRATE fields carry internal shapes was REFUSED at mint: ${e.message.slice(0, 120)} — a rule is enforced at the layer where it can be broken, and neither the owner nor the substrate is this codebase (kogaki#537)`);
    }
    if (minted) {
      // Each exempt value must appear VERBATIM: exempt means uninspected, not
      // rewritten. A guard that stripped instead of refusing would pass an
      // is-it-minted assertion on its own.
      for (const [what, value] of [
        ["the Brief name", poisoned.slug],
        ["the survey pin", poisoned.pin],
        ["the adopted Thesis", poisoned.thesis],
        ["the Strand slug", poisoned.strands[0].slug],
        ["the Strand cite", poisoned.strands[0].cite],
        ["the Journey cite", poisoned.strands[0].journey.cite],
      ]) {
        if (!minted.includes(value)) fails.push(`(m) ${what} did not reach the document verbatim — an exempt field is uninspected, never rewritten`);
      }
    }
  }

  // …AND THE COMPOSER'S OWN TEXT IS STILL GUARDED, refusing rather than
  // rewriting, which is the stance the gate's tripwire takes.
  {
    for (const [heading, caption] of SLOT_CAPTIONS) {
      const leak = findInternalVocabulary(caption);
      if (leak) fails.push(`(m) the shipped caption for ${JSON.stringify(heading)} carries ${leak.kind} ${JSON.stringify(leak.token)}`);
    }
    // DRIVEN THROUGH THE REAL COMPOSER by poisoning the shared caption table and
    // restoring it. An earlier draft of this block tested the predicate directly
    // and asserted nothing about the guard: deleting the guard outright left the
    // suite GREEN, which is a survivor that cannot fail — the third one this
    // check has carried, and the reason `fields()` now reads the table at use
    // rather than snapshotting it at module load.
    const original = SLOT_CAPTIONS.get("Thesis closure");
    SLOT_CAPTIONS.set("Thesis closure", "thesis_closure — explanation and established_by_steps.");
    let guardFired = false;
    try { composeBrief({ slug: "guard-probe", pin: "p@1", thesis: "A clean claim.", strands }); }
    catch (e) { guardFired = /composer-authored text/.test(e.message) && /thesis_closure/.test(e.message); }
    finally { SLOT_CAPTIONS.set("Thesis closure", original); }
    if (!guardFired) fails.push("(m) a key-bearing COMPOSER caption was MINTED — narrowing the reach to composer-authored text removed the guard instead of scoping it");
    // The restore rides `finally`, so an assertion that it happened could not
    // fail and is not written — PR #538 round 1's nit. What IS asserted is that
    // a later composition over the shipped table is clean, which fails if the
    // restore is ever removed.
    if (findInternalVocabulary(SLOT_CAPTIONS.get("Thesis closure"))) {
      fails.push("(m) the caption table is still poisoned — the restore did not hold, and every later case runs against it");
    }
  }
} catch (e) {
  fails.push(`(m) the vocabulary case threw outside its own assertions: ${e.message}`);
}

// Boundary 1 (Check/CI infrastructure) — both prescribed shards surveyed
// before this case was written. The two headlines that ground it:
//
//   "A rule written in a shared document only affects the projects whose
//   authors go and look it up. … The give-away that enforcement sits at the
//   wrong level is repetition."
//   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/claude-code-ops.md:29
//
//   "Write down each path and which passing run covers it; a path with no
//   named run is untested no matter how healthy the overall suite looks."
//   consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/testing.md:173
//
// The first is why this case exists rather than the skill's prose standing
// alone — the 2026-08-18 dogfood run is the specimen of a rule nobody looked
// up. The second is why the arc is a TABLE with a named mutation per row.
//
// (n) THE SKILL CONTRACT NAMES THE WHOLE ARC (§5.3 v19, kogaki#522).
// The rule "/brief completes the Brief" has exactly one carrier — the skill
// file — and a rule whose only carrier is prose is advisory. The 2026-08-18
// dogfood run is the specimen: the flow stopped at the mint, every composition
// field an unfilled slot, and nothing but the owner noticed. Terrain's skill is
// asserted the same way (checks/check-terrain-composition.sh).
{
  const SKILL = readFileSync(".claude/skills/brief/SKILL.md", "utf8");

  // Each stage names the runtime act that performs it, so a stage cannot be
  // satisfied by a passing mention in prose.
  // PATH COMPOSITION IS FIRST IN THE TABLE BECAUSE IT IS THE STAGE THE
  // SPECIMEN FAILED AT (PR #547 round 1). The 2026-08-18 dogfood run stopped
  // after the mint and never composed a path; a table that omitted step 7
  // would go green on the exact regression it exists to catch. It has no CLI
  // act of its own — the composer authors the Step records — so it is asserted
  // through the §4.1 fields it must produce, which prose about "composition"
  // does not contain.
  const ARC = [
    ["path composition", /Compose 2.3 Reader Paths/],
    ["the §4.1 Step record composition must author", /depends_on[\s\S]{0,80}rationale|rationale[\s\S]{0,80}depends_on/],
    ["entry", /brief\.mjs enter /],
    // ANCHORED, not an alternation: `a|b` binds looser than the surrounding
    // context, so the earlier two-branch form reduced to a bare
    // `brief-thesis-adoption` and any prose mention satisfied it (round 1).
    ["thesis gate", /gates\/registry\.json:\s*\n?\s*brief-thesis-adoption/],
    ["adopt", /brief\.mjs adopt /],
    ["mint", /brief\.mjs mint /],
    ["path review", /review\.mjs attach /],
    ["assembly", /assemble\.mjs assemble /],
    ["adoption", /assemble\.mjs adopt-candidate /],
  ];
  for (const [stage, re] of ARC) {
    if (!re.test(SKILL)) fails.push(`(n) the skill does not drive the ${stage} stage — the arc §5.3 v19 requires ends before the Brief is filled`);
  }

  // The abolished default stop. The old text ended the flow at the mint with
  // "Hand over the artifact and stop"; that exact shape must not return.
  if (/\*\*Hand over the artifact\*\* and stop/.test(SKILL)) {
    fails.push("(n) the skill still ends at the mint — the default mid-workflow stop §5.3 v19 abolished");
  }
  if (!/ENDS AT A FILLED BRIEF/.test(SKILL)) {
    fails.push("(n) the skill does not state that the invocation ends at a FILLED Brief — the rule has no carrier");
  }
  // A stop is legitimate only NAMED, on an inspection-need. The skill must
  // record which it is: this flow has none, and saying so is what stops the
  // finding being re-derived every sitting.
  if (!/inspection-need/.test(SKILL)) {
    fails.push("(n) the skill does not name the inspection-need rule — the only legitimate mid-workflow stop is unstated, so any stop reads as licensed");
  }

  // The pre-mint bound. v11's "exactly one owner question" is TRUE of the
  // pre-mint segment and FALSE of the arc — the completed flow raises two
  // gates. An unqualified claim here would forbid §6's selection gate.
  if (/\*\*the only owner\s*\n?\s*question in this flow\*\*/.test(SKILL)) {
    fails.push("(n) the skill claims the thesis gate is the only owner question IN THIS FLOW — false once the arc runs through §6's selection gate");
  }
  if (!/ONE OWNER QUESTION BEFORE THE MINT/.test(SKILL)) {
    fails.push("(n) the skill dropped v11's pre-mint bound — kogaki#518's ruling has no carrier");
  }
}

if (fails.length) {
  console.log("FAIL brief entry point (SPEC-draft-pipeline §5.3 v11 and §5.1.3 v20, stories 1.71/1.72/1.76/1.78 + kogaki#567/#572):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief entry: 15/15 cases — (a) entry writes NOTHING under briefs/ (pre-Thesis "
  + "state is machine-local, §5.3 v9); (b) 2-3 Thesis candidates composed from the settled "
  + "set only, each carrying its round-trip concession AS PROSE \u2014 no field label opens either "
  + "half the owner reads, no doubled period, and no supporting member spliced into the lead "
  + "(\u00a75.1.3 v20, kogaki#566); (c) the ask carries its gate declaration "
  + "with the premise's negation first-class, routing back through Terrain; "
  + "(d) THE ONE GATE CARRIES THE (THESIS, SLUG) PAIR AND THE SECOND ASK IS GONE, NOT SKIPPED "
  + "(kogaki#518, §5.3 v11): every candidate carries a slug DERIVED FROM ITS OWN Thesis through the "
  + "one exported derivation, each option renders that slug as its own labelled element of the option "
  + "BODY (separately RENDERED) as the BARE name with no `briefs/` path on any option surface, the "
  + "owner's `--slug` override in the SAME one answer becomes the adopted name while the listed Thesis "
  + "and the option itself are kept and a malformed override refuses (separately DECLINABLE), and the "
  + "retired ask is ABSENT — no slug_gate or slug_candidate in the run state, no such live path in "
  + "brief/brief.mjs, no brief-slug-approval row in gates/registry.json, and brief-thesis-adoption's "
  + "dynamic_options declaring the pair with both of its conditions; "
  + "(e) the gate blocks — mint refuses without an adopted Thesis, and INVENTS NO NAME for a run whose "
  + "adopted pair carries none, leaving briefs/ empty; (f) the mint fills thesis BY CONSTRUCTION and "
  + "every downstream §5.1 "
  + "field is a typed unfilled slot, with the command path byte-equal to the exported "
  + "composer; (g) an unknown id refuses naming both sides; (h) a G-id refuses by name "
  + "pointing at L<n>; (i) a slug collision refuses without mutating the existing Brief; "
  + "(j) a free-form Thesis is taken verbatim and its name derives from the owner's own words "
  + "(v9 behaviour, unchanged at v11); (k) A JOURNEY WITH NO "
  + "SERVED CITE RENDERS DIFFERENTLY FROM A CITED ONE (kogaki#507), driven end to end through a "
  + "DERIVED survey so the shared fixture is untouched — and now through the OVERRIDE half of the one "
  + "gate, which is what gives it a distinct home: the absence is DISCLOSED rather than "
  + "dropped, it does NOT wear the `- journey cite:` marker, journeyBearingStrands is then correct "
  + "WITH NO PREDICATE OF ITS OWN, and \u00a74.4's carries-none refusal fires for it \u2014 the case "
  + "kogaki#507 was filed for. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.71 + PR #484 round 1 + story 1.72 + kogaki#507 + story 1.76 + kogaki#522 + kogaki#566 + kogaki#567 + kogaki#572)"
  + ": THIRTY-TWO "
  + "mutations, COUNTED rather than incremented. The figure was re-derived by reading the "
  + "enumeration below, and doing so found the previous one wrong INDEPENDENTLY of this head: the "
  + "groups sum to 5 + 6 + 5 + 3 + 2 = TWENTY-ONE and the header read TWENTY, an undercount an "
  + "increment would have carried forward. That is the drift kogaki#559 recorded at "
  + "check-brief-compose, arriving here by the same act, so what changes is the maintenance mode "
  + "and not only the number. "
  + "kogaki#572's two, both against properties that held FOR FREE until a fix broke them: rewording a "
  + "claim instead of extending it fails (b3)'s containment assertion \u2014 the mint records `claim` and the "
  + "owner reads `thesis`, so the strip is honest only while the recorded text is CONTAINED in the rendered "
  + "text \u2014 and deriving the name from the whole claim rather than its served sentence fails (b3)'s "
  + "name-purity assertion. A THIRD SURVIVOR IS RECORDED WITH THEM, because this suite has now caught the "
  + "same class three times and the pattern is the finding rather than the instance: BOTH assertions were "
  + "first written in (b) and (b2), over MULTI-member sets, where every claim is a single served sentence \u2014 "
  + "so containment holds by construction and the derivation stops inside the served text however it is "
  + "written. Neither could fail there. They are sited in (b3), the one-member case both defects lived in, "
  + "and the name assertion injects a SHORT served sentence rather than borrowing the fixture's long one, "
  + "because kogaki#572's own report says the defect \u0022fires only under a short headline\u0022. An assertion "
  + "is only as good as the inputs of the case it sits in, and the case is chosen for convenience while the "
  + "assertion is written for the defect. "
  + "kogaki#567's three, all against the name's MOVE to the option label: folding the name into the "
  + "Thesis prose with no marked-off element fails (d)'s separately-RENDERED assertion at its new site; "
  + "labelling a name the candidate does not carry fails (d)'s pairing assertion, which is what stops the "
  + "owner adopting a name the run never had; and leaving the retired body entry beside the label fails "
  + "(d)'s renders-ONCE assertion \u2014 an assertion the body-sited form never needed and the one a "
  + "half-finished move would otherwise leave uncaught. RETIRED WITH THEIR SITE, stated because a dropped "
  + "assertion and an invented one read identically: (d)'s body-element assertion and its label-presence "
  + "sibling are gone because the element they read is gone. \u00a75.3 v11 declared that site a TRY-ONE-FIRST "
  + "instruction carrying its own release condition, the condition fired in use, and the property is "
  + "asserted unchanged at the site that now carries it. "
  + "kogaki#566's SIX \u2014 four at the first head and two more from PR #571 round 1, which found a "
  + "regression the first four could not see: with one settled member both options carried the same "
  + "`claim`, so the mint recorded the same string whichever the owner adopted and the choice survived "
  + "only as a routing token. Collapsing the one-member claims again fails (b3)'s adopt-differently "
  + "assertion, and restoring the silent `claim || thesis` fallback fails (b4)'s claimless refusal AND "
  + "its run-state assertion \u2014 that second case exists because the fallback was reachable only on a "
  + "run state this file does not write, and a refusal nothing drives reads the same as one never wired "
  + "up. A SECOND SURVIVOR was retired with them: (b2)'s doubled-period clause also tested the "
  + "concession, which is a composer literal interpolating a member count \u2014 no served text, no "
  + "terminal period, nothing it could catch. The four at the first head, all against \u00a75.1.3's prose surface: restoring the `Concedes:` label on a "
  + "concession failed (b)'s and (b2)'s no-field-label assertions; appending a period "
  + "unconditionally \u2014 dropping the composer's trim \u2014 failed (b2)'s doubled-period assertion; "
  + "re-introducing the supporting-member splice failed (b2)'s one-headline assertions in both "
  + "forms; and making adopt record the framed `thesis` instead of the `claim` failed (d)'s CLAIM "
  + "assertion AND its framing-survived assertion, which is the direct evidence that the mint's "
  + "strip is asserted in BOTH directions rather than by an equality a renamed field would satisfy. "
  + "A SURVIVOR IS RECORDED BESIDE THEM, because it is the finding rather than an embarrassment: "
  + "the doubled-period assertion was FIRST WRITTEN IN (b) and survived its mutation there, since "
  + "(b) reads the run state `enter` wrote and this check's seam-free path leaves every rendering "
  + "UNRESOLVED \u2014 so those candidates carry terrain's marker and can never carry a served sentence "
  + "to double a period on. It was moved to (b2), which injects served text, and fails there. "
  + "RETIRED BY THIS HEAD, stated because a dropped case and an invented one read identically: "
  + "(b2)'s duplicate-headline case no longer asserts that the segment after an em dash carries the "
  + "shared headline. That property discriminated position-filtering from text-filtering in `rest`, "
  + "and \u00a75.1.3 removes `rest` itself \u2014 no splice, no filter, no reachable defect \u2014 so it is a "
  + "retired-subject orphan whose catch record can never matter (product-lab@541e5958 "
  + "topics/claude-code-ops.md:81), the one population that rule permits deleting. The CASE is kept "
  + "and re-pointed at the unproducibility instead. "
  + "kogaki#522's five, all against \u00a75.3 v17's completed arc and case (n): "
  + "restoring the stop-at-mint ending failed (n)'s abolished-default-stop assertion; deleting the "
  + "adoption stage failed (n)'s arc row for it; re-widening the pre-mint bound to \"in this flow\" "
  + "failed (n)'s pre-mint-bound assertion; dropping the inspection-need rule failed (n)'s "
  + "named-stop assertion; and DELETING STEP 7 failed (n)'s path-composition row \u2014 the fifth "
  + "was added at PR #547 round 1, which found the first four spanned every stage EXCEPT the one "
  + "the specimen actually failed at. "
  + "Then the earlier "
  + "mutations, each run once and restored surgically — story 1.76's six, all against §5.3 v11's "
  + "paired gate: dropping each option's slug element failed (d)'s separately-RENDERED assertion; "
  + "putting the `briefs/<slug>` path into that element failed (d)'s bare-name assertion; leaving the "
  + "candidates unpaired failed (d)'s per-candidate slug assertion; making adopt ignore `--slug` failed "
  + "(d)'s separately-DECLINABLE assertion AND stranded (k), which is the direct evidence that the "
  + "override is load-bearing rather than decorative; making mint derive a name when the adopted pair "
  + "carries none failed (e)'s invents-no-name assertion; re-emitting a slug_gate from adopt failed "
  + "(d)'s retired-ask assertions at BOTH the run state and the runtime source, which is the evidence "
  + "that the ask is unproducible rather than merely unraised. "
  + "RETIRED BY THIS HEAD, stated because a dropped mutation and an invented one read identically: "
  + "story 1.72's \"deriving the slug at enter failed (d)'s none-before-adoption\" is no longer "
  + "re-runnable — deriving the slug at enter IS the v11 contract, so the mutation names the current "
  + "behaviour. It is removed rather than reworded. "
  + "Story 1.72's remaining five: minting the home "
  + "at enter failed (a); composing a candidate from a hardcoded foreign phrase failed (b)'s "
  + "set-only assertion; dropping the negates_premise option failed (c); "
  + "removing mint's adopted-thesis guard failed (e); "
  + "rendering Thesis as a slot failed (f)'s filled-by-construction; plus story 1.71's three "
  + "refusal-path mutations (missing-id filter emptied, G-id filter emptied, collision guard "
  + "disabled) failing (g)-(i); plus kogaki#507's two: rendering the CITED marker for an uncited "
  + "Journey \u2014 the pre-fix behaviour \u2014 failed (k)'s marker assertion AND its reader "
  + "assertion, which is the direct evidence that the PROJECTION is what makes the reader correct "
  + "rather than a predicate added to the reader; and dropping the disclosure entirely failed (k)'s "
  + "disclosure assertion, so the absence cannot be repaired by silence. "
  + "NOT COVERED, stated rather than implied: the skill's ask "
  + "conduct — that AskUserQuestion is actually raised and blocked on, and that the option body the "
  + "owner sees is the payload's rendering — is a relay property no check can run (the same standing "
  + "SPEC-terrain §14.4's prohibitions have); the check "
  + "drives the runtime's refusals, which make an unanswered gate UNMINTABLE rather than "
  + "merely prohibited.");
JS
