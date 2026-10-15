<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1368: /paragraph-plan refused the first paragraph Move read off an Extraction, because the byte-copied moves/ROLES.json maps technique and breaks and the ingest writes neither for a paragraph Move

## The learning

When two features each look correct alone — one that writes a new, smaller kind of record, and one that reads records through a shared map saying which fields to expect — the first record of the new kind is refused by the reader. Every record already in the library had the extra fields, so nothing showed the gap until a real run fed the new kind through. Test a new record kind against the actual reader before writing a run plan that relies on it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
