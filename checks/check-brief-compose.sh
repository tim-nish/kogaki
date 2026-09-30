#!/usr/bin/env bash
# check-brief-compose — the composition-side refusals kogaki#1225 added, and
# the derivations it retired, asserted over the pure validator and by
# absence over the carriers (owner decision 2026-09-29).
#
# HISTORY. A member of this name ran the compose → review → assemble → adopt
# sitting end to end and was removed under the 2026-09-25 retention rule
# (kogaki#1194). This file is NOT that member returning: it is a LIGHT
# member — pure validator calls and text reads, no model run, no runtime
# spawn — that carries exactly the assertions kogaki#1225 registers and
# nothing of the removed member's coverage.
#
# WHAT THIS COVERS.
#   (a) `validateLegs` (src/compose.mjs) refuses a path whose Reader start
#       contains a term a Leg lists under `introduces:`, naming the term and
#       the Leg — the one deterministic refusal in Reader start's content:
#       whether the reader "already knows" a term is judgment, but a Leg's
#       own `introduces:` entry is the composer's declaration that they do
#       not, and a declaration can be read.
#   (b) the same path with the term absent from Reader start is NOT refused
#       on that ground — whatever else the minimal fixture is refused for is
#       a different refusal, and the assertion is on the ground, not on a
#       pass: the fixture Leg is deliberately minimal so the introduced-term
#       clause, which runs before the per-Leg shape loop, is the only clause
#       that can name `introduces`.
#   (c) the match is WHOLE-WORD and case-insensitive: "check" is not found in
#       "checks", "Check" is found in "a check ran", a one-character term
#       matches only standing alone, and the anchor after the `—` separator
#       is not part of the term.
#   (d) `openingQuestionOf` is no longer exported from src/compose.mjs — no
#       Opening question is read off the first Leg any more.
#   (e) by absence over the carriers: `readers/dev-to-zenn.md`'s `reader`
#       field carries no purpose clause ("to fix or avoid"), and
#       `src/differentiation-schema.json`'s `question:` line derives nothing
#       from why the reader opened the post.
#   (f) the Thesis Closure row reaches only the Reader target Leg
#       (kogaki#1229, renamed under kogaki#1231): `targetLegIds`
#       (src/assemble.mjs) names the Leg marked `reaches_target` alone, and
#       `closureRowsForLeg` (src/compose.mjs), read over a Closure section
#       whose Thesis row names that Leg, hands the row to that Leg's Packet
#       and to no earlier Leg's. Before kogaki#1229 the row named every Leg,
#       so every Packet carried the whole path's closure narrative.
#   (g) `readerTargetLegRefusal` (src/compose.mjs) refuses a path carrying
#       zero, or more than one, Leg marked `reaches_target`, and refuses one
#       marking the first Leg — naming the rule (kogaki#1231).
#   (h) a closing Leg (any Leg after the one marked `reaches_target`)
#       carrying an `introduces` entry, or named `introduced_by` on a
#       Closure row, is refused naming the Leg and the rule (kogaki#1231).
#   (i) a closing Leg whose `reader_state_after` orientation or knowledge
#       line differs from the target Leg's is refused naming the Leg and the
#       rule; the same closing Leg with only its question, expectation or
#       trust line differing is NOT refused (kogaki#1231).
#   (j) the derivation: `targetLegAfterState` (src/assemble.mjs) reads the
#       marked Leg's `reader_state_after`, line for line, regardless of its
#       position in the path (kogaki#1231, reversing kogaki#1225's last-Leg
#       derivation).
#   (k) the mark reaches the Packet (kogaki#1231, acceptance item 4):
#       `renderLeg` (src/compose.mjs) writes `reaches_target: true` on the
#       marked Leg and no line on any other; `parseLegBlockBody`
#       (src/draft.mjs) reads it back and refuses any value but `true`
#       naming the Leg; and a Packet rendered over the real
#       src/packet-template.md carries "This Leg reaches the Reader target."
#       on the marked Leg, the closing-Leg line on each Leg after it, and
#       neither on a Leg before it.
#
# WHAT THIS DOES NOT COVER, stated rather than left to look covered: whether
# a Reader start is a GOOD cold read of the Thesis as a title, and whether
# its `question:` line is this reader's reaction to the wording they saw,
# are judgments read by the owner against the Brief and linted nowhere
# (Every MUST is judgment). What a closing Leg does with terms the reader
# already holds, and the Thesis-row leak under the retired last-Leg
# derivation, are separate proposals (kogaki#1231's own scope note), not
# here. The retired `reader_target` derivation and the removed `Opening
# question` heading are covered by check-brief-differentiation.sh's
# kogaki#1225 half, not here.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync } from "node:fs";
import * as compose from "./src/compose.mjs";
import { targetLegIds, targetLegAfterState } from "./src/assemble.mjs";
import { parseLegBlockBody, parseBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg,
  readerTargetLine, REACHES_TARGET_LINE, CLOSING_LEG_LINE } from "./src/draft.mjs";

