#!/usr/bin/env bash
# check-draft-packet — the rendered Leg Packet hands the Writer a plan and no
# Point (kogaki#1859).
#
# THE OWNER'S DECISION THIS HOLDS (2026-11-18, kogaki#1859): "Points must not be
# passed to the Writer. Points are for debugging." The Packet's first block is
# the plan of the paragraph: the Leg's Arguments and CentralClaim, read from the
# Brief's `structure` at the Leg's `relation`, and, under a Move table, one part
# per Segment. Nothing of a ParagraphPlan paragraph is printed.
#
# WHAT THIS COVERS, over a Packet rendered by `renderPacket` (src/draft.mjs)
# from a fixture Brief record of one Leg, its `text` and no Brief Waypoint
# (kogaki#1775), beside the two paragraphs a ParagraphPlan gives it, the second
# carrying the join `consequence` (kogaki#1777):
#   (a) THE PACKET CARRIES NO POINT: the rendered Packet holds none of the
#       plan's points, no `*Serves:*`, no `*Opens from:*` and no `*Cast:*`, and
#       its plan block opens with the six fixed sentences;
#   (b) THE POINTS DO NOT CHANGE THE PACKET: two renderings of the Leg, from two
#       plans that differ only in their Points -- the point text, the number
#       of Points, a cast, a judge's forced mark and a join -- are equal byte
#       for byte;
#   (c) THE PLAN BLOCK READS THE BRIEF'S STRUCTURE: with a `structure` on the
#       Brief and a `relation` on the Leg, the plan block lists the Arguments as
#       `- Argument <k>. <sentence>` and the CentralClaim as
#       `- CentralClaim. <sentence>`, each sentence `legSentences` gives, and
#       carries no parts list; with `segments` on the Leg it lists one part per
#       Segment, `Argument <k>`, `CentralClaim` or `Neither`, and its Sense and
#       the earlier parts it names; with no `structure` it says the claims are
#       the whole plan and lists no Argument;
#   (f) THE REGISTER CARRIES NO VOICE RULE (kogaki#1488): the Write block of
#       the Packet rendered from `audiences/dev-to-zenn.md` -- from `## Write`
#       to the next `## ` heading -- carries the Audience's Referents rule, so
#       the register reached it, and carries neither "voice" nor "hedge" in
#       any case; the same render from a copy of that Audience with the
#       pre-kogaki#1488 Voice paragraph restored is refused by the same
#       predicate, so the absence is not vacuous.
#   (h) A REGISTER RULE YIELDS TO THE PLAN (kogaki#1493, kogaki#1859): in the
#       Write block of the Packet rendered from `audiences/dev-to-zenn.md`, the
#       precedence paragraph -- from "**What the register below governs.**" to
#       the blank line -- carries "the plan holds and the rule yields" and
#       stands before the register's first rule, "**Sentences:**"; and the
#       Packet rendered from an Audience whose `register` is one unrelated
#       sentence carries the same paragraph, byte for byte, before that
#       sentence, so the paragraph is the template's and no Audience edit
#       removes it.
#   (i) A LEG INTRODUCES NO TERM (kogaki#1768, retiring kogaki#1491's crossing
#       line): a Brief whose Leg carries `introduces` is refused naming the
#       field, and the fixture Leg renders a Packet whose crossing block carries
#       no term line.
#   (j) NO OBLIGATION ROW REACHES THE PACKET, AND THE PACKET ASKS FOR NO
#       SENTENCE THE PLAN DOES NOT CARRY (kogaki#1584, kogaki#1496): a Leg
#       of a Brief, which carries no Obligation row since kogaki#1699 (a
#       Brief carrying one is refused naming the key) -- renders a Packet
#       carrying none of the retired Obligations heading, "*Promise:*",
#       "*Keeps:*" or the row's item words (the heading spelled apart, since
#       the Issue's Acceptance greps checks/ for it), whose Write block carries the
#       round trip's "Each claim above must be recoverable from what you
#       write", and which nowhere carries "concede it explicitly" or "Honor
#       the rows"; the same Packet with the retired Obligations block put
#       back, and the render from the template with the pre-kogaki#1496
#       honour line and round-trip paragraph restored, are each refused by
#       the same predicate, so the absences are not vacuous.
#   (k) THE RENDERER REFUSES A TEMPLATE THAT BREAKS THE CRITERIA BOUND
#       (kogaki#1555): the shipped template passes `templateCriteriaFailures`
#       under src/draft-workflow.json's `criteria`; and a template given a
#       criterion line that runs to `words_max` words, or one carrying each of
#       `; `, `: ` and ` -- `, each refuse at `renderPacket` naming that line.
#   (l) NO SEGMENT FIELD REACHES THE PACKET (kogaki#1585, owner decision
#       2026-10-25): a ParagraphPlan written by `paragraphPlanRecord` from
#       Waypoints that carry their Segment's `manner` -- two `point`
#       ones -- holds no `manner`, and the Packet
#       `node src/draft.mjs resolve` renders from it carries its plan block and
#       neither a Manner label, the manner's text nor either Waypoint; and the
#       same plan file with the `manner` written back onto a Waypoint is
#       refused at resolve, naming that Waypoint.
#   (m) THE PACKET CARRIES NOTHING OF THE PARAGRAPH'S SCHEMA (kogaki#1639).
#   (o) A CAST KEY OUTSIDE THE SET IS REFUSED (kogaki#1695): a plan with
#       `cast: { brief: true }` is refused at resolve naming `brief`.
#   (p) A PLAN WITH A MAPPING RECORD STILL HANDS NO POINT (kogaki#1735,
#       kogaki#1859): resolve renders the Packet, which carries none of the
#       structure's `holds` in the table's expressions, no planned point and
#       not the Leg's text.
#
# NOT COVERED, stated rather than implied: whether a Writer obeys the plan
# is the written prose's. The rest of the Packet's layout is held by
# checks/check-brief-compose.sh and checks/check-paragraph-plan.sh.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap, paragraphPlanRecord, paragraphPlanRecordText } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { readBrief, renderPacket, sectionsOf, sectionOfLeg } =
  await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);
