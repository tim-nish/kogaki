#!/usr/bin/env bash
# check-brief-path-rules — the Brief record's own rules over a whole path.
#   (am) a Leg carrying `journeys` is refused (kogaki#1286, kogaki#1768); (an) the
#        Discharge item and the question chain retired (kogaki#1283, #1325, #1699).
#   (av) adoption writes brief.yaml in list or map form (kogaki#1328).
#   (aw) the Defined Terms (kogaki#1331), no Leg introducing one (kogaki#1768); (ax)
#        no Move information reaches the Brief, and a structure Brief's Leg carrying
#        `waypoints` or `move` is refused naming the field (kogaki#1775).
#   (ay) Thesis attainment (kogaki#1330, kogaki#1775): one Leg per reached relation, its
#        text the relation's holds, the apex's Leg alone marked, at any position.
#   (az) a point read alone (kogaki#1449); (bb) no method verb (kogaki#1554); (ba) recoverability
#   (kogaki#1494); (bc) no Obligation rule (kogaki#1699); (bd) a legacy waypoint `case` (#1732).
# Cut from check-brief-compose.sh by kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_WORK } from "./src/brief/renderers.mjs";
import { composeBrief } from "./src/brief.mjs";
import { structureLegs, pathReachRefusal } from "./src/compose/structure.mjs";
import { judgePrompt } from "./src/workflow/judge.mjs";
import { bindFlow } from "./src/workflow/run-record.mjs";
import { BRIEF_FLOW } from "./src/brief/job-verbs.mjs";
// The run record binds no default lane (kogaki#1741): a Brief row renders under the Brief's flow.
bindFlow(BRIEF_FLOW);
import * as compose from "./src/compose.mjs";
import { attachReview, REVIEW_AREAS } from "./src/review.mjs";
import { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg } from "./src/draft.mjs";
import { recordOf, briefOfRecord, legacyLegsToText, leg1276, cand1276 } from "./checks/fixtures/brief-compose/fixtures.mjs";
import { METHOD_VERBS } from "./src/compose/leg-schema.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const { validateLegs, readerTargetLegRefusal, legRecord, briefRecordText } = compose;
// A RelationalStructure as the Brief adopts it (kogaki#1772, kogaki#1775): two relations under the
// apex, which carries no `from`.
const S1775 = {
  roles: [{ id: "r_1", name: "check", context: "A check reads what it is handed.", attributes: [], claims: ["L1"] },
    { id: "r_2", name: "input", context: "What is handed over.", attributes: [], claims: ["L2"] }],
  relations: [{ id: "c_1", name: "reading", between: ["r_1", "r_2"], holds: "A {r_1} reads its {r_2}.", from: "L1" },
    { id: "c_2", name: "missing", between: ["r_1", "r_2"], holds: "A {r_1} misses what no {r_2} carries.", from: "L2" }],
  higher_order: [{ id: "h_1", name: "handed", relates: ["c_1", "c_2"], holds: "A {r_1} is only as good as its {r_2}." }],
  attains_thesis: "h_1",
  reach: ["c_1", "c_2", "h_1"],
};
const C1775 = [{ id: "L1", claim: "A check reads what it is handed." }, { id: "L2", claim: "A check misses what it is not handed." }];
const fails = [];
const planned = (leg) => ({ ...leg, paragraphs: [{ materials: ["L1"], paragraph_waypoints: [{ point: `the paragraph establishes what ${leg.leg_id} claims`, serves: ["L1"], cast: {} }] }] }); // one planned paragraph per Leg (kogaki#1777)

// (am) the Journey use boundary (kogaki#1286, owner decision 2026-10-06), RETIRED AT THE LEG
// (kogaki#1768): a Leg binds no Move and carries no `journeys`, so `validateLegs` refuses a Leg
// carrying one naming the field and kogaki#1768, `legRecord` writes none, and the Packet rendered
// for a Leg of the Brief carries none of the three use words.
{
  const leg = { leg_id: "s1", claims: [{ type: "strand", strand: "L1", proposition: "claim of s1" }],
    waypoints: [{ point: "the paragraph establishes what s1 claims", serves: ["L1"], case: "own" }], reaches_target: true };
  const carrying = validateLegs([{ ...leg, journeys: [{ strand: "L1", use: "contrast" }] }], []);
  if (!carrying.error || !carrying.error.includes("carries `journeys`, which is retired") || !carrying.error.includes("kogaki#1768")) {
    fails.push(`(am) a Leg carrying \`journeys\` was not refused naming the field and kogaki#1768: ${carrying.error}`);
  }
  const written = legRecord({ ...leg, journeys: [{ strand: "L1", use: "contrast" }] });
  if ("journeys" in written) fails.push(`(am) legRecord wrote a Journey entry for a Leg: ${JSON.stringify(written.journeys)}`);
  const brief = briefOfRecord(recordOf([leg]), "am.yaml");
  if (brief.refusals.length || brief.legs.length !== 1) fails.push(`(am) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)} legs=${brief.legs.length}`);
  else {
    const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
    if (split.error) fails.push(`(am) the Packet template did not split: ${split.error}`);
    else {
      const r = renderPacket({ template: split.packet, brief, leg: planned(brief.legs[0]), priorSections: [],
        section: sectionOfLeg(brief.legs).get("s1"), sections: sectionsOf(brief.legs) });
      if (r.error) fails.push(`(am) the Packet for s1 did not render: ${r.error}`);
      else {
        for (const word of ["use: illustrate", "use: motivate", "use: contrast"]) {
          if (r.packet.includes(word)) fails.push(`(am) the Packet still carries ${JSON.stringify(word)}`);
        }
      }
    }
  }
}

