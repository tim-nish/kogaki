<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-01
repo: Kogaki
grain: lesson

## Trigger — what happened

/brief run brief-2026-10-01T05-48-41-711Z (thesis check-only-good-what-given): the reader-path job ended state=done with all three units done, but candidate C's legs leg3 and leg5 carried no rationale. compose_path refused the whole set on candidate C, the run record was left awaiting nothing, and a second job await reproduced the identical refusal. The extend answer was recorded as extended for unit(s) [] because the units finished before the extend was read.

## The learning

When several candidates are made in parallel and one of them comes back malformed, the step that gathers them refuses all of them, including the ones that are well-formed. The re-run offer only appears when the job itself reports a refusal; here the job reported done and the refusal came afterwards, at assembly. So the owner is never asked anything, retrying gives the same answer every time, and the run stops with two usable candidates on disk and no way forward. The shape check needs to happen per candidate, at the point where a re-run can still be offered, or assembly needs to be able to continue with the candidates that are valid.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
