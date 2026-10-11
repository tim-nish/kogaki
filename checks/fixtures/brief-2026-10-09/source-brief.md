# Brief — check-only-good-what-given

*compose_path:* `readers/dev-to-zenn.md`
*external_authority:* on

> A **brief** is the working plan for one article: the served
> material (Strands) the owner settled on, and the composition
> fields — thesis, Reader Path, coverage, obligations — filled in as
> composition proceeds. It is the durable document a drafting
> sitting resumes from.

*Strand set: CLOSED at mint. Adding a Strand is your act, taken by going back through Terrain — a Brief never reaches for material on its own.*

## Strands

### L1 — a-guard-familys-reach-is-bounded-by-its-matcher-not-its-code

- cite: `coding::lesson/a-guard-familys-reach-is-bounded-by-its-matcher-not-its-code@3176df1877f0db70045e079b71b4ce212bf6b6d82e89e47b137216329680984c`

### L2 — an-enumerated-prohibitions-load-bearing-half-is-its-non-member-fallback

- cite: `coding::lesson/an-enumerated-prohibitions-load-bearing-half-is-its-non-member-fallback@7151215b03306f068165fb336db599feff9fa5bcc6c58b1b1a1f7b5eb5827d17`
- journey cite: `coding::journey/an-enumerated-prohibitions-load-bearing-half-is-its-non-member-fallback@4042ac26f7c795d8da13cc29a32ac55e20b374e7795585c5f66d6cdaac6732b2`

### L3 — an-optional-input-read-as-permissive-leaves-its-guard-unfed

- cite: `coding::lesson/an-optional-input-read-as-permissive-leaves-its-guard-unfed@751446fb5b8b343bd1e6408d38c19eea0857f5287626c81dd19f87b8a44fba16`

### L4 — default-deny-protects-the-set-nobody-classified

- cite: `coding::lesson/default-deny-protects-the-set-nobody-classified@eb16ee9cd5769cfdea12c4297370fd6e55756b6d4cc37d8b849df3f3e2bbc20e`
- journey cite: `coding::journey/default-deny-protects-the-set-nobody-classified@bd35e80be3aa2a72a9f053065228bdcdfe014fdb56a2edb22a4950608dd6f940`

## Thesis

A check is only as good as what it is given.

*The claim this article makes. You adopted it when the Brief was named; it is composed from the settled Strands and never invented.*

## Reader start

knowledge: has written checks in a CI config and watched them pass and fail, and can read the code one runs over, but holds no account of how what a check is handed decides what it is able to catch.
question: wonders whether this is just the old "bad input, bad output" line applied to tests, and what a post could add to a sentence that already sounds obviously true.
expectation: expects a short peer post with one real code example and a lesson pulled from something that broke, not a general essay.
orientation: frames a check as something that either works or is written wrong, with whatever it is handed being a setup detail rather than the thing that sets its limits.
trust: gives a peer's post an open, provisional read, ready to follow a concrete case and quick to skim away if it stays abstract.

*Where the reader stands before the article.*

## Reader target

knowledge: holds one dated case in which the sentence held and then visibly reversed, holds the three parts of the giving it reversed on — the matcher that bounds a guard family's reach, the entries, and the non-member fallback — and knows that writing the fallback toward refusal, default-deny, is what covers the set nobody classified.
question: holds a narrower question about which inputs in their own repository are worth classifying first — a question about their own config rather than about the sentence.
expectation: expects to read their own CI config by asking what each check is handed before asking what it does.
orientation: reads what a check is given as the thing that sets its limits, as three named parts they can point at in a file, and no longer as a setup detail standing beside working-or-written-wrong.
trust: settled: the sentence was tested against a dated case, qualified by its reversal, and closed with a rule the reader checked by adding up a small example of their own.

*Where the article leaves them.*

## Reader Path

