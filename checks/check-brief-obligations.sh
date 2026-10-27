#!/usr/bin/env bash
# check-brief-obligations — the Obligation ledger and Reader target Leg rules
# of Brief composition (kogaki#1229, #1231, #1232, #1529, #1612). A LIGHT member:
# pure validator calls over fixture paths, no model run.
#   (f)-(k) the Thesis row and the Reader target Leg: the mark, closing Legs,
#           the target after-state, and the mark reaching the Packet.
#   (l) the record opens once, closes item by item (#1612); (m) capacity;
#   (n) `discharge_rows`; (o) items close after opening, in order; (p) no
#   Section inside a record; (q) none open at the end, retired fields by name.
#   (r) `introduces` `kind`; (s) a Move's slot, no count; (t) `closure`; (u) no
#   Obligation item in `names`; (v) a record's `items`; (w) three items pass a
#   one-item slot; (x) a Leg only naming its items does not close them (#1603).
# Renamed from check-brief-closure.sh by kogaki#1529; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { targetLegIds, targetLegAfterState } from "./src/assemble.mjs";
import { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg, readerTargetLine,
  REACHES_TARGET_LINE, CLOSING_LEG_LINE } from "./src/draft.mjs";
import * as compose from "./src/compose.mjs";
import { recordOf, briefOfRecord } from "./checks/fixtures/brief-compose/fixtures.mjs";
const { validateLegs, obligationRowsOf, readerTargetLegRefusal, legRecord, obligationLedgerRefusal } = compose;
const fails = [];
// A Move record carrying no `obligation`, the check's own (kogaki#1625).
const MOVE_TEMPLATE = `id: name_the_consequence_then_define_the_name
description: >-
  Names a consequence, then gives that name its meaning in the same step.
before:
  knowledge: holds a cause and wants its consequence
after:
  knowledge: holds the consequence and what its name means
breaks:
  - drop the definition — the name stays a label the reader cannot use
segments:
  - operation: names the consequence a cause leads to
  - operation: gives the name just used its meaning
    relation: defines the name the step before introduced
`;

