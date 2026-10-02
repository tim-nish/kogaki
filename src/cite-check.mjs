#!/usr/bin/env node
// The citation resolve check over a CanonicalDraft's own cites
// (kogaki#573; story 1.81, kogaki#588).
// [see: SPEC-draft-command "One mechanical instrument on grounding, and no
// second"]
//
// SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
// The rule these entries are written under -- what a copy is, what the two
// markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
// names a section number or a line range -- lives in ONE place:
// `src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
// already drifted into eight variants, which is what kogaki#982 collapsed.
//
// THE NAMES THIS FILE USES, and the spec each one names:
//   One mechanical instrument on grounding, and no second
//       SPEC-draft-command
//   The guarantee split
//       specs/SPEC.md
//   Schema — the record half
//       SPEC-draft-command
//   Completeness is a cover counted in placements
//       SPEC-terrain
//
// THE SOLE MECHANICAL INSTRUMENT ON GROUNDING, and the check's own output
// states the boundary it stops at, quoting the guarantee split it rests on
// — a reader learns the boundary from the instrument.
// [implemented-against: specs/SPEC.md "The guarantee split", copied 2026-09-06]
// It asserts nothing about whether a claim is true, whether an interpretation
// is valid, or whether a scope was widened: those are the author's judgment,
// attributed as such, and Gukan's facts are Gukan's.
//
// WHAT IT RESOLVES. A CanonicalDraft's frontmatter carries cites in TWO live
// forms, and the join key is the same in both: `(kind, slug)`, resolved against
// the served survey at its current HEAD.
//
//   the ADDRESS form, `<package>::<kind>/<local-name>@<content_hash>`
//   (kogaki#1116) — what a Brief minted since that issue cites. The hash is the
//   RECORD's own, so the provenance question it answers is whether THIS
//   Strand's material has moved since the Draft cited it.
//
//   the IDENTITY form, `gloss/ELEMENTS.jsonl slug=<slug> kind=<lesson|journey>
//   @<sha>` (SPEC-draft-command §"Schema — the record half", v2, kogaki#600) —
//   what every Draft in the tree carries. The `@<sha>` substrate pin is
//   PROVENANCE, never the resolution target, and it dates the whole response,
//   so the only question it answers is whether time has passed.
//
// BOTH ARE ADMITTED, and the older one is not deprecated here: a reader that
// took only the new spelling would refuse every artifact that exists. What the
// address form buys is the sharper provenance question, which is why the commit
// pin was deprecated at the producing end rather than the reading end.
//
// The prior positional form
// `gloss/ELEMENTS.jsonl:<line>@<sha>` is retired as a scheduled defect —
// the hub regenerates the manifest wholesale at every distill close, so
// every positional cite broke at the first close after authoring while
// every cited identity survived (kogaki#600). Refusal shapes:
//   malformed          — including every positional cite, refused with the
//                        ADDRESS form named as the migration (kogaki#1116):
//                        naming the identity form would send an author to a
//                        spelling this repository no longer produces;
//   resolves nowhere   — the served survey holds no record with the
//                        declared (slug, kind) identity;
//   pin drift          — the served surface is at a different sha than the
//                        cite names; the trial ran at the current pin and
//                        says so, because the seam serves no history.
// The old resolves-elsewhere class (a line resolving to other content,
// kogaki#266 / PR #580) is unreachable under identity addressing: no
// line-based lookup exists to resolve to the wrong record.
//
// THE SEAM IS AN ENHANCER, NEVER A DEPENDENCY (CLAUDE.md, Policy seam): an
// unreachable gateway degrades to CANNOT-DETERMINE — the trial did not run,
// stated as such — and never fails the tree. The judge below is a PURE
// function of (cites, served lines), so the fixture pass constructs every
// verdict seam-free; only the live pass touches the transport, the same
// split issue-pins.mjs and gateway-query.mjs declare.
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");

// The guarantee split, quoted in the output per AC2. This is a COPY of the
// content this check was implemented against, not a live read: it stays true
// for this instrument even if the spec is rewritten or deleted, and
// propagating a later change to the split into this constant is a separate,
// explicit act. The line range this comment used to carry had already drifted
// onto the Check-registry bullet, and the quote below was printed to the owner
// under it (kogaki#902).
// [implemented-against: specs/SPEC.md "The guarantee split", copied 2026-09-06]
export const GUARANTEE_SPLIT =
  'the boundary this instrument stops at — "Kogaki guarantees citation ' +
  "integrity — a quoted claim was quoted, and its pin resolves. Gukan " +
  "guarantees the facts. … There is no Fact unit, no fact floor, and no " +
  "provenance map — the citation resolve check over the draft's own cites " +
  'is the sole mechanical instrument on grounding." ' +
  "Nothing here judges whether a claim is true, an interpretation valid, or " +
  "a scope widened — those are the author's judgment, attributed as such.";