// (an) THE DISCHARGE ITEM IS RETIRED WITH THE OBLIGATIONS LEDGER (kogaki#1699): `dischargeRows`
// is no longer exported, and an entry carrying `discharge` is refused by name. The "Question
// chain" item beside it was RETIRED at kogaki#1325: a record carrying `question_chain` is
// refused by name, and `questionChainPairs` is no longer exported.
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"], case: "own" }],
    ...extra,
  });
  const legs = [legOf("s1"), legOf("s2"), legOf("s3")];
  if ("questionChainPairs" in compose) fails.push("(an) src/compose.mjs still exports questionChainPairs, retired at kogaki#1325");
  if ("dischargeRows" in compose) fails.push("(an) src/compose.mjs still exports dischargeRows, retired at kogaki#1699");
  const cand = (id) => ({ candidate_id: id, legs });
  // A holding claim register rides every reply here: these Legs are real Leg records, so
  // attachReview owes one entry per Leg (kogaki#1281).
  const areas = () => ({ ...Object.fromEntries(REVIEW_AREAS.map((a) => [a, `reasoning for ${a}`])),
    claim_register: legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) });

  // carrying no discharge is the only well-formed entry.
  const neither = attachReview([cand("cand-1")], { "cand-1": areas() });
  if (neither.error) fails.push(`(an) an entry carrying no discharge was refused: ${neither.error}`);

  // a discharge, carried at all, is refused by name.
  const discharged = attachReview([cand("cand-2")],
    { "cand-2": { ...areas(), discharge: [{ row: "the case's generality is open", closed_by: "s2", verdict: "holds", why: "s2 answers it" }] } });
  if (!discharged.error || !discharged.error.includes("discharge") || !discharged.error.includes("kogaki#1699")) {
    fails.push(`(an) an entry carrying the retired discharge was not refused naming it and kogaki#1699: ${JSON.stringify(discharged)}`);
  }

  // the retired question chain, carried at all, is refused by name.
  const retiredChain = attachReview([cand("cand-3")],
    { "cand-3": { ...areas(),
      question_chain: [{ leg: "s1", next_leg: "s2", verdict: "same question", why: "both name the same variation" }] } });
  if (!retiredChain.error || !/question_chain.*retired/.test(retiredChain.error)) fails.push(`(an) a record carrying the retired question_chain was not refused by name: ${JSON.stringify(retiredChain)}`);
}

// (bc) kogaki#1699 -- THE OBLIGATION PATH RULES ARE RETIRED. The Brief carries no Obligations
// ledger, so `src/leg-schema.json` declares no `obligation_*` path rule and no
// `closing_leg_state_fixed`, and `validateLegs` takes no ledger.
{
  const legSchema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const left = Object.keys(legSchema.path_rules).filter((k) => k.startsWith("obligation_") || k === "closing_leg_state_fixed");
  if (left.length) fails.push(`(bc) src/leg-schema.json still declares the retired path rules ${JSON.stringify(left)}`);
  if (validateLegs.length > 2) fails.push(`(bc) validateLegs still declares ${validateLegs.length} parameters; it takes the Legs and its options`);
}

