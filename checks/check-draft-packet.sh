#!/usr/bin/env bash
# check-draft-packet — the rendered Leg Packet hands the Writer a plan and no
# Point (kogaki#1859).
#
# THE OWNER'S DECISION THIS HOLDS (2026-11-18, kogaki#1859): "Points must not be
# passed to the Writer. Points are for debugging." The Packet's first block is
# the plan of the paragraph: the table of the Leg's structure, read from the
# Brief's `structure` at the Leg's `relation`, and, under a Move table, one part
# per Segment. Nothing of a ParagraphPlan paragraph is printed.
#
# WHAT THIS COVERS, over a Packet rendered by `renderPacket` (src/draft.mjs)
# from a fixture Brief record of one Leg and its `text`
# (kogaki#1775), and from the fixture Brief of checks/fixtures/paragraph-plan/stage.mjs, whose Legs
# name relations of its `structure`, beside a ParagraphPlan file of the form kogaki#1876 writes:
#   (a) THE PACKET CARRIES NO POINT: the rendered Packet holds no `*Serves:*`,
#       no `*Opens from:*` and no `*Cast:*`, and under a `structure` its plan
#       block carries the three fixed sentences on the paragraph's wording;
#   (c) THE PLAN BLOCK READS THE BRIEF'S STRUCTURE: with a `structure` on the
#       Brief and a `relation` on the Leg, the plan block holds one table row
#       `| {<id>} | <name> | <kind> | <Arguments> | <sentence> |` for each Role,
#       Relation and HigherOrderRelation, each sentence with its braces, then
#       the CentralClaim's symbol and the Arguments' symbols, and
#       carries no parts list; with `segments` on the Leg it lists one part per
#       Segment, the symbol `{<id>}` or `Neither`, and after it, for
#       each Edge and each earlier part the Edge points to, `To part <n>:` and
#       the text src/sme/senses.json holds for the Edge's Sense and for its
#       Hypophora, then `Pointed to by` and the later parts whose Edges point to
#       it (kogaki#1865, kogaki#1901); a plan
#       naming a Sense the Senses file does not hold is refused naming the
#       Sense; with no `structure` it says the claims are the whole plan and
#       holds no table row;
#   (f) THE REGISTER CARRIES NO VOICE RULE (kogaki#1488): the prose block of
#       the Packet rendered from `audiences/dev-to-zenn.md` -- from `## How the
#       prose reads` to the next `## ` heading (kogaki#1904) -- carries the Audience's Referents rule, so
#       the register reached it, and carries neither "voice" nor "hedge" in
#       any case; the same render from a copy of that Audience with the
#       pre-kogaki#1488 Voice paragraph restored is refused by the same
#       predicate, so the absence is not vacuous.
#   (h) A REGISTER RULE YIELDS TO THE PLAN (kogaki#1493, kogaki#1859): in the
#       prose block of the Packet rendered from `audiences/dev-to-zenn.md`, the
#       precedence paragraph -- from "**What the register below governs.**" to
#       the blank line -- carries "the plan holds and the rule yields" and
#       stands before the register's first rule, "**Sentences.**"; and the
#       Packet rendered from an Audience whose `register` is one unrelated
#       sentence carries the same paragraph, byte for byte, before that
#       sentence, so the paragraph is the template's and no Audience edit
#       removes it.
#   (i) A LEG INTRODUCES NO TERM (kogaki#1768, retiring kogaki#1491's crossing
#       line): a Brief whose Leg carries `introduces` is refused naming the
#       field, and the fixture Leg renders a Packet carrying no term line and
#       no crossing block (kogaki#1911).
#   (j) NO OBLIGATION ROW REACHES THE PACKET, AND THE PACKET ASKS FOR NO
#       SENTENCE THE PLAN DOES NOT CARRY (kogaki#1584, kogaki#1496): a Leg
#       of a Brief, which carries no Obligation row since kogaki#1699 (a
#       Brief carrying one is refused naming the key) -- renders a Packet
#       carrying none of the retired Obligations heading, "*Promise:*",
#       "*Keeps:*" or the row's item words (the heading spelled apart, since
#       the Issue's Acceptance greps checks/ for it), which nowhere holds
#       "recover" or "round trip" (kogaki#1911),
#       and which nowhere carries "concede it explicitly" or "Honor
#       the rows"; the same Packet with the retired Obligations block put
#       back, and the render with the pre-kogaki#1496 honour line restored to the
#       passage and round-trip paragraph to the Writer's file, are each refused by
#       the same predicate, so the absences are not vacuous.
#   (k) THE RENDERER REFUSES A TEMPLATE THAT BREAKS THE CRITERIA BOUND
#       (kogaki#1555): the Writer's file and the passage pass `templateCriteriaFailures`
#       under src/draft-workflow.json's `criteria`; and a passage given a
#       criterion line that runs to `words_max` words, or one carrying each of
#       `; `, `: ` and ` -- `, each refuse at `renderPacket` naming file and line.
#   (l) THE WRITER'S TEXT LISTS THE PLAN'S SEGMENTS (kogaki#1865): a plan file
#       written by `paragraphPlanRecord` renders, through `resolve`, a Packet
#       listing one part per Segment of the Leg with the Senses file's texts
#       and no Sense name; the same file with a Leg's `paragraphs` written back is refused
#       naming `paragraphs`.
#   (m) A LEG CARRIES `leg_id` AND `segments` ALONE (kogaki#1876): a plan Leg
#       carrying `move`, `fit` or `points` is refused at resolve naming the
#       Leg and the key.
#   (o) A KEY OUTSIDE THE SET IS REFUSED: a plan Leg carrying `cast` is
#       refused at resolve naming `cast`.
#   (q) THE TABLE HOLDS WHAT THE LEG'S RELATION REACHES: for a Leg on a
#       HigherOrderRelation the table is one row for each Role, Relation and
#       HigherOrderRelation that relation reaches and no other row, and no line
#       of the Writer's input holds a sentence `legSentences` gives.
#   (r) A PART OPENS WITH A SYMBOL: each part's line opens with a symbol in
#       braces or with `Neither.`, and none with `Argument ` or `CentralClaim.`.
#       (q) and (r) are checks/draft-packet-cases.mjs, their count held to
#       `case_floor` both ways.
#   RETIRED at kogaki#1865: the cases of the paragraph's schema, `manner`
#   and `cast`, and the Mapping Record's (p), with the fields.
#   RETIRED at kogaki#1876: case (b), with the plan file's `points`.
#
# NOT COVERED, stated rather than implied: whether a Writer obeys the plan
# is the written prose's. The rest of the Packet's layout is held by
# checks/check-brief-compose.sh and checks/check-paragraph-plan.sh.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS' || exit 1
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, paragraphPlanRecord, paragraphPlanRecordText } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { readBrief, renderPacket, sectionsOf, sectionOfLeg } =
  await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);