const { templateCriteriaFailures } = await import(pathToFileURL(join(repo, "src", "draft", "render-packet.mjs")).href);
const WRITER_PROMPT_FILE = join("prompts", "draft", "write-leg.prompt");
const renderPacketWith = async (text) => (await treeWith(repo, { [WRITER_PROMPT_FILE]: text })("src/draft.mjs")).renderPacket;
const { treeWith, removeTrees } = await import(pathToFileURL(join(repo, "checks", "fixtures", "tree-copy.mjs")).href);
const { writeMappingRecord, mappingDirFor } = await import(pathToFileURL(join(repo, "src", "compose", "mapping-record.mjs")).href);

const C1 = "the installer copies the kit into the consumer's tree.";
const JOIN = "consequence";
// EVERY PLAN PARAGRAPH CARRIES ITS SCHEMA (kogaki#1639): its Strands, a purpose, the paragraph
// before, a rationale, no term and no re-activation, and no reader state (kogaki#1701); the Leg
// binds the one Move (any id the library holds -- /draft opens no Move, kogaki#1311) for all its
// paragraphs (kogaki#1777). The texts are marked so (m) can read their absence from the Packet.
const MOVE = "deny_the_far_side_its_remedy_and_show_the_absence_at_work";
const ENTRY = (n, total, legId = "s1", serves = ["L1"]) => ({
  materials: [...serves],
  purpose: `PURPOSE-${n} brings the reader to the point.`,
  depends_on: n > 1 ? [n - 1] : [], rationale: `RATIONALE-${n} its before holds the state the paragraph before leaves.`,
  "re-activate": [],
});
const ENTRIES = (total, legId = "s1", serves = ["L1"]) => Array.from({ length: total }, (_, i) => ENTRY(i + 1, total, legId, serves));
// ONE LEG OF THE PLAN FILE (kogaki#1777): its Move, and one paragraph per list of Waypoints, each
// carrying its schema entry and, after the first, its join.
const planEntry = (legId, pwsList, entries, joins) => ({ leg_id: legId, move: MOVE,
  paragraphs: pwsList.map((pws, i) => ({ ...entries[i], ...(joins[i] ? { join: joins[i] } : {}), paragraph_waypoints: pws })) });