// (av) adoption writes brief.yaml: every Leg field in list or map form, no line over 120 characters.
// The fixture is one Reader Path whose Legs bind no Move (kogaki#1768); its first Claim is lengthened.
{
  const { adoptCandidate, selectionOptionIds } = await import("./src/assemble.mjs");
  const { parseBriefRecord } = compose;
  const fx = "checks/fixtures/adopt-candidate";
  const minted = parseBriefRecord(readFileSync(join(fx, "brief.yaml"), "utf8"), "brief.yaml");
  const reviewed = JSON.parse(readFileSync(join(fx, "reviewed.json"), "utf8"));
  const long = "a sentence long enough that no single line of the record could hold it, ".repeat(5).trim();
  const leg1 = reviewed.candidates[0].legs[0];
  leg1.claims[0].proposition = long;
  const offered = minted.error ? { error: minted.error } : selectionOptionIds(reviewed, minted.record);
  if (offered.error) fails.push(`(av) the fixture's option set cannot be composed: ${offered.error}`);
  else {
    const selection = { rows: [{ gate_id: "brief-candidate-selection",
      evidence: { tool: "AskUserQuestion", tool_use_id: "toolu_fixture_av" },
      answers_over: { option_set_digest: compose.ownerGateDigest("brief-candidate-selection", offered.ids) },
      payload: { answer: { option: "cand-a" } } }] };
    const r = adoptCandidate(minted.record, reviewed, "cand-a", { selection });
    if (r.error) fails.push(`(av) adoption over the fixture refused: ${r.error}`);
    else {
      const text = briefRecordText(r.record);
      const over = text.split("\n").filter((l) => l.length > 120);
      if (over.length) fails.push(`(av) the written brief.yaml carries ${over.length} line(s) over 120 characters: ${JSON.stringify(over[0])}`);
      const back = parseBriefRecord(text, "brief.yaml");
      const path = back.error ? [] : back.record.reader_path;
      if (back.error || path.length !== 2) fails.push(`(av) the written brief.yaml does not read back with its two Legs: ${back.error || path.length}`);
      for (const leg of path) {
        for (const k of ["claims", "waypoints"]) {
          if (!Array.isArray(leg[k])) fails.push(`(av) ${leg.leg_id}.${k} is not a list in the record`);
        }
        for (const k of ["reader_state_after", "reader_state_before"]) {
          if (k in leg) fails.push(`(av) ${leg.leg_id} carries \`${k}\`, retired with the Leg's reader states (kogaki#1699)`);
        }
        for (const k of ["move", "materials", "purpose", "depends_on", "rationale", "introduces"]) {
          if (k in leg) fails.push(`(av) ${leg.leg_id} carries \`${k}\`, retired with the Leg's Move (kogaki#1768)`);
        }
        if ((leg.claims || []).some((g) => typeof g !== "object" || typeof g.proposition !== "string")) fails.push(`(av) ${leg.leg_id}.claims is not a list of maps`);
        if ((leg.waypoints || []).some((w) => typeof w !== "object" || !Array.isArray(w.serves))) fails.push(`(av) ${leg.leg_id}.waypoints is not a list of maps`);
      }
      if (path[0]?.claims?.[0]?.proposition !== long) fails.push("(av) the lengthened Claim did not read back whole after wrapping");
      // the Draft reads the adopted Legs by their text (kogaki#1775, kogaki#1777)
      const read = readBrief(briefRecordText({ ...r.record, reader_path: legacyLegsToText(r.record.reader_path) }), "brief.yaml");
      if (read.refusals.length) fails.push(`(av) the Draft's reader refused the adopted record: ${JSON.stringify(read.refusals)}`);
      else if (read.legs.some((l) => "reader_state_before" in l || "reader_state_after" in l)) fails.push("(av) the Draft's reader derived a reader state the Brief no longer carries (kogaki#1699)");
    }
  }
}

