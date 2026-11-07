#!/usr/bin/env bash
# check-brief-obligations — the retired Obligations ledger and reader states,
# and the Reader target Leg rules of Brief composition (kogaki#1229, #1231,
# #1699). A LIGHT member: pure validator calls over fixture paths, no model run.
#   (a) a Brief record carrying `obligations`, `closure`, `discharges`,
#       `reader_start` or `reader_target` is refused naming the key (kogaki#1699).
#   (b) a Leg carrying `reader_state_after` or `reader_state_before` is refused
#       naming the field, by `validateLegs` and by the Brief reader (kogaki#1699).
#   (c) the Move-fit input carries each Move's `takes` and `leaves`, and no `before`, `after`, `deferred_slots` or `obligations_raised` (kogaki#1699).
#   (g) the reaches_target marking rule; (h) a closing Leg introduces nothing; (k) the
#   mark reaches the Packet; (r) no `kind` on an `introduces` entry; (u) `names` and the
#   reader-knowledge ledger read `introduces` alone. Cases (f), (i), (j), (l)-(q),
#   (s)-(t), (v)-(y) left with the ledger and the Leg's reader states (kogaki#1699).
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, copyFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

// (c) the Move-fit input carries `takes` and `leaves` and no state or slot (kogaki#1699).
{
  const { readerPathFitInput } = await import("./src/brief/reader-path-unit.mjs");
  const dir = mkdtempSync(join(tmpdir(), "obligations-moves-"));
  try {
    const lib = join(dir, "moves");
    mkdirSync(lib);
    copyFileSync("moves/ROLES.json", join(lib, "ROLES.json"));
    // The Move carries no `obligation`, retired from the Move for its `leaves` (kogaki#1701).
    writeFileSync(join(lib, "open_the_claim.yaml"), [
      "id: open_the_claim", "description: >-", "  Names a consequence, then gives the name its meaning.",
      "breaks:", "  - drop the definition — the name stays a label the reader cannot use",
      "segments:", "  - operation: names the consequence a cause leads to",
      "  - operation: gives the name just used its meaning", "    relation: defines the name the step before introduced",
      "takes:", "  - kind: answer", "    what: why a cause has the consequence it has",
      "leaves:", "  - kind: explain", "    what: the name given to the consequence", "    segment: 2", "",
    ].join("\n"));
    const fit = readerPathFitInput({ candidate_id: "c1", legs: PATH_1260() }, lib, "knowledge: can read code", "a thesis");
    if (fit.error) fails.push(`(c) the Move-fit input did not build: ${fit.error}`);
    else {
      const contracts = fit.input.candidate_you_must_judge
        ? fit.input.candidate_you_must_judge.move_contracts : fit.input.move_contracts;
      const first = (contracts || [])[0] || {};
      if (!Array.isArray(first.takes) || first.takes[0].kind !== "answer" || !Array.isArray(first.leaves) || first.leaves[0].kind !== "explain") {
        fails.push(`(c) the Move-fit input does not carry the Move's takes and leaves: ${JSON.stringify(first)}`);
      }
      const text = JSON.stringify(fit.input);
      for (const gone of ["\"before\"", "\"after\"", "deferred_slots", "obligations_raised"]) {
        if (text.includes(gone)) fails.push(`(c) the Move-fit input still carries ${gone}`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// (g) readerTargetLegRefusal — exactly one Leg marked, and never the first.
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

// (h) a closing Leg introduces nothing (kogaki#1231); the "raises nothing" half left with the
// Obligations ledger (kogaki#1699).
{
  const withIntroduces = [
    { leg_id: "leg1" },
    { leg_id: "leg2", reaches_target: true },
    { leg_id: "leg3", introduces: ["term"] },
  ];
  const rIntroduces = readerTargetLegRefusal(withIntroduces);
  if (!rIntroduces) fails.push("(h) a closing Leg carrying introduces was not refused");
  else {
    if (!/leg 3 \(leg3\)/.test(rIntroduces)) fails.push(`(h) the introduces refusal did not name the Leg: ${rIntroduces}`);
    if (!/closing_leg_introduces_nothing/.test(rIntroduces) && !/introduces nothing/.test(rIntroduces)) fails.push(`(h) the introduces refusal did not name the rule: ${rIntroduces}`);
  }
  const clean = readerTargetLegRefusal([{ leg_id: "leg1" }, { leg_id: "leg2", reaches_target: true }, { leg_id: "leg3" }]);
  if (clean) fails.push(`(h) a closing Leg introducing nothing was refused: ${clean}`);
}

// (k) the mark reaches the Packet (kogaki#1231, acceptance item 4): written by legRecord,
// read back by readBrief, and rendered under `## This Leg` on the marked Leg and
// on each closing Leg, and on no Leg before the mark.
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"], case: "own" }],
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

if (fails.length > 0) {
  console.error("FAIL check-brief-obligations");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
console.log("ok: check-brief-obligations — a Brief record carrying obligations, closure, discharges, reader_start or reader_target and a Leg carrying reader_state_after or reader_state_before refused naming the key, the Move-fit input carrying each Move's takes and leaves and no before, after, deferred_slots or obligations_raised (kogaki#1699), the reaches_target marking rule, a closing Leg introducing nothing, the mark reaching the Packet, an introduces entry carrying no kind, and names and the ledger reading introduces alone (kogaki#1229, kogaki#1231, kogaki#1568, kogaki#1699).");
JS
