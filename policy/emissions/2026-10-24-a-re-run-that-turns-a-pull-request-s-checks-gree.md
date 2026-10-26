<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-24
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-24, PR #1561 had auto-merge armed while CI failed once on an unrelated race in check-brief-job-resume (two concurrent job await calls both reached the resume). Re-running the failed job turned every check green and the pull request read CLEAN, but it stayed open with auto-merge still armed until a plain merge was run.

## The learning

When a check fails and is then re-run to green, an armed auto-merge may not fire, so the pull request sits clean and open with nothing moving it. After a re-run succeeds, read the pull request's state, and if it is clean and still open, merge it directly rather than waiting.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
