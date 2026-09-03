---
id: reg-0230
status: pending
observed_at_pr: 794
observed_at_head: 61bf729
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #794 round 1 found the `suite:` line labelling a contention-inflated
figure "serial sum". The repair renamed the printed label to `member sum` and
added `(contention-inflated; not a serial baseline)` to the log. Round 2
confirmed the printed surface correct — and found the **retracted name still
standing twice inside the same added block**: the header comment still read
"reports wall time BESIDE the serial sum", and the accumulator was still
`serial_sum_ms`.

Neither reaches the log, so nothing is misreported. The cost is to the next
reader, who meets the withdrawn name in the file's own header before meeting the
comment that withdraws it — and the header is the surface a reader consults
*first*.

**The shape: a rename driven by a review finding fixes the surface the finding
quoted and stops there.** The finding named the printed line, so the printed
line was repaired and re-verified; the identifier and the prose that motivated
the printed line were the same author's, in the same commit, and were not
re-read against the new name. A repair scoped to the artifact a reviewer
happened to cite is scoped to the *evidence*, not to the *claim*.

**Why it was not fixed in the round that found it.** The two-round bound was
spent at the round that raised it. Fixing would have moved the head past the
only report covering it, leaving the merge condition unmeetable and forcing a
chained-successor mint — for a comment and a variable name. Carried here
instead, which is where round 2 routed it.

**The neighbouring record is reg-0228** (*a number invented in the act of
repairing a number*): both are defects introduced *by a repair*, in the repair's
own diff, invisible to the check the repair was verified against. The
transferable half: **after renaming a thing because its old name was wrong,
grep the diff for the old name** — the repair's own hunk is the highest-density
place the retracted term survives, and it is the one place a reviewer quoting
the printed surface will not look.

**Consulted at the carry decision**, because the exit itself is a mapped
boundary: `consulted: product-lab@dc9fcd533e9e08538bd0740b7eef37b458fb3bcd
topics/claude-code-ops.md:154` — *"at a spent bound a latent non-gating finding
DEFAULTS TO THE REGISTER, and an issue or successor for such a finding requires
stated reachability or an explicit owner promotion."* The terminal-bound rule at
`topics/claude-code-ops.md:171` governs a PR **blocked** at the bound; round 2
returned `present`/`done`, so supersession was never the applicable rule.
outcome: discriminating
