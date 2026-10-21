#!/usr/bin/env bash
# check-brief-closure — the Closure ledger and Reader target Leg rules of
# Brief composition (kogaki#1229, kogaki#1231, kogaki#1232). A LIGHT member:
# pure validator calls over fixture paths, no model run.
#   (f)-(g) the Thesis Closure row reaches only the Leg marked
#           `reaches_target`; exactly one Leg is marked, never the first.
#   (h)-(i) a closing Leg introduces nothing, raises nothing, and holds the
#           target Leg's orientation and knowledge.
#   (j)-(k) the target after-state is read off the marked Leg, and the mark
#           reaches the Packet through legRecord and readBrief.
#   (l)-(m) at most one conceded row per path, one open row per Leg.
#   (n) a row no waypoint serves is named, with its Leg, to Path Review.
# Cut from check-brief-compose.sh by kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync } from "node:fs";
import { targetLegIds, targetLegAfterState } from "./src/assemble.mjs";
import { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg, readerTargetLine,
  REACHES_TARGET_LINE, CLOSING_LEG_LINE } from "./src/draft.mjs";
import * as compose from "./src/compose.mjs";
import { recordOf, briefOfRecord } from "./checks/fixtures/brief-compose/fixtures.mjs";
const { validateLegs, closureRowsOf, readerTargetLegRefusal, legRecord } = compose;
const fails = [];

// (f) the Thesis Closure row reaches only the Reader target Leg (kogaki#1229, kogaki#1231).
{
  const legs = ["leg1", "leg2", "leg3", "leg4", "leg5", "leg6"].map((leg_id) => ({ leg_id }));
  legs[3].reaches_target = true; // leg4 — not the last Leg, and not the first.
  const named = targetLegIds(legs);
  if (JSON.stringify(named) !== JSON.stringify(["leg4"])) fails.push(`(f) targetLegIds named ${JSON.stringify(named)}, want ["leg4"]`);
  if (targetLegIds([]).length !== 0) fails.push("(f) targetLegIds over no Legs named a Leg");
  // A Brief record over the same path: the Thesis row is derived from the
  // Strand coverage (kogaki#1328), and one Leg row raised and kept early.
  const doc = {
    thesis: "The whole claim.", reader_path: legs,
    strand_coverage: [{ strand: "L1", used_by_legs: ["leg4"], role_in_thesis: "The whole claim holds once the target Leg lands." }],
    closure: [{ text: "an obligation raised early", introduced_by: "leg1", discharged_by: "leg3" }],
  };
  for (const { leg_id } of legs) {
    const rows = closureRowsOf(doc, leg_id);
    const carries = rows.some((r) => /whole claim holds/.test(r.text));
    if (leg_id === "leg4" && !carries) fails.push("(f) the target Leg's Packet carries no Thesis row");
    if (leg_id !== "leg4" && carries) fails.push(`(f) ${leg_id}'s Packet carries the Thesis row, which only the target Leg's may`);
  }
  const leg1 = closureRowsOf(doc, "leg1");
  if (!leg1.some((r) => /obligation raised early/.test(r.text))) fails.push("(f) the Leg rows stopped reaching the Leg that introduced them");
}

// (g) readerTargetLegRefusal — exactly one Leg marked, and never the first.
{
  const base = () => ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id, reader_state_after: "orientation: settled\nknowledge: the basics" }));

  const zero = base();
  const rZero = readerTargetLegRefusal(zero);
  if (!rZero) fails.push("(g) a path with no Leg marked reaches_target was not refused");
  else if (!/reaches_target_marked/.test(rZero) && !/Reader target Leg/.test(rZero)) fails.push(`(g) the zero-marked refusal did not name the rule: ${rZero}`);

  const two = base();
  two[0].reaches_target = true;
  two[2].reaches_target = true;
  const rTwo = readerTargetLegRefusal(two);
  if (!rTwo) fails.push("(g) a path with two Legs marked reaches_target was not refused");
  else if (!/2 Legs carry it/.test(rTwo)) fails.push(`(g) the two-marked refusal did not count the Legs: ${rTwo}`);

  const first = base();
  first[0].reaches_target = true;
  const rFirst = readerTargetLegRefusal(first);
  if (!rFirst) fails.push("(g) a path marking its first Leg reaches_target was not refused");
  else if (!/leg 1 \(leg1\)/.test(rFirst)) fails.push(`(g) the first-Leg refusal did not name the Leg: ${rFirst}`);

  const one = base();
  one[1].reaches_target = true;
  const rOne = readerTargetLegRefusal(one);
  if (rOne) fails.push(`(g) exactly one Leg, not the first, marked reaches_target was refused: ${rOne}`);
}

