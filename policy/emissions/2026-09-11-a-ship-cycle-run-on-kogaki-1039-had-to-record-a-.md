<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#1039 had to record a Blocker whose end is an issue in a DIFFERENT repository (claude-toolkit#1047). The tool's 'issue-open:<n>' condition resolves its operand against the run's own repo, where #1047 is a different, already-CLOSED issue — so recording the faithful-looking condition would have discharged the Blocker at the very next pass and sent a later run at work that still has no carrier.

## The learning

A condition that names a number but not a namespace is not a condition. Where a blocking fact lives outside the scope the re-evaluator resolves against, the honest-looking operand is the dangerous one: it reads, it parses, and it answers about the wrong thing. Check what scope the re-evaluation supplies before choosing the operand, and where no condition form can express the end, record the one that cannot falsely discharge and put the real end in the observation — a Blocker that never clears is re-read by a person, while one that clears wrongly is re-read by nobody.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
