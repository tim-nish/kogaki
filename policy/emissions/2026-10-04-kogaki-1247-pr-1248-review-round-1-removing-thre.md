<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-04
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki #1247 / PR #1248 review round 1: removing three Packet blocks on the stated ground that the review reads them from the Brief broke /review-draft, whose items still read those blocks from the Packet

## The learning

Before removing a field from a generated input, check every reader of that input, not only the writer it was built for. Here the issue said the review reads the reader states from the Brief, but an earlier ruling forbids the review from reading the Brief at all, so three review items still read those blocks from the Packet and would have failed on every run. The suite stayed green because the review's own test Packet was written by hand in the old shape. The owner retired the three review items rather than restoring the blocks. Test fixtures for a reader should render their input through the real template, so a removed block shows up as a failure.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
