# SPEC references in `src/` — the one carrier

**This file is the standing paragraph.** Every `src/` file that names spec
content carries a `SPEC REFERENCES IN THIS FILE` header pointing here, plus its
own table of the names it uses. The rule is written once; the names are
per-file, because the names are the part that genuinely differs.

Origin: kogaki#902 (owner ruling 2026-09-05) states the rule. kogaki#982
collapsed it to this carrier.

## The rule

**Implemented code does not refer to a Spec.** Content a file was implemented
against is **copied into that file**, and what is copied there is what the code
was implemented against — **not the spec's current text**. The copy stays true
for its file even if the spec is rewritten or deleted, and propagating a later
spec change into a file is a **separate, explicit act**.

## The two markers

A file marks what it copies and what it merely points at, so a reader can tell
authority from navigation without leaving the file:

| marker | what it means |
|---|---|
| `[implemented-against: <spec> "<name>", copied <date>]` | the text beside it is a **copy** of what this code was implemented against, and it is what the code answers to |
| `[see: <spec> "<name>"]` | a **pointer carrying no authority** — navigation only |

**A bare name in a file's names table is a `[see: …]` pointer**, and carries no
authority; where the content is stated at the site it is a copy under the first
marker.

## What a reference never names

**Neither marker names a section number or a line range**, because both
renumber. This is measured rather than feared: the line range `src/cite-check.mjs`
used to print to the owner had already drifted onto an unrelated bullet, and
three of `src/runs.mjs`'s section numbers did not resolve to the content they
were cited for.

**No owner-facing string names a spec section**, for the same reason one level
out: an owner reading a rendered surface cannot check a number that has moved.

## Why one carrier rather than a copy per file (kogaki#982)

The header was written into fifteen `src/` carriers, and by the time nine more
files were owed one it had **already drifted into eight distinct variants** —
five files stating the rule one way, two stating it with the marker vocabulary,
and six holding one-off wordings each. The two live conventions had stopped
naming each other, so a reader of one file could not tell which was in force.

The served position is the operative half:

> "When one rule is written into two carriers that do not name each other, they
> drift silently and the divergence surfaces only at the moment some act needs
> both to agree — so the repair is never just correcting the wrong side: each
> carrier must cite the other at the point of the rule, or the same drift
> recurs at the next edit of either; and the correction is made at whichever
> carrier can express the exception in an enumerable form, because that keeps
> the fix an exception rather than a hole."

`consulted: product-lab@32852644ba503e9fa904280f386c61f3de32e667 LESSONS.md:68`

"Each carrier must cite the other" is tractable at two carriers and not at
twenty-four. One carrier every file cites is that repair in the enumerable form
the line asks for.

**Two arms were declined, recorded so neither is re-proposed blind.** *Add the
header to the nine* — declined: it writes nine further copies of a paragraph
that already exists in eight inconsistent versions, and the instrument that
finds variant nine is a reader noticing. *Keep the copies and assert they agree
with a check* — declined: a byte-identity check fails on day one against all
fifteen, so it contains this collapse in full and then admits a check on top of
it, and a check owes a removal signal declared at birth
(`consulted: product-lab@32852644ba503e9fa904280f386c61f3de32e667 LESSONS.md:119`)
which no current member carries.

**The cost, stated rather than discovered.** A reader of one file meets a
pointer to this rule rather than the rule itself. That is accepted because the
paragraph is a **records convention** and not a prohibition enforced at the
site; the part that is genuinely per-file — the names table — stays where it is.

## The names table, and what "exhaustive" means (kogaki#987)

