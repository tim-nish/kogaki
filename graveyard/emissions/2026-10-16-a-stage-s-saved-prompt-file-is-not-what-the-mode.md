<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-16
repo: Kogaki
grain: lesson

## Trigger — what happened

Re-cutting the Leg Proof Sheet (kogaki#1401) so each prompt appears once, the Extractor's and the Brief composer's saved prompt.md files never matched the recorded calls: the recorder's stdin opens with a no-tools preamble the saved file lacks.

## The learning

When a page shows 'the prompt' for a model call, read it from the recorded call input, not from the prompt file the stage saved for itself. The two differ by whatever the command wrapper adds before the model sees it, so a page built from the saved file shows a prompt the model never read and cannot be matched against the call log.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
