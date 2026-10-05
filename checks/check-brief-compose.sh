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
#   (p) `renderPacket` renders a Journey's RESOLVED text under the Journey
#       block, its served address kept beside it as citation — never the
#       address alone; and a Journey entry with no `resolvedText` (resolution
#       skipped) refuses the Packet by name, the same way any other missing
#       block does, rather than rendering a hole (kogaki#1250, owner ruling
#       2026-10-04).
#   (q) `journeyTextFromSurvey`/`journeyResolutionRefusal` (src/draft.mjs):
#       a cite in neither admitted form, and a well-formed cite the served
#       survey holds no record for, each refuse naming the Leg and the
#       address; a cite the survey does hold resolves (both the address and
#       the identity cite forms) and composes no refusal.
#   (r) `writerRefusal` (src/draft.mjs) reads the declared `refusal: <reason>`
#       form off the FIRST LINE of a writer response alone — never ordinary
#       prose, never a refusal clause arriving after other text, never an
#       empty reason, never a non-string (json-envelope-error) response. This
#       is what `callWriter` checks ahead of the act's own prose refusal, to
#       end the act without a retry (kogaki#1250).
#   (s) `journeyProseFromShardLines` (src/draft.mjs) reads a Journey's prose
#       out of `gloss_index` shard lines shaped as served — `{cite, text}`
#       per line, heading, prose, `Source:` trailer — keeping only the lines
#       whose cite names that slug and kind, and returns null where none do:
#       `element_survey` serves manifests only, never prose.
#   (x) `re-activate` admits the third form `<leg_id> journey <strand id>`
#       (kogaki#1263, kogaki#1260): a line naming a Strand the depended-on Leg
#       lists in its `journeys` passes compose; one naming a Strand it does
#       not refuses naming the entry.
#   (y) a Brief carrying more than one `introduces_item` naming `nearest`
#       across the whole path is refused naming both terms and both
#       `nearest` values (kogaki#1251 item 2, kogaki#1260); one is not.
#   (z) a conceded Closure row lacking any of `open`, `why_not_here` or
#       `reader_keeps` is refused naming the row and the missing field
#       (kogaki#1251 item 3, kogaki#1260).
#  (ab) the Write block's prose rules are the Persona's (kogaki#1261): two
#       Briefs naming two Persona files at `compose_path` render two Write
#       blocks, each carrying its own Persona's `prose` block; across the
#       Legs of one Brief the Write block is identical except the budget and
#       the re-activate line, which renders on a Leg with `re-activate`
#       entries and on no other; and a Persona with no `prose` block refuses
#       the Packet by name.
#  (ac) a Journey an earlier Leg used and this Leg does not re-activate is
#       listed under "Held by the reader, not material here"; a Leg that
#       re-activates it renders its served scene under "Active here" and not
#       under Held; an unresolved re-activated Journey refuses by name
#       (kogaki#1261).
#  (ad) a typed `introduces_item` round-trips through the Brief (renderLeg
#       writes it, parseIntroducesEntry reads it back) and "Introduce here"
#       renders its kind and, for a coined term, the `nearest`/`differs`
#       authority line; with `external_authority: off` in the Brief header
#       the Packet carries neither (kogaki#1261).
#  (ae) a conceded Closure row's `open`, `why_not_here` and `reader_keeps`
#       are written under the row by fillBrief's format, read back by
#       concededRowFields, and rendered in the Packet of the conceding Leg
#       (kogaki#1261).
#  (aa) a Brief whose reaching Leg's `names` lists a term no Leg of the path
#       introduces is refused naming the term (kogaki#1251 item 4,
#       kogaki#1260); a `names` list that is a subset of the union of every
#       Leg's `introduces` is not.
#  (bb) `composeBrief` (src/brief.mjs) records `compose_path` naming the
#       Persona file it was composed with, and refuses a blank, absent or
#       non-string one by name (kogaki#1251 item 1, kogaki#1262).
#  (cc) `composeBrief` renders `external_authority: on` when the mint gives
#       none, `external_authority: off` when minted with `off`, and refuses
#       any third value by name (kogaki#1251 item 3, kogaki#1262).
#  (af) `src/leg-schema.json`'s `introduces_item.nearest` description states
#       the at-most-one-introduces-item-per-path limit that
#       `introducesNearestRefusal` (unchanged, kogaki#1260) enforces
#       (kogaki#1270).
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
import { composeBrief } from "./src/brief.mjs";
import { targetLegIds, targetLegAfterState } from "./src/assemble.mjs";
import { parseLegBlockBody, parseBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg,
  readerTargetLine, REACHES_TARGET_LINE, CLOSING_LEG_LINE,
  journeyTextFromSurvey, journeyResolutionRefusal, journeyIdentityKey, writerRefusal, journeyProseFromShardLines,
  REACTIVATE_LINE } from "./src/draft.mjs";

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
  if (packets.s2 && !/## The Section this Leg sits in[\s\S]*This Leg reaches the Reader target\.[\s\S]*## What is active here/.test(packets.s2)) fails.push("(k) the target line is not rendered inside the `## The Section this Leg sits in` block");
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
    reader_state_before: `orientation: before ${s.leg_id}\nknowledge: before ${s.leg_id}`,
    reader_state_after: `orientation: after ${s.leg_id}\nknowledge: after ${s.leg_id}`,
    depends_on: [], rationale: `why ${s.leg_id}`, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${s.leg_id}` }] }));
  fullLegs[0].opens_section = "A Section";
  fullLegs[3].reaches_target = true;
  const rFull = validateLegs(fullLegs, "", threeOpenAtLeg3);
  if (!rFull.error) fails.push("(m) validateLegs did not refuse a full path over the same three-open ledger");
  else if (!/at most one row open at any given Leg/.test(rFull.error)) fails.push(`(m) validateLegs's refusal did not name the rule: ${rFull.error}`);
}

