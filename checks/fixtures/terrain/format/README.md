# The golden specimens (SPEC-terrain §14.5, story 1.55, kogaki#347)

**FOUR at v24 (kogaki#636)** — `tag-listing.txt` and `tag-row-listing.txt` join
the two below, because `report-format.json` mints the two pre-selection surfaces
from §9's allowlist. **Both carry assertion 1 only.** Assertion 2 needs a
renderer that writes the surface's artifact, and these two write none: they are
printed by the owner-executed `tags` and `tag-rows` (§6.0 v29, kogaki#682), so
there is no artifact for a second assertion to read. The check's green line
reports that split (`2 of them asserted TWICE and 2 ONCE`) rather than averaging
it — claiming TWICE for a surface asserted ONCE is exactly the defect kogaki#636
was filed over.

**RENAMED AT v29 (kogaki#682, PR #704 round 1).** The specimens were
`tag-screen.txt` and `tag-row-view.txt`. A Screen is the rendering written AFTER
a tag has been selected, so a filename carrying `screen` for a pre-selection
rendering restated the superseded definition in the name — the same ground on
which `report-format.json` v11 renamed the surfaces themselves, applied one
layer out.

Historically, and the per-covered-surface rule that produced the change:
one specimen per surface the grammar covers. Two at v14 —
`cotag-screen.txt` and `full-report.md` — because
`src/report-format.json` covers `cotag_screen` and `full_report`
and marks the other four owner surfaces uncovered under their own reopen
trigger. **This is a per-covered-surface count, not a flat number**: the sitting
that brings a third surface under the grammar adds its specimen here and does
not have to choose between under-coverage and contradicting a clause.

`consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 gloss/lessons/testing.md:47`

> When one program publishes text for another to read, adding something new to
> that text can break the reader … Nobody catches it because **each side has its
> own tests: the publisher's confirm it wrote the new format, the reader's
> confirm it still reads the old one, and nothing checks the pair.** Give the
> format one shared example that both sides run against — or better, publish
> labelled fields instead of text, so there is nothing left to misread.

**That line is why the specimen is asserted TWICE rather than once**, and the
pairing below is not belt-and-braces: the grammar is the reader's side and the
renderer is the publisher's, each already had its own test, and neither checked
the pair. The specimen IS the shared example.

**Its "or better" clause is residue, named rather than quietly passed over.**
Publishing labelled fields instead of text would remove the misreading
altogether — and the Full Report's machine record already does exactly that
(§12.1), which is why the record was never the surface that broke. The owner
*rendering* is Markdown because its whole job is to be read (§12.2 v11), so the
text half cannot be published away here. The shared example is the available
half of that line, not the whole of it.

## SQ1 — hand-authored, not generated, and the reason (story 1.55 asks for it here)

The story left this open: generated keeps the specimen honest as the emitters
change; hand-authored keeps it independent of the code it checks. **Hand-authored
wins, and the served surface decides it rather than taste:**

> A verification artifact must be bound to the behavior it claims to verify by
> something other than its author's belief that it is … **the fixture supplies
> the value under test**, the assertion binds a proxy rather than the property …
>
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/claude-code-ops.md:23`, and `LESSONS.md:19`

A specimen emitted by the emitters it checks is that first form exactly: the
renderer would be asserting its own output correct, and any shape it drifted
into would become the baseline in the same commit that introduced the drift.
The sibling line is as direct —

> Co-authorship is not grounding … the two artifacts were never run against
> each other before both were committed.
>
> `consulted: product-lab@4cc496b39be1d7641aaaaf678668fb64eda35f17 topics/archive/claude-code-ops.md:68`

**What "hand-authored" honestly means here.** These bytes were written by hand
and reviewed line by line against `report-format.json` and SPEC-terrain §6.1,
§6.2 and §12 — not typed blind. The binding that makes that reviewable rather
than a claim about my care is the check's **two independent assertions**:

1. each specimen is **conformant against the grammar**, evaluated by the same
   predicate the emitters refuse with; and
2. the renderer's output over the committed input **equals** the specimen.

Assertion 1 is what a generated fixture cannot give: a renderer defect that
violates the grammar can never be blessed into the baseline, because the
baseline is checked against the contract and not only against the code.

## SQ2 — no new committed survey record was needed, and §12.2 is never approached

The story flagged that a generated specimen needs a committed input, and that
whether a synthetic survey record may be committed is cannot-determine under
§12.2 v11. **The question dissolves.** The input is
`checks/fixtures/terrain/cotags/lone-tag-member.json`, which was already
committed, for this suite, long before this story — so no new record is
committed and §12.2's non-commit rule (about real records carrying real
material) is not touched from either side.

The Gloss bodies come from the stub gateway at
`checks/fixtures/terrain/compose-input/stub-gateway.mjs`, also already
committed. Without it the specimen would be ABNORMAL markers all the way down
and would catch nothing about the material a report is supposed to carry — the
pre-#234 defect this file exists downstream of.

## AC5 — the fixture never wins

`src/report-format.json` is authoritative (§14.1, §14.5). Where
a specimen and the grammar disagree, **the specimen is what is reported stale**,
and the check says so in those words. A fixture that could ratify a shape would
be the second carrier this decomposition removes.

## AC6 — a specimen, not a corpus

The response to a future format incident is **a grammar edit and a regenerated
specimen**, never an additional fixture per incident. §14.2 names "a check suite
growing at roughly one member per incident" as the tell, and a fixture directory
is the obvious place for that growth to resume. Two files, one per covered
surface; a third arrives only with a third covered surface.
