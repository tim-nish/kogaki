# Kogaki (小書) — founding spec

status: **draft 2026-08-04**, first commit of the repository. Successor of
`writing-assistant` (archived 2026-08-04, read-only; its address is never
recycled). Kogaki writes development articles from the owner's policy
substrate. Public from the start; written clean.

## 1. Mission

Write articles whose material is the owner's ratified, plain-register
knowledge — Grains, Threads, and the Glossary served by the Gukan substrate —
for self-branding through development writing. Prose the reader trusts
because every grounded claim resolves to a served rendering at a pin.

## 2. The repository-invisible boundary

**A repository is where development happens together with Gukan; it is not a
place Kogaki collects from.** Kogaki reads Grains, Threads, and the Glossary
only, through the gateway seam. A repo path is not an address Kogaki can
resolve — enforced in the gateway client code, not by instruction. When
provenance metadata says a Lesson originated in some project, Kogaki may read
Gukan's *definition* of that project; it never opens the project.

Rationale (served): re-expression happens once, upstream, at a human gate —
material quoted from ratified renderings makes the untranslated-register
defect class unproducible rather than detected
(`topics/knowledge-architecture.md` 2026-08-04; `topics/articles.md`
2026-08-04, the evidence re-scoping).

## 2.5 Human-facing files live where the human works (owner ruling 2026-08-08)

**Repository-wide. Owner ruling 2026-08-08, carrier kogaki#234**, quoted as
ruled:

> "Human-facing files may exist only in the repository itself or in a path
> explicitly designated for storage. Placing a file under `~/.local`,
> `~/.xxx`, or any machine-local hidden directory is itself a declaration
> that the file is not intended to be exposed directly to the owner.
> Outside debugging, paths under those locations must not even be surfaced
> in the UI."

Three clauses, each binding separately so a partial compliance is visible:

1. **Location.** An artifact whose purpose is to be *read, reviewed, edited or
   hand-copied by the owner* lives in the working tree or in a path the owner
   explicitly designated for storage. Machine-readable intermediates, caches,
   journals and resumable run state live in machine-state directories.
2. **The location IS the declaration.** Writing a human-facing file under a
   machine-local hidden directory is not a neutral storage choice — it
   *declares* the file machine-facing. A component doing that is in a failed
   state whatever its prose says about the file's purpose.
3. **The owner surface.** No owner-facing output — skill text, session output,
   a command's closing lines — prints a `~/.kogaki/…`, `~/.local/…` or
   equivalent hidden path **outside debugging**.

**This is not a Kogaki invention, and the served line predates the ruling by
three weeks:** *"Human-facing artifacts (for reading, review, editing,
hand-copy) live in the user's working repo; machine-readable intermediates,
caches, journals, and resumable state live in machine-state dirs."*

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:132, topics/articles.md:34`
  request_id: a3673fc1-066f-4374-81f5-d8fe0f1ba7e1
  outcome: discriminating
  query: Human-facing artifacts live where the human works, and a derived artifact inherits its source's sensitivity — where does a generated report belong, and is it committed or ignored?

**Recording that the position was already served is the uncomfortable half and
is kept deliberately.** Kogaki ratified the opposite for its Full Report
(kogaki#129/#131, `specs/spec-terrain/SPEC.md` §12.2) *and declared it as a
divergence*, which is the discipline working — the entry was written, the
register was countable. What the register could not do is notice that the
divergence contradicted a portfolio lesson nobody consulted at that sitting.
**A divergence register records that you diverged; it does not check whether
you were entitled to.**

### 2.5.1 The discriminator is LIFETIME, not format or audience-in-principle

A run workspace holds things whose lifetime is the **run**; a repo-visible
location holds things whose lifetime is the **owner's**. The served
application of this is exact — an artifact was found in a run workspace keyed
by recency *"so at draft time the owner cannot enumerate or select one —
[[artifacts-live-where-human-works]] exactly, the location decided by WHICH
STAGE PRODUCED IT rather than by WHO CONSUMES IT"*
(`product-lab@dec0d568 topics/articles.md:34`).

That is the general form of this defect: **the producing stage's convenience
picks the location, and nobody re-asks on behalf of the consumer.** A component
satisfies this section by asking whose lifetime the artifact has, never by
asking which stage wrote it.

### 2.5.2 Visibility is decided EXPLICITLY, never by storage location

A human-facing artifact in the working tree is **repo-visible**; whether it is
also **committed** is a separate decision that each carrier makes and states.
The two are not the same question and must not be answered by one act.

The served constraint is directional and it binds here:

> "A derived artifact (summary, distilled line, report) inherits the highest
> sensitivity of its sources unless an explicit human-held gate deliberately
> lowers it — summarization/promotion is a declassification surface; route
> every cross-boundary derivation through one logged gate, and **never let
> storage location silently decide visibility**."

`product-lab@dec0d568 LESSONS.md:112` (receipt above)

So this section **moves** artifacts and **grants no publication**. A derivation
of uncommitted material becomes repo-visible without becoming committed; making
it committed is a declassification act needing its own grounds. A carrier that
moved a file into the tree and let the default `git add` decide the rest would
satisfy clause 1 while committing the defect this line names.

## 2.6 An owner-surface issue's acceptance criterion verifies at the EXPERIENCED unit (kogaki#234 remedy (c))

**Repository-wide, carrier kogaki#234**, in the remedy's filed words:

> An owner-surface issue's acceptance criterion must verify at the
> **experienced unit**, not only the artifact-diff unit — a live dogfood run
> citing the run record, before "resolved" may be claimed.

### 2.6.1 The class this binds, because an unbounded rule is a tax on every filing

**Only owner-surface issues.** An issue is **owner-surface** when the property
it repairs is stated about *what a person experiences* rather than about what
an artifact contains — the served formulation is exact:

> "An owner-facing contract's acceptance criterion must verify at the
> EXPERIENCED unit, never only the artifact-diff unit — a contract whose
> subject is what a human experiences cannot be carried by artifacts the
> failing component reads. … The remedy is either TOPOLOGY (remove the failing
> component from the serving path so there is nothing left to verify live) or
> MEASUREMENT AT THE EXPERIENCE (a run record diffed against what was actually
> served) — never an acceptance criterion pitched at a unit the failing hop
> does not touch."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/claude-code-ops.md:12-13, LESSONS.md:14, topics/knowledge-architecture.md:86`
  request_id: c0b4c7ab-2ccf-4f54-87cb-5e7ded799d8b
  outcome: discriminating
  query: When a recurring defect survives several resolving issues, should acceptance criteria be sliced by hop rather than by symptom — and must a close verify the property at the unit where it is experienced?

**The test is one question, asked at filing:** *which hop between the producer
and the owner's eyes does this issue's acceptance criterion touch, and is the
hop that fails one of them?* An issue whose whole subject is an artifact —
a schema, a parser, an internal record — is **not** owner-surface and this
section says nothing about it. An issue about a rendering, a screen, a command's
closing lines, a report the owner opens, or a relay through an agent session
**is**, and owes the criterion below.

**Two admissible discharges, and neither is ranked above the other.** The
served formulation quoted above states them as bare alternatives —
*"either TOPOLOGY … or MEASUREMENT AT THE EXPERIENCE"* — and this section
carries them the same way; the order below is this text's presentation and
**not** a preference, because ranking them here would add a normative claim
the served position does not carry. *Topology* — remove
the failing component from the serving path, so no live verification remains to
perform — discharges this section outright and is stated first so the rule does
not read as a standing dogfood tax. *Measurement at the experience* — a live
run, and a **run record** citing what was actually served (paths, sizes,
hashes, the pin) diffed against what the artifacts claim — is the discharge when
the hop cannot be removed. An acceptance criterion pitched at neither is what
this section refuses.

### 2.6.2 POLARITY — a real acceptance obligation, NOT the report-not-gate of §4 clause 8

**Decided deliberately, and stated first so the wrong polarity is not imported
by reflex.** §4 clause 8's report-not-gate governs **findings** — what a *merge*
may be blocked on, under kogaki#72's ratified blocking budget. This section
governs **acceptance criteria** — what a *close* may assert. Different unit,
different moment, and the two do not touch:

- Clause 8 is **detection-side and after the fact**: a finding already exists,
  and the question is whether observing it may stop a merge. Ratified answer:
  no.
- This section is **generation-side and before the fact**: it constrains how the
  criterion is *written*, so a close that satisfies it is a close that measured
  the property. Nothing here reads a finding, blocks a merge, or touches
  `checks/check-review-report.sh`.

**So kogaki#72's budget is untouched and is not reopened**, and the record is
disposed of explicitly rather than by silence: the live word on the
findings-lifecycle question remains kogaki#224, confirmed on the served surface
and carried there, and this section is a different layer of the same system
rather than a competing answer to it.

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/claude-code-ops.md:10`
  request_id: 4919fa94-b7bc-4a40-8b02-bcf444054a99
  outcome: discriminating
  query: Is the ratified blocking budget making should/nit findings non-gating still the live word, and does a new generation-side acceptance obligation about the verification unit supersede or reopen it, or do they bind at different layers?

**Being a real obligation is exactly why it gets no gate.** The served rule on
enforcement layer settles the shape:

> "an **obligation** cannot be gated at all and needs its absence made
> visible … a prohibition needs a mechanical gate at the tool boundary because
> prose is advisory to a system whose job is to satisfy instructions"

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:95`
  request_id: 918f8d52-22b9-4faf-8caa-b051520dc900
  outcome: discriminating
  query: Does a rule constraining what a close may assert bind as a real obligation on the acceptance criterion, or is it report-only like the non-blocking findings budget — is the blocking-budget report-not-gate polarity the live word for generation-side obligations too?

An absent live verification generates **no event to hook**, so nothing can deny
it; the carrier is the obligation plus its visible absence at the sittings that
already read issues and PRs. "Real obligation" and "no gate" are not in tension
— they are what the violation-layer rule says an obligation looks like.

### 2.6.3 JUDGMENT-CLASS — this does not become a lint, and the decline carries its trigger

**No check is licensed by this section, and none is owed.** Whether an issue is
owner-surface is a judgment about what its property is *about*; whether a run
record measured the experience rather than re-rendering the artifacts is a
judgment about evidence. Both are the shape a mechanical instrument reads
wrongly at speed — and the repository has already ruled at its strongest against
mechanizing a rule that merely *looks* deterministic. Its clause, in its own
words: **"No rule becomes a lint, even where deterministic processing is
possible"** (`specs/spec-draft-pipeline/SPEC.md` §4.6 clause 3). That clause
rests on a served line, which §4.6 quotes at its pin and which is quoted here
the same way rather than folded into the clause's voice:

> "… no rule becomes a lint or automated check — **even where deterministic
> processing is possible**"

`product-lab@dec0d568 topics/articles.md:19`

The portfolio rule makes the decline admissible rather than merely convenient —
a stated policy is admissible in exactly three states, and **carrier-less by
omission** is the defect:

> "a stated policy is admissible in exactly THREE states — per-artifact-decidable
> (state it), detector designed in (measure it), or deliberately carrier-less
> (mark it, with a reopen trigger) — and carrier-less BY OMISSION is the defect"

**And the authority to decline is this sitting's, on the served build-governance
split:** *"whether a work item LICENSES a check is a judgment decided at the
Issue or spec gate … while whether a PR CONTAINS an unlicensed check is a
computable fact carried at the merge layer"* — so a spec sitting deciding **not**
to license one is the ratified shape, not an omission. The three-states rule's
sharper form binds the choice: *"the unit is derived from how the policy is
violated, never inherited from the neighbouring gates"* — this policy is
violated by an acceptance criterion written at the wrong unit, in prose, at
filing time, and no check in this repository inspects that artifact.

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:70,86, LESSONS.md:32`
  request_id: 23a19853-06d3-42b8-b5a2-87a8da663021
  outcome: discriminating
  query: Should a new repository-wide acceptance-criterion obligation license a registered check, or stay judgment-class with a declared removal-free carrier-less mark and a reopen trigger?

**This section takes the third state and marks itself.** `instrument: none` —
no standing act in this repository observes an acceptance criterion that was
never written at the experienced unit, and none is invented, because the
condition is an absence in a body of prose no check reads. **The reopen
trigger:** an owner-surface issue closing `resolved` on artifact-diff evidence
alone, where the property is afterwards found not to hold. That is the same
observation shape that produced this section, and it would be seen by the next
sitting that measures the experience and finds the close was wrong.

### 2.6.4 The evidence, including this issue's own — the reflexive edge, discharged

**The diagnosis that earned the clause.** The Terrain co-tag screen defect
survived **five prior resolving issues** (kogaki#128 → #147/#148/#149 →
#162/#163/#164 → #167 → #168). All five were symptom-sliced — each repaired a
different artifact, none asked which hop had no carrier — and the answer was
always "none": the failing hop is the LLM session relaying the renderer's output
in live chat. Every one of those issues bound artifact diffs, checkable at
merge, at a unit that hop never touches, so each could close "resolved" honestly
while the property — *the bytes served are what the owner sees* — was never
measured by any close. The general lesson is minted and served as
`slice-recurring-defects-by-hop-not-symptom` (`LESSONS.md:14`, receipt in
§2.6.1).

**The second specimen is this issue's own, and it is why the clause lands
already obeying itself.** kogaki#234's acceptance items 2 and 5 were verified
LANDED by artifact inspection at merge — and **falsified hours later by a live
dogfood run** (kogaki#234, run record comment 2026-08-08). The run found two
defects no artifact check in this repository catches:

- the Markdown owner rendering dropped four served fields per member that the
  JSON machine record carried — `grep -c "gloss/lessons/"` over every file in
  `reports/` returned **0**, while the same file opened `> Untruncated.` and
  printed `- journey: 1` with no journey in it;
- the **idempotent-rerun** branch printed a machine-local absolute path on the
  owner surface, where PR #240 had fixed only the fresh-write branch.

Both were repaired in **PR #254** (`4926043`). Item 2 and item 5 were *true of
the artifacts and false at the experience*, which is this section's thesis
demonstrated on the issue that carries it.

**The reflexive edge is stated because it is the trap.** This section makes
"verify at the experienced unit" mandatory for owner-surface issues, and
kogaki#234's own acceptance item 6 was exactly that criterion. Landing the rule
without its own live evidence would have shipped it in violation of itself. It
is not shipped that way: the run above **is** item 6's live half, it cites its
run record, and the two defects it found are repaired and merged before this
clause was written.

### 2.6.5 Homes considered and DECLINED, recorded rather than dropped

The owner selected `specs/SPEC.md` as a general repository-wide clause, beside
§2.5. Two other homes were live and are recorded with their grounds, because a
reader meeting only the outcome would not know they were considered:

1. **Fold into kogaki#243's class carrier.** Arguably one instance of *"a
   verification artifact bound only by the author's belief"*, read at the
   acceptance-criterion field. **Declined** because it would widen #243, which
   triage scoped tightly to the inward evidence-discipline class, and #243 is
   **PARKED at the operator's request** — folding a live remedy into a parked
   carrier parks the remedy.
2. **Scope to `specs/spec-terrain/SPEC.md` only.** Narrowest and best-evidenced
   — every specimen so far is Terrain's. **Declined** because it leaves
   owner-surface contract N+1 uncovered by default, which is the enumeration
   shape this repository has ratified against: a rule scoped to the members that
   supplied its evidence stops covering the next member silently, and the
   failure presents as nothing happening.

**What the selection's own record does and does not carry, marked rather than
implied.** The alternatives above and their grounds are on the record; the
**selection** among the three is carried by the authoring sitting's assertion
that the owner made it, with **no captured gate payload or recorded answer**
beside it. That gap is stated here rather than left to be inferred from its
absence, because this is the same shape §2.6.4's evidence is about — a
verification bound only by the author's belief — read at the decision record
instead of at the acceptance criterion. It is not repaired retroactively: a
gate payload composed after the fact would be the fabrication the marking
exists to avoid. **The reopen trigger:** a later reading of this section that
turns on *which* home was chosen rather than on what the section says, at which
point the choice owes a re-decision with a captured answer rather than a
reconstruction. (Raised on PR #267 and carried here as `carried: #234`.)

## 3. The guarantee split

**Kogaki guarantees citation integrity — a quoted claim was quoted, and its
pin resolves. Gukan guarantees the facts.** Kogaki never guarantees that an
interpretation of a served line is valid; a claim widened beyond its quoted
scope is the author's judgment and is attributed as such (scope travels with
the claim). There is no Fact unit, no fact floor, and no provenance map —
the citation resolve check over the draft's own cites is the sole mechanical
instrument on grounding.

**Measurements:** no article class requiring measurement display exists yet
(product-lab#153, held). When one arrives, *Kogaki's* boundary changes — a
declared measurement input for that class — never Gukan's (PolicyPackage
invariant: Gukan guarantees Unit schema, never data schema).