const { templateCriteriaFailures } = await import(pathToFileURL(join(repo, "src", "draft", "render-packet.mjs")).href);
const [WRITER_PROMPT_FILE, PACKET_FILE] = [join("prompts", "draft", "write-leg.prompt"), join("prompts", "draft", "_packet.prompt")];
const renderPacketWith = async (files) => (await treeWith(repo, files)("src/draft.mjs")).renderPacket;
const { treeWith, removeTrees } = await import(pathToFileURL(join(repo, "checks", "fixtures", "tree-copy.mjs")).href);
const STAGE = await import(pathToFileURL(join(repo, "checks", "fixtures", "paragraph-plan", "stage.mjs")).href);

const C1 = "the installer copies the kit into the consumer's tree.";
// The Leg says its relation's `holds` as its `text` (kogaki#1775).
const LEG_TEXT = "The installer writes into the consumer's tree, and the next run overwrites any edit to the copy.";
const leg = { leg_id: "s1", text: LEG_TEXT, claims: [{ strand: "L1", proposition: C1 }] };
// The Leg as loadBrief hands it to the renderer: its Segments beside it, where the plan carries them.
const asRead = (l, segments) => (segments ? { ...l, segments } : l);
const text = briefRecordText({
  slug: "packet-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
  thesis: "The fixture claim.", reader_path: [legRecord(leg)],
  strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {},
});
const brief = readBrief(text, "theses/packet-brief/brief.yaml");
const render = async (templateText) => {
  const l = asRead(brief.legs[0]);
  const rp = templateText === undefined ? renderPacket : await renderPacketWith({ [PACKET_FILE]: templateText });
  return rp({ brief, leg: l, priorSections: [],
    section: sectionOfLeg(brief.legs).get(l.leg_id), sections: sectionsOf(brief.legs) });
};
const flat = (s) => String(s).replace(/\s+/g, " ");
const PLAN_HEAD = [
  "Write the paragraph in words you choose for this reader.",
  "The sentences in the table are written to fix the structure exactly, and a reader hears them as a plan.",
  "One thing keeps one name through the whole paragraph.",
];
const planBlock = (packet) => {
  const i = packet.indexOf("## The plan of this paragraph\n");
  const end = packet.indexOf("## The claims this Leg asserts", i);
  return i === -1 || end === -1 ? null : packet.slice(i, end);
};