// The Leg says its relation's `holds` as its `text` and carries no Brief Waypoint (kogaki#1775).
const LEG_TEXT = "The installer writes into the consumer's tree, and the next run overwrites any edit to the copy.";
const leg = { leg_id: "s1", text: LEG_TEXT, claims: [{ strand: "L1", proposition: C1 }] };
const POINTS = ["The installer writes into the consumer's tree.", "The next run overwrites any edit to the copy."];
// The Leg as loadBrief hands it to the renderer: its paragraphs beside it.
const PARAS = planEntry("s1", POINTS.map((p, i) => [{ point: `PW-${i + 1}-1 ${p}`, cast: {} }]), ENTRIES(2), [null, JOIN]).paragraphs;
const withParas = (l, paragraphs = PARAS) => ({ ...l, paragraphs });
const text = briefRecordText({
  slug: "packet-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
  thesis: "The fixture claim.", reader_path: [legRecord(leg)],
  strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {},
});
const brief = readBrief(text, "theses/packet-brief/brief.yaml");
const render = async (templateText) => {
  const l = withParas(brief.legs[0]);
  const rp = templateText === undefined ? renderPacket : await renderPacketWith(templateText);
  return rp({ brief, leg: l, priorSections: [],
    section: sectionOfLeg(brief.legs).get(l.leg_id), sections: sectionsOf(brief.legs) });
};
const flat = (s) => String(s).replace(/\s+/g, " ");
const PLAN_HEAD = [
  "This block is a plan.",
  "It is not a draft of the paragraph.",
  "Each sentence in it only says what is meant.",
  "None of its wording is kept.",
  "You choose every word of the paragraph.",
  "One thing keeps one name through the whole paragraph.",
];
const planBlock = (packet) => {
  const i = packet.indexOf("## The plan of this paragraph\n");
  const end = packet.indexOf("## The claims this Leg asserts", i);
  return i === -1 || end === -1 ? null : packet.slice(i, end);
};

const template = readFileSync(WRITER_PROMPT_FILE, "utf8");
const r = await render();
if (r.error) fails.push(`(a) the fixture Packet did not render: ${r.error}`);
else {
  // (a) no Point, no Serves, no Opens from, no Cast; the plan block's fixed sentences.
  for (const pw of PARAS.flatMap((p) => p.paragraph_waypoints.map((w) => w.point))) {
    if (r.packet.includes(pw)) fails.push(`(a) the Packet carries the planned point ${JSON.stringify(pw)}`);
  }
  for (const label of ["*Serves:*", "*Opens from:*", "*Cast:*", "waypoint"]) {
    if (r.packet.includes(label)) fails.push(`(a) the Packet carries ${JSON.stringify(label)}`);
  }
  const block = planBlock(r.packet);
  if (block === null) fails.push("(a) the Packet carries no plan block before the claims block");
  else {
    const lines = block.split("\n");
    for (const want of PLAN_HEAD) if (!lines.includes(want)) fails.push(`(a) the plan block does not carry ${JSON.stringify(want)}`);
  }
}