// (n) `re-activate` (kogaki#1237): the three composition refusals name the entry; the
// Packet renders what is re-activated under "Active here" verbatim and every other
// ledger term under "Held by the reader, not material here"; a Leg re-activating
// nothing renders a stated absence; `depends_on` reaches no Packet.
{
  const { reactivateRefusal, reactivateSemanticRefusal, readerKnowledgeLedger } = compose;
  if (typeof reactivateRefusal !== "function" || typeof reactivateSemanticRefusal !== "function") fails.push("(n) src/compose.mjs exports no re-activate refusals");
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_before: `orientation: before ${leg_id}\nknowledge: before ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
    ...extra,
  });
  const path = (s2extra) => {
    const legs = [legOf("s1", { opens_section: "A Section", introduces: ["unfed guard — a guard whose input nobody feeds", "pipeline"] }),
      legOf("s2", { depends_on: ["s1"], reaches_target: true, ...s2extra }),
      legOf("s3", { depends_on: ["s2"] })];
    legs[2].reader_state_after = legs[1].reader_state_after;
    return legs;
  };
  const outside = validateLegs(path({ "re-activate": ["s3 term pipeline"], depends_on: ["s1"] }), "");
  if (!outside.error || !/not in this Leg's depends_on/.test(outside.error) || !/"s3 term pipeline"/.test(outside.error)) fails.push(`(n) a re-activate naming a Leg outside depends_on was not refused naming the entry: ${outside.error}`);
  const noTerm = validateLegs(path({ "re-activate": ["s1 term deterrence"] }), "");
  if (!noTerm.error || !/does not introduce "deterrence"/.test(noTerm.error) || !/"s1 term deterrence"/.test(noTerm.error)) fails.push(`(n) a re-activate naming a term the Leg does not introduce was not refused naming the entry: ${noTerm.error}`);
  const noClaim = validateLegs(path({ "re-activate": ["s1 claim L9"] }), "");
  if (!noClaim.error || !/carries no claim for strand "L9"/.test(noClaim.error) || !/"s1 claim L9"/.test(noClaim.error)) fails.push(`(n) a re-activate naming a Strand the Leg carries no claim for was not refused naming the entry: ${noClaim.error}`);
  const shape = validateLegs(path({ "re-activate": ["s1 pipeline"] }), "");
  if (!shape.error || !/re-activate/.test(shape.error)) fails.push(`(n) a malformed re-activate entry was not refused: ${shape.error}`);
  const good = validateLegs(path({ "re-activate": ["s1 term unfed guard", "s1 claim L1"] }), "");
  if (good.error) fails.push(`(n) a well-formed re-activate over depends_on material was refused: ${good.error}`);

  // THE RENDERED PACKET, over the real template and a Brief parsed from renderLeg's own output.
  const legs = path({ "re-activate": ["s1 term unfed guard"] });
  const briefText = [
    "# The fixture", "", "survey pin: `product-lab@0000000000000000000000000000000000000000`", "",
    "## Strands", "", "### L1 — first-strand", "",
    "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
    "## Thesis", "", "The fixture claim.", "",
    "## Reader start", "", "orientation: before s1", "knowledge: before s1", "",
    "## Reader target", "", "orientation: after s2", "knowledge: after s2", "",
    "## Sequence", "", legs.map(renderLeg).join("\n\n"), "",
  ].join("\n");
  const brief = parseBrief(briefText, "n.md");
  if (brief.refusals.length || brief.legs.length !== 3) fails.push(`(n) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)} legs=${brief.legs.length}`);
  else if (JSON.stringify(brief.legs[1]["re-activate"]) !== JSON.stringify(["s1 term unfed guard"])) fails.push(`(n) parseLegBlockBody did not read re-activate back one line per entry: ${JSON.stringify(brief.legs[1]["re-activate"])}`);
  const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
  const moveText = ["id: open_the_claim", "technique: >-", "  what the move does.", "question: >-", "  holds: none", "breaks: >-", "  what a correct performance must not do.", ""].join("\n");
  const ledger = readerKnowledgeLedger(brief.legs);
  const sections = sectionsOf(brief.legs);
  const packets = {};
  for (const leg of brief.legs) {
    const r = renderPacket({ template: split.packet, brief, leg, moveText, priorSections: [],
      ledgerRow: ledger.find((row) => row.leg_id === leg.leg_id), section: sectionOfLeg(brief.legs).get(leg.leg_id), sections });
    if (r.error) { fails.push(`(n) the Packet for ${leg.leg_id} did not render: ${r.error}`); continue; }
    packets[leg.leg_id] = r.packet;
  }
  const block = (id, heading) => {
    const m = (packets[id] || "").split(`### ${heading}\n`)[1];
    return m ? m.split("\n###")[0] : null;
  };
  const active2 = block("s2", "Active here"), held2 = block("s2", "Held by the reader, not material here");
  if (active2 === null || held2 === null) fails.push("(n) the Packet does not carry both the Active here and Held by the reader blocks");
  else {
    if (!/unfed guard/.test(active2) || !/re-activated from s1/.test(active2)) fails.push(`(n) the re-activated term is not under Active here verbatim: ${active2.trim().slice(0, 160)}`);
    if (/unfed guard/.test(held2)) fails.push("(n) the re-activated term is also under Held by the reader");
    if (!/pipeline/.test(held2)) fails.push(`(n) the term not re-activated is not under Held by the reader: ${held2.trim().slice(0, 160)}`);
  }
  const active3 = block("s3", "Active here");
  if (active3 === null || !/nothing — this Leg re-activates no earlier material/.test(active3)) fails.push(`(n) a Leg re-activating nothing does not render a stated absence under Active here: ${String(active3).trim().slice(0, 160)}`);
  for (const id of Object.keys(packets)) {
    if (/depends_on/.test(packets[id])) fails.push(`(n) depends_on reaches the Packet of ${id}`);
    if (/Already knows/.test(packets[id])) fails.push(`(n) the retired Already knows heading is still rendered in the Packet of ${id}`);
  }
}

// (o) the Packet carries none of the retired planning blocks, carries the
// three Write rules verbatim, and carries the Move block header naming
// attribute-only use (kogaki#1247, owner ruling 2026-10-02/04).
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_before: `orientation: before ${leg_id}\nknowledge: before ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }],
    ...extra,
  });
  const legs = [legOf("s1")];
  const briefText = [
    "# The fixture", "", "survey pin: `product-lab@0000000000000000000000000000000000000000`", "",
    "## Strands", "", "### L1 — first-strand", "",
    "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`", "",
    "## Thesis", "", "The fixture claim.", "",
    "## Reader start", "", "orientation: before s1", "knowledge: before s1", "",
    "## Reader target", "", "orientation: after s1", "knowledge: after s1", "",
    "## Sequence", "", legs.map(renderLeg).join("\n\n"), "",
  ].join("\n");
  const brief = parseBrief(briefText, "o.md");
  if (brief.refusals.length || brief.legs.length !== 1) fails.push(`(o) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)} legs=${brief.legs.length}`);
  else {
    const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
    if (split.error) fails.push(`(o) the Packet template did not split: ${split.error}`);
    else {
      const moveText = ["id: open_the_claim", "technique: >-", "  what the move does.", "question: >-",
        "  holds: none", "breaks: >-", "  what a correct performance must not do.", ""].join("\n");
      const sections = sectionsOf(brief.legs);
      const r = renderPacket({ template: split.packet, brief, leg: brief.legs[0], moveText, priorSections: [],
        ledgerRow: undefined, section: sectionOfLeg(brief.legs).get("s1"), sections });
      if (r.error) fails.push(`(o) the Packet for s1 did not render: ${r.error}`);
      else {
        const packet = r.packet;
        for (const gone of ["Reader start", "Reader target", "purpose.", "reader_state_before", "reader_state_after", "draws_on"]) {
          if (packet.includes(gone)) fails.push(`(o) the Packet still carries the retired string ${JSON.stringify(gone)}`);
        }
        const rules = [
          "Each opens on the sentence that states its point; every later",
          "classic register, full clauses, a concrete subject acting",
          // The Referents rule moved into the Persona's `prose` block and now
          // defines a referent (kogaki#1261).
          "A referent is a case, example, file or person the prose can",
        ];
        for (const rule of rules) {
          if (!packet.includes(rule)) fails.push(`(o) the Packet does not carry the Write rule verbatim: ${JSON.stringify(rule)}`);
        }
        if (!/never prose/.test(packet)) fails.push("(o) the Packet's Move block header does not carry \"never prose\"");
      }
    }
  }
}

