<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-03
repo: Kogaki
grain: lesson

## Trigger — what happened

Across three sittings, review findings routed to a shared observation store were refused with 'no store declared', and each sitting reported the missing declaration as an owner action. On the fourth, the store itself was inspected: it exists, holds 232 records, and two more had been added that same day by other sittings. Writers reach it by its conventional path; the reader that routes findings into it requires a declaration key that was never set. A sibling repository sets the same key. The file holding it is excluded from version control, so setting it would fix one working copy and no clone.

## The learning

Existence and reachability are separate facts about a shared store, and a tool that reports on reachability will say the store is absent in exactly the words people read as 'it does not exist'. That reading is what makes the gap survive: each report looks like a small configuration task rather than evidence that contributions are being dropped, and nobody opens the store to check, because the tool just said there was nothing there. Writers who use a conventional path never notice, since their appends succeed. Look at the artifact before believing a report about it, and prefer a reader that finds a store the way writers reach it, or one that distinguishes 'declared and empty' from 'not declared' from 'present but unclaimed'. The second half is the durability of the fix: check whether the file carrying the declaration is under version control before calling the problem solved, or the same gap returns on the next machine looking like a new one.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
