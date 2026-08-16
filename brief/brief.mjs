#!/usr/bin/env node
// brief — the Brief entry point (SPEC-draft-pipeline §5.3, v7, kogaki#482,
// story 1.71).
//
// A CREATOR, NEVER AN EDITOR. `start` takes the settled Strand set as
// LessonDisplayIDs — SPEC-terrain §14.3's join key, and NOTHING else — plus
// the survey record that assigned them, and mints `briefs/<slug>/brief.md`:
// the §5.1 structure with every composition field a TYPED UNFILLED SLOT,
// opened by the reader-facing definition of "brief" (coining an owner-facing
// term obliges a reader-facing definition in the same act —
// consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:132).
//
// OUTSIDE TERRAIN, by the 2026-08-09 boundary correction: Terrain ends at
// Strand exploration and this runtime never surveys, widens, or fetches a
// set — it receives one the owner settled. The closed-set invariant binds
// from the mint: growing the set is an owner act routing back through
// Terrain, never a Brief fetch (topics/articles.md:13 at the same pin).
//
// THE THESIS IS NEVER INVENTED HERE (§3's read-not-invented rule applied to
// the minting act): composition determines it from the settled set, so the
// mint carries it as a slot.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function fail(msg) {
  process.stderr.write(`brief: ${msg}\n`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) args[key] = true;
      else { args[key] = next; i++; }
    } else if (!args._cmd) args._cmd = a;
  }
  return args;
}

// The §5.1 fields, every one present as a TYPED UNFILLED SLOT — an absent
// field and a field awaiting composition are different silences, and only
// the second lets a later sitting resume (§5.3). Order is §5.1's own.
const SLOT = "*(awaiting composition)*";
const FIELDS = [
  ["Reader start", "reader_start — where the reader is before the article."],
  ["Reader target", "reader_target — where the article leaves them."],
  ["Opening question", "opening_question."],
  ["Thesis", "thesis — determined by composition from the settled Strands; read, never invented at entry (§3)."],
  ["Sequence", "sequence — the ordered steps of §4.1."],
  ["Strand coverage", "strand_coverage — per selected Strand: used_by_steps and role_in_thesis. The count check runs AFTER composition (§3's completeness rider)."],
  ["Unresolved obligations", "unresolved_obligations — the §5.2 ledger: authored judgments, recorded where their consumer reads them."],
  ["Thesis closure", "thesis_closure — explanation and established_by_steps."],
  ["Tradeoffs", "tradeoffs."],
];

// Exported and pure over its inputs, so the check exercises the composed
// document without a filesystem.
export function composeBrief({ slug, pin, strands }) {
  const L = [];
  const say = (s = "") => L.push(s);
  say(`# Brief — ${slug}`);
  say();
  // The reader-facing definition, in the act that uses the term (§5.3).
  say("> A **brief** is the working plan for one article: the served");
  say("> material (Strands) the owner settled on, and the composition");
  say("> fields — thesis, sequence, coverage, obligations — filled in as");
  say("> composition proceeds. It is the durable document a drafting");
  say("> sitting resumes from.");
  say();
  say(`*Survey pin:* \`${pin}\``);
  say("*Strand set: CLOSED at mint — growing it is an owner act that routes back through Terrain, never a Brief fetch (SPEC-draft-pipeline §5.3).*");
  say();
  say("## Strands");
  say();
  for (const s of strands) {
    say(`### ${s.display_id} — ${s.slug}`);
    say();
    say(`- cite: \`${s.cite ?? "none recorded"}\``);
    if (s.journey) say("- carries a Journey");
    say();
  }
  for (const [heading, meaning] of FIELDS) {
    say(`## ${heading}`);
    say();
    say(`${SLOT}`);
    say();
    say(`*${meaning}*`);
    say();
  }
  return L.join("\n") + "\n";
}