// (aw) kogaki#1331 — the Brief carries its Defined Terms, written once at mint,
// and, since kogaki#1768, no Leg introduces one, so composition no longer refuses a `defined`
// word used before an introducing Leg.
{
  const { parseBriefRecord, DEFINED_TERM_CLASSES } = compose;
  const strands = [{ display_id: "L1", slug: "first-strand", cite: "fixture" }];
  const base = { slug: "t", strands, composePath: "audiences/dev-to-zenn.md" };
  const thesis = "A gate passes only what it was given.";
  const claims = ["The check reads the list it was handed."];
  const terms = [{ term: "gate", class: "defined" }, { term: "check", class: "defined" }, { term: "list", class: "ordinary" }];

  // a minted Brief carries defined_terms, each entry exactly one of the two classes.
  let minted = null;
  try { minted = parseBriefRecord(composeBrief({ ...base, thesis, definedTerms: terms, claims }), "brief.yaml"); }
  catch (e) { fails.push(`(aw) composeBrief refused a well-formed list: ${e.message}`); }
  if (minted && minted.error) fails.push(`(aw) the minted Brief does not read back: ${minted.error}`);
  else if (minted) {
    const dt = minted.record.defined_terms;
    if (!Array.isArray(dt) || dt.length !== 3) fails.push(`(aw) the minted Brief does not carry the three defined_terms: ${JSON.stringify(dt)}`);
    else if (!dt.every((e) => Object.keys(e).length === 2 && DEFINED_TERM_CLASSES.includes(e.class))) {
      fails.push(`(aw) a defined_terms entry does not carry exactly one of the two classes: ${JSON.stringify(dt)}`);
    }
  }
  // an entry outside the two classes, and one occurring in neither text, refuse naming it.
  for (const [bad, want] of [[[{ term: "gate", class: "maybe" }], /"gate".*class "maybe"/],
    [[{ term: "pipeline", class: "defined" }], /"pipeline", which occurs whole-word in neither/]]) {
    let msg = null;
    try { composeBrief({ ...base, thesis, definedTerms: bad, claims }); } catch (e) { msg = e.message; }
    if (!msg) fails.push(`(aw) composeBrief did not refuse ${JSON.stringify(bad)}`);
    else if (!want.test(msg)) fails.push(`(aw) the refusal of ${JSON.stringify(bad)} did not name it: ${msg}`);
  }

  // THE BEFORE-ITS-INTRODUCING-LEG REFUSAL IS RETIRED (kogaki#1768): a Leg introduces no term, so
  // `validateLegs` reads no Defined Terms and a Leg 2 claim using a defined word passes, while a
  // Leg carrying `introduces` is refused naming the field.
  const legsFor = (s1Extra = {}, s2Extra = {}) => [leg1276("s1", { opens_section: "what the reader now holds", ...s1Extra }),
    leg1276("s2", { reaches_target: true,
      claims: [{ type: "strand", strand: "L1", proposition: "the check reads what it was handed" }], ...s2Extra })];
  const used = compose.validateLegs(legsFor(), {});
  if (used.error) fails.push(`(aw) a Leg 2 claim using a defined word was refused, though no Leg introduces a term (kogaki#1768): ${used.error}`);
  const added = compose.validateLegs(legsFor({}, { introduces: ["check"] }), {});
  if (!added.error || !/leg 2 \(s2\): carries `introduces`, which is retired/.test(added.error)) {
    fails.push(`(aw) a Leg carrying \`introduces\` was not refused naming the Leg and the field: ${added.error}`);
  }
  // the mint's judged row asks for the record the refusal reads.
  const row = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).defined_terms_unit;
  if (!row || !judgePrompt(row, "", null, null).includes("defined_terms_record")) {
    fails.push("(aw) src/brief-workflow.json declares no defined_terms_unit row rendering candidate-schema.json's defined_terms_record");
  }
}

// (ax) kogaki#1375 -- NO MOVE INFORMATION REACHES THE BRIEF. A Brief Waypoint carries
// `point` and `serves` only: a waypoint carrying `move` or `segments` is refused by name,
// naming the Leg and the waypoint, by `validateLegs` -- at the compose unit's validator and
// at every Brief read, which run it through `waypointsRefusal` -- and `legRecord` writes
// neither. The Leg schema declares neither field, the Brief workflow table carries no
// paragraph-Move row, and compose_path declares no paragraph-Move judge: the paragraph Move
// is bound by /paragraph-plan, after the Brief.
{
  const legsWith = (w) => [leg1276("s1", { opens_section: "Intro", waypoints: [{ point: "the term is defined", serves: ["L1"], case: "own", ...w }] }),
    leg1276("s2", { reaches_target: true })];
  for (const f of compose.RETIRED_WAYPOINT_MOVE_FIELDS) {
    const r = compose.validateLegs(legsWith({ [f]: "p_define" }), []);
    if (!r.error) fails.push(`(ax) a waypoint carrying \`${f}\` was not refused`);
    else if (!new RegExp(`leg 1 \\(s1\\): waypoint 1 carries \`${f}\`, which is retired`).test(r.error) || !r.error.includes("kogaki#1375")) {
      fails.push(`(ax) a waypoint carrying \`${f}\` was refused without naming the field, the Leg and the waypoint: ${r.error}`);
    }
  }
  const plain = compose.validateLegs(legsWith({}), []);
  if (plain.error) fails.push(`(ax) a waypoint carrying point, serves and case alone was refused: ${plain.error}`);
  const rec = compose.legRecord({ ...leg1276("s1"), waypoints: [{ point: "a point", serves: ["L1"], case: "own", move: "p", segments: "1. x" }] });
  if (rec.waypoints.some((w) => Object.keys(w).sort().join() !== "case,point,serves")) fails.push(`(ax) legRecord wrote a waypoint field other than point, serves and case: ${JSON.stringify(rec.waypoints)}`);
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  for (const f of ["move", "segments"]) {
    if (schema.waypoint.fields[f]) fails.push(`(ax) src/leg-schema.json's waypoint still declares \`${f}\``);
  }
  if (JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).paragraph_move_unit) fails.push("(ax) src/brief-workflow.json still carries the paragraph_move_unit row");
  const brief = briefRuntimeText();
  if (/bindJudge|paragraphMove(Prompts|Verdict)/.test(brief)) fails.push("(ax) the Brief runtime still declares the paragraph-Move judge inside the compose job");
  // A LEG OF A BRIEF CARRYING A `structure` CARRIES NO WAYPOINT AND NO MOVE (kogaki#1775): each is refused naming the field.
  const derived = structureLegs(S1775, C1775).map((l, i) => (i === 0 ? { ...l, opens_section: "Where a check looks" } : l));
  for (const [f, v] of [["waypoints", [{ point: "a point", serves: ["L1"], case: "own" }]], ["move", "p_define"]]) {
    const r = compose.validateLegs(derived.map((l, i) => (i === 1 ? { ...l, [f]: v } : l)), { structure: S1775 });
    if (!r.error || !r.error.includes(`leg 2 (L2): carries \`${f}\``)) fails.push(`(ax) a structure Brief's Leg carrying \`${f}\` was not refused naming the field: ${r.error}`);
  }
  const clean = compose.validateLegs(derived, { structure: S1775 });
  if (clean.error) fails.push(`(ax) the derived Legs were refused: ${clean.error}`);
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  for (const row of ["lpp_waypoints", "lpp_grounded"]) if (table[row]) fails.push(`(ax) src/brief-workflow.json still carries the \`${row}\` row`);
}

