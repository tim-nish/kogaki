<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1068: the SubGroup rules for Terrain's subdivision judgment were enforced only in the two rendering states. The judgment state that holds the bounded re-ask loop checked the envelope of the record and nothing inside it. A live run made eleven judge calls, every one of them accepted, and then failed at the rendering state on rules the judge had never been shown a refusal for. Nine of the eleven groups broke one.

## The learning

Where a system asks something to produce a record, checks it, and re-asks on a failure, the checking has to happen at the point that can re-ask. A rule enforced only further downstream is still enforced, and the enforcement is worth nothing: by the time it fires the budget for asking again is gone, and the failure lands on whoever is left holding the run rather than on the party that could have fixed it. The check itself need not move — the same check can be called from both places, so the downstream one keeps working and simply stops being the first to fire. Two things travel with this. A limit the producer is never told is a limit the producer breaks: the same run broke a size cap in four of eleven answers, and nothing in the request named the cap. And a test suite whose fixtures are all smaller than the limit cannot catch any of it — every case here used groups of two against a cap of five, so the rule was unreachable by construction and the suite stayed green through every live failure.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
