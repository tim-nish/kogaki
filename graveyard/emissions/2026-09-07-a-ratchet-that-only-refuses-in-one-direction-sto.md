<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A check declared a floor of 83 against a pass reporting 96. The assertion was 'count < floor', which is green for every count above the floor, so a 13-case gap was undetectable — any case inside it could have been deleted and the check would still have passed. A census across all eight checks carrying such a floor found six sitting exactly at their declared number and two drifted, and nothing in the suite could tell those two states apart.

## The learning

A guard written as a one-sided comparison is a guard that decays silently, because the side it does not check is exactly where the drift accumulates and no reader can distinguish 'nobody has broken this' from 'this stopped watching'. The usual repair offers a false pair: advance the declared number automatically, which makes it a number nobody ratified, or report the divergence, which is a line nothing refuses against. Both accept that the declaration and the measurement may disagree. The third option is to make the comparison an equality and let the refusal name the exact edit that discharges it — the declaration is then forced to move in the same act as the thing it describes, stays human-authored, and the friction objection that motivated the one-sided form in the first place is answered at the friction rather than dismissed. The general shape: when a declared bound and a measured quantity may drift apart, gate both directions and put the remedy in the refusal text; a bound that only ever refuses one way is not a ratchet but a floor nobody is standing on.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
