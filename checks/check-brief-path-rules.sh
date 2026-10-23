#!/usr/bin/env bash
# check-brief-path-rules — the Brief record's own rules over a whole path.
#   (am) the Journey use boundary in the record and Packet (kogaki#1286).
#   (an) review_path's Discharge item; the question chain retired (kogaki#1283,
#        kogaki#1325).
#   (av) adoption writes brief.yaml in list or map form (kogaki#1328).
#   (aw) the Brief's Defined Terms (kogaki#1331).
#   (ax) no Move information reaches the Brief (kogaki#1375).
#   (ay) Thesis attainment at composition (kogaki#1330).
#   (az) a Leg Waypoint's point is read alone (kogaki#1449).
#   (ba) recoverability under the renderings record; adoption refusing an
#        introduces entry the record renders (kogaki#1494).
# Cut from check-brief-compose.sh by kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, readdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { STATE_WORK } from "./src/brief/renderers.mjs";
import { composeBrief, validateReaderPathUnit, readerPathFitInput, readerPathFitVerdict } from "./src/brief.mjs";
import { judgePrompt } from "./src/workflow/judge.mjs";
import * as compose from "./src/compose.mjs";
import { attachReview, REVIEW_AREAS, DISCHARGE_VERDICTS } from "./src/review.mjs";
import { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg } from "./src/draft.mjs";
import { recordOf, briefOfRecord, START_1276, leg1276, cand1276, fitMoveLibrary } from "./checks/fixtures/brief-compose/fixtures.mjs";
// The Brief runtime is the entry and every module it was split into (kogaki#1466).
const briefRuntimeText = () => ["src/brief.mjs", ...readdirSync("src/brief").filter((f) => f.endsWith(".mjs"))
  .map((f) => join("src/brief", f))].map((p) => readFileSync(p, "utf8")).join("\n");
const { validateLegs, readerTargetLegRefusal, legRecord, briefRecordText, dischargeRows } = compose;
const fitMoves = fitMoveLibrary();
const fails = [];

// (am) the Journey use boundary (kogaki#1286, owner decision 2026-10-06): the Brief's
// `journey:` line carries the schema's own gloss; the rendered Packet's Journey block
// carries the Strand's served text and its cite, and none of the three use words.
{
  const leg = {
    leg_id: "s1", move: "open_the_claim", materials: ["L1"], purpose: "purpose of s1",
    reader_state_after: "orientation: after s1\nknowledge: after s1",
    depends_on: [], rationale: "why s1", claims: [{ type: "strand", strand: "L1", proposition: "claim of s1" }], waypoints: [{ point: "the paragraph establishes what s1 claims", serves: ["L1"] }],
    journeys: [{ strand: "L1", use: "contrast" }],
  };
  const written = legRecord(leg);
  const entry = (written.journeys || [])[0] || {};
  if (entry.use !== "contrast" || entry.meaning !== "to contrast this Leg's claim with the case that contrasts it") {
    fails.push(`(am) legRecord did not write the Brief's journey entry with the schema's gloss: ${JSON.stringify(entry)}`);
  }
  const brief = briefOfRecord(recordOf([leg]), "am.yaml");
  if (brief.refusals.length || brief.legs.length !== 1) fails.push(`(am) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)} legs=${brief.legs.length}`);
  else if (brief.legs[0].journeys?.[0]?.use !== "contrast") fails.push(`(am) the gloss was carried into the read Journey entry: ${JSON.stringify(brief.legs[0].journeys)}`);
  else {
    const parsedLeg = { ...brief.legs[0], journeys: [{ ...brief.legs[0].journeys[0], resolvedText: "The served Journey's own prose, verbatim." }] };
    const parsedBrief = { ...brief, legs: [parsedLeg] };
    const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
    if (split.error) fails.push(`(am) the Packet template did not split: ${split.error}`);
    else {
      const moveText = ["id: open_the_claim", "technique: >-", "  what the move does.", "question: >-",
        "  holds: none", "breaks: >-", "  what a correct performance must not do.", ""].join("\n");
      const sections = sectionsOf(parsedBrief.legs);
      const r = renderPacket({ template: split.packet, brief: parsedBrief, leg: parsedLeg, moveText, priorSections: [],
        ledgerRow: undefined, section: sectionOfLeg(parsedBrief.legs).get("s1"), sections });
      if (r.error) fails.push(`(am) the Packet for s1 did not render: ${r.error}`);
      else {
        if (!r.packet.includes("The served Journey's own prose, verbatim.")) fails.push("(am) the Packet does not carry the Journey's served text");
        for (const word of ["use: illustrate", "use: motivate", "use: contrast"]) {
          if (r.packet.includes(word)) fails.push(`(am) the Packet still carries ${JSON.stringify(word)}`);
        }
      }
    }
  }
}

