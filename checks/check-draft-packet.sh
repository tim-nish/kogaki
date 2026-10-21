#!/usr/bin/env bash
# check-draft-packet — the rendered Leg Packet carries the Opens-from line as
# one relation word and tells the Writer to realise it with a connective or
# clause, or with nothing, never as a proposition of its own (kogaki#1447,
# kogaki#1477).
#
# THE OWNER'S DECISION THIS NOW HOLDS (2026-10-20, kogaki#1477): "I think
# redefining Join as a relationship type is probably the right direction." On
# the 2026-10-19 Proof Sheet run every paragraph after the first opened on its
# join sentence paraphrased as a clause, because a sentence the Writer must
# realise in its own text is content to the Writer.
#
# THE DECISION IT HELD BEFORE (2026-10-19, kogaki#1447): "A join is a connection and
# nothing more ... the Writer realises it inside the first sentence rather than
# as a sentence of its own." On 2026-10-19 paragraph 2 of the attack-defense
# Proof Sheet run opened on its plan's join rendered nearly whole, because
# `src/packet-template.md` said the opening realises the line "in a
# connective, a clause or a sentence of your choosing", guarded only by "it is
# not copied".
#
# WHAT THIS COVERS, over a Packet rendered by `renderPacket` (src/draft.mjs)
# from a fixture Brief record whose second Leg Waypoint carries the join
# `consequence`:
#   (a) the rendered Packet's Opens-from paragraph -- from "An *Opens from*
#       line" to the blank line -- carries "a connective or clause", "`none`
#       adds nothing" and "Never state the relation as a proposition of its
#       own", and does not carry "or a sentence of your choosing", read as word
#       sequences so a rewrap of the template changes nothing; and nowhere in
#       the Packet is a sentence offered as the opening's form;
#   (b) the join renders as its `*Opens from:*` line under the second Leg
#       Waypoint, so the paragraph (a) reads is the one governing a line the
#       Packet actually carries;
#   (c) THE COUNTERFACTUALS: the same render over the template as it stood
#       before kogaki#1447, and as it stood before kogaki#1477, is each refused
#       by the same predicate, so (a) is not passing vacuously.
#   (d) A `performs` PARAGRAPH WAYPOINT RENDERS AS AN OPERATION LINE
#       (kogaki#1448): in the same Packet, a first Leg Waypoint whose Paragraph
#       Waypoints are a `performs` entry and a `point` entry renders the first
#       as `1. *<operation>*` under its Leg Waypoint -- italic, with no point
#       and no `*Serves:*` -- and the second in the point form; the template's
#       waypoints block tells the Writer such a line is performed in the
#       paragraph's own words and asserts nothing;
#   (e) `node src/draft.mjs resolve` over the fixture Brief with a
#       ParagraphPlan file beside it accepts a Leg Waypoint carrying a
#       `performs` entry beside a `point` entry, and refuses one none of whose
#       Paragraph Waypoints carries a `point`, by name (kogaki#1448).
#   (f) THE REGISTER CARRIES NO VOICE RULE (kogaki#1488): the Write block of
#       the Packet rendered from `audiences/dev-to-zenn.md` -- from `## Write`
#       to the next `## ` heading -- carries the Audience's Referents rule, so
#       the register reached it, and carries neither "voice" nor "hedge" in
#       any case; the same render from a copy of that Audience with the
#       pre-kogaki#1488 Voice paragraph restored is refused by the same
#       predicate, so the absence is not vacuous.
#   (g) A REGISTER RULE YIELDS TO A PLANNED LINE (kogaki#1493): in the Write
#       block of the Packet rendered from `audiences/dev-to-zenn.md`, the
#       precedence paragraph -- from "**What the register below governs.**" to
#       the blank line -- carries "the line holds and the rule yields" and
#       stands before the register's first rule, "**Sentences:**"; and the
#       Packet rendered from an Audience whose `register` is one unrelated
#       sentence carries the same paragraph, byte for byte, before that
#       sentence, so the paragraph is the template's and no Audience edit
#       removes it. Whether the Writer yields is the prose's, and no judge
#       reads it, by the owner's ruling.
#
# NOT COVERED, stated rather than implied: whether a Writer obeys the
# paragraph is the written prose's, and the review item `opens-from-copied`
# (checks/check-review-draft.sh) is what reads that. The rest of the Packet's
# layout is held by checks/check-brief-compose.sh and
# checks/check-paragraph-plan.sh (n).
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap, paragraphPlanRecord, paragraphPlanRecordText } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg, OPENS_FROM_LABEL } =
  await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);

