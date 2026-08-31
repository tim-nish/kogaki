---
id: reg-0072
status: pending
observed_at_pr: 429
observed_at_head: 1d05507
class:
recorded: 2026-08-13
source_comment: 5282122069
---
**Register append — instance-class row** (PR #429, round 2, head `1d05507`).

Stating the class explicitly per kogaki#374: this is a **spent-bound non-gating in-diff carry**, whose value is the defect it names, **not** a count. It must **not** be counted toward rule 3's three-of-a-class widening trigger, which reads over `out-of-dimension:` lines only.

The finding, from the round-2 report (https://github.com/tim-nish/kogaki/pull/429#issuecomment-5282116015):

> finding: nit open  The correction's ASIDE overclaims what kogaki#426 contains. §10.2 now says "kogaki#426 restates it secondhand and is **not** the carrier". The first half is not so: a whole read of kogaki#426 carries no restatement of #127's disposition at all — its only mention of #127 is line 54, "The re-authoring was clause by clause per kogaki#127's admission rule", which is the admission rule; its three occurrences of "discharged" (lines 77, 87, 97) are about #426's own discharge, and "vitality" does not occur. So #426 is not a secondhand restatement of the carrier-vitality selection; it is silent on it.

Remedy is one clause at `specs/spec-style-contract/SPEC.md` §10.2: "kogaki#426 restates it secondhand" → "kogaki#426 does not carry it". The clause's load-bearing half — that kogaki#127 is the carrier of the standing half — is correct and untouched by this row.

Why it lands here rather than in a successor: PR #429's two rounds are spent at this head, "resolve it in the review" is no longer available, and minting an issue or a successor PR for one clause of an aside costs at least two further review rounds against a defect that misdirects no carrier and holds nothing red.
