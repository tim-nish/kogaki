---
id: reg-0103
status: pending
observed_at_pr: 480
observed_at_head:
class:
recorded: 2026-08-16
source_comment: 5307379718
---
Two observations from PR #480 round 2 (story 1.68, merged ab2f255), each
`carried: register` by the reviewer:

1. **The spend-disclosure fixture's mutation table is prose, and partial.**
   Two of seven cases carry demonstrated break-once evidence (the empty-spawn
   line, the call-site count), each in a different commit message; the other
   five assertions are asserted-but-unmutated, and no table names each
   mutation and which fixtures fail it. The declared removal signal (an outer
   end-to-end harness test over captured stdout) would subsume the whole
   question.

2. **The disclosure binds the two sweep closes and not the fixture tier's
   FAIL exits.** A fixture failure after fixture spawns have claimed exits
   through `sys.exit(1)` with no disclosure, leaving claimed artifacts in the
   global directory that no pass close attributes — §4 clause 4's defect one
   exit path over. Latent (every fixture passes on served state), and the
   "exactly two call sites" assertion makes extending coverage a deliberate
   edit; the same removal signal subsumes this too.
