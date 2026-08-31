---
id: reg-0045
status: pending
observed_at_pr: 370
observed_at_head:
class:
recorded: 2026-08-12
source_comment: 5261314309
---
**Discharged: the fail-open subject-field fixture.** PR #370's round-2 report filed `finding: nit open` `carried: register` — the `§13/1.44 AC4` subject assertions located an entry and then guarded on having found it, so a missed locator skipped the check silently, and the seed-scoped locator matched production prose by exact equality.

Repaired at `11385ba` on the `story/1.60` branch (PR #372): both arms assert presence first and the prose locator is a substring. K6 and K7 — the entry never pushed, either arm — now fail rather than pass silently.

Recorded here because #372's round-1 report correctly flagged the repair as **unlicensed scope**: it is authorized by neither #368 nor story 1.60, and its declared carrier was this register. Marking it discharged so the register is not left holding a defect that has been fixed. The lane's judgment not to block it — test-only, strictly fail-closed, disclosed in its own commit message rather than absorbed — is recorded rather than disputed.
