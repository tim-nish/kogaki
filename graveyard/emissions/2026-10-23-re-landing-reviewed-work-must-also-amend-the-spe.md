<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

PR #1543 re-landed #1533's judge-axes work under #1542; round 1 found the governing spec still described the four-criteria judge the work retired, which the original PR's two rounds had not raised

## The learning

When work is carried to a new pull request to get a fresh review, the fresh review reads it whole and can find gaps the earlier rounds missed. A change that retires a design the spec ratified must add a Status note to every spec clause that states the old design, and the Issue's file list must name the spec before the edit, or the first round blocks on it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
