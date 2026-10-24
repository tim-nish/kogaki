#!/usr/bin/env bash
# check-brief-obligations — the Obligation ledger and Reader target Leg rules
# of Brief composition (kogaki#1229, #1231, #1232, #1529). A LIGHT member:
# pure validator calls over fixture paths, no model run.
#   (f)-(k) the Thesis row and the Reader target Leg: the mark, closing Legs,
#           the target after-state, and the mark reaching the Packet.
#   (l)-(m) one conceded row per path; two rows open at one Leg refused.
#   (n) Path Review's `discharge_rows`; (o) owed_by the unbroken run from the
#   next Leg; (p) an owed Leg opening a Section; (q) a non-terminal row.
#   (r) `introduces` carrying `kind`; (s) a Move's slot, a row's count against
#       it (#1577); (t) `closure` refused; (u) no Obligation item in `names`
#       or the ledger; (v) a row's `item` list, `kind`/`text`/`term` refused.
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

// (f) the Thesis row reaches only the Reader target Leg (kogaki#1229, kogaki#1231).
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
    obligations: [{ item: ["an obligation raised early"], raised_by: "leg1", owed_by: ["leg3"], discharged_by: "leg3" }],
  };
  for (const { leg_id } of legs) {
    const rows = obligationRowsOf(doc, leg_id);
    const carries = rows.some((r) => /whole claim holds/.test(r.text || ""));
    if (leg_id === "leg4" && !carries) fails.push("(f) the target Leg's Packet carries no Thesis row");
    if (leg_id !== "leg4" && carries) fails.push(`(f) ${leg_id}'s Packet carries the Thesis row, which only the target Leg's may`);
  }
  const leg1 = obligationRowsOf(doc, "leg1");
  if (!leg1.some((r) => (r.item || []).includes("an obligation raised early"))) fails.push("(f) the Leg rows stopped reaching the Leg that raised them");
  if (obligationRowsOf(doc, "leg2").some((r) => (r.item || []).includes("an obligation raised early"))) fails.push("(f) a row reached a Leg it is no party to");
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
  const obligations = [{ item: ["a promise raised late"], raised_by: "leg3", owed_by: [], conceded_by: "leg3" }];
  const rRaised = readerTargetLegRefusal(withRaisedRow, obligations);
  if (!rRaised) fails.push("(h) a closing Leg named raised_by on an Obligation row was not refused");
  else if (!/leg 3 \(leg3\)/.test(rRaised)) fails.push(`(h) the raised-row refusal did not name the Leg: ${rRaised}`);

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

// A row the cases below build: one item raised at `raised`, owed by `owed`, kept at the last.
const q = (text, raised, owed, extra = {}) => ({ item: [text], raised_by: raised, owed_by: owed,
  ...(owed.length ? { discharged_by: owed[owed.length - 1] } : {}), ...extra });
const conceded = { open: "what stays unresolved", why_not_here: "not this Leg's to close", reader_keeps: "a named open question" };
const ids = (n) => Array.from({ length: n }, (_, i) => ({ leg_id: `leg${i + 1}` }));

// (l) at most one conceded_by row in the path (kogaki#1232).
{
  const legs = ids(3);
  const twoConceded = [
    q("a question set aside early", "leg1", [], { conceded_by: "leg1", ...conceded }),
    q("a question set aside late", "leg2", ["leg3"], { conceded_by: "leg3", discharged_by: undefined, ...conceded }),
  ].map((o) => JSON.parse(JSON.stringify(o)));
  const rTwo = obligationLedgerRefusal(legs, twoConceded);
  if (!rTwo) fails.push("(l) two conceded_by rows in one path were not refused");
  else {
    if (!/at most one conceded row in the path/.test(rTwo)) fails.push(`(l) the refusal did not name the rule: ${rTwo}`);
    if (!/a question set aside early/.test(rTwo) || !/a question set aside late/.test(rTwo)) fails.push(`(l) the refusal did not name both rows: ${rTwo}`);
  }
  const rOne = obligationLedgerRefusal(legs, [twoConceded[0]]);
  if (rOne) fails.push(`(l) exactly one conceded_by row, conceded where it is raised, was refused: ${rOne}`);
}