const C1 = "the installer copies the kit into the consumer's tree.";
const JOIN = "consequence";
const leg = {
  leg_id: "s1", move: "a_leg_move", purpose: "purpose of s1", reader_state_after: "knowledge: after s1.",
  materials: ["L1"], depends_on: [], rationale: "rationale for s1.", claims: [{ strand: "L1", proposition: C1 }],
  waypoints: [{ point: "The installer writes into the consumer's tree.", serves: ["L1"] },
    { point: "The next run overwrites any edit to the copy.", serves: ["L1"] }],
};
const text = briefRecordText({
  slug: "packet-brief", compose_path: "audiences/dev-to-zenn.md", external_authority: "on",
  strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
  thesis: "The fixture claim.", reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: "s1", reader_path: [legRecord(leg)],
  strand_coverage: [], journey_coverage: [], closure: [], tradeoffs: {}, bridged: {},
});
const brief = readBrief(text, "theses/packet-brief/brief.yaml");
const render = (templateText) => {
  const l = { ...brief.legs[0], waypoints: brief.legs[0].waypoints.map((w, i) => (i === 1 ? { ...w, join: JOIN } : w)) };
  const split = splitPacketTemplate(templateText);
  if (split.error) return { error: split.error };
  return renderPacket({ template: split.packet, brief, leg: l, priorSections: [],
    section: sectionOfLeg(brief.legs).get(l.leg_id), sections: sectionsOf(brief.legs) });
};
const flat = (s) => String(s).replace(/\s+/g, " ");
const opensFromParagraph = (packet) => {
  const i = packet.indexOf("An *Opens from* line");
  if (i === -1) return null;
  const end = packet.indexOf("\n\n", i);
  return flat(packet.slice(i, end === -1 ? undefined : end));
};
// THE PREDICATE (a) and (c) share: the paragraph names the realisations a relation word admits,
// forbids stating it as a proposition, and offers no sentence.
const realisedInsideFirstSentence = (packet) => {
  const p = opensFromParagraph(packet);
  if (p === null) return "the Packet carries no Opens-from paragraph";
  for (const want of ["a connective or clause", "`none` adds nothing", "Never state the relation as a proposition of its own"]) {
    if (!p.includes(want)) return `the Opens-from paragraph does not carry "${want}": ${p}`;
  }
  if (p.includes("or a sentence of your choosing")) return `the Opens-from paragraph still carries "or a sentence of your choosing": ${p}`;
  if (flat(packet).includes("or a sentence of your choosing")) return "the Packet still offers a sentence of the Writer's choosing as the opening's form";
  return null;
};

const template = readFileSync("src/packet-template.md", "utf8");
const r = render(template);
if (r.error) fails.push(`(a) the fixture Packet did not render: ${r.error}`);
else {
  // (a) the shipped template.
  const why = realisedInsideFirstSentence(r.packet);
  if (why) fails.push(`(a) ${why}`);
  // (b) the line the paragraph governs is in the Packet, under the second Leg Waypoint.
  const lines = r.packet.split("\n");
  const at = lines.findIndex((l) => l.startsWith("2. The next run overwrites any edit to the copy."));
  if (at === -1 || lines[at + 1] !== `   ${OPENS_FROM_LABEL} ${JOIN}`) {
    fails.push(`(b) the join does not render as its Opens-from line under the second Leg Waypoint: ${JSON.stringify(lines.slice(Math.max(at, 0), at + 2))}`);
  }
  if (lines.filter((l) => l.includes(OPENS_FROM_LABEL)).length !== 1) fails.push("(b) the Packet carries an Opens-from line other than the second Leg Waypoint's");
}

