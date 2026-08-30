<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-30
repo: Kogaki
grain: lesson

## Trigger — what happened

Re-cutting an append-only 6,200-line contract to current-only. The instruction was a purity test — no version ledgers, no superseded text, no defect specimens. Four sections were records in form and live state in function: open questions, parked decisions with their triggers, declared divergences with their falsifiers. A purity test cannot tell them apart, and applied alone it deletes all four.

## The learning

A rule about what must NOT remain is one-sided, and the cheapest way to satisfy it is to remove more than it asked for. That is well known for code extractions. It is sharper for a document, because a document's live state often wears the costume of history: an open question looks like a note about a question, a parked decision looks like a record of a decision, a declared divergence looks like an account of how two things came to differ. Each is written in the past tense about a thing that has not finished happening.

So the completeness criterion has to be stated in the same act as the purity one, and stated as something checkable rather than as an intention. Prose cannot check prose. What can be checked is the set of things the contract binds by name — the tokens, the constants, the file paths, the refusal codes, the rule identifiers, the section numbers other documents cite. Extract that set from the old text and from the new, and the difference is a list to triage rather than a feeling about whether anything was lost. Most of the difference will be drifting pointers and superseded names that should go; a small remainder will be live identifiers, and those are the ones a purity test was about to delete silently.

The residue matters too. After the cut, the surviving prose still refers to keys and sections that may no longer exist, so the same check runs the other way: every name the document mentions must still resolve in the carrier it points at. A re-cut that passes both directions has an argument for its completeness; one that passes neither has only the author's confidence, which is exactly what the one-sided criterion rewards.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