const [template, passage] = [WRITER_PROMPT_FILE, PACKET_FILE].map((f) => readFileSync(f, "utf8"));
const r = await render();
if (r.error) fails.push(`(a) the fixture Packet did not render: ${r.error}`);
else {
  // (a) no Serves, no Opens from, no Cast; the plan block's fixed sentences are asserted under a structure, in (c).
  for (const label of ["*Serves:*", "*Opens from:*", "*Cast:*", "waypoint"]) {
    if (r.packet.includes(label)) fails.push(`(a) the Packet carries ${JSON.stringify(label)}`);
  }
  if (planBlock(r.packet) === null) fails.push("(a) the Packet carries no plan block before the claims block");
}

// (b) and (l): plan files of the stage fixture's Brief, rendered through `resolve`.
const SEGS = [{ bind: 1, edges: [] }, { bind: null, edges: [{ sense: "Conjunction", to: [1] }] },
  { bind: 2, edges: [{ sense: "Contrast", to: [1, 2] }, { sense: "Cause.Result", to: [2] }] },
  { bind: 3, edges: [{ sense: null, to: [3], hypophora: true }] }];
const T = { C: "both bear the same relation to some other situation in the text, or contribute to it together. The reader adds one point to another of equal standing, and neither explains the other.", X: "at least two differences between the two are brought out. The reader sets two things side by side and sees where they differ.", R: "the situations the two describe are causally tied, and not as a condition. Here this sentence gives the effect. The reader learns why a situation holds, or what it led to.", H: "the sentence pointed to raises a question, and this sentence gives its answer. The reader is given the question first, so the answer arrives as something they were waiting for." }, SENSE_NAMES = /\b(Sense|Conjunction|Contrast|Cause|Result|Hypophora|hypophora|null)\b/;
const wantParts = (a1, a2, central) => [`1. {${a1}}. Pointed to by part 2, part 3.`, `2. Neither. To part 1: ${T.C} Pointed to by part 3.`, `3. {${a2}}. To part 1 and part 2 together: ${T.X} To part 2: ${T.R} Pointed to by part 4.`, `4. {${central}}. To part 3: ${T.H}`];
const sRoot = mkdtempSync(join(tmpdir(), "draft-packet-plan-"));
const sDir = join(sRoot, "theses", "paragraph-plan-brief");
mkdirSync(sDir, { recursive: true });
const sBriefPath = join(sDir, "brief.yaml"), sPlanPath = join(sDir, "paragraph-plan.yaml");
const sText = STAGE.briefOf(STAGE.STRUCTURE);
writeFileSync(sBriefPath, sText);
const sPlan = () => paragraphPlanRecordText(paragraphPlanRecord({ briefPath: sBriefPath, briefText: sText,
  legs: STAGE.LEGS.map((l) => ({ leg_id: l.leg_id, segments: SEGS })) }));
