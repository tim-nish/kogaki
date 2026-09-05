#!/usr/bin/env node
// review — the path-review ATTACH plumbing (SPEC-draft-pipeline §4.6;
// kogaki#490, story 1.74).
//
// THE JUDGE IS THE AGENT, NOT THIS FILE. The path-review agent
// (src/path-review-agent.md) applies every MUST of §§4.4-4.8 as judgment,
// per Candidate, machine-side. This runtime carries the agent's output ONTO
// the Candidates so it rides into the Candidate-selection gate (§4.6: the
// three evaluation levels survive only as reasoning surfaced on Candidates)
// — and it REFUSES three shapes of drift, all plumbing questions, none a
// judgment:
//
//   * a Candidate with NO review entry — review runs per Candidate
//     (kogaki#490's own bound: N Candidates never multiply owner
//     questions, because the per-Candidate work is machine-side, HERE);
//   * a verdict-shaped field — `verdict`, `pass`, `score` and kin, or any
//     non-string value. §4.6 clause 3 keeps every MUST un-linted; an agent
//     that emitted a boolean would be a lint wearing prose's clothing, so
//     the verdict is UNATTACHABLE rather than merely discouraged.
//   * a THIRD attach on one Candidate — §4.11 bounds the revise loop at ONE
//     revise round per Candidate, and until kogaki#894 nothing counted the
//     round. The count lived in the composing sitting's memory, which is to
//     say nowhere a later act could read: a Candidate re-reviewed three times
//     reached assembly with no refusal and no disclosure. A bound the Harness
//     cannot count is not a bound, so the count is HERE, written by this file
//     into the run workspace and read back by it.
//
// Nothing here reads the reasoning's content. Whether the grounds test was
// applied well is the human gate's question, on the reasoning this file
// attaches. THE ROUND COUNT IS THE ONE THING THIS FILE COUNTS, and it counts
// it over the reasoning's IDENTITY (a sha of the attached entry), never over
// its meaning -- so re-running an attach with the same reasoning is the
// recovery this repository's commands all promise, while attaching DIFFERENT
// reasoning is what spends a round.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runDestination, RunsRefusal } from "./runs.mjs";
import { disclosureSurface } from "./disclosure.mjs";

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

// ---------------------------------------------------------------------------
// The revise-round ledger (SPEC-draft-pipeline §4.11; kogaki#894).
//
// §4.11: "The loop is bounded at one revise round per Candidate; a gap
// surviving it is disclosed and rides to the gate, never re-looped." So a
// Candidate may be attached TWICE — once for the first review, once for the
// re-review after its one revise — and a third attach is refused.
export const REVISE_BOUND = 1;
export const MAX_ATTACHES = REVISE_BOUND + 1;

// The ledger's home is HARNESS-RESOLVED, from the Brief's own identity, never
// from a path a caller hands in. `--out` is a caller-chosen file and would let
// a second attach land beside the first with a fresh count; the slug is what
// the Brief IS, so `runs/brief/<slug>/` names the same workspace on every
// invocation for the same Brief. `runDestination` is the pure resolver — this
// creates nothing and prunes nothing, per `runs.mjs`'s own split.
export const ATTACH_LEDGER = "review-attach-ledger.json";

export function briefSlug(briefPath) {
  const slug = basename(dirname(resolve(briefPath)));
  if (!slug || slug === "." || slug === "theses") {
    return { error: `${briefPath} does not sit at theses/<slug>/brief.md — the revise-round `
      + `ledger is keyed on the Brief's slug, which is the workspace identity `
      + `runs/brief/<slug>/ is named for (§4.11; kogaki#894)` };
  }
  return { slug };
}

export function attachLedgerPath(briefPath, root = undefined) {
  const s = briefSlug(briefPath);
  if (s.error) return s;
  try {
    const dest = root === undefined
      ? runDestination("brief", s.slug)
      : runDestination("brief", s.slug, root);
    return { path: join(dest, ATTACH_LEDGER) };
  } catch (e) {
    if (e instanceof RunsRefusal) return { error: e.message };
    throw e;
  }
}

