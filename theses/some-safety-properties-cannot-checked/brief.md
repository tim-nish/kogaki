# Brief — some-safety-properties-cannot-checked

> A **brief** is the working plan for one article: the served
> material (Strands) the owner settled on, and the composition
> fields — thesis, Reader Path, coverage, obligations — filled in as
> composition proceeds. It is the durable document a drafting
> sitting resumes from.

*Survey pin:* `product-lab@f240608cc37da60a412949faa6a698bbb4e1cd8f`
*Strand set: CLOSED at mint. Adding a Strand is your act, taken by going back through Terrain — a Brief never reaches for material on its own.*

## Strands

### L15 — a-conservative-proxy-premise-is-falsified-by-design

- cite: `gloss/ELEMENTS.jsonl slug=a-conservative-proxy-premise-is-falsified-by-design kind=lesson @f240608cc37da60a412949faa6a698bbb4e1cd8f`

### L52 — a-join-key-across-a-closed-boundary-is-unverifiable-on-both-sides

- cite: `gloss/ELEMENTS.jsonl slug=a-join-key-across-a-closed-boundary-is-unverifiable-on-both-sides kind=lesson @f240608cc37da60a412949faa6a698bbb4e1cd8f`

### L97 — a-verification-artifact-bound-by-belief-verifies-nothing

- cite: `gloss/ELEMENTS.jsonl slug=a-verification-artifact-bound-by-belief-verifies-nothing kind=lesson @f240608cc37da60a412949faa6a698bbb4e1cd8f`
- journey cite: `gloss/ELEMENTS.jsonl slug=a-verification-artifact-bound-by-belief-verifies-nothing kind=journey @f240608cc37da60a412949faa6a698bbb4e1cd8f`

### L158 — coverage-completeness-is-relative-to-enumeration

- cite: `gloss/ELEMENTS.jsonl slug=coverage-completeness-is-relative-to-enumeration kind=lesson @f240608cc37da60a412949faa6a698bbb4e1cd8f`
- journey cite: `gloss/ELEMENTS.jsonl slug=coverage-completeness-is-relative-to-enumeration kind=journey @f240608cc37da60a412949faa6a698bbb4e1cd8f`

### L180 — establish-the-substrate-before-reporting

- cite: `gloss/ELEMENTS.jsonl slug=establish-the-substrate-before-reporting kind=lesson @f240608cc37da60a412949faa6a698bbb4e1cd8f`
- journey cite: `gloss/ELEMENTS.jsonl slug=establish-the-substrate-before-reporting kind=journey @f240608cc37da60a412949faa6a698bbb4e1cd8f`

## Thesis

Some safety properties cannot be checked directly, so the honest move is to write down a stricter condition that an existing cheap check can actually decide.

*The claim this article makes. You adopted it when the Brief was named; it is composed from the settled Strands and never invented.*

## Reader start

Someone who builds and reviews checks — tests, cleanup jobs, coverage reports — and who reads a green result as information about the system it ran against. They have no way to tell a check that could have failed from one that could not.

*Where the reader stands before the article.*

## Reader target

They hold the distinction as a working question and apply it to a check they own: what observation would have made this report otherwise? They also accept that the replacement flags harmless cases, and that whatever stays undecidable is carried as declared-unchecked rather than quietly.

*Where the article leaves them.*

## Opening question

This test passed — what would have had to be true for it to fail?

*The question the opening puts to the reader standing there.*

## Reader Path

```step
step_id: a1
move: introduce_paired_conceptual_axis
materials: L97, L97.journey
purpose: Put the reader in front of a single passing integration test whose stand-in message the team wrote themselves, and establish the axis the whole article turns on: whether any observation could have made the check fail.
reader_state_before: The reader recognizes integration tests and treats a passing one as evidence about the other system, with no stable way to tell one passing test from another.
reader_state_after: The reader holds the distinction between a check bound to a message someone invented and a check bound to a message recorded from the live system, and can use it to sort later cases.
depends_on: (none)
rationale: The article's claim is abstract and the reader's confidence is concrete, so the opening has to be a case rather than a definition. L97 carries both endpoints of the axis in its own words, which is why the distinction can be established without importing anything.
ground (strand L97): A test proves something only if there is a real connection between what it runs and the behaviour it claims to cover.
ground (strand L97): Testing against your own invention checks that you can read your own guess.
ground (strand L97): Recording one real message from the live system showed the true cause was not on the list of guesses, because the test had invented its own version of that message.
ground (reader_assumption): The reader has seen a test suite pass and taken that as information about a system it talks to.
introduces: fixture — the stand-in message a test replays in place of what the real system sends
opens_section: A test that could not have failed
```