let sN = 0;
const sResolve = (planText) => {
  writeFileSync(sPlanPath, planText);
  const ws = join(sRoot, `ws-${++sN}`);
  const out = spawnSync(process.execPath, ["src/draft.mjs", "resolve", "--brief", sBriefPath, "--workspace", ws], { encoding: "utf8", timeout: 120000 });
  const at = join(ws, "paragraph-plan-brief", "packets", "s1.md");
  return { out, said: (out.stderr || out.stdout || "").slice(0, 400), packet: out.status === 0 && existsSync(at) ? readFileSync(at, "utf8") : null };
};
{
  const one = sResolve(sPlan());
  if (one.packet === null) fails.push(`(l) resolve did not render the Packet: ${one.said}`);
  else {
    // (l) the Writer's text lists one part per Segment with the Senses file's texts and no Sense name.
    const lines = (planBlock(one.packet) || "").split("\n");
    for (const want of wantParts("r_1", "r_2", "c_1")) if (!lines.includes(want)) fails.push(`(l) the Packet does not list the part ${JSON.stringify(want)}`);
    if (lines.some((x) => /^\d+\. /.test(x) && SENSE_NAMES.test(x))) fails.push("(l) a part's line of the Packet names a Sense");
  }
  const withKey = (text) => sResolve(sPlan().replace(/^( +)segments:/m, `$1${text}\n$1segments:`));
  const back = withKey("paragraphs: []");
  if (back.out.status === 0 || !back.said.includes("carries `paragraphs`, which left the record")) fails.push(`(l) a plan Leg carrying \`paragraphs\` was not refused by name: ${back.said}`);
  // (m) a plan Leg carries `leg_id` and `segments` alone: `move`, `fit` and `points` are each refused by name.
  for (const [key, text] of [["move", "move: z_fewer"], ["fit", "fit: {}"], ["points", "points: []"]]) {
    const r = withKey(text);
    if (r.out.status === 0 || !r.said.includes("leg s1") || !r.said.includes(`carries \`${key}\`, which a ParagraphPlan record does not declare`)) fails.push(`(m) a plan Leg carrying \`${key}\` was not refused naming the Leg and the key: ${r.said}`);
  }
  // (o) a key outside the set is refused by name.
  const cast = withKey("cast: {}");
  if (cast.out.status === 0 || !cast.said.includes("carries `cast`")) fails.push(`(o) a plan Leg carrying \`cast\` was not refused naming it: ${cast.said}`);
}

// (c) the plan block reads the Brief's structure at the Leg's relation, and the Leg's segments.
{
  const STRUCTURE = {
    roles: [
      { id: "kit", name: "the kit", context: "The files the installer copies.", attributes: [] },
      { id: "tree", name: "the consumer's tree", context: "The directory the copy lands in.", attributes: [] },
    ],
    relations: [
      { id: "writes", name: "writes", between: ["kit", "tree"], holds: "The installer writes {kit} into {tree}." },
      { id: "overwrites", name: "overwrites", between: ["kit", "tree"], holds: "The next run overwrites an edit to {kit} in {tree}." },
      { id: "lost", name: "lost", relates: ["writes", "overwrites"], holds: "An edit to {kit} in {tree} is lost." },
    ],
  };
  const ROWS = ["| {kit} | the kit | Role |  | The files the installer copies. |", "| {tree} | the consumer's tree | Role |  | The directory the copy lands in. |", "| {writes} | writes | Relation | {kit}, {tree} | The installer writes {kit} into {tree}. |", "| {overwrites} | overwrites | Relation | {kit}, {tree} | The next run overwrites an edit to {kit} in {tree}. |", "| {lost} | lost | Relation | {writes}, {overwrites} | An edit to {kit} in {tree} is lost. |"];
  const WANT_PARTS = wantParts("writes", "overwrites", "lost");
  const sBrief = { ...brief, record: { ...brief.record, structure: STRUCTURE } };
  const renderLeg = (extra) => {
    const l = asRead({ ...brief.legs[0], ...extra });
    return renderPacket({ brief: sBrief, leg: l, priorSections: [],
      section: sectionOfLeg(brief.legs).get(l.leg_id), sections: sectionsOf(brief.legs) });
  };
  const said = [...ROWS, "The CentralClaim of this paragraph is {lost}.", "Its Arguments are {writes}, {overwrites}."];
  const plain = renderLeg({ relation: "lost" });
  if (plain.error) fails.push(`(c) the Packet with a structure did not render: ${plain.error}`);
  else {
    const lines = (planBlock(plain.packet) || "").split("\n");
    for (const want of said) if (!lines.includes(want)) fails.push(`(c) the plan block does not carry ${JSON.stringify(want)}`);
    for (const want of PLAN_HEAD) if (!lines.includes(want)) fails.push(`(a) the plan block does not carry ${JSON.stringify(want)}`);
    if (lines.includes("### The parts of the paragraph, in order")) fails.push("(c) a Leg with no segments renders a parts list");
    if (lines.includes("The claims below are the whole plan of this paragraph.")) fails.push("(c) a Leg with a structure says the claims are the whole plan");
  }
  const parted = renderLeg({ relation: "lost", segments: SEGS });
  if (parted.error) fails.push(`(c) the Packet with segments did not render: ${parted.error}`);
  else {
    const lines = (planBlock(parted.packet) || "").split("\n");
    const at = lines.indexOf("### The parts of the paragraph, in order");
    if (at === -1) fails.push("(c) a Leg with segments renders no parts list");
    for (const want of [...said, ...WANT_PARTS]) if (!lines.includes(want)) fails.push(`(c) the plan block does not carry ${JSON.stringify(want)}`);
    if (at !== -1 && lines.indexOf(WANT_PARTS[0]) < at) fails.push("(c) the parts do not stand under the parts heading");
  }
  const unheld = renderLeg({ relation: "lost", segments: [SEGS[0], { bind: 2, edges: [{ sense: "Cause", to: [1] }] }] }); if (!unheld.error || !unheld.error.includes('the Sense "Cause"')) fails.push(`(c) a plan naming the Sense Cause, which src/sme/senses.json does not hold, was not refused naming it: ${unheld.error || "rendered"}`);
  if (!r.error) {
    const lines = (planBlock(r.packet) || "").split("\n");
    if (!lines.includes("The claims below are the whole plan of this paragraph.")) fails.push("(c) a Brief with no structure does not say the claims are the whole plan");
    if (lines.some((x) => x.startsWith("| ") || x.startsWith("The CentralClaim of this paragraph is "))) fails.push("(c) a Brief with no structure holds a table row or names a CentralClaim");
  }
}