// (b) two plans differing only in their Points render one Packet.
{
  const other = PARAS.map((p, i) => ({
    ...p,
    ...(i === 1 ? { join: "contrast" } : {}),
    paragraph_waypoints: [
      { point: `OTHER-${i + 1}-1 an added point.`, cast: {} },
      { point: `OTHER-${i + 1} a different point.`, cast: { terse: true }, forced_by: ["CAST"] },
    ],
  }));
  const l = withParas(brief.legs[0], other);
  const r2 = renderPacket({ brief, leg: l, priorSections: [],
    section: sectionOfLeg(brief.legs).get(l.leg_id), sections: sectionsOf(brief.legs) });
  if (r2.error || r.error) fails.push(`(b) a Packet did not render: ${r2.error || r.error}`);
  else if (r2.packet !== r.packet) {
    let k = 0;
    while (r2.packet[k] === r.packet[k]) k++;
    fails.push(`(b) two plans differing only in their Points render two Packets, apart at byte ${k}: ${JSON.stringify(r2.packet.slice(k, k + 80))}`);
  }
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
    ],
    higher_order: [{ id: "lost", name: "lost", relates: ["writes", "overwrites"], holds: "An edit to {kit} in {tree} is lost." }],
  };
  const ARGS = ["The installer writes the kit into the consumer's tree.", "The next run overwrites an edit to the kit in the consumer's tree."];
  const CENTRAL = "An edit to the kit in the consumer's tree is lost.";
  const sBrief = { ...brief, record: { ...brief.record, structure: STRUCTURE } };
  const renderLeg = (extra) => {
    const l = withParas({ ...brief.legs[0], ...extra });
    return renderPacket({ brief: sBrief, leg: l, priorSections: [],
      section: sectionOfLeg(brief.legs).get(l.leg_id), sections: sectionsOf(brief.legs) });
  };
  const said = [...ARGS.map((a, k) => `- Argument ${k + 1}. ${a}`), `- CentralClaim. ${CENTRAL}`];
  const plain = renderLeg({ relation: "lost" });
  if (plain.error) fails.push(`(c) the Packet with a structure did not render: ${plain.error}`);
  else {
    const lines = (planBlock(plain.packet) || "").split("\n");
    for (const want of said) if (!lines.includes(want)) fails.push(`(c) the plan block does not carry ${JSON.stringify(want)}`);
    if (lines.includes("### The parts of the paragraph, in order")) fails.push("(c) a Leg with no segments renders a parts list");
    if (lines.includes("The claims below are the whole plan of this paragraph.")) fails.push("(c) a Leg with a structure says the claims are the whole plan");
  }
  const parted = renderLeg({ relation: "lost", segments: [
    { bind: 1, discourse_relation: null },
    { bind: null, discourse_relation: { sense: "elaboration", to: [1] } },
    { bind: 2, discourse_relation: { sense: "contrast", to: [1, 2] } },
    { bind: 3 },
  ] });
  if (parted.error) fails.push(`(c) the Packet with segments did not render: ${parted.error}`);
  else {
    const lines = (planBlock(parted.packet) || "").split("\n");
    const parts = ["1. Argument 1.", "2. Neither. Sense elaboration, to part 1.", "3. Argument 2. Sense contrast, to part 1, part 2.", "4. CentralClaim."];
    const at = lines.indexOf("### The parts of the paragraph, in order");
    if (at === -1) fails.push("(c) a Leg with segments renders no parts list");
    for (const want of [...said, ...parts]) if (!lines.includes(want)) fails.push(`(c) the plan block does not carry ${JSON.stringify(want)}`);
    if (at !== -1 && lines.indexOf(parts[0]) < at) fails.push("(c) the parts do not stand under the parts heading");
  }
  if (!r.error) {
    const lines = (planBlock(r.packet) || "").split("\n");
    if (!lines.includes("The claims below are the whole plan of this paragraph.")) fails.push("(c) a Brief with no structure does not say the claims are the whole plan");
    if (lines.some((x) => x.startsWith("- Argument ") || x.startsWith("- CentralClaim."))) fails.push("(c) a Brief with no structure lists an Argument or a CentralClaim");
  }
}

// (k) the renderer refuses a template whose criterion line breaks the bound, naming the line (kogaki#1555).
{
  const table = JSON.parse(readFileSync("src/draft-workflow.json", "utf8"));
  const wordsMax = table.criteria?.words_max;
  if (!Number.isInteger(wordsMax)) fails.push("(k) src/draft-workflow.json declares no integer `criteria.words_max`");
  const shippedFails = templateCriteriaFailures(template);
  if (shippedFails.length) fails.push(`(k) the shipped template fails the criteria bound: ${shippedFails.join("; ")}`);
  // The shipped template carries no criterion line since kogaki#1859, so each fixture adds one.
  const target = "- NO CLAIM: The sentence that performs it states no proposition.";
  const pad = Array.from({ length: Math.max(0, (wordsMax || 0) - target.slice(2).split(/\s+/).length) }, () => "really").join(" ");
  for (const [label, broken] of [
    [`over words_max`, target.replace(" states no proposition.", ` states ${pad} no proposition.`)],
    ["carrying `; `", target.replace(" proposition.", " proposition; it adds no cause.")],
    ["carrying `: `", target.replace(" proposition.", " proposition: no cause either.")],
    ["carrying ` -- `", target.replace(" proposition.", " proposition -- and no cause.")]]) {
    const fixture = template.replace("## The claims this Leg asserts", `${broken}\n\n## The claims this Leg asserts`);
    if (fixture === template) { fails.push(`(k) the fixture could not write the criterion line ${label}`); continue; }
    const line = fixture.split("\n").indexOf(broken) + 1;
    const b = (await renderPacketWith(fixture))({ brief, leg: withParas(brief.legs[0]), priorSections: [],
      section: sectionOfLeg(brief.legs).get(brief.legs[0].leg_id), sections: sectionsOf(brief.legs) });
    if (!b.error) fails.push(`(k) the template whose criterion line is ${label} rendered a Packet`);
    else if (!b.error.includes(`line ${line} \`${broken}\``)) fails.push(`(k) the refusal for the criterion line ${label} does not name the line: ${b.error}`);
  }
}

