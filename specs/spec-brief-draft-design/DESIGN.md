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

## 2. The Move–Step–Strand model

necessity: *the three-way distinction is what makes the vocabulary usable, and
each term's carrier holds only its own half — `moves/` holds a Move, a Brief
holds a Step, a survey holds a Strand, and nothing holds the relation between
them.*

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

## 3. The Packet architecture

necessity: *the Packet's design is a claim about what a model does with an
input, and the template can state the rules but not the reasoning for the block
ORDER, the exclusions, or which failure each header is defending against.*

One Step's realization takes exactly one input: the **Section Packet**, rendered
by `draft.mjs packet` from a fixed template. Nothing outside it is read.

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
