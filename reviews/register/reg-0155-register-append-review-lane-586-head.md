---
id: reg-0155
status: pending
observed_at_pr: 586
observed_at_head: 807a6c752c81b4dda9147b3fc7803f0cec6705e6
class:
recorded: 2026-08-21
source_comment: 5365568479
---
Register append — review lane, PR #586 (head `807a6c752c81b4dda9147b3fc7803f0cec6705e6`).

**Row kind: instance-class** (kogaki#374). Not an `out-of-dimension:` line, and it
must not be counted toward rule 3's three-of-a-class widening trigger.

A latent, non-gating, in-diff finding carried here because the defect lives in the
diff's own text and its repair is not owed by the licence #586 discharges:

`checks/check-spec-pin-resolve.sh` scans every line of its corpus with no
fenced-code-block state. A `file:line` pointer inside an illustrative ``` block in
`specs/SPEC.md` or `specs/*/SPEC.md` is therefore read as a live pointer and can
fail the tree. This is the use-vs-mention class kogaki#41 fixed once and
`check-consult-receipts.sh` already carries ("Fenced-block quotations are MENTIONS
of the grammar, not receipts, and are excluded from the counted set … the PR #40
false positive"); the new member is the second scanner over prose and it does not
carry it. Latent today — the corpus renders `0 fail` — and reachable by any spec
amendment that adds an example: the two corpus files hold 16 fence markers between
them at this head.

No `out-of-dimension:` observations from this round.
