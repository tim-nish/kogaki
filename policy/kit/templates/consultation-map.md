# Consultation map — the occasions file

Boundaries at which policy consultation is **required** before acting.
Contract (spec: `product-lab specs/tsurezure-client-kit.md` §3):

- An entry = **trigger terms** + a one-line summary **quoting the served
  line at its pin** + the pointer. Never a paraphrased rule — on divergence
  the served surface wins and the entry is repaired.
- Entries are added **only on a miss**: a defect that consultation would
  have prevented, exposed in this repo. Each addition names the miss.
- The map **triggers consultation, never carries verdicts.** The answer
  stays in the substrate.

## Entries

### 1. Check/CI infrastructure — creating, renaming, or modifying checks, hooks, or the check registry

- **Trigger terms:** check, checker, hook, CI, registry, lint, gate script
- **Served line (pinned):** "a check suite is budgeted at its loop position;
  suite membership is opt-in per loop; admission carries a removal signal
  declared at birth" — `topics/claude-code-ops.md`, the 2026-08-04
  governance lines (product-lab#150 protects the build-vs-adopt clause).
- **Origin miss:** a consumer suite reached 170+ members with no admission
  economics (writing-assistant, retired 2026-08-04); the seed entry exists
  so the recurrence is caught at the first act that should have consulted.

## The conduct axis — a facet of every entry, not a fourth entry

**Seeded with the kit (kogaki#336).** The entries above are *act-scoped*: each
names a class of act and the survey owed before performing it. That scoping
answers **what the act is about** — its subject — and answers nothing about
**how the act is conducted**, which is a second and independent question. The
observed shape is a consult that read the served surface for its subject, found
it, and never asked whether the *manner* of the act was itself governed — so
the gate presented with no visible mismatch, because nothing had asked the
question that would produce one.

**The boundary is bound at a STRUCTURAL TRIGGER, deliberately not at an
enumeration of acts:**

> **composing a gate for the human.**

Every act reaching that point owes the conduct facet, whatever entry its
subject falls under and whether or not any entry above names it. An enumeration
of conduct-bearing acts is declined for the reason this file gives against
enumerations elsewhere: act N+1 is uncovered by default, and the acts that most
need the facet are the ones nobody thought to list.

**The obligation: a grounding block owes ONE QUERY PER AXIS.** A gate composed
with a single query has grounded its subject and left its conduct ungrounded,
and the two are not substitutable.

**Recording it.** Where the axes are written on a receipt, each query carries
its own `axis:` continuation line, binding upward to the nearest preceding
`query:`. The grammar is the consuming repository's §4 receipt block. **The key
is hand-written today** — no kit binary emits it — so the obligation above is
carried by this prescription and not yet by an instrument.

**The value set naming the axes is the hub's to ratify, never this file's.**
Nothing here enumerates the axes it requires one query for.

**The axis value set is RATIFIED as `subject | conduct`** — closed, and the
hub's, exactly as the sentence above says. It was ratified 2026-08-13 and the
consumer-side enforcement landed 2026-08-28; a consumer's receipt check
validates the **token** against that set and never the **content**, since
judging whether a query is really conduct-shaped is judgment wearing a check's
clothes.

**This is not a slot a consumer fills.** A third value is the hub's act under
its own growth rule — a specimen of a rule that provably existed, was served at
the pin, and was missed on an axis neither value covers. Catches never justify
expansion, and copying a served set is not minting it.