// (h) a closing Leg introduces nothing and raises nothing (kogaki#1231).
{
  const STATE = "orientation: settled\nknowledge: the basics";
  const withIntroduces = [
    { leg_id: "leg1", reader_state_after: STATE },
    { leg_id: "leg2", reaches_target: true, reader_state_after: STATE },
    { leg_id: "leg3", reader_state_after: STATE, introduces: ["term"] },
  ];
  const rIntroduces = readerTargetLegRefusal(withIntroduces);
  if (!rIntroduces) fails.push("(h) a closing Leg carrying introduces was not refused");
  else {
    if (!/leg 3 \(leg3\)/.test(rIntroduces)) fails.push(`(h) the introduces refusal did not name the Leg: ${rIntroduces}`);
    if (!/closing_leg_introduces_nothing/.test(rIntroduces) && !/introduces nothing/.test(rIntroduces)) fails.push(`(h) the introduces refusal did not name the rule: ${rIntroduces}`);
  }

  const withClosureRow = [
    { leg_id: "leg1", reader_state_after: STATE },
    { leg_id: "leg2", reaches_target: true, reader_state_after: STATE },
    { leg_id: "leg3", reader_state_after: STATE },
  ];
  const obligations = [{ text: "a promise raised late", introduced_by: "leg3", discharged_by: "leg3" }];
  const rClosureRow = readerTargetLegRefusal(withClosureRow, obligations);
  if (!rClosureRow) fails.push("(h) a closing Leg named introduced_by on a Closure row was not refused");
  else if (!/leg 3 \(leg3\)/.test(rClosureRow)) fails.push(`(h) the Closure-row refusal did not name the Leg: ${rClosureRow}`);

  const clean = readerTargetLegRefusal(withClosureRow, []);
  if (clean) fails.push(`(h) a closing Leg raising no Closure row was refused: ${clean}`);
}

// (i) a closing Leg's orientation and knowledge hold at the target Leg's (kogaki#1231).
{
  const TARGET_STATE = "orientation: settled\nknowledge: the basics";
  const mismatched = [
    { leg_id: "leg1", reader_state_after: TARGET_STATE },
    { leg_id: "leg2", reaches_target: true, reader_state_after: TARGET_STATE },
    { leg_id: "leg3", reader_state_after: "orientation: unsettled\nknowledge: the basics" },
  ];
  const rMismatch = readerTargetLegRefusal(mismatched);
  if (!rMismatch) fails.push("(i) a closing Leg whose orientation line differs from the target Leg's was not refused");
  else {
    if (!/leg 3 \(leg3\)/.test(rMismatch)) fails.push(`(i) the mismatch refusal did not name the Leg: ${rMismatch}`);
    if (!/closing_leg_state_fixed/.test(rMismatch) && !/hold at the target/.test(rMismatch)) fails.push(`(i) the mismatch refusal did not name the rule: ${rMismatch}`);
  }

  const freeLines = [
    { leg_id: "leg1", reader_state_after: TARGET_STATE },
    { leg_id: "leg2", reaches_target: true, reader_state_after: `${TARGET_STATE}\nquestion: holds: none\ntrust: the default` },
    { leg_id: "leg3", reader_state_after: `${TARGET_STATE}\nquestion: holds: a new one\ntrust: a different default` },
  ];
  const rFree = readerTargetLegRefusal(freeLines);
  if (rFree) fails.push(`(i) a closing Leg differing only in question/trust was refused: ${rFree}`);
}

