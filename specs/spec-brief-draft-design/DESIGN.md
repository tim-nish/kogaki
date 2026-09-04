# The Brief and Draft lanes — design record

**Status:** v1, 2026-09-03 (kogaki#752). Written from the implementation, not
from a plan.

**This document executes nothing.** No runtime reads it, no check greps it, no
command resolves a path into it. It exists so a later reader can inspect the
architecture that was built without reconstructing it from six runtimes — and
under the premise ruled 2026-09-01: **specs describe implemented architecture
for later inspection and participate in no execution; rules that act at runtime
live as operational text in the runtime's own carriers.**

**Every section states why it cannot live in a machine carrier** (kogaki#743
criterion 4). A section that could be a check, a schema key or a template line
belongs there instead, and its presence here would be the second copy that
drifts.

---

## 1. The boundary: three kinds of thing, and which is which

necessity: *the assignment of a property to one of these three kinds is a
design judgment made per property, and no carrier holds the assignment itself —
a schema declares its own fields and a check declares its own assertions, but
nothing declares why a given rule went to one rather than another.*

The lanes are built out of exactly three kinds of component, and the whole
design is a series of decisions about which kind each obligation belongs to.

**HARNESS.** Deterministic code that reads records and writes records. It
computes, it refuses, and it never judges. `brief.mjs`, `compose.mjs`,
`assemble.mjs`, `draft.mjs`, `review.mjs`. The test for harness membership is
that the same inputs must produce the same bytes.

**LLM JUDGMENT POINTS.** Named places where a model supplies a value the
harness cannot compute. There are exactly four in the two lanes, and their
enumeration is deliberate:

1. **Thesis candidate composition** — `composeThesisCandidates` renders
   candidates from the settled Strand set; the owner selects.
2. **Path composition** — the composing sitting authors Step records toward the
   adopted Thesis. The harness validates their shape and never their content.
3. **The Step↔Move specialization judgment** — whether a Step's instantiated
   reader states are consistent specializations of its Move's contract
   (`src/specialization-schema.json`).
4. **Section realization** — the model writes one Section's prose from one
   Packet (`src/packet-template.md`).

Judgment sits **between** deterministic parts and never around them: at each of
the four, the order of what happens next is already fixed, and the model
supplies a value into a sequence it does not control.

**TYPED RECORDS.** The seams between the two. Each is a file the harness
validates and never composes: `record-schema.json`, `gate-schema.json`,
`specialization-schema.json`, `survey-schema.json`, and the Packet template.
The invariant that makes them worth having is uniform — **the harness
validates the record's shape and the sitting supplies its content**, so a
missing record is a refusal rather than a blank the harness fills.

## 2. The Move–Step–Strand model, and the Section above it

necessity: *the distinction is what makes the vocabulary usable, and each term's
carrier holds only its own half — `moves/` holds a Move, a Brief holds a Step,
a survey holds a Strand, and nothing holds the relation between them. The
Section is here for a sharper reason: it was for a time not a unit at all, and
what filled the gap was a heading emitted per Step.*

Three distinct things, routinely conflated by anyone meeting them for the first
time:

| | what it is | where it lives |
|---|---|---|
| **Strand** | **material** — a served lesson or journey the article may draw on | the survey, settled at Brief mint |
| **Move** | a **transformation contract** — a reusable technique, with `requires`/`effect` as reader states | `moves/<id>.md` |
| **Step** | an **instantiated application** — this Move, on this material, for this reader | a Brief's Reader Path |

**A Step instantiates a Move.** Its `reader_state_before`/`after` are the
instance forms of the Move's `requires`/`effect`. Two halves follow, and they
are carried by different machinery on purpose: **id resolution is mechanical**
(a Step's `move` must name a record that exists) and **specialization is
judged** (whether the instantiated states are consistent specializations).

**The Move library grows by an admission act, never by a Brief naming an id.**
A composer that needs a Move the library lacks raises that rather than minting
one, because a Move admitted as a side effect of needing it is a technique
nobody observed.

### 2.1 Section — a grouping of Steps, declared in the Brief (kogaki#816)

**Owner ruling, 2026-09-03.** One Step is one unit of **realization**, and that
is unchanged. A heading is a different unit: **a promise to the reader that the
question changes here.** A Section is a **grouping of Steps declared in the
Brief**; the Harness renders one heading per Section and none inside it.

| | what it is | where it lives |
|---|---|---|
| **Section** | a **grouping of Steps** — one promise to the reader that the question changes | a Brief's Reader Path, as `opens_section` on the Step that opens it |

**WHY A FOURTH UNIT RATHER THAN A SETTING.** Binding the heading to the Step
produced both failures observed on 2026-09-03, and they are the two ends of one
axis rather than a bug and its overcorrection: the draft with a heading on every
Step read as **fragmented** (`theses/safety-check-refuses-last-moment/draft.md`,
five headings for five Steps), and the drafts with none were **hard to scan**
(the two drafts written that day under the pre-rename workspace path, which
kogaki#766 has since retired). The owner rejected the binary and asked for a
structural rule. A knob choosing between the two would have made
both reachable and neither correct; a unit makes the grouping something the
Brief **states** and the Harness **checks**.

**WHERE THE JUDGMENT SITS, and it is not new judgment.** Which Steps open a
Section is composition-time judgment, and it belongs where the Steps are already
judged: **the Brief**. The four rules below are the Harness's *validation* of
that judgment, not a second judge — a Brief that opens a Section on every Step,
or on none, is refused at mint with the rule it broke and the Step named.

**THE FOUR RULES ARE NORMATIVE AT `specs/spec-draft-pipeline/SPEC.md` §4.15,
AND THIS RECORD POINTS AT THEM RATHER THAN RESTATING THEM (kogaki#822).** They
were ratified here on 2026-09-03 and stood in full in both documents until §4.15
landed. **The precedence is declared rather than left to two texts that can
drift**: §4.15 is the contract `brief.mjs mint` validates against and a
registered check asserts, and this section keeps the *grounds* — why Section is a
unit at all, and why length is subordinated to the grouping. A copy with no
declared precedence and no mismatch check is a defect this repository has already
paid for, which is why the reduction is part of the act that created the second
copy rather than a later tidy-up.

**In one line, so this section is readable alone:** a Step **opens** a Section
when it changes the reader's question, **continues** when it develops the
previous one, the **first Step always opens**, and **length is a check on the
grouping and never its reason** — a length rule promoted to the reason is a
heading budget, which is the fragmented draft again with a number attached.
§4.15 is the text that binds.

**NORMATIVE, AND BUILT AT THIS HEAD**, stated in that shape deliberately
— the same correction PR #813 round 1 forced one section down, where "the
refusal stays" asserted the continuity of something that never existed. The
build state is given **per clause**, because the unbuilt form listed three and
all three are now false — the last of them at kogaki#825, merged as PR #847.
The per-clause shape is kept rather than collapsed into one BUILT line: each
clause names the act that landed it, and a reader arriving at a clause needs
its own carrier, not the block's aggregate:

- **BUILT, #822** — the field is admitted and the four rules refuse. **Not in
  `src/brief.mjs`, which is where this note predicted it.** `cmdMint` writes a
  Brief *shell* and no Step exists there for a rule to read, so the site is
  `validateSteps` in **`src/compose.mjs`** — the one act Steps reach. The
  ruling's intent is unchanged and only the named act moved.
- **BUILT, #823** — `emit` writes one `## <title>` per Section at its opening
  Step, `parseBrief` reads the field back, and the frontmatter trace maps each
  Step to exactly one Section. **This note's own reading of the head was wrong
  and the correction is kept**: `emit` rendered **no** heading, not one per
  Step, and the specimen's five headings were the model's, written into the
  prose. Heading authorship was *unowned*, which is why the repair needed a
  second act — `section` refuses realized prose carrying a heading of its own.
- **BUILT, #825** — the vocabulary collision this ruling creates inside the
  Packet is reconciled. `src/packet-template.md`'s block headers are rewritten
  to the Step (`# Write one Step`, `## The Move this Step performs — its
  contract`, `## This Step`), and it gains `## The Section this Step sits in`,
  so the two words name two units inside the realizer's entire input.
  `src/draft.mjs` carries `sectionPlacement` and `priorProseBySection` — every
  Packet names its Section and the article-so-far block is Section-bounded —
  and `checks/registry.json`'s `draft-runtime` contract records the rename in
  the same act as the served heading. **The proper noun renamed completely**,
  per the reconciliation below: *Section Packet* → **Step Packet** at
  `specs/spec-draft-pipeline/SPEC.md` §4.14, this file's §2.1 and §3, the
  registry contract, `src/draft.mjs` and the template. The `section`
  subcommand is retained with its retention recorded, which is the arm the
  reconciliation chose rather than an unfinished half.

**THE VOCABULARY COLLISION IS DISCLOSED HERE RATHER THAN LEFT TO ITS CARRIER,**
because this record is what creates it, **and it was wider than the Packet
template.** `src/packet-template.md` shipped block headers reading `# Write one
Section`, `## The Move this Section performs` and `## This Section's Step` — all
using *Section* for what this section calls a **Step**. After this ruling
`This Section's Step` was a category error and `Write one Section` instructed the
realizer to write a whole grouping when it must write one Step. That was not
cosmetic: §3 makes the Packet the realizer's **entire** input, so a word meaning
two things inside it is a defect in the one artifact whose job is to be
unambiguous. **Reconciled at kogaki#825** (PR #847), per the BUILT clause above;
the disclosure is kept in the past tense rather than deleted, because the
collision is what this ruling created and a reader of §2.1's reconciliation
needs the defect it answers.

**THE PER-STEP ARTIFACT IS ITSELF CALLED THE "SECTION PACKET", and that is the
larger half** (PR #826 round 1, finding 2 — the first drafting of this paragraph
named only the template's three headers and was narrower than the collision it
was disclosing). The name appears in **this file** at §3 ("One Step's realization
takes exactly one input: the **Section Packet**"), as the heading of a ratified
spec section — `specs/spec-draft-pipeline/SPEC.md` §4.14, then *The Section
Packet* and now *The Step Packet* —
in `src/draft.mjs`'s own subcommand gloss, at the top of the template, and inside
`checks/registry.json`'s `draft-runtime` contract, which states §4.14 in the same
words. So after this ruling the Section Packet was a **per-Step packet named for
a grouping**, in a served spec heading and in a registered member's admission
record. It is **the Step Packet** as of the reconciliation recorded below.

**Nothing here renames it, and the reason is stated rather than left as an
omission.** A ratified spec section heading and a registry contract are not this
record's to rewrite in an act whose licence is "record Section as a unit"; and a
rename that touched the served spec without touching the registry contract that
quotes it would put two names on one artifact, which is the defect one level
worse than the one being fixed. **#825 carries the reconciliation and its scope
is widened to every site named above**, the template included.

**THE RECONCILIATION IS DECIDED (owner selection 2026-09-03, kogaki#825), AND
THE SITE LIST ABOVE WAS INCOMPLETE.** Two sites carrying *Section* for the
per-Step unit appear in neither the enumeration above nor #825's own table:
`specs/spec-draft-command/SPEC.md`'s trace sentence ("which sections realize
which `step_id`"), and **the `section` subcommand of `src/draft.mjs`**, named
four times in `.claude/skills/draft/SKILL.md`. The second is the expensive one —
`checks/registry.json`'s kogaki#815 clause couples the Harness's entry-point set
to that skill file **in both directions** — and it is why the decision separates
two names rather than treating the collision as one:

- **The proper noun renames completely.** *Section Packet* → **Step Packet**, at
  every site carrying it in one act: `specs/spec-draft-pipeline/SPEC.md` §4.14,
  this file's §2.1 and §3, `checks/registry.json`'s `draft-runtime` contract,
  `src/draft.mjs`, and `src/packet-template.md`. No subset.
- **The ordinary-word misuses are fixed**, the template's block headers and the
  trace sentence included.
- **The `section` subcommand is RETAINED, with the retention recorded** at
  §4.14 and in the skill, so a reader meeting the mismatch finds a decision
  rather than a leftover. Moving a CLI entry point is not licensed by "the
  Packet names its Section"; renaming it is available later on its own licence.

Stated as a decision because the constraint above admits exactly two arms —
rename every site, or rename none and record at each — and this satisfies both,
once per name: one name renamed everywhere, one retained with its retention
recorded at its sites.

**WHAT THIS SECTION DOES NOT DECIDE.** Packet timing and location stay §3's and
#809's. The Step-to-Move contract stays #747's. The `intent`-style question of
how a Section title is *worded* is composition judgment and no rule here binds
it — this record says a title exists and where it is declared, never what it
should say.

**The remedy is constrain-shaped, and the alternative it rules out is named.**
Binding the heading to a Section the Brief declares and mint validates makes
both rejected drafts **unproducible**, rather than adding a check that catches
them after generation:

> "Where a defect class recurs against enumerated post-hoc repairs, the remedy
> is to constrain what the pipeline can PRODUCE rather than to improve what it
> can DETECT — an enumerated prohibition can only name yesterday's leak while a
> construction constraint makes tomorrow's unreachable."

`consulted: product-lab@9e805ff15e94895582c1d99376339f4bfd4b610b LESSONS.md:161`
  request_id: 33256c02-cc24-48ba-98b7-c2f5031b8b58
  outcome: discriminating
  query: a reader needs a promise that the question changes here; document structure and scannability for the reader, headings as a contract with the reader rather than an artifact of how the text was produced

**PLACEMENT, disclosed rather than left to accrete.** This lands in §2 and not
§3 because §2 is where the units and their carriers live, and Section is a
**unit** — §3's `necessity:` scopes it to the Packet's block order, exclusions
and the failure each header defends against, none of which this decides. The
Packet consequence is real and is #825's, named above rather than written into
§3 by this act.

## 3. The Packet architecture

necessity: *the Packet's design is a claim about what a model does with an
input, and the template can state the rules but not the reasoning for the block
ORDER, the exclusions, or which failure each header is defending against.*

One Step's realization takes exactly one input: the **Step Packet** — renamed
from *the Section Packet* at kogaki#825, see §2.1 — rendered by `draft.mjs
packet` from a fixed template. Nothing outside it is read.

**AND THE HARNESS RENDERS IT, as the step immediately before realization
(kogaki#809, owner ruling 2026-09-03).** The sentence above was true of the
design and false of the running system: `draft.mjs` had no ordering between
`packet` and `section`, so a Step could be realized with no Packet ever
rendered — and after a full Draft run there were none. The clause did not fail
because it was wrong; it failed because nothing was obliged to make it true.

The Packet is a **render from a fixed template**, not an owner judgment, so
moving it inside the Harness takes no decision away from anyone. It makes "one
Step, one input" true **by construction** rather than by a session remembering
to run a command.

**The refusal is KEPT AS THE BACKSTOP — and neither half exists yet.**
`section` SHALL refuse to realize a Step whose Packet is absent; the case
render-within cannot see is a Packet deleted or stale between the render and the
realization. Both clauses are **normative and unbuilt at the head that records
them**: `draft.mjs` has no ordering and no refusal between `packet` and
`section`, which is kogaki#809's own defect report, and the carriers are #811
(Harness) and #812 (skill). Stated in that shape deliberately — an earlier
drafting of this paragraph wrote "the refusal stays" and "still refuses", which
assert the CONTINUITY of something that never existed and let a reader arriving
before those land read the gap this section exists to name as already closed.

This is the gate-plus-backstop split rather than a belt-and-braces habit:

> "the preflight stays the BACKSTOP that catches the act's absence, never the
> mechanism that supplies it … the gate catches the act, the brief catches its
> absence"

`consulted: product-lab@9e805ff15e94895582c1d99376339f4bfd4b610b topics/claude-code-ops.md:284`
  request_id: 5f4b00ad-ddb2-4280-874b-e7739828f869
  outcome: discriminating
  query: When a required input can be missing at the moment of use, does the harness refuse the act until the input is produced, or produce the input itself as the preceding step? Which is constraining generation rather than post-hoc detection?

and it is the constrain-generation arm rather than the detection arm:

> "the remedy is to constrain what the pipeline can PRODUCE rather than to
> improve what it can DETECT … detection survives only where free composition
> is irreducible"

`consulted: product-lab@9e805ff15e94895582c1d99376339f4bfd4b610b LESSONS.md:161`
  request_id: 5f4b00ad-ddb2-4280-874b-e7739828f869
  outcome: discriminating
  query: When a required input can be missing at the moment of use, does the harness refuse the act until the input is produced, or produce the input itself as the preceding step? Which is constraining generation rather than post-hoc detection?

**AN INSPECTION PAUSE IS A DISTINCT FACT, and this clause does not decide it
(owner correction at the ruling gate).** It is tempting to read render-within as
trading away the owner's chance to read a Packet before its Step. It does not.
If the design wants that pause, it belongs **after the render** and is its own
clause — never a reason to keep rendering manual. Recorded because the gate that
produced this ruling stated the cost as "the Packet becomes an artifact the
owner reads rather than an act they perform", and that framing invites exactly
the wrong inference: the two are independent, and only one of them is decided
here.

**The skill carries none of this.** `.claude/skills/draft/SKILL.md` SHALL BE
tracked under the same criterion its siblings are — a check asserts against it —
and reduced to invoking the Harness entry points, because under this ruling the
flow ordering lives in the Harness and the skill has nothing left to carry. Also
normative and unbuilt: at this head `git ls-files .claude/skills/` returns
`brief`, `terrain` and `consult-first` only, and #812 is the carrier.

**Placement, disclosed rather than left to accrete.** This clause is about a
CARRIER — which file is tracked and checked — and §3's own `necessity:` line
scopes this section to the reasoning behind the Packet's block order, its
exclusions, and the failure each header defends against. It lodges here because
one ruling decided both forks, not because §3 is its home; §6 (owner state
versus machine state) is the closer neighbour. Recorded rather than moved,
because moving it is its own act and a silent lodging is what turns into
accretion.

The ground is this repository's own incident rather than a general preference:

> "A BYPASS OF SUCH A SYSTEM IS SILENT BY CONSTRUCTION, BECAUSE THE SYSTEM'S
> RECORD ONLY ACCOUNTS FOR WHAT CAME THROUGH IT … Its own skill file said
> 'there is ONE entry point' and, forty lines further down, still listed the two
> old direct commands. The session followed the file's own text."

`consulted: product-lab@9e805ff15e94895582c1d99376339f4bfd4b610b topics/claude-code-ops.md:28`
  request_id: d2ee8773-814a-420e-adc2-9e44d0cf6224
  outcome: discriminating
  query: A skill file that drives a workflow is gitignored while its siblings are tracked, so repository-wide rename sweeps using git grep cannot see it and it still names a removed path. What governs whether such a driver is tracked, and what governs a carrier no sweep can reach?

kogaki#809 is that line's second instance in this repository: the draft skill was
untracked, so #765's `git grep` rename sweep could not see it; it still names
`draft/draft.mjs`, removed 2026-09-02; and it never mentions the Packet at all.
**Tracking it is necessary and not sufficient** — a tracked skill can still say
the wrong thing. What makes the ordering hold is that it lives in the Harness,
and tracking is what lets a sweep and a check reach the file at all.

**Every block opens with a fixed usage header**, because a block whose use is
not stated gets used for whatever it resembles. The exemplar block is the one
that fails worst — read as content rather than as form, it hands the article
another article's subject matter — which is why its header is imperative.

**Block order is fixed**: anchors, the Move's contract, the Step, the
reader-knowledge ledger, prior Sections verbatim, the write instruction. Heavy
prose late; instruction last.

**`requires`/`effect` are excluded**, and this is the design's sharpest
exclusion. The Step's instantiated states are the instance forms of exactly
those two fields, so rendering both would put the general and the specialized
statement of one thing side by side and leave the model to choose between them.

**A missing input refuses by name rather than rendering an empty slot.** In an
input that is the model's entire world, a hole is not a gap the model notices —
it is a hole the model fills by invention.

**The reader-knowledge ledger is always computed and never stored.** What a
reader knows at Step N is the union of Steps 1..N−1's `introduces` entries,
recomputed wherever it is needed. A stored copy would be a second answer to a
question the path already answers, wrong the moment a Step moved. What it buys
is that an unintroduced term becomes **addressable** — to the first Step
carrying it, or to the Brief when none does.

## 4. Plain register, and the round trip

necessity: *the two operational clauses live in the Packet template because the
model reads them at generation; what cannot live there is WHY impersonation was
replaced rather than abbreviated, which is the ground a later editor needs
before changing the wording.*

**This document is the normative home of the round-trip concession clause.**

Plain register is defined **operationally** and derived by **translation with a
round-trip test**, because audience impersonation is a prompt that produces
condescension rather than a constraint anything can hold.

**The three controls are named here and their TEXT is not.** Two of them —
the operational definition and the round-trip test — are **operational**, so
their carrier is `src/packet-template.md`, which the model reads at generation.
The third, candidates rather than a single rendering, is discharged by the
selection gate that already exists.

**The served position this rests on, carried here at kogaki#749** when
`specs/spec-style-contract/` was deleted — a ground with no receipt is an
assertion, and the spec that held the pin is gone:

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

**This section holds their GROUND**, which is the half a template cannot carry:
*why* impersonation was replaced rather than abbreviated. Writing for an
imagined audience is not a weaker version of the same instruction — it is a
different instruction, and it produces condescension, which is why the three
controls replace it rather than refining it. A later editor changing the
template's wording needs that reason and will not find it in the template.

**The restatement was made and removed in the same PR** (#781 round 1), and the
correction is recorded because it is this section's own subject: the first draft
stated both clauses in full and then declared four paragraphs later that it did
not restate them. That would have put the operational text in **three** places
and is exactly what §5's third prohibition forbids — a document ratifying a
prohibition while breaching it is the sharpest form of the drift it names.

**The concession's mechanical carrier is `checks/check-brief-compose.sh` case
(o)**, and its history is recorded because the gap it closes was real: the
refusal lived in a member removed at kogaki#770, whose re-homing took one
assertion and left the rest. Between that removal and kogaki#752 the rule was
live — the composer emitted concessions and the gate registry required them —
and nothing refused a missing one.

## 5. Three standing prohibitions

necessity: *a prohibition's ground is not checkable and its violation is a
DESIGN act rather than a runtime one — nothing at runtime can observe a second
style artifact being created, because creating it is a person deciding to.*

**These three are re-homed here from `specs/spec-style-contract/` (kogaki#749).**
This document is their normative home.

1. **No per-run style questions.** Style is never asked at run time. A run that
   opens a style question has converted a settled property into a per-run
   negotiation, and the cost is paid by the owner on every run thereafter.
2. **No syntax metrics anywhere in a run.** Sentence lengths, word counts,
   readability indices: a syntax metric added anywhere in this pipeline has
   **failed** this design rather than extended it, because it measures a proxy
   for the property the round trip measures directly. The served position,
   carried here at kogaki#749 with the deletion:

   > "**Syntax profile carries NO instrument, and is named as the contract
   > section most likely to grow a bad one.** Sentence-length distribution and
   > hedging density are the only style properties a machine can measure
   > cheaply, which is exactly why they will attract enforcement — and a
   > distribution check is a proxy for voice, not voice. An instrument that
   > measures the measurable NEIGHBOUR of a property teaches conformance to
   > the neighbour."

   `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/articles.md:69`
3. **No second style-constitution artifact.** One carrier for the operational
   rules — the Packet template — and this record for their ground. A third
   document restating either is the conformance copy that drifts.

## 6. Lifetimes: what is owner state and what is machine state

necessity: *the split is a decision about who owns a file, and no file declares
its own owner — the boundary is legible only as a rule stated once.*

**`theses/<slug>/`** is **owner state**: the Brief and the CanonicalDraft, in
the repository, read by people. The runtime **creates and never edits** them
beyond the landing writes their own commands make; a collision refuses rather
than overwriting.

**The run workspace** is **machine state**: run records, per-block snapshots,
realized Sections, rendered Packets. Disposable, and never the artifact. It
lives at `runs/<lane>/` in the repository — `runs/draft/<slug>/` for this lane
— since **kogaki#750**, which also moved the Packet's retention path there; it
lived under the home directory before that. This paragraph is amended rather
than left describing a location that has changed, which is what the sentence it
replaces said it owed.

**Repo-visible is not owner-facing, and the distinction is the whole of why the
move is not a reclassification.** `specs/SPEC.md` §4 rider 2 says a human-facing
file under a machine-local hidden directory is *declared* machine-facing; it
does not say the converse, and the discriminator §2.5.1 gives is **lifetime**,
never location — a run workspace holds things whose lifetime is the run. What
the tree buys is legibility to a contributor and a bound that a hidden directory
never got: `runs/` is gitignored but for its README, each run prunes its own lane
to the last K, and `rm -rf runs/` is safe by construction.

**The rule that makes the split usable:** machine identity never enters an
owner artifact. A Brief carries no run id, no timestamp and no workspace path,
which is why the same Brief re-realized twice produces the same document.

## 7. What this record supersedes, and what it does not

necessity: *a reader arriving at three documents about two lanes needs to be
told which is current, and no mechanism can tell them.*

`specs/spec-draft-pipeline/SPEC.md` and `specs/spec-draft-command/SPEC.md` are
**pre-implementation documents** — written before the lanes existed, and amended
since rather than re-cut against what was built. They remain the carriers of
their own numbered sections, which the runtimes and checks cite by number, so
they are **not dissolved** here.

**Where this record and those specs disagree about ARCHITECTURE, this record is
current**, because it was extracted from the implementation. Where they state a
numbered contract a runtime cites, the numbered contract governs.

**The re-cut is bounded and not completed here** (kogaki#752's own "as this
work encounters them"). Re-extracting a 3,839-line pre-implementation document
is its own act with its own licence, and folding it into this one would put an
eviction judgment behind a writing act.

### The style contract's deletion, and what was DECLINED with it

`specs/spec-style-contract/` was **deleted at kogaki#749**. The ruling was
"deleted, with its obligations re-homed, **not preserved**", and the
completeness criterion is stated here rather than left to the deletion's own
one-sided purity test — a criterion that measures what must NOT remain is
satisfied most cheaply by removing behaviour.

**What survived, and where:**

| held | fate |
|---|---|
| §4 clauses 1–2 (the operational definition, the round-trip test) | `src/packet-template.md` — operational, read at generation |
| §4's ground + its pinned served quote | §4 above |
| §3's prohibition + its pinned served quote | §5 prohibition 2 above |
| §1's no-per-run-style-questions, the no-second-artifact rule | §5 prohibitions 1 and 3 above |
| the round-trip concession's mechanical refusal | `checks/check-brief-compose.sh` case (o) |

**What was DECLINED, named rather than dropped silently:** §2 (sections sort by
carrier), §5 (exemplar slots declared and empty), §6 (the record format), §7
(the admission register), §8 (open questions), §9 (out of scope), and §10's
remaining reads. All of it is **protocol for an owner-authored document that
was never authored** — the issue's own search recorded "no instance ever
authored" — so it governs an artifact with no instances, and an operative
document holding a superseded or unexercised protocol reinstalls it for the
next reader. It lives in version control and on kogaki#426's thread.

**Twenty referrers were repointed**, found by sweeping the deleted file's
name over the whole tree *before* deleting rather than after: `specs/SPEC.md`
×2, `spec-draft-pipeline` ×11, `spec-draft-command` ×2, `gates/registry.json`,
`src/brief.mjs` ×2, `src/draft.mjs`, and this record. Three earlier review
rounds had between them found five of them, one file at a time, because each
round swept only what its own diff touched.

**This paragraph said TWENTY, then TWENTY-ONE, and twenty was right both
times** (PR #782 rounds 1 and 2; reg-0221). Round 1 found `gates/registry.json`
counted by the sweep and skipped by the repointing, so the record asserted an
act that was not performed — worse than the omission, because a reader checking
the claim would have stopped at the list. The repair repointed the file and
**incremented the headline**, which was the second error and the instructive
one: repointing a file already inside the twenty makes the two figures AGREE at
twenty rather than raising either. A count is a claim about set MEMBERSHIP, and
membership is answered by the enumeration beside it — so the headline is
**re-derived, never edited**, and an edit to it is the move that produced both
defects.

Re-derived at kogaki#750, from the tree rather than from either headline. At
the deletion's base commit `3840ba6`:

    git grep -o -i "style.contract" 3840ba6 -- . ':!specs/spec-style-contract' | wc -l   # 23
    git grep -o -i "style.contract" 3840ba6 -- . ':!specs/spec-style-contract' \
        ':!reviews/register' | wc -l                                                     # 20

The bare command returns **38**; the first exclusion drops the 15 occurrences
inside the deleted spec's own directory, which are not referrers to it, and the
second drops **3** register records — historical records of what a round found,
never repointed. **20** remain, across the seven files the enumeration above
names.

**The commands are written out because the first form of this paragraph gave
the count without the exclusions** (PR #783 round 1) — it said 23 where the
command as stated returns 38. The headline was right and the derivation a
reader was invited to re-run was not, in the paragraph whose whole subject is
that the enumeration is the evidence. The paragraph confessing the first
miscount is where the second one landed, one commit later; the recipe that
could not reproduce is the third instance of the same act.

**deferred slot: the spec-draft-pipeline re-cut.** Owed on its own licensing
issue, with the criteria applied section by section.
