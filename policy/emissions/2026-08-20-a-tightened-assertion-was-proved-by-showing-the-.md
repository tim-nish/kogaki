<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-20
repo: Kogaki
grain: lesson

## Trigger — what happened

A tightened assertion was proved by showing the old form was wrong — a hyphenated input that the previous predicate rejected and the new one accepts. The record carried that, and carried no run of the original defect against the new predicate.

## The learning

Loosening a check needs evidence in both directions, and only one of them is instinctive. Showing that the old form failed on good input proves the old form was wrong; it says nothing about whether the new form still catches what the check exists to catch. Those are different claims and a passing suite shows neither, because the defect is not in the suite. So when a predicate is weakened for any reason — a false positive, an edge case, a fixture that grew a hyphen — re-run the original defect against the weakened form and record that you did. Otherwise the fix reads as verified while only half of it was tested, and the half nobody checked is the half that mattered.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