// (j) the derivation: targetLegAfterState reads the marked Leg's reader_state_after (kogaki#1231).
{
  const AFTER = "orientation: settled\nknowledge: the basics";
  const legs = [
    { leg_id: "leg1", reader_state_after: "orientation: unsettled\nknowledge: none" },
    { leg_id: "leg2", reaches_target: true, reader_state_after: AFTER },
    { leg_id: "leg3", reader_state_after: AFTER },
  ];
  const got = targetLegAfterState(legs);
  if (got !== AFTER) fails.push(`(j) targetLegAfterState read ${JSON.stringify(got)}, want the marked Leg's after-state ${JSON.stringify(AFTER)}`);

  const noneMarked = legs.map((s) => ({ ...s, reaches_target: undefined }));
  if (targetLegAfterState(noneMarked) !== null) fails.push("(j) targetLegAfterState read a value with no Leg marked reaches_target");
}

// (k) the mark reaches the Packet (kogaki#1231, acceptance item 4): written by legRecord,
// read back by readBrief, and rendered under `## This Leg` on the marked Leg and
// on each closing Leg, and on no Leg before the mark.
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }],
    ...extra,
  });
  const marked = legRecord(legOf("s2", { reaches_target: true }));
  const plain = legRecord(legOf("s1"));
  if (marked.reaches_target !== true) fails.push(`(k) legRecord wrote no reaches_target key on the marked Leg: ${JSON.stringify(marked)}`);
  if ("reaches_target" in plain) fails.push(`(k) legRecord wrote a reaches_target key on an unmarked Leg: ${JSON.stringify(plain)}`);

  const pair = [legOf("s1"), legOf("s2", { reaches_target: true })];
  const back = briefOfRecord(recordOf(pair), "k.yaml");
  if (back.refusals.length || back.legs[1].reaches_target !== true) fails.push(`(k) readBrief did not read the mark back: ${JSON.stringify(back.refusals)}`);
  else if (back.legs[0].reaches_target !== undefined) fails.push(`(k) readBrief read a mark off an unmarked Leg: ${JSON.stringify(back.legs[0])}`);
  const halfRecord = recordOf(pair);
  halfRecord.reader_path[1].reaches_target = false;
  const half = briefOfRecord(halfRecord, "k.yaml");
  if (!half.refusals.some((r) => /leg s2/.test(r) && /reaches_target/.test(r))) fails.push(`(k) a reaches_target value other than true was not refused naming the Leg: ${JSON.stringify(half.refusals)}`);

  const legs = [legOf("s1"), legOf("s2", { reaches_target: true }), legOf("s3")];
  if (readerTargetLine(legs, "s1") !== "") fails.push("(k) readerTargetLine rendered a line on a Leg before the mark");
  if (readerTargetLine(legs, "s2") !== REACHES_TARGET_LINE) fails.push("(k) readerTargetLine did not render the target line on the marked Leg");
  if (readerTargetLine(legs, "s3") !== CLOSING_LEG_LINE) fails.push("(k) readerTargetLine did not render the closing line on the Leg after the mark");
  if (readerTargetLine([legOf("s1"), legOf("s2")], "s2") !== "") fails.push("(k) readerTargetLine rendered a line on a path carrying no mark");

  // THE RENDERED PACKET, over the real template and a Brief read back from its own record.
  const brief = briefOfRecord(recordOf(legs), "k.yaml");
  if (brief.refusals.length || brief.legs.length !== 3) fails.push(`(k) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)} legs=${brief.legs.length}`);
  const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
  if (split.error) fails.push(`(k) the Packet template did not split: ${split.error}`);
  const moveText = [
    "id: open_the_claim", "technique: >-", "  what the move does.", "question: >-", "  holds: none",
    "breaks: >-", "  what a correct performance must not do.", "",
  ].join("\n");
  const sections = sectionsOf(brief.legs);
  const packets = {};
  for (const leg of brief.legs) {
    const r = renderPacket({ template: split.packet, brief, leg, moveText, priorSections: [],
      ledgerRow: undefined, section: sectionOfLeg(brief.legs).get(leg.leg_id), sections });
    if (r.error) { fails.push(`(k) the Packet for ${leg.leg_id} did not render: ${r.error}`); continue; }
    packets[leg.leg_id] = r.packet;
  }
  const carries = (id, line) => (packets[id] || "").includes(line);
  if (carries("s1", REACHES_TARGET_LINE) || carries("s1", CLOSING_LEG_LINE)) fails.push("(k) the Packet of a Leg before the mark carries a Reader target line");
  if (!carries("s2", REACHES_TARGET_LINE)) fails.push("(k) the Packet of the marked Leg does not carry the target line");
  if (carries("s2", CLOSING_LEG_LINE)) fails.push("(k) the Packet of the marked Leg carries the closing-Leg line");
  if (!carries("s3", CLOSING_LEG_LINE)) fails.push("(k) the Packet of the closing Leg does not carry the closing-Leg line");
  if (carries("s3", REACHES_TARGET_LINE)) fails.push("(k) the Packet of the closing Leg carries the target line");
  if (packets.s2 && !/## The Section this Leg sits in[\s\S]*This Leg reaches the Reader target\.[\s\S]*## What crosses into this Leg/.test(packets.s2)) fails.push("(k) the target line is not rendered inside the `## The Section this Leg sits in` block");
}

