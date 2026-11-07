<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A reviewer raised a finding twice across two rounds and declined it both times, giving the same reason: obtaining the missing record would cost the pull request its last remaining review round, for something that would not change the code. The reasoning was sound from where the reviewer stood. But the missing record was a comment on an issue, and posting one does not touch the branch, so it costs no round at all. The author saw this immediately; the reviewer could not, because what a remedy costs depends on which surfaces the author is able to write to and in what order, and the reviewer sees only the diff.

## The learning

A review disposition carries two separable claims: how bad the thing is, and what fixing it would cost. The severity is the reviewer's to judge and usually right. The cost is a guess about the author's situation, and a reviewer who never sees the author's other surfaces will systematically overestimate it — they price every remedy as a code change because a diff is the only thing in front of them. So when a decline rests on cost rather than on the finding being wrong, read the cost claim as a question rather than a verdict, and check it against what you can actually reach: a record that lives outside the branch, a field that is set by a separate command, a note on the tracking item. The specific trap is that a repeated decline reads as settled — two rounds agreeing looks like corroboration, when both rounds may simply share one false premise about price. The cheap tell is a decline whose reason is a resource the author might not have to spend.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
