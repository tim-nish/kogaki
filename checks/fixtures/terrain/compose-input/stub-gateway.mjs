#!/usr/bin/env node
// A stub tsurezure gateway, for the compose-input fixture ONLY (kogaki#163,
// story 1.33). It speaks the same stdio JSON-RPC the real gateway does, so
// `policy/kit/bin/gateway-query.mjs` reaches it unmodified through
// `$TSUREZURE_GATEWAY_JS` — the kit's own machine-local resolution order,
// used here rather than worked around.
//
// WHY A STUB RATHER THAN THE SELF-REPORTED COUNT. The property story 1.33
// asserts is a COUNT OF SERVED-MATERIAL READS, so the detector's unit has to
// be the read itself: "if the check is reading the system's own explanation of
// what it did, an explanation is not evidence"
// (`match-the-detectors-unit-to-the-propertys-unit`,
// gloss/lessons/testing.md:131@12ba65dd). `compose-input` prints an accounting
// line; this file is what lets the suite disbelieve it. Every `tools/call`
// lands as one line in $STUB_GATEWAY_CALL_LOG, and the check counts the file.
//
// It serves SYNTHETIC material and is never a substrate. Nothing downstream of
// the check reads what it returns, no record it produces is committed, and it
// is reachable only by a caller that sets $TSUREZURE_GATEWAY_JS at it — which
// the check does, per invocation, into a temporary directory.
import { appendFileSync } from "node:fs";

const LOG = process.env.STUB_GATEWAY_CALL_LOG;
const PIN = "product-lab@stubbedstubbedstubbedstubbedstubbedstub";

// Served-shaped Gloss shard: `## <slug>` heading, body lines, `Source:` closing
// the entry — the grammar `parseGlossFull`/`parseGlossShard` read.
//
// THE BODY IS MULTI-LINE AND KIND-DISTINCT, and both are load-bearing for the
// kogaki#234 rendering block below (the 2026-08-08 dogfood falsification).
//   - MULTI-LINE, because §12's property is UNTRUNCATED and the defect it
//     replaces rendered each member as one bullet row. A single-line stub body
//     fits a bullet row, so a fixture built on one cannot tell a whole-body
//     renderer from a flattening one — the body has to be a shape the wrong
//     answer cannot hold.
//   - KIND-DISTINCT (`lessons/…` vs `journeys/…` in the text and in the cite),
//     because the Lesson and Journey shards previously returned IDENTICAL body
//     text for the same slug. An assertion that the Journey Gloss reached the
//     rendering would then have passed on the Lesson Gloss alone, which is a
//     fixture agreeing with itself.
function shard(tag, slugs) {
  const lines = [];
  let n = 0;
  const push = (text) => lines.push({ cite: `gloss/${tag}.md:${++n}@stubbed`, text });
  push(`# Gloss — ${tag}`);
  push("");
  for (const s of slugs) {
    push(`## ${s}`);
    push("");
    push(`Stub ${tag} rendering for ${s}. Two sentences, so a headline reader and a whole-body reader disagree observably.`);
    push(`Second body line for ${s} under ${tag} — a one-line row cannot carry this without flattening or cutting it.`);
    push("");
    push(`Source: ${s}`);
    push("");
  }
  return { miss: false, pin: PIN, request_id: `stub-${slugs.join("-")}`, consulted: `consulted: ${PIN} gloss/${tag}.md:1-${n}`, lines };
}

const SLUGS = ["alpha", "bravo", "charlie", "delta", "echo"];

