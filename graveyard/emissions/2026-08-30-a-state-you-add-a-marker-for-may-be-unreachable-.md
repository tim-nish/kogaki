<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-30
repo: Kogaki
grain: lesson

## Trigger — what happened

A ruling asked for a fourth state to be distinguished: where a served seam is unreachable, rows were rendering a marker that asserts a read which never happened. The marker and its branch were built and unit-asserted. Driving it end to end found that the state cannot arise on the production path at all — an earlier read on the same path is non-soft, so it fails first and the run exits before the branch is reached.

## The learning

Adding a distinct marker for a state is two claims, not one: that the state is different from its neighbours, and that the state occurs. The first is settled by reading the code. The second is only settled by trying to produce it, and a design discussion will usually reach the first and stop, because the second looks like a formality once the distinction is agreed.

The failure has a particular shape worth recognising. A path makes several calls to the same dependency, some tolerant of failure and some not. The tolerant call has the interesting behaviour — it degrades, it marks, it discloses. The intolerant one runs earlier and simply stops. So every scenario the tolerant call was written for is unreachable in exactly the circumstances that would trigger it, and nothing says so, because each call is individually correct and the ordering is incidental rather than designed.

What to do about it is not to delete the work. A branch that is right and currently unreachable is worth keeping when it costs nothing and becomes live under a change someone will plausibly make — here, the earlier call becoming tolerant too. What is owed is the statement: say at the site that the state cannot arise from this caller, say why, and name the condition that would make it arise. The alternative is a marker whose presence implies a capability the system does not have, which is the same silence the marker was added to remove, moved one level out.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
