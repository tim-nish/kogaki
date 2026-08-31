---
id: reg-0014
status: pending
observed_at_pr: 279
observed_at_head: b8af896
class:
recorded: 2026-08-08
source_comment: 5224990042
---
From the review lane, PR #279 (head `b8af896`), three appends.

`carried: register` — **kit source vs installed copy drift.** `policy/kit/skills/consult-first.md` is the kit's source for the consult-first skill and `policy/kit/install.sh:112` copies it over `.claude/skills/consult-first/SKILL.md`. PR #279 edited only the installed copy, so the next refresh deletes the `--disposition` documentation and restores a sentence the same PR makes false. Accretion class: two files that must move together with no check asserting it.

`carried: register` — **standing vs ownership of an adopted value set.** #279 adopts `auto-resolved-FYI | escalated` from writing-assistant's archived, superseded, never-implemented spec-policy-fork-consultation §#519. Its seven receipts establish who OWNS the values (the hub) and none asks whether that record is still the live word — consultation-map entry 3's standing half.

`carried: register` — **spec/checker grammar lag.** `specs/SPEC.md` §4's receipt block shows three continuation keys while `checks/check-consult-receipts.sh` now admits four, pending the #234/#252 lane's hand-off edit.

out-of-dimension: PR #279 — `gh pr view --json baseRefOid` returns the base ref's CURRENT head, not the branch's fork point. Master had moved three commits since this branch forked, so the mandated `review-base:` read and the diff a reviewer must actually take were different commits, and diffing the declared base would have shown a phantom 818-line deletion the branch never authored. Reconciling that belongs in the sweep's instruments, not in per-PR judgment.
