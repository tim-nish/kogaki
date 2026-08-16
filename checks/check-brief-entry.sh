#!/usr/bin/env bash
# check-brief-entry — the Brief entry point's four contract properties
# (SPEC-draft-pipeline §5.3, v7, kogaki#482, story 1.71).
#
# Seam-free: every case runs against the committed terrain survey fixture
# (checks/fixtures/terrain/cotags/lone-tag-member.json, display ids L1-L5)
# in a temporary briefs dir. The composed document is asserted through the
# exported composer AND through the command path, so a wiring break between
# them fails here rather than shipping.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, mkdtempSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { composeBrief, resolveStrandIds } from "./brief/brief.mjs";

const SURVEY = "checks/fixtures/terrain/cotags/lone-tag-member.json";
const record = JSON.parse(readFileSync(SURVEY, "utf8"));
const fails = [];
const dir = mkdtempSync(join(tmpdir(), "brief-entry-"));
const run = (ids, slug) => spawnSync(process.execPath,
  ["brief/brief.mjs", "start", "--survey", SURVEY, "--ids", ids,
   "--slug", slug, "--briefs-dir", dir], { encoding: "utf8" });

try {
  // (a) THE MINT: the document carries the reader-facing definition, the
  // resolved Strands with cites, and EVERY §5.1 field as a typed unfilled
  // slot — presence asserted per field, because an absent field and a field
  // awaiting composition are different silences (§5.3).
  const r1 = run("L2,L1", "case-a");
  if (r1.status !== 0) fails.push(`(a) mint exited ${r1.status}: ${(r1.stderr || "").trim()}`);
  const doc = existsSync(join(dir, "case-a", "brief.md"))
    ? readFileSync(join(dir, "case-a", "brief.md"), "utf8") : "";
  if (!/A \*\*brief\*\* is the working plan/.test(doc)) fails.push("(a) the reader-facing definition of 'brief' is absent — coining an owner-facing term obliges a definition in the same act");
  if (!/### L2 — alpha/.test(doc) || !/### L1 — bravo/.test(doc)) fails.push("(a) a resolved Strand heading is absent");
  if (!new RegExp("cite: `gloss/").test(doc)) fails.push("(a) a Strand renders no cite");
  for (const h of ["Reader start", "Reader target", "Opening question", "Thesis",
                   "Sequence", "Strand coverage", "Unresolved obligations",
                   "Thesis closure", "Tradeoffs"]) {
    const re = new RegExp(`## ${h}\\n\\n\\*\\(awaiting composition\\)\\*`);
    if (!re.test(doc)) fails.push(`(a) §5.1 field ${JSON.stringify(h)} is not present as a typed unfilled slot`);
  }
  if (!/CLOSED at mint/.test(doc)) fails.push("(a) the closed-set line is absent — the invariant binds from the mint");
  if (!doc.includes(record.pin)) fails.push("(a) the survey pin is absent from the document");
  // The command path and the exported composer agree — a wiring break
  // between them is the drift this dual assertion exists to catch.
  const { strands } = resolveStrandIds(record, ["L2", "L1"]);
  if (composeBrief({ slug: "case-a", pin: record.pin, strands }) !== doc) {
    fails.push("(a) the command's document differs from the exported composer's — two producers");
  }

  // (b) UNKNOWN ID: refused naming BOTH sides, never a silent drop.
  const r2 = run("L1,L99", "case-b");
  if (r2.status === 0) fails.push("(b) an unknown display id was accepted");
  if (!/L99/.test(r2.stderr) || !/record holds: L1, L2, L3, L4, L5/.test(r2.stderr)) {
    fails.push(`(b) the refusal does not name both sides: ${JSON.stringify((r2.stderr || "").slice(0, 160))}`);
  }
  if (existsSync(join(dir, "case-b"))) fails.push("(b) a refusal left a partial home behind");

  // (c) G-ID: refused BY NAME as a per-report-identity token.
  const r3 = run("G1-1", "case-c");
  if (r3.status === 0) fails.push("(c) a Group/SubGroup id was accepted");
  if (!/per-REPORT-IDENTITY/.test(r3.stderr) || !/L<n>/.test(r3.stderr)) {
    fails.push(`(c) the refusal does not name the token class and the right unit: ${JSON.stringify((r3.stderr || "").slice(0, 160))}`);
  }

  // (d) COLLISION: a creator, never an editor.
  const r4 = run("L3", "case-a");
  if (r4.status === 0) fails.push("(d) an existing slug was overwritten");
  if (!/already exists/.test(r4.stderr) || !/never\s+overwrites/.test(r4.stderr)) {
    fails.push(`(d) the refusal does not state the creator-never-editor rule: ${JSON.stringify((r4.stderr || "").slice(0, 160))}`);
  }
  const after = readFileSync(join(dir, "case-a", "brief.md"), "utf8");
  if (after !== doc) fails.push("(d) the collision refusal MUTATED the existing Brief");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL brief entry point (SPEC-draft-pipeline §5.3, story 1.71):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief entry: 4/4 cases — (a) the mint carries the definition, the resolved "
  + "Strands, the pin, the closed-set line and every §5.1 field as a typed unfilled slot, "
  + "with the command path byte-equal to the exported composer; (b) an unknown id refuses "
  + "naming both sides and leaves no partial home; (c) a G-id refuses by name pointing at "
  + "L<n>; (d) a slug collision refuses without mutating the existing Brief. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.71): dropping one FIELDS row "
  + "failed (a)'s per-field slot assertion in one run; restored, green. NOT COVERED, "
  + "stated rather than implied: the skill's hand-over conduct is a relay property no "
  + "check can run (the same standing SPEC-terrain §14.4's prohibitions have).");
JS
