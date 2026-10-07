#!/usr/bin/env node
// A fixture gateway for the Terrain runtime's command surface (kogaki#1257).
//
// WHY IT EXISTS. The case files under checks/ used to import the runtime's
// internals and call them in process, which is what kept 75 of its exports
// alive with no reader outside checks/. The cases now drive the runtime the way
// a run does, through `node src/terrain.mjs <command>` or the module's own
// production exports, and the commands that read served material reach the
// gateway through `policy/kit/bin/gateway-query.mjs`. That transport resolves
// the gateway from `$TSUREZURE_GATEWAY_JS`, so a case points it here.
//
// WHAT IT SERVES. The three tools the runtime calls -- `element_survey`,
// `surface_names` and `gloss_index` -- answered from the JSON file named by
// `KOGAKI_FAKE_GATEWAY`:
//
//   { "element_survey": <structured response>,
//     "surface_names":  <structured response>,
//     "gloss_index":    { "<address>": <structured response>, "*": <fallback> } }
//
// A tool the file carries no answer for is answered with the transport's miss
// shape, `{ "miss": true, "lines": [] }`, which is what the substrate says for
// an address it does not serve. Every call is appended to the file named by
// `KOGAKI_FAKE_GATEWAY_LOG`, one JSON line each, so a case can assert WHICH
// addresses the runtime asked for and not only what it rendered from them.
//
// IT SPEAKS THE MCP SHAPE THE TRANSPORT CHECKS, and no more: `initialize`, a
// `tools/list` declaring each tool's argument keys (the transport refuses an
// undeclared key before sending it) and an `outputSchema` of `{}` (a published
// schema that constrains nothing, which the transport admits), and `tools/call`
// answering with `structuredContent`.
import { appendFileSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline";

const TOOLS = [
  { name: "element_survey", inputSchema: { type: "object", properties: { kind: {}, tag: {} } }, outputSchema: {} },
  { name: "surface_names", inputSchema: { type: "object", properties: { kind: {} } }, outputSchema: {} },
  { name: "gloss_index", inputSchema: { type: "object", properties: { tag: {} } }, outputSchema: {} },
];
const MISS = { miss: true, lines: [] };

function answers() {
  const file = process.env.KOGAKI_FAKE_GATEWAY;
  if (!file) return {};
  return JSON.parse(readFileSync(file, "utf8"));
}

function answerFor(tool, args) {
  const all = answers();
  if (tool === "gloss_index") {
    const byAddress = all.gloss_index || {};
    const address = String((args || {}).tag);
    if (Object.prototype.hasOwnProperty.call(byAddress, address)) return byAddress[address];
    return byAddress["*"] || MISS;
  }
  return all[tool] || MISS;
}

function send(msg) {
  process.stdout.write(`${JSON.stringify(msg)}\n`);
}

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  if (msg.id === undefined) return;
  if (msg.method === "initialize") {
    send({ jsonrpc: "2.0", id: msg.id, result: {
      protocolVersion: "2024-11-05", capabilities: { tools: {} },
      serverInfo: { name: "kogaki-fixture-gateway", version: "0" },
    } });
  } else if (msg.method === "tools/list") {
    send({ jsonrpc: "2.0", id: msg.id, result: { tools: TOOLS } });
  } else if (msg.method === "tools/call") {
    const { name, arguments: args } = msg.params || {};
    if (process.env.KOGAKI_FAKE_GATEWAY_LOG) {
      appendFileSync(process.env.KOGAKI_FAKE_GATEWAY_LOG, `${JSON.stringify({ tool: name, args })}\n`);
    }
    const structured = answerFor(name, args);
    send({ jsonrpc: "2.0", id: msg.id, result: {
      content: [{ type: "text", text: JSON.stringify(structured) }],
      structuredContent: structured,
    } });
  } else {
    send({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: `no method ${msg.method}` } });
  }
});