// (p) a Packet renders a Journey's RESOLVED text under the Journey block,
// the served address kept beside it as citation — never the address alone
// (kogaki#1250, owner ruling 2026-10-04).
{
  const leg = {
    leg_id: "s1", move: "open_the_claim", body: "claim (strand L1): claim of s1",
    journeys: [{ strand: "L1", use: "an example to retell", resolvedText: "The served Journey's own prose, verbatim." }],
  };
  const brief = {
    text: "", legs: [leg],
    strands: [{ id: "L1", slug: "first-strand",
      cites: [{ kind: "journey cite", cite: "product-lab::journey/first-journey@0011223344556677" }] }],
  };
  const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
  if (split.error) fails.push(`(p) the Packet template did not split: ${split.error}`);
  else {
    const moveText = ["id: open_the_claim", "technique: >-", "  what the move does.", "question: >-",
      "  holds: none", "breaks: >-", "  what a correct performance must not do.", ""].join("\n");
    const sections = sectionsOf(brief.legs);
    const r = renderPacket({ template: split.packet, brief, leg, moveText, priorSections: [],
      ledgerRow: undefined, section: sectionOfLeg(brief.legs).get("s1"), sections });
    if (r.error) fails.push(`(p) the Packet for s1 did not render: ${r.error}`);
    else {
      if (!r.packet.includes("The served Journey's own prose, verbatim.")) fails.push("(p) the Packet does not carry the Journey's resolved text");
      if (!r.packet.includes("product-lab::journey/first-journey@0011223344556677")) fails.push("(p) the Packet dropped the Journey's served address — the citation stands beside the text, never replaced by it");
    }
  }
  // A Leg whose Journey entry carries no resolvedText (the caller skipped
  // resolution) refuses the SAME WAY an absent block does anywhere else in
  // the Packet — never a hole the model fills by invention.
  const legUnresolved = { leg_id: "s2", move: "open_the_claim", body: "claim (strand L1): claim of s2",
    journeys: [{ strand: "L1", use: "an example to retell" }] };
  const sections2 = sectionsOf([legUnresolved]);
  const r2 = renderPacket({ template: split.packet, brief: { ...brief, legs: [legUnresolved] }, leg: legUnresolved,
    moveText: ["id: open_the_claim", "technique: >-", "  x.", "question: >-", "  holds: none", "breaks: >-", "  x.", ""].join("\n"),
    priorSections: [], ledgerRow: undefined, section: sectionOfLeg([legUnresolved]).get("s2"), sections: sections2 });
  if (!r2.error) fails.push("(p) a Journey entry with no resolvedText rendered a Packet instead of refusing");
  else if (!/s2's Journey text/.test(r2.error)) fails.push(`(p) the unresolved-Journey refusal does not name the Leg's Journey text: ${r2.error}`);
}

// (q) a Journey cite that does not resolve refuses the Packet build, naming
// the Leg and the address — BEFORE any writer is called (kogaki#1250).
{
  const served = new Map([
    [journeyIdentityKey("first-journey", "journey"), { slug: "first-journey", kind: "journey", body: "The served Journey's own prose." }],
  ]);
  // a cite in neither admitted form.
  const badForm = journeyTextFromSurvey("not-a-real-cite", served);
  if (!badForm.error) fails.push("(q) a cite in neither the address nor the identity form resolved");
  const refusalBadForm = journeyResolutionRefusal("s1", { strand: "L1" }, "not-a-real-cite", badForm);
  if (!refusalBadForm) fails.push("(q) an unresolvable cite composed no refusal");
  else {
    if (!/leg s1's Journey L1/.test(refusalBadForm)) fails.push(`(q) the refusal does not name the Leg and the Strand: ${refusalBadForm}`);
    if (!refusalBadForm.includes("not-a-real-cite")) fails.push(`(q) the refusal does not name the address: ${refusalBadForm}`);
  }
  // a well-formed cite the served survey holds no record for.
  const noRecord = journeyTextFromSurvey("product-lab::journey/missing-journey@0011223344556677", served);
  if (!noRecord.error) fails.push("(q) a cite naming a record absent from the served survey resolved");
  const refusalNoRecord = journeyResolutionRefusal("s1", { strand: "L1" }, "product-lab::journey/missing-journey@0011223344556677", noRecord);
  if (!refusalNoRecord || !/resolves nowhere/.test(refusalNoRecord)) fails.push(`(q) the refusal for an absent record does not say so: ${refusalNoRecord}`);
  // a cite the served survey DOES hold — resolves, no refusal.
  const ok = journeyTextFromSurvey("product-lab::journey/first-journey@0011223344556677", served);
  if (ok.error) fails.push(`(q) a cite the served survey holds did not resolve: ${ok.error}`);
  else if (ok.text !== "The served Journey's own prose.") fails.push(`(q) the resolved text is not the served record's body: ${JSON.stringify(ok.text)}`);
  if (journeyResolutionRefusal("s1", { strand: "L1" }, "product-lab::journey/first-journey@0011223344556677", ok)) {
    fails.push("(q) a Journey that resolves still composed a refusal");
  }
  // the identity form (gloss/ELEMENTS.jsonl slug=... kind=journey @sha) resolves against the same map.
  const identity = journeyTextFromSurvey("gloss/ELEMENTS.jsonl slug=first-journey kind=journey @0011223344556677", served);
  if (identity.error) fails.push(`(q) the identity cite form did not resolve: ${identity.error}`);
}

// (r) a writer response opening with `refusal: <reason>` is the writer's OWN
// refusal of the act, not prose — read by `callWriter` before `refuse`, and
// ending the act WITHOUT a retry (kogaki#1250). First-line only: a clause
// later in otherwise-written prose is not this form.
{
  const r = writerRefusal("refusal: the Packet carries no example to perform this Move on");
  if (r !== "the Packet carries no example to perform this Move on") fails.push(`(r) the refusal line was not read: ${JSON.stringify(r)}`);
  const multi = writerRefusal("refusal: the Move cannot be performed\nsome trailing line");
  if (multi !== "the Move cannot be performed") fails.push(`(r) a refusal followed by further lines did not read the reason off the first line alone: ${JSON.stringify(multi)}`);
  const prose = writerRefusal("This Leg opens on the claim that...");
  if (prose !== null) fails.push(`(r) ordinary prose was read as a refusal: ${JSON.stringify(prose)}`);
  const late = writerRefusal("Some prose first.\nrefusal: arriving too late to count");
  if (late !== null) fails.push(`(r) a refusal clause arriving after the first line was read as the declared form: ${JSON.stringify(late)}`);
  const empty = writerRefusal("refusal:   ");
  if (empty !== null) fails.push(`(r) a refusal line with no reason was read as a declared refusal: ${JSON.stringify(empty)}`);
  const nonString = writerRefusal({ error: "the writer's json response does not parse" });
  if (nonString !== null) fails.push(`(r) a non-string response (the json-envelope error shape) was read as a refusal: ${JSON.stringify(nonString)}`);
}

// (s) a Journey's prose is read from its Gloss shard lines, never from the
// survey manifest, which carries none (kogaki#1250).
{
  const a = "coding::journey/first-journey@72aefc6dea327a46";
  const b = "coding::journey/other-journey@4d95b3f1c2b2950c";
  const lines = [
    { cite: a, text: "## first-journey" }, { cite: a, text: "" },
    { cite: a, text: "On 2026-09-02 the owner ruled on it." }, { cite: a, text: "" },
    { cite: a, text: "Source: `coding::journey/first-journey` · origin: x · tags: y" },
    { cite: b, text: "## other-journey" }, { cite: b, text: "Someone else's prose." },
    { cite: b, text: "Source: `coding::journey/other-journey`" },
  ];
  const got = journeyProseFromShardLines(lines, "first-journey", "journey");
  if (got !== "On 2026-09-02 the owner ruled on it.") fails.push(`(s) the shard prose was not read as the record's own lines between heading and Source: ${JSON.stringify(got)}`);
  if (journeyProseFromShardLines(lines, "missing-journey", "journey") !== null) fails.push("(s) a slug no shard line names returned prose");
  if (journeyProseFromShardLines(lines, "first-journey", "lesson") !== null) fails.push("(s) a lesson-kind read returned a journey's prose");
}

// (t) `re-activate` admits a third form, `<leg_id> journey <strand id>`
// (kogaki#1263): src/leg-schema.json's `re-activate` field declares it
// beside the `term` and `claim` forms, naming the Leg's `journeys`.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const reactivate = schema.fields["re-activate"];
  if (!reactivate) fails.push("(t) src/leg-schema.json declares no re-activate field");
  else {
    const desc = reactivate.description;
    if (!/<leg_id> journey <strand id>/.test(desc)) fails.push(`(t) the re-activate description does not admit the journey form: ${desc}`);
    if (!/journeys/.test(desc)) fails.push(`(t) the re-activate description does not ground the journey form in the Leg's journeys: ${desc}`);
    if (!/<leg_id> term/.test(desc) || !/<leg_id> claim/.test(desc)) fails.push(`(t) the re-activate description dropped one of the two prior forms: ${desc}`);
  }
}

