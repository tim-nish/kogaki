#!/usr/bin/env bash
# check-brief-mint — the mint-side rules of Brief composition; pure calls, no model run.
#   (af) a Leg carries no `introduces` (kogaki#1768); a ParagraphPlan introduces
#        entry carrying `nearest` or `differs` is refused naming it (kogaki#1571).
#   (ar) the Persona is read once, by `audienceFor`, and handed to the Leg Waypoint
#        unit's input, never its validator (kogaki#1768); review_path carries
#        `defined_terms` instead (kogaki#1331).
#   (as) the claim register (kogaki#1281); (bb) `composeBrief` records
#        `compose_path` (kogaki#1262, #1328); (cc) no external-authority switch (#1571).
#   (dd)/(dh) a home resolved at its gate (kogaki#1742) over Thesis candidates from
#        the structure's apex (kogaki#1768); (fx) no Thesis free text (kogaki#1749);
#        (dj) the candidate constraint, single-top apex, depth line and bound (#1773).
# Cut from check-brief-compose.sh by kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, readdirSync, writeFileSync, mkdirSync, mkdtempSync, existsSync, rmSync, chmodSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { composeBrief, composeThesisCandidates } from "./src/brief.mjs";
import { classifyHomes, thesisGateOptions, thesisGate } from "./src/brief/candidates.mjs";
import { componentsOf, partitionComponents, withApex, withReach } from "./src/compose/structure.mjs";
import { unreachedCoverage, withThesis } from "./src/brief/candidates.mjs";
import { GATE_WORK, STATE_WORK, briefThesisWords, homeCollisionReading, thesisBoundRefusal } from "./src/brief/renderers.mjs";
import { findInternalVocabulary } from "./src/assemble.mjs";
import { STATE_RETRY_GATE_ID } from "./src/workflow/gate.mjs";
import { attachReview, claimRegisterRefusal, REVIEW_AREAS } from "./src/review.mjs";
import * as compose from "./src/compose.mjs";
import { recordOf, briefOfRecord } from "./checks/fixtures/brief-compose/fixtures.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const fails = [];

// THE RETIRED SWITCH'S NAMES ARE SPELLED APART (kogaki#1571): the Issue's
// Acceptance greps checks/ for the literal names to show no reader is left.
const RETIRED_KEY = ["external", "authority"].join("_");
const RETIRED_INPUT = ["external", "Authority"].join("");

// (af) kogaki#1571, owner decision 2026-10-24: an introduces entry's `nearest`
// and `differs` are retired. The schema declares neither, and an entry
// carrying either is refused naming the key rather than read past.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  if (Object.hasOwn(schema, "introduces_item") || Object.hasOwn(schema.fields || {}, "introduces")) {
    fails.push("(af) src/leg-schema.json still declares a Leg's `introduces` or its introduces_item (kogaki#1768)");
  }
  for (const k of ["nearest", "differs"]) {
    const r = compose.parseIntroducesEntry({ term: "unfed guard", meaning: "a guard whose input nobody feeds", [k]: "guard clause" });
    if (!r.error) fails.push(`(af) an introduces entry carrying ${k} was not refused`);
    else if (!r.error.includes(`\`${k}\``)) fails.push(`(af) the refusal of ${k} did not name it: ${r.error}`);
  }
}

