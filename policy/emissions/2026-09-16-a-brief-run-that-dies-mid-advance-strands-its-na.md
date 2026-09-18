<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-16
repo: Kogaki
grain: lesson

## Trigger — what happened

A /brief start refused at the mint: theses/test-proves-something-only-there/ already existed, minted 87 minutes earlier by a run that then died mid-advance after its second gate. Investigating whether that earlier run could be resumed showed it could not, and the blocking directory held nothing composed.

## The learning

When a run's only way to move forward is a hook that fires on an owner answering a gate, a run that dies after its last gate is answered is dead for good: there is no answer left to give, so nothing can restart it. If such a run has already created a durable, uniquely-named artifact, that artifact now blocks every later attempt under the same name while containing none of the work. The two failures compound — the run cannot finish and it cannot be retried — and neither is visible from the artifact, which looks like a legitimate piece of work in progress rather than the residue of a dead run. Before treating such a collision as a real conflict, check whether the blocking artifact contains anything beyond what its creation step writes; if it does not, and a copy of that creation state is kept elsewhere, removing it costs nothing. The deeper point is that a create-and-never-overwrite rule protects work only when the creation happens at the END of the work rather than at the start of it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
