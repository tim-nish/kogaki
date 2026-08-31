---
id: reg-0124
status: pending
observed_at_pr: 527
observed_at_head: 696c8744b77c1500bbe5a22f40f72ccb2773f131
class:
recorded: 2026-08-19
source_comment: 5337448400
---
**Spent-bound carries from PR #527, round 2** (kogaki#374 row kind: **instance-class** — these are latent non-gating in-diff findings, NOT `out-of-dimension:` observations, and must not be counted toward rule 3's three-of-a-class widening trigger).

Head `696c8744b77c1500bbe5a22f40f72ccb2773f131`, base `f7d29af4cb49416cd19c03f0cc228d134398e7b3`. Two rounds spent, so "resolved in the review" was unavailable; each of these is in the diff's own text and unreachable against currently served state, which is the floor's `carried: register` case.

1. **`checks/registry.json` re-encoded file-wide.** 71 insertions / 71 deletions against the base where #518 authorises two records to move: the file was round-tripped through an encoder that expanded every `\u` escape to its literal character. `git show f7d29af:checks/registry.json` holds 64 lines carrying a `—` escape; the same file at the head holds 0. Semantically identical and `registry-conformance` is green — the cost is ~130 lines of churn around the ~10 the licence authorises, on the merge gate's own governing registry, indistinguishable under a later `git log -p`.

2. **`mint --slug` mishandles its two malformed shapes and blames the wrong surface.** `brief/brief.mjs`: `const slug = typeof args.slug === "string" && args.slug !== "" ? args.slug : state.adopted_slug;`. `parseArgs` gives a bare `--slug` the value `true`, so `mint --slug` with no value silently falls back to the adopted name — the shape `adopt` refuses by name a few lines earlier. A malformed value falls into the same guard, whose message ("the run state carries no adopted name — re-run `adopt` …") sends the caller to re-answer a gate that is not the problem. Latent: the skill never passes `--slug` and `checks/check-brief-compose.sh:40` passes a well-formed one. Remedy: split the caller-supplied-name failure from the no-adopted-name failure into two messages.

3. **`brief-compose`'s admission contract names a superseded spec version.** `checks/registry.json:234` still reads "asserted seam-free against a Brief minted through the real §5.3 **v9** flow"; §5.3 is v11 at this head and the mint's contract moved with it. The `brief-entry` record at line 219 was updated to v11 correctly. Remedy: one token.

Report: https://github.com/tim-nish/kogaki/pull/527#issuecomment-5337444938