// Frontmatter cites: `  - {"strand":"L87","slug":"…","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=… kind=lesson @<sha>"}`
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

// The identity form (SPEC-draft-command v2, kogaki#600): (slug, kind) is the
// join key; @<sha> is provenance. The retired positional form is recognized
// only to refuse it with the migration named.
const IDENTITY_RE = /^gloss\/ELEMENTS\.jsonl slug=([A-Za-z0-9._-]+) kind=(lesson|journey) @([0-9a-f]{7,40})$/;
const POSITIONAL_RE = /^gloss\/ELEMENTS\.jsonl:\d+@[0-9a-f]{7,40}$/;

// THE ADDRESS FORM (kogaki#1116). A Brief minted since that issue cites a Strand
// as the SERVED ADDRESS AT ITS CONTENT HASH — `<package>::<kind>/<local-name>@
// <content_hash>` — and `src/draft.mjs` copies those verbatim into the
// CanonicalDraft's frontmatter, so this reader is the party the change reaches
// next. It is added BESIDE the identity form rather than replacing it: every
// Draft in the tree predates the change and cites the identity form, and a
// reader that admitted only the new spelling would refuse every artifact that
// exists.
//
// THE JOIN KEY IS UNCHANGED, AND THAT IS THE POINT. `<kind>/<local-name>` is
// (kind, slug) written the way the Package writes it, so an address cite
// resolves through `identityKey` exactly as an identity cite does — no second
// lookup, no second served map, and no way for the two forms to disagree about
// what a cite resolves to.
//
// WHAT DIFFERS IS THE PROVENANCE HALF, and it is strictly better. The identity
// form's `@<sha>` is a SUBSTRATE PIN: it dates the whole response, so it said
// the same thing about every cite in a Draft and nothing about whether any one
// Strand's material had moved — which is why the only check available was
// "does this pin match the pin the seam is serving now", and a mismatch meant
// only that time had passed. A content hash is per record, so the same
// comparison becomes the question worth asking: has THIS Strand's material
// changed since the Draft cited it. The verdict vocabulary is unchanged, and
// `verified-at-current-pin` carries the sharper reading for the new form.
const ADDRESS_RE = /^([A-Za-z0-9._-]+)::(lesson|journey)\/([A-Za-z0-9._-]+)@([0-9a-f]{7,64})$/;

export function parseCiteRef(cite) {
  const m = (cite ?? "").match(IDENTITY_RE);
  if (m) return { slug: m[1], kind: m[2], sha: m[3], form: "identity" };
  const a = (cite ?? "").match(ADDRESS_RE);
  return a ? { pkg: a[1], kind: a[2], slug: a[3], hash: a[4], form: "address" } : null;
}

// The served lookup's key: identity, never position — kind is in the key so
// a journey cite can never resolve against the same slug's lesson record
// (kogaki#600 §Secondary finding: the slug-only relocation hint returned the
// lesson record's line for a journey cite; that class is unreachable here).
export function identityKey(slug, kind) {
  return `${kind} ${slug}`;
}

