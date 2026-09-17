<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-09-17
repo: Kogaki
grain: lesson

## Trigger — what happened

While building a gloss read from a cell name (kogaki#1141), a consult with two framings — two served cells, two axes — returned every answer correctly and then refused to emit its receipt with "framing 1's served line does not carry its own pin" (exit 12). The same consult with one framing composes a receipt normally.

## The learning

When a tool composes one record out of several calls, it has to know how each answer names where it came from. The consult transport builds a single citation line by stripping a shared commit identifier off the front of each answer's own citation line and joining what is left. That works while every answer cites a file inside one repository at one commit. The substrate has since moved to citing each unit by its own name and content fingerprint, which carries no commit in front of it — so the strip finds nothing, and the tool refuses to write a record it cannot stand behind. The refusal is correct and the gap it exposes is real: a question asked twice, of two different places, cannot be recorded at all on that path today, while the same question asked once records fine. Two things to take from it. A joining rule that assumes a shared prefix is a rule about one naming scheme, and it breaks silently the day the naming scheme changes — here it broke loudly only because a later step refused. And a capability can disappear without anything reporting it missing: nobody had asked two framings of this tool since the naming changed, so the loss surfaced as a surprise mid-task rather than as a failing check.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
