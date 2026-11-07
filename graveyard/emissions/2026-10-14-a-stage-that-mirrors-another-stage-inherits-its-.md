<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-14
repo: Kogaki
grain: lesson

## Trigger — what happened

On 2026-10-14 the Proof Sheet run stopped at its first card: a paragraph Move read off an Extraction carried no technique and no breaks, and the shared Move reader refused a record missing a mapped field. Tracing it back, the paragraph ingest path copied three sections of the Extraction and skipped the two that define those fields, and the new ParagraphPlan stage, written as the paragraph-level twin of Leg Waypoint generation, read only segments and judged only before and after, dropping the order criterion and the breaks criterion the Leg judge applies. Neither omission was an owner decision: both were written in Issue Design sections and copied into the spec and the workflow rows. The owner found that the two options offered to work around the refusal both bypassed the adapter, and ruled that paragraph Moves use the same schema as Leg Moves and that the lower stage follows the upper stage's generation and validation conditions.

## The learning

When a new stage is built as the lower-level twin of an existing one, copy its input list and its judge criteria explicitly and name each one you drop with the reason, in the owner's decision list rather than in a design paragraph. A derivation that reads a record off a written source copies every field the schema fixes, from the section that defines it; a field left out because the fixing decision did not mention it is a defect in the derivation, not a reason to relax the reader. When a shared reader refuses a record, fix the writer that produced the record, not the reader's rule and not a local copy of the declaration, or the same refusal returns in production.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
