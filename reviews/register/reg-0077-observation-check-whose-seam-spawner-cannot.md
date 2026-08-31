---
id: reg-0077
status: pending
observed_at_pr: 441
observed_at_head:
class:
recorded: 2026-08-14
source_comment: 5293209649
---
## Observation: a check whose seam is the spawner cannot be exercised by the lane reviewing it

From PR #441 round 2 (2026-08-14). Not a defect in that PR — a property of the design, which is why it is registered rather than filed.

### What happened

`checks/check-grant-derivation.sh` asserts the grant by asking the one definition:

```
./tools/review-sweep.sh --print-grant <ref>
```

Round 2 tried to run exactly that and was **denied**:

```
#441: report landed, but the session was denied: Bash(./tools/review-sweep.sh --print-grant HEAD)
```

The reason is correct and deliberate: `tools/review-sweep.sh` is the **spawner**, excluded from every derived grant by capability so a round cannot spawn rounds — §4 clause 3's cap. The exclusion has no exception for a read-only sub-mode.

**So no review round can ever exercise `--print-grant`.** Round 2 routed around it by reading CI's log and said so plainly: *"CI, read rather than re-run."*

### Why it is worth recording

The seam was chosen for a good reason — asking the one definition beats a check re-deriving the property, which would be a second definition free to agree with the first while both were wrong. That trade stands.

The cost is the part nothing records: **a reviewer of such a check can read its source and CI's verdict, but cannot run it.** Its behaviour is verified by the artifact under review's own CI rather than by the lane. That is a weaker position than the lane normally occupies, and it is invisible unless someone hits the denial.

**It generalises.** Any future check built the same way inherits it, and kogaki#442 — the `checks/` half of the grant still reading the sweep's own checkout — is likely to produce more checks reaching through this same seam.

### What this is not

- **Not an argument for granting the spawner.** That would let a round spawn rounds, which is the capability the cap exists to bound.
- **Not a defect in #441.** The check is correct and its CI verdict is real evidence.
- **Not yet a remedy proposal.** Possible shapes exist — a read-only entry point that is not the spawner, or an explicit carve-out for argument-bounded sub-modes — and choosing between them is a decision act, not an observation.

Registered as accretion-class: the value is how often a check's seam turns out to be unreachable by its own reviewer, which is **once** so far.
