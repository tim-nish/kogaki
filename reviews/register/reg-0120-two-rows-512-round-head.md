---
id: reg-0120
status: pending
observed_at_pr: 512
observed_at_head: bb101c3b854630e41441cc6dea84684f4be37b4b
class:
recorded: 2026-08-18
source_comment: 5325931763
---
Two rows from PR #512 round 1, head `bb101c3b854630e41441cc6dea84684f4be37b4b`.

**Both are INSTANCE-CLASS rows (kogaki#374), not `out-of-dimension:` observations.** Their value is the defect each names, not a count — neither counts toward rule 3's three-of-a-class widening trigger.

Cause of the carry: **auto-merge was armed** on PR #512 (`autoMergeRequest` non-null, enabled 2026-08-18T08:52:20Z) at round 1 of the two-round bound. The round counter still showed a round remaining, so this is kogaki#433's second cause rather than a spent bound — nothing routed to a later round could be read there. Both findings are non-gating, in-diff and latent: neither is reachable as a wrong emission, so the floor's `carried: register` applies rather than a minted issue or a successor.

---

**Row 1 — `policy/kit/bin/emit.mjs:212`, the mutation tally still omits PR #508's sixth mutation.**

kogaki#509's second rider named a specific drift: PR #508 ran a sixth mutation recorded only in its fix commit message — *"MUTATION EVIDENCE: a sixth, run once and restored — removing the guard is caught by install-test's refusal case"* (`2d821cd`) — while the pass line still read FIVE. PR #512 re-baselines the tally 5 → 8 (five old, three new) and reports the rider discharged. The sixth is therefore still uncounted and still unnamed, and a reader comparing `2d821cd`'s message against the pass line meets an unreconciled six-versus-eight.

It is defensible that #509's mutation 1 supersedes it — the `--date`-only guard the sixth removed no longer exists — but the branch nowhere says so. Remedy: one clause in the pass line, either counting the sixth or declaring it subsumed.

**Third occurrence of this class in one chain** (#505 → #508 → #512): a mutation-evidence count stated in one carrier and corrected in another without the two being reconciled. Recorded here as an instance; if a reader wants the count, that is the count.

---

**Row 2 — `policy/kit/bin/emit.mjs:208-211`, the self-test's pass line claims one layer more than the fixtures hold.**

The pass line lists the composed-filename guard among what `selfTest()` establishes — *"the WRITE path is guarded by asserting the COMPOSED FILENAME against EMISSION_FILE … so BOTH variable halves are covered by one condition"*. The fixtures assert only that `EMISSION_FILE` composed with `slug()` rejects those names. They never assert that the guard exists in the write path or that it precedes the write: deleting the `if (!EMISSION_FILE.test(filename))` block leaves `--self-test` GREEN, and the branch's own mutation table concedes it by attributing mutations 1 and 3 to `install-test.sh` cases.

The rider #509 carried is genuinely half-discharged — asserting the shipped `EMISSION_FILE` rather than a local `DATE_OK` literal is the real improvement, and it landed. What remains is the disclosure. The module already carries the exact sentence needed, one clause over, for the render site: *"removing the RENDER SITE leaves this self-test GREEN and is caught only by policy/kit/test/install-test.sh, which is why the read and the render are asserted at two layers rather than one."* The guard is a third thing asserted at the install-test layer only and gets no such sentence. Remedy: one clause.
