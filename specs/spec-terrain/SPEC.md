# SPEC-terrain — the survey/selection surface

**Status:** v21, amended 2026-08-16 (kogaki#474) — **§14.4.1's ruling is
PROMOTED, not weakened.** The general rule it carried — an owner-facing screen
is delivered as an artifact the runtime writes, never a display channel, never
model-retyped — now lives once, cross-surface, at `specs/SPEC.md` §2.5.3, and
§14.4.1 cites it. **Nothing Terrain's own is changed**: the artifact name
`reports/Screen.md`, the two-member screen class, the four uncarried items and
the non-normative-mechanism ruling all stand exactly as v18 took them. The
ground is that a second surface (move ingestion) reproduced this clause's defect
three days after it shipped, which per `product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0
topics/claude-code-ops.md:38` is the tell that a rule's carrier sits at the
wrong layer rather than that the rule was wrong.
**deferred slots minted by this amendment: none.**

**The v20 token is carried by §13.1–§13.4 (kogaki#472) and has NO Status entry
here** — observed while writing this one, and recorded rather than repaired,
because repairing another amendment's register is not kogaki#474's licence. A
reader meeting `(v20)` in §13.2 and no v20 entry above should read the
kogaki#472 decision record, not infer that the counter skipped.

v19, amended 2026-08-15 (kogaki#462, owner selection) — **v18's
ruling is propagated to the clauses it silently invalidated.** §14.4.1 replaced
the object of the flow's first act and named the wrong clause as its source,
asserting an ordering was unchanged when that ordering belonged to **§2.4's
positive limb** and had just had its object replaced. **§2.4's positive limb
and §6.3 act 1 are amended by name**: the first act is naming the artifact, no
longer relaying the rendering in full in the reply. §12.2 (v12) gains a
**forward pointer** to §14.4.1's scoping of its owner-rendering count, written
at the site a reader arrives at rather than only at the clause that knew.

**No ruling is reopened and no new one is made** — v18's decision stands
exactly as taken, and this amendment only makes the clauses it changed say so.
**Historical Status blocks are NOT edited**, per this file's convention: a
superseded entry is kept as the record of what it decided, and the
supersession is recorded here. kogaki#462's acceptance item 3 named a Status
block as an edit site and is **corrected** rather than half-met.

**deferred slots minted by this amendment: none.**

**v18, amended 2026-08-15 (kogaki#434, owner selection)** — **§14.4.1:
delivery of an owner-facing screen binds to an ARTIFACT the runtime writes
(`reports/Screen.md`, fixed name, overwritten per render), never to a display
channel.** §14.4's one-producer removal is narrowed, not repealed: handing over
an artifact is not retyping it. The delivery mechanism — pointer,
`!`-command, file-send — is deliberately **non-normative**, because binding the
contract to a harness behaviour is the shape that produced the defect.

**deferred slots minted by this amendment: none.** The non-normative delivery
mechanism is a **decision, not an unnamed deferral** — §14.4.1 states why no
mechanism may be fixed, so there is no slot for a later sitting to fill. §12.2
(v12)'s owner-rendering count is **amended by name** below, not left to be read
as compatible.

**v17, amended 2026-08-12 (kogaki#385, owner selection)** — **§13.4
gains a fourth rendering obligation: the neighborhood screen GROUPS BY
SUBSTRATE INSTANCE and never lists a flat run.** Batch-mates render under their
batch with that batch's count **within the family**; cross-linked suggestions
under `cross_links`.
Every suggestion still appears with its `N<n>` and its substrate — the grouping
renders the same complete enumeration and selects nothing from it.

**§13.3's bound is UNCHANGED, and that is the decision rather than an
omission.** Its reopen trigger fired on kogaki#367's measurement over the whole
served corpus — suggestions at a median of 27 and a maximum of 217, 38 of 126
co-tag groups over 50, `source_batch` supplying 5068 against `cross_links`' 330.
The trigger is **spent by this answer, not re-armed**: `source_batch` at one hop
is the smallest non-zero value that substrate has, so reducing inside the
declared unit can only turn off the substrate supplying 94% of what the
neighborhood finds. The bound has no setting between flooding and off, which is
a fact about the unit and not about the values.

The served line discriminating it — "the remedy is a different method applied to
the group, never a finer threshold on the original"
(`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:51`)
— is quoted whole at §13.4, with both declined alternatives and their grounds: a
per-batch traversal predicate (the refused finer threshold, and it drops whole
batches), and a surfacing threshold (declined again, now on the narrower ground
that grouping buys the same readability without introducing a rank at all).

**deferred slots minted by this amendment: none**, and none remain open in this
file.

---

**Status:** v16, amended 2026-08-12 (kogaki#300, owner selection) — **§13.3's
`deferred-slot: the bound's unit` is DISCHARGED in both halves: the unit is
traversal (substrates × depth) and its values are FIXED AND DECLARED —
`source_batch` one hop, `cross_links` two, shared-carrier off.** These are the
2026-08-09 fill's own numbers with their Thesis keying removed; v15 withdrew the
key, and v16 keeps the values rather than inventing new ones, because the
numbers were never the part that read a claim.

Fixed rather than keyed on the decision-lifetime ground — a declared setting is
an onboarding-lifetime fact that REMOVES a decision from the expansion loop,
where both live alternatives put one back in
(`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:138`).
Declined with grounds, at §13.3: keying on the settled set's size (admissible
in principle, but the variation is anticipated rather than measured and nobody
has run the expansion once), and the owner naming the reach per run (a per-run
choice inside every expansion, re-opening what settling the set just
answered). The 2026-08-09 fill's own two declines — a neighbour-count cap and
a surfacing threshold — are recorded there too and are not re-proposed.

**This supersedes v15's re-weighting of the slot**, which said it carried the
whole remaining bound with a unit and no values. That was true when written and
is not now; the v15 block below is kept as the record of what it decided, and
its own four-way table is a snapshot of the state v16 resolves.

**deferred slots minted by this amendment: none.** §13.3's is discharged above.

**NO DEFERRED SLOT IS OPEN IN THIS FILE.**
`deferred-slot: terrain-display-id-for-neighborhood-suggestions` (§14.6) was
**FILLED by owner selection on kogaki#300, 2026-08-12** — the neighborhood
record mints its **own `N<n>` space, declared disjoint from `L<n>`**, and
**§14.3 is not amended**. Widening §14.3 was declined by name, on the ground
that it would make the survey record hold entries for things that are not in
the survey — the premise §14.3 rests on. Assigning an `L<n>` only when a
suggestion is *taken* was declined too: the owner needs a token *while
choosing*, and choosing among several is exactly when one is needed. The answer
is implemented and merged: the space is declared at `NEIGHBOR_ID`
(`terrain/terrain.mjs:2728`), minted over the sorted output at `:2915`, and
rendered with its disjointness statement at `:3152` (kogaki#367).
The two other tokens in the file — `terrain-family-split-carrier` and
`terrain-subdivision-offering-verdict` — are filled, checked at their sites
rather than assumed.

**This line was false from 01:50:30 on 2026-08-12, seventeen minutes after it
was written — and that is recorded rather than quietly corrected** (kogaki#384,
its interval corrected kogaki#390). Whether any read fell inside those
seventeen minutes is not measured and is therefore not claimed. Its bolded lead-in
read, verbatim and including its terminal colon,

> `**STILL OPEN IN THIS FILE, and it comes due in THIS issue's implementing sitting:**`

**The interval is stated because it was measured** — all three times 2026-08-12
+0900: `145d90a` wrote the line at **01:33:22**, kogaki#300's owner selection
filled the slot at **01:50:30**, and `180c014` landed the answer in
`terrain.mjs` at **10:02:01**. So the line was accurate for seventeen minutes,
and nothing was shipping in `terrain.mjs` for another eight and a half hours.
That makes it a sharper specimen of this paragraph's own thesis than a line
born wrong would be: what failed is the record moving without the file, which
is the whole subject. The text was not inert: on 2026-08-12
a run read §14.6 as the live word, composed a three-way fork from it, and
proposed the very shape the owner had declined — caught before commit by the
carrier read, and retracted. A spec section that states a settled question as
open does not merely lag; it actively re-opens the question for the next reader.

**The shape that produced it, stated at the size the evidence supports.** Both
this line and the *deferred slots minted by this amendment* declaration beside
it were introduced by the **same commit** — `145d90a`, v16 — so this is the
first revision after it and no earlier amendment carried either. What recurred
is not a count of revisions but the **juxtaposition**, and it recurred **twice
inside kogaki#366's own review rounds**: a per-amendment declaration standing
next to a **file-wide** claim, where the per-amendment half is true and does
nothing to keep the file-wide half honest. The first attempt read

> `**deferred slots: none.** §13.3 held the last one.`

— two sentences, a file-wide claim appended to a per-amendment declaration, and
false in the same way for the same reason.

**Reopen trigger, named rather than left to judgment:** a real run in which a
large settled set produces a neighborhood the owner reads as drowning, or a
small one that reaches nothing. The values are unmeasured — inherited from a
fill that never ran — and what this amendment buys is that they are declared,
reviewed once and diffable, so a correction is an amendment rather than a code
change. That measurement is a better trigger than the anticipation a keyed
table would have been built on.

**Status:** v15, amended 2026-08-11 (kogaki#303 sitting; hub ruling
2026-08-09, `q_a/2026-08-09-terrain-boundary-correction` D1–D4) — **"Thesis" is
WITHDRAWN from Terrain's vocabulary and §13's input is the SETTLED STRAND SET
ALONE.** This **supersedes** v12's and v13's naming of the Thesis as an input
and as the expansion's bound, and the conflict is surfaced rather than
reconciled: the later-dated owner ruling wins, and the two earlier Status blocks
below are kept as the record of what they decided rather than rewritten.

The ground is that **any claim-shaped input is dead input**: the neighborhood
computes over member metadata — batch-mates, `[[slug]]` cross-links, shared
carrier issues — and cannot read a claim, so a required Thesis was an input the
substrate could never consume. Specifying one anyway invites an implementation
to invent a consumer for it and quietly licenses the judged layer §13.5's
measurable-miss condition deliberately gates. A Thesis is what **Brief**
determines from candidates, so naming one here imports a downstream stage's
output into an upstream surface.

**The consequence v13 leaves behind, and the FOUR-WAY state of the slot it
lands on.** v13 resolved its fork by dividing the work — *the substrates
enumerate, the Thesis bounds the expansion* — so withdrawing the Thesis removes
the bounding half and leaves the enumerating half intact. Where that lands is
`deferred-slot: the bound's unit` (§13.3), and its state is not one thing:

| where | says |
|---|---|
| **this file, at v14 — before this amendment** | the slot is OPEN — §13.3 named it and fixed no unit. Dated deliberately: this row was written from the pre-merge file and would otherwise read as a claim about master, which it stopped being the moment v15 landed |
| **kogaki#300 and #302** | the slot is FILLED — *"the bound's unit is TRAVERSAL — substrates × depth"*, owner selection 2026-08-09 |
| **the fill's own text** | Thesis-keyed: *"The Thesis answers which provenance links are worth following, and how far — `source_batch` one hop, `cross_links` two, shared-carrier off"* |
| **where the fill lives** | branch `spec/300-bound-unit` only — **PR #304, open and PARKED at the two-round bound**, never merged |

**So a third record is superseded here and it is the least obvious one.** The
2026-08-09 fill is a ratified owner selection, and this amendment withdraws the
input it is keyed to. Reported rather than reconciled, on the same standard the
v12/v13 supersession above is reported on.

**What survives the fill and what does not, because the two halves separate
cleanly.** Its **unit** — traversal, expressed in substrates × depth and never
in the neighbours it yields — is claim-free and survives; so does its declined
alternative, the neighbour-count cap, refused on the served ground that a size
budget evicting members chosen by meaning has no usable lever. What is withdrawn
is what **sets** that unit: the Thesis answered *which substrates and how deep*,
and nothing answers it now. The fill's further claim — that it discharged
§13.2's "empty is an informative outcome" **in the strong form** — goes with it,
since that argument ran through a Thesis whose declared substrates yield no
members.

**The residual gap, stated plainly:** the correction's answer to noise is that
it is a property of **trigger timing** rather than of the substrate, which
decides *when* the expansion fires and nothing about *how far* it runs. Until
the setting half is re-answered on a claim-free ground, §13 has a trigger, a
unit, and no values for it. **(Superseded by v16, 2026-08-12: the setting half
IS re-answered on a claim-free ground — fixed declared values — and §13.3's slot
is discharged. Kept as the record of what v15 decided.)**

**A version-token collision in the record, not in this file.** That fill was
executed as "SPEC-terrain **v14**" on a branch that never merged, while the
**v14** on master is the kogaki#319+#318 §14-grammar block. The record therefore
already carries two different v14s. This file's own Status list is single-valued
and was checked — but it was checked over the file, which is why the collision
was found in review rather than here.

**deferred slots: `the bound's unit` (unchanged in name, changed in weight).**
**(v16 discharges it; this line records v15's state.)**

**Residue, named rather than swept.** This amendment corrects §13, which is the
section the ruling is about and the one kogaki#300/#302/#303 implement. It does
**not** touch §5's vocabulary line or the four "what the owner reads to think a
Thesis through" purpose clauses elsewhere in this spec (§6, §9, §12): those name
a downstream stage's output in an upstream surface too, which is the same defect
one degree milder, and re-cutting them is its own act on its own carrier. A
reader who finds "Thesis" outside §13 has found this residue and not a surviving
input.

**Status:** v14, amended 2026-08-11 (kogaki#319 + kogaki#318, coupled, owner
selection) — **§14 moves the rendered format contract out of this prose and
into a machine-readable grammar the emitters refuse to violate, and mints the
owner-surface display ID that grammar admits.** The two issues are decided as
one because #319 decides *where a format decision lands* and #318 *is* a format
decision: settling #318 alone would have landed it as the amendment-layered
prose #319 exists to retire. The defect #319 names is this file's own — the
format truth is spread across §6.1, §6.2, §9, §12, §12.1, §12.2, a struck
section and a divergence register, so every fixing session re-derives it and
drifts on a different clause. §14 therefore does **not** add a ninth prose
site: it declares a **carrier with precedence**, and the eight existing sites
are left where they are, governed rather than rewritten. The display ID is
assigned **once, in the survey record** — not minted per artifact — because it
is a join key across screen, report and Brief, and a per-surface mint is the
failure that returns nothing rather than a conflict. #318's `L1, L2, L3` named
"the Brief input unit" as though it existed; it did not exist anywhere in this
repository, so this amendment mints the space rather than adopting one.
Implementation is licensed by kogaki#319 and kogaki#318 and is not in this
amendment.

**Status:** v13, amended 2026-08-09 (kogaki#300, owner selection) — **§13.3 says
where the Thesis binds, which §13.2 required and §13.3 left silent.** The fork
was found by PR #298's round-2 review and carried on #289: §13.2 declares the
Thesis a REQUIRED input while §13.3's three substrates are each computable from
the candidate set alone, so the mechanical layer as specified returned the same
neighborhood for every Thesis and §13.2's "empty is an informative outcome" was
unreachable from anything §13.3 described. Resolved on the served ground that a
question supplies a **relevance bound, stopping condition and grade** rather
than a filter: the substrates **enumerate**, the Thesis **bounds the
expansion**. §13.2 is unchanged — it was right. §13.5 gains the boundary clause
keeping that bound distinct from the extend-or-discard judgment it holds behind
a trigger. Implementation is licensed by kogaki#300 and is not in this
amendment.

**Status:** v12, amended 2026-08-08 (kogaki#289, owner selection) — **§13 adds
the provenance-neighborhood surface: a Thesis-bounded, propose-only widening of
the candidate set across tag boundaries, disclosing the substrate that reached
each suggestion.** The defect it removes is that today's candidate set is
**co-tag-bounded**, so a contemporaneous Grain under an unrelated tag is
unreachable from the co-tag group holding its siblings. §2's three inherited
contracts are **untouched and no divergence is declared**: the second-proposer
boundary engages only when something *narrows* the candidate set, and a widening
act is never smaller than what exists, so §2.3's residual clause — "an act not
in either list is a report, not a choice" — classifies the surface rather than
being amended by it. §4 moves the surface in scope by decision; §11 gains one
open question. **The design carries a measured join correction the licensing
issue did not have** (§13.3): `source_batch` does **not** resolve to a
`kind: batch` record by equality across the whole corpus, and the failure is
silent.

**Status:** v11, amended 2026-08-08 (kogaki#234) — **the Full Report's
machine-local location is STRUCK as incorrect state and divergence-register
entry 2 with it.** Owner ruling 2026-08-08 (`specs/SPEC.md` §2.5): human-facing
files live in the repository or a designated storage path. §12.2 now splits the
report into a machine RECORD (JSON, run workspace, all of §12.1 unchanged) and
an owner RENDERING (Markdown, `reports/` in the working tree, default-on,
repo-visible and uncommitted). Both prior positions — WA's write-no-file and
Kogaki's durable-machine-local — are ruled wrong; neither survives as a
supported mode. v10, amended 2026-08-07 — **§11's composition pin carries the
SERVED MEMBER SET, and the claims artifact is the carrier** (kogaki#212, owner
selection). v9 named a **digest** while requiring a **subset** refusal that
names offending members — a mechanism that cannot deliver the property the same
sentence states. The property is load-bearing, so the digest gives way. v9 also
required the pin to *accompany* the claims without saying where it lives; the
claims artifact becomes a typed record `{composition_pin, claims}`, mirroring
§12.1's typed subdivision record. A bare map is refused by name. The v9
disposition below is otherwise unchanged.

**Status:** v9, amended 2026-08-07 — **§12.1's subdivision-input EMPTY-OUTCOME
ENCODING is DECIDED** (kogaki#199, owner selection): `--subdivisions` takes a
typed per-group record, so *judged, empty* (`{"judged": true, "subgroups": []}`)
is **stated** rather than inferred from an empty list's truthiness, and
`--judge-model`/`--judge-effort` are required for **every** `report`
invocation. The v8 disposition below is unchanged and is what the encoding
serves. The decision rests on a measurement v8 did not have: the runtime cannot
emit the conformant judged-empty artifact **at all** today — `[]` being truthy
routes it into `subgroupPlacement`'s catch-all, which returns one SubGroup
holding every member, with `members` nulled. A prohibition on minting `none` is
necessary and not sufficient. An **executable conformance fixture at the
producer/consumer boundary** is required by the amendment, not suggested by it.

**Superseded status (v8), kept whole so a reader holding it finds the
disposition rather than an absence** — v9 amends §12.1's encoding and leaves
every clause below standing:

**Status:** v8, amended 2026-08-07 — **§12/§12.1 is RECONCILED with
kogaki#168** (kogaki#189, owner selection), the reconciliation §6.2 and §8.1
received in PR #178 and §12 did not, because neither of that PR's issues
licensed §12. **A judge pin of `none` on a CO-TAG-GENERATED Full Report is
NON-CONFORMANT** — a failed run's output, never a coexisting peer — because
"required" governs the **judgment**, so every report the required path
produces has a judge. **`none` is NOT deleted:** it stays typed and admissible
in the identity triple, because deleting it would reinstate the
content-conditional arity v4.2 withdrew — an identity a request cannot
construct is not an identity — so the rule binds the *artifact* and leaves the
*key space* untouched. §12.1's **normative table row 4** and its **fourth-case
paragraph** are superseded in place, restated on the judge pin's *value*
rather than its presence, with v4.2's prior wording quoted; v4.1's withdrawal
paragraph gains a rider separating distinguishability (a property of the key)
from conformance (a property of the artifact). **Idempotence is unchanged** —
it never read the judge pin's value. **§8's no-member-count-threshold rule is
untouched**, and a group whose leaf condition fails renders no SubGroups,
carries its judge pin, and is **fully conformant**. Alternative (2) — retain
`none` for reports produced outside the co-tag path — is **DECLINED on a
finding**: no such path exists (`report` requires `--tag` and resolves to a
co-tag group), so ratifying it would create a conformance category with no
members; the bullet carries its reopen point. **No runtime change** —
`terrain/terrain.mjs` is not edited by this amendment, and the runtime half is
carried as **kogaki#199**.
v7, amended 2026-08-07 — the 2026-08-07 dogfood round's **flow**
half lands as one coupled sitting over **kogaki#161, #164, #166** and
**kogaki#162's fork half**, under one owner selection. New **§6.3** binds the
**post-tag-selection window to exactly two acts** — the served screen relayed
verbatim, and §11's eager Full Reports — with §6.2's subdivision judgment
**inside the screen act**, never beside it as a third; and **no question UI may
appear in that window**, stated as an allowlist with its non-member fallback.
**§2.4's flow rule gains its POSITIVE limb** (kogaki#164): the runtime's
rendering is relayed **in full, in the user-visible reply, as the first act
after the command returns**, and a refusal's stderr the same way — the shipped
rule bound only "never re-render", so relaying *nothing* satisfied its letter.
**Scope is deliberately REDUCED from what the rulings said**, and the reduction
is the decision rather than an omission: kogaki#161's **opening-gate** half does
**not** land, because §10's parking rests on a served refusal
(`topics/articles.md:95`) that the substrate has not spoken to since
**2026-08-05** while the ruling is dated **2026-08-07**. It is recorded in §10
as the **ground for a later unparking**, naming which reachability conjunct it
establishes and which it leaves open; **§10 stays parked and its trigger is
untouched.** **No runtime change** — `terrain/terrain.mjs` is not
edited by this amendment.
v6, amended 2026-08-07 — the 2026-08-07 dogfood round lands as one
coupled sitting over two issues. **kogaki#167** (owner selection, alternative
**(b)**): §6.1's screen form **STANDS** and §2.4's divergence register gains
the entry it was missing — **entry 4**, the per-Strand Gloss line and Journey
line dropped between v3 and v5 — so the divergence is deliberate and ratified
rather than accidental, and §6.1's v3 clause can no longer be read as
contradicting the WA baseline it quotes; **no runtime change**, and the cost
is recorded rather than argued away. **kogaki#168** (owner ruling): SubGroups
on the screen and in the Full Reports are **REQUIRED** — every run without
them is a contract violation and a FAILED run — which **discharges** §6.2's
`deferred-slot: terrain-subdivision-offering-verdict` as §8.1's owner-verdict
step delivered, **declines kogaki#163's never-default latency lever**, leaves
§8's no-member-count-threshold rule and §8.1's co-tags-default rider
untouched, and keeps the **hub-side** gate pointer named with its upstream
proposal owed. The slot's discharge is grounded in the hub's own 2026-08-05
re-point of the offering measurement **to Kogaki** (`topics/articles.md:9`,
read whole), whose condition — "fires when that ships" — is met.
§8.1 additionally records a **currency finding** in two instances: the served
hub HEAD moved and a load-bearing line moved with it (`topics/articles.md:53`
→ `:54`), and — worse — §6.1's Top-N pin `topics/articles.md:79` now
**resolves to a different decision** (the quote is at `:80`), while
`issue-pins --recheck` reported `pins current` across both. That is
kogaki#169's gap reproduced in this file; §6.1's site is corrected in place
and §11's two sites are named for whoever amends §11 next.
v5.1, amended 2026-08-07 — §7 states that a DERIVED origin member
set announces itself as derived (kogaki#145), and §9's allowlist scope clause is
tightened so it cannot be read against the allowlist it scopes (kogaki#154).
v5 amended 2026-08-07 — the 2026-08-06 dogfooding round
(kogaki#146–#150) lands as five decisions over one file: §2.4 declares the
**WA baseline** (Terrain design only, never generalized) with the divergence
register; §6.1 adopts the baseline's served form — member IDs on the group
heading, claim beneath — and **withdraws v4's per-row pin** (the pin is
stated once, in the Full Report); §6.2 adopts the SubGroup line form;
§9 gains the screen-1 tag-row **allowlist** (tag name + Lesson count, a line
class not on it does not render); §11's eager-versus-pull fork is **decided:
eager**, owner-ruled 2026-08-06 (kogaki#146), a declared divergence from the
baseline's pull, with the reopen trigger closed as spent. v4.5 amended 2026-08-06 — §12.2's normative bullet states the
key in §12.1's own form (it enumerated four members and called them a triple),
and story 1.30's two pointers are corrected. v4.4 amended 2026-08-06 — the identity sweep is redone by
ENUMERATING every site that states the key rather than by matching a wording,
which is what let "identity pair" and "(pin, query) key" survive v4.3; story
1.30's contradictory story question is withdrawn. v4.3 amended 2026-08-06 — §12.1's HEADING, opening sentence and
normative TABLE are brought into line with the triple (v4.2 changed the rule in
prose and left the table stating the old one), "the pair" is swept from the
four remaining identity sites, and story 1.30's acceptance criteria are
corrected to the triple with its merge named as §11's flip. v4.2 amended
2026-08-06 — the key's arity is UNIFORM (v4.1's
content-conditional judge-pin exception is WITHDRAWN: it decided the key from
the report's own content, so no request could form it) and §11's trigger names
its discharging act. v4.1 amended 2026-08-06 — three review-lane findings on PR #134
repaired under kogaki#131/#133's own license: §12 requires a report to RECORD
its identity, §12.1 puts the JUDGE PIN in the key where judged material is
present, and §11's trigger declares itself DEAD until story 1.30 merges. v4
amended 2026-08-06 (kogaki#131 and kogaki#133, decided as two
separate selections). v3 authored 2026-08-06 (kogaki#128 + kogaki#129, the
coupled screen/report cluster). v2.1 amended 2026-08-06 — §9's
`deferred-slot: terrain-family-split-carrier` is FILLED with alternative (a),
the split in the RECORD (kogaki#26/#27). v2 authored 2026-08-06 (kogaki#26 +
kogaki#27, the coupled Terrain-v2 cluster). v1 authored 2026-08-05
(kogaki#14).
**Governs:** port manifest item 1 (`specs/SPEC.md` §5).

**What v4 adds, and why it is two decisions rather than one.** v3 shipped
§6.1/§6.2/§7 and §12 together because neither half was decidable alone. v4's
two issues are **not** coupled that way — kogaki#131 completes §12's own
contract, kogaki#133 completes the screen's — so they were decided as separate
selections over one file. They share `specs/spec-terrain/SPEC.md`, which is a
scheduling edge and not a decision dependency.

- **kogaki#131 → §11, §12.1, §12.2.** The co-tag query key is **decided**
  rather than deferred: v3's third identity case stated a rule whose
  discriminator was undefined, which is carrier-less by omission rather than a
  postponement. §12.2 discharges kogaki#129's naming ask by separating
  *resolution* (normative, §12.1's pair) from *the filename* (implementer-owned,
  authority-free). §11's eager-versus-pull bullet gains the reopen trigger it
  lacked. Spec-only: no story, and the fix is the spec change.
- **kogaki#133 → §6.1, §6.2, §7.** The screen judges its SubGroups and requires
  the judge pin; a screen-composed claim's origin travels into its re-offer as
  an argument, leaving §7's no-record rider standing; and the per-member pin is
  named rather than left as an unexplained column. Decomposed to story 1.31.

**What v3 adds, and why it is one decision rather than two.** v2 shipped
`claim` (§7) and `subdivide` (§8) as commands and left the co-tag screen
composing neither, so the machinery existed and the served screen did not use
it. v3 binds **what the co-tag screen serves** (§6.1) and **where the
untruncated material lives** (§12, the Full Report). The two were decided
together because neither is decidable alone: a compact screen is only honest
if the material it omits is reachable, and a report is only necessary if the
screen is compact. `specs/SPEC.md` §5's manifest entry is again **not**
amended — §§6.1 and 12 bind the *application* of the three contracts and
introduce no fourth.

**What v2 adds:** the candidate model (§5), the co-tag second navigation step
(§6), GroupClaim-first rendering with claim pinning (§7), semantic
subdivision (§8), the rendering obligations that make a survey browsable
(§9), and one parked future item with its grounds (§10). `specs/SPEC.md` §5's
manifest entry is **not** amended and needs no amendment: it admits Terrain
with its three contracts, and §§5–9 bind their *application* rather than
adding a fourth or introducing a new sequencing precondition. Sections 1–4
below are v1 text and are unchanged except where §2.2 is explicitly amended.

Authored **here**, in the consumer, never ported as hub text:

> "Terrain is a consumer product and its design spec is consumer-side"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:23`

That line is the 2026-08-04 boundary correction, and it is recorded here
because the misdiagnosis it corrects is declared likely to recur: the
proposal it overturned conflated "hub-ratified vocabulary needs a hub
carrier" (true) with "needs a hub spec" (false).

## 1. Sequencing — the decision this spec was required to make

`specs/SPEC.md` §5's ordering clause is the carrier; this section states the
decision it records. Terrain's screens present selections, so they depend on
manifest items **3** (the owner-facing proposal contract) and **4** (the gate
carrier). Both port **first, as their own PRs, with their own contracts**.

The alternative considered and refused was folding a minimal form of 3 and 4
into this port. It is refused on the served ground quoted at
`specs/SPEC.md` §5 — admitting a subsystem without its contract is the
manifest's own named failure mode. **The refusal is a boundary, not a
preference:** a Terrain implementation that grows its own proposal-rendering
or gate-payload affordance has committed the refused alternative under a
different name, and §5's clause is what it is measured against.

A third alternative was considered and not taken: cutting the port at the
navigation/proposal line and shipping a navigation-only Terrain first, which
would need neither 3 nor 4. It is admissible and was declined at the
2026-08-05 gate; it is recorded because the cut line it proposed is the same
line §2.3 below makes load-bearing, and a later sitting reopening the
sequencing should reopen it rather than re-derive it.

## 2. The inherited contracts

These three are the manifest's own, inherited unamended. This spec binds
their **application to Terrain**; it does not restate them as new invariants.

### 2.1 Completeness is a cover counted in placements

Every Strand appears in at least one section. Strands with no relation go in
an **explicit named section** rather than being dropped. Nothing is silently
dropped.

**The count runs AFTER composition**, not before. A completeness figure
computed over the candidate set rather than over the composed placements
measures the wrong thing and will read as a pass while material is missing.

**A figure names which family it counted.** The served vocabulary is three
terms — Strand (Lesson|Journey), thread-line (Decision|Position), and Thesis
— and **no umbrella over Strand and thread-line was minted, deliberately**:

> "a covering word is what let the 2026-07-28 '132 of 246 Strands' figure be
> measured over Lessons ∪ Decisions (journeys excluded) and quoted into
> decisions made under the ratified Lesson-or-Journey definition, so every
> figure must name which family it counted"

`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 GLOSSARY.md:248`

So every completeness figure Terrain emits states its denominator's family.
A bare count is a defect, not a terse rendering.

### 2.2 Presentation-only grouping

Sections gate nothing. A navigation step carries **no selection authority** —
moving between screens, expanding a section, or changing the grouping axis
never narrows what the owner may choose. Screen 1's axis is the **served tag
vocabulary**; grouping is a view over the candidate set, never a filter on it.

**Amended by v2 (candidate-family scoping).** This clause governs what
grouping may do to a candidate set; it says nothing about what the candidate
set *is*. §5 fixes that separately, and the two are deliberately not merged —
the distinction between narrowing a set and constituting one is exactly what
§5's declared divergence turns on.

### 2.3 The second-proposer boundary

A combination becomes a **proposal** exactly when something other than the
owner narrows the candidate set.

- **Navigation** (no proposal): enumerate, sort, filter-by-owner.
- **Proposal** (routes through item 3's contract): rank, trim, hide.

This is the line §1's declined alternative would have cut the port at, which
is why it is stated as an enumeration with both sides named rather than as a
principle. **An act not in either list is a report, not a choice** — Terrain
surfaces it as unclassified with its reason and takes no narrowing action.

### 2.4 The WA baseline — Terrain design only, divergences declared

**Kogaki's Terrain reproduces WA's Terrain design by default** (owner ruling
2026-08-07, kogaki#150): `writing-assistant specs/spec-terrain/SPEC.md`,
`presentation.md`, and their amendment files are the design baseline, and a
Kogaki divergence from them is **declared in this spec with a
source-qualified pin** — the discipline §5.1 already executes once, promoted
to the standing default.

**The scope limit is part of the clause, not a footnote: the inheritance is
limited STRICTLY to Terrain design.** Kogaki was created specifically to
separate Draft and Brief completely from WA, and nothing here may be read as
a general WA inheritance — not for Draft, not for Brief, not for any other
subsystem. A sitting citing this section for a non-Terrain design question
is misusing it.

**The divergence register**, so a reader can count them rather than hunt:

1. **Lessons-only candidate rows** (§5.1) — diverges from a served hub line;
   declared there with its falsifiers.
2. ~~**The Full Report as a durable machine-local file** (§12.2) — WA's report
   renders from held state and writes no file (wa#986 declined md-export
   twice); Kogaki's durability half was decided at kogaki#129.~~
   **STRUCK 2026-08-08 (kogaki#234) — the entry recorded a divergence Kogaki
   was not entitled to, and BOTH positions it named are ruled wrong.** The WA
   baseline (render from held state, write no file) and Kogaki's own ratified
   answer (a durable machine-LOCAL file) are both superseded by the owner's
   repository-wide rule at `specs/SPEC.md` §2.5: the DURABILITY half survives
   and the LOCATION half is reversed — a durable file, in the working tree,
   repo-visible and uncommitted.
   **Why this entry is the register's own sharpest lesson.** It did everything
   §2.4 asks: the divergence was declared, in the amendment that created it,
   with its baseline named. And it was still wrong, because **a register
   records THAT you diverged and cannot check whether you were ENTITLED to** —
   the served line `product-lab@dec0d568 LESSONS.md:132` had held the answer
   for three weeks and no consultation at that sitting reached for it. The
   entry is struck rather than re-pointed: there is no surviving divergence
   here to record, only a corrected position.
   **The register does not shrink to three.** Entries keep their numbers so
   citations stay valid, and a struck entry stays countable — a register whose
   members silently renumber is one whose history cannot be quoted.
3. **Eager report generation at the co-tag view** (§11, decided v5) — WA's
   owner pulls a report per named group; the eager reading is owner-ruled
   2026-08-06 (kogaki#146).
4. **No per-Strand Gloss line and no Journey line on the screen** (§6.1,
   dropped at v3, ratified here at v6) — the baseline had closed group
   presentation as *"Group ID, Strand ID, gloss, journey — and nothing
   else"* (`writing-assistant specs/spec-terrain/
   amendments-2026-07-30--2026-08-01.md`, wa#1115/#1116); Kogaki's screen
   serves the IDs and the composed claim and serves **neither the per-Strand
   gloss nor the journey**, which live in the Full Report (§12).

**Entry 4 is stated at length because it is the entry this section was
missing**, and its absence is what let §6.1 be read as self-contradictory:

- **What was dropped, and when.** v3 moved the per-Strand Gloss and Journey
  material off the screen into the Full Report. v5 then adopted the *same*
  baseline's heading shape (member IDs on the heading, claim beneath) and
  quoted the baseline's closed presentation while silently keeping v3's rule
  — so from v3 until this amendment the screen diverged from a baseline it
  cites in the adjacent paragraph, with no entry here. kogaki#167 is that
  gap filed.
- **The divergence is now DELIBERATE and RATIFIED, not accidental.** Owner
  selection 2026-08-07 (kogaki#167), alternative **(b)**: the v5 screen form
  **stands** and the record gains this entry — the contradiction is resolved
  by amending the record rather than the behaviour. **No runtime change**;
  `terrain/terrain.mjs` `cmdCotags` already implements the ratified form.
- **The owner's ground for keeping it.** Restoring the lines was live as
  alternative (a) and was declined on screen size read against kogaki#168,
  ruled in the same sitting: SubGroups are **REQUIRED**, so a per-Strand
  Gloss line and Journey line would multiply across every SubGroup of every
  group rather than appearing once per group, running the screen against
  §8's `screen_budget_lines` instrument
  (`terrain/terrain.mjs:1082-1084`). The owner chose to keep the screen's
  size rather than restore the lines.
- **The cost is real and is recorded rather than argued away.** The screen
  keeps running without the Gloss and Journey lines the baseline it cites
  promises — which is exactly the drop kogaki#167 was filed about, and what
  the 2026-08-07 dogfood round saw as "Gloss all cleared and removed". An
  owner navigating the screen reads Lesson IDs and a composed claim with no
  per-Strand headline until they open the Full Report. This entry does not
  make that cost smaller; it makes it **declared**, which is the only thing
  §2.4 was ever able to buy.

The served surface discriminates toward recording rather than reversing:

> "A consumer that ships ahead of the hub wording DECLARES its divergence in
> the artifact, with a source-qualified pin … naming the diverged line
> converts an unratified shape into a CHECKABLE PROPOSAL … The hub's line
> still wins; what changed is that the gate had something exact to ratify
> rather than a shape to reverse-engineer."

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/knowledge-architecture.md:121`

  request_id: def8743a-472d-4d23-a61b-9cde5b9a7c0f
  outcome: discriminating
  query: When a served presentation diverges from an inherited baseline it still quotes, is the correct repair to restore the baseline form or to record the divergence in a register, and what does a deliberate ratified divergence owe that an accidental one does not?

An entry lands here in the same amendment that creates the divergence; a
divergence found shipping without an entry is a defect against this section
(the specimen that motivated it: v4's per-row pin, §6.1, shipped undeclared
and is withdrawn in this same amendment).

**Entry 4 was itself filed late, and that is the section's SECOND specimen
rather than an exception to the sentence above.** The rule is that an entry
lands in the amendment that creates the divergence; entry 4's divergence was
created at v3 and its entry lands at v6, three amendments later. Recorded as
a defect against this section and repaired here, because a register that
quietly back-dates its own late entries would report a compliance it does not
have. What the two specimens share is the tell: both were divergences from a
baseline the *adjacent paragraph quoted*, which is the position where a
divergence is least likely to be noticed and most likely to read as a
contradiction to whoever notices it next.

**THE FLOW RULE, AND THE POSITIVE LIMB IT WAS MISSING — v7, kogaki#164.**
`.claude/skills/terrain/SKILL.md:14` cites "SPEC.md §2.4's flow rule
(kogaki#150)" as this section's, so the rule is stated **here**, in full, and
the skill states it operationally. It has two limbs and only one shipped:

- **The negative limb, as shipped (v5, kogaki#150).** The screens and the Full
  Report are the runtime's renderings, **served verbatim**: the flow composes
  the runtime's *inputs* — the claims, the subdivisions — and relays its
  *output* as-is, and **never re-renders, summarizes, reformats, tabulates or
  paraphrases** what the runtime printed.
- **The POSITIVE limb, added here.** The runtime's rendering **reaches the
  owner as the FIRST act after the command returns** — before any gate, any
  question, and any other tool call. **A runtime refusal's stderr is delivered
  the same way and is never swallowed.**

  **THE OBJECT OF THAT FIRST ACT IS AN ARTIFACT, PER ARTIFACT CLASS (v19,
  kogaki#462).** As shipped at v7 this limb read *"relayed in full, in the
  user-visible reply"*, and that is now **superseded for both renderings this
  limb spans** — the negative limb above says *"the screens **and the Full
  Report**"*, so a replacement scoped to one of them would leave the other
  reading the superseded thing here, which is the defect this amendment exists
  to close. Each class keeps its own artifact authority:

  - **the screens** — `reports/Screen.md`, ruled by **§14.4.1** (v18)
  - **the Full Report** — `reports/FullReport.md`, ruled by **§12.2**
    (v11/v12), which sited it as a durable owner rendering and fixed its name

  Neither authority is restated here and neither is extended: §14.4.1 governs
  the screen and §12.2 governs the report, exactly as §12.2's own forward
  pointer declares. What this limb says is the part common to both — **the
  first act is naming the artifact to the owner**, never relaying a rendering
  in full in the reply, which is precisely the retyping §14.4 prohibits.

  **What survives unchanged is the ORDERING and the OBLIGATION**, which were
  the whole of what v7 added: it is still the first act, still before any gate
  or question or other tool call, and relaying nothing is still a breach. Only
  *what is handed over* moved. **The form of the hand-over is non-normative**
  per §14.4.1 and no form may be read into this limb.

  **The Full Report's hand-over already worked this way and is not changed by
  this amendment** — `announceArtifacts` names the rendering and the skill
  points at it, which is why only the screen half needed a ruling. It is
  written here because a limb spanning both artifacts that mentions only the
  one that changed reads as though the other were unaddressed.

  **Why this is amended AT THIS SITE rather than only at §14.4.1.** A reader
  asking *what does the flow do first* arrives here and at §6.3, not at a
  clause nine hundred lines away — and v18 changed this limb's object while
  naming §14.4 as its source and asserting the ordering was unchanged, both
  wrong. `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0
  gloss/lessons/knowledge-architecture.md:215` — *"Write down which side wins
  when the two disagree, **in a place both sets of maintainers will read**."*

**Why the positive limb is a repair and not a restatement.** The negative limb
binds a list of *transformations*, so **relaying nothing satisfies its letter**
— and that is not hypothetical: the 2026-08-07 dogfood run's `architecture`
co-tag screen was produced and never reached the owner, the flow moving
straight into a question UI while all eleven groups and their composed claims
existed in the run's own artifacts (kogaki#164, reproduced read-only against
the run record). The 2026-08-06 specimen was **re-rendering**, which the
negative limb catches; the 2026-08-07 specimen is **omission**, which it does
not. A blank screen must be impossible whether the runtime printed a screen or
an error, and only the positive limb makes it so.

**This clause is PROSE, and prose at this layer is ADVISORY rather than a
carrier — stated because the served surface says so and a clause claiming
otherwise would be the defect it is guarding against:**

> "the rule there is to SHRINK the free-form surface rather than lint it …
> `carry-a-rule-at-its-violation-layer` sites the carrier where the rule can be
> broken, which here is the model's own composition step — a layer the product
> does not own — so a rule written into a skill file or CLAUDE.md is
> **advisory, real, worth writing, and NOT a carrier**; adding one and calling
> the layer covered is the seventh application of the same remedy class in a
> new costume."

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 topics/articles.md:106`

  request_id: 2f45fe3b-4827-4c3e-b08c-c5d3cf0da8af
  outcome: discriminating
  query: Is reachability the conjunction of a resolving address and a surface that discloses it, and must a fix invoking that conjunction name which conjunct it establishes and which it leaves open?

**Receipt provenance, disclosed rather than implied.** That query was **not
aimed at this line.** It was one wide `policy_lookup` whose ranked return set
included `topics/articles.md:106` alongside the conjunction lines §10 relies
on, and the line was found **by reading that return set**, not by a framing
that sought it. Recorded because a later reader re-running the stated question
to check this quotation should know what they will and will not get, and
because a receipt that reads as though the query targeted the line would
attest a provenance the call does not have — the same defect one level down
from the reused-`request_id` shape §8.1 names.

So this limb is written **knowing what it buys**: the relay layer is the
harness's own composition step, which this repository does not own, and no
check here can observe whether a string reached the owner's visible reply. What
the clause buys is that a run which relayed nothing is now **visibly** in
breach of a stated obligation rather than conformant with a negative list —
worth writing, and not the same thing as enforced. The served line's own
prescription is **shrinking the free-form surface**, which is what §6.3's
allowlist does for the window where this defect actually occurred; the two
clauses are one remedy read from its two ends.

## 3. Inputs — served renderings only

Terrain reads through the seam, consumer `kogaki`: `element_survey`,
`gloss_index`, `glossary_entry`, `topic_thread`. All four are served today
and were verified reachable at authoring (`product-lab@924cce3`).

The repository-invisible boundary applies in full (`specs/SPEC.md` §2), and
so does the substrate-internals boundary (`specs/SPEC.md` §4's sided-evidence
clause and `policy/consultation-map.md` entry 2): Terrain reads **served
renderings**, never the state the gateway keeps to serve them.

**A resolver cites what it read, never what it was asked for.** Terrain
quotes a served rendering at the pin the seam returned, and where a served
answer's citation and content disagree the disagreement is surfaced rather
than resolved — a well-formed citation to a file that does not contain the
quoted material passes every downstream resolve check
(`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/knowledge-architecture.md:130`).

## 4. Out of scope, by decision

Any proposal-rendering or gate-payload affordance of Terrain's own — those
are items 3 and 4, and building them here is §1's refused alternative. Also
out: probe, harvest, fact sheets, the sources gate, the provenance map/judge,
and the interview's mandated asks, all dropped by `specs/SPEC.md` §5.

**IN scope by decision, v12 (kogaki#289): the provenance-neighborhood surface,
§13.** It is named here rather than only at §13 because this section is where a
reader checks whether a surface is admitted, and a surface admitted only in its
own section is admitted where nobody looks for the answer.

**Why it is not the affordance the paragraph above refuses.** §13's suggestions
are **not proposals** in this spec's sense. §2.3 fixes "proposal" to the act of
**narrowing** the candidate set, and routes `rank`/`trim`/`hide` to
`specs/spec-proposal-contract/SPEC.md` on exactly that ground
(`specs/spec-proposal-contract/SPEC.md:27-29` records Terrain as its first
consumer and reproduces the split). A widening view narrows nothing, so it grows
no proposal-rendering affordance and needs none — the word "propose-only" in
kogaki#289's riders means *suggests without gating*, which is this spec's
**report**, not this spec's **proposal**. The two senses collide in English and
not in the contract; §13.1 states the mapping so a later reader does not resolve
the collision the other way and conclude §1's refused alternative was built.

## 5. The candidate model — Lessons-only rows, Journey marked by absence

**The candidate row is one Lesson.** A Journey is not a row of its own; it is
a **mark on its Lesson's row**, and the mark reads by **absence** — a Lesson
with no Journey is decorated, a Lesson with one is not. Every screen that
shows candidate rows **states its denominator**, in Lessons.

The design's load-bearing half is the denominator rather than the mark. At
high Journey coverage a presence-mark decorates nearly every row and
discriminates between none; the thin Lessons are the actionable set, and the
stated denominator is what makes the **next coverage inversion visible
on-screen** rather than inferable only by someone who already suspected it.

**Measured at this amendment's pin**, through the seam, by
`terrain/terrain.mjs survey`: 274 candidates — **144 Lessons, 130 Journeys**;
**every Journey has a Lesson of the same slug (130 of 130, zero orphans)**;
coverage **130/144 = 90.3%**; **14 thin Lessons**. Within `agents`, the tag
whose bare `115` prompted kogaki#26: 59 Lessons + 56 Journeys.

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/ELEMENTS.jsonl:2-3,7,12,14-15,17,24,31,35-36,38-39,45,50,52-54,59,64-65,67-69,71-72,74-77,79,84,86-87,90-92,95-96,99,105-106,111,113,117-119,121-122,124,127,129-130,134-136,138,140-141`

The figure is a **measurement, not the claim** — it is what makes §5.2's
falsifier computable, and it is re-measured at every run rather than quoted
from here.

### 5.1 Declared divergence — pending hub wording, stated rather than assumed

**This section diverges from a ratified served ruling. The divergence is
declared here rather than smuggled, and the hub's line still wins.**

The served line diverged from:

> "Screen 1 offers Topic selection …; **screen 2 shows all of that Topic's
> Lessons and Journeys** in semantically related sections whose first line is
> a derived title. The invariants that distinguish this from the abandoned
> unit, both mechanically checkable: **completeness** — sectioning is a
> permutation, every element appears exactly once, count-in equals count-out
> … and **presentation-only**"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/articles.md:25`

  request_id: c80871ca-c15b-4a64-bae6-2ed05d93cae4
  outcome: discriminating
  query: Terrain screen 2 ruling: what does the second screen show — one member's complete material, every element appears exactly once, count-in equals count-out completeness invariant?
  query: Lessons-only candidate rows with Journey derived and marked by absence; excluding decision material from the entry surface refused as a discovery failure not an honest scope

**The reading Kogaki proceeds on:** candidate rows are Lessons only, with the
Journey family derived and marked by absence and the denominator stated. The
owner directed it on 2026-08-05 against WA's own 2026-07-30 amendment
(wa#933/#934), which is **consumer-side and not hub-ratified** — a consult
along two framings found no served line adopting it, and found instead the
line quoted above, which discriminates *against* it. So this is a divergence
from a position the surface holds, not a gap in the surface.

**The refresh is OWED, not done.** No hub ruling has been requested and none
is assumed; a later served amendment supersedes this section without
argument, and until then this text is a **checkable proposal** rather than a
settled shape.

The discipline that makes this admissible, and that is the discharge:

> "**A consumer that ships ahead of the hub wording DECLARES its divergence
> in the artifact, with a source-qualified pin** — the first clean discharge
> of the shipped-ahead gap in this corpus. … naming the diverged line
> converts an unratified shape into a CHECKABLE PROPOSAL"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:119`

  request_id: 1982ed22-9da6-4faa-b701-29bc0bbb88e9
  outcome: discriminating
  query: May a consumer ship ahead of a served ruling if it declares the divergence with a source-qualified pin? What is the shipped-ahead discipline and does a shipped-ahead implementation ratify its shape?

The hazard that discipline names is **silent promotion** — the shape that
produced the first write becomes the shape
([[a-shipped-ahead-implementation-does-not-ratify-its-shape]],
`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:80`).
A Terrain implementation that carries lessons-only rows **without** this
section present is that hazard realized, and the absence of this section is
the defect rather than the code.

**Scope of the divergence: item 1 only.** §§6, 7 and 8 each rest on a
ratified served ground and diverge from nothing.

### 5.2 The risk this design carries, and what would falsify it

**The counter-argument, stated rather than assumed away.** The completeness
invariant is what lessons-only rows most plausibly strain, and the strain is
not where a casual reading puts it.

The invariant was corrected for multi-valued substrates:

> "a **COVER counted in PLACEMENTS**, not a partition — every Strand in at
> least one section, no-relation Strands in an explicit named section,
> nothing silently dropped. … Where a substrate is single-valued,
> exactly-once still holds as the stronger check."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:80`

That rule binds the **placement** of candidates. §5 changes the **candidate
set itself**, one step upstream of where the invariant watches — so a design
that never drops a placement can still have shrunk **count-in**, and the
placement check would pass while it did. This is
[[grouping-upstream-of-selection-is-a-gate]] read at the constitution of the
set rather than at its sectioning, and it is the honest objection to §5.

**Why the design survives the objection at this pin, and only there.** Every
Journey has a Lesson of the same slug (130 of 130 measured above), so the
Journey family is **representable without loss** as a per-Lesson mark:
Lessons plus marks reconstructs the Strand set exactly, count-out over
Lessons plus the marks equals count-in over Strands, and no Strand becomes
unreachable. The reduction is a **re-projection, not a drop** — which is
precisely the property the served ruling's "count-in equals count-out" exists
to demand, met by a different mechanism than the one it names.

**Falsifier 1 — an orphan Journey.** A Journey whose slug matches no Lesson
has no row to be marked on and is silently dropped. The count is computable
at every run (`orphan_journeys`), it is **zero today**, and any value above
zero **falsifies this section**. Terrain **refuses the survey** in that case
rather than rendering it — a generation-time refusal, per §2.1's rule that
nothing is silently dropped, not a rendering-time warning. The refusal names
the orphan slugs.

**Falsifier 2 — coverage saturation.** Marking by absence discriminates only
while some Lessons lack Journeys. At 100% coverage the marks decorate
everything and inform nothing, and the design's own rationale expires. The
reversal trigger is stated in advance rather than discovered: **coverage
≥ 99% (thin Lessons ≤ 1 of the served denominator)** reopens §5 as a design
question. It is 90.3% today.

**Falsifier 2 has NO READING ACT, and the two falsifiers are not equally
sited.** This is stated plainly because the pair otherwise reads as
symmetrical and is not:

| | Falsifier 1 (orphan Journey) | Falsifier 2 (coverage ≥ 99%) |
|---|---|---|
| Computed | yes, every survey run | yes, every survey run |
| **Read** | **yes** — refuses the write | **no — nothing reads it** |
| Carrier | generation-time refusal; an acceptance criterion in story 1.22, fixture-verified | none |
| Fires by | the code stopping | a human noticing a percentage |

Falsifier 1 has a carrier at its violation layer: the value is computed and
the survey **refuses**, so the trigger cannot fire unobserved. Falsifier 2 is
computed and then **printed** — its firing depends on a person reading a
number in survey output and recognizing what it means. **No check observes
it, story 1.22 explicitly disclaims it, and this spec declares no periodic
reader** (a periodic reader is refused deliberately: it would convert a
demand trigger into a schedule).

**The cost of that, stated rather than absorbed.** A held item whose trigger
nothing reads can fire and go unnoticed — the failure mode is
*fired-and-unread*, and it presents as nothing happening. So Falsifier 2 is
honestly a **weaker instrument than Falsifier 1**: it is a stated reopen
condition on a rendered number, not a guarantee, and it should not be quoted
later as though the design were mechanically protected against saturation.
What would earn it a real carrier is the ratified form — a held item names an
act that ALREADY HAPPENS and observes the quantity its trigger fires on, or
declares `instrument: none`. This section chooses the second and says so:

> **instrument: none** — for Falsifier 2. Declared at authoring, per the rule
> that the declaration binds at authoring time and never as a periodic
> reader.

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:9`

The candidate act, named so a later sitting does not re-derive it: the survey
run already computes both halves, so the coverage figure could ride the
survey's own emitted output as a declared threshold row rather than a bare
percentage. That is a **carrier proposal, not a decision** — building it is
not licensed here, and it is not smuggled in as one.

Both falsifiers are **properties of the served corpus, not of Kogaki's
code**, which is why they are stated as triggers on a measurement Terrain
already takes rather than as tests over an implementation. That is the
reason for their shape; it is not a reason Falsifier 2 needs no carrier, and
the paragraph above is not to be read as supplying one.

## 6. Navigation — the co-tag second step

Selecting a tag displays **the other tags its members carry, grouped by
co-tag, with counts** (`agents × architecture (3)`). This is the second
navigation step, and it is navigation in the full §2.3 sense: deterministic,
complete, nothing hidden, no ranking. Selecting a co-tag group narrows
nothing — the full candidate set stays reachable, and free text still reaches
every Strand at the gate.

Served ground, and its adoption:

> "The remedy, when one is eventually needed, is a **SECOND NAVIGATION STEP**
> — not a cap and not a re-tag. … Elements already carry their other tags on
> the served surface, so offering those as a sub-selection is *navigation*:
> deterministic, complete, nothing hidden, no ranking."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/articles.md:17`

Held in 2026-07-27 on a watch trigger; the 2026-07-31 subdivision ruling
records the line as **spent on the co-tag step**, which is the adoption:

> "The 2026-07-27 'second navigation step, not a cap' line is ALREADY SPENT
> on the co-tag step and is not this mechanism's authority."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:66`

**Machine-composed connective prose at render time is admissible** and is
ruled so separately — the no-model-in-the-render-loop choice was made on cost
alone and the owner withdrew that ground. It arrives with the invariants
binding *harder*, not softer:

> "The ratified invariants bind **harder** with a model in the loop —
> composed section prose stays a permutation … and carries no selection
> authority; a composer able to omit or merge a Strand is
> [[grouping-upstream-of-selection-is-a-gate]] arriving again, wearing prose."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:110`

### 6.1 What the co-tag screen SERVES — the compact GroupClaim-first form

**This section folds kogaki#128.** Its defect specimen is live and reproduces
at this amendment's pin: the served co-tag screen prints a co-tag count table
and, beside it, a flat `All 59 Lesson slugs, in served order:` dump. **No
GroupClaim appears anywhere and no Lesson IDs are visible *grouped*.** The
composition defect is that v2's machinery is unreached, not that it is wrong
— `cotagGroups` places every member (`terrain/terrain.mjs:488-503`) and
`cmdCotags` prints each group's *figure* while emitting member IDs **only
under `--group`** (`terrain/terrain.mjs:571-580`); `claim`
(`terrain/terrain.mjs:663`) and `subdivide` compose the missing halves and
nothing calls them, the skill's own flow being survey → view → narrow →
select with no co-tag step at all (`.claude/skills/terrain/SKILL.md`).

**The screen serves, per group, in this order:** the **GroupID**, the
**GroupClaim** — §7's composed "in common:" line — and the **member Lesson
IDs**. Where §8's conditions bind, the members are served as SubGroups, each
carrying its own SubGroupClaim above its Lesson IDs (§6.2). Every figure
names its families under §9, unchanged.

**The screen carries no per-Strand Gloss line and no Journey line.** The
untruncated Claims and Glosses live in the Full Report (§12), which the owner
pulls per named group.

**This clause and the baseline quoted below are RECONCILED at §2.4's register
entry 4 — they are a DECLARED DIVERGENCE and not a contradiction** — v6,
kogaki#167. The baseline's closed group presentation, quoted verbatim a few
paragraphs down, names a per-Strand `gloss` and `journey`; this clause serves
neither. From v3 until this amendment that gap sat in §6.1 with no entry in
§2.4's register, and two adjacent paragraphs of this section therefore read
as contradicting each other — which is how kogaki#167 found it. **The clause
STANDS**: owner selection 2026-08-07, alternative **(b)**, the record is
amended and the behaviour is not, and no runtime changes. A reader holding
either paragraph is directed to **§2.4 entry 4** for the disposition, the
owner's ground, and the cost — the register is what reconciles them, and
neither paragraph is edited to hide the gap.

**Each member row carries its served pin beside its ID** — v4, kogaki#133.
This is one token more than the ratified form quoted below names, so it is
stated rather than left as an unexplained column. Two grounds: §3's
quote-at-the-pin discipline governs every served rendering Terrain emits, and
the screen is where the owner reads the IDs they will later enter into a
Brief — a row whose provenance is invisible is the one place that discipline
would buy nothing. **It remains a pin and never a Gloss:** the rule above is
unchanged, and a row that grew a headline would breach it.

**The v4 clause above is WITHDRAWN, and the served form is the baseline's**
— v5, kogaki#148/#149. The WA baseline had already closed group
presentation: *"Group ID, Strand ID, gloss, journey — and nothing else"*,
the per-Strand pin rendering on **no** surface and the **shared pin stated
once** in the Full Report, with the member → served-line map at the
report's end (`writing-assistant specs/spec-terrain/
amendments-2026-07-30--2026-08-01.md`, wa#1115/#1116). v4's per-row pin was
that decision re-opened without declaring the divergence — §2.4's named
specimen. The withdrawal is recorded rather than edited away, so a reader
holding v4 finds the disposition. §3's discipline is not weakened: the pin
still travels with everything quoted; it is **sited once**, in the report,
where the reading happens.

**The served form, per group** — v5, kogaki#148/#149, the baseline's own
heading form (wa#1115/#1116, wa#1075):

```text
G<n> — <co-tag name> — N Lessons: L<i>, L<j>, …
in common: <GroupClaim>
```

- The **heading line** carries the GroupID, the Lesson count, and the member
  Lesson IDs. The count names its family (§9).
- The **GroupClaim renders beneath the heading**, whole — a claim is never
  clipped mid-text; where §7's pinning statement rides it, it follows the
  claim.
- Where §8's conditions put SubGroups on the group, the members render as
  SubGroups per §6.2's form instead of on the heading line, and the heading
  carries the count alone.

**v6 — INDENTATION IS WITHDRAWN AS THE HIERARCHY CARRIER; THE GroupID CARRIES
IT** (kogaki#317, owner decision 2026-08-09, executed 2026-08-11 coupled with
kogaki#315). The v5 form above indented the `in common:` line four spaces
beneath its heading, and indentation was the *only* thing marking the claim as
subordinate to that group. The 2026-08-09 hands-on round found this unreadable,
for the reason indentation cannot fix: **claim lines are long prose, they wrap
at the terminal edge, and a wrapped continuation begins at column 0** — so the
hierarchy disappears exactly where the text is longest, which is exactly where
a reader needs it.

So the level moves out of whitespace and into **content**: `G<n>` is a Group,
`G<n>-<m>` is one of its SubGroups (§6.2), and every line renders **flush
left**. A wrapped line still says what it belongs to, because the ID is in the
text rather than in the margin. The withdrawal is recorded rather than edited
away, so a reader holding v5 finds the disposition.

**The ID space is minted here and its grammar is registered**, not left
implicit: `tokens.GroupID` (`^G[0-9]+$`) and `tokens.SubGroupID`
(`^G[0-9]+-[0-9]+$`) in `specs/spec-terrain/report-format.json` v3, which also
moves `group_subgroup_id_grammar` from `not_expressible` into `expressible` —
that entry's own stated reopen trigger, discharged verbatim. This is the half
kogaki#315 records as "held by the owner as contract and registered NOWHERE".

**What did NOT change, stated because a presentation ruling is easy to
over-read:** the content served is identical — same IDs, same counts, same
claims, same member Lesson IDs, same ordering under `COTAG_SORT`. Nothing that
reaches the owner is smaller than before. What kogaki#317 called
"presentation only" is true of the *rendered shape*; the ID space it required
is content, which is why the decision was executed only once kogaki#315 —
which asks for those IDs by name — was coupled into the same sitting.

This amends the v3 ordering sentence above ("the GroupID, the GroupClaim …
and the member Lesson IDs") to the baseline's heading form; the *content*
served is identical, and nothing that reaches the owner is smaller than what
exists.

That split is the ratified form rather than a new design here:

> "Top-N is WITHDRAWN and the compact all-groups form replaces it: the
> narrowing act moved to the owner, which is what puts the replacement inside
> the second-proposer boundary. **Every group renders as member ids plus the
> composed commonality line** … [elided: "sorted descending by member count";
> Kogaki's shipped `COTAG_SORT` diverges and the divergence is carried at §11]
> … with the owner pulling a **Full Report** per named group. … the boundary's
> test is not whether a machine computed something but **whether what reached
> the owner is smaller than what exists**. Nothing is smaller."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:79`

**PIN CORRECTION — v6, kogaki#167's currency check.** At the served HEAD
`0cb46066653ef3db2e33f69971829d25c06b6507` the quote above is
**`topics/articles.md:80`**, not `:79`. This is not cosmetic drift: at that
HEAD **`:79` holds different content** — the 2026-07-29 adoption of the co-tag
second navigation step — so the pin as written **still resolves, and resolves
to the wrong line**, which is the failure mode a resolving-pin check cannot
see. `issue-pins --recheck` reported `ok: pins current` across it. The
original sha-qualified pin is left standing rather than edited away, because
it is an accurate record of what was read at `f918c51`; a reader working at
the new HEAD uses `:80`. §8.1's currency block carries the general finding and
names the other two sites that quote this same line.

  request_id: a50873dc-3240-4019-9fb9-2c3c18d64c6e
  outcome: discriminating
  query: Should a navigation screen carry a compact list of IDs and claims with the full untruncated material living in a separate report artifact, or should the screen itself carry the reading material? Does moving reading material off the screen into a report hide anything?

**The flat slug dump is REMOVED, and the removal is not a narrowing.** It is
the same members, served grouped instead of served twice — every Lesson ID
still reaches the screen inside at least one Group, which is exactly what
§2.1's cover counted in placements already guarantees and what
`COTAG_COVER_INCOMPLETE` already refuses on
(`terrain/terrain.mjs:534-544, 583-586`). Nothing that reaches the owner is
smaller than what exists, so §2.3's boundary is untouched. The dump's defect
was never that it showed too much: it is that a flat list beside a count
table lets **no image of a possible Thesis form**, which is the purpose §6
exists to serve.

**Purpose clause, stated here because the screen is judged against it.**
Terrain is a support system for **beginning** Brief creation and does not
itself start one; its job is surfacing which combination of Lesson IDs the
owner would enter when they later compose a Brief. **A screen with no visible
Lesson IDs fails that purpose regardless of what else it shows** — which is
the reading under which kogaki#128 is a defect rather than a preference.

### 6.2 SubGroups on the screen, and the threshold that is NOT one

**kogaki#128 asks for SubGroups "when a Group has many members (five or
more)". That number is admitted as CALIBRATION EVIDENCE and refused as a
threshold**, on §8's own standing rule — "Terrain implements no member-count
threshold. A number appearing in its code as one is a defect against this
paragraph." The issue's "five or more" is the same shape as the owner's
"above ~4 members" that §8 already ruled on: evidence for *where the
undiscriminating-claim condition binds*, never the condition itself.

So the screen serves SubGroups where **§8's conjunctive leaf condition and
its two disjunctive disclosures** put them, and the implementation carries no
`5`. This is recorded rather than silently corrected because the issue states
the number as the rule, and a reader holding kogaki#128 must find the
disposition rather than an absence.

**v7 — THREE GROUPING RULES, and what each one does when it fails**
(kogaki#316, owner decision 2026-08-09, executed 2026-08-11). §14.2 already
enumerates the first two as decidable; this section says what failing them
*means*, which the enumeration does not.

1. **The SubGroup member counts sum to the parent's total.** Every member
   placed, nothing silently dropped. A screen violating it **does not render**
   — `subgroup_members_sum_to_parent`, refused at emit time (§14.2).
2. **The `(fits no composed SubGroup)` remainder is at most 30% of the
   parent's members.** A judgment whose remainder exceeds it is re-run or
   recomposed; it does not render — `catch_all_share` (§14.2). The specimens
   that settle it are kogaki#316's own: 11 of 17, 20 of 28, 29 of 35.
3. **A split whose only named SubGroup restates the parent's own commonality
   does not discharge the subdivision obligation** — and *that phrase means the
   group renders no SubGroups*, not that the screen refuses. This is **the
   fallback this section already names**, not a new outcome: a group whose leaf
   condition fails "renders no SubGroups and is fully conformant". So a split
   that is not `tighter_than_parent` leaves the group rendering flat, with its
   own claim and member ids, exactly as an unjudged-empty group does.
   **Why not a refusal like 1 and 2:** those are properties of the *rendered
   text* and a violation means the emitter produced something incoherent. This
   one is a *judge's verdict*, and refusing the whole screen over it would
   contradict this section's own conformance clause one paragraph up. Before
   v7 the verdict was computed, rendered as `NOT a leaf: … the split bought
   nothing`, and read by nothing — the obligation was reported rather than
   discharged.

**THE NO-MEMBER-COUNT-THRESHOLD RULE IS UNTOUCHED BY ALL THREE, and this
paragraph exists because kogaki#316 asked for it explicitly.** §8's rule — "a
number appearing in its code as one is a defect against this paragraph" — and
this section's conformant-failed-leaf clause both **stand unchanged**. The 30%
cap is a bound on the catch-all's share of a judgment that **did** split; it is
not a member-count trigger for **whether** to split. kogaki#316's first filing
proposed such a trigger ("6+ members with no SubGroup is a defect") and the
owner **withdrew it the same day**. Recorded so the withdrawal is not
re-proposed as a finding.

**§8.1's ordering is unchanged by this section, and this section makes its
gate DUE.** Subdivision ships dogfood-first — implemented → dogfooded →
owner-verdicted → offered — and §8.1's offering gate is **undischarged**.
Serving SubGroups on the co-tag screen is what gives the owner output to
verdict; it is not the verdict, and merging it does not discharge the gate.
Carried as `deferred-slot: terrain-subdivision-offering-verdict`.

**`deferred-slot: terrain-subdivision-offering-verdict` is DISCHARGED** —
v6, owner ruling 2026-08-07 (kogaki#168). **The slot asked** for the
owner-verdict step of §8.1's implemented → dogfooded → owner-verdicted →
offered ordering: it held the question open because merged subdivision code
evidences existence and never the gate's standing. The 2026-08-06 and
2026-08-07 dogfood rounds produced the specimen it was waiting on — judged
SubGroup output carrying judge pins in the architecture Full Reports — the
owner has now seen that output across two rounds, and this is the verdict
delivered. The slot is **discharged**, not re-pointed: the act it named has
been performed by the actor it named.

**What the verdict returned is stronger than the offering the ordering
anticipated: REQUIRE, not offer.** SubGroups on the screen and in the Full
Reports are a **required** part of the served surface. Until a run serves
them, **every Terrain run is a contract violation and is treated as a FAILED
run** — and a dogfood verdict taken on any *other* aspect of such a run is a
verdict on a failed specimen, which is why kogaki#165 (the subdivide crash)
and this ruling are upstream of every further Terrain dogfood round.

**"Required" governs the JUDGMENT, never the outcome — §8's threshold rule is
untouched.** A run may not **skip the subdivision judgment**; it does not
follow that every group subdivides. SubGroups appear exactly where §8's
conjunctive leaf condition and its two disjunctive disclosures put them,
judged, with the judge pin required by the three requirements below. **No
member-count threshold is introduced or implied** — §8's standing rule that a
number appearing in the code as one is a defect stands unchanged, and this
ruling must not be read as re-admitting kogaki#128's "five or more" through
the word "required". A group whose leaf condition fails renders no SubGroups
and is fully conformant; what is refused is a run that **never asked**.

**The alternative this ruling OVERRULES, named because another issue carries
it and the two must not be read against each other.** kogaki#163 proposed
enforcing "never default" — removing the judge pass from the default path —
as a **latency** fix. **That lever is DECLINED by this ruling**: the judge
pass is mandatory. kogaki#163's latency finding is *not* dismissed and stands
on its own; it must be solved with its other levers — relaying the screen
before report generation, and bounding claim and subdivision composition to
the tag-scoped served Gloss shard — or with new ones, **never by dropping
SubGroups**. Recorded here rather than only on the issue thread because a
lever declined in one issue's comments is invisible to the sitting that picks
up the other.

**The screen JUDGES its SubGroups; it does not merely render them** — v4,
kogaki#133. v3's wording ("where §8's conjunctive leaf condition and its two
disjunctive disclosures put them") was satisfied in the shipped screen by the
caller's JSON alone: the runtime placed members and printed name, claim and
ids, evaluating neither conjunct and emitting neither disclosure. Three
requirements close that:

- **The screen renders each SubGroup's leaf verdict** — which conjunct held
  and which failed — exactly as `subdivide` does over the same shape.
- **The screen emits both disclosures**, degenerate-claim and
  undiscriminating-claim, on the same disjunctive terms §8 states. Neither
  gates anything; both are disclosures.
- **The screen REQUIRES the judge pin** — model id and effort tier — on the
  same ground `subdivide` refuses without one: a per-invocation judged surface
  with no judge pin is the drift-undetectable shape, where "recomputed fresh"
  silently becomes "recomputed by a different judge". A judged surface that
  records no judge is not cheaper than one that does; it is one whose drift
  cannot be seen.

The siting is the reason this belongs at the screen rather than upstream:

> "A rule is enforced only at the layer where it can be broken … when that
> layer belongs to another system, the carrier goes at the last boundary you
> control, with any gate upstream of it counting as ergonomics rather than
> control."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:87`

**This does not pre-empt §8.1's gate.** Requiring the judge pin and rendering
the verdicts makes the *dogfood specimen* honest, which is what the offering
verdict is taken over. A specimen that hid its own judgment would make the
gate decorative.

**The served SubGroup form** — v5, kogaki#148, the baseline's model rendered
in the owner-ruled line shape (wa#980/#1041: parent GroupClaim as the
section header, each SubGroup its own composed claim, hierarchy visible;
owner format ruling 2026-08-06):

```text
G<n>-<m> — N Lessons: L<i>, L<j>, … — <SubGroup name>
in common: <SubGroupClaim>
```

One line — SubGroupID, Lesson count, Lesson IDs; the SubGroupClaim on the
next.

**v6 — flush left, and the parenthesis is gone** (kogaki#317, 2026-08-11).
The v5 form indented the SubGroup block six spaces and wrapped its count in
parentheses, both of which were carrying part of the level distinction; §6.1's
v6 note above records why whitespace cannot carry it. `G<n>-<m>` **names its
own parent**, so a SubGroup line that wraps — or that a reader meets on its
own, scrolled away from its group — still says where it belongs. With the
level in the ID, two different punctuations for one shape is a difference that
means nothing, so the SubGroup heading takes the same `— N Lessons: …` form as
the Group heading. The leaf verdict and any disclosures follow the claim, per this
section's judging requirements, and the judge pin renders once for the
screen. The 2026-08-06 dogfood specimen — a 27-member group served as a
single GroupClaim-shaped paragraph with no IDs and no SubGroups — is the
defect this form is stated against; the owner's "five", like kogaki#128's
and WA's "~4", stays calibration evidence for where the
undiscriminating-claim condition binds, and no member count enters the code.

### 6.3 The post-tag-selection window — exactly two acts, and no question

**Owner ruling 2026-08-07 (kogaki#166), landing in one clause with
kogaki#164's relay limb (§2.4), kogaki#161's tag-selection limb, and
kogaki#162's fork half.** Once the owner has named a tag, the flow contains
**exactly two acts**, in this order:

1. **The served screen.** `cotags` runs, writes its rendering to
   `reports/Screen.md` (§14.4.1), and that artifact is **named to the owner as
   the first act after the command returns**, under §2.4's flow rule.
   **v19, kogaki#462:** through v18 this act read *"relayed in full, in the
   user-visible reply"*. §14.4.1 replaced the object — the artifact is handed
   over, never the rendering retyped into the reply — and left this site
   saying the superseded thing. The ordering is unchanged; only what is handed
   over moved, and its **form is non-normative**.
2. **The one Full Report, over the IDs the owner entered.** `report --tag <T>
   --ids <G/SG list>` — one report covering exactly the entered set,
   idempotent per identity (§12.1).

**THE STOP MOVES BETWEEN THE ACTS** — v7, owner decision kogaki#314,
2026-08-11. Through v6 both acts ran back to back and the window closed after
act 2. Act 2 now needs the owner's ID entry, so:

```
act 1: cotags  → the screen, relayed in full
       [ nothing runs — the owner speaks ]
act 2: report --ids …  → one report
       [ nothing else runs ]
```

**Still exactly two acts, and still no question UI.** ID entry is the owner
*speaking*, not the runtime *asking*: nothing prompts, nothing offers options,
nothing renders a selector. The runtime finishes act 1 and stops. What changed
is only where "nothing else runs until the owner speaks" sits — between the
acts rather than after them — and that is a change of position, not of
authority: the window still bounds what runs unattended, and it now bounds
strictly more, because act 2 no longer runs unattended at all.

**Nothing else runs until the owner speaks in chat.**

**§6.2's subdivision judgment is part of ACT 1 and is never a third act
beside it.** kogaki#168 makes SubGroups **REQUIRED**, and "required" governs
the judgment rather than the outcome: the run judges every group's leaf
condition and renders the SubGroups §8 puts there, **inside** the screen act,
carrying its judge pin. This is stated because an act allowlist drafted
without it fails in both directions — it would either exclude the judgment
(making every run a §6.2 contract violation) or admit a third act (making the
window three acts wide, which the ruling refuses). A group whose leaf
condition fails renders no SubGroups and is fully conformant; what is refused
is a run that **never asked**.

**The ruling's conditional, resolved against the contract rather than left
open.** The ruling states: *if* the contract required authorization before
generating the Full Reports, the only permissible post-selection question
would be whether to generate them. The contract does **not** require it — §11
is decided EAGER — so the only candidate question has nothing to ask, and the
permissible set reduces to **zero**.

**THE QUESTION ALLOWLIST FOR THIS WINDOW: it is empty. No question UI may
appear after a tag has been selected. None.** The 2026-08-07 run inserted
three — a co-tag selection question, a "what next" question, and a second-tag
selection question — and each is refused **independently of how it was
rendered**, which is what an allowlist buys and an enumeration does not.
Navigation is never a question here: the owner navigates by naming things in
chat, and free text reaches everything.

**The non-member fallback is stated, because that is the allowlist's
load-bearing half rather than its completeness:**

> "For an enumeration of admissible kinds the load-bearing half is not
> completeness, which is unachievable, but the **non-member fallback** —
> surface anything outside the list as report-only with its reason, or declare
> it out of scope."

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 LESSONS.md:104`

  request_id: 2f45fe3b-4827-4c3e-b08c-c5d3cf0da8af
  outcome: discriminating
  query: Is reachability the conjunction of a resolving address and a surface that discloses it, and must a fix invoking that conjunction name which conjunct it establishes and which it leaves open?

**Receipt provenance, disclosed rather than implied** — as at §2.4, and for
the same reason. The query recorded above was **not aimed at `LESSONS.md:104`**;
it was one wide `policy_lookup` whose ranked return set included that line, and
the line was found **by reading the return set** rather than by a framing that
sought it. The three sites in this amendment carrying this `request_id` all
record the **same** query because they rest on the **same single call** — which
is the identical-duplicate case rather than the reuse-with-a-changed-reading
case — and this note is what keeps the distinction visible to a reader who
cannot see the call.

**The fallback here is REFUSE, not report-only, and the window is what makes
that admissible.** An act in this window that is neither of the two named is a
**defect against this section**, and a question UI in this window is a defect
whatever it asks. Report-only is the correct fallback for an open-ended
enumeration; this enumeration is closed by the eager contract — the window has
a known beginning (the owner names a tag), a known end (the owner speaks
again), and exactly two acts inside it — so there is no admissible remainder
to surface.

**kogaki#162's fork is CLOSED by this clause.** A tag named by the owner lands
**directly at the co-tag step**, not at a second `view --tag`; the per-tag row
view runs only when the owner asks to browse rows. **No question mediates the
fork.** The 2026-08-07 "do you want a screen-1 pass?" question was the
symptom; the undeclared fork was the cause, and `.claude/skills/terrain/
SKILL.md` already carried the landing rule while nothing carried the
no-question rule. The vocabulary half of kogaki#162 shipped at story 1.32; this
is the half that story deliberately excluded, and it lands here rather than
there because it is this group's decision.

**SCOPE — this allowlist governs the POST-SELECTION WINDOW ONLY, and the limit
is the decision rather than an omission.** kogaki#161 proposed a question
allowlist over the *whole* flow. **Two of its limbs do not land here**, and
both are withheld on the reasons §10 states:

- **The opening Lessons/Decisions gate** (kogaki#161 item 1). Recorded at §10
  as the ground for a later unparking, against §10's existing and **unfired**
  trigger; §10 stays parked.
- **The tag-screen prohibition** (kogaki#161 item 2) — *"no question UI may be
  launched for tag selection"*. That question is asked **before** a tag is
  named, so it falls outside this clause's window by the clause's own opening
  words, and it acquires **no carrier in this amendment**. It travels with the
  opening gate rather than with §6.3.

What **does** land from kogaki#161 is items 3 and 4 — the "what next" question
and the second-tag question — which sit inside the window and are refused by
the empty allowlist above. Stated at its cost: **the flow before a tag is
named has no stated allowlist after this amendment**, and the four-question
dogfood specimen is only **partly** answered. What is bought instead is that
the clause that does land rests on a line the substrate has actually spoken
to; the ground is at §10.

**Alternatives declined, with their reasons, because a decline recorded only
in a sitting's comments is invisible to the sitting that picks the question up
next:**

- **The prose allowlist at FULL scope (the opening gate included) — DECLINED
  on currency.** It would ratify a 2026-08-07 ruling against a served line
  carrying nothing newer than **2026-08-05**, which is the failure kogaki#169
  was filed for, committed again. §10 carries the full reasoning.
- **A MECHANICAL carrier in the runtime — DECLINED at both scopes.** The
  proposal was to have `terrain/terrain.mjs` prove the relay, e.g. by minting a
  token at `cotags` and requiring it at the next call. The runtime can prove a
  token **was carried into the next call**; it cannot prove **the screen
  reached the owner's visible reply**, which is the property §2.4's positive
  limb is about. What it buys is therefore a proxy resting on the executor's
  own cooperation — an attestation that the attested party writes — and it
  would additionally make `cotags` and `report`, today **re-runnable read-only
  commands**, stateful. That cost is concrete rather than theoretical:
  kogaki#163's and kogaki#164's findings were **both reproduced by re-running
  `cotags` read-only** against an existing run record, which a stateful
  handshake would have prevented. Declined on the proxy and on the
  reproducibility loss together; **no runtime change is made by this
  amendment.**

**Disposition read under `policy/consultation-map.md` entry 3 (record
disposition).** The entry binds this amendment — it records two **declined**
alternatives, an **adopted** owner ruling, a **parking that still stands**
(§10) and a **reopen condition** — and its prescription was executed rather
than assumed. The gloss shard was surveyed headline-first and **read whole**
(343 lines), and **all four carriers were read WHOLE with their comments**
(`gh issue view 161 --comments`, and the same for 164, 166 and 162), because a
body-only read is the partial projection that satisfies a total-read rule
without discharging it. **The reads changed the amendment rather than
confirming it:** kogaki#161's own triage comment records the coupling and the
instruction that the amendment must record the ruling *against* §10's parking
"so §10's trigger history stays legible" — which is what §10's note does
rather than unparking — and kogaki#162's second comment establishes that the
fork half was deliberately excluded from story 1.32 and left to this group,
which is why §6.3 closes it. **No contradicting record was found on any
carrier.** The entry's own rider is honoured: `issue-pins --recheck` does
**not** discharge this read.

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 gloss/lessons/knowledge-architecture.md:1-343`

  request_id: 09346900-e0ff-40ed-8d65-47d86b447d0f
  outcome: discriminating
  query: gloss_index("lessons/knowledge-architecture") — entry 3's headline-first survey, read whole before this amendment's disposition reading was written.

The shard is cited at the range the call returned rather than at the lines
relied on, because the tool served it whole and a receipt naming only the
useful lines would report a narrower read than was performed. The lines relied
on within it are `:41` (a partial projection can satisfy a total-read rule),
`:197` (declare precedence per axis), and `:203` (declines travel with their
boundary) — the last is why both declines above carry their distinguishing
reason **on the same statement as the decline** rather than a line below it.

**A CURRENCY FINDING THIS AMENDMENT MUST RECORD, because it is the ground of
its own reduced scope.** The served hub HEAD has moved **again** since v6:
`0cb46066653ef3db2e33f69971829d25c06b6507` is now
`12ba65dde00031cf92a5d98da75c1ca608f2d1b7`. Re-verified **by content** at the
new HEAD: §10's refusal is still `topics/articles.md:95` (v6's correction
holds), and `topics/articles.md:80` still holds the Top-N withdrawal — so
**§11's two sites pinned `:79` remain wrong and remain kogaki#188's**, left
uncorrected here on purpose because §11 is another sitting's surface. One
further drift is recorded rather than repaired: the conjunction lesson is at
**`LESSONS.md:47`** at this HEAD, not `:46` as the sitting brief carried it —
found by content, and named because it is the same class one level down.

**What this clause does NOT claim.** Per §2.4's advisory-not-a-carrier
statement, this allowlist is enforced at no layer this repository owns. It
shrinks the free-form surface — which is the served prescription — and it does
not detect its own violation. A dogfood run remains the instrument.

## 7. GroupClaim-first rendering, and claim pinning

Selecting a co-tag group shows **the GroupClaim first**, then the member
Lessons. The claim is the composed "in common:" line — the plain-register
statement of what the members share.

**A claim composed over a member set is PINNED to that set.** A subset
selection **recomposes** the claim and **re-offers** it as a **gate event**,
never a silent refresh; the brief records the **adopted claim together with
the members it was composed from**.

> "A claim composed over a member set is PINNED to that set: a subset
> selection recomposes and re-offers it, and the brief records the adopted
> claim together with the members it was composed from. Keeping a group claim
> over a changed subset asserts commonality over absent members — a
> provenance lie — while discarding it throws away the only thing in the
> interaction the machine did not supply. … a derived expression's truth is
> relative to the set it was derived from, so the derivation carries that set
> and a change to the set is a GATE EVENT rather than a refresh."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

  request_id: a084f10b-b6e3-450c-a27e-407edba6839b
  outcome: discriminating
  query: GroupClaim composed over a member set is pinned to that set; subset selection recomposes and re-offers the claim as a gate event, never a silent refresh; the brief records the adopted claim with its members

Two riders travel with it, quoted at the same pin: the full-group claim
**survives only in the per-invocation rendering**, and a recomposed claim is
a **proposal** — the owner may keep the original wording, with the recorded
member set making the mismatch **legible rather than forbidden**.

The re-offer is a gate and therefore routes through the gate carrier
(manifest item 4), not through an affordance of Terrain's own — §4 is
unchanged and §1's refusal still binds.

**v3 rider (kogaki#128): the GroupClaim is composed AT the co-tag screen, for
every group, not only under a separate `claim` invocation.** v2 left claim
composition reachable only by naming one group, which is why the served
screen carried none. Two consequences, and neither weakens anything above:

- **Composing a claim for every group narrows nothing** and writes no record.
  §6's classification is unchanged — the screen stays NAVIGATION, and the
  no-record rule at `terrain/terrain.mjs:470-483` binds the composition too.
  A claim record is written only when the owner acts on a group, which is
  where pinning and the re-offer gate already live.
- **The pinning rule binds per group at screen scope.** Each screen-composed
  claim is pinned to the member set it was composed over, so a later subset
  selection is the same gate event this section already defines. Nothing here
  creates a second claim lifecycle; it moves the *first* composition earlier.

**The origin travels as an ARGUMENT, and the no-record rider stands** — v4,
kogaki#133. v3 moved claim composition to the screen and the screen writes no
record, while the re-offer's original-wording context was reachable only from
a claim *record*. So for exactly the claims v3 moved earlier, the owner would
have met a recomposed claim with nothing to compare it against — which the
governing line names as the failure, not a shortfall:

> "[[gate-input-surface-is-part-of-the-contract]] settles the presentation
> (machine-proposed proposal plus free-form override, never raw-artifact
> homework — **handing the owner a stale claim and expecting them to notice it
> no longer fits IS homework**) … a recomposed claim is a proposal, so an owner
> may keep the original wording with the recorded member set making the
> mismatch legible rather than forbidden."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:73`

  request_id: e743df88-b483-4669-a633-f6c2d4d6c99d
  outcome: discriminating
  query: A derived expression is composed at a surface that deliberately writes no record; a later change to its member set must re-offer it as a gate event carrying the original for comparison. How is the origin carried across a boundary where nothing is persisted?

**The mechanism is an argument, not a record.** The caller that composed the
screen's claims already holds their text; the re-offer takes the original
claim and its member set the same way it takes the claim text itself. So the
obligation is met **without reopening the "writes no record" rider** — the
served line binds what must reach the owner and leaves the transport open, and
the transport that requires no new persistence is the one that leaves §7's
navigation classification untouched.

**An origin that is genuinely absent is stated, never fabricated.** Where a
re-offer has no original — the first composition over a set — the gate says so
rather than presenting the recomposed wording as if it had one.

**A DERIVED origin member set announces itself as derived** — v5.1,
kogaki#145. Where an origin's wording is supplied but its member set is not,
the set may be taken from the group the claim was composed over: §6.1 composes
a GroupClaim over a group's **whole** member set, so that group's members
genuinely *are* a screen-composed origin's members, and requiring the caller to
restate a list it did not choose would be the raw-artifact homework §7's own
presentation clause refuses.

**What is forbidden is the substitution being silent.** A derived member set
and a recorded one are otherwise indistinguishable at the gate, and the owner
comparing a recomposed claim against its origin is comparing against something
whose provenance they cannot see. So the gate declaration **distinguishes the
two**, and the distinction is a written value rather than an omission:

> "When a consuming stage silently falls back to a substitute instead of
> requesting what an upstream stage produced … **make the fallback announce
> itself at the point of substitution, which is the only place the evidence
> still exists**."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:44`

> "an omitted field and a field reading `none` are the same silence to a reader
> and **completely different silences to a grep**"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:11`

  request_id: ab40dd58-b542-4faa-9f84-4c9b3a306431
  outcome: discriminating
  query: When a recorded field can be inferred from current state instead of supplied, should the inference be forbidden, allowed silently, or allowed but marked as inferred? Is a value that was derived rather than recorded distinguishable from one that was recorded?

**Forbidding the inference was the alternative and was declined**: it buys a
declaration containing nothing a machine derived, at the cost of ceremony on
every screen caller, and the served line asks for *announcement* rather than
*prohibition*.

## 8. Semantic subdivision — a judged substrate one level down

**This section replaces v1 §5's open slot.** v1 carried "Whether Kogaki's
Terrain ports it is not decided by this spec." It is decided here: **Kogaki's
Terrain ports it.** The slot is closed rather than deleted, and this sentence
is the record of the closure.

GroupClaim first, then **LLM-classified SubGroups each carrying its own
composed claim**, then the Lessons per SubGroup. It is **placement plus
title-derivation, hiding none** — the two acts the presentation-only
invariant already permits — and it is **not a cap**:

> "Subdivision is a **JUDGED SUBSTRATE APPLIED ONE LEVEL DOWN, not a cap**: a
> cap decides WHICH members appear, subdivision decides WHERE each appears
> and hides none."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:66`

**The leaf condition is CONJUNCTIVE.** A subgroup is a leaf when its claim
**composes honestly AND is tighter than its parent's**. Failing the first
means split further; failing the second means the split bought nothing —
stated conjunctively because a stop condition checking only degeneration
emits subgroups that merely restate the parent
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:70`).

**Two disclosures, disjunctive.** The **degenerate-claim** disclosure fires
when a claim trails into enumeration. It does **not** detect the reported
condition on its own, which is why the second half exists: the claim is
honest but **UNDISCRIMINATING at the size served** — "an honest summary true
of every member discriminates between none"
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:67`).

**Three instruments, three quantities, none a threshold.** 20% of placements
(relative share), the screen budget (rendering destination), and at-a-glance
legibility (absolute). The owner's "above ~4 members" is **calibration
evidence for where the undiscriminating-claim condition binds, never a
member-count threshold** — a count is a proxy for evidence, and the 20% cap
not firing on the reported group was evidence that it measures something
else, never that the group was fine
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:68`).
Terrain implements no member-count threshold. A number appearing in its code
as one is a defect against this paragraph.

**That prohibition is UNCARRIED, and this is its declaration rather than its
enforcement.** The sentence above is prose one layer up from where it can be
broken. `checks/check-terrain-composition.sh` declares three figure codes —
`FIGURE_NOT_OVER_PLACEMENTS`, `FIGURE_FAMILY_UNNAMED`, `FIGURE_MISMATCH` —
and **none of them observes a member-count threshold**. Nothing in this
repository detects one. So the rule as written is **advisory**, and calling
it a defect does not make it detectable: a prohibition stated in prose is
advisory to a system whose job is to satisfy instructions, and a rule is
enforced only at the layer where it can be broken.

**Why it is declared uncarried rather than given a check here.** The
governing rule admits exactly three states, and the third is this one:

> "A stated policy is admissible in exactly three states — decidable from the
> artifact an existing check inspects, shipped with a detector whose unit
> matches the property's unit, or **deliberately carrier-less and marked with
> a reopen trigger** — and the unit is derived from how the policy is
> violated, never inherited from the neighbouring gates."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:24`

State one fails: the figure codes inspect a survey record, and a threshold
lives in subdivision code, not in the record — the unit does not match, and
re-pointing a figure check at it would be inheriting the unit from the
neighbouring gate, which that same line forbids. State two is not taken here
because admitting a check is its own act with its own admission record
(contract, license, tier, measured runtime, removal signal) and this sitting
is not licensed to write one. So: **state three, declared.**

**Reopen trigger:** the first subdivision implementation that reaches review
carrying a numeric constant in its split or stop logic. At that point the
property has a violating artifact, its unit is known from how it was
violated, and a detector can be specified against a real specimen rather than
against an imagined one. Until then the carrier is the **review lane**, which
reads the judgment half — and a review lane is a reader, not a gate, which is
exactly the weakness being declared.

This is the shape kogaki#100 is this repository's live specimen of, named
here so v2 is not read as having closed it.

### 8.1 Measurement before offering — the rider that binds this section

**Subdivision ships dogfood-first. It is not offered until the owner has
verdicted its output.** The ordering is inherited, not invented here:
implemented → dogfooded → owner-verdicted → offered, the journey-similarity
precedent. **Co-tags stay the default for a run naming no substrate.**

> "Shipping a judged substrate ARRIVES at its offering gate rather than
> discharging it: merged code evidences existence, never the gate's standing.
> … shipping answers *does it run?*, the gate asks *does its output serve the
> owner better than what it replaces?* … the build half being done makes the
> gate DUE"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:53`

  request_id: 54ee141b-5343-467c-99e0-78626921ac69
  outcome: discriminating
  query: Subdivision leaf condition: claim composes honestly and is tighter than the parent; degenerate claim and undiscriminating claim disclosures; 20% of placements screen budget at-a-glance legibility instruments; offering measurement due

The hub-side offering gate is **undischarged**
(`product-lab:q_a/staging/2026-07-31-subdivision-offering-measurement-due.md`),
and Kogaki's reimplementation inherits the ordering rather than the
discharge. **Merging Kogaki's subdivision code does not discharge it either**
— that is the same lesson one repository over.

**The ordering RAN TO COMPLETION on Kogaki's own specimen, and its last step
is now DELIVERED** — v6, owner ruling 2026-08-07 (kogaki#168). Implemented
(§8's `subdivide`), dogfooded (2026-08-06 and 2026-08-07), owner-verdicted
(kogaki#168). §6.2's `deferred-slot: terrain-subdivision-offering-verdict` is
discharged there, where the slot was declared; this section records what that
discharge does to its own three sentences, because two of them would
otherwise be read as still denying it.

- **"It is not offered until the owner has verdicted its output" is
  SATISFIED, not weakened.** The verdict exists and its content is stronger
  than an offering: SubGroups are **REQUIRED**, so there is no flag left to
  offer and no default left to flip. The ordering was never a prohibition on
  arriving at its own last step — it was a prohibition on **skipping** to
  the last step, and nothing here skipped.
- **"Co-tags stay the default for a run naming no substrate" STANDS,
  entirely untouched.** That rider is about which **substrate** a run
  surveys — co-tags versus journey-similarity — and the hub carries it in
  its own right: *"the discharge licensed an OFFERING, not a promotion —
  co-tags remains the default for a run naming no substrate"*
  (`topics/articles.md:64`). **SubGroups render INSIDE a co-tag group**;
  requiring them decides nothing whatever about the substrate. A reading of
  kogaki#168 that promotes some other substrate to the default is a
  misreading of this section, and is refused here in advance.
- **The HUB-SIDE gate pointer stays NAMED, and is NOT claimed as discharged
  by this spec.** The staging pointer above remains as written. The hub
  re-pointed the offering measurement to Kogaki as the successor
  implementation on 2026-08-05 — *"the measurement is owed by kogaki#27's
  subdivision implementation and fires when that ships, not before"*, with
  the measure-before-offer **ordering surviving unchanged**
  (`topics/articles.md:9`) — so this consumer-side verdict is delivered
  against a measurement the hub itself routed here. **What Kogaki may do is
  record its own verdict; what it may not do is write the hub's record.**
  The gateway is read-only, so the disposition owed upstream is a
  **proposal staged through the hub's own intake**, not an edit made from
  this side, and it is **owed rather than done** as of this amendment. The
  conflict between the inherited never-default ordering and this
  consumer-side REQUIRE verdict is therefore **surfaced here rather than
  silently resolved**, exactly as kogaki#168 asks.

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/articles.md:9,54,64`

  request_id: d39e620d-aced-4dba-a84d-1ac7951163a7
  outcome: discriminating
  query: When a downstream owner delivers the verdict that a dogfood-first mechanism's output is REQUIRED rather than optional, does that discharge the inherited offering gate, or does the never-default ordering still stand?

**The line that settles the slot, quoted whole rather than in fragment.** The
hub did not leave the offering measurement unobservable when its original
implementation was archived — it **re-pointed it to Kogaki**:

> "**The semantic-subdivision OFFERING MEASUREMENT is RE-POINTED to Kogaki
> rather than declared unobservable … the measurement is owed by the
> SUCCESSOR implementation.** … the measure-before-offer ORDERING survives
> unchanged … and nothing about a repository archive discharges an ordering;
> the CALIBRATION DATA survives and is the re-point's whole value … the
> SPECIMEN does not survive, so the measurement is owed by kogaki#27's
> subdivision implementation and **fires when that ships, not before**."

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 topics/articles.md:9`

  request_id: 6d49edc3-e9bd-487b-b11c-6b9013c29661
  outcome: discriminating
  query: topic_thread("articles") — the decision thread read WHOLE (127 lines) so the offering-measurement re-point's boundary travels with it rather than being relied on as an excerpt.

The pin names `:9`, the line **relied on**; the call returned the thread whole
(`topics/articles.md:1-127`) and the query line above records that, because
what discharges the boundary-quoting duty here is the **whole read**, not the
one line. The pin-currency findings in this section — `:54`, `:80`, `:95` —
were all verified by content against that same read.

**Read whole, this line DISCHARGES the slot rather than re-pointing it
again**, and the distinction is worth stating because a fragment of it reads
the other way:

- Its "nothing … discharges an ordering" clause is scoped to a **repository
  archive**, not to an owner verdict. An archive is an accident of custody; a
  verdict is the ordering's own named step. The ordering survived the
  archive — and has now been *executed*, not bypassed.
- Its condition is **met, not pending**. The measurement "fires when that
  ships": Kogaki's subdivision implementation **has** shipped, it was
  dogfooded on 2026-08-06 and 2026-08-07, and the owner verdicted on
  2026-08-07. The line names Kogaki as the actor owing the measurement and
  Kogaki's owner is who delivered it.
- The **calibration data** the re-point exists to preserve is untouched by
  this amendment — no member-count threshold enters, per §8's standing rule.

So the slot is **discharged, not re-pointed a second time**. What remains
owed upstream is the *record* of that discharge in the hub, which is a
proposal through the hub's intake and is tracked as this sitting's one
deferred remainder — not a further deferral of the decision itself.

**Disposition read under `policy/consultation-map.md` entry 3 (record
disposition).** The entry binds this amendment — it records a **declined**
alternative, an **adopted** ruling, and clauses that **still stand** — and
its prescription was executed rather than assumed: the gloss shard was
surveyed headline-first, and **both carriers were read WHOLE with their
comments** (`gh issue view 167 --comments`, `gh issue view 168 --comments`),
because a body-only read is the partial projection that satisfies a total-read
rule without discharging it
(`gloss/lessons/knowledge-architecture.md:41`). The triage comments on both
issues state the fork as "whether `deferred-slot:
terrain-subdivision-offering-verdict` is discharged or re-pointed" and record
that no spec text was amended and no served position was leaned on — which
is consistent with, and not superseded by, what is written here. **No
contradicting record was found on either carrier.** The entry's own rider is
honoured in the finding above: `issue-pins --recheck` does **not** discharge
this read, and here it demonstrably did not.

`consulted: product-lab@0cb46066653ef3db2e33f69971829d25c06b6507 gloss/lessons/knowledge-architecture.md:1-343`

  request_id: 4c76a49b-6e16-4974-b596-f3cb72748a55
  outcome: discriminating
  query: gloss_index("lessons/knowledge-architecture") — entry 3's headline-first survey, read whole before the disposition was written.

The shard is cited at the range the call actually returned rather than at the
three lines relied on, because the tool served the shard whole and a receipt
naming only the useful lines would report a narrower read than was performed.
The lines relied on within it are `:41` (partial projection vs total read),
`:197` (precedence per axis), and `:203` (declines travel with their
boundary) — the last is why §2.4 entry 4 carries alternative (a)'s
distinguishing reason **on the same statement as the decline** rather than a
line below it.

**CURRENCY OF THE SERVED LINES THIS SECTION RESTS ON — checked at this
amendment, and recorded because the mechanism that would normally carry it
CANNOT SEE THIS.** `policy/kit/bin/issue-pins.mjs --recheck` returns
`ok: pins current` for both kogaki#167 and kogaki#168 by comparing SHAs. That
is not line liveness, and here the difference is demonstrable rather than
theoretical:

- **The served hub HEAD has MOVED** since this section was written:
  `f918c5158c718394b3a0e4f10239d75bbb451b74`, pinned above and at §6.1, is
  now `0cb46066653ef3db2e33f69971829d25c06b6507`.
- **The load-bearing line MOVED WITH IT.** The *"shipping a judged substrate
  ARRIVES at its offering gate"* quote is pinned above at
  `topics/articles.md:53`; at the served HEAD the same text is
  `topics/articles.md:54`. Same content, different line — and the recheck
  reported `pins current` straight across that move. **This is the gap
  kogaki#188 carries** (kogaki#169 is the nearest neighbour and is CLOSED, on
  a different question — a merge against a superseded declination — so it is
  named as kin rather than as this defect's carrier), **reproduced in this
  file**, and it is why the
  check below was done by content rather than by resolution.
- **No served line postdates the ruling this section records, and none was
  read as if it did.** The newest content in `topics/articles.md` is
  **2026-08-05** (the re-point at `:9`), and `GLOSSARY.md:234` still reads
  *"semantic subdivision adopted 2026-07-31 with its offering measurement
  outstanding"* at `updated: 2026-08-05`. The owner's ruling is **2026-08-07**
  — two days newer than anything served. **So the substrate cannot speak to
  kogaki#168 either way**: what is quoted from it here is the *ordering* the
  ruling completes, never a line endorsing or denying the ruling itself. The
  verdict is the owner's own and is carried, not derived.
- **A SECOND, WORSE INSTANCE was found by this check, and it is a resolving
  pin pointing at the wrong line.** §6.1's Top-N-withdrawal quote is pinned
  `topics/articles.md:79@f918c51`. At the served HEAD that text is **`:80`**,
  and **`:79` now holds an unrelated 2026-07-29 decision**. The pin therefore
  resolves cleanly to content that is not what it was cited for — which no
  resolution check can catch, since resolution is exactly what succeeds.
  **Three sites in this spec quote that line:** §6.1 (corrected in place at
  v6, with the original left standing as the record of what was read) and
  **two in §11**, at the co-tag-ORDERING bullet and the eager-versus-pull
  bullet, **left uncorrected here on purpose** — §11 is another sitting's
  open surface and silently editing its pins would be this same defect
  committed from the other side. Whoever next amends §11 corrects both to
  `:80` and re-reads by content; the carrier is named below.
- **A THIRD instance, in §10, found by another lane and repaired here.**
  §10's block-quoted refusal is pinned `topics/articles.md:94@f918c51`; at
  the served HEAD that refusal is **`:95`**, and `:94` holds an unrelated
  2026-07-28 decision. Corrected in place at §10, **verified by content
  rather than renumbered on trust** — which is the discipline this section
  exists to enforce, since renumbering on trust is how the second instance
  would have been "fixed" into a new wrong pin. The story-1.32 lane found it
  and could not repair it without colliding on this file; single-writer
  ownership is why it routed here rather than being fixed where it was found.
- **The general form, stated because three instances in one session is a
  class and not bad luck.** `--recheck` compares SHAs, so a pin can drift,
  resolve cleanly to the wrong content, and pass **every guard this
  repository has** — including the case where the carrier issue declares
  `consult: none`, which exits 0 without comparing anything. **A record that
  is well-formed and wrong is the shape none of these instruments can see**,
  and it is the same class as a reused `request_id` (a receipt that is
  well-formed and attests the wrong reading). The repair is not a better
  comparison of shas; it is reading by content at the moment a pin is relied
  on. This is carried as a defect with its own carrier rather than left as
  prose in a spec, because prose naming no actor produces no next action:
  **kogaki#188**, which also owns §11's two uncorrected sites. (kogaki#169,
  the nearest existing carrier, is CLOSED and covered a different question —
  a merge against a superseded declination — so it could not hold this.)
- **The precedence split, declared per axis rather than per artifact**, since
  the served surface discriminates it: *"A question like 'what's the status
  of this?' often has two halves answered by two different systems … If you
  write one rule for resolving disagreements, such as 'trust the more recent
  record', you hand one system the final word on facts it has no way to
  observe"* (`gloss/lessons/knowledge-architecture.md:197`,
  `declare-precedence-per-axis-not-per-artifact`). **The hub owns the
  ORDERING axis** — measure-before-offer, inherited and quoted here at its
  pin. **The owner owns the VERDICT axis** — whether the output serves. This
  amendment does **not** claim the 2026-08-07 ruling beats the substrate by
  being newer; the substrate has nothing to beat, because it never spoke to
  the verdict. Recency is why the substrate is *silent* here, never why it
  *loses*.
- **What this means for a later reader.** A recheck that returns
  `pins current` over this section is evidence about SHAs and not about
  whether these lines still say what they said, and — per §6.1's correction
  — not even evidence that a pin points at its own quote. Re-read
  `topics/articles.md:9,54,64,80,95` and `GLOSSARY.md:234` **by content**
  before relying on them, and expect their line numbers to have moved again.

**What this amendment leaves owed, named rather than implied:** §12's Full
Report contract is **not** reconciled with kogaki#168 — §12.1 still presents a
judge pin of `none` as a conformant peer, which under this ruling it is not
for a co-tag-generated report. Neither kogaki#167 nor kogaki#168 licenses §12,
so it is carved out to **kogaki#189** rather than fixed here. The skill-layer
half is **kogaki#183**, and the upstream record is **kogaki#185**.

### 8.2 The second-proposer boundary is unchanged by §§6–8

Grouping, claims and subdivision are **presentation** — placement plus
title-derivation. **Rank, trim and hide still route through manifest item
3's proposal contract**, and the >3-option trim guard at the selection gate
stands (`terrain/terrain.mjs` `MAX_STRAND_OPTIONS`). §2.3 is not weakened by
anything in §§5–9; a subdivision that ranked, trimmed or hid would have
committed §1's refused alternative under a new name.

## 9. Rendering — headlines, and every figure names its families

**This section folds kogaki#26.** Its defect specimen is live and reproduces
at this amendment's pin: the survey prints `agents (115)`, a bare count over
two families, which the owner read on 2026-08-05 as "WA showed ~50". The 115
is 59 Lessons + 56 Journeys.

**Gloss headlines per Strand.** A candidate row carries its **served Gloss
headline** — the plain-register one-liner — because a row of slug + family +
tags + cite is a navigation skeleton with no material, and the survey is
browsable only when the owner who cannot yet name a story can read what each
Strand *says*. Constraints that ride it, none of them new:

- **Served renderings only**, quoted at the pin the seam returned, never
  re-parsed from anywhere else (§3; the ELEMENTS manifest rule that consumers
  selecting over elements read the manifest and never re-parse the index).
- **Tag-scoped and bounded** — one shard pair per viewed tag
  (`gloss_index("lessons/<t>")`, and `journeys/<t>` where the mark needs it),
  addressed `<kind>/<tag>` and never `<tag>` alone. No fan-out, no
  whole-corpus prefetch.
- **Navigation semantics unchanged** — the enriched view still narrows
  nothing.
- **A missing Gloss rendering is an ABNORMAL condition, marked and never
  substituted.** It is a fault to clear, not a known gap to tolerate
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:111`).

**Every emitted figure names its families.** §2.1's rule — "A bare count is a
defect, not a terse rendering" — is not scoped to the completeness figure. It
binds **every figure Terrain emits**: section counts, view footers, co-tag
group counts, subgroup counts. `agents (115)` becomes
`agents (115 — 59 lessons + 56 journeys)`. Under §5 the candidate denominator
is Lessons, so a candidate-row figure names **Lessons** and the Journey half
appears as the coverage mark's own count; a figure spanning both families
names both. The mixed-family bare count is the "132 of 246" casualty shape
§2.1 quotes, and kogaki#26 is its live specimen.

**Screen 1's tag rows carry a declared ALLOWLIST, and a line class not on it
does not render** — v5, kogaki#147. Permitted on a tag row: **the tag name,
and the tag's Lesson count**. Nothing else is permitted until this allowlist
is amended. The 2026-08-06 dogfood specimen served a `placements` column
beside the Lesson column; the remedy is stated as an allowlist rather than
as that column's removal because an enumerated prohibition's non-member
fallback is admit — the shape rule is the hub's
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:45`),
and the screen form is the baseline's (wa#1138: *"the screen carries a
declared allowlist of line classes … and a line class not on it does not
render"*; wa#647/#802: the one count that survives on screen 1 is the
per-member count, which under §5's candidate model is the Lesson count).
**Scope:** this governs the per-tag rows only. The completeness figure stays
counted over placements and family-named (§2.1, hub-ratified), the survey
RECORD keeps its placement counts and per-section `by_family` (the
`FIGURE_MISMATCH` path below is untouched), and the family-naming example
earlier in this section is amended where it conflicts: a tag row's figure is
its Lesson count **and nothing else travels with it** — the Journey half is
carried on the **candidate rows**, by the coverage mark's own count per §5,
never on the tag row.

**That last clause is tightened rather than added** (v5.1, kogaki#154). Its
v5 form — "the Journey half carried by the coverage mark's own count per §5" —
was readable as a second figure travelling *with the tag row*, which is the one
reading the allowlist directly forbids: a tag row carries the tag name and the
Lesson count, and **nothing else is permitted**. A scope paragraph that can be
read against the rule it scopes is worth one token, because the ambiguity sits
in the sentence a reader reaches for when asking what a tag row may carry.

**Where the recomputation lives.** `terrain/terrain.mjs` already recomputes
`by_family` from the placements the figure claims to be counted over, and
refuses to write a record whose stored figure disagrees
(`FIGURE_MISMATCH`, `terrain/terrain.mjs:206-209,278,292`). Extending that
recomputation to section-level figures is the mechanism, and the refusal
stays **generation-time**: constrain generation, then detect what generation
cannot promise.

`deferred-slot: terrain-family-split-carrier`

**`deferred-slot: terrain-family-split-carrier` is FILLED** (owner decision
2026-08-06, kogaki#26/#27): **(a) — the per-section family split lives in the
RECORD.** `specs/spec-terrain/survey-schema.json` gains a per-section
`by_family`; the section figure is **recomputed from the placements it claims
to be counted over and refused on mismatch exactly as `completeness.by_family`
already is**, extending the existing `FIGURE_MISMATCH` path rather than adding
a second mechanism; `checks/check-terrain-composition.sh` inherits it.

**The slot asked** whether the per-section family split belongs in the survey
RECORD or only in the RENDERING. v2's first draft called it "an implementation
choice, declared as one here rather than left silent"; that was the defect
`specs/SPEC.md` §4's kogaki#48 clause names, and declaring a deferral is not
an exemption from naming it — an unnamed slot's decision escapes every gate
that binds to a decision document, which is precisely what "declared as an
implementation choice" would have let happen. Naming it was v2's repair. This
is the fill, and it lands **before** stories 1.22–1.25 embed either answer,
which is the ordering that clause exists to produce.

**The alternatives, recorded because a decision without them is an assertion:**

- **(a) In the RECORD — CHOSEN.** `survey-schema.json` gains a per-section
  `by_family`, the section figure is recomputed from placements and refused
  on mismatch exactly as `completeness.by_family` already is, and the check
  inherits it. Buys mechanical enforcement at the same layer the existing
  figure guarantee lives; costs a served-record shape change, which is a
  schema version and a conformance surface — priced against the code below,
  where it is smaller than that sentence reads.
- **(b) In the RENDERING only — DECLINED.** Sections carry no new field and
  the split is computed at print time from candidates already in the record.
  Buys no schema change; costs the generation-time refusal, because there is
  no stored figure to disagree with placements. The declining reason is
  stated below, and it is sharper than "degrades to detection".

**The grounds for (a).** The served surface discriminates toward the record on
four independent lines, and none of them favours the rendering:

> "A tool's config may hold copies of facts whose authority lives elsewhere
> only under a declared precedence rule (which side wins on mismatch) plus a
> mechanical mismatch check; a copy with declared, checkable subordination is
> conformance — a copy without one is a second authority growing in the dark."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 LESSONS.md:114`

(a) is exactly that shape: **placements authoritative, the stored section
figure subordinate, `FIGURE_MISMATCH` the mechanical check.** The reading is
not novel here — the hub has already ratified it for a derived rendering: "a
derived rendering is not a second authority … explicitly derived … and the sha
pin as the mechanical mismatch check. That is a copy with declared, checkable
subordination — conformance, which that lesson permits"
(`topics/archive/knowledge-architecture.md:72`). `LESSONS.md:87`
(carry-a-rule-at-its-violation-layer) sites it: a section figure is **created
at record-write**, which is the layer at which it can be wrong, so that is
where the guarantee belongs. And `LESSONS.md:42` supplies the measurement
clause — "a count owes its enumeration at the point of MEASUREMENT rather than
at the point of dispute" — which (a) satisfies by enumerating at composition
and (b) does not, enumerating at print.

**The counter-line, recorded rather than buried.** One served line points the
other way, and a fill that hid it would be the assertion this section refuses:

> "The access log is PRIMARY CAPTURE and a reader over it is permitted: the
> no-second-ledger rule forbids storing the DERIVED COUNT, never the record
> written at the act."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:19`

A per-section `by_family` **is** a derived count, so the tension is real. It is
answered by in-repo precedent rather than by re-reasoning:
`completeness.by_family` is the identical shape — a stored derived count over
the same placements — ratified at v1 (kogaki#14/#17) and already refused on
mismatch at `terrain/terrain.mjs:206-209,278`. Under (b) the record would be
**inconsistent with itself**: section figures unguarded while the completeness
figure beside them, counted over the same placements, is guarded.

**Why (b) is declined, stated at its real cost.** Under (b) the refusal does
not degrade to detection — **there is no detection either.**
`checks/check-terrain-composition.sh` reads only the record, so a section
figure that never enters the record is unobservable at every layer this
repository owns. (b) was therefore never the carrier-free option it appeared
to be: choosing it would have obliged this section to mark the rule
**deliberately carrier-less with a reopen trigger**, on the served three-state
rule —

> "A stated policy is admissible in exactly THREE states — per-artifact-
> decidable (state it), detector designed in (measure it), or deliberately
> carrier-less (mark it, with a reopen trigger) — and carrier-less BY OMISSION
> is the defect."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:52`

**(a)'s costs, measured against the code rather than estimated.** Measured at
41ad16a and recorded so a later reader does not re-inflate the price:

- `survey-schema.json` gains **one** mandatory field — `section_required`
  gains `by_family`.
- `"version": "1"` → `"2"` has **zero readers**: nothing in `terrain/` or
  `checks/` reads `schema["version"]`, so the bump is a label for humans and
  breaks no code path.
- **Zero records to migrate**: `find . -name '*.terrain-survey.json'` returns
  0, because real runs live in the machine-local run workspace and are never
  committed (`records_home.rationale`; `specs/SPEC.md` §4 rider 3).
- The conformance surface is **two files**, both under
  `checks/fixtures/terrain/conforming/`. The 13 nonconforming fixtures assert
  `expected in got`, so an additional `SECTION_MISSING_FIELD` alongside the
  code each one names does not fail it; they need no edit.
- **No new check is admitted**, so no admission record, tier, runtime figure
  or removal signal is owed.

**One claim below is corrected here rather than left to surprise the
implementer.** The closing clause says the check "inherits the extension
without a second copy". That holds for the **field lists**, which
`survey-schema.json` carries once and the check reads. It does **not** hold for
the **recompute algorithm**, which is already written twice —
`terrain/terrain.mjs:193-215` (JS, generation-time) and
`checks/check-terrain-composition.sh:146-163` (Python, merge-layer). (a)
extends **both**. The duplication predates this fill and is not created by it;
collapsing it is not licensed by this decision, and it is named so the next
reader meets it in the spec rather than in the diff.

**Story 1.22's dependent acceptance criterion UNBLOCKS as written** under (a),
and its BLOCKED markers are cleared citing this section.

The record changes, so the clause binds rather than being vacuous:
**`specs/spec-terrain/survey-schema.json` is the single carrier** — the check
reads those lists rather than restating them — and
`checks/check-terrain-composition.sh` inherits the extension of those lists
without a second copy, subject to the recompute-algorithm correction above.

## 10. Parked, with grounds — the Lessons-or-Decisions opening gate

**Parked, not decided, and not built.** A two-family entry gate offering
Lessons or Decisions at the opening screen is **new design owed its own spec
decision**. Its grounds are recorded here so a later sitting reopens them
rather than re-deriving them.

The hub **refused ratifying the exclusion** of decision material from the
entry surface:

> "Ratifying the exclusion is REFUSED: an entry screen structurally omitting
> 54% of served material is a **discovery failure, not an honest scope**. …
> the decision shards have addresses and screen 1 discloses nothing about
> them, so ratifying the exclusion would record a discovery failure as a
> design."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:94`

**PIN CORRECTION — v6, kogaki#167's currency check (third instance).** At the
served HEAD `0cb46066653ef3db2e33f69971829d25c06b6507` the refusal quoted
above is **`topics/articles.md:95`**, not `:94`; at that HEAD **`:94` holds a
different 2026-07-28 decision** (per-entry tags on decision renderings,
declined). **Verified by content, not renumbered on trust** — the text at
`:95` is the same refusal word for word, and the substance is unchanged: the
refusal is still served and still standing, so §10's parking is untouched.
The original sha-qualified pin is left standing as the accurate record of
what was read at `f918c51`; a reader at the new HEAD uses `:95`. Found by the
story-1.32 lane, which could not repair it without a collision on this file,
and repaired here. `issue-pins --recheck` exited 0 across this drift too.

  request_id: ef6835eb-a6ff-4054-b2d6-22b7e42cd3be
  outcome: discriminating
  query: Lessons-only candidate rows with Journey derived and marked by absence; excluding decision material from the entry surface refused as a discovery failure not an honest scope

**And declined both joins, and minted no umbrella** over Strand and
thread-line — deliberately, because a covering word is what let the
"132 of 246" figure be measured over Lessons ∪ Decisions and quoted into
decisions taken under a Lesson-or-Journey definition. A surface offering one
pooled selectable list would rebuild that hazard mechanically rather than
verbally
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:57`).

A two-family entry **gate** — two populations, never merged, chosen between
rather than pooled — is consistent with all three rulings. Consistency is not
ratification, which is why it is parked.

**Trigger:** it fires **after article creation from Lessons is working**, and
**never silently**. The trigger names an act that already happens (the first
completed article run from a Terrain selection) rather than a quantity
nothing measures.

**Note the standing tension this parking leaves open, rather than resolving
it:** §5 narrows the entry surface further, from Strands to Lessons, while
the served refusal above objects to an entry screen omitting material. §5.1
declares that divergence and §5.2 states its falsifiers; this parking is
where the *Decisions* half of the same objection waits. The two are recorded
adjacent deliberately — a later sitting reopening either should read both.

**AN OWNER RULING NOW EXISTS ON THIS GATE, AND IT IS RECORDED AS GROUND FOR A
LATER UNPARKING RATHER THAN APPLIED — v7, kogaki#161.** The 2026-08-07 dogfood
round produced an owner ruling directly on this parked design: *exactly one
question may be asked at the beginning, offering two choices — view **Lessons**
(the co-tag flow) or view **Decisions** (not yet implemented; choosing it
states so and stops).* **§10 is NOT unparked. The trigger above — "after
article creation from Lessons is working" — has NOT fired and is untouched.**
**kogaki#161's tag-selection ruling is carried only in PART, and saying so
precisely is what stops this note becoming an over-report.** §6.3 lands the
portion that falls **inside** the post-selection window — the second-tag
question and the "what next" question, kogaki#161's items 4 and 3. The
ruling's **own site is NOT carried**: item 2 is *"once Lessons is chosen, no
question UI may be launched for tag selection — the screen renders, and the
owner names a tag in chat"*, and that question sits at **the tag screen,
before any tag has been named**, which is outside §6.3's window by that
clause's own opening words. It is **withheld together with the opening gate**
and acquires **no carrier in this amendment**. Recorded at this length because
the risk here is the over-report rather than the gap: a later sitting reading
"the tag-selection half landed" would close kogaki#161 with an owner-ruled
prohibition still uncarried. The two reasons below are why the withheld
material is withheld.

**FIRST REASON — the ruling is newer than anything the substrate has said, and
ratifying it here would be ratifying a fresh ruling against a stale line.**
Measured at this amendment, by content rather than by resolution:

- The refusal this parking rests on is served at
  **`topics/articles.md:95`** and is dated **2026-07-28**. It still reads word
  for word as §10 quotes it, and it still stands.
- The newest decision line in that whole thread is **2026-08-05** (the
  offering-measurement re-point at `:9`). **Nothing served postdates
  2026-08-05 on this question**, while the owner's ruling is **2026-08-07**.
- The thread's own frontmatter reads **`updated: 2026-08-07`**, which is
  misleading in exactly the direction that causes the error: a reader checking
  freshness by the header would conclude the substrate had spoken as recently
  as the ruling, when its newest line on any subject is two days older.

So the substrate is **silent** on this gate, not supportive of it. Unparking
now would record a fresh ruling as though a served line had ratified it —
which is the failure kogaki#169 was filed for, and repeating it inside the
amendment that documents it would be the defect committed from the inside.
Recency is why the substrate is silent here, never why it would lose.

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 topics/articles.md:1-127`

  request_id: 717591ba-19a2-4a72-ad23-74ca7e7d35df
  outcome: discriminating
  query: topic_thread("articles") — the decision thread read WHOLE (127 lines) so the currency of §10's parking line travels with it rather than being asserted from an excerpt, and so the newest served date can be measured rather than taken from the frontmatter.

**SECOND REASON — the ruled gate satisfies ONE conjunct of the refusal's own
conjunction, and a full unparking would ratify half of it.** The refusal at
`:95` does not object generically; it invokes a named conjunction and says
which side failed:

> "`reachability-is-address-plus-discovery` holds that reachability is the
> conjunction of a resolving address and a surface that discloses it; **the
> decision shards have addresses and screen 1 discloses nothing about them**,
> so ratifying the exclusion would record a discovery failure as a design."

That lesson binds how this note must be written:

> "a fix satisfying one conjunct presents as discharging the whole rule,
> because it cites the rule accurately and the citation lends the untouched
> conjunct its air of completeness — so **a fix invoking a conjunction lesson
> must name which conjunct it establishes and name the one it leaves open**."

`consulted: product-lab@12ba65dde00031cf92a5d98da75c1ca608f2d1b7 LESSONS.md:47, topics/articles.md:95, topics/knowledge-architecture.md:165`

  request_id: 2f45fe3b-4827-4c3e-b08c-c5d3cf0da8af
  outcome: discriminating
  query: Is reachability the conjunction of a resolving address and a surface that discloses it, and must a fix invoking that conjunction name which conjunct it establishes and which it leaves open?

**Naming them, per that duty — and the conjunction is verified per BOUNDARY,
recursively**, which is what makes the naming exact rather than a formality:
*"the hub's tier-1 index and a consumer's screen 1 are the same kind of
surface at two boundaries … address + discovery applied independently at each
hop, verified by whoever owns that hop … decision shards passed every hub
conjunct and failed the consumer's"*
(`topics/knowledge-architecture.md:165`, same receipt as above). The hub's hop
is already whole; the hop this spec owns is Terrain's own entry surface, and
on **that** hop:

- **The conjunct the ruled gate ESTABLISHES: DISCOVERY.** An opening screen
  offering "view Decisions" as a named family is a surface that discloses the
  decision material exists, so screen 1 would no longer "disclose nothing
  about them" — which is the exact clause `:95` indicts. This is discovery and
  not some third property: *"`offered` is the SAME property as discovery and
  must not become a third conjunct"* (same pin), so the gate's offering is
  precisely the failing conjunct being repaired, not an adjacent improvement.
- **The conjunct it LEAVES OPEN: ADDRESS, at this hop.** The ruling builds no
  Decisions path — choosing it *"states so and stops"* by the ruling's own
  terms — so after the gate ships, **nothing at Terrain's boundary resolves to
  decision material.** The shards' hub-side addresses are untouched and remain
  established; what stays absent is a route from Terrain's own surface to
  them. A reader must not take `:95`'s "the decision shards have addresses" as
  discharging this: that sentence measures the **hub's** hop, and per `:165` no
  party can verify another's.

**So the honest summary is: the ruled gate would repair the consumer-side
DISCOVERY conjunct and would leave the consumer-side ADDRESS conjunct open.**
That is a real advance on the refusal and it is not a discharge of it. Recorded
this way so the sitting that unparks §10 inherits a stated remainder rather
than a citation that reads as complete.

**What a later unparking therefore owes**, named so it is an act rather than a
mood: (1) the trigger above fires — article creation from Lessons is working;
(2) a served line dated after 2026-08-05 speaks to the two-family entry gate,
or the owner ratifies knowingly against a silent substrate and the amendment
says so; and (3) the amendment names the **address** conjunct's disposition —
either a Decisions path that resolves, or an explicit record that the gate
ships with discovery established and address still open. Absent (3), the
unparking would be the half-conjunction ratification this note exists to
prevent.

## 11. Open — carried as questions, never as contract

**THE `compose-input` SESSION-COMPLIANCE SLOT IS FILLED, AND IT LEAVES THIS
SECTION** — v9, owner selection 2026-08-07 (kogaki#212). The slot was deferred
by PR #198 and, with kogaki#183 and kogaki#194 both CLOSED, its only home was a
merged PR body — which no lane enumerates and no trigger can read. That is
carrier-less **by omission**, which `LESSONS.md:26` names as the defect rather
than as one of the three admissible end states. This paragraph is the ruling
that ends it.

**The property, stated exactly.** `.claude/skills/terrain/SKILL.md:195` carries
the hard line *"Compose from `compose-input`, never from the whole survey"*, and
nothing observes whether a live session obeyed it. `cmdCotags` accepts
`--survey`, `--tag`, `--claims`, `--subdivisions` and `--connective`
(`terrain/terrain.mjs:575-591`) and records nothing about **how** the claims
were composed; `checks/check-terrain-composition.sh` exercises `cotags` end to
end and observes only its outputs. So the rule lives entirely in instruction
text, which is advisory to something whose job is to satisfy instructions.

**THE RESOLUTION: a `cotags` refusal keyed to the composition input, bound by
CONTENT rather than by presence.** `compose-input` emits a **composition pin**
beside its bounded read — the tag, the survey record's pin, and **the member set
it served, per group** — and `cotags --claims` requires that pin and refuses
when the claims' group/member set is not a subset of what the pin covers,
**naming the members that fall outside it**.

**v10 — THE MECHANISM IS CORRECTED, AND THE PROPERTY IS WHAT SURVIVES**
(kogaki#212, owner selection 2026-08-07). v9 wrote this clause as "a **digest**
of the member set it served" while requiring, in the same sentence, a refusal on
**subset** — and story 1.39 AC3 requires that refusal to **name the offending
members**. A digest supports **equality**, not subset, and can name no offender:
the mechanism this section named could not deliver the property this section
states. The prior wording is quoted here rather than edited away, because a
reader holding v9 must find the disposition rather than an absence.

The served surface decides which half gives way:

> "When a rule states both a property and the mechanism that currently delivers
> it, it must say **which is load-bearing** — otherwise the mechanism silently
> becomes the rule, and later work that would preserve the property by a better
> carrier reads as a violation; the test is not whether the mechanism is named
> but **what work the naming does**, so consult the rationale, not the
> phrasing."

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:86`
  request_id: 7f79869e-e808-4ae9-b377-063490be7de9
  outcome: discriminating
  query: a guard required to name which elements violated it cannot be built on a hash of the set — what must the evidence carry

This section's **rationale** is stated two paragraphs down and is unambiguous:
composing outside the bounded read must become **unproducible** rather than
discouraged. The digest was the *mechanism* named to carry that, so the digest
is what gives way. **Trimming the property to fit it — re-cutting the refusal
from subset to equality — was the declined alternative**, and it is declined on
more than symmetry: equality forbids a legitimate act, since composing claims
for a **subset** of the served groups is normal work, so an equality guard would
push composers back toward all-or-nothing. A per-group **digest** was also
declined: it detects that a group's membership changed and still cannot say
**which** member is outside the bounded read, so it meets AC3's detection half
and abandons its naming half.

**The correction costs no new computation.** `composeInput` already emits
`groups: [{ name, cotag, members }]`, so the member set is assembled before the
pin is written; only the pin's **shape** changes. What it costs is size — one id
list per group rather than one hash — and that is stated rather than discovered.

**THE CARRIER: the claims artifact becomes a TYPED RECORD** (kogaki#212, owner
selection 2026-08-07). v9 required a composition pin to *accompany* the claims
and never said **where it lives**, while the claims file is a flat
`{group: claim}` map with nowhere to put one — an unnamed deferral inside a
section that declared `deferred slots: none`. It is named and filled here:

    {
      "composition_pin": { "tag": "<T>", "pin": "<survey record pin>",
                           "groups": { "<T> × architecture": ["lesson:…", …] } },
      "claims": { "<T> × architecture": "…" }
    }

It mirrors §12.1 v9's typed subdivision record, so both composed inputs carry
one shape rule learned once, and **claim and provenance travel in one artifact**:
a pin in a separate file can go stale relative to the claims beside it, and
nothing in the tool would catch that. The declined alternative — a separate
`--composition-pin` flag — needs no format change at all and is genuinely
smaller, and it permits exactly that separation, which is the same
existence-versus-standing gap the subset check exists to close, moved one file
over.

**A bare `{group: claim}` map is refused BY NAME**, as §12.1 v9 refuses the
withdrawn bare array, so a stale composer fails loudly rather than silently.

**Three obligations ride with this, because it is a second breaking format
change to a composed input.** *"The population that gains the new field is the
population whose parse changes"* — so the implementing sitting owes a boundary
fixture in **both** directions (a conformant record accepted; a non-subset
refused with the offending members **named**), the bare-map refusal by name, and
a **measured** count of existing claims artifacts the change breaks, or a stated
zero.

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:45`

**Scope boundary, so the implementing sitting does not widen:** `--subdivisions`
arguably wants the same symmetry and is **out of scope** — kogaki#212 licenses
the composition-input carrier, not a general re-typing of every composed input.
§12.1 v9 already gave `--subdivisions` its own typed form for its own reason.

**Why content and not presence, which is the whole of the design.** A stamp
asserting only that `compose-input` *ran* is satisfiable by a session that runs
it, takes the stamp, and composes from the whole survey anyway. That is
existence evidence standing in for standing:

> "Mechanical existence evidence — merged stories, files on disk, a green log —
> is local, self-evidencing, free to retrieve and terminal-looking, while the
> standing of what was built … lives in non-local prose reached only by
> protocol"

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:63`

Binding the **subset relation** closes it: composing outside the bounded read
becomes unproducible rather than discouraged, which is the ratified shape:

> "constrain what the pipeline can **PRODUCE** rather than … improve what it
> can **DETECT** — an enumerated prohibition can only name yesterday's leak
> while a construction constraint makes tomorrow's unreachable"

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:47`

**Both lines above are v1 receipts, and the reason is stated rather than left
to look like an omission** (PR #213 round-1). This section's sitting issued **no
gateway call of its own**: `LESSONS.md:47` and `LESSONS.md:63` were surfaced by
the call recorded in §12.1 (`request_id: 9e835f18-de01-4579-ab88-b5751a003103`),
made for kogaki#199's encoding fork, and were re-read there rather than
re-queried here. Copying that call's `request_id` and `query:` down to this
section would attach kogaki#199's framing to kogaki#212's decision — a receipt
asserting that a question was asked about this fork when it was not. A v1
receipt is valid; a misattributed v2 receipt is worse than none.

**The two declined alternatives, with grounds.**

- **A cross-run observer at a different unit — DECLINED.** Its case was real
  and is recorded: the property genuinely *is* flow-level, about how a session
  behaved across many calls, and `LESSONS.md:26`'s own rule is that the
  detector's unit must match the property's. A read-count observer over the
  gateway access record would match it exactly, flagging the unbounded shape
  against the bounded one. Declined because it is **detection where a
  construction constraint is available**, which `LESSONS.md:47` rules against
  directly; because it needs cross-run state this repository has consistently
  declined; and because its threshold would have to be calibrated on figures
  (131 reads / ~19 min against 4 reads / 2 min 23 s at 172 placements) that
  kogaki#212 explicitly **relays rather than re-measures** and does not stand
  behind.
- **A ratified carrier-less marking with a reopen trigger — DECLINED, and
  genuinely admissible.** `LESSONS.md:26` names it as one of three legitimate
  end states, and adopting it would still have been a real change, moving the
  item from carrier-less-by-omission to carrier-less-by-ruling. Declined
  because a constrain-shaped remedy sits one subcommand's argument validation
  away, and ruling that no carrier is possible while one is reachable is the
  shape refused at
  `consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/claude-code-ops.md:40`
  — *"no carrier is possible* is admissible only as *no carrier is possible in
  configuration X*, with X named".

**The original trigger is DISCHARGED, not kept.** It read *"the next Terrain
dogfood round that composes without the artifact, or any sitting licensing a
change to `cotags`' argument validation"* — and this sitting **is** the second
limb: it licenses exactly that change. A trigger whose condition has fired is
discharged by acting, never re-armed.

**This REVERSES kogaki#212's own reading, and the reversal is named rather
than quietly reconciled** (PR #213 round-1 nit). The issue body rules the
opposite in as many words — *"That trigger is **kept**, and this issue is what
makes it readable"* — which was correct when written, because at filing time no
sitting had yet licensed the change the second limb names. This sitting is that
sitting, so the later verdict wins and the superseded reading is stated here
rather than left for a reader holding the issue to discover as a contradiction.
`policy/consultation-map.md` entry 3's served line asks for exactly this: when
they conflict the later verdict wins **and the conflict is reported**.

**A scheduling edge is stated here and written to no `depends_on`.** The story
this decomposes to edits `terrain/terrain.mjs` and
`.claude/skills/terrain/SKILL.md`, which kogaki#199's story 1.37 also edits —
different subcommands (`cotags`/`compose-input` against `report`), the same
files. And **kogaki#205 edits this very section (§11)** to correct its two
`topics/articles.md:79` pins to `:80`. Neither is a dependency; both are
ordering facts for whichever lane runs second.

**PIN CORRECTION — §11's two Top-N sites, corrected BY CONTENT** (v10,
kogaki#205). The ordering bullet and the eager-vs-pulled bullet above both
quoted the served **Top-N withdrawal** line and both pinned it at
`topics/articles.md:79@f918c51`. That was the last uncorrected instance of the
drift §6.1, §8.1 and §10 already carry blocks for: those sections enumerated
these two sites and left them standing, and kogaki#188 assigned the repair to
"whichever sitting next holds §11" — a sitting, which is not a carrier, which
is why kogaki#205 exists.

**Re-read at the served head rather than renumbered on trust.** At
`product-lab@98195e0aef221aa82c47bb632324127745469f2e`:

- **`:80`** holds the Top-N withdrawal — *"Top-N is WITHDRAWN and the compact
  all-groups form replaces it"* — and carries **both** phrases the two bullets
  quote: *"sorted descending by member count"* and *"the owner pulling a Full
  Report per named group"*.
- **`:79`** holds a **different 2026-07-29 decision**, the co-tag
  second-navigation-step adoption.

So the old pins **still resolved, and resolved to the wrong line** — the
dangerous form, because resolution checking is exactly what succeeds on it, and
`--recheck` reported `ok: pins current` across it before kogaki#188 taught it to
compare content.

**The old pin is recorded here rather than edited away**, so a reader holding
`topics/articles.md:79@f918c51` finds the disposition rather than an absence —
the same duty §6.1's block discharges, and the reason that block leaves its own
original standing.

**Each corrected pin carries its stored quote hash**, so the next relocation is
caught mechanically rather than by another manual currency sweep. Emitted with
`policy/kit/bin/issue-pins.mjs --emit-pin-quotes` at the head above:

pin-quote: topics/articles.md:80@98195e0 q1:bb4d672787a22b82

Recorded beside it, because it is what makes the correction checkable rather
than asserted: the superseded line hashes to `q1:12827f4b86bc9271` at the same
head, a different value, which is the mechanical statement that `:79` and `:80`
are not the same text.

  request_id: 62918f1c-bd6e-4b7c-a983-cb6394ef466a
  outcome: discriminating
  query: topics/articles.md:79 and :80 read at the served head to confirm by content which line holds the Top-N withdrawal the two §11 bullets quote

**Consultation-map entry 3's survey covers this section and §12.1** (PR #213
round-1 finding). Both amendments adopt a record as the live word on a
decision's disposition — this one rules kogaki#212's own "trigger kept" reading
superseded, and §12.1 rules the runtime's judged-empty behaviour
non-conformant — which is entry 3's act class. The survey is recorded once, at
`specs/SPEC.md` §4 condition 5, with its `request_id`, both halves run
(headline-first over all 56 `knowledge-architecture` headlines, and the
carriers read whole with `--comments`), and its result: **no record superseding
any of the four dispositions exists.** It is cited here rather than duplicated,
because a receipt copied to a second site is a second assertion that a second
call was made.

**deferred slots: none.**

---

- **The completeness figure's rendering position.** The served material
  reports a specced burial: a contract that sorts output into buckets makes
  an editorial judgment about reader priority, and the bucket names hide it
  (`consulted: product-lab@924cce3b5fd2b3b17f906caa2b0c2f6a332003a6 topics/claude-code-ops.md:15`).
  Whether the figure takes a fixed first-position line is undecided here.
- **Whether "sort" can narrow in practice.** §2.3 places sort under
  navigation. Whether a stable sort over a truncated view narrows the
  candidate set is cannot-determine — no served position was found on it, and
  it is not asserted either way.
- **Semantic subdivision within a group** — *this slot is CLOSED by §8.* The
  v1 text read "Whether Kogaki's Terrain ports it is not decided by this
  spec"; v2 decides it. The bullet is kept as a pointer rather than removed,
  so a reader holding v1 finds the disposition rather than an absence.
- **The co-tag group ORDERING** (v3, kogaki#128). The served surface orders
  groups "sorted descending by member count"
  (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/articles.md:80`),
  while Kogaki's shipped `COTAG_SORT` declares "co-tag name ascending, then
  member id ascending" (`terrain/terrain.mjs:486`), adopted under §6. Both are
  declared deterministic sorts and both are admitted as navigation, so neither
  is a violation; which one Kogaki serves is **undecided here**. kogaki#128
  raises the screen's *composition* and not its ordering, and deciding an
  unasked question inside another issue's sitting is how a decision escapes
  the gate that should have carried it. Reopen at the next Terrain sitting, or
  when a dogfood run reports the ordering as a defect.
- **DISCHARGED — v5, owner decision kogaki#314, 2026-08-09, executed
  2026-08-11. PULL wins, and the unit is an ENTERED ID SET.** The owner selects
  a co-tag, reads the screen, and enters a set of Group and/or SubGroup IDs;
  **one** Full Report is generated covering exactly those. Eager
  one-report-per-composed-group is superseded.

  **The reopen trigger below never fired, and closing the fork anyway is
  legitimate rather than a shortcut.** The trigger — "the first Terrain run
  that generates two or more Full Reports in one sitting" — names the act on
  which the two readings first diverge *observably*. An owner ruling is a
  different and stronger discharge than an observation: the trigger existed to
  produce evidence for a decision, and the decision arrived without it. The
  2026-08-09 hands-on round (11 groups on one screen) is in fact exactly the
  state the trigger anticipated, so the evidence and the ruling agree; what did
  not happen is the mechanical firing. Recorded so a reader holding the trigger
  finds the disposition rather than an absence — the same duty the bullet was
  written to discharge in the other direction.

  **What the divergence-carrying text below said, kept as provenance:**

- ~~**Whether a Full Report is generated EAGERLY per co-tag view or PULLED on
  demand**~~ (v3, kogaki#129). kogaki#129 licenses "every co-tag view" producing
  one; the served line §12 leans on describes "the owner **pulling** a Full
  Report per named group"
  (`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/articles.md:80`).
  **Both satisfy §12 in full** — its content, identity, classification and
  location rules are indifferent to when generation fires — so neither is a
  violation and the divergence is not a defect. It is carried here rather than
  only as a story question so that a reader holding kogaki#129 and reading §12
  finds the disposition rather than an absence, which is the same duty the
  ordering bullet above discharges. The implementer states which they built,
  in the PR.
  **Reopen trigger** (v4, kogaki#131): the **first Terrain run that generates
  two or more Full Reports in one sitting**. That is the act on which the two
  readings first diverge observably — under *pull* the count matches the groups
  the owner named, under *eager* it matches the groups on the screen — and it
  is an act that already happens rather than a periodic reader.
  The trigger is stated because a bullet carrying neither a decision nor a
  trigger is carrier-less by omission, which is the named defect:
  "A stated policy is admissible in exactly THREE states — per-artifact-decidable
  (state it), detector designed in (measure it), or **deliberately carrier-less
  (mark it, with a reopen trigger)** — and carrier-less BY OMISSION is the
  defect"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:52`).
  **Instrument:** the report count a generating run produces.
  **The trigger becomes LIVE when story 1.30 merges, and is DEAD until then**
  (v4.1, kogaki#131) — §12's own defect specimen is that no run produces a
  report at all today, so the instrument has no writer and the trigger cannot
  fire however well-formed it is. Stated rather than left implicit, because a
  trigger that is dead for a reason nobody wrote down is indistinguishable from
  one that is live and simply has not fired: "a safeguard can be merged,
  correctly placed, and completely dead, because something it depends on is
  never produced by anything"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/lessons/testing.md:11`).
  **The discharging act is story 1.30's own PR** (v4.2, kogaki#131): the
  sitting that merges 1.30 re-reads this bullet and flips it live. Naming the
  event without naming what observes it would leave the flip to nobody —
  "postponing a decision until some event happens works only if something
  notices the event"
  (`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 gloss/INDEX.md:53`)
  — which is the carrier-less-by-omission shape this bullet's own
  admissibility argument refuses, one level down.
  **DECIDED — v5, kogaki#146: EAGER.** The co-tag view generates the Full
  Report per composed group; the owner ruled it 2026-08-06 after the first
  dogfood run under story 1.30's merge produced none. This is a **declared
  divergence from the WA baseline** (§2.4 entry 3 — WA's owner pulls per
  named group, wa#938), and it supersedes the fork rather than winning it:
  both readings satisfied §12, and the owner chose. Two carrier notes,
  recorded so the trigger's history stays legible: (1) story 1.30's merge
  sitting (PR #140) built the pull shape and did **not** flip this bullet's
  trigger live as v4.2 required — that omission is repaired here by the
  decision making the trigger moot; (2) the trigger is **closed as spent**,
  not left armed: with eager decided, a multi-report sitting is the
  specified behaviour and observes nothing. **Siting:** the runtime carries
  generation for every composed group (`report --all-groups`); the flow's
  co-tag step invokes it in the same act as the screen, and
  `.claude/skills/terrain/SKILL.md` states it. §12's content, identity and
  location rules are indifferent to this timing and are unchanged.

- **OPEN (v12, kogaki#289): is `projects:` a fourth neighborhood substrate?**
  §13.2 fixes the substrate set at three because kogaki#289's adopted riders
  fixed it at three. The measurement taken for §13.3 found a fourth field
  present on every lesson record and carrying exactly the kind of link the
  other three carry — `"projects": ["product-lab", "writing-assistant",
  "tanuki"]` at `gloss/ELEMENTS.jsonl:8`, and `["kogaki"]` at
  `gloss/ELEMENTS.jsonl:41`
  (`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/ELEMENTS.jsonl:8,41`).
  It is **not adopted here** and the reason is a boundary rather than an
  oversight: `projects:` is already load-bearing as **harvest scope** in the
  evidence model ("repositories are harvest SCOPE (the union of the thesis's
  Strands' `projects:`) and never evidence binding",
  `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:97`),
  so recruiting it as a *relevance* substrate would give one field two jobs
  across two subsystems, which is the shape that ruling declines one level up.
  Carried as a question, never as contract, per this section's own rule.
  **Its trigger is §13.5's dogfooding gate** — a recorded miss whose Grain
  shares only `projects:` with the candidate set is what would decide it, and
  that is an observation rather than a date.

## 12. The Full Report — untruncated material, keyed to what produced it

**This section folds kogaki#129**, and it is the other half of §6.1: the
screen is compact only because this artifact exists. Its defect specimen is
an absence — the 2026-08-06 dogfooding run produced no report artifact
anywhere in the flow.

**What it is.** For a co-tag view, the **untruncated** material: GroupClaim
and SubGroupClaim in full, and the complete Lesson and Journey Glosses, with
**no truncation anywhere**. It is what the owner reads to think a Thesis
through, where §6.1's screen is what they navigate.

**When it is generated: on the owner's ID entry, one report per entered set**
— v6, owner decision kogaki#314, executed 2026-08-11. This supersedes the v5
eager-per-composed-group form below; a report may now span several Groups
and/or SubGroups, and "one per composed group" no longer holds.

**THE IDENTITY'S QUERY COMPONENT BECOMES `{ tag, ids }`, AND THE ID LIST IS
CANONICAL.** §12.1's uniform arity is unchanged; what changes is the second
component, from a named group to the entered set. The set is **sorted before
it enters the identity**, so re-entering the same IDs in a different order is
**one artifact, not two** — idempotence is set-based, which is what makes a
re-request of the same material return the same report rather than a second
one. The rendering follows the same canonical order.

**THE MULTI-SECTION FORM — what appears ONCE and what repeats** (v7, owner
decision 2026-08-11, the fork the v6 sitting left open). v6 granted that a
report may span several Groups and/or SubGroups and did not say what that
looks like; the `full_report` line classes were all singular, so the
implementation reached the point of having to invent one and stopped instead
(story 1.58, altitude discipline). This clause is what it was waiting for.

```text
# Full Report — <tag>                      ← title: the TAG, not an id
*Selected tag:* `<tag>`
*Selections:* <canonical id list>          ← the entered set, in the identity
*Substrate pin:* `<pin>`                   ← ONCE (§12 v12)
*Judge:* <judge pin>
> preamble

## <id> — <name>                           ← ONE SECTION PER ENTERED ID
in common: <claim>
  … its SubGroups and/or members …

## <id> — <name>
  …

## Counted                                 ← ONCE, aggregated over the set
## Served lines                            ← ONCE, merged and DEDUPED
## Provenance neighborhood                 ← ONCE, seeded by the entered set
```

**Once, and why each:**
- **The identity block**, including the pin. §12 v12 states the pin exactly
  once per file, and a per-section identity would multiply it by the set size —
  reintroducing the defect kogaki#315 filed and this section repaired twice.
- **`## Counted`**, aggregated over the whole set. The cost is stated: a
  per-section count is not shown.
- **`## Served lines`**, merged and **deduped**. A member entered under both
  `G5` and `G5-1` appears in the map once. A repeated map is the class
  kogaki#315 named unjustified, and deduping is what keeps the merge honest
  rather than merely shorter.
- **`## Provenance neighborhood`** (v8, kogaki#472), seeded by the entered ID
  set and aggregated over it. §13 governs its contents entirely; what §12 fixes
  is only that it is **one** section rather than one per entered id, and that it
  comes **last**. Once, for §13.3's own reason: the traversal walks the union of
  the entered set's members, and a per-section neighborhood would re-walk shared
  batches and render the same suggestion under several headings — the
  double-count §13.4 obligation 4 admits *within* a family for a genuine second
  substrate, arriving here as an artifact of layout instead. Last, because it is
  the one part of the file that is **not** the material the owner entered ids to
  read: §13.1 calls it a view *beside* the candidate set, and putting it after
  the served-lines map keeps the report's own pins contiguous with the report's
  own material. **It renders even when empty** — §13.4's disclosure discipline,
  and the same rule `## Counted` already follows.

**Repeating: the sections, one per entered id, keyed by the id.** A section's
heading carries its id and its name, which is what lets an owner match a
section to what they typed.

**The title names the TAG, never the ids.** `# Full Report — agents`, with the
entered set on its own `*Selections:*` line in the identity block. Two grounds:
the title stays short and stable however many ids are entered, on a surface
whose recent history is entirely about wrapping destroying structure
(kogaki#317); and the ids belong in the identity block, which is where §12.1
already says the recorded components live. *Declined:* ids in the title (five
ids wrap), and a count in the title (two different two-id reports would share
a title, the collision the ids were minted to prevent).

**THE SORT IS NUMERIC-AWARE, and this is stated because plain string order
gets it wrong.** `G5-1` sorts before `G10`, not after: lexicographically
`"G10" < "G5-1"`, which would render a screen's tenth group above its fifth.
Compare on the numeric components (`G<n>` then `-<m>`), never on the raw
string.

**What the owner gives up, stated rather than discovered:** section order is
the canonical order and not the entry order. An owner who wants a particular
reading order cannot get it by typing the IDs in that order. The alternative —
order-carrying identity — was declined because it makes two typings of the same
set two artifacts; and recording order separately while keying identity on the
set was declined outright, because it breaks §12.1: two runs would share an
identity and produce different bytes.

**The superseded v5 form, kept as provenance:**

~~**When it is generated: at the co-tag view, eagerly, one per composed
group**~~ — v5, kogaki#146, §11's decided bullet. Generation is idempotent
per §12.1's identity, so the eager pass and a later re-request are the same
artifact. The report renders the shared substrate pin **once**, in its
identity, and carries the member → served-line map in its member records —
the pin-once siting §6.1's v5 withdrawal moved here (wa#1115/#1116).

**v12 — THE MAP IS SITED ONCE AT THE REPORT'S END AND ITS ROWS ARE BARE**
(kogaki#315, owner decision recorded 2026-08-09, executed 2026-08-11 coupled
with kogaki#317). Two clauses of this section were in genuine conflict, and
the resolution keeps both rather than choosing between them.

*The conflict.* This section **requires** the report to carry the map, and
line 805's baseline sites it "at the report's end". kogaki#315's owner ruling
states the pin appears **exactly once per file** and names "Served Lines
(`gloss/ELEMENTS.jsonl:86@<pin>`) beside a plain LessonID" as **exactly the
unjustified class**. A map whose every row carries `@<pin>` satisfies the
first and violates the second.

*The resolution.* The map **stays** — it is what lets a reader check the
rendering against the substrate without opening the machine record, which is
why this section requires it, and that requirement is the explicit
justification kogaki#315's justification obligation demands. Its rows render
**bare `file:line`**, and the Gloss cite rows do too. The pin is stated once,
in the identity, which is kogaki#315's own phrasing: *"pin once in the
identity and a bare `file:line` map, sited once."*

*Recorded because a relocation reads as a fix and is not one.* Story 1.53
(2026-08-11) removed the per-member `*Served line:*` row and re-sited the map
at the report's end **carrying the pin with it**. Counted on the committed
specimen, a two-member report held six pin-bearing lines before that change
and six after: one identity line, three Gloss cites, two rows. Same count,
different siting. The defect kogaki#315 filed on 2026-08-09 was never
addressed by that work, and this clause is where it is.

*And the registered rule cannot see it, which is stated rather than widened.*
`pin_once_per_file` in `report-format.json` counts occurrences of the
`substrate_pin` **line class**, so it read 1 and passed against all six. v3
removes the other five by making those classes render bare, so rule and
contract now agree **on this surface** — they agree because the emitters
changed, not because the rule was widened, and a future line class that
embeds a pin re-opens the gap silently.

**A report RECORDS its own identity, and this is a requirement rather than an
implication** — v4.1, kogaki#131. Every Full Report carries, in its own
content, the **substrate pin**, the **selected tag**, the **named group**, and
the **judge pin** — which on a report generated at the co-tag view is
**always a real judge pin and never `none`** (§12.1's kogaki#168
reconciliation, below), while `none` remains the typed value the component
takes in the key space, per §12.1's uniform arity, so the recorded set is the
key exactly and never a subset of it. Without this
clause the artifact is unresolvable: §12.1 states identity as a *property* of
a report rather than an obligation to record one, and §12.2 forbids the only
other source — "nothing may read meaning out of [the filename], parse it to
recover the triple, or key on it — the report's own recorded pin, query and
judge pin are the only source of that." An implementer could satisfy every other clause here
and emit reports that no request could ever resolve to, which is the
`establish-the-substrate-before-reporting` shape: the artifact would agree with
everything and be founded on nothing.

**It is a REPORT, and therefore not a choice.** It ranks nothing, narrows
nothing, and hides nothing, so it sits in neither act list and the runtime
writes it as a report — §2.3 and `record-schema.json`'s act classification are
untouched. Nothing that reaches the owner through it is smaller than what
exists.

**It is a RENDERING, and therefore not an address.** This is the constraint
that governs what may key on it:

> "the Full Report is a RENDERING, not an address"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:71`

> "A G-id may be accepted at the screen that defined it and expands
> immediately to member ids, but the brief records members and pins, never a
> G-id, and recommendations may never key on one — *the Full Report is a
> RENDERING, not an address*"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:64`

So a Brief, a proposal, or a recommendation **may never cite a report id**.
They cite members and pins, exactly as they do today. A report id addresses a
rendering for the owner's own re-reading and nothing downstream resolves one.

### 12.1 Identity — the triple (substrate pin, co-tag query, judge pin)

A Full Report is identified by the **substrate pin** in effect when it was
generated, the **co-tag query** that produced it, and the **judge pin** under
which its material was judged — the last taking the typed value `none` where
no judged material is present. **On a co-tag-generated report `none` is
non-conformant** — the kogaki#168 reconciliation below, which changes which
reports are conformant and changes the key space not at all. The cases,
restated as the rule they share:

| act | result |
|---|---|
| same pin, same query, same judge pin, run twice | **one** report — the rerun is idempotent, not a duplicate |
| pin advances, rest unchanged | **two** reports, one per pin |
| same pin, different query, judge pin held fixed or not | **two** reports, one per query — a differing query is two reports whatever the judge pin |
| same pin, same query, **different judge pin** | **two** reports, one per judge pin — coexisting; neither collides nor supersedes. A co-tag-generated report always carries a real judge pin, so `none` is never the discriminator on this row (kogaki#168, below) |

**This table is the normative form.** kogaki#129 stated three cases and v4
carried them verbatim; the fourth is v4.2's, and it is written *into the
table* rather than only into the prose below, because the table is what an
implementer reads first and a table contradicted by a later paragraph is a
rule that is wrong as written for every reader who stops at it (v4.3,
kogaki#131).

**The co-tag query IS the pair (selected tag, named group)** — v4, kogaki#131.
Two reports are the same report when both components match, and different
otherwise; `agents × architecture` under tag `agents` is a different query
from `agents × report` under the same tag, and from `agents × architecture`
reached under tag `architecture`. Nothing else enters the key: not the
composed claims, not the run.

**The JUDGE PIN is the third component, ALWAYS** — v4.2, kogaki#131. A
report's identity is the **triple (substrate pin, co-tag query, judge pin)**,
and where no judged material is present the judge pin takes the typed value
`none`. v4 excluded the
subdivision from the key, and §6.2 in the same amendment made judge identity
drift-critical — "a per-invocation judged surface with no judge pin is the
drift-undetectable shape, where *recomputed fresh* silently becomes
*recomputed by a different judge*". Those two clauses together produced exactly
the collision §12.1 already rejects name-keying over: two reports whose
`(pin, tag, group)` match but whose judged content differs would be **one
report by identity and two by content**, arriving from the judge side instead
of the name side. A key that admits that is the second authority growing in the
dark, and it would be this section refuting itself four paragraphs apart.

**The arity is UNIFORM, and v4.1's content-conditional exception is
WITHDRAWN.** v4.1 keyed a report as a pair or a triple according to whether it
carried SubGroupClaims — which decides the key's shape from the report's own
content, so a requester holding `(pin, tag, group)` could not form the key
without already holding the report it was trying to address. **An identity a
request cannot construct is not an identity.** `none` is therefore a **typed
value that must be present**, never an omitted component — the same discipline
`park`'s three required declarations already follow, where `none` is a value
that must be typed.

**So the fourth case is stated rather than left open:** same pin, same query,
**two different judge pins** are **two reports that coexist**, keyed
`(pin, query, <judge pin A>)` and `(pin, query, <judge pin B>)`. They neither
collide nor supersede.

**The fourth case's v4.2 wording is SUPERSEDED, and the supersession is
recorded rather than edited away** — v8, kogaki#189. v4.2 stated it as *"one
run subdivided and one not"*, keyed `(pin, query, <judge pin>)` and
`(pin, query, none)`. Under kogaki#168 that pair cannot both be conformant
co-tag-generated reports, so the case is restated on the axis that still
distinguishes two conformant reports — **the judge pin's value**, not its
presence. Nothing about the case's *rule* changed: a differing third component
is two reports. What changed is which values the third component may take on a
conformant co-tag report.

v4.1's withdrawn reasoning — that a null component "would make two
indistinguishable reports distinct" — was **false**: a report carrying
SubGroupClaims and one carrying none are distinguishable by their content,
which is exactly why they are two reports rather than one. The withdrawal is
recorded rather than edited away, because a reader holding v4.1 must find the
disposition rather than an absence. **Rider, v8 (kogaki#189):** that sentence
remains a correct refutation of v4.1's premise and is **not** a licence to
generate the pair it describes. It says two such reports would be *distinct*;
it never said both would be *conformant*, and after kogaki#168 the second of
them is a failed run's output. Distinguishability is a property of the key;
conformance is a property of the artifact. Conflating them is what let §12.1
read against the ruling for one amendment.

**§12/§12.1 RECONCILED WITH kogaki#168** — v8, owner selection 2026-08-07
(kogaki#189). The 2026-08-07 owner ruling makes SubGroups on the screen and in
the Full Reports **REQUIRED** — every run without them is a contract violation
and a failed run (§6.2, §8.1). PR #178 landed that ruling with an explicit
reconciling paragraph in **§6.2** and **§8.1** and **none in §12**, because
neither kogaki#167 nor kogaki#168 licensed §12; §8.1 named the gap rather than
widening into it, and this is the carrier it named. This section records what
the ruling does to its own identity rule, in the same shape those two sections
use, because two of its clauses would otherwise be read as still denying it.

**THE DISPOSITION: a judge pin of `none` on a CO-TAG-GENERATED Full Report is
NON-CONFORMANT.** Such an artifact is a failed run's output, not a coexisting
peer. "Required" governs the **judgment**, so the judgment may not be skipped,
and therefore **every report the required path produces has a judge**. The rule
binds the *artifact*; it does not touch the *key space*.

**`none` is NOT deleted, and the two halves are kept apart deliberately:**

- **At the SCHEMA and IDENTITY level, `none` stays valid and typed.** §12.1's
  third component still takes it, and the uniform-arity clause above is
  untouched. This is not leniency — deleting it would **re-create the exact
  defect v4.2 withdrew v4.1 over**. A key whose third component may be absent
  is a key whose shape depends on the report's own content, so *"a requester
  holding `(pin, tag, group)` could not form the key without already holding
  the report it was trying to address"*. **An identity a request cannot
  construct is not an identity.** A request must still be able to *form*
  `(pin, query, none)` — and it must resolve, to the reports minted under it
  before this amendment and to nothing else.
- **At the CONFORMANCE level, `none` is refused on the co-tag path.** A run at
  the co-tag view may never **mint** a report carrying it.

**The idempotence rule is unchanged, and this is checkable rather than
asserted.** Idempotence is keyed on the triple: same pin, same query, same
judge pin, run twice → one report. That rule never read the judge pin's
*value*, only its identity with another's, so narrowing the set of values a
conformant report may carry cannot disturb it. Row 1 of the table above stands
verbatim.

**§8's rule that a group's leaf condition may fail is UNTOUCHED, and this is
the clause most at risk of being over-read.** §6.2 states it, in the same
paragraph that holds §8's threshold rule open: *"A group whose leaf condition
fails renders no SubGroups and is fully conformant; what is refused is a run
that **never asked**."* §8's **no-member-count-threshold** rule is likewise
untouched — §6.2's *"No member-count threshold is introduced or implied"*
stands exactly as written, nothing here introduces a floor on members, and a
reading of this amendment that supplies one is a misreading, refused in
advance. This section takes its disposition from the *other* half of that same
paragraph — SubGroups appear where §8's leaf condition puts them, *"judged,
with the judge pin required"* — which is the judgment-side obligation, and it
is the only half §12 needs. So the conformant artifact for a judged-but-empty
group is a report
carrying **its judge pin and zero SubGroupClaims** — *not* a report carrying
`none`. `none` and an empty SubGroupClaim set are not synonyms and never were:

- **judge pin present, zero SubGroupClaims** = the judgment ran and found no
  leaf split. **Conformant.**
- **judge pin `none`** = no judgment is attested. **Non-conformant on the
  co-tag path**, because it is indistinguishable from a run that never asked —
  which is precisely what §6.2's drift clause refuses: *"a per-invocation
  judged surface with no judge pin is the drift-undetectable shape, where
  *recomputed fresh* silently becomes *recomputed by a different judge*"*.

Recording emptiness under `none` would make the conformant case and the
violation the same artifact, and that is the state this amendment ends.

**The alternatives, recorded because a decision without them is an assertion:**

- **(1) `none` valid at the schema level, non-conformant on a co-tag-generated
  report — CHOSEN.** The narrow reading: required means the judgment may not
  be skipped, so any report produced by the required path has a judge. Buys
  the ruling's full force on every artifact the required path can emit, at no
  cost to the key's constructibility. Costs nothing that was load-bearing —
  the only artifacts it excludes are ones kogaki#168 already calls failed runs.
- **(2) Retain `none` for reports produced OUTSIDE the co-tag path —
  DECLINED, and declined on a finding rather than on preference.** This
  alternative is admissible **only if such a path exists**, and the sitting
  looked for one rather than assuming. **It does not exist.** Every report is
  produced by `report`, which **requires** `--tag <selected tag>` and resolves
  its target to a co-tag group — `--all-groups` over the composed groups, or
  `--group <co-tag>` naming one of them; there is no third form and no
  invocation that yields a report outside a co-tag query
  (`terrain/terrain.mjs` `cmdReport`). §12's own opening states the same thing
  from the contract side: the artifact is defined *"for a co-tag view"*.
  Ratifying (2) would therefore create **a conformance category with no
  members** — a rule about artifacts nothing can produce, which is
  carrier-less by construction rather than by omission and worse, because it
  reads as coverage. **Should such a path ever be admitted, this bullet is the
  reopen point**, and admitting it is the trigger: the sitting that introduces
  a non-co-tag report generator re-reads this bullet, because that is the act
  on which (2) first acquires a member.
- **(3) Delete `none` from the identity triple — NOT SELECTED, and refused on
  §12.1's own prior reasoning** rather than on this sitting's judgment. It
  reinstates the content-conditional arity v4.2 withdrew, four paragraphs
  above. kogaki#189 named this as the constraint the disposition had to
  satisfy, not an option it could take.
- **(4) Spec-only reconciliation WITHOUT deciding — record the tension here
  and mark it with a reopen trigger. DECLINED, and recorded because it was
  genuinely respectable.** This was a prepared alternative at kogaki#189's
  triage, and it is admissible on the three-state rule quoted above:
  deliberately carrier-less *with a mark and a trigger* is one of the three
  legitimate states, so declining it needs a reason rather than a dismissal.
  The reason is that the three-state rule governs a **stated policy** whose
  carrier is missing, and that is not this section's condition. §12.1's defect
  is not an unenforced rule — it is a **normative table that reads against a
  ruling that already binds**. Marking a contradiction as carrier-less does
  not make the table stop asserting the thing kogaki#168 refused; the row
  would go on telling every implementer who stops at it that `none` is a
  conformant peer, which is the *table contradicted by a later paragraph*
  hazard v4.3 wrote the fourth case into the table to avoid. A trigger cannot
  fix a rule that is wrong as written. **Note the asymmetry with kogaki#199
  above, which is not inconsistency:** the *runtime* rule is genuinely a
  stated policy with no carrier yet, so it takes the marked-with-a-trigger
  state legitimately; the *table* was asserting a falsehood, which that state
  does not cover.

**(1)'s own recorded counter-argument, answered rather than left standing.**
kogaki#189's triage put one objection to this alternative: declaring `none`
non-conformant *"makes row 4 describe an artifact the required path can no
longer produce, so the row becomes a statement about a non-co-tag path that
§12 does not establish exists"* — and the objection was correct about the
naive repair. It is answered by **how** row 4 was rewritten rather than by
denying it: the row is restated on the judge pin's **value** (two different
judge pins) instead of its **presence** (subdivided versus not), so it now
describes a pair the required path produces routinely — the same query judged
by two different judges — and asserts nothing about any non-co-tag path. Had
row 4 merely deleted its `none` limb, the objection would have landed.

**The grounds, and the boundary of what the substrate settled.** The served
surface **does not discriminate** the key-space question — two framings
returned `coverage: partial` with no line reaching it, and that is recorded as
the outcome rather than dressed up. What the second framing **did** return
discriminating is the *form* this amendment had to take:

> "**a decision leaves the served surface only by explicit supersession, never
> by aging** — supersession has an author, aging does not."

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/knowledge-architecture.md:88`

That is why v4.2's fourth-case wording is **superseded in place with its prior
text quoted**, and why v4.1's withdrawal paragraph gains a rider instead of
being rewritten: a reader holding either must find the disposition rather than
an absence. The same line is why `none` is not quietly dropped from the
schema — an unrecorded deletion is aging, and it has an exact failure mode
here, since the next reader would meet a key they cannot construct and no
record of why.

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e topics/knowledge-architecture.md:88, LESSONS.md:87`

  request_id: 71bebdb9-639a-48ce-816e-7dccd5b396b6
  outcome: covered-after-reframing
  query: A ruling makes a mechanism REQUIRED. A derived artifact identity key includes a component that takes a typed null value where the mechanism did not run. Does making the mechanism required remove the null from the key space, or only from the set of conformant artifacts?
  query: When a required judgment produces an EMPTY outcome, must the artifact still record the judge that produced the emptiness, or may it record nothing? Is a key that omits the judge on an empty outcome a conformance-copy defect?

**What this amendment leaves owed, named rather than implied.** The disposition
is **spec prose**; `terrain/terrain.mjs` is **not edited here**. The runtime
currently derives the judge pin as *supplied-judge when a subdivision entry is
present, `none` otherwise* (`cmdReport`), so a group whose judgment ran and
produced **no** leaf split is emitted with `none` — the conformant case
recorded as the violation, which is the defect this section names above. The
correction is that a co-tag-generated report **requires** its judge pin
unconditionally, independently of whether SubGroupClaims are present. That is
a **runtime** change, it touches the served instruction surface that supplies
the subdivision input, and neither is licensed by kogaki#189 — whose acceptance
is entirely §12/§12.1 prose. It is carried as **kogaki#199** rather than fixed
here, on the same discipline §8.1 applied to this section: widening a sitting
to a surface its issue does not name is how a decision escapes the gate that
should carry it. The skill-layer half of kogaki#168 remains **kogaki#183**.

**And the carrier is owed rather than optional, on the served line this
sitting re-read at pickup.** This section states a conformance rule in
**prose**, while the layer at which that rule can actually be broken is
`cmdReport`:

> "A rule is in force only at the layer where it can actually be broken;
> recording it one level up yields a system that is **documented as compliant
> and is not.** … a prohibition needs a deterministic check at the point of
> action, since written guidance is merely advisory to something whose job is
> to satisfy instructions."

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e gloss/lessons/knowledge-architecture.md:161`

So §12.1 v8 without kogaki#199 is **exactly** the documented-as-compliant
state that line names, and this paragraph is the mark that a carrier is owed
rather than a claim that the rule is already in force. The prohibition — no
co-tag run mints `none` — is stated here and **enforced nowhere until
kogaki#199 lands**, which is the deliberately-carrier-less state marked with
its trigger, not carrier-less by omission.

**THE SUBDIVISION INPUT'S EMPTY-OUTCOME ENCODING IS DECIDED** — v9, owner
selection 2026-08-07 (kogaki#199). The paragraph above named the correction
and left its *encoding* open; this records the selection, so that the sitting
implementing kogaki#199 fills no unnamed slot. The rule the encoding must
satisfy is already stated above and is restated nowhere: the conformant
artifact for a judged-but-empty group carries **its judge pin and zero
SubGroupClaims**.

**The finding that decided it, measured at `kogaki@96b6776` rather than
inferred.** The runtime does not merely emit `none` for a judged-empty group —
it cannot emit the conformant artifact **at all**, by three composing
mechanisms, none of which kogaki#199's filing names:

- `subOf(g)` returns `subdivisions[g.name]`, and **`[]` is truthy in
  JavaScript**, so `{"Group": []}` already takes the judge-required branch
  (`terrain/terrain.mjs:1405`, `:1429`). Judged-empty is *accidentally*
  expressible today, by a language property nothing states.
- On that branch `subgroupPlacement(group, [], …)` places nothing, computes
  `unplaced` as **every member of the group**, and pushes the
  `no_member_hidden_subgroup` catch-all (`terrain/terrain.mjs:1011-1020`). So
  the artifact carries **one SubGroup holding the entire membership**, not
  zero.
- `members: subgroups ? null : renderMembers(group.members)`
  (`terrain/terrain.mjs:1484`) then sets `members` to `null`, because `[]` is
  truthy there too — so the members are neither in `subgroups` honestly nor in
  `members` at all.

Three inputs — key absent, `{}`, `[]` — therefore yield three different
conformance outcomes, and **none of them is the artifact this section names as
conformant.** A prohibition on minting `none` is necessary and is not
sufficient: a run could satisfy it and still be unable to produce the
conformant shape.

**THE ENCODING: `--subdivisions` takes a TYPED per-group record.**

    {"Group": {"judged": true, "subgroups": [ … ]}}   judged, with a leaf split
    {"Group": {"judged": true, "subgroups": []}}      judged, EMPTY — conformant
    key absent                                        not judged — refused on the co-tag path

and `--judge-model` / `--judge-effort` are **required for every `report`
invocation**, not only when SubGroupClaims are present. `judgePin` is the
supplied judge unconditionally; `NO_JUDGE` is never minted by a co-tag run.
Two consequences bind the implementation, and they are what the finding above
makes non-optional: an empty `subgroups` list renders **zero** SubGroupClaims
and **never** the `no_member_hidden_subgroup` catch-all, and a judged-empty
group's `members` stay **populated** rather than nulled.

**Why a typed form and not the empty list already accidentally admitted.** The
declined alternative was to ratify `[]` and change no grammar — the smaller
diff, reaching neither `SKILL.md` nor kogaki#183's surface, and genuinely
respectable for that. It is declined because it would rest the boundary between
a conformant and a non-conformant artifact on **JavaScript's truthiness of an
empty array**: a composer emitting `{}` rather than `[]` produces the
non-conformant artifact silently, and nothing anywhere states the rule at the
layer where it breaks. That is §6.2's own drift-undetectable shape one level
down. The served surface rules on the form directly:

> "constrain what the pipeline can **PRODUCE** rather than … improve what it
> can **DETECT** — an enumerated prohibition can only name yesterday's leak
> while a construction constraint makes tomorrow's unreachable"

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:47`
(`constrain-generation-not-post-hoc-detection`)

  request_id: 9e835f18-de01-4579-ab88-b5751a003103
  outcome: covered-after-reframing
  query: a normative distinction carried by an empty collection's implicit truthiness rather than by a typed form — is an absent key, an empty map and an empty list being three different conformance outcomes a defect

**The cost is stated rather than discovered: this is a breaking change to a
published input format, and the served surface names exactly that hazard.**

> "A change to a published format damages precisely the records it was meant
> to improve — the population that gains the new field is the population whose
> parse changes … because producer and consumer hold separate suites over one
> contract, neither side can see the break, so the contract owes an
> **executable conformance fixture at the boundary**"

`consulted: product-lab@98195e0aef221aa82c47bb632324127745469f2e LESSONS.md:45`

So the boundary fixture is **required by this amendment rather than suggested
by it**: the producer is `.claude/skills/terrain/SKILL.md`, which composes the
subdivision input, and the consumer is `cmdReport`. `cmdCotags`
(`terrain/terrain.mjs:614-628`) reads the **same** map and follows in the same
change; a fix that migrates one reader and not the other rebuilds the defect
between them.

**The skill-layer surface is covered here, and the reason is recorded.** The
paragraph above routed it to **kogaki#183**, which is now CLOSED — and whose
skill-layer edits were made, reverted (`kogaki@c2b1aa5`) and re-filed, so the
work has already been paid for twice. Routing it to a fourth carrier would be a
third payment for one edit. The single story kogaki#199 decomposes to carries
both halves, because splitting them produces an intermediate state in which the
producer emits the old form to a consumer expecting the new one — the precise
break `LESSONS.md:45` says neither side's suite can see.

**deferred slots: none.**

**A CURRENCY FINDING, recorded because it is the fifth instance this week and
the first that changed an argument.** kogaki#189's filing pinned this line at
`product-lab@0cb46066653ef3db2e33f69971829d25c06b6507`; the served head at
pickup was `98195e0aef221aa82c47bb632324127745469f2e`, and
`issue-pins --recheck` **refused with the delta** rather than passing — the
behaviour §8.1's finding said was missing, working here. The line was
therefore re-read **by content** at the current pin before being relied on, as
§8.1 instructs, and the quote above is that re-read rather than the filing's.
This is recorded as evidence that re-reading by content is not ceremony: the
re-read is what supplied the ground for carrying kogaki#199 at all, which the
sitting would otherwise have argued from scope alone.

**This was decided rather than deferred, and the distinction is the point.**
v3 left it to the implementer's PR. But the third row above states a rule —
"same pin, different query → two reports" — whose discriminator was undefined,
so the rule was not decidable from the artifact, carried no detector, and was
not marked carrier-less with a trigger. That is none of the three admissible
states:

> "A stated policy is admissible in exactly THREE states — per-artifact-decidable
> (state it), detector designed in (measure it), or deliberately carrier-less
> (mark it, with a reopen trigger) — and **carrier-less BY OMISSION is the
> defect**."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:52`

  request_id: ca778d10-dd16-48bb-8cff-194c687be8c0
  outcome: discriminating
  query: When a design decision is deferred, what distinguishes a named deferred slot from an open question carried in a spec's open section? Does an identity key discharge a naming decision, or is naming a separate deferral owed its own record?

An incompleteness in a shipped invariant is not a postponement, so it gets a
decision rather than a `deferred-slot:` token. Contrast §11's two open
questions, which are genuine forks between readings that both satisfy §12 —
those are marked, with triggers.

**Why (selected tag, named group) and not the group name alone.** A co-tag
group's name already embeds both (`agents × architecture`), so the pair looks
redundant — and it is not, because §6's groups are composed *per selected tag*
and the same unordered pair is reachable from either side. Keying on the
rendered name alone would silently merge two reports whose member sets are
computed over different denominators, which is the same-key-different-content
collision the hub already refuses at a resolver
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:145`).

**Why the pin and not a version field.** The triple is not a convenience key;
it is the ratified shape for a derivation that outlives its computation:

> "An artifact that will be ACTED ON after it is computed carries the state it
> was computed against, and acting on it RE-VERIFIES rather than re-resolves
> … The shared failure is **silent re-resolution**, which converts a stale
> artifact into a *confident wrong action* — worse than an error, because the
> mechanism reports success."

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/knowledge-architecture.md:161`

> "Versioning is PINS, never a version field … A version number would be a
> conformance copy of the pins with no declared precedence and no mismatch
> check"

`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/articles.md:83`

  request_id: 4e9961fa-b7c2-467b-bf1e-6f4183f1cf8b
  outcome: discriminating
  query: A derived report artifact keyed to the substrate pin and the query it was computed against, regenerated idempotently per (pin, query) — is a derived rendering a second authority, and should such artifacts be committed or machine-local?

**The pin is the mismatch check, which is what makes a stored derivation
admissible at all.** The objection this has to answer is
`derivable-artifact-is-a-view-not-a-noun` — "A proposal table is a regenerated
VIEW, never a saved artifact to execute later"
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/archive/claude-code-ops.md:66`).
It does not reach this case, on the same line's own terms and for two
independent reasons. First, that rule governs artifacts **acted on** after
computation, and a Full Report is **read**, never executed — it is a report,
per the clause above. Second, the same line names the remedy it demands for
stored derivation: "the pin **is** the mismatch check and the tracker is the
declared authority." The (pin, query, judge pin) key is that mismatch check, with the
**served surface authoritative and the report subordinate**. That is
`conformance-copy-needs-declared-precedence` satisfied rather than evaded — a
copy with declared, checkable subordination is conformance; a copy without one
is a second authority growing in the dark.

**A report generated under a superseded pin is never silently refreshed.** It
is kept as the reading of that pin, and a request under a new pin produces a
new report. Re-resolving one onto current content would assert that the owner
read something they did not.

### 12.2 Location and naming — machine-local, never committed

**Naming, and how it differs from identity** — v4, kogaki#131. kogaki#129
asked the sitting to decide three things: where reports live, **their
naming**, and whether they are committed. v3 decided the first and third and
left the second to be read out of §12.1, which does not answer it — so it is
answered here.

**A report is RESOLVED by §12.1's identity TRIPLE, and NAMED by whatever
filename the emitter chooses.** These are two jobs, not one:

- **Identity is normative.** A request for the report of
  `(pin, query, judge pin)` — the query itself being `(selected tag, named
  group)` — must resolve to exactly the report that identity identifies, and to a new one
  when any component differs. Every rule in §12.1 binds here.
- **The filename is implementer-owned and carries no authority.** Nothing may
  read meaning out of it, parse it to recover the triple, or key on it — the
  report's own recorded pin, query and judge pin are the only source of that.
  A filename
  is at most a convenience for a human listing a directory.

The split is not invented for this case; the hub already draws it between a
**join key** and a **citation that is provenance**
(`consulted: product-lab@f918c5158c718394b3a0e4f10239d75bbb451b74 topics/knowledge-architecture.md:171`),
where a component was found joining on the citation and reporting 32 of 35
entries as orphaned. A filename derived from the triple is exactly that hazard's
shape: it looks like a key, is not one, and drifts silently the first time an
emitter changes how it renders a group name.

**So a naming scheme is neither specified nor forbidden here** — and that is
the decision, not a second deferral. An emitter may name reports however it
likes, *because* nothing is permitted to depend on the name. Had naming been
left to a `deferred-slot:`, the slot would have implied a decision was owed
before code could proceed; none is.

### STRUCK — the machine-local location, reversed 2026-08-08 (kogaki#234)

**The paragraph below was normative from v3 until 2026-08-08 and is WRONG.**
It is struck rather than deleted, per §2.4's reversal discipline, because a
silently removed clause leaves the argument that produced it available to be
made again:

> ~~Reports are written to the **machine-local run workspace**
> (`~/.kogaki/runs/…` or `$KOGAKI_RUN_DIR`), alongside the survey records they
> derive from, and are **never committed**. … A report is a derivation *of* a
> survey record and cannot be more public than its input.~~

**Struck by owner ruling 2026-08-08** (`specs/SPEC.md` §2.5): human-facing
files live in the repository or an explicitly designated storage path, and a
machine-local hidden directory *declares* a file machine-facing. The Full
Report is human-facing by this spec's own words — §12 calls it what the owner
reads to think a Thesis through — so Terrain was **in a failed state under the
rule** until this amendment.

**It does not survive as a supported mode, a configuration option, or a
selectable historical alternative.** The owner's instruction is explicit that
the prior positions are wrong rather than superseded-but-admissible, and a
struck clause left switchable is a future bug with a ratified excuse.

**WHERE THE ARGUMENT WENT WRONG, which is the part worth keeping.** *"A report
is a derivation of a survey record and cannot be more public than its input"*
is a true sentence doing the wrong job. It reasons about **sensitivity** and
was used to settle **location** — and those are two axes, which
`product-lab@dec0d568 LESSONS.md:112` separates by name: *"never let storage
location silently decide visibility."* Reading it correctly gives
repo-**visible** and un-**committed**, which is exactly what §12.2 now
specifies. The old clause reached a wrong answer by collapsing two questions
into one, and it looked rigorous doing it.

The other precedents it cited are unharmed and still binding: founding rider 3
makes the **run workspace** machine-local and uncommitted, and the §9 fill
measured zero committed **survey records**. Both remain true. Neither was ever
evidence about where a *rendering for a human* belongs.

### 12.2 (v11) Two artifacts, two rules — the machine record and the owner rendering

**The conflation is what produced the violation, so the split is the fix.** A
Full Report is two artifacts with two homes:

| | machine record | owner rendering |
| --- | --- | --- |
| purpose | identity, idempotence, downstream reads | what the owner reads to think a Thesis through |
| format | JSON | Markdown (owner register) |
| home | run workspace — `$KOGAKI_RUN_DIR` or `~/.kogaki/runs/…` | **`reports/` in the working tree** |
| lifetime | the RUN | the OWNER's |
| committed | no | **no — but repo-VISIBLE**, see below |

- **The machine record keeps everything §12.1 says.** The identity triple, the
  idempotence claim across invocations, the stable home that makes a rerun
  collide rather than duplicate — all of it binds the JSON, unchanged. A record
  is machine-facing and the run workspace is its legitimate home; nothing in
  the ruling touches it.
- **The owner rendering is generated by DEFAULT on a terrain run.** An opt-out
  may exist for the explicit-request case; the owner expects it unused, so its
  absence blocks nothing and no `deferred-slot:` is owed for it — a
  not-yet-built convenience with no decision inside it is not a deferred fork.
- **Both are written in the same act.** A run that produced the record and not
  the rendering would reproduce the 2026-08-06 defect specimen from the other
  side, and the rendering is what the ruling is about.

**Repo-visible, NOT committed, and that is one decision made twice rather than
one decision made once.** `reports/` is `.gitignore`d. Clause 1 of §2.5 is
satisfied by the file being in the tree where the owner works; §2.5.2 forbids
letting that placement also decide publication. The rendering derives from
survey records that are uncommitted, so it inherits their sensitivity — and
committing it would be a declassification act needing grounds this sitting does
not have and was not asked for. **The ruling governs visibility; it grants no
publication.**

**Naming is unchanged** — the filename stays implementer-owned and carries no
authority, for exactly the reasons v4 gave. Both artifacts may share a derived
basename; nothing parses either.

**Consequence, restated and NARROWED.** A Full Report — in either form — is
still not a citable artifact. Article material is quoted from served renderings
at pins (`specs/SPEC.md` §2), never from a report. What has changed is
**where the owner reads it**, not what it may ground: the rendering-not-an-address
clause above is untouched, and moving a file into the tree does not make it
evidence.

### 12.2 (v12) ONE owner rendering in the tree — the machine name never reaches the owner surface

**SCOPED BY §14.4.1 (v18) — read that clause before applying this count.**
Since v18 the tree holds a **second** owner-rendering class, `reports/Screen.md`,
also exactly one and also overwritten. This section's count governs **Full
Report renderings**; §14.4.1's governs the screen, and on disagreement each
wins for its own artifact. The pointer is written **here**, at the site a
reader asking *how many renderings may the tree hold* actually arrives at,
rather than only at the clause that knew (v19, kogaki#462) —
`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:215`.
Everything below is unchanged for the artifact it was written about.

**Owner ruling 2026-08-14.** The working tree holds **exactly one** owner
rendering: **`reports/FullReport.md`**, a fixed human name, **overwritten on
every pull**. This amends two v11 clauses by name:

- **"Naming is unchanged" is superseded for the rendering.** The rendering's
  filename is now normative, not implementer-owned. The measured defect: v11's
  implementer-owned name was the identity digest
  (`terrain-full-report-<hash>.md`), and 25 such files had accumulated in
  `reports/` by 2026-08-14 — a machine register's naming standing on the owner
  surface. §2.5 clause 3 already rules that a machine-local hidden *directory*
  declares a file machine-facing; **a machine-oriented *name* makes the same
  declaration**, and a tree full of them tells the owner none of these files
  are for reading, which is the opposite of what the ruling that put the
  rendering in the tree decided. The record's filename stays implementer-owned;
  no owner reads it where it lives.
- **Accumulation is superseded.** Identity, idempotence, and the coexistence
  of reports under different identities (§12.1's four cases) are carried by
  the **machine record alone**, in the run workspace, exactly as v11 already
  assigned them. The rendering is a pure function of the record, so holding
  one rendering per identity in the tree cached nothing the record cannot
  regenerate at zero marginal read; a rerun overwrites the record under the
  same identity, so storage does not grow with reruns.

**The refusal/repair.** An identity-named rendering
(`terrain-full-report-*.md`) found where renderings are written is **retired
on sight** by the runtime, announced in one line, never silently
(`retireLegacyReportsDir`'s discipline). A run that leaves **two or more**
owner-rendering files in the tree, or writes an identity-named file anywhere
the owner works, is a **contract violation** and a failed run — the same
standing §6.2 gives a run that skipped the subdivision judgment.

**Which half of that is carried, stated rather than left to read as covered.**
The §6.2 comparison holds for the standing this clause declares and **not** for
the enforcement, and the difference is written here so the clause is not read
as having a carrier it lacks. §6.2's standing is a **refusal** — a run without
a judge pin exits non-zero and writes nothing. This clause's is a **silent
repair**: `retireIdentityNamedRenderings` deletes an identity-named rendering
on the next write and returns, so a violating run is corrected rather than
failed.

- **Enforced by construction:** the write path cannot mint a second name.
  Both report paths join the renderings directory with the literal
  `FullReport.md`, so no identity digest can reach a rendering filename — the
  defect this clause was written against is unwritable rather than detected.
- **Currently unobserved:** a rendering file arriving in the tree under any
  *other* name — hand-copied, left by a third-party tool, or written by a
  future code path that does not go through `renderingsDir()`. Nothing counts
  the rendering files, and nothing exits non-zero on finding two.

Closing the second half means an assertion that the tree holds exactly one
rendering, sited where a run can act on it. It is separable work and is not
done here; what is not separable is the clause being honest about which half
it has, since a declared contract with no carrier and no note that it has none
reads exactly like an enforced one.

**What this does not touch.** The record's home, shape, naming, and every
§12.1 identity clause; `--no-render`; §2.5.2 (still gitignored — visibility
and publication remain two decisions); and the rendering-not-an-address
clause. A checker asserting rendering *coexistence* per identity now asserts
it over records, never over tree files.

## 13. The provenance neighborhood — a widening of the settled Strand set

**This section folds kogaki#289** (owner-adopted direction 2026-08-08; hub
assessment `product-lab:q_a/staging/2026-08-08-terrain-cross-tag-expansion-for-candidate-strands.md`).
It designs the mechanical layer only. The LLM-relevance extension is not
designed here and not promised — §13.5 is its gate, and discard stays a valid
outcome.

### 13.0 The defect, and the served ground it actually rests on

The candidate set reaching the owner is **co-tag-bounded**. A contemporaneous
Grain under an unrelated tag — the specimen is an OwnerRule lesson explaining
*why* a design direction changed, sitting in the same sitting's batch as the
design-change Strands — is unreachable from the co-tag group that holds those
Strands. Nothing on the screen says it exists.

**The ground is `[[reachability-is-address-plus-discovery]]`, and it is worth
stating which lesson does *not* apply, because kogaki#289's own riders name the
other one.** The served surface separates them explicitly:

> "Ratifying the exclusion is REFUSED: an entry screen structurally omitting 54%
> of served material is a discovery failure, not an honest scope.
> `[[reachability-is-address-plus-discovery]]` holds that reachability is the
> conjunction of a resolving address and a surface that discloses it … **The harm
> is deliberately NOT the one `[[grouping-upstream-of-selection-is-a-gate]]`
> names — that governs granularity, where the full set is present and only the
> choosable unit is coarsened, so a reader applying it here finds no violation;
> here the material is absent from the axis entirely**, and that lesson's
> diagnostic question returns zero for this corpus, decided by an axis that was
> never asked about it."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:109`

  outcome: discriminating
  query: Is a remedy that adds a propose-only expansion view surfacing same-provenance items constrain-shaped or individual-prohibition-shaped?
  query: grouping upstream of selection is a gate; propose-only suggestions that keep the full population reachable and disclose their substrate; naming the enumeration so a coverage claim has a denominator

kogaki#289's rider list cites `[[grouping-upstream-of-selection-is-a-gate]]`.
That citation is **corrected here rather than carried**: by the quoted line's
own words a reader applying it to this defect "finds no violation", so resting
the surface on it would leave the design grounded in a position that returns
zero for this corpus. The rider's *content* — propose-only, upstream of
selection, full population reachable — survives unchanged and is §13.1; only its
authority moves.

**Which conjunct this section establishes, and which it leaves open.** The
ground is a conjunction lesson, and its own rider binds the act that invokes it:
"a fix satisfying one conjunct presents as discharging the whole rule, because
it cites the rule accurately and the citation lends the untouched conjunct its
air of completeness — so a fix invoking a conjunction lesson must name which
conjunct it establishes and name the one it leaves open"
(`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 LESSONS.md:54`).
Stated plainly: **§13 establishes DISCOVERY and does not close ADDRESS.** The
surface discloses that the neighborhood exists, which is the conjunct the
co-tag-bounded screen was failing. The address conjunct stays open exactly where
§13.3 says it does — a `source_batch` that does not resolve by equality for the
12 legacy batches — and §13.3's unresolved marker is a *disclosure* of that gap,
never a repair of it. A reader taking §13 as closing reachability for this
corpus is reading the untouched conjunct's air of completeness rather than this
section.

**The standing beyond article quality**, carried from the licensing issue and
not re-derived: the 2026-08-01 contradiction-cost ruling admits thesis-first
reading *because* "the surprise channel is the terrain listing rather than the
repository". A co-tag-bounded Terrain weakens that channel, so this surface
defends the premise of a ratified position rather than only improving a screen.

### 13.1 What it is under §2 — a report, never a proposal, and no divergence owed

The neighborhood **widens**. It never narrows, never reorders the candidate set,
never hides a row, and gates nothing.

**THE ARTIFACT IS A SECTION OF THE FULL REPORT (v20, kogaki#472).** It is not a
screen and has no owner surface of its own: it renders inside
`reports/FullReport.md`, at the ONCE tier §12's multi-section form defines —
aggregated over the entered set, beside `## Counted` and `## Served lines`
rather than repeating per section. §12.2 (v12)'s rules govern it wholly, which
is what it means for this to be a *section* rather than a second artifact
sharing a directory: one file, overwritten per pull, one identity.

**Three things follow, and each is stated because a reader could otherwise
assume its opposite.**

- **It renders on every pull, empty included.** §13.4's obligations below are
  written against the section, and an absent section is indistinguishable from
  a pull that found nothing — the disclosure discipline §13.4 obligation 2
  already owes, applied to the section's own existence.
- **§14.1's owner-surface enumeration stays SIX and its coverage claim stays
  TWO of six.** Before v20 the neighborhood screen was a **seventh** owner
  surface by §14.1's own definition — text this runtime writes for the owner to
  read (`terrain/terrain.mjs:3259`, a `reports/Screen.md` writer beside
  `cmdView` at `:618` and `cmdCotags` at `:981`) — enumerated nowhere and
  covered by no grammar. v20 does not *cover* that surface; it removes it. The
  enumeration is true again rather than widened, and §14.1's reopen trigger
  ("the first grammar edit that could have covered one and did not") is not
  fired, because the surface this edit would have covered no longer exists.
- **It is still a report and still never a proposal.** Nothing above changes
  what §2.3's residual clause governs; siting a widening view inside the
  untruncated artifact makes it *more* obviously a rendering and not a choice,
  since §12's own preamble already says the artifact "ranks nothing, narrows
  nothing and hides nothing".

**What grammar coverage of the section BUYS, and what it does not — stated here
because "brought under the grammar" reads as more than it is.**
`report-format.json` v6 admits the section's line classes, so the forms are
written down, §14.5's fixture exercises them, and a renderer edit that changes a
form diverges from a contract rather than from nothing. What it does **not** buy
is the emit-time refusal of a line matching no class: `line_class_allowlist` is
**inert on `full_report`**, because three body classes there have a bare
placeholder as their whole form and a malformed line falls through to one of
them. The new classes **inherit** that exemption without being able to justify
it — which is `an-inherited-exemption-signals-nothing`
(`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:64`)
observed at the widening. It is **disclosed and not repaired here**: withdrawing
it requires constraining the body classes or admitting a sectioned allowlist,
which is a decision about the artifact and outside kogaki#472's licence. The
fork is carried as a named deferred slot in `report-format.json`
(`deferred_slot_full_report_allowlist`), and the alternative that would have
avoided it — a `neighborhood_section` surface of its own — was weighed and
declined at the same gate, on §14.5's grounds.

**§2's three inherited contracts are untouched, and this is the load-bearing
paragraph of the section.** §2.3 defines a proposal as the act of narrowing:

> "the boundary engages exactly when something other than the owner narrows the
> candidate set, and its test is whether what reached the owner is smaller than
> what exists"

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:89`

Nothing here is smaller. So:

- **§2.3 is applied, not amended.** Its enumeration lists only narrowing acts,
  and its residual clause governs the rest — "An act not in either list is a
  report, not a choice — Terrain surfaces it as unclassified with its reason and
  takes no narrowing action" (§2.3). A widening act is in neither list, and the
  clause's own remedy is exactly what §13.4 requires: surface it **with its
  reason**, take no narrowing action. The residual clause is doing the work it
  was written for; adding a widening branch to an **inherited** contract would
  be a consumer amending the manifest's own text, which §2's preamble forbids
  ("inherited unamended").
- **No §5.1-style declared divergence is owed**, and the absence is recorded so
  a reader does not infer one was skipped. §5.1's discipline binds a consumer
  shipping *ahead of* a served ruling; here the served ruling is the ground.
- **The candidate model in §5 is unchanged.** §2.2 reserves "what the candidate
  set *is*" to §5 and says grouping never touches it; the neighborhood is
  symmetric — it is a **view beside** the candidate set, so it touches neither.
  A neighborhood suggestion becomes a candidate only by the **owner's** act of
  taking it, which is the selection §2.2 protects.
- **"Propose-only" is the licensing issue's word and not this spec's.** In
  kogaki#289 it means *suggests without gating*; in this spec a **proposal** is
  a narrowing act routed to `specs/spec-proposal-contract/SPEC.md`
  (`specs/spec-proposal-contract/SPEC.md:27-29`). The mapping is
  §289-propose-only → **this spec's report**. §4 states why the collision
  matters: resolved the other way, a reader concludes Terrain grew a
  proposal-rendering affordance of its own and that §1's refused alternative was
  built.

### 13.2 Input is the SETTLED STRAND SET ALONE (v15); the trigger is the REPORT PULL's ID ENTRY (v20)

The surface takes **one** input: the Strand set the owner has settled. The
GroupClaim is visible at selection as an aid to *choosing* that set and is **not
an input to the expansion**.

**This reverses v12/v13, which required a second input, and the reversal is
recorded rather than smoothed.** Those versions declined Strand-set-only
similarity and named the tentative Thesis a required input; the 2026-08-09 owner
ruling adopts exactly what they declined. Their argument is preserved in the
Status block and in §13.3 below rather than deleted, because it was sound about
the thing it was reasoning over and wrong about what this substrate can consume.

**The ground: a claim-shaped input is DEAD INPUT here.** §13.3's three
substrates are batch-mates, `[[slug]]` cross-links and shared carrier issues —
member metadata, every one of them. None can read a claim. A required Thesis was
therefore an input nothing consumed, which v13 had already measured from the
other side when it found the mechanical layer returning the same neighborhood
for every Thesis. Specifying an unreadable input does not sit inert: it reads as
design, invites an implementation to invent a consumer for it, and quietly
licenses the judged layer §13.5 gates.

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:15`
(`[[an-input-the-substrate-cannot-read-is-dead]]`)

**THE TRIGGER IS AN EXPLICIT OWNER ACT NAMING A BOUNDED SET**, and it carries
the concern the Thesis was reached for. Expansion must not fire on an unsettled
screen. The ruling's own reading: a purely mechanical expansion is **just as
noisy fired too early** — on the co-tag GroupClaim screen right after the first
tag selection it would fan out across a large number of Lessons — so noise is a
property of **trigger timing**, not of the substrate.

**WHICH owner act — the REPORT PULL's ID ENTRY (v20, kogaki#472, owner decision
2026-08-16).** The neighborhood is computed **inside `report`**, seeded by the
entered Group/SubGroup IDs, on every pull. **The post-gate trigger of v15 —
"expansion fires after the strand-selection gate", and the standalone invocation
that carried it — is SUPERSEDED.** No standalone invocation remains normative;
§6.3's two-act window is unchanged, because the neighborhood is computed inside
**act 2** and never as a third act.

**This is a trigger re-site and not a loosening, and the distinction is the
whole of why v15's principle survives.** v15 ruled that "expansion fires on an
explicit owner act settling the Strand set". Its operative half — *an explicit
owner act naming a bounded set* — is preserved exactly: the report pull's ID
entry **is** such an act (§6.3 act 2, "the owner speaking"), and the fan-out is
bounded by the entered set precisely as the report itself is. What is withdrawn
is only the *identification* of that act with the strand-selection gate.

**The ground is a defect v15 could not have measured, and it is stated in the
record's own numbers.** v15 sited the trigger after the gate because firing on
an unsettled screen fans out; the corpus measurement (kogaki#385, PR #367 — 967
records, 126 co-tag groups at the declared bound) found suggestions **median 27,
max 217**, which is §13.3's drowning arm and not its starve arm. That
measurement was **per co-tag group across the whole screen** — a population the
report pull's entered set does not have. And the post-gate siting carries a
defect the flood numbers never measured: **suggestions arrive after the set is
settled**, so acting on one requires re-opening a decision already made. A
suggestion's only use is to inform the selection; delivered after it, the §13
report is structurally too late. Riding the report, the owner reads Glosses and
neighbors together and takes ONE informed act at the gate.

**Identity is unchanged, and this is checked rather than assumed.** §12.1's
report identity triple — substrate pin, co-tag query, judge pin — already covers
everything the neighborhood reads (the entered set rides `selections` in the
query component, and the substrate pin is the same one). So idempotence needs no
new component, and a re-pull under the same identity renders the same section.

**What trigger timing does NOT cover, and where the rest of the bound now
lives.** Trigger timing decides *when* the expansion fires and nothing about
*how far* it runs. v13 located the stopping condition in the Thesis and v15
removes it, so the whole remaining bound is §13.3's traversal bound — **now
fully specified there** (v16): the unit is traversal, substrates × depth, and
its values are FIXED AND DECLARED rather than keyed to anything. An
implementation that picks different values in code has settled a spec question
silently; an implementation that derives them from the settled set's content
has reintroduced the input v15 withdrew.

**Still not a third sibling entry point.** It takes a bounded owner-named set,
so it sits downstream of whichever entry produced one (Lessons co-tag today,
Decisions later) — the siting survives both corrections untouched, as do the
closed-set invariant and the never-a-Brief-fetch rule. Under v20 it is not an
entry point at all, having no invocation of its own. **And Terrain ENDS at
Strand exploration:** the shape is *selection → Strand exploration → end of
Terrain*. A session may offer to start Brief afterward; this spec neither
mentions nor guarantees that. **v20 does not move that boundary** — the
neighborhood now renders *earlier* in the flow, at the report pull, and the
owner's act of taking a suggestion is still the last thing Terrain does.

### 13.3 The three substrates, and the join that does not hold by equality

Three links, all served today, verified through the seam at this amendment's
pin rather than quoted from the licensing issue:

| substrate | link | verification |
|---|---|---|
| `source_batch` | same-sitting provenance | `gloss/ELEMENTS.jsonl:1,4,7-8,10,22-23,30,41,47-48,53-54,73,85,93,96,107,122-123,132,135,141,148` — present on every lesson record read |
| `cross_links` | the `[[slug]]` graph | same records; e.g. five links at `gloss/ELEMENTS.jsonl:8`, and the empty list at `:4`, which is a value rather than an absence |
| shared carrier issue | issue numbers in pins | consumer-side, read from the pins Terrain already holds |

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/ELEMENTS.jsonl:1,4,7-8,10,22-23,30,41,47-48,53-54,73,85,93,96,107,122-123,132,135,141,148`

**THE MEASURED CORRECTION — `source_batch` does not resolve by equality, and it
fails silently.** kogaki#289 carries the caveat in the right direction ("batch
membership joins through `kind: batch` records' `members`, never by
string-equality on `source_batch`") and states it against a figure — "65/289
records point inside a batch dir" — that is a different quantity from the one
that decides the join. The measurement taken for this amendment:

- **148 `kind: batch` records**, carrying **293 member references** in total
  (`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 gloss/ELEMENTS.jsonl:745-892`).
- Their ids split across **two namespaces**: **136 dated slugs**
  (`q_a/2026-07-30-topic-file-cap-and-recall-cost`) and **12 legacy numbered**
  (`q_a/3`, `q_a/10`, `q_a/18`).
- A lesson's `source_batch` matches a **dated** id exactly —
  `q_a/2026-07-30-topic-file-cap-and-recall-cost` at `gloss/ELEMENTS.jsonl:1`
  resolves to the batch record at `gloss/ELEMENTS.jsonl:854`.
- It does **not** match a **legacy** id: the lesson at
  `gloss/ELEMENTS.jsonl:85` carries `source_batch: "q_a/3/answer.md"` while the
  batch record's id is `"q_a/3"` (`gloss/ELEMENTS.jsonl:891`). The `/answer.md`
  suffix defeats equality. Same shape at `:141` (`q_a/18/answer.md` against
  `q_a/18`, `gloss/ELEMENTS.jsonl:753`).

**So the resolver joins through the batch record's `members`, and an
unresolvable `source_batch` is reported rather than dropped.** The failure mode
this forbids is the specific one: an equality join returns *no batch-mates* for
every Grain in the 12 legacy batches, and presents that as "this Grain has no
same-sitting siblings" — indistinguishable on screen from a Grain that genuinely
has none. That is this surface reproducing, one layer down, the exact silent
exclusion §13.0 exists to remove, and it is
`[[a-defect-your-instrument-absorbs-reads-as-clean]]`
(`gloss/ELEMENTS.jsonl:8`) with this section as its instrument. A batch-mate
lookup that cannot resolve its `source_batch` therefore emits an **explicit
unresolved marker naming the value**, never an empty result.

**`members` is family-keyed, which makes §13.4 cheap rather than expensive.**
The served shape is `{"members": {"journey": [...], "lesson": [...]}}`
(`gloss/ELEMENTS.jsonl:745`), so the join already carries each batch-mate's
family; §13.4's no-pooling rule needs no additional lookup and no inference.

**WHERE THE BOUND LIVES — v13's resolution, half of which v15 removes.** The
paragraphs that follow are v13's and are kept in full — **with v15's
corrections interleaved as their own marked paragraphs, and one lead sentence
replaced**, which is stated here so the phrase does not license more trust than
it should. They are kept because the *shape* they established survives and only
the *thing that supplied the bound* is withdrawn.

**The region runs to the end of §13.3** — through the *"Why this is a bound and
not a filter"* paragraph, which is v13's and still names the withdrawn input.
**Inside it, the QUOTED and BULLETED material is v13's unless a paragraph is
headed as v15's** (`Read under v15.`, `Survives:`, `Withdrawn:`,
`Consequently`, and this marker). Scoped that way rather than as "everything
not marked as v15's is v13's", which the marker's own connective prose
falsifies: that reading made this very sentence, and the line introducing v13's
blockquote below, into v13's. Two attempts at this clause have now been wider
than what backs them, so it is scoped to the material it is actually about.

Read them under this correction:

- **Survives:** the division itself — enumeration and bounding are different
  jobs; a bound may never be a relevance predicate over neighbors; a filter over
  the rendered set is refused; and `deferred-slot: the bound's unit`, which v15
  recorded as unfilled in its setting half, is **DISCHARGED by v16** — unit and
  values both declared below.
- **Withdrawn:** the Thesis as the thing that bounds. v15's §13.2 makes the
  settled Strand set the sole input, so wherever v13 says *the Thesis bounds the
  expansion*, there is now **nothing setting the bound's values** until the
  slot's setting half is filled — which v16 does, with fixed declared values.
  That is the finding, not a wording problem: v13 could treat the
  unit as a refinement because a bound already existed; v15 cannot.
- **Consequently** v13's own reasoning below — that a mechanical layer returning
  the same neighborhood for every Thesis leaves a required input consumed by
  nothing — is now the *argument for the correction* rather than a defect to be
  resolved by giving the Thesis a job. It measured the right thing and drew the
  narrower conclusion.

**Where the Thesis binds: it bounds the expansion, and never filters the set
(v13, kogaki#300 — SUPERSEDED IN ITS BOUNDING HALF by v15, kept as record).**
§13.2 declares both inputs required; every substrate above
is computable from the candidate set alone. Read together those said the
mechanical layer returns the same neighborhood for every Thesis — which makes
§13.2's "empty is an informative outcome" unreachable and leaves the required
second input consumed by nothing. The resolution is that the Thesis is not a
predicate over the enumerated neighbors but the **question the read is bounded
by**:

> "A read with no question has no relevance criterion, so its intermediate grows
> toward corpus size; no grade, since completeness certifies only its own
> enumeration … A read with one inherits the question's relevance bound,
> stopping condition and grade — **grounded, refuted and empty are all
> informative outcomes**."

`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/knowledge-architecture.md:89`

So the division is: **the three substrates enumerate, and the Thesis bounds the
expansion of that enumeration** — how far the traversal runs and where it stops.

**THE BOUND, FILLED IN BOTH HALVES (v16, kogaki#300, owner selection
2026-08-12). `deferred-slot: the bound's unit` is DISCHARGED.**

The **unit** is traversal — substrates × depth — from kogaki#300's 2026-08-09
selection, which is claim-free and stands. The **values** are fixed and
declared here, identical on every run:

| substrate | depth |
|---|---|
| `source_batch` (same-sitting batch-mates) | one hop |
| `cross_links` (`[[slug]]`) | two hops |
| shared carrier issue | off |

**These are the 2026-08-09 fill's own numbers with their key removed.** That
fill set them *per Thesis*; v15 withdrew the Thesis, and v16 keeps the values
and drops the keying rather than inventing new ones — the numbers were never
the part that read a claim.

**Why fixed rather than keyed to anything, including anything claim-free.** The
discriminator is decision lifetime:

> Separate configuration by decision lifetime — per-repo facts set at
> onboarding vs per-artifact choices asked at artifact time; conflating
> lifetimes freezes editorial decisions as infrastructure.

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:138`
(`[[config-by-lifetime]]`)

A fixed declared setting is an **onboarding-lifetime fact**: it REMOVES a
decision from the expansion loop, which is the same ground that carried the
visual identity, the one style contract and the audience field. Both live
alternatives put a decision back in:

- **Keyed on the settled set's size** — declined. The table would be
  onboarding-lifetime and the key claim-free, so it is admissible in principle;
  it is declined because nobody has run the expansion once, so the variation it
  buys is anticipated rather than observed, and the bands become their own
  argument. If a real run shows a large set drowning in a fixed reach, that
  measurement is the trigger to reopen this — and it is a better trigger than
  the anticipation would have been.
- **Owner names the reach at the settling act** — declined on the served line
  directly: a per-run choice inside every expansion, and it re-opens what the
  owner just answered by settling the set.

**Two alternatives were already declined at the 2026-08-09 fill and are NOT
re-proposed here**, recorded so neither returns blind: a **neighbour-count cap**
(a size budget evicting members chosen by meaning has no usable lever) and a
**surfacing threshold** (it ranks, which this section forbids the bound from
doing).

**What is still not settled, so the discharge is not read wider than it is.**
Whether these values are *right* is unmeasured — they are inherited from a fill
that never ran. What the discharge buys is that they are **declared, reviewed
once, and diffable**, so an implementation cannot pick them silently and a later
correction is an amendment rather than a code change.

v13's own statement of the slot follows, verbatim:

> This section fixes *that* a stopping condition exists and that it may never be
> a relevance predicate; it does not fix what the condition is measured in
> (traversal depth, member count, substrate exhaustion, or another unit).

**Read under v15:** that sentence's last clause is now one clause too broad. The
measuring **unit** is no longer open — kogaki#300's 2026-08-09 owner selection
answers it as traversal, substrates × depth — and what remains open is only the
**values** that unit takes. Everything else in the sentence stands.

The slot is named here rather than only on the story because a reader of §13.3
alone would otherwise meet text that reads as complete.

**And §13.2's "empty is an informative outcome" is reachable only once that
slot is filled — stated rather than asserted.** Under a bound that may change
only *how many*, an empty neighborhood over a **non-empty** enumeration would
mean the bound halted at zero, and a bound halting at zero for one Thesis and
not another has decided something about the first neighbor — precisely the tell
this section names below. So on the text as it stands, empty is guaranteed
reachable only where the enumeration is itself empty, in which case the Thesis
is not what made the outcome informative. Whether §13.2's claim holds in the
stronger form it intends depends on the unit the slot above carries: a unit
operating on **which substrates and how deep the traversal runs** can reach
empty without ever judging a neighbor, while a unit operating on neighbor count
cannot. Filling the slot is a decision act owed on kogaki#300 with its own
alternatives and receipt, and an implementation that picks a unit in code has
settled it silently — which is the defect this whole amendment exists to
prevent, one level down.

**Read under v15.** That paragraph is v13's and is kept whole; two of its
clauses have moved on. Its opening — *"reachable only once that slot is
filled"* — and its closing warning about *"an implementation that picks a
unit in code"* — both treat the unit as the open half. Under v15 the unit is
**settled**: kogaki#300's 2026-08-09 owner selection answers it as traversal,
substrates × depth, and only the **values** it takes are open. So read the
paragraph's own fork as already taken — it names *"a unit operating on which
substrates and how deep the traversal runs"* as the branch that can reach empty
without judging a neighbor, and that is the branch v15 stands on. What an
implementation must not settle in code is therefore the **values**, not the
unit, exactly as §13.2 above now states it. This is a correction stated beside
v13's text rather than spliced into it: editing the paragraph would be the
misattribution defect this PR exists to repair, committed a second time.

**Why this is a bound and not a filter, stated because the two are one
refactor apart.** A filter over the rendered set would *narrow* what reaches the
owner, which engages the §2.3 second-proposer boundary that §13.1 declares never
engages here — the widening classification in the status block above depends on
it. A bound on expansion narrows nothing: the neighborhood is material offered
**beside** the candidate set, so a bound decides how much additional material is
surfaced and removes nothing that would otherwise have reached the owner. An
implementation that computes the full neighborhood and then drops members
against the Thesis has built the filter, whatever it is named.

**Read under v15.** That paragraph is v13's and its argument survives whole —
a bound narrows nothing because the neighborhood is offered *beside* the
settled set, so §13.1's widening classification is untouched. Only its last
clause names a withdrawn input: with no Thesis, the filter tell is an
implementation that computes the full neighborhood and then drops members
against **anything claim-shaped**, which v15 makes doubly refused — it builds
the filter *and* reintroduces the dead input.

### 13.4 Disclosure, denominator, and families that are never pooled

Four obligations on the rendering — three inherited, and one added at v17 by
the measurement §13.3's own reopen trigger produced.

**ALL FOUR BIND THE FULL REPORT SECTION, UNCHANGED IN SUBSTANCE (v20,
kogaki#472).** The obligations were written when the rendering was a screen, and
re-siting it is exactly the act at which an obligation quietly stops binding —
so each is restated here against its new carrier rather than left to be inherited
by implication:

1. **Substrate disclosure** — every suggestion row in the section names the
   substrate that reached it, or renders the explicit undisclosed form. A row
   whose substrate is not stated is non-conformant in the section exactly as it
   was on the screen.
2. **The named enumeration and the family-keyed figure** — the section states
   what it looked for and did not find, and every figure names its family. The
   region is the **entered ID set** under v20 rather than the settled Strand
   set; it is still supplied by the owner and still enumerated by the surface,
   so the served coverage-claim rule quoted below is satisfied identically.
3. **Populations are never pooled** — family sections are outermost in the
   section, as they were on the screen.
4. **Grouping by substrate instance inside each family**, with the
   suggestion/rendering distinction stated at every figure.

**And two properties of the section that the screen did not have to state.**
**Complete enumeration is a rendering of the set, never a selection over it** —
already obligation 4's words, and load-bearing here because §12's no-truncation
rule now covers the section too: the section may be long, and it is in a file by
design. **The §13.3 bound is untouched** — `source_batch` 1 hop, `cross_links` 2
hops, shared carrier off, still fixed and declared and still read rather than
chosen. Neither the re-siting nor the seed change is a licence to re-cut it.

The four, as originally written:

1. **Every suggestion discloses the substrate that reached it** — batch-mate,
   cross-link, or shared carrier — and names it. This is §2.3's residual clause
   ("surfaces it as unclassified **with its reason**") satisfied literally: the
   substrate *is* the reason. A suggestion whose substrate is not stated is
   non-conformant, not terse.
2. **The view names its enumeration, and the figure names its family.** §2.1
   binds every Terrain figure to state its denominator's family, and the
   neighborhood owes it twice over, because a coverage claim over a
   self-supplied denominator is the shape the hub refuses: "a coverage claim is
   admissible only over an enumeration the claimant did NOT receive from the
   party the claim is made to — so where scope must come from the human, the
   human supplies a REGION and the phase does the enumerating"
   (`consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:61`).
   Here the owner supplies the region — the settled Strand set (v15) — and the
   surface enumerates and **reports what it looked for and did not find**,
   including the unresolved-`source_batch` markers of §13.3.
3. **Populations are never pooled.** A batch-mate may be a Journey, a Decision,
   or a Position rather than a Lesson. Such a suggestion renders in its **own
   named family section** and never inside the Strand candidate list:

   > "The facade converges the INVARIANT SPINE and must NEVER merge the
   > POPULATIONS. … The 2026-07-28 ruling minted no umbrella term over Strand
   > and thread-line DELIBERATELY, because a covering word is what let a
   > 132-of-246 figure be measured over Lessons ∪ Decisions and quoted into
   > decisions taken under a Lesson-or-Journey definition — so a facade offering
   > one pooled selectable list would rebuild that hazard mechanically rather
   > than verbally."

   `consulted: product-lab@dec0d568dd8fc0b2df1185eac10dc1a10600f299 topics/articles.md:72`

   This is the obligation the surface is most likely to breach by convenience,
   because the neighborhood's whole appeal is that it crosses boundaries — and
   family is the one boundary it must not cross. §13.3's family-keyed `members`
   is what makes compliance mechanical.

4. **The screen GROUPS BY SUBSTRATE INSTANCE; it never lists a flat run**
   (v17, kogaki#385, owner selection 2026-08-12). Batch-mates render under
   their **batch**, with that batch's count **within the family**;
   cross-linked suggestions render under `cross_links` with theirs. Every
   suggestion still appears, still carries its `N<n>` and its substrate, and
   the per-family **suggestion** figures of obligation 2 are unchanged — **the
   grouping is a rendering of the same complete enumeration, never a selection
   over it.** The per-family *rendering* count is not unchanged and is not
   claimed to be: a suggestion reached by two substrates renders twice inside
   its own family section, which is the paragraph below.

   **HOW 3 AND 4 COMPOSE: FAMILY IS OUTERMOST, ALWAYS.** The two are
   orthogonal groupings over one set, and a mixed-family batch is the ordinary
   case rather than an edge one, so the nesting is stated here rather than left
   to the implementation to settle silently. **Obligation 3 is an invariant and
   obligation 4 is a readability aid, and an aid never weakens an invariant** —
   so the family sections come first and the batch headings sit *inside* them.
   A batch holding three Lessons and a Journey therefore renders its batch
   heading twice, once under each family, with each heading counting only its
   own family's members. Batch-outermost was rejected for the reason obligation
   3 exists: it places a Journey and a Lesson adjacent under one heading, which
   is the pooling that obligation forbids, reintroduced by the layout rather
   than by the list.

   **A suggestion reached by two substrates renders under EACH**, which is what
   keeps the disclosure of obligation 1 complete — a row appearing only under
   the first substrate would silently drop the second reason it was reached. So
   **rendering count and suggestion count differ by construction**, and any
   figure over the screen states which of the two it is counting.

**Why the remedy is here and NOT in §13.3's bound.** §13.3's reopen trigger
fired on the first real run (kogaki#367's measurement over the whole served
corpus): suggestions ran to a **median of 27 and a maximum of 217**, with **38
of 126 co-tag groups over 50**, and `source_batch` supplying **5068** against
`cross_links`' **330** — roughly 15:1. The starve arm never fired (6 of 126
reached nothing).

**The bound has no setting between flooding and off**, and that is a fact about
the unit rather than about the values. `source_batch` at **one hop** is the
smallest non-zero value that substrate has, so reducing inside the declared unit
— substrates × depth — can only turn it **off**, removing the substrate that
supplies 94% of what the neighborhood finds. Batch size is a property of how the
corpus was written, not of the traversal.

The served surface discriminates the fork, and is quoted whole at its pin:

> "A grouping method concentrates the dimension it measures, so inside any group
> its members are alike in exactly the way that method can see — and refining
> the same method cannot separate them further; whatever distinguishes them sits
> on an axis the method is blind to by construction, so the remedy is a
> different method applied to the group, never a finer threshold on the
> original."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:51`

`source_batch` concentrates by co-sitting; every member of a 43-member batch is
alike in exactly that way, so no finer traversal separates them. What the reader
needs is a **different method applied to the group** — and grouping the run
under its batch is that method, applied at the layer where the difficulty
actually is. The complete artifact stays beside the surface, which carries only
what the artifact lacks
(`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:50`).

**Two alternatives declined, recorded so neither is re-proposed blind.**

- **A per-batch traversal predicate** — "do not traverse into a batch above N
  members". It looks like it stays inside the declared unit, and it is exactly
  the finer threshold on the original method the served line refuses. Worse, it
  **drops whole batches**, so a Grain in a large sitting silently gets no
  batch-mates at all — the exclusion §13.0 exists to remove, reintroduced as a
  configuration value.
- **A surfacing threshold with full reachability.** Declined at kogaki#300 on
  the ground that it **ranks**, which §13.5 forbids the bound from doing; that
  decline noted adopting it "would have meant amending that clause rather than
  filling this slot, which is a different act". This amendment **is** that act
  and still declines it, on the narrower ground now available: grouping achieves
  the same readability **without introducing a rank at all**, so re-cutting
  §13.5's "may never score, rank, or drop an enumerated neighbor on relevance"
  buys nothing and spends the clause that keeps the judged extension gated.

**§13.3's values are UNCHANGED and its trigger is SPENT, not re-armed.** The
measurement is what fired it, and this is the answer; a future run that finds
grouping insufficient re-opens the bound with new evidence rather than this one.

**Completeness is unaffected, and the reason is §2.1's own.** The count runs
after composition over the **placements** of the set the owner adopted; a
widening view upstream of adoption changes what *may* be adopted and not what
was placed. A neighborhood suggestion the owner does not take is not a dropped
Strand — it was never in the composed set. **Grouping does not touch this
either**: obligation 4 changes the order and the headings of what renders, and
never the membership.

### 13.5 The extend-or-discard gate

The LLM-relevance extension enters **only** if the mechanical layer measurably
misses during dogfooding, by the subdivision precedent: implemented →
dogfooded → owner-verdicted (§8.1's measurement-before-offering rider, applied
unchanged). **Discard stays a valid outcome**, and so does "mechanical layer
sufficient".

The trigger is an observation, never a date: **a recorded run in which the
owner names a Grain that belonged in the Strand set and that none of §13.3's
three substrates reached.** The unresolved-`source_batch` markers of §13.3 are
deliberately *not* that evidence — an unresolved join is a mechanical defect to
fix, and counting it as a relevance miss would buy the extension with the
mechanical layer's own bugs.

**The §13.3 traversal bound is not this gate, and must not become it (v13,
kogaki#300; re-cut v15).** §13.3 bounds how far the enumeration expands —
under v16 by the declared traversal values in §13.3, the Thesis having been
withdrawn; this section holds *relevance judgment* — whether a surfaced
neighbor is worth keeping — behind the trigger above, undesigned. The two are
adjacent enough to collapse silently, so the line is drawn mechanically rather
than by intent: **the §13.3 bound may decide how much of the enumeration is
traversed, and may never score, rank, or drop an enumerated neighbor on
relevance.** An implementation whose bound requires judging a neighbor against
**the settled set's content** has built this extension without its trigger
firing, and the observable tell is unchanged in shape: a bound whose removal
would change *which* neighbors are surfaced rather than *how many* is a
relevance predicate whatever it is named. **v15 sharpens this rather than
weakening it** — with no claim-shaped input in the section at all, any
implementation found scoring neighbors against a claim has both built the
gated extension *and* reintroduced the dead input the correction withdrew.

The `§13.2` in this section's trigger sentence was corrected to `§13.3` in the
same amendment: the three substrates are enumerated there, and the mis-citation
pointed at the inputs section instead.

### 13.6 Placement, and the coupling that is refused

**Terrain only.** The Brief's closed-Strand-set invariant is untouched:
mid-composition gap discovery keeps its ratified remedies, and re-opening a
closed set routes back through Terrain as an **owner** act.

**No Move coupling, and it is a prohibition rather than a scope note.**
Expansion runs from the settled Strand set (v15).
Suggesting Grains *because they would make a Move
applicable* is the declined adjacency/Recipe shape, whose named observable
defect is Move-first composition — the article's shape choosing its material.
A neighborhood that consulted the Move set would invert the dependency this
section exists to preserve.

### 13.7 What this binds in the implementation

Stated as blast radius, with shipped-code pointers read at this amendment:

- **`terrain/terrain.mjs`** — a new subcommand beside the eleven dispatched at
  `terrain/terrain.mjs:2128-2138`. It is a **sibling of `cotags`**
  (`terrain/terrain.mjs:574`), not a change to it: `cotags` composes within one
  tag and its `--claims` refusal is keyed to `compose-input`'s composition pin
  (§11), which a widening view must not perturb. The neighborhood reads the
  survey record and the settled Strand set (v15) and emits its own artifact.
  **SUPERSEDED at v20 (kogaki#472): there is no standalone subcommand.** The
  enumeration (`neighborhoodOf`, `terrain/terrain.mjs:2894`) and the rendering
  (`neighborhoodScreen`, `:3274`) are computed inside `cmdReport` (`:2331`) and
  emitted as a section of the Full Report; nothing writes `reports/Screen.md`
  for this rendering and nothing dispatches it by name. The sibling-of-`cotags`
  reasoning is kept above rather than deleted, because what it establishes —
  that a widening view must not perturb `cotags` or `compose-input`'s
  composition pin — is **strengthened** by the re-siting and not withdrawn by
  it: the neighborhood now touches neither.
  **The implementation of this bullet is NOT licensed by kogaki#472**, which is
  the spec amendment only; the code carrier is kogaki#473 and names #472 as its
  precondition.
- **`compose-input`'s bounded read is unchanged** (`terrain/terrain.mjs:1496`).
  §11's subset refusal is what guarantees claims are composed only from served
  members; a neighborhood suggestion the owner **took** enters through the
  ordinary candidate path and is covered by that pin, and one the owner did not
  take is absent from both. **No amendment to §11 is owed** — recorded because
  a widening surface upstream of a subset guard is exactly where a reader would
  expect one.
- **`.claude/skills/terrain/SKILL.md`** — the flow gains the surface. Its hard
  line "Compose from `compose-input`, never from the whole survey"
  (`.claude/skills/terrain/SKILL.md:226`) is untouched and, note, is *why* the
  neighborhood cannot be implemented as a wider survey read at composition time.
- **`checks/check-terrain-composition.sh`** — the conformance home. The three
  mechanically checkable properties are substrate disclosure per suggestion, a
  stated per-family denominator, and an explicit unresolved marker for a
  `source_batch` that does not resolve. The third is the one with a ready
  fixture: a legacy-numbered batch (`q_a/3` against `q_a/3/answer.md`) is a
  real corpus member, so the check has a live specimen rather than a synthetic
  one.

- **The display ID has no assignor for a suggestion** — added by v14, and it is
  the one item here that comes from outside §13. §14.3 assigns a `display_id`
  **once, in the survey record**; a neighborhood suggestion is by construction
  **not** in that record, so nothing assigns it one and the owner surface has no
  token to render. §14.6 carried the slot
  (`terrain-display-id-for-neighborhood-suggestions`) with its three candidate
  shapes. **It came due here**, in the sitting that implements §13, and before
  code embedded an answer — which is why it was written into this enumeration
  rather than left in §14 for that sitting to happen upon.
  **DISCHARGED: filled by owner selection on kogaki#300, 2026-08-12** — the
  neighborhood mints its own `N<n>` space, disjoint from `L<n>`, with §14.3
  unamended (§14.6 carries the fill and both declines). **The timing clause did
  its work and is worth reading as evidence rather than as history:** the
  decision was recorded on the licensing carrier *before* the implementing code
  was written, which is exactly what it existed to secure.

**§13 IS IMPLEMENTED as of 2026-08-12**, and this line is corrected rather than
left: the subcommand landed at kogaki#302 (PR #367), and the flow step with
§13.4's three conformance properties at kogaki#303 (PR #383). What kogaki#289
scoped is built; what remains open is §13.3's declared bound, whose reopen
trigger fired on the first real run and is carried at kogaki#385.

**v20 re-opens the implementation without re-opening the design (kogaki#472).**
The enumeration, the bound, the `N<n>` space and the four §13.4 obligations are
all built and all unchanged; what v20 moves is where the rendering is computed
and where it lands. That move is code the spec does not contain, carried at
kogaki#473, which names this amendment as its precondition. **Until #473 lands,
the shipped runtime dispatches a standalone `neighborhood` and writes
`reports/Screen.md`, which this section now declares superseded** — the ordinary
spec-ahead-of-code interval, named here so a reader who runs the tool and finds
a screen knows which of the two is stale.

## 14. The rendered format's carrier, and the owner-surface display ID

**This section adds no format rule to this file. It moves the rules out of
it.** kogaki#319's finding is that the format contract's only carrier is
amendment-layered prose spread across §6.1, §6.2, §9, §12, §12.1, §12.2, the
struck section and the divergence register — so each fixing session re-derives
"the format" and drifts on a different clause than the last one. Five classes
regressed across roughly ten filed-and-closed rounds, three of which reported a
root cause. A ninth prose site would be the tenth round.

### 14.1 The carrier is `specs/spec-terrain/report-format.json`, and it wins

**One machine-readable grammar is the single carrier of the rendered form** —
the line classes admissible on each owner surface, the token shape of each
field, and the per-surface allowlist.

**An OWNER SURFACE is any text this runtime prints or writes for the owner to
read.** Defined once, here, and used with this meaning everywhere in §14. The
enumeration as it stands is **six**: `cmdView` (`terrain/terrain.mjs:447`),
`cmdCotags` (`:574`), `cmdClaim` (`:819`), `cmdAdopt` (`:943`), `cmdSubdivide`
(`:1099`), and the Full Report owner rendering emitted by `cmdReport` (`:1788`,
§12.2 v11). The machine record is not one; it is machine-facing by §12.2 v11's
split.

**The grammar's coverage is TWO of those six today, and that is a stated
partial rather than the definition.** `cotag_screen` and `full_report` are the
two surfaces §14.2's refusal reaches at v14, chosen because they are the two
kogaki#319 enumerated and the two whose defect specimens exist. **§14.3's
duty — no element name on an owner surface — binds all six**, because
kogaki#318's decision is about what the owner reads and not about which
emitter happens to have a grammar entry. So four surfaces carry the duty with
no mechanical carrier, and this paragraph is what makes that legible.
**Reopen trigger:** the first format defect observed on any of the four, or the
first grammar edit that could have covered one and did not. An enumeration of
two presented as the whole is the shape that leaves surface N+1 uncovered by
default; naming six and covering two is a different claim, and it is the one
being made.

**Precedence is declared, not left to the reader.** Where this file's prose and
the grammar disagree about the **rendered form**, **the grammar wins.** A
format decision lands as a grammar edit; the prose sections describe intent and
stop being the contract.

**Precedence binds from the moment the artifact exists, and not before.** The
grammar is created by a separate licensed act (story 1.52), so between this
amendment landing and that story landing there is an interval in which the
prose is the only carrier there is. In that interval the prose sections remain
the contract, unchanged — precedence over an absent artifact would demote every
format rule to nothing. Stated here rather than four subsections away in §14.6,
because this is the clause a reader in that interval will stop at.

This is the one clause that makes the move safe, and it is taken on served
ground rather than on preference:

> "Duplication is not the sin; unowned duplication is, because owning a fact
> means your version wins on disagreement and you may change it, so a safe copy
> has to be deliberately stripped of both powers. Write down which side wins
> when the two disagree, in a place both sets of maintainers will read, and add
> an automated check that makes divergence fail loudly instead of passing
> silently."
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/architecture.md:243`

**That served line has two limbs and this section lands one of them.** The
first — write down which side wins — is §14.1's precedence declaration. The
second — *"add an automated check that makes divergence fail loudly instead of
passing silently"* — is **not built**. The eight prose sites are left in place
and governed, and **nothing compares them against the grammar**: §14.2's
refusal validates the emitters' *rendered text*, which is a different pair
entirely. So the eight sites are a conformance copy with declared precedence
and no divergence check, which is exactly the half the line warns about.
**Marked, not assumed.** A prose site can drift from the grammar and every gate
stays green. **Reopen trigger:** the first observed disagreement between a §14
prose site and `report-format.json`, or the first grammar edit made without a
corresponding read of the eight. The form of this disclosure is the repository's
own — `.claude/skills/review-lane/SKILL.md` marks its grammar block as "the half
this section does NOT have … stated here so the gap is a known one rather than
an assumption" — reused rather than re-invented.

**What precedence does NOT reach.** The grammar governs the **rendered form**
and nothing else. It does not govern which members are placed, what a claim
says, whether a figure is honest, or any §2.1 family-naming duty — those are
decisions this prose still owns, and a grammar that silently acquired them
would be the same conflation one level down. §9's allowlist for screen 1's tag
rows is *transcribed into* the grammar and keeps its meaning; §2.1's "a bare
count is a defect" stays prose, because it is a rule about **what the figure
means**, not about the shape of the line carrying it.

**Why precedence rather than eight amendments.** Rewriting the eight sites is
the move this file has made nine times, and §12.1 v4.3 already names its
failure mode from the inside — *"a table contradicted by a later paragraph is a
rule that is wrong as written for every reader who stops at it"*. Eight
coordinated edits produce eight new opportunities for exactly that. A declared
precedence produces one, and it is the sentence a reader reaches for when
asking which side to believe.

### 14.2 The emitters refuse; they do not report

`cmdCotags` (`terrain/terrain.mjs:574`) and `cmdReport`
(`terrain/terrain.mjs:1788`) **validate their own rendered text against the
grammar and refuse to write or print on failure.** A nonconformant artifact
becomes **unmintable** rather than detectable.

> "The alternative is to restrict what the system can produce in the first
> place, by assembling output from material that was already approved, which
> removes the possibility instead of catching it. … A practical warning sign
> that you are on the wrong side of this: the collection of checks keeps
> growing at roughly one per incident."
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/architecture.md:249`

kogaki#319's fourth finding is that this repository's check suite **is** growing
at roughly one member per incident — `checks/` holds eleven members — which is
that warning sign firing. The refusal is the constrain-side answer; the check
suite is demoted to the fast path beneath it.

**The refusal is generation-time, which is where §9 already puts it.** §9's
`FIGURE_MISMATCH` path (`terrain/terrain.mjs:206-209,278,292`) refuses to write
a record whose stored figure disagrees with its recomputation, and states the
rule as *"the refusal stays generation-time: constrain generation, then detect
what generation cannot promise."* §14.2 is that same rule applied to the
rendered artifact, which is the half §9 left uncovered: the survey **record**
has had a schema and a check since the beginning, and the Markdown rendering
and the screen text have had neither.

**The decidable set, enumerated because it is what the grammar must express.**
Pin occurrences per file == 1; zero `lesson:` tokens and zero element names on
an owner surface (§14.3); the G/SG ID grammar present; member lists carry
display IDs; sum(SubGroup members) == parent count; catch-all ≤ 30%; a line
class outside the surface's allowlist ⇒ refuse. Every one is mechanically
decidable on the rendered text alone, which is why the refusal is possible at
all — and a decision that is *not* mechanically decidable does not enter the
grammar and stays prose.

### 14.3 No owner surface renders an element NAME — the display ID does

**Owner decision, kogaki#318, 2026-08-09: screen output and Full Report alike
display element IDs, never element names.** This covers Lesson names
(`lesson:a-carrier-binds-the-occasions-it-is-installed-on`), Journey names and
Decision names. The owner's stated principle: the system displays only
information that can be explicitly justified, and these names are information
the machine wants to display, not information the owner wants to read.

**The rendered token is the `display_id`, assigned ONCE in the survey record.**
`specs/spec-terrain/survey-schema.json` gains a per-candidate `display_id`
matching `^L[0-9]+$`, assigned at survey time (`terrain/terrain.mjs:300`,
beside `id` / `slug` / `family` / `tags` / `cite`). **The survey record is the
ID→slug map**; there is no second carrier and no per-artifact mint.

**Why once rather than per artifact — the fork this amendment actually
decided.** The display ID is a **join key**: the co-tag screen, the Full Report
generated from it, and a Brief launched from either all name the same member.
Numbering each artifact from 1 gives shorter lists and makes `L3` on the screen
a different member from `L3` in the report.

> "The vocabulary is the hub's and is not re-minted per surface: a synonym in a
> join key is the same defect as a divergence."
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/knowledge-architecture.md:42`
>
> "two vocabularies do not merely disagree, they make the join return NOTHING,
> which reads as no data rather than as a conflict"
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/knowledge-architecture.md:50`

The failure is silent by construction — a wrong-member resolution returns a
well-formed answer, so both ends log success. Assigning once removes the
possibility; detecting the collision would be the instrument that is always one
incident behind.

**The accepted cost, stated rather than discovered.** A survey-wide space
numbers candidates the owner never sees on a given screen, so a co-tag screen
reads `L4, L17, L58` rather than `L1, L2, L3`. That is denser than the ordinal
form kogaki#318's text literally proposed, and it is the price of the ID
meaning the same thing on every surface. The ID is stable **within a pin**,
which is coherent with §12.1's pin-keyed identity triple; a pin advance may
renumber, exactly as it already produces a second report.

**`L1, L2, L3` was named as "the Brief input unit" and was not one.** No
`L<n>` identifier existed in this repository at the time of this amendment —
not in this file, not in `specs/spec-draft-pipeline/SPEC.md`, not in
`terrain/terrain.mjs`. Throughout §6.1, §6.2 and §9 the phrase "Lesson ID"
means the slug-shaped `lesson:<slug>`. **This amendment mints the space**; it
does not adopt one. Recorded because the issue's own text reads as though the
carrier existed, and a reader who trusts it will look for a map that is not
there.

**Consequence for §§6–9 and §12, governed rather than rewritten.** Wherever
those sections say a member's **Lesson ID** is rendered on an owner surface —
§6.1's grouped member IDs, §6.2's SubGroup member lists, §9's rows, §12.2's
member headings — the token rendered is the `display_id`. §14.1's precedence is
what carries this; those sections are not amended, and the grammar is where the
token shape is checked. The **machine record keeps the slug, the cite and the
map**, which is §12.2 v11's existing split doing its job: the record is
machine-facing, the rendering is the owner's.

### 14.4 Exactly one producer for owner-facing text

**The skill layer never retypes runtime output.** `.claude/skills/terrain/SKILL.md`
delivers the screen and the report as the files or streams the runtime wrote —
the owner reads the artifact, not a quotation of it.

This closes a corruption channel no check on the runtime side can reach. The
2026-08-09 hands-on test transcript carried two lines **fused mid-token**: a
SubGroup header claiming `(6 Lessons: …)` spliced into the catch-all's
19-member list, and a claim line splicing into a different group's claim. A
runtime cannot fuse two lines mid-word; a model retyping a screen can. §2.4's
verbatim-relay rule (kogaki#164) is advisory prose sitting at exactly the layer
where it breaks — and a rule is in force only at the layer where it can
actually be broken. §14.2's refusal guarantees nothing about the owner's eyes
while a second producer stands between the two, so this clause is what makes
that guarantee reach them.

**This is a removal, not a rule.** The relay stops being a producer at all;
nothing new is prohibited, so nothing new has to be policed.

### 14.4.1 (v18) Delivery binds to an ARTIFACT, never to a display channel

**The general rule is now `specs/SPEC.md` §2.5.3, and this section CITES it
(v21, kogaki#474).** Nothing below changes: the artifact name, the two-member
screen class, the four uncarried items and the non-normative-mechanism ruling
all stand exactly as ratified. What changes is that this section stopped being
the only place the general rule existed.

**Why it moved, recorded here because this is where a reader looks for it.**
Three days after this clause shipped, the first live `/move-ingest` run
reproduced the identical defect on a different surface — a selection screen
retyped by the model, truncated mid-identifier, accepted by an owner who had
been shown 15½ of 22 rows. This clause was correct, specific, present, and bound
only the surface it was written in, so the second surface was born unguarded.
Per `product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0
topics/claude-code-ops.md:38`, repeated successful implementation of one rule is
itself the tell that its carrier sits at the wrong layer. The ruling below is
therefore **promoted, not weakened**: §2.5.3 carries it for every owner-facing
screen, and this section keeps everything that is Terrain's own.

**Owner ruling 2026-08-15 (kogaki#434).** §14.4's removal is right and is not
reopened. What was false is the layer its delivery instructions bound to.

**The defect, stated as the contract's own arithmetic.** §14.4 above says *"the
command's own output IS the reply"* and *"run `cat <path>` and let the tool
output be what the owner reads"*. Both name a tool call's **stdout** — and in
the harness this repository is operated through, **a tool call's stdout is
displayed to the model, not reliably to the owner**; it collapses to a
one-line summary. That is not inference from a transcript, it is the harness's
own stated contract. With that channel unavailable, three ratified clauses
close every alternative:

1. §14.4 prohibits retyping into the reply — the one channel the harness does
   render.
2. §6.3 prohibits any question UI after tag selection.
3. §14.4's one-producer rationale refuses model-side re-emission machinery.

So **every conformant run rendered nothing**, and *"Delivering nothing is still
a failure"* then named the only remaining conformant behaviour a violation. The
2026-08-14 transcript shows what an over-constrained contract actually
produces: the reply claimed *"The agents co-tag screen is above"* over a
collapsed tool line, and the owner saw no screen. **A contract with no
satisfiable member does not yield silence; it yields a false claim of
success**, which is the worse failure because it reads as delivery.

**The ruling.** Each screen is written by the runtime to **`reports/Screen.md`**
— a fixed human name, **overwritten on every render** — exactly as §12.2 (v12)
already rules for `reports/FullReport.md`. Delivery is then the act of the
owner reading that artifact.

**WHICH renderings are screens under this clause: `view` and `cotags`, and no
third (v19, kogaki#472).** At v18 there were three, the provenance neighborhood
being the third. §13.1 (v20) re-sites that rendering into the Full Report, so it
is **no longer a screen and no longer written to `reports/Screen.md`** — it is
governed by §12.2 (v12)'s Full Report rules instead, under the split this clause
already draws between the two owner-rendering classes. **`view` and `cotags`
keep this clause unchanged in every respect.**

**This is a member leaving the class, not the class being re-cut.** Everything
below — the artifact-not-a-channel discriminator, the hand-over floor, the
enforced-by-construction write, the four uncarried items — holds exactly as
written for the two remaining screens. Recorded rather than left implicit
because a clause whose membership shrinks silently reads afterwards as though it
had always meant two, and the reason the third left (it moved to the *other*
owner-rendering class, not out of owner-facing rendering altogether) is the part
a later reader would otherwise have to reconstruct.

**And the delivery MECHANISM is explicitly non-normative.** A pointer in the
reply, an owner-executed `!`-prefixed command, a harness file-send — any of
these may hand the artifact over, and **this spec names none of them as
required**. That is the whole content of the amendment and the reason it is
sited here rather than as a fourth delivery instruction:

> the previous three fixes each repaired the artifact that had most recently
> been wrong, and each closed honestly. The hop with no carrier at all is
> **producer → owner**, and it is the hop that gets the carrier.
>
> `consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 LESSONS.md:22`

**Why an artifact and not a channel — the discriminator, kept because both
declined arms are otherwise reasonable.** A verbatim fenced relay and an
owner-executed command **both work today**. Each binds the contract to a fact
about the surrounding harness: that the reply renders, or that `!` output
renders. Those are the same shape as the assumption that produced this defect,
so adopting either would make the contract true until the harness moved and
give no signal when it did. A file the runtime wrote has no such premise. The
fenced relay carries a second, independent cost §14.4 already measured: it
restores the producer whose removal that clause exists for, and the specimen is
two lines **fused mid-token**, a corruption a runtime cannot produce.

**§14.4 is narrowed, not repealed, and the surviving clause is named.** The
relay is still not a producer: handing over an artifact is not retyping it, and
the prohibition on retyping, summarizing, re-formatting, tabulating and
paraphrasing stands unchanged. *"Delivering nothing is still a failure"* also
stands, and only now has a satisfiable discharge.

**Against the owner's enforcement frame (ruled 2026-08-14):**

| rule | how this satisfies it |
|---|---|
| nothing appears whose reason cannot be explained | one artifact per render, at one fixed name |
| information instructed to be output DOES appear | the artifact holds the runtime's own bytes |
| information whose display is prohibited does NOT | nothing is retyped, so nothing can diverge |

**A hand-over must occur; its FORM is what is free.** Writing the artifact is
not delivery. A run that writes `reports/Screen.md` and tells the owner nothing
has produced exactly the owner-visible state kogaki#434 was filed against, so
§14.4's *"Delivering nothing is still a failure"* binds to the **hand-over**
and never to the write. The relay names the artifact to the owner as the FIRST
act after the command returns — before any gate, any question, any other tool
call. **That ordering is §2.4's positive limb, not §14.4's** (§14.4 is a
removal and carries no sequencing rule), **and this clause CHANGED it** — it
replaced that limb's object, from the rendering relayed in full in the reply
to the artifact named. §2.4 and §6.3 act 1 are amended by name at v19
(kogaki#462); the ordering and the obligation survive, only the object moved.
**Which form that
naming takes is unconstrained** and that is the whole of the freedom this
clause grants: a pointer, an `!`-command and a file-send are interchangeable
here, and a spec that fixed one would be back to binding a contract to a
harness. What is NOT free is skipping it.

Whether the owner then *reads* it is outside every carrier here and always was
— but that is a statement about the owner, not a discharge for the run.

**§12.2 (v12)'s owner-rendering count is AMENDED, not merely cited.** That
clause rules the tree holds **exactly one** owner rendering and that a run
leaving **two or more** is a contract violation and a failed run. This clause
adds a second owner-facing file to the same directory, so the two must be
reconciled here rather than left to a reader:

- **§12.2 (v12)'s count is scoped to FULL REPORT renderings.** It governs the
  file named `FullReport.md`: exactly one, overwritten per pull, and an
  identity-named rendering beside it is retired on sight. That rule is
  unchanged in every respect for the artifact it was written about.
- **The screen is a SECOND owner rendering class, with its own count of
  exactly one.** `reports/Screen.md`, overwritten per render. The invariant
  §12.2 (v12) actually protects — *no accumulation, no machine-register naming
  on the owner surface* — holds for both, which is why this is a scoping and
  not a repeal.
- **On disagreement, this clause wins for the screen and §12.2 (v12) wins for
  the report.** Written down because a copy that does not say which side wins
  is the defect
  (`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 gloss/lessons/knowledge-architecture.md:215`,
  `conformance-copy-needs-declared-precedence`: *"Write down which side wins
  when the two disagree, in a place both sets of maintainers will read."*)

Stating this was owed rather than optional: the first draft of this clause
**restated §12.2's cardinality claim as precedent in the same breath as adding
a file to the directory it counts** — which is the over-constrained-contract
shape this very clause exists to remove, one clause over, and a latent
contradiction only because §12.2's own *"Currently unobserved"* paragraph says
nothing counts the rendering files.

**Siting costs nothing new, and this is checked rather than assumed.**
`reports/` is already the renderings directory and already gitignored, and
§12.2 (v12) already sites one overwritten owner rendering there. `Screen.md`
takes the identical lifetime in the identical directory, so §2.5.1's lifetime
discriminator needs no new clause — the one the Full Report earned already
covers it. kogaki#434 priced this arm as needing its own siting clause; it does
not.

**What is NOT carried, stated rather than left to read as covered.** Four
things, and the third is the one a reader would otherwise assume:

- **The write is enforced by construction.** The runtime joins the renderings
  directory with the literal `Screen.md`, so a second screen name is
  unwritable rather than detected, exactly as §12.2 (v12) makes a second
  report name unwritable.
- **The mechanism is unchecked because it is unconstrained.** Nothing exits
  non-zero on a screen delivered by one form rather than another; there is
  nothing there to check, by design.
- **The hand-over floor above has NO mechanical carrier.** That a run named
  the artifact to the owner at all is a property of the relay's behaviour, and
  nothing in this repository observes it — the same standing §14.4's own
  prohibitions have, and for the same reason: the relay is a model, not a code
  path this suite can run. The floor is stated so a run that skips it is
  **wrong** rather than merely disappointing, and stated here as uncarried so
  the clause is not read as having an enforcement it lacks.
- **Nothing counts the rendering files.** §12.2 (v12) already declares this of
  the Full Report and it is equally true of the screen: a rendering arriving
  under some other name — hand-copied, or written by a future path that does
  not go through the renderings directory — is unobserved. Listed as its own
  item at v19 (kogaki#462): it rode inside the hand-over bullet, which is
  about the relay and not about the count, in an enumeration whose whole
  argument is that a stated obligation must not read as carrying an
  enforcement it lacks.

### 14.5 A golden fixture, and what it is for

**One checked-in conformant specimen per surface the grammar covers**, under
`checks/fixtures/`, exercised by `checks/check-terrain-composition.sh` — so
**two** at v14, one for the co-tag screen and one for the Full Report owner
rendering, per §14.1's stated coverage. A renderer edit that changes the shape
fails in the PR rather than in the owner's next hands-on round.

**The count stays TWO at v20 (kogaki#472), and the Full Report specimen GAINS
the provenance-neighborhood section.** §13.1 (v20) sites that rendering inside
the Full Report rather than on a surface of its own, so no third surface is
covered and no third fixture is owed — but the section's line classes are
covered from the moment `report-format.json` v6 admits them, and a covered class
with no specimen is exactly the drift this section exists to catch. So the
obligation lands on the **existing** Full Report fixture: it must render a
neighborhood section, and a **non-empty** one, since an empty section exercises
the empty-enumeration classes and none of the others.

**THE OBLIGATION IS DISCHARGED — by kogaki#473 (story 1.69), the carrier this
paragraph named while it was owed.** `checks/fixtures/terrain/format/full-report.md`
carries a non-empty neighborhood section — suggestions in two families, an
outside-population figure, a named unresolved reference — regenerated from the
renderer over the committed input, so the golden block's byte-equality and
conformance assertions both exercise the section's classes. The interval
history is kept rather than smoothed: kogaki#472 amended the spec only, this
paragraph stood in the owed tense across the gap (PR #475 round 1's finding),
and the discharge is recorded here in the same edit that made it true, so the
two tenses never coexist.

**The cost is stated rather than discovered: one specimen now carries two
concerns.** A change to the report body and a change to the neighborhood
rendering fail the same fixture, and a reader diagnosing a failure has to
establish which. That is the price of leaving §14.1's six-surface enumeration
alone, and it was priced against the alternative at the kogaki#472 gate — a
`neighborhood_section` surface with its own fallback, its own allowlist and a
third specimen, declined because §14.1 enumerates owner surfaces **by emitter**
and this section has no emitter of its own, so admitting it would have amended
the very clause whose argument is that naming six and covering two is an honest
partial.

The count is stated **per covered surface** rather than as a flat number
because a flat number cannot stay true across §14.1's reopen trigger: the
sitting that brings a third surface under the grammar would otherwise have to
choose between an under-covered suite and a clause it contradicts.

The fixture is **not** a second carrier and never wins against the grammar —
§14.1's precedence is one-way. Its job is the pair:

> "Nobody catches it because each side has its own tests: the publisher's
> confirm it wrote the new format, the reader's confirm it still reads the old
> one, and nothing checks the pair. Give the format one shared example that both
> sides run against."
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/testing.md:45`

This is the one member the check suite gains, and it is added while §14.2
removes the class of incident that was adding one per round — the demotion
§14.2 names, made concrete.

### 14.6 How A–E compose, and the one slot left open

The grammar (§14.1) is what the emitters validate against (§14.2); the display
ID (§14.3) is the token that grammar admits where a name used to render; the
single producer (§14.4) is what makes §14.2's guarantee reach the owner's eyes;
the fixture (§14.5) catches drift between hands-on rounds. Remove any one and
the remainder still reports the defect it can no longer prevent.

`deferred-slot: terrain-display-id-for-neighborhood-suggestions`

**FILLED — owner selection on kogaki#300, 2026-08-12.** §13's provenance
neighborhood widens the candidate set across tag boundaries. A suggestion it
surfaces is, by construction, **not** in the survey record — so it has no
`display_id`, and §14.3's "assigned once in the survey record" does not reach
it. **The neighborhood record mints its own space, `N<n>`, declared disjoint
from `L<n>`, and §14.3 is NOT amended.** A taken suggestion is assigned an
`L<n>` by §14.3's existing assignor on the way in, and its `N<n>` does not
follow it.

**The other two shapes are declined, with their grounds, so neither is
re-proposed blind.**

- **Widen §14.3 so the survey record assigns for suggestions too** — declined:
  it would make the survey record hold entries for things that are **not in the
  survey**, which is the premise §14.3 rests on. §14.3 was itself a repair
  (story 1.53) and amended again the week before; widening it reaches every
  surveyed element, where a second space reaches only suggestions.
- **Assign an `L<n>` only when a suggestion is TAKEN** — declined, and it was
  the genuinely attractive one: one space, no disjointness rule, §14.3
  untouched, and it fits the grain of a propose-only surface upstream of
  selection. It fails because the owner cannot refer to a suggestion by id
  *while choosing*, and choosing among several is exactly when a token is
  needed. Reachable-but-unnameable is a weaker form of the defect §13.0
  removes.

**What the fill binds.** Suggestions carry `N<n>`, minted over the
neighborhood's own ordered output; the disjointness is declared and
mechanically checkable, and no owner surface renders both spaces for one
element. **The cost, stated:** two id spaces exist where there was one, and an
owner copying an id has to know which space it came from. That is the price of
leaving §14.3 alone, and it is the cheaper price.

**Implemented and merged**: the `N<n>` space is declared at `NEIGHBOR_ID`
(`terrain/terrain.mjs:2728`), minted over the sorted output at `:2915`, and
rendered with its disjointness statement at `:3152`
(kogaki#367), with the flow step at `.claude/skills/terrain/SKILL.md` step 7
(kogaki#383).

**Not implemented by this amendment.** §14 is the contract; the grammar
artifact, the `display_id` field, the refusal, the single producer and the
fixture are each a separate licensed act, decomposed on kogaki#319 and
kogaki#318.
