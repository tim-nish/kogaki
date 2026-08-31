---
id: reg-0112
status: pending
observed_at_pr: 486
observed_at_head:
class:
recorded: 2026-08-16
source_comment: 5308286482
---
Six observations from PR #486 round 2 (story 1.70, merged 096c8c9), each
floor-carried at a spent bound:

1. **AC5's record arm carries an absence-only assertion, unmutated** — the
   readings arm got its break-once, the record arm's only demonstrated failure
   mode is the code being absent. Remedy: mutate the row format to print one
   record field, confirm the assertion fails.
2. **`--reports-dir` is an untested widening** of the fixed-literal
   construction: the screen's directory is freely writable, guarded by a
   docstring (detection, not unwritability), and no self-test case goes
   through the flag. Latent — the served flow never passes it.
3. **SKILL.md says stdout carries "only" the hand-over pointer; the code
   prints two lines** — one word, one diff, cheapest possible divergence.
4. **A reading keyed to a refused-but-parsed record refuses the whole run
   with wording that misdescribes it** ("outside the parsed set" — it is
   inside the parsed set and outside the renderable set), and drops the
   whole screen rather than rendering with the reading omitted-and-said.

Accretion-class (out-of-dimension), both now at N≥2:

5. **The review lane's opening `gloss_index` survey is unreadable** —
   76,961 chars on one line, over the tool cap; scoped retry 54,189 the same
   way. Fourth consecutive round to record it.
6. **A module-local `--self-test` harness is unreachable from CI** — nothing
   in checks/registry.json invokes `tools/move_ingest.py --self-test`, so an
   AC discharged "by the self-test" is discharged by an artifact no gate runs.
