<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #670's body asserted "All 18 registered checks run green at this head" on the strength of a local run of every checks/check-*.sh. CI was RED at that same head: check-boundary-receipts.sh failed, because the branch's consulted: receipt was written as inline code in the PR BODY and the matcher is line-anchored. The local run passed the same member. Nothing was wrong with either run — the member reads the branch's commit messages and the pull request body, neither of which the local invocation has, so locally it evaluated a different (and empty) input and passed vacuously.

## The learning

A check registry collects members by how they are RUN, not by what they READ, and the run-them-all idiom hides the difference. Most members read the working tree, so a local sweep is genuine evidence for them; a member whose input is the branch's commit messages, the pull request body, or any other out-of-tree carrier is evaluated against a DIFFERENT input locally, and where that input is simply absent it does not fail — it passes on nothing. So the sweep's green is a conjunction over two populations with one label, and the vacuous member is the one whose green looks exactly like the others'. The tell is available at admission and nowhere later: a member's admission record names what it reads, and any member naming a carrier outside the tree cannot be discharged by a local run at all. Two consequences worth stating separately, because only the first is obvious. A claim of suite-wide green sourced from a local sweep is FALSE for that population and must be sourced from the CI run for the exact head instead. And the vacuous pass is worse than a skip: a skip is visible in the output, while a pass on absent input is indistinguishable from a pass on satisfying input, so the local sweep actively supplies confidence about the one member it could not test.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
