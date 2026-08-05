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
consulted: <repo>@<sha> <file:line[,line][, file:line…]>
  request_id: <the id the gateway returned>
  outcome: discriminating | covered-after-reframing | uncovered-after-N-framings
  query: <framing 1, verbatim>
  query: <framing 2, verbatim>
```

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
