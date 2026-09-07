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
