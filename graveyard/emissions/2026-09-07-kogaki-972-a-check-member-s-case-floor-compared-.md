<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#972: a check member's case_floor compared a hand-maintained constant (28) against a registry floor (28); replacing the constant with a count the pass produces revealed 35 cases actually running, so seven had existed uncounted and a deletion inside that gap moved neither number

## The learning

A ratchet built from two declarations does not measure the thing it names, and its failure is silent in BOTH directions at once: with nothing counting the population, the gap between the declared number and the real one is unbounded and invisible, so the ratchet protects only the cases the declaration happens to reach and every one beyond it can be deleted for free. Making the left-hand side a measurement is the repair, and the accumulated gap then surfaces as one large jump that reads like growth unless the record says otherwise -- the raise must be written as a re-baseline, naming that the new cases already existed, or a later reader concludes the population grew when it was only finally counted. Two further properties travel with such a repair: the registration ids must be unique where the population's own labels are reused, or two members collapse into one count and rebuild the blindness inside the fix; and the instrument closes the DELETION direction only, since a member added with no registration is still invisible -- a limit worth disclosing beside the count rather than left for the next audit to rediscover.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
