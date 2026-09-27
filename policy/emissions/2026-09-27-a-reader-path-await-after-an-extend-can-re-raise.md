<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-27
repo: Kogaki
grain: lesson

## Trigger — what happened

In a /brief run on 2026-09-27, compose_path hit its 300s checkpoint and the owner chose Extend. The next 'run --status --job await' returned at once with 'limit-reached' and a second gate that offered only Stop or free text. The owner chose Stop. Afterwards the job record read state 'done', with all three candidate units finished and their full output on disk.

## The learning

After an extension, the answer to the await is not evidence that the work failed. Read the job record's per-unit status before you put the stop-or-continue question to the owner again. Here the three reader paths had been composed, but the run was stopped over them. Because the run ended at a Stop, that finished work cannot be adopted, and the Brief's name is stranded behind the stopped run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
