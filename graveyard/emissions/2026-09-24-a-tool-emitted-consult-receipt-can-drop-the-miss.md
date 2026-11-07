<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-24
repo: Kogaki
grain: lesson

## Trigger — what happened

At /ship-cycle 1175 on 2026-09-24, consult.mjs printed receipt blocks whose consulted: line ended in a bare pin with a trailing space, although the gateway's own response line for the same call read 'consulted: product-lab@<sha> miss'. The worker carried the blocks verbatim into its commit, and consult-receipts refused both as malformed (pin not '<repo>@<sha> <file:line…>' shaped).

## The learning

A receipt marked tool-emitted is not proof that it passes the repository's own receipt checker. Before a receipt is handed to anyone to carry, compare its consulted: line against the consulted field of the gateway response it came from, and run the receipt checker over the commit that carries it. The fix belongs in the receipt composer, which should copy the served consulted line whole rather than rebuild it from the pin.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
