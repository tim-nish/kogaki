---
id: reg-0152
status: pending
observed_at_pr: 581
observed_at_head: 29ffc58b49f67ae5da5053ae690b81861a0339f4
class:
recorded: 2026-08-20
source_comment: 5359127455
---
**Row kind: instance-class** — a spent-bound latent non-gating in-diff carry (kogaki#374), not an `out-of-dimension:` observation. It carries no weight toward rule 3's three-of-a-class widening trigger, which reads `out-of-dimension:` lines only.

From PR #581 round 2, head `29ffc58b49f67ae5da5053ae690b81861a0339f4`:

`brief/brief.mjs:148` — kogaki#574's rename was carried to the minted Brief's owner-facing definition block with no assertion over it. The only check reading that block, `checks/check-brief-entry.sh:505`, asserts presence of the opening clause (`/A \*\*brief\*\* is the working plan/`) and nothing else, so reverting `Reader Path` to `sequence` on that line leaves the full registered suite green. `checks/registry.json`'s `efficacy_note` for `brief-entry` already records that story 1.72's re-cut "removed the FIELDS assertion entirely" — so the gap is known rather than newly discovered. The head's three kogaki#574 mutations (two in `check-brief-compose`, one in `check-brief-entry`) anchor the heading rename and the roster, and none touches this surface.

Remedy, if taken: one assertion in `check-brief-entry` (f) reading the definition block's field list, plus its mutation row on the pass line.

Latent, not reachable: nothing currently served renames this surface. It fires on the next rename of a Brief composition field or heading, which is when the silence costs.

Carried here rather than to a new issue because PR #581's review bound is spent at round 2 (`autoMergeRequest` was `null`; the bound, not the arming, is the cause) and the finding lives in the diff's own text — kogaki#374's floor.

Reported by the review lane; no promotion or issue is implied.