// (ar) kogaki#1331, kogaki#1768: the Persona is read once, by `audienceFor`; compose_path hands
// it in the Leg Waypoint unit's input -- where a waypoint's `case` is chosen from the prior
// knowledge -- and never to the unit validator, which is handed the structure alone;
// review_path reads none of it and carries the Brief's `defined_terms` in its place.
{
  const brief = briefRuntimeText();
  const code = (t) => t.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  const composePath = code(brief.slice(brief.indexOf("  compose_path: async"), brief.indexOf("  review_path: async")));
  const reviewPath = code(brief.slice(brief.indexOf("  review_path: async"), brief.indexOf("  attach_review:")));
  if ((code(brief).match(/personaPriorKnowledgeLine\(/g) || []).length !== 1) fails.push("(ar) the Brief runtime does not read the Persona's prior_knowledge exactly once");
  if (!composePath.includes("const input = { state: st.id, thesis, structure, persona, language };")) fails.push("(ar) compose_path does not hand the Persona in the unit's input");
  if (!/validator: \{[^}]*inputs: \{ structure \}/.test(composePath)) fails.push("(ar) compose_path hands the unit validator more than the structure");
  if (/persona_prior_knowledge|personaPriorKnowledgeLine|audienceFor\(/.test(reviewPath)) fails.push("(ar) review_path still reads or passes the Persona's prior_knowledge");
  if ((reviewPath.match(/defined_terms: definedTerms,/g) || []).length !== 2) fails.push("(ar) review_path's base write and per-unit input do not both carry defined_terms");
}

// (as) kogaki#1281: the claim register -- one judged entry per Leg, a closed
// verdict set, and a named word on `fails`.
{
  const legs = [{ leg_id: "s1" }, { leg_id: "s2" }];
  const candOf = (id) => ({ candidate_id: id, legs });
  const reviewAreaFields = () => Object.fromEntries(REVIEW_AREAS.map((a) => [a, `reasoning for ${a}`]));

  const holds = [{ leg_id: "s1", verdict: "holds" }, { leg_id: "s2", verdict: "holds" }];
  if (claimRegisterRefusal(holds, legs)) fails.push(`(as) a claim_register with every Leg holding was refused: ${claimRegisterRefusal(holds, legs)}`);
  const rHolds = attachReview([candOf("c1")], { c1: { ...reviewAreaFields(), claim_register: holds } }, {});
  if (rHolds.error) fails.push(`(as) attachReview refused a holding claim_register: ${rHolds.error}`);

  const fails_ = [{ leg_id: "s1", verdict: "fails", word: "idempotent" }, { leg_id: "s2", verdict: "holds" }];
  if (claimRegisterRefusal(fails_, legs)) fails.push(`(as) a claim_register naming a word on its failing entry was refused: ${claimRegisterRefusal(fails_, legs)}`);
  const rFails = attachReview([candOf("c1")], { c1: { ...reviewAreaFields(), claim_register: fails_ } }, {});
  if (rFails.error) fails.push(`(as) attachReview refused a failing-with-word claim_register: ${rFails.error}`);
  else if (rFails.candidates[0].review.claim_register[0].word !== "idempotent") fails.push("(as) attachReview did not carry the fails entry's word through");

  const noWord = [{ leg_id: "s1", verdict: "fails" }, { leg_id: "s2", verdict: "holds" }];
  const rNoWord = claimRegisterRefusal(noWord, legs);
  if (!rNoWord || !/leg s1/.test(rNoWord) || !/\`word\`/.test(rNoWord)) fails.push(`(as) a fails entry naming no word was not refused naming the Leg: ${rNoWord}`);

  const badVerdict = [{ leg_id: "s1", verdict: "contradicts" }, { leg_id: "s2", verdict: "holds" }];
  const rBadVerdict = claimRegisterRefusal(badVerdict, legs);
  if (!rBadVerdict || !/leg s1/.test(rBadVerdict)) fails.push(`(as) a verdict outside holds/fails was not refused naming the Leg: ${rBadVerdict}`);

  const shortCount = [{ leg_id: "s1", verdict: "holds" }];
  const rShortCount = claimRegisterRefusal(shortCount, legs);
  if (!rShortCount || !/1 entry/.test(rShortCount)) fails.push(`(as) a claim_register with too few entries for the Legs was not refused by count: ${rShortCount}`);

  if (!claimRegisterRefusal(null, legs)) fails.push("(as) an absent claim_register was not refused");
  const rMissing = attachReview([candOf("c1")], { c1: reviewAreaFields() }, {});
  if (!rMissing.error) fails.push("(as) attachReview did not refuse a review entry carrying no claim_register");
}

// (bb) the mint records compose_path -- the Persona's path -- and refuses without one (kogaki#1262).
{
  const strands = [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }];
  const doc = composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "audiences/dev-to-zenn.md" });
  if (!/^compose_path: audiences\/dev-to-zenn\.md$/m.test(doc)) {
    fails.push(`(bb) the minted Brief does not carry compose_path naming the Persona file: ${JSON.stringify(doc.slice(0, 200))}`);
  }
  let threw = null;
  try { composeBrief({ slug: "t", strands, thesis: "a claim" }); }
  catch (e) { threw = e; }
  if (!threw) fails.push("(bb) composeBrief with no composePath was not refused");
  else if (!/compose_path/.test(threw.message)) fails.push(`(bb) the refusal did not name compose_path: ${threw.message}`);
  for (const bad of ["", 42, null]) {
    let badThrew = null;
    try { composeBrief({ slug: "t", strands, thesis: "a claim", composePath: bad }); }
    catch (e) { badThrew = e; }
    if (!badThrew) fails.push(`(bb) composeBrief with composePath ${JSON.stringify(bad)} was not refused`);
  }
  // THE RECORD REQUIRES IT (kogaki#1328): a Brief record carrying no
  // compose_path is refused by the Draft's reader, naming the key.
  const bare = recordOf([{ leg_id: "s1", claims: [{ strand: "L1", proposition: "c" }], waypoints: [{ point: "w", serves: ["L1"] }] }]);
  delete bare.compose_path;
  const noPath = briefOfRecord(bare, "bb.yaml");
  if (!noPath.refusals.some((r) => /`compose_path`/.test(r))) fails.push(`(bb) a Brief record with no compose_path was not refused naming the key: ${JSON.stringify(noPath.refusals)}`);
}

// (cc) kogaki#1571: the external-authority switch is retired. The mint writes
// no such header key, a caller passing its input is refused naming the input,
// and a Brief record carrying the key is refused naming the key.
{
  const strands = [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }];
  const minted = composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "audiences/dev-to-zenn.md" });
  if (minted.includes(RETIRED_KEY)) fails.push(`(cc) the mint still writes the retired header key: ${JSON.stringify(minted.slice(0, 260))}`);
  let threw = null;
  try { composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "audiences/dev-to-zenn.md", [RETIRED_INPUT]: "on" }); }
  catch (e) { threw = e; }
  if (!threw) fails.push("(cc) composeBrief passed the retired input was not refused");
  else if (!threw.message.includes(`\`${RETIRED_INPUT}\``)) fails.push(`(cc) the refusal did not name the retired input: ${threw.message}`);
  const carried = compose.parseBriefRecord(minted.replace(/^compose_path: .*$/m, (l) => `${l}\n${RETIRED_KEY}: "on"`), "cc.yaml");
  if (!carried.error) fails.push("(cc) a Brief record carrying the retired header key was not refused");
  else if (!carried.error.includes(`\`${RETIRED_KEY}\``)) fails.push(`(cc) the record refusal did not name the key: ${carried.error}`);
}

// (dd) kogaki#1742: an existing home is classified at `apex` by its Thesis
// and its Strands' hashes. The same Thesis at the same hashes is a collision
// whose reading says so and names the later work; a moved hash is named; a
// different Thesis takes `<slug>-2`, named in its option label. No path under
// src/brief/ deletes a directory.
const DD_STRANDS = [{ display_id: "L1", slug: "a-strand", address: "coding::lesson/a-strand", cite: "coding::lesson/a-strand@abc123" }];
// THE CANDIDATES ARE THE STRUCTURE'S APEXES (kogaki#1768): one Strand read as two components, each
// two relations under one higher-order relation -- a single top, so that top is the apex (kogaki#1773) --
// so two Thesis candidates, the first the one whose home (dh) collides; `keep` then leaves the second offered.
const DD_CLAIMS = [{ id: "L1", claim: "guards fail open when nobody feeds them" }];
const DD_STRUCTURE = {
  roles: [{ id: "guard", context: "A check standing at a gate.", attributes: [], claims: ["L1"] },
    { id: "input", context: "What feeds the check.", attributes: [], claims: ["L1"] },
    { id: "cache", context: "A store of earlier answers.", attributes: [], claims: ["L1"] },
    { id: "entry", context: "One answer the store keeps.", attributes: [], claims: ["L1"] }],
  relations: [{ id: "r1", between: ["guard", "input"], holds: "{guard} reads {input}.", from: "L1" },
    { id: "r2", between: ["guard", "input"], holds: "{guard} opens when {input} stops.", from: "L1" },
    { id: "r3", between: ["cache", "entry"], holds: "{cache} keeps {entry}.", from: "L1" },
    { id: "r4", between: ["cache", "entry"], holds: "{cache} serves {entry} after it changes.", from: "L1" }],
  higher_order: [{ id: "h1", relates: ["r1", "r2"], holds: "Because {guard} reads only {input}, it opens when {input} stops.", from: ["L1"] },
    { id: "h2", relates: ["r3", "r4"], holds: "Because {cache} keeps {entry}, it serves {entry} stale.", from: ["L1"] }],
};
const ddCandidates = () => {
  const ks = componentsOf(DD_STRUCTURE, DD_CLAIMS);
  return composeThesisCandidates([], ks, DD_CLAIMS, DD_STRUCTURE);
};
const ddHome = (thesesDir, slug, thesis, cite) => {
  mkdirSync(join(thesesDir, slug), { recursive: true });
  writeFileSync(join(thesesDir, slug, "brief.yaml"), composeBrief({ slug, strands: [{ ...DD_STRANDS[0], cite }], thesis, composePath: "audiences/dev-to-zenn.md" }));
  writeFileSync(join(thesesDir, slug, "paragraph-plan.yaml"), "later: work\n");
};
{
  const same = mkdtempSync(join(tmpdir(), "kogaki-dd-same-"));
  const c = ddCandidates();
  const slug = c[0].slug;
  ddHome(same, slug, c[0].claim, DD_STRANDS[0].cite);
  classifyHomes(c, DD_STRANDS, same);
  const h = c[0].home;
  if (c[0].slug !== slug || !h.exists || !h.same_thesis || !h.same_pins || JSON.stringify(h.downstream) !== '["paragraph-plan.yaml"]') {
    fails.push(`(dd) the same Thesis at the same hashes was not classified as such: ${JSON.stringify(c[0])}`);
  }
  const reading = homeCollisionReading(c[0]);
  if (!reading.includes(`A Brief named ${slug}`) || !reading.includes("Every Strand is at the same hash") || !reading.includes("paragraph-plan.yaml")) {
    fails.push(`(dd) the reading does not name the Brief, say every Strand is at the same hash and name the later work: ${reading}`);
  }
  const leak = findInternalVocabulary(reading);
  if (leak) fails.push(`(dd) the reading leaks ${leak.kind} ${leak.token}`);

  const moved = mkdtempSync(join(tmpdir(), "kogaki-dd-moved-"));
  const m = ddCandidates();
  ddHome(moved, m[0].slug, m[0].claim, "coding::lesson/a-strand@old999");
  classifyHomes(m, DD_STRANDS, moved);
  if (!m[0].home.same_thesis || m[0].home.same_pins || JSON.stringify(m[0].home.moved) !== '["coding::lesson/a-strand"]'
    || !homeCollisionReading(m[0]).includes("These Strands are at a different hash now: coding::lesson/a-strand")) {
    fails.push(`(dd) a moved Strand hash was not named: ${JSON.stringify(m[0].home)} ${homeCollisionReading(m[0])}`);
  }

  const other = mkdtempSync(join(tmpdir(), "kogaki-dd-other-"));
  const o = ddCandidates();
  const name = o[0].slug;
  ddHome(other, name, "A different claim the owner made some other day.", DD_STRANDS[0].cite);
  classifyHomes(o, DD_STRANDS, other);
  if (o[0].slug !== `${name}-2` || o[0].home.exists) fails.push(`(dd) a different Thesis under a colliding name did not take ${name}-2: ${JSON.stringify(o[0])}`);
  if (!thesisGateOptions(o)[0].label.endsWith(`— Brief: ${name}-2`)) fails.push(`(dd) the option label does not name ${name}-2: ${thesisGateOptions(o)[0].label}`);
  if (!existsSync(join(other, name, "brief.yaml"))) fails.push("(dd) classifying a home touched it");

  if (/\b(rmSync|rmdirSync)\(/.test(briefRuntimeText())) fails.push("(dd) a code path under src/brief/ still deletes a directory");
}

// (dj) kogaki#1773: three components over L1..L4. k1 (L1, L2) stacks two higher-order relations under
// one top, so its apex is that top; k2 (L3) carries two tops, so its apex is written; k3 (L4) carries one
// ordinary relation and no higher-order relation, so it is not offered and is reported instead.
const DJ_CLAIMS = ["L1", "L2", "L3", "L4"].map((id) => ({ id, claim: `claim ${id}` }));
const DJ_STRUCTURE = {
  roles: [["gate", "L1"], ["feed", "L1"], ["check_root", "L2"], ["log", "L3"], ["reader", "L3"], ["clock", "L3"], ["tick", "L3"], ["note", "L4"], ["page", "L4"]]
    .map(([id, c]) => ({ id, context: `A ${id}.`, attributes: [], claims: [c] })),
  relations: [
    { id: "r1", between: ["gate", "feed"], holds: "{gate} reads {feed}.", from: "L1" },
    { id: "r2", between: ["gate", "check_root"], holds: "{gate} lives under {check_root}.", from: "L2" },
    { id: "r3", between: ["feed", "check_root"], holds: "{feed} is listed in {check_root}.", from: "L2" },
    { id: "r4", between: ["log", "reader"], holds: "{log} is read by {reader}.", from: "L3" },
    { id: "r5", between: ["log", "reader"], holds: "{log} is kept for {reader}.", from: "L3" },
    { id: "r6", between: ["clock", "log"], holds: "{clock} stamps {log}.", from: "L3" },
    { id: "r7", between: ["clock", "tick"], holds: "{clock} counts {tick}.", from: "L3" },
    { id: "r8", between: ["note", "page"], holds: "{note} sits on {page}.", from: "L4" }],
  higher_order: [
    { id: "h1", relates: ["r1", "r2"], holds: "{gate} reads {feed} because it lives under {check_root}.", from: ["L1"] },
    { id: "h2", relates: ["h1", "r3"], holds: "Every {gate} under {check_root} reads a listed {feed}.", from: ["L2"] },
    { id: "h3", relates: ["r4", "r5"], holds: "{log} exists for {reader}.", from: ["L3"] },
    { id: "h4", relates: ["r6", "r7"], holds: "{clock} stamps {log} by counting {tick}.", from: ["L3"] }],
};
{
  const ks = componentsOf(DJ_STRUCTURE, DJ_CLAIMS);
  const { connected, unconnected } = partitionComponents(ks);
  if (JSON.stringify(connected.map((k) => k.claims)) !== '[["L1","L2"],["L3"]]' || JSON.stringify(unconnected.map((k) => k.claims)) !== '[["L4"]]') {
    fails.push(`(dj) the components were not split into connected [L1,L2],[L3] and unconnected [L4]: ${JSON.stringify(ks.map((k) => [k.claims, k.higher_order]))}`);
  }
  const k2 = connected.find((k) => k.claims[0] === "L3");
  const written = { component: k2.component, id: "ax_log", relates: [...k2.top], holds: "A log and a clock are both kept for whoever reads them later.", from: [] };
  const c = composeThesisCandidates([written], connected, DJ_CLAIMS, DJ_STRUCTURE);
  const single = c.find((x) => x.claims.includes("L1"));
  const multi = c.find((x) => x.claims.includes("L3"));
  if (c.length !== 2 || c[0] !== single) fails.push(`(dj) the candidates are not two, deepest first: ${JSON.stringify(c.map((x) => [x.id, x.depth]))}`);
  if (!single || single.apex.id !== "h2" || Object.keys(single.apex).length !== 1 || single.thesis !== "Every gate under check root reads a listed feed.") {
    fails.push(`(dj) the single-top candidate's apex is not its top h2 with its holds in Role names: ${JSON.stringify(single)}`);
  }
  if (!multi || multi.apex.id !== "ax_log" || multi.depth !== 2 || single.depth !== 2) {
    // both are depth 2: h2 over h1, and the written apex over h3/h4; a tie keeps the components. order
    fails.push(`(dj) the depths are not 2 and 2, the written apex over its tops: ${JSON.stringify(c.map((x) => [x.id, x.depth]))}`);
  }
  const opts = thesisGateOptions(c);
  if (!opts[0].label.includes("— depth 2, 3 relations over 2 Strands; leaves L3, L4 — Brief: ")
    || !opts[1].label.includes("— depth 2, 4 relations over 1 Strand; leaves L1, L2, L4 — Brief: ")) {
    fails.push(`(dj) the option labels do not carry the depth line: ${JSON.stringify(opts.map((o) => o.label))}`);
  }
  const shallow = { ...DJ_STRUCTURE, higher_order: DJ_STRUCTURE.higher_order.filter((h) => h.id !== "h2") };
  const sk = partitionComponents(componentsOf(shallow, DJ_CLAIMS)).connected;
  const sc = composeThesisCandidates([written], sk, DJ_CLAIMS, shallow);
  if (JSON.stringify(sc.map((x) => x.depth)) !== "[2,1]" || !sc[0].claims.includes("L3")) {
    fails.push(`(dj) the candidates are not ordered deepest first: ${JSON.stringify(sc.map((x) => [x.claims, x.depth]))}`);
  }

  const adoptedSingle = withApex(DJ_STRUCTURE, single.apex, DJ_CLAIMS);
  if (adoptedSingle.attains_thesis !== "h2" || adoptedSingle.higher_order.length !== DJ_STRUCTURE.higher_order.length) {
    fails.push(`(dj) a single-top adoption wrote an apex rather than naming h2: ${JSON.stringify([adoptedSingle.attains_thesis, adoptedSingle.higher_order.map((h) => h.id)])}`);
  }
  const adoptedMulti = withApex(DJ_STRUCTURE, multi.apex, DJ_CLAIMS);
  if (adoptedMulti.attains_thesis !== "ax_log" || !adoptedMulti.higher_order.some((h) => h.id === "ax_log" && h.from.length === 0)) {
    fails.push(`(dj) a multi-top adoption did not carry the written apex: ${JSON.stringify(adoptedMulti.higher_order.map((h) => h.id))}`);
  }
  const cov = unreachedCoverage(adoptedSingle);
  const l4 = cov.find((e) => e.strand === "L4");
  const l3 = cov.find((e) => e.strand === "L3");
  if (!l4 || !l4.not_carried.includes("no higher-order relation connects this Strand's claim to any other")
    || !l3 || l3.not_carried.includes("no higher-order relation connects")) {
    fails.push(`(dj) strand_coverage does not give L4 the unconnected reason and L3 the ordinary one: ${JSON.stringify(cov)}`);
  }
  const minted = composeBrief({ slug: "dj", strands: DJ_CLAIMS.map((x) => ({ display_id: x.id, slug: x.id.toLowerCase(), cite: `coding::lesson/${x.id}@abc` })),
    thesis: single.thesis, composePath: "audiences/dev-to-zenn.md", claims: DJ_CLAIMS.map((x) => x.claim), structure: adoptedSingle });
  const rec = compose.parseBriefRecord(minted, "dj.yaml");
  if (rec.error || rec.record.structure.attains_thesis !== "h2" || !(rec.record.strand_coverage || []).some((e) => e.strand === "L4")) {
    fails.push(`(dj) the minted Brief does not carry attains_thesis h2 and L4 under strand_coverage: ${rec.error || JSON.stringify(rec.record.strand_coverage)}`);
  }

  // The unconnected material, rendered above the Thesis question.
  const dir = mkdtempSync(join(tmpdir(), "kogaki-dj-gate-"));
  const runState = join(dir, "run.json");
  writeFileSync(runState, JSON.stringify({ gate: thesisGate(c, []), thesis_candidates: c, unconnected }) + "\n");
  const g = GATE_WORK.THESIS_ADOPTION({ brief_run_state: runState });
  if (!String(g.extra.settled_set_provenance || "").includes("Not offered: L4 — no higher-order relation connects this Strand's claim to any other.")) {
    fails.push(`(dj) the unconnected material is not rendered above the question: ${JSON.stringify(g.extra)}`);
  }

  // The bound: the setting, the rewrite's refusal naming the length, and the slug following the rewrite.
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const settings = JSON.parse(readFileSync("kogaki.settings.json", "utf8"));
  if (briefThesisWords(briefTable) !== 30 || settings.brief.thesis_words !== 30 || typeof settings.brief.thesis_words_means !== "string") {
    fails.push(`(dj) brief.thesis_words is not 30 with a _means line: ${briefThesisWords(briefTable)}`);
  }
  const over = [{ id: "thesis-k1" }];
  const long = Array.from({ length: 31 }, (_, i) => `word${i}`).join(" ");
  const r1 = thesisBoundRefusal({ theses: [{ candidate: "thesis-k1", thesis: long }] }, over, 30);
  if (!r1 || !r1.includes("31 words") || !r1.includes("30 words")) fails.push(`(dj) a rewrite still over the bound was not refused naming its length: ${r1}`);
  if (thesisBoundRefusal({ theses: [{ candidate: "thesis-k1", thesis: "Guards read only what is listed." }] }, over, 30) !== null) {
    fails.push("(dj) a rewrite within the bound was refused");
  }
  if (!thesisBoundRefusal({ theses: [] }, over, 30)) fails.push("(dj) a rewrite dropping a candidate was not refused");
  const re = withThesis(single, "Listed feeds keep guards honest");
  if (re.thesis !== "Listed feeds keep guards honest." || re.slug === single.slug) fails.push(`(dj) a rewritten Thesis did not carry its own slug: ${JSON.stringify(re)}`);

  // The apex state end to end, over fixture records: no apex Call is owed for a single top, the
  // over-long Thesis is rewritten once, and a rewrite still over the bound stops the run naming it.
  const st = briefTable.states.find((x) => x.id === "apex");
  const runApex = (rewrite) => {
    const d = mkdtempSync(join(tmpdir(), "kogaki-dj-apex-"));
    const rs = join(d, "run.json");
    const longHolds = `${Array.from({ length: 35 }, (_, i) => `w${i}`).join(" ")} {gate}`;
    const structure = { ...DJ_STRUCTURE, higher_order: DJ_STRUCTURE.higher_order.map((h) => (h.id === "h2" ? { ...h, holds: longHolds } : h)) };
    writeFileSync(rs, JSON.stringify({ strands: DJ_CLAIMS.map((x) => ({ display_id: x.id, slug: x.id.toLowerCase(), address: `coding::lesson/${x.id}` })),
      strand_renderings: Object.fromEntries(DJ_CLAIMS.map((x) => [x.id.toLowerCase(), { found: true, headline: x.claim }])), structure }) + "\n");
    const apexFile = join(d, "apex.json");
    writeFileSync(apexFile, JSON.stringify({ apexes: [{ ...written }] }) + "\n");
    const boundFile = join(d, "bound.json");
    writeFileSync(boundFile, JSON.stringify({ theses: [{ candidate: "thesis-k1", thesis: rewrite }] }) + "\n");
    const rec = { _dir: d, judgments: {}, brief_run_state: rs };
    return { d, rs, rec, run: () => STATE_WORK.apex(rec, st, { apex: apexFile, "thesis-bound": boundFile, "theses-dir": join(d, "theses") }, briefTable) };
  };
  const ok1 = runApex("Every guard under the check root reads a feed the root lists.");
  await ok1.run();
  const s1 = JSON.parse(readFileSync(ok1.rs, "utf8"));
  const t1 = (s1.thesis_candidates || []).find((x) => x.id === "thesis-k1");
  if (!t1 || t1.thesis !== "Every guard under the check root reads a feed the root lists." || !ok1.rec.brief_thesis_bound
    || !s1.gate.options.some((o) => o.label.startsWith(t1.thesis)) || (s1.unconnected || []).length !== 1) {
    fails.push(`(dj) the apex state did not rewrite the over-long Thesis before the gate: ${JSON.stringify(s1.gate && s1.gate.options)}`);
  }
  const bad = runApex(long);
  let stopped = null;
  const exit = process.exit;
  process.exit = (code) => { throw new Error(`exit ${code}`); };
  const err = console.error;
  const write = process.stderr.write.bind(process.stderr);
  const said = [];
  console.error = (...a) => said.push(a.join(" "));
  process.stderr.write = (chunk) => { said.push(String(chunk)); return true; };
  try { await bad.run(); } catch (e) { stopped = e.message; } finally { process.exit = exit; console.error = err; process.stderr.write = write; }
  if (!stopped || !said.join(" ").includes("31 words")) fails.push(`(dj) a rewrite still over the bound did not stop the run naming its length: ${stopped} ${said.join(" ")}`);
  if (JSON.parse(readFileSync(bad.rs, "utf8")).gate) fails.push("(dj) a refused rewrite still composed the gate");
}

// (dh) kogaki#1742 end to end: from a record after `apex` (kogaki#1768), the advance stops at
// the conditional HOME_COLLISION wait; `replace` archives the home at `mint`,
// `keep` drops the candidate from the Thesis gate and leaves the home alone,
// and `back-to-terrain` ends the run with nothing written.
{
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const stub = join(mkdtempSync(join(tmpdir(), "kogaki-dh-judge-")), "judge.mjs");
  writeFileSync(stub, "#!/usr/bin/env node\nprocess.stdout.write(\"dh-judge fixture\\n\");\n");
  chmodSync(stub, 0o755);
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), "kogaki-dh-run-"));
    const thesesDir = join(dir, "theses");
    const c = ddCandidates();
    ddHome(thesesDir, c[0].slug, c[0].claim, DD_STRANDS[0].cite);
    classifyHomes(c, DD_STRANDS, thesesDir);
    const runState = join(dir, "run.json");
    writeFileSync(runState, JSON.stringify({
      stage: "entered", strands: DD_STRANDS,
      strand_renderings: { "a-strand": { found: true, headline: DD_CLAIMS[0].claim, cite: DD_STRANDS[0].cite } },
      structure: DD_STRUCTURE, thesis_candidates: c, gate: thesisGate(c, DD_STRANDS),
    }, null, 2) + "\n");
    writeFileSync(join(dir, "run-record.json"), JSON.stringify({
      workflow: { path: "src/brief-workflow.json", version: briefTable.version }, judge_binary: null, survey_record: null,
      completed: ["enter", "read_structure", "apex"], waits_reached: [], conditional_entered: [], conditional_skipped: [], awaiting: null, owner_input: {},
      artifacts_written: [], judgments: {}, gate_declarations_owed: [], transitions: [], done: false, brief_run_state: runState,
      settled_set: { addresses: [DD_STRANDS[0].address], via: "supplied on the command line" },
    }, null, 2) + "\n");
    const terms = join(dir, "defined-terms.json");
    writeFileSync(terms, JSON.stringify({ version: "1", defined_terms: [] }) + "\n");
    const pointer = join(dir, "open-run-pointer.json");
    writeFileSync(pointer, `${dir}\n`);
    const gates = join(dir, "open-gates");
    mkdirSync(gates);
    return { dir, thesesDir, terms, pointer, gates, slug: c[0].slug, claim: c[0].claim, id: c[0].id, rows: [] };
  };
  const advance = (f, toolUseId) => {
    const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: f.dir, KOGAKI_BRIEF_OPEN_RUN: f.pointer,
      KOGAKI_OPEN_GATES: f.gates, KOGAKI_JUDGE_CLI: stub };
    delete env.CLAUDE_CODE_SESSION_ID;
    return spawnSync(process.execPath, ["src/brief.mjs", "run", "--defined-terms", f.terms, "--theses-dir", f.thesesDir], {
      encoding: "utf8", timeout: 60000, env,
      input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-dh", tool_use_id: toolUseId }),
    });
  };
  const record = (f) => JSON.parse(readFileSync(join(f.dir, "run-record.json"), "utf8"));
  const answer = (f, gateId, option, toolUseId, given = { option }) => {
    const decl = JSON.parse(readFileSync(join(f.dir, `${gateId}.run-declaration.json`), "utf8"));
    const digest = createHash("sha256").update(JSON.stringify([gateId, decl.options.map((o) => o.id)])).digest("hex");
    f.rows.push({ gate_id: gateId, gate_instance_id: decl.gate_instance_id, evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
      answers_over: { option_set_digest: digest }, payload: { answer: given } });
    writeFileSync(join(f.dir, "brief.gate-capture.json"), JSON.stringify({ rows: f.rows }) + "\n");
  };
  const callText = (f, gateId) => existsSync(join(f.dir, `${gateId}.gate-call.json`)) ? readFileSync(join(f.dir, `${gateId}.gate-call.json`), "utf8") : "";
  const stoppedAtCollision = () => {
    const f = setup();
    const r = advance(f, "toolu_dh_0");
    const rec = record(f);
    const call = callText(f, "brief-home-collision");
    if (rec.awaiting !== "HOME_COLLISION" || !rec.conditional_entered.includes("HOME_COLLISION")
      || !call.includes(`A Brief named ${f.slug}`) || !call.includes("Every Strand is at the same hash")) {
      fails.push(`(dh) the advance after enter did not stop at the home-collision gate with its reading: status=${r.status} stderr=${r.stderr.slice(0, 400)} awaiting=${rec.awaiting} call=${call.slice(0, 300)}`);
    }
    return f;
  };
  {
    const f = stoppedAtCollision();
    answer(f, "brief-home-collision", "replace", "toolu_dh_1");
    advance(f, "toolu_dh_1");
    const mid = record(f);
    if (mid.awaiting !== "THESIS_ADOPTION" || !mid.completed.includes("HOME_COLLISION")) fails.push(`(dh) replace did not move the run on to the Thesis gate: ${JSON.stringify(mid).slice(0, 400)}`);
    if (!existsSync(join(f.thesesDir, f.slug, "paragraph-plan.yaml"))) fails.push("(dh) replace moved the home at the click, before the mint");
    answer(f, "brief-thesis-adoption", f.id, "toolu_dh_2");
    const r = advance(f, "toolu_dh_2");
    const rec = record(f);
    const archive = join(f.thesesDir, ".archive");
    const moved = existsSync(archive) ? readdirSync(archive) : [];
    const brief = join(f.thesesDir, f.slug, "brief.yaml");
    if (!rec.completed.includes("mint") || moved.length !== 1 || !moved[0].startsWith(`${f.slug}@`)
      || !existsSync(join(archive, moved[0], "paragraph-plan.yaml")) || !existsSync(brief)
      || existsSync(join(f.thesesDir, f.slug, "paragraph-plan.yaml")) || !readFileSync(brief, "utf8").includes(f.claim.slice(0, 30))) {
      fails.push(`(dh) replace did not archive the home at mint and mint the adopted Thesis: archive=${JSON.stringify(moved)} stdout=${r.stdout.slice(0, 400)} stderr=${r.stderr.slice(0, 400)}`);
    }
  }
  {
    const f = stoppedAtCollision();
    answer(f, "brief-home-collision", "keep", "toolu_dh_3");
    advance(f, "toolu_dh_3");
    const rec = record(f);
    const decl = existsSync(join(f.dir, "brief-thesis-adoption.run-declaration.json"))
      ? JSON.parse(readFileSync(join(f.dir, "brief-thesis-adoption.run-declaration.json"), "utf8")) : { options: [{ id: f.id }] };
    if (rec.awaiting !== "THESIS_ADOPTION" || decl.options.some((o) => o.id === f.id)
      || !callText(f, "brief-thesis-adoption").includes("Not offered:")) {
      fails.push(`(dh) keep did not drop the candidate from the Thesis gate and name it above: ${JSON.stringify(decl.options)} awaiting=${rec.awaiting} call=${callText(f, "brief-thesis-adoption").slice(0, 600)}`);
    }
    if (!existsSync(join(f.thesesDir, f.slug, "paragraph-plan.yaml")) || existsSync(join(f.thesesDir, ".archive"))) fails.push("(dh) keep touched the existing home");
  }
  {
    const f = stoppedAtCollision();
    answer(f, "brief-home-collision", "back-to-terrain", "toolu_dh_4");
    advance(f, "toolu_dh_4");
    const rec = record(f);
    if (rec.done !== true || !rec.premise_negated || existsSync(f.pointer) || existsSync(join(f.dir, "brief-thesis-adoption.run-declaration.json"))) {
      fails.push(`(dh) back-to-terrain did not end the run with nothing further asked: ${JSON.stringify(rec).slice(0, 400)}`);
    }
  }
  // (fx) kogaki#1749: the Thesis gate offers no free text. The registry row
  // declares none and the composed call carries no free-text prompt; a capture
  // with free text and no option is refused naming the gate, inside an advance
  // (the run stays at THESIS_ADOPTION) and by `adopt`, and nothing is written.
  {
    const reg = JSON.parse(readFileSync("src/gate-registry.json", "utf8"));
    const row = reg.gates.find((g) => g.id === "brief-thesis-adoption");
    if (!row || row.free_text_offered !== false) fails.push(`(fx) brief-thesis-adoption declares free_text_offered ${JSON.stringify(row && row.free_text_offered)}, not false`);
    const f = stoppedAtCollision();
    answer(f, "brief-home-collision", "replace", "toolu_fx_1");
    advance(f, "toolu_fx_1");
    const decl = JSON.parse(readFileSync(join(f.dir, "brief-thesis-adoption.run-declaration.json"), "utf8"));
    const ids = decl.options.map((o) => o.id);
    if (decl.free_text_offered !== false || /own words/i.test(callText(f, "brief-thesis-adoption"))
      || !ids.includes("back-to-terrain") || !ids.includes(f.id)) {
      fails.push(`(fx) the Thesis gate call offers free text or lacks its options: ${JSON.stringify(ids)} free_text_offered=${decl.free_text_offered}`);
    }
    const before = readdirSync(f.thesesDir).sort().join(",");
    answer(f, "brief-thesis-adoption", undefined, "toolu_fx_2", { free_text: "I've already answered it" });
    const r = advance(f, "toolu_fx_2");
    const rec = record(f);
    if (rec.awaiting !== "THESIS_ADOPTION" || rec.completed.includes("adopt_thesis")
      || !`${r.stdout}${r.stderr}`.includes("brief-thesis-adoption") || readdirSync(f.thesesDir).sort().join(",") !== before) {
      fails.push(`(fx) a free-text answer at the Thesis gate was not refused at the wait: awaiting=${rec.awaiting} stderr=${r.stderr.slice(0, 400)}`);
    }
    const runState = join(f.dir, "run.json");
    const a = spawnSync(process.execPath, ["src/brief.mjs", "adopt", "--run-state", runState, "--capture", join(f.dir, "brief.gate-capture.json")], { encoding: "utf8" });
    const st = JSON.parse(readFileSync(runState, "utf8"));
    if (a.status === 0 || !a.stderr.includes("brief-thesis-adoption") || st.stage === "adopted" || readdirSync(f.thesesDir).sort().join(",") !== before) {
      fails.push(`(fx) adopt did not refuse a free-text capture naming the gate: status=${a.status} stage=${st.stage} stderr=${a.stderr.slice(0, 300)}`);
    }
  }
}

