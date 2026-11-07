<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run was invoked on issue #874. Two of the run's own observation carriers disagreed about what should happen next: the admission stamp read returned NOT admitted — the stamp names a body sha that is no longer current, whose declared discharge is to re-admit the issue in the same sitting and let it re-enter the runnable set; the vitality read returned TRIP — the carrier is CLOSED, whose declared discharge is to stop and raise an arbitration gate. Both reads were correct. The issue had been closed COMPLETED forty minutes earlier, its implementing pull request merged. Had the run followed the admission read, it would have re-admitted and re-driven a carrier that was already discharged, and every individual act along the way would have looked reasonable.

## The learning

When two observation instruments both fire on the same subject and each names its own discharge, the ordering between them is doing the real work, and it is invisible at each instrument. The stamp read asks whether the issue is currently readable as admitted; the vitality read asks whether the issue is still a valid vessel for work at all. The second question dominates the first — an unreadable stamp on a live carrier is a repair, while a perfectly readable stamp on a discharged carrier is a trap — but nothing in either read says so, because each is written from inside its own question. What made the run stop was a sentence elsewhere declaring the vitality gate to be the run's FIRST act on the issue, and that sentence is the whole of the protection. The transferable form: where a process runs several independent readers over one subject and each reader prescribes a remedy, the reader that can invalidate the subject must be named as running first, in the process contract rather than in any reader, because a reader cannot rank itself against readers it does not know about. The corollary is that the ordering rule is load-bearing and unfalsifiable by any single instrument's tests, so it needs its own record of why it holds.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
