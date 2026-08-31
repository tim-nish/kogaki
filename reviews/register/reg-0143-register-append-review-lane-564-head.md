---
id: reg-0143
status: pending
observed_at_pr: 564
observed_at_head: 87cb89b7f248063987771aae90136388c2de9310
class:
recorded: 2026-08-20
source_comment: 5352428525
---
Register append from the review lane — PR #564, head `87cb89b7f248063987771aae90136388c2de9310`.

**Row kind: instance-class** (kogaki#374) — these are spent-bound-equivalent latent non-gating in-diff carries, NOT `out-of-dimension:` lines. **They do not count toward rule 3's three-of-a-class widening trigger.**

Ground for the carry: auto-merge is **armed** on #564 (`gh pr view 564 --json autoMergeRequest` returns an object, enabled 2026-08-20T06:24:39Z). Per kogaki#433 the round counter still shows a round remaining, but the change lands the moment checks go green, so nothing routed to "resolve it in the review" or "a later round" can be read there. Clause 3's successor lane would be the carrier for a *reachable* finding, but minting an issue is outside this lane's grant table (kogaki#310 lists `gh issue view` and `gh issue comment`, not `gh issue create` and not `story-sync`). The register is the reachable carrier, so these are recorded here rather than evaporated.

1. `specs/spec-draft-pipeline/SPEC.md` §5.3 — the `deferred slot: single-path-fill-route` paragraph added by this PR describes `compose.mjs fill` as an undischarged decision ("this sitting … changes nothing about `fill`"), but kogaki#551 is CLOSED and the same file's v17 status entry (line 24) and `brief/compose.mjs:359` already record `fill` as RETIRED. The paragraph was written while #547 was frozen and the successor's renumber commit reconciled the version label but not this content.

2. `specs/spec-draft-pipeline/SPEC.md:1483` — the clause heading reads `(v17, kogaki#522)` where the status entry, `.claude/skills/brief/SKILL.md` and `checks/check-brief-entry.sh` all read v19; v17 is separately taken by kogaki#550/#551's amendment in the same file. `checks/check-brief-entry.sh:654` carries a second straggler ("all against §5.3 v17's completed arc"), which the PR body attributes to the registry-efficacy pointer rather than to the check's own pass line.

3. `checks/check-brief-entry.sh` case (n) — nine arc-table rows and four standalone assertions, five named mutations. Seven arc rows (the §4.1 Step-record row, entry, thesis gate, adopt, mint, path review, assembly) and the `ENDS AT A FILLED BRIEF` assertion carry no named mutation. PR #547 round 1 already found one such uncovered row (path composition) and it was real.

4. `checks/check-brief-entry.sh:648` — the FAIL banner still reads "(SPEC-draft-pipeline §5.3 v11, stories 1.71/1.72/1.76)" while the file now asserts §5.3 v19 case (n) for kogaki#522.
