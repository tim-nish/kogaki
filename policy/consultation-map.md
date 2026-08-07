# Consultation map — the occasions file

Boundaries at which policy consultation is **required** before acting.
Contract (founding spec §4):

- An entry = **trigger terms** + a **read prescription** + a one-line summary
  **quoting the served line at its pin** + the pointer. Never a paraphrased
  rule — on divergence the served surface wins and the entry is repaired.
- Entries are added **only on a miss**: a defect that consultation would
  have prevented, exposed in this repo. Each addition names the miss and
  records its **postmortem**.
- The map **triggers consultation, never carries verdicts.** The answer
  stays in the substrate.

## The two structured halves (schema v2, kogaki#24)

**Read prescription** — the act class, and the served gloss shard(s) to
survey **headline-first before acting**. Why the prescription exists, and why
it is admissible under the finding-aid carve-out, is stated once in
`specs/SPEC.md` §4's consultation-map bullet; this file carries the schema
mechanics and does not restate the rationale. Two copies of a governing rule
is the conformance-copy shape the pinned-quote invariant already refuses.

A shard is addressed **`<kind>/<tag>`, never `<tag>` alone** — the served
surface's own kind-qualification rule, quoted at its pin:

> **Shard kinds** (`specs/gloss.md` §5.1 — a shard is addressed by
> `<kind>/<tag>`, never by `<tag>` alone):

`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece gloss/INDEX.md:12-17`

The kinds are `lessons/<tag>`, `journeys/<tag>`, and `decisions/<topic>` —
the last sharded by topic rather than by tag. A prescription names that
address, which is the argument `gloss_index` takes; it never names a served
file path, because a path is a fact about how the substrate stores its
renderings and this map may not depend on one.

