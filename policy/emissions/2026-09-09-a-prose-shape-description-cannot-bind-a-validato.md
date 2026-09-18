<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-09
repo: Kogaki
grain: lesson

## Trigger — what happened

The Terrain live run on tag `agents` reached J1_claims, and the pinned judge's record was refused on all three attempts: it returned `composition_pin` as the pin string and `claims` as an array, where the validator requires the composition-input's pin OBJECT (it needs the `groups` map for the subset check) and a {group: claim} map. The judge prompt states the required shape only as one prose sentence from the workflow table's `input_shape` field.

## The learning

When a machine validator enforces an exact record shape, describing that shape in prose to the producer is not a specification -- it is a guess the producer has to make. The refusal text and the shape description are written by different hands and drift apart silently, and the failure surfaces only in a live run. Hand the producer the literal shape it must return -- a schema, or a filled example composed from the very input it is judging over -- rather than a sentence about it. A second cost rides along: a retry loop that re-sends identical bytes and never feeds the refusal back cannot repair a shape mistake, so the whole declared retry bound is spent reproducing one deterministic refusal.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
