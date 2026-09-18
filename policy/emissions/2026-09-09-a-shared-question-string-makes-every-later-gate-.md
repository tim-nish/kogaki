<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

A terrain tag gate was answered by the owner and the answer vanished: three abandoned runs held open-gate pointers carrying the identical question text, so the capture hook's narrow-never-choose rule matched all three and wrote no row. The run sat at its wait looking exactly like a question that had not been answered.

## The learning

When a gate's question text is a constant, the join from an answer back to the run that asked it is only as unique as the set of runs currently outstanding. Every run abandoned at that gate leaves a live pointer behind, and one orphan is enough to make every later raising of the same gate ambiguous forever after -- the guard against misattribution turns into a permanent refusal to record anything. Two things follow. The failure is silent from the answering side: the owner clicks, the harness reports the answer, and nothing downstream shows that it was dropped, so the only way to see it is to read the run's own record and find it unchanged. And the recovery is not in the software: the stale pointers have to be moved out of the outstanding set by hand before the gate can be answered again. A system that garbage-collects only on success, and treats abandonment as someone else's problem, accumulates exactly the state that disables it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
