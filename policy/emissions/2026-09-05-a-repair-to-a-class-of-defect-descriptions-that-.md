<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A repair to a class of defect — descriptions that contradict what the code asserts — fixed the three surfaces a carried finding had enumerated. A review round then found a FOURTH surface of the same class inside the same string literal whose other two halves the repair had just rewritten.

## The learning

An enumeration of instances is not a definition of the class, and repairing from the enumeration leaves whatever nobody counted. This bites hardest when the missed instance is inside the very artifact being repaired, because attention is on the named lines rather than on the property. Before repairing a class from a list, derive the list once from the property — grep the claim's shape across the file, not the line numbers you were handed — and treat any list you were given as a starting sample. The tell that you are enumerating rather than defining is that the fix touches exactly as many places as the report named.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
