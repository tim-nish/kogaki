---
id: reg-0028
status: pending
observed_at_pr: 337
observed_at_head: dc9e6be
class: out-of-dimension
recorded: 2026-08-09
source_comment: 5232396771
---
out-of-dimension: PR #337 — `check-boundary-receipts.sh` matched consultation-map entry 1 and **not** entry 3 on a diff that reasons at length about a contradiction between two contracts (§8.4) and declares a reopen trigger (§3.4).

Entry 3's declared trigger terms include `contradiction` and `reopen condition`; the changed text carries "contradict" and "reopen trigger". The matcher is substring-with-word-bounds over the declared term, so the **inflections miss** — "contradict" does not contain "contradiction", and "reopen trigger" does not contain "reopen condition".

The run's own line, at head `dc9e6be`:

```
ok: 1 mapped boundary/boundaries matched and 2 receipt(s) present — #1 Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the registry (matched on 'check' in changed text)
```

The judgment half read entry 3 as **touched and uncovered** in the same review, so the two halves disagreed on this diff and only the judgment half saw it.

Class: **mechanical**. Per rule 4 of the widening trigger this escalates immediately to the merge carrier rather than accumulating to three — a missed property that is computable belongs to a registered check, not to a third dimension of this lane. Recorded here as the register append the rule also requires.

Note this is *not* the same as the check's already-declared limit (one receipt satisfying every matched boundary); that one is stated in its header. This is a **matching** gap upstream of it: a boundary that was touched never matched at all.

— appended by the review lane, PR #337 round 1