const { validateLegs, introducedTermInReaderStart, closureRowsForLeg, readerTargetLegRefusal, renderLeg } = compose;
const fails = [];

const READER_START = "knowledge: can read code and has used a CI system\nquestion: holds: none\ntrust: the default a peer's post gets";

// (a) a Reader start carrying an introduced term is refused naming the term and the Leg.
{
  const legs = [
    { leg_id: "s1", introduces: ["pipeline"] },
    { leg_id: "s2", introduces: ["CI — the system that runs the checks"] },
  ];
  const r = validateLegs(legs, READER_START);
  if (!r.error) fails.push("(a) a Reader start carrying a term a Leg introduces was not refused");
  else {
    if (!/"CI"/.test(r.error)) fails.push(`(a) the refusal did not name the term: ${r.error}`);
    if (!/leg 2 \(s2\)/.test(r.error)) fails.push(`(a) the refusal did not name the Leg: ${r.error}`);
    if (!/lists under introduces/.test(r.error)) fails.push(`(a) the refusal did not name the introduces ground: ${r.error}`);
  }
}

// (b) the same path with the term absent from Reader start is not refused on that ground.
{
  const legs = [
    { leg_id: "s1", introduces: ["pipeline"] },
    { leg_id: "s2", introduces: ["invariant — a condition that must always hold"] },
  ];
  const r = validateLegs(legs, READER_START);
  if (r.error && /lists under introduces/.test(r.error)) fails.push(`(b) a Reader start carrying no introduced term was refused on the introduced-term ground: ${r.error}`);
  const none = validateLegs(legs, "");
  if (none.error && /lists under introduces/.test(none.error)) fails.push(`(b) with no Reader start to hand, the introduced-term clause still fired: ${none.error}`);
}

// (c) whole-word, case-insensitive matching.
{
  if (typeof introducedTermInReaderStart !== "function") fails.push("(c) src/compose.mjs exports no introducedTermInReaderStart");
  else {
    const cases = [
      ["check", "question: why did my checks pass", false, "a term inside a longer word"],
      ["Check", "knowledge: a check ran", true, "a term differing only in case"],
      ["x", "knowledge: x marks it", true, "a one-character term standing alone"],
      ["x", "knowledge: an xylophone", false, "a one-character term inside a word"],
      ["CI", "knowledge: has used a CI system", true, "a term at a word boundary"],
      ["fail-closed", "orientation: expects fail-closed checks", true, "a hyphenated term"],
      // The dimension LABELS are never matchable text (PR #1228 round 1).
      ["trust", "knowledge: one claim\ntrust: a peer's default", false, "a term equal to a dimension label, absent from the values"],
      ["question", "question: holds: none\ntrust: a peer's default", false, "the question label with no question in the values"],
      ["trust", "knowledge: one claim\norientation: trust is the issue", true, "a term equal to a dimension label, present in a value"],
    ];
    for (const [term, start, want, why] of cases) {
      const got = introducedTermInReaderStart(term, start);
      if (got !== want) fails.push(`(c) ${why}: introducedTermInReaderStart(${JSON.stringify(term)}, ${JSON.stringify(start)}) = ${got}, want ${want}`);
    }
    const anchored = validateLegs([{ leg_id: "s1", introduces: ["gate — the default a peer's post gets"] }], READER_START);
    if (anchored.error && /lists under introduces/.test(anchored.error)) fails.push(`(c) the anchor after the separator was read as part of the term: ${anchored.error}`);
  }
}

// (d) no Opening question is read off the first Leg any more.
{
  if ("openingQuestionOf" in compose) fails.push("(d) src/compose.mjs still exports openingQuestionOf");
  const src = readFileSync("src/compose.mjs", "utf8");
  if (/export function openingQuestionOf/.test(src)) fails.push("(d) src/compose.mjs still defines openingQuestionOf");
}

// (e) the carriers derive nothing from why the reader opened the post.
{
  const persona = readFileSync("readers/dev-to-zenn.md", "utf8");
  if (/to fix or avoid/.test(persona)) fails.push("(e) readers/dev-to-zenn.md's `reader` field still carries the purpose clause");
  const schema = JSON.parse(readFileSync("src/differentiation-schema.json", "utf8"));
  const q = schema.record.reader_start.lines.question;
  if (typeof q !== "string" || /opened the post/.test(q)) fails.push(`(e) src/differentiation-schema.json's question line still derives from why the reader opened the post: ${JSON.stringify(q)}`);
  if (!/holds: none/.test(q) || !/reaction to the wording/.test(q)) fails.push(`(e) src/differentiation-schema.json's question line does not state the pinned stimulus rule: ${JSON.stringify(q)}`);
  const workflow = readFileSync("src/brief-workflow.json", "utf8");
  if (/and why they opened it\)/.test(workflow)) fails.push("(e) src/brief-workflow.json's Persona note still lists why they opened it as a `reader` field clause");
}

