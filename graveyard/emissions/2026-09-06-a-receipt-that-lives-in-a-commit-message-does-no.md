<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A pull request was rebased past a squash-merged parent and its one commit was split into two with fresh messages. The original message carried the consultation receipt the merge gate counts; the rewrite dropped it. The local check suite had passed because it ran before the commits existed, so the loss surfaced only in CI, after the final review round had already been spawned at that head, where a repair commit would have made the pull request unmergeable. The receipt was restored in the pull request body, which the gate also reads, and the pull request was closed and reopened so the check re-fired on the edited body at the same head.

## The learning

A fact recorded in a commit message is bound to that message's exact text, and any act that re-authors the message silently deletes the fact while the code it certified stays intact. Rebases, splits and squashes are all such acts. So when a gate counts receipts from commit messages, a rewrite is a boundary crossing that owes the receipt again, and the discipline is to carry the block forward verbatim before writing anything new. When the loss is found late, look for a second counted source that can change without moving the head, because at a spent review bound a new head costs the whole review, and an edited body costs nothing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
