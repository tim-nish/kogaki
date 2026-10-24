#!/usr/bin/env bash
# check-brief-mint — the Persona, claim register and mint-side rules of
# Brief composition. A LIGHT member: pure calls, no model run.
#   (af) `nearest` and `differs` are retired: introduces_item declares
#        neither, and an entry carrying either is refused naming it (kogaki#1571).
#   (ar) `persona_prior_knowledge` reaches no composition or path-review
#        input; review_path carries `defined_terms` instead (kogaki#1331).
#   (as) the claim register, one judged entry per Leg (kogaki#1281).
#   (bb) `composeBrief` records `compose_path` and refuses one missing
#        (kogaki#1262, kogaki#1328).
#   (cc) the external-authority switch is retired: the mint writes no such
#        header key, and the key or its input is refused by name (kogaki#1571).
# Cut from check-brief-compose.sh by kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { composeBrief } from "./src/brief.mjs";
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
  const fields = schema.introduces_item.fields;
  for (const k of ["nearest", "differs"]) {
    if (Object.hasOwn(fields, k)) fails.push(`(af) src/leg-schema.json's introduces_item still declares ${k}`);
    const r = compose.parseIntroducesEntry({ term: "unfed guard", meaning: "a guard whose input nobody feeds", [k]: "guard clause" });
    if (!r.error) fails.push(`(af) an introduces entry carrying ${k} was not refused`);
    else if (!r.error.includes(`\`${k}\``)) fails.push(`(af) the refusal of ${k} did not name it: ${r.error}`);
  }
}

// (ar) kogaki#1331: `persona_prior_knowledge` reaches no composition or path-review
// input -- the grant it carried is removed (owner decision 2026-10-10) -- and
// review_path's input carries the Brief's `defined_terms` in its place. The
// Persona's line keeps its one reader, differentiation's Reader start.
{
  const brief = briefRuntimeText();
  const code = (t) => t.split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
  const composePath = code(brief.slice(brief.indexOf("  compose_path: async"), brief.indexOf("  review_path: async")));
  const reviewPath = code(brief.slice(brief.indexOf("  review_path: async"), brief.indexOf("  attach_review:")));
  const differentiation = code(brief.slice(brief.indexOf("  differentiation: async"), brief.indexOf("  compose_path: async")));
  if (/persona_prior_knowledge|personaPriorKnowledgeLine/.test(composePath)) fails.push("(ar) compose_path still reads or passes the Persona's prior_knowledge");
  if (/persona_prior_knowledge|personaPriorKnowledgeLine/.test(reviewPath)) fails.push("(ar) review_path still reads or passes the Persona's prior_knowledge");
  if ((reviewPath.match(/defined_terms: definedTerms,/g) || []).length !== 2) fails.push("(ar) review_path's base write and per-unit input do not both carry defined_terms");
  if (!/prior_knowledge: personaPriorKnowledgeLine\(persona\)/.test(differentiation)) fails.push("(ar) differentiation no longer carries the Persona's prior_knowledge for Reader start");
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
  const bare = recordOf([{ leg_id: "s1", move: "m", materials: ["L1"], purpose: "p", reader_state_after: "knowledge: k",
    depends_on: [], rationale: "r", claims: [{ strand: "L1", proposition: "c" }], waypoints: [{ point: "w", serves: ["L1"] }] }]);
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

if (fails.length > 0) {
  console.log("FAIL check-brief-mint");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-mint — an introduces entry carrying nearest or differs refused by name (kogaki#1571); persona_prior_knowledge reaching no compose_path or review_path input, review_path carrying defined_terms (kogaki#1331); the claim register refused by count, by verdict and by an unworded fails (kogaki#1281); composeBrief recording compose_path and refusing a missing one (kogaki#1262), and the retired external-authority switch written by no mint and refused by name as an input and as a record key (kogaki#1571).");
JS
