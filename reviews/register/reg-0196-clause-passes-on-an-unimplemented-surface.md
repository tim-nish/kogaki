---
id: reg-0196
status: pending
observed_at_pr: 748
observed_at_head: da51786
class: process
recorded: 2026-09-01
source_comment:
---
process: **Clause-level spec passes on an UNIMPLEMENTED surface generate
contradictions that the first implementation attempt finds immediately.**

Recorded as one observation so a third occurrence is a known class rather than
a fresh surprise. Owner instruction, 2026-09-01.

**The specimen.** `specs/spec-terrain/SPEC.md` §6.0.1 was written for kogaki#737
and amended twice, each pass correct against what it was checked against:

| pass | what it decided | what the next step found |
|---|---|---|
| PR #746 | the surface exists; §2.3's disclosure rule | round 1: the class list said three, the implementing issue planned four |
| PR #748 | the class list, four → six | round 2: two nits; reconciled |
| implementation attempt | — | §6.0.1 places the display inside §6.3's two-act window whose fallback is REFUSE, **and** names a stop that `workflow.json` does not contain |

Two spec PRs, six review rounds, ~$5.18 of review, **zero lines implemented**,
and both substantive contradictions surfaced within minutes of the first
attempt to write the emitter — one by reading §6.3 beside §6.0.1, the other by
looking for the wait the executor would render the invocation at.

**Why review could not find what implementation found.** A review reads the
diff against its licence and the surrounding text; it does not have to make the
thing work. The two contradictions are both of the form *this clause names a
carrier that does not exist* — a property only visible to someone resolving the
carrier. Six rounds of competent review passed over both.

**The shape, stated so the third occurrence is recognised.** A spec section for
a surface nothing yet emits has no reader that must resolve its references, so
each pass is checked against prose alone and the count of unresolved references
can only grow. The tell is a section amended more than once before anything
implements it. What follows from it is a scheduling claim rather than a quality
one: **the cheapest contradiction detector available to such a section is the
first implementation attempt**, so reconciliation and implementation belong in
one carrier and one sitting.

`consulted: product-lab@4adab37645a1cf8ac8ec3dd2b922d5f80d037c5d topics/claude-code-ops.md:80`
— "local rationality does not compose … their composition produced a
non-terminating chain no clause-level review could see", and its companion
finding that the dangerous half is the missing throughput signal.

**Not reachable by any mechanism here.** No check counts amendments to an
unimplemented section, and none is proposed: one observation is not a
threshold. The count is the signal.
