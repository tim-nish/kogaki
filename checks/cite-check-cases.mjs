#!/usr/bin/env node
// checks/cite-check-cases.mjs — the citation resolve check's fixture pass,
// moved here from `src/cite-check.mjs --self-test` under kogaki#1238: a Test
// lives only under the declared Check root. Seam-free, every verdict
// constructed; the cases are the same cases, verbatim. Run by
// checks/check-draft-cites.sh, which reads the count this file prints against
// the registry's `case_floor`.
import { GUARANTEE_SPLIT, identityKey, judgeCites, parseCiteRef, parseDraftCites, parseSurveyPayload } from "../src/cite-check.mjs";

function selfTest() {
  let passed = 0; const failures = [];
  const ok = (name, cond) => { if (cond) passed++; else failures.push(name); };
  // THE SERVED RECORDS CARRY THEIR CONTENT HASH (kogaki#1116), because the
  // address form's provenance check reads it. Only `alpha` and `charlie` carry
  // one, deliberately: a record served WITHOUT a content hash is a state the
  // address arm must render rather than crash on, and `bravo` is the case that
  // reaches it.
  const served = new Map([
    [identityKey("alpha", "lesson"), { slug: "alpha", kind: "lesson", content_hash: "a".repeat(64) }],
    [identityKey("bravo", "lesson"), { slug: "bravo", kind: "lesson" }],
    [identityKey("charlie", "journey"), { slug: "charlie", kind: "journey", content_hash: "c".repeat(64) }],
  ]);
  const pin = "product-lab@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const mk = (slug, kind = "lesson", sha = "aaaaaaa") =>
    ({ strand: `L-${slug}`, slug, kind: "cite",
      cite: `gloss/ELEMENTS.jsonl slug=${slug} kind=${kind} @${sha}` });

  // AC1 — the identity form parses to {slug, kind, sha}.
  const ref = parseCiteRef("gloss/ELEMENTS.jsonl slug=alpha kind=lesson @aaaaaaa");
  ok("the identity form parses to slug, kind and sha",
    ref !== null && ref.slug === "alpha" && ref.kind === "lesson" && ref.sha === "aaaaaaa");

  let r = judgeCites([mk("alpha")], served, pin);
  ok("a sound identity cite verifies", r[0].verdict === "verified");

  r = judgeCites([mk("charlie", "journey")], served, pin);
  ok("a journey identity resolves against the journey record", r[0].verdict === "verified");

  // AC1 — the retired positional form is malformed, migration named.
  r = judgeCites([{ strand: "L1", slug: "alpha", kind: "cite",
    cite: "gloss/ELEMENTS.jsonl:1@aaaaaaa" }], served, pin);
  // THE MIGRATION NAMED IS THE CURRENT FORM, not the one that superseded the
  // positional (kogaki#1116). A refusal that pointed at the identity form would
  // send an author to a spelling this repository no longer produces — the
  // positional cite's whole defect was being told to migrate to something, so
  // naming a second stale target is the same failure one generation on.
  ok("a positional cite is malformed and the refusal names the ADDRESS form as the migration",
    r[0].verdict === "malformed" && r[0].detail.includes("retired")
    && r[0].detail.includes("<package>::<kind>/<local-name>@<content_hash>"));

  // AC2 — absent identity resolves nowhere.
  r = judgeCites([mk("zulu")], served, pin);
  ok("an absent identity resolves nowhere, the declared identity named",
    r[0].verdict === "resolves-nowhere" && r[0].detail.includes("slug=zulu kind=lesson"));

  // AC3 — kind discrimination: a journey cite never resolves against the
  // same slug's lesson record (kogaki#600 §Secondary finding).
  r = judgeCites([mk("alpha", "journey")], served, pin);
  ok("a journey cite never resolves against the same slug's lesson record",
    r[0].verdict === "resolves-nowhere" && r[0].detail.includes("kind=journey"));

  // Pin provenance: @<sha> is provenance, never the resolution target.
  r = judgeCites([mk("alpha", "lesson", "bbbbbbb")], served, pin);
  ok("pin drift is disclosed, never silently passed — and the identity still resolved",
    r[0].verdict === "verified-at-current-pin" && r[0].detail.includes("current pin"));

  // ---- THE ADDRESS FORM (kogaki#1116). A Brief minted since that issue cites
  // the served address at its content hash, and `src/draft.mjs` copies those
  // verbatim into the frontmatter this reader judges — so without these arms
  // every cite of every post-#1116 Draft reads `malformed` and the member goes
  // red the first time such a Brief is realized. The suite could not see that:
  // no Draft in the tree carries the new form, so the arms below are what stands
  // in for an artifact that does not exist yet.
  const addr = (slug, kind = "lesson", hash = "a".repeat(64)) =>
    ({ strand: `L-${slug}`, slug, kind: "cite", cite: `coding::${kind}/${slug}@${hash}` });

  const aref = parseCiteRef(`coding::lesson/alpha@${"a".repeat(64)}`);
  ok("the address form parses to package, kind, slug and content hash",
    aref !== null && aref.form === "address" && aref.pkg === "coding"
    && aref.kind === "lesson" && aref.slug === "alpha" && aref.hash === "a".repeat(64));

  r = judgeCites([addr("alpha")], served, pin);
  ok("an address cite at the served content hash verifies", r[0].verdict === "verified");

  r = judgeCites([addr("charlie", "journey", "c".repeat(64))], served, pin);
  ok("an address journey cite resolves against the journey record", r[0].verdict === "verified");

  // THE JOIN KEY IS THE SAME ONE. An address cite must not resolve across kinds
  // any more than an identity cite does — asserted rather than inherited,
  // because the two forms reach `identityKey` down different branches.
  r = judgeCites([addr("alpha", "journey", "a".repeat(64))], served, pin);
  ok("an address journey cite never resolves against the same slug's lesson record",
    r[0].verdict === "resolves-nowhere" && r[0].detail.includes("kind=journey"));

  r = judgeCites([addr("zulu")], served, pin);
  ok("an absent address resolves nowhere, the declared identity named",
    r[0].verdict === "resolves-nowhere" && r[0].detail.includes("slug=zulu kind=lesson"));

  // THE PROVENANCE HALF IS THE POINT OF THE NEW FORM, and it asks a different
  // question from the pin: not "has time passed" but "has THIS Strand's
  // material changed". A moved hash is disclosed and the identity still
  // resolves, exactly as pin drift is.
  r = judgeCites([addr("alpha", "lesson", "b".repeat(64))], served, pin);
  ok("a moved content hash is disclosed, never silently passed — and the identity still resolved",
    r[0].verdict === "verified-at-current-pin" && r[0].detail.includes("material has changed"));

  // ...AND THE PIN IS NOT CONSULTED FOR AN ADDRESS CITE. Judging the same cite
  // against a seam serving a different PIN must not move the verdict: reading
  // the content hash as a pin is the mistake this arm exists to refuse, and it
  // would pass every one of the arms above.
  r = judgeCites([addr("alpha")], served, "product-lab@bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  ok("an address cite's verdict does not move with the substrate pin",
    r[0].verdict === "verified");

  // A SERVED RECORD CARRYING NO CONTENT HASH is a fault to disclose rather than
  // a cite to pass: the comparison cannot be made, so the cite cannot be
  // verified, and the refusal says the seam served none.
  r = judgeCites([addr("bravo")], served, pin);
  ok("an address cite against a record serving no content hash is disclosed rather than verified",
    r[0].verdict === "verified-at-current-pin" && r[0].detail.includes("carrying none"));

  // BOTH FORMS STILL LIVE. Every Draft in the tree cites the identity form, so
  // an implementation that admitted only the new spelling would refuse every
  // artifact that exists — asserted here rather than left to the arms above,
  // which pass under exactly that implementation if read one at a time.
  r = judgeCites([mk("alpha"), addr("alpha")], served, pin);
  ok("the two forms are judged side by side in one Draft",
    r[0].verdict === "verified" && r[1].verdict === "verified");

  r = judgeCites([{ strand: "L1", slug: "alpha", cite: "ELEMENTS:one" }], served, pin);
  ok("a malformed cite is refused as unresolvable form", r[0].verdict === "malformed");

  const cites = parseDraftCites([
    "---", "cites:",
    '  - {"strand":"L1","slug":"alpha","kind":"cite","cite":"gloss/ELEMENTS.jsonl slug=alpha kind=lesson @aaaaaaa"}',
    "---", "body",
  ].join("\n"));
  ok("frontmatter cites parse", cites.length === 1 && cites[0].strand === "L1");

  // New fixture cases (round 1): the recorded-payload adapter trial, and the
  // judged (never dropped) malformed entry.
  const recorded = JSON.stringify({ pin: "product-lab@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    lines: [
      { cite: "gloss/ELEMENTS.jsonl:1@aaaaaaa", text: '{"slug":"alpha","kind":"lesson"}' },
      { cite: "gloss/ELEMENTS.jsonl:2@aaaaaaa", text: "not json" },
      { cite: "gloss/ELEMENTS.jsonl:3@aaaaaaa", text: '{"slug":"kindless"}' },
      { cite: "gloss/INDEX.md:1@aaaaaaa", text: '{"slug":"zulu","kind":"lesson"}' },
    ] });
  const parsed = parseSurveyPayload("noise before payload " + recorded);
  ok("a recorded survey payload parses through the live adapter, keyed by identity",
    parsed.ok && parsed.served.size === 1
    && parsed.served.get(identityKey("alpha", "lesson")).slug === "alpha"
    && parsed.pin.startsWith("product-lab@"));
  ok("a served record lacking string slug/kind is surfaced, never silently dropped",
    parsed.ok && parsed.malformed.length === 2
    && parsed.malformed.some((m) => m.reason.includes("slug/kind"))
    && parsed.malformed.some((m) => m.reason.includes("not readable JSON")));
  const unreadable = parseSurveyPayload("{not json");
  ok("an unreadable payload reaches the parse arm and degrades with its reason, never a throw",
    unreadable.ok === false && unreadable.reason.includes("unreadable"));
  const missShaped = parseSurveyPayload(JSON.stringify({ miss: true, pin: "product-lab@aaaaaaa", request: {} }));
  ok("a miss-shaped payload is a refused trial, never a survey of zero elements",
    missShaped.ok === false && missShaped.reason.includes("miss-shaped"));
  const shapeless = parseSurveyPayload("gateway error 5");
  ok("a shapeless line ending in a digit is refused at the anchor, not parsed as a number",
    shapeless.ok === false && shapeless.reason.includes("no payload"));
  const dropped = parseDraftCites(["---", "cites:", "  - {broken", "---"].join("\n"));
  ok("a malformed cite entry is judged, never dropped",
    dropped.length === 1
    && judgeCites(dropped, served, pin)[0].verdict === "malformed");

  console.log(`cite-check self-test: ${passed} case(s) pass${failures.length ? `, FAILURES: ${failures.join(" | ")}` : ""}`);
  console.log(GUARANTEE_SPLIT);
  if (failures.length) process.exit(1);
}

selfTest();
