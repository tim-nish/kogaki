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
  served pin is echoed for the filing to record, together with how many of
  the body's cited lines carry a stored quote hash and will therefore be
  content-checked at pickup. Coverage is **reported, never required** — a
  body with no cites at all (`consult: none`) files exactly as before.
- `bin/issue-pins.mjs --recheck <file>` — pickup time. Two independent
  comparisons, and the second is why the first is not enough:
  - **Pin currency.** The pinned hub commits against the current served pin;
    exit 2 with the delta when policy has moved, per the 2026-08-04
    stale-issue lifecycle line.
  - **Content liveness** (kogaki#188). A cited line's stored quote hash
    against the text now at that line, re-fetched at the current head.
    Pin currency is a fact about the *commit*; liveness is a fact about the
    *line*, and the substrate is append-only, so a pin drifts as a matter of
    course and the dangerous form still **resolves** — cleanly, onto
    different content, past every guard. A mismatch exits 2 and names the
    line the quote moved to.
  Every run states what it established and what it did not; a clean exit no
  longer implies content liveness that was never checked.
- `bin/issue-pins.mjs --emit-pin-quotes <file>` — the **writer** for the
  stored hash: resolves the body's single-line cites at the current head and
  prints paste-ready `pin-quote:` lines, reporting any cite it could not hash
  and why. The grammar is one unindented line per cited line:

      pin-quote: topics/articles.md:79@f918c51 q1:1a2b3c4d5e6f7a8b

  **THE PLACEMENT RULE, STATED POSITIVELY: a `pin-quote:` line goes BELOW the
  whole `consulted:` block, at column 0 — never between line one and its
  continuations.** Written this way round deliberately (kogaki#209): the rule
  used to name only the *indented* failure, which left the
  unindented-but-interleaved case — a column-0 `pin-quote:` sitting between a
  `consulted:` line and its `request_id:`/`outcome:`/`query:` continuations —
  reading as compliant while breaking the same scan.

  Both failures follow from one fact about the readers, and it is worth
  knowing rather than memorising:

  - `checks/check-consult-receipts.sh`'s continuation scan recognises only
    `request_id`, `outcome` and `query`, and **stops at the first line that is
    not one of them**. Anything between a receipt's line one and its
    continuations therefore ends the scan and silently drops every field after
    it — the receipt reads as v1 and its queries become invisible.
  - An **indented** `pin-quote:` is worse, and is now **refused by name** at
    `--validate-body`. It is *doubly* invisible: `parsePinQuotes` anchors at
    column 0 so it stores no hash and buys no trial, while both strip sites
    anchor there too and so leave its `@<sha>` in the text for the pin scan to
    read as a **second pin** — the body cites one, the scan sees two, and the
    phantom fires `policy moved` with nothing naming the line that caused it.

  So: below the block, at column 0. A run that puts it anywhere else is
  refused at authoring and reported at pickup.
- `bin/issue-pins.mjs --self-test` — the content-liveness fixture pass, pure
  and gateway-free; runs inside `test/install-test.sh`.
