# SPEC-draft-command — `/draft` and the CanonicalDraft it produces

**Status:** v2, amended 2026-08-21 (kogaki#600) — the record half's cite form
moves from positional (`file:line@sha`) to identity + pin; v1 authored
2026-08-21 (kogaki#573).
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

`specs/spec-draft-pipeline/SPEC.md::Draft creation driven by questions in a UI — and item 4 — the CanonicalDraft`

Sections for a second command would sit under a `Governs:` line that does not
cover them. The cost of the alternative is stated rather than waved away: this
is one more file a reader of the pipeline must learn to consult, and it is
paid because `/draft` is a **peer** of `/brief` rather than a stage inside it.

**Two enumerations use the same small integers, and this spec never conflates
them.** kogaki#127's **inheritance whitelist** is a component whitelist for the
draft pipeline; the **port manifest** (`specs/SPEC.md` §5) is the repository's
own. Whitelist items 3 and 4 are what `/draft` realizes; port manifest items 3
and 4 are the proposal contract and the gate carrier, which it does not.
The two are separately addressable and are cited separately: the port manifest is
`specs/SPEC.md` §5, and the whitelist is kogaki#127's, recorded at
`specs/spec-draft-pipeline/SPEC.md::is this section's own is named there and nowhere else — the artifact` and enumerated at `:290-295`.

**The first cut of this clause attributed the distinction to `specs/SPEC.md::terms ("nothing here may be read as a general WA inheritance — not for`,
and those lines do not carry it.** §4.5.3 there distinguishes the whitelist from
**§4.5's declared design baseline**, not from the port manifest — a true and
adjacent distinction whose reasoning this clause borrowed and re-pointed at a
different pair. Citation integrity is this repository's own guarantee (§3), so the
attribution is withdrawn rather than repaired in place, and the two enumerations
are cited at their own homes above. Every reference below names which it means.

## 0. The declared design baseline

`specs/SPEC.md` §4.5.1 clause 1 requires a baseline to be declared in the spec
that owns its subject, and clause 2 makes **no inherited baseline** the default
where nothing is declared. This spec inherits and then diverges, so the
declaration is owed here and is made here rather than recovered later from
resemblance.

**The baseline is kogaki#127's inheritance whitelist, items 3 and 4 — and
nothing else.** Item 3 is Draft creation driven by questions in a UI; item 4 is
the CanonicalDraft and Variant concepts. The scope limit is part of this clause
rather than a footnote: **no general `writing-assistant` inheritance is admitted
for `/draft`**, and a clause below that resembles that tool's design is fresh
unless this section named it.

**One divergence, declared at the clause that makes it.** §3 honours item 3 in
its **ratified reduced form** — the free-form owner channel exists, no interview
is mandated — per the 2026-08-04 generator reduction. That is a departure from
the item as its title reads, and §4.5.1 clause 3 puts the declaration in the
amendment that creates it, which is this one.

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/articles.md:61`

Item 4's Variant half is **not** inherited by this spec: `/variant` is out of
scope at §7 and gets its own carrier, so its baseline is declared there and not
here.

## 1. The name is reserved, and the reservation precedes the collision

**Draft names exactly two things: the `/draft` command, and the CanonicalDraft
that command produces.** No workflow block, no intermediate artifact, and no
record class may bear the name.

**That is a NARROWING of kogaki#573's "nothing else may bear the name", and it is
narrowed deliberately.** `specs/spec-draft-pipeline/SPEC.md` and the phrase "the
draft pipeline" already bear it and are none of the three kinds named — a
reservation is exactly the clause where a reader must be able to tell a
deliberate narrowing from an omission, so the narrowing is stated rather than
performed silently.

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

**Schema — the record half.** **The CanonicalDraft is repo-visible, under a fixed
human name derived from the Brief it realizes, one per Brief, overwritten on
re-run.** Machine identity — run ids, digests, per-block snapshots — stays in the
machine-local run workspace. This is decided here rather than left to the
implementation, because the served ruling decides it:

> "the owner-visible tree holds exactly ONE owner rendering per surface, under a
> fixed HUMAN name, overwritten per pull; identity, idempotence and coexistence
> live in the machine record in the run workspace"

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/claude-code-ops.md:12`

and its companion reads the same fork from the other side — "run-workspace state
is machine state, and anything a human must act on crosses into the human's
surface explicitly" (`topics/archive/articles.md:53`). A CanonicalDraft is the
thing the owner reads and reviews, so it crosses. **An identity-digest filename
would defeat the ruling that placed it there**, which is why the name is
Brief-derived and human.

The CanonicalDraft is one durable file whose
frontmatter carries the Brief it realizes (path and pin), the survey pin, and
an immutable `generated_by` birth record written at creation. **Cites address
the served manifest record by identity, never by position** (v2, kogaki#600):
the resolvable form is `gloss/ELEMENTS.jsonl slug=<slug> kind=<lesson|journey>
@<sha>` — the (slug, kind) pair is the join key, resolved against the served
survey at its current HEAD, and the `@<sha>` substrate pin is **provenance**,
never the resolution target. Content drift behind a resolving identity remains
the quote check's to catch, unchanged. The prior form,
`gloss/ELEMENTS.jsonl:<line>@<sha>`, is retired as a scheduled defect: the hub
regenerates the manifest wholesale at every distill close, so every positional
cite broke at the first close after authoring (all 7 cites of the first
dogfooded Draft, kogaki#600, while every cited identity survived), and the
served position rules the class directly — identity anchors survived every
observed relocation, 1,127 to 148 against positional cites
(`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32
topics/knowledge-architecture.md:126,137`; the constrain-shaped remedy per
`LESSONS.md:81` at the same pin: the emitter can no longer produce a
line-number address, rather than a repair pass re-pointing what it produced).
A positional cite is **malformed** to the resolve check, which names the
identity form as the migration in its refusal. A **per-Step trace** — which sections realize
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

`specs/SPEC.md::scope is the author's judgment and is attributed as such (scope travels with`

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
- **It creates no Move and mandates none.** A missing Move degrades a Draft and
  never blocks one (`specs/spec-draft-pipeline/SPEC.md` §7.5), so nothing here
  reaches the Move substrate.
- **It adds no second style artifact.** Register is
  `specs/spec-style-contract/SPEC.md` §4's, consumed at generation, and this spec
  neither restates nor supplements it.
- **It does not amend `specs/spec-draft-pipeline/SPEC.md`.** That spec's §2
  records whitelist items 3 and 4 as owed; this spec discharges the design half
  of both, and the amendment recording that is that spec's own act on its own
  head, not this one's.

**deferred slots minted by this spec: none**, and that claim is now true of the
artifact's home as well. The first cut asserted it while leaving the durable home
unstated — the unnamed-deferral shape, under a sentence saying nothing was left to
the implementation, which story 1.80 would then have settled by default. §5
decides it.

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 LESSONS.md:97, topics/claude-code-ops.md:12,21`