// (an) review_path's added judged item "Discharge" (kogaki#1283): the
// mechanical extraction `dischargeRows` builds off a Candidate, and the
// verdicts `attachReview` accepts or refuses once the judge answers them. The
// "Question chain" item beside it is RETIRED (kogaki#1325) and its cases are
// retired with it rather than re-pointed: a record carrying `question_chain`
// is refused by name, and `questionChainPairs` is no longer exported.
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }],
    ...extra,
  });
  const legs = [legOf("s1"), legOf("s2", { depends_on: ["s1"] }), legOf("s3", { depends_on: ["s2"] })];
  const obligations = [{ kind: "question", text: "the case's generality is open", raised_by: "s1", owed_by: ["s2"], discharged_by: "s2" }];

  // the mechanical half: one row per discharged obligation, named by row
  // text, nothing compared.
  if ("questionChainPairs" in compose) fails.push("(an) src/compose.mjs still exports questionChainPairs, retired at kogaki#1325");
  const rows = dischargeRows(legs, obligations);
  if (rows.length !== 1 || rows[0].row !== obligations[0].text || rows[0].discharging_leg !== "s2"
      || JSON.stringify(rows[0].owed_legs) !== JSON.stringify([{ leg_id: "s2", points: ["the paragraph establishes what s2 claims"], claims: ["claim of s2"] }])) {
    fails.push(`(an) dischargeRows did not carry the owed Legs' points and claims (kogaki#1529): ${JSON.stringify(rows)}`);
  }

  const cand = (id, legsFor, obligationsFor = []) => ({ candidate_id: id, legs: legsFor, obligations: obligationsFor });
  // A holding claim register rides every reply here: these Legs are real Leg
  // records, so attachReview owes one entry per Leg (kogaki#1281), and these
  // cells exercise the discharge, not the register.
  const areas = () => ({ ...Object.fromEntries(REVIEW_AREAS.map((a) => [a, `reasoning for ${a}`])),
    claim_register: legs.map((l) => ({ leg_id: l.leg_id, verdict: "holds" })) });
  const dc = (verdict = "holds") => [{ row: obligations[0].text, discharging_leg: "s2", verdict, why: "s2's claim answers the row" }];

  // holds: attach is not refused on its ground.
  const ok = attachReview([cand("cand-1", legs, obligations)],
    { "cand-1": { ...areas(), discharge: dc() } });
  if (ok.error) fails.push(`(an) a well-formed discharge was refused: ${ok.error}`);

  // "fails" is DISCHARGE_VERDICTS' fail value, and is still an ADMITTED
  // verdict — it rides to the gate as reasoning, not a refusal on its own.
  const failsDischarge = attachReview([cand("cand-3", legs, obligations)],
    { "cand-3": { ...areas(), discharge: dc("fails") } });
  if (failsDischarge.error) fails.push(`(an) a "fails" discharge verdict was refused rather than carried as reasoning: ${failsDischarge.error}`);

  // a verdict outside the closed set is refused by name.
  const badVerdict = attachReview([cand("cand-4", legs, obligations)],
    { "cand-4": { ...areas(), discharge: dc("maybe") } });
  if (!badVerdict.error || !/not one of/.test(badVerdict.error)) fails.push(`(an) a discharge verdict outside the closed set was not refused by name: ${JSON.stringify(badVerdict)}`);

  // the retired question chain, carried at all, is refused by name.
  const retiredChain = attachReview([cand("cand-5", legs, obligations)],
    { "cand-5": { ...areas(), discharge: dc(),
      question_chain: [{ leg: "s1", next_leg: "s2", verdict: "same question", why: "both name the same variation" }] } });
  if (!retiredChain.error || !/question_chain.*retired/.test(retiredChain.error)) fails.push(`(an) a record carrying the retired question_chain was not refused by name: ${JSON.stringify(retiredChain)}`);

  // a discharge entry naming the wrong Leg is refused by name.
  const wrongLeg = attachReview([cand("cand-6", legs, obligations)],
    { "cand-6": { ...areas(), discharge: [{ ...dc()[0], discharging_leg: "s3" }] } });
  if (!wrongLeg.error || !/discharge entry/.test(wrongLeg.error)) fails.push(`(an) a discharge entry naming the wrong Leg was not refused by name: ${JSON.stringify(wrongLeg)}`);

  // the item is not required (check-brief-review.sh's plumbing fixtures
  // carry bare-string `legs` and no `discharge` at all; retrofitting that
  // member is not this bullet's scope) — carrying none is not refused.
  const neither = attachReview([cand("cand-7", legs, obligations)], { "cand-7": areas() });
  if (neither.error) fails.push(`(an) a review entry carrying no discharge was refused: ${neither.error}`);
}