// (l) no Segment field reaches the Packet: the plan written from manner-bearing Waypoints
// holds none, its Packet renders the lines with no Manner label, and a manner written back is refused.
{
  const root = mkdtempSync(join(tmpdir(), "draft-packet-segment-"));
  const MANNER = "a brief direct statement, given with no elaboration.";
  const dir = join(root, "theses", "packet-brief");
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, text);
  const planPath = join(dir, "paragraph-plan.yaml");
  const planText = paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText: text,
    legs: [planEntry("s1", [[{ point: "PW-1-1 the copy is written.", manner: MANNER, cast: {} }, { point: "PW-1-2 the installer writes the copy.", manner: MANNER, cast: {} }],
      [{ point: "PW-2-1 the next run overwrites the edit.", cast: {} }]], ENTRIES(2), [null, JOIN])] }));
  writeFileSync(planPath, planText);
  if (/\bmanner\b/.test(planText) || planText.includes(MANNER)) fails.push(`(l) the ParagraphPlan written from manner-bearing Waypoints carries a manner: ${planText}`);
  const resolveIn = (ws) => spawnSync(process.execPath, ["src/draft.mjs", "resolve", "--brief", briefPath, "--workspace", join(root, ws)],
    { encoding: "utf8", timeout: 120000 });
  const ok = resolveIn("ws");
  const packetPath = join(root, "ws", "packet-brief", "packets", "s1.md");
  if (ok.status !== 0 || !existsSync(packetPath)) fails.push(`(l) resolve did not render the Packet from the plan: ${(ok.stderr || ok.stdout || "").slice(0, 400)}`);
  else {
    const packet = readFileSync(packetPath, "utf8");
    if (planBlock(packet) === null) fails.push("(l) the Packet carries no plan block, so the absence below reads nothing");
    for (const bad of ["Manner:", MANNER, "PW-1-1", "PW-1-2"]) {
      if (packet.includes(bad)) fails.push(`(l) the Packet rendered from the plan carries ${JSON.stringify(bad)}`);
    }
  }
  writeFileSync(planPath, planText.replace("- point: PW-1-2 the installer writes the copy.\n", `- point: PW-1-2 the installer writes the copy.\n            manner: ${MANNER}\n`));
  if (!readFileSync(planPath, "utf8").includes(`manner: ${MANNER}`)) fails.push("(l) the fixture could not write the manner back onto the plan file");
  else {
    const back = resolveIn("ws-back");
    if (back.status === 0 || !(back.stderr || "").includes("Waypoint 2 carries `manner`")) {
      fails.push(`(l) resolve did not refuse a plan file carrying a manner on a Waypoint, naming it: ${(back.stderr || back.stdout || "").slice(0, 400)}`);
    }
  }
}