// (ay) kogaki#1330 — Thesis attainment, at the Leg marked `reaches_target` and at no other Leg.
// Since kogaki#1775 the Brief ends at Legs: (ay1) `structureLegs` derives one Leg per relation and
// higher-order relation the apex reaches, each higher-order relation after the ids it relates, its
// `text` the relation's `holds` with the Roles named, its claims the relation's, and marks the apex's
// Leg alone; (ay2) `pathReachRefusal` refuses a reached relation with no Leg and a marked Leg that is
// not the apex's, and accepts the apex's Leg first; (ay3) `readerTargetLegRefusal` refuses zero or two
// marked Legs and accepts one that is not the last.
{
  // (ay1)
  const legs = structureLegs(S1775, C1775);
  const got = legs.map((l) => [l.leg_id, l.relation, l.text, l.claims.map((c) => c.strand).join(","), l.reaches_target === true]);
  const want = [["L1", "c_1", "A check reads its input.", "L1,L2", false], ["L2", "c_2", "A check misses what no input carries.", "L1,L2", false],
    ["L3", "h_1", "A check is only as good as its input.", "L1,L2", true]];
  if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`(ay1) the derived Legs are not one per reached relation, bottom-up, the apex's alone marked: ${JSON.stringify(got)}`);
  if (legs.some((l) => "waypoints" in l || "move" in l)) fails.push("(ay1) a derived Leg carries `waypoints` or `move`");

  // (ay2)
  const missing = pathReachRefusal(legs.slice(1), S1775);
  if (!missing || !missing.includes('leaves "c_1" with no Leg')) fails.push(`(ay2) a reached relation with no Leg was not refused naming it: ${missing}`);
  const wrong = pathReachRefusal(legs.map((l) => ({ ...l, reaches_target: l.relation === "c_1" ? true : undefined })), S1775);
  if (!wrong || !wrong.includes("not the apex's alone")) fails.push(`(ay2) a marked Leg that is not the apex's was not refused: ${wrong}`);
  const apexFirst = [legs[2], legs[0], legs[1]];
  const firstOk = pathReachRefusal(apexFirst, S1775);
  if (firstOk) fails.push(`(ay2) the apex's Leg first was refused: ${firstOk}`);
  const v = compose.validateLegs(apexFirst.map((l, i) => (i === 0 ? { ...l, opens_section: "The whole" } : l)), { structure: S1775 });
  if (v.error) fails.push(`(ay2) a Reader Path with the apex's Leg first was refused by validateLegs: ${v.error}`);

  // (ay3)
  const legsMid = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id }));
  legsMid[1].reaches_target = true; // leg2 — not the last Leg.
  const rMid = readerTargetLegRefusal(legsMid);
  if (rMid) fails.push(`(ay3) a path marking a Leg that is not the last was refused: ${rMid}`);
  const none = readerTargetLegRefusal(["leg1", "leg2"].map((leg_id) => ({ leg_id })));
  if (!none || !none.includes("No Leg of this path carries `reaches_target: true`")) fails.push(`(ay3) a path marking no Leg was not refused: ${none}`);
  const two = readerTargetLegRefusal(["leg1", "leg2"].map((leg_id) => ({ leg_id, reaches_target: true })));
  if (!two || !two.includes("2 Legs carry it")) fails.push(`(ay3) a path marking two Legs was not refused: ${two}`);
}

