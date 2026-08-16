<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-13
repo: Kogaki
grain: lesson

## Trigger — what happened

A read whose two signals bound proxies rather than the property was repaired to bind the property, and the repaired read was then run against the specimen the old read had missed. The count it returned was 11 where the old one returned 2 — high enough that an additional, noisier signal that had been proposed to compensate for the miss was no longer needed to fire.

## The learning

When a measurement misses a real case, the proposal that follows is usually a NEW signal, and the cheaper repair is usually the BINDING of an existing one. The two are hard to tell apart at proposal time because both would have caught the specimen. Separate them by asking whether the existing signal was measuring the property or a proxy for it: if it was measuring a proxy, the miss is evidence about the binding and not about the threshold, and adding a signal to compensate buys the catch at the cost of every false positive the new signal carries forever. Repair the binding first, re-run against the specimen, and let the added signal be re-proposed only if the repaired one still misses — which converts the case for it from inference into evidence. Recorded because the declined proposal here was reasonable on its face: it did fire on the specimen, and its author could not have known that fixing something else would make it redundant.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
