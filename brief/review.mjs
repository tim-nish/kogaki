#!/usr/bin/env node
// review — the path-review ATTACH plumbing (SPEC-draft-pipeline §4.6;
// kogaki#490, story 1.74).
//
// THE JUDGE IS THE AGENT, NOT THIS FILE. The path-review agent
// (brief/path-review-agent.md) applies every MUST of §§4.4-4.8 as judgment,
// per Candidate, machine-side. This runtime carries the agent's output ONTO
// the Candidates so it rides into the Candidate-selection gate (§4.6: the
// three evaluation levels survive only as reasoning surfaced on Candidates)
// — and it REFUSES two shapes of drift, both plumbing questions, neither a
// judgment:
//
//   * a Candidate with NO review entry — review runs per Candidate
//     (kogaki#490's own bound: N Candidates never multiply owner
//     questions, because the per-Candidate work is machine-side, HERE);
//   * a verdict-shaped field — `verdict`, `pass`, `score` and kin, or any
//     non-string value. §4.6 clause 3 keeps every MUST un-linted; an agent
//     that emitted a boolean would be a lint wearing prose's clothing, so
//     the verdict is UNATTACHABLE rather than merely discouraged.
//
// Nothing here reads the reasoning's content. Whether the grounds test was
// applied well is the human gate's question, on the reasoning this file
// attaches.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function fail(msg) {
  process.stderr.write(`review: ${msg}\n`);
  process.exit(1);
}

// The five §§4.4-4.8 areas plus the three evaluation levels, every one a
// non-empty prose field. The list is the agent contract's output shape —
// one carrier (path-review-agent.md documents it; this file enforces it).
export const REVIEW_AREAS = [
  "grounds_test",      // §4.5 — the Move name deleted, the rationale stands
  "entailment",        // §4.4 — entailed flags judged, reasoning exposed
  "prohibitions",      // §4.4 — the closed unsupported-completion list
  "semantic_economy",  // §4.7 — in-place Move edits only, never mechanized
  "arc_integrity",     // §4.8 — the arc's causality survives rearrangement
  "evaluation_levels", // §4.6 — the three levels, observed and never scored
];

// Verdict-shaped keys, refused wherever they appear in a review entry.
const VERDICT_KEYS = new Set(["verdict", "pass", "fail", "passed", "failed",
  "score", "grade", "ok", "approved", "rating", "result", "status"]);

// Pure; exported for the check. Returns { error } or { candidates } — the
// input candidates with `review` attached to each.
export function attachReview(candidates, review) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { error: "candidates must be a non-empty array" };
  }
  const out = [];
  for (const c of candidates) {
    if (typeof c.candidate_id !== "string" || c.candidate_id === "") {
      return { error: "every candidate carries a candidate_id" };
    }
    const r = review?.[c.candidate_id];
    if (r === undefined) {
      // REVIEW RUNS PER CANDIDATE: a Candidate the agent never reviewed has
      // no reasoning for the gate, and silently passing it forward would
      // put an unjudged Candidate in front of the owner as if judged.
      return { error: `candidate ${c.candidate_id} has no review entry — path review runs `
        + `machine-side PER CANDIDATE (§4.6; kogaki#490), and an unreviewed Candidate `
        + `cannot ride into the selection gate as if reviewed` };
    }
    for (const [k, v] of Object.entries(r)) {
      if (VERDICT_KEYS.has(k)) {
        return { error: `candidate ${c.candidate_id}: review field ${JSON.stringify(k)} is `
          + `verdict-shaped — the agent's output is REASONING SURFACED FOR THE HUMAN GATE, `
          + `never a verdict, never a lint (§4.6 clauses 1 and 3)` };
      }
      if (typeof v !== "string" || v === "") {
        return { error: `candidate ${c.candidate_id}: review field ${JSON.stringify(k)} is `
          + `not non-empty prose — a boolean or number is a verdict wearing a type (§4.6)` };
      }
    }
    for (const area of REVIEW_AREAS) {
      if (!(area in r)) {
        return { error: `candidate ${c.candidate_id}: review lacks ${JSON.stringify(area)} — `
          + `every MUST of §§4.4-4.8 is applied per Candidate, and an absent area is an `
          + `unapplied one (brief/path-review-agent.md declares the shape)` };
      }
    }
    out.push({ ...c, review: r });
  }
  return { candidates: out };
}

function argString(args, key, usage) {
  const v = args[key];
  if (typeof v !== "string" || v === "") fail(usage);
  return v;
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

function cmdAttach(args) {
  const candidates = JSON.parse(readFileSync(argString(args, "candidates",
    "attach needs --candidates <json> — the assembled Candidates (machine-local run state)"), "utf8"));
  const review = JSON.parse(readFileSync(argString(args, "review",
    "attach needs --review <json> — the path-review agent's per-Candidate reasoning "
    + "(brief/path-review-agent.md declares the shape)"), "utf8"));
  const out = argString(args, "out",
    "attach needs --out <path> — the machine-local file the reviewed Candidates ride "
    + "to the selection gate in");
  const r = attachReview(candidates, review);
  if (r.error) fail(r.error);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify({ candidates: r.candidates }, null, 2) + "\n");
  console.log(`reviewed: ${r.candidates.length} candidate(s), each carrying its per-Candidate `
    + `reasoning for the selection gate — no verdict anywhere (§4.6). Written: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "attach": cmdAttach(args); break;
    default: fail("usage: review.mjs attach --candidates <json> --review <json> --out <path>");
  }
}
