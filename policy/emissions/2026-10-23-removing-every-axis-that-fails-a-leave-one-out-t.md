<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1533's bench of 2026-10-23 tested each of eight judge criteria by taking it out alone; two criteria whose defects were still caught without them, plus four others, were all removed in the same pass.

## The learning

Testing a criterion by taking it out alone tells you whether the others cover for it. It does not tell you which of the others do. When two criteria cover the same mistake, each looks unnecessary on its own, and removing both at once leaves that mistake uncaught. Remove one criterion at a time and test again after each removal, or check the removed criteria's example mistakes against the criteria that remain. Separately, a record you take as the 'correct' example has to pass under the new wording before it can serve as one: the run's own accepted record failed the narrowed join criterion in three of five tries.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
