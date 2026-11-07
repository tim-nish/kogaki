<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-23
repo: Kogaki
grain: lesson

## Trigger — what happened

kogaki#1173: the Move-schema derivation over 21 Analyses of a geopolitics primer was refused by the API at input on claude-opus-5-5 and claude-fable-5-1, about five seconds in, even after every quotation of the source was removed; claude-sonnet-5 accepted the identical prompt and produced a valid proposal.

## The learning

When a one-shot model run over a private corpus fails, keep the raw reply and both output streams before any check runs, or the reason is lost: the first failure left nothing on disk, and the second was an empty stderr with the refusal only on stdout. An input refusal is specific to the model, not to the content. Stripping quoted source text did not change the verdict, but switching models did, so try a second pinned model once before redesigning the input.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