// (f) the Thesis Closure row reaches only the Reader target Leg (kogaki#1229, kogaki#1231).
{
  const legs = ["leg1", "leg2", "leg3", "leg4", "leg5", "leg6"].map((leg_id) => ({ leg_id }));
  legs[3].reaches_target = true; // leg4 — not the last Leg, and not the first.
  const named = targetLegIds(legs);
  if (JSON.stringify(named) !== JSON.stringify(["leg4"])) fails.push(`(f) targetLegIds named ${JSON.stringify(named)}, want ["leg4"]`);
  if (targetLegIds([]).length !== 0) fails.push("(f) targetLegIds over no Legs named a Leg");
  // The Closure section exactly as fillBrief renders it (src/compose.mjs): the
  // Thesis row, then the Leg rows.
  const doc = "# Brief\n\n## Closure\n\n### Thesis\n\n"
    + `The whole claim holds once the target Leg lands. — established_by_legs: ${named.join(", ")}\n\n`
    + "### Legs\n\n- an obligation raised early — introduced_by: leg1; discharged_by: leg3\n\n## Next\n\ntext\n";
  for (const { leg_id } of legs) {
    const rows = closureRowsForLeg(doc, leg_id);
    const carries = rows.some((r) => /whole claim holds/.test(r));
    if (leg_id === "leg4" && !carries) fails.push("(f) the target Leg's Packet carries no Thesis row");
    if (leg_id !== "leg4" && carries) fails.push(`(f) ${leg_id}'s Packet carries the Thesis row, which only the target Leg's may`);
  }
  const leg1 = closureRowsForLeg(doc, "leg1");
  if (!leg1.some((r) => /obligation raised early/.test(r))) fails.push("(f) the Leg rows stopped reaching the Leg that introduced them");
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

// (k) the mark reaches the Packet (kogaki#1231, acceptance item 4): written by renderLeg,
// read back by parseLegBlockBody, and rendered under `## This Leg` on the marked Leg and
// on each closing Leg, and on no Leg before the mark.
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_before: `orientation: before ${leg_id}\nknowledge: before ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }],
    ...extra,
  });
  const marked = renderLeg(legOf("s2", { reaches_target: true }));
  const plain = renderLeg(legOf("s1"));
  if (!/^reaches_target: true$/m.test(marked)) fails.push(`(k) renderLeg wrote no reaches_target line on the marked Leg: ${JSON.stringify(marked)}`);
  if (/reaches_target/.test(plain)) fails.push(`(k) renderLeg wrote a reaches_target line on an unmarked Leg: ${JSON.stringify(plain)}`);

  const body = (text) => text.replace(/^```leg\n/, "").replace(/\n```$/, "");
  const back = parseLegBlockBody(body(marked), "k.md");
  if (!back.leg || back.leg.reaches_target !== true) fails.push(`(k) parseLegBlockBody did not read the mark back: ${JSON.stringify(back)}`);
  const unmarked = parseLegBlockBody(body(plain), "k.md");
  if (!unmarked.leg || unmarked.leg.reaches_target !== undefined) fails.push(`(k) parseLegBlockBody read a mark off an unmarked Leg: ${JSON.stringify(unmarked)}`);
  const half = parseLegBlockBody(body(marked).replace("reaches_target: true", "reaches_target: false"), "k.md");
  if (!half.refusal || !/leg s2/.test(half.refusal) || !/reaches_target/.test(half.refusal)) fails.push(`(k) a reaches_target value other than true was not refused naming the Leg: ${JSON.stringify(half)}`);

  const legs = [legOf("s1"), legOf("s2", { reaches_target: true }), legOf("s3")];
  if (readerTargetLine(legs, "s1") !== "") fails.push("(k) readerTargetLine rendered a line on a Leg before the mark");
  if (readerTargetLine(legs, "s2") !== REACHES_TARGET_LINE) fails.push("(k) readerTargetLine did not render the target line on the marked Leg");
  if (readerTargetLine(legs, "s3") !== CLOSING_LEG_LINE) fails.push("(k) readerTargetLine did not render the closing line on the Leg after the mark");
  if (readerTargetLine([legOf("s1"), legOf("s2")], "s2") !== "") fails.push("(k) readerTargetLine rendered a line on a path carrying no mark");

  // THE RENDERED PACKET, over the real template and a Brief parsed from renderLeg's own output.
  const briefText = [
    "# The fixture", "", "survey pin: `product-lab@0000000000000000000000000000000000000000`", "",
    "## Strands", "", "### L1 — first-strand", "",
    "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
    "## Thesis", "", "The fixture claim.", "",
    "## Reader start", "", "orientation: before s1", "knowledge: before s1", "",
    "## Reader target", "", "orientation: after s2", "knowledge: after s2", "",
    "## Sequence", "", legs.map(renderLeg).join("\n\n"), "",
  ].join("\n");
  const brief = parseBrief(briefText, "k.md");
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
  if (packets.s2 && !/## This Leg[\s\S]*This Leg reaches the Reader target\.[\s\S]*## The claims this Leg asserts/.test(packets.s2)) fails.push("(k) the target line is not rendered inside the `## This Leg` block");
}

