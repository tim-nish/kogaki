# Tsurezure client kit

The consumer half of the seam, as one install (tsurezure-gateway#78;
spec: `product-lab specs/tsurezure-client-kit.md`, RATIFIED 2026-08-04).
A consumer repository gains, in a single integration: consultation (the
gateway's query tools), the **consultation map** (the occasions file), the
consult-first skill and `CAPABILITIES.md`, and the **issue checkpoints**
(creation-time pin validation, pickup-time pin re-check).

The gateway stays the server and stays read-only. The kit holds **no write
path to the hub**. A repo without the kit, or without an operator grant,
works unchanged — the seam is an enhancer, never a dependency.

## Install

```
policy/kit/install.sh --repo <path-to-consumer-repo> --consumer <name> \
  [--gateway <path-to-gateway>/dist/index.js]
```

The kit lives inside Kogaki (kogaki#9) and separates into its own repository
when a second consumer installs it. The gateway's location is **machine-local
configuration** — `--gateway`, `$TSUREZURE_GATEWAY_JS`, or the MCP
registration — never a committed path and never directory adjacency.

Idempotent. Everything package-owned lives under the consumer's `policy/`
directory (the consumer-decided layout, kogaki#3): it manages exactly one
block in the target's `CLAUDE.md` (between `tsurezure-client-kit` markers,
a pointer into `policy/`), creates `policy/consultation-map.md` and
`policy/CAPABILITIES.md` only when absent or kit-managed, declares the
presence toggle at `policy/source.yaml` only when absent, and checks the
per-project MCP registration — attempting `claude mcp add` and printing the
exact command when it cannot. Old-layout copies from a previous install
(root `CAPABILITIES.md`, `config/policy-source.yaml`) are reported for
removal, never deleted. The operator grant (server side, private operator
config) is never touched from here.

## Degraded behavior (the contract, tested by `test/install-test.sh`)

An unreachable gateway is not a config error: every kit tool prints exactly
one `policy_source unavailable: <reason>` line and exits 11 — the consumer
logs the line once and proceeds without policy interaction.

## Issue checkpoints

- `bin/issue-pins.mjs --validate-body <file>` — creation time: the body must
  carry a Policy pins section with at least one `@<sha>` pin; the current
  served pin is echoed for the filing to record.
- `bin/issue-pins.mjs --recheck <file>` — pickup time: extracts the pinned
  hub commits, queries the current served pin, and exits 2 with the delta
  when policy has moved — the lane refuses with that delta, per the
  2026-08-04 stale-issue lifecycle line.
