---
id: reg-0199
status: pending
observed_at_pr: 756
observed_at_head: 51b440e
class: in-diff
recorded: 2026-09-02
source_comment:
---
in-diff: PR #756 round 2 — three carriers this PR authored claim there is **no
command path** on which the neighborhood judgment layer has not run and a
section still renders. On the `report` command that claim is false.

`cmdReport` carries two of J3's three refusals: the record-ABSENT refusal
(guarded on `!args.neighborhood`) and the ORPHAN refusal (a judgment key naming
no mechanical candidate). The COVERAGE refusal — *N mechanical candidate(s)
carry no judgment* — lives only in the `run` executor's `J3_neighborhood`
state. So `terrain report --neighborhood <partial.json>` reaches
`neighborhoodScreen` with `unjudged > 0` and emits the per-candidate unjudged
line; a `{}` record takes the all-unjudged arm the same way.

The three carriers that overstate it, all written in this PR:

- `specs/spec-terrain/SPEC.md` §13.4 — "There is no COMMAND path on which the
  judgment layer has not run and a section renders";
- `specs/spec-terrain/report-format.json`, the `neighborhood_unjudged`
  governing note — "so no command path emits this line";
- `terrain/terrain.mjs`'s renderer comment — "`cmdReport` refuses a non-empty
  enumeration carrying no record, so no command path reaches them".

**Nothing breaks.** The classes are declared and the arms name the state
honestly, which is what the defensive framing buys. What is wrong is the
strength of the claim: kogaki#754 licenses `full_report` refusing an unjudged
neighborhood, and the partial-record half of that refusal is unbuilt while
three sentences say it is done.

Either repair is available and neither is chosen here: give `cmdReport` the
same `uncovered` refusal the executor applies — it already mirrors the orphan
direction — or narrow the three sentences to say the property holds on the
`run` path.

**Why this is here rather than on an issue or a successor.** The two-round
bound was spent when it was found. **Reachability, stated as the claim §4
clause 8 asks for: REACHABLE** — a `report` invocation with a partial judgment
file fires it, and no check covers that input today. It is recorded rather than
filed because the defect is a claim's strength rather than a behaviour, and the
same sitting that widens the claim or the code will meet this record; a third
occurrence of the class **a refusal built in one of two callers is described as
built in both** is the trip condition for filing.
