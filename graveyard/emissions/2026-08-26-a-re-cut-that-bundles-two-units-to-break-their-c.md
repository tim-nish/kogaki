<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

Two work units blocked each other: one removed an entry point, the other was chartered to adjust the test that invoked it, and each depended on the other landing first. The re-cut bundled both into one unit, on the reasoning that a shared boundary means fewer units. The bundling did break the cycle. It also carried forward, unexamined, the assumption the cycle had made untestable — that adjusting the test was mechanical, because the phrase describing it said 'only where a removed subcommand was the invocation path'. Implementation found the invocation path was the only route the test had to its subject, so the adjustment was a design fork with four alternatives, and the bundled unit stopped for the same reason the split one had.

## The learning

A cycle between two units suppresses evidence about each of them. While neither can land, no one has to establish what either actually costs, because the cycle is a sufficient explanation for why nothing is moving. Bundling removes the cycle and therefore removes the explanation — but it does not supply the evidence the cycle was standing in for, and the bundle inherits every estimate made while that evidence was unavailable.

The estimate most at risk is the one embedded in the phrase that justified the split in the first place. Here it was a scoping clause on the smaller half, written when nobody had tried it: describing an adjustment as touching 'only the invocation path' is a claim about how many routes exist, and a cycle guarantees nobody counted them.

So a re-cut owes a specific check rather than a general one: for each half of the cycle, name the claim that half's charter makes about its own size, and establish it against the tree BEFORE the new unit is filed. This is cheap and mechanical — the claim is always a short phrase in the charter, and the tree is right there — and it is precisely the work the cycle made feel unnecessary.

Two riders. The check belongs at the re-cut, not at implementation, because the re-cut is where the units are being priced. And a re-cut that finds the claim false has not failed: it has recovered the cost the cycle was hiding, which is the only new information available, and the honest response is another cut rather than a bundle that has now inherited the same defect at a larger size.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