**A `Served line (pinned)` pin must RESOLVE ON THE SERVED SURFACE** (kogaki#171).
The pin's own enumeration is `surface_names`, and it returns
`topics/…`, `gloss/lessons/…`, `gloss/journeys/…`, `gloss/decisions/…` and
nothing else — so a pin into a hub *repository* path (`specs/qa-gateway.md`
was the one filed) names a file the served surface will never return, and an
entry carrying one cannot be checked against the surface that is supposed to
win on divergence. That is the pinned-quote invariant's own defect class,
committed by the file that exists to prevent it: the entry looks pinned, and
nothing about it says the pin was never resolvable. Resolve the pin before the
entry lands, and record the hub commit it resolved at.

**Miss postmortem** — recorded when an entry is added on a miss:

- **Violating artifact** — what shipped, or was about to.
- **Triggering terms** — the terms present in it that would have fired this
  entry. **Every term named here is also declared in the entry's own trigger
  terms above.** A postmortem term the entry does not declare is a term
  nothing matches on: the merge-layer binding computes over the *declared*
  list, so the postmortem would be naming a trigger that cannot fire.
- **The question, verbatim** — the query that would have found the served
  line. This is the field the map accumulates: situation-specific keys for
  reaching a particular ruling, written by the sitting that discovered one
  was needed.

**A postmortem discloses the provenance of its question in the question's own
prose.** The field is worth accumulating only if a reader can tell a query
that was *run* from one that was *composed afterwards*, and the two are
indistinguishable once written down. Three cases, all disclosed the same way
— in the prose, no separate field:

- **recorded** — the query was actually issued and the receipt carries it;
  quote it as issued.
- **reconstructed** — the miss is on the record but no query was captured
  (receipts predating the query convention, or a defect found by other
  means); say **reconstructed at this filing, not run**, then give the
  question.
- **none recorded** — the miss predates the map and no query was ever
  composed; say so and give no question.

Inventing a question and presenting it as a recorded one is the
conformance-copy defect the pinned-quote rule refuses, moved into a new
field.

## Entries

### 1. Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the registry

- **Trigger terms:** check, checker, suite, hook, CI, registry, lint,
  gate script
- **Read prescription:**
  - *act class:* admitting, modifying, or retiring a check, hook, or CI
    surface.
  - *survey before acting:* `gloss_index("lessons/claude-code-ops")` and
    `gloss_index("lessons/testing")` — headline-first, both shards, before
    the check is written rather than at review.
- **Served line (pinned):** "a check suite is budgeted at its loop position;
  suite membership is opt-in per loop; admission carries a removal signal
  declared at birth" — `topics/claude-code-ops.md`, 2026-08-04 governance
  lines (product-lab#150 protects the build-vs-adopt clause: the trigger
  counts check-runner consumers, population one).
- **Origin miss:** writing-assistant's suite reached 170+ members with no
  admission economics; the rebuild exists partly to prevent the recurrence
  (owner ruling 2026-08-04).
- **Postmortem:**
  - *violating artifact:* writing-assistant's check suite — 170+ members, no
    admission record and no removal signal on any member.
  - *triggering terms:* check, suite, registry.
  - *the question, verbatim:* **none recorded — this miss predates the map.**
    It was found by the owner's own measurement of suite growth rather than
    by a consultation that failed, so no query exists to record and none is
    invented here.

### 2. Reading substrate state — any Kogaki read of gateway internals rather than served renderings

- **Trigger terms:** access log, access.jsonl, state dir, gateway internals,
  log-verified, receipt count, consult evidence
- **Read prescription:**
  - *act class:* writing an acceptance criterion, check, or report that
    claims evidence about a consultation.
  - *survey before acting:* `gloss_index("lessons/knowledge-architecture")`
    and `gloss_index("lessons/architecture")` — headline-first, before the
    criterion is written, because the defect this entry catches is a
    criterion that is **unimplementable** rather than one that is wrong, and
    that is invisible at review of the criterion's own wording.
- **Served line (pinned):** "served mode = server-side access log is the
  canonical record (caller, realm, files, pin), consumer `consulted:` lines
  remain as their own receipts; logging lives with whichever component
  mediates access" — `topics/archive/knowledge-architecture.md:271@bb68ccf`.
- **Origin miss:** kogaki#7 was classified story-sized on 2026-08-05 without
  consulting this boundary; its acceptance criterion ("verified against the
  gateway access log") would have produced an unimplementable story — the log
  is machine-local, so no CI check can read it, and the read itself sits
  outside the served surface. Consultation at the prior triage would have
  caught both; the next sitting's consult did.
- **Postmortem:**
  - *violating artifact:* kogaki#7's story-lane classification of 2026-08-05,
    and its acceptance criterion "verified against the gateway access log".
  - *triggering terms:* access log, consult evidence.
  - *the question, verbatim:* **reconstructed at this filing, not run** —
    kogaki#7's thread records no consult query, because the recovering
    sitting's receipts predate the convention that a receipt carries the
    query it asked. The question below is what would have found the served
    line, composed here rather than replayed from a record: "Is the gateway
    access log a surface Kogaki may read, or is consult evidence sided
    between the server's log and the consumer's receipts?"

### 3. Record disposition — adopting one record as the live word on what a decision decided

- **Trigger terms:** contradiction, record disagreement, which record wins,
  spec vs staging, adopted vs proposes, superseded, unswept, declination,
  declined, adopted, still stands, reopen condition
- **Read prescription:**
  - *act class:* adopting any record as the **live word on a decision's
    disposition** — what it adopted, declined, held, or superseded — before
    that reading is written into a spec, a review reply, or a gate. The class
    engages **whether or not a second record has been seen.** An occasion
    scoped to a *visible* contradiction fires only after someone has already
    found both sides, which is after the cost has been paid; the case this
    entry is for is the one where the disagreement is latent because the
    other record has not been swept.
  - *survey before acting:* `gloss_index("lessons/knowledge-architecture")`
    — headline-first, before the reading is written down — **and the carrier
    itself read WHOLE** (`gh issue view <n> --comments`, untruncated), because
    a rule that names a source is satisfied by a partial view of it: "When you
    write a rule that names a source, also name what a complete read of that
    source includes — otherwise every partial view counts as compliance"
    (`gloss/lessons/knowledge-architecture.md:41@0cb4606`,
    `a-partial-projection-can-satisfy-a-total-read-rule`).
  - *what does NOT discharge it:* `policy/kit/bin/issue-pins.mjs --recheck`.
    It compares SHAs, so an unmoved hub HEAD exits 0 `pins current` while the
    line at that pin is superseded by something not yet swept into it. Pin
    currency is a fact about the commit; liveness is a fact about the line.
- **Served line (pinned):** the disposition read has two halves and neither is
  settled by recency alone — "Say which system decides which half. Being
  written more recently says when someone wrote, not what they could see"
  (`gloss/lessons/knowledge-architecture.md:197@0cb4606`,
  `declare-precedence-per-axis-not-per-artifact`) — and within the standing
  half a disagreement is surfaced rather than absorbed: "read the decision
  record for verdicts dated after that evidence, and when they conflict the
  later verdict wins and the conflict is reported rather than quietly
  reconciled" (`gloss/lessons/knowledge-architecture.md:257@0cb4606`,
  `merged-code-evidences-existence-never-standing`).
- **Origin miss:** `specs/spec-draft-pipeline/SPEC.md` v1 (PR #157, `b3722cb`)
  shipped with the Move library held, because the spec lane read
  `topics/articles.md`, whose newest line on the question was a **2026-08-04
  declination**, and adopted it as the live word on kogaki#127's disposition —
  while the owner's **2026-08-06 adoption** existed only in an unswept hub
  staging file. Four receipts were emitted, every one well-formed, every one
  serving a superseded line as the live word; the branch's pin recheck exited
  0. The same disagreement surfaced hub-side the next day, as a direct
  spec-vs-staging contradiction about the same act, and was resolved silently
  there too (kogaki#171). **Sited here** because the consequence was exposed
  here — the wrong standing claim fed this repo's Brief decision chain and the
  contradiction's spec side is this repo's artifact; the hub-side carrier is
  product-lab#160's Recall-rule amendment, cross-referenced so neither filing
  assumes the other.
- **Postmortem:**
  - *violating artifact:* `specs/spec-draft-pipeline/SPEC.md` v1 §7's hold of
    the Move library, and the 2026-08-07 review reply "Move library held —
    settled design" that rested on it, both produced by adopting one record's
    newest line as the disposition without reading for a later one.
  - *triggering terms:* declination, declined, reopen condition — **measured
    rather than assumed.** Over the twelve most recently merged PRs at
    `1453248`, the declared list matches #157 (the violating PR), #156 and
    #144, and nothing else. The terms this entry was filed with — contradiction,
    spec vs staging, adopted vs proposes, unswept, superseded, record
    disagreement — match the miss **nowhere**, in the diff paths, the changed
    text or the linked issue body, because a latent disagreement is never
    described as a contradiction by the act that commits it. They stay declared
    beside the disposition vocabulary rather than instead of it: they are the
    terms of the *found* case, which this entry also covers.
  - *the question, verbatim:* **reconstructed at this filing, not run** — no
    query was issued at either moment of resolution. Composed here, and then
    issued against the served surface at this filing, where it discriminated:
    "Two records disagree about what a decision adopted — a spec says one
    thing, an unswept staging file says another. May the disagreement be
    resolved silently by ratification status, or must the conflict be surfaced
    as a finding before either side is adopted?"
