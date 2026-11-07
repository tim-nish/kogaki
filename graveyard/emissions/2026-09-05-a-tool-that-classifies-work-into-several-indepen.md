<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-05
repo: Kogaki
grain: lesson

## Trigger — what happened

A tool that classifies work into several independent groups gained a new group whose implementation was never wired in. The missing name is only reached when that group runs, so the whole classification act dies with a name error and every other group — all of which work — becomes unreachable with it.

## The learning

When one act fans out over independent groups and collects their results, a fault in any single group takes the whole act down unless each group is isolated. The blast radius is not the group; it is every consumer of the act. Two cheap properties keep it proportionate: run each group so its failure is captured and reported as that group's problem rather than raised through the collector, and have the surface that lists the groups be the same surface that dispatches them, so a group that is named but not implemented is a startup error rather than something discovered when a caller happens to select it. The tell that this is missing is a total outage whose message names one member.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
