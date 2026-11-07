<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-28
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1186 failed more than ten /ship-cycle runs, each on a different refusal, while the remaining code change stayed small.

## The learning

The Issue bundled three stub-verifiable code acts with one seam test whose acceptance depends on a real Gateway build, a real Hub checkout and two environment variables the worker lane refuses to read or reach. Every worker attempt fought that clash: consumer names, tool choice and outcome tokens were guessed in the body before the upstream contract existed, the transport's own self-test was later removed from the allow list, and each guess that missed became a fresh defect for the next run. The stub-verifiable acts finished on the branch by the second dispatch. Split such an Issue at authoring: the code acts close on stub verification, and the live seam test is its own Issue whose executor is the orchestrating session or the owner by hand, never a lane worker. Write the body after the dependency's contract lands, not as a prediction of it, and revise the body rather than stacking superseding briefs in comments.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
