<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

The #1395 worker changed the retry prompt in src/workflow/detached-job.mjs; its plan named only the Extractor and ParagraphPlan checks, and the registered suite refused the commit on check-brief-reader-path-job.sh.

## The learning

The retry prompt in the detached-job supervisor is shared by the Brief, ParagraphPlan and Extractor jobs, and the Brief job's check fixture recognizes a retry by reading the retry prompt's text. A plan that changes that prompt has to name the Brief job's check file among the files it edits, or the worker cannot update it and the suite stops the run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
