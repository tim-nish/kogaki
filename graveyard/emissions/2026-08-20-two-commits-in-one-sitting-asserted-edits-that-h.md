<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

Two commits in one sitting asserted edits that had silently no-opped. In each case a patch's anchor text did not match, the patch step raised, and the commit still ran because it was a separate command in the chain — so the commit landed carrying the hunks that did apply, under a message describing all of them.

## The learning

A commit message is written from intent and a commit is made of what applied, and nothing reconciles the two for you. The dangerous shape is a commit carrying several edits where one silently fails: the succeeding hunks make the diff look plausible, the message describes the whole plan, and the missing piece is invisible until someone reads the tree instead of the message. This is worse than a total failure, which is loud. Two cheap guards, and the first is nearly free: make the patch assert that it matched, so a no-op is an error rather than a shrug; and read the staged diff before writing the message, so the message describes the tree rather than the plan. The tell that you need this is a message containing a claim you did not just look at.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
