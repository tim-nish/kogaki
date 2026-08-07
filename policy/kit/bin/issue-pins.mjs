#!/usr/bin/env node
// The issue checkpoints (tsurezure-gateway#78 scope item 4; the 2026-08-04
// stale-issue lifecycle line: pins at authoring, creation-time check,
// pickup-time re-check refusing with the delta).
//
//   issue-pins.mjs --validate-body <file> --consumer <name>   (creation time)
//   issue-pins.mjs --recheck <file> --consumer <name>         (pickup time)
//   issue-pins.mjs --emit-pin-quotes <file> --consumer <name> (the hash WRITER)
//   issue-pins.mjs --self-test                                (fixtures, no gateway)
//
// Exit codes: 0 ok · 1 validation failed (no pins section / no pins) ·
// 2 policy moved (delta printed — the lane refuses with it) ·
// 11 gateway unavailable (one line printed; caller proceeds generic — an
// unreachable gateway never blocks filing or pickup).
//
// ============================================================================
// THE CONTENT-LIVENESS HALF (kogaki#188)
// ============================================================================
//
// WHAT WAS WRONG. Until this change `--recheck` compared **commit SHAs** and
// printed `ok: pins current`. Pin currency is a fact about the commit;
// liveness is a fact about the LINE. The substrate is append-only and
// relocation is a mandatory recurring act, so a pinned `file:line` drifts as
// a matter of course — and the dangerous form is the one that STILL RESOLVES:
// the pin resolves cleanly onto different content, every guard passes, and a
// clean exit code reads as evidence the cited line still says what it said.
// Five instances were live and re-verified for this change at
// `product-lab@98195e0aef221aa82c47bb632324127745469f2e`:
//
//     LESSONS.md:45          → the quoted lesson is at :47
//     topics/articles.md:53  → the quoted 2026-07-31 line is at :54
//     topics/articles.md:79  → the quoted Top-N withdrawal is at :80
//     topics/articles.md:94  → the quoted refusal is at :95
//     topics/articles.md:4   reads `updated: 2026-08-07` while the newest
//                            dated decision line in the thread is 2026-08-05
//
// WHAT THIS IS NOT. It is not a better SHA comparison, and it does not pretend
// to prevent relocation. Relocation is correct behaviour. Line numbers are the
// fragile citation form; this detects the CONSEQUENCE. The cause-side remedy —
// citing served material by a relocation-stable key rather than `file:line` —
// was considered and DECLINED for this change (kogaki#188): it matches what
// the corpus measured as durable, but it changes the form of every existing
// pin across this repository and the hub, and the bounded fix was chosen.
//
// HOW IT WORKS. A cited line may carry a **stored quote hash** on the issue
// body, in its own unindented line:
//
//     pin-quote: topics/articles.md:79@f918c51 q1:1a2b3c4d5e6f7a8b
//
// At `--recheck` the served surface is re-fetched at the CURRENT head, the
// text now at that line is normalized and hashed, and the two are compared.
// A mismatch is a refusal (exit 2) carrying the delta — and, because the whole
// served file was fetched, the delta also says WHERE the stored quote is now,
// which is the line number the citation should be corrected to.
//
// WHY THE LINE IS UNINDENTED, and why it is not a receipt continuation key.
// `checks/check-consult-receipts.sh`'s continuation regex recognises only
// `request_id`, `outcome` and `query`; an unrecognised INDENTED key ends the
// continuation scan, and the receipt then parses as a v1 line with every field
// silently dropped — measured on the shipped checker and recorded at
// `gateway-query.mjs`'s `consult-receipt:` composition. So the quote hash is a
// SIBLING of the receipt block, never a key inside it. Unindented is
// load-bearing, not style.
//
// THREE RESULTS, NOT TWO — and this is served, not invented:
//
//   > treat this kind of check as having three results rather than two, and
//   > mechanically confirm the source has some records in scope before
//   > trusting your own count; when it has none, report that you cannot tell
//   > instead of reporting that the problem is fixed
//
//   `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/testing.md:53`
//   (`absence-verification-counts-exercised-trials`)
//
// So a cited line resolves to exactly one of:
//   * `verified`    — the served file returned records IN SCOPE and the hash matched
//   * `drifted`     — the served file returned records IN SCOPE and it did not
//   * `cannot-tell` — the trial DID NOT RUN (seam unreachable, no served
//                     address for the file, or the fetch returned no records)
//   * `unhashed`    — no stored quote hash exists, so nothing was compared
//
// `verified` is only ever reached through a fetch that actually returned lines
// for that file. A file that came back empty is `cannot-tell`, never a pass.
//
// AND THE FAULT BRANCH SPEAKS IN ITS OWN WORDS:
//
//   > When a checking tool cannot complete — it crashed, an input was missing,
//   > a parse failed — whatever it prints must say so in its own words. If
//   > that branch reuses the wording of the problem the tool looks for, every
//   > internal fault turns into a confident accusation against innocent code
//
//   `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/testing.md:35`
//   (`a-fallback-worded-as-a-finding-accuses`)
//
// A `cannot-tell` therefore NEVER prints as drift. It prints as "the content
// trial did not run for <file>: <reason>". And when a body carries stored
// hashes but NOT ONE of them could be exercised, the run exits 11 rather than
// 0: a check that cannot run its trial says so, and does not hand back a clean
// exit code that reads as evidence.
//
// THE HASH HAS A WRITER. `--emit-pin-quotes` resolves a body's cites at the
// current head and prints paste-ready `pin-quote:` lines. Without it the
// stored hash would be an input nothing produces, and the guard would be
// merged, correctly placed and completely dead while everything on the surface
// said installed (`gloss/lessons/testing.md:11`,
// `a-carrier-is-not-installed-until-its-inputs-have-writers`).
//
// ONE FETCH PER FILE, NOT PER PIN. Cites are grouped by served file and each
// file is fetched once, because "checking the result does not [have to happen
// one at a time] — a single query after the fact can confirm all of them
// together" (`gloss/lessons/claude-code-ops.md:41`,
// `batch-the-verification-not-only-the-act`).
//
// BACKWARD COMPATIBILITY. Every pin recorded before this change carries no
// `pin-quote:` line, and NOTHING about its treatment changes: it is counted
// and NAMED as `no stored quote hash`, and it never fails. What changes is the
// OUTPUT — `ok: pins current` alone is gone, because that phrasing is the
// defect. Every exit now states how many cited lines had their content
// verified and how many did not, so a clean exit can no longer be read as a
// liveness claim it did not check. That honesty floor is direction 3 of
// kogaki#188 kept UNDER direction 1's detection rather than instead of it.
//
// SCOPE OF THE CONTENT CHECK, stated rather than left to be discovered:
//   * Single-line cites only. A RANGE cite (`gloss/lessons/testing.md:1-157`)
//     is a whole-shard survey read, not a quoted line, and is not the defect
//     class; it is reported `cannot-tell (range cite)`, never silently passed.
//   * Files with a served bulk line address: `topics/<name>.md`,
//     `LESSONS.md`, `gloss/lessons|journeys|decisions/<key>.md`.
//   * `topics/archive/<name>.md` and `GLOSSARY.md` have NO served bulk
//     line-addressable form (measured: `topic_thread("archive/…")` is a miss,
//     and `surface_names(kind:"glossary")` returns headings only), so cites
//     into them are `cannot-tell (no served address form)`. Declared rather
//     than quietly skipped — a skipped file counted as verified is this
//     issue's own defect class.

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const argv = process.argv.slice(2);
function opt(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
function flag(name) {
  return argv.includes(`--${name}`);
}
const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Quote normalization and hashing.
//
// The hash must survive WHITESPACE NORMALIZATION, the way the receipt checks
// do: a served line re-wrapped, re-indented, or round-tripped through a
// renderer that swapped a run of spaces for a tab is the SAME QUOTE, and a
// content check that fired on that would be noise inside a week — and a noisy
// check is one nobody reads, which is how the original defect survived.
// So: Unicode NFC (composed and decomposed forms of the same character are the
// same character), every run of whitespace — including tabs, newlines and
// NO-BREAK SPACE — collapsed to one plain space, then trimmed. Case and
// punctuation are CONTENT and are not touched: a decision line that flips
// "ADOPTED" to "declined" must fail, and normalizing case would hide it.
export function normalizeQuote(text) {
  return String(text ?? "")
    .normalize("NFC")
    .replace(/[\s   ]+/gu, " ")
    .trim();
}

// `q1:` is a VERSION PREFIX, present from the first emission. A hash format
// with no version is one that can never be changed without every stored hash
// silently becoming a mismatch — which would present exactly as mass content
// drift, the loudest possible false accusation. 16 hex characters (64 bits) of
// SHA-256: this is a drift detector over a corpus of a few hundred lines, not
// an adversarial integrity check, and a short hash keeps the body readable.
export function quoteHash(text) {
  return "q1:" + createHash("sha256").update(normalizeQuote(text), "utf8")
    .digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Parsing the body.

// USE vs MENTION, the same rule the receipt check applies (kogaki#41): a
// marker, a receipt or a `pin-quote:` line inside a fenced block is a
// QUOTATION of the grammar, not an emission. An issue body documenting the
// convention is exactly the text guaranteed to contain those tokens, so fenced
// regions are stripped first. The unclosed-fence arm must anchor to END OF
// INPUT, not end of line: under the `m` flag a bare `$` matches every line
// ending, so the lazy body matched nothing and only the opening fence marker
// was stripped — a fenced quotation still read as an emission.
// `$(?![\s\S])` is end-of-input regardless of `m`.
export function stripFences(body) {
  return body.replace(
    /^[ \t]*(`{3,}|~{3,})[\s\S]*?(?:^[ \t]*\1[ \t]*$|$(?![\s\S]))/gm, "");
}

// A served cite is `<file>:<spec>`, and it reaches a body in two shapes:
//   (a) inside a `consulted:` line, after the pin —
//       `consulted: product-lab@<sha> topics/articles.md:53, LESSONS.md:45,86`
//       where groups are comma-space separated and specs inside a group are
//       bare-comma separated, each spec a line or a `N-M` range;
//   (b) as a standalone qualified cite — `topics/articles.md:271@bb68ccf`.
// Both are collected. `line` is null for a range, which is what routes a range
// to `cannot-tell (range cite)` rather than to a silent pass.
export function parseCites(body) {
  const emitted = stripFences(body);
  const out = [];
  const push = (file, spec, sha) => {
    const single = /^(\d+)$/.exec(spec);
    const range = /^(\d+)-(\d+)$/.exec(spec);
    if (!single && !range) return;
    out.push({
      file,
      spec,
      line: single ? Number(single[1]) : null,
      sha: sha ?? null,
      key: `${file}:${spec}`,
    });
  };
  // (a) consulted: <repo>@<sha> <file:spec[,spec]>[, <file:spec…>]
  for (const m of emitted.matchAll(/^\s*consulted:\s*(\S+)@([0-9a-f]{7,40})\s+(.+)$/gm)) {
    const sha = m[2];
    const tail = m[3].trim();
    if (tail === "miss") continue;
    for (const group of tail.split(/,\s+/)) {
      const i = group.lastIndexOf(":");
      if (i < 0) continue;
      const file = group.slice(0, i).trim();
      if (!/\.md$/i.test(file)) continue;
      for (const spec of group.slice(i + 1).split(",")) push(file, spec.trim(), sha);
    }
  }
  // (b) <file>:<spec>@<sha>
  for (const m of emitted.matchAll(/([\w./-]+\.md):(\d+(?:-\d+)?)@([0-9a-f]{7,40})/g)) {
    push(m[1], m[2], m[3]);
  }
  // De-duplicate on file:spec — the same line cited twice is one trial.
  const seen = new Map();
  for (const c of out) if (!seen.has(c.key)) seen.set(c.key, c);
  return [...seen.values()];
}

// `pin-quote: <file>:<line>@<sha> q1:<hex>` — unindented, outside any fence.
export function parsePinQuotes(body) {
  const map = new Map();
  for (const m of stripFences(body).matchAll(
    /^pin-quote:\s*([\w./-]+\.md):(\d+)(?:@([0-9a-f]{7,40}))?\s+(q1:[0-9a-f]{8,64})\s*$/gm)) {
    map.set(`${m[1]}:${m[2]}`, { hash: m[4], takenAt: m[3] ?? null });
  }
  return map;
}

// ---------------------------------------------------------------------------
// The served address map.
//
// A DECLARED map, never a guess. A file with no entry here is `cannot-tell`
// with the reason said out loud, because inventing an address that misses and
// counting the miss as "nothing to check" is precisely how a skipped file
// becomes a silent pass.
export function servedAddress(file) {
  let m;
  if ((m = /^topics\/archive\/(.+)\.md$/.exec(file)))
    return { ok: false, reason: "no served address form (topic_thread does not serve the archive thread)" };
  if (file === "GLOSSARY.md")
    return { ok: false, reason: "no served bulk line address (surface_names serves headings only)" };
  if ((m = /^topics\/(.+)\.md$/.exec(file)))
    return { ok: true, tool: "topic_thread", args: { topic: m[1] } };
  if (file === "LESSONS.md")
    return { ok: true, tool: "lessons_index", args: {} };
  if ((m = /^gloss\/(lessons|journeys|decisions)\/(.+)\.md$/.exec(file)))
    return { ok: true, tool: "gloss_index", args: { tag: `${m[1]}/${m[2]}` } };
  return { ok: false, reason: "no served address form for this path" };
}

// ---------------------------------------------------------------------------
// The verdict, as a PURE function of the body and an already-fetched surface.
//
// Everything the fixtures need to discriminate lives here, and nothing in it
// touches a gateway: `fetched` is `Map<file, {ok, lines: Map<line, text>, reason}>`.
// The wire is exercised separately (`policy/kit/test/install-test.sh`), which
// is the same split gateway-query.mjs's own self-test declares.
export function judgeContent(body, fetched) {
  const cites = parseCites(body);
  const quotes = parsePinQuotes(body);
  const results = [];
  for (const c of cites) {
    const stored = quotes.get(`${c.file}:${c.line}`);
    if (c.line === null) {
      results.push({ ...c, verdict: "cannot-tell", reason: "range cite — a whole-shard read, not a quoted line" });
      continue;
    }
    if (!stored) {
      results.push({ ...c, verdict: "unhashed" });
      continue;
    }
    const f = fetched.get(c.file);
    if (!f || !f.ok) {
      results.push({ ...c, verdict: "cannot-tell", reason: f?.reason ?? "the served file was not fetched" });
      continue;
    }
    // MECHANICALLY CONFIRM THE SOURCE HAS RECORDS IN SCOPE before trusting a
    // count — a fetch that came back with nothing is a trial that did not run,
    // not a trial that passed.
    if (f.lines.size === 0) {
      results.push({ ...c, verdict: "cannot-tell", reason: "the served fetch returned no records in scope" });
      continue;
    }
    const text = f.lines.get(c.line);
    if (text === undefined) {
      results.push({ ...c, verdict: "cannot-tell", reason: `the served file has no line ${c.line} (it now ends at ${Math.max(...f.lines.keys())})` });
      continue;
    }
    if (quoteHash(text) === stored.hash) {
      results.push({ ...c, verdict: "verified" });
      continue;
    }
    // Drifted. Because the WHOLE file was fetched, say where the quote went —
    // that is the line number the citation should be corrected to, and it is
    // the difference between a refusal and a usable refusal.
    let movedTo = null;
    for (const [n, t] of f.lines) {
      if (quoteHash(t) === stored.hash) { movedTo = n; break; }
    }
    results.push({ ...c, verdict: "drifted", movedTo, foundHash: quoteHash(text), nowHolds: normalizeQuote(text).slice(0, 110) });
  }
  return results;
}

export function tally(results) {
  const t = { verified: 0, drifted: 0, "cannot-tell": 0, unhashed: 0 };
  for (const r of results) t[r.verdict]++;
  return t;
}

// The one line that replaces `ok: pins current`. It never states more than the
// trials that actually ran, and it names the shortfall in the same breath.
//
// THE ONLY POSITIVE CLAIM IT MAKES IS `verified`. Everything else — drifted,
// cannot-tell, unhashed — is a line whose liveness this run did NOT establish,
// and the sentence is built so that the verified count and the total are
// always both present. An earlier draft phrased the shortfall as "NOT
// established for <cannot-tell + unhashed>", which on an all-drifted body read
// "NOT established for 0 of 2" while two lines had just failed — an
// understatement of exactly the kind this issue exists to remove.
export function contentSummary(results) {
  const t = tally(results);
  const total = results.length;
  if (total === 0) return "content: no cited lines found in this body — nothing to verify";
  if (t.verified === 0 && t.drifted === 0) {
    return `content: NOT VERIFIED — 0 of ${total} cited line(s) had their content checked `
      + `(${t.unhashed} carry no stored quote hash, ${t["cannot-tell"]} could not be trialled); `
      + "commit SHAs were compared, which is not line liveness";
  }
  return `content: liveness ESTABLISHED for ${t.verified} of ${total} cited line(s) — `
    + `${t.drifted} drifted, ${t["cannot-tell"]} cannot-tell, `
    + `${t.unhashed} no stored quote hash`;
}

// ---------------------------------------------------------------------------
// The wire.

// The child's one degrade line, recovered from whichever stream carried it.
//
// ONE line is the contract — install-test.sh asserts the one-line shape for
// gateway-query itself and for both of this file's entry points — so a
// multi-line capture is REDUCED to the line that matters rather than forwarded
// whole. A capture holding nothing usable still yields a line, because silence
// is the defect being repaired and a fallback that stayed quiet would
// reintroduce it at the one moment it is hardest to diagnose.
function degradeLine(e) {
  const captured = `${e.stdout ?? ""}\n${e.stderr ?? ""}`;
  const line = captured
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("policy_source unavailable:"));
  return line ?? "policy_source unavailable: gateway exited 11 without a reason line";
}

const bodyFile = opt("validate-body") ?? opt("recheck") ?? opt("emit-pin-quotes");
const mode = opt("validate-body") ? "validate"
  : opt("recheck") ? "recheck"
  : opt("emit-pin-quotes") ? "emit"
  : null;
const consumer = opt("consumer") ?? "unknown";
const gatewayOpt = opt("gateway");

// `--gateway` is now FORWARDED to the transport. It was accepted by callers
// (install-test.sh passes it) and silently dropped here, so the machine-local
// override worked for gateway-query.mjs and not for this file — the kind of
// gap that is invisible until the two disagree.
function call(tool, args) {
  const cmd = [join(here, "gateway-query.mjs"), "--consumer", consumer,
    "--tool", tool, "--args", JSON.stringify(args)];
  if (gatewayOpt) cmd.push("--gateway", gatewayOpt);
  return execFileSync("node", cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function currentPin() {
  // Any lookup returns the served pin; the question exists only to satisfy the
  // tool's schema and is deliberately generic.
  try {
    const out = call("policy_lookup", { question: "current served pin check" });
    const m = out.match(/"pin"\s*:\s*"([^"]+)"/) ?? out.match(/pin:\s*(\S+)/);
    return m ? m[1] : null;
  } catch (e) {
    // FORWARD the child's line rather than merely honouring its exit code.
    //
    // gateway-query DOES write its one `policy_source unavailable:` line — but
    // execFileSync passes `{ encoding: "utf8" }`, which CAPTURES the child's
    // stdout into this process instead of letting it through. The line
    // therefore landed in a buffer the old code discarded, and a caller saw
    // exit 11 with empty output: indistinguishable from a silent internal
    // failure, which is the one thing a documented degrade path exists to
    // prevent. The line had a writer and no DELIVERY, failing toward silence
    // exactly as an unwritten input would (kogaki#54).
    //
    // ONE LINE REMAINS THE CONTRACT. The content half adds no second line
    // here: an unreachable gateway means the content trial did not run either,
    // and that is what exit 11 now means for both halves at once.
    if (e.status === 11) {
      console.log(degradeLine(e));
      process.exit(11);
    }
    console.log(`policy_source unavailable: ${String(e.message ?? e).slice(0, 120)}`);
    process.exit(11);
  }
}

// Fetch every distinct cited file ONCE. A failure here is never fatal and
// never re-worded as drift: it becomes that file's `cannot-tell` reason.
function fetchSurfaces(files) {
  const fetched = new Map();
  for (const file of files) {
    const addr = servedAddress(file);
    if (!addr.ok) { fetched.set(file, { ok: false, reason: addr.reason }); continue; }
    let data;
    try {
      data = JSON.parse(call(addr.tool, addr.args));
    } catch (e) {
      fetched.set(file, { ok: false, reason: `the content trial did not run — ${addr.tool} failed: ${String(e.message ?? e).split("\n")[0].slice(0, 90)}` });
      continue;
    }
    if (data?.miss || !Array.isArray(data.lines)) {
      fetched.set(file, { ok: false, reason: `the content trial did not run — ${addr.tool}(${JSON.stringify(addr.args)}) returned a miss` });
      continue;
    }
    const lines = new Map();
    for (const l of data.lines) {
      const m = /^([\w./-]+\.md):(\d+)@/.exec(l.cite ?? "");
      if (m && m[1] === file) lines.set(Number(m[2]), l.text ?? "");
    }
    fetched.set(file, { ok: true, lines });
  }
  return fetched;
}

function contentPass(body) {
  const cites = parseCites(body);
  const files = [...new Set(cites.filter((c) => c.line !== null).map((c) => c.file))];
  const fetched = files.length ? fetchSurfaces(files) : new Map();
  return judgeContent(body, fetched);
}

// ---------------------------------------------------------------------------
// Fixtures — pure, gateway-free, and each one fails a version of this file
// that lacks the clause it names. Same standard gateway-query.mjs's own
// `--self-test` is held to, and sited before any argument handling that could
// reach a gateway.
function selfTest() {
  const SHA = "98195e0aef221aa82c47bb632324127745469f2e";
  // The five live instances, re-verified at the head above and used verbatim
  // as fixtures — the guard's proof is replaying the original failure through
  // it and watching it block.
  const TOP_N_79 = "- 2026-07-29 — **The co-tag SECOND NAVIGATION STEP is adopted:** its watch trigger fired.";
  const TOP_N_80 = "- 2026-07-29 — **Top-N is WITHDRAWN and the compact all-groups form replaces it:** the narrowing act moved to the owner.";
  const surface = (file, entries) => new Map([[file, { ok: true, lines: new Map(entries) }]]);
  const body = (extra) =>
    `Policy pins\n\nconsulted: product-lab@${SHA} topics/articles.md:79\n${extra}\n`;
  const drifted = surface("topics/articles.md", [[79, TOP_N_79], [80, TOP_N_80]]);
  const clean = surface("topics/articles.md", [[79, TOP_N_80]]);

  const cases = [
    // --- normalization: the hash survives whitespace, and only whitespace ---
    ["whitespace runs, tabs and NBSP normalize to one space",
     () => quoteHash("a  b\tc d\n e") === quoteHash("a b c d e")],
    ["leading and trailing whitespace is trimmed",
     () => quoteHash("   the quote   ") === quoteHash("the quote")],
    ["NFC folds composed and decomposed forms of one character",
     () => quoteHash("éclair") === quoteHash("éclair")],
    ["case is CONTENT — ADOPTED and declined must not collide",
     () => quoteHash("the step is ADOPTED") !== quoteHash("the step is adopted")],
    ["the hash carries its `q1:` version prefix",
     () => /^q1:[0-9a-f]{16}$/.test(quoteHash("x"))],

    // --- parsing ---
    ["a `consulted:` line yields its file:line cites",
     () => parseCites(`consulted: product-lab@${SHA} topics/articles.md:53, LESSONS.md:45,86`)
       .map((c) => c.key).join("|") === "topics/articles.md:53|LESSONS.md:45|LESSONS.md:86"],
    ["a standalone qualified cite is collected too",
     () => parseCites(`see gloss/lessons/testing.md:53@${SHA} for the rule`)
       .map((c) => c.key).join("|") === "gloss/lessons/testing.md:53"],
    ["a range cite is collected with line=null, never as a line",
     () => { const c = parseCites(`consulted: product-lab@${SHA} gloss/lessons/testing.md:1-157`)[0];
             return c.spec === "1-157" && c.line === null; }],
    ["a FENCED pin-quote is a mention, not an emission",
     () => parsePinQuotes("```\npin-quote: topics/articles.md:79@abc1234 q1:0000000000000000\n```\n").size === 0],
    ["a fenced `consulted:` line yields no cites",
     () => parseCites("```\nconsulted: product-lab@" + SHA + " topics/articles.md:53\n```\n").length === 0],
    ["an INDENTED pin-quote is not recognised — the key is unindented by contract",
     () => parsePinQuotes("  pin-quote: topics/articles.md:79@abc1234 q1:0000000000000000\n").size === 0],

    // --- the served address map: declared, never guessed ---
    ["topics/<name>.md routes to topic_thread",
     () => servedAddress("topics/articles.md").tool === "topic_thread"],
    ["LESSONS.md routes to lessons_index",
     () => servedAddress("LESSONS.md").tool === "lessons_index"],
    ["gloss/lessons/<tag>.md routes to gloss_index with a kind-qualified tag",
     () => servedAddress("gloss/lessons/testing.md").args.tag === "lessons/testing"],
    ["topics/archive/* has NO served address and says so",
     () => servedAddress("topics/archive/knowledge-architecture.md").ok === false],
    ["GLOSSARY.md has NO served bulk line address and says so",
     () => servedAddress("GLOSSARY.md").ok === false],

    // --- THE REGRESSION PIN: the live instance must block -------------------
    ["the live :79→:80 drift is DETECTED, not passed",
     () => judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 ${quoteHash(TOP_N_80)}`), drifted)[0]
       .verdict === "drifted"],
    ["the drift names WHERE the quote went — the correction the reader needs",
     () => judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 ${quoteHash(TOP_N_80)}`), drifted)[0]
       .movedTo === 80],
    ["an unmoved quote verifies",
     () => judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 ${quoteHash(TOP_N_80)}`), clean)[0]
       .verdict === "verified"],
    ["whitespace-only reflow of the served line still VERIFIES (no false drift)",
     () => judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 ${quoteHash(TOP_N_80)}`),
       surface("topics/articles.md", [[79, "  " + TOP_N_80.replace(/ /g, "\t ") + "\n"]]))[0]
       .verdict === "verified"],

    // --- three results, not two --------------------------------------------
    ["a body with no stored hash is `unhashed` — reported, never failed",
     () => judgeContent(body(""), drifted)[0].verdict === "unhashed"],
    ["an unfetchable file is `cannot-tell`, NEVER drift",
     () => { const r = judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 q1:0000000000000000`),
               new Map([["topics/articles.md", { ok: false, reason: "the content trial did not run — gateway unreachable" }]]))[0];
             return r.verdict === "cannot-tell" && !/drift/i.test(r.reason); }],
    ["a fetch returning NO records is `cannot-tell`, never a pass",
     () => judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 q1:0000000000000000`),
       new Map([["topics/articles.md", { ok: true, lines: new Map() }]]))[0].verdict === "cannot-tell"],
    ["a cite past the end of the served file is `cannot-tell`, never a pass",
     () => judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 q1:0000000000000000`),
       surface("topics/articles.md", [[1, "x"]]))[0].verdict === "cannot-tell"],
    ["a range cite is `cannot-tell (range cite)`, never silently verified",
     () => { const r = judgeContent(`consulted: product-lab@${SHA} gloss/lessons/testing.md:1-157`, new Map())[0];
             return r.verdict === "cannot-tell" && r.reason.startsWith("range cite"); }],
    ["the fault branch speaks in its OWN words — no cannot-tell reason accuses drift",
     () => judgeContent(body(`pin-quote: topics/articles.md:79@f918c51 q1:0000000000000000`),
       new Map([["topics/articles.md", { ok: false, reason: "the content trial did not run — topic_thread returned a miss" }]]))
       .every((r) => r.verdict !== "cannot-tell" || /did not run|range cite|no line|no records/.test(r.reason))],

    // --- the output no longer implies liveness it did not check ------------
    ["a body with nothing hashed says NOT VERIFIED and names SHA comparison",
     () => { const s = contentSummary(judgeContent(body(""), drifted));
             return s.includes("NOT VERIFIED") && s.includes("not line liveness"); }],
    ["a verified summary names the total, so the shortfall is always visible",
     () => contentSummary(judgeContent(
       `consulted: product-lab@${SHA} topics/articles.md:79, topics/articles.md:80\n`
       + `pin-quote: topics/articles.md:79@f918c51 ${quoteHash(TOP_N_79)}\n`, drifted))
       .includes("liveness ESTABLISHED for 1 of 2")],
    // The understatement this file shipped in draft and the live trial caught:
    // an all-drifted body must never report a shortfall of zero.
    ["an all-drifted body reports liveness established for ZERO, never a 0 shortfall",
     () => { const s = contentSummary(judgeContent(
               body(`pin-quote: topics/articles.md:79@f918c51 ${quoteHash(TOP_N_80)}`), drifted));
             return s.includes("ESTABLISHED for 0 of 1") && s.includes("1 drifted"); }],
    ["the phrase `pins current` never appears alone as a whole-body verdict",
     () => !contentSummary(judgeContent(body(""), drifted)).includes("pins current")],
  ].filter(Boolean);

  const failures = cases.filter(([, f]) => { try { return f() !== true; } catch (e) { return true; } }).map(([n]) => n);
  if (failures.length) {
    console.log("FAIL issue-pins content-liveness fixtures:");
    for (const f of failures) console.log(`  ${f}`);
    process.exit(1);
  }
  console.log(`fixture pass: ${cases.length}/${cases.length} content-liveness cases `
    + "(whitespace-normalized hashing; use-vs-mention on both grammars; a declared "
    + "served address map; the live :79→:80 drift blocked and located; three results "
    + "rather than two; and an output that never implies liveness it did not check)");
  process.exit(0);
}

