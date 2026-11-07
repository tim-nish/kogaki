<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-31
repo: Kogaki
grain: lesson

## Trigger — what happened

A change moved four of twenty registered checks into a different directory. CI kept running all twenty because its runner reads the registry. The review lane kept reporting green while running sixteen, because its declared mechanism was the glob checks/check-star.sh. Nothing reported the narrowing: the lane's output was a pass, the count appeared nowhere, and the two checks it stopped running were the seam gate and the one that would have exercised the same change's new test case.

## The learning

A verifier whose scope is defined by LOCATION silently shrinks when the things it verifies move, and it shrinks into a pass rather than an error, because a pattern matching fewer files is indistinguishable at the output from a suite where fewer files failed. The danger concentrates where two runners exist for one suite: the one defined by MEMBERSHIP stays correct and keeps the other's narrowing invisible, so the disagreement surfaces only in whichever surface nobody is reading against the other. Widening the pattern repairs the instance and preserves the defect, since the next relocation is outside the widened pattern too. Scope belongs to the same declaration that defines membership, and where two consumers need to run one suite they share one runner rather than holding a copy each.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
