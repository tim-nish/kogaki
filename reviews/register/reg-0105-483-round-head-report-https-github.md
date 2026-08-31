---
id: reg-0105
status: pending
observed_at_pr: 483
observed_at_head: a233e49
class:
recorded: 2026-08-16
source_comment: 5307857855
---
**From PR #483 round 2** (head `a233e49`, report at https://github.com/tim-nish/kogaki/pull/483#issuecomment-5307854615).

Two **instance-class** rows — the kogaki#374 producer, a spent-bound non-gating in-diff carry. **Their value is the defect each names, not a count**, so neither counts toward rule 3's three-of-a-class widening trigger, which reads `out-of-dimension:` rows only.

1. *instance-class.* `specs/spec-draft-pipeline/SPEC.md:787-789` quotes §7.2 across an ellipsis and silently lowercases the sentence-initial "There" to fit the splice. The elision itself is properly marked with `…`; the case change is not. Meaning is unmoved — filed because this repository treats quotation fidelity as load-bearing (`policy/consultation-map.md`'s excerpt-versus-splice discipline, and entry 1's repair, which turned on a quote that read as one line and was two).

2. *instance-class.* `specs/spec-style-contract/SPEC.md:294-299` cites "SPEC-draft-pipeline §5.3" with no file path, correctly retiring a drifted `:88` line pointer but landing outside that file's own house form — `specs/spec-draft-pipeline/SPEC.md` §6.9.2 (`:83`, `:267`) and `specs/spec-gate-carrier/SPEC.md` §9 (`:285`). Path-plus-section is equally drift-proof and additionally resolvable by a reader who does not hold the spec-name-to-path mapping.

**Not appended, and stated so the omission is not read as an oversight:**

- The v1-form-receipts finding took `carried: register` at **round 1** of this PR and is re-emitted at round 2 only because the head moved. It is one carry, not two — a second row would double-count one defect.
- Round 1's `out-of-dimension:` row on `check-boundary-receipts.sh` reading `no linked issue named in the PR body or commits` **recurs at this head** and is deliberately not appended again. The same defect at two heads of one PR is one observation; inflating an accretion-class count is what rule 3's threshold is least able to survive.
