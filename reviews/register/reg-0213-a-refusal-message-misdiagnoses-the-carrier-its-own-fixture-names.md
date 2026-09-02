---
id: reg-0213
status: pending  # subject RETIRED at PR #777 — see the closing note
observed_at_pr: 775
observed_at_head: 4aedf31
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #775 round 2 — §4.13.1's MALFORMED-MARKER branch names the wrong
repair, and the check block's own fixture is the proof.

The branch was added at round 1 to distinguish *malformed marker* from *no
marker*, on the stated ground that **"an author who wrote one already has the
passage and must not be sent to re-extract it"**. But the branch triggers on any
occurrence of `Excerpt:` in the text, and the fixture written for it in the same
act reads:

> `This record has no Excerpt: yet; re-extract it through the contract.`

— a record whose author has **no passage at all**. It is now told its marker is
malformed and, unlike the absent-marker branch, is **no longer pointed at**
`specs/move-extraction-contract.md`.

**Behaviour is right either way** — both branches refuse exemplar standing, and
the admitting-side defect the branch exists to close stays closed. Only the
**repair the message names** is wrong, and it is wrong for the case the fixture
itself declares likeliest.

**The shape is worth keeping past this instance.** The justification for
splitting a refusal into two messages was a claim about *who hits which branch*,
and that claim was never checked against the branch's actual trigger. A split
justified by an audience model owes a test that the audience is the one the
model names — otherwise the second message is a confident misdirection where one
honest message stood.

**Not fixed at the head that produced it.** The two-round bound was spent and
the round-2 report certified `4aedf31`, which the Review presence condition
requires. At a spent bound a latent non-gating finding defaults to the register
— `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`. Its sibling finding went to kogaki#751 instead,
because that one is latent until the re-extraction and belongs with it; this one
is about wording a reader meets today.

Seventh instance in the 2026-09-02 sitting of that composition; see reg-0206 to
reg-0212.


---

**RETIRED BY PR #777 (2026-09-02), and the entry is kept rather than deleted.**
The owner withdrew the verbatim-excerpt premise: the evidence field is
`excerpt`, holding the author's own account, and the `Excerpt:` marker, its
regex and the malformed-marker branch are all gone. **The branch this entry is
about has no site**, so the misdiagnosed message can no longer be read by
anyone.

Kept because the *class* survives its instance: a refusal split justified by a
claim about WHO hits which branch still owes a test that the audience is the one
the claim names. The entry is now a record of that class with a worked example,
rather than an open repair.