// (av) adoption writes brief.yaml: every Leg field in list or map form, no line over 120 characters.
{
  const { adoptCandidate, selectionOptionIds } = await import("./src/assemble.mjs");
  const { parseBriefRecord } = compose;
  const fx = "checks/fixtures/adopt-candidate";
  const minted = parseBriefRecord(readFileSync(join(fx, "brief.yaml"), "utf8"), "brief.yaml");
  const reviewed = JSON.parse(readFileSync(join(fx, "reviewed.json"), "utf8"));
  const long = "a sentence long enough that no single line of the record could hold it, ".repeat(5).trim();
  const leg1 = reviewed.candidates[0].legs[0];
  leg1.purpose = long;
  leg1.reader_state_after = `knowledge: ${long}\nquestion: holds: none`;
  leg1.introduces = [{ term: "fixture term", meaning: long, nearest: "a near term", differs: "it differs" }];
  const offered = minted.error ? { error: minted.error } : selectionOptionIds(reviewed, minted.record);
  if (offered.error) fails.push(`(av) the fixture's option set cannot be composed: ${offered.error}`);
  else {
    const selection = { rows: [{ gate_id: "brief-candidate-selection",
      evidence: { tool: "AskUserQuestion", tool_use_id: "toolu_fixture_av" },
      answers_over: { option_set_digest: compose.ownerGateDigest("brief-candidate-selection", offered.ids) },
      payload: { answer: { option: "cand-a" } } }] };
    const specialization = JSON.parse(readFileSync(join(fx, "specialization.json"), "utf8"));
    const r = adoptCandidate(minted.record, reviewed, "cand-a", { selection, specialization });
    if (r.error) fails.push(`(av) adoption over the fixture refused: ${r.error}`);
    else {
      const text = briefRecordText(r.record);
      const over = text.split("\n").filter((l) => l.length > 120);
      if (over.length) fails.push(`(av) the written brief.yaml carries ${over.length} line(s) over 120 characters: ${JSON.stringify(over[0])}`);
      const back = parseBriefRecord(text, "brief.yaml");
      const path = back.error ? [] : back.record.reader_path;
      if (back.error || path.length !== 2) fails.push(`(av) the written brief.yaml does not read back with its two Legs: ${back.error || path.length}`);
      for (const leg of path) {
        for (const k of ["materials", "depends_on", "claims", "waypoints"]) {
          if (!Array.isArray(leg[k])) fails.push(`(av) ${leg.leg_id}.${k} is not a list in the record`);
        }
        if (!leg.reader_state_after || typeof leg.reader_state_after !== "object" || Array.isArray(leg.reader_state_after)) {
          fails.push(`(av) ${leg.leg_id}.reader_state_after is not a map in the record`);
        }
        if ("reader_state_before" in leg) fails.push(`(av) ${leg.leg_id} carries a before-state, which is the previous after-state and is never written`);
        if ((leg.claims || []).some((g) => typeof g !== "object" || typeof g.proposition !== "string")) fails.push(`(av) ${leg.leg_id}.claims is not a list of maps`);
        if ((leg.waypoints || []).some((w) => typeof w !== "object" || !Array.isArray(w.serves))) fails.push(`(av) ${leg.leg_id}.waypoints is not a list of maps`);
      }
      const intro = path[0]?.introduces;
      if (!Array.isArray(intro) || typeof intro[0] !== "object" || intro[0].meaning !== long) fails.push(`(av) leg1.introduces is not a list of maps carrying the meaning whole: ${JSON.stringify(intro)}`);
      if (path[0]?.purpose !== long) fails.push("(av) the lengthened purpose did not read back whole after wrapping");
      const read = readBrief(text, "brief.yaml");
      if (read.refusals.length) fails.push(`(av) the Draft's reader refused the adopted record: ${JSON.stringify(read.refusals)}`);
      else if (read.legs[1].reader_state_before !== read.legs[0].reader_state_after) fails.push("(av) leg2's before-state was not derived from leg1's after-state");
    }
  }
}

