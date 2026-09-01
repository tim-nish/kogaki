---
id: reg-0203
status: pending
observed_at_pr: 758
observed_at_head: 0166384
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #758 round 2 — `specs/spec-terrain/report-format.json` was changed
materially and its own `version` field did not move. The diff adds a top-level
`limits` block, rewrites two `line_classes` forms with `superseded` clauses,
deletes the `catch_all_share` rule and moves a rule between `decidable_rules`
sections; line 2 still reads `"version": 14` and `licensed_by` still names
kogaki#685 rather than kogaki#738.

**Nothing consumes the field today**, which is why this is not a defect with a
victim yet. The runtime reads `limits`, `tokens`, `surfaces` and
`decidable_rules` and never the version; no check compares it against anything.
That is exactly what makes it worth recording rather than fixing in passing: a
field that nothing reads and nobody bumps is indistinguishable from one that is
current, and the first consumer to trust it will be trusting a number frozen
several amendments ago.

**Why this is here rather than on an issue.** The discharging act is a
DECISION, not an edit: either the field gets an observer — a check that fails
when the file changes without it, or a consumer that reads it — or it is
retired, because a version nobody maintains is worse than no version. Bumping it
in this PR would have been the third option, keeping the field alive by hand,
which is the remembering-to-act shape the check-admission discipline rules
against. **Reachability: NOT reachable today** — no code path reads it — and it
becomes reachable the moment any consumer does.
