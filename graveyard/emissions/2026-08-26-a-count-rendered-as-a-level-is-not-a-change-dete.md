<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

specs/SPEC.md §3.1 makes a rendered count the WHOLE of its detection for one rule: nothing refuses a new bare pointer, the checker counts them and never fails on them, and the section states that the closed set 'is bounded only by the rule in this section and by the count rendered on every run — a number that goes UP if the rule is ignored, which is the whole of the detection', adding that 'both its drain and any reintroduction are visible at the next green line'. On 2026-08-26 a /ship-cycle sitting edited a spec-adjacent artifact and its first draft reintroduced two bare pointers, taking the count from 152 to 154. The check PASSED, printing 154 in a green line, exactly as designed. It was caught only because the session independently ran the checker on master, ran it again on the branch, and compared the two numbers by hand — an act nothing asked for and nothing records.

## The learning

A count printed as a LEVEL tells a reader the current value and nothing about the direction of travel. Detecting a regression from it requires a second number the artifact does not carry — the previous value — so the comparison happens only in a reader who already holds the baseline, and only if that reader thinks to look. Where the check also PASSES in the regressed state, nothing prompts the look at all: the green line reads as confirmation, and the rising number rides along inside it as decoration.

This is distinct from a check that is missing, and from a check that is wrong. This check is present, correct, and running on every commit; it computes exactly the quantity the rule is defined over. What it does not do is the one thing the prose claims for it — make a reintroduction VISIBLE. Visibility of a change is a property of a comparison, never of a measurement, and no amount of rendering the measurement supplies it.

The tell is a specific sentence shape, and it is worth learning to hear: a contract that says a number 'goes up if the rule is ignored, which is the whole of the detection'. That sentence is true about the number and false about the detection. It names a signal and stops one step short of naming the observer who converts the signal into an event — the same gap as an obligation with no carrier, arriving in numeric clothing.

The remedies are cheap and differ in what they cost. The producer can carry its own baseline and report the DELTA rather than the level, which converts the reader's memory into an artifact. Or the check can fail on an increase while still never failing on the level, which is a gate on the derivative and not on the value — and it preserves the reason the level itself was deliberately not gated, since here failing on the count would have forced the mechanical rewrite that launders stale pins. What does not work is asking readers to remember, which is what a level-only rendering asks by default.

Note the aggravating pattern: a level-only count is most trusted exactly where a gate was deliberately declined, because the declining argument tends to end 'and the count is what makes it visible' — so the count inherits a load it was never designed to carry, at the moment nobody is left checking.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
