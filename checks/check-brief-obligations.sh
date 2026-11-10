#!/usr/bin/env bash
# check-brief-obligations — the retired Obligations ledger and reader states, and
# the Reader target Leg rules (kogaki#1229, #1231, #1699). A LIGHT member: pure calls.
#   (a) a Brief carrying `obligations`, `closure`, `discharges`, `reader_start` or
#       `reader_target` is refused naming the key (kogaki#1699); (b) so is a Leg
#       carrying a reader state, by `validateLegs` and the Brief reader.
#   (c) the GROUNDED input carries the structure and each Waypoint's point and
#       carries, and no Move contract (kogaki#1768).
#   (g)/(h) the marked Leg is the last, and no Leg carries `introduces` (kogaki#1768);
#   (k) the mark reaches the Packet; (r) no `kind` on a ParagraphPlan `introduces`
#   entry; (u) `names` retired from the Leg (kogaki#1768). Cases (f), (i), (j),
#   (l)-(q), (s)-(t), (v)-(y) left with the ledger and the reader states (kogaki#1699).
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync } from "node:fs";
import { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg, readerTargetLine,
  REACHES_TARGET_LINE, CLOSING_LEG_LINE } from "./src/draft.mjs";
import * as compose from "./src/compose.mjs";
import { recordOf, briefOfRecord, PATH_1260 } from "./checks/fixtures/brief-compose/fixtures.mjs";
const { validateLegs, readerTargetLegRefusal, legRecord } = compose;
const fails = [];

// (a) a retired record key is refused by name (kogaki#1699).
{
  const rec = recordOf(PATH_1260());
  const clean = briefOfRecord(rec, "a.yaml");
  if (clean.refusals.length) fails.push(`(a) the fixture Brief was refused: ${JSON.stringify(clean.refusals)}`);
  for (const key of ["obligations", "closure", "discharges", "reader_start", "reader_target"]) {
    const b = briefOfRecord({ ...rec, [key]: [] }, "a.yaml");
    if (!b.refusals.some((m) => m.includes("carries `" + key + "`") && m.includes("kogaki#1699"))) {
      fails.push(`(a) a Brief carrying \`${key}\` was not refused naming the key and kogaki#1699: ${JSON.stringify(b.refusals)}`);
    }
  }
}

// (b) a Leg carrying a reader state is refused naming the field (kogaki#1699).
{
  const legs = PATH_1260();
  const ok = validateLegs(legs);
  if (ok.error) fails.push(`(b) validateLegs refused the stateless fixture path: ${ok.error}`);
  for (const field of ["reader_state_after", "reader_state_before"]) {
    const v = validateLegs(legs.map((l, i) => (i === 1 ? { ...l, [field]: "knowledge: the basics" } : l)));
    if (!v.error || !v.error.includes("leg 2 (s2)") || !v.error.includes("carries `" + field + "`") || !v.error.includes("kogaki#1699")) {
      fails.push(`(b) validateLegs did not refuse \`${field}\` naming the Leg, the field and kogaki#1699: ${v.error}`);
    }
    const rec = recordOf(legs);
    rec.reader_path[0][field] = { knowledge: "the basics" };
    const b = briefOfRecord(rec, "b.yaml");
    if (!b.refusals.some((m) => m.includes("leg s1") && m.includes("carries `" + field + "`") && m.includes("kogaki#1699"))) {
      fails.push(`(b) the Brief reader did not refuse a Leg carrying \`${field}\` by name: ${JSON.stringify(b.refusals)}`);
    }
  }
}

// (c) THE MOVE-FIT INPUT AND THE GROUNDED JUDGE ARE RETIRED (kogaki#1768, kogaki#1775): a Leg
// binds no Move and its text is its relation's `holds`, derived with no Call, so the unit module
// exports neither the Move-fit input nor the GROUNDED judge's.
{
  const unit = await import("./src/brief/reader-path-unit.mjs");
  for (const gone of ["readerPathFitInput", "readerPathFitVerdict", "groundedInput", "groundedPrompt", "groundedVerdict", "validateBriefWaypoints"]) {
    if (gone in unit) fails.push(`(c) src/brief/reader-path-unit.mjs still exports the retired \`${gone}\``);
  }
}

