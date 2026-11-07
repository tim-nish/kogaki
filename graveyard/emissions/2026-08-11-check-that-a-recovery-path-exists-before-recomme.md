<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-11
repo: Kogaki
grain: lesson

## Trigger — what happened

A review process allowed two rounds per change. After the second round it raised a real problem: the output was telling readers something false. I recommended fixing it and merging without another review, since two rounds were used up. The fix was correct. But the merge gate refuses any change whose latest version has not been reviewed, and no third review was permitted — so the fix made the change unmergeable, and the process recorded it as stalled, which it counts as its own kind of failure. I had watched that same gate refuse for that same reason earlier the same day. The recovery was to discard the fix, return to the reviewed version, ship the false statement, and re-file the fix as new work.

## The learning

When you propose an action, check that the state it leads to is one the system can leave. It is not enough for the action to be right; there has to be an exit. Here the exit was blocked by a rule I already knew — the gate keys on the latest version — and by a budget I had just spent, and the two combined into a trap that neither one describes on its own. The general form is that constraints compose: a limit on revisions and a requirement that the current revision be approved are individually reasonable and jointly make the last revision final. Before recommending work, ask what happens if it succeeds. A second point, about presenting choices: if you offer someone options, you are asserting those options exist. An unavailable one is not a neutral extra, because it can be the one they pick, and then their decision was made on a set you got wrong. Verify availability rather than plausibility. And the honest recovery, once it happens, is usually to return to the last good state and route the work through the normal path rather than to look for a way around the gate — the gate is not the problem, and the effort of the discarded work is not a reason to keep it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
