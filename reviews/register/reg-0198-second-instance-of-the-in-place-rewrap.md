---
id: reg-0198
status: pending
observed_at_pr: 755
observed_at_head: 2748ab0
class: out-of-dimension
recorded: 2026-09-02
source_comment:
---
out-of-dimension: PR #755 round 2 — the §13.2 hunk leaves two lines wrapped past
the file's prevailing width, where replacement text was spliced into existing
lines: `specs/spec-terrain/SPEC.md`:1512 and :1523.

**Second recorded instance of [[reg-0195]]**, and the count is why this is its own
row rather than a note on that one. reg-0195 states the shape: *"an in-place
substitution preserves a line's meaning and not its measure, so a fix applied by
editing one token inside a wrapped paragraph reliably leaves the paragraph
unwrapped. Every prose repair made mid-review has this shape, and nothing observes
it."*

Both instances arose the same way — a review finding repaired mid-round by
splicing into a wrapped paragraph — and in both the suite stayed green, because no
registered check reads line width.

**Reachability: NOT reachable**, unchanged from reg-0195. Nothing mechanical reads
the width, and the bound was spent when it was found.
