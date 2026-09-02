---
id: reg-0219
status: pending
observed_at_pr: 781
observed_at_head: ce4367c
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #781 round 2 — case (o)'s two fixture branches **mint the same
candidate ids**. The one-Strand branch pushes `thesis-1`/`thesis-2` and the
multi-Strand branch pushes `thesis-1`..`thesis-3`, so the concatenated fixture
holds two candidates called `thesis-1`, and the failure message —
`(o) candidate ${c.id} carries no round-trip concession` — **cannot tell the
reader which branch lost its concession**.

**The case discriminates correctly.** It fails when either branch drops the
positional argument, which is the property round 1 asked for. Only the *message*
is ambiguous, and the length assertion above it already says "across both
branches", so a reader is not left without any signal.

**The shape, which is why it is kept.** A fixture built by CONCATENATING two
generator outputs inherits both id namespaces, and the ids were never designed
to be unique across them — each branch numbers from one because each branch was
the whole population when it was written. Widening a case by union is the
cheapest way to reach a second branch and it silently makes the record's own key
non-unique.

The repair is a prefix at the fixture rather than a rename in the generator:
the ids are the composer's own and the ambiguity belongs to the case that joined
them.

**Same accretion class this suite family keeps recording** — a refusal that
fires truly while naming its subject imprecisely.

**Not fixed at the head that produced it.** The two-round bound was spent and
the round-2 report certified `ce4367c` — `consulted:
product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`.

Thirteenth instance in this sitting of that composition; see reg-0206 to
reg-0218.
