---
id: reg-0149
status: pending
observed_at_pr: 575
observed_at_head: f87b730883eed762b4df2419330a97cc9a27d94b
class:
recorded: 2026-08-20
source_comment: 5357340583
---
Append from the review lane — PR #575, round 2, head `f87b730883eed762b4df2419330a97cc9a27d94b`.

Three rows, all **spent-bound carries** (kogaki#374 row kind) and therefore
**instance-class**: their value is the defect each names, not a count. None of
them is an `out-of-dimension:` line, so **none counts toward rule 3's
three-of-a-class widening trigger.**

1. **`gates/registry.json` delegates its standing to a text that contradicts
   it.** The `brief-thesis-adoption.dynamic_options` clause now reads "WHAT
   THAT CONDITION NOW STANDS AT is read from kogaki#567 and from §5.3, never
   asserted here", while `specs/spec-draft-pipeline/SPEC.md:1470-1476` still
   declares the option **body** as the site and the placement as
   "try-one-first, not settled". kogaki#567 carries the fired condition, so the
   pointer is not empty — but half the pair it names says the opposite of the
   clause one sentence above it. The omission is licensed (#567 excludes spec
   files; v11 pre-authorizes the move "without amendment here"), so the remedy
   is one sentence in §5.3 at the next spec sitting that touches it, not in
   this PR. Reported at round 1 as inert; the round-2 repair made it
   load-bearing.

2. **#567's Scope section and its licence ledger disagree about
   `checks/check-brief-entry.sh`.** The file is changed by PR #575 and named by
   none of the issue's three Scope bullets, though the ledger for #567 does
   name it. Not a scope defect in the diff — an authoring-side gap between an
   issue's prose scope and its ledger, which is where a reviewer reads
   authorization from.

3. **`checks/check-brief-entry.sh:797-800` — the mutation roll-up's narrative
   did not travel with its number.** The header reads THIRTY over seven groups
   while the sentence beneath still reads "the groups sum to 5 + 6 + 5 + 3 + 2
   = TWENTY-ONE and the header read TWENTY". Recoverable as history from the
   sentence's own "INDEPENDENTLY of this head", and it is the exact drift the
   sentence exists to warn about, one layer up.