// (m) THE PACKET CARRIES NOTHING OF THE PARAGRAPH'S SCHEMA (kogaki#1639): a plan whose every
// entry carries the bound Move's id, `materials`, `purpose`, `depends_on`, `rationale`
// and `re-activate` renders a Packet with no `move`, `rationale` or `depends_on`
// text and none of their values; and a plan missing a field, or writing `reader_state_before` or
// `reader_state_after` (retired, kogaki#1701) or `introduces` (retired, kogaki#1841), is refused
// by /draft naming the Leg and the Waypoint.
{
  const root = mkdtempSync(join(tmpdir(), "draft-packet-schema-"));
  const dir = join(root, "theses", "packet-brief");
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, text);
  const planPath = join(dir, "paragraph-plan.yaml");
  const plan = (entries) => paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText: text,
    legs: [planEntry("s1", [[{ point: "PW-1-1 the installer writes the copy.", cast: {} }],
      [{ point: "PW-2-1 the next run overwrites the edit.", cast: {} }]], entries, [null, JOIN])] }));
  const resolveIn = (ws) => spawnSync(process.execPath, ["src/draft.mjs", "resolve", "--brief", briefPath, "--workspace", join(root, ws)],
    { encoding: "utf8", timeout: 120000 });
  const full = plan(ENTRIES(2));
  writeFileSync(planPath, full);
  for (const k of ["move", "materials", "purpose", "depends_on", "rationale", "re-activate"]) {
    if (!new RegExp(`^ +${k}:`, "m").test(full)) fails.push(`(m) the plan written carries no \`${k}\` on its Leg or its paragraphs`);
  }
  const ok = resolveIn("ws");
  const packetPath = join(root, "ws", "packet-brief", "packets", "s1.md");
  if (ok.status !== 0 || !existsSync(packetPath)) fails.push(`(m) resolve did not render the Packet from the schema-bearing plan: ${(ok.stderr || ok.stdout || "").slice(0, 400)}`);
  else {
    const packet = readFileSync(packetPath, "utf8");
    if (planBlock(packet) === null) fails.push("(m) the Packet carries no plan block, so the absence below reads nothing");
    for (const word of ["move", "reader_state_after", "rationale", "depends_on", "reader_state_before", "re-activate", "materials"]) {
      if (new RegExp(`(^|[^A-Za-z_])${word}([^A-Za-z_]|$)`).test(packet)) fails.push(`(m) the Packet carries the field name \`${word}\``);
    }
    for (const value of ["PURPOSE-", "RATIONALE-", "answer_a_posed_question"]) {
      if (packet.includes(value)) fails.push(`(m) the Packet carries a plan entry's ${value} value`);
    }
  }
  const dropped = ENTRIES(2).map((e, i) => (i === 1 ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== "rationale")) : e));
  writeFileSync(planPath, plan(dropped));
  const missing = resolveIn("ws-missing");
  if (missing.status === 0 || !(missing.stderr || "").includes("leg s1") || !(missing.stderr || "").includes("paragraph 2") || !(missing.stderr || "").includes("carries no `rationale`")) {
    fails.push(`(m) resolve did not refuse a plan paragraph missing its rationale naming the Leg and the paragraph: ${(missing.stderr || missing.stdout || "").slice(0, 400)}`);
  }
  for (const [key, body, why] of [["reader_state_before", "\n$1  knowledge: written.", "kogaki#1701"], ["reader_state_after", "\n$1  knowledge: written.", "kogaki#1701"], ["introduces", " []", "kogaki#1768, kogaki#1841"]]) {
    const injected = plan(ENTRIES(2)).replace(/^( +)materials:/m, `$1${key}:${body}\n$1materials:`);
    if (!injected.includes(`${key}:`)) fails.push(`(m) the fixture could not write ${key} onto the plan file`);
    writeFileSync(planPath, injected);
    const derived = resolveIn(`ws-${key}`);
    if (derived.status === 0 || !(derived.stderr || "").includes("paragraph 1") || !(derived.stderr || "").includes(`carries \`${key}\`, retired from the ParagraphPlan (${why})`)) {
      fails.push(`(m) resolve did not refuse a written ${key} by name naming the paragraph: ${(derived.stderr || derived.stdout || "").slice(0, 400)}`);
    }
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
    const old = renderPacket({ brief: voiced, leg: withParas(voiced.legs[0]), priorSections: [],
      section: sectionOfLeg(voiced.legs).get(voiced.legs[0].leg_id), sections: sectionsOf(voiced.legs) });
    if (old.error) fails.push(`(f) the pre-kogaki#1488 Packet did not render: ${old.error}`);
    else if (carriesNoVoiceRule(old.packet) === null) fails.push("(f) the pre-kogaki#1488 Voice paragraph passed the predicate (f) applies");
  }
}

// (h) the precedence paragraph stands before the register, and an Audience edit does not remove it (kogaki#1493).
const PRECEDENCE_HEAD = "**What the register below governs.**";
const precedence = (packet, firstRule) => {
  const w = writeBlock(packet);
  if (w === null) return { error: "the Packet carries no Write block" };
  const i = w.indexOf(PRECEDENCE_HEAD);
  if (i === -1) return { error: `the Write block carries no "${PRECEDENCE_HEAD}" paragraph` };
  const end = w.indexOf("\n\n", i);
  const para = w.slice(i, end === -1 ? undefined : end);
  if (!flat(para).includes("the plan holds and the rule yields")) return { error: `the precedence paragraph does not carry "the plan holds and the rule yields": ${flat(para)}` };
  const at = w.indexOf(firstRule);
  if (at === -1) return { error: `the Write block does not carry the register's first rule ${JSON.stringify(firstRule)}` };
  if (at < i + para.length) return { error: `the register's first rule ${JSON.stringify(firstRule)} does not follow the precedence paragraph` };
  return { para };
};
let shipped = null;
if (!r.error) {
  const p = precedence(r.packet, "**Sentences:**");
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
    const o = renderPacket({ brief: other, leg: withParas(other.legs[0]), priorSections: [],
      section: sectionOfLeg(other.legs).get(other.legs[0].leg_id), sections: sectionsOf(other.legs) });
    if (o.error) fails.push(`(h) the one-sentence Audience's Packet did not render: ${o.error}`);
    else {
      const p = precedence(o.packet, UNRELATED);
      if (p.error) fails.push(`(h) one-sentence Audience: ${p.error}`);
      else if (shipped !== null && p.para !== shipped) fails.push(`(h) the precedence paragraph changed with the Audience: ${flat(p.para)}`);
      if (writeBlock(o.packet)?.includes("**Sentences:**")) fails.push("(h) the one-sentence Audience's Packet still carries the dev-to-zenn register");
    }
  }
}

