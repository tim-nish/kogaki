#!/usr/bin/env node
// Minimal stdio MCP client for the tsurezure gateway — the kit's one transport.
// Usage: gateway-query.mjs --consumer <name> --tool <tool> --args '<json>'
//        [--gateway <path-to-dist/index.js>]
//
// Contract (client-kit README): on ANY failure to reach or converse with the
// gateway, print exactly one `policy_source unavailable: <reason>` line and
// exit 11 — the caller logs it once and proceeds without policy interaction.
// On success, print the tool result's text content to stdout and exit 0.
//
// The gateway's location is MACHINE-LOCAL CONFIGURATION, never a committed
// path and never directory adjacency (kogaki#9). Resolution order:
//   1. --gateway <path>
//   2. $TSUREZURE_GATEWAY_JS
//   3. the machine-local MCP registration (~/.claude.json), this project first
// Exhausting all three is a degradation, not a crash — same one-line contract.

import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

const argv = process.argv.slice(2);
function opt(name, fallback = undefined) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : fallback;
}

const consumer = opt("consumer");
const tool = opt("tool", "policy_lookup");
const toolArgs = JSON.parse(opt("args", "{}"));
function unavailable(reason) {
  console.log(`policy_source unavailable: ${reason}`);
  process.exit(11);
}

// Source 3: the machine-local MCP registration. Reads the `tsurezure` stdio
// server's argv and returns the first `.js` argument. Never throws — an
// unreadable or absent registration is just an exhausted source.
function gatewayFromMcpRegistration() {
  try {
    const config = JSON.parse(
      readFileSync(join(homedir(), ".claude.json"), "utf8"),
    );
    const scopes = [
      config.projects?.[process.cwd()]?.mcpServers,
      ...Object.values(config.projects ?? {}).map((p) => p?.mcpServers),
      config.mcpServers,
    ];
    for (const servers of scopes) {
      const args = servers?.tsurezure?.args;
      const found = args?.find?.((a) => typeof a === "string" && a.endsWith(".js"));
      if (found) return found;
    }
  } catch {
    // fall through — an unreadable registration is an exhausted source
  }
  return undefined;
}

const gateway =
  opt("gateway") ?? process.env.TSUREZURE_GATEWAY_JS ?? gatewayFromMcpRegistration();

if (!gateway) {
  unavailable(
    "gateway location not configured (--gateway, $TSUREZURE_GATEWAY_JS, " +
      "or an MCP registration named tsurezure)",
  );
}

if (!consumer) {
  console.error("usage: gateway-query.mjs --consumer <name> --tool <tool> --args '<json>'");
  process.exit(2);
}
if (!existsSync(gateway)) unavailable(`gateway not found at ${gateway}`);

const proc = spawn("node", [gateway, "--consumer", consumer], {
  stdio: ["pipe", "pipe", "pipe"],
});
proc.on("error", (e) => unavailable(String(e.message ?? e)));

const timer = setTimeout(() => {
  proc.kill();
  unavailable("timeout after 15s");
}, 15_000);

let buf = "";
const pending = new Map();
proc.stdout.on("data", (d) => {
  buf += d;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl);
    buf = buf.slice(nl + 1);
    if (!line.trim()) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id !== undefined && pending.has(msg.id)) pending.get(msg.id)(msg);
  }
});

function rpc(id, method, params) {
  return new Promise((resolve) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

try {
  await rpc(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "tsurezure-client-kit", version: "0.1.0" },
  });
  proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");
  const res = await rpc(2, "tools/call", { name: tool, arguments: toolArgs });
  clearTimeout(timer);
  proc.kill();
  if (res.error) unavailable(`rpc error: ${res.error.message ?? "unknown"}`);
  const text = (res.result?.content ?? []).map((c) => c.text ?? "").join("");
  if (res.result?.isError) unavailable(`tool error: ${text.slice(0, 200)}`);
  console.log(text);
  process.exit(0);
} catch (e) {
  clearTimeout(timer);
  proc.kill();
  unavailable(String(e?.message ?? e));
}