// (u) `introduces` entries become items carrying `term`, `kind`
// (`coined` or `established`), `source` (required when established), and
// for a coined term the optional `nearest` and `differs` (kogaki#1263):
// src/leg-schema.json's `introduces_item` section declares the five fields.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const introduces = schema.fields.introduces;
  if (!introduces || !/introduces_item/.test(introduces.type)) fails.push(`(u) src/leg-schema.json's introduces field is not typed as introduces_item entries: ${JSON.stringify(introduces)}`);
  const item = schema.introduces_item;
  if (!item || !item.fields) fails.push("(u) src/leg-schema.json declares no introduces_item section");
  else {
    const f = item.fields;
    if (!f.term || !f.term.required) fails.push("(u) introduces_item does not require term");
    if (!f.kind || !f.kind.required || JSON.stringify(f.kind.enum) !== JSON.stringify(["coined", "established"])) fails.push(`(u) introduces_item's kind is not a required coined/established enum: ${JSON.stringify(f.kind)}`);
    if (!f.source || f.source.required !== false || f.source.required_when !== "kind is established") fails.push(`(u) introduces_item's source is not required_when kind is established: ${JSON.stringify(f.source)}`);
    if (!f.nearest || f.nearest.required !== false) fails.push("(u) introduces_item does not declare an optional nearest");
    if (!f.differs || f.differs.required !== false) fails.push("(u) introduces_item does not declare an optional differs");
  }
}

// (af) the nearest field's description states the at-most-one-per-path limit
// (kogaki#1270): `introducesNearestRefusal` (src/compose.mjs) was added by
// kogaki#1260 with no matching word in src/leg-schema.json's `nearest`
// description, so a reader-path unit composed against the contract alone
// had no way to learn the rule it was refused for. The schema is rendered
// into that unit's prompt verbatim (src/brief-workflow.json's `compose_path`
// row, `schema_file`), so the description read here is the prompt's own text.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const nearest = schema.introduces_item.fields.nearest;
  if (!nearest || !/at most one/i.test(nearest.description) || !/across the whole path/.test(nearest.description)) {
    fails.push(`(af) src/leg-schema.json's nearest description does not state the at-most-one-per-path limit: ${nearest && nearest.description}`);
  }
}

