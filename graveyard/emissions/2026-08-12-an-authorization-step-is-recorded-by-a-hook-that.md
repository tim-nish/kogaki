<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-12
repo: Kogaki
grain: lesson

## Trigger — what happened

An authorization step is recorded by a hook that watches a particular question-asking tool call. Two authorizations were needed, so both were put as two questions in one call, each individually in the exact shape the hook requires. Neither was recorded, and both actions that depended on them were refused. Re-asking one of them as its own single-question call was recorded immediately.

## The learning

A side-effect attached to a tool call may fire once per CALL rather than once per ITEM the call carries, and batching is the natural thing to try when several are pending. The failure is quiet in the worst way: each item was individually well-formed, so there is nothing wrong to see, and the only symptom is downstream refusals that look like the authorization was declined rather than never written. Where an action's record is produced by something observing the call rather than by the call's own return value, send one item per call until you have evidence batching is carried, and read the batched failure as unrecorded rather than as denied.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
