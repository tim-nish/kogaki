<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-07
repo: Kogaki
grain: lesson

## Trigger — what happened

Re-running /draft on the completed brief safety-check-refuses-last-moment. emit found no packet record for any of the five steps in run.json — the run.json predates packet recording — printed one warning per step, and then wrote the CanonicalDraft anyway, adding a new lines field to every trace entry. The artifact was rewritten while the provenance the trace claims to carry was unreadable.

## The learning

When a step's own guard reports a missing input instead of refusing on it, the step completes and the report is the only trace that anything was wrong. Here every one of the five packet records was missing and the draft was still written, so the emitted artifact carries a trace whose backing record the harness could not read. The warning names the reason it does not gate — the trace never gates the write it traces — which is a deliberate choice, not an oversight; the cost of that choice is that a run resumed under a newer harness than the one that recorded it produces an artifact indistinguishable from a fully-backed one. If the report is the only signal, it has to reach a reader who is looking; on a re-run of an already-finished piece of work, nobody is.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
