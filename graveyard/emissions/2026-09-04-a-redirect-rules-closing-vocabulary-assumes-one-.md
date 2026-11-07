<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-04
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run named the chained successor kogaki#855. The start-time routing rule redirected entry to its predecessor #801 and printed its standard line: the named issue is not admitted this run, and a singly named issue is reported as UNBLOCKED at close. That word was false. #855 exists precisely because #801 could not be closed, and #855 is itself blocked on a defect in another repository. Landing the predecessor would not unblock it, because the predecessor is not what is holding it.

## The learning

A routing rule that redirects a named item to something upstream tends to describe the outcome in one vocabulary — the item is blocked BY THE THING WE REDIRECTED TO, so once that lands it is free. That holds while the redirect edge is the only edge. It stops holding the moment the named item carries a dependency of its own, and nothing in the redirect notices, because the redirect only ever looked at one relation. The result reads as a status claim and is really a restatement of the edge that was followed. Two things follow. A report line asserting a state should name which edges it actually examined, so a reader can tell 'free once the predecessor lands' from 'free, full stop'. And where an instrument mints a successor to carry a remainder, the successor's own blockers are exactly what the mint knows and the router does not — so the closing vocabulary belongs to whichever of them can see every edge, not to the one that happens to print last.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
