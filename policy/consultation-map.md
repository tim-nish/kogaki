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

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=d11ac0f8ef5ef4c53d299c61b49ef032d7b91ca540da1d4bb6a2eed372e8f18f

The same distinction is restated on the served surface at its own pin, in the
seeding batch's line, with the reason it is restated there — an excerpt from a
longer line, marked, never spliced with another:

> "… MISS-ONLY GROWTH BINDS ADMISSION, NEVER PROPOSAL, so the batch may propose
> freely from existing decision content while each member still needs its own
> `[x]`."

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=611e34a01b125d450c96d15d21201e22cbf1094aff399830c4f4b9f370d7cd48

**What this permits.** A **proposal** — a candidate entry offered to the
admission act — may be produced by any means, including a machine, and needs no
miss of its own to be *offered*. Two mechanized proposers are named on the
served line and are therefore legitimate here:

1. **Miss harvesting** — a recorded consult outcome token of
   `covered-after-reframing` or `uncovered-after-N-framings` proposes an entry
   for the occasion that produced it.
2. **Receipt-absence mining** — the review record's boundary-vs-receipt line
   class proposes the missing occasion where a boundary was touched with no
   receipt. (The artifact that defined that class here,
   `.claude/skills/review-lane/SKILL.md` §2, was retired by kogaki#630; the
   definition travels with the method port, claude-toolkit#479, and is
   unverified from this tree — kogaki#632, PR #637 round 1.)

**What this does not permit, and why the line is exactly here.** Neither
proposer writes this file. Admission stays a human act, still requires the
miss, and still records the postmortem — and the ground is this map's founding
Invariant 2, an excerpt quoted at its own pin:

> "… Invariant 2: the map triggers CONSULTATION and never encodes verdicts,
> because an entry that starts answering is a second authority growing in the
> dark, sited next to the code where it carries more apparent weight than the
> surface it copied."

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=a78864feb4f135335ae0a86595000b363446318c724ff760aa9c75b8d75de9ed

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
- **Receipt-absence mining** (story 1.41) lives in **`tools/`**. Its input is
  the review record's boundary-vs-receipt line class.
  **BOTH GROUNDS THIS SITING WAS ARGUED FROM ARE GONE** (kogaki#630; PR #631
  round 1, finding 6): the neighbour it was sited beside, `tools/review-sweep.sh`,
  is retired, and the artifact whose shape "this repository owns",
  `.claude/skills/review-lane/SKILL.md`, is retired with it. The siting stands
  and its argument does not: the miner still cannot travel, because its input is
  a record produced per-repository, but this repository no longer **authors the
  shape** of the `boundary:` half it parses. That shape travels with the method
  port (ct#479) and has no verified definition anywhere at this head — stated
  here rather than left, because this is a gating policy surface and a live
  siting decision resting on two absent referents reads as settled when it is
  open.

**Recorded before code embeds it**, which is the decide-or-name rule's own
requirement and not a courtesy — an excerpt quoted at its pin:

> "… a sitting that leaves a design choice to the implementation either DECIDES
> the fork there, consulting the substrate on it, or emits a NAMED SLOT whose
> filling is itself a decision act — consult, then record choice, alternatives
> and receipt on the licensing issue BEFORE code embeds it."

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=27a5b7cbdbde7363a5b87546a5223d3981236fbde8056aa3d11c2f5908501b7e

**What discriminates it.** **One** served line does the work, and it is quoted
here under the grounds rather than under an alternative — the correction PR #256
round 2 earned by reading all three citations at the pin instead of accepting
this record's reading of them:

> "Decide whether two knowledge stores belong in one repository based on
> whether they could ever have different visibility, not on whether they cover
> similar subject matter. … When in doubt, keep them separate and connect them
> with pointers"

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/lessons/knowledge-architecture.md slug=repo-boundaries-follow-publication-boundaries kind=lesson

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

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=788e9e9081124bf8a76c890e34bb14612beff37e419d435b6db54831d1525360

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

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=75408bb48118106fa79ec964790d87feed90a194c5c92df6a01ce7bb2022ae06

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
(`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=e83da8b59f1b7a7e7d746154a7359fd1c11b71311b4ee5bc6778d03cf20d5610`),
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
`topics/knowledge-architecture.md
gloss_sha=e83da8b59f1b7a7e7d746154a7359fd1c11b71311b4ee5bc6778d03cf20d5610
@dec0d568` above). This is **the same served
line the grounds above turn on** —
`gloss/lessons/knowledge-architecture.md
slug=repo-boundaries-follow-publication-boundaries kind=lesson @dec0d568`,
membership by visibility
and never by subject-matter kinship — pointed at rather than re-quoted here, per
`pointer-not-copy-for-readable-assets`: a rule that discriminates a fork also
declines the arm it discriminates against, and quoting it twice would make this
section carry its own conformance copy. The Layer-2 boundary is
untouched by this fill and is restated rather than assumed to have survived it,
per the served surface's own handling of the last home change
(`topics/knowledge-architecture.md
gloss_sha=629a5aa277cf4af1d7de4cdee5834932469641f1a7047d65b43d90dd2afafcf4
@dec0d568`): packaging for the owner's own
repositories is internal work and proceeds; the kit as a product for unknown
third parties stays a held candidate, and siting one file in `policy/kit/bin/`
is not a step toward it.

**The counter-line, met rather than skipped.** `encode-the-boundary-that-is-real`
warns against baking a distinction whose axis has only one live value
(`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/lessons/knowledge-architecture.md slug=encode-the-boundary-that-is-real kind=lesson`).
It does not bite here, and the reason is the test the lesson itself gives:
portability has **two live values in today's content** — one proposer reads the
hub's grammar, the other reads a local record — so the boundary already has two
real sides rather than an anticipated second one.

**The naming sitting's premise is CORRECTED here, not carried forward.**
kogaki#222 named this slot with "no served line discriminates it". Re-read at
the current pin — the issue pinned `product-lab@98195e0a`, the served surface
answers at `@dec0d568` — that premise is **false**:
`gloss/lessons/knowledge-architecture.md slug=repo-boundaries-follow-publication-boundaries
kind=lesson` discriminates it directly, on its own terms and without extension. The correction is reported rather than quietly
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
fills all sit in a *spec* file (`specs/SPEC.md::query: Should a schema obligation requiring an admission record to contain re-executable efficacy evidence be enforced as a mechanical gate at the tool boundary, or stated as an obligation with visible absence? Is a required record FIELD a prohibition or an obligation for enforcement-layer purposes?`, `:976`, `:1449`,
`specs/spec-terrain/SPEC.md::> "A claim composed over a member set is PINNED to that set: a subset`), and this is the first sited outside one. The
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

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/INDEX.md:12-17

This receipt is DECLARED FROZEN provenance (owner ruling 2026-08-22,
kogaki#603): it records a historical consult at its pin and is only ever read
at that revision. `gloss/INDEX.md` is neither a lesson/journey record nor a
topic decision line, so neither identity class applies; the frozen form is the
ruling, not a leftover.

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

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md gloss_sha=a78864feb4f135335ae0a86595000b363446318c724ff760aa9c75b8d75de9ed

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
**They could not, and the reason was established by running the tool over this
file rather than by reading it:** `--emit-pin-quotes` hashed **9 of this file's
24 cites**. `parseCites` recognises a `consulted:` line only when it is
unindented and unwrapped, and this file wrapped every one of them in inline
backticks as prose formatting, so fifteen cites — including the
`topics/knowledge-architecture.md:44` instance above, the very worst of the six
— were invisible to the parser.

**THE PARSE HALF IS REPAIRED (kogaki#274, owner selection 2026-08-12): ARM 2,
unwrap this file's lines, leaving the shared grammar untouched.** Arm 1 —
widening `parseCites` so a backticked `consulted:` line parses as an emission —
was **declined**, because it changes what counts as an emission for every issue
body the kit parses and risks re-opening what kogaki#209 closed: a body that
merely *mentions* a receipt in inline code being read as emitting one. Measured
here, gateway-independently: **ten** standalone `consulted:` lines unwrapped,
and the tool's parse denominator moves **10 → 16**.

**Five backticked `consulted:` occurrences PRE-DATING this edit are LEFT
WRAPPED ON PURPOSE, and that is the same use-vs-mention judgment rather than an
incomplete sweep.** Two are mid-sentence parentheticals and three are prose
*about* `consulted:` lines — none is a standalone emission, and unwrapping a
mention into one is precisely the confusion arm 1 was declined for.

**The count is stated as OF THE PRE-EDIT FILE, because this edit's own
paragraphs add more of exactly the same kind.** Grepping the file as it now
stands returns MORE than five, and the surplus is every prose mention added by
this section and by anything written after it. A reader checking the claim the
only way it can be checked would otherwise find a larger number and conclude the
figure was wrong — so the POPULATION is named rather than a bare count.

**No number is given for the post-edit file, deliberately.** The first draft of
this paragraph named one, and it was falsified by the very paragraph that named
it — a count over a set that this text is itself a member of goes stale as the
text grows. The five are the five that pre-dated the edit; anything above that
is prose about `consulted:` lines, which is what this whole passage is.

**Two denominators appear in this section and they COUNT DIFFERENT THINGS,
which is stated rather than left to arithmetic.** 24 is kogaki#266's hand count
of served cites in the file; 16 is `parseCites`' own de-duplicated key set
across BOTH cite shapes. The two sets are neither nested nor disjoint, so
16 + 5 does not reconcile to 24 and was never meant to. Saying so is the whole
point of the acceptance criterion this paragraph exists to satisfy: a coverage
claim states its denominator, and two denominators side by side owe the reader
the sentence that tells them apart.

**Why 10 unwrapped lines move the parse count by 6 rather than 10.**
`parseCites` de-duplicates on `file:spec`, and four of the ten keys were already
in the set through the other cite shape. The figure is therefore self-checking
rather than inviting the 10 + 10 a reader would otherwise attempt.

**What is still NOT measured, stated rather than left as a silence.** Whether
those 16 now *hash* is a question about the served surface, and it was not
answered in the sitting that made this edit: that shell had no gateway
configured (`TSUREZURE_GATEWAY_JS` unset, no `--gateway` passed), so
`--emit-pin-quotes` degraded with every content trial reporting a miss. The
coverage figure therefore stands where kogaki#266 left it until a
gateway-capable run re-measures it. Of the nine cites that 9-of-24 run did see, one more was declined
(`topics/archive/…` has no `servedAddress` form, though `policy_lookup` serves
it), and this file's one range cite routes to `cannot-tell` by contract.

Landing a checker over that 9-of-24 subset would fail **this file's own entry 3
prescription**, quoted there at its pin: *"When you write a rule that names a
source, also name what a complete read of that source includes — otherwise
every partial view counts as compliance"*
(`gloss/lessons/knowledge-architecture.md
slug=a-partial-projection-can-satisfy-a-total-read-rule kind=lesson
@dec0d568`). A green check covering
nine cites, over a file whose rule is that *every* cite is checked, is that
lesson exactly — and it would be quieter than today's silence, because today at
least nothing claims coverage. So the partial mechanism is **declined on the
ground rather than deferred for capacity.**

**What the mechanism cost, and the fork that is now DECIDED.** Widening
`parseCites` to see a backticked `consulted:` line would widen what counts as an
**emission** for every issue body the kit parses, which is the use-vs-mention
boundary kogaki#41 drew and kogaki#209 hardened. That was a fork, and per
DECIDE-OR-NAME —
*"a sitting that leaves a design choice to the implementation either DECIDES the
fork there, consulting the substrate on it, or emits a NAMED SLOT whose filling
is itself a decision act"* (`topics/knowledge-architecture.md
gloss_sha=27a5b7cbdbde7363a5b87546a5223d3981236fbde8056aa3d11c2f5908501b7e
@dec0d568`) —
it was emitted as a named carrier rather than improvised. **It was filled on
2026-08-12 by owner selection (kogaki#274): arm 2 above, with arm 1 declined on
the blast-radius ground.** What remains of the mechanism — the registered check
of acceptance item 4 — therefore needs no parser decision; it has one.

- `carried: #274` — the mechanization: where this file's `pin-quote:` block
  lives, and the registered check that reads it. **The parser fork is no longer
  part of this: it was decided 2026-08-12 (arm 2).** **Kogaki's
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

### Served-unit cites address by STABLE IDENTITY — the revision is a pin, never the address (kogaki#603)

The drift measured above was the line number's fault, and the remedy is the
form, not a mechanism: a **live-read** cite of a served unit — one whose target
is read against current content — addresses the unit by an identity the hub
itself joins on, with the `@<sha>` retained beside it as **provenance only**,
never the resolution target. Two identity classes, one per unit kind:

- a **lesson or journey record** is addressed
  `<shard file> slug=<slug> kind=<lesson|journey>` — the (slug, kind) pair its
  own served record carries;
- a **topic decision line** is addressed
  `<topic file> gloss_sha=<sha256 of the raw served line, leading "- "
  included>` — the hub's own Gloss-companion join key, per the served ruling
  quoted whole at its pin:

> "The Gloss companion's join key is `gloss_sha:`, not the citation; the
> citation is PROVENANCE."

consulted: product-lab@c2f4650f6a3f4fa39c562c2538ddbd01c68dd7b0 topics/knowledge-architecture.md gloss_sha=62069ae3bfeee426e3fc0ca7eb28da70d0f35c60cc3325d91b6514aebd7dc01b

A `file:line@sha` reference **FROZEN at its pin** — a historical record, only
ever re-read at that revision — is legitimate provenance and stays in its
frozen form (owner ruling, kogaki#603); this file's own drift-repair history
above keeps its frozen references untouched. **No reconciliation, re-pinning,
relocation, or drift-compensation mechanism may be introduced** (same ruling):
the identity survives relocation by construction, and a cite whose identity
stops resolving is a finding to surface, never something a pass re-points.

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

consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md gloss_sha=41319193fff69e1680c3f1d01a10cb3547cb673d3f919368d0f2d23c3737170a

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
    (`topics/claude-code-ops.md
    gloss_sha=ba7be2fee6c08c139752452e2bd62aa8b77f2be943535a6452f26b6a0016453c
    @dec0d568`)
  - "Admission requires a REMOVAL SIGNAL DECLARED AT BIRTH, and retention runs
    on a catch ledger over EXERCISED runs; never-fired members are review
    candidates, never auto-deletions."
    (`topics/claude-code-ops.md
    gloss_sha=041d61fccb5fc898d5dcd9b0da8a4d439b8625cc68dc07b495079e390a50b8ff
    @dec0d568`)

  The same line carries the live context an implementer of a new check needs —
  "NO CURRENT MEMBER CARRIES ONE, which is the whole reason the family has no
  shrink lever"
  (`topics/claude-code-ops.md
  gloss_sha=041d61fccb5fc898d5dcd9b0da8a4d439b8625cc68dc07b495079e390a50b8ff
  @dec0d568`) —
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
  mediates access" — `topics/archive/knowledge-architecture.md
  gloss_sha=25b0c82901febe60f9ba42b6a90dd2b82fbc54222296f93265ffb9234217dc07
  @dec0d568`.
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
    (`gloss/lessons/knowledge-architecture.md
    slug=a-partial-projection-can-satisfy-a-total-read-rule kind=lesson
    @dec0d568`).
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
  (`gloss/lessons/knowledge-architecture.md
  slug=declare-precedence-per-axis-not-per-artifact kind=lesson @dec0d568`) — and within the standing
  half a disagreement is surfaced rather than absorbed: "read the decision
  record for verdicts dated after that evidence, and when they conflict the
  later verdict wins and the conflict is reported rather than quietly
  reconciled" (`gloss/lessons/knowledge-architecture.md
  slug=merged-code-evidences-existence-never-standing kind=lesson @dec0d568`,
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

### 4. Spent-bound exit — composing options or a recommendation at a gate whose subject is exiting a PR at a spent review bound

- **Trigger terms:** spent bound, two-round bound, third round, round 3,
  terminal, supersede, supersession, park, moved head, post-bound,
  merge on your judgment
- **Read prescription:**
  - *act class:* composing the options or the recommendation at a gate whose
    subject is how a pull request LEAVES a spent review bound — merge, a
    further round, park, or supersession.
  - *survey before acting:* the `claude-code-ops` decision lines on the
    terminal bound and the successor lane, and `specs/SPEC.md` §4's
    successor-obligation clause — headline-first, **before the options are
    composed**, because an option is hard to withdraw once it is on the screen
    beside its peers.
- **Served line (pinned):** quoted whole at its pin rather than paraphrased —

  > "… **OWNER RULE, standing: a PR blocked at the two-round bound is TERMINAL,
  > and the work continues by SUPERSESSION rather than by reviving the review
  > state.** The bound binds a *submission* — one PR, one review record — so
  > there is no third round, no further development on the blocked PR, and no
  > counter reset; the abnormality terminates in an issue and a corrective
  > change, and the successor is a NEW submission receiving the standard two
  > rounds by construction. The successor owes three declared things:
  > `supersedes: <blocked PR>`, a disposition of the blocked PR's open findings
  > in the `carried:`/`declined:` grammar, and a base postdating the corrective
  > merge — with the blocked PR closing as *superseded by N* only once the
  > successor exists. …"
  > (`topics/claude-code-ops.md
  > gloss_sha=6ab980220abed9cb496a4436de02f20e133b400d2a867280283dd92ef169e900
  > @8906f20`)

  **The excerpt is marked at both ends and carries the successor obligations
  deliberately.** The first cut of this quote stopped at *"no counter reset"*,
  which leaves a reader the PROHIBITION and not the three things the successor
  owes — and those three are exactly what this entry's read prescription points
  at. An excerpt takes part of one line and marks the part it left; the leading
  and trailing `…` are that mark, per this file's own convention. What is still
  cut is the refused narrow exception and its three grounds, which bear on
  whether the rule admits a carve-out rather than on what to do at the gate.

- **Origin miss — TWO occurrences at the same act, which is what admitted it:**
  - **PR #332's gate (2026-08-09)** offered *"Grant a third round"* and
    recommended *"Merge on your judgment"*. Five consult receipts, all querying
    the change's SUBJECT; none querying the act being performed.
  - **PR #399's gate (2026-08-13)** offered *"Authorize round 3"* framed as
    *"the bound is an owner decision, not a hard cap"* — contradicting the same
    served line — and declared `outcome: uncovered-after-1-framings` while the
    line sat served and unchanged at the pin above.
- **Postmortem:**
  - *violating artifact:* the two gate screens above.
  - *triggering terms:* third round, spent bound, merge on your judgment.
  - *the question, verbatim:* **reconstructed at this filing, not run** — no
    query was issued at either gate; both sittings queried the change's subject
    instead. Composed here, and then **issued against the served surface at this
    filing, where it discriminated**, returning the pinned line above as its
    first hit:
    "A PR is at its two-round bound with findings outstanding — what does the
    standing owner rule say about a third round, merging, or parking, versus
    supersession?"
    (`request_id caa74a28-b161-40d1-9767-1a96d9fd369a`, outcome
    `discriminating`) — so the field records a question known to reach the line,
    rather than one asserted to.
  - *the query defect, named:* **subject-shaped retrieval at an act-shaped
    fork**, the same defect both times. Under the standing two-cause
    discriminator this is a query defect and not a distill gap — the surface
    held the answer and the query did not approach it.

**THIS ENTRY DOES NOT FIRE MECHANICALLY, and saying so is part of admitting
it** (owner selection 2026-08-15). `checks/check-boundary-receipts.sh` matches
over **diff paths and changed text**; composing a gate produces neither, so no
act in this repository observes the occasion this entry names. Its trigger
terms are read by a sitting following the consult-first pass, exactly as the
conduct axis's structural trigger is — the entry is a **finding aid**, not a
gate. Admitting it changes what a sitting is pointed at and changes nothing a
check can refuse.

**Why it is admitted anyway, rather than folded into the conduct axis.** The
axis was ratified 2026-08-11 and the #399 miss is dated 2026-08-13: the
structural trigger was **in force and did not reach the act**, so folding this
in would adopt a shape already measured as insufficient on this very specimen.
And the map's own founding line makes the accretion safe here where an
enumerated denial would not be —

> "Its accretion polarity is what makes it safe where an enumerated denial list
> is not: **each entry routes to a judgment rather than encoding one**, so a
> member that turns out not to apply costs a consultation rather than a false
> verdict."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md gloss_sha=a78864feb4f135335ae0a86595000b363446318c724ff760aa9c75b8d75de9ed`

**Two further occurrences, recorded because they are the honest denominator.**
The 2026-08-15 `/ship-cycle` sitting reached this act twice more — PR #452 and
PR #455, both at a spent bound with findings open — and both times the findings
were carried to a successor carrier rather than pushed to the branch, which is
what the served rule requires. **Nothing fired.** The sitting had read the rule
in its own context minutes earlier, which is precisely the guarantee that does
not reproduce. Four occurrences in six days, two wrong and two right for a
reason no carrier holds, is the measurement this entry is admitted against —
**a denominator the paragraph below re-scopes rather than extends** (kogaki#459,
PR #467 round 1, finding 2); read the two together and this sentence's count
alone is superseded.

**FOUR occurrences of the act class, out of six spent-bound exits — the two
added on 2026-08-15 NARROW the population rather than joining it.** The
`/ship-cycle` sittings on kogaki#464 and kogaki#461 each reached a spent bound —
PR #465 round 2 and PR #466 round 2 — and **composed no gate at either**. The
correct disposition there needs no owner question: the non-gating findings took
`carried: register`, the register was appended before the merge, and the run
merged. So this entry's act class is not *every* spent-bound exit but the subset
where **a gate is composed at all**, and by that definition #465 and #466 are
**not members**: they are evidence that the class is narrower than the exits
that reach it.

**The arithmetic, stated so it cannot be read two ways.** Six spent-bound exits;
**four** compose a gate and are the act class (#332 and #399 wrong, #452 and
#455 right for a reason no carrier holds); two compose none. The standing
denominator this entry is admitted against is therefore **four**, and the two
non-members are what make the chosen carrier cheap rather than what make it
urgent. The first draft of this paragraph counted all six as occurrences of a
class it had just defined as excluding two of them — corrected at PR #467
round 1, finding 2, and recorded rather than silently repaired because the
denominator is the evidence arm (c) would have rested on.

**THE COMPOSITION HALF NOW HAS A NAMED CARRIER — FILED AND UNBUILT — and it is
not in this repository**
(kogaki#459, owner selection 2026-08-15, filling that issue's named deferred
slot). kogaki#402's remedy declared two halves; the `detects:` half is this
entry, and the `constrains:` half — *"a gate composed for a spent-bound exit
cannot be composed without evidence of the act-shaped read"* — is carried as a
**form-level requirement at the one act that fires during composition**:

> For an `AskUserQuestion` payload matching this entry's trigger terms, the
> gate declaration must carry a **`receipt:` line**; the `outcome:`-only
> discharge is refused.

**Narrowed on purpose, and the narrowing is the ruling.** The issue proposed
requiring a receipt *"whose pin resolves to the act-shaped read"*. That is not
enforceable at that boundary and asking for it would have amended the hook's
stated contract rather than fitting inside it —
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md slug=a-gate-enforces-only-what-its-arguments-name kind=lesson`,
*"a gate can enforce a routing rule exactly when every carrier the rule
references is derivable from the gate's own arguments; a rule naming a carrier
whose existence is a property of the target environment cannot be enforced
there and can only be guidance."* Resolving a pin is the environment. Which
declaration kind was used, and whether a `receipt:` line is present, are the
payload. So **form-never-content is preserved, not amended**: the pin is still
never resolved and grounds are still never assessed.

**It targets the observed hole exactly.** PR #399 declared
`outcome: uncovered-after-1-framings` while the served line sat unchanged at its
pin — the `outcome:`-only discharge is what let a gate contradicting the rule
render as conformant. And it costs nothing on the correct path, which the four
right occurrences demonstrate: two composed no gate, and a gate that carries a
receipt passes unchanged.

**The carrier is `tim-nish/claude-toolkit`'s `lint-gate-declaration.py`**, not
kogaki's — this entry records the rule and names the carrier, and **never
asserts its state**, per this file's own convention. Escalated at the selection.

**PRECEDENCE ON MISMATCH, declared rather than left to a reader** (PR #467
round 1, finding 3). The rule above and the hook's implemented shape are two
copies of one normative claim, and a copy that does not say which side wins is
the defect —
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md slug=conformance-copy-needs-declared-precedence kind=lesson`,
`conformance-copy-needs-declared-precedence`. **This entry is the ruling; the
hook conforms to it.** A hook that lands narrower or wider than the quoted rule
is a defect in the hook, reported against claude-toolkit#389 and not a
re-reading of this text. Nothing here observes that conformance — this is a
precedence declaration, not a mismatch check, and no act in this repository
compares the two.

**A FOURTH CARRIER EXISTS AND THIS ENTRY'S ADMISSION TEXT OMITTED IT** — stated
because the omission shaped kogaki#459's own premise. `tools/review-sweep.sh`'s
`decide()` carries a **`supersede`** state (*"the same open blocking findings
with the bound SPENT"*, kogaki#338), which announces the supersession and names
what the successor owes, and a `post-bound-head-move` state beside it which
prints *"no owner decision is owed and no third round exists."* Both fire **at**
the spent bound, before a gate would be composed. That does not make the
composition half unnecessary — the sweep informs a composer and binds nobody,
which is the obligation shape that already failed twice — but *"no act observes
this occasion"* was too wide as written, and the sentence above is scoped to
what it is true of: no act observes a gate's **options**.

## The conduct axis — a facet of every entry, not a fourth entry (kogaki#336)

**Owner selection 2026-08-11, alternative A, all three pieces.** The entries
above are *act-scoped*: each names a class of act and the survey owed before
performing it. That scoping answers **what the act is about** — its subject —
and answers nothing about **how the act is conducted**, which is a second and
independent question. The #332 specimen is the shape: a consult that read the
served surface for the subject, found it, and never asked whether the *manner*
of the act was itself governed — so the gate presented with no visible
mismatch, because nothing had asked the question that would have produced one.

**The boundary is bound at a STRUCTURAL TRIGGER, deliberately not at an
enumeration of acts.** The trigger is:

> **composing a gate for the human.**

Every act that reaches that point owes the conduct facet, whatever entry its
subject falls under and whether or not any entry above names it. An
enumeration of conduct-bearing acts was declined for the reason this file
already gives against enumerations elsewhere: act N+1 is uncovered by default,
and the acts that most need the facet are the ones nobody thought to list.

**The obligation: a grounding block owes ONE QUERY PER AXIS.** A gate composed
with a single query has grounded its subject and left its conduct ungrounded,
and the two are not substitutable. Where the axes are recorded on the receipt,
each query carries its own `axis:` continuation line, binding upward — the
grammar is `specs/SPEC.md` §4 "Consult evidence is sided", and its per-query
binding is what makes this obligation **expressible** in a record at all.

**Expressible is not yet instrumented, and the difference is stated here rather
than left to a reader to discover** (PR #342 review round 1, should). An
earlier form of this paragraph said the binding exists "so this obligation is
checkable rather than aspirational". It is not checkable today: **no emitter
writes an `axis:` line** — neither `policy/kit/bin/consult.mjs` nor
`policy/kit/bin/gateway-query.mjs` produces one — so the key is **hand-written**
and the per-axis obligation is carried by this prescription, not by an
instrument. `checks/check-consult-receipts.sh` reads and reports axes where an
author wrote them; nothing requires that an author did. The claim was written
into the durable carrier while the acknowledgement lived only in a PR body,
which is the split that makes an aspirational rule read as an enforced one.

**deferred slot: the emitter.** Kit-side emission of `axis:` needs the
transport to carry a per-framing axis, and that is its own act.

**What this does NOT do.** It adds no entry, changes no entry's read
prescription, and denies nothing. The facet is a second question asked at an
existing trigger, so an act already consulting an entry above consults it once
more along the other axis rather than twice from the start. And the **value
set** naming the axes is the hub's to ratify, not this file's — the same
boundary-field rule the grammar cites, and the reason nothing here enumerates
the axes it requires one query for.

**deferred slot: the `subject | conduct` value set**, and with it whether the
axes are exactly two. Named, never filled here.
