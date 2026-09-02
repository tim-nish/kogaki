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
realized Sections, rendered Packets. Machine-local, disposable, and never the
artifact. It lives under the home directory today; `runs/` in the repository is
the ratified destination and is **owed to kogaki#750**, at which point the
Packet's retention path moves and this paragraph is amended rather than left
describing a location that has changed.

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

**Twenty-one referrers were repointed**, found by sweeping the deleted file's
name over the whole tree *before* deleting rather than after: `specs/SPEC.md`
×2, `spec-draft-pipeline` ×11, `spec-draft-command` ×2, `gates/registry.json`,
`src/brief.mjs` ×2, `src/draft.mjs`, and this record. Three earlier review
rounds had between them found five of them, one file at a time, because each
round swept only what its own diff touched.

**This paragraph first said TWENTY and named `gates/registry.json` among them
while that file was not in the diff at all** (PR #782 round 1). The sweep had
counted it and the repointing had skipped it, so the completeness record
asserted an act that was not performed — which is worse than the omission,
because a reader checking the claim would have stopped at the list. Recorded
rather than silently corrected: a paragraph whose subject is completeness is
the one place an unverified count does the most damage, and the count here was
written from the sweep rather than from the diff.

**deferred slot: the spec-draft-pipeline re-cut.** Owed on its own licensing
issue, with the criteria applied section by section.
