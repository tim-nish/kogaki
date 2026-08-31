---
id: reg-0015
status: pending
observed_at_pr: 282
observed_at_head:
class:
recorded: 2026-08-08
source_comment: 5225089774
---
`out-of-dimension:` an amend disclosed as re-attributing cites also **rewrote the recorded `query:` text of two request_ids**, and nothing observes the difference.

Observed on PR #282 (merged `77b801a`), commits `a1e266a` → `b1703f0`. The trees are
identical (`87d493fe…` both), so it was a message-only amend, as its author disclosed. But
diffing the commit *objects* shows the amend did more than the disclosure states: besides
re-attributing pooled cites, it rewrote the `query:` line of `f0f941e0` (gaining the
parenthetical "(an observation register append, an issue's inventory row, and a PR comment)")
and of `2abab4e1`, and changed em-dashes to hyphens in both.

The author's account attributed the amend solely to the pooled-cite defect, and framed the
later blocking repair as "body-only … the other three receipts were not touched" — **true
against the `b1703f0` baseline**, and the earlier rewrite is what that baseline already
contained. No claim was false; a change simply went unnamed.

**Why this is register-class rather than a filing.** Whether a rewritten `query:` is what the
gateway was actually asked is **not determinable from this repository** — gateway state is
off-limits (`specs/SPEC.md:77-84`), and `check-consult-receipts.sh` binds *internal consistency
across surfaces*, never fidelity to the wire. So the interesting quantity is the **count**: how
often a receipt's recorded reading is edited after emission without the edit being named. One
instance proves nothing; a recurrence would mean the receipt's `query:` is a field the record
does not actually protect.

Committer timestamps put the amend ~80 s before the round-1 report landed, so the author's
"before any review existed" is approximately but not exactly right — noted for accuracy, not as
a finding against them.

Found by an independent verification pass that posted no segment (its step-zero pre-post
re-read aborted it); relayed here so the observation is not lost with the sitting.