**A file's names table lists the names THAT FILE uses, read over the whole
file.** Not over one field, not over one marker, not over the lines a grep
pattern happens to reach. The distinction is the reason this section exists:
PR #984 generated twenty-four of these tables from a read of
`governing`/`governing_text` alone, which named a name no file uses
(`src/deps-registry.json`'s "The enumeration and its non-member fallback") and
dropped two names two files do use. The narrowing was introduced **while
repairing a narrowing**, at round 2 of 2, with no round left to catch it. That
regression is named here rather than tidied away, because the act that caused
it was the act repairing the same class.

The served position the repair is bound to:

> "A derived view maintained by editing its previous rendering is not a view
> but a mirror, and a mirror accumulates — so bind the regeneration contract to
> the DERIVATION (start from the sources, never read the prior rendering, emit
> only what a source generates) rather than to the file's freshness, because
> freshness is satisfiable by edit-forward while derivation is not; and pair it
> with the inverse of the usual staleness check, since 'does every pending item
> appear?' cannot see surplus and only 'does every line name a source?' can."

`consulted: product-lab@aecb3b52ea46b357a7e7c39b81b1a26c0deeff0e LESSONS.md:191`

**So the direction that is a tree fact is checked, and the direction that is
not is declared.** `checks/check-names-tables.sh` asserts the inverse: every
row names something its own file names. The forward direction — every name the
file uses has a row — is **declined at birth** and stated in that check's
admission record: a reference is written in free prose (`[see: X "N"]`,
`(X, the name; kogaki#N)`, `X §"N"`), so a matcher over it produces candidates
a reader must judge rather than failures. It was discharged **by hand** for
kogaki#987 over every line of all twenty-five carriers, and a later table that
narrows again is caught by the inverse or by a reader, never by a generator
this repository does not have.

**Generating the tables was the declined arm**, recorded so it is not
re-proposed blind: a generator would have to parse the prose parenthetical
grammar, and a parser over prose becomes the next narrow input — the same
defect one level up.

## Three conventions the rule left open (kogaki#987)

### 1. The pointer block is ONE text, in every host

Every carrier's pointer block reads, with only the host's comment marker or
JSON quoting around it:

```
SPEC REFERENCES IN THIS FILE (kogaki#902; one carrier, kogaki#982).
The rule these entries are written under -- what a copy is, what the two
markers `[implemented-against: ...]` and `[see: ...]` mean, and why nothing
names a section number or a line range -- lives in ONE place:
`src/SPEC-REFERENCES.md`. It is not restated here; fifteen copies of it had
already drifted into eight variants, which is what kogaki#982 collapsed.
```

It shipped in two variants — the twelve `.mjs` carriers writing `--` and a
backticked path, the thirteen JSON and markdown carriers writing `-` and a
bare one. **Neither difference was forced by its host**: a JSON string holds
`--` and a backtick unchanged. The variance was drift, which is a smaller
instance of exactly what kogaki#982 collapsed, so it is collapsed rather than
declared: all twenty-five now carry the text above, and an amendment to the
pointer is one wording changed in twenty-five places rather than a
two-variant edit.

**Not checked, and that is deliberate.** A byte-identity assertion over the
block is the arm this file already declined for the standing paragraph, on the
ground that a check owes a removal signal declared at birth
(`consulted: product-lab@32852644ba503e9fa904280f386c61f3de32e667 LESSONS.md:119`)
which no current member carries for this. The wording is stated here, and a
third variant is caught by a reader — a trade this file already accepted for
the paragraph itself.

### 2. A spec label is written the way its file writes it, EXCEPT a bare `SPEC.md`

A row's second column names the spec the way the file's own reference names it
— `SPEC-terrain`, `SPEC-draft-pipeline`. **A bare `SPEC.md` is the exception
and is written as the repository-relative path**, because it denoted three
different files across the tables at once: `specs/SPEC.md` in
`gate-registry.json`, `specs/spec-terrain/SPEC.md` in `survey-schema.json` and
`specs/spec-proposal-contract/SPEC.md` in `record-schema.json`. Each was right
per file and unreadable across files, which is exactly the half a cross-file
reader needs.

### 2a. The NAME's form is the file's too, and that is a cost, not an oversight

The same convention as the label's, with the opposite trade, so it is written
down rather than discovered: a row's name is the wording **its file** uses, so
one spec name can appear in two forms across two carriers.
`src/specialization-schema.json` writes "The Step↔Move instantiation contract"
and `src/gate-registry.json` writes "the Step-Move instantiation contract",
because that is what each file says.

**Normalising the name across carriers was declined**, and the ground is the
one this whole issue turns on: a table is a record of what its file names, so a
row normalised away from its file's wording is a row derived from something
other than the file — the defect, in miniature. The label got the opposite
treatment because a bare `SPEC.md` was **ambiguous** across files rather than
merely varied; two spellings of one name are legible where two meanings of one
label are not.

**The cost, stated rather than left to be met:** a cross-file reader searching
either spelling finds one carrier and not the other.
`checks/check-names-tables.sh` cannot help — it reads each file against itself
by construction — so this is a reader's problem, priced here.

### 3. A disposition-1 copy owes the pointer too

A file that uses the marker vocabulary — `[implemented-against: …]` or
`[see: …]` — carries the pointer and its table, whether or not it also carries
a disposition-2 stable name. The markers are this carrier's; a file using them
without naming where they are defined is the drift this collapse was for.
`src/disclosure-fields.json` was such a site and now carries both.

### What a table does NOT carry

**A name whose home is a design record rather than a spec.**
`specs/spec-brief-draft-design/DESIGN.md`'s "Plain register, and the round
trip" is cited by `src/brief.mjs`, `src/draft.mjs` and `src/gate-registry.json`
and appears in no table, because these tables are the SPEC-references record.
`src/review-draft.mjs` carries one such row anyway, beside its spec rows, and
that is tolerated rather than tidied: the row is true, and a rule whose only
enforcement is a reader gains nothing from a purge.

**A file with no table is not a defect.** `src/render-figure.mjs` carries the
pointer block and no table because it states at the site that no owner-facing
string in it names a spec at all. The check reads its zero rows as a vacuous
pass and prints the zero.
