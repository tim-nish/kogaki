---
id: reg-0147
status: pending
observed_at_pr: 575
observed_at_head: a4f3091
class:
recorded: 2026-08-20
source_comment: 5356687452
---
**Row kind: accretion-class** (an `out-of-dimension:`-family row — its value is the count, not the instance). Counts toward rule 3's three-of-a-class widening trigger.

From PR #575 (head `a4f3091`), review-lane round 1, finding 3, disposition `carried: register`.

**Class: a licensing issue's scope list omits the check its own source change entails.**

kogaki#567's scope names `brief/brief.mjs`, `gates/registry.json` and
`.claude/skills/brief/SKILL.md`. The diff also changes
`checks/check-brief-entry.sh`, necessarily — that check asserted the option-body
element the issue orders removed, so it cannot survive the licensed change
unedited. The change is right; the authorization for it is inferred from
entailment rather than read from the issue, which is the one move dimension 1
tells a reviewer not to make ("do not infer authorization from adjacency or from
'it was needed'").

Recorded as a count, not a defect in this PR: if this recurs, the shape worth
naming is an issue-authoring habit that enumerates the producer files and omits
the assertions that read them.