// Resolve the entered ids against the survey record. Refusals are the
// contract's own (§5.3): an unknown id names BOTH sides, never a silent
// drop; a Group/SubGroup id is refused BY NAME as a per-report-identity
// token. Exported for the check's refusal cases.
export function resolveStrandIds(record, entered) {
  const gids = entered.filter((x) => /^G[0-9]+(-[0-9]+)?$/.test(x));
  if (gids.length) {
    return { error:
      `${gids.join(", ")}: Group/SubGroup ids are per-REPORT-IDENTITY tokens `
      + "(SPEC-terrain §12.1) — they name a grouping, not the settled set, and "
      + "a pin advance renumbers them. Enter the LessonDisplayIDs (L<n>) that "
      + "stand in the report's member headings beside the grouping you "
      + "navigated by (SPEC-draft-pipeline §5.3)." };
  }
  const bad = entered.filter((x) => !/^L[0-9]+$/.test(x));
  if (bad.length) {
    return { error:
      `${bad.join(", ")}: not a LessonDisplayID. The input unit is L<n> and `
      + "nothing else (SPEC-draft-pipeline §5.3; SPEC-terrain §14.3)." };
  }
  const byDid = new Map((record.candidates || [])
    .filter((c) => c.display_id).map((c) => [c.display_id, c]));
  const missing = entered.filter((x) => !byDid.has(x));
  if (missing.length) {
    const held = [...byDid.keys()].sort(
      (a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    return { error:
      `${missing.join(", ")}: the survey record carries no such display id. `
      + `Entered: ${entered.join(", ")}. The record holds: `
      + `${held.join(", ") || "no display ids (the record predates §14.3)"}. `
      + "Nothing was dropped silently (§3's completeness rider at entry)." };
  }
  // Dedup preserving the entered order — the set is the unit, and a repeat
  // is not an error the owner should be stopped for.
  const seen = new Set();
  const strands = [];
  for (const id of entered) {
    if (seen.has(id)) continue;
    seen.add(id);
    strands.push(byDid.get(id));
  }
  return { strands };
}

function cmdStart(args) {
  const record = JSON.parse(readFileSync(
    String(args.survey || fail("start needs --survey <survey record>")), "utf8"));
  const entered = String(args.ids || fail(
    "start needs --ids <L1,L2,...> — the settled Strand set as "
    + "LessonDisplayIDs (SPEC-draft-pipeline §5.3)"))
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (!entered.length) fail("--ids was empty. A Brief needs at least one settled Strand.");
  const slug = String(args.slug || fail(
    "start needs --slug <name> — owner-chosen, ordinary vocabulary, never a "
    + "machine identity (SPEC-draft-pipeline §5.3)"));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    fail(`slug ${JSON.stringify(slug)} — use lowercase words joined by hyphens; `
      + "the slug names a directory the owner enumerates.");
  }

  const r = resolveStrandIds(record, entered);
  if (r.error) fail(r.error);

  const briefsDir = resolve(String(args["briefs-dir"] || "briefs"));
  const home = join(briefsDir, slug);
  // IDEMPOTENCE IS BY SLUG, AND A COLLISION REFUSES (§5.3): a Brief is owner
  // state from the moment it exists, and this runtime is a creator, never an
  // editor.
  if (existsSync(home)) {
    fail(`briefs/${slug}/ already exists. The entry point creates and never `
      + "overwrites — resume that Brief by opening its document, or choose "
      + "another slug (SPEC-draft-pipeline §5.3).");
  }
  mkdirSync(home, { recursive: true });
  const out = join(home, "brief.md");
  writeFileSync(out, composeBrief({ slug, pin: record.pin, strands: r.strands }));
  console.log(`Brief minted — READ THIS ONE (owner document, SPEC-draft-pipeline §5.3): ${out}`);
  console.log(`Strands: ${r.strands.map((s) => s.display_id).join(", ")} `
    + `(${r.strands.length} member(s), set closed at mint)`);
  console.log("Every composition field is present as a typed unfilled slot — the next sitting resumes from the document.");
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "start": cmdStart(args); break;
    default: fail("usage: brief.mjs start --survey <record> --ids <L1,L2,...> --slug <name> [--briefs-dir <dir>]");
  }
}
