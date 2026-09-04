<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#801 could not execute an owner-ruled close. issue-sync's approve-close needs a classification. It reads two sources in turn: the admission stamp, then the ledger. The repository has registered no admission checks, so admission stamps 'unevaluated', which by its own rule licenses nothing and defers to the ledger. The ledger has no row, and no act writes one any more — it was made read-only history by an earlier decision. Both sources are empty, so the act is unreachable, and its refusal text names as the remedy the very act that had just run and could not help.

## The learning

When one reader falls back from source A to source B, the reader stays correct while each source is separately correct, and the composition can still be dead. Source A said 'I judge nothing here, ask B' — a sound thing for an empty check chain to say. Source B was later frozen as history with its writer removed — also sound on its own. Nobody was positioned to notice that A's only escape hatch had been welded shut, because neither change touched the other's code and each was defensible where it was made. The tell is a refusal whose stated remedy is the act that produced the refusal: that shape means the fallback chain closed into a loop. Two things follow for practice. A fallback is a dependency and should be recorded as one, so removing a writer surfaces every reader that was relying on it. And a failure of this kind is invisible until something needs the missing answer — every earlier step reports success, which is why it is found by a blocked act rather than by a test.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
