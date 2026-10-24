#!/usr/bin/env bash
# check-review-draft — /review-draft reads each paragraph's opening sentence
# against the Packet's Opens-from line, and an opening that narrates its
# connection fails naming its paragraph (kogaki#1447, kogaki#1477).
#
# THE DEFECT THIS HOLDS: on 2026-10-19 paragraph 2 of the attack-defense Proof
# Sheet run opened on its plan's join rendered nearly whole, and no review item
# read the opening against the line: the Packet's "it is not copied" was the
# only guard, and nothing checked it. The item `opens-from-copied`
# (src/review-items.json) is that check, judged and best-effort. Since
# kogaki#1477 the line is one relation word, and the item asks whether the
# opening NARRATES the connection as a proposition -- says something was left
# open, is owed, or is now taken up -- instead of marking it.
#
# WHAT THIS COVERS, driven through `buildJoin` (src/review-draft.mjs) over a
# fixture Draft whose trace names a Packet rendered by `renderPacket`
# (src/draft.mjs) from a fixture Brief record, the second Leg Waypoint carrying
# the join `consequence`, and whose paragraph 2 opens by narrating it:
#   (a) the item owes exactly ONE pair for the Leg -- paragraph 2's, the one
#       paragraph after the first that carries an Opens-from line -- and the
#       join Packet rendered for it carries the line, named as paragraph 2's,
#       on the declared side and paragraph 2's own first sentence on the
#       reverse side;
#   (b) the item's question asks whether the opening narrates the connection
#       as a proposition, and a `fails` verdict on the narrating opening fails
#       the item's row, best-effort, the row's evidence naming paragraph 2 by
#       the declared entry -- the Harness's naming, not the judge's sentence;
#   (c) a paragraph 2 opening on a bare connective is paired the same way and
#       a `holds` verdict holds its row with no evidence (the control that
#       stops (b) passing on any verdict);
#   (d) a Packet whose Leg Waypoints carry no join owes no pair and holds by
#       the item's stated absence.
# AND THE `performs` AND `promise-kept` ITEMS (kogaki#1556), each one pair per
# italic or `*Keeps:*` line of the waypoints block, the passage as reverse side:
#   (e) a performing sentence adding "is worth defining in its own right" fails
#       `performs` under a `fails` verdict, the evidence naming paragraph 1;
#   (f) the sentence reduced to the operation holds with no evidence;
#   (g) a Draft never stating the promised item fails `promise-kept`, the
#       evidence naming the promise;
#   (h) a Leg with neither line holds on both by `when_declared_absent`.
#
# NOT COVERED, stated rather than implied: whether a LIVE judge answers
# `fails` on a copied opening is the model's judgment, never asserted here;
# the fixture supplies the verdict. The Packet's own Opens-from paragraph is
# checks/check-draft-packet.sh's.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const fails = [];
const repo = resolve(".");
const { legRecord, briefRecordText, readerStateMap } = await import(pathToFileURL(join(repo, "src", "compose.mjs")).href);
const { readBrief, renderPacket, splitPacketTemplate, sectionsOf, sectionOfLeg } = await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);
const { readDraft, readItems, buildJoin } = await import(pathToFileURL(join(repo, "src", "review-draft.mjs")).href);
const sha = (s) => createHash("sha256").update(s).digest("hex");
const root = mkdtempSync(join(tmpdir(), "review-draft-"));

