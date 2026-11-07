<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #910's round 2 raised one non-blocking finding and the sitting fixed it as a commit on the reviewed branch. That moved the head past both review reports, so the merge gate's presence read went from round-owed to stale and the PR became unmergeable a second time — this after #908 had already been superseded by #910 for reaching the bound.

## The learning

After the last review round, a fix pushed to the reviewed branch does not make the pull request better; it makes it unmergeable. The gate reads whether a review report exists for the current head, so any commit after the last report invalidates every report the branch has, and no round remains to produce a new one. This is true even when the fix is trivially safe — a one-word correction inside a comment string — because the gate reads the head, never the size of the change. The trap is that the fix looks like diligence: the finding is real, the repair is cheap, and doing it now feels better than filing it. It is not, and the cost is not the round that was spent but the whole submission, which can only continue as a fresh one. So the last round of a bounded review is the point after which repairs stop being repairs and start being a new submission's content: once it lands, the branch is frozen and every remaining finding, however small, is carried rather than fixed.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
