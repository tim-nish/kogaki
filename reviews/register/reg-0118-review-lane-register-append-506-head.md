---
id: reg-0118
status: pending
observed_at_pr: 506
observed_at_head: 3bb9421
class:
recorded: 2026-08-18
source_comment: 5324668161
---
Review-lane register append — PR #506 (head `3bb9421`), round 1.

Three findings take `carried: register` under kogaki#433: **auto-merge is armed on this PR**
(`autoMergeRequest` non-null, enabled 2026-08-18T06:48:01Z), so although the round counter still
shows a round remaining, the change lands the moment checks go green and nothing routed to a later
round will be read there. "Resolved in the review" is therefore unavailable, and these are latent
in-diff findings rather than reachable ones.

**Row class: instance-class** (kogaki#374) for all three below — their value is the defect each
names, not a count. None of them is an `out-of-dimension:` observation, so **none counts toward
rule 3's three-of-a-class widening trigger.**

---

**1. instance-class — `journeyBearingStrands()` treats a Strand with NO served journey cite as
Journey-bearing.** `brief/compose.mjs` reads the closed set's Journey-bearing members with
`/^- journey cite:/m` over each `### L<n>` section. `brief/brief.mjs:116-121` renders that line
whenever `s.journey` is truthy, falling back to `` `none recorded` `` when `s.journey.cite` is
nullish — a state `terrain/terrain.mjs:1727` already counts as an abnormality (`c.journey && !jg`)
and that `??` fallback exists to render. For such a Strand the diff's own §4.4 carries-none refusal
does not fire, so a composer may place `L<n>.journey` for a Strand whose served record carries no
Journey cite — the unsupported completion the refusal is named for — and `journey_coverage`'s
denominator counts a Journey that was never served. Remedy is one predicate: exclude the
`none recorded` rendering, or read the cite value rather than the line's presence.

**2. instance-class — `checks/registry.json` `efficacy_note` for `brief-compose` is stale against
the pass line the same commit rewrote.** The diff re-points `efficacy` to
`stories 1.73 + 1.75 + kogaki#501` and leaves the sibling note reading *"six mutations performed and
restored surgically … the pass line names all six so the evidence is read from the output"* while
the pass line now names **ten**. The note's own claim about its artifact is false. The sibling entry
at the same level (`brief-mint`) keeps its note current — *"the pass line names all nine"* — so this
is a drift against the file's own convention, not an absent one. `registry-conformance` passes
because it resolves the `efficacy` **case label**, never the note.

**3. instance-class — SPEC-draft-pipeline §6 enumerates five Candidate evidence items; the runtime
now carries six.** The spec's evidence rule (`specs/spec-draft-pipeline/SPEC.md:991-993`) lists
*"step validity, transition continuity, Thesis closure, the obligations ledger's state, and the
Strand placement count."* `brief/assemble.mjs` now rides `journey_coverage` alongside them. §6.1
licenses the surfacing (*"surfaced to the owner as reasoning on the Candidate per §6's evidence
rule"*), so the addition is authorized; the enumeration is what did not move with it.
