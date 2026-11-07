<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

A review found that a filename built from two variable fields was guarded on one of them. The guard was correct, tested, and carried a comment claiming it sat at the one place the write path and the read path diverge. There were two such places, and the second — a slug that empties on any title with no ASCII alphanumerics — is reached by ordinary Japanese titles in a repository whose sittings are conducted in Japanese.

## The learning

When a composed identifier is validated field by field, the validation is a list and the identifier is a product, so the list is complete only until someone adds a field. Assert the composed result against the pattern that will later read it, at the moment before it is written: one assertion covers every field including the ones added after you stop looking. The comment is part of the defect and not a separate matter — writing that a guard sits at the one place two paths diverge tells the next reader the divergence is closed, so a partial guard with a total-sounding comment is worse than a partial guard alone. And check the reaching input against who actually uses the system rather than against an adversary: the case that slipped through here needs no unusual input at all, only the language its operators write in.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
