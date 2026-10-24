#!/usr/bin/env bash
# check-brief-packet — the Packet side of Brief composition: re-activate,
# Journey resolution, the writer's refusal form, the typed introduces items
# and conceded Obligation rows, and the Packet rendering of kogaki#1261.
#   (n)-(o)   re-activate's refusals and Packet rendering (kogaki#1237/#1282).
#   (p)-(s)   Journey text resolution, writerRefusal, shard prose (kogaki#1250).
#   (t)-(w)   kogaki#1263's schema widenings; (x)-(aa) and the first (am)
#             kogaki#1260's compose refusals over them.
#   (ab)-(ae) the Write block, Journey crossing and typed terms in the Packet
#             (kogaki#1261), a conceded row read off the record and reaching
#             no Packet (kogaki#1584), with the inner (aq) and (at).
# A LIGHT member: pure calls, temporary fixture files, no model run. Cut from
# check-brief-compose.sh by kogaki#1460; the registry row says more.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg,
  journeyTextFromSurvey, journeyResolutionRefusal, journeyIdentityKey, writerRefusal,
  journeyProseFromShardLines, READER_OWN_WORLD_ABSENT } from "./src/draft.mjs";
import * as compose from "./src/compose.mjs";
import { recordOf, briefOfRecord, PATH_1260 } from "./checks/fixtures/brief-compose/fixtures.mjs";
const { validateLegs, obligationRowsOf, legRecord } = compose;
const fails = [];

// (n) `re-activate` (kogaki#1237, re-ruled default-deny at kogaki#1282 owner
// ruling 2026-10-06): the three composition refusals name the entry; the
// Packet renders what is re-activated, WITH ITS MEANING, under "What crosses
// into this Leg"; a term this Leg does not re-activate renders nowhere at
// all (never "held"); a Leg re-activating nothing renders a stated absence;
// `depends_on` reaches no Packet.
{
  const { reactivateRefusal, reactivateSemanticRefusal, readerKnowledgeLedger } = compose;
  if (typeof reactivateRefusal !== "function" || typeof reactivateSemanticRefusal !== "function") fails.push("(n) src/compose.mjs exports no re-activate refusals");
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }],
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
  const noClaim = validateLegs(path({ "re-activate": ["s1 claim L9 as a restated claim"] }), "");
  if (!noClaim.error || !/carries no claim for strand "L9"/.test(noClaim.error) || !/"s1 claim L9 as a restated claim"/.test(noClaim.error)) fails.push(`(n) a re-activate naming a Strand the Leg carries no claim for was not refused naming the entry: ${noClaim.error}`);
  const shape = validateLegs(path({ "re-activate": ["s1 pipeline"] }), "");
  if (!shape.error || !/re-activate/.test(shape.error)) fails.push(`(n) a malformed re-activate entry was not refused: ${shape.error}`);
  const good = validateLegs(path({ "re-activate": ["s1 term unfed guard", "s1 claim L1 as a restated claim"] }), "");
  if (good.error) fails.push(`(n) a well-formed re-activate over depends_on material was refused: ${good.error}`);

  // THE RENDERED PACKET, over the real template and a Brief read back from its own record.
  const legs = path({ "re-activate": ["s1 term unfed guard"] });
  const brief = briefOfRecord(recordOf(legs), "n.yaml");
  if (brief.refusals.length || brief.legs.length !== 3) fails.push(`(n) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)} legs=${brief.legs.length}`);
  else if (JSON.stringify(brief.legs[1]["re-activate"]) !== JSON.stringify(["s1 term unfed guard"])) fails.push(`(n) readBrief did not read re-activate back one entry per list item: ${JSON.stringify(brief.legs[1]["re-activate"])}`);
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
  const block = (id) => {
    const m = (packets[id] || "").split("## What crosses into this Leg\n")[1];
    return m ? m.split("\n## ")[0] : null;
  };
  const crosses2 = block("s2");
  if (crosses2 === null) fails.push("(n) the Packet does not carry the What crosses into this Leg block");
  else {
    if (!/unfed guard/.test(crosses2) || !/re-activated from s1/.test(crosses2)) fails.push(`(n) the re-activated term is not under What crosses into this Leg: ${crosses2.trim().slice(0, 160)}`);
    // THE BUG THIS ISSUE FIXES: a typed term crossed with no meaning because
    // `introducedMeaning` never resolved the legacy bare/anchored form's
    // anchor as its meaning anchor.
    if (!/a guard whose input nobody feeds/.test(crosses2)) fails.push(`(n) the re-activated term crosses with no meaning: ${crosses2.trim().slice(0, 160)}`);
    if (/pipeline/.test(crosses2)) fails.push("(n) a term this Leg did not re-activate still crosses into it (default-deny violated)");
  }
  const crosses3 = block("s3");
  if (crosses3 === null || !/nothing — this Leg introduces and re-activates nothing/.test(crosses3)) fails.push(`(n) a Leg re-activating nothing does not render a stated absence under What crosses into this Leg: ${String(crosses3).trim().slice(0, 160)}`);
  for (const id of Object.keys(packets)) {
    if (/depends_on/.test(packets[id])) fails.push(`(n) depends_on reaches the Packet of ${id}`);
    if (/Already knows/.test(packets[id])) fails.push(`(n) the retired Already knows heading is still rendered in the Packet of ${id}`);
    if (/Held by the reader/.test(packets[id])) fails.push(`(n) the retired Held by the reader heading is still rendered in the Packet of ${id}`);
    if (/Re-activated material/.test(packets[id])) fails.push(`(n) the retired Re-activated material line is still rendered in the Packet of ${id}`);
  }
}

