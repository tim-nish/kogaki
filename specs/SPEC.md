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
  review-lane report authored outside the authoring session before merge**,
  and the mechanical half asserts that report's **presence** — a computable
  fact — while never reading its content, which stays judgment. The transport
  that produces the report is the implementing story's choice; what this
  clause binds is the property and its presence check.

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
- **Issue checkpoints:** issues carry policy pins; checked at creation and
  at pickup against the current served surface
  (`topics/claude-code-ops.md` 2026-08-04). Where an issue body matches a
  mapped boundary's trigger terms, the same authoring layer requires either
  an attached consult receipt or an explicit `consult: deferred-to-pickup`
  marker that the pickup recheck then enforces. The occasion thus fires at
  the two checkpoints the lifecycle **already owns** — authoring and pickup —
  with no new ceremony and no third gate (kogaki#25).
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
  **its queries verbatim**. The request id is a join key, not a read: it lets
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
