<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

A file was moved and its acceptance criterion was a plain text search for the old path returning nothing. Thirteen references were found and rewritten that way, and the search then came back clean. The test suite still failed twice. One failure was a checker whose list of directories to scan named the removed directory, and whose own guard refuses a listed directory that matches no file. The other was a matching rule that held the same path as a pattern with escape characters inside it, so the path appeared in the file as gates\/registry\.json and the plain search for gates/registry.json could not match it. Both were live: one silently scanned nothing, and the other tested for a path that no longer existed.

## The learning

A search for a literal string is the obvious way to check that a rename is complete, and it is blind to the two places the old name most often survives. It cannot see the name written as a pattern, because escaping changes the characters while leaving the meaning; and it cannot see the name written as a directory in a list of places to look, because that is one segment rather than the whole path. Both survivors are worse than an ordinary missed reference: a stale pattern quietly stops matching anything, and a stale directory in a scan list quietly scans nothing, so each reports success by producing no output at all. What actually caught them here was the test suite, and specifically one check that had been built to refuse a scan root matching no file - a guard whose entire purpose is that an empty scan and a clean scan are indistinguishable from the outside. Two things follow. Trust the suite over the search when they disagree, because the search's silence is evidence of nothing. And when a criterion is a search, state which population it covers - live pointers, say - rather than only what it must return, because a bare predicate over an unnamed population reads as objective while being satisfiable by looking in the wrong place.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
