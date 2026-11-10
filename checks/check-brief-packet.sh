#!/usr/bin/env bash
# check-brief-packet — the Packet side of Brief composition: the Leg's crossing
# fields retired (kogaki#1768), Journey resolution, the writer's refusal form, the
# introduces entry's shape and the Obligation record's retirement (kogaki#1699).
#   (n)-(o)   re-activate retired at the Leg; every Packet states the absence
#             under What crosses into this Leg (kogaki#1237, #1282, #1768).
#   (p)-(s)   Journey text resolution, writerRefusal, shard prose (kogaki#1250).
#   (t)-(aa)  kogaki#1263's widenings and kogaki#1260's compose refusals, now
#             refusals of the retired fields by name; (v) the record retired
#             (kogaki#1699); (y) an introduces entry as the ParagraphPlan carries it.
#   (ab)-(ae) the Write block with no budget, Journey or introduced term (kogaki#1261,
#             #1768), and an Obligation record refused by key, with (aq) and (at).
# A LIGHT member: pure calls, no model run; cut from check-brief-compose.sh (kogaki#1460).
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
const { validateLegs, legRecord } = compose;
const fails = [];

// (n) `re-activate` (kogaki#1237, re-ruled default-deny at kogaki#1282), RETIRED AT THE LEG
// (kogaki#1768): a Leg binds no Move, introduces no term and re-activates nothing, so a Leg
// carrying `re-activate` is refused naming the field and kogaki#1768, every Packet of a Brief
// renders the stated absence under "What crosses into this Leg", and `depends_on` and the
// retired crossing headings reach no Packet.
{
  const legOf = (leg_id, extra = {}) => ({
    leg_id, claims: [{ type: "strand", strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"], case: "own" }],
    ...extra,
  });
  const path = (s2extra = {}) => [legOf("s1", { opens_section: "A Section" }), legOf("s2", s2extra), legOf("s3", { reaches_target: true })];
  const carrying = validateLegs(path({ "re-activate": ["s1 term pipeline"] }));
  if (!carrying.error || !/leg 2 \(s2\): carries `re-activate`, which is retired/.test(carrying.error) || !carrying.error.includes("kogaki#1768")) {
    fails.push(`(n) a Leg carrying re-activate was not refused naming the field and kogaki#1768: ${carrying.error}`);
  }
  const good = validateLegs(path());
  if (good.error) fails.push(`(n) a path re-activating nothing was refused: ${good.error}`);

  // THE RENDERED PACKET, over the real template and a Brief read back from its own record.
  const brief = briefOfRecord(recordOf(path()), "n.yaml");
  if (brief.refusals.length || brief.legs.length !== 3) fails.push(`(n) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)} legs=${brief.legs.length}`);
  const split = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8"));
  const sections = sectionsOf(brief.legs);
  const packets = {};
  for (const leg of brief.legs) {
    const r = renderPacket({ template: split.packet, brief, leg, priorSections: [],
      section: sectionOfLeg(brief.legs).get(leg.leg_id), sections });
    if (r.error) { fails.push(`(n) the Packet for ${leg.leg_id} did not render: ${r.error}`); continue; }
    packets[leg.leg_id] = r.packet;
  }
  for (const id of Object.keys(packets)) {
    const m = packets[id].split("## What crosses into this Leg\n")[1];
    const crosses = m ? m.split("\n## ")[0] : null;
    if (crosses === null || !/nothing — this Leg introduces and re-activates nothing/.test(crosses)) fails.push(`(n) the Packet of ${id} does not render the stated absence under What crosses into this Leg: ${String(crosses).trim().slice(0, 160)}`);
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
    leg_id, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"], case: "own" }],
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
        // renders each line as the sentences it is (kogaki#1694).
        if (!/rendered as the sentences it is/.test(packet.replace(/\s+/g, " "))) fails.push("(o) the Packet's waypoints block header does not carry \"rendered as the sentences it is\"");
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
    waypoints: [{ point: "the paragraph establishes what s1 claims", serves: ["L1"], case: "own" }],
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
    waypoints: [{ point: "the paragraph establishes what s2 claims", serves: ["L1"], case: "own" }],
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

// (t)-(u) kogaki#1263's `re-activate` journey form and typed `introduces_item`, RETIRED FROM THE
// LEG SCHEMA (kogaki#1768): src/leg-schema.json declares neither `re-activate` nor `introduces`
// nor an `introduces_item` section, and `validateLegs` refuses each field by name.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  for (const f of ["re-activate", "introduces", "journeys"]) {
    if (schema.fields[f]) fails.push(`(t) src/leg-schema.json still declares the retired \`${f}\` field (kogaki#1768)`);
  }
  if (schema.introduces_item) fails.push("(u) src/leg-schema.json still declares an introduces_item section (kogaki#1768)");
  for (const [f, v] of [["re-activate", ["s1 journey L2"]], ["introduces", [{ term: "unfed guard", meaning: "a guard whose input nobody feeds" }]], ["journeys", [{ strand: "L2", use: "illustrate" }]]]) {
    const refused = validateLegs(PATH_1260({ [f]: v }));
    if (!refused.error || !refused.error.includes(`leg 1 (s1): carries \`${f}\`, which is retired`)) fails.push(`(u) a Leg carrying \`${f}\` was not refused by name: ${refused.error}`);
  }
}

// (v) THE OBLIGATION RECORD IS RETIRED FROM BOTH SCHEMAS (kogaki#1699, retiring kogaki#1612):
// src/candidate-schema.json declares no `obligations` field and lists it among its retired fields,
// and src/leg-schema.json declares no `obligation_*` path rule. The conceded state's names, retired
// at kogaki#1612, stay out of both; they are composed, never spelled.
{
  const gone = [["why", "not", "here"].join("_"), ["reader", "keeps"].join("_"), ["conceded", "by"].join("_"), ["discharged", "by"].join("_")];
  const candidateSchema = JSON.parse(readFileSync("src/candidate-schema.json", "utf8"));
  if (candidateSchema.fields.obligations) fails.push("(v) src/candidate-schema.json still declares an obligations field");
  if (!candidateSchema.retired_fields || !/kogaki#1699/.test(candidateSchema.retired_fields.obligations || "")) fails.push("(v) src/candidate-schema.json does not list obligations among its retired fields naming kogaki#1699");
  const legSchema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  const rules = Object.keys(legSchema.path_rules).filter((k) => k.startsWith("obligation_"));
  if (rules.length) fails.push(`(v) src/leg-schema.json still declares the Obligation path rules ${JSON.stringify(rules)}`);
  for (const g of gone) {
    if (JSON.stringify(legSchema).includes(g)) fails.push(`(v) src/leg-schema.json still names \`${g}\``);
    if (JSON.stringify(candidateSchema).includes(g)) fails.push(`(v) src/candidate-schema.json still names \`${g}\``);
  }
}

// (w)-(x) the reaching Leg's `names` (kogaki#1263) and re-activate's journey form (kogaki#1260),
// RETIRED (kogaki#1768): src/leg-schema.json declares no `names`, and a reaching Leg carrying it is
// refused by name, as a Leg re-activating a journey is.
{
  const schema = JSON.parse(readFileSync("src/leg-schema.json", "utf8"));
  if (schema.fields.names) fails.push("(w) src/leg-schema.json still declares the retired names field (kogaki#1768)");
  const named = validateLegs(PATH_1260({}, {}).map((l) => (l.reaches_target ? { ...l, names: ["unfed guard"] } : l)));
  if (!named.error || !/leg 3 \(s3\): carries `names`, which is retired/.test(named.error)) fails.push(`(w) a reaching Leg carrying names was not refused by name: ${named.error}`);
  const journey = validateLegs(PATH_1260({}, { "re-activate": ["s1 journey L2"] }));
  if (!journey.error || !/leg 2 \(s2\): carries `re-activate`, which is retired/.test(journey.error)) fails.push(`(x) a Leg re-activating a journey was not refused by name: ${journey.error}`);
}

// (y) an introduces entry's own shape, as the ParagraphPlan's entries still carry it (kogaki#1768
// retired it from the Leg): `term` and `meaning`, every retired key refused by name.
{
  const { introducesRefusal } = compose;
  for (const [entry, key] of [[{ term: "unfed guard", kind: "coined", meaning: "a guard whose input nobody feeds" }, "kind"],
    [{ term: "pipeline", meaning: "a chain of stages", source: "build practice" }, "source"],
    [{ term: "unfed guard", meaning: "a guard whose input nobody feeds", nearest: "guard clause" }, "nearest"],
    [{ term: "unfed guard", meaning: "a guard whose input nobody feeds", differs: "guard clause" }, "differs"]]) {
    const r = introducesRefusal([entry], "leg 1 (s1)");
    if (!r || !r.includes(`"${entry.term}" carries \`${key}\``)) fails.push(`(y) an introduces entry carrying the retired ${key} was not refused by name: ${r}`);
  }
  const noMeaning = introducesRefusal([{ term: "unfed guard" }, "pipeline"], "leg 1 (s1)");
  if (!noMeaning || !/"unfed guard" carries no meaning/.test(noMeaning)) fails.push(`(y) an introduces entry with no meaning was not refused naming the entry: ${noMeaning}`);
  const withMeaning = introducesRefusal([{ term: "unfed guard", meaning: "a guard whose input nobody feeds" }, "pipeline"], "leg 1 (s1)");
  if (withMeaning && /no meaning/.test(withMeaning)) fails.push(`(y) an introduces entry carrying meaning was refused on the meaning ground: ${withMeaning}`);
}

// (am) a re-activate claim entry's `as` sentence (kogaki#1282), RETIRED with `re-activate`
// (kogaki#1768): a claim entry, with its sentence or without, is refused as the retired field.
{
  for (const entry of ["s1 claim L1", "s1 claim L1 as the grounded claim, restated plainly"]) {
    const r = validateLegs(PATH_1260({}, { "re-activate": [entry] }));
    if (!r.error || !/carries `re-activate`, which is retired/.test(r.error)) fails.push(`(am) the re-activate claim entry ${JSON.stringify(entry)} was not refused as the retired field: ${r.error}`);
  }
}

// (z) THE BRIEF-SCALE LEDGER REFUSAL IS RETIRED (kogaki#1699, retiring kogaki#1612 and kogaki#1568):
// `obligationLedgerRefusal` is no longer exported, and `validateLegs` reads no ledger, so a path is
// judged on its Legs alone.
{
  if ("obligationLedgerRefusal" in compose) fails.push("(z) src/compose.mjs still exports obligationLedgerRefusal, retired at kogaki#1699");
  if ("obligationRowsOf" in compose) fails.push("(z) src/compose.mjs still exports obligationRowsOf, retired at kogaki#1699");
  const rPath = validateLegs(PATH_1260());
  if (rPath.error) fails.push(`(z) validateLegs refused a well-formed path over no ledger: ${rPath.error}`);
}

// (aa) the reaching Leg's `names` subset rule (kogaki#1251 item 4, kogaki#1260) is moot with
// `names` retired (kogaki#1768): a path carrying no `names` passes.
{
  const absent = validateLegs(PATH_1260());
  if (absent.error) fails.push(`(aa) a path carrying no names was refused: ${absent.error}`);
}

// (ab)-(ae): the Packet side of kogaki#1251 (kogaki#1261).
{
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
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
    leg_id, claims: [{ strand: "L1", proposition: `claim of ${leg_id}` }], waypoints: [{ point: `the paragraph establishes what ${leg_id} claims`, serves: ["L1"], case: "own" }],
    ...extra,
  });
  const briefOf = (legs, keys = {}) => briefOfRecord(recordOf(legs, {
    strands: [{ id: "L1", slug: "first-strand", cite: "coding::lesson/first-strand@" + "0".repeat(64),
      journey_cite: "coding::journey/first-strand@" + "0".repeat(64) }],
    ...keys,
  }), "ab.yaml");
  // A record whose first Leg carries a field `legRecord` never writes, read back by the Brief reader.
  const briefCarrying = (field, value) => {
    const rec = recordOf([legOf("s1", { reaches_target: true })], { compose_path: personaA,
      strands: [{ id: "L1", slug: "first-strand", cite: "coding::lesson/first-strand@" + "0".repeat(64) }] });
    rec.reader_path[0][field] = value;
    return briefOfRecord(rec, "carrying.yaml");
  };
  const render = (brief, leg) => renderPacket({ template: split.packet, brief, leg, moveText, priorSections: [],
    ledgerRow: undefined, section: sectionOfLeg(brief.legs).get(leg.leg_id), sections: sectionsOf(brief.legs) });
  const writeBlock = (packet) => packet.slice(packet.indexOf("\n## Write\n"));
  const block = (packet, from, to) => {
    const a = packet.indexOf(from);
    const b = packet.indexOf(to, a + from.length);
    return a === -1 ? "" : packet.slice(a, b === -1 ? packet.length : b);
  };

  // (ab) two Personas, two Write blocks; one Brief, one Write block, the budget retired from the
  // Leg (kogaki#1768).
  {
    const legs = [legOf("s1"), legOf("s2", { reaches_target: true })];
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
    if (a.s1 && a.s2 && writeBlock(a.s1) !== writeBlock(a.s2)) fails.push("(ab) the Write block differs across the Legs of one Brief, though no Leg carries a budget");
    const budgeted = validateLegs([legOf("s1", { budget: 120, reaches_target: true })]);
    if (!budgeted.error || !/carries `budget`, which is retired/.test(budgeted.error)) fails.push(`(ab) a Leg carrying budget was not refused by name: ${budgeted.error}`);
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

  // (ac) A JOURNEY CROSSES INTO NO LEG OF A BRIEF (kogaki#1768): a Brief whose Leg carries
  // `journeys` is refused by the reader naming the field, and a Packet of a Brief carries no
  // Journey line.
  {
    const carrying = briefCarrying("journeys", [{ strand: "L1", use: "illustrate" }]);
    if (!carrying.refusals.some((m) => m.includes("carries `journeys`"))) fails.push(`(ac) a Brief whose Leg carries journeys was not refused naming the field: ${JSON.stringify(carrying.refusals)}`);
    const brief = briefOf([legOf("s1"), legOf("s2", { reaches_target: true })], { compose_path: personaA });
    if (brief.refusals.length) fails.push(`(ac) the fixture Brief did not parse: ${JSON.stringify(brief.refusals)}`);
    else for (const leg of brief.legs) {
      const r = render(brief, leg);
      if (r.error) fails.push(`(ac) the Packet for ${leg.leg_id} did not render: ${r.error}`);
      else if (r.packet.includes("L1's Journey")) fails.push(`(ac) the Packet for ${leg.leg_id} carries a Journey`);
    }
  }

  // (ad) a Leg introduces no term (kogaki#1768, retiring kogaki#1491's typed crossing line): a
  // Brief whose Leg carries `introduces` is refused by the reader naming the field; a Brief header
  // carrying the retired external-authority switch is refused naming the key. The key is spelled apart because the
  // Issue's Acceptance greps checks/ for its literal name to show no reader is left.
  {
    const coined = { term: "unfed guard", meaning: "a guard whose input nobody feeds" };
    const read = briefCarrying("introduces", [coined]);
    if (!read.refusals.some((m) => m.includes("carries `introduces`"))) fails.push(`(ad) a Brief whose Leg carries introduces was not refused naming the field: ${JSON.stringify(read.refusals)}`);
    const legs = [legOf("s1", { reaches_target: true })];
    const retiredKey = ["external", "authority"].join("_");
    const carried = briefOf(legs, { compose_path: personaA, [retiredKey]: "off" });
    if (!carried.refusals.some((m) => m.includes(`\`${retiredKey}\``))) fails.push(`(ad) a Brief header carrying the retired external-authority switch was not refused naming the key: ${JSON.stringify(carried.refusals)}`);
  }

  // (ae) A BRIEF CARRYING AN OBLIGATION RECORD IS REFUSED NAMING THE KEY (kogaki#1699, retiring
  // kogaki#1584 and kogaki#1612), and the Packet of a ledgerless Brief carries no Obligations block.
  {
    const legs = [legOf("s1"), legOf("s2", { reaches_target: true })];
    const obligations = [{ opened_by: "s1", items: [{ item: "Whether the guard can be fed at all", closed_by: "s2" }] }];
    const ledgered = briefOf(legs, { compose_path: personaA, obligations });
    if (!ledgered.refusals.some((m) => m.includes("carries `obligations`") && m.includes("kogaki#1699"))) {
      fails.push(`(ae) a Brief carrying one Obligation record was not refused naming the key: ${JSON.stringify(ledgered.refusals)}`);
    }
    const brief = briefOf(legs, { compose_path: personaA });
    if (brief.refusals.length) fails.push(`(ae) the ledgerless Brief was refused: ${JSON.stringify(brief.refusals)}`);
    else {
      // The retired heading is spelled apart: the Issue's Acceptance greps checks/ for it.
      const RETIRED_HEADING = ["## This Leg's", "Obligations"].join(" ");
      for (const [id, leg] of [["s1", brief.legs[0]], ["s2", brief.legs[1]]]) {
        const r = render(brief, leg);
        if (r.error) { fails.push(`(ae) the Packet for ${id} did not render: ${r.error}`); continue; }
        if (r.packet.includes(RETIRED_HEADING)) fails.push(`(ae) the Packet for ${id} carries the retired Obligations heading`);
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
      legOf("s2", { opens_section: "Section Two" }),
      legOf("s3", { reaches_target: true })];
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
console.log("ok: check-brief-packet — re-activate, introduces, journeys, names and budget retired from the Leg and refused by name, every Packet of a Brief stating the crossing absence (kogaki#1237, kogaki#1282, kogaki#1768); a Journey's resolved text under the Journey block and an unresolved one refused by name (kogaki#1250); journeyTextFromSurvey/journeyResolutionRefusal, writerRefusal's first-line form, and journeyProseFromShardLines; kogaki#1263's schema widenings retired from the Leg schema and an introduces entry's shape as the ParagraphPlan carries it; and kogaki#1261's Packet rendering, a Brief carrying an Obligation record refused naming the key, the record retired from both schemas and the ledger refusal no longer exported (kogaki#1699), with a Persona lacking prior_knowledge as a stated absence and the article so far scoped to the current Section.");
JS
