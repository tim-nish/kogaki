<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-01
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-02 /ship-cycle 1241 could not admit kogaki#1241: the plan cell named checks/check-brief-reader-path-job.sh and the src files it checks, and admission refused that no registered check covers them. The refusal was added to claude-toolkit on 2026-10-01 (8d3e041). kogaki's registry writes each check's file relative to the checks folder (check-brief-reader-path-job.sh), while claude-toolkit and product-lab write it from the repository root (tools/tests/..., tests/...), and the new check compares the plan's root-relative paths against the registry value as written.

## The learning

When a tool starts matching one repository's paths against another file's paths, the first thing to check is whether both sides measure from the same place. Here they did not, so the match can never succeed in kogaki and every Issue that routes to implementation is refused at admission, with a message that tells the author to add a check that already exists. The fix belongs in one place, either the engine reading the registry's file values relative to the declared check folder or kogaki's registry writing root-relative values, and not in a per-Issue workaround such as listing a fake bare file name in the plan.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
