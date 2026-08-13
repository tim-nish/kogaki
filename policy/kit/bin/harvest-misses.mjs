#!/usr/bin/env node
// MISS HARVESTING — a recorded consult outcome token proposes the map entry for
// the occasion that produced it (story 1.40, licensed by kogaki#260, umbrella
// kogaki#222).
//
// WHAT THIS HARVESTS. The consultation map grows by its own miss loop, and the
// miss is already recorded: every receipt carries an `outcome:` token from the
// hub's ratified triple, and two of its three values SAY a consultation did not
// discriminate. Nothing read them. This does — it turns the two miss-states
// into candidate map entries for the occasions that produced them.
//
// WHY IT LIVES IN THE KIT AND STORY 1.41'S PROPOSER DOES NOT. Owner decision
// 2026-08-08 (kogaki#222), recorded at `policy/consultation-map.md`
// §"`deferred-slot: proposer-siting` is FILLED". The axis is PORTABILITY: this
// proposer's whole input is the receipt's `outcome` token, whose value set is
// the HUB's and not this repository's, so it works unchanged in any
// kit-installing consumer and travels with the kit. Receipt-absence mining
// reads an artifact this repository authors, cannot travel, and stays in
// `tools/`.
//
// PROPOSAL-ONLY (AC3). This writes `policy/consultation-map.md` never, under
// any flag. A proposer that admitted its own findings is the second authority
// the map's Invariant 2 refuses — "an entry that starts answering is a second
// authority growing in the dark". Output is candidate text for the owner's
// admission act and nothing else.
//
// IT NAMES THE OCCASION, NEVER THE VERDICT (AC5). The emitted candidate carries
// trigger terms, a read prescription, the served line at its pin, and a
// pointer. It carries NO field that could hold an answer, and that absence is
// asserted from this file's own source rather than promised in this comment —
// because a proposal that carries an answer is exactly what Invariant 2 exists
// to keep out of the map, and the proposer refuses it here rather than leaving
// it for the admission gate to catch.
//
// NOT A CHECK. A proposer gates nothing and denies nothing.
//
// usage:
//   policy/kit/bin/harvest-misses.mjs [--base <ref>] [--head <ref>]
//   policy/kit/bin/harvest-misses.mjs --source-file <path>
//   policy/kit/bin/harvest-misses.mjs --self-test

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// THE RECEIPT GRAMMAR, read at the shape `checks/check-consult-receipts.sh`
// already parses — never re-derived from prose. Line one, then indented
// continuation keys belonging to it.
const RECEIPT = /^[ \t]*consulted:[ \t]*(.+)$/;
const CONT = /^[ \t]+(request_id|outcome|disposition|query|axis):[ \t]*(.*)$/;

