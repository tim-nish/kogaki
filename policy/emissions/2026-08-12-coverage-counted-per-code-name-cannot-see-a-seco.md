<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A mutation audit of three checks found twelve unexercised branches behind PASS lines that read 20/20 and 9/9 violation codes exercised. Each check closes with a completeness test of the shape CODES - covered, which binds the code's NAME. Nine of the twelve were second and third producers of a code some other case already covered, so the completeness test reported them as covered. Three more were separate producers of a typed absence — a read that timed out, a read that never started, an unreadable document — where exactly one of the three ways to reach the type had a case, and the promise the checks exist to make is that such a state is never rendered as an ordinary absence.

## The learning

A completeness test that subtracts covered names from declared names measures naming, not coverage. It is honest about what it says and misread as saying more: 20 of 20 codes were genuinely exercised, and the branches behind them were not, because a code is a label many distinct places can emit. The unit that makes a coverage number mean what readers take it to mean is the place that produces the value, not the value produced. Where one name has several producers — a required-field loop that runs on every row and a second that runs only on rows of one kind, or three separate ways to conclude that a read did not complete — the first producer to get a fixture retires the name and hides the rest. Two further notes from the same audit. Mutating an assertion is not mutating a behaviour: removing a detector cannot fail its own suite, so every such mutant survives by construction and reads as a finding when it is an artifact of the operator. And a survival whose absence the artifact itself declares, with a reason, is not a finding — the difference between an unexercised branch and a branch documented as unreachable is the declaration, and an audit that does not honour it inflates its own count.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
