<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run on kogaki#888 found the issue fully discharged in substance — all five children and the sixth finding's carrier closed — while every machine reader reported it as an ordinary unclassified open issue, so no cleanup bucket could ever propose its close.

## The learning

An issue body can state a fact about itself that reads perfectly to a person and is unreadable to the system. #888's body carries the line 'tracking: this issue licenses nothing; it carries provenance and children only' plus a children list, and a human reading it knows exactly what the issue is. But the readers that ACT on that fact key on a different carrier entirely: an anchored stamp comment written by the typed act. With the prose present and the stamp absent, the status read answers 'not a declared tracking issue', the cleanup pass that proposes closing a discharged carrier never selects it, and the issue falls into the generic 'carries no classification' report-only pile alongside twenty-eight others — where its actual state, done and closeable, is indistinguishable from the rest. The failure is silent in both directions: nothing errors, and the body looks correctly filled in. Write the fact where the thing that acts on it looks, and treat a hand-written field that duplicates a typed act's output as a decoration, not a declaration.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