// (i) A LEG INTRODUCES NO TERM (kogaki#1768): a Leg binds no Move and carries no `introduces`, so a
// Brief whose Leg carries one is refused naming the field, and the ledgerless fixture Leg renders a
// Packet whose crossing block carries no term line.
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
    : renderPacket({ brief: gBrief, leg: withParas(gBrief.legs[0]), priorSections: [],
      section: sectionOfLeg(gBrief.legs).get(gBrief.legs[0].leg_id), sections: sectionsOf(gBrief.legs) });
  if (g.error) fails.push(`(i) the fixture Packet with no introduced term did not render: ${g.error}`);
  else if (g.packet.includes(`- ${TERM.term} — `)) fails.push("(i) the crossing block carries a term line from no `introduces`");
}

// (j) no Obligation row reaches the Packet (kogaki#1584), and the Packet asks for no sentence the plan does not carry (kogaki#1496).
{
  const ROW = "the reader is owed why the copy is overwritten";
  const RECOVERABLE = "Each claim above must be recoverable from what you write";
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
  const jRender = async (templateText) => {
    const rp = templateText === undefined ? renderPacket : await renderPacketWith(templateText);
    return rp({ brief: jBrief, leg: withParas(jBrief.legs[0]), priorSections: [],
      section: sectionOfLeg(jBrief.legs).get(jBrief.legs[0].leg_id), sections: sectionsOf(jBrief.legs) });
  };
  // THE PREDICATE the shipped render and the counterfactuals share.
  const asksNoUnplannedSentence = (packet) => {
    for (const bad of [RETIRED_HEADING, "*Promise:*", "*Keeps:*", ROW]) {
      if (packet.includes(bad)) return `the Packet carries "${bad}"`;
    }
    const w = writeBlock(packet);
    if (w === null) return "the Packet carries no Write block";
    if (!flat(w).includes(RECOVERABLE)) return `the Write block does not carry "${RECOVERABLE}"`;
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
      const restored = j.packet.replace("## The article so far", `${RETIRED_HEADING}\n\n- ${ROW}\n\n## The article so far`);
      if (restored === j.packet) fails.push("(j) the fixture could not put the retired Obligations block back");
      else if (asksNoUnplannedSentence(restored) === null) fails.push("(j) the Packet with the retired Obligations block passed the predicate (j) applies");
    }
    const before = template
      .replace("## The article so far", "Honor the rows below in the prose rather than restating them as fields.\n\n## The article so far")
      .replace(/\*\*The round trip — claims only\.\*\*[\s\S]*?\n\n/, "**The round trip — claims only.** Each claim above must be recoverable from\n"
        + "what you write. Where making one plain loses something, either restore the\nloss or **concede it explicitly in the prose**. "
        + "A concession is part of the\noutput; a silent omission is not a simplification, it is a loss.\n\n");
    if (!before.includes("Honor the rows") || !before.includes("concede it explicitly")) fails.push("(j) the fixture could not rebuild the pre-kogaki#1496 template");
    else {
      const old = await jRender(before);
      if (old.error) fails.push(`(j) the pre-kogaki#1496 Packet did not render: ${old.error}`);
      else if (asksNoUnplannedSentence(old.packet) === null) fails.push("(j) the pre-kogaki#1496 template passed the predicate (j) applies");
    }
  }
}

// (o) a cast key outside the set is refused (kogaki#1695).
{
  const root = mkdtempSync(join(tmpdir(), "draft-packet-cast-"));
  const dir = join(root, "theses", "packet-brief");
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, text);
  const planPath = join(dir, "paragraph-plan.yaml");
  const plan = (cast) => paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText: text,
    legs: [planEntry("s1", [[{ point: "PW-1-1 the installer writes the copy.", cast }],
      [{ point: "PW-2-1 the next run overwrites the edit.", cast: {} }]], ENTRIES(2), [null, JOIN])] }));
  const resolveIn = (ws) => spawnSync(process.execPath, ["src/draft.mjs", "resolve", "--brief", briefPath, "--workspace", join(root, ws)],
    { encoding: "utf8", timeout: 120000 });
  writeFileSync(planPath, plan({ brief: true }));
  const outside = resolveIn("ws-brief");
  if (outside.status === 0 || !(outside.stderr || "").includes("cast key `brief`")) {
    fails.push(`(o) resolve did not refuse \`cast: { brief: true }\` naming \`brief\`: ${(outside.stderr || outside.stdout || "").slice(0, 400)}`);
  }
}

