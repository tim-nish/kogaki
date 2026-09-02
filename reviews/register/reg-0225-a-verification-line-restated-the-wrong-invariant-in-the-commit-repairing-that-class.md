---
id: reg-0225
status: pending
observed_at_pr: 786
observed_at_head: f79587e
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #786 round 2 — the round-1 repair commit's message asserts **"Line
count still 5621"** as a verification. That commit is +28/-23, a net **+5**, and
the file ends at **5626**. The figure did not hold.

**The property that actually holds is the one beside it**, and it is the one
that matters: all 27 pointer ranges byte-identical, which is true because §3.2
sits at end-of-file *below every pointer into the file*. Whole-file growth at
EOF harms nothing; what had to be invariant was that **no line above any
pointer moved**, and that held throughout — the body count up to §3.2 stayed
5499 through every one of the nineteen repairs.

**So the message restated the wrong invariant.** "The file is still N lines" is
a weaker and different claim from "nothing above any pointer moved", and the
first is false while the second is true. A whole-file count is the natural thing
to type after re-wrapping nineteen paragraphs; it is not the thing the pointers
depend on.

**The class, and why it is worth a record rather than a shrug.** This is a
stated figure that does not reproduce against the artifact it describes —
appearing in the message of the commit that **repairs an instance of that very
class**, one revision after §3.2 installed the rule against it. Fifth instance
in four days (kogaki#632 item 3; PR #783 round 1; PR #786 round 1; the DESIGN.md
recipe; this). The first four were caught in the artifact; this one reached a
commit message, which nothing checks and nobody re-reads.

**Not fixed at the head that produced it.** A commit message is immutable
without a rewrite, the bound was spent at round 2, and the report certifies
`f79587e`. `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`.
