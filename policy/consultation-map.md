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
survey **headline-first before acting**. It exists because `policy_lookup`
answers only the questions the consumer thought to ask, while a standing
headline read surfaces lines nobody asked about. It is the finding-aid
carve-out exactly: pre-computing *where to ask*, never *what is true*.

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

**Miss postmortem** — recorded when an entry is added on a miss:

- **Violating artifact** — what shipped, or was about to.
- **Triggering terms** — the terms present in it that would have fired this
  entry.
- **The question, verbatim** — the query that would have found the served
  line. This is the field the map accumulates: situation-specific keys for
  reaching a particular ruling, written by the sitting that discovered one
  was needed.

A postmortem records what was actually asked, or what actually would have
been asked. Where an entry's miss predates the map and no query was ever
composed, the field **says so** rather than inventing one — a reconstructed
question presented as a recorded one is the conformance-copy defect the
pinned-quote rule refuses, moved into a new field.

## Entries

### 1. Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the registry

- **Trigger terms:** check, checker, hook, CI, registry, lint, gate script
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
  - *the question, verbatim:* "Is the gateway access log a surface Kogaki may
    read, or is consult evidence sided between the server's log and the
    consumer's receipts?"