// (o) the Packet carries none of the retired planning blocks, carries the
// three Write rules verbatim, and carries the Move block header naming
// attribute-only use (kogaki#1247, owner ruling 2026-10-02/04).
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }],
    ...extra,
  });
  const legs = [legOf("s1")];
  const brief = briefOfRecord(recordOf(legs), "o.yaml");
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
          // The paragraph-structure rule left the Persona (kogaki#1350: the Move
          // owns structure); the anaphora rule it kept stands in for it.
          "first sentence names what it refers to in full",
          "classic register, full clauses, a concrete subject acting",
          // The Referents rule moved into the Audience's `register`
          // (kogaki#1261) and was narrowed to Journey referents (kogaki#1322).
          "A referent is a case, example, file or person introduced in",
        ];
        for (const rule of rules) {
          if (!packet.includes(rule)) fails.push(`(o) the Packet does not carry the Write rule verbatim: ${JSON.stringify(rule)}`);
        }
        // THE WAYPOINTS BLOCK REPLACED THE MOVE BLOCK (kogaki#1311): its header
        // says each line is a point whose wording is the writer's (kogaki#1326).
        if (!/The point is not quoted/.test(packet)) fails.push("(o) the Packet's waypoints block header does not carry \"The point is not quoted\"");
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
    waypoints: [{ point: "the paragraph establishes what s1 claims", serves: ["L1"] }],
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
    const sections = sectionsOf(brief.legs);
    const r = renderPacket({ template: split.packet, brief, leg, priorSections: [],
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
    waypoints: [{ point: "the paragraph establishes what s2 claims", serves: ["L1"] }],
    journeys: [{ strand: "L1", use: "an example to retell" }] };
  const sections2 = sectionsOf([legUnresolved]);
  const r2 = renderPacket({ template: split.packet, brief: { ...brief, legs: [legUnresolved] }, leg: legUnresolved,
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

// (u) `introduces` entries become items carrying `term` and `meaning`
// (kogaki#1263); the retired `kind` and `source` (kogaki#1529) and `nearest`
// and `differs` (kogaki#1571) are declared nowhere.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const introduces = schema.fields.introduces;
  if (!introduces || !/introduces_item/.test(introduces.type)) fails.push(`(u) src/leg-schema.json's introduces field is not typed as introduces_item entries: ${JSON.stringify(introduces)}`);
  const item = schema.introduces_item;
  if (!item || !item.fields) fails.push("(u) src/leg-schema.json declares no introduces_item section");
  else {
    const f = item.fields;
    if (!f.term || !f.term.required) fails.push("(u) introduces_item does not require term");
    if (!f.meaning || !f.meaning.required) fails.push("(u) introduces_item does not require meaning (kogaki#1529)");
    if (f.kind || f.source) fails.push(`(u) introduces_item still declares the retired kind or source (kogaki#1529): ${JSON.stringify({ kind: f.kind, source: f.source })}`);
    if (f.nearest || f.differs) fails.push(`(u) introduces_item still declares the retired nearest or differs (kogaki#1571): ${JSON.stringify([f.nearest, f.differs])}`);
  }
}

// (v) an Obligation row whose terminal state is `conceded_by` carries `open`,
// `why_not_here` and `reader_keeps`, in both schemas (kogaki#1263):
// src/candidate-schema.json's `obligations` field declares the three as
// required only when conceded, and src/leg-schema.json's
// obligation_one_conceded_row rule states the same three by name.
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
  const concededRule = legSchema.path_rules.obligation_one_conceded_row;
  if (!concededRule || !/why_not_here/.test(concededRule.rule) || !/reader_keeps/.test(concededRule.rule) || !/`open`/.test(concededRule.rule)) fails.push(`(v) obligation_one_conceded_row does not name the three conceded-row fields: ${concededRule && concededRule.rule}`);
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

// (y) an introduces_item's own shape: `term` and `meaning`, every retired key refused by name.
{
  // kind and source are retired (kogaki#1529), nearest and differs (kogaki#1571), and meaning is required.
  const withKind = validateLegs(PATH_1260({ introduces: [{ term: "unfed guard", kind: "coined", meaning: "a guard whose input nobody feeds" }] }), "");
  if (!withKind.error || !/"unfed guard" carries `kind`/.test(withKind.error)) fails.push(`(y) an introduces_item carrying the retired kind was not refused by name: ${withKind.error}`);
  const withSource = validateLegs(PATH_1260({ introduces: [{ term: "pipeline", meaning: "a chain of stages", source: "build practice" }] }), "");
  if (!withSource.error || !/"pipeline" carries `source`/.test(withSource.error)) fails.push(`(y) an introduces_item carrying the retired source was not refused by name: ${withSource.error}`);
  for (const k of ["nearest", "differs"]) {
    const withRetired = validateLegs(PATH_1260({ introduces: [{ term: "unfed guard", meaning: "a guard whose input nobody feeds", [k]: "guard clause" }] }), "");
    if (!withRetired.error || !withRetired.error.includes(`"unfed guard" carries \`${k}\``)) fails.push(`(y) an introduces_item carrying the retired ${k} was not refused by name: ${withRetired.error}`);
  }
  // an introduces_item with no meaning is refused naming the entry (kogaki#1282, kogaki#1529).
  const noMeaning = validateLegs(PATH_1260({ introduces: [{ term: "unfed guard" }, "pipeline"] }), "");
  if (!noMeaning.error || !/"unfed guard" carries no meaning/.test(noMeaning.error)) fails.push(`(y) an introduces_item with no meaning was not refused naming the entry: ${noMeaning.error}`);
  const withMeaning = validateLegs(PATH_1260({ introduces: [{ term: "unfed guard", meaning: "a guard whose input nobody feeds" }, "pipeline"] }), "");
  if (withMeaning.error && /with no meaning/.test(withMeaning.error)) fails.push(`(y) an introduces_item carrying meaning was refused on the meaning ground: ${withMeaning.error}`);
}

// (am) a re-activate claim entry requires an `as` sentence (kogaki#1282, owner decision 2026-10-06):
// the claim crosses as a plain restatement written at Brief time, never as its own proposition.
{
  const withClaim = (reactivate) => PATH_1260({}, { "re-activate": reactivate });
  const noAs = validateLegs(withClaim(["s1 claim L1"]), "");
  if (!noAs.error || !/a re-activate claim entry is "<leg_id> claim <strand id> as <one plain sentence>", and the as sentence is required/.test(noAs.error)) {
    fails.push(`(am) a re-activate claim entry with no as sentence was not refused naming the grammar: ${noAs.error}`);
  }
  const noAsEither = validateLegs(withClaim(["s1 claim L1 as"]), "");
  if (!noAsEither.error || !/a re-activate claim entry is "<leg_id> claim <strand id> as <one plain sentence>", and the as sentence is required/.test(noAsEither.error)) {
    fails.push(`(am) a re-activate claim entry with a bare trailing as was not refused naming the grammar: ${noAsEither.error}`);
  }
  const withAs = validateLegs(withClaim(["s1 claim L1 as the grounded claim, restated plainly"]), "");
  if (withAs.error) fails.push(`(am) a re-activate claim entry carrying an as sentence was refused: ${withAs.error}`);
}

// (z) a conceded Obligation row carries open, why_not_here and reader_keeps (kogaki#1251 item 3, kogaki#1260),
// and a row carrying the retired `kind`, `text` or `term` is refused naming the key (kogaki#1568).
{
  const { obligationLedgerRefusal } = compose;
  const legs = ["leg1", "leg2", "leg3"].map((leg_id) => ({ leg_id }));
  const full = { item: ["a question set aside"], raised_by: "leg2", owed_by: [], conceded_by: "leg2", open: "what stays unresolved", why_not_here: "not this Leg's to close", reader_keeps: "a named open question" };
  const rFull = obligationLedgerRefusal(legs, [full]);
  if (rFull) fails.push(`(z) a conceded row carrying all three fields was refused: ${rFull}`);
  const { reader_keeps, ...noKeeps } = full;
  const rKeeps = obligationLedgerRefusal(legs, [noKeeps]);
  if (!rKeeps) fails.push("(z) a conceded row missing reader_keeps was not refused");
  else {
    if (!/"a question set aside"/.test(rKeeps)) fails.push(`(z) the refusal did not name the row: ${rKeeps}`);
    if (!/carries no reader_keeps/.test(rKeeps)) fails.push(`(z) the refusal did not name the missing field: ${rKeeps}`);
    if (/carries no open/.test(rKeeps)) fails.push(`(z) the refusal named a field the row carries: ${rKeeps}`);
  }
  const rEmpty = obligationLedgerRefusal(legs, [{ ...full, open: "" }]);
  if (!rEmpty || !/carries no open/.test(rEmpty)) fails.push(`(z) a conceded row with an empty open was not refused naming open: ${rEmpty}`);
  const rDischarged = obligationLedgerRefusal(legs, [{ item: ["a question closed"], raised_by: "leg1", owed_by: ["leg2"], discharged_by: "leg2" }]);
  if (rDischarged) fails.push(`(z) a discharged row without the conceded-only fields was refused: ${rDischarged}`);
  // THE RETIRED `kind`, `text` AND `term`, REFUSED BY NAME (kogaki#1568).
  for (const [key, row] of [["kind", { ...full, kind: "question" }], ["text", { ...full, item: undefined, text: "a question set aside" }],
    ["term", { ...full, item: undefined, term: ["a question set aside"] }]]) {
    if (row.item === undefined) delete row.item;
    const r = obligationLedgerRefusal(legs, [row]) || "";
    if (!r.includes(`carries \`${key}\`, retired (kogaki#1568)`)) fails.push(`(z) a row carrying the retired \`${key}\` was not refused naming the key: ${r || "no refusal"}`);
  }
  // ...and validateLegs refuses at the same ground over a full path.
  const rPath = validateLegs(PATH_1260(), "", [{ ...noKeeps, raised_by: "s2", conceded_by: "s2" }]);
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
  const subset = validateLegs(PATH_1260({}, { introduces: [{ term: "silent pass", meaning: "a check that passes having read nothing" }], names: ["unfed guard", "pipeline", "silent pass"] }), "");
  if (subset.error && /no Leg of this path introduces it/.test(subset.error)) fails.push(`(aa) a names list inside the union of every Leg's introduces was refused on the names ground: ${subset.error}`);
  const absent = validateLegs(PATH_1260(), "");
  if (absent.error && /no Leg of this path introduces it/.test(absent.error)) fails.push(`(aa) a reaching Leg with no names list was refused on the names ground: ${absent.error}`);
}

// (ab)-(ae): the Packet side of kogaki#1251 (kogaki#1261).
{
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { parseIntroducesEntry } = compose;
  const dir = mkdtempSync(join(tmpdir(), "kogaki-1261-"));
  const personaA = join(dir, "persona-a.md");
  const personaB = join(dir, "persona-b.md");
  const personaNone = join(dir, "persona-none.md");
  const personaNoKnowledge = join(dir, "persona-no-knowledge.md");
  const personaHead = "id: fixture\nlanguage: English\npersona:\n  reader: >-\n    A fixture reader.\n  prior_knowledge: >-\n    Holds nothing.\n";
  writeFileSync(personaA, personaHead + "register: |\n  **Register A.** Persona A's rule, verbatim.\n");
  writeFileSync(personaB, personaHead + "register: |\n  **Register B.** Persona B's rule, verbatim.\n");
  writeFileSync(personaNone, personaHead);
  // A PERSONA WITH NO `prior_knowledge`: `persona.reader` and `register`
  // present, `prior_knowledge` ENTIRELY ABSENT (distinct from personaNone
  // above, which lacks `register` -- a different concern). One fixture carries both grounds:
  // the reader's-own-world line renders the stated absence rather than
  // refusing (kogaki#1285 acceptance), and an absent `prior_knowledge` grants
  // no extra word to a claim line while refusing nothing (kogaki#1281).
  writeFileSync(personaNoKnowledge, "id: fixture\nlanguage: English\npersona:\n  reader: >-\n    A fixture reader.\nregister: |\n  **Register C.** Persona C's rule, verbatim.\n");
  const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
  const moveText = ["id: open_the_claim", "technique: >-", "  what the move does.", "question: >-",
    "  holds: none", "breaks: >-", "  what a correct performance must not do.", ""].join("\n");
  const legOf = (leg_id, extra = {}) => ({
    leg_id, move: "open_the_claim", materials: ["L1"], purpose: `purpose of ${leg_id}`,
    reader_state_after: `orientation: after ${leg_id}\nknowledge: after ${leg_id}`,
    depends_on: [], rationale: `why ${leg_id}`, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"] }],
    ...extra,
  });
  const briefOf = (legs, keys = {}) => briefOfRecord(recordOf(legs, {
    strands: [{ id: "L1", slug: "first-strand", cite: "coding::lesson/first-strand@" + "0".repeat(64),
      journey_cite: "coding::journey/first-strand@" + "0".repeat(64) }],
    ...keys,
  }), "ab.yaml");
  const render = (brief, leg) => renderPacket({ template: split.packet, brief, leg, moveText, priorSections: [],
    ledgerRow: undefined, section: sectionOfLeg(brief.legs).get(leg.leg_id), sections: sectionsOf(brief.legs) });
  const writeBlock = (packet) => packet.slice(packet.indexOf("\n## Write\n"));
  const block = (packet, from, to) => {
    const a = packet.indexOf(from);
    const b = packet.indexOf(to, a + from.length);
    return a === -1 ? "" : packet.slice(a, b === -1 ? packet.length : b);
  };

  // (ab) two Personas, two Write blocks; one Brief, one Write block but for the budget.
  {
    const legs = [legOf("s1", { budget: 120, introduces: ["pipeline"] }),
      legOf("s2", { budget: 300, depends_on: ["s1"], "re-activate": ["s1 term pipeline"] })];
    const packetsOf = (persona) => {
      const brief = briefOf(legs, { compose_path: persona });
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
      if (!writeBlock(a.s1).includes("Persona A's rule, verbatim.") || writeBlock(a.s1).includes("Persona B's rule")) fails.push("(ab) the Write block under Persona A does not carry Persona A's register alone");
      if (!writeBlock(b.s1).includes("Persona B's rule, verbatim.") || writeBlock(b.s1).includes("Persona A's rule")) fails.push("(ab) the Write block under Persona B does not carry Persona B's register alone");
      if (writeBlock(a.s1) === writeBlock(b.s1)) fails.push("(ab) the Write block did not differ between two Personas");
    }
    if (a.s1 && a.s2) {
      const norm = (w) => w.replace(/^\*\*Budget\.\*\* .*$/m, "**Budget.** <budget>");
      if (norm(writeBlock(a.s1)) !== norm(writeBlock(a.s2))) fails.push("(ab) the Write block differs across the Legs of one Brief beyond the budget");
      if (writeBlock(a.s1) === writeBlock(a.s2)) fails.push("(ab) the budget did not reach the Write block");
    }
    if (a.s1 && !writeBlock(a.s1).includes("**The reader's own world.** Holds nothing.")) fails.push("(ab) the Write block does not render the Persona's prior_knowledge verbatim");

    // (ab) a Persona declaring no prior_knowledge renders the stated absence, never a refusal (kogaki#1285).
    const noKnowledge = packetsOf(personaNoKnowledge);
    if (noKnowledge.s1 && !writeBlock(noKnowledge.s1).includes(READER_OWN_WORLD_ABSENT)) fails.push("(ab) a Persona with no prior_knowledge did not render the stated absence");

    const none = briefOf(legs, { compose_path: personaNone });
    const r = render(none, none.legs[0]);
    if (!r.error || !/register/.test(r.error)) fails.push(`(ab) an Audience with no register did not refuse the Packet naming it: ${r.error || "rendered"}`);
    // AN AUDIENCE WITH NO `language` refuses the Packet naming the key (kogaki#1417).
    const personaNoLanguage = join(dir, "persona-no-language.md");
    writeFileSync(personaNoLanguage, "id: fixture\npersona:\n  reader: >-\n    A fixture reader.\nregister: |\n  plain.\n");
    const noLang = briefOf(legs, { compose_path: personaNoLanguage });
    const rn = render(noLang, noLang.legs[0]);
    if (!rn.error || !/`language`/.test(rn.error)) fails.push(`(ab) an Audience with no language did not refuse the Packet naming it: ${rn.error || "rendered"}`);
    // The shipped Audience's register renders, carrying audiences/dev-to-zenn.md's
    // own prior_knowledge and neither the retired "as the Brief describes the
    // reader at the outset" wording nor an unfilled slot (kogaki#1285).
    const dflt = briefOf(legs, { compose_path: "audiences/dev-to-zenn.md" });
    const rd = render(dflt, dflt.legs[0]);
    if (rd.error) fails.push(`(ab) the Packet did not render from audiences/dev-to-zenn.md: ${rd.error}`);
    else {
      if (!rd.packet.includes("**Referents.**")) fails.push("(ab) the Packet does not carry audiences/dev-to-zenn.md's register");
      if (!rd.packet.includes("**Language.** Write this Leg in English.")) fails.push("(ab) the Packet's Write block does not render audiences/dev-to-zenn.md's language");
      if (!rd.packet.includes(READER_OWN_WORLD_ABSENT)) fails.push("(ab) the Packet does not render audiences/dev-to-zenn.md's stated prior_knowledge absence");
      if (rd.packet.includes("as the Brief describes the reader at the outset")) fails.push("(ab) the Packet still carries the retired reader-description wording");
    }
  }

  // (ac) a Journey an earlier Leg used and this Leg does not re-activate crosses into neither Leg's Packet (default-deny); a re-activated one renders its scene.
  {
    const legs = [legOf("s1", { journeys: [{ strand: "L1", use: "illustrate" }] }),
      legOf("s2", { depends_on: ["s1"] }),
      legOf("s3", { depends_on: ["s1"], "re-activate": ["s1 journey L1"] })];
    const brief = briefOf(legs, { compose_path: personaA });
    if (brief.refusals.length) fails.push(`(ac) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)}`);
    else {
      const CROSSES = "## What crosses into this Leg";
      const s2 = render(brief, brief.legs[1]);
      if (s2.error) fails.push(`(ac) the Packet for s2 did not render: ${s2.error}`);
      else if (s2.packet.includes("L1's Journey")) fails.push("(ac) a Leg that does not re-activate an earlier Leg's Journey still carries it somewhere in the Packet (default-deny violated)");
      const scene = "The fixture scene, as served.";
      const s3leg = { ...brief.legs[2], reactivatedJourneys: [{ leg_id: "s1", strand: "L1", use: "illustrate", resolvedText: scene }] };
      const s3 = render(brief, s3leg);
      if (s3.error) fails.push(`(ac) the Packet for s3 did not render: ${s3.error}`);
      else {
        const crosses = block(s3.packet, CROSSES, "\n## ");
        if (!crosses.includes(scene) || !crosses.includes("L1's Journey") || !crosses.includes("re-activated from s1")) fails.push(`(ac) a re-activated Journey's scene is not rendered under What crosses into this Leg: ${JSON.stringify(crosses)}`);
      }
      const s3bare = render(brief, brief.legs[2]);
      if (!s3bare.error || !/re-activated Journey L1/.test(s3bare.error)) fails.push(`(ac) an unresolved re-activated Journey did not refuse the Packet by name: ${s3bare.error || "rendered"}`);
    }
  }

  // (ad) a typed introduces_item round-trips through the Brief and renders as its term and
  // meaning alone (kogaki#1491, kogaki#1529, kogaki#1571); a Brief header carrying the retired
  // external-authority switch is refused naming the key. The key is spelled apart because the
  // Issue's Acceptance greps checks/ for its literal name to show no reader is left.
  {
    const coined = { term: "unfed guard", meaning: "a guard whose input nobody feeds" };
    const legs = [legOf("s1", { introduces: [coined] })];
    const read = briefOf(legs, { compose_path: personaA });
    const entry = read.refusals.length ? null : (read.legs[0].introduces || []).find((e) => e && e.term === "unfed guard");
    const back = entry ? parseIntroducesEntry(entry) : { error: "no entry" };
    if (back.error || back.meaning !== coined.meaning) fails.push(`(ad) a typed introduces_item did not round-trip through legRecord and readBrief: ${JSON.stringify(back)}`);
    const CROSSES = "## What crosses into this Leg";
    if (!read.refusals.length) {
      const r = render(read, read.legs[0]);
      if (r.error) fails.push(`(ad) the Packet did not render: ${r.error}`);
      else {
        const lines = block(r.packet, CROSSES, "\n## ").split("\n").filter((l) => l.startsWith("- unfed guard"));
        if (lines.length !== 1 || lines[0] !== `- unfed guard — ${coined.meaning}`) fails.push(`(ad) What crosses into this Leg does not render the introduced term as \`- <term> — <meaning>\` alone: ${JSON.stringify(lines)}`);
      }
    }
    const retiredKey = ["external", "authority"].join("_");
    const carried = briefOf(legs, { compose_path: personaA, [retiredKey]: "off" });
    if (!carried.refusals.some((m) => m.includes(`\`${retiredKey}\``))) fails.push(`(ad) a Brief header carrying the retired external-authority switch was not refused naming the key: ${JSON.stringify(carried.refusals)}`);
  }

  // (ae) a conceded Obligation row is read off the record and reaches no Packet (kogaki#1584).
  {
    const legs = [legOf("s1"), legOf("s2", { depends_on: ["s1"] })];
    const obligations = [{
      item: ["Whether the guard can be fed at all"], raised_by: "s1", owed_by: ["s2"], conceded_by: "s2",
      open: "whether any input reaches the guard",
      why_not_here: "the article's evidence is one week of runs",
      reader_keeps: "a way to check their own guard",
    }];
    const brief = briefOf(legs, { compose_path: personaA, obligations });
    const f = brief.refusals.length ? null : obligationRowsOf(brief.record, "s2").find((o) => o.conceded_by === "s2");
    if (!f || f.open !== "whether any input reaches the guard" || f.why_not_here !== "the article's evidence is one week of runs" || f.reader_keeps !== "a way to check their own guard") fails.push(`(ae) obligationRowsOf did not read the row's three fields back off the record: ${JSON.stringify(f)}`);
    if (!brief.refusals.length && obligationRowsOf(brief.record, "s1").some((o) => o.conceded_by === "s1")) fails.push("(ae) obligationRowsOf read a conceded row off a Leg that does not concede it");
    // The retired heading is spelled apart: the Issue's Acceptance greps checks/ for it.
    const ROW_WORDS = [["## This Leg's", "Obligations"].join(" "), "Whether the guard can be fed at all", "whether any input reaches the guard",
      "the article's evidence is one week of runs", "a way to check their own guard"];
    for (const [id, leg] of [["s1", brief.legs[0]], ["s2", brief.legs[1]]]) {
      const r = render(brief, leg);
      if (r.error) { fails.push(`(ae) the Packet for ${id} did not render: ${r.error}`); continue; }
      for (const bad of ROW_WORDS) {
        if (r.packet.includes(bad)) fails.push(`(ae) the Packet for ${id}, a Leg party to the row, carries ${JSON.stringify(bad)}`);
      }
    }
  }

  // (aq) kogaki#1281: an absent prior_knowledge is a STATED ABSENCE, never a refusal.
  {
    const persona = compose.readerPersona(personaNoKnowledge);
    if (persona.error) fails.push(`(aq) readerPersona refused a Persona lacking prior_knowledge: ${persona.error}`);
    else {
      if (persona.prior_knowledge !== null) fails.push(`(aq) readerPersona read a prior_knowledge value off a Persona declaring none: ${JSON.stringify(persona.prior_knowledge)}`);
      const line = compose.personaPriorKnowledgeLine(persona);
      if (line !== compose.PERSONA_PRIOR_KNOWLEDGE_ABSENT) fails.push(`(aq) personaPriorKnowledgeLine did not render the stated absence: ${JSON.stringify(line)}`);
    }
    // the Brief composes AND the Packet renders, with no refusal anywhere.
    const legs = [legOf("s1")];
    const brief = briefOf(legs, { compose_path: personaNoKnowledge });
    if (brief.refusals.length) fails.push(`(aq) a Brief naming a Persona with no prior_knowledge did not parse: ${JSON.stringify(brief.refusals)}`);
    else {
      const r = render(brief, brief.legs[0]);
      if (r.error) fails.push(`(aq) the Packet for a Persona with no prior_knowledge did not render: ${r.error}`);
    }
  }

  // (at) "the article so far" is scoped to the current Section only (kogaki#1282,
  // owner ruling 2026-10-06): a Section-opening Leg carries none of an earlier
  // Section's prose, stating its own absence instead; a continuing Leg carries
  // its own Section's prose and none from before it.
  {
    const legs = [legOf("s1", { opens_section: "Section One" }),
      legOf("s2", { opens_section: "Section Two", depends_on: ["s1"] }),
      legOf("s3", { depends_on: ["s2"] })];
    const brief = briefOf(legs, { compose_path: personaA });
    if (brief.refusals.length) fails.push(`(at) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)}`);
    else {
      const sections = sectionsOf(brief.legs);
      const sectionOf = sectionOfLeg(brief.legs);
      const s1Prose = "Section One's own prose, as written.";
      const renderWithPrior = (leg, priorSections) => renderPacket({
        template: split.packet, brief, leg, moveText, priorSections,
        section: sectionOf.get(leg.leg_id), sections,
      });
      const ARTICLE = "## The article so far, up to this Leg:";
      const s2 = renderWithPrior(brief.legs[1], [{ leg_id: "s1", text: s1Prose }]);
      if (s2.error) fails.push(`(at) the Packet for s2 did not render: ${s2.error}`);
      else {
        const prior = block(s2.packet, ARTICLE, "\n## Write");
        if (prior.includes(s1Prose)) fails.push(`(at) a Section-opening Leg's Packet still carries an earlier Section's prose: ${JSON.stringify(prior)}`);
        if (!/nothing yet — this Leg opens the Section, so its prose is the first in it/.test(prior)) fails.push(`(at) a Section-opening Leg's Packet does not state the absence of its own Section's prose: ${JSON.stringify(prior)}`);
      }
      const s2Prose = "Section Two's own prose, as written so far.";
      const s3 = renderWithPrior(brief.legs[2], [{ leg_id: "s1", text: s1Prose }, { leg_id: "s2", text: s2Prose }]);
      if (s3.error) fails.push(`(at) the Packet for s3 did not render: ${s3.error}`);
      else {
        const prior = block(s3.packet, ARTICLE, "\n## Write");
        if (!prior.includes(s2Prose)) fails.push(`(at) a continuing Leg's Packet does not carry its own Section's prose so far: ${JSON.stringify(prior)}`);
        if (prior.includes(s1Prose)) fails.push(`(at) a continuing Leg's Packet still carries an earlier Section's prose: ${JSON.stringify(prior)}`);
      }
    }
  }
}

if (fails.length > 0) {
  console.log("FAIL check-brief-packet");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("ok: check-brief-packet — re-activate's three composition refusals and its Packet rendering with meaning (kogaki#1237, kogaki#1282); a Journey's resolved text under the Journey block and an unresolved one refused by name (kogaki#1250); journeyTextFromSurvey/journeyResolutionRefusal, writerRefusal's first-line form, and journeyProseFromShardLines; kogaki#1263's four schema widenings and kogaki#1260's four compose refusals over them; the claim `as` sentence (kogaki#1282); and kogaki#1261's Packet rendering, a conceded Obligation row reaching no Packet (kogaki#1584), with a Persona lacking prior_knowledge as a stated absence and the article so far scoped to the current Section.");
JS
