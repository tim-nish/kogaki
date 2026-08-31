---
id: reg-0083
status: pending
observed_at_pr: 456
observed_at_head:
class:
recorded: 2026-08-14
source_comment: 5295967104
---
Two rows from PR #456 round 2 (merged `fd90933`), both dispositioned `carried: register` by the round itself.

out-of-dimension: [accretion-class] PR #456 round 2 — a failure arm added by the fix commit has no demonstrated firing. The `_n not in globals()` guard in `tools/review-sweep.sh` block 3e reports "trigger names a flag that does not exist at all", and appears in none of the four mutations the commit demonstrated; its only exercised failure mode is total absence of the code, which is kogaki#209's shape — a diff adding an arm nobody has seen fire is adding a coverage claim rather than coverage. It is genuinely load-bearing rather than decorative: the same commit introduced a `sorted(_triggers)` fallback for the unreadable-file path, and without the guard `globals()[_n]` would raise instead of report. Reachable only through a narrow state (a name matching the module-level pattern in this file's text that is also a trigger key yet unbound in the block's namespace, i.e. a definition in a different embedded heredoc), which is why it is latent rather than live.

out-of-dimension: [accretion-class] PR #456 round 2 — the comment exclusion that fixed round 1's finding 2 is line-leading only, so the false-positive surface is narrowed rather than closed. `_l.lstrip().startswith("#")` drops whole comment lines, but a `_GRANT_FAULT_*` name in a **trailing** comment on a code line, or inside a string literal, still reaches the mention scan and owes a module-level definition. Trailing comments are this file's own convention at the very site the family lives (`tools/review-sweep.sh` :1022, :1057, :1178 each carry one), so the hypothetical-member sentence round 1 warned about still reddens every sweep if it is written after the code rather than above it. This is round 1's remedy implemented exactly as named; the residual is what that remedy's shape leaves behind rather than a defect in taking it.

**Why these are register rows and not issues.** Both are accretion-class in the sense kogaki#246 exists for — their value is the count rather than the instance, and neither names work that a sitting would pick up on its own. The second is the sharper of the two as a *class* signal: it is the second time on this branch that a fix landed exactly as specified and left a residual of the same shape one step over, which is the pattern worth watching rather than either instance.