// USE VS MENTION (kogaki#41) — a fenced block is DOCUMENTATION, never a
// receipt. `checks/check-consult-receipts.sh` strips fences before parsing
// (`emitted = FENCE.sub('', source)`) and carries a fixture asserting a doc
// block quoting the grammar yields ZERO receipts. This file had no fence rule
// at all, so a commit message or PR body DOCUMENTING the grammar harvested as
// a real miss and produced a spurious candidate map entry — a proposal for an
// occasion that never happened, offered to the admission gate as if it had
// (PR #415 round 1).
const FENCE = /^[ \t]*(`{3,}|~{3,})[\s\S]*?(?:^[ \t]*\1[ \t]*$|$(?![\s\S]))/gm;

// THE HUB'S RATIFIED TRIPLE, AND THE CONSUMER MINTS NO FOURTH TOKEN (AC2).
// A consumer owns the SHAPE of its own record and NEVER the VALUES of a field
// that exists to join across the boundary
// (`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299
// topics/knowledge-architecture.md:31`). So this set is copied from the hub's
// ratification and no synonym is accepted: an unrecognised token is REPORTED
// as unrecognised, never mapped onto a neighbour.
const HIT = "discriminating";
const MISS_REFRAMED = "covered-after-reframing";
const UNCOVERED = /^uncovered-after-(\d+)-framings$/;

/** Is this outcome one of the two MISS states? AC1's whole discriminator. */
export function isMiss(outcome) {
  if (!outcome) return false;
  if (outcome === HIT) return false;                       // the hit-state
  if (outcome === MISS_REFRAMED) return true;
  return UNCOVERED.test(outcome);
}

/** Is this a token the hub ratified at all? Unrecognised is its own state. */
export function isRatified(outcome) {
  return outcome === HIT || outcome === MISS_REFRAMED || UNCOVERED.test(outcome);
}

/**
 * Every receipt block in `text`.
 *
 * Each block is `{ pin, requestId, outcome, queries[], axes[], line }`.
 * `queries` keeps EVERY `query:` line in order, because AC4's pairing rule
 * needs the last one and a parser that kept only the first would silently
 * answer a different question than the one the emitted request_id names.
 */
export function receipts(text) {
  const out = [];
  let cur = null;
  // Fences stripped BEFORE parsing, exactly as the check does it.
  for (const line of (text || "").replace(FENCE, "").split("\n")) {
    const r = line.match(RECEIPT);
    if (r) {
      cur = { pin: r[1].trim(), requestId: null, outcome: null,
              queries: [], axes: [], line: line.trim() };
      out.push(cur);
      continue;
    }
    if (!cur) continue;        // a continuation before any receipt belongs to none
    const c = line.match(CONT);
    if (!c) {
      // ANY non-continuation line closes the block, A BLANK LINE INCLUDED. The
      // check breaks its continuation loop on the first non-`CONT` line
      // whatever it is; this file skipped blanks and left the receipt open, so
      // `consulted:` + a blank line + an indented `outcome:` bound an unrelated
      // token to that receipt here and to nothing there. The comment that stood
      // here already said a blank line closes them — the comment was right and
      // the code was wrong (PR #415 round 1).
      cur = null;
      continue;
    }
    const [, key, rawValue] = c;
    // AN EMPTY CONTINUATION VALUE IS ABSENT, for every field alike — the
    // check's one rule (`if value:`), carried here rather than re-decided. A
    // trailing bare `query:` otherwise becomes the LAST framing and wins AC4's
    // last-framing pairing over the real question above it, so the candidate
    // announces "quoted as issued" and quotes nothing. AC4 exists to stop a
    // recorded question being replaced, and an empty one replaces it as
    // completely as an invented one would.
    const value = rawValue.trim();
    if (!value) continue;
    if (key === "query") cur.queries.push(value);
    else if (key === "axis") cur.axes.push(value);
    else if (cur[key === "request_id" ? "requestId" : key] === null)
      cur[key === "request_id" ? "requestId" : key] = value;
  }
  return out;
}

/**
 * AC1 + AC2: the miss receipts in this range, and the unratified tokens beside
 * them.
 *
 * Returns `{ proposals, hits, unratified }`. `hits` is counted rather than
 * dropped, because "no misses" and "no receipts at all" are different facts and
 * only a count tells them apart.
 */
export function harvest(text) {
  const proposals = [];
  const hits = [];
  const unratified = [];
  for (const r of receipts(text)) {
    if (!r.outcome) continue;              // a receipt with no outcome declares none
    if (!isRatified(r.outcome)) { unratified.push(r); continue; }
    if (!isMiss(r.outcome)) { hits.push(r); continue; }     // AC1: the hit-state
    proposals.push(r);
  }
  return { proposals, hits, unratified };
}

/**
 * AC4 + AC5: the candidate text for one miss receipt.
 *
 * AC4 — THE QUESTION IS QUOTED AS ISSUED, in the postmortem's `recorded` case.
 * The emitted `request_id` is the LAST framing's and the last `query:` line is
 * that call's question, which is the composer's own pairing
 * (`policy/kit/bin/gateway-query.mjs`). A proposer that composed a better
 * question would delete the only finding the receipt carried.
 *
 * AC5 — THE OCCASION, NEVER THE VERDICT. Every field below is derived from the
 * record: trigger terms from the question as issued, the read prescription and
 * served line from the receipt's own pin, and a pointer to where it came from.
 * There is no field here that could hold an answer, and the fixture asserts
 * that from this file's source.
 */
export function candidate(r) {
  const question = r.queries.length ? r.queries[r.queries.length - 1] : null;
  const lines = [];
  lines.push(`  candidate: the occasion behind ${r.outcome}`);
  lines.push(`    trigger terms: DERIVED FROM THE QUESTION AS ISSUED, and offered`);
  lines.push(`      as candidates rather than as the entry's terms — the map's`);
  lines.push(`      trigger list is the owner's at admission.`);
  lines.push(`        ${question === null ? "none — the receipt records no query line"
                                          : triggerTerms(question).join(", ") || "none derivable"}`);
  lines.push(`    read prescription: the shard the receipt's own pin names —`);
  lines.push(`      ${r.pin}`);
  lines.push(`    served line at its pin: ${r.pin}`);
  lines.push(`      QUOTED BY THE OWNER AT ADMISSION, not by this proposer: the`);
  lines.push(`      map's Invariant 1 requires the served line quoted at its pin,`);
  lines.push(`      and quoting one here would mean reading the surface, which is`);
  lines.push(`      mapped boundary entry 2 and not this proposer's act.`);
  lines.push(`    Miss postmortem:`);
  lines.push(`      Violating artifact: the consultation recorded at ${r.pin}`);
  lines.push(`      Triggering terms: as above, candidates only`);
  if (question === null) {
    lines.push(`      The question: NONE RECORDED on this receipt — it carries an`);
    lines.push(`        outcome and no query line. No question is composed here;`);
    lines.push(`        inventing one is the conformance-copy defect the pinned-quote`);
    lines.push(`        rule refuses, moved into a new field.`);
  } else {
    lines.push(`      The question, verbatim — RECORDED, quoted as issued:`);
    lines.push(`        ${question}`);
  }
  lines.push(`    Derived from: request_id ${r.requestId ?? "none recorded"}`);
  lines.push(`      (the LAST framing's, paired with the last query line above)`);
  return lines.join("\n");
}

/**
 * Candidate trigger terms from a question, as CANDIDATES.
 *
 * Deliberately dull: the distinctive words of the question, minus a small
 * stop set. This is not an attempt to be clever — the map's trigger list is
 * the owner's at admission, and a proposer that produced polished terms would
 * be making the judgment the admission gate exists to make.
 */
export function triggerTerms(question) {
  const stop = new Set(["the", "a", "an", "is", "are", "was", "were", "of", "to",
                        "in", "on", "for", "and", "or", "not", "what", "which",
                        "does", "do", "did", "should", "can", "may", "it", "its",
                        "this", "that", "with", "by", "at", "be", "as", "from",
                        "when", "where", "how", "why", "if", "we", "our"]);
  return [...new Set((question || "").toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((w) => w.length > 3 && !stop.has(w)))].slice(0, 8);
}

/** The whole report for a scan range. */
export function render(text, rangeDesc) {
  const { proposals, hits, unratified } = harvest(text);
  const out = [];
  const total = proposals.length + hits.length + unratified.length;

  if (total === 0) {
    out.push(`read: no receipt carrying an \`outcome:\` in ${rangeDesc}.`);
    out.push(`  Proposals: none, and that is NOT a finding of "no misses" —`);
    out.push(`  a range with no receipts and a range whose receipts all`);
    out.push(`  discriminated are different facts.`);
    return out.join("\n");
  }

  out.push(`read: ${total} receipt(s) with an outcome in ${rangeDesc} — ` +
           `${proposals.length} miss, ${hits.length} discriminating, ` +
           `${unratified.length} unratified.`);

  if (unratified.length) {
    out.push("");
    out.push("UNRATIFIED OUTCOME TOKENS — reported, never mapped onto a");
    out.push("neighbour (AC2). The triple is the hub's and this consumer mints");
    out.push("no fourth token and accepts no synonym:");
    for (const r of unratified) out.push(`  ${r.outcome}  (${r.pin})`);
  }

  if (!proposals.length) {
    out.push("");
    out.push("PROPOSALS: none. Every ratified receipt in range recorded");
    out.push("`discriminating`, which is the hit-state and proposes nothing.");
    return out.join("\n");
  }

  out.push("");
  out.push("CANDIDATE MAP ENTRIES — PROPOSAL ONLY. Nothing here is admitted and");
  out.push("`policy/consultation-map.md` is not written (AC3). Each is for the");
  out.push("owner's admission gate.");
  for (const r of proposals) { out.push(""); out.push(candidate(r)); }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// AC6 — THE SCAN RANGE IS THE BRANCH'S, NOT THE HISTORY'S. The same window
// `checks/check-consult-receipts.sh` uses: merge-base..HEAD plus the PR body
// where CI supplies it. A wholesale pass over merged history is the STRUCK
// shape and would re-propose the whole corpus every run.
function scanRange(base, head) {
  const git = (...a) => {
    try { return execFileSync("git", a, { encoding: "utf8" }); }
    catch { return ""; }
  };
  const ref = head || "HEAD";
  let b = base;
  if (!b) {
    b = git("merge-base", "origin/master", ref).trim()
        || git("merge-base", "master", ref).trim();
  }
  if (b) {
    const n = git("rev-list", "--count", `${b}..${ref}`).trim() || "0";
    return { text: git("log", "--format=%B", `${b}..${ref}`),
             desc: `${n} commit(s) since ${b.slice(0, 7)}` };
  }
  return { text: git("log", "-1", "--format=%B", ref),
           desc: "1 commit (no merge base found)" };
}

// ---------------------------------------------------------------------------
// THE FIXTURE PASS (AC7) — discriminates in BOTH directions, runs on every
// invocation, and needs no network or repository.
const P = "product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/x.md:1";
const rcpt = (outcome, ...extra) =>
  [`consulted: ${P}`, `  request_id: rq-1`, `  outcome: ${outcome}`, ...extra]
    .join("\n");

// RUN ONLY WHEN THIS FILE IS THE ENTRY POINT. The pass used to execute at
// module load, so importing any of the five exported functions ran every
// fixture, wrote to stdout and could call `process.exit(1)` in the importer's
// process — an export nobody can consume without side effects is a declared
// affordance that does not work (PR #415 round 1). The CLI path is unchanged:
// a proposer that cannot pass its own fixtures still does not propose, because
// every invocation below is an entry-point invocation.
const IS_MAIN = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

const FX = [];
const fx = (name, ok) => { if (IS_MAIN) FX.push([ok, name]); };

// AC1 — each MISS state produces a proposal.
fx("AC1: covered-after-reframing proposes",
   harvest(rcpt("covered-after-reframing")).proposals.length === 1);
fx("AC1: uncovered-after-2-framings proposes",
   harvest(rcpt("uncovered-after-2-framings")).proposals.length === 1);

// AC1's CONTROL — the hit-state proposes nothing. This is what makes the two
// cases above evidence rather than decoration: the receipts differ only in the
// token, and a proposer firing on every consultation would pass them both.
fx("AC1 control: discriminating proposes NOTHING",
   harvest(rcpt("discriminating")).proposals.length === 0
   && harvest(rcpt("discriminating")).hits.length === 1);

// AC2 — no fourth token, no synonym. `miss` is inadmissible by name.
fx("AC2: a bare `miss` is unratified, never read as a miss-state",
   harvest(rcpt("miss")).proposals.length === 0
   && harvest(rcpt("miss")).unratified.length === 1);
fx("AC2: `uncovered-after-N-framings` needs a numeric N",
   harvest(rcpt("uncovered-after-many-framings")).unratified.length === 1);

// AC4 — the LAST framing's question is the one quoted, verbatim.
const multi = harvest(rcpt("covered-after-reframing",
                           "  query: first framing",
                           "  query: second framing")).proposals[0];
fx("AC4: the LAST query line is the question",
   candidate(multi).includes("second framing")
   && !candidate(multi).includes("        first framing"));
fx("AC4: the question is quoted in the RECORDED case",
   candidate(multi).includes("RECORDED, quoted as issued"));
fx("AC4: a receipt with no query composes NO question",
   candidate(harvest(rcpt("covered-after-reframing")).proposals[0])
     .includes("NONE RECORDED"));

// AC5 — the candidate names the occasion and carries no verdict field.
const cand = candidate(multi);
fx("AC5: the candidate carries trigger terms, prescription, pin and pointer",
   cand.includes("trigger terms:") && cand.includes("read prescription:")
   && cand.includes("served line at its pin:") && cand.includes("request_id"));
fx("AC5: the proposer quotes NO served line itself",
   cand.includes("QUOTED BY THE OWNER AT ADMISSION"));

// The parser's own edges — a continuation before any receipt binds to nothing,
// and prose closes a block.
fx("a continuation line before any receipt belongs to none",
   receipts("  outcome: covered-after-reframing").length === 0);
fx("prose closes a receipt block",
   harvest(`consulted: ${P}\nsome prose\n  outcome: covered-after-reframing`)
     .proposals.length === 0);

// THE THREE DRIFTS PR #415 ROUND 1 FOUND, one fixture each. Every one changed
// what gets PROPOSED, so none of them is cosmetic: the first manufactured a
// candidate from documentation, and the other two silently rebound a field.
// Each is written against the behaviour `checks/check-consult-receipts.sh`
// already has, not against a fresh reading of the grammar.
fx("USE VS MENTION: a fenced doc block quoting the grammar yields NO receipt",
   harvest("Docs quoting the grammar:\n```\n" + rcpt("covered-after-reframing")
           + "\n```\n").proposals.length === 0);
fx("its control: the SAME receipt unfenced still proposes",
   harvest(rcpt("covered-after-reframing")).proposals.length === 1);
fx("a BLANK LINE closes a receipt block",
   harvest(`consulted: ${P}\n\n  outcome: covered-after-reframing`)
     .proposals.length === 0);
fx("an EMPTY continuation value is absent — a bare `query:` does not become "
   + "the last framing",
   candidate(harvest(rcpt("covered-after-reframing",
                          "  query: the real question",
                          "  query:")).proposals[0])
     .includes("the real question"));
fx("an empty `outcome:` declares no outcome at all",
   harvest(`consulted: ${P}\n  outcome:`).proposals.length === 0
   && harvest(`consulted: ${P}\n  outcome:`).unratified.length === 0);

const bad = FX.filter(([ok]) => !ok);
if (IS_MAIN && bad.length) {
  console.log("FAIL fixture pass — the harvester does not discriminate as story "
              + "1.40 states:");
  for (const [, name] of bad) console.log(`  ${name}`);
  process.exit(1);
}

// AC3 AND AC5 ARE ASSERTED FROM THIS FILE'S OWN SOURCE, never from the comments
// claiming them. A proposer that grew a write path, or a verdict field, would
// pass every fixture above.
const SELF = fileURLToPath(import.meta.url);
let selfSrc = "";
try { selfSrc = IS_MAIN ? readFileSync(SELF, "utf8") : ""; }
catch (e) {
  console.log(`FAIL fixture pass — could not read this file to assert AC3/AC5: ${e.message}`);
  process.exit(1);
}
const srcBad = [];
// ANCHORED AT STATEMENT POSITION, never as a bare substring. The first form of
// this searched for the bare names and MATCHED ITS OWN REGEX LITERAL — the
// assertion read its own source and reported a defect that was its own, in the
// one place least able to afford it. A `^\s*` prefix is a call at statement
// indent, which no string or regex literal in this file has.
if (/^\s*(await )?(writeFileSync|appendFileSync|createWriteStream)\(/m.test(selfSrc))
  srcBad.push("this file contains a WRITE path; AC3 makes the map unwritable "
              + "by this proposer under any flag");
if (/^\s*[a-zA-Z]+\([^)]*consultation-map/m.test(selfSrc))
  srcBad.push("this file passes `consultation-map.md` to a call — AC3 makes it "
              + "unwritable, and reading it is not this proposer's input either");
// AC5's structural half: no emitted field may be named for an answer.
// BOUNDED TO THE COMPOSER, not to two-thirds of the file. The first form split
// on `export function candidate` and ran to the split call's OWN occurrence of
// that literal — so it scanned `triggerTerms`, `render` and the whole fixture
// block, and any unrelated `answer:` text added to those would have tripped it
// (PR #415 round 1). It still fails toward the safe side; it is simply now
// scanning what its name says.
const composer = (selfSrc.split("\nexport function candidate")[1] ?? "")
  .split("\nexport function")[0];
if (/(verdict|answer|conclusion|ruling)\s*:/i.test(composer))
  srcBad.push("the candidate composer emits a field named for an ANSWER — a "
              + "proposal that carries a verdict is what Invariant 2 refuses");
// And the live path must actually compose and print what the units compute.
if (!/^\s*console\.log\(render\(source\.text, source\.desc\)\);$/m.test(selfSrc))
  srcBad.push("the live path does not compose `render(...)` and print it — the "
              + "proposer would read its range, compute every proposal and emit "
              + "nothing");
if (IS_MAIN && srcBad.length) {
  console.log("FAIL fixture pass — this file's own source contradicts its "
              + "acceptance criteria:");
  for (const m of srcBad) console.log(`  ${m}`);
  process.exit(1);
}

if (IS_MAIN) console.log(`fixture pass: ${FX.length}/${FX.length} discrimination cases (both `
  + `MISS states propose; the DISCRIMINATING control does not, differing only in `
  + `the token; a bare \`miss\` and a non-numeric N are unratified rather than `
  + `read as misses; the LAST framing's query is quoted in the RECORDED case and `
  + `a query-less receipt composes none; the candidate carries occasion fields `
  + `only; parser edges), plus THREE source reads of this file — AC3's absent `
  + `write path, AC5's absent verdict field, and the live invocation actually `
  + `composing and printing what the units compute`);

// ---------------------------------------------------------------------------
// THE CLI, GUARDED. On the import path nothing below runs — not the argument
// read, not the scan, and above all not `process.exit`. The first repair of
// this nit left a bare `process.exit(0)` on the non-main path, which made an
// import terminate the importer's process: worse than the side effect it
// replaced, and caught by running the import rather than by reading it.
if (IS_MAIN) {
  const argv = process.argv.slice(2);
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? null : argv[i + 1];
  };
  if (!argv.includes("--self-test")) {
    const sourceFile = arg("--source-file");
    const source = sourceFile
      ? { text: readFileSync(sourceFile, "utf8"), desc: `--source-file ${sourceFile}` }
      : scanRange(arg("--base"), arg("--head"));

    // The PR body, when CI provides it — receipts often ride there rather than
    // in a commit message. Same env the receipt check reads.
    const prBody = process.env.CONSULT_PR_BODY || "";
    if (prBody) source.text += "\n" + prBody;

    console.log("");
    console.log(render(source.text, source.desc));
  }
}
