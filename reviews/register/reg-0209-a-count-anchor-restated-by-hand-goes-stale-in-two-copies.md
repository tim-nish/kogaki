---
id: reg-0209
status: pending
observed_at_pr: 771
observed_at_head: 4fb415c
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #771 round 2 — the rename sweep's count anchors are restated by
hand in two places outside `SWEEP_KNOWN`, and one of the two was **already
wrong at that head**.

`checks/registry.json`'s `draft-cites` contract says *"The two sites carrying
known hits are exempted BY COUNT and not by file"* and enumerates two, while the
mechanism anchors **three** — `checks/registry.json` itself joined them in the
same commit that wrote the sentence. And `check-draft-cites.sh`'s clean-run
disclosure hardcodes the site list as a literal string rather than rendering
`SWEEP_KNOWN`, so the line a reader trusts as the sweep's own account of what it
exempted is maintained separately from the data it describes.

**This is the round-1 finding's own class one turn later.** Round 1 said the
admission record did not describe what the member covers; the repair for that
introduced a second copy of the same facts, and a third in the echo. The
acceptance requires the sweep to *state what it scanned* — and a disclosure
composed by hand beside the mechanism is prose about the mechanism rather than
output of it.

Remedy named by the reviewer and not applied here: render `${!SWEEP_KNOWN[@]}`
into the echo, and name the third site in the contract. Both close a copy.

**Not fixed at the head that produced it.** The two-round bound was spent, the
round-2 report certified `4fb415c`, and the Review presence condition merges only
a certified head. At a spent bound a latent non-gating finding defaults to the
register — `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154` — which is the ratified route rather than a
compromise, and the reviewer routed it here itself.

Fourth instance in the 2026-09-02 sitting of the spent-bound composition; see
reg-0206, reg-0207, reg-0208 and the emission dated the same day.
