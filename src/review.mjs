#!/usr/bin/env node
// review — the path-review ATTACH plumbing (kogaki#490).
// [see: SPEC-draft-pipeline "Every MUST is judgment, and nothing becomes a
// lint"]
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// The quoted heading beside a name is the spec content that name stands for.
// THE NAMES THIS FILE USES, and the spec each one names:
//   the judgment rule
//       SPEC-draft-pipeline "Every MUST is judgment, and nothing becomes a lint"
//   the five review areas
//       SPEC-draft-pipeline "What a Leg claims, and the `entailed` flag",
//       "The grounds test — the observable form of describe-never-generate",
//       "Semantic economy — what binds Move AUTHORING", "Journey integrity —
//       the arc, not the layout", and the judgment rule
//
// THE JUDGE IS THE AGENT, NOT THIS FILE. The path-review agent
// (src/path-review-agent.md) applies every MUST of the five review areas as
// judgment, per Candidate, machine-side. This runtime carries the agent's output ONTO
// the Candidates so it rides into the Candidate-selection gate (the
// three evaluation levels survive only as reasoning surfaced on Candidates)
// — and it REFUSES two shapes of drift, both plumbing questions, neither a
// judgment:
//
//   * a Candidate with NO review entry — review runs per Candidate
//     (kogaki#490's own bound: N Candidates never multiply owner
//     questions, because the per-Candidate work is machine-side, HERE);
//   * a verdict-shaped field — `verdict`, `pass`, `score` and kin, or any
//     non-string value. Nothing becomes a lint; an agent
//     that emitted a boolean would be a lint wearing prose's clothing, so
//     the verdict is UNATTACHABLE rather than merely discouraged.
//
// Nothing here reads the reasoning's content, and NOTHING HERE COUNTS
// (kogaki#1307). Whether the grounds test was applied well is the human gate's
// question, on the reasoning this file attaches. The revise pass that once routed
// a reviewed Candidate back to composition was run by no state of the Brief
// table, so its round bound, its Arms and its attach ledger were removed: an
// attach is an idempotent carry, and attaching twice refuses nothing.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function fail(msg) {
  process.stderr.write(`review: ${msg}\n`);
  process.exit(1);
}

// The five review areas plus the three evaluation levels, every one a
// non-empty prose field. The list is the agent contract's output shape —
// one carrier (path-review-agent.md documents it; this file enforces it).
export const REVIEW_AREAS = [
  "rationale_stands",  // the Move name deleted, the rationale stands
  "entailment",        // entailed flags judged, reasoning exposed
  "prohibitions",      // the closed unsupported-completion list
  "semantic_economy",  // in-place Move edits only, never mechanized
  "arc_integrity",     // the arc's causality survives rearrangement
  "evaluation_levels", // the three levels, observed and never scored
];

// Verdict-shaped keys, refused wherever they appear in a review entry.
const VERDICT_KEYS = new Set(["verdict", "pass", "fail", "passed", "failed",
  "score", "grade", "ok", "approved", "rating", "result", "status"]);

// THE DISCHARGE (kogaki#1283). A review item added to `review_path`
// alongside the six prose REVIEW_AREAS, carrying an EXPLICIT verdict rather
// than prose: unlike the review areas, the judgment here is not whether the
// Candidate's writing is good but whether a Closure row's claims answer it --
// a closed-set answer the human gate reads as a verdict on purpose, the same
// shape the Move-fit judge's `consistent`/`contradicts` already is inside the
// compose job.
//
// THE QUESTION CHAIN IS RETIRED (kogaki#1325). It was the second such item:
// whether Leg N's after-state question line and Leg N+1's before-state
// question line named the same question. A Leg's before-state is now the
// previous Leg's after-state by construction, so the two lines are one line;
// a record carrying `question_chain` is refused by name below rather than
// read as a seventh prose area.
export const DISCHARGE_VERDICTS = ["fails", "holds"];
const STRUCTURED_REVIEW_KEYS = new Set(["discharge"]);

