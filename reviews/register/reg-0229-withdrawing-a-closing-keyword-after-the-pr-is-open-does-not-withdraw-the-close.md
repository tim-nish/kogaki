---
id: reg-0229
status: pending
observed_at_pr: 793
observed_at_head: a7997c9
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #793 round 1 found the body carrying `Closes #787` while the same
body's acceptance table recorded acceptance 1 as **not met** — merging would
convert a stated shortfall into a silent completion. The keyword was withdrawn
from **both** carriers before the merge:

- the first commit's message was amended to open *"for #787 — NOT a close"*;
- the PR body was edited; `grep -c "Closes #787"` returned **0** and
  `gh pr view 793 --json closingIssuesReferences` returned **`[]`**;
- the squash commit on `master` (`1f7f418`) carries no closing keyword.

**kogaki#787 closed anyway**, at 03:32:33Z, attributed to the merge commit,
`stateReason: COMPLETED`. Reopened with the shortfall restated.

**The mechanism is not asserted.** The most likely reading is that GitHub
registered the closing link when the pull request was **opened** with the
keyword present, and the merge fired that link although the body no longer
carried it. That was not verified from this session, and an unverified cause
recorded as a cause is the defect one axis over.

**The transferable half does not depend on the mechanism:** *withdrawing a
closing keyword after a pull request is open does not reliably withdraw the
close.* The reliable form is not to open the pull request with one — decide
whether the work closes its issue **before** opening, because the withdrawal
path has now been observed to fail once and the failure is silent at every
surface a session can read.

**This repository already holds the neighbouring note** — a closing keyword
ignores every qualifier attached to it ("Closes #N's X half" closes all of #N).
This is the same family and a step further out: the keyword also ignores its own
removal.

**Cost, stated because it is what makes the class worth a record.** The
shortfall was found by review, named in the PR body, named in both registry
`runtime_ms_note`s and named in the commit message — four surfaces — and the
issue closed regardless. Every disclosure discipline this repository runs was
satisfied and the state still went wrong, because the closing act reads none of
them.