// (aw) kogaki#1331 — the Brief carries its Defined Terms, written once at mint,
// and composition refuses a `defined` word used before its introducing Leg.
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

  // Leg 2's claim uses a defined word no Leg 1 or Leg 2 introduces entry carries: refused naming the Leg, field and word.
  const legsFor = (s1Extra = {}, s2Extra = {}) => [leg1276("s1", { opens_section: "what the reader now holds", ...s1Extra }),
    leg1276("s2", { move: "m_turn", depends_on: ["s1"], reaches_target: true,
      claims: [{ type: "strand", strand: "L1", proposition: "the check reads what it was handed" }], ...s2Extra })];
  const defined = ["gate", "check"];
  const r = compose.validateLegs(legsFor(), START_1276, [], defined);
  if (!r.error) fails.push("(aw) a Leg 2 claim using a defined word no Leg introduces was not refused");
  else {
    if (!/leg 2 \(s2\)/.test(r.error)) fails.push(`(aw) the refusal did not name the Leg: ${r.error}`);
    if (!/claims\[0\]\.proposition/.test(r.error)) fails.push(`(aw) the refusal did not name the field: ${r.error}`);
    if (!/"check"/.test(r.error)) fails.push(`(aw) the refusal did not name the word: ${r.error}`);
  }
  // the same Candidate with the entry added passes.
  const added = compose.validateLegs(legsFor({}, { introduces: ["check"] }), START_1276, [], defined);
  if (added.error) fails.push(`(aw) the Candidate with the introduces entry added was refused: ${added.error}`);
  // a Thesis word used in Leg 1's claim and carried by Leg 1's introduces passes.
  const thesisWord = compose.validateLegs(legsFor(
    { claims: [{ type: "strand", strand: "L1", proposition: "a gate passes only what it was given" }], introduces: ["gate"] },
    { introduces: ["check"] }), START_1276, [], defined);
  if (thesisWord.error) fails.push(`(aw) a Thesis word carried by Leg 1's introduces and used in Leg 1's claim was refused: ${thesisWord.error}`);
  // the mint's judged row asks for the record the refusal reads.
  const row = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).defined_terms_unit;
  if (!row || !judgePrompt(row, "", null, null).includes("defined_terms_record")) {
    fails.push("(aw) src/brief-workflow.json declares no defined_terms_unit row rendering candidate-schema.json's defined_terms_record");
  }
}