// (k) the renderer refuses a template whose criterion line breaks the bound, naming the line (kogaki#1555).
{
  const table = JSON.parse(readFileSync("src/draft-workflow.json", "utf8"));
  const wordsMax = table.criteria?.words_max;
  if (!Number.isInteger(wordsMax)) fails.push("(k) src/draft-workflow.json declares no integer `criteria.words_max`");
  const shippedFails = [template, passage].flatMap((t) => templateCriteriaFailures(t));
  if (shippedFails.length) fails.push(`(k) the shipped template fails the criteria bound: ${shippedFails.join("; ")}`);
  // The shipped template carries no criterion line since kogaki#1859, so each fixture adds one.
  const target = "- NO CLAIM: The sentence that performs it states no proposition.";
  const pad = Array.from({ length: Math.max(0, (wordsMax || 0) - target.slice(2).split(/\s+/).length) }, () => "really").join(" ");
  for (const [label, broken] of [
    [`over words_max`, target.replace(" states no proposition.", ` states ${pad} no proposition.`)],
    ["carrying `; `", target.replace(" proposition.", " proposition; it adds no cause.")],
    ["carrying `: `", target.replace(" proposition.", " proposition: no cause either.")],
    ["carrying ` -- `", target.replace(" proposition.", " proposition -- and no cause.")]]) {
    const fixture = passage.replace("## The claims this Leg asserts", `${broken}\n\n## The claims this Leg asserts`);
    if (fixture === passage) { fails.push(`(k) the fixture could not write the criterion line ${label}`); continue; }
    const line = fixture.split("\n").indexOf(broken) + 1;
    const b = (await renderPacketWith({ [PACKET_FILE]: fixture }))({ brief, leg: asRead(brief.legs[0]), priorSections: [],
      section: sectionOfLeg(brief.legs).get(brief.legs[0].leg_id), sections: sectionsOf(brief.legs) });
    if (!b.error) fails.push(`(k) the template whose criterion line is ${label} rendered a Packet`);
    else if (!b.error.includes(`${PACKET_FILE} line ${line} \`${broken}\``)) fails.push(`(k) the refusal for the criterion line ${label} does not name the line: ${b.error}`);
  }
}