// THE KEY IS THE REASONING'S IDENTITY, NOT THE CALL. A round is spent by
// attaching DIFFERENT reasoning for a Candidate; re-attaching the same entry
// is the idempotent re-run every command in this repository promises as its
// recovery, and charging it a round would make recovery cost the bound.
export function reviewEntrySha(entry) {
  const canonical = JSON.stringify(Object.keys(entry).sort().map((k) => [k, entry[k]]));
  return createHash("sha256").update(canonical).digest("hex");
}

// ONE THING THIS CANNOT SEE, STATED RATHER THAN LEFT (PR #908 round 1). The
// ledger lives INSIDE `runs/brief/<slug>/`, which `enterRun` prunes keep-last
// per `src/runs.json`. A pruned workspace leaves no file, and no file reads as
// no rounds spent — the degrades-to-zero shape the corrupt-read branch below
// refuses, arriving by a different door. The ledger's lifetime IS the lane's
// retention bound. It is low risk rather than no risk (a Candidate's first
// attach and its one revise sit inside a single composing sitting, and each
// attach keeps the directory fresh), and it is written down because the
// alternative is discovering it as a bound that quietly did not hold.
export function readAttachLedger(path) {
  if (!existsSync(path)) return { attaches: {} };
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    // A LEDGER THAT CANNOT BE READ IS NOT AN EMPTY ONE. Treating a corrupt
    // file as "no rounds spent" is the fallback shape that turns a bound into
    // a suggestion — the failure mode kogaki#872 names one lane over.
    return { error: `${path} is not readable as the revise-round ledger (${e.message}) — a `
      + `ledger that cannot be read is NOT an empty one, and a bound whose count degrades to `
      + `zero on a bad read is not a bound (§4.11; kogaki#894). Inspect or remove it deliberately.` };
  }
  if (!raw || typeof raw !== "object" || typeof raw.attaches !== "object" || raw.attaches === null
      || Array.isArray(raw.attaches)) {
    return { error: `${path} does not carry an \`attaches\` object — the revise-round ledger's shape` };
  }
  // THE VALUES ARE CHECKED, NOT ONLY THE CONTAINER (PR #910 round 1). Validating
  // `attaches` as an object and stopping there left a third door into the
  // degrade-to-zero the branch above refuses: `{"attaches": {"cand-1": 5}}`
  // parses, passes a container-shaped check, and restores cand-1 to zero rounds
  // spent — admitting a third and a fourth attach with no refusal. An entry
  // that is not an array of round records IS a damaged ledger, and this file's
  // own rule is that a damaged ledger refuses rather than reading as empty.
  for (const [id, rounds] of Object.entries(raw.attaches)) {
    if (!Array.isArray(rounds)) {
      return { error: `${path}: the entry for candidate ${JSON.stringify(id)} is not an array of `
        + `round records — a damaged ledger REFUSES rather than reading as zero rounds spent `
        + `(§4.11; kogaki#894), because a count that degrades to zero on a bad read is a `
        + `suggestion with a good failure mode` };
    }
    for (const r of rounds) {
      if (!r || typeof r !== "object" || Array.isArray(r)
          || !Number.isInteger(r.round) || typeof r.sha !== "string" || typeof r.at !== "string") {
        return { error: `${path}: candidate ${JSON.stringify(id)} carries a malformed round record `
          + `(each is { round, sha, at }) — a damaged ledger REFUSES rather than reading as zero `
          + `rounds spent (§4.11; kogaki#894)` };
      }
    }
  }
  return { attaches: raw.attaches, brief: raw.brief };
}

export function writeAttachLedger(path, ledger) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(ledger, null, 2) + "\n");
}

