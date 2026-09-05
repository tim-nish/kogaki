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
# disclosure. Cases (e)-(g) assert the count is the Harness's: a third attach
# refuses by name, a Candidate at the bound carries a residue entry THIS
# RUNTIME wrote, and a re-run with the same reasoning spends no round.
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { attachReview, attachLedgerPath, readAttachLedger, reviewEntrySha,
         REVIEW_AREAS, REVISE_BOUND, MAX_ATTACHES } from "./src/review.mjs";

const fails = [];
const dir = mkdtempSync(join(tmpdir(), "brief-review-"));

const cands = [
  { candidate_id: "cand-1", steps: ["s1", "s2"] },
  { candidate_id: "cand-2", steps: ["s2", "s1"] },
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
  const rb = attachReview(cands, { "cand-1": { ...entry(), grounds_test: true }, "cand-2": entry() });
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
    fails.push(`(e) the bound is ${REVISE_BOUND} revise round(s) / ${MAX_ATTACHES} attach(es) — §4.11 bounds the loop at ONE revise round per Candidate`);
  }
  const lp = attachLedgerPath(brief, root);
  if (lp.error) fails.push(`(e) the ledger path did not resolve: ${lp.error}`);
  const a1 = attachReview(cands, both("first "), {});
  if (a1.error) fails.push(`(e) the first attach was refused: ${a1.error}`);
  const a2 = attachReview(cands, both("revised "), a1.attaches);
  if (a2.error) fails.push(`(e) the ONE revise round was refused: ${a2.error}`);
  else if ((a2.attaches["cand-1"] || []).length !== 2) fails.push("(e) the revise round was not counted");
  const a3 = a2.error ? null : attachReview(cands, both("third "), a2.attaches);
  if (!a3 || !a3.error || !/cand-1/.test(a3.error) || !/§4\.11/.test(a3.error)
      || !/attach 3/.test(a3.error)) {
    fails.push(`(e) a THIRD attach was not refused by name against §4.11: ${JSON.stringify(a3 && (a3.error || "accepted"))}`);
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
          || !/§4\.11/.test(c.revise_residue.bound)) {
        fails.push(`(f) ${c.candidate_id}'s residue does not state the bound it was written against`);
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

  // The command path writes the ledger the exported arithmetic reads.
  const p2 = attach((() => { const f = join(dir, "review2.json"); writeFileSync(f, JSON.stringify(both("revised "))); return f; })());
  if (p2.status !== 0) fails.push(`(g) the second command attach exited ${p2.status}: ${(p2.stderr || "").trim()}`);
  const led = lp.error ? { error: lp.error } : readAttachLedger(lp.path);
  if (led.error) fails.push(`(g) the ledger the command wrote is unreadable: ${led.error}`);
  else if ((led.attaches["cand-1"] || []).length !== 2) fails.push("(g) the command path did not record the revise round in the run workspace — the count would live in the sitting's memory again");
  const p3 = attach((() => { const f = join(dir, "review3.json"); writeFileSync(f, JSON.stringify(both("third "))); return f; })());
  if (p3.status === 0 || !/§4\.11/.test(p3.stderr || "")) {
    fails.push(`(g) the command path admitted a third attach: ${(p3.stderr || "").trim() || "exit 0"}`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL brief review plumbing (SPEC-draft-pipeline §4.6, story 1.74):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief review: 8/8 cases — (a) per-Candidate reasoning attaches and rides each "
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
  + "unparseable JSON and a body with no `attaches` object both — while an ABSENT one is "
  + "zero rounds spent, because a bound whose count degrades to zero on a bad read is a "
  + "suggestion with a good failure mode. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.74): FOUR mutations, each run once "
  + "and restored surgically — dropping the per-candidate completeness guard failed (b)'s "
  + "by-name refusal; dropping the verdict-key scan failed (c)'s unattachability; raising "
  + "MAX_ATTACHES to 3 failed (e)'s third-attach refusal AND (f)'s residue, since a "
  + "Candidate that never reaches the bound never carries one; counting into the CALLER's "
  + "ledger object instead of a copy failed (g)'s spends-no-round assertion; returning "
  + "`{ attaches: {} }` from the unparseable-JSON branch instead of refusing failed (h). NOT "
  + "COVERED, stated rather than implied: whether the agent's reasoning is sound — the "
  + "grounds test applied well, the prohibitions actually looked for, the arc actually "
  + "traced — is judgment-class (§4.6 clause 3 keeps every MUST un-linted) and belongs to "
  + "the human gate reading the attached reasoning; this member exercises the plumbing that "
  + "makes an unjudged or verdict-bearing Candidate unable to reach that gate. AND NOT "
  + "COVERED: whether the revise actually REPAIRED the gap — the Harness counts the round "
  + "and never judges the repair, so a residue entry says a round was spent, never that a "
  + "gap survived it.");
JS
