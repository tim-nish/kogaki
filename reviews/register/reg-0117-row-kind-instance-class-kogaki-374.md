---
id: reg-0117
status: pending
observed_at_pr: 504
observed_at_head: 81063a6f341553aeb4be610c780ae7154e5d91a9
class:
recorded: 2026-08-18
source_comment: 5324453117
---
**Row kind: INSTANCE-CLASS** (kogaki#374, the register's second producer) — three spent-bound latent non-gating in-diff carries from PR #504 round 2, head `81063a6f341553aeb4be610c780ae7154e5d91a9`. **These are NOT `out-of-dimension:` rows and must not be counted toward rule 3's three-of-a-class widening trigger** — their value is the defect each names, not the count.

Disposition ground: PR #504 had auto-merge armed (enabled 2026-08-18T06:11:50Z) and was at its second of two rounds, so both of kogaki#433's causes applied and no later round could read a fix. Each row below is latent — nothing currently reaches it.

---

**1. A committed-population figure that counts the directory's README as a member.**
`specs/spec-client-kit/SPEC.md` §4.7 states "**114 were committed**" of the emission files at the carrying head. `policy/emissions/*.md` matches 114 files, one of which is `policy/emissions/README.md` — so the committed emission count is **113**. The figure was inherited from round 1's `ls policy/emissions | wc -l`. The sibling carrier kogaki#505 already states the rule the figure breaks: "`README.md` is excluded from the count; only `<YYYY-MM-DD>-<slug>.md` files are members." Notable because the round-2 edit's whole subject was stating a number with its population named, and the defect survived one layer down in the number itself.

**2. "Carried separately" naming no carrier, inside the section whose lesson was to name carriers.**
`specs/spec-client-kit/SPEC.md` §4.7 says the eleven uncommitted emissions are "itself a departure from §4.3 and is carried separately." Two paragraphs earlier the same section names kogaki#505 "rather than left to be discovered", citing §4.5 for that shape. A reader wanting the §4.3 departure has nothing to follow. The defect is the unnamed pointer, verifiable from the diff's own text.

**3. A vocabulary split taught and then broken within two lines.**
`specs/spec-client-kit/SPEC.md` §7 item 5 gained a parenthetical reading "this slot is about the two **states**, not about those **arms**" — while the next surviving sentence still reads "so both **arms** would have been designed against no instances", using "arms" for the two states just separated from them. The insertion also left line 655 unwrapped against the surrounding wrap width (the registered line-length check passes; style, not a check failure).

Report: https://github.com/tim-nish/kogaki/pull/504#issuecomment-5324450240
