---
id: reg-0211
status: pending
observed_at_pr: 773
observed_at_head: 2bb4b8e
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #773 round 2 — `specs/spec-terrain/SPEC.md` §15.8 now reads *"This
section holds the file's only not-carried list and its only slot declaration; a
second copy of either would be a surface that can disagree with this one."*

It is **true at that head** (verified by grep) and it reads as a constraint for
future editors rather than as history, so it is not a criterion-3 breach. What it
is: a **prose declaration of a file-wide state that nothing mechanical
maintains**. The next amendment adding a second slot declaration or a second
not-carried list falsifies a sentence no check reads.

**Third instance of the class for this same file.** reg-0040 and reg-0041 already
record it, and the instrument they name would cover this one too: compare a
spec's `deferred slots:` declarations against its own `deferred-slot:` tokens.
This is a third count against that proposal rather than a new request.

**The irony is worth keeping.** The sentence was written *at round 1* to repair a
duplicate-declaration finding — the fix for "two declarations that can disagree"
was a third sentence asserting there is only one, which nothing checks either.

**Not fixed at the head that produced it.** The two-round bound was spent, the
round-2 report certified `2bb4b8e`, and the Review presence condition merges only
a certified head. At a spent bound a latent non-gating finding defaults to the
register — `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154` — which is the ratified route and the reviewer's
own routing.

Fifth instance in the 2026-09-02 sitting of that composition; see reg-0206 to
reg-0210 and the emission dated the same day.
