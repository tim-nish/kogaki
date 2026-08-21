# SPEC-gate-carrier — the gate carrier

**Status:** v3, amended 2026-08-21 (kogaki#569) — **§3.1's one exception is
discharged.** v2 (same day, same issue) bound what the question screen carries —
four members, a fifth owes a stated reason, machine-facing text not among them —
and named one exception in force: the gate declaration block, mandated in the
question text by a clause and hook living in `tim-nish/claude-toolkit`, where
the reversal was filed as `tim-nish/claude-toolkit#402`. That repository ruled
the same day (`SPEC-triage-gh` §"The declaration rides in the transcript", v65,
its #402 closed; observed enforcing in this repository's own sittings), so the
exception is dropped and §3.1 now binds without one. **deferred slots minted by
this amendment: none.**

**Status:** v1, authored 2026-08-05 (kogaki#16, umbrella kogaki#14).
**Governs:** port manifest item 4 (`specs/SPEC.md` §5).

The manifest carries this subsystem's contract inline, as its admission
record:

> "4. **The gate carrier** (declared gate registry, AskUserQuestion evidence,
> payload/answer capture) — with rendering through the question UI as
> contract, not discretion."

`specs/SPEC.md:4745-4747`

Ported **with** its contract, ahead of Terrain, on the same ground as item 3
(`specs/SPEC.md:113-121`). Authored consumer-side, in the same shape as
`specs/spec-proposal-contract/SPEC.md` and `specs/spec-terrain/SPEC.md:6-15`.

## 1. What this contract binds, and what it does not

Item 3 binds a **record** and by its own decision delivers no rendering
(`specs/spec-proposal-contract/SPEC.md:137-139` puts the medium binding, the
gate registry and `AskUserQuestion` evidence here). This spec is the other
half: it binds the **gate** — the moment a decision reaches the owner — its
declared enumeration, its medium, and the evidence its answer leaves behind.

The two contracts share no machinery, deliberately. A proposal may be
presented at a gate and a gate may present something that is not a proposal;
neither validator reads the other's files.

## 2. The declared gate registry

Every gate this repository raises is declared in `gates/registry.json`. The
registry is the enumeration against which coverage is measured, and it exists
because the alternative is the uncovered-by-default shape: without an
enumeration, "all gates are covered" is a statement about the gates somebody
happened to remember.

**It is a separate artifact from `checks/registry.json`, and the argument is
mechanical before it is philosophical.** Every entry in the check registry
names a `file` that must exist under `checks/`, and
`checks/check-registry-conformance.sh:21-27` fails any entry that does not —
a gate row would be a dangling entry by construction. The admission record
there is check-loop economics (`tier`, `runtime_ms`, `removal_signal`;
`checks/registry.json:2-7`) and a gate has neither a runtime nor a loop
position, so merging would mean fabricating those fields or making them
optional — and an optional admission field is precisely the gap kogaki#6 was
filed to close. Same coverage discipline, different admission economics, so
two artifacts. The registry is currently **empty**, and the check renders
that zero explicitly rather than passing silently: the carrier ports ahead of
its first consumer, Terrain (`specs/SPEC.md:109-112`).

The machine-readable shape is `specs/spec-gate-carrier/gate-schema.json`.
`checks/check-gate-carrier.sh` reads its field lists rather than restating
them, so amending the contract is one edit.

## 3. The medium binding

> "'In a Claude Code host, a gate renders through the selector affordance,
> never prose' is RATIFIED as the rule's first named MEDIUM BINDING, and it
> is what makes the rule checkable. The general form — visually distinct from
> the surrounding report — is unfalsifiable on its own, since every author
> believes their own gate is distinct; all seven observed failures were
> authored by someone who thought the gate was legible."

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:61`

So a gate declares its `host` and its `medium`, and the host carries the
binding rather than the gate carrying a promise. `claude-code` binds `medium`
to `selector` — the `AskUserQuestion` affordance. `prose` is refused in every
host, named or not. **Additional hosts get their own bindings**, per the same
served line; a host with no declared binding fails rather than inheriting
one, because inheriting would restore the unfalsifiable general form under a
new name.

### 3.1 What the question screen carries (v2, kogaki#569)

§3 binds the **medium** — which affordance a gate renders through. This clause
binds what that affordance **carries**, which the manifest already admits as
contract rather than discretion:

> "with rendering through the question UI as contract, not discretion"

`specs/SPEC.md:4745-4747` — **repointed at v2.** This clause's first cut carried
`:99-101`, which is where the file's own header block still cites the item and
which resolves at this head to unrelated text on derived-artifact sensitivity.
The quote is the whole ground §3.1 rests on, and a pin that looks sound while
resolving elsewhere is the defect class `policy/consultation-map.md` records at
kogaki#266. The header's copy is outside this clause and is not repaired here.

**The owner ruling (2026-08-20).** The question screen carries the identifying
material the owner reads, the instruction, the question, and the options.
**Anything else on a gate screen is added only with a stated reason**, and the
reason is stated where the element is added rather than assumed by whoever adds
it.

**The general clause is the load-bearing half, deliberately.** Naming the one
element that prompted the ruling would cover that element and leave the next one
uncovered by default — the enumeration shape this repository refuses elsewhere.
So the rule is composition-shaped: the screen has four members, and a fifth owes
an argument.

**Machine-facing text is not one of the four.** This repository already classes
pins that way and says where they go instead:

> "**Pins do not go here.** `consulted:`, `request_id:` and `@<sha>` are
> machine-facing and belong in the receipt, whose destinations are unchanged —
> PR bodies, issue bodies, run records, spec amendments. …"

`.claude/skills/consult-first/SKILL.md:97-101`

**And that source licenses a second, narrower exception, which this clause
carries rather than silently omitting.** The sentence the excerpt cuts reads:
"One exception is not an exception: a gate declaration may carry an `outcome:`
line, which is a token and not a pin." A bare `outcome:` token is therefore
admissible on a gate declaration by the same source, independently of the
mandated block below — and an exception paragraph that declared exactly one while
its own cited range licensed two would be quoting selectively against itself.

Rendering a machine-facing record into the question body is the record/rendering
confusion the payload design exists to prevent, applied to the gate's own chrome.
Where a consultation must be visible to the owner **before** a gate, the existing
owner-render block — Question / Answer / Conclusion, printed before the UI — is
the sanctioned surface and is unchanged.

**THE EXCEPTION IS DISCHARGED (v3).** v2 named one live exception: the gate
declaration block — `gate: <class>` with its `receipt:` and `outcome:` lines —
was mandated **in the question text** by a rule and an actor-level hook living
in `tim-nish/claude-toolkit`, neither reachable from here, so v2 named the
carrier and asserted nothing about its state. That repository ruled on
2026-08-21 (`SPEC-triage-gh` §"The declaration rides in the transcript", v65,
issue #402 there, closed): the block is emitted as **assistant text in the
transcript before the gate call**, keyed `gate-declaration (question N):`, and
`lint-gate-declaration.py` now REFUSES a question text carrying `gate:` —
observed enforcing in this repository's own sittings the same day. The two
contracts now agree, no element of the declaration block reaches the question
UI, and §3.1's four-member rule binds with no exception in force.

**The carrier is NAMED and its state is not asserted**, which is the form the
served line this clause consults requires and the form
`policy/consultation-map.md` entry 4 already models — kept at v3 as the record
of HOW the exception was carried while it lived: the carrier named, its state
never asserted, `instrument: none` because nothing here watches that
repository. That form is why this clause could not rot between the toolkit's
ruling and this amendment — it claimed nothing the ruling falsified.

**The v2→v3 discharge is read from the carrier it named, not inferred.**
kogaki#569's cross-repo half, `tim-nish/claude-toolkit#402`, closed with the
transcript transport ratified and the hook's refusal observed live in this
repository. The paragraph below preserves v2's disposition record:

`consulted: product-lab@541e59588bdb96977812c15057cecddc88702f32 LESSONS.md:97`

**No gate is registered by this clause and no check is registered by it.** It
binds composition, which `gates/registry.json` already declares per gate, and a
check over question text would be a second reader of a surface the actor-level
hook already reads.

## 4. Payload and answer capture, with the gate-less row

Capture files are any `*.gate-capture.json` in the tree — a default carrier,
not an enumerated directory, for the same reason item 3 chose one.

A row for a gate carries `evidence` (the `AskUserQuestion` tool use itself,
by `tool` and `tool_use_id` — the rendering's own artifact, not a claim that
it rendered) and `payload` (`options_offered`, `free_text_offered`, `answer`).
An answer recorded without its payload cannot be re-judged.

A row whose `gate_id` is `null` is the **gate-less row**: a stop that raised
no gate. It states its `no_gate_reason` and carries neither evidence nor
payload. It is a legitimate row class, never a violation and never a crash:

> "no fixture held a gate-less row though every payload-capturing run
> produces them"

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:14`

`checks/fixtures/gate-carrier/conforming/capture-gateless-row.json` and
`capture-mixed-run.json` are that fixture, written first rather than after the
incident.

## 5. The machine's own comparison — item 4's, decided here

Story 1.6 left undecided whether the served gate lesson's comparison half is
item 3's or item 4's (`specs/spec-proposal-contract/SPEC.md:151-156`). **It is
item 4's.** Three grounds, and the question is answered rather than returned:

1. The served lesson states the obligation of a gate's **input surface**, and
   closes "agent-fed inversion is incomplete until the presentation surface —
   including the comparison — is also fixed"
   (`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 LESSONS.md:99`).
   The comparison is a presentation-surface obligation, and item 3 delivers no
   presentation surface by its own §4.
2. The ratifying line types the duty by its bearer: "A fork gate owes a RANKED
   recommendation with per-option evidence; the discriminator against a
   forbidden default is FALSIFIABILITY … Admissible when nothing is
   pre-selected, each option carries the evidence bearing on it, and the
   recommendation carries **the evidence that would overturn it** — a
   recommendation without its overturning evidence stays forbidden as a
   default in disguise"
   (`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/archive/knowledge-architecture.md:15`).
   The bearer is the gate.
3. Sited in item 3, a gate that presents no proposal record would owe no
   comparison — the uncovered-by-default shape §2 exists to refuse.

So a gate declaring `fork: true` carries `comparison.recommended` (an offered
option id), `comparison.overturned_by`, and `evidence` on every option; and no
option may carry a pre-selection key, since rank is not pre-selection.

## 6. Where the mechanical/judgment line falls

Item 3 split the effect-stating property into a mechanical form floor and a
sufficiency half routed to the review lane. **This contract owes the same
split and takes it, on the same served ground**
(`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:46`
— "authenticate facts mechanically, gate judgments").

Carried **here**, mechanically:

- registry membership and gate-record completeness;
- the medium binding, which is checkable *only* because it names an
  affordance — this is the one place the split lands on the mechanical side
  where the general property could not;
- `AskUserQuestion` evidence present and identified;
- payload/answer completeness, and payload/registry option agreement;
- the comparison's **structural** presence: a recommendation that is a real
  option, overturning evidence non-empty, per-option evidence non-empty, no
  pre-selection.

Routed to the **review lane** (kogaki#13, story 1.5), as judgment:

- whether an option's attached evidence is the evidence bearing on it;
- whether the stated overturning evidence would in fact overturn the
  recommendation;
- whether the gate reads as a gate beyond its named affordance — the general
  form the served line calls unfalsifiable, which is exactly why it cannot be
  mechanized and exactly why it is not dropped.

The check states this split in its own output. A pass is not a claim that a
gate's comparison is adequate; an unstated omission reads as coverage.

## 7. Reporting: a crash is not a finding

> "A checker whose fallback message is phrased as its positive finding
> converts every internal error into a FALSE ACCUSATION, and the misreport is
> worse than silence because it aims the debugger away from the auditor. …
> the remedy has three parts and the third is the one that gets forgotten:
> guard the crash, report a crash AS a crash, and **disclose repetition** so
> identical output cannot be read as accumulating evidence."

`consulted: product-lab@5f769dfe5c8f5c0c9e82b397c1858c8c0d7a7926 topics/claude-code-ops.md:14`

All three are implemented:

1. **Guard.** Every capture row is validated inside its own guard; an
   unreadable rows list is guarded too.
2. **Report as a crash.** Crashes render under `CANNOT-DETERMINE`, in a block
   separate from `FAIL`, closing with "This is a defect in this checker, not a
   finding against the audited gate — debug here, not there." A crash is never
   spent as a positive finding.
3. **Disclose repetition.** Identical entries collapse to one line with
   `×N (identical output, one deterministic cause — not N independent
   confirmations)`. The crash key deliberately omits the row index, because a
   deterministic cause producing the identical entry N times is the case the
   disclosure exists for.

`checks/fixtures/gate-carrier/nonconforming/capture-row-uncheckable.json` and
`capture-row-uncheckable-repeated.json` exercise parts 1–3, and the fixture
pass **fails the check** if a crash is emitted as a violation instead.

## 8. Out of scope, by decision

The proposal record's shape (Where/Why, premise negation, the free-text
override's unconditionality, the effect-stating floor) — item 3, kogaki#15.
Also out: any gate-raising runtime. This contract binds how a gate is
*declared, rendered and recorded*, never what raises one or when.

## 9. Open — carried as questions, never as contract

- **Zero declared gates.** The registry is empty at authoring and the check
  says so rather than reporting a vacuous pass. The first consumer (Terrain,
  kogaki#14) is the evaluation of this shape.
- **One host binding.** `claude-code` is the only host with a declared
  binding, as the served line intends ("Additional hosts get their own
  bindings"). A second host is an amendment to `hosts` in the schema, not a
  weakening of the rule.
