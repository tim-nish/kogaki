---
id: reg-0212
status: pending
observed_at_pr: 774
observed_at_head: 2255e45
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #774 round 2 — the recorded MECHANISM for round 1's finding 1 is
stated inaccurately in two durable places, though its conclusion is right.

`checks/registry.json`'s `brief-compose` `efficacy_note` says the three
empty-value calls *"passed no instantiation, so they refused on §4.12's
absent-record guard before the reader-field guard was reached"*, and the case
comment at `checks/check-brief-compose.sh` repeats it.

**That is not what the code does.** In the UNMUTATED path the reader-field
guard runs FIRST (`src/assemble.mjs`'s `unauthored` filter precedes both §4.12
guards), so those calls refused there, naming the field, exactly as intended.
The disarming appears only **under the mutation**: delete the empty-string arm
and the empty candidate falls through to a guard that also errors, so
`!empty.error` stays satisfied and the case reports green.

**Why it matters more than an ordinary wording slip.** The note's whole purpose
is to teach the two-guards-one-property class, and the two descriptions are
**different shapes to look for**:

- *a second guard fires first* — the assertion never reaches its subject at all,
  and the case is dead on the happy path too;
- *a second guard catches the fall once the first is removed* — the case is live
  and correct until the mutation, and only the MUTATION is absorbed.

Only the second is what happened, and only the second explains why the defect
was invisible: nothing was wrong until something was deleted. A reader hunting
the first shape would not find this instance. One clause fixes it.

**The irony is worth keeping, and it is the same one reg-0211 records.** This is
a note about a class, written in the same act that found the class three times,
and it gets the class's own mechanism wrong. The fix for "an assertion that
cannot discriminate" was a paragraph that does not discriminate either.

**Not fixed at the head that produced it.** The two-round bound was spent, the
round-2 report certified `2255e45`, and the Review presence condition merges
only a certified head. At a spent bound a latent non-gating finding defaults to
the register — `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154` — the ratified route and the reviewer's own.

Sixth instance in the 2026-09-02 sitting of that composition; see reg-0206 to
reg-0211.