if (flag("self-test")) selfTest();

if (!mode || !bodyFile) {
  console.error("usage: issue-pins.mjs --validate-body|--recheck|--emit-pin-quotes <file> --consumer <name>");
  console.error("       issue-pins.mjs --self-test");
  process.exit(2);
}

const body = readFileSync(bodyFile, "utf8");
// A pin may be repo-qualified (`product-lab@sha`, `kogaki@sha`) or a bare
// cite (`file:line@sha`, hub grammar). Keep the qualifier so the recheck
// compares only pins belonging to the served repo — a pin into another
// repository is not evidence the hub moved.
//
// `pin-quote:` LINES ARE EXCLUDED FROM THE PIN SCAN. The `@<sha>` on a
// `pin-quote:` line is PROVENANCE — the head the hash was taken at — and not a
// policy pin the issue was computed against. Counting it would make every body
// carrying stored hashes report `policy moved` the moment the hub advanced
// past the head the hashes were written at, which is immediately and always.
// Caught by running this change against the live drift rather than by reading
// it: the first end-to-end trial refused with a stale-pin delta naming a sha
// that appeared nowhere but the new grammar's own provenance field.
const pinScanBody = body.replace(/^pin-quote:.*$/gm, "");
const pinTokens = [...pinScanBody.matchAll(/([\w./:-]*)@([0-9a-f]{7,40})\b/g)].map((m) => ({
  qual: m[1] ?? "",
  sha: m[2],
}));
const pins = [...new Set(pinTokens.map((p) => p.sha))];

