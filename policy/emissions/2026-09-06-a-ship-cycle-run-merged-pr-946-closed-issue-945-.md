<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run merged PR #946, closed issue #945, and was then refused by `issue-sync record-pass 945`: "nothing observed establishes an outcome", because the act reads GitHub's closing-pull-request relation and the repository's own push gate forbids the closing keyword in a PR body — so the PR said "for #945 — the close keyword is withheld per this repository's push gate" and GitHub reported no closing PR. The run genuinely completed; the instrument that grades and records completion could not see it, and can never see it here.

## The learning

A completion record that reads a platform relation is only as reachable as the syntax that creates that relation, so a separate rule forbidding that syntax makes the record permanently unreachable — and the two rules can each be individually correct. Here one gate withholds a closing keyword to stop an unwanted auto-close, and another act derives "this pass advanced the issue" from exactly the relation that keyword would have created; the second was designed to read the fact rather than accept the caller's word for it, which is right, but it bound to a proxy the first gate had already removed. The failure is silent in the direction that matters: the refusal names a missing merge rather than a missing keyword, so it reads as work not done rather than as work done and unrecordable, and every run in the repository grades the same way forever. When an act is hardened to read a fact instead of being told it, name which carrier supplies that fact and check nothing else in the same system is under instruction to suppress it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
