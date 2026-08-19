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
    if (!/Concedes:/.test(c.concession || "")) fails.push(`(b) candidate ${c.id} carries no round-trip concession (SPEC-style-contract §4)`);
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
    // TWO MEMBERS MAY SHARE A HEADLINE, and then `rest` must still hold the
    // other one. Filtering `names` for inequality against the lead's TEXT drops
    // every member sharing that text, so a duplicate headline emptied the
    // supporting list and made the options collapse. Real rather than
    // hypothetical: a served first sentence is prose, and nothing makes two
    // Lessons' first sentences distinct. Index-filtering is what holds here, and
    // this case is what makes that choice falsifiable rather than defensive.
    {
      const dup = "Both members say the same first sentence.";
      const dupHeads = new Map([...heads.keys()].map((k) => [k, { headline: dup, cite: "x:1@d" }]));
      const cd = composeThesisCandidates(strandsB2, dupHeads);
      if (cd.some((c) => !/—/.test(c.thesis || ""))) {
        fails.push("(b2) with a shared headline a candidate lists no supporting members — `rest` was filtered by text, not by position");
      }
      for (const c of cd) {
        const seg = (c.thesis || "").split("—")[1] || "";
        if (!seg.includes(dup)) {
          fails.push(`(b2) candidate ${c.id} dropped the member sharing the lead's headline — filtered by text, not by position`);
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
    widened.set(outsider.slug, { headline: OUTSIDE, cite: "gloss/lessons/testing.md:1@deadbeef" });
    for (const c of composeThesisCandidates(strandsB2, widened)) {
      if ((c.thesis || "").includes(OUTSIDE)) {
        fails.push(`(b2) candidate ${c.id} carries a rendering for ${outsider.display_id}, which is OUTSIDE the settled set — never widened (§3)`);
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
    if (c.slug !== deriveSlugCandidate(c.thesis)) fails.push(`(d) candidate ${c.id}'s slug is not what deriveSlugCandidate makes of ITS OWN Thesis — two derivations`);
    const words = new Set(c.thesis.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/));
    for (const w of c.slug.split("-")) if (![...words].some((t) => t === w || t.includes(w))) fails.push(`(d) candidate ${c.id}'s slug word "${w}" does not derive from its own Thesis`);
    // AC2: SEPARATELY RENDERED — its own visible element of the option BODY.
    const opt = gateOpts.find((o) => o.id === c.id);
    if (!opt) { fails.push(`(d) candidate ${c.id} has no option in the gate payload`); continue; }
    const item = (opt.rendering || []).find((r) => r.text === c.slug);
    if (!item) fails.push(`(d) option ${c.id} does not render its slug as its own element of the option body — a second decision class riding invisibly inside the first is what §5.3 v11's served constraint forbids`);
    else if (!String(item.label || "").trim()) fails.push(`(d) option ${c.id}'s slug element carries no label of its own`);
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
  if (st2.adopted_thesis !== (st1.thesis_candidates || [])[0]?.thesis) fails.push("(d) adopting thesis-1 did not record that candidate's text");
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
  if (stOv.adopted_thesis !== stOv0.thesis_candidates[0].thesis) fails.push("(d) overriding the slug cost the owner the listed Thesis — declining one half must not abandon the option");
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

  // AND THE COMPOSER REFUSES rather than rewriting, the same stance the gate's
  // tripwire takes: a rewrite layer would let the leak keep being written.
  let refused = false;
  try { composeBrief({ slug: "leaky", pin: "p@1", thesis: "See §4.1 for the step shape.", strands }); }
  catch (e) { refused = /leaks spec-internal vocabulary/.test(e.message) && /line \d+/.test(e.message); }
  if (!refused) fails.push("(m) a Thesis carrying a section reference was MINTED — the composer rewrote or ignored it instead of refusing");

  let refusedKey = false;
  try { composeBrief({ slug: "leaky2", pin: "p@1", thesis: "The reader_start is stated.", strands }); }
  catch (e) { refusedKey = /an internal identifier/.test(e.message); }
  if (!refusedKey) fails.push("(m) a Thesis carrying an internal key was MINTED — the predicate reads section references only");
} catch (e) {
  fails.push(`(m) the vocabulary case threw outside its own assertions: ${e.message}`);
}

if (fails.length) {
  console.log("FAIL brief entry point (SPEC-draft-pipeline §5.3 v11, stories 1.71/1.72/1.76):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief entry: 11/11 cases — (a) entry writes NOTHING under briefs/ (pre-Thesis "
  + "state is machine-local, §5.3 v9); (b) 2-3 Thesis candidates composed from the settled "
  + "set only, each with its round-trip concession; (c) the ask carries its gate declaration "
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
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.71 + PR #484 round 1 + story 1.72 + kogaki#507 + story 1.76)"
  + ": SIXTEEN "
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
