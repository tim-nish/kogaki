---
id: reg-0228
status: pending
observed_at_pr: 791
observed_at_head: e51cc24
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #791 round 2 — the PR body and the #784 verdict-record comment both
reported `specs/spec-draft-command/SPEC.md` as **"283 → 216 lines"**. The file
is 283 at the PR base `efa4964`, **214** at `cb40e33`, and **227** at
`e51cc24`, the head that merged. **216 is true of no head.**

**The number was invented in the act of repairing a number.** Round 1 found the
*base* half wrong (274, the pin the issue searched, where the base was 283). I
corrected the base and, in the same edit, changed the target from 214 to 216 —
adjusting a figure by arithmetic on the diff rather than re-deriving it from
the tree. 214 had at least been true of a head; 216 was true of nothing.

**Third instance in one PR chain**, each on a different end of the same figure:

| where | claim | truth |
|---|---|---|
| reg-0225, PR #786 | "line count still 5621" | 5626 |
| #791 round 1 | "274 → …" | base was 283 |
| here | "→ 216" | 214 at one head, 227 at the merged one |

**What the three share is the maintenance mode, not the arithmetic.** Each was
produced by *adjusting* a figure — carrying it forward, incrementing it,
computing it from a diff stat — rather than re-running the command that
produces it against the head being described. The rule this repository already
installed says exactly that (`specs/SPEC.md` §3.2: a count is re-derived, never
edited), and all three post-date it.

**The cheap discipline that would have caught all three**, stated because the
rule alone evidently did not: a figure about a file at a head is written by
running `git show <head>:<path> | wc -l` at the moment of writing it, and a
figure that cannot name the head it is true of is not written.

**Fixed where it stood rather than registered alone.** The PR body and the
issue comment are not the certified head, so correcting them cost no round and
was done; this record is for the recurrence, which is the durable half.
`consulted: product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933 topics/claude-code-ops.md:154`