// (c) the counterfactuals: the template as it stood before kogaki#1447, and before kogaki#1477,
// is each refused.
const OPENS_FROM_HEAD = "An *Opens from* line under a numbered line states how that paragraph's first\n"
  + "point follows from the paragraph before it. ";
for (const [label, para] of [
  ["kogaki#1447", OPENS_FROM_HEAD + "The paragraph's opening realises\nit, in a connective, a clause or a sentence of your "
    + "choosing and wording, under\nthe Referents rule of the register. It is not a point of its own, it is not\ncopied, and it is not announced."],
  ["kogaki#1477", OPENS_FROM_HEAD + "The paragraph's opening realises\nthat connection inside its first sentence, in that "
    + "sentence's connective or\nclause, in wording of your choosing and under the Referents rule of the\nregister: never as a sentence "
    + "of its own and never in the line's words. The\nline is a connection and nothing more. It is not a point of its own, it is not\n"
    + "copied, and it is not announced."]]) {
  const before = template.replace(/An \*Opens from\* line under a numbered line[\s\S]*?\n\n/, para + "\n\n");
  if (before === template) { fails.push(`(c) the fixture could not rebuild the pre-${label} Opens-from paragraph from the template`); continue; }
  const old = render(before);
  if (old.error) fails.push(`(c) the pre-${label} Packet did not render: ${old.error}`);
  else if (realisedInsideFirstSentence(old.packet) === null) fails.push(`(c) the pre-${label} Opens-from paragraph passed the predicate (a) applies`);
}

// (d) a performs Paragraph Waypoint renders as an operation line, with no point and no Serves.
const PERFORMS = "flags the case as hard and announces a simplification by way of a pair of cases.";
{
  const l = { ...brief.legs[0], waypoints: brief.legs[0].waypoints.map((w, i) => (i === 0
    ? { ...w, paragraph_waypoints: [{ performs: PERFORMS }, { point: "PW-1-2 the installer writes the copy.", serves: ["L1"] }] } : w)) };
  const split = splitPacketTemplate(template);
  const r2 = split.error ? { error: split.error } : renderPacket({ template: split.packet, brief, leg: l, priorSections: [],
    section: sectionOfLeg(brief.legs).get(l.leg_id), sections: sectionsOf(brief.legs) });
  if (r2.error) fails.push(`(d) the fixture Packet with a performs Paragraph Waypoint did not render: ${r2.error}`);
  else {
    const lines = r2.packet.split("\n");
    const at = lines.findIndex((x) => x.startsWith("1. The installer writes into the consumer's tree."));
    if (at === -1 || lines[at + 1] !== `   1. *${PERFORMS}*` || !lines[at + 2].startsWith("   2. PW-1-2 the installer writes the copy. *Serves:* ")) {
      fails.push(`(d) the performs Paragraph Waypoint does not render as an italic operation line with no Serves under its Leg Waypoint: ${JSON.stringify(lines.slice(Math.max(at, 0), at + 3))}`);
    }
    if (lines.some((x) => x.includes(PERFORMS) && x.includes("*Serves:*"))) fails.push("(d) the performs line carries a *Serves:*");
    const block = flat(r2.packet.slice(r2.packet.indexOf("## The waypoints this Leg takes the reader through")));
    if (!block.includes("An indented line in italics, with no claim beside it, is not a point.")
      || !block.includes("Perform it in the paragraph's own words") || !block.includes("It asserts nothing")) {
      fails.push("(d) the Packet's waypoints block does not tell the Writer an italic line is performed in the paragraph's own words and asserts nothing");
    }
  }
}