```leg
leg_id: leg1
move: substantiate_a_pattern_with_a_historical_reversal
materials: L2
purpose: Drop the reader into one dated case so the sentence they came in with stops being a slogan and becomes something they have watched hold and then fail.
reader_state_before: knowledge: has written checks in a CI config and can read the code they run over, and holds "a check is only as good as what it is given" as a slogan with no single run of events in which it visibly held and then stopped holding.
  question: wonders whether the sentence is just "bad input, bad output" applied to tests, and what one short post could add to it.
  expectation: expects a short peer post with one real code example, and expects that example to confirm the sentence rather than complicate it.
  orientation: frames a check as something that either works or is written wrong, with whatever it is handed being a setup detail rather than the thing that sets its limits.
  trust: reads a peer's post provisionally, ready to follow a concrete case and quick to skim away if it stays abstract.
reader_state_after: knowledge: holds one dated case in which a list of forbidden commands did stop every command it named, followed by a command that was never on the list running anyway, and holds the non-member fallback as the part that decided that case.
  question: holds an open question about why a command that was not on the list was ever that list's business at all.
  expectation: expects the explanation of the reversal to be something other than a missing entry, since adding the command to the list would not explain why the list got to decide.
  orientation: begins to treat what a check is handed as having separable parts that can fail independently, rather than as one undifferentiated setup detail.
  trust: raised, because the sentence was tested against a named, dated case and then qualified by the case that broke it rather than left to stand.
depends_on: (none)
rationale: It sits first because the reader's stated condition is impatience with an obviously-true sentence and readiness to follow a concrete case; anything general said before a case has happened is the abstraction they would skim away from. The reversal has to land before any part of the giving is named, so that every later leg is answering a question the reader already holds rather than a question the post poses on their behalf.
claim (strand L2): A list of forbidden commands decides nothing about a command that is not on it; the step that runs for everything the list does not name — its non-member fallback — is what decides those cases.
waypoint (serves L2): The reader is handed one dated run of a real list of forbidden commands and recognizes its starting conditions as exactly the situation the sentence describes, so they settle in expecting the case to confirm what they already believe.
waypoint (serves L2): Following one step — the list names a dangerous command, the command is stopped — the reader's expectation that the entries are the part doing the work becomes active and specific.
waypoint (serves L2): That expectation breaks on a command that was never on the list and ran anyway, and the reader sees that the deciding step was not any entry but the one that handles everything the list does not name.
waypoint (serves L2): The reader is left holding the visible result of that moment and a question of their own: why a command outside the list was ever something the list answered for.
journey: L2 — contrast (to contrast, showing the expectation the event broke)
introduces: {"term":"non-member fallback","kind":"coined","meaning":"The step a list of named things runs for anything that is not on the list — the answer the list gives to everything it never mentions.","nearest":"else branch","differs":"An else branch is a place in the code; the non-member fallback is the decision that place makes on behalf of an unbounded set of cases nobody enumerated, which is why it carries more weight than any single entry above it."}
opens_section: A list that worked, until it didn't
```

```leg
leg_id: leg2
move: expose_a_shared_omission_after_granting_explanatory_power
materials: L1
purpose: Answer the question the case left the reader holding, by moving their attention off the code inside the guards and onto the thing that decides what those guards ever see.
reader_state_before: knowledge: holds the dated case and its non-member fallback, but no account of why the unlisted command never met any of the checking code at all.
  question: holds the open question of why a command outside the list was that list's business, and what in the setup gave the fallback the deciding vote.
  expectation: expects the reversal to be explained by something other than a missing entry, and half-expects the fault to turn out to be somewhere in what the checking code does.
  orientation: treats the parts of what a check is handed as separable, while still reading a miss as evidence that some code was written wrong.
  trust: provisional and rising; will credit an account that does not blame code the reader can read and judge correct.
reader_state_after: knowledge: holds that a family of guards reaches exactly the inputs its matcher selects and no further, so that thorough code inside a guard changes how it judges what it sees and never widens what it sees.
  question: holds a new question about whether the giving can still fail where the matcher is right and the list is complete.
  expectation: expects a second, different way the giving fails, not another instance of something written wrong.
  orientation: reads what a check is handed as the thing that sets its limits, with the matcher as the first of those limits.
  trust: raised, because the guards' code was credited in full on its own cases before any boundary was named, so the boundary reads as a finding rather than a dismissal.
depends_on: leg1
rationale: It must follow the case, because its whole force is that it explains a reversal the reader has already watched; stated before the case it would be a general remark about matchers that the reader has no reason to attend to. It must also precede the absent-input leg, because that leg's surprise depends on the reader having first accepted the ordinary explanation — a boundary somewhere in the setup — and then finding a failure that survives even when the boundary is drawn correctly.
claim (strand L1): A family of guards reaches exactly the inputs its matcher selects; code added inside the guards changes how they judge what they see and never widens what they see.
waypoint (serves L1): The reader is walked through one guard of the family on its own cases and credits it completely — it catches what it is asked to catch, and nothing about it looks careless.
waypoint (serves L1): A second guard, working a different way, is granted the same full credit, so the reader is now holding a set of guards they have actively judged to be well written.
waypoint (serves L1): With that credit standing, the reader is brought to see the one boundary both guards share: each ran only on what the matcher selected, so the unlisted command reached neither of them.
waypoint (serves L1): The reader re-reads the earlier reversal and finds nothing inside the guards left to blame, which turns their attention forward to whether the giving can fail even when the selection is right.
introduces: {"term":"matcher","kind":"established","source":"the ordinary pattern-matching readers already write in CI config, globs and path filters — the expression that decides which things a rule runs over."}
introduces: {"term":"guard","kind":"established","source":"common usage among programmers for the piece of code placed in front of an action to stop it before it happens."}
re-activate: leg1 term non-member fallback
re-activate: leg1 claim L2 as A list of forbidden commands says nothing about a command that is not on it; the step for everything unnamed is what decides those cases.
```

