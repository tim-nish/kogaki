<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-27
repo: Kogaki
grain: lesson

## Trigger — what happened

/ship-cycle 1205 on 2026-09-27: the worker was stopped verification-refused for running the very check it was editing, bash policy/kit/checks/check-consult-receipts.sh; the plan named that file, but the allow list derived from the plan grants a runner rule only to files under checks/ and tools/tests/, so a check living elsewhere in the repository earned none

## The learning

When permissions are derived from a plan's file list, the rule that decides which files may be executed must follow what the file is, not which directory it sits in. A directory-prefix test quietly excludes checks that live under a vendored or nested package, and the worker then cannot verify the one file it was asked to change.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
