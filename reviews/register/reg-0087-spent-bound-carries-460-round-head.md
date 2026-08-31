---
id: reg-0087
status: pending
observed_at_pr: 460
observed_at_head: e259688
class:
recorded: 2026-08-14
source_comment: 5296503220
---
## Spent-bound carries from PR #460 round 2 (head `e259688`)

**Row kind: INSTANCE-class** (kogaki#374), all three — not `out-of-dimension:`
lines, and **not counted toward rule 3's three-of-a-class widening trigger**.
Each row's value is the defect it names, not a count.

PR #460 is a spec-only amendment (SPEC-terrain §14.4.1). Round 2 is the bound's
second and last round, so "resolve it in the review" has no round left to run
in; all three findings are latent (the PR ships no executable behaviour) and
non-gating, which is kogaki#374's default cell exactly. `carried: #434` was
declined as a carrier because #434 closes on this merge.

1. **§2.4's positive limb is left contradicted and mis-attributed.**
   `specs/spec-terrain/SPEC.md:4385-4387` says the hand-over is the first act
   "which is §14.4's existing ordering and is unchanged". §14.4 (`:4292-4310`)
   carries no ordering rule; the ordering is §2.4's positive limb (`:648-651`),
   which mandates the rendering be "relayed in full, in the user-visible reply,
   as the FIRST act after the command returns". §14.4.1 changes the object of
   that act to the artifact's name, so no conformant run will satisfy §2.4's
   positive limb or its projections (`:1288-1290` §6.3 act 1; `:322-325` the v13
   Status block). §12.2 got amend-by-name; §2.4 got neither that nor a mention.
   **Reachability:** fires for the story 1.66 implementer, who reads §6.3 for
   the post-tag-selection window.

2. **The §12.2 precedence is declared on only one side.** The ground quoted for
   it — `gloss/lessons/knowledge-architecture.md:215@8906f207`,
   `conformance-copy-needs-declared-precedence` — says "in a place both sets of
   maintainers will read". The declaration sits at §14.4.1; §12.2 (v12) at
   `:3419-3474` is untouched and still reads "exactly one owner rendering" /
   "two or more … is a contract violation and a failed run" with no forward
   pointer, ~950 lines away. This file's own convention for amending §12.2 is a
   new versioned section beside it (v11 → v12).

3. **The "What is NOT carried" enumeration miscounts itself.** `:4438-4439`
   announces "Three things" and the third bullet closes with a fourth,
   unrelated item after its own concluding sentence ("Nothing counts the
   rendering files either.", `:4452-4453`) — which belongs to §12.2's count,
   not to the hand-over floor. In a clause arguing that a stated obligation must
   not read as having an enforcement it lacks.

Report: https://github.com/tim-nish/kogaki/pull/460#issuecomment-5296496723
