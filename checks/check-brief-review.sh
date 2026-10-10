#!/usr/bin/env bash
# check-brief-review — the path-review attach plumbing (SPEC-draft-pipeline
# §4.6; kogaki#490, story 1.74).
#
# THE PLUMBING, NEVER THE JUDGMENT. §4.6 clause 3 keeps every composition
# MUST un-linted, so this member asserts only what carries the judgment:
# that review reasoning attaches PER CANDIDATE, that an unreviewed
# Candidate cannot ride forward as if reviewed, and that a verdict-shaped
# output is unattachable. Whether the reasoning is any good is the human
# gate's question, deliberately unasked here.
#
# AND SINCE kogaki#1307, AN ATTACH COUNTS NOTHING. The revise pass — and the
# round bound, Arms and attach ledger kogaki#894 built for it — is gone, since no
# state of the Brief table ever ran it. Case (e) asserts the attach writes no
# ledger and refuses nothing on a second attach.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as reviewModule from "./src/review.mjs";
import { attachReview, REVIEW_AREAS } from "./src/review.mjs";

const fails = [];
const dir = mkdtempSync(join(tmpdir(), "brief-review-"));

// Each Candidate carries one open Closure row: since kogaki#1307 an open row is
// reasoning the owner reads at the gate, never a withdrawal, so case (e) checks
// it rides through untouched.
const cands = [
  { candidate_id: "cand-1", legs: ["s1", "s2"], obligations: [{ text: "the case's generality is open", introduced_by: "s1" }] },
  { candidate_id: "cand-2", legs: ["s2", "s1"], obligations: [{ text: "the case's generality is open", introduced_by: "s2" }] },
];
const entry = (tag = "") => Object.fromEntries(REVIEW_AREAS.map((a) => [a,
  `${tag}reasoning for ${a}: what was looked for and what was found, in prose the owner can weigh`]));
const review = { "cand-1": entry(), "cand-2": entry() };
const both = (tag) => ({ "cand-1": entry(tag), "cand-2": entry(tag) });

