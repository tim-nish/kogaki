<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-23
repo: Kogaki
grain: lesson

## Trigger — what happened

A boundary rule untracked private tooling from a repository, correctly against its own stated form — 'everything tracked must be in the allowlist'. One of the untracked paths was the skill a reviewer session is spawned to run, and reviewers spawn into a fresh worktree, which carries tracked files only. Every review round afterwards died in 141ms having already consumed its single-use owner permission.

## The learning

A subset rule over what a repository CARRIES cannot see a path that some spawned environment REQUIRES, because the two quantify over different sets: the rule ranges over what is present and asks whether it is permitted, while the failure ranges over what is needed and asks whether it is present. Both directions read as 'the tracked set is correct', which is why the untracking passed review and the check stayed green. The tell is a capability that works when run by hand and fails only where it is spawned — the operator's own disk carries the untracked half, so the surface most likely to be tested is the one place the defect cannot appear. Two consequences worth acting on: when a rule changes what a repository carries, enumerate the environments built FROM the repository rather than the paths in it; and where a spawn consumes a single-use permission, make reaching its entry point a precondition of consuming it, because a permission spent before the work starts is indistinguishable at the point of failure from work that was permitted and found nothing.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