// ---------------------------------------------------------------------------
// THE CLAIM REGISTER (kogaki#1281, owner decision 2026-10-06). A claim is
// stated in everyday words plus whatever the Persona's `prior_knowledge`
// grants, plus any word an `introduces` ledger entry on this Leg or an
// earlier one carries. The claim register is the JUDGED half of that rule,
// one entry per Leg: whether any claim line on that Leg uses a term of art
// that is neither everyday nor carried forward. This is judgment, never a
// mechanical word list [see: SPEC-draft-pipeline "Every MUST is judgment,
// and nothing becomes a lint"] — `claimRegisterRefusal` checks only the
// SHAPE (one entry per Leg, a closed verdict, a named word on `fails`), the
// same split `attachReview`'s own REVIEW_AREAS loop already holds for the
// five review areas.
export const CLAIM_REGISTER_VERDICTS = ["holds", "fails"];

// Pure; exported for the check. `entries` is the reply's own `claim_register`
// value; `legs` is the Candidate's own Legs, in order. Returns a refusal
// string or null.
export function claimRegisterRefusal(entries, legs) {
  // Only a real Leg record (an object, carrying `leg_id`) raises the
  // register at all: a caller outside the compose_path/review_path pair --
  // src/review.mjs's own generic plumbing is exercised by callers that never
  // declare a Leg shape at all, holding `legs` as plain strings or omitting
  // it -- owes this file no claim_register and is refused nothing.
  const legList = (Array.isArray(legs) ? legs : []).filter((l) => l && typeof l === "object");
  if (entries === undefined && legList.length === 0) return null;
  if (!Array.isArray(entries)) {
    return `claim_register must be an array, one entry per Leg (${legList.length} Leg(s)) — `
      + `the vocabulary rule is judged PER LEG, never once for the whole Candidate`;
  }
  if (entries.length !== legList.length) {
    return `claim_register carries ${entries.length} entry(ies) for ${legList.length} Leg(s) — `
      + `one entry per Leg, in Leg order`;
  }
  for (let i = 0; i < legList.length; i++) {
    const leg = legList[i];
    const e = entries[i];
    const at = `claim_register[${i}] (leg ${leg && leg.leg_id})`;
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      return `${at} is not an entry object`;
    }
    if (e.leg_id !== undefined && e.leg_id !== leg.leg_id) {
      return `${at} names leg_id ${JSON.stringify(e.leg_id)}, not ${JSON.stringify(leg && leg.leg_id)} — `
        + `entries ride in the Candidate's own Leg order`;
    }
    if (!CLAIM_REGISTER_VERDICTS.includes(e.verdict)) {
      return `${at}: verdict ${JSON.stringify(e.verdict)} is not one of `
        + `${CLAIM_REGISTER_VERDICTS.join("/")} — the vocabulary this judgment uses is closed`;
    }
    if (e.verdict === "fails" && (typeof e.word !== "string" || e.word.trim() === "")) {
      return `${at} fails and names no \`word\` — a \`fails\` verdict names the term of art `
        + `that is neither everyday nor carried by the Persona or the \`introduces\` ledger`;
    }
  }
  return null;
}