// (f) the prose block rendered from the Audience carries no voice rule and no hedge (kogaki#1488, kogaki#1904).
const writeBlock = (packet, head = "\n## How the prose reads\n") => {
  const i = packet.indexOf(head);
  if (i === -1) return null;
  const end = packet.indexOf("\n## ", i + 1);
  return packet.slice(i, end === -1 ? undefined : end);
};
const carriesNoVoiceRule = (packet) => {
  const w = writeBlock(packet);
  if (w === null) return "the Packet carries no prose block";
  if (!w.includes("**Referents.**")) return "the prose block does not carry the Audience's Referents rule, so the register did not reach it";
  for (const bad of [/voice/i, /hedge/i]) if (bad.test(w)) return `the prose block carries ${bad}: ${flat(w.slice(w.search(bad) - 80, w.search(bad) + 80))}`;
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
    const old = renderPacket({ brief: voiced, leg: asRead(voiced.legs[0]), priorSections: [],
      section: sectionOfLeg(voiced.legs).get(voiced.legs[0].leg_id), sections: sectionsOf(voiced.legs) });
    if (old.error) fails.push(`(f) the pre-kogaki#1488 Packet did not render: ${old.error}`);
    else if (carriesNoVoiceRule(old.packet) === null) fails.push("(f) the pre-kogaki#1488 Voice paragraph passed the predicate (f) applies");
  }
}

// (h) the precedence paragraph stands before the register, and an Audience edit does not remove it (kogaki#1493).
const PRECEDENCE_HEAD = "**What the register below governs.**";
const precedence = (packet, firstRule) => {
  const w = writeBlock(packet);
  if (w === null) return { error: "the Packet carries no prose block" };
  const i = w.indexOf(PRECEDENCE_HEAD);
  if (i === -1) return { error: `the prose block carries no "${PRECEDENCE_HEAD}" paragraph` };
  const end = w.indexOf("\n\n", i);
  const para = w.slice(i, end === -1 ? undefined : end);
  if (!flat(para).includes("the plan holds and the rule yields")) return { error: `the precedence paragraph does not carry "the plan holds and the rule yields": ${flat(para)}` };
  const at = w.indexOf(firstRule);
  if (at === -1) return { error: `the prose block does not carry the register's first rule ${JSON.stringify(firstRule)}` };
  if (at < i + para.length) return { error: `the register's first rule ${JSON.stringify(firstRule)} does not follow the precedence paragraph` };
  return { para };
};
let shipped = null;
if (!r.error) {
  const p = precedence(r.packet, "**Sentences.**");
  if (p.error) fails.push(`(h) ${p.error}`);
  else shipped = p.para;
}
{
  const UNRELATED = "Write about the weather in Osaka.";
  const dir = mkdtempSync(join(tmpdir(), "draft-packet-precedence-"));
  const audience = join(dir, "one-sentence.md");
  const shippedAudience = readFileSync("audiences/dev-to-zenn.md", "utf8");
  // Only the `register` block is replaced -- its indented lines and blank lines -- so a key after it survives.
  const oneSentence = shippedAudience.replace(/\nregister: \|\n(?:(?: {2}.*)?\n)*/, `\nregister: |\n  ${UNRELATED}\n\n`);
  if (oneSentence === shippedAudience) fails.push("(h) the fixture could not replace the `register` block of audiences/dev-to-zenn.md");
  writeFileSync(audience, oneSentence);
  const other = readBrief(text.replace("compose_path: audiences/dev-to-zenn.md", `compose_path: ${audience}`), "theses/packet-brief/brief.yaml");
  if (other.record?.compose_path !== audience) fails.push("(h) the fixture could not point the Brief at the one-sentence Audience");
  else {
    const o = renderPacket({ brief: other, leg: asRead(other.legs[0]), priorSections: [],
      section: sectionOfLeg(other.legs).get(other.legs[0].leg_id), sections: sectionsOf(other.legs) });
    if (o.error) fails.push(`(h) the one-sentence Audience's Packet did not render: ${o.error}`);
    else {
      const p = precedence(o.packet, UNRELATED);
      if (p.error) fails.push(`(h) one-sentence Audience: ${p.error}`);
      else if (shipped !== null && p.para !== shipped) fails.push(`(h) the precedence paragraph changed with the Audience: ${flat(p.para)}`);
      if (writeBlock(o.packet)?.includes("**Sentences.**")) fails.push("(h) the one-sentence Audience's Packet still carries the dev-to-zenn register");
    }
  }
}

