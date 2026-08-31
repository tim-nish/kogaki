---
id: reg-0097
status: pending
observed_at_pr: 471
observed_at_head:
class:
recorded: 2026-08-16
source_comment: 5306321021
---
**review-lane register append — PR #471, round 2** (`b1f0766`). Three findings carried here by `carried: register`. **All three are instance-class rows** (kogaki#374 shape): their value is the defect each names, not a count, so **none of them counts toward rule 3's three-of-a-class widening trigger**, which reads `out-of-dimension:` rows only. No `out-of-dimension:` row this round.

Why the register rather than an issue or the review: the two-round bound is spent at this report, so "resolve it in the review" is unreachable, and each of these is a latent non-gating finding in the diff's own text.

1. **A wrapped continuation value silently truncates a receipt.** `specs/SPEC.md:1438-1443` writes `request_id:` with a six-line prose value. `CONT` (`checks/check-consult-receipts.sh:146`) matches only `^[ \t]+<key>:` and the continuation loop breaks at the first non-matching line (`:294-296`), so the receipt parses as `request_id` alone and `outcome:`/`query:` are dropped — which then fails the check's own presence-implies-completeness clause. Latent only because the check reads commit messages and the PR body, never spec text (`:7-8`). The stated reachability: the spec is what authors copy from, and the shape fails in CI the moment it is copied into a commit message. Same silent-truncation family the check documents for the pre-#268 `disposition:` case.

2. **`request_id: unrecoverable` is an absent-value vocabulary minted at the point of use.** §4 declares `request_id: <id>` (`specs/SPEC.md:3507-3513`) and names no token for an id no carrier retains. The disclosure is right in substance; the governing document now carries an undeclared convention, one field over from `disposition:` and `axis:`, whose value sets §4 is explicit about not minting.

3. **Excerpt marking, carried over from PR #471 round 1 and still open.** The `LESSONS.md:22` blockquote at `specs/SPEC.md:1432-1434` begins mid-line with no leading `…`, against this repository's own written convention (`policy/consultation-map.md:772-776`), and the arm-1 decline carries a pinned paraphrase beside a verbatim blockquote with nothing distinguishing the two.
