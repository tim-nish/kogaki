# SPEC-client-kit — the consumer half of the seam

**Status:** v2, authored 2026-08-09 (kogaki#325 and kogaki#326, decided as one
coupled group in a `/ship-cycle` spec-lane sitting); **§10 kit currency added
2026-09-03 (kogaki#633)**.
**Governs:** the tsurezure client kit's **consumer-side** contract — what a kit
install delivers by default, and what a kit-installed sitting owes.

## 0. Why this spec exists, and the boundary it does not cross

The kit's ratified contract is **hub-side**: `product-lab
specs/tsurezure-client-kit.md`, ratified 2026-08-04, named as the governing
spec by this repository's own carrier —

> "The consumer half of the seam, as one install (tsurezure-gateway#78;
> spec: `product-lab specs/tsurezure-client-kit.md`, RATIFIED 2026-08-04)."

`policy/kit/README.md::RATIFIED 2026-08-04).`

Kogaki holds the kit on an **interim** basis and **cannot write to the hub**.
The seam is read-only — "insights are staged as proposals through the hub's own
intake, never written directly" (`CLAUDE.md`, the managed block) — so a
consumer-side clause has nowhere hub-side to land, and until this file existed
it had nowhere kogaki-side either. That absence is the 6a finding both #325 and
#326 produced independently: the invariant was **implicit**, held in
`policy/kit/README.md`'s prose and in an install script.

`specs/SPEC.md::declared baseline has a **fresh** design` (§4.5.1 clause 2) makes the consequence exact — a
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
`policy_lookup` (`policy/CAPABILITIES.md::one bounded question → matched served lines (the default consultation path)`)
— through the existing transport
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

`specs/SPEC.md::also **committed** is a separate decision that each carrier makes and states.`
(§2.5.2) binds this, and both halves are load-bearing:

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
and never directory adjacency" (`policy/kit/README.md::never a committed path and never directory adjacency`)
— so CI cannot
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

### 3.6 Legibility is a VIEW defect, and the return channel was §4

A headline that cannot ground a consumer conversation in plain register is a
defect **of the served view**, not of the reader. Its return channel was the
emission duty of §4, retired by the hub on 2026-08-21; a sitting that finds an
illegible headline carries that finding to the hub by the hub's own route, like
any other durable learning. This is the one place the two clauses of this spec
were designed to compose rather than merely coexist.

## 4. The emission duty, retired (kogaki#326, kogaki#498, kogaki#1631)

The hub removed the kit's emission duty on 2026-08-21 (knowledge-architecture
D4, with the retirement of `/qa-mine`): the duty fed the miner, the miner was
retired, the emission pile had no arriving consumer, and re-pointing emissions
at `/ask` was declined. The removal was delivered to kogaki#498 on 2026-08-23
and discharged here by kogaki#1631. A durable learning — an investigation
finding, a reversal, a correction, a design decision — is staged in the hub's
own staging directory by the hub's own route, never by a file in this
repository. The 933 emission files written under the duty are kept as history
in `graveyard/emissions/` and are read by no check.

Later sections cite three clauses of the retired duty as precedent: §4.3
(source sensitivity decides what a consumer may commit), §4.5 (an absence is
reported, never gated) and §4.6 (cadence coupling declined). Those citations
read against this note; the discipline each names stands in the citing
section on its own ground.

## 5. What binds a consumer, and what binds the kit

| clause | binds |
| --- | --- |
| §3.1–3.2 digest content and kit-side composition | the **kit** |
| §3.3 repo-visible, not committed (default) | the **kit's default**; a consumer may decide otherwise explicitly, in its own tree |
| §3.4 refresh at sitting start | the **kit command**, and the sitting that runs it |
| §3.5 awareness-never-substitution | every **sitting** |
| §4 the emission duty, retired | nobody since 2026-08-21; a durable learning goes to the hub by the hub's own route |
| §8.1 Question/Answer/Conclusion, pins off the owner surface | every **sitting** |
| §8.2 the owner-register rendering the kit emits | the **kit** (`consult.mjs`); the skill relays, and is never the sole carrier |
| §8.3 the pin-token deny | the **kit**, as a declared fast path only |
| §9.1 the conduct-axis facet in the map template | the **kit** (seed); the consumer's own map thereafter |
| §9.2 the `axis:` key's SHAPE | the consuming repo's `specs/SPEC.md` §4; the **hub** owns its values |
| §10.2 the stamp, written at install | the **kit** (`install.sh`) |
| §10.2 the currency check's verdict states | the **consumer's registered suite** |
| §10.2 the declared consumer list | the **Home** |
| §10.3 the stamp is COMMITTED | the **kit's default**; the second instance of §4.3's source-sensitivity discriminator, not a second exception rule |

## 6. Out of scope, by decision

- **A gateway `shape` endpoint** — §3.2, with its reopen trigger.
- **Hub sweep cadence** — §4.6.
- **Promotion of any emission** — the duty is retired (§4); a durable learning
  reaches the hub's gate by the hub's own route, never from a file here.
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
- **A Home-side sweep over the declared consumer list** — §10.2 ships the
  declaration and no reader of it; §4.6's decline of cadence coupling binds
  here unchanged, and a scheduled reader is not minted by this amendment.
- **The `subject | conduct` value set** — §9.2; **RATIFIED by the hub
  2026-08-13 and enforced consumer-side 2026-08-28 (kogaki#673).** No consumer
  and no kit may MINT it, which is unchanged and is a different act from copying
  a set the hub has served.

## 7. Open — carried as questions, never as contract

1. **Digest scoping when a consumer carries no `projects:` membership.** The
   served surface's `projects:` axis is the scoping key for item 1 of §3.1;
   what a consumer with zero matching lessons receives — an empty digest, or
   the unscoped tier-1 index — is undecided. Implementations render the empty
   case explicitly rather than choosing silently, per this repository's
   standing zero-rendering discipline.
2. ~~**Whether the lane read of §4.5 is one read or per-lane.**~~ **CLOSED
   2026-11-07 (kogaki#1631):** the duty and its lane read were retired with §4;
   the question has no subject. Struck rather than deleted, as item 3 is.
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

5. ~~**What an ACCEPTED and a DECLINED emission's file owes** (§4.7).~~ **CLOSED
   2026-11-07 (kogaki#1631):** the hub retired the duty on 2026-08-21 (§4) and no
   emission will be dispositioned, so the slot
   `emission-accepted-and-declined-lifecycle` is withdrawn rather than filled.

## 8. The owner-register rendering of a consultation (kogaki#320)

**Owner ruling 2026-08-09.** A consultation reaches the owner today as a pin
block — `consulted: <repo>@<sha> <file>:<line>`, `request_id:` — which tells them
exactly one thing, *that a consultation happened*, and nothing they can act on.

### 8.1 Three parts, and the pin is not one of them

An owner-facing display of a consultation carries **Question**, **Answer** and
**Conclusion**: the question verbatim, what the served surface answered as
readable text rather than as an address, and the conclusion drawn from it.

**Presentation:** this does not fit inside a question UI, so it does not go
there. **Before a question UI appears, ordinary displayed output carries Question
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
`.claude/hooks/` here holds **nothing tracked at all** since kogaki#630
retired `review-trigger.py` with the reviewer stack — so the grep this
subsection anticipates now returns an empty directory rather than one
unrelated file, which is the same stall in a slightly cheaper form
(PR #631 round 1, finding 5). A reader who greps for it
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
join across the boundary.

**THE HUB HAS RATIFIED IT, and the constraint this section carried is
DISCHARGED rather than merely lapsed (kogaki#673, 2026-08-28).** The sentence
that stood here — *"neither this kit nor any consumer enumerates the axes, and a
check may validate position and non-emptiness only"* — was correct while the set
was unserved, and it is retired now that it is:

> "The consultation seam's question-axis value set is RATIFIED as
> `subject | conduct`, closed, carried by the seam's two existing instruments
> and never by a third mechanism."

`consulted: product-lab@b20d85ea9c2a6ba24542e7caa003ef42efce33b2 topics/knowledge-architecture.md:150`

and the same ratification assigns the discharging act to the consumer by name —
*"Enforcement (moving `check-consult-receipts.sh` from shape-only to
value-checking) is the consumer's act"*
(`…topics/knowledge-architecture.md:103`). So a consumer check **validates the
token against the ratified closed set**, and `checks/check-consult-receipts.sh`
does.

**The boundary-field rule above is untouched, because copying is not minting.**
Nothing here decides what the values are; a third value is the hub's act under
the growth rule that shipped with the ratification. What a consumer still may
not do is judge **content** — whether a query is *really* conduct-shaped — which
the same served line forbids as "judgment wearing a check's clothes". The token
is checked; the query never is.

**Why this sentence is corrected here and not only in the consuming
repository.** This spec is the surface a *second* consumer installs the kit
from, so a constraint left standing here is served to every consumer born after
it stopped being true — which is the drift the two-carrier rule exists to
prevent, at the one site where post-merge repair stops being cheap.

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

**deferred slots:** the emitter (§9.3). **The `subject | conduct` value set
(§9.2) is FILLED** — the hub ratified it 2026-08-13 and the consumer-side
enforcement landed 2026-08-28 (kogaki#673); it is listed as discharged rather
than dropped, so a reader of an older revision can tell a filled slot from one
that was quietly removed.

## 10. Kit currency — an installed copy knows it is behind (kogaki#633)

### 10.1 What was missing, and why a convention could not carry it

The kit was built for multiple consumers — `install.sh --repo <path> --consumer
<name>`, idempotent, templates create-only-when-absent, a degraded install still
valid. What it has never had is a way for an installed copy to know it is
**behind**. With one consumer that gap is invisible; with two it is the whole
maintenance problem, and "keep the copies in sync" is a prose obligation of
exactly the kind §2 already rules advisory.

The served position discriminates the shape, and it is quoted whole at its pin
rather than paraphrased:

> "a local copy of a centrally-managed artifact is a FORK WITH NO FORK'S
> DISCIPLINE — no version stamp, no staleness check, no declared divergence.
> Either the consumer loads the centre's artifact (and the centre owes it a
> loadable path), or the copy is a DECLARED fork carrying its own version and
> its own reason. The one thing it may not be is an undeclared duplicate that
> looks like the original."

`consulted: product-lab@4eb5bc6659494a70c0ae82e8527495f16d6f765a topics/claude-code-ops.md:103`
  request_id: 176a6689-56dc-4961-b001-8bbe199ada25
  outcome: discriminating
  query: How should a vendored copy of a centrally-maintained kit know it is behind its home, and where should the version stamp live — committed in the consumer or machine-local? What does admitting a new staleness check into a consumer's suite owe?

### 10.2 The clause

**A kit copy carries a stamp, and the stamp is written by the install.** The
installer writes `policy/kit/.kit-version` into the consumer, naming the Home
repository, the Home revision the copy came from, and the install date, beside a
manifest digest over the vendored kit files. **A copy without provenance cannot
exist**, because the act that produces the copy is the act that stamps it — the
`constrains:` half, and the reason this is not a rule about copies that already
exist.

**The consumer runs the currency check; it reports and never gates.** A
registered check reads the stamp and renders exactly one of:

- **`current`** — the stamp's revision is the Home's current revision;
- **`behind <n>`** — naming the delta, by file;
- **`cannot-determine`** — the Home was not reachable. **Never `current`.**
- **`home`** — this tree holds the kit as its source and owes no stamp. See the
  Home exemption below; it is rendered, never silent.

**A stamp that is absent, malformed, or disagrees with its manifest FAILS —
IN A CONSUMER.** That is the one condition this check denies on, and it denies
on it because it is a fact about the consumer's own tree: no cross-repo read is
involved, so the denial cannot fire on someone else's availability.

**THE HOME IS EXEMPT, and the exemption is stated here rather than invented in
the implementation.** Kogaki holds `policy/kit/` as the kit's **source** (§0,
interim) and was never installed *into*, so it has no install act to write a
stamp and no Home to be behind — it *is* the Home. Yet the currency check
registers into `checks/registry.json` from `policy/kit/registry-entries.json`
exactly as the four existing seam checks do, so it runs in the Home like every
other member. Without this clause it would deny there, on a missing
`.kit-version` the Home is not supposed to have.

**The exemption is keyed on the kit being the SOURCE, never on a repository
name.** A tree in which `policy/kit/` is the authoritative copy renders
`home — no stamp owed` and passes; a tree holding a derived copy owes its
stamp. Keying on `tim-nish/kogaki` would be the enumeration shape this
repository refuses elsewhere, and it would break at the very event §10.4 names
as this check's removal signal. The **`home` verdict is rendered, never
silent** — a reader who cannot see that the check ran and exempted cannot tell
this from a check that never looked, which is the same disclosure discipline
§4.5 and §10.2's `cannot-determine` already carry.

**Nothing in a consumer's suite fails merely because the Home moved.** Blocking
a consumer's suite on the Home's revision would couple two repositories' release
cadences, which is the coupling the eventual dedicated repository exists to
remove. This is the same report-never-gate posture §3.4 and §4.5 already carry,
and it is stated here rather than inherited by implication.

**The Home declares its consumers.** `policy/kit/consumers.json` in the Home
makes *"who is behind?"* answerable from the Home rather than by walking a
machine. It is a declaration, not a sweep: §4.6's decline of cadence coupling
binds here unchanged, and no scheduled reader is minted.

### 10.3 Where the stamp lives, and what it is durable against

**The stamp is COMMITTED**, and it is the **second** kit artifact to answer
§3.3's repo-visible-not-committed default the other way — §4.3 already sites the
emission as committed, "the opposite of §3.3's answer, on the same axis, for a
stated reason". Saying "the one exception" here would have been false, and false
in the way §4.3 warns about: two decisions that look like one.

**§4.3's discriminator is source sensitivity, and it decides this clause too.**
§3.3's digest derives from **hub** material and committing it would declassify;
an emission is authored consumer-side, so committing it declassifies nothing.
A stamp names a **public revision of the Home and a digest of files the consumer
already holds** — it carries no hub-derived content at all, so it falls on the
committable side of the same discriminator rather than needing a new one. What
is added here is not a second exception rule but a second instance of §4.3's
rule, and the further ground is served:

> "…the durable pole owes a statement of WHAT IT IS DURABLE AGAINST — a process,
> a working copy, a clone, or the repository — because a carrier that cannot be
> committed satisfies the word while failing every reader's reading of it."

`consulted: product-lab@4eb5bc6659494a70c0ae82e8527495f16d6f765a topics/claude-code-ops.md:158`
  request_id: 176a6689-56dc-4961-b001-8bbe199ada25
  outcome: discriminating
  query: How should a vendored copy of a centrally-maintained kit know it is behind its home, and where should the version stamp live — committed in the consumer or machine-local? What does admitting a new staleness check into a consumer's suite owe?

A machine-local stamp is durable against a **working copy** only, so a fresh
clone would inherit no provenance and the check would read `cannot-determine`
on every clone — indistinguishable from an unreachable Home. Provenance must
survive a **clone**, so the stamp is committed and is named here as such.

**This does not move the gateway's location.**
`policy/kit/README.md::never a committed path and never directory adjacency`
keeps the gateway machine-local — "never a committed path and never directory
adjacency" — and a version stamp is not a path. The two are separate carriers
with deliberately opposite durability, and this clause states the difference
rather than leaving a reader to reconcile it.

### 10.4 The check enters the registry like every other member

The currency check is a **registered** check and owes the full admission record
`checks/check-registry-conformance.sh` already enforces — `contract`, `license`,
`tier`, `removal_signal`, an observing `removal_instrument`, and `efficacy`
evidence. It is named here because §10.2 mints a check, and the kernel is
served: admission carries a removal signal declared at birth. Its entry ships in
`policy/kit/registry-entries.json` under the kit-is-the-SOURCE precedence
kogaki#724 already established, so a consumer's copy cannot drift silently.

**Its removal signal is stated at birth, in this clause:** the kit's separation
into its own repository with a package-manager-shaped distribution, at which
point currency is the distributor's property and this check has no subject.

### 10.5 The exercise is a FIXTURE, and that is a finding rather than a shortfall

**No consumer is kit-installed at its committed state.** Read live 2026-09-03:
`tim-nish/claude-toolkit` on `main` tracks nothing of the kit — `git ls-files
policy .claude/skills/consult-first checks` returns empty and `CLAUDE.md`
carries no `tsurezure-client-kit:begin` marker; the `policy/emissions/` (written
under the duty §4 has since retired) and `policy/shape.md` present in that
working copy are untracked kit *outputs*, not the kit. So §0's "claude-toolkit
is its first staleness consumer" describes an intent, not an instantiation.

The consequence is stated rather than discovered: **the reporting direction is
exercised against a deliberately-stale FIXTURE**, never against a live second
consumer, and an acceptance claim that reads otherwise is asserting a consumer
that does not exist. The served line is exact about why the fixture is still
owed:

> "'Is the automation installed?', 'is it the current version?', 'is it firing?'
> and 'is it doing anything?' are four different questions, and the first three
> can all be yes while the fourth is no."

`consulted: product-lab@4eb5bc6659494a70c0ae82e8527495f16d6f765a gloss/lessons/claude-code-ops.md:275`
  request_id: 176a6689-56dc-4961-b001-8bbe199ada25
  outcome: discriminating
  query: How should a vendored copy of a centrally-maintained kit know it is behind its home, and where should the version stamp live — committed in the consumer or machine-local? What does admitting a new staleness check into a consumer's suite owe?

A currency check exercised only on a current copy answers the first three and
never the fourth.

### 10.6 The two declined arms, recorded so neither is re-proposed blind

**A2 — the consumer declares and the Home computes.** The consumer's check
verifies only stamp integrity against its manifest; "behind" is answered by a
Home-side report over `consumers.json`. It is the cleanest reading of the served
declared-fork arm and has no `cannot-determine` state to design at all.
**Declined** because the "behind" answer would then be carrier-less by
construction: a Home-side report is an act nobody is obliged to perform, which
is the advisory shape §2 rules out, while the consumer's suite is an act that
already happens.

**A3 — no copy; the centre owes a loadable path.** The arm the served line names
*first*, and the one matching kogaki#9's machine-local founding rule most
closely. **Declined on a mechanical fact rather than on taste:** `checks/registry.json`'s
`file` field is a committed path and four seam checks are registered under
`policy/kit/checks/…`, so a machine-local kit directory cannot be registered or
run in CI at all. It also reopens what the kit installs, which kogaki#633 places
out of scope. Recorded here because it stays the right shape the moment the kit
becomes a distributed package — which is §10.4's removal signal, and the two are
deliberately the same event.

### 10.7 deferred slots

**`kit-currency-home-resolution`** — how the check *reaches* the Home is not
decided here. `--home <path>`, an environment variable, and a stamped remote URL
are all admissible and none is chosen, because the choice turns on facts about
CI availability this sitting did not read. Until it is filled, `cannot-determine`
is the expected CI reading and §10.2 already says so. **Filling it is its own
decision act** with its own consult and receipt, per the decide-or-name rule.

**`kit-currency-divergence-declaration`** — the served line's third property, a
**declared divergence**, is not built. §10.2's manifest digest detects that a copy
differs from its stamp; it carries no way to declare a difference as intended.
Named rather than left, because a manifest with no declaration channel makes an
intentional local fix indistinguishable from drift.

### 10.8 Boundary-values currency, a second reading beside the tree-manifest one (kogaki#1205)

**§10.2's currency verdict is about the KIT'S FILES; this is about VALUES a
consumer copies out of them.** `check-consult-receipts.sh` and
`check-boundary-receipts.sh` validate several fields — `outcome`, `axis`,
`facet`, `tactic`, `disposition`, and the receipt address form itself — whose
**values** the boundary-field rule assigns to the hub, never to a consumer
(product-lab@4cc496b `topics/knowledge-architecture.md:50`: "a consumer owns
the SHAPE of its own record and NEVER the VALUES of a field that exists to
join across the boundary"). Those six sets live in `policy/kit/boundary-values.json`,
each entry carrying the `pin` it was copied from, and the two checks above load
the file at run time rather than holding the sets as literals.

**`check-kit-currency.sh` compares that file against the gateway.** Beside the
§10.2 tree-manifest reading, it calls the gateway's `boundary_values` tool
(tsurezure-gateway#123) through `policy/kit/bin/gateway-query.mjs`, and reports
each of the six sets by name as agreeing with the served value or differing —
naming BOTH values on a difference, so a reader is told what changed and not
merely that it did. A transport failure and a served miss are reported AS
SUCH, on the same disclosure discipline §4.5 and §10.2 already carry: neither
is folded into `current`, because a `failed` or `found nothing` answer is not
evidence that the copy agrees.

**This reading is report-only, on the same posture as §10.2's.** Blocking this
repository's suite on the gateway's answer would be the release-cadence
coupling §10.2 already declines for the tree-manifest reading, and the reason
carries over unchanged: the gating reading of this comparison belongs to
claude-toolkit's Preflight, not to a member registered here.

**Exercised against a stub, on the same ground as §10.5.** `boundary_values` is
not yet served (tsurezure-gateway#123 is out of scope for kogaki#1205), so this
reading is exercised in the check's fixture pass against a stub gateway process
answering match, diff, and miss shapes — the same "no live second consumer, so
exercise the reporting direction against a deliberately-built fixture" ground
§10.5 already states, applied to a gateway tool rather than to a kit tree. The
live invocation in this repository today reads `failed`, honestly, because the
tool it asks for does not exist yet.
