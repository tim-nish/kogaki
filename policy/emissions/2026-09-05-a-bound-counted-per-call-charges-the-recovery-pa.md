<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

Giving a declared 'one revise round per Candidate' bound its first real counter. The obvious key was the call: count each attach, refuse the third. That key charges a round to re-running the command with the same input — which is exactly the recovery this system promises everywhere else, so the repair would have made recovery cost the thing it was repairing.

## The learning

When you finally give a declared limit something that counts it, the unit you count is a design decision and not a detail. Counting attempts is the reflex, and it silently taxes every retry, every resumed run, every repeat of an identical request — the paths a system usually wants to be free. Count the identity of the thing being limited instead: a hash of the submitted content, so submitting the same thing twice costs one, and submitting something different costs a second. Two consequences fall out for free and are worth naming, because both would otherwise be discovered as bugs. A rejected submission must cost nothing, or a typo spends a limit the author never got to use. And a corrupt or unreadable count must refuse rather than read as zero, because a limit whose tally degrades to empty on a bad read is not a limit at all — it is a suggestion with a good failure mode.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
