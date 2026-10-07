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
# AND SINCE kogaki#894, THE ARITHMETIC OF §4.11's BOUND. "One revise round per
# Candidate" was prose with its count in the composing sitting's memory, so a
# Candidate re-reviewed three times reached assembly with no refusal and no
# disclosure. Cases (e)-(h) assert the count is the Harness's: a third attach
# refuses by name, a Candidate at the bound carries a residue entry THIS
# RUNTIME wrote, a re-run with the same reasoning spends no round, and a
# DAMAGED ledger refuses rather than reading as zero rounds spent.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { attachReview, attachLedgerPath, readAttachLedger, reviewEntrySha,
         REVIEW_AREAS, REVISE_BOUND, MAX_ATTACHES } from "./src/review.mjs";

const fails = [];
const dir = mkdtempSync(join(tmpdir(), "brief-review-"));

// CLOSURE (kogaki#1151): each Candidate carries one open row (neither
// discharged_by nor conceded_by) so the revise bound's withdrawal-and-residue
// arm actually fires — a Candidate with no open row reaches the bound clean,
// carrying no residue at all, which case (f) below no longer holds true of.
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
  // The ledger root is the scratch dir, never this repository's `runs/` — a
  // fixture that counted revise rounds into the developer's live workspace
  // would spend a real Brief's bound to assert an arithmetic property.
  const cf = join(dir, "cands.json"); const rf = join(dir, "review.json"); const of = join(dir, "reviewed.json");
  const root = join(dir, "runs");
  mkdirSync(join(dir, "theses", "fixture-slug"), { recursive: true });
  const brief = join(dir, "theses", "fixture-slug", "brief.md");
  writeFileSync(brief, "# fixture brief\n");
  // The fixture seam is a NAMED ENVIRONMENT VARIABLE, never a command-line
  // flag: a `--ledger-root` flag would be a public surface letting any caller
  // reset the count, which is the property §4.11's Harness-resolved-home
  // bullet asserts the opposite of (PR #908 round 1).
  const env = { ...process.env, KOGAKI_ATTACH_LEDGER_ROOT_FOR_TESTS: root };
  const attach = (reviewFile) => spawnSync(process.execPath,
    ["src/review.mjs", "attach", "--candidates", cf, "--review", reviewFile,
     "--brief", brief, "--out", of], { encoding: "utf8", env });
  writeFileSync(cf, JSON.stringify(cands)); writeFileSync(rf, JSON.stringify(review));
  const p = attach(rf);
  if (p.status !== 0) fails.push(`(d) attach exited ${p.status}: ${(p.stderr || "").trim()}`);
  const disk = JSON.parse(readFileSync(of, "utf8"));
  if (JSON.stringify(disk.candidates) !== JSON.stringify(attachReview(cands, review).candidates)) {
    fails.push("(d) the command's output differs from the exported function's — two producers");
  }
  if (!/no verdict anywhere/.test(p.stdout || "")) fails.push("(d) the command does not state the no-verdict property in its own output");
  // `--brief` is REQUIRED: without it the bound has no workspace to be counted
  // in, and an optional flag would make the count opt-in for the one caller
  // whose memory the count was already living in.
  const nb = spawnSync(process.execPath, ["src/review.mjs", "attach", "--candidates", cf,
    "--review", rf, "--out", of], { encoding: "utf8", env });
  if (nb.status === 0 || !/--brief/.test(nb.stderr || "")) {
    fails.push("(d) attach without --brief was accepted — the revise-round ledger has no identity to be keyed on, so the bound is uncounted");
  }

  // `--ledger-root` is NOT a surface: an unknown flag must not relocate the
  // ledger, or the bound is resettable by the party it bounds.
  const flagged = spawnSync(process.execPath, ["src/review.mjs", "attach", "--candidates", cf,
    "--review", rf, "--brief", brief, "--out", of, "--ledger-root", join(dir, "elsewhere")],
    { encoding: "utf8", env });
  if (flagged.status === 0 && existsSync(join(dir, "elsewhere"))) {
    fails.push("(d) --ledger-root relocated the ledger — a caller-chosen home is a bound the counted party can reset (§4.11)");
  }

  // (e) THE BOUND IS THE HARNESS'S ARITHMETIC (§4.11; kogaki#894). Two
  // attaches with DIFFERENT reasoning pass — the first review and the one
  // revise round — and a third is refused BY NAME, naming the prior attaches.
  if (REVISE_BOUND !== 1 || MAX_ATTACHES !== 2) {
    fails.push(`(e) the bound is ${REVISE_BOUND} revise round(s) / ${MAX_ATTACHES} attach(es) — the loop is bounded at ONE revise round per Candidate`);
  }
  const lp = attachLedgerPath(brief, root);
  if (lp.error) fails.push(`(e) the ledger path did not resolve: ${lp.error}`);
  const a1 = attachReview(cands, both("first "), {});
  if (a1.error) fails.push(`(e) the first attach was refused: ${a1.error}`);
  // THE REVISE ARMS (kogaki#1151): the second attach on a Candidate carrying
  // an open Closure row owes one of the four declared Arms per row, checked
  // against the FIRST attach's own snapshot — so the fixture's revise round
  // carries `revise_arms` naming the row it concedes.
  const withArms = cands.map((c) => ({ ...c,
    revise_arms: (c.obligations || []).map((o) => ({ text: o.text, introduced_by: o.introduced_by, arm: "concede", legs: [o.introduced_by] })) }));
  const a2 = attachReview(withArms, both("revised "), a1.attaches);
  if (a2.error) fails.push(`(e) the ONE revise round was refused: ${a2.error}`);
  else if ((a2.attaches["cand-1"] || []).length !== 2) fails.push("(e) the revise round was not counted");
  const a3 = a2.error ? null : attachReview(cands, both("third "), a2.attaches);
  if (!a3 || !a3.error || !/cand-1/.test(a3.error)
      || !/bounded at ONE revise round per Candidate/.test(a3.error)
      || !/attach 3/.test(a3.error)) {
    fails.push(`(e) a THIRD attach was not refused by name against the one-revise-round bound: ${JSON.stringify(a3 && (a3.error || "accepted"))}`);
  }
  // The refusal must name the prior attaches — a bound that refuses without
  // saying what it counted is a bound the composer cannot check.
  if (a3 && a3.error && !/round 1 at /.test(a3.error)) {
    fails.push("(e) the refusal does not name the prior attaches it counted");
  }

  // (f) THE RESIDUE IS HARNESS-WRITTEN, never a model-declared line. A
  // Candidate at the bound carries one; a Candidate that ARRIVES carrying one
  // is refused — that is `bridges`'s defect one field over.
  const atBound = a2.error ? [] : a2.candidates.filter((c) => c.revise_residue);
  if (atBound.length !== cands.length) fails.push("(f) a Candidate at the bound carries no residue entry — the surviving gap rides to the gate DISCLOSED (§4.11)");
  else {
    for (const c of atBound) {
      if (c.revise_residue.attaches !== 2 || typeof c.revise_residue.statement !== "string"
          || !/revise round per Candidate/.test(c.revise_residue.bound)) {
        fails.push(`(f) ${c.candidate_id}'s residue does not state the bound it was written against`);
      }
      // WITHDRAWN, NOT MERELY DISCLOSED (kogaki#1151): a Candidate at the
      // bound still carrying an open Closure row is withdrawn from the
      // Candidate set, and its open rows are named in the residue.
      if (c.withdrawn !== true) fails.push(`(f) ${c.candidate_id} reached the bound with an open Closure row and was not withdrawn`);
      if (!Array.isArray(c.revise_residue.open_rows) || c.revise_residue.open_rows.length !== 1) {
        fails.push(`(f) ${c.candidate_id}'s residue does not carry its open Closure row(s): ${JSON.stringify(c.revise_residue.open_rows)}`);
      }
    }
  }
  if (!a1.error && a1.candidates.some((c) => c.revise_residue)) {
    fails.push("(f) a Candidate that has not spent its revise round carries a residue entry — the entry would then mean nothing");
  }
  const declared = cands.map((c) => ({ ...c, revise_residue: { attaches: 1, statement: "we say it is fine" } }));
  const rd = attachReview(declared, review, {});
  if (!rd.error || !/revise_residue/.test(rd.error) || !/never declared/.test(rd.error)) {
    fails.push(`(f) a model-DECLARED residue was accepted: ${JSON.stringify(rd.error || "accepted")}`);
  }

  // (g) A REFUSED ATTACH SPENDS NO ROUND, and RE-ATTACHING THE SAME REASONING
  // spends none either — recovery in this repository is re-running the
  // command, and a count that charged a re-run would make the bound punish it.
  const bad = attachReview(cands, { "cand-1": entry(), "cand-2": { ...entry(), verdict: "pass" } }, a1.attaches);
  if (!bad.error) fails.push("(g) a malformed attach was accepted");
  if ((a1.attaches["cand-1"] || []).length !== 1) fails.push("(g) a refused attach mutated the ledger — a typo would spend the Candidate's revise round");
  const again = attachReview(cands, both("revised "), a2.attaches);
  if (again.error) fails.push(`(g) re-attaching the SAME reasoning was refused: ${again.error}`);
  else if ((again.attaches["cand-1"] || []).length !== 2) fails.push("(g) re-attaching the same reasoning spent a round — recovery is re-running, and the count is keyed on the reasoning's identity");
  if (reviewEntrySha(entry("x")) === reviewEntrySha(entry("y"))) fails.push("(g) two different review entries hash the same — the round key does not distinguish reasoning");

  // (h) A DAMAGED LEDGER REFUSES; IT NEVER READS AS ZERO ROUNDS SPENT. This
  // is the one branch the PR body named as a property and nothing broke once
  // (PR #908 round 1) — and it is the branch that decides whether the bound
  // survives a bad file or quietly becomes a suggestion.
  const badLedger = join(dir, "corrupt-ledger.json");
  writeFileSync(badLedger, "{ this is not json");
  const rc = readAttachLedger(badLedger);
  if (!rc.error || !/NOT an empty one/.test(rc.error)) {
    fails.push(`(h) an unparseable ledger did not refuse: ${JSON.stringify(rc.error || rc)}`);
  }
  const shapeless = join(dir, "shapeless-ledger.json");
  writeFileSync(shapeless, JSON.stringify({ rounds: 2 }));
  const rs2 = readAttachLedger(shapeless);
  if (!rs2.error || !/attaches/.test(rs2.error)) {
    fails.push(`(h) a ledger with no \`attaches\` object did not refuse: ${JSON.stringify(rs2.error || rs2)}`);
  }
  if (readAttachLedger(join(dir, "no-such-ledger.json")).error) {
    fails.push("(h) an ABSENT ledger refused — absent is zero rounds spent, and only a DAMAGED one is unknown");
  }
  // THE THIRD DOOR (PR #910 round 1): a ledger whose VALUES are damaged. The
  // container-shaped check passed these, and the coercion below it then
  // restored the Candidate to zero rounds spent — the degrade-to-zero this
  // case exists to refuse, reached without an unparseable byte in the file.
  for (const [name, body] of [
    ["scalar-entry", { attaches: { "cand-1": 5 } }],
    ["object-entry", { attaches: { "cand-1": { round: 2 } } }],
    ["malformed-round", { attaches: { "cand-1": [{ round: "2", sha: "x", at: "t" }] } }],
    ["array-attaches", { attaches: [] }],
  ]) {
    const f = join(dir, `damaged-${name}.json`);
    writeFileSync(f, JSON.stringify(body));
    const rr = readAttachLedger(f);
    if (!rr.error) fails.push(`(h) a damaged ledger (${name}) read as ${JSON.stringify(rr.attaches)} instead of refusing — the count degraded to zero without an unparseable byte`);
  }
  // And the PURE function refuses it too, for a caller that did not come
  // through the reader — a guard on one door only is a guard with a bypass.
  const coerced = attachReview(cands, review, { "cand-1": 5 });
  if (!coerced.error || !/not an array of round/.test(coerced.error)) {
    fails.push(`(h) attachReview COERCED a damaged ledger entry instead of refusing: ${JSON.stringify(coerced.error || "accepted")}`);
  }

  // The command path writes the ledger the exported arithmetic reads. The
  // revise round owes `revise_arms` the same way the in-process (e)/(f) cases
  // do (kogaki#1151) — `cf` is overwritten with the Arms-carrying Candidates.
  writeFileSync(cf, JSON.stringify(withArms));
  const p2 = attach((() => { const f = join(dir, "review2.json"); writeFileSync(f, JSON.stringify(both("revised "))); return f; })());
  if (p2.status !== 0) fails.push(`(g) the second command attach exited ${p2.status}: ${(p2.stderr || "").trim()}`);
  const led = lp.error ? { error: lp.error } : readAttachLedger(lp.path);
  if (led.error) fails.push(`(g) the ledger the command wrote is unreadable: ${led.error}`);
  else if ((led.attaches["cand-1"] || []).length !== 2) fails.push("(g) the command path did not record the revise round in the run workspace — the count would live in the sitting's memory again");
  const p3 = attach((() => { const f = join(dir, "review3.json"); writeFileSync(f, JSON.stringify(both("third "))); return f; })());
  if (p3.status === 0 || !/bounded at ONE revise round per Candidate/.test(p3.stderr || "")) {
    fails.push(`(g) the command path admitted a third attach: ${(p3.stderr || "").trim() || "exit 0"}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

// (i) the inverted `already-knows` item (kogaki#1237): ReviewDraft's item table asks
// whether the passage relies on a term the reader holds but this Leg did NOT
// re-activate, over the Packet's "Held by the reader, not material here" block,
// and the retired "Already knows" block is named nowhere in the table.
{
  const items = JSON.parse(readFileSync("src/review-items.json", "utf8"));
  const it = (items.items || []).find((i) => i.id === "already-knows");
  if (!it) fails.push("(i) src/review-items.json carries no already-knows item");
  else {
    if (it.declared_block !== "held_by_reader") fails.push(`(i) already-knows reads block ${JSON.stringify(it.declared_block)}, want held_by_reader`);
    if (!(it.also_declared_blocks || []).includes("active_here")) fails.push("(i) already-knows does not hand the judge the Active here block beside the held one");
    if (!/did not re-activate/.test(it.question) || !/Answer `fails` if it does/.test(it.question)) fails.push(`(i) the already-knows question is not inverted onto un-re-activated material: ${it.question}`);
    if (!/never fails/.test(it.question)) fails.push("(i) the question does not state that re-introducing re-activated material holds");
    if (!it.when_declared_absent || it.when_declared_absent.verdict !== "holds") fails.push("(i) an empty held-by-reader list does not hold mechanically");
  }
  const blocks = items.packet_blocks || {};
  const held = blocks.held_by_reader;
  const template = readFileSync("src/packet-template.md", "utf8");
  if (!held || held.kind !== "heading_list" || !template.includes(`### ${held.heading}`)) fails.push(`(i) packet_blocks.held_by_reader does not name a heading the template renders: ${JSON.stringify(held)}`);
  const active = blocks.active_here;
  if (!active || active.kind !== "heading_list" || !template.includes(`### ${active.heading}`)) fails.push(`(i) packet_blocks.active_here does not name a heading the template renders: ${JSON.stringify(active)}`);
  if (Object.prototype.hasOwnProperty.call(blocks, "already_knows") || /Already knows/.test(JSON.stringify(blocks))) fails.push("(i) the retired already_knows block survives in packet_blocks");
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
    "- **technique.** contrast",
    "- **question.** what the kit copies and where",
    "- **breaks.** breaks if the vendored copy is edited by hand",
    "",
    "## The claims this Leg asserts",
    "",
    `- ${claim}`,
    "",
    "## Introduce here",
    "",
    "(none)",
    "",
    "## Held by the reader, not material here",
    "",
    "(none)",
    "",
    "## Active here",
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
      if (item === "attribute-leak") return fail ? "the sentence paraphrases the Move contract's technique and question" : "no sentence quotes or paraphrases the Move contract";
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
    "- **technique.** contrast",
    "- **question.** what referent the passage may name",
    "- **breaks.** breaks if the passage invents a referent neither source carries",
    "",
    "## The claims this Leg asserts",
    "",
    `- ${claimText}`,
    "",
    "## Introduce here",
    "",
    "(none)",
    "",
    "## Held by the reader, not material here",
    "",
    "(none)",
    "",
    "## Active here",
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

// (l) THE DEMONSTRATIVE REFERENCE ITEM (kogaki#1255 cell 4): a mechanical
// item read from the Draft alone, with no Packet block and no model call.
// One Leg carries "the last one" three paragraphs past the enumeration it
// would point at and joins `fails`, naming the line and the expression in
// the declared form; a second Leg carries the same expression one paragraph
// after its enumeration and joins `holds`. Driven through the real
// open/outline/compare CLI, never through a second reader of the item table.
{
  const ws = mkdtempSync(join(tmpdir(), "review-draft-demref-"));
  const draftPath = join(ws, "draft.md");

  const packet = [
    "- **technique.** contrast",
    "- **question.** which install path a reader ends up on",
    "- **breaks.** breaks if a reader conflates the paths",
    "",
    "## The claims this Leg asserts",
    "",
    "- the kit's install paths all land the same vendored copy",
    "",
    "## Introduce here",
    "",
    "(none)",
    "",
    "## Held by the reader, not material here",
    "",
    "(none)",
    "",
    "## Active here",
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
    "The last one is the path this repository's installer takes by default.",
  ];
  // LEG-Y: the enumeration sits in the paragraph immediately before the one
  // carrying "the last one", so the lookback finds it and the row holds.
  const legYProse = [
    "The kit renders Legs, Packets, and figures before emit.",
    "",
    "The last one is optional and is skipped when a Leg declares no figure.",
  ];

  const shaX = createHash("sha256").update(packet).digest("hex");
  const legXLines = [7, 7 + legXProse.length - 1];
  const legYLines = [legXLines[1] + 2, legXLines[1] + 1 + legYProse.length];
  const fm = [
    "---",
    "trace:",
    `  - ${JSON.stringify({ leg_id: "leg-x", lines: legXLines, packet: "packet-x.md", packet_sha: shaX })}`,
    `  - ${JSON.stringify({ leg_id: "leg-y", lines: legYLines, packet: "packet-y.md", packet_sha: shaX })}`,
    "---",
  ].join("\n");
  writeFileSync(draftPath, `${fm}\n\n${legXProse.join("\n")}\n\n${legYProse.join("\n")}\n`);

  const runCmd = (cmd, extra, input) => spawnSync(process.execPath,
    ["src/review-draft.mjs", cmd, "--draft", draftPath, "--workspace", ws, ...extra],
    { encoding: "utf8", input: input ?? "" });
  const outlineFor = (legId) => "```leg\n"
    + `leg_id: ${legId}\n`
    + "purpose: walk the kit's install paths\n"
    + "reader_state_before: the reader has never met the kit\n"
    + "reader_state_after: the reader can name the kit's install paths\n"
    + "claim the kit's install paths all land the same vendored copy\n"
    + "```\n";

  const kOpen = runCmd("open", []);
  if (kOpen.status !== 0) fails.push(`(l) open exited ${kOpen.status}: ${(kOpen.stderr || "").trim()}`);
  const kO1 = runCmd("outline", ["--leg", "leg-x"], outlineFor("leg-x"));
  if (kO1.status !== 0) fails.push(`(l) outline leg-x exited ${kO1.status}: ${(kO1.stderr || "").trim()}`);
  const kO2 = runCmd("outline", ["--leg", "leg-y"], outlineFor("leg-y"));
  if (kO2.status !== 0) fails.push(`(l) outline leg-y exited ${kO2.status}: ${(kO2.stderr || "").trim()}`);

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
  }
  rmSync(ws, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL brief review plumbing (SPEC-draft-pipeline §4.6, story 1.74):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief review: 12/12 cases — (a) per-Candidate reasoning attaches and rides each "
  + "Candidate with every §§4.4-4.8 area present; (b) an unreviewed Candidate is refused BY "
  + "NAME and a missing area refuses — review runs machine-side per Candidate and never "
  + "multiplies owner questions; (c) a verdict is UNATTACHABLE — verdict-shaped keys refused "
  + "by name, non-string values refused as verdicts wearing a type; (d) the command path "
  + "agrees byte-for-byte with the exported function, states the no-verdict property in "
  + "its own output, and REQUIRES --brief, without which the bound has no workspace to be "
  + "counted in; (e) §4.11's bound is the HARNESS's arithmetic — the first review and the "
  + "one revise round pass, a THIRD attach is refused by name and names the prior attaches "
  + "it counted; (f) the residue a Candidate at the bound rides to the gate with is written "
  + "by this runtime FROM THE LEDGER, a Candidate below the bound carries none, and a "
  + "model-DECLARED `revise_residue` is refused — that is `bridges`'s defect one field over; "
  + "(g) a refused attach spends no round and re-attaching the SAME reasoning spends none "
  + "either (the count is keyed on the reasoning's identity, so recovery-by-re-running does "
  + "not consume the bound), and the command path records the round in the RUN WORKSPACE "
  + "rather than in the composing sitting's memory; (h) a DAMAGED ledger REFUSES — "
  + "unparseable JSON, a body with no `attaches` object, and an entry that is not an array of "
  + "round records (the door a container-shaped check leaves open) — while an ABSENT one is "
  + "zero rounds spent, because a bound whose count degrades to zero on a bad read is a "
  + "suggestion with a good failure mode; (i) the inverted already-knows item reads the "
  + "Packet's held-by-reader block beside active-here, never the retired already-knows block, "
  + "and an empty held list holds mechanically with no model call; (j) kogaki#1247 cell five's "
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
  + "expression sits one paragraph after its enumeration. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.74): SIX mutations, each run once "
  + "and restored surgically — dropping the per-candidate completeness guard failed (b)'s "
  + "by-name refusal; dropping the verdict-key scan failed (c)'s unattachability; raising "
  + "MAX_ATTACHES to 3 failed (e)'s third-attach refusal AND (f)'s residue, since a "
  + "Candidate that never reaches the bound never carries one; counting into the CALLER's "
  + "ledger object instead of a copy failed (g)'s spends-no-round assertion; returning "
  + "`{ attaches: {} }` from the unparseable-JSON branch instead of refusing failed (h), and "
  + "restoring the `Array.isArray(v) ? [...v] : []` coercion failed (h)'s damaged-VALUE cases "
  + "while every other case stayed green. NOT "
  + "COVERED, stated rather than implied: whether the agent's reasoning is sound — the "
  + "grounds test applied well, the prohibitions actually looked for, the arc actually "
  + "traced — is judgment-class (§4.6 clause 3 keeps every MUST un-linted) and belongs to "
  + "the human gate reading the attached reasoning; this member exercises the plumbing that "
  + "makes an unjudged or verdict-bearing Candidate unable to reach that gate. AND NOT "
  + "COVERED: whether the revise actually REPAIRED the gap — the Harness counts the round "
  + "and never judges the repair, so a residue entry says a round was spent, never that a "
  + "gap survived it.");
JS
