<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-29
repo: Kogaki
grain: lesson

## Trigger — what happened

One layer already validated a set of judgments against an enumeration, refusing any key that matched nothing. That refusal carried a deliberate narrowing added earlier: it is skipped when the enumeration is empty, because an empty result is a legitimate outcome and refusing there converts it into an error. A new state was then written to validate the same judgments earlier in the flow, and its comment explicitly said that re-implementing a refusal which already ships is how two readings of one rule appear. The refusal was nonetheless re-implemented, and the narrowing did not come with it — so a set whose enumeration was legitimately empty was rendered honestly by one path and rejected outright by the other. Worse, the repair was then unverifiable: no existing case produced an empty enumeration, so removing the narrowing again failed nothing. A case had to be constructed for the empty input before the fix could be shown to do anything.

## The learning

A guard is two things: a condition, and the scope it was narrowed to after meeting reality. The condition is what a reader copies, because it is the part that reads as the rule. The scope is the part that was added later in response to a specific case, and it looks like an incidental exception rather than half the guard. So copying tends to reproduce the general rule and drop the exception, and the resulting divergence is invisible in review of the new code, because the new code reads exactly like a faithful implementation of the rule. What makes the drop dangerous rather than merely untidy is that the two copies now disagree on the case the original was narrowed for — which is by definition a case somebody once hit. The operative correction: when a new site enforces a rule an existing site already enforces, do not re-implement it. Call it, or extract it, so there is one condition and one scope. Where that is impossible, read the original's guard for its narrowings specifically and carry each one with its stated reason, because a narrowing without its reason is the next thing someone deletes as dead. There is a second half here worth keeping separately: a fix for a dropped narrowing is unverifiable against a suite that never produced the narrowed case, and the absence is silent — the mutation passes, and the passing mutation reads as evidence the fix was unnecessary rather than as evidence the test set is incomplete. Building the input that exercises the exception is part of the fix, and that input should assert its own premise, because a case that quietly stops producing the exceptional condition degrades into a duplicate of the ordinary one while still reporting a pass.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
