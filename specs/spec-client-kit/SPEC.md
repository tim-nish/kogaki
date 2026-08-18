# SPEC-client-kit — the consumer half of the seam

**Status:** v1, authored 2026-08-09 (kogaki#325 and kogaki#326, decided as one
coupled group in a `/ship-cycle` spec-lane sitting).
**Governs:** the tsurezure client kit's **consumer-side** contract — what a kit
install delivers by default, and what a kit-installed sitting owes.

## 0. Why this spec exists, and the boundary it does not cross

The kit's ratified contract is **hub-side**: `product-lab
specs/tsurezure-client-kit.md`, ratified 2026-08-04, named as the governing
spec by this repository's own carrier —

> "The consumer half of the seam, as one install (tsurezure-gateway#78;
> spec: `product-lab specs/tsurezure-client-kit.md`, RATIFIED 2026-08-04)."

`policy/kit/README.md:3-4`

Kogaki holds the kit on an **interim** basis and **cannot write to the hub**.
The seam is read-only — "insights are staged as proposals through the hub's own
intake, never written directly" (`CLAUDE.md`, the managed block) — so a
consumer-side clause has nowhere hub-side to land, and until this file existed
it had nowhere kogaki-side either. That absence is the 6a finding both #325 and
#326 produced independently: the invariant was **implicit**, held in
`policy/kit/README.md`'s prose and in an install script.

`specs/SPEC.md:3487-3494` (§4.5.1 clause 2) makes the consequence exact — a
subject with no declared baseline has a **fresh** design — and clause 1 puts
the declaration "in the spec that owns its subject". This is that spec. Its
finding-aid row is added to `specs/SPEC.md` §4.5.2 in the same amendment, per
that section's own rule.

**What this does not do.** It states no clause of the hub's ratified spec and
amends none. Where the two speak to one subject the hub's line wins; a
divergence is declared here at the diverging clause with a source-qualified
pin, per §4.5.1 clause 3. This file is the *consumer's* answer to "what did
this component already decide", which §4.5 says no hub query can return.

## 1. The declared design baseline for this subject

**Inherited design:** `product-lab specs/tsurezure-client-kit.md` (ratified
2026-08-04), scoped to the seam's shape — read-only gateway, no write path to
the hub, enhancer-never-dependency, install idempotence.

**Scope limit, stated as part of the clause rather than as a footnote:**
nothing here may be read as a general inheritance of hub design. The
inheritance covers the four properties named above and nothing else. Every
other clause of this spec is **fresh** under §4.5.1 clause 2.

**Divergence register:** none as of v1.

**The disposition was consulted, and one clause of the inherited document is
SUPERSEDED.** A ratification date is a fact about a commit; whether that
ratification is still the *live word* is a fact about neither the commit nor the
line, and §4 of the founding spec declares adopting a record as the live word to
be a consultation occasion in its own right. Asked, and discriminating:

> "the ratified spec's home clause is **SUPERSEDED** rather than silently
> edited … `specs/tsurezure-client-kit.md` §1's 'implementation home is the
> tsurezure-gateway repository' is superseded by a one-line amendment;
> **capabilities, invariants, the #113 acceptance target and the Layer-2 held
> clause are untouched**."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/knowledge-architecture.md:75`
  request_id: 27a1f0b3-9aa5-4141-b735-612f93eeaf99
  outcome: discriminating
  query: Is the ratified tsurezure-client-kit spec still the live word on the kit's design, or has its disposition been superseded, and can a hub repository spec path's standing be checked through the served surface at all?

So the four properties inherited above are **invariants**, which the served line
names as untouched, and the inheritance stands. The one superseded clause is the
*home* clause — which §0 already contradicts in substance, since kogaki holds the
kit — and it is named here rather than left for a reader to reconcile.

**The inherited document's standing is NOT checkable through the seam, and that
is a property of this inheritance rather than a gap in it.**
`specs/tsurezure-client-kit.md` is a hub *repository* path; `surface_names`
enumerates served surfaces and never returns it, and neither pin currency nor
content liveness answers a disposition question. So this clause's evidence is the
disposition consult above and can only ever be that. A future amendment
re-inheriting from the same document owes a fresh consult, not a fresh pin.

## 2. The default-carrier rule, which is why layers 2 and 3 exist at all

Both clauses below place their carrier at the layer that loads **by default**,
and the position is served rather than invented:

> "A rule holds in repositories you have not created yet only if creating one
> delivers its mechanical carrier by default — a rule requiring someone to
> remember, install, or supervise for it is advisory, and its apparent
> coverage is an enumeration of the places somebody happened to act."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:38`
  request_id: d32055fa-bdc9-4eff-aca9-73262a06157d
  outcome: discriminating
  query: Does a rule reproduce only through a default carrier that loads every session, rather than through a skill a sitting must invoke?

and, on where the rule itself is sited:

