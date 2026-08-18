#!/usr/bin/env bash
# check-brief-entry — the Brief entry point's contract properties
# (SPEC-draft-pipeline §5.3; v7 kogaki#482 story 1.71; re-sequenced v9
# kogaki#494, story 1.72: entry → thesis-determination gate → mint).
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
const adopt = (state, thesis) => run(["adopt", "--run-state", state, "--thesis", thesis]);
const mint = (state, slug) => slug === undefined
  ? run(["mint", "--run-state", state, "--briefs-dir", briefs])
  : run(["mint", "--run-state", state, "--slug", slug, "--briefs-dir", briefs]);
const briefsEmpty = () => !existsSync(briefs) || readdirSync(briefs).length === 0;
// The strand phrases the fixture's set can contribute — the vocabulary a
// composed candidate may draw content from (plus plain-register frame words).
const setPhrases = (ids) => ids.map((id) =>
  record.candidates.find((c) => c.display_id === id).slug.replace(/-/g, " "));

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
  const inSet = setPhrases(["L1", "L2"]);
  const foreign = setPhrases(["L3", "L4", "L5"]);
  for (const c of cands) {
    if (!inSet.some((p) => (c.thesis || "").includes(p))) fails.push(`(b) candidate ${c.id} references no settled member — not composed FROM the set`);
    for (const f of foreign) if ((c.thesis || "").includes(f)) fails.push(`(b) candidate ${c.id} references "${f}", which is outside the settled set — never widened, never invented (§3)`);
    if (!/Concedes:/.test(c.concession || "")) fails.push(`(b) candidate ${c.id} carries no round-trip concession (SPEC-style-contract §4)`);
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

  // (d) NO SLUG CANDIDATE EXISTS BEFORE ADOPTION; adoption derives exactly
  // ONE, from the adopted Thesis (AC4).
  if ("slug_candidate" in st1) fails.push("(d) a slug candidate exists before Thesis adoption");
  const r2 = adopt(s1, "thesis-1");
  if (r2.status !== 0) fails.push(`(d) adopt exited ${r2.status}: ${(r2.stderr || "").trim()}`);
  const st2 = JSON.parse(readFileSync(s1, "utf8"));
  if (typeof st2.slug_candidate !== "string" || !st2.slug_candidate) fails.push("(d) adoption derived no slug candidate");
  else {
    const thesisWords = new Set(st2.adopted_thesis.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/));
    for (const w of st2.slug_candidate.split("-")) if (![...thesisWords].some((t) => t === w || t.includes(w))) fails.push(`(d) slug word "${w}" does not derive from the adopted Thesis`);
    const sg = st2.slug_gate || {};
    const approves = (sg.options || []).filter((o) => !o.negates_premise);
    if (approves.length !== 1) fails.push(`(d) ${approves.length} slug candidate option(s) — exactly one is presented for approval`);
    if (!(sg.options || []).some((o) => o.negates_premise === true)) fails.push("(d) the slug ask carries no negates_premise option");
    if (sg.free_text?.accepted !== true) fails.push("(d) the slug ask's free-form override is missing");
  }
  if (st2.adopted_thesis !== (st1.thesis_candidates || [])[0]?.thesis) fails.push("(d) adopting thesis-1 did not record that candidate's text");

  // (e) THE GATE BLOCKS (AC6): mint before adoption refuses and writes
  // nothing; mint without an approved slug refuses and writes nothing.
  const s2 = rs("case-e");
  enter("L3", s2);
  const r3 = mint(s2, "anything");
  if (r3.status === 0) fails.push("(e) mint ran with NO adopted Thesis");
  if (!/no Thesis has been adopted/.test(r3.stderr || "")) fails.push(`(e) the pre-adoption refusal does not name the blocked gate: ${JSON.stringify((r3.stderr || "").slice(0, 120))}`);
  const r4 = mint(s1); // adopted, but no owner answer at the slug ask
  if (r4.status === 0) fails.push("(e) mint ran with no approved slug — the ask was never answered");
  if (!briefsEmpty()) fails.push("(e) a blocked gate left something under briefs/");

  // (f) THE MINT (AC5): thesis FILLED at mint by construction — the adopted
  // text, never a slot — and every DOWNSTREAM §5.1 field a typed unfilled
  // slot; definition, pin, cites and closed-set line retained from v7; the
  // command path byte-equal to the exported composer.
  const r5 = mint(s1, st2.slug_candidate);
  if (r5.status !== 0) fails.push(`(f) mint exited ${r5.status}: ${(r5.stderr || "").trim()}`);
  const home = join(briefs, st2.slug_candidate);
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
  if (composeBrief({ slug: st2.slug_candidate, pin: record.pin, strands, thesis: st2.adopted_thesis }) !== doc) {
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
  const r8 = mint(s1, st2.slug_candidate);
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
  if (st3.slug_candidate !== deriveSlugCandidate(owner)) fails.push("(j) the slug candidate does not derive from the owner's Thesis");
  // Exported helpers agree with the command path (same dual-producer guard
  // as (f)).
  const viaExport = composeThesisCandidates(resolveStrandIds(record, ["L2", "L1"]).strands);
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
  {
    const derived = JSON.parse(JSON.stringify(record));
    const l2 = derived.candidates.find((c) => c.display_id === "L2");
    delete l2.journey.cite;
    const dsurvey = join(dir, "uncited-journey.json");
    writeFileSync(dsurvey, JSON.stringify(derived));
    const ds = rs("uncited");
    const e = spawnSync(process.execPath, ["brief/brief.mjs", "enter", "--survey", dsurvey, "--ids", "L2,L1", "--run-state", ds], { encoding: "utf8" });
    if (e.status !== 0) fails.push(`(k) enter over the derived survey exited ${e.status}: ${(e.stderr || "").trim()}`);
    const a = spawnSync(process.execPath, ["brief/brief.mjs", "adopt", "--run-state", ds, "--thesis", "thesis-1"], { encoding: "utf8" });
    if (a.status !== 0) fails.push(`(k) adopt over the derived survey exited ${a.status}: ${(a.stderr || "").trim()}`);
    const st = JSON.parse(readFileSync(ds, "utf8"));
    const m = spawnSync(process.execPath, ["brief/brief.mjs", "mint", "--run-state", ds, "--slug", "uncited-case", "--briefs-dir", briefs], { encoding: "utf8" });
    if (m.status !== 0) fails.push(`(k) mint over the derived survey exited ${m.status}: ${(m.stderr || "").trim()}`);
    const doc = readFileSync(join(briefs, "uncited-case", "brief.md"), "utf8");

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
    if (st.slug_candidate === undefined) fails.push("(k) the derived run produced no slug candidate");
  }

} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL brief entry point (SPEC-draft-pipeline §5.3 v9, stories 1.71/1.72):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief entry: 11/11 cases — (a) entry writes NOTHING under briefs/ (pre-Thesis "
  + "state is machine-local, §5.3 v9); (b) 2-3 Thesis candidates composed from the settled "
  + "set only, each with its round-trip concession; (c) the ask carries its gate declaration "
  + "with the premise's negation first-class, routing back through Terrain; (d) no slug "
  + "candidate before adoption, exactly one thesis-derived candidate after; (e) the gate "
  + "blocks — mint refuses without an adopted Thesis and without an approved slug, leaving "
  + "briefs/ empty; (f) the mint fills thesis BY CONSTRUCTION and every downstream §5.1 "
  + "field is a typed unfilled slot, with the command path byte-equal to the exported "
  + "composer; (g) an unknown id refuses naming both sides; (h) a G-id refuses by name "
  + "pointing at L<n>; (i) a slug collision refuses without mutating the existing Brief; "
  + "(j) a free-form Thesis is taken verbatim and the slug follows it; (k) A JOURNEY WITH NO "
  + "SERVED CITE RENDERS DIFFERENTLY FROM A CITED ONE (kogaki#507), driven end to end through a "
  + "DERIVED survey so the shared fixture is untouched: the absence is DISCLOSED rather than "
  + "dropped, it does NOT wear the `- journey cite:` marker, journeyBearingStrands is then correct "
  + "WITH NO PREDICATE OF ITS OWN, and \u00a74.4's carries-none refusal fires for it \u2014 the case "
  + "kogaki#507 was filed for. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.71 + PR #484 round 1 + story 1.72 + kogaki#507)"
  + ": ELEVEN "
  + "mutations, each run once and restored surgically — story 1.72's six: minting the home "
  + "at enter failed (a); composing a candidate from a hardcoded foreign phrase failed (b)'s "
  + "set-only assertion; dropping the negates_premise option failed (c); deriving the slug at "
  + "enter failed (d)'s none-before-adoption; removing mint's adopted-thesis guard failed (e); "
  + "rendering Thesis as a slot failed (f)'s filled-by-construction; plus story 1.71's three "
  + "refusal-path mutations (missing-id filter emptied, G-id filter emptied, collision guard "
  + "disabled) failing (g)-(i); plus kogaki#507's two: rendering the CITED marker for an uncited "
  + "Journey \u2014 the pre-fix behaviour \u2014 failed (k)'s marker assertion AND its reader "
  + "assertion, which is the direct evidence that the PROJECTION is what makes the reader correct "
  + "rather than a predicate added to the reader; and dropping the disclosure entirely failed (k)'s "
  + "disclosure assertion, so the absence cannot be repaired by silence. "
  + "NOT COVERED, stated rather than implied: the skill's ask "
  + "conduct — that AskUserQuestion is actually raised and blocked on — is a relay property "
  + "no check can run (the same standing SPEC-terrain §14.4's prohibitions have); the check "
  + "drives the runtime's refusals, which make an unanswered gate UNMINTABLE rather than "
  + "merely prohibited.");
JS