// (az) kogaki#1449 -- A BRIEF WAYPOINT'S POINT IS READ ALONE. `validateLegs` runs
// `waypointsRefusal` with the Leg's Claims, so a waypoint whose point opens with "This" is
// refused naming the Leg, the waypoint and the word, and the same point with the noun named
// in full passes; "these <noun>" whose noun is in no Claim the waypoint serves is refused,
// and with the noun in its Claim passes. Without Claim text -- the Waypoints' call
// and every Brief read -- the rule does not apply. The Proof Sheet's `leg_path_unit` row, which
// composes a legacy Leg's waypoints and is the rule's origin since kogaki#1775, states it;
// `validateLegs` over a Leg carrying waypoints is where it refuses.
{
  const legsWith = (second, claim = "claim of s1") => [leg1276("s1", { opens_section: "Intro",
    claims: [{ type: "strand", strand: "L1", proposition: claim }],
    waypoints: [{ point: "A measure of defence takes one of two cases.", serves: ["L1"], case: "own" }, { point: second, serves: ["L1"], case: "own" }] }),
  leg1276("s2", { reaches_target: true })];
  const opens = compose.validateLegs(legsWith("This value decides which case a society is in."), []);
  if (!opens.error) fails.push("(az) a waypoint 2 point opening with \"This\" was not refused");
  else if (!/leg 1 \(s1\): waypoint 2's point opens with "This"/.test(opens.error) || !opens.error.includes("kogaki#1449")) {
    fails.push(`(az) the refusal of a point opening with "This" does not name the Leg, the waypoint and the word: ${opens.error}`);
  }
  const full = compose.validateLegs(legsWith("The measure of defence decides which case a society is in."), []);
  if (full.error) fails.push(`(az) the same point with the noun named in full was refused: ${full.error}`);
  const these = compose.validateLegs(legsWith("A society holds these values apart."), []);
  if (!these.error || !/waypoint 2's point carries "these values", and "values" is in no Claim it serves/.test(these.error)) {
    fails.push(`(az) "these <noun>" whose noun is in no Claim the waypoint serves was not refused naming it: ${these.error}`);
  }
  const grounded = compose.validateLegs(legsWith("A society holds these values apart.", "a measure of defence takes two values"), []);
  if (grounded.error) fails.push(`(az) "these <noun>" whose noun is in the waypoint's Claim was refused: ${grounded.error}`);
  const bare = compose.waypointsRefusal([{ point: "This case follows.", serves: ["L1"] }], ["L1"], "a Waypoint list", null, null, { paragraph: true });
  if (bare) fails.push(`(az) waypointsRefusal without Claim text applied the read-alone rule: ${bare}`);
  const row = JSON.parse(readFileSync("src/proof-sheet/extraction-workflow.json", "utf8")).leg_path_unit;
  if (!row || !row.judgment_point.includes("A WAYPOINT'S POINT IS READ ALONE (kogaki#1449)")) {
    fails.push("(az) the Proof Sheet's leg_path_unit row does not state the read-alone rule in its judgment point");
  }
}

// (bb) kogaki#1554 -- NO BRIEF WAYPOINT POINT CARRIES A METHOD VERB. `validateLegs` runs
// `waypointsRefusal` with the Leg's Claims, so a point carrying "can be explained at face
// value" is refused naming the Leg, the waypoint and the word, and the same point with the
// clause removed passes. A second listed verb in another form is refused too, so the case
// pins the list rather than the specimen. Without Claim text the rule does not apply.
// `METHOD_VERBS` is the one list: the Extractor imports it and declares none of its own.
{
  const legsWith = (second) => [leg1276("s1", { opens_section: "Intro",
    waypoints: [{ point: "A measure of defence takes one of two cases.", serves: ["L1"], case: "own" }, { point: second, serves: ["L1"], case: "own" }] }),
  leg1276("s2", { reaches_target: true })];
  const method = compose.validateLegs(legsWith("A country starting a war declares it acts in defence, so that the stock declaration can be explained at face value."), []);
  if (!method.error) fails.push("(bb) a waypoint 2 point carrying \"explained\" was not refused");
  else if (!/leg 1 \(s1\): waypoint 2's point carries "explained", a form of the method verb "explain"/.test(method.error) || !method.error.includes("kogaki#1554")) {
    fails.push(`(bb) the refusal of a point carrying "explained" does not name the Leg, the waypoint and the word: ${method.error}`);
  }
  const removed = compose.validateLegs(legsWith("A country starting a war declares it acts in defence."), []);
  if (removed.error) fails.push(`(bb) the same point with the clause removed was refused: ${removed.error}`);
  const other = compose.validateLegs(legsWith("A country starting a war justifies it as defence."), []);
  if (!other.error || !/waypoint 2's point carries "justifies", a form of the method verb "justify"/.test(other.error)) {
    fails.push(`(bb) a point carrying "justifies" was not refused naming the word: ${other.error}`);
  }
  const bare = compose.waypointsRefusal([{ point: "The defence is explained.", serves: ["L1"] }], ["L1"], "a Waypoint list", null, null, { paragraph: true });
  if (bare) fails.push(`(bb) waypointsRefusal without Claim text applied the method-verb rule: ${bare}`);
  if (!Array.isArray(METHOD_VERBS) || !METHOD_VERBS.includes("explain")) fails.push("(bb) src/compose/leg-schema.mjs exports no METHOD_VERBS list");
  const extractText = readFileSync("src/proof-sheet/extract.mjs", "utf8");
  if (!/import \{[^}]*\bmethodWordRefusal\b[^}]*\} from "\.\.\/compose\/leg-schema\.mjs"/.test(extractText)) {
    fails.push("(bb) src/proof-sheet/extract.mjs does not import methodWordRefusal from src/compose/leg-schema.mjs");
  }
  const schemaText = readFileSync("src/compose/leg-schema.mjs", "utf8");
  for (const v of METHOD_VERBS) {
    if (extractText.includes(`"${v}"`)) fails.push(`(bb) src/proof-sheet/extract.mjs carries a verb list of its own, naming "${v}"`);
    if (schemaText.split(`"${v}"`).length !== 2) fails.push(`(bb) src/compose/leg-schema.mjs names "${v}" outside METHOD_VERBS`);
  }
}

