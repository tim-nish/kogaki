<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-26
repo: Kogaki
grain: lesson

## Trigger — what happened

A /ship-cycle run on kogaki#625 found its decomposition already written: stories 1.89-1.91, authored 2026-08-23 by the spec sitting on PR #626, left in status ready and never published. Story 1.89's acceptance criterion 7 quoted a figure from the artifact it implements — 'counted_baseline in workflow.json: 4 waits, 1 of them conditional, 3 owner-artifact writes'. Two days later workflow.json went to v3 under a DIFFERENT carrier (#636, PR #641), adding a state and making the true figures 4 and 2. Nothing compared the two. The stale figure survived to implementation time and was caught only because the implementer derived the number from the states array instead of trusting the prose, then asserted the derivation against the artifact's own declaration in a fixture.

## The learning

An artifact that has not entered the pipeline is invisible to every instrument the pipeline runs. The checks, the review lane, the closing tables and the cleanup classifier all key on published work — an issue, a branch, a PR — so a written-but-unpublished artifact is not merely unwatched, it is unwatchable: there is no carrier for an instrument to attach to. It ages quietly, and its staleness is discovered by whoever eventually picks it up, which is the worst moment because that reader is the one least positioned to notice, having come to the artifact precisely to be told what to do.

The compounding factor is that the drift arrived through a THIRD party. The story quoted an artifact; a different carrier re-versioned that artifact; neither act touched the story. No single actor did anything wrong and no review could have caught it, because the two artifacts were never in one diff. This is the ordinary shape of a quoted figure — a copy with no declared precedence and no mismatch check — but the unpublished state is what removed the last chance of noticing, since a published story would at least have been re-read at pickup against a live issue.

The remedy that worked was not a process rule. It was DERIVING the figure at the point of use and asserting the derivation against the source's own declaration, so the two readings cannot drift apart without a test failing. That generalizes: where a downstream artifact restates a number owned upstream, the downstream should compute it and check agreement rather than transcribe it. The prose figure then becomes documentation rather than a second authority.

Note the narrower operational point too: a decomposition produced by a sitting whose pull request later dies is exactly the population most likely to be left unpublished, because the sitting that would have published it is the sitting that ended badly.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
