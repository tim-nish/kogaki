<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-10-19
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1452: declaring, for every workflow row, what it holds each Move, Leg and ParagraphPlan field to, with a check that the row's own prompt names each declared field

## The learning

When each row of a prompt table had to say, field by field, what it does with the record fields it is shown, and a check required the row's own prompt text to name each field it claims to use, the check found real gaps on first run: a judge was handed a Move's segments and tests only as 'the segments role' and 'the tests role', so a table of who-reads-what would have called them unread; three judge rows read reader states and Move fields with no sentence saying those fields never reach the output; and two rows of one table carried one criterion in two wordings. A field a prompt is shown but never names is invisible to any inventory built from the prompt's own words, so the declaration has to be checked against the rendered prompt, not trusted on its own.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
