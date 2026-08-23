# SPEC-proposal-contract — the owner-facing proposal contract

**Status:** v1, authored 2026-08-05 (kogaki#15, umbrella kogaki#14).
**Governs:** port manifest item 3 (`specs/SPEC.md` §5).

The manifest carries this subsystem's contract inline, as its admission
record:

> "3. **The owner-facing proposal contract** (Where/Why/effect-stating
> labels; machine-proposed options plus free text; payload capture)."

`specs/SPEC.md:4774-4775`

Ported **with** its contract, ahead of Terrain, because admitting a subsystem
without its contract is the manifest's own named failure mode
(`specs/SPEC.md:113-121`). This spec is authored consumer-side, in the same
shape and on the same ground as `specs/spec-terrain/SPEC.md:6-15`.

## 1. What this contract binds

A **record**, not a rendering. This port delivers the contract made
checkable — the shape a proposal must have and the shape its recorded answer
must have — and deliberately delivers no rendering engine. The gate's
*medium* binding (a gate renders through the selector affordance, never
prose) is manifest item 4's, ported by kogaki#16, and is not restated here.

Its first consumer is Terrain: `specs/spec-terrain/SPEC.md:76-86` types
`rank`, `trim`, and `hide` as proposals that route to this contract, and
`enumerate`, `sort`, `filter-by-owner` as navigation that does not.

## 2. The record

The machine-readable carrier is `specs/spec-proposal-contract/record-schema.json`.
It is the single carrier: `checks/check-proposal-contract.sh` reads its field
lists rather than re-stating them, so a change to the contract is a change to
one file. A record is a **proposal** or a **report**; there is no third kind.

### 2.1 A proposal carries Where and Why

`where` — the material the narrowing applies to. `why` — the machine's
premise, rendered. Rendering the premise is not decoration: a computed
premise that stays implicit is the failure the served surface records
directly.

> "**A gate whose options are generated from a computed premise must render
> the premise and offer its negation.** [[gate-input-surface-is-part-of-the-contract]]
> was satisfied in *form* — machine-proposed options plus a free-form
> override — and the gate still failed, because all three structured options
> shared the machine's fallible \"these conflict\" premise and the free-form
> escape is the option a hurried owner skips."

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/archive/knowledge-architecture.md:73`

So the option set carries the premise's negation as a **first-class
option** — the "no narrowing; the full candidate set stands" outcome, flagged
`negates_premise` — and the free-text channel does not discharge it. This is
the ported contract's one served amendment, taken at authoring rather than
left for a later miss.

### 2.2 The label states an effect

A proposal's `label` states what happens if the proposal is taken. A bare act
token (`trim`), an option index (`Option A`, `1`), or a restatement of an
option's own label is not effect-stating.

**Which layer carries this is decided here, and the split is stated in the
check's own output rather than left silent.** The mechanical half carries a
**necessary-condition floor** — the label exists, is not a bare act token or
option index, is not identical to an option label, and is more than one word.
The **sufficiency** half — whether the stated effect is the effect that will
actually occur, and whether it is in plain register — is a judgment and
belongs to the review lane (kogaki#13, story 1.5), on the served split:

> "[[authenticate-facts-mechanically-gate-judgments]] — otherwise the remedy
> for too many enumerated gates is a new enumerated gate"

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:46`

and on the register half's own siting:

> "the register test is a JUDGMENT, so per the same lesson's
> where-it-must-live half it belongs once at composition, never per display"

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/articles.md:104`

A floor that passes is therefore **not** a claim that the label is
effect-stating. The check says so in the run it says it in, because an
unstated omission reads as coverage.

### 2.3 Machine-proposed options plus free text, unconditionally

Every proposal carries at least one machine-proposed option **and** a
free-text override channel. The override is the owner's authority; it is not
a fallback for inadequate options and carries no condition of any kind. A
record whose free-text channel is gated (`when`, `if`, `condition`,
`unless`, `only_if`) fails, and the gating key is named in the failure.

> "consumer human gates are presented ONLY through an elicitation surface
> offering machine-proposed selectable options plus a free-form response
> field (approve/modify/replace/skip); requiring the owner to answer a raw
> machine artifact … directly is a contract violation"

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/archive/knowledge-architecture.md:213`

### 2.4 Payload capture

A recorded answer carries the **payload** — the options that were offered and
the fact that free text was offered — beside the answer itself. An answer
recorded alone cannot be re-judged: nothing later can tell whether the owner
chose from an adequate set or from a bad one. The payload's
`options_offered` must be exactly the ids the record offered; a payload that
disagrees with its own record is a violation, not a rounding.

### 2.5 The non-member fallback

An act in neither `specs/spec-terrain/SPEC.md:80-81` list is a **report**: it
carries its reason and takes no narrowing action (`narrows: false`). It is
never silently classified into either list. A navigation act presented as a
proposal is a violation from the other direction — the second-proposer line
is an enumeration with both sides named, and the fallback is refusal to
guess.

## 3. Where records live

Any file named `*.proposal.json` anywhere in the repository is a record and
is bound by this contract — a default carrier rather than an enumerated
directory, because an enumerated home makes record N+1 uncovered by default.
The check reports the count it found, rendering zero explicitly.

The fixtures under `checks/fixtures/proposal-contract/` are the check's
discrimination evidence: each non-conforming fixture declares the violation
code it must produce, so the check is tested for its ability to *fail*, not
only to pass.

## 4. Out of scope, by decision

Rendering (medium binding, gate registry, `AskUserQuestion` evidence) — those
are manifest item 4, kogaki#16, and building them here would be item 3
committing item 4's version of the refused alternative. Also out: any
narrowing algorithm. This contract binds how a narrowing is *presented and
recorded*, never how it is computed.

## 5. Open — carried as questions, never as contract

- **One implementation.** This contract is specced with Terrain as its only
  consumer, which the served surface names as a hazard
  (`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:20`).
  Accepted at the 2026-08-05 gate as the counter-argument to folding a
  minimal form into Terrain. A second consumer's arrival is the
  **evaluation** of this shape, not new work.
- **Whether the ranked-recommendation half is owed here.** The served gate
  lesson also asks a gate to carry "the machine's own comparison (a ranked
  recommendation, per-option evidence, and the evidence that would overturn
  it)" (`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 LESSONS.md:99`).
  Whether that is item 3's or item 4's is not decided by this spec and is
  not asserted either way.