// (g) readerTargetLegRefusal — exactly one Leg marked, at any position (kogaki#1768, kogaki#1775).
{
  const base = () => ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id }));

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

  const middle = base();
  middle[1].reaches_target = true;
  const rMiddle = readerTargetLegRefusal(middle);
  if (rMiddle) fails.push(`(g) a path marking one Leg before its last was refused, though the apex's Leg stands at any position (kogaki#1775): ${rMiddle}`);

  const last = base();
  last[2].reaches_target = true;
  const rLast = readerTargetLegRefusal(last);
  if (rLast) fails.push(`(g) exactly one Leg, the last, marked reaches_target was refused: ${rLast}`);
}

// (h) A LEG MAY FOLLOW THE TARGET (kogaki#1775, retiring kogaki#1768's last-Leg rule): the Legs
// run in the structure's post-order, so the apex's Leg is marked wherever it stands, and no Leg
// carries `introduces` at all (retiring kogaki#1231's closing-Leg rule).
{
  const after = readerTargetLegRefusal([{ leg_id: "leg1" }, { leg_id: "leg2", reaches_target: true }, { leg_id: "leg3" }]);
  if (after) fails.push(`(h) a Leg after the marked one was refused, though the marked Leg stands at any position: ${after}`);
  const carrying = validateLegs(PATH_1260({ introduces: ["term"] }));
  if (!carrying.error || !/leg 1 \(s1\): carries `introduces`, which is retired/.test(carrying.error)) fails.push(`(h) a Leg carrying introduces was not refused by name: ${carrying.error}`);
}

// (k) the mark reaches the Packet (kogaki#1231, acceptance item 4): written by legRecord,
// read back by readBrief, and rendered under `## This Leg` on the marked Leg, the last since
// kogaki#1768, and on no Leg before it; the closing-Leg line reaches no Packet of a Brief.
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"], case: "own" }],
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

  const legs = [legOf("s1"), legOf("s2"), legOf("s3", { reaches_target: true })];
  if (readerTargetLine(legs, "s1") !== "" || readerTargetLine(legs, "s2") !== "") fails.push("(k) readerTargetLine rendered a line on a Leg before the mark");
  if (readerTargetLine(legs, "s3") !== REACHES_TARGET_LINE) fails.push("(k) readerTargetLine did not render the target line on the marked Leg");
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
  for (const id of ["s1", "s2"]) {
    if (carries(id, REACHES_TARGET_LINE) || carries(id, CLOSING_LEG_LINE)) fails.push(`(k) the Packet of ${id}, before the mark, carries a Reader target line`);
  }
  if (!carries("s3", REACHES_TARGET_LINE)) fails.push("(k) the Packet of the marked Leg does not carry the target line");
  if (Object.values(packets).some((p) => p.includes(CLOSING_LEG_LINE))) fails.push("(k) a Packet carries the closing-Leg line, though no Leg follows the mark");
  if (packets.s3 && !/## The Section this Leg sits in[\s\S]*This Leg reaches the Reader target\.[\s\S]*## What crosses into this Leg/.test(packets.s3)) fails.push("(k) the target line is not rendered inside the `## The Section this Leg sits in` block");
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

// (u) `names` IS RETIRED FROM THE LEG (kogaki#1768, retiring kogaki#1568's target-Leg `names`):
// a Leg carrying it is refused by name, and the reader-knowledge ledger over a path that
// introduces nothing folds nothing in and takes the Legs alone.
{
  const { readerKnowledgeLedger } = compose;
  const named = validateLegs(PATH_1260({}, { names: ["ownership boundary"] }));
  if (!named.error || !/leg 2 \(s2\): carries `names`, which is retired/.test(named.error)) fails.push(`(u) a Leg carrying names was not refused by name: ${named.error}`);
  const ledger = readerKnowledgeLedger(PATH_1260());
  if (ledger.some((row) => row.reader_already_knows.length)) fails.push(`(u) the ledger folded something in over a path that introduces nothing: ${JSON.stringify(ledger)}`);
  if (readerKnowledgeLedger.length !== 1) fails.push(`(u) readerKnowledgeLedger still declares an obligations parameter (arity ${readerKnowledgeLedger.length})`);
}

if (fails.length > 0) {
  console.error("FAIL check-brief-obligations");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log("ok: check-brief-obligations — a Brief record carrying obligations, closure, discharges, reader_start or reader_target and a Leg carrying reader_state_after or reader_state_before refused naming the key, the retired Move-fit input and GROUNDED judge exported no more, and the Reader target Leg marked at any position (kogaki#1768, kogaki#1775), the reaches_target marking rule with the last Leg marked and no Leg after it, no Leg carrying introduces or names, the mark reaching the Packet, an introduces entry carrying no kind, and the ledger folding nothing in (kogaki#1229, kogaki#1231, kogaki#1568, kogaki#1699, kogaki#1768).");
JS
