<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-13
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1329 was refused at admission three times (2026-10-11, 10-12, 10-13) with the same disposition, because its Acceptance section read 'Written at admission' and its two body lines 'Blocked by #1348' and 'Blocked by #1349' had no native blocked-by relation behind them; each rerun of the cycle recorded a held pass and stopped at the same owner gate.

## The learning

An issue that says its own design will be written at admission is refused at admission every time until someone writes the design, and a body line naming a blocker is not a dependency until the relation exists on the tracker. The fix was to write the carriers out (what file, what tool, what check, what refusal) and to make the dependency native, after which the cycle redirects to the open predecessor instead of stopping at a gate that nobody can answer. Rerunning the cycle on an unchanged body only adds another identical refusal to the thread.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
