#!/usr/bin/env bash
# check-review-draft — /review-draft reads no block the Packet no longer
# carries (kogaki#1859).
#
# THE DECISION THIS HOLDS (2026-11-18, kogaki#1859): no Point reaches the
# Writer, so the Packet carries no waypoints block, no Opens-from line and no
# italic operation line. The four review items that compared the prose with
# them -- `waypoints`, `attribute-leak`, `opens-from-copied` and `performs` --
# and the three `packet_blocks` entries they read -- `waypoints`, `opens_from`
# and `performs` -- leave src/review-items.json with them.
#
# WHAT THIS COVERS, driven through `buildJoin` (src/review-draft.mjs) over a
# fixture Draft whose trace names a Packet rendered by `renderPacket`
# (src/draft.mjs) from a fixture Brief record and its Leg's paragraphs, the
# second carrying the join `consequence` and the first a `performs` entry:
#   (a) src/review-items.json declares none of the four items and none of the
#       three blocks, and every block an item names is a block `packet_blocks`
#       declares;
#   (b) every item the table declares reads its declared side from the
#       rendered Packet without a Packet-gap refusal, and the Join rows name
#       none of the four items;
#   (g) the `promise-kept` item and its `keeps` block are retired with the
#       Packet line they read: src/review-items.json declares neither
#       (kogaki#1584);
#   (i) review.md's closing Forced paragraphs list reads `_None._` over a
#       Packet rendered from a plan whose Waypoint carries `forced_by`, since
#       the Packet carries no Point and so no mark (kogaki#1649, kogaki#1859).
# AND (j) the `defined-term-order` item is retired (kogaki#1842): a Draft whose
#   Brief classes a term `defined` and whose prose uses it is reviewed with no
#   `defined-term-order` row, by checks/fixtures/review-draft/defined-term-order.mjs.
#
# NOT COVERED, stated rather than implied: what a LIVE judge answers on any
# remaining item is the model's judgment, never asserted here.
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
const { readBrief, renderPacket, sectionsOf, sectionOfLeg } = await import(pathToFileURL(join(repo, "src", "draft.mjs")).href);
const { readDraft, readItems, buildJoin } = await import(pathToFileURL(join(repo, "src", "review-draft.mjs")).href);
const { forcedParagraphLines } = await import(pathToFileURL(join(repo, "src", "review-draft", "close.mjs")).href);
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
// The Leg says its relation's `holds` as its `text`, and its paragraphs are the ParagraphPlan's
// (kogaki#1775, kogaki#1777): the Packet renders one numbered line per paragraph.
const LEG_TEXT = "The installer writes into the consumer's tree, and the next run overwrites any edit to the copy.";
const POINTS = ["The installer writes into the consumer's tree.", "The next run overwrites any edit to the copy."];
const brief = readBrief(briefRecordText({
  slug: "review-brief", compose_path: "audiences/dev-to-zenn.md",
  strands: [{ id: "L1", slug: "first-strand", cite: `coding::lesson/first-strand@${"0".repeat(64)}` }],
  thesis: "The fixture claim.", reader_path: [legRecord({ leg_id: "s1", text: LEG_TEXT, claims: [{ strand: "L1", proposition: C1 }] })],
  strand_coverage: [], journey_coverage: [], tradeoffs: {}, bridged: {},
}), "theses/review-brief/brief.yaml");
const packetFor = (join_) => {
  const l = { ...brief.legs[0], paragraphs: POINTS.map((point, i) => ({ materials: ["L1"], ...(i === 1 && join_ ? { join: join_ } : {}),
    paragraph_waypoints: [{ point, serves: ["L1"], cast: {} }] })) };
  const r = renderPacket({ brief, leg: l, priorSections: [], section: sectionOfLeg(brief.legs).get("s1"), sections: sectionsOf(brief.legs) });
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
const GONE_ITEMS = ["waypoints", "attribute-leak", "opens-from-copied", "performs"];
const GONE_BLOCKS = ["waypoints", "opens_from", "performs"];
// (a) the four items and the three blocks are gone, and every named block is declared.
for (const id of GONE_ITEMS) if (table.items.some((i) => i.id === id)) fails.push(`(a) src/review-items.json still declares the item \`${id}\``);
for (const b of GONE_BLOCKS) if (Object.hasOwn(table.packet_blocks || {}, b)) fails.push(`(a) src/review-items.json still declares the Packet block \`${b}\``);
for (const it of table.items) {
  for (const b of [it.declared_block, ...(it.also_declared_blocks || [])].filter(Boolean)) {
    if (!Object.hasOwn(table.packet_blocks || {}, b)) fails.push(`(a) the item \`${it.id}\` names the Packet block \`${b}\`, which \`packet_blocks\` does not declare`);
  }
}
if (table.items.some((i) => i.id === "promise-kept") || Object.hasOwn(table.packet_blocks || {}, "keeps")) {
  fails.push("(g) src/review-items.json still declares the retired `promise-kept` item or its `keeps` block");
}
// (b) the whole table over a Packet rendered from a plan carrying a join and a performs entry.
{
  const l = { ...brief.legs[0], paragraphs: POINTS.map((point, i) => ({ materials: ["L1"], ...(i === 1 ? { join: JOIN } : {}),
    paragraph_waypoints: [...(i === 0 ? [{ performs: "announce that a definition follows" }] : []), { point, serves: ["L1"], cast: {} }] })) };
  const r = renderPacket({ brief, leg: l, priorSections: [], section: sectionOfLeg(brief.legs).get("s1"), sections: sectionsOf(brief.legs) });
  if (r.error) fails.push(`(b) the fixture Packet did not render: ${r.error}`);
  else {
    const fx = fixture("whole-table", r.packet, PARA2_OWN);
    let out = null;
    try {
      out = buildJoin(fx.draft, fx.run, table, fx.dir, { pass: 1 });
    } catch (e) {
      fails.push(`(b) the Join over the whole table refused: ${e.message}`);
    }
    if (out) {
      if (!(out.results || []).length && !(out.owed || []).length) fails.push("(b) the Join over the whole table returned no row and owed no pair, so the absence below reads nothing");
      const named = [...(out.results || []).map((x) => x.item), ...(out.owed || []).map((x) => x.item)].filter((x) => GONE_ITEMS.includes(x));
      if (named.length) fails.push(`(b) the Join names a retired item: ${JSON.stringify(named)}`);
    }
  }
}

// (i) review.md's Forced paragraphs list reads `_None._`: the Packet carries no Point, so no mark (kogaki#1649, kogaki#1859).
{
  const leg = { ...brief.legs[0], paragraphs: POINTS.map((point, i) => ({ materials: ["L1"],
    paragraph_waypoints: [{ point, serves: ["L1"], ...(i === 0 ? { forced_by: ["PERFORMS IS BARE"] } : {}), cast: {} }] })) };
  const dir = join(root, "forced");
  mkdirSync(join(dir, "packets"), { recursive: true });
  const r = renderPacket({ brief, leg, priorSections: [], section: sectionOfLeg(brief.legs).get("s1"), sections: sectionsOf(brief.legs) });
  if (r.error) fails.push(`(i) the forced fixture Packet did not render: ${r.error}`);
  writeFileSync(join(dir, "packets", "forced.md"), r.packet || "");
  if (/forced/i.test(r.packet || "")) fails.push("(i) the Packet rendered from a forced Waypoint carries a mark");
  const none = forcedParagraphLines([{ leg_id: "s1", packet: "packets/forced.md" }], dir);
  if (!none.includes("_None._") || none.some((x) => x.startsWith("- "))) fails.push(`(i) a Packet with no mark lists a forced paragraph: ${JSON.stringify(none)}`);
}

if (fails.length) {
  for (const f of fails) console.log(`FAIL: ${f}`);
  process.exit(1);
}
console.log("ok: check-review-draft — src/review-items.json declares none of the waypoints, attribute-leak, opens-from-copied and performs items and none of the waypoints, opens_from and performs blocks, and every block an item names is declared; the whole table reads a Packet rendered from a plan carrying a join and a performs entry with no Packet-gap refusal and no retired row (kogaki#1859); the promise-kept item and its keeps block are retired (kogaki#1584); review.md's Forced paragraphs list reads _None._ over a Packet rendered from a forced Waypoint (kogaki#1649, kogaki#1859)");
JS
status=$?
node checks/fixtures/review-draft/defined-term-order.mjs || status=1
exit "$status"
