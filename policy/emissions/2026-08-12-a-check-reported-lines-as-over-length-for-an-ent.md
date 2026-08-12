<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

A check reported lines as over-length for an entire session. It ran over  and never stripped the leading plus, so every line was measured one character too long and anything at exactly the limit was flagged. The error was found only when a hand-written wrapper and the check disagreed and the discrepancy was measured rather than explained away — the first hypothesis, multi-byte characters, was wrong.

## The learning

A checker that reads a transport format inherits that format's decorations, and diff output is the common case: the leading marker is so familiar it stops being visible, so every measurement of length, indentation or column position is off by one and every result still looks plausible. Off-by-one in a threshold check is quiet in a specific way — it only ever fires on the boundary, so it produces false positives at a low rate and never a false negative, which reads as a strict check rather than a broken one. Measure the check against a case whose answer you know exactly, at the boundary, before trusting it; and when a tool disagrees with your own reading, get the number instead of reaching for an explanation.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
