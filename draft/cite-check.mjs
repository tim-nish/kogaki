#!/usr/bin/env node
// The citation resolve check over a CanonicalDraft's own cites
// (SPEC-draft-command v1 §6, kogaki#573; story 1.81, kogaki#588).
//
// THE SOLE MECHANICAL INSTRUMENT ON GROUNDING, and the check's own output
// states the boundary it stops at, quoting the guarantee split it rests on
// (specs/SPEC.md:424-430) — a reader learns the boundary from the instrument.
// It asserts nothing about whether a claim is true, whether an interpretation
// is valid, or whether a scope was widened: those are the author's judgment,
// attributed as such, and Gukan's facts are Gukan's.
//
// WHAT IT RESOLVES. A CanonicalDraft's frontmatter cites are
// `gloss/ELEMENTS.jsonl:<line>@<sha>` entries, each declaring the Strand id
// and slug it grounds. The LessonDisplayID is the line number (SPEC-terrain
// §14.3's join key, stable within a pin), so a cite resolves when the served
// element at that line carries the declared slug. Three refusal shapes:
//   resolves nowhere   — the served survey has no such line;
//   resolves elsewhere — the line exists and carries a DIFFERENT element:
//                        the pin that looks sound while resolving to other
//                        content, this repository's kogaki#266 / PR #580
//                        class, reported with both halves (the cite as
//                        written, what the line now holds) and, where the
//                        declared slug is found at another line, where it
//                        moved to;
//   pin drift          — the served surface is at a different sha than the
//                        cite names; the trial ran at the current pin and
//                        says so, because the seam serves no history.
//
// THE SEAM IS AN ENHANCER, NEVER A DEPENDENCY (CLAUDE.md, Policy seam): an
// unreachable gateway degrades to CANNOT-DETERMINE — the trial did not run,
// stated as such — and never fails the tree. The judge below is a PURE
// function of (cites, served lines), so the fixture pass constructs every
// verdict seam-free; only the live pass touches the transport, the same
// split issue-pins.mjs and gateway-query.mjs declare.
import { readFileSync, readFileSync as rf } from "node:fs";
import { join, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");

// The guarantee split, quoted in the output per AC2. Quoted from
// specs/SPEC.md:424-430 by hand and verified by no instrument — this file is
// outside spec-pin-resolve's corpus (specs/** only, bounded on purpose), so
// the pointer's currency is review's to check, not asserted here.
export const GUARANTEE_SPLIT =
  'the boundary this instrument stops at — "Kogaki guarantees citation ' +
  "integrity — a quoted claim was quoted, and its pin resolves. Gukan " +
  "guarantees the facts. … There is no Fact unit, no fact floor, and no " +
  "provenance map — the citation resolve check over the draft's own cites " +
  'is the sole mechanical instrument on grounding." (specs/SPEC.md:424-430). ' +
  "Nothing here judges whether a claim is true, an interpretation valid, or " +
  "a scope widened — those are the author's judgment, attributed as such.";

// Frontmatter cites: `  - {"strand":"L87","slug":"…","kind":"cite","cite":"gloss/ELEMENTS.jsonl:87@<sha>"}`
export function parseDraftCites(text) {
  const fm = text.split(/^---$/m)[1] ?? "";
  const cites = [];
  const inCites = fm.match(/^cites:\n((?:  - .*\n)*)/m);
  if (!inCites) return cites;
  for (const ln of inCites[1].split("\n")) {
    const m = ln.match(/^  - (.+?)\s*$/);
    if (!m) continue;
    try {
      const v = JSON.parse(m[1]);
      cites.push(typeof v === "object" && v !== null ? v : { unparseable: ln.trim() });
    } catch { cites.push({ unparseable: ln.trim() }); }
  }
  return cites;
}

export function parseCiteRef(cite) {
  const m = (cite ?? "").match(/^gloss\/ELEMENTS\.jsonl:(\d+)@([0-9a-f]{7,40})$/);
  return m ? { line: Number(m[1]), sha: m[2] } : null;
}

// The pure judge: cites × served lines → verdicts. `served` is
// Map<lineNumber, {slug}>; `servedPin` is the pin the fetch ran at.
export function judgeCites(cites, served, servedPin) {
  const results = [];
  const servedSha = (servedPin ?? "").split("@").pop();
  for (const c of cites) {
    if (c.unparseable) {
      results.push({ ...c, verdict: "malformed",
        detail: `the cite entry is not readable JSON and can be judged no further: ${c.unparseable.slice(0, 80)}` });
      continue;
    }
    const ref = parseCiteRef(c.cite);
    if (!ref) {
      results.push({ ...c, verdict: "malformed",
        detail: `the cite is not in resolvable file:line@sha form: ${c.cite}` });
      continue;
    }
    const pinMatch = servedSha ? servedSha.startsWith(ref.sha) || ref.sha.startsWith(servedSha) : false;
    const el = served.get(ref.line);
    if (!el) {
      results.push({ ...c, verdict: "resolves-nowhere", pinMatch,
        detail: `resolves nowhere — the served survey (${served.size} element(s) at ${servedPin}) has no line ${ref.line}` });
      continue;
    }
    if (el.slug !== c.slug) {
      let movedTo = null;
      for (const [n, e] of served) if (e.slug === c.slug) { movedTo = n; break; }
      results.push({ ...c, verdict: "resolves-elsewhere", pinMatch, movedTo,
        detail: `resolves elsewhere — the cite as written (${c.cite}, declaring "${c.slug}") resolves to "${el.slug}"`
          + (movedTo ? `; "${c.slug}" now sits at line ${movedTo}` : `; "${c.slug}" is at no served line`) });
      continue;
    }
    results.push({ ...c, verdict: pinMatch ? "verified" : "verified-at-current-pin", pinMatch,
      detail: pinMatch ? "" : `the cite names ${ref.sha} and the seam serves ${servedPin} — no history is served, so the trial ran at the current pin` });
  }
  return results;
}

export function tally(results) {
  const t = {};
  for (const r of results) t[r.verdict] = (t[r.verdict] ?? 0) + 1;
  return t;
}

// ---------------------------------------------------------------------------
// Transport — the live half, and the only code that touches the seam.
function fetchSurvey() {
  const bin = join(REPO, "policy/kit/bin/gateway-query.mjs");
  const res = spawnSync(process.execPath,
    [bin, "--consumer", "kogaki", "--tool", "element_survey", "--args", "{}"],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) return { ok: false, reason: (res.stdout + res.stderr).trim().split("\n")[0] || `gateway exit ${res.status}` };
  return parseSurveyPayload(res.stdout);
}

// The adapter between the seam and the judge, pure over the transport's text
// so the fixture pass can exercise it with a RECORDED payload (round 1
// finding 2: a-verification-artifact-bound-by-belief-verifies-nothing — a
// made-up Map handed straight to the judge left this parse untried).
export function parseSurveyPayload(stdoutText) {
  try {
    const payload = JSON.parse(stdoutText.slice(stdoutText.indexOf("{")));
    const served = new Map();
    for (const l of payload.lines ?? []) {
      const m = (l.cite ?? "").match(/^gloss\/ELEMENTS\.jsonl:(\d+)@/);
      if (!m) continue;
      try { served.set(Number(m[1]), JSON.parse(l.text)); } catch { /* a broken text line serves no element */ }
    }
    return { ok: true, served, pin: payload.pin ?? null };
  } catch (e) {
    return { ok: false, reason: `survey payload unreadable: ${e.message}` };
  }
}

function runLive(draftPath) {
  const text = readFileSync(draftPath, "utf8");
  const cites = parseDraftCites(text);
  if (cites.length === 0) {
    console.log(`${draftPath}: 0 cites in frontmatter — an explicit zero, not a pass over nothing`);
    return 0;
  }
  const f = fetchSurvey();
  if (!f.ok) {
    console.log(`CANNOT-DETERMINE: ${draftPath} carries ${cites.length} cite(s) and the served seam is unavailable (${f.reason}) — the trial did not run, which is neither a pass nor a failure (absence-verification-counts-exercised-trials)`);
    return 0;
  }
  const results = judgeCites(cites, f.served, f.pin);
  let failed = false;
  for (const r of results) {
    if (r.verdict === "verified") continue;
    const line = `${r.strand ?? "?"} ${r.cite}: ${r.detail}`;
    if (r.verdict === "verified-at-current-pin") console.log(`note: ${line}`);
    else { failed = true; console.log(`FAIL: ${line}`); }
  }
  console.log(`${draftPath}: ${JSON.stringify(tally(results))} over ${cites.length} cite(s) at ${f.pin}`);
  return failed ? 1 : 0;
}

// ---------------------------------------------------------------------------
// The fixture pass — seam-free, every verdict constructed.
function selfTest() {
  let passed = 0; const failures = [];
  const ok = (name, cond) => { if (cond) passed++; else failures.push(name); };
  const served = new Map([
    [1, { slug: "alpha" }], [2, { slug: "bravo" }], [3, { slug: "charlie" }],
  ]);
  const pin = "product-lab@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const mk = (line, slug, sha = "aaaaaaa") =>
    ({ strand: `L${line}`, slug, kind: "cite", cite: `gloss/ELEMENTS.jsonl:${line}@${sha}` });

  let r = judgeCites([mk(1, "alpha")], served, pin);
  ok("a sound cite verifies", r[0].verdict === "verified");

  r = judgeCites([mk(9, "alpha")], served, pin);
  ok("a missing line resolves nowhere, both halves named",
    r[0].verdict === "resolves-nowhere" && r[0].detail.includes("no line 9"));

  // AC4 — the pin that looks sound while resolving to other content.
  r = judgeCites([mk(2, "alpha")], served, pin);
  ok("a resolvable pin carrying the wrong element refuses with both halves and where it moved",
    r[0].verdict === "resolves-elsewhere" && r[0].detail.includes('"bravo"')
    && r[0].movedTo === 1);

  r = judgeCites([mk(2, "zulu")], served, pin);
  ok("a wrong element with no new home says so",
    r[0].verdict === "resolves-elsewhere" && r[0].movedTo === null
    && r[0].detail.includes("no served line"));

  r = judgeCites([mk(1, "alpha", "bbbbbbb")], served, pin);
  ok("pin drift is disclosed, never silently passed",
    r[0].verdict === "verified-at-current-pin" && r[0].detail.includes("current pin"));

  r = judgeCites([{ strand: "L1", slug: "alpha", cite: "ELEMENTS:one" }], served, pin);
  ok("a malformed cite is refused as unresolvable form", r[0].verdict === "malformed");

  const cites = parseDraftCites([
    "---", "cites:",
    '  - {"strand":"L1","slug":"alpha","kind":"cite","cite":"gloss/ELEMENTS.jsonl:1@aaaaaaa"}',
    "---", "body",
  ].join("\n"));
  ok("frontmatter cites parse", cites.length === 1 && cites[0].strand === "L1");

  // New fixture cases (round 1): the recorded-payload adapter trial, and the
  // judged (never dropped) malformed entry.
  const recorded = JSON.stringify({ pin: "product-lab@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lines: [
      { cite: "gloss/ELEMENTS.jsonl:1@aaaaaaa", text: '{"slug":"alpha","kind":"lesson"}' },
      { cite: "gloss/ELEMENTS.jsonl:2@aaaaaaa", text: "not json" },
      { cite: "gloss/INDEX.md:1@aaaaaaa", text: '{"slug":"zulu"}' },
    ] });
  const parsed = parseSurveyPayload("noise before payload " + recorded);
  ok("a recorded survey payload parses through the live adapter",
    parsed.ok && parsed.served.size === 1 && parsed.served.get(1).slug === "alpha"
    && parsed.pin.startsWith("product-lab@"));
  ok("an unreadable payload degrades with its reason, never a throw",
    parseSurveyPayload("garbage").ok === false);
  const dropped = parseDraftCites(["---", "cites:", "  - {broken", "---"].join("\n"));
  ok("a malformed cite entry is judged, never dropped",
    dropped.length === 1
    && judgeCites(dropped, served, pin)[0].verdict === "malformed");

  console.log(`cite-check self-test: ${passed} case(s) pass${failures.length ? `, FAILURES: ${failures.join(" | ")}` : ""}`);
  console.log(GUARANTEE_SPLIT);
  if (failures.length) process.exit(1);
}

const argv = process.argv.slice(2);
if (argv.includes("--self-test")) {
  selfTest();
} else {
  const i = argv.indexOf("--draft");
  if (i === -1 || !argv[i + 1]) {
    process.stderr.write("usage: cite-check.mjs --draft <path to CanonicalDraft> | --self-test\n");
    process.exit(2);
  }
  const rc = runLive(argv[i + 1]);
  console.log(GUARANTEE_SPLIT);
  process.exit(rc);
}
