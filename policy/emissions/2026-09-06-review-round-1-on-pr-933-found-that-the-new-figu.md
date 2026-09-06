<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

Review round 1 on PR #933 found that the new figure clause renders Step ids into the Candidate option label, where a pre-existing tripwire that refuses snake_case tokens then collapses the entire selection gate. Every check was green because every fixture used ids like s1 and f1.

## The learning

When a value gains its first rendering path, it meets every guard that stands on that surface, and those guards were written without it in mind. The Step id had lived entirely inside the record — nothing displayed it — so nothing had ever tested it against the gate's rule that snake_case is internal vocabulary a reader must not see. Adding one clause to a label silently enrolled a whole namespace in a constraint nobody had told its authors about, and the namespace has no declared shape, so the house style next door (a library that is entirely snake_case) is exactly what trips it. The checks could not catch it because the fixtures were written by the same hand as the feature, and that hand picked short ids. The general shape: the question to ask when a field starts being displayed is not whether the rendering is correct, but which existing rules about the display surface the field has now become subject to — and whether anything constrains the field to satisfy them. A green suite over hand-chosen fixtures is evidence about the fixtures.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