// ---------------------------------------------------------------------------
// emit — THE WRITER for the stored quote hash.
if (mode === "emit") {
  const cur = currentPin();
  const cites = parseCites(body).filter((c) => c.line !== null);
  if (cites.length === 0) {
    console.log("no single-line cites found in this body — nothing to hash");
    process.exit(0);
  }
  const fetched = fetchSurfaces([...new Set(cites.map((c) => c.file))]);
  const sha = (cur ?? "").split("@").pop().slice(0, 7);
  let emitted = 0;
  const skipped = [];
  for (const c of cites) {
    const f = fetched.get(c.file);
    const text = f?.ok ? f.lines.get(c.line) : undefined;
    if (text === undefined) {
      skipped.push(`${c.key} — ${f?.ok ? "the served file has no such line" : f?.reason ?? "not fetched"}`);
      continue;
    }
    console.log(`pin-quote: ${c.file}:${c.line}@${sha} ${quoteHash(text)}`);
    emitted++;
  }
  // Report the shortfall in the same breath as the emission: a writer that
  // silently emits fewer lines than there are cites reintroduces the very
  // gap this feature closes, one layer up.
  console.log(`# ${emitted} of ${cites.length} cite(s) hashed at ${cur}`);
  for (const s of skipped) console.log(`# not hashed: ${s}`);
  process.exit(0);
}