```leg
leg_id: leg3
move: name_a_paradox_after_removing_aggressive_intent
materials: L3
purpose: Take away the reader's remaining explanation — that a miss means something was written wrong — and let them watch a miss happen with every written part correct.
reader_state_before: knowledge: holds the matcher as the boundary of a guard family's reach and the non-member fallback as the part that answers for unnamed cases, and holds nothing yet about a value that may simply be absent.
  question: holds the question of whether the giving can fail where the matcher is right and the list is complete.
  expectation: expects any further failure to turn out, on inspection, to be another thing written wrong somewhere.
  orientation: reads what a check is handed as what sets its limits, while still assuming that a miss implies a mistake in some written part.
  trust: open and attentive, and wary of a coined name arriving before anything has earned it.
reader_state_after: knowledge: knows that a check can run, find nothing to examine and report no problem while every written part of it is correct, and can name and define that state as an unfed guard.
  question: holds an open question about what a writer is supposed to do instead, for the cases nobody listed and the values nobody supplied.
  expectation: expects the post to close with a repair rather than a longer catalogue of ways to be caught out.
  orientation: reads a miss as a property of what reached the check, not only of what was written inside it.
  trust: raised, because the name arrived only after the reader had watched the thing itself happen and had been assured nothing was written wrong.
depends_on: leg1, leg2
rationale: It opens a second section because it changes the reader's question: the first section asks why the one case reversed, and this one asks whether the giving fails even when nothing is written wrong. It cannot come earlier, because stripping out the written-wrong explanation only has force once the reader has been given that explanation in its strongest form by the matcher leg; it cannot come later, because the closing rule needs both the unnamed cases and the unsupplied values already in the reader's hands.
claim (strand L3): When a value that may be absent is treated as permission, the guard depending on it runs with nothing to examine and reports no problem, with every written part of it correct.
waypoint (serves L3): The reader is handed back the explanation they now hold — a miss means the selection was too narrow or an entry was missing — in the confident form they would state it themselves.
waypoint (serves L3): That explanation is then explicitly removed: the reader is shown a case where the matcher is right, the list is complete, and the guard's own code is correct, and is told plainly that nothing here is written wrong.
waypoint (serves L3): With every mistake ruled out, the reader watches the check still report no problem, because the value it reads was allowed to be absent and absence was taken as permission — so the miss survives with no error to blame it on.
waypoint (serves L3): Only now does the reader receive a name and a one-line definition for the state they have just watched, so the term lands as a label for their own observation rather than as an assertion.
introduces: {"term":"unfed guard","kind":"coined","meaning":"A guard that runs, finds nothing to examine because the value it depends on never arrived, and reports no problem — a success that records only its own emptiness."}
re-activate: leg2 term matcher
re-activate: leg2 term guard
re-activate: leg2 claim L1 as How far a set of guards can reach is fixed by the pattern that picks out what they look at, not by what is written inside them.
re-activate: leg1 term non-member fallback
opens_section: The check that was handed nothing
```