// (l) closureLedgerRefusal — at most one conceded_by row in the path (kogaki#1232).
{
  const { closureLedgerRefusal } = compose;
  if (typeof closureLedgerRefusal !== "function") fails.push("(l) src/compose.mjs exports no closureLedgerRefusal");
  else {
    const legs = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id }));
    const twoConceded = [
      { text: "a question set aside early", introduced_by: "leg1", conceded_by: "leg1", open: "what stays unresolved", why_not_here: "not this Leg's to close", reader_keeps: "a named open question" },
      { text: "a question set aside late", introduced_by: "leg2", conceded_by: "leg3", open: "what stays unresolved", why_not_here: "not this Leg's to close", reader_keeps: "a named open question" },
    ];
    const rTwo = closureLedgerRefusal(legs, twoConceded);
    if (!rTwo) fails.push("(l) two conceded_by rows in one path were not refused");
    else {
      if (!/at most one conceded row in the path/.test(rTwo)) fails.push(`(l) the refusal did not name the rule: ${rTwo}`);
      if (!/a question set aside early/.test(rTwo) || !/a question set aside late/.test(rTwo)) fails.push(`(l) the refusal did not name both rows: ${rTwo}`);
    }

    const oneConceded = [twoConceded[0]];
    const rOne = closureLedgerRefusal(legs, oneConceded);
    if (rOne) fails.push(`(l) exactly one conceded_by row was refused: ${rOne}`);

    // A row whose introduced_by and conceded_by name the SAME Leg is the ordinary case.
    const sameLeg = [{ text: "set aside where raised", introduced_by: "leg2", conceded_by: "leg2", open: "what stays unresolved", why_not_here: "not this Leg's to close", reader_keeps: "a named open question" }];
    const rSame = closureLedgerRefusal(legs, sameLeg);
    if (rSame) fails.push(`(l) a row conceded in the Leg that raised it was refused: ${rSame}`);
  }
}