if (mode === "validate") {
  if (!/policy pins/i.test(body)) {
    console.log("deny: no Policy pins section — an issue carries the policy state it was computed against");
    process.exit(1);
  }
  if (pins.length === 0) {
    console.log("deny: Policy pins section carries no @<sha> pin");
    process.exit(1);
  }
  const cur = currentPin();
  // Creation-time COVERAGE, reported and never enforced. Requiring a hash at
  // authoring would refuse bodies that carry no cite at all (`consult: none`),
  // and would break every filing path the moment this shipped — so the
  // authoring checkpoint tells the author what `--recheck` will be able to
  // establish, and `--emit-pin-quotes` is how they raise it.
  const cites = parseCites(body).filter((c) => c.line !== null);
  const quotes = parsePinQuotes(body);
  const covered = cites.filter((c) => quotes.has(`${c.file}:${c.line}`)).length;
  console.log(`ok: ${pins.length} pin(s); current served pin: ${cur ?? "unparsed"}; `
    + `quote hashes: ${covered}/${cites.length} cited line(s) will be content-checked at pickup`
    + (covered < cites.length ? " (raise it with --emit-pin-quotes)" : ""));
  process.exit(0);
}

// recheck
//
// THREE OBLIGATIONS ARE ENFORCED HERE. Pin staleness is the oldest; the
// DEFERRED CONSULT is the second (story 1.11); CONTENT LIVENESS is the third
// (kogaki#188), and until it existed a pin could drift, resolve cleanly to the
// wrong content, and pass every guard in this repository.
//
// SPEC §4's issue-checkpoints clause names this tool as the collector of the
// deferred consult: "an explicit `consult: deferred-to-pickup` marker that the
// pickup recheck then enforces". The token is matched literally and never
// re-spelled, per SPEC-issue-creation v7 — it is a fixed token precisely so an
// audit can find it.
//
// DISCHARGE IS A RECEIPT ON THE BODY. What this can observe at pickup is
// whether the deferred consultation was ever recorded, so a `consulted:` line
// on the issue is the discharge and its absence is the refusal. It cannot
// observe a consultation that happens after it runs — which is the point: the
// refusal is what sends the picker to consult before proceeding.
const emitted = stripFences(body);
const DEFERRED = /consult:\s*deferred-to-pickup\b/i;
const RECEIPT = /^\s*consulted:\s*\S+@[0-9a-f]{7,40}\s+\S/m;
const deferredUndischarged = DEFERRED.test(emitted) && !RECEIPT.test(emitted);

