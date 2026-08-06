---
name: consult-first
description: Consult the policy substrate before acting. Use when a proposal touches a boundary listed in policy/consultation-map.md, when a policy question arises ("does a recorded position bear on this?"), or when a standing question about the hub's state comes up (is X ratified / current design?). Also use before answering an architecture or prior-decision question the served surface may discriminate.
---

# Consult-first — the kit's one discipline

**When to consult (the occasions):** a proposal touches a boundary in
`policy/consultation-map.md`; a policy question exists ("does a recorded
position bear on this?"); or a standing question about the hub's state
arises (is X ratified / current design?). Consult **before acting**, at the
moment the question forms — the tool is in your list precisely so this is
not a remembered ceremony.

**How to consult:** one bounded question per claim — `policy_lookup` with
the claim the decision turns on. Never a whole-surface read, never a
pre-picked file list: the claim bounds the read. Quote served lines
**verbatim at their pin** (`file:line@commit`); a paraphrase of served
policy is an unratified rendering and never ships.

**Outcomes:**
- **Hit** — the position shapes the proposal; the pin rides the artifact
  (issue body, plan, PR description) so the influence is auditable.
- **Miss** (`miss:` or `coverage: partial|low`) — an ANSWER, not a failure:
  proceed on your own judgment, surface the miss beside the decision, and
  note it as a distill-bug signal for the hub. Re-frame once along a
  different axis before recording a miss as uncovered; never widen the read.
- **Unavailable** (one `policy_source unavailable:` line, exit 11) — log it
  once, proceed without policy interaction. Never retry-loop, never treat
  as a config error.

**The seam's hard lines:** the policy source **proposes, never decides** —
a recommendation the owner ratifies or overrides, and an owner override is
a recorded decline, which is the recall surface's raw material. No write
path to the hub exists: a durable insight becomes a **staged proposal**
through the hub's own intake, in the same sitting it arises, without being
asked. The consumer guarantees quotation and pin resolution; the substrate
guarantees the facts — a claim widened beyond its quoted scope is the
author's judgment and is attributed as such.

**On a miss that cost something:** add the boundary to
`policy/consultation-map.md` — trigger terms, the served quote at its pin,
and the miss that earned the entry. That is the only way the map grows.

**The receipt — how a consultation leaves its record.** The act produces no
artifact anyone can see, so the record *is* the act: a fixed token at a fixed
position, whose absence is greppable. Shape (`specs/SPEC.md` §4, kogaki#28):

```
consult-receipt: tool-emitted
consulted: <repo>@<sha> <file:line[,line][, file:line…]>
  request_id: <the id the gateway returned>
  outcome: discriminating | covered-after-reframing | uncovered-after-N-framings
  query: <framing 1, verbatim>
  query: <framing 2, verbatim>
```

**Do not compose this by hand when the transport can emit it** (`specs/SPEC.md`
§4, kogaki#66). Ask the transport for the block and paste what it printed:

```
policy/kit/bin/gateway-query.mjs --consumer <name> --tool policy_lookup \
  --args '{"question":"<framing 1>"}' \
  --args '{"question":"<framing 2>"}' \
  --receipt --outcome <token>
```

One `--args` per framing, in the order you ran them; the block comes out after
the tool results. The transport holds the real `request_id` and the framings it
actually sent, so it has nothing to remember — which is what makes the two
shipped transcription defects unproducible on this path rather than merely
detected (kogaki#32's coined vocabulary, kogaki#75's copied `request_id`).

- **`--outcome` is required and the transport never guesses it.** The token is
  a *reading* of whether the answer discriminated, and who assigns it is still
  open (`deferred-slot: consult-outcome-token-assignment`, owed on kogaki#66).
  Without it the transport refuses with exit 2 rather than choosing.
- **A degraded run emits no receipt.** One `policy_source unavailable:` line
  and exit 11, unchanged: a receipt for a consult that did not happen is the
  fabrication the clause exists to prevent. Exit 12 —
  `receipt not composable:` — is the other refusal: the consult happened, its
  results are printed, and the wire did not carry what a receipt asserts.
- **A hand-composed receipt stays admissible and is MARKED.** Consulting
  through a surface the kit does not mediate — the MCP tools called directly, a
  degraded environment — still owes a receipt; refusing one there would convert
  an obligation into a silence. Mark it, so the exception rate is a count
  rather than an inference:

  ```
  consult-receipt: hand-composed — <why the transport did not mediate>
  consulted: <repo>@<sha> <file:line…>
    request_id: …
  ```

  `grep -c '^consult-receipt: hand-composed'` against
  `grep -c '^consult-receipt:'` is the rate. The marker is **unindented and
  sits above line one** — that placement is load-bearing, not style:
  `checks/check-consult-receipts.sh` recognises only `request_id`, `outcome`
  and `query` as continuation keys, so an unrecognised *indented* key placed
  above them ends the continuation scan and the receipt silently parses as a
  field-less v1 line — and passes.
- **Line one is unchanged from v1** and carries the pin. Continuation lines
  are indented and belong to the `consulted:` line above them.
- **`outcome` is the hub's ratified triple, quoted rather than coined.** A
  bare `miss` is inadmissible: it collapses the distill-bug and query-defect
  causes into one token, in the field meant to tell them apart.
- **A re-framed outcome carries *every* framing's query, not only the last.**
  The token says which cause was found; only the queries let a reader check
  that the re-framing varied the axis rather than rephrasing it.
- **`request_id` is a join key, never a read.** It lets your receipt be paired
  with the server's access-log row without either side reading the other's
  state. Do not dereference it.
- **Quoting this grammar is not emitting a receipt.** Put any example in a
  fenced block; `checks/check-consult-receipts.sh` reads a fenced block as a
  mention and an unfenced `consulted:` line as an emission (kogaki#41).
