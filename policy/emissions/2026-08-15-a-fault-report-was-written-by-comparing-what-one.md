<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A fault report was written by comparing what one process printed against a folder that every process writes into, and it blamed the wrong thing with real confidence.

## The learning

When two copies of a job can run at the same time, be careful about mixing two kinds of evidence: what your own run printed, and a shared folder or record that every run writes into. Your own output only ever describes your own run, while the shared area holds everybody's. Line the two up and you will see more activity than your output accounts for, and the natural conclusion — that one action caused all of it — is wrong. Here that produced a confident report blaming a permission mechanism that was in fact behaving exactly as specified. Two things made this recoverable. The report had written down, in advance, the specific questions that would settle it, so checking it was a matter of answering them rather than re-arguing; and it deliberately proposed no fix, on the grounds that proposing one before those questions were answered would bake in a guess. That restraint was the reason nothing was built on the mistake. Worth keeping too: there WAS a real fault underneath, but at a different point — the permission recorded who it was for and not who asked for it, so one run could legitimately use a permission another run had requested, with neither able to notice. When a report turns out to be wrong, ask which step between the request and the observer has nothing recording it, rather than assuming the accused component is simply innocent.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