const cur = currentPin();
const curSha = cur?.split("@").pop() ?? "";
const curRepo = cur?.includes("@") ? cur.split("@")[0] : "";
// Hub pins: qualified with the served repo's name, or bare file:line cites
// (which are hub grammar). Pins qualified to a different repo are excluded.
const hubPins = [...new Set(pinTokens
  .filter((p) => !p.qual || p.qual.includes(":") || (curRepo && p.qual.endsWith(curRepo)))
  .map((p) => p.sha))];
const stale = hubPins.filter((p) => curSha && !curSha.startsWith(p) && !p.startsWith(curSha));

// The content half. Reached only once the gateway has answered at least one
// call, so an unreachable seam has already exited 11 above with its one line.
const content = contentPass(body);
const t = tally(content);
const hashedTrials = t.verified + t.drifted + t["cannot-tell"];

// Every delta is reported before exiting. Refusing on the first one found
// would send the picker back for a second refusal they could have discharged
// in the same sitting — and the obligations are independent, so none subsumes
// another.
if (stale.length > 0) {
  console.log(`policy moved: issue pinned ${stale.join(", ")}; served is ${cur}`);
  console.log("the lane refuses with this delta: re-read the pinned lines at the current pin before proceeding");
}
if (deferredUndischarged) {
  console.log("consult deferred to pickup and not discharged: the body carries "
    + "`consult: deferred-to-pickup` and no `consulted:` receipt");
  console.log("the lane refuses with this delta: this IS pickup — consult the "
    + "boundary now and record the receipt on the issue before proceeding");
}
for (const r of content.filter((x) => x.verdict === "drifted")) {
  console.log(`content drift: ${r.file}:${r.line} no longer holds the quoted text`);
  console.log(`  the line now reads: ${r.nowHolds}…`);
  console.log(r.movedTo !== null
    ? `  the stored quote is now at ${r.file}:${r.movedTo} — correct the citation to :${r.movedTo}`
    : "  the stored quote was not found anywhere in the served file — it may have been superseded or struck");
}
// A trial that could not run says so in its own words, and is never scored as
// a pass. Printed even on an otherwise-clean run: that is the whole point.
for (const r of content.filter((x) => x.verdict === "cannot-tell")) {
  console.log(`content NOT checked: ${r.file}:${r.spec} — ${r.reason}`);
}
if (t.drifted > 0) {
  console.log("the lane refuses with this delta: the pin resolves, and resolves to the WRONG LINE — "
    + "re-read the quoted text at the served head and correct the citation before proceeding");
}

if (stale.length > 0 || deferredUndischarged || t.drifted > 0) {
  console.log(contentSummary(content));
  process.exit(2);
}

// A check that cannot run its trial SAYS SO rather than handing back a clean
// exit code. When the body stored hashes but not one of them could be
// exercised, this is not a pass — it is an unreachable seam, and it exits 11
// on the same degrade contract an unreachable gateway already uses.
if (hashedTrials > 0 && t.verified === 0 && t["cannot-tell"] === hashedTrials) {
  console.log(`content trial did not run: ${t["cannot-tell"]} stored quote hash(es) and not one could be `
    + "exercised against the served surface — this is NOT a clean result, it is an unverified one");
  process.exit(11);
}

// The `ok:` line no longer says `pins current` and stops. It says what was
// compared (commit SHAs), what was verified (content, and how much), and what
// was NOT — because a clean exit code reading as evidence of line liveness is
// the defect kogaki#188 was filed for.
console.log(`ok: pins resolve at the served commit (${cur})`
  + (DEFERRED.test(emitted) ? "; deferred consult discharged (receipt present)" : ""));
console.log(contentSummary(content));
process.exit(0);