// Pure; exported for the check. Returns { error } or { candidates, attaches }
// — the input candidates with `review` attached to each, plus the ledger state
// this attach produces. IT WRITES NOTHING: the caller persists `attaches`, so a
// refusal spends no round and a fixture can assert the arithmetic in-process.
//
// `attaches` in is the ledger's own map, candidate_id -> [{ round, sha, at }].
export function attachReview(candidates, review, attaches = {}, now = new Date()) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { error: "candidates must be a non-empty array" };
  }
  if (!attaches || typeof attaches !== "object") {
    return { error: "attaches must be the ledger's candidate_id -> rounds map" };
  }
  const stamp = (now instanceof Date ? now : new Date(now)).toISOString();
  // NO COERCION (PR #910 round 1). `Array.isArray(v) ? [...v] : []` was the
  // fallback: a non-array entry became an empty one, and the Candidate it
  // belonged to silently regained its spent rounds. The reader above refuses
  // such a ledger, and this refuses it again for a caller who did not come
  // through the reader — the same both-doors discipline `--brief` gets.
  const nextAttaches = {};
  for (const [k, v] of Object.entries(attaches)) {
    if (!Array.isArray(v)) {
      return { error: `the ledger entry for candidate ${JSON.stringify(k)} is not an array of round `
        + `records — a damaged ledger REFUSES rather than reading as zero rounds spent (§4.11)` };
    }
    nextAttaches[k] = [...v];
  }
  const out = [];
  for (const c of candidates) {
    if (typeof c.candidate_id !== "string" || c.candidate_id === "") {
      return { error: "every candidate carries a candidate_id" };
    }
    // THE RESIDUE IS HARNESS-WRITTEN OR IT IS NOTHING (kogaki#894 acceptance
    // 2). A Candidate arriving with its own is a model-declared line wearing
    // the Harness's field name — the exact substitution `bridges` already is,
    // and the one this issue exists to stop being repeated one field over.
    if ("revise_residue" in c) {
      return { error: `candidate ${c.candidate_id} arrives carrying \`revise_residue\` — that entry `
        + `is written by THIS FILE from the revise-round ledger, never declared by the composer `
        + `(§4.11; kogaki#894). A declared residue is a model-supplied control input.` };
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
          + `unapplied one (src/path-review-agent.md declares the shape)` };
      }
    }
    // --- the round count, and the bound (§4.11) --------------------------
    const sha = reviewEntrySha(r);
    const prior = nextAttaches[c.candidate_id] || [];
    const last = prior.length ? prior[prior.length - 1] : null;
    let rounds = prior;
    if (!last || last.sha !== sha) {
      if (prior.length >= MAX_ATTACHES) {
        const when = prior.map((a) => `round ${a.round} at ${a.at}`).join("; ");
        return { error: `candidate ${c.candidate_id}: this is attach ${prior.length + 1}, and `
          + `§4.11 bounds the loop at ONE revise round per Candidate — it has already been `
          + `attached ${prior.length} times (${when}). A gap surviving the revise is DISCLOSED `
          + `and rides to the selection gate; it is never re-looped. The residue entry this `
          + `Candidate already carries is that disclosure.` };
      }
      rounds = [...prior, { round: prior.length + 1, sha, at: stamp }];
      nextAttaches[c.candidate_id] = rounds;
    }
    const attached = { ...c, review: r };
    // A Candidate at the bound rides to the gate carrying WHY it stops here.
    // Written from the ledger, so it exists exactly when a revise round was
    // actually spent — never because a composer said so.
    if (rounds.length >= MAX_ATTACHES) {
      // THE WRITE IS REFUSED WHERE THE FIELD REACHES NO OWNER (kogaki#909,
      // owner ruling 2026-09-06). `revise_residue` is disclosure-class
      // evidence, and `src/disclosure-fields.json` is where a disclosure-class
      // field declares the surface it reaches. Writing one the table does not
      // name is how this defect was found in the first place — the entry
      // existed, a later act could read it, and no owner surface carried it —
      // so the Harness refuses to mint it rather than minting it and leaving
      // the absence to be discovered a field at a time.
      if (!disclosureSurface("revise_residue")) {
        return { error: `candidate ${c.candidate_id} reached the revise bound, and the entry `
          + `recording that is disclosure-class evidence naming no owner surface — `
          + `src/disclosure-fields.json declares no \`revise_residue\`. A record the owner `
          + `never sees does not discharge a disclosure; declare the field and its grade `
          + `there, under its own issue` };
      }
      attached.revise_residue = {
        attaches: rounds.length,
        bound: `${REVISE_BOUND} revise round per Candidate (SPEC-draft-pipeline §4.11)`,
        first_attached_at: rounds[0].at,
        revise_attached_at: rounds[rounds.length - 1].at,
        // PRECISE ABOUT ITS OWN BOUND (PR #908 round 1). "cannot be re-reviewed
        // again" was false for the case the design deliberately allows:
        // re-attaching the SAME reasoning is accepted and spends nothing. This
        // sentence rides to the gate as the Harness's words about its own
        // arithmetic, so it says what the arithmetic actually does.
        statement: "this Candidate has spent its one revise round; anything the revise did not "
          + "repair rides to the selection gate as disclosed residue, and this Candidate cannot "
          + "be re-reviewed with DIFFERENT reasoning (re-attaching the same reasoning is "
          + "accepted and spends nothing)",
      };
    }
    out.push(attached);
  }
  return { candidates: out, attaches: nextAttaches };
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
    + "(src/path-review-agent.md declares the shape)"), "utf8"));
  const out = argString(args, "out",
    "attach needs --out <path> — the machine-local file the reviewed Candidates ride "
    + "to the selection gate in");
  // REQUIRED, and it is the identity the ROUND COUNT is keyed on — not a
  // convenience. Without it the bound has no workspace to be counted in, and
  // §4.11's "one revise round per Candidate" is prose again (kogaki#894).
  const brief = argString(args, "brief",
    "attach needs --brief <path> — theses/<slug>/brief.md. The slug names the run workspace "
    + "runs/brief/<slug>/ the revise-round ledger lives in, and §4.11's one-revise-round bound "
    + "is counted THERE rather than in the composing sitting's memory (kogaki#894)");
  // THE LEDGER'S HOME IS NOT A COMMAND-LINE ARGUMENT (PR #908 round 1). A
  // `--ledger-root` flag was exactly the shape §4.11's Harness-resolved-home
  // bullet rules out one paragraph away — a caller-chosen path lets a second
  // attach land beside the first with a fresh count. The fixture's need is
  // real (counting into the developer's live `runs/` would spend a real
  // Brief's bound), so the seam survives as a NAMED FIXTURE VARIABLE, off the
  // command line and stated in the spec bullet: nothing composes it by
  // accident, and it does not read as a supported way to run the lane.
  const lp = attachLedgerPath(brief, process.env.KOGAKI_ATTACH_LEDGER_ROOT_FOR_TESTS);
  if (lp.error) fail(lp.error);
  const prior = readAttachLedger(lp.path);
  if (prior.error) fail(prior.error);
  const r = attachReview(candidates, review, prior.attaches);
  // THE LEDGER IS WRITTEN ONLY ON SUCCESS. A refused attach spends no round —
  // otherwise a malformed review entry would consume the revise the Candidate
  // has not yet had, and the bound would punish the composer for a typo.
  if (r.error) fail(r.error);
  writeAttachLedger(lp.path, { brief, attaches: r.attaches });
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, JSON.stringify({ candidates: r.candidates }, null, 2) + "\n");
  const spent = r.candidates.filter((c) => c.revise_residue).map((c) => c.candidate_id);
  console.log(`reviewed: ${r.candidates.length} candidate(s), each carrying its per-Candidate `
    + `reasoning for the selection gate — no verdict anywhere (§4.6). Written: ${out}`);
  console.log(`revise rounds (§4.11, bound ${REVISE_BOUND} per Candidate), counted in ${lp.path}: `
    + r.candidates.map((c) => `${c.candidate_id}=${(r.attaches[c.candidate_id] || []).length}`).join(", ")
    + (spent.length
      ? ` — at the bound and carrying a Harness-written residue entry: ${spent.join(", ")}`
      : " — none at the bound"));
}

const args = parseArgs(process.argv.slice(2));
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  switch (args._cmd) {
    case "attach": cmdAttach(args); break;
    default: fail("usage: review.mjs attach --candidates <json> --review <json> --brief <path> --out <path>");
  }
}
