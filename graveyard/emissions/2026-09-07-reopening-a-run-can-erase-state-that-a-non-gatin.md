<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

A /draft run was resumed on a Brief whose five Steps were all already realized in an earlier sitting. Opening the run rewrote the run record, which dropped the per-Step Packet references the earlier sitting had stored, while the recorded prose survived. The assembly step then wrote the article anyway, printing one line per Step saying the Packet record was unreadable and that the trace never gates the write it traces. The article was complete and its trace named no Packets, so the review step that reads a draft through its Packets had nothing to read.

## The learning

Re-opening a run can destroy the very record that a later, non-gating step reports on. The opening act rebuilds run state from the plan, and anything the earlier sitting added to that state is gone; because the affected field is one the writer deliberately does not gate on, the output is produced in full and the loss appears only as advisory lines above a success message. A degraded artifact and a whole one are indistinguishable at the point of use. The repair is to re-run the per-Step render and re-record each already-written Step from its own stored prose, which restores the references without touching a word of the article. What makes this class recognisable is the pairing: a step that rebuilds state from scratch, and a downstream step that treats the missing state as a warning rather than a refusal.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
