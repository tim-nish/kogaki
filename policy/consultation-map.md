# Consultation map — the occasions file

Boundaries at which policy consultation is **required** before acting.
Contract (founding spec §4):

- An entry = **trigger terms** + a **read prescription** + a one-line summary
  **quoting the served line at its pin** + the pointer. Never a paraphrased
  rule — on divergence the served surface wins and the entry is repaired.
- Entries are **admitted** only on a miss: a defect that consultation would
  have prevented, exposed in this repo. Each **admission** names the miss and
  records its **postmortem**. **The miss rule binds ADMISSION and never
  PROPOSAL** — the distinction is stated in full below under *Admission and
  proposal*, and the unqualified reading of this bullet is what that section
  corrects (kogaki#222).
- The map **triggers consultation, never carries verdicts.** The answer
  stays in the substrate.

## Admission and proposal — the miss rule binds one and not the other (kogaki#222)

**The contract bullet above, read unqualified, says a machine may not propose a
map entry. That reading is wrong, and it is written down here rather than left
to be inferred**, because the first reader of this file would otherwise meet a
rule that the proposers scheduled against it contradict on their face. The
served position is quoted whole at its pin:

> "2026-08-07 — **The admission-vs-proposal half survives VERBATIM — miss-only
> growth binds ADMISSION, never PROPOSAL, and mechanized miss harvesting plus
> receipt-absence mining remain legitimate proposers — while the third
> proposer's re-route to the served baseline is STRUCK: wholesale derivation
> from the tag vocabulary lands instead as an ordinary ONE-TIME SEEDING BATCH
> of staged lessons.** Supersedes the held seam D4 under
> q_a/2026-08-07-baseline-dissolution-and-consult-discipline D5.
> (q_a/2026-08-05-consultation-seam-vocabulary-and-allocation §4 R2)"

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:26`

The same distinction is restated on the served surface at its own pin, in the
seeding batch's line, with the reason it is restated there — an excerpt from a
longer line, marked, never spliced with another:

> "… MISS-ONLY GROWTH BINDS ADMISSION, NEVER PROPOSAL, so the batch may propose
> freely from existing decision content while each member still needs its own
> `[x]`."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:15`

**What this permits.** A **proposal** — a candidate entry offered to the
admission act — may be produced by any means, including a machine, and needs no
miss of its own to be *offered*. Two mechanized proposers are named on the
served line and are therefore legitimate here:

1. **Miss harvesting** — a recorded consult outcome token of
   `covered-after-reframing` or `uncovered-after-N-framings` proposes an entry
   for the occasion that produced it.
2. **Receipt-absence mining** — the review lane's boundary-vs-receipt record
   (`.claude/skills/review-lane/SKILL.md` §2, *Consultation-map boundaries
   touched*) proposes the missing occasion where a boundary was touched with no
   receipt.

**What this does not permit, and why the line is exactly here.** Neither
proposer writes this file. Admission stays a human act, still requires the
miss, and still records the postmortem — and the ground is this map's founding
Invariant 2, an excerpt quoted at its own pin:

> "… Invariant 2: the map triggers CONSULTATION and never encodes verdicts,
> because an entry that starts answering is a second authority growing in the
> dark, sited next to the code where it carries more apparent weight than the
> surface it copied."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:69`

A proposer that admitted its own findings would be precisely that second
authority. So the split is not bureaucratic symmetry: **proposal is a
generation act and admission is a judgment act**, and only the second one is
what the miss rule was ever protecting.

**Out of scope, declared so this section is not read as licensing it.**
Wholesale derivation of entries from the corpus is **struck** as a proposer by
the same served line above; the ratified re-route lands it as a **one-time
seeding batch of staged lessons through the normal admission gate**, never as a
standing proposer. A future sitting reading "a machine may propose" as cover for
a corpus derivation pass is reading past the sentence that struck it.

**A machine-composed proposal discloses its derivation source, and the
postmortem's question field is where that binds** — see *Miss postmortem*
below, whose disclosure cases are widened by this section rather than
reinterpreted by it.

### `deferred-slot: proposer-siting` is FILLED — the split is by PORTABILITY (kogaki#222)

**Owner decision 2026-08-08, kogaki#222.** The two proposers named above are
sited **apart**, and the axis is what each one READS:

- **Miss harvesting** (story 1.40) lives in **`policy/kit/bin/`**. Its whole
  input is the receipt's `outcome` token, whose value set is the **hub's** and
  not this repository's, so the proposer works unchanged in any kit-installing
  consumer. It travels with the kit because it depends on nothing this
  repository authors.
- **Receipt-absence mining** (story 1.41) lives in **`tools/`**, beside
  `tools/review-sweep.sh`. Its input is `.claude/skills/review-lane/SKILL.md`
  §2's boundary-vs-receipt record — an artifact **this** repository authors and
  whose shape this repository owns. It cannot travel, and a copy of it in the
  kit would be a component whose input does not exist at the other end.

**Recorded before code embeds it**, which is the decide-or-name rule's own
requirement and not a courtesy — an excerpt quoted at its pin:

> "… a sitting that leaves a design choice to the implementation either DECIDES
> the fork there, consulting the substrate on it, or emits a NAMED SLOT whose
> filling is itself a decision act — consult, then record choice, alternatives
> and receipt on the licensing issue BEFORE code embeds it."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:41`

**What discriminates it.** **One** served line does the work, and it is quoted
here under the grounds rather than under an alternative — the correction PR #256
round 2 earned by reading all three citations at the pin instead of accepting
this record's reading of them:

> "Decide whether two knowledge stores belong in one repository based on
> whether they could ever have different visibility, not on whether they cover
> similar subject matter. … When in doubt, keep them separate and connect them
> with pointers"

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/lessons/knowledge-architecture.md:311`
(`repo-boundaries-follow-publication-boundaries`)

Run over these two proposers it yields the split **directly**, with no extension
of its terms. `policy/kit/bin/` and `tools/` have **different visibility
futures**: the kit separates into its own repository when a second
kit-installing consumer exists (kogaki#9), and `tools/` never leaves. Miss
harvesting can live on the far side of that separation, because everything it
reads — the hub's `outcome` vocabulary — is there too; receipt-absence mining
cannot, because its input stays behind. The two proposers **are** kin in subject
matter (both grow this map), and that is precisely the reason the rule says is
not one.

**Two supporting lines, and what each is and is not doing.** Recorded this way
rather than as grounds, because that is where PR #256 round 2 found this record
wrong: both quotes are verbatim and both pins real, and the defect was
application, not transcription.

*`:47` — the siting rule, EXTENDED, with the extension named rather than
hidden.* Served:

> "… The siting rule is who writes a file determines where it lives — the
> consultation map is consumer-local because consumers author its content
> (their own misses) and the baseline is hub-served because the owner authors
> its content …"

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:47`

On its own terms the rule keys on **who authors the sited file's own content**,
and both of its worked examples are of that form. Kogaki authors **both**
proposer scripts, so `:47` does not split them, and read strictly it points at
A2. What it supplies is the weaker and still useful thing: that siting is
settled by an **authorship** fact rather than by convenience. Extending that
fact from the file to the file's **input** is **this repository's step, not a
served one**, and it is recorded as an extension so no later reader mistakes it
for a citation.

*`:31` — vocabulary ownership, adjacent to siting and not siting.* The same line
story 1.40 AC2 quotes for the token set:

> "A consumer owns the SHAPE of its own record and NEVER the VALUES of a field
> that exists to join across the boundary, and the test is WHO MUST AGREE for
> the field to work: a field read by one side is that side's, a field read by
> both is the boundary's, and the boundary's owner is the hub."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:31`

What it settles is **which side each proposer's input belongs to** — the
`outcome` token is read by both sides and is the boundary's; the review lane's
report is read by one side and is this repository's. That is the premise the
visibility rule above then acts on. What it does **not** say is where a *reader*
of that field lives; the step "the field is the boundary's, so its reader is
kit-shaped" is unserved, and `:31` calls the receipt's field set "a CONSUMER
DESIGN DECISION", which cuts mildly the other way.

**The alternatives, recorded because a decision without them is an assertion.**

*A2 — both in `tools/`, deferring the export until a second kit-installing
consumer exists.* Its appeal is real: the separation trigger has not fired, and
`policy/kit/` sits in this repository today anyway. **Declined on the cost of
finding out late.** A packaging error is invisible to every executed path —
"a design model can be correct on every executed path and wrong in where its
files sit, because nothing executes a directory layout"
(`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:56`),
the line that also records the 2026-08-05 audit finding the kit's design HELD
BEHAVIORALLY AND BROKE IN PACKAGING with two colocation defaults. So the
deferral does not buy information; it buys a relocation nothing will signal is
owed. **The cost of declining it is stated rather than hidden:** if the second
consumer never arrives, the portable proposer sat in the kit for no benefit —
a directory, and no runtime difference.

*A3 — both in `policy/kit/bin/`, one home.* **Declined because it exports a
repository-specific component into a package built to be repository-neutral,
across a boundary that is one-way.** The kit separates into its own repository
when a second kit-installing consumer exists (kogaki#9, and
`topics/knowledge-architecture.md:56@dec0d568` above). This is **the same served
line the grounds above turn on** —
`gloss/lessons/knowledge-architecture.md:311@dec0d568`, membership by visibility
and never by subject-matter kinship — pointed at rather than re-quoted here, per
`pointer-not-copy-for-readable-assets`: a rule that discriminates a fork also
declines the arm it discriminates against, and quoting it twice would make this
section carry its own conformance copy. The Layer-2 boundary is
untouched by this fill and is restated rather than assumed to have survived it,
per the served surface's own handling of the last home change
(`topics/knowledge-architecture.md:57@dec0d568`): packaging for the owner's own
repositories is internal work and proceeds; the kit as a product for unknown
third parties stays a held candidate, and siting one file in `policy/kit/bin/`
is not a step toward it.

**The counter-line, met rather than skipped.** `encode-the-boundary-that-is-real`
warns against baking a distinction whose axis has only one live value
(`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/lessons/knowledge-architecture.md:239`).
It does not bite here, and the reason is the test the lesson itself gives:
portability has **two live values in today's content** — one proposer reads the
hub's grammar, the other reads a local record — so the boundary already has two
real sides rather than an anticipated second one.

**The naming sitting's premise is CORRECTED here, not carried forward.**
kogaki#222 named this slot with "no served line discriminates it". Re-read at
the current pin — the issue pinned `product-lab@98195e0a`, the served surface
answers at `@dec0d568` — that premise is **false**:
`gloss/lessons/knowledge-architecture.md:311` discriminates it directly, on its
own terms and without extension. The correction is reported rather than quietly
reconciled, which is the disposition discipline this file's entry 3 exists for.
It changes nothing about the fill: the served rule and the owner's selection
agree, so no fork re-opens.

**Which line falsifies the premise was itself corrected**, and the correction is
recorded rather than smoothed over. This record first hung the falsification on
`:47` and `:31`, and PR #256 round 2 read all three citations at the pin and
found that the first two do not carry it — the transcription was faultless and
the *application* was not, which is the residue the receipt machinery
structurally cannot catch. `:311` was already quoted here, under declined
alternative A3, so the falsification was sound and mis-filed rather than
unfounded. The grounds above are re-cut to say so.

**What this fill does NOT decide.** File names, whether the two proposers share
a module or a library, and whether either is ever registered as a check (both
stories declare that out of scope) are the implementing sittings' to settle;
none is a named slot and none is this decision. Story 1.41's own precondition —
a declared line shape for `SKILL.md` §2's record — is a separate, still
undischarged obligation and is not touched here.

**Why this record sits in this file without violating Invariant 2.** Invariant
2 refuses an **entry** that encodes a verdict, because an entry that answers is
a second authority beside the substrate it copied. This is not an entry and not
a policy answer: it is this repository's own decision about where its own files
sit. **Stated exactly, because it is a first:** the four prior deferred-slot
fills all sit in a *spec* file (`specs/SPEC.md:606`, `:976`, `:1449`,
`specs/spec-terrain/SPEC.md:1635`), and this is the first sited outside one. The
governing principle is unchanged — a fill lands in the section that governs the
surface — and `7b23d32` ratified the proposers entirely inside this file, with
`specs/SPEC.md` carrying no proposer governance at all. What is new is only that
the governing section happens not to be a spec (PR #256 round 2, `carried:
register`). It is recorded in the section that ratified the proposers because that
is where the next reader meets them. The served lines above are quoted at their
pins as grounds, and on any divergence the served surface wins.

## The two structured halves (schema v2, kogaki#24)

**Read prescription** — the act class, and the served gloss shard(s) to
survey **headline-first before acting**. Why the prescription exists, and why
it is admissible under the finding-aid carve-out, is stated once in
`specs/SPEC.md` §4's consultation-map bullet; this file carries the schema
mechanics and does not restate the rationale. Two copies of a governing rule
is the conformance-copy shape the pinned-quote invariant already refuses.

A shard is addressed **`<kind>/<tag>`, never `<tag>` alone** — the served
surface's own kind-qualification rule, quoted at its pin:

> **Shard kinds** (`specs/gloss.md` §5.1 — a shard is addressed by
> `<kind>/<tag>`, never by `<tag>` alone):

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/INDEX.md:12-17`

The kinds are `lessons/<tag>`, `journeys/<tag>`, and `decisions/<topic>` —
the last sharded by topic rather than by tag. A prescription names that
address, which is the argument `gloss_index` takes; it never names a served
file path, because a path is a fact about how the substrate stores its
renderings and this map may not depend on one.

**A `Served line (pinned)` pin must RESOLVE ON THE SERVED SURFACE** (kogaki#176).
The pin's own enumeration is `surface_names`, and it returns
`topics/…`, `gloss/lessons/…`, `gloss/journeys/…`, `gloss/decisions/…` and
nothing else — so a pin into a hub *repository* path (`specs/qa-gateway.md`
was the one filed) names a file the served surface will never return, and an
entry carrying one cannot be checked against the surface that is supposed to
win on divergence. That is the pinned-quote invariant's own defect class,
committed by the file that exists to prevent it: the entry looks pinned, and
nothing about it says the pin was never resolvable. Resolve the pin before the
entry lands, and record the hub commit it resolved at.

**Its ground is this map's founding Invariant 1, quoted at its pin** — the
clause is the operative reading of a ratified position, not a new one:

> "… Invariant 1: entries are pointers + trigger terms + a one-line summary
> QUOTING the served line at its pin, never a paraphrase — a paraphrase makes
> the map a conformance copy with no declared precedence, and on any divergence
> the served surface wins and the entry is repaired."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:69`

Both of that invariant's limbs entail the clause. A pin into a hub repository
path quotes no *served* line, so such an entry fails the first limb outright;
and the repair the second limb prescribes — the served surface wins, the entry
is repaired — is inoperable for an entry that can never be checked against that
surface. Refusing at authoring is therefore not an added rule but the only
moment at which such an entry could conform, because it cannot conform later.

### A RESOLVING pin is not a STANDING one — this file's own cites drifted, and what now observes the next drift (kogaki#266)

**What happened, stated before the remedy.** Six of this file's served cites
were pinned at `product-lab@98195e0a`. The hub moved to `dec0d568` and **every
one of them still resolved — to a different decision line than the one quoted
beside it.** Not one was missing; each prescribed lesson still existed, intact,
further down its file. Re-read line by line at `dec0d568` through the gateway
and repaired here: `topics/knowledge-architecture.md:44 → :69` (this section's
own Invariant 1 ground, the sharpest instance — the file's warrant for its own
form was mis-pinned), `topics/claude-code-ops.md:22 → :41` and `:24 → :43`
(entry 1's two lines), and entry 3's three,
`gloss/lessons/knowledge-architecture.md:41 → :47`, `:197 → :209`, `:257 → :269`.
Two further cites were pinned at older commits — `gloss/INDEX.md:12-17@ed47fbd`
and `topics/archive/knowledge-architecture.md:271@bb68ccf` — and were **not**
drifted: both were re-read at `dec0d568`, found byte-identical, and had their
pins refreshed rather than repaired. That distinction is reported rather than
folded into a count of six, because a repair that overstates its own evidence
is the defect class this section exists for.

**Why nothing caught it, and why the obvious remedy is REFUSED rather than
deferred.** `policy/kit/bin/issue-pins.mjs --recheck` compares stored
`pin-quote:` hashes against re-fetched text — real content verification, and it
is kogaki's own file, since `policy/kit/install.sh` never copies `bin/`. So the
first question is whether this file's cites can simply carry those hashes.
**They cannot today, and the reason was established by running the tool over
this file rather than by reading it:** `--emit-pin-quotes` hashed **9 of this
file's 24 cites**. `parseCites` recognises a `consulted:` line only when it is
unindented and unwrapped, and this file wraps every one of them in inline
backticks as prose formatting, so fifteen cites — including the
`topics/knowledge-architecture.md:44` instance above, the very worst of the six
— are invisible to the parser. Of the nine it did see, one more was declined
(`topics/archive/…` has no `servedAddress` form, though `policy_lookup` serves
it), and this file's one range cite routes to `cannot-tell` by contract.

Landing a checker over that 9-of-24 subset would fail **this file's own entry 3
prescription**, quoted there at its pin: *"When you write a rule that names a
source, also name what a complete read of that source includes — otherwise
every partial view counts as compliance"*
(`gloss/lessons/knowledge-architecture.md:47@dec0d568`,
`a-partial-projection-can-satisfy-a-total-read-rule`). A green check covering
nine cites, over a file whose rule is that *every* cite is checked, is that
lesson exactly — and it would be quieter than today's silence, because today at
least nothing claims coverage. So the partial mechanism is **declined on the
ground rather than deferred for capacity.**

**What the mechanism costs, named rather than left as "future work."** It needs
a decision this sitting may not take alone: widening `parseCites` to see a
backticked `consulted:` line widens what counts as an **emission** for every
issue body the kit parses, which is the use-vs-mention boundary kogaki#41 drew
and kogaki#209 hardened. That is a fork, and per DECIDE-OR-NAME —
*"a sitting that leaves a design choice to the implementation either DECIDES the
fork there, consulting the substrate on it, or emits a NAMED SLOT whose filling
is itself a decision act"* (`topics/knowledge-architecture.md:41@dec0d568`) —
it is emitted as a named carrier and not improvised.

- `carried: #274` — the mechanization: the parser fork above, where this file's
  `pin-quote:` block lives, and the registered check that reads it. **Kogaki's
  own, no handoff owed**; the shipped template
  (`policy/kit/templates/consultation-map.md`) carries none of these cites, so
  no consumer inherits the drift.
- **`instrument: none`** — written rather than implied, which is this
  repository's own requirement of a decline. **Until #274 lands, the only thing
  observing a drift in this file is a lane that re-reads a cite's content at
  the current pin by hand.** That discipline caught all six of these; it is not
  a mechanism, it fires only where someone happens to look, and saying so is the
  point of writing it down.

**This clause SHIPPED UNLICENSED, and that is recorded here rather than
repaired away.** It landed in PR #173 attributed to `(kogaki#171)` — whose text
is entirely about the *occasion* (a new map entry filed on a miss) and never
about this file's **contract half**. PR #173's own review lane caught it as
finding 1 (at head `ac2a356`) and prescribed a re-route rather than a revert.
kogaki#176 is that re-route: it supplies the licence the clause never had, on
the served ground above, which is why line one of this clause now attributes to
#176. For the interval between landing and ratification the clause bound every
filer with no licence behind it. That gap stays written down, because a clause
quietly legitimised by later use — attribution tidied, history closed — is
precisely the shape this file exists to surface.

**Entry 1 was this clause's one non-conformer, and its repair — kogaki#175 —
is recorded here rather than tidied away.** As filed, entry 1's pin named
`topics/claude-code-ops.md` with no line and no hub commit ("2026-08-04
governance lines"), which is exactly the condition this clause describes;
entries 2 and 3 conformed. **The non-conformance was broader than the missing
line.** Entry 1's quoted text sat on **no single served line**: "a check suite
is budgeted at its loop position; suite membership is opt-in per loop;
admission carries a removal signal" is line 22's kernel **as that file stood at
`98195e0a`** — which ends there, full stop — while "declared at birth" was taken
from the same commit's line 24, "Admission requires a REMOVAL SIGNAL DECLARED AT
BIRTH". Both line numbers in this paragraph are `@98195e0a` facts and resolve
nowhere useful at the current head; the entry's own cites above carry the
current ones. The entry read as one quotation
and was a **splice of two lines**, and the unresolvable pin is precisely what
kept that invisible: nothing could be checked against the surface that is
supposed to win on divergence. This was the clause's own case rather than an
exception to it.

**What the repair therefore had to do, and why adding `:22@<sha>` would not
have been one.** Pinning the spliced text to `:22` would have produced a pin
resolving to a line the quote does not match — the divergence case, newly
created by the repair. The quote had to be **re-cut**. Resolving it at
`98195e0a` shows the position entry 1 was reaching for genuinely spans two
served lines: the budgeting/opt-in kernel at `:22`, and the removal-signal-at-
birth admission rule at `:24`, which is the operative half for that entry's act
class. Entry 1 now quotes **both, each at its own pin** — the form entry 3
already uses — rather than paraphrasing two lines into one sentence, which
would be the splice defect one level down. Invariant 1's binding property is
that the text be a verbatim served quote resolvable at its pin and carry no
verdict; it is not a requirement that an entry cite exactly one line.
**The kernel quote is an EXCERPT and now says so** (kogaki#266): it is the
closing clause of a longer decision line and carries the leading `…` this file's
own excerpt convention requires, which is what keeps it distinguishable from the
splice it replaced — a splice joins two lines and reads as one, an excerpt takes
part of one line and marks the part it left. The removal-signal quote is the
line's opening sentence and is whole; the third fragment beside it
(`NO CURRENT MEMBER CARRIES ONE`) is mid-line and is already carried inside
prose rather than as a standalone quotation.

**Why the trail stays.** For the interval between PR #173 and kogaki#175 this
file stated a rule its own first entry failed, and a reader had nothing telling
them so — the latent contradiction this map exists to surface. That the defect
was found by resolving the pin, and only because someone resolved it, is the
part worth keeping: the clause is not merely satisfied here, it is what made the
splice findable. The clause was declared forward-binding rather than applied
retroactively at landing because repairing entry 1 meant re-resolving its served
line *and* re-cutting its quote, which no issue in front of this file then
authorized; kogaki#175 is that carrier, and the repair happened there rather
than silently.

**Miss postmortem** — recorded when an entry is **admitted** on a miss:

- **Violating artifact** — what shipped, or was about to.
- **Triggering terms** — the terms present in it that would have fired this
  entry. **Every term named here is also declared in the entry's own trigger
  terms above.** A postmortem term the entry does not declare is a term
  nothing matches on: the merge-layer binding computes over the *declared*
  list, so the postmortem would be naming a trigger that cannot fire.
- **The question, verbatim** — the query that would have found the served
  line. This is the field the map accumulates: situation-specific keys for
  reaching a particular ruling, written by the sitting that discovered one
  was needed.

**A postmortem discloses the provenance of its question in the question's own
prose.** The field is worth accumulating only if a reader can tell a query
that was *run* from one that was *composed afterwards*, and the two are
indistinguishable once written down. Three cases, all disclosed the same way
— in the prose, no separate field:

- **recorded** — the query was actually issued and the receipt carries it;
  quote it as issued.
- **reconstructed** — the miss is on the record but no query was captured
  (receipts predating the query convention, or a defect found by other
  means); say **reconstructed at this filing, not run**, then give the
  question.
- **none recorded** — the miss predates the map and no query was ever
  composed; say so and give no question.

Inventing a question and presenting it as a recorded one is the
conformance-copy defect the pinned-quote rule refuses, moved into a new
field.

**A FOURTH CASE, and the derivation rule that governs a machine-composed
proposal** (kogaki#222). The three cases above were written for human acts, and
the receipt-absence proposer produces a case none of them fits: a boundary was
touched and **no consultation happened at all**, which is neither *recorded*
(no query was issued), nor *reconstructed* (there is a live record and inventing
a question for it is exactly what the rule above refuses), nor *none recorded*
— that case is scoped to a miss predating the map, and this one does not
predate anything.

- **not asked** — the proposal is derived from a **receipt-absence** record: a
  boundary matched and the branch carried no receipt. Say **not asked — derived
  from `<the review-lane record and its PR>`**, and give **no** question. The
  absent question is the finding; supplying one would delete it.

And binding every machine-composed proposal, whichever case it lands in:

- **The proposal names the record it was derived from** — the receipt's
  `request_id` for a miss-harvested proposal, the review-lane
  boundary-vs-receipt row for a mined one. A miss-harvested proposal fills
  *recorded* from the receipt's own `query:` line and **quotes it as issued**;
  it may not compose a better one, because the honest field is the question
  that actually ran.

The ground is served, and it is about derived expressions generally rather than
about this file — an excerpt quoted at its own pin:

> "… Keeping a group claim over a changed subset asserts commonality over
> absent members — a provenance lie — while discarding it throws away the only
> thing in the interaction the machine did not supply. … a derived expression's
> truth is relative to the set it was derived from, so the derivation carries
> that set and a change to the set is a GATE EVENT rather than a refresh."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:88`

A proposal is a derived expression and its source set is the record it was
harvested from. Carrying that record is what keeps a machine-composed
postmortem legible at the admission gate rather than indistinguishable from one
a human wrote — and the map's own choice is the one that line prescribes:
**make the provenance legible, never forbid the proposal.**

## Entries

### 1. Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the registry

- **Trigger terms:** check, checker, suite, hook, CI, registry, lint,
  gate script
- **Read prescription:**
  - *act class:* admitting, modifying, or retiring a check, hook, or CI
    surface.
  - *survey before acting:* `gloss_index("lessons/claude-code-ops")` and
    `gloss_index("lessons/testing")` — headline-first, both shards, before
    the check is written rather than at review.
- **Served line (pinned):** the position spans **two** served lines, and each
  is quoted whole at its own pin rather than joined into one sentence — the
  governing kernel, and the admission rule that is the operative half for this
  entry's act class:
  - "… Kernel: a check suite is budgeted at its loop position; suite membership
    is opt-in per loop; admission carries a removal signal."
    (`topics/claude-code-ops.md:41@dec0d568`)
  - "Admission requires a REMOVAL SIGNAL DECLARED AT BIRTH, and retention runs
    on a catch ledger over EXERCISED runs; never-fired members are review
    candidates, never auto-deletions."
    (`topics/claude-code-ops.md:43@dec0d568`)

  The same line carries the live context an implementer of a new check needs —
  "NO CURRENT MEMBER CARRIES ONE, which is the whole reason the family has no
  shrink lever"
  (`topics/claude-code-ops.md:43@dec0d568`) —
  which is why the survey is prescribed before the check is written rather than
  at review. The earlier note that product-lab#150 protects
  the build-vs-adopt clause (the trigger counts check-runner consumers,
  population one) is retained as a pointer only; it is not a pinned quote and
  nothing in this entry rests on it.
- **Origin miss:** writing-assistant's suite reached 170+ members with no
  admission economics; the rebuild exists partly to prevent the recurrence
  (owner ruling 2026-08-04).
- **Postmortem:**
  - *violating artifact:* writing-assistant's check suite — 170+ members, no
    admission record and no removal signal on any member.
  - *triggering terms:* check, suite, registry.
  - *the question, verbatim:* **none recorded — this miss predates the map.**
    It was found by the owner's own measurement of suite growth rather than
    by a consultation that failed, so no query exists to record and none is
    invented here.

### 2. Reading substrate state — any Kogaki read of gateway internals rather than served renderings

- **Trigger terms:** access log, access.jsonl, state dir, gateway internals,
  log-verified, receipt count, consult evidence
- **Read prescription:**
  - *act class:* writing an acceptance criterion, check, or report that
    claims evidence about a consultation.
  - *survey before acting:* `gloss_index("lessons/knowledge-architecture")`
    and `gloss_index("lessons/architecture")` — headline-first, before the
    criterion is written, because the defect this entry catches is a
    criterion that is **unimplementable** rather than one that is wrong, and
    that is invisible at review of the criterion's own wording.
- **Served line (pinned):** "served mode = server-side access log is the
  canonical record (caller, realm, files, pin), consumer `consulted:` lines
  remain as their own receipts; logging lives with whichever component
  mediates access" — `topics/archive/knowledge-architecture.md:271@dec0d568`.
- **Origin miss:** kogaki#7 was classified story-sized on 2026-08-05 without
  consulting this boundary; its acceptance criterion ("verified against the
  gateway access log") would have produced an unimplementable story — the log
  is machine-local, so no CI check can read it, and the read itself sits
  outside the served surface. Consultation at the prior triage would have
  caught both; the next sitting's consult did.
- **Postmortem:**
  - *violating artifact:* kogaki#7's story-lane classification of 2026-08-05,
    and its acceptance criterion "verified against the gateway access log".
  - *triggering terms:* access log, consult evidence.
  - *the question, verbatim:* **reconstructed at this filing, not run** —
    kogaki#7's thread records no consult query, because the recovering
    sitting's receipts predate the convention that a receipt carries the
    query it asked. The question below is what would have found the served
    line, composed here rather than replayed from a record: "Is the gateway
    access log a surface Kogaki may read, or is consult evidence sided
    between the server's log and the consumer's receipts?"

### 3. Record disposition — adopting one record as the live word on what a decision decided

- **Trigger terms:** contradiction, record disagreement, which record wins,
  spec vs staging, adopted vs proposes, superseded, unswept, declination,
  declined, adopted, still stands, reopen condition
- **Read prescription:**
  - *act class:* adopting any record as the **live word on a decision's
    disposition** — what it adopted, declined, held, or superseded — before
    that reading is written into a spec, a review reply, or a gate. The class
    engages **whether or not a second record has been seen.** An occasion
    scoped to a *visible* contradiction fires only after someone has already
    found both sides, which is after the cost has been paid; the case this
    entry is for is the one where the disagreement is latent because the
    other record has not been swept.
  - *survey before acting:* `gloss_index("lessons/knowledge-architecture")`
    — headline-first, before the reading is written down — **and the carrier
    itself read WHOLE** (`gh issue view <n> --comments`, untruncated), because
    a rule that names a source is satisfied by a partial view of it: "When you
    write a rule that names a source, also name what a complete read of that
    source includes — otherwise every partial view counts as compliance"
    (`gloss/lessons/knowledge-architecture.md:47@dec0d568`,
    `a-partial-projection-can-satisfy-a-total-read-rule`).
  - *what does NOT discharge it:* `policy/kit/bin/issue-pins.mjs --recheck`.
    Since kogaki#188 it compares **content**, not only SHAs: a stored
    `pin-quote:` hash is checked against the text re-fetched at the cited
    line, a moved quote is refused with the delta naming the corrected line
    number, and every exit states what it verified and what it did not
    (`content: liveness ESTABLISHED for N of M cited line(s)` beside
    `content: NOT VERIFIED — … commit SHAs were compared, which is not line
    liveness`). **The rule is unchanged and the tool is now stronger; what
    the tool establishes is still the wrong half.** A verified quote hash
    proves the cited line **still says what it said** — its *existence* — and
    says nothing about whether what it says is **still the live ruling** —
    its *standing*. Pin currency is a fact about the commit, content currency
    a fact about the line, and disposition a fact about neither: a line can be
    byte-identical at a current pin and superseded by a verdict recorded
    somewhere the tool never reads.
    Re-cut 2026-08-07 (kogaki#207) because the prior evidence sentence — "It
    compares SHAs, so an unmoved hub HEAD exits 0 `pins current`" — had become
    false of the shipped tool while the clause it supported stayed true, and a
    reader checking it against `--recheck` would find it false and could
    reasonably read the whole clause as lapsed. The **trigger terms and the
    act class above are untouched**; this is a re-cut, never a repeal.
- **Served line (pinned):** the disposition read has two halves and neither is
  settled by recency alone — "Say which system decides which half. Being
  written more recently says when someone wrote, not what they could see"
  (`gloss/lessons/knowledge-architecture.md:209@dec0d568`,
  `declare-precedence-per-axis-not-per-artifact`) — and within the standing
  half a disagreement is surfaced rather than absorbed: "read the decision
  record for verdicts dated after that evidence, and when they conflict the
  later verdict wins and the conflict is reported rather than quietly
  reconciled" (`gloss/lessons/knowledge-architecture.md:269@dec0d568`,
  `merged-code-evidences-existence-never-standing`).
- **Origin miss:** `specs/spec-draft-pipeline/SPEC.md` v1 (PR #157, `b3722cb`)
  shipped with the Move library held, because the spec lane read
  `topics/articles.md`, whose newest line on the question was a **2026-08-04
  declination**, and adopted it as the live word on kogaki#127's disposition —
  while the owner's **2026-08-06 adoption** existed only in an unswept hub
  staging file. Four receipts were emitted, every one well-formed, every one
  serving a superseded line as the live word; the branch's pin recheck exited
  0. The same disagreement surfaced hub-side the next day, as a direct
  spec-vs-staging contradiction about the same act, and was resolved silently
  there too (kogaki#171). **Sited here** because the consequence was exposed
  here — the wrong standing claim fed this repo's Brief decision chain and the
  contradiction's spec side is this repo's artifact; the hub-side carrier is
  product-lab#160's Recall-rule amendment, cross-referenced so neither filing
  assumes the other.
- **Postmortem:**
  - *violating artifact:* `specs/spec-draft-pipeline/SPEC.md` v1 §7's hold of
    the Move library, and the 2026-08-07 review reply "Move library held —
    settled design" that rested on it, both produced by adopting one record's
    newest line as the disposition without reading for a later one.
  - *triggering terms:* declination, declined, reopen condition — **measured
    rather than assumed.** Over the twelve most recently merged PRs at
    `1453248`, the declared list matches #157 (the violating PR), #156 and
    #144, and nothing else. The terms this entry was filed with — contradiction,
    spec vs staging, adopted vs proposes, unswept, superseded, record
    disagreement — match the miss **nowhere**, in the diff paths, the changed
    text or the linked issue body, because a latent disagreement is never
    described as a contradiction by the act that commits it. They stay declared
    beside the disposition vocabulary rather than instead of it: they are the
    terms of the *found* case, which this entry also covers.
  - *the question, verbatim:* **reconstructed at this filing, not run** — no
    query was issued at either moment of resolution. Composed here, and then
    issued against the served surface at this filing, where it discriminated:
    "Two records disagree about what a decision adopted — a spec says one
    thing, an unswept staging file says another. May the disagreement be
    resolved silently by ratification status, or must the conflict be surfaced
    as a finding before either side is adopted?"
