---
id: reg-0178
status: pending
observed_at_pr: 712
observed_at_head:
class:
recorded: 2026-08-30
source_comment: 5467192011
---
Carried from PR #712 (kogaki#700). One `should` finding the sitting acted on
incompletely, and the incompleteness is the entry.

**A merge-path close check that reads only the PR's own surface is blind to the
branch's commit messages.** PR #712 was to merge without closing #700, which
still carries a live routed finding. Three things could have observed a closing
keyword on the merge path, and the sitting ran two:

- a grep over the PR title and body — run, and initially wrong: it tested
  `closes|fixes|resolves` and missed `close` in a heading, which GitHub's parser
  reads;
- `closingIssuesReferences` — run, and genuinely empty at merge time;
- **the commit messages in the merge range** — not run, and the live keyword was
  there.

`gh pr merge --squash` composes the squash body by CONCATENATING the branch's
commit messages, so `Closes #700` in commit `a804fbe` landed on `master` and
closed the issue from the default branch. The PR-surface instruments were both
true and neither could see it. #700 was reopened and the mechanism recorded on
its thread.

**Why it is worth an entry rather than a note on a closed PR.** `/ship-cycle`
merges with `--squash` as its standard act, and the run-once and
close-requires-successor rules both assume a run controls whether its issue
closes. This is a route by which a merge closes an issue the run decided to
leave open, and nothing in the pipeline reads it. The cheap instrument is one
line before the merge — `git log <base>..<head>` scanned for closing keywords in
every grammatical form — sited where the merge already happens.

**The narrower half, stated so it is not conflated:** the initial grep's
`closes|fixes|resolves` blind spot is a bug in one command I typed; the
instrument gap above survives typing it correctly.
