<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-18
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#498 asked for the post-disposition lifecycle of an emissions directory in three parts: what an accepted candidate's file owes, what a declined one's owes, and whether the undispositioned backlog has a bound. Measured at the sitting: 125 files, zero ever dispositioned, because the gate that would dispose of them lives in another repository and the issue scoped that registration out. Two of the three questions had no instances and could not acquire any; the third held every file.

## The learning

A lifecycle question arrives shaped by the states someone imagines, and the honest first move is to count instances per state before answering any of them. Where the count is zero and the act that would produce instances is outside the asking repository, answering is designing against nothing — and it feels like thoroughness, because the asker enumerated the state and leaving it blank looks like an omission. Answer the arm that has instances, name the empty arms as a slot with the trigger that would fill them, and say in the artifact that they were named on a measured zero rather than on caution. The reader who later finds the slot then knows whether to fill it or to re-measure. The same count also tells you which arm you are even able to take: a lifecycle whose disposing act belongs to someone else leaves you the observation of the backlog and not its disposal.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
