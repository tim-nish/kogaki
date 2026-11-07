<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A bound was introduced with two halves: that a fetch happens and is correctly scoped, and that it does not happen at all on the branches that display nothing. A test block was written and headed with the second half, naming the specific over-limit condition. Its body could not construct that condition — the fixture serves three candidates against a limit of ten — so it built a three-candidate case instead, asserted the FIRST half, and said so honestly in an inline comment two lines below the heading. Nothing in the suite checked the second half anywhere. The heading was then quoted verbatim into the change description as evidence the bound was verified, and a reviewer had to trace the body to find that the described case was unreachable. The repair was not to build the unreachable case but to assert the property where it IS decidable: the fetch iterates exactly the display selection, so requiring that selection to be empty on the no-row branches is the same claim, checked at a layer that can hold it.

## The learning

Every part of a test that is not executed is prose, and prose in a test is quoted with the authority of the test. A heading, a block comment, a description string — each reads as a statement about what was verified, and none of them is checked against what the body does. That asymmetry is ordinary and harmless until the body cannot do what the heading says, which happens most often for exactly the reason it happened here: the case is hard or impossible to construct in the available fixture, so a nearby reachable case is substituted while the heading keeps naming the original intent. The author usually knows and often writes it down honestly in the body, which feels like sufficient disclosure and is not — because the heading is the part that travels. It gets copied into descriptions, summaries and release notes; the inline caveat does not. Two moves follow. First, treat the impossibility as the finding rather than as an obstacle to route around: a property you cannot assert at one layer is a signal to ask which layer CAN decide it, and that question usually has a good answer, because a bound expressed over a value some function returns can be checked on that function even when it cannot be provoked end to end. Asserting it there is not a weaker substitute; it is the same claim at the layer that owns it, and it is worth naming both places in the test so a reader knows the split was deliberate. Second, when the reachable case is kept as a guard — proving the mechanism is not simply inert — say that is what it is, because a non-vacuity guard is genuinely valuable and mislabelling it as the bound wastes it twice: the bound goes unchecked and the guard goes uncredited. The general form: a claim's strength is set by the weakest executed statement under it, and everything above that is documentation. Where documentation and execution disagree, the reader believes the documentation, which is why the disagreement is worse than silence.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