// (ax) kogaki#1375 -- NO MOVE INFORMATION REACHES THE BRIEF. A Leg Waypoint carries
// `point` and `serves` only: a waypoint carrying `move` or `segments` is refused by name,
// naming the Leg and the waypoint, by `validateLegs` -- at the compose unit's validator and
// at every Brief read, which run it through `waypointsRefusal` -- and `legRecord` writes
// neither. The Leg schema declares neither field, the Brief workflow table carries no
// paragraph-Move row, and compose_path declares no paragraph-Move judge: the paragraph Move
// is bound by /paragraph-plan, after the Brief.
{
  const legsWith = (w) => [leg1276("s1", { opens_section: "Intro", waypoints: [{ point: "the term is defined", serves: ["L1"], ...w }] }),
    leg1276("s2", { depends_on: ["s1"], reaches_target: true })];
  for (const f of compose.RETIRED_WAYPOINT_MOVE_FIELDS) {
    const r = compose.validateLegs(legsWith({ [f]: "p_define" }), START_1276, [], []);
    if (!r.error) fails.push(`(ax) a waypoint carrying \`${f}\` was not refused`);
    else if (!new RegExp(`leg 1 \\(s1\\): waypoint 1 carries \`${f}\`, which is retired`).test(r.error) || !r.error.includes("kogaki#1375")) {
      fails.push(`(ax) a waypoint carrying \`${f}\` was refused without naming the field, the Leg and the waypoint: ${r.error}`);
    }
    const unit = validateReaderPathUnit(cand1276("c-ax", { waypoints: [{ point: "a point", serves: ["L1"], [f]: "x" }] }),
      { strandIds: ["L1"], readerStart: START_1276 });
    if (!unit.error || !unit.error.includes(`carries \`${f}\`, which is retired`)) fails.push(`(ax) the compose unit's validator did not refuse a waypoint carrying \`${f}\`: ${unit.error}`);
  }
  const plain = compose.validateLegs(legsWith({}), START_1276, [], []);
  if (plain.error) fails.push(`(ax) a waypoint carrying point and serves alone was refused: ${plain.error}`);
  const rec = compose.legRecord({ ...leg1276("s1"), waypoints: [{ point: "a point", serves: ["L1"], move: "p", segments: "1. x" }] });
  if (rec.waypoints.some((w) => Object.keys(w).sort().join() !== "point,serves")) fails.push(`(ax) legRecord wrote a waypoint field other than point and serves: ${JSON.stringify(rec.waypoints)}`);
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  for (const f of ["move", "segments"]) {
    if (schema.waypoint.fields[f]) fails.push(`(ax) src/leg-schema.json's waypoint still declares \`${f}\``);
  }
  if (JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).paragraph_move_unit) fails.push("(ax) src/brief-workflow.json still carries the paragraph_move_unit row");
  const brief = briefRuntimeText();
  if (/bindJudge|paragraphMove(Prompts|Verdict)/.test(brief)) fails.push("(ax) the Brief runtime still declares the paragraph-Move judge inside the compose job");
}