// (v) a Closure row whose terminal state is `conceded_by` carries `open`,
// `why_not_here` and `reader_keeps`, in both schemas (kogaki#1263):
// src/candidate-schema.json's `obligations` field declares the three as
// required only when conceded, and src/leg-schema.json's
// closure_one_conceded_row rule states the same three by name.
{
  const candidateSchema = JSON.parse(readFileSync("src/candidate-schema.json", "utf8"));
  const obligations = candidateSchema.fields.obligations;
  if (!obligations) fails.push("(v) src/candidate-schema.json declares no obligations field");
  else {
    const required = obligations.entry_required_when_conceded;
    if (JSON.stringify(required) !== JSON.stringify(["open", "why_not_here", "reader_keeps"])) fails.push(`(v) obligations does not require open/why_not_here/reader_keeps when conceded: ${JSON.stringify(required)}`);
    if (!/\bopen\b/.test(obligations.description) || !/why_not_here/.test(obligations.description) || !/reader_keeps/.test(obligations.description)) fails.push(`(v) the obligations description does not name all three conceded-row fields: ${obligations.description}`);
  }
  const legSchema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const concededRule = legSchema.path_rules.closure_one_conceded_row;
  if (!concededRule || !/why_not_here/.test(concededRule.rule) || !/reader_keeps/.test(concededRule.rule) || !/`open`/.test(concededRule.rule)) fails.push(`(v) closure_one_conceded_row does not name the three conceded-row fields: ${concededRule && concededRule.rule}`);
}

// (w) the `reader_state_after` of the Leg marked `reaches_target` gains a
// `names` list (kogaki#1263): src/leg-schema.json declares `names` as an
// array of string, required only when reaches_target is true.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const names = schema.fields.names;
  if (!names) fails.push("(w) src/leg-schema.json declares no names field");
  else {
    if (names.required !== false || names.required_when !== "reaches_target is true") fails.push(`(w) names is not required_when reaches_target is true: ${JSON.stringify(names)}`);
    if (names.type !== "array of string") fails.push(`(w) names is not typed as an array of string: ${JSON.stringify(names.type)}`);
  }
}

// THE FOUR kogaki#1260 FIXTURES share one minimal path: s1 opens the Section and
// introduces two terms, s2 reaches the Reader target, s3 closes. Each fixture
// varies one field and asserts on the ground named, never on a bare pass.
const PATH_1260 = (s1extra = {}, s2extra = {}) => {
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1", "L2"], purpose: `purpose of ${leg_id}`,
    reader_state_before: `orientation: before ${leg_id}\nknowledge: before ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }],
    ...extra,
  });
  const legs = [legOf("s1", { opens_section: "A Section", introduces: ["unfed guard — a guard whose input nobody feeds", "pipeline"], ...s1extra }),
    legOf("s2", { depends_on: ["s1"], reaches_target: true, ...s2extra }),
    legOf("s3", { depends_on: ["s2"] })];
  legs[2].reader_state_after = legs[1].reader_state_after;
  return legs;
};

// (x) re-activate's third form, `<leg_id> journey <strand id>` (kogaki#1263, kogaki#1260).
{
  const withJourney = { journeys: [{ strand: "L2", use: "illustrate" }] };
  const good = validateLegs(PATH_1260(withJourney, { "re-activate": ["s1 journey L2"] }), "");
  if (good.error) fails.push(`(x) \`re-activate: s1 journey L2\` over a Leg that names L2 in its journeys was refused: ${good.error}`);
  const noJourney = validateLegs(PATH_1260(withJourney, { "re-activate": ["s1 journey L9"] }), "");
  if (!noJourney.error || !/carries no journey for strand "L9"/.test(noJourney.error) || !/"s1 journey L9"/.test(noJourney.error)) fails.push(`(x) a re-activate naming a Strand the Leg carries no journey for was not refused naming the entry: ${noJourney.error}`);
  const noneAtAll = validateLegs(PATH_1260({}, { "re-activate": ["s1 journey L2"] }), "");
  if (!noneAtAll.error || !/carries no journey for strand "L2"/.test(noneAtAll.error)) fails.push(`(x) a re-activate naming a journey on a Leg with no journeys was not refused: ${noneAtAll.error}`);
}

// (y) at most one introduces_item names `nearest` across the whole path (kogaki#1251 item 2, kogaki#1260).
{
  const { introducesNearestRefusal } = compose;
  if (typeof introducesNearestRefusal !== "function") fails.push("(y) src/compose.mjs exports no introducesNearestRefusal");
  const coined = (term, nearest) => ({ term, kind: "coined", nearest, differs: `how ${term} differs from ${nearest}` });
  const two = validateLegs(PATH_1260({ introduces: [coined("unfed guard", "dead code"), "pipeline"] }, { introduces: [coined("silent pass", "false negative")] }), "");
  if (!two.error) fails.push("(y) a Brief carrying two nearest entries was not refused");
  else {
    if (!/2 introduces items naming `nearest`/.test(two.error)) fails.push(`(y) the refusal did not name the rule: ${two.error}`);
    if (!/"unfed guard"/.test(two.error) || !/"silent pass"/.test(two.error)) fails.push(`(y) the refusal did not name both terms: ${two.error}`);
    if (!/"dead code"/.test(two.error) || !/"false negative"/.test(two.error)) fails.push(`(y) the refusal did not name both nearest values: ${two.error}`);
  }
  const one = validateLegs(PATH_1260({ introduces: [coined("unfed guard", "dead code"), "pipeline"] }), "");
  if (one.error && /naming `nearest`/.test(one.error)) fails.push(`(y) a Brief carrying exactly one nearest entry was refused on the nearest ground: ${one.error}`);
  // an introduces_item's own shape: kind is closed, established needs source, differs needs nearest.
  const badKind = validateLegs(PATH_1260({ introduces: [{ term: "unfed guard", kind: "borrowed" }] }), "");
  if (!badKind.error || !/kind is closed to coined, established/.test(badKind.error)) fails.push(`(y) an introduces_item with an unknown kind was not refused: ${badKind.error}`);
  const noSource = validateLegs(PATH_1260({ introduces: [{ term: "pipeline", kind: "established" }] }), "");
  if (!noSource.error || !/"established" with no source/.test(noSource.error)) fails.push(`(y) an established introduces_item with no source was not refused: ${noSource.error}`);
  const differsAlone = validateLegs(PATH_1260({ introduces: [{ term: "unfed guard", kind: "coined", differs: "from nothing" }] }), "");
  if (!differsAlone.error || !/differs with no nearest/.test(differsAlone.error)) fails.push(`(y) an introduces_item carrying differs with no nearest was not refused: ${differsAlone.error}`);
}