## 4. Compliance mechanism (established before any pipeline code)

- **Consultation map** (`policy/consultation-map.md`): the occasions file —
  boundaries at which policy consultation is required, grown only by miss,
  entries as pinned quotes + trigger terms, never paraphrased rules. Ships
  with one seed entry (check-infrastructure changes). An entry additionally
  declares a **read prescription** — the act class, and the served gloss
  shard(s) to survey headline-first *before* acting — because `policy_lookup`
  answers only questions the consumer thought to ask, while a standing
  headline read surfaces lines nobody asked about. The prescription sits on
  the permitted side of the finding-aid carve-out: it pre-computes *where to
  ask*, never *what is true* (`topics/knowledge-architecture.md` 2026-08-02).
  An entry added on a miss also records that miss's **postmortem** — the
  violating artifact, the boundary terms that would have triggered, and the
  question **verbatim** that would have found the served line — so the
  accumulated questions become the situation-specific keys for reaching a
  particular ruling. The map still triggers consultation and never carries a
  verdict; a paraphrase in any of these fields is the conformance-copy defect
  the pinned-quote rule exists to refuse (kogaki#24).
- **Check registry** (`checks/registry.json`): the suite runs **only
  registered checks**, and registration requires an admission record — the
  named defect it caught or the contract it uniquely carries, plus the
  licensing issue. An unregistered check file is dead code found by one meta
  check. Admission also declares the check's **removal signal** at birth.
  That signal owes a typed **observing instrument** at admission too — the
  field naming what in this repository would notice the signal's condition,
  or why nothing can. Its grammar is carried once, in
  `checks/registry.json`'s own note, and is pointed at rather than restated
  here; `checks/check-registry-conformance.sh` refuses an admission whose
  instrument is missing or malformed (kogaki#113).

  **The admission record additionally owes RE-EXECUTABLE EFFICACY EVIDENCE**
  (kogaki#243, owner selection 2026-08-08 — fork 1). Constrain-generation was
  applied to check **existence** and never to check **efficacy**: the schema
  requires the record naming the defect caught, and **nothing in this
  repository has ever run that defect against that check**. The named defect
  is therefore self-attested capability prose — the check is admitted on its
  author's belief that it catches what they say it catches, which is this
  repository's own inward-binding defect sitting in the one schema best placed
  to refuse it. So the record gains an `efficacy` field naming the
  **counterfactual** — the named defect *constructed* and the check observed
  to **refuse** it — in a form a later reader can **re-run** rather than
  re-read. Its grammar is carried once, in `checks/registry.json`'s own note,
  beside the `removal_instrument` grammar it deliberately mirrors, and is
  pointed at rather than restated here.

  **This and kogaki#232 half 1 are ONE amendment to one record, and are stated
  together so the pair is not re-solved twice.** Both say the same thing about
  the same artifact: *an admission record's claims owe an observer*.
  `removal_instrument` gives the **removal signal** its observing act;
  `efficacy` gives the **named defect** its observing act. Half 1 is already
  discharged — every registered entry carries a typed `removal_instrument` and
  the conformance check refuses a missing or malformed one — so what remained
  of the pair was this half alone.

  **POLARITY — a SCHEMA OBLIGATION whose SHAPE is gated and whose TRUTH is
  not**, and this is deliberately the opposite polarity from the
  fixture-discrimination clause below. The two differ because their violations
  differ: a derived-from mutant set is violated by an **absence in prose no
  check reads**, while an admission record is a **structured artifact one check
  already parses on every run**. The served rule places each at the layer where
  it breaks:

  > "a **prohibition** needs a mechanical gate at the tool boundary because
  > prose is advisory to a system whose job is to satisfy instructions; an
  > **obligation** cannot be gated at all and needs its absence made visible"

  `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:95`
    request_id: ff355029-3662-4495-ae77-a267ea4580df
    outcome: discriminating
    query: Should a schema obligation requiring an admission record to contain re-executable efficacy evidence be enforced as a mechanical gate at the tool boundary, or stated as an obligation with visible absence? Is a required record FIELD a prohibition or an obligation for enforcement-layer purposes?

  **A missing or malformed `efficacy` field is a computable fact about a
  committed artifact, so it is gated** — the same carrier, on the same run,
  that already refuses a missing `removal_instrument`. This is the ratified
  constrain-generation shape rather than a new denial:

  > "**CONSTRAIN GENERATION** is the design's best move: the suite runs only
  > REGISTERED checks and the **registry schema REQUIRES the admission
  > record** … so an unregistered check file is dead code found by one meta
  > check rather than a policed behaviour"

  `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:70`

  **Whether the counterfactual is a GOOD one stays judgment and is never
  gated.** The check validates that the field is present and well-formed; it
  does not decide that the constructed defect is the defect the record names.
  That split is the same one the `probe:` instrument already runs under —
  evaluated mechanically, rendered report-only, with the judgment left where
  it belongs. **§2.6.3's ruling is untouched and kogaki#72's blocking budget is
  not reopened**: nothing here reads a review finding or blocks a merge on one.

  **Why RE-EXECUTABLE, and not a citation** — the sub-form that forced it. The
  served rule names the remedy for exactly this weakness:

  > "the check rests on the model's **SELF-REPORT** about its own process,
  > where **a rationale is an attestation rather than evidence** and requiring
  > a reason does not make the reason load-bearing"

  > "a self-report weakness is simulable WITHIN one unit and its remedy is
  > **per-unit EVIDENCE (the counterfactual test)**, not distribution-level
  > measurement"

  `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:86-87`
    request_id: ff355029-3662-4495-ae77-a267ea4580df
    outcome: discriminating

  A citation-shaped efficacy field would have re-bought the defect one level
  along, and kogaki#243's evidence base contains the specimen that proves it:
  **PR #256's faultless transcription, wrong application** — verbatim quotes at
  real pins that did not bear on the claim they were cited for. **That is an
  instance of form E** (*prose asserts a property no carrier holds*), not a
  sixth form: the forms are grouped by **where the binding broke**, and this
  breaks at the description beside the carrier, which is E's site exactly. What
  earns it a name is not a new break site but a new **detectability** — it is
  the only member of E that this repository's **outward** machinery actively
  certifies, the pin resolving and the quote matching, so it presents as
  verified while binding nothing. Recorded as sub-form **E′ — faultless
  transcription, wrong application**, and it is the reason this field carries a
  command rather than a cite: a cite is exactly the artifact E′ passes through.
- **Fixture discrimination** (kogaki#230): a diff that **adds or changes a
  fixture** carries its **mutation evidence** in the PR record — the mutation
  table, naming each mutation and which fixtures fail it. A fixture
  *discriminates* when it can fail on the defect it guards, and the only proof
  is reverting that fix in isolation and watching the fixture fail.

  **Scoped to the fixture-bearing DIFF, deliberately not to check admission.**
  The specimen is kogaki#209: three of kogaki#203's four regression fixtures
  passed with the defect present, behind a green `38/38` line claiming
  protection that did not exist — and story 1.36 repaired that by amending
  fixtures **inside an existing registered check**, admitting nothing. A clause
  riding the admission record above would therefore not have covered the
  instance that produced it. Coverage is the set of occasions a carrier is
  installed on, and admission is the wrong occasion:

  > "A managed block pointing at a file the harness never loads is
  > **installation on zero occasions**, and it is strictly worse than no
  > installation because the pointer's existence is what stops anyone
  > checking."

  `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/knowledge-architecture.md:29`
    request_id: e405d81b-8cb4-4cd8-a832-7178f577bf51
    outcome: discriminating
    query: an obligation attached to a registration event rather than to the act itself — does it cover the occasions the act actually occurs on

  **This is an OBLIGATION, so it gets prose plus a visible-absence signal and
  never a gate.** An absence produces no event to hook, so nothing can deny it;
  the review lane reads for the table's presence under its dimension 1, and
  absence is a finding at the kogaki#72 budget's severity. **Nothing gates
  mechanically** on the table's presence or content — presence of prose is not
  a property worth a mechanical gate, and the table's *truth* is judgment.

  **The rule lives here and its read lives in the lane, and both are required.**
  Siting it only in `.claude/skills/review-lane/SKILL.md` would bind only the
  sittings that invoke that skill — and an **authoring** sitting never does:

  > "a **skill binds only the sittings that invoke it**, so siting the rule
  > there reproduces exactly that failure … it lands as a stated obligation
  > plus a visible-absence signal, **never a pretend gate**"

  `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/archive/knowledge-architecture.md:40`

  **No mutation-testing harness, and the decline carries its reopen trigger.**
  Every instance since story 1.36 was caught by the practice or by the lane, so
  machinery here would be expansion ahead of escape evidence. **The trigger is a
  vacuous fixture shipping past review despite this clause.** `instrument: none`
  — no standing act in this repository observes that condition, and none is
  invented; it would be seen by the sitting that next mutates the fixture and
  finds it already green.

  **THE TRIGGER ABOVE HAS FIRED, and the look it licensed produced the
  derivation constraint below rather than the harness** (kogaki#243, owner
  selection 2026-08-08 — fork 3 of the four the issue framed). The firing is
  recorded at the clause rather than only on kogaki#230, because a trigger
  whose firing is legible only on the issue that declined the machinery is a
  reopen condition nobody re-reads. **PR #240 carried a compliant mutation
  table and shipped three form-A fixtures in the same diff** — the evidence
  form was present and the class shipped anyway. What the look concluded is
  that the escape was **not** an absence of machinery: a harness executing the
  author's own mutant list would have run the same blind spot faster. So the
  harness stays declined, on stronger evidence than before, and the repair
  lands one step upstream — on **where the mutant set comes from**.

  **THE MUTANT SET IS DERIVED FROM THE DIFF, never authored free-form.** Each
  **changed default, changed flag, and changed literal in the diff is a
  mutant**, and the mutation table accounts for every one of them — caught,
  with the assertion that catches it named; or **uncaught and declared as
  uncaught**; or equivalent, with the equivalence argued. A mutant is
  discharged by naming its catching assertion, never by omission, and **an
  uncaught mutant is a declaration rather than a defect** — dropping it is the
  defect.

  **The diagnosis this repairs, stated because the clause is otherwise a
  preference.** The mutation set was authored by the same belief that authored
  the fixture: the author mutates the hypotheses they hold — for PR #240,
  "don't write the rendering" and "emit JSON" were both mutated and both
  caught — and cannot mutate the one they do not hold, so "the flag is absent"
  never became a mutant, **because the fixture supplied the flag**. Derivation
  breaks that inheritance without adding machinery, because the diff is not
  written by the belief under test. The served rule gives the shape:

  > "an **enumerated prohibition can only name yesterday's leak** while a
  > **construction constraint makes tomorrow's unreachable**"

  `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:53`
    request_id: b63f89de-d860-4dfb-9988-a7000fe1cee3
    outcome: discriminating
    query: enumerated prohibition construction constraint non-member fallback admit constrain generation not post hoc detection

  A freely authored mutant list is exactly the enumerated shape, and its
  **non-member fallback is ADMIT** — the mutant nobody thought of is silently
  absent, and the table still reads complete. Deriving the set from the diff
  replaces that enumeration with a construction rule whose members the author
  does not choose:

  > "When a ruling is executed as constrain-then-detect, the **detect half
  > must be derived from the ruling's CLASS**"

  `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/claude-code-ops.md:67`
    request_id: 49e9990d-f8dc-4c4a-a438-63ac78fbfd03
    outcome: discriminating
    query: Should a constraint requiring a mutation/mutant set to be DERIVED from the diff rather than authored free-form become a lint or automated check, or stay judgment-class prose with a reopen trigger?

  **POLARITY — an OBLIGATION, per-artifact-decidable, and NOT a lint.** The
  three-states rule admits a stated policy in exactly three states, and this
  clause takes the **first**: *per-artifact-decidable — state it, because the
  artifact is the evidence and a mechanism adds nothing*. Both artifacts are
  already in the PR record and already in front of the reader — **the diff and
  the mutation table** — so "does every changed default, flag and literal
  appear as a mutant" is answerable by reading the two against each other. It
  is not the distributional shape, which no single occurrence can violate, and
  it is not the self-report shape, because the mutant list is checkable against
  the diff rather than against the author's account of their own process.

  **And it does not become a lint.** The repository has ruled at its strongest
  against mechanizing a rule that merely *looks* deterministic:

  > "**No rule becomes a lint, even where deterministic processing is
  > possible.**"

  (`specs/spec-draft-pipeline/SPEC.md` §4.6 clause 3.) The looks-mechanizable
  reading is real and is refused explicitly: a parser can enumerate changed
  literals, and it cannot decide **which** of them the behavior under test
  depends on, whether a named assertion actually catches its mutant, or whether
  an equivalence argument holds. Those are the judgments the clause exists to
  make someone perform. A lint over the mechanical half would report the shape
  of a derivation while the derivation's content stayed unexamined — the
  presence-passes-for-judgment defect this whole issue names, rebuilt inside
  its own repair. **This clause is judgment-class, and no check is licensed by
  it.**

  **`instrument: none`** — no standing act in this repository observes a mutant
  that was never derived, and none is invented, because the condition is an
  absence from a table no check reads. **The reopen trigger:** a diff whose
  mutation table omits a changed default, flag or literal that a later sitting
  finds was the defect the fixture failed to catch. That is the same
  observation shape that produced this clause, and it would be seen by the
  sitting that next repairs a fixture and finds the mutant was derivable from
  the original diff all along.

  **Why the clause is timed now rather than after the next instance.** The class
  recurred in four consecutive sittings — kogaki#209's three dead fixtures,
  story 1.38's terminal-line fixture passing against its own mutant, stories
  1.37 and 1.39's producer halves that no consumer fixture exercised, and
  kogaki#227's fix that would never have fired on a real run — every one caught
  by a mutation pass and none by reading, while the rule propagated as
  remembered prose. kogaki#220 and #223 are about to author fixtures at volume
  in sittings that were not present for story 1.36.

- **External-dependency registry** (`deps/registry.json`): the capabilities
  this repository **needs but cannot install** — a spawned session's tool
  grants, a repository setting, a user-level hook's install state — declared
  rather than assumed. Each entry names the acts that break without it, **the
  read that decides presence** where one is decidable (and a typed
  `none: <why>` where none is), and **the signature its absence leaves
  behind** — the field that converts an unexplained stall into a recognised
  one. An unmet dependency is **reported, never gated**: the check fails on a
  malformed entry, never on a world that currently fails to satisfy one. A
  capability outside the enumeration is surfaced **report-only with its
  reason** — the non-member fallback is the load-bearing half, because
  dependency N+1 escapes any enumeration and only its escaping *silently* is
  avoidable. Contract at `specs/spec-external-deps/SPEC.md`, machine-readable
  shape at `specs/spec-external-deps/deps-schema.json` (kogaki#55).
- **PR gate, split by property type:** the mechanical half (change licensed
  by a named issue; new checks carry admission records; registry
  conformance; **a touched consultation-map boundary has a receipt**) runs
  unconditionally in CI/hooks; the judgment half (does the diff match its
  license; consultation-map boundaries touched) runs in the review lane. A
  checker appearing in a PR without a license is refused, and the work
  re-routes to an issue.

  **The judgment half runs in a session that did not author the work under
  review, and that isolation is a requirement rather than a convenience**
  (kogaki#34). An authoring session cannot review its own work for the class
  of defect that consists of not having applied what it already held: the
  specimen is kogaki#32, where a coined token set shipped while the ratified
  vocabulary sat unused in the authoring session's own context, and an
  independent review caught it in one pass. So **every PR receives a
  review-lane report authored outside the authoring session before merge**.

  **The property is CONVERGED OR ESCALATED, not reviewed-once** (kogaki#34,
  amended 2026-08-05). A report that lands findings and is never answered
  leaves the PR reviewed and unimproved, so the lane and the author **rally**:
  findings return as PR comments or as correction instructions, the author
  applies them, and the reviewer re-reads — **up to two rounds**, after which
  the disagreement is a **parked owner decision, never a third round**. The
  bound is the same discipline the failure rule already carries: a
  disagreement surviving its machine-machine retry is a decision a human owns.

  Four clauses keep this inside the two-layer split rather than moving
  judgment into the merge layer:

  1. **The lane stays findings-only and emits a typed findings record** —
     severity-marked, primary capture, attached to the PR. The mechanical
     half reads **report present ∧ no open blocking findings**. Whether a
     finding *is* blocking is the reviewer's judgment; whether the PR
     *contains* an open blocking one is a computable fact over a declared
     record, which is the split's own test — "whether a work item LICENSES a
     check is a judgment … whether a PR CONTAINS an unlicensed check is a
     computable fact carried at the merge layer"
     (`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:36`).
  2. **The reviewer never pushes to the branch.** Corrections are comments or
     instructions; the author applies them. A reviewer that authors a fix
     stops being a control arm, and round two would have no isolated reviewer
     left.
  3. **Two rounds, then a parked owner decision.** Never a third.
  4. **Every round leaves its record** — report, correction instruction,
     round count — so the postmortem hand-off can mine rally residue: a
     finding that took two rounds to land is evidence about the map or about
     author-side prescriptions, harvested without anyone remembering to.

     **The record begins at the SPAWN, not at the report, and a round IN
     FLIGHT is representable** (kogaki#204, owner selection 2026-08-07). A
     poll reads state; **it must never re-fire the trigger it is waiting
     on.** `tools/review-sweep.sh --spawn --pr <n>` spawned a session on
     every invocation with nothing relating one invocation to the round
     already in flight, so run inside a polling loop — the natural way to
     wait, since the tool is the only thing that reports the round's state —
     it re-fired the trigger it was being used to watch. Measured on PR #180:
     three sessions completed (29, 24 and 33 turns) and the budget read
     exhausted.

     The served position is that a system where one instruction can commit
     all available spend is **missing a component**:

     > "the fault is not the wording of the instruction but the absence of
     > any budget mechanism between the instruction and the spawn"

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/claude-code-ops.md:59`
     (`uncapped-fanout-is-a-harness-gap`)

     **The carrier is the per-round spawn log, which already exists** — and
     kogaki#204's premise that "there is no persisted per-round state today"
     is corrected here rather than carried forward. `spawn_log_path(pr, rnd)`
     is already keyed per PR per round (`tools/review-sweep.sh:1168`), and
     `spawn()` writes the command line into it **before the process starts**
     (`tools/review-sweep.sh:1716`, `:1775-1781`), precisely so "a spawn that
     dies immediately still leaves a file saying what was attempted". What it
     lacks is a **terminal** line, so existence alone cannot separate in
     flight from finished. That is what this clause adds:

     - finished — the terminal line is present, written on **every** exit
       path;
     - in flight — no terminal line, **and the spawning process is observed to
       be alive**;
     - abandoned — no terminal line and the process is observed to be **gone**,
       so a fresh spawn is permitted immediately;
     - cannot-determine — no terminal line and **liveness could not be
       observed** (no recorded pid, or a pid from another host or namespace).
       Only here does the declared staleness window decide, and the decline
       **says that it could not ask**.

     **v2 — LIVENESS IS ASKED, NOT INFERRED FROM SILENCE** (kogaki#227, owner
     selection 2026-08-08). v1 gave the window as the mechanism and had only
     two answers, so a session that **died before reaching its `finally`** left
     the log terminal-line-less and was read as *in flight* for the balance of
     the window — blocking exactly the retry a dead session most needs. The
     served surface rules on the shape:

     > "the 2026-07-22 three-valued rule binds — **not-observed plus
     > source-not-consulted is cannot-determine, never 'absent'** — and the
     > two-valued report is at its most confident exactly when the system knows
     > least"

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/archive/claude-code-ops.md:67`
       request_id: 34cfed61-2496-4d4f-8bf2-3a8a0dabdf66
       outcome: discriminating
       query: a guard that infers liveness from silence when the fact is locally decidable — is a timeout window an acceptable mechanism or a substitute for asking

     `round_state()` was making a **positive claim** — *in flight* — out of
     *no recent write* (not-observed) plus *never having asked whether the
     process lives* (source-not-consulted). The process is locally decidable, so
     the guard now **asks**: `spawn()` records its pid, and a reader probes it.

     **THE WINDOW IS RETAINED AND DEMOTED, NOT DELETED.** It is no longer the
     mechanism; it is what decides the **cannot-determine** case, and that is
     what makes the third value real rather than swapping one mechanism that
     lies-when-blind for another. A pid is machine-local: across a container or
     host boundary the probe means nothing, and the fallback must **announce
     that it could not ask** rather than silently reporting *in flight*. The
     staleness window's declaration-in-configuration rule below is unchanged and
     now governs that fallback.

     **The cost of this polarity is STATED, because v2 argued it in one
     direction only** (PR #231 review round 1). Asking first means an
     **observed-alive round is no longer bounded above**: v1 released every
     round after the window, and v2 releases one **never**, for as long as the
     probed number answers. Two reachable ways that happens — a **recycled
     pid**, since the sweep's pid outlives its run in a log and `kill(pid, 0)`
     cannot tell reuse from the original (a `PermissionError` deliberately
     reading as alive makes this likelier, not less), and a session that
     **hangs alive** rather than dying. Either pins the round permanently, a
     state v1 could not reach.

     **It is accepted rather than repaired here, and the trade is named so it
     is chosen rather than discovered.** The failure v1 had was a *killed*
     session blocking its own retry for the balance of the window — silent,
     recurring, and the #225 specimen; the failure v2 admits is a *hung or
     recycled* pid blocking it indefinitely, which is louder (the decline
     prints on every poll, naming the log and its age) and rarer. Trading a
     silent common failure for a loud rare one is the direction this repository
     takes elsewhere, and it is the reason the fourth token prints the age at
     all.

     **The bound is a NAMED SLOT rather than an unstated remainder:**

         deferred-slot: inflight-liveness-upper-bound
         instrument: the decline line itself — it prints the log path and the
                     age on every poll, so a round pinned past any plausible
                     review duration is visible in the sweep's own output
                     rather than requiring a separate observer

     Filling it means qualifying the recorded pid so reuse is detectable — a
     start-time or the command line beside it, compared at probe — and it is
     **not decided here** because the cheap version (start-time from
     `/proc`) is not portable and the portable version is a second mechanism,
     which is the same ground on which `flock` was declined just below. The
     slot is named per DECIDE-OR-NAME rather than left as a gap the next
     reader rediscovers.

     **The declined alternatives, recorded with their grounds.** An
     **OS-released lock** (`flock`) is strictly stronger for the local case —
     the kernel releases it on any death, including `kill -9`, with no cleanup
     code that could be skipped — and is declined because it adds a second
     carrier beside a round log that already exists and already has readers
     (the same argument story 1.38 used to choose the terminal line over a
     lockfile), because `flock` semantics differ across filesystems so its
     failure is silent and platform-shaped, and because it answers *"is
     anything holding this round"* rather than *"which process"*, losing the
     disclosure the decline line already provides. **Shortening the window** is
     declined because it does not answer the finding — it infers wrongly for
     less time — and because it makes the opposite failure reachable: a
     genuinely slow round would read as abandoned and get a second session
     spawned on top of it, which is kogaki#204's original defect returning,
     bought with the fix for this one.

     **`--dry-run` REPORTS THE GUARD'S VERDICT** (kogaki#227's second defect).
     A dry run predicted `would spawn` while the immediately following
     `--spawn` refused on the guard, so the prediction was **not the act's
     precondition** and an operator who trusted it fired a no-op and read the
     refusal as a new failure. A prediction that does not consult the gate it
     predicts is a different question wearing the answer's clothes. `--dry-run`
     now evaluates the same predicate and says so — `would NOT spawn — in
     flight, Ns remaining` — so the two paths cannot disagree by construction.

     **The staleness window is declared in configuration, never derived.** It
     is a judgment, and a judgment that lives only in code is one nobody can
     see they are relying on.

     **Sited in `spawn()`, not at its call sites** — the same rule this file
     already applies to isolation (`tools/review-sweep.sh:90`), and the same
     place the served line puts the missing component: between the
     instruction and the spawn. A per-call-site guard would leave call site
     N+1 uncovered by default.

     **A second invocation REPORTS the in-flight round and exits 0.** It
     names the PR, the round, the log path and the age. It does not refuse,
     because the documented caller is a **loop**:

     > "when the verdict count is zero, no gate-shaped nag may be emitted —
     > repeatedly walking the owner to an empty gate is exactly the
     > channel-eroding failure"

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/archive/knowledge-architecture.md:197`
       request_id: bf2f2d9f-e144-4eda-9fe8-ce0882bf929f
       outcome: covered-after-reframing
       query: a guard that declines to act should its decline be loud or silent — when does a non-zero exit train the caller to suppress it

     A poll that exits non-zero on its normal case makes *not yet done*
     indistinguishable from *broken*, and the operator's repair is `|| true`,
     which removes the guard by ergonomics. Disclosure is **not** traded away
     for this: the in-flight round is printed on every iteration. Only the
     exit code is at issue, and the loud-refusal alternative was declined on
     exactly that distinction rather than on a preference for quiet.

     **The carrier owes an enumerated reader set, and it is owed at
     implementation rather than discovered one reader at a time:**

     > "a carrier owes an enumerated **READER** set rather than only a write
     > contract … a per-reader fix repairs one reader and leaves the count
     > unchanged"

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:43`
       request_id: 6bd60580-695a-47a4-8c21-074e207bfd92
       outcome: discriminating
       query: a tool invoked inside a polling loop that finds its work already in flight — should it refuse with a non-zero exit or report the in-flight state and exit zero

     (`atomic-writes-say-nothing-about-readers`)

     `rounds_used()`, `rally_cycles()`, `decide()`, `park_class()` and the
     `--recent` path all read round state today; the implementing story
     enumerates them and states which consult the new terminal line.

     Out of scope, declared: `MAX_ROUNDS` itself, the merge gate, and the
     `landed is None` accounting — that last is kogaki#190's **first** cause
     and story 1.35's subject, and this clause governs its second, which is a
     **writer** defect no repair to what `rounds_used()` can read discharges.

     **Two gateway calls, two receipts, recorded where they were brought to
     bear** (PR #213 round-1 nits). The exit-contract fork took two framings;
     each call carries its own `request_id` beside the line it surfaced, and
     the reframing outcome sits on the framing that discriminated. A
     comma-joined pair on one `request_id:` line is one opaque id matching
     neither call — §4's grammar above is singular, and the collision check
     keys on that field.

     **deferred slots: none.**
  5. **A report DECLARES ITS SCOPE — `full` or `delta`** (kogaki#70). A
     round-2 review is a delta review by default: its subject is round 1's
     findings × the fix commits, and it re-reviews the whole diff only where
     the fix touched files outside those findings. That is the right economics
     — the measured rally spent 43 of its 92 turns re-deriving round 1 — but
     it changes what the report *attests to*, and **clause 1's mechanical half
     cannot tell the two apart**: it reads presence and open-blocking findings
     identically whatever the round. An undeclared delta review is therefore a
     narrower assurance wearing a full review's clothes, and the merge layer
     would be trusting a claim nobody made.
     So the scope is stated **in the record** rather than inferred from the
     round number. A report carrying no scope declaration is read as `full`,
     because the pre-kogaki#70 reports are all full reviews and a default that
     silently narrowed them would rewrite history at the gate.
     This adds no computable obligation to the merge layer — the split's own
     test is unchanged, and whether a *delta* scope was appropriate stays the
     reviewer's judgment, which is the half that belongs in the lane.
     **This clause is deliberately CARRIER-LESS, with a reopen trigger**, on
     the same admissibility rule the "no open blocking findings" half below is
     admitted under — carrier-less *by omission* is the defect, and a stated
     policy may be carrier-less only when it says so and names what would
     reopen it. Nothing mechanically verifies that a declared `delta` scope
     was the honest one: a reviewer that declares `delta` and reads nothing is
     indistinguishable at the gate from one that read the fix commits, which
     is the same attestation problem clause 1's carrier-less half already
     records one level down. A detector is declined here because the property
     is *whether the declared scope matches the review actually performed*,
     which is judgment rather than a computable fact over the record.
     **Reopen trigger:** one PR whose round-2 report declared `delta` and
     missed a defect that lay inside the fix commits it claimed to cover.
  6. **A report DECLARES ITS COMPLETENESS, and a fragment counts as nothing**
     (kogaki#74). The report grammar carries a terminal
     `report-complete: <N> findings`, and clause 1's mechanical half counts a
     segment **only** when that line is present and `N` equals the segment's
     own finding lines. A partial report turns nothing green; a split report
     holds the gate red until its last part lands.
     **The specimen is a merge that should not have happened.** On PR #71 the
     reviewer was denied the grants that let it post in one act, so it split
     its report: the first part — resolving the previous round — landed at
     15:50:40, the re-check fired, armed auto-merge completed at 15:51:09, and
     the **complete** report carrying a new open blocking finding arrived at
     15:53:37 on an already-merged PR. Nothing distinguished a complete report
     from the first fragment of one, so the gate read a fragment as the verdict.
     **The served surface names this defect class exactly**, and the clause is
     its instance rather than a local invention:

     > A rule that names a source can be satisfied by a partial projection of
     > it — name what a complete read includes, or every partial view counts as
     > compliance

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:31`

     Clause 1 named the source ("a typed findings record") and never named what
     a complete one includes, so the first fragment counted as compliance. The
     token is the missing half of that naming.
     **Both halves are mechanical**, which is why this belongs at the merge
     layer where clauses 1 and 5 already live: token presence and count
     equality are computable facts over a declared record, exactly the split's
     own test. It is the **per-artifact-decidable** admissible state rather
     than a detector or a carrier-less mark — decidable from the single
     artifact an existing check already inspects
     (`product-lab@f918c515 topics/knowledge-architecture.md:52`), which is
     also why clause 5's carrier-less mark does not travel to it: completeness
     is a *fact* the record carries, where scope-honesty is a judgment. Clause 5's scope declaration and this clause's completeness
     token are **one grammar over one segmenter** — they are specified together
     and implemented in a single pass, because two sequential passes over the
     report parser is how the use-vs-mention defect (kogaki#41) was introduced
     the first time.
     **Compatibility, stated rather than left to discovery:** a report with no
     `report-complete:` line is read as complete, on the same ground clause 5's
     absent-scope default rests on — every report already in this repository's
     history was posted whole, and a default that retroactively voided them
     would empty the gate rather than tighten it. The token binds reports
     written after it ships.
  7. **A report CARRIES FORWARD to a new head when the content it reviewed is
     provably unchanged** (kogaki#96). The head sha is part of presence
     (`checks/check-review-report.sh:44` — "THE HEAD SHA IS PART OF PRESENCE,
     not decoration"), and that binding composes with the toolkit's mandated
     post-squash rebase (`~/work/claude-toolkit/commands/implement-story.md:250`,
     restated at `:418` — "after a squash merge use `git rebase --onto <default>
     <old elder branch>` so the elder's pre-squash commits are dropped rather
     than replayed") into a state with **no legal exit**: the rebase necessarily
     produces a new head, the report is invalidated against it, and clause 3's
     bound forbids the third round that would replace it. Observed 2026-08-06 on
     PR #89, whose only exit was an owner `--admin` merge bypassing branch
     protection — and whose rebase changed **no reviewed content at all**, the
     pre- and post-rebase diffs hashing identically to
     `cf756413139e7a46069343c0517099c8d2de087b`. The park it produced counted
     against the kogaki#72 budget while being caused by the pipeline's own
     mandated step.

     So the pin's SUBJECT is the content and the sha is its INSTRUMENT, and a
     second instrument is admitted for the same pin: **a report naming head A is
     present for head B when the PR's diff against its base at B is
     byte-identical to the diff that report reviewed at A.** The round counter
     is untouched — a carry-forward is not a round and consumes none.

     **The equality is recomputed and RECORDED, never assumed.** A carry-forward
     is a gate EVENT: the check computes both diffs at gate time, compares them,
     and writes the pair it compared into its own output, so a later reader can
     re-run the comparison rather than trust it. A carry-forward that leaves no
     record is the silent re-derivation the served position forbids:

     > the hub's own `gloss_sha:` discipline settles the record:
     > `specs/gloss.md` §2.2 pins a rendering to the sha of the content it was
     > made from, and a mismatch **re-surfaces the gate rather than silently
     > re-rendering**. That mechanism's content is not about lessons — it is
     > that a derived expression's truth is relative to the set it was derived
     > from, so the derivation carries that set and a change to the set is a
     > GATE EVENT rather than a refresh.

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

     Read against this defect the line discriminates in both directions at once:
     it endorses pinning a derived judgment to the content it was made from —
     which is what admits the carry-forward, since unchanged content is an
     unchanged member set — and it refuses the *silent* refresh, which is what
     makes the recorded recomputation load-bearing rather than decorative.

     **The weakening is stated rather than argued away.** A sha is
     self-evidencing; a recomputed equality is only as good as its
     recomputation and its base resolution. Two bounds keep it honest: the
     comparison is over the diff **against the base**, so a base that moved is
     VISIBLE in the comparison and yields no carry-forward whenever it changed
     the diff; and an equality that cannot
     be computed — either diff unreadable — is **not** a carry-forward but the
     existing `stale` state, failing toward the reviewed side, on the same
     ground clause 1's head-unknown state already occupies. This is
     per-artifact-decidable at the merge layer, the admissible state clauses 1,
     5 and 6 already occupy, and it adds no judgment clause: whether the diffs
     are equal is a computable fact over two artifacts the check can read.

     **`deferred-slot: report-base-resolution` is FILLED** (owner decision
     2026-08-06, kogaki#96): **(c) — the base is RECORDED IN THE REPORT.** The
     report grammar gains a base field, so the base of head A becomes a **read
     rather than a derivation**.

     The slot asked **how the check obtains the base of head A**, the one input
     this clause names and does not supply: a report recorded the head it
     reviewed (`review-lane report: <head sha>`) and **not** the base it was
     diffed against, so "the diff that report reviewed at A" was not
     recoverable from the record. It is recorded now, on the adjacent-line
     grammar stated below.

     The ground for (c) is this clause's own weakening: the admission of a
     second instrument is only as strong as its base resolution, and (c) is the
     one resolution that makes the base a **recorded fact** rather than a
     reconstruction. It is also the only one that survives a rewritten history
     — a force-push, a re-based base branch or a squashed elder each destroy
     the history (a) and (b) read, and neither notices that it has.

     The alternatives, recorded because a decision without them is an
     assertion. *(a) — use the PR's CURRENT base.* Free, no machinery, no
     grammar change. Declined as **wrong exactly where this clause needs it
     right**: it is wrong when the base moved, which is the case the weakening
     paragraph above relies on to *refuse* a carry-forward. A round-2 review
     demonstrated the inversion on this repository's own artifact — story
     1.26's AC 6 names a **moved-base no-carry-forward** fixture, and under (a)
     that fixture inverts, because both diffs are taken against the same
     current base and the base move becomes invisible. An option under which
     this clause's own counter-example cannot be written down is not a cheaper
     (c); it is a different rule. *(b) — use the merge-base at A.* Computable
     from history alone, no grammar change. Declined as **re-deriving a fact
     rather than reading one**: it reconstructs the base from history instead
     of reading what the reviewing act held, and can differ from the base CI
     actually used — in which case the check compares a diff nobody reviewed
     against a diff nobody produced. It is nonetheless sound in *direction*, a
     moved base does move the merge-base, which is why it survives below as the
     transitional fallback rather than being discarded outright.

     The discriminating served position, quoted verbatim at its pin:

     > ask first whether the thing is a fact or a judgment: a fact gets a
     > mechanical carrier at the moment it is decidable, and a judgment rides a
     > gate that already exists

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:58`

     The base of a reviewed diff **is a fact, and it is decidable exactly
     once** — at the moment the reviewing act runs. Afterwards nothing recovers
     it: (a) and (b) do not read that fact, they reconstruct a candidate for
     it, which is the substitution the fact/judgment split exists to route
     away from. This clause had already classified the subject correctly — "the
     pin's SUBJECT is the content and the sha is its INSTRUMENT" — and the base
     is the other half of what makes a diff the content it is. And the layer
     rule sites the carrier:

     > when that layer belongs to another system, the carrier goes at the last
     > boundary you control

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

     The history a base lives in belongs to git and to whoever force-pushes it.
     The last boundary this repository controls is the report the reviewing act
     writes, which is where the fact is therefore carried.

     **THE GRAMMAR CHANGE, grounded in the parser that must read it.** The base
     rides an **adjacent line beside the report token**, never a widening of
     it:

     ```
     review-lane report: <head sha>
     review-base: <base sha>
     review-scope: full | delta          — absent is read as `full`
     finding: ...
     report-complete: <N> findings       — absent is read as complete
     ```

     `review-base:` is anchored WHOLE exactly as its two siblings are, takes
     the same 7–40 hex sha the report token takes, is read in the **same single
     pass** over the **same segmenter**, and the **first declaration wins** — a
     second is a malformed report, not a correction, on clauses 5 and 6's
     established rule. Its value is the commit the reviewing act **actually
     diffed against**, read as a value in that same act under the
     never-reconstruct-a-sha rule kogaki#91 imposes on the head; a base sha
     assembled from a prefix is the same defect one field over. **Absent means
     no recorded base** — the transitional case below — and never a default
     sha.

     The adjacent form is not a preference. Widening the token to
     `review-lane report: <sha> <base>` is the shape that was **exercised and
     failed** for the scope declaration (story 1.17, through
     `tools/review-sweep.sh`'s embedded fixture pass): with the token's regex
     not widened in lockstep, a declared report segmented to **nothing** and
     was read as *absent*. That regex lives in two files —
     `checks/check-review-report.sh:188` and `tools/review-sweep.sh:628` — and
     an adjacent line leaves **both untouched**, which is precisely why clauses
     5 and 6 already have this shape. A third declaration on the established
     pattern is the change whose failure mode does not exist.

     **The cost, stated rather than absorbed. Reports written before the field
     ships carry no base at all**, and the carry-forward cannot read one from
     them. Those reports fall back to **(b), the merge-base at A** — and
     deliberately **not** to (a), because (a) is the option this fill just
     declined for making a base move invisible, and a fallback that fails open
     on this clause's own counter-example is worse than no carry-forward at
     all. (b) fails toward the reviewed side: where the merge-base it
     reconstructs is not the base CI used, the diffs differ and the result is
     the existing `stale` state, which is the safe one.

     **That fallback is TRANSITIONAL, not a second permanent instrument**, and
     it carries an end condition rather than an intention: it applies only to a
     report carrying no `review-base:` line, so it expires when the last such
     report is no longer live on an open PR — no flag, no configuration, and
     nothing to remove but the branch of the check that reads it. A permanent
     second base resolution would reintroduce one layer down the fork this slot
     just closed, and would be indistinguishable from having selected (b).

     **What (c) does NOT make true, recorded so the next reader does not
     over-read it.** A recorded base makes a base move *visible*; it does not
     make every base move a refusal. A base that moved and left the diff
     **byte-identical** still carries forward — and that is this clause's
     subject/instrument rule operating correctly rather than a leak, because
     the pin's subject is the content and the content is what was compared.
     What (a) loses is not the refusal but the *visibility*: it cannot tell the
     two cases apart at all.
  8. **A non-gating finding left OPEN at `done` carries a stated DISPOSITION,
     and the `done` boundary REPORTS the ones that do not** (kogaki#224, owner
     selection 2026-08-08 — arm 1 of the three candidate homes the issue
     framed). The lane contract already says a `should` or a `nit` is
     non-gating "with a follow-up filed where one is owed"
     (`.claude/skills/review-lane/SKILL.md`), and **nothing carried that
     clause**, so it was advice. This clause gives it a carrier and changes
     what `done` *asserts*: not merely that nothing blocking is open, but that
     every non-gating finding still open has been **dispositioned or named as
     undispositioned in the sweep's own output**.

     **THE POLARITY IS REPORT, NEVER GATE, and it is stated first so the fix
     cannot degrade into the thing it repairs.** kogaki#72's budget rules that
     `should` and `nit` never gate a merge; that budget is **ratified
     economics and nothing here reopens it**. The merge layer is
     **untouched** by this clause — `checks/check-review-report.sh` reads
     presence and open *blocking* findings exactly as before, and a PR whose
     every non-gating finding is undispositioned still merges. What changes is
     that the sweep says so, out loud, at the boundary where the loss happens.
     The served surface rules on the direction:

     > the review lane's judgment half must **NEVER be designed to depend on a
     > blocking review verdict** — the shipped design already satisfies this,
     > its merge-layer check reading a typed findings record with the platform
     > verdict nowhere in it, but it was arrived at for a different reason, so
     > this is now a property the design must KEEP rather than a coincidence it
     > currently enjoys

     `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/claude-code-ops.md:29`
       request_id: 1a1657f0-a376-4a16-b889-c382a1b77b44
       outcome: discriminating
       query: A review lane's non-blocking findings are non-gating by a ratified budget, and they evaporate at merge because nothing re-reads them. Should the carrier that observes undischarged findings at the done boundary REPORT them, or gate on them?
       query: Is the ratified blocking budget that makes should/nit findings non-gating still the live word on that decision's disposition, or has a later verdict superseded it — and does adding a disposition record at the merge boundary reopen it?

     **The gap is CONFIRMED on the served surface, and this issue is named as
     its carrier**, so the clause is an instance of a recorded position rather
     than a local invention:

     > The findings-lifecycle gap the specimen exposes — non-gating findings
     > correctly left open at merge under the blocking budget, with no carrier
     > filed for two of them — is CONFIRMED and already carried at kogaki#224;
     > no new carrier is filed. … the lane finds reliably, and **nothing yet
     > guarantees a found non-blocking defect survives the merge it rightly did
     > not block**

     `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/claude-code-ops.md:10`

     **THE SPECIMEN IS THIS REPOSITORY'S OWN WORK, at n=3 in ~24 hours.** PR
     #221 (story 1.36) merged 2026-08-07T11:32 with **five** findings open and
     **zero** carriers — three `should`, two `nit` — one of them a real
     shipped defect (`indentedPinQuotes` reports a wrong line number whenever a
     fenced block precedes the offending line, because `stripFences` *deletes*
     rather than blanks). PR #231 merged with three `should` open, repaired
     post-merge in #238; PR #240 merged with eight open, repaired post-merge in
     `f2f986c`. **Every one of those merges was correct.** Both repairs
     happened because somebody re-read the report *by chance*, which is the
     diagnosis: the discharging act was unnamed.

     > A deferral is discharged only if some standing command owns its class —
     > an item whose discharging act is unnamed produces no surfaced next
     > action, and **that silence is caused by the gap rather than evidence of
     > completeness**

     `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:45`
     (`a-tracking-artifact-names-its-discharging-act`)

     **THE GRAMMAR — an adjacent line beside the finding it disposes of**, on
     the established shape clauses 5, 6 and 7 all use, and for the same reason:
     the `finding:` token stays byte-identical, so no reader can be
     desynchronized by construction.

     ```
     finding: should open  <the finding>
     carried: #<N> | register            — a named carrier
     declined: <reason>                  — an explicit decline, reason required
     ```

     - The line binds to the **immediately preceding `finding:` line** in the
       same segment. A disposition before any finding disposes of nothing.
     - **First declaration wins.** A second disposition on one finding is
       ignored, exactly as a second `review-scope:` is — a later line must
       never revise an earlier claim.
     - **Anchored whole**, so `carried:` or `declined:` inside a finding's
       prose is a **mention and declares nothing** — the use-vs-mention rule
       kogaki#41 fixed once and clauses 5–7 already carry.
     - `declined:` **requires a non-empty reason.** A bare `declined:` is not a
       disposition; it is the evaporation with a word in front of it.
     - A disposition on a `resolved` finding is harmless and unread: the
       property is about what is still **open**.

     **WHAT THE CARRIER READS IS PRESENCE, AND NEVER ADEQUACY.** Whether a
     stated disposition is the *right* one is judgment and stays in the lane;
     whether a finding carries one is a computable fact over a declared record.
     That is the split's own test, and the served surface states the trade
     rather than leaving it to be discovered:

     > *Is a recommendation block present, and does it carry either grounds or
     > a typed miss?* is a fact the acting code can compute at the moment it
     > acts; *is this recommendation any good?* is a judgment no machine can
     > settle, and a check reaching for it would produce unpredictable
     > denials — the guard nobody can predict is the one the operator routes
     > around. … this check is satisfied by a well-formed block carrying a BAD
     > recommendation, and that is the correct trade

     `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/claude-code-ops.md:19`
     (`authenticate-facts-mechanically-gate-judgments`)

     So `declined: not worth it` satisfies this clause. It is a **record
     somebody can argue with**, which is exactly what five findings living only
     in a comment nobody re-reads were not.

     **WHICH CARRIER A DISPOSITION NAMES IS DECIDED BY WHERE THE DEFECT LIVES**,
     never by severity and never by this repository's default routing:

     > In the diff's own text → the review, resolved before merge; downstream
     > work the diff merely licenses, or a decision the contributor cannot
     > make → its own carrier, not blocking. **Location selects, never
     > severity.**

     `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/claude-code-ops.md:28`
     (`a-routing-habit-reads-as-conformance-outside-its-domain`)

     **THE REGISTER IS AN ADMISSIBLE CARRIER, so this clause does not mint one
     issue per nit.** `carried: register` names the review lane's register,
     **kogaki#246** — the carrier kogaki#191 split out; kogaki#13 is the lane's
     *deliverable* record and is not its register. This clause **names** that
     carrier and asserts nothing about its state; the register's own semantics
     and lifecycle are resolved at kogaki#246 rather than restated here. It is
     the right home for an **accretion-class**
     finding — a mechanical observation whose value is the count rather than
     the instance, the class the lane's `out-of-dimension:` line already routes
     there. Requiring an issue for each would convert this clause into the
     accretion machine the check-suite economics exist to prevent, and the same
     served line that admits the register warns that "registering everything
     kills the cadence".

     **WHAT `done` PRINTS.** When the state machine reaches `done`, it lists
     every **open non-gating** finding on the current head that carries no
     disposition line — `should`, `nit`, and a `blocking open` the merge layer
     has **downgraded to `should` for want of a justification**, which is in
     the class precisely because it fails toward merge. It names the count and
     the severities, it exits **0**, and it never turns anything red. A `done`
     with nothing undispositioned prints nothing, on the same
     no-gate-shaped-nag rule clause 4's in-flight report already obeys.

     **THE DECLINED ARMS, recorded with their grounds** rather than dropped.
     *Arm 2 — `done` posts one comment enumerating the undischarged findings
     beside the report it annotates.* Declined: it makes the sweep a **writer
     on the PR**, and the sweep's own tooling already carries the
     one-composition-one-post discipline precisely because an automated
     poster's failure mode is duplicate comments on every poll — a `done` state
     is re-reached on every invocation, so the natural implementation posts
     once per poll and the careful one needs its own idempotency record. The
     report arm needs neither, and the operator running the sweep is the reader
     the record is for. It stays the better arm the day a *non-operator* needs
     the record, and that is its reopen trigger.
     *Arm 3 — a registered check reading disposition lines mechanically.*
     Declined on the budget itself: by kogaki#72 such a check must **fail
     toward merge** on `should`/`nit`, which makes a deny-side instrument the
     wrong tool for the property — it would be a registered member that can
     never deny, and admission additionally owes it an admission record and a
     removal signal it has no way to earn. The issue itself names this ("which
     makes a deny-side check the wrong tool"), and the decline is recorded here
     rather than left implicit.

     **Out of scope, declared:** the blocking budget (untouched), the merge
     gate and `checks/check-review-report.sh` (untouched), and whether a
     *stated* disposition was the honest one — that last is judgment, and it is
     the same side of the split clause 5's scope declaration sits on.

     **deferred slots: none.**

  **The "no open blocking findings" half is CARRIER-LESS, and is marked
  rather than omitted.** An empty findings record satisfies it, and nothing
  distinguishes a thorough review that found nothing from one that looked at
  nothing — the check rests on the reviewer's self-report about its own
  process, where a rationale is an attestation rather than evidence. A stated
  policy is admissible as per-artifact-decidable, as detector-designed-in, or
  as deliberately carrier-less **with a reopen trigger**; carrier-less *by
  omission* is the defect
  (`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:52`).
  **Reopen trigger:** one PR that passed this gate with an empty findings
  record and later needed correction.

  **Blocking is a budget, not a severity feeling** (kogaki#72, owner ruling
  2026-08-06). The lane is a policy check and a critical-issue filter; the
  single-pass merge is the norm and a park is a measured pipeline defect
  against a ~1-in-100 budget. Three classes may block — ratified-position
  violation the merge would propagate, pipeline breakage, unlicensed scope —
  and a blocking finding carries its one-line justification in the record
  (`[policy: <pin>]` or `[harm: …]`). The mechanical half reads the
  justification's PRESENCE only: an unjustified blocking does not gate and is
  downgraded to `should` by name, failing toward merge; its ADEQUACY stays
  the lane's judgment. Every park posts its postmortem stub (what blocked,
  which class, rounds spent) where the park is announced, and the park count
  is the number the budget is measured against.

  **Three clauses bind the review's own conduct**, and belong to the lane
  rather than to the gate: the review opens with an **unscoped tier-1
  `gloss_index` survey** as a fixed first move — where to look is an output
  of the survey rather than a heading the reviewer supplies; **the seam
  is never asked for a verdict** — the review supplies the claims, the seam
  supplies the positions; and **a refusal is terminal for that command**
  (kogaki#100).

  **A refusal is terminal, and the blocked dimension is REPORTED rather than
  retried.** When a reviewer composes a command its grants do not admit, the
  refusal ends that command: the session records it, states the blocked
  dimension in the report as a `cannot-determine`, and finishes the review. A
  second attempt at a refused command — in any rephrasing — is itself refused.
  A single missing grant then costs one capability rather than the whole
  review.

  **This is a RELOCATION, not a new rule.** The rule already shipped as prose,
  in the `COMPOSITION` prompt kogaki#74 added — `tools/review-sweep.sh:759`
  ("never re-attempt a refused command in another form") and `:775` ("Do not
  spend turns probing for a form that gets through") — and was measured failing
  on the very next PR. On PR #98 the post-kogaki#74 prompt was present in the
  second spawn's own context while that spawn spent its last four turns
  rephrasing one refused command; the first spawn issued nine denials of one
  intent and re-issued an identical `git worktree add` with
  `dangerouslyDisableSandbox: true`. Both ended `error_max_turns` and neither
  posted a report. The served position names why prose was never going to hold
  it:

  > A rule is enforced only at the layer where it can be broken — a prohibition
  > needs a mechanical gate at the tool boundary because prose is advisory to a
  > system whose job is to satisfy instructions; an obligation cannot be gated
  > at all and needs its absence made visible … and when that layer belongs to
  > another system, the carrier goes at the last boundary you control, with any
  > gate upstream of it counting as ergonomics rather than control.

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

  The permission boundary belongs to the harness, so **the carrier goes at the
  last boundary Kogaki controls** — the spawn wrapper in the lane-command
  layer, where the orchestration property below already lives — and the report
  grammar gains the `cannot-determine` line that gives the reviewer somewhere
  to put the blocked dimension, so a refused capability degrades a dimension
  instead of deleting a report. The prompt text stays and is reclassified as
  **ergonomics rather than control**, which is the served line's own word for
  a gate upstream of the violation layer.

  **kogaki#74's resolution is what makes this the designed steady state rather
  than an edge case**: by refusing three proposed grants and naming granted
  alternatives instead, it decided that a reviewer meeting a refusal and
  routing around it is normal operation, not an accident. A designed steady
  state whose only carrier is a prompt sentence — one already observed not to
  hold — is carrier-less by omission.

  **`deferred-slot: refusal-signal-source` is FILLED** (owner decision
  2026-08-06, kogaki#100): **the EVENT is primary and the TERMINAL FIELD is
  the backstop.** The wrapper keys prevention on the in-session
  `{"type":"system","subtype":"permission_denied"}` stream event, and keeps the
  terminal `permission_denials` field of the `{"type":"result"}` record as the
  guaranteed measurement path. Prevention when the CLI supplies the event;
  honest measurement always.

  The slot asked **which signal the wrapper keys the terminal refusal on** — an
  in-session permission-denial signal, or the after-the-fact
  `permission_denials` field. **This was decided on measurement rather than on
  argument, and the measurement is recorded here because it is the evidence.**

  - **The field is TERMINAL-ONLY, so the fork as originally framed was
    mis-stated.** Across the real route logs in `~/.kogaki/reviews/` the key
    `permission_denials` appears on **zero** non-`result` objects; every
    occurrence is on the `{"type":"result"}` line, always the last line of its
    spawn. There is no "in-session field" to choose. At the decision the count
    was **33 logs carrying 282 denials**; re-counted at the close of the same
    run it is **33 of 35 logs carrying 294 denials** — the totals moved because
    the run kept reviewing, and the zero did not.
  - **An in-session EVENT does exist, under a different name.** It is emitted
    at the moment of the denial, one per denial, before the corresponding
    `tool_result`:
    `{"type":"system","subtype":"permission_denied","tool_name":…,`
    `"tool_use_id":…,"decision_reason_type":…,"message":…}`. Coverage against
    the terminal field is **exact and 1:1 by `tool_use_id` — no misses, no
    extras — WITHIN every log that carries events**, and the unit is **events**:
    **26** at the decision, **40** at the re-count. **State the share, because
    "no misses" is otherwise read as covering the corpus:** those are 26 of the
    282 denials then and 40 of the 294 now — the event-carrying logs are the
    7 logs from the 2.1.223 boundary onward, and the ~86% remainder are
    2.1.222 logs that carry the terminal field and **no** events at all. The
    1:1 claim is about the logs where the capability exists; it is not evidence
    about the ones where it does not, and it is the same fact as the version
    premise below seen from the other side.
  - **It arrives with real lead time**, which is the whole point: PR #102's
    first denial event is at log line 33 of 189, with ~156 stream lines still
    unspent. On PR #98 — the specimen this clause was written from — the first
    event is at line 52 of 546.
  - **It is CLI-VERSION-SCOPED, and the boundary is inside this very run.**
    `pr-90-round-2.log` (CLI **2.1.222**, 09:55) carries 12 denials and **zero**
    events. Every log from 11:03 onward is **2.1.223** and carries full
    coverage. The capability appeared mid-run and can leave the same way.

  **PREMISE 1 — the version dependence is STATED, not assumed, and the carrier
  degrades to the backstop rather than to nothing.** This clause's prevention
  half holds **on the premise that the harness emits the
  `permission_denied` system event** — observed on Claude Code CLI 2.1.223 and
  observed *absent* on 2.1.222. The premise is written down in the shape this
  repository already uses for one, because the alternative has a measured
  failure mode: an automation policy that ran for months "on the unstated
  premise that every open PR was the owner's own" was falsified by an
  environment nobody had related to the flag —

  > the conjunction must also include ENVIRONMENTAL properties … which no
  > consumer of the flag evaluates, so the environment changes out from under
  > every consumer with no carrier noticing

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/claude-code-ops.md:31`

  and the served surface requires the scope be **named** rather than left as a
  claim about the world:

  > when the failing layer sits outside the repository, the violation layer is
  > the HARNESS, and *no carrier is possible* is admissible only as *no carrier
  > is possible in configuration X*, with X named — because the sentence's whole
  > function is to stop people looking

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/claude-code-ops.md:37`

  X is named: **CLI ≥ 2.1.223**. The premise is a **report, never a gate** —
  the same disposition `claude-toolkit`'s merge-eligibility spec reached for its
  own environment precondition (§"Why the environment precondition is a report,
  not a gate") — because a version preflight would be one more check per
  incident and would withhold the lane on exactly the environments that still
  have a working backstop.

  **How the absence is made observable, since an obligation cannot be gated.**
  "The event did not arrive" produces no event to hook, so the remedy is a
  signal, not a check:

  > an obligation cannot be gated at all and needs its absence made visible

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

  > prohibitions get mechanical carriers, obligations get prose plus a
  > visible-absence signal … the act stays behavioral, its absence made
  > observable rather than discovered late

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:177`

  So the wrapper **reconciles the two signals at the end of every spawn** and
  states the result in the run log: the count of events it observed in-session
  against the count in the terminal `permission_denials` field. An absent event
  path then reads as **"prevention unavailable this run — N denials measured,
  0 prevented"**, and never as "no denials". This is the second conjunct of
  reachability the served surface names — a path whose guard is constant-false
  is indistinguishable from a deliberately-disabled one, "leaving a declared
  observable over a real run as the only thing carrying the intent"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:38`).
  **The measurement half never degrades**: AC 5's count comes from the terminal
  field, which is present on every spawn at every version observed.

  **PREMISE 2 — refused is cleanly separable from FAILED, and NOT from
  REPHRASE-ABLE.** The counter this slot was named with — "refused, will never
  work" and "failed, worth retrying" are not always decidable from the error
  alone — **is discharged for the failed/refused axis and stands for the
  rephrase-able axis.**

  *Discharged.* Of the `is_error: true` tool results in the same logs, the
  denials are **disjoint from the ordinary failures**: at the decision, 282 of
  296 were permission denials and 14 were ordinary failures
  (`jq: command not found`, `File does not exist`, a token-limit refusal,
  `ENOTDIR`); at the close-of-run re-count, 294 of 310 and 16. **None** of the
  ordinary failures carries a denial event or appears in the terminal field. A
  carrier keyed on the **event** — never on `is_error` — therefore cannot read
  a transient failure as terminal. A carrier keyed on `is_error` would, which
  is why the key is named here rather than left to the implementation.

  *Standing, and it must not be papered over.* **The log does not distinguish a
  rephrase-able denial from a dead-end one.** 13 of the 26 events at the
  decision (22 of 40 at the re-count) carry
  `decision_reason_type: subcommandResults`, naming one offending sub-part of a
  compound command — *"This Bash command contains multiple operations. The
  following part requires approval: git fetch …"* — which is precisely the
  class kogaki#74's exercise found had **granted alternatives**. And
  `decision_reason_type` was **absent on 6 of 26** (8 of 40), so it is a weak
  hint at best, never a discriminator. Against that, PR #98's log shows the same
  command denied on a **byte-identical retry**, so "terminal for that command"
  is right about the *command*; what it does not settle is whether the *intent*
  had a reachable form. The implementer must not read "terminal" as "the
  reviewer had nothing else to try": the route to AC 1's `cannot-determine` is
  the correct exit, and naming a granted alternative stays the `COMPOSITION`
  prompt's static job (kogaki#74), not something this signal can compute.

  **Shape facts the implementer needs, so they are not re-derived from the
  logs.** The event carries `tool_name`, `tool_use_id`, `message` and
  `decision_reason_type` — and **not `tool_input`**. The command text that
  `denied_tools()` renders as its `Bash(<first three words>)` label lives only
  in the preceding `assistant` tool_use block, joinable by `tool_use_id`, and in
  the terminal field. A live reader wanting the same label must **join
  backwards**; it cannot read it off the event.

  **UNPROVEN, recorded as unproven rather than assumed.** All 26 observed events
  (40 at the re-count) carried `tool_name: "Bash"`. **MCP-tool, `Write` and
  `Edit` denials are unproven on the event path.** They do reach the terminal
  field — older logs carry *"Claude requested permissions to use
  `mcp__tsurezure__gloss_index`"* and *"…to edit /home/tomoya/.claude/…"* — so
  the backstop covers them and the prevention half is **not** known to. The
  clause must not be implemented as though event coverage is universal. Per the
  served rule that a criterion stated as a future observation "binds only if a
  named mechanism performs the observation and reopens on failure"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/claude-code-ops.md:40`),
  the named mechanism is the same end-of-spawn reconciliation above: a terminal
  denial with **no matching event** is what a non-Bash denial looks like, and
  the reconciliation line is where it becomes visible.

  **The alternatives, recorded because a decision without them is an
  assertion.** *(1) — the terminal field alone.* Reliable, already parsed,
  version-independent, and the only measurement path. **Declined as unable to
  prevent anything**: it is the last line of the spawn, so every turn the burn
  costs is already spent when it arrives. It survives, undiminished, as the
  backstop half. *(2) — the event alone.* The smaller change, one signal, no
  reconciliation. **Declined because it degrades to nothing**: on a CLI without
  the event the review would silently report zero denials, which is the
  measured-absence defect this whole clause exists to end, and the version
  boundary is inside this run rather than hypothetical. *(3) — key on
  `is_error: true` and classify.* Needs no new signal at all. **Declined on the
  measurement**: 16 of 310 error results are ordinary failures and the
  classification would be a string match on error prose, which is the transient-
  read-as-terminal failure the slot's own counter names. The event makes the
  distinction a **read** rather than a guess, and that is the discriminating
  fact/judgment split — "a fact gets a mechanical carrier at the moment it is
  decidable" — the position this section already quotes at its pin under the
  `consult-outcome-token-assignment` fill (`LESSONS.md:58`), applied here rather
  than re-consulted.

  **What this fill does NOT decide.** Where the prevention lives inside the
  wrapper, whether the terminal set is keyed on the command string or on a
  normalized form, and whether AC 5's count belongs in the report as well as the
  run log, are story 1.28's to settle; none of them is a named slot and none of
  them is this decision. The report-grammar half and the prompt
  reclassification were always implementable without the fill.

  **Ownership, so the layers are not re-derived per sitting:** the property
  lives here; presence-and-findings enforcement at the merge layer; judgment
  in the review-lane skill; **orchestration** — spawn on PR-open, rally
  rounds, author-session messaging — in the lane-command layer, with the
  transport pluggable and degraded environments falling back to
  correction-comments on the PR.

  **A deferred design slot is filled at a decision gate, never silently
  inside implementation** (kogaki#48, 2026-08-05). Any spec or story text
  that leaves a choice "to the implementation" NAMES the slot with the
  fixed token `deferred-slot: <name>`; an unnamed deferral is the defect,
  because gates bind to decision documents and an unnamed slot's decision
  escapes every one of them. Filling a named slot is a DECISION act:
  before code embeds the choice, the filling sitting consults the seam on
  the fork and records the decision — choice, alternatives, consult
  receipt — on the licensing issue. The review lane then reviews the
  decision where it was made, not the argument where it landed: a design
  decision found only in the implementation, with no record on the issue,
  is a finding whatever its quality. The specimen is the review-sweep
  timer: "transport pluggable" deferred the trigger fork past the
  issue-stage policy check (which ran on a body containing no transport
  decision), the fork was decided inside the implementing sitting where
  only consult-by-initiative covered it, and the PR review met it
  entrenched and pre-argued — while both discriminating served lines
  predated the design. This clause is check-policy-at-decision-not-
  execution applied to the deferral mechanism itself
  (`consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:9`,
  `topics/archive/articles.md:29` — the two lines a fill-time consult
  would have surfaced).

  The **boundary-receipt binding** is what converts the map from advice an
  agent may remember into a carrier that binds on every PR. It computes two
  sets per branch — the mapped boundaries whose trigger terms match the diff
  paths, changed text, or linked issue body, and the receipts present — and
  a matched boundary with zero receipts fails. It is a **presence check over
  two declared enumerations** and adds no judgment clause: a receipt whose
  outcome is `miss` **satisfies** it, because the obligation is to ask and
  never to have found. Whether the *right* question was asked stays in the
  review lane, where judgment already lives. Siting it at the merge layer is
  the typed loop's mechanical half — an obligation generates no event to
  hook, but a PR is an event, so receipt-absence over a diff is a computable
  fact rather than an absence with nothing to observe (kogaki#25).

  **The match surface stays as declared, and the decision now rests on a
  measured instance rather than an anticipation** (kogaki#126). The three
  sources above are the whole surface, and `changed text` among them is a
  **compound** — commit messages and the PR body, matched together and
  reported under one label. A trigger term appearing incidentally in any of
  them binds the boundary and the remedy is the ordinary one: record a
  receipt, `uncovered-after-N-framings` being a conforming answer. That was
  ratified at story 1.11 against an anticipated cost; kogaki#126 supplies the
  first measured one (PR #123 / `da638af`, diff `terrain/terrain.mjs` only,
  matched on the PR body, discharged with one genuine consultation), and the
  measurement is recorded in `checks/check-boundary-receipts.sh`'s header
  beside the decline it tests, not restated here. Two candidate narrowings
  were declined **on this text**: weighting the sources so a path-signal match
  binds while a changed-text-only match reports is the judgment clause the
  sentence above forecloses, and per-term source scoping adds a per-term field
  to the entry schema contracted in this section's consultation-map bullet.
  The ground is the map's accretion polarity — a member that turns out not to
  apply costs a consultation rather than a false verdict
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:35`)
  — which prices a spurious match at exactly one consultation on purpose, and
  one consultation is the entire cost measured so far.
- **Review altitude is a declared property of the diff, and the instrument's
  own diff is its own class** (kogaki#99). The tier that decides a spawned
  review's model and turn cap was until now an invariant carried only in code —
  the table at `tools/review-sweep.sh:549-554`, resolved by `resolve_tier()` at
  `tools/review-sweep.sh:804` — with no clause here, so the first thing this
  does is write it down. The declared classes are `careful` and `ordinary`; any
  careful path carries the whole diff and is never averaged down; an unmatched
  path falls to the careful side, which is the fail-safe. The served ground for
  declaring it at all rather than re-judging per sweep:

  > A check's runtime is paid once per iteration of the loop it gates, so its
  > position in the loop is a multiplier on its cost and assertion ALTITUDE is
  > a latency decision rather than only a coverage one … the remedy is a
  > declared tier carried by the check file rather than a judgment re-made per
  > sweep.

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:40`

  **A third class is declared above both and is resolved FIRST: a diff that
  touches the reviewing instrument itself.** It carries the careful tier's
  model and cap. The shipped table classes `tools/**` and `.claude/skills/**`
  as `ordinary`, which puts `tools/review-sweep.sh` and
  `.claude/skills/review-lane/**` — the review machinery — in the cheap tier,
  so the classifier calls its own instrument cheap. Measured on PR #98: two
  consecutive spawned reviewers, both `error_max_turns` at 25 turns against a
  cap of 24, ~$2 spent, no report posted, the PR left unreviewed. Resolving the
  reflexive class before the careful/ordinary axis is what stops a diff that
  also matches something cheaper from averaging it away.

  **It is a class with its own trigger rather than two paths appended to an
  existing list**, because the served design rule is exactly that:

  > A check inherits the trigger of the gate it is sited in, and can be
  > ANTI-CORRELATED with its own need … A check anti-correlated with its need
  > is worse than no check, because its silence reads as a clean result.
  > Design rule: **site a check at a trigger that is its own subject, or give
  > it its own trigger.**

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/claude-code-ops.md:24`

  and because a deliberately narrow instrument owes a **named** trigger that
  widens or escalates it — the hub ruling only that one is owed and expressly
  declining to select among the candidate forms, which is a consumer decision
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:51`).
  Appending two paths to the careful list would fix this instance and leave the
  class unnamed, so instance N+1 is uncovered by default.

  **The cost counter is carried, not dismissed.** kogaki#70 shipped the tier
  table to REDUCE review cost, and every widening spends that. This one is
  bounded by construction — its members are the review machinery's own paths, a
  small and self-limiting set — and the careful/ordinary table is **unchanged**,
  so nothing else in the repository moves tier. The membership is declared
  beside the other two tables and carries the same operator override they do:
  one place to read, one place to change.
- **Issue checkpoints:** issues carry policy pins; checked at creation and
  at pickup against the current served surface
  (`topics/claude-code-ops.md` 2026-08-04). Where an issue body matches a
  mapped boundary's trigger terms, the same authoring layer requires either
  an attached consult receipt or an explicit `consult: deferred-to-pickup`
  marker that the pickup recheck then enforces. The occasion thus fires at
  the two checkpoints the lifecycle **already owns** — authoring and pickup —
  with no new ceremony and no third gate (kogaki#25).
  **Pin currency and line liveness are two checks, not one** (kogaki#188).
  Currency is a fact about the *commit*; liveness is a fact about the *line*,
  and because the substrate is append-only, a pin drifts as a matter of course
  and the dangerous drift **still resolves** — onto different content, past
  every guard that asks whether a pin resolves. The pickup recheck therefore
  also compares a cited line's **stored quote hash** against the text now at
  that line, and refuses with the delta. It stays at the pickup checkpoint
  the lifecycle already owns; it is still no third gate. Optional per cite,
  and every run states which lines it verified and which it did not — the
  full clause, with the alternatives declined and the gaps that survive, is
  in this section's condition-4 amendment.
- **Typed improvement loop:** a missed **mechanical** property strengthens
  the merge carrier; a missed **judgment** improves what the judgment gate
  is told — which served lines are quoted at the gate — and never becomes a
  new enumerated denial, the accretion shape that took six cycles to
  falsify in the predecessor. Responsibility on a leak attaches to the
  layer whose property leaked, and the merge gate refuses deny-never-warn
  (`topics/knowledge-architecture.md` 2026-08-04; kogaki#2).
- **Public-quote register rider:** quoted governing material on public
  surfaces uses the plain-register renderings and pointers, never raw
  internal decision text (product-lab#156 §3 rider 2; kogaki#2). The kit's
  verbatim-at-pin rule is the citation half; this clause is the register
  half.
- **Consult evidence is sided.** The substrate's access log is the
  **server's** canonical record; Kogaki's own `consulted:` receipts are the
  **consumer's**. Logging lives with whichever component mediates access
  (`topics/archive/knowledge-architecture.md` 2026-07-16; kogaki#7), so
  Kogaki reads its own receipts and never the mediating component's private
  state. This extends §2's boundary from repositories to the substrate's
  internals: the seam is a read of *served renderings*, not of the state
  the gateway keeps to serve them.

  A receipt carries the gateway's **`request_id`**, an **outcome token**, and
  **its queries verbatim**, in this shape (kogaki#28):

  ```
  consulted: <repo>@<sha> <file:line[,line][, file:line…]>
    request_id: <id>
    outcome: discriminating | covered-after-reframing | uncovered-after-N-framings
    query: <framing 1, verbatim>
    query: <framing 2, verbatim>
  ```

  **What the hub ratifies here is the property, not this format.** The served
  requirement is a receipt at the point of use with a **fixed token and a
  fixed position** —

  > A consultation owes a RECEIPT AT THE POINT OF USE — fixed token, fixed
  > position — because the act produces no artifact the consumer can see and
  > a consultation that never happens generates no event to hook.

  `consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:18`

  — and the block above is Kogaki's own instantiation of it, chosen here and
  amendable here. Recorded that way deliberately: treating a format as
  ratified when what was ratified is the property it instantiates is the
  defect kogaki#32 cost a spec correction, and the distinction is what keeps
  a later reader from quoting this block as though the hub had served it.

  Two consequences follow from the shape rather than from taste. **Line one
  is unchanged from v1**, so every receipt already in git history stays
  parseable and the `PIN` anchor at `checks/check-consult-receipts.sh:47`
  needs no change; and **each re-framing gets its own `query:` line**, which
  is what makes "record the queries verbatim" checkable rather than
  aspirational when a consult took more than one framing.

  The request id is a join key, not a read: it lets
  the consumer's receipt (the question) be paired with the server's
  access-log row (the answer) **without either side reading the other's
  state**, so the sidedness above is preserved rather than weakened — the
  pair becomes readable to whoever holds both, and to no one who holds one.

  The outcome token is the hub's ratified triple, quoted rather than coined:
  **`discriminating`** | **`covered-after-reframing`** |
  **`uncovered-after-N-framings`**. The middle value is the load-bearing one
  and a bare `miss` is inadmissible in its place, because an empty result
  cannot by itself distinguish a surface that lacks the position from a query
  that failed to reach it —

  > a consult miss is a distill bug OR a query defect, and re-framing at a
  > different axis is the discriminator that must run before "uncovered" is
  > recordable

  `consulted: product-lab@ed47fbd3818b9a66954a558d6c88e86574407ece topics/knowledge-architecture.md:59`

  — which is why **recording the queries verbatim is part of the same
  requirement and not a separate nicety**: the token states which of the two
  causes was found, and only the queries let a later reader check that the
  re-framing actually varied the axis. Both halves are what make
  miss-harvesting a grep rather than an interpretation, feeding the map's
  postmortem field above (kogaki#25, corrected kogaki#32).

  **The receipt is EMITTED BY THE TOOL THAT PERFORMED THE CONSULT; a
  hand-composed receipt is a MARKED EXCEPTION** (kogaki#66). Everything above
  specifies the artifact and leaves its *producer* unnamed, and that silence is
  what the shipped defects were made of: a receipt transcribed by hand from a
  gateway answer minted an outcome vocabulary the hub had never served, while
  the ratified triple sat unread in the transcribing session's own context
  (kogaki#32), and a `request_id` was later copied across two receipts with the
  outcome reversed (kogaki#75). Both are transcription defects, and neither is
  reachable when the transport that made the call composes the block itself: it
  holds the real `request_id`, it holds the framings it actually ran, and it has
  nothing to remember.

  The served ground is that the emission must ride the act:

  > The emission must ride the ACT rather than a later check, because an
  > obligation cannot be blocked at all — an absence produces nothing to deny
  > or fail — so the only available mechanism is that the act writes its own
  > record in a shape whose absence is greppable.

  `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:18`

  That line is quoted here for the *producer* rather than for the position: an
  act that writes its own record is one whose writer is the act. This is
  constrain-what-can-be-produced rather than detect-what-was-produced, so
  `checks/check-consult-receipts.sh` is **unchanged** — it validates shape, and
  shape does not move when the producer does. Moving the producer makes the
  kogaki#32 class *unproducible*; the check keeps catching it for the exception
  path below, which is exactly the division the typed improvement loop asks for.

  **That "unchanged" held for the producer move and does NOT hold for
  condition 4** (kogaki#160). Moving the producer left the field *values*
  alone, so shape did not move with it. Condition 4 narrows the admissible
  value of a field that already existed — a `query:` line may not hold a
  serialized tool argument — and the same division applies one level down: the
  transport makes that emission unproducible, and the check catches it on the
  marked-exception path. No field is added, renamed, or reordered, so the
  grammar block above is unchanged and every receipt already in history stays
  parseable.

  Five conditions bound the clause:

  1. **The emitting tool is the one that made the call** — the kit's own
     transport (`policy/kit/bin/gateway-query.mjs`, which today contains no
     receipt-composition code at all: verified, `writeThenExit` at
     `policy/kit/bin/gateway-query.mjs:41` prints the tool result and exits).
     A tool that did not perform the consult may not emit its receipt, because
     then it is transcribing.
  2. **A hand-composed receipt stays admissible and is MARKED as the
     exception.** An operator consulting through a surface the kit does not
     mediate — the MCP tools called directly, a degraded environment where the
     transport is unreachable — still owes a receipt, and refusing one there
     would convert an obligation into a silence. The exception is *marked*
     rather than tolerated: it is the one path where the shape check is the only
     control, and its rate is the signal that says how much of the seam the
     transport does not yet cover.
  3. **What the tool may assert is bounded by what it observed.** The
     `request_id` and the `query:` lines are facts the transport holds; the
     `outcome` token is a *reading* of whether the answer discriminated. The
     served surface declines interpretation-at-consult-time on the **hub** side
     and draws the boundary at pre-ratified renderings — "what is declined is
     *interpretation performed at consult time* — serving richer **pre-ratified**
     artifacts is the adopted answer"
     (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:307`)
     — which permits consumer-side reading and settles nothing about who
     performs it. A tool assigning `uncovered-after-N-framings` mechanically may
     assign it wrongly, and that is the precise failure the re-framing
     discriminator exists to prevent
     (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:59`).
     So this spec binds the *emitter* and does not bind the *assigner*.

     **`deferred-slot: consult-outcome-token-assignment` is FILLED** (owner
     decision 2026-08-06, kogaki#66): **the operator supplies the token.** The
     transport emits only what it observed as fact — the `request_id`, every
     `query:` line, and the framing count — and takes the `outcome` token from
     its caller, **failing rather than guessing** when none is supplied.

     The alternatives, recorded because a decision without them is an assertion.
     *A1 — the tool assigns mechanically*, deriving the token from the return it
     saw. Declined: the token is a reading, and a tool assigning
     `uncovered-after-N-framings` mechanically may assign it wrongly, which is
     the precise failure the re-framing discriminator exists to prevent.
     *A3 — split by decidability*, the tool assigning only tokens decidable from
     transport facts (`degraded`, and an unreachable gateway) and requiring the
     caller for the rest. Declined as the more complex shape for no gain here:
     the split's own boundary is a judgment about which tokens are decidable,
     so it reintroduces at the schema level the reading it removes at the call
     — and the degraded case already has its own carrier in condition 2's
     marked exception.

     The discriminating served position, quoted verbatim at its pin:

     > ask first whether the thing is a fact or a judgment: a fact gets a
     > mechanical carrier at the moment it is decidable, and a judgment rides a
     > gate that already exists

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:58`

     supported by the carrier rule, on where a pending human reading is carried:

     > a pending human verdict needs its carrier at the render layer, because
     > the human acts on what they see and not on what the authoritative file
     > contains

     `consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

     Condition 3 above had already classified the token on the judgment side —
     "the `outcome` token is a *reading* of whether the answer discriminated" —
     so the fill applies the fact/judgment split this spec had already made and
     stopped one step short of executing. `request_id` and the `query:` lines
     are facts the transport holds and it emits them; the reading rides the
     gate the caller already is.

     **The ordering is disclosed rather than presented as clean.** PR #101
     (story 1.20, open at the time of this decision) already ships `--outcome`
     as a required argument with no inference. Its author framed that as story
     1.20 AC 4's **refusal** — "the emitter does not silently choose an
     assignment strategy … **This criterion is a refusal, not a fill**" — rather
     than as a fill, and the refusal happens to coincide with A2. That is
     fortunate, not procedural: **the code was written before this record
     existed, and this record ratifies it rather than following it.** Had the
     owner selected A1, PR #101 would have needed to change. The deferred-slot
     clause asks for the decision *before* code embeds the choice, and on this
     slot the sequence ran the other way round; recorded here so the next
     reader does not mistake the agreement for compliance.

  4. **THE QUESTION TRAVELS WITH THE CALL. `--question` is required in receipt
     mode, one per `--args`, and the `query:` line may not hold a serialized
     tool argument** (owner selection 2026-08-07, kogaki#160 finding 4).

     `policy/consultation-map.md:67@a3b635d` already defines the field:

     > **The question, verbatim** — the query that would have found the served
     > line. This is the field the map accumulates: situation-specific keys for
     > reaching a particular ruling, written by the sitting that discovered one
     > was needed.

     That definition is unchanged and is not amended here. What changes is the
     transport, which could not honour it: `gateway-query.mjs` *derived* the
     `query:` line, reading it off `policy_lookup`'s own `question` argument
     and falling back to the raw `--args` JSON for every other tool. So a
     `gloss_index` consult — the consultation map's own entry-1 prescription —
     emitted `query: {"tag":"lessons/claude-code-ops"}` and passed every check.
     That was the honest transport fact, recorded in the one field reserved for
     a question, because **there was no field in which such a consult could
     record its question**: a seam gap, not an authoring slip.

     **What is common to the three failures this closes**, named because the
     shape is the argument and none of them is a typo. All reached pushed
     commits inside one week, and a **fourth instance of the same class** is
     recorded below with the boundary it marks:

     - a receipt carrying a `request_id` another receipt had already claimed
       against a *different* reading (caught by the review lane on PR #156,
       corrected forward);
     - four receipts whose gateway addresses were **silently dropped** for an
       unrecognized address form — well-formed on their face while their
       arguments never took effect (PR #170's lane);
     - a receipt on master carrying `request_id e6abb4ef` for a quote its
       recorded query never asked about.

     Each is **a receipt that is self-consistent on its face and false**,
     because nothing on the path could tell a reader that the recorded query is
     the query that ran. Every per-receipt clause in
     `checks/check-consult-receipts.sh` validates a receipt against itself, and
     all three passed. This is
     `a-defect-your-instrument-absorbs-reads-as-clean` at its own instrument:

     > To catch such a problem you need a measurement that does not absorb it —
     > a stated limit that gets checked, or a deliberately weak tester whose
     > failure is the signal.

     `consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/testing.md:23`

     **WHICH CALL'S ID AND QUESTION TRAVEL TOGETHER — the binding, stated
     because leaving it implicit is what shipped the first failure.** A
     re-framed consult is several gateway calls, and the v2 grammar carries
     **one** `request_id`: the LAST framing's, the answer the outcome is a
     reading of. So `--question` binds to **a call**, never to the invocation:
     framing *i*'s `--question` is the question asked of framing *i*'s gateway
     call, the `query:` lines are emitted in the order the calls ran, and the
     **last `query:` line and the `request_id` are therefore the same call's**.
     Failure 1 happened because one invocation's several framings each have
     their own `request_id` and the wrong one was carried.

     **What actually changed here, stated precisely** (PR #186 review, nit 1).
     The composer's *positional* pairing already held: it read `parsed[i]` and
     `queries[i]` off `observed[i]` before this condition existed. What did not
     hold is that the question was **derived** — so for any tool but
     `policy_lookup` the value at index *i* was the arguments, and the receipt
     was correctly paired to a call while saying nothing about what that call
     asked. The pairing is now pinned by a fixture rather than left as an
     accident of the loop, and the value it pairs is a question. The property
     this condition adds is the second half; the first is made checkable, not
     created.

     **The remedy is constrain-shaped, and that is the discriminating served
     position** — the same line the triage lane read when it declined to
     re-shape this issue:

     > When the same class of defect keeps returning and every fix adds one
     > more forbidden item to a list, the list is the wrong instrument — it can
     > only describe the problem you already had, so it is always one incident
     > behind. The alternative is to restrict what the system can produce in
     > the first place … Checking still has a place, but only where something
     > genuinely must be composed fresh, and the right response there is to
     > make that area smaller rather than to inspect it harder.

     `consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/testing.md:77`

     The area that must still be composed fresh is condition 2's marked
     exception, and that is exactly where the check clause applies.

     **The alternatives, recorded because a decision without them is an
     assertion.**
     *B — document the duty in the kit docs*, stating that a
     transport-mediated non-`policy_lookup` consult owes a hand-written
     `query:` line. **Declined:** the check would still accept any non-empty
     value, so the seam stays exactly as wide as it is and the duty relocates
     to a reader. It is the enumerated-list side of the line quoted above, and
     it fails `a-rule-reproduces-only-through-a-default-carrier` — a rule
     written in a document affects only the authors who go and look it up.
     *C — record the gap with a reopen trigger.* **Declined:** spec-only, and
     it leaves the defect reachable. A hold owes its measurement, and here the
     measurement already exists and is three: the class has recurred three
     times in one week, which is the condition under which
     `persistence-through-fixes-falsifies-the-diagnosis` says the answer is not
     a stronger version of the same detection.

     **What condition 4 deliberately does NOT do.** It does not judge whether a
     recorded question is a *good* question, nor whether two framings varied
     their axis — both are readings, and the unit that could observe them is a
     reader, not this check (`match-the-detectors-unit-to-the-propertys-unit`,
     `gloss/lessons/testing.md:131` at the pin above). The clause is the
     narrowest rule that discriminates: a value that is a JSON object or array
     end to end is a tool argument in a field reserved for prose. A question
     *containing* braces or quotes is a question, and both directions carry
     fixtures.

     **THE FOURTH INSTANCE, AND THE BOUNDARY IT MARKS — what `--question` does
     NOT reach.** The three above are receipts misrepresenting *the query*.
     The fourth is a served surface misrepresenting *its own currency*, and it
     is live at the pin this condition was written against. Measured, not
     reported: `topic_thread("articles")` at
     `product-lab@0cb46066653ef3db2e33f69971829d25c06b6507` returns 127 lines
     whose frontmatter reads `updated: 2026-08-07` (`topics/articles.md:4`),
     whose newest dated decision line is **2026-08-05**, which carry **no line
     dated 2026-08-06 at all**, and in which `Move`/`Moves`/`moves/` occurs
     **zero** times — so the 2026-08-06 adoption kogaki#169 is about is still
     absent from the surface after a sweep that advanced the freshness date
     past it.

     Condition 4 makes the recorded query provably the query that ran. It does
     **not** make a served line's *liveness* checkable, and
     `policy/kit/bin/issue-pins.mjs --recheck` still compares SHAs — so a
     receipt can now be perfectly honest about what it asked and about which
     call answered, while the answer it quotes is superseded by a ruling the
     surface has not swept. The served surface says so in as many words:

     > Being written more recently says when someone wrote, not what they
     > could see.

     `consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/knowledge-architecture.md:197`

     > if it is mechanical, you have established existence and said nothing
     > about approval, so read the decision record for verdicts dated after
     > that evidence, and when they conflict the later verdict wins and the
     > conflict is reported rather than quietly reconciled

     `consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/knowledge-architecture.md:257`

     The carrier for that half is the consultation map's **entry 3, "Record
     disposition"** (kogaki#171), which names `--recheck` explicitly as what
     does *not* discharge it. This clause is stated here so no reader takes the
     seam to be closed end to end: **the query half is now mechanical, the
     liveness half remains a read.**

     **AMENDED — the liveness half is now PARTLY mechanical (kogaki#188).**
     The paragraph above stands as the record of what was true when it was
     written, and this amendment states precisely how far it has moved, because
     "liveness is checkable now" is exactly the over-read the paragraph exists
     to prevent.

     `--recheck` gained a **content comparison** beside its SHA comparison. A
     cited line may carry a **stored quote hash** on the issue body — one
     unindented `pin-quote: <file>:<line>@<sha> q1:<hex>` line — and at pickup
     the served surface is re-fetched at the current head, the text now at that
     line is normalized and hashed, and a mismatch **refuses with the delta**,
     naming the line the quote moved to. The defect it closes is not drift as
     such but drift that **still resolves**: three instances shipped past every
     guard in this repository in one session, because resolution checking is
     precisely what succeeds on them.

     **What was decided, and what was declined.** Three directions were on the
     issue; the operator took the first.

     - **Taken — resolve and compare content.** Bounded: it adds one optional
       line per cited line and changes no existing citation. It detects the
       consequence and makes no claim to prevent the cause.
     - **Declined — anchor migration** (cite served material by a
       relocation-stable key rather than `file:line`). This addresses the
       **cause**, and it matches what the corpus has already measured: `CAP-n`
       and `#issue` anchors survived every relocation while **148 unpinned
       `file:line` citations broke repeatedly**. It is declined here only
       because it changes the form of **every existing pin** across this
       repository and the hub, and the bounded fix was chosen. Recorded as
       declined-on-scope rather than declined-on-merit, so that a future
       sitting reopening it inherits the measurement rather than the verdict.
     - **Declined — report rather than gate.** Honest about its limits but it
       **detects nothing**, so the drift still ships with a disclaimer. Its
       honesty is nonetheless kept, **underneath** the detection rather than
       instead of it — see the output rule below.

     **Relocation is CORRECT, and this clause does not treat it as a fault.**
     In an append-only corpus with size ceilings, relocation is a mandatory
     recurring act, so every cross-reference form is either relocation-stable
     or a scheduled future defect. Line numbers are the fragile form. Nothing
     here makes them durable; what it does is make their failure *loud* at the
     one checkpoint that already runs.

     **THE LOAD-BEARING RULE, and the reason the issue was filed:** `--recheck`'s
     output may **never imply content liveness it did not check.** The phrase
     `ok: pins current` is gone, because a clean exit code reading as evidence
     that a cited line still says what it said IS the defect. Every exit now
     states the trials that ran and the trials that did not — including a body
     with no stored hashes at all, which exits 0 as it always did and says in
     the same breath that commit SHAs were compared, **which is not line
     liveness.**

     **Three results, not two**, and this is served rather than invented: a
     check of this shape must "mechanically confirm the source has some records
     in scope before trusting your own count; when it has none, report that you
     cannot tell instead of reporting that the problem is fixed"
     (`gloss/lessons/testing.md:53`,
     `absence-verification-counts-exercised-trials`). So a cited line is
     `verified`, `drifted`, or `cannot-tell` — and `verified` is reachable only
     through a fetch that actually returned records for that file. **A check
     that cannot run its trial says so**: when a body stores hashes and not one
     could be exercised, the run exits **11**, never a clean 0. And the fault
     branch speaks in its own words — a `cannot-tell` is never worded as drift,
     because a fault re-worded as a finding "turns into a confident accusation
     against innocent code" (`gloss/lessons/testing.md:35`,
     `a-fallback-worded-as-a-finding-accuses`).

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/testing.md:35,53`

     **The hash has a writer.** `--emit-pin-quotes` resolves a body's cites at
     the current head and prints paste-ready `pin-quote:` lines. Without it the
     stored hash would be an input nothing produces, and the guard would be
     merged, correctly placed and **completely dead** while everything on the
     surface said installed (`gloss/lessons/testing.md:11`,
     `a-carrier-is-not-installed-until-its-inputs-have-writers`).

     **What is still a read, stated so the seam is not taken to be closed.**
     Three gaps survive this change, named rather than left to be found:
     1. A cite with **no stored hash** is not content-checked at all. Every pin
        recorded before this change is in that state; the output says so per
        run, and `--emit-pin-quotes` is how a body leaves it.
     2. `topics/archive/*` and `GLOSSARY.md` have **no served bulk
        line-addressable form** (measured: `topic_thread("archive/…")` is a
        miss; `surface_names(kind:"glossary")` returns headings only), so cites
        into them are `cannot-tell` — declared, never silently skipped.
     3. **The freshness trap is untouched.** The fourth instance recorded above
        — a surface whose frontmatter reads `updated: 2026-08-07` while its
        newest dated decision line is 2026-08-05 — is a served surface
        misrepresenting *its own currency*, not a line that moved. A quote hash
        cannot see it, and this clause does not claim to. It remains a read,
        and entry 3 of the consultation map remains its carrier.
     4. **A content-verified pin still does not discharge a DISPOSITION read**,
        and this is the most available over-read of the change: the consultation
        map's entry 3 names `--recheck` as what does *not* settle "which record
        is the live word", and **its substance survives this amendment in full.**
        The served surface discriminates the two directly — whether something
        was built "is local, mechanically self-evident, free to check, and looks
        final … whereas whether it is still accepted, rejected, or superseded
        lives in prose somewhere else and never surfaces unless you deliberately
        go looking … if it is mechanical, you have established existence and
        said nothing about approval":

        `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/knowledge-architecture.md:257`
        (`merged-code-evidences-existence-never-standing`)

        A verified quote hash establishes that the cited line **still says what
        it said**. It says nothing about whether what it says is **still the
        live ruling**. Entry 3's evidence sentence — which cites the old
        SHA-only behaviour and the removed `pins current` wording — is now
        stale and is owed a re-cut on its own carrier; its *rule* is not.

     **And the declined direction keeps its served ground, so a future sitting
     inherits the measurement rather than this verdict.** The corpus states the
     position plainly: in an append-only corpus with hard size limits, moving
     text is "not a rare event but a routine one", which makes "any reference
     pointing at a position, such as a file and a line number, a defect waiting
     for its date" — and "the fragile kind is not leftover mess, it is a rule
     nobody enforced."

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/knowledge-architecture.md:119`
     (`bind-references-to-identities-not-positions`)

     That line is the case **for** anchor migration, recorded inside the clause
     that declines it. What this change ships is the enforcement of the fragile
     form's failure, not a defence of the form.

     So the amended statement of where the seam stands: **the query half is
     mechanical; the liveness half is mechanical for any cited line that
     carries a stored quote hash, and a read everywhere else — with every run
     saying which of the two it just did.**

     **Backward compatibility (kogaki#188).** No existing body changes meaning
     and none can newly fail. `pin-quote:` is **optional**; a body without it
     is reported as `no stored quote hash` and exits exactly as before. The
     authoring checkpoint **reports** coverage and does not require it, so a
     `consult: none` filing is unaffected. The `@<sha>` on a `pin-quote:` line
     is provenance and is **excluded from the pin scan** — counting it would
     make every hash-carrying body report `policy moved` the instant the hub
     advanced, which is always. What changed for existing bodies is the
     **output**, deliberately: the old wording asserted more than it checked.

     **Backward compatibility.** No field is added, renamed, or reordered, so
     the grammar block above stands and every v1 receipt (no continuation lines,
     therefore no query lines) is untouched.
     `checks/check-consult-receipts.sh` scans the branch's own commit range
     (`merge-base..HEAD`) plus the PR body CI supplies — never a file on the
     default branch, never the whole history — so receipts already merged,
     including `208fd83`'s, lie outside every future scan window and no branch
     fails on work it did not author. What narrows is the admissible value of
     an existing field, on emissions made from here on.

     **With one hole, named rather than left to be found** (PR #186 review).
     The commit range is bounded; `CONSULT_PR_BODY` is not. A PR body that
     *quotes* a previously-merged defective receipt brings it inside the scan
     window, and the clause fires on text that branch did not author. It is
     not a new hazard — it is the use-vs-mention rule (kogaki#41), and its
     discharge is the same: a quoted receipt belongs in a fence, where it is a
     mention. Recorded because "backward compatible" without this sentence is
     itself a self-consistent and incomplete claim, which is the shape this
     condition exists to refuse.

     **The silent-address drop is CARVED OUT, not smuggled in.** Failure 2
     above is a different defect: an unrecognized address form returns a
     well-formed response to a query the gateway did not run, so `--question`
     records a question truthfully while the *answer* beside it is another
     artifact's. The hub has already ruled on the general shape —

     > a basename collision does not error and does not return empty, it
     > returns 283 well-formed lines of the **wrong artifact**, the server logs
     > an `allow`, and the shadowed kind never appears in the access log —
     > both ends read success

     `consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/archive/knowledge-architecture.md:23`

     — and places enforcement at the layer where the ambiguity is created
     rather than at serve time (`topics/archive/knowledge-architecture.md:24`,
     same pin). Making the transport fail loudly on an unrecognized address is
     therefore a real and probably owed change, and it is **outside kogaki#160's
     licence**, which is finding 4's receipt contract. It is filed through the
     typed path as its own issue rather than ridden in here, and named here so
     it is not left unrecorded. **That issue is kogaki#181, and condition 5
     below DISCHARGES this carve-out** — its disposition is *discharged*, not
     *open* and not *re-litigated*. Stated as a disposition rather than left to
     the reader, because the served rule on record standing asks for exactly
     that distinction:

     > if it is mechanical, you have established existence and said nothing
     > about approval, so read the decision record for verdicts dated after that
     > evidence, and when they conflict the later verdict wins and the conflict
     > is reported rather than quietly reconciled

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/knowledge-architecture.md:257`

     The mechanical evidence here is the merged carve-out paragraph (`3aa73f5`),
     which establishes that the carve-out *exists* and says nothing about its
     standing. The verdict dated after it is the owner selection of 2026-08-07
     recorded in condition 5, and it does **not** conflict with the carve-out —
     it performs what the carve-out deferred. So there is no conflict to report,
     and the disposition is recorded here rather than inferred from the
     paragraph's continued presence.

  5. **THE ANSWER MUST EVIDENCE THE ADDRESS THE FRAMING SENT. The transport
     refuses the receipt (exit 12, `receipt not composable`) when the served
     response does not evidence the address, and the half that is not decidable
     consumer-side is ROUTED UPSTREAM rather than left silent** (owner selection
     2026-08-07, kogaki#181).

     Condition 4 is the receipt's `query:` field; this is its **answer** field,
     and the two are different defects at one seam. `--question` makes the
     recorded query provably the query that ran, and says nothing about whether
     the call reached the artifact the arguments named. An unrecognized address
     is **dropped silently**: the gateway returns a well-formed response to a
     call the operator did not make, and the transport composes a receipt from
     it. The receipt is then self-consistent and wrong — a real `request_id`, a
     real served `consulted:` line, a truthful `query:` line, and an answer that
     is another artifact's. **Four such receipts shipped in a single session**
     (PR #170's lane, failure 2 above): they looked valid, cited real lines, and
     their arguments never took effect.

     **WHAT "EVIDENCES THE ADDRESS" MEANS, RESOLVED PER SERVED TOOL — measured
     on the wire at `product-lab@98195e0a`, not assumed.** The served surface
     answers an unrecognized address in exactly two ways, and the split is the
     tool's **argument requiredness**, not its subject matter:

     - **Required-address tools** — `policy_lookup.question`,
       `glossary_entry.name`, `topic_thread.topic`, `surface_names.kind`.
       An unrecognized address form fails MCP schema validation (`-32602`)
       before it reaches the substrate, and the transport's existing wire loop
       already turns that into the exit-11 degrade. **Evidenced by
       construction**; nothing is owed.
     - **Optional-address tools** — `gloss_index.tag`, `lessons_index.tags`,
       `element_survey.kind`/`.tag`. The undeclared key is **silently dropped**
       and the unfiltered artifact is served: `gloss_index` returns
       `gloss/INDEX.md` where `gloss/lessons/testing.md` was addressed, and
       `element_survey` returns 814 `ELEMENTS.jsonl` lines where 146 were
       addressed — `miss: false`, a real id, a real pin. **This is the defect,
       entire.**
     - **The miss path, every tool.** A miss response carries `tool` and
       `request`: the gateway names the address it answered. **Evidenced
       directly.** A miss is itself a legitimate answer and stays recordable —
       what is refused is a miss whose echo names a different call.

     **A `tools/list` RPC ERROR DEGRADES RATHER THAN REFUSING, AND THE SERVED
     ANSWERS ARE GIVEN UP WITH IT** (kogaki#206, owner selection 2026-08-07).
     The enumeration above attributes exit 11 only to `-32602` schema
     validation on required-address tools, which is no longer the whole of it.
     In **receipt mode**, `policy/kit/bin/gateway-query.mjs:744` routes a
     `tools/list` rpc error to `unavailable()` — exit **11**, one line, before
     any `tools/call` is issued. So a gateway that answers `tools/call`
     perfectly well is reported unavailable and **its answers are discarded
     unfetched**. Before that re-route, `declaredByTool` stayed null, the
     `tools/call` loop still ran, and the operator got the served answers plus
     `receipt not composable` (exit 12).

     **This is recorded rather than repaired, and the reason is uniformity.**
     The `tools/call` loop routes its **own** rpc errors to `unavailable()`
     identically (`policy/kit/bin/gateway-query.mjs:757`); PR #201 made the
     routing uniform, which is what its round-1 nit asked for — three causes
     had collapsed into one refusal message. Undoing it for `tools/list` alone
     would restore the split, trading a recorded judgment for an unrecorded
     inconsistency. The transport cannot verify an address it has no schema
     for, so refusing to compose a receipt from an unverifiable catalogue is
     defensible; what was wrong was that the judgment lived **only in a code
     comment** while this condition stated the opposite shape.

     **The counter-argument is recorded rather than left standing.** Exit 11
     prints `policy_source unavailable`, and on this path the source is *not*
     unavailable — it is up and answering. Exit 12's own documented meaning
     (`policy/kit/bin/gateway-query.mjs:115`) — *"The consult happened and its
     results are printed, but the wire did not carry what a receipt asserts"* —
     describes a missing **catalogue** at least as well. The alternative that
     restores answers-then-exit-12 for `tools/list` specifically was therefore
     genuinely available and is **declined on the uniformity ground above**,
     not on preference. **Reopen point:** a sitting that finds the exit-11
     message itself misleading in practice re-reads this paragraph, because
     that is the cost this selection knowingly accepted.

     Receipt mode only. Non-receipt mode and the pre-receipt invocation are
     genuinely unaffected.

     **Consultation-map entry 3's survey, run late and recorded with its
     lateness** (PR #213 round-1 finding). This condition and clause 4 above
     each adopt a record as the **live word on a decision's disposition** —
     #206 rules PR #201's shipped behaviour live and this condition's prior
     "byte-for-byte unaffected" sentence an overclaim; #204 rules its own
     issue's premise incomplete — which is entry 3's act class exactly. The
     amending sitting emitted receipts on *remedy shape* and none on the
     *disposition read*, so the entry's prescribed survey went unrun while the
     mechanical check passed, because it counts receipts present and cannot see
     which boundary they answer.

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/INDEX.md:61,113,144`
       request_id: cb73f8f9-3bf2-488f-9379-8b7826c67ab5
       outcome: discriminating
       query: entry 3's headline-first survey over lessons/knowledge-architecture, read before this disposition reading was written down — does any served position overturn the four disposition rulings of PR #213

     **Both halves were run and the result is stated:** the headline-first pass
     over all 56 `knowledge-architecture` headlines, and the carriers
     themselves read **whole** with their comment threads
     (`gh issue view <n> --comments` on #199, #204, #206, #212 — one comment
     each, all authored by the amending sitting itself). **No record
     superseding any of the four dispositions exists**, so every reading
     stands; the survey changed no verdict and its value is that this sentence
     can now be written.

     **The miss reproduced the very lesson the entry cites, which is why it is
     recorded rather than quietly filled.** The triage sitting read the four
     issue *bodies* and not their *comment threads* —
     `a-partial-projection-can-satisfy-a-total-read-rule`: *"A rule that says
     'check the source' can be satisfied by a tool that shows only part of that
     source, and nothing will look wrong."* Entry 3 names `--comments`,
     untruncated, for exactly this reason, and a body-only read looked like
     compliance.

     So the condition is two checks, both reading **only** the wire:

     (a) **THE FORM, checked where the ambiguity is CREATED.** Every key a
     framing sends must be one the served `tools/list` schema declares for that
     tool. The served ruling is the one quoted at the carve-out above, and its
     operative half is about *where*:

     > where identity is derived by discarding a component, the discarding step
     > is the only place the collision is visible … **gate where the ambiguity
     > is created** … a **config error detected when the roots are enumerated**
     > (startup or regeneration), never a serve-time disambiguation

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/archive/knowledge-architecture.md:24`

     Kogaki does not own the gateway's enumeration step and may not reach into
     it (§2). The discarding step it *does* own is the argument object the
     transport composes, and checking it there — before the answer is believed —
     is that ruling applied at the only layer this repository holds.

     (b) **THE ECHO, where the gateway serves one.** On a miss, `tool` and
     `request` must be the tool and the address the framing sent. Only the keys
     the framing **sent** are compared: a normalized `null` the gateway adds for
     an absent optional key is the gateway's rendering, not a contradiction.

     **THE HALF THAT IS NOT DECIDABLE CONSUMER-SIDE, DECLARED RATHER THAN LEFT
     SILENT — and ROUTED.** On the **hit** path the gateway echoes nothing. A
     filtered `gloss_index` hit and an unfiltered one differ only in the served
     path; an `element_survey` hit differs only in a **line count** the
     transport has no corpus knowledge to judge. After (a) and (b), the residual
     claim — that a *declared*, well-formed address was actually **applied** —
     rests on an inference about the producer's behaviour rather than on
     anything observed, and **this spec does not assert it**. Recovering it by
     reading the address back out of the `consulted:` path was considered and
     **declined on a served line**, the same consult, second axis:

     > A remedy-shape check binds PROPOSALS, never captures, and must **QUOTE
     > ratified renderings rather than re-derive them**

     `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/articles.md:102`

     Re-deriving the address from the served path would be the consumer
     reconstructing an identity the producer discarded — the precise move
     `topics/archive/knowledge-architecture.md:24` places at the producer. So it
     is **not done here**, and the transport's fixtures pin the boundary: a hit
     with a declared address composes, and the absent echo is left undecided
     rather than guessed at.

     **The upstream item.** That half is routed to the gateway repository
     through the typed path as **tsurezure-gateway#85** — *echo `tool` and
     `request` on the HIT path as the MISS path already does*. It carries the
     measurement table above and the served pins, and offers the stricter
     producer-side alternative (reject an undeclared key at the enumeration
     step) as an equally discharging remedy. The producer already emits
     exactly those two fields on a miss, so the ask is not a new mechanism but
     the removal of an asymmetry; when it lands, limb (b) becomes total and the
     inference above is retired. The cost is accepted knowingly: a cross-repo
     escalation, held here as a **declared consumer-side limit** rather than as
     a silence, because a boundary that is not stated reads as coverage.

     **THE SHAPE SELECTED, AGAINST THE THREE THE TRIAGE SITTING PREPARED.** The
     triage comment on kogaki#181 held a decision over **(A)** a refusal class
     *scoped to the tools where the property is decidable*, **(B)** inverting it
     so the receipt DISCLOSES the address and refuses nothing, and **(C)**
     routing the whole property upstream. The shipped shape is **none of the
     three**: it is a served-schema **form** check plus a **miss-echo** check,
     universal over tools, with (C) composed in for the residual half only. It
     was selected because the measurement changed the fork:

     *A — a per-tool scoped refusal.* **Declined**, on its own recorded counter:
     a declared per-tool exemption is an enumeration whose non-member fallback
     is ADMIT, so served tool N+1 is uncovered by default. The triage assumed
     the split ran `policy_lookup` (undecidable) against
     `gloss_index`/`topic_thread` (decidable by path). **Measurement refuted
     that**: the split is argument **requiredness**, and `topic_thread` — one of
     A's two "decidable" tools — is in fact safe by schema validation and needs
     no clause, while `lessons_index` and `element_survey`, which A does not
     name at all, are the two most exposed. A rule built on the wrong partition
     would have exempted the wrong tools. The shipped form check needs **no**
     per-tool list and no exemption: it reads each tool's own served schema, so
     tool N+1 is covered on arrival.
     *B — invert it: the receipt discloses an `address:` line and refuses
     nothing.* **Declined**, and declined explicitly rather than passed over.
     Its recorded counter is decisive on the served ground this condition is
     built on: it *makes the defect visible without making it unreachable*,
     which is detection where constraint was available, and
     `gloss/lessons/testing.md:77` (quoted at condition 4) says the list is the
     wrong instrument precisely there. Its recorded point **in favour** is real
     and is not dismissed: B is the same grammar change **kogaki#187**
     independently needs, so B would discharge two issues where this shape
     discharges one. That adjacency is **dormant, not ignored** — kogaki#187 is
     parking at a count of one, so buying its grammar change here would spend
     four files and a spec section on a second issue that has not yet met its
     own threshold. If kogaki#187 is taken up, B's `address:` line becomes the
     natural carrier and this condition's form check remains the constraint
     beneath it; the two compose and neither blocks the other. Noted so the
     later sitting inherits the edge rather than rediscovering it.
     *C — route the WHOLE property upstream.* **Declined as the sole remedy**
     and **adopted for its residual half**, which is the composition the triage
     itself flagged ("C is strongest composed with A, not instead of it"). C
     alone leaves a cheap consumer-side guard unbuilt where the data is already
     in hand.

     **The alternatives considered at implementation**, recorded on the same
     standard.
     *D — infer the address from the served `consulted:` path.* **Declined** on
     `topics/articles.md:102` above, and because it is only *partially*
     available anyway: `gloss_index` happens to encode its tag in the path while
     `element_survey` and `lessons_index` return the same file at the same pin
     either way, so the rule would hold for one tool and silently not for two —
     an instrument that reads as total and is not, which is the shape this
     condition exists to refuse.
     *E — check the address at usage time (exit 2) instead of at composition.*
     **Declined:** the defect is a property of the **answer**, and a usage-time
     check would pass a call whose address the gateway drops for any reason the
     schema does not describe. Exit 12 is also the honest code — the consult
     *happened* and its results are the caller's; what is refused is the
     receipt, and the results are still printed exactly as the other five
     refusal classes print them.
     *F — refuse in non-receipt mode too.* **Declined as out of licence:** exit
     12 is receipt-mode by definition, and a non-receipt run asserts nothing
     that could be false. The `tools/list` round trip is therefore spent only
     in receipt mode, and the ratified degrade and the pre-receipt invocation
     keep their exact shapes.

     **What condition 5 deliberately does NOT do.** It does not judge whether
     the *answer* is responsive to the question — that is a reading, and
     condition 3 assigns readings to the operator. It does not make a served
     line's **liveness** checkable; that remains the consultation map's entry 3,
     exactly as condition 4 left it. And it does not claim the seam is closed
     end to end: **the query half is mechanical, the address FORM is now
     mechanical, the address APPLICATION on a hit is a producer-side ask, and
     the liveness half remains a read.**

     **Backward compatibility.** No field is added, renamed, or reordered — the
     receipt grammar block above is untouched, so
     `checks/check-consult-receipts.sh` is unchanged and every receipt already
     on master stays parseable and passing. What narrows is which *calls* may produce a receipt
     at all, on emissions made from here on: a receipt already recorded was
     composed from a response that this condition never inspects, and the
     checker's scan window (`merge-base..HEAD` plus the PR body) reaches no file
     on the default branch. The transport's non-receipt path and the
     pre-receipt invocation are byte-for-byte unaffected
     (`policy/kit/test/install-test.sh` cases 3, 7, 8b and 8c, unchanged and
     passing).

     **The exit-11 degrade is NOT byte-for-byte unaffected, and this sentence
     is the correction** (kogaki#206). Its prior form named the exit-11 degrade
     in that unaffected list, and that was an overclaim: **receipt mode's
     degrade is WIDENED**, because a `tools/list` rpc error now enters exit 11
     before any `tools/call` is issued, where it previously left the loop
     running and produced exit 12 with the served answers printed. See the
     `tools/list` paragraph in condition 5 above, which records the behaviour
     and the ground on which it was kept. **Non-receipt mode's degrade is
     unaffected**, and the narrowing is exactly to that: the unaffected claim
     holds for the non-receipt path and not for receipt mode.

     A self-consistent-and-incomplete claim is precisely what condition 5
     exists to refuse, so leaving one standing *inside* that condition's own
     backward-compatibility paragraph was the sharper defect — not the widened
     behaviour, which was chosen deliberately.

## 4.5 The declared design baseline (kogaki#229)

**Kogaki's spec states which existing design it inherits as its default —
scoped, with every divergence declared at a pin.** An implicit baseline
cannot be diverged from *on the record*: a departure from an undeclared
default reads as a fresh choice rather than as a decision. The specimen is
kogaki#147, filed against a design whose inherited default was never
declared, so the departure it encoded read as a fresh choice.

The position is served, and it is quoted rather than paraphrased:

> "The consult discipline CANNOT SUBSTITUTE for a consumer knowing where its
> own design baseline lives … What makes such a ruling reachable is a
> DECLARED DESIGN-BASELINE CLAUSE in the consumer's own spec: this design is
> the default, scoped to this subject, divergences declared with pins. The
> two compose rather than compete — the hub answers *what does portfolio
> policy say* and the baseline clause answers *what did this component
> already decide* — and neither can answer the other's question, so a
> sitting holding only one of them will confidently report the wrong KIND of
> absence."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:40`
  request_id: 03d6a38b-c34d-4c9f-8492-bd57db55af82
  outcome: discriminating
  query: A consumer's spec must declare which existing design it inherits as its default, scoped, with divergences declared at pins. Is that a ratified position, what is its scope, and does the consult discipline substitute for it?

**Why the consult discipline does not already cover this, stated because it
is the easy thing to lose.** Consulting the hub answers *what does policy
say*; it does not answer *what is this repository's starting design, and
where have we deliberately departed from it*. The ruling that motivated the
position lived **consumer-side**, so no hub query could have returned it
however well framed. §4's consultation map and this section are therefore
two instruments, and neither is the other's fallback — the same
non-substitution the three-instrument ruling already binds this repo to.

### 4.5.1 Kogaki's baseline is declared PER SUBJECT, and the default is NONE

Three clauses, each binding separately so a partial compliance is visible:

1. **Per-subject declaration.** A design baseline is declared in the spec
   that owns its subject, naming the inherited design and the scope the
   inheritance is limited to. `specs/spec-terrain/SPEC.md` §2.4 is the
   standing form: the baseline named as an addressable artifact, the scope
   limit stated as part of the clause rather than as a footnote, and the
   divergences numbered.
2. **The default where nothing is declared is NO INHERITED BASELINE.**
   Kogaki does **not** inherit `writing-assistant` generally. §5's port
   manifest is the scoping instrument — *anything unnamed is dropped by
   decision* — and §2.4's own scope limit refuses the general reading in
   terms ("nothing here may be read as a general WA inheritance — not for
   Draft, not for Brief, not for any other subsystem"). A subject with no
   declared baseline has a **fresh** design, and a sitting that wishes to
   inherit one declares it first; the declaration is the act, never a
   reading recovered afterwards from resemblance.
3. **Divergences are declared at the diverging clause, with a
   source-qualified pin, in the amendment that creates the divergence** —
   and registered in the owning spec, never in a central register here. A
   central register would restate facts authoritatively held per subject,
   which is the conformance-copy shape §4's map already refuses; and the
   three named seam-side instruments fail differently, so merging them
   hides which half was wrong at the moment that is the only useful
   question.

### 4.5.2 The index below is a FINDING AID and states no baseline's content

Which subjects have declared a baseline, and where the declaration lives.
It carries **pointers only** — no restatement of what any baseline is —
because a copy of the content would acquire the declaring spec's change
rate while being read as though it were current:

| subject | where its baseline is declared |
| --- | --- |
| Terrain design | `specs/spec-terrain/SPEC.md` §2.4, with its numbered divergence register |
| every other subject | nothing declared — clause 2 applies, the design is fresh |

An entry lands here in the same amendment that declares the baseline.

### 4.5.3 What this section does NOT do

- **It is not kogaki#127's inheritance whitelist.** That whitelist is a
  **component** whitelist for the draft pipeline; this section is the spec
  declaring its baseline **generally**, and reading the two as one narrows
  the clause to a single pipeline.
- **It does not check entitlement.** §2.5 already records the register's
  sharpest lesson in this repo's own history — *a divergence register
  records that you diverged; it does not check whether you were entitled
  to* — and a declared baseline does not repair that. Entitlement is the
  consultation map's question, asked at the divergence, and the two compose
  exactly as the served line above says.
- **It is an OBLIGATION and gets no mechanical gate.** An undeclared
  baseline produces no event to hook, so nothing can deny it — the same
  reasoning §4's fixture-discrimination clause states for its own case. The
  carrier is this prose plus the review lane's read; presence of prose is
  not a property worth a gate, and a baseline's *correctness* is judgment.
  **Reopen trigger:** one shipped divergence whose baseline was declared
  nowhere and which the review lane did not surface.

## 5. Port manifest (anything unnamed is dropped by decision)

Admitted from writing-assistant, each with its contract; ported one
subsystem per PR through the gate above:

1. **Terrain** — the survey/selection surface; completeness as a cover
   counted in placements; presentation-only grouping; the second-proposer
   boundary.
2. **The Brief and its four gates** (thesis, journey incorporation,
   structure composed from the Brief's own state, plain register with
   round-trip concessions) — the design/realization boundary test.
3. **The owner-facing proposal contract** (Where/Why/effect-stating labels;
   machine-proposed options plus free text; payload capture).
4. **The gate carrier** (declared gate registry, AskUserQuestion evidence,
   payload/answer capture) — with rendering through the question UI as
   contract, not discretion.
5. **Run-record/workspace machinery** (checkpoints, resume, block mode as
   opt-in dev control, durable Brief home).
6. **The style contract and plain-register commitment**, consumed at
   generation.
7. **Review** — findings-only, one dimension: conformance to the named
   contract, citing the clause; plus the citation resolve check.

**The list is a manifest, not an order — except where a member's contract
depends on another's** (kogaki#14, 2026-08-05). Terrain's screens present
selections, so item 1 is sequenced **after** items 3 and 4: the owner-facing
proposal contract and the gate carrier port first, each as its own PR with
its own contract. The alternative — folding a "minimal form" of 3 and 4 into
the Terrain port — is refused, because admitting a subsystem without its
contract is the manifest's own named failure mode:

> "the PORT MANIFEST is the load-bearing artifact: a subsystem is admitted
> with its contract, or its defect class returns. … A rebuild's failure mode
> is never that it fails but that it succeeds at everything except the
> subsystems nobody remembered were carrying a contract"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:27`

No other member is sequenced here. A later port declaring its own precondition
amends this clause rather than inventing a second ordering carrier.

Explicitly **not** ported: probe, harvest and fact sheets, the sources
gate, the provenance map/judge, the interview's depth and audience mandated
asks (their questions re-site to the Brief or to platform-profile
onboarding), and the 170-member check suite (checks re-earn admission
individually).

## 6. Non-goals

Prose generation from repositories; measurement storage or transport;
writing to the Gukan substrate (proposal-only contribute-back stays the
sole path); a second knowledge store of any kind.
