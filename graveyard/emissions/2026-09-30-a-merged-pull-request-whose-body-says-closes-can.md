<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-30
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-09-30 kogaki PR #1235 carried an unbackticked 'Closes #1231' line, was squash-merged, and GitHub linked no issue to it; re-saving the body after the merge did not link it either. PR #1234 and issue #1229 showed the same thing earlier that day.

## The learning

The closing keyword in a pull request body is not a guarantee the link exists. The run-record tool only counts a pass as completed when GitHub reports a merged pull request closing the issue, so when the link is missing the issue has to be closed by hand and the run cannot record its pass at all. Check the pull request's closing references right after opening it, while the problem is still cheap to repair, rather than after the merge.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
