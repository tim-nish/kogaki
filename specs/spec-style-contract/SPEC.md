# SPEC-style-contract — the style contract and plain-register commitment

**Status:** v1, authored 2026-08-13 (kogaki#426, from kogaki#127's remainder).
**Governs:** port manifest item 6 (`specs/SPEC.md` §5).

The manifest carries this subsystem's contract inline, as its admission
record:

> "6. **The style contract and plain-register commitment**, consumed at
> generation."

`specs/SPEC.md:4811-4813` — the item's opening sentence, quoted; the
remainder of the range is the carrier pointer this spec's landing added.

Authored consumer-side, in the same shape as
`specs/spec-gate-carrier/SPEC.md` and `specs/spec-proposal-contract/SPEC.md`.

**Re-authored on its own admission, never carried as a port.** kogaki#127's
inheritance whitelist admits four things and the source document —
`writing-assistant/skills/draft-article/style-contract.md` — is not among
them, so every clause below enters with a benefit named at admission. §7
records the admission register, including the three clauses that did **not**
enter and the two whose carrier does not exist here.

The served ruling this spec exists to carry:

> "**ONE versioned style contract is adopted, consumed at generation**, on the
> [[config-by-lifetime]] ground that already carried the visual identity one
> day earlier. A per-article style system is a per-RUN choice barred because
> it puts a styling decision inside every article's production loop; one owned
> contract is an ONBOARDING-lifetime fact that REMOVES a decision from that
> loop. … Its sections sort by carrier: register and structural voice are
> judgments riding the Reviewer's one dimension, lexicon coinage is already a
> mechanical lint, figures are the ratified D9–D11 ladder."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:66`
(receipt at §9.1)

## 1. What this contract binds, and what it does not

This spec binds the **protocol** — how a style contract is structured, how
each of its sections is carried, and what a generation stage does when the
contract is absent, malformed, or unauthored. It binds **no authored clause**:
the contract's own text is owner-authored, at the owner's drafts destination,
and **nothing in this repository creates that file.**

The split is the source document's own, and it is admitted because it is
load-bearing rather than incidental:

> "The contract is owner-authored and this tool's only interaction with it is
> a read, so an absent contract is a fact about the destination, never a
> prompt, a gate, or a setup offer."

`writing-assistant/skills/draft-article/style-contract.md:55-57`

Kogaki is the tool. A repository that shipped an authored instance would be
authoring the artifact it is supposed to read, and the boundary
(`specs/SPEC.md` §2) already says repositories are invisible here — article
material is quoted from served renderings at pins.

**Consumed at generation, and only there.** The contract is read once per run,
before the per-section fill. This stage **never asks the owner a style
question, never proposes a per-run style, and never opens a gate.** A style
question raised at generation is the per-run choice the served ruling above
bars by name.

## 2. Sections sort by carrier, and the sort IS the instruction

A section's **carrier** is what can hold it — judgment, a mechanical
instrument, another ratified contract, or nothing. The sort is not an
ordering convenience: a section read without its carrier is a section that
grows the wrong instrument, which §3 is the worst case of.

| Section | Carrier, in this repository | What generation does with it |
|---|---|---|
| `REGISTER` | judgment | compose to it — re-expression happens **here, at the source**, because no downstream check can repair a register mismatch |
| `STRUCTURAL VOICE` | judgment | compose to it — it constrains the argument plan and the section shapes, beside the structure the owner chose |
| `LEXICON` | **none here** — see §2.1 | read the clause and write to it as judgment. Add no lexical check |
| `FIGURES` | **none here** — see §2.2 | read the clause and write to it as judgment. Derive no visual ladder |
| `SYNTAX PROFILE` | **none, deliberately** — §3 | read the clause and write to it as judgment. **Measure nothing** |

**Three of five rows carry nothing, and that is a reading rather than a
gap to be closed.** §6.9.2 of `specs/spec-draft-pipeline/SPEC.md` excludes
verdict machinery and lint from this pipeline wholesale, so a carrier-absent
row is the expected state here and not a defect. What the table refuses is
the other error: reading a row's *source* carrier as though this repository
had it.

### 2.1 `LEXICON`'s mechanical carrier does not exist here

The served line says lexicon coinage "is already a mechanical lint", and the
source document names the instrument: "the quality gate's dim-3 first-use-gloss
pass". **Neither exists in this repository.** The only lexicon grep here is
`checks/check-owner-surface-pins.sh`, which is scoped to owner-surface pins
and says so unconditionally in its own header — it is not a check on article
prose and must not be pressed into the role.

So the row is authored and **uncarried**, and the disclosure is the point: a
row asserting a carrier this repository lacks would be a binding no run could
honour, and the first article generated against it would satisfy a clause
nothing was reading. Whether the instrument is later ported is §8's question,
not this section's assertion.

### 2.2 `FIGURES`' ratified ladder does not exist here either

The served line calls figures "the ratified D9–D11 ladder" and the source
document makes the row **a pointer** to `SPEC-article-visuals`. There is no
`SPEC-article-visuals` in this repository and no visual-set plan or fallback
ladder anywhere in `specs/` — the grep returns zero.

A pointer to an absent document is worse than a stated absence, because it
reads as a binding to a reader who does not check. The row is authored,
uncarried, and its pointer is **owed** — recorded at §8 rather than
manufactured here.

## 3. The syntax profile carries no instrument, and that is the design

This is the section most likely to grow a bad instrument, and it is named as
such on the served surface rather than merely guarded here:

> "**Syntax profile carries NO instrument, and is named as the contract
> section most likely to grow a bad one.** Sentence-length distribution and
> hedging density are the only style properties a machine can measure cheaply,
> which is exactly why they will attract enforcement — and a distribution
> check is a proxy for voice, not voice. An instrument that measures the
> measurable NEIGHBOUR of a property teaches conformance to the neighbour."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:69`
(receipt at §9.1)

**Do not count sentences, compute a hedge ratio, or emit a syntax score
anywhere in a run.** A syntax metric added here has **failed** this contract
rather than implemented it — the inversion is stated because the failure mode
is an addition that looks like diligence.

## 4. Plain register is operational, and its test is the round trip

The manifest's second half — the **plain-register commitment** — is bound
here, and it is bound as a definition plus a test rather than as an audience
instruction:

> "**Plain register is defined OPERATIONALLY and derived by TRANSLATION WITH A
> ROUND-TRIP TEST, because audience impersonation is a prompt that produces
> condescension rather than a constraint a check can hold.** … Three controls
> replace impersonation with something checkable: an OPERATIONAL definition
> (no unexplained term of art, one relation per sentence, a concrete subject
> acting), a ROUND-TRIP test requiring the original claim be recoverable from
> the plain version with anything lost restored or explicitly conceded — the
> property that stops simplification becoming loss — and 2–3 candidates
> emitted onto the Brief for owner selection, reusing the existing human gate
> rather than adding ceremony."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:41`
(receipt at §9.1)

Three clauses bind:

1. **The operational definition** — no unexplained term of art, one relation
   per sentence, a concrete subject acting. Never "write for audience X":
   impersonation is the hazard this replaces, not a shorthand for it.
2. **The round-trip test** — the original claim must be recoverable from the
   plain version, with anything lost either restored or **explicitly
   conceded**. A concession is part of the output, never a silent omission.
   This is the "with round-trip concessions" half of the gate row §6 flips.
3. **Candidates, not a single rendering** — 2–3 emitted onto the Brief for the
   owner's selection at the gate that already exists. This adds no gate; §1's
   never-opens-a-gate rule is about *style questions*, and a Brief candidate
   set rides the Brief's own gate.

**The register the contract owns is not the audience field.** Audience is
config-by-lifetime, asked once per platform profile; register is owned by this
contract and the Brief's plain-register commitment
(`topics/articles.md:54@8906f20`, receipt at §9.1). A run that re-derives
register from an audience value has read the wrong carrier.

## 5. Exemplars are declared and empty; absence and malformation are dispositions

**Exemplar slots are declared and ship empty.** They are looked up by contract
**section id** (`register`, `structural-voice`):

> "The style contract's **exemplar slots ship DECLARED AND EMPTY**, populated
> by the first accepted articles. No accepted articles exist to pin, and the
> hub's own gloss renderings are the wrong register — first-time-engineer by
> design, versus the book register this contract is for. … An empty declared
> slot is visible where an unstated intention is not."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:68`
(receipt at §9.1)

When a slot is empty there is nothing to imitate. **Never substitute an
article, a served rendering, or a self-authored sample for a missing
exemplar** — the substitution is what makes an empty slot invisible, and the
hub's gloss renderings are specifically the wrong register to reach for.
When a slot is filled, the named passage is the reference for that section.

**Three dispositions, and each is a reading rather than a control flow.** The
source document expresses these as reader exit codes; §6.9.2 excludes that
machinery, so they are re-authored as what a generation sitting concludes:

- **Absent — proceed, and say so.** Compose as the pipeline otherwise does and
  carry the absence into the completion summary's informational bucket. An
  absent contract is a fact about the destination, never a prompt, a gate, or
  a setup offer, and **nothing here creates the file** (§1).
- **Malformed — relay verbatim, then degrade.** A missing version field, a
  missing section, or a section declaring the wrong carrier is relayed to the
  owner **verbatim** and the run continues **without a contract**. A
  half-applied contract is worse than a declared absence, and fixing the file
  is the owner's act.
- **A section with no authored clause is not a defect.** The contract's
  structure ships ahead of its content; a section marked `NOT YET AUTHORED`
  carries no constraint, and **nothing is inferred to fill it.**

## 6. The record format

**Declared here, and this inverts the source document deliberately.** The
source restates the format nowhere and defers it to a reader script that
prints it — a correct call there, where the script ships. No such script
ships here (§6.9.2), so deferring would leave the format declared in no
reachable place at all. The inversion is recorded at §7 as an admission with
modification rather than left to look like a copy.

A conforming style contract is one document carrying:

- `version:` — an integer. **Its absence is the malformed disposition**, not a
  default.
- One block per section, each naming its **section id**, its **carrier**, and
  its clause or the literal `NOT YET AUTHORED`. The five section ids are
  exactly `register`, `structural-voice`, `lexicon`, `figures`,
  `syntax-profile` — §2's rows, in that order.
- An **exemplars** block keyed by section id, each slot present and either
  holding a pointer to a named passage or empty (§5).

A section declaring a carrier other than the one §2 assigns it is the
**malformed** case — that is what "a section declaring the wrong carrier"
means, and it is the clause that keeps §2's sort binding rather than
advisory.

## 7. The admission register — clause by clause

kogaki#127 admits four things and this document is not one of them, so what
follows is what each clause earned.

**Admitted with a named benefit:**

| Clause | Benefit at admission |
|---|---|
| The carrier sort as the instruction (§2) | It is the served ruling itself (`articles.md:66`), not the source document's invention |
| The syntax-profile no-instrument rule (§3) | Served at `articles.md:69`, and it is the one clause whose violation looks like diligence |
| Plain register, operational + round trip (§4) | Served at `articles.md:41`; it is the half of manifest item 6 the gate row at §6 is blocked on |
| Exemplars declared and empty (§5) | Served at `articles.md:68` |
| The three dispositions (§5) | Re-authored from exit codes to readings — the property survives, the machinery does not |

**Admitted with modification, stated as modification:**

- **The record format (§6).** The source defers it to the reader script that
  prints it; no script ships here, so the format is declared. Deferring an
  enumeration to an absent printer is not the same decision the source made.
- **`LEXICON` and `FIGURES` (§2.1, §2.2).** Admitted as authored rows whose
  carriers are **absent here**, rather than as the source's mechanical-lint
  and ratified-ladder rows. Carrying them unmodified would assert two bindings
  this repository cannot honour.

**Not admitted, and why:**

- **The reader invocation** (`style-contract.py read`, `--root`, `--repo`,
  `--json`) — machinery, excluded wholesale by
  `specs/spec-draft-pipeline/SPEC.md` §6.9.2.
- **Exit codes 0 and 4 as control flow** — same exclusion; the dispositions
  they encoded survive at §5 as readings.
- **The pointer to `SPEC-article-visuals`** — the target does not exist here
  (§2.2). A pointer admitted to an absent document is a binding in appearance
  only.

## 8. Open — carried as questions, never as contract

- **`LEXICON` has no instrument here (§2.1).** Whether the first-use-gloss
  pass is ported, rebuilt, or declined is not decided by this spec. What is
  decided is that the row does not claim one meanwhile.
- **`FIGURES` has no ratified ladder here (§2.2).** The D9–D11 ladder is
  served but has no kogaki carrier; the pointer is owed. Filling it is a
  decision act with its own alternatives, not an edit to this table.
- **Zero authored contracts.** No style contract instance exists at any
  destination, so every clause here is evaluated against the absent
  disposition and nothing else. The first authored contract is the evaluation
  of this shape — the same posture `specs/spec-gate-carrier/SPEC.md` §9 takes
  toward its empty registry.
- **The corpus-level drift check is HELD upstream**
  (`topics/articles.md:67@8906f20`), on the ground that the corpus is
  approximately zero published articles and the instrument could not run if
  built. Named here so it is not invented locally under time pressure.

## 9. Out of scope, by decision

The Brief's **durable home** is manifest item 5's and is untouched here —
**decided since at SPEC-draft-pipeline §5.3 (v7, kogaki#482)**: a directory
per Brief, `briefs/<slug>/brief.md`, tracked; checkpoints and resume remain
item 5's owed future. Cited by section name rather than by line, because the
line-number form this sentence previously carried (`:88`) had drifted twice
before anyone read it — a pointer into a moving file is the fragile
cross-reference arm. §4.5's design-baseline declaration
is untouched: this adds a manifest item's carrier and re-declares no baseline.
Also out: any authored style clause, and any instrument for any section.

## 10. The reads this spec rests on

### 10.1 Receipts

**kogaki#426, 2026-08-13.** §§1–8 are written from these lines and quote them
verbatim.

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:24,41,54,66,67,68,69`
  request_id: 16f39f03-d992-4446-bb54-11fcf3d217b4
  outcome: discriminating
  query: style contract plain register surface style prose voice for generated article drafts

**One served line is quoted for what it forecloses rather than what it
binds.** `topics/articles.md:24` rules that there is **no StyleConstitution
artifact** — "the one versioned style contract owns the sentence-level layer,
and explanatory principles that survive evidence merge into it … A second
constitution-like artifact is the two-carriers drift shape". It is the reason
§1 refuses to ship an instance beside this spec, and the reason a Move
carrying style rules is not a Move.

### 10.2 The disposition half, consulted separately (PR #427 round 1)

**Round 1's dimension-2 read found boundary 3 (record disposition) uncovered,
and this is its discharge.** §1 and the amendment note at
`specs/spec-draft-pipeline/SPEC.md` adopt a reading of kogaki#127's
disposition as the live word — that "No new style artifact" is a prohibition
on *proliferation*, never on the one contract existing — and flip a v1 gate
row on the strength of it. The receipt above pins the **subject** position
(what a style contract is, and that a second constitution-like artifact is
barred); it does not pin the **disposition** survey the map's entry 3
prescribes. Two halves, two reads:

> "A status question has two halves that behave very differently. Whether
> something was built is local, mechanically self-evident, free to check, and
> looks final — a merge commit, a file on disk, a green log — whereas whether
> it is still accepted, rejected, or superseded lives in prose somewhere else
> and never surfaces unless you deliberately go looking."

`gloss/lessons/knowledge-architecture.md:287@8906f20`

> "If you write one rule for resolving disagreements, such as 'trust the more
> recent record', you hand one system the final word on facts it has no way to
> observe. **Say which system decides which half.** Being written more
> recently says when someone wrote, not what they could see."

`gloss/lessons/knowledge-architecture.md:227@8906f20`

**Which system decides which half, said rather than assumed.** The
**existence** half — that #127's architecture landed, and where — is read from
this repository's merged artifacts. The **standing** half — that #127 is
discharged and what its exclusion still forbids — is *not* read from those
artifacts, exactly as `:287` warns; it is read from the owner's own selection
at the `/ship-cycle 127` carrier-vitality gate on 2026-08-13, recorded in
prose on **kogaki#127**, whose thread carries it verbatim: "Closed as
discharged-with-successors under the carrier-vitality arbitration (owner
selection 2026-08-13, `/ship-cycle 127`)." kogaki#426 restates it secondhand
and is **not** the carrier; naming the restatement here would have been a
smaller version of the substitution this section exists to refuse. So the
adopted reading rests on the prose carrier the
served line says it must, and not on the merged code that would have looked
final while answering the wrong question.

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:227,287`
  request_id: 1786628797120
  outcome: discriminating
  query: gloss_index("lessons/knowledge-architecture") — when a prior decision's exclusion is adopted as the live word, which carrier establishes that it still stands, and may merged artifacts evidence it?

**The served result exceeded the tool-result cap** (132,108 characters on one
line) and was read by byte-slicing the spilled file. Round 1 recorded the same
instrument property as `cannot-determine` because the review lane is denied
that instrument by design; it is recorded here as a **read that succeeded by a
route the lane does not have**, so the two records are not mistaken for
disagreement.

**The source document was read at
`writing-assistant/skills/draft-article/style-contract.md` (76 lines,
2026-08-13) and is cited by line at §1 and §7.** It is a source for the
admission argument, never a port: `specs/SPEC.md` §2's boundary governs
*article material*, and this is a contract document being re-authored clause
by clause under kogaki#127's admission rule. No clause enters on the strength
of having been there.
