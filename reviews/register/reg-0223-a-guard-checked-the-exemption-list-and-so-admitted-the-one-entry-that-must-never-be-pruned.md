---
id: reg-0223
status: pending
observed_at_pr: 783
observed_at_head: dfd86cf
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #783 round 2 — `src/runs.mjs`'s `enterSubRun` validates its `sub`
argument against `ALWAYS_EXEMPT`, which **conflates two properties that mean
opposite things** and so admits the one directory that must never be pruned.

`ALWAYS_EXEMPT.terrain` is `["reports"]`, so `enterSubRun("terrain", "reports",
entry)` passes the guard and `pruneWithin` then applies keep-last **inside**
`runs/terrain/reports/` — the report record store whose exemption exists
precisely because the same identity run twice is ONE report (SPEC-terrain
§12.1), a claim a pruned store makes false on the K+1th run. The refusal message
compounds it by advertising the destination: for the terrain lane it reads *"the
declared ones are reports"*.

**The two sets overlap in one lane and are not the same set.** "Exempt from the
lane's prune" and "bounded by its own prune" happen to coincide for
`runs/brief/entries/`, which is what made one list look sufficient. They are
opposite for `runs/terrain/reports/`: it is exempt because nothing may prune it
at all. The module already carries the right name for the concept —
`BRIEF_ENTRIES` — and the repair is a declared bounded-sub set checked against
`sub`, rather than the exemption list.

**Latent, and that is the whole reason it is here rather than fixed.**
`src/brief.mjs` is the only caller and passes `BRIEF_ENTRIES`; no path reaches
the terrain case today. The bound was spent at round 2 and the report certifies
`dfd86cf` — a repair would move the head and need a third round the bound does
not have. `consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`.

**The class, which is what makes it worth recording.** The guard was written in
the same act as the sub-directory it admits, and it reached for the list that
was already there — a list whose members happened to be right for the one caller
in front of it. A guard that keys on an existing set inherits that set's
meaning, not the one its own name states, and the divergence shows up at the
first member the two sets disagree about. Same shape as this sitting's own
`target === root` clause one direction over: there a condition no case could
distinguish, here a condition distinguishing the wrong thing.
