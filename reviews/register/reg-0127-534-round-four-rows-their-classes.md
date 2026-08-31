---
id: reg-0127
status: pending
observed_at_pr: 534
observed_at_head:
class:
recorded: 2026-08-19
source_comment: 5339320867
---
**From PR #534 round 2** (`review-lane report: 976f1b1`). Four rows, and their classes are stated because this ledger has two producers (kogaki#374): one **accretion-class** `out-of-dimension:` row, which rule 3's three-of-a-class trigger reads, and three **instance-class** spent-bound latent non-gating in-diff carries, which it must not.

**Accretion-class — `out-of-dimension:` (counts toward rule 3).**

out-of-dimension: the lane's fixed opening move — an unscoped tier-1 `gloss_index` survey — is unusable through this harness at the current corpus size. The call returns 76,961 characters on a single line and is refused by the tool-result limit before any of it reaches the reviewer; the offered fallback is byte-slicing a spill file, which `SKILL.md` puts out of scope for a per-PR review ("a reviewer that finds itself needing a parser has found a gap in the sweep's own instruments"). A bounded `policy_lookup` was substituted and the round declared `cannot-determine:` on the dimension. This is a property of the lane rather than of the PR, so it is recorded once here rather than re-discovered per round. Observed on PR #534 round 2, 2026-08-19.

**Instance-class — spent-bound latent non-gating in-diff carries (do NOT count toward rule 3).** All three are `nit`, all in the diff's own text, all at a bound spent by this report, and none is reachable against currently served state — the floor kogaki#374 sets for exactly this case.

1. `checks/check-brief-entry.sh` — the shared-headline case's first assertion cannot fail. `if (cd.some((c) => !/—/.test(c.thesis || "")))` tests for an em dash the thesis template writes literally, so it is present whatever `rest` holds, including the empty string the bug it names produces. The property is genuinely held by the `seg.includes(dup)` loop beneath it; the line above is a survivor that cannot fail, sitting one case over from the vacuous survivor round 1 of this same PR removed.
2. `checks/check-brief-entry.sh` — the new widening case dereferences `record.candidates.find((c) => !["L1","L2"].includes(c.display_id)).slug` unguarded. The fixture carries L3–L5 today; a narrowing of it turns a named assertion into a `TypeError`. Fail-safe in direction, lossy in message.
3. `brief/brief.mjs:300` — `const lead = phrase(leads[i]);` sits at eight spaces inside a six-space block, left by the edit that inserted the comment beneath it.
