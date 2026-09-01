---
id: reg-0192
status: pending
observed_at_pr: 736
observed_at_head: e7d6401
class: in-diff
recorded: 2026-09-01
source_comment:
---
in-diff: PR #736 round 2 — the round-1 fix to finding 1 left a dangling
referent it did not have before. Two sentences now sit between the citation and
the pronoun that resolves against it, at `specs/SPEC.md` §21 §"The write path":

> "…`tim-nish/claude-toolkit@6d32242… SPEC.md`, whose actor-level `PreToolUse`
> deny is the carrier. An unqualified `specs/…` path would read as local and
> resolve to nothing here. **It** governs what **authorizes a change**…"

The intended antecedent of "It" is the licence contract; the nearest noun
phrase is "An unqualified `specs/…` path", which governs nothing. The
intervening sentence is the review's own rationale for the citation form,
carried into the spec's text rather than left in the commit that made the
change. The repair is to move the citation-form justification out and put the
pronoun back beside its antecedent.

**Why this is here rather than on an issue or a successor.** The two-round
bound was spent when it was found, so §4 clause 8's reachability floor applies:
a non-gating in-diff finding at a spent bound that is latent defaults to
`carried: register`. **Reachability, stated as the claim clause 8 asks for:
NOT reachable.** There is no input, served state or mechanism under which this
fires — no check reads spec prose for referent resolution, and the defect is
observable only by a reader of the paragraph. Minting a successor PR and a
third review round for a pronoun is precisely the exit whose cost reproduces
the process.

**This record is the new write path's first exercise.** kogaki#735 landed
§"The write path" in the same PR this finding was raised against, and this
observation reaches the register by the path that PR established — one commit
on `master`, no branch, no pull request, no licensing issue. The old routing
would have made recording it cost more than the defect.