// (ay) kogaki#1330 — Thesis attainment is verified at composition, at the Leg
// marked `reaches_target`, and at no other Leg. (ay1) the per-unit fit input
// carries the Brief's Thesis beside the Candidate; (ay2) a fit record whose
// marked-Leg (s2) verdict is `contradicts` naming the Thesis is read as the
// unit's own schema refusal, carrying the judge's sentence, as every
// `contradicts` verdict is; (ay3) a path with a closing Leg after the marked
// Leg still passes `readerTargetLegRefusal` exactly as it does today -- this
// Issue adds no rule about which Leg is last.
{
  const THESIS = "A check is only as good as what it is given.";

  // (ay1)
  const j = readerPathFitInput(cand1276("c1"), fitMoves, START_1276, THESIS);
  if (j.error) fails.push(`(ay1) readerPathFitInput refused: ${j.error}`);
  else if (j.input.candidate_you_must_judge.thesis !== THESIS) {
    fails.push(`(ay1) the per-unit fit input does not carry the Brief's Thesis: ${JSON.stringify(j.input.candidate_you_must_judge.thesis)}`);
  }

  // (ay2)
  const cand = cand1276("c1"); // legs[0] = s1, legs[1] = s2 (marked reaches_target: true)
  const verdict = (leg, v, why) => ({ leg_id: leg.leg_id, move: leg.move, verdict: v, why });
  const WHY_THESIS = `the after-state never states ${JSON.stringify(THESIS)} in words the reader could repeat.`;
  const rec = { version: "1", candidate_id: "c1",
    verdicts: [verdict(cand.legs[0], "consistent", "the after-state specializes the Move's after."),
      verdict(cand.legs[1], "contradicts", WHY_THESIS)] };
  const v = readerPathFitVerdict(rec, cand);
  if (v.error) fails.push(`(ay2) a contradicts record on the marked Leg was refused as malformed rather than read: ${v.error}`);
  else if (!v.refusal || !v.refusal.includes(`Leg s2 (m_turn): contradicts — the judge wrote: "${WHY_THESIS}"`)
      || !/Compose the Candidate again/.test(v.refusal) || !(v.failures || []).some((f) => f.leg_id === "s2")) {
    fails.push(`(ay2) a marked-Leg contradicts naming the Thesis was not read as the unit's refusal with the judge's sentence: ${JSON.stringify(v)}`);
  }
  const table1330 = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_fit_unit;
  if (!/the input's `thesis` carries the Brief's adopted Thesis/.test(table1330.judgment_point)
      || !/ONLY ON THE LEG MARKED `reaches_target`/.test(table1330.judgment_point)) {
    fails.push("(ay2) the reader_path_fit_unit row does not name the Thesis question at the marked Leg");
  }

  // (ay3) a closing Leg after the marked one still passes, unchanged.
  const legsWithClose = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id, reader_state_after: "orientation: settled\nknowledge: the basics" }));
  legsWithClose[1].reaches_target = true; // leg2 — not the last Leg.
  const rClose = readerTargetLegRefusal(legsWithClose);
  if (rClose) fails.push(`(ay3) a path with a closing Leg after the marked one was refused: ${rClose}`);
}

// (az) kogaki#1449 -- A LEG WAYPOINT'S POINT IS READ ALONE. `validateLegs` runs
// `waypointsRefusal` with the Leg's Claims, so a waypoint whose point opens with "This" is
// refused naming the Leg, the waypoint and the word, and the same point with the noun named
// in full passes; "these <noun>" whose noun is in no Claim the waypoint serves is refused,
// and with the noun in its Claim passes. Without Claim text -- the Paragraph Waypoints' call
// and every Brief read -- the rule does not apply. The reader_path_unit row states the rule.
{
  const legsWith = (second, claim = "claim of s1") => [leg1276("s1", { opens_section: "Intro",
    claims: [{ type: "strand", strand: "L1", proposition: claim }],
    waypoints: [{ point: "A measure of defence takes one of two cases.", serves: ["L1"] }, { point: second, serves: ["L1"] }] }),
  leg1276("s2", { depends_on: ["s1"], reaches_target: true })];
  const opens = compose.validateLegs(legsWith("This value decides which case a society is in."), START_1276, [], []);
  if (!opens.error) fails.push("(az) a waypoint 2 point opening with \"This\" was not refused");
  else if (!/leg 1 \(s1\): waypoint 2's point opens with "This"/.test(opens.error) || !opens.error.includes("kogaki#1449")) {
    fails.push(`(az) the refusal of a point opening with "This" does not name the Leg, the waypoint and the word: ${opens.error}`);
  }
  const full = compose.validateLegs(legsWith("The measure of defence decides which case a society is in."), START_1276, [], []);
  if (full.error) fails.push(`(az) the same point with the noun named in full was refused: ${full.error}`);
  const these = compose.validateLegs(legsWith("A society holds these values apart."), START_1276, [], []);
  if (!these.error || !/waypoint 2's point carries "these values", and "values" is in no Claim it serves/.test(these.error)) {
    fails.push(`(az) "these <noun>" whose noun is in no Claim the waypoint serves was not refused naming it: ${these.error}`);
  }
  const grounded = compose.validateLegs(legsWith("A society holds these values apart.", "a measure of defence takes two values"), START_1276, [], []);
  if (grounded.error) fails.push(`(az) "these <noun>" whose noun is in the waypoint's Claim was refused: ${grounded.error}`);
  const bare = compose.waypointsRefusal([{ point: "This case follows.", serves: ["L1"] }], ["L1"], "a Paragraph Waypoint list");
  if (bare) fails.push(`(az) waypointsRefusal without Claim text applied the read-alone rule: ${bare}`);
  const row = JSON.parse(readFileSync("src/brief-workflow.json", "utf8")).reader_path_unit;
  if (!row.judgment_point.includes("A WAYPOINT'S POINT IS READ ALONE (kogaki#1449)") || !row.refusal.includes("(kogaki#1449)")) {
    fails.push("(az) the reader_path_unit row does not state the read-alone rule in its judgment point and its refusal");
  }
}

