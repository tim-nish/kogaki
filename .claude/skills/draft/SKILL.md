---
name: draft
description: Realize an adopted Brief into its CanonicalDraft. Use when the owner wants the article written from a filled Brief — "draft it", "run /draft", "realize the brief for <slug>". The third owner act of the pipeline (/terrain → /brief → /draft → /variant), invoked by the owner and never launched by /brief. Runs to completion — the run ends when briefs/<slug>/draft.md exists; there is no default mid-workflow stop, and the only legitimate earlier stop is a named inspection-need. Reads only the Brief plus its pinned Strand renderings; never fetches Strands.
---

# Draft — the third owner act

A **CanonicalDraft** is the one canonical realization of an adopted Brief:
the article, written by walking the Brief's Reader Path in its recorded
order, landing as `briefs/<slug>/draft.md`. One per Brief, a fixed human
name, overwritten on re-run.

Governing spec: `specs/spec-draft-command/SPEC.md` (v1, kogaki#573); runtime:
`draft/draft.mjs`. Everything below is that contract driven through the
harness — none of it is discretion.

**THE RUNTIME IS THE PRODUCER; you compose inputs and hand over its
artifact.** Never retype, summarize, or restate the emitted document — name
`briefs/<slug>/draft.md` to the owner as the first act after the run
returns, exactly as the Brief skill hands over its minted document. A
runtime refusal is relayed as it stands, verbatim, never swallowed and never
paraphrased into something softer.

**THE RUN ENDS AT THE CANONICALDRAFT.** There is no default mid-workflow
stop. The only legitimate stop before the artifact exists is a **named
inspection-need** — a point where the owner must open and read an external
file or surface before the next gate can be answered honestly, named as such
when it is taken. **A human gate is not a stop**: the flow raises it and
continues on the answer. The runtime's `emit` enforces the mechanical half —
it refuses short of completion, naming the steps still owed.

**THE REACHABLE MATERIAL IS CLOSED.** The Brief's own text plus the settled
Strands' served renderings at the survey pin — nothing else. No Strand
fetch, no repository harvest. Growing the set is the owner's act, taken by
going back through Terrain; a foreign Strand anywhere in the run refuses by
name, and that refusal routes there.

**`/draft` IS AN OWNER ACT.** Every arrow of
`/terrain → /brief → /draft → /variant` is owner-invoked; `/brief` never
launches this and this never launches `/variant`. Review sits between
`/draft` and `/variant` and is not part of this flow.

## The flow

1. **Resolve** — `node draft/draft.mjs resolve --brief briefs/<slug>/brief.md`.
   The runtime refuses a template (an unfilled composition field, named) and
   prints the closed Strand set and the Reader Path in its recorded order.
   Relay a refusal verbatim; a Brief still awaiting composition goes back to
   the Brief flow, not into this one.
2. **Realize each Step, in the recorded order.** For each step, read its
   block in the Brief — purpose, `reader_state_before → reader_state_after`,
   grounds — and write the prose that carries the reader across exactly that
   transition, from that Step's stated grounds and nothing further. Register
   per `specs/spec-style-contract/SPEC.md` §4. A claim widened beyond its
   quoted scope is your judgment and is attributed as such. Land each
   section with
   `node draft/draft.mjs section --brief <brief> --step <id> --file <f>`.
   The runtime refuses prose naming a Strand outside the closed set and
   prose carrying step machinery as visible structure — both refusals are
   relayed, then repaired in the prose, never worked around.
3. **Emit** — `node draft/draft.mjs emit --brief <brief>`. Refuses while any
   Step lacks its section, naming what is owed; on completion it writes the
   CanonicalDraft with its record half in frontmatter.
4. **Run the citation resolve check** —
   `node draft/cite-check.mjs --draft briefs/<slug>/draft.md` — the sole
   mechanical instrument on grounding. An unreachable seam degrades to
   CANNOT-DETERMINE and is reported as such, never hidden and never treated
   as a pass.
5. **Hand over.** Name `briefs/<slug>/draft.md` first, then the check's
   outcome line. Nothing else is owed — review is a separate act, and
   variants derive from a *reviewed* CanonicalDraft, not from this run.

## What the owner sees

Every surface this skill puts in front of the owner is ordinary prose:
no internal key names, no section references, no pin blocks
(`specs/spec-draft-pipeline/SPEC.md` §5.1.3; `specs/spec-gate-carrier/SPEC.md`
§3.1). The machine record — run identity, snapshots — stays in the run
workspace under `~/.kogaki/draft-runs/<slug>/` and is not surfaced outside
debugging.

When the draft comes out strange, the first suspect is recorded and is not
this command: every Step field is LLM-authored with no harness
(`brief/path-review-agent.md`, kogaki#549). A defect in the prose is a
defect in the Step it realized or in the judgment realizing it — fix the
Brief through its own flow, or the prose here, and say which.
