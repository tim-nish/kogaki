<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A live run reproduced a defect that had already been fixed and merged. Reading the working tree, the session found the repair absent from the source and reported it as designed but never shipped, then checked and found local master two commits behind origin: the fix was in a merge commit the checkout did not have. The two local commits were unpushed chores, so nothing looked wrong -- no dirty tree, no conflict, and the branch name was right.

## The learning

A conclusion that a repair is missing is a claim about a checkout, not about a repository, and the two are only the same while the checkout is current. Before reporting that a fix was never shipped, establish that the tree contains what the remote contains -- a fetch and an ancestry check, not a glance at the branch name or a clean status, both of which are silent about being behind. The failure mode is expensive in a particular way: the evidence is real, the reading of it is careful, and the conclusion is confidently wrong, which is exactly the shape that gets a duplicate Issue filed against work that already landed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