try {
  // (a) ATTACH PER CANDIDATE: reasoning rides each Candidate; both
  // candidates carry all areas.
  const r1 = attachReview(cands, review);
  if (r1.error) fails.push(`(a) a complete review was refused: ${r1.error}`);
  else {
    for (const c of r1.candidates) {
      for (const a of REVIEW_AREAS) {
        if (typeof c.review?.[a] !== "string") fails.push(`(a) ${c.candidate_id} does not carry ${a} — the reasoning must ride the Candidate into the gate (§4.6)`);
      }
    }
    if (r1.candidates.length !== 2) fails.push("(a) attach changed the candidate count");
  }

  // (b) REVIEW RUNS PER CANDIDATE: a Candidate with no review entry is
  // refused naming it — an unreviewed Candidate cannot ride forward as if
  // reviewed (kogaki#490's bound: the per-Candidate work is machine-side).
  const r2 = attachReview(cands, { "cand-1": entry() });
  if (!r2.error || !/cand-2/.test(r2.error) || !/PER CANDIDATE/.test(r2.error)) {
    fails.push(`(b) a candidate with no review entry was not refused by name: ${JSON.stringify(r2.error || "accepted")}`);
  }
  const r3 = attachReview(cands, { "cand-1": entry(), "cand-2": (() => { const e = entry(); delete e.arc_integrity; return e; })() });
  if (!r3.error || !/arc_integrity/.test(r3.error)) fails.push("(b) a review lacking an area was accepted — an absent area is an unapplied MUST");

  // (c) A VERDICT IS UNATTACHABLE: verdict-shaped keys refused by name;
  // non-string values refused as verdicts wearing a type.
  const rv = attachReview(cands, { "cand-1": { ...entry(), verdict: "pass" }, "cand-2": entry() });
  if (!rv.error || !/verdict/.test(rv.error) || !/never a verdict/.test(rv.error)) fails.push("(c) a verdict field was attachable — output is reasoning surfaced, never a verdict (§4.6)");
  const rb = attachReview(cands, { "cand-1": { ...entry(), rationale_stands: true }, "cand-2": entry() });
  if (!rb.error || !/wearing a type/.test(rb.error)) fails.push("(c) a boolean review value was attachable — a boolean is a verdict wearing a type");
  const rs = attachReview(cands, { "cand-1": { ...entry(), score: "9/10" }, "cand-2": entry() });
  if (!rs.error) fails.push("(c) a score field was attachable");

  // (d) COMMAND PATH agrees with the exported function, and the output file
  // carries the attached reasoning (the artifact the selection gate reads).
  const cf = join(dir, "cands.json"); const rf = join(dir, "review.json"); const of = join(dir, "reviewed.json");
  const attach = () => spawnSync(process.execPath,
    ["src/review.mjs", "attach", "--candidates", cf, "--review", rf, "--out", of], { encoding: "utf8", cwd: process.cwd() });
  writeFileSync(cf, JSON.stringify(cands)); writeFileSync(rf, JSON.stringify(review));
  const p = attach();
  if (p.status !== 0) fails.push(`(d) attach exited ${p.status}: ${(p.stderr || "").trim()}`);
  const disk = JSON.parse(readFileSync(of, "utf8"));
  if (JSON.stringify(disk.candidates) !== JSON.stringify(attachReview(cands, review).candidates)) {
    fails.push("(d) the command's output differs from the exported function's — two producers");
  }
  if (!/no verdict anywhere/.test(p.stdout || "")) fails.push("(d) the command does not state the no-verdict property in its own output");

  // (e) AN ATTACH WRITES NO LEDGER AND REFUSES NOTHING ON A SECOND ATTACH
  // (kogaki#1307). The revise pass's bound, Arms and ledger are gone: a second
  // and a third attach with DIFFERENT reasoning are accepted exactly as the
  // first, the command path leaves nothing in the directory but its own output,
  // and an open Closure row rides through with no withdrawal and no residue.
  const first = attachReview(cands, both("first "));
  const second = attachReview(cands, both("second "));
  const third = attachReview(cands, both("third "));
  if (first.error || second.error || third.error) {
    fails.push(`(e) a repeated attach was refused: ${first.error || second.error || third.error}`);
  } else {
    if ("attaches" in second) fails.push("(e) attachReview still returns an `attaches` count");
    for (const c of third.candidates) {
      if ("withdrawn" in c || "revise_residue" in c) fails.push(`(e) ${c.candidate_id} carries a withdrawal or residue — the revise pass is gone`);
      if (!Array.isArray(c.obligations) || c.obligations.length !== 1) fails.push(`(e) ${c.candidate_id}'s open Closure row did not ride through`);
    }
  }
  for (const gone of ["REVISE_BOUND", "MAX_ATTACHES", "REVISE_ARMS", "attachLedgerPath", "readAttachLedger", "writeAttachLedger", "ATTACH_LEDGER"]) {
    if (gone in reviewModule) fails.push(`(e) src/review.mjs still exports ${gone}`);
  }
  writeFileSync(rf, JSON.stringify(both("again ")));
  const p2 = attach();
  if (p2.status !== 0) fails.push(`(e) a second command attach was refused: ${(p2.stderr || "").trim()}`);
  const left = readdirSync(dir).filter((f) => !["cands.json", "review.json", "reviewed.json"].includes(f));
  if (left.length) fails.push(`(e) the command attach wrote something beside its output: ${left.join(", ")}`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// (i) the crossing-block `already-knows` item (kogaki#1282, owner ruling
// 2026-10-06): ReviewDraft's item table asks whether the passage relies on a
// term, claim or case that is neither in the Packet's one "What crosses into
// this Leg" block nor one of this Leg's own claims, and the retired
// "Held by the reader" and "Active here" blocks are named nowhere in the
// table.
{
  const items = JSON.parse(readFileSync("src/review-items.json", "utf8"));
  const it = (items.items || []).find((i) => i.id === "already-knows");
  if (!it) fails.push("(i) src/review-items.json carries no already-knows item");
  else {
    if (it.declared_block !== "crosses_here") fails.push(`(i) already-knows reads block ${JSON.stringify(it.declared_block)}, want crosses_here`);
    if (!(it.also_declared_blocks || []).includes("claims")) fails.push("(i) already-knows does not hand the judge this Leg's claims beside the crossing block");
    if (!/crosses into this Leg/.test(it.question)) fails.push(`(i) the already-knows question does not read against the crossing block: ${it.question}`);
    if (!/neither list/.test(it.question) || !/Answer `fails` if it does/.test(it.question)) fails.push(`(i) the already-knows question does not fail on reliance outside the crossing block and this Leg's claims: ${it.question}`);
    if (!/never fails/.test(it.question)) fails.push("(i) the question does not state that using crossed-in or self-claimed material holds");
    if (!it.when_declared_absent || it.when_declared_absent.verdict !== "holds") fails.push("(i) an empty crossing block does not hold mechanically");
  }
  const introItem = (items.items || []).find((i) => i.id === "introduces");
  if (!introItem || introItem.declared_block !== "crosses_here") fails.push(`(i) introduces reads block ${JSON.stringify(introItem && introItem.declared_block)}, want crosses_here`);
  const blocks = items.packet_blocks || {};
  const crosses = blocks.crosses_here;
  const template = readFileSync("src/packet-template.md", "utf8");
  if (!crosses || crosses.kind !== "heading_list" || !template.includes(`## ${crosses.heading}`)) fails.push(`(i) packet_blocks.crosses_here does not name a heading the template renders: ${JSON.stringify(crosses)}`);
  if (Object.prototype.hasOwnProperty.call(blocks, "held_by_reader") || Object.prototype.hasOwnProperty.call(blocks, "active_here") || Object.prototype.hasOwnProperty.call(blocks, "introduces")) {
    fails.push("(i) a retired block (held_by_reader, active_here or the standalone introduces block) survives in packet_blocks");
  }
}

// (j) THE FOUR NEW ReviewDraft ITEMS JOIN THE REAL CLI (kogaki#1247 cell 5):
// prose-style, attribute-leak, referents and unsupported-sentence each hold
// one Leg on which the recorded verdict is `fails` and one on which it is
// `holds` — driven through the real open/outline/compare commands, never
// through a second reader of src/review-items.json. The passage each Leg
// carries is written to LOOK like what its item is meant to catch or not,
// but no model runs here: the verdict below is a RECORDED declaration, and
// what this case proves is that the plumbing accepts and joins both tokens
// for all four rows, exactly as kogaki#1013's design states it must.
{
  const ws = mkdtempSync(join(tmpdir(), "review-draft-"));
  const draftPath = join(ws, "draft.md");

  // THE READER'S OWN WORLD JOINS EVERY PACKET (kogaki#1285): `referents` now
  // also declares `reader_own_world`, so a fixture Packet missing that
  // paragraph would make `declaredFor()` hard-fail the whole run — this is
  // joined beside the Journey block on every Leg below, never read by name.
  const packet = ({ claim, journey, ownWorld }) => [
    "## The waypoints this Leg takes the reader through",
    "",
    "- the reader is brought to see what the kit copies and where *Serves:* the Leg's claim",
    "",
    "## The claims this Leg asserts",
    "",
    `- ${claim}`,
    "",
    "## What crosses into this Leg",
    "",
    "(none)",
    "",
    "## The Journey material this Leg edits — NOT a claim to recover",
    "",
    journey,
    "",
    `**The reader's own world.** ${ownWorld}`,
    "",
  ].join("\n");

  const claimText = "the kit installer vendors a stamped copy of policy/kit into each consumer";
  const journeyText = "The kit's install script, and the one consumer repository it was first vendored into.";
  const ownWorldText = "Can read code and has used a CI system.";
  const packetA = packet({ claim: claimText, journey: journeyText, ownWorld: ownWorldText });
  const packetB = packet({ claim: claimText, journey: journeyText, ownWorld: ownWorldText });
  writeFileSync(join(ws, "packet-a.md"), packetA);
  writeFileSync(join(ws, "packet-b.md"), packetB);

  const legAProse = [
    "The kit installs. It copies. It stamps.",
    "Not staged, not reviewed: vendored straight in, by contrast, to overwrite whatever sat there before, which is the technique this Leg performs and the question it answers. The maintainer of the acme-widgets fork hit this first.",
  ];
  const legBProse = [
    "The installer copies policy/kit into the consumer's tree and stamps the copy with the version it came from.",
    "A later run of the installer repeats the copy and refreshes the stamp, so the vendored tree always names the kit version it was last drawn from.",
  ];
  const legALines = [7, 7 + legAProse.length - 1];
  const legBLines = [legALines[1] + 1, legALines[1] + legBProse.length];
  const shaA = createHash("sha256").update(packetA).digest("hex");
  const shaB = createHash("sha256").update(packetB).digest("hex");
  const fm = [
    "---",
    "trace:",
    `  - ${JSON.stringify({ leg_id: "leg-a", lines: legALines, packet: "packet-a.md", packet_sha: shaA })}`,
    `  - ${JSON.stringify({ leg_id: "leg-b", lines: legBLines, packet: "packet-b.md", packet_sha: shaB })}`,
    "---",
  ].join("\n");
  writeFileSync(draftPath, `${fm}\n\n${[...legAProse, ...legBProse].join("\n")}\n`);

  const runCmd = (cmd, extra, input) => spawnSync(process.execPath,
    ["src/review-draft.mjs", cmd, "--draft", draftPath, "--workspace", ws, ...extra],
    { encoding: "utf8", input: input ?? "" });
  const outlineFor = (legId) => "```leg\n"
    + `leg_id: ${legId}\n`
    + "purpose: walk the kit's install step\n"
    + "reader_state_before: the reader has never met the kit\n"
    + "reader_state_after: the reader can run the kit's installer\n"
    + `claim ${claimText}\n`
    + "waypoint the passage brings me to see what the kit does\n"
    + "```\n";

  const jOpen = runCmd("open", []);
  if (jOpen.status !== 0) fails.push(`(j) open exited ${jOpen.status}: ${(jOpen.stderr || "").trim()}`);
  const jO1 = runCmd("outline", ["--leg", "leg-a"], outlineFor("leg-a"));
  if (jO1.status !== 0) fails.push(`(j) outline leg-a exited ${jO1.status}: ${(jO1.stderr || "").trim()}`);
  const jO2 = runCmd("outline", ["--leg", "leg-b"], outlineFor("leg-b"));
  if (jO2.status !== 0) fails.push(`(j) outline leg-b exited ${jO2.status}: ${(jO2.stderr || "").trim()}`);

  const jRender = runCmd("compare", []);
  if (jRender.status !== 0) fails.push(`(j) compare (render) exited ${jRender.status}: ${(jRender.stderr || "").trim()}`);
  const jm = /join record: (.+)$/m.exec(jRender.stdout || "");
  if (!jm) fails.push(`(j) compare (render) named no join record: ${(jRender.stdout || "").trim()}`);
  else {
    const joinPath = jm[1].trim();
    const rendered = JSON.parse(readFileSync(joinPath, "utf8"));
    const failing = new Set(["prose-style", "attribute-leak", "referents", "unsupported-sentence"]);
    const reasonFor = (item, leg_id) => {
      if (!failing.has(item)) return "the two sides agree";
      const fail = leg_id === "leg-a";
      if (item === "prose-style") return fail ? "the passage runs short fragments one after another" : "the passage reads in full clauses with no fragment or triad";
      if (item === "attribute-leak") return fail ? "the sentence tells the reader what the passage is doing to them" : "no sentence quotes, paraphrases or announces a waypoint";
      if (item === "referents") return fail ? "the passage names a fork the Journey material does not carry" : "every named thing in the passage comes from the Journey material";
      return fail ? "a sentence supports neither its paragraph's opening sentence nor a claim" : "every sentence supports its paragraph's opening sentence or a claim";
    };
    const verdicts = (rendered.owed || []).map((o) => ({
      leg_id: o.leg_id, item: o.item, pair: o.pair,
      verdict: failing.has(o.item) && o.leg_id === "leg-a" ? "fails" : "holds",
      reason: reasonFor(o.item, o.leg_id),
      model: "fixture-judge",
    }));
    if (!verdicts.length) fails.push("(j) the render call owed no pair — the four new items never reached a join Packet");

    const jRecord = runCmd("compare", [], JSON.stringify({ verdicts }));
    if (jRecord.status !== 0) fails.push(`(j) compare (record) exited ${jRecord.status}: ${(jRecord.stderr || "").trim()}`);
    const jm2 = /join record: (.+)$/m.exec(jRecord.stdout || "");
    if (!jm2) fails.push(`(j) compare (record) named no join record: ${(jRecord.stdout || "").trim()}`);
    else {
      const joined = JSON.parse(readFileSync(jm2[1].trim(), "utf8"));
      if (!joined.complete) fails.push(`(j) the join did not complete: ${JSON.stringify(joined.owed)}`);
      for (const item of ["prose-style", "attribute-leak", "referents", "unsupported-sentence"]) {
        const a = (joined.results || []).find((r) => r.leg_id === "leg-a" && r.item === item);
        const b = (joined.results || []).find((r) => r.leg_id === "leg-b" && r.item === item);
        if (!a || a.verdict !== "fails") fails.push(`(j) ${item} on leg-a did not join as fails: ${JSON.stringify(a)}`);
        if (!b || b.verdict !== "holds") fails.push(`(j) ${item} on leg-b did not join as holds: ${JSON.stringify(b)}`);
      }
    }
  }
}

// (k) THE READER'S OWN WORLD GRANTS A REFERENT (kogaki#1285 acceptance): the
// declared side `referents` reads is now the Journey block AND the
// Harness-owned reader's-own-world line, so a passage naming a referent the
// Persona's prior_knowledge grants joins `holds` even though the Journey
// material never carries it, and a passage naming a referent neither source
// carries still joins `fails`. Driven through the real open/outline/compare
// CLI; the verdicts below are RECORDED declarations, not a model's, same as
// (j) — what this case proves is that the join Packet actually carries both
// blocks for the judge to read.
{
  const ws = mkdtempSync(join(tmpdir(), "review-draft-ownworld-"));
  const draftPath = join(ws, "draft.md");

  const claimText = "the kit installer vendors a stamped copy of policy/kit into each consumer";
  const journeyText = "The kit's install script, and the one consumer repository it was first vendored into.";
  const ownWorldText = "Can read code and has used a CI system.";

  const packet = [
    "## The waypoints this Leg takes the reader through",
    "",
    "- the reader is brought to see what referent the passage may name *Serves:* the Leg's claim",
    "",
    "## The claims this Leg asserts",
    "",
    `- ${claimText}`,
    "",
    "## What crosses into this Leg",
    "",
    "(none)",
    "",
    "## The Journey material this Leg edits — NOT a claim to recover",
    "",
    journeyText,
    "",
    `**The reader's own world.** ${ownWorldText}`,
    "",
  ].join("\n");
  writeFileSync(join(ws, "packet-granted.md"), packet);
  writeFileSync(join(ws, "packet-neither.md"), packet);

  // LEG-GRANTED: names a CI system, which the reader's own world carries —
  // the Journey material never mentions it, so this holds ONLY because the
  // declared side now reads reader_own_world beside the Journey block.
  const legGrantedProse = [
    "The installer copies policy/kit into the consumer's tree, the same way a CI system copies a build into its own workspace before running it.",
  ];
  // LEG-NEITHER: names a court, which neither the Journey material nor the
  // reader's own world carries.
  const legNeitherProse = [
    "The installer copies policy/kit into the consumer's tree, the way a court copies a filed brief into its own docket.",
  ];

  const sha = createHash("sha256").update(packet).digest("hex");
  const legGrantedLines = [7, 7 + legGrantedProse.length - 1];
  const legNeitherLines = [legGrantedLines[1] + 1, legGrantedLines[1] + legNeitherProse.length];
  const fm = [
    "---",
    "trace:",
    `  - ${JSON.stringify({ leg_id: "leg-granted", lines: legGrantedLines, packet: "packet-granted.md", packet_sha: sha })}`,
    `  - ${JSON.stringify({ leg_id: "leg-neither", lines: legNeitherLines, packet: "packet-neither.md", packet_sha: sha })}`,
    "---",
  ].join("\n");
  writeFileSync(draftPath, `${fm}\n\n${[...legGrantedProse, ...legNeitherProse].join("\n")}\n`);

  const runCmd = (cmd, extra, input) => spawnSync(process.execPath,
    ["src/review-draft.mjs", cmd, "--draft", draftPath, "--workspace", ws, ...extra],
    { encoding: "utf8", input: input ?? "" });
  const outlineFor = (legId) => "```leg\n"
    + `leg_id: ${legId}\n`
    + "purpose: walk the kit's install step\n"
    + "reader_state_before: the reader has never met the kit\n"
    + "reader_state_after: the reader can run the kit's installer\n"
    + `claim ${claimText}\n`
    + "waypoint the passage brings me to see what the kit does\n"
    + "```\n";

  const lOpen = runCmd("open", []);
  if (lOpen.status !== 0) fails.push(`(k) open exited ${lOpen.status}: ${(lOpen.stderr || "").trim()}`);
  const lO1 = runCmd("outline", ["--leg", "leg-granted"], outlineFor("leg-granted"));
  if (lO1.status !== 0) fails.push(`(k) outline leg-granted exited ${lO1.status}: ${(lO1.stderr || "").trim()}`);
  const lO2 = runCmd("outline", ["--leg", "leg-neither"], outlineFor("leg-neither"));
  if (lO2.status !== 0) fails.push(`(k) outline leg-neither exited ${lO2.status}: ${(lO2.stderr || "").trim()}`);

  const lRender = runCmd("compare", []);
  if (lRender.status !== 0) fails.push(`(k) compare (render) exited ${lRender.status}: ${(lRender.stderr || "").trim()}`);
  const lm = /join record: (.+)$/m.exec(lRender.stdout || "");
  if (!lm) fails.push(`(k) compare (render) named no join record: ${(lRender.stdout || "").trim()}`);
  else {
    const joinPath = lm[1].trim();
    const rendered = JSON.parse(readFileSync(joinPath, "utf8"));
    const owedReferents = (rendered.owed || []).filter((o) => o.item === "referents");
    if (!owedReferents.length) fails.push("(k) the render call owed no referents pair");
    // THE DECLARED SIDE CARRIES BOTH BLOCKS (kogaki#1285): the join Packet
    // put in front of the judge names the Journey material AND the reader's
    // own world, so a verdict here can be told the Persona grants the
    // referent rather than inferring it from the passage alone.
    for (const o of owedReferents) {
      const joinText = readFileSync(o.packet, "utf8");
      if (!joinText.includes(journeyText)) fails.push(`(k) ${o.leg_id}'s referents join Packet does not carry the Journey material`);
      if (!joinText.includes(ownWorldText)) fails.push(`(k) ${o.leg_id}'s referents join Packet does not carry the reader's own world`);
    }
    // EVERY OWED PAIR NEEDS A VERDICT TO COMPLETE THE JOIN — this fixture's
    // Legs also owe the other judged items (claims, prose-style, etc.); only
    // `referents` is this case's concern, so every other item just agrees.
    const verdicts = (rendered.owed || []).map((o) => (o.item === "referents" ? {
      leg_id: o.leg_id, item: o.item, pair: o.pair,
      verdict: o.leg_id === "leg-neither" ? "fails" : "holds",
      reason: o.leg_id === "leg-neither"
        ? "the passage names a court, which neither the Journey material nor the reader's own world carries"
        : "the passage names a CI system, which the reader's own world carries",
      model: "fixture-judge",
    } : {
      leg_id: o.leg_id, item: o.item, pair: o.pair,
      verdict: "holds",
      reason: "the two sides agree",
      model: "fixture-judge",
    }));

    const lRecord = runCmd("compare", [], JSON.stringify({ verdicts }));
    if (lRecord.status !== 0) fails.push(`(k) compare (record) exited ${lRecord.status}: ${(lRecord.stderr || "").trim()}`);
    const lm2 = /join record: (.+)$/m.exec(lRecord.stdout || "");
    if (!lm2) fails.push(`(k) compare (record) named no join record: ${(lRecord.stdout || "").trim()}`);
    else {
      const joined = JSON.parse(readFileSync(lm2[1].trim(), "utf8"));
      if (!joined.complete) fails.push(`(k) the join did not complete: ${JSON.stringify(joined.owed)}`);
      const granted = (joined.results || []).find((r) => r.leg_id === "leg-granted" && r.item === "referents");
      const neither = (joined.results || []).find((r) => r.leg_id === "leg-neither" && r.item === "referents");
      if (!granted || granted.verdict !== "holds") fails.push(`(k) referents on leg-granted did not join as holds: ${JSON.stringify(granted)}`);
      if (!neither || neither.verdict !== "fails") fails.push(`(k) referents on leg-neither did not join as fails: ${JSON.stringify(neither)}`);
    }
  }
  rmSync(ws, { recursive: true, force: true });
}

// (l) THE DEMONSTRATIVE REFERENCE ITEM (kogaki#1255 cell 4, kogaki#1322): a
// mechanical item read from the Draft alone, with no Packet block and no
// model call. One Leg carries "the last one" three paragraphs past the
// enumeration it would point at and joins `fails`, naming the line and the
// expression in the declared form; a second Leg carries the same expression
// one paragraph after its enumeration and joins `holds`. Three more Legs
// carry kogaki#1322's paragraph-opener cases: a paragraph opening "That left
// me holding" joins `fails` naming the line and the word; a paragraph
// opening "The fallback step left me holding" joins `holds`; a demonstrative
// in a paragraph's SECOND sentence, with its antecedent one paragraph back,
// still joins `holds` — the opener test never reaches past the first
// sentence. Driven through the real open/outline/compare CLI, never through
// a second reader of the item table.
{
  const ws = mkdtempSync(join(tmpdir(), "review-draft-demref-"));
  const draftPath = join(ws, "draft.md");

  const packet = [
    "## The waypoints this Leg takes the reader through",
    "",
    "- the reader is brought to see which install path a reader ends up on *Serves:* the Leg's claim",
    "",
    "## The claims this Leg asserts",
    "",
    "- the kit's install paths all land the same vendored copy",
    "",
    "## What crosses into this Leg",
    "",
    "(none)",
    "",
    "## The Journey material this Leg edits — NOT a claim to recover",
    "",
    "The kit's three install paths and the vendored copy they all produce.",
    "",
    "**The reader's own world.** Can read code and has used a CI system.",
    "",
  ].join("\n");
  writeFileSync(join(ws, "packet-x.md"), packet);
  writeFileSync(join(ws, "packet-y.md"), packet);

  // LEG-X: the enumeration sits in the Leg's first paragraph, and "the last
  // one" sits in its fourth — two paragraphs carrying neither a comma nor an
  // "and"/"or" run come between, so the one-paragraph lookback finds no
  // enumeration and the row fails.
  const legXProse = [
    "The kit installs through npm, through the shell script, or through the vendored copy already in the tree.",
    "",
    "Each path writes to a different place before the install finishes.",
    "",
    "The vendored copy skips the registry step entirely.",
    "",
    "The last one is the path the project's installer takes by default.",
  ];
  // LEG-Y: the enumeration sits in the paragraph immediately before the one
  // carrying "the last one", so the lookback finds it and the row holds.
  const legYProse = [
    "The kit renders Legs, Packets, and figures before emit.",
    "",
    "The last one is optional and is skipped when a Leg declares no figure.",
  ];
  // LEG-OPEN-FAIL (kogaki#1322): the paragraph opens on a demonstrative, with
  // no lookback at all — the row fails naming the line and the word.
  const legOpenFailProse = [
    "That left me holding the install log with nothing in it.",
  ];
  // LEG-OPEN-HOLD (kogaki#1322): the paragraph opens on a definite noun
  // phrase, not a demonstrative or a third-person pronoun — the row holds.
  const legOpenHoldProse = [
    "The fallback step left me holding the install log with nothing in it.",
  ];
  // LEG-OPEN-SECOND (kogaki#1322): the enumeration sits one paragraph back,
  // and the demonstrative sits in the CURRENT paragraph's second sentence —
  // the opener test never looks past a paragraph's first sentence, so the
  // row holds.
  const legOpenSecondProse = [
    "The kit installs through npm, through the shell script, or through the vendored copy already in the tree.",
    "",
    "Each path writes to a different place before the install finishes. That one is what ships by default.",
  ];

  const shaX = createHash("sha256").update(packet).digest("hex");
  const legXLines = [10, 10 + legXProse.length - 1];
  const legYLines = [legXLines[1] + 2, legXLines[1] + 1 + legYProse.length];
  const legOpenFailLines = [legYLines[1] + 2, legYLines[1] + 1 + legOpenFailProse.length];
  const legOpenHoldLines = [legOpenFailLines[1] + 2, legOpenFailLines[1] + 1 + legOpenHoldProse.length];
  const legOpenSecondLines = [legOpenHoldLines[1] + 2, legOpenHoldLines[1] + 1 + legOpenSecondProse.length];
  const fm = [
    "---",
    "trace:",
    `  - ${JSON.stringify({ leg_id: "leg-x", lines: legXLines, packet: "packet-x.md", packet_sha: shaX })}`,
    `  - ${JSON.stringify({ leg_id: "leg-y", lines: legYLines, packet: "packet-y.md", packet_sha: shaX })}`,
    `  - ${JSON.stringify({ leg_id: "leg-open-fail", lines: legOpenFailLines, packet: "packet-x.md", packet_sha: shaX })}`,
    `  - ${JSON.stringify({ leg_id: "leg-open-hold", lines: legOpenHoldLines, packet: "packet-x.md", packet_sha: shaX })}`,
    `  - ${JSON.stringify({ leg_id: "leg-open-second", lines: legOpenSecondLines, packet: "packet-x.md", packet_sha: shaX })}`,
    "---",
  ].join("\n");
  writeFileSync(draftPath, `${fm}\n\n${legXProse.join("\n")}\n\n${legYProse.join("\n")}\n\n`
    + `${legOpenFailProse.join("\n")}\n\n${legOpenHoldProse.join("\n")}\n\n${legOpenSecondProse.join("\n")}\n`);

  const runCmd = (cmd, extra, input) => spawnSync(process.execPath,
    ["src/review-draft.mjs", cmd, "--draft", draftPath, "--workspace", ws, ...extra],
    { encoding: "utf8", input: input ?? "" });
  const outlineFor = (legId) => "```leg\n"
    + `leg_id: ${legId}\n`
    + "purpose: walk the kit's install paths\n"
    + "reader_state_before: the reader has never met the kit\n"
    + "reader_state_after: the reader can name the kit's install paths\n"
    + "claim the kit's install paths all land the same vendored copy\n"
    + "waypoint the passage brings me to see what the kit does\n"
    + "```\n";

  const kOpen = runCmd("open", []);
  if (kOpen.status !== 0) fails.push(`(l) open exited ${kOpen.status}: ${(kOpen.stderr || "").trim()}`);
  const kO1 = runCmd("outline", ["--leg", "leg-x"], outlineFor("leg-x"));
  if (kO1.status !== 0) fails.push(`(l) outline leg-x exited ${kO1.status}: ${(kO1.stderr || "").trim()}`);
  const kO2 = runCmd("outline", ["--leg", "leg-y"], outlineFor("leg-y"));
  if (kO2.status !== 0) fails.push(`(l) outline leg-y exited ${kO2.status}: ${(kO2.stderr || "").trim()}`);
  const kO3 = runCmd("outline", ["--leg", "leg-open-fail"], outlineFor("leg-open-fail"));
  if (kO3.status !== 0) fails.push(`(l) outline leg-open-fail exited ${kO3.status}: ${(kO3.stderr || "").trim()}`);
  const kO4 = runCmd("outline", ["--leg", "leg-open-hold"], outlineFor("leg-open-hold"));
  if (kO4.status !== 0) fails.push(`(l) outline leg-open-hold exited ${kO4.status}: ${(kO4.stderr || "").trim()}`);
  const kO5 = runCmd("outline", ["--leg", "leg-open-second"], outlineFor("leg-open-second"));
  if (kO5.status !== 0) fails.push(`(l) outline leg-open-second exited ${kO5.status}: ${(kO5.stderr || "").trim()}`);

  const kCompare = runCmd("compare", []);
  const km = /join record: (.+)$/m.exec(kCompare.stdout || "");
  if (!km) fails.push(`(l) compare named no join record: ${(kCompare.stdout || "").trim()}`);
  else {
    const joined = JSON.parse(readFileSync(km[1].trim(), "utf8"));
    const x = (joined.results || []).find((r) => r.leg_id === "leg-x" && r.item === "demonstrative-reference");
    const y = (joined.results || []).find((r) => r.leg_id === "leg-y" && r.item === "demonstrative-reference");
    if (!x || x.verdict !== "fails") fails.push(`(l) demonstrative-reference on leg-x did not join as fails: ${JSON.stringify(x)}`);
    else {
      const ev = (x.evidence || [])[0] || "";
      if (!/^The antecedent of the demonstrative reference 'The last one' on line \d+ is not recoverable$/.test(ev)) {
        fails.push(`(l) leg-x's evidence is not the declared finding form naming the line and the expression: ${JSON.stringify(ev)}`);
      }
      if (ev.length >= 240) fails.push(`(l) leg-x's finding is ${ev.length} characters, over the 240-character bound`);
      if (!/^leg-x\/demonstrative-reference$/.test(`${x.leg_id}/${x.item}`) || /[0-9]/.test(x.reason)) {
        fails.push(`(l) leg-x's row carries a digit in its reason, which the comparison line refuses: ${JSON.stringify(x.reason)}`);
      }
    }
    if (!y || y.verdict !== "holds") fails.push(`(l) demonstrative-reference on leg-y did not join as holds: ${JSON.stringify(y)}`);
    const xModelCall = (joined.model_calls || []).find((c) => c.leg_id === "leg-x" && c.item === "demonstrative-reference");
    if (xModelCall) fails.push("(l) demonstrative-reference cost a model call — it is declared mechanical and must not render a join Packet");
    const xMech = (joined.mechanical || []).find((c) => c.leg_id === "leg-x" && c.item === "demonstrative-reference");
    if (!xMech) fails.push("(l) demonstrative-reference on leg-x is not logged as decided mechanically");

    const openFail = (joined.results || []).find((r) => r.leg_id === "leg-open-fail" && r.item === "demonstrative-reference");
    const openHold = (joined.results || []).find((r) => r.leg_id === "leg-open-hold" && r.item === "demonstrative-reference");
    const openSecond = (joined.results || []).find((r) => r.leg_id === "leg-open-second" && r.item === "demonstrative-reference");
    if (!openFail || openFail.verdict !== "fails") {
      fails.push(`(l) demonstrative-reference on leg-open-fail did not join as fails: ${JSON.stringify(openFail)}`);
    } else {
      const ev = (openFail.evidence || [])[0] || "";
      if (!/^The word 'That' on line \d+ opens its paragraph reaching into the paragraph before it$/.test(ev)) {
        fails.push(`(l) leg-open-fail's evidence is not the paragraph-opener finding form naming the line and the word: ${JSON.stringify(ev)}`);
      }
      if (/[0-9]/.test(openFail.reason)) {
        fails.push(`(l) leg-open-fail's row carries a digit in its reason, which the comparison line refuses: ${JSON.stringify(openFail.reason)}`);
      }
    }
    if (!openHold || openHold.verdict !== "holds") {
      fails.push(`(l) demonstrative-reference on leg-open-hold did not join as holds: ${JSON.stringify(openHold)}`);
    }
    if (!openSecond || openSecond.verdict !== "holds") {
      fails.push(`(l) demonstrative-reference on leg-open-second did not join as holds: ${JSON.stringify(openSecond)}`);
    }
  }
  rmSync(ws, { recursive: true, force: true });
}

// (m) THE FAILING-PASSAGE FIXTURE FOR already-knows (kogaki#1282 cell three,
// closing #1282): a passage that relies on a term an EARLIER Leg introduced,
// where THIS Leg's own Packet never re-activates it, joins `fails`; the same
// reliance, with the term re-activated into this Leg's crossing block, joins
// `holds`. Driven through the real open/outline/compare CLI — case (i) checks
// the item table's shape, and this case is what proves the comparison's
// DECLARED SIDE actually enforces default-deny rather than only declaring it.
{
  const ws = mkdtempSync(join(tmpdir(), "review-draft-alreadyknows-"));
  const draftPath = join(ws, "draft.md");

  const packet1 = [
    "## The waypoints this Leg takes the reader through",
    "",
    "- the reader is brought to see what the installer tracks and where *Serves:* the Leg's claim",
    "",
    "## The claims this Leg asserts",
    "",
    "- the installer writes a stamped ledger entry for every file it overwrites",
    "",
    "## What crosses into this Leg",
    "",
    "- the stamped ledger — coined here: a dated record of each file the installer "
      + "overwrote, kept beside the vendored tree",
    "- the install log — coined here: a plain-text file naming the vendored tree's root path",
    "",
    "## The Journey material this Leg edits — NOT a claim to recover",
    "",
    "The installer's first run, and the two records it leaves behind.",
    "",
    "**The reader's own world.** Can read code and has installed a dependency by hand.",
    "",
  ].join("\n");

  const packetSecond = (claim, crossTheLedger) => [
    "## The waypoints this Leg takes the reader through",
    "",
    "- the reader is brought to see what a second run of the installer updates *Serves:* the Leg's claim",
    "",
    "## The claims this Leg asserts",
    "",
    `- ${claim}`,
    "",
    "## What crosses into this Leg",
    "",
    "- the install log — re-activated from leg-1: a plain-text file naming the "
      + "vendored tree's root path",
    ...(crossTheLedger ? ["- the stamped ledger — re-activated from leg-1: a dated record "
      + "of each file the installer overwrote, kept beside the vendored tree"] : []),
    "",
    "## The Journey material this Leg edits — NOT a claim to recover",
    "",
    "The installer's second run, re-reading what it wrote before.",
    "",
    "**The reader's own world.** Can read code and has installed a dependency by hand.",
    "",
  ].join("\n");

  const claimText = "a second run of the installer refreshes only the entries whose file changed";
  const relyProse = [
    "The second run walks the stamped ledger and refreshes any entry whose file changed.",
    "Everything else is left exactly as the install log already names it.",
  ];
  const leg1Prose = [
    "The installer's first run writes the stamped ledger, one dated entry per file it "
      + "overwrites, and the install log, naming the vendored tree's root path.",
  ];

  const packetFail = packetSecond(claimText, false);
  const packetHold = packetSecond(claimText, true);
  writeFileSync(join(ws, "packet-1.md"), packet1);
  writeFileSync(join(ws, "packet-fail.md"), packetFail);
  writeFileSync(join(ws, "packet-hold.md"), packetHold);

  const leg1Lines = [7, 7 + leg1Prose.length - 1];
  const legFailLines = [leg1Lines[1] + 1, leg1Lines[1] + relyProse.length];
  const legHoldLines = [legFailLines[1] + 1, legFailLines[1] + relyProse.length];
  const sha1 = createHash("sha256").update(packet1).digest("hex");
  const shaFail = createHash("sha256").update(packetFail).digest("hex");
  const shaHold = createHash("sha256").update(packetHold).digest("hex");
  const fm = [
    "---",
    "trace:",
    `  - ${JSON.stringify({ leg_id: "leg-1", lines: leg1Lines, packet: "packet-1.md", packet_sha: sha1 })}`,
    `  - ${JSON.stringify({ leg_id: "leg-fail", lines: legFailLines, packet: "packet-fail.md", packet_sha: shaFail })}`,
    `  - ${JSON.stringify({ leg_id: "leg-hold", lines: legHoldLines, packet: "packet-hold.md", packet_sha: shaHold })}`,
    "---",
  ].join("\n");
  writeFileSync(draftPath, `${fm}\n\n${[...leg1Prose, ...relyProse, ...relyProse].join("\n")}\n`);

  const runCmd = (cmd, extra, input) => spawnSync(process.execPath,
    ["src/review-draft.mjs", cmd, "--draft", draftPath, "--workspace", ws, ...extra],
    { encoding: "utf8", input: input ?? "" });
  const outlineFor = (legId, claim, introduces) => "```leg\n"
    + `leg_id: ${legId}\n`
    + "purpose: walk the installer's record-keeping\n"
    + "reader_state_before: the reader has never met the installer's records\n"
    + "reader_state_after: the reader can say what each record holds\n"
    + `claim ${claim}\n`
    + "waypoint the passage brings me to see what the installer records\n"
    + (introduces || []).map((t) => `introduces: ${t}\n`).join("")
    + "```\n";

  const lOpen = runCmd("open", []);
  if (lOpen.status !== 0) fails.push(`(m) open exited ${lOpen.status}: ${(lOpen.stderr || "").trim()}`);
  const lO1 = runCmd("outline", ["--leg", "leg-1"],
    outlineFor("leg-1", "the installer writes a stamped ledger entry for every file it overwrites",
      ["the stamped ledger", "the install log"]));
  if (lO1.status !== 0) fails.push(`(m) outline leg-1 exited ${lO1.status}: ${(lO1.stderr || "").trim()}`);
  const lO2 = runCmd("outline", ["--leg", "leg-fail"], outlineFor("leg-fail", claimText));
  if (lO2.status !== 0) fails.push(`(m) outline leg-fail exited ${lO2.status}: ${(lO2.stderr || "").trim()}`);
  const lO3 = runCmd("outline", ["--leg", "leg-hold"], outlineFor("leg-hold", claimText));
  if (lO3.status !== 0) fails.push(`(m) outline leg-hold exited ${lO3.status}: ${(lO3.stderr || "").trim()}`);

  const lRender = runCmd("compare", []);
  if (lRender.status !== 0) fails.push(`(m) compare (render) exited ${lRender.status}: ${(lRender.stderr || "").trim()}`);
  const lm = /join record: (.+)$/m.exec(lRender.stdout || "");
  if (!lm) fails.push(`(m) compare (render) named no join record: ${(lRender.stdout || "").trim()}`);
  else {
    const joinPath = lm[1].trim();
    const renderedJoin = JSON.parse(readFileSync(joinPath, "utf8"));
    // THE DECLARED SIDE READ BACK, before any verdict is supplied: leg-fail's
    // rendered join Packet for already-knows carries no mention of the
    // stamped ledger, and leg-hold's does — the property this fixture exists
    // to prove is in the comparison's rendering, not only in the verdict.
    const akPacket = (legId) => {
      const o = (renderedJoin.owed || []).find((x) => x.leg_id === legId && x.item === "already-knows");
      return o ? readFileSync(o.packet, "utf8") : null;
    };
    const failPacket = akPacket("leg-fail");
    const holdPacket = akPacket("leg-hold");
    if (!failPacket) fails.push("(m) leg-fail's already-knows pair rendered no join Packet");
    else if (/stamped ledger/.test(failPacket.split("### The prose itself")[0])) {
      fails.push("(m) leg-fail's declared side names the stamped ledger, which this Leg never re-activates");
    }
    if (!holdPacket) fails.push("(m) leg-hold's already-knows pair rendered no join Packet");
    else if (!/stamped ledger/.test(holdPacket.split("### The prose itself")[0])) {
      fails.push("(m) leg-hold's declared side does not carry the stamped ledger it re-activates");
    }

    const verdicts = (renderedJoin.owed || []).map((o) => {
      const already = o.item === "already-knows";
      const verdict = already && o.leg_id === "leg-fail" ? "fails" : "holds";
      const reason = already
        ? (o.leg_id === "leg-fail"
          ? "the passage treats the stamped ledger as already available though this Leg never re-activates it"
          : "the passage relies only on terms and claims this Leg's own crossing block declares")
        : "the two sides agree";
      return { leg_id: o.leg_id, item: o.item, pair: o.pair, verdict, reason, model: "fixture-judge" };
    });
    if (!verdicts.some((v) => v.item === "already-knows")) {
      fails.push("(m) the render call owed no already-knows pair — the crossing-block comparison never reached a join Packet");
    }

    const lRecord = runCmd("compare", [], JSON.stringify({ verdicts }));
    if (lRecord.status !== 0) fails.push(`(m) compare (record) exited ${lRecord.status}: ${(lRecord.stderr || "").trim()}`);
    const lm2 = /join record: (.+)$/m.exec(lRecord.stdout || "");
    if (!lm2) fails.push(`(m) compare (record) named no join record: ${(lRecord.stdout || "").trim()}`);
    else {
      const joined = JSON.parse(readFileSync(lm2[1].trim(), "utf8"));
      if (!joined.complete) fails.push(`(m) the join did not complete: ${JSON.stringify(joined.owed)}`);
      const fail = (joined.results || []).find((r) => r.leg_id === "leg-fail" && r.item === "already-knows");
      const hold = (joined.results || []).find((r) => r.leg_id === "leg-hold" && r.item === "already-knows");
      if (!fail || fail.verdict !== "fails") fails.push(`(m) already-knows on leg-fail did not join as fails: ${JSON.stringify(fail)}`);
      if (!hold || hold.verdict !== "holds") fails.push(`(m) already-knows on leg-hold did not join as holds: ${JSON.stringify(hold)}`);
    }
  }
  rmSync(ws, { recursive: true, force: true });
}

// (n) THE QUESTION CHAIN IS RETIRED (kogaki#1325, owner decision 2026-10-10).
// kogaki#1324 left it comparing Leg N's after-state question line with Leg
// N+1's before-state question line; with the before-state derived from the
// previous after-state those are one line, so the item is retired and its
// kogaki#1324 cases with it, never re-pointed. What is asserted is the absence
// the removal leaves: `questionChainPairs` is no longer exported, the
// review_path_unit input carries no `question_chain_pairs` and no
// `question_chain_verdicts`, the Candidate it carries has its Legs' derived
// before-states, and a record carrying `question_chain` is refused by name.
{
  const compose = await import("./src/compose.mjs");
  if ("questionChainPairs" in compose) fails.push("(n) src/compose.mjs still exports questionChainPairs");
  const review = await import("./src/review.mjs");
  if ("QUESTION_CHAIN_VERDICTS" in review) fails.push("(n) src/review.mjs still exports QUESTION_CHAIN_VERDICTS");
  const briefSrc = readFileSync("src/brief.mjs", "utf8");
  const reviewPath = briefSrc.slice(briefSrc.indexOf("  review_path: async"), briefSrc.indexOf("  attach_review"));
  if (/question_chain_pairs|question_chain_verdicts/.test(reviewPath)) {
    fails.push("(n) review_path's unit input still carries `question_chain_pairs` or `question_chain_verdicts`");
  }
  if (!/candidate_you_must_review: \{ \.\.\.c, legs: deriveReaderStatesBefore\(c\.legs, c\.reader_start\) \}/.test(reviewPath)) {
    fails.push("(n) review_path's unit input does not carry the Candidate with its Legs' derived before-states");
  }
  const table = JSON.parse(readFileSync("src/brief-workflow.json", "utf8"));
  if (/`question_chain`, one entry per adjacent Leg pair/.test(table.review_path_unit.judgment_point)) {
    fails.push("(n) the review_path_unit row still asks for the question chain");
  }
  const leg = (id) => ({ leg_id: id, reader_state_after: `knowledge: after ${id}` });
  const r = review.attachReview([{ candidate_id: "c1", legs: [leg("s1"), leg("s2")] }],
    { c1: { ...Object.fromEntries(review.REVIEW_AREAS.map((k) => [k, `reasoning for ${k}`])),
      claim_register: [{ leg_id: "s1", verdict: "holds" }, { leg_id: "s2", verdict: "holds" }],
      question_chain: [{ leg: "s1", next_leg: "s2", verdict: "same question", why: "one line, read twice" }] } });
  if (!r.error || !/`question_chain` is a retired review item \(kogaki#1325\)/.test(r.error)) {
    fails.push(`(n) a review record carrying question_chain was not refused by name: ${JSON.stringify(r)}`);
  }
}

if (fails.length) {
  console.log("FAIL brief review plumbing (SPEC-draft-pipeline §4.6, story 1.74):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief review: 11/11 cases — (a) per-Candidate reasoning attaches and rides each "
  + "Candidate with every §§4.4-4.8 area present; (b) an unreviewed Candidate is refused BY "
  + "NAME and a missing area refuses — review runs machine-side per Candidate and never "
  + "multiplies owner questions; (c) a verdict is UNATTACHABLE — verdict-shaped keys refused "
  + "by name, non-string values refused as verdicts wearing a type; (d) the command path "
  + "agrees byte-for-byte with the exported function and states the no-verdict property in "
  + "its own output; (e) an attach counts nothing (kogaki#1307): a second and third attach "
  + "are accepted, no ledger is written, the revise-pass exports are gone, and an open Closure "
  + "row rides through with no withdrawal; (i) the already-knows item reads the Packet's one "
  + "\"What crosses into this Leg\" block beside this Leg's own claims, never the retired "
  + "held-by-reader/active-here pair or a standalone introduces block, and an empty crossing "
  + "block holds mechanically with no model call; (j) kogaki#1247 cell five's "
  + "four new judged items — prose-style, attribute-leak, referents, unsupported-sentence — "
  + "join through the real open/outline/compare CLI and each hold one Leg joined `fails` and "
  + "one joined `holds`, recorded rather than computed, which is the whole of what a judged "
  + "item's plumbing owes; (k) kogaki#1285's reader's-own-world line joins the referents "
  + "item's declared side beside the Journey block, so a passage naming a referent the "
  + "Persona's prior_knowledge grants joins `holds` even though the Journey material never "
  + "carries it, and a passage naming a referent neither source carries still joins `fails`. "
  + "(l) kogaki#1255 cell four's demonstrative-reference item — mechanical, read from the "
  + "Draft alone, no Packet block and no model call — joins `fails` on a Leg where \"the last "
  + "one\" sits three paragraphs past the enumeration it would point at, naming the line and the "
  + "expression in the declared form and under the two-hundred-forty-character bound with no "
  + "digit in its own comparison-line reason, and joins `holds` on a Leg where the same "
  + "expression sits one paragraph after its enumeration. kogaki#1322's paragraph-opener test "
  + "joins `fails` naming the line and the word on a Leg opening \"That left me holding\", "
  + "joins `holds` on a Leg opening \"The fallback step left me holding\", and joins `holds` on "
  + "a Leg carrying a demonstrative in a paragraph's second sentence with its antecedent one "
  + "paragraph back — the opener test never reaches past a paragraph's first sentence. "
  + "(m) kogaki#1282 cell three's failing-passage fixture for already-knows — driven through "
  + "the real open/outline/compare CLI, with an earlier Leg's coined term read back out of "
  + "the rendered join Packet's declared side: ABSENT from a later Leg that never "
  + "re-activates it, where the item joins `fails` on a passage relying on it, and PRESENT "
  + "once that Leg's own crossing block re-activates the term, where the same reliance joins "
  + "`holds` — proving default-deny in the comparison's rendering, not only in the item "
  + "table's declared shape. "
  + "(n) the question chain is retired (kogaki#1325) — questionChainPairs and "
  + "QUESTION_CHAIN_VERDICTS are no longer exported, the review_path_unit input carries no "
  + "question-chain field and carries the Candidate with its Legs' derived before-states, and "
  + "a record carrying `question_chain` is refused by name. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.74): dropping the per-candidate "
  + "completeness guard failed (b)'s by-name refusal; dropping the verdict-key scan failed "
  + "(c)'s unattachability. NOT "
  + "COVERED, stated rather than implied: whether the agent's reasoning is sound — the "
  + "grounds test applied well, the prohibitions actually looked for, the arc actually "
  + "traced — is judgment-class (§4.6 clause 3 keeps every MUST un-linted) and belongs to "
  + "the human gate reading the attached reasoning; this member exercises the plumbing that "
  + "makes an unjudged or verdict-bearing Candidate unable to reach that gate.");
JS
