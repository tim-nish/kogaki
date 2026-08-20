# SPEC-draft-command — `/draft` and the CanonicalDraft it produces

**Status:** v1, authored 2026-08-21 (kogaki#573).
**Governs:** the third owner-invoked command of the article pipeline, and the
one artifact it creates. It discharges the **design** half of kogaki#573 and
decomposes that issue's implementation licence into stories; it implements
nothing itself.

**Why a spec of its own rather than sections in `specs/spec-draft-pipeline/SPEC.md`.**
That spec's own admission record governs port manifest item 2, "the Brief and
its four gates", and its §2 records that the whitelist members `/draft`
realizes are **owed** rather than covered:

> "Item 3 — Draft creation driven by questions in a UI — and item 4 — the
> CanonicalDraft and Variant concepts — are **neither bound nor excluded by
> v1**: this spec stops at the Brief's structure, and both live downstream of
> it."

`specs/spec-draft-pipeline/SPEC.md:290-295`

Sections for a second command would sit under a `Governs:` line that does not
cover them. The cost of the alternative is stated rather than waved away: this
is one more file a reader of the pipeline must learn to consult, and it is
paid because `/draft` is a **peer** of `/brief` rather than a stage inside it.

**Two enumerations use the same small integers, and this spec never conflates
them.** kogaki#127's **inheritance whitelist** is a component whitelist for the
draft pipeline; the **port manifest** (`specs/SPEC.md` §5) is the repository's
own. Whitelist items 3 and 4 are what `/draft` realizes; port manifest items 3
and 4 are the proposal contract and the gate carrier, which it does not.
`specs/SPEC.md:4713-4717` states the distinction, and a reader who collapses
them narrows a general clause to one pipeline. Every reference below names
which enumeration it means.

## 1. The name is reserved, and the reservation precedes the collision

**Draft names exactly two things: the `/draft` command, and the CanonicalDraft
that command produces.** No workflow block, no intermediate artifact, and no
record class may bear the name.

This is a **reservation, not a repair**. kogaki#573 verified the collision
absent from this repository and from the served surface at filing (2026-08-20),
which is why there is nothing here to detect and nothing to migrate. The
composition-side vocabulary it protects is already ratified:

> "Reader Path names the ARTIFACT only — the ordered sequence of Steps inside
> one Candidate — and the workflow blocks formerly lumped under that name get
> fixed names: path composition → Move binding → Candidate assembly → path
> review → Candidate selection."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:40`

None of those five blocks is a Draft anything. The adopted Candidate's Reader
Path is the Brief's, `/draft` consumes it, and `/draft` never re-opens it.

**Reserving a name before it collides is cheap and reserving it after is not**
— a stable key collides at the naming event, which is where refusal belongs.

## 2. Position: the third of four owner acts

`/terrain → /brief → /draft → /variant`. **Every arrow is an owner act and
never an automatic launch**, the Terrain-boundary correction applied chain-wide.
The chain this realizes is served:

> "Brief → ONE canonical draft flow (EN, owning the claims) → a DERIVATION TREE
> downstream"

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:90`

**Review sits between `/draft` and `/variant`** and is not part of this command:
variants derive from a *reviewed* CanonicalDraft. Review is port manifest item
7 and is untouched here. `/variant` gets its own carrier when demanded.

## 3. The completion contract

**A `/draft` run ends when the CanonicalDraft exists.** There is **no default
mid-workflow stop**. The only legitimate stop before the artifact is a **named
inspection-need** — a point at which the owner must open and read an external
file or surface before the next gate can be answered honestly, named as such
when it is taken.

**A human gate is not a stop.** The flow raises it and continues on the answer.
This is the rule `/brief` already carries at `specs/spec-draft-pipeline/SPEC.md`
§5.3 v19 (kogaki#522), and it is stated here **by construction rather than by
analogy**: the check shape lands with the implementation, in this spec's own
terms, so `/draft` does not inherit a clause written for a different flow.

**The ideal path asks zero questions**, and that is the served position rather
than an aspiration:

> "brief in, article out, zero additional questions; the review gate stays
> findings-only"

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:110`

Whitelist item 3 — question-driven creation — is honoured in its **ratified
reduced form**: the free-form owner channel exists and no interview is mandated
(the 2026-08-04 generator reduction, `topics/articles.md:61`). Every `/draft`
run is brief-carrying, so the reduction always applies. The item is discharged
in the form it was ratified in, not in the form its title suggests.

## 4. The closed reference set

**The reachable material is the Brief's own text plus the settled Strands'
served renderings at the survey pin. Nothing else.** No Strand fetch, no
repository harvest.

This is the Brief's closed-set invariant reaching one command further, and the
reason is the one `specs/spec-draft-pipeline/SPEC.md` §5.3 already gives:
growing the set is an owner act that routes back through Terrain. A `/draft`
run that fetched one more Strand would look exactly like one that was given it.

## 5. The three-layer boundary

The layers are named so a defect lands on one of them rather than on "the
draft".

**Harness — mechanical, runtime-owned.** Resolve the adopted Brief and refuse
one whose composition fields are unfilled, because a template is not an input.
Establish the closed set of §4. Iterate the Reader Path's Steps in order.
Keep per-block snapshots machine-local in the run workspace — **no per-block
commit and no tracked diff artifact**, the kogaki#523 constraint. Run the
citation resolve check. Drive to completion under §3.

**Schema — the record half.** The CanonicalDraft is one durable file whose
frontmatter carries the Brief it realizes (path and pin), the survey pin, and
an immutable `generated_by` birth record written at creation. Cites are in
resolvable `file:line@sha` form. A **per-Step trace** — which sections realize
which `step_id` — is machine-readable record, persisted because review's
fidelity dimension reads it: persist what the review rule reads. **The trace
never renders as visible structure in the article body.**

**LLM — judgment, contract-bound, unharnessed.** The prose: realizing each
Step's declared `reader_state_before → reader_state_after` transition, written
from that Step's stated grounds. Register per `specs/spec-style-contract/SPEC.md`
§4. A claim widened beyond its quoted scope is the author's judgment and is
attributed as such.

**The surface is prose.** `specs/spec-draft-pipeline/SPEC.md` §5.1.3 binds here
unchanged: a schema may exist internally, and every owner- and reader-facing
rendering is ordinary prose.

## 6. One mechanical instrument on grounding, and no second

The **citation resolve check** over the draft's own cites is the whole of it.
The repository's guarantee split is what makes that sufficient rather than
thin:

> "Kogaki guarantees citation integrity — a quoted claim was quoted, and its
> pin resolves. Gukan guarantees the facts. … There is no Fact unit, no fact
> floor, and no provenance map — the citation resolve check over the draft's
> own cites is the sole mechanical instrument on grounding."

`specs/SPEC.md:424-430`

**No content conformance is checked mechanically beyond it.** When a Draft
comes out strange the first suspect is recorded and is not this command: every
Step field is LLM-authored with no harness, stated at `brief/path-review-agent.md`
(kogaki#549). A defect in the prose is a defect in the Step it realized, or in
the judgment realizing it, and neither is reachable by a check over cites.

## 7. What this spec does NOT do

- **It registers no check and no gate.** The citation resolve check is admitted
  by the story that builds it, through the registry's own admission record with
  a removal signal, not by this spec asserting one exists.
- **It does not implement.** kogaki#573's licence is decomposed into stories,
  each with its own issue, and this spec is the contract they are written
  against.
- **It does not touch review** (port manifest item 7) and **does not cover
  `/variant`**, which gets its own carrier when demanded.
- **It does not amend `specs/spec-draft-pipeline/SPEC.md`.** That spec's §2
  records whitelist items 3 and 4 as owed; this spec discharges the design half
  of both, and the amendment recording that is that spec's own act on its own
  head, not this one's.

**deferred slots minted by this spec: none.** Every fork kogaki#573 raised is
decided above or is explicitly out of scope; nothing is left to the
implementation.