const C1 = "the installer copies the kit into the consumer's tree.";
const JOIN = "consequence";
// Paragraph 2's two openings (kogaki#1477): one narrating the connection as a proposition of
// its own, one marking it with a bare connective on the way to the paragraph's own point.
const NARRATED = "What the first write left open is now taken up: the second run replaces the copy wholesale, edits included.";
const CONNECTIVE = "So the second run replaces the copy wholesale, edits included.";
const PARA1 = "The installer copies the kit into the consumer's tree. It writes every file it ships.";
const PARA2_OWN = "The second run replaces the copy wholesale, edits included.";
const brief = readBrief(briefRecordText({
  slug: "review-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
  thesis: "The fixture claim.", reader_start: readerStateMap("knowledge: The reader believes the fixture claim is obvious."),
  reader_target: "s1",
  reader_path: [legRecord({ leg_id: "s1", move: "a_leg_move", purpose: "purpose of s1", reader_state_after: "knowledge: after s1.",
    materials: ["L1"], depends_on: [], rationale: "rationale for s1.", claims: [{ strand: "L1", proposition: C1 }],
    waypoints: [{ point: "The installer writes into the consumer's tree.", serves: ["L1"] },
      { point: "The next run overwrites any edit to the copy.", serves: ["L1"] }] })],
  strand_coverage: [], journey_coverage: [], obligations: [], tradeoffs: {}, bridged: {},
}), "theses/review-brief/brief.yaml");
const template = splitPacketTemplate(readFileSync("src/packet-template.md", "utf8")).packet;
const packetFor = (join_) => {
  const l = { ...brief.legs[0], waypoints: brief.legs[0].waypoints.map((w, i) => (i === 1 && join_ ? { ...w, join: join_ } : w)) };
  const r = renderPacket({ template, brief, leg: l, priorSections: [], section: sectionOfLeg(brief.legs).get("s1"), sections: sectionsOf(brief.legs) });
  if (r.error) fails.push(`fixture: the Packet did not render: ${r.error}`);
  return r.packet || "";
};

// A Draft of one Leg, two paragraphs, its trace naming the Packet by path and sha.
const fixture = (name, packet, para2, para1 = PARA1) => {
  const dir = join(root, name);
  mkdirSync(join(dir, "packets"), { recursive: true });
  writeFileSync(join(dir, "packets", "s1.md"), packet);
  const body = ["## The fixture Section", "", para1, "", para2];
  const fmHead = ["---", "brief: theses/review-brief/brief.yaml", "trace:"];
  // The body starts two lines after the closing `---`; the Leg is the two paragraphs.
  const first = fmHead.length + 1 + 1 + 1 + 2 + 1;
  const entry = { leg_id: "s1", section: 1, section_title: "The fixture Section", lines: [first, first + 2],
    packet: "packets/s1.md", packet_sha: sha(packet) };
  const text = [...fmHead, `  - ${JSON.stringify(entry)}`, "---", "", ...body, ""].join("\n");
  writeFileSync(join(dir, "draft.md"), text);
  const draft = readDraft(join(dir, "draft.md"));
  const prose = draft.lines.slice(entry.lines[0] - 1, entry.lines[1]).join("\n");
  if (!prose.startsWith(para1) || !prose.endsWith(para2)) fails.push(`fixture ${name}: the trace's range does not hold the two paragraphs: ${JSON.stringify(prose)}`);
  const outline = join(dir, "outline-s1.json");
  writeFileSync(outline, "{}");
  return { dir, draft, run: { legs: [{ leg_id: "s1" }], outlineFields: { s1: outline }, verdicts: {} } };
};