```leg
leg_id: leg4
move: show_when_a_power_surplus_becomes_hegemony
materials: L4
purpose: Let the reader settle the question they are now holding by testing a small sum themselves, and leave them able to point at the part of any check that answers for everything nobody thought about.
reader_state_before: knowledge: holds three parts of what a check is handed — the matcher that bounds its reach, the entries it names, and a value that may be absent — but not how much of the input world falls outside all three.
  question: holds the question of what a writer does instead, for the cases nobody listed and the values nobody supplied.
  expectation: expects a repair, and would hear a sweeping rule about refusing things as asserted rather than shown.
  orientation: counts the cases a check misses one at a time, as particular oversights, rather than as one set with a size.
  trust: open, raised by a name that was earned rather than asserted, and still reserving judgment on any general rule.
reader_state_after: knowledge: holds one dated case in which the sentence held and then visibly reversed, holds the three parts of the giving it reversed on — the matcher that bounds a guard family's reach, the entries, and the non-member fallback — and knows that writing the fallback toward refusal, default-deny, is what covers the set nobody classified.
  question: holds a narrower question about which inputs in their own repository are worth classifying first — a question about their own config rather than about the sentence.
  expectation: expects to read their own CI config by asking what each check is handed before asking what it does.
  orientation: reads what a check is given as the thing that sets its limits, as three named parts they can point at in a file, and no longer as a setup detail standing beside working-or-written-wrong.
  trust: settled: the sentence was tested against a dated case, qualified by its reversal, and closed with a rule the reader checked by adding up a small example of their own.
depends_on: leg2, leg3
rationale: It closes because it is the only leg that answers rather than opens: every part it needs — a reach bounded by selection, a guard left unfed — is in the reader's hands from the two legs it depends on, and the sum it asks the reader to perform is only legible once those two failures are seen as one set rather than two anecdotes. It stays in the second section rather than opening a third, because it develops the question that section raised instead of changing it.
claim (strand L4): Writing the fallback toward refusal covers exactly the cases nobody classified, because that set is the one no entry names and no matcher selects.
waypoint (serves L4): The reader is brought to see the undesirable condition as one thing rather than a run of separate oversights: a set of cases nobody classified, every one of which is answered by the same single step.
waypoint (serves L4): A deliberately small example with countable parts lets the reader add up what is named as allowed, what is named as forbidden, and what is left — and see for themselves that the remainder outweighs both named groups together.
waypoint (serves L4): Holding that sum, the reader tests the two possible fallbacks against the remainder and finds the comparison is not close: one covers none of it, the other covers all of it.
waypoint (serves L4): Only after the comparison has been made by the reader does the arrangement get its name, and the result generalizes from the counted example into a rule the reader has already verified once.
waypoint (serves L4): A long-standing outside practice is then shown to have reached the same rule, so the reader leaves treating the rule as confirmed rather than newly proposed, and leaves able to point at the step in a check that answers for everything nobody considered.
introduces: {"term":"default-deny","kind":"established","source":"the way firewalls and permission systems have long been configured: anything not explicitly allowed is refused."}
re-activate: leg3 term unfed guard
re-activate: leg2 term matcher
re-activate: leg3 claim L3 as A value allowed to be absent, when absence counts as permission, leaves its guard with nothing to look at and a clean result.
re-activate: leg2 claim L1 as A set of guards only ever runs over what its pattern selected, so code inside them cannot extend their reach.
reaches_target: true
```

*The ordered legs the article walks.*

## Strand coverage

- **L1** — used_by_legs: leg2; role_in_thesis: Supplies the first named part of the giving: what a check is handed includes the matcher that selects what it ever sees, and that selection — not the code inside the guards — is the ceiling on what the check can catch. It is what makes the opening reversal explicable without blaming correct code.
- **L2** — used_by_legs: leg1; role_in_thesis: Carries the dated case the whole path is built on, and the second named part: for a list of named things, the step that answers for non-members is the part that decides the unnamed cases. It is where the reader first watches the Thesis hold and then reverse.
- **L3** — used_by_legs: leg3; role_in_thesis: Supplies the third part and the hardest instance of the Thesis: a check whose every written part is correct still catches nothing when the value it depends on may be absent and absence reads as permission. It removes written-wrong as a competing explanation for a miss.
- **L4** — used_by_legs: leg4; role_in_thesis: Closes the Thesis by turning it from a diagnosis into a rule: since the unclassified set is exactly what no entry names and no matcher selects, the fallback written toward refusal is what covers it. It is the leg whose after-state is the Reader target.

*Strand placement count, taken AFTER composition, counted in placements: 4 of 4 selected Strand(s) placed.*

*Journey coverage (journey register as a Candidate axis MUST 1 — placed, or the omission disclosed):*
- **L2** journey — placed by: leg1
- **L4** journey — **OMITTED, disclosed**: The path places exactly one Journey, at the opening, where a dated case that holds and then reverses is doing the work the assigned opening Move is built around. L4's Journey tells a second narrative of its own, and telling it in the closing leg would compete with the small counted example the reader is meant to verify by hand — the Move's threshold has to be checkable by the reader, not narrated to them. L4's Lesson is used in full as that leg's claim; only its Journey material is left unplaced.
*Journey placement count, taken AFTER composition: 1 of 2 Journey-bearing Strand(s) placed.*