// (l) closureLedgerRefusal — at most one conceded_by row in the path (kogaki#1232).
{
  const { closureLedgerRefusal } = compose;
  if (typeof closureLedgerRefusal !== "function") fails.push("(l) src/compose.mjs exports no closureLedgerRefusal");
  else {
    const legs = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id }));
    const twoConceded = [
      { text: "a question set aside early", introduced_by: "leg1", conceded_by: "leg1" },
      { text: "a question set aside late", introduced_by: "leg2", conceded_by: "leg3" },
    ];
    const rTwo = closureLedgerRefusal(legs, twoConceded);
    if (!rTwo) fails.push("(l) two conceded_by rows in one path were not refused");
    else {
      if (!/closure_one_conceded_row/.test(rTwo)) fails.push(`(l) the refusal did not name the rule: ${rTwo}`);
      if (!/a question set aside early/.test(rTwo) || !/a question set aside late/.test(rTwo)) fails.push(`(l) the refusal did not name both rows: ${rTwo}`);
    }

    const oneConceded = [twoConceded[0]];
    const rOne = closureLedgerRefusal(legs, oneConceded);
    if (rOne) fails.push(`(l) exactly one conceded_by row was refused: ${rOne}`);

    // A row whose introduced_by and conceded_by name the SAME Leg is the ordinary case.
    const sameLeg = [{ text: "set aside where raised", introduced_by: "leg2", conceded_by: "leg2" }];
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
    if (!/closure_one_row_open_per_leg/.test(rThree)) fails.push(`(m) the refusal did not name the rule: ${rThree}`);
    if (!/leg 3 \(leg3\)/.test(rThree)) fails.push(`(m) the refusal did not name the Leg: ${rThree}`);
    if (!/row A/.test(rThree) || !/row B/.test(rThree) || !/row C/.test(rThree)) fails.push(`(m) the refusal did not name every row open there: ${rThree}`);
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
    { text: "row B", introduced_by: "leg2", conceded_by: "leg2" },
  ];
  const rSettled = closureLedgerRefusal(legs, settledInPlace);
  if (rSettled) fails.push(`(m) a row conceded in its own raising Leg was counted as open there: ${rSettled}`);
  // ...and validateLegs runs the same check over a full path, refusing at the same ground.
  const fullLegs = legs.map((s) => ({ ...s, move: "m", materials: ["L1"], purpose: `purpose of ${s.leg_id}`,
    reader_state_before: `orientation: before ${s.leg_id}\nknowledge: before ${s.leg_id}`,
    reader_state_after: `orientation: after ${s.leg_id}\nknowledge: after ${s.leg_id}`,
    depends_on: [], rationale: `why ${s.leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${s.leg_id}` }] }));
  fullLegs[3].reaches_target = true;
  const rFull = validateLegs(fullLegs, "", threeOpenAtLeg3);
  if (!rFull.error) fails.push("(m) validateLegs did not refuse a full path over the same three-open ledger");
  else if (!/closure_one_row_open_per_leg/.test(rFull.error)) fails.push(`(m) validateLegs's refusal did not name the rule: ${rFull.error}`);
}

if (fails.length > 0) {
  console.log("FAIL check-brief-compose");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-compose — the introduced-term refusal (named term and Leg; not fired without the term or without a Reader start; whole-word and case-insensitive; the anchor is not the term), openingQuestionOf's absence, the carriers deriving nothing from why the reader opened the post, the Thesis Closure row reaching only the Reader target Leg, the reaches_target marking rule (zero/two/first-Leg refused), a closing Leg introducing nothing and raising nothing, a closing Leg's orientation/knowledge held at the target Leg's (question/expectation/trust free), the Reader target derivation reading the marked Leg regardless of position, and the mark reaching the Packet (written by renderLeg, read back by parseLegBlockBody, rendered on the marked Leg and each closing Leg and on no Leg before)");
JS
