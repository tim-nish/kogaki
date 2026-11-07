<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

A tool's documentation stated that an umbrella record with all its sub-items complete may be closed, and said so in the form of an explicit carve-out: the rule that normally blocks such a record from being cited is bypassed here deliberately, otherwise the record would be uncloseable. A real run reached exactly that state — every sub-item complete, a sibling command reporting the record eligible to close — and the close was refused. The bypass was real and correctly implemented; it lifted the rule the documentation named. The guard that actually fired was a different one, testing for a field the record is defined by not having, because the act that creates this kind of record is reached instead of the act that sets that field. The two commands disagreed while reading the same data in the same minute, and the refusal's suggested remedy would have converted the record into the very thing its type exists to prevent.

## The learning

When a contract promises that some state will be admitted, it names the obstacle its author had in mind, and the promise binds only that obstacle. Any other precondition on the same path is untouched — and the one most likely to fire is the one nobody thought of as an obstacle, because it tests for something the author assumed present.

The tell is a carve-out written as a negative: this rule is lifted here, otherwise X would be impossible. That sentence proves someone reasoned about reachability, which is exactly why it is trusted afterwards and rarely re-tested. But a carve-out lifts one condition; reachability is a property of the whole conjunction. Lifting one term of an AND does not make the AND true, and the sentence reads as though it does.

What makes the class expensive rather than merely annoying is that the promise suppresses the check. A reader who meets the refusal has the documentation telling them this cannot happen, so the natural first hypothesis is that they are in some other state, and the investigation goes to their data rather than to the guard. Meanwhile the two commands disagreeing is the cheapest possible signal and is available immediately: one says eligible, the other says no. Where two paths read the same record and answer differently, the disagreement localises the defect precisely, and it is worth reaching for before any hypothesis about the data.

Two things follow. A carve-out clause owes a test that walks the whole path it claims is now reachable — not a test that the named rule was lifted, which is what a unit test of the bypass would assert, and which passes here. And where a type is defined by the absence of a field, every precondition that tests for that field's presence is a candidate refusal for that type; enumerating them at the moment the type is introduced is cheap, because the author is holding both the type and its exclusions in mind exactly then and never again.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
