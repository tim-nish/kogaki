<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-08
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#976: the CI licence gate read only the pushed head, so an emission-only exemption written for a commit was applied to a whole push; a sitting that committed its work and then its emission got the code commit exempted by the emission above it, and no issue was required anywhere in the push

## The learning

An exemption argued for one element is unsound the moment it is evaluated against an event that aggregates several, and the mismatch is invisible while the aggregate usually has one element — the gate looks correct on every single-commit push and fails exactly on the shape the project's own duty produces. So when adding an arm to a predicate, check whether the unit the arm reasons about is the unit the event delivers, and where they differ, decide the aggregate's predicate explicitly: pooling the evidence across the event, or requiring each element to satisfy it. The second reading is stricter but disagrees with any sibling arm that already pools, and a gate whose two events answer differently about the same change is a second defect. The range being unreadable is not a rare corner to leave implicit — a branch's first push and every force push land there, so the fallback is stated and fail-closed or it is decided by whichever branch happens to run.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