*Per settled Strand: which legs use it, and the part it plays in the claim. The count is taken after composition, never declared ahead of it.*

## Closure

An obligation is a promise the prose makes to the reader that a later passage must keep: a question raised, an analogy introduced, a limitation conceded.

### Thesis

The Thesis — a check is only as good as what it is given — is established by leg 4, whose after-state is the Reader target. The path closes it by decomposition rather than repetition: the reader meets the sentence as a slogan, watches it hold in one dated case and then reverse, and is then handed the three parts of the giving that the reversal turned on. The matcher sets the outer bound on what any guard in a family can ever see, so no amount of code inside them widens the check's reach (L1). The entries of an enumerated prohibition decide only the cases they name, and the step that answers for non-members decides everything else (L2). A value permitted to be absent, with absence read as permission, leaves a wholly correct guard with nothing to examine and a clean result (L3). Those three establish the Thesis negatively — three distinct ways what a check is handed caps what it can catch, one of them with no mistake anywhere in the written code, which is what lifts the sentence off "bad input, bad output" and answers the reader's opening suspicion. Leg 4 closes it positively: because the unclassified set is exactly what no entry names and no matcher selects, the fallback written toward refusal is the only part of the giving that covers it, and the reader verifies that by summing a four-part example themselves rather than taking it on assertion. What is left open is deliberate and conceded in the leg that raises it: the path does not say which inputs in a particular repository to classify first, and the reader keeps a procedure for reading any check instead — name what selects what it sees, what it names, and what it does with everything else. The Reader target records the arrival the assignment asks for: the slogan is now a thing with moving parts the reader can point at in their own config, and their remaining question is about their own code rather than about the sentence. — established_by_legs: leg4

### Legs

- Explain why a command that was never on the list was that list's business at all — name what gave the fallback the deciding vote, rather than leaving the reversal as a thing that merely happened. — introduced_by: leg1; discharged_by: leg2
- Account for a second way the giving fails, distinct from a list missing an entry or a selection drawn too narrowly, since the reader has been told to expect one. — introduced_by: leg2; discharged_by: leg3
- Say what a writer does instead, for the cases nobody listed and the values nobody supplied, so the reader leaves with a repair and not a catalogue of ways to be caught out. — introduced_by: leg3; discharged_by: leg4
- Say which inputs in a particular repository deserve a classified list in the first place, and how a writer would find them. — introduced_by: leg4; conceded_by: leg4
  - open: How to take an inventory of a real repository's inputs, and in what order to classify them, is not answered on this path.
  - why_not_here: This leg's work is to show that the unclassified set is one set with a size and that the fallback answers for all of it; an inventory procedure would need material the Brief's Strands do not carry, and attempting it here would displace the close the reader has been promised.
  - reader_keeps: A test they can run unaided on any check in their own config: name what selects what it sees, what it names, and what it does with everything else — and read that third answer as the one the check gives to every case nobody considered.

*The obligation definition, the Thesis row and each Leg row — every row ending kept or conceded, by the Leg that closes it.*

## Tradeoffs

adopted over its siblings on reader experience: The reader arrives holding the sentence as a slogan and is immediately dropped into one dated run of a real forbidden-command list: it stops what it names, the reader settles into expecting confirmation, and then a command that was never on the list runs anyway. From that single broken expectation the path takes apart what the check was handed, one part per leg — the matcher that bounds how far a family of guards can ever reach, the absent value that leaves a correctly written guard with nothing to examine, and finally the fallback that decides every case nobody classified. The reader leaves with the slogan turned into three named parts they can point at in their own CI config, and a rule they verified by adding up a four-line example themselves.. The declined Candidates' experiences are recorded in the run's gate payload.

Opening: 6 Moves in the library could open from this Reader start without contradicting it, and the first Leg binds one of them.

*What adopting this path gave up.*

## What this path bridged

no gaps were bridged — the path's transitions stand on the material as composed

1 of 2 Journey-bearing Strand(s) placed by this Candidate — OMITTED and disclosed: L4

*What the composer inserted to carry the reader across a gap and on what reasoning, and how much of the selected journey material the path used.*