// (f) the Thesis row reaches only the Reader target Leg (kogaki#1229, kogaki#1231).
{
  const legs = ["leg1", "leg2", "leg3", "leg4", "leg5", "leg6"].map((leg_id) => ({ leg_id }));
  legs[3].reaches_target = true; // leg4 — not the last Leg, and not the first.
  const named = targetLegIds(legs);
  if (JSON.stringify(named) !== JSON.stringify(["leg4"])) fails.push(`(f) targetLegIds named ${JSON.stringify(named)}, want ["leg4"]`);
  if (targetLegIds([]).length !== 0) fails.push("(f) targetLegIds over no Legs named a Leg");
  // A Brief record over the same path: the Thesis row is derived from the
  // Strand coverage (kogaki#1328), and one Leg record opened and closed early.
  const doc = {
    thesis: "The whole claim.", reader_path: legs,
    strand_coverage: [{ strand: "L1", used_by_legs: ["leg4"], role_in_thesis: "The whole claim holds once the target Leg lands." }],
    obligations: [{ opened_by: "leg1", items: [{ item: "an obligation opened early", closed_by: "leg3" }] }],
  };
  for (const { leg_id } of legs) {
    const rows = obligationRowsOf(doc, leg_id);
    const carries = rows.some((r) => /whole claim holds/.test(r.text || ""));
    if (leg_id === "leg4" && !carries) fails.push("(f) the target Leg's Packet carries no Thesis row");
    if (leg_id !== "leg4" && carries) fails.push(`(f) ${leg_id}'s Packet carries the Thesis row, which only the target Leg's may`);
  }
  const carriesItem = (id) => obligationRowsOf(doc, id).some((r) => (r.items || []).some((e) => e.item === "an obligation opened early"));
  if (!carriesItem("leg1")) fails.push("(f) the Leg records stopped reaching the Leg that opened them");
  if (!carriesItem("leg2") || !carriesItem("leg3")) fails.push("(f) an open item did not reach a Leg inside its record (kogaki#1612)");
  if (carriesItem("leg4")) fails.push("(f) a record reached a Leg after the one closing its last item");
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

  const withRaisedRow = [
    { leg_id: "leg1", reader_state_after: STATE },
    { leg_id: "leg2", reaches_target: true, reader_state_after: STATE },
    { leg_id: "leg3", reader_state_after: STATE },
  ];
  const obligations = [{ opened_by: "leg3", items: [{ item: "a promise opened late", closed_by: null }] }];
  const rRaised = readerTargetLegRefusal(withRaisedRow, obligations);
  if (!rRaised) fails.push("(h) a closing Leg named opened_by on an Obligation record was not refused");
  else if (!/leg 3 \(leg3\)/.test(rRaised)) fails.push(`(h) the opened-record refusal did not name the Leg: ${rRaised}`);

  const clean = readerTargetLegRefusal(withRaisedRow, []);
  if (clean) fails.push(`(h) a closing Leg raising no Obligation row was refused: ${clean}`);
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

// A record the cases below build: one item opened at `opened`, closed at `closed`.
const q = (text, opened, closed) => ({ opened_by: opened, items: [{ item: text, closed_by: closed }] });
const ids = (n) => Array.from({ length: n }, (_, i) => ({ leg_id: `leg${i + 1}` }));
// The retired keys, four of them composed so no live spelling of them stays in the tree (kogaki#1612).
const RETIRED = ["raised_by", "owed_by", ["discharged", "by"].join("_"), ["conceded", "by"].join("_"), "open",
  ["why", "not", "here"].join("_"), ["reader", "keeps"].join("_"), "item"];

// (l) the record opens once and closes item by item (kogaki#1612): three items closed two in one
// Leg and one in the next pass; an item closed out of order, a record closed where it opened, an
// item still open at the last Leg and a record carrying a retired field are each refused.
{
  const legs = ids(4);
  const three = { opened_by: "leg1", items: [{ item: "first factor", closed_by: "leg2" },
    { item: "second factor", closed_by: "leg2" }, { item: "third factor", closed_by: "leg3" }] };
  const rThree = obligationLedgerRefusal(legs, [three]);
  if (rThree) fails.push(`(l) a three-item record closed two in one Leg and one in the next was refused: ${rThree}`);
  const swapped = { opened_by: "leg1", items: [{ item: "first factor", closed_by: "leg3" }, { item: "second factor", closed_by: "leg2" }] };
  const rOrder = obligationLedgerRefusal(legs, [swapped]);
  if (!rOrder || !/in the order named/.test(rOrder) || !/"first factor"/.test(rOrder) || !/"second factor"/.test(rOrder)) {
    fails.push(`(l) an item closed before an earlier one was not refused naming both: ${rOrder}`);
  }
  const here = q("kept where it is made", "leg2", "leg2");
  const rHere = obligationLedgerRefusal(legs, [here]);
  if (!rHere || !/where it opens it/.test(rHere) || !/kept where it is made/.test(rHere)) fails.push(`(l) a record closed where it opened was not refused: ${rHere}`);
  const open = { opened_by: "leg1", items: [{ item: "first factor", closed_by: "leg2" }, { item: "second factor", closed_by: null }] };
  const rOpen = obligationLedgerRefusal(legs, [open]);
  if (!rOpen || !/no item is still open at the path's last Leg/.test(rOpen) || !/"second factor"/.test(rOpen) || !/leg 4 \(leg4\)/.test(rOpen)) {
    fails.push(`(l) a record with an item open at the last Leg was not refused naming the item: ${rOpen}`);
  }
  for (const key of RETIRED) {
    const r = obligationLedgerRefusal(legs, [{ ...three, [key]: "leg2" }]);
    if (!r || !r.includes("`" + key + "`, retired")) fails.push(`(l) a record carrying the retired \`${key}\` was not refused by name: ${r}`);
  }
}

// (m) two records open at one Leg are refused naming both (kogaki#1232, kogaki#1529, kogaki#1568):
// a deferred term and a question are one expectation and share the one capacity.
{
  const legs = ids(5);
  const twoOpen = [q("row A", "leg1", "leg4"), q("ownership boundary", "leg2", "leg3")];
  const r = obligationLedgerRefusal(legs, twoOpen);
  if (!r) fails.push("(m) a Question and a deferred term open at one Leg were not refused");
  else {
    if (!/at most one open at any Leg/.test(r)) fails.push(`(m) the refusal did not name the rule: ${r}`);
    if (!/leg 2 \(leg2\)/.test(r)) fails.push(`(m) the refusal did not name the Leg: ${r}`);
    if (!/row A/.test(r) || !/ownership boundary/.test(r)) fails.push(`(m) the refusal did not name both records: ${r}`);
  }
  // A record closing at a Leg and the next opening there are never open together.
  const oneAtATime = [q("row A", "leg1", "leg2"), q("row B", "leg2", "leg3")];
  const rClean = obligationLedgerRefusal(legs, oneAtATime);
  if (rClean) fails.push(`(m) a path with at most one record open at any Leg was refused: ${rClean}`);
  // ...and validateLegs runs the same rule over a full path.
  const fullLegs = legs.map((s) => ({ ...s, move: "m", materials: ["L1"], purpose: `purpose of ${s.leg_id}`,
    reader_state_after: `orientation: after ${s.leg_id}\nknowledge: after ${s.leg_id}`,
    depends_on: [], rationale: `why ${s.leg_id}`, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${s.leg_id}` }],
    waypoints: [{ point: `the paragraph establishes what ${s.leg_id} claims`, serves: ["L1"] }] }));
  fullLegs[0].opens_section = "A Section";
  fullLegs[3].reaches_target = true;
  const rFull = validateLegs(fullLegs, "", twoOpen);
  if (!rFull.error || !/at most one open at any Leg/.test(rFull.error)) fails.push(`(m) validateLegs did not refuse the same ledger over a full path: ${rFull.error}`);
}

// (n) Path Review's `discharge_rows` names each record and Leg closing any of its items, with that
// Leg's points and claims (kogaki#1496, kogaki#1529, kogaki#1612). The Packet asks for no
// sentence, so whether the closing Leg's Waypoints explain the items is read here, at the Brief.
{
  const { dischargeRows } = compose;
  const ROW = "why the installer's copy is overwritten on every run";
  const legs = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
    waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }] }));
  const obligations = [{ opened_by: "leg1", items: [{ item: ROW, closed_by: "leg2" }, { item: "ownership boundary", closed_by: "leg3" }] }];
  const rows = dischargeRows(legs, obligations);
  if (rows.length !== 2) fails.push(`(n) the Path Review's discharge input carries ${rows.length} entries for one record closed at two Legs`);
  else {
    const [e, f] = rows;
    if (e.row !== ROW || JSON.stringify(e.item) !== JSON.stringify([ROW]) || "kind" in e) fails.push(`(n) the discharge input does not name the items closed at the first Leg: ${JSON.stringify(e)}`);
    if (e.closed_by !== "leg2" || e.opened_by !== "leg1" || f.closed_by !== "leg3" || f.row !== "ownership boundary") fails.push(`(n) the discharge input does not name the opening and closing Legs: ${JSON.stringify(rows)}`);
    const closing = [e, f].map((x) => [x.closing_leg.leg_id, x.closing_leg.points[0], x.closing_leg.claims[0]]);
    if (JSON.stringify(closing) !== JSON.stringify([["leg2", "the paragraph establishes what leg2 claims", "claim of leg2"],
      ["leg3", "the paragraph establishes what leg3 claims", "claim of leg3"]])) fails.push(`(n) the discharge input does not carry each closing Leg's points and claims: ${JSON.stringify(closing)}`);
  }
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  // the discharge sentence is written once under `shared_text` and named by the row.
  const unit = JSON.stringify(table.review_path_unit || {}).replace(/\{\{shared:([a-z_]+)\}\}/g, (_, k) => (table.shared_text || {})[k] || "");
  if (!/discharge_rows/.test(unit) || !/one entry per Obligation record and Leg that closes any of its items/.test(unit)) {
    fails.push("(n) the review_path_unit row no longer reads `discharge_rows` with one entry per record and closing Leg");
  }
}

// (o) each item closes after the opening Leg, in the order named (kogaki#1612): an item closed
// before its record opens, and an item closed while an earlier one is still open, are refused
// naming the record and the Leg; a record open across an idle Leg passes.
{
  const legs = ids(4);
  const RULE = /each item closes after the opening Leg, in the order named/;
  const r = obligationLedgerRefusal(legs, [q("asked late, closed early", "leg3", "leg2")]);
  if (!r) fails.push("(o) an item closed before its record opens was not refused");
  else if (!RULE.test(r) || !/leg 2 \(leg2\)/.test(r) || !/asked late, closed early/.test(r)) {
    fails.push(`(o) the refusal did not name the rule, the Leg and the record: ${r}`);
  }
  const early = { opened_by: "leg1", items: [{ item: "still open", closed_by: null }, { item: "closed first", closed_by: "leg2" }] };
  const rEarly = obligationLedgerRefusal(legs, [early]);
  if (!rEarly || !RULE.test(rEarly) || !/"closed first"/.test(rEarly) || !/"still open", which is still open/.test(rEarly)) {
    fails.push(`(o) an item closed while an earlier one is open was not refused naming both: ${rEarly}`);
  }
  const rIdle = obligationLedgerRefusal(legs, [q("held across an idle Leg", "leg1", "leg3")]);
  if (rIdle) fails.push(`(o) a record open across an idle Leg was refused: ${rIdle}`);
}

// (p) a Leg inside an open record carrying `opens_section` is refused.
{
  for (const at of [1, 2]) {
    const legs = ids(4);
    legs[at].opens_section = "where the copy goes";
    const r = obligationLedgerRefusal(legs, [q("a promise across a heading", "leg1", "leg3")]);
    if (!r) fails.push(`(p) a record with Leg ${at + 1} inside it carrying opens_section was not refused`);
    else if (!/opens no Section/.test(r) || !r.includes(`leg ${at + 1} (leg${at + 1})`) || !/a promise across a heading/.test(r)) fails.push(`(p) the refusal did not name the rule, the Leg and the record: ${r}`);
  }
  const raisingOpens = ids(4);
  raisingOpens[0].opens_section = "the start";
  const rOk = obligationLedgerRefusal(raisingOpens, [q("a promise under its own heading", "leg1", "leg3")]);
  if (rOk) fails.push(`(p) a record whose OPENING Leg opens the Section was refused: ${rOk}`);
}

// (q) an item still open at the last Leg is refused, naming the record; the retired Closure shape
// is refused naming its field, by the ledger rule and by the Candidate's own ledger reader.
{
  const { candidateLedgerRefusal } = await import("./src/assemble.mjs");
  const legs = ids(3);
  const r = obligationLedgerRefusal(legs, [q("never settled", "leg1", null)]);
  if (!r) fails.push("(q) a record whose item is never closed was not refused");
  else if (!/still holds the item "never settled" open/.test(r) || !/leg 3 \(leg3\)/.test(r)) fails.push(`(q) the refusal did not name the record, the item and the last Leg: ${r}`);
  const rOld = obligationLedgerRefusal(legs, [{ item: ["a Closure row"], introduced_by: "leg1" }]);
  if (!rOld || !/introduced_by/.test(rOld) || !/opened_by/.test(rOld)) fails.push(`(q) a row in the retired Closure shape was not refused naming its field: ${rOld}`);
  for (const key of RETIRED) {
    const rCand = candidateLedgerRefusal({ candidate_id: "c1", legs, obligations: [{ ...q("x", "leg1", "leg2"), [key]: "leg2" }] });
    if (!rCand || !rCand.includes("`" + key + "`, retired")) fails.push(`(q) the Candidate's ledger reader did not refuse the retired \`${key}\` by name: ${rCand}`);
  }
}

// (r) an `introduces` entry carrying `kind` is refused; one carrying term and meaning is read.
{
  const { introducesRefusal, parseIntroducesEntry } = compose;
  const r = introducesRefusal([{ term: "ownership boundary", kind: "coined", meaning: "where the installer's ownership ends" }], "leg 1 (leg1)");
  if (!r || !/carries `kind`, which is retired/.test(r) || !/ownership boundary/.test(r)) fails.push(`(r) an introduces entry carrying kind was not refused by name: ${r}`);
  const ok = parseIntroducesEntry({ term: "ownership boundary", meaning: "where the installer's ownership ends" });
  if (ok.error || ok.meaning !== "where the installer's ownership ends") fails.push(`(r) an entry carrying term and meaning was not read: ${JSON.stringify(ok)}`);
  const noMeaning = parseIntroducesEntry({ term: "ownership boundary" });
  if (!noMeaning.error || !/no meaning/.test(noMeaning.error)) fails.push(`(r) an entry carrying no meaning was not refused: ${JSON.stringify(noMeaning)}`);
}

// (s) a Move carrying `obligation` raises a deferred slot that reaches the composer's input: the
// Move library's contracts (`moves_you_may_bind`) carry it, and the Move-fit input carries it beside
// the Leg's rows (kogaki#1558). A Move whose `description` says an item is left for later and that
// carries no field raises none.
{
  const { loadMoveContracts } = compose;
  const { readerPathFitInput } = await import("./src/brief/reader-path-unit.mjs");
  const dir = mkdtempSync(join(tmpdir(), "obligations-moves-"));
  try {
    const lib = join(dir, "moves");
    mkdirSync(lib);
    copyFileSync("moves/ROLES.json", join(lib, "ROLES.json"));
    const src = MOVE_TEMPLATE;
    writeFileSync(join(lib, "name_two_and_defer.yaml"), src.replace(/^id: .*$/m, "id: name_two_and_defer")
      + "obligation:\n  - named kind\n  - practice\n");
    writeFileSync(join(lib, "defer_in_prose_only.yaml"), src
      .replace(/^id: .*$/m, "id: defer_in_prose_only")
      .replace(/^description: >-\n(?:  .*\n)+/m, "description: Names two terms and leaves both for later, for the next Leg to explain.\n"));
    writeFileSync(join(lib, "name_the_consequence_then_define_the_name.yaml"), src);
    const lc = loadMoveContracts(lib);
    if (lc.error) fails.push(`(s) the fixture library did not load: ${lc.error}`);
    else {
      const slotted = lc.moves.find((m) => m.id === "name_two_and_defer");
      const plain = lc.moves.find((m) => m.id === "name_the_consequence_then_define_the_name");
      const prose = lc.moves.find((m) => m.id === "defer_in_prose_only");
      if (JSON.stringify(slotted && slotted.deferred_slots) !== JSON.stringify([{ items: ["named kind", "practice"] }])) {
        fails.push(`(s) the composer's Move contract does not carry the field's one slot of two items and no count: ${JSON.stringify(slotted && slotted.deferred_slots)}`);
      }
      if (plain && "deferred_slots" in plain) fails.push(`(s) a Move that defers nothing carries a slot: ${JSON.stringify(plain.deferred_slots)}`);
      if (!prose || "deferred_slots" in prose) fails.push(`(s) a Move whose description says "left for later" and carries no obligation raises a slot: ${JSON.stringify(prose)}`);
    }
    const legs = ["leg1", "leg2", "leg3"].map((leg_id, i) => ({ leg_id, move: ["name_two_and_defer", "name_the_consequence_then_define_the_name", "defer_in_prose_only"][i],
      reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
      waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }] }));
    const rows = [q("ownership boundary", "leg1", "leg2")];
    const fit = readerPathFitInput({ candidate_id: "c1", legs, obligations: rows }, lib, "orientation: none\nknowledge: none", "a thesis");
    if (fit.error) fails.push(`(s) the Move-fit input did not build: ${fit.error}`);
    else {
      const [first, second, third] = fit.input.candidate_you_must_judge.move_contracts;
      if (!first.deferred_slots || JSON.stringify(first.obligations_raised) !== JSON.stringify(rows)) fails.push(`(s) the Move-fit input does not carry the slot beside the Leg's records: ${JSON.stringify(first)}`);
      if ("deferred_slots" in second || "obligations_raised" in second) fails.push(`(s) a Leg whose Move defers nothing carries a slot: ${JSON.stringify(second)}`);
      if ("deferred_slots" in third || "obligations_raised" in third) fails.push(`(s) a Leg whose Move defers only in its description carries a slot: ${JSON.stringify(third)}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// (t) the Brief parser refuses a `closure` key by name, naming the key that replaced it.
{
  const { parseBriefRecord, briefRecordText } = compose;
  const rec = recordOf([{ leg_id: "s1", move: "m", materials: ["L1"], purpose: "p", reader_state_after: "orientation: o\nknowledge: k",
    depends_on: [], rationale: "r", claims: [{ strand: "L1", proposition: "c" }], waypoints: [{ point: "a point", serves: ["L1"] }] }]);
  const { obligations, ...rest } = rec;
  const text = briefRecordText({ ...rest, closure: obligations || [] });
  const r = parseBriefRecord(text, "t.yaml");
  if (!r.error || !/carries `closure`/.test(r.error) || !/`obligations`/.test(r.error)) fails.push(`(t) a Brief carrying closure was not refused by name: ${JSON.stringify(r.error)}`);
}

// (u) `names` on the target Leg and the reader-knowledge ledger read `introduces` alone
// (kogaki#1568): an Obligation item is a second register, so a term only a row names is refused
// in `names` and folds into no Leg's knowledge.
{
  const { readerTargetNamesRefusal, readerKnowledgeLedger } = compose;
  const legs = [{ leg_id: "leg1" }, { leg_id: "leg2", reaches_target: true, names: ["ownership boundary"] }, { leg_id: "leg3" }];
  const r = readerTargetNamesRefusal(legs);
  if (!r || !/ownership boundary/.test(r)) fails.push(`(u) names carrying a term only an Obligation row names was not refused: ${r}`);
  const introduced = [{ leg_id: "leg1", introduces: [{ term: "ownership boundary", meaning: "where the installer's ownership ends" }] }, ...legs.slice(1)];
  if (readerTargetNamesRefusal(introduced)) fails.push(`(u) names carrying an introduced term was refused: ${readerTargetNamesRefusal(introduced)}`);
  const ledger = readerKnowledgeLedger(legs);
  if (ledger.some((row) => row.reader_already_knows.length)) fails.push(`(u) the ledger folded something in over a path that introduces nothing: ${JSON.stringify(ledger)}`);
  if (readerKnowledgeLedger.length !== 1) fails.push(`(u) readerKnowledgeLedger still declares an obligations parameter (arity ${readerKnowledgeLedger.length})`);
}

// (v) a record's `items`, in the order named, are one promise (kogaki#1549, kogaki#1568,
// kogaki#1612): closed one Leg after another it passes; the same promise as two records opened by
// one Leg trips the capacity rule; an empty list, a blank item, a repeated item and a list that
// is not one are refused by name; the label and Path Review's discharge input read every item in
// order; and a record carrying the retired `kind`, `text` or `term` is refused naming the key, by
// the ledger rule and by the Candidate's own ledger reader.
{
  const { obligationLabel } = compose;
  const { candidateLedgerRefusal } = await import("./src/assemble.mjs");
  const legs = ids(4);
  const pair = { opened_by: "leg1", items: [{ item: "ownership boundary", closed_by: "leg2" }, { item: "non-member fallback", closed_by: "leg3" }] };
  const rPair = obligationLedgerRefusal(legs, [pair]);
  if (rPair) fails.push(`(v) a two-item record closed one Leg after another was refused: ${rPair}`);
  const full = (o) => legs.map((s, i) => ({ ...s, move: "m", materials: ["L1"], purpose: `purpose of ${s.leg_id}`,
    reader_state_after: `orientation: after ${s.leg_id}\nknowledge: after ${s.leg_id}`, depends_on: [], rationale: `why ${s.leg_id}`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${s.leg_id}` }],
    waypoints: [{ point: `the paragraph establishes what ${s.leg_id} claims`, serves: ["L1"] }],
    ...(i === 0 ? { opens_section: "A Section" } : {}), ...(i === 3 ? { reaches_target: true } : {}), ...o[i] }));
  const vPair = validateLegs(full([{}, {}, {}, {}]), "", [pair]);
  if (vPair.error) fails.push(`(v) validateLegs refused a path carrying a two-item record: ${vPair.error}`);
  const asTwo = [q("ownership boundary", "leg1", "leg2"), q("non-member fallback", "leg1", "leg3")];
  const rTwo = obligationLedgerRefusal(legs, asTwo);
  if (!rTwo || !/at most one open at any Leg/.test(rTwo) || !/leg 1 \(leg1\)/.test(rTwo)) fails.push(`(v) the same promise as two records opened by one Leg was not refused by the capacity rule: ${rTwo}`);
  const withItems = (items) => ({ opened_by: "leg1", items });
  const rRepeat = obligationLedgerRefusal(legs, [withItems([{ item: "ownership boundary", closed_by: "leg2" }, { item: "Ownership boundary", closed_by: "leg2" }])]);
  if (!rRepeat || !/names the item "Ownership boundary" twice/.test(rRepeat) || !/obligation 1/.test(rRepeat)) fails.push(`(v) a list naming an item twice was not refused by name: ${rRepeat}`);
  const rEmpty = obligationLedgerRefusal(legs, [withItems([])]);
  if (!rEmpty || !/empty `items` list/.test(rEmpty)) fails.push(`(v) an empty items list was not refused by name: ${rEmpty}`);
  const rBlank = obligationLedgerRefusal(legs, [withItems([{ item: "ownership boundary", closed_by: "leg2" }, { item: " ", closed_by: "leg2" }])]);
  if (!rBlank || !/entry 2 whose `item` is not one non-empty line/.test(rBlank)) fails.push(`(v) a list carrying a blank item was not refused: ${rBlank}`);
  const rString = obligationLedgerRefusal(legs, [withItems("ownership boundary")]);
  if (!rString || !/no `items` list/.test(rString)) fails.push(`(v) \`items\` that is a string, not a list, was not refused: ${rString}`);
  const rNoClose = obligationLedgerRefusal(legs, [withItems([{ item: "ownership boundary" }])]);
  if (!rNoClose || !/with no `closed_by`/.test(rNoClose)) fails.push(`(v) an item carrying no closed_by was not refused: ${rNoClose}`);
  const one = q("ownership boundary", "leg1", "leg2");
  if (obligationLedgerRefusal(legs, [one])) fails.push(`(v) a one-item record stopped passing: ${obligationLedgerRefusal(legs, [one])}`);
  if (obligationLabel(pair) !== 'obligation "ownership boundary, non-member fallback"') fails.push(`(v) the label does not join the list in order: ${obligationLabel(pair)}`);
  if (obligationLabel(one) !== 'obligation "ownership boundary"') fails.push(`(v) a one-item record's label changed: ${obligationLabel(one)}`);
  const { dischargeRows } = compose;
  const both = { opened_by: "leg1", items: [{ item: "ownership boundary", closed_by: "leg2" }, { item: "non-member fallback", closed_by: "leg2" }] };
  const [d] = dischargeRows(legs, [both]);
  if (!d || d.row !== "ownership boundary, non-member fallback" || JSON.stringify(d.item) !== JSON.stringify(["ownership boundary", "non-member fallback"]) || "kind" in d) {
    fails.push(`(v) Path Review's discharge input does not name a record's items in order: ${JSON.stringify(d)}`);
  }
  for (const retired of [{ kind: "term" }, { kind: "question" }, { text: "why is the copy overwritten" }, { term: "ownership boundary" }, { term: ["ownership boundary"] }]) {
    const key = Object.keys(retired)[0];
    const row = { ...pair, ...retired };
    const rLedger = obligationLedgerRefusal(legs, [row]);
    if (!rLedger || !new RegExp("carries `" + key + "`, retired").test(rLedger)) fails.push(`(v) a record carrying the retired \`${key}\` was not refused naming it: ${rLedger}`);
    const bare = { ...retired, opened_by: "leg1" };
    const rBare = obligationLedgerRefusal(legs, [bare]);
    if (!rBare || !new RegExp("`" + key + "`").test(rBare)) fails.push(`(v) a record in the retired shape alone (\`${key}\`, no \`items\`) was not refused naming it: ${rBare}`);
    const rCand = candidateLedgerRefusal({ candidate_id: "c1", legs, obligations: [row] });
    if (!rCand || !new RegExp("`" + key + "`").test(rCand)) fails.push(`(v) the Candidate's ledger reader did not refuse the retired \`${key}\` by name: ${rCand}`);
  }
  if (candidateLedgerRefusal({ candidate_id: "c1", legs, obligations: [pair] })) fails.push(`(v) the Candidate's ledger reader refused an items record: ${candidateLedgerRefusal({ candidate_id: "c1", legs, obligations: [pair] })}`);
}