// (ba) kogaki#1494 — the Path Review's recoverability criterion, run through the
// `review_path` state's own resumption over a Candidate whose waypoint point
// carries "registers": a word in no served claim, no renderings entry and no
// `introduces`. The same point passes once the record declares "registers" as
// the rendering of a served word. Then adoption refuses a Leg carrying the
// retired `introduces` (kogaki#1768), naming the Leg and the field.
{
  const material = "Each defense records whether attack is the more effective means.";
  const point = "Each defense registers whether attack is the more effective means.";
  const legs = [leg1276("s1", { opens_section: "Intro", claims: [{ type: "strand", strand: "L1", proposition: material }],
    waypoints: [{ point, serves: ["L1"], case: "own" }] }), leg1276("s2", { reaches_target: true,
    claims: [{ type: "strand", strand: "L1", proposition: "attack is the more effective means" }],
    waypoints: [{ point: "attack is the more effective means", serves: ["L1"], case: "own" }] })];
  const reviewPath = (renderings) => {
    const dir = mkdtempSync(join(tmpdir(), "kogaki-1494-review-"));
    const strands = [{ display_id: "L1", slug: "defense", cite: "fixture" }];
    const runState = join(dir, "run.json");
    writeFileSync(runState, JSON.stringify({ stage: "minted", strands, strand_renderings: { defense: { headline: material } } }));
    const candsPath = join(dir, "brief-candidates.json");
    writeFileSync(candsPath, JSON.stringify([{ ...cand1276("c1"), legs }]));
    const renderingsPath = join(dir, "renderings.json");
    writeFileSync(renderingsPath, JSON.stringify({ version: "1", renderings }));
    const resultPath = join(dir, "review-result.json");
    writeFileSync(resultPath, JSON.stringify({ unreviewed: [], review: { c1: { ...Object.fromEntries(REVIEW_AREAS.map((a) => [a, a])),
      claim_register: legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) } } }));
    const rec = { _dir: dir, brief_run_state: runState, brief_candidates: candsPath, brief_renderings: renderingsPath, judgments: {} };
    const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
    const st = table.states.find((x) => x.id === "review_path");
    return STATE_WORK.review_path(rec, st, { "review-result": resultPath }, table)
      .then(() => JSON.parse(readFileSync(resolve(rec.brief_review), "utf8")).c1.recoverability);
  };
  const failing = await reviewPath([]);
  const f0 = failing && failing[0];
  if (!f0 || f0.verdict !== "fails" || f0.word !== "registers" || f0.field !== "waypoints[0].point") {
    fails.push(`(ba) the Path Review did not fail leg s1 naming "registers" in waypoints[0].point: ${JSON.stringify(failing)}`);
  }
  if (!failing || !failing[1] || failing[1].verdict !== "holds") fails.push(`(ba) leg s2, every word served, did not hold: ${JSON.stringify(failing)}`);
  const declared = await reviewPath([{ term: "records", as: "registers" }]);
  if (!declared || !declared[0] || declared[0].verdict !== "holds") fails.push(`(ba) the same point with "registers" declared as the rendering of a served word did not pass: ${JSON.stringify(declared)}`);
  const legsIntro = legs.map((l, i) => (i === 0 ? { ...l, introduces: ["registers — the word the article uses for records"] } : l));
  const viaLedger = compose.recoverabilityOf(legsIntro, { material: { L1: material } });
  if (viaLedger[0].verdict !== "holds") fails.push(`(ba) a word the Leg's introduces hands it was not recovered: ${JSON.stringify(viaLedger)}`);

  // adoption: a Leg carrying `introduces` is refused as retired (kogaki#1768), whatever the renderings record holds.
  const minted = compose.parseBriefRecord(composeBrief({ slug: "t", strands: [{ display_id: "L1", slug: "defense", cite: "fixture" }],
    thesis: "Attack decides.", composePath: "audiences/dev-to-zenn.md" }), "brief.yaml").record;
  const renderings = [{ term: "records", as: "registers" }];
  const bad = compose.fillBrief(minted, { legs: legs.map((l, i) => (i === 0 ? { ...l, introduces: ["records"] } : l)), renderings });
  if (!bad.error) fails.push("(ba) adoption did not refuse a Leg carrying `introduces`");
  else if (!/leg 1 \(s1\): carries `introduces`, which is retired/.test(bad.error)) {
    fails.push(`(ba) the adoption refusal did not name the Leg and the retired field: ${bad.error}`);
  }
  const good = compose.fillBrief(minted, { legs, renderings });
  if (good.error) fails.push(`(ba) adoption refused a path carrying no \`introduces\`: ${good.error}`);
  else if (JSON.stringify(good.record.renderings) !== JSON.stringify(renderings)) fails.push(`(ba) adoption did not write the renderings record into the Brief: ${JSON.stringify(good.record.renderings)}`);
  else {
    const read = compose.parseBriefRecord(briefRecordText(good.record), "brief.yaml");
    if (read.error || JSON.stringify(read.record.renderings) !== JSON.stringify(renderings)) fails.push(`(ba) the adopted Brief's renderings do not read back: ${read.error || JSON.stringify(read.record.renderings)}`);
  }
}

