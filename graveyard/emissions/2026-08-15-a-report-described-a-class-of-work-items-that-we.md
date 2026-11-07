<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A report described a class of work items that were invisible to the routine check meant to find them, and named the exact command to run as proof. Running that command today, the report itself did not appear in the results — it had been set aside pending something elsewhere, and items set aside are filtered out. So the one item that named the measurement was outside the set the measurement covers, for a reason unrelated to the defect it described.

## The learning

When a report names a command as the way to measure the problem it describes, run that command and look for the report itself in the output. It is often missing, and usually for a reason that has nothing to do with the defect — set aside, a different category, a label that excludes it — so the measurement quietly runs on a population that excludes its own best example. Two consequences: a count from that command understates the problem by at least one, and anyone re-checking later will conclude nothing is wrong because the item they were checking is not in scope. State plainly which items the named measurement cannot see, in the report, beside the command.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
