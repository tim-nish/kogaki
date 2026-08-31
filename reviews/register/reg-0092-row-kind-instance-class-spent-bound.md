---
id: reg-0092
status: pending
observed_at_pr: 467
observed_at_head: 209608b0a1971ad6d54dd682829fb5808382fac9
class:
recorded: 2026-08-15
source_comment: 5300628252
---
**row kind: instance-class** (spent-bound latent non-gating in-diff carry, kogaki#374) — not an `out-of-dimension:` line, and **must not be counted toward rule 3's three-of-a-class widening trigger**.

**PR #467, head `209608b0a1971ad6d54dd682829fb5808382fac9`, round 2 (bound spent).**

`policy/consultation-map.md:888` — entry 4, in the block this PR adds:

> "And it costs nothing on the correct path, which the **four right
> occurrences** demonstrate: two composed no gate, and a gate that carries a
> receipt passes unchanged."

This sentence is a residual of the **superseded** arithmetic ("Two wrong, four
right, six total") that round 1's finding 2 retired. Under the corrected
paragraph 40 lines above it — *"Six spent-bound exits; **four** compose a gate
and are the act class (#332 and #399 wrong, #452 and #455 right …); two compose
none"* — the act class has **two** right occurrences, not four, and the two that
composed no gate are explicitly **non-members**. So the entry now states the
corrected denominator and then, in its own next section, reasons from the count
it just superseded.

Non-gating (`should`), in the diff's own text, and reached at a spent bound
where "resolve it in the review" is unavailable — hence `carried: register`
rather than a minted issue. Remedy is one clause: "which the act class's **two**
right occurrences demonstrate, alongside the two exits that composed no gate at
all".