const table = readItems();
const item = table.items.find((i) => i.id === "opens-from-copied");
if (!item) fails.push("(a) src/review-items.json declares no `opens-from-copied` item");
else {
  if (item.class !== "best-effort" || item.mode === "mechanical") fails.push(`(a) the item is not judged and best-effort: class ${item.class}, mode ${item.mode}`);
  const only = { ...table, items: [item] };
  const narrated = fixture("narrated", packetFor(JOIN), NARRATED);
  const first = buildJoin(narrated.draft, narrated.run, only, narrated.dir, { pass: 1 });

  // (a) one pair, paragraph 2's, with the line and the sentence on their sides.
  if (first.owed.length !== 1) fails.push(`(a) the item owes ${first.owed.length} pair(s) for a Leg with one Opens-from line, not one`);
  else {
    const pkt = readFileSync(first.owed[0].packet, "utf8");
    if (!pkt.includes(`paragraph 2 opens from: ${JOIN}`)) fails.push("(a) the join Packet's declared side does not carry the Opens-from line named as paragraph 2's");
    if (!pkt.includes(`paragraph 2 of the passage opens on this sentence: ${NARRATED}`)) fails.push("(a) the join Packet's reverse side is not paragraph 2's own first sentence");
    if (pkt.includes(`opens on this sentence: ${PARA1.split(". ")[0]}`)) fails.push("(a) the join Packet pairs paragraph 1, which carries no Opens-from line");
  }

  // (b) the question asks about narration, and a `fails` verdict on the narrating opening fails
  // the row with evidence naming paragraph 2.
  if (!item.question.includes("narrate the connection as a proposition")) fails.push("(b) the item's question does not ask whether the opening narrates the connection as a proposition (kogaki#1477)");
  const key = first.owed[0] && first.owed[0].key;
  narrated.run.verdicts = { [key]: { verdict: "fails", reason: "the opening says what was left open is now taken up.", model: "fixture" } };
  const failed = buildJoin(narrated.draft, narrated.run, only, narrated.dir, { pass: 1 });
  const row = failed.results.find((r) => r.item === "opens-from-copied");
  if (!row || row.verdict !== "fails" || row.class !== "best-effort") fails.push(`(b) a fails verdict did not fail the best-effort row: ${JSON.stringify(row)}`);
  else if (!(row.evidence || []).some((e) => String(e).startsWith("paragraph 2 opens from:"))) fails.push(`(b) the failing row's evidence does not name paragraph 2: ${JSON.stringify(row.evidence)}`);

  // (c) the control: an opening on a bare connective is paired the same way, and `holds` holds
  // it with no evidence.
  const marked = fixture("connective", packetFor(JOIN), CONNECTIVE);
  const owedC = buildJoin(marked.draft, marked.run, only, marked.dir, { pass: 1 });
  const keyC = owedC.owed[0] && owedC.owed[0].key;
  if (!keyC || !readFileSync(owedC.owed[0].packet, "utf8").includes(`opens on this sentence: ${CONNECTIVE}`)) {
    fails.push("(c) the bare-connective opening is not paired against its Opens-from line");
  }
  marked.run.verdicts = { [keyC]: { verdict: "holds", reason: "the relation is marked by a connective on the way to the point.", model: "fixture" } };
  const held = buildJoin(marked.draft, marked.run, only, marked.dir, { pass: 1 });
  const hrow = held.results.find((r) => r.item === "opens-from-copied");
  if (!hrow || hrow.verdict !== "holds" || hrow.evidence) fails.push(`(c) a holds verdict did not hold the row without evidence: ${JSON.stringify(hrow)}`);

  // (d) no join, no pair: the stated absence.
  const none = fixture("no-join", packetFor(null), PARA2_OWN);
  const nj = buildJoin(none.draft, none.run, only, none.dir, { pass: 1 });
  const nrow = nj.results.find((r) => r.item === "opens-from-copied");
  if (nj.owed.length !== 0 || !nrow || nrow.verdict !== "holds" || nrow.reason !== item.when_declared_absent.sentence) {
    fails.push(`(d) a Packet with no Opens-from line did not hold by the stated absence: owed ${nj.owed.length}, ${JSON.stringify(nrow)}`);
  }
}

