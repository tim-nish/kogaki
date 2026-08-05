# SPEC-terrain — the survey/selection surface

**Status:** v1, authored 2026-08-05 (kogaki#14).
**Governs:** port manifest item 1 (`specs/SPEC.md` §5).

Authored **here**, in the consumer, never ported as hub text:

> "Terrain is a consumer product and its design spec is consumer-side"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:23`

That line is the 2026-08-04 boundary correction, and it is recorded here
because the misdiagnosis it corrects is declared likely to recur: the
proposal it overturned conflated "hub-ratified vocabulary needs a hub
carrier" (true) with "needs a hub spec" (false).

## 1. Sequencing — the decision this spec was required to make

`specs/SPEC.md` §5's ordering clause is the carrier; this section states the
decision it records. Terrain's screens present selections, so they depend on
manifest items **3** (the owner-facing proposal contract) and **4** (the gate
carrier). Both port **first, as their own PRs, with their own contracts**.

The alternative considered and refused was folding a minimal form of 3 and 4
into this port. It is refused on the served ground quoted at
`specs/SPEC.md` §5 — admitting a subsystem without its contract is the
manifest's own named failure mode. **The refusal is a boundary, not a
preference:** a Terrain implementation that grows its own proposal-rendering
or gate-payload affordance has committed the refused alternative under a
different name, and §5's clause is what it is measured against.

A third alternative was considered and not taken: cutting the port at the
navigation/proposal line and shipping a navigation-only Terrain first, which
would need neither 3 nor 4. It is admissible and was declined at the
2026-08-05 gate; it is recorded because the cut line it proposed is the same
line §2.3 below makes load-bearing, and a later sitting reopening the
sequencing should reopen it rather than re-derive it.

## 2. The inherited contracts

These three are the manifest's own, inherited unamended. This spec binds
their **application to Terrain**; it does not restate them as new invariants.

### 2.1 Completeness is a cover counted in placements

Every Strand appears in at least one section. Strands with no relation go in
an **explicit named section** rather than being dropped. Nothing is silently
dropped.

**The count runs AFTER composition**, not before. A completeness figure
computed over the candidate set rather than over the composed placements
measures the wrong thing and will read as a pass while material is missing.

**A figure names which family it counted.** The served vocabulary is three
terms — Strand (Lesson|Journey), thread-line (Decision|Position), and Thesis
— and **no umbrella over Strand and thread-line was minted, deliberately**:

> "a covering word is what let the 2026-07-28 '132 of 246 Strands' figure be
> measured over Lessons ∪ Decisions (journeys excluded) and quoted into
> decisions made under the ratified Lesson-or-Journey definition, so every
> figure must name which family it counted"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 GLOSSARY.md:248`

So every completeness figure Terrain emits states its denominator's family.
A bare count is a defect, not a terse rendering.

### 2.2 Presentation-only grouping

Sections gate nothing. A navigation step carries **no selection authority** —
moving between screens, expanding a section, or changing the grouping axis
never narrows what the owner may choose. Screen 1's axis is the **served tag
vocabulary**; grouping is a view over the candidate set, never a filter on it.

### 2.3 The second-proposer boundary

A combination becomes a **proposal** exactly when something other than the
owner narrows the candidate set.

- **Navigation** (no proposal): enumerate, sort, filter-by-owner.
- **Proposal** (routes through item 3's contract): rank, trim, hide.

This is the line §1's declined alternative would have cut the port at, which
is why it is stated as an enumeration with both sides named rather than as a
principle. **An act not in either list is a report, not a choice** — Terrain
surfaces it as unclassified with its reason and takes no narrowing action.

## 3. Inputs — served renderings only

Terrain reads through the seam, consumer `kogaki`: `element_survey`,
`gloss_index`, `glossary_entry`, `topic_thread`. All four are served today
and were verified reachable at authoring (`product-lab@924cce3`).

The repository-invisible boundary applies in full (`specs/SPEC.md` §2), and
so does the substrate-internals boundary (`specs/SPEC.md` §4's sided-evidence
clause and `policy/consultation-map.md` entry 2): Terrain reads **served
renderings**, never the state the gateway keeps to serve them.

**A resolver cites what it read, never what it was asked for.** Terrain
quotes a served rendering at the pin the seam returned, and where a served
answer's citation and content disagree the disagreement is surfaced rather
than resolved — a well-formed citation to a file that does not contain the
quoted material passes every downstream resolve check
(`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:130`).

## 4. Out of scope, by decision

Any proposal-rendering or gate-payload affordance of Terrain's own — those
are items 3 and 4, and building them here is §1's refused alternative. Also
out: probe, harvest, fact sheets, the sources gate, the provenance map/judge,
and the interview's mandated asks, all dropped by `specs/SPEC.md` §5.

## 5. Open — carried as questions, never as contract

- **The completeness figure's rendering position.** The served material
  reports a specced burial: a contract that sorts output into buckets makes
  an editorial judgment about reader priority, and the bucket names hide it
  (`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/claude-code-ops.md:15`).
  Whether the figure takes a fixed first-position line is undecided here.
- **Whether "sort" can narrow in practice.** §2.3 places sort under
  navigation. Whether a stable sort over a truncated view narrows the
  candidate set is cannot-determine — no served position was found on it, and
  it is not asserted either way.
- **Semantic subdivision within a group** was adopted upstream 2026-07-31 as
  a judged substrate one level down, under these same completeness and
  presentation-only invariants, with its offering measurement outstanding
  (`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 GLOSSARY.md:248`).
  Whether Kogaki's Terrain ports it is not decided by this spec.