// (p) a plan with a Mapping Record still hands the Writer no point and no `holds` in the table's expressions (kogaki#1859).
{
  const root = mkdtempSync(join(tmpdir(), "draft-packet-mapped-"));
  const dir = join(root, "theses", "packet-brief");
  mkdirSync(dir, { recursive: true });
  const briefPath = join(dir, "brief.yaml");
  writeFileSync(briefPath, text);
  const planPath = join(dir, "paragraph-plan.yaml");
  const structure = { roles: [{ id: "net", context: "A fixed catch laid before anything arrives.", attributes: [] },
    { id: "sizes", context: "The kinds it was made to hold.", attributes: [] }],
  relations: [{ id: "woven", between: ["net", "sizes"], holds: "{net} was woven against {sizes} alone." }],
  higher_order: { relates: ["woven"], holds: "what {net} holds stops at {sizes}." } };
  const table = (expressions) => ({ move: MOVE, base: { domain: "a river weir" },
    correspondences: Object.entries(expressions).map(([role, expression]) => ({ role, expression })) });
  const FULL = { net: "the staked net", sizes: "the fish sizes its mesh fits" };
  const resolveWith = (ws, entries) => {
    const mapping = writeMappingRecord(mappingDirFor(planPath), entries);
    writeFileSync(planPath, paragraphPlanRecordText(paragraphPlanRecord({ briefPath, briefText: text, mapping,
      legs: [planEntry("s1", [[{ point: "PW-1-1 the staked net holds the fish.", cast: {} }],
        [{ point: "PW-2-1 the net lets the rest pass.", cast: {} }]], ENTRIES(2), [null, JOIN])] })));
    return spawnSync(process.execPath, ["src/draft.mjs", "resolve", "--brief", briefPath, "--workspace", join(root, ws)], { encoding: "utf8", timeout: 120000 });
  };
  const ok = resolveWith("ws", [{ leg_id: "s1", structure, table: table(FULL) }]);
  const packetPath = join(root, "ws", "packet-brief", "packets", "s1.md");
  if (ok.status !== 0 || !existsSync(packetPath)) fails.push(`(p) resolve did not render the Packet from a plan with a Mapping Record: ${(ok.stderr || ok.stdout || "").slice(0, 400)}`);
  else {
    const packet = readFileSync(packetPath, "utf8");
    for (const pt of [LEG_TEXT, "the staked net", "PW-1-1", "PW-2-1"]) if (packet.includes(pt)) fails.push(`(p) the Packet carries the Leg's text, an expression or a planned point ${JSON.stringify(pt)}`);
  }
}

removeTrees();
if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-draft-packet — the rendered Packet carries no planned point, no Serves, Opens-from or Cast line, and its plan block opens with its six fixed sentences; two plans differing only in their Points render one Packet byte for byte; the plan block lists the Arguments and the CentralClaim legSentences gives for the Leg's relation, one part per Segment where the Leg carries segments, and says the claims are the whole plan where the Brief carries no structure (kogaki#1859); the Write block carries its register with no voice rule and no hedge, and the pre-kogaki#1488 Voice paragraph is refused (kogaki#1488); the precedence paragraph saying the plan holds and the rule yields stands before the register's first rule, unchanged under an Audience whose register is one unrelated sentence (kogaki#1493); a Leg introduces no term (kogaki#1768); no Obligation row reaches the Packet and the pre-kogaki#1496 wording is refused (kogaki#1584, kogaki#1496); the shipped Writer prompt passes the criteria bound, and a criterion line at words_max words or carrying `; `, `: ` or ` -- ` refuses at render naming the line (kogaki#1555); a plan written from manner-bearing Waypoints holds no manner and a plan file carrying one is refused at resolve (kogaki#1585); a plan carrying the paragraph's schema renders none of it, and a missing or retired field is refused at resolve (kogaki#1639); a cast key outside the set is refused (kogaki#1695); a plan with a Mapping Record renders no expression and no point (kogaki#1735, kogaki#1859).");
JS