// (z) a conceded Closure row carries open, why_not_here and reader_keeps (kogaki#1251 item 3, kogaki#1260).
{
  const { closureLedgerRefusal } = compose;
  const legs = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id }));
  const full = { text: "a question set aside", introduced_by: "leg2", conceded_by: "leg2", open: "what stays unresolved", why_not_here: "not this Leg's to close", reader_keeps: "a named open question" };
  const rFull = closureLedgerRefusal(legs, [full]);
  if (rFull) fails.push(`(z) a conceded row carrying all three fields was refused: ${rFull}`);
  const { reader_keeps, ...noKeeps } = full;
  const rKeeps = closureLedgerRefusal(legs, [noKeeps]);
  if (!rKeeps) fails.push("(z) a conceded row missing reader_keeps was not refused");
  else {
    if (!/"a question set aside"/.test(rKeeps)) fails.push(`(z) the refusal did not name the row: ${rKeeps}`);
    if (!/carries no reader_keeps/.test(rKeeps)) fails.push(`(z) the refusal did not name the missing field: ${rKeeps}`);
    if (/carries no open/.test(rKeeps)) fails.push(`(z) the refusal named a field the row carries: ${rKeeps}`);
  }
  const rEmpty = closureLedgerRefusal(legs, [{ ...full, open: "" }]);
  if (!rEmpty || !/carries no open/.test(rEmpty)) fails.push(`(z) a conceded row with an empty open was not refused naming open: ${rEmpty}`);
  const rDischarged = closureLedgerRefusal(legs, [{ text: "a question closed", introduced_by: "leg1", discharged_by: "leg2" }]);
  if (rDischarged) fails.push(`(z) a discharged row without the conceded-only fields was refused: ${rDischarged}`);
  // ...and validateLegs refuses at the same ground over a full path.
  const rPath = validateLegs(PATH_1260(), "", [noKeeps]);
  if (!rPath.error || !/carries no reader_keeps/.test(rPath.error)) fails.push(`(z) validateLegs did not refuse a full path over a conceded row missing reader_keeps: ${rPath.error}`);
}

// (aa) the reaching Leg's `names` is a subset of the union of every Leg's introduces (kogaki#1251 item 4, kogaki#1260).
{
  const { readerTargetNamesRefusal } = compose;
  if (typeof readerTargetNamesRefusal !== "function") fails.push("(aa) src/compose.mjs exports no readerTargetNamesRefusal");
  const stray = validateLegs(PATH_1260({}, { names: ["unfed guard", "default-deny"] }), "");
  if (!stray.error) fails.push("(aa) a reaching Leg naming a term no Leg introduces was not refused");
  else {
    if (!/"default-deny"/.test(stray.error)) fails.push(`(aa) the refusal did not name the term: ${stray.error}`);
    if (!/leg 2 \(s2\)/.test(stray.error)) fails.push(`(aa) the refusal did not name the reaching Leg: ${stray.error}`);
    if (!/no Leg of this path introduces it/.test(stray.error)) fails.push(`(aa) the refusal did not name the rule: ${stray.error}`);
  }
  // the union reaches across Legs: a term introduced by the reaching Leg itself, and one by an earlier Leg.
  const subset = validateLegs(PATH_1260({}, { introduces: [{ term: "silent pass", kind: "coined" }], names: ["unfed guard", "pipeline", "silent pass"] }), "");
  if (subset.error && /no Leg of this path introduces it/.test(subset.error)) fails.push(`(aa) a names list inside the union of every Leg's introduces was refused on the names ground: ${subset.error}`);
  const absent = validateLegs(PATH_1260(), "");
  if (absent.error && /no Leg of this path introduces it/.test(absent.error)) fails.push(`(aa) a reaching Leg with no names list was refused on the names ground: ${absent.error}`);
}

