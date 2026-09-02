---
id: reg-0217
status: pending
observed_at_pr: 778
observed_at_head: f6af63f
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #778 round 2 — `src/survey-schema.json` was repaired at **line 5**
and not at **line 27**, so one note now states the same deleted member in **both
tenses**.

The head of the note was rewritten to stop claiming that
`check-terrain-composition.sh` *"READS these lists"*. Its tail still reads: the
recompute **algorithm** *"is written twice on purpose — `src/terrain.mjs`
(generation-time refusal) and `check-terrain-composition.sh` (merge-layer
detection) … collapsing the duplication is not licensed."*

An algorithm now written **once**, under a clause forbidding the collapse **that
the deletion already performed**.

**It is the same present-tense-arrangement claim the eight lines above it were
rewritten to stop making** — not a prose mention, so the issue's leave-history-
as-written clause does not reach it either.

**The failure is repairing by SITE rather than by CLAIM.** The fix was aimed at
a grep hit; the note contains two independent claims about the same member and
only the hit was rewritten. A file identified by a search is repaired at the
line the search returned, and the second occurrence in the same paragraph is
invisible to that motion — the reader's attention having been spent on
navigating to the match.

**Not fixed at the head that produced it.** The two-round bound was spent and
the round-2 report certified `f6af63f`, which the Review presence condition
requires — `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`.

Eleventh instance in the 2026-09-02 sitting of that composition; see reg-0206 to
reg-0216.