// (i) A LEG INTRODUCES NO TERM (kogaki#1768): a Leg binds no Move and carries no `introduces`, so a
// Brief whose Leg carries one is refused naming the field, and the ledgerless fixture Leg renders a
// Packet carrying no term line and no crossing block (kogaki#1911).
{
  const TERM = { term: "unfed guard", meaning: "a guard whose input nobody feeds" };
  const recordWith = (extra) => briefRecordText({
    slug: "packet-brief", compose_path: "audiences/dev-to-zenn.md",
    strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
    thesis: "The fixture claim.", reader_path: [{ ...legRecord(leg), ...extra }],
    strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {},
  });
  const refused = readBrief(recordWith({ introduces: [TERM] }), "theses/packet-brief/brief.yaml");
  if (!(refused.refusals || []).some((m) => m.includes("carries `introduces`, which is not a Leg field"))) {
    fails.push(`(i) a Brief whose Leg carries \`introduces\` was not refused naming the field: ${JSON.stringify(refused.refusals)}`);
  }
  const gBrief = readBrief(recordWith({}), "theses/packet-brief/brief.yaml");
  const g = (gBrief.refusals || []).length ? { error: JSON.stringify(gBrief.refusals) }
    : renderPacket({ brief: gBrief, leg: asRead(gBrief.legs[0]), priorSections: [],
      section: sectionOfLeg(gBrief.legs).get(gBrief.legs[0].leg_id), sections: sectionsOf(gBrief.legs) });
  if (g.error) fails.push(`(i) the fixture Packet with no introduced term did not render: ${g.error}`);
  else if (g.packet.includes(`- ${TERM.term} — `) || g.packet.includes("What crosses into this Leg")) fails.push("(i) the Packet carries a term line from no `introduces` or a crossing block");
}

// (j) no Obligation row reaches the Packet (kogaki#1584), and the Packet asks for no sentence the plan does not carry (kogaki#1496).
{
  const ROW = "the reader is owed why the copy is overwritten";
  const RECOVERY = /recover|round trip/i;
  const RETIRED_HEADING = ["## This Leg's", "Obligations"].join(" ");
  // A record s1 opens (kogaki#1612). The Brief carries no Obligations ledger since kogaki#1699,
  // so a Brief carrying one is refused naming the key, and the Packet is rendered from the
  // ledgerless fixture Brief.
  const opened = { opened_by: "s1", items: [{ item: ROW, closed_by: "s2" }] };
  const jTextWith = (row) => briefRecordText({
    slug: "packet-brief", compose_path: "audiences/dev-to-zenn.md",
    strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
    thesis: "The fixture claim.", reader_path: [legRecord(leg)],
    strand_coverage: [], journey_coverage: [], obligations: [row], tradeoffs: {}, bridged: {},
  });
  const ledgered = readBrief(jTextWith(opened), "theses/packet-brief/brief.yaml");
  const jBrief = brief;
  const jRender = async (files) => {
    const rp = files === undefined ? renderPacket : await renderPacketWith(files);
    return rp({ brief: jBrief, leg: asRead(jBrief.legs[0]), priorSections: [],
      section: sectionOfLeg(jBrief.legs).get(jBrief.legs[0].leg_id), sections: sectionsOf(jBrief.legs) });
  };
  // THE PREDICATE the shipped render and the counterfactuals share.
  const asksNoUnplannedSentence = (packet) => {
    for (const bad of [RETIRED_HEADING, "*Promise:*", "*Keeps:*", ROW]) {
      if (packet.includes(bad)) return `the Packet carries "${bad}"`;
    }
    const w = writeBlock(packet, "\n## Write\n");
    if (w === null) return "the Packet carries no Write block";
    if (RECOVERY.test(packet)) return "the Packet holds \"recover\" or \"round trip\"";
    for (const bad of ["concede it explicitly", "Honor the rows"]) {
      if (flat(packet).includes(bad)) return `the Packet carries "${bad}"`;
    }
    return null;
  };
  if (!(ledgered.refusals || []).some((m) => m.includes("carries `obligations`") && m.includes("kogaki#1699"))) fails.push(`(j) a Brief carrying an Obligation row was not refused naming the key: ${JSON.stringify(ledgered.refusals)}`);
  if ((jBrief.refusals || []).length) fails.push(`(j) the fixture Brief was refused: ${JSON.stringify(jBrief.refusals)}`);
  else {
    const j = await jRender();
    if (j.error) fails.push(`(j) the fixture Packet with an Obligation row did not render: ${j.error}`);
    else {
      const why = asksNoUnplannedSentence(j.packet);
      if (why) fails.push(`(j) ${why}`);
      const restored = j.packet.replace("## How the prose reads", `${RETIRED_HEADING}\n\n- ${ROW}\n\n## How the prose reads`);
      if (restored === j.packet) fails.push("(j) the fixture could not put the retired Obligations block back");
      else if (asksNoUnplannedSentence(restored) === null) fails.push("(j) the Packet with the retired Obligations block passed the predicate (j) applies");
    }
    const before = {
      [PACKET_FILE]: passage.replace("## How the prose reads", "Honor the rows below in the prose rather than restating them as fields.\n\n## How the prose reads"),
      [WRITER_PROMPT_FILE]: template.replace("**When a step cannot be performed.**", "**The round trip — claims only.** Each claim above must be recoverable from\n"
        + "what you write. Where making one plain loses something, either restore the\nloss or **concede it explicitly in the prose**. "
        + "A concession is part of the\noutput; a silent omission is not a simplification, it is a loss.\n\n**When a step cannot be performed.**") };
    if (!before[PACKET_FILE].includes("Honor the rows") || !before[WRITER_PROMPT_FILE].includes("concede it explicitly")) fails.push("(j) the fixture could not rebuild the pre-kogaki#1496 template");
    else {
      const old = await jRender(before);
      if (old.error) fails.push(`(j) the pre-kogaki#1496 Packet did not render: ${old.error}`);
      else if (asksNoUnplannedSentence(old.packet) === null) fails.push("(j) the pre-kogaki#1496 template passed the predicate (j) applies");
    }
  }
}

