<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-02
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#750 moved every lane's run intermediates into runs/<lane>/ and bounded them with a keep-last prune that runs as a lane's FIRST act. The registered member asserting the move mints real Briefs, so the production snapshot writer wrote real workspaces into the brief lane on every suite run — and nothing pruned them, because pruning happens at the lane entry point the check bypasses by passing an explicit run-state path. Left alone, the check that asserts the unbounded accumulation is over would have re-created it, one entry per suite run, forever.

## The learning

When a bound on growth is enforced at an entry point rather than at the write, a test that calls the writer directly gets the growth without the bound. This is not a test-hygiene slip: the test is correct to bypass the entry point, because the entry point is what prunes, and a fixture that pruned would delete the developer's real work. So the two properties separate — the writer is exercised, the bound is not — and the accumulation lands somewhere gitignored, where nobody is looking, which is the same blindness the relocation was performed to end. Ask, of any bound that runs at a seam: which callers reach the writer without passing through the seam, and what happens to what they leave. And state the completeness criterion beside the contamination one: an assertion that nothing is written to the old location is satisfied most cheaply by writing nothing anywhere, so each lane owes the paired assertion that its own default still lands where the move sent it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