// (ab)-(ae): the Packet side of kogaki#1251 (kogaki#1261).
{
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { concededRowFields, parseIntroducesEntry } = compose;
  const dir = mkdtempSync(join(tmpdir(), "kogaki-1261-"));
  const personaA = join(dir, "persona-a.md");
  const personaB = join(dir, "persona-b.md");
  const personaNone = join(dir, "persona-none.md");
  const personaHead = "id: fixture\nreader: >-\n  A fixture reader.\nprior_knowledge: >-\n  Holds nothing.\n";
  writeFileSync(personaA, personaHead + "prose: |\n  **Style A.** Persona A's rule, verbatim.\n");
  writeFileSync(personaB, personaHead + "prose: |\n  **Style B.** Persona B's rule, verbatim.\n");
  writeFileSync(personaNone, personaHead);
  const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
  const moveText = ["id: open_the_claim", "technique: >-", "  what the move does.", "question: >-",
    "  holds: none", "breaks: >-", "  what a correct performance must not do.", ""].join("\n");
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_before: `orientation: before ${leg_id}\nknowledge: before ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }],
    ...extra,
  });
  const briefOf = (legs, header = [], closure = []) => parseBrief([
    "# The fixture", "", ...header, "", "survey pin: `product-lab@0000000000000000000000000000000000000000`", "",
    "## Strands", "", "### L1 — first-strand", "",
    "- cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=lesson @0000000000000000000000000000000000000000`",
    "- journey cite: `gloss/ELEMENTS.jsonl slug=first-strand kind=journey @0000000000000000000000000000000000000000`", "",
    "## Thesis", "", "The fixture claim.", "",
    "## Sequence", "", legs.map(renderLeg).join("\n\n"), "",
    ...(closure.length ? ["## Closure", "", "### Thesis", "", "*(awaiting adoption)*", "", "### Legs", "", ...closure, ""] : []),
  ].join("\n"), "ab.md");
  const render = (brief, leg) => renderPacket({ template: split.packet, brief, leg, moveText, priorSections: [],
    ledgerRow: undefined, section: sectionOfLeg(brief.legs).get(leg.leg_id), sections: sectionsOf(brief.legs) });
  const writeBlock = (packet) => packet.slice(packet.indexOf("\n## Write\n"));
  const block = (packet, from, to) => {
    const a = packet.indexOf(from);
    const b = packet.indexOf(to, a + from.length);
    return a === -1 ? "" : packet.slice(a, b === -1 ? packet.length : b);
  };

  // (ab) two Personas, two Write blocks; one Brief, one Write block but for the budget and the re-activate line.
  {
    const legs = [legOf("s1", { budget: 120, introduces: ["pipeline"] }),
      legOf("s2", { budget: 300, depends_on: ["s1"], "re-activate": ["s1 term pipeline"] })];
    const packetsOf = (persona) => {
      const brief = briefOf(legs, [`compose_path: ${persona}`]);
      if (brief.refusals.length) { fails.push(`(ab) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)}`); return {}; }
      const out = {};
      for (const leg of brief.legs) {
        const r = render(brief, leg);
        if (r.error) fails.push(`(ab) the Packet for ${leg.leg_id} under ${persona} did not render: ${r.error}`);
        else out[leg.leg_id] = r.packet;
      }
      return out;
    };
    const a = packetsOf(personaA);
    const b = packetsOf(personaB);
    if (a.s1 && b.s1) {
      if (!writeBlock(a.s1).includes("Persona A's rule, verbatim.") || writeBlock(a.s1).includes("Persona B's rule")) fails.push("(ab) the Write block under Persona A does not carry Persona A's prose block alone");
      if (!writeBlock(b.s1).includes("Persona B's rule, verbatim.") || writeBlock(b.s1).includes("Persona A's rule")) fails.push("(ab) the Write block under Persona B does not carry Persona B's prose block alone");
      if (writeBlock(a.s1) === writeBlock(b.s1)) fails.push("(ab) the Write block did not differ between two Personas");
    }
    if (a.s1 && a.s2) {
      const norm = (w) => w.replace(/^\*\*Budget\.\*\* .*$/m, "**Budget.** <budget>").split(`\n\n${REACTIVATE_LINE}`).join("");
      if (norm(writeBlock(a.s1)) !== norm(writeBlock(a.s2))) fails.push("(ab) the Write block differs across the Legs of one Brief beyond the budget and the re-activate line");
      if (writeBlock(a.s1).includes(REACTIVATE_LINE)) fails.push("(ab) a Leg re-activating nothing carries the re-activate line");
      if (!writeBlock(a.s2).includes(REACTIVATE_LINE)) fails.push("(ab) a Leg with re-activate entries does not carry the re-activate line");
      if (writeBlock(a.s1) === writeBlock(a.s2)) fails.push("(ab) the budget and re-activate line did not reach the Write block");
    }
    const none = briefOf(legs, [`compose_path: ${personaNone}`]);
    const r = render(none, none.legs[0]);
    if (!r.error || !/prose/.test(r.error)) fails.push(`(ab) a Persona with no prose block did not refuse the Packet naming it: ${r.error || "rendered"}`);
    // With no compose_path the workflow table's Persona is read, and its prose block renders.
    const dflt = briefOf(legs);
    const rd = render(dflt, dflt.legs[0]);
    if (rd.error) fails.push(`(ab) with no compose_path the Packet did not render from the workflow's Persona: ${rd.error}`);
    else if (!rd.packet.includes("**Supporting sentences.**")) fails.push("(ab) with no compose_path the Packet does not carry readers/dev-to-zenn.md's prose block");
  }

  // (ac) a Journey an earlier Leg used and this Leg does not re-activate is held; a re-activated one renders its scene.
  {
    const legs = [legOf("s1", { journeys: [{ strand: "L1", use: "illustrate" }] }),
      legOf("s2", { depends_on: ["s1"] }),
      legOf("s3", { depends_on: ["s1"], "re-activate": ["s1 journey L1"] })];
    const brief = briefOf(legs, [`compose_path: ${personaA}`]);
    if (brief.refusals.length) fails.push(`(ac) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)}`);
    else {
      const HELD = "### Held by the reader, not material here";
      const ACTIVE = "### Active here";
      const s2 = render(brief, brief.legs[1]);
      if (s2.error) fails.push(`(ac) the Packet for s2 did not render: ${s2.error}`);
      else if (!block(s2.packet, HELD, "### Introduce here").includes("- L1's Journey (used at s1)")) fails.push("(ac) a Leg that does not re-activate an earlier Leg's Journey does not list it under Held by the reader");
      const scene = "The fixture scene, as served.";
      const s3leg = { ...brief.legs[2], reactivatedJourneys: [{ leg_id: "s1", strand: "L1", use: "illustrate", resolvedText: scene }] };
      const s3 = render(brief, s3leg);
      if (s3.error) fails.push(`(ac) the Packet for s3 did not render: ${s3.error}`);
      else {
        const active = block(s3.packet, ACTIVE, HELD);
        if (!active.includes(scene) || !active.includes("L1's Journey") || !active.includes("re-activated from s1")) fails.push(`(ac) a re-activated Journey's scene is not rendered under Active here: ${JSON.stringify(active)}`);
        if (block(s3.packet, HELD, "### Introduce here").includes("L1's Journey")) fails.push("(ac) a re-activated Journey is still listed under Held by the reader");
      }
      const s3bare = render(brief, brief.legs[2]);
      if (!s3bare.error || !/re-activated Journey L1/.test(s3bare.error)) fails.push(`(ac) an unresolved re-activated Journey did not refuse the Packet by name: ${s3bare.error || "rendered"}`);
    }
  }

  // (ad) a typed introduces_item round-trips through the Brief and renders its kind and authority line.
  {
    const coined = { term: "unfed guard", kind: "coined", nearest: "guard clause", differs: "nothing ever feeds it a failing input" };
    const established = { term: "default-deny", kind: "established", source: "firewall configuration practice" };
    const legs = [legOf("s1", { introduces: [coined, established] })];
    const line = renderLeg(legs[0]).split("\n").find((l) => l.startsWith("introduces: ") && l.includes("unfed guard"));
    const back = line ? parseIntroducesEntry(line.replace(/^introduces: /, "")) : { error: "no line" };
    if (back.error || back.kind !== "coined" || back.nearest !== "guard clause" || back.differs !== coined.differs) fails.push(`(ad) a typed introduces_item did not round-trip through renderLeg and parseIntroducesEntry: ${JSON.stringify(back)}`);
    const INTRO = "### Introduce here";
    for (const [header, on] of [[[`compose_path: ${personaA}`], true], [[`compose_path: ${personaA}`, "external_authority: off"], false]]) {
      const brief = briefOf(legs, header);
      if (brief.refusals.length) { fails.push(`(ad) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)}`); continue; }
      const r = render(brief, brief.legs[0]);
      if (r.error) { fails.push(`(ad) the Packet did not render (external_authority ${on ? "on" : "off"}): ${r.error}`); continue; }
      const intro = block(r.packet, INTRO, "\n## ");
      if (!/- unfed guard — coined/.test(intro)) fails.push(`(ad) Introduce here does not render the coined term's kind: ${JSON.stringify(intro)}`);
      if (!/- default-deny — established: .*firewall configuration practice/.test(intro)) fails.push(`(ad) Introduce here does not render the established term's kind and source: ${JSON.stringify(intro)}`);
      if (on && !(intro.includes("nearest existing term: guard clause") && intro.includes(`differs: ${coined.differs}`))) fails.push(`(ad) with the external authority on, Introduce here does not carry the nearest and differs line: ${JSON.stringify(intro)}`);
      if (!on && /nearest|differs/.test(r.packet)) fails.push("(ad) with external_authority: off the Packet still carries a nearest or differs line");
    }
  }

  // (ae) a conceded Closure row renders its three fields in the conceding Leg's Packet.
  {
    const legs = [legOf("s1"), legOf("s2", { depends_on: ["s1"] })];
    const closure = [
      "- Whether the guard can be fed at all — introduced_by: s1; conceded_by: s2",
      "  - open: whether any input reaches the guard",
      "  - why_not_here: the article's evidence is one week of runs",
      "  - reader_keeps: a way to check their own guard",
    ];
    const brief = briefOf(legs, [`compose_path: ${personaA}`], closure);
    const f = concededRowFields(brief.text, "s2");
    if (!f || f.open !== "whether any input reaches the guard" || f.why_not_here !== "the article's evidence is one week of runs" || f.reader_keeps !== "a way to check their own guard") fails.push(`(ae) concededRowFields did not read the row's three fields back: ${JSON.stringify(f)}`);
    if (concededRowFields(brief.text, "s1") !== null) fails.push("(ae) concededRowFields read a conceded row off a Leg that does not concede it");
    const s2 = render(brief, brief.legs[1]);
    if (s2.error) fails.push(`(ae) the Packet for s2 did not render: ${s2.error}`);
    else {
      const rows = block(s2.packet, "## This Leg's Closure", "\n## The article so far");
      for (const want of ["whether any input reaches the guard", "the article's evidence is one week of runs", "a way to check their own guard"]) {
        if (!rows.includes(want)) fails.push(`(ae) the conceding Leg's Packet does not render ${JSON.stringify(want)}: ${JSON.stringify(rows)}`);
      }
    }
    const s1 = render(brief, brief.legs[0]);
    if (!s1.error && s1.packet.includes("a way to check their own guard")) fails.push("(ae) the introducing Leg's Packet renders the conceded row's fields");
    // fillBrief's own format: the three fields are written under a conceded row.
    const src = readFileSync("src/compose.mjs", "utf8");
    if (!/oblL\.push\(`  - \$\{k\}: /.test(src)) fails.push("(ae) fillBrief does not write a conceded row's fields under the row");
  }
}

// (bb) the mint records compose_path -- the Persona's path -- and refuses without one (kogaki#1262).
{
  const strands = [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }];
  const doc = composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "readers/dev-to-zenn.md" });
  if (!/\*compose_path:\* `readers\/dev-to-zenn\.md`/.test(doc)) {
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
}

// (cc) external_authority defaults to on at mint and is off when minted so (kogaki#1251 item 3, kogaki#1262).
{
  const strands = [{ display_id: "L1", slug: "a-strand", cite: "coding::lesson/a-strand@abc123" }];
  const defaulted = composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "readers/dev-to-zenn.md" });
  if (!/\*external_authority:\* on/.test(defaulted)) {
    fails.push(`(cc) a Brief minted with no external_authority given did not default to on: ${JSON.stringify(defaulted.slice(0, 260))}`);
  }
  const off = composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "readers/dev-to-zenn.md", externalAuthority: "off" });
  if (!/\*external_authority:\* off/.test(off)) {
    fails.push(`(cc) a Brief minted with externalAuthority "off" did not carry off: ${JSON.stringify(off.slice(0, 260))}`);
  }
  let badThrew = null;
  try { composeBrief({ slug: "t", strands, thesis: "a claim", composePath: "readers/dev-to-zenn.md", externalAuthority: "maybe" }); }
  catch (e) { badThrew = e; }
  if (!badThrew) fails.push('(cc) composeBrief with externalAuthority "maybe" was not refused');
  else if (!/external_authority/.test(badThrew.message)) fails.push(`(cc) the refusal did not name external_authority: ${badThrew.message}`);
}

if (fails.length > 0) {
  console.log("FAIL check-brief-compose");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-compose — re-activate (kogaki#1237): the three composition refusals name the entry, Active here carries the re-activated term verbatim, Held by the reader carries every other ledger term, a Leg re-activating nothing renders a stated absence, and depends_on reaches no Packet; the introduced-term refusal (named term and Leg; not fired without the term or without a Reader start; whole-word and case-insensitive; the anchor is not the term), openingQuestionOf's absence, the carriers deriving nothing from why the reader opened the post, the Thesis Closure row reaching only the Reader target Leg, the reaches_target marking rule (zero/two/first-Leg refused), a closing Leg introducing nothing and raising nothing, a closing Leg's orientation/knowledge held at the target Leg's (question/expectation/trust free), the Reader target derivation reading the marked Leg regardless of position, and the mark reaching the Packet (written by renderLeg, read back by parseLegBlockBody, rendered on the marked Leg and each closing Leg and on no Leg before); a Journey's resolved text renders under the Journey block with its served address kept beside it as citation, and an unresolved Journey entry refuses by name rather than rendering a hole (kogaki#1250); journeyTextFromSurvey/journeyResolutionRefusal name the Leg and the address for an unparseable cite and for one the served survey holds no record for, resolve a cite the survey does hold (both admitted cite forms), and compose no refusal when one resolves; writerRefusal reads the declared `refusal: <reason>` form off the first line alone, never ordinary prose, a trailing line, a refusal arriving after other text, an empty reason, or a non-string response; journeyProseFromShardLines reads a Journey's prose from its own Gloss shard lines only; and kogaki#1263's four schema widenings — re-activate's third `journey` form, `introduces` typed as `introduces_item` (term/kind/source/nearest/differs), a conceded Closure row's `open`/`why_not_here`/`reader_keeps` declared in both schemas, and the `names` list required on the Leg marked reaches_target — are all declared in src/leg-schema.json and src/candidate-schema.json; and kogaki#1260's four compose refusals over those fields — re-activate's `journey` form resolving against the depended-on Leg's journeys, a second `nearest` across the path refused naming both, a conceded Closure row refused naming the row and its missing open/why_not_here/reader_keeps, and a reaching Leg's `names` entry no Leg introduces refused naming the term; and kogaki#1261's Packet rendering — the Persona's prose block in the Write block (two Personas, two blocks; one Brief, one block but for the budget and the re-activate line), a Journey held when not re-activated and its scene active when it is, a typed term's kind and authority line with external_authority switching the authority off, and a conceded row's three fields; and kogaki#1262's two mint-side fields — `composeBrief` records `compose_path` naming the Persona file it was composed with and refuses a blank or non-string one by name, and `external_authority` renders `on` by default and `off` when minted so, refusing any third value by name; and kogaki#1270's contract fix -- src/leg-schema.json's `introduces_item.nearest` description now states the at-most-one-per-path limit that introducesNearestRefusal enforces, unchanged.");
JS