// (e) resolve reads a performs entry beside a point entry, and refuses a Leg Waypoint with no point entry.
{
  const root = mkdtempSync(join(tmpdir(), "draft-packet-"));
  const resolveWith = (name, first) => {
    const dir = join(root, name, "theses", "packet-brief");
    mkdirSync(dir, { recursive: true });
    const briefPath = join(dir, "brief.yaml");
    writeFileSync(briefPath, text);
    writeFileSync(join(dir, "paragraph-plan.yaml"), paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText: text,
      legs: [{ leg_id: "s1", waypoints: [first, [{ point: "PW-2-1 the next run overwrites the edit.", serves: ["L1"] }]],
        joins: [null, JOIN] }] })));
    return spawnSync(process.execPath, ["src/draft.mjs", "resolve", "--brief", briefPath, "--workspace", join(root, name, "ws")],
      { encoding: "utf8", timeout: 120000 });
  };
  const ok = resolveWith("mixed", [{ performs: PERFORMS }, { point: "PW-1-2 the installer writes the copy.", serves: ["L1"] }]);
  if (ok.status !== 0) fails.push(`(e) resolve refused a Leg Waypoint carrying a performs entry beside a point entry: ${(ok.stderr || ok.stdout || "").slice(0, 400)}`);
  const none = resolveWith("no-point", [{ performs: PERFORMS }]);
  if (none.status === 0 || !(none.stderr || "").includes("none of its Paragraph Waypoints carries a `point`")) {
    fails.push(`(e) resolve did not refuse a Leg Waypoint none of whose Paragraph Waypoints carries a point, by name: ${(none.stderr || none.stdout || "").slice(0, 400)}`);
  }
}

// (f) the Write block rendered from the Audience carries no voice rule and no hedge (kogaki#1488).
const writeBlock = (packet) => {
  const i = packet.indexOf("\n## Write\n");
  if (i === -1) return null;
  const end = packet.indexOf("\n## ", i + 1);
  return packet.slice(i, end === -1 ? undefined : end);
};
const carriesNoVoiceRule = (packet) => {
  const w = writeBlock(packet);
  if (w === null) return "the Packet carries no Write block";
  if (!w.includes("**Referents.**")) return "the Write block does not carry the Audience's Referents rule, so the register did not reach it";
  for (const bad of [/voice/i, /hedge/i]) if (bad.test(w)) return `the Write block carries ${bad}: ${flat(w.slice(w.search(bad) - 80, w.search(bad) + 80))}`;
  return null;
};
if (!r.error) {
  const why = carriesNoVoiceRule(r.packet);
  if (why) fails.push(`(f) ${why}`);
}
{
  const VOICE = "  **Voice.** The first person is permitted; where a claim's scope is narrower\n"
    + "  than the sentence that states it, say so in the first person with a hedge.\n";
  const dir = mkdtempSync(join(tmpdir(), "draft-packet-voice-"));
  const audience = join(dir, "dev-to-zenn.md");
  writeFileSync(audience, readFileSync("audiences/dev-to-zenn.md", "utf8").replace(/\n*$/, "\n\n") + VOICE);
  const voiced = readBrief(text.replace("compose_path: audiences/dev-to-zenn.md", `compose_path: ${audience}`), "theses/packet-brief/brief.yaml");
  if (voiced.record?.compose_path !== audience) fails.push("(f) the fixture could not point the Brief at the pre-kogaki#1488 Audience");
  else {
    const split = splitPacketTemplate(template);
    const old = renderPacket({ template: split.packet, brief: voiced, leg: voiced.legs[0], priorSections: [],
      section: sectionOfLeg(voiced.legs).get(voiced.legs[0].leg_id), sections: sectionsOf(voiced.legs) });
    if (old.error) fails.push(`(f) the pre-kogaki#1488 Packet did not render: ${old.error}`);
    else if (carriesNoVoiceRule(old.packet) === null) fails.push("(f) the pre-kogaki#1488 Voice paragraph passed the predicate (f) applies");
  }
}

