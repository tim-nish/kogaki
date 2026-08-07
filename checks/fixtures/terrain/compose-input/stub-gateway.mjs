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
function shard(tag, slugs) {
  const lines = [];
  let n = 0;
  const push = (text) => lines.push({ cite: `gloss/${tag}.md:${++n}@stubbed`, text });
  push(`# Gloss — ${tag}`);
  push("");
  for (const s of slugs) {
    push(`## ${s}`);
    push("");
    push(`Stub rendering for ${s}. Two sentences, so a headline reader and a whole-body reader disagree observably.`);
    push("");
    push(`Source: ${s}`);
    push("");
  }
  return { miss: false, pin: PIN, request_id: `stub-${slugs.join("-")}`, consulted: `consulted: ${PIN} gloss/${tag}.md:1-${n}`, lines };
}

const SLUGS = ["alpha", "bravo", "charlie", "delta", "echo"];

function result(name, args) {
  if (LOG) appendFileSync(LOG, `${name} ${JSON.stringify(args)}\n`);
  if (name === "gloss_index") {
    const tag = String(args?.tag ?? "");
    // A shard address is `<kind>/<tag>`, never `<tag>` alone — the served
    // surface's own kind-qualification rule. An unqualified address is a MISS
    // here, so a caller that dropped the kind fails rather than silently
    // reading something.
    if (!/^(lessons|journeys)\//.test(tag)) return { miss: true, pin: PIN, request_id: "stub-miss", consulted: `consulted: ${PIN} gloss/INDEX.md:1` };
    return shard(tag, tag.startsWith("journeys/") ? ["alpha"] : SLUGS);
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
