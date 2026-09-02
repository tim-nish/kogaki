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
set -u
cd "$(dirname "$0")/.."

node --input-type=module - <<'JS'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { attachReview, REVIEW_AREAS } from "./src/review.mjs";

const fails = [];
const dir = mkdtempSync(join(tmpdir(), "brief-review-"));

const cands = [
  { candidate_id: "cand-1", steps: ["s1", "s2"] },
  { candidate_id: "cand-2", steps: ["s2", "s1"] },
];
const entry = () => Object.fromEntries(REVIEW_AREAS.map((a) => [a,
  `reasoning for ${a}: what was looked for and what was found, in prose the owner can weigh`]));
const review = { "cand-1": entry(), "cand-2": entry() };

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
  const cf = join(dir, "cands.json"); const rf = join(dir, "review.json"); const of = join(dir, "reviewed.json");
  writeFileSync(cf, JSON.stringify(cands)); writeFileSync(rf, JSON.stringify(review));
  const p = spawnSync(process.execPath, ["src/review.mjs", "attach", "--candidates", cf, "--review", rf, "--out", of], { encoding: "utf8" });
  if (p.status !== 0) fails.push(`(d) attach exited ${p.status}: ${(p.stderr || "").trim()}`);
  const disk = JSON.parse(readFileSync(of, "utf8"));
  if (JSON.stringify(disk.candidates) !== JSON.stringify(attachReview(cands, review).candidates)) {
    fails.push("(d) the command's output differs from the exported function's — two producers");
  }
  if (!/no verdict anywhere/.test(p.stdout || "")) fails.push("(d) the command does not state the no-verdict property in its own output");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (fails.length) {
  console.log("FAIL brief review plumbing (SPEC-draft-pipeline §4.6, story 1.74):");
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}
console.log("brief review: 4/4 cases — (a) per-Candidate reasoning attaches and rides each "
  + "Candidate with every §§4.4-4.8 area present; (b) an unreviewed Candidate is refused BY "
  + "NAME and a missing area refuses — review runs machine-side per Candidate and never "
  + "multiplies owner questions; (c) a verdict is UNATTACHABLE — verdict-shaped keys refused "
  + "by name, non-string values refused as verdicts wearing a type; (d) the command path "
  + "agrees byte-for-byte with the exported function and states the no-verdict property in "
  + "its own output. "
  + "MUTATION EVIDENCE (assert-by-breaking-once, story 1.74): TWO mutations, each run once "
  + "and restored surgically — dropping the per-candidate completeness guard failed (b)'s "
  + "by-name refusal; dropping the verdict-key scan failed (c)'s unattachability. NOT "
  + "COVERED, stated rather than implied: whether the agent's reasoning is sound — the "
  + "grounds test applied well, the prohibitions actually looked for, the arc actually "
  + "traced — is judgment-class (§4.6 clause 3 keeps every MUST un-linted) and belongs to "
  + "the human gate reading the attached reasoning; this member exercises the plumbing that "
  + "makes an unjudged or verdict-bearing Candidate unable to reach that gate.");
JS
