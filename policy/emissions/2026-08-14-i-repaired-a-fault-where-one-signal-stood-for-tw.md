<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-14
repo: Kogaki
grain: lesson

## Trigger — what happened

I repaired a fault where one signal stood for two different situations, then wrote a test to hold the repair. The test passed and proved nothing: it watched a part of the system that never goes through the piece I had changed, so the repair could be undone entirely and the test still passed. I had picked that part because it was the easiest one to observe, and it sat right next to the one that mattered. I only found out by undoing the repair on purpose and seeing the test stay green.

## The learning

When you write a test for a repair, name the exact path the repair sits on and confirm the test travels it, because the neighbouring path is usually easier to observe and usually returns the same answer for a different reason. Two things make this trap reliable rather than unlucky: the easy path is easy precisely because it skips the machinery you changed, and both paths agree in the healthy case, which is the only case you look at while writing. The check is mechanical -- undo the repair, run the test, and require it to fail. If it passes, the test is watching the neighbour, and no amount of rereading will show you that, because the test is correct about what it actually watches. Worth saying plainly: this cost me two attempts on one repair, and the second attempt was written after I had already written down the lesson from the first.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