```step
step_id: a2
move: extend_mechanism_across_distinct_domains
materials: L180, L158, L52
purpose: Show that the axis just established is not a fact about tests: the same causal structure appears in a cleanup step reading the wrong directories, in a completeness claim over the wrong candidate list, and in an identifier neither side is allowed to check.
reader_state_before: The reader holds the distinction but takes it to be a lesson about test fixtures.
reader_state_after: The reader recognizes the same structure in reporting, in coverage claims and in cross-boundary identifiers, and understands it as a property of checks rather than of testing.
depends_on: a1
rationale: Three domains, each with its own underlying condition, share one causal relationship: nothing the check could observe would have made it report otherwise. Extending here rather than later stops the reader filing the opening as a testing anecdote.
ground (strand L180): A cleanup step read directories its records were never written to, and its output looked like a genuine all-clear.
ground (strand L158): A report saying it read everything certifies only that it read everything it had listed as a candidate.
ground (strand L52): Neither side can check a shared identifier is genuine, since checking would require the access the design withholds, so a made-up one passes everything.
ground (step_effect a1): The reader holds the distinction between a check bound to an invented input and one bound to a recorded real input.
```

```step
step_id: a3
move: expose_missing_explanatory_layer
materials: L180, L180.journey, L158.journey
purpose: Name the factor that explains why these survive review when ordinary bugs do not — an unfounded answer agrees with everything, so no later observation ever collides with it.
reader_state_before: The reader recognizes the pattern across the four cases but explains it as ordinary carelessness, which does not account for how long each one stood.
reader_state_after: The reader understands that the distinguishing factor is not wrongness but unfoundedness: a wrong answer eventually contradicts something and an unfounded one never does, which is why nothing in the output separates computed over nothing from computed and found nothing.
depends_on: a1, a2
rationale: Carelessness genuinely explains part of it and is kept. What it cannot explain is the persistence — three instances in one day, two of them the team's own, one approved that morning — and L180's own account supplies the missing layer.
ground (strand L180): The failure mode is not a wrong answer but an unfounded one, harder to catch because wrong answers eventually contradict something while unfounded ones agree with everything.
ground (strand L180): Nothing in the output distinguishes computed over nothing from computed and found nothing.
ground (strand L180): Three instances arrived in one day, two of them the team's own, including a verification check approved that morning that reported a confident zero over records carrying no marker at all.
ground (step_effect a2): The reader recognizes the same structure across reporting, coverage claims and cross-boundary identifiers.
introduces: unfounded answer — an answer produced without establishing that the place it looked exists and is the place it meant
opens_section: Why nothing contradicts an unfounded answer
```

```step
step_id: a4
move: instantiate_abstract_mechanism_in_concrete_case
materials: L158, L158.journey
purpose: Trace the mechanism to its limit in one case: when the candidate list is the checking machinery's own register and the failure being hunted is something never reaching that register, the check's passing and the system being broken are the same observation.
reader_state_before: The reader understands unfoundedness in general terms but has not seen how far it goes in a specific arrangement.
reader_state_after: The reader understands the stage where the check stops being weak evidence and becomes no evidence, and can recognize the arrangement that produces it.
depends_on: a3
rationale: The general statement leaves the reader able to agree without changing anything. L158's own account of the register case maps each causal stage, and it stops short of a universal claim because the arrangement it needs is specific.
ground (strand L158): When the list is the checking mechanism's own register and the failure being hunted is something never being registered, the check cannot be wrong, because nothing it reports bears on the question.
ground (strand L158): The list was supplied by the very person being given the claim, so the usual sanity check was the thing that produced the list.
ground (strand L158): It can be admitted as incomplete in a comment and then closed over, which is the only version anyone could have caught in time.
ground (step_effect a3): The reader understands unfoundedness as agreement with everything rather than as wrongness.
```

