<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-10
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1326 changed the Packet's waypoints block from a dash list to a numbered list; the review stage reads that same block back with a dash-only list reader, so the change would have left Reverse Outlining comparing against an empty declared side, and the review question that judged the block lived in a second file outside the planned footprint.

## The learning

When a change alters how a generated block is laid out or worded, find every reader of that block before planning the footprint, not only its writer. Here the writer (draft.mjs) and the reader (review-draft.mjs plus the review-items question) sat in different stages, and only a search for the block's heading surfaced the second file. Planning from the writer alone forced an Issue-body amendment and re-admission mid-pass.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
