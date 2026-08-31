---
id: reg-0162
status: pending
observed_at_pr: 599
observed_at_head: 37081d9ddbe11a09333f8b71b716e28e1ecb04a4
class:
recorded: 2026-08-21
source_comment: 5367229707
---
**Row kind: instance-class** (spent-bound latent non-gating in-diff carry, kogaki#374) — **not** an `out-of-dimension:` row, and it must not be counted toward rule 3's three-of-a-class widening trigger.

From: PR #599, head `37081d9ddbe11a09333f8b71b716e28e1ecb04a4`, round 2 (bound spent; auto-merge read as `null`, so it is the bound and not the arming that closes the cycle).

`specs/spec-gate-carrier/SPEC.md:127` writes "**since v3** the declaration itself rides the transcript", dating another repository's ratification by this spec's own version number. v3 of `SPEC-gate-carrier` records the transport change; `SPEC-triage-gh` v65 effected it, and `SPEC.md:143-146` states that precisely eight lines below. Same class as §3.1's own recorded first cut, which "pinned the clause at `v52` and added 'and will until that repository acts': a version claim … about a carrier nobody here watches". Remedy is one token — "since the toolkit's 2026-08-21 ruling". Latent: nothing acts on the sentence, and the correct fact is stated nearby; the cost is to a later reader who re-versions or reverts this spec and finds a cross-repo transport fact hanging off a local version marker.

Full context in the round-2 report on PR #599 (finding 4).