// (e)-(h) THE PERFORMS AND PROMISE-KEPT ITEMS (kogaki#1556), over a Packet whose first Leg
// Waypoint carries one `performs` Paragraph Waypoint and whose second keeps one Brief promise.
const OPERATION = "announce that a definition follows";
const PROMISE = "why the second run replaces edits made to the copy";
const packetWith = ({ performs = false, keeps = false } = {}) => {
  const l = { ...brief.legs[0], waypoints: brief.legs[0].waypoints.map((w, i) => ({ ...w,
    paragraph_waypoints: [{ point: w.point, serves: w.serves },
      ...(i === 0 && performs ? [{ performs: OPERATION }] : [])],
    ...(i === 1 && keeps ? { discharges: [{ obligation: 1, by: 1, row: { kind: "question", text: PROMISE } }] } : {}) })) };
  const r = renderPacket({ template, brief, leg: l, priorSections: [], section: sectionOfLeg(brief.legs).get("s1"), sections: sectionsOf(brief.legs) });
  if (r.error) fails.push(`fixture: the Packet did not render: ${r.error}`);
  return r.packet || "";
};
const ADDS = "The installer copies the kit into the consumer's tree. The copy, defined next, is worth defining in its own right.";
const BARE = "The installer copies the kit into the consumer's tree. The copy is defined next.";
const rowOf = (out, id) => out.results.find((r) => r.item === id);
const judge = (fx, only, verdict, reason) => {
  const owed = buildJoin(fx.draft, fx.run, only, fx.dir, { pass: 1 });
  fx.run.verdicts = Object.fromEntries(owed.owed.map((o) => [o.key, { verdict, reason, model: "fixture" }]));
  return { owed, judged: buildJoin(fx.draft, fx.run, only, fx.dir, { pass: 1 }) };
};
const performs = table.items.find((i) => i.id === "performs");
const kept = table.items.find((i) => i.id === "promise-kept");
if (!performs || !kept) fails.push("(e) src/review-items.json declares no `performs` or no `promise-kept` item");
else {
  const onlyP = { ...table, items: [performs] };
  const onlyK = { ...table, items: [kept] };
  // (e) a performing sentence adding to its operation: one pair, the italic line on the declared
  // side, and a fails verdict fails the row with evidence naming the paragraph.
  const adds = judge(fixture("performs-adds", packetWith({ performs: true }), PARA2_OWN, ADDS), onlyP,
    "fails", "the sentence adds that the copy is worth defining in its own right.");
  if (adds.owed.owed.length !== 1) fails.push(`(e) the performs item owes ${adds.owed.owed.length} pair(s) for one italic line, not one`);
  else if (!readFileSync(adds.owed.owed[0].packet, "utf8").includes(`paragraph 1 performs: ${OPERATION}`)) fails.push("(e) the performs Packet's declared side does not carry the italic line named as paragraph 1's");
  const prow = rowOf(adds.judged, "performs");
  if (!prow || prow.verdict !== "fails" || !(prow.evidence || []).some((e) => String(e).startsWith("paragraph 1 performs:"))) fails.push(`(e) a fails verdict did not fail the performs row naming paragraph 1: ${JSON.stringify(prow)}`);
  // (f) the control: the sentence reduced to the operation holds with no evidence.
  const bare = judge(fixture("performs-bare", packetWith({ performs: true }), PARA2_OWN, BARE), onlyP,
    "holds", "the sentence announces the definition and adds nothing.");
  const brow = rowOf(bare.judged, "performs");
  if (bare.owed.owed.length !== 1 || !brow || brow.verdict !== "holds" || brow.evidence) fails.push(`(f) the bare performing sentence did not hold without evidence: ${JSON.stringify(brow)}`);
  // (g) a Draft never stating the promised item fails promise-kept naming the promise.
  const unkept = judge(fixture("promise-unkept", packetWith({ keeps: true }), PARA2_OWN), onlyK,
    "fails", "the passage never says why the second run replaces edits.");
  if (unkept.owed.owed.length !== 1 || !readFileSync(unkept.owed.owed[0].packet, "utf8").includes(`paragraph 2 keeps: ${PROMISE}`)) fails.push("(g) the promise-kept item does not owe one pair carrying the Keeps line named as paragraph 2's");
  const krow = rowOf(unkept.judged, "promise-kept");
  if (!krow || krow.verdict !== "fails" || !(krow.evidence || []).some((e) => String(e).includes(PROMISE))) fails.push(`(g) a fails verdict did not fail the promise-kept row naming the promise: ${JSON.stringify(krow)}`);
  // (h) a Leg with neither line holds on both by the stated absence, owing no pair.
  for (const it of [performs, kept]) {
    const fx = fixture(`neither-${it.id}`, packetWith(), PARA2_OWN);
    const out = buildJoin(fx.draft, fx.run, { ...table, items: [it] }, fx.dir, { pass: 1 });
    const r = rowOf(out, it.id);
    if (out.owed.length !== 0 || !r || r.verdict !== "holds" || r.reason !== it.when_declared_absent.sentence) fails.push(`(h) a Leg with neither line did not hold \`${it.id}\` by the stated absence: owed ${out.owed.length}, ${JSON.stringify(r)}`);
  }
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-review-draft — the judged best-effort item opens-from-copied owes one pair per paragraph carrying an Opens-from line, pairing the line, named by its paragraph, with that paragraph's own first sentence; it asks whether the opening narrates the connection as a proposition, a fails verdict on a narrating opening fails the row with evidence naming the paragraph, an opening on a bare connective holds under a holds verdict, and a Packet with no Opens-from line holds by the stated absence (kogaki#1447, kogaki#1477); the performs and promise-kept items owe one pair per italic or Keeps line, fail naming the paragraph or the promise, hold the bare performing sentence, and hold by the stated absence on a Leg carrying neither line (kogaki#1556).");
JS
