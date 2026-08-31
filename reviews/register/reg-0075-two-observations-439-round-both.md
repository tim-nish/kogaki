---
id: reg-0075
status: pending
observed_at_pr: 439
observed_at_head:
class:
recorded: 2026-08-14
source_comment: 5292177604
---
## Two observations from PR #439 round 1, both `carried: register`

### 1. The `checks/` half of the reviewer grant still reads the wrong tree — instance-class

`specs/SPEC.md` §4 clause 4 states its rule over **"a spawned round's executable grant"**, not over `tools/` alone. Story 1.63 moved the `tools/` half onto the round's own tree; `CHECK_TOOLS` is untouched and is still built by `python3` in the shell prologue (`tools/review-sweep.sh:771`), in the sweep's own checkout.

**So a PR that adds `checks/check-<new>.sh` still hands the round reviewing it a grant computed in another tree** — PR #411's death one directory over, against the same clause, after the clause was written to prevent it.

Correctly **out of scope** for #437, and not a defect in PR #439: #412's decomposition assigns the `control` finding to story 1.64, and `control` is *"the guard is sited only in the sweep"* — a different property from the tree `CHECK_TOOLS` reads. Recorded here so 1.63's close does not absorb it.

**The reviewer's own routing note:** *"Instance-class, and it wants an issue rather than a ledger row."* Registered here pending that judgment rather than filed unilaterally — the sitting's frontier was #438.

### 2. Mutation tables arrive half-joined — accretion-class

PR #439's record named five mutants and bound two of them to a fixture section; the other three (`floor removed`, `ref path reading the working tree`, `spawn() ceasing to derive over its ref`) named no section, though all three are in fact covered (§3b, §3c, §6).

kogaki#230's obligation is a table *"naming each mutation and which fixtures fail it"*, so a reader currently supplies the last three joins themselves. **No coverage gap** — a record-completeness observation.

Accretion-class deliberately: the value is **how often** mutation tables arrive half-joined across the corpus, not this instance. One occurrence is not evidence for a mechanism.

---

Both routed here by the round-1 report's own dispositions, not re-classified by this session.
