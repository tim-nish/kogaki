<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1233 was invoked on a pull request, not an issue. The PR merged and its issue #1230 was closed, but record-pass on #1233 refused with 'issue MERGED; pull requests closing it: none', and the entry binding refused recording on #1230, so no close screen could be rendered. Separately, the PR body's bare 'Closes #1230' never formed a closing link: closingIssuesReferences stayed empty before and after the merge and after a re-save of the body.

## The learning

The run's entry must be an issue. A pull request number passes preflight's --entry binding and then leaves the run no way to record its outcome, so the number should be translated to the issue it closes before preflight. And a bare closing keyword in the body is not proof that GitHub linked the PR: read closingIssuesReferences before merging, because once merged the link cannot be added and the issue must be closed by hand through approve-close --close.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