// (ba) kogaki#1494 — the Path Review's recoverability criterion, run through the
// `review_path` state's own resumption over a Candidate whose waypoint point
// carries "registers": a word in no served claim, no renderings entry and no
// `introduces`. The same point passes once the record declares "registers" as
// the rendering of a served word. Then adoption refuses an `introduces` entry
// whose term the record renders, naming the term and the entry.
{
  const material = "Each defense records whether attack is the more effective means.";
  const point = "Each defense registers whether attack is the more effective means.";
  const legs = [leg1276("s1", { opens_section: "Intro", claims: [{ type: "strand", strand: "L1", proposition: material }],
    waypoints: [{ point, serves: ["L1"] }] }), leg1276("s2", { move: "m_turn", depends_on: ["s1"], reaches_target: true,
    claims: [{ type: "strand", strand: "L1", proposition: "attack is the more effective means" }],
    waypoints: [{ point: "attack is the more effective means", serves: ["L1"] }] })];
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

  // adoption: an introduces entry whose term the record renders is refused, naming both.
  const minted = compose.parseBriefRecord(composeBrief({ slug: "t", strands: [{ display_id: "L1", slug: "defense", cite: "fixture" }],
    thesis: "Attack decides.", composePath: "audiences/dev-to-zenn.md" }), "brief.yaml").record;
  const renderings = [{ term: "records", as: "registers" }];
  const bad = compose.fillBrief(minted, { legs: legs.map((l, i) => (i === 0 ? { ...l, introduces: ["records"] } : l)), readerStart: START_1276, renderings });
  if (!bad.error) fails.push("(ba) adoption did not refuse an introduces entry whose term the renderings record renders");
  else if (!/introduces "records", which the renderings record renders/.test(bad.error) || !/\{ term: "records", as: "registers" \}/.test(bad.error)) {
    fails.push(`(ba) the adoption refusal did not name the term and the entry: ${bad.error}`);
  }
  const good = compose.fillBrief(minted, { legs, readerStart: START_1276, renderings });
  if (good.error) fails.push(`(ba) adoption refused a path whose introduces carries no rendered term: ${good.error}`);
  else if (JSON.stringify(good.record.renderings) !== JSON.stringify(renderings)) fails.push(`(ba) adoption did not write the renderings record into the Brief: ${JSON.stringify(good.record.renderings)}`);
  else {
    const read = compose.parseBriefRecord(briefRecordText(good.record), "brief.yaml");
    if (read.error || JSON.stringify(read.record.renderings) !== JSON.stringify(renderings)) fails.push(`(ba) the adopted Brief's renderings do not read back: ${read.error || JSON.stringify(read.record.renderings)}`);
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-path-rules");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-path-rules — the Journey use boundary (kogaki#1286); review_path's Discharge item and the retired question chain (kogaki#1283, kogaki#1325); adoption writing brief.yaml in list or map form with no line over 120 characters (kogaki#1328); the Brief's Defined Terms (kogaki#1331); no Move information reaching the Brief (kogaki#1375); Thesis attainment verified at composition (kogaki#1330); a Leg Waypoint's point read alone (kogaki#1449); and recoverability under the renderings record failing a word in no served material and passing it once declared, with adoption refusing an introduces entry the record renders (kogaki#1494).");
JS
