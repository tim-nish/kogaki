<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

A change whose whole subject was 'a claim guarded on one path is re-asserted, not carried' installed its own guard on one of two write paths, one clause below a comment warning against exactly that — and the new check written to read the caller set asserted the missing guard's presence by searching the source for its text, so the check passed on the gap it existed to close.

## The learning

When a function has two branches that both perform the act being guarded, a guard on one is not evidence about the other, and the danger is highest when the second branch is described somewhere as read-shaped or already-handled: a comment mis-typing the sibling path is what makes guarding one look sufficient, so a prose claim about a neighbouring path is a thing to VERIFY at the moment you rely on it, not a thing to inherit. The check-side form is sharper — a structural assertion that a guard's text appears somewhere in the source is satisfied by one occurrence and says nothing about arity, so it passes on a two-branch function with one branch guarded; where the property is 'every site that does X also does Y', the assertion must COUNT the sites rather than witness one. And a new direction added to a check owes its own assert-by-breaking run when the existing mutant cannot reach it, because a mutant that reports CANNOT-DETERMINE for a direction leaves that direction unkilled while the block's overall kill count still rises.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