// THE ELEMENT SET THE NEIGHBORHOOD TRAVERSES (story 1.69, kogaki#473).
// `report` computes the provenance-neighborhood section on every pull
// (SPEC-terrain §13.2 v20), reading `element_survey` for element AND batch
// records — so the stub serves both, deterministically, shaped to exercise
// every §13.4 obligation the check cases assert:
//   - alpha/bravo (the golden seeds, batch `q_a/stub`) reach charlie and echo
//     as batch-mates, foxtrot as a JOURNEY batch-mate (families never pooled),
//     and golf by cross_link only (an outside-population figure with no
//     batch denominator);
//   - bravo's `zulu-missing` link dangles, so one unresolved reference is
//     NAMED with its value;
//   - delta sits alone in batch `q_a/solo` with no links, so a delta-seeded
//     pull enumerates EMPTY and must render the explicit empty lines.
//
// EVERY ELEMENT CARRIES ITS OWN TAGS (kogaki#689). The neighborhood's bounded
// Gloss fetch is keyed on a suggestion record's tags, so a stub whose records
// carried none served the MISS arm for every row — and a golden specimen
// showing only the miss arm pins the shape nobody ships, which is the reason
// this fixture already exercises the judged path rather than the unjudged one.
// `foxtrot` IS TAGGED AND IS A JOURNEY, which is the pairing the namespace fork
// turned on: it is a row whose tags enter the shard union and whose slug only a
// `journeys/` shard can carry. Since kogaki#689 the fetch addresses that
// namespace, so the shard below carries `foxtrot` and the row resolves to a
// served headline — which is what makes the widening observable rather than a
// marker swap. Left untagged it would address no shard for the trivial reason
// and the namespace half would go unexercised. Its level is
// `background` in the committed judgment file, so it renders in no golden
// specimen; the case that needs it supplies its own judgments.
const ELEMENTS = [
  { slug: "alpha", kind: "lesson", source_batch: "q_a/stub", cross_links: ["golf"], tags: ["testing"] },
  { slug: "bravo", kind: "lesson", source_batch: "q_a/stub", cross_links: ["zulu-missing"], tags: ["testing"] },
  { slug: "charlie", kind: "lesson", source_batch: "q_a/stub", tags: ["testing"] },
  { slug: "delta", kind: "lesson", source_batch: "q_a/solo", tags: ["testing"] },
  { slug: "echo", kind: "lesson", source_batch: "q_a/stub", tags: ["testing"] },
  { slug: "foxtrot", kind: "journey", source_batch: "q_a/stub", tags: ["testing"] },
  { slug: "golf", kind: "lesson" },
  // THE CONFORMING ARM (kogaki#654, story 1.91), on the convention
  // STUB_ELEMENT_SURVEY_EMPTY already sets: an env-gated variant rather than a
  // second stub file. The default set above carries `foxtrot` as a JOURNEY
  // with no Lesson row of the same slug, which `validateSurvey` REFUSES as
  // JOURNEY_ORPHAN — correct for the neighborhood cases it was built for, and
  // fatal to a check that must drive a whole run through the `survey` state.
  // This row supplies the missing Lesson so the survey composes, and it is
  // ADDITIVE: with the env unset the served set is byte-identical to what
  // check-terrain-composition.sh has always read.
  ...(process.env.STUB_ELEMENT_SURVEY_CONFORMING === "1"
      ? [{ slug: "foxtrot", kind: "lesson", source_batch: "q_a/stub" }]
      : []),
  { kind: "batch", id: "q_a/stub",
    members: { lesson: ["alpha", "bravo", "charlie", "echo"], journey: ["foxtrot"] } },
  { kind: "batch", id: "q_a/solo", members: { lesson: ["delta"] } },
];

function result(name, args) {
  if (LOG) appendFileSync(LOG, `${name} ${JSON.stringify(args)}\n`);
  if (name === "gloss_index") {
    const tag = String(args?.tag ?? "");
    // A shard address is `<kind>/<tag>`, never `<tag>` alone — the served
    // surface's own kind-qualification rule. An unqualified address is a MISS
    // here, so a caller that dropped the kind fails rather than silently
    // reading something.
    if (!/^(lessons|journeys)\//.test(tag)) return { miss: true, pin: PIN, request_id: "stub-miss", consulted: `consulted: ${PIN} gloss/INDEX.md:1` };
    // `foxtrot` JOINS THE JOURNEYS SHARD (kogaki#689). The neighborhood fetch
    // now addresses both namespaces, so a tagged journey row resolves to a
    // SERVED HEADLINE rather than to a marker — and a shard that carried no
    // entry for it would leave the widening indistinguishable from a marker
    // swap, since the row would render read-and-empty either way.
    return shard(tag, tag.startsWith("journeys/") ? ["alpha", "foxtrot"] : SLUGS);
  }
  if (name === "element_survey") {
    // The no-material arm (story 1.69, PR #477 round 1): with this env set the
    // survey serves ZERO lines, which is how the check exercises the report
    // pull's degradation — the section's explicit did-not-run statement —
    // without a second stub. The default arm is unchanged.
    if (process.env.STUB_ELEMENT_SURVEY_EMPTY === "1") {
      return { miss: false, pin: PIN, request_id: "stub-elements-empty",
        consulted: `consulted: ${PIN} gloss/ELEMENTS.jsonl:1`, lines: [] };
    }
    let n = 0;
    return { miss: false, pin: PIN, request_id: "stub-elements",
      consulted: `consulted: ${PIN} gloss/ELEMENTS.jsonl:1-${ELEMENTS.length}`,
      lines: ELEMENTS.map((r) => ({ cite: `gloss/ELEMENTS.jsonl:${++n}@stubbed`, text: JSON.stringify(r) })) };
  }
  return { miss: true, pin: PIN, request_id: "stub-unknown", consulted: `consulted: ${PIN} gloss/INDEX.md:1` };
}

let buf = "";
process.stdin.on("data", (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl);
    buf = buf.slice(nl + 1);
    if (!line.trim()) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    if (msg.method === "initialize") {
      write({ jsonrpc: "2.0", id: msg.id, result: { protocolVersion: "2024-11-05", capabilities: {}, serverInfo: { name: "stub-gateway", version: "0" } } });
    } else if (msg.method === "tools/call") {
      const payload = result(msg.params?.name, msg.params?.arguments);
      write({ jsonrpc: "2.0", id: msg.id, result: { content: [{ type: "text", text: JSON.stringify(payload) }] } });
    } else if (msg.id !== undefined) {
      write({ jsonrpc: "2.0", id: msg.id, result: {} });
    }
  }
});

function write(o) {
  process.stdout.write(JSON.stringify(o) + "\n");
}
