<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

On /ship-cycle 1350 --session the worker's cell had failed because an existing check file quoted a removed rule and sat outside the plan's file list. Naming that check on the cell through the plan amendment was refused as added work, even though the amendment contract exempts an existing check under the declared check root.

## The learning

The exemption recognises a check by its file name, and it knows only the test-dot-and-test-dash spellings; a repository whose checks are named check-something sees none of its checks recognised, so every one of them counts as added work at an amendment. A consumer that names its checks differently from the toolkit needs the recognition to read the declared check root's own naming, or it needs the body-edit and re-admit route each time. A rule that keys an exemption on a spelling the consumer does not use is an exemption the consumer never gets.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
