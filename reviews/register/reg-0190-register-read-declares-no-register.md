---
id: reg-0190
status: pending
observed_at_pr: 736
observed_at_head: e7d6401
class: out-of-dimension
recorded: 2026-09-01
source_comment:
---
out-of-dimension: PR #736 — `issue-sync register-read` returns
`no register declared` for kogaki. It resolves its target from `register`
in `.claude/ratchet.json` or `observation_register` in
`.claude/issue-sync.json`; kogaki declares neither, and the issue it would
have named (`kogaki#246`) is closed.

So the **read** half of the `carried: register` route is unwired. SPEC-triage-gh
v73 put `register-read` in `/triage-gh` step 1 precisely so the register's
rows would be read rather than only written — "the review lane's append
captures, and this close is what makes the capture an observation rather than
a ledger nobody reads". After kogaki#624 the rows live in `reviews/register/`
and the reader still looks for an issue, so every triage close renders
`no register declared` over a directory holding 186 records.

kogaki#735 repaired the write path and deliberately did not touch this: the
reader's target resolution lives in `~/.claude/tools/issue-sync`, outside
this repository, which is the same boundary `specs/SPEC.md` §21 §"What this
repository does NOT own" already draws around the writer.

Accretion-class: the count of triage closes rendering a false `no register`
is the useful signal, not this instance.
