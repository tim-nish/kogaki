---
id: reg-0016
status: pending
observed_at_pr: 286
observed_at_head: aca55c7
class:
recorded: 2026-08-08
source_comment: 5225107572
---
Append from the review lane — PR #286 (head `aca55c7`), round 1.

Three observations, all `carried: register` or `out-of-dimension:` on that
report.

**1. spec/checker grammar lag — the class is DISCHARGED once and UNINSTRUMENTED
still.** PR #286 lands the §4/`CONT` reconciliation this register has been
counting since PR #279's review. The count is now a discharged act, and the
class is *not* closed: `specs/SPEC.md` §4 asserts it is "the governing text for
the checker's admitted key set" while nothing compares that block against
`checks/check-consult-receipts.sh:146`'s `CONT`. A fifth continuation key
re-opens the identical gap, silently. The served condition on a conformance copy
is a declared precedence **plus** a mechanical mismatch check; this repository
now has the first half in two places (§4's receipt block, and
`.claude/skills/review-lane/SKILL.md`'s own clause-8 grammar block, which marks
the same missing half about itself) and the second half in neither. **Two
instances of one class — the instrument request is "a mismatch check over a
declared conformance copy", generic over both.**

**2. A governing-text claim whose content cite is a repository path, not a
served pin.** §4 now says the `disposition:` value set is "copied verbatim from"
writing-assistant `specs/spec-policy-fork-consultation/SPEC.md` §"Amended
2026-07-21 (triage, #519)". The *standing* and *ownership* halves are pinned
thoroughly at `product-lab@dec0d568` and the tokens are already merged in
`DISPOSITIONS`, so nothing is wrong — but the one clause no pin backs is the
verbatim-ness, and the cite is to a path Kogaki cannot serve (`specs/SPEC.md`
§2). Accretion-class: the value is the count of governing-text claims resting on
unservable cites, not this instance.

**3. `out-of-dimension:` — `check-boundary-receipts.sh` matches trigger terms
use-vs-mention.** On PR #286 a prose-only spec diff matched map entry 1
(Check/CI infrastructure) on the word `check` appearing in changed text that
merely *names* checkers rather than modifying one. No registry entry, no check
file, no fixture, nothing executable changed. This is the class kogaki#41 fixed
once in the review-report grammar, one instrument over: the matcher has no
mention/use distinction, so any spec text discussing the checks matches entry 1
forever. The review reported the boundary `cannot-determine` rather than
resolving it either way, because the map's own act-class wording does not settle
whether editing a checker's *governing text* engages the entry — which is the
second half of the observation and arguably the repairable one.
