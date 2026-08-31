---
id: reg-0131
status: pending
observed_at_pr: 544
observed_at_head: 8906f20752e27d1935c62f24c8ba41ea1d55dba0
class:
recorded: 2026-08-19
source_comment: 5341483379
---
**Carries from PR #544, round 2.** Row kind: **instance-class** (kogaki#374) for all three — latent, non-gating, in the diff's own text, at a bound spent by that report. None is an `out-of-dimension:` observation, so none counts toward rule 3's three-of-a-class widening trigger.

Head `605b089`, base `382a29b`, licensing issue kogaki#541.

**1. The wider repair is pointed at a carrier that closes on merge.** `tools/gloss-survey.sh`'s header says the gateway-envelope fix "is named in kogaki#541 as the arm that would serve every consumer". kogaki#545 was filed for exactly that arm during round 1's repair — but the header still names #541, which this PR closes. The remedy landed in the tracker and not in the diff's text, so the file will point at a closed issue the moment it merges. One token; the PR body's copy of the same sentence is corrected at merge, the header is not.

**2. `$GLOSS_SURVEY_GATEWAY` word-splits a spaced path.** `tools/gloss-survey.sh:74`:

```sh
${GLOSS_SURVEY_GATEWAY:+--gateway "$GLOSS_SURVEY_GATEWAY"}
```

The inner value is quoted; the **expansion itself is not**, so a gateway path containing a space splits into multiple words and the transport receives a truncated `--gateway` argument. The irony is worth recording: this is the override that exists to exercise the *degraded* branch, so a malformed invocation of it produces a wrong reason in exactly the branch added to carry an accurate one. Latent — every path used so far is space-free — and I introduced it via a `sed` while testing rather than by writing it.

**3. Entry 2's prescription names two shards; one has a receipt.** The consultation-map entry prescribes a survey the fix commit ran, and the branch pins `gloss/lessons/knowledge-architecture.md:17`. The second prescribed shard is unreceipted. This is the fourth instance this sitting of a consult claim covering less than the entry asks for, and the third where the shortfall was found by a reviewer rather than by me.

**Why all three are carried rather than fixed.** PR #544's two-round bound was spent at this report and auto-merge was unarmed, so no later round could read a fix — the floor kogaki#374 sets for exactly this case. Fixing them would have moved the head and left the PR unmergeable with no round available to clear `review-report`.

consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:17
