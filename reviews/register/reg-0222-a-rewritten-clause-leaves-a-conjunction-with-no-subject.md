---
id: reg-0222
status: pending
observed_at_pr: 782
observed_at_head: 825bd68
class: in-diff
recorded: 2026-09-03
source_comment:
---
in-diff: PR #782 round 2 — `specs/SPEC.md:5155` carries an **orphaned
fragment**. Manifest item 6 now ends *"…the decline is recorded at DESIGN.md §7.
And / binds **no authored style clause**: the contract instance is
owner-authored"*.

**"And binds" has lost its subject.** In the pre-edit text the subject was the
`specs/spec-style-contract/SPEC.md` clause that the rewrite replaced with a full
stop, so the sentence now opens with a capitalised conjunction and a verb
attached to nothing.

**Same class as round 1's finding in `src/brief.mjs`, on a different file, and
it survived the commit that fixed that one.** Both were produced by the same
motion — replacing a citation mid-sentence and not re-reading the sentence — and
round 1 named the class explicitly. The second instance was in the diff at the
moment the first was being repaired.

**Why a repointing sweep produces this and a normal edit does not.** A sweep
visits sites by PATTERN, so the unit of attention is the matched span rather
than the sentence containing it. Replacing a span leaves the surrounding grammar
unchecked by construction, and the more sites a sweep touches the more certain
it is that at least one lands mid-clause. The repair is to re-read the
**sentence** at every hit, which is the one thing a pattern-driven pass does not
do for free — and to prefer a rewrite of the sentence over a substitution inside
it wherever the citation is load-bearing to the syntax.

**Not fixed at the head that produced it.** The bound was spent and the round-2
report certified `825bd68` — `consulted:
product-lab@836e5f3acb3fbc544ff1bfa6d4f1f65a14a50933
topics/claude-code-ops.md:154`. Routed here rather than to kogaki#749, which
closed at this merge.

Sixteenth instance in this sitting of that composition; see reg-0206 to reg-0221.

**REPAIRED at kogaki#750** (merge `8e928a7`, 2026-09-03). `specs/SPEC.md`
manifest item 6 now reads *"This pipeline binds no authored style clause"* — the
sentence rewritten rather than the conjunction patched, which is this record's
own prescription.