// Pure; exported for the check. Returns { error } or { candidates } — the
// input candidates with `review` attached to each. IT WRITES NOTHING and COUNTS
// NOTHING (kogaki#1307): the same reasoning attached twice is the same result.
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
        + `machine-side PER CANDIDATE (kogaki#490), and an unreviewed Candidate `
        + `cannot ride into the selection gate as if reviewed` };
    }
    if (r && typeof r === "object" && "question_chain" in r) {
      return { error: `candidate ${c.candidate_id}: \`question_chain\` is a retired review item (kogaki#1325) — `
        + "a Leg's before-state is the previous Leg's after-state, so the two question lines it compared are one "
        + "line. Remove the field; the Move's `after` question is judged at Move fit." };
    }
    for (const [k, v] of Object.entries(r)) {
      if (STRUCTURED_REVIEW_KEYS.has(k)) continue;
      if (VERDICT_KEYS.has(k)) {
        return { error: `candidate ${c.candidate_id}: review field ${JSON.stringify(k)} is `
          + `verdict-shaped — the agent's output is REASONING SURFACED FOR THE HUMAN GATE, `
          + `never a verdict, never a lint` };
      }
      // `claim_register` IS NOT PROSE (kogaki#1281): it is one judged entry per
      // Leg, checked below by `claimRegisterRefusal` against the Candidate's
      // own Legs — the one field this loop's "non-empty string" rule does not
      // apply to, named here rather than left to fail the generic check.
      if (k === "claim_register") continue;
      if (typeof v !== "string" || v === "") {
        return { error: `candidate ${c.candidate_id}: review field ${JSON.stringify(k)} is `
          + `not non-empty prose — a boolean or number is a verdict wearing a type` };
      }
    }
    for (const area of REVIEW_AREAS) {
      if (!(area in r)) {
        return { error: `candidate ${c.candidate_id}: review lacks ${JSON.stringify(area)} — `
          + `every MUST of the five review areas is applied per Candidate, and an absent area is an `
          + `unapplied one (src/path-review-agent.md declares the shape)` };
      }
    }
    // THE CLAIM REGISTER (kogaki#1281): one judged entry per Leg, checked
    // against the Candidate's own Legs — never against the review areas'
    // "non-empty prose" rule above, because its value is a structured array.
    {
      const crErr = claimRegisterRefusal(r.claim_register, c.legs);
      if (crErr) return { error: `candidate ${c.candidate_id}: ${crErr}` };
    }
    // THE DISCHARGE (kogaki#1283) — one entry per Closure row carrying
    // `discharged_by`, named by the row's own text and its discharging Leg.
    // VALIDATED WHEN PRESENT, the same as `bridges`/`introduces` on a Leg
    // (src/compose.mjs): a caller whose Candidates carry no real Closure rows
    // (the plumbing fixtures in checks/check-brief-review.sh) has nothing this
    // item could name, and is not this bullet's concern to retrofit.
    if ("discharge" in r) {
      const dischargedRows = (Array.isArray(c.obligations) ? c.obligations : [])
        .filter((o) => o && o.discharged_by !== undefined);
      if (!Array.isArray(r.discharge) || r.discharge.length !== dischargedRows.length) {
        return { error: `candidate ${c.candidate_id}: \`discharge\` is not an array of exactly `
          + `${dischargedRows.length} entr${dischargedRows.length === 1 ? "y" : "ies"} — one per Closure row `
          + `carrying \`discharged_by\`` };
      }
      for (let i = 0; i < dischargedRows.length; i++) {
        const entry = r.discharge[i];
        const row = dischargedRows[i];
        if (!entry || typeof entry !== "object" || Array.isArray(entry)
            || entry.row !== row.text || entry.discharging_leg !== row.discharged_by) {
          return { error: `candidate ${c.candidate_id}: discharge entry ${i + 1} does not name Closure row `
            + `${JSON.stringify(row.text)} and its discharging leg ${JSON.stringify(row.discharged_by)}` };
        }
        if (!DISCHARGE_VERDICTS.includes(entry.verdict)) {
          return { error: `candidate ${c.candidate_id}: discharge entry ${i + 1} (row `
            + `${JSON.stringify(row.text)}): verdict ${JSON.stringify(entry.verdict)} is not one of `
            + `${DISCHARGE_VERDICTS.map((v) => JSON.stringify(v)).join(", ")}` };
        }
        if (typeof entry.why !== "string" || entry.why === "") {
          return { error: `candidate ${c.candidate_id}: discharge entry ${i + 1} (row `
            + `${JSON.stringify(row.text)}) carries no \`why\`` };
        }
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

// EXPORTED AT kogaki#1108 for the Brief workflow table's `attach_review` state,
// on `cmdAssemble`'s own ground one file over: the state binds the CASE, so the
// attach reached from a table is the one reached from a command line.
export function cmdAttach(args) {
  const candidates = JSON.parse(readFileSync(argString(args, "candidates",
    "attach needs --candidates <json> — the assembled Candidates (machine-local run state)"), "utf8"));
  const review = JSON.parse(readFileSync(argString(args, "review",
    "attach needs --review <json> — the path-review agent's per-Candidate reasoning "
    + "(src/path-review-agent.md declares the shape)"), "utf8"));
  const out = argString(args, "out",
    "attach needs --out <path> — the machine-local file the reviewed Candidates ride "
    + "to the selection gate in");
  const r = attachReview(candidates, review);
  if (r.error) fail(r.error);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify({ candidates: r.candidates }, null, 2) + "\n");
  console.log(`reviewed: ${r.candidates.length} candidate(s), each carrying its per-Candidate `
    + `reasoning for the selection gate — no verdict anywhere. Written: ${out}`);
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "attach": cmdAttach(args); break;
    default: fail("usage: review.mjs attach --candidates <json> --review <json> --out <path>");
  }
}
