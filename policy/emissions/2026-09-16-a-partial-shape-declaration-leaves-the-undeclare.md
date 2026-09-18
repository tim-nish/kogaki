<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-16
repo: Kogaki
grain: lesson

## Trigger — what happened

Two /brief runs over the same six Strands died at the identical state, one state short of done. kogaki#1126 had just created src/candidate-schema.json to declare the Candidate's option fields, and the executor renders it into the composing judge's prompt verbatim. But obligations, coverage and unused were left out of it and stayed in the one-sentence input_shape prose. The judge emitted obligations keyed raised_at/owed/settled_at; compose.mjs requires text/introduced_by/discharged_by and refuses at the final write, and assemble.mjs reads discharged_by, so the Candidate gate had already shown the owner '4 entries, 4 UNDISCHARGED' over a ledger whose entries all named their settling step.

## The learning

Introducing a declared schema alongside the prose it replaces splits one contract into two, and the fields left behind are not merely undeclared — they are now harder to see, because the file's existence reads as coverage. The declared half is enforced and the prose half is guessed, so the model's invented key names survive composition, survive the gate, and surface only at whatever downstream reader happens to require the real ones. Worse, a consumer reading an absent key gets a plausible value rather than an error: a missing discharged_by counts as undischarged, so the disclosure shown to the owner was confidently wrong before anything refused. When a shape declaration is added, either every field a validator enforces moves into it, or the fields that stay in prose are named in the declaration as deliberately outside it. A schema that covers some of a record's fields should be read as a claim about the whole record, because that is how every later reader will read it.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
