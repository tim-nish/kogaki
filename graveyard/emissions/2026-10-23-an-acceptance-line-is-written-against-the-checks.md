<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-23
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1528's Acceptance asked for src/leg-schema.json entries 'naming §5.2' and for checks/check-spec-structure.sh to pass. The tree's section-number check refuses a section sign followed by a digit anywhere under src/, and no check-spec-structure.sh exists. The pass built both by substitution — a pointer by the section's name, and the full suite — and disclosed each in the pull request.

## The learning

When an Issue's Acceptance names a check, or a way of writing a reference, check the tree before filing: the check must exist, and the form must be one the tree's own checks allow. A src/ file points at a spec section by its name, never its number. An Acceptance line that cannot be met as written forces the implementing pass to substitute and explain, and the reviewer then has to judge the substitute instead of the line.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