// (m) closureLedgerRefusal — at most one row open on any given Leg (kogaki#1232). The
// shape mirrors the owner's 2026-09-30 finding over theses/check-only-good-what-given's
// ledger: three rows raised at leg1, leg2 and leg3, closed at leg5, leg5 and leg4 --
// three rows open at leg3 (kogaki#1232's "What was observed").
{
  const { closureLedgerRefusal } = compose;
  const legs = ["leg1", "leg2", "leg3", "leg4", "leg5"].map((leg_id) => ({ leg_id }));
  const threeOpenAtLeg3 = [
    { text: "row A", introduced_by: "leg1", discharged_by: "leg5" },
    { text: "row B", introduced_by: "leg2", discharged_by: "leg5" },
    { text: "row C", introduced_by: "leg3", discharged_by: "leg4" },
  ];
  const rThree = closureLedgerRefusal(legs, threeOpenAtLeg3);
  if (!rThree) fails.push("(m) three rows open at one Leg were not refused");
  else {
    if (!/at most one row open at any given Leg/.test(rThree)) fails.push(`(m) the refusal did not name the rule: ${rThree}`);
    if (!/leg 2 \(leg2\)/.test(rThree)) fails.push(`(m) the refusal did not name the Leg: ${rThree}`);
    if (!/row A/.test(rThree) || !/row B/.test(rThree)) fails.push(`(m) the refusal did not name the rows open there: ${rThree}`);
  }

  // A row open on exactly one Leg at a time, nowhere doubled, is not refused.
  const oneAtATime = [
    { text: "row A", introduced_by: "leg1", discharged_by: "leg2" },
    { text: "row B", introduced_by: "leg2", discharged_by: "leg3" },
  ];
  const rClean = closureLedgerRefusal(legs, oneAtATime);
  if (rClean) fails.push(`(m) a path with at most one row open at any Leg was refused: ${rClean}`);

  // A row raised and conceded in the same Leg is open on no Leg — it is never
  // counted against another row genuinely open there.
  const settledInPlace = [
    { text: "row A", introduced_by: "leg2", discharged_by: "leg4" },
    { text: "row B", introduced_by: "leg2", conceded_by: "leg2", open: "what stays unresolved", why_not_here: "not this Leg's to close", reader_keeps: "a named open question" },
  ];
  const rSettled = closureLedgerRefusal(legs, settledInPlace);
  if (rSettled) fails.push(`(m) a row conceded in its own raising Leg was counted as open there: ${rSettled}`);
  // ...and validateLegs runs the same check over a full path, refusing at the same ground.
  const fullLegs = legs.map((s) => ({ ...s, move: "m", materials: ["L1"], purpose: `purpose of ${s.leg_id}`,
    reader_state_after: `orientation: after ${s.leg_id}\nknowledge: after ${s.leg_id}`,
    depends_on: [], rationale: `why ${s.leg_id}`, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${s.leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${s.leg_id} claims`, serves: ["L1"] }] }));
  fullLegs[0].opens_section = "A Section";
  fullLegs[3].reaches_target = true;
  const rFull = validateLegs(fullLegs, "", threeOpenAtLeg3);
  if (!rFull.error) fails.push("(m) validateLegs did not refuse a full path over the same three-open ledger");
  else if (!/at most one row open at any given Leg/.test(rFull.error)) fails.push(`(m) validateLegs's refusal did not name the rule: ${rFull.error}`);
}

// (n) a Leg party to a Closure row with no waypoint serving it is named, with the row,
// in the Path Review's input (kogaki#1496). The Packet renders the row as material and
// asks for no sentence, so a row no point answers is read here, at the Brief.
{
  const { dischargeRows } = compose;
  const ROW = "why the installer's copy is overwritten on every run";
  const legs = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
    // No waypoint of any Leg speaks to the row.
    waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }] }));
  const obligations = [{ text: ROW, introduced_by: "leg1", discharged_by: "leg3" }];
  if (legs.some((l) => l.waypoints.some((w) => w.point.includes("overwritten")))) fails.push("(n) the fixture's waypoints serve the row, so the case is not the one (n) names");
  const rows = dischargeRows(legs, obligations);
  if (rows.length !== 1) fails.push(`(n) the Path Review's discharge input carries ${rows.length} entries for one discharged row`);
  else {
    const [e] = rows;
    if (e.row !== ROW) fails.push(`(n) the Path Review's discharge input does not name the row: ${JSON.stringify(e)}`);
    if (e.discharging_leg !== "leg3") fails.push(`(n) the Path Review's discharge input does not name the discharging Leg: ${JSON.stringify(e)}`);
    if (e.introduced_by !== "leg1") fails.push(`(n) the Path Review's discharge input does not name the introducing Leg: ${JSON.stringify(e)}`);
    if (JSON.stringify(e.claims) !== JSON.stringify(["claim of leg3"])) fails.push(`(n) the discharge input does not carry the discharging Leg's own claims: ${JSON.stringify(e.claims)}`);
  }
  // The input rides into the per-Candidate review prompt, whose judgment point reads it.
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const unit = JSON.stringify(table.review_path_unit || {});
  if (!/discharge_rows/.test(unit) || !/one entry per Closure row carrying `discharged_by`/.test(unit)) {
    fails.push("(n) the review_path_unit row no longer reads `discharge_rows` with one entry per discharged Closure row");
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-closure");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-closure — the Thesis Closure row reaching only the Reader target Leg, the reaches_target marking rule (zero/two/first-Leg refused), a closing Leg introducing nothing and raising nothing, a closing Leg's orientation/knowledge held at the target Leg's, the Reader target derivation reading the marked Leg regardless of position, the mark reaching the Packet, the Closure ledger's at-most-one conceded row and one open row per Leg, and the Path Review's input naming a Closure row and its discharging Leg where no waypoint serves the row (kogaki#1229, kogaki#1231, kogaki#1232, kogaki#1496).");
JS
