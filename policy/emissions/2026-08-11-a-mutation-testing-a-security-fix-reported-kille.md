<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A mutation testing a security fix reported killed. It had died of a syntax error introduced by the shell escaping in the mutation script itself, not by any assertion. The fix it appeared to validate had no test at all. Found only by re-running one mutation and reading why it failed rather than that it failed.

## The learning

A mutation test has two ways to make the suite go red and only one of them is the result you want. If the mutation breaks the program, every check fails and the report looks identical to the check catching the defect — so a table of killed mutations is not evidence until each kill names the assertion that produced it. Read the failure text, not the exit code, and treat a stack trace or a syntax error as an INVALID mutation to be rewritten rather than a pass to be recorded. The danger is specific: an invalid mutation certifies exactly the untested code you reached for mutation testing to check.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
