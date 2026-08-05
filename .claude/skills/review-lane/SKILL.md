---
name: review-lane
description: Run the PR gate's judgment half. Use when reviewing a pull request or a branch about to become one — reports whether the diff matches what its licensing issue authorizes, and which policy/consultation-map boundaries the diff touched and whether a receipt covers them. Findings only; the lane raises no denial of its own.
---

# Review lane — the PR gate's judgment half

The gate is split by property type (`specs/SPEC.md:56-61`). The mechanical
half runs unconditionally in CI — the registry-driven suite
(`.github/workflows/checks.yml:14`) and the deny-never-warn license
assertion (`.github/workflows/checks.yml:51`). This lane is the other half:
**does the diff match its license; consultation-map boundaries touched.**

**This lane never denies.** Every output is a finding. The deny stays on the
mechanical side, where the property is computable. A finding that names a
scope violation **re-routes the work to an issue**
(`~/.claude/tools/story-sync file-issue`) — that re-route is the remedy, not
a refusal of the PR. If you find yourself writing a list of forbidden items,
stop: an enumerated denial is the accretion shape this design exists to
refuse (`specs/SPEC.md:65-71`).

## Two dimensions, and only two

Deliberately narrow. Anything outside these two is out of scope for the
lane and goes to the widening trigger below rather than into the findings.

### 1. Diff versus license

Read the licensing issue named by the PR (title, body, or commits — the same
`#N` the mechanical half asserts is present). Then read the diff. Report:

- **In scope** — the changed paths and behaviors the issue authorizes.
- **Out of scope** — changed paths or behaviors the issue does not
  authorize. Name the file and what it does, and quote the issue's own
  wording that fails to cover it. Do not infer authorization from adjacency
  or from "it was needed."
- **Unbuilt** — what the issue authorizes that the diff does not do. Stated
  because a partially discharged license is a judgment the reviewer owes,
  not a defect the lane decides.

Out-of-scope work re-routes: file the carved-out work as its own issue and
name it in the finding. The PR is not blocked by this lane.

### 2. Consultation-map boundaries touched

For each entry in `policy/consultation-map.md`, decide from the diff whether
the branch touched that boundary — the entry's **trigger terms** are the
read, and the entry routes to a judgment rather than carrying a verdict.
Report, per touched entry: the entry, what in the diff touched it, and
whether a receipt covers it.

**Receipts come from the mechanical half's own report, and from nowhere
else.** `checks/check-consult-receipts.sh:68-73` already emits

```
consultations this branch: N (receipt-verified, over <range>)
distinct pins: <repo>@<sha>, …
```

rendering zero as `distinct pins: none — no consultation receipt on this
branch`. Run that check (or read its CI output) and quote its lines. Do not
re-derive counts from `git log`, and **never** read gateway state — no
`~/.tsurezure/`, no access log, no state directory. Kogaki reads its own
receipts and never the mediating component's private state
(`specs/SPEC.md:77-84`; `policy/consultation-map.md` entry 2, whose own
origin miss is exactly this confusion).

**State absence explicitly.** A touched boundary with no covering receipt is
reported as an uncovered boundary, named, in the same discipline the receipt
check applies to a zero count — an absent consultation generates no event,
so making the absence observable is the whole remedy. Silence is never a
pass.

Coverage is a judgment: a receipt exists on the branch, and you say whether
its pin plausibly answers the boundary the diff touched. Say so when it does
not, and say `cannot determine` when you cannot.

## Output shape

Findings only, one section per dimension, each finding carrying its evidence
(a diff path, an issue quote, or a quoted line from the receipt report).
Close with the widening-trigger line below — including when it is empty.
No verdict, no score, no approve/reject.

## The named widening trigger

A deliberately narrow instrument owes a named trigger that widens or
escalates it, and the trigger **cannot live inside the instrument** —
per-item judgment cannot observe recurrence by construction:

> "A DELIBERATELY NARROW instrument owes a NAMED TRIGGER that widens or
> escalates it, because per-item judgment structurally cannot observe
> recurrence. … the escape trigger must be a DIFFERENT-UNIT observer."
> `consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/knowledge-architecture.md:36`
>
> — quoted here in its v1 form as it was emitted. A receipt written **now**
> carries the v2 continuation lines (`request_id`, `outcome`, one `query:`
> per framing) per `specs/SPEC.md` §4; the grammar is documented in
> `.claude/skills/consult-first/SKILL.md`. Both forms parse: line one is
> unchanged, which is what keeps every receipt already in git history valid.

So the lane does not widen itself, and no sitting of this lane may add a
third dimension. Instead:

1. **Record.** Anything the lane notices that does not type into the two
   dimensions is written as one `out-of-dimension:` line in the findings —
   the observation and the PR it came from — and posted as a comment on
   **kogaki#13**, this lane's own carrier. That issue is the register; the
   lane only ever appends to it.
2. **The reading act is different-unit.** The repo's issue-triage sitting
   reads kogaki#13's register, because it spans issues while this lane spans
   one PR. A trigger bound to an artifact still owes the named recurring act
   that reads it, which is why the reading act is named here rather than
   left to the artifact's existence.
3. **Widening fires at three of a class.** Three `out-of-dimension:`
   observations of the same class on kogaki#13 widen the lane by a third
   dimension — filed as its own story through `story-sync file-issue`, never
   edited into this file during a review sitting. Three is the recurrence
   threshold the served line names ("the class visible only at
   three-in-a-row"), and one is chosen rather than left implicit so the
   trigger is falsifiable.
4. **Escalation is immediate and typed.** One observation is enough when the
   missed property is **mechanical** — it routes to the merge carrier (a
   registered check with its admission record), not here. A missed
   **judgment** property improves this file's **inputs**: which served lines
   the lane quotes at its gate. Neither path ever produces a new enumerated
   denial (`specs/SPEC.md:65-71`).

## Why this lane carries no registry entry

`checks/registry.json` governs the **mechanical** suite: registered checks
run unconditionally and their failures deny. Admitting a judgment act there
would put a human judgment behind the registry's mechanical-check contract
and give this lane a deny it must not have. The lane is a harness skill and
is invoked at review, in the same shape as `.claude/skills/consult-first/`.
