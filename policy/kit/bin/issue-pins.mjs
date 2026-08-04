#!/usr/bin/env node
// The issue checkpoints (tsurezure-gateway#78 scope item 4; the 2026-08-04
// stale-issue lifecycle line: pins at authoring, creation-time check,
// pickup-time re-check refusing with the delta).
//
//   issue-pins.mjs --validate-body <file> --consumer <name>   (creation time)
//   issue-pins.mjs --recheck <file> --consumer <name>         (pickup time)
//
// Exit codes: 0 ok · 1 validation failed (no pins section / no pins) ·
// 2 policy moved (delta printed — the lane refuses with it) ·
// 11 gateway unavailable (one line printed; caller proceeds generic — an
// unreachable gateway never blocks filing or pickup).

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const argv = process.argv.slice(2);
function opt(name) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
const here = dirname(fileURLToPath(import.meta.url));
const bodyFile = opt("validate-body") ?? opt("recheck");
const mode = opt("validate-body") ? "validate" : opt("recheck") ? "recheck" : null;
const consumer = opt("consumer") ?? "unknown";
if (!mode || !bodyFile) {
  console.error("usage: issue-pins.mjs --validate-body|--recheck <file> --consumer <name>");
  process.exit(2);
}

const body = readFileSync(bodyFile, "utf8");
// A pin may be repo-qualified (`product-lab@sha`, `kogaki@sha`) or a bare
// cite (`file:line@sha`, hub grammar). Keep the qualifier so the recheck
// compares only pins belonging to the served repo — a pin into another
// repository is not evidence the hub moved.
const pinTokens = [...body.matchAll(/([\w.\/:-]*)@([0-9a-f]{7,40})\b/g)].map((m) => ({
  qual: m[1] ?? "",
  sha: m[2],
}));
const pins = [...new Set(pinTokens.map((p) => p.sha))];

function currentPin() {
  // Any lookup returns the served pin; the question exists only to satisfy the
  // tool's schema and is deliberately generic.
  try {
    const out = execFileSync(
      "node",
      [join(here, "gateway-query.mjs"), "--consumer", consumer, "--tool", "policy_lookup",
       "--args", JSON.stringify({ question: "current served pin check" })],
      { encoding: "utf8" },
    );
    const m = out.match(/"pin"\s*:\s*"([^"]+)"/) ?? out.match(/pin:\s*(\S+)/);
    return m ? m[1] : null;
  } catch (e) {
    // gateway-query already printed its one unavailable line on exit 11.
    if (e.status === 11) process.exit(11);
    console.log(`policy_source unavailable: ${String(e.message ?? e).slice(0, 120)}`);
    process.exit(11);
  }
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
  console.log(`ok: ${pins.length} pin(s); current served pin: ${cur ?? "unparsed"}`);
  process.exit(0);
}

// recheck
const cur = currentPin();
const curSha = cur?.split("@").pop() ?? "";
const curRepo = cur?.includes("@") ? cur.split("@")[0] : "";
// Hub pins: qualified with the served repo's name, or bare file:line cites
// (which are hub grammar). Pins qualified to a different repo are excluded.
const hubPins = [...new Set(pinTokens
  .filter((p) => !p.qual || p.qual.includes(":") || (curRepo && p.qual.endsWith(curRepo)))
  .map((p) => p.sha))];
const stale = hubPins.filter((p) => curSha && !curSha.startsWith(p) && !p.startsWith(curSha));
if (stale.length === 0) {
  console.log(`ok: pins current (served ${cur})`);
  process.exit(0);
}
console.log(`policy moved: issue pinned ${stale.join(", ")}; served is ${cur}`);
console.log("the lane refuses with this delta: re-read the pinned lines at the current pin before proceeding");
process.exit(2);
