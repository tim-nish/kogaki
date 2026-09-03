# SPEC-draft-command — `/draft` and the CanonicalDraft it produces

**Status:** v3, re-cut 2026-09-03 (kogaki#784) under kogaki#743's four criteria.
No clause is amended by the re-cut. **Governs** the third owner-invoked command
of the article pipeline and the one artifact it creates; it implements nothing.

## What this file is for, and what it is not

No runtime reads this file. `/draft`'s behaviour is carried by `src/draft.mjs`,
`src/packet-template.md`, `src/cite-check.mjs` and the registered checks, and
where one of those decides a question this file points at it.

**Every section carries a `necessity:` line** — the one reason it cannot live in
a machine carrier. History lives in git and on the issues.

`necessity:` the reading instruction for everything below. A reader who does not
know the runtime ignores this file will look here for behaviour and find prose
that no longer matches, which is the failure the re-cut removes.

**Why a spec of its own.** `specs/spec-draft-pipeline/SPEC.md` governs port
manifest item 2 and stops at the Brief's structure; the whitelist members
`/draft` realizes are recorded there as owed rather than covered
(`specs/spec-draft-pipeline/SPEC.md::Items 3 and 4 are neither bound nor excluded here`).
Sections for a second command would sit under a `Governs:` line that does not
cover them. **The cost is stated rather than waved away**: one more file a
reader of the pipeline must learn to consult, paid because `/draft` is a **peer**
of `/brief` rather than a stage inside it.

**Two enumerations use the same small integers, and this spec never conflates
them.** kogaki#127's **inheritance whitelist** is a component whitelist for the
draft pipeline; the **port manifest** (`specs/SPEC.md` §5) is the repository's
own. Whitelist items 3 and 4 are what `/draft` realizes; port manifest items 3
and 4 are the proposal contract and the gate carrier, which it does not. Each is
cited at its own home:
`specs/spec-draft-pipeline/SPEC.md::The owner's inheritance whitelist for this pipeline is exactly four items`.

## 0. The declared design baseline

`specs/SPEC.md` §4.5.1 requires a baseline to be declared in the spec that owns
its subject, and makes **no inherited baseline** the default where nothing is
declared. This spec inherits and then diverges, so the declaration is **owed
here** rather than optional, and a divergence is declared in the amendment that
creates it.

**The baseline is kogaki#127's inheritance whitelist, items 3 and 4 — and
nothing else.** Item 3 is Draft creation driven by questions in a UI; item 4 is
the CanonicalDraft and Variant concepts. **The scope limit is part of this
clause rather than a footnote: no general `writing-assistant` inheritance is
admitted for `/draft`**, and a clause below that resembles that tool's design is
fresh unless this section named it.

**One divergence, declared at the clause that makes it.** §3 honours item 3 in
its **ratified reduced form** — the free-form owner channel exists, no interview
is mandated.
`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/articles.md:61`

Item 4's Variant half is **not** inherited here: `/variant` is out of scope at
§7 and gets its own carrier, so its baseline is declared there.

`necessity:` a declared baseline plus its scope limit. Nothing in the code says
which design a clause was inherited from, and the default where nothing is
declared is *no* inherited baseline — so an undeclared inheritance reads as
authorship.

## 1. The name is reserved, and the reservation precedes the collision

**Draft names exactly two things: the `/draft` command, and the CanonicalDraft
that command produces.** No workflow block, no intermediate artifact and no
record class may bear the name.

**This is a NARROWING of kogaki#573's "nothing else may bear the name", stated
rather than performed silently.** `specs/spec-draft-pipeline/SPEC.md` and the
phrase "the draft pipeline" already bear it and are none of the three kinds
named — a reservation is exactly the clause where a reader must be able to tell
a deliberate narrowing from an omission.

**A reservation, not a repair.** The collision was verified absent from this
repository and from the served surface at filing, so there is nothing to detect
and nothing to migrate. None of the five composition blocks is a Draft
anything: the adopted Candidate's Reader Path is the Brief's, `/draft` consumes
it, and `/draft` never re-opens it.
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:40`

**Reserving a name before it collides is cheap and reserving it after is not** —
a stable key collides at the naming event, which is where refusal belongs.

`necessity:` a prohibition on naming. Its violation is a word appearing
somewhere, and the narrowing that makes it honest is a judgment about which
existing uses are exempt.

## 2. Position: the third of four owner acts

`/terrain → /brief → /draft → /variant`. **Every arrow is an owner act and never
an automatic launch.**
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:90`

**Review sits between `/draft` and `/variant`** and is not part of this command:
variants derive from a *reviewed* CanonicalDraft.

`necessity:` a chain whose arrows are prohibitions on automation. No carrier
holds the absence of an automatic launch, and each arrow is one.

## 3. The completion contract

**A `/draft` run ends when the CanonicalDraft exists.** There is **no default
mid-workflow stop.** The only legitimate stop before the artifact is a **named
inspection-need** — a point at which the owner must open and read an external
file or surface before the next gate can be answered honestly, named as such
when it is taken.

**A human gate is not a stop.** The flow raises it and continues on the answer.
`/brief` carries the same rule, and it is stated here **by construction rather
than by analogy**: `/draft` does not inherit a clause written for a different
flow.

**The ideal path asks zero questions**, and whitelist item 3 is honoured in its
ratified reduced form — the free-form owner channel exists, no interview is
mandated. Every `/draft` run is brief-carrying, so the reduction always applies.
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:110`

`necessity:` a completion condition and a prohibition on stopping. A run that
stops early produces the same artifacts as one that has not finished, so the
difference is not observable in the tree.

## 4. The closed reference set

**The reachable material is the Brief's own text plus the settled Strands'
served renderings at the survey pin. Nothing else.** No Strand fetch, no
repository harvest.

Growing the set is an owner act that routes back through Terrain. **A `/draft`
run that fetched one more Strand would look exactly like one that was given
it** — which is why this is a rule rather than a check.

`necessity:` a boundary on reading. The output of a conforming run and a
violating one are indistinguishable, so nothing downstream can recover it.

## 5. The three-layer boundary

The layers are named so a defect lands on one of them rather than on "the
draft".

**Harness — mechanical, runtime-owned.** Resolve the adopted Brief and refuse
one whose composition fields are unfilled, because a template is not an input.
Establish the closed set of §4. Iterate the Reader Path's Steps in order. Keep
per-block snapshots machine-local in the run workspace — **no per-block commit
and no tracked diff artifact**. Run the citation resolve check. Drive to
completion under §3.

**Schema — the record half.** **The CanonicalDraft is repo-visible, under a
fixed human name derived from the Brief it realizes, one per Brief, overwritten
on re-run.** Machine identity — run ids, digests, per-block snapshots — stays in
the run workspace. A CanonicalDraft is the thing the owner reads and reviews, so
it crosses onto the human's surface; **an identity-digest filename would defeat
the ruling that placed it there.**
`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/claude-code-ops.md:12`
`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/archive/articles.md:53`

Its frontmatter carries the Brief it realizes (path and pin), the survey pin,
and an immutable `generated_by` birth record written at creation.

**Cites address the served manifest record by IDENTITY, never by position.**
The resolvable form is `gloss/ELEMENTS.jsonl slug=<slug> kind=<lesson|journey>
@<sha>`: the (slug, kind) pair is the join key, resolved against the served
survey at its current HEAD, and the `@<sha>` substrate pin is **provenance,
never the resolution target**. A positional cite is **malformed** to the resolve
check, which names the identity form as the migration in its refusal. Content
drift behind a resolving identity remains the quote check's to catch.
`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 topics/knowledge-architecture.md:126`

A **per-Step trace** — which prose block realizes which `step_id`, **and which
Section that Step belongs to** — is machine-readable record, persisted because
review's fidelity dimension reads it. **The trace never renders as visible
structure in the article body.**

**THE SECTION HALF IS kogaki#823's, and the word was corrected in the same act.**
This sentence read "which sections realize which `step_id`", using *Section* for
the per-Step unit — a site of the collision `specs/spec-draft-pipeline/SPEC.md`
§4.15 creates and one that neither kogaki#825's site table nor
`specs/spec-brief-draft-design/DESIGN.md` enumerated. A Step is one unit of
realization; a **Section** is a grouping of Steps declared on `opens_section`
(§4.15). The trace maps **each Step to exactly one Section**, which is what lets
a reviewer check the grouping the Brief declared against the article that was
produced from it.

**VISIBLE STRUCTURE IS THE SECTION'S, NEVER THE STEP'S.** `emit` writes one
`## <title>` per Section, at its opening Step, and **no heading inside a
Section** — so the count of body headings equals the count of Sections and is
strictly less than the count of Steps in any Brief that groups at all. This is
the rendering half of §4.15 and does not weaken the refusal above: a Section
heading is a **title the Brief declared**, never a step id, so a heading that is
a bare step id stays refused exactly as it is today.

**NORMATIVE AND UNBUILT AT THE HEAD THAT RECORDS THIS.** At this head
`src/draft.mjs emit` renders one heading per Step and the trace carries no
Section. Carrier: **kogaki#823**.

**LLM — judgment, contract-bound, unharnessed.** The prose: realizing each
Step's declared `reader_state_before → reader_state_after` transition, written
from that Step's stated grounds. Register per `src/packet-template.md`, grounded
at `specs/spec-brief-draft-design/DESIGN.md` §4. **A claim widened beyond its
quoted scope is the author's judgment and is attributed as such.**

**The surface is prose.** `specs/spec-draft-pipeline/SPEC.md` §5.1.3 binds here
unchanged.

`necessity:` a three-way split of responsibility. The runtime enforces the
harness half and validates the record half; **which layer a defect belongs to is
the thing this section exists to decide**, and no artifact carries that.

## 6. One mechanical instrument on grounding, and no second

The **citation resolve check** over the draft's own cites is the whole of it, and
the repository's guarantee split is what makes that sufficient rather than thin:
`specs/SPEC.md::Kogaki guarantees citation integrity`.

**No content conformance is checked mechanically beyond it.** Every Step field
is LLM-authored with no harness (`src/path-review-agent.md`). A defect in the
prose is a defect in the Step it realized, or in the judgment realizing it, and
neither is reachable by a check over cites.

`necessity:` a statement of what is NOT mechanized and why one instrument
suffices. A second instrument is what a later sitting proposes, and the reason
against it is an argument rather than a configuration.

## 7. What this spec does NOT do

- **It registers no check and no gate.** The citation resolve check is admitted
  by the story that builds it, through the registry's own admission record with
  a removal signal.
- **It does not implement.** kogaki#573's licence is decomposed into stories;
  this spec is the contract they are written against.
- **It does not touch review** (port manifest item 7) and **does not cover
  `/variant`**, which gets its own carrier when demanded.
- **It creates no Move and mandates none.**
- **It adds no second style artifact.** Register is **operational text in
  `src/packet-template.md`**, which the model reads at generation; its ground is
  `specs/spec-brief-draft-design/DESIGN.md` §4. This spec neither restates nor
  supplements either.
- **It does not amend `specs/spec-draft-pipeline/SPEC.md`.**

**deferred slots minted by this spec: none.**
`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 LESSONS.md:97`

`necessity:` an enumeration of what was decided against, plus a live
absence-declaration. Absence of code is not evidence of a decision, and each of
these has been proposed or assumed at least once; "no deferred slots" is a claim
a reader cannot recover from anything else in the tree — an unnamed deferral is
the defect, so the declaration that there is none has to be made rather than
inferred.