// (w) a record's items are the article's, never counted against its Move's slot (kogaki#1603): a
// Move whose `obligation` is one collective item raises a slot of that one item and no count, and
// a record of three article items opened by the Leg binding it passes the ledger rule and the path.
{
  const dir = mkdtempSync(join(tmpdir(), "obligations-collective-"));
  try {
    const lib = join(dir, "moves");
    mkdirSync(lib);
    copyFileSync("moves/ROLES.json", join(lib, "ROLES.json"));
    const src = MOVE_TEMPLATE;
    writeFileSync(join(lib, "name_the_factors.yaml"), src.replace(/^id: .*$/m, "id: name_the_factors")
      + "obligation:\n  - the factors that decide the outcome\n");
    const lc = compose.loadMoveContracts(lib);
    const m = (lc.moves || []).find((x) => x.id === "name_the_factors");
    if (!m || JSON.stringify(m.deferred_slots) !== JSON.stringify([{ items: ["the factors that decide the outcome"] }])) {
      fails.push(`(w) a one-item obligation does not raise one slot of that item and no count: ${JSON.stringify(m && m.deferred_slots)}`);
    }
    const legs = ids(4).map((s, i) => ({ ...s, move: i === 0 ? "name_the_factors" : "m", materials: ["L1"], purpose: `purpose of ${s.leg_id}`,
      reader_state_after: `orientation: after ${s.leg_id}\nknowledge: after ${s.leg_id}`, depends_on: [], rationale: `why ${s.leg_id}`,
      claims: [{ type: "strand", strand: "L1", proposition: `claim of ${s.leg_id}` }],
      waypoints: [{ point: `the paragraph establishes what ${s.leg_id} claims`, serves: ["L1"] }],
      ...(i === 0 ? { opens_section: "A Section" } : {}), ...(i === 3 ? { reaches_target: true } : {}) }));
    const three = { opened_by: "leg1", items: [{ item: "offense-defense advantage", closed_by: "leg2" },
      { item: "offense-defense distinguishability", closed_by: "leg2" }, { item: "the cost of the first strike", closed_by: "leg3" }] };
    const rThree = obligationLedgerRefusal(legs, [three]);
    if (rThree) fails.push(`(w) a row of three article items against a one-item slot is refused: ${rThree}`);
    const vThree = validateLegs(legs, "", [three]);
    if (vThree.error) fails.push(`(w) validateLegs refused a path carrying three article items against a one-item slot: ${vThree.error}`);
    // A caller still handing the retired slot reader is not counted against it either.
    const oldReader = () => ({ items: ["the factors that decide the outcome"], count: 1 });
    const rOld = obligationLedgerRefusal(legs, [three], oldReader) || validateLegs(legs, "", [three], [], oldReader).error;
    if (rOld) fails.push(`(w) a row of three article items is still counted against a slot of one: ${rOld}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// (x) an item is closed by being explained, never by being named (kogaki#1603): Path Review's
// `discharge` judges the items against the closing Leg's own points, here a point that only names
// them, and the rendered rule says such a Leg does not close them, so its verdict is `fails`
// naming the items. The verdict is the judge's; this case reads its input and its rule.
{
  const { dischargeRows } = compose;
  const legs = ["leg1", "leg2"].map((leg_id) => ({ leg_id,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
    waypoints: [{ point: leg_id === "leg2" ? "The two factors are offense-defense advantage and offense-defense distinguishability."
      : "Two factors decide how readily the security dilemma arises.", serves: ["L1"] }] }));
  const named = { opened_by: "leg1", items: [{ item: "offense-defense advantage", closed_by: "leg2" }, { item: "offense-defense distinguishability", closed_by: "leg2" }] };
  const [d] = dischargeRows(legs, [named]);
  if (!d || d.row !== "offense-defense advantage, offense-defense distinguishability" || d.closed_by !== "leg2"
    || JSON.stringify(d.closing_leg.points) !== JSON.stringify([legs[1].waypoints[0].point])) {
    fails.push(`(x) Path Review's discharge input does not name the items beside the naming Leg's own point: ${JSON.stringify(d)}`);
  }
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  const unit = JSON.stringify(table.review_path_unit || {}).replace(/\{\{shared:([a-z_]+)\}\}/g, (_, k) => (table.shared_text || {})[k] || "");
  if (!/is explained among that Leg's Waypoint points and claims, a Leg that only names an item not closing it, verdict `fails` or `holds`/.test(unit)) {
    fails.push("(x) the review_path_unit row does not say a Leg that only names an item does not close it");
  }
  if (/per item of the (raising|opening) Move/.test(unit)) fails.push("(x) the review_path_unit row still counts the record's items from the opening Move's slot");
}

if (fails.length > 0) {
  console.log("FAIL check-brief-obligations");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-obligations — the Thesis row reaching only the Reader target Leg, the reaches_target marking rule, a closing Leg introducing and raising nothing with its orientation/knowledge held, the mark reaching the Packet, the Obligation record opening once and closing item by item with one open record per Leg, each item closing after the opening Leg in the order named and never where it opens, no Leg inside an open record opening a Section, no item open at the last Leg and every retired field refused by name, an introduces entry carrying no kind, a Move's deferred slot read from its obligation field alone in the composer's and Move-fit inputs carrying no count, Path Review's discharge_rows naming each record and Leg closing its items, the retired closure key refused by name, names and the ledger reading introduces alone, a record's ordered items as one promise with the retired kind, text and term refused by name, three article items passing against a one-item slot, and a Leg that only names its items judged as not closing them (kogaki#1229, kogaki#1231, kogaki#1232, kogaki#1496, kogaki#1529, kogaki#1549, kogaki#1558, kogaki#1568, kogaki#1577, kogaki#1603, kogaki#1612).");
JS
