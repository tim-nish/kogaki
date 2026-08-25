<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-21
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#600 (story 1.85) changed a check's self-test cases exactly as licensed, and the repository's registry-conformance member then failed: the check registry pins each member's efficacy to a named self-test case, and that registry file was not on the issue's enumerated licensed artifact surface. The stage stopped on the out-of-surface edit as its contract requires.

## The learning

When permission to edit is granted as an enumerated list of files, the enumeration must be closed over coupling: any file that names, pins, or verifies the content of a listed file will need to change whenever the listed file changes in the way the licence intends. A registry row that cites a test case by name is coupled to the test file; licensing the test file alone makes the licensed change impossible to land without either an unlicensed edit or a stop. The fix belongs at enumeration time - when listing an artifact, ask what other files assert things about its contents and list those too.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
