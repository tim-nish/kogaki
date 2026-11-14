// (j) of checks/check-review-draft.sh (kogaki#1842): the retired `defined-term-order` item.
// A Draft whose Brief classes `copy` `defined`, and whose one Leg's prose uses it, is
// reviewed by every mechanical item of src/review-items.json; no row is the item's.
// In its own file because that check's heredoc is at its baseline in .heredoc-known-blocks.json.
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { readDraft, readItems, buildJoin } from "../../../src/review-draft.mjs";

const dir = mkdtempSync(join(tmpdir(), "review-draft-defined-term-"));
const packet = "# Packet\n";
writeFileSync(join(dir, "s1.md"), packet);
const brief = [
  "reader_path:",
  "  - leg_id: s1",
  "    text: The copy is replaced.",
  "defined_terms:",
  "  - term: copy",
  "    class: defined",
  "",
];
writeFileSync(join(dir, "brief.yaml"), brief.join("\n"));
const entry = {
  leg_id: "s1",
  section: 1,
  section_title: "S",
  lines: [8, 8],
  packet: "s1.md",
  packet_sha: createHash("sha256").update(packet).digest("hex"),
};
const text = [
  "---",
  "brief: brief.yaml",
  "trace:",
  `  - ${JSON.stringify(entry)}`,
  "---",
  "",
  "## S",
  "The second run replaces the copy wholesale.",
  "",
];
writeFileSync(join(dir, "draft.md"), text.join("\n"));

const table = readItems();
const only = { ...table, items: table.items.filter((i) => i.id === "defined-term-order" || i.mode === "mechanical") };
const run = { legs: [{ leg_id: "s1" }], outlineFields: { s1: join(dir, "outline.json") }, verdicts: {} };
writeFileSync(run.outlineFields.s1, "{}");
const out = buildJoin(readDraft(join(dir, "draft.md")), run, only, dir, { pass: 1 });
const rows = out.results.filter((r) => r.item === "defined-term-order");
if (table.items.some((i) => i.id === "defined-term-order") || rows.length) {
  console.log(
    `FAIL: (j) the retired defined-term-order item still reviews a Draft using a defined term: ${JSON.stringify(rows)}`,
  );
  process.exit(1);
}
