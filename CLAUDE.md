# Kogaki — operating rules

The policy seam is provided by the **tsurezure client kit** — the managed
block below is its contract, installed and refreshed by
`policy/kit/install.sh`; the wiring itself is machine-local and never
committed. The consumer package lives under `policy/` (kogaki#3), the kit
included (kogaki#9) — it separates into its own repository when a second
consumer installs it.

**Issue-first.** Implementation work begins only after its Issue exists.
Issues are filed through the typed path (`issue-sync file-issue`), carry
their policy pins, and are re-checked against the served surface at pickup.

**Boundary.** Repositories are invisible to Kogaki — article material is
quoted from served renderings at pins (`specs/SPEC.md` §2). Kogaki
guarantees citations; the substrate guarantees facts.

## Compact Instructions

A `/ship-cycle` run outlives its context window. When this session is
compacted, the summary carries **these and nothing else** — reasoning is not
carried, carriers are:

- the **entry Issue number** the run was invoked on;
- the **worktree path** the run is working in;
- the **branch** that worktree is on;
- the **current stage** — one of: admission / implementation / review / merge /
  cleanup;
- **any owner answer not yet recorded to a carrier** — a streamed decision, a
  grant, a gate selection whose act has not yet run.

On resume, re-invoke `/ship-cycle` on the entry Issue; re-read everything else
from GitHub and the tree.

### The window, and what it does not buy

`.claude/settings.json` sets `autoCompactWindow: 400000`. **The ground is not
this repository's and is deliberately not restated here**: it is the measured
run shapes on `tim-nish/claude-toolkit#928`, where 400K sat above every
mid-implementation reading observed and above PR open on the largest run.
Changing the value is a settings edit with a stated new ground, never a code
change.

**Auto-compaction is size-triggered, not lifecycle-triggered.** The window
shifts *where* a compaction lands; it does not *place* one. There is no
programmatic `/compact` and no lifecycle trigger, so a large run can still
compact mid-implementation — the list above and committing at every green are
what bound the loss.

Compaction is never a reason to abort a run.

### This section is a COPY, and its origin is named (kogaki#954)

The rule above is written in three repositories that run the same
orchestrator — `tim-nish/claude-toolkit`, this one, and
`tim-nish/product-lab` — and **claude-toolkit's `CLAUDE.md` is the origin**.
Two carriers of one rule that cannot see each other drift silently, and the
divergence surfaces only when some act needs both to agree; naming the origin
at the point of the rule is what makes a later divergence visible instead.
So: a change to the policy is made there first and ported here, and a reader
who finds this section disagreeing with claude-toolkit's has found the drift
rather than a local variant.

`consulted: product-lab@f9a6d0f54f94c1ab54ca4223c4c4b75811105dcf LESSONS.md:68`

<!-- tsurezure-client-kit:begin (managed block — edits here are overwritten by install.sh) -->
Policy consultation for this repository is set up in `policy/` — start at `policy/CAPABILITIES.md`.
<!-- tsurezure-client-kit:end -->
