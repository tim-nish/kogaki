---
id: reg-0025
status: pending
observed_at_pr: 330
observed_at_head: 47e9fd5
class:
recorded: 2026-08-09
source_comment: 5231385306
---
**PR #330 round 2 — the verification line was re-issued one member narrower and is still false (`carried: register`).**

`47e9fd5` closes: *"Verified: all 10 registered checks pass ON THIS COMMIT, boundary-receipts included — stated this time against the state the claim is about."* Run `31311706607`, on that commit, ends `FAIL: review-report`. **Nine pass.**

`review-report` **cannot** be green at commit time — it reads for a review of the head being committed. So the achievable claim was *"9 of 10; `review-report` red pending this head's review"*, and that is what the sentence had to say to be true. The reviewer named it fair in one direction only, which it is.

**This is the sixth instance in one session, in the sentence written to correct the fifth.** Appending because the count is now large enough to diagnose rather than merely tally.

### The six

| # | claim | what falsified it |
|---|---|---|
| 1 | *"the allowlist does not deny shell `grep`"* | a probe: `grep -nE '<regex>'` refused under that allowlist |
| 2 | *"every later `grep` is refused"* (terminal-key width) | `terminal_key`'s own three-word normal form, feet away |
| 3 | *"the retry … cannot succeed"* | the same section's own table — a simple `grep` runs |
| 4 | *"a consumer that stops DISCLOSING … fails here"* | true of the sweep, false of the gate, whose printing is unreachable from its suite |
| 5 | *"the stale claim cannot return silently"* | the fixture greps the composed string; two comments carried the claim |
| 6 | *"all 10 registered checks pass"* (×2) | measured before the commit existed; then measured over a member that cannot pass at commit time |

### The sharpened diagnosis

The earlier entry said these were *"a success line describing the INTENT of a check rather than its ASSERTIONS."* Six instances support something more specific:

**Each sentence generalises exactly one step past the evidence in hand, along a dimension the evidence was silent on.** Not one is invented; each was written while the corresponding measurement was on screen.

- 1–3 generalise across **inputs** (some shapes → all shapes).
- 4–5 generalise across **subjects** (this consumer → both; this string → the whole file).
- 6 generalises across **time and scope** (measured then → true now; nine members → ten).

**Why no suite catches any of them.** The generalisation is *in the summary*, and a check cannot verify its own summary — the summary is downstream of every assertion it describes. Every one of the six was caught by a reader: five by an adversarial reviewer, one by CI disagreeing with a sentence no check reads.

### The instrument, proposed and deliberately not adopted

A verification sentence states **the scope it measured and the moment it measured at**, and never a quantifier over a set it did not enumerate at that moment. Concretely: *"9 of 10 on `47e9fd5`; `review-report` red pending review"* rather than *"all 10 pass"*.

That is checkable in the weak sense — a greppable shape — and worth nothing if adopted by remembering, which is what this register exists to make countable rather than to fix. **Recorded as a proposal.** Whether it becomes a carrier is the reader's call, and the honest note is that a rule requiring the writer to remember it is the shape this repository already rules against.

`consulted: none — an observation about a class recurring inside one session; no served position was brought to bear`

Source: PR #330 round 2, head `47e9fd5`, 2026-08-09. Licensing issue kogaki#328.
