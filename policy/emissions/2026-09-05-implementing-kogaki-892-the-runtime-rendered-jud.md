<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

Implementing kogaki#892: the runtime rendered 'judged by <model>/<effort>' on the strength of a record's own "judged": true flag and a judge pin the composer typed, and the repair had to decide what the honest replacement was when the tool invokes no judge at all.

## The learning

When a system renders a fact it never observed, the fix is to name the provenance rather than to acquire a better-looking source. The tempting repair here was to read back a judgment record the same session had written — a new file, a new field, and a reader for it — which would have satisfied every acceptance line while reproducing the defect underneath, because a record composed by the party whose claim is in question is that claim again in a different costume. What the layer could honestly say was smaller and true: it read a file, and it took that file's hash itself. So the rendering names two things separately — what was declared, and what was observed — and states plainly that the second does not establish the first. The second half is what keeps this from being a downgrade: the observed form is kept, composable and covered by a test, even though nothing produces it today, because a surface with only one possible provenance is indistinguishable from a surface that never asked.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
