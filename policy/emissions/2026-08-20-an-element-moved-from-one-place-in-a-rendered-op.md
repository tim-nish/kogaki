<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

An element moved from one place in a rendered option to another. The move deleted a property that had been holding for free: the old site's fixed prefix made every option label non-blank and distinguishable, whatever the variable text did. Two guards were then expected to carry that property, and a repair normalised one of them and not the other.

## The learning

When you delete boilerplate, check what the boilerplate was quietly guaranteeing. A fixed prefix in front of variable text is not only noise — it makes the whole string non-empty, gives it a stable distinguishing token, and bounds how similar two of them can look. Remove it and those guarantees fall onto whatever validates the variable part, which was written when it was not load-bearing and is usually weaker: an emptiness test that does not trim, a uniqueness key that does not normalise. The repair is not one guard but the set of them, folded the same way, because fixing the one that was pointed out leaves the same defect one field over.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