removeTrees();
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-packet — the rendered Packet carries no planned point, no Serves, Opens-from or Cast line, and under a structure its plan block carries its three fixed sentences on the paragraph's wording; a plan Leg carrying move, fit or points is refused by name at resolve (kogaki#1876); the plan block holds one table row for each Role, Relation and HigherOrderRelation of the Leg's relation, each sentence with its braces, then the symbols of its CentralClaim and Arguments, one part per Segment opening with its symbol, with the Senses file's text toward each part an Edge points to, Hypophora's text and the later parts that point to it, and no Sense name, where the Leg carries segments, and a plan naming a Sense the file does not hold is refused naming it (kogaki#1865, kogaki#1901), and says the claims are the whole plan where the Brief carries no structure (kogaki#1859); the prose block carries its register with no voice rule and no hedge, and the pre-kogaki#1488 Voice paragraph is refused (kogaki#1488); the precedence paragraph saying the plan holds and the rule yields stands before the register's first rule, unchanged under an Audience whose register is one unrelated sentence (kogaki#1493); a Leg introduces no term (kogaki#1768); no Obligation row reaches the Packet and the pre-kogaki#1496 wording is refused (kogaki#1584, kogaki#1496); the Writer prompt and its passage pass the criteria bound, and a criterion line at words_max words or carrying `; `, `: ` or ` -- ` refuses at render naming the file and the line (kogaki#1555); a plan Leg carrying `paragraphs`, `points` with no Move, `move` without `fit`, or `cast` is refused at resolve naming it (kogaki#1865).");
JS

OUT=$(node checks/draft-packet-cases.mjs 2>&1); RC=$?
printf '%s\n' "$OUT"
[[ $RC -eq 0 ]] || { echo "FAIL: the cases on the table of the plan block did not run clean"; exit 1; }
FLOOR=$(node -e 'console.log(require("./checks/registry.json").checks.find((m) => m.id === "draft-packet").admission.case_floor)') || { echo "FAIL: could not read case_floor for draft-packet from checks/registry.json"; exit 1; }
N=$(sed -n 's/^draft-packet: \([0-9][0-9]*\) case(s) pass.*/\1/p' <<<"$OUT")
[[ -n "$N" ]] || { echo "FAIL: no case count readable from the pass's output -- an unreadable floor is not a pass"; exit 1; }
if (( N < FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR -- cases were LOST"
  exit 1
fi
if (( N > FLOOR )); then
  echo "FAIL: the pass reported $N case(s) against a declared case_floor of $FLOOR -- cases were ADDED and the floor was not advanced. Set case_floor to $N for 'draft-packet' in checks/registry.json, in this commit"
  exit 1
fi
echo "ok: check-draft-packet ran ${N} case(s) of checks/draft-packet-cases.mjs clean, exactly at its floor of ${FLOOR}"
