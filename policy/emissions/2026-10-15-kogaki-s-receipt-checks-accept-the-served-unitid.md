<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-15
repo: Kogaki
grain: lesson

## Trigger — what happened

A review round on kogaki PR #1389 checked a hand-composed consult receipt against this repository's own check registry

## The learning

Kogaki's receipt checks (consult-receipts and boundary-receipts) have accepted the hub's own UnitID-at-content-hash address as a pin since kogaki#1205, so a gloss_index receipt line with no repository-and-commit prefix is valid as served. Hand-joining the response's pin onto the UnitID is unnecessary; the older belief that the grammar rejects the served form was out of date, and it made a PR body state something false about the checker.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
