<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-10
repo: Kogaki
grain: lesson

## Trigger — what happened

A live /terrain run rendered CoTagGroups with SubGroup ids (G1-3 among them), the owner entered G1-3 at the ID-selection gate, and the advance stopped instantly with nothing on the run record. The refusal — 'G1-3 resolves to no Group or SubGroup on this display' — was raised on the executor's stderr, which a PostToolUse hook discards, so the stop was silent.

## The learning

One display's ids were produced from one carrier and resolved from another. The state that RENDERS the SubGroup ids reads the judge's subdivision record off the run record, where the executor had just written it; the two states that RESOLVE an entered id read that same record from an --subdivisions argument instead, and a run driven entirely by hooks supplies no arguments at all. So every Group id resolved and every SubGroup id on the same screen did not — the display offered a choice the flow behind it could not accept. A reader looking for this cannot see it at either site: each half is internally consistent, and what is wrong is that they name different carriers for one fact. Where a value is written to a record by one state and read by a later one, the later state reads THAT record; an argument fallback beside it is a second carrier, and the run shape that supplies no arguments is exactly the one that will find it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