```step
step_id: a5
move: narrow_unbounded_question
materials: L15
purpose: Offer the article's claim as the repair: where the property cannot be checked directly, write down a stricter condition an existing cheap check can actually decide.
reader_state_before: The reader understands why these checks carry no information but has no principle for deciding what to write instead.
reader_state_after: The reader holds the criterion — ask what observation would decide the wording — and understands how it bears on the original question of whether the property holds.
depends_on: a1, a3, a4
rationale: The broad question, is this system safe, admits no check. L15 replaces it with a narrower one that a cheap existing check decides, and the replacement preserves the outcome under investigation rather than substituting a different one.
ground (strand L15): Some safety properties cannot be checked directly, so the honest move is to write down a stricter condition that an existing cheap check can actually decide.
ground (strand L15): The test is to ask what observation would decide the new wording, and if the answer is somebody's judgement, the check has quietly been removed.
ground (step_effect a4): The reader understands the arrangement in which a check's passing carries no information at all.
introduces: conservative proxy — a stricter condition, decidable by a check you already have, standing in for a property you cannot check directly
opens_section: The honest replacement
```

```step
step_id: a6
move: derive_mitigation_from_causal_mechanism
materials: L15, L52
purpose: Settle the price the reader is about to object to — the condition flags harmless cases, and that is what having a detector costs — and give the disposal for what stays undecidable: keep it, and say plainly that it is unchecked.
reader_state_before: The reader holds the criterion and reads its false alarms as a defect to be tuned away.
reader_state_after: The reader understands why rewording toward what you really mean removes the check, and holds one practice for the residue: keep an unverifiable identifier if the matching is worth it, and state that its presence proves nothing.
depends_on: a5
rationale: The mechanism is now in the reader's hands, so the practice can be derived from it rather than recommended: a wording that no observation decides removes the check, and a disclosed unchecked identifier changes what the record claims without pretending to verify it.
ground (strand L15): Such a condition will flag harmless cases, and that is the price of having any detector at all rather than a defect in the wording.
ground (strand L15): Rewording it to say what you really mean often makes it impossible to check, and the result reads more precise while measuring nothing.
ground (strand L52): Keep the identifier if the matching is worth it, but say plainly that it is unchecked, because its presence proves nothing on its own.
ground (step_effect a5): The reader holds the criterion that a check is one only where some observation would decide it.
```

*The ordered steps the article walks.*

## Strand coverage

- **L15** — used_by_steps: a5, a6; role_in_thesis: States the claim itself and the criterion that applies it; supplies the price clause that keeps the claim from over-promising.
- **L52** — used_by_steps: a2, a6; role_in_thesis: One of the four failure cases, and the source of the disposal for residue no decidable condition can reach.
- **L97** — used_by_steps: a1; role_in_thesis: The opening case, and the source of the axis the whole path turns on.
- **L158** — used_by_steps: a2, a4; role_in_thesis: The limit case — where a check's passing and the system being broken are the same observation.
- **L180** — used_by_steps: a2, a3; role_in_thesis: Supplies the factor that explains why these survive review: an unfounded answer agrees with everything.

*Strand placement count, taken AFTER composition, counted in placements: 5 of 5 selected Strand(s) placed.*

*Journey coverage (§6.1 MUST 1 — placed, or the omission disclosed):*
- **L97** journey — placed by: a1
- **L158** journey — placed by: a3, a4
- **L180** journey — placed by: a3
*Journey placement count, taken AFTER composition: 3 of 3 Journey-bearing Strand(s) placed.*

*Per settled Strand: which steps use it, and the part it plays in the claim. The count is taken after composition, never declared ahead of it.*

## Unresolved obligations

- The opening asserts the reader treats a passing test as evidence, without establishing it — the reader is entitled to reject the premise about themselves. — introduced_by: a1; discharged_by: a3
- The extension to the join key uses a case whose foreclosure arrives by prohibition rather than by invention, and owes the reader the shared relationship that makes it the same structure. — introduced_by: a2; discharged_by: a3
- Naming the replacement leaves open what to do with whatever the replacement still cannot decide. — introduced_by: a5; discharged_by: a6

*What each step still owes the reader, entered with the step that settles it.*

## Thesis closure

The claim is that a stricter decidable condition is the honest move where a property cannot be checked directly. This path establishes the loss first — four checks that could not have failed — so the closing Steps carry both halves of the Thesis: the replacement, and the false alarms that are its price rather than its defect.

*established_by_steps: a1, a2, a3, a4, a5, a6*

*How the path closes the claim, and which steps establish it.*

## Tradeoffs

Placing the loss before the rule costs the reader four Steps before anything actionable arrives, which is the wrong trade for someone who came for the practice. It also spends the strongest case, the recorded integration failure, at the opening, so the later Steps have nothing of that weight left to draw on. What it buys is that the rule is read as a repair to a belief the reader has just lost rather than as advice they may already think they follow.

*What adopting this path gave up.*