// (m) two rows open at one Leg are refused naming both (kogaki#1232, kogaki#1529, kogaki#1568):
// a deferred term and a question are one expectation and share the one capacity.
{
  const legs = ids(5);
  const twoOpen = [
    q("row A", "leg1", ["leg2", "leg3", "leg4"]),
    { item: ["ownership boundary"], raised_by: "leg2", owed_by: ["leg3"], discharged_by: "leg3" },
  ];
  const r = obligationLedgerRefusal(legs, twoOpen);
  if (!r) fails.push("(m) a Question and a deferred term open at one Leg were not refused");
  else {
    if (!/at most one open at any Leg/.test(r)) fails.push(`(m) the refusal did not name the rule: ${r}`);
    if (!/leg 2 \(leg2\)/.test(r)) fails.push(`(m) the refusal did not name the Leg: ${r}`);
    if (!/row A/.test(r) || !/ownership boundary/.test(r)) fails.push(`(m) the refusal did not name both rows: ${r}`);
  }
  const oneAtATime = [q("row A", "leg1", ["leg2"]), q("row B", "leg2", ["leg3"])];
  const rClean = obligationLedgerRefusal(legs, oneAtATime);
  if (rClean) fails.push(`(m) a path with at most one row open at any Leg was refused: ${rClean}`);
  // A row raised and conceded in one Leg is open on none.
  const settled = [q("row A", "leg2", ["leg3", "leg4"]), q("row B", "leg2", [], { conceded_by: "leg2", ...conceded })];
  const rSettled = obligationLedgerRefusal(legs, settled);
  if (rSettled) fails.push(`(m) a row conceded in its own raising Leg was counted as open there: ${rSettled}`);
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

// (n) Path Review's `discharge_rows` names each row and its owed Legs, with the owed Legs'
// points and claims (kogaki#1496, kogaki#1529). The Packet renders a row as material and asks
// for no sentence, so whether the owed Legs' Waypoints keep it is read here, at the Brief.
{
  const { dischargeRows } = compose;
  const ROW = "why the installer's copy is overwritten on every run";
  const legs = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
    waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }] }));
  const obligations = [q(ROW, "leg1", ["leg2", "leg3"]),
    { item: ["ownership boundary"], raised_by: "leg1", owed_by: [], conceded_by: "leg1", ...conceded }];
  const rows = dischargeRows(legs, obligations);
  if (rows.length !== 1) fails.push(`(n) the Path Review's discharge input carries ${rows.length} entries for one discharged row`);
  else {
    const [e] = rows;
    if (e.row !== ROW || JSON.stringify(e.item) !== JSON.stringify([ROW]) || "kind" in e) fails.push(`(n) the discharge input does not name the row: ${JSON.stringify(e)}`);
    if (JSON.stringify(e.owed_by) !== JSON.stringify(["leg2", "leg3"])) fails.push(`(n) the discharge input does not name the owed Legs: ${JSON.stringify(e)}`);
    if (e.discharging_leg !== "leg3" || e.raised_by !== "leg1") fails.push(`(n) the discharge input does not name the raising and discharging Legs: ${JSON.stringify(e)}`);
    const owed = (e.owed_legs || []).map((l) => [l.leg_id, l.points[0], l.claims[0]]);
    if (JSON.stringify(owed) !== JSON.stringify([["leg2", "the paragraph establishes what leg2 claims", "claim of leg2"],
      ["leg3", "the paragraph establishes what leg3 claims", "claim of leg3"]])) fails.push(`(n) the discharge input does not carry each owed Leg's points and claims: ${JSON.stringify(e.owed_legs)}`);
  }
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  // the discharge sentence is written once under `shared_text` and named by the row.
  const unit = JSON.stringify(table.review_path_unit || {}).replace(/\{\{shared:([a-z_]+)\}\}/g, (_, k) => (table.shared_text || {})[k] || "");
  if (!/discharge_rows/.test(unit) || !/one entry per Obligation row carrying `discharged_by`/.test(unit)) {
    fails.push("(n) the review_path_unit row no longer reads `discharge_rows` with one entry per discharged Obligation row");
  }
}

