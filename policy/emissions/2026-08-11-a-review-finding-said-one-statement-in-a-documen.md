<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A review finding said one statement in a document was wrong. The fix corrected that statement and left two earlier ones, forty and a hundred and ten lines up, still asserting the opposite — one of them in the bullet list that tells the reader how to read everything after it. Both were text the same pull request had added days apart.

## The learning

Fixing a claim where the reviewer pointed leaves every other copy of that claim standing, and in a long document the copy that matters most is usually the earliest one, because it frames the read. A finding names one location; it is a sample, not the extent. So when a correction changes what a document asserts, search the document for the assertion rather than for the line number you were given — and start from the top, since a summary, an overview bullet, or a status header is where the stale version does the most work.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
