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

**How to consult:** through the entry point, which carries the discipline
below so it is not a memory test (`specs/SPEC.md` §4, kogaki#66):

```
policy/kit/bin/consult.mjs --consumer <name> \
  --claim '<the claim the decision turns on>' \
  --claim '<the re-framing, along a DIFFERENT axis>' \
  --outcome discriminating | covered-after-reframing | uncovered-after-N-framings
```

One bounded claim per `--claim`. Never a whole-surface read, never a
pre-picked file list: the claim bounds the read. Quote served lines
**verbatim at their pin** (`file:line@commit`); a paraphrase of served
policy is an unratified rendering and never ships.

The entry point runs the lookup and emits the receipt **through the
transport** (there is one receipt composer in the kit, in
`gateway-query.mjs`). What it adds is the three rules that used to live only
in this file as sentences:

- **The seam is never asked for a verdict.** A verdict-shaped input — a
  question asking whether something is acceptable, correct or problematic
  rather than stating a claim — is corrected **at the point of use** and not
  forwarded (exit 3): *the seam serves positions, not verdicts; state the
  claim the decision turns on*. The review supplies the claims, the seam
  supplies the positions. The correction is an affordance, not a denial:
  re-submit in the same act with `--restate '<the claim>'`, once per flagged
  framing, in order.
- **A non-discriminating return owes exactly one re-framing along a different
  axis.** Any `--outcome` other than `discriminating` with a single `--claim`
  is refused (exit 4) with what the second framing owes. The entry point
  **prompts**; it does not compose the re-framing for you, because whether the
  axis really varied is a judgment and this tool holds no reading of the
  return. Supply the second `--claim` and the same invocation proceeds.
- **The count is the tool's and the token is yours.** The framing count and
  every `query:` line are transport facts and are emitted as such; `--outcome`
  is required and never derived (below). One re-framing is the bound — one
  axis, a fixed bound, never a search loop.

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
§4, kogaki#66). `consult.mjs` above prints the block after the tool results;
the transport underneath it is callable directly when you need a tool other
than `policy_lookup` in a shape the entry point does not carry, or more
framings than the entry point's bound:

```
policy/kit/bin/gateway-query.mjs --consumer <name> --tool policy_lookup \
  --args '{"question":"<framing 1>"}' --question '<framing 1>' \
  --args '{"question":"<framing 2>"}' --question '<framing 2>' \
  --receipt --outcome <token>
```

One `--args` per framing, in the order you ran them. The transport holds the
real `request_id` and the framings it actually sent, so it has nothing to
remember — which is what makes the two shipped transcription defects
unproducible on this path rather than merely detected (kogaki#32's coined
vocabulary, kogaki#75's copied `request_id`). Going around the entry point
costs you the three rules above; say so in the PR if you do.

- **`--question` is required in receipt mode, one per `--args`, same order**
  (kogaki#160 finding 4). The `query:` line is *the question, verbatim* —
  the key a later reader reuses to reach the same ruling
  (`policy/consultation-map.md :67@a3b635d (the Miss-postmortem field)`) — and until this argument existed the
  transport had to derive it: `policy_lookup`'s question came off its own
  arguments, and every other tool had its `--args` JSON recorded instead. A
  `gloss_index` consult therefore emitted `query: {"tag":"lessons/testing"}`
  and passed every check, which is a well-formed receipt that records nothing
  anyone can reuse. **The question binds to a CALL, not to the invocation:**
  framing *i*'s `--question` is the question asked of framing *i*'s gateway
  call, and the receipt's `request_id` is the LAST framing's — so the last
  `query:` line and the `request_id` are the same call's, and every earlier
  `query:` line names an earlier call in the order they ran. Without one per
  framing the transport refuses (exit 2) before the wire; a `--question`
  disagreeing with a `policy_lookup` framing's own `question` argument is
  refused too, because one of the two is not what ran.
- **A prescription whose tool is not `policy_lookup` now goes through the entry
  point.** `consult.mjs` takes `--args '<json>'` positionally against
  `--claim`, sending the tool its arguments and the claim as the call's
  question — so the consultation map's entry-1 prescription (`gloss_index`)
  is mediated rather than requiring a bare transport call:

```
policy/kit/bin/consult.mjs --consumer <name> --tool gloss_index \
  --claim '<the question this read is for>' --args '{"tag":"lessons/testing"}' \
  --outcome <token>
```

- **`--outcome` is required and no tool here ever guesses it.** The token is a
  *reading* of whether the answer discriminated, and **the operator supplies
  it** — `deferred-slot: consult-outcome-token-assignment` is FILLED (owner
  decision 2026-08-06, `specs/SPEC.md` §4, kogaki#66). The tools emit only what
  they observed as fact — the `request_id`, every `query:` line, the framing
  count — and fail rather than guessing the rest. Without `--outcome` both the
  entry point and the transport refuse with exit 2 rather than choosing. A
  token that contradicts an observed fact (an `uncovered-after-N` whose N is
  not the number of framings) is refused too, never repaired: repairing it
  would be the tool assigning the token by the back door.
- **A degraded run emits no receipt, and the fallback is stated rather than
  silent.** One `policy_source unavailable:` line and exit 11, unchanged: a
  receipt for a consult that did not happen is the fabrication the clause
  exists to prevent. The entry point then prints the degraded path itself —
  the direct MCP tools (`mcp__tsurezure__policy_lookup` and its neighbours in
  `policy/CAPABILITIES.md`) with the same bounded claim and the same one
  re-framing, plus a hand-composed receipt carrying the marker below. If the
  entry point itself is unavailable, that same route is the answer; the
  discipline degrades to prose, it does not degrade to nothing. Exit 12 —
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