> "The rule is ambient in the consumer's `CLAUDE.md`; the skill carries the
> procedure and the lint — skill-as-sole-carrier is REFUSED. … A skill binds
> only the sittings that invoke it, so siting the rule there reproduces
> exactly that failure."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/archive/knowledge-architecture.md:40`
  request_id: d32055fa-bdc9-4eff-aca9-73262a06157d
  outcome: discriminating
  query: Does a rule reproduce only through a default carrier that loads every session, rather than through a skill a sitting must invoke?

So the managed `CLAUDE.md` block (`policy/kit/templates/claude-md-block.md`) is
the carrier of record for every clause in this spec, and
`.claude/skills/consult-first/` carries procedure only. A clause added to the
skill alone does not satisfy this spec.

## 3. The shape read (kogaki#325)

### 3.1 What it is

A **pinned, scoped policy digest** of the served surface, vendored into the
consumer repository by the kit and referenced from the managed `CLAUDE.md`
block, so that a consumer sitting begins already grounded rather than running
unglossed until its first registered boundary.

The digest carries, for the declared consumer:

1. tier-1 gloss headlines whose lessons carry that consumer in `projects:`;
2. glossary state lines for terms in scope;
3. the consumer's **role-assigned obligations**;
4. one line per `policy/consultation-map.md` boundary;
5. its **pin** and the date it was generated.

