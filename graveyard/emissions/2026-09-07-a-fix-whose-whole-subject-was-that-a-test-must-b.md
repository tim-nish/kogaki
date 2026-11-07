<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A fix whose whole subject was that a test must bind the DECISION rather than a proxy conjunct shipped with one of that decision's three conjuncts still unbound: the case injected a stub comparator that returned the same answer no matter what, so deleting the conjunct left the pass green.

## The learning

Injecting a stub for a dependency binds that dependency's PRESENCE in the code path, never the behaviour it stands for — and a stub that returns one constant does not even bind the presence, because every branch downstream of it decides the same way whether the call is there or not. A case that injects a collaborator owes at least two values of it, chosen so the assertions flip; with one value the injection point is indistinguishable from a deleted line. The failure is silent and self-congratulating: the case's own comment asserted it reached the whole decision, which is the more durable half of the defect, since the next reader trusts the comment rather than re-running the mutation. Mutation testing catches it only if the enumeration covers the injected seam — three mutations over the other conjuncts all passed, so the tally read complete while the fourth was never tried.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