// (bd) A BRIEF WAYPOINT RECORDS ITS CASE (kogaki#1732): `validateLegs` refuses a Brief Waypoint carrying
// no `case`, a `case` other than `own` and `apart`, and a Leg whose last Waypoint is `apart`, each
// naming the Leg and the Waypoint; an `apart` Waypoint followed by an `own` one passes, `legRecord`
// writes the value, and a Waypoint list owes no `case`.
{
  const two = (a, b) => [leg1276("s1", { opens_section: "Intro", waypoints: [
    { point: "the paragraph establishes what s1 claims", serves: ["L1"], ...a },
    { point: "the paragraph carries what s1 claims onto the subject", serves: ["L1"], ...b }] }),
  leg1276("s2", { reaches_target: true })];
  for (const [what, a, b, want] of [
    ["a Brief Waypoint carrying no case", {}, { case: "own" }, /leg 1 \(s1\): waypoint 1 carries no `case`/],
    ["a case outside own and apart", { case: "own" }, { case: "elsewhere" }, /leg 1 \(s1\): waypoint 2 carries case "elsewhere"/],
    ["a Leg ending on apart", { case: "own" }, { case: "apart" }, /leg 1 \(s1\): waypoint 2 is `apart` and ends the Leg/],
  ]) {
    const r = compose.validateLegs(two(a, b), []);
    if (!r.error) fails.push(`(bd) ${what} was not refused`);
    else if (!want.test(r.error) || !r.error.includes("kogaki#1732")) fails.push(`(bd) ${what} was refused without naming the Leg and the Waypoint: ${r.error}`);
  }
  const ok = compose.validateLegs(two({ case: "apart" }, { case: "own" }), []);
  if (ok.error) fails.push(`(bd) an apart Brief Waypoint followed by an own one was refused: ${ok.error}`);
  const rec = compose.legRecord(two({ case: "apart" }, { case: "own" })[0]);
  if (rec.waypoints.map((w) => w.case).join() !== "apart,own") fails.push(`(bd) legRecord did not write each Brief Waypoint's case: ${JSON.stringify(rec.waypoints)}`);
  const pws = compose.waypointsRefusal([{ point: "A Waypoint states its point.", serves: ["L1"] }], ["L1"], "a Waypoint list",
    null, null, { paragraph: true });
  if (pws) fails.push(`(bd) a Waypoint list was refused for carrying no case: ${pws}`);
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const c = schema.waypoint.fields.case;
  if (!c || c.required !== true || JSON.stringify(c.values) !== JSON.stringify(["own", "apart"])) {
    fails.push(`(bd) src/leg-schema.json's waypoint does not declare a required \`case\` whose values are the validator's: ${JSON.stringify(c)}`);
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-path-rules");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-path-rules — the Journey use boundary retired at the Leg (kogaki#1286, kogaki#1768); the retired Discharge item and question chain each refused by name (kogaki#1283, kogaki#1325, kogaki#1699); adoption writing brief.yaml in list or map form with no line over 120 characters and no Leg reader state (kogaki#1328, kogaki#1699); the Brief's Defined Terms (kogaki#1331); no Move information reaching the Brief (kogaki#1375); Thesis attainment verified at composition (kogaki#1330); a Brief Waypoint's point read alone (kogaki#1449); no Brief Waypoint point carrying a method verb (kogaki#1554); recoverability under the renderings record failing a word in no served material and passing it once declared, with adoption refusing a Leg carrying the retired introduces (kogaki#1494, kogaki#1768); no Obligation path rule left in the Leg schema (kogaki#1699); and every Brief Waypoint carrying `case`, own or apart, with no Leg ending on apart (kogaki#1732).");
JS