// (g) the precedence paragraph stands before the register, and an Audience edit does not remove it (kogaki#1493).
const PRECEDENCE_HEAD = "**What the register below governs.**";
const precedence = (packet, firstRule) => {
  const w = writeBlock(packet);
  if (w === null) return { error: "the Packet carries no Write block" };
  const i = w.indexOf(PRECEDENCE_HEAD);
  if (i === -1) return { error: `the Write block carries no "${PRECEDENCE_HEAD}" paragraph` };
  const end = w.indexOf("\n\n", i);
  const para = w.slice(i, end === -1 ? undefined : end);
  if (!flat(para).includes("the line holds and the rule yields")) return { error: `the precedence paragraph does not carry "the line holds and the rule yields": ${flat(para)}` };
  const at = w.indexOf(firstRule);
  if (at === -1) return { error: `the Write block does not carry the register's first rule ${JSON.stringify(firstRule)}` };
  if (at < i + para.length) return { error: `the register's first rule ${JSON.stringify(firstRule)} does not follow the precedence paragraph` };
  return { para };
};
let shipped = null;
if (!r.error) {
  const p = precedence(r.packet, "**Sentences:**");
  if (p.error) fails.push(`(g) ${p.error}`);
  else shipped = p.para;
}
{
  const UNRELATED = "Write about the weather in Osaka.";
  const dir = mkdtempSync(join(tmpdir(), "draft-packet-precedence-"));
  const audience = join(dir, "one-sentence.md");
  writeFileSync(audience, readFileSync("audiences/dev-to-zenn.md", "utf8").replace(/\nregister: \|[\s\S]*$/, `\nregister: |\n  ${UNRELATED}\n`));
  const other = readBrief(text.replace("compose_path: audiences/dev-to-zenn.md", `compose_path: ${audience}`), "theses/packet-brief/brief.yaml");
  if (other.record?.compose_path !== audience) fails.push("(g) the fixture could not point the Brief at the one-sentence Audience");
  else {
    const split = splitPacketTemplate(template);
    const o = renderPacket({ template: split.packet, brief: other, leg: other.legs[0], priorSections: [],
      section: sectionOfLeg(other.legs).get(other.legs[0].leg_id), sections: sectionsOf(other.legs) });
    if (o.error) fails.push(`(g) the one-sentence Audience's Packet did not render: ${o.error}`);
    else {
      const p = precedence(o.packet, UNRELATED);
      if (p.error) fails.push(`(g) one-sentence Audience: ${p.error}`);
      else if (shipped !== null && p.para !== shipped) fails.push(`(g) the precedence paragraph changed with the Audience: ${flat(p.para)}`);
      if (writeBlock(o.packet)?.includes("**Sentences:**")) fails.push("(g) the one-sentence Audience's Packet still carries the dev-to-zenn register");
    }
  }
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-packet — the rendered Packet's Opens-from paragraph says the relation word is realised with a connective or clause or with nothing, that `none` adds nothing, and never as a proposition of its own, and offers no sentence of the Writer's choosing; the join renders as its one-word Opens-from line under its Leg Waypoint; and the pre-kogaki#1447 and pre-kogaki#1477 wordings are each refused by the same predicate (kogaki#1447, kogaki#1477); a performs Paragraph Waypoint renders as an italic operation line with no Serves under its Leg Waypoint, the template tells the Writer it asserts nothing, and resolve accepts it beside a point entry and refuses a Leg Waypoint with no point entry (kogaki#1448); the Write block rendered from the Audience carries its register with no voice rule and no hedge, and the pre-kogaki#1488 Voice paragraph is refused (kogaki#1488); the precedence paragraph saying the line holds and the rule yields stands before the register's first rule, unchanged under an Audience whose register is one unrelated sentence (kogaki#1493).");
JS
