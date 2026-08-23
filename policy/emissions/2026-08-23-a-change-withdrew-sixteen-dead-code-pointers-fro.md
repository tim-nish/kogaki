<!-- tsurezure-client-kit:emission (staging candidate — the hub's gate is the sole promotion path) -->
date: 2026-08-23
repo: Kogaki
grain: lesson

## Trigger — what happened

A change withdrew sixteen dead code pointers from a spec by string substitution, and in the same change wrote the rule justifying the withdrawal: a citation whose target this tree cannot open is an inference wearing a citation's clothes. The reviewer then found three substituted sentences that no longer parse, one pointer left orphaned, and one verbatim quotation still attributed to the unopenable source — the rule's own violation, one sweep after it was authored.

## The learning

Authoring a rule and applying it are different acts, and doing both in one change makes the second feel discharged by the first. The rule is written semantically, with the whole sentence in view; the sweep that applies it is executed mechanically, over a pattern, and the pattern cannot see meaning — so the substitution lands everywhere the regex matches and is read back nowhere. The tell is a replacement string that is grammatically valid in isolation: 'the engine' parses fine, which is why 'the regexes at the engine and the engine stay untouched' survived a diff read by its own author. Two consequences. A mechanical edit over prose owes a read-back of every touched SENTENCE, not of the diff — the diff shows the token changed and hides that the clause collapsed. And a rule authored in the change that must obey it owes an explicit pass asking where the change itself violates the rule, because the author's confidence is highest exactly where their attention has already moved on.

---

Emitted under `specs/spec-client-kit/SPEC.md` §4. This is a **candidate**:
nothing here is promoted, and nothing here writes any recall surface. The
hub's own selection gate decides whether it becomes anything.
