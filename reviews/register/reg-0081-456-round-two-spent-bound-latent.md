---
id: reg-0081
status: pending
observed_at_pr: 456
observed_at_head:
class:
recorded: 2026-08-14
source_comment: 5295947259
---
## PR #456 round 2 — two spent-bound latent in-diff carries

**Row kind: instance-class** (kogaki#374), not `out-of-dimension:`. Neither row counts toward rule 3's three-of-a-class widening trigger — their value is the defect each names, not the count.

Both are in-diff findings at `9edfaee` left open at a **spent bound**: round 2 was the last round §4 clause 3 allows, so "resolve it in the review" was no longer available. Neither is reachable at this head, which is why they land here rather than minting a successor.

**1. `should` — a failure arm added with no demonstrated firing.** `tools/review-sweep.sh:5718-5722`, the `_n not in globals()` guard in fixture block 3e's reset loop ("trigger {_n} names a flag that does not exist at all"). It is new in `9edfaee` and appears in none of the four mutations that commit's message lists, so its only demonstrated failure mode is total absence of the code — kogaki#209's shape. Reachable only through a name matching `^_GRANT_FAULT_[A-Z0-9_]+\s*=` at column 0 in the file's text that is also a `_triggers` key yet unbound in the block's namespace, i.e. a definition in a different embedded Python heredoc. Load-bearing on the fallback path the same commit introduced: `sorted(_triggers)` is a hardcoded table, so without the guard `globals()[_n]` raises rather than reports.

**2. `nit` — the comment exclusion is line-leading only.** `tools/review-sweep.sh:5619-5620`, `_l.lstrip().startswith("#")`. Round 1's finding 2 was implemented exactly as its remedy named it, and the residual is what that remedy's shape leaves behind: a `_GRANT_FAULT_*` name in a **trailing** comment on a code line, or inside a string literal, still reaches `_mentioned` and owes a module-level definition. Trailing comments are this file's own convention at the site the family lives (`:1022`, `:1057`, `:1178`), so the sentence round 1 warned about — written after the code rather than above it — still reddens every sweep.

Report: https://github.com/tim-nish/kogaki/pull/456#issuecomment-5295943146
