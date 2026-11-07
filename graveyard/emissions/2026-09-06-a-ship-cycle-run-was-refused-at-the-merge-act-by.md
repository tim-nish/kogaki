<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-06
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run was refused at the merge act by the session context bound (208,093 against a 200,000 default). The closing emitter offers a named exit for exactly that cause, "context-bound", but binds it to one step: it refused the close with "the defined exit context-bound is exit state held at step preflight; this close declares held at merge". The bound can only fire at preflight for a run that was already over it when it started; a run that starts under and grows past it always meets the bound later, at an act. So the one exit named for this cause is unreachable by the runs that actually hit it, and the close had to grade itself with a generic typed cause that names the refusing stage rather than the condition.

## The learning

When a named outcome is keyed to the place it was first observed rather than to the condition that produces it, the name stops fitting the cases that arrive later — and the failure is silent, because the caller still has a legal value to pass. Here the substitute cause is true (a stage did refuse) and less informative than the name that exists (the context bound did it), so the record loses the one fact a reader would act on, while every surface reports a well-formed close. The tell is a vocabulary entry whose definition contains a location: "held at preflight on fact 11" fixes both what happened and where, and only the first half is the outcome. Where a condition can be met at more than one point in a process, the outcome names the condition and the location is carried in a separate field, so that a new site of occurrence extends the record rather than falling out of it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
