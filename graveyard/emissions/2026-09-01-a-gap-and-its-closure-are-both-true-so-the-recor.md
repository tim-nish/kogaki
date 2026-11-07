<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-01
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#734: a closing comment recorded, in prose, that a machine grammar could not express the pointer the close needed — and named that as the defect. The upstream fix landed weeks later and made the pointer expressible. The tempting repair was to edit the original comment so it now reads correctly.

## The learning

When a record documents a limitation and the limitation is later removed, append the correction rather than editing the record. Two reasons, and the second is the one that gets forgotten: the original record is usually the EVIDENCE some other carrier was filed on — edit it and the issue that cites it now cites something that no longer says what it was filed about. And a reader who finds only the corrected version cannot tell a system that always worked from one that was repaired, which is exactly the history worth keeping in a system whose fixes are themselves the subject. Check the reader before assuming an edit is safe: if the consumer reads newest-first, appending is not merely honest, it is also what actually takes effect. Where the consumer reads oldest-first or reads only one designated record, an append alone silently changes nothing — then the correction goes in the designated place and quotes what it replaces.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