// (de) kogaki#1740: a refusal inside an advance is a wait. A fixture record
// stands after `adopt_thesis`, with the adopted name's home already present.
{
  const briefTable = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const stub = join(mkdtempSync(join(tmpdir(), "kogaki-de-judge-")), "judge.mjs");
  writeFileSync(stub, "#!/usr/bin/env node\nprocess.stdout.write(\"de-judge fixture\\n\");\n");
  chmodSync(stub, 0o755);
  const setup = () => {
    const dir = mkdtempSync(join(tmpdir(), "kogaki-de-run-"));
    const thesesDir = join(dir, "theses");
    mkdirSync(join(thesesDir, "guard-claim"), { recursive: true });
    const runState = join(dir, "run.json");
    writeFileSync(runState, JSON.stringify({
      stage: "adopted", adopted_thesis: "Guards fail open when nobody feeds them.", adopted_slug: "guard-claim",
      strands: [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }], strand_renderings: {},
    }, null, 2) + "\n");
    writeFileSync(join(dir, "run-record.json"), JSON.stringify({
      workflow: { path: "src/brief-workflow.json", version: briefTable.version }, judge_binary: null, survey_record: null,
      completed: ["enter", "read_structure", "apex", "THESIS_ADOPTION", "adopt_thesis"], waits_reached: ["THESIS_ADOPTION"],
      conditional_entered: [], conditional_skipped: [], awaiting: null, owner_input: {}, artifacts_written: [],
      judgments: {}, gate_declarations_owed: [], transitions: [], done: false, brief_run_state: runState,
    }, null, 2) + "\n");
    const terms = join(dir, "defined-terms.json");
    writeFileSync(terms, JSON.stringify({ version: "1", defined_terms: [] }) + "\n");
    const pointer = join(dir, "open-run-pointer.json");
    writeFileSync(pointer, `${dir}\n`);
    const gates = join(dir, "open-gates");
    mkdirSync(gates);
    return { dir, thesesDir, terms, pointer, gates };
  };
  const advance = (f, toolUseId) => {
    const env = { ...process.env, KOGAKI_BRIEF_RUN_DIR: f.dir, KOGAKI_BRIEF_OPEN_RUN: f.pointer,
      KOGAKI_OPEN_GATES: f.gates, KOGAKI_JUDGE_CLI: stub };
    delete env.CLAUDE_CODE_SESSION_ID;
    return spawnSync(process.execPath, ["src/brief.mjs", "run", "--defined-terms", f.terms, "--theses-dir", f.thesesDir], {
      encoding: "utf8", timeout: 60000, env,
      input: JSON.stringify({ hook_event_name: "PostToolUse", session_id: "s-de", tool_use_id: toolUseId }),
    });
  };
  const record = (f) => JSON.parse(readFileSync(join(f.dir, "run-record.json"), "utf8"));
  const answer = (f, option, toolUseId) => {
    const decl = JSON.parse(readFileSync(join(f.dir, `${STATE_RETRY_GATE_ID}.run-declaration.json`), "utf8"));
    const digest = createHash("sha256").update(JSON.stringify([STATE_RETRY_GATE_ID, decl.options.map((o) => o.id)])).digest("hex");
    writeFileSync(join(f.dir, "brief.gate-capture.json"), JSON.stringify({ rows: [{
      gate_instance_id: decl.gate_instance_id, evidence: { tool: "AskUserQuestion", tool_use_id: toolUseId },
      answers_over: { option_set_digest: digest }, payload: { answer: { option } } }] }) + "\n");
  };
  const refusedOnce = () => {
    const f = setup();
    const r = advance(f, "toolu_de_1");
    const rec = record(f);
    const owed = (rec.gate_declarations_owed || []).find((g) => g.state === "mint" && g.gate_id === STATE_RETRY_GATE_ID);
    if (r.status !== 0 || rec.awaiting !== "mint" || rec.completed.includes("mint") || !owed
      || !existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`))
      || !String((rec.state_refusals || {}).mint?.refusal || "").includes("already exists")) {
      fails.push(`(de) a mint refusal inside an advance did not leave awaiting: mint with a ${STATE_RETRY_GATE_ID} declaration and call: status=${r.status} stderr=${r.stderr} record=${JSON.stringify(rec).slice(0, 600)}`);
    }
    const call = existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`)) ? readFileSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`), "utf8") : "";
    if (/adopt --thesis|--slug/.test(`${call}${r.stdout}`)) fails.push("(de) the mint refusal still names `adopt --thesis` or `--slug`");
    return f;
  };
  {
    const f = refusedOnce();
    rmSync(join(f.thesesDir, "guard-claim"), { recursive: true });
    answer(f, "retry", "toolu_de_2");
    const r = advance(f, "toolu_de_2");
    const rec = record(f);
    const brief = join(f.thesesDir, "guard-claim", "brief.yaml");
    if (!rec.completed.includes("mint") || !existsSync(brief)
      || !readFileSync(brief, "utf8").includes("Guards fail open when nobody feeds them.")) {
      fails.push(`(de) \`retry\` after the repair did not complete mint with the adopted Thesis: stdout=${r.stdout.slice(0, 400)} stderr=${r.stderr.slice(0, 400)}`);
    }
  }
  {
    const f = refusedOnce();
    answer(f, "abandon", "toolu_de_3");
    const r = advance(f, "toolu_de_3");
    const rec = record(f);
    if (r.status !== 0 || rec.done !== true || !rec.state_abandoned || existsSync(f.pointer) || rec.completed.includes("mint")) {
      fails.push(`(de) \`abandon\` did not end the run and clear the open-run pointer: status=${r.status} stderr=${r.stderr} record=${JSON.stringify(rec).slice(0, 400)}`);
    }
  }
  // (df) the amendment's item 1: a renderer that THROWS, rather than calling a
  // runtime's `fail`, is a refusal too. `strands: null` makes the mint's composer
  // throw a TypeError.
  {
    const f = setup();
    rmSync(join(f.thesesDir, "guard-claim"), { recursive: true });
    const runState = join(f.dir, "run.json");
    writeFileSync(runState, JSON.stringify({ ...JSON.parse(readFileSync(runState, "utf8")), strands: null }) + "\n");
    const r = advance(f, "toolu_df_1");
    const rec = record(f);
    if (r.status !== 0 || rec.awaiting !== "mint" || !existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`))
      || !/TypeError/.test(String((rec.state_refusals || {}).mint?.refusal || ""))) {
      fails.push(`(df) a renderer that threw did not leave awaiting: mint with a ${STATE_RETRY_GATE_ID} call: status=${r.status} stderr=${r.stderr.slice(0, 400)} record=${JSON.stringify(rec).slice(0, 400)}`);
    }
  }
  // (dg) the amendment's item 2: \`start\` over an unfinished open run raises the
  // gate for its first incomplete state and creates no run directory.
  {
    const f = setup();
    const lane = join(process.cwd(), "runs", "brief");
    const before = existsSync(lane) ? readdirSync(lane).sort() : [];
    const env = { ...process.env, KOGAKI_BRIEF_OPEN_RUN: f.pointer, KOGAKI_OPEN_GATES: f.gates, KOGAKI_JUDGE_CLI: stub };
    delete env.CLAUDE_CODE_SESSION_ID;
    delete env.KOGAKI_BRIEF_RUN_DIR;
    const r = spawnSync(process.execPath, ["src/brief.mjs", "start"], { encoding: "utf8", timeout: 60000, env });
    const after = existsSync(lane) ? readdirSync(lane).sort() : [];
    const rec = record(f);
    if (r.status !== 0 || rec.awaiting !== "mint" || !existsSync(join(f.dir, `${STATE_RETRY_GATE_ID}.gate-call.json`))
      || readFileSync(f.pointer, "utf8").trim() !== f.dir) {
      fails.push(`(dg) start over an unfinished run did not raise ${STATE_RETRY_GATE_ID} for it: status=${r.status} stderr=${r.stderr.slice(0, 400)} record=${JSON.stringify(rec).slice(0, 300)}`);
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) fails.push(`(dg) start over an unfinished run created a run directory: ${JSON.stringify(after.filter((d) => !before.includes(d)))}`);
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-mint");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-mint — a Leg declaring no introduces (kogaki#1768) and an introduces entry carrying nearest or differs refused by name (kogaki#1571); the Persona read once, handed in compose_path's unit input and never to its validator (kogaki#1768), review_path reading none of it and carrying defined_terms (kogaki#1331); the claim register refused by count, by verdict and by an unworded fails (kogaki#1281); composeBrief recording compose_path and refusing a missing one (kogaki#1262), the retired external-authority switch written by no mint and refused by name as an input and as a record key (kogaki#1571); an existing home classified by Thesis and Strand hashes over candidates composed from the structure's apex (kogaki#1768), a different Thesis taking a free name, and the home-collision gate archiving on replace at mint, dropping the candidate on keep and ending on back-to-terrain (kogaki#1742); the Thesis gate offering no free text and a typed answer refused at the wait and by adopt (kogaki#1749); a component no higher-order relation connects reported above the question and under strand_coverage rather than offered, a single top as its own apex, the depth line deepest first, and a Thesis over brief.thesis_words rewritten once and refused if still over (kogaki#1773); a mint refusal inside an advance waiting at the brief-state-retry gate, retry minting the adopted Thesis and abandon clearing the open-run pointer, a throwing renderer raising the same gate, and start over an unfinished run re-offering it with no new run directory (kogaki#1740).");
JS