**Every element that can render a zero renders its DENOMINATOR beside it
(kogaki#334).** "None" alone cannot be told from "the read did not complete" or
"three terms were dropped unread", and the digest's whole claim is that a
successor can trust what it does not find. This is the per-artifact-decidable
state of the rule quoted at §3.4: the violation is visible in the single artifact
the digest already is, so stating it suffices and no mechanism is owed. Concretely
it binds the **per-term** case §3.2's composer previously dropped in silence — a
term whose own read could not be parsed is counted and named, never skipped.

Item 3 is the load-bearing one and the reason the whole layer is worth its
cost. An obligation assigned to a role rather than to a named carrier dies
silently with whoever happened to implement it (kogaki#268 is the specimen: hub
decision D7's gate obligation, assigned to "the consumer", lost at succession
because nothing a successor loads at founding carried it). A successor's
**first shape read serves it**, which is the fix.

### 3.2 Layer 1 is composed KIT-SIDE, and the gateway is unchanged

The digest is assembled by the kit over reads the gateway **already serves** —
`gloss_index`, `surface_names`, `glossary_entry`, and for element 3
`policy_lookup` (`policy/CAPABILITIES.md:11-20`) — through the existing transport
`policy/kit/bin/gateway-query.mjs`. **No gateway tool is added and no gateway
invariant is touched**; the server stays read-only and stays a server.

**`policy_lookup` is named here deliberately, because it is the default
CONSULTATION path and this clause is where a reader would otherwise have to
reconcile the tool list with the code.** Element 3 — the consumer's
role-assigned obligations — is the one element no enumeration tool answers: it is
a question about what the surface *says* concerning a role, not a listing of
identifiers. Using the consultation path to compose it **does not make the digest
a consultation**; §3.5 settles that independently of which tool was called, and
the property that matters is that the digest emits no receipt and substitutes for
no consult. What would make it a consultation is a *gate leaning on its answer*,
which §3.5 forbids in terms.

**The consequence is stated rather than left implicit:** every install and every
refresh calls the consultation path once. That is a read the gateway already
serves to this consumer and it adds no path inward — but a kit tool calling the
default consultation path by default, in every consumer, is a fact worth being
able to find. Surfaced by PR #332's round-1 review, which reported the
consultation-map's entry-2 boundary as touched and uncovered; whether that use
needs a consultation occasion of its own is left to the map's own admission act
and is not decided here.

The declined alternative is recorded so it is not re-proposed blind: a
`shape <consumer>` **gateway endpoint**. It is the better shape for N
consumers, and there is exactly one —

> "The Client Kit's home is KOGAKI on an interim basis, separating into its
> own repository when a SECOND KIT-INSTALLING CONSUMER exists … The
> denominator is named at authoring time rather than repaired later … the set
> is KIT-INSTALLING consumers, of which there is exactly one".

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/knowledge-architecture.md:75`

— so a server-side assembly built for consumer N+1 is a partition with one
side, which `encode-the-boundary-that-is-real` refuses. **Reopen trigger:** a
second kit-installing consumer. The kit-side composer is then the endpoint's
specification rather than wasted work.

### 3.3 The digest is repo-visible and NOT committed, and the two are separate decisions

`specs/SPEC.md:90-111` (§2.5.2) binds this, and both halves are load-bearing:

- **Repo-visible** (clause 1 of §2.5). The digest is read by the owner and by
  every session in the working tree; its lifetime is the owner's, not a run's
  (§2.5.1). It lives at `policy/shape.md`.
- **Not committed.** The digest is a derived artifact whose sources are
  **hub, owner-realm** material, and kogaki is a **public** repository.
  §2.5.2's served constraint is directional: a derived artifact "inherits the
  highest sensitivity of its sources unless an explicit human-held gate
  deliberately lowers it", and storage location must never silently decide
  visibility. Committing it would be a **declassification act**, and this spec
  grants no such act. `policy/shape.md` therefore belongs in `.gitignore`,
  beside the exactly parallel `reports/` entry that §2.5.2 already earned —
  landed by story 1.48 AC3 and by `policy/kit/install.sh` step 4d, which adds
  the same entry to every consumer it installs into.

**A consumer whose repository is private may commit it** — that is a different
explicit decision, made by that consumer and stated in its own tree. This
clause binds the kit's **default**, which must be the safe one, because a
default that publishes is the failure that cannot be undone.

### 3.4 Refresh is a kit command run by the sitting, never a schedule

The kit generates the digest at install time and refreshes it as a **mechanical
pre-step of a spec sitting**: regenerate live, diff the vendored pin against
the new pin, and present the **policy delta** before the sitting starts. The
sitting's record carries the shape pin it ran under.

**The host is DECIDED, filling §7 q3 (kogaki#334).** The pre-step is a
**kit-provided step** — `policy/kit/bin/shape.mjs --delta` — which
`commands/spec-sitting.md` invokes. The kit half is chosen over putting the
logic in the command for the reason §2 already gives: a command file binds only
the sittings that read it, and the kit is what every consumer installs by
default. The command half is what makes the act *happen*, because a step nothing
invokes is the defect this decision exists to end.

**Its delta renders through the owner-register path of §8**, not as a receipt
block — the delta is an owner surface, and §8 governs what those may carry.

**§3.4's carrier state, marked rather than left carrier-less by omission.**
Until that step lands, this section is an **obligation with no observing act**,
and the served surface admits exactly three states for a stated policy:

> "A stated policy is admissible in exactly THREE states — per-artifact-decidable
> (state it), detector designed in (measure it), or deliberately carrier-less
> (mark it, with a reopen trigger) — and **carrier-less BY OMISSION is the
> defect**."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/knowledge-architecture.md:105`
  request_id: 278cf5cf-e748-4c1f-a52f-24d37be37dc8
  outcome: discriminating
  query: An obligation whose observing act was never built: is the remedy to make the absence visible at the act, and does a per-item absence owe a denominator beside its zero?

So this is the **third** state, declared: **`instrument: none`** until the
kit step and its invocation both land. **Reopen trigger:** the first spec sitting
that runs with a stale vendored pin and surfaces no delta.

**Amended 2026-08-11 (kogaki#334, story 1.51) — the KIT HALF has landed and the
COMMAND HALF is CROSS-REPO. This marks a carrier state; it decides nothing.**
`policy/kit/bin/shape.mjs --delta` exists: it regenerates live, compares the
vendored pin against the served one, presents the delta in §8's register, and
reports in every state rather than gating in any. So the two halves this
section made one `instrument: none` declaration over have separated, and each
now owes its own:

- **The kit half — `instrument: act`.** The step observes its own trigger: a
  sitting that runs it against a stale vendored pin gets the delta the trigger
  was declared for. The observer this section said "arrives with the act it is
  waiting for" has arrived.
- **The command half — `instrument: cross-repo`.** `commands/spec-sitting.md`
  is **not a file in this repository**. It is owned by `tim-nish/claude-toolkit`
  and installed actor-level at `~/.claude/commands/`; nothing in this tree can
  add the invocation, and nothing in this tree can observe it appearing. Declared
  in this repository's own convention for an off-repo carrier, the same form §8.4
  uses for `lint-gate-declaration.py`:

      instrument: cross-repo(tim-nish/claude-toolkit — commands/spec-sitting.md,
      installed actor-level at ~/.claude/commands/; no act in this repository can
      observe the pre-step being invoked, and the command is not vendored here)

**This does not reopen §7 q3, and saying so is the point.** The fill decided
*where the step lives* — a kit step, invoked by the sitting command — and that
decision is unchanged and now half-built. What the fill did not record, because
nobody checked, is that its named invoker is another repository's artifact. A
reader who greps this tree for `commands/spec-sitting.md` finds only citations,
which is the stall §8.4 was written to prevent, one section up.

**What the split costs, stated rather than minimised.** Until the invocation
lands, the step is available and unrun by default — which is precisely the
"advisory, and its apparent coverage is an enumeration of the places somebody
happened to act" shape §2 quotes at its pin. A sitting that invokes
`shape.mjs --delta` by hand gets the whole of §3.4's benefit; a sitting that
does not gets none of it and is told nothing. That is a weaker position than
"§3.4 is satisfied", and a reader is entitled to know which one they are in.

**Who observes that trigger: nothing does, and the trigger is satisfied by
construction today.** Nothing regenerates the digest, nothing diffs pins and
nothing surfaces a delta — so no sitting can tell its vendored pin is stale, and
the condition holds for *every* sitting rather than discriminating one. Written
down rather than left implied, because a reopen trigger nobody observes is the
same defect this section is marking, one level in. The repository's own worked
precedent says it in the same terms: `policy/consultation-map.md`'s
`instrument: none` records that "it fires only where someone happens to look, and
saying so is the point of writing it down."

**Its observer arrives with the act it is waiting for**: once the delta step
lands, the step itself surfaces a stale pin, and the trigger becomes observable
by the thing whose absence it was declared for. Until then the honest reading is
that this hold is norm-carried and nothing will announce it.

The declined alternative is a **CI cron in the consumer repo**, and it is dead
on two independent mechanical facts rather than on taste: the digest is
gitignored (§3.3), so a CI job has nothing to commit; and the gateway's
location is machine-local configuration by contract — "never a committed path
and never directory adjacency" (`policy/kit/README.md:21-24`) — so CI cannot
reach the substrate at all. The general position is served: a trigger binds to
an act that already happens, never a schedule.

### 3.5 Escalation discipline, and freshness

**The digest is awareness, never substitution.** When a headline becomes
load-bearing for a decision, the boundary consult fires exactly as today, and
is receipted exactly as today. A shape read is not a consultation and produces
no receipt; a sitting that cites the digest where a receipt is owed has
violated `specs/SPEC.md` §4, not satisfied it.

**Freshness is reported, never gated.** A stale pin is stated at sitting start
with its delta. It withholds nothing — the enhancer-never-dependency property
inherited at §1 forbids a kit artifact becoming a precondition for work.

### 3.6 Legibility is a VIEW defect, and the return channel is §4

A headline that cannot ground a consumer conversation in plain register is a
defect **of the served view**, not of the reader. The emission duty of §4 is
its return channel: a sitting that finds an illegible headline emits that
finding like any other durable learning. This is the one place the two clauses
of this spec are designed to compose rather than merely coexist.

## 4. The emission duty (kogaki#326)

### 4.1 The clause

**Any kit-installed sitting that produces a durable learning — an investigation
finding, a reversal, a correction, a design decision — writes ONE
staging-candidate emission in the same sitting, unasked.**

The hub has held the symmetric duty since 2026-07-23, and the consumer half had
no owner until now:

> "the **ambient experience-shaped trigger** carries the push, self-routing a
> sitting that PRODUCES a durable experience (investigation finding, reversal,
> correction, design decision) to staging route (c) unasked, with the same
> precision-first bias as the policy-shaped trigger."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/archive/knowledge-architecture.md:173`
  request_id: a9615696-cdbd-4ccc-95a5-d53815fc769a
  outcome: discriminating
  query: Consumer-side emission duty: should a sitting that produces a durable learning stage a candidate in the same sitting, unasked?

### 4.2 EMISSION is the duty; PROMOTION is untouched

The boundary is ratified and is quoted rather than re-derived:

> "in a cross-boundary proposal loop the consumer's gate completes by EMITTING
> the proposal (a durable artifact in its own tree, no clerical residue) and
> the hub's gate completes by PROMOTING it into the recall surface; 'one
> command closes the loop' is a correct requirement *within* a side and a
> contract violation *across* one."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/archive/knowledge-architecture.md:204`

So: nothing auto-promotes, nothing writes the recall surface, and `/qa-mine`'s
selection screen, its ledger dedupe and the hub's sweep gate are all untouched.
A kit that closed the loop would breach the seam it exists to serve.

### 4.3 The emission location is a directory the CONSUMER owns, and it IS committed

The served line rules out one location outright:

> "Consumer contribute-back emits into a directory the CONSUMER owns (its run
> workspace or its own working tree), never the hub's `q_a/staging/`".

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/archive/knowledge-architecture.md:202`

Between the two it permits, §2.5.1's discriminator decides: **lifetime**. An
emission awaits a hub sweep that may be days away, so its lifetime is the
owner's and not the run's. It lives in the working tree, at
`policy/emissions/<YYYY-MM-DD>-<slug>.md`.

**And it is committed** — which is the opposite of §3.3's answer, on the same
axis, for a stated reason. §3.3's digest derives from **hub** material and
committing it would declassify. An emission is authored **consumer-side**,
about consumer-side experience, in plain register; its sources are already at
the repository's own sensitivity, so committing declassifies nothing. It also
buys two things a workspace cannot: survival of workspace cleanup, and
visibility in the PR that carried the work.

**Reading the two clauses together is the point.** They look like one decision
and are two, and only a spec that states both makes the discriminator —
source sensitivity, not file kind — visible to the next carrier that faces it.

### 4.4 The format is fixed and minimal, and it is plain-register by contract

Five fields: **date**, **repo**, **trigger** (what happened), **the learning**,
**proposed grain** (lesson / topic line / glossary delta).

Plain register is part of the format rather than advice. The consumer does not
hold hub vocabulary, and hub policy drifting into internal terminology is a
live defect this channel exists to counteract rather than import — the same
finding §3.6 routes here.

### 4.5 The absence is made VISIBLE; it is never gated

The duty is an **obligation**, and the governing distinction is served:

> "a **prohibition** is violated at the tool boundary and wants a mechanical
> gate there … an **obligation** is violated by an absence, which produces no
> event to hook, so it stays behavioral and its carrier is a signal that makes
> the absence visible".

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:103, topics/archive/knowledge-architecture.md:172`

So the carrier is three-part, mirroring the ratified shape at §2: the managed
`CLAUDE.md` block states the duty; the kit provides the writer that makes it
cheap to obey; and a **lane read** reports the absence — a sitting that
produced a durable learning and emitted nothing is *reported*, never blocked.

**THE THIRD PART IS DEFERRED, AND THE DEFERRAL IS NAMED HERE RATHER THAN LEFT
TO BE DISCOVERED.** Parts one and two ship with story 1.49. The lane read does
**not**, because its shape is the open question at §7 q2 — one read or per-lane —
and settling that inside an implementation would be the unnamed-deferral defect
running backwards: code deciding a fork no gate saw. Filling q2 is therefore its
own decision act, owed on its own licensing issue with choice, alternatives and
receipt **before** any reader is written.

**What that costs, stated plainly rather than minimised.** Until q2 is filled,
this clause is an obligation with a writer and no observer — which is closer to
the "purely norm-carried" fork this section explicitly corrected the filing away
from than the finished design is. The correction is real but not yet complete,
and a reader is entitled to know which. Found by PR #331's round-1 review, whose
finding was that the acceptance criterion asserting the read's behaviour tested
an instrument nothing built; that criterion is narrowed to the two parts that
exist rather than left describing a third that does not.

**No gate, and this forecloses the obvious next proposal.** A pre-commit or
pre-merge check demanding an emission would be a gate on a judgment ("was this
sitting's output a durable learning?") that no mechanism can make, and it would
convert a channel into a tax — which is how a return channel stops being used
honestly and starts being satisfied.

### 4.6 Cadence coupling is DECLINED as out of scope

Whether `/qa-mine`'s sweep is nudged by emission count is a **hub-side**
question about a hub-side command. Kogaki declares it here so the fork is
recorded as answered-by-scope rather than forgotten: this spec binds emission
and says nothing about when the hub reads.

### 4.7 The post-disposition lifecycle — the undispositioned arm, and a named slot for the other two (kogaki#498)

**§§4.1–4.4 define the duty, the emission/promotion boundary, the location and
the format, and say nothing about what a file owes once the hub's gate has
ruled on it.** Under a keep-by-default reading that silence is invisible; under
the owner's inverted default (an artifact owes an explicit need) it is the gap
kogaki#498 reports.

**The served rule is a binary, and it binds at introduction:**

> "**A report-only row CLASS needs an executable home or an expiry, decided
> when the CLASS is introduced.** … The author introducing the class is the
> only person ever positioned to name the home cheaply."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/archive/claude-code-ops.md:25`
  request_id: 50376547-9fef-4314-8a41-1233a3dd43a9
  outcome: discriminating
  query: defining a lifecycle for artifact states that have never occurred; a growing directory of candidates whose disposal act is unnamed; expiry or executable home decided when the class is introduced

**Which arm, and why the other is unavailable rather than unchosen.** The
executable home for this class is the hub's own sweep — and §4.6 above already
declares hub sweep cadence out of scope, while kogaki#498 scopes hub-side
registration out by name. So the home arm is not this spec's to take, and the
expiry arm is what remains. Recorded this way rather than as a preference: a
later reader who can reach the hub should read this as *unavailable here*, not
as *rejected*.

**The expiry is an OBSERVATION bound, never a deletion bound.** Measured at this
head: **125 emissions, dated 2026-08-09 through 2026-08-18, of which zero have
ever been dispositioned** — the hub's mine ledger carries no kogaki rows. Every
file in this directory is therefore material **no gate has ever seen**, and
deleting it on age would destroy a learning that was never offered rather than
one that was judged and found wanting. It would also breach §4.2 from the other
side: the consumer disposing of what only the hub's gate may rule on. So nothing
here deletes, and the bound is on the **silence** instead.

**The observer is named, and it is the growth event itself.**
`policy/kit/bin/emit.mjs` renders, at each emission, the **count of
undispositioned emissions and the age of the oldest**. The siting is the served
rule applied directly:

> "**site a check at a trigger that is its own subject, or give it its own
> trigger.** … for each check, ask which run raises it and whether that run's
> trigger can be false while the check's subject is true."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/archive/claude-code-ops.md:24`
  request_id: 50376547-9fef-4314-8a41-1233a3dd43a9
  outcome: discriminating
  query: defining a lifecycle for artifact states that have never occurred; a growing directory of candidates whose disposal act is unnamed; expiry or executable home decided when the class is introduced

Emitting **is** the act that grows the directory, so the report cannot be
absent while the subject grows — which is precisely the anti-correlation that
line warns about, avoided by construction rather than by care.

**The blind spot, stated rather than minimised.** A repository that stops
emitting stops reporting, so this signal is silent in exactly one state: the
directory stagnant and ageing with no new sittings. That state is real and this
clause does not cover it. **No second instrument is invented for it** — a
second reader would be the check-suite growth this repository refuses
elsewhere, and the honest move is to name the uncovered state so a future
reader can tell a complete signal from a partial one. Filling it, if it is ever
worth filling, is its own decision act.

**Distinct from §4.5 and from §7 q2, which cover a different absence.** §4.5's
absence is *a sitting produced a durable learning and emitted nothing*; this
one is *emissions exist and nothing has ruled on them*. Different absences,
different observers, and §7 q2's deferred lane read is untouched by this
section — a reader who conflates them will think q2 was filled here, and it
was not.

**Not a cadence nudge; §4.6 stands.** Rendering a consumer-side backlog age
reports a fact about this repository. It does not ask the hub to sweep, does
not couple to the hub's cadence, and reaches no hub surface.

**NAMED SLOT: the accepted and declined arms.** kogaki#498 also asks what an
**accepted** emission's file owes and what a **declined** one's owes. Both are
left undefined **deliberately**, because **zero emissions have ever reached
either state** — designing them here would embed a shape against no instances,
which the decide-or-name rule prices rather than permits:

> "a sitting that leaves a design choice to the implementation either DECIDES
> the fork there, consulting the substrate on it, or emits a NAMED SLOT whose
> filling is itself a decision act … An UNNAMED deferral is the defect."

`consulted: product-lab@8906f20752e27d1935c62f24c8ba41ea1d55dba0 topics/knowledge-architecture.md:60`

- **slot:** `emission-accepted-and-declined-lifecycle`
- **trigger:** the first kogaki emission that the hub's gate disposes of, in
  either direction.
- **owed at fill:** choice, alternatives and receipt on its own licensing
  issue, before any code or convention embeds a reading of it.

**What this section does not do.** It deletes nothing, registers no check, adds
no gate, mints no ledger, and writes nothing to the hub. It defines one arm of a
lifecycle and names the other two as a slot with a trigger.

## 5. What binds a consumer, and what binds the kit

| clause | binds |
| --- | --- |
| §3.1–3.2 digest content and kit-side composition | the **kit** |
| §3.3 repo-visible, not committed (default) | the **kit's default**; a consumer may decide otherwise explicitly, in its own tree |
| §3.4 refresh at sitting start | the **kit command**, and the sitting that runs it |
| §3.5 awareness-never-substitution | every **sitting** |
| §4.1–4.4 the emission duty and its format | every **sitting** in a kit-installed repo |
| §4.5 visible absence | the **kit** (writer) and the **lane** (read) |
| §8.1 Question/Answer/Conclusion, pins off the owner surface | every **sitting** |
| §8.2 the emission itself | the **kit** (`consult.mjs`); the skill relays, and is never the sole carrier |
| §8.3 the pin-token deny | the **kit**, as a declared fast path only |
| §9.1 the conduct-axis facet in the map template | the **kit** (seed); the consumer's own map thereafter |
| §9.2 the `axis:` key's SHAPE | the consuming repo's `specs/SPEC.md` §4; the **hub** owns its values |

## 6. Out of scope, by decision

- **A gateway `shape` endpoint** — §3.2, with its reopen trigger.
- **Hub sweep cadence** — §4.6.
- **Promotion of any emission** — §4.2; the hub's gate is the sole path.
- **A gate on either clause** — §3.5 and §4.5; both are obligations, and this
  spec's carriers are reports.
- **A positive admission test at the owner-surface seam** — §7 q4, named and
  deliberately not built here.
- **Any change to the receipt grammar or its destinations** — `specs/SPEC.md` §4
  is untouched by §8, which adds a surface rather than moving one. **§9 is the
  stated exception and the reason this line now names its scope**: the conduct
  axis DOES amend that grammar, and it amends it *there* — in the consuming
  repository's §4, where the grammar lives — rather than here. The rule this
  line carries was never "the grammar is frozen"; it is "the kit does not own
  the grammar", and §9 obeys it by putting the key in §4 and keeping only the
  delivery half in this spec.
- **An emitter for `axis:`** — §9.3, named and deliberately not built here.
- **The `subject | conduct` value set** — §9.2; the hub ratifies it, and no
  consumer and no kit may mint it.

## 7. Open — carried as questions, never as contract

1. **Digest scoping when a consumer carries no `projects:` membership.** The
   served surface's `projects:` axis is the scoping key for item 1 of §3.1;
   what a consumer with zero matching lessons receives — an empty digest, or
   the unscoped tier-1 index — is undecided. Implementations render the empty
   case explicitly rather than choosing silently, per this repository's
   standing zero-rendering discipline.
2. **Whether the lane read of §4.5 is one read or per-lane.** Stated as a
   question because a per-lane answer is the enumeration shape this repository
   refuses elsewhere, and a single read has no obvious home yet.
3. ~~**Where the §3.4 spec-sitting pre-step lives.**~~ **FILLED 2026-08-10
   (kogaki#334):** a kit-provided step, `shape.mjs --delta`, invoked by
   `commands/spec-sitting.md` — decided at §3.4 with its grounds, alternatives and
   receipt, before any code embedded it, which is what the decide-or-name rule
   asks of a named slot. Struck rather than deleted so the fill is legible as a
   decision act; §3.4 carries the content.
4. **What a positive admission test at the owner-surface seam would be**
   (§8.3). The served position demotes the lexicon grep to a fast path and puts
   the load on a positive admission test; §8 ships the grep and the emission and
   **names this rather than building it**. Filling it is its own decision act with
   its own consult and receipt. **This is a NAMED SLOT, not an omission** — the
   distinction §3.4 above now turns on.

5. **What an ACCEPTED and a DECLINED emission's file owes** (§4.7). The
   post-disposition lifecycle's other two arms. **This is a NAMED SLOT, not an
   omission**, and it is named on evidence rather than on caution: at the head
   that added §4.7, **zero** kogaki emissions had ever been dispositioned in
   either direction, so both arms would have been designed against no
   instances. Slot `emission-accepted-and-declined-lifecycle`; **trigger:** the
   first kogaki emission the hub's gate disposes of. Filling it is its own
   decision act with its own consult and receipt, per §4.7.

## 8. The owner-register rendering of a consultation (kogaki#320)

**Owner ruling 2026-08-09.** A consultation reaches the owner today as a pin
block — `consulted: <repo>@<sha> <file>:<line>`, `request_id:` — which tells them
exactly one thing, *that a consultation happened*, and nothing they can act on.

### 8.1 Three parts, and the pin is not one of them

An owner-facing display of a consultation carries **Question**, **Answer** and
**Conclusion**: the question verbatim, what the served surface answered as
readable text rather than as an address, and the conclusion drawn from it.

**Presentation:** this does not fit inside a question UI, so it does not go
there. **Before a question UI appears, ordinary screen output carries Question
and Answer together, followed by the one Conclusion derived from them.** The
question itself stays compact.

**The pin is machine-facing.** Pins, `request_id`, and the `consult-receipt:`
block keep their grammar and their destinations exactly — receipts in PR bodies,
issue bodies, run records, spec amendments (`specs/SPEC.md` §4, unchanged by this
section) — and do not render on an owner surface.

### 8.2 The kit EMITS it; the skill relays it; neither alone is the carrier

`policy/kit/bin/consult.mjs` emits the owner-register block **beside** the
receipt. The consult-first skill's relay rule points at that emission, and the
agent composes the **Conclusion** line, since only the agent holds the
conclusion.

**Why the kit and not the skill alone.** §2 refuses skill-as-sole-carrier, and
this is the case that shows why: the receipt grammar is **the only rendering of
a consultation the kit has ever produced**, so a skill instructed to relay
something better had nothing better to relay. The defect is a missing emission,
not a disobedient reader.

**Recorded because it is this repository's own evidence:** the `/ship-cycle`
session that authored this section spent its preceding run rendering
`receipt: <repo>@<sha> <file>:<line>` into every gate it raised, having read the
governing contract. The tokens were composed deliberately, from the only
material available. That is the emission argument observed from inside rather
than reasoned about.

### 8.3 The deny is the FAST PATH, and saying so is the point

Owner surfaces carrying pin-shaped tokens (`consulted:`, `request_id:`,
`@<sha>`) are a deniable class. **This is not the remedy and must not be
recorded as one:**

> "grep the known internal vocabulary at the boundary; **but that grep covers
> only the coined-identifier sub-class**, and the wider class is text internal
> in REGISTER while made of ordinary words, which no denial list can reach
> because deletion cannot cross registers — that half needs **a positive
> admission test at one typed owner-surface seam, with the lexicon grep demoted
> to a fast path there**."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 LESSONS.md:63`
  request_id: ecdbf8bd-a08b-47c5-a68c-086f3ca342c3
  outcome: discriminating
  query: Should an owner-facing display of a consultation show the question, the answer text and the conclusion, with machine-facing pins and request ids kept off the owner surface?

`consulted:`, `request_id:` and `@<sha>` are coined identifiers — exactly the
sub-class the grep reaches — so the deny is correctly placed **as the fast
path**. What it cannot reach is a rendering that strips every pin and still
reads as an audit artifact: machine-facing in register, ordinary in words. That
would pass the deny and fail this section. **The positive admission test is
§7 q4, named and not built.**

### 8.4 One conflict with the gate-declaration carrier, and its resolution

`lint-gate-declaration.py` requires a `recommendation`-declared question to carry
a `receipt:` **or** an `outcome:` line **in the question text** — which is an
owner surface. Read carelessly the two contracts contradict.

They do not: `outcome: discriminating` is a **token**, not a pin, and the hook
accepts it alone. **A gate satisfies both by carrying `outcome:` and no
`receipt:`.** Stated here rather than left for the next author to hit, because
the natural reading — that this section forbids a conformant gate declaration —
would stall a lane over a conflict that does not exist.

**The hook is NOT in this repository, and this subsection is unfalsifiable from
inside it without saying so.** `lint-gate-declaration.py` is installed
**actor-level** at `~/.claude/hooks/`, owned by `claude-toolkit`;
`.claude/hooks/` here holds only `review-trigger.py`. A reader who greps for it
finds nothing and stalls one step later than the stall this subsection exists to
prevent. Declared in this repository's own convention for an off-repo carrier:

    instrument: cross-repo(tim-nish/claude-toolkit — lint-gate-declaration.py,
    installed actor-level at ~/.claude/hooks/; no act in this repository can
    observe its contract, and it is not vendored here)

**And what the compatibility claim rests on is stated, because it is the weaker
kind of evidence.** That the hook accepts `outcome:` alone was established by
**reading its source** — which is existence evidence, and this is a **disposition**
question about two live records:

> "A status question has two halves that behave very differently. **Whether
> something was built** is local, mechanically self-evident, free to check, and
> looks final … whereas **whether it is still accepted, rejected, or superseded**
> lives in prose somewhere else and never surfaces unless you deliberately go
> looking … Before claiming anything is implemented, complete, or ready, ask what
> evidence you are holding."

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/knowledge-architecture.md:287`
  request_id: ed061de8-7f13-417c-923e-401577c9e712
  outcome: discriminating
  query: What does consultation-map entry 3 prescribe be surveyed before adopting one record as the live word on a decision's disposition?

So the claim is scoped to what the evidence supports: **the hook's implementation
as read at this pin admits `outcome:` alone.** Whether its *owner* intends that
form to remain admissible is a disposition only `claude-toolkit` can settle, and
this section does not assert it. If that repository narrows the requirement to
`receipt:`, the conflict §8.4 dissolves becomes real and this subsection is the
thing to reopen.

**Not amended here:** the hook, the declaration grammar, and `specs/SPEC.md` §4's
receipt grammar are all untouched. This section moves nothing out of a PR or
issue body.

## 9. The conduct axis, kit-delivery half (kogaki#336)

The consultation map's entries are **act-scoped**: each names a class of act and
the survey owed before it. That answers what an act is *about* — its subject —
and nothing about **how it is conducted**. The observed shape is a consult that
read the served surface for its subject, found it, and never asked whether the
*manner* of the act was governed, so the gate presented with no visible
mismatch because nothing had asked the question that would produce one.

The change splits across two specs, and this section is the half that lands
here. **The grammar half is not here and must not be moved here** — see §6.

### 9.1 The kit SEEDS the facet; it never owns a consumer's map

`policy/kit/templates/consultation-map.md` carries the conduct-axis facet, so a
repository installing the kit receives it with its first map. The installer's
existing rule is unchanged and is what makes this a seed rather than a
mandate: an existing `policy/consultation-map.md` is **kept, never
overwritten** (`policy/kit/install.sh`), because a grown map is the repo's own
state.

**Why the template and not only the consumer's copy** (PR #342 review round 1,
should). Shipping the grammar key and the check widening without seeding the
facet gives a second consumer the *mechanism* with nothing obliging anyone to
use it — the default-carrier arm §2 exists for, missed. A rule reproduces only
through a default carrier; the template is that carrier here.

**The cost, stated:** an already-installed consumer does **not** receive the
facet, by the same rule that protects its map. Adoption there is a read of this
section, not an install.

### 9.2 The kit fixes the KEY's shape and never its VALUES

The `axis:` key is an OPTIONAL per-query continuation line binding upward to
the nearest preceding `query:`. Its shape is the consuming repository's §4; its
**value set is the hub's to ratify** under the boundary-field rule — a consumer
owns the shape of its own record and never the values of a field that exists to
join across the boundary. So neither this kit nor any consumer enumerates the
axes, and a check may validate position and non-emptiness only.

### 9.3 There is no emitter, and the absence is declared rather than implied

No kit binary writes an `axis:` line — not `consult.mjs`, not
`gateway-query.mjs`. The key is **hand-written** today, so the per-axis
grounding obligation is carried by the map's prescription and by review, never
by an instrument. Emission needs the transport to carry a per-framing axis,
which is its own act on its own licensing issue.

Declared here on §4.5's own discipline — the absence is made **visible** and is
never gated — and because the alternative is the failure this section was
partly written to repair: an obligation described in a durable carrier as
though instrumented, with the acknowledgement living only in a PR body.

**deferred slots:** the emitter (§9.3); the `subject | conduct` value set
(§9.2).