// (o) `owed_by` is the unbroken run from the Leg after the raising one (kogaki#1569): an
// earlier Leg, an out-of-order Leg, a skipped first Leg and a gap in the span are each
// refused naming the row and the Leg; a run and a row conceded where it is raised pass.
{
  const legs = ids(4);
  const RULE = /owed Legs are the unbroken run from the Leg after the raising Leg/;
  const r = obligationLedgerRefusal(legs, [q("asked late, owed early", "leg3", ["leg2"])]);
  if (!r) fails.push("(o) an owed_by naming a Leg before the raising one was not refused");
  else if (!RULE.test(r) || !/leg 2 \(leg2\)/.test(r) || !/asked late, owed early/.test(r)) {
    fails.push(`(o) the refusal did not name the rule, the Leg and the row: ${r}`);
  }
  const rOrder = obligationLedgerRefusal(legs, [q("owed out of order", "leg1", ["leg2", "leg3", "leg2"])]);
  if (!rOrder || !/path order/.test(rOrder)) fails.push(`(o) an owed_by out of path order was not refused: ${rOrder}`);
  for (const [what, row, idle] of [
    ["a skipped first Leg", q("owed after an idle Leg", "leg1", ["leg3"]), /leg 2 \(leg2\)/],
    ["a gap in the span", q("owed across a gap", "leg1", ["leg2", "leg4"]), /leg 3 \(leg3\)/],
  ]) {
    const rIdle = obligationLedgerRefusal(legs, [row]);
    if (!rIdle || !RULE.test(rIdle) || !idle.test(rIdle) || !rIdle.includes(row.item[0]) || !/skips this Leg/.test(rIdle)) {
      fails.push(`(o) ${what} was not refused naming the rule, the row and the idle Leg: ${rIdle}`);
    }
  }
  const rRun = obligationLedgerRefusal(legs, [q("kept across two", "leg1", ["leg2", "leg3"])]);
  if (rRun) fails.push(`(o) an owed_by that is the unbroken run from the next Leg was refused: ${rRun}`);
  const rHere = obligationLedgerRefusal(legs, [q("set aside where raised", "leg2", [], { conceded_by: "leg2", ...conceded })]);
  if (rHere) fails.push(`(o) a row conceded in its raising Leg with an empty owed_by was refused: ${rHere}`);
}

// (p) an owed Leg carrying `opens_section` is refused while the row is open.
{
  const legs = ids(4);
  legs[2].opens_section = "where the copy goes";
  const r = obligationLedgerRefusal(legs, [q("a promise across a heading", "leg1", ["leg2", "leg3"])]);
  if (!r) fails.push("(p) an open row owed by a Leg carrying opens_section was not refused");
  else if (!/opens no Section/.test(r) || !/leg 3 \(leg3\)/.test(r) || !/a promise across a heading/.test(r)) fails.push(`(p) the refusal did not name the rule, the Leg and the row: ${r}`);
  const raisingOpens = ids(4);
  raisingOpens[0].opens_section = "the start";
  const rOk = obligationLedgerRefusal(raisingOpens, [q("a promise under its own heading", "leg1", ["leg2", "leg3"])]);
  if (rOk) fails.push(`(p) a row whose RAISING Leg opens the Section was refused: ${rOk}`);
}

