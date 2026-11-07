<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-06
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1257 --session was refused at session-cell start on 2026-10-06, after the #1419 change that should allow a second pass once an input moves, even though the Issue body had been amended and re-admitted since the only earlier pass.

## The learning

A rule that compares against a recorded baseline must decide what an old record with no baseline means. If it treats 'no baseline' as 'unchanged', every record written before the field existed stays locked forever, because no later change can ever be seen as a change. The refusal then made it worse: it printed today's values under the word 'unchanged', so it looked like an honest comparison when nothing had been compared. Either take the baseline from another record that already holds it, or say plainly that no baseline was recorded.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
