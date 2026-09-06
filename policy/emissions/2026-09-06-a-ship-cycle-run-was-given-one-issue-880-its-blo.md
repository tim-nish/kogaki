<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A ship-cycle run was given one issue (#880). Its blocked-by relation named exactly one open prerequisite (#879), and its body prose named a different one (a batch already closed). The prerequisite that actually mattered (#878, which owns the record #879 renders and edits the same emit path) appeared in NEITHER — it was found only by opening a sibling child's body and noticing that the artifact #879 reads is the artifact #878 writes. Two owner gates were spent widening the frontier, one per hop discovered.

## The learning

A work item's real prerequisites can be absent from both places a scheduler looks: the tracker's dependency relation and the item's own prose. Where several items are cut from one design, each is written as the thing it licenses rather than as the thing it needs, so the edge that matters — B reads the artifact A writes — is stated in neither item and is recoverable only by reading the siblings together. A scheduler reading the relation and a scheduler reading the prose both proceed, and both proceed in the wrong order; nothing reports the miss because a missing edge produces no event. So when a batch is cut from one design, the edge to record is the ARTIFACT each item reads and writes, not the sequence its author had in mind — an artifact-to-item join can be computed and checked, while an author's remembered ordering is carried by whoever happened to write it down.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