// (q) a row with no terminal field is refused, naming the row.
{
  const legs = ids(3);
  const r = obligationLedgerRefusal(legs, [{ item: ["never settled"], raised_by: "leg1", owed_by: ["leg2"] }]);
  if (!r) fails.push("(q) a row carrying neither discharged_by nor conceded_by was not refused");
  else if (!/NEITHER/.test(r) || !/never settled/.test(r)) fails.push(`(q) the refusal did not name the row and the missing field: ${r}`);
  const rOld = obligationLedgerRefusal(legs, [{ item: ["a Closure row"], introduced_by: "leg1", discharged_by: "leg2" }]);
  if (!rOld || !/introduced_by/.test(rOld) || !/raised_by/.test(rOld)) fails.push(`(q) a row in the retired Closure shape was not refused naming its field: ${rOld}`);
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
    const src = readFileSync("moves/name_the_consequence_then_define_the_name.yaml", "utf8");
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
      if (JSON.stringify(slotted && slotted.deferred_slots) !== JSON.stringify([{ items: ["named kind", "practice"], count: 2 }])) {
        fails.push(`(s) the composer's Move contract does not carry the field's one slot of two items: ${JSON.stringify(slotted && slotted.deferred_slots)}`);
      }
      if (plain && "deferred_slots" in plain) fails.push(`(s) a Move that defers nothing carries a slot: ${JSON.stringify(plain.deferred_slots)}`);
      if (!prose || "deferred_slots" in prose) fails.push(`(s) a Move whose description says "left for later" and carries no obligation raises a slot: ${JSON.stringify(prose)}`);
    }
    const legs = ["leg1", "leg2", "leg3"].map((leg_id, i) => ({ leg_id, move: ["name_two_and_defer", "name_the_consequence_then_define_the_name", "defer_in_prose_only"][i],
      reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
      waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }] }));
    const rows = [{ item: ["ownership boundary"], raised_by: "leg1", owed_by: ["leg2"], discharged_by: "leg2" }];
    const fit = readerPathFitInput({ candidate_id: "c1", legs, obligations: rows }, lib, "orientation: none\nknowledge: none", "a thesis");
    if (fit.error) fails.push(`(s) the Move-fit input did not build: ${fit.error}`);
    else {
      const [first, second, third] = fit.input.candidate_you_must_judge.move_contracts;
      if (!first.deferred_slots || JSON.stringify(first.obligations_raised) !== JSON.stringify(rows)) fails.push(`(s) the Move-fit input does not carry the slot beside the Leg's rows: ${JSON.stringify(first)}`);
      if ("deferred_slots" in second || "obligations_raised" in second) fails.push(`(s) a Leg whose Move defers nothing carries a slot: ${JSON.stringify(second)}`);
      if ("deferred_slots" in third || "obligations_raised" in third) fails.push(`(s) a Leg whose Move defers only in its description carries a slot: ${JSON.stringify(third)}`);
    }
    // The row carries the article's words, one per slot item; the count is the one bond (kogaki#1577).
    const slotOf = (id) => { const m = compose.moveContract(id, lib); return m.error || !m.deferred_slots ? null : m.deferred_slots[0]; };
    const article = [{ item: ["offense-defense advantage", "offense-defense distinguishability"], raised_by: "leg1", owed_by: ["leg2"], discharged_by: "leg2" }];
    const rArticle = obligationLedgerRefusal(legs, article, slotOf);
    if (rArticle) fails.push(`(s) a row of two article-specific items filling a slot of two general items is refused: ${rArticle}`);
    const rShort = obligationLedgerRefusal(legs, [{ ...article[0], item: ["offense-defense advantage"] }], slotOf) || "";
    if (!rShort.includes("carries 1 item(s)") || !rShort.includes('"name_two_and_defer"') || !rShort.includes("a slot of 2")) {
      fails.push(`(s) a row of one item against a slot of two is not refused naming both: ${rShort || "no refusal"}`);
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

// (v) a row's `item` list carrying the items one slot counted, in raised order, is one promise
// (kogaki#1549, kogaki#1568): owed by two Legs in order and discharged by the second it passes;
// the same promise as two rows raised by one Leg trips the capacity rule; an empty list, a blank
// item and a repeated item are refused by name; the label and Path Review's discharge input read
// every item in order; and a row carrying the retired `kind`, `text` or `term` is refused naming
// the key, by the ledger rule and by the Candidate's own ledger reader.
{
  const { obligationLabel } = compose;
  const { candidateLedgerRefusal } = await import("./src/assemble.mjs");
  const legs = ids(4);
  const pair = { item: ["ownership boundary", "non-member fallback"], raised_by: "leg1",
    owed_by: ["leg2", "leg3"], discharged_by: "leg3" };
  const rPair = obligationLedgerRefusal(legs, [pair]);
  if (rPair) fails.push(`(v) a two-item list row owed by two Legs in order was refused: ${rPair}`);
  const full = (o) => legs.map((s, i) => ({ ...s, move: "m", materials: ["L1"], purpose: `purpose of ${s.leg_id}`,
    reader_state_after: `orientation: after ${s.leg_id}\nknowledge: after ${s.leg_id}`, depends_on: [], rationale: `why ${s.leg_id}`,
    claims: [{ type: "strand", strand: "L1", proposition: `claim of ${s.leg_id}` }],
    waypoints: [{ point: `the paragraph establishes what ${s.leg_id} claims`, serves: ["L1"] }],
    ...(i === 0 ? { opens_section: "A Section" } : {}), ...(i === 3 ? { reaches_target: true } : {}), ...o[i] }));
  const vPair = validateLegs(full([{}, {}, {}, {}]), "", [pair]);
  if (vPair.error) fails.push(`(v) validateLegs refused a path carrying a two-item list row: ${vPair.error}`);
  const asTwo = [
    { item: ["ownership boundary"], raised_by: "leg1", owed_by: ["leg2"], discharged_by: "leg2" },
    { item: ["non-member fallback"], raised_by: "leg1", owed_by: ["leg2", "leg3"], discharged_by: "leg3" },
  ];
  const rTwo = obligationLedgerRefusal(legs, asTwo);
  if (!rTwo || !/at most one open at any Leg/.test(rTwo) || !/leg 1 \(leg1\)/.test(rTwo)) fails.push(`(v) the same promise as two rows raised by one Leg was not refused by the capacity rule: ${rTwo}`);
  const rRepeat = obligationLedgerRefusal(legs, [{ ...pair, item: ["ownership boundary", "Ownership boundary"] }]);
  if (!rRepeat || !/repeats "Ownership boundary"/.test(rRepeat) || !/obligation 1/.test(rRepeat)) fails.push(`(v) a list naming an item twice was not refused by name: ${rRepeat}`);
  const rEmpty = obligationLedgerRefusal(legs, [{ ...pair, item: [] }]);
  if (!rEmpty || !/empty `item` list/.test(rEmpty)) fails.push(`(v) an empty item list was not refused by name: ${rEmpty}`);
  const rBlank = obligationLedgerRefusal(legs, [{ ...pair, item: ["ownership boundary", " "] }]);
  if (!rBlank || !/entry 2 is not one non-empty line/.test(rBlank)) fails.push(`(v) a list carrying a blank item was not refused: ${rBlank}`);
  const rString = obligationLedgerRefusal(legs, [{ ...pair, item: "ownership boundary" }]);
  if (!rString || !/no `item` list/.test(rString)) fails.push(`(v) an \`item\` that is a string, not a list, was not refused: ${rString}`);
  const one = { item: ["ownership boundary"], raised_by: "leg1", owed_by: ["leg2"], discharged_by: "leg2" };
  if (obligationLedgerRefusal(legs, [one])) fails.push(`(v) a one-item row stopped passing: ${obligationLedgerRefusal(legs, [one])}`);
  if (obligationLabel(pair) !== 'obligation "ownership boundary, non-member fallback"') fails.push(`(v) the label does not join the list in order: ${obligationLabel(pair)}`);
  if (obligationLabel(one) !== 'obligation "ownership boundary"') fails.push(`(v) a one-item row's label changed: ${obligationLabel(one)}`);
  const { dischargeRows } = compose;
  const [d] = dischargeRows(legs, [pair]);
  if (!d || d.row !== "ownership boundary, non-member fallback" || JSON.stringify(d.item) !== JSON.stringify(pair.item) || "kind" in d) {
    fails.push(`(v) Path Review's discharge input does not name a list row's items in order: ${JSON.stringify(d)}`);
  }
  for (const retired of [{ kind: "term" }, { kind: "question" }, { text: "why is the copy overwritten" }, { term: "ownership boundary" }, { term: ["ownership boundary"] }]) {
    const key = Object.keys(retired)[0];
    const row = { ...pair, ...retired };
    const rLedger = obligationLedgerRefusal(legs, [row]);
    if (!rLedger || !new RegExp("carries `" + key + "`, retired").test(rLedger)) fails.push(`(v) a row carrying the retired \`${key}\` was not refused naming it: ${rLedger}`);
    const bare = { ...retired, raised_by: "leg1", owed_by: ["leg2"], discharged_by: "leg2" };
    const rBare = obligationLedgerRefusal(legs, [bare]);
    if (!rBare || !new RegExp("`" + key + "`").test(rBare)) fails.push(`(v) a row in the retired shape alone (\`${key}\`, no \`item\`) was not refused naming it: ${rBare}`);
    const rCand = candidateLedgerRefusal({ candidate_id: "c1", legs, obligations: [row] });
    if (!rCand || !new RegExp("`" + key + "`").test(rCand)) fails.push(`(v) the Candidate's ledger reader did not refuse the retired \`${key}\` by name: ${rCand}`);
  }
  if (candidateLedgerRefusal({ candidate_id: "c1", legs, obligations: [pair] })) fails.push(`(v) the Candidate's ledger reader refused an item-list row: ${candidateLedgerRefusal({ candidate_id: "c1", legs, obligations: [pair] })}`);
}

if (fails.length > 0) {
  console.log("FAIL check-brief-obligations");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-obligations — the Thesis row reaching only the Reader target Leg, the reaches_target marking rule, a closing Leg introducing and raising nothing with its orientation/knowledge held, the mark reaching the Packet, the Obligation ledger's one conceded row and one open row per Leg, owed_by after the raising Leg in path order, no owed Leg opening a Section, every row terminal, an introduces entry carrying no kind, a Move's deferred slot read from its obligation field alone in the composer's and Move-fit inputs and a row whose item count is not its slot's refused naming both, Path Review's discharge_rows naming each row and its owed Legs, the retired closure key refused by name, names and the ledger reading introduces alone, and a row carrying an ordered item list as one promise with the retired kind, text and term refused by name (kogaki#1229, kogaki#1231, kogaki#1232, kogaki#1496, kogaki#1529, kogaki#1549, kogaki#1558, kogaki#1568, kogaki#1577).");
JS
