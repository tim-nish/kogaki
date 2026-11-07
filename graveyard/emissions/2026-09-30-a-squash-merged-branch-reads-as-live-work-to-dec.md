<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1225 tripped the carrier-vitality gate on a closed issue; the owner chose decompose, and issue-sync decompose 1225 refused, saying branch 1225-cell2 was not an ancestor of master so unmerged work stood on the licence. PR #1228 from that branch was squash-merged and the branch no longer existed locally or on origin.

## The learning

An 'is this work merged' test that asks whether the branch head is an ancestor of the default branch is always false after a squash merge, so it reports finished work as live. The merged state has to be read from the pull request (MERGED) or the branch's absence, not from ancestry. Until that is fixed, the vitality gate's decompose arm is unreachable for any issue whose work landed through squash merges, which is exactly the closed-carrier case that trips the gate.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