// The pure judge: cites × served records → verdicts. `served` is
// Map<identityKey(slug, kind), record>; `servedPin` is the pin the fetch
// ran at.
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
      const positional = POSITIONAL_RE.test(c.cite ?? "");
      results.push({ ...c, verdict: "malformed",
        detail: positional
          ? `the positional form gloss/ELEMENTS.jsonl:<line>@<sha> is retired (SPEC-draft-command v2, kogaki#600) — migrate to the address form <package>::<kind>/<local-name>@<content_hash> (kogaki#1116): ${c.cite}`
          : `the cite is in neither resolvable form — the address form <package>::<kind>/<local-name>@<content_hash> (kogaki#1116) nor the identity form gloss/ELEMENTS.jsonl slug=<slug> kind=<lesson|journey> @<sha> it succeeds: ${c.cite}` });
      continue;
    }
    const el = served.get(identityKey(ref.slug, ref.kind));
    // THE PROVENANCE CHECK IS PER FORM, and the two are different questions
    // (kogaki#1116). An identity cite carries a SUBSTRATE PIN, so the only
    // answerable question is whether time has passed since it was written. An
    // address cite carries the record's OWN content hash, so the question is
    // whether THIS Strand's material has moved — which is what the cite was
    // changed to make askable, and reading it as a pin would throw that away.
    const pinMatch = ref.form === "address"
      ? Boolean(el) && el.content_hash === ref.hash
      : servedSha ? servedSha.startsWith(ref.sha) || ref.sha.startsWith(servedSha) : false;
    if (!el) {
      results.push({ ...c, verdict: "resolves-nowhere", pinMatch,
        detail: `resolves nowhere — the served survey (${served.size} record(s) at ${servedPin}) holds no record slug=${ref.slug} kind=${ref.kind}` });
      continue;
    }
    results.push({ ...c, verdict: pinMatch ? "verified" : "verified-at-current-pin", pinMatch,
      detail: pinMatch ? ""
        : ref.form === "address"
          ? `the cite names content hash ${ref.hash} and the seam serves ${el.content_hash ?? "a record carrying none"} — this Strand's material has changed since the Draft cited it, and no history is served, so the trial ran against the current content`
          : `the cite names ${ref.sha} and the seam serves ${servedPin} — no history is served, so the trial ran at the current pin` });
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
//
// THE CAPTURE IS A PIPE, AND THE FORK IS RECORDED (kogaki#597, from PR #591
// round 2): src/terrain.mjs captures the same ~500KB element_survey
// through a file descriptor and says why — a file write is synchronous
// whatever the other side does. This file takes the pipe deliberately: the
// kit drains stdout before exiting (kogaki#23), terrain's own comment states
// the pipe would work under that drain, and this caller runs one bounded
// fetch per invocation rather than a survey loop. If the drain guarantee
// ever moves, this is the line to revisit.
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
  // A payload with no lines ARRAY is the gateway's miss shape (or noise), not
  // a survey of zero elements — reading it as ok would render every cite
  // resolves-nowhere, the loud wrong answer kogaki#597 names and terrain met
  // at the same seam tool (src/terrain.mjs, kogaki#368). Refuse at the
  // shape, so the caller degrades to CANNOT-DETERMINE.
  const start = stdoutText.indexOf("{");
  if (start < 0) {
    return { ok: false, reason: `no payload in the transport's output: ${stdoutText.trim().slice(0, 80) || "(empty)"}` };
  }
  try {
    const payload = JSON.parse(stdoutText.slice(start));
    if (!Array.isArray(payload.lines)) {
      return { ok: false, reason: "miss-shaped payload — no lines array; the trial did not run" };
    }
    // Keyed by (slug, kind) read from each served record's OWN fields —
    // identity, never position (SPEC-draft-command v2, kogaki#600). A record
    // that anchors as an ELEMENTS line but yields no string slug/kind is
    // SURFACED, never silently dropped (kogaki#613): a cite naming it would
    // otherwise report resolves-nowhere and point the author at the wrong
    // repair — the cite, when the defect is the served record. Same rule as
    // terrain's composition cover ("nothing is silently dropped")
    // [see: SPEC-terrain "Completeness is a cover counted in placements"].
    const served = new Map();
    const malformed = [];
    for (const l of payload.lines) {
      if (!/^gloss\/ELEMENTS\.jsonl:/.test(l.cite ?? "")) continue;
      try {
        const el = JSON.parse(l.text);
        if (typeof el?.slug === "string" && typeof el?.kind === "string") {
          served.set(identityKey(el.slug, el.kind), el);
        } else {
          malformed.push({ cite: l.cite ?? "?",
            reason: "the served record lacks string slug/kind — the repair belongs on the served record, not on any cite that names it" });
        }
      } catch {
        malformed.push({ cite: l.cite ?? "?",
          reason: "the served record's text is not readable JSON" });
      }
    }
    return { ok: true, served, pin: payload.pin ?? null, malformed };
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
  for (const m of f.malformed ?? []) {
    console.log(`note: served-record ${m.cite}: ${m.reason}`);
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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--draft");
  if (i === -1 || !argv[i + 1]) {
    process.stderr.write("usage: cite-check.mjs --draft <path to CanonicalDraft>\n");
    process.exit(2);
  }
  const rc = runLive(argv[i + 1]);
  console.log(GUARANTEE_SPLIT);
  process.exit(rc);
}
