---
id: reg-0201
status: pending
observed_at_pr: 756
observed_at_head: 51b440e
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #756 round 2 — the neighborhood counts line has THREE carriers and
the fix swept two. `specs/spec-terrain/report-format.json` declares three
alternatives (all-one-level, two-level, three-level) and
`checks/check-terrain-composition.sh` asserts them at the compiled matcher, but
a third site — the check's own rendered-bytes block — still comments that "the
form is `showing <n> of <n> — all <level>` or `showing <n> of <n> — <n> <level>,
then <n> <level>", one alternative short, and its hand-rolled regex admits
unbounded repetition (`(, then [0-9]+ [a-z]+)+`) where the grammar declares
exactly three.

Unconstructible in practice — the level set is closed at three, so a four-part
line cannot be composed — so nothing is wrong with what the check accepts today.
What is wrong is that the block reading the rendered bytes and the declaration
deciding them disagree about what the form IS, and the block's own comment now
misdescribes the class it tests.

**Why this is here rather than on an issue.** The two-round bound was spent.
**Reachability: NOT reachable** — no input can produce a four-part line while
`NEIGHBORHOOD_LEVELS` has three members, so the looseness cannot fire; it
becomes reachable exactly if the level set is ever widened, which is an owner
act that would revisit this grammar anyway.
